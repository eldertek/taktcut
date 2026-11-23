"""Unit tests for Multi-Cam Angle Sync Bank, Live Cut Switcher, Flatten & FFmpeg Compiler."""

from __future__ import annotations

import pytest

from taktcut.drp import validate_timeline
from taktcut.models import (
    MulticamAngle,
    RationalFrameRate,
    TimelineClip,
    TimelineDocument,
    TimelineTrack,
)
from taktcut.multicam import (
    compile_multicam_filtergraph,
    compute_multicam_segments,
    count_multicam_clips,
    create_multicam_clip,
    delete_multicam_cut,
    flatten_multicam_clip,
    frames_to_smpte,
    resolve_active_angle_at_frame,
    smpte_to_frames,
    switch_multicam_angle,
    sync_multicam_clip,
    update_multicam_angle,
)


def _sample_single_track_doc() -> TimelineDocument:
    fps25 = RationalFrameRate(num=25, den=1)
    return TimelineDocument(
        name="Multicam_Show_25p",
        source_format="drt",
        fps=fps25,
        width=1920,
        height=1080,
        start_frame=0,
        tracks=[
            TimelineTrack(
                index=1,
                kind="video",
                name="V1 Main",
                clips=[
                    TimelineClip(
                        name="Interview_Master",
                        track_index=1,
                        media_type="video",
                        start_frame=0,
                        duration_frames=200,
                        source_in_frame=25,
                        source_path="media/interview_camA.mov",
                        source_fps=fps25,
                    ),
                    TimelineClip(
                        name="Outro_Title",
                        track_index=1,
                        media_type="video",
                        start_frame=200,
                        duration_frames=50,
                        source_in_frame=0,
                        source_path="media/outro.mov",
                        source_fps=fps25,
                    ),
                ],
            ),
            TimelineTrack(
                index=1,
                kind="audio",
                name="A1 Boom",
                clips=[
                    TimelineClip(
                        name="Boom_Mix",
                        track_index=1,
                        media_type="audio",
                        start_frame=0,
                        duration_frames=250,
                        source_in_frame=0,
                        source_path="audio/boom.wav",
                    )
                ],
            ),
        ],
    )


def _sample_stacked_tracks_doc() -> TimelineDocument:
    fps25 = RationalFrameRate(num=25, den=1)
    return TimelineDocument(
        name="Live_Session_3Cam",
        source_format="drt",
        fps=fps25,
        width=1920,
        height=1080,
        start_frame=0,
        tracks=[
            TimelineTrack(
                index=1,
                kind="video",
                name="V1",
                clips=[
                    TimelineClip(
                        name="Cam_Wide",
                        track_index=1,
                        media_type="video",
                        start_frame=0,
                        duration_frames=180,
                        source_in_frame=10,
                        source_path="media/cam1.mov",
                    )
                ],
            ),
            TimelineTrack(
                index=2,
                kind="video",
                name="V2",
                clips=[
                    TimelineClip(
                        name="Cam_Mid",
                        track_index=2,
                        media_type="video",
                        start_frame=0,
                        duration_frames=180,
                        source_in_frame=22,
                        source_path="media/cam2.mov",
                    )
                ],
            ),
            TimelineTrack(
                index=3,
                kind="video",
                name="V3",
                clips=[
                    TimelineClip(
                        name="Cam_Close",
                        track_index=3,
                        media_type="video",
                        start_frame=0,
                        duration_frames=180,
                        source_in_frame=35,
                        source_path="media/cam3.mov",
                    )
                ],
            ),
        ],
    )


def test_smpte_roundtrip() -> None:
    frames = smpte_to_frames("01:02:03:14", 25)
    assert frames == ((3600 + 120 + 3) * 25) + 14
    assert frames_to_smpte(frames, 25) == "01:02:03:14"


def test_create_multicam_from_single_clip_and_stacked_tracks() -> None:
    doc = _sample_single_track_doc()
    res = create_multicam_clip(doc, track_kind="video", track_index=1, clip_index=0)
    assert res.changed is True
    assert res.op == "create_multicam"
    assert res.angle_count == 4
    assert res.cut_count == 1
    assert count_multicam_clips(res.document) == 1
    bank = res.document.tracks[0].clips[0].multicam_bank
    assert bank is not None
    assert bank.sync_mode == "audio_waveform"
    # Audio waveform sync aligns slate peaks [12, 26, 5, 34] to ref 12 -> [0, -14, +7, -22]
    assert [a.sync_offset_frames for a in bank.angles] == [0, -14, 7, -22]

    # Stacked tracks doc should ingest V1..V3 as 3 angles
    stacked_doc = _sample_stacked_tracks_doc()
    s_res = create_multicam_clip(
        stacked_doc, track_kind="video", track_index=1, clip_index=0, sync_mode="timecode"
    )
    assert s_res.changed is True
    assert s_res.angle_count == 3
    s_bank = s_res.document.tracks[0].clips[0].multicam_bank
    assert s_bank is not None
    assert [a.name for a in s_bank.angles] == ["Cam_Wide", "Cam_Mid", "Cam_Close"]
    assert [a.sync_offset_frames for a in s_bank.angles] == [0, 12, 25]


def test_sync_modes_and_manual_angle_update() -> None:
    doc = _sample_single_track_doc()
    created = create_multicam_clip(doc, track_index=1, clip_index=0).document

    tc_synced = sync_multicam_clip(
        created, track_index=1, clip_index=0, sync_mode="timecode"
    ).document
    tc_bank = tc_synced.tracks[0].clips[0].multicam_bank
    assert tc_bank is not None
    assert tc_bank.sync_mode == "timecode"
    assert [a.sync_offset_frames for a in tc_bank.angles] == [0, 8, 16, 24]

    in_synced = sync_multicam_clip(
        tc_synced, track_index=1, clip_index=0, sync_mode="in_point"
    ).document
    in_bank = in_synced.tracks[0].clips[0].multicam_bank
    assert in_bank is not None
    assert [a.sync_offset_frames for a in in_bank.angles] == [0, 0, 0, 0]

    upd = update_multicam_angle(
        in_synced,
        track_index=1,
        clip_index=0,
        angle_index=2,
        name="CAM B - Steadicam",
        sync_offset_frames=-6,
        audio_follow=False,
    )
    assert upd.changed is True
    upd_bank = upd.document.tracks[0].clips[0].multicam_bank
    assert upd_bank is not None
    assert upd_bank.angles[1].name == "CAM B - Steadicam"
    assert upd_bank.angles[1].sync_offset_frames == -6
    assert upd_bank.angles[1].audio_follow is False


def test_live_cut_switcher_delete_cut_and_flatten_continuity() -> None:
    doc = _sample_single_track_doc()
    mc_doc = create_multicam_clip(doc, track_index=1, clip_index=0).document

    # Switch to Angle 2 at frame 50, Angle 3 at frame 120, Angle 4 at frame 160
    mc_doc = switch_multicam_angle(
        mc_doc, track_index=1, clip_index=0, frame=50, angle_index=2, cut_mode="video_only"
    ).document
    mc_doc = switch_multicam_angle(
        mc_doc, track_index=1, clip_index=0, frame=120, angle_index=3, cut_mode="audio_video"
    ).document
    mc_doc = switch_multicam_angle(
        mc_doc, track_index=1, clip_index=0, frame=160, angle_index=4, cut_mode="video_only"
    ).document

    bank = mc_doc.tracks[0].clips[0].multicam_bank
    assert bank is not None
    assert [(c.frame, c.angle_index) for c in bank.cuts] == [
        (0, 1),
        (50, 2),
        (120, 3),
        (160, 4),
    ]
    assert resolve_active_angle_at_frame(bank, 75).angle_index == 2
    assert resolve_active_angle_at_frame(bank, 140).angle_index == 3

    # Delete cut at +120f; base cut at 0f cannot be deleted
    del_zero = delete_multicam_cut(mc_doc, track_index=1, clip_index=0, local_frame=0)
    assert del_zero.changed is False
    mc_doc = delete_multicam_cut(mc_doc, track_index=1, clip_index=0, local_frame=120).document
    bank_after = mc_doc.tracks[0].clips[0].multicam_bank
    assert bank_after is not None
    assert [(c.frame, c.angle_index) for c in bank_after.cuts] == [
        (0, 1),
        (50, 2),
        (160, 4),
    ]

    # Segments check
    segs = compute_multicam_segments(bank_after)
    assert [(s.start_frame, s.end_frame, s.angle_index) for s in segs] == [
        (0, 50, 1),
        (50, 160, 2),
        (160, 200, 4),
    ]

    # Flatten Multi-Cam to discrete timeline clips & validate zero frame gaps/overlaps
    flat_res = flatten_multicam_clip(mc_doc, track_index=1, clip_index=0)
    assert flat_res.changed is True
    assert flat_res.op == "flatten_multicam"
    assert flat_res.cut_count == 3
    assert count_multicam_clips(flat_res.document) == 0

    v1 = flat_res.document.tracks[0]
    assert [(c.start_frame, c.duration_frames) for c in v1.clips] == [
        (0, 50),
        (50, 110),
        (160, 40),
        (200, 50),
    ]
    val = validate_timeline(flat_res.document)
    assert val.valid is True


def test_compile_multicam_filtergraph_active_and_quad() -> None:
    doc = _sample_single_track_doc()
    mc_doc = create_multicam_clip(doc, track_index=1, clip_index=0).document
    mc_doc = switch_multicam_angle(
        mc_doc, track_index=1, clip_index=0, frame=80, angle_index=2, cut_mode="video_only"
    ).document
    mc_doc = switch_multicam_angle(
        mc_doc, track_index=1, clip_index=0, frame=150, angle_index=3, cut_mode="audio_video"
    ).document
    bank = mc_doc.tracks[0].clips[0].multicam_bank
    assert bank is not None

    active_res = compile_multicam_filtergraph(bank, mode="active_cuts")
    assert active_res.mode == "active_cuts"
    assert active_res.segment_count == 3
    assert "concat=n=3:v=1:a=0[v_mc]" in active_res.filter_complex
    assert "concat=n=3:v=0:a=1[a_mc]" in active_res.filter_complex

    quad_res = compile_multicam_filtergraph(bank, mode="quad_view")
    assert quad_res.mode == "quad_view"
    assert quad_res.video_map_label == "[v_mc_quad]"
    assert "xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0[v_mc_quad]" in quad_res.filter_complex


def test_multicam_validation_errors() -> None:
    doc = _sample_single_track_doc()
    with pytest.raises(ValueError, match="video track"):
        create_multicam_clip(doc, track_kind="audio", track_index=1, clip_index=0)

    mc_doc = create_multicam_clip(doc, track_index=1, clip_index=0).document
    with pytest.raises(ValueError, match="Angle 7"):
        switch_multicam_angle(mc_doc, track_index=1, clip_index=0, frame=20, angle_index=7)

    with pytest.raises(ValueError, match="not a Multi-Cam"):
        flatten_multicam_clip(doc, track_index=1, clip_index=0)

    # Custom explicit angles validation
    custom_angles = [
        MulticamAngle(angle_index=1, name="A Cam", source_path="a.mov", audio_peak_frame=10),
        MulticamAngle(angle_index=2, name="B Cam", source_path="b.mov", audio_peak_frame=25),
    ]
    c_res = create_multicam_clip(doc, track_index=1, clip_index=0, angles=custom_angles)
    assert c_res.angle_count == 2
