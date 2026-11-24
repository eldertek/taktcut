"""Boris FX Sapphire S_Glow & DaVinci Resolve 35mm Optical Halation,
Exponential Bloom & Anamorphic Lens Streak VFX Studio.

Provides deterministic, strictly typed models and physical optical math for:
- Presets: kodak_2383_halation, sapphire_dream_bloom, anamorphic_blue_streak,
  neon_night_club, subtle_cinema_aura, custom.
- Highlight extraction with soft knee threshold (highlight_threshold + threshold_softness).
- 35mm Silver-Halide Emulsion Halation (red-amber RGB back-scatter spectrum + spread).
- Multi-octave Exponential Inverse-Square Bloom (radius, warmth shift, saturation, octaves).
- Anamorphic Streak / Star Glint (directional length, angle, RGB tint).
- HDR Fusion Blend modes (screen, add_clamp, soft_light, filmic_rolloff).
- Inspection View modes (final_composite, highlight_matte, halation_only, split_compare).
- RGBA sample evaluator (luminance histograms, % triggered pixels, halo energy, headroom).
- Multi-tap FFmpeg filtergraph compiler (split, lutrgb, gblur, avgblur, blend).
- JSON preset export & non-destructive TimelineClip attachment.
"""

from __future__ import annotations

import json
import math
import re
from collections.abc import Mapping, Sequence
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from taktcut.models import ClipOpticalGlowTrack, TimelineDocument

OpticalGlowPresetId = Literal[
    "kodak_2383_halation",
    "sapphire_dream_bloom",
    "anamorphic_blue_streak",
    "neon_night_club",
    "subtle_cinema_aura",
    "custom",
]

OpticalGlowBlendMode = Literal[
    "screen",
    "add_clamp",
    "soft_light",
    "filmic_rolloff",
]

OpticalGlowViewMode = Literal[
    "final_composite",
    "highlight_matte",
    "halation_only",
    "split_compare",
]

ALLOWED_OPTICAL_GLOW_PRESET_IDS: tuple[OpticalGlowPresetId, ...] = (
    "kodak_2383_halation",
    "sapphire_dream_bloom",
    "anamorphic_blue_streak",
    "neon_night_club",
    "subtle_cinema_aura",
    "custom",
)

ALLOWED_OPTICAL_GLOW_BLEND_MODES: tuple[OpticalGlowBlendMode, ...] = (
    "screen",
    "add_clamp",
    "soft_light",
    "filmic_rolloff",
)

ALLOWED_OPTICAL_GLOW_VIEW_MODES: tuple[OpticalGlowViewMode, ...] = (
    "final_composite",
    "highlight_matte",
    "halation_only",
    "split_compare",
)

DEFAULT_HALATION_SPECTRUM_RGB: tuple[float, float, float] = (1.0, 0.28, 0.06)
_SAFE_TITLE_RE = re.compile(r"[^A-Za-z0-9_-]+")


def _clamp(value: float, lo: float, hi: float) -> float:
    return min(hi, max(lo, value))


def _clamp01(value: float) -> float:
    return min(1.0, max(0.0, value))


def _validate_bounded_float(raw: Any, field_name: str, lo: float, hi: float) -> float:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raise ValueError(f"{field_name} must be a finite number, got {raw!r}")
    val = float(raw)
    if not math.isfinite(val) or val < lo or val > hi:
        raise ValueError(f"{field_name} must be in [{lo}, {hi}], got {raw!r}")
    return val


def _validate_rgb_tuple(raw: Any, field_name: str) -> tuple[float, float, float]:
    if not isinstance(raw, (list, tuple)) or len(raw) != 3:
        raise ValueError(f"{field_name} must be a 3-element RGB sequence, got {raw!r}")
    out: list[float] = []
    for idx, item in enumerate(raw):
        out.append(_validate_bounded_float(item, f"{field_name}[{idx}]", 0.0, 1.0))
    return (out[0], out[1], out[2])


def _rec709_luma(r: float, g: float, b: float) -> float:
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


class OpticalGlowConfig(BaseModel):
    """Physical optical parameters for 35mm Halation, Exponential Bloom & Anamorphic Streak."""

    model_config = ConfigDict(extra="ignore")

    enabled: bool = True
    preset_id: OpticalGlowPresetId = "kodak_2383_halation"

    highlight_threshold: float = Field(default=0.70, ge=0.0, le=1.0)
    threshold_softness: float = Field(default=0.14, ge=0.0, le=0.5)

    halation_strength: float = Field(default=0.68, ge=0.0, le=1.0)
    halation_spread_px: float = Field(default=16.0, ge=1.0, le=64.0)
    halation_spectrum_rgb: tuple[float, float, float] = DEFAULT_HALATION_SPECTRUM_RGB

    glow_intensity: float = Field(default=0.45, ge=0.0, le=2.0)
    glow_radius_px: float = Field(default=20.0, ge=2.0, le=128.0)
    glow_warmth_shift: float = Field(default=0.22, ge=-1.0, le=1.0)
    bloom_saturation: float = Field(default=1.12, ge=0.0, le=2.0)
    octaves: int = Field(default=4, ge=2, le=6)

    streak_intensity: float = Field(default=0.10, ge=0.0, le=2.0)
    streak_length_px: float = Field(default=48.0, ge=4.0, le=240.0)
    streak_angle_deg: float = Field(default=0.0, ge=-180.0, le=180.0)
    streak_tint_rgb: tuple[float, float, float] = (1.0, 0.56, 0.28)

    blend_mode: OpticalGlowBlendMode = "filmic_rolloff"
    view_mode: OpticalGlowViewMode = "final_composite"
    split_position: float = Field(default=0.5, ge=0.0, le=1.0)

    width: int = Field(default=1920, ge=64, le=7680)
    height: int = Field(default=1080, ge=64, le=4320)

    @field_validator("highlight_threshold", mode="before")
    @classmethod
    def _val_threshold(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "highlight_threshold", 0.0, 1.0)

    @field_validator("threshold_softness", mode="before")
    @classmethod
    def _val_softness(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "threshold_softness", 0.0, 0.5)

    @field_validator("halation_strength", mode="before")
    @classmethod
    def _val_hal_strength(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "halation_strength", 0.0, 1.0)

    @field_validator("halation_spread_px", mode="before")
    @classmethod
    def _val_hal_spread(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "halation_spread_px", 1.0, 64.0)

    @field_validator("halation_spectrum_rgb", mode="before")
    @classmethod
    def _val_hal_spec(cls, raw: Any) -> tuple[float, float, float]:
        return _validate_rgb_tuple(raw, "halation_spectrum_rgb")

    @field_validator("glow_intensity", mode="before")
    @classmethod
    def _val_glow_intensity(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "glow_intensity", 0.0, 2.0)

    @field_validator("glow_radius_px", mode="before")
    @classmethod
    def _val_glow_radius(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "glow_radius_px", 2.0, 128.0)

    @field_validator("glow_warmth_shift", mode="before")
    @classmethod
    def _val_warmth(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "glow_warmth_shift", -1.0, 1.0)

    @field_validator("bloom_saturation", mode="before")
    @classmethod
    def _val_bloom_sat(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "bloom_saturation", 0.0, 2.0)

    @field_validator("octaves", mode="before")
    @classmethod
    def _val_octaves(cls, raw: Any) -> int:
        if isinstance(raw, bool) or not isinstance(raw, (int, float)):
            raise ValueError(f"octaves must be an integer in [2, 6], got {raw!r}")
        ival = int(round(float(raw)))
        if ival < 2 or ival > 6:
            raise ValueError(f"octaves must be in [2, 6], got {raw!r}")
        return ival

    @field_validator("streak_intensity", mode="before")
    @classmethod
    def _val_streak_intensity(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "streak_intensity", 0.0, 2.0)

    @field_validator("streak_length_px", mode="before")
    @classmethod
    def _val_streak_len(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "streak_length_px", 4.0, 240.0)

    @field_validator("streak_angle_deg", mode="before")
    @classmethod
    def _val_streak_angle(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "streak_angle_deg", -180.0, 180.0)

    @field_validator("streak_tint_rgb", mode="before")
    @classmethod
    def _val_streak_tint(cls, raw: Any) -> tuple[float, float, float]:
        return _validate_rgb_tuple(raw, "streak_tint_rgb")

    @field_validator("split_position", mode="before")
    @classmethod
    def _val_split_pos(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "split_position", 0.0, 1.0)

    @model_validator(mode="after")
    def _validate_dimensions(self) -> OpticalGlowConfig:
        if self.width % 2 != 0:
            self.width -= 1
        if self.height % 2 != 0:
            self.height -= 1
        return self


class OpticalGlowPreset(BaseModel):
    """Named DaVinci Resolve / Boris FX Sapphire S_Glow preset."""

    model_config = ConfigDict(extra="forbid")

    preset_id: OpticalGlowPresetId
    label: str
    category: str
    description: str
    default_config: OpticalGlowConfig


class OpticalGlowThresholdPoint(BaseModel):
    """Single point on the highlight threshold extraction curve."""

    model_config = ConfigDict(extra="forbid")

    input_luma: float
    matte_weight: float
    extracted_energy: float


class OpticalGlowFalloffPoint(BaseModel):
    """Single point on the multi-octave inverse-square bloom vs halation radial falloff curve."""

    model_config = ConfigDict(extra="forbid")

    distance_px: float
    bloom_response: float
    halation_response: float
    streak_response: float


class OpticalGlowResponseCurve(BaseModel):
    """Threshold extraction transfer curve and radial exponential falloff curves."""

    model_config = ConfigDict(extra="forbid")

    threshold_curve: list[OpticalGlowThresholdPoint]
    falloff_curve: list[OpticalGlowFalloffPoint]


class OpticalGlowAnalysisResult(BaseModel):
    """Metrics and preview maps from RGBA optical glow and 35mm halation evaluation."""

    model_config = ConfigDict(extra="forbid")

    preset_id: OpticalGlowPresetId
    view_mode: OpticalGlowViewMode
    blend_mode: OpticalGlowBlendMode
    sample_count: int
    width: int
    height: int
    triggered_highlight_pct: float
    halo_energy_added: float
    mean_luma_before: float
    mean_luma_after: float
    peak_luma_before: float
    peak_luma_after: float
    peak_headroom: float
    luma_histogram_before: list[int]
    luma_histogram_after: list[int]
    highlight_matte_map: list[float]
    preview_rgb_map: list[tuple[float, float, float]]
    response_curve: OpticalGlowResponseCurve


class OpticalGlowCompileResult(BaseModel):
    """Compiled FFmpeg multi-tap filtergraph for Optical Halation, Bloom & Streak."""

    model_config = ConfigDict(extra="forbid")

    enabled: bool
    preset_id: OpticalGlowPresetId
    blend_mode: OpticalGlowBlendMode
    view_mode: OpticalGlowViewMode
    tap_count: int
    effective_radius_px: float
    vf_chain: str
    filter_complex: str
    ffmpeg_command: str
    warnings: list[str] = Field(default_factory=list)


class OpticalGlowExportResult(BaseModel):
    """Exported JSON preset payload compatible with DaVinci / Sapphire / TaktCut."""

    model_config = ConfigDict(extra="forbid")

    schema_version: str = "taktcut.optical_glow.v1"
    title: str
    preset_id: OpticalGlowPresetId
    compatible_hosts: list[str]
    json_text: str
    filename: str
    saved_path: str | None = None


_OPTICAL_GLOW_PRESETS: tuple[OpticalGlowPreset, ...] = (
    OpticalGlowPreset(
        preset_id="kodak_2383_halation",
        label="Kodak 2383 35mm Halation",
        category="Film Emulsion",
        description=(
            "Authentic 35mm silver-halide red-amber back-scatter halation on high-contrast "
            "specular sources paired with filmic highlight rolloff."
        ),
        default_config=OpticalGlowConfig(
            enabled=True,
            preset_id="kodak_2383_halation",
            highlight_threshold=0.70,
            threshold_softness=0.14,
            halation_strength=0.68,
            halation_spread_px=16.0,
            halation_spectrum_rgb=(1.0, 0.28, 0.06),
            glow_intensity=0.45,
            glow_radius_px=20.0,
            glow_warmth_shift=0.22,
            bloom_saturation=1.12,
            octaves=4,
            streak_intensity=0.10,
            streak_length_px=48.0,
            streak_angle_deg=0.0,
            streak_tint_rgb=(1.0, 0.56, 0.28),
            blend_mode="filmic_rolloff",
            view_mode="final_composite",
        ),
    ),
    OpticalGlowPreset(
        preset_id="sapphire_dream_bloom",
        label="Sapphire S_Glow Dream Bloom",
        category="Boris FX S_Glow",
        description=(
            "Multi-octave exponential inverse-square glow inspired by Boris FX Sapphire S_Glow "
            "for luminous soft-focus beauty and dream sequences."
        ),
        default_config=OpticalGlowConfig(
            enabled=True,
            preset_id="sapphire_dream_bloom",
            highlight_threshold=0.56,
            threshold_softness=0.22,
            halation_strength=0.28,
            halation_spread_px=12.0,
            halation_spectrum_rgb=(1.0, 0.36, 0.14),
            glow_intensity=1.05,
            glow_radius_px=42.0,
            glow_warmth_shift=0.10,
            bloom_saturation=1.28,
            octaves=5,
            streak_intensity=0.18,
            streak_length_px=56.0,
            streak_angle_deg=15.0,
            streak_tint_rgb=(1.0, 0.88, 0.76),
            blend_mode="screen",
            view_mode="final_composite",
        ),
    ),
    OpticalGlowPreset(
        preset_id="anamorphic_blue_streak",
        label="Anamorphic Blue Streak",
        category="Anamorphic Optics",
        description=(
            "Panavision-style horizontal cobalt-cyan optical streak triggered by bright "
            "headlights, practical lamps, and metallic rim glints."
        ),
        default_config=OpticalGlowConfig(
            enabled=True,
            preset_id="anamorphic_blue_streak",
            highlight_threshold=0.66,
            threshold_softness=0.12,
            halation_strength=0.18,
            halation_spread_px=10.0,
            halation_spectrum_rgb=(0.95, 0.28, 0.08),
            glow_intensity=0.52,
            glow_radius_px=22.0,
            glow_warmth_shift=-0.28,
            bloom_saturation=1.25,
            octaves=4,
            streak_intensity=1.25,
            streak_length_px=148.0,
            streak_angle_deg=0.0,
            streak_tint_rgb=(0.18, 0.62, 1.0),
            blend_mode="screen",
            view_mode="final_composite",
        ),
    ),
    OpticalGlowPreset(
        preset_id="neon_night_club",
        label="Neon Night Club",
        category="Stylized VFX",
        description=(
            "High-saturation night glow with wide inverse-square bloom and angled magenta-cyan "
            "star glints."
        ),
        default_config=OpticalGlowConfig(
            enabled=True,
            preset_id="neon_night_club",
            highlight_threshold=0.48,
            threshold_softness=0.18,
            halation_strength=0.42,
            halation_spread_px=14.0,
            halation_spectrum_rgb=(1.0, 0.24, 0.10),
            glow_intensity=1.18,
            glow_radius_px=34.0,
            glow_warmth_shift=-0.12,
            bloom_saturation=1.55,
            octaves=5,
            streak_intensity=0.68,
            streak_length_px=96.0,
            streak_angle_deg=22.0,
            streak_tint_rgb=(0.94, 0.34, 0.98),
            blend_mode="add_clamp",
            view_mode="final_composite",
        ),
    ),
    OpticalGlowPreset(
        preset_id="subtle_cinema_aura",
        label="Subtle Cinema Aura",
        category="Narrative Drama",
        description=(
            "Restrained highlight rolloff and gentle warmth aura designed for commercial and "
            "narrative skin-tone protection."
        ),
        default_config=OpticalGlowConfig(
            enabled=True,
            preset_id="subtle_cinema_aura",
            highlight_threshold=0.78,
            threshold_softness=0.16,
            halation_strength=0.32,
            halation_spread_px=10.0,
            halation_spectrum_rgb=(1.0, 0.30, 0.08),
            glow_intensity=0.34,
            glow_radius_px=18.0,
            glow_warmth_shift=0.14,
            bloom_saturation=1.05,
            octaves=3,
            streak_intensity=0.06,
            streak_length_px=36.0,
            streak_angle_deg=0.0,
            streak_tint_rgb=(1.0, 0.85, 0.68),
            blend_mode="soft_light",
            view_mode="final_composite",
        ),
    ),
    OpticalGlowPreset(
        preset_id="custom",
        label="Custom Optical Studio",
        category="User Custom",
        description="User-defined highlight threshold, 35mm halation, bloom, and streak settings.",
        default_config=OpticalGlowConfig(
            enabled=True,
            preset_id="custom",
        ),
    ),
)

_PRESET_MAP: dict[str, OpticalGlowPreset] = {
    preset.preset_id: preset for preset in _OPTICAL_GLOW_PRESETS
}


def list_optical_glow_presets() -> list[OpticalGlowPreset]:
    """Return all built-in DaVinci / Boris FX Sapphire S_Glow presets."""
    return [preset.model_copy(deep=True) for preset in _OPTICAL_GLOW_PRESETS]


def get_optical_glow_preset(preset_id: str) -> OpticalGlowPreset:
    """Lookup a single optical glow preset by ID."""
    if preset_id not in _PRESET_MAP:
        raise ValueError(f"Unsupported optical glow preset: {preset_id!r}")
    return _PRESET_MAP[preset_id].model_copy(deep=True)


def normalize_optical_glow_config(raw: Any = None) -> OpticalGlowConfig:
    """Normalize arbitrary dict/config into a validated OpticalGlowConfig."""
    if raw is None:
        return get_optical_glow_preset("kodak_2383_halation").default_config
    if isinstance(raw, OpticalGlowConfig):
        return OpticalGlowConfig.model_validate(raw.model_dump())
    if not isinstance(raw, Mapping):
        raise ValueError("Optical glow config must be a mapping or OpticalGlowConfig instance.")

    raw_preset = raw.get("preset_id")
    if isinstance(raw_preset, str) and raw_preset in _PRESET_MAP and raw_preset != "custom":
        base = get_optical_glow_preset(raw_preset).default_config.model_dump()
        for key, value in raw.items():
            if value is not None:
                base[key] = value
        return OpticalGlowConfig.model_validate(base)

    return OpticalGlowConfig.model_validate(dict(raw))


def compute_highlight_matte_and_energy(
    luma: float,
    highlight_threshold: float,
    threshold_softness: float,
) -> tuple[float, float]:
    """Compute smoothstep highlight matte (0..1) and extracted optical energy."""
    lum = _clamp01(luma)
    lo = _clamp01(highlight_threshold - threshold_softness)
    hi = _clamp01(highlight_threshold + threshold_softness)
    if hi <= lo + 1e-6:
        matte = 1.0 if lum >= highlight_threshold else 0.0
    else:
        t = _clamp01((lum - lo) / (hi - lo))
        matte = t * t * (3.0 - 2.0 * t)
    energy = matte * max(0.0, lum - lo * 0.65)
    return (matte, _clamp01(energy))


def evaluate_exponential_falloff_at_distance(
    distance_px: float,
    radius_px: float,
    octaves: int = 4,
) -> float:
    """Evaluate multi-octave inverse-square exponential glow kernel at distance d >= 0."""
    d = max(0.0, float(distance_px))
    base_r = max(1.0, float(radius_px))
    total = 0.0
    weight_sum = 0.0
    for oct_idx in range(max(1, octaves)):
        scale = 0.25 * (2.0**oct_idx)
        r_k = max(0.75, base_r * scale / (2.0 ** max(0, octaves - 2)))
        w_k = 1.0 / (1.45**oct_idx)
        inv_sq = 1.0 / (1.0 + (d * d) / (r_k * r_k))
        total += w_k * inv_sq
        weight_sum += w_k
    return _clamp01(total / max(1e-6, weight_sum))


def evaluate_optical_glow_response(config: OpticalGlowConfig) -> OpticalGlowResponseCurve:
    """Compute threshold transfer curve and radial exponential falloff curves."""
    threshold_curve: list[OpticalGlowThresholdPoint] = []
    for idx in range(33):
        lum = idx / 32.0
        matte, energy = compute_highlight_matte_and_energy(
            lum, config.highlight_threshold, config.threshold_softness
        )
        threshold_curve.append(
            OpticalGlowThresholdPoint(
                input_luma=round(lum, 4),
                matte_weight=round(matte, 4),
                extracted_energy=round(energy, 4),
            )
        )

    max_dist = max(24.0, config.glow_radius_px * 1.6, config.halation_spread_px * 2.0)
    falloff_curve: list[OpticalGlowFalloffPoint] = []
    for idx in range(33):
        dist = (idx / 32.0) * max_dist
        bloom_resp = (
            config.glow_intensity
            * evaluate_exponential_falloff_at_distance(
                dist, config.glow_radius_px, config.octaves
            )
            if config.enabled
            else 0.0
        )
        hal_sigma = max(1.0, config.halation_spread_px * 0.45)
        hal_resp = (
            config.halation_strength * math.exp(-0.5 * (dist / hal_sigma) ** 2)
            if config.enabled
            else 0.0
        )
        stk_scale = max(2.0, config.streak_length_px * 0.35)
        stk_resp = (
            config.streak_intensity * math.exp(-dist / stk_scale)
            if config.enabled
            else 0.0
        )
        falloff_curve.append(
            OpticalGlowFalloffPoint(
                distance_px=round(dist, 2),
                bloom_response=round(min(2.0, bloom_resp), 4),
                halation_response=round(min(1.0, hal_resp), 4),
                streak_response=round(min(2.0, stk_resp), 4),
            )
        )

    return OpticalGlowResponseCurve(
        threshold_curve=threshold_curve,
        falloff_curve=falloff_curve,
    )


def _synthesize_optical_test_frame(
    width: int = 24,
    height: int = 16,
) -> list[tuple[float, float, float]]:
    """Synthesize a deterministic cinema night street frame with bright practical highlights."""
    pixels: list[tuple[float, float, float]] = []
    for y in range(height):
        ny = y / max(1, height - 1)
        for x in range(width):
            nx = x / max(1, width - 1)
            # Dark moody night sky & street base
            r = 0.05 + 0.04 * (1.0 - ny)
            g = 0.06 + 0.05 * (1.0 - ny)
            b = 0.11 + 0.07 * (1.0 - ny)

            # Warm practical streetlamp (left-upper quadrant)
            d_lamp = math.hypot((nx - 0.28) * 1.45, ny - 0.28)
            if d_lamp < 0.24:
                k = _clamp01((0.24 - d_lamp) / 0.24)
                k2 = k * k
                r = max(r, 0.98 * k2 + 0.35 * k)
                g = max(g, 0.88 * k2 + 0.24 * k)
                b = max(b, 0.70 * k2 + 0.12 * k)

            # Cyan-blue neon specular sign (right-upper quadrant)
            d_neon = math.hypot((nx - 0.74) * 1.35, ny - 0.34)
            if d_neon < 0.20:
                k = _clamp01((0.20 - d_neon) / 0.20)
                k2 = k * k
                r = max(r, 0.62 * k2 + 0.12 * k)
                g = max(g, 0.92 * k2 + 0.36 * k)
                b = max(b, 1.00 * k2 + 0.48 * k)

            # Subject midtone skin & jacket rim highlight
            d_subj = math.hypot((nx - 0.50) * 1.25, (ny - 0.62) * 1.1)
            if d_subj < 0.22:
                r = max(r, 0.54)
                g = max(g, 0.38)
                b = max(b, 0.30)
                if nx > 0.54:
                    r = max(r, 0.82)
                    g = max(g, 0.72)
                    b = max(b, 0.64)

            # Wet asphalt specular streak reflections
            if ny > 0.76 and (abs(nx - 0.28) < 0.06 or abs(nx - 0.74) < 0.06):
                r = max(r, 0.76)
                g = max(g, 0.74)
                b = max(b, 0.78)

            pixels.append((_clamp01(r), _clamp01(g), _clamp01(b)))
    return pixels


def _parse_rgb_samples(
    samples: Sequence[Sequence[float]] | None,
    pixels: Sequence[float] | None,
    width: int,
    height: int,
) -> tuple[list[tuple[float, float, float]], int, int]:
    if pixels is not None and len(pixels) > 0:
        stride = 4 if (width > 0 and height > 0 and len(pixels) == width * height * 4) else 3
        if width <= 0 or height <= 0:
            count = len(pixels) // stride
            w = max(1, count)
            h = 1
        else:
            w = width
            h = height
            count = min(w * h, len(pixels) // stride)
        max_val = max((float(v) for v in pixels[: count * stride]), default=1.0)
        scale = 1.0 / 255.0 if max_val > 1.001 else 1.0
        parsed: list[tuple[float, float, float]] = []
        for idx in range(count):
            base = idx * stride
            parsed.append(
                (
                    _clamp01(float(pixels[base]) * scale),
                    _clamp01(float(pixels[base + 1]) * scale),
                    _clamp01(float(pixels[base + 2]) * scale),
                )
            )
        return (parsed, w, h)

    if samples is not None and len(samples) > 0:
        flat_vals = [float(c) for row in samples for c in row[:3]]
        max_val = max(flat_vals, default=1.0)
        scale = 1.0 / 255.0 if max_val > 1.001 else 1.0
        parsed_samples: list[tuple[float, float, float]] = []
        for row in samples:
            if len(row) < 3:
                raise ValueError("Each RGB/RGBA sample must contain at least 3 channels.")
            parsed_samples.append(
                (
                    _clamp01(float(row[0]) * scale),
                    _clamp01(float(row[1]) * scale),
                    _clamp01(float(row[2]) * scale),
                )
            )
        is_grid = width > 0 and height > 0 and width * height == len(parsed_samples)
        w = width if is_grid else len(parsed_samples)
        h = height if is_grid else 1
        return (parsed_samples, w, h)

    syn_w = 24
    syn_h = 16
    return (_synthesize_optical_test_frame(syn_w, syn_h), syn_w, syn_h)


def _separable_gaussian_rgb_2d(
    grid: list[tuple[float, float, float]],
    width: int,
    height: int,
    sigma_px: float,
) -> list[tuple[float, float, float]]:
    if width <= 1 or height <= 1 or sigma_px <= 0.15:
        return list(grid)
    radius = max(1, min(6, int(math.ceil(sigma_px * 1.5))))
    sigma_sq = max(0.04, sigma_px * sigma_px)
    weights = [
        math.exp(-0.5 * (dx * dx) / sigma_sq) for dx in range(-radius, radius + 1)
    ]
    w_sum = sum(weights)
    norm_w = [w / w_sum for w in weights]

    horiz: list[tuple[float, float, float]] = [(0.0, 0.0, 0.0)] * (width * height)
    for y in range(height):
        row_off = y * width
        for x in range(width):
            acc_r = 0.0
            acc_g = 0.0
            acc_b = 0.0
            for k_idx, dx in enumerate(range(-radius, radius + 1)):
                sx = min(width - 1, max(0, x + dx))
                pr, pg, pb = grid[row_off + sx]
                wk = norm_w[k_idx]
                acc_r += pr * wk
                acc_g += pg * wk
                acc_b += pb * wk
            horiz[row_off + x] = (acc_r, acc_g, acc_b)

    out: list[tuple[float, float, float]] = [(0.0, 0.0, 0.0)] * (width * height)
    for y in range(height):
        for x in range(width):
            acc_r = 0.0
            acc_g = 0.0
            acc_b = 0.0
            for k_idx, dy in enumerate(range(-radius, radius + 1)):
                sy = min(height - 1, max(0, y + dy))
                pr, pg, pb = horiz[sy * width + x]
                wk = norm_w[k_idx]
                acc_r += pr * wk
                acc_g += pg * wk
                acc_b += pb * wk
            out[y * width + x] = (acc_r, acc_g, acc_b)
    return out


def _directional_streak_rgb_2d(
    grid: list[tuple[float, float, float]],
    width: int,
    height: int,
    length_px: float,
    angle_deg: float,
) -> list[tuple[float, float, float]]:
    if width <= 1 or height <= 1 or length_px < 1.0:
        return list(grid)
    rad = math.radians(angle_deg)
    ux = math.cos(rad)
    uy = math.sin(rad)
    steps = max(2, min(8, int(round(length_px / 18.0))))
    out: list[tuple[float, float, float]] = [(0.0, 0.0, 0.0)] * (width * height)
    for y in range(height):
        for x in range(width):
            acc_r = 0.0
            acc_g = 0.0
            acc_b = 0.0
            w_sum = 0.0
            for s in range(-steps, steps + 1):
                dist = abs(s)
                w = math.exp(-dist / max(1.0, steps * 0.55))
                sx = min(width - 1, max(0, int(round(x + ux * s))))
                sy = min(height - 1, max(0, int(round(y + uy * s))))
                pr, pg, pb = grid[sy * width + sx]
                acc_r += pr * w
                acc_g += pg * w
                acc_b += pb * w
                w_sum += w
            out[y * width + x] = (acc_r / w_sum, acc_g / w_sum, acc_b / w_sum)
    return out


def _apply_hdr_blend(
    base: float,
    effect: float,
    blend_mode: OpticalGlowBlendMode,
) -> float:
    b = _clamp01(base)
    e = max(0.0, effect)
    if blend_mode == "add_clamp":
        return _clamp01(b + e)
    if blend_mode == "screen":
        ec = _clamp01(e)
        return _clamp01(1.0 - (1.0 - b) * (1.0 - ec))
    if blend_mode == "soft_light":
        ec = _clamp01(e * 0.85)
        return _clamp01(b + (2.0 * ec) * (1.0 - b) * (0.5 + 0.5 * b))
    # filmic_rolloff: asymptotic shoulder preventing harsh highlight clipping
    combined = b + e
    if combined <= 0.72:
        return _clamp01(combined)
    excess = combined - 0.72
    rolled = 0.72 + 0.28 * (excess / (excess + 0.35))
    return _clamp01(rolled)


def analyze_optical_glow_samples(
    config: OpticalGlowConfig,
    samples: Sequence[Sequence[float]] | None = None,
    *,
    width: int = 0,
    height: int = 0,
    pixels: Sequence[float] | None = None,
) -> OpticalGlowAnalysisResult:
    """Evaluate RGBA highlight extraction, 35mm halation, exponential bloom, and streak metrics."""
    rgb_list, w, h = _parse_rgb_samples(samples, pixels, width, height)
    total = len(rgb_list)
    response_curve = evaluate_optical_glow_response(config)

    if total == 0:
        return OpticalGlowAnalysisResult(
            preset_id=config.preset_id,
            view_mode=config.view_mode,
            blend_mode=config.blend_mode,
            sample_count=0,
            width=1,
            height=1,
            triggered_highlight_pct=0.0,
            halo_energy_added=0.0,
            mean_luma_before=0.0,
            mean_luma_after=0.0,
            peak_luma_before=0.0,
            peak_luma_after=0.0,
            peak_headroom=1.0,
            luma_histogram_before=[0] * 16,
            luma_histogram_after=[0] * 16,
            highlight_matte_map=[],
            preview_rgb_map=[],
            response_curve=response_curve,
        )

    mattes: list[float] = []
    hi_rgb: list[tuple[float, float, float]] = []
    triggered_count = 0
    hist_before = [0] * 16
    luma_before_sum = 0.0
    peak_before = 0.0

    warm = config.glow_warmth_shift
    warm_r = 1.0 + max(0.0, warm) * 0.45 - max(0.0, -warm) * 0.35
    warm_g = 1.0 + warm * 0.08
    warm_b = 1.0 + max(0.0, -warm) * 0.50 - max(0.0, warm) * 0.40

    for r, g, b in rgb_list:
        lum = _rec709_luma(r, g, b)
        luma_before_sum += lum
        if lum > peak_before:
            peak_before = lum
        b_idx = min(15, max(0, int(_clamp01(lum) * 15.9999)))
        hist_before[b_idx] += 1

        matte, energy = compute_highlight_matte_and_energy(
            lum, config.highlight_threshold, config.threshold_softness
        )
        mattes.append(matte)
        if matte > 0.05:
            triggered_count += 1

        sat_r = lum + (r - lum) * config.bloom_saturation
        sat_g = lum + (g - lum) * config.bloom_saturation
        sat_b = lum + (b - lum) * config.bloom_saturation
        hi_rgb.append(
            (
                max(0.0, sat_r) * energy,
                max(0.0, sat_g) * energy,
                max(0.0, sat_b) * energy,
            )
        )

    if w > 1 and h > 1 and len(hi_rgb) == w * h:
        sigma_bloom = max(0.5, config.glow_radius_px / 12.0)
        oct_tight = _separable_gaussian_rgb_2d(hi_rgb, w, h, max(0.45, sigma_bloom * 0.55))
        oct_wide = _separable_gaussian_rgb_2d(hi_rgb, w, h, max(0.8, sigma_bloom * 1.45))
        bloom_pass: list[tuple[float, float, float]] = []
        for idx in range(total):
            tr, tg, tb = oct_tight[idx]
            wr, wg, wb = oct_wide[idx]
            bloom_pass.append(
                (
                    (0.58 * tr + 0.42 * wr) * warm_r * config.glow_intensity,
                    (0.58 * tg + 0.42 * wg) * warm_g * config.glow_intensity,
                    (0.58 * tb + 0.42 * wb) * warm_b * config.glow_intensity,
                )
            )
        hal_blur = _separable_gaussian_rgb_2d(
            hi_rgb, w, h, max(0.5, config.halation_spread_px / 10.0)
        )
        stk_blur = _directional_streak_rgb_2d(
            hi_rgb, w, h, config.streak_length_px, config.streak_angle_deg
        )
    else:
        bloom_pass = [
            (
                hr * warm_r * config.glow_intensity,
                hg * warm_g * config.glow_intensity,
                hb * warm_b * config.glow_intensity,
            )
            for hr, hg, hb in hi_rgb
        ]
        hal_blur = list(hi_rgb)
        stk_blur = list(hi_rgb)

    hr_spec, hg_spec, hb_spec = config.halation_spectrum_rgb
    sr_tint, sg_tint, sb_tint = config.streak_tint_rgb

    hist_after = [0] * 16
    luma_after_sum = 0.0
    peak_after = 0.0
    halo_energy_sum = 0.0
    preview_rgb: list[tuple[float, float, float]] = []

    for idx, (br, bg, bb) in enumerate(rgb_list):
        if not config.enabled:
            out_r, out_g, out_b = br, bg, bb
            added_energy = 0.0
        else:
            bl_r, bl_g, bl_b = bloom_pass[idx]
            ha_r = hal_blur[idx][0] * hr_spec * config.halation_strength * 1.35
            ha_g = hal_blur[idx][1] * hg_spec * config.halation_strength * 1.35
            ha_b = hal_blur[idx][2] * hb_spec * config.halation_strength * 1.35

            st_lum = _rec709_luma(*stk_blur[idx])
            st_r = st_lum * sr_tint * config.streak_intensity * 1.15
            st_g = st_lum * sg_tint * config.streak_intensity * 1.15
            st_b = st_lum * sb_tint * config.streak_intensity * 1.15

            fx_r = bl_r + ha_r + st_r
            fx_g = bl_g + ha_g + st_g
            fx_b = bl_b + ha_b + st_b
            added_energy = _rec709_luma(fx_r, fx_g, fx_b)

            if config.view_mode == "highlight_matte":
                m = _clamp01(mattes[idx])
                out_r, out_g, out_b = m, m, m
            elif config.view_mode == "halation_only":
                out_r = _clamp01(ha_r + bl_r * 0.25 + st_r * 0.25)
                out_g = _clamp01(ha_g + bl_g * 0.25 + st_g * 0.25)
                out_b = _clamp01(ha_b + bl_b * 0.25 + st_b * 0.25)
            else:
                out_r = _apply_hdr_blend(br, fx_r, config.blend_mode)
                out_g = _apply_hdr_blend(bg, fx_g, config.blend_mode)
                out_b = _apply_hdr_blend(bb, fx_b, config.blend_mode)

        halo_energy_sum += added_energy
        lum_after = _rec709_luma(out_r, out_g, out_b)
        luma_after_sum += lum_after
        if lum_after > peak_after:
            peak_after = lum_after
        a_idx = min(15, max(0, int(_clamp01(lum_after) * 15.9999)))
        hist_after[a_idx] += 1

        if idx < 384:
            preview_rgb.append((round(out_r, 4), round(out_g, 4), round(out_b, 4)))

    triggered_pct = 100.0 * triggered_count / float(total)
    mean_before = luma_before_sum / float(total)
    mean_after = luma_after_sum / float(total)
    mean_halo_energy = halo_energy_sum / float(total)
    headroom = _clamp01(1.0 - peak_after)

    return OpticalGlowAnalysisResult(
        preset_id=config.preset_id,
        view_mode=config.view_mode,
        blend_mode=config.blend_mode,
        sample_count=total,
        width=w,
        height=h,
        triggered_highlight_pct=round(triggered_pct, 2),
        halo_energy_added=round(mean_halo_energy, 4),
        mean_luma_before=round(mean_before, 4),
        mean_luma_after=round(mean_after, 4),
        peak_luma_before=round(peak_before, 4),
        peak_luma_after=round(peak_after, 4),
        peak_headroom=round(headroom, 4),
        luma_histogram_before=hist_before,
        luma_histogram_after=hist_after,
        highlight_matte_map=[round(m, 4) for m in mattes[:2048]],
        preview_rgb_map=preview_rgb,
        response_curve=response_curve,
    )


def _format_lutrgb_highlight_expr(threshold: float, softness: float, gain: float) -> str:
    lo_255 = round(_clamp01(threshold - softness) * 255.0, 2)
    hi_255 = round(max(lo_255 + 1.0, _clamp01(threshold + softness) * 255.0), 2)
    span = round(max(1.0, hi_255 - lo_255), 2)
    g = round(max(0.0, gain), 4)
    return f"clip(val*clip((val-{lo_255})/{span},0,1)*{g},0,255)"


def compile_optical_glow_filtergraph(config: OpticalGlowConfig) -> OpticalGlowCompileResult:
    """Compile a multi-tap FFmpeg filtergraph for Optical Halation, Bloom & Streak."""
    warnings: list[str] = []
    eff_radius = round(
        max(config.glow_radius_px, config.halation_spread_px, config.streak_length_px * 0.5),
        2,
    )

    if not config.enabled:
        return OpticalGlowCompileResult(
            enabled=False,
            preset_id=config.preset_id,
            blend_mode=config.blend_mode,
            view_mode=config.view_mode,
            tap_count=1,
            effective_radius_px=0.0,
            vf_chain="null",
            filter_complex="[0:v]null[vout]",
            ffmpeg_command='ffmpeg -i input.mp4 -vf "null" output.mp4',
            warnings=["Optical Glow & Halation bypass active (enabled=false)."],
        )

    if config.view_mode == "highlight_matte":
        matte_expr = _format_lutrgb_highlight_expr(
            config.highlight_threshold, config.threshold_softness, 1.0
        )
        chain = (
            f"format=rgb24,lutrgb=r='{matte_expr}':g='{matte_expr}':b='{matte_expr}',"
            "format=yuv420p"
        )
        ff_cmd = (
            f'ffmpeg -i input.mp4 -filter_complex "[0:v]{chain}[vout]" '
            '-map "[vout]" output.mp4'
        )
        return OpticalGlowCompileResult(
            enabled=True,
            preset_id=config.preset_id,
            blend_mode=config.blend_mode,
            view_mode=config.view_mode,
            tap_count=1,
            effective_radius_px=eff_radius,
            vf_chain=chain,
            filter_complex=f"[0:v]{chain}[vout]",
            ffmpeg_command=ff_cmd,
            warnings=warnings,
        )

    warm = config.glow_warmth_shift
    wr = _clamp(1.0 + max(0.0, warm) * 0.40 - max(0.0, -warm) * 0.30, 0.2, 2.0)
    wg = _clamp(1.0 + warm * 0.06, 0.2, 2.0)
    wb = _clamp(1.0 + max(0.0, -warm) * 0.45 - max(0.0, warm) * 0.35, 0.2, 2.0)

    r_bloom_expr = _format_lutrgb_highlight_expr(
        config.highlight_threshold, config.threshold_softness, config.glow_intensity * wr
    )
    g_bloom_expr = _format_lutrgb_highlight_expr(
        config.highlight_threshold, config.threshold_softness, config.glow_intensity * wg
    )
    b_bloom_expr = _format_lutrgb_highlight_expr(
        config.highlight_threshold, config.threshold_softness, config.glow_intensity * wb
    )

    sigma_1 = round(max(0.8, config.glow_radius_px * 0.32), 2)
    sigma_2 = round(max(1.4, config.glow_radius_px * 0.85), 2)

    hr, hg, hb = config.halation_spectrum_rgb
    r_hal_expr = _format_lutrgb_highlight_expr(
        config.highlight_threshold, config.threshold_softness, config.halation_strength * hr * 1.4
    )
    g_hal_expr = _format_lutrgb_highlight_expr(
        config.highlight_threshold, config.threshold_softness, config.halation_strength * hg * 1.4
    )
    b_hal_expr = _format_lutrgb_highlight_expr(
        config.highlight_threshold, config.threshold_softness, config.halation_strength * hb * 1.4
    )
    hal_sigma = round(max(1.0, config.halation_spread_px * 0.65), 2)

    if config.view_mode == "halation_only":
        hal_chain = (
            f"format=rgb24,lutrgb=r='{r_hal_expr}':g='{g_hal_expr}':b='{b_hal_expr}',"
            f"gblur=sigma={hal_sigma}:steps=2,format=yuv420p"
        )
        hal_ff_cmd = (
            f'ffmpeg -i input.mp4 -filter_complex "[0:v]{hal_chain}[vout]" '
            '-map "[vout]" output.mp4'
        )
        return OpticalGlowCompileResult(
            enabled=True,
            preset_id=config.preset_id,
            blend_mode=config.blend_mode,
            view_mode=config.view_mode,
            tap_count=1,
            effective_radius_px=round(config.halation_spread_px, 2),
            vf_chain=hal_chain,
            filter_complex=f"[0:v]{hal_chain}[vout]",
            ffmpeg_command=hal_ff_cmd,
            warnings=warnings,
        )

    sr, sg, sb = config.streak_tint_rgb
    r_stk_expr = _format_lutrgb_highlight_expr(
        config.highlight_threshold, config.threshold_softness, config.streak_intensity * sr * 1.2
    )
    g_stk_expr = _format_lutrgb_highlight_expr(
        config.highlight_threshold, config.threshold_softness, config.streak_intensity * sg * 1.2
    )
    b_stk_expr = _format_lutrgb_highlight_expr(
        config.highlight_threshold, config.threshold_softness, config.streak_intensity * sb * 1.2
    )
    stk_size_x = max(2, min(160, int(round(config.streak_length_px * 0.5))))
    rot_rad = round(math.radians(config.streak_angle_deg), 4)
    if abs(config.streak_angle_deg) > 0.5:
        streak_filter = (
            f"lutrgb=r='{r_stk_expr}':g='{g_stk_expr}':b='{b_stk_expr}',"
            f"rotate=a={rot_rad}:fillcolor=black,avgblur=sizeX={stk_size_x}:sizeY=1,"
            f"rotate=a={-rot_rad}:fillcolor=black"
        )
    else:
        streak_filter = (
            f"lutrgb=r='{r_stk_expr}':g='{g_stk_expr}':b='{b_stk_expr}',"
            f"avgblur=sizeX={stk_size_x}:sizeY=1"
        )

    ff_blend_mode = {
        "screen": "screen",
        "add_clamp": "addition",
        "soft_light": "softlight",
        "filmic_rolloff": "screen",
    }[config.blend_mode]

    # Multi-tap split graph: base + 2-octave exponential bloom + 35mm halation + anamorphic streak
    graph_parts = [
        "[0:v]format=rgb24,split=5[og_orig][og_base][og_bl1][og_bl2][og_hal_stk]",
        "[og_hal_stk]split=2[og_hal][og_stk]",
        f"[og_bl1]lutrgb=r='{r_bloom_expr}':g='{g_bloom_expr}':b='{b_bloom_expr}',gblur=sigma={sigma_1}:steps=2[og_bl1_out]",
        f"[og_bl2]lutrgb=r='{r_bloom_expr}':g='{g_bloom_expr}':b='{b_bloom_expr}',gblur=sigma={sigma_2}:steps=3[og_bl2_out]",
        "[og_bl1_out][og_bl2_out]blend=all_mode=addition:all_opacity=0.65[og_bloom_mix]",
        f"[og_hal]lutrgb=r='{r_hal_expr}':g='{g_hal_expr}':b='{b_hal_expr}',gblur=sigma={hal_sigma}:steps=2[og_hal_out]",
        f"[og_stk]{streak_filter}[og_stk_out]",
        "[og_bloom_mix][og_hal_out]blend=all_mode=addition:all_opacity=1.0[og_fx_bh]",
        "[og_fx_bh][og_stk_out]blend=all_mode=addition:all_opacity=1.0[og_fx_all]",
    ]

    if config.blend_mode == "filmic_rolloff":
        graph_parts.append(
            "[og_base][og_fx_all]blend=all_mode=screen:all_opacity=0.92,"
            "lutrgb=r='clip(val-0.08*max(val-190,0),0,255)':"
            "g='clip(val-0.08*max(val-190,0),0,255)':"
            "b='clip(val-0.08*max(val-190,0),0,255)'[og_graded]"
        )
    else:
        graph_parts.append(
            f"[og_base][og_fx_all]blend=all_mode={ff_blend_mode}:all_opacity=1.0[og_graded]"
        )

    if config.view_mode == "split_compare":
        split_w = max(2, min(config.width - 2, int(round(config.width * config.split_position))))
        split_w -= split_w % 2
        right_w = max(2, config.width - split_w)
        graph_parts.append(f"[og_orig]crop=w={split_w}:h={config.height}:x=0:y=0[og_left]")
        graph_parts.append(
            f"[og_graded]crop=w={right_w}:h={config.height}:x={split_w}:y=0[og_right]"
        )
        graph_parts.append("[og_left][og_right]hstack=inputs=2,format=yuv420p[vout]")
    else:
        graph_parts.append("[og_orig]nullsink;[og_graded]format=yuv420p[vout]")

    filter_complex = ";".join(graph_parts)
    vf_chain = filter_complex
    ffmpeg_cmd = (
        f'ffmpeg -i input.mp4 -filter_complex "{filter_complex}" -map "[vout]" output.mp4'
    )

    return OpticalGlowCompileResult(
        enabled=True,
        preset_id=config.preset_id,
        blend_mode=config.blend_mode,
        view_mode=config.view_mode,
        tap_count=4,
        effective_radius_px=eff_radius,
        vf_chain=vf_chain,
        filter_complex=filter_complex,
        ffmpeg_command=ffmpeg_cmd,
        warnings=warnings,
    )


def export_optical_glow_json(
    config: OpticalGlowConfig,
    *,
    title: str = "TAKTCUT_OPTICAL_GLOW",
) -> OpticalGlowExportResult:
    """Export optical glow & halation settings as DaVinci / Sapphire compatible JSON."""
    cleaned_title = _SAFE_TITLE_RE.sub("_", str(title or "TAKTCUT_OPTICAL_GLOW").strip()).strip("_")
    if not cleaned_title:
        cleaned_title = "TAKTCUT_OPTICAL_GLOW"

    compiled = compile_optical_glow_filtergraph(config)
    payload = {
        "schema_version": "taktcut.optical_glow.v1",
        "title": cleaned_title,
        "preset_id": config.preset_id,
        "compatible_hosts": [
            "DaVinci Resolve Studio OFX",
            "Boris FX Sapphire S_Glow",
            "FFmpeg Multi-Tap Graph",
        ],
        "highlight_extraction": {
            "highlight_threshold": config.highlight_threshold,
            "threshold_softness": config.threshold_softness,
        },
        "halation_35mm": {
            "halation_strength": config.halation_strength,
            "halation_spread_px": config.halation_spread_px,
            "halation_spectrum_rgb": list(config.halation_spectrum_rgb),
        },
        "exponential_bloom": {
            "glow_intensity": config.glow_intensity,
            "glow_radius_px": config.glow_radius_px,
            "glow_warmth_shift": config.glow_warmth_shift,
            "bloom_saturation": config.bloom_saturation,
            "octaves": config.octaves,
        },
        "anamorphic_streak": {
            "streak_intensity": config.streak_intensity,
            "streak_length_px": config.streak_length_px,
            "streak_angle_deg": config.streak_angle_deg,
            "streak_tint_rgb": list(config.streak_tint_rgb),
        },
        "composite": {
            "enabled": config.enabled,
            "blend_mode": config.blend_mode,
            "view_mode": config.view_mode,
            "split_position": config.split_position,
        },
        "ffmpeg_filter_complex": compiled.filter_complex,
    }
    json_text = json.dumps(payload, indent=2)
    filename = f"{cleaned_title.lower()}_{config.preset_id}_optical_glow.json"
    return OpticalGlowExportResult(
        schema_version="taktcut.optical_glow.v1",
        title=cleaned_title,
        preset_id=config.preset_id,
        compatible_hosts=[
            "DaVinci Resolve Studio OFX",
            "Boris FX Sapphire S_Glow",
            "FFmpeg Multi-Tap Graph",
        ],
        json_text=json_text,
        filename=filename,
    )


def apply_optical_glow_to_document(
    document: TimelineDocument,
    config: OpticalGlowConfig,
    *,
    track_index: int = 1,
    clip_index: int = 0,
) -> TimelineDocument:
    """Attach a non-destructive ClipOpticalGlowTrack onto the target video clip."""
    analysis = analyze_optical_glow_samples(config)
    compiled = compile_optical_glow_filtergraph(config)

    next_doc = document.model_copy(deep=True)
    video_tracks = [t for t in next_doc.tracks if t.kind == "video"]
    target_track = next((t for t in video_tracks if t.index == track_index), None)
    if target_track is None and video_tracks:
        target_track = video_tracks[0]
    if target_track is None or not target_track.clips:
        raise ValueError("No video clip available in timeline document.")

    clamped_idx = max(0, min(len(target_track.clips) - 1, clip_index))
    target_clip = target_track.clips[clamped_idx]
    target_clip.optical_glow = ClipOpticalGlowTrack(
        enabled=config.enabled,
        preset_id=config.preset_id,
        highlight_threshold=config.highlight_threshold,
        threshold_softness=config.threshold_softness,
        halation_strength=config.halation_strength,
        halation_spread_px=config.halation_spread_px,
        halation_spectrum_rgb=config.halation_spectrum_rgb,
        glow_intensity=config.glow_intensity,
        glow_radius_px=config.glow_radius_px,
        glow_warmth_shift=config.glow_warmth_shift,
        bloom_saturation=config.bloom_saturation,
        octaves=config.octaves,
        streak_intensity=config.streak_intensity,
        streak_length_px=config.streak_length_px,
        streak_angle_deg=config.streak_angle_deg,
        streak_tint_rgb=config.streak_tint_rgb,
        blend_mode=config.blend_mode,
        view_mode=config.view_mode,
        split_position=config.split_position,
        triggered_highlight_pct=analysis.triggered_highlight_pct,
        halo_energy_added=analysis.halo_energy_added,
        ffmpeg_vf=compiled.vf_chain[:16384],
    )
    return next_doc
