"""DaVinci Resolve Stabilization, Premiere Warp Stabilizer & Boris FX Mocha Camera Lock Studio.

Provides strictly typed Pydantic v2 models, deterministic camera motion trajectory
simulation (Pan/Tilt/Roll/Rolling-Shutter Jello), crop-box auto-zoom math, and
FFmpeg vidstab/deshake/perspective/shear compilation for:
- Presets: handheld_cinema_glide, tripod_perspective_lock, action_gimbal_smooth,
  rolling_shutter_fix, custom.
- Modes: perspective, similarity, translation, camera_lock.
- Edge handling: crop_zoom, mirror_border, black.
- Rolling-shutter jello skew repair: [-40.0, +40.0] ms.
- JSON export (taktcut.stabilization_studio.v1) & non-destructive TimelineClip attachment.
"""

from __future__ import annotations

import json
import math
import re
from collections.abc import Mapping
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from taktcut.models import ClipStabilizationStudioTrack, TimelineDocument

StabilizationStudioPresetId = Literal[
    "handheld_cinema_glide",
    "tripod_perspective_lock",
    "action_gimbal_smooth",
    "rolling_shutter_fix",
    "custom",
]

StabilizationStudioMode = Literal[
    "perspective",
    "similarity",
    "translation",
    "camera_lock",
]

StabilizationStudioEdgeMode = Literal[
    "crop_zoom",
    "mirror_border",
    "black",
]

STABILIZATION_MIN_CROP_RATIO = 0.50
STABILIZATION_MAX_CROP_RATIO = 1.00
STABILIZATION_MIN_SKEW_MS = -40.0
STABILIZATION_MAX_SKEW_MS = 40.0

ALLOWED_STABILIZATION_PRESET_IDS: tuple[StabilizationStudioPresetId, ...] = (
    "handheld_cinema_glide",
    "tripod_perspective_lock",
    "action_gimbal_smooth",
    "rolling_shutter_fix",
    "custom",
)

ALLOWED_STABILIZATION_MODES: tuple[StabilizationStudioMode, ...] = (
    "perspective",
    "similarity",
    "translation",
    "camera_lock",
)

ALLOWED_STABILIZATION_EDGE_MODES: tuple[StabilizationStudioEdgeMode, ...] = (
    "crop_zoom",
    "mirror_border",
    "black",
)

_PRESET_ID_MAP: dict[str, StabilizationStudioPresetId] = {
    p: p for p in ALLOWED_STABILIZATION_PRESET_IDS
}
_MODE_MAP: dict[str, StabilizationStudioMode] = {m: m for m in ALLOWED_STABILIZATION_MODES}
_EDGE_MODE_MAP: dict[str, StabilizationStudioEdgeMode] = {
    e: e for e in ALLOWED_STABILIZATION_EDGE_MODES
}
_SAFE_TITLE_RE = re.compile(r"[^A-Za-z0-9_-]+")


def _clamp(value: float, lo: float, hi: float) -> float:
    return min(hi, max(lo, value))


def _validate_bounded_float(raw: Any, field_name: str, lo: float, hi: float) -> float:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raise ValueError(f"{field_name} must be a finite number, got {raw!r}")
    val = float(raw)
    if not math.isfinite(val) or val < lo or val > hi:
        raise ValueError(f"{field_name} must be in [{lo}, {hi}], got {raw!r}")
    return val


def _validate_bounded_int(raw: Any, field_name: str, lo: int, hi: int) -> int:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raise ValueError(f"{field_name} must be an integer, got {raw!r}")
    val = int(round(float(raw)))
    if val < lo or val > hi:
        raise ValueError(f"{field_name} must be in [{lo}, {hi}], got {raw!r}")
    return val


def _validate_bool(raw: Any, field_name: str) -> bool:
    if not isinstance(raw, bool):
        raise ValueError(f"{field_name} must be a boolean, got {raw!r}")
    return raw


class StabilizationStudioConfig(BaseModel):
    """Complete Camera Stabilization, Perspective Lock & Rolling-Shutter Studio configuration."""

    model_config = ConfigDict(extra="ignore")

    enabled: bool = True
    preset_id: StabilizationStudioPresetId = "handheld_cinema_glide"
    mode: StabilizationStudioMode = "similarity"
    smoothing_pct: float = Field(default=52.0, ge=0.0, le=100.0)
    strength_pct: float = Field(default=68.0, ge=0.0, le=100.0)
    crop_ratio_min: float = Field(
        default=0.88,
        ge=STABILIZATION_MIN_CROP_RATIO,
        le=STABILIZATION_MAX_CROP_RATIO,
    )
    auto_zoom_fill: bool = True
    rolling_shutter_skew_ms: float = Field(
        default=0.0,
        ge=STABILIZATION_MIN_SKEW_MS,
        le=STABILIZATION_MAX_SKEW_MS,
    )
    edge_mode: StabilizationStudioEdgeMode = "crop_zoom"
    width: int = Field(default=1920, ge=320, le=7680)
    height: int = Field(default=1080, ge=240, le=4320)
    fps: float = Field(default=25.0, ge=1.0, le=120.0)
    duration_s: float = Field(default=6.0, ge=0.25, le=3600.0)
    playhead_norm: float = Field(default=0.35, ge=0.0, le=1.0)
    compare_split: bool = False

    @field_validator("enabled", "auto_zoom_fill", "compare_split", mode="before")
    @classmethod
    def _val_bool(cls, raw: Any, info: Any) -> bool:
        return _validate_bool(raw, str(info.field_name))

    @field_validator("preset_id", mode="before")
    @classmethod
    def _val_preset(cls, raw: Any) -> StabilizationStudioPresetId:
        if not isinstance(raw, str):
            raise ValueError(f"preset_id must be a string, got {raw!r}")
        cleaned = _PRESET_ID_MAP.get(raw.strip().lower())
        if cleaned is None:
            allowed = ", ".join(ALLOWED_STABILIZATION_PRESET_IDS)
            raise ValueError(
                f"Unsupported stabilization studio preset {raw!r}; expected: {allowed}"
            )
        return cleaned

    @field_validator("mode", mode="before")
    @classmethod
    def _val_mode(cls, raw: Any) -> StabilizationStudioMode:
        if not isinstance(raw, str):
            raise ValueError(f"mode must be a string, got {raw!r}")
        cleaned = _MODE_MAP.get(raw.strip().lower())
        if cleaned is None:
            allowed = ", ".join(ALLOWED_STABILIZATION_MODES)
            raise ValueError(f"Unsupported stabilization mode {raw!r}; expected: {allowed}")
        return cleaned

    @field_validator("edge_mode", mode="before")
    @classmethod
    def _val_edge_mode(cls, raw: Any) -> StabilizationStudioEdgeMode:
        if not isinstance(raw, str):
            raise ValueError(f"edge_mode must be a string, got {raw!r}")
        cleaned = _EDGE_MODE_MAP.get(raw.strip().lower())
        if cleaned is None:
            allowed = ", ".join(ALLOWED_STABILIZATION_EDGE_MODES)
            raise ValueError(f"Unsupported edge_mode {raw!r}; expected: {allowed}")
        return cleaned

    @field_validator("smoothing_pct", "strength_pct", mode="before")
    @classmethod
    def _val_pct(cls, raw: Any, info: Any) -> float:
        return round(_validate_bounded_float(raw, str(info.field_name), 0.0, 100.0), 2)

    @field_validator("crop_ratio_min", mode="before")
    @classmethod
    def _val_crop_ratio_min(cls, raw: Any) -> float:
        return round(
            _validate_bounded_float(
                raw,
                "crop_ratio_min",
                STABILIZATION_MIN_CROP_RATIO,
                STABILIZATION_MAX_CROP_RATIO,
            ),
            4,
        )

    @field_validator("rolling_shutter_skew_ms", mode="before")
    @classmethod
    def _val_skew(cls, raw: Any) -> float:
        return round(
            _validate_bounded_float(
                raw,
                "rolling_shutter_skew_ms",
                STABILIZATION_MIN_SKEW_MS,
                STABILIZATION_MAX_SKEW_MS,
            ),
            2,
        )

    @field_validator("width", mode="before")
    @classmethod
    def _val_width(cls, raw: Any) -> int:
        return _validate_bounded_int(raw, "width", 320, 7680)

    @field_validator("height", mode="before")
    @classmethod
    def _val_height(cls, raw: Any) -> int:
        return _validate_bounded_int(raw, "height", 240, 4320)

    @field_validator("fps", mode="before")
    @classmethod
    def _val_fps(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "fps", 1.0, 120.0), 3)

    @field_validator("duration_s", mode="before")
    @classmethod
    def _val_dur(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "duration_s", 0.25, 3600.0), 4)

    @field_validator("playhead_norm", mode="before")
    @classmethod
    def _val_playhead(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "playhead_norm", 0.0, 1.0), 4)


class StabilizationStudioPreset(BaseModel):
    """Curated DaVinci Resolve / Premiere Warp Stabilizer / Mocha Camera Lock preset."""

    preset_id: StabilizationStudioPresetId
    label: str
    description: str
    default_config: StabilizationStudioConfig


class StabilizationStudioSample(BaseModel):
    """Single trajectory sample comparing raw camera shake vs stabilized motion."""

    t_norm: float
    raw_pan_px: float
    stab_pan_px: float
    raw_tilt_px: float
    stab_tilt_px: float
    raw_roll_deg: float
    stab_roll_deg: float
    residual_jitter_px: float


class StabilizationStudioEvaluateResult(BaseModel):
    """Deterministic trajectory analysis, jitter reduction, and crop-box compensation metrics."""

    enabled: bool
    preset_id: StabilizationStudioPresetId
    mode: StabilizationStudioMode
    edge_mode: StabilizationStudioEdgeMode
    raw_rms_px: float
    stabilized_rms_px: float
    jitter_reduction_pct: float
    peak_pan_px: float
    peak_tilt_px: float
    peak_roll_deg: float
    jello_repair_pct: float
    required_crop_ratio: float
    effective_crop_ratio: float
    zoom_compensation_ratio: float
    safe_frame_width_norm: float
    safe_frame_height_norm: float
    border_clipping_risk: bool
    playhead_raw_pan_px: float
    playhead_stab_pan_px: float
    playhead_raw_tilt_px: float
    playhead_stab_tilt_px: float
    playhead_roll_deg: float
    samples: list[StabilizationStudioSample]


class StabilizationStudioCompileResult(BaseModel):
    """Compiled FFmpeg vidstab + deshake + rolling-shutter perspective/shear + crop/scale."""

    enabled: bool
    preset_id: StabilizationStudioPresetId
    mode: StabilizationStudioMode
    edge_mode: StabilizationStudioEdgeMode
    zoom_compensation_ratio: float
    pass1_vidstabdetect: str
    pass2_vidstabtransform: str
    deshake_fallback_vf: str
    rolling_shutter_vf: str
    crop_scale_vf: str
    vf_chain: str
    ffmpeg_pass1_command: str
    ffmpeg_pass2_command: str
    ffmpeg_command: str
    warnings: list[str] = Field(default_factory=list)


class StabilizationStudioExportResult(BaseModel):
    """Serialized taktcut.stabilization_studio.v1 JSON payload."""

    schema_version: Literal["taktcut.stabilization_studio.v1"] = "taktcut.stabilization_studio.v1"
    title: str
    preset_id: StabilizationStudioPresetId
    compatible_hosts: list[str]
    json_text: str
    filename: str
    saved_path: str | None = None


_PRESET_DEFINITIONS: tuple[StabilizationStudioPreset, ...] = (
    StabilizationStudioPreset(
        preset_id="handheld_cinema_glide",
        label="Handheld Cinema Glide",
        description=(
            "DaVinci Similarity stabilization preserving natural dolly/pan drift"
            " while smoothing micro-shake."
        ),
        default_config=StabilizationStudioConfig(
            enabled=True,
            preset_id="handheld_cinema_glide",
            mode="similarity",
            smoothing_pct=52.0,
            strength_pct=68.0,
            crop_ratio_min=0.88,
            auto_zoom_fill=True,
            rolling_shutter_skew_ms=0.0,
            edge_mode="crop_zoom",
        ),
    ),
    StabilizationStudioPreset(
        preset_id="tripod_perspective_lock",
        label="Tripod Perspective Lock",
        description=(
            "Boris FX Mocha / Resolve Camera Lock pinning 4-corner perspective"
            " to a virtual tripod."
        ),
        default_config=StabilizationStudioConfig(
            enabled=True,
            preset_id="tripod_perspective_lock",
            mode="camera_lock",
            smoothing_pct=96.0,
            strength_pct=100.0,
            crop_ratio_min=0.80,
            auto_zoom_fill=True,
            rolling_shutter_skew_ms=-4.0,
            edge_mode="crop_zoom",
        ),
    ),
    StabilizationStudioPreset(
        preset_id="action_gimbal_smooth",
        label="Action Gimbal Smooth",
        description=(
            "Premiere Warp Perspective smoothing for running handheld footage"
            " with mirror-border edge fill."
        ),
        default_config=StabilizationStudioConfig(
            enabled=True,
            preset_id="action_gimbal_smooth",
            mode="perspective",
            smoothing_pct=72.0,
            strength_pct=84.0,
            crop_ratio_min=0.82,
            auto_zoom_fill=True,
            rolling_shutter_skew_ms=6.0,
            edge_mode="mirror_border",
        ),
    ),
    StabilizationStudioPreset(
        preset_id="rolling_shutter_fix",
        label="Rolling-Shutter Jello Fix",
        description=(
            "CMOS readout skew compensation (-18ms) paired with balanced"
            " perspective jitter attenuation."
        ),
        default_config=StabilizationStudioConfig(
            enabled=True,
            preset_id="rolling_shutter_fix",
            mode="perspective",
            smoothing_pct=45.0,
            strength_pct=60.0,
            crop_ratio_min=0.90,
            auto_zoom_fill=True,
            rolling_shutter_skew_ms=-18.0,
            edge_mode="crop_zoom",
        ),
    ),
    StabilizationStudioPreset(
        preset_id="custom",
        label="Custom Stabilization",
        description=(
            "User-defined smoothing, perspective lock, crop limit,"
            " and rolling-shutter skew."
        ),
        default_config=StabilizationStudioConfig(
            enabled=True,
            preset_id="custom",
            mode="perspective",
            smoothing_pct=50.0,
            strength_pct=75.0,
            crop_ratio_min=0.85,
            auto_zoom_fill=True,
            rolling_shutter_skew_ms=0.0,
            edge_mode="crop_zoom",
        ),
    ),
)

_PRESETS_BY_ID: dict[StabilizationStudioPresetId, StabilizationStudioPreset] = {
    p.preset_id: p for p in _PRESET_DEFINITIONS
}


def list_stabilization_studio_presets() -> list[StabilizationStudioPreset]:
    """Return built-in Camera Stabilization Studio presets."""
    return [p.model_copy(deep=True) for p in _PRESET_DEFINITIONS]


def get_stabilization_studio_preset(preset_id: str) -> StabilizationStudioPreset:
    """Lookup a Camera Stabilization Studio preset by id."""
    cleaned = _PRESET_ID_MAP.get(str(preset_id or "").strip().lower())
    if cleaned is None:
        allowed = ", ".join(ALLOWED_STABILIZATION_PRESET_IDS)
        raise ValueError(
            f"Unsupported stabilization studio preset {preset_id!r}; expected: {allowed}"
        )
    return _PRESETS_BY_ID[cleaned].model_copy(deep=True)


def normalize_stabilization_studio_config(
    raw: StabilizationStudioConfig | Mapping[str, Any] | None,
) -> StabilizationStudioConfig:
    """Normalize dict/model input into a validated StabilizationStudioConfig."""
    if raw is None:
        return StabilizationStudioConfig()
    if isinstance(raw, StabilizationStudioConfig):
        return raw.model_copy(deep=True)
    if not isinstance(raw, Mapping):
        raise ValueError("stabilization_studio config must be a JSON object")

    raw_preset = raw.get("preset_id")
    if isinstance(raw_preset, str) and raw_preset.strip().lower() in _PRESET_ID_MAP:
        pid = _PRESET_ID_MAP[raw_preset.strip().lower()]
        base = _PRESETS_BY_ID[pid].default_config.model_dump(mode="python")
    else:
        base = StabilizationStudioConfig().model_dump(mode="python")

    merged = dict(base)
    for key, val in raw.items():
        if key in base:
            merged[key] = val
    return StabilizationStudioConfig.model_validate(merged)


def _compute_mode_attenuation(
    mode: StabilizationStudioMode,
    smoothing_pct: float,
    strength_pct: float,
) -> tuple[float, float, float]:
    smooth_norm = _clamp(smoothing_pct / 100.0, 0.0, 1.0)
    strength_norm = _clamp(strength_pct / 100.0, 0.0, 1.0)
    if mode == "camera_lock":
        drift_keep = max(0.0, (1.0 - strength_norm) * 0.35)
        jitter_keep = max(0.02, (1.0 - strength_norm * 0.96) * (1.0 - 0.75 * smooth_norm))
        roll_keep = drift_keep * 0.5
        return (drift_keep, jitter_keep, roll_keep)
    if mode == "perspective":
        drift_keep = (1.0 - 0.85 * smooth_norm) * (1.0 - 0.40 * strength_norm)
        jitter_keep = max(0.03, (1.0 - 0.92 * strength_norm) * (1.0 - 0.55 * smooth_norm))
        roll_keep = max(0.03, (1.0 - 0.88 * strength_norm) * (1.0 - 0.45 * smooth_norm))
        return (drift_keep, jitter_keep, roll_keep)
    if mode == "similarity":
        drift_keep = (1.0 - 0.72 * smooth_norm) * (1.0 - 0.30 * strength_norm)
        jitter_keep = max(0.04, (1.0 - 0.86 * strength_norm) * (1.0 - 0.50 * smooth_norm))
        roll_keep = max(0.05, (1.0 - 0.80 * strength_norm) * (1.0 - 0.40 * smooth_norm))
        return (drift_keep, jitter_keep, roll_keep)
    # translation: pan/tilt only, roll passes through untouched
    drift_keep = (1.0 - 0.70 * smooth_norm) * (1.0 - 0.25 * strength_norm)
    jitter_keep = max(0.05, (1.0 - 0.82 * strength_norm) * (1.0 - 0.45 * smooth_norm))
    return (drift_keep, jitter_keep, 1.0)


def _sample_camera_motion(
    u: float,
    config: StabilizationStudioConfig,
    drift_keep: float,
    jitter_keep: float,
    roll_keep: float,
) -> StabilizationStudioSample:
    tau = 2.0 * math.pi
    slow_pan = 14.0 * math.sin(tau * (1.25 * u + 0.08))
    hi_pan = 8.5 * math.sin(tau * (4.7 * u + 0.21)) + 4.2 * math.cos(tau * (11.3 * u + 0.05))
    raw_pan = slow_pan + hi_pan

    slow_tilt = 9.5 * math.cos(tau * (0.95 * u + 0.14))
    hi_tilt = 6.4 * math.sin(tau * (5.3 * u + 0.37)) + 3.1 * math.sin(tau * (12.8 * u + 0.19))
    raw_tilt = slow_tilt + hi_tilt

    slow_roll = 1.65 * math.sin(tau * (1.45 * u + 0.11))
    hi_roll = 0.95 * math.cos(tau * (6.1 * u + 0.29)) + 0.42 * math.sin(tau * (10.7 * u))
    raw_roll = slow_roll + hi_roll

    if not config.enabled:
        stab_pan = raw_pan
        stab_tilt = raw_tilt
        stab_roll = raw_roll
        res_jitter = math.hypot(hi_pan, hi_tilt)
    else:
        stab_pan = slow_pan * drift_keep + hi_pan * jitter_keep
        stab_tilt = slow_tilt * drift_keep + hi_tilt * jitter_keep
        if config.mode == "translation":
            stab_roll = raw_roll
        else:
            stab_roll = slow_roll * roll_keep + hi_roll * jitter_keep
        if config.mode == "camera_lock":
            res_jitter = math.hypot(stab_pan, stab_tilt)
        else:
            res_jitter = math.hypot(
                stab_pan - slow_pan * drift_keep,
                stab_tilt - slow_tilt * drift_keep,
            )

    return StabilizationStudioSample(
        t_norm=round(u, 4),
        raw_pan_px=round(raw_pan, 3),
        stab_pan_px=round(stab_pan, 3),
        raw_tilt_px=round(raw_tilt, 3),
        stab_tilt_px=round(stab_tilt, 3),
        raw_roll_deg=round(raw_roll, 3),
        stab_roll_deg=round(stab_roll, 3),
        residual_jitter_px=round(res_jitter, 3),
    )


def evaluate_stabilization_studio(
    config: StabilizationStudioConfig,
    *,
    sample_count: int = 65,
) -> StabilizationStudioEvaluateResult:
    """Deterministically simulate Pan/Tilt/Roll/Jello trajectories and crop-box compensation."""
    count = max(9, min(257, int(sample_count)))
    drift_keep, jitter_keep, roll_keep = _compute_mode_attenuation(
        config.mode, config.smoothing_pct, config.strength_pct
    )

    samples: list[StabilizationStudioSample] = []
    raw_sq_sum = 0.0
    stab_sq_sum = 0.0
    peak_pan = 0.0
    peak_tilt = 0.0
    peak_roll = 0.0
    max_comp_x = 0.0
    max_comp_y = 0.0
    max_comp_roll = 0.0

    for idx in range(count):
        u = float(idx) / float(count - 1)
        smp = _sample_camera_motion(u, config, drift_keep, jitter_keep, roll_keep)
        samples.append(smp)

        tau = 2.0 * math.pi
        slow_pan = 14.0 * math.sin(tau * (1.25 * u + 0.08))
        slow_tilt = 9.5 * math.cos(tau * (0.95 * u + 0.14))
        raw_dev = math.hypot(smp.raw_pan_px - slow_pan, smp.raw_tilt_px - slow_tilt)
        if config.mode == "camera_lock":
            raw_dev = math.hypot(smp.raw_pan_px, smp.raw_tilt_px)
        raw_sq_sum += raw_dev * raw_dev
        stab_sq_sum += smp.residual_jitter_px * smp.residual_jitter_px

        peak_pan = max(peak_pan, abs(smp.raw_pan_px))
        peak_tilt = max(peak_tilt, abs(smp.raw_tilt_px))
        peak_roll = max(peak_roll, abs(smp.raw_roll_deg))

        max_comp_x = max(max_comp_x, abs(smp.raw_pan_px - smp.stab_pan_px))
        max_comp_y = max(max_comp_y, abs(smp.raw_tilt_px - smp.stab_tilt_px))
        max_comp_roll = max(max_comp_roll, abs(smp.raw_roll_deg - smp.stab_roll_deg))

    raw_rms = math.sqrt(raw_sq_sum / float(count))
    stab_rms = math.sqrt(stab_sq_sum / float(count))
    if not config.enabled or raw_rms <= 1e-6:
        jitter_reduction = 0.0
    else:
        jitter_reduction = _clamp((1.0 - stab_rms / raw_rms) * 100.0, 0.0, 99.9)

    skew_abs = abs(float(config.rolling_shutter_skew_ms))
    jello_repair_pct = (
        round(_clamp(skew_abs / 22.0, 0.0, 1.0) * 92.0, 1)
        if (config.enabled and skew_abs >= 0.1)
        else 0.0
    )

    if not config.enabled:
        required_crop_ratio = 1.0
        effective_crop_ratio = 1.0
        zoom_comp = 1.0
        border_risk = False
    else:
        roll_margin_px = math.sin(math.radians(max_comp_roll)) * 320.0
        skew_margin_px = skew_abs * 0.45
        margin_norm = min(
            0.42,
            max((max_comp_x + skew_margin_px) / 220.0, (max_comp_y + roll_margin_px) / 145.0),
        )
        required_crop_ratio = round(_clamp(1.0 - margin_norm, 0.50, 1.0), 4)
        if config.auto_zoom_fill and config.edge_mode == "crop_zoom":
            effective_crop_ratio = round(max(config.crop_ratio_min, required_crop_ratio), 4)
            zoom_comp = round(1.0 / max(0.50, effective_crop_ratio), 4)
            border_risk = required_crop_ratio < (config.crop_ratio_min - 1e-4)
        elif config.auto_zoom_fill:
            effective_crop_ratio = round(max(config.crop_ratio_min, required_crop_ratio), 4)
            zoom_comp = round(1.0 / max(0.50, effective_crop_ratio), 4)
            border_risk = False
        else:
            effective_crop_ratio = 1.0
            zoom_comp = 1.0
            border_risk = margin_norm > 0.015 and config.edge_mode == "black"

    ph_smp = _sample_camera_motion(
        config.playhead_norm, config, drift_keep, jitter_keep, roll_keep
    )

    return StabilizationStudioEvaluateResult(
        enabled=config.enabled,
        preset_id=config.preset_id,
        mode=config.mode,
        edge_mode=config.edge_mode,
        raw_rms_px=round(raw_rms, 2),
        stabilized_rms_px=round(stab_rms, 2),
        jitter_reduction_pct=round(jitter_reduction, 1),
        peak_pan_px=round(peak_pan, 2),
        peak_tilt_px=round(peak_tilt, 2),
        peak_roll_deg=round(peak_roll, 2),
        jello_repair_pct=jello_repair_pct,
        required_crop_ratio=required_crop_ratio,
        effective_crop_ratio=effective_crop_ratio,
        zoom_compensation_ratio=zoom_comp,
        safe_frame_width_norm=effective_crop_ratio,
        safe_frame_height_norm=effective_crop_ratio,
        border_clipping_risk=border_risk,
        playhead_raw_pan_px=ph_smp.raw_pan_px,
        playhead_stab_pan_px=ph_smp.stab_pan_px,
        playhead_raw_tilt_px=ph_smp.raw_tilt_px,
        playhead_stab_tilt_px=ph_smp.stab_tilt_px,
        playhead_roll_deg=ph_smp.stab_roll_deg,
        samples=samples,
    )


def compile_stabilization_studio_filtergraph(
    config: StabilizationStudioConfig,
) -> StabilizationStudioCompileResult:
    """Compile FFmpeg vidstabdetect/vidstabtransform, deshake, perspective/shear, and crop/scale."""
    eval_res = evaluate_stabilization_studio(config, sample_count=33)

    if not config.enabled:
        return StabilizationStudioCompileResult(
            enabled=False,
            preset_id=config.preset_id,
            mode=config.mode,
            edge_mode=config.edge_mode,
            zoom_compensation_ratio=1.0,
            pass1_vidstabdetect="null",
            pass2_vidstabtransform="null",
            deshake_fallback_vf="null",
            rolling_shutter_vf="null",
            crop_scale_vf="null",
            vf_chain="null",
            ffmpeg_pass1_command="ffmpeg -i input.mp4 -vf \"null\" -f null -",
            ffmpeg_pass2_command='ffmpeg -i input.mp4 -vf "null" output.mp4',
            ffmpeg_command='ffmpeg -i input.mp4 -vf "null" output.mp4',
            warnings=[],
        )

    warnings: list[str] = []
    shakiness = max(1, min(10, int(round(3 + (config.strength_pct / 100.0) * 7))))
    accuracy = 15 if config.mode in ("perspective", "camera_lock") else 12
    stepsize = 6 if config.mode == "camera_lock" else 16
    tripod_flag = 1 if config.mode == "camera_lock" else 0
    pass1_detect = (
        f"vidstabdetect=shakiness={shakiness}:accuracy={accuracy}"
        f":stepsize={stepsize}:tripod={tripod_flag}:result=transforms.trf"
    )

    smoothing_frames = max(0, min(60, int(round((config.smoothing_pct / 100.0) * 45))))
    optalgo = "avg" if config.mode == "camera_lock" else "gauss"
    optzoom = 2 if config.auto_zoom_fill else 0
    max_zoom_pct = round(max(0.0, (1.0 / config.crop_ratio_min - 1.0) * 100.0), 1)
    zoom_pct = round(max(0.0, (eval_res.zoom_compensation_ratio - 1.0) * 100.0), 1)
    maxshift = max(8, min(128, int(round(16 + (config.strength_pct / 100.0) * 64))))
    maxangle = "0" if config.mode == "translation" else "-1"
    vidstab_crop = "black" if config.edge_mode == "black" else "keep"
    pass2_transform = (
        f"vidstabtransform=input=transforms.trf:smoothing={smoothing_frames}"
        f":optalgo={optalgo}:optzoom={optzoom}:zoom={zoom_pct:.1f}"
        f":maxshift={maxshift}:maxangle={maxangle}:crop={vidstab_crop}"
        f":interpol=bicubic:tripod={tripod_flag}"
    )

    deshake_edge = (
        "mirror"
        if config.edge_mode == "mirror_border"
        else ("blank" if config.edge_mode == "black" else "clamp")
    )
    deshake_rx = max(8, min(64, int(round(16 + (config.strength_pct / 100.0) * 48))))
    deshake_ry = max(8, min(64, int(round(16 + (config.strength_pct / 100.0) * 48))))
    deshake_fallback = f"deshake=rx={deshake_rx}:ry={deshake_ry}:edge={deshake_edge}:blocksize=8"

    skew_ms = float(config.rolling_shutter_skew_ms)
    if abs(skew_ms) >= 0.1:
        skew_px = round((skew_ms / 40.0) * 18.0, 2)
        shear_x = round(skew_ms / 40.0 * 0.035, 5)
        w = int(config.width)
        h = int(config.height)
        x2_expr = f"{skew_px:.2f}"
        x3_expr = f"{w + skew_px:.2f}"
        rolling_shutter_vf = (
            f"shear=shx={shear_x:.5f}:shy=0:fillcolor=black,"
            f"perspective=x0=0:y0=0:x1={w}:y1=0:x2={x2_expr}:y2={h}:x3={x3_expr}:y3={h}:interpolation=linear"
        )
    else:
        rolling_shutter_vf = "null"

    crop_ratio = eval_res.effective_crop_ratio
    if crop_ratio < 0.9999:
        crop_scale_vf = (
            f"crop=iw*{crop_ratio:.4f}:ih*{crop_ratio:.4f},"
            f"scale={config.width}:{config.height}:flags=lanczos"
        )
    else:
        crop_scale_vf = f"scale={config.width}:{config.height}:flags=lanczos"

    chain_parts: list[str] = []
    if rolling_shutter_vf != "null":
        chain_parts.append(rolling_shutter_vf)
    chain_parts.append(pass2_transform)
    chain_parts.append(crop_scale_vf)
    vf_chain = ",".join(chain_parts)

    if eval_res.border_clipping_risk:
        warnings.append(
            f"Required crop ratio ({eval_res.required_crop_ratio:.2f}) exceeds "
            f"crop_ratio_min ({config.crop_ratio_min:.2f}) or auto_zoom_fill is disabled "
            f"(max zoom {max_zoom_pct:.1f}%)."
        )
    if config.mode == "camera_lock":
        warnings.append(
            "Camera Lock pins perspective to initial frame; verify static tripod subject framing."
        )

    cmd_pass1 = f'ffmpeg -i input.mp4 -vf "{pass1_detect}" -f null -'
    cmd_pass2 = f'ffmpeg -i input.mp4 -vf "{vf_chain}" -c:a copy output.mp4'
    single_pass_parts = [
        p for p in (rolling_shutter_vf, deshake_fallback, crop_scale_vf) if p != "null"
    ]
    cmd_single = f'ffmpeg -i input.mp4 -vf "{",".join(single_pass_parts)}" -c:a copy output.mp4'

    return StabilizationStudioCompileResult(
        enabled=True,
        preset_id=config.preset_id,
        mode=config.mode,
        edge_mode=config.edge_mode,
        zoom_compensation_ratio=eval_res.zoom_compensation_ratio,
        pass1_vidstabdetect=pass1_detect,
        pass2_vidstabtransform=pass2_transform,
        deshake_fallback_vf=deshake_fallback,
        rolling_shutter_vf=rolling_shutter_vf,
        crop_scale_vf=crop_scale_vf,
        vf_chain=vf_chain,
        ffmpeg_pass1_command=cmd_pass1,
        ffmpeg_pass2_command=cmd_pass2,
        ffmpeg_command=cmd_single,
        warnings=warnings,
    )


def export_stabilization_studio_json(
    config: StabilizationStudioConfig,
    *,
    title: str = "TAKTCUT_STABILIZATION_STUDIO",
) -> StabilizationStudioExportResult:
    """Export Camera Stabilization Studio telemetry, crop box, and FFmpeg pipeline as JSON."""
    cleaned_title = _SAFE_TITLE_RE.sub(
        "_", str(title or "TAKTCUT_STABILIZATION_STUDIO").strip()
    ).strip("_")
    if not cleaned_title:
        cleaned_title = "TAKTCUT_STABILIZATION_STUDIO"

    eval_res = evaluate_stabilization_studio(config, sample_count=33)
    compiled = compile_stabilization_studio_filtergraph(config)
    hosts = [
        "DaVinci Resolve Inspector Stabilization",
        "Adobe Premiere Pro Warp Stabilizer",
        "Boris FX Mocha Camera Lock",
        "FFmpeg vidstab / deshake",
    ]
    payload = {
        "schema_version": "taktcut.stabilization_studio.v1",
        "title": cleaned_title,
        "preset_id": config.preset_id,
        "compatible_hosts": hosts,
        "stabilization": {
            "enabled": config.enabled,
            "mode": config.mode,
            "smoothing_pct": config.smoothing_pct,
            "strength_pct": config.strength_pct,
            "crop_ratio_min": config.crop_ratio_min,
            "auto_zoom_fill": config.auto_zoom_fill,
            "rolling_shutter_skew_ms": config.rolling_shutter_skew_ms,
            "edge_mode": config.edge_mode,
            "width": config.width,
            "height": config.height,
            "fps": config.fps,
            "duration_s": config.duration_s,
        },
        "metrics": {
            "raw_rms_px": eval_res.raw_rms_px,
            "stabilized_rms_px": eval_res.stabilized_rms_px,
            "jitter_reduction_pct": eval_res.jitter_reduction_pct,
            "jello_repair_pct": eval_res.jello_repair_pct,
            "required_crop_ratio": eval_res.required_crop_ratio,
            "effective_crop_ratio": eval_res.effective_crop_ratio,
            "zoom_compensation_ratio": eval_res.zoom_compensation_ratio,
            "border_clipping_risk": eval_res.border_clipping_risk,
        },
        "ffmpeg": {
            "pass1_vidstabdetect": compiled.pass1_vidstabdetect,
            "pass2_vidstabtransform": compiled.pass2_vidstabtransform,
            "deshake_fallback_vf": compiled.deshake_fallback_vf,
            "rolling_shutter_vf": compiled.rolling_shutter_vf,
            "crop_scale_vf": compiled.crop_scale_vf,
            "vf_chain": compiled.vf_chain,
        },
    }
    json_text = json.dumps(payload, indent=2)
    filename = f"{cleaned_title.lower()}_{config.preset_id}_stabilization_studio.json"
    return StabilizationStudioExportResult(
        schema_version="taktcut.stabilization_studio.v1",
        title=cleaned_title,
        preset_id=config.preset_id,
        compatible_hosts=hosts,
        json_text=json_text,
        filename=filename,
    )


def apply_stabilization_studio_to_document(
    document: TimelineDocument,
    config: StabilizationStudioConfig,
    *,
    track_index: int = 1,
    clip_index: int = 0,
) -> TimelineDocument:
    """Attach ClipStabilizationStudioTrack non-destructively onto target video clip."""
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
    clip_dur_s = max(0.25, float(target_clip.duration_frames) / max(1.0, doc_fps))
    scoped_cfg = config.model_copy(
        update={
            "width": int(next_doc.width),
            "height": int(next_doc.height),
            "fps": round(doc_fps, 3),
            "duration_s": round(clip_dur_s, 4),
        }
    )
    eval_res = evaluate_stabilization_studio(scoped_cfg, sample_count=33)
    compiled = compile_stabilization_studio_filtergraph(scoped_cfg)

    target_clip.stabilization_studio = ClipStabilizationStudioTrack(
        enabled=scoped_cfg.enabled,
        preset_id=scoped_cfg.preset_id,
        mode=scoped_cfg.mode,
        smoothing_pct=scoped_cfg.smoothing_pct,
        strength_pct=scoped_cfg.strength_pct,
        crop_ratio_min=scoped_cfg.crop_ratio_min,
        auto_zoom_fill=scoped_cfg.auto_zoom_fill,
        rolling_shutter_skew_ms=scoped_cfg.rolling_shutter_skew_ms,
        edge_mode=scoped_cfg.edge_mode,
        raw_rms_px=eval_res.raw_rms_px,
        stabilized_rms_px=eval_res.stabilized_rms_px,
        jitter_reduction_pct=eval_res.jitter_reduction_pct,
        zoom_compensation_ratio=eval_res.zoom_compensation_ratio,
        ffmpeg_vf=compiled.vf_chain[:16384],
        ffmpeg_pass1_vf=compiled.pass1_vidstabdetect[:4096],
    )
    return next_doc
