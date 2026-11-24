"""Unit tests for Media Pool Pro: Proxies, Offline/Relink, and A/V Auto-Sync."""

from __future__ import annotations

from pathlib import Path

import pytest

from taktcut.media_pool import (
    analyze_av_sync,
    apply_av_sync_to_document,
    audit_media_pool_links,
    auto_relink_all_in_document,
    clear_proxies_for_document,
    compile_av_sync_filtergraph,
    compile_proxy_plan,
    compute_proxy_dimensions,
    generate_proxies_for_document,
    relink_clip_in_document,
    suggest_relink_candidates,
    toggle_clip_offline_in_document,
)
from taktcut.models import RationalFrameRate, TimelineClip, TimelineDocument, TimelineTrack
from taktcut.security import PathConfinementError


def _sample_doc() -> TimelineDocument:
    return TimelineDocument(
        name="Media_Pool_Test_25p",
        source_format="drt",
        fps=RationalFrameRate(num=25, den=1),
        width=1920,
        height=1080,
        start_frame=0,
        tracks=[
            TimelineTrack(
                index=1,
                kind="video",
                name="V1 Picture",
                clips=[
                    TimelineClip(
                        name="A001_Opening_Wide",
                        track_index=1,
                        media_type="video",
                        start_frame=0,
                        duration_frames=100,
                        source_in_frame=10,
                        source_path="media/A001_Opening_Wide.mov",
                    ),
                    TimelineClip(
                        name="A002_Studio_Detail",
                        track_index=1,
                        media_type="video",
                        start_frame=100,
                        duration_frames=75,
                        source_in_frame=0,
                        source_path="media/A002_Studio_Detail.mov",
                    ),
                ],
            ),
            TimelineTrack(
                index=2,
                kind="video",
                name="V2 Titles",
                clips=[
                    TimelineClip(
                        name="Lower_Third_Host",
                        track_index=2,
                        media_type="video",
                        start_frame=10,
                        duration_frames=50,
                        source_path="gfx/lower_third.mov",
                    )
                ],
            ),
            TimelineTrack(
                index=1,
                kind="audio",
                name="A1 Dialogue",
                clips=[
                    TimelineClip(
                        name="VO_Field_Recorder",
                        track_index=1,
                        media_type="audio",
                        start_frame=12,
                        duration_frames=100,
                        source_in_frame=4,
                        source_path="audio/VO_Field_Recorder.wav",
                    )
                ],
            ),
        ],
    )


def test_proxy_dimensions_and_ffmpeg_compile_all_codecs() -> None:
    assert compute_proxy_dimensions(1920, 1080, "half") == (960, 540)
    assert compute_proxy_dimensions(1920, 1080, "quarter") == (480, 270)
    assert compute_proxy_dimensions(3840, 2160, "quarter") == (960, 540)
    # Odd source height still yields even-aligned proxy dimensions
    pw, ph = compute_proxy_dimensions(1921, 1081, "half")
    assert pw % 2 == 0 and ph % 2 == 0

    for codec, ext, enc in (
        ("prores_proxy", ".mov", "prores_ks"),
        ("dnxhr_lb", ".mov", "dnxhd"),
        ("h264_proxy", ".mp4", "libx264"),
    ):
        plan = compile_proxy_plan(
            clip_name="A001_Opening_Wide",
            source_path="media/A001_Opening_Wide.mov",
            scale="half",
            codec=codec,  # type: ignore[arg-type]
            source_width=1920,
            source_height=1080,
        )
        assert plan.proxy_path.endswith(ext)
        assert plan.proxy_width == 960
        assert plan.proxy_height == 540
        assert "scale=trunc(iw/4)*2:trunc(ih/4)*2" in plan.video_filter
        assert enc in plan.argv
        assert plan.estimated_savings_pct >= 10


def test_generate_and_clear_proxies_for_document(tmp_path: Path) -> None:
    doc = _sample_doc()
    res = generate_proxies_for_document(
        doc,
        scale="quarter",
        codec="dnxhr_lb",
        scope="all_video",
        workspace_root=tmp_path,
        execute=False,
    )
    assert res.changed is True
    assert res.generated_count == 2  # Skips synthetic gfx/ clip on V2
    v1_clips = res.document.tracks[0].clips
    assert v1_clips[0].proxy_scale == "quarter"
    assert v1_clips[0].proxy_codec == "dnxhr_lb"
    assert v1_clips[0].proxy_path.startswith(".taktcut-proxies/")
    assert res.document.tracks[1].clips[0].proxy_path == ""

    with pytest.raises(ValueError, match="traversal"):
        generate_proxies_for_document(doc, proxy_dir="../outside")

    cleared_doc, cleared_n = clear_proxies_for_document(
        res.document, scope="selected", track_index=1, clip_index=0
    )
    assert cleared_n == 1
    assert cleared_doc.tracks[0].clips[0].proxy_path == ""
    assert cleared_doc.tracks[0].clips[1].proxy_path != ""


def test_offline_watchdog_and_smart_relink(tmp_path: Path) -> None:
    media_dir = tmp_path / "footage"
    media_dir.mkdir(parents=True)
    target_a = media_dir / "A001_Opening_Wide.mov"
    target_b = media_dir / "A002_Studio_Detail.mp4"
    target_c = media_dir / "VO_Field_Recorder.wav"
    for p in (target_a, target_b, target_c):
        p.write_bytes(b"mock")

    doc = _sample_doc()
    # Mark A001 offline and strictly check disk against tmp_path
    off_doc, changed, _ = toggle_clip_offline_in_document(
        doc, track_kind="video", track_index=1, clip_index=0, offline=True
    )
    assert changed is True
    audit = audit_media_pool_links(off_doc, workspace_root=tmp_path, strict_workspace_check=True)
    assert audit.offline_count == 3  # A001, A002 (different path/ext), VO (different path)
    assert audit.online_count == 1  # V2 gfx clip

    cands = suggest_relink_candidates(
        "media/A001_Opening_Wide.mov",
        "A001_Opening_Wide",
        audit.workspace_media,
    )
    assert cands[0].path == "footage/A001_Opening_Wide.mov"
    assert cands[0].confidence == 100

    relinked_doc, ok, _ = relink_clip_in_document(
        off_doc,
        track_kind="video",
        track_index=1,
        clip_index=0,
        new_source_path="footage/A001_Opening_Wide.mov",
        workspace_root=tmp_path,
    )
    assert ok is True
    assert relinked_doc.tracks[0].clips[0].media_offline is False
    assert relinked_doc.tracks[0].clips[0].source_path == "footage/A001_Opening_Wide.mov"

    with pytest.raises(PathConfinementError):
        relink_clip_in_document(
            off_doc,
            track_kind="video",
            track_index=1,
            clip_index=0,
            new_source_path=str(tmp_path.parent / "escape.mov"),
            workspace_root=tmp_path,
        )

    # Auto-relink remaining clips that do not match explicit workspace_files inventory
    auto_doc, relinked_cnt, _ = auto_relink_all_in_document(
        relinked_doc,
        workspace_files=[
            "footage/A001_Opening_Wide.mov",
            "footage/A002_Studio_Detail.mp4",
            "footage/VO_Field_Recorder.wav",
        ],
        min_confidence=80,
    )
    assert relinked_cnt == 2
    assert auto_doc.tracks[0].clips[1].source_path == "footage/A002_Studio_Detail.mp4"
    assert auto_doc.tracks[2].clips[0].source_path == "footage/VO_Field_Recorder.wav"

    # Mark A002 explicitly offline and test batch auto_relink using workspace_root scan
    off2, _, _ = toggle_clip_offline_in_document(
        relinked_doc, track_kind="video", track_index=1, clip_index=1, offline=True
    )
    auto_doc2, cnt2, _ = auto_relink_all_in_document(
        off2,
        workspace_root=tmp_path,
        min_confidence=80,
    )
    assert cnt2 == 1
    assert auto_doc2.tracks[0].clips[1].source_path == "footage/A002_Studio_Detail.mp4"
    assert auto_doc2.tracks[0].clips[1].media_offline is False


def test_waveform_and_timecode_av_auto_sync_and_ffmpeg() -> None:
    doc = _sample_doc()
    # Build two 64-sample envelopes where audio is shifted by +5 frames relative to video
    v_env = [0.05] * 64
    v_env[20] = 0.95
    v_env[21] = 0.60
    a_env = [0.05] * 64
    a_env[25] = 0.95
    a_env[26] = 0.60

    wf = analyze_av_sync(
        doc,
        video_track_index=1,
        video_clip_index=0,
        audio_track_index=1,
        audio_clip_index=0,
        mode="waveform",
        max_lag_frames=20,
        video_envelope=v_env,
        audio_envelope=a_env,
    )
    assert wf.offset_frames == 5
    assert wf.confidence >= 0.95
    assert "adelay=200.00|200.00" in wf.audio_filter
    assert "asetpts=PTS-STARTPTS" in wf.audio_filter

    tc = analyze_av_sync(
        doc,
        video_track_index=1,
        video_clip_index=0,
        audio_track_index=1,
        audio_clip_index=0,
        mode="timecode",
        video_tc="01:00:00:00",
        audio_tc="01:00:00:08",
    )
    assert tc.offset_frames == 8
    assert tc.confidence == 1.0
    assert tc.offset_ms == 320.0

    neg_fg = compile_av_sync_filtergraph(-4, doc.fps)
    assert "atrim=start=0.1600,asetpts=PTS-STARTPTS" in neg_fg

    synced_doc, detail = apply_av_sync_to_document(
        doc,
        video_track_index=1,
        video_clip_index=0,
        audio_track_index=1,
        audio_clip_index=0,
        offset_frames=5,
        link_pair=True,
    )
    assert "Synced" in detail
    assert synced_doc.tracks[2].clips[0].start_frame == 5
    assert synced_doc.tracks[2].clips[0].av_sync_offset_frames == 5
    v_link = synced_doc.tracks[0].clips[0].link_group_id
    a_link = synced_doc.tracks[2].clips[0].link_group_id
    assert v_link != ""
    assert v_link == a_link
