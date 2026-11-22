"""Tests for SRT/WebVTT caption parser/exporter, XSS stripping, and FFmpeg burn-in compiler."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest
from pydantic import ValidationError

from taktcut.models import HardwareCapabilities, RenderProfile
from taktcut.remote_render import RemoteRenderJobRequest
from taktcut.render import build_render_plan, execute_render_plan
from taktcut.subtitles import (
    CAPTION_STYLES,
    SubtitleCue,
    SubtitleTrackParams,
    compile_subtitles,
    compile_subtitles_filter,
    export_srt,
    export_vtt,
    format_srt_timestamp,
    format_vtt_timestamp,
    get_caption_style,
    list_caption_styles,
    parse_srt,
    parse_srt_timestamp,
    parse_vtt,
    parse_vtt_timestamp,
    sanitize_caption_text,
)


def test_caption_styles_catalog_and_lookup() -> None:
    styles = list_caption_styles()
    assert len(styles) == 3
    assert [s.id for s in styles] == [
        "clean_white",
        "yellow_broadcast",
        "boxed_social",
    ]
    assert [s.name for s in CAPTION_STYLES] == [
        "Clean White",
        "Yellow Broadcast",
        "Boxed Social",
    ]
    assert get_caption_style("Yellow Broadcast").id == "yellow_broadcast"
    assert get_caption_style("boxed_social").box_opacity == 0.86

    with pytest.raises(ValueError, match="Unknown caption style"):
        get_caption_style("neon_party")


def test_srt_parse_and_export_roundtrip() -> None:
    raw_srt = (
        "\ufeff1\r\n"
        "00:00:00,500 --> 00:00:02,750\r\n"
        "Clean-room OpenTimelineIO\r\n"
        "interchange workflow\r\n"
        "\r\n"
        "2\r\n"
        "00:00:03,000 --> 00:00:05,250\r\n"
        "Broadcast Rec.709 delivery\r\n"
    )
    cues = parse_srt(raw_srt)
    assert len(cues) == 2
    assert cues[0].index == 1
    assert cues[0].start_s == 0.5
    assert cues[0].end_s == 2.75
    assert cues[0].text == "Clean-room OpenTimelineIO\ninterchange workflow"
    assert cues[1].start_s == 3.0
    assert cues[1].end_s == 5.25

    exported = export_srt(cues)
    assert "00:00:00,500 --> 00:00:02,750" in exported
    assert "00:00:03,000 --> 00:00:05,250" in exported
    reparsed = parse_srt(exported)
    assert reparsed == cues


def test_vtt_parse_and_export_roundtrip() -> None:
    raw_vtt = (
        "\ufeffWEBVTT - Studio Captions\n\n"
        "NOTE This comment block should be skipped\n\n"
        "STYLE\n::cue { color: white; }\n\n"
        "00:01.250 --> 00:04.500 align:start position:10%\n"
        "First VTT cue\n\n"
        "cue-two\n"
        "00:00:05.000 --> 00:00:08.125\n"
        "Second VTT cue\n"
    )
    cues = parse_vtt(raw_vtt)
    assert len(cues) == 2
    assert cues[0].start_s == 1.25
    assert cues[0].end_s == 4.5
    assert cues[0].text == "First VTT cue"
    assert cues[1].start_s == 5.0
    assert cues[1].end_s == 8.125

    exported = export_vtt(cues)
    assert exported.startswith("WEBVTT\n\n")
    assert "00:00:01.250 --> 00:00:04.500" in exported
    assert "00:00:05.000 --> 00:00:08.125" in exported
    reparsed = parse_vtt(exported)
    assert reparsed == cues


def test_strict_timestamp_and_malformed_input_rejection() -> None:
    assert parse_srt_timestamp("01:02:03,450") == 3723.45
    assert parse_vtt_timestamp("02:03.450") == 123.45
    assert format_srt_timestamp(3723.45) == "01:02:03,450"
    assert format_vtt_timestamp(123.45) == "00:02:03.450"

    bad_srt_ts = [
        "00:00:01.500",  # dot not allowed in SRT
        "00:60:00,000",  # minutes >= 60
        "00:00:60,000",  # seconds >= 60
        "00:00:01,50",   # 2-digit millis
        "-00:00:01,000",
        "25:00:00,000",  # exceeds 24h
    ]
    for raw_ts in bad_srt_ts:
        with pytest.raises(ValueError):
            parse_srt_timestamp(raw_ts)

    bad_vtt_ts = [
        "00:00:01,500",  # comma not allowed in VTT
        "00:61.000",
        "00:00:01.5",
        "99:00:00.000",
    ]
    for raw_ts in bad_vtt_ts:
        with pytest.raises(ValueError):
            parse_vtt_timestamp(raw_ts)

    bad_srt_payloads = [
        "",
        "   \n  ",
        "not an srt file",
        "abc\n00:00:01,000 --> 00:00:02,000\nHello",
        "1\n00:00:05,000 --> 00:00:02,000\nReversed",
        "1\n00:00:02,000 --> 00:00:02,000\nZero length",
        "1\n00:00:01,000 --> 00:00:02,000\n<b></b>",
    ]
    for payload in bad_srt_payloads:
        with pytest.raises(ValueError):
            parse_srt(payload)

    bad_vtt_payloads = [
        "",
        "1\n00:00:01.000 --> 00:00:02.000\nMissing header",
        "WEBVTT\n\n00:00:05.000 --> 00:00:02.000\nReversed",
        "WEBVTT\n\nbad cue without arrow\nHello",
    ]
    for payload in bad_vtt_payloads:
        with pytest.raises(ValueError):
            parse_vtt(payload)


def test_xss_html_and_control_char_stripping() -> None:
    dirty = (
        "<i>Hello</i> <scr<script>ipt>alert('xss')</scr</script>ipt>"
        "<script>evil()</script><img src=x onerror=alert(1)>\x00\x1b\x7f <b>Studio</b>"
    )
    cleaned = sanitize_caption_text(dirty)
    assert "<" not in cleaned
    assert ">" not in cleaned
    assert "evil()" not in cleaned
    assert "\x00" not in cleaned
    assert "\x1b" not in cleaned
    assert "\x7f" not in cleaned
    assert "Hello" in cleaned
    assert "Studio" in cleaned

    srt_with_xss = (
        "1\n"
        "00:00:00,500 --> 00:00:03,000\n"
        "<script>fetch('https://bad.example')</script><b>Broadcast</b>\x00 Cue\n"
    )
    cues = parse_srt(srt_with_xss)
    assert len(cues) == 1
    assert cues[0].text == "Broadcast Cue"

    with pytest.raises((ValidationError, ValueError)):
        SubtitleCue(index=1, start_s=2.0, end_s=1.0, text="Invalid")

    with pytest.raises((ValidationError, ValueError)):
        SubtitleTrackParams(font_size=10)


def test_compile_subtitles_styles_and_ffmpeg_injection_escaping() -> None:
    payload = "Host: 'Live' \\ path\\',drawbox=x=0:color=red;[in]100% %{localtime}\nLine2\x07End"
    cues = [
        SubtitleCue(index=1, start_s=0.5, end_s=2.5, text=payload),
        SubtitleCue(index=2, start_s=3.0, end_s=5.0, text="Second cue"),
    ]

    res_white = compile_subtitles(
        SubtitleTrackParams(cues=cues, style="clean_white", font_size=34, enabled=True),
        pix_fmt="yuv420p",
    )
    assert res_white.is_active is True
    assert res_white.cue_count == 2
    assert "\n" not in res_white.filtergraph
    assert "\r" not in res_white.filtergraph
    assert "expansion=none" in res_white.filtergraph
    assert "fontcolor=0xffffff" in res_white.filtergraph
    assert "enable='between(t,0.500,2.500)'" in res_white.filtergraph
    assert "enable='between(t,3.000,5.000)'" in res_white.filtergraph
    assert "\\\\" in res_white.filtergraph
    assert "'\\\\\\''" in res_white.filtergraph
    assert res_white.filtergraph.endswith("format=yuv420p")

    fg_yellow = compile_subtitles_filter(
        SubtitleTrackParams(cues=cues[:1], style="yellow_broadcast", font_size=36)
    )
    assert "fontcolor=0xffe047" in fg_yellow
    assert "box=1:boxcolor=0x0c0c0e@0.55" in fg_yellow

    fg_boxed = compile_subtitles_filter(
        SubtitleTrackParams(cues=cues[:1], style="boxed_social", font_size=38)
    )
    assert "fontcolor=0xffffff" in fg_boxed
    assert "box=1:boxcolor=0x141416@0.86:boxborderw=12" in fg_boxed

    bypassed = compile_subtitles(SubtitleTrackParams(cues=cues, enabled=False))
    assert bypassed.is_active is False
    assert bypassed.filtergraph == ""
    assert bypassed.ffmpeg_vf_args == []

    with pytest.raises(ValueError, match="Unsupported pixel format"):
        compile_subtitles_filter(SubtitleTrackParams(cues=cues), pix_fmt="bgr0")


def test_build_render_plan_and_remote_request_include_subtitles(tmp_path: Path) -> None:
    sub_track = SubtitleTrackParams(
        cues=[SubtitleCue(index=1, start_s=0.25, end_s=1.75, text="Caption Test")],
        style="boxed_social",
        font_size=38,
        enabled=True,
    )
    caps = HardwareCapabilities(ffmpeg_path="ffmpeg", libx264=True)
    plan = build_render_plan(
        input_path=tmp_path / "in.mp4",
        output_path=tmp_path / "out.mp4",
        profile=RenderProfile.WEB_H264,
        subtitle_track=sub_track,
        caps=caps,
        prefer_hw=False,
    )
    assert plan.video_filter is not None
    assert "drawtext=" in plan.video_filter
    assert "boxcolor=0x141416@0.86" in plan.video_filter
    assert "enable='between(t,0.250,1.750)'" in plan.video_filter

    req = RemoteRenderJobRequest(
        input_filename="in.mp4",
        output_filename="out.mp4",
        subtitle_track=sub_track,
    )
    assert req.subtitle_track is not None
    assert req.subtitle_track.style == "boxed_social"


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg binary not available")
def test_real_ffmpeg_subtitles_burnin_smoke(tmp_path: Path) -> None:
    src = tmp_path / "src_dark.mp4"
    out = tmp_path / "subtitled_out.mp4"

    gen_proc = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=0x101012:s=640x360:d=2.0:r=25",
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=48000:cl=stereo:d=2.0",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-shortest",
            str(src),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert gen_proc.returncode == 0, gen_proc.stderr

    sub_track = SubtitleTrackParams(
        cues=[
            SubtitleCue(
                index=1,
                start_s=0.4,
                end_s=1.4,
                text="Studio: 'Live' \\ [100%]\nCaption Line 2",
            )
        ],
        style="yellow_broadcast",
        font_size=36,
        enabled=True,
    )
    caps = HardwareCapabilities(
        ffmpeg_path=shutil.which("ffmpeg") or "ffmpeg",
        libx264=True,
    )
    plan = build_render_plan(
        input_path=src,
        output_path=out,
        profile=RenderProfile.WEB_H264,
        subtitle_track=sub_track,
        caps=caps,
        prefer_hw=False,
    )
    result = execute_render_plan(plan)
    assert result.success is True, result.stderr_tail
    assert out.is_file()
    assert result.bytes_written > 0
