"""Tests for Video & Audio Transitions (xfade + acrossfade), validation, and FFmpeg smoke test."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest
from pydantic import ValidationError

from taktcut.models import (
    ClipTransition,
    HardwareCapabilities,
    RationalFrameRate,
    RenderProfile,
    TimelineClip,
    TimelineDocument,
    TimelineTrack,
)
from taktcut.transitions import (
    TRANSITION_DURATION_DEFAULT_S,
    TRANSITION_DURATION_MAX_S,
    TRANSITION_DURATION_MIN_S,
    TRANSITION_PRESETS,
    TransitionParams,
    apply_transition_preset,
    build_transition_render_argv,
    compile_transition_filter,
    compile_transition_filter_result,
    compute_xfade_offset_s,
    execute_transition_render,
    find_adjacent_cut_junctions,
    get_transition_preset,
    list_transition_presets,
)


def test_transition_presets_catalog_and_lookup() -> None:
    presets = list_transition_presets()
    assert len(presets) == 5
    assert [p.id for p in presets] == [
        "fade",
        "fadeblack",
        "wipeleft",
        "slideright",
        "zoomin",
    ]
    assert [p.name for p in TRANSITION_PRESETS] == [
        "Cross Dissolve",
        "Dip to Black",
        "Wipe Left",
        "Slide Right",
        "Smooth Zoom",
    ]

    by_name = get_transition_preset("Dip to Black")
    assert by_name.id == "fadeblack"
    assert by_name.default_duration_s == pytest.approx(0.5)

    applied = apply_transition_preset("wipeleft", duration_s=0.8)
    assert applied.preset == "wipeleft"
    assert applied.duration_s == pytest.approx(0.8)
    assert applied.include_audio is True

    with pytest.raises(ValueError, match="Unknown transition preset"):
        get_transition_preset("pixelize_unknown")


def test_transition_strict_allowlist_and_finite_bounds() -> None:
    default_params = TransitionParams()
    assert default_params.preset == "fade"
    assert default_params.duration_s == pytest.approx(TRANSITION_DURATION_DEFAULT_S)
    assert default_params.include_audio is True

    min_params = TransitionParams(preset="zoomin", duration_s=TRANSITION_DURATION_MIN_S)
    max_params = TransitionParams(preset="slideright", duration_s=TRANSITION_DURATION_MAX_S)
    assert min_params.duration_s == pytest.approx(0.1)
    assert max_params.duration_s == pytest.approx(2.0)

    invalid_cases: list[dict[str, object]] = [
        {"preset": "dissolve"},
        {"preset": "fade;rm -rf /"},
        {"preset": ""},
        {"preset": 123},
        {"duration_s": 0.09},
        {"duration_s": 0.0},
        {"duration_s": -0.5},
        {"duration_s": 2.01},
        {"duration_s": 5.0},
        {"duration_s": float("nan")},
        {"duration_s": float("inf")},
        {"duration_s": float("-inf")},
        {"duration_s": True},
        {"duration_s": False},
        {"duration_s": "0.5"},
        {"audio_curve1": "tri:d=99"},
        {"audio_curve2": "unknown_curve"},
        {"audio_curve1": 42},
    ]
    for kwargs in invalid_cases:
        with pytest.raises((ValidationError, ValueError)):
            TransitionParams(**kwargs)  # type: ignore[arg-type]

    with pytest.raises((ValidationError, ValueError)):
        ClipTransition(preset="fadeblack", duration_s=5.5)
    with pytest.raises((ValidationError, ValueError)):
        ClipTransition(preset="unknown", duration_s=0.5)  # type: ignore[arg-type]


def test_compute_offset_and_compile_xfade_acrossfade() -> None:
    assert compute_xfade_offset_s(5.0, 0.5, clip_b_duration_s=4.0) == pytest.approx(4.5)
    assert compute_xfade_offset_s(2.0, 2.0) == pytest.approx(0.0)

    with pytest.raises(ValueError, match="exceeds clip A duration"):
        compute_xfade_offset_s(0.4, 0.5)
    with pytest.raises(ValueError, match="exceeds clip B duration"):
        compute_xfade_offset_s(3.0, 1.0, clip_b_duration_s=0.8)
    with pytest.raises(ValueError, match="clip_a_duration_s"):
        compute_xfade_offset_s(0.0, 0.5)
    with pytest.raises(ValueError, match="finite"):
        compute_xfade_offset_s(float("nan"), 0.5)

    for preset in ("fade", "fadeblack", "wipeleft", "slideright", "zoomin"):
        res = compile_transition_filter_result(
            {"preset": preset, "duration_s": 0.75, "include_audio": True},
            clip_a_duration_s=4.0,
            clip_b_duration_s=3.0,
            pix_fmt="yuv420p",
        )
        assert res.offset_s == pytest.approx(3.25)
        expected_vf = (
            f"[0:v][1:v]xfade=transition={preset}"
            ":duration=0.750:offset=3.250,format=yuv420p[vout]"
        )
        assert res.video_filtergraph == expected_vf
        assert (
            res.audio_filtergraph
            == "[0:a][1:a]acrossfade=d=0.750:c1=tri:c2=tri[aout]"
        )
        assert res.filter_complex == f"{res.video_filtergraph};{res.audio_filtergraph}"
        assert res.ffmpeg_args == [
            "-filter_complex",
            res.filter_complex,
            "-map",
            "[vout]",
            "-map",
            "[aout]",
        ]

    vf_only, af_only = compile_transition_filter(
        TransitionParams(preset="fadeblack", duration_s=0.5, include_audio=False),
        offset_s=1.5,
    )
    assert vf_only == "[0:v][1:v]xfade=transition=fadeblack:duration=0.500:offset=1.500[vout]"
    assert af_only is None

    with pytest.raises(ValueError, match="pix_fmt|pixel format"):
        compile_transition_filter(
            TransitionParams(),
            clip_a_duration_s=3.0,
            pix_fmt="yuv420p;evil",
        )
    with pytest.raises(ValueError, match="pad label"):
        compile_transition_filter(
            TransitionParams(),
            clip_a_duration_s=3.0,
            video_out="vout];evil",
        )
    with pytest.raises(ValueError, match="clip_a_duration_s or offset_s"):
        compile_transition_filter(TransitionParams())


def test_find_adjacent_cut_junctions_ignores_gaps() -> None:
    fps_25 = RationalFrameRate(num=25, den=1)
    doc = TimelineDocument(
        name="Transition_Junction_Test",
        source_format="drt",
        fps=fps_25,
        tracks=[
            TimelineTrack(
                index=1,
                kind="video",
                name="V1",
                clips=[
                    TimelineClip(
                        name="Clip_A",
                        track_index=1,
                        media_type="video",
                        start_frame=0,
                        duration_frames=100,
                        transition_out=ClipTransition(preset="fade", duration_s=0.5),
                    ),
                    TimelineClip(
                        name="Clip_B",
                        track_index=1,
                        media_type="video",
                        start_frame=100,
                        duration_frames=75,
                    ),
                    TimelineClip(
                        name="Clip_C_After_Gap",
                        track_index=1,
                        media_type="video",
                        start_frame=200,
                        duration_frames=100,
                    ),
                ],
            )
        ],
    )
    junctions = find_adjacent_cut_junctions(doc)
    assert len(junctions) == 1
    j = junctions[0]
    assert j.cut_frame == 100
    assert j.clip_a_name == "Clip_A"
    assert j.clip_b_name == "Clip_B"
    assert j.clip_a_duration_s == pytest.approx(4.0)
    assert j.clip_b_duration_s == pytest.approx(3.0)
    assert j.max_transition_duration_s == pytest.approx(2.0)
    assert j.transition is not None
    assert j.transition.preset == "fade"


def test_real_ffmpeg_xfade_acrossfade_smoke(tmp_path: Path) -> None:
    ffmpeg_bin = shutil.which("ffmpeg")
    ffprobe_bin = shutil.which("ffprobe")
    if ffmpeg_bin is None or ffprobe_bin is None:
        pytest.skip("ffmpeg/ffprobe unavailable on PATH")

    clip_a = tmp_path / "clip_a.mp4"
    clip_b = tmp_path / "clip_b.mp4"
    out_mp4 = tmp_path / "transition_out.mp4"

    for dst, video_src, freq in (
        (clip_a, "testsrc2=size=320x180:rate=25:duration=2", 440),
        (clip_b, "smptebars=size=320x180:rate=25:duration=2", 880),
    ):
        gen_cmd = [
            ffmpeg_bin,
            "-hide_banner",
            "-y",
            "-f",
            "lavfi",
            "-i",
            video_src,
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency={freq}:sample_rate=48000:duration=2",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-ar",
            "48000",
            "-ac",
            "2",
            str(dst),
        ]
        gen_proc = subprocess.run(gen_cmd, capture_output=True, text=True, check=False)
        assert gen_proc.returncode == 0, gen_proc.stderr

    caps = HardwareCapabilities(ffmpeg_path=ffmpeg_bin, libx264=True)
    argv = build_transition_render_argv(
        clip_a,
        clip_b,
        out_mp4,
        TransitionParams(preset="wipeleft", duration_s=0.5, include_audio=True),
        clip_a_duration_s=2.0,
        clip_b_duration_s=2.0,
        profile=RenderProfile.WEB_H264,
        fps=RationalFrameRate(num=25, den=1),
        prefer_hw=False,
        caps=caps,
    )
    res = execute_transition_render(argv, out_mp4, encoder="libx264")
    assert res.success, res.stderr_tail
    assert res.bytes_written > 0

    probe_proc = subprocess.run(
        [
            ffprobe_bin,
            "-hide_banner",
            "-loglevel",
            "error",
            "-show_entries",
            "format=duration:stream=codec_type,codec_name",
            "-of",
            "json",
            str(out_mp4),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    probe_data = json.loads(probe_proc.stdout)
    total_dur = float(probe_data["format"]["duration"])
    assert 3.35 <= total_dur <= 3.65
    codec_types = {s["codec_type"] for s in probe_data["streams"]}
    assert codec_types == {"video", "audio"}
