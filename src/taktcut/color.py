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


class ColorNodeParams(BaseModel):
    """A single serial color grading node combining Wheels/Tone, Curves, Power Window, and LUT."""

    id: str = "node-1"
    label: str = "Primary"
    enabled: bool = True
    grade: ColorGradeParams = Field(default_factory=ColorGradeParams)
    curves: ColorCurvesParams = Field(default_factory=ColorCurvesParams)
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

    def is_identity(self) -> bool:
        """Return True when disabled or grade, curves, and LUT mix are neutral."""
        if not self.enabled:
            return True
        if not self.grade.is_identity():
            return False
        if not self.curves.is_identity():
            return False
        return not (self.has_lut() and self.lut_mix > 1e-6)

    def apply_rgb(self, r: float, g: float, b: float) -> tuple[float, float, float]:
        """Apply this node's grade, YRGB curves, and optional .cube LUT to [0, 1] RGB."""
        in_rgb = (_clamp_unit(r), _clamp_unit(g), _clamp_unit(b))
        if not self.enabled:
            return in_rgb
        out_r, out_g, out_b = self.grade.apply_rgb(in_rgb[0], in_rgb[1], in_rgb[2])
        if not self.curves.is_identity():
            out_r, out_g, out_b = self.curves.apply_rgb(out_r, out_g, out_b)
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
