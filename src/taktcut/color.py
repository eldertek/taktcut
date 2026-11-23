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

ALLOWED_COLOR_PIX_FMTS: frozenset[str] = frozenset(
    {"yuv420p", "yuv422p10le", "rgb24", "yuv444p"}
)

ColorPresetId = Literal["rec709_clean", "teal_orange", "film_warm", "noir_bw"]


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


class ColorNodeParams(BaseModel):
    """A single serial color grading node combining Lift/Gamma/Gain/Tone and optional .cube LUT."""

    id: str = "node-1"
    label: str = "Primary"
    enabled: bool = True
    grade: ColorGradeParams = Field(default_factory=ColorGradeParams)
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

    def is_identity(self) -> bool:
        """Return True when disabled or both primary grade and LUT mix are neutral."""
        if not self.enabled:
            return True
        if not self.grade.is_identity():
            return False
        return not (self.has_lut() and self.lut_mix > 1e-6)

    def apply_rgb(self, r: float, g: float, b: float) -> tuple[float, float, float]:
        """Apply this node's grade and optional .cube LUT to an RGB triplet in [0, 1]."""
        in_rgb = (_clamp_unit(r), _clamp_unit(g), _clamp_unit(b))
        if not self.enabled:
            return in_rgb
        out_r, out_g, out_b = self.grade.apply_rgb(in_rgb[0], in_rgb[1], in_rgb[2])
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


class ColorNodeChainCompileResult(BaseModel):
    """Compiled FFmpeg pipeline and metadata for a serial color node tree."""

    filtergraph: str
    ffmpeg_vf_args: list[str]
    is_identity: bool
    active_node_count: int
    total_node_count: int
    has_lut_nodes: bool


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
    """Compile an ordered serial node chain into deterministic FFmpeg colorbalance+eq stages."""
    if pix_fmt is not None and pix_fmt not in ALLOWED_COLOR_PIX_FMTS:
        raise ValueError(f"Unsupported pixel format {pix_fmt!r}")
    validated = _coerce_color_nodes(nodes)
    parts: list[str] = []
    for node in validated:
        if not node.enabled:
            continue
        if not node.grade.is_identity():
            parts.append(compile_color_grade_filter(node.grade, pix_fmt=None))
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
    return ColorNodeChainCompileResult(
        filtergraph=fg,
        ffmpeg_vf_args=["-vf", fg],
        is_identity=len(active_nodes) == 0,
        active_node_count=len(active_nodes),
        total_node_count=len(validated),
        has_lut_nodes=has_lut_nodes,
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
                    r_cur, g_cur, b_cur = node.apply_rgb(r_cur, g_cur, b_cur)
                lines.append(f"{r_cur:.6f} {g_cur:.6f} {b_cur:.6f}")

    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return parse_cube_lut(out_path)
