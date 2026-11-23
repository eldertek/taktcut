"""Core data models and exact rational frame-time math for taktcut."""

from __future__ import annotations

import math
from collections.abc import Sequence
from enum import Enum
from fractions import Fraction
from math import gcd
from typing import Any, Literal, cast

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
LoudnessPresetId = Literal["off", "youtube_14", "reels_16", "broadcast_23"]
DialogueEqPresetId = Literal["off", "voice_clarity", "podcast_warm", "derumble"]
TimecodeBurnInPosition = Literal["off", "top_left", "bottom_center", "bottom_right"]
LowerThirdPosition = Literal["bottom_left", "bottom_center", "top_left"]
ReframeAspectRatio = Literal["source", "16:9", "9:16", "4:5", "1:1", "2.39:1"]
FilmGrainPresetId = Literal["35mm_fine", "16mm_organic", "super8_heavy", "custom"]
VignettePresetId = Literal["subtle_cinema", "moody_portrait", "heavy_noir", "custom"]
VignetteMode = Literal["forward", "backward"]
VoiceCleanupPresetId = Literal["youtube_voice", "podcast_warm", "broadcast_crisp", "custom"]
ExportFpsOption = Literal["source", "24", "25", "30", "60"]
AudioOnlyFormatId = Literal["off", "wav24", "mp3_320", "aac_256"]
RetimeProcessMode = Literal["nearest", "frame_blend", "optical_flow"]
RetimeRampPresetId = Literal[
    "constant",
    "hero_slowmo",
    "ramp_up",
    "ramp_down",
    "bullet_pulse",
    "custom",
]

ALLOWED_RETIME_PROCESS_MODES: tuple[RetimeProcessMode, ...] = (
    "nearest",
    "frame_blend",
    "optical_flow",
)
ALLOWED_RETIME_RAMP_PRESETS: tuple[RetimeRampPresetId, ...] = (
    "constant",
    "hero_slowmo",
    "ramp_up",
    "ramp_down",
    "bullet_pulse",
    "custom",
)
RETIME_SPEED_MIN: float = 0.25
RETIME_SPEED_MAX: float = 4.0
MAX_RETIME_RAMP_POINTS: int = 12
RETIME_RAMP_PRESET_POINTS: dict[RetimeRampPresetId, tuple[tuple[float, float], ...]] = {
    "constant": (),
    "hero_slowmo": ((0.0, 1.5), (0.3, 0.35), (0.7, 0.35), (1.0, 1.5)),
    "ramp_up": ((0.0, 0.5), (0.65, 1.0), (1.0, 3.0)),
    "ramp_down": ((0.0, 3.0), (0.35, 1.0), (1.0, 0.4)),
    "bullet_pulse": ((0.0, 1.0), (0.25, 3.5), (0.55, 0.4), (0.8, 3.0), (1.0, 1.0)),
    "custom": (),
}

ALLOWED_TIMECODE_BURNIN: tuple[TimecodeBurnInPosition, ...] = (
    "off",
    "top_left",
    "bottom_center",
    "bottom_right",
)
ALLOWED_LOWER_THIRD_POSITIONS: tuple[LowerThirdPosition, ...] = (
    "bottom_left",
    "bottom_center",
    "top_left",
)
ALLOWED_REFRAME_ASPECT_RATIOS: tuple[ReframeAspectRatio, ...] = (
    "source",
    "16:9",
    "9:16",
    "4:5",
    "1:1",
    "2.39:1",
)
ALLOWED_FILM_GRAIN_PRESETS: tuple[FilmGrainPresetId, ...] = (
    "35mm_fine",
    "16mm_organic",
    "super8_heavy",
    "custom",
)
FILM_GRAIN_STRENGTH_MIN: int = 0
FILM_GRAIN_STRENGTH_MAX: int = 60
FILM_GRAIN_STRENGTH_DEFAULT: int = 12
ALLOWED_VIGNETTE_PRESETS: tuple[VignettePresetId, ...] = (
    "subtle_cinema",
    "moody_portrait",
    "heavy_noir",
    "custom",
)
ALLOWED_VIGNETTE_MODES: tuple[VignetteMode, ...] = ("forward", "backward")
VIGNETTE_ANGLE_DEG_MIN: float = 5.0
VIGNETTE_ANGLE_DEG_MAX: float = 75.0
VIGNETTE_ANGLE_DEG_DEFAULT: float = 24.0
ALLOWED_VOICE_CLEANUP_PRESETS: tuple[VoiceCleanupPresetId, ...] = (
    "youtube_voice",
    "podcast_warm",
    "broadcast_crisp",
    "custom",
)
VOICE_CLEANUP_HIGHPASS_HZ_MIN: int = 40
VOICE_CLEANUP_HIGHPASS_HZ_MAX: int = 200
VOICE_CLEANUP_HIGHPASS_HZ_DEFAULT: int = 85
VOICE_CLEANUP_PRESENCE_DB_MIN: float = -6.0
VOICE_CLEANUP_PRESENCE_DB_MAX: float = 6.0
VOICE_CLEANUP_PRESENCE_DB_DEFAULT: float = 2.5
VOICE_CLEANUP_DE_ESS_MIN: float = 0.0
VOICE_CLEANUP_DE_ESS_MAX: float = 1.0
VOICE_CLEANUP_DE_ESS_DEFAULT: float = 0.35
ALLOWED_EXPORT_FPS: tuple[ExportFpsOption, ...] = ("source", "24", "25", "30", "60")
ALLOWED_AUDIO_ONLY_FORMATS: tuple[AudioOnlyFormatId, ...] = (
    "off",
    "wav24",
    "mp3_320",
    "aac_256",
)
YADIF_DEINTERLACE_FILTER: str = "yadif=mode=0:parity=-1:deint=0"

REVIEW_WATERMARK_MAX_LEN: int = 40
REVIEW_WATERMARK_OPACITY_MIN: float = 0.15
REVIEW_WATERMARK_OPACITY_MAX: float = 0.80
REVIEW_WATERMARK_OPACITY_DEFAULT: float = 0.35

LOWER_THIRD_TEXT_MAX_LEN: int = 120
LOWER_THIRD_FONT_SIZE_MIN: int = 16
LOWER_THIRD_FONT_SIZE_MAX: int = 96
LOWER_THIRD_FONT_SIZE_DEFAULT: int = 36
LOWER_THIRD_BOX_OPACITY_MIN: float = 0.0
LOWER_THIRD_BOX_OPACITY_MAX: float = 1.0
LOWER_THIRD_BOX_OPACITY_DEFAULT: float = 0.65
LOWER_THIRD_TIME_MAX_S: float = 86400.0
LOWER_THIRD_DURATION_MIN_S: float = 0.1

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


TRANSFORM_ZOOM_MIN: float = 10.0
TRANSFORM_ZOOM_MAX: float = 300.0
TRANSFORM_POS_MIN: float = -100.0
TRANSFORM_POS_MAX: float = 100.0
TRANSFORM_ROT_MIN: float = -180.0
TRANSFORM_ROT_MAX: float = 180.0
TRANSFORM_OPACITY_MIN: float = 0.0
TRANSFORM_OPACITY_MAX: float = 100.0
MAX_TRANSFORM_KEYFRAMES_PER_PARAM: int = 64
MAX_TRANSFORM_KEYFRAME_TIME_S: float = 3600.0
TRANSFORM_BEZIER_Y_MIN: float = -1.5
TRANSFORM_BEZIER_Y_MAX: float = 2.5

TransformParamName = Literal[
    "zoom_pct",
    "pos_x_pct",
    "pos_y_pct",
    "rotation_deg",
    "opacity_pct",
]
ALLOWED_TRANSFORM_KEYFRAME_PARAMS: tuple[TransformParamName, ...] = (
    "zoom_pct",
    "pos_x_pct",
    "pos_y_pct",
    "rotation_deg",
    "opacity_pct",
)
TRANSFORM_PARAM_BOUNDS: dict[TransformParamName, tuple[float, float, float]] = {
    "zoom_pct": (TRANSFORM_ZOOM_MIN, TRANSFORM_ZOOM_MAX, 100.0),
    "pos_x_pct": (TRANSFORM_POS_MIN, TRANSFORM_POS_MAX, 0.0),
    "pos_y_pct": (TRANSFORM_POS_MIN, TRANSFORM_POS_MAX, 0.0),
    "rotation_deg": (TRANSFORM_ROT_MIN, TRANSFORM_ROT_MAX, 0.0),
    "opacity_pct": (TRANSFORM_OPACITY_MIN, TRANSFORM_OPACITY_MAX, 100.0),
}

TransformEasingType = Literal["linear", "ease_in", "ease_out", "ease_in_out", "bezier"]
ALLOWED_TRANSFORM_EASINGS: tuple[TransformEasingType, ...] = (
    "linear",
    "ease_in",
    "ease_out",
    "ease_in_out",
    "bezier",
)
TRANSFORM_BEZIER_PRESETS: dict[str, tuple[float, float, float, float]] = {
    "linear": (0.0, 0.0, 1.0, 1.0),
    "ease_in": (0.42, 0.0, 1.0, 1.0),
    "ease_out": (0.0, 0.0, 0.58, 1.0),
    "ease_in_out": (0.42, 0.0, 0.58, 1.0),
    "snap_pop": (0.16, 1.0, 0.3, 1.0),
}


def _cubic_bezier_coord(s: float, p1: float, p2: float) -> float:
    inv = 1.0 - s
    return 3.0 * inv * inv * s * p1 + 3.0 * inv * s * s * p2 + s * s * s


def _cubic_bezier_slope(s: float, p1: float, p2: float) -> float:
    inv = 1.0 - s
    return 3.0 * inv * inv * p1 + 6.0 * inv * s * (p2 - p1) + 3.0 * s * s * (1.0 - p2)


def solve_cubic_bezier_s(u: float, x1: float, x2: float) -> float:
    """Solve x(s) = u on [0, 1] for a 1D cubic Bezier curve using Newton + bisection."""
    u_clamped = max(0.0, min(1.0, u))
    if u_clamped <= 0.0:
        return 0.0
    if u_clamped >= 1.0:
        return 1.0
    if abs(x1 - 0.0) <= 1e-6 and abs(x2 - 1.0) <= 1e-6:
        # Still may have non-linear x if needed, quick check
        pass
    lo = 0.0
    hi = 1.0
    s = u_clamped
    for _ in range(8):
        err = _cubic_bezier_coord(s, x1, x2) - u_clamped
        if abs(err) < 1e-6:
            return s
        if err < 0.0:
            lo = s
        else:
            hi = s
        dx = _cubic_bezier_slope(s, x1, x2)
        if abs(dx) > 1e-6:
            candidate = s - err / dx
            if lo < candidate < hi:
                s = candidate
                continue
        s = 0.5 * (lo + hi)
    for _ in range(16):
        err = _cubic_bezier_coord(s, x1, x2) - u_clamped
        if abs(err) < 1e-6:
            return s
        if err < 0.0:
            lo = s
        else:
            hi = s
        s = 0.5 * (lo + hi)
    return s


def evaluate_cubic_bezier(u: float, x1: float, y1: float, x2: float, y2: float) -> float:
    """Evaluate a CSS/AE cubic-bezier(x1, y1, x2, y2) curve at normalized time u in [0, 1]."""
    u_clamped = max(0.0, min(1.0, u))
    if u_clamped <= 0.0:
        return 0.0
    if u_clamped >= 1.0:
        return 1.0
    if abs(x1 - y1) <= 1e-7 and abs(x2 - y2) <= 1e-7:
        return u_clamped
    s = solve_cubic_bezier_s(u_clamped, x1, x2)
    return _cubic_bezier_coord(s, y1, y2)


def evaluate_cubic_bezier_derivative(u: float, x1: float, y1: float, x2: float, y2: float) -> float:
    """Evaluate dy/du for a cubic-bezier(x1, y1, x2, y2) curve at normalized time u in [0, 1]."""
    u_clamped = max(0.0, min(1.0, u))
    if abs(x1 - y1) <= 1e-7 and abs(x2 - y2) <= 1e-7:
        return 1.0
    s = solve_cubic_bezier_s(u_clamped, x1, x2)
    dx = _cubic_bezier_slope(s, x1, x2)
    dy = _cubic_bezier_slope(s, y1, y2)
    if abs(dx) <= 1e-5:
        return 0.0 if abs(dy) <= 1e-5 else math.copysign(12.0, dy)
    return dy / dx


class TransformKeyframe(BaseModel):
    """Temporal keyframe with cubic-bezier easing for a ClipTransformParams channel."""

    time_s: float = Field(ge=0.0, le=MAX_TRANSFORM_KEYFRAME_TIME_S)
    value: float
    easing: TransformEasingType = "ease_in_out"
    bezier: tuple[float, float, float, float] = (0.42, 0.0, 0.58, 1.0)

    @field_validator("time_s", "value", mode="before")
    @classmethod
    def _validate_finite_kf_float(cls, raw: Any, info: Any) -> float:
        return _check_finite_number(raw, str(info.field_name))

    @field_validator("easing", mode="before")
    @classmethod
    def _validate_kf_easing(cls, raw: Any) -> TransformEasingType:
        if not isinstance(raw, str):
            raise ValueError(f"easing must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned not in ALLOWED_TRANSFORM_EASINGS:
            allowed = ", ".join(ALLOWED_TRANSFORM_EASINGS)
            raise ValueError(f"Unsupported transform easing {raw!r}; expected one of: {allowed}")
        return cleaned

    @field_validator("bezier", mode="before")
    @classmethod
    def _validate_kf_bezier(cls, raw: Any) -> tuple[float, float, float, float]:
        if not isinstance(raw, (list, tuple)) or len(raw) != 4:
            raise ValueError(f"bezier must be a 4-tuple (x1, y1, x2, y2), got {raw!r}")
        x1 = _check_finite_number(raw[0], "bezier[0]")
        y1 = _check_finite_number(raw[1], "bezier[1]")
        x2 = _check_finite_number(raw[2], "bezier[2]")
        y2 = _check_finite_number(raw[3], "bezier[3]")
        if not (0.0 <= x1 <= 1.0 and 0.0 <= x2 <= 1.0):
            raise ValueError(f"bezier x1/x2 must lie in [0.0, 1.0], got ({x1}, {x2})")
        if not (
            TRANSFORM_BEZIER_Y_MIN <= y1 <= TRANSFORM_BEZIER_Y_MAX
            and TRANSFORM_BEZIER_Y_MIN <= y2 <= TRANSFORM_BEZIER_Y_MAX
        ):
            raise ValueError(
                f"bezier y1/y2 must lie in [{TRANSFORM_BEZIER_Y_MIN}, {TRANSFORM_BEZIER_Y_MAX}], "
                f"got ({y1}, {y2})"
            )
        return (round(x1, 4), round(y1, 4), round(x2, 4), round(y2, 4))

    def resolved_bezier(self) -> tuple[float, float, float, float]:
        """Return the effective cubic-bezier (x1, y1, x2, y2) handles for this keyframe."""
        if self.easing == "bezier":
            return self.bezier
        return TRANSFORM_BEZIER_PRESETS[self.easing]


def _normalize_param_keyframes(
    raw_kfs: Sequence[TransformKeyframe],
    param_name: TransformParamName,
) -> list[TransformKeyframe]:
    if len(raw_kfs) > MAX_TRANSFORM_KEYFRAMES_PER_PARAM:
        raise ValueError(
            f"Too many keyframes for {param_name} ({len(raw_kfs)}); "
            f"maximum allowed is {MAX_TRANSFORM_KEYFRAMES_PER_PARAM}"
        )
    lo, hi, _ = TRANSFORM_PARAM_BOUNDS[param_name]
    ordered = sorted(raw_kfs, key=lambda item: item.time_s)
    deduped: list[TransformKeyframe] = []
    for kf in ordered:
        if kf.value < lo or kf.value > hi:
            raise ValueError(
                f"Keyframe value {kf.value} for {param_name} out of bounds [{lo}, {hi}]"
            )
        rounded = TransformKeyframe(
            time_s=round(kf.time_s, 4),
            value=round(kf.value, 4),
            easing=kf.easing,
            bezier=kf.bezier,
        )
        if deduped and abs(deduped[-1].time_s - rounded.time_s) <= 1e-4:
            deduped[-1] = rounded
        else:
            deduped.append(rounded)
    return deduped


class TransformKeyframeTracks(BaseModel):
    """Per-parameter keyframe lanes for ClipTransformParams."""

    zoom_pct: list[TransformKeyframe] = Field(default_factory=list)
    pos_x_pct: list[TransformKeyframe] = Field(default_factory=list)
    pos_y_pct: list[TransformKeyframe] = Field(default_factory=list)
    rotation_deg: list[TransformKeyframe] = Field(default_factory=list)
    opacity_pct: list[TransformKeyframe] = Field(default_factory=list)

    @model_validator(mode="after")
    def _normalize_all_lanes(self) -> TransformKeyframeTracks:
        self.zoom_pct = _normalize_param_keyframes(self.zoom_pct, "zoom_pct")
        self.pos_x_pct = _normalize_param_keyframes(self.pos_x_pct, "pos_x_pct")
        self.pos_y_pct = _normalize_param_keyframes(self.pos_y_pct, "pos_y_pct")
        self.rotation_deg = _normalize_param_keyframes(self.rotation_deg, "rotation_deg")
        self.opacity_pct = _normalize_param_keyframes(self.opacity_pct, "opacity_pct")
        return self

    def lane(self, param_name: TransformParamName) -> list[TransformKeyframe]:
        """Return the sorted keyframe list for a given transform parameter."""
        return cast(list[TransformKeyframe], getattr(self, param_name))

    def has_any(self) -> bool:
        """Return True when at least one parameter lane contains keyframes."""
        return any(bool(getattr(self, name)) for name in ALLOWED_TRANSFORM_KEYFRAME_PARAMS)

    def total_count(self) -> int:
        """Return total number of keyframes across all transform lanes."""
        return sum(len(getattr(self, name)) for name in ALLOWED_TRANSFORM_KEYFRAME_PARAMS)

    def keyframed_params(self) -> list[TransformParamName]:
        """Return ordered list of parameter names that carry keyframes."""
        return [name for name in ALLOWED_TRANSFORM_KEYFRAME_PARAMS if getattr(self, name)]


def evaluate_transform_keyframes(
    keyframes: Sequence[TransformKeyframe],
    time_s: float,
    static_fallback: float,
) -> float:
    """Evaluate a sorted TransformKeyframe lane at clip-relative time_s."""
    if not keyframes:
        return static_fallback
    ordered = sorted(keyframes, key=lambda item: item.time_s)
    t = max(0.0, float(time_s))
    if t <= ordered[0].time_s:
        return ordered[0].value
    if t >= ordered[-1].time_s:
        return ordered[-1].value
    for idx in range(len(ordered) - 1):
        k0 = ordered[idx]
        k1 = ordered[idx + 1]
        if t <= k1.time_s:
            dt = k1.time_s - k0.time_s
            if dt <= 1e-6:
                return k1.value
            u = (t - k0.time_s) / dt
            x1, y1, x2, y2 = k0.resolved_bezier()
            w = evaluate_cubic_bezier(u, x1, y1, x2, y2)
            return k0.value + (k1.value - k0.value) * w
    return ordered[-1].value


DynamicZoomPresetId = Literal[
    "off",
    "slow_zoom_in",
    "slow_zoom_out",
    "pan_left_to_right",
    "pan_right_to_left",
]
ALLOWED_DYNAMIC_ZOOM_PRESETS: tuple[DynamicZoomPresetId, ...] = (
    "off",
    "slow_zoom_in",
    "slow_zoom_out",
    "pan_left_to_right",
    "pan_right_to_left",
)


class ClipTransformParams(BaseModel):
    """Per-clip 2D motion transform (zoom, position, rotation, opacity, dynamic zoom, keyframes)."""

    zoom_pct: float = Field(default=100.0, ge=TRANSFORM_ZOOM_MIN, le=TRANSFORM_ZOOM_MAX)
    pos_x_pct: float = Field(default=0.0, ge=TRANSFORM_POS_MIN, le=TRANSFORM_POS_MAX)
    pos_y_pct: float = Field(default=0.0, ge=TRANSFORM_POS_MIN, le=TRANSFORM_POS_MAX)
    rotation_deg: float = Field(default=0.0, ge=TRANSFORM_ROT_MIN, le=TRANSFORM_ROT_MAX)
    opacity_pct: float = Field(default=100.0, ge=TRANSFORM_OPACITY_MIN, le=TRANSFORM_OPACITY_MAX)
    dynamic_zoom: DynamicZoomPresetId = "off"
    keyframes: TransformKeyframeTracks = Field(default_factory=TransformKeyframeTracks)

    @field_validator(
        "zoom_pct",
        "pos_x_pct",
        "pos_y_pct",
        "rotation_deg",
        "opacity_pct",
        mode="before",
    )
    @classmethod
    def _validate_finite_transform_float(cls, raw: Any, info: Any) -> float:
        return _check_finite_number(raw, str(info.field_name))

    @field_validator("dynamic_zoom", mode="before")
    @classmethod
    def _validate_dynamic_zoom(cls, raw: Any) -> DynamicZoomPresetId:
        if not isinstance(raw, str):
            raise ValueError(f"dynamic_zoom must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned not in ALLOWED_DYNAMIC_ZOOM_PRESETS:
            allowed = ", ".join(ALLOWED_DYNAMIC_ZOOM_PRESETS)
            raise ValueError(f"Unsupported dynamic_zoom preset {raw!r}; expected one of: {allowed}")
        return cleaned

    def has_static_transform(self) -> bool:
        """Return True when static zoom/position/rotation/opacity differ from identity."""
        return not (
            math.isclose(self.zoom_pct, 100.0, abs_tol=1e-6)
            and math.isclose(self.pos_x_pct, 0.0, abs_tol=1e-6)
            and math.isclose(self.pos_y_pct, 0.0, abs_tol=1e-6)
            and math.isclose(self.rotation_deg, 0.0, abs_tol=1e-6)
            and math.isclose(self.opacity_pct, 100.0, abs_tol=1e-6)
        )

    def has_keyframes(self) -> bool:
        """Return True when any transform parameter lane carries keyframes."""
        return self.keyframes.has_any()

    def evaluate_at(self, time_s: float) -> dict[TransformParamName, float]:
        """Evaluate all 5 animatable transform parameters at clip-relative time_s."""
        return {
            "zoom_pct": round(
                max(
                    TRANSFORM_ZOOM_MIN,
                    min(
                        TRANSFORM_ZOOM_MAX,
                        evaluate_transform_keyframes(
                            self.keyframes.zoom_pct, time_s, self.zoom_pct
                        ),
                    ),
                ),
                4,
            ),
            "pos_x_pct": round(
                max(
                    TRANSFORM_POS_MIN,
                    min(
                        TRANSFORM_POS_MAX,
                        evaluate_transform_keyframes(
                            self.keyframes.pos_x_pct, time_s, self.pos_x_pct
                        ),
                    ),
                ),
                4,
            ),
            "pos_y_pct": round(
                max(
                    TRANSFORM_POS_MIN,
                    min(
                        TRANSFORM_POS_MAX,
                        evaluate_transform_keyframes(
                            self.keyframes.pos_y_pct, time_s, self.pos_y_pct
                        ),
                    ),
                ),
                4,
            ),
            "rotation_deg": round(
                max(
                    TRANSFORM_ROT_MIN,
                    min(
                        TRANSFORM_ROT_MAX,
                        evaluate_transform_keyframes(
                            self.keyframes.rotation_deg, time_s, self.rotation_deg
                        ),
                    ),
                ),
                4,
            ),
            "opacity_pct": round(
                max(
                    TRANSFORM_OPACITY_MIN,
                    min(
                        TRANSFORM_OPACITY_MAX,
                        evaluate_transform_keyframes(
                            self.keyframes.opacity_pct, time_s, self.opacity_pct
                        ),
                    ),
                ),
                4,
            ),
        }

    def is_identity(self) -> bool:
        """Return True when static transform, dynamic_zoom, and keyframes are all neutral."""
        return (
            not self.has_static_transform()
            and self.dynamic_zoom == "off"
            and not self.has_keyframes()
        )


class RetimeSpeedPoint(BaseModel):
    """Normalized speed control point on a DaVinci Retime Speed Ramp curve."""

    pos_norm: float = Field(ge=0.0, le=1.0)
    speed_rate: float = Field(ge=RETIME_SPEED_MIN, le=RETIME_SPEED_MAX)

    @field_validator("pos_norm", "speed_rate", mode="before")
    @classmethod
    def _validate_finite_ramp_float(cls, raw: Any, info: Any) -> float:
        return _check_finite_number(raw, str(info.field_name))

    @model_validator(mode="after")
    def _round_fields(self) -> RetimeSpeedPoint:
        self.pos_norm = round(self.pos_norm, 4)
        self.speed_rate = round(self.speed_rate, 4)
        return self


def normalize_retime_ramp_points(raw_points: Sequence[RetimeSpeedPoint]) -> list[RetimeSpeedPoint]:
    """Sort, validate, and deduplicate speed ramp control points."""
    if len(raw_points) > MAX_RETIME_RAMP_POINTS:
        raise ValueError(
            f"Too many retime ramp points ({len(raw_points)}); max is {MAX_RETIME_RAMP_POINTS}"
        )
    ordered = sorted(raw_points, key=lambda pt: pt.pos_norm)
    deduped: list[RetimeSpeedPoint] = []
    for pt in ordered:
        if deduped and abs(deduped[-1].pos_norm - pt.pos_norm) <= 1e-3:
            deduped[-1] = pt
        else:
            deduped.append(pt)
    return deduped


def evaluate_retime_speed_at(
    points: Sequence[RetimeSpeedPoint],
    pos_norm: float,
    fallback_speed: float = 1.0,
) -> float:
    """Evaluate smoothstep-interpolated instantaneous speed rate at normalized clip position."""
    u = max(0.0, min(1.0, float(pos_norm)))
    if len(points) < 2:
        return max(RETIME_SPEED_MIN, min(RETIME_SPEED_MAX, float(fallback_speed)))
    ordered = sorted(points, key=lambda pt: pt.pos_norm)
    if u <= ordered[0].pos_norm:
        return ordered[0].speed_rate
    if u >= ordered[-1].pos_norm:
        return ordered[-1].speed_rate
    for idx in range(len(ordered) - 1):
        p0 = ordered[idx]
        p1 = ordered[idx + 1]
        if u <= p1.pos_norm:
            span = p1.pos_norm - p0.pos_norm
            if span <= 1e-6:
                return p1.speed_rate
            t = max(0.0, min(1.0, (u - p0.pos_norm) / span))
            smooth = t * t * (3.0 - 2.0 * t)
            return p0.speed_rate + (p1.speed_rate - p0.speed_rate) * smooth
    return ordered[-1].speed_rate


def compute_retime_ramp_summary(
    points: Sequence[RetimeSpeedPoint],
    fallback_speed: float = 1.0,
    clip_duration_s: float | None = None,
) -> dict[str, float]:
    """Compute harmonic average speed, min/max speed, and effective output duration."""
    if len(points) < 2:
        spd = max(RETIME_SPEED_MIN, min(RETIME_SPEED_MAX, float(fallback_speed)))
        eff_dur = (clip_duration_s / spd) if (clip_duration_s and clip_duration_s > 0.0) else 0.0
        return {
            "avg_speed": round(spd, 4),
            "min_speed": round(spd, 4),
            "max_speed": round(spd, 4),
            "effective_duration_s": round(eff_dur, 4),
        }
    steps = 64
    inv_integral = 0.0
    min_spd = RETIME_SPEED_MAX
    max_spd = RETIME_SPEED_MIN
    prev_inv = 1.0 / evaluate_retime_speed_at(points, 0.0, fallback_speed)
    for i in range(steps + 1):
        u = i / steps
        s_u = evaluate_retime_speed_at(points, u, fallback_speed)
        min_spd = min(min_spd, s_u)
        max_spd = max(max_spd, s_u)
        if i > 0:
            cur_inv = 1.0 / s_u
            inv_integral += 0.5 * (prev_inv + cur_inv) / steps
            prev_inv = cur_inv
    avg_spd = max(RETIME_SPEED_MIN, min(RETIME_SPEED_MAX, 1.0 / max(1e-6, inv_integral)))
    eff_dur = (
        clip_duration_s * inv_integral
        if (clip_duration_s is not None and clip_duration_s > 0.0)
        else 0.0
    )
    return {
        "avg_speed": round(avg_spd, 4),
        "min_speed": round(min_spd, 4),
        "max_speed": round(max_spd, 4),
        "effective_duration_s": round(eff_dur, 4),
    }


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
    speed_rate: float = Field(default=1.0, ge=RETIME_SPEED_MIN, le=RETIME_SPEED_MAX)
    reverse: bool = False
    retime_process: RetimeProcessMode = "nearest"
    retime_ramp_preset: RetimeRampPresetId = "constant"
    retime_ramp_points: list[RetimeSpeedPoint] = Field(default_factory=list)
    transition_out: ClipTransition | None = None
    transform: ClipTransformParams | None = None

    @field_validator("audio_gain_db", "fade_in_s", "fade_out_s", "speed_rate", mode="before")
    @classmethod
    def _validate_audio_float(cls, raw: Any, info: Any) -> float:
        return _check_finite_number(raw, str(info.field_name))

    @field_validator("retime_process", mode="before")
    @classmethod
    def _validate_clip_retime_process(cls, raw: Any) -> RetimeProcessMode:
        if raw is None or raw == "":
            return "nearest"
        cleaned = str(raw).strip().lower()
        if cleaned == "nearest":
            return "nearest"
        if cleaned == "frame_blend":
            return "frame_blend"
        if cleaned == "optical_flow":
            return "optical_flow"
        allowed = ", ".join(ALLOWED_RETIME_PROCESS_MODES)
        raise ValueError(f"Unsupported retime_process {raw!r}; expected one of: {allowed}")

    @field_validator("retime_ramp_preset", mode="before")
    @classmethod
    def _validate_clip_ramp_preset(cls, raw: Any) -> RetimeRampPresetId:
        if raw is None or raw == "":
            return "constant"
        cleaned = str(raw).strip().lower()
        if cleaned == "constant":
            return "constant"
        if cleaned == "hero_slowmo":
            return "hero_slowmo"
        if cleaned == "ramp_up":
            return "ramp_up"
        if cleaned == "ramp_down":
            return "ramp_down"
        if cleaned == "bullet_pulse":
            return "bullet_pulse"
        if cleaned == "custom":
            return "custom"
        allowed = ", ".join(ALLOWED_RETIME_RAMP_PRESETS)
        raise ValueError(f"Unsupported retime_ramp_preset {raw!r}; expected one of: {allowed}")

    @field_validator("retime_ramp_points", mode="after")
    @classmethod
    def _normalize_clip_ramp_points(cls, raw: list[RetimeSpeedPoint]) -> list[RetimeSpeedPoint]:
        return normalize_retime_ramp_points(raw)

    @property
    def end_frame_exclusive(self) -> int:
        return self.start_frame + self.duration_frames


TRACK_VOLUME_DB_MIN: float = -48.0
TRACK_VOLUME_DB_MAX: float = 12.0
TRACK_PAN_MIN: float = -1.0
TRACK_PAN_MAX: float = 1.0


class TimelineTrack(BaseModel):
    """A single video or audio track containing clips, mixer strip state, and markers."""

    index: int = Field(ge=1)
    kind: Literal["video", "audio"] = "video"
    name: str = ""
    muted: bool = False
    solo: bool = False
    rec_armed: bool = False
    volume_db: float = Field(default=0.0, ge=TRACK_VOLUME_DB_MIN, le=TRACK_VOLUME_DB_MAX)
    pan: float = Field(default=0.0, ge=TRACK_PAN_MIN, le=TRACK_PAN_MAX)
    clips: list[TimelineClip] = Field(default_factory=list)

    @field_validator("volume_db", "pan", mode="before")
    @classmethod
    def _validate_track_mixer_float(cls, raw: Any, info: Any) -> float:
        return _check_finite_number(raw, str(info.field_name))

    @field_validator("rec_armed", mode="before")
    @classmethod
    def _validate_rec_armed(cls, raw: Any) -> bool:
        if not isinstance(raw, bool):
            raise ValueError(f"rec_armed must be a boolean, got {raw!r}")
        return raw


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
    delivery_preset: str | None = None
    video_crf: int | None = None
    audio_bitrate_kbps: int | None = None
    encoder_preset: str | None = None
    target_lufs: float | None = None
    loudness_preset: LoudnessPresetId = "off"
    dialogue_eq: DialogueEqPresetId = "off"
    timecode_burnin: TimecodeBurnInPosition = "off"
    review_watermark_text: str = ""
    review_watermark_opacity: float = REVIEW_WATERMARK_OPACITY_DEFAULT
    lower_third_enabled: bool = False
    lower_third_title: str = ""
    lower_third_subtitle: str = ""
    lower_third_position: LowerThirdPosition = "bottom_left"
    retime_enabled: bool = False
    retime_speed: float = 1.0
    retime_reverse: bool = False
    retime_process: RetimeProcessMode = "nearest"
    retime_ramp_preset: RetimeRampPresetId = "constant"
    reframe_enabled: bool = False
    reframe_aspect_ratio: ReframeAspectRatio = "source"
    reframe_pan_x: float = 0.0
    reframe_pan_y: float = 0.0
    film_grain_enabled: bool = False
    film_grain_preset: FilmGrainPresetId = "35mm_fine"
    film_grain_strength: int = FILM_GRAIN_STRENGTH_DEFAULT
    film_grain_temporal: bool = True
    vignette_enabled: bool = False
    vignette_preset: VignettePresetId = "subtle_cinema"
    vignette_angle_deg: float = VIGNETTE_ANGLE_DEG_DEFAULT
    vignette_mode: VignetteMode = "forward"
    voice_cleanup_enabled: bool = False
    voice_cleanup_preset: VoiceCleanupPresetId = "youtube_voice"
    voice_cleanup_highpass_hz: int = VOICE_CLEANUP_HIGHPASS_HZ_DEFAULT
    voice_cleanup_presence_db: float = VOICE_CLEANUP_PRESENCE_DB_DEFAULT
    voice_cleanup_de_ess: float = VOICE_CLEANUP_DE_ESS_DEFAULT
    export_fps: ExportFpsOption = "source"
    deinterlace: bool = False
    audio_only_format: AudioOnlyFormatId = "off"
    target_width: int | None = None
    target_height: int | None = None
    framing_mode: str | None = None
    lut_path: str | None = None
    video_filter: str | None = None
    audio_filter: str | None = None
    argv: list[str]

    @field_validator("export_fps", mode="before")
    @classmethod
    def _validate_plan_export_fps(cls, raw: Any) -> ExportFpsOption:
        if not isinstance(raw, str):
            raise ValueError(f"export_fps must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned not in ALLOWED_EXPORT_FPS:
            allowed = ", ".join(ALLOWED_EXPORT_FPS)
            raise ValueError(f"Unsupported export_fps {raw!r}; expected one of: {allowed}")
        return cleaned

    @field_validator("deinterlace", mode="before")
    @classmethod
    def _validate_plan_deinterlace(cls, raw: Any) -> bool:
        if not isinstance(raw, bool):
            raise ValueError(f"deinterlace must be a boolean, got {raw!r}")
        return raw

    @field_validator("audio_only_format", mode="before")
    @classmethod
    def _validate_plan_audio_only_format(cls, raw: Any) -> AudioOnlyFormatId:
        if not isinstance(raw, str):
            raise ValueError(f"audio_only_format must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned not in ALLOWED_AUDIO_ONLY_FORMATS:
            allowed = ", ".join(ALLOWED_AUDIO_ONLY_FORMATS)
            raise ValueError(
                f"Unsupported audio_only_format {raw!r}; expected one of: {allowed}"
            )
        return cleaned


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
