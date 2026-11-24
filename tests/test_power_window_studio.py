"""Unit tests for DaVinci Resolve Power Windows, Keyframed Shape Mask & 4-Point Planar Tracker."""

from __future__ import annotations

import json
import math

import pytest

from taktcut.drp import validate_timeline
from taktcut.power_window_studio import (
    ALLOWED_POWER_WINDOW_PRESET_IDS,
    ALLOWED_POWER_WINDOW_SHAPE_TYPES,
    ALLOWED_POWER_WINDOW_VIEW_MODES,
    PowerWindowConfig,
    PowerWindowInterpolatedGeometry,
    apply_homography_to_uv,
    apply_power_window_to_document,
    compile_power_window_filtergraph,
    compute_planar_homography_dlt,
    evaluate_power_window_mask_at_uv,
    evaluate_power_window_samples,
    export_power_window_json,
    get_power_window_preset,
    interpolate_power_window_at_time,
    invert_3x3_matrix,
    list_power_window_presets,
    normalize_power_window_config,
    simulate_power_window_track,
)
from taktcut.ui.samples import build_sample_timeline


def test_presets_and_validation_bounds() -> None:
    presets = list_power_window_presets()
    assert {p.preset_id for p in presets} == set(ALLOWED_POWER_WINDOW_PRESET_IDS)

    portrait = get_power_window_preset("portrait_spotlight_oval")
    assert portrait.default_config.shape_type == "ellipse"
    assert portrait.default_config.inside_exposure_ev > 0.0
    assert portrait.default_config.outside_blur_px > 0.0

    plate = get_power_window_preset("privacy_plate_pixelate")
    assert plate.default_config.shape_type == "rounded_box"
    assert plate.default_config.inside_pixelate_size >= 12

    billboard = get_power_window_preset("billboard_corner_pin")
    assert billboard.default_config.shape_type == "planar_quad"

    with pytest.raises(ValueError, match="Unsupported power window preset"):
        get_power_window_preset("nonexistent_window")

    for bad in (True, float("nan"), float("inf"), -0.5, 1.5):
        with pytest.raises(ValueError):
            PowerWindowConfig(cx=bad)  # type: ignore[arg-type]

    with pytest.raises(ValueError):
        PowerWindowConfig(inside_exposure_ev=5.0)
    with pytest.raises(ValueError):
        PowerWindowConfig(inside_pixelate_size=0)
    with pytest.raises(ValueError):
        PowerWindowConfig(quad_corners=((0.1, 0.1), (0.9, 0.1)))  # type: ignore[arg-type]


def test_planar_homography_dlt_and_inverse_accuracy() -> None:
    src = ((0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0))
    dst = ((0.53, 0.16), (0.88, 0.23), (0.84, 0.56), (0.50, 0.48))
    h_mat = compute_planar_homography_dlt(src, dst)
    inv_h = invert_3x3_matrix(h_mat)

    for (sx, sy), (dx, dy) in zip(src, dst, strict=True):
        px, py = apply_homography_to_uv(h_mat, sx, sy)
        assert px == pytest.approx(dx, abs=1e-4)
        assert py == pytest.approx(dy, abs=1e-4)

        rx, ry = apply_homography_to_uv(inv_h, dx, dy)
        assert rx == pytest.approx(sx, abs=1e-4)
        assert ry == pytest.approx(sy, abs=1e-4)


def test_keyframe_tracking_simulation_and_interpolation() -> None:
    cfg = normalize_power_window_config({"preset_id": "privacy_plate_pixelate"})
    trk = simulate_power_window_track(cfg, num_keyframes=9, drift_x=0.20, drift_y=0.05)
    assert trk.frame_count == 9
    assert len(trk.keyframes) == 9
    assert trk.total_displacement_px > 100.0
    assert 0.70 <= trk.mean_confidence <= 1.0
    assert trk.keyframes[0].t_norm == pytest.approx(0.0, abs=1e-4)
    assert trk.keyframes[-1].t_norm == pytest.approx(1.0, abs=1e-4)

    tracked_cfg = cfg.model_copy(update={"track_keyframes": trk.keyframes})
    g0 = interpolate_power_window_at_time(tracked_cfg, 0.0)
    g_mid = interpolate_power_window_at_time(tracked_cfg, 0.5)
    g1 = interpolate_power_window_at_time(tracked_cfg, 1.0)
    assert g1.cx > g_mid.cx > g0.cx


def test_shape_masks_and_inside_outside_evaluator() -> None:
    for shape in ALLOWED_POWER_WINDOW_SHAPE_TYPES:
        geom = PowerWindowInterpolatedGeometry(
            t_norm=0.0,
            shape_type=shape,
            cx=0.5,
            cy=0.5,
            rx=0.22,
            ry=0.22,
            rotation_deg=0.0,
            corner_radius=0.2,
            softness_px=24.0,
            invert_matte=False,
            quad_corners=((0.3, 0.3), (0.7, 0.3), (0.7, 0.7), (0.3, 0.7)),
            homography_3x3=[[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
        )
        v_in = 0.42 if shape == "linear_gradient" else 0.5
        m_center = evaluate_power_window_mask_at_uv(geom, 0.5, v_in)
        m_corner = evaluate_power_window_mask_at_uv(geom, 0.05, 0.95)
        assert m_center > 0.85
        assert m_corner < 0.15

        inv_geom = geom.model_copy(update={"invert_matte": True})
        m_inv_corner = evaluate_power_window_mask_at_uv(inv_geom, 0.05, 0.95)
        assert m_inv_corner == pytest.approx(1.0 - m_corner, abs=1e-5)

    # Inside lift + outside darkening produces higher inside mean luma than outside
    cfg = normalize_power_window_config({"preset_id": "portrait_spotlight_oval"})
    res = evaluate_power_window_samples(cfg)
    assert res.sample_count == 24 * 16
    assert 5.0 < res.inside_coverage_pct < 60.0
    assert res.mean_luma_inside > res.mean_luma_outside
    assert sum(res.luma_histogram_before) == res.sample_count
    assert sum(res.luma_histogram_after) == res.sample_count
    assert len(res.matte_map) == res.sample_count

    # Bypass leaves luma unchanged
    off_res = evaluate_power_window_samples(cfg.model_copy(update={"enabled": False}))
    assert off_res.mean_luma_after == pytest.approx(off_res.mean_luma_before, abs=1e-4)

    # Custom 4x4 buffer with matte_bw inspection
    pixels = [128.0, 128.0, 128.0, 255.0] * 16
    matte_res = evaluate_power_window_samples(
        cfg.model_copy(update={"view_mode": "matte_bw"}),
        width=4,
        height=4,
        pixels=pixels,
    )
    assert matte_res.sample_count == 16
    r0, g0, b0 = matte_res.preview_rgb_map[0]
    assert r0 == g0 == b0


def test_ffmpeg_compiler_export_json_and_apply_timeline() -> None:
    for shape in ALLOWED_POWER_WINDOW_SHAPE_TYPES:
        pid = "billboard_corner_pin" if shape == "planar_quad" else "privacy_plate_pixelate"
        cfg = normalize_power_window_config(
            {
                "preset_id": pid,
                "shape_type": shape,
            }
        )
        comp = compile_power_window_filtergraph(cfg)
        assert comp.enabled is True
        assert "geq=" in comp.vf_chain
        assert "maskedmerge" in comp.vf_chain
        if shape == "planar_quad":
            assert "perspective=" in comp.vf_chain
            assert comp.has_planar_pin is True

    for vm in ALLOWED_POWER_WINDOW_VIEW_MODES:
        vm_comp = compile_power_window_filtergraph(
            normalize_power_window_config({"preset_id": "portrait_spotlight_oval", "view_mode": vm})
        )
        assert vm_comp.view_mode == vm
        if vm == "matte_bw":
            assert "geq=lum=" in vm_comp.vf_chain

    off_comp = compile_power_window_filtergraph(normalize_power_window_config({"enabled": False}))
    assert off_comp.vf_chain == "null"

    cfg_pin = normalize_power_window_config({"preset_id": "billboard_corner_pin"})
    trk = simulate_power_window_track(cfg_pin, num_keyframes=5)
    cfg_tracked = cfg_pin.model_copy(update={"track_keyframes": trk.keyframes})

    exported = export_power_window_json(cfg_tracked, title="Billboard Pin")
    assert exported.schema_version == "taktcut.power_window.v1"
    parsed = json.loads(exported.json_text)
    assert len(parsed["homography_3x3"]) == 3
    assert len(parsed["track_keyframes"]) == 5
    assert "DaVinci Resolve Studio Color" in parsed["compatible_hosts"]

    doc = build_sample_timeline("clean")
    applied = apply_power_window_to_document(doc, cfg_tracked, track_index=1, clip_index=0)
    val = validate_timeline(applied)
    assert val.valid is True
    attached = applied.tracks[0].clips[0].power_window
    assert attached is not None
    assert attached.preset_id == "billboard_corner_pin"
    assert attached.shape_type == "planar_quad"
    assert len(attached.track_keyframes) == 5
    assert len(attached.homography_3x3) == 3
    assert math.isfinite(attached.inside_coverage_pct)
    assert "perspective=" in attached.ffmpeg_vf
