"""Unit tests for AE / Fusion Keyframe Spline, Speed Graph & Optical Motion Blur Studio."""

from __future__ import annotations

import json

import pytest

from taktcut.drp import validate_timeline
from taktcut.motion_spline_studio import (
    ALLOWED_MOTION_SPLINE_CHANNELS,
    ALLOWED_MOTION_SPLINE_PRESET_IDS,
    MotionBlurConfig,
    MotionSplineChannelTrack,
    MotionSplineKeyframe,
    MotionSplineStudioConfig,
    apply_motion_spline_to_document,
    compile_motion_spline_filtergraph,
    evaluate_motion_blur_at_t,
    evaluate_motion_spline_studio,
    evaluate_spline_at_t,
    export_motion_spline_json,
    get_motion_spline_preset,
    list_motion_spline_presets,
    normalize_motion_spline_config,
    solve_cubic_bezier_x,
)
from taktcut.ui.samples import build_sample_timeline


def test_presets_cover_all_required_modes() -> None:
    presets = list_motion_spline_presets()
    assert {p.preset_id for p in presets} == set(ALLOWED_MOTION_SPLINE_PRESET_IDS)

    whip = get_motion_spline_preset("whip_zoom_punch")
    assert whip.default_shutter_angle_deg == 220.0
    assert set(whip.default_config.channels.keys()) == set(ALLOWED_MOTION_SPLINE_CHANNELS)

    with pytest.raises(ValueError, match="Unsupported motion spline preset"):
        get_motion_spline_preset("nonexistent_curve")


def test_bezier_newton_raphson_and_speed_derivative_modes() -> None:
    # Monotonic cubic Bezier X inversion check
    for p1x, p2x in ((0.33, 0.67), (0.85, 0.15), (0.1, 0.9)):
        for target in (0.0, 0.15, 0.5, 0.85, 1.0):
            u = solve_cubic_bezier_x(target, p1x, p2x)
            inv = 1.0 - u
            bx = 3.0 * inv * inv * u * p1x + 3.0 * inv * u * u * p2x + u * u * u
            assert bx == pytest.approx(target, abs=1e-5)

    # Linear: constant velocity dx/dt = (200 - 100) / 2.0 = 50.0 u/s
    lin_kfs = [
        MotionSplineKeyframe(time_s=0.0, value=100.0, mode="linear"),
        MotionSplineKeyframe(time_s=2.0, value=200.0, mode="linear"),
    ]
    mid_lin = evaluate_spline_at_t(lin_kfs, 1.0)
    assert mid_lin.value == pytest.approx(150.0, abs=1e-3)
    assert mid_lin.velocity_unit_s == pytest.approx(50.0, abs=1e-2)

    # Easy Ease: AE bell-shaped velocity peaks at midpoint (> linear average) and 0 at ends
    ease_kfs = [
        MotionSplineKeyframe(time_s=0.0, value=100.0, mode="easy_ease"),
        MotionSplineKeyframe(time_s=2.0, value=200.0, mode="easy_ease"),
    ]
    start_ease = evaluate_spline_at_t(ease_kfs, 0.0)
    mid_ease = evaluate_spline_at_t(ease_kfs, 1.0)
    assert start_ease.velocity_unit_s == pytest.approx(0.0, abs=1e-3)
    assert mid_ease.value == pytest.approx(150.0, abs=1e-2)
    assert mid_ease.velocity_unit_s > 70.0

    # Hold: constant step value and 0 velocity before next keyframe
    hold_kfs = [
        MotionSplineKeyframe(time_s=0.0, value=100.0, mode="hold"),
        MotionSplineKeyframe(time_s=2.0, value=200.0, mode="easy_ease"),
    ]
    mid_hold = evaluate_spline_at_t(hold_kfs, 1.2)
    assert mid_hold.value == pytest.approx(100.0, abs=1e-4)
    assert mid_hold.velocity_unit_s == 0.0

    # Overshoot: exceeds target value before settling
    over_kfs = [
        MotionSplineKeyframe(
            time_s=0.0,
            value=0.0,
            mode="overshoot",
            out_handle_x=0.22,
            out_handle_y=0.0,
        ),
        MotionSplineKeyframe(
            time_s=1.0,
            value=100.0,
            mode="overshoot",
            in_handle_x=0.58,
            in_handle_y=1.34,
        ),
    ]
    samples = [evaluate_spline_at_t(over_kfs, t / 40.0).value for t in range(41)]
    assert max(samples) > 103.0


def test_optical_shutter_angle_motion_blur_physics() -> None:
    cfg_220 = normalize_motion_spline_config(
        {
            "preset_id": "whip_zoom_punch",
            "motion_blur": {
                "enabled": True,
                "shutter_angle_deg": 220.0,
                "shutter_phase_deg": -110.0,
                "samples": 16,
            },
        }
    )
    cfg_90 = cfg_220.model_copy(
        update={
            "motion_blur": MotionBlurConfig(
                enabled=True,
                shutter_angle_deg=90.0,
                shutter_phase_deg=-45.0,
                samples=16,
            )
        }
    )
    cfg_off = cfg_220.model_copy(
        update={
            "motion_blur": MotionBlurConfig(
                enabled=False,
                shutter_angle_deg=180.0,
                shutter_phase_deg=-90.0,
                samples=16,
            )
        }
    )

    peak_t = 0.45
    b220 = evaluate_motion_blur_at_t(cfg_220, peak_t)
    b90 = evaluate_motion_blur_at_t(cfg_90, peak_t)
    boff = evaluate_motion_blur_at_t(cfg_off, peak_t)

    assert b220.blur_streak_px > b90.blur_streak_px > 0.0
    assert boff.blur_streak_px == 0.0

    eval_res = evaluate_motion_spline_studio(cfg_220, active_time_s=peak_t)
    assert eval_res.peak_velocity_unit_s > 50.0
    assert eval_res.peak_blur_streak_px > 1.0
    assert len(eval_res.blur_envelope) == cfg_220.sample_count


def test_ffmpeg_compiler_export_json_and_apply_to_timeline() -> None:
    cfg = MotionSplineStudioConfig(
        preset_id="hero_title_overshoot",
        fps=25.0,
        duration_s=3.0,
        width=1920,
        height=1080,
        motion_blur=MotionBlurConfig(
            enabled=True,
            shutter_angle_deg=180.0,
            shutter_phase_deg=-90.0,
            samples=16,
        ),
        channels={
            "scale_pct": MotionSplineChannelTrack(
                channel="scale_pct",
                keyframes=[
                    MotionSplineKeyframe(time_s=0.0, value=65.0, mode="overshoot"),
                    MotionSplineKeyframe(
                        time_s=1.0,
                        value=100.0,
                        mode="overshoot",
                        in_handle_x=0.58,
                        in_handle_y=1.32,
                    ),
                ],
            ),
            "position_x_px": MotionSplineChannelTrack(
                channel="position_x_px",
                keyframes=[MotionSplineKeyframe(time_s=0.0, value=0.0, mode="linear")],
            ),
            "position_y_px": MotionSplineChannelTrack(
                channel="position_y_px",
                keyframes=[
                    MotionSplineKeyframe(time_s=0.0, value=120.0, mode="overshoot"),
                    MotionSplineKeyframe(time_s=1.0, value=0.0, mode="overshoot"),
                ],
            ),
            "rotation_deg": MotionSplineChannelTrack(
                channel="rotation_deg",
                keyframes=[
                    MotionSplineKeyframe(time_s=0.0, value=-4.0, mode="easy_ease"),
                    MotionSplineKeyframe(time_s=1.0, value=0.0, mode="easy_ease"),
                ],
            ),
            "opacity_pct": MotionSplineChannelTrack(
                channel="opacity_pct",
                keyframes=[
                    MotionSplineKeyframe(time_s=0.0, value=0.0, mode="easy_ease"),
                    MotionSplineKeyframe(time_s=0.6, value=100.0, mode="easy_ease"),
                ],
            ),
        },
    )

    compiled = compile_motion_spline_filtergraph(cfg)
    assert "minterpolate=fps=" in compiled.vf_chain
    assert "zoompan=z=" in compiled.vf_chain
    assert "rotate=a=" in compiled.vf_chain
    assert "crop=w=1920:h=1080" in compiled.vf_chain
    assert "colorchannelmixer=aa=" in compiled.vf_chain
    assert f"tmix=frames={compiled.tmix_frames}" in compiled.vf_chain
    assert compiled.shutter_fraction == pytest.approx(0.5, abs=1e-4)

    exported = export_motion_spline_json(cfg, title="Hero Intro")
    assert exported.schema_version == "taktcut.motion_spline.v1"
    parsed = json.loads(exported.json_text)
    assert "After Effects CC" in parsed["compatible_hosts"]
    assert "DaVinci Resolve Fusion" in parsed["compatible_hosts"]
    assert "after_effects_temporal_ease" in parsed["channels"]["scale_pct"]["keyframes"][0]
    assert "fusion_spline_handles" in parsed["channels"]["scale_pct"]["keyframes"][0]

    sample_doc = build_sample_timeline()
    applied_doc = apply_motion_spline_to_document(sample_doc, cfg, track_index=1, clip_index=0)
    val = validate_timeline(applied_doc)
    assert val.valid is True
    attached = applied_doc.tracks[0].clips[0].motion_spline
    assert attached is not None
    assert attached.preset_id == "hero_title_overshoot"
    assert attached.shutter_angle_deg == 180.0
    assert "scale_pct" in attached.channels
