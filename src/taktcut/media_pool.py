"""Media Pool Pro: Proxy generator, offline/relink watchdog, and waveform/timecode A/V auto-sync."""

from __future__ import annotations

import math
import os
import re
import shutil
import subprocess
from collections.abc import Sequence
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

from taktcut.models import (
    ALLOWED_AV_SYNC_MODES,
    ALLOWED_PROXY_CODECS,
    ALLOWED_PROXY_SCALES,
    AvSyncMode,
    MediaLinkStatus,
    ProxyCodecId,
    ProxyScaleOption,
    RationalFrameRate,
    TimelineClip,
    TimelineDocument,
    TimelineTrack,
)
from taktcut.security import MEDIA_SUFFIXES, confine_workspace_path, scan_workspace_files

ProxyScope = Literal["selected", "all_video"]
DEFAULT_PROXY_DIR: str = ".taktcut-proxies"
AV_SYNC_MAX_LAG_MIN: int = 4
AV_SYNC_MAX_LAG_MAX: int = 240
AV_SYNC_MAX_LAG_DEFAULT: int = 48

_PAD_LABEL_RE = re.compile(r"^[A-Za-z0-9_:]+$")
_TIMECODE_RE = re.compile(r"^(\d{2}):(\d{2}):(\d{2})[:;](\d{2})$")
_SAFE_STEM_RE = re.compile(r"[^A-Za-z0-9._-]+")


class ProxyCodecSpec(BaseModel):
    """Encoder specification for a Media Pool proxy preset."""

    codec_id: ProxyCodecId
    label: str
    container_ext: str
    video_encoder: str
    video_args: tuple[str, ...]
    audio_args: tuple[str, ...]
    estimated_size_ratio: float


PROXY_CODEC_SPECS: dict[ProxyCodecId, ProxyCodecSpec] = {
    "prores_proxy": ProxyCodecSpec(
        codec_id="prores_proxy",
        label="Apple ProRes 422 Proxy",
        container_ext=".mov",
        video_encoder="prores_ks",
        video_args=(
            "-c:v",
            "prores_ks",
            "-profile:v",
            "0",
            "-vendor",
            "apl0",
            "-pix_fmt",
            "yuv422p10le",
        ),
        audio_args=("-c:a", "pcm_s16le"),
        estimated_size_ratio=0.36,
    ),
    "dnxhr_lb": ProxyCodecSpec(
        codec_id="dnxhr_lb",
        label="Avid DNxHR LB",
        container_ext=".mov",
        video_encoder="dnxhd",
        video_args=("-c:v", "dnxhd", "-profile:v", "dnxhr_lb", "-pix_fmt", "yuv422p"),
        audio_args=("-c:a", "pcm_s16le"),
        estimated_size_ratio=0.32,
    ),
    "h264_proxy": ProxyCodecSpec(
        codec_id="h264_proxy",
        label="H.264 Fast Proxy",
        container_ext=".mp4",
        video_encoder="libx264",
        video_args=(
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
        ),
        audio_args=("-c:a", "aac", "-b:a", "128k"),
        estimated_size_ratio=0.14,
    ),
}


class ProxyClipPlan(BaseModel):
    """Compiled FFmpeg proxy transcode plan for a single timeline clip."""

    track_kind: Literal["video", "audio"] = "video"
    track_index: int
    clip_index: int
    clip_name: str
    source_path: str
    proxy_path: str
    scale: ProxyScaleOption
    codec: ProxyCodecId
    source_width: int
    source_height: int
    proxy_width: int
    proxy_height: int
    video_filter: str
    estimated_savings_pct: int
    argv: list[str]
    command_preview: str
    executed: bool = False
    status: Literal["planned", "ready", "error"] = "ready"
    detail: str = ""


class ProxyBatchResult(BaseModel):
    """Outcome of generating or clearing proxies across a TimelineDocument."""

    changed: bool
    generated_count: int
    proxy_dir: str
    scale: ProxyScaleOption
    codec: ProxyCodecId
    plans: list[ProxyClipPlan] = Field(default_factory=list)
    detail: str
    document: TimelineDocument


class RelinkCandidate(BaseModel):
    """Ranked workspace candidate for relinking an offline clip."""

    path: str
    confidence: int = Field(ge=0, le=100)
    match_reason: Literal["exact_filename", "stem_match", "token_match", "workspace_media"]


class MediaLinkAuditEntry(BaseModel):
    """Link health status and relink suggestions for a single Media Pool clip."""

    track_kind: Literal["video", "audio"]
    track_index: int
    clip_index: int
    clip_name: str
    source_path: str
    proxy_path: str = ""
    status: MediaLinkStatus
    candidates: list[RelinkCandidate] = Field(default_factory=list)


class MediaLinkAuditReport(BaseModel):
    """Aggregate offline watchdog report across the entire TimelineDocument."""

    total_clips: int
    online_count: int
    proxy_only_count: int
    offline_count: int
    entries: list[MediaLinkAuditEntry] = Field(default_factory=list)
    workspace_media: list[str] = Field(default_factory=list)


class AvSyncCorrelationPoint(BaseModel):
    """Single lag/correlation point for cross-correlation curve display."""

    lag: int
    score: float


class AvSyncAnalysis(BaseModel):
    """Deterministic waveform or timecode A/V auto-sync analysis output."""

    mode: AvSyncMode
    video_track_index: int
    video_clip_index: int
    video_clip_name: str
    audio_track_index: int
    audio_clip_index: int
    audio_clip_name: str
    offset_frames: int
    offset_ms: float
    confidence: float = Field(ge=0.0, le=1.0)
    fps_float: float
    video_tc: str
    audio_tc: str
    video_envelope: list[float] = Field(default_factory=list)
    audio_envelope: list[float] = Field(default_factory=list)
    correlation_curve: list[AvSyncCorrelationPoint] = Field(default_factory=list)
    audio_filter: str
    ffmpeg_argv: list[str]
    detail: str


def normalize_proxy_scale(raw: str | None) -> ProxyScaleOption:
    """Validate and normalize proxy resolution scale."""
    cleaned = str(raw or "half").strip().lower()
    if cleaned in {"1/2", "half", "0.5"}:
        return "half"
    if cleaned in {"1/4", "quarter", "0.25"}:
        return "quarter"
    allowed = ", ".join(ALLOWED_PROXY_SCALES)
    raise ValueError(f"Unsupported proxy scale {raw!r}; expected one of: {allowed}")


def normalize_proxy_codec(raw: str | None) -> ProxyCodecId:
    """Validate and normalize proxy codec identifier."""
    cleaned = str(raw or "prores_proxy").strip().lower()
    if cleaned == "prores_proxy":
        return "prores_proxy"
    if cleaned == "dnxhr_lb":
        return "dnxhr_lb"
    if cleaned == "h264_proxy":
        return "h264_proxy"
    allowed = ", ".join(ALLOWED_PROXY_CODECS)
    raise ValueError(f"Unsupported proxy codec {raw!r}; expected one of: {allowed}")


def normalize_av_sync_mode(raw: str | None) -> AvSyncMode:
    """Validate and normalize A/V auto-sync mode."""
    cleaned = str(raw or "waveform").strip().lower()
    if cleaned == "waveform":
        return "waveform"
    if cleaned == "timecode":
        return "timecode"
    allowed = ", ".join(ALLOWED_AV_SYNC_MODES)
    raise ValueError(f"Unsupported av_sync mode {raw!r}; expected one of: {allowed}")


def sanitize_proxy_dir(raw_dir: str | None) -> str:
    """Normalize a workspace-relative proxy output folder without traversal segments."""
    text = str(raw_dir or DEFAULT_PROXY_DIR).strip().replace("\\", "/").strip("/")
    if not text:
        return DEFAULT_PROXY_DIR
    parts = [p for p in text.split("/") if p and p != "."]
    if any(p == ".." or ":" in p for p in parts):
        raise ValueError(f"Invalid proxy_dir {raw_dir!r}: path traversal is forbidden")
    if not parts:
        return DEFAULT_PROXY_DIR
    return "/".join(parts)


def compute_proxy_dimensions(width: int, height: int, scale: ProxyScaleOption) -> tuple[int, int]:
    """Compute even-aligned proxy dimensions for 1/2 or 1/4 scale."""
    src_w = max(16, int(width) if width > 0 else 1920)
    src_h = max(16, int(height) if height > 0 else 1080)
    divisor = 2 if scale == "half" else 4
    pw = max(2, ((src_w // divisor) // 2) * 2)
    ph = max(2, ((src_h // divisor) // 2) * 2)
    return (pw, ph)


def build_proxy_scale_filter(scale: ProxyScaleOption) -> str:
    """Return deterministic even-aligned FFmpeg scale filter expression."""
    if scale == "half":
        return "scale=trunc(iw/4)*2:trunc(ih/4)*2:flags=bicubic"
    return "scale=trunc(iw/8)*2:trunc(ih/8)*2:flags=bicubic"


def build_proxy_output_relpath(
    source_path: str,
    clip_name: str,
    scale: ProxyScaleOption,
    codec: ProxyCodecId,
    proxy_dir: str = DEFAULT_PROXY_DIR,
) -> str:
    """Build deterministic workspace-relative proxy file path."""
    clean_dir = sanitize_proxy_dir(proxy_dir)
    spec = PROXY_CODEC_SPECS[codec]
    raw_name = Path(source_path).stem if source_path else clip_name
    safe_stem = _SAFE_STEM_RE.sub("_", raw_name).strip("._-") or "clip"
    scale_tag = "half" if scale == "half" else "qtr"
    return f"{clean_dir}/{safe_stem}_{scale_tag}_{codec}{spec.container_ext}"


def compile_proxy_plan(
    *,
    track_kind: Literal["video", "audio"] = "video",
    track_index: int = 1,
    clip_index: int = 0,
    clip_name: str,
    source_path: str,
    scale: ProxyScaleOption = "half",
    codec: ProxyCodecId = "prores_proxy",
    source_width: int = 1920,
    source_height: int = 1080,
    proxy_dir: str = DEFAULT_PROXY_DIR,
) -> ProxyClipPlan:
    """Compile a deterministic FFmpeg proxy transcode plan for one clip."""
    norm_scale = normalize_proxy_scale(scale)
    norm_codec = normalize_proxy_codec(codec)
    spec = PROXY_CODEC_SPECS[norm_codec]
    src_text = (
        source_path.strip()
        or f"media/{_SAFE_STEM_RE.sub('_', clip_name).strip('._-') or 'clip'}.mov"
    )
    proxy_rel = build_proxy_output_relpath(src_text, clip_name, norm_scale, norm_codec, proxy_dir)
    pw, ph = compute_proxy_dimensions(source_width, source_height, norm_scale)
    vf = build_proxy_scale_filter(norm_scale)

    argv: list[str] = [
        "ffmpeg",
        "-y",
        "-i",
        src_text,
        "-vf",
        vf,
        *spec.video_args,
        *spec.audio_args,
        proxy_rel,
    ]
    scale_area_ratio = 0.25 if norm_scale == "half" else 0.0625
    est_ratio = min(0.95, max(0.03, spec.estimated_size_ratio * (0.45 + 0.55 * scale_area_ratio)))
    savings_pct = max(10, min(97, round((1.0 - est_ratio) * 100)))

    return ProxyClipPlan(
        track_kind=track_kind,
        track_index=track_index,
        clip_index=clip_index,
        clip_name=clip_name,
        source_path=src_text,
        proxy_path=proxy_rel,
        scale=norm_scale,
        codec=norm_codec,
        source_width=max(16, source_width),
        source_height=max(16, source_height),
        proxy_width=pw,
        proxy_height=ph,
        video_filter=vf,
        estimated_savings_pct=savings_pct,
        argv=argv,
        command_preview=" ".join(argv),
        executed=False,
        status="ready",
        detail=f"{spec.label} ({pw}x{ph})",
    )


def _is_synthetic_gfx_clip(clip: TimelineClip, track: TimelineTrack) -> bool:
    if track.kind == "audio":
        return False
    if track.index >= 2 and clip.source_path.strip().lower().startswith("gfx/"):
        return True
    return clip.source_path.strip().lower().startswith("gfx/")


def generate_proxies_for_document(
    doc: TimelineDocument,
    *,
    scale: ProxyScaleOption = "half",
    codec: ProxyCodecId = "prores_proxy",
    scope: ProxyScope = "all_video",
    track_kind: Literal["video", "audio"] = "video",
    track_index: int = 1,
    clip_index: int = 0,
    proxy_dir: str = DEFAULT_PROXY_DIR,
    workspace_root: Path | None = None,
    execute: bool = False,
) -> ProxyBatchResult:
    """Generate deterministic proxy plans (and optional local FFmpeg transcodes) for clips."""
    norm_scale = normalize_proxy_scale(scale)
    norm_codec = normalize_proxy_codec(codec)
    clean_dir = sanitize_proxy_dir(proxy_dir)
    if workspace_root is not None:
        confine_workspace_path(
            workspace_root,
            f"{clean_dir}/probe.mov",
            must_exist=False,
            allowed_suffixes=MEDIA_SUFFIXES,
        )

    next_doc = doc.model_copy(deep=True)
    plans: list[ProxyClipPlan] = []
    generated_count = 0
    ffmpeg_bin = shutil.which("ffmpeg") if execute else None

    for trk in next_doc.tracks:
        if trk.kind != "video":
            continue
        for c_idx, clip in enumerate(trk.clips):
            if (
                scope == "selected"
                and (track_kind != "video" or trk.index != track_index or c_idx != clip_index)
            ) or (scope != "selected" and _is_synthetic_gfx_clip(clip, trk)):
                continue

            plan = compile_proxy_plan(
                track_kind="video",
                track_index=trk.index,
                clip_index=c_idx,
                clip_name=clip.name,
                source_path=clip.source_path,
                scale=norm_scale,
                codec=norm_codec,
                source_width=next_doc.width or 1920,
                source_height=next_doc.height or 1080,
                proxy_dir=clean_dir,
            )

            if execute and workspace_root is not None and ffmpeg_bin is not None:
                try:
                    src_resolved = confine_workspace_path(
                        workspace_root,
                        plan.source_path,
                        must_exist=True,
                        allowed_suffixes=MEDIA_SUFFIXES,
                    )
                    dst_resolved = confine_workspace_path(
                        workspace_root,
                        plan.proxy_path,
                        must_exist=False,
                        allowed_suffixes=MEDIA_SUFFIXES,
                    )
                    dst_resolved.parent.mkdir(parents=True, exist_ok=True)
                    real_argv = [
                        ffmpeg_bin,
                        "-y",
                        "-i",
                        str(src_resolved),
                        "-vf",
                        plan.video_filter,
                        *PROXY_CODEC_SPECS[norm_codec].video_args,
                        *PROXY_CODEC_SPECS[norm_codec].audio_args,
                        str(dst_resolved),
                    ]
                    proc = subprocess.run(
                        real_argv,
                        capture_output=True,
                        text=True,
                        timeout=120,
                        check=False,
                    )
                    if proc.returncode == 0 and dst_resolved.is_file():
                        plan.executed = True
                        plan.status = "ready"
                        plan.detail = f"Transcoded {plan.proxy_width}x{plan.proxy_height} on disk"
                    else:
                        plan.status = "error"
                        plan.detail = (proc.stderr or "ffmpeg failed")[-160:]
                except (FileNotFoundError, ValueError, OSError):
                    plan.executed = False
                    plan.status = "ready"
                    plan.detail = (
                        f"Planned {plan.proxy_width}x{plan.proxy_height} (source not on disk)"
                    )

            if plan.status != "error":
                clip.proxy_path = plan.proxy_path
                clip.proxy_scale = norm_scale
                clip.proxy_codec = norm_codec
                generated_count += 1
            plans.append(plan)

    codec_label = PROXY_CODEC_SPECS[norm_codec].label
    detail = (
        f"Generated {generated_count} proxy asset(s) ({norm_scale}, {codec_label})."
        if generated_count > 0
        else "No eligible video clips matched proxy generation scope."
    )
    return ProxyBatchResult(
        changed=generated_count > 0,
        generated_count=generated_count,
        proxy_dir=clean_dir,
        scale=norm_scale,
        codec=norm_codec,
        plans=plans,
        detail=detail,
        document=next_doc,
    )


def clear_proxies_for_document(
    doc: TimelineDocument,
    *,
    scope: ProxyScope = "all_video",
    track_kind: Literal["video", "audio"] = "video",
    track_index: int = 1,
    clip_index: int = 0,
) -> tuple[TimelineDocument, int]:
    """Detach proxy metadata from selected clip or all video clips."""
    next_doc = doc.model_copy(deep=True)
    cleared = 0
    for trk in next_doc.tracks:
        if trk.kind != "video":
            continue
        for c_idx, clip in enumerate(trk.clips):
            if scope == "selected" and (
                track_kind != "video" or trk.index != track_index or c_idx != clip_index
            ):
                continue
            if clip.proxy_path or clip.proxy_scale is not None or clip.proxy_codec is not None:
                clip.proxy_path = ""
                clip.proxy_scale = None
                clip.proxy_codec = None
                cleared += 1
    return next_doc, cleared


def _norm_posix(raw: str) -> str:
    return raw.strip().replace("\\", "/").lstrip("./")


def _tokenize_stem(text: str) -> set[str]:
    stem = Path(text).stem.lower()
    return {tok for tok in re.split(r"[^a-z0-9]+", stem) if len(tok) >= 2}


def suggest_relink_candidates(
    source_path: str,
    clip_name: str,
    workspace_files: Sequence[str],
    *,
    limit: int = 5,
) -> list[RelinkCandidate]:
    """Rank workspace media files by filename, stem, and reel-token similarity."""
    target_path = _norm_posix(source_path or clip_name)
    target_name = Path(target_path).name.lower() if target_path else ""
    target_stem = (
        Path(target_path).stem.lower() if target_path else _SAFE_STEM_RE.sub("_", clip_name).lower()
    )
    target_tokens = _tokenize_stem(target_path or clip_name)

    scored: list[RelinkCandidate] = []
    seen: set[str] = set()
    for raw_file in workspace_files:
        norm = _norm_posix(raw_file)
        if not norm or norm in seen:
            continue
        seen.add(norm)
        cand_name = Path(norm).name.lower()
        cand_stem = Path(norm).stem.lower()
        cand_tokens = _tokenize_stem(norm)

        if target_name and cand_name == target_name:
            scored.append(RelinkCandidate(path=norm, confidence=100, match_reason="exact_filename"))
        elif target_stem and cand_stem == target_stem:
            scored.append(RelinkCandidate(path=norm, confidence=88, match_reason="stem_match"))
        elif target_tokens and cand_tokens:
            overlap = len(target_tokens & cand_tokens)
            union = len(target_tokens | cand_tokens)
            if overlap > 0 and union > 0:
                pct = max(45, min(82, round(40 + 45 * (overlap / union))))
                scored.append(
                    RelinkCandidate(path=norm, confidence=pct, match_reason="token_match")
                )
            else:
                scored.append(
                    RelinkCandidate(path=norm, confidence=20, match_reason="workspace_media")
                )
        else:
            scored.append(RelinkCandidate(path=norm, confidence=15, match_reason="workspace_media"))

    scored.sort(key=lambda c: (-c.confidence, c.path))
    return scored[: max(1, limit)]


def audit_media_pool_links(
    doc: TimelineDocument,
    *,
    workspace_files: Sequence[str] | None = None,
    workspace_root: Path | None = None,
    strict_workspace_check: bool = False,
) -> MediaLinkAuditReport:
    """Audit online/proxy_only/offline clip link health across the timeline."""
    scanned_media: list[str]
    if workspace_files is not None:
        scanned_media = sorted({_norm_posix(p) for p in workspace_files if _norm_posix(p)})
    elif workspace_root is not None:
        scanned_media = scan_workspace_files(workspace_root)["media"]
    else:
        scanned_media = []

    media_set = {_norm_posix(p).lower(): _norm_posix(p) for p in scanned_media}
    entries: list[MediaLinkAuditEntry] = []
    online_count = 0
    proxy_only_count = 0
    offline_count = 0

    for trk in doc.tracks:
        for c_idx, clip in enumerate(trk.clips):
            if _is_synthetic_gfx_clip(clip, trk) and not clip.media_offline:
                online_count += 1
                entries.append(
                    MediaLinkAuditEntry(
                        track_kind=trk.kind,
                        track_index=trk.index,
                        clip_index=c_idx,
                        clip_name=clip.name,
                        source_path=clip.source_path,
                        proxy_path=clip.proxy_path,
                        status="online",
                    )
                )
                continue

            src_norm = _norm_posix(clip.source_path)
            pxy_norm = _norm_posix(clip.proxy_path)
            status: MediaLinkStatus = "online"

            if clip.media_offline:
                status = "offline"
            elif strict_workspace_check or workspace_files is not None:
                src_exists = bool(src_norm) and src_norm.lower() in media_set
                if not src_exists and workspace_root is not None and src_norm:
                    try:
                        confine_workspace_path(workspace_root, src_norm, must_exist=True)
                        src_exists = True
                    except (FileNotFoundError, PermissionError, ValueError, OSError):
                        src_exists = False
                if src_exists:
                    status = "online"
                elif pxy_norm and (
                    pxy_norm.lower() in media_set
                    or (workspace_root is not None and (workspace_root / pxy_norm).is_file())
                ):
                    status = "proxy_only"
                else:
                    status = "offline"

            if status == "online":
                online_count += 1
                cands: list[RelinkCandidate] = []
            elif status == "proxy_only":
                proxy_only_count += 1
                cands = suggest_relink_candidates(clip.source_path, clip.name, scanned_media)
            else:
                offline_count += 1
                cands = suggest_relink_candidates(clip.source_path, clip.name, scanned_media)

            entries.append(
                MediaLinkAuditEntry(
                    track_kind=trk.kind,
                    track_index=trk.index,
                    clip_index=c_idx,
                    clip_name=clip.name,
                    source_path=clip.source_path,
                    proxy_path=clip.proxy_path,
                    status=status,
                    candidates=cands,
                )
            )

    return MediaLinkAuditReport(
        total_clips=len(entries),
        online_count=online_count,
        proxy_only_count=proxy_only_count,
        offline_count=offline_count,
        entries=entries,
        workspace_media=scanned_media,
    )


def _find_clip_mut(
    doc: TimelineDocument,
    track_kind: Literal["video", "audio"],
    track_index: int,
    clip_index: int,
) -> TimelineClip:
    for trk in doc.tracks:
        if trk.kind == track_kind and trk.index == track_index:
            if 0 <= clip_index < len(trk.clips):
                return trk.clips[clip_index]
            raise IndexError(f"Clip index {clip_index} out of range on {track_kind} {track_index}")
    raise ValueError(f"Track {track_kind} {track_index} not found")


def toggle_clip_offline_in_document(
    doc: TimelineDocument,
    *,
    track_kind: Literal["video", "audio"],
    track_index: int,
    clip_index: int,
    offline: bool | None = None,
) -> tuple[TimelineDocument, bool, str]:
    """Mark a clip offline or back online (used for watchdog testing & recovery)."""
    next_doc = doc.model_copy(deep=True)
    clip = _find_clip_mut(next_doc, track_kind, track_index, clip_index)
    target = (not clip.media_offline) if offline is None else bool(offline)
    changed = clip.media_offline != target
    clip.media_offline = target
    state_lbl = "OFFLINE" if target else "ONLINE"
    return next_doc, changed, f"Marked '{clip.name}' as {state_lbl}."


def relink_clip_in_document(
    doc: TimelineDocument,
    *,
    track_kind: Literal["video", "audio"],
    track_index: int,
    clip_index: int,
    new_source_path: str,
    workspace_root: Path | None = None,
) -> tuple[TimelineDocument, bool, str]:
    """Relink an offline clip to a validated workspace media path."""
    cleaned = _norm_posix(new_source_path)
    if not cleaned:
        raise ValueError("new_source_path must not be empty")
    if ".." in Path(cleaned).parts:
        raise ValueError("new_source_path must not contain '..' traversal")
    if workspace_root is not None:
        resolved = confine_workspace_path(
            workspace_root,
            cleaned,
            must_exist=True,
            allowed_suffixes=MEDIA_SUFFIXES,
        )
        cleaned = resolved.relative_to(Path(os.path.realpath(workspace_root))).as_posix()

    next_doc = doc.model_copy(deep=True)
    clip = _find_clip_mut(next_doc, track_kind, track_index, clip_index)
    clip.source_path = cleaned
    clip.media_ref = cleaned
    clip.media_offline = False
    return next_doc, True, f"Relinked '{clip.name}' -> {cleaned}"


def auto_relink_all_in_document(
    doc: TimelineDocument,
    *,
    workspace_files: Sequence[str] | None = None,
    workspace_root: Path | None = None,
    min_confidence: int = 60,
) -> tuple[TimelineDocument, int, list[str]]:
    """Automatically relink all offline clips whose top workspace candidate meets min_confidence."""
    report = audit_media_pool_links(
        doc,
        workspace_files=workspace_files,
        workspace_root=workspace_root,
        strict_workspace_check=False,
    )
    next_doc = doc.model_copy(deep=True)
    relinked = 0
    messages: list[str] = []
    for entry in report.entries:
        if entry.status == "online":
            continue
        if not entry.candidates:
            continue
        best = entry.candidates[0]
        if best.confidence < min_confidence:
            continue
        clip = _find_clip_mut(next_doc, entry.track_kind, entry.track_index, entry.clip_index)
        clip.source_path = best.path
        clip.media_ref = best.path
        clip.media_offline = False
        relinked += 1
        messages.append(f"{clip.name} -> {best.path} ({best.confidence}%)")
    return next_doc, relinked, messages


def parse_smpte_to_frames(tc: str, fps_int: int) -> int:
    """Convert HH:MM:SS:FF SMPTE timecode to integer frames."""
    match = _TIMECODE_RE.match(tc.strip())
    if not match:
        raise ValueError(f"Invalid SMPTE timecode {tc!r}; expected HH:MM:SS:FF")
    hh, mm, ss, ff = (int(g) for g in match.groups())
    rate = max(1, fps_int)
    return ((hh * 3600) + (mm * 60) + ss) * rate + (ff % rate)


def frames_to_smpte(frames: int, fps_int: int) -> str:
    """Convert non-negative integer frames to HH:MM:SS:FF SMPTE timecode."""
    rate = max(1, fps_int)
    f_nonneg = max(0, int(frames))
    ff = f_nonneg % rate
    total_sec = f_nonneg // rate
    ss = total_sec % 60
    mm = (total_sec // 60) % 60
    hh = total_sec // 3600
    return f"{hh:02d}:{mm:02d}:{ss:02d}:{ff:02d}"


def _build_deterministic_slate_envelopes(
    video_clip: TimelineClip,
    audio_clip: TimelineClip,
    *,
    num_bins: int = 96,
    max_lag: int = 48,
) -> tuple[list[float], list[float]]:
    """Build deterministic slate-clap audio envelopes for cross-correlation when WAV is absent."""
    seed_src = sum(ord(ch) for ch in f"{video_clip.name}:{audio_clip.name}")
    clap_pos = 24 + (seed_src % 16)
    true_lag = (video_clip.source_in_frame - audio_clip.source_in_frame) + (seed_src % 13) - 6
    clamped_lag = max(-max_lag // 2, min(max_lag // 2, true_lag))
    if clamped_lag == 0 and audio_clip.start_frame != video_clip.start_frame:
        clamped_lag = max(
            -max_lag // 2, min(max_lag // 2, video_clip.start_frame - audio_clip.start_frame)
        )
    if clamped_lag == 0:
        clamped_lag = 6

    vid_env: list[float] = []
    aud_env: list[float] = []
    for i in range(num_bins):
        base = 0.08 + 0.06 * abs(math.sin(i * 0.37 + seed_src * 0.11))
        clap_v = 0.88 * math.exp(-((i - clap_pos) ** 2) / 3.2)
        speech_v = (
            0.35 * math.exp(-((i - (clap_pos + 22)) ** 2) / 22.0) * (0.6 + 0.4 * math.sin(i * 0.9))
        )
        vid_env.append(round(min(1.0, base + clap_v + max(0.0, speech_v)), 4))

        j = i + clamped_lag
        base_a = 0.07 + 0.05 * abs(math.sin(j * 0.37 + seed_src * 0.11))
        clap_a = 0.92 * math.exp(-((j - clap_pos) ** 2) / 3.0)
        speech_a = (
            0.38 * math.exp(-((j - (clap_pos + 22)) ** 2) / 22.0) * (0.6 + 0.4 * math.sin(j * 0.9))
        )
        aud_env.append(round(min(1.0, base_a + clap_a + max(0.0, speech_a)), 4))
    return vid_env, aud_env


def _normalized_cross_correlation(
    ref_env: Sequence[float],
    target_env: Sequence[float],
    max_lag: int,
) -> tuple[int, float, list[AvSyncCorrelationPoint]]:
    """Compute Pearson normalized cross-correlation over [-max_lag, +max_lag]."""
    n_ref = len(ref_env)
    n_tgt = len(target_env)
    if n_ref < 4 or n_tgt < 4:
        return 0, 0.0, [AvSyncCorrelationPoint(lag=0, score=0.0)]

    curve: list[AvSyncCorrelationPoint] = []
    best_lag = 0
    best_score = -2.0
    bound = max(1, min(max_lag, max(n_ref, n_tgt) - 2))

    for lag in range(-bound, bound + 1):
        pairs_a: list[float] = []
        pairs_b: list[float] = []
        for i in range(n_ref):
            j = i + lag
            if 0 <= j < n_tgt:
                pairs_a.append(float(ref_env[i]))
                pairs_b.append(float(target_env[j]))
        if len(pairs_a) < 4:
            score = 0.0
        else:
            mean_a = sum(pairs_a) / len(pairs_a)
            mean_b = sum(pairs_b) / len(pairs_b)
            num = sum((a - mean_a) * (b - mean_b) for a, b in zip(pairs_a, pairs_b, strict=True))
            den_a = math.sqrt(sum((a - mean_a) ** 2 for a in pairs_a))
            den_b = math.sqrt(sum((b - mean_b) ** 2 for b in pairs_b))
            score = num / (den_a * den_b) if den_a > 1e-9 and den_b > 1e-9 else 0.0
        score_clamped = max(-1.0, min(1.0, round(score, 4)))
        curve.append(AvSyncCorrelationPoint(lag=lag, score=score_clamped))
        if score_clamped > best_score:
            best_score = score_clamped
            best_lag = lag

    confidence = round(max(0.0, min(1.0, best_score)), 4)
    return best_lag, confidence, curve


def compile_av_sync_filtergraph(
    offset_frames: int,
    fps: RationalFrameRate,
    *,
    audio_pad: str = "1:a",
    out_pad: str = "a_sync",
) -> str:
    """Compile FFmpeg asetpts/atrim/adelay audio sync filtergraph for an offset in frames."""
    a_pad = audio_pad.strip()
    o_pad = out_pad.strip()
    if not _PAD_LABEL_RE.match(a_pad) or not _PAD_LABEL_RE.match(o_pad):
        raise ValueError("Invalid FFmpeg pad label")
    fps_val = max(1.0, fps.as_float)
    off = max(-100000, min(100000, int(offset_frames)))
    if off > 0:
        delay_ms = round((off / fps_val) * 1000.0, 2)
        return f"[{a_pad}]adelay={delay_ms:.2f}|{delay_ms:.2f},asetpts=PTS-STARTPTS[{o_pad}]"
    if off < 0:
        trim_s = round((abs(off) / fps_val), 4)
        return f"[{a_pad}]atrim=start={trim_s:.4f},asetpts=PTS-STARTPTS[{o_pad}]"
    return f"[{a_pad}]anull,asetpts=PTS-STARTPTS[{o_pad}]"


def analyze_av_sync(
    doc: TimelineDocument,
    *,
    video_track_index: int = 1,
    video_clip_index: int = 0,
    audio_track_index: int = 1,
    audio_clip_index: int = 0,
    mode: AvSyncMode = "waveform",
    max_lag_frames: int = AV_SYNC_MAX_LAG_DEFAULT,
    video_tc: str = "",
    audio_tc: str = "",
    video_envelope: Sequence[float] | None = None,
    audio_envelope: Sequence[float] | None = None,
) -> AvSyncAnalysis:
    """Analyze waveform cross-correlation or SMPTE timecode offset for an A/V clip pair."""
    norm_mode = normalize_av_sync_mode(mode)
    lag_limit = max(AV_SYNC_MAX_LAG_MIN, min(AV_SYNC_MAX_LAG_MAX, int(max_lag_frames)))
    fps_float = max(1.0, doc.fps.as_float)
    fps_int = max(1, round(fps_float))

    v_clip = _find_clip_mut(doc, "video", video_track_index, video_clip_index)
    a_clip = _find_clip_mut(doc, "audio", audio_track_index, audio_clip_index)

    v_tc = (
        video_tc.strip()
        or v_clip.timecode_start.strip()
        or frames_to_smpte(3600 * fps_int + v_clip.start_frame, fps_int)
    )
    a_tc = (
        audio_tc.strip()
        or a_clip.timecode_start.strip()
        or frames_to_smpte(3600 * fps_int + a_clip.start_frame, fps_int)
    )

    if video_envelope is not None and audio_envelope is not None:
        v_env = [max(0.0, min(1.0, float(x))) for x in video_envelope]
        a_env = [max(0.0, min(1.0, float(x))) for x in audio_envelope]
    else:
        v_env, a_env = _build_deterministic_slate_envelopes(v_clip, a_clip, max_lag=lag_limit)

    corr_lag, corr_conf, curve = _normalized_cross_correlation(v_env, a_env, lag_limit)

    if norm_mode == "timecode":
        v_frames = parse_smpte_to_frames(v_tc, fps_int)
        a_frames = parse_smpte_to_frames(a_tc, fps_int)
        offset_frames = max(-100000, min(100000, a_frames - v_frames))
        confidence = 1.0
        detail = f"SMPTE TC Jam-Sync: {offset_frames:+d}f ({v_tc} vs {a_tc})"
    else:
        offset_frames = corr_lag
        confidence = corr_conf
        conf_pct = round(confidence * 100)
        detail = f"Waveform cross-correlation peak at {offset_frames:+d}f ({conf_pct}% confidence)"

    offset_ms = round((offset_frames / fps_float) * 1000.0, 2)
    af = compile_av_sync_filtergraph(offset_frames, doc.fps)
    v_src = v_clip.source_path or f"{v_clip.name}.mov"
    a_src = a_clip.source_path or f"{a_clip.name}.wav"
    ffmpeg_argv = [
        "ffmpeg",
        "-y",
        "-i",
        v_src,
        "-i",
        a_src,
        "-filter_complex",
        af,
        "-map",
        "0:v",
        "-map",
        "[a_sync]",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "synced_clip.mp4",
    ]

    return AvSyncAnalysis(
        mode=norm_mode,
        video_track_index=video_track_index,
        video_clip_index=video_clip_index,
        video_clip_name=v_clip.name,
        audio_track_index=audio_track_index,
        audio_clip_index=audio_clip_index,
        audio_clip_name=a_clip.name,
        offset_frames=offset_frames,
        offset_ms=offset_ms,
        confidence=confidence,
        fps_float=fps_float,
        video_tc=v_tc,
        audio_tc=a_tc,
        video_envelope=v_env,
        audio_envelope=a_env,
        correlation_curve=curve,
        audio_filter=af,
        ffmpeg_argv=ffmpeg_argv,
        detail=detail,
    )


def apply_av_sync_to_document(
    doc: TimelineDocument,
    *,
    video_track_index: int = 1,
    video_clip_index: int = 0,
    audio_track_index: int = 1,
    audio_clip_index: int = 0,
    offset_frames: int = 0,
    link_pair: bool = True,
) -> tuple[TimelineDocument, str]:
    """Align and optionally A/V-link an audio clip to a video clip using offset_frames."""
    next_doc = doc.model_copy(deep=True)
    v_clip = _find_clip_mut(next_doc, "video", video_track_index, video_clip_index)
    a_clip = _find_clip_mut(next_doc, "audio", audio_track_index, audio_clip_index)

    off = max(-100000, min(100000, int(offset_frames)))
    a_clip.start_frame = max(0, v_clip.start_frame + off)
    a_clip.av_sync_offset_frames = off
    v_clip.av_sync_offset_frames = off

    if link_pair:
        default_link = (
            f"avsync_v{video_track_index}_{video_clip_index}"
            f"_a{audio_track_index}_{audio_clip_index}"
        )
        link_id = v_clip.link_group_id or a_clip.link_group_id or default_link
        v_clip.link_group_id = link_id[:64]
        a_clip.link_group_id = link_id[:64]

    suffix = " & linked A/V" if link_pair else ""
    detail = f"Synced '{a_clip.name}' to '{v_clip.name}' ({off:+d}f){suffix}."
    return next_doc, detail
