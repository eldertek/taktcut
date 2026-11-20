"""ASC CDL color math, Adobe/Iridas .cube 1D/3D LUT validation/baking, and Rec.709 tagging."""

from __future__ import annotations

import math
from pathlib import Path
from typing import Literal

import defusedxml.ElementTree as DefusedET

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
