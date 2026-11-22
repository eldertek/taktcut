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


class TimelineMarker(BaseModel):
    """A marker anchored in exact integer timeline frames."""

    name: str
    frame: int = Field(ge=0)
    duration_frames: int = Field(default=1, ge=0)
    color: str = "Blue"
    note: str = ""


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
