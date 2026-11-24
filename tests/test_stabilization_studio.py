"""Unit tests for Camera Stabilization, Perspective Lock & Rolling-Shutter Studio."""

from __future__ import annotations

import json

import pytest

from taktcut.drp import validate_timeline
from taktcut.stabilization_studio import (
    ALLOWED_STABILIZATION_EDGE_MODES,
    ALLOWED_STABILIZATION_MODES,
    ALLOWED_STABILIZATION_PRESET_IDS,
    StabilizationStudioConfig,
    apply_stabilization_studio_to_document,
    compile_stabilization_studio_filtergraph,
    evaluate_stabilization_studio,
    export_stabilization_studio_json,
    get_stabilization_studio_preset,
    list_stabilization_studio_presets,
    normalize_stabilization_studio_config,
)
from taktcut.ui.samples import build_sample_timeline


def test_presets_and_validation_bounds() -> None:
    presets = list_stabilization_studio_presets()
    assert {p.preset_id for p in presets} == set(ALLOWED_STABILIZATION_PRESET_IDS)
    assert len(presets) == 5

    tripod = get_stabilization_studio_preset("tripod_perspective_lock")
    assert tripod.default_config.mode == "camera_lock"
    assert tripod.default_config.smoothing_pct >= 90.0

    jello = get_stabilization_studio_preset("rolling_shutter_fix")
    assert abs(jello.default_config.rolling_shutter_skew_ms) >= 15.0

    gimbal = get_stabilization_studio_preset("action_gimbal_smooth")
    assert gimbal.default_config.edge_mode == "mirror_border"

    with pytest.raises(ValueError, match="Unsupported stabilization studio preset"):
        get_stabilization_studio_preset("nonexistent_stab")

    for bad_pct in (True, float("nan"), float("inf"), -1.0, 101.0):
        with pytest.raises(ValueError):
            StabilizationStudioConfig(smoothing_pct=bad_pct)  # type: ignore[arg-type]

    for bad_crop in (True, float("nan"), 0.45, 1.05):
        with pytest.raises(ValueError):
            StabilizationStudioConfig(crop_ratio_min=bad_crop)  # type: ignore[arg-type]

    for bad_skew in (True, float("nan"), -45.0, 45.0):
        with pytest.raises(ValueError):
            StabilizationStudioConfig(rolling_shutter_skew_ms=bad_skew)  # type: ignore[arg-type]

    with pytest.raises(ValueError):
        StabilizationStudioConfig(mode="invalid_mode")  # type: ignore[arg-type]

    with pytest.raises(ValueError):
        StabilizationStudioConfig(edge_mode="invalid_edge")  # type: ignore[arg-type]

    assert set(ALLOWED_STABILIZATION_MODES) == {
        "perspective",
        "similarity",
        "translation",
        "camera_lock",
    }
    assert set(ALLOWED_STABILIZATION_EDGE_MODES) == {
        "crop_zoom",
        "mirror_border",
        "black",
    }


def test_deterministic_trajectory_and_crop_box_math() -> None:
    glide = normalize_stabilization_studio_config({"preset_id": "handheld_cinema_glide"})
    ev_glide = evaluate_stabilization_studio(glide, sample_count=65)
    assert len(ev_glide.samples) == 65
    assert ev_glide.raw_rms_px > ev_glide.stabilized_rms_px
    assert ev_glide.jitter_reduction_pct >= 65.0
    assert 1.0 <= ev_glide.zoom_compensation_ratio <= 1.25

    tripod = normalize_stabilization_studio_config({"preset_id": "tripod_perspective_lock"})
    ev_tripod = evaluate_stabilization_studio(tripod, sample_count=65)
    assert ev_tripod.stabilized_rms_px < ev_glide.stabilized_rms_px
    assert ev_tripod.jitter_reduction_pct >= 90.0
    assert ev_tripod.jello_repair_pct > 0.0

    # Restricting crop_ratio_min too tightly triggers border_clipping_risk
    tight_crop = normalize_stabilization_studio_config(
        {
            "preset_id": "tripod_perspective_lock",
            "crop_ratio_min": 0.99,
            "auto_zoom_fill": True,
            "edge_mode": "crop_zoom",
        }
    )
    ev_tight = evaluate_stabilization_studio(tight_crop)
    assert ev_tight.border_clipping_risk is True

    # Disabled bypass
    bypass = StabilizationStudioConfig(enabled=False)
    ev_bypass = evaluate_stabilization_studio(bypass)
    assert ev_bypass.jitter_reduction_pct == 0.0
    assert ev_bypass.zoom_compensation_ratio == 1.0
    assert ev_bypass.effective_crop_ratio == 1.0


def test_compile_ffmpeg_and_export_json() -> None:
    cfg = normalize_stabilization_studio_config(
        {
            "preset_id": "rolling_shutter_fix",
            "rolling_shutter_skew_ms": -20.0,
        }
    )
    compiled = compile_stabilization_studio_filtergraph(cfg)
    assert "vidstabdetect=" in compiled.pass1_vidstabdetect
    assert "vidstabtransform=" in compiled.pass2_vidstabtransform
    assert "deshake=" in compiled.deshake_fallback_vf
    assert "shear=" in compiled.rolling_shutter_vf
    assert "perspective=" in compiled.rolling_shutter_vf
    assert "crop=" in compiled.crop_scale_vf
    assert "scale=1920:1080" in compiled.crop_scale_vf
    assert "vidstabtransform=" in compiled.vf_chain
    assert "perspective=" in compiled.vf_chain

    # Camera lock emits tripod=1 and warning
    lock_cfg = normalize_stabilization_studio_config({"preset_id": "tripod_perspective_lock"})
    lock_comp = compile_stabilization_studio_filtergraph(lock_cfg)
    assert "tripod=1" in lock_comp.pass1_vidstabdetect
    assert "tripod=1" in lock_comp.pass2_vidstabtransform
    assert any("Camera Lock" in w for w in lock_comp.warnings)

    # Disabled bypass
    bypass_comp = compile_stabilization_studio_filtergraph(
        StabilizationStudioConfig(enabled=False)
    )
    assert bypass_comp.vf_chain == "null"
    assert bypass_comp.pass1_vidstabdetect == "null"

    exported = export_stabilization_studio_json(cfg, title="Jello Fix / Demo!")
    assert exported.schema_version == "taktcut.stabilization_studio.v1"
    parsed = json.loads(exported.json_text)
    assert parsed["schema_version"] == "taktcut.stabilization_studio.v1"
    assert parsed["preset_id"] == "rolling_shutter_fix"
    assert parsed["stabilization"]["rolling_shutter_skew_ms"] == -20.0
    assert "vidstabtransform=" in parsed["ffmpeg"]["pass2_vidstabtransform"]


def test_apply_stabilization_studio_to_timeline_document() -> None:
    doc = build_sample_timeline("clean")
    cfg = normalize_stabilization_studio_config(
        {
            "preset_id": "tripod_perspective_lock",
            "rolling_shutter_skew_ms": -12.0,
        }
    )
    updated = apply_stabilization_studio_to_document(doc, cfg, track_index=1, clip_index=0)
    val = validate_timeline(updated)
    assert val.valid is True
    v1 = next(t for t in updated.tracks if t.kind == "video")
    stab = v1.clips[0].stabilization_studio
    assert stab is not None
    assert stab.preset_id == "tripod_perspective_lock"
    assert stab.mode == "camera_lock"
    assert stab.rolling_shutter_skew_ms == -12.0
    assert "vidstabtransform=" in stab.ffmpeg_vf
    assert "vidstabdetect=" in stab.ffmpeg_pass1_vf
