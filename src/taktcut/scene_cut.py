"""DaVinci Resolve / Premiere Pro Scene Cut Detection & Auto-Split Studio."""

from __future__ import annotations

import hashlib
import math
import re
import shutil
import subprocess
from collections.abc import Sequence
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from taktcut.models import (
    TimelineClip,
    TimelineDocument,
    TimelineMarker,
    TimelineTrack,
)
from taktcut.security import confine_workspace_path

SceneCutDetectionMethod = Literal["ffmpeg_scdet", "luma_histogram", "hybrid"]
ALLOWED_SCENE_CUT_METHODS: tuple[SceneCutDetectionMethod, ...] = (
    "ffmpeg_scdet",
    "luma_histogram",
    "hybrid",
)

SceneCutSplitMode = Literal["split_clips", "markers_only", "split_and_markers"]
ALLOWED_SCENE_CUT_SPLIT_MODES: tuple[SceneCutSplitMode, ...] = (
    "split_clips",
    "markers_only",
    "split_and_markers",
)

SCENE_CUT_THRESHOLD_MIN: float = 0.05
SCENE_CUT_THRESHOLD_MAX: float = 0.95
SCENE_CUT_THRESHOLD_DEFAULT: float = 0.35

SCENE_CUT_MIN_SHOT_FRAMES_MIN: int = 2
SCENE_CUT_MIN_SHOT_FRAMES_MAX: int = 240
SCENE_CUT_MIN_SHOT_FRAMES_DEFAULT: int = 6

SCENE_CUT_MAX_CUTS_LIMIT: int = 256
ALLOWED_SCENE_CUT_MARKER_COLORS: tuple[str, ...] = (
    "Cyan",
    "Gold",
    "Green",
    "Blue",
    "Red",
)

_SCD_TIME_RE = re.compile(r"pts_time:([0-9]+(?:\.[0-9]+)?)")
_SCD_SCORE_RE = re.compile(r"lavfi\.scd\.score=([0-9]+(?:\.[0-9]+)?)")
_SCD_MAFD_RE = re.compile(r"lavfi\.scd\.mafd=([0-9]+(?:\.[0-9]+)?)")


def _check_finite(raw: Any, field_name: str) -> float:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raise ValueError(f"{field_name} must be a finite number, got {raw!r}")
    val = float(raw)
    if not math.isfinite(val):
        raise ValueError(f"{field_name} must be finite, got {raw!r}")
    return val


def normalize_scene_cut_method(raw: Any) -> SceneCutDetectionMethod:
    """Validate and normalize a scene-cut detection algorithm identifier."""
    cleaned = str(raw or "hybrid").strip().lower()
    if cleaned == "ffmpeg_scdet":
        return "ffmpeg_scdet"
    if cleaned == "luma_histogram":
        return "luma_histogram"
    if cleaned == "hybrid":
        return "hybrid"
    allowed = ", ".join(ALLOWED_SCENE_CUT_METHODS)
    raise ValueError(f"Unsupported scene cut method {raw!r}; expected one of: {allowed}")


def normalize_scene_cut_split_mode(raw: Any) -> SceneCutSplitMode:
    """Validate and normalize a scene-cut auto-split mode."""
    cleaned = str(raw or "split_and_markers").strip().lower()
    if cleaned == "split_clips":
        return "split_clips"
    if cleaned == "markers_only":
        return "markers_only"
    if cleaned == "split_and_markers":
        return "split_and_markers"
    allowed = ", ".join(ALLOWED_SCENE_CUT_SPLIT_MODES)
    raise ValueError(f"Unsupported scene cut split_mode {raw!r}; expected one of: {allowed}")


def normalize_scene_cut_marker_color(raw: Any) -> str:
    """Normalize marker color tag to the allowed DaVinci Resolve marker palette."""
    cleaned = str(raw or "Cyan").strip().title()
    if cleaned in ALLOWED_SCENE_CUT_MARKER_COLORS:
        return cleaned
    return "Cyan"


def validate_scene_cut_threshold(raw: Any) -> float:
    """Validate normalized scene-cut sensitivity threshold in [0.05, 0.95]."""
    val = _check_finite(raw, "threshold")
    if val < SCENE_CUT_THRESHOLD_MIN or val > SCENE_CUT_THRESHOLD_MAX:
        raise ValueError(
            f"threshold must be between {SCENE_CUT_THRESHOLD_MIN} and "
            f"{SCENE_CUT_THRESHOLD_MAX}, got {val}"
        )
    return round(val, 4)


def validate_scene_cut_min_shot_frames(raw: Any) -> int:
    """Validate minimum shot length (frames) between adjacent cuts."""
    if isinstance(raw, bool) or not isinstance(raw, int):
        raise ValueError(f"min_shot_frames must be an integer, got {raw!r}")
    if raw < SCENE_CUT_MIN_SHOT_FRAMES_MIN or raw > SCENE_CUT_MIN_SHOT_FRAMES_MAX:
        raise ValueError(
            f"min_shot_frames must be between {SCENE_CUT_MIN_SHOT_FRAMES_MIN} and "
            f"{SCENE_CUT_MIN_SHOT_FRAMES_MAX}, got {raw}"
        )
    return raw


def format_smpte_frames(frame: int, fps_int: int) -> str:
    """Format an integer frame index into SMPTE HH:MM:SS:FF."""
    safe_fps = max(1, int(fps_int))
    total = max(0, int(frame))
    ff = total % safe_fps
    total_sec = total // safe_fps
    ss = total_sec % 60
    mm = (total_sec // 60) % 60
    hh = total_sec // 3600
    return f"{hh:02d}:{mm:02d}:{ss:02d}:{ff:02d}"


class SceneCutFrameSample(BaseModel):
    """Per-frame shot-boundary difference score for oscilloscope visualization."""

    frame_offset: int = Field(ge=0)
    score: float = Field(ge=0.0, le=1.0)
    luma_delta: float = Field(ge=0.0, le=1.0)
    is_cut: bool = False


class SceneCutCandidate(BaseModel):
    """A detected or manual shot boundary inside a timeline clip."""

    frame_offset: int = Field(ge=1)
    timeline_frame: int = Field(ge=0)
    source_frame: int = Field(ge=0)
    timecode: str
    score: float = Field(ge=0.0, le=1.0)
    luma_delta: float = Field(ge=0.0, le=1.0)
    histogram_delta: float = Field(ge=0.0, le=1.0)
    enabled: bool = True
    manual: bool = False
    shot_label: str = ""


class SceneCutAnalysisConfig(BaseModel):
    """Validated parameters for Scene Cut Detection."""

    threshold: float = SCENE_CUT_THRESHOLD_DEFAULT
    min_shot_frames: int = SCENE_CUT_MIN_SHOT_FRAMES_DEFAULT
    method: SceneCutDetectionMethod = "hybrid"
    max_cuts: int = Field(default=128, ge=1, le=SCENE_CUT_MAX_CUTS_LIMIT)

    @field_validator("threshold", mode="before")
    @classmethod
    def _val_threshold(cls, raw: Any) -> float:
        return validate_scene_cut_threshold(raw)

    @field_validator("min_shot_frames", mode="before")
    @classmethod
    def _val_min_shot(cls, raw: Any) -> int:
        return validate_scene_cut_min_shot_frames(raw)

    @field_validator("method", mode="before")
    @classmethod
    def _val_method(cls, raw: Any) -> SceneCutDetectionMethod:
        return normalize_scene_cut_method(raw)


class SceneCutAnalysisResult(BaseModel):
    """Complete shot-boundary analysis output for a target timeline clip."""

    clip_name: str
    track_index: int = Field(ge=1)
    clip_index: int = Field(ge=0)
    clip_start_frame: int = Field(ge=0)
    clip_duration_frames: int = Field(ge=0)
    fps_num: int = Field(ge=1)
    fps_den: int = Field(ge=1)
    method: SceneCutDetectionMethod
    source_mode: Literal["ffmpeg_scdet", "deterministic_synthetic"]
    threshold: float
    min_shot_frames: int
    filtergraph: str
    frame_scores: list[SceneCutFrameSample] = Field(default_factory=list)
    candidates: list[SceneCutCandidate] = Field(default_factory=list)
    active_cut_count: int = Field(ge=0)
    avg_shot_frames: float = Field(ge=0.0)


class SceneCutSplitResult(BaseModel):
    """Result of splitting a timeline clip and/or placing markers at detected cuts."""

    document: TimelineDocument
    track_index: int = Field(ge=1)
    clip_index: int = Field(ge=0)
    split_mode: SceneCutSplitMode
    created_clip_names: list[str] = Field(default_factory=list)
    created_marker_frames: list[int] = Field(default_factory=list)
    cut_count: int = Field(ge=0)
    linked_audio_split: bool = False
    summary: str


def compile_scene_cut_filtergraph(
    threshold: float = SCENE_CUT_THRESHOLD_DEFAULT,
    *,
    sc_pass: bool = False,
    include_metadata_print: bool = True,
) -> str:
    """Compile an FFmpeg `scdet` scene-change detection filtergraph string."""
    norm_t = validate_scene_cut_threshold(threshold)
    scdet_thresh = round(2.0 + norm_t * 48.0, 2)
    pass_flag = 1 if sc_pass else 0
    base = f"scdet=threshold={scdet_thresh:.2f}:sc_pass={pass_flag}"
    if include_metadata_print:
        return f"{base},metadata=mode=print:key=lavfi.scd.score"
    return base


def parse_ffmpeg_scdet_output(
    output_text: str,
    fps: float,
    *,
    max_frames: int | None = None,
) -> list[tuple[int, float]]:
    """Parse FFmpeg `scdet` + `metadata=print` output into `(frame_offset, score)` pairs."""
    safe_fps = max(1.0, float(fps))
    results: list[tuple[int, float]] = []
    pending_frame: int | None = None
    pending_mafd: float | None = None

    def _flush_pending(frame: int | None, score: float | None) -> None:
        if frame is None or score is None:
            return
        if max_frames is None or (0 < frame < max_frames):
            results.append((frame, round(score, 4)))

    for line in output_text.splitlines():
        time_match = _SCD_TIME_RE.search(line)
        if time_match:
            _flush_pending(pending_frame, pending_mafd)
            pts_s = float(time_match.group(1))
            pending_frame = max(0, int(round(pts_s * safe_fps)))
            pending_mafd = None
            continue
        score_match = _SCD_SCORE_RE.search(line)
        if score_match and pending_frame is not None:
            raw_score = float(score_match.group(1))
            norm_score = max(0.0, min(1.0, raw_score / 100.0))
            _flush_pending(pending_frame, norm_score)
            pending_frame = None
            pending_mafd = None
            continue
        mafd_match = _SCD_MAFD_RE.search(line)
        if mafd_match and pending_frame is not None:
            raw_mafd = float(mafd_match.group(1))
            pending_mafd = max(0.0, min(1.0, raw_mafd / 64.0))

    _flush_pending(pending_frame, pending_mafd)
    return results


def _build_deterministic_clip_luma_series(clip: TimelineClip) -> list[float]:
    """Generate a deterministic, shot-structured frame luma profile for a clip."""
    dur = max(0, int(clip.duration_frames))
    if dur == 0:
        return []

    seed_material = f"{clip.name}|{clip.source_path}|{clip.media_ref}|{dur}".encode()
    digest = hashlib.sha256(seed_material).digest()

    # Determine realistic shot count (2 to 6 shots depending on duration)
    if dur < 16:
        shot_count = 1
    elif dur < 45:
        shot_count = 2 + (digest[0] % 2)
    elif dur < 120:
        shot_count = 3 + (digest[0] % 3)
    else:
        shot_count = 4 + (digest[0] % 3)

    if shot_count <= 1:
        base_luma = 0.25 + (digest[1] / 255.0) * 0.5
        return [
            round(max(0.02, min(0.98, base_luma + 0.015 * math.sin(i * 0.35))), 4)
            for i in range(dur)
        ]

    # Build evenly spaced shot boundaries with deterministic jitter
    min_seg = max(4, dur // (shot_count * 2))
    boundaries: list[int] = [0]
    for s_idx in range(1, shot_count):
        nominal = round((s_idx * dur) / shot_count)
        jitter = ((digest[(s_idx + 2) % len(digest)] % 9) - 4)
        cand = max(boundaries[-1] + min_seg, min(dur - min_seg, nominal + jitter))
        if cand > boundaries[-1] and cand < dur - 2:
            boundaries.append(cand)
    boundaries.append(dur)

    # Assign distinct alternating luma plateaus so every cut has strong visual contrast
    plateaus: list[float] = []
    for s_idx in range(len(boundaries) - 1):
        raw_val = 0.14 + (digest[(s_idx * 3 + 5) % len(digest)] / 255.0) * 0.72
        if s_idx > 0 and abs(raw_val - plateaus[-1]) < 0.34:
            raw_val = 0.85 - plateaus[-1] * 0.7
        plateaus.append(max(0.08, min(0.92, raw_val)))

    series: list[float] = []
    for s_idx in range(len(boundaries) - 1):
        start_f = boundaries[s_idx]
        end_f = boundaries[s_idx + 1]
        base_l = plateaus[s_idx]
        phase = (digest[(s_idx + 11) % len(digest)] / 255.0) * math.tau
        for f in range(start_f, end_f):
            motion = 0.018 * math.sin(f * 0.42 + phase)
            series.append(round(max(0.02, min(0.98, base_l + motion)), 4))
    return series


def detect_scene_cuts_from_luma_series(
    luma_frames: Sequence[float],
    *,
    threshold: float = SCENE_CUT_THRESHOLD_DEFAULT,
    min_shot_frames: int = SCENE_CUT_MIN_SHOT_FRAMES_DEFAULT,
    method: SceneCutDetectionMethod = "hybrid",
    max_cuts: int = 128,
) -> tuple[list[SceneCutFrameSample], list[tuple[int, float, float, float]]]:
    """Detect shot boundaries from a sequence of normalized frame luma values [0..1]."""
    norm_t = validate_scene_cut_threshold(threshold)
    min_gap = validate_scene_cut_min_shot_frames(min_shot_frames)
    norm_method = normalize_scene_cut_method(method)

    n = len(luma_frames)
    if n == 0:
        return [], []
    if n == 1:
        return [SceneCutFrameSample(frame_offset=0, score=0.0, luma_delta=0.0, is_cut=False)], []

    raw_metrics: list[tuple[float, float, float]] = [(0.0, 0.0, 0.0)]
    for i in range(1, n):
        prev_l = max(0.0, min(1.0, float(luma_frames[i - 1])))
        curr_l = max(0.0, min(1.0, float(luma_frames[i])))
        luma_delta = abs(curr_l - prev_l)

        # Compare short local window before vs after frame i for histogram-like shift
        w_pre_start = max(0, i - 3)
        w_post_end = min(n, i + 3)
        pre_cnt = max(1, i - w_pre_start)
        post_cnt = max(1, w_post_end - i)
        pre_mean = sum(float(luma_frames[k]) for k in range(w_pre_start, i)) / pre_cnt
        post_mean = sum(float(luma_frames[k]) for k in range(i, w_post_end)) / post_cnt
        hist_delta = min(1.0, abs(post_mean - pre_mean) * 1.15 + luma_delta * 0.35)

        if norm_method == "ffmpeg_scdet":
            score = min(1.0, luma_delta * 1.35)
        elif norm_method == "luma_histogram":
            score = min(1.0, hist_delta * 1.25)
        else:
            score = min(1.0, luma_delta * 0.85 + hist_delta * 0.55)

        raw_metrics.append((round(score, 4), round(luma_delta, 4), round(hist_delta, 4)))

    # Non-maximum suppression across min_shot_frames window
    candidate_indices = [
        i
        for i in range(1, n - 1)
        if raw_metrics[i][0] >= norm_t
    ]
    # Sort descending by score so strongest boundary wins inside each min_gap neighborhood
    candidate_indices.sort(key=lambda idx: (-raw_metrics[idx][0], idx))

    accepted_indices: list[int] = []
    for idx in candidate_indices:
        if any(abs(idx - kept) < min_gap for kept in accepted_indices):
            continue
        accepted_indices.append(idx)
        if len(accepted_indices) >= max_cuts:
            break

    accepted_indices.sort()
    accepted_set = set(accepted_indices)

    frame_samples = [
        SceneCutFrameSample(
            frame_offset=i,
            score=raw_metrics[i][0],
            luma_delta=raw_metrics[i][1],
            is_cut=(i in accepted_set),
        )
        for i in range(n)
    ]
    cuts = [
        (idx, raw_metrics[idx][0], raw_metrics[idx][1], raw_metrics[idx][2])
        for idx in accepted_indices
    ]
    return frame_samples, cuts


def _find_video_track_and_clip(
    doc: TimelineDocument,
    track_index: int,
    clip_index: int,
) -> tuple[TimelineTrack, TimelineClip]:
    """Locate a video track and clip by 1-based track index and 0-based clip index."""
    for track in doc.tracks:
        if track.kind == "video" and track.index == track_index:
            if clip_index < 0 or clip_index >= len(track.clips):
                raise ValueError(
                    f"Clip index {clip_index} out of range on V{track_index} "
                    f"(0..{max(0, len(track.clips) - 1)})"
                )
            return track, track.clips[clip_index]
    raise ValueError(f"Video track V{track_index} not found in timeline '{doc.name}'")


def _probe_ffmpeg_scdet_scores(
    media_path: Path,
    *,
    fps: float,
    duration_frames: int,
    threshold: float,
    ffmpeg_bin: str = "ffmpeg",
) -> list[tuple[int, float]] | None:
    """Run FFmpeg `scdet` on an existing local media file; returns None if unavailable."""
    resolved_bin = shutil.which(ffmpeg_bin)
    if resolved_bin is None or not media_path.is_file():
        return None
    fg = compile_scene_cut_filtergraph(threshold, sc_pass=False, include_metadata_print=True)
    dur_s = max(0.1, duration_frames / max(1.0, fps))
    argv = [
        resolved_bin,
        "-hide_banner",
        "-nostats",
        "-v",
        "info",
        "-t",
        f"{dur_s:.3f}",
        "-i",
        str(media_path),
        "-vf",
        fg,
        "-an",
        "-f",
        "null",
        "-",
    ]
    try:
        proc = subprocess.run(
            argv,
            capture_output=True,
            text=True,
            timeout=12,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    combined = (proc.stdout or "") + "\n" + (proc.stderr or "")
    parsed = parse_ffmpeg_scdet_output(combined, fps=fps, max_frames=duration_frames)
    return parsed if parsed else None


def analyze_clip_scene_cuts(
    doc: TimelineDocument,
    *,
    track_index: int = 1,
    clip_index: int = 0,
    threshold: float = SCENE_CUT_THRESHOLD_DEFAULT,
    min_shot_frames: int = SCENE_CUT_MIN_SHOT_FRAMES_DEFAULT,
    method: SceneCutDetectionMethod = "hybrid",
    max_cuts: int = 128,
    luma_frames: Sequence[float] | None = None,
    workspace_root: Path | None = None,
    execute_ffmpeg: bool = False,
) -> SceneCutAnalysisResult:
    """Analyze a timeline clip for scene-cut shot boundaries."""
    cfg = SceneCutAnalysisConfig(
        threshold=threshold,
        min_shot_frames=min_shot_frames,
        method=method,
        max_cuts=max_cuts,
    )
    _, clip = _find_video_track_and_clip(doc, track_index, clip_index)
    fps_float = doc.fps.as_float
    fps_int = max(1, int(round(fps_float)))
    dur = max(0, int(clip.duration_frames))
    filtergraph = compile_scene_cut_filtergraph(
        cfg.threshold, sc_pass=False, include_metadata_print=True
    )

    source_mode: Literal["ffmpeg_scdet", "deterministic_synthetic"] = "deterministic_synthetic"
    ffmpeg_cuts: list[tuple[int, float]] | None = None

    if execute_ffmpeg and workspace_root is not None and clip.source_path and dur > 2:
        try:
            confined = confine_workspace_path(workspace_root, clip.source_path)
            if confined.is_file():
                ffmpeg_cuts = _probe_ffmpeg_scdet_scores(
                    confined,
                    fps=fps_float,
                    duration_frames=dur,
                    threshold=cfg.threshold,
                )
        except ValueError:
            ffmpeg_cuts = None

    if ffmpeg_cuts:
        source_mode = "ffmpeg_scdet"
        score_map = dict(ffmpeg_cuts)
        frame_scores: list[SceneCutFrameSample] = []
        raw_cuts: list[tuple[int, float, float, float]] = []
        accepted: list[int] = []
        for idx, sc in sorted(ffmpeg_cuts, key=lambda item: (-item[1], item[0])):
            if sc >= cfg.threshold and not any(
                abs(idx - k) < cfg.min_shot_frames for k in accepted
            ):
                accepted.append(idx)
                if len(accepted) >= cfg.max_cuts:
                    break
        accepted.sort()
        accepted_set = set(accepted)
        for f in range(dur):
            sc = score_map.get(f, 0.0)
            frame_scores.append(
                SceneCutFrameSample(
                    frame_offset=f,
                    score=sc,
                    luma_delta=sc,
                    is_cut=(f in accepted_set),
                )
            )
        for idx in accepted:
            sc = score_map.get(idx, cfg.threshold)
            raw_cuts.append((idx, sc, sc, sc))
    else:
        series = (
            [float(x) for x in luma_frames]
            if luma_frames is not None
            else _build_deterministic_clip_luma_series(clip)
        )
        frame_scores, raw_cuts = detect_scene_cuts_from_luma_series(
            series,
            threshold=cfg.threshold,
            min_shot_frames=cfg.min_shot_frames,
            method=cfg.method,
            max_cuts=cfg.max_cuts,
        )

    candidates: list[SceneCutCandidate] = []
    for i, (offset, sc, ld, hd) in enumerate(raw_cuts, start=1):
        tl_frame = clip.start_frame + offset
        src_frame = (
            clip.source_in_frame + max(0, dur - offset)
            if clip.reverse
            else clip.source_in_frame + offset
        )
        candidates.append(
            SceneCutCandidate(
                frame_offset=offset,
                timeline_frame=tl_frame,
                source_frame=src_frame,
                timecode=format_smpte_frames(tl_frame, fps_int),
                score=sc,
                luma_delta=ld,
                histogram_delta=hd,
                enabled=True,
                manual=False,
                shot_label=f"Shot {i:02d}",
            )
        )

    shot_count = len(candidates) + 1
    avg_shot = round(dur / max(1, shot_count), 2) if dur > 0 else 0.0

    return SceneCutAnalysisResult(
        clip_name=clip.name,
        track_index=track_index,
        clip_index=clip_index,
        clip_start_frame=clip.start_frame,
        clip_duration_frames=dur,
        fps_num=doc.fps.num,
        fps_den=doc.fps.den,
        method=cfg.method,
        source_mode=source_mode,
        threshold=cfg.threshold,
        min_shot_frames=cfg.min_shot_frames,
        filtergraph=filtergraph,
        frame_scores=frame_scores,
        candidates=candidates,
        active_cut_count=len(candidates),
        avg_shot_frames=avg_shot,
    )


def _split_single_clip_segments(
    clip: TimelineClip,
    sorted_offsets: list[int],
    *,
    shot_prefix: str = "",
    new_link_groups: list[str] | None = None,
) -> list[TimelineClip]:
    """Split a TimelineClip into contiguous sub-clips at local frame offsets."""
    boundaries = [0, *sorted_offsets, clip.duration_frames]
    base_name = (shot_prefix or clip.name).strip() or "Shot"
    segments: list[TimelineClip] = []
    total_segs = len(boundaries) - 1

    for idx in range(total_segs):
        seg_start = boundaries[idx]
        seg_end = boundaries[idx + 1]
        seg_dur = seg_end - seg_start
        if seg_dur <= 0:
            continue

        if clip.reverse:
            src_in = clip.source_in_frame + max(0, clip.duration_frames - seg_end)
        else:
            src_in = clip.source_in_frame + seg_start

        seg_data = clip.model_dump()
        seg_data["name"] = f"{base_name}_S{idx + 1:02d}"
        seg_data["start_frame"] = clip.start_frame + seg_start
        seg_data["duration_frames"] = seg_dur
        seg_data["source_in_frame"] = src_in
        if idx > 0:
            seg_data["fade_in_s"] = 0.0
        if idx < total_segs - 1:
            seg_data["fade_out_s"] = 0.0
            seg_data["transition_out"] = None
        if new_link_groups is not None and idx < len(new_link_groups):
            seg_data["link_group_id"] = new_link_groups[idx]

        segments.append(TimelineClip.model_validate(seg_data))
    return segments


def split_clip_at_scene_cuts(
    doc: TimelineDocument,
    *,
    track_index: int = 1,
    clip_index: int = 0,
    cut_offsets: Sequence[int],
    split_mode: SceneCutSplitMode = "split_and_markers",
    split_linked_audio: bool = True,
    marker_color: str = "Cyan",
    shot_prefix: str = "",
) -> SceneCutSplitResult:
    """Split a timeline clip and/or drop scene-cut markers at validated frame offsets."""
    mode = normalize_scene_cut_split_mode(split_mode)
    color = normalize_scene_cut_marker_color(marker_color)
    next_doc = doc.model_copy(deep=True)
    track, clip = _find_video_track_and_clip(next_doc, track_index, clip_index)

    if clip.duration_frames < 2:
        raise ValueError(f"Clip '{clip.name}' is too short to split ({clip.duration_frames}f)")

    cleaned_offsets = sorted(
        {
            int(off)
            for off in cut_offsets
            if not isinstance(off, bool) and 0 < int(off) < clip.duration_frames
        }
    )
    if not cleaned_offsets:
        raise ValueError("No valid cut offsets within clip duration bounds")
    if len(cleaned_offsets) > SCENE_CUT_MAX_CUTS_LIMIT:
        raise ValueError(
            f"Too many cut offsets ({len(cleaned_offsets)} > {SCENE_CUT_MAX_CUTS_LIMIT})"
        )

    fps_int = max(1, int(round(next_doc.fps.as_float)))
    created_names: list[str] = []
    created_marker_frames: list[int] = []
    linked_audio_split = False

    if mode in ("markers_only", "split_and_markers"):
        existing_frames = {m.frame for m in next_doc.markers}
        for i, off in enumerate(cleaned_offsets, start=1):
            abs_frame = clip.start_frame + off
            if abs_frame not in existing_frames:
                tc = format_smpte_frames(abs_frame, fps_int)
                next_doc.markers.append(
                    TimelineMarker(
                        name=f"Cut {i:02d} ({clip.name})",
                        frame=abs_frame,
                        duration_frames=1,
                        color=color,
                        note=f"Scene Cut @ {tc}",
                    )
                )
                existing_frames.add(abs_frame)
                created_marker_frames.append(abs_frame)
        next_doc.markers.sort(key=lambda m: m.frame)

    if mode in ("split_clips", "split_and_markers"):
        orig_link = clip.link_group_id
        seg_count = len(cleaned_offsets) + 1
        new_link_groups: list[str] | None = None
        if orig_link and split_linked_audio:
            new_link_groups = [f"{orig_link}_sc{i + 1:02d}"[:64] for i in range(seg_count)]

        video_segments = _split_single_clip_segments(
            clip,
            cleaned_offsets,
            shot_prefix=shot_prefix,
            new_link_groups=new_link_groups,
        )
        created_names = [seg.name for seg in video_segments]
        track.clips = [
            *track.clips[:clip_index],
            *video_segments,
            *track.clips[clip_index + 1 :],
        ]

        if orig_link and split_linked_audio:
            for a_track in next_doc.tracks:
                if a_track.kind != "audio":
                    continue
                for a_idx, a_clip in enumerate(a_track.clips):
                    if (
                        a_clip.link_group_id == orig_link
                        and a_clip.start_frame == clip.start_frame
                        and a_clip.duration_frames == clip.duration_frames
                    ):
                        audio_segments = _split_single_clip_segments(
                            a_clip,
                            cleaned_offsets,
                            shot_prefix="",
                            new_link_groups=new_link_groups,
                        )
                        a_track.clips = [
                            *a_track.clips[:a_idx],
                            *audio_segments,
                            *a_track.clips[a_idx + 1 :],
                        ]
                        linked_audio_split = True
                        break
                if linked_audio_split:
                    break

    if mode == "markers_only":
        summary = f"Added {len(created_marker_frames)} scene-cut marker(s) on '{clip.name}'."
    elif linked_audio_split:
        summary = (
            f"Split '{clip.name}' + linked audio into {len(created_names)} shot(s) "
            f"({len(cleaned_offsets)} cut(s))."
        )
    else:
        summary = (
            f"Split '{clip.name}' into {len(created_names)} shot(s) "
            f"({len(cleaned_offsets)} cut(s))."
        )

    return SceneCutSplitResult(
        document=next_doc,
        track_index=track_index,
        clip_index=clip_index,
        split_mode=mode,
        created_clip_names=created_names,
        created_marker_frames=created_marker_frames,
        cut_count=len(cleaned_offsets),
        linked_audio_split=linked_audio_split,
        summary=summary,
    )
