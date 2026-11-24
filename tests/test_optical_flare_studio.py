"""Unit tests for Optical Glow, Halation & Anamorphic Lens Flare Studio."""

from __future__ import annotations

import json

import pytest

from taktcut.drp import validate_timeline
from taktcut.optical_flare_studio import (
    ALLOWED_OPTICAL_FLARE_BLEND_MODES,
    ALLOWED_OPTICAL_FLARE_PRESETS,
    OPTICAL_FLARE_FALLOFF_SAMPLES,
    OpticalFlareStudioConfig,
    apply_optical_flare_to_document,
    compile_optical_flare_filtergraph,
    evaluate_optical_flare_studio,
    export_optical_flare_json,
    get_optical_flare_preset,
    list_optical_flare_presets,
    normalize_optical_flare_config,
)
from taktcut.ui.samples import build_sample_timeline


def test_optical_flare_presets_and_validation_bounds() -> None:
    presets = list_optical_flare_presets()
    assert {p.preset for p in presets} == set(ALLOWED_OPTICAL_FLARE_PRESETS)
    assert len(presets) == 6
    assert ALLOWED_OPTICAL_FLARE_BLEND_MODES == ("screen", "add", "softlight")

    anamorphic = get_optical_flare_preset("anamorphic_blue_streak")
    assert anamorphic.default_config.anamorphic_stretch_x >= 3.0
    assert anamorphic.default_config.blend_mode == "screen"

    halation = get_optical_flare_preset("warm_cinema_halation")
    assert halation.default_config.halation_spread_px >= 40.0

    sun = get_optical_flare_preset("golden_hour_sun_flare")
    assert sun.default_config.flare_elements_count == 10
    assert sun.default_config.blend_mode == "add"

    promist = get_optical_flare_preset("subtle_pro_mist_1_4")
    assert promist.default_config.blend_mode == "softlight"

    with pytest.raises(ValueError, match="Unsupported optical flare preset"):
        get_optical_flare_preset("invalid_preset")

    for bad_thresh in (True, float("nan"), 0.05, 0.99):
        with pytest.raises(ValueError):
            OpticalFlareStudioConfig(threshold_luma=bad_thresh)  # type: ignore[arg-type]

    for bad_bright in (True, float("nan"), -0.1, 3.5):
        with pytest.raises(ValueError):
            OpticalFlareStudioConfig(glow_brightness=bad_bright)  # type: ignore[arg-type]

    for bad_width in (True, float("nan"), 2.0, 260.0):
        with pytest.raises(ValueError):
            OpticalFlareStudioConfig(glow_width_px=bad_width)  # type: ignore[arg-type]

    for bad_stretch in (True, float("nan"), 0.8, 6.5):
        with pytest.raises(ValueError):
            OpticalFlareStudioConfig(anamorphic_stretch_x=bad_stretch)  # type: ignore[arg-type]

    for bad_count in (True, -1, 13):
        with pytest.raises(ValueError):
            OpticalFlareStudioConfig(flare_elements_count=bad_count)  # type: ignore[arg-type]

    with pytest.raises(ValueError):
        OpticalFlareStudioConfig(blend_mode="multiply")  # type: ignore[arg-type]


def test_optical_flare_evaluation_falloff_and_ghosts() -> None:
    cfg = normalize_optical_flare_config({"preset": "anamorphic_blue_streak"})
    ev = evaluate_optical_flare_studio(cfg)
    assert ev.enabled is True
    assert len(ev.falloff_samples) == OPTICAL_FLARE_FALLOFF_SAMPLES == 33
    assert ev.falloff_samples[0].radius_norm == 0.0
    assert ev.falloff_samples[-1].radius_norm == 1.0
    assert ev.falloff_samples[0].total_energy > ev.falloff_samples[-1].total_energy
    assert ev.anamorphic_streak_aspect == cfg.anamorphic_stretch_x
    assert ev.ghost_count == cfg.flare_elements_count == 7
    assert len(ev.ghost_elements) == 7
    assert 0.0 <= ev.peak_luminance_headroom_pct <= 100.0
    assert ev.halation_energy_pct > 0.0
    assert len(ev.tint_rgb) == 3

    # Higher halation spread produces higher halation energy
    low_hal = evaluate_optical_flare_studio(
        normalize_optical_flare_config({"halation_spread_px": 0.0})
    )
    high_hal = evaluate_optical_flare_studio(
        normalize_optical_flare_config({"halation_spread_px": 90.0})
    )
    assert low_hal.halation_energy_pct == 0.0
    assert high_hal.halation_energy_pct > 15.0

    # Higher glow brightness in additive mode lowers remaining peak luminance headroom
    soft_ev = evaluate_optical_flare_studio(
        normalize_optical_flare_config({"glow_brightness": 0.4, "blend_mode": "softlight"})
    )
    hot_ev = evaluate_optical_flare_studio(
        normalize_optical_flare_config({"glow_brightness": 2.6, "blend_mode": "add"})
    )
    assert hot_ev.peak_luminance_headroom_pct < soft_ev.peak_luminance_headroom_pct

    # Disabled bypass
    bypass_ev = evaluate_optical_flare_studio(OpticalFlareStudioConfig(enabled=False))
    assert bypass_ev.enabled is False
    assert bypass_ev.ghost_count == 0
    assert bypass_ev.halation_energy_pct == 0.0
    assert bypass_ev.peak_luminance_headroom_pct == 100.0


def test_optical_flare_compile_and_export_json() -> None:
    cfg = normalize_optical_flare_config(
        {
            "preset": "golden_hour_sun_flare",
            "glow_brightness": 2.4,
            "anamorphic_stretch_x": 5.2,
            "aberration_px": 8.5,
            "blend_mode": "add",
        }
    )
    compiled = compile_optical_flare_filtergraph(cfg)
    assert "curves=" in compiled.threshold_vf
    assert "gblur=" in compiled.bloom_blur_vf
    assert "colorbalance=" in compiled.halation_vf
    assert "rgbashift=" in compiled.aberration_vf
    assert "all_mode=addition" in compiled.blend_vf
    assert "split=2[base][hi]" in compiled.filter_complex
    assert len(compiled.warnings) == 3

    bypass_comp = compile_optical_flare_filtergraph(OpticalFlareStudioConfig(enabled=False))
    assert bypass_comp.vf_chain == "null"

    exported = export_optical_flare_json(cfg, title="Sapphire / Anamorphic!")
    assert exported.schema_version == "taktcut.optical_flare_studio.v1"
    parsed = json.loads(exported.json_text)
    assert parsed["schema_version"] == "taktcut.optical_flare_studio.v1"
    assert parsed["preset"] == "golden_hour_sun_flare"
    assert len(parsed["falloff_samples"]) == 33
    assert len(parsed["ghost_elements"]) == 10
    assert "split=2" in parsed["ffmpeg"]["filter_complex"]


def test_apply_optical_flare_to_timeline_document() -> None:
    doc = build_sample_timeline("clean")
    cfg = normalize_optical_flare_config(
        {
            "preset": "neon_cyber_bloom",
            "anamorphic_stretch_x": 3.4,
            "blend_mode": "add",
        }
    )
    updated = apply_optical_flare_to_document(doc, cfg, track_index=1, clip_index=0)
    val = validate_timeline(updated)
    assert val.valid is True
    v1 = next(t for t in updated.tracks if t.kind == "video")
    of_track = v1.clips[0].optical_flare
    assert of_track is not None
    assert of_track.preset == "neon_cyber_bloom"
    assert of_track.anamorphic_stretch_x == 3.4
    assert of_track.blend_mode == "add"
    assert "split=2[base][hi]" in of_track.ffmpeg_vf
