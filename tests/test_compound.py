"""Unit tests for Multi-Track Compound Clips, Nested Sub-Sequences, Flatten & Pre-Comp."""

from __future__ import annotations

import pytest

from taktcut.compound import (
    CompoundClipRef,
    compile_compound_filtergraph,
    compound_to_timeline_document,
    compute_compound_depth,
    compute_document_compound_depth,
    count_compound_clips,
    create_compound_clip,
    decompose_compound_clip,
    flatten_all_compounds,
    update_compound_subsequence,
)
from taktcut.drp import validate_timeline
from taktcut.models import (
    MAX_COMPOUND_NESTING_DEPTH,
    RationalFrameRate,
    TimelineClip,
    TimelineDocument,
    TimelineMarker,
    TimelineTrack,
)


def _sample_multitrack_doc() -> TimelineDocument:
    fps25 = RationalFrameRate(num=25, den=1)
    return TimelineDocument(
        name="Compound_Suite_25p",
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
                        name="V1_Intro",
                        track_index=1,
                        media_type="video",
                        start_frame=0,
                        duration_frames=100,
                        source_in_frame=10,
                        source_path="media/v1_intro.mov",
                        source_fps=fps25,
                    ),
                    TimelineClip(
                        name="V1_Main",
                        track_index=1,
                        media_type="video",
                        start_frame=100,
                        duration_frames=150,
                        source_in_frame=0,
                        source_path="media/v1_main.mov",
                        source_fps=fps25,
                    ),
                ],
            ),
            TimelineTrack(
                index=2,
                kind="video",
                name="V2 Overlay",
                clips=[
                    TimelineClip(
                        name="V2_LowerThird",
                        track_index=2,
                        media_type="video",
                        start_frame=50,
                        duration_frames=100,
                        source_in_frame=0,
                        source_path="gfx/lt.mov",
                        source_fps=fps25,
                    ),
                ],
            ),
            TimelineTrack(
                index=1,
                kind="audio",
                name="A1 Dialogue",
                clips=[
                    TimelineClip(
                        name="A1_VO",
                        track_index=1,
                        media_type="audio",
                        start_frame=0,
                        duration_frames=250,
                        source_in_frame=0,
                        source_path="audio/vo.wav",
                        audio_gain_db=2.0,
                    ),
                ],
            ),
            TimelineTrack(
                index=2,
                kind="audio",
                name="A2 Music",
                clips=[
                    TimelineClip(
                        name="A2_Bed",
                        track_index=2,
                        media_type="audio",
                        start_frame=0,
                        duration_frames=250,
                        source_in_frame=0,
                        source_path="audio/bed.wav",
                        audio_gain_db=-6.0,
                    ),
                ],
            ),
        ],
        markers=[
            TimelineMarker(name="Title Cue", frame=75, duration_frames=1, color="Cyan"),
            TimelineMarker(name="Outro Cue", frame=220, duration_frames=1, color="Gold"),
        ],
    )


def test_create_compound_from_io_range_splits_straddling_clips_and_markers() -> None:
    doc = _sample_multitrack_doc()
    res = create_compound_clip(
        doc,
        in_frame=50,
        out_frame=150,
        name="Title PreComp",
        precomp_blend_mode="screen",
        collapse_transforms=True,
        color_tag="violet",
    )
    assert res.changed is True
    assert res.op == "create_compound"
    assert res.nested_track_count == 4
    assert res.nested_clip_count == 5
    assert res.max_depth == 1
    assert count_compound_clips(res.document) == 1

    # Check V1 kept left [0..50) and right [150..250) + Compound [50..150)
    v1 = next(t for t in res.document.tracks if t.kind == "video" and t.index == 1)
    assert [(c.name, c.start_frame, c.duration_frames) for c in v1.clips] == [
        ("V1_Intro", 0, 50),
        ("Title PreComp", 50, 100),
        ("V1_Main", 150, 100),
    ]
    # Right remainder of V1_Main advances source_in_frame by 50 frames
    assert v1.clips[2].source_in_frame == 50

    comp_clip = v1.clips[1]
    assert comp_clip.is_compound is True
    assert comp_clip.compound_subsequence is not None
    sub = comp_clip.compound_subsequence
    assert sub.duration_frames == 100
    assert sub.precomp_blend_mode == "screen"
    assert sub.color_tag == "violet"
    assert len(sub.markers) == 1
    assert sub.markers[0].name == "Title Cue"
    assert sub.markers[0].frame == 25  # 75 - 50

    # Parent timeline retains only markers outside [50, 150)
    assert [m.name for m in res.document.markers] == ["Outro Cue"]

    val = validate_timeline(res.document)
    assert not any(
        issue.kind in ("overlap", "zero_duration", "fps_mismatch") for issue in val.issues
    )
    # No gaps on V1 (anchor track)
    assert not any(
        issue.kind == "gap" and issue.track_kind == "video" and issue.track_index == 1
        for issue in val.issues
    )
    # Decomposing restores full continuity across all 4 tracks with zero gaps
    dec = decompose_compound_clip(
        res.document,
        track_kind=res.track_kind,
        track_index=res.track_index,
        clip_index=res.clip_index,
    )
    assert validate_timeline(dec.document).valid is True


def test_create_compound_from_target_clips_and_decompose_roundtrip() -> None:
    doc = _sample_multitrack_doc()
    res = create_compound_clip(
        doc,
        target_clips=[
            CompoundClipRef(track_kind="video", track_index=1, clip_index=0),
            CompoundClipRef(track_kind="audio", track_index=1, clip_index=0),
        ],
        name="Intro Sync Group",
    )
    assert res.changed is True
    assert count_compound_clips(res.document) == 1
    comp_track = next(
        t for t in res.document.tracks if t.kind == res.track_kind and t.index == res.track_index
    )
    comp_clip = comp_track.clips[res.clip_index]
    assert comp_clip.compound_subsequence is not None
    assert comp_clip.start_frame == 0
    assert comp_clip.duration_frames == 250

    # Decompose in Place restores clips cleanly without overlap
    dec = decompose_compound_clip(
        res.document,
        track_kind=res.track_kind,
        track_index=res.track_index,
        clip_index=res.clip_index,
    )
    assert dec.changed is True
    assert count_compound_clips(dec.document) == 0
    assert compute_document_compound_depth(dec.document) == 0
    val = validate_timeline(dec.document)
    assert val.valid is True


def test_decompose_inherits_gain_speed_trim_and_avoids_collisions() -> None:
    doc = _sample_multitrack_doc()
    created = create_compound_clip(doc, in_frame=50, out_frame=150, name="SpeedCmp")
    comp_track = next(
        t
        for t in created.document.tracks
        if t.kind == created.track_kind and t.index == created.track_index
    )
    comp_clip = comp_track.clips[created.clip_index]
    comp_clip.audio_gain_db = 3.0
    comp_clip.speed_rate = 2.0
    comp_clip.source_in_frame = 20
    comp_clip.duration_frames = 40

    dec = decompose_compound_clip(
        created.document,
        track_kind=created.track_kind,
        track_index=created.track_index,
        clip_index=created.clip_index,
    )
    assert dec.changed is True
    assert count_compound_clips(dec.document) == 0
    a1 = next(t for t in dec.document.tracks if t.kind == "audio" and t.index == 1)
    # Inherited gain: 2.0 + 3.0 = 5.0 dB
    assert any(abs(c.audio_gain_db - 5.0) < 1e-6 for c in a1.clips)
    dec_val = validate_timeline(dec.document)
    assert not any(
        issue.kind in ("overlap", "zero_duration", "fps_mismatch") for issue in dec_val.issues
    )


def test_precomp_editor_step_in_update_and_flatten_all_multilevel() -> None:
    doc = _sample_multitrack_doc()
    lvl1 = create_compound_clip(doc, in_frame=50, out_frame=150, name="Inner PreComp")
    lvl1_track = next(
        t for t in lvl1.document.tracks if t.kind == lvl1.track_kind and t.index == lvl1.track_index
    )
    sub_doc = compound_to_timeline_document(lvl1_track.clips[lvl1.clip_index], doc.fps)
    # Edit inside Pre-Comp: add marker and update blend mode
    sub_doc.markers.append(
        TimelineMarker(name="Inner Beat", frame=10, duration_frames=1, color="Red")
    )
    updated = update_compound_subsequence(
        lvl1.document,
        track_kind=lvl1.track_kind,
        track_index=lvl1.track_index,
        clip_index=lvl1.clip_index,
        sub_doc=sub_doc,
        precomp_blend_mode="overlay",
        collapse_transforms=False,
        color_tag="teal",
    )
    assert updated.changed is True

    # Nest level 1 inside level 2
    lvl2 = create_compound_clip(
        updated.document,
        in_frame=0,
        out_frame=200,
        name="Outer PreComp",
    )
    assert compute_document_compound_depth(lvl2.document) == 2

    # Flatten all recursively unpacks depth 2 -> depth 0
    flat = flatten_all_compounds(lvl2.document)
    assert flat.changed is True
    assert compute_document_compound_depth(flat.document) == 0
    assert count_compound_clips(flat.document) == 0
    assert validate_timeline(flat.document).valid is True


def test_max_compound_nesting_depth_guardrail() -> None:
    doc = _sample_multitrack_doc()
    working = doc
    for depth_idx in range(MAX_COMPOUND_NESTING_DEPTH):
        res = create_compound_clip(
            working,
            in_frame=50,
            out_frame=150,
            name=f"Level {depth_idx + 1}",
        )
        working = res.document
        assert compute_document_compound_depth(working) == depth_idx + 1

    with pytest.raises(ValueError, match="depth"):
        create_compound_clip(working, in_frame=50, out_frame=150, name="Too Deep")


def test_compile_compound_filtergraph_blend_modes_and_audio_mix() -> None:
    doc = _sample_multitrack_doc()
    res = create_compound_clip(
        doc,
        in_frame=50,
        out_frame=150,
        name="Blend FX Comp",
        precomp_blend_mode="screen",
        collapse_transforms=False,
    )
    comp_clip = next(
        t for t in res.document.tracks if t.kind == res.track_kind and t.index == res.track_index
    ).clips[res.clip_index]
    assert comp_clip.compound_subsequence is not None
    assert compute_compound_depth(comp_clip) == 1

    compiled = compile_compound_filtergraph(
        comp_clip.compound_subsequence,
        speed_rate=1.0,
        master_gain_db=1.5,
    )
    assert compiled.video_track_count == 2
    assert compiled.audio_track_count == 2
    assert compiled.total_nested_clips == 5
    assert "color=c=black:s=1920x1080:r=25:d=4.000[cmp_base]" in compiled.filter_complex
    assert "blend=all_mode=screen" in compiled.filter_complex
    assert "format=yuv420p[cmp_raster]" in compiled.filter_complex
    assert "amix=inputs=2:normalize=0[cmp_amix]" in compiled.filter_complex
    assert compiled.video_map_label == "[cmp_raster]"
    assert compiled.audio_map_label == "[cmp_amix]"
