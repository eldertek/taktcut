"""Unit tests for DaVinci Resolve Speed Editor & Optical-Flow Retime Studio."""

from __future__ import annotations

import json

import pytest

from taktcut.drp import validate_timeline
from taktcut.retime_studio import (
    ALLOWED_RETIME_STUDIO_DIRECTIONS,
    ALLOWED_RETIME_STUDIO_EASINGS,
    ALLOWED_RETIME_STUDIO_INTERPOLATIONS,
    ALLOWED_RETIME_STUDIO_PRESET_IDS,
    RetimeStudioConfig,
    RetimeStudioControlPoint,
    apply_retime_studio_to_document,
    build_retime_studio_atempo_stages,
    compile_retime_studio_filtergraph,
    evaluate_retime_studio_curve,
    evaluate_retime_studio_speed_at,
    export_retime_studio_json,
    get_retime_studio_preset,
    list_retime_studio_presets,
    normalize_retime_studio_config,
)
from taktcut.ui.samples import build_sample_timeline


def test_presets_and_validation_bounds() -> None:
    presets = list_retime_studio_presets()
    assert {p.preset_id for p in presets} == set(ALLOWED_RETIME_STUDIO_PRESET_IDS)
    assert len(presets) == 6

    hero = get_retime_studio_preset("hero_slowmo_drop")
    assert hero.default_config.interpolation == "optical_flow_minterpolate"
    assert hero.default_config.pitch_preserve is True

    whip = get_retime_studio_preset("action_speed_whip")
    assert max(p.speed_pct for p in whip.default_config.control_points) >= 600.0

    freeze = get_retime_studio_preset("freeze_frame_punch")
    assert freeze.default_config.freeze_enabled is True
    assert freeze.default_config.freeze_duration_s > 0.5

    boom = get_retime_studio_preset("reverse_boomerang")
    assert boom.default_config.boomerang is True
    assert boom.default_config.direction == "reverse"

    with pytest.raises(ValueError, match="Unsupported retime studio preset"):
        get_retime_studio_preset("nonexistent_retime")

    for bad in (True, float("nan"), float("inf"), 5.0, 1500.0):
        with pytest.raises(ValueError):
            RetimeStudioControlPoint(t_src_norm=0.5, speed_pct=bad)  # type: ignore[arg-type]

    for bad_t in (True, float("nan"), -0.1, 1.2):
        with pytest.raises(ValueError):
            RetimeStudioControlPoint(t_src_norm=bad_t, speed_pct=100.0)  # type: ignore[arg-type]

    with pytest.raises(ValueError):
        RetimeStudioControlPoint(t_src_norm=0.5, speed_pct=100.0, easing="cubic_bad")  # type: ignore[arg-type]

    with pytest.raises(ValueError):
        RetimeStudioConfig(interpolation="invalid_interp")  # type: ignore[arg-type]

    assert set(ALLOWED_RETIME_STUDIO_EASINGS) == {"linear", "bezier_smooth", "step_hold"}
    assert set(ALLOWED_RETIME_STUDIO_DIRECTIONS) == {"forward", "reverse"}
    assert set(ALLOWED_RETIME_STUDIO_INTERPOLATIONS) == {
        "nearest",
        "frame_blend",
        "optical_flow_minterpolate",
    }


def test_speed_curve_easing_and_numerical_duration_integration() -> None:
    fast_200 = RetimeStudioConfig(
        source_duration_s=8.0,
        fps=25.0,
        control_points=[
            RetimeStudioControlPoint(t_src_norm=0.0, speed_pct=200.0, easing="linear"),
            RetimeStudioControlPoint(t_src_norm=1.0, speed_pct=200.0, easing="linear"),
        ],
    )
    ev_200 = evaluate_retime_studio_curve(fast_200)
    assert ev_200.output_duration_s == pytest.approx(4.0, abs=1e-2)
    assert ev_200.ripple_shift_s == pytest.approx(-4.0, abs=1e-2)
    assert ev_200.output_frames == 100
    assert ev_200.avg_speed_pct == pytest.approx(200.0, abs=0.5)

    slow_50 = RetimeStudioConfig(
        source_duration_s=8.0,
        fps=25.0,
        control_points=[
            RetimeStudioControlPoint(t_src_norm=0.0, speed_pct=50.0, easing="linear"),
            RetimeStudioControlPoint(t_src_norm=1.0, speed_pct=50.0, easing="linear"),
        ],
    )
    ev_50 = evaluate_retime_studio_curve(slow_50)
    assert ev_50.output_duration_s == pytest.approx(16.0, abs=1e-2)
    assert ev_50.ripple_shift_s == pytest.approx(8.0, abs=1e-2)
    assert ev_50.output_frames == 400

    # Step-hold retains p0 speed until end of segment
    step_pts = [
        RetimeStudioControlPoint(t_src_norm=0.0, speed_pct=100.0, easing="step_hold"),
        RetimeStudioControlPoint(t_src_norm=1.0, speed_pct=400.0, easing="step_hold"),
    ]
    assert evaluate_retime_studio_speed_at(step_pts, 0.5) == pytest.approx(100.0, abs=1e-4)
    assert evaluate_retime_studio_speed_at(step_pts, 1.0) == pytest.approx(400.0, abs=1e-4)

    # Freeze hold adds exact freeze_duration_s
    freeze_cfg = RetimeStudioConfig(
        source_duration_s=8.0,
        fps=25.0,
        freeze_enabled=True,
        freeze_at_norm=0.5,
        freeze_duration_s=2.0,
        control_points=[
            RetimeStudioControlPoint(t_src_norm=0.0, speed_pct=100.0, easing="linear"),
            RetimeStudioControlPoint(t_src_norm=1.0, speed_pct=100.0, easing="linear"),
        ],
    )
    ev_frz = evaluate_retime_studio_curve(freeze_cfg)
    assert ev_frz.output_duration_s == pytest.approx(10.0, abs=1e-2)
    assert ev_frz.ripple_shift_s == pytest.approx(2.0, abs=1e-2)
    assert ev_frz.freeze_out_start_s == pytest.approx(4.0, abs=1e-2)
    assert ev_frz.freeze_out_end_s == pytest.approx(6.0, abs=1e-2)

    # Disabled identity check
    disabled_cfg = fast_200.model_copy(update={"enabled": False})
    ev_dis = evaluate_retime_studio_curve(disabled_cfg)
    assert ev_dis.output_duration_s == pytest.approx(8.0, abs=1e-4)
    assert ev_dis.ripple_shift_s == pytest.approx(0.0, abs=1e-4)


def test_ffmpeg_filtergraph_compilation_and_atempo_rubberband() -> None:
    hero = normalize_retime_studio_config({"preset_id": "hero_slowmo_drop"})
    comp_hero = compile_retime_studio_filtergraph(hero)
    assert "setpts=" in comp_hero.vf_chain
    expected_mci = "minterpolate=fps=25:mi_mode=mci:mc_mode=aobmc:me_mode=bilat:vsbmc=1"
    assert expected_mci in comp_hero.vf_chain
    assert "tmix=frames=" in comp_hero.vf_chain
    assert "rubberband=tempo=" in comp_hero.af_chain
    assert "pitch=1.0" in comp_hero.af_chain

    # Pitch preserve off -> decomposed atempo stages
    stages_4x = build_retime_studio_atempo_stages(4.0)
    assert stages_4x == [2.0, 2.0]
    stages_10pct = build_retime_studio_atempo_stages(0.1)
    assert len(stages_10pct) >= 4
    assert all(0.5 <= s <= 2.0 for s in stages_10pct)

    hyper_atempo = normalize_retime_studio_config(
        {"preset_id": "hyperlapse_400", "pitch_preserve": False}
    )
    comp_hyper = compile_retime_studio_filtergraph(hyper_atempo)
    assert "minterpolate=fps=25:mi_mode=blend" in comp_hyper.vf_chain
    assert "atempo=2.0000" in comp_hyper.af_chain
    assert "rubberband" not in comp_hyper.af_chain

    # Freeze frame + reverse + boomerang
    frz = normalize_retime_studio_config(
        {"preset_id": "freeze_frame_punch", "direction": "reverse"}
    )
    comp_frz = compile_retime_studio_filtergraph(frz)
    assert "tpad=stop_mode=clone:stop_duration=1.500" in comp_frz.vf_chain
    assert "apad=pad_dur=1.500" in comp_frz.af_chain
    assert ",reverse" in comp_frz.vf_chain
    assert ",areverse" in comp_frz.af_chain

    boom = normalize_retime_studio_config({"preset_id": "reverse_boomerang"})
    comp_boom = compile_retime_studio_filtergraph(boom)
    assert "concat=n=2:v=1:a=0" in comp_boom.vf_chain
    assert "concat=n=2:v=0:a=1" in comp_boom.af_chain


def test_json_export_and_apply_to_document_with_ripple() -> None:
    cfg = normalize_retime_studio_config(
        {
            "preset_id": "action_speed_whip",
            "interpolation": "optical_flow_minterpolate",
            "freeze_enabled": True,
            "freeze_at_norm": 0.5,
            "freeze_duration_s": 1.0,
        }
    )
    exported = export_retime_studio_json(cfg, title="Car Chase Whip")
    assert exported.schema_version == "taktcut.retime_studio.v1"
    parsed = json.loads(exported.json_text)
    assert parsed["schema_version"] == "taktcut.retime_studio.v1"
    assert parsed["preset_id"] == "action_speed_whip"
    assert parsed["retime"]["interpolation"] == "optical_flow_minterpolate"
    assert len(parsed["control_points"]) == 4
    assert "minterpolate=" in parsed["ffmpeg"]["vf_chain"]

    doc = build_sample_timeline("clean")
    v1_before = next(t for t in doc.tracks if t.kind == "video" and t.index == 1)
    orig_clip0_dur = v1_before.clips[0].duration_frames
    orig_clip1_start = v1_before.clips[1].start_frame if len(v1_before.clips) > 1 else None

    updated = apply_retime_studio_to_document(doc, cfg, track_index=1, clip_index=0)
    val = validate_timeline(updated)
    assert val.valid is True, val.issues

    v1_after = next(t for t in updated.tracks if t.kind == "video" and t.index == 1)
    clip0 = v1_after.clips[0]
    assert clip0.retime_studio is not None
    assert clip0.retime_studio.preset_id == "action_speed_whip"
    assert clip0.retime_studio.interpolation == "optical_flow_minterpolate"
    assert clip0.retime_process == "optical_flow"
    if orig_clip1_start is not None:
        delta = clip0.duration_frames - orig_clip0_dur
        assert v1_after.clips[1].start_frame == orig_clip1_start + delta
