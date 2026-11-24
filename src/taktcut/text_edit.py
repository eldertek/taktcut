"""Premiere Pro / DaVinci Resolve Text-Based Dialogue Rough-Cut & Auto-Silence Studio."""

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

TextEditGapMode = Literal["ripple_delete", "extract_gaps", "markers_only"]
ALLOWED_TEXT_EDIT_GAP_MODES: tuple[TextEditGapMode, ...] = (
    "ripple_delete",
    "extract_gaps",
    "markers_only",
)

TextEditSegmentKind = Literal["speech", "silence", "filler"]
TextEditEngineMode = Literal["ffmpeg_silencedetect", "deterministic_synthetic"]
TextEditTrackKind = Literal["video", "audio"]

TEXT_EDIT_NOISE_DB_MIN: float = -60.0
TEXT_EDIT_NOISE_DB_MAX: float = -12.0
TEXT_EDIT_NOISE_DB_DEFAULT: float = -32.0

TEXT_EDIT_MIN_SILENCE_MIN: float = 0.15
TEXT_EDIT_MIN_SILENCE_MAX: float = 5.0
TEXT_EDIT_MIN_SILENCE_DEFAULT: float = 0.45

TEXT_EDIT_PADDING_MIN: float = 0.0
TEXT_EDIT_PADDING_MAX: float = 0.5
TEXT_EDIT_PADDING_DEFAULT: float = 0.08

TEXT_EDIT_MAX_SEGMENTS: int = 512
TEXT_EDIT_MAX_FILLERS: int = 24
TEXT_EDIT_WAVEFORM_BINS: int = 64

DEFAULT_FILLER_WORDS: tuple[str, ...] = (
    "um",
    "uh",
    "erm",
    "like",
    "you know",
    "euh",
    "ben",
    "voila",
)

ALLOWED_TEXT_EDIT_MARKER_COLORS: tuple[str, ...] = (
    "Red",
    "Cyan",
    "Gold",
    "Green",
    "Blue",
)

_SILENCE_START_RE = re.compile(r"silence_start:\s*(-?[0-9]+(?:\.[0-9]+)?)")
_SILENCE_END_RE = re.compile(
    r"silence_end:\s*(-?[0-9]+(?:\.[0-9]+)?)\s*\|\s*silence_duration:\s*([0-9]+(?:\.[0-9]+)?)"
)

_SYNTHETIC_SENTENCES: tuple[tuple[str, str], ...] = (
    ("Host", "Welcome back to the studio breakdown for today's master cut."),
    ("Guest", "Every camera roll was synced against our production timecode."),
    ("Host", "Let's tighten the intro pacing before we send this to color."),
    ("Guest", "The wide establishing shot carries clean ambient room tone."),
    ("Host", "Notice how the key light holds skin tones across the pivot."),
    ("Guest", "We can trim the pause here and jump straight into the demo."),
    ("Host", "That transition lands right on the downbeat of the cue."),
    ("Guest", "Final QC checks passed with zero true-peak overshoots."),
)

_SYNTHETIC_FILLERS: tuple[str, ...] = ("um", "uh", "euh", "like", "you know")


def _check_finite(raw: Any, field_name: str) -> float:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raise ValueError(f"{field_name} must be a finite number, got {raw!r}")
    val = float(raw)
    if not math.isfinite(val):
        raise ValueError(f"{field_name} must be finite, got {raw!r}")
    return val


def normalize_text_edit_gap_mode(raw: Any) -> TextEditGapMode:
    """Validate and normalize rough-cut gap handling mode."""
    cleaned = str(raw or "ripple_delete").strip().lower()
    if cleaned == "ripple_delete":
        return "ripple_delete"
    if cleaned == "extract_gaps":
        return "extract_gaps"
    if cleaned == "markers_only":
        return "markers_only"
    allowed = ", ".join(ALLOWED_TEXT_EDIT_GAP_MODES)
    raise ValueError(f"Unsupported gap_mode {raw!r}; expected one of: {allowed}")


def normalize_text_edit_track_kind(raw: Any) -> TextEditTrackKind:
    """Validate and normalize track kind ('video' or 'audio')."""
    cleaned = str(raw or "video").strip().lower()
    if cleaned == "video":
        return "video"
    if cleaned == "audio":
        return "audio"
    raise ValueError(f"Unsupported track_kind {raw!r}; expected 'video' or 'audio'")


def normalize_text_edit_marker_color(raw: Any) -> str:
    """Normalize marker color tag to the allowed DaVinci Resolve palette."""
    cleaned = str(raw or "Red").strip().title()
    if cleaned in ALLOWED_TEXT_EDIT_MARKER_COLORS:
        return cleaned
    return "Red"


def validate_noise_db(raw: Any) -> float:
    """Validate noise floor threshold in dBFS [-60.0, -12.0]."""
    val = _check_finite(raw, "noise_db")
    if val < TEXT_EDIT_NOISE_DB_MIN or val > TEXT_EDIT_NOISE_DB_MAX:
        raise ValueError(
            f"noise_db must be between {TEXT_EDIT_NOISE_DB_MIN} and "
            f"{TEXT_EDIT_NOISE_DB_MAX}, got {val}"
        )
    return round(val, 2)


def validate_min_silence_s(raw: Any) -> float:
    """Validate minimum silence window in seconds [0.15, 5.0]."""
    val = _check_finite(raw, "min_silence_s")
    if val < TEXT_EDIT_MIN_SILENCE_MIN or val > TEXT_EDIT_MIN_SILENCE_MAX:
        raise ValueError(
            f"min_silence_s must be between {TEXT_EDIT_MIN_SILENCE_MIN} and "
            f"{TEXT_EDIT_MIN_SILENCE_MAX}, got {val}"
        )
    return round(val, 3)


def validate_padding_s(raw: Any) -> float:
    """Validate speech head/tail padding in seconds [0.0, 0.5]."""
    val = _check_finite(raw, "padding_s")
    if val < TEXT_EDIT_PADDING_MIN or val > TEXT_EDIT_PADDING_MAX:
        raise ValueError(
            f"padding_s must be between {TEXT_EDIT_PADDING_MIN} and "
            f"{TEXT_EDIT_PADDING_MAX}, got {val}"
        )
    return round(val, 3)


def normalize_filler_words(raw: Sequence[str] | None) -> list[str]:
    """Normalize and bound custom filler-word tokens."""
    if raw is None:
        return list(DEFAULT_FILLER_WORDS)
    cleaned: list[str] = []
    seen: set[str] = set()
    for item in raw:
        tok = re.sub(r"\s+", " ", str(item or "").strip().lower())
        if not tok or len(tok) > 24 or tok in seen:
            continue
        seen.add(tok)
        cleaned.append(tok)
        if len(cleaned) >= TEXT_EDIT_MAX_FILLERS:
            break
    return cleaned if cleaned else list(DEFAULT_FILLER_WORDS)


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


def format_srt_timestamp(seconds: float) -> str:
    """Format non-negative seconds as SRT HH:MM:SS,mmm."""
    clamped = max(0.0, float(seconds))
    total_ms = int(round(clamped * 1000.0))
    ms = total_ms % 1000
    total_s = total_ms // 1000
    ss = total_s % 60
    mm = (total_s // 60) % 60
    hh = total_s // 3600
    return f"{hh:02d}:{mm:02d}:{ss:02d},{ms:03d}"


class TextEditConfig(BaseModel):
    """Validated parameters for Text-Based Dialogue & Auto-Silence Analysis."""

    noise_db: float = TEXT_EDIT_NOISE_DB_DEFAULT
    min_silence_s: float = TEXT_EDIT_MIN_SILENCE_DEFAULT
    padding_s: float = TEXT_EDIT_PADDING_DEFAULT
    detect_fillers: bool = True
    gap_mode: TextEditGapMode = "ripple_delete"
    marker_color: str = "Red"
    custom_fillers: list[str] = Field(default_factory=lambda: list(DEFAULT_FILLER_WORDS))

    @field_validator("noise_db", mode="before")
    @classmethod
    def _val_noise_db(cls, raw: Any) -> float:
        return validate_noise_db(raw)

    @field_validator("min_silence_s", mode="before")
    @classmethod
    def _val_min_silence(cls, raw: Any) -> float:
        return validate_min_silence_s(raw)

    @field_validator("padding_s", mode="before")
    @classmethod
    def _val_padding(cls, raw: Any) -> float:
        return validate_padding_s(raw)

    @field_validator("gap_mode", mode="before")
    @classmethod
    def _val_gap_mode(cls, raw: Any) -> TextEditGapMode:
        return normalize_text_edit_gap_mode(raw)

    @field_validator("marker_color", mode="before")
    @classmethod
    def _val_marker_color(cls, raw: Any) -> str:
        return normalize_text_edit_marker_color(raw)


class SilenceInterval(BaseModel):
    """Detected silence window in clip-local seconds."""

    start_s: float = Field(ge=0.0)
    end_s: float = Field(ge=0.0)
    duration_s: float = Field(ge=0.0)


class TranscriptWord(BaseModel):
    """Word-level timing unit inside a transcript segment."""

    word_id: str
    text: str
    start_s: float = Field(ge=0.0)
    end_s: float = Field(ge=0.0)
    start_frame: int = Field(ge=0)
    end_frame: int = Field(ge=0)
    is_filler: bool = False
    is_silence: bool = False
    deleted: bool = False
    confidence: float = Field(default=0.95, ge=0.0, le=1.0)


class TranscriptSegment(BaseModel):
    """Speech, silence, or filler segment bound to clip-local & timeline frames."""

    segment_id: str
    speaker: str = "Speaker 1"
    kind: TextEditSegmentKind = "speech"
    start_s: float = Field(ge=0.0)
    end_s: float = Field(ge=0.0)
    start_frame: int = Field(ge=0)
    end_frame: int = Field(ge=1)
    timeline_start_frame: int = Field(ge=0)
    timeline_end_frame: int = Field(ge=1)
    duration_s: float = Field(ge=0.0)
    text: str
    timecode: str
    deleted: bool = False
    words: list[TranscriptWord] = Field(default_factory=list)


class TextEditKeepRange(BaseModel):
    """Contiguous clip-local frame range retained after text-based cuts."""

    start_frame: int = Field(ge=0)
    end_frame: int = Field(ge=1)
    start_s: float = Field(ge=0.0)
    end_s: float = Field(ge=0.0)


class TextEditAnalysisResult(BaseModel):
    """Complete transcript, silence, and waveform analysis for a timeline clip."""

    clip_name: str
    track_kind: TextEditTrackKind
    track_index: int = Field(ge=1)
    clip_index: int = Field(ge=0)
    clip_start_frame: int = Field(ge=0)
    clip_duration_frames: int = Field(ge=0)
    fps_num: int = Field(ge=1)
    fps_den: int = Field(ge=1)
    duration_s: float = Field(ge=0.0)
    noise_db: float
    min_silence_s: float
    padding_s: float
    engine: TextEditEngineMode
    silencedetect_filtergraph: str
    roughcut_filtergraph: str
    waveform_peaks: list[float] = Field(default_factory=list)
    segments: list[TranscriptSegment] = Field(default_factory=list)
    silence_count: int = Field(ge=0)
    filler_count: int = Field(ge=0)
    speech_count: int = Field(ge=0)
    total_silence_s: float = Field(ge=0.0)
    kept_duration_s: float = Field(ge=0.0)
    saved_duration_s: float = Field(ge=0.0)


class TextEditRoughCutResult(BaseModel):
    """Result of committing text-based cuts / silence removal to the timeline."""

    document: TimelineDocument
    track_kind: TextEditTrackKind
    track_index: int = Field(ge=1)
    clip_index: int = Field(ge=0)
    gap_mode: TextEditGapMode
    kept_ranges: list[TextEditKeepRange] = Field(default_factory=list)
    removed_segment_ids: list[str] = Field(default_factory=list)
    created_clip_names: list[str] = Field(default_factory=list)
    created_marker_frames: list[int] = Field(default_factory=list)
    original_duration_frames: int = Field(ge=0)
    roughcut_duration_frames: int = Field(ge=0)
    saved_frames: int = Field(ge=0)
    linked_track_synced: bool = False
    ffmpeg_filtergraph: str
    transcript_srt: str
    summary: str


def compile_silencedetect_filtergraph(
    noise_db: float = TEXT_EDIT_NOISE_DB_DEFAULT,
    min_silence_s: float = TEXT_EDIT_MIN_SILENCE_DEFAULT,
) -> str:
    """Compile a safe FFmpeg `silencedetect` audio analysis filtergraph."""
    db = validate_noise_db(noise_db)
    dur = validate_min_silence_s(min_silence_s)
    return f"silencedetect=noise={db:.1f}dB:d={dur:.2f}"


def compile_roughcut_select_filtergraph(
    keep_ranges: Sequence[TextEditKeepRange],
    *,
    include_audio: bool = True,
) -> str:
    """Compile an FFmpeg `select`/`aselect` filtergraph preserving kept time spans."""
    if not keep_ranges:
        return "null"
    expr_terms = [
        f"between(t,{rng.start_s:.3f},{rng.end_s:.3f})"
        for rng in keep_ranges
        if rng.end_s > rng.start_s
    ]
    if not expr_terms:
        return "null"
    between_expr = "+".join(expr_terms)
    vf = f"select='{between_expr}',setpts=N/FRAME_RATE/TB"
    if not include_audio:
        return vf
    af = f"aselect='{between_expr}',asetpts=N/SR/TB"
    return f"{vf} ; {af}"


def parse_ffmpeg_silencedetect_stderr(
    stderr_text: str,
    total_duration_s: float,
) -> list[SilenceInterval]:
    """Parse `silence_start` and `silence_end` records from FFmpeg stderr."""
    intervals: list[SilenceInterval] = []
    pending_start: float | None = None
    max_dur = max(0.0, float(total_duration_s))

    for raw_line in stderr_text.splitlines():
        start_match = _SILENCE_START_RE.search(raw_line)
        if start_match:
            val = max(0.0, float(start_match.group(1)))
            pending_start = min(val, max_dur) if max_dur > 0.0 else val
            continue
        end_match = _SILENCE_END_RE.search(raw_line)
        if end_match:
            end_val = max(0.0, float(end_match.group(1)))
            dur_val = max(0.0, float(end_match.group(2)))
            start_val = pending_start if pending_start is not None else max(0.0, end_val - dur_val)
            pending_start = None
            if max_dur > 0.0:
                start_val = min(start_val, max_dur)
                end_val = min(end_val, max_dur)
            if end_val > start_val:
                intervals.append(
                    SilenceInterval(
                        start_s=round(start_val, 3),
                        end_s=round(end_val, 3),
                        duration_s=round(end_val - start_val, 3),
                    )
                )

    if pending_start is not None and max_dur > pending_start:
        intervals.append(
            SilenceInterval(
                start_s=round(pending_start, 3),
                end_s=round(max_dur, 3),
                duration_s=round(max_dur - pending_start, 3),
            )
        )
    return intervals


def _probe_ffmpeg_silences(
    source_path: Path,
    *,
    noise_db: float,
    min_silence_s: float,
    duration_s: float,
) -> list[SilenceInterval] | None:
    """Invoke FFmpeg `silencedetect` safely when available on disk."""
    ffmpeg_bin = shutil.which("ffmpeg")
    if not ffmpeg_bin or not source_path.is_file():
        return None
    fg = compile_silencedetect_filtergraph(noise_db, min_silence_s)
    cmd = [
        ffmpeg_bin,
        "-hide_banner",
        "-nostats",
        "-i",
        str(source_path),
        "-vn",
        "-af",
        fg,
        "-f",
        "null",
        "-",
    ]
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=20.0,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if proc.returncode != 0 and "silence_" not in proc.stderr:
        return None
    return parse_ffmpeg_silencedetect_stderr(proc.stderr, duration_s)


def _tracks_by_kind(doc: TimelineDocument, track_kind: TextEditTrackKind) -> list[TimelineTrack]:
    return [trk for trk in doc.tracks if trk.kind == track_kind]


def _find_track_and_clip(
    doc: TimelineDocument,
    track_kind: TextEditTrackKind,
    track_index: int,
    clip_index: int,
) -> tuple[TimelineTrack, TimelineClip]:
    tracks = _tracks_by_kind(doc, track_kind)
    if track_index < 1 or track_index > len(tracks):
        raise ValueError(
            f"{track_kind} track_index {track_index} out of range (1..{len(tracks)})"
        )
    track = tracks[track_index - 1]
    if clip_index < 0 or clip_index >= len(track.clips):
        raise ValueError(
            f"clip_index {clip_index} out of range for {track_kind} track {track_index}"
        )
    return track, track.clips[clip_index]


def _seed_float_sequence(seed_key: str, count: int) -> list[float]:
    out: list[float] = []
    counter = 0
    while len(out) < count:
        digest = hashlib.sha256(f"{seed_key}:{counter}".encode()).digest()
        for idx in range(0, len(digest), 2):
            if len(out) >= count:
                break
            val = ((digest[idx] << 8) | digest[idx + 1]) / 65535.0
            out.append(val)
        counter += 1
    return out


def _generate_synthetic_silences_and_waveform(
    clip: TimelineClip,
    *,
    duration_s: float,
    noise_db: float,
    min_silence_s: float,
    audio_envelope: Sequence[float] | None = None,
) -> tuple[list[SilenceInterval], list[float]]:
    """Build deterministic silence intervals + 64-bin audio envelope for demo/offline clips."""
    if audio_envelope is not None and len(audio_envelope) >= 8:
        peaks = [
            round(max(0.02, min(1.0, float(x))), 4)
            for x in audio_envelope[:TEXT_EDIT_WAVEFORM_BINS]
        ]
        while len(peaks) < TEXT_EDIT_WAVEFORM_BINS:
            peaks.append(peaks[-1])
    else:
        rand_vals = _seed_float_sequence(
            f"{clip.name}:{clip.duration_frames}",
            TEXT_EDIT_WAVEFORM_BINS + 16,
        )
        peaks = []
        # Create deterministic speech bursts separated by pause valleys
        pause_centers = [0.22, 0.54, 0.81]
        for idx in range(TEXT_EDIT_WAVEFORM_BINS):
            pos = idx / max(1, TEXT_EDIT_WAVEFORM_BINS - 1)
            in_valley = any(abs(pos - center) < 0.065 for center in pause_centers)
            amp = 0.03 + rand_vals[idx] * 0.06 if in_valley else 0.36 + rand_vals[idx] * 0.56
            peaks.append(round(min(1.0, amp), 4))

    # Map noise_db [-60, -12] to linear amplitude threshold [0.04, 0.42]
    db_span = TEXT_EDIT_NOISE_DB_MAX - TEXT_EDIT_NOISE_DB_MIN
    norm_db = (noise_db - TEXT_EDIT_NOISE_DB_MIN) / db_span
    amp_threshold = 0.04 + norm_db * 0.38
    bin_dur = duration_s / max(1, len(peaks))

    raw_intervals: list[SilenceInterval] = []
    run_start: int | None = None
    for idx, amp in enumerate(peaks):
        if amp <= amp_threshold:
            if run_start is None:
                run_start = idx
        elif run_start is not None:
            s0 = run_start * bin_dur
            s1 = idx * bin_dur
            if (s1 - s0) >= min_silence_s:
                raw_intervals.append(
                    SilenceInterval(
                        start_s=round(s0, 3),
                        end_s=round(s1, 3),
                        duration_s=round(s1 - s0, 3),
                    )
                )
            run_start = None
    if run_start is not None:
        s0 = run_start * bin_dur
        s1 = duration_s
        if (s1 - s0) >= min_silence_s:
            raw_intervals.append(
                SilenceInterval(
                    start_s=round(s0, 3),
                    end_s=round(s1, 3),
                    duration_s=round(s1 - s0, 3),
                )
            )
    return raw_intervals, peaks


def _build_waveform_from_silences(
    clip: TimelineClip,
    silences: Sequence[SilenceInterval],
    duration_s: float,
) -> list[float]:
    rand_vals = _seed_float_sequence(f"wf:{clip.name}", TEXT_EDIT_WAVEFORM_BINS)
    peaks: list[float] = []
    for idx in range(TEXT_EDIT_WAVEFORM_BINS):
        t = ((idx + 0.5) / TEXT_EDIT_WAVEFORM_BINS) * duration_s
        is_silent = any(iv.start_s <= t <= iv.end_s for iv in silences)
        amp = (0.04 + rand_vals[idx] * 0.05) if is_silent else (0.38 + rand_vals[idx] * 0.54)
        peaks.append(round(min(1.0, amp), 4))
    return peaks


def _build_words_for_text(
    seg_id: str,
    text: str,
    start_s: float,
    end_s: float,
    fps_float: float,
    clip_duration_frames: int,
    *,
    is_filler: bool = False,
    is_silence: bool = False,
    deleted: bool = False,
) -> list[TranscriptWord]:
    tokens = [tok for tok in text.split() if tok] or [text]
    span_s = max(0.04, end_s - start_s)
    word_step = span_s / len(tokens)
    words: list[TranscriptWord] = []
    for idx, tok in enumerate(tokens):
        w_s0 = round(start_s + idx * word_step, 3)
        w_s1 = round(start_s + (idx + 1) * word_step, 3)
        w_f0 = max(0, min(clip_duration_frames - 1, int(round(w_s0 * fps_float))))
        w_f1 = max(w_f0 + 1, min(clip_duration_frames, int(round(w_s1 * fps_float))))
        words.append(
            TranscriptWord(
                word_id=f"{seg_id}_w{idx + 1}",
                text=tok,
                start_s=w_s0,
                end_s=w_s1,
                start_frame=w_f0,
                end_frame=w_f1,
                is_filler=is_filler,
                is_silence=is_silence,
                deleted=deleted,
                confidence=0.98 if not is_filler else 0.91,
            )
        )
    return words


def _build_transcript_segments(
    clip: TimelineClip,
    silences: Sequence[SilenceInterval],
    *,
    fps_float: float,
    fps_int: int,
    detect_fillers: bool,
    filler_words: Sequence[str],
) -> list[TranscriptSegment]:
    """Partition the clip duration into contiguous speech, filler, and silence segments."""
    dur_frames = max(1, clip.duration_frames)
    duration_s = dur_frames / fps_float
    sorted_sil = sorted(
        (
            SilenceInterval(
                start_s=max(0.0, min(duration_s, iv.start_s)),
                end_s=max(0.0, min(duration_s, iv.end_s)),
                duration_s=max(
                    0.0,
                    min(duration_s, iv.end_s) - max(0.0, min(duration_s, iv.start_s)),
                ),
            )
            for iv in silences
            if iv.end_s > iv.start_s
        ),
        key=lambda item: item.start_s,
    )

    spans: list[tuple[TextEditSegmentKind, float, float]] = []
    cursor_s = 0.0
    for iv in sorted_sil:
        if iv.start_s > cursor_s + 0.05:
            spans.append(("speech", cursor_s, iv.start_s))
        if iv.end_s > max(cursor_s, iv.start_s) + 0.04:
            spans.append(("silence", max(cursor_s, iv.start_s), iv.end_s))
            cursor_s = iv.end_s
    if duration_s > cursor_s + 0.05:
        spans.append(("speech", cursor_s, duration_s))
    if not spans:
        spans.append(("speech", 0.0, duration_s))

    # Optionally split off short filler-word spans at the tail/head of long speech spans
    expanded_spans: list[tuple[TextEditSegmentKind, float, float]] = []
    filler_toggle = 0
    for kind, s0, s1 in spans:
        span_len = s1 - s0
        if kind == "speech" and detect_fillers and span_len >= 1.4:
            filler_dur = min(0.38, max(0.22, span_len * 0.14))
            if filler_toggle % 2 == 0:
                expanded_spans.append(("speech", s0, s1 - filler_dur))
                expanded_spans.append(("filler", s1 - filler_dur, s1))
            else:
                expanded_spans.append(("filler", s0, s0 + filler_dur))
                expanded_spans.append(("speech", s0 + filler_dur, s1))
            filler_toggle += 1
        else:
            expanded_spans.append((kind, s0, s1))

    seed_hash = int(hashlib.sha256(clip.name.encode("utf-8")).hexdigest()[:8], 16)
    filler_vocab = [f for f in filler_words if f] or list(DEFAULT_FILLER_WORDS)
    segments: list[TranscriptSegment] = []
    speech_idx = 0
    filler_idx = 0
    prev_end_frame = 0

    for idx, (kind, s0, s1) in enumerate(expanded_spans):
        if len(segments) >= TEXT_EDIT_MAX_SEGMENTS:
            break
        start_f = max(prev_end_frame, min(dur_frames - 1, int(round(s0 * fps_float))))
        end_f = (
            dur_frames
            if idx == len(expanded_spans) - 1
            else max(start_f + 1, min(dur_frames, int(round(s1 * fps_float))))
        )
        if end_f <= start_f:
            continue
        prev_end_frame = end_f
        real_s0 = round(start_f / fps_float, 3)
        real_s1 = round(end_f / fps_float, 3)
        dur_sec = round(max(0.0, real_s1 - real_s0), 3)
        seg_id = f"seg_{idx + 1:03d}"

        if kind == "silence":
            speaker = "Pause"
            text = f"[Silence {dur_sec:.2f}s]"
            deleted = True
        elif kind == "filler":
            speaker = "Speaker 1"
            filler_tok = filler_vocab[(seed_hash + filler_idx) % len(filler_vocab)]
            filler_idx += 1
            text = filler_tok
            deleted = False
        else:
            spk, sentence = _SYNTHETIC_SENTENCES[
                (seed_hash + speech_idx) % len(_SYNTHETIC_SENTENCES)
            ]
            speech_idx += 1
            speaker = spk
            text = sentence
            deleted = False

        tl_start = clip.start_frame + start_f
        tl_end = clip.start_frame + end_f
        segments.append(
            TranscriptSegment(
                segment_id=seg_id,
                speaker=speaker,
                kind=kind,
                start_s=real_s0,
                end_s=real_s1,
                start_frame=start_f,
                end_frame=end_f,
                timeline_start_frame=tl_start,
                timeline_end_frame=tl_end,
                duration_s=dur_sec,
                text=text,
                timecode=format_smpte_frames(tl_start, fps_int),
                deleted=deleted,
                words=_build_words_for_text(
                    seg_id,
                    text,
                    real_s0,
                    real_s1,
                    fps_float,
                    dur_frames,
                    is_filler=(kind == "filler"),
                    is_silence=(kind == "silence"),
                    deleted=deleted,
                ),
            )
        )
    return segments


def compute_keep_ranges_from_segments(
    segments: Sequence[TranscriptSegment],
    clip_duration_frames: int,
    fps_num: int,
    fps_den: int,
    padding_s: float = TEXT_EDIT_PADDING_DEFAULT,
) -> list[TextEditKeepRange]:
    """Merge kept transcript segments (with optional padding) into clean clip-local keep ranges."""
    fps_float = max(1.0, float(fps_num) / max(1, int(fps_den)))
    pad_frames = max(0, int(round(validate_padding_s(padding_s) * fps_float)))
    kept = sorted(
        (seg for seg in segments if not seg.deleted and seg.end_frame > seg.start_frame),
        key=lambda seg: (seg.start_frame, seg.end_frame),
    )
    if not kept:
        return []

    merged: list[list[int]] = []
    for seg in kept:
        s_f = max(0, seg.start_frame - pad_frames)
        e_f = min(clip_duration_frames, seg.end_frame + pad_frames)
        if not merged or s_f > merged[-1][1]:
            merged.append([s_f, e_f])
        else:
            merged[-1][1] = max(merged[-1][1], e_f)

    return [
        TextEditKeepRange(
            start_frame=rng[0],
            end_frame=rng[1],
            start_s=round(rng[0] / fps_float, 3),
            end_s=round(rng[1] / fps_float, 3),
        )
        for rng in merged
        if rng[1] > rng[0]
    ]


def export_transcript_srt(
    segments: Sequence[TranscriptSegment],
    *,
    include_deleted: bool = False,
) -> str:
    """Export dialogue segments into clean SubRip (.srt) subtitle format."""
    lines: list[str] = []
    cue_num = 1
    cursor_s = 0.0
    for seg in segments:
        if seg.kind == "silence":
            continue
        if seg.deleted and not include_deleted:
            continue
        dur = max(0.05, seg.duration_s)
        t0 = cursor_s if not include_deleted else seg.start_s
        t1 = t0 + dur
        cursor_s = t1
        lines.append(str(cue_num))
        lines.append(f"{format_srt_timestamp(t0)} --> {format_srt_timestamp(t1)}")
        lines.append(f"{seg.speaker}: {seg.text}")
        lines.append("")
        cue_num += 1
    return "\n".join(lines).strip() + ("\n" if lines else "")


def analyze_clip_transcript_and_silences(
    doc: TimelineDocument,
    *,
    track_kind: TextEditTrackKind = "video",
    track_index: int = 1,
    clip_index: int = 0,
    noise_db: float = TEXT_EDIT_NOISE_DB_DEFAULT,
    min_silence_s: float = TEXT_EDIT_MIN_SILENCE_DEFAULT,
    padding_s: float = TEXT_EDIT_PADDING_DEFAULT,
    detect_fillers: bool = True,
    custom_fillers: Sequence[str] | None = None,
    audio_envelope: Sequence[float] | None = None,
    workspace_root: Path | None = None,
    execute_ffmpeg: bool = False,
) -> TextEditAnalysisResult:
    """Analyze clip audio/dialogue for silences, filler words, and editable transcript segments."""
    norm_kind = normalize_text_edit_track_kind(track_kind)
    cfg = TextEditConfig(
        noise_db=noise_db,
        min_silence_s=min_silence_s,
        padding_s=padding_s,
        detect_fillers=bool(detect_fillers),
        custom_fillers=normalize_filler_words(custom_fillers),
    )
    _, clip = _find_track_and_clip(doc, norm_kind, track_index, clip_index)

    fps_float = max(1.0, float(doc.fps.num) / max(1, int(doc.fps.den)))
    fps_int = max(1, int(round(fps_float)))
    dur_frames = max(1, clip.duration_frames)
    duration_s = round(dur_frames / fps_float, 3)

    silencedetect_fg = compile_silencedetect_filtergraph(cfg.noise_db, cfg.min_silence_s)
    engine: TextEditEngineMode = "deterministic_synthetic"
    silences: list[SilenceInterval] | None = None

    if execute_ffmpeg and workspace_root is not None and clip.source_path:
        try:
            confined = confine_workspace_path(workspace_root, clip.source_path)
            silences = _probe_ffmpeg_silences(
                confined,
                noise_db=cfg.noise_db,
                min_silence_s=cfg.min_silence_s,
                duration_s=duration_s,
            )
        except ValueError:
            silences = None

    if silences is not None:
        engine = "ffmpeg_silencedetect"
        peaks = _build_waveform_from_silences(clip, silences, duration_s)
    else:
        silences, peaks = _generate_synthetic_silences_and_waveform(
            clip,
            duration_s=duration_s,
            noise_db=cfg.noise_db,
            min_silence_s=cfg.min_silence_s,
            audio_envelope=audio_envelope,
        )

    segments = _build_transcript_segments(
        clip,
        silences,
        fps_float=fps_float,
        fps_int=fps_int,
        detect_fillers=cfg.detect_fillers,
        filler_words=cfg.custom_fillers,
    )

    keep_ranges = compute_keep_ranges_from_segments(
        segments,
        dur_frames,
        doc.fps.num,
        doc.fps.den,
        cfg.padding_s,
    )
    roughcut_fg = compile_roughcut_select_filtergraph(
        keep_ranges,
        include_audio=(norm_kind == "audio" or bool(_tracks_by_kind(doc, "audio"))),
    )

    silence_count = sum(1 for seg in segments if seg.kind == "silence")
    filler_count = sum(1 for seg in segments if seg.kind == "filler")
    speech_count = sum(1 for seg in segments if seg.kind == "speech")
    total_silence_s = round(sum(seg.duration_s for seg in segments if seg.kind == "silence"), 3)
    kept_s = round(sum(rng.end_s - rng.start_s for rng in keep_ranges), 3)
    saved_s = round(max(0.0, duration_s - kept_s), 3)

    return TextEditAnalysisResult(
        clip_name=clip.name,
        track_kind=norm_kind,
        track_index=track_index,
        clip_index=clip_index,
        clip_start_frame=clip.start_frame,
        clip_duration_frames=dur_frames,
        fps_num=doc.fps.num,
        fps_den=doc.fps.den,
        duration_s=duration_s,
        noise_db=cfg.noise_db,
        min_silence_s=cfg.min_silence_s,
        padding_s=cfg.padding_s,
        engine=engine,
        silencedetect_filtergraph=silencedetect_fg,
        roughcut_filtergraph=roughcut_fg,
        waveform_peaks=peaks,
        segments=segments,
        silence_count=silence_count,
        filler_count=filler_count,
        speech_count=speech_count,
        total_silence_s=total_silence_s,
        kept_duration_s=kept_s,
        saved_duration_s=saved_s,
    )


def _slice_clip_by_keep_ranges(
    clip: TimelineClip,
    keep_ranges: Sequence[TextEditKeepRange],
    *,
    ripple_delete: bool,
    new_link_groups: Sequence[str] | None = None,
) -> list[TimelineClip]:
    """Slice a TimelineClip into kept sub-clips, optionally closing removed gaps."""
    slices: list[TimelineClip] = []
    cursor_timeline = clip.start_frame
    total = len(keep_ranges)

    for idx, rng in enumerate(keep_ranges):
        seg_dur = rng.end_frame - rng.start_frame
        if seg_dur <= 0:
            continue
        if clip.reverse:
            src_in = clip.source_in_frame + max(0, clip.duration_frames - rng.end_frame)
        else:
            src_in = clip.source_in_frame + rng.start_frame

        seg_start = cursor_timeline if ripple_delete else (clip.start_frame + rng.start_frame)
        seg_data = clip.model_dump()
        seg_data["name"] = f"{clip.name}_RC{idx + 1:02d}"
        seg_data["start_frame"] = seg_start
        seg_data["duration_frames"] = seg_dur
        seg_data["source_in_frame"] = src_in
        if idx > 0:
            seg_data["fade_in_s"] = 0.0
        if idx < total - 1:
            seg_data["fade_out_s"] = 0.0
            seg_data["transition_out"] = None
        if new_link_groups is not None and idx < len(new_link_groups):
            seg_data["link_group_id"] = new_link_groups[idx]
        slices.append(TimelineClip.model_validate(seg_data))
        cursor_timeline += seg_dur

    return slices


def _find_matching_linked_clip(
    doc: TimelineDocument,
    source_kind: TextEditTrackKind,
    source_clip: TimelineClip,
) -> tuple[TimelineTrack, int, TimelineClip] | None:
    """Locate the paired A/V clip matching link_group_id or start/duration."""
    partner_kind: TextEditTrackKind = "audio" if source_kind == "video" else "video"
    partner_tracks = _tracks_by_kind(doc, partner_kind)
    if source_clip.link_group_id:
        for trk in partner_tracks:
            for idx, candidate in enumerate(trk.clips):
                if candidate.link_group_id == source_clip.link_group_id:
                    return trk, idx, candidate
    for trk in partner_tracks:
        for idx, candidate in enumerate(trk.clips):
            if (
                candidate.start_frame == source_clip.start_frame
                and candidate.duration_frames == source_clip.duration_frames
            ):
                return trk, idx, candidate
    return None


def apply_text_edit_rough_cut(
    doc: TimelineDocument,
    *,
    track_kind: TextEditTrackKind = "video",
    track_index: int = 1,
    clip_index: int = 0,
    segments: Sequence[TranscriptSegment | dict[str, Any]] | None = None,
    delete_segment_ids: Sequence[str] | None = None,
    gap_mode: TextEditGapMode = "ripple_delete",
    sync_linked_track: bool = True,
    marker_color: str = "Red",
    padding_s: float = TEXT_EDIT_PADDING_DEFAULT,
    noise_db: float = TEXT_EDIT_NOISE_DB_DEFAULT,
    min_silence_s: float = TEXT_EDIT_MIN_SILENCE_DEFAULT,
) -> TextEditRoughCutResult:
    """Apply text-based transcript cuts / silence removal to a timeline clip."""
    norm_kind = normalize_text_edit_track_kind(track_kind)
    mode = normalize_text_edit_gap_mode(gap_mode)
    color = normalize_text_edit_marker_color(marker_color)
    pad_s = validate_padding_s(padding_s)

    next_doc = doc.model_copy(deep=True)
    track, clip = _find_track_and_clip(next_doc, norm_kind, track_index, clip_index)
    if clip.duration_frames < 2:
        raise ValueError(
            f"Clip '{clip.name}' is too short for text rough-cut ({clip.duration_frames}f)"
        )

    if segments is not None:
        resolved_segments = [
            seg if isinstance(seg, TranscriptSegment) else TranscriptSegment.model_validate(seg)
            for seg in segments
        ]
    else:
        analysis = analyze_clip_transcript_and_silences(
            next_doc,
            track_kind=norm_kind,
            track_index=track_index,
            clip_index=clip_index,
            noise_db=noise_db,
            min_silence_s=min_silence_s,
            padding_s=pad_s,
        )
        resolved_segments = analysis.segments

    if delete_segment_ids is not None:
        del_set = {str(item) for item in delete_segment_ids}
        for seg in resolved_segments:
            if seg.segment_id in del_set:
                seg.deleted = True

    removed_ids = [seg.segment_id for seg in resolved_segments if seg.deleted]
    keep_ranges = compute_keep_ranges_from_segments(
        resolved_segments,
        clip.duration_frames,
        next_doc.fps.num,
        next_doc.fps.den,
        pad_s,
    )
    if not keep_ranges:
        raise ValueError(
            "Cannot delete every transcript segment; at least one speech segment must remain."
        )

    ffmpeg_fg = compile_roughcut_select_filtergraph(
        keep_ranges,
        include_audio=(norm_kind == "audio" or bool(_tracks_by_kind(next_doc, "audio"))),
    )
    transcript_srt = export_transcript_srt(resolved_segments, include_deleted=False)
    orig_dur = clip.duration_frames
    kept_dur = sum(rng.end_frame - rng.start_frame for rng in keep_ranges)
    saved_frames = max(0, orig_dur - kept_dur)

    created_clip_names: list[str] = []
    created_marker_frames: list[int] = []
    linked_synced = False

    if mode == "markers_only":
        existing_frames = {m.frame for m in next_doc.markers}
        for seg in resolved_segments:
            if not seg.deleted:
                continue
            tl_frame = clip.start_frame + seg.start_frame
            if tl_frame not in existing_frames:
                next_doc.markers.append(
                    TimelineMarker(
                        frame=tl_frame,
                        name=f"Cut: {seg.text[:24]}",
                        color=color,
                        note=f"Text Edit ({seg.kind}) {seg.duration_s:.2f}s",
                    )
                )
                existing_frames.add(tl_frame)
                created_marker_frames.append(tl_frame)
        next_doc.markers.sort(key=lambda m: m.frame)
        summary = (
            f"Marked {len(created_marker_frames)} cut point(s) on '{clip.name}' "
            f"({saved_frames}f potential savings)"
        )
        return TextEditRoughCutResult(
            document=next_doc,
            track_kind=norm_kind,
            track_index=track_index,
            clip_index=clip_index,
            gap_mode=mode,
            kept_ranges=keep_ranges,
            removed_segment_ids=removed_ids,
            created_clip_names=[],
            created_marker_frames=created_marker_frames,
            original_duration_frames=orig_dur,
            roughcut_duration_frames=orig_dur,
            saved_frames=saved_frames,
            linked_track_synced=False,
            ffmpeg_filtergraph=ffmpeg_fg,
            transcript_srt=transcript_srt,
            summary=summary,
        )

    ripple_delete = mode == "ripple_delete"
    link_groups = [f"te_{clip.name}_{idx + 1:02d}" for idx in range(len(keep_ranges))]

    partner_match = (
        _find_matching_linked_clip(next_doc, norm_kind, clip)
        if sync_linked_track
        else None
    )

    new_slices = _slice_clip_by_keep_ranges(
        clip,
        keep_ranges,
        ripple_delete=ripple_delete,
        new_link_groups=link_groups if partner_match is not None else None,
    )
    created_clip_names = [s.name for s in new_slices]
    delta_shift = kept_dur - orig_dur

    # Replace target clip and ripple-shift downstream clips on this track when ripple_delete=True
    orig_end = clip.start_frame + orig_dur
    updated_clips = [
        *track.clips[:clip_index],
        *new_slices,
    ]
    for downstream in track.clips[clip_index + 1 :]:
        if ripple_delete and delta_shift != 0 and downstream.start_frame >= orig_end:
            ds_copy = downstream.model_copy(deep=True)
            ds_copy.start_frame = max(0, ds_copy.start_frame + delta_shift)
            updated_clips.append(ds_copy)
        else:
            updated_clips.append(downstream)
    track.clips = updated_clips

    if partner_match is not None:
        partner_track, partner_idx, partner_clip = partner_match
        partner_slices = _slice_clip_by_keep_ranges(
            partner_clip,
            keep_ranges,
            ripple_delete=ripple_delete,
            new_link_groups=link_groups,
        )
        p_orig_end = partner_clip.start_frame + partner_clip.duration_frames
        updated_partner = [
            *partner_track.clips[:partner_idx],
            *partner_slices,
        ]
        for downstream in partner_track.clips[partner_idx + 1 :]:
            if ripple_delete and delta_shift != 0 and downstream.start_frame >= p_orig_end:
                ds_copy = downstream.model_copy(deep=True)
                ds_copy.start_frame = max(0, ds_copy.start_frame + delta_shift)
                updated_partner.append(ds_copy)
            else:
                updated_partner.append(downstream)
        partner_track.clips = updated_partner
        linked_synced = True

    summary = (
        f"Rough-cut '{clip.name}' into {len(new_slices)} segment(s) "
        f"({mode}, -{saved_frames}f removed)"
    )
    return TextEditRoughCutResult(
        document=next_doc,
        track_kind=norm_kind,
        track_index=track_index,
        clip_index=clip_index,
        gap_mode=mode,
        kept_ranges=keep_ranges,
        removed_segment_ids=removed_ids,
        created_clip_names=created_clip_names,
        created_marker_frames=created_marker_frames,
        original_duration_frames=orig_dur,
        roughcut_duration_frames=kept_dur,
        saved_frames=saved_frames,
        linked_track_synced=linked_synced,
        ffmpeg_filtergraph=ffmpeg_fg,
        transcript_srt=transcript_srt,
        summary=summary,
    )
