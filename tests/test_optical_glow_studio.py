"""Unit tests for Boris FX Sapphire S_Glow & DaVinci Resolve 35mm Optical Halation Studio."""

from __future__ import annotations

import json
import math

import pytest

from taktcut.drp import validate_timeline
from taktcut.optical_glow_studio import (
    ALLOWED_OPTICAL_GLOW_BLEND_MODES,
    ALLOWED_OPTICAL_GLOW_PRESET_IDS,
    ALLOWED_OPTICAL_GLOW_VIEW_MODES,
    DEFAULT_HALATION_SPECTRUM_RGB,
    OpticalGlowConfig,
    analyze_optical_glow_samples,
    apply_optical_glow_to_document,
    compile_optical_glow_filtergraph,
    compute_highlight_matte_and_energy,
    evaluate_exponential_falloff_at_distance,
    evaluate_optical_glow_response,
    export_optical_glow_json,
    get_optical_glow_preset,
    list_optical_glow_presets,
    normalize_optical_glow_config,
)
from taktcut.ui.samples import build_sample_timeline


def test_presets_and_validation_bounds() -> None:
    presets = list_optical_glow_presets()
    assert {p.preset_id for p in presets} == set(ALLOWED_OPTICAL_GLOW_PRESET_IDS)

    kodak = get_optical_glow_preset("kodak_2383_halation")
    assert kodak.default_config.halation_spectrum_rgb == DEFAULT_HALATION_SPECTRUM_RGB
    assert kodak.default_config.blend_mode == "filmic_rolloff"

    anam = get_optical_glow_preset("anamorphic_blue_streak")
    assert anam.default_config.streak_intensity > 1.0
    assert anam.default_config.streak_tint_rgb[2] > anam.default_config.streak_tint_rgb[0]

    with pytest.raises(ValueError, match="Unsupported optical glow preset"):
        get_optical_glow_preset("nonexistent_glow")

    for bad_val in (True, float("nan"), float("inf"), -0.5, 1.5):
        with pytest.raises(ValueError):
            OpticalGlowConfig(highlight_threshold=bad_val)  # type: ignore[arg-type]

    with pytest.raises(ValueError):
        OpticalGlowConfig(halation_spectrum_rgb=(1.0, 0.2))  # type: ignore[arg-type]


def test_highlight_extraction_and_exponential_falloff_physics() -> None:
    m_low, e_low = compute_highlight_matte_and_energy(0.40, 0.70, 0.14)
    m_mid, e_mid = compute_highlight_matte_and_energy(0.70, 0.70, 0.14)
    m_high, e_high = compute_highlight_matte_and_energy(0.95, 0.70, 0.14)

    assert m_low == 0.0
    assert e_low == 0.0
    assert m_mid == pytest.approx(0.5, abs=1e-4)
    assert m_high == 1.0
    assert e_high > e_mid > 0.0

    # Multi-octave inverse-square falloff is monotonically decreasing with distance
    f0 = evaluate_exponential_falloff_at_distance(0.0, 24.0, octaves=4)
    f8 = evaluate_exponential_falloff_at_distance(8.0, 24.0, octaves=4)
    f24 = evaluate_exponential_falloff_at_distance(24.0, 24.0, octaves=4)
    assert f0 == pytest.approx(1.0, abs=1e-4)
    assert f0 > f8 > f24 > 0.0

    cfg = normalize_optical_glow_config({"preset_id": "sapphire_dream_bloom"})
    resp = evaluate_optical_glow_response(cfg)
    assert len(resp.threshold_curve) == 33
    assert len(resp.falloff_curve) == 33
    assert resp.falloff_curve[0].bloom_response > resp.falloff_curve[-1].bloom_response


def test_analyze_optical_glow_samples_and_view_modes() -> None:
    cfg = normalize_optical_glow_config({"preset_id": "kodak_2383_halation"})
    res = analyze_optical_glow_samples(cfg)
    assert res.sample_count == 24 * 16
    assert 1.0 < res.triggered_highlight_pct < 90.0
    assert res.halo_energy_added > 0.0
    assert res.mean_luma_after > res.mean_luma_before
    assert 0.0 <= res.peak_headroom <= 1.0
    assert sum(res.luma_histogram_before) == res.sample_count
    assert sum(res.luma_histogram_after) == res.sample_count
    assert len(res.highlight_matte_map) == res.sample_count

    # Bypass mode adds zero halo energy
    off_cfg = cfg.model_copy(update={"enabled": False})
    off_res = analyze_optical_glow_samples(off_cfg)
    assert off_res.halo_energy_added == 0.0
    assert off_res.mean_luma_after == pytest.approx(off_res.mean_luma_before, abs=1e-4)

    # Custom 4x4 RGBA buffer with bright center pixel
    grid: list[float] = []
    for y in range(4):
        for x in range(4):
            if x in (1, 2) and y in (1, 2):
                grid.extend([255.0, 240.0, 210.0, 255.0])
            else:
                grid.extend([20.0, 24.0, 32.0, 255.0])

    hal_only = analyze_optical_glow_samples(
        cfg.model_copy(update={"view_mode": "halation_only"}),
        width=4,
        height=4,
        pixels=grid,
    )
    assert hal_only.sample_count == 16
    assert hal_only.triggered_highlight_pct == pytest.approx(25.0, abs=0.1)
    # 35mm Halation emulsion emphasizes Red over Blue
    corner_r, _, corner_b = hal_only.preview_rgb_map[0]
    center_r, _, center_b = hal_only.preview_rgb_map[5]
    assert center_r > center_b
    assert corner_r >= corner_b


def test_ffmpeg_compiler_modes_export_json_and_apply_timeline() -> None:
    for blend_mode in ALLOWED_OPTICAL_GLOW_BLEND_MODES:
        cfg = normalize_optical_glow_config(
            {
                "preset_id": "anamorphic_blue_streak",
                "blend_mode": blend_mode,
                "streak_angle_deg": 18.0,
            }
        )
        compiled = compile_optical_glow_filtergraph(cfg)
        assert compiled.enabled is True
        assert "split=" in compiled.vf_chain
        assert "lutrgb=" in compiled.vf_chain
        assert "gblur=" in compiled.vf_chain
        assert "avgblur=" in compiled.vf_chain
        assert "blend=" in compiled.vf_chain
        assert "rotate=a=" in compiled.vf_chain
        assert math.isfinite(compiled.effective_radius_px)

    for view_mode in ALLOWED_OPTICAL_GLOW_VIEW_MODES:
        vm_cfg = normalize_optical_glow_config(
            {"preset_id": "kodak_2383_halation", "view_mode": view_mode, "split_position": 0.4}
        )
        vm_comp = compile_optical_glow_filtergraph(vm_cfg)
        if view_mode == "split_compare":
            assert "hstack=inputs=2" in vm_comp.vf_chain
        elif view_mode == "highlight_matte":
            assert "lutrgb=" in vm_comp.vf_chain
        elif view_mode == "halation_only":
            assert "gblur=sigma=" in vm_comp.vf_chain

    bypass_comp = compile_optical_glow_filtergraph(
        normalize_optical_glow_config({"enabled": False})
    )
    assert bypass_comp.vf_chain == "null"

    cfg = normalize_optical_glow_config({"preset_id": "neon_night_club"})
    exported = export_optical_glow_json(cfg, title="Club Neon")
    assert exported.schema_version == "taktcut.optical_glow.v1"
    parsed = json.loads(exported.json_text)
    assert "DaVinci Resolve Studio OFX" in parsed["compatible_hosts"]
    assert "Boris FX Sapphire S_Glow" in parsed["compatible_hosts"]
    assert parsed["anamorphic_streak"]["streak_angle_deg"] == 22.0

    doc = build_sample_timeline("clean")
    applied = apply_optical_glow_to_document(doc, cfg, track_index=1, clip_index=0)
    val = validate_timeline(applied)
    assert val.valid is True
    attached = applied.tracks[0].clips[0].optical_glow
    assert attached is not None
    assert attached.preset_id == "neon_night_club"
    assert attached.triggered_highlight_pct > 0.0
    assert "split=" in attached.ffmpeg_vf
