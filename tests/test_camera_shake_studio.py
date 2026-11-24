"""Unit tests for Camera Shake, Handheld Motion & Lens Distortion Studio."""

from __future__ import annotations

import json

import pytest

from taktcut.camera_shake_studio import (
    ALLOWED_CAMERA_SHAKE_EDGE_MODES,
    ALLOWED_CAMERA_SHAKE_PRESETS,
    CAMERA_SHAKE_CURVE_FRAMES,
    CameraShakeStudioConfig,
    apply_camera_shake_to_document,
    compile_camera_shake_filtergraph,
    evaluate_camera_shake_studio,
    export_camera_shake_json,
    get_camera_shake_preset,
    list_camera_shake_presets,
    normalize_camera_shake_config,
)
from taktcut.drp import validate_timeline
from taktcut.ui.samples import build_sample_timeline


def test_camera_shake_presets_and_validation_bounds() -> None:
    presets = list_camera_shake_presets()
    assert {p.preset for p in presets} == set(ALLOWED_CAMERA_SHAKE_PRESETS)
    assert len(presets) == 6
    assert ALLOWED_CAMERA_SHAKE_EDGE_MODES == ("reflect", "crop_zoom", "wrap")

    docu = get_camera_shake_preset("handheld_docu")
    assert docu.default_config.amplitude_px == 18.0
    assert docu.default_config.edge_mode == "reflect"

    impact = get_camera_shake_preset("action_impact_punch")
    assert impact.default_config.amplitude_px >= 50.0
    assert impact.default_config.edge_mode == "crop_zoom"

    quake = get_camera_shake_preset("earthquake_rumble")
    assert quake.default_config.octaves == 6
    assert quake.default_config.frequency_hz >= 10.0

    warp = get_camera_shake_preset("anamorphic_barrel_warp")
    assert warp.default_config.lens_k1 < -0.2
    assert warp.default_config.chromatic_fringe_px >= 4.0

    tripod = get_camera_shake_preset("subtle_breathing_tripod")
    assert tripod.default_config.amplitude_px <= 8.0

    with pytest.raises(ValueError, match="Unsupported camera shake preset"):
        get_camera_shake_preset("invalid_preset")

    for bad_amp in (True, float("nan"), -1.0, 125.0):
        with pytest.raises(ValueError):
            CameraShakeStudioConfig(amplitude_px=bad_amp)  # type: ignore[arg-type]

    for bad_freq in (True, float("nan"), 0.05, 25.0):
        with pytest.raises(ValueError):
            CameraShakeStudioConfig(frequency_hz=bad_freq)  # type: ignore[arg-type]

    for bad_zoom in (True, float("nan"), -0.5, 30.0):
        with pytest.raises(ValueError):
            CameraShakeStudioConfig(z_zoom_pct=bad_zoom)  # type: ignore[arg-type]

    for bad_tilt in (True, float("nan"), -1.0, 18.0):
        with pytest.raises(ValueError):
            CameraShakeStudioConfig(tilt_deg=bad_tilt)  # type: ignore[arg-type]

    for bad_oct in (True, 0, 7):
        with pytest.raises(ValueError):
            CameraShakeStudioConfig(octaves=bad_oct)  # type: ignore[arg-type]

    for bad_k1 in (True, float("nan"), -0.6, 0.6):
        with pytest.raises(ValueError):
            CameraShakeStudioConfig(lens_k1=bad_k1)  # type: ignore[arg-type]

    for bad_k2 in (True, float("nan"), -0.3, 0.3):
        with pytest.raises(ValueError):
            CameraShakeStudioConfig(lens_k2=bad_k2)  # type: ignore[arg-type]

    for bad_seed in (True, -1, 100000):
        with pytest.raises(ValueError):
            CameraShakeStudioConfig(seed=bad_seed)  # type: ignore[arg-type]

    with pytest.raises(ValueError):
        CameraShakeStudioConfig(edge_mode="stretch")  # type: ignore[arg-type]


def test_camera_shake_evaluation_determinism_and_telemetry() -> None:
    cfg = normalize_camera_shake_config({"preset": "handheld_docu"})
    ev1 = evaluate_camera_shake_studio(cfg)
    ev2 = evaluate_camera_shake_studio(cfg)
    assert ev1 == ev2
    assert ev1.enabled is True
    assert ev1.frame_count == CAMERA_SHAKE_CURVE_FRAMES == 64
    assert len(ev1.motion_samples) == 64
    assert ev1.motion_samples[0].frame == 0
    assert ev1.motion_samples[-1].frame == 63
    assert ev1.peak_velocity_px_s > 0.0
    assert ev1.rms_displacement_px > 0.0
    assert ev1.required_safe_crop_pct > 0.0

    # Different seed produces distinct trajectory
    alt_ev = evaluate_camera_shake_studio(
        normalize_camera_shake_config({"preset": "handheld_docu", "seed": 9999})
    )
    assert alt_ev.motion_samples[5].x_px != ev1.motion_samples[5].x_px

    # Earthquake preset has significantly higher peak velocity than tripod breathing
    tripod_ev = evaluate_camera_shake_studio(
        normalize_camera_shake_config({"preset": "subtle_breathing_tripod"})
    )
    quake_ev = evaluate_camera_shake_studio(
        normalize_camera_shake_config({"preset": "earthquake_rumble"})
    )
    assert quake_ev.peak_velocity_px_s > tripod_ev.peak_velocity_px_s * 5.0
    assert quake_ev.required_safe_crop_pct > tripod_ev.required_safe_crop_pct

    # Barrel lens distortion produces negative corner shift %
    barrel_ev = evaluate_camera_shake_studio(
        normalize_camera_shake_config({"preset": "anamorphic_barrel_warp"})
    )
    assert barrel_ev.radial_distortion_corner_shift_pct < -20.0

    # Disabled bypass
    bypass_ev = evaluate_camera_shake_studio(CameraShakeStudioConfig(enabled=False))
    assert bypass_ev.enabled is False
    assert bypass_ev.peak_velocity_px_s == 0.0
    assert bypass_ev.required_safe_crop_pct == 0.0
    assert bypass_ev.radial_distortion_corner_shift_pct == 0.0


def test_camera_shake_compile_and_export_json() -> None:
    cfg = normalize_camera_shake_config(
        {
            "preset": "earthquake_rumble",
            "amplitude_px": 92.0,
            "tilt_deg": 9.5,
            "lens_k1": -0.38,
            "lens_k2": -0.10,
            "motion_blur_shutter_deg": 320.0,
            "chromatic_fringe_px": 4.0,
            "edge_mode": "crop_zoom",
        }
    )
    compiled = compile_camera_shake_filtergraph(cfg)
    assert "lenscorrection=" in compiled.lens_vf
    assert "scale=" in compiled.shake_vf
    assert "crop=" in compiled.shake_vf
    assert "rotate=" in compiled.shake_vf
    assert "tmix=" in compiled.motion_blur_vf
    assert "rgbashift=" in compiled.aberration_vf
    assert "[0:v]" in compiled.filter_complex and "[vout]" in compiled.filter_complex
    assert len(compiled.warnings) == 3

    bypass_comp = compile_camera_shake_filtergraph(CameraShakeStudioConfig(enabled=False))
    assert bypass_comp.vf_chain == "null"

    exported = export_camera_shake_json(cfg, title="Sapphire / Shake Rig!")
    assert exported.schema_version == "taktcut.camera_shake_studio.v1"
    parsed = json.loads(exported.json_text)
    assert parsed["schema_version"] == "taktcut.camera_shake_studio.v1"
    assert parsed["preset"] == "earthquake_rumble"
    assert len(parsed["motion_samples"]) == 64
    assert "lenscorrection=" in parsed["ffmpeg"]["lens_vf"]


def test_apply_camera_shake_to_timeline_document() -> None:
    doc = build_sample_timeline("clean")
    cfg = normalize_camera_shake_config(
        {
            "preset": "action_impact_punch",
            "amplitude_px": 48.0,
            "lens_k1": -0.14,
            "edge_mode": "crop_zoom",
        }
    )
    updated = apply_camera_shake_to_document(doc, cfg, track_index=1, clip_index=0)
    val = validate_timeline(updated)
    assert val.valid is True
    v1 = next(t for t in updated.tracks if t.kind == "video")
    cs_track = v1.clips[0].camera_shake
    assert cs_track is not None
    assert cs_track.preset == "action_impact_punch"
    assert cs_track.amplitude_px == 48.0
    assert cs_track.lens_k1 == -0.14
    assert cs_track.edge_mode == "crop_zoom"
    assert cs_track.peak_velocity_px_s > 0.0
    assert "lenscorrection=" in cs_track.ffmpeg_vf
