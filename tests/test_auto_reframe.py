"""Unit tests for taktcut.auto_reframe (Auto Reframe & Multi-Aspect Subject Tracking Studio)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from taktcut.auto_reframe import (
    AUTO_REFRAME_ASPECT_SPECS,
    AutoReframeConfig,
    AutoReframeSaliencySample,
    analyze_auto_reframe_clip,
    apply_auto_reframe_to_document,
    clear_auto_reframe_from_document,
    compile_auto_reframe_filtergraph,
    compute_crop_geometry,
    evaluate_auto_reframe_at_time,
    list_auto_reframe_aspect_specs,
    list_auto_reframe_motion_presets,
    normalize_auto_reframe_config,
    pan_to_subject,
    parse_ffmpeg_cropdetect_saliency,
    solve_smoothed_pan_keyframes,
    subject_to_pan,
)
from taktcut.models import (
    AutoReframeKeyframe,
    RationalFrameRate,
    TimelineClip,
    TimelineDocument,
    TimelineTrack,
)


def _sample_doc() -> TimelineDocument:
    return TimelineDocument(
        name="AutoReframe Test Seq",
        source_format="fcpxml",
        fps=RationalFrameRate(num=25, den=1),
        tracks=[
            TimelineTrack(
                kind="video",
                index=1,
                clips=[
                    TimelineClip(
                        name="Presenter_Wide",
                        track_index=1,
                        media_type="video",
                        start_frame=0,
                        duration_frames=250,
                        source_path="media/A001_Opening_Wide.mov",
                    )
                ],
            )
        ],
    )


def test_aspect_specs_and_motion_presets() -> None:
    aspects = list_auto_reframe_aspect_specs()
    assert [a.aspect_ratio for a in aspects] == ["9:16", "4:5", "1:1", "21:9", "16:9"]
    assert AUTO_REFRAME_ASPECT_SPECS["9:16"].target_width == 1080
    assert AUTO_REFRAME_ASPECT_SPECS["9:16"].target_height == 1920

    presets = list_auto_reframe_motion_presets()
    assert [p.preset for p in presets] == ["slower", "default", "faster"]
    assert presets[0].smoothing_window > presets[1].smoothing_window > presets[2].smoothing_window
    assert presets[0].max_pan_velocity < presets[1].max_pan_velocity < presets[2].max_pan_velocity


def test_config_normalization_and_validation() -> None:
    cfg_alias = normalize_auto_reframe_config(
        {"aspect_ratio": "2.39:1", "motion_preset": "faster", "subject_priority": "face_headroom"}
    )
    assert cfg_alias.aspect_ratio == "21:9"
    assert cfg_alias.motion_preset == "faster"
    assert cfg_alias.headroom_bias == pytest.approx(-0.18)

    with pytest.raises(ValidationError):
        AutoReframeConfig(aspect_ratio="3:2")  # type: ignore[arg-type]

    with pytest.raises(ValidationError):
        AutoReframeConfig(motion_preset="turbo")  # type: ignore[arg-type]

    with pytest.raises(ValidationError):
        AutoReframeConfig(unknown_key=42)  # type: ignore[call-arg]


def test_crop_geometry_and_subject_pan_mapping() -> None:
    cw, ch, sx, sy = compute_crop_geometry(1920, 1080, "9:16")
    assert cw == 608
    assert ch == 1080
    assert cw % 2 == 0 and ch % 2 == 0
    assert sx == 1920 - 608
    assert sy == 0

    cw21, ch21, sx21, sy21 = compute_crop_geometry(1920, 1080, "21:9")
    assert cw21 == 1920
    assert ch21 == 822
    assert sx21 == 0
    assert sy21 > 0

    pan_left, _ = subject_to_pan(0.05, 0.5, 1920, 1080, "9:16")
    pan_right, _ = subject_to_pan(0.95, 0.5, 1920, 1080, "9:16")
    assert pan_left == pytest.approx(-1.0)
    assert pan_right == pytest.approx(1.0)

    mid_px, mid_py = subject_to_pan(0.65, 0.5, 1920, 1080, "9:16")
    inv_sx, _ = pan_to_subject(mid_px, mid_py, 1920, 1080, "9:16")
    assert inv_sx == pytest.approx(0.65, abs=0.01)


def test_slower_vs_faster_motion_and_scene_cut_snap() -> None:
    samples = [
        AutoReframeSaliencySample(time_s=0.0, frame=0, subject_x=0.25, subject_y=0.45),
        AutoReframeSaliencySample(time_s=0.5, frame=12, subject_x=0.28, subject_y=0.45),
        AutoReframeSaliencySample(time_s=1.0, frame=25, subject_x=0.26, subject_y=0.45),
        # Hard scene-cut jump (> 0.42)
        AutoReframeSaliencySample(time_s=1.5, frame=38, subject_x=0.82, subject_y=0.44),
        AutoReframeSaliencySample(time_s=2.0, frame=50, subject_x=0.84, subject_y=0.44),
    ]
    cfg_slow = normalize_auto_reframe_config({"aspect_ratio": "9:16", "motion_preset": "slower"})
    cfg_fast = normalize_auto_reframe_config({"aspect_ratio": "9:16", "motion_preset": "faster"})

    kfs_slow = solve_smoothed_pan_keyframes(samples, cfg_slow)
    kfs_fast = solve_smoothed_pan_keyframes(samples, cfg_fast)
    assert len(kfs_slow) >= 2
    assert len(kfs_fast) >= len(kfs_slow)

    # Hard cut at t=1.5s should snap right instead of lagging at negative pan
    ev_after_cut = evaluate_auto_reframe_at_time(kfs_fast, 1.5)
    assert ev_after_cut.pan_x > 0.5


def test_parse_ffmpeg_cropdetect_and_filtergraph_compile() -> None:
    stderr = (
        "[Parsed_cropdetect_1 @ 0x1] x1:320 x2:1280 y1:0 y2:1079 w:960 h:1072 "
        "x:320 y:4 pts:0 t:0.000000 crop=960:1072:320:4\n"
        "[Parsed_cropdetect_1 @ 0x1] x1:640 x2:1600 y1:0 y2:1079 w:960 h:1072 "
        "x:640 y:4 pts:25 t:1.000000 crop=960:1072:640:4\n"
    )
    parsed = parse_ffmpeg_cropdetect_saliency(stderr, 1920, 1080, 25.0)
    assert len(parsed) == 2
    assert parsed[0].subject_x < parsed[1].subject_x

    cfg = normalize_auto_reframe_config({"aspect_ratio": "9:16", "motion_preset": "default"})
    kfs = [
        AutoReframeKeyframe(time_s=0.0, frame=0, pan_x=-0.5, pan_y=0.0),
        AutoReframeKeyframe(time_s=2.0, frame=50, pan_x=0.5, pan_y=0.0),
    ]
    compiled = compile_auto_reframe_filtergraph(cfg, kfs)
    assert compiled.is_active is True
    assert compiled.output_width == 1080
    assert compiled.output_height == 1920
    assert (
        "crop=w=608:h=1080:x='max(0,min(iw-ow,(iw-ow)/2*(1+(if(lt(t,2.000),"
        in compiled.filtergraph
    )
    assert "scale=1080:1920:flags=lanczos,setsar=1" in compiled.filtergraph

    disabled_cfg = cfg.model_copy(update={"enabled": False})
    disabled_res = compile_auto_reframe_filtergraph(disabled_cfg, kfs)
    assert disabled_res.is_active is False
    assert disabled_res.filtergraph == "null"


def test_analyze_and_apply_clear_on_timeline_document() -> None:
    doc = _sample_doc()
    analysis = analyze_auto_reframe_clip(
        config={"aspect_ratio": "4:5", "motion_preset": "default", "duration_s": 10.0},
        clip_name="Presenter_Wide",
    )
    assert analysis.probe_source == "procedural_saliency"
    assert analysis.stats.keyframe_count == len(analysis.keyframes)
    assert analysis.compiled.output_width == 1080
    assert analysis.compiled.output_height == 1350

    applied = apply_auto_reframe_to_document(
        doc,
        track_kind="video",
        track_index=1,
        clip_index=0,
        config={"aspect_ratio": "9:16", "motion_preset": "slower"},
        keyframes=analysis.keyframes,
    )
    assert applied.changed is True
    clip_ar = applied.document.tracks[0].clips[0].auto_reframe
    assert clip_ar is not None
    assert clip_ar.aspect_ratio == "9:16"
    assert len(clip_ar.keyframes) == len(analysis.keyframes)

    cleared = clear_auto_reframe_from_document(
        applied.document,
        track_kind="video",
        track_index=1,
        clip_index=0,
    )
    assert cleared.changed is True
    assert cleared.document.tracks[0].clips[0].auto_reframe is None
