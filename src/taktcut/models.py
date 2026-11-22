"""Core data models and exact rational frame-time math for taktcut."""

from __future__ import annotations

import math
from enum import Enum
from fractions import Fraction
from math import gcd
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


def _check_finite_number(raw: Any, field_name: str) -> float:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raise ValueError(f"{field_name} must be a finite number, got {raw!r}")
    val = float(raw)
    if not math.isfinite(val):
        raise ValueError(f"{field_name} must be finite, got {raw!r}")
    return val


class RationalFrameRate(BaseModel):
    """Exact rational framerate (num / den) to avoid floating-point drift."""

    num: int = Field(gt=0)
    den: int = Field(default=1, gt=0)

    @property
    def fraction(self) -> Fraction:
        return Fraction(self.num, self.den)

    @property
    def as_float(self) -> float:
        return self.num / self.den

    @property
    def ffmpeg_rate(self) -> str:
        return f"{self.num}/{self.den}" if self.den != 1 else str(self.num)

    @classmethod
    def from_str(cls, raw: str) -> RationalFrameRate:
        text = raw.strip().rstrip(",")
        if "/" in text:
            num_s, den_s = text.split("/", 1)
            num_i = int(num_s)
            den_i = int(den_s)
            divisor = gcd(num_i, den_i)
            return cls(num=num_i // divisor, den=den_i // divisor)
        frac = Fraction(text).limit_denominator(1001)
        return cls(num=frac.numerator, den=frac.denominator)

    @classmethod
    def from_float(cls, value: float) -> RationalFrameRate:
        common = (
            (24000, 1001),
            (24, 1),
            (25, 1),
            (30000, 1001),
            (30, 1),
            (48, 1),
            (50, 1),
            (60000, 1001),
            (60, 1),
        )
        for num, den in common:
            if abs(value - (num / den)) < 0.015:
                return cls(num=num, den=den)
        frac = Fraction(str(value)).limit_denominator(1001)
        return cls(num=frac.numerator, den=frac.denominator)


def seconds_to_rational_frames(
    seconds: Fraction | int | str,
    fps: RationalFrameRate,
) -> int:
    """Convert exact seconds (Fraction/int/str) into rounded integer timeline frames."""
    sec_frac = seconds if isinstance(seconds, Fraction) else Fraction(str(seconds))
    return round(sec_frac * fps.fraction)


def conform_source_frames(
    timeline_frames: int,
    source_fps: RationalFrameRate,
    timeline_fps: RationalFrameRate,
) -> int:
    """Compute integer source frames needed for a given timeline frame span."""
    ratio = source_fps.fraction / timeline_fps.fraction
    return round(Fraction(timeline_frames) * ratio)


MARKER_COLOR_PRESETS: tuple[str, ...] = ("Cyan", "Gold", "Red", "Green")

BPM_MIN: float = 60.0
BPM_MAX: float = 200.0
BPM_DEFAULT: float = 128.0
BPM_OFFSET_MIN_S: float = -10.0
BPM_OFFSET_MAX_S: float = 10.0


class TimelineMarker(BaseModel):
    """A marker anchored in exact integer timeline frames."""

    name: str
    frame: int = Field(ge=0)
    duration_frames: int = Field(default=1, ge=0)
    color: str = "Blue"
    note: str = ""


class BpmBeatTick(BaseModel):
    """A single rhythmic beat tick on the timeline frame grid."""

    frame: int = Field(ge=0)
    beat_index: int
    is_downbeat: bool
    bar: int
    beat_in_bar: int


class BpmGridConfig(BaseModel):
    """Music-video BPM beat-sync grid overlay configuration."""

    enabled: bool = False
    bpm: float = Field(default=BPM_DEFAULT, ge=BPM_MIN, le=BPM_MAX)
    offset_s: float = Field(default=0.0, ge=BPM_OFFSET_MIN_S, le=BPM_OFFSET_MAX_S)

    @field_validator("bpm", "offset_s", mode="before")
    @classmethod
    def _validate_finite_bpm_float(cls, raw: Any, info: Any) -> float:
        return _check_finite_number(raw, str(info.field_name))


def compute_bpm_beat_frames(
    fps: RationalFrameRate,
    start_frame: int,
    end_frame: int,
    *,
    bpm: float = BPM_DEFAULT,
    offset_s: float = 0.0,
) -> list[BpmBeatTick]:
    """Compute deterministic beat-grid frame ticks within [start_frame, end_frame]."""
    bpm_val = _check_finite_number(bpm, "bpm")
    offset_val = _check_finite_number(offset_s, "offset_s")
    if bpm_val < BPM_MIN or bpm_val > BPM_MAX:
        raise ValueError(f"bpm must be within [{BPM_MIN}, {BPM_MAX}], got {bpm_val}")
    if offset_val < BPM_OFFSET_MIN_S or offset_val > BPM_OFFSET_MAX_S:
        raise ValueError(
            f"offset_s must be within [{BPM_OFFSET_MIN_S}, {BPM_OFFSET_MAX_S}], got {offset_val}"
        )
    if end_frame < start_frame:
        return []

    fps_rate = fps.as_float
    beat_duration_s = 60.0 / bpm_val
    min_beat_idx = math.floor((start_frame / fps_rate - offset_val) / beat_duration_s) - 1
    max_beat_idx = math.ceil((end_frame / fps_rate - offset_val) / beat_duration_s) + 1

    ticks: list[BpmBeatTick] = []
    seen_frames: set[int] = set()
    max_iterations = 50000
    upper_idx = min(max_beat_idx, min_beat_idx + max_iterations)

    for beat_idx in range(min_beat_idx, upper_idx + 1):
        time_s = offset_val + beat_idx * beat_duration_s
        frame = int(math.floor(time_s * fps_rate + 0.5))
        if frame < start_frame or frame > end_frame or frame < 0:
            continue
        if frame in seen_frames:
            continue
        seen_frames.add(frame)
        beat_mod = ((beat_idx % 4) + 4) % 4
        ticks.append(
            BpmBeatTick(
                frame=frame,
                beat_index=beat_idx,
                is_downbeat=beat_mod == 0,
                bar=(beat_idx // 4) + 1,
                beat_in_bar=beat_mod + 1,
            )
        )
    return ticks


TransitionPresetId = Literal["fade", "fadeblack", "wipeleft", "slideright", "zoomin"]

ALLOWED_TRANSITION_PRESETS: frozenset[str] = frozenset(
    {"fade", "fadeblack", "wipeleft", "slideright", "zoomin"}
)
ALLOWED_ACROSSFADE_CURVES: frozenset[str] = frozenset(
    {
        "tri",
        "qsin",
        "esin",
        "hsin",
        "log",
        "ipar",
        "qua",
        "cub",
        "squ",
        "cbr",
        "par",
        "exp",
        "iqsin",
        "ihsin",
        "dese",
        "desi",
        "losi",
        "sinc",
        "isinc",
        "nofade",
    }
)


class ClipTransition(BaseModel):
    """Editorial video & audio transition attached to an outgoing clip cut junction."""

    preset: TransitionPresetId = "fade"
    duration_s: float = Field(default=0.5, ge=0.1, le=2.0)
    include_audio: bool = True
    audio_curve: str = "tri"

    @field_validator("preset", mode="before")
    @classmethod
    def _validate_preset(cls, raw: Any) -> str:
        if not isinstance(raw, str):
            raise ValueError(f"preset must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned not in ALLOWED_TRANSITION_PRESETS:
            allowed = ", ".join(sorted(ALLOWED_TRANSITION_PRESETS))
            raise ValueError(f"Unsupported transition preset {raw!r}; expected one of: {allowed}")
        return cleaned

    @field_validator("duration_s", mode="before")
    @classmethod
    def _validate_duration_s(cls, raw: Any) -> float:
        val = _check_finite_number(raw, "duration_s")
        if val < 0.1 or val > 2.0:
            raise ValueError(f"duration_s must be within [0.1, 2.0], got {val}")
        return val

    @field_validator("audio_curve", mode="before")
    @classmethod
    def _validate_audio_curve(cls, raw: Any) -> str:
        if not isinstance(raw, str):
            raise ValueError(f"audio_curve must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned not in ALLOWED_ACROSSFADE_CURVES:
            raise ValueError(f"Unsupported acrossfade curve {raw!r}")
        return cleaned


class TimelineClip(BaseModel):
    """An editorial clip item positioned in exact integer frames."""

    name: str
    track_index: int = Field(ge=1)
    media_type: Literal["video", "audio"] = "video"
    start_frame: int = Field(ge=0)
    duration_frames: int = Field(ge=0)
    source_in_frame: int = Field(default=0, ge=0)
    source_path: str = ""
    media_ref: str = ""
    source_fps: RationalFrameRate | None = None
    enabled: bool = True
    audio_gain_db: float = Field(default=0.0, ge=-24.0, le=12.0)
    fade_in_s: float = Field(default=0.0, ge=0.0, le=5.0)
    fade_out_s: float = Field(default=0.0, ge=0.0, le=5.0)
    speed_rate: float = Field(default=1.0, ge=0.25, le=4.0)
    reverse: bool = False
    transition_out: ClipTransition | None = None

    @field_validator("audio_gain_db", "fade_in_s", "fade_out_s", "speed_rate", mode="before")
    @classmethod
    def _validate_audio_float(cls, raw: Any, info: Any) -> float:
        return _check_finite_number(raw, str(info.field_name))

    @property
    def end_frame_exclusive(self) -> int:
        return self.start_frame + self.duration_frames


class TimelineTrack(BaseModel):
    """A single video or audio track containing clips and markers."""

    index: int = Field(ge=1)
    kind: Literal["video", "audio"] = "video"
    name: str = ""
    muted: bool = False
    solo: bool = False
    clips: list[TimelineClip] = Field(default_factory=list)


class TimelineDocument(BaseModel):
    """Clean-room normalized timeline container."""

    name: str
    source_format: Literal["drp", "drt", "fcpxml", "otio", "otioz"]
    fps: RationalFrameRate
    width: int = Field(default=1920, ge=0)
    height: int = Field(default=1080, ge=0)
    start_frame: int = Field(default=0, ge=0)
    tracks: list[TimelineTrack] = Field(default_factory=list)
    markers: list[TimelineMarker] = Field(default_factory=list)
    color_space_tags: list[str] = Field(default_factory=list)
    lut_refs: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class GapIssue(BaseModel):
    """Structural timeline issue detected by integer-frame validation."""

    kind: Literal["gap", "overlap", "zero_duration", "fps_mismatch"]
    track_kind: Literal["video", "audio"]
    track_index: int
    start_frame: int
    end_frame: int
    detail: str


class TimelineValidationResult(BaseModel):
    """Result of integer-frame timeline continuity and health validation."""

    timeline_name: str
    valid: bool
    total_tracks: int
    total_clips: int
    issues: list[GapIssue] = Field(default_factory=list)


class AscCdlParams(BaseModel):
    """ASC CDL v1.2 primary grading parameters (Slope, Offset, Power, Saturation)."""

    slope: tuple[float, float, float] = (1.0, 1.0, 1.0)
    offset: tuple[float, float, float] = (0.0, 0.0, 0.0)
    power: tuple[float, float, float] = (1.0, 1.0, 1.0)
    saturation: float = Field(default=1.0, ge=0.0)

    @model_validator(mode="after")
    def _validate_positive_power(self) -> AscCdlParams:
        for ch in self.power:
            if ch <= 0.0:
                raise ValueError("ASC CDL power channels must be strictly positive")
        return self

    def apply_rgb(self, r: float, g: float, b: float) -> tuple[float, float, float]:
        """Apply ASC CDL SOP + Rec.709 luma-weighted saturation to normalized RGB."""
        out: list[float] = []
        for idx, val in enumerate((r, g, b)):
            sop = val * self.slope[idx] + self.offset[idx]
            clamped = max(0.0, sop)
            out.append(clamped ** self.power[idx])
        sr, sg, sb = out[0], out[1], out[2]
        if self.saturation != 1.0:
            luma = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb
            sr = luma + self.saturation * (sr - luma)
            sg = luma + self.saturation * (sg - luma)
            sb = luma + self.saturation * (sb - luma)
        return (
            min(1.0, max(0.0, sr)),
            min(1.0, max(0.0, sg)),
            min(1.0, max(0.0, sb)),
        )


class CubeLutInfo(BaseModel):
    """Validated Adobe/Iridas .cube 1D or 3D LUT metadata."""

    path: str
    title: str = ""
    dimension: Literal["1D", "3D"]
    size: int = Field(ge=2)
    domain_min: tuple[float, float, float] = (0.0, 0.0, 0.0)
    domain_max: tuple[float, float, float] = (1.0, 1.0, 1.0)
    entry_count: int = Field(ge=2)


class RenderProfile(str, Enum):
    """Deterministic FFmpeg output presets."""

    WEB_H264 = "web_h264"
    MASTER_HEVC = "master_hevc"
    PRORES_HQ = "prores_hq"


class HardwareCapabilities(BaseModel):
    """Probed FFmpeg hardware encoder availability."""

    ffmpeg_path: str
    h264_nvenc: bool = False
    hevc_nvenc: bool = False
    libx264: bool = False
    libx265: bool = False
    prores_ks: bool = False


class RenderPlan(BaseModel):
    """Deterministic FFmpeg render invocation plan."""

    input_path: str
    output_path: str
    profile: RenderProfile
    encoder: str
    fps: RationalFrameRate
    gop_frames: int
    pix_fmt: str
    faststart: bool
    target_lufs: float | None = None
    lut_path: str | None = None
    video_filter: str | None = None
    audio_filter: str | None = None
    argv: list[str]


class RenderResult(BaseModel):
    """Outcome of executing a RenderPlan."""

    success: bool
    output_path: str
    encoder: str
    bytes_written: int = 0
    returncode: int = 0
    stderr_tail: str = ""


class StreamProbe(BaseModel):
    """Structured ffprobe stream and container audit."""

    path: str
    format_name: str
    container_duration_s: float
    video_codec: str = ""
    width: int = 0
    height: int = 0
    pix_fmt: str = ""
    r_frame_rate: str = ""
    avg_frame_rate: str = ""
    is_cfr: bool = False
    video_duration_s: float = 0.0
    duration_delta_s: float = 0.0
    color_space: str = ""
    color_primaries: str = ""
    color_transfer: str = ""
    color_range: str = ""
    audio_codec: str = ""
    audio_sample_rate: int = 0
    audio_channels: int = 0
    has_faststart: bool | None = None


class LoudnessReport(BaseModel):
    """EBU R128 loudness measurement summary."""

    path: str
    integrated_lufs: float
    lra_lu: float
    true_peak_dbtp: float
    target_lufs: float
    tolerance_lu: float
    max_true_peak_dbtp: float
    passed: bool


class FrameSample(BaseModel):
    """Signal statistics sampled at one timestamp."""

    timestamp_s: float
    y_avg: float
    y_min: int
    y_max: int


class QaReport(BaseModel):
    """Complete broadcast verification gate report."""

    path: str
    probe: StreamProbe
    loudness: LoudnessReport | None = None
    frame_samples: list[FrameSample] = Field(default_factory=list)
    passed: bool
    failures: list[str] = Field(default_factory=list)
