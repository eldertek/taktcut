"""Color grading math, FFmpeg colorbalance + eq compiler, ASC CDL, and .cube LUT tools."""

from __future__ import annotations

import math
import re
from collections.abc import Sequence
from pathlib import Path
from typing import Any, Literal

import defusedxml.ElementTree as DefusedET
from pydantic import BaseModel, Field, field_validator, model_validator

from taktcut.models import AscCdlParams, CubeLutInfo

REC709_FFMPEG_FLAGS: tuple[str, ...] = (
    "-color_primaries",
    "bt709",
    "-color_trc",
    "bt709",
    "-colorspace",
    "bt709",
    "-color_range",
    "tv",
)

COLOR_BALANCE_MIN: float = -1.0
COLOR_BALANCE_MAX: float = 1.0
CONTRAST_MIN: float = 0.0
CONTRAST_MAX: float = 2.0
SATURATION_MIN: float = 0.0
SATURATION_MAX: float = 3.0
TEMPERATURE_MIN: float = -1.0
TEMPERATURE_MAX: float = 1.0
MAX_COLOR_NODES: int = 8
COLOR_NODE_LABEL_MAX_LEN: int = 48
LUT_MIX_MIN: float = 0.0
LUT_MIX_MAX: float = 1.0
LUT_MIX_DEFAULT: float = 1.0
MAX_CUBE_TEXT_BYTES: int = 8 * 1024 * 1024
_NODE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,32}$")

PowerWindowShape = Literal["off", "circle", "linear", "gradient"]
POWER_WINDOW_SHAPES: tuple[PowerWindowShape, ...] = ("off", "circle", "linear", "gradient")
POWER_WINDOW_CENTER_MIN: float = 0.0
POWER_WINDOW_CENTER_MAX: float = 1.0
POWER_WINDOW_SIZE_MIN: float = 0.05
POWER_WINDOW_SIZE_MAX: float = 1.0
POWER_WINDOW_ROT_MIN: float = -180.0
POWER_WINDOW_ROT_MAX: float = 180.0
POWER_WINDOW_SOFTNESS_MIN: float = 0.0
POWER_WINDOW_SOFTNESS_MAX: float = 0.5

QualifierPresetId = Literal[
    "off",
    "skin_tones",
    "sky_blue",
    "foliage_green",
    "teal_accents",
    "highlights",
    "shadows",
    "custom",
]
QUALIFIER_PRESET_IDS: tuple[QualifierPresetId, ...] = (
    "off",
    "skin_tones",
    "sky_blue",
    "foliage_green",
    "teal_accents",
    "highlights",
    "shadows",
    "custom",
)
QUALIFIER_HUE_MIN: float = 0.0
QUALIFIER_HUE_MAX: float = 360.0
QUALIFIER_HUE_WIDTH_MIN: float = 2.0
QUALIFIER_HUE_WIDTH_MAX: float = 360.0
QUALIFIER_HUE_SOFT_MIN: float = 0.0
QUALIFIER_HUE_SOFT_MAX: float = 60.0
QUALIFIER_SAT_LUM_SOFT_MIN: float = 0.0
QUALIFIER_SAT_LUM_SOFT_MAX: float = 0.4
QUALIFIER_BLUR_MIN: float = 0.0
QUALIFIER_BLUR_MAX: float = 8.0

ALLOWED_COLOR_PIX_FMTS: frozenset[str] = frozenset(
    {"yuv420p", "yuv422p10le", "rgb24", "yuv444p"}
)

ColorPresetId = Literal["rec709_clean", "teal_orange", "film_warm", "noir_bw"]

ColorCurveChannel = Literal["master", "red", "green", "blue"]
CURVE_CHANNELS: tuple[ColorCurveChannel, ...] = ("master", "red", "green", "blue")
MAX_CURVE_POINTS: int = 16
DEFAULT_CURVE_POINTS: tuple[tuple[float, float], ...] = ((0.0, 0.0), (1.0, 1.0))
ColorCurvesPresetId = Literal[
    "linear",
    "film_s_curve",
    "matte_lift",
    "crisp_contrast",
    "warm_gold",
    "cool_shadows",
]

HslCurveMode = Literal["hue_vs_hue", "hue_vs_sat", "hue_vs_lum"]
HSL_CURVE_MODES: tuple[HslCurveMode, ...] = ("hue_vs_hue", "hue_vs_sat", "hue_vs_lum")
HslHueVectorId = Literal["reds", "yellows", "greens", "cyans", "blues", "magentas"]
HSL_HUE_VECTORS: tuple[HslHueVectorId, ...] = (
    "reds",
    "yellows",
    "greens",
    "cyans",
    "blues",
    "magentas",
)
HSL_HUE_FFMPEG_FLAGS: dict[HslHueVectorId, str] = {
    "reds": "r",
    "yellows": "y",
    "greens": "g",
    "cyans": "c",
    "blues": "b",
    "magentas": "m",
}
HSL_HUE_ANCHOR_DEGREES: dict[HslHueVectorId, float] = {
    "reds": 0.0,
    "yellows": 60.0,
    "greens": 120.0,
    "cyans": 180.0,
    "blues": 240.0,
    "magentas": 300.0,
}
HSL_HUE_VS_HUE_MIN: float = -45.0
HSL_HUE_VS_HUE_MAX: float = 45.0
HSL_HUE_VS_SAT_MIN: float = -1.0
HSL_HUE_VS_SAT_MAX: float = 1.0
HSL_HUE_VS_LUM_MIN: float = -0.5
HSL_HUE_VS_LUM_MAX: float = 0.5
HslCurvesPresetId = Literal[
    "neutral",
    "teal_orange_push",
    "skin_polish",
    "foliage_emerald",
    "sky_deepen",
    "muted_greens",
]

COLOR_WARPER_HUE_COUNT: int = 6
COLOR_WARPER_SAT_RINGS: int = 3
COLOR_WARPER_POINT_COUNT: int = COLOR_WARPER_HUE_COUNT * COLOR_WARPER_SAT_RINGS
COLOR_WARPER_RING_RADII: tuple[float, float, float] = (1.0 / 3.0, 2.0 / 3.0, 1.0)
COLOR_WARPER_HUE_OFFSET_MIN: float = -60.0
COLOR_WARPER_HUE_OFFSET_MAX: float = 60.0
COLOR_WARPER_SAT_OFFSET_MIN: float = -0.60
COLOR_WARPER_SAT_OFFSET_MAX: float = 0.60
ColorWarperPresetId = Literal[
    "neutral",
    "kodak_warm_skin",
    "teal_orange_warp",
    "emerald_cinema",
    "pastel_editorial",
    "cyber_neon",
]

StudioLutCategory = Literal["film_print", "camera_log", "creative_cinema", "monochrome"]
STUDIO_LUT_CATEGORIES: tuple[StudioLutCategory, ...] = (
    "film_print",
    "camera_log",
    "creative_cinema",
    "monochrome",
)
StudioLutPresetId = Literal[
    "kodak_2383_d65",
    "fuji_3513_print",
    "rec709_slog3_conv",
    "rec709_logc_conv",
    "teal_orange_cinema",
    "bleach_bypass",
    "golden_hour_warm",
    "silver_gelatin_bw",
]
STUDIO_LUT_PRESET_IDS: tuple[StudioLutPresetId, ...] = (
    "kodak_2383_d65",
    "fuji_3513_print",
    "rec709_slog3_conv",
    "rec709_logc_conv",
    "teal_orange_cinema",
    "bleach_bypass",
    "golden_hour_warm",
    "silver_gelatin_bw",
)

ColorChartProfileId = Literal["xrite_classic_24", "datacolor_spyder_24", "rec709_smpte"]
COLOR_CHART_PROFILES: tuple[ColorChartProfileId, ...] = (
    "xrite_classic_24",
    "datacolor_spyder_24",
    "rec709_smpte",
)
ShotMatchSourceProfileId = Literal[
    "current_chart",
    "sony_slog3",
    "arri_logc3",
    "canon_clog2",
    "underexposed_cool",
    "warm_tungsten",
]
SHOT_MATCH_SOURCE_PROFILES: tuple[ShotMatchSourceProfileId, ...] = (
    "current_chart",
    "sony_slog3",
    "arri_logc3",
    "canon_clog2",
    "underexposed_cool",
    "warm_tungsten",
)
ShotMatchTargetProfileId = Literal[
    "rec709_d65",
    "teal_orange_ref",
    "film_warm_ref",
    "kodak_print_ref",
    "custom_reference",
]
SHOT_MATCH_TARGET_PROFILES: tuple[ShotMatchTargetProfileId, ...] = (
    "rec709_d65",
    "teal_orange_ref",
    "film_warm_ref",
    "kodak_print_ref",
    "custom_reference",
)


def _clamp_unit(value: float) -> float:
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return value


def _clamp_balance(value: float) -> float:
    if value < COLOR_BALANCE_MIN:
        return COLOR_BALANCE_MIN
    if value > COLOR_BALANCE_MAX:
        return COLOR_BALANCE_MAX
    return value


def _validate_bounded_float(
    raw: Any,
    field_name: str,
    min_val: float,
    max_val: float,
) -> float:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raise ValueError(f"{field_name} must be a finite number, got {raw!r}")
    val = float(raw)
    if not math.isfinite(val):
        raise ValueError(f"{field_name} must be finite, got {raw!r}")
    if val < min_val or val > max_val:
        raise ValueError(
            f"{field_name} must be within [{min_val}, {max_val}], got {val}"
        )
    return val


def _validate_balance_triplet(
    raw: Any,
    field_name: str,
) -> tuple[float, float, float]:
    if not isinstance(raw, (tuple, list)) or len(raw) != 3:
        raise ValueError(f"{field_name} must be a 3-channel RGB sequence")
    return (
        _validate_bounded_float(raw[0], f"{field_name}[0]", COLOR_BALANCE_MIN, COLOR_BALANCE_MAX),
        _validate_bounded_float(raw[1], f"{field_name}[1]", COLOR_BALANCE_MIN, COLOR_BALANCE_MAX),
        _validate_bounded_float(raw[2], f"{field_name}[2]", COLOR_BALANCE_MIN, COLOR_BALANCE_MAX),
    )


class ColorGradeParams(BaseModel):
    """DaVinci / Lumetri primary color grading controls with strict bounds."""

    lift: tuple[float, float, float] = (0.0, 0.0, 0.0)
    gamma: tuple[float, float, float] = (0.0, 0.0, 0.0)
    gain: tuple[float, float, float] = (0.0, 0.0, 0.0)
    contrast: float = 1.0
    saturation: float = 1.0
    temperature: float = 0.0
    preserve_lightness: bool = False

    @field_validator("lift", "gamma", "gain", mode="before")
    @classmethod
    def _validate_triplet(
        cls,
        raw: Any,
        info: Any,
    ) -> tuple[float, float, float]:
        return _validate_balance_triplet(raw, str(info.field_name))

    @field_validator("contrast", mode="before")
    @classmethod
    def _validate_contrast(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "contrast", CONTRAST_MIN, CONTRAST_MAX)

    @field_validator("saturation", mode="before")
    @classmethod
    def _validate_saturation(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "saturation", SATURATION_MIN, SATURATION_MAX)

    @field_validator("temperature", mode="before")
    @classmethod
    def _validate_temperature(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "temperature", TEMPERATURE_MIN, TEMPERATURE_MAX)

    def is_identity(self) -> bool:
        """Return True when all grading parameters are at neutral Rec.709 defaults."""
        return (
            self.lift == (0.0, 0.0, 0.0)
            and self.gamma == (0.0, 0.0, 0.0)
            and self.gain == (0.0, 0.0, 0.0)
            and math.isclose(self.contrast, 1.0, abs_tol=1e-6)
            and math.isclose(self.saturation, 1.0, abs_tol=1e-6)
            and math.isclose(self.temperature, 0.0, abs_tol=1e-6)
        )

    def effective_colorbalance(
        self,
    ) -> tuple[
        tuple[float, float, float],
        tuple[float, float, float],
        tuple[float, float, float],
    ]:
        """Compute clamped FFmpeg colorbalance (shadows, midtones, highlights) with temperature."""
        temp_r = self.temperature * 0.25
        temp_g = self.temperature * 0.03
        temp_b = -self.temperature * 0.28

        shadows = (
            _clamp_balance(self.lift[0]),
            _clamp_balance(self.lift[1]),
            _clamp_balance(self.lift[2]),
        )
        midtones = (
            _clamp_balance(self.gamma[0] + temp_r),
            _clamp_balance(self.gamma[1] + temp_g),
            _clamp_balance(self.gamma[2] + temp_b),
        )
        highlights = (
            _clamp_balance(self.gain[0] + temp_r * 0.8),
            _clamp_balance(self.gain[1] + temp_g * 0.8),
            _clamp_balance(self.gain[2] + temp_b * 0.8),
        )
        return shadows, midtones, highlights

    def apply_rgb(self, r: float, g: float, b: float) -> tuple[float, float, float]:
        """Apply Lift/Gamma/Gain, Temperature, Contrast, and Rec.709 Saturation to RGB [0, 1]."""
        shadows, midtones, highlights = self.effective_colorbalance()
        graded: list[float] = []
        for idx, raw_ch in enumerate((r, g, b)):
            v = _clamp_unit(raw_ch)
            w_s = _clamp_unit(1.0 - v / 0.55)
            w_m = _clamp_unit(1.0 - abs(v - 0.5) / 0.5)
            w_h = _clamp_unit((v - 0.45) / 0.55)
            balanced = v + (
                shadows[idx] * w_s * 0.45
                + midtones[idx] * w_m * 0.40
                + highlights[idx] * w_h * 0.45
            )
            contrasted = (balanced - 0.5) * self.contrast + 0.5
            graded.append(_clamp_unit(contrasted))

        sr, sg, sb = graded[0], graded[1], graded[2]
        if not math.isclose(self.saturation, 1.0, abs_tol=1e-6):
            luma = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb
            sr = luma + self.saturation * (sr - luma)
            sg = luma + self.saturation * (sg - luma)
            sb = luma + self.saturation * (sb - luma)
        return (_clamp_unit(sr), _clamp_unit(sg), _clamp_unit(sb))


RESOLVE_CONTRAST_PIVOT_REC709: float = 0.435


def apply_resolve_grade_rgb(
    r: float,
    g: float,
    b: float,
    grade: ColorGradeParams,
    *,
    pivot: float = RESOLVE_CONTRAST_PIVOT_REC709,
    offset: tuple[float, float, float] = (0.0, 0.0, 0.0),
    tint: float = 0.0,
) -> tuple[float, float, float]:
    """Evaluate DaVinci Resolve YRGB primaries (LGG, Offset, 0.435 Pivot Contrast, Temp/Tint)."""
    pv = _clamp_unit(float(pivot))
    temp_r = grade.temperature * 0.22
    temp_g = -float(tint) * 0.14 + grade.temperature * 0.02
    temp_b = -grade.temperature * 0.24

    out: list[float] = []
    for idx, ch_raw in enumerate((r, g, b)):
        v = _clamp_unit(ch_raw) + offset[idx] + (temp_r, temp_g, temp_b)[idx] * 0.35
        v = _clamp_unit(v)
        lift_v = grade.lift[idx] * 0.45
        gain_v = max(0.05, 1.0 + grade.gain[idx] * 0.65)
        gamma_exp = max(0.25, min(4.0, 1.0 - grade.gamma[idx] * 0.55))

        # Lift pivots white at 1.0; Gain pivots black at 0.0; Gamma applies midtone power curve
        lifted = v * (1.0 - lift_v) + lift_v
        gained = _clamp_unit(lifted) * gain_v
        midtoned = math.pow(_clamp_unit(gained), gamma_exp)
        contrasted = (midtoned - pv) * grade.contrast + pv
        out.append(_clamp_unit(contrasted))

    sr, sg, sb = out[0], out[1], out[2]
    if not math.isclose(grade.saturation, 1.0, abs_tol=1e-6):
        luma = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb
        sr = luma + grade.saturation * (sr - luma)
        sg = luma + grade.saturation * (sg - luma)
        sb = luma + grade.saturation * (sb - luma)
    return (_clamp_unit(sr), _clamp_unit(sg), _clamp_unit(sb))


class ColorGradePreset(BaseModel):
    """Instant cinematic LUT/grade preset."""

    id: ColorPresetId
    name: str
    description: str
    params: ColorGradeParams


class ColorCompileResult(BaseModel):
    """Compiled FFmpeg colorbalance + eq filtergraph and validated parameters."""

    filtergraph: str
    ffmpeg_vf_args: list[str]
    is_identity: bool
    params: ColorGradeParams


COLOR_GRADE_PRESETS: tuple[ColorGradePreset, ...] = (
    ColorGradePreset(
        id="rec709_clean",
        name="Rec.709 Clean",
        description="Neutral broadcast Rec.709 baseline with unity contrast and saturation.",
        params=ColorGradeParams(
            lift=(0.0, 0.0, 0.0),
            gamma=(0.0, 0.0, 0.0),
            gain=(0.0, 0.0, 0.0),
            contrast=1.0,
            saturation=1.0,
            temperature=0.0,
        ),
    ),
    ColorGradePreset(
        id="teal_orange",
        name="Teal & Orange",
        description="Cinematic teal shadows balanced against warm amber skin tones and highlights.",
        params=ColorGradeParams(
            lift=(-0.14, 0.02, 0.16),
            gamma=(0.04, 0.0, -0.04),
            gain=(0.14, 0.04, -0.14),
            contrast=1.14,
            saturation=1.18,
            temperature=0.12,
        ),
    ),
    ColorGradePreset(
        id="film_warm",
        name="Film Warm",
        description="Golden editorial 35mm warmth with soft shadow lift and gentle roll-off.",
        params=ColorGradeParams(
            lift=(0.02, 0.01, -0.03),
            gamma=(0.06, 0.02, -0.06),
            gain=(0.10, 0.04, -0.10),
            contrast=1.08,
            saturation=1.10,
            temperature=0.28,
        ),
    ),
    ColorGradePreset(
        id="noir_bw",
        name="Noir B&W",
        description="High-contrast silver monochrome with crushed shadows and zero chroma.",
        params=ColorGradeParams(
            lift=(-0.04, -0.04, -0.02),
            gamma=(-0.03, -0.03, -0.03),
            gain=(0.06, 0.06, 0.08),
            contrast=1.32,
            saturation=0.0,
            temperature=-0.10,
        ),
    ),
)


def list_color_presets() -> tuple[ColorGradePreset, ...]:
    """Return all built-in cinematic color grading presets."""
    return COLOR_GRADE_PRESETS


def get_color_preset(preset_id: str) -> ColorGradePreset:
    """Look up a built-in cinematic color preset by id or case-insensitive name."""
    cleaned = preset_id.strip().lower()
    for preset in COLOR_GRADE_PRESETS:
        if preset.id == cleaned or preset.name.lower() == cleaned:
            return preset
    raise ValueError(f"Unknown color preset: {preset_id!r}")


def apply_color_preset(preset_id: str) -> ColorGradeParams:
    """Return a fresh validated ColorGradeParams instance for the requested preset."""
    return get_color_preset(preset_id).params.model_copy(deep=True)


def compile_color_grade_filter(
    grade: ColorGradeParams | dict[str, Any],
    *,
    pix_fmt: str | None = None,
) -> str:
    """Compile validated Lift/Gamma/Gain + Contrast/Sat/Temp into FFmpeg colorbalance + eq."""
    params = (
        ColorGradeParams.model_validate(grade.model_dump())
        if isinstance(grade, ColorGradeParams)
        else ColorGradeParams.model_validate(grade)
    )
    if pix_fmt is not None and pix_fmt not in ALLOWED_COLOR_PIX_FMTS:
        raise ValueError(f"Unsupported pixel format {pix_fmt!r}")

    shadows, midtones, highlights = params.effective_colorbalance()
    pl_flag = 1 if params.preserve_lightness else 0
    cb_filter = (
        "colorbalance="
        f"rs={shadows[0]:.4f}:gs={shadows[1]:.4f}:bs={shadows[2]:.4f}:"
        f"rm={midtones[0]:.4f}:gm={midtones[1]:.4f}:bm={midtones[2]:.4f}:"
        f"rh={highlights[0]:.4f}:gh={highlights[1]:.4f}:bh={highlights[2]:.4f}:"
        f"pl={pl_flag}"
    )
    eq_filter = f"eq=contrast={params.contrast:.4f}:saturation={params.saturation:.4f}"
    parts = [cb_filter, eq_filter]
    if pix_fmt is not None:
        parts.append(f"format={pix_fmt}")
    return ",".join(parts)


def compile_color_grade(
    grade: ColorGradeParams | dict[str, Any],
    *,
    pix_fmt: str | None = None,
) -> ColorCompileResult:
    """Compile ColorGradeParams into a structured FFmpeg filtergraph result."""
    params = (
        ColorGradeParams.model_validate(grade.model_dump())
        if isinstance(grade, ColorGradeParams)
        else ColorGradeParams.model_validate(grade)
    )
    fg = compile_color_grade_filter(params, pix_fmt=pix_fmt)
    return ColorCompileResult(
        filtergraph=fg,
        ffmpeg_vf_args=["-vf", fg],
        is_identity=params.is_identity(),
        params=params,
    )


def bake_color_grade_to_cube(
    grade: ColorGradeParams | dict[str, Any],
    out_path: Path,
    size: int = 33,
    title: str = "taktcut_grade",
) -> CubeLutInfo:
    """Bake ColorGradeParams into a standard 3D .cube LUT."""
    if size < 2 or size > 65:
        raise ValueError("3D LUT size must be between 2 and 65")
    params = (
        ColorGradeParams.model_validate(grade.model_dump())
        if isinstance(grade, ColorGradeParams)
        else ColorGradeParams.model_validate(grade)
    )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    lines: list[str] = [
        f'TITLE "{title}"',
        f"LUT_3D_SIZE {size}",
        "DOMAIN_MIN 0.0 0.0 0.0",
        "DOMAIN_MAX 1.0 1.0 1.0",
        "",
    ]

    denom = float(size - 1)
    for b_idx in range(size):
        b_in = b_idx / denom
        for g_idx in range(size):
            g_in = g_idx / denom
            for r_idx in range(size):
                r_in = r_idx / denom
                r_out, g_out, b_out = params.apply_rgb(r_in, g_in, b_in)
                lines.append(f"{r_out:.6f} {g_out:.6f} {b_out:.6f}")

    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return parse_cube_lut(out_path)


def parse_cdl_xml(path: Path) -> AscCdlParams:
    """Parse an ASC CDL XML file (<ColorCorrection> / <SOPNode> / <SatNode>) via defusedxml."""
    root = DefusedET.fromstring(path.read_bytes())

    def _triplet(tag: str, default: tuple[float, float, float]) -> tuple[float, float, float]:
        el = root.find(f".//{tag}")
        if el is None or not el.text:
            return default
        parts = [float(x) for x in el.text.strip().split()]
        if len(parts) != 3:
            raise ValueError(f"Expected 3 floats for <{tag}>, got {len(parts)}")
        return (parts[0], parts[1], parts[2])

    slope = _triplet("Slope", (1.0, 1.0, 1.0))
    offset = _triplet("Offset", (0.0, 0.0, 0.0))
    power = _triplet("Power", (1.0, 1.0, 1.0))

    sat = 1.0
    sat_el = root.find(".//Saturation")
    if sat_el is not None and sat_el.text:
        sat = float(sat_el.text.strip())

    return AscCdlParams(slope=slope, offset=offset, power=power, saturation=sat)


def parse_cube_lut_text(
    raw_text: str,
    *,
    source_name: str = "uploaded.cube",
) -> tuple[CubeLutInfo, list[tuple[float, float, float]]]:
    """Parse and validate an Adobe/Iridas 1D or 3D .cube LUT string into info and RGB table."""
    if not isinstance(raw_text, str):
        raise ValueError("LUT content must be a UTF-8 string")
    if len(raw_text.encode("utf-8")) > MAX_CUBE_TEXT_BYTES:
        raise ValueError(f"LUT content exceeds maximum allowed size ({MAX_CUBE_TEXT_BYTES} bytes)")

    title = ""
    size_1d: int | None = None
    size_3d: int | None = None
    domain_min: tuple[float, float, float] = (0.0, 0.0, 0.0)
    domain_max: tuple[float, float, float] = (1.0, 1.0, 1.0)
    table: list[tuple[float, float, float]] = []

    for line_no, raw_line in enumerate(raw_text.splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        upper = line.upper()
        if upper.startswith("TITLE"):
            title = line[5:].strip().strip('"')
        elif upper.startswith("LUT_1D_SIZE"):
            size_1d = int(line.split()[1])
        elif upper.startswith("LUT_3D_SIZE"):
            size_3d = int(line.split()[1])
        elif upper.startswith("DOMAIN_MIN"):
            vals = [float(v) for v in line.split()[1:4]]
            if len(vals) != 3 or not all(math.isfinite(v) for v in vals):
                raise ValueError(f"Invalid DOMAIN_MIN at line {line_no}")
            domain_min = (vals[0], vals[1], vals[2])
        elif upper.startswith("DOMAIN_MAX"):
            vals = [float(v) for v in line.split()[1:4]]
            if len(vals) != 3 or not all(math.isfinite(v) for v in vals):
                raise ValueError(f"Invalid DOMAIN_MAX at line {line_no}")
            domain_max = (vals[0], vals[1], vals[2])
        elif upper.startswith("LUT_1D_INPUT_RANGE") or upper.startswith("LUT_3D_INPUT_RANGE"):
            continue
        else:
            parts = line.split()
            if len(parts) != 3:
                raise ValueError(f"Expected RGB triplet at line {line_no}, got: {line!r}")
            r_val = float(parts[0])
            g_val = float(parts[1])
            b_val = float(parts[2])
            if not (math.isfinite(r_val) and math.isfinite(g_val) and math.isfinite(b_val)):
                raise ValueError(f"Non-finite LUT value at line {line_no}: {line!r}")
            table.append((r_val, g_val, b_val))

    if (size_1d is None) == (size_3d is None):
        raise ValueError("LUT must declare exactly one of LUT_1D_SIZE or LUT_3D_SIZE")

    if size_3d is not None:
        if size_3d < 2 or size_3d > 65:
            raise ValueError(f"LUT_3D_SIZE must be within [2, 65], got {size_3d}")
        dimension: Literal["1D", "3D"] = "3D"
        size = size_3d
        expected = size_3d**3
    else:
        assert size_1d is not None
        if size_1d < 2 or size_1d > 4096:
            raise ValueError(f"LUT_1D_SIZE must be within [2, 4096], got {size_1d}")
        dimension = "1D"
        size = size_1d
        expected = size_1d

    entries = len(table)
    if entries != expected:
        raise ValueError(
            f"Expected {expected} entries for {dimension} size {size}, found {entries}"
        )

    for idx in range(3):
        if domain_min[idx] >= domain_max[idx]:
            raise ValueError(f"Invalid LUT domain bounds: {domain_min} >= {domain_max}")

    info = CubeLutInfo(
        path=source_name,
        title=title,
        dimension=dimension,
        size=size,
        domain_min=domain_min,
        domain_max=domain_max,
        entry_count=entries,
    )
    return info, table


def parse_cube_lut(path: Path) -> CubeLutInfo:
    """Validate and inspect an Adobe/Iridas 1D or 3D .cube LUT file."""
    info, _ = parse_cube_lut_text(path.read_text(encoding="utf-8"), source_name=str(path))
    return info


def apply_cube_lut_rgb(
    r: float,
    g: float,
    b: float,
    *,
    dimension: Literal["1D", "3D"],
    size: int,
    table: Sequence[tuple[float, float, float]],
    domain_min: tuple[float, float, float] = (0.0, 0.0, 0.0),
    domain_max: tuple[float, float, float] = (1.0, 1.0, 1.0),
    mix: float = 1.0,
) -> tuple[float, float, float]:
    """Evaluate a 1D or 3D .cube LUT using linear/trilinear interpolation and mix blending."""
    mix_clamped = _clamp_unit(mix)
    in_r = _clamp_unit(r)
    in_g = _clamp_unit(g)
    in_b = _clamp_unit(b)
    if mix_clamped <= 1e-6 or size < 2:
        return (in_r, in_g, in_b)

    nr = _clamp_unit((in_r - domain_min[0]) / max(1e-8, domain_max[0] - domain_min[0]))
    ng = _clamp_unit((in_g - domain_min[1]) / max(1e-8, domain_max[1] - domain_min[1]))
    nb = _clamp_unit((in_b - domain_min[2]) / max(1e-8, domain_max[2] - domain_min[2]))

    if dimension == "1D":
        max_idx = size - 1
        out_ch: list[float] = []
        for ch_idx, norm_v in enumerate((nr, ng, nb)):
            pos = norm_v * max_idx
            i0 = min(max_idx, max(0, int(math.floor(pos))))
            i1 = min(max_idx, i0 + 1)
            frac = pos - i0
            v0 = table[i0][ch_idx]
            v1 = table[i1][ch_idx]
            out_ch.append(v0 + (v1 - v0) * frac)
        lr, lg, lb = out_ch[0], out_ch[1], out_ch[2]
    else:
        max_idx = size - 1
        fr = nr * max_idx
        fg = ng * max_idx
        fb = nb * max_idx
        r0 = min(max_idx, max(0, int(math.floor(fr))))
        g0 = min(max_idx, max(0, int(math.floor(fg))))
        b0 = min(max_idx, max(0, int(math.floor(fb))))
        r1 = min(max_idx, r0 + 1)
        g1 = min(max_idx, g0 + 1)
        b1 = min(max_idx, b0 + 1)
        dr = fr - r0
        dg = fg - g0
        db = fb - b0

        def _at(ri: int, gi: int, bi: int) -> tuple[float, float, float]:
            return table[ri + size * (gi + size * bi)]

        c000 = _at(r0, g0, b0)
        c100 = _at(r1, g0, b0)
        c010 = _at(r0, g1, b0)
        c110 = _at(r1, g1, b0)
        c001 = _at(r0, g0, b1)
        c101 = _at(r1, g0, b1)
        c011 = _at(r0, g1, b1)
        c111 = _at(r1, g1, b1)

        out_3d: list[float] = []
        for ch in range(3):
            c00 = c000[ch] * (1.0 - dr) + c100[ch] * dr
            c10 = c010[ch] * (1.0 - dr) + c110[ch] * dr
            c01 = c001[ch] * (1.0 - dr) + c101[ch] * dr
            c11 = c011[ch] * (1.0 - dr) + c111[ch] * dr
            c0 = c00 * (1.0 - dg) + c10 * dg
            c1 = c01 * (1.0 - dg) + c11 * dg
            out_3d.append(c0 * (1.0 - db) + c1 * db)
        lr, lg, lb = out_3d[0], out_3d[1], out_3d[2]

    return (
        _clamp_unit(in_r + (lr - in_r) * mix_clamped),
        _clamp_unit(in_g + (lg - in_g) * mix_clamped),
        _clamp_unit(in_b + (lb - in_b) * mix_clamped),
    )


def bake_cdl_to_cube(
    cdl: AscCdlParams,
    out_path: Path,
    size: int = 33,
    title: str = "taktcut_cdl",
) -> CubeLutInfo:
    """Bake ASC CDL SOP + saturation parameters into a standard 3D .cube LUT."""
    if size < 2 or size > 65:
        raise ValueError("3D LUT size must be between 2 and 65")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    lines: list[str] = [
        f'TITLE "{title}"',
        f"LUT_3D_SIZE {size}",
        "DOMAIN_MIN 0.0 0.0 0.0",
        "DOMAIN_MAX 1.0 1.0 1.0",
        "",
    ]

    denom = float(size - 1)
    for b_idx in range(size):
        b_in = b_idx / denom
        for g_idx in range(size):
            g_in = g_idx / denom
            for r_idx in range(size):
                r_in = r_idx / denom
                r_out, g_out, b_out = cdl.apply_rgb(r_in, g_in, b_in)
                lines.append(f"{r_out:.6f} {g_out:.6f} {b_out:.6f}")

    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return parse_cube_lut(out_path)


def escape_ffmpeg_filter_path(path: Path) -> str:
    """Escape a filesystem path safely for FFmpeg filter option values (Windows/POSIX)."""
    posix = path.resolve().as_posix()
    return posix.replace(":", "\\:").replace("'", "\\'")


def build_rec709_lut_filter(
    lut_path: Path,
    interp: Literal["nearest", "trilinear", "tetrahedral"] = "tetrahedral",
    target_pix_fmt: str = "yuv420p",
) -> str:
    """Build an FFmpeg lut3d filter string with explicit pixel format conversion."""
    parse_cube_lut(lut_path)
    escaped = escape_ffmpeg_filter_path(lut_path)
    return f"lut3d=file='{escaped}':interp={interp},format={target_pix_fmt}"


def _smoothstep(edge0: float, edge1: float, x: float) -> float:
    if edge1 <= edge0:
        return 1.0 if x >= edge1 else 0.0
    t = _clamp_unit((x - edge0) / (edge1 - edge0))
    return t * t * (3.0 - 2.0 * t)


class PowerWindowParams(BaseModel):
    """DaVinci Resolve style spatial shape mask (Power Window) for a color node."""

    shape: PowerWindowShape = "off"
    center_x: float = 0.5
    center_y: float = 0.5
    width: float = 0.45
    height: float = 0.45
    rotation_deg: float = 0.0
    softness: float = 0.12
    invert: bool = False

    @field_validator("shape", mode="before")
    @classmethod
    def _validate_shape(cls, raw: Any) -> PowerWindowShape:
        if raw is None:
            return "off"
        if not isinstance(raw, str):
            raise ValueError(f"power_window.shape must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned not in POWER_WINDOW_SHAPES:
            allowed = ", ".join(POWER_WINDOW_SHAPES)
            raise ValueError(f"Unsupported power_window.shape {raw!r}; expected one of: {allowed}")
        return cleaned

    @field_validator("center_x", "center_y", mode="before")
    @classmethod
    def _validate_center(cls, raw: Any, info: Any) -> float:
        return _validate_bounded_float(
            raw, f"power_window.{info.field_name}", POWER_WINDOW_CENTER_MIN, POWER_WINDOW_CENTER_MAX
        )

    @field_validator("width", "height", mode="before")
    @classmethod
    def _validate_size(cls, raw: Any, info: Any) -> float:
        return _validate_bounded_float(
            raw, f"power_window.{info.field_name}", POWER_WINDOW_SIZE_MIN, POWER_WINDOW_SIZE_MAX
        )

    @field_validator("rotation_deg", mode="before")
    @classmethod
    def _validate_rotation(cls, raw: Any) -> float:
        return _validate_bounded_float(
            raw, "power_window.rotation_deg", POWER_WINDOW_ROT_MIN, POWER_WINDOW_ROT_MAX
        )

    @field_validator("softness", mode="before")
    @classmethod
    def _validate_softness(cls, raw: Any) -> float:
        return _validate_bounded_float(
            raw, "power_window.softness", POWER_WINDOW_SOFTNESS_MIN, POWER_WINDOW_SOFTNESS_MAX
        )

    @field_validator("invert", mode="before")
    @classmethod
    def _validate_invert(cls, raw: Any) -> bool:
        if not isinstance(raw, bool):
            raise ValueError(f"power_window.invert must be a boolean, got {raw!r}")
        return raw

    def is_active(self) -> bool:
        """Return True when a spatial Power Window mask shape is enabled."""
        return self.shape != "off"

    def evaluate_mask(self, u: float, v: float) -> float:
        """Evaluate smooth C1 feather mask weight in [0.0, 1.0] at normalized coords (u, v)."""
        if self.shape == "off":
            return 1.0
        rad = -math.radians(self.rotation_deg)
        cos_a = math.cos(rad)
        sin_a = math.sin(rad)
        ux = u - self.center_x
        vy = v - self.center_y
        dx = ux * cos_a - vy * sin_a
        dy = ux * sin_a + vy * cos_a

        if self.shape == "circle":
            rx = max(0.025, self.width * 0.5)
            ry = max(0.025, self.height * 0.5)
            d = math.hypot(dx / rx, dy / ry)
            s = self.softness * 2.0
            inner = max(0.0, 1.0 - s * 0.5)
            outer = max(inner + 1e-4, 1.0 + s * 0.5)
            raw = 1.0 - _smoothstep(inner, outer, d)
        elif self.shape == "linear":
            hx = max(0.025, self.width * 0.5)
            hy = max(0.025, self.height * 0.5)
            qx = abs(dx) - hx
            qy = abs(dy) - hy
            sd = math.hypot(max(qx, 0.0), max(qy, 0.0)) + min(max(qx, qy), 0.0)
            half_soft = max(0.0005, self.softness * 0.5)
            raw = 1.0 - _smoothstep(-half_soft, half_soft, sd)
        else:
            span = max(0.04, self.height * 0.5 + self.softness * 0.5)
            raw = 1.0 - _smoothstep(-span, span, dy)

        return (1.0 - raw) if self.invert else raw


def compile_power_window_mask_expr(pw: PowerWindowParams) -> str:
    """Compile a PowerWindowParams shape mask into a deterministic FFmpeg geq lum expression."""
    if not pw.is_active():
        return "255"
    rad = -math.radians(pw.rotation_deg)
    ca = math.cos(rad)
    sa = math.sin(rad)
    dx = f"((X/W-{pw.center_x:.4f})*({ca:.6f})-(Y/H-{pw.center_y:.4f})*({sa:.6f}))"
    dy = f"((X/W-{pw.center_x:.4f})*({sa:.6f})+(Y/H-{pw.center_y:.4f})*({ca:.6f}))"
    if pw.shape == "circle":
        rx = max(0.025, pw.width * 0.5)
        ry = max(0.025, pw.height * 0.5)
        s = pw.softness * 2.0
        inner = max(0.0, 1.0 - s * 0.5)
        outer = max(inner + 1e-4, 1.0 + s * 0.5)
        denom = max(1e-4, outer - inner)
        setup = (
            f"st(0,{dx});st(1,{dy});"
            f"st(2,hypot(ld(0)/{rx:.6f},ld(1)/{ry:.6f}));"
            f"st(3,clip((ld(2)-{inner:.6f})/{denom:.6f},0,1));"
        )
    elif pw.shape == "linear":
        hx = max(0.025, pw.width * 0.5)
        hy = max(0.025, pw.height * 0.5)
        lo = -max(0.0005, pw.softness * 0.5)
        denom = max(0.001, pw.softness)
        setup = (
            f"st(0,abs({dx})-{hx:.6f});st(1,abs({dy})-{hy:.6f});"
            f"st(2,hypot(max(ld(0),0),max(ld(1),0))+min(max(ld(0),ld(1)),0));"
            f"st(3,clip((ld(2)-({lo:.6f}))/{denom:.6f},0,1));"
        )
    else:
        span = max(0.04, pw.height * 0.5 + pw.softness * 0.5)
        setup = (
            f"st(0,{dy});"
            f"st(3,clip((ld(0)+{span:.6f})/{(2.0 * span):.6f},0,1));"
        )
    t_expr = "ld(3)*ld(3)*(3-2*ld(3))"
    if pw.invert:
        return f"{setup}255*({t_expr})"
    return f"{setup}255*(1-({t_expr}))"


def rgb_to_hsl(r: float, g: float, b: float) -> tuple[float, float, float]:
    """Convert unit RGB [0, 1] into (hue_deg [0, 360), saturation [0, 1], luminance [0, 1])."""
    rc = _clamp_unit(r)
    gc = _clamp_unit(g)
    bc = _clamp_unit(b)
    cmax = max(rc, gc, bc)
    cmin = min(rc, gc, bc)
    delta = cmax - cmin
    lum = 0.5 * (cmax + cmin)
    if delta <= 1e-6:
        return (0.0, 0.0, lum)
    denom = max(1e-6, 1.0 - abs(2.0 * lum - 1.0))
    sat = _clamp_unit(delta / denom)
    if cmax == rc:
        hue = 60.0 * (((gc - bc) / delta + 6.0) % 6.0)
    elif cmax == gc:
        hue = 60.0 * ((bc - rc) / delta + 2.0)
    else:
        hue = 60.0 * ((rc - gc) / delta + 4.0)
    hue = hue % 360.0
    return (hue, sat, lum)


def hsl_to_rgb(hue_deg: float, sat: float, lum: float) -> tuple[float, float, float]:
    """Convert (hue_deg, saturation [0, 1], luminance [0, 1]) back to unit RGB [0, 1]."""
    h = ((float(hue_deg) % 360.0) + 360.0) % 360.0
    s = _clamp_unit(float(sat))
    l_val = _clamp_unit(float(lum))
    if s <= 1e-6:
        return (l_val, l_val, l_val)
    c = (1.0 - abs(2.0 * l_val - 1.0)) * s
    h_prime = h / 60.0
    x = c * (1.0 - abs((h_prime % 2.0) - 1.0))
    m = l_val - 0.5 * c
    if h_prime < 1.0:
        r1, g1, b1 = c, x, 0.0
    elif h_prime < 2.0:
        r1, g1, b1 = x, c, 0.0
    elif h_prime < 3.0:
        r1, g1, b1 = 0.0, c, x
    elif h_prime < 4.0:
        r1, g1, b1 = 0.0, x, c
    elif h_prime < 5.0:
        r1, g1, b1 = x, 0.0, c
    else:
        r1, g1, b1 = c, 0.0, x
    return (_clamp_unit(r1 + m), _clamp_unit(g1 + m), _clamp_unit(b1 + m))


def _eval_band_weight(val: float, lo: float, hi: float, soft: float) -> float:
    w = 1.0
    if lo > 0.0:
        if soft <= 1e-6:
            w *= 1.0 if val >= lo else 0.0
        else:
            w *= _smoothstep(lo - soft, lo, val)
    if hi < 1.0:
        if soft <= 1e-6:
            w *= 1.0 if val <= hi else 0.0
        else:
            w *= 1.0 - _smoothstep(hi, hi + soft, val)
    return w


class QualifierParams(BaseModel):
    """DaVinci Resolve HSL Secondary Qualifier parameters for color-range keying."""

    enabled: bool = False
    preset: QualifierPresetId = "off"
    hue_center: float = 22.0
    hue_width: float = 44.0
    hue_softness: float = 18.0
    sat_low: float = 0.12
    sat_high: float = 0.75
    sat_softness: float = 0.08
    lum_low: float = 0.18
    lum_high: float = 0.88
    lum_softness: float = 0.10
    blur_radius: float = 0.0
    invert: bool = False

    @field_validator("enabled", "invert", mode="before")
    @classmethod
    def _validate_bool_flag(cls, raw: Any, info: Any) -> bool:
        if not isinstance(raw, bool):
            raise ValueError(f"qualifier.{info.field_name} must be a boolean, got {raw!r}")
        return raw

    @field_validator("preset", mode="before")
    @classmethod
    def _validate_preset(cls, raw: Any) -> QualifierPresetId:
        if raw is None:
            return "off"
        if not isinstance(raw, str):
            raise ValueError(f"qualifier.preset must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned not in QUALIFIER_PRESET_IDS:
            allowed = ", ".join(QUALIFIER_PRESET_IDS)
            raise ValueError(f"Unsupported qualifier.preset {raw!r}; expected one of: {allowed}")
        return cleaned

    @field_validator("hue_center", mode="before")
    @classmethod
    def _validate_hue_center(cls, raw: Any) -> float:
        return _validate_bounded_float(
            raw, "qualifier.hue_center", QUALIFIER_HUE_MIN, QUALIFIER_HUE_MAX
        )

    @field_validator("hue_width", mode="before")
    @classmethod
    def _validate_hue_width(cls, raw: Any) -> float:
        return _validate_bounded_float(
            raw, "qualifier.hue_width", QUALIFIER_HUE_WIDTH_MIN, QUALIFIER_HUE_WIDTH_MAX
        )

    @field_validator("hue_softness", mode="before")
    @classmethod
    def _validate_hue_softness(cls, raw: Any) -> float:
        return _validate_bounded_float(
            raw, "qualifier.hue_softness", QUALIFIER_HUE_SOFT_MIN, QUALIFIER_HUE_SOFT_MAX
        )

    @field_validator("sat_low", "sat_high", "lum_low", "lum_high", mode="before")
    @classmethod
    def _validate_unit_bound(cls, raw: Any, info: Any) -> float:
        return _validate_bounded_float(raw, f"qualifier.{info.field_name}", 0.0, 1.0)

    @field_validator("sat_softness", "lum_softness", mode="before")
    @classmethod
    def _validate_sl_softness(cls, raw: Any, info: Any) -> float:
        return _validate_bounded_float(
            raw,
            f"qualifier.{info.field_name}",
            QUALIFIER_SAT_LUM_SOFT_MIN,
            QUALIFIER_SAT_LUM_SOFT_MAX,
        )

    @field_validator("blur_radius", mode="before")
    @classmethod
    def _validate_blur_radius(cls, raw: Any) -> float:
        return _validate_bounded_float(
            raw, "qualifier.blur_radius", QUALIFIER_BLUR_MIN, QUALIFIER_BLUR_MAX
        )

    @model_validator(mode="after")
    def _validate_ranges(self) -> QualifierParams:
        if self.sat_low > self.sat_high:
            raise ValueError(
                f"qualifier.sat_low ({self.sat_low}) must be <= sat_high ({self.sat_high})"
            )
        if self.lum_low > self.lum_high:
            raise ValueError(
                f"qualifier.lum_low ({self.lum_low}) must be <= lum_high ({self.lum_high})"
            )
        return self

    def is_active(self) -> bool:
        """Return True when HSL Qualifier secondary keying is enabled."""
        return bool(self.enabled)

    def evaluate_mask(self, r: float, g: float, b: float) -> float:
        """Evaluate smooth HSL Qualifier matte weight in [0.0, 1.0] for unit RGB."""
        if not self.enabled:
            return 1.0
        hue, sat, lum = rgb_to_hsl(r, g, b)
        if self.hue_width >= 359.9:
            h_weight = 1.0
        else:
            diff = abs(hue - (self.hue_center % 360.0))
            dh = min(diff, 360.0 - diff)
            hw = self.hue_width * 0.5
            if dh <= hw:
                h_weight = 1.0
            elif self.hue_softness <= 1e-6:
                h_weight = 0.0
            else:
                h_weight = 1.0 - _smoothstep(hw, hw + self.hue_softness, dh)

        s_weight = _eval_band_weight(sat, self.sat_low, self.sat_high, self.sat_softness)
        l_weight = _eval_band_weight(lum, self.lum_low, self.lum_high, self.lum_softness)
        weight = _clamp_unit(h_weight * s_weight * l_weight)
        return (1.0 - weight) if self.invert else weight


class QualifierPreset(BaseModel):
    """Built-in DaVinci Resolve HSL Qualifier secondary preset."""

    id: QualifierPresetId
    label: str
    description: str
    qualifier: QualifierParams


QUALIFIER_PRESETS: tuple[QualifierPreset, ...] = (
    QualifierPreset(
        id="off",
        label="Off",
        description="Bypass HSL Qualifier secondary keyer.",
        qualifier=QualifierParams(enabled=False, preset="off"),
    ),
    QualifierPreset(
        id="skin_tones",
        label="Skin Tones",
        description="Isolate warm flesh tones along the Rec.709 skin line.",
        qualifier=QualifierParams(
            enabled=True,
            preset="skin_tones",
            hue_center=22.0,
            hue_width=44.0,
            hue_softness=18.0,
            sat_low=0.12,
            sat_high=0.75,
            sat_softness=0.08,
            lum_low=0.18,
            lum_high=0.88,
            lum_softness=0.10,
            blur_radius=1.0,
        ),
    ),
    QualifierPreset(
        id="sky_blue",
        label="Sky Blue",
        description="Isolate cyan-blue sky gradients without affecting warm foreground.",
        qualifier=QualifierParams(
            enabled=True,
            preset="sky_blue",
            hue_center=210.0,
            hue_width=52.0,
            hue_softness=18.0,
            sat_low=0.20,
            sat_high=1.00,
            sat_softness=0.10,
            lum_low=0.25,
            lum_high=0.95,
            lum_softness=0.10,
            blur_radius=1.0,
        ),
    ),
    QualifierPreset(
        id="foliage_green",
        label="Foliage Green",
        description="Target natural greens and botanical hues for filmic emerald tuning.",
        qualifier=QualifierParams(
            enabled=True,
            preset="foliage_green",
            hue_center=115.0,
            hue_width=64.0,
            hue_softness=20.0,
            sat_low=0.18,
            sat_high=0.95,
            sat_softness=0.10,
            lum_low=0.12,
            lum_high=0.82,
            lum_softness=0.10,
            blur_radius=1.0,
        ),
    ),
    QualifierPreset(
        id="teal_accents",
        label="Teal Accents",
        description="Isolate cinema teal shadows and cool cyan accents.",
        qualifier=QualifierParams(
            enabled=True,
            preset="teal_accents",
            hue_center=180.0,
            hue_width=46.0,
            hue_softness=16.0,
            sat_low=0.20,
            sat_high=1.00,
            sat_softness=0.10,
            lum_low=0.15,
            lum_high=0.85,
            lum_softness=0.10,
            blur_radius=0.5,
        ),
    ),
    QualifierPreset(
        id="highlights",
        label="Highlights",
        description="Luminance-only key isolating bright specular highlights.",
        qualifier=QualifierParams(
            enabled=True,
            preset="highlights",
            hue_center=0.0,
            hue_width=360.0,
            hue_softness=0.0,
            sat_low=0.0,
            sat_high=1.0,
            sat_softness=0.0,
            lum_low=0.65,
            lum_high=1.0,
            lum_softness=0.15,
            blur_radius=1.0,
        ),
    ),
    QualifierPreset(
        id="shadows",
        label="Shadows",
        description="Luminance-only key isolating deep shadow regions.",
        qualifier=QualifierParams(
            enabled=True,
            preset="shadows",
            hue_center=0.0,
            hue_width=360.0,
            hue_softness=0.0,
            sat_low=0.0,
            sat_high=1.0,
            sat_softness=0.0,
            lum_low=0.0,
            lum_high=0.32,
            lum_softness=0.15,
            blur_radius=1.0,
        ),
    ),
)


def list_qualifier_presets() -> tuple[QualifierPreset, ...]:
    """Return all built-in HSL Qualifier presets."""
    return QUALIFIER_PRESETS


def get_qualifier_preset(preset_id: str) -> QualifierPreset:
    """Resolve a built-in HSL Qualifier preset by id."""
    for preset in QUALIFIER_PRESETS:
        if preset.id == preset_id:
            return preset
    raise ValueError(f"Unknown qualifier preset {preset_id!r}")


def _compile_geq_band(reg_idx: int, lo: float, hi: float, soft: float) -> str:
    expr = ""
    if lo > 0.0:
        if soft <= 1e-4:
            expr += f"st(8,ld(8)*gte(ld({reg_idx}),{lo:.4f}));"
        else:
            e0 = lo - soft
            expr += (
                f"st(9,clip((ld({reg_idx})-({e0:.4f}))/{soft:.4f},0,1));"
                f"st(8,ld(8)*(ld(9)*ld(9)*(3-2*ld(9))));"
            )
    if hi < 1.0:
        if soft <= 1e-4:
            expr += f"st(8,ld(8)*lte(ld({reg_idx}),{hi:.4f}));"
        else:
            expr += (
                f"st(9,clip((ld({reg_idx})-{hi:.4f})/{soft:.4f},0,1));"
                f"st(8,ld(8)*(1-ld(9)*ld(9)*(3-2*ld(9))));"
            )
    return expr


def compile_qualifier_mask_expr(q: QualifierParams) -> str:
    """Compile QualifierParams HSL selection into a deterministic FFmpeg geq r-plane expr."""
    if not q.is_active():
        return "255"
    base = (
        "st(0,r(X,Y)/255);st(1,g(X,Y)/255);st(2,b(X,Y)/255);"
        "st(3,max(max(ld(0),ld(1)),ld(2)));"
        "st(4,min(min(ld(0),ld(1)),ld(2)));"
        "st(5,ld(3)-ld(4));"
        "st(6,0.5*(ld(3)+ld(4)));"
        "st(7,if(gt(ld(5),1e-5),clip(ld(5)/max(1e-5,1-abs(2*ld(6)-1)),0,1),0));"
        "st(8,if(lte(ld(5),1e-5),0,60*if(eq(ld(3),ld(0)),mod((ld(1)-ld(2))/max(1e-5,ld(5))+6,6),if(eq(ld(3),ld(1)),(ld(2)-ld(0))/max(1e-5,ld(5))+2,(ld(0)-ld(1))/max(1e-5,ld(5))+4))));"
    )
    if q.hue_width >= 359.9:
        h_part = "st(8,1);"
    else:
        hc = q.hue_center % 360.0
        hw = q.hue_width * 0.5
        if q.hue_softness <= 1e-4:
            h_part = (
                f"st(9,min(abs(ld(8)-{hc:.4f}),360-abs(ld(8)-{hc:.4f})));"
                f"st(8,lte(ld(9),{hw:.4f}));"
            )
        else:
            hs = q.hue_softness
            h_part = (
                f"st(9,min(abs(ld(8)-{hc:.4f}),360-abs(ld(8)-{hc:.4f})));"
                f"st(9,clip((ld(9)-{hw:.4f})/{hs:.4f},0,1));"
                f"st(8,1-ld(9)*ld(9)*(3-2*ld(9)));"
            )
    s_part = _compile_geq_band(7, q.sat_low, q.sat_high, q.sat_softness)
    l_part = _compile_geq_band(6, q.lum_low, q.lum_high, q.lum_softness)
    out_expr = "255*(1-ld(8))" if q.invert else "255*ld(8)"
    return f"{base}{h_part}{s_part}{l_part}{out_expr}"


def normalize_curve_points(raw_points: Any) -> list[tuple[float, float]]:
    """Validate, sort, and clamp YRGB curve points to [0, 1] with pinned endpoints."""
    if raw_points is None:
        return list(DEFAULT_CURVE_POINTS)
    if not isinstance(raw_points, (list, tuple)):
        raise ValueError("Curve points must be a list of [x, y] pairs")
    if len(raw_points) == 0:
        return list(DEFAULT_CURVE_POINTS)
    if len(raw_points) > MAX_CURVE_POINTS:
        raise ValueError(f"Curve channel cannot exceed {MAX_CURVE_POINTS} points")

    parsed: list[tuple[float, float]] = []
    for idx, pt in enumerate(raw_points):
        if not isinstance(pt, (list, tuple)) or len(pt) != 2:
            raise ValueError(f"Curve point[{idx}] must be an [x, y] pair")
        px = _validate_bounded_float(pt[0], f"curve[{idx}].x", 0.0, 1.0)
        py = _validate_bounded_float(pt[1], f"curve[{idx}].y", 0.0, 1.0)
        parsed.append((round(px, 4), round(py, 4)))

    parsed.sort(key=lambda p: p[0])

    deduped: list[tuple[float, float]] = []
    for px, py in parsed:
        if deduped and abs(px - deduped[-1][0]) < 1e-3:
            deduped[-1] = (deduped[-1][0], py)
        else:
            deduped.append((px, py))

    if deduped[0][0] > 1e-3:
        deduped.insert(0, (0.0, 0.0))
    else:
        deduped[0] = (0.0, deduped[0][1])

    if deduped[-1][0] < 1.0 - 1e-3:
        deduped.append((1.0, 1.0))
    else:
        deduped[-1] = (1.0, deduped[-1][1])

    if len(deduped) > MAX_CURVE_POINTS:
        interior = deduped[1 : MAX_CURVE_POINTS - 1]
        deduped = [deduped[0], *interior, deduped[-1]]

    return deduped


def _compute_pchip_tangents(pts: Sequence[tuple[float, float]]) -> list[float]:
    """Compute Fritsch-Carlson monotone cubic Hermite tangents for sorted curve points."""
    n = len(pts)
    if n < 2:
        return [0.0] * n
    h = [max(1e-6, pts[i + 1][0] - pts[i][0]) for i in range(n - 1)]
    d = [(pts[i + 1][1] - pts[i][1]) / h[i] for i in range(n - 1)]
    if n == 2:
        return [d[0], d[0]]

    m = [0.0] * n
    for k in range(1, n - 1):
        if d[k - 1] * d[k] <= 0.0:
            m[k] = 0.0
        else:
            w1 = 2.0 * h[k] + h[k - 1]
            w2 = h[k] + 2.0 * h[k - 1]
            m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k])

    def _endpoint_slope(h0: float, h1: float, d0: float, d1: float) -> float:
        slope = ((2.0 * h0 + h1) * d0 - h0 * d1) / (h0 + h1)
        if slope * d0 <= 0.0:
            return 0.0
        if (d0 * d1 <= 0.0) and (abs(slope) > 3.0 * abs(d0)):
            return 3.0 * d0
        return slope

    m[0] = _endpoint_slope(h[0], h[1], d[0], d[1])
    m[n - 1] = _endpoint_slope(h[n - 2], h[n - 3], d[n - 2], d[n - 3])
    return m


def evaluate_curve_pchip(points: Sequence[tuple[float, float]], x: float) -> float:
    """Evaluate a monotone PCHIP cubic spline curve at x in [0, 1]."""
    pts = list(points) if points else list(DEFAULT_CURVE_POINTS)
    xc = _clamp_unit(float(x))
    if len(pts) == 1:
        return _clamp_unit(pts[0][1])
    if xc <= pts[0][0]:
        return _clamp_unit(pts[0][1])
    if xc >= pts[-1][0]:
        return _clamp_unit(pts[-1][1])

    m = _compute_pchip_tangents(pts)
    idx = 0
    for i in range(len(pts) - 1):
        if xc <= pts[i + 1][0]:
            idx = i
            break
    x0, y0 = pts[idx]
    x1, y1 = pts[idx + 1]
    h = max(1e-6, x1 - x0)
    t = (xc - x0) / h
    t2 = t * t
    t3 = t2 * t
    h00 = 2.0 * t3 - 3.0 * t2 + 1.0
    h10 = t3 - 2.0 * t2 + t
    h01 = -2.0 * t3 + 3.0 * t2
    h11 = t3 - t2
    val = h00 * y0 + h10 * h * m[idx] + h01 * y1 + h11 * h * m[idx + 1]
    return _clamp_unit(val)


def build_curve_lut_256(points: Sequence[tuple[float, float]]) -> list[float]:
    """Sample a PCHIP curve into a 256-entry lookup table in [0, 1]."""
    return [evaluate_curve_pchip(points, i / 255.0) for i in range(256)]


def is_curve_channel_identity(points: Sequence[tuple[float, float]]) -> bool:
    """Return True when every knot lies on the diagonal y = x."""
    if not points:
        return True
    return all(abs(py - px) < 1e-4 for px, py in points)


class ColorCurvesParams(BaseModel):
    """DaVinci Resolve custom YRGB spline curves (Master, Red, Green, Blue)."""

    master: list[tuple[float, float]] = Field(
        default_factory=lambda: list(DEFAULT_CURVE_POINTS)
    )
    red: list[tuple[float, float]] = Field(
        default_factory=lambda: list(DEFAULT_CURVE_POINTS)
    )
    green: list[tuple[float, float]] = Field(
        default_factory=lambda: list(DEFAULT_CURVE_POINTS)
    )
    blue: list[tuple[float, float]] = Field(
        default_factory=lambda: list(DEFAULT_CURVE_POINTS)
    )

    @field_validator("master", "red", "green", "blue", mode="before")
    @classmethod
    def _validate_channel_points(cls, raw: Any) -> list[tuple[float, float]]:
        return normalize_curve_points(raw)

    def is_identity(self) -> bool:
        """Return True when all four YRGB channels are diagonal identity curves."""
        return (
            is_curve_channel_identity(self.master)
            and is_curve_channel_identity(self.red)
            and is_curve_channel_identity(self.green)
            and is_curve_channel_identity(self.blue)
        )

    def apply_rgb(self, r: float, g: float, b: float) -> tuple[float, float, float]:
        """Apply channel curves first, then Master curve (matching FFmpeg vf_curves)."""
        rc = _clamp_unit(r)
        gc = _clamp_unit(g)
        bc = _clamp_unit(b)
        if not is_curve_channel_identity(self.red):
            rc = evaluate_curve_pchip(self.red, rc)
        if not is_curve_channel_identity(self.green):
            gc = evaluate_curve_pchip(self.green, gc)
        if not is_curve_channel_identity(self.blue):
            bc = evaluate_curve_pchip(self.blue, bc)
        if not is_curve_channel_identity(self.master):
            rc = evaluate_curve_pchip(self.master, rc)
            gc = evaluate_curve_pchip(self.master, gc)
            bc = evaluate_curve_pchip(self.master, bc)
        return (rc, gc, bc)

    def build_luts_256(self) -> dict[ColorCurveChannel, list[float]]:
        """Return 256-entry lookup tables for all four YRGB curve channels."""
        return {
            "master": build_curve_lut_256(self.master),
            "red": build_curve_lut_256(self.red),
            "green": build_curve_lut_256(self.green),
            "blue": build_curve_lut_256(self.blue),
        }


class ColorCurvesPreset(BaseModel):
    """Named studio YRGB curve preset."""

    id: ColorCurvesPresetId
    label: str
    description: str
    curves: ColorCurvesParams


COLOR_CURVES_PRESETS: tuple[ColorCurvesPreset, ...] = (
    ColorCurvesPreset(
        id="linear",
        label="Linear",
        description="Neutral unity curve across Y, R, G, and B channels.",
        curves=ColorCurvesParams(),
    ),
    ColorCurvesPreset(
        id="film_s_curve",
        label="Film S-Curve",
        description="Gentle shadow toe and highlight shoulder for cinematic contrast.",
        curves=ColorCurvesParams(
            master=[(0.0, 0.0), (0.25, 0.19), (0.5, 0.50), (0.75, 0.82), (1.0, 1.0)],
        ),
    ),
    ColorCurvesPreset(
        id="matte_lift",
        label="Matte Lift",
        description="Lifted black floor and soft highlight roll-off for editorial film matte.",
        curves=ColorCurvesParams(
            master=[(0.0, 0.08), (0.25, 0.24), (0.75, 0.78), (1.0, 0.94)],
        ),
    ),
    ColorCurvesPreset(
        id="crisp_contrast",
        label="Crisp Contrast",
        description="Deep shadows and punchy upper-midtones.",
        curves=ColorCurvesParams(
            master=[(0.0, 0.0), (0.22, 0.14), (0.5, 0.52), (0.78, 0.88), (1.0, 1.0)],
        ),
    ),
    ColorCurvesPreset(
        id="warm_gold",
        label="Warm Gold",
        description="Golden midtone warmth with restrained blue highlights.",
        curves=ColorCurvesParams(
            red=[(0.0, 0.0), (0.5, 0.56), (1.0, 1.0)],
            blue=[(0.0, 0.0), (0.5, 0.43), (1.0, 0.95)],
        ),
    ),
    ColorCurvesPreset(
        id="cool_shadows",
        label="Cool Shadows",
        description="Cool blue shadow tint with balanced skin highlights.",
        curves=ColorCurvesParams(
            red=[(0.0, 0.0), (0.25, 0.20), (0.75, 0.76), (1.0, 1.0)],
            blue=[(0.0, 0.04), (0.25, 0.32), (0.75, 0.74), (1.0, 1.0)],
        ),
    ),
)


def list_color_curves_presets() -> tuple[ColorCurvesPreset, ...]:
    """Return all built-in studio YRGB curve presets."""
    return COLOR_CURVES_PRESETS


def get_color_curves_preset(preset_id: str) -> ColorCurvesPreset:
    """Resolve a built-in curve preset by id."""
    for preset in COLOR_CURVES_PRESETS:
        if preset.id == preset_id:
            return preset
    raise ValueError(f"Unknown color curves preset {preset_id!r}")


def compile_color_curves_filter(curves: ColorCurvesParams) -> str:
    """Compile ColorCurvesParams to an FFmpeg curves=interp=pchip filter expression."""
    if curves.is_identity():
        return ""
    opts: list[str] = ["interp=pchip"]
    channel_pairs: tuple[tuple[str, list[tuple[float, float]]], ...] = (
        ("master", curves.master),
        ("red", curves.red),
        ("green", curves.green),
        ("blue", curves.blue),
    )
    for name, pts in channel_pairs:
        if is_curve_channel_identity(pts):
            continue
        encoded = " ".join(f"{px:.4f}/{py:.4f}" for px, py in pts)
        opts.append(f"{name}='{encoded}'")
    return f"curves={':'.join(opts)}"


def evaluate_periodic_hue_curve(values: Sequence[float], hue_deg: float) -> float:
    """Evaluate a 6-anchor periodic Catmull-Rom curve over [0, 360) hue degrees."""
    if len(values) != 6:
        raise ValueError(f"Expected 6 hue anchors, got {len(values)}")
    h = ((float(hue_deg) % 360.0) + 360.0) % 360.0
    sector = h / 60.0
    i1 = int(math.floor(sector)) % 6
    t = sector - math.floor(sector)
    p0 = float(values[(i1 - 1) % 6])
    p1 = float(values[i1])
    p2 = float(values[(i1 + 1) % 6])
    p3 = float(values[(i1 + 2) % 6])
    t2 = t * t
    t3 = t2 * t
    return 0.5 * (
        (2.0 * p1)
        + (-p0 + p2) * t
        + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2
        + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3
    )


class HslCurveVectorValues(BaseModel):
    """Six primary/secondary hue vector offsets (R=0, Y=60, G=120, C=180, B=240, M=300)."""

    reds: float = 0.0
    yellows: float = 0.0
    greens: float = 0.0
    cyans: float = 0.0
    blues: float = 0.0
    magentas: float = 0.0

    def as_tuple(self) -> tuple[float, float, float, float, float, float]:
        """Return ordered 6-anchor values from Red (0 deg) through Magenta (300 deg)."""
        return (
            self.reds,
            self.yellows,
            self.greens,
            self.cyans,
            self.blues,
            self.magentas,
        )

    def is_identity(self) -> bool:
        """Return True when all 6 hue anchors are zero."""
        return all(abs(v) <= 1e-6 for v in self.as_tuple())


def _coerce_hsl_vector_channel(
    raw: Any,
    lo: float,
    hi: float,
    field_name: str,
) -> HslCurveVectorValues:
    if isinstance(raw, HslCurveVectorValues):
        data = raw.model_dump()
    elif isinstance(raw, dict):
        data = dict(raw)
    elif raw is None:
        data = {}
    else:
        raise ValueError(f"{field_name} must be an object or HslCurveVectorValues")
    cleaned: dict[str, float] = {}
    for vec in HSL_HUE_VECTORS:
        val = data.get(vec, 0.0)
        cleaned[vec] = _validate_bounded_float(val, f"{field_name}.{vec}", lo, hi)
    return HslCurveVectorValues(**cleaned)


class HslCurvesParams(BaseModel):
    """DaVinci Resolve 6-vector Hue vs Hue, Hue vs Sat, and Hue vs Lum curves."""

    hue_vs_hue: HslCurveVectorValues = Field(default_factory=HslCurveVectorValues)
    hue_vs_sat: HslCurveVectorValues = Field(default_factory=HslCurveVectorValues)
    hue_vs_lum: HslCurveVectorValues = Field(default_factory=HslCurveVectorValues)

    @field_validator("hue_vs_hue", mode="before")
    @classmethod
    def _validate_hue_vs_hue(cls, raw: Any) -> HslCurveVectorValues:
        return _coerce_hsl_vector_channel(
            raw, HSL_HUE_VS_HUE_MIN, HSL_HUE_VS_HUE_MAX, "hue_vs_hue"
        )

    @field_validator("hue_vs_sat", mode="before")
    @classmethod
    def _validate_hue_vs_sat(cls, raw: Any) -> HslCurveVectorValues:
        return _coerce_hsl_vector_channel(
            raw, HSL_HUE_VS_SAT_MIN, HSL_HUE_VS_SAT_MAX, "hue_vs_sat"
        )

    @field_validator("hue_vs_lum", mode="before")
    @classmethod
    def _validate_hue_vs_lum(cls, raw: Any) -> HslCurveVectorValues:
        return _coerce_hsl_vector_channel(
            raw, HSL_HUE_VS_LUM_MIN, HSL_HUE_VS_LUM_MAX, "hue_vs_lum"
        )

    def is_identity(self) -> bool:
        """Return True when all three 6-vector HSL curves are neutral."""
        return (
            self.hue_vs_hue.is_identity()
            and self.hue_vs_sat.is_identity()
            and self.hue_vs_lum.is_identity()
        )

    def apply_rgb(self, r: float, g: float, b: float) -> tuple[float, float, float]:
        """Apply periodic Hue vs Hue, Hue vs Sat, and Hue vs Lum adjustments to [0, 1] RGB."""
        rc = _clamp_unit(r)
        gc = _clamp_unit(g)
        bc = _clamp_unit(b)
        if self.is_identity():
            return (rc, gc, bc)
        hue, sat, lum = rgb_to_hsl(rc, gc, bc)
        if sat <= 1e-4:
            return (rc, gc, bc)
        chroma_weight = _smoothstep(0.0, 0.08, sat)
        dh = 0.0
        if not self.hue_vs_hue.is_identity():
            raw_dh = evaluate_periodic_hue_curve(self.hue_vs_hue.as_tuple(), hue)
            dh = max(HSL_HUE_VS_HUE_MIN, min(HSL_HUE_VS_HUE_MAX, raw_dh)) * chroma_weight
        ds = 0.0
        if not self.hue_vs_sat.is_identity():
            raw_ds = evaluate_periodic_hue_curve(self.hue_vs_sat.as_tuple(), hue)
            ds = max(HSL_HUE_VS_SAT_MIN, min(HSL_HUE_VS_SAT_MAX, raw_ds))
        dl = 0.0
        if not self.hue_vs_lum.is_identity():
            raw_dl = evaluate_periodic_hue_curve(self.hue_vs_lum.as_tuple(), hue)
            dl = max(HSL_HUE_VS_LUM_MIN, min(HSL_HUE_VS_LUM_MAX, raw_dl)) * chroma_weight
        next_hue = (hue + dh) % 360.0
        next_sat = _clamp_unit(sat * (1.0 + ds))
        next_lum = _clamp_unit(lum + dl * 0.35)
        return hsl_to_rgb(next_hue, next_sat, next_lum)


class HslCurvesPreset(BaseModel):
    """Curated DaVinci-style 6-vector HSL Curves preset."""

    id: HslCurvesPresetId
    name: str
    description: str
    hsl_curves: HslCurvesParams


HSL_CURVE_PRESETS: tuple[HslCurvesPreset, ...] = (
    HslCurvesPreset(
        id="neutral",
        name="Neutral",
        description="Flat zeroed 6-vector Hue vs Hue, Hue vs Sat, and Hue vs Lum curves.",
        hsl_curves=HslCurvesParams(),
    ),
    HslCurvesPreset(
        id="teal_orange_push",
        name="Teal & Orange",
        description="Push skin toward warm amber, enrich cyan/blue tones, and mute green/magenta.",
        hsl_curves=HslCurvesParams(
            hue_vs_hue=HslCurveVectorValues(reds=8.0, yellows=-10.0, cyans=-8.0),
            hue_vs_sat=HslCurveVectorValues(
                reds=0.25,
                yellows=0.15,
                greens=-0.45,
                cyans=0.40,
                blues=0.25,
                magentas=-0.50,
            ),
            hue_vs_lum=HslCurveVectorValues(cyans=-0.15, blues=-0.18),
        ),
    ),
    HslCurvesPreset(
        id="skin_polish",
        name="Skin Polish",
        description="Unify red/yellow skin hues with gentle highlight smoothing.",
        hsl_curves=HslCurvesParams(
            hue_vs_hue=HslCurveVectorValues(reds=5.0, yellows=-6.0),
            hue_vs_sat=HslCurveVectorValues(reds=-0.10, yellows=-0.12),
            hue_vs_lum=HslCurveVectorValues(reds=0.08, yellows=0.10),
        ),
    ),
    HslCurvesPreset(
        id="foliage_emerald",
        name="Emerald Foliage",
        description="Shift yellow-greens toward rich cinema emerald and deepen foliage luma.",
        hsl_curves=HslCurvesParams(
            hue_vs_hue=HslCurveVectorValues(yellows=16.0, greens=12.0),
            hue_vs_sat=HslCurveVectorValues(yellows=-0.15, greens=0.20),
            hue_vs_lum=HslCurveVectorValues(greens=-0.16),
        ),
    ),
    HslCurvesPreset(
        id="sky_deepen",
        name="Sky Polarizer",
        description="Simulate a circular polarizer by enriching and darkening cyan/blue skies.",
        hsl_curves=HslCurvesParams(
            hue_vs_sat=HslCurveVectorValues(cyans=0.30, blues=0.40),
            hue_vs_lum=HslCurveVectorValues(cyans=-0.20, blues=-0.24),
        ),
    ),
    HslCurvesPreset(
        id="muted_greens",
        name="Muted Greens",
        description="Desaturate distracting greens, cyans, and magentas while preserving skin.",
        hsl_curves=HslCurvesParams(
            hue_vs_sat=HslCurveVectorValues(
                yellows=-0.25,
                greens=-0.55,
                cyans=-0.30,
                magentas=-0.35,
            ),
            hue_vs_lum=HslCurveVectorValues(greens=-0.10),
        ),
    ),
)


def list_hsl_curve_presets() -> tuple[HslCurvesPreset, ...]:
    """Return all built-in 6-vector HSL curve presets."""
    return HSL_CURVE_PRESETS


def get_hsl_curve_preset(preset_id: str) -> HslCurvesPreset:
    """Resolve a built-in 6-vector HSL curve preset by id."""
    for preset in HSL_CURVE_PRESETS:
        if preset.id == preset_id:
            return preset
    raise ValueError(f"Unknown HSL curves preset {preset_id!r}")


def compile_hsl_curves_filter(hsl_curves: HslCurvesParams) -> str:
    """Compile HslCurvesParams into FFmpeg per-sector huesaturation filter stages."""
    if hsl_curves.is_identity():
        return ""
    stages: list[str] = []
    for vec in HSL_HUE_VECTORS:
        dh = float(getattr(hsl_curves.hue_vs_hue, vec))
        ds = float(getattr(hsl_curves.hue_vs_sat, vec))
        dl = float(getattr(hsl_curves.hue_vs_lum, vec))
        if abs(dh) <= 1e-4 and abs(ds) <= 1e-4 and abs(dl) <= 1e-4:
            continue
        flag = HSL_HUE_FFMPEG_FLAGS[vec]
        stages.append(
            f"huesaturation=colors={flag}:hue={dh:.2f}:saturation={ds:.4f}:intensity={dl:.4f}"
        )
    return ",".join(stages)


def _default_warper_points() -> list[ColorWarperPoint]:
    return [
        ColorWarperPoint(hue_idx=h, ring_idx=r)
        for r in range(COLOR_WARPER_SAT_RINGS)
        for h in range(COLOR_WARPER_HUE_COUNT)
    ]


class ColorWarperPoint(BaseModel):
    """Single polar control vertex on the 6x3 DaVinci Color Warper spider grid."""

    hue_idx: int = Field(ge=0, lt=COLOR_WARPER_HUE_COUNT)
    ring_idx: int = Field(ge=0, lt=COLOR_WARPER_SAT_RINGS)
    hue_offset: float = Field(
        default=0.0, ge=COLOR_WARPER_HUE_OFFSET_MIN, le=COLOR_WARPER_HUE_OFFSET_MAX
    )
    sat_offset: float = Field(
        default=0.0, ge=COLOR_WARPER_SAT_OFFSET_MIN, le=COLOR_WARPER_SAT_OFFSET_MAX
    )

    @field_validator("hue_idx", "ring_idx", mode="before")
    @classmethod
    def _validate_index_int(cls, raw: Any, info: Any) -> int:
        if isinstance(raw, bool) or not isinstance(raw, int):
            raise ValueError(f"{info.field_name} must be an integer, got {raw!r}")
        return raw

    @field_validator("hue_offset", mode="before")
    @classmethod
    def _validate_hue_offset(cls, raw: Any) -> float:
        return _validate_bounded_float(
            raw, "hue_offset", COLOR_WARPER_HUE_OFFSET_MIN, COLOR_WARPER_HUE_OFFSET_MAX
        )

    @field_validator("sat_offset", mode="before")
    @classmethod
    def _validate_sat_offset(cls, raw: Any) -> float:
        return _validate_bounded_float(
            raw, "sat_offset", COLOR_WARPER_SAT_OFFSET_MIN, COLOR_WARPER_SAT_OFFSET_MAX
        )

    def is_identity(self) -> bool:
        """Return True when this control vertex has zero hue and saturation offset."""
        return abs(self.hue_offset) <= 1e-4 and abs(self.sat_offset) <= 1e-4


def _normalize_warper_points(raw: Any) -> list[ColorWarperPoint]:
    if raw is None:
        return _default_warper_points()
    if not isinstance(raw, (list, tuple)):
        raise ValueError("ColorWarperParams.points must be a list of control points")
    grid: dict[tuple[int, int], ColorWarperPoint] = {}
    for item in raw:
        pt = item if isinstance(item, ColorWarperPoint) else ColorWarperPoint.model_validate(item)
        key = (pt.ring_idx, pt.hue_idx)
        if key in grid:
            raise ValueError(
                f"Duplicate Color Warper vertex at hue_idx={pt.hue_idx}, ring_idx={pt.ring_idx}"
            )
        grid[key] = pt
    out: list[ColorWarperPoint] = []
    for r_idx in range(COLOR_WARPER_SAT_RINGS):
        for h_idx in range(COLOR_WARPER_HUE_COUNT):
            out.append(
                grid.get((r_idx, h_idx))
                or ColorWarperPoint(hue_idx=h_idx, ring_idx=r_idx)
            )
    return out


class ColorWarperParams(BaseModel):
    """DaVinci Resolve Studio 2D Hue-Saturation Spider Grid Color Warper."""

    points: list[ColorWarperPoint] = Field(default_factory=_default_warper_points)

    @field_validator("points", mode="before")
    @classmethod
    def _validate_points(cls, raw: Any) -> list[ColorWarperPoint]:
        return _normalize_warper_points(raw)

    def get_point(self, hue_idx: int, ring_idx: int) -> ColorWarperPoint:
        """Return the control point at (hue_idx, ring_idx)."""
        if hue_idx < 0 or hue_idx >= COLOR_WARPER_HUE_COUNT:
            raise ValueError(f"hue_idx out of range: {hue_idx}")
        if ring_idx < 0 or ring_idx >= COLOR_WARPER_SAT_RINGS:
            raise ValueError(f"ring_idx out of range: {ring_idx}")
        return self.points[ring_idx * COLOR_WARPER_HUE_COUNT + hue_idx]

    def is_identity(self) -> bool:
        """Return True when every vertex in the 6x3 spider grid is at zero offset."""
        return all(pt.is_identity() for pt in self.points)

    def evaluate_shift(self, hue_deg: float, sat: float) -> tuple[float, float]:
        """Evaluate smooth bilinear polar (hue_deg_offset, sat_offset) at (hue_deg, sat)."""
        if self.is_identity():
            return (0.0, 0.0)
        sc = _clamp_unit(sat)
        if sc <= 1e-6:
            return (0.0, 0.0)

        h_pos = ((hue_deg % 360.0) / 60.0) % COLOR_WARPER_HUE_COUNT
        h0 = int(math.floor(h_pos)) % COLOR_WARPER_HUE_COUNT
        h1 = (h0 + 1) % COLOR_WARPER_HUE_COUNT
        hf = h_pos - math.floor(h_pos)
        ht = hf * hf * (3.0 - 2.0 * hf)

        s_scaled = sc * COLOR_WARPER_SAT_RINGS
        if s_scaled <= 1.0:
            r_lo = -1
            r_hi = 0
            rf = s_scaled
        elif s_scaled <= 2.0:
            r_lo = 0
            r_hi = 1
            rf = s_scaled - 1.0
        else:
            r_lo = 1
            r_hi = 2
            rf = min(1.0, s_scaled - 2.0)
        rt = rf * rf * (3.0 - 2.0 * rf)

        def _val(h_i: int, r_i: int) -> tuple[float, float]:
            if r_i < 0:
                return (0.0, 0.0)
            pt = self.points[r_i * COLOR_WARPER_HUE_COUNT + h_i]
            return (pt.hue_offset, pt.sat_offset)

        dh00, ds00 = _val(h0, r_lo)
        dh10, ds10 = _val(h1, r_lo)
        dh01, ds01 = _val(h0, r_hi)
        dh11, ds11 = _val(h1, r_hi)

        dh0 = dh00 + (dh10 - dh00) * ht
        dh1 = dh01 + (dh11 - dh01) * ht
        ds0 = ds00 + (ds10 - ds00) * ht
        ds1 = ds01 + (ds11 - ds01) * ht

        return (dh0 + (dh1 - dh0) * rt, ds0 + (ds1 - ds0) * rt)

    def apply_rgb(self, r: float, g: float, b: float) -> tuple[float, float, float]:
        """Apply 2D Hue-Saturation spider-grid warp to normalized [0, 1] RGB."""
        rc = _clamp_unit(r)
        gc = _clamp_unit(g)
        bc = _clamp_unit(b)
        if self.is_identity():
            return (rc, gc, bc)
        hue, sat, lum = rgb_to_hsl(rc, gc, bc)
        if sat <= 1e-4:
            return (rc, gc, bc)
        dh, ds = self.evaluate_shift(hue, sat)
        chroma_weight = _smoothstep(0.0, 0.06, sat)
        next_hue = (hue + dh * chroma_weight) % 360.0
        next_sat = _clamp_unit(sat + ds * chroma_weight)
        return hsl_to_rgb(next_hue, next_sat, lum)


class ColorWarperPreset(BaseModel):
    """Curated DaVinci Resolve Studio Color Warper spider-grid preset."""

    id: ColorWarperPresetId
    name: str
    description: str
    color_warper: ColorWarperParams


def _warper_from_sparse(
    *entries: tuple[int, int, float, float],
) -> ColorWarperParams:
    pts = [
        ColorWarperPoint(hue_idx=h, ring_idx=r, hue_offset=dh, sat_offset=ds)
        for h, r, dh, ds in entries
    ]
    return ColorWarperParams(points=pts)


COLOR_WARPER_PRESETS: tuple[ColorWarperPreset, ...] = (
    ColorWarperPreset(
        id="neutral",
        name="Neutral",
        description="Flat 6x3 Color Warper spider grid with zero hue or saturation displacement.",
        color_warper=ColorWarperParams(),
    ),
    ColorWarperPreset(
        id="kodak_warm_skin",
        name="Kodak Warm Skin",
        description="Pulls reds and yellows toward golden Kodak skin tones while enriching blues.",
        color_warper=_warper_from_sparse(
            (0, 0, 6.0, 0.05),
            (0, 1, 8.0, 0.08),
            (0, 2, 5.0, 0.06),
            (1, 0, -6.0, 0.04),
            (1, 1, -8.0, 0.06),
            (4, 1, -4.0, 0.12),
            (4, 2, -6.0, 0.16),
        ),
    ),
    ColorWarperPreset(
        id="teal_orange_warp",
        name="Teal & Orange",
        description="Warps greens/cyans toward cinema teal, warms skin axes, and tames magenta.",
        color_warper=_warper_from_sparse(
            (0, 1, 10.0, 0.14),
            (0, 2, 12.0, 0.18),
            (1, 1, -12.0, 0.12),
            (1, 2, -14.0, 0.14),
            (2, 1, 20.0, -0.14),
            (2, 2, 24.0, -0.22),
            (3, 1, 10.0, 0.18),
            (3, 2, 12.0, 0.24),
            (4, 1, -10.0, 0.12),
            (5, 1, 6.0, -0.24),
            (5, 2, 8.0, -0.30),
        ),
    ),
    ColorWarperPreset(
        id="emerald_cinema",
        name="Emerald Cinema",
        description="Shifts yellow-green foliage toward rich emerald while keeping skin balanced.",
        color_warper=_warper_from_sparse(
            (1, 1, 14.0, -0.06),
            (1, 2, 18.0, -0.10),
            (2, 1, 16.0, 0.16),
            (2, 2, 18.0, 0.22),
            (3, 1, -6.0, 0.08),
            (4, 2, 4.0, 0.10),
        ),
    ),
    ColorWarperPreset(
        id="pastel_editorial",
        name="Pastel Editorial",
        description="Pulls outer high-saturation rings inward for soft editorial film pastel.",
        color_warper=_warper_from_sparse(
            (0, 1, 4.0, -0.14),
            (0, 2, 6.0, -0.28),
            (1, 1, -4.0, -0.14),
            (1, 2, -6.0, -0.26),
            (2, 1, 4.0, -0.16),
            (2, 2, 6.0, -0.30),
            (3, 1, -4.0, -0.14),
            (3, 2, -6.0, -0.26),
            (4, 1, -4.0, -0.14),
            (4, 2, -6.0, -0.28),
            (5, 1, 4.0, -0.16),
            (5, 2, 6.0, -0.30),
        ),
    ),
    ColorWarperPreset(
        id="cyber_neon",
        name="Cyber Neon",
        description=(
            "Expands outer rings outward and swings blues/magentas toward electric cyan-violet."
        ),
        color_warper=_warper_from_sparse(
            (0, 1, -6.0, 0.18),
            (0, 2, -8.0, 0.28),
            (2, 1, 18.0, 0.12),
            (3, 1, 8.0, 0.26),
            (3, 2, 10.0, 0.36),
            (4, 1, -14.0, 0.24),
            (4, 2, -16.0, 0.34),
            (5, 1, -12.0, 0.26),
            (5, 2, -14.0, 0.38),
        ),
    ),
)


def list_color_warper_presets() -> tuple[ColorWarperPreset, ...]:
    """Return all built-in DaVinci Color Warper presets."""
    return COLOR_WARPER_PRESETS


def get_color_warper_preset(preset_id: str) -> ColorWarperPreset:
    """Resolve a built-in Color Warper preset by id."""
    for preset in COLOR_WARPER_PRESETS:
        if preset.id == preset_id:
            return preset
    raise ValueError(f"Unknown Color Warper preset {preset_id!r}")


def compile_color_warper_filter(warper: ColorWarperParams) -> str:
    """Compile ColorWarperParams into FFmpeg per-sector huesaturation filter stages."""
    if warper.is_identity():
        return ""
    ring_weights = (0.20, 0.35, 0.45)
    stages: list[str] = []
    for h_idx, vec in enumerate(HSL_HUE_VECTORS):
        dh = sum(
            warper.get_point(h_idx, r_idx).hue_offset * ring_weights[r_idx]
            for r_idx in range(COLOR_WARPER_SAT_RINGS)
        )
        ds = sum(
            warper.get_point(h_idx, r_idx).sat_offset * ring_weights[r_idx]
            for r_idx in range(COLOR_WARPER_SAT_RINGS)
        )
        if abs(dh) <= 1e-4 and abs(ds) <= 1e-4:
            continue
        flag = HSL_HUE_FFMPEG_FLAGS[vec]
        stages.append(
            f"huesaturation=colors={flag}:hue={dh:.2f}:saturation={ds:.4f}"
        )
    return ",".join(stages)


def bake_color_warper_to_cube(
    warper: ColorWarperParams,
    out_path: Path,
    size: int = 33,
    title: str = "taktcut_color_warper",
) -> CubeLutInfo:
    """Bake a ColorWarperParams 2D spider grid into a precision 3D .cube LUT."""
    node = ColorNodeParams(color_warper=warper)
    return bake_color_node_chain_to_cube([node], out_path, size=size, title=title)


class ColorNodeParams(BaseModel):
    """A single serial color grading node combining Wheels/Tone, Curves, Warper, Mask, and LUT."""

    id: str = "node-1"
    label: str = "Primary"
    enabled: bool = True
    grade: ColorGradeParams = Field(default_factory=ColorGradeParams)
    curves: ColorCurvesParams = Field(default_factory=ColorCurvesParams)
    hsl_curves: HslCurvesParams = Field(default_factory=HslCurvesParams)
    color_warper: ColorWarperParams = Field(default_factory=ColorWarperParams)
    power_window: PowerWindowParams = Field(default_factory=PowerWindowParams)
    qualifier: QualifierParams = Field(default_factory=QualifierParams)
    lut_title: str = ""
    lut_dimension: Literal["1D", "3D"] | None = None
    lut_size: int | None = None
    lut_mix: float = LUT_MIX_DEFAULT
    lut_domain_min: tuple[float, float, float] = (0.0, 0.0, 0.0)
    lut_domain_max: tuple[float, float, float] = (1.0, 1.0, 1.0)
    lut_table: list[tuple[float, float, float]] | None = None
    lut_path: str = ""

    @field_validator("id", mode="before")
    @classmethod
    def _validate_id(cls, raw: Any) -> str:
        text = str(raw or "").strip()
        if not text or not _NODE_ID_RE.match(text):
            raise ValueError(f"Invalid ColorNodeParams.id {raw!r}")
        return text

    @field_validator("label", mode="before")
    @classmethod
    def _validate_label(cls, raw: Any) -> str:
        text = str(raw or "").strip()
        if not text:
            return "Node"
        if len(text) > COLOR_NODE_LABEL_MAX_LEN:
            return text[:COLOR_NODE_LABEL_MAX_LEN]
        return text

    @field_validator("lut_title", "lut_path", mode="before")
    @classmethod
    def _validate_lut_text(cls, raw: Any) -> str:
        if raw is None:
            return ""
        text = str(raw).strip()
        return text[:256]

    @field_validator("lut_mix", mode="before")
    @classmethod
    def _validate_lut_mix(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "lut_mix", LUT_MIX_MIN, LUT_MIX_MAX)

    @field_validator("lut_size", mode="before")
    @classmethod
    def _validate_lut_size(cls, raw: Any) -> int | None:
        if raw is None:
            return None
        if isinstance(raw, bool) or not isinstance(raw, int):
            raise ValueError(f"lut_size must be an int or None, got {raw!r}")
        if raw < 2 or raw > 4096:
            raise ValueError(f"lut_size must be within [2, 4096], got {raw}")
        return raw

    @field_validator("lut_domain_min", "lut_domain_max", mode="before")
    @classmethod
    def _validate_domain(cls, raw: Any, info: Any) -> tuple[float, float, float]:
        if not isinstance(raw, (tuple, list)) or len(raw) != 3:
            raise ValueError(f"{info.field_name} must be a 3-float sequence")
        vals: list[float] = []
        for idx, item in enumerate(raw):
            if isinstance(item, bool) or not isinstance(item, (int, float)):
                raise ValueError(f"{info.field_name}[{idx}] must be a number")
            val = float(item)
            if not math.isfinite(val):
                raise ValueError(f"{info.field_name}[{idx}] must be finite")
            vals.append(val)
        return (vals[0], vals[1], vals[2])

    @field_validator("lut_table", mode="before")
    @classmethod
    def _validate_lut_table(cls, raw: Any) -> list[tuple[float, float, float]] | None:
        if raw is None:
            return None
        if not isinstance(raw, (tuple, list)):
            raise ValueError("lut_table must be a list of RGB triplets")
        out: list[tuple[float, float, float]] = []
        for idx, row in enumerate(raw):
            if not isinstance(row, (tuple, list)) or len(row) != 3:
                raise ValueError(f"lut_table[{idx}] must be an RGB triplet")
            r = float(row[0])
            g = float(row[1])
            b = float(row[2])
            if not (math.isfinite(r) and math.isfinite(g) and math.isfinite(b)):
                raise ValueError(f"Non-finite value in lut_table[{idx}]")
            out.append((r, g, b))
        return out

    @model_validator(mode="after")
    def _validate_lut_consistency(self) -> ColorNodeParams:
        for idx in range(3):
            if self.lut_domain_min[idx] >= self.lut_domain_max[idx]:
                raise ValueError("lut_domain_min must be strictly less than lut_domain_max")
        if self.lut_table is not None:
            if self.lut_dimension is None or self.lut_size is None:
                raise ValueError("lut_dimension and lut_size are required when lut_table is set")
            expected = self.lut_size**3 if self.lut_dimension == "3D" else self.lut_size
            if len(self.lut_table) != expected:
                raise ValueError(
                    f"lut_table length {len(self.lut_table)} does not match "
                    f"{self.lut_dimension} size {self.lut_size} ({expected})"
                )
        return self

    def has_lut(self) -> bool:
        """Return True when this node carries an imported .cube LUT or workspace LUT path."""
        return bool((self.lut_table is not None and self.lut_size is not None) or self.lut_path)

    def has_curves(self) -> bool:
        """Return True when this node has non-identity YRGB spline curves."""
        return not self.curves.is_identity()

    def has_hsl_curves(self) -> bool:
        """Return True when this node has non-identity 6-vector HSL curves."""
        return not self.hsl_curves.is_identity()

    def has_color_warper(self) -> bool:
        """Return True when this node has non-identity 2D Color Warper displacements."""
        return not self.color_warper.is_identity()

    def is_identity(self) -> bool:
        """Return True when disabled or all grade, curve, warper, and LUT settings are neutral."""
        if not self.enabled:
            return True
        if not self.grade.is_identity():
            return False
        if not self.curves.is_identity():
            return False
        if not self.hsl_curves.is_identity():
            return False
        if not self.color_warper.is_identity():
            return False
        return not (self.has_lut() and self.lut_mix > 1e-6)

    def apply_rgb(self, r: float, g: float, b: float) -> tuple[float, float, float]:
        """Apply this node's grade, curves, HSL curves, Color Warper, and .cube LUT to RGB."""
        in_rgb = (_clamp_unit(r), _clamp_unit(g), _clamp_unit(b))
        if not self.enabled:
            return in_rgb
        out_r, out_g, out_b = self.grade.apply_rgb(in_rgb[0], in_rgb[1], in_rgb[2])
        if not self.curves.is_identity():
            out_r, out_g, out_b = self.curves.apply_rgb(out_r, out_g, out_b)
        if not self.hsl_curves.is_identity():
            out_r, out_g, out_b = self.hsl_curves.apply_rgb(out_r, out_g, out_b)
        if not self.color_warper.is_identity():
            out_r, out_g, out_b = self.color_warper.apply_rgb(out_r, out_g, out_b)
        if (
            self.lut_table is not None
            and self.lut_size is not None
            and self.lut_dimension is not None
            and self.lut_mix > 1e-6
        ):
            out_r, out_g, out_b = apply_cube_lut_rgb(
                out_r,
                out_g,
                out_b,
                dimension=self.lut_dimension,
                size=self.lut_size,
                table=self.lut_table,
                domain_min=self.lut_domain_min,
                domain_max=self.lut_domain_max,
                mix=self.lut_mix,
            )
        return (out_r, out_g, out_b)

    def apply_rgb_at(
        self,
        r: float,
        g: float,
        b: float,
        u: float = 0.5,
        v: float = 0.5,
    ) -> tuple[float, float, float]:
        """Apply this node's grade, curves, and LUT blended by Power Window & HSL Qualifier."""
        in_rgb = (_clamp_unit(r), _clamp_unit(g), _clamp_unit(b))
        if not self.enabled:
            return in_rgb
        out_r, out_g, out_b = self.apply_rgb(in_rgb[0], in_rgb[1], in_rgb[2])
        has_pw = self.power_window.is_active()
        has_qual = self.qualifier.is_active()
        if not has_pw and not has_qual:
            return (out_r, out_g, out_b)
        mask = 1.0
        if has_pw:
            mask *= self.power_window.evaluate_mask(u, v)
        if has_qual:
            mask *= self.qualifier.evaluate_mask(in_rgb[0], in_rgb[1], in_rgb[2])
        return (
            _clamp_unit(in_rgb[0] + (out_r - in_rgb[0]) * mask),
            _clamp_unit(in_rgb[1] + (out_g - in_rgb[1]) * mask),
            _clamp_unit(in_rgb[2] + (out_b - in_rgb[2]) * mask),
        )


class ColorNodeChainCompileResult(BaseModel):
    """Compiled FFmpeg pipeline and metadata for a serial color node tree."""

    filtergraph: str
    ffmpeg_vf_args: list[str]
    is_identity: bool
    active_node_count: int
    total_node_count: int
    has_lut_nodes: bool
    has_power_windows: bool = False
    has_curves: bool = False
    has_hsl_curves: bool = False
    has_color_warper: bool = False
    has_qualifiers: bool = False


def _coerce_color_nodes(
    nodes: Sequence[ColorNodeParams | dict[str, Any]],
) -> list[ColorNodeParams]:
    if not nodes:
        raise ValueError("Color node tree must contain at least 1 node")
    if len(nodes) > MAX_COLOR_NODES:
        raise ValueError(f"Color node tree cannot exceed {MAX_COLOR_NODES} nodes")
    return [
        n if isinstance(n, ColorNodeParams) else ColorNodeParams.model_validate(n)
        for n in nodes
    ]


def compile_color_node_chain_filter(
    nodes: Sequence[ColorNodeParams | dict[str, Any]],
    *,
    pix_fmt: str | None = None,
) -> str:
    """Compile a serial node chain into FFmpeg colorbalance, eq, curves, and maskedmerge."""
    if pix_fmt is not None and pix_fmt not in ALLOWED_COLOR_PIX_FMTS:
        raise ValueError(f"Unsupported pixel format {pix_fmt!r}")
    validated = _coerce_color_nodes(nodes)
    parts: list[str] = []
    pw_idx = 0
    for node in validated:
        if not node.enabled:
            continue
        node_stages: list[str] = []
        if not node.grade.is_identity():
            node_stages.append(compile_color_grade_filter(node.grade, pix_fmt=None))
        if not node.curves.is_identity():
            curves_fg = compile_color_curves_filter(node.curves)
            if curves_fg:
                node_stages.append(curves_fg)
        if not node.hsl_curves.is_identity():
            hsl_fg = compile_hsl_curves_filter(node.hsl_curves)
            if hsl_fg:
                node_stages.append(hsl_fg)
        if not node.color_warper.is_identity():
            warper_fg = compile_color_warper_filter(node.color_warper)
            if warper_fg:
                node_stages.append(warper_fg)
        if not node_stages:
            continue
        node_fg = ",".join(node_stages)
        has_pw = node.power_window.is_active()
        has_qual = node.qualifier.is_active()
        if not has_pw and not has_qual:
            parts.append(node_fg)
            continue
        tag = f"pw{pw_idx}"
        pw_idx += 1
        if has_pw and not has_qual:
            mask_expr = compile_power_window_mask_expr(node.power_window)
            parts.append(
                f"split=3[{tag}b][{tag}g][{tag}m];"
                f"[{tag}b]format=gbrp[{tag}bg];"
                f"[{tag}g]{node_fg},format=gbrp[{tag}fg];"
                f"[{tag}m]format=gray,geq=lum='{mask_expr}',split=3[{tag}mr][{tag}mg][{tag}mb];"
                f"[{tag}mr][{tag}mg][{tag}mb]mergeplanes=0x001020:gbrp[{tag}msk];"
                f"[{tag}bg][{tag}fg][{tag}msk]maskedmerge"
            )
            continue
        qual_expr = compile_qualifier_mask_expr(node.qualifier)
        blur_part = (
            f",gblur=sigma={node.qualifier.blur_radius:.2f}"
            if node.qualifier.blur_radius > 1e-3
            else ""
        )
        if not has_pw:
            parts.append(
                f"split=3[{tag}b][{tag}g][{tag}m];"
                f"[{tag}b]format=gbrp[{tag}bg];"
                f"[{tag}g]{node_fg},format=gbrp[{tag}fg];"
                f"[{tag}m]format=gbrp,geq=r='{qual_expr}':g='0':b='0',extractplanes=r{blur_part},"
                f"split=3[{tag}mr][{tag}mg][{tag}mb];"
                f"[{tag}mr][{tag}mg][{tag}mb]mergeplanes=0x001020:gbrp[{tag}msk];"
                f"[{tag}bg][{tag}fg][{tag}msk]maskedmerge"
            )
        else:
            pw_expr = compile_power_window_mask_expr(node.power_window)
            parts.append(
                f"split=4[{tag}b][{tag}g][{tag}mq][{tag}mp];"
                f"[{tag}b]format=gbrp[{tag}bg];"
                f"[{tag}g]{node_fg},format=gbrp[{tag}fg];"
                f"[{tag}mq]format=gbrp,geq=r='{qual_expr}':g='0':b='0',"
                f"extractplanes=r{blur_part}[{tag}qm];"
                f"[{tag}mp]format=gray,geq=lum='{pw_expr}'[{tag}pm];"
                f"[{tag}qm][{tag}pm]blend=all_mode=multiply,split=3[{tag}mr][{tag}mg][{tag}mb];"
                f"[{tag}mr][{tag}mg][{tag}mb]mergeplanes=0x001020:gbrp[{tag}msk];"
                f"[{tag}bg][{tag}fg][{tag}msk]maskedmerge"
            )
    if not parts:
        parts.append(compile_color_grade_filter(ColorGradeParams(), pix_fmt=None))
    if pix_fmt is not None:
        parts.append(f"format={pix_fmt}")
    return ",".join(parts)


def compile_color_node_chain(
    nodes: Sequence[ColorNodeParams | dict[str, Any]],
    *,
    pix_fmt: str | None = None,
) -> ColorNodeChainCompileResult:
    """Compile a serial color node tree into structured FFmpeg filtergraph metadata."""
    validated = _coerce_color_nodes(nodes)
    fg = compile_color_node_chain_filter(validated, pix_fmt=pix_fmt)
    active_nodes = [n for n in validated if n.enabled and not n.is_identity()]
    has_lut_nodes = any(n.enabled and n.has_lut() and n.lut_mix > 1e-6 for n in validated)
    has_power_windows = any(n.enabled and n.power_window.is_active() for n in validated)
    has_curves = any(n.enabled and not n.curves.is_identity() for n in validated)
    has_hsl_curves = any(n.enabled and not n.hsl_curves.is_identity() for n in validated)
    has_color_warper = any(n.enabled and not n.color_warper.is_identity() for n in validated)
    has_qualifiers = any(n.enabled and n.qualifier.is_active() for n in validated)
    return ColorNodeChainCompileResult(
        filtergraph=fg,
        ffmpeg_vf_args=["-vf", fg],
        is_identity=len(active_nodes) == 0,
        active_node_count=len(active_nodes),
        total_node_count=len(validated),
        has_lut_nodes=has_lut_nodes,
        has_power_windows=has_power_windows,
        has_curves=has_curves,
        has_hsl_curves=has_hsl_curves,
        has_color_warper=has_color_warper,
        has_qualifiers=has_qualifiers,
    )


def bake_color_node_chain_to_cube(
    nodes: Sequence[ColorNodeParams | dict[str, Any]],
    out_path: Path,
    size: int = 33,
    title: str = "taktcut_node_tree",
) -> CubeLutInfo:
    """Bake an entire serial color node tree (grades + LUTs) into a composite 3D .cube LUT."""
    if size < 2 or size > 65:
        raise ValueError("3D LUT size must be between 2 and 65")
    validated = _coerce_color_nodes(nodes)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    lines: list[str] = [
        f'TITLE "{title}"',
        f"LUT_3D_SIZE {size}",
        "DOMAIN_MIN 0.0 0.0 0.0",
        "DOMAIN_MAX 1.0 1.0 1.0",
        "",
    ]

    denom = float(size - 1)
    for b_idx in range(size):
        b_in = b_idx / denom
        for g_idx in range(size):
            g_in = g_idx / denom
            for r_idx in range(size):
                r_cur, g_cur, b_cur = r_idx / denom, g_in, b_in
                for node in validated:
                    if node.enabled and node.qualifier.is_active():
                        out_r, out_g, out_b = node.apply_rgb(r_cur, g_cur, b_cur)
                        q_mask = node.qualifier.evaluate_mask(r_cur, g_cur, b_cur)
                        r_cur = _clamp_unit(r_cur + (out_r - r_cur) * q_mask)
                        g_cur = _clamp_unit(g_cur + (out_g - g_cur) * q_mask)
                        b_cur = _clamp_unit(b_cur + (out_b - b_cur) * q_mask)
                    else:
                        r_cur, g_cur, b_cur = node.apply_rgb(r_cur, g_cur, b_cur)
                lines.append(f"{r_cur:.6f} {g_cur:.6f} {b_cur:.6f}")

    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return parse_cube_lut(out_path)


# ---------------------------------------------------------------------------
# Studio 3D .cube LUT Library & Look Browser
# ---------------------------------------------------------------------------


class StudioLutPreset(BaseModel):
    """Metadata and preview swatches for a built-in DaVinci-style 3D .cube LUT."""

    id: StudioLutPresetId
    title: str
    category: StudioLutCategory
    description: str
    default_size: int = 17
    swatches: list[str] = Field(default_factory=list)


_STUDIO_LUT_METADATA: tuple[tuple[StudioLutPresetId, str, StudioLutCategory, str], ...] = (
    (
        "kodak_2383_d65",
        "Kodak 2383 Print D65",
        "film_print",
        "Classic cinema print film contrast with rich blacks and warm highlight roll-off.",
    ),
    (
        "fuji_3513_print",
        "Fujifilm 3513D Print",
        "film_print",
        "Crisp emerald foliage, cool shadow separation, and balanced skin rendition.",
    ),
    (
        "rec709_slog3_conv",
        "Sony S-Log3 -> Rec.709",
        "camera_log",
        "Log-to-Rec.709 technical S-curve expansion with gamut saturation recovery.",
    ),
    (
        "rec709_logc_conv",
        "ARRI LogC3 -> Rec.709",
        "camera_log",
        "Smooth photographic highlight roll-off and neutral Rec.709 tonal mapping.",
    ),
    (
        "teal_orange_cinema",
        "Blockbuster Teal & Orange",
        "creative_cinema",
        "Split-toned cyan-teal shadows paired with warm amber skin and highlights.",
    ),
    (
        "bleach_bypass",
        "Silver Bleach Bypass",
        "creative_cinema",
        "High-contrast silver-retained look with sculpted midtones and muted chroma.",
    ),
    (
        "golden_hour_warm",
        "Golden Hour Amber",
        "creative_cinema",
        "Lifted warm midtones, sunset highlight glow, and gentle shadow softness.",
    ),
    (
        "silver_gelatin_bw",
        "Ilford Silver B&W",
        "monochrome",
        "Red-filtered panchromatic black-and-white curve with deep silver contrast.",
    ),
)

_SWATCH_PROBES: tuple[tuple[float, float, float], ...] = (
    (0.18, 0.24, 0.34),  # Shadow cool
    (0.76, 0.58, 0.48),  # Light skin
    (0.38, 0.54, 0.72),  # Sky blue
    (0.34, 0.48, 0.26),  # Foliage
    (0.84, 0.50, 0.18),  # Warm amber
    (0.90, 0.90, 0.88),  # Highlight white
)


def _rgb_to_hex(r: float, g: float, b: float) -> str:
    ri = max(0, min(255, round(_clamp_unit(r) * 255.0)))
    gi = max(0, min(255, round(_clamp_unit(g) * 255.0)))
    bi = max(0, min(255, round(_clamp_unit(b) * 255.0)))
    return f"#{ri:02x}{gi:02x}{bi:02x}"


def _scurve(x: float, strength: float) -> float:
    x_c = _clamp_unit(x)
    s_c = x_c * x_c * (3.0 - 2.0 * x_c)
    return _clamp_unit(x_c + (s_c - x_c) * strength)


def evaluate_studio_lut_rgb(
    preset_id: str,
    r: float,
    g: float,
    b: float,
) -> tuple[float, float, float]:
    """Evaluate a built-in studio 3D LUT transform at normalized RGB in [0.0, 1.0]."""
    if preset_id not in STUDIO_LUT_PRESET_IDS:
        raise ValueError(f"Unknown studio LUT preset {preset_id!r}")
    ri, gi, bi = _clamp_unit(r), _clamp_unit(g), _clamp_unit(b)
    luma = 0.2126 * ri + 0.7152 * gi + 0.0722 * bi

    if preset_id == "kodak_2383_d65":
        rc = _scurve(ri, 0.52) * 1.02
        gc = _scurve(gi, 0.50) * 0.99
        bc = _scurve(bi, 0.54) * 0.95
        warm_hi = max(0.0, luma - 0.5) * 0.10
        cool_sh = max(0.0, 0.38 - luma) * 0.08
        return (
            _clamp_unit(rc + warm_hi - cool_sh * 0.4),
            _clamp_unit(gc + warm_hi * 0.3),
            _clamp_unit(bc - warm_hi * 0.6 + cool_sh),
        )

    if preset_id == "fuji_3513_print":
        rc = _scurve(ri, 0.42) * 0.97
        gc = _scurve(gi, 0.46) * 1.03
        bc = _scurve(bi, 0.44) * 1.01
        sh_teal = max(0.0, 0.42 - luma) * 0.10
        return (
            _clamp_unit(rc - sh_teal * 0.6 + 0.015),
            _clamp_unit(gc + sh_teal * 0.35),
            _clamp_unit(bc + sh_teal * 0.55),
        )

    if preset_id == "rec709_slog3_conv":
        def _expand_log(v: float) -> float:
            pivot = 0.42
            scaled = (v - pivot) * 1.62 + 0.48
            return _scurve(scaled, 0.48)

        rl, gl, bl = _expand_log(ri), _expand_log(gi), _expand_log(bi)
        lm = 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
        sat_boost = 1.28
        return (
            _clamp_unit(lm + (rl - lm) * sat_boost),
            _clamp_unit(lm + (gl - lm) * sat_boost),
            _clamp_unit(lm + (bl - lm) * sat_boost),
        )

    if preset_id == "rec709_logc_conv":
        def _expand_logc(v: float) -> float:
            scaled = (v - 0.39) * 1.54 + 0.47
            c = _scurve(scaled, 0.38)
            if c > 0.78:
                c = 0.78 + (c - 0.78) * 0.72
            return _clamp_unit(c)

        rl, gl, bl = _expand_logc(ri), _expand_logc(gi), _expand_logc(bi)
        lm = 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
        sat_boost = 1.22
        return (
            _clamp_unit(lm + (rl - lm) * sat_boost),
            _clamp_unit(lm + (gl - lm) * sat_boost),
            _clamp_unit(lm + (bl - lm) * sat_boost),
        )

    if preset_id == "teal_orange_cinema":
        sh = max(0.0, 0.48 - luma) / 0.48
        hi = max(0.0, luma - 0.42) / 0.58
        rc = _scurve(ri, 0.35) - 0.11 * sh + 0.12 * hi
        gc = _scurve(gi, 0.35) + 0.04 * sh + 0.02 * hi
        bc = _scurve(bi, 0.35) + 0.14 * sh - 0.13 * hi
        return (_clamp_unit(rc), _clamp_unit(gc), _clamp_unit(bc))

    if preset_id == "bleach_bypass":
        sl = _scurve(luma, 0.75)
        rc = _scurve(ri, 0.60) * 0.46 + sl * 0.54
        gc = _scurve(gi, 0.60) * 0.46 + sl * 0.54
        bc = _scurve(bi, 0.60) * 0.46 + sl * 0.54
        return (_clamp_unit(rc), _clamp_unit(gc), _clamp_unit(bc))

    if preset_id == "golden_hour_warm":
        rc = _scurve(ri * 1.06 + 0.03, 0.25)
        gc = _scurve(gi * 1.00 + 0.015, 0.25)
        bc = _scurve(bi * 0.86 + 0.01, 0.25)
        return (_clamp_unit(rc), _clamp_unit(gc), _clamp_unit(bc))

    mono = _scurve(0.36 * ri + 0.52 * gi + 0.12 * bi, 0.62)
    return (mono, mono, mono)


def generate_studio_lut_table(
    preset_id: str,
    size: int = 17,
) -> tuple[CubeLutInfo, list[tuple[float, float, float]]]:
    """Generate a valid 3D .cube LUT info and RGB table for a built-in studio LUT preset."""
    if preset_id not in STUDIO_LUT_PRESET_IDS:
        raise ValueError(f"Unknown studio LUT preset {preset_id!r}")
    if size < 2 or size > 65:
        raise ValueError(f"LUT size must be between 2 and 65, got {size}")
    title = next(item[1] for item in _STUDIO_LUT_METADATA if item[0] == preset_id)
    denom = float(size - 1)
    table: list[tuple[float, float, float]] = []
    for b_idx in range(size):
        b_in = b_idx / denom
        for g_idx in range(size):
            g_in = g_idx / denom
            for r_idx in range(size):
                table.append(evaluate_studio_lut_rgb(preset_id, r_idx / denom, g_in, b_in))
    info = CubeLutInfo(
        path=f"{preset_id}.cube",
        title=title,
        dimension="3D",
        size=size,
        domain_min=(0.0, 0.0, 0.0),
        domain_max=(1.0, 1.0, 1.0),
        entry_count=len(table),
    )
    return info, table


def format_cube_lut_text(
    info: CubeLutInfo,
    table: Sequence[tuple[float, float, float]],
) -> str:
    """Serialize a CubeLutInfo + table into standard Adobe .cube text format."""
    lines: list[str] = [
        f'TITLE "{info.title}"',
        f"LUT_3D_SIZE {info.size}" if info.dimension == "3D" else f"LUT_1D_SIZE {info.size}",
        f"DOMAIN_MIN {info.domain_min[0]:.4f} {info.domain_min[1]:.4f} {info.domain_min[2]:.4f}",
        f"DOMAIN_MAX {info.domain_max[0]:.4f} {info.domain_max[1]:.4f} {info.domain_max[2]:.4f}",
        "",
    ]
    for r, g, b in table:
        lines.append(f"{r:.6f} {g:.6f} {b:.6f}")
    return "\n".join(lines) + "\n"


def get_studio_lut_preset(preset_id: str) -> StudioLutPreset:
    """Return metadata and computed preview swatches for a studio LUT preset."""
    for pid, title, category, desc in _STUDIO_LUT_METADATA:
        if pid == preset_id:
            swatches = [
                _rgb_to_hex(*evaluate_studio_lut_rgb(pid, pr, pg, pb))
                for pr, pg, pb in _SWATCH_PROBES
            ]
            return StudioLutPreset(
                id=pid,
                title=title,
                category=category,
                description=desc,
                default_size=17,
                swatches=swatches,
            )
    raise ValueError(f"Unknown studio LUT preset {preset_id!r}")


def list_studio_lut_presets() -> list[StudioLutPreset]:
    """List all built-in DaVinci-style 3D LUT presets with preview swatches."""
    return [get_studio_lut_preset(pid) for pid, _, _, _ in _STUDIO_LUT_METADATA]


# ---------------------------------------------------------------------------
# X-Rite ColorChecker 24 & Histogram-Moment Shot-Match Auto-Balance
# ---------------------------------------------------------------------------


COLORCHECKER_24_PATCHES: tuple[tuple[str, tuple[float, float, float]], ...] = (
    ("Dark Skin", (0.451, 0.322, 0.267)),
    ("Light Skin", (0.761, 0.588, 0.510)),
    ("Blue Sky", (0.384, 0.478, 0.616)),
    ("Foliage", (0.341, 0.424, 0.263)),
    ("Blue Flower", (0.522, 0.502, 0.694)),
    ("Bluish Green", (0.404, 0.741, 0.667)),
    ("Orange", (0.839, 0.494, 0.173)),
    ("Purplish Blue", (0.314, 0.357, 0.651)),
    ("Moderate Red", (0.757, 0.353, 0.388)),
    ("Purple", (0.369, 0.235, 0.424)),
    ("Yellow Green", (0.616, 0.737, 0.251)),
    ("Orange Yellow", (0.878, 0.639, 0.180)),
    ("Blue", (0.220, 0.239, 0.588)),
    ("Green", (0.275, 0.580, 0.286)),
    ("Red", (0.686, 0.212, 0.235)),
    ("Yellow", (0.906, 0.780, 0.122)),
    ("Magenta", (0.733, 0.337, 0.584)),
    ("Cyan", (0.031, 0.522, 0.631)),
    ("White", (0.953, 0.953, 0.949)),
    ("Neutral 8", (0.784, 0.784, 0.784)),
    ("Neutral 6.5", (0.627, 0.627, 0.627)),
    ("Neutral 5", (0.478, 0.478, 0.478)),
    ("Neutral 3.5", (0.333, 0.333, 0.337)),
    ("Black", (0.204, 0.204, 0.208)),
)

_SMPTE_MATCH_PATCHES: tuple[tuple[str, tuple[float, float, float]], ...] = (
    ("75% Gray", (0.75, 0.75, 0.75)),
    ("Yellow Bar", (0.75, 0.75, 0.05)),
    ("Cyan Bar", (0.05, 0.75, 0.75)),
    ("Green Bar", (0.05, 0.75, 0.05)),
    ("Magenta Bar", (0.75, 0.05, 0.75)),
    ("Red Bar", (0.75, 0.05, 0.05)),
    ("Blue Bar", (0.05, 0.05, 0.75)),
    ("Light Skin", (0.761, 0.588, 0.510)),
    ("Dark Skin", (0.451, 0.322, 0.267)),
    ("Sky Blue", (0.384, 0.478, 0.616)),
    ("Foliage", (0.341, 0.424, 0.263)),
    ("White 95%", (0.95, 0.95, 0.95)),
    ("Mid Gray 50%", (0.50, 0.50, 0.50)),
    ("Black 10%", (0.10, 0.10, 0.10)),
)


def _srgb_to_linear(c: float) -> float:
    c_clamped = _clamp_unit(c)
    if c_clamped <= 0.04045:
        return c_clamped / 12.92
    return float(math.pow((c_clamped + 0.055) / 1.055, 2.4))


def rgb_to_lab(r: float, g: float, b: float) -> tuple[float, float, float]:
    """Convert Rec.709 / sRGB [0..1] RGB triplet to CIE L*a*b* (D65 reference white)."""
    rl = _srgb_to_linear(r)
    gl = _srgb_to_linear(g)
    bl = _srgb_to_linear(b)

    x = (0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl) / 0.95047
    y = 0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl
    z = (0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl) / 1.08883

    def _f(t: float) -> float:
        if t > 0.008856:
            return float(math.pow(t, 1.0 / 3.0))
        return (7.787 * t) + (16.0 / 116.0)

    fx, fy, fz = _f(x), _f(y), _f(z)
    l_star = 116.0 * fy - 16.0
    a_star = 500.0 * (fx - fy)
    b_star = 200.0 * (fy - fz)
    return (l_star, a_star, b_star)


def delta_e_cie76(
    rgb_a: tuple[float, float, float],
    rgb_b: tuple[float, float, float],
) -> float:
    """Compute perceptual CIE76 Delta-E distance between two sRGB [0..1] colors."""
    la, aa, ba = rgb_to_lab(rgb_a[0], rgb_a[1], rgb_a[2])
    lb, ab, bb = rgb_to_lab(rgb_b[0], rgb_b[1], rgb_b[2])
    return math.sqrt((la - lb) ** 2 + (aa - ab) ** 2 + (ba - bb) ** 2)


class ShotMatchMoments(BaseModel):
    """Per-channel RGB histogram moments (mean and std dev) for shot matching."""

    mean_rgb: tuple[float, float, float]
    std_rgb: tuple[float, float, float]
    luma_mean: float
    luma_std: float


class ShotMatchPatchComparison(BaseModel):
    """Per-patch source, target, and matched RGB comparison with Delta-E metrics."""

    name: str
    source_rgb: tuple[float, float, float]
    target_rgb: tuple[float, float, float]
    matched_rgb: tuple[float, float, float]
    delta_e_before: float
    delta_e_after: float


class ShotMatchResult(BaseModel):
    """Result of histogram-moment & ColorChecker auto-balance shot matching."""

    grade: ColorGradeParams
    delta_e_before: float
    delta_e_after: float
    improvement_pct: float
    strength: float
    chart_profile: ColorChartProfileId
    source_profile: ShotMatchSourceProfileId
    target_profile: ShotMatchTargetProfileId
    patch_count: int
    patches: list[ShotMatchPatchComparison]
    source_moments: ShotMatchMoments
    target_moments: ShotMatchMoments
    matched_moments: ShotMatchMoments
    ffmpeg_filter: str


def compute_rgb_moments(samples: Sequence[tuple[float, float, float]]) -> ShotMatchMoments:
    """Compute per-channel RGB mean, std dev, and Rec.709 luma moments."""
    if not samples:
        raise ValueError("At least one RGB sample is required to compute moments")
    n = float(len(samples))
    mr = sum(_clamp_unit(s[0]) for s in samples) / n
    mg = sum(_clamp_unit(s[1]) for s in samples) / n
    mb = sum(_clamp_unit(s[2]) for s in samples) / n
    lumas = [
        0.2126 * _clamp_unit(s[0]) + 0.7152 * _clamp_unit(s[1]) + 0.0722 * _clamp_unit(s[2])
        for s in samples
    ]
    ml = sum(lumas) / n
    vr = sum((_clamp_unit(s[0]) - mr) ** 2 for s in samples) / n
    vg = sum((_clamp_unit(s[1]) - mg) ** 2 for s in samples) / n
    vb = sum((_clamp_unit(s[2]) - mb) ** 2 for s in samples) / n
    vl = sum((lv - ml) ** 2 for lv in lumas) / n
    return ShotMatchMoments(
        mean_rgb=(round(mr, 4), round(mg, 4), round(mb, 4)),
        std_rgb=(round(math.sqrt(vr), 4), round(math.sqrt(vg), 4), round(math.sqrt(vb), 4)),
        luma_mean=round(ml, 4),
        luma_std=round(math.sqrt(vl), 4),
    )


def _apply_source_simulation(
    rgb: tuple[float, float, float],
    source_profile: ShotMatchSourceProfileId,
) -> tuple[float, float, float]:
    """Transform canonical chart RGB into simulated camera/cast source RGB."""
    r, g, b = rgb
    if source_profile == "current_chart":
        return (r, g, b)
    if source_profile == "sony_slog3":
        return (
            _clamp_unit(0.24 + r * 0.46),
            _clamp_unit(0.25 + g * 0.47),
            _clamp_unit(0.24 + b * 0.45),
        )
    if source_profile == "arri_logc3":
        return (
            _clamp_unit(0.21 + r * 0.52),
            _clamp_unit(0.22 + g * 0.52),
            _clamp_unit(0.21 + b * 0.51),
        )
    if source_profile == "canon_clog2":
        return (
            _clamp_unit(0.22 + r * 0.50 + 0.015),
            _clamp_unit(0.21 + g * 0.49),
            _clamp_unit(0.20 + b * 0.48),
        )
    if source_profile == "underexposed_cool":
        return (
            _clamp_unit(r * 0.72 - 0.03),
            _clamp_unit(g * 0.78),
            _clamp_unit(b * 0.90 + 0.05),
        )
    return (
        _clamp_unit(r * 0.98 + 0.08),
        _clamp_unit(g * 0.90 + 0.02),
        _clamp_unit(b * 0.72 - 0.04),
    )


def _get_chart_base_patches(
    chart_profile: ColorChartProfileId,
) -> tuple[tuple[str, tuple[float, float, float]], ...]:
    if chart_profile == "rec709_smpte":
        return _SMPTE_MATCH_PATCHES
    if chart_profile == "datacolor_spyder_24":
        return tuple(
            (
                name,
                (
                    _clamp_unit(rgb[0] * 0.99 + 0.005),
                    _clamp_unit(rgb[1] * 1.00),
                    _clamp_unit(rgb[2] * 0.99 + 0.004),
                ),
            )
            for name, rgb in COLORCHECKER_24_PATCHES
        )
    return COLORCHECKER_24_PATCHES


def _apply_target_profile_rgb(
    rgb: tuple[float, float, float],
    target_profile: ShotMatchTargetProfileId,
) -> tuple[float, float, float]:
    r, g, b = rgb
    if target_profile in ("rec709_d65", "custom_reference"):
        return (r, g, b)
    if target_profile == "teal_orange_ref":
        return get_color_preset("teal_orange").params.apply_rgb(r, g, b)
    if target_profile == "film_warm_ref":
        return get_color_preset("film_warm").params.apply_rgb(r, g, b)
    return evaluate_studio_lut_rgb("kodak_2383_d65", r, g, b)


def _normalize_sample_triplets(
    raw_samples: Sequence[Sequence[float]],
    field_name: str,
) -> list[tuple[float, float, float]]:
    out: list[tuple[float, float, float]] = []
    for idx, item in enumerate(raw_samples):
        if len(item) != 3:
            raise ValueError(f"{field_name}[{idx}] must have 3 RGB components")
        r = _validate_bounded_float(item[0], f"{field_name}[{idx}][0]", 0.0, 1.0)
        g = _validate_bounded_float(item[1], f"{field_name}[{idx}][1]", 0.0, 1.0)
        b = _validate_bounded_float(item[2], f"{field_name}[{idx}][2]", 0.0, 1.0)
        out.append((r, g, b))
    return out


def _clamp_grade_component(value: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(max_val, value))


def solve_shot_match(
    *,
    chart_profile: ColorChartProfileId = "xrite_classic_24",
    source_profile: ShotMatchSourceProfileId = "current_chart",
    target_profile: ShotMatchTargetProfileId = "rec709_d65",
    strength: float = 1.0,
    source_samples: Sequence[Sequence[float]] | None = None,
    target_samples: Sequence[Sequence[float]] | None = None,
) -> ShotMatchResult:
    """Solve ColorGradeParams matching source chart/histogram moments to target reference."""
    if chart_profile not in COLOR_CHART_PROFILES:
        raise ValueError(f"Unsupported chart_profile {chart_profile!r}")
    if source_profile not in SHOT_MATCH_SOURCE_PROFILES:
        raise ValueError(f"Unsupported source_profile {source_profile!r}")
    if target_profile not in SHOT_MATCH_TARGET_PROFILES:
        raise ValueError(f"Unsupported target_profile {target_profile!r}")
    blend = _validate_bounded_float(strength, "strength", 0.0, 1.0)

    base_patches = _get_chart_base_patches(chart_profile)
    patch_names = [p[0] for p in base_patches]

    if source_samples is not None and len(source_samples) > 0:
        src_list = _normalize_sample_triplets(source_samples, "source_samples")
    else:
        src_list = [_apply_source_simulation(p[1], source_profile) for p in base_patches]

    if target_samples is not None and len(target_samples) > 0:
        tgt_list = _normalize_sample_triplets(target_samples, "target_samples")
    else:
        tgt_list = [_apply_target_profile_rgb(p[1], target_profile) for p in base_patches]

    pair_count = min(len(src_list), len(tgt_list))
    if pair_count == 0:
        raise ValueError("Shot-match requires at least 1 valid source/target sample")
    src_aligned = src_list[:pair_count]
    tgt_aligned = tgt_list[:pair_count]
    names_aligned = [
        patch_names[i] if i < len(patch_names) else f"Zone {i + 1}"
        for i in range(pair_count)
    ]

    src_moments = compute_rgb_moments(src_aligned)
    tgt_moments = compute_rgb_moments(tgt_aligned)

    luma_ratio = tgt_moments.luma_std / max(0.03, src_moments.luma_std)
    contrast_est = _clamp_grade_component(luma_ratio, 0.45, 1.85)

    def _mean_chroma(samples: Sequence[tuple[float, float, float]]) -> float:
        return sum(max(s) - min(s) for s in samples) / float(len(samples))

    src_chroma = _mean_chroma(src_aligned)
    tgt_chroma = _mean_chroma(tgt_aligned)
    sat_ratio = (tgt_chroma / max(0.03, src_chroma)) / max(0.55, contrast_est * 0.88)
    saturation_est = _clamp_grade_component(sat_ratio, 0.25, 2.0)

    src_rb_bias = src_moments.mean_rgb[0] - src_moments.mean_rgb[2]
    tgt_rb_bias = tgt_moments.mean_rgb[0] - tgt_moments.mean_rgb[2]
    temp_est = _clamp_grade_component((tgt_rb_bias - src_rb_bias) * 1.15, -0.75, 0.75)

    lift = [0.0, 0.0, 0.0]
    gamma = [0.0, 0.0, 0.0]
    gain = [0.0, 0.0, 0.0]

    order = sorted(
        range(pair_count),
        key=lambda idx: 0.2126 * src_aligned[idx][0]
        + 0.7152 * src_aligned[idx][1]
        + 0.0722 * src_aligned[idx][2],
    )
    band = max(1, pair_count // 3)
    sh_indices = order[:band]
    hi_indices = order[-band:]
    mid_indices = order[band : pair_count - band] if pair_count >= 3 else order

    for _pass in range(4):
        probe_grade = ColorGradeParams(
            lift=(lift[0], lift[1], lift[2]),
            gamma=(gamma[0], gamma[1], gamma[2]),
            gain=(gain[0], gain[1], gain[2]),
            contrast=contrast_est,
            saturation=saturation_est,
            temperature=temp_est,
        )
        cur_out = [probe_grade.apply_rgb(s[0], s[1], s[2]) for s in src_aligned]
        for ch in range(3):
            sh_err = sum(tgt_aligned[i][ch] - cur_out[i][ch] for i in sh_indices) / len(sh_indices)
            mid_err = sum(tgt_aligned[i][ch] - cur_out[i][ch] for i in mid_indices) / len(
                mid_indices
            )
            hi_err = sum(tgt_aligned[i][ch] - cur_out[i][ch] for i in hi_indices) / len(hi_indices)
            lift[ch] = _clamp_grade_component(lift[ch] + sh_err * 0.85, -0.75, 0.75)
            gamma[ch] = _clamp_grade_component(gamma[ch] + mid_err * 0.90, -0.75, 0.75)
            gain[ch] = _clamp_grade_component(gain[ch] + hi_err * 0.90, -0.75, 0.75)

    final_grade = ColorGradeParams(
        lift=(
            round(lift[0] * blend, 4),
            round(lift[1] * blend, 4),
            round(lift[2] * blend, 4),
        ),
        gamma=(
            round(gamma[0] * blend, 4),
            round(gamma[1] * blend, 4),
            round(gamma[2] * blend, 4),
        ),
        gain=(
            round(gain[0] * blend, 4),
            round(gain[1] * blend, 4),
            round(gain[2] * blend, 4),
        ),
        contrast=round(1.0 + (contrast_est - 1.0) * blend, 4),
        saturation=round(1.0 + (saturation_est - 1.0) * blend, 4),
        temperature=round(temp_est * blend, 4),
    )

    matched_list: list[tuple[float, float, float]] = []
    comparisons: list[ShotMatchPatchComparison] = []
    de_before_sum = 0.0
    de_after_sum = 0.0

    for idx in range(pair_count):
        s_rgb = src_aligned[idx]
        t_rgb = tgt_aligned[idx]
        m_rgb = final_grade.apply_rgb(s_rgb[0], s_rgb[1], s_rgb[2])
        matched_list.append(m_rgb)
        de_b = delta_e_cie76(s_rgb, t_rgb)
        de_a = delta_e_cie76(m_rgb, t_rgb)
        de_before_sum += de_b
        de_after_sum += de_a
        comparisons.append(
            ShotMatchPatchComparison(
                name=names_aligned[idx],
                source_rgb=(round(s_rgb[0], 4), round(s_rgb[1], 4), round(s_rgb[2], 4)),
                target_rgb=(round(t_rgb[0], 4), round(t_rgb[1], 4), round(t_rgb[2], 4)),
                matched_rgb=(round(m_rgb[0], 4), round(m_rgb[1], 4), round(m_rgb[2], 4)),
                delta_e_before=round(de_b, 2),
                delta_e_after=round(de_a, 2),
            )
        )

    avg_before = de_before_sum / pair_count
    avg_after = de_after_sum / pair_count
    improvement = (
        ((avg_before - avg_after) / avg_before) * 100.0 if avg_before > 1e-4 else 0.0
    )

    return ShotMatchResult(
        grade=final_grade,
        delta_e_before=round(avg_before, 2),
        delta_e_after=round(avg_after, 2),
        improvement_pct=round(improvement, 1),
        strength=round(blend, 4),
        chart_profile=chart_profile,
        source_profile=source_profile,
        target_profile=target_profile,
        patch_count=pair_count,
        patches=comparisons,
        source_moments=src_moments,
        target_moments=tgt_moments,
        matched_moments=compute_rgb_moments(matched_list),
        ffmpeg_filter=compile_color_grade_filter(final_grade, pix_fmt=None),
    )


def list_shot_match_profiles() -> dict[str, list[dict[str, str]]]:
    """Return supported chart, source camera, and target reference profiles."""
    return {
        "charts": [
            {"id": "xrite_classic_24", "label": "X-Rite ColorChecker 24"},
            {"id": "datacolor_spyder_24", "label": "SpyderCheckr 24"},
            {"id": "rec709_smpte", "label": "Rec.709 SMPTE Chart"},
        ],
        "sources": [
            {"id": "current_chart", "label": "Current Node Chart"},
            {"id": "sony_slog3", "label": "Sony S-Log3 (Flat)"},
            {"id": "arri_logc3", "label": "ARRI LogC3 (Flat)"},
            {"id": "canon_clog2", "label": "Canon C-Log2"},
            {"id": "underexposed_cool", "label": "Underexposed Cool"},
            {"id": "warm_tungsten", "label": "Warm Tungsten Cast"},
        ],
        "targets": [
            {"id": "rec709_d65", "label": "Rec.709 D65 Standard"},
            {"id": "teal_orange_ref", "label": "Teal & Orange Look"},
            {"id": "film_warm_ref", "label": "Film Warm Look"},
            {"id": "kodak_print_ref", "label": "Kodak 2383 Print"},
            {"id": "custom_reference", "label": "Reference Still / Frame"},
        ],
    }
