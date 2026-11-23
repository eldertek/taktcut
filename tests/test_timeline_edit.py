"""Unit tests for deterministic integer-frame timeline edits and multi-track Sync Lock."""

from __future__ import annotations

from taktcut.models import RationalFrameRate, TimelineClip, TimelineDocument, TimelineTrack
from taktcut.timeline_edit import (
    apply_timeline_edit,
    ripple_delete_clip,
    ripple_trim_clip,
    roll_edit_cut,
    set_all_tracks_sync_lock,
    slide_clip,
    slip_clip,
    toggle_track_sync_lock,
)
from taktcut.ui.samples import build_sample_timeline


def _make_two_track_doc(*, sync_a1: bool = True) -> TimelineDocument:
    fps25 = RationalFrameRate(num=25, den=1)
    return TimelineDocument(
        name="Edit_Suite_Test",
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
                sync_locked=True,
                clips=[
                    TimelineClip(
                        name="Shot_A",
                        track_index=1,
                        media_type="video",
                        start_frame=0,
                        duration_frames=100,
                        source_in_frame=20,
                        source_fps=fps25,
                    ),
                    TimelineClip(
                        name="Shot_B",
                        track_index=1,
                        media_type="video",
                        start_frame=100,
                        duration_frames=100,
                        source_in_frame=30,
                        source_fps=fps25,
                    ),
                    TimelineClip(
                        name="Shot_C",
                        track_index=1,
                        media_type="video",
                        start_frame=200,
                        duration_frames=100,
                        source_in_frame=40,
                        source_fps=fps25,
                    ),
                ],
            ),
            TimelineTrack(
                index=1,
                kind="audio",
                name="A1",
                sync_locked=sync_a1,
                clips=[
                    TimelineClip(
                        name="VO_1",
                        track_index=1,
                        media_type="audio",
                        start_frame=0,
                        duration_frames=100,
                        source_in_frame=0,
                    ),
                    TimelineClip(
                        name="VO_2",
                        track_index=1,
                        media_type="audio",
                        start_frame=200,
                        duration_frames=100,
                        source_in_frame=0,
                    ),
                ],
            ),
        ],
    )


def test_ripple_trim_right_propagates_sync_locked_tracks_and_clamps_floor() -> None:
    doc = _make_two_track_doc(sync_a1=True)
    res_pos = ripple_trim_clip(doc, "video", 1, 0, "right", 25)
    assert res_pos.changed is True
    assert res_pos.delta_applied == 25
    assert res_pos.shifted_count == 3
    v1_clips = res_pos.document.tracks[0].clips
    a1_clips = res_pos.document.tracks[1].clips
    assert v1_clips[0].duration_frames == 125
    assert v1_clips[1].start_frame == 125
    assert v1_clips[2].start_frame == 225
    assert a1_clips[1].start_frame == 225
    assert doc.tracks[0].clips[1].start_frame == 100

    res_neg = ripple_trim_clip(res_pos.document, "video", 1, 0, "right", -200)
    assert res_neg.changed is True
    assert res_neg.document.tracks[0].clips[0].duration_frames == 1
    assert res_neg.document.tracks[0].clips[1].start_frame == 1
    assert res_neg.document.tracks[1].clips[1].start_frame == 101


def test_ripple_trim_left_respects_source_in_and_sync_lock() -> None:
    doc = _make_two_track_doc(sync_a1=True)
    res_in = ripple_trim_clip(doc, "video", 1, 0, "left", 15)
    assert res_in.changed is True
    assert res_in.delta_applied == 15
    assert res_in.document.tracks[0].clips[0].source_in_frame == 35
    assert res_in.document.tracks[0].clips[0].duration_frames == 85
    assert res_in.document.tracks[0].clips[1].start_frame == 85
    assert res_in.document.tracks[1].clips[1].start_frame == 185

    res_clamp = ripple_trim_clip(doc, "video", 1, 0, "left", -50)
    assert res_clamp.changed is True
    assert res_clamp.delta_applied == -20
    assert res_clamp.document.tracks[0].clips[0].source_in_frame == 0
    assert res_clamp.document.tracks[0].clips[0].duration_frames == 120
    assert res_clamp.document.tracks[0].clips[1].start_frame == 120


def test_roll_edit_cut_preserves_total_duration_and_rejects_gaps() -> None:
    doc = _make_two_track_doc(sync_a1=False)
    res = roll_edit_cut(doc, "video", 1, 0, -15)
    assert res.changed is True
    assert res.delta_applied == -15
    v1 = res.document.tracks[0].clips
    assert v1[0].duration_frames == 85
    assert v1[1].start_frame == 85
    assert v1[1].duration_frames == 115
    assert v1[1].source_in_frame == 15
    assert v1[2].start_frame == 200

    gap_roll = roll_edit_cut(doc, "audio", 1, 0, 10)
    assert gap_roll.changed is False
    assert "not adjacent" in gap_roll.detail.lower()


def test_slip_and_slide_edit_contracts() -> None:
    doc = _make_two_track_doc()
    slip_res = slip_clip(doc, "video", 1, 1, -50)
    assert slip_res.changed is True
    assert slip_res.delta_applied == -30
    assert slip_res.document.tracks[0].clips[1].source_in_frame == 0
    assert slip_res.document.tracks[0].clips[1].start_frame == 100
    assert slip_res.document.tracks[0].clips[1].duration_frames == 100

    slide_res = slide_clip(doc, "video", 1, 1, 20)
    assert slide_res.changed is True
    assert slide_res.delta_applied == 20
    v1 = slide_res.document.tracks[0].clips
    assert v1[0].duration_frames == 120
    assert v1[1].start_frame == 120
    assert v1[1].duration_frames == 100
    assert v1[1].source_in_frame == 30
    assert v1[2].start_frame == 220
    assert v1[2].duration_frames == 80
    assert v1[2].source_in_frame == 60


def test_sync_lock_toggles_and_ripple_delete() -> None:
    sample = build_sample_timeline("clean")
    assert sample.tracks[0].sync_locked is True
    assert sample.tracks[1].sync_locked is False
    assert sample.tracks[2].sync_locked is True

    toggled = toggle_track_sync_lock(sample, "video", 2)
    assert toggled.changed is True
    assert toggled.document.tracks[1].sync_locked is True
    assert toggled.sync_locked_tracks == 3

    all_off = set_all_tracks_sync_lock(toggled.document, False)
    assert all_off.changed is True
    assert all_off.sync_locked_tracks == 0

    doc = _make_two_track_doc(sync_a1=True)
    del_sync = ripple_delete_clip(doc, "video", 1, 1)
    assert del_sync.changed is True
    assert del_sync.document.tracks[0].clips[1].start_frame == 100
    assert del_sync.document.tracks[1].clips[1].start_frame == 100

    doc_unlocked = _make_two_track_doc(sync_a1=False)
    del_nosync = apply_timeline_edit(
        doc_unlocked, op="ripple_delete", track_kind="video", track_index=1, clip_index=1
    )
    assert del_nosync.changed is True
    assert del_nosync.document.tracks[0].clips[1].start_frame == 100
    assert del_nosync.document.tracks[1].clips[1].start_frame == 200
