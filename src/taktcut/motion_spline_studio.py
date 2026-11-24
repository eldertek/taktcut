"""AE / Resolve Fusion Keyframe Spline, Speed Graph & Optical Motion Blur Studio."""

from __future__ import annotations

import json
import math
import re
from collections.abc import Mapping, Sequence
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from taktcut.models import (
    ClipMotionSplineKeyframeRef,
    ClipMotionSplineTrack,
    TimelineDocument,
)

MotionSplinePresetId = Literal[
    "whip_zoom_punch",
    "smooth_dolly_push",
    "hero_title_overshoot",
    "cinematic_pan_hold",
    "custom",
]
MotionSplineChannelId = Literal[
    "scale_pct",
    "position_x_px",
    "position_y_px",
    "rotation_deg",
    "opacity_pct",
]
MotionSplineHandleMode = Literal["linear", "easy_ease", "bezier", "hold", "overshoot"]
MotionSplineGraphMode = Literal["value", "speed"]

ALLOWED_MOTION_SPLINE_PRESET_IDS: tuple[MotionSplinePresetId, ...] = (
    "whip_zoom_punch",
    "smooth_dolly_push",
    "hero_title_overshoot",
    "cinematic_pan_hold",
    "custom",
)
ALLOWED_MOTION_SPLINE_CHANNELS: tuple[MotionSplineChannelId, ...] = (
    "scale_pct",
    "position_x_px",
    "position_y_px",
    "rotation_deg",
    "opacity_pct",
)
ALLOWED_MOTION_SPLINE_HANDLE_MODES: tuple[MotionSplineHandleMode, ...] = (
    "linear",
    "easy_ease",
    "bezier",
    "hold",
    "overshoot",
)

_SAFE_TITLE_RE = re.compile(r"[^A-Za-z0-9_-]+")


class MotionSplineChannelSpec(BaseModel):
    """Metadata and numeric bounds for a single transform animation channel."""

    model_config = ConfigDict(extra="forbid")

    channel: MotionSplineChannelId
    label: str
    unit: str
    default_value: float
    min_value: float
    max_value: float
    color_hex: str


MOTION_SPLINE_CHANNEL_SPECS: tuple[MotionSplineChannelSpec, ...] = (
    MotionSplineChannelSpec(
        channel="scale_pct",
        label="Scale (%)",
        unit="%",
        default_value=100.0,
        min_value=10.0,
        max_value=400.0,
        color_hex="#38bdf8",
    ),
    MotionSplineChannelSpec(
        channel="position_x_px",
        label="Position X (px)",
        unit="px",
        default_value=0.0,
        min_value=-1920.0,
        max_value=1920.0,
        color_hex="#f87171",
    ),
    MotionSplineChannelSpec(
        channel="position_y_px",
        label="Position Y (px)",
        unit="px",
        default_value=0.0,
        min_value=-1080.0,
        max_value=1080.0,
        color_hex="#4ade80",
    ),
    MotionSplineChannelSpec(
        channel="rotation_deg",
        label="Rotation (deg)",
        unit="deg",
        default_value=0.0,
        min_value=-360.0,
        max_value=360.0,
        color_hex="#f59e0b",
    ),
    MotionSplineChannelSpec(
        channel="opacity_pct",
        label="Opacity (%)",
        unit="%",
        default_value=100.0,
        min_value=0.0,
        max_value=100.0,
        color_hex="#c084fc",
    ),
)

_CHANNEL_SPEC_MAP: dict[MotionSplineChannelId, MotionSplineChannelSpec] = {
    spec.channel: spec for spec in MOTION_SPLINE_CHANNEL_SPECS
}


def _clamp(value: float, lo: float, hi: float) -> float:
    if value < lo:
        return lo
    if value > hi:
        return hi
    return value


def _check_finite(raw: float, name: str) -> float:
    if not math.isfinite(raw):
        raise ValueError(f"{name} must be finite, got {raw!r}")
    return float(raw)


class MotionSplineKeyframe(BaseModel):
    """Single keyframe node with incoming/outgoing cubic Bezier tangent handles."""

    model_config = ConfigDict(extra="forbid")

    time_s: float = Field(ge=0.0, le=3600.0)
    value: float = Field(ge=-10000.0, le=10000.0)
    mode: MotionSplineHandleMode = "easy_ease"
    in_handle_x: float = Field(default=0.67, ge=0.01, le=0.99)
    in_handle_y: float = Field(default=1.0, ge=-1.5, le=2.5)
    out_handle_x: float = Field(default=0.33, ge=0.01, le=0.99)
    out_handle_y: float = Field(default=0.0, ge=-1.5, le=2.5)

    @field_validator(
        "time_s",
        "value",
        "in_handle_x",
        "in_handle_y",
        "out_handle_x",
        "out_handle_y",
        mode="after",
    )
    @classmethod
    def _validate_finite(cls, value: float, info: Any) -> float:
        return _check_finite(value, str(info.field_name))


class MotionSplineChannelTrack(BaseModel):
    """Sorted keyframe track for a single transform parameter channel."""

    model_config = ConfigDict(extra="forbid")

    channel: MotionSplineChannelId
    enabled: bool = True
    keyframes: list[MotionSplineKeyframe] = Field(min_length=1, max_length=128)

    @model_validator(mode="after")
    def _normalize_keyframes(self) -> MotionSplineChannelTrack:
        spec = _CHANNEL_SPEC_MAP[self.channel]
        sorted_kfs = sorted(self.keyframes, key=lambda kf: kf.time_s)
        deduped: list[MotionSplineKeyframe] = []
        for kf in sorted_kfs:
            clamped_val = round(_clamp(kf.value, spec.min_value, spec.max_value), 4)
            updated = kf.model_copy(
                update={
                    "time_s": round(kf.time_s, 4),
                    "value": clamped_val,
                }
            )
            if deduped and abs(updated.time_s - deduped[-1].time_s) < 1e-4:
                deduped[-1] = updated
            else:
                deduped.append(updated)
        self.keyframes = deduped
        return self


class MotionBlurConfig(BaseModel):
    """After Effects / Cinema Optical Motion Blur shutter parameters."""

    model_config = ConfigDict(extra="forbid")

    enabled: bool = True
    shutter_angle_deg: float = Field(default=180.0, ge=0.0, le=360.0)
    shutter_phase_deg: float = Field(default=-90.0, ge=-360.0, le=360.0)
    samples: int = Field(default=16, ge=4, le=32)


def _default_channels_for_preset(
    preset_id: MotionSplinePresetId,
    duration_s: float = 4.0,
) -> dict[MotionSplineChannelId, MotionSplineChannelTrack]:
    d = max(0.5, float(duration_s))
    if preset_id == "whip_zoom_punch":
        return {
            "scale_pct": MotionSplineChannelTrack(
                channel="scale_pct",
                keyframes=[
                    MotionSplineKeyframe(
                        time_s=0.0,
                        value=100.0,
                        mode="bezier",
                        out_handle_x=0.82,
                        out_handle_y=0.02,
                        in_handle_x=0.67,
                        in_handle_y=1.0,
                    ),
                    MotionSplineKeyframe(
                        time_s=round(d * 0.22, 3),
                        value=154.0,
                        mode="bezier",
                        out_handle_x=0.18,
                        out_handle_y=0.0,
                        in_handle_x=0.2,
                        in_handle_y=0.98,
                    ),
                    MotionSplineKeyframe(
                        time_s=round(d * 0.58, 3),
                        value=100.0,
                        mode="easy_ease",
                        out_handle_x=0.33,
                        out_handle_y=0.0,
                        in_handle_x=0.82,
                        in_handle_y=1.0,
                    ),
                    MotionSplineKeyframe(
                        time_s=round(d, 3),
                        value=104.0,
                        mode="easy_ease",
                    ),
                ],
            ),
            "position_x_px": MotionSplineChannelTrack(
                channel="position_x_px",
                keyframes=[
                    MotionSplineKeyframe(
                        time_s=0.0,
                        value=0.0,
                        mode="bezier",
                        out_handle_x=0.75,
                        out_handle_y=0.0,
                    ),
                    MotionSplineKeyframe(
                        time_s=round(d * 0.22, 3),
                        value=-48.0,
                        mode="bezier",
                        in_handle_x=0.25,
                        in_handle_y=1.0,
                        out_handle_x=0.25,
                        out_handle_y=0.0,
                    ),
                    MotionSplineKeyframe(
                        time_s=round(d * 0.58, 3),
                        value=0.0,
                        mode="easy_ease",
                        in_handle_x=0.75,
                        in_handle_y=1.0,
                    ),
                ],
            ),
            "position_y_px": MotionSplineChannelTrack(
                channel="position_y_px",
                keyframes=[
                    MotionSplineKeyframe(time_s=0.0, value=0.0, mode="easy_ease"),
                    MotionSplineKeyframe(time_s=round(d * 0.22, 3), value=18.0, mode="easy_ease"),
                    MotionSplineKeyframe(time_s=round(d * 0.58, 3), value=0.0, mode="easy_ease"),
                ],
            ),
            "rotation_deg": MotionSplineChannelTrack(
                channel="rotation_deg",
                keyframes=[
                    MotionSplineKeyframe(
                        time_s=0.0,
                        value=0.0,
                        mode="bezier",
                        out_handle_x=0.78,
                        out_handle_y=0.0,
                    ),
                    MotionSplineKeyframe(
                        time_s=round(d * 0.22, 3),
                        value=-5.5,
                        mode="bezier",
                        in_handle_x=0.22,
                        in_handle_y=1.0,
                        out_handle_x=0.22,
                        out_handle_y=0.0,
                    ),
                    MotionSplineKeyframe(
                        time_s=round(d * 0.58, 3),
                        value=0.0,
                        mode="easy_ease",
                        in_handle_x=0.78,
                        in_handle_y=1.0,
                    ),
                ],
            ),
            "opacity_pct": MotionSplineChannelTrack(
                channel="opacity_pct",
                keyframes=[
                    MotionSplineKeyframe(time_s=0.0, value=100.0, mode="linear"),
                    MotionSplineKeyframe(time_s=round(d, 3), value=100.0, mode="linear"),
                ],
            ),
        }

    if preset_id == "smooth_dolly_push":
        return {
            "scale_pct": MotionSplineChannelTrack(
                channel="scale_pct",
                keyframes=[
                    MotionSplineKeyframe(
                        time_s=0.0,
                        value=100.0,
                        mode="easy_ease",
                        out_handle_x=0.42,
                        out_handle_y=0.0,
                    ),
                    MotionSplineKeyframe(
                        time_s=round(d, 3),
                        value=122.0,
                        mode="easy_ease",
                        in_handle_x=0.58,
                        in_handle_y=1.0,
                    ),
                ],
            ),
            "position_x_px": MotionSplineChannelTrack(
                channel="position_x_px",
                keyframes=[
                    MotionSplineKeyframe(time_s=0.0, value=0.0, mode="easy_ease"),
                    MotionSplineKeyframe(time_s=round(d, 3), value=0.0, mode="easy_ease"),
                ],
            ),
            "position_y_px": MotionSplineChannelTrack(
                channel="position_y_px",
                keyframes=[
                    MotionSplineKeyframe(time_s=0.0, value=14.0, mode="easy_ease"),
                    MotionSplineKeyframe(time_s=round(d, 3), value=-14.0, mode="easy_ease"),
                ],
            ),
            "rotation_deg": MotionSplineChannelTrack(
                channel="rotation_deg",
                keyframes=[
                    MotionSplineKeyframe(time_s=0.0, value=0.0, mode="linear"),
                    MotionSplineKeyframe(time_s=round(d, 3), value=0.0, mode="linear"),
                ],
            ),
            "opacity_pct": MotionSplineChannelTrack(
                channel="opacity_pct",
                keyframes=[
                    MotionSplineKeyframe(time_s=0.0, value=0.0, mode="easy_ease"),
                    MotionSplineKeyframe(time_s=round(d * 0.18, 3), value=100.0, mode="easy_ease"),
                    MotionSplineKeyframe(time_s=round(d, 3), value=100.0, mode="linear"),
                ],
            ),
        }

    if preset_id == "hero_title_overshoot":
        return {
            "scale_pct": MotionSplineChannelTrack(
                channel="scale_pct",
                keyframes=[
                    MotionSplineKeyframe(
                        time_s=0.0,
                        value=62.0,
                        mode="overshoot",
                        out_handle_x=0.22,
                        out_handle_y=0.0,
                    ),
                    MotionSplineKeyframe(
                        time_s=round(d * 0.35, 3),
                        value=100.0,
                        mode="overshoot",
                        in_handle_x=0.58,
                        in_handle_y=1.34,
                        out_handle_x=0.33,
                        out_handle_y=0.0,
                    ),
                    MotionSplineKeyframe(time_s=round(d, 3), value=103.0, mode="linear"),
                ],
            ),
            "position_x_px": MotionSplineChannelTrack(
                channel="position_x_px",
                keyframes=[
                    MotionSplineKeyframe(time_s=0.0, value=0.0, mode="easy_ease"),
                    MotionSplineKeyframe(time_s=round(d, 3), value=0.0, mode="easy_ease"),
                ],
            ),
            "position_y_px": MotionSplineChannelTrack(
                channel="position_y_px",
                keyframes=[
                    MotionSplineKeyframe(
                        time_s=0.0,
                        value=140.0,
                        mode="overshoot",
                        out_handle_x=0.2,
                        out_handle_y=0.0,
                    ),
                    MotionSplineKeyframe(
                        time_s=round(d * 0.35, 3),
                        value=0.0,
                        mode="overshoot",
                        in_handle_x=0.58,
                        in_handle_y=1.28,
                    ),
                ],
            ),
            "rotation_deg": MotionSplineChannelTrack(
                channel="rotation_deg",
                keyframes=[
                    MotionSplineKeyframe(time_s=0.0, value=-3.0, mode="overshoot"),
                    MotionSplineKeyframe(
                        time_s=round(d * 0.35, 3),
                        value=0.0,
                        mode="overshoot",
                        in_handle_x=0.58,
                        in_handle_y=1.25,
                    ),
                ],
            ),
            "opacity_pct": MotionSplineChannelTrack(
                channel="opacity_pct",
                keyframes=[
                    MotionSplineKeyframe(time_s=0.0, value=0.0, mode="easy_ease"),
                    MotionSplineKeyframe(time_s=round(d * 0.2, 3), value=100.0, mode="easy_ease"),
                    MotionSplineKeyframe(time_s=round(d, 3), value=100.0, mode="linear"),
                ],
            ),
        }

    # cinematic_pan_hold or custom
    return {
        "scale_pct": MotionSplineChannelTrack(
            channel="scale_pct",
            keyframes=[
                MotionSplineKeyframe(time_s=0.0, value=115.0, mode="linear"),
                MotionSplineKeyframe(time_s=round(d, 3), value=115.0, mode="linear"),
            ],
        ),
        "position_x_px": MotionSplineChannelTrack(
            channel="position_x_px",
            keyframes=[
                MotionSplineKeyframe(
                    time_s=0.0,
                    value=-240.0,
                    mode="easy_ease",
                    out_handle_x=0.36,
                    out_handle_y=0.0,
                ),
                MotionSplineKeyframe(
                    time_s=round(d * 0.35, 3),
                    value=0.0,
                    mode="hold",
                    in_handle_x=0.64,
                    in_handle_y=1.0,
                ),
                MotionSplineKeyframe(
                    time_s=round(d * 0.65, 3),
                    value=0.0,
                    mode="easy_ease",
                    out_handle_x=0.36,
                    out_handle_y=0.0,
                ),
                MotionSplineKeyframe(
                    time_s=round(d, 3),
                    value=220.0,
                    mode="easy_ease",
                    in_handle_x=0.64,
                    in_handle_y=1.0,
                ),
            ],
        ),
        "position_y_px": MotionSplineChannelTrack(
            channel="position_y_px",
            keyframes=[
                MotionSplineKeyframe(time_s=0.0, value=0.0, mode="linear"),
                MotionSplineKeyframe(time_s=round(d, 3), value=0.0, mode="linear"),
            ],
        ),
        "rotation_deg": MotionSplineChannelTrack(
            channel="rotation_deg",
            keyframes=[
                MotionSplineKeyframe(time_s=0.0, value=0.0, mode="linear"),
                MotionSplineKeyframe(time_s=round(d, 3), value=0.0, mode="linear"),
            ],
        ),
        "opacity_pct": MotionSplineChannelTrack(
            channel="opacity_pct",
            keyframes=[
                MotionSplineKeyframe(time_s=0.0, value=100.0, mode="linear"),
                MotionSplineKeyframe(time_s=round(d, 3), value=100.0, mode="linear"),
            ],
        ),
    }


class MotionSplineStudioConfig(BaseModel):
    """Complete Keyframe Spline & Optical Motion Blur Studio configuration."""

    model_config = ConfigDict(extra="forbid")

    preset_id: MotionSplinePresetId = "whip_zoom_punch"
    active_channel: MotionSplineChannelId = "scale_pct"
    graph_mode: MotionSplineGraphMode = "value"
    fps: float = Field(default=25.0, ge=1.0, le=120.0)
    duration_s: float = Field(default=4.0, ge=0.5, le=120.0)
    width: int = Field(default=1920, ge=320, le=7680)
    height: int = Field(default=1080, ge=180, le=4320)
    sample_count: int = Field(default=96, ge=16, le=480)
    motion_blur: MotionBlurConfig = Field(default_factory=MotionBlurConfig)
    channels: dict[MotionSplineChannelId, MotionSplineChannelTrack] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _ensure_all_channels(self) -> MotionSplineStudioConfig:
        defaults = _default_channels_for_preset(self.preset_id, self.duration_s)
        merged: dict[MotionSplineChannelId, MotionSplineChannelTrack] = {}
        for ch_id in ALLOWED_MOTION_SPLINE_CHANNELS:
            existing = self.channels.get(ch_id)
            if existing is not None:
                merged[ch_id] = existing.model_copy(update={"channel": ch_id})
            else:
                merged[ch_id] = defaults[ch_id]
        self.channels = merged
        return self


class MotionSplinePreset(BaseModel):
    """Built-in After Effects / Fusion curve preset descriptor."""

    model_config = ConfigDict(extra="forbid")

    preset_id: MotionSplinePresetId
    label: str
    description: str
    default_shutter_angle_deg: float
    default_config: MotionSplineStudioConfig


class MotionSplineEvalSample(BaseModel):
    """Single evaluated spline point with value and exact velocity derivative."""

    model_config = ConfigDict(extra="forbid")

    time_s: float
    value: float
    velocity_unit_s: float
    speed_abs_unit_s: float
    progress: float


class MotionBlurFrameSample(BaseModel):
    """Optical shutter-angle motion blur metrics evaluated at a single timestamp."""

    model_config = ConfigDict(extra="forbid")

    time_s: float
    shutter_start_s: float
    shutter_end_s: float
    blur_streak_px: float
    blur_rotation_deg: float
    blur_scale_pct: float
    sample_count: int


class MotionSplineChannelCurve(BaseModel):
    """Evaluated curve samples and summary stats for one channel."""

    model_config = ConfigDict(extra="forbid")

    channel: MotionSplineChannelId
    label: str
    unit: str
    color_hex: str
    min_value: float
    max_value: float
    peak_velocity_unit_s: float
    samples: list[MotionSplineEvalSample]


class MotionSplineEvaluateResult(BaseModel):
    """Full spline, speed-graph, and optical motion blur evaluation result."""

    model_config = ConfigDict(extra="forbid")

    config: MotionSplineStudioConfig
    active_time_s: float
    active_values: dict[MotionSplineChannelId, float]
    active_velocities: dict[MotionSplineChannelId, float]
    active_blur: MotionBlurFrameSample
    peak_velocity_unit_s: float
    peak_blur_streak_px: float
    curves: dict[MotionSplineChannelId, MotionSplineChannelCurve]
    blur_envelope: list[MotionBlurFrameSample]


class MotionSplineCompileResult(BaseModel):
    """Compiled FFmpeg filtergraph and optical shutter blur recipe."""

    model_config = ConfigDict(extra="forbid")

    config: MotionSplineStudioConfig
    vf_chain: str
    filter_complex: str
    ffmpeg_command: str
    shutter_fraction: float
    tmix_frames: int
    tmix_weights: str
    active_channels: list[MotionSplineChannelId]
    peak_velocity_unit_s: float
    peak_blur_streak_px: float
    summary: str


class MotionSplineExportResult(BaseModel):
    """After Effects / DaVinci Resolve Fusion JSON keyframe export."""

    model_config = ConfigDict(extra="forbid")

    schema_version: str
    filename: str
    title: str
    json_text: str
    keyframe_count: int
    peak_velocity_unit_s: float
    peak_blur_streak_px: float
    saved_path: str | None = None


def list_motion_spline_presets() -> list[MotionSplinePreset]:
    """Return built-in After Effects / Fusion spline & shutter presets."""
    whip_cfg = MotionSplineStudioConfig(
        preset_id="whip_zoom_punch",
        active_channel="scale_pct",
        graph_mode="speed",
        duration_s=4.0,
        motion_blur=MotionBlurConfig(
            enabled=True,
            shutter_angle_deg=220.0,
            shutter_phase_deg=-110.0,
            samples=16,
        ),
        channels=_default_channels_for_preset("whip_zoom_punch", 4.0),
    )
    dolly_cfg = MotionSplineStudioConfig(
        preset_id="smooth_dolly_push",
        active_channel="scale_pct",
        graph_mode="value",
        duration_s=4.0,
        motion_blur=MotionBlurConfig(
            enabled=True,
            shutter_angle_deg=180.0,
            shutter_phase_deg=-90.0,
            samples=12,
        ),
        channels=_default_channels_for_preset("smooth_dolly_push", 4.0),
    )
    overshoot_cfg = MotionSplineStudioConfig(
        preset_id="hero_title_overshoot",
        active_channel="position_y_px",
        graph_mode="value",
        duration_s=4.0,
        motion_blur=MotionBlurConfig(
            enabled=True,
            shutter_angle_deg=180.0,
            shutter_phase_deg=-90.0,
            samples=16,
        ),
        channels=_default_channels_for_preset("hero_title_overshoot", 4.0),
    )
    pan_cfg = MotionSplineStudioConfig(
        preset_id="cinematic_pan_hold",
        active_channel="position_x_px",
        graph_mode="speed",
        duration_s=4.0,
        motion_blur=MotionBlurConfig(
            enabled=True,
            shutter_angle_deg=180.0,
            shutter_phase_deg=-90.0,
            samples=16,
        ),
        channels=_default_channels_for_preset("cinematic_pan_hold", 4.0),
    )
    custom_cfg = MotionSplineStudioConfig(
        preset_id="custom",
        active_channel="scale_pct",
        graph_mode="value",
        duration_s=4.0,
        motion_blur=MotionBlurConfig(
            enabled=True,
            shutter_angle_deg=180.0,
            shutter_phase_deg=-90.0,
            samples=16,
        ),
        channels=_default_channels_for_preset("whip_zoom_punch", 4.0),
    )
    return [
        MotionSplinePreset(
            preset_id="whip_zoom_punch",
            label="Whip Zoom Punch",
            description="High-velocity Bezier whip zoom with rotational kick and 220 deg shutter.",
            default_shutter_angle_deg=220.0,
            default_config=whip_cfg,
        ),
        MotionSplinePreset(
            preset_id="smooth_dolly_push",
            label="Smooth Dolly Push",
            description="Subtle Easy Ease camera push with soft 180 deg cinematic motion blur.",
            default_shutter_angle_deg=180.0,
            default_config=dolly_cfg,
        ),
        MotionSplinePreset(
            preset_id="hero_title_overshoot",
            label="Hero Title Overshoot",
            description="Elastic Bezier overshoot settling on scale and Y axis.",
            default_shutter_angle_deg=180.0,
            default_config=overshoot_cfg,
        ),
        MotionSplinePreset(
            preset_id="cinematic_pan_hold",
            label="Cinematic Pan & Hold",
            description="Smooth pan with mid-shot Hold plateau and twin bell speed curves.",
            default_shutter_angle_deg=180.0,
            default_config=pan_cfg,
        ),
        MotionSplinePreset(
            preset_id="custom",
            label="Custom",
            description="Custom multi-channel cubic Bezier curves and shutter settings.",
            default_shutter_angle_deg=180.0,
            default_config=custom_cfg,
        ),
    ]


def get_motion_spline_preset(preset_id: str) -> MotionSplinePreset:
    """Lookup a built-in Motion Spline preset by ID."""
    cleaned = str(preset_id).strip().lower()
    for preset in list_motion_spline_presets():
        if preset.preset_id == cleaned:
            return preset
    allowed = ", ".join(ALLOWED_MOTION_SPLINE_PRESET_IDS)
    raise ValueError(f"Unsupported motion spline preset {preset_id!r}; expected one of: {allowed}")


def normalize_motion_spline_config(raw: Any) -> MotionSplineStudioConfig:
    """Normalize arbitrary JSON payload into a strict MotionSplineStudioConfig."""
    if raw is None:
        return list_motion_spline_presets()[0].default_config
    if isinstance(raw, MotionSplineStudioConfig):
        return raw
    if not isinstance(raw, Mapping):
        raise ValueError("Motion Spline config must be an object")
    preset_raw = raw.get("preset_id")
    if preset_raw is not None and "channels" not in raw:
        base_preset = get_motion_spline_preset(str(preset_raw))
        merged = base_preset.default_config.model_dump(mode="python")
        merged.update(dict(raw))
        return MotionSplineStudioConfig.model_validate(merged)
    return MotionSplineStudioConfig.model_validate(dict(raw))


def _resolve_segment_bezier_points(
    k0: MotionSplineKeyframe,
    k1: MotionSplineKeyframe,
) -> tuple[float, float, float, float]:
    """Return normalized cubic Bezier (p1x, p1y, p2x, p2y) for segment k0 -> k1."""
    if k0.mode == "hold":
        return (0.33, 0.0, 0.67, 0.0)
    if k0.mode == "linear" and k1.mode == "linear":
        return (0.33, 0.33, 0.67, 0.67)
    if k0.mode == "easy_ease":
        p1x, p1y = 0.33, 0.0
    elif k0.mode == "linear":
        p1x, p1y = 0.33, 0.33
    elif k0.mode == "overshoot":
        p1x, p1y = _clamp(k0.out_handle_x, 0.01, 0.99), _clamp(k0.out_handle_y, -1.5, 2.5)
    else:
        p1x = _clamp(k0.out_handle_x, 0.01, 0.99)
        p1y = _clamp(k0.out_handle_y, -1.5, 2.5)

    if k1.mode == "easy_ease":
        p2x, p2y = 0.67, 1.0
    elif k1.mode == "linear":
        p2x, p2y = 0.67, 0.67
    elif k1.mode == "overshoot":
        p2x = _clamp(k1.in_handle_x, 0.01, 0.99)
        p2y = _clamp(k1.in_handle_y if k1.in_handle_y != 1.0 else 1.32, -1.5, 2.5)
    else:
        p2x = _clamp(k1.in_handle_x, 0.01, 0.99)
        p2y = _clamp(k1.in_handle_y, -1.5, 2.5)

    return (p1x, p1y, p2x, p2y)


def solve_cubic_bezier_x(x_target: float, p1x: float, p2x: float) -> float:
    """Solve monotonic B_x(u) = x_target for u in [0, 1] using Newton-Raphson + bisection."""
    if x_target <= 0.0:
        return 0.0
    if x_target >= 1.0:
        return 1.0

    c1x = _clamp(p1x, 0.001, 0.999)
    c2x = _clamp(p2x, 0.001, 0.999)
    lo = 0.0
    hi = 1.0
    u = x_target

    for _ in range(12):
        inv = 1.0 - u
        bx = 3.0 * inv * inv * u * c1x + 3.0 * inv * u * u * c2x + u * u * u
        err = bx - x_target
        if abs(err) < 1e-7:
            return _clamp(u, 0.0, 1.0)
        if err < 0.0:
            lo = u
        else:
            hi = u

        dx_du = (
            3.0 * inv * inv * c1x
            + 6.0 * inv * u * (c2x - c1x)
            + 3.0 * u * u * (1.0 - c2x)
        )
        if abs(dx_du) > 1e-6:
            cand = u - err / dx_du
            if lo < cand < hi:
                u = cand
                continue
        u = 0.5 * (lo + hi)

    return _clamp(u, 0.0, 1.0)


def evaluate_cubic_bezier_y_and_slope(
    u: float,
    p1x: float,
    p1y: float,
    p2x: float,
    p2y: float,
) -> tuple[float, float]:
    """Return (y(u), dy/dx) on the normalized cubic Bezier segment."""
    inv = 1.0 - u
    by = 3.0 * inv * inv * u * p1y + 3.0 * inv * u * u * p2y + u * u * u

    c1x = _clamp(p1x, 0.001, 0.999)
    c2x = _clamp(p2x, 0.001, 0.999)
    dx_du = (
        3.0 * inv * inv * c1x
        + 6.0 * inv * u * (c2x - c1x)
        + 3.0 * u * u * (1.0 - c2x)
    )
    dy_du = (
        3.0 * inv * inv * p1y
        + 6.0 * inv * u * (p2y - p1y)
        + 3.0 * u * u * (1.0 - p2y)
    )
    if dx_du <= 1e-6:
        slope = 0.0 if abs(dy_du) <= 1e-6 else math.copysign(12.0, dy_du)
    else:
        slope = dy_du / dx_du
    return (by, slope)


def evaluate_spline_at_t(
    keyframes: Sequence[MotionSplineKeyframe],
    time_s: float,
) -> MotionSplineEvalSample:
    """Evaluate exact value and velocity dx/dt at timestamp time_s via Newton-Raphson."""
    if not keyframes:
        return MotionSplineEvalSample(
            time_s=round(max(0.0, time_s), 4),
            value=0.0,
            velocity_unit_s=0.0,
            speed_abs_unit_s=0.0,
            progress=0.0,
        )

    ordered = sorted(keyframes, key=lambda kf: kf.time_s)
    t = max(0.0, float(time_s))

    if len(ordered) == 1 or t <= ordered[0].time_s:
        val = ordered[0].value
        return MotionSplineEvalSample(
            time_s=round(t, 4),
            value=round(val, 4),
            velocity_unit_s=0.0,
            speed_abs_unit_s=0.0,
            progress=0.0,
        )

    if t >= ordered[-1].time_s:
        val = ordered[-1].value
        return MotionSplineEvalSample(
            time_s=round(t, 4),
            value=round(val, 4),
            velocity_unit_s=0.0,
            speed_abs_unit_s=0.0,
            progress=1.0,
        )

    seg_idx = 0
    for idx in range(len(ordered) - 1):
        if ordered[idx].time_s <= t <= ordered[idx + 1].time_s:
            seg_idx = idx
            break

    k0 = ordered[seg_idx]
    k1 = ordered[seg_idx + 1]
    dt = max(1e-6, k1.time_s - k0.time_s)
    dv = k1.value - k0.value

    if k0.mode == "hold":
        return MotionSplineEvalSample(
            time_s=round(t, 4),
            value=round(k0.value, 4),
            velocity_unit_s=0.0,
            speed_abs_unit_s=0.0,
            progress=0.0,
        )

    x_target = _clamp((t - k0.time_s) / dt, 0.0, 1.0)
    p1x, p1y, p2x, p2y = _resolve_segment_bezier_points(k0, k1)
    u = solve_cubic_bezier_x(x_target, p1x, p2x)
    y_norm, dy_dx = evaluate_cubic_bezier_y_and_slope(u, p1x, p1y, p2x, p2y)
    value = k0.value + dv * y_norm
    velocity = (dv / dt) * dy_dx

    return MotionSplineEvalSample(
        time_s=round(t, 4),
        value=round(value, 4),
        velocity_unit_s=round(velocity, 4),
        speed_abs_unit_s=round(abs(velocity), 4),
        progress=round(y_norm, 4),
    )


def evaluate_motion_blur_at_t(
    config: MotionSplineStudioConfig,
    time_s: float,
) -> MotionBlurFrameSample:
    """Compute optical shutter-angle motion blur trail across sub-frame samples."""
    frame_dur = 1.0 / max(1.0, config.fps)
    shutter_frac = (
        config.motion_blur.shutter_angle_deg / 360.0
        if config.motion_blur.enabled
        else 0.0
    )
    phase_frac = config.motion_blur.shutter_phase_deg / 360.0
    t_start = max(0.0, time_s + phase_frac * frame_dur)
    t_end = max(t_start, min(config.duration_s, t_start + shutter_frac * frame_dur))
    n_samples = config.motion_blur.samples

    if (
        not config.motion_blur.enabled
        or config.motion_blur.shutter_angle_deg <= 0.0
        or t_end <= t_start
    ):
        return MotionBlurFrameSample(
            time_s=round(time_s, 4),
            shutter_start_s=round(time_s, 4),
            shutter_end_s=round(time_s, 4),
            blur_streak_px=0.0,
            blur_rotation_deg=0.0,
            blur_scale_pct=0.0,
            sample_count=n_samples,
        )

    xs: list[float] = []
    ys: list[float] = []
    scales: list[float] = []
    rots: list[float] = []
    for i in range(n_samples):
        frac = i / max(1, n_samples - 1)
        ts = t_start + frac * (t_end - t_start)
        xs.append(evaluate_spline_at_t(config.channels["position_x_px"].keyframes, ts).value)
        ys.append(evaluate_spline_at_t(config.channels["position_y_px"].keyframes, ts).value)
        scales.append(evaluate_spline_at_t(config.channels["scale_pct"].keyframes, ts).value)
        rots.append(evaluate_spline_at_t(config.channels["rotation_deg"].keyframes, ts).value)

    dx = max(xs) - min(xs)
    dy = max(ys) - min(ys)
    d_scale = max(scales) - min(scales)
    d_rot = max(rots) - min(rots)
    ref_radius_px = 0.35 * min(config.width, config.height)
    trans_streak = math.hypot(dx, dy)
    rot_streak = ref_radius_px * math.radians(d_rot)
    scale_streak = ref_radius_px * (d_scale / 100.0)
    total_streak = trans_streak + rot_streak + scale_streak

    return MotionBlurFrameSample(
        time_s=round(time_s, 4),
        shutter_start_s=round(t_start, 4),
        shutter_end_s=round(t_end, 4),
        blur_streak_px=round(total_streak, 3),
        blur_rotation_deg=round(d_rot, 3),
        blur_scale_pct=round(d_scale, 3),
        sample_count=n_samples,
    )


def evaluate_motion_spline_studio(
    config: MotionSplineStudioConfig,
    active_time_s: float | None = None,
) -> MotionSplineEvaluateResult:
    """Evaluate all 5 spline channels, speed curves, and optical blur envelope."""
    n_pts = config.sample_count
    times = [
        round((i / max(1, n_pts - 1)) * config.duration_s, 4)
        for i in range(n_pts)
    ]

    curves: dict[MotionSplineChannelId, MotionSplineChannelCurve] = {}
    overall_peak_vel = 0.0

    for ch_id in ALLOWED_MOTION_SPLINE_CHANNELS:
        track = config.channels[ch_id]
        spec = _CHANNEL_SPEC_MAP[ch_id]
        pts = [evaluate_spline_at_t(track.keyframes, t) for t in times]
        vals = [p.value for p in pts]
        peak_v = max((p.speed_abs_unit_s for p in pts), default=0.0)
        if track.enabled and peak_v > overall_peak_vel:
            overall_peak_vel = peak_v
        curves[ch_id] = MotionSplineChannelCurve(
            channel=ch_id,
            label=spec.label,
            unit=spec.unit,
            color_hex=spec.color_hex,
            min_value=round(min(vals), 4),
            max_value=round(max(vals), 4),
            peak_velocity_unit_s=round(peak_v, 4),
            samples=pts,
        )

    blur_env = [evaluate_motion_blur_at_t(config, t) for t in times]
    peak_blur_px = max((b.blur_streak_px for b in blur_env), default=0.0)

    t_active = _clamp(
        0.0 if active_time_s is None else float(active_time_s),
        0.0,
        config.duration_s,
    )
    active_values: dict[MotionSplineChannelId, float] = {}
    active_velocities: dict[MotionSplineChannelId, float] = {}
    for ch_id in ALLOWED_MOTION_SPLINE_CHANNELS:
        ev = evaluate_spline_at_t(config.channels[ch_id].keyframes, t_active)
        active_values[ch_id] = ev.value
        active_velocities[ch_id] = ev.velocity_unit_s

    active_blur = evaluate_motion_blur_at_t(config, t_active)

    return MotionSplineEvaluateResult(
        config=config,
        active_time_s=round(t_active, 4),
        active_values=active_values,
        active_velocities=active_velocities,
        active_blur=active_blur,
        peak_velocity_unit_s=round(overall_peak_vel, 4),
        peak_blur_streak_px=round(peak_blur_px, 3),
        curves=curves,
        blur_envelope=blur_env,
    )


def _channel_is_animated(track: MotionSplineChannelTrack, default_val: float) -> bool:
    if not track.enabled or not track.keyframes:
        return False
    first = track.keyframes[0].value
    if len(track.keyframes) == 1:
        return abs(first - default_val) > 1e-4
    return (
        any(abs(k.value - first) > 1e-4 for k in track.keyframes[1:])
        or abs(first - default_val) > 1e-4
    )


def _build_piecewise_ffmpeg_expr(
    keyframes: Sequence[MotionSplineKeyframe],
    *,
    default_val: float,
    scale_factor: float = 1.0,
) -> str:
    """Compile piecewise time-windowed FFmpeg expression approximating cubic Bezier segments."""
    ordered = sorted(keyframes, key=lambda kf: kf.time_s)
    if not ordered:
        return f"{default_val * scale_factor:.4f}"
    if len(ordered) == 1:
        return f"{ordered[0].value * scale_factor:.4f}"

    terms: list[str] = []
    first = ordered[0]
    terms.append(f"lt(t,{first.time_s:.3f})*{first.value * scale_factor:.4f}")

    for idx in range(len(ordered) - 1):
        k0 = ordered[idx]
        k1 = ordered[idx + 1]
        v0 = k0.value * scale_factor
        v1 = k1.value * scale_factor
        dv = v1 - v0
        dt = max(1e-4, k1.time_s - k0.time_s)
        u_expr = f"((t-{k0.time_s:.3f})/{dt:.4f})"
        if k0.mode == "hold":
            seg_val = f"{v0:.4f}"
        elif k0.mode == "linear" and k1.mode == "linear":
            seg_val = f"({v0:.4f}+({dv:.4f})*{u_expr})"
        elif k0.mode == "overshoot" or k1.mode == "overshoot":
            seg_val = (
                f"({v0:.4f}+({dv:.4f})*(3*pow({u_expr},2)-2*pow({u_expr},3)"
                f"+0.22*sin(PI*{u_expr})))"
            )
        else:
            p1x, p1y, p2x, p2y = _resolve_segment_bezier_points(k0, k1)
            # Evaluate Hermite-weighted cubic blend in FFmpeg expression syntax
            seg_val = (
                f"({v0:.4f}+({dv:.4f})*(3*pow(1-{u_expr},2)*{u_expr}*{p1y:.3f}"
                f"+3*(1-{u_expr})*pow({u_expr},2)*{p2y:.3f}+pow({u_expr},3)"
                f"+0.08*({0.5 - (p1x + p2x) * 0.5:.3f})*sin(PI*{u_expr})))"
            )
        terms.append(f"between(t,{k0.time_s:.3f},{k1.time_s:.3f})*{seg_val}")

    last = ordered[-1]
    terms.append(f"gt(t,{last.time_s:.3f})*{last.value * scale_factor:.4f}")
    return "+".join(terms)


def compile_motion_spline_filtergraph(
    config: MotionSplineStudioConfig,
) -> MotionSplineCompileResult:
    """Compile animated transform expressions and shutter-angle motion blur into FFmpeg vf."""
    eval_res = evaluate_motion_spline_studio(config)
    w = config.width
    h = config.height
    fps_val = config.fps

    active_channels: list[MotionSplineChannelId] = []
    for ch_id in ALLOWED_MOTION_SPLINE_CHANNELS:
        spec = _CHANNEL_SPEC_MAP[ch_id]
        if _channel_is_animated(config.channels[ch_id], spec.default_value):
            active_channels.append(ch_id)

    scale_expr = _build_piecewise_ffmpeg_expr(
        config.channels["scale_pct"].keyframes,
        default_val=100.0,
        scale_factor=0.01,
    )
    px_expr = _build_piecewise_ffmpeg_expr(
        config.channels["position_x_px"].keyframes,
        default_val=0.0,
        scale_factor=1.0,
    )
    py_expr = _build_piecewise_ffmpeg_expr(
        config.channels["position_y_px"].keyframes,
        default_val=0.0,
        scale_factor=1.0,
    )
    rot_expr = _build_piecewise_ffmpeg_expr(
        config.channels["rotation_deg"].keyframes,
        default_val=0.0,
        scale_factor=1.0,
    )
    op_expr = _build_piecewise_ffmpeg_expr(
        config.channels["opacity_pct"].keyframes,
        default_val=100.0,
        scale_factor=0.01,
    )

    filters: list[str] = []

    # 1. Optical Shutter Angle oversampling + weighted tmix motion blur
    shutter_fraction = (
        round(config.motion_blur.shutter_angle_deg / 360.0, 4)
        if config.motion_blur.enabled
        else 0.0
    )
    tmix_frames = 1
    weights_str = "1"
    if config.motion_blur.enabled and config.motion_blur.shutter_angle_deg > 0.0:
        sub_mult = max(2, min(8, round(config.motion_blur.samples / 2)))
        sub_fps = round(fps_val * sub_mult, 2)
        tmix_frames = max(2, min(16, round(config.motion_blur.samples * shutter_fraction)))
        center = (tmix_frames - 1) * (
            0.5 + _clamp(config.motion_blur.shutter_phase_deg / 360.0, -0.5, 0.5)
        )
        raw_weights = [
            round(math.exp(-0.5 * ((i - center) / max(0.85, tmix_frames * 0.35)) ** 2), 3)
            for i in range(tmix_frames)
        ]
        weights_str = " ".join(f"{wt:.3f}" for wt in raw_weights)
        filters.append(f"minterpolate=fps={sub_fps}:mi_mode=blend")

    # 2. Animated zoompan + crop framing
    zoom_x_expr = f"iw/2-(iw/zoom/2)+({px_expr})"
    zoom_y_expr = f"ih/2-(ih/zoom/2)+({py_expr})"
    filters.append(
        f"zoompan=z='max(0.1,{scale_expr})':x='{zoom_x_expr}':y='{zoom_y_expr}'"
        f":d=1:s={w}x{h}:fps={fps_val:.3f}"
    )

    # 3. Animated rotation when active
    if "rotation_deg" in active_channels:
        filters.append(
            f"rotate=a='({rot_expr})*PI/180':ow={w}:oh={h}:fillcolor=black@0"
        )

    # 4. Raster safety crop
    filters.append(f"crop=w={w}:h={h}:x='max(0,(iw-ow)/2)':y='max(0,(ih-oh)/2)'")

    # 5. Opacity envelope
    if "opacity_pct" in active_channels:
        filters.append(f"format=rgba,colorchannelmixer=aa='min(1,max(0,{op_expr}))'")

    # 6. Shutter-weighted tmix collapse back to sequence fps
    if config.motion_blur.enabled and config.motion_blur.shutter_angle_deg > 0.0:
        filters.append(f"tmix=frames={tmix_frames}:weights='{weights_str}'")
        filters.append(f"fps={fps_val:.3f}")

    vf_chain = ",".join(filters)
    filter_complex = f"[0:v]{vf_chain}[v_spline]"
    ffmpeg_cmd = (
        f'ffmpeg -i input.mp4 -filter_complex "{filter_complex}" '
        f'-map "[v_spline]" -map 0:a? -c:v libx264 -pix_fmt yuv420p output_motion_spline.mp4'
    )
    summary = (
        f"{len(active_channels)} active channels | "
        f"Shutter {config.motion_blur.shutter_angle_deg:.0f} deg ({tmix_frames}f tmix) | "
        f"Peak Vel {eval_res.peak_velocity_unit_s:.1f} u/s | "
        f"Blur {eval_res.peak_blur_streak_px:.1f} px"
    )

    return MotionSplineCompileResult(
        config=config,
        vf_chain=vf_chain,
        filter_complex=filter_complex,
        ffmpeg_command=ffmpeg_cmd,
        shutter_fraction=shutter_fraction,
        tmix_frames=tmix_frames,
        tmix_weights=weights_str,
        active_channels=active_channels,
        peak_velocity_unit_s=eval_res.peak_velocity_unit_s,
        peak_blur_streak_px=eval_res.peak_blur_streak_px,
        summary=summary,
    )


def export_motion_spline_json(
    config: MotionSplineStudioConfig,
    *,
    title: str = "TAKTCUT_SPLINE",
    filename: str | None = None,
) -> MotionSplineExportResult:
    """Export keyframes and Bezier tangents in After Effects / Fusion JSON format."""
    eval_res = evaluate_motion_spline_studio(config)
    compiled = compile_motion_spline_filtergraph(config)
    clean_title = _SAFE_TITLE_RE.sub("_", str(title or "TAKTCUT_SPLINE").strip()).strip("_")
    if not clean_title:
        clean_title = "TAKTCUT_SPLINE"
    out_filename = filename or f"{clean_title.lower()}_motion_spline.json"

    channels_payload: dict[str, Any] = {}
    total_kfs = 0
    for ch_id in ALLOWED_MOTION_SPLINE_CHANNELS:
        track = config.channels[ch_id]
        total_kfs += len(track.keyframes)
        kf_entries: list[dict[str, Any]] = []
        for idx, kf in enumerate(track.keyframes):
            dt_prev = (
                max(1e-4, kf.time_s - track.keyframes[idx - 1].time_s)
                if idx > 0
                else 0.0
            )
            dt_next = (
                max(1e-4, track.keyframes[idx + 1].time_s - kf.time_s)
                if idx + 1 < len(track.keyframes)
                else 0.0
            )
            kf_entries.append(
                {
                    "time_s": kf.time_s,
                    "frame": int(round(kf.time_s * config.fps)),
                    "value": kf.value,
                    "mode": kf.mode,
                    "bezier": {
                        "in_handle_x": kf.in_handle_x,
                        "in_handle_y": kf.in_handle_y,
                        "out_handle_x": kf.out_handle_x,
                        "out_handle_y": kf.out_handle_y,
                    },
                    "after_effects_temporal_ease": {
                        "in_influence_pct": round((1.0 - kf.in_handle_x) * 100.0, 2),
                        "out_influence_pct": round(kf.out_handle_x * 100.0, 2),
                    },
                    "fusion_spline_handles": {
                        "LH": [-round(dt_prev * (1.0 - kf.in_handle_x), 4), 0.0],
                        "RH": [round(dt_next * kf.out_handle_x, 4), 0.0],
                    },
                }
            )
        channels_payload[ch_id] = {
            "enabled": track.enabled,
            "unit": _CHANNEL_SPEC_MAP[ch_id].unit,
            "peak_velocity_unit_s": eval_res.curves[ch_id].peak_velocity_unit_s,
            "keyframes": kf_entries,
        }

    doc_payload = {
        "schema": "taktcut.motion_spline.v1",
        "title": clean_title,
        "compatible_hosts": ["After Effects CC", "DaVinci Resolve Fusion"],
        "preset_id": config.preset_id,
        "composition": {
            "width": config.width,
            "height": config.height,
            "fps": config.fps,
            "duration_s": config.duration_s,
        },
        "motion_blur": config.motion_blur.model_dump(mode="json"),
        "peak_metrics": {
            "peak_velocity_unit_s": eval_res.peak_velocity_unit_s,
            "peak_blur_streak_px": eval_res.peak_blur_streak_px,
        },
        "channels": channels_payload,
        "ffmpeg_vf": compiled.vf_chain,
    }
    json_text = json.dumps(doc_payload, indent=2)

    return MotionSplineExportResult(
        schema_version="taktcut.motion_spline.v1",
        filename=out_filename,
        title=clean_title,
        json_text=json_text,
        keyframe_count=total_kfs,
        peak_velocity_unit_s=eval_res.peak_velocity_unit_s,
        peak_blur_streak_px=eval_res.peak_blur_streak_px,
    )


def apply_motion_spline_to_document(
    document: TimelineDocument,
    config: MotionSplineStudioConfig,
    *,
    track_index: int = 1,
    clip_index: int = 0,
) -> TimelineDocument:
    """Attach a non-destructive ClipMotionSplineTrack to the targeted video clip."""
    next_doc = document.model_copy(deep=True)
    video_tracks = [t for t in next_doc.tracks if t.kind == "video"]
    if not video_tracks:
        raise ValueError("Timeline has no video tracks to apply Motion Spline")

    target_track = next((t for t in video_tracks if t.index == track_index), None)
    if target_track is None:
        target_track = video_tracks[0]
    if not target_track.clips:
        raise ValueError(f"Video track V{target_track.index} has no clips")

    safe_clip_idx = clip_index if 0 <= clip_index < len(target_track.clips) else 0
    compiled = compile_motion_spline_filtergraph(config)

    serialized_channels: dict[str, list[ClipMotionSplineKeyframeRef]] = {}
    for ch_id in ALLOWED_MOTION_SPLINE_CHANNELS:
        serialized_channels[ch_id] = [
            ClipMotionSplineKeyframeRef(
                time_s=kf.time_s,
                value=kf.value,
                mode=kf.mode,
                in_handle_x=kf.in_handle_x,
                in_handle_y=kf.in_handle_y,
                out_handle_x=kf.out_handle_x,
                out_handle_y=kf.out_handle_y,
            )
            for kf in config.channels[ch_id].keyframes
        ]

    target_track.clips[safe_clip_idx].motion_spline = ClipMotionSplineTrack(
        enabled=True,
        preset_id=config.preset_id,
        shutter_angle_deg=config.motion_blur.shutter_angle_deg,
        shutter_phase_deg=config.motion_blur.shutter_phase_deg,
        samples=config.motion_blur.samples,
        fps=config.fps,
        duration_s=config.duration_s,
        peak_velocity_unit_s=compiled.peak_velocity_unit_s,
        peak_blur_streak_px=compiled.peak_blur_streak_px,
        ffmpeg_vf=compiled.vf_chain,
        channels=serialized_channels,
    )
    return next_doc
