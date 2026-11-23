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
    ClipTransformParams,
    HardwareCapabilities,
    RationalFrameRate,
    RenderProfile,
    TimelineClip,
    TimelineTrack,
)
from taktcut.qa import audit_loudness, check_mp4_faststart, probe_media, run_qa_gate
from taktcut.render import (
    AutoDuckParams,
    ClipAudioParams,
    ClipRetimeParams,
    FairlightAudioParams,
    FramingParams,
    build_atempo_stages,
    build_render_plan,
    compile_audio_filter,
    compile_audio_filter_result,
    compile_auto_duck_filter,
    compile_auto_duck_filter_result,
    compile_dialogue_eq_filter,
    compile_fairlight_audio_filter,
    compile_framing_filter,
    compile_framing_filter_result,
    compile_loudness_preset_filter,
    compile_retime_filter,
    compile_retime_filter_result,
    compile_transform_filter,
    compile_transform_filter_result,
    execute_render_plan,
    get_delivery_preset,
    list_aspect_presets,
    list_delivery_presets,
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


def test_compile_retime_filter_and_strict_bounds() -> None:
    identity = ClipRetimeParams()
    assert identity.is_identity() is True
    assert compile_retime_filter(identity) == (None, None)
    identity_res = compile_retime_filter_result(identity)
    assert identity_res.is_identity is True
    assert identity_res.video_filtergraph == ""
    assert identity_res.audio_filtergraph == ""
    assert identity_res.ffmpeg_vf_args == []
    assert identity_res.ffmpeg_af_args == []

    slow = ClipRetimeParams(speed_rate=0.5)
    assert slow.is_identity() is False
    assert compile_retime_filter(slow) == ("setpts=2.000000*PTS", "atempo=0.5000")

    quarter = ClipRetimeParams(speed_rate=0.25)
    assert compile_retime_filter(quarter) == (
        "setpts=4.000000*PTS",
        "atempo=0.5000,atempo=0.5000",
    )

    fast = ClipRetimeParams(speed_rate=2.0)
    assert compile_retime_filter(fast) == ("setpts=0.500000*PTS", "atempo=2.0000")

    timelapse = ClipRetimeParams(speed_rate=4.0)
    assert compile_retime_filter(timelapse) == (
        "setpts=0.250000*PTS",
        "atempo=2.0000,atempo=2.0000",
    )

    rev_only = ClipRetimeParams(speed_rate=1.0, reverse=True)
    assert rev_only.is_identity() is False
    assert compile_retime_filter(rev_only) == ("reverse", "areverse")

    rev_3x = compile_retime_filter_result(ClipRetimeParams(speed_rate=3.0, reverse=True))
    assert rev_3x.video_filtergraph == "setpts=0.333333*PTS,reverse"
    assert rev_3x.audio_filtergraph == "atempo=2.0000,atempo=1.5000,areverse"
    assert rev_3x.ffmpeg_vf_args == ["-vf", "setpts=0.333333*PTS,reverse"]
    assert rev_3x.ffmpeg_af_args == ["-af", "atempo=2.0000,atempo=1.5000,areverse"]

    for rate in (0.25, 0.3, 0.5, 0.75, 1.5, 2.0, 2.5, 3.0, 4.0):
        stages = build_atempo_stages(rate)
        assert len(stages) >= 1
        assert all(0.5 <= s <= 2.0 for s in stages)
        assert math.isclose(math.prod(stages), rate, rel_tol=1e-6)

    for bad_rate in (0.24, 4.01, 0.0, -1.0, math.nan, math.inf, -math.inf, True, False):
        with pytest.raises((ValidationError, ValueError)):
            ClipRetimeParams(speed_rate=bad_rate)  # type: ignore[arg-type]
        with pytest.raises((ValidationError, ValueError)):
            TimelineClip(
                name="Bad_Retime",
                track_index=1,
                media_type="video",
                start_frame=0,
                duration_frames=50,
                speed_rate=bad_rate,  # type: ignore[arg-type]
            )

    clip = TimelineClip(
        name="B001_SlowMo",
        track_index=1,
        media_type="video",
        start_frame=0,
        duration_frames=100,
        speed_rate=0.5,
        reverse=True,
    )
    assert clip.speed_rate == 0.5
    assert clip.reverse is True


def test_real_render_with_clip_retime_and_reverse(tmp_path: Path) -> None:
    src = tmp_path / "retime_source.mp4"
    _generate_synthetic_clip(src)

    out_fast_rev = tmp_path / "retime_2x_rev.mp4"
    plan_fast = build_render_plan(
        input_path=src,
        output_path=out_fast_rev,
        profile=RenderProfile.WEB_H264,
        fps=RationalFrameRate(num=25, den=1),
        retime_params=ClipRetimeParams(speed_rate=2.0, reverse=True),
        audio_params=ClipAudioParams(gain_db=-2.0),
        target_lufs=-14.0,
        prefer_hw=False,
    )
    assert plan_fast.video_filter == "setpts=0.500000*PTS,reverse"
    assert plan_fast.audio_filter == (
        "atempo=2.0000,areverse,volume=-2.00dB,loudnorm=I=-14.0:TP=-1.0:LRA=11.0"
    )
    res_fast = execute_render_plan(plan_fast)
    assert res_fast.success is True, res_fast.stderr_tail
    assert res_fast.bytes_written > 0

    probe_fast = probe_media(out_fast_rev)
    assert probe_fast.is_cfr is True
    assert 0.8 <= probe_fast.video_duration_s <= 1.2

    out_quarter = tmp_path / "retime_025x.mp4"
    plan_quarter = build_render_plan(
        input_path=src,
        output_path=out_quarter,
        profile=RenderProfile.WEB_H264,
        fps=RationalFrameRate(num=25, den=1),
        retime_params=ClipRetimeParams(speed_rate=0.25, reverse=False),
        prefer_hw=False,
    )
    assert plan_quarter.video_filter == "setpts=4.000000*PTS"
    assert plan_quarter.audio_filter == "atempo=0.5000,atempo=0.5000"
    res_quarter = execute_render_plan(plan_quarter)
    assert res_quarter.success is True, res_quarter.stderr_tail
    assert res_quarter.bytes_written > 0

    probe_quarter = probe_media(out_quarter)
    assert probe_quarter.video_duration_s >= 7.5


def test_compile_framing_presets_and_validation() -> None:
    presets = list_aspect_presets()
    assert [(p.id, p.width, p.height) for p in presets] == [
        ("16:9", 1920, 1080),
        ("9:16", 1080, 1920),
        ("1:1", 1080, 1080),
        ("4:5", 1080, 1350),
    ]

    disabled = FramingParams(preset="9:16", mode="fill", enabled=False)
    assert compile_framing_filter(disabled) is None
    disabled_res = compile_framing_filter_result(disabled)
    assert disabled_res.is_identity is True
    assert disabled_res.filtergraph == ""

    fill_916 = FramingParams(preset="9:16", mode="fill")
    fill_res = compile_framing_filter_result(fill_916)
    assert fill_res.is_identity is False
    assert fill_res.target_width == 1080
    assert fill_res.target_height == 1920
    assert fill_res.filtergraph == (
        "scale=w=1080:h=1920:force_original_aspect_ratio=increase:"
        "force_divisible_by=2:flags=lanczos,"
        "crop=w=1080:h=1920:x=(iw-1080)/2:y=(ih-1920)/2,setsar=1"
    )
    assert fill_res.ffmpeg_vf_args == ["-vf", fill_res.filtergraph]

    panned = FramingParams(preset="4:5", mode="fill", pan_x=-0.5, pan_y=0.25)
    pan_fg = compile_framing_filter(panned)
    assert pan_fg is not None
    assert "crop=w=1080:h=1350:x=(iw-1080)/2*(1+(-0.5000)):y=(ih-1350)/2*(1+(0.2500))" in pan_fg

    fit_11 = FramingParams(preset="1:1", mode="fit")
    fit_res = compile_framing_filter_result(fit_11)
    assert fit_res.target_width == 1080
    assert fit_res.target_height == 1080
    assert fit_res.filtergraph == (
        "scale=w=1080:h=1080:force_original_aspect_ratio=decrease:"
        "force_divisible_by=2:flags=lanczos,"
        "pad=w=1080:h=1080:x=(ow-iw)/2:y=(oh-ih)/2:color=black,setsar=1"
    )

    for bad_kwargs in (
        {"preset": "21:9"},
        {"preset": 169},
        {"mode": "stretch"},
        {"pan_x": 1.1},
        {"pan_y": -1.1},
        {"pan_x": math.nan},
        {"pan_x": True},
        {"enabled": "yes"},
    ):
        with pytest.raises((ValidationError, ValueError)):
            FramingParams(**bad_kwargs)  # type: ignore[arg-type]


def test_real_render_9_16_crop_and_1_1_pad(tmp_path: Path) -> None:
    src = tmp_path / "framing_source.mp4"
    _generate_synthetic_clip(src)

    out_916 = tmp_path / "reels_9_16.mp4"
    plan_916 = build_render_plan(
        input_path=src,
        output_path=out_916,
        profile=RenderProfile.WEB_H264,
        fps=RationalFrameRate(num=25, den=1),
        framing=FramingParams(preset="9:16", mode="fill"),
        prefer_hw=False,
    )
    assert plan_916.target_width == 1080
    assert plan_916.target_height == 1920
    assert plan_916.framing_mode == "fill"
    assert plan_916.video_filter is not None
    assert "crop=w=1080:h=1920" in plan_916.video_filter

    res_916 = execute_render_plan(plan_916)
    assert res_916.success is True, res_916.stderr_tail
    assert res_916.bytes_written > 0

    probe_916 = probe_media(out_916)
    assert probe_916.width == 1080
    assert probe_916.height == 1920
    assert probe_916.is_cfr is True

    out_11 = tmp_path / "square_1_1_fit.mp4"
    plan_11 = build_render_plan(
        input_path=src,
        output_path=out_11,
        profile=RenderProfile.WEB_H264,
        fps=RationalFrameRate(num=25, den=1),
        framing=FramingParams(preset="1:1", mode="fit"),
        prefer_hw=False,
    )
    assert plan_11.target_width == 1080
    assert plan_11.target_height == 1080
    assert plan_11.framing_mode == "fit"
    assert plan_11.video_filter is not None
    assert "pad=w=1080:h=1080" in plan_11.video_filter

    res_11 = execute_render_plan(plan_11)
    assert res_11.success is True, res_11.stderr_tail
    probe_11 = probe_media(out_11)
    assert probe_11.width == 1080
    assert probe_11.height == 1080
    assert probe_11.is_cfr is True


def test_delivery_presets_produce_valid_safe_render_plans(tmp_path: Path) -> None:
    presets = list_delivery_presets()
    assert [p.id for p in presets] == [
        "youtube_1080p_h264",
        "youtube_4k_hevc",
        "reels_tiktok_9_16",
        "broadcast_prores_422",
        "fast_draft_720p",
    ]
    assert [p.label for p in presets] == [
        "YouTube 1080p H.264",
        "YouTube 4K HEVC",
        "Reels / TikTok 9:16",
        "Broadcast ProRes 422",
        "Fast Draft 720p",
    ]
    assert get_delivery_preset("  YOUTUBE_4K_HEVC ").id == "youtube_4k_hevc"

    sw_caps = HardwareCapabilities(
        ffmpeg_path="ffmpeg",
        h264_nvenc=False,
        hevc_nvenc=False,
        libx264=True,
        libx265=True,
        prores_ks=True,
    )
    hw_caps = HardwareCapabilities(
        ffmpeg_path="ffmpeg",
        h264_nvenc=True,
        hevc_nvenc=True,
        libx264=True,
        libx265=True,
        prores_ks=True,
    )

    for preset in presets:
        src = tmp_path / "source.mp4"
        out = tmp_path / f"{preset.id}.{preset.container}"

        sw_plan = build_render_plan(
            input_path=src,
            output_path=out,
            fps=RationalFrameRate(num=25, den=1),
            prefer_hw=False,
            caps=sw_caps,
            delivery_preset=preset.id,
        )
        assert sw_plan.delivery_preset == preset.id
        assert sw_plan.profile == preset.profile
        assert sw_plan.target_width == preset.width
        assert sw_plan.target_height == preset.height
        assert sw_plan.framing_mode == preset.framing_mode
        assert sw_plan.faststart is (preset.container == "mp4")
        assert sw_plan.video_crf == preset.crf
        assert sw_plan.audio_bitrate_kbps == preset.audio_bitrate_kbps
        assert sw_plan.target_lufs == preset.target_lufs
        assert sw_plan.video_filter is not None
        assert f"scale=w={preset.width}:h={preset.height}" in sw_plan.video_filter
        assert f"crop=w={preset.width}:h={preset.height}" in sw_plan.video_filter
        assert sw_plan.audio_filter is not None
        assert f"loudnorm=I={preset.target_lufs:.1f}" in sw_plan.audio_filter

        if preset.profile == RenderProfile.PRORES_HQ:
            assert sw_plan.encoder == "prores_ks"
            assert sw_plan.pix_fmt == "yuv422p10le"
            assert "pcm_s24le" in sw_plan.argv
            assert "-movflags" not in sw_plan.argv
        else:
            expected_enc = "libx265" if preset.profile == RenderProfile.MASTER_HEVC else "libx264"
            assert sw_plan.encoder == expected_enc
            assert sw_plan.pix_fmt == "yuv420p"
            assert "-crf" in sw_plan.argv
            assert str(preset.crf) in sw_plan.argv
            assert f"{preset.audio_bitrate_kbps}k" in sw_plan.argv
            assert "+faststart" in sw_plan.argv

        hw_plan = build_render_plan(
            input_path=src,
            output_path=out,
            fps=RationalFrameRate(num=25, den=1),
            prefer_hw=True,
            caps=hw_caps,
            delivery_preset=preset.id,
        )
        if preset.id == "youtube_4k_hevc":
            assert hw_plan.encoder == "hevc_nvenc"
            assert "-cq" in hw_plan.argv
            assert "20" in hw_plan.argv
        elif preset.id == "fast_draft_720p":
            assert hw_plan.encoder == "h264_nvenc"
            assert "p3" in hw_plan.argv
            assert "26" in hw_plan.argv
            assert "veryfast" in sw_plan.argv

    # Validation bounds for custom CRF, audio bitrate, encoder preset, and custom raster
    for bad_preset in ("", "unknown_preset", "youtube;evil"):
        with pytest.raises(ValueError):
            get_delivery_preset(bad_preset)
    for bad_crf in (-1, 52, True):
        with pytest.raises(ValueError):
            build_render_plan(
                input_path=tmp_path / "in.mp4",
                output_path=tmp_path / "out.mp4",
                prefer_hw=False,
                caps=sw_caps,
                video_crf=bad_crf,  # type: ignore[arg-type]
            )
    for bad_kbps in (32, 640, False):
        with pytest.raises(ValueError):
            build_render_plan(
                input_path=tmp_path / "in.mp4",
                output_path=tmp_path / "out.mp4",
                prefer_hw=False,
                caps=sw_caps,
                audio_bitrate_kbps=bad_kbps,  # type: ignore[arg-type]
            )
    with pytest.raises(ValueError):
        build_render_plan(
            input_path=tmp_path / "in.mp4",
            output_path=tmp_path / "out.mp4",
            prefer_hw=False,
            caps=sw_caps,
            encoder_preset="ultrafast;rm",
        )
    for bad_framing in (
        {"target_width": 1280},
        {"target_width": 1281, "target_height": 720},
        {"target_width": 64, "target_height": 64},
    ):
        with pytest.raises((ValidationError, ValueError)):
            FramingParams(**bad_framing)  # type: ignore[arg-type]

    # Real FFmpeg execution check for Fast Draft 720p preset
    real_src = tmp_path / "preset_exec_src.mp4"
    _generate_synthetic_clip(real_src)
    draft_out = tmp_path / "fast_draft_720p.mp4"
    draft_plan = build_render_plan(
        input_path=real_src,
        output_path=draft_out,
        fps=RationalFrameRate(num=25, den=1),
        prefer_hw=False,
        delivery_preset="fast_draft_720p",
    )
    draft_res = execute_render_plan(draft_plan)
    assert draft_res.success is True, draft_res.stderr_tail
    draft_probe = probe_media(draft_out)
    assert draft_probe.width == 1280
    assert draft_probe.height == 720
    assert draft_probe.video_codec == "h264"
    assert draft_probe.has_faststart is True


def test_compile_transform_filter_and_real_ffmpeg_smoke(tmp_path: Path) -> None:
    identity = ClipTransformParams()
    assert identity.is_identity() is True
    assert compile_transform_filter(identity) is None
    identity_res = compile_transform_filter_result(identity)
    assert identity_res.is_identity is True
    assert identity_res.filtergraph == ""
    assert identity_res.ffmpeg_vf_args == []

    # PiP Bottom-Right preset
    pip = ClipTransformParams(zoom_pct=28.0, pos_x_pct=32.0, pos_y_pct=32.0)
    assert pip.is_identity() is False
    pip_fg = compile_transform_filter(pip)
    assert pip_fg is not None
    assert "scale=w=ceil(iw*0.280000/2)*2:h=ceil(ih*0.280000/2)*2" in pip_fg
    assert "overlay=x=(W-w)/2+W*(0.3200):y=(H-h)/2+H*(0.3200)" in pip_fg

    # Zoom + Rotation + Opacity
    xf = ClipTransformParams(
        zoom_pct=115.0,
        pos_x_pct=-15.0,
        pos_y_pct=10.0,
        rotation_deg=25.0,
        opacity_pct=75.0,
    )
    xf_res = compile_transform_filter_result(xf, pix_fmt="yuv420p")
    assert xf_res.is_identity is False
    assert xf_res.ffmpeg_vf_args[0] == "-vf"
    assert "rotate=" in xf_res.filtergraph
    assert "colorchannelmixer=aa=0.7500" in xf_res.filtergraph
    assert xf_res.filtergraph.endswith(",format=yuv420p")

    # Zero opacity compiles to black drawbox
    zero_op = ClipTransformParams(opacity_pct=0.0)
    zero_fg = compile_transform_filter(zero_op)
    assert zero_fg == "drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill,setsar=1"

    # Strict validation bounds
    for bad_kwargs in (
        {"zoom_pct": 9.9},
        {"zoom_pct": 300.1},
        {"pos_x_pct": -100.1},
        {"pos_x_pct": 100.1},
        {"pos_y_pct": -101.0},
        {"pos_y_pct": 101.0},
        {"rotation_deg": -180.1},
        {"rotation_deg": 180.1},
        {"opacity_pct": -0.1},
        {"opacity_pct": 100.1},
        {"zoom_pct": float("nan")},
        {"zoom_pct": True},
    ):
        with pytest.raises((ValidationError, ValueError)):
            ClipTransformParams(**bad_kwargs)  # type: ignore[arg-type]

    with pytest.raises(ValueError):
        compile_transform_filter(pip, pix_fmt="yuv420p;evil")

    # Real FFmpeg smoke test with transformed clip render
    src = tmp_path / "transform_src.mp4"
    _generate_synthetic_clip(src)
    out = tmp_path / "transform_pip_rot.mp4"
    plan = build_render_plan(
        input_path=src,
        output_path=out,
        profile=RenderProfile.WEB_H264,
        fps=RationalFrameRate(num=25, den=1),
        transform_params=ClipTransformParams(
            zoom_pct=28.0,
            pos_x_pct=32.0,
            pos_y_pct=32.0,
            rotation_deg=-12.0,
            opacity_pct=85.0,
        ),
        prefer_hw=False,
    )
    assert plan.video_filter is not None
    assert "overlay=" in plan.video_filter
    result = execute_render_plan(plan)
    assert result.success is True, result.stderr_tail
    assert result.bytes_written > 0

    probe = probe_media(out)
    assert probe.width == 640
    assert probe.height == 360
    assert probe.video_codec == "h264"
    assert probe.pix_fmt == "yuv420p"
    assert probe.is_cfr is True


def test_compile_auto_duck_filter_and_strict_bounds(tmp_path: Path) -> None:
    default_duck = AutoDuckParams()
    assert default_duck.enabled is False
    assert default_duck.threshold_db == -24.0
    assert default_duck.ratio == 6.0
    assert default_duck.attack_ms == 40.0
    assert default_duck.release_ms == 400.0
    assert default_duck.is_identity() is True
    assert compile_auto_duck_filter(default_duck) is None

    idle_res = compile_auto_duck_filter_result(default_duck)
    assert idle_res.is_identity is True
    assert idle_res.filtergraph == ""
    assert idle_res.ffmpeg_args == []

    active = AutoDuckParams(
        enabled=True,
        threshold_db=-24.0,
        ratio=6.0,
        attack_ms=40.0,
        release_ms=400.0,
    )
    assert active.is_identity() is False
    expected_thresh = 10.0 ** (-24.0 / 20.0)
    assert math.isclose(active.threshold_linear(), expected_thresh, rel_tol=1e-9)

    fg = compile_auto_duck_filter(active)
    assert fg == (
        f"[0:a][1:a]sidechaincompress=threshold={expected_thresh:.6f}:"
        "ratio=6.00:attack=40.0:release=400.0[aout]"
    )

    mixed_res = compile_auto_duck_filter_result(
        AutoDuckParams(
            enabled=True,
            threshold_db=-18.0,
            ratio=8.0,
            attack_ms=25.0,
            release_ms=650.0,
        ),
        music_pad="mx",
        sidechain_pad="vo",
        output_pad="mix_out",
        mix_sidechain=True,
    )
    assert mixed_res.is_identity is False
    assert mixed_res.ffmpeg_args[0] == "-filter_complex"
    assert mixed_res.ffmpeg_args[2:] == ["-map", "[mix_out]"]
    assert "[vo]asplit[sc_trig][sc_vo]" in mixed_res.filtergraph
    assert "[mx][sc_trig]sidechaincompress=" in mixed_res.filtergraph
    assert "ratio=8.00:attack=25.0:release=650.0" in mixed_res.filtergraph
    assert "amix=inputs=2:duration=longest:normalize=0[mix_out]" in mixed_res.filtergraph

    # Strict bounds and type checks
    for bad_kwargs in (
        {"enabled": "true"},
        {"enabled": 1},
        {"threshold_db": -40.1},
        {"threshold_db": -5.9},
        {"threshold_db": math.nan},
        {"threshold_db": True},
        {"ratio": 1.9},
        {"ratio": 12.1},
        {"ratio": math.inf},
        {"attack_ms": 9.9},
        {"attack_ms": 200.1},
        {"release_ms": 99.9},
        {"release_ms": 1500.1},
    ):
        with pytest.raises((ValidationError, ValueError)):
            AutoDuckParams(**bad_kwargs)  # type: ignore[arg-type]

    with pytest.raises(ValueError, match="pad label"):
        compile_auto_duck_filter(active, music_pad="0:a;evil")

    # Real FFmpeg integration test with synthetic music + VO sidechain
    ducked_wav = tmp_path / "ducked_mix.wav"
    exec_res = compile_auto_duck_filter_result(active, mix_sidechain=True)
    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=220:sample_rate=48000:duration=1.5",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=880:sample_rate=48000:duration=1.5",
        *exec_res.ffmpeg_args,
        "-c:a",
        "pcm_s16le",
        str(ducked_wav),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    assert proc.returncode == 0, proc.stderr
    assert ducked_wav.is_file() and ducked_wav.stat().st_size > 1000


def test_compile_fairlight_loudness_and_dialogue_eq_filters(tmp_path: Path) -> None:
    default_fl = FairlightAudioParams()
    assert default_fl.loudness_preset == "off"
    assert default_fl.dialogue_eq == "off"
    assert default_fl.is_identity() is True
    assert compile_fairlight_audio_filter(default_fl) is None
    assert compile_loudness_preset_filter("off") is None
    assert compile_dialogue_eq_filter("off") is None

    assert compile_loudness_preset_filter("youtube_14") == "loudnorm=I=-14.0:TP=-1.0:LRA=11"
    assert compile_loudness_preset_filter("reels_16") == "loudnorm=I=-16.0:TP=-1.0:LRA=11"
    assert compile_loudness_preset_filter("broadcast_23") == "loudnorm=I=-23.0:TP=-1.0:LRA=11"

    assert (
        compile_dialogue_eq_filter("voice_clarity")
        == "highpass=f=80,equalizer=f=3000:t=q:w=1.2:g=3"
    )
    assert (
        compile_dialogue_eq_filter("podcast_warm")
        == "highpass=f=70,equalizer=f=180:t=q:w=1.0:g=2,equalizer=f=4000:t=q:w=1.2:g=2"
    )
    assert compile_dialogue_eq_filter("derumble") == "highpass=f=100"

    combined = FairlightAudioParams(loudness_preset="youtube_14", dialogue_eq="voice_clarity")
    assert combined.is_identity() is False
    assert compile_fairlight_audio_filter(combined) == (
        "highpass=f=80,equalizer=f=3000:t=q:w=1.2:g=3,loudnorm=I=-14.0:TP=-1.0:LRA=11"
    )

    compiled_res = compile_audio_filter_result(
        ClipAudioParams(gain_db=-2.5, fade_in_s=0.2),
        clip_duration_s=3.0,
        loudness_preset="reels_16",
        dialogue_eq="podcast_warm",
    )
    assert compiled_res.is_identity is False
    assert compiled_res.loudness_preset == "reels_16"
    assert compiled_res.dialogue_eq == "podcast_warm"
    assert compiled_res.filtergraph == (
        "volume=-2.50dB,afade=t=in:st=0.000:d=0.200,"
        "highpass=f=70,equalizer=f=180:t=q:w=1.0:g=2,equalizer=f=4000:t=q:w=1.2:g=2,"
        "loudnorm=I=-16.0:TP=-1.0:LRA=11"
    )
    assert compiled_res.ffmpeg_af_args == ["-af", compiled_res.filtergraph]

    muted_res = compile_audio_filter_result(
        ClipAudioParams(gain_db=3.0, muted=True),
        loudness_preset="broadcast_23",
        dialogue_eq="derumble",
    )
    assert muted_res.filtergraph == "volume=0"

    # Strict validation checks
    for bad_loud in ("", "spotify_14", "youtube_14;evil", 14, True, None):
        with pytest.raises((ValidationError, ValueError)):
            FairlightAudioParams(loudness_preset=bad_loud)  # type: ignore[arg-type]
    for bad_eq in ("", "bass_boost", "highpass=f=80;evil", 80, False, None):
        with pytest.raises((ValidationError, ValueError)):
            FairlightAudioParams(dialogue_eq=bad_eq)  # type: ignore[arg-type]
    with pytest.raises(ValidationError):
        FairlightAudioParams.model_validate({"loudness_preset": "off", "extra_field": 1})

    # RenderPlan integration + real FFmpeg execution on synthetic audio
    src = tmp_path / "fairlight_src.mp4"
    _generate_synthetic_clip(src)

    for eq_id, loud_id, expected_lufs in (
        ("voice_clarity", "youtube_14", -14.0),
        ("podcast_warm", "reels_16", -16.0),
        ("derumble", "broadcast_23", -23.0),
    ):
        out = tmp_path / f"fairlight_{eq_id}_{loud_id}.mp4"
        plan = build_render_plan(
            input_path=src,
            output_path=out,
            profile=RenderProfile.WEB_H264,
            fps=RationalFrameRate(num=25, den=1),
            loudness_preset=loud_id,  # type: ignore[arg-type]
            dialogue_eq=eq_id,  # type: ignore[arg-type]
            prefer_hw=False,
        )
        assert plan.loudness_preset == loud_id
        assert plan.dialogue_eq == eq_id
        assert plan.target_lufs == expected_lufs
        assert plan.audio_filter is not None
        assert f"loudnorm=I={expected_lufs:.1f}:TP=-1.0:LRA=11" in plan.audio_filter
        res = execute_render_plan(plan)
        assert res.success is True, res.stderr_tail
        assert res.bytes_written > 0
        loud_report = audit_loudness(
            out,
            target_lufs=expected_lufs,
            tolerance_lu=2.0,
            max_true_peak_dbtp=-0.5,
        )
        assert loud_report.passed is True, loud_report

    # Explicit loudness_preset='off' with target_lufs=None suppresses delivery preset loudnorm
    off_plan = build_render_plan(
        input_path=src,
        output_path=tmp_path / "fairlight_off.mp4",
        delivery_preset="youtube_1080p_h264",
        loudness_preset="off",
        dialogue_eq="derumble",
        target_lufs=None,
        prefer_hw=False,
    )
    assert off_plan.audio_filter == "highpass=f=100"
    assert off_plan.target_lufs is None
