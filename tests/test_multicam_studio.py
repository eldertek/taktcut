"""Unit tests for Multi-Cam Angle Sync, Live Quad-View Switcher, Auto-Switch & EDL Export."""

from __future__ import annotations

import json

import pytest

from taktcut.drp import validate_timeline
from taktcut.models import TimelineDocument
from taktcut.multicam_studio import (
    ALLOWED_MULTICAM_STUDIO_PRESET_IDS,
    MulticamStudioAngleSpec,
    MulticamStudioConfig,
    MulticamStudioCutPoint,
    apply_multicam_studio_to_document,
    auto_switch_multicam_speakers,
    compile_multicam_studio_filtergraph,
    correlate_audio_envelopes,
    export_multicam_edl,
    get_multicam_studio_preset,
    list_multicam_studio_presets,
    normalize_multicam_studio_config,
    resolve_multicam_studio_segments,
    sync_multicam_studio_angles,
    synthesize_angle_waveform,
)
from taktcut.ui.samples import build_sample_timeline


def test_presets_cover_all_required_modes() -> None:
    presets = list_multicam_studio_presets()
    ids = {p.preset_id for p in presets}
    assert ids == set(ALLOWED_MULTICAM_STUDIO_PRESET_IDS)

    podcast = get_multicam_studio_preset("podcast_4cam_interview")
    assert podcast.angle_count == 4
    assert podcast.default_sync_mode == "audio_waveform"
    assert podcast.default_audio_follow_video is True

    concert = get_multicam_studio_preset("concert_3cam_audio_lock")
    assert concert.angle_count == 3
    assert concert.default_sync_mode == "timecode"
    assert concert.default_cut_mode == "video_only"

    tutorial = get_multicam_studio_preset("tutorial_2cam_pip_switch")
    assert tutorial.angle_count == 2
    assert tutorial.default_sync_mode == "slate_marker"

    with pytest.raises(ValueError, match="Unsupported multicam preset"):
        get_multicam_studio_preset("unknown_preset")


def test_audio_waveform_cross_correlation_recovers_lag() -> None:
    fps = 25.0
    ref_env = synthesize_angle_waveform(
        1,
        duration_s=12.0,
        shift_frames=0,
        fps=fps,
        preset_id="concert_3cam_audio_lock",
        slate_frame=15,
    )
    cand_env = synthesize_angle_waveform(
        2,
        duration_s=12.0,
        shift_frames=-10,
        fps=fps,
        preset_id="concert_3cam_audio_lock",
        slate_frame=25,
    )
    offset_frames, micro_trim_ms, confidence = correlate_audio_envelopes(
        ref_env,
        cand_env,
        fps=fps,
    )
    assert abs(offset_frames - (-10)) <= 2
    assert -25.0 <= micro_trim_ms <= 25.0
    assert confidence > 0.70


def test_sync_modes_timecode_slate_and_audio_waveform() -> None:
    cfg_tc = normalize_multicam_studio_config(
        {
            "preset_id": "concert_3cam_audio_lock",
            "sync_mode": "timecode",
            "fps": 25.0,
        }
    )
    res_tc = sync_multicam_studio_angles(cfg_tc)
    assert len(res_tc.angles) == 3
    assert res_tc.angles[0].offset_frames == 0
    assert res_tc.angles[1].offset_frames == 18
    assert res_tc.angles[1].offset_s == pytest.approx(18 / 25.0, abs=1e-4)
    assert res_tc.angles[2].offset_frames == -9

    cfg_slate = cfg_tc.model_copy(update={"sync_mode": "slate_marker"})
    res_slate = sync_multicam_studio_angles(cfg_slate)
    assert res_slate.angles[1].offset_frames == 14 - 32
    assert res_slate.angles[2].offset_frames == 14 - 5

    cfg_wave = cfg_tc.model_copy(update={"sync_mode": "audio_waveform"})
    res_wave = sync_multicam_studio_angles(cfg_wave)
    assert res_wave.mean_confidence >= 0.5
    assert all(len(a.waveform_envelope) >= 20 for a in res_wave.angles)


def test_short_cut_detection_and_master_audio_lock_vs_afv() -> None:
    cfg_locked = MulticamStudioConfig(
        preset_id="custom",
        cut_mode="video_only",
        audio_follow_video=False,
        master_audio_angle=1,
        min_hold_ms=500,
        duration_s=10.0,
        cuts=[
            MulticamStudioCutPoint(time_s=0.0, angle_index=1),
            MulticamStudioCutPoint(time_s=2.0, angle_index=2),
            MulticamStudioCutPoint(time_s=2.2, angle_index=3),
            MulticamStudioCutPoint(time_s=6.0, angle_index=4),
        ],
    )
    segs_locked, warnings_locked = resolve_multicam_studio_segments(cfg_locked)
    assert len(segs_locked) == 4
    assert segs_locked[1].is_short_cut is True
    assert segs_locked[1].duration_ms == 200
    assert len(warnings_locked) == 1
    assert all(s.audio_angle_index == 1 for s in segs_locked)

    cfg_afv = cfg_locked.model_copy(
        update={
            "cut_mode": "video_and_audio",
            "audio_follow_video": True,
        }
    )
    segs_afv, _ = resolve_multicam_studio_segments(cfg_afv)
    assert [s.audio_angle_index for s in segs_afv] == [1, 2, 3, 4]


def test_auto_switch_speaker_enforces_min_hold_and_detects_turns() -> None:
    cfg = normalize_multicam_studio_config(
        {
            "preset_id": "podcast_4cam_interview",
            "min_hold_ms": 800,
            "speaker_threshold_db": -28.0,
            "speaker_hysteresis_db": 2.5,
            "duration_s": 16.0,
        }
    )
    res = auto_switch_multicam_speakers(cfg)
    assert len(res.segments) >= 3
    assert res.short_cut_count == 0
    assert all(seg.duration_ms >= 800 for seg in res.segments)
    assert sum(res.speaker_activity_ratio.values()) == pytest.approx(1.0, abs=0.05)


def test_compile_program_stitch_and_quad_view_with_red_tally() -> None:
    cfg = normalize_multicam_studio_config({"preset_id": "podcast_4cam_interview"})

    res_prog = compile_multicam_studio_filtergraph(cfg, mode="program_stitch")
    assert res_prog.mode == "program_stitch"
    assert "trim=start=" in res_prog.filter_complex
    assert "concat=n=" in res_prog.filter_complex
    assert "[v_mc]" in res_prog.filter_complex
    assert "[a_mc]" in res_prog.filter_complex

    res_quad = compile_multicam_studio_filtergraph(cfg, mode="quad_view")
    assert res_quad.mode == "quad_view"
    assert "xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0" in res_quad.filter_complex
    assert "drawbox=" in res_quad.filter_complex
    assert "#e53935" in res_quad.filter_complex
    assert "drawtext=" in res_quad.filter_complex
    assert "[v_mc_quad]" in res_quad.filter_complex


def test_export_cmx3600_edl_timeline_json_and_apply_to_document() -> None:
    cfg = normalize_multicam_studio_config({"preset_id": "tutorial_2cam_pip_switch"})
    exported = export_multicam_edl(cfg, title="Studio Demo", fmt="edl")
    assert "TITLE: STUDIO_DEMO" in exported.edl_text
    assert "FCM: NON-DROP FRAME" in exported.edl_text
    assert "CAM_1" in exported.edl_text
    assert "CAM_2" in exported.edl_text

    parsed_doc = TimelineDocument.model_validate(json.loads(exported.timeline_json))
    val = validate_timeline(parsed_doc)
    assert not any(
        issue.kind in ("overlap", "zero_duration", "fps_mismatch") for issue in val.issues
    )

    sample_doc = build_sample_timeline("clean")
    applied = apply_multicam_studio_to_document(sample_doc, cfg, track_index=1, clip_index=0)
    bank = applied.tracks[0].clips[0].multicam_bank
    assert bank is not None
    assert len(bank.angles) == 2
    assert len(bank.cuts) == len(cfg.cuts)


def test_invalid_timecode_rejected() -> None:
    with pytest.raises(ValueError, match="Invalid SMPTE timecode"):
        MulticamStudioAngleSpec(angle_index=1, name="CAM 1", timecode_start="bad-tc")
