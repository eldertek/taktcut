"""Tests for DaVinci Resolve / Premiere Pro Scene Cut Detection & Auto-Split Studio."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest

from taktcut.drp import validate_timeline
from taktcut.models import RationalFrameRate, TimelineClip, TimelineDocument, TimelineTrack
from taktcut.scene_cut import (
    analyze_clip_scene_cuts,
    compile_scene_cut_filtergraph,
    detect_scene_cuts_from_luma_series,
    normalize_scene_cut_method,
    normalize_scene_cut_split_mode,
    parse_ffmpeg_scdet_output,
    split_clip_at_scene_cuts,
)


def _sample_doc(*, reverse_video: bool = False) -> TimelineDocument:
    return TimelineDocument(
        name="SceneCut_Master_25p",
        source_format="drt",
        fps=RationalFrameRate(num=25, den=1),
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
                        name="Master_Reel_01",
                        track_index=1,
                        media_type="video",
                        start_frame=0,
                        duration_frames=120,
                        source_in_frame=10,
                        source_path="media/Master_Reel_01.mov",
                        link_group_id="av-master-01",
                        reverse=reverse_video,
                        fade_in_s=0.4,
                        fade_out_s=0.4,
                    )
                ],
            ),
            TimelineTrack(
                index=1,
                kind="audio",
                name="A1",
                clips=[
                    TimelineClip(
                        name="Master_Reel_01_Audio",
                        track_index=1,
                        media_type="audio",
                        start_frame=0,
                        duration_frames=120,
                        source_in_frame=10,
                        source_path="media/Master_Reel_01.mov",
                        link_group_id="av-master-01",
                    )
                ],
            ),
        ],
    )


def test_compile_scene_cut_filtergraph_and_parse_ffmpeg_output() -> None:
    fg = compile_scene_cut_filtergraph(0.35, sc_pass=False, include_metadata_print=True)
    assert fg == "scdet=threshold=18.80:sc_pass=0,metadata=mode=print:key=lavfi.scd.score"

    fg_pass = compile_scene_cut_filtergraph(0.50, sc_pass=True, include_metadata_print=False)
    assert fg_pass == "scdet=threshold=26.00:sc_pass=1"

    with pytest.raises(ValueError, match="threshold"):
        compile_scene_cut_filtergraph(0.01)
    with pytest.raises(ValueError, match="threshold"):
        compile_scene_cut_filtergraph(1.2)

    sample_log = (
        "frame:19   pts:19      pts_time:0.760\n"
        "lavfi.scd.mafd=18.25\n"
        "lavfi.scd.score=42.50\n"
        "frame:48   pts:48      pts_time:1.920\n"
        "lavfi.scd.score=78.00\n"
    )
    parsed = parse_ffmpeg_scdet_output(sample_log, fps=25.0, max_frames=120)
    assert parsed == [(19, 0.425), (48, 0.78)]


def test_detect_scene_cuts_from_luma_series_methods_and_nms() -> None:
    # Build synthetic series with clear cuts at frame 25 and 60, plus adjacent jitter at 26
    series = (
        [0.15] * 25
        + [0.85, 0.80]
        + [0.82] * 33
        + [0.18] * 30
    )
    for method in ("hybrid", "ffmpeg_scdet", "luma_histogram"):
        samples, cuts = detect_scene_cuts_from_luma_series(
            series, threshold=0.35, min_shot_frames=6, method=method
        )
        assert len(samples) == len(series)
        cut_offsets = [c[0] for c in cuts]
        assert 25 in cut_offsets
        assert 60 in cut_offsets
        # Frame 26 must be suppressed by min_shot_frames=6
        assert 26 not in cut_offsets

    empty_samples, empty_cuts = detect_scene_cuts_from_luma_series([])
    assert empty_samples == []
    assert empty_cuts == []


def test_analyze_clip_scene_cuts_deterministic_and_ffmpeg_mock(tmp_path: Path) -> None:
    doc = _sample_doc()
    res = analyze_clip_scene_cuts(
        doc,
        track_index=1,
        clip_index=0,
        threshold=0.30,
        min_shot_frames=6,
        method="hybrid",
    )
    assert res.clip_name == "Master_Reel_01"
    assert res.source_mode == "deterministic_synthetic"
    assert len(res.frame_scores) == 120
    assert res.active_cut_count >= 2
    assert res.avg_shot_frames > 0
    assert all(0 < c.frame_offset < 120 for c in res.candidates)

    # Mock real FFmpeg scdet probe when media file exists inside workspace_root
    media_file = tmp_path / "media" / "Master_Reel_01.mov"
    media_file.parent.mkdir(parents=True, exist_ok=True)
    media_file.write_bytes(b"fake")

    with patch(
        "taktcut.scene_cut._probe_ffmpeg_scdet_scores",
        return_value=[(30, 0.62), (75, 0.84)],
    ):
        ff_res = analyze_clip_scene_cuts(
            doc,
            track_index=1,
            clip_index=0,
            threshold=0.35,
            min_shot_frames=6,
            workspace_root=tmp_path,
            execute_ffmpeg=True,
        )
    assert ff_res.source_mode == "ffmpeg_scdet"
    assert [c.frame_offset for c in ff_res.candidates] == [30, 75]


def test_split_clip_at_scene_cuts_forward_reverse_and_modes() -> None:
    doc = _sample_doc()
    res = split_clip_at_scene_cuts(
        doc,
        track_index=1,
        clip_index=0,
        cut_offsets=[30, 75, 30],  # duplicate 30 should be deduplicated
        split_mode="split_and_markers",
        split_linked_audio=True,
        marker_color="Gold",
    )
    assert res.cut_count == 2
    assert res.linked_audio_split is True
    assert res.created_clip_names == [
        "Master_Reel_01_S01",
        "Master_Reel_01_S02",
        "Master_Reel_01_S03",
    ]
    assert res.created_marker_frames == [30, 75]
    assert [m.color for m in res.document.markers] == ["Gold", "Gold"]

    v_clips = res.document.tracks[0].clips
    a_clips = res.document.tracks[1].clips
    assert [(c.start_frame, c.duration_frames, c.source_in_frame) for c in v_clips] == [
        (0, 30, 10),
        (30, 45, 40),
        (75, 45, 85),
    ]
    assert [c.link_group_id for c in v_clips] == [c.link_group_id for c in a_clips]
    assert validate_timeline(res.document).valid is True

    # Reverse clip preserves reverse source_in_frame mapping
    rev_doc = _sample_doc(reverse_video=True)
    rev_res = split_clip_at_scene_cuts(
        rev_doc,
        track_index=1,
        clip_index=0,
        cut_offsets=[40],
        split_mode="split_clips",
        split_linked_audio=False,
    )
    rev_v = rev_res.document.tracks[0].clips
    assert [(c.start_frame, c.duration_frames, c.source_in_frame) for c in rev_v] == [
        (0, 40, 10 + 80),
        (40, 80, 10),
    ]
    assert rev_res.document.markers == []

    # Markers-only mode keeps single clip untouched
    m_res = split_clip_at_scene_cuts(
        doc,
        track_index=1,
        clip_index=0,
        cut_offsets=[25, 80],
        split_mode="markers_only",
    )
    assert len(m_res.document.tracks[0].clips) == 1
    assert m_res.created_marker_frames == [25, 80]


def test_scene_cut_validation_errors() -> None:
    doc = _sample_doc()
    with pytest.raises(ValueError, match="method"):
        normalize_scene_cut_method("bogus")
    with pytest.raises(ValueError, match="split_mode"):
        normalize_scene_cut_split_mode("bogus")
    with pytest.raises(ValueError, match="cut offsets"):
        split_clip_at_scene_cuts(doc, track_index=1, clip_index=0, cut_offsets=[0, 120, 999])
    with pytest.raises(ValueError, match="out of range"):
        analyze_clip_scene_cuts(doc, track_index=1, clip_index=99)
