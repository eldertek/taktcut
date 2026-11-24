"""Boris FX Sapphire S_Shake & DaVinci ResolveFX Camera Shake / Lens Distortion Studio.

Provides strictly typed Pydantic v2 models, deterministic multi-octave procedural
handheld motion path simulation (64-frame X/Y/Tilt/Zoom curve), radial barrel/pincushion
lens distortion corner shift and safe-crop overscan telemetry, FFmpeg filtergraph
compilation (lenscorrection, procedural shake crop/rotate/scale, tmix shutter motion
blur, and rgbashift chromatic fringe), JSON export (taktcut.camera_shake_studio.v1),
and non-destructive TimelineClip attachment for:
- Presets: handheld_docu, action_impact_punch, earthquake_rumble,
  anamorphic_barrel_warp, subtle_breathing_tripod, custom.
- Edge Modes: reflect, crop_zoom, wrap.
"""

from __future__ import annotations

import json
import math
import re
from collections.abc import Mapping
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from taktcut.models import ClipCameraShakeTrack, TimelineDocument

CameraShakePresetId = Literal[
    "handheld_docu",
    "action_impact_punch",
    "earthquake_rumble",
    "anamorphic_barrel_warp",
    "subtle_breathing_tripod",
    "custom",
]

CameraShakeEdgeMode = Literal["reflect", "crop_zoom", "wrap"]

CAMERA_SHAKE_CURVE_FRAMES = 64

ALLOWED_CAMERA_SHAKE_PRESETS: tuple[CameraShakePresetId, ...] = (
    "handheld_docu",
    "action_impact_punch",
    "earthquake_rumble",
    "anamorphic_barrel_warp",
    "subtle_breathing_tripod",
    "custom",
)

ALLOWED_CAMERA_SHAKE_EDGE_MODES: tuple[CameraShakeEdgeMode, ...] = (
    "reflect",
    "crop_zoom",
    "wrap",
)

_PRESET_MAP: dict[str, CameraShakePresetId] = {p: p for p in ALLOWED_CAMERA_SHAKE_PRESETS}
_EDGE_MODE_MAP: dict[str, CameraShakeEdgeMode] = {
    m: m for m in ALLOWED_CAMERA_SHAKE_EDGE_MODES
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
        raise ValueError(f"{field_name} must be an integer in [{lo}, {hi}], got {raw!r}")
    fval = float(raw)
    if not math.isfinite(fval):
        raise ValueError(f"{field_name} must be finite, got {raw!r}")
    ival = int(round(fval))
    if ival < lo or ival > hi:
        raise ValueError(f"{field_name} must be in [{lo}, {hi}], got {raw!r}")
    return ival


def _validate_bool(raw: Any, field_name: str) -> bool:
    if not isinstance(raw, bool):
        raise ValueError(f"{field_name} must be a boolean, got {raw!r}")
    return raw


class CameraShakeStudioConfig(BaseModel):
    """Complete Camera Shake, Handheld Motion & Lens Distortion configuration."""

    model_config = ConfigDict(extra="ignore")

    enabled: bool = True
    preset: CameraShakePresetId = "handheld_docu"
    amplitude_px: float = Field(default=18.0, ge=0.0, le=120.0)
    frequency_hz: float = Field(default=1.8, ge=0.1, le=20.0)
    z_zoom_pct: float = Field(default=3.5, ge=0.0, le=25.0)
    tilt_deg: float = Field(default=1.8, ge=0.0, le=15.0)
    octaves: int = Field(default=4, ge=1, le=6)
    motion_blur_shutter_deg: float = Field(default=180.0, ge=0.0, le=360.0)
    edge_mode: CameraShakeEdgeMode = "reflect"
    lens_k1: float = Field(default=0.0, ge=-0.5, le=0.5)
    lens_k2: float = Field(default=0.0, ge=-0.25, le=0.25)
    chromatic_fringe_px: float = Field(default=0.6, ge=0.0, le=10.0)
    seed: int = Field(default=1042, ge=0, le=99999)
    compare_split: bool = True
    split_position: float = Field(default=0.5, ge=0.0, le=1.0)
    width: int = Field(default=1920, ge=320, le=7680)
    height: int = Field(default=1080, ge=240, le=4320)
    fps: float = Field(default=24.0, ge=1.0, le=120.0)

    @field_validator("enabled", "compare_split", mode="before")
    @classmethod
    def _val_bool(cls, raw: Any, info: Any) -> bool:
        return _validate_bool(raw, str(info.field_name))

    @field_validator("preset", mode="before")
    @classmethod
    def _val_preset(cls, raw: Any) -> CameraShakePresetId:
        if not isinstance(raw, str):
            raise ValueError(f"preset must be a string, got {raw!r}")
        cleaned = _PRESET_MAP.get(raw.strip().lower())
        if cleaned is None:
            allowed = ", ".join(ALLOWED_CAMERA_SHAKE_PRESETS)
            raise ValueError(f"Unsupported preset {raw!r}; expected: {allowed}")
        return cleaned

    @field_validator("edge_mode", mode="before")
    @classmethod
    def _val_edge_mode(cls, raw: Any) -> CameraShakeEdgeMode:
        if not isinstance(raw, str):
            raise ValueError(f"edge_mode must be a string, got {raw!r}")
        cleaned = _EDGE_MODE_MAP.get(raw.strip().lower())
        if cleaned is None:
            allowed = ", ".join(ALLOWED_CAMERA_SHAKE_EDGE_MODES)
            raise ValueError(f"Unsupported edge_mode {raw!r}; expected: {allowed}")
        return cleaned

    @field_validator("amplitude_px", mode="before")
    @classmethod
    def _val_amplitude(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "amplitude_px", 0.0, 120.0), 2)

    @field_validator("frequency_hz", mode="before")
    @classmethod
    def _val_frequency(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "frequency_hz", 0.1, 20.0), 3)

    @field_validator("z_zoom_pct", mode="before")
    @classmethod
    def _val_z_zoom(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "z_zoom_pct", 0.0, 25.0), 2)

    @field_validator("tilt_deg", mode="before")
    @classmethod
    def _val_tilt(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "tilt_deg", 0.0, 15.0), 3)

    @field_validator("octaves", mode="before")
    @classmethod
    def _val_octaves(cls, raw: Any) -> int:
        return _validate_bounded_int(raw, "octaves", 1, 6)

    @field_validator("motion_blur_shutter_deg", mode="before")
    @classmethod
    def _val_shutter(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "motion_blur_shutter_deg", 0.0, 360.0), 1)

    @field_validator("lens_k1", mode="before")
    @classmethod
    def _val_k1(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "lens_k1", -0.5, 0.5), 4)

    @field_validator("lens_k2", mode="before")
    @classmethod
    def _val_k2(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "lens_k2", -0.25, 0.25), 4)

    @field_validator("chromatic_fringe_px", mode="before")
    @classmethod
    def _val_fringe(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "chromatic_fringe_px", 0.0, 10.0), 2)

    @field_validator("seed", mode="before")
    @classmethod
    def _val_seed(cls, raw: Any) -> int:
        return _validate_bounded_int(raw, "seed", 0, 99999)

    @field_validator("split_position", mode="before")
    @classmethod
    def _val_split(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "split_position", 0.0, 1.0), 4)

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


class CameraShakeStudioPreset(BaseModel):
    """Curated Boris FX Sapphire S_Shake & DaVinci ResolveFX Camera Shake preset."""

    preset: CameraShakePresetId
    label: str
    description: str
    default_config: CameraShakeStudioConfig


class CameraShakeMotionSample(BaseModel):
    """Single frame sample along the procedural multi-octave camera shake trajectory."""

    frame: int
    time_sec: float
    x_px: float
    y_px: float
    tilt_deg: float
    zoom: float
    velocity_px_s: float


class CameraShakeStudioEvaluateResult(BaseModel):
    """Deterministic 64-frame camera motion path and lens distortion telemetry."""

    enabled: bool
    preset: CameraShakePresetId
    edge_mode: CameraShakeEdgeMode
    peak_velocity_px_s: float
    rms_displacement_px: float
    required_safe_crop_pct: float
    radial_distortion_corner_shift_pct: float
    shutter_blur_frames: int
    chromatic_fringe_px: float
    frame_count: int
    motion_samples: list[CameraShakeMotionSample]


class CameraShakeStudioCompileResult(BaseModel):
    """Compiled FFmpeg lens correction, procedural shake, motion blur, and CA pipeline."""

    enabled: bool
    preset: CameraShakePresetId
    edge_mode: CameraShakeEdgeMode
    lens_vf: str
    shake_vf: str
    motion_blur_vf: str
    aberration_vf: str
    filter_complex: str
    vf_chain: str
    ffmpeg_command: str
    warnings: list[str]


class CameraShakeStudioExportResult(BaseModel):
    """Serialized taktcut.camera_shake_studio.v1 JSON payload."""

    schema_version: str
    title: str
    preset: CameraShakePresetId
    compatible_hosts: list[str]
    json_text: str
    filename: str
    saved_path: str | None = None


_CAMERA_SHAKE_PRESETS: tuple[CameraShakeStudioPreset, ...] = (
    CameraShakeStudioPreset(
        preset="handheld_docu",
        label="Handheld Documentary",
        description=(
            "Organic 16mm shoulder-rig camera drift with subtle roll and natural 180 deg shutter."
        ),
        default_config=CameraShakeStudioConfig(
            enabled=True,
            preset="handheld_docu",
            amplitude_px=18.0,
            frequency_hz=1.8,
            z_zoom_pct=3.5,
            tilt_deg=1.8,
            octaves=4,
            motion_blur_shutter_deg=180.0,
            edge_mode="reflect",
            lens_k1=0.0,
            lens_k2=0.0,
            chromatic_fringe_px=0.6,
            seed=1042,
        ),
    ),
    CameraShakeStudioPreset(
        preset="action_impact_punch",
        label="Action Impact Punch",
        description=(
            "High-energy kinetic impact shake with Z-zoom punch, tilted roll, and 270 deg blur."
        ),
        default_config=CameraShakeStudioConfig(
            enabled=True,
            preset="action_impact_punch",
            amplitude_px=58.0,
            frequency_hz=8.5,
            z_zoom_pct=10.0,
            tilt_deg=6.5,
            octaves=5,
            motion_blur_shutter_deg=270.0,
            edge_mode="crop_zoom",
            lens_k1=-0.06,
            lens_k2=-0.02,
            chromatic_fringe_px=2.8,
            seed=7731,
        ),
    ),
    CameraShakeStudioPreset(
        preset="earthquake_rumble",
        label="Earthquake Rumble",
        description=(
            "Heavy multi-octave seismic vibration across X/Y/Z/Roll with wide shutter trail."
        ),
        default_config=CameraShakeStudioConfig(
            enabled=True,
            preset="earthquake_rumble",
            amplitude_px=76.0,
            frequency_hz=13.5,
            z_zoom_pct=12.5,
            tilt_deg=8.2,
            octaves=6,
            motion_blur_shutter_deg=300.0,
            edge_mode="reflect",
            lens_k1=-0.04,
            lens_k2=0.01,
            chromatic_fringe_px=3.4,
            seed=4096,
        ),
    ),
    CameraShakeStudioPreset(
        preset="anamorphic_barrel_warp",
        label="Anamorphic Barrel Warp",
        description=(
            "Wide-angle optical barrel distortion with lateral chromatic fringe and gentle drift."
        ),
        default_config=CameraShakeStudioConfig(
            enabled=True,
            preset="anamorphic_barrel_warp",
            amplitude_px=10.0,
            frequency_hz=1.1,
            z_zoom_pct=4.0,
            tilt_deg=0.9,
            octaves=3,
            motion_blur_shutter_deg=180.0,
            edge_mode="crop_zoom",
            lens_k1=-0.28,
            lens_k2=-0.09,
            chromatic_fringe_px=4.6,
            seed=2026,
        ),
    ),
    CameraShakeStudioPreset(
        preset="subtle_breathing_tripod",
        label="Subtle Breathing Tripod",
        description=(
            "Telephoto tripod micro-sway and gentle operator breathing with zero distortion."
        ),
        default_config=CameraShakeStudioConfig(
            enabled=True,
            preset="subtle_breathing_tripod",
            amplitude_px=5.0,
            frequency_hz=0.65,
            z_zoom_pct=1.2,
            tilt_deg=0.4,
            octaves=2,
            motion_blur_shutter_deg=144.0,
            edge_mode="reflect",
            lens_k1=0.0,
            lens_k2=0.0,
            chromatic_fringe_px=0.0,
            seed=512,
        ),
    ),
    CameraShakeStudioPreset(
        preset="custom",
        label="Custom Camera Rig",
        description="Balanced starting point for Sapphire S_Shake and ResolveFX Lens Distortion.",
        default_config=CameraShakeStudioConfig(
            enabled=True,
            preset="custom",
            amplitude_px=24.0,
            frequency_hz=2.8,
            z_zoom_pct=4.5,
            tilt_deg=2.4,
            octaves=4,
            motion_blur_shutter_deg=180.0,
            edge_mode="reflect",
            lens_k1=-0.05,
            lens_k2=0.0,
            chromatic_fringe_px=1.2,
            seed=1337,
        ),
    ),
)

_PRESETS_BY_ID: dict[CameraShakePresetId, CameraShakeStudioPreset] = {
    p.preset: p for p in _CAMERA_SHAKE_PRESETS
}


def list_camera_shake_presets() -> list[CameraShakeStudioPreset]:
    """Return all curated Camera Shake, Handheld Motion & Lens Distortion presets."""
    return [p.model_copy(deep=True) for p in _CAMERA_SHAKE_PRESETS]


def get_camera_shake_preset(preset_id: str) -> CameraShakeStudioPreset:
    """Lookup one camera shake preset by identifier."""
    cleaned = _PRESET_MAP.get(str(preset_id).strip().lower())
    if cleaned is None:
        allowed = ", ".join(ALLOWED_CAMERA_SHAKE_PRESETS)
        raise ValueError(f"Unsupported camera shake preset {preset_id!r}; expected: {allowed}")
    return _PRESETS_BY_ID[cleaned].model_copy(deep=True)


def normalize_camera_shake_config(raw: Any) -> CameraShakeStudioConfig:
    """Validate and normalize an untrusted camera shake studio payload."""
    if isinstance(raw, CameraShakeStudioConfig):
        return raw.model_copy(deep=True)
    if raw is None:
        return CameraShakeStudioConfig()
    if not isinstance(raw, Mapping):
        raise ValueError(f"Camera shake config must be a mapping, got {type(raw).__name__}")
    data = dict(raw)
    preset_raw = data.get("preset")
    if isinstance(preset_raw, str) and preset_raw.strip().lower() in _PRESET_MAP:
        pid = _PRESET_MAP[preset_raw.strip().lower()]
        base = _PRESETS_BY_ID[pid].default_config.model_dump()
        base.update(data)
        return CameraShakeStudioConfig.model_validate(base)
    return CameraShakeStudioConfig.model_validate(data)


def _fbm_channel(
    t_sec: float,
    freq_hz: float,
    octaves: int,
    seed: int,
    channel_salt: float,
) -> float:
    """Deterministic multi-octave harmonic fBm signal in [-1.0, 1.0]."""
    total = 0.0
    norm = 0.0
    seed_f = float(seed % 100000)
    for octave in range(octaves):
        lacunarity = (1.92**octave)
        gain = (0.54**octave)
        phase = (
            seed_f * (0.0173 * (octave + 1) + channel_salt * 0.0091)
            + octave * 2.137
            + channel_salt * 1.419
        )
        omega = 2.0 * math.pi * freq_hz * lacunarity
        wave = 0.68 * math.sin(omega * t_sec + phase) + 0.32 * math.cos(
            omega * 1.37 * t_sec - phase * 0.73
        )
        total += wave * gain
        norm += gain
    return _clamp(total / norm if norm > 0.0 else 0.0, -1.0, 1.0)


def evaluate_camera_shake_studio(
    config: CameraShakeStudioConfig,
    *,
    frame_count: int = CAMERA_SHAKE_CURVE_FRAMES,
) -> CameraShakeStudioEvaluateResult:
    """Evaluate deterministic 64-frame camera motion curve and lens distortion telemetry."""
    n = max(16, min(240, int(frame_count)))
    fps = max(1.0, float(config.fps))
    dt = 1.0 / fps
    corner_shift_pct = round((config.lens_k1 + config.lens_k2) * 100.0, 2)
    shutter_blur_frames = (
        max(1, min(9, int(round(1.0 + (config.motion_blur_shutter_deg / 360.0) * 6.0))))
        if config.enabled and config.motion_blur_shutter_deg >= 30.0
        else 1
    )

    if not config.enabled:
        zero_samples = [
            CameraShakeMotionSample(
                frame=i,
                time_sec=round(i * dt, 4),
                x_px=0.0,
                y_px=0.0,
                tilt_deg=0.0,
                zoom=1.0,
                velocity_px_s=0.0,
            )
            for i in range(n)
        ]
        return CameraShakeStudioEvaluateResult(
            enabled=False,
            preset=config.preset,
            edge_mode=config.edge_mode,
            peak_velocity_px_s=0.0,
            rms_displacement_px=0.0,
            required_safe_crop_pct=0.0,
            radial_distortion_corner_shift_pct=0.0,
            shutter_blur_frames=1,
            chromatic_fringe_px=0.0,
            frame_count=n,
            motion_samples=zero_samples,
        )

    raw_points: list[tuple[int, float, float, float, float, float]] = []
    max_abs_x = 0.0
    max_abs_y = 0.0
    max_abs_tilt = 0.0
    sum_sq_disp = 0.0

    for i in range(n):
        t_sec = i * dt
        nx = _fbm_channel(t_sec, config.frequency_hz, config.octaves, config.seed, 1.0)
        ny = _fbm_channel(t_sec, config.frequency_hz * 0.91, config.octaves, config.seed, 2.3)
        nt = _fbm_channel(t_sec, config.frequency_hz * 0.67, config.octaves, config.seed, 3.7)
        nz = _fbm_channel(t_sec, config.frequency_hz * 0.53, config.octaves, config.seed, 5.1)

        x_px = config.amplitude_px * nx
        y_px = config.amplitude_px * 0.78 * ny
        tilt_deg = config.tilt_deg * nt
        zoom = 1.0 + (config.z_zoom_pct / 100.0) * (0.5 + 0.5 * nz)

        max_abs_x = max(max_abs_x, abs(x_px))
        max_abs_y = max(max_abs_y, abs(y_px))
        max_abs_tilt = max(max_abs_tilt, abs(tilt_deg))
        sum_sq_disp += x_px * x_px + y_px * y_px
        raw_points.append((i, t_sec, x_px, y_px, tilt_deg, zoom))

    samples: list[CameraShakeMotionSample] = []
    peak_vel = 0.0
    for idx, (frame_idx, t_sec, x_px, y_px, tilt_deg, zoom) in enumerate(raw_points):
        if idx == 0:
            prev_x, prev_y = x_px, y_px
        else:
            prev_x = raw_points[idx - 1][2]
            prev_y = raw_points[idx - 1][3]
        vel = math.hypot(x_px - prev_x, y_px - prev_y) / dt if idx > 0 else 0.0
        peak_vel = max(peak_vel, vel)
        samples.append(
            CameraShakeMotionSample(
                frame=frame_idx,
                time_sec=round(t_sec, 4),
                x_px=round(x_px, 2),
                y_px=round(y_px, 2),
                tilt_deg=round(tilt_deg, 3),
                zoom=round(zoom, 4),
                velocity_px_s=round(vel, 1),
            )
        )

    rms_disp = math.sqrt(sum_sq_disp / float(n))
    # Required safe crop % accounts for translation overscan + tilt corner expansion + lens warp
    trans_crop_pct = (
        max(
            (2.0 * max_abs_x) / float(config.width),
            (2.0 * max_abs_y) / float(config.height),
        )
        * 100.0
    )
    tilt_rad = math.radians(max_abs_tilt)
    aspect = float(config.width) / float(config.height)
    tilt_crop_pct = (
        (math.cos(tilt_rad) + aspect * math.sin(tilt_rad) - 1.0) * 100.0
        if max_abs_tilt > 0.0
        else 0.0
    )
    lens_crop_pct = max(0.0, -(config.lens_k1 + config.lens_k2) * 32.0)
    raw_safe_crop = (
        trans_crop_pct + tilt_crop_pct + lens_crop_pct + config.z_zoom_pct * 0.25
    )
    safe_crop_pct = round(_clamp(raw_safe_crop, 0.0, 48.0), 2)

    return CameraShakeStudioEvaluateResult(
        enabled=True,
        preset=config.preset,
        edge_mode=config.edge_mode,
        peak_velocity_px_s=round(peak_vel, 1),
        rms_displacement_px=round(rms_disp, 2),
        required_safe_crop_pct=safe_crop_pct,
        radial_distortion_corner_shift_pct=corner_shift_pct,
        shutter_blur_frames=shutter_blur_frames,
        chromatic_fringe_px=round(config.chromatic_fringe_px, 2),
        frame_count=n,
        motion_samples=samples,
    )


def compile_camera_shake_filtergraph(
    config: CameraShakeStudioConfig,
) -> CameraShakeStudioCompileResult:
    """Compile FFmpeg filtergraph for lens distortion, procedural camera shake, blur & CA."""
    if not config.enabled:
        return CameraShakeStudioCompileResult(
            enabled=False,
            preset=config.preset,
            edge_mode=config.edge_mode,
            lens_vf="null",
            shake_vf="null",
            motion_blur_vf="null",
            aberration_vf="null",
            filter_complex="[0:v]null[vout]",
            vf_chain="null",
            ffmpeg_command='ffmpeg -i input.mp4 -vf "null" -c:a copy output.mp4',
            warnings=[],
        )

    eval_res = evaluate_camera_shake_studio(config, frame_count=CAMERA_SHAKE_CURVE_FRAMES)

    # 1. Optical lens distortion (barrel / pincushion)
    if abs(config.lens_k1) >= 0.001 or abs(config.lens_k2) >= 0.001:
        lens_vf = (
            f"lenscorrection=cx=0.5:cy=0.5:k1={config.lens_k1:.4f}:k2={config.lens_k2:.4f}"
        )
    else:
        lens_vf = "null"

    # 2. Procedural multi-octave camera shake (overscan scale + animated crop + tilt rotate)
    overscan = round(
        1.0 + max(eval_res.required_safe_crop_pct, config.z_zoom_pct) / 100.0,
        4,
    )
    w_pad = int(round(config.width * overscan))
    h_pad = int(round(config.height * overscan))
    if w_pad % 2 != 0:
        w_pad += 1
    if h_pad % 2 != 0:
        h_pad += 1

    amp_x = round(config.amplitude_px, 2)
    amp_y = round(config.amplitude_px * 0.78, 2)
    omega = round(2.0 * math.pi * config.frequency_hz, 3)
    phase_x = round((config.seed % 997) * 0.0173, 3)
    phase_y = round((config.seed % 991) * 0.0231 + 1.4, 3)
    tilt_rad = round(math.radians(config.tilt_deg), 4)

    shake_parts: list[str] = []
    if config.amplitude_px > 0.0 or config.z_zoom_pct > 0.0 or config.tilt_deg > 0.0:
        if config.edge_mode == "crop_zoom":
            shake_parts.append(f"scale={w_pad}:{h_pad}:flags=lanczos")
        elif config.edge_mode == "wrap":
            shake_parts.append(f"scale={w_pad}:{h_pad}:flags=bilinear")
        else:
            shake_parts.append(f"scale={w_pad}:{h_pad}:flags=bicubic")

        if config.amplitude_px > 0.0:
            cx_expr = (
                f"(iw-{config.width})/2+{amp_x:.2f}*(0.65*sin({omega:.3f}*t+{phase_x:.3f})"
                f"+0.35*sin({omega * 1.92:.3f}*t+{phase_x * 1.7:.3f}))"
            )
            cy_expr = (
                f"(ih-{config.height})/2+{amp_y:.2f}*(0.65*sin({omega * 0.91:.3f}*t+{phase_y:.3f})"
                f"+0.35*cos({omega * 1.75:.3f}*t+{phase_y * 1.3:.3f}))"
            )
            shake_parts.append(f"crop={config.width}:{config.height}:x='{cx_expr}':y='{cy_expr}'")
        else:
            shake_parts.append(f"crop={config.width}:{config.height}")

        if config.tilt_deg >= 0.05:
            rot_expr = f"{tilt_rad:.4f}*sin({omega * 0.67:.3f}*t+{phase_x:.3f})"
            shake_parts.append(f"rotate='{rot_expr}':ow={config.width}:oh={config.height}:fillcolor=black")

    shake_vf = ",".join(shake_parts) if shake_parts else "null"

    # 3. Shutter-angle temporal motion blur
    if config.motion_blur_shutter_deg >= 30.0 and eval_res.shutter_blur_frames > 1:
        fcount = eval_res.shutter_blur_frames
        weights = " ".join(str(max(1, fcount - i)) for i in range(fcount))
        motion_blur_vf = f"tmix=frames={fcount}:weights='{weights}'"
    else:
        motion_blur_vf = "null"

    # 4. Lateral chromatic fringe
    if config.chromatic_fringe_px >= 0.5:
        shift_px = max(1, int(round(config.chromatic_fringe_px)))
        aberration_vf = f"rgbashift=rh={shift_px}:bh={-shift_px}:edge=smear"
    else:
        aberration_vf = "null"

    chain_parts = [
        p
        for p in (lens_vf, shake_vf, motion_blur_vf, aberration_vf)
        if p != "null"
    ]
    vf_chain = ",".join(chain_parts) if chain_parts else "null"
    filter_complex = f"[0:v]{vf_chain}[vout]"

    warnings: list[str] = []
    if eval_res.required_safe_crop_pct >= 18.0:
        warnings.append(
            f"High safe crop ({eval_res.required_safe_crop_pct:.1f}%) softens fine edge detail."
        )
    if abs(config.lens_k1) >= 0.35:
        warnings.append(
            "Strong radial lens distortion (|k1| >= 0.35) heavily stretches frame corners."
        )
    if config.motion_blur_shutter_deg >= 300.0:
        warnings.append(
            "Wide shutter angle (>= 300 deg) produces heavy temporal motion smearing."
        )

    cmd = (
        f'ffmpeg -i input.mp4 -filter_complex "{filter_complex}" '
        f'-map "[vout]" -map 0:a? -c:a copy output.mp4'
    )
    return CameraShakeStudioCompileResult(
        enabled=True,
        preset=config.preset,
        edge_mode=config.edge_mode,
        lens_vf=lens_vf,
        shake_vf=shake_vf,
        motion_blur_vf=motion_blur_vf,
        aberration_vf=aberration_vf,
        filter_complex=filter_complex,
        vf_chain=vf_chain,
        ffmpeg_command=cmd,
        warnings=warnings,
    )


def export_camera_shake_json(
    config: CameraShakeStudioConfig,
    *,
    title: str = "TAKTCUT_CAMERA_SHAKE_STUDIO",
) -> CameraShakeStudioExportResult:
    """Export Camera Shake, Handheld Motion & Lens Distortion configuration as JSON."""
    cleaned_title = _SAFE_TITLE_RE.sub(
        "_", str(title or "TAKTCUT_CAMERA_SHAKE_STUDIO").strip()
    ).strip("_")
    if not cleaned_title:
        cleaned_title = "TAKTCUT_CAMERA_SHAKE_STUDIO"

    eval_res = evaluate_camera_shake_studio(config, frame_count=CAMERA_SHAKE_CURVE_FRAMES)
    compiled = compile_camera_shake_filtergraph(config)
    hosts = [
        "Boris FX Sapphire S_Shake / S_Distort",
        "DaVinci ResolveFX Camera Shake & Lens Distortion",
        "Adobe After Effects Wiggler & Optics Compensation",
        "FFmpeg Procedural Camera Shake & Lens Correction Pipeline",
    ]
    payload = {
        "schema_version": "taktcut.camera_shake_studio.v1",
        "title": cleaned_title,
        "preset": config.preset,
        "compatible_hosts": hosts,
        "camera_shake": {
            "enabled": config.enabled,
            "preset": config.preset,
            "amplitude_px": config.amplitude_px,
            "frequency_hz": config.frequency_hz,
            "z_zoom_pct": config.z_zoom_pct,
            "tilt_deg": config.tilt_deg,
            "octaves": config.octaves,
            "motion_blur_shutter_deg": config.motion_blur_shutter_deg,
            "edge_mode": config.edge_mode,
            "lens_k1": config.lens_k1,
            "lens_k2": config.lens_k2,
            "chromatic_fringe_px": config.chromatic_fringe_px,
            "seed": config.seed,
        },
        "metrics": {
            "peak_velocity_px_s": eval_res.peak_velocity_px_s,
            "rms_displacement_px": eval_res.rms_displacement_px,
            "required_safe_crop_pct": eval_res.required_safe_crop_pct,
            "radial_distortion_corner_shift_pct": eval_res.radial_distortion_corner_shift_pct,
            "shutter_blur_frames": eval_res.shutter_blur_frames,
            "chromatic_fringe_px": eval_res.chromatic_fringe_px,
            "frame_count": eval_res.frame_count,
        },
        "motion_samples": [s.model_dump(mode="json") for s in eval_res.motion_samples],
        "ffmpeg": {
            "lens_vf": compiled.lens_vf,
            "shake_vf": compiled.shake_vf,
            "motion_blur_vf": compiled.motion_blur_vf,
            "aberration_vf": compiled.aberration_vf,
            "filter_complex": compiled.filter_complex,
            "vf_chain": compiled.vf_chain,
        },
    }
    json_text = json.dumps(payload, indent=2)
    filename = f"{cleaned_title.lower()}_{config.preset}_camera_shake_studio.json"
    return CameraShakeStudioExportResult(
        schema_version="taktcut.camera_shake_studio.v1",
        title=cleaned_title,
        preset=config.preset,
        compatible_hosts=hosts,
        json_text=json_text,
        filename=filename,
    )


def apply_camera_shake_to_document(
    document: TimelineDocument,
    config: CameraShakeStudioConfig,
    *,
    track_index: int = 1,
    clip_index: int = 0,
) -> TimelineDocument:
    """Attach ClipCameraShakeTrack non-destructively onto target video clip."""
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
    scoped_cfg = config.model_copy(
        update={
            "width": int(next_doc.width),
            "height": int(next_doc.height),
            "fps": round(doc_fps, 3),
        }
    )
    eval_res = evaluate_camera_shake_studio(
        scoped_cfg, frame_count=CAMERA_SHAKE_CURVE_FRAMES
    )
    compiled = compile_camera_shake_filtergraph(scoped_cfg)

    target_clip.camera_shake = ClipCameraShakeTrack(
        enabled=scoped_cfg.enabled,
        preset=scoped_cfg.preset,
        amplitude_px=scoped_cfg.amplitude_px,
        frequency_hz=scoped_cfg.frequency_hz,
        z_zoom_pct=scoped_cfg.z_zoom_pct,
        tilt_deg=scoped_cfg.tilt_deg,
        octaves=scoped_cfg.octaves,
        motion_blur_shutter_deg=scoped_cfg.motion_blur_shutter_deg,
        edge_mode=scoped_cfg.edge_mode,
        lens_k1=scoped_cfg.lens_k1,
        lens_k2=scoped_cfg.lens_k2,
        chromatic_fringe_px=scoped_cfg.chromatic_fringe_px,
        seed=scoped_cfg.seed,
        peak_velocity_px_s=eval_res.peak_velocity_px_s,
        required_safe_crop_pct=eval_res.required_safe_crop_pct,
        radial_distortion_corner_shift_pct=eval_res.radial_distortion_corner_shift_pct,
        ffmpeg_vf=compiled.filter_complex[:16384],
    )
    return next_doc
