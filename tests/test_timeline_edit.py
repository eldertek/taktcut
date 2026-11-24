"""Unit tests for deterministic integer-frame timeline edits and multi-track Sync Lock."""

from __future__ import annotations

from taktcut.models import RationalFrameRate, TimelineClip, TimelineDocument, TimelineTrack
from taktcut.timeline_edit import (
    align_av_split,
    apply_split_edit_jl,
    apply_timeline_edit,
    compile_split_edit_ffmpeg,
    compute_av_split_info,
    link_av_clips,
    resolve_three_point_range,
    ripple_delete_clip,
    ripple_trim_clip,
    roll_edit_cut,
    set_all_tracks_sync_lock,
    slide_clip,
    slip_clip,
    three_point_edit,
    toggle_track_sync_lock,
    unlink_av_clips,
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


def test_av_link_unlink_jl_cut_split_edit_and_ffmpeg_compile() -> None:
    doc = _make_two_track_doc(sync_a1=True)
    # Give VO_2 (at frame 200) source_in_frame=30 so it has pre-lap headroom for J-Cut
    doc.tracks[1].clips[1].source_in_frame = 30

    # Link Shot_C (V1[2] at 200..300) with VO_2 (A1[1] at 200..300)
    linked = link_av_clips(doc, "video", 1, 2)
    assert linked.changed is True
    assert linked.op == "link_av"
    v_c = linked.document.tracks[0].clips[2]
    a_c = linked.document.tracks[1].clips[1]
    assert v_c.link_group_id != ""
    assert v_c.link_group_id == a_c.link_group_id

    info0 = compute_av_split_info(linked.document, "video", 1, 2)
    assert info0.linked is True
    assert info0.cut_type == "aligned"
    assert info0.in_offset_frames == 0
    assert info0.out_offset_frames == 0

    # J-Cut: audio pre-lap -15f (start 200 -> 185, dur 100 -> 115, srcIn 30 -> 15)
    jcut = apply_split_edit_jl(
        linked.document, "video", 1, 2, edge="left", delta_frames=-15, target_kind="audio"
    )
    assert jcut.changed is True
    assert jcut.delta_applied == -15
    assert jcut.document.tracks[1].clips[1].start_frame == 185
    assert jcut.document.tracks[1].clips[1].duration_frames == 115
    assert jcut.document.tracks[1].clips[1].source_in_frame == 15
    # Video stays anchored at 200..300
    assert jcut.document.tracks[0].clips[2].start_frame == 200
    assert jcut.document.tracks[0].clips[2].duration_frames == 100

    j_info = compute_av_split_info(jcut.document, "video", 1, 2)
    assert j_info.cut_type == "j_cut"
    assert j_info.in_offset_frames == -15

    # L-Cut: audio post-lap +20f (dur 115 -> 135)
    jlcut = apply_split_edit_jl(
        jcut.document, "video", 1, 2, edge="right", delta_frames=20, target_kind="audio"
    )
    assert jlcut.changed is True
    jl_info = compute_av_split_info(jlcut.document, "video", 1, 2)
    assert jl_info.cut_type == "jl_cut"
    assert jl_info.in_offset_frames == -15
    assert jl_info.out_offset_frames == 20

    # FFmpeg split-edit filtergraph compile
    fg = compile_split_edit_ffmpeg(jlcut.document, "video", 1, 2)
    assert fg.linked is True
    assert fg.is_identity is False
    assert "tpad=start_duration=0.600" in fg.video_filter
    assert "tpad=stop_duration=0.800" in fg.video_filter
    assert "[0:v]" in fg.filter_complex and "[1:a]" in fg.filter_complex

    # Ripple trim with respect_av_link=True trims both V & A together
    rip_av = ripple_trim_clip(
        jlcut.document, "video", 1, 2, "right", 10, respect_av_link=True
    )
    assert rip_av.changed is True
    assert rip_av.document.tracks[0].clips[2].duration_frames == 110
    assert rip_av.document.tracks[1].clips[1].duration_frames == 145

    # Align A/V split resets audio back flush with video
    aligned = align_av_split(rip_av.document, "video", 1, 2)
    assert aligned.changed is True
    al_info = compute_av_split_info(aligned.document, "video", 1, 2)
    assert al_info.cut_type == "aligned"
    assert al_info.in_offset_frames == 0
    assert al_info.out_offset_frames == 0

    # Unlink clears group on both clips
    unlinked = unlink_av_clips(aligned.document, "video", 1, 2)
    assert unlinked.changed is True
    assert unlinked.document.tracks[0].clips[2].link_group_id == ""
    assert unlinked.document.tracks[1].clips[1].link_group_id == ""


def test_three_point_range_resolution_and_insert_overwrite_replace() -> None:
    doc = _make_two_track_doc(sync_a1=True)
    fps25 = RationalFrameRate(num=25, den=1)
    src_clip = TimelineClip(
        name="B009_Drone_Pass",
        track_index=1,
        media_type="video",
        start_frame=0,
        duration_frames=120,
        source_in_frame=10,
        source_path="media/B009_Drone_Pass.mov",
        source_fps=fps25,
    )

    # 1. Backtiming rules
    bt_src_out = resolve_three_point_range(
        source_total_frames=120,
        source_base_in=10,
        source_out=80,
        tl_in=50,
        tl_out=90,
    )
    assert bt_src_out.rule == "backtime_src_out_tl_io"
    assert bt_src_out.duration_frames == 40
    assert bt_src_out.tl_start == 50
    assert bt_src_out.effective_source_in == 50

    bt_tl_out = resolve_three_point_range(
        source_total_frames=120,
        source_base_in=10,
        source_in=20,
        source_out=60,
        tl_out=150,
    )
    assert bt_tl_out.rule == "backtime_src_io_tl_out"
    assert bt_tl_out.duration_frames == 40
    assert bt_tl_out.tl_start == 110
    assert bt_tl_out.effective_source_in == 30

    # 2. 3-Point Insert (F9): splits V1[0] and sync-locked A1[0] at 50f, shifts +30f
    ins = three_point_edit(
        doc,
        mode="insert",
        source_clip=src_clip,
        target_track_kind="video",
        target_track_index=1,
        source_total_frames=120,
        source_in=15,
        source_out=45,
        tl_playhead=50,
    )
    assert ins.changed is True
    assert ins.resolution.duration_frames == 30
    assert ins.resolution.effective_source_in == 25
    v1_clips = ins.document.tracks[0].clips
    assert len(v1_clips) == 5
    assert [(c.name, c.start_frame, c.duration_frames) for c in v1_clips] == [
        ("Shot_A", 0, 50),
        ("B009_Drone_Pass", 50, 30),
        ("Shot_A", 80, 50),
        ("Shot_B", 130, 100),
        ("Shot_C", 230, 100),
    ]
    # Sync-locked A1 split & shifted downstream +30f
    a1_clips = ins.document.tracks[1].clips
    assert len(a1_clips) == 3
    assert [(c.name, c.start_frame, c.duration_frames) for c in a1_clips] == [
        ("VO_1", 0, 50),
        ("VO_1", 80, 50),
        ("VO_2", 230, 100),
    ]

    # 3. 3-Point Overwrite (F10): overwrites [20..60) on V1 without shifting Shot_B at 100f
    ovr = three_point_edit(
        doc,
        mode="overwrite",
        source_clip=src_clip,
        target_track_kind="video",
        target_track_index=1,
        source_total_frames=120,
        source_in=5,
        source_out=45,
        tl_in=20,
    )
    assert ovr.changed is True
    assert ovr.shifted_count == 0
    v1_ovr = ovr.document.tracks[0].clips
    assert [(c.name, c.start_frame, c.duration_frames, c.source_in_frame) for c in v1_ovr] == [
        ("Shot_A", 0, 20, 20),
        ("B009_Drone_Pass", 20, 40, 15),
        ("Shot_A", 60, 40, 80),
        ("Shot_B", 100, 100, 30),
        ("Shot_C", 200, 100, 40),
    ]

    # 4. Replace Edit (F11): replaces Shot_B [100..200) preserving start=100, dur=100
    rep = three_point_edit(
        doc,
        mode="replace",
        source_clip=src_clip,
        target_track_kind="video",
        target_track_index=1,
        source_total_frames=120,
        source_playhead=60,
        tl_playhead=130,
    )
    assert rep.changed is True
    v1_rep = rep.document.tracks[0].clips
    assert len(v1_rep) == 3
    assert v1_rep[1].name == "B009_Drone_Pass"
    assert v1_rep[1].start_frame == 100
    assert v1_rep[1].duration_frames == 100
    assert v1_rep[1].source_in_frame == 40  # base 10 + src_ph 60 - offset 30

