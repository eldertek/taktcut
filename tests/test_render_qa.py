"""Integration tests using real FFmpeg synthetic media, lut3d, ffprobe, and ebur128 QA."""

from __future__ import annotations

import math
import subprocess
from pathlib import Path

import pytest
from pydantic import ValidationError

from taktcut.color import bake_cdl_to_cube
from taktcut.models import (
    AscCdlParams,
    RationalFrameRate,
    RenderProfile,
    TimelineClip,
    TimelineTrack,
)
from taktcut.qa import audit_loudness, check_mp4_faststart, probe_media, run_qa_gate
from taktcut.render import (
    ClipAudioParams,
    build_render_plan,
    compile_audio_filter,
    compile_audio_filter_result,
    execute_render_plan,
)


def _generate_synthetic_clip(out_path: Path) -> None:
    """Generate a 2-second 25fps Rec.709 color-bars + 1kHz sine clip via FFmpeg."""
    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=640x360:rate=25:duration=2",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=1000:sample_rate=48000:duration=2",
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
        str(out_path),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    assert proc.returncode == 0, proc.stderr


def test_real_render_with_cdl_lut_loudnorm_and_qa_gate(tmp_path: Path) -> None:
    src = tmp_path / "probe_source.mp4"
    _generate_synthetic_clip(src)

    lut = tmp_path / "probe_grade.cube"
    bake_cdl_to_cube(
        AscCdlParams(
            slope=(1.04, 1.0, 0.96),
            offset=(0.01, 0.0, -0.01),
            power=(0.98, 1.0, 1.02),
            saturation=1.10,
        ),
        lut,
        size=17,
        title="probe-grade",
    )

    out_mp4 = tmp_path / "probe_delivery.mp4"
    plan = build_render_plan(
        input_path=src,
        output_path=out_mp4,
        profile=RenderProfile.WEB_H264,
        fps=RationalFrameRate(num=25, den=1),
        lut_path=lut,
        target_lufs=-14.0,
        prefer_hw=True,
    )
    assert plan.pix_fmt == "yuv420p"
    assert plan.gop_frames == 50
    assert plan.faststart is True

    result = execute_render_plan(plan)
    assert result.success is True, result.stderr_tail
    assert result.bytes_written > 0

    probe = probe_media(out_mp4)
    assert probe.video_codec == "h264"
    assert probe.width == 640
    assert probe.height == 360
    assert probe.pix_fmt == "yuv420p"
    assert probe.is_cfr is True
    assert probe.color_space == "bt709"
    assert probe.audio_sample_rate == 48000
    assert probe.has_faststart is True
    assert check_mp4_faststart(out_mp4) is True

    loudness = audit_loudness(out_mp4, target_lufs=-14.0, tolerance_lu=2.0, max_true_peak_dbtp=-1.0)
    assert loudness.passed is True, loudness
    assert loudness.true_peak_dbtp <= -1.0

    qa = run_qa_gate(
        out_mp4,
        target_lufs=-14.0,
        tolerance_lu=2.0,
        max_true_peak_dbtp=-1.0,
        require_faststart=True,
    )
    assert qa.passed is True, qa.failures
    assert len(qa.frame_samples) == 3
    assert all(sample.y_max > 16 for sample in qa.frame_samples)


def test_render_plan_dry_run_prores_hq(tmp_path: Path) -> None:
    plan = build_render_plan(
        input_path=tmp_path / "in.mov",
        output_path=tmp_path / "master.mov",
        profile=RenderProfile.PRORES_HQ,
        fps=RationalFrameRate(num=24000, den=1001),
        prefer_hw=False,
    )
    assert plan.encoder == "prores_ks"
    assert plan.pix_fmt == "yuv422p10le"
    assert plan.gop_frames == 48
    assert plan.faststart is False
    assert "pcm_s24le" in plan.argv


def test_compile_audio_filter_and_strict_bounds() -> None:
    unity = ClipAudioParams()
    assert unity.is_identity() is True
    assert compile_audio_filter(unity) is None
    assert compile_audio_filter_result(unity).filtergraph == ""

    full = ClipAudioParams(gain_db=-6.0, fade_in_s=1.2, fade_out_s=1.5)
    assert full.is_identity() is False
    assert compile_audio_filter(full, clip_duration_s=10.0) == (
        "volume=-6.00dB,afade=t=in:st=0.000:d=1.200,afade=t=out:st=8.500:d=1.500"
    )

    boost = ClipAudioParams(gain_db=12.0, fade_in_s=0.5)
    assert compile_audio_filter(boost) == "volume=12.00dB,afade=t=in:st=0.000:d=0.500"

    muted = ClipAudioParams(gain_db=6.0, fade_in_s=1.0, fade_out_s=1.0, muted=True)
    assert compile_audio_filter(muted, clip_duration_s=5.0) == "volume=0"

    short = ClipAudioParams(fade_in_s=3.0, fade_out_s=2.0)
    assert compile_audio_filter(short, clip_duration_s=1.5) == (
        "afade=t=in:st=0.000:d=1.500,afade=t=out:st=0.000:d=1.500"
    )

    with pytest.raises(ValueError, match="clip_duration_s"):
        compile_audio_filter(ClipAudioParams(fade_out_s=1.0))

    for bad_dur in (0.0, -1.0, math.nan, math.inf, True):
        with pytest.raises(ValueError):
            compile_audio_filter(ClipAudioParams(gain_db=-3.0), clip_duration_s=bad_dur)

    for bad_gain in (-24.1, 12.1, math.nan, math.inf, -math.inf, True):
        with pytest.raises((ValidationError, ValueError)):
            ClipAudioParams(gain_db=bad_gain)  # type: ignore[arg-type]

    for bad_fade in (-0.1, 5.1, math.nan, math.inf, False):
        with pytest.raises((ValidationError, ValueError)):
            ClipAudioParams(fade_in_s=bad_fade)  # type: ignore[arg-type]
        with pytest.raises((ValidationError, ValueError)):
            ClipAudioParams(fade_out_s=bad_fade)  # type: ignore[arg-type]

    clip = TimelineClip(
        name="VO_01",
        track_index=1,
        media_type="audio",
        start_frame=0,
        duration_frames=50,
        audio_gain_db=-4.5,
        fade_in_s=0.5,
        fade_out_s=0.75,
    )
    trk = TimelineTrack(index=1, kind="audio", name="A1", muted=False, solo=True, clips=[clip])
    assert trk.solo is True
    assert trk.clips[0].audio_gain_db == -4.5


def test_real_render_with_clip_audio_gain_and_fades(tmp_path: Path) -> None:
    src = tmp_path / "audio_source.mp4"
    _generate_synthetic_clip(src)
    out = tmp_path / "audio_faded.mp4"

    plan = build_render_plan(
        input_path=src,
        output_path=out,
        profile=RenderProfile.WEB_H264,
        fps=RationalFrameRate(num=25, den=1),
        audio_params=ClipAudioParams(gain_db=-3.5, fade_in_s=0.4, fade_out_s=0.5),
        clip_duration_s=2.0,
        target_lufs=-14.0,
        prefer_hw=False,
    )
    assert plan.audio_filter == (
        "volume=-3.50dB,afade=t=in:st=0.000:d=0.400,"
        "afade=t=out:st=1.500:d=0.500,loudnorm=I=-14.0:TP=-1.0:LRA=11.0"
    )
    result = execute_render_plan(plan)
    assert result.success is True, result.stderr_tail
    assert result.bytes_written > 0
