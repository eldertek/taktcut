"""Tests for Premiere Pro / DaVinci Resolve Text-Based Dialogue Rough-Cut Studio."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest

from taktcut.drp import validate_timeline
from taktcut.models import RationalFrameRate, TimelineClip, TimelineDocument, TimelineTrack
from taktcut.text_edit import (
    TextEditConfig,
    TextEditKeepRange,
    analyze_clip_transcript_and_silences,
    apply_text_edit_rough_cut,
    compile_roughcut_select_filtergraph,
    compile_silencedetect_filtergraph,
    compute_keep_ranges_from_segments,
    export_transcript_srt,
    normalize_filler_words,
    normalize_text_edit_gap_mode,
    parse_ffmpeg_silencedetect_stderr,
)


def _sample_doc(*, reverse_video: bool = False) -> TimelineDocument:
    return TimelineDocument(
        name="TextEdit_Master_25p",
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
                        name="Interview_Take_01",
                        track_index=1,
                        media_type="video",
                        start_frame=0,
                        duration_frames=200,
                        source_in_frame=25,
                        source_path="media/Interview_Take_01.mov",
                        link_group_id="av-int-01",
                        reverse=reverse_video,
                        fade_in_s=0.5,
                        fade_out_s=0.5,
                    ),
                    TimelineClip(
                        name="Outro_Bumper",
                        track_index=1,
                        media_type="video",
                        start_frame=200,
                        duration_frames=50,
                        source_in_frame=0,
                        link_group_id="av-outro",
                    ),
                ],
            ),
            TimelineTrack(
                index=1,
                kind="audio",
                name="A1",
                clips=[
                    TimelineClip(
                        name="Interview_Take_01_Audio",
                        track_index=1,
                        media_type="audio",
                        start_frame=0,
                        duration_frames=200,
                        source_in_frame=25,
                        source_path="media/Interview_Take_01.mov",
                        link_group_id="av-int-01",
                    ),
                    TimelineClip(
                        name="Outro_Bumper_Audio",
                        track_index=1,
                        media_type="audio",
                        start_frame=200,
                        duration_frames=50,
                        source_in_frame=0,
                        link_group_id="av-outro",
                    ),
                ],
            ),
        ],
    )


def test_filtergraph_compilers_and_ffmpeg_silencedetect_parser() -> None:
    fg = compile_silencedetect_filtergraph(-32.0, 0.45)
    assert fg == "silencedetect=noise=-32.0dB:d=0.45"

    with pytest.raises(ValueError, match="noise_db"):
        compile_silencedetect_filtergraph(-75.0, 0.45)
    with pytest.raises(ValueError, match="min_silence_s"):
        compile_silencedetect_filtergraph(-32.0, 0.05)

    stderr = (
        "[silencedetect @ 0x1] silence_start: 1.200\n"
        "[silencedetect @ 0x1] silence_end: 2.050 | silence_duration: 0.850\n"
        "[silencedetect @ 0x1] silence_start: 5.500\n"
    )
    intervals = parse_ffmpeg_silencedetect_stderr(stderr, total_duration_s=8.0)
    assert len(intervals) == 2
    assert intervals[0].start_s == pytest.approx(1.2)
    assert intervals[0].end_s == pytest.approx(2.05)
    assert intervals[0].duration_s == pytest.approx(0.85)
    assert intervals[1].start_s == pytest.approx(5.5)
    assert intervals[1].end_s == pytest.approx(8.0)

    rc_fg = compile_roughcut_select_filtergraph(
        [
            TextEditKeepRange(start_frame=0, end_frame=30, start_s=0.0, end_s=1.2),
            TextEditKeepRange(start_frame=50, end_frame=100, start_s=2.0, end_s=4.0),
        ],
        include_audio=True,
    )
    assert "select='between(t,0.000,1.200)+between(t,2.000,4.000)'" in rc_fg
    assert "aselect='between(t,0.000,1.200)+between(t,2.000,4.000)'" in rc_fg
    assert compile_roughcut_select_filtergraph([]) == "null"


def test_config_validation_and_normalizers() -> None:
    cfg = TextEditConfig(noise_db=-36.0, min_silence_s=0.6, padding_s=0.1, gap_mode="extract_gaps")
    assert cfg.noise_db == -36.0
    assert cfg.gap_mode == "extract_gaps"

    with pytest.raises(ValueError, match="finite number"):
        TextEditConfig(noise_db=True)  # type: ignore[arg-type]
    with pytest.raises(ValueError, match="padding_s"):
        TextEditConfig(padding_s=0.9)
    with pytest.raises(ValueError, match="gap_mode"):
        normalize_text_edit_gap_mode("invalid_mode")

    fillers = normalize_filler_words(["  UM ", "um", "Euh", "", "x" * 30])
    assert fillers == ["um", "euh"]


def test_analyze_clip_transcript_synthetic_and_ffmpeg_mock(tmp_path: Path) -> None:
    doc = _sample_doc()
    res = analyze_clip_transcript_and_silences(
        doc,
        track_kind="video",
        track_index=1,
        clip_index=0,
        noise_db=-32.0,
        min_silence_s=0.45,
        padding_s=0.08,
        detect_fillers=True,
    )
    assert res.engine == "deterministic_synthetic"
    assert res.clip_name == "Interview_Take_01"
    assert len(res.waveform_peaks) == 64
    assert res.silence_count >= 1
    assert res.speech_count >= 1
    assert res.filler_count >= 1
    assert res.saved_duration_s > 0.0
    assert res.silencedetect_filtergraph == "silencedetect=noise=-32.0dB:d=0.45"

    srt = export_transcript_srt(res.segments, include_deleted=False)
    assert "-->" in srt
    assert "[Silence" not in srt

    # Mock FFmpeg binary on workspace media path
    media_file = tmp_path / "media" / "Interview_Take_01.mov"
    media_file.parent.mkdir(parents=True, exist_ok=True)
    media_file.write_bytes(b"fake-media")

    class _FakeProc:
        returncode = 0
        stderr = (
            "[silencedetect @ 0x0] silence_start: 1.500\n"
            "[silencedetect @ 0x0] silence_end: 2.500 | silence_duration: 1.000\n"
        )

    with (
        patch("taktcut.text_edit.shutil.which", return_value="ffmpeg"),
        patch("taktcut.text_edit.subprocess.run", return_value=_FakeProc()),
    ):
        ff_res = analyze_clip_transcript_and_silences(
            doc,
            track_kind="video",
            track_index=1,
            clip_index=0,
            workspace_root=tmp_path,
            execute_ffmpeg=True,
        )
    assert ff_res.engine == "ffmpeg_silencedetect"
    assert ff_res.silence_count == 1
    assert ff_res.total_silence_s == pytest.approx(1.0, abs=0.08)


def test_apply_text_edit_rough_cut_all_modes_and_reverse() -> None:
    doc = _sample_doc()
    analysis = analyze_clip_transcript_and_silences(
        doc,
        track_kind="video",
        track_index=1,
        clip_index=0,
        noise_db=-32.0,
        min_silence_s=0.45,
        padding_s=0.04,
    )

    # 1. Ripple Delete with linked A/V sync & downstream clip shift
    ripple = apply_text_edit_rough_cut(
        doc,
        track_kind="video",
        track_index=1,
        clip_index=0,
        segments=analysis.segments,
        gap_mode="ripple_delete",
        sync_linked_track=True,
        padding_s=0.04,
    )
    assert ripple.saved_frames > 0
    assert ripple.linked_track_synced is True
    assert len(ripple.created_clip_names) >= 2
    assert validate_timeline(ripple.document).valid is True
    v1 = next(t for t in ripple.document.tracks if t.kind == "video" and t.index == 1)
    a1 = next(t for t in ripple.document.tracks if t.kind == "audio" and t.index == 1)
    assert v1.clips[-1].name == "Outro_Bumper"
    assert v1.clips[-1].start_frame == 200 - ripple.saved_frames
    assert a1.clips[-1].start_frame == 200 - ripple.saved_frames

    # 2. Extract Gaps preserves original downstream timing
    extract = apply_text_edit_rough_cut(
        doc,
        track_kind="video",
        track_index=1,
        clip_index=0,
        segments=analysis.segments,
        gap_mode="extract_gaps",
        sync_linked_track=True,
        padding_s=0.04,
    )
    v1_ext = next(t for t in extract.document.tracks if t.kind == "video" and t.index == 1)
    assert v1_ext.clips[-1].start_frame == 200
    assert len(v1_ext.clips) == len(ripple.created_clip_names) + 1

    # 3. Markers Only adds timeline markers without splitting clips
    markers = apply_text_edit_rough_cut(
        doc,
        track_kind="video",
        track_index=1,
        clip_index=0,
        segments=analysis.segments,
        gap_mode="markers_only",
        marker_color="Red",
        padding_s=0.04,
    )
    assert len(markers.created_marker_frames) == len(markers.removed_segment_ids)
    assert markers.document.markers[0].color == "Red"

    # 4. Reverse clip source_in_frame calculation
    rev_doc = _sample_doc(reverse_video=True)
    rev_res = apply_text_edit_rough_cut(
        rev_doc,
        track_kind="video",
        track_index=1,
        clip_index=0,
        segments=analysis.segments,
        gap_mode="ripple_delete",
        padding_s=0.04,
    )
    rev_v1 = next(t for t in rev_res.document.tracks if t.kind == "video" and t.index == 1)
    assert rev_v1.clips[0].source_in_frame > 25

    # 5. Reject deleting every segment
    all_deleted = [seg.model_copy(update={"deleted": True}) for seg in analysis.segments]
    with pytest.raises(ValueError, match="at least one speech segment"):
        apply_text_edit_rough_cut(
            doc,
            track_kind="video",
            track_index=1,
            clip_index=0,
            segments=all_deleted,
        )

    keep_test = compute_keep_ranges_from_segments(analysis.segments, 200, 25, 1, 0.04)
    assert len(keep_test) >= 1
