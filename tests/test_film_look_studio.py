"""Unit tests for 35mm/16mm Film Look Creator, Print Stock Curve & Bleach Bypass Studio."""

from __future__ import annotations

import json

import pytest

from taktcut.drp import validate_timeline
from taktcut.film_look_studio import (
    ALLOWED_FILM_LOOK_GRAIN_GAUGES,
    ALLOWED_FILM_LOOK_PRINT_STOCKS,
    FILM_LOOK_CURVE_SAMPLE_COUNT,
    FilmLookStudioConfig,
    apply_film_look_to_document,
    compile_film_look_filtergraph,
    evaluate_film_look_studio,
    export_film_look_json,
    get_film_look_preset,
    list_film_look_presets,
    normalize_film_look_config,
)
from taktcut.ui.samples import build_sample_timeline


def test_film_look_presets_and_validation_bounds() -> None:
    presets = list_film_look_presets()
    assert {p.print_stock for p in presets} == set(ALLOWED_FILM_LOOK_PRINT_STOCKS)
    assert len(presets) == 6
    assert ALLOWED_FILM_LOOK_GRAIN_GAUGES == (8, 16, 35, 65)

    kodak = get_film_look_preset("kodak_2383_d65")
    assert kodak.default_config.grain_size_mm == 35

    fuji = get_film_look_preset("fuji_3513_teal_gold")
    assert fuji.default_config.split_tone_shadow_hue < 200.0

    s16 = get_film_look_preset("super16_bleach_bypass")
    assert s16.default_config.grain_size_mm == 16
    assert s16.default_config.bleach_bypass_pct >= 50.0

    hp5 = get_film_look_preset("ilford_hp5_bw_35mm")
    assert hp5.default_config.halation_red_pct == 0.0

    with pytest.raises(ValueError, match="Unsupported film look print_stock"):
        get_film_look_preset("invalid_stock")

    for bad_ev in (True, float("nan"), -2.5, 2.5):
        with pytest.raises(ValueError):
            FilmLookStudioConfig(exposure_ev=bad_ev)  # type: ignore[arg-type]

    for bad_pivot in (True, float("nan"), 0.1, 0.9):
        with pytest.raises(ValueError):
            FilmLookStudioConfig(contrast_pivot=bad_pivot)  # type: ignore[arg-type]

    for bad_weave in (True, float("nan"), -0.5, 6.5):
        with pytest.raises(ValueError):
            FilmLookStudioConfig(gate_weave_px=bad_weave)  # type: ignore[arg-type]

    for bad_flicker in (True, float("nan"), -1.0, 35.0):
        with pytest.raises(ValueError):
            FilmLookStudioConfig(flicker_pct=bad_flicker)  # type: ignore[arg-type]

    with pytest.raises(ValueError):
        FilmLookStudioConfig(grain_size_mm=24)  # type: ignore[arg-type]


def test_sensitometric_curves_and_grain_rms_math() -> None:
    kodak = normalize_film_look_config({"print_stock": "kodak_2383_d65"})
    ev_kodak = evaluate_film_look_studio(kodak)
    assert len(ev_kodak.samples) == FILM_LOOK_CURVE_SAMPLE_COUNT == 33
    assert ev_kodak.samples[0].x_norm == 0.0
    assert ev_kodak.samples[-1].x_norm == 1.0
    assert ev_kodak.contrast_ratio > 1.5
    assert 8.0 <= ev_kodak.dynamic_range_stops <= 15.0
    assert ev_kodak.is_monochrome is False

    # Monochrome Ilford HP5 forces R == G == B
    hp5 = normalize_film_look_config({"print_stock": "ilford_hp5_bw_35mm"})
    ev_hp5 = evaluate_film_look_studio(hp5)
    assert ev_hp5.is_monochrome is True
    for smp in ev_hp5.samples:
        assert smp.r == smp.g == smp.b == smp.luma

    # Grain RMS decreases strictly from 8mm -> 16mm -> 35mm -> 65mm at identical strength
    rms_by_gauge = {}
    for g in ALLOWED_FILM_LOOK_GRAIN_GAUGES:
        cfg = normalize_film_look_config(
            {"print_stock": "kodak_2383_d65", "grain_size_mm": g, "grain_strength_pct": 50.0}
        )
        rms_by_gauge[g] = evaluate_film_look_studio(cfg).grain_rms
    assert rms_by_gauge[8] > rms_by_gauge[16] > rms_by_gauge[35] > rms_by_gauge[65]

    # Bleach bypass increases midtone gamma/contrast and reduces DR
    fuji_base = normalize_film_look_config(
        {"print_stock": "fuji_3513_teal_gold", "bleach_bypass_pct": 0.0}
    )
    fuji_bleach = normalize_film_look_config(
        {"print_stock": "fuji_3513_teal_gold", "bleach_bypass_pct": 75.0}
    )
    ev_base = evaluate_film_look_studio(fuji_base)
    ev_bleach = evaluate_film_look_studio(fuji_bleach)
    assert ev_bleach.gamma_at_pivot > ev_base.gamma_at_pivot
    assert ev_bleach.dynamic_range_stops < ev_base.dynamic_range_stops

    # Disabled bypass
    bypass_ev = evaluate_film_look_studio(FilmLookStudioConfig(enabled=False))
    assert bypass_ev.grain_rms == 0.0
    assert bypass_ev.contrast_ratio == 1.0


def test_compile_ffmpeg_and_export_json() -> None:
    cfg = normalize_film_look_config(
        {
            "print_stock": "fuji_3513_teal_gold",
            "bleach_bypass_pct": 42.0,
            "grain_size_mm": 16,
            "grain_strength_pct": 45.0,
            "gate_weave_px": 2.4,
            "flicker_pct": 8.0,
        }
    )
    compiled = compile_film_look_filtergraph(cfg)
    assert "curves=" in compiled.curves_vf
    assert "colorbalance=" in compiled.colorbalance_vf
    assert "eq=" in compiled.eq_vf
    assert "noise=" in compiled.noise_vf
    assert "vignette=" in compiled.vignette_vf
    assert "pad=" in compiled.gate_weave_vf
    assert "crop=" in compiled.gate_weave_vf
    assert "curves=" in compiled.vf_chain
    assert "crop=" in compiled.vf_chain

    # Disabled bypass
    bypass_comp = compile_film_look_filtergraph(FilmLookStudioConfig(enabled=False))
    assert bypass_comp.vf_chain == "null"

    exported = export_film_look_json(cfg, title="Fuji 3513 / Lab!")
    assert exported.schema_version == "taktcut.film_look_studio.v1"
    parsed = json.loads(exported.json_text)
    assert parsed["schema_version"] == "taktcut.film_look_studio.v1"
    assert parsed["print_stock"] == "fuji_3513_teal_gold"
    assert parsed["film_look"]["bleach_bypass_pct"] == 42.0
    assert len(parsed["curve_samples"]) == 33
    assert "curves=" in parsed["ffmpeg"]["curves_vf"]


def test_apply_film_look_to_timeline_document() -> None:
    doc = build_sample_timeline("clean")
    cfg = normalize_film_look_config(
        {
            "print_stock": "fuji_3513_teal_gold",
            "bleach_bypass_pct": 38.0,
            "grain_size_mm": 16,
        }
    )
    updated = apply_film_look_to_document(doc, cfg, track_index=1, clip_index=0)
    val = validate_timeline(updated)
    assert val.valid is True
    v1 = next(t for t in updated.tracks if t.kind == "video")
    fl = v1.clips[0].film_look
    assert fl is not None
    assert fl.print_stock == "fuji_3513_teal_gold"
    assert fl.bleach_bypass_pct == 38.0
    assert fl.grain_size_mm == 16
    assert "curves=" in fl.ffmpeg_vf
