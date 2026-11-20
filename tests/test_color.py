"""Tests for ASC CDL color math, .cube LUT parsing/baking, and Rec.709 filter construction."""

from __future__ import annotations

from pathlib import Path

import pytest

from taktcut.color import (
    bake_cdl_to_cube,
    build_rec709_lut_filter,
    parse_cdl_xml,
    parse_cube_lut,
)
from taktcut.models import AscCdlParams


def test_cdl_xml_parse_and_bake_to_cube(tmp_path: Path) -> None:
    cdl_path = tmp_path / "grade.cdl"
    cdl_path.write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        "<ColorCorrection>\n"
        "  <SOPNode>\n"
        "    <Slope>1.10 1.00 0.90</Slope>\n"
        "    <Offset>0.02 -0.01 0.00</Offset>\n"
        "    <Power>0.95 1.00 1.05</Power>\n"
        "  </SOPNode>\n"
        "  <SatNode>\n"
        "    <Saturation>1.15</Saturation>\n"
        "  </SatNode>\n"
        "</ColorCorrection>\n",
        encoding="utf-8",
    )

    cdl = parse_cdl_xml(cdl_path)
    assert cdl.slope == (1.1, 1.0, 0.9)
    assert cdl.saturation == pytest.approx(1.15)

    out_cube = tmp_path / "baked.cube"
    info = bake_cdl_to_cube(cdl, out_cube, size=17, title="qa-look")
    assert info.dimension == "3D"
    assert info.size == 17
    assert info.entry_count == 17**3
    assert info.title == "qa-look"

    vf = build_rec709_lut_filter(out_cube)
    assert "lut3d=file=" in vf
    assert "interp=tetrahedral" in vf


def test_identity_cdl_preserves_endpoints(tmp_path: Path) -> None:
    cdl = AscCdlParams()
    assert cdl.apply_rgb(0.0, 0.5, 1.0) == pytest.approx((0.0, 0.5, 1.0))

    cube_path = tmp_path / "identity.cube"
    bake_cdl_to_cube(cdl, cube_path, size=5)
    lines = [
        ln
        for ln in cube_path.read_text(encoding="utf-8").splitlines()
        if ln and not ln.startswith(("TITLE", "LUT_", "DOMAIN_"))
    ]
    assert len(lines) == 125
    assert lines[0] == "0.000000 0.000000 0.000000"
    assert lines[-1] == "1.000000 1.000000 1.000000"


def test_invalid_cube_entry_count_raises(tmp_path: Path) -> None:
    bad_cube = tmp_path / "broken.cube"
    bad_cube.write_text(
        "LUT_3D_SIZE 3\n0.0 0.0 0.0\n1.0 1.0 1.0\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="Expected 27 entries"):
        parse_cube_lut(bad_cube)
