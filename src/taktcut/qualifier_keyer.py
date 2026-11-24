"""DaVinci Resolve Qualifier (HSL / 3D Chroma Keyer, Spill Suppression & Matte Finesse)
and Boris FX Light-Wrap Composite Studio.

Provides deterministic, strictly typed models and math for:
- Presets: green_screen_pro, blue_screen_cinema, skin_tone_isolator,
  sky_cyan_qualifier, sodium_street_despill, studio_luma_key, custom.
- HSL band + 3D Chroma Distance keying (hybrid, chroma_3d, hsl, luma_key).
- Matte Finesse: pre-blur, clean black/white clip, shrink/grow choke, post-feather.
- Spill Suppression: none, luma_preserving, complement_mix, avg_gb.
- Boris FX Edge Light-Wrap composite simulation and highlight modes.
- Fast RGBA sample / 2D frame evaluator with alpha histogram and leak metrics.
- FFmpeg filtergraph compiler (chromakey/lumakey, despill, matte erode/dilate/lut).
- .cube 3D LUT generator for isolation, alpha matte, or despill workflows.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from taktcut.models import CubeLutInfo

QualifierKeyerPresetId = Literal[
    "green_screen_pro",
    "blue_screen_cinema",
    "skin_tone_isolator",
    "sky_cyan_qualifier",
    "sodium_street_despill",
    "studio_luma_key",
    "custom",
]

QualifierKeyMode = Literal[
    "hybrid",
    "chroma_3d",
    "hsl",
    "luma_key",
]

QualifierDespillMode = Literal[
    "none",
    "luma_preserving",
    "complement_mix",
    "avg_gb",
]

QualifierHighlightMode = Literal[
    "final_composite",
    "bw_alpha_matte",
    "red_rubylith",
    "isolated_foreground",
]

QualifierCubeMode = Literal[
    "isolation",
    "matte",
    "despill",
]

ALLOWED_QUALIFIER_KEYER_PRESETS: tuple[QualifierKeyerPresetId, ...] = (
    "green_screen_pro",
    "blue_screen_cinema",
    "skin_tone_isolator",
    "sky_cyan_qualifier",
    "sodium_street_despill",
    "studio_luma_key",
    "custom",
)

ALLOWED_QUALIFIER_KEY_MODES: tuple[QualifierKeyMode, ...] = (
    "hybrid",
    "chroma_3d",
    "hsl",
    "luma_key",
)

ALLOWED_QUALIFIER_DESPILL_MODES: tuple[QualifierDespillMode, ...] = (
    "none",
    "luma_preserving",
    "complement_mix",
    "avg_gb",
)

ALLOWED_QUALIFIER_HIGHLIGHT_MODES: tuple[QualifierHighlightMode, ...] = (
    "final_composite",
    "bw_alpha_matte",
    "red_rubylith",
    "isolated_foreground",
)

ALLOWED_QUALIFIER_CUBE_MODES: tuple[QualifierCubeMode, ...] = (
    "isolation",
    "matte",
    "despill",
)


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


class QualifierKeyerConfig(BaseModel):
    """Configuration for DaVinci Resolve Qualifier Keyer + Boris FX Light-Wrap Studio."""

    model_config = ConfigDict(extra="ignore")

    enabled: bool = False
    preset_id: QualifierKeyerPresetId = "green_screen_pro"
    key_mode: QualifierKeyMode = "hybrid"
    highlight_mode: QualifierHighlightMode = "final_composite"

    hue_center: float = Field(default=120.0, ge=0.0, le=360.0)
    hue_width: float = Field(default=76.0, ge=1.0, le=360.0)
    hue_softness: float = Field(default=18.0, ge=0.0, le=90.0)
    sat_low: float = Field(default=0.22, ge=0.0, le=1.0)
    sat_high: float = Field(default=1.0, ge=0.0, le=1.0)
    sat_softness: float = Field(default=0.10, ge=0.0, le=0.5)
    luma_low: float = Field(default=0.08, ge=0.0, le=1.0)
    luma_high: float = Field(default=0.95, ge=0.0, le=1.0)
    luma_softness: float = Field(default=0.08, ge=0.0, le=0.5)
    invert_matte: bool = True

    target_rgb: tuple[float, float, float] = (0.12, 0.75, 0.22)
    chroma_distance: float = Field(default=0.28, ge=0.01, le=1.0)
    chroma_softness: float = Field(default=0.14, ge=0.0, le=0.6)

    pre_blur_radius: float = Field(default=0.5, ge=0.0, le=12.0)
    clean_black: float = Field(default=0.06, ge=0.0, le=0.90)
    clean_white: float = Field(default=0.94, ge=0.10, le=1.0)
    choke_px: float = Field(default=0.0, ge=-12.0, le=12.0)
    post_feather_px: float = Field(default=1.0, ge=0.0, le=16.0)

    despill_mode: QualifierDespillMode = "luma_preserving"
    despill_strength: float = Field(default=0.80, ge=0.0, le=1.0)
    light_wrap_intensity: float = Field(default=0.35, ge=0.0, le=1.0)
    light_wrap_radius: float = Field(default=14.0, ge=0.0, le=64.0)
    light_wrap_bg_rgb: tuple[float, float, float] = (0.14, 0.20, 0.34)

    @field_validator("enabled", "invert_matte", mode="before")
    @classmethod
    def _validate_bool(cls, raw: Any, info: Any) -> bool:
        if not isinstance(raw, bool):
            raise ValueError(f"{info.field_name} must be a boolean, got {raw!r}")
        return raw

    @field_validator("preset_id", mode="before")
    @classmethod
    def _validate_preset(cls, raw: Any) -> QualifierKeyerPresetId:
        for item in ALLOWED_QUALIFIER_KEYER_PRESETS:
            if raw == item:
                return item
        allowed = ", ".join(ALLOWED_QUALIFIER_KEYER_PRESETS)
        raise ValueError(f"Unsupported preset_id {raw!r}; expected one of: {allowed}")

    @field_validator("key_mode", mode="before")
    @classmethod
    def _validate_key_mode(cls, raw: Any) -> QualifierKeyMode:
        for item in ALLOWED_QUALIFIER_KEY_MODES:
            if raw == item:
                return item
        allowed = ", ".join(ALLOWED_QUALIFIER_KEY_MODES)
        raise ValueError(f"Unsupported key_mode {raw!r}; expected one of: {allowed}")

    @field_validator("highlight_mode", mode="before")
    @classmethod
    def _validate_highlight_mode(cls, raw: Any) -> QualifierHighlightMode:
        for item in ALLOWED_QUALIFIER_HIGHLIGHT_MODES:
            if raw == item:
                return item
        allowed = ", ".join(ALLOWED_QUALIFIER_HIGHLIGHT_MODES)
        raise ValueError(f"Unsupported highlight_mode {raw!r}; expected one of: {allowed}")

    @field_validator("despill_mode", mode="before")
    @classmethod
    def _validate_despill_mode(cls, raw: Any) -> QualifierDespillMode:
        for item in ALLOWED_QUALIFIER_DESPILL_MODES:
            if raw == item:
                return item
        allowed = ", ".join(ALLOWED_QUALIFIER_DESPILL_MODES)
        raise ValueError(f"Unsupported despill_mode {raw!r}; expected one of: {allowed}")

    @field_validator("target_rgb", "light_wrap_bg_rgb", mode="before")
    @classmethod
    def _validate_rgb(cls, raw: Any, info: Any) -> tuple[float, float, float]:
        return _validate_rgb_tuple(raw, str(info.field_name))

    @model_validator(mode="after")
    def _validate_ranges(self) -> QualifierKeyerConfig:
        if self.sat_low > self.sat_high:
            raise ValueError(
                f"sat_low ({self.sat_low}) must be <= sat_high ({self.sat_high})"
            )
        if self.luma_low > self.luma_high:
            raise ValueError(
                f"luma_low ({self.luma_low}) must be <= luma_high ({self.luma_high})"
            )
        if self.clean_black >= self.clean_white:
            raise ValueError(
                f"clean_black ({self.clean_black}) must be < clean_white ({self.clean_white})"
            )
        return self


class QualifierKeyerPreset(BaseModel):
    """Named DaVinci Resolve / Boris FX keyer preset."""

    preset_id: QualifierKeyerPresetId
    label: str
    category: str
    description: str
    config: QualifierKeyerConfig


class QualifierSampleMetrics(BaseModel):
    """Matte quality telemetry & alpha distribution from sample/frame evaluation."""

    sample_count: int = Field(ge=0)
    width: int = Field(ge=1)
    height: int = Field(ge=1)
    mean_alpha: float = Field(ge=0.0, le=1.0)
    bg_leak_ratio: float = Field(ge=0.0, le=1.0)
    core_solid_ratio: float = Field(ge=0.0, le=1.0)
    edge_contamination_ratio: float = Field(ge=0.0, le=1.0)
    semi_transparent_ratio: float = Field(ge=0.0, le=1.0)
    despill_reduction_ratio: float = Field(ge=0.0, le=1.0)
    light_wrap_energy: float = Field(ge=0.0, le=1.0)
    alpha_histogram: list[int]
    alpha_map: list[float]
    quality_grade: Literal["EXCELLENT", "GOOD", "NEEDS_FINESSE"]


class QualifierCompiledFiltergraph(BaseModel):
    """Compiled FFmpeg filtergraph expressions for the Qualifier Keyer pipeline."""

    enabled: bool
    preset_id: QualifierKeyerPresetId
    key_mode: QualifierKeyMode
    highlight_mode: QualifierHighlightMode
    ffmpeg_key_filter: str
    ffmpeg_despill_filter: str
    ffmpeg_matte_finesse_filter: str
    ffmpeg_light_wrap_filter: str
    ffmpeg_filter_expr: str
    target_hex: str
    warnings: list[str] = Field(default_factory=list)


_PRESETS: tuple[QualifierKeyerPreset, ...] = (
    QualifierKeyerPreset(
        preset_id="green_screen_pro",
        label="Green Screen Pro",
        category="Chroma Keyer",
        description=(
            "3D Chroma + HSL studio green screen key with luma-preserving "
            "despill and edge light-wrap."
        ),
        config=QualifierKeyerConfig(
            enabled=True,
            preset_id="green_screen_pro",
            key_mode="hybrid",
            highlight_mode="final_composite",
            hue_center=120.0,
            hue_width=76.0,
            hue_softness=18.0,
            sat_low=0.22,
            sat_high=1.0,
            sat_softness=0.10,
            luma_low=0.08,
            luma_high=0.95,
            luma_softness=0.08,
            invert_matte=True,
            target_rgb=(0.12, 0.75, 0.22),
            chroma_distance=0.28,
            chroma_softness=0.14,
            pre_blur_radius=0.5,
            clean_black=0.06,
            clean_white=0.94,
            choke_px=0.0,
            post_feather_px=1.0,
            despill_mode="luma_preserving",
            despill_strength=0.80,
            light_wrap_intensity=0.35,
            light_wrap_radius=14.0,
            light_wrap_bg_rgb=(0.14, 0.20, 0.34),
        ),
    ),
    QualifierKeyerPreset(
        preset_id="blue_screen_cinema",
        label="Blue Screen Cinema",
        category="Chroma Keyer",
        description=(
            "Tungsten/cinema blue screen keyer tuned for low-noise shadow "
            "retention and complement-mix despill."
        ),
        config=QualifierKeyerConfig(
            enabled=True,
            preset_id="blue_screen_cinema",
            key_mode="hybrid",
            highlight_mode="final_composite",
            hue_center=228.0,
            hue_width=68.0,
            hue_softness=18.0,
            sat_low=0.24,
            sat_high=1.0,
            sat_softness=0.10,
            luma_low=0.06,
            luma_high=0.92,
            luma_softness=0.08,
            invert_matte=True,
            target_rgb=(0.12, 0.24, 0.78),
            chroma_distance=0.26,
            chroma_softness=0.14,
            pre_blur_radius=0.5,
            clean_black=0.06,
            clean_white=0.93,
            choke_px=-0.5,
            post_feather_px=1.2,
            despill_mode="complement_mix",
            despill_strength=0.78,
            light_wrap_intensity=0.30,
            light_wrap_radius=12.0,
            light_wrap_bg_rgb=(0.24, 0.18, 0.14),
        ),
    ),
    QualifierKeyerPreset(
        preset_id="skin_tone_isolator",
        label="Skin Tone Isolator",
        category="HSL Qualifier",
        description=(
            "DaVinci HSL secondary skin-line isolator (I-line ~24 deg) "
            "with soft matte feathering."
        ),
        config=QualifierKeyerConfig(
            enabled=True,
            preset_id="skin_tone_isolator",
            key_mode="hsl",
            highlight_mode="isolated_foreground",
            hue_center=24.0,
            hue_width=40.0,
            hue_softness=16.0,
            sat_low=0.14,
            sat_high=0.72,
            sat_softness=0.10,
            luma_low=0.18,
            luma_high=0.88,
            luma_softness=0.10,
            invert_matte=False,
            target_rgb=(0.76, 0.52, 0.40),
            chroma_distance=0.24,
            chroma_softness=0.14,
            pre_blur_radius=1.0,
            clean_black=0.04,
            clean_white=0.95,
            choke_px=0.0,
            post_feather_px=2.0,
            despill_mode="none",
            despill_strength=0.0,
            light_wrap_intensity=0.0,
            light_wrap_radius=0.0,
            light_wrap_bg_rgb=(0.10, 0.11, 0.14),
        ),
    ),
    QualifierKeyerPreset(
        preset_id="sky_cyan_qualifier",
        label="Sky / Cyan Qualifier",
        category="HSL Qualifier",
        description="Isolates daylight cyan/blue skies for sky replacement or secondary grading.",
        config=QualifierKeyerConfig(
            enabled=True,
            preset_id="sky_cyan_qualifier",
            key_mode="hsl",
            highlight_mode="red_rubylith",
            hue_center=205.0,
            hue_width=56.0,
            hue_softness=20.0,
            sat_low=0.20,
            sat_high=0.95,
            sat_softness=0.12,
            luma_low=0.35,
            luma_high=0.98,
            luma_softness=0.10,
            invert_matte=False,
            target_rgb=(0.24, 0.58, 0.88),
            chroma_distance=0.28,
            chroma_softness=0.16,
            pre_blur_radius=0.8,
            clean_black=0.05,
            clean_white=0.92,
            choke_px=0.0,
            post_feather_px=1.5,
            despill_mode="none",
            despill_strength=0.0,
            light_wrap_intensity=0.18,
            light_wrap_radius=10.0,
            light_wrap_bg_rgb=(0.82, 0.58, 0.36),
        ),
    ),
    QualifierKeyerPreset(
        preset_id="sodium_street_despill",
        label="Sodium Street Despill",
        category="Spill / Cleanup",
        description=(
            "Suppresses harsh amber/sodium-vapor streetlight contamination "
            "while preserving foreground highlights."
        ),
        config=QualifierKeyerConfig(
            enabled=True,
            preset_id="sodium_street_despill",
            key_mode="hybrid",
            highlight_mode="final_composite",
            hue_center=42.0,
            hue_width=54.0,
            hue_softness=18.0,
            sat_low=0.30,
            sat_high=1.0,
            sat_softness=0.12,
            luma_low=0.12,
            luma_high=0.96,
            luma_softness=0.10,
            invert_matte=True,
            target_rgb=(0.86, 0.62, 0.14),
            chroma_distance=0.25,
            chroma_softness=0.14,
            pre_blur_radius=0.5,
            clean_black=0.05,
            clean_white=0.94,
            choke_px=0.0,
            post_feather_px=1.0,
            despill_mode="luma_preserving",
            despill_strength=0.72,
            light_wrap_intensity=0.22,
            light_wrap_radius=8.0,
            light_wrap_bg_rgb=(0.12, 0.16, 0.24),
        ),
    ),
    QualifierKeyerPreset(
        preset_id="studio_luma_key",
        label="Studio Luma Key",
        category="Luma Keyer",
        description=(
            "Clean luminance keyer separating illuminated foreground talent "
            "from crushed dark studio cyclorama."
        ),
        config=QualifierKeyerConfig(
            enabled=True,
            preset_id="studio_luma_key",
            key_mode="luma_key",
            highlight_mode="bw_alpha_matte",
            hue_center=120.0,
            hue_width=360.0,
            hue_softness=0.0,
            sat_low=0.0,
            sat_high=1.0,
            sat_softness=0.0,
            luma_low=0.18,
            luma_high=1.0,
            luma_softness=0.08,
            invert_matte=False,
            target_rgb=(0.04, 0.04, 0.05),
            chroma_distance=0.30,
            chroma_softness=0.15,
            pre_blur_radius=0.5,
            clean_black=0.08,
            clean_white=0.92,
            choke_px=0.0,
            post_feather_px=1.5,
            despill_mode="none",
            despill_strength=0.0,
            light_wrap_intensity=0.28,
            light_wrap_radius=12.0,
            light_wrap_bg_rgb=(0.18, 0.22, 0.30),
        ),
    ),
    QualifierKeyerPreset(
        preset_id="custom",
        label="Custom Keyer",
        category="Custom",
        description=(
            "User-defined HSL / 3D Chroma Keyer, Matte Finesse & Boris FX "
            "Light-Wrap configuration."
        ),
        config=QualifierKeyerConfig(enabled=False, preset_id="custom"),
    ),
)

_PRESET_BY_ID: dict[QualifierKeyerPresetId, QualifierKeyerPreset] = {
    preset.preset_id: preset for preset in _PRESETS
}


def list_qualifier_keyer_presets() -> list[QualifierKeyerPreset]:
    """Return all DaVinci Resolve / Boris FX Qualifier Keyer presets."""
    return [preset.model_copy(deep=True) for preset in _PRESETS]


def get_qualifier_keyer_preset(preset_id: str) -> QualifierKeyerPreset:
    """Return a single Qualifier Keyer preset by ID."""
    for item in ALLOWED_QUALIFIER_KEYER_PRESETS:
        if preset_id == item:
            return _PRESET_BY_ID[item].model_copy(deep=True)
    allowed = ", ".join(ALLOWED_QUALIFIER_KEYER_PRESETS)
    raise ValueError(f"Unknown qualifier preset_id {preset_id!r}; expected one of: {allowed}")


def normalize_qualifier_keyer_config(raw: Any) -> QualifierKeyerConfig:
    """Validate and normalize a QualifierKeyerConfig payload."""
    if isinstance(raw, QualifierKeyerConfig):
        return raw.model_copy(deep=True)
    if raw is None:
        return QualifierKeyerConfig()
    if not isinstance(raw, dict):
        raise ValueError("Qualifier Keyer config must be an object/dict.")
    return QualifierKeyerConfig.model_validate(raw)


def rgb_to_hsl(r: float, g: float, b: float) -> tuple[float, float, float]:
    """Convert normalized sRGB [0..1] to HSL (hue deg [0..360), sat [0..1], luma [0..1])."""
    cr = _clamp01(r)
    cg = _clamp01(g)
    cb = _clamp01(b)
    max_c = max(cr, cg, cb)
    min_c = min(cr, cg, cb)
    delta = max_c - min_c
    luma = 0.5 * (max_c + min_c)

    if delta <= 1e-7:
        return (0.0, 0.0, luma)

    sat = delta / max(1e-7, 1.0 - abs(2.0 * luma - 1.0))
    if max_c == cr:
        hue = 60.0 * (((cg - cb) / delta) % 6.0)
    elif max_c == cg:
        hue = 60.0 * (((cb - cr) / delta) + 2.0)
    else:
        hue = 60.0 * (((cr - cg) / delta) + 4.0)
    if hue < 0.0:
        hue += 360.0
    return (hue % 360.0, _clamp01(sat), _clamp01(luma))


def _eval_band_weight(val: float, lo: float, hi: float, soft: float) -> float:
    if val >= lo and val <= hi:
        return 1.0
    if soft <= 1e-6:
        return 0.0
    if val < lo:
        return _clamp01(1.0 - (lo - val) / soft)
    return _clamp01(1.0 - (val - hi) / soft)


def _eval_hue_weight(hue: float, center: float, width: float, soft: float) -> float:
    if width >= 359.5:
        return 1.0
    half_w = 0.5 * width
    diff = abs(((hue - center + 180.0) % 360.0) - 180.0)
    if diff <= half_w:
        return 1.0
    if soft <= 1e-6:
        return 0.0
    return _clamp01(1.0 - (diff - half_w) / soft)


def _rgb_to_ycbcr_chroma(r: float, g: float, b: float) -> tuple[float, float]:
    """Compute Rec.709 Cb, Cr chroma coordinates in [-0.5, 0.5]."""
    cb = -0.1146 * r - 0.3854 * g + 0.5 * b
    cr = 0.5 * r - 0.4542 * g - 0.0458 * b
    return (cb, cr)


def evaluate_raw_key_match(config: QualifierKeyerConfig, r: float, g: float, b: float) -> float:
    """Compute raw [0..1] key match before invert_matte and matte finesse."""
    cr = _clamp01(r)
    cg = _clamp01(g)
    cb = _clamp01(b)
    hue, sat, luma = rgb_to_hsl(cr, cg, cb)
    rec709_y = 0.2126 * cr + 0.7152 * cg + 0.0722 * cb

    if config.key_mode == "luma_key":
        return _eval_band_weight(rec709_y, config.luma_low, config.luma_high, config.luma_softness)

    h_w = _eval_hue_weight(hue, config.hue_center, config.hue_width, config.hue_softness)
    s_w = _eval_band_weight(sat, config.sat_low, config.sat_high, config.sat_softness)
    l_w = _eval_band_weight(luma, config.luma_low, config.luma_high, config.luma_softness)
    hsl_weight = h_w * s_w * l_w

    if config.key_mode == "hsl":
        return _clamp01(hsl_weight)

    tr, tg, tb = config.target_rgb
    p_cb, p_cr = _rgb_to_ycbcr_chroma(cr, cg, cb)
    t_cb, t_cr = _rgb_to_ycbcr_chroma(tr, tg, tb)
    chroma_dist = math.hypot(p_cb - t_cb, p_cr - t_cr) * 1.41421356
    rgb_dist = math.sqrt(((cr - tr) ** 2 + (cg - tg) ** 2 + (cb - tb) ** 2) / 3.0)
    dist_3d = 0.72 * chroma_dist + 0.28 * rgb_dist
    if dist_3d <= config.chroma_distance:
        chroma_weight = 1.0
    elif config.chroma_softness <= 1e-6:
        chroma_weight = 0.0
    else:
        chroma_weight = _clamp01(1.0 - (dist_3d - config.chroma_distance) / config.chroma_softness)

    if config.key_mode == "chroma_3d":
        return _clamp01(chroma_weight * l_w)

    # hybrid: geometric-weighted blend of HSL band selectivity and 3D chroma distance
    return _clamp01(0.55 * chroma_weight * l_w + 0.45 * hsl_weight)


def _detect_spill_channel(config: QualifierKeyerConfig) -> Literal["r", "g", "b"]:
    tr, tg, tb = config.target_rgb
    hue = config.hue_center % 360.0
    if 65.0 <= hue <= 175.0 or (tg >= tr and tg >= tb and tg - max(tr, tb) > 0.08):
        return "g"
    if 175.0 < hue <= 290.0 or (tb >= tr and tb >= tg and tb - max(tr, tg) > 0.08):
        return "b"
    return "r"


def apply_spill_suppression(
    config: QualifierKeyerConfig,
    r: float,
    g: float,
    b: float,
) -> tuple[float, float, float]:
    """Suppress chroma spill in RGB using none / luma_preserving / complement_mix / avg_gb."""
    cr = _clamp01(r)
    cg = _clamp01(g)
    cb = _clamp01(b)
    strength = config.despill_strength
    if config.despill_mode == "none" or strength <= 1e-6:
        return (cr, cg, cb)

    ch = _detect_spill_channel(config)
    channels = [cr, cg, cb]
    if ch == "r":
        s_idx, o1_idx, o2_idx = 0, 1, 2
    elif ch == "g":
        s_idx, o1_idx, o2_idx = 1, 0, 2
    else:
        s_idx, o1_idx, o2_idx = 2, 0, 1

    s_val = channels[s_idx]
    o1_val = channels[o1_idx]
    o2_val = channels[o2_idx]

    if config.despill_mode == "avg_gb":
        limit = 0.5 * (o1_val + o2_val)
    elif config.despill_mode == "complement_mix":
        limit = 0.35 * min(o1_val, o2_val) + 0.65 * max(o1_val, o2_val)
    else:
        # luma_preserving
        limit = 0.5 * (o1_val + o2_val)

    if s_val <= limit:
        return (cr, cg, cb)

    excess = (s_val - limit) * strength
    s_new = s_val - excess

    if config.despill_mode == "luma_preserving":
        luma_weights = (0.2126, 0.7152, 0.0722)
        orig_y = cr * luma_weights[0] + cg * luma_weights[1] + cb * luma_weights[2]
        channels[s_idx] = s_new
        new_y = (
            channels[0] * luma_weights[0]
            + channels[1] * luma_weights[1]
            + channels[2] * luma_weights[2]
        )
        delta_y = max(0.0, orig_y - new_y)
        comp_w = luma_weights[o1_idx] + luma_weights[o2_idx]
        if comp_w > 1e-6 and delta_y > 0.0:
            boost = delta_y / comp_w
            channels[o1_idx] = _clamp01(o1_val + boost)
            channels[o2_idx] = _clamp01(o2_val + boost)
    else:
        channels[s_idx] = s_new

    return (_clamp01(channels[0]), _clamp01(channels[1]), _clamp01(channels[2]))


def apply_matte_clean_clip(matte: float, clean_black: float, clean_white: float) -> float:
    """Apply DaVinci Resolve Clean Black / Clean White matte contrast clip."""
    span = max(1e-4, clean_white - clean_black)
    return _clamp01((matte - clean_black) / span)


def evaluate_qualifier_keyer_pixel(
    config: QualifierKeyerConfig,
    r: float,
    g: float,
    b: float,
) -> tuple[float, float, float, float]:
    """Evaluate a single RGB pixel -> (alpha, r_despill, g_despill, b_despill)."""
    raw_match = evaluate_raw_key_match(config, r, g, b)
    matte = 1.0 - raw_match if config.invert_matte else raw_match
    alpha = apply_matte_clean_clip(matte, config.clean_black, config.clean_white)
    dr, dg, db = apply_spill_suppression(config, r, g, b)
    return (alpha, dr, dg, db)


def _box_blur_2d(grid: list[float], width: int, height: int, radius: int) -> list[float]:
    if radius <= 0 or width <= 1 or height <= 1:
        return list(grid)
    temp = [0.0] * (width * height)
    out = [0.0] * (width * height)
    for y in range(height):
        row_off = y * width
        for x in range(width):
            x0 = max(0, x - radius)
            x1 = min(width - 1, x + radius)
            acc = 0.0
            for sx in range(x0, x1 + 1):
                acc += grid[row_off + sx]
            temp[row_off + x] = acc / float(x1 - x0 + 1)
    for y in range(height):
        y0 = max(0, y - radius)
        y1 = min(height - 1, y + radius)
        count = float(y1 - y0 + 1)
        for x in range(width):
            acc = 0.0
            for sy in range(y0, y1 + 1):
                acc += temp[sy * width + x]
            out[y * width + x] = acc / count
    return out


def _morph_choke_2d(grid: list[float], width: int, height: int, choke_px: float) -> list[float]:
    radius = int(round(abs(choke_px)))
    if radius <= 0 or width <= 1 or height <= 1:
        return list(grid)
    radius = min(radius, 4)
    erode = choke_px < 0.0
    out = [0.0] * (width * height)
    for y in range(height):
        y0 = max(0, y - radius)
        y1 = min(height - 1, y + radius)
        for x in range(width):
            x0 = max(0, x - radius)
            x1 = min(width - 1, x + radius)
            best = 1.0 if erode else 0.0
            for sy in range(y0, y1 + 1):
                row_off = sy * width
                for sx in range(x0, x1 + 1):
                    v = grid[row_off + sx]
                    if erode:
                        if v < best:
                            best = v
                    else:
                        if v > best:
                            best = v
            out[y * width + x] = best
    return out


def _synthesize_studio_test_frame(
    config: QualifierKeyerConfig,
    width: int = 24,
    height: int = 16,
) -> list[tuple[float, float, float]]:
    """Synthesize a deterministic 2D studio test frame tailored to the active keyer preset."""
    pixels: list[tuple[float, float, float]] = []
    tr, tg, tb = config.target_rgb
    is_luma = config.key_mode == "luma_key"
    bg_r, bg_g, bg_b = (0.04, 0.04, 0.05) if is_luma else (tr, tg, tb)
    fg_skin = (0.76, 0.54, 0.42)
    fg_jacket = (0.22, 0.24, 0.30)

    cx = (width - 1) * 0.5
    cy = (height - 1) * 0.54
    for y in range(height):
        for x in range(width):
            dx = (x - cx) / max(1.0, width * 0.28)
            dy = (y - cy) / max(1.0, height * 0.38)
            dist = math.hypot(dx, dy)
            if dist <= 0.85:
                # Solid foreground core (skin head upper, jacket lower)
                base = fg_skin if y < height * 0.5 else fg_jacket
                pixels.append(base)
            elif dist <= 1.15:
                # Semi-transparent edge with subtle screen spill
                blend = _clamp01((1.15 - dist) / 0.30)
                base = fg_skin if y < height * 0.5 else fg_jacket
                r = base[0] * blend + bg_r * (1.0 - blend)
                g = base[1] * blend + bg_g * (1.0 - blend)
                b = base[2] * blend + bg_b * (1.0 - blend)
                pixels.append((_clamp01(r), _clamp01(g), _clamp01(b)))
            else:
                # Keyed background with realistic subtle lighting vignette
                shade = 0.92 + 0.08 * math.sin((x / max(1, width)) * math.pi)
                pixels.append(
                    (_clamp01(bg_r * shade), _clamp01(bg_g * shade), _clamp01(bg_b * shade))
                )
    return pixels


def _parse_rgb_samples(
    samples: Sequence[Sequence[float]] | None,
    pixels: Sequence[float] | None,
    width: int,
    height: int,
    config: QualifierKeyerConfig,
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
    return (_synthesize_studio_test_frame(config, syn_w, syn_h), syn_w, syn_h)


def analyze_qualifier_keyer_samples(
    config: QualifierKeyerConfig,
    samples: Sequence[Sequence[float]] | None = None,
    *,
    width: int = 0,
    height: int = 0,
    pixels: Sequence[float] | None = None,
) -> QualifierSampleMetrics:
    """Evaluate alpha matte, spill suppression, and Boris FX edge light-wrap metrics."""
    rgb_list, w, h = _parse_rgb_samples(samples, pixels, width, height, config)
    total = len(rgb_list)
    if total == 0:
        return QualifierSampleMetrics(
            sample_count=0,
            width=1,
            height=1,
            mean_alpha=0.0,
            bg_leak_ratio=0.0,
            core_solid_ratio=0.0,
            edge_contamination_ratio=0.0,
            semi_transparent_ratio=0.0,
            despill_reduction_ratio=0.0,
            light_wrap_energy=0.0,
            alpha_histogram=[0] * 16,
            alpha_map=[],
            quality_grade="GOOD",
        )

    raw_mattes: list[float] = []
    for r, g, b in rgb_list:
        raw_match = evaluate_raw_key_match(config, r, g, b)
        raw_mattes.append(1.0 - raw_match if config.invert_matte else raw_match)

    # Spatial Matte Finesse on 2D grids
    if w > 1 and h > 1 and len(raw_mattes) == w * h:
        pre_r = min(3, int(round(config.pre_blur_radius)))
        matte_grid = _box_blur_2d(raw_mattes, w, h, pre_r)
        matte_grid = [
            apply_matte_clean_clip(v, config.clean_black, config.clean_white) for v in matte_grid
        ]
        matte_grid = _morph_choke_2d(matte_grid, w, h, config.choke_px)
        post_r = min(4, int(round(config.post_feather_px)))
        alphas = _box_blur_2d(matte_grid, w, h, post_r)
        inv_alphas = [1.0 - a for a in alphas]
        wrap_r = (
            max(1, min(5, int(round(config.light_wrap_radius / 4.0))))
            if config.light_wrap_radius > 0.0
            else 0
        )
        blurred_inv = _box_blur_2d(inv_alphas, w, h, wrap_r) if wrap_r > 0 else inv_alphas
    else:
        alphas = [
            apply_matte_clean_clip(v, config.clean_black, config.clean_white) for v in raw_mattes
        ]
        blurred_inv = [1.0 - a for a in alphas]

    hist = [0] * 16
    spill_ch = _detect_spill_channel(config)
    spill_idx = 0 if spill_ch == "r" else 1 if spill_ch == "g" else 2
    other_idxs = [i for i in (0, 1, 2) if i != spill_idx]

    bg_count = 0
    bg_leak_count = 0
    core_solid_count = 0
    semi_trans_count = 0
    edge_spill_sum = 0.0
    edge_count = 0
    orig_spill_sum = 0.0
    new_spill_sum = 0.0
    wrap_energy_sum = 0.0
    alpha_sum = 0.0

    for idx, (r, g, b) in enumerate(rgb_list):
        a = _clamp01(alphas[idx])
        alpha_sum += a
        bin_idx = min(15, max(0, int(a * 15.9999)))
        hist[bin_idx] += 1

        if a >= 0.95:
            core_solid_count += 1
        elif a > 0.02:
            semi_trans_count += 1

        # Background leak: keyed pixels (< 0.20 raw) with residual alpha > 0.08
        if raw_mattes[idx] < 0.20:
            bg_count += 1
            if a > 0.08:
                bg_leak_count += 1

        dr, dg, db = apply_spill_suppression(config, r, g, b)
        orig_vec = (r, g, b)
        new_vec = (dr, dg, db)
        orig_excess = max(
            0.0, orig_vec[spill_idx] - 0.5 * (orig_vec[other_idxs[0]] + orig_vec[other_idxs[1]])
        )
        new_excess = max(
            0.0, new_vec[spill_idx] - 0.5 * (new_vec[other_idxs[0]] + new_vec[other_idxs[1]])
        )
        orig_spill_sum += orig_excess
        new_spill_sum += new_excess

        if 0.02 < a < 0.98:
            edge_count += 1
            edge_spill_sum += new_excess

        wrap_weight = _clamp01(a * blurred_inv[idx] * 2.2 * config.light_wrap_intensity)
        wrap_energy_sum += wrap_weight

    bg_leak_ratio = _clamp01(bg_leak_count / float(max(1, bg_count)))
    core_solid_ratio = _clamp01(core_solid_count / float(total))
    semi_transparent_ratio = _clamp01(semi_trans_count / float(total))
    edge_contamination_ratio = _clamp01(edge_spill_sum / float(max(1, edge_count)))
    despill_reduction_ratio = (
        _clamp01((orig_spill_sum - new_spill_sum) / orig_spill_sum)
        if orig_spill_sum > 1e-6
        else 0.0
    )
    light_wrap_energy = _clamp01(wrap_energy_sum / float(total))

    if bg_leak_ratio <= 0.08 and edge_contamination_ratio <= 0.08:
        grade: Literal["EXCELLENT", "GOOD", "NEEDS_FINESSE"] = "EXCELLENT"
    elif bg_leak_ratio <= 0.22 and edge_contamination_ratio <= 0.20:
        grade = "GOOD"
    else:
        grade = "NEEDS_FINESSE"

    return QualifierSampleMetrics(
        sample_count=total,
        width=w,
        height=h,
        mean_alpha=round(alpha_sum / float(total), 4),
        bg_leak_ratio=round(bg_leak_ratio, 4),
        core_solid_ratio=round(core_solid_ratio, 4),
        edge_contamination_ratio=round(edge_contamination_ratio, 4),
        semi_transparent_ratio=round(semi_transparent_ratio, 4),
        despill_reduction_ratio=round(despill_reduction_ratio, 4),
        light_wrap_energy=round(light_wrap_energy, 4),
        alpha_histogram=hist,
        alpha_map=[round(a, 4) for a in alphas[:2048]],
        quality_grade=grade,
    )


def _rgb_to_hex(rgb: tuple[float, float, float]) -> str:
    r = int(round(_clamp01(rgb[0]) * 255.0))
    g = int(round(_clamp01(rgb[1]) * 255.0))
    b = int(round(_clamp01(rgb[2]) * 255.0))
    return f"0x{r:02X}{g:02X}{b:02X}"


def compile_qualifier_filtergraph(config: QualifierKeyerConfig) -> QualifierCompiledFiltergraph:
    """Compile the DaVinci Resolve Qualifier + Matte Finesse + Light-Wrap FFmpeg filtergraph."""
    target_hex = _rgb_to_hex(config.target_rgb)
    warnings: list[str] = []

    if not config.enabled:
        return QualifierCompiledFiltergraph(
            enabled=False,
            preset_id=config.preset_id,
            key_mode=config.key_mode,
            highlight_mode=config.highlight_mode,
            ffmpeg_key_filter="null",
            ffmpeg_despill_filter="null",
            ffmpeg_matte_finesse_filter="null",
            ffmpeg_light_wrap_filter="null",
            ffmpeg_filter_expr="null",
            target_hex=target_hex,
            warnings=["Qualifier Keyer bypass active (enabled=false)."],
        )

    # 1. Keyer stage
    if config.key_mode == "luma_key":
        threshold = round(_clamp01(0.5 * (config.luma_low + config.luma_high)), 4)
        tolerance = round(_clamp(0.5 * (config.luma_high - config.luma_low), 0.01, 1.0), 4)
        softness = round(_clamp01(config.luma_softness), 4)
        key_filter = (
            f"format=rgba,lumakey=threshold={threshold:.4f}"
            f":tolerance={tolerance:.4f}:softness={softness:.4f}"
        )
    elif config.key_mode == "chroma_3d":
        sim = round(_clamp(config.chroma_distance, 0.01, 1.0), 4)
        blend = round(_clamp(config.chroma_softness, 0.0, 0.6), 4)
        key_filter = (
            f"format=rgba,colorkey=color={target_hex}"
            f":similarity={sim:.4f}:blend={blend:.4f}"
        )
    elif config.key_mode == "hsl":
        sim = round(_clamp(config.hue_width / 360.0, 0.02, 0.85), 4)
        blend = round(_clamp(config.hue_softness / 180.0, 0.0, 0.5), 4)
        key_filter = (
            f"format=rgba,chromakey=color={target_hex}"
            f":similarity={sim:.4f}:blend={blend:.4f}"
        )
    else:
        sim = round(_clamp(config.chroma_distance, 0.01, 1.0), 4)
        blend = round(_clamp(config.chroma_softness, 0.0, 0.6), 4)
        key_filter = (
            f"format=rgba,chromakey=color={target_hex}"
            f":similarity={sim:.4f}:blend={blend:.4f}"
        )

    # 2. Spill suppression stage
    spill_ch = _detect_spill_channel(config)
    if config.despill_mode == "none" or config.despill_strength <= 1e-6:
        despill_filter = "null"
    else:
        despill_type = "blue" if spill_ch == "b" else "green"
        if spill_ch == "r":
            warnings.append("Red/sodium despill mapped to FFmpeg colorbalance warm-spill trim.")
            shift = round(-0.35 * config.despill_strength, 3)
            despill_filter = f"colorbalance=rm={shift:.3f}:rh={shift:.3f}"
        else:
            mix = round(_clamp(0.5 * config.despill_strength, 0.0, 1.0), 3)
            expand = round(_clamp(0.25 * config.despill_strength, 0.0, 1.0), 3)
            bright = 0.12 if config.despill_mode == "luma_preserving" else 0.0
            despill_filter = (
                f"despill=type={despill_type}:mix={mix:.3f}"
                f":expand={expand:.3f}:brightness={bright:.3f}"
            )

    # 3. Matte finesse stage
    matte_ops: list[str] = []
    if config.pre_blur_radius >= 0.5:
        rad = max(1, int(round(config.pre_blur_radius)))
        matte_ops.append(f"boxblur=lr={rad}:lp=1")
    if config.clean_black > 0.001 or config.clean_white < 0.999:
        span = max(0.01, config.clean_white - config.clean_black)
        matte_ops.append(
            f"lut=y='clip((val/255-{config.clean_black:.4f})/{span:.4f}\\,0\\,1)*255'"
        )
    if config.choke_px <= -0.5:
        steps = min(4, max(1, int(round(abs(config.choke_px)))))
        matte_ops.extend(["erosion"] * steps)
    elif config.choke_px >= 0.5:
        steps = min(4, max(1, int(round(config.choke_px))))
        matte_ops.extend(["dilation"] * steps)
    if config.post_feather_px >= 0.5:
        pf = max(1, int(round(config.post_feather_px)))
        matte_ops.append(f"boxblur=lr={pf}:lp=1")

    if matte_ops:
        matte_chain = ",".join(matte_ops)
        matte_finesse_filter = (
            f"split[qkfg][qkalp];[qkalp]alphaextract,{matte_chain}[qkmatte];"
            f"[qkfg][qkmatte]alphamerge"
        )
    else:
        matte_finesse_filter = "null"

    # 4. Boris FX Light-Wrap & Highlight stage
    bg_hex = _rgb_to_hex(config.light_wrap_bg_rgb)
    if config.highlight_mode == "bw_alpha_matte":
        light_wrap_filter = "alphaextract,format=rgb24"
    elif config.highlight_mode == "red_rubylith":
        light_wrap_filter = "format=rgba"
    elif config.light_wrap_intensity > 0.01 and config.light_wrap_radius > 0.5:
        lw_blur = max(1, int(round(config.light_wrap_radius)))
        lw_alpha = round(_clamp01(config.light_wrap_intensity * 0.45), 3)
        light_wrap_filter = (
            f"drawbox=color={bg_hex}@{lw_alpha:.3f}:t=2:box_source=0,"
            f"boxblur=lr={min(4, lw_blur)}:lp=1"
        )
    else:
        light_wrap_filter = "null"

    chain_parts = [key_filter]
    if despill_filter != "null":
        chain_parts.append(despill_filter)
    if matte_finesse_filter != "null":
        chain_parts.append(matte_finesse_filter)
    if config.highlight_mode == "bw_alpha_matte":
        chain_parts.append("alphaextract,format=rgb24")

    has_split = any("[" in p for p in chain_parts)
    full_expr = ";".join(chain_parts) if has_split else ",".join(chain_parts)
    if has_split:
        # Convert mixed linear + split/merge stages into a single valid filtergraph string
        ordered: list[str] = [key_filter]
        if despill_filter != "null":
            ordered.append(despill_filter)
        linear_prefix = ",".join(ordered)
        suffix = ",alphaextract,format=rgb24" if config.highlight_mode == "bw_alpha_matte" else ""
        full_expr = f"{linear_prefix},{matte_finesse_filter}{suffix}"

    return QualifierCompiledFiltergraph(
        enabled=True,
        preset_id=config.preset_id,
        key_mode=config.key_mode,
        highlight_mode=config.highlight_mode,
        ffmpeg_key_filter=key_filter,
        ffmpeg_despill_filter=despill_filter,
        ffmpeg_matte_finesse_filter=matte_finesse_filter,
        ffmpeg_light_wrap_filter=light_wrap_filter,
        ffmpeg_filter_expr=full_expr,
        target_hex=target_hex,
        warnings=warnings,
    )


def generate_qualifier_cube_text(
    config: QualifierKeyerConfig,
    size: int = 17,
    mode: QualifierCubeMode = "isolation",
    title: str = "taktcut_qualifier_keyer",
) -> str:
    """Generate an Adobe .cube 3D LUT for isolation, grayscale alpha matte, or despill."""
    if isinstance(size, bool) or not isinstance(size, int) or size < 2 or size > 65:
        raise ValueError(f"LUT size must be an integer in [2, 65], got {size!r}")
    if mode not in ALLOWED_QUALIFIER_CUBE_MODES:
        allowed = ", ".join(ALLOWED_QUALIFIER_CUBE_MODES)
        raise ValueError(f"Unsupported .cube mode {mode!r}; expected one of: {allowed}")

    safe_title = title.strip().replace('"', "") or "taktcut_qualifier_keyer"
    lines: list[str] = [
        f'TITLE "{safe_title}"',
        f"LUT_3D_SIZE {size}",
        "DOMAIN_MIN 0.0 0.0 0.0",
        "DOMAIN_MAX 1.0 1.0 1.0",
    ]
    denom = float(size - 1)
    # Adobe .cube ordering: B outer, G middle, R inner
    for b_idx in range(size):
        b = b_idx / denom
        for g_idx in range(size):
            g = g_idx / denom
            for r_idx in range(size):
                r = r_idx / denom
                alpha, dr, dg, db = evaluate_qualifier_keyer_pixel(config, r, g, b)
                if mode == "matte":
                    out_r, out_g, out_b = alpha, alpha, alpha
                elif mode == "despill":
                    out_r, out_g, out_b = dr, dg, db
                else:
                    # isolation
                    out_r = dr * alpha
                    out_g = dg * alpha
                    out_b = db * alpha
                lines.append(f"{out_r:.6f} {out_g:.6f} {out_b:.6f}")
    return "\n".join(lines) + "\n"


def bake_qualifier_to_cube(
    config: QualifierKeyerConfig,
    out_path: Path,
    size: int = 17,
    mode: QualifierCubeMode = "isolation",
    title: str = "taktcut_qualifier_keyer",
) -> CubeLutInfo:
    """Write a Qualifier Keyer 3D LUT .cube file and return CubeLutInfo."""
    text = generate_qualifier_cube_text(config, size=size, mode=mode, title=title)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(text, encoding="utf-8")
    return CubeLutInfo(
        path=out_path.as_posix(),
        title=title.strip() or "taktcut_qualifier_keyer",
        dimension="3D",
        size=size,
        entry_count=size**3,
    )
