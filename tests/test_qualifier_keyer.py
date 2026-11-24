"""Unit & FFmpeg execution tests for DaVinci Resolve Qualifier Keyer & Light-Wrap Studio."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest

from taktcut.qualifier_keyer import (
    ALLOWED_QUALIFIER_KEYER_PRESETS,
    QualifierKeyerConfig,
    analyze_qualifier_keyer_samples,
    apply_matte_clean_clip,
    apply_spill_suppression,
    bake_qualifier_to_cube,
    compile_qualifier_filtergraph,
    evaluate_qualifier_keyer_pixel,
    generate_qualifier_cube_text,
    get_qualifier_keyer_preset,
    list_qualifier_keyer_presets,
    normalize_qualifier_keyer_config,
)


def test_qualifier_keyer_presets_and_validation() -> None:
    presets = list_qualifier_keyer_presets()
    preset_ids = {p.preset_id for p in presets}
    assert preset_ids == set(ALLOWED_QUALIFIER_KEYER_PRESETS)
    assert len(presets) == 7

    gs = get_qualifier_keyer_preset("green_screen_pro")
    assert gs.config.enabled is True
    assert gs.config.despill_mode == "luma_preserving"
    assert gs.config.invert_matte is True

    with pytest.raises(ValueError, match="Unknown qualifier preset_id"):
        get_qualifier_keyer_preset("nonexistent_preset")

    with pytest.raises(ValueError, match="boolean"):
        QualifierKeyerConfig.model_validate({"enabled": "yes"})

    with pytest.raises(ValueError, match="sat_low"):
        QualifierKeyerConfig.model_validate({"sat_low": 0.8, "sat_high": 0.2})

    with pytest.raises(ValueError, match="luma_low"):
        QualifierKeyerConfig.model_validate({"luma_low": 0.9, "luma_high": 0.3})

    with pytest.raises(ValueError, match="clean_black"):
        QualifierKeyerConfig.model_validate({"clean_black": 0.85, "clean_white": 0.70})

    with pytest.raises(ValueError, match="Unsupported despill_mode"):
        QualifierKeyerConfig.model_validate({"despill_mode": "invalid_despill"})


def test_qualifier_keyer_hsl_3d_chroma_luma_and_despill_math() -> None:
    gs = get_qualifier_keyer_preset("green_screen_pro").config
    # Pure green screen sample -> keyed out (alpha near 0)
    a_green, dr, dg, db = evaluate_qualifier_keyer_pixel(gs, 0.12, 0.78, 0.20)
    assert a_green < 0.05
    assert dg <= max(dr, db) + 0.08

    # Skin foreground sample -> opaque core (alpha near 1)
    a_skin, _, _, _ = evaluate_qualifier_keyer_pixel(gs, 0.78, 0.54, 0.42)
    assert a_skin > 0.95

    # Invert matte flips selection
    gs_inv = normalize_qualifier_keyer_config({**gs.model_dump(), "invert_matte": False})
    a_green_inv, _, _, _ = evaluate_qualifier_keyer_pixel(gs_inv, 0.12, 0.78, 0.20)
    assert a_green_inv > 0.95

    # Skin tone isolator isolates skin and rejects blue
    skin_cfg = get_qualifier_keyer_preset("skin_tone_isolator").config
    a_face, _, _, _ = evaluate_qualifier_keyer_pixel(skin_cfg, 0.76, 0.52, 0.40)
    a_blue, _, _, _ = evaluate_qualifier_keyer_pixel(skin_cfg, 0.10, 0.22, 0.80)
    assert a_face > 0.85
    assert a_blue < 0.05

    # Studio luma key separates bright talent from black cyclorama
    luma_cfg = get_qualifier_keyer_preset("studio_luma_key").config
    a_lit, _, _, _ = evaluate_qualifier_keyer_pixel(luma_cfg, 0.75, 0.75, 0.75)
    a_dark, _, _, _ = evaluate_qualifier_keyer_pixel(luma_cfg, 0.03, 0.03, 0.04)
    assert a_lit > 0.95
    assert a_dark < 0.05

    # Luma-preserving despill retains more Rec.709 luminance than avg_gb
    gs_avg = gs.model_copy(update={"despill_mode": "avg_gb", "despill_strength": 1.0})
    gs_lp = gs.model_copy(update={"despill_mode": "luma_preserving", "despill_strength": 1.0})
    r_in, g_in, b_in = 0.25, 0.75, 0.30
    y_in = 0.2126 * r_in + 0.7152 * g_in + 0.0722 * b_in
    r_avg, g_avg, b_avg = apply_spill_suppression(gs_avg, r_in, g_in, b_in)
    r_lp, g_lp, b_lp = apply_spill_suppression(gs_lp, r_in, g_in, b_in)
    y_avg = 0.2126 * r_avg + 0.7152 * g_avg + 0.0722 * b_avg
    y_lp = 0.2126 * r_lp + 0.7152 * g_lp + 0.0722 * b_lp
    assert abs(y_lp - y_in) < abs(y_avg - y_in)
    assert apply_matte_clean_clip(0.5, 0.1, 0.9) == pytest.approx(0.5, abs=1e-4)


def test_qualifier_keyer_sample_analyzer_and_matte_finesse() -> None:
    gs = get_qualifier_keyer_preset("green_screen_pro").config
    report = analyze_qualifier_keyer_samples(gs)
    assert report.sample_count == 24 * 16
    assert sum(report.alpha_histogram) == report.sample_count
    assert report.core_solid_ratio > 0.15
    assert report.bg_leak_ratio < 0.22
    assert report.despill_reduction_ratio > 0.40
    assert report.light_wrap_energy > 0.0
    assert report.quality_grade in ("EXCELLENT", "GOOD")

    hard_edge = analyze_qualifier_keyer_samples(gs.model_copy(update={"post_feather_px": 0.0}))
    assert hard_edge.bg_leak_ratio < 0.02
    assert hard_edge.quality_grade == "EXCELLENT"

    # Shrink choke reduces mean alpha compared to grow choke on the same 2D frame
    shrunk = gs.model_copy(update={"choke_px": -3.0, "post_feather_px": 0.0})
    grown = gs.model_copy(update={"choke_px": 3.0, "post_feather_px": 0.0})
    m_shrunk = analyze_qualifier_keyer_samples(shrunk)
    m_grown = analyze_qualifier_keyer_samples(grown)
    assert m_shrunk.mean_alpha < m_grown.mean_alpha

    # Explicit RGBA samples in 0..255 byte range
    explicit = analyze_qualifier_keyer_samples(
        gs,
        samples=[
            [30, 195, 55, 255],
            [200, 140, 110, 255],
            [120, 160, 115, 255],
        ],
    )
    assert explicit.sample_count == 3
    assert explicit.alpha_map[0] < 0.1
    assert explicit.alpha_map[1] > 0.9


def test_qualifier_keyer_cube_export_and_ffmpeg_compile(tmp_path: Path) -> None:
    blue_cfg = get_qualifier_keyer_preset("blue_screen_cinema").config
    compiled = compile_qualifier_filtergraph(blue_cfg)
    assert compiled.enabled is True
    assert "chromakey=" in compiled.ffmpeg_key_filter
    assert "despill=type=blue" in compiled.ffmpeg_despill_filter
    assert "alphaextract" in compiled.ffmpeg_matte_finesse_filter

    luma_cfg = get_qualifier_keyer_preset("studio_luma_key").config
    compiled_luma = compile_qualifier_filtergraph(luma_cfg)
    assert "lumakey=" in compiled_luma.ffmpeg_key_filter

    cube_out = tmp_path / "luts" / "blue_matte.cube"
    info = bake_qualifier_to_cube(blue_cfg, cube_out, size=9, mode="matte", title="Blue Matte")
    assert info.size == 9
    assert info.entry_count == 729
    text = cube_out.read_text(encoding="utf-8")
    assert 'TITLE "Blue Matte"' in text
    assert "LUT_3D_SIZE 9" in text
    iso_text = generate_qualifier_cube_text(blue_cfg, size=5, mode="isolation", title="Iso")
    assert "LUT_3D_SIZE 5" in iso_text

    ffmpeg_exe = shutil.which("ffmpeg")
    if ffmpeg_exe:
        proc = subprocess.run(
            [
                ffmpeg_exe,
                "-v",
                "error",
                "-f",
                "lavfi",
                "-i",
                "testsrc2=s=64x64:d=0.04",
                "-vf",
                compiled.ffmpeg_filter_expr,
                "-f",
                "null",
                "-",
            ],
            capture_output=True,
            text=True,
            check=False,
            timeout=15,
        )
        assert proc.returncode == 0, f"FFmpeg rejected filtergraph: {proc.stderr}"
