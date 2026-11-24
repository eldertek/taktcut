"""DaVinci Resolve Film Look Creator, Dehancer & Boris FX Sapphire S_FilmEffect Studio.

Provides strictly typed Pydantic v2 models, deterministic sensitometric D-logE print-stock
curve simulation (33-point R/G/B transfer), film grain / gate weave / flicker / halation
metrics, FFmpeg filtergraph compilation (curves, colorbalance, eq, noise, vignette,
crop/pad gate weave), JSON export (taktcut.film_look_studio.v1), and non-destructive
TimelineClip attachment for:
- Print Stock Presets: kodak_2383_d65, fuji_3513_teal_gold, super16_bleach_bypass,
  ilford_hp5_bw_35mm, vintage_70s_warm_fade, custom.
- Grain Gauges: 8mm, 16mm, 35mm, 65mm.
"""

from __future__ import annotations

import json
import math
import re
from collections.abc import Mapping
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from taktcut.models import ClipFilmLookTrack, TimelineDocument

FilmLookPrintStockId = Literal[
    "kodak_2383_d65",
    "fuji_3513_teal_gold",
    "super16_bleach_bypass",
    "ilford_hp5_bw_35mm",
    "vintage_70s_warm_fade",
    "custom",
]

FilmLookGrainGaugeMm = Literal[8, 16, 35, 65]

FILM_LOOK_CURVE_SAMPLE_COUNT = 33

ALLOWED_FILM_LOOK_PRINT_STOCKS: tuple[FilmLookPrintStockId, ...] = (
    "kodak_2383_d65",
    "fuji_3513_teal_gold",
    "super16_bleach_bypass",
    "ilford_hp5_bw_35mm",
    "vintage_70s_warm_fade",
    "custom",
)

ALLOWED_FILM_LOOK_GRAIN_GAUGES: tuple[FilmLookGrainGaugeMm, ...] = (8, 16, 35, 65)

_PRINT_STOCK_MAP: dict[str, FilmLookPrintStockId] = {p: p for p in ALLOWED_FILM_LOOK_PRINT_STOCKS}
_GRAIN_GAUGE_MAP: dict[int, FilmLookGrainGaugeMm] = {g: g for g in ALLOWED_FILM_LOOK_GRAIN_GAUGES}
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


def _validate_bool(raw: Any, field_name: str) -> bool:
    if not isinstance(raw, bool):
        raise ValueError(f"{field_name} must be a boolean, got {raw!r}")
    return raw


class FilmLookStudioConfig(BaseModel):
    """Complete 35mm/16mm Film Look Creator, Print Stock Curve & Bleach Bypass configuration."""

    model_config = ConfigDict(extra="ignore")

    enabled: bool = True
    print_stock: FilmLookPrintStockId = "kodak_2383_d65"
    exposure_ev: float = Field(default=0.0, ge=-2.0, le=2.0)
    contrast_pivot: float = Field(default=0.435, ge=0.15, le=0.85)
    toe_density_pct: float = Field(default=38.0, ge=0.0, le=100.0)
    shoulder_rolloff_pct: float = Field(default=64.0, ge=0.0, le=100.0)
    split_tone_shadow_hue: float = Field(default=205.0, ge=0.0, le=360.0)
    split_tone_highlight_hue: float = Field(default=42.0, ge=0.0, le=360.0)
    bleach_bypass_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    grain_size_mm: FilmLookGrainGaugeMm = 35
    grain_strength_pct: float = Field(default=28.0, ge=0.0, le=100.0)
    gate_weave_px: float = Field(default=0.8, ge=0.0, le=6.0)
    flicker_pct: float = Field(default=4.0, ge=0.0, le=30.0)
    halation_red_pct: float = Field(default=24.0, ge=0.0, le=100.0)
    compare_split: bool = True
    split_position: float = Field(default=0.5, ge=0.0, le=1.0)
    width: int = Field(default=1920, ge=320, le=7680)
    height: int = Field(default=1080, ge=240, le=4320)
    fps: float = Field(default=24.0, ge=1.0, le=120.0)

    @field_validator("enabled", "compare_split", mode="before")
    @classmethod
    def _val_bool(cls, raw: Any, info: Any) -> bool:
        return _validate_bool(raw, str(info.field_name))

    @field_validator("print_stock", mode="before")
    @classmethod
    def _val_print_stock(cls, raw: Any) -> FilmLookPrintStockId:
        if not isinstance(raw, str):
            raise ValueError(f"print_stock must be a string, got {raw!r}")
        cleaned = _PRINT_STOCK_MAP.get(raw.strip().lower())
        if cleaned is None:
            allowed = ", ".join(ALLOWED_FILM_LOOK_PRINT_STOCKS)
            raise ValueError(f"Unsupported print_stock {raw!r}; expected: {allowed}")
        return cleaned

    @field_validator("exposure_ev", mode="before")
    @classmethod
    def _val_exposure(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "exposure_ev", -2.0, 2.0), 3)

    @field_validator("contrast_pivot", mode="before")
    @classmethod
    def _val_pivot(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "contrast_pivot", 0.15, 0.85), 4)

    @field_validator(
        "toe_density_pct",
        "shoulder_rolloff_pct",
        "bleach_bypass_pct",
        "grain_strength_pct",
        "halation_red_pct",
        mode="before",
    )
    @classmethod
    def _val_pct(cls, raw: Any, info: Any) -> float:
        return round(_validate_bounded_float(raw, str(info.field_name), 0.0, 100.0), 2)

    @field_validator("split_tone_shadow_hue", "split_tone_highlight_hue", mode="before")
    @classmethod
    def _val_hue(cls, raw: Any, info: Any) -> float:
        return round(_validate_bounded_float(raw, str(info.field_name), 0.0, 360.0), 2)

    @field_validator("grain_size_mm", mode="before")
    @classmethod
    def _val_grain_gauge(cls, raw: Any) -> FilmLookGrainGaugeMm:
        if isinstance(raw, bool) or not isinstance(raw, (int, float)):
            raise ValueError(f"grain_size_mm must be 8, 16, 35, or 65, got {raw!r}")
        ival = int(round(float(raw)))
        gauge = _GRAIN_GAUGE_MAP.get(ival)
        if gauge is None:
            raise ValueError(f"grain_size_mm must be 8, 16, 35, or 65, got {raw!r}")
        return gauge

    @field_validator("gate_weave_px", mode="before")
    @classmethod
    def _val_weave(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "gate_weave_px", 0.0, 6.0), 3)

    @field_validator("flicker_pct", mode="before")
    @classmethod
    def _val_flicker(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "flicker_pct", 0.0, 30.0), 2)

    @field_validator("split_position", mode="before")
    @classmethod
    def _val_split(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "split_position", 0.0, 1.0), 4)

    @field_validator("width", mode="before")
    @classmethod
    def _val_width(cls, raw: Any) -> int:
        if isinstance(raw, bool) or not isinstance(raw, (int, float)):
            raise ValueError(f"width must be an integer, got {raw!r}")
        val = int(round(float(raw)))
        if val < 320 or val > 7680:
            raise ValueError(f"width must be in [320, 7680], got {raw!r}")
        return val

    @field_validator("height", mode="before")
    @classmethod
    def _val_height(cls, raw: Any) -> int:
        if isinstance(raw, bool) or not isinstance(raw, (int, float)):
            raise ValueError(f"height must be an integer, got {raw!r}")
        val = int(round(float(raw)))
        if val < 240 or val > 4320:
            raise ValueError(f"height must be in [240, 4320], got {raw!r}")
        return val

    @field_validator("fps", mode="before")
    @classmethod
    def _val_fps(cls, raw: Any) -> float:
        return round(_validate_bounded_float(raw, "fps", 1.0, 120.0), 3)


class FilmLookStudioPreset(BaseModel):
    """Curated DaVinci Film Look Creator / Dehancer / Sapphire S_FilmEffect print stock preset."""

    print_stock: FilmLookPrintStockId
    label: str
    description: str
    default_config: FilmLookStudioConfig


class FilmLookCurveSample(BaseModel):
    """Single sensitometric D-logE sample point across R/G/B and luma channels."""

    x_norm: float
    log_exposure: float
    linear_ref: float
    luma: float
    r: float
    g: float
    b: float


class FilmLookStudioEvaluateResult(BaseModel):
    """Deterministic sensitometric D-logE curve, contrast, DR, and grain RMS telemetry."""

    enabled: bool
    print_stock: FilmLookPrintStockId
    contrast_ratio: float
    gamma_at_pivot: float
    dynamic_range_stops: float
    grain_rms: float
    shadow_density_dmax: float
    highlight_headroom_pct: float
    silver_retention_pct: float
    gate_weave_rms_px: float
    flicker_delta_ire: float
    halation_energy_pct: float
    is_monochrome: bool
    samples: list[FilmLookCurveSample]


class FilmLookStudioCompileResult(BaseModel):
    """Compiled FFmpeg print-stock filter pipeline (curves, eq, noise, vignette, crop/pad)."""

    enabled: bool
    print_stock: FilmLookPrintStockId
    curves_vf: str
    colorbalance_vf: str
    eq_vf: str
    noise_vf: str
    vignette_vf: str
    gate_weave_vf: str
    vf_chain: str
    ffmpeg_command: str
    warnings: list[str]


class FilmLookStudioExportResult(BaseModel):
    """Serialized taktcut.film_look_studio.v1 JSON payload."""

    schema_version: Literal["taktcut.film_look_studio.v1"] = "taktcut.film_look_studio.v1"
    title: str
    print_stock: FilmLookPrintStockId
    compatible_hosts: list[str]
    json_text: str
    filename: str
    saved_path: str | None = None


_STOCK_SIGNATURES: dict[FilmLookPrintStockId, dict[str, float]] = {
    "kodak_2383_d65": {
        "floor": 0.012,
        "ceil": 0.965,
        "gamma_base": 1.18,
        "r_gain": 1.015,
        "g_gain": 1.000,
        "b_gain": 0.985,
        "mono": 0.0,
        "split_strength": 0.14,
    },
    "fuji_3513_teal_gold": {
        "floor": 0.022,
        "ceil": 0.955,
        "gamma_base": 1.12,
        "r_gain": 1.020,
        "g_gain": 1.005,
        "b_gain": 0.965,
        "mono": 0.0,
        "split_strength": 0.24,
    },
    "super16_bleach_bypass": {
        "floor": 0.008,
        "ceil": 0.978,
        "gamma_base": 1.38,
        "r_gain": 0.995,
        "g_gain": 1.005,
        "b_gain": 1.000,
        "mono": 0.0,
        "split_strength": 0.12,
    },
    "ilford_hp5_bw_35mm": {
        "floor": 0.018,
        "ceil": 0.960,
        "gamma_base": 1.24,
        "r_gain": 1.000,
        "g_gain": 1.000,
        "b_gain": 1.000,
        "mono": 1.0,
        "split_strength": 0.04,
    },
    "vintage_70s_warm_fade": {
        "floor": 0.056,
        "ceil": 0.925,
        "gamma_base": 0.96,
        "r_gain": 1.040,
        "g_gain": 1.010,
        "b_gain": 0.920,
        "mono": 0.0,
        "split_strength": 0.22,
    },
    "custom": {
        "floor": 0.014,
        "ceil": 0.965,
        "gamma_base": 1.14,
        "r_gain": 1.000,
        "g_gain": 1.000,
        "b_gain": 1.000,
        "mono": 0.0,
        "split_strength": 0.16,
    },
}

_PRESETS: tuple[FilmLookStudioPreset, ...] = (
    FilmLookStudioPreset(
        print_stock="kodak_2383_d65",
        label="Kodak 2383 Print D65",
        description=(
            "Reference Kodak Vision 2383 D65 print curve with rich D-max blacks, "
            "deep cyan shadow toe, and warm ivory highlights."
        ),
        default_config=FilmLookStudioConfig(
            print_stock="kodak_2383_d65",
            exposure_ev=0.0,
            contrast_pivot=0.435,
            toe_density_pct=42.0,
            shoulder_rolloff_pct=66.0,
            split_tone_shadow_hue=205.0,
            split_tone_highlight_hue=42.0,
            bleach_bypass_pct=0.0,
            grain_size_mm=35,
            grain_strength_pct=28.0,
            gate_weave_px=0.8,
            flicker_pct=4.0,
            halation_red_pct=26.0,
        ),
    ),
    FilmLookStudioPreset(
        print_stock="fuji_3513_teal_gold",
        label="Fuji 3513 Teal/Gold",
        description=(
            "Fuji Eterna 3513DI print emulation with creamy shadow toe, "
            "teal shadow separation, and golden skin highlights."
        ),
        default_config=FilmLookStudioConfig(
            print_stock="fuji_3513_teal_gold",
            exposure_ev=0.08,
            contrast_pivot=0.45,
            toe_density_pct=34.0,
            shoulder_rolloff_pct=72.0,
            split_tone_shadow_hue=192.0,
            split_tone_highlight_hue=36.0,
            bleach_bypass_pct=6.0,
            grain_size_mm=35,
            grain_strength_pct=24.0,
            gate_weave_px=0.6,
            flicker_pct=3.5,
            halation_red_pct=22.0,
        ),
    ),
    FilmLookStudioPreset(
        print_stock="super16_bleach_bypass",
        label="Super 16 Bleach Bypass",
        description=(
            "Silver-retained skip-bleach Super 16mm look with high midtone "
            "micro-contrast, pronounced 16mm grain, and gate weave."
        ),
        default_config=FilmLookStudioConfig(
            print_stock="super16_bleach_bypass",
            exposure_ev=-0.12,
            contrast_pivot=0.41,
            toe_density_pct=68.0,
            shoulder_rolloff_pct=52.0,
            split_tone_shadow_hue=215.0,
            split_tone_highlight_hue=50.0,
            bleach_bypass_pct=58.0,
            grain_size_mm=16,
            grain_strength_pct=56.0,
            gate_weave_px=2.1,
            flicker_pct=9.5,
            halation_red_pct=18.0,
        ),
    ),
    FilmLookStudioPreset(
        print_stock="ilford_hp5_bw_35mm",
        label="Ilford HP5 B&W 35mm",
        description=(
            "Classic panchromatic 35mm silver-gelatin monochrome curve with "
            "crisp shadow density and organic 400 ASA grain."
        ),
        default_config=FilmLookStudioConfig(
            print_stock="ilford_hp5_bw_35mm",
            exposure_ev=0.05,
            contrast_pivot=0.44,
            toe_density_pct=48.0,
            shoulder_rolloff_pct=68.0,
            split_tone_shadow_hue=210.0,
            split_tone_highlight_hue=45.0,
            bleach_bypass_pct=100.0,
            grain_size_mm=35,
            grain_strength_pct=44.0,
            gate_weave_px=1.0,
            flicker_pct=5.0,
            halation_red_pct=0.0,
        ),
    ),
    FilmLookStudioPreset(
        print_stock="vintage_70s_warm_fade",
        label="Vintage 70s Warm Fade",
        description=(
            "1970s ECN-2 faded print emulation with lifted matte black floor, "
            "soft highlight shoulder, and warm red emulsion halation."
        ),
        default_config=FilmLookStudioConfig(
            print_stock="vintage_70s_warm_fade",
            exposure_ev=0.15,
            contrast_pivot=0.48,
            toe_density_pct=22.0,
            shoulder_rolloff_pct=82.0,
            split_tone_shadow_hue=28.0,
            split_tone_highlight_hue=44.0,
            bleach_bypass_pct=12.0,
            grain_size_mm=16,
            grain_strength_pct=42.0,
            gate_weave_px=1.6,
            flicker_pct=8.5,
            halation_red_pct=46.0,
        ),
    ),
    FilmLookStudioPreset(
        print_stock="custom",
        label="Custom Print Lab",
        description=(
            "User-calibrated D-logE print curve, split toning, silver retention, "
            "grain gauge, and gate weave."
        ),
        default_config=FilmLookStudioConfig(
            print_stock="custom",
            exposure_ev=0.0,
            contrast_pivot=0.435,
            toe_density_pct=38.0,
            shoulder_rolloff_pct=64.0,
            split_tone_shadow_hue=205.0,
            split_tone_highlight_hue=42.0,
            bleach_bypass_pct=0.0,
            grain_size_mm=35,
            grain_strength_pct=28.0,
            gate_weave_px=0.8,
            flicker_pct=4.0,
            halation_red_pct=24.0,
        ),
    ),
)

_PRESET_BY_ID: dict[FilmLookPrintStockId, FilmLookStudioPreset] = {
    p.print_stock: p for p in _PRESETS
}


def list_film_look_presets() -> list[FilmLookStudioPreset]:
    """Return curated Film Look Creator print stock presets."""
    return list(_PRESETS)


def get_film_look_preset(print_stock: str) -> FilmLookStudioPreset:
    """Lookup Film Look Creator preset by print_stock identifier."""
    cleaned = str(print_stock or "").strip().lower()
    if cleaned not in _PRINT_STOCK_MAP:
        allowed = ", ".join(ALLOWED_FILM_LOOK_PRINT_STOCKS)
        raise ValueError(f"Unsupported film look print_stock {print_stock!r}; expected: {allowed}")
    return _PRESET_BY_ID[_PRINT_STOCK_MAP[cleaned]]


def normalize_film_look_config(raw: Any) -> FilmLookStudioConfig:
    """Normalize raw dict/config into a validated FilmLookStudioConfig."""
    if raw is None:
        return FilmLookStudioConfig()
    if isinstance(raw, FilmLookStudioConfig):
        return raw
    if not isinstance(raw, Mapping):
        raise ValueError("film_look_studio config must be a JSON object")

    raw_dict = dict(raw)
    if "print_stock" not in raw_dict and "preset_id" in raw_dict:
        raw_dict["print_stock"] = raw_dict["preset_id"]

    stock_raw = str(raw_dict.get("print_stock", "kodak_2383_d65")).strip().lower()
    if stock_raw not in _PRINT_STOCK_MAP:
        allowed = ", ".join(ALLOWED_FILM_LOOK_PRINT_STOCKS)
        raise ValueError(f"Unsupported print_stock {stock_raw!r}; expected: {allowed}")
    stock_id = _PRINT_STOCK_MAP[stock_raw]
    base_dict = _PRESET_BY_ID[stock_id].default_config.model_dump()

    allowed_fields = set(FilmLookStudioConfig.model_fields.keys())
    merged: dict[str, Any] = dict(base_dict)
    for key, val in raw_dict.items():
        if key in allowed_fields and val is not None:
            merged[key] = val
    merged["print_stock"] = stock_id
    return FilmLookStudioConfig.model_validate(merged)


def _hue_to_rgb_offset(hue_deg: float) -> tuple[float, float, float]:
    """Convert a hue angle [0..360] into a zero-mean RGB color balance unit vector."""
    rad = math.radians(hue_deg)
    r = math.cos(rad)
    g = math.cos(rad - 2.0943951023931953)
    b = math.cos(rad + 2.0943951023931953)
    mean = (r + g + b) / 3.0
    return (r - mean, g - mean, b - mean)


def _eval_sensitometric_transfer(
    x_norm: float, config: FilmLookStudioConfig
) -> tuple[float, float, float, float]:
    """Evaluate deterministic sensitometric D-logE print transfer (luma, r, g, b) at x_norm."""
    if not config.enabled:
        v = _clamp(x_norm, 0.0, 1.0)
        return (v, v, v, v)

    sig = _STOCK_SIGNATURES[config.print_stock]
    ev_scale = math.pow(2.0, config.exposure_ev * 0.42)
    x_exp = _clamp(x_norm * ev_scale, 0.0, 1.45)

    pivot = config.contrast_pivot
    toe_k = 0.25 + (config.toe_density_pct / 100.0) * 1.15
    shoulder_k = 0.25 + (config.shoulder_rolloff_pct / 100.0) * 1.25
    bleach_k = config.bleach_bypass_pct / 100.0
    gamma = sig["gamma_base"] * (1.0 + bleach_k * 0.42)

    # Smooth asymmetric toe + shoulder S-curve pivoted at contrast_pivot
    delta = x_exp - pivot
    if delta < 0.0:
        slope = gamma * (1.0 + toe_k * 0.35)
        shaped = pivot / (1.0 + math.exp(-slope * (x_exp - pivot) / max(0.12, pivot)))
        base_anchor = pivot / (1.0 + math.exp(slope))
        luma_raw = (shaped - base_anchor) / max(1e-5, 1.0 - base_anchor * 1.15)
    else:
        slope = gamma * (1.0 + (1.0 - shoulder_k * 0.45) * 0.25)
        tail = 1.0 - pivot
        norm_hi = (x_exp - pivot) / max(0.12, tail)
        compressed = 1.0 - math.exp(-slope * norm_hi * (0.85 + 0.75 * shoulder_k))
        denom = 1.0 - math.exp(-slope * (0.85 + 0.75 * shoulder_k) * (1.0 / max(0.25, tail) * tail))
        luma_raw = pivot + (1.0 - pivot) * (compressed / max(1e-5, denom))

    floor = sig["floor"] * (1.0 - (config.toe_density_pct / 100.0) * 0.45)
    ceil = sig["ceil"] - (config.shoulder_rolloff_pct / 100.0) * 0.035
    luma = _clamp(floor + (ceil - floor) * _clamp(luma_raw, 0.0, 1.0), 0.0, 1.0)

    if sig["mono"] >= 0.99:
        return (luma, luma, luma, luma)

    sh_vec = _hue_to_rgb_offset(config.split_tone_shadow_hue)
    hi_vec = _hue_to_rgb_offset(config.split_tone_highlight_hue)

    sh_weight = (
        math.pow(max(0.0, 1.0 - x_norm), 1.6) * sig["split_strength"] * (1.0 - bleach_k * 0.55)
    )
    hi_weight = math.pow(max(0.0, x_norm), 1.5) * sig["split_strength"] * (1.0 - bleach_k * 0.45)
    hal_red_boost = (config.halation_red_pct / 100.0) * 0.065 * math.pow(max(0.0, x_norm), 2.1)

    r_raw = (
        luma * sig["r_gain"]
        + sh_weight * sh_vec[0] * 0.28
        + hi_weight * hi_vec[0] * 0.28
        + hal_red_boost
    )
    g_raw = luma * sig["g_gain"] + sh_weight * sh_vec[1] * 0.28 + hi_weight * hi_vec[1] * 0.28
    b_raw = luma * sig["b_gain"] + sh_weight * sh_vec[2] * 0.28 + hi_weight * hi_vec[2] * 0.28

    # Bleach bypass silver retention blends chroma back toward high-contrast luma
    silver_mix = bleach_k * 0.72
    r_out = _clamp(r_raw * (1.0 - silver_mix) + luma * silver_mix, 0.0, 1.0)
    g_out = _clamp(g_raw * (1.0 - silver_mix) + luma * silver_mix, 0.0, 1.0)
    b_out = _clamp(b_raw * (1.0 - silver_mix) + luma * silver_mix, 0.0, 1.0)
    return (luma, r_out, g_out, b_out)


def evaluate_film_look_studio(
    config: FilmLookStudioConfig,
    *,
    sample_count: int = FILM_LOOK_CURVE_SAMPLE_COUNT,
) -> FilmLookStudioEvaluateResult:
    """Evaluate 33-point D-logE sensitometric curves, contrast, DR, and grain RMS telemetry."""
    count = max(17, min(65, int(sample_count)))
    samples: list[FilmLookCurveSample] = []
    for i in range(count):
        x_norm = float(i) / float(count - 1)
        log_exp = -3.2 + x_norm * 4.4
        luma, r_val, g_val, b_val = _eval_sensitometric_transfer(x_norm, config)
        samples.append(
            FilmLookCurveSample(
                x_norm=round(x_norm, 4),
                log_exposure=round(log_exp, 3),
                linear_ref=round(x_norm, 4),
                luma=round(luma, 4),
                r=round(r_val, 4),
                g=round(g_val, 4),
                b=round(b_val, 4),
            )
        )

    if not config.enabled:
        return FilmLookStudioEvaluateResult(
            enabled=False,
            print_stock=config.print_stock,
            contrast_ratio=1.0,
            gamma_at_pivot=1.0,
            dynamic_range_stops=12.0,
            grain_rms=0.0,
            shadow_density_dmax=2.0,
            highlight_headroom_pct=100.0,
            silver_retention_pct=0.0,
            gate_weave_rms_px=0.0,
            flicker_delta_ire=0.0,
            halation_energy_pct=0.0,
            is_monochrome=_STOCK_SIGNATURES[config.print_stock]["mono"] >= 0.99,
            samples=samples,
        )

    p_lo = max(0.02, config.contrast_pivot - 0.08)
    p_hi = min(0.98, config.contrast_pivot + 0.08)
    y_lo, _, _, _ = _eval_sensitometric_transfer(p_lo, config)
    y_hi, _, _, _ = _eval_sensitometric_transfer(p_hi, config)
    gamma_at_pivot = max(0.35, (y_hi - y_lo) / max(0.01, p_hi - p_lo))

    y_black = max(0.004, samples[0].luma)
    y_white = max(y_black + 0.05, samples[-1].luma)
    contrast_ratio = round(
        _clamp((y_white / y_black) * (0.28 + gamma_at_pivot * 0.22), 1.2, 48.0), 2
    )

    shoulder_bonus = (config.shoulder_rolloff_pct / 100.0) * 1.9
    bleach_penalty = (config.bleach_bypass_pct / 100.0) * 1.4
    toe_bonus = (config.toe_density_pct / 100.0) * 0.6
    dynamic_range_stops = round(
        _clamp(10.8 + shoulder_bonus + toe_bonus - bleach_penalty, 7.2, 15.0), 2
    )

    gauge_scale = {8: 2.15, 16: 1.52, 35: 1.0, 65: 0.58}[config.grain_size_mm]
    grain_rms = round((config.grain_strength_pct / 100.0) * 8.4 * gauge_scale, 2)

    shadow_dmax = round(
        _clamp(2.2 + (config.toe_density_pct / 100.0) * 1.45 - samples[0].luma * 12.0, 1.4, 4.0),
        2,
    )
    highlight_headroom_pct = round(
        _clamp((1.0 - samples[-2].luma) * 100.0 + config.shoulder_rolloff_pct * 0.35, 2.0, 45.0),
        1,
    )
    gate_weave_rms = round(config.gate_weave_px * 0.62, 2)
    flicker_ire = round(config.flicker_pct * 0.45, 2)
    halation_energy = round(config.halation_red_pct * 0.85, 1)

    return FilmLookStudioEvaluateResult(
        enabled=True,
        print_stock=config.print_stock,
        contrast_ratio=contrast_ratio,
        gamma_at_pivot=round(gamma_at_pivot, 3),
        dynamic_range_stops=dynamic_range_stops,
        grain_rms=grain_rms,
        shadow_density_dmax=shadow_dmax,
        highlight_headroom_pct=highlight_headroom_pct,
        silver_retention_pct=round(config.bleach_bypass_pct, 1),
        gate_weave_rms_px=gate_weave_rms,
        flicker_delta_ire=flicker_ire,
        halation_energy_pct=halation_energy,
        is_monochrome=_STOCK_SIGNATURES[config.print_stock]["mono"] >= 0.99,
        samples=samples,
    )


def _format_curve_points(samples: list[FilmLookCurveSample], channel: str) -> str:
    indices = (0, 4, 8, 12, 16, 20, 24, 28, 32)
    pts: list[str] = []
    for idx in indices:
        s = samples[min(idx, len(samples) - 1)]
        val = getattr(s, channel)
        pts.append(f"{s.x_norm:.3f}/{val:.3f}")
    return " ".join(pts)


def compile_film_look_filtergraph(config: FilmLookStudioConfig) -> FilmLookStudioCompileResult:
    """Compile FFmpeg film look chain (curves, colorbalance, eq, noise, vignette, crop/pad)."""
    if not config.enabled:
        return FilmLookStudioCompileResult(
            enabled=False,
            print_stock=config.print_stock,
            curves_vf="null",
            colorbalance_vf="null",
            eq_vf="null",
            noise_vf="null",
            vignette_vf="null",
            gate_weave_vf="null",
            vf_chain="null",
            ffmpeg_command='ffmpeg -i input.mp4 -vf "null" output.mp4',
            warnings=[],
        )

    eval_res = evaluate_film_look_studio(config, sample_count=FILM_LOOK_CURVE_SAMPLE_COUNT)
    r_pts = _format_curve_points(eval_res.samples, "r")
    g_pts = _format_curve_points(eval_res.samples, "g")
    b_pts = _format_curve_points(eval_res.samples, "b")
    curves_vf = f"curves=r='{r_pts}':g='{g_pts}':b='{b_pts}'"

    sig = _STOCK_SIGNATURES[config.print_stock]
    sh_vec = _hue_to_rgb_offset(config.split_tone_shadow_hue)
    hi_vec = _hue_to_rgb_offset(config.split_tone_highlight_hue)
    split_amt = 0.0 if sig["mono"] >= 0.99 else sig["split_strength"] * 0.45
    hal_red = 0.0 if sig["mono"] >= 0.99 else (config.halation_red_pct / 100.0) * 0.14

    rs = _clamp(sh_vec[0] * split_amt, -0.5, 0.5)
    gs = _clamp(sh_vec[1] * split_amt, -0.5, 0.5)
    bs = _clamp(sh_vec[2] * split_amt, -0.5, 0.5)
    rh = _clamp(hi_vec[0] * split_amt + hal_red, -0.5, 0.5)
    gh = _clamp(hi_vec[1] * split_amt, -0.5, 0.5)
    bh = _clamp(hi_vec[2] * split_amt, -0.5, 0.5)
    colorbalance_vf = (
        f"colorbalance=rs={rs:.3f}:gs={gs:.3f}:bs={bs:.3f}:rh={rh:.3f}:gh={gh:.3f}:bh={bh:.3f}"
    )

    bleach_k = config.bleach_bypass_pct / 100.0
    brightness = _clamp(config.exposure_ev * 0.06, -0.4, 0.4)
    contrast = _clamp(0.95 + (eval_res.gamma_at_pivot - 1.0) * 0.22 + bleach_k * 0.18, 0.5, 1.8)
    saturation = 0.0 if sig["mono"] >= 0.99 else _clamp(1.0 - bleach_k * 0.72, 0.0, 2.0)
    gamma_eq = _clamp(1.0 + (0.435 - config.contrast_pivot) * 0.25, 0.6, 1.6)
    flicker_expr = (
        f"+{(config.flicker_pct / 100.0) * 0.06:.4f}*sin(n*1.37)"
        if config.flicker_pct > 0.0
        else ""
    )
    eq_vf = (
        f"eq=brightness={brightness:.3f}{flicker_expr}:contrast={contrast:.3f}"
        f":saturation={saturation:.3f}:gamma={gamma_eq:.3f}"
    )

    gauge_noise_mult = {8: 1.55, 16: 1.25, 35: 1.0, 65: 0.72}[config.grain_size_mm]
    noise_strength = int(
        round(_clamp((config.grain_strength_pct / 100.0) * 28.0 * gauge_noise_mult, 0.0, 64.0))
    )
    noise_vf = f"noise=alls={noise_strength}:allf=t+u" if noise_strength > 0 else "null"

    vig_angle = round(
        _clamp(
            0.24 + (config.halation_red_pct / 100.0) * 0.12 + (8.0 / config.grain_size_mm) * 0.14,
            0.18,
            0.62,
        ),
        3,
    )
    vignette_vf = f"vignette=angle={vig_angle:.3f}:mode=forward"

    if config.gate_weave_px > 0.05:
        pad_px = max(2, int(math.ceil(config.gate_weave_px * 2.0)))
        amp = round(config.gate_weave_px, 2)
        gate_weave_vf = (
            f"pad=iw+{pad_px * 2}:ih+{pad_px * 2}:{pad_px}:{pad_px}:color=black,"
            f"crop=iw-{pad_px * 2}:ih-{pad_px * 2}"
            f":{pad_px}+{amp:.2f}*sin(t*7.3):{pad_px}+{amp * 0.85:.2f}*cos(t*5.1)"
        )
    else:
        gate_weave_vf = "null"

    parts = [
        p
        for p in (curves_vf, colorbalance_vf, eq_vf, noise_vf, vignette_vf, gate_weave_vf)
        if p != "null"
    ]
    vf_chain = ",".join(parts) if parts else "null"

    warnings: list[str] = []
    if config.gate_weave_px >= 4.0:
        warnings.append(
            "Gate weave >= 4.0 px introduces visible organic projector frame excursion."
        )
    if config.flicker_pct >= 18.0:
        warnings.append(
            "High gate flicker (>= 18%) may trigger photosensitive luminance oscillations."
        )
    if config.bleach_bypass_pct >= 75.0 and not eval_res.is_monochrome:
        warnings.append(
            "Heavy silver retention (>= 75%) strongly compresses chroma and shadow latitude."
        )

    cmd = f'ffmpeg -i input.mp4 -vf "{vf_chain}" -c:a copy output.mp4'
    return FilmLookStudioCompileResult(
        enabled=True,
        print_stock=config.print_stock,
        curves_vf=curves_vf,
        colorbalance_vf=colorbalance_vf,
        eq_vf=eq_vf,
        noise_vf=noise_vf,
        vignette_vf=vignette_vf,
        gate_weave_vf=gate_weave_vf,
        vf_chain=vf_chain,
        ffmpeg_command=cmd,
        warnings=warnings,
    )


def export_film_look_json(
    config: FilmLookStudioConfig,
    *,
    title: str = "TAKTCUT_FILM_LOOK_STUDIO",
) -> FilmLookStudioExportResult:
    """Export Film Look Creator D-logE curves, grain/weave metrics, and FFmpeg chain as JSON."""
    cleaned_title = _SAFE_TITLE_RE.sub("_", str(title or "TAKTCUT_FILM_LOOK_STUDIO").strip()).strip(
        "_"
    )
    if not cleaned_title:
        cleaned_title = "TAKTCUT_FILM_LOOK_STUDIO"

    eval_res = evaluate_film_look_studio(config, sample_count=FILM_LOOK_CURVE_SAMPLE_COUNT)
    compiled = compile_film_look_filtergraph(config)
    hosts = [
        "DaVinci Resolve Film Look Creator",
        "Dehancer Pro Film Emulation",
        "Boris FX Sapphire S_FilmEffect",
        "FFmpeg Print Stock Pipeline",
    ]
    payload = {
        "schema_version": "taktcut.film_look_studio.v1",
        "title": cleaned_title,
        "print_stock": config.print_stock,
        "compatible_hosts": hosts,
        "film_look": {
            "enabled": config.enabled,
            "print_stock": config.print_stock,
            "exposure_ev": config.exposure_ev,
            "contrast_pivot": config.contrast_pivot,
            "toe_density_pct": config.toe_density_pct,
            "shoulder_rolloff_pct": config.shoulder_rolloff_pct,
            "split_tone_shadow_hue": config.split_tone_shadow_hue,
            "split_tone_highlight_hue": config.split_tone_highlight_hue,
            "bleach_bypass_pct": config.bleach_bypass_pct,
            "grain_size_mm": config.grain_size_mm,
            "grain_strength_pct": config.grain_strength_pct,
            "gate_weave_px": config.gate_weave_px,
            "flicker_pct": config.flicker_pct,
            "halation_red_pct": config.halation_red_pct,
        },
        "metrics": {
            "contrast_ratio": eval_res.contrast_ratio,
            "gamma_at_pivot": eval_res.gamma_at_pivot,
            "dynamic_range_stops": eval_res.dynamic_range_stops,
            "grain_rms": eval_res.grain_rms,
            "shadow_density_dmax": eval_res.shadow_density_dmax,
            "highlight_headroom_pct": eval_res.highlight_headroom_pct,
            "silver_retention_pct": eval_res.silver_retention_pct,
            "gate_weave_rms_px": eval_res.gate_weave_rms_px,
            "flicker_delta_ire": eval_res.flicker_delta_ire,
            "halation_energy_pct": eval_res.halation_energy_pct,
            "is_monochrome": eval_res.is_monochrome,
        },
        "curve_samples": [s.model_dump(mode="json") for s in eval_res.samples],
        "ffmpeg": {
            "curves_vf": compiled.curves_vf,
            "colorbalance_vf": compiled.colorbalance_vf,
            "eq_vf": compiled.eq_vf,
            "noise_vf": compiled.noise_vf,
            "vignette_vf": compiled.vignette_vf,
            "gate_weave_vf": compiled.gate_weave_vf,
            "vf_chain": compiled.vf_chain,
        },
    }
    json_text = json.dumps(payload, indent=2)
    filename = f"{cleaned_title.lower()}_{config.print_stock}_film_look_studio.json"
    return FilmLookStudioExportResult(
        schema_version="taktcut.film_look_studio.v1",
        title=cleaned_title,
        print_stock=config.print_stock,
        compatible_hosts=hosts,
        json_text=json_text,
        filename=filename,
    )


def apply_film_look_to_document(
    document: TimelineDocument,
    config: FilmLookStudioConfig,
    *,
    track_index: int = 1,
    clip_index: int = 0,
) -> TimelineDocument:
    """Attach ClipFilmLookTrack non-destructively onto target video clip."""
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
    eval_res = evaluate_film_look_studio(scoped_cfg, sample_count=FILM_LOOK_CURVE_SAMPLE_COUNT)
    compiled = compile_film_look_filtergraph(scoped_cfg)

    target_clip.film_look = ClipFilmLookTrack(
        enabled=scoped_cfg.enabled,
        print_stock=scoped_cfg.print_stock,
        exposure_ev=scoped_cfg.exposure_ev,
        contrast_pivot=scoped_cfg.contrast_pivot,
        toe_density_pct=scoped_cfg.toe_density_pct,
        shoulder_rolloff_pct=scoped_cfg.shoulder_rolloff_pct,
        split_tone_shadow_hue=scoped_cfg.split_tone_shadow_hue,
        split_tone_highlight_hue=scoped_cfg.split_tone_highlight_hue,
        bleach_bypass_pct=scoped_cfg.bleach_bypass_pct,
        grain_size_mm=scoped_cfg.grain_size_mm,
        grain_strength_pct=scoped_cfg.grain_strength_pct,
        gate_weave_px=scoped_cfg.gate_weave_px,
        flicker_pct=scoped_cfg.flicker_pct,
        halation_red_pct=scoped_cfg.halation_red_pct,
        contrast_ratio=eval_res.contrast_ratio,
        dynamic_range_stops=eval_res.dynamic_range_stops,
        grain_rms=eval_res.grain_rms,
        ffmpeg_vf=compiled.vf_chain[:16384],
    )
    return next_doc
