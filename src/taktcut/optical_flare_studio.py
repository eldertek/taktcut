"""Boris FX Sapphire S_Glow / S_LensFlare & DaVinci ResolveFX Lens Reflections/Halation Studio.

Provides strictly typed Pydantic v2 models, deterministic optical bloom radial falloff
and coaxial ghost-ring simulation, chromatic aberration / anamorphic streak aspect /
halation scatter energy telemetry, FFmpeg filtergraph compilation (curves highlight
isolation, anisotropic gblur, halation colorbalance, rgbashift chromatic fringe, and
screen/addition/softlight blend), JSON export (taktcut.optical_flare_studio.v1), and
non-destructive TimelineClip attachment for:
- Presets: anamorphic_blue_streak, warm_cinema_halation, golden_hour_sun_flare,
  neon_cyber_bloom, subtle_pro_mist_1_4, custom.
- Blend Modes: screen, add, softlight.
"""

from __future__ import annotations

import json
import math
import re
from collections.abc import Mapping
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from taktcut.models import ClipOpticalFlareTrack, TimelineDocument

OpticalFlarePresetId = Literal[
    "anamorphic_blue_streak",
    "warm_cinema_halation",
    "golden_hour_sun_flare",
    "neon_cyber_bloom",
    "subtle_pro_mist_1_4",
    "custom",
]

OpticalFlareBlendMode = Literal["screen", "add", "softlight"]
OpticalFlareGhostKind = Literal["ring", "hex", "halo", "orb"]

OPTICAL_FLARE_FALLOFF_SAMPLES = 33

ALLOWED_OPTICAL_FLARE_PRESETS: tuple[OpticalFlarePresetId, ...] = (
    "anamorphic_blue_streak",
    "warm_cinema_halation",
    "golden_hour_sun_flare",
    "neon_cyber_bloom",
    "subtle_pro_mist_1_4",
    "custom",
)

ALLOWED_OPTICAL_FLARE_BLEND_MODES: tuple[OpticalFlareBlendMode, ...] = (
    "screen",
    "add",
    "softlight",
)

_PRESET_MAP: dict[str, OpticalFlarePresetId] = {p: p for p in ALLOWED_OPTICAL_FLARE_PRESETS}
_BLEND_MODE_MAP: dict[str, OpticalFlareBlendMode] = {
    m: m for m in ALLOWED_OPTICAL_FLARE_BLEND_MODES
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


def _hsv_to_rgb_255(hue_deg: float, sat: float, val: float) -> tuple[int, int, int]:
    """Convert HSV (hue 0..360, sat 0..1, val 0..1) to 8-bit RGB."""
    h = (hue_deg % 360.0) / 60.0
    s = _clamp(sat, 0.0, 1.0)
    v = _clamp(val, 0.0, 1.0)
    c = v * s
    x = c * (1.0 - abs((h % 2.0) - 1.0))
    m = v - c
    if h < 1.0:
        r1, g1, b1 = c, x, 0.0
    elif h < 2.0:
        r1, g1, b1 = x, c, 0.0
    elif h < 3.0:
        r1, g1, b1 = 0.0, c, x
    elif h < 4.0:
        r1, g1, b1 = 0.0, x, c
    elif h < 5.0:
        r1, g1, b1 = x, 0.0, c
    else:
        r1, g1, b1 = c, 0.0, x
    return (
        int(round(_clamp((r1 + m) * 255.0, 0.0, 255.0))),
        int(round(_clamp((g1 + m) * 255.0, 0.0, 255.0))),
        int(round(_clamp((b1 + m) * 255.0, 0.0, 255.0))),
    )


def _rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"


class OpticalFlareStudioConfig(BaseModel):
    """Complete Optical Glow, Halation & Anamorphic Lens Flare configuration."""

    model_config = ConfigDict(extra="ignore")

    enabled: bool = True
    preset: OpticalFlarePresetId = "anamorphic_blue_streak"
    threshold_luma: float = Field(default=0.72, ge=0.1, le=0.98)
    glow_brightness: float = Field(default=1.35, ge=0.0, le=3.0)
    glow_width_px: float = Field(default=72.0, ge=4.0, le=240.0)
    anamorphic_stretch_x: float = Field(default=3.8, ge=1.0, le=6.0)
    color_tint_hue: float = Field(default=205.0, ge=0.0, le=360.0)
    halation_spread_px: float = Field(default=26.0, ge=0.0, le=120.0)
    flare_origin_x: float = Field(default=0.72, ge=0.0, le=1.0)
    flare_origin_y: float = Field(default=0.28, ge=0.0, le=1.0)
    flare_elements_count: int = Field(default=7, ge=0, le=12)
    ghost_intensity_pct: float = Field(default=62.0, ge=0.0, le=100.0)
    aberration_px: float = Field(default=3.2, ge=0.0, le=12.0)
    blend_mode: OpticalFlareBlendMode = "screen"
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
    def _val_preset(cls, raw: Any) -> OpticalFlarePresetId:
        if not isinstance(raw, str):
            raise ValueError(f"preset must be a string, got {raw!r}")
        cleaned = _PRESET_MAP.get(raw.strip().lower())
        if cleaned is None:
            allowed = ", ".join(ALLOWED_OPTICAL_FLARE_PRESETS)
            raise ValueError(f"Unsupported preset {raw!r}; expected: {allowed}")
        return cleaned

    @field_validator("blend_mode", mode="before")
    @classmethod
    def _val_blend_mode(cls, raw: Any) -> OpticalFlareBlendMode:
        if not isinstance(raw, str):
            raise ValueError(f"blend_mode must be a string, got {raw!r}")
        cleaned = _BLEND_MODE_MAP.get(raw.strip().lower())
        if cleaned is None:
            allowed = ", ".join(ALLOWED_OPTICAL_FLARE_BLEND_MODES)
            raise ValueError(f"Unsupported blend_mode {raw!r}; expected: {allowed}")
        return cleaned

    @field_validator("threshold_luma", mode="before")
    @classmethod
    def _val_threshold(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "threshold_luma", 0.1, 0.98), 4)

    @field_validator("glow_brightness", mode="before")
    @classmethod
    def _val_glow_brightness(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "glow_brightness", 0.0, 3.0), 3)

    @field_validator("glow_width_px", mode="before")
    @classmethod
    def _val_glow_width(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "glow_width_px", 4.0, 240.0), 2)

    @field_validator("anamorphic_stretch_x", mode="before")
    @classmethod
    def _val_stretch_x(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "anamorphic_stretch_x", 1.0, 6.0), 3)

    @field_validator("color_tint_hue", mode="before")
    @classmethod
    def _val_hue(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "color_tint_hue", 0.0, 360.0), 2)

    @field_validator("halation_spread_px", mode="before")
    @classmethod
    def _val_halation_spread(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "halation_spread_px", 0.0, 120.0), 2)

    @field_validator("flare_origin_x", "flare_origin_y", "split_position", mode="before")
    @classmethod
    def _val_unit_norm(cls, raw: Any, info: Any) -> float:
        return round(_validate_bounded_float(raw, str(info.field_name), 0.0, 1.0), 4)

    @field_validator("flare_elements_count", mode="before")
    @classmethod
    def _val_elements_count(cls, raw: Any) -> int:
        return _validate_bounded_int(raw, "flare_elements_count", 0, 12)

    @field_validator("ghost_intensity_pct", mode="before")
    @classmethod
    def _val_ghost_intensity(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "ghost_intensity_pct", 0.0, 100.0), 2)

    @field_validator("aberration_px", mode="before")
    @classmethod
    def _val_aberration(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "aberration_px", 0.0, 12.0), 2)

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


class OpticalFlareStudioPreset(BaseModel):
    """Curated Boris FX Sapphire S_Glow / S_LensFlare & DaVinci ResolveFX optical preset."""

    preset: OpticalFlarePresetId
    label: str
    description: str
    default_config: OpticalFlareStudioConfig


class OpticalFlareFalloffSample(BaseModel):
    """Single radial bloom, anamorphic streak, and halation scatter falloff sample."""

    radius_norm: float
    radius_px: float
    core_bloom: float
    anamorphic_streak: float
    halation_red: float
    total_energy: float


class OpticalFlareGhostElement(BaseModel):
    """Single coaxial internal lens reflection / iris ghost element."""

    index: int
    t_axis: float
    x_norm: float
    y_norm: float
    radius_norm: float
    opacity: float
    kind: OpticalFlareGhostKind
    hue_deg: float
    color_hex: str


class OpticalFlareStudioEvaluateResult(BaseModel):
    """Deterministic optical bloom PSF falloff, ghost-ring layout, and optical telemetry."""

    enabled: bool
    preset: OpticalFlarePresetId
    blend_mode: OpticalFlareBlendMode
    peak_luminance_headroom_pct: float
    anamorphic_streak_aspect: float
    halation_energy_pct: float
    bloom_radius_px: float
    ghost_axis_angle_deg: float
    ghost_count: int
    chromatic_fringe_px: float
    tint_rgb: list[int]
    falloff_samples: list[OpticalFlareFalloffSample]
    ghost_elements: list[OpticalFlareGhostElement]


class OpticalFlareStudioCompileResult(BaseModel):
    """Compiled FFmpeg anisotropic optical bloom, halation, aberration, and blend pipeline."""

    enabled: bool
    preset: OpticalFlarePresetId
    blend_mode: OpticalFlareBlendMode
    threshold_vf: str
    bloom_blur_vf: str
    halation_vf: str
    aberration_vf: str
    blend_vf: str
    filter_complex: str
    vf_chain: str
    ffmpeg_command: str
    warnings: list[str]


class OpticalFlareStudioExportResult(BaseModel):
    """Serialized taktcut.optical_flare_studio.v1 JSON payload."""

    schema_version: str
    title: str
    preset: OpticalFlarePresetId
    compatible_hosts: list[str]
    json_text: str
    filename: str
    saved_path: str | None = None


_OPTICAL_FLARE_PRESETS: tuple[OpticalFlareStudioPreset, ...] = (
    OpticalFlareStudioPreset(
        preset="anamorphic_blue_streak",
        label="Anamorphic Blue Streak",
        description="2x scope cyan-blue horizontal streak with crisp coaxial iris ghosts.",
        default_config=OpticalFlareStudioConfig(
            enabled=True,
            preset="anamorphic_blue_streak",
            threshold_luma=0.72,
            glow_brightness=1.35,
            glow_width_px=72.0,
            anamorphic_stretch_x=3.8,
            color_tint_hue=205.0,
            halation_spread_px=26.0,
            flare_origin_x=0.72,
            flare_origin_y=0.28,
            flare_elements_count=7,
            ghost_intensity_pct=62.0,
            aberration_px=3.2,
            blend_mode="screen",
        ),
    ),
    OpticalFlareStudioPreset(
        preset="warm_cinema_halation",
        label="Warm Cinema Halation",
        description="35mm tungsten emulsion red-orange halation scatter with soft spherical bloom.",
        default_config=OpticalFlareStudioConfig(
            enabled=True,
            preset="warm_cinema_halation",
            threshold_luma=0.66,
            glow_brightness=1.05,
            glow_width_px=54.0,
            anamorphic_stretch_x=1.15,
            color_tint_hue=18.0,
            halation_spread_px=58.0,
            flare_origin_x=0.64,
            flare_origin_y=0.34,
            flare_elements_count=3,
            ghost_intensity_pct=34.0,
            aberration_px=1.6,
            blend_mode="screen",
        ),
    ),
    OpticalFlareStudioPreset(
        preset="golden_hour_sun_flare",
        label="Golden Hour Sun Flare",
        description=(
            "Warm backlit amber sun flare with 10 polygonal aperture ghosts and wide bloom."
        ),
        default_config=OpticalFlareStudioConfig(
            enabled=True,
            preset="golden_hour_sun_flare",
            threshold_luma=0.62,
            glow_brightness=1.75,
            glow_width_px=118.0,
            anamorphic_stretch_x=1.85,
            color_tint_hue=38.0,
            halation_spread_px=44.0,
            flare_origin_x=0.78,
            flare_origin_y=0.22,
            flare_elements_count=10,
            ghost_intensity_pct=78.0,
            aberration_px=4.4,
            blend_mode="add",
        ),
    ),
    OpticalFlareStudioPreset(
        preset="neon_cyber_bloom",
        label="Neon Cyber Bloom",
        description=(
            "Low-threshold magenta/cyan neon specular bloom with stretched anamorphic streaks."
        ),
        default_config=OpticalFlareStudioConfig(
            enabled=True,
            preset="neon_cyber_bloom",
            threshold_luma=0.44,
            glow_brightness=1.95,
            glow_width_px=96.0,
            anamorphic_stretch_x=2.65,
            color_tint_hue=315.0,
            halation_spread_px=38.0,
            flare_origin_x=0.28,
            flare_origin_y=0.32,
            flare_elements_count=8,
            ghost_intensity_pct=68.0,
            aberration_px=5.8,
            blend_mode="add",
        ),
    ),
    OpticalFlareStudioPreset(
        preset="subtle_pro_mist_1_4",
        label="Subtle Pro-Mist 1/4",
        description="Restrained optical diffusion filter halation preserving highlight roll-off.",
        default_config=OpticalFlareStudioConfig(
            enabled=True,
            preset="subtle_pro_mist_1_4",
            threshold_luma=0.76,
            glow_brightness=0.68,
            glow_width_px=42.0,
            anamorphic_stretch_x=1.0,
            color_tint_hue=34.0,
            halation_spread_px=32.0,
            flare_origin_x=0.58,
            flare_origin_y=0.38,
            flare_elements_count=2,
            ghost_intensity_pct=18.0,
            aberration_px=0.6,
            blend_mode="softlight",
        ),
    ),
    OpticalFlareStudioPreset(
        preset="custom",
        label="Custom Optical Rig",
        description="Balanced custom starting point for Sapphire S_Glow and Lens Reflections.",
        default_config=OpticalFlareStudioConfig(
            enabled=True,
            preset="custom",
            threshold_luma=0.70,
            glow_brightness=1.1,
            glow_width_px=64.0,
            anamorphic_stretch_x=2.0,
            color_tint_hue=195.0,
            halation_spread_px=24.0,
            flare_origin_x=0.68,
            flare_origin_y=0.32,
            flare_elements_count=5,
            ghost_intensity_pct=48.0,
            aberration_px=2.0,
            blend_mode="screen",
        ),
    ),
)

_PRESETS_BY_ID: dict[OpticalFlarePresetId, OpticalFlareStudioPreset] = {
    p.preset: p for p in _OPTICAL_FLARE_PRESETS
}


def list_optical_flare_presets() -> list[OpticalFlareStudioPreset]:
    """Return all curated Optical Glow, Halation & Anamorphic Lens Flare presets."""
    return [p.model_copy(deep=True) for p in _OPTICAL_FLARE_PRESETS]


def get_optical_flare_preset(preset_id: str) -> OpticalFlareStudioPreset:
    """Lookup one optical flare preset by identifier."""
    cleaned = _PRESET_MAP.get(str(preset_id).strip().lower())
    if cleaned is None:
        allowed = ", ".join(ALLOWED_OPTICAL_FLARE_PRESETS)
        raise ValueError(f"Unsupported optical flare preset {preset_id!r}; expected: {allowed}")
    return _PRESETS_BY_ID[cleaned].model_copy(deep=True)


def normalize_optical_flare_config(raw: Any) -> OpticalFlareStudioConfig:
    """Validate and normalize an untrusted optical flare studio payload."""
    if isinstance(raw, OpticalFlareStudioConfig):
        return raw.model_copy(deep=True)
    if raw is None:
        return OpticalFlareStudioConfig()
    if not isinstance(raw, Mapping):
        raise ValueError(f"Optical flare config must be a mapping, got {type(raw).__name__}")
    data = dict(raw)
    preset_raw = data.get("preset")
    if isinstance(preset_raw, str) and preset_raw.strip().lower() in _PRESET_MAP:
        pid = _PRESET_MAP[preset_raw.strip().lower()]
        base = _PRESETS_BY_ID[pid].default_config.model_dump()
        base.update(data)
        return OpticalFlareStudioConfig.model_validate(base)
    return OpticalFlareStudioConfig.model_validate(data)


def _generate_ghost_elements(config: OpticalFlareStudioConfig) -> list[OpticalFlareGhostElement]:
    """Deterministically place coaxial internal lens ghosts along the optical axis."""
    if not config.enabled or config.flare_elements_count <= 0 or config.ghost_intensity_pct <= 0.0:
        return []

    ox = config.flare_origin_x
    oy = config.flare_origin_y
    cx = 0.5
    cy = 0.5
    vx = cx - ox
    vy = cy - oy
    count = config.flare_elements_count
    intensity_scale = (config.ghost_intensity_pct / 100.0) * _clamp(
        0.35 + config.glow_brightness * 0.45, 0.1, 1.0
    )

    kinds: tuple[OpticalFlareGhostKind, ...] = ("halo", "hex", "ring", "orb")
    # Axis positions t span from near origin (0.32) past optical center to opposite quadrant
    elements: list[OpticalFlareGhostElement] = []
    for idx in range(count):
        frac = (idx + 0.5) / float(count)
        t_axis = round(0.32 + frac * 1.88, 4)
        gx = round(_clamp(ox + vx * t_axis, -0.15, 1.15), 4)
        gy = round(_clamp(oy + vy * t_axis, -0.15, 1.15), 4)

        # Deterministic optical radius modulation (larger outer rings, tighter mid-iris hexes)
        wave = 0.5 + 0.5 * math.sin((idx + 1) * 1.73 + 0.4)
        base_rad = 0.022 + wave * 0.068 + (config.glow_width_px / 240.0) * 0.028
        radius_norm = round(_clamp(base_rad, 0.015, 0.14), 4)

        # Opacity peaks near opposite side of frame and gently tapers at extremes
        dist_from_center = abs(t_axis - 1.15)
        op_falloff = max(0.25, 1.0 - dist_from_center * 0.42)
        opacity = round(_clamp(intensity_scale * op_falloff * (0.45 + 0.4 * wave), 0.04, 0.92), 4)

        # Chromatic dispersion shifts hue subtly across ghost elements
        hue_shift = (idx - count * 0.45) * (8.5 + config.aberration_px * 3.2)
        ghost_hue = round((config.color_tint_hue + hue_shift) % 360.0, 2)
        rgb = _hsv_to_rgb_255(ghost_hue, 0.78, 0.96)
        kind = kinds[idx % len(kinds)]

        elements.append(
            OpticalFlareGhostElement(
                index=idx,
                t_axis=t_axis,
                x_norm=gx,
                y_norm=gy,
                radius_norm=radius_norm,
                opacity=opacity,
                kind=kind,
                hue_deg=ghost_hue,
                color_hex=_rgb_to_hex(rgb),
            )
        )
    return elements


def evaluate_optical_flare_studio(
    config: OpticalFlareStudioConfig,
    *,
    sample_count: int = OPTICAL_FLARE_FALLOFF_SAMPLES,
) -> OpticalFlareStudioEvaluateResult:
    """Evaluate deterministic radial bloom falloff, ghost rings, and optical telemetry."""
    n = max(9, min(129, int(sample_count)))
    tint_rgb = list(_hsv_to_rgb_255(config.color_tint_hue, 0.76, 0.98))

    dx = 0.5 - config.flare_origin_x
    dy = 0.5 - config.flare_origin_y
    axis_angle_deg = round(math.degrees(math.atan2(dy, dx)), 2)

    if not config.enabled:
        zero_samples = [
            OpticalFlareFalloffSample(
                radius_norm=round(i / float(n - 1), 4),
                radius_px=round((i / float(n - 1)) * config.glow_width_px, 2),
                core_bloom=0.0,
                anamorphic_streak=0.0,
                halation_red=0.0,
                total_energy=0.0,
            )
            for i in range(n)
        ]
        return OpticalFlareStudioEvaluateResult(
            enabled=False,
            preset=config.preset,
            blend_mode=config.blend_mode,
            peak_luminance_headroom_pct=100.0,
            anamorphic_streak_aspect=1.0,
            halation_energy_pct=0.0,
            bloom_radius_px=0.0,
            ghost_axis_angle_deg=axis_angle_deg,
            ghost_count=0,
            chromatic_fringe_px=0.0,
            tint_rgb=tint_rgb,
            falloff_samples=zero_samples,
            ghost_elements=[],
        )

    # Effective highlight drive: lower threshold lets more specular area contribute
    threshold_drive = _clamp((1.05 - config.threshold_luma) / 0.95, 0.1, 1.0)
    blend_gain = {"screen": 0.88, "add": 1.18, "softlight": 0.64}[config.blend_mode]
    bloom_amp = _clamp(
        (config.glow_brightness / 3.0) * blend_gain * (0.55 + 0.45 * threshold_drive),
        0.0,
        1.4,
    )

    max_radius_px = max(
        8.0,
        config.glow_width_px * (1.0 + (config.anamorphic_stretch_x - 1.0) * 0.42),
    )
    sigma_core = max(2.0, config.glow_width_px * 0.28)
    sigma_streak = max(4.0, config.glow_width_px * config.anamorphic_stretch_x * 0.36)
    sigma_hal = (
        max(1.0, config.halation_spread_px * 0.48) if config.halation_spread_px > 0.0 else 1.0
    )
    hal_amp = (
        _clamp((config.halation_spread_px / 120.0) * (0.42 + 0.32 * threshold_drive), 0.0, 0.95)
        if config.halation_spread_px > 0.0
        else 0.0
    )
    streak_amp = _clamp(
        bloom_amp * (0.28 + 0.16 * (config.anamorphic_stretch_x - 1.0)),
        0.0,
        1.2,
    )

    samples: list[OpticalFlareFalloffSample] = []
    halation_integral = 0.0
    peak_total = 0.0
    for i in range(n):
        r_norm = i / float(n - 1)
        r_px = r_norm * max_radius_px

        # Dual-lobe optical PSF: Gaussian core + exponential atmospheric wing
        core = bloom_amp * (
            0.68 * math.exp(-0.5 * (r_px / sigma_core) ** 2)
            + 0.32 * math.exp(-r_px / (sigma_core * 1.9))
        )
        streak = (
            streak_amp * math.exp(-r_px / sigma_streak)
            if config.anamorphic_stretch_x > 1.02
            else core * 0.35
        )
        halation = (
            hal_amp
            * math.exp(-r_px / sigma_hal)
            * (0.35 + 0.65 * math.exp(-0.25 * (r_px / sigma_hal) ** 2))
            if config.halation_spread_px > 0.0
            else 0.0
        )
        total = _clamp(core + streak * 0.55 + halation * 0.45, 0.0, 1.5)
        peak_total = max(peak_total, total)
        halation_integral += halation

        samples.append(
            OpticalFlareFalloffSample(
                radius_norm=round(r_norm, 4),
                radius_px=round(r_px, 2),
                core_bloom=round(core, 4),
                anamorphic_streak=round(streak, 4),
                halation_red=round(halation, 4),
                total_energy=round(total, 4),
            )
        )

    ghosts = _generate_ghost_elements(config)
    # Peak luminance headroom remaining before hard white clip (100% = full headroom, 0% = clipping)
    headroom_pct = round(_clamp(100.0 - (peak_total * 62.0), 0.0, 100.0), 2)
    halation_energy_pct = round(_clamp((halation_integral / float(n)) * 185.0, 0.0, 100.0), 2)
    streak_aspect = round(config.anamorphic_stretch_x, 2)
    bloom_radius_px = round(max_radius_px, 1)

    return OpticalFlareStudioEvaluateResult(
        enabled=True,
        preset=config.preset,
        blend_mode=config.blend_mode,
        peak_luminance_headroom_pct=headroom_pct,
        anamorphic_streak_aspect=streak_aspect,
        halation_energy_pct=halation_energy_pct,
        bloom_radius_px=bloom_radius_px,
        ghost_axis_angle_deg=axis_angle_deg,
        ghost_count=len(ghosts),
        chromatic_fringe_px=round(config.aberration_px, 2),
        tint_rgb=tint_rgb,
        falloff_samples=samples,
        ghost_elements=ghosts,
    )


def compile_optical_flare_filtergraph(
    config: OpticalFlareStudioConfig,
) -> OpticalFlareStudioCompileResult:
    """Compile FFmpeg filter_complex for optical bloom, halation, aberration & blend."""
    if not config.enabled:
        return OpticalFlareStudioCompileResult(
            enabled=False,
            preset=config.preset,
            blend_mode=config.blend_mode,
            threshold_vf="null",
            bloom_blur_vf="null",
            halation_vf="null",
            aberration_vf="null",
            blend_vf="null",
            filter_complex="[0:v]null[vout]",
            vf_chain="null",
            ffmpeg_command='ffmpeg -i input.mp4 -vf "null" -c:a copy output.mp4',
            warnings=[],
        )

    # 1. Highlight isolation curve above threshold_luma
    t0 = round(_clamp(config.threshold_luma - 0.06, 0.04, 0.92), 3)
    t1 = round(_clamp(config.threshold_luma, 0.1, 0.98), 3)
    peak_gain = round(_clamp(0.45 + config.glow_brightness * 0.22, 0.1, 1.0), 3)
    threshold_vf = f"curves=all='0/0 {t0:.3f}/0 {t1:.3f}/0.12 1/{peak_gain:.3f}'"

    # 2. Anisotropic optical bloom (horizontal stretch modeled via sigma vs sigmaV)
    sigma_v = round(_clamp(config.glow_width_px * 0.22, 1.0, 60.0), 2)
    sigma_h = round(_clamp(sigma_v * config.anamorphic_stretch_x, 1.0, 220.0), 2)
    tr, tg, tb = _hsv_to_rgb_255(config.color_tint_hue, 0.65, 1.0)
    rs = round((tr / 255.0 - 0.5) * 0.45, 3)
    gs = round((tg / 255.0 - 0.5) * 0.45, 3)
    bs = round((tb / 255.0 - 0.5) * 0.45, 3)
    bloom_blur_vf = (
        f"gblur=sigma={sigma_h:.2f}:sigmaV={sigma_v:.2f},"
        f"colorbalance=rh={rs:.3f}:gh={gs:.3f}:bh={bs:.3f}"
    )

    # 3. Red-orange film halation scatter
    if config.halation_spread_px > 0.5:
        hal_sigma = round(_clamp(config.halation_spread_px * 0.35, 1.0, 48.0), 2)
        hal_red = round(_clamp((config.halation_spread_px / 120.0) * 0.42, 0.04, 0.42), 3)
        hal_gm = round(hal_red * 0.22, 3)
        hal_bm = round(-hal_red * 0.35, 3)
        halation_vf = (
            f"gblur=sigma={hal_sigma:.2f},"
            f"colorbalance=rm={hal_red:.3f}:gm={hal_gm:.3f}:bm={hal_bm:.3f}"
        )
    else:
        halation_vf = "null"

    # 4. Chromatic aberration optical fringe
    if config.aberration_px >= 0.5:
        shift_px = max(1, int(round(config.aberration_px)))
        aberration_vf = f"rgbashift=rh={shift_px}:bh={-shift_px}:edge=smear"
    else:
        aberration_vf = "null"

    # 5. Optical composite blend mode
    ff_blend_mode = {
        "screen": "screen",
        "add": "addition",
        "softlight": "softlight",
    }[config.blend_mode]
    blend_opacity = round(_clamp(config.glow_brightness / 2.2, 0.08, 1.0), 3)
    blend_vf = f"blend=all_mode={ff_blend_mode}:all_opacity={blend_opacity:.3f}"

    glow_branch_parts = [threshold_vf, bloom_blur_vf]
    if halation_vf != "null":
        glow_branch_parts.append(halation_vf)
    if aberration_vf != "null":
        glow_branch_parts.append(aberration_vf)
    glow_branch = ",".join(glow_branch_parts)

    filter_complex = (
        f"[0:v]split=2[base][hi];"
        f"[hi]{glow_branch}[bloom];"
        f"[base][bloom]{blend_vf}[vout]"
    )
    vf_chain = f"{threshold_vf},{bloom_blur_vf}"
    if aberration_vf != "null":
        vf_chain = f"{vf_chain},{aberration_vf}"

    warnings: list[str] = []
    if config.glow_brightness >= 2.2 and config.blend_mode == "add":
        warnings.append(
            "Additive blend with glow_brightness >= 2.2 may clip peak specular highlights."
        )
    if config.anamorphic_stretch_x >= 5.0:
        warnings.append(
            "Extreme anamorphic stretch (>= 5.0x) spans across wide horizontal frame regions."
        )
    if config.aberration_px >= 8.0:
        warnings.append(
            "Heavy chromatic aberration (>= 8.0 px) introduces strong red/blue edge fringing."
        )

    cmd = (
        f'ffmpeg -i input.mp4 -filter_complex "{filter_complex}" '
        f'-map "[vout]" -map 0:a? -c:a copy output.mp4'
    )
    return OpticalFlareStudioCompileResult(
        enabled=True,
        preset=config.preset,
        blend_mode=config.blend_mode,
        threshold_vf=threshold_vf,
        bloom_blur_vf=bloom_blur_vf,
        halation_vf=halation_vf,
        aberration_vf=aberration_vf,
        blend_vf=blend_vf,
        filter_complex=filter_complex,
        vf_chain=vf_chain,
        ffmpeg_command=cmd,
        warnings=warnings,
    )


def export_optical_flare_json(
    config: OpticalFlareStudioConfig,
    *,
    title: str = "TAKTCUT_OPTICAL_FLARE_STUDIO",
) -> OpticalFlareStudioExportResult:
    """Export Optical Glow, Halation & Anamorphic Lens Flare configuration and telemetry as JSON."""
    cleaned_title = _SAFE_TITLE_RE.sub(
        "_", str(title or "TAKTCUT_OPTICAL_FLARE_STUDIO").strip()
    ).strip("_")
    if not cleaned_title:
        cleaned_title = "TAKTCUT_OPTICAL_FLARE_STUDIO"

    eval_res = evaluate_optical_flare_studio(config, sample_count=OPTICAL_FLARE_FALLOFF_SAMPLES)
    compiled = compile_optical_flare_filtergraph(config)
    hosts = [
        "Boris FX Sapphire S_Glow / S_LensFlare",
        "DaVinci ResolveFX Lens Reflections & Halation",
        "Red Giant Knoll Light Factory",
        "FFmpeg Anisotropic Optical Bloom Pipeline",
    ]
    payload = {
        "schema_version": "taktcut.optical_flare_studio.v1",
        "title": cleaned_title,
        "preset": config.preset,
        "compatible_hosts": hosts,
        "optical_flare": {
            "enabled": config.enabled,
            "preset": config.preset,
            "threshold_luma": config.threshold_luma,
            "glow_brightness": config.glow_brightness,
            "glow_width_px": config.glow_width_px,
            "anamorphic_stretch_x": config.anamorphic_stretch_x,
            "color_tint_hue": config.color_tint_hue,
            "halation_spread_px": config.halation_spread_px,
            "flare_origin_x": config.flare_origin_x,
            "flare_origin_y": config.flare_origin_y,
            "flare_elements_count": config.flare_elements_count,
            "ghost_intensity_pct": config.ghost_intensity_pct,
            "aberration_px": config.aberration_px,
            "blend_mode": config.blend_mode,
        },
        "metrics": {
            "peak_luminance_headroom_pct": eval_res.peak_luminance_headroom_pct,
            "anamorphic_streak_aspect": eval_res.anamorphic_streak_aspect,
            "halation_energy_pct": eval_res.halation_energy_pct,
            "bloom_radius_px": eval_res.bloom_radius_px,
            "ghost_axis_angle_deg": eval_res.ghost_axis_angle_deg,
            "ghost_count": eval_res.ghost_count,
            "chromatic_fringe_px": eval_res.chromatic_fringe_px,
            "tint_rgb": eval_res.tint_rgb,
        },
        "falloff_samples": [s.model_dump(mode="json") for s in eval_res.falloff_samples],
        "ghost_elements": [g.model_dump(mode="json") for g in eval_res.ghost_elements],
        "ffmpeg": {
            "threshold_vf": compiled.threshold_vf,
            "bloom_blur_vf": compiled.bloom_blur_vf,
            "halation_vf": compiled.halation_vf,
            "aberration_vf": compiled.aberration_vf,
            "blend_vf": compiled.blend_vf,
            "filter_complex": compiled.filter_complex,
            "vf_chain": compiled.vf_chain,
        },
    }
    json_text = json.dumps(payload, indent=2)
    filename = f"{cleaned_title.lower()}_{config.preset}_optical_flare_studio.json"
    return OpticalFlareStudioExportResult(
        schema_version="taktcut.optical_flare_studio.v1",
        title=cleaned_title,
        preset=config.preset,
        compatible_hosts=hosts,
        json_text=json_text,
        filename=filename,
    )


def apply_optical_flare_to_document(
    document: TimelineDocument,
    config: OpticalFlareStudioConfig,
    *,
    track_index: int = 1,
    clip_index: int = 0,
) -> TimelineDocument:
    """Attach ClipOpticalFlareTrack non-destructively onto target video clip."""
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
    eval_res = evaluate_optical_flare_studio(
        scoped_cfg, sample_count=OPTICAL_FLARE_FALLOFF_SAMPLES
    )
    compiled = compile_optical_flare_filtergraph(scoped_cfg)

    target_clip.optical_flare = ClipOpticalFlareTrack(
        enabled=scoped_cfg.enabled,
        preset=scoped_cfg.preset,
        threshold_luma=scoped_cfg.threshold_luma,
        glow_brightness=scoped_cfg.glow_brightness,
        glow_width_px=scoped_cfg.glow_width_px,
        anamorphic_stretch_x=scoped_cfg.anamorphic_stretch_x,
        color_tint_hue=scoped_cfg.color_tint_hue,
        halation_spread_px=scoped_cfg.halation_spread_px,
        flare_origin_x=scoped_cfg.flare_origin_x,
        flare_origin_y=scoped_cfg.flare_origin_y,
        flare_elements_count=scoped_cfg.flare_elements_count,
        ghost_intensity_pct=scoped_cfg.ghost_intensity_pct,
        aberration_px=scoped_cfg.aberration_px,
        blend_mode=scoped_cfg.blend_mode,
        peak_luminance_headroom_pct=eval_res.peak_luminance_headroom_pct,
        anamorphic_streak_aspect=eval_res.anamorphic_streak_aspect,
        halation_energy_pct=eval_res.halation_energy_pct,
        ffmpeg_vf=compiled.filter_complex[:16384],
    )
    return next_doc
