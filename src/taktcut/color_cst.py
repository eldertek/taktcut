"""Camera Log Color-Space Transform (CST / IDT -> ODT), Bradford 3x3 Gamut Mapping,
and Filmic Tone-Mapping Studio (DaVinci Resolve RCM / ACES CST workflow).

Provides deterministic, scientifically grounded input/output transfer functions
(ARRI LogC3/LogC4, Sony S-Log3, RED Log3G10, Canon C-Log2, Panasonic V-Log, ACEScct,
Rec.709, sRGB, Display P3, Rec.2020 PQ ST.2084, Rec.2020 HLG), CIE 1931 xy -> XYZ
3x3 matrix synthesis, Bradford cone-response chromatic adaptation, soft gamut
compression, C1-continuous filmic shoulder/toe tone-mapping, FFmpeg filtergraph
compilation, and .cube 3D LUT baking.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from taktcut.models import CubeLutInfo

CstInputSpaceId = Literal[
    "arri_logc3",
    "arri_logc4",
    "sony_slog3",
    "red_log3g10",
    "canon_clog2",
    "panasonic_vlog",
    "acescct",
    "rec709_gamma24",
    "linear_srgb",
]

CstOutputSpaceId = Literal[
    "rec709_gamma24",
    "srgb_piecewise",
    "display_p3",
    "rec2020_pq",
    "rec2020_hlg",
    "acescct_ap1",
]

CstToneMappingMode = Literal[
    "none",
    "simple_reinhard",
    "filmic_aces",
    "luminance_bt2390",
]

CstGamutMappingMode = Literal[
    "none",
    "clip",
    "saturation_compress",
    "luminance_preserve",
]

ALLOWED_CST_INPUT_SPACES: tuple[CstInputSpaceId, ...] = (
    "arri_logc3",
    "arri_logc4",
    "sony_slog3",
    "red_log3g10",
    "canon_clog2",
    "panasonic_vlog",
    "acescct",
    "rec709_gamma24",
    "linear_srgb",
)

ALLOWED_CST_OUTPUT_SPACES: tuple[CstOutputSpaceId, ...] = (
    "rec709_gamma24",
    "srgb_piecewise",
    "display_p3",
    "rec2020_pq",
    "rec2020_hlg",
    "acescct_ap1",
)

ALLOWED_CST_TONE_MAPPING_MODES: tuple[CstToneMappingMode, ...] = (
    "none",
    "simple_reinhard",
    "filmic_aces",
    "luminance_bt2390",
)

ALLOWED_CST_GAMUT_MAPPING_MODES: tuple[CstGamutMappingMode, ...] = (
    "none",
    "clip",
    "saturation_compress",
    "luminance_preserve",
)

# Canonical Bradford cone-response matrix (Lam 1985 / Lindbloom)
_BRADFORD_M: tuple[tuple[float, float, float], ...] = (
    (0.8951000, 0.2664000, -0.1614000),
    (-0.7502000, 1.7135000, 0.0367000),
    (0.0389000, -0.0685000, 1.0296000),
)

_BRADFORD_M_INV: tuple[tuple[float, float, float], ...] = (
    (0.9869929, -0.1470543, 0.1599627),
    (0.4323053, 0.5183603, 0.0492912),
    (-0.0085287, 0.0400428, 0.9684867),
)


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _check_finite(raw: Any, field_name: str) -> float:
    if isinstance(raw, bool):
        raise ValueError(f"{field_name} must be a finite number, got bool")
    try:
        val = float(raw)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be a finite number, got {raw!r}") from exc
    if not math.isfinite(val):
        raise ValueError(f"{field_name} must be finite, got {raw!r}")
    return val


class ChromaticityPrimaries(BaseModel):
    """CIE 1931 xy chromaticity coordinates for RGB primaries and white point."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    rx: float = Field(ge=-0.2, le=1.2)
    ry: float = Field(gt=0.0, le=1.2)
    gx: float = Field(ge=-0.2, le=1.2)
    gy: float = Field(gt=0.0, le=1.6)
    bx: float = Field(ge=-0.2, le=1.2)
    by: float = Field(ge=-0.2, le=1.2)
    wx: float = Field(gt=0.1, le=0.6)
    wy: float = Field(gt=0.1, le=0.6)
    white_name: str = "D65"


class CstColorSpaceSpec(BaseModel):
    """Metadata and CIE primaries for an IDT or ODT color space."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    space_id: str
    label: str
    vendor: str
    transfer_label: str
    gamut_label: str
    white_point: str
    is_log: bool
    is_hdr: bool
    primaries: ChromaticityPrimaries
    dynamic_range_stops: float = Field(gt=0.0)
    middle_grey_signal: float = Field(ge=0.0, le=1.0)


class CstConfig(BaseModel):
    """Validated Camera Log Color-Space Transform (CST) node configuration."""

    model_config = ConfigDict(extra="forbid")

    enabled: bool = False
    preset_id: str = "arri_logc4_to_rec709"
    input_space: CstInputSpaceId = "arri_logc4"
    output_space: CstOutputSpaceId = "rec709_gamma24"
    bradford_adaptation: bool = True
    white_point_shift_k: float = Field(default=0.0, ge=-2500.0, le=2500.0)
    gamut_mapping_mode: CstGamutMappingMode = "saturation_compress"
    gamut_compression: float = Field(default=0.35, ge=0.0, le=1.0)
    tone_mapping_mode: CstToneMappingMode = "filmic_aces"
    exposure_ev: float = Field(default=0.0, ge=-6.0, le=6.0)
    contrast: float = Field(default=1.0, ge=0.5, le=2.0)
    shoulder_strength: float = Field(default=0.55, ge=0.0, le=1.0)
    toe_strength: float = Field(default=0.35, ge=0.0, le=1.0)
    white_point_nits: float = Field(default=100.0, ge=100.0, le=4000.0)
    black_point_offset: float = Field(default=0.0, ge=-0.05, le=0.05)
    saturation: float = Field(default=1.0, ge=0.0, le=2.0)

    @field_validator(
        "white_point_shift_k",
        "gamut_compression",
        "exposure_ev",
        "contrast",
        "shoulder_strength",
        "toe_strength",
        "white_point_nits",
        "black_point_offset",
        "saturation",
        mode="before",
    )
    @classmethod
    def _validate_finite_floats(cls, raw: Any, info: Any) -> float:
        return _check_finite(raw, str(info.field_name))

    @field_validator("preset_id", mode="before")
    @classmethod
    def _validate_preset_id(cls, raw: Any) -> str:
        if raw is None:
            return "custom"
        cleaned = str(raw).strip()
        return cleaned[:64] if cleaned else "custom"


class CstPreset(BaseModel):
    """Named Camera Log -> SDR/HDR CST preset."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    preset_id: str
    label: str
    description: str
    category: Literal["cinema_log_sdr", "cinema_log_hdr", "aces_pipeline"]
    config: CstConfig


class CstToneCurveSample(BaseModel):
    """Sample point along the IDT-linear to ODT tone-mapped response curve."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    input_norm: float
    ev_stop: float
    output_norm: float
    identity_norm: float


class CstCompileResult(BaseModel):
    """Compiled 3x3 Bradford matrix, FFmpeg filtergraph, and curve telemetry."""

    model_config = ConfigDict(extra="forbid")

    config: CstConfig
    bradford_matrix_3x3: list[list[float]]
    adaptation_matrix_3x3: list[list[float]]
    src_primaries: ChromaticityPrimaries
    dst_primaries: ChromaticityPrimaries
    ffmpeg_filter_expr: str
    ffmpeg_colorspace_hint: str
    tone_curve_samples: list[CstToneCurveSample]
    middle_grey_out: float
    highlight_rolloff_db: float
    out_of_gamut_pct: float
    gamut_coverage_pct: float
    bradford_active: bool


class CstPatchEvaluation(BaseModel):
    """Single reference patch evaluated through the active CST pipeline."""

    model_config = ConfigDict(extra="forbid")

    patch_index: int
    name: str
    log_rgb: tuple[float, float, float]
    transformed_rgb: tuple[float, float, float]
    out_of_gamut: bool


class CstAnalysisResult(BaseModel):
    """Full CST pipeline evaluation across 24 scene-referred reference patches."""

    model_config = ConfigDict(extra="forbid")

    compiled: CstCompileResult
    patches: list[CstPatchEvaluation]
    dynamic_range_preserved_stops: float
    mean_luma_in: float
    mean_luma_out: float
    summary: str


# Standard CIE 1931 xy primaries
_PRIMARIES_REC709 = ChromaticityPrimaries(
    rx=0.6400, ry=0.3300, gx=0.3000, gy=0.6000, bx=0.1500, by=0.0600,
    wx=0.3127, wy=0.3290, white_name="D65",
)
_PRIMARIES_DISPLAY_P3 = ChromaticityPrimaries(
    rx=0.6800, ry=0.3200, gx=0.2650, gy=0.6900, bx=0.1500, by=0.0600,
    wx=0.3127, wy=0.3290, white_name="D65",
)
_PRIMARIES_REC2020 = ChromaticityPrimaries(
    rx=0.7080, ry=0.2920, gx=0.1700, gy=0.7970, bx=0.1310, by=0.0460,
    wx=0.3127, wy=0.3290, white_name="D65",
)
_PRIMARIES_AWG3 = ChromaticityPrimaries(
    rx=0.6840, ry=0.3130, gx=0.2210, gy=0.8480, bx=0.0861, by=-0.1020,
    wx=0.3127, wy=0.3290, white_name="D65",
)
_PRIMARIES_AWG4 = ChromaticityPrimaries(
    rx=0.7347, ry=0.2653, gx=0.1424, gy=0.8576, bx=0.0991, by=-0.0308,
    wx=0.3127, wy=0.3290, white_name="D65",
)
_PRIMARIES_SGAMUT3_CINE = ChromaticityPrimaries(
    rx=0.7660, ry=0.2750, gx=0.2250, gy=0.8000, bx=0.0890, by=-0.0870,
    wx=0.3127, wy=0.3290, white_name="D65",
)
_PRIMARIES_RED_WIDE_GAMUT = ChromaticityPrimaries(
    rx=0.780308, ry=0.304253, gx=0.121595, gy=1.493994, bx=0.095612, by=-0.084589,
    wx=0.3127, wy=0.3290, white_name="D65",
)
_PRIMARIES_CANON_CINEMA_GAMUT = ChromaticityPrimaries(
    rx=0.7400, ry=0.2700, gx=0.1700, gy=1.1400, bx=0.0800, by=-0.1000,
    wx=0.3127, wy=0.3290, white_name="D65",
)
_PRIMARIES_PANASONIC_VGAMUT = ChromaticityPrimaries(
    rx=0.7300, ry=0.2800, gx=0.1650, gy=0.8400, bx=0.1000, by=-0.0300,
    wx=0.3127, wy=0.3290, white_name="D65",
)
_PRIMARIES_ACES_AP1 = ChromaticityPrimaries(
    rx=0.7130, ry=0.2930, gx=0.1650, gy=0.8300, bx=0.1280, by=0.0440,
    wx=0.32168, wy=0.33767, white_name="D60",
)


CST_INPUT_SPACE_SPECS: dict[CstInputSpaceId, CstColorSpaceSpec] = {
    "arri_logc4": CstColorSpaceSpec(
        space_id="arri_logc4",
        label="ARRI LogC4 (AWG4)",
        vendor="ARRI",
        transfer_label="LogC4 (REVEAL)",
        gamut_label="ARRI Wide Gamut 4",
        white_point="D65",
        is_log=True,
        is_hdr=False,
        primaries=_PRIMARIES_AWG4,
        dynamic_range_stops=17.0,
        middle_grey_signal=0.2784,
    ),
    "arri_logc3": CstColorSpaceSpec(
        space_id="arri_logc3",
        label="ARRI LogC3 EI 800 (AWG3)",
        vendor="ARRI",
        transfer_label="LogC3 EI 800",
        gamut_label="ARRI Wide Gamut 3",
        white_point="D65",
        is_log=True,
        is_hdr=False,
        primaries=_PRIMARIES_AWG3,
        dynamic_range_stops=14.5,
        middle_grey_signal=0.3910,
    ),
    "sony_slog3": CstColorSpaceSpec(
        space_id="sony_slog3",
        label="Sony S-Log3 (S-Gamut3.Cine)",
        vendor="Sony",
        transfer_label="S-Log3",
        gamut_label="S-Gamut3.Cine",
        white_point="D65",
        is_log=True,
        is_hdr=False,
        primaries=_PRIMARIES_SGAMUT3_CINE,
        dynamic_range_stops=15.0,
        middle_grey_signal=0.4106,
    ),
    "red_log3g10": CstColorSpaceSpec(
        space_id="red_log3g10",
        label="RED Log3G10 (REDWideGamutRGB)",
        vendor="RED",
        transfer_label="Log3G10",
        gamut_label="REDWideGamutRGB",
        white_point="D65",
        is_log=True,
        is_hdr=False,
        primaries=_PRIMARIES_RED_WIDE_GAMUT,
        dynamic_range_stops=16.5,
        middle_grey_signal=0.3333,
    ),
    "canon_clog2": CstColorSpaceSpec(
        space_id="canon_clog2",
        label="Canon C-Log2 (Cinema Gamut)",
        vendor="Canon",
        transfer_label="Canon Log 2",
        gamut_label="Cinema Gamut",
        white_point="D65",
        is_log=True,
        is_hdr=False,
        primaries=_PRIMARIES_CANON_CINEMA_GAMUT,
        dynamic_range_stops=15.0,
        middle_grey_signal=0.3982,
    ),
    "panasonic_vlog": CstColorSpaceSpec(
        space_id="panasonic_vlog",
        label="Panasonic V-Log (V-Gamut)",
        vendor="Panasonic",
        transfer_label="V-Log",
        gamut_label="V-Gamut",
        white_point="D65",
        is_log=True,
        is_hdr=False,
        primaries=_PRIMARIES_PANASONIC_VGAMUT,
        dynamic_range_stops=14.5,
        middle_grey_signal=0.4233,
    ),
    "acescct": CstColorSpaceSpec(
        space_id="acescct",
        label="ACEScct (AP1 D60)",
        vendor="ACES",
        transfer_label="ACEScct",
        gamut_label="ACES AP1",
        white_point="D60",
        is_log=True,
        is_hdr=False,
        primaries=_PRIMARIES_ACES_AP1,
        dynamic_range_stops=16.5,
        middle_grey_signal=0.4135,
    ),
    "rec709_gamma24": CstColorSpaceSpec(
        space_id="rec709_gamma24",
        label="Rec.709 / Gamma 2.4",
        vendor="ITU-R",
        transfer_label="BT.1886 Gamma 2.4",
        gamut_label="Rec.709",
        white_point="D65",
        is_log=False,
        is_hdr=False,
        primaries=_PRIMARIES_REC709,
        dynamic_range_stops=9.5,
        middle_grey_signal=0.4890,
    ),
    "linear_srgb": CstColorSpaceSpec(
        space_id="linear_srgb",
        label="Linear Scene-Referred (Rec.709)",
        vendor="Generic",
        transfer_label="Linear 1.0",
        gamut_label="Rec.709 / sRGB",
        white_point="D65",
        is_log=False,
        is_hdr=False,
        primaries=_PRIMARIES_REC709,
        dynamic_range_stops=14.0,
        middle_grey_signal=0.1800,
    ),
}

CST_OUTPUT_SPACE_SPECS: dict[CstOutputSpaceId, CstColorSpaceSpec] = {
    "rec709_gamma24": CstColorSpaceSpec(
        space_id="rec709_gamma24",
        label="Rec.709 (Gamma 2.4 / BT.1886)",
        vendor="ITU-R",
        transfer_label="Gamma 2.4",
        gamut_label="Rec.709",
        white_point="D65",
        is_log=False,
        is_hdr=False,
        primaries=_PRIMARIES_REC709,
        dynamic_range_stops=9.5,
        middle_grey_signal=0.4890,
    ),
    "srgb_piecewise": CstColorSpaceSpec(
        space_id="srgb_piecewise",
        label="sRGB (IEC 61966-2-1 Web)",
        vendor="IEC",
        transfer_label="sRGB Piecewise",
        gamut_label="sRGB / Rec.709",
        white_point="D65",
        is_log=False,
        is_hdr=False,
        primaries=_PRIMARIES_REC709,
        dynamic_range_stops=9.0,
        middle_grey_signal=0.4614,
    ),
    "display_p3": CstColorSpaceSpec(
        space_id="display_p3",
        label="Display P3 (Cinema / Apple D65)",
        vendor="DCI / Apple",
        transfer_label="sRGB / Gamma 2.2",
        gamut_label="Display P3",
        white_point="D65",
        is_log=False,
        is_hdr=False,
        primaries=_PRIMARIES_DISPLAY_P3,
        dynamic_range_stops=10.5,
        middle_grey_signal=0.4614,
    ),
    "rec2020_pq": CstColorSpaceSpec(
        space_id="rec2020_pq",
        label="Rec.2020 PQ (ST 2084 HDR 1000 nits)",
        vendor="SMPTE",
        transfer_label="ST 2084 PQ",
        gamut_label="Rec.2020",
        white_point="D65",
        is_log=False,
        is_hdr=True,
        primaries=_PRIMARIES_REC2020,
        dynamic_range_stops=14.0,
        middle_grey_signal=0.3820,
    ),
    "rec2020_hlg": CstColorSpaceSpec(
        space_id="rec2020_hlg",
        label="Rec.2020 HLG (ARIB STD-B67 HDR)",
        vendor="ARIB / BBC",
        transfer_label="Hybrid Log-Gamma",
        gamut_label="Rec.2020",
        white_point="D65",
        is_log=False,
        is_hdr=True,
        primaries=_PRIMARIES_REC2020,
        dynamic_range_stops=12.5,
        middle_grey_signal=0.4500,
    ),
    "acescct_ap1": CstColorSpaceSpec(
        space_id="acescct_ap1",
        label="ACEScct (AP1 D60 Working Space)",
        vendor="ACES",
        transfer_label="ACEScct",
        gamut_label="ACES AP1",
        white_point="D60",
        is_log=True,
        is_hdr=False,
        primaries=_PRIMARIES_ACES_AP1,
        dynamic_range_stops=16.5,
        middle_grey_signal=0.4135,
    ),
}

CST_PRESETS: tuple[CstPreset, ...] = (
    CstPreset(
        preset_id="arri_logc4_to_rec709",
        label="ARRI LogC4 -> Rec.709",
        description=(
            "ARRI Alexa 35 LogC4 / AWG4 to Rec.709 BT.1886 with REVEAL-inspired filmic shoulder."
        ),
        category="cinema_log_sdr",
        config=CstConfig(
            enabled=True,
            preset_id="arri_logc4_to_rec709",
            input_space="arri_logc4",
            output_space="rec709_gamma24",
            bradford_adaptation=True,
            gamut_mapping_mode="saturation_compress",
            gamut_compression=0.35,
            tone_mapping_mode="filmic_aces",
            exposure_ev=0.0,
            contrast=1.02,
            shoulder_strength=0.60,
            toe_strength=0.35,
            white_point_nits=100.0,
            saturation=1.02,
        ),
    ),
    CstPreset(
        preset_id="arri_logc3_to_rec709",
        label="ARRI LogC3 -> Rec.709",
        description="ARRI Alexa Mini LogC3 EI 800 / AWG3 to Rec.709 Gamma 2.4 broadcast curve.",
        category="cinema_log_sdr",
        config=CstConfig(
            enabled=True,
            preset_id="arri_logc3_to_rec709",
            input_space="arri_logc3",
            output_space="rec709_gamma24",
            bradford_adaptation=True,
            gamut_mapping_mode="saturation_compress",
            gamut_compression=0.30,
            tone_mapping_mode="filmic_aces",
            exposure_ev=0.0,
            contrast=1.0,
            shoulder_strength=0.55,
            toe_strength=0.30,
            white_point_nits=100.0,
            saturation=1.0,
        ),
    ),
    CstPreset(
        preset_id="sony_slog3_to_rec709",
        label="Sony S-Log3 -> Rec.709",
        description=(
            "Sony Venice / FX6 S-Log3 S-Gamut3.Cine to Rec.709 with clean highlight roll-off."
        ),
        category="cinema_log_sdr",
        config=CstConfig(
            enabled=True,
            preset_id="sony_slog3_to_rec709",
            input_space="sony_slog3",
            output_space="rec709_gamma24",
            bradford_adaptation=True,
            gamut_mapping_mode="saturation_compress",
            gamut_compression=0.38,
            tone_mapping_mode="filmic_aces",
            exposure_ev=0.10,
            contrast=1.04,
            shoulder_strength=0.58,
            toe_strength=0.38,
            white_point_nits=100.0,
            saturation=1.03,
        ),
    ),
    CstPreset(
        preset_id="red_rwg_to_rec709",
        label="RED Log3G10 -> Rec.709",
        description=(
            "RED V-Raptor Log3G10 / REDWideGamutRGB with aggressive cyan-magenta gamut compression."
        ),
        category="cinema_log_sdr",
        config=CstConfig(
            enabled=True,
            preset_id="red_rwg_to_rec709",
            input_space="red_log3g10",
            output_space="rec709_gamma24",
            bradford_adaptation=True,
            gamut_mapping_mode="saturation_compress",
            gamut_compression=0.50,
            tone_mapping_mode="filmic_aces",
            exposure_ev=0.0,
            contrast=1.05,
            shoulder_strength=0.62,
            toe_strength=0.32,
            white_point_nits=100.0,
            saturation=1.0,
        ),
    ),
    CstPreset(
        preset_id="canon_clog2_to_rec709",
        label="Canon C-Log2 -> Rec.709",
        description="Canon C70 / C300 Mk III C-Log2 Cinema Gamut to natural Rec.709 skin tones.",
        category="cinema_log_sdr",
        config=CstConfig(
            enabled=True,
            preset_id="canon_clog2_to_rec709",
            input_space="canon_clog2",
            output_space="rec709_gamma24",
            bradford_adaptation=True,
            gamut_mapping_mode="saturation_compress",
            gamut_compression=0.40,
            tone_mapping_mode="filmic_aces",
            exposure_ev=0.0,
            contrast=1.0,
            shoulder_strength=0.52,
            toe_strength=0.36,
            white_point_nits=100.0,
            saturation=1.02,
        ),
    ),
    CstPreset(
        preset_id="panasonic_vlog_to_p3",
        label="Panasonic V-Log -> Display P3",
        description=(
            "Panasonic V-Log / V-Gamut mastered to wide-gamut Display P3 for cinema/Apple OLED."
        ),
        category="cinema_log_sdr",
        config=CstConfig(
            enabled=True,
            preset_id="panasonic_vlog_to_p3",
            input_space="panasonic_vlog",
            output_space="display_p3",
            bradford_adaptation=True,
            gamut_mapping_mode="saturation_compress",
            gamut_compression=0.28,
            tone_mapping_mode="filmic_aces",
            exposure_ev=0.0,
            contrast=1.02,
            shoulder_strength=0.50,
            toe_strength=0.30,
            white_point_nits=100.0,
            saturation=1.04,
        ),
    ),
    CstPreset(
        preset_id="acescct_to_rec2020_pq",
        label="ACEScct D60 -> Rec.2020 PQ",
        description="ACEScct AP1 (D60) to Rec.2020 ST.2084 PQ 1000-nit HDR with Bradford D60->D65.",
        category="aces_pipeline",
        config=CstConfig(
            enabled=True,
            preset_id="acescct_to_rec2020_pq",
            input_space="acescct",
            output_space="rec2020_pq",
            bradford_adaptation=True,
            gamut_mapping_mode="luminance_preserve",
            gamut_compression=0.22,
            tone_mapping_mode="luminance_bt2390",
            exposure_ev=0.0,
            contrast=1.0,
            shoulder_strength=0.45,
            toe_strength=0.20,
            white_point_nits=1000.0,
            saturation=1.0,
        ),
    ),
    CstPreset(
        preset_id="slog3_to_hlg_hdr",
        label="Sony S-Log3 -> Rec.2020 HLG",
        description=(
            "Sony S-Log3 broadcast HDR delivery to Rec.2020 Hybrid Log-Gamma (ARIB STD-B67)."
        ),
        category="cinema_log_hdr",
        config=CstConfig(
            enabled=True,
            preset_id="slog3_to_hlg_hdr",
            input_space="sony_slog3",
            output_space="rec2020_hlg",
            bradford_adaptation=True,
            gamut_mapping_mode="saturation_compress",
            gamut_compression=0.25,
            tone_mapping_mode="luminance_bt2390",
            exposure_ev=0.0,
            contrast=1.0,
            shoulder_strength=0.40,
            toe_strength=0.22,
            white_point_nits=1000.0,
            saturation=1.0,
        ),
    ),
)

_PRESET_BY_ID: dict[str, CstPreset] = {p.preset_id: p for p in CST_PRESETS}


def list_cst_input_spaces() -> tuple[CstColorSpaceSpec, ...]:
    """Return all supported camera Log / working IDT color spaces."""
    return tuple(CST_INPUT_SPACE_SPECS[k] for k in ALLOWED_CST_INPUT_SPACES)


def list_cst_output_spaces() -> tuple[CstColorSpaceSpec, ...]:
    """Return all supported ODT display / HDR color spaces."""
    return tuple(CST_OUTPUT_SPACE_SPECS[k] for k in ALLOWED_CST_OUTPUT_SPACES)


def list_cst_presets() -> tuple[CstPreset, ...]:
    """Return curated DaVinci Resolve RCM / ACES CST presets."""
    return CST_PRESETS


def get_cst_preset(preset_id: str) -> CstPreset:
    """Lookup a CST preset by ID."""
    cleaned = str(preset_id or "").strip().lower()
    if cleaned not in _PRESET_BY_ID:
        raise ValueError(f"Unsupported CST preset_id {preset_id!r}")
    return _PRESET_BY_ID[cleaned]


def normalize_cst_config(raw: Any) -> CstConfig:
    """Validate and normalize arbitrary dict/model input into a CstConfig."""
    if raw is None:
        return CstConfig()
    if isinstance(raw, CstConfig):
        return raw
    if isinstance(raw, dict):
        return CstConfig.model_validate(raw)
    raise ValueError(f"Unsupported CST config payload: {type(raw).__name__}")


def _matmul_3x3(
    a: tuple[tuple[float, float, float], ...],
    b: tuple[tuple[float, float, float], ...],
) -> tuple[tuple[float, float, float], ...]:
    rows: list[tuple[float, float, float]] = []
    for i in range(3):
        rows.append(
            (
                a[i][0] * b[0][0] + a[i][1] * b[1][0] + a[i][2] * b[2][0],
                a[i][0] * b[0][1] + a[i][1] * b[1][1] + a[i][2] * b[2][1],
                a[i][0] * b[0][2] + a[i][1] * b[1][2] + a[i][2] * b[2][2],
            )
        )
    return (rows[0], rows[1], rows[2])


def _matvec_3x3(
    m: tuple[tuple[float, float, float], ...],
    v: tuple[float, float, float],
) -> tuple[float, float, float]:
    return (
        m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
        m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
        m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
    )


def _invert_3x3(
    m: tuple[tuple[float, float, float], ...],
) -> tuple[tuple[float, float, float], ...]:
    a, b, c = m[0]
    d, e, f = m[1]
    g, h, i = m[2]
    c00 = e * i - f * h
    c01 = -(d * i - f * g)
    c02 = d * h - e * g
    c10 = -(b * i - c * h)
    c11 = a * i - c * g
    c12 = -(a * h - b * g)
    c20 = b * f - c * e
    c21 = -(a * f - c * d)
    c22 = a * e - b * d
    det = a * c00 + b * c01 + c * c02
    if abs(det) < 1e-12:
        raise ValueError("Singular 3x3 matrix encountered in CST gamut calculation")
    inv_det = 1.0 / det
    return (
        (c00 * inv_det, c10 * inv_det, c20 * inv_det),
        (c01 * inv_det, c11 * inv_det, c21 * inv_det),
        (c02 * inv_det, c12 * inv_det, c22 * inv_det),
    )


def _xy_to_xyz(x: float, y: float) -> tuple[float, float, float]:
    safe_y = max(1e-6, y)
    return (x / safe_y, 1.0, (1.0 - x - y) / safe_y)


def _kelvin_to_cie_xy(kelvin: float) -> tuple[float, float]:
    """Approximate CIE D-illuminant / Planckian chromaticity for Kelvin 3000K-12000K."""
    t = _clamp(kelvin, 2500.0, 15000.0)
    if t <= 7000.0:
        x = (
            -4.6070e9 / (t**3)
            + 2.9678e6 / (t**2)
            + 0.09911e3 / t
            + 0.244063
        )
    else:
        x = (
            -2.0064e9 / (t**3)
            + 1.9018e6 / (t**2)
            + 0.24748e3 / t
            + 0.237040
        )
    y = -3.000 * (x**2) + 2.870 * x - 0.275
    return (x, max(0.15, y))


def compute_rgb_to_xyz_3x3(
    primaries: ChromaticityPrimaries,
) -> tuple[tuple[float, float, float], ...]:
    """Derive exact RGB -> CIE XYZ 3x3 matrix from CIE 1931 xy primaries and white point."""
    xr, yr = primaries.rx, primaries.ry
    xg, yg = primaries.gx, primaries.gy
    xb, yb = primaries.bx, primaries.by
    xr_xyz = xr / yr
    yr_xyz = 1.0
    zr_xyz = (1.0 - xr - yr) / yr

    xg_xyz = xg / yg
    yg_xyz = 1.0
    zg_xyz = (1.0 - xg - yg) / yg

    xb_xyz = xb / yb if abs(yb) > 1e-6 else xb / 1e-6
    yb_xyz = 1.0
    zb_xyz = (1.0 - xb - yb) / (yb if abs(yb) > 1e-6 else 1e-6)

    m_prim = (
        (xr_xyz, xg_xyz, xb_xyz),
        (yr_xyz, yg_xyz, yb_xyz),
        (zr_xyz, zg_xyz, zb_xyz),
    )
    m_prim_inv = _invert_3x3(m_prim)
    white_xyz = _xy_to_xyz(primaries.wx, primaries.wy)
    sr, sg, sb = _matvec_3x3(m_prim_inv, white_xyz)
    return (
        (sr * xr_xyz, sg * xg_xyz, sb * xb_xyz),
        (sr * yr_xyz, sg * yg_xyz, sb * yb_xyz),
        (sr * zr_xyz, sg * zg_xyz, sb * zb_xyz),
    )


def compute_bradford_adaptation_3x3(
    src_white_xy: tuple[float, float],
    dst_white_xy: tuple[float, float],
) -> tuple[tuple[float, float, float], ...]:
    """Compute canonical Bradford 3x3 chromatic adaptation matrix from src white to dst white."""
    if (
        abs(src_white_xy[0] - dst_white_xy[0]) < 1e-6
        and abs(src_white_xy[1] - dst_white_xy[1]) < 1e-6
    ):
        return ((1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0))
    src_xyz = _xy_to_xyz(src_white_xy[0], src_white_xy[1])
    dst_xyz = _xy_to_xyz(dst_white_xy[0], dst_white_xy[1])
    src_cone = _matvec_3x3(_BRADFORD_M, src_xyz)
    dst_cone = _matvec_3x3(_BRADFORD_M, dst_xyz)
    diag = (
        (dst_cone[0] / max(1e-6, src_cone[0]), 0.0, 0.0),
        (0.0, dst_cone[1] / max(1e-6, src_cone[1]), 0.0),
        (0.0, 0.0, dst_cone[2] / max(1e-6, src_cone[2])),
    )
    return _matmul_3x3(_BRADFORD_M_INV, _matmul_3x3(diag, _BRADFORD_M))


def compute_cst_gamut_matrix(
    config: CstConfig,
) -> tuple[
    tuple[tuple[float, float, float], ...],
    tuple[tuple[float, float, float], ...],
    ChromaticityPrimaries,
    ChromaticityPrimaries,
    bool,
]:
    """Compute the combined 3x3 Src RGB -> Bradford -> Dst RGB gamut matrix."""
    src_spec = CST_INPUT_SPACE_SPECS[config.input_space]
    dst_spec = CST_OUTPUT_SPACE_SPECS[config.output_space]
    src_p = src_spec.primaries
    dst_p = dst_spec.primaries

    m_src = compute_rgb_to_xyz_3x3(src_p)
    m_dst_inv = _invert_3x3(compute_rgb_to_xyz_3x3(dst_p))

    src_white = (src_p.wx, src_p.wy)
    dst_white = (dst_p.wx, dst_p.wy)
    if abs(config.white_point_shift_k) >= 1.0:
        # Offset source white relative to 6504K D65
        base_k = 6000.0 if src_p.white_name == "D60" else 6504.0
        shifted_xy = _kelvin_to_cie_xy(base_k - config.white_point_shift_k)
        src_white = shifted_xy

    white_diff = (
        abs(src_white[0] - dst_white[0]) > 1e-5
        or abs(src_white[1] - dst_white[1]) > 1e-5
    )
    bradford_active = bool(config.bradford_adaptation and white_diff)
    if bradford_active:
        m_adapt = compute_bradford_adaptation_3x3(src_white, dst_white)
    else:
        m_adapt = ((1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0))

    m_combined = _matmul_3x3(m_dst_inv, _matmul_3x3(m_adapt, m_src))
    return m_combined, m_adapt, src_p, dst_p, bradford_active


# --- Camera Log IDT EOTF (Log Signal -> Scene-Linear) & ODT OETF (Display-Linear -> Encoded) ---

def _decode_arri_logc3(v: float) -> float:
    cut = 0.010591
    a = 5.555556
    b = 0.052272
    c = 0.247190
    d = 0.385537
    e = 5.367655
    f = 0.092809
    e_cut_f = e * cut + f
    if v > e_cut_f:
        return (math.pow(10.0, (v - d) / c) - b) / a
    return (v - f) / e


def _encode_arri_logc3(x: float) -> float:
    cut = 0.010591
    a = 5.555556
    b = 0.052272
    c = 0.247190
    d = 0.385537
    e = 5.367655
    f = 0.092809
    if x > cut:
        return c * math.log10(max(1e-9, a * x + b)) + d
    return e * x + f


def _decode_arri_logc4(v: float) -> float:
    a = (262144.0 - 16.0) / 117.45
    b = (1023.0 - 95.0) / 1023.0
    c = 95.0 / 1023.0
    s = (7.0 * math.log(2.0) * math.pow(2.0, 7.0 - 14.0 * c / b)) / (a * b)
    t = (math.pow(2.0, 14.0 * (-c / b) + 6.0) - 64.0) / a
    if v >= 0.0:
        return (math.pow(2.0, 14.0 * ((v - c) / b) + 6.0) - 64.0) / a
    return v * s + t


def _encode_arri_logc4(x: float) -> float:
    a = (262144.0 - 16.0) / 117.45
    b = (1023.0 - 95.0) / 1023.0
    c = 95.0 / 1023.0
    s = (7.0 * math.log(2.0) * math.pow(2.0, 7.0 - 14.0 * c / b)) / (a * b)
    t = (math.pow(2.0, 14.0 * (-c / b) + 6.0) - 64.0) / a
    if x >= t:
        return (math.log2(max(1e-9, a * x + 64.0)) - 6.0) / 14.0 * b + c
    return (x - t) / s


def _decode_sony_slog3(v: float) -> float:
    cut = 171.2102946929 / 1023.0
    if v >= cut:
        return math.pow(10.0, (v * 1023.0 - 420.0) / 261.5) * (0.18 + 0.01) - 0.01
    return (v * 1023.0 - 95.0) * 0.01125000 / (171.2102946929 - 95.0)


def _encode_sony_slog3(x: float) -> float:
    if x >= 0.01125000:
        return (420.0 + math.log10((x + 0.01) / (0.18 + 0.01)) * 261.5) / 1023.0
    return (x * (171.2102946929 - 95.0) / 0.01125000 + 95.0) / 1023.0


def _decode_red_log3g10(v: float) -> float:
    a = 0.224282
    b = 155.975327
    c = 0.01
    g = 15.1927
    if v < 0.0:
        return (v / g) - c
    return (math.pow(10.0, v / a) - 1.0) / b - c


def _encode_red_log3g10(x: float) -> float:
    a = 0.224282
    b = 155.975327
    c = 0.01
    g = 15.1927
    xc = x + c
    if xc < 0.0:
        return xc * g
    return a * math.log10(xc * b + 1.0)


def _decode_canon_clog2(v: float) -> float:
    c0 = 0.092864125
    if v >= c0:
        return (math.pow(10.0, (v - c0) / 0.24136077) - 1.0) / 87.099375
    return -(math.pow(10.0, (c0 - v) / 0.24136077) - 1.0) / 87.099375


def _encode_canon_clog2(x: float) -> float:
    c0 = 0.092864125
    if x >= 0.0:
        return 0.24136077 * math.log10(87.099375 * x + 1.0) + c0
    return -0.24136077 * math.log10(-87.099375 * x + 1.0) + c0


def _decode_panasonic_vlog(v: float) -> float:
    b = 0.00873
    c = 0.241514
    d = 0.598206
    if v < 0.181:
        return (v - 0.125) / 5.6
    return math.pow(10.0, (v - d) / c) - b


def _encode_panasonic_vlog(x: float) -> float:
    b = 0.00873
    c = 0.241514
    d = 0.598206
    if x < 0.01:
        return 5.6 * x + 0.125
    return c * math.log10(max(1e-9, x + b)) + d


def _decode_acescct(v: float) -> float:
    y_brk = 0.155251141552511
    a = 10.5402377416545
    b = 0.0729055341958355
    if v <= y_brk:
        return (v - b) / a
    return math.pow(2.0, v * 17.52 - 9.72)


def _encode_acescct(x: float) -> float:
    x_brk = 0.0078125
    a = 10.5402377416545
    b = 0.0729055341958355
    if x <= x_brk:
        return a * x + b
    return (math.log2(max(1e-9, x)) + 9.72) / 17.52


def _decode_gamma24(v: float) -> float:
    return math.pow(max(0.0, v), 2.4)


def _encode_gamma24(x: float) -> float:
    return math.pow(_clamp(x, 0.0, 1.0), 1.0 / 2.4)


def _encode_srgb(x: float) -> float:
    xc = _clamp(x, 0.0, 1.0)
    if xc <= 0.0031308:
        return 12.92 * xc
    return 1.055 * math.pow(xc, 1.0 / 2.4) - 0.055


def _encode_pq_st2084(x_linear: float, white_point_nits: float = 1000.0) -> float:
    """SMPTE ST 2084 PQ OETF normalized to 10,000 nits peak."""
    m1 = 2610.0 / 16384.0
    m2 = 2523.0 / 4096.0 * 128.0
    c1 = 3424.0 / 4096.0
    c2 = 2413.0 / 4096.0 * 32.0
    c3 = 2392.0 / 4096.0 * 32.0
    nits = max(0.0, x_linear) * max(100.0, white_point_nits)
    y = _clamp(nits / 10000.0, 0.0, 1.0)
    ym1 = math.pow(y, m1)
    return _clamp(math.pow((c1 + c2 * ym1) / (1.0 + c3 * ym1), m2), 0.0, 1.0)


def _encode_hlg_arib(x_linear: float) -> float:
    """ARIB STD-B67 Hybrid Log-Gamma OETF."""
    a = 0.17883277
    b = 1.0 - 4.0 * a
    c = 0.5 - a * math.log(4.0 * a)
    e = _clamp(x_linear, 0.0, 1.0)
    if e <= 1.0 / 12.0:
        return math.sqrt(3.0 * e)
    return _clamp(a * math.log(12.0 * e - b) + c, 0.0, 1.0)


def eotf_decode_channel(v: float, space: CstInputSpaceId) -> float:
    """Decode an input camera Log / display channel value into scene-referred linear."""
    if space == "arri_logc3":
        return _decode_arri_logc3(v)
    if space == "arri_logc4":
        return _decode_arri_logc4(v)
    if space == "sony_slog3":
        return _decode_sony_slog3(v)
    if space == "red_log3g10":
        return _decode_red_log3g10(v)
    if space == "canon_clog2":
        return _decode_canon_clog2(v)
    if space == "panasonic_vlog":
        return _decode_panasonic_vlog(v)
    if space == "acescct":
        return _decode_acescct(v)
    if space == "rec709_gamma24":
        return _decode_gamma24(v)
    return v


def oetf_encode_channel(
    x: float,
    space: CstOutputSpaceId,
    white_point_nits: float = 100.0,
) -> float:
    """Encode display-linear / scene-linear light into target ODT signal space."""
    if space == "rec709_gamma24":
        return _encode_gamma24(x)
    if space == "srgb_piecewise":
        return _encode_srgb(x)
    if space == "display_p3":
        return _encode_srgb(x)
    if space == "rec2020_pq":
        return _encode_pq_st2084(x, white_point_nits=white_point_nits)
    if space == "rec2020_hlg":
        return _encode_hlg_arib(x)
    return _clamp(_encode_acescct(max(0.0, x)), 0.0, 1.0)


def encode_input_log_channel(x_linear: float, space: CstInputSpaceId) -> float:
    """Forward camera Log encoding for simulating flat Log input from linear light."""
    if space == "arri_logc3":
        return _clamp(_encode_arri_logc3(x_linear), 0.0, 1.0)
    if space == "arri_logc4":
        return _clamp(_encode_arri_logc4(x_linear), 0.0, 1.0)
    if space == "sony_slog3":
        return _clamp(_encode_sony_slog3(x_linear), 0.0, 1.0)
    if space == "red_log3g10":
        return _clamp(_encode_red_log3g10(x_linear), 0.0, 1.0)
    if space == "canon_clog2":
        return _clamp(_encode_canon_clog2(x_linear), 0.0, 1.0)
    if space == "panasonic_vlog":
        return _clamp(_encode_panasonic_vlog(x_linear), 0.0, 1.0)
    if space == "acescct":
        return _clamp(_encode_acescct(max(0.0, x_linear)), 0.0, 1.0)
    if space == "rec709_gamma24":
        return _encode_gamma24(x_linear)
    return _clamp(x_linear, 0.0, 1.0)


def _apply_gamut_compression(
    r: float,
    g: float,
    b: float,
    mode: CstGamutMappingMode,
    compression: float,
) -> tuple[float, float, float, bool]:
    """Compress out-of-gamut excursions smoothly toward neutral luminance."""
    out_of_gamut = min(r, g, b) < -1e-4 or max(r, g, b) > 1.0001
    if mode == "none":
        return r, g, b, out_of_gamut
    if mode == "clip":
        return _clamp(r, 0.0, 1.0), _clamp(g, 0.0, 1.0), _clamp(b, 0.0, 1.0), out_of_gamut

    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if mode == "saturation_compress":
        # Pull negative/oversaturated lobes softly toward luma proportional to compression
        min_c = min(r, g, b)
        if min_c < 0.0 and luma > 1e-6:
            pull = _clamp(-min_c / max(1e-6, luma - min_c), 0.0, 1.0) * (0.35 + 0.65 * compression)
            r = r + (luma - r) * pull
            g = g + (luma - g) * pull
            b = b + (luma - b) * pull
        if compression > 0.0:
            chroma_max = max(abs(r - luma), abs(g - luma), abs(b - luma))
            if chroma_max > 0.35:
                soft_factor = 1.0 - compression * 0.32 * _clamp((chroma_max - 0.35) / 1.2, 0.0, 1.0)
                r = luma + (r - luma) * soft_factor
                g = luma + (g - luma) * soft_factor
                b = luma + (b - luma) * soft_factor
        return max(0.0, r), max(0.0, g), max(0.0, b), out_of_gamut

    # luminance_preserve: desaturate just enough to bring into >= 0 while preserving Y
    if min(r, g, b) < 0.0 and luma > 1e-6:
        t = _clamp(luma / (luma - min(r, g, b)), 0.0, 1.0)
        blend = 1.0 - (1.0 - t) * (0.5 + 0.5 * compression)
        r = luma + (r - luma) * blend
        g = luma + (g - luma) * blend
        b = luma + (b - luma) * blend
    return max(0.0, r), max(0.0, g), max(0.0, b), out_of_gamut


def _apply_tone_map_scalar(x: float, config: CstConfig) -> float:
    """Apply parametric C1-continuous filmic shoulder/toe tone mapping to scene-linear x."""
    # Apply scene-linear exposure & middle-grey pivot contrast + black point offset
    ev_gain = math.pow(2.0, config.exposure_ev)
    v = max(0.0, x * ev_gain + config.black_point_offset)
    if abs(config.contrast - 1.0) > 1e-4 and v > 0.0:
        pivot = 0.18
        v = pivot * math.pow(v / pivot, config.contrast)

    # Apply toe density in deep shadows (< 0.18)
    if config.toe_strength > 1e-4 and v < 0.18:
        t_norm = v / 0.18
        toe_exp = 1.0 + config.toe_strength * 0.85
        v = 0.18 * math.pow(t_norm, toe_exp)

    mode = config.tone_mapping_mode
    if mode == "none":
        return max(0.0, v)

    if mode == "simple_reinhard":
        wp = max(1.0, config.white_point_nits / 100.0)
        return max(0.0, (v * (1.0 + v / (wp * wp))) / (1.0 + v))

    if mode == "luminance_bt2390":
        # Soft EETF roll-off scaled by white_point_nits and shoulder_strength
        wp_scale = max(1.0, config.white_point_nits / 100.0)
        knee_start = 0.45 + 0.35 * (1.0 - config.shoulder_strength)
        if v <= knee_start:
            return v
        excess = v - knee_start
        span = max(0.15, (1.0 + 0.8 * config.shoulder_strength) * wp_scale)
        rolled = knee_start + (span - knee_start) * (excess / (excess + span - knee_start))
        return max(0.0, rolled / max(1.0, wp_scale * 0.45))

    # filmic_aces: smooth ACES RRT/ODT rational curve modulated by shoulder_strength
    shoulder = 0.8 + 1.8 * config.shoulder_strength
    a = 2.51 * (0.95 - 0.25 * config.shoulder_strength)
    b = 0.03 + 0.03 * config.toe_strength
    c = 2.43 * (0.75 + 0.55 * config.shoulder_strength)
    d = 0.59
    e = 0.14 + 0.08 * shoulder
    num = v * (a * v + b)
    den = v * (c * v + d) + e
    return _clamp(num / max(1e-6, den), 0.0, 1.0)


def evaluate_cst_rgb(
    r: float,
    g: float,
    b: float,
    config: CstConfig,
    compiled_matrix: tuple[tuple[float, float, float], ...] | None = None,
) -> tuple[float, float, float, bool]:
    """Evaluate one RGB pixel through IDT EOTF -> Bradford 3x3 -> Gamut Map -> Tone Map -> ODT."""
    if not config.enabled:
        return _clamp(r, 0.0, 1.0), _clamp(g, 0.0, 1.0), _clamp(b, 0.0, 1.0), False

    lr = eotf_decode_channel(r, config.input_space)
    lg = eotf_decode_channel(g, config.input_space)
    lb = eotf_decode_channel(b, config.input_space)

    if compiled_matrix is None:
        m_comb, _, _, _, _ = compute_cst_gamut_matrix(config)
    else:
        m_comb = compiled_matrix

    dr, dg, db = _matvec_3x3(m_comb, (lr, lg, lb))
    dr, dg, db, out_of_gamut = _apply_gamut_compression(
        dr, dg, db, config.gamut_mapping_mode, config.gamut_compression
    )

    tr = _apply_tone_map_scalar(dr, config)
    tg = _apply_tone_map_scalar(dg, config)
    tb = _apply_tone_map_scalar(db, config)

    if abs(config.saturation - 1.0) > 1e-4:
        luma = 0.2126 * tr + 0.7152 * tg + 0.0722 * tb
        tr = max(0.0, luma + (tr - luma) * config.saturation)
        tg = max(0.0, luma + (tg - luma) * config.saturation)
        tb = max(0.0, luma + (tb - luma) * config.saturation)

    or_val = oetf_encode_channel(tr, config.output_space, config.white_point_nits)
    og_val = oetf_encode_channel(tg, config.output_space, config.white_point_nits)
    ob_val = oetf_encode_channel(tb, config.output_space, config.white_point_nits)
    return (
        _clamp(or_val, 0.0, 1.0),
        _clamp(og_val, 0.0, 1.0),
        _clamp(ob_val, 0.0, 1.0),
        out_of_gamut,
    )


def _triangle_area_xy(p: ChromaticityPrimaries) -> float:
    return 0.5 * abs(
        p.rx * (p.gy - p.by) + p.gx * (p.by - p.ry) + p.bx * (p.ry - p.gy)
    )


def _build_ffmpeg_cst_strings(
    config: CstConfig,
    m_comb: tuple[tuple[float, float, float], ...],
    tone_samples: list[CstToneCurveSample],
) -> tuple[str, str]:
    if not config.enabled:
        return "null", "setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709"

    # Clamp colorchannelmixer entries safely within FFmpeg's [-2, 2] range for CLI stability
    def _mx(v: float) -> str:
        return f"{_clamp(v, -2.0, 2.0):.4f}"

    mixer = (
        f"colorchannelmixer="
        f"rr={_mx(m_comb[0][0])}:rg={_mx(m_comb[0][1])}:rb={_mx(m_comb[0][2])}:ra=0:"
        f"gr={_mx(m_comb[1][0])}:gg={_mx(m_comb[1][1])}:gb={_mx(m_comb[1][2])}:ga=0:"
        f"br={_mx(m_comb[2][0])}:bg={_mx(m_comb[2][1])}:bb={_mx(m_comb[2][2])}:ba=0"
    )

    # Sample 9 evenly spaced points from tone_samples for FFmpeg curves=master='...'
    indices = [0, 4, 8, 12, 16, 20, 24, 28, 32]
    pts: list[str] = []
    prev_x = -1.0
    for idx in indices:
        if idx < len(tone_samples):
            s = tone_samples[idx]
            x_val = _clamp(s.input_norm, 0.0, 1.0)
            if x_val <= prev_x:
                x_val = min(1.0, prev_x + 0.01)
            prev_x = x_val
            y_val = _clamp(s.output_norm, 0.0, 1.0)
            pts.append(f"{x_val:.3f}/{y_val:.3f}")
    curves_seg = f"curves=master='{' '.join(pts)}'"

    sat_seg = (
        f",eq=saturation={config.saturation:.3f}"
        if abs(config.saturation - 1.0) > 1e-3
        else ""
    )

    if config.output_space == "rec2020_pq":
        tag = "setparams=color_primaries=bt2020:color_trc=smpte2084:colorspace=bt2020nc"
        zscale_hint = "zscale=primaries=bt2020:transfer=smpte2084:matrix=bt2020nc"
    elif config.output_space == "rec2020_hlg":
        tag = "setparams=color_primaries=bt2020:color_trc=arib-std-b67:colorspace=bt2020nc"
        zscale_hint = "zscale=primaries=bt2020:transfer=arib-std-b67:matrix=bt2020nc"
    elif config.output_space == "display_p3":
        tag = "setparams=color_primaries=smpte432:color_trc=iec61966-2-1:colorspace=bt709"
        zscale_hint = "colorspace=all=bt709:primaries=smpte432:trc=srgb"
    elif config.output_space == "srgb_piecewise":
        tag = "setparams=color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709"
        zscale_hint = "colorspace=all=bt709:trc=srgb"
    else:
        tag = "setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709"
        zscale_hint = "colorspace=all=bt709:trc=bt709:range=tv"

    return f"{mixer},{curves_seg}{sat_seg},{tag}", zscale_hint


def compile_cst_filtergraph(config: CstConfig) -> CstCompileResult:
    """Compile the CST 3x3 Bradford matrix, tone curve samples, and FFmpeg filtergraph."""
    m_comb, m_adapt, src_p, dst_p, bradford_active = compute_cst_gamut_matrix(config)

    # Sample 33 points across camera Log signal [0..1] -> ODT neutral response
    tone_samples: list[CstToneCurveSample] = []
    n_pts = 33
    for idx in range(n_pts):
        in_norm = idx / (n_pts - 1)
        lin = eotf_decode_channel(in_norm, config.input_space)
        ev_stop = math.log2(max(1e-5, lin) / 0.18)
        if config.enabled:
            tm = _apply_tone_map_scalar(max(0.0, lin), config)
            out_norm = oetf_encode_channel(tm, config.output_space, config.white_point_nits)
        else:
            out_norm = in_norm
        tone_samples.append(
            CstToneCurveSample(
                input_norm=round(in_norm, 5),
                ev_stop=round(_clamp(ev_stop, -8.0, 8.0), 3),
                output_norm=round(_clamp(out_norm, 0.0, 1.0), 5),
                identity_norm=round(in_norm, 5),
            )
        )

    # Middle grey (0.18 linear) evaluation
    mg_lin = _apply_tone_map_scalar(0.18, config) if config.enabled else 0.18
    middle_grey_out = (
        oetf_encode_channel(mg_lin, config.output_space, config.white_point_nits)
        if config.enabled
        else CST_INPUT_SPACE_SPECS[config.input_space].middle_grey_signal
    )

    # Highlight roll-off compression telemetry (in dB-equivalent stop attenuation at +4 EV)
    hi_in = 0.18 * 16.0
    hi_out = _apply_tone_map_scalar(hi_in, config)
    highlight_rolloff_db = round(20.0 * math.log10(max(1e-4, hi_out) / hi_in), 2)

    # Estimate gamut coverage and out-of-gamut excursion across 125 uniform log cube samples
    oog_count = 0
    total_samples = 0
    for ir in range(5):
        for ig in range(5):
            for ib in range(5):
                r_s = ir / 4.0
                g_s = ig / 4.0
                b_s = ib / 4.0
                _, _, _, oog = evaluate_cst_rgb(r_s, g_s, b_s, config, m_comb)
                if oog:
                    oog_count += 1
                total_samples += 1

    out_of_gamut_pct = round((oog_count / max(1, total_samples)) * 100.0, 1)
    src_area = max(1e-6, _triangle_area_xy(src_p))
    dst_area = max(1e-6, _triangle_area_xy(dst_p))
    gamut_coverage_pct = round(_clamp((dst_area / src_area) * 100.0, 5.0, 100.0), 1)

    ffmpeg_filter_expr, ffmpeg_colorspace_hint = _build_ffmpeg_cst_strings(
        config, m_comb, tone_samples
    )

    return CstCompileResult(
        config=config,
        bradford_matrix_3x3=[[round(v, 5) for v in row] for row in m_comb],
        adaptation_matrix_3x3=[[round(v, 5) for v in row] for row in m_adapt],
        src_primaries=src_p,
        dst_primaries=dst_p,
        ffmpeg_filter_expr=ffmpeg_filter_expr,
        ffmpeg_colorspace_hint=ffmpeg_colorspace_hint,
        tone_curve_samples=tone_samples,
        middle_grey_out=round(_clamp(middle_grey_out, 0.0, 1.0), 4),
        highlight_rolloff_db=highlight_rolloff_db,
        out_of_gamut_pct=out_of_gamut_pct,
        gamut_coverage_pct=gamut_coverage_pct,
        bradford_active=bradford_active,
    )


_REFERENCE_SCENE_PATCHES: tuple[tuple[str, tuple[float, float, float]], ...] = (
    ("Dark Skin", (0.11, 0.06, 0.04)),
    ("Light Skin", (0.40, 0.25, 0.19)),
    ("Blue Sky", (0.12, 0.20, 0.34)),
    ("Foliage", (0.10, 0.16, 0.06)),
    ("Blue Flower", (0.21, 0.20, 0.42)),
    ("Bluish Green", (0.15, 0.42, 0.38)),
    ("Orange", (0.58, 0.20, 0.03)),
    ("Purplish Blue", (0.09, 0.10, 0.38)),
    ("Moderate Red", (0.45, 0.08, 0.10)),
    ("Purple", (0.12, 0.05, 0.18)),
    ("Yellow Green", (0.31, 0.48, 0.05)),
    ("Orange Yellow", (0.64, 0.37, 0.04)),
    ("Blue", (0.04, 0.06, 0.32)),
    ("Green", (0.08, 0.30, 0.07)),
    ("Red", (0.38, 0.04, 0.04)),
    ("Yellow", (0.70, 0.56, 0.05)),
    ("Magenta", (0.43, 0.09, 0.28)),
    ("Cyan", (0.05, 0.25, 0.39)),
    ("White 9.5 (+2.3 EV)", (0.90, 0.90, 0.90)),
    ("Neutral 8", (0.59, 0.59, 0.59)),
    ("Neutral 6.5", (0.36, 0.36, 0.36)),
    ("Neutral 5 (18% Grey)", (0.18, 0.18, 0.18)),
    ("Neutral 3.5", (0.09, 0.09, 0.09)),
    ("Black 2", (0.03, 0.03, 0.03)),
)


def analyze_cst_pipeline(config: CstConfig) -> CstAnalysisResult:
    """Evaluate 24 scene-referred reference patches through the active CST pipeline."""
    compiled = compile_cst_filtergraph(config)
    m_comb = (
        tuple(compiled.bradford_matrix_3x3[0]),
        tuple(compiled.bradford_matrix_3x3[1]),
        tuple(compiled.bradford_matrix_3x3[2]),
    )
    # Build 3-tuple of 3-tuples cleanly for mypy
    m_typed: tuple[tuple[float, float, float], ...] = (
        (m_comb[0][0], m_comb[0][1], m_comb[0][2]),
        (m_comb[1][0], m_comb[1][1], m_comb[1][2]),
        (m_comb[2][0], m_comb[2][1], m_comb[2][2]),
    )

    patches: list[CstPatchEvaluation] = []
    luma_in_sum = 0.0
    luma_out_sum = 0.0

    for idx, (name, lin_rgb) in enumerate(_REFERENCE_SCENE_PATCHES):
        log_r = encode_input_log_channel(lin_rgb[0], config.input_space)
        log_g = encode_input_log_channel(lin_rgb[1], config.input_space)
        log_b = encode_input_log_channel(lin_rgb[2], config.input_space)
        out_r, out_g, out_b, oog = evaluate_cst_rgb(
            log_r, log_g, log_b, config, compiled_matrix=m_typed
        )
        luma_in_sum += 0.2126 * log_r + 0.7152 * log_g + 0.0722 * log_b
        luma_out_sum += 0.2126 * out_r + 0.7152 * out_g + 0.0722 * out_b
        patches.append(
            CstPatchEvaluation(
                patch_index=idx,
                name=name,
                log_rgb=(round(log_r, 4), round(log_g, 4), round(log_b, 4)),
                transformed_rgb=(round(out_r, 4), round(out_g, 4), round(out_b, 4)),
                out_of_gamut=oog,
            )
        )

    n = float(len(patches))
    src_spec = CST_INPUT_SPACE_SPECS[config.input_space]
    dst_spec = CST_OUTPUT_SPACE_SPECS[config.output_space]
    preserved = round(
        min(
            src_spec.dynamic_range_stops,
            dst_spec.dynamic_range_stops + 3.5 * config.shoulder_strength,
        ),
        1,
    )
    summary = (
        f"{src_spec.label} -> {dst_spec.label} | "
        f"Bradford={'ON' if compiled.bradford_active else 'UNITY'} | "
        f"Tone={config.tone_mapping_mode} | DR={preserved} stops"
    )
    return CstAnalysisResult(
        compiled=compiled,
        patches=patches,
        dynamic_range_preserved_stops=preserved,
        mean_luma_in=round(luma_in_sum / n, 4),
        mean_luma_out=round(luma_out_sum / n, 4),
        summary=summary,
    )


def generate_cst_cube_text(
    config: CstConfig,
    size: int = 33,
    title: str = "taktcut_cst_transform",
) -> str:
    """Bake the full CST (IDT -> Bradford 3x3 -> Gamut Map -> Filmic -> ODT) into .cube text."""
    if size not in (17, 33, 65):
        raise ValueError("LUT grid size must be 17, 33, or 65")
    m_comb, _, _, _, _ = compute_cst_gamut_matrix(config)
    clean_title = "".join(
        ch if ch.isalnum() or ch in ("_", "-", " ") else "_" for ch in title
    ).strip()
    if not clean_title:
        clean_title = "taktcut_cst_transform"

    lines: list[str] = [
        f'TITLE "{clean_title}"',
        "# Generated by TaktCut Camera Log CST Studio",
        f"LUT_3D_SIZE {size}",
        "DOMAIN_MIN 0.000000 0.000000 0.000000",
        "DOMAIN_MAX 1.000000 1.000000 1.000000",
        "",
    ]
    denom = float(size - 1)
    for b_idx in range(size):
        b_in = b_idx / denom
        for g_idx in range(size):
            g_in = g_idx / denom
            for r_idx in range(size):
                r_in = r_idx / denom
                r_out, g_out, b_out, _ = evaluate_cst_rgb(
                    r_in, g_in, b_in, config, compiled_matrix=m_comb
                )
                lines.append(f"{r_out:.6f} {g_out:.6f} {b_out:.6f}")
    return "\n".join(lines) + "\n"


def bake_cst_to_cube(
    config: CstConfig,
    output_path: str | Path,
    size: int = 33,
    title: str = "taktcut_cst_transform",
) -> CubeLutInfo:
    """Write a baked CST 3D .cube LUT file to disk and return CubeLutInfo."""
    dest = Path(output_path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    cube_text = generate_cst_cube_text(config, size=size, title=title)
    dest.write_text(cube_text, encoding="utf-8")
    return CubeLutInfo(
        path=str(dest),
        title=title,
        dimension="3D",
        size=size,
        entry_count=size**3,
    )
