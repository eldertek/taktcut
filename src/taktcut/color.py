"""Color grading math, FFmpeg colorbalance + eq compiler, ASC CDL, and .cube LUT tools."""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any, Literal

import defusedxml.ElementTree as DefusedET
from pydantic import BaseModel, field_validator

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


def parse_cube_lut(path: Path) -> CubeLutInfo:
    """Validate and inspect an Adobe/Iridas 1D or 3D .cube LUT file."""
    title = ""
    size_1d: int | None = None
    size_3d: int | None = None
    domain_min: tuple[float, float, float] = (0.0, 0.0, 0.0)
    domain_max: tuple[float, float, float] = (1.0, 1.0, 1.0)
    entries = 0

    for line_no, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
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
            if len(vals) != 3:
                raise ValueError(f"Invalid DOMAIN_MIN at line {line_no}")
            domain_min = (vals[0], vals[1], vals[2])
        elif upper.startswith("DOMAIN_MAX"):
            vals = [float(v) for v in line.split()[1:4]]
            if len(vals) != 3:
                raise ValueError(f"Invalid DOMAIN_MAX at line {line_no}")
            domain_max = (vals[0], vals[1], vals[2])
        elif upper.startswith("LUT_1D_INPUT_RANGE") or upper.startswith("LUT_3D_INPUT_RANGE"):
            continue
        else:
            parts = line.split()
            if len(parts) != 3:
                raise ValueError(f"Expected RGB triplet at line {line_no}, got: {line!r}")
            for token in parts:
                val = float(token)
                if not math.isfinite(val):
                    raise ValueError(f"Non-finite LUT value at line {line_no}: {token}")
            entries += 1

    if (size_1d is None) == (size_3d is None):
        raise ValueError("LUT must declare exactly one of LUT_1D_SIZE or LUT_3D_SIZE")

    if size_3d is not None:
        dimension: Literal["1D", "3D"] = "3D"
        size = size_3d
        expected = size_3d**3
    else:
        assert size_1d is not None
        dimension = "1D"
        size = size_1d
        expected = size_1d

    if entries != expected:
        raise ValueError(
            f"Expected {expected} entries for {dimension} size {size}, found {entries}"
        )

    for idx in range(3):
        if domain_min[idx] >= domain_max[idx]:
            raise ValueError(f"Invalid LUT domain bounds: {domain_min} >= {domain_max}")

    return CubeLutInfo(
        path=str(path),
        title=title,
        dimension=dimension,
        size=size,
        domain_min=domain_min,
        domain_max=domain_max,
        entry_count=entries,
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
