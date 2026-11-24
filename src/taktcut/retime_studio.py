"""DaVinci Resolve Speed Editor, Premiere Time Remapping & Twixtor Retime Studio.

Provides strictly typed Pydantic v2 models, deterministic numerical speed-curve
integration, freeze-frame hold timing, and FFmpeg pipeline compilation for:
- Presets: hero_slowmo_drop, action_speed_whip, hyperlapse_400,
  freeze_frame_punch, reverse_boomerang, custom.
- Control points: (t_src_norm, speed_pct in [10..1200], easing: linear | bezier_smooth | step_hold).
- Direction: forward | reverse (+ boomerang ping-pong pass).
- Frame interpolation: nearest, frame_blend, optical_flow_minterpolate.
- Pitch-locked audio retiming via rubberband (pitch=1.0) or decomposed atempo stages.
- Speed motion blur via temporal shutter tmix accumulation.
- Freeze-frame hold via tpad=stop_mode=clone:stop_duration=...
- Exact output duration (output_duration_s) & ripple_shift_s by numerical integration of 1/speed(t).
- JSON export (taktcut.retime_studio.v1) & non-destructive TimelineClip attachment.
"""

from __future__ import annotations

import json
import math
import re
from collections.abc import Mapping, Sequence
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from taktcut.models import (
    ClipRetimeStudioPointRef,
    ClipRetimeStudioTrack,
    TimelineDocument,
)

RetimeStudioPresetId = Literal[
    "hero_slowmo_drop",
    "action_speed_whip",
    "hyperlapse_400",
    "freeze_frame_punch",
    "reverse_boomerang",
    "custom",
]

RetimeStudioEasing = Literal["linear", "bezier_smooth", "step_hold"]
RetimeStudioDirection = Literal["forward", "reverse"]
RetimeStudioInterpolation = Literal[
    "nearest",
    "frame_blend",
    "optical_flow_minterpolate",
]

RETIME_STUDIO_SPEED_PCT_MIN = 10.0
RETIME_STUDIO_SPEED_PCT_MAX = 1200.0
RETIME_STUDIO_MAX_POINTS = 16

ALLOWED_RETIME_STUDIO_PRESET_IDS: tuple[RetimeStudioPresetId, ...] = (
    "hero_slowmo_drop",
    "action_speed_whip",
    "hyperlapse_400",
    "freeze_frame_punch",
    "reverse_boomerang",
    "custom",
)

ALLOWED_RETIME_STUDIO_EASINGS: tuple[RetimeStudioEasing, ...] = (
    "linear",
    "bezier_smooth",
    "step_hold",
)

ALLOWED_RETIME_STUDIO_DIRECTIONS: tuple[RetimeStudioDirection, ...] = (
    "forward",
    "reverse",
)

ALLOWED_RETIME_STUDIO_INTERPOLATIONS: tuple[RetimeStudioInterpolation, ...] = (
    "nearest",
    "frame_blend",
    "optical_flow_minterpolate",
)

_SAFE_TITLE_RE = re.compile(r"[^A-Za-z0-9_-]+")


def _clamp(value: float, lo: float, hi: float) -> float:
    return min(hi, max(lo, value))


def _clamp01(value: float) -> float:
    return min(1.0, max(0.0, value))


def _smoothstep01(t: float) -> float:
    u = _clamp01(t)
    return u * u * (3.0 - 2.0 * u)


def _validate_bounded_float(raw: Any, field_name: str, lo: float, hi: float) -> float:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raise ValueError(f"{field_name} must be a finite number, got {raw!r}")
    val = float(raw)
    if not math.isfinite(val) or val < lo or val > hi:
        raise ValueError(f"{field_name} must be in [{lo}, {hi}], got {raw!r}")
    return val


def _validate_bool(raw: Any, field_name: str) -> bool:
    if not isinstance(raw, bool):
        raise ValueError(f"{field_name} must be a boolean, got {raw!r}")
    return raw


_EASING_MAP: dict[str, RetimeStudioEasing] = {e: e for e in ALLOWED_RETIME_STUDIO_EASINGS}
_DIRECTION_MAP: dict[str, RetimeStudioDirection] = {d: d for d in ALLOWED_RETIME_STUDIO_DIRECTIONS}
_INTERPOLATION_MAP: dict[str, RetimeStudioInterpolation] = {
    m: m for m in ALLOWED_RETIME_STUDIO_INTERPOLATIONS
}
_PRESET_ID_MAP: dict[str, RetimeStudioPresetId] = {
    p: p for p in ALLOWED_RETIME_STUDIO_PRESET_IDS
}


class RetimeStudioControlPoint(BaseModel):
    """Single speed-ramp control point along normalized source time [0, 1]."""

    model_config = ConfigDict(extra="ignore")

    t_src_norm: float = Field(ge=0.0, le=1.0)
    speed_pct: float = Field(
        default=100.0,
        ge=RETIME_STUDIO_SPEED_PCT_MIN,
        le=RETIME_STUDIO_SPEED_PCT_MAX,
    )
    easing: RetimeStudioEasing = "bezier_smooth"

    @field_validator("t_src_norm", mode="before")
    @classmethod
    def _val_t(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "t_src_norm", 0.0, 1.0), 4)

    @field_validator("speed_pct", mode="before")
    @classmethod
    def _val_speed_pct(cls, raw: Any) -> float:
        return round(
            _validate_bounded_float(
                raw,
                "speed_pct",
                RETIME_STUDIO_SPEED_PCT_MIN,
                RETIME_STUDIO_SPEED_PCT_MAX,
            ),
            2,
        )

    @field_validator("easing", mode="before")
    @classmethod
    def _val_easing(cls, raw: Any) -> RetimeStudioEasing:
        if not isinstance(raw, str):
            raise ValueError(f"easing must be a string, got {raw!r}")
        cleaned = _EASING_MAP.get(raw.strip().lower())
        if cleaned is None:
            allowed = ", ".join(ALLOWED_RETIME_STUDIO_EASINGS)
            raise ValueError(f"Unsupported easing {raw!r}; expected one of: {allowed}")
        return cleaned


def _default_control_points() -> list[RetimeStudioControlPoint]:
    return [
        RetimeStudioControlPoint(t_src_norm=0.0, speed_pct=100.0, easing="bezier_smooth"),
        RetimeStudioControlPoint(t_src_norm=0.25, speed_pct=25.0, easing="bezier_smooth"),
        RetimeStudioControlPoint(t_src_norm=0.72, speed_pct=25.0, easing="bezier_smooth"),
        RetimeStudioControlPoint(t_src_norm=1.0, speed_pct=100.0, easing="bezier_smooth"),
    ]


class RetimeStudioConfig(BaseModel):
    """Complete Retime, Optical-Flow Speed Ramp, Freeze-Frame & Audio Pitch configuration."""

    model_config = ConfigDict(extra="ignore")

    enabled: bool = True
    preset_id: RetimeStudioPresetId = "hero_slowmo_drop"
    direction: RetimeStudioDirection = "forward"
    boomerang: bool = False
    interpolation: RetimeStudioInterpolation = "optical_flow_minterpolate"
    pitch_preserve: bool = True
    motion_blur_amount: float = Field(default=0.35, ge=0.0, le=1.0)
    freeze_enabled: bool = False
    freeze_at_norm: float = Field(default=0.5, ge=0.0, le=1.0)
    freeze_duration_s: float = Field(default=1.2, ge=0.0, le=30.0)
    ripple_timeline: bool = True
    source_duration_s: float = Field(default=8.0, ge=0.25, le=3600.0)
    fps: float = Field(default=25.0, ge=1.0, le=120.0)
    playhead_norm: float = Field(default=0.5, ge=0.0, le=1.0)
    control_points: list[RetimeStudioControlPoint] = Field(default_factory=_default_control_points)

    @field_validator(
        "enabled",
        "boomerang",
        "pitch_preserve",
        "freeze_enabled",
        "ripple_timeline",
        mode="before",
    )
    @classmethod
    def _val_bools(cls, raw: Any, info: Any) -> bool:
        return _validate_bool(raw, str(info.field_name))

    @field_validator("preset_id", mode="before")
    @classmethod
    def _val_preset(cls, raw: Any) -> RetimeStudioPresetId:
        if not isinstance(raw, str):
            raise ValueError(f"preset_id must be a string, got {raw!r}")
        cleaned = _PRESET_ID_MAP.get(raw.strip().lower())
        if cleaned is None:
            allowed = ", ".join(ALLOWED_RETIME_STUDIO_PRESET_IDS)
            raise ValueError(
                f"Unsupported retime studio preset {raw!r}; expected one of: {allowed}"
            )
        return cleaned

    @field_validator("direction", mode="before")
    @classmethod
    def _val_direction(cls, raw: Any) -> RetimeStudioDirection:
        if not isinstance(raw, str):
            raise ValueError(f"direction must be a string, got {raw!r}")
        cleaned = _DIRECTION_MAP.get(raw.strip().lower())
        if cleaned is None:
            allowed = ", ".join(ALLOWED_RETIME_STUDIO_DIRECTIONS)
            raise ValueError(f"Unsupported direction {raw!r}; expected one of: {allowed}")
        return cleaned

    @field_validator("interpolation", mode="before")
    @classmethod
    def _val_interpolation(cls, raw: Any) -> RetimeStudioInterpolation:
        if not isinstance(raw, str):
            raise ValueError(f"interpolation must be a string, got {raw!r}")
        cleaned = _INTERPOLATION_MAP.get(raw.strip().lower())
        if cleaned is None:
            allowed = ", ".join(ALLOWED_RETIME_STUDIO_INTERPOLATIONS)
            raise ValueError(f"Unsupported interpolation {raw!r}; expected one of: {allowed}")
        return cleaned

    @field_validator("motion_blur_amount", "freeze_at_norm", "playhead_norm", mode="before")
    @classmethod
    def _val_unit_floats(cls, raw: Any, info: Any) -> float:
        return round(_validate_bounded_float(raw, str(info.field_name), 0.0, 1.0), 4)

    @field_validator("freeze_duration_s", mode="before")
    @classmethod
    def _val_freeze_dur(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "freeze_duration_s", 0.0, 30.0), 3)

    @field_validator("source_duration_s", mode="before")
    @classmethod
    def _val_src_dur(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "source_duration_s", 0.25, 3600.0), 4)

    @field_validator("fps", mode="before")
    @classmethod
    def _val_fps(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "fps", 1.0, 120.0), 3)

    @model_validator(mode="after")
    def _normalize_control_points(self) -> RetimeStudioConfig:
        pts = sorted(self.control_points, key=lambda p: p.t_src_norm)
        if not pts:
            pts = _default_control_points()
        deduped: list[RetimeStudioControlPoint] = []
        for pt in pts:
            if deduped and abs(pt.t_src_norm - deduped[-1].t_src_norm) < 1e-3:
                deduped[-1] = RetimeStudioControlPoint(
                    t_src_norm=deduped[-1].t_src_norm,
                    speed_pct=pt.speed_pct,
                    easing=pt.easing,
                )
            else:
                deduped.append(pt)
        if deduped[0].t_src_norm > 0.0:
            deduped.insert(
                0,
                RetimeStudioControlPoint(
                    t_src_norm=0.0,
                    speed_pct=deduped[0].speed_pct,
                    easing=deduped[0].easing,
                ),
            )
        if deduped[-1].t_src_norm < 1.0:
            deduped.append(
                RetimeStudioControlPoint(
                    t_src_norm=1.0,
                    speed_pct=deduped[-1].speed_pct,
                    easing=deduped[-1].easing,
                ),
            )
        if len(deduped) > RETIME_STUDIO_MAX_POINTS:
            deduped = [deduped[0], *deduped[1 : RETIME_STUDIO_MAX_POINTS - 1], deduped[-1]]
        self.control_points = deduped
        return self


class RetimeStudioPreset(BaseModel):
    """Curated DaVinci Resolve / Premiere Pro speed-ramp preset."""

    preset_id: RetimeStudioPresetId
    label: str
    category: str
    description: str
    default_config: RetimeStudioConfig


class RetimeStudioSample(BaseModel):
    """Evaluated speed-ramp sample mapping source normalized time to output time."""

    t_src_norm: float
    t_out_s: float
    speed_pct: float
    speed_multiplier: float
    is_freeze_zone: bool = False


class RetimeStudioEvaluateResult(BaseModel):
    """Numerical integration and curve telemetry for Retime Studio."""

    enabled: bool
    preset_id: RetimeStudioPresetId
    direction: RetimeStudioDirection
    boomerang: bool
    interpolation: RetimeStudioInterpolation
    pitch_preserve: bool
    source_duration_s: float
    output_duration_s: float
    ripple_shift_s: float
    output_frames: int
    fps: float
    avg_speed_pct: float
    min_speed_pct: float
    max_speed_pct: float
    freeze_enabled: bool
    freeze_at_norm: float
    freeze_duration_s: float
    freeze_out_start_s: float
    freeze_out_end_s: float
    motion_blur_amount: float
    peak_optical_flow_load: float
    playhead_speed_pct: float
    playhead_out_s: float
    samples: list[RetimeStudioSample]


class RetimeStudioCompileResult(BaseModel):
    """Compiled FFmpeg video and audio filtergraphs for Retime Studio."""

    enabled: bool
    preset_id: RetimeStudioPresetId
    direction: RetimeStudioDirection
    boomerang: bool
    interpolation: RetimeStudioInterpolation
    pitch_preserve: bool
    audio_pitch_filter: str
    has_freeze_hold: bool
    has_motion_blur: bool
    output_duration_s: float
    ripple_shift_s: float
    vf_chain: str
    af_chain: str
    filter_complex: str
    ffmpeg_command: str
    warnings: list[str] = Field(default_factory=list)


class RetimeStudioExportResult(BaseModel):
    """Exported JSON manifest (taktcut.retime_studio.v1)."""

    schema_version: str
    title: str
    preset_id: RetimeStudioPresetId
    compatible_hosts: list[str]
    json_text: str
    filename: str
    saved_path: str | None = None


RETIME_STUDIO_PRESETS: tuple[RetimeStudioPreset, ...] = (
    RetimeStudioPreset(
        preset_id="hero_slowmo_drop",
        label="Hero Slow-Mo Drop (100% -> 25% -> 100%)",
        category="Slow Motion",
        description=(
            "Optical-flow deceleration into a 25% hero action beat with pitch-locked audio."
        ),
        default_config=RetimeStudioConfig(
            enabled=True,
            preset_id="hero_slowmo_drop",
            direction="forward",
            boomerang=False,
            interpolation="optical_flow_minterpolate",
            pitch_preserve=True,
            motion_blur_amount=0.35,
            freeze_enabled=False,
            freeze_at_norm=0.5,
            freeze_duration_s=1.0,
            ripple_timeline=True,
            source_duration_s=8.0,
            fps=25.0,
            playhead_norm=0.48,
            control_points=[
                RetimeStudioControlPoint(t_src_norm=0.0, speed_pct=100.0, easing="bezier_smooth"),
                RetimeStudioControlPoint(t_src_norm=0.25, speed_pct=25.0, easing="bezier_smooth"),
                RetimeStudioControlPoint(t_src_norm=0.72, speed_pct=25.0, easing="bezier_smooth"),
                RetimeStudioControlPoint(t_src_norm=1.0, speed_pct=100.0, easing="bezier_smooth"),
            ],
        ),
    ),
    RetimeStudioPreset(
        preset_id="action_speed_whip",
        label="Action Speed Whip (100% -> 650% -> 40%)",
        category="Speed Whip",
        description="Aggressive 650% whip acceleration slamming into a 40% optical-flow impact.",
        default_config=RetimeStudioConfig(
            enabled=True,
            preset_id="action_speed_whip",
            direction="forward",
            boomerang=False,
            interpolation="optical_flow_minterpolate",
            pitch_preserve=True,
            motion_blur_amount=0.65,
            freeze_enabled=False,
            freeze_at_norm=0.6,
            freeze_duration_s=0.8,
            ripple_timeline=True,
            source_duration_s=8.0,
            fps=25.0,
            playhead_norm=0.35,
            control_points=[
                RetimeStudioControlPoint(t_src_norm=0.0, speed_pct=100.0, easing="bezier_smooth"),
                RetimeStudioControlPoint(t_src_norm=0.32, speed_pct=650.0, easing="bezier_smooth"),
                RetimeStudioControlPoint(t_src_norm=0.62, speed_pct=40.0, easing="bezier_smooth"),
                RetimeStudioControlPoint(t_src_norm=1.0, speed_pct=100.0, easing="bezier_smooth"),
            ],
        ),
    ),
    RetimeStudioPreset(
        preset_id="hyperlapse_400",
        label="Hyperlapse 400% Motion Blur",
        category="Hyperlapse",
        description="Sustained 400% to 480% timelapse drive with shutter motion blur accumulation.",
        default_config=RetimeStudioConfig(
            enabled=True,
            preset_id="hyperlapse_400",
            direction="forward",
            boomerang=False,
            interpolation="frame_blend",
            pitch_preserve=True,
            motion_blur_amount=0.75,
            freeze_enabled=False,
            freeze_at_norm=0.5,
            freeze_duration_s=0.5,
            ripple_timeline=True,
            source_duration_s=8.0,
            fps=25.0,
            playhead_norm=0.5,
            control_points=[
                RetimeStudioControlPoint(t_src_norm=0.0, speed_pct=400.0, easing="linear"),
                RetimeStudioControlPoint(t_src_norm=0.5, speed_pct=480.0, easing="bezier_smooth"),
                RetimeStudioControlPoint(t_src_norm=1.0, speed_pct=400.0, easing="linear"),
            ],
        ),
    ),
    RetimeStudioPreset(
        preset_id="freeze_frame_punch",
        label="Freeze-Frame Punch (Step Hold + 280%)",
        category="Freeze Frame",
        description="Fast 280% ramp into a 1.50s cloned freeze frame hold before snappy release.",
        default_config=RetimeStudioConfig(
            enabled=True,
            preset_id="freeze_frame_punch",
            direction="forward",
            boomerang=False,
            interpolation="optical_flow_minterpolate",
            pitch_preserve=True,
            motion_blur_amount=0.28,
            freeze_enabled=True,
            freeze_at_norm=0.48,
            freeze_duration_s=1.5,
            ripple_timeline=True,
            source_duration_s=8.0,
            fps=25.0,
            playhead_norm=0.48,
            control_points=[
                RetimeStudioControlPoint(t_src_norm=0.0, speed_pct=100.0, easing="bezier_smooth"),
                RetimeStudioControlPoint(t_src_norm=0.45, speed_pct=280.0, easing="step_hold"),
                RetimeStudioControlPoint(t_src_norm=0.55, speed_pct=100.0, easing="bezier_smooth"),
                RetimeStudioControlPoint(t_src_norm=1.0, speed_pct=100.0, easing="linear"),
            ],
        ),
    ),
    RetimeStudioPreset(
        preset_id="reverse_boomerang",
        label="Reverse Boomerang Ping-Pong",
        category="Reverse",
        description="Forward + reversed optical-flow boomerang loop with mirrored speed ramp.",
        default_config=RetimeStudioConfig(
            enabled=True,
            preset_id="reverse_boomerang",
            direction="reverse",
            boomerang=True,
            interpolation="optical_flow_minterpolate",
            pitch_preserve=True,
            motion_blur_amount=0.40,
            freeze_enabled=False,
            freeze_at_norm=0.5,
            freeze_duration_s=0.6,
            ripple_timeline=True,
            source_duration_s=8.0,
            fps=25.0,
            playhead_norm=0.5,
            control_points=[
                RetimeStudioControlPoint(t_src_norm=0.0, speed_pct=100.0, easing="bezier_smooth"),
                RetimeStudioControlPoint(t_src_norm=0.5, speed_pct=220.0, easing="bezier_smooth"),
                RetimeStudioControlPoint(t_src_norm=1.0, speed_pct=100.0, easing="bezier_smooth"),
            ],
        ),
    ),
    RetimeStudioPreset(
        preset_id="custom",
        label="Custom Speed-Ramp Curve",
        category="Custom",
        description="Clean 100% baseline curve ready for custom Resolve-style speed points.",
        default_config=RetimeStudioConfig(
            enabled=True,
            preset_id="custom",
            direction="forward",
            boomerang=False,
            interpolation="optical_flow_minterpolate",
            pitch_preserve=True,
            motion_blur_amount=0.0,
            freeze_enabled=False,
            freeze_at_norm=0.5,
            freeze_duration_s=1.0,
            ripple_timeline=True,
            source_duration_s=8.0,
            fps=25.0,
            playhead_norm=0.5,
            control_points=[
                RetimeStudioControlPoint(t_src_norm=0.0, speed_pct=100.0, easing="bezier_smooth"),
                RetimeStudioControlPoint(t_src_norm=0.5, speed_pct=100.0, easing="bezier_smooth"),
                RetimeStudioControlPoint(t_src_norm=1.0, speed_pct=100.0, easing="bezier_smooth"),
            ],
        ),
    ),
)

_PRESET_MAP: dict[RetimeStudioPresetId, RetimeStudioPreset] = {
    p.preset_id: p for p in RETIME_STUDIO_PRESETS
}


def list_retime_studio_presets() -> list[RetimeStudioPreset]:
    """Return all built-in Retime Studio presets in deterministic display order."""
    return list(RETIME_STUDIO_PRESETS)


def get_retime_studio_preset(preset_id: str) -> RetimeStudioPreset:
    """Lookup a Retime Studio preset by canonical identifier."""
    if not isinstance(preset_id, str):
        raise ValueError(f"preset_id must be a string, got {preset_id!r}")
    canon = _PRESET_ID_MAP.get(preset_id.strip().lower())
    if canon is None:
        allowed = ", ".join(ALLOWED_RETIME_STUDIO_PRESET_IDS)
        raise ValueError(
            f"Unsupported retime studio preset {preset_id!r}; expected one of: {allowed}"
        )
    return _PRESET_MAP[canon]


def normalize_retime_studio_config(
    raw: RetimeStudioConfig | Mapping[str, Any] | None = None,
) -> RetimeStudioConfig:
    """Normalize dict or partial config onto preset defaults and strict bounds."""
    if isinstance(raw, RetimeStudioConfig):
        return raw.model_copy(deep=True)
    if raw is None:
        return _PRESET_MAP["hero_slowmo_drop"].default_config.model_copy(deep=True)
    if not isinstance(raw, Mapping):
        raise ValueError(f"Retime Studio config must be a JSON object, got {raw!r}")

    preset_val = raw.get("preset_id", "hero_slowmo_drop")
    preset = get_retime_studio_preset(str(preset_val))
    merged = preset.default_config.model_dump()
    for key, val in raw.items():
        if val is not None and key in merged:
            merged[key] = val
    return RetimeStudioConfig.model_validate(merged)


def evaluate_retime_studio_speed_at(
    control_points: Sequence[RetimeStudioControlPoint],
    t_src_norm: float,
) -> float:
    """Evaluate speed percentage [10..1200] at normalized source time t_src_norm in [0, 1]."""
    pts = sorted(control_points, key=lambda p: p.t_src_norm)
    if not pts:
        return 100.0
    t = _clamp01(float(t_src_norm))
    if t <= pts[0].t_src_norm:
        return float(pts[0].speed_pct)
    if t >= pts[-1].t_src_norm:
        return float(pts[-1].speed_pct)

    for idx in range(len(pts) - 1):
        p0 = pts[idx]
        p1 = pts[idx + 1]
        if t <= p1.t_src_norm + 1e-9:
            span = max(1e-6, p1.t_src_norm - p0.t_src_norm)
            local = _clamp01((t - p0.t_src_norm) / span)
            if p0.easing == "step_hold":
                return float(p1.speed_pct if local >= 0.9999 else p0.speed_pct)
            if p0.easing == "linear":
                return float(p0.speed_pct + (p1.speed_pct - p0.speed_pct) * local)
            s = _smoothstep01(local)
            return float(p0.speed_pct + (p1.speed_pct - p0.speed_pct) * s)
    return float(pts[-1].speed_pct)


def _integrate_output_time(
    control_points: Sequence[RetimeStudioControlPoint],
    source_duration_s: float,
    t_end_norm: float,
    *,
    steps: int = 320,
) -> float:
    t_end = _clamp01(t_end_norm)
    if t_end <= 0.0:
        return 0.0
    n = max(16, steps)
    du = t_end / float(n)
    acc = 0.0
    prev_inv = 100.0 / max(
        RETIME_STUDIO_SPEED_PCT_MIN,
        evaluate_retime_studio_speed_at(control_points, 0.0),
    )
    for step in range(1, n + 1):
        u = (float(step) / float(n)) * t_end
        spd = max(RETIME_STUDIO_SPEED_PCT_MIN, evaluate_retime_studio_speed_at(control_points, u))
        cur_inv = 100.0 / spd
        acc += 0.5 * (prev_inv + cur_inv) * du
        prev_inv = cur_inv
    return acc * source_duration_s


def evaluate_retime_studio_curve(
    config: RetimeStudioConfig,
    *,
    sample_count: int = 65,
) -> RetimeStudioEvaluateResult:
    """Numerically integrate 1/speed(t) and compute output duration, ripple shift, and samples."""
    count = max(9, min(257, int(sample_count)))
    src_dur = float(config.source_duration_s)

    if not config.enabled:
        samples = [
            RetimeStudioSample(
                t_src_norm=round(i / float(count - 1), 4),
                t_out_s=round((i / float(count - 1)) * src_dur, 4),
                speed_pct=100.0,
                speed_multiplier=1.0,
                is_freeze_zone=False,
            )
            for i in range(count)
        ]
        return RetimeStudioEvaluateResult(
            enabled=False,
            preset_id=config.preset_id,
            direction=config.direction,
            boomerang=config.boomerang,
            interpolation=config.interpolation,
            pitch_preserve=config.pitch_preserve,
            source_duration_s=round(src_dur, 4),
            output_duration_s=round(src_dur, 4),
            ripple_shift_s=0.0,
            output_frames=max(1, int(round(src_dur * config.fps))),
            fps=config.fps,
            avg_speed_pct=100.0,
            min_speed_pct=100.0,
            max_speed_pct=100.0,
            freeze_enabled=False,
            freeze_at_norm=config.freeze_at_norm,
            freeze_duration_s=0.0,
            freeze_out_start_s=0.0,
            freeze_out_end_s=0.0,
            motion_blur_amount=0.0,
            peak_optical_flow_load=0.0,
            playhead_speed_pct=100.0,
            playhead_out_s=round(config.playhead_norm * src_dur, 4),
            samples=samples,
        )

    base_out_s = _integrate_output_time(config.control_points, src_dur, 1.0, steps=400)
    pass_factor = 2.0 if config.boomerang else 1.0
    warp_out_s = base_out_s * pass_factor
    freeze_hold_s = float(config.freeze_duration_s) if config.freeze_enabled else 0.0
    freeze_out_start = (
        _integrate_output_time(config.control_points, src_dur, config.freeze_at_norm, steps=240)
        if config.freeze_enabled
        else 0.0
    )
    freeze_out_end = freeze_out_start + freeze_hold_s
    total_out_s = max(0.05, warp_out_s + freeze_hold_s)
    ripple_shift_s = total_out_s - src_dur

    samples = []
    min_spd = RETIME_STUDIO_SPEED_PCT_MAX
    max_spd = RETIME_STUDIO_SPEED_PCT_MIN
    cum_out_s = 0.0
    prev_u = 0.0
    prev_inv = 100.0 / max(
        RETIME_STUDIO_SPEED_PCT_MIN,
        evaluate_retime_studio_speed_at(config.control_points, 0.0),
    )

    for idx in range(count):
        u = float(idx) / float(count - 1)
        spd = evaluate_retime_studio_speed_at(config.control_points, u)
        min_spd = min(min_spd, spd)
        max_spd = max(max_spd, spd)
        cur_inv = 100.0 / max(RETIME_STUDIO_SPEED_PCT_MIN, spd)
        if idx > 0:
            du = u - prev_u
            cum_out_s += 0.5 * (prev_inv + cur_inv) * du * src_dur
        prev_u = u
        prev_inv = cur_inv
        t_out_shifted = cum_out_s + (
            freeze_hold_s if (config.freeze_enabled and u > config.freeze_at_norm) else 0.0
        )
        is_freeze = bool(
            config.freeze_enabled and abs(u - config.freeze_at_norm) <= (0.5 / float(count - 1))
        )
        samples.append(
            RetimeStudioSample(
                t_src_norm=round(u, 4),
                t_out_s=round(t_out_shifted, 4),
                speed_pct=round(spd, 2),
                speed_multiplier=round(spd / 100.0, 4),
                is_freeze_zone=is_freeze,
            )
        )

    avg_speed_pct = _clamp(
        (src_dur / max(1e-5, base_out_s)) * 100.0,
        RETIME_STUDIO_SPEED_PCT_MIN,
        RETIME_STUDIO_SPEED_PCT_MAX,
    )
    playhead_spd = evaluate_retime_studio_speed_at(config.control_points, config.playhead_norm)
    playhead_out = _integrate_output_time(
        config.control_points, src_dur, config.playhead_norm, steps=200
    )
    if config.freeze_enabled and config.playhead_norm > config.freeze_at_norm:
        playhead_out += freeze_hold_s

    flow_weight = (
        1.0
        if config.interpolation == "optical_flow_minterpolate"
        else (0.45 if config.interpolation == "frame_blend" else 0.1)
    )
    slowmo_stress = max(0.0, (100.0 - min_spd) / 90.0)
    whip_stress = max(0.0, (max_spd - 100.0) / 1100.0)
    peak_flow_load = round(
        _clamp01(flow_weight * (0.35 + 0.45 * slowmo_stress + 0.25 * whip_stress)) * 100.0,
        1,
    )

    return RetimeStudioEvaluateResult(
        enabled=True,
        preset_id=config.preset_id,
        direction=config.direction,
        boomerang=config.boomerang,
        interpolation=config.interpolation,
        pitch_preserve=config.pitch_preserve,
        source_duration_s=round(src_dur, 4),
        output_duration_s=round(total_out_s, 4),
        ripple_shift_s=round(ripple_shift_s, 4),
        output_frames=max(1, int(round(total_out_s * config.fps))),
        fps=config.fps,
        avg_speed_pct=round(avg_speed_pct, 2),
        min_speed_pct=round(min_spd, 2),
        max_speed_pct=round(max_spd, 2),
        freeze_enabled=config.freeze_enabled,
        freeze_at_norm=config.freeze_at_norm,
        freeze_duration_s=round(freeze_hold_s, 3),
        freeze_out_start_s=round(freeze_out_start, 4),
        freeze_out_end_s=round(freeze_out_end, 4),
        motion_blur_amount=config.motion_blur_amount,
        peak_optical_flow_load=peak_flow_load,
        playhead_speed_pct=round(playhead_spd, 2),
        playhead_out_s=round(playhead_out, 4),
        samples=samples,
    )


def build_retime_studio_atempo_stages(speed_multiplier: float) -> list[float]:
    """Decompose speed_multiplier in [0.10, 12.0] into safe FFmpeg atempo stages in [0.5, 2.0]."""
    rate = _clamp(
        float(speed_multiplier),
        RETIME_STUDIO_SPEED_PCT_MIN / 100.0,
        RETIME_STUDIO_SPEED_PCT_MAX / 100.0,
    )
    if math.isclose(rate, 1.0, abs_tol=1e-4):
        return []
    stages: list[float] = []
    rem = rate
    if rem < 1.0:
        while rem < 0.5 - 1e-9:
            stages.append(0.5)
            rem /= 0.5
        if not math.isclose(rem, 1.0, abs_tol=1e-4):
            stages.append(round(rem, 4))
    else:
        while rem > 2.0 + 1e-9:
            stages.append(2.0)
            rem /= 2.0
        if not math.isclose(rem, 1.0, abs_tol=1e-4):
            stages.append(round(rem, 4))
    return stages


def _compile_setpts_piecewise(config: RetimeStudioConfig) -> str:
    dur = float(config.source_duration_s)
    knots = list(config.control_points)
    if len(knots) < 2:
        mult = max(0.1, (knots[0].speed_pct if knots else 100.0) / 100.0)
        return f"setpts=PTS/{mult:.4f}"

    segments: list[tuple[float, float, float, float]] = []
    cum_out_s = 0.0
    for idx in range(len(knots) - 1):
        p0 = knots[idx]
        p1 = knots[idx + 1]
        if p1.t_src_norm - p0.t_src_norm <= 1e-4:
            continue
        t0 = p0.t_src_norm * dur
        t1 = p1.t_src_norm * dur
        avg_seg_pct = (
            p0.speed_pct if p0.easing == "step_hold" else 0.5 * (p0.speed_pct + p1.speed_pct)
        )
        seg_mult = _clamp(
            avg_seg_pct / 100.0,
            RETIME_STUDIO_SPEED_PCT_MIN / 100.0,
            RETIME_STUDIO_SPEED_PCT_MAX / 100.0,
        )
        segments.append((t0, t1, seg_mult, cum_out_s))
        cum_out_s += (t1 - t0) / seg_mult

    if not segments:
        mult = max(0.1, knots[0].speed_pct / 100.0)
        return f"setpts=PTS/{mult:.4f}"

    last_t0, _, last_mult, last_off = segments[-1]
    if last_t0 <= 1e-6:
        expr = f"PTS/{last_mult:.4f}"
    else:
        expr = f"{last_off:.6f}/TB+(PTS-{last_t0:.4f}/TB)/{last_mult:.4f}"
    for t0, t1, seg_mult, off_s in reversed(segments[:-1]):
        if t0 <= 1e-6:
            branch = f"PTS/{seg_mult:.4f}"
        else:
            branch = f"{off_s:.6f}/TB+(PTS-{t0:.4f}/TB)/{seg_mult:.4f}"
        expr = f"if(lt(T,{t1:.4f}),{branch},{expr})"
    return f"setpts='{expr}'"


def compile_retime_studio_filtergraph(config: RetimeStudioConfig) -> RetimeStudioCompileResult:
    """Compile validated Retime Studio curve, optical flow, freeze-frame, and audio pitch graph."""
    eval_res = evaluate_retime_studio_curve(config, sample_count=33)
    if not config.enabled:
        return RetimeStudioCompileResult(
            enabled=False,
            preset_id=config.preset_id,
            direction=config.direction,
            boomerang=config.boomerang,
            interpolation=config.interpolation,
            pitch_preserve=config.pitch_preserve,
            audio_pitch_filter="anull",
            has_freeze_hold=False,
            has_motion_blur=False,
            output_duration_s=eval_res.output_duration_s,
            ripple_shift_s=0.0,
            vf_chain="null",
            af_chain="anull",
            filter_complex="[0:v]null[vout];[0:a]anull[aout]",
            ffmpeg_command=(
                'ffmpeg -i input.mp4 -filter_complex "[0:v]null[vout];[0:a]anull[aout]" '
                '-map "[vout]" -map "[aout]" output.mp4'
            ),
            warnings=[],
        )

    warnings: list[str] = []
    vf_parts: list[str] = [_compile_setpts_piecewise(config)]
    fps_str = f"{config.fps:g}"

    if config.interpolation == "optical_flow_minterpolate":
        vf_parts.append(
            f"minterpolate=fps={fps_str}:mi_mode=mci:mc_mode=aobmc:me_mode=bilat:vsbmc=1"
        )
    elif config.interpolation == "frame_blend":
        vf_parts.append(f"minterpolate=fps={fps_str}:mi_mode=blend")

    has_mblur = config.motion_blur_amount > 0.01
    if has_mblur:
        taps = max(2, min(8, 2 + int(round(config.motion_blur_amount * 6.0))))
        weights = " ".join("1" for _ in range(taps))
        vf_parts.append(f"tmix=frames={taps}:weights='{weights}'")

    has_freeze = config.freeze_enabled and config.freeze_duration_s > 0.01
    if has_freeze:
        vf_parts.append(f"tpad=stop_mode=clone:stop_duration={config.freeze_duration_s:.3f}")

    if config.direction == "reverse" and not config.boomerang:
        vf_parts.append("reverse")
        warnings.append("Video reverse buffers frames in RAM; keep clips concise for 4K sources.")

    vf_base = ",".join(vf_parts)
    if config.boomerang:
        vf_chain = (
            "split[rt_fwd][rt_rev_src];[rt_rev_src]reverse[rt_rev];"
            "[rt_fwd][rt_rev]concat=n=2:v=1:a=0"
        )
        video_graph = f"[0:v]{vf_base},{vf_chain}[vout]"
    else:
        vf_chain = vf_base
        video_graph = f"[0:v]{vf_chain}[vout]"

    avg_mult = _clamp(
        eval_res.avg_speed_pct / 100.0,
        RETIME_STUDIO_SPEED_PCT_MIN / 100.0,
        RETIME_STUDIO_SPEED_PCT_MAX / 100.0,
    )
    af_parts: list[str] = []
    if config.pitch_preserve:
        audio_pitch_filter = f"rubberband=tempo={avg_mult:.4f}:pitch=1.0"
        if not math.isclose(avg_mult, 1.0, abs_tol=1e-4):
            af_parts.append(audio_pitch_filter)
    else:
        stages = build_retime_studio_atempo_stages(avg_mult)
        if stages:
            atempo_chain = ",".join(f"atempo={s:.4f}" for s in stages)
            audio_pitch_filter = atempo_chain
            af_parts.append(atempo_chain)
        else:
            audio_pitch_filter = "anull"

    if has_freeze:
        af_parts.append(f"apad=pad_dur={config.freeze_duration_s:.3f}")
    if config.direction == "reverse" and not config.boomerang:
        af_parts.append("areverse")

    af_base = ",".join(af_parts) if af_parts else "anull"
    if config.boomerang:
        af_chain = (
            "asplit[rt_afwd][rt_arev_src];[rt_arev_src]areverse[rt_arev];"
            "[rt_afwd][rt_arev]concat=n=2:v=0:a=1"
        )
        audio_graph = f"[0:a]{af_base},{af_chain}[aout]"
    else:
        af_chain = af_base
        audio_graph = f"[0:a]{af_chain}[aout]"

    filter_complex = f"{video_graph};{audio_graph}"
    ffmpeg_cmd = (
        f'ffmpeg -i input.mp4 -filter_complex "{filter_complex}" '
        f'-map "[vout]" -map "[aout]" output.mp4'
    )
    return RetimeStudioCompileResult(
        enabled=True,
        preset_id=config.preset_id,
        direction=config.direction,
        boomerang=config.boomerang,
        interpolation=config.interpolation,
        pitch_preserve=config.pitch_preserve,
        audio_pitch_filter=audio_pitch_filter,
        has_freeze_hold=has_freeze,
        has_motion_blur=has_mblur,
        output_duration_s=eval_res.output_duration_s,
        ripple_shift_s=eval_res.ripple_shift_s,
        vf_chain=vf_chain,
        af_chain=af_chain,
        filter_complex=filter_complex,
        ffmpeg_command=ffmpeg_cmd,
        warnings=warnings,
    )


def export_retime_studio_json(
    config: RetimeStudioConfig,
    *,
    title: str = "TAKTCUT_RETIME_STUDIO",
) -> RetimeStudioExportResult:
    """Export Retime Studio speed-ramp curve, freeze hold, and FFmpeg graph as JSON."""
    cleaned_title = _SAFE_TITLE_RE.sub(
        "_", str(title or "TAKTCUT_RETIME_STUDIO").strip()
    ).strip("_")
    if not cleaned_title:
        cleaned_title = "TAKTCUT_RETIME_STUDIO"

    eval_res = evaluate_retime_studio_curve(config, sample_count=33)
    compiled = compile_retime_studio_filtergraph(config)
    hosts = [
        "DaVinci Resolve Speed Editor",
        "Adobe Premiere Pro Time Remapping",
        "FFmpeg Minterpolate / Rubberband",
    ]
    payload = {
        "schema_version": "taktcut.retime_studio.v1",
        "title": cleaned_title,
        "preset_id": config.preset_id,
        "compatible_hosts": hosts,
        "retime": {
            "enabled": config.enabled,
            "direction": config.direction,
            "boomerang": config.boomerang,
            "interpolation": config.interpolation,
            "pitch_preserve": config.pitch_preserve,
            "motion_blur_amount": config.motion_blur_amount,
            "freeze_enabled": config.freeze_enabled,
            "freeze_at_norm": config.freeze_at_norm,
            "freeze_duration_s": config.freeze_duration_s,
            "ripple_timeline": config.ripple_timeline,
            "source_duration_s": eval_res.source_duration_s,
            "output_duration_s": eval_res.output_duration_s,
            "ripple_shift_s": eval_res.ripple_shift_s,
            "output_frames": eval_res.output_frames,
            "avg_speed_pct": eval_res.avg_speed_pct,
            "fps": config.fps,
        },
        "control_points": [
            {
                "t_src_norm": pt.t_src_norm,
                "speed_pct": pt.speed_pct,
                "easing": pt.easing,
            }
            for pt in config.control_points
        ],
        "ffmpeg": {
            "vf_chain": compiled.vf_chain,
            "af_chain": compiled.af_chain,
            "filter_complex": compiled.filter_complex,
        },
    }
    json_text = json.dumps(payload, indent=2)
    filename = f"{cleaned_title.lower()}_{config.preset_id}_retime_studio.json"
    return RetimeStudioExportResult(
        schema_version="taktcut.retime_studio.v1",
        title=cleaned_title,
        preset_id=config.preset_id,
        compatible_hosts=hosts,
        json_text=json_text,
        filename=filename,
    )


def apply_retime_studio_to_document(
    document: TimelineDocument,
    config: RetimeStudioConfig,
    *,
    track_index: int = 1,
    clip_index: int = 0,
) -> TimelineDocument:
    """Attach ClipRetimeStudioTrack onto target video clip and optionally ripple duration."""
    next_doc = document.model_copy(deep=True)
    video_tracks = [t for t in next_doc.tracks if t.kind == "video"]
    target_track = next((t for t in video_tracks if t.index == track_index), None)
    if target_track is None and video_tracks:
        target_track = video_tracks[0]
    if target_track is None or not target_track.clips:
        raise ValueError("No video clip available in timeline document.")

    clamped_idx = max(0, min(len(target_track.clips) - 1, clip_index))
    target_clip = target_track.clips[clamped_idx]
    doc_fps = float(next_doc.fps.as_float) if next_doc.fps.as_float > 0 else config.fps
    clip_src_dur_s = max(0.25, float(target_clip.duration_frames) / max(1.0, doc_fps))
    scoped_cfg = config.model_copy(
        update={
            "source_duration_s": round(clip_src_dur_s, 4),
            "fps": round(doc_fps, 3),
        }
    )
    eval_res = evaluate_retime_studio_curve(scoped_cfg, sample_count=33)
    compiled = compile_retime_studio_filtergraph(scoped_cfg)

    target_clip.retime_studio = ClipRetimeStudioTrack(
        enabled=scoped_cfg.enabled,
        preset_id=scoped_cfg.preset_id,
        direction=scoped_cfg.direction,
        boomerang=scoped_cfg.boomerang,
        interpolation=scoped_cfg.interpolation,
        pitch_preserve=scoped_cfg.pitch_preserve,
        motion_blur_amount=scoped_cfg.motion_blur_amount,
        freeze_enabled=scoped_cfg.freeze_enabled,
        freeze_at_norm=scoped_cfg.freeze_at_norm,
        freeze_duration_s=scoped_cfg.freeze_duration_s,
        ripple_timeline=scoped_cfg.ripple_timeline,
        source_duration_s=eval_res.source_duration_s,
        output_duration_s=eval_res.output_duration_s,
        ripple_shift_s=eval_res.ripple_shift_s,
        avg_speed_pct=eval_res.avg_speed_pct,
        fps=scoped_cfg.fps,
        ffmpeg_vf=compiled.vf_chain[:16384],
        ffmpeg_af=compiled.af_chain[:8192],
        control_points=[
            ClipRetimeStudioPointRef(
                t_src_norm=pt.t_src_norm,
                speed_pct=pt.speed_pct,
                easing=pt.easing,
            )
            for pt in scoped_cfg.control_points
        ],
    )

    target_clip.reverse = bool(scoped_cfg.enabled and scoped_cfg.direction == "reverse")
    target_clip.retime_process = (
        "optical_flow"
        if scoped_cfg.interpolation == "optical_flow_minterpolate"
        else ("frame_blend" if scoped_cfg.interpolation == "frame_blend" else "nearest")
    )
    target_clip.speed_rate = round(_clamp(eval_res.avg_speed_pct / 100.0, 0.25, 4.0), 3)

    if scoped_cfg.enabled and scoped_cfg.ripple_timeline and target_clip.duration_frames > 0:
        old_dur_frames = target_clip.duration_frames
        old_end_frame = target_clip.start_frame + old_dur_frames
        new_dur_frames = max(1, int(round(eval_res.output_duration_s * doc_fps)))
        delta_frames = new_dur_frames - old_dur_frames
        if delta_frames != 0:
            target_clip.duration_frames = new_dur_frames
            for clip in target_track.clips:
                if clip is not target_clip and clip.start_frame >= old_end_frame:
                    clip.start_frame = max(0, clip.start_frame + delta_frames)
            if target_clip.link_group_id:
                for track in next_doc.tracks:
                    if track is target_track:
                        continue
                    linked = next(
                        (c for c in track.clips if c.link_group_id == target_clip.link_group_id),
                        None,
                    )
                    if linked is not None:
                        linked_old_end = linked.start_frame + linked.duration_frames
                        linked.duration_frames = new_dur_frames
                        for c in track.clips:
                            if c is not linked and c.start_frame >= linked_old_end:
                                c.start_frame = max(0, c.start_frame + delta_frames)

    return next_doc
