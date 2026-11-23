"""Tests for color grading bounds, FFmpeg colorbalance+eq compilation, presets, and .cube LUTs."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest
from pydantic import ValidationError

from taktcut.color import (
    COLOR_GRADE_PRESETS,
    POWER_WINDOW_SHAPES,
    ColorGradeParams,
    ColorNodeParams,
    PowerWindowParams,
    apply_color_preset,
    apply_cube_lut_rgb,
    bake_cdl_to_cube,
    bake_color_grade_to_cube,
    bake_color_node_chain_to_cube,
    build_rec709_lut_filter,
    compile_color_grade,
    compile_color_grade_filter,
    compile_color_node_chain,
    compile_power_window_mask_expr,
    get_color_preset,
    list_color_presets,
    parse_cdl_xml,
    parse_cube_lut,
    parse_cube_lut_text,
)
from taktcut.models import AscCdlParams, HardwareCapabilities, RenderProfile
from taktcut.render import build_render_plan


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


def test_color_grade_strict_bounds_validation() -> None:
    # Valid boundary extremes are accepted
    boundary = ColorGradeParams(
        lift=(-1.0, 0.0, 1.0),
        gamma=(1.0, -1.0, 0.5),
        gain=(0.9, 0.9, -0.9),
        contrast=2.0,
        saturation=3.0,
        temperature=1.0,
    )
    assert boundary.contrast == 2.0
    # Effective colorbalance must keep midtones/highlights safely within [-1.0, 1.0]
    shadows, midtones, highlights = boundary.effective_colorbalance()
    for triplet in (shadows, midtones, highlights):
        for ch in triplet:
            assert -1.0 <= ch <= 1.0

    invalid_cases: list[dict[str, object]] = [
        {"lift": (1.01, 0.0, 0.0)},
        {"lift": (0.0, -1.01, 0.0)},
        {"gamma": (0.0, 0.0, 1.5)},
        {"gain": (-1.2, 0.0, 0.0)},
        {"lift": (0.0, 0.0)},
        {"lift": (True, 0.0, 0.0)},
        {"lift": (float("nan"), 0.0, 0.0)},
        {"gamma": (0.0, float("inf"), 0.0)},
        {"contrast": -0.01},
        {"contrast": 2.01},
        {"contrast": float("nan")},
        {"contrast": False},
        {"saturation": -0.1},
        {"saturation": 3.01},
        {"saturation": float("-inf")},
        {"temperature": -1.01},
        {"temperature": 1.01},
        {"temperature": float("inf")},
    ]
    for bad in invalid_cases:
        with pytest.raises((ValidationError, ValueError)):
            ColorGradeParams.model_validate(bad)

    with pytest.raises(ValueError, match="Unsupported pixel format"):
        compile_color_grade_filter(ColorGradeParams(), pix_fmt="yuv420p;rm -rf /")


def test_four_cinematic_presets_and_application() -> None:
    presets = list_color_presets()
    assert len(presets) == 4
    assert [p.name for p in presets] == [
        "Rec.709 Clean",
        "Teal & Orange",
        "Film Warm",
        "Noir B&W",
    ]
    assert len(COLOR_GRADE_PRESETS) == 4

    clean = apply_color_preset("rec709_clean")
    assert clean.is_identity() is True
    assert clean.contrast == 1.0
    assert clean.saturation == 1.0
    assert clean.temperature == 0.0

    # Applying returns an isolated copy
    clean.contrast = 1.5
    assert get_color_preset("Rec.709 Clean").params.contrast == 1.0

    teal = apply_color_preset("Teal & Orange")
    assert teal.lift[2] > 0.0 and teal.lift[0] < 0.0
    assert teal.gain[0] > 0.0 and teal.gain[2] < 0.0
    assert teal.contrast > 1.0
    assert teal.saturation > 1.0

    warm = apply_color_preset("film_warm")
    assert warm.temperature > 0.0
    assert warm.gamma[0] > warm.gamma[2]

    noir = apply_color_preset("Noir B&W")
    assert noir.saturation == 0.0
    assert noir.contrast > 1.2
    nr, ng, nb = noir.apply_rgb(0.8, 0.4, 0.2)
    assert nr == pytest.approx(ng, abs=1e-6)
    assert ng == pytest.approx(nb, abs=1e-6)

    with pytest.raises(ValueError, match="Unknown color preset"):
        get_color_preset("nonexistent_lut")


def test_ffmpeg_colorbalance_and_eq_filter_compilation(tmp_path: Path) -> None:
    teal = apply_color_preset("teal_orange")
    fg = compile_color_grade_filter(teal, pix_fmt="yuv420p")
    assert fg.startswith("colorbalance=")
    assert "rs=-0.1400:gs=0.0200:bs=0.1600" in fg
    assert "eq=contrast=1.1400:saturation=1.1800" in fg
    assert fg.endswith(",format=yuv420p")

    # Deterministic repeat compilation
    compiled = compile_color_grade(teal)
    assert compiled.ffmpeg_vf_args == ["-vf", compiled.filtergraph]
    assert compiled.is_identity is False
    assert compile_color_grade_filter(teal) == compiled.filtergraph

    # RenderPlan skips identity grade and includes active grade
    caps = HardwareCapabilities(ffmpeg_path="ffmpeg", libx264=True)
    clean_plan = build_render_plan(
        input_path=tmp_path / "in.mp4",
        output_path=tmp_path / "out_clean.mp4",
        profile=RenderProfile.WEB_H264,
        color_grade=apply_color_preset("rec709_clean"),
        prefer_hw=False,
        caps=caps,
    )
    assert clean_plan.video_filter is None

    graded_plan = build_render_plan(
        input_path=tmp_path / "in.mp4",
        output_path=tmp_path / "out_teal.mp4",
        profile=RenderProfile.WEB_H264,
        color_grade=teal,
        prefer_hw=False,
        caps=caps,
    )
    assert graded_plan.video_filter is not None
    assert "colorbalance=" in graded_plan.video_filter
    assert "eq=contrast=1.1400:saturation=1.1800" in graded_plan.video_filter

    # Bake ColorGradeParams to 3D .cube LUT
    cube_out = tmp_path / "teal_orange.cube"
    info = bake_color_grade_to_cube(teal, cube_out, size=9, title="teal_orange")
    assert info.dimension == "3D"
    assert info.size == 9
    assert info.entry_count == 729


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg binary not on PATH")
def test_compiled_color_presets_execute_in_real_ffmpeg() -> None:
    ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"
    for preset in list_color_presets():
        fg = compile_color_grade_filter(preset.params, pix_fmt="yuv420p")
        cmd = [
            ffmpeg_bin,
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            "testsrc=duration=0.1:size=320x180:rate=25",
            "-vf",
            fg,
            "-frames:v",
            "2",
            "-f",
            "null",
            "-",
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=20, check=False)
        assert proc.returncode == 0, f"FFmpeg rejected {preset.id}: {proc.stderr}"


def test_serial_color_node_chain_lut_import_and_composite_bake(tmp_path: Path) -> None:
    cube_text = (
        'TITLE "Warm_Split_2x2x2"\n'
        "LUT_3D_SIZE 2\n"
        "DOMAIN_MIN 0.0 0.0 0.0\n"
        "DOMAIN_MAX 1.0 1.0 1.0\n"
        "0.0 0.0 0.0\n"
        "1.0 0.0 0.0\n"
        "0.0 1.0 0.0\n"
        "1.0 1.0 0.0\n"
        "0.0 0.0 0.8\n"
        "1.0 0.0 0.8\n"
        "0.0 1.0 0.8\n"
        "1.0 0.9 0.8\n"
    )
    info, table = parse_cube_lut_text(cube_text, source_name="warm.cube")
    assert info.dimension == "3D"
    assert info.size == 2
    assert info.entry_count == 8
    assert info.title == "Warm_Split_2x2x2"

    # Trilinear interpolation + mix blending
    r_full, g_full, b_full = apply_cube_lut_rgb(
        1.0,
        1.0,
        1.0,
        dimension="3D",
        size=2,
        table=table,
        mix=1.0,
    )
    assert (r_full, g_full, b_full) == pytest.approx((1.0, 0.9, 0.8))
    r_half, g_half, b_half = apply_cube_lut_rgb(
        1.0,
        1.0,
        1.0,
        dimension="3D",
        size=2,
        table=table,
        mix=0.5,
    )
    assert (r_half, g_half, b_half) == pytest.approx((1.0, 0.95, 0.9))

    node_balance = ColorNodeParams(
        id="node-1",
        label="Balance",
        enabled=True,
        grade=ColorGradeParams(contrast=1.1, saturation=1.05, temperature=0.1),
    )
    node_bypassed = ColorNodeParams(
        id="node-2",
        label="Bypassed Look",
        enabled=False,
        grade=apply_color_preset("noir_bw"),
    )
    node_lut = ColorNodeParams(
        id="node-3",
        label="Film LUT",
        enabled=True,
        grade=ColorGradeParams(),
        lut_title=info.title,
        lut_dimension=info.dimension,
        lut_size=info.size,
        lut_mix=0.75,
        lut_domain_min=info.domain_min,
        lut_domain_max=info.domain_max,
        lut_table=table,
    )

    compiled = compile_color_node_chain(
        [node_balance, node_bypassed, node_lut],
        pix_fmt="yuv420p",
    )
    assert compiled.is_identity is False
    assert compiled.active_node_count == 2
    assert compiled.total_node_count == 3
    assert compiled.has_lut_nodes is True
    assert "eq=contrast=1.1000:saturation=1.0500" in compiled.filtergraph
    assert "saturation=0.0000" not in compiled.filtergraph
    assert compiled.filtergraph.endswith(",format=yuv420p")

    # Composite 3D .cube bake includes node_balance + node_lut (skips node_bypassed)
    composite_path = tmp_path / "composite_tree.cube"
    baked_info = bake_color_node_chain_to_cube(
        [node_balance, node_bypassed, node_lut],
        composite_path,
        size=5,
        title="composite_tree",
    )
    assert baked_info.size == 5
    assert baked_info.entry_count == 125

    caps = HardwareCapabilities(ffmpeg_path="ffmpeg", libx264=True)
    plan = build_render_plan(
        input_path=tmp_path / "in.mp4",
        output_path=tmp_path / "out_nodes.mp4",
        profile=RenderProfile.WEB_H264,
        color_nodes=[node_balance, node_bypassed],
        prefer_hw=False,
        caps=caps,
    )
    assert plan.video_filter is not None
    assert "eq=contrast=1.1000:saturation=1.0500" in plan.video_filter


def test_power_window_bounds_mask_math_and_ffmpeg_compile(tmp_path: Path) -> None:
    assert POWER_WINDOW_SHAPES == ("off", "circle", "linear", "gradient")

    with pytest.raises(ValidationError):
        PowerWindowParams.model_validate({"shape": "triangle"})
    with pytest.raises(ValidationError):
        PowerWindowParams.model_validate({"center_x": 1.2})
    with pytest.raises(ValidationError):
        PowerWindowParams.model_validate({"width": 0.01})
    with pytest.raises(ValidationError):
        PowerWindowParams.model_validate({"rotation_deg": 200.0})
    with pytest.raises(ValidationError):
        PowerWindowParams.model_validate({"softness": 0.9})
    with pytest.raises(ValidationError):
        PowerWindowParams.model_validate({"invert": "yes"})

    circle_pw = PowerWindowParams(
        shape="circle",
        center_x=0.5,
        center_y=0.5,
        width=0.4,
        height=0.4,
        softness=0.1,
        invert=False,
    )
    assert circle_pw.is_active() is True
    assert circle_pw.evaluate_mask(0.5, 0.5) == pytest.approx(1.0)
    assert circle_pw.evaluate_mask(0.02, 0.02) == pytest.approx(0.0)

    inv_pw = PowerWindowParams(
        shape="circle",
        center_x=0.5,
        center_y=0.5,
        width=0.4,
        height=0.4,
        softness=0.1,
        invert=True,
    )
    assert inv_pw.evaluate_mask(0.5, 0.5) == pytest.approx(0.0)
    assert inv_pw.evaluate_mask(0.02, 0.02) == pytest.approx(1.0)

    linear_rot_pw = PowerWindowParams(
        shape="linear",
        center_x=0.5,
        center_y=0.5,
        width=0.5,
        height=0.2,
        rotation_deg=90.0,
        softness=0.0,
    )
    assert linear_rot_pw.evaluate_mask(0.5, 0.32) == pytest.approx(1.0, abs=1e-3)
    assert linear_rot_pw.evaluate_mask(0.2, 0.5) == pytest.approx(0.0, abs=1e-3)

    grad_pw = PowerWindowParams(
        shape="gradient",
        center_x=0.5,
        center_y=0.5,
        height=0.3,
        softness=0.1,
    )
    assert grad_pw.evaluate_mask(0.5, 0.1) > 0.95
    assert grad_pw.evaluate_mask(0.5, 0.9) < 0.05

    node_inside = ColorNodeParams(
        id="node-1",
        label="Subject Spot",
        enabled=True,
        grade=ColorGradeParams(saturation=0.0),
        power_window=circle_pw,
    )
    assert node_inside.apply_rgb_at(0.8, 0.2, 0.2, 0.5, 0.5) == pytest.approx(
        node_inside.apply_rgb(0.8, 0.2, 0.2)
    )
    assert node_inside.apply_rgb_at(0.8, 0.2, 0.2, 0.02, 0.02) == pytest.approx((0.8, 0.2, 0.2))

    node_outside = ColorNodeParams(
        id="node-2",
        label="Outside",
        enabled=True,
        grade=ColorGradeParams(contrast=1.25),
        power_window=inv_pw,
    )

    expr = compile_power_window_mask_expr(circle_pw)
    assert "hypot(" in expr
    compiled = compile_color_node_chain([node_inside, node_outside], pix_fmt="yuv420p")
    assert compiled.has_power_windows is True
    assert compiled.active_node_count == 2
    assert "maskedmerge" in compiled.filtergraph
    assert "mergeplanes=0x001020:gbrp" in compiled.filtergraph
    assert compiled.filtergraph.endswith(",format=yuv420p")

    caps = HardwareCapabilities(ffmpeg_path="ffmpeg", libx264=True)
    plan = build_render_plan(
        input_path=tmp_path / "in.mp4",
        output_path=tmp_path / "out_pw.mp4",
        profile=RenderProfile.WEB_H264,
        color_nodes=[node_inside, node_outside],
        prefer_hw=False,
        caps=caps,
    )
    assert plan.video_filter is not None
    assert "maskedmerge" in plan.video_filter


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg binary not on PATH")
def test_power_window_shapes_execute_and_mask_pixels_in_real_ffmpeg() -> None:
    ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"
    for shape in ("circle", "linear", "gradient"):
        node = ColorNodeParams(
            id="node-1",
            label=f"PW {shape}",
            enabled=True,
            grade=ColorGradeParams(saturation=0.0),
            power_window=PowerWindowParams(
                shape=shape,
                center_x=0.5,
                center_y=0.5,
                width=0.40,
                height=0.40,
                rotation_deg=15.0,
                softness=0.05,
                invert=False,
            ),
        )
        fg = compile_color_node_chain([node], pix_fmt="rgb24").filtergraph
        cmd = [
            ffmpeg_bin,
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            "color=c=blue:s=64x64:d=0.1",
            "-vf",
            fg,
            "-frames:v",
            "1",
            "-f",
            "rawvideo",
            "-",
        ]
        proc = subprocess.run(cmd, capture_output=True, timeout=20, check=False)
        assert proc.returncode == 0, f"FFmpeg rejected Power Window {shape}: {proc.stderr.decode()}"
        raw = proc.stdout
        assert len(raw) == 64 * 64 * 3
        # Check spatially distinct pixels (graded region vs untouched blue corner)
        top_idx = (4 * 64 + 32) * 3
        ctr_idx = (32 * 64 + 32) * 3
        crn_idx = (60 * 64 + 60) * 3
        top_px = (raw[top_idx], raw[top_idx + 1], raw[top_idx + 2])
        center_px = (raw[ctr_idx], raw[ctr_idx + 1], raw[ctr_idx + 2])
        corner_px = (raw[crn_idx], raw[crn_idx + 1], raw[crn_idx + 2])
        if shape in ("circle", "linear"):
            # Center is desaturated (R~G~B), corner stays blue (B >> R)
            assert abs(center_px[0] - center_px[2]) < 15
            assert corner_px[2] > corner_px[0] + 180
        else:
            # Gradient top is desaturated, bottom stays blue
            assert abs(top_px[0] - top_px[2]) < 15
            assert corner_px[2] > corner_px[0] + 180
