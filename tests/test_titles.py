"""Tests for Titles & Lower-Thirds presets, strict FFmpeg escaping, and real FFmpeg render."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest
from pydantic import ValidationError

from taktcut.models import HardwareCapabilities, RenderProfile
from taktcut.remote_render import RemoteRenderJobRequest
from taktcut.render import build_render_plan, execute_render_plan
from taktcut.titles import (
    TITLE_PRESETS,
    TitleOverlayParams,
    apply_title_preset,
    compile_title_filter,
    compile_title_overlay,
    escape_ffmpeg_drawtext_text,
    get_title_preset,
    list_title_presets,
    sanitize_title_text,
)


def test_title_presets_catalog_and_lookup() -> None:
    presets = list_title_presets()
    assert len(presets) == 3
    assert [p.id for p in presets] == [
        "broadcast_lower_third",
        "center_title_card",
        "minimal_subtitle",
    ]
    assert [p.name for p in TITLE_PRESETS] == [
        "Broadcast Lower-Third",
        "Center Title Card",
        "Minimal Subtitle",
    ]

    by_name = get_title_preset("center title card")
    assert by_name.id == "center_title_card"
    assert by_name.params.position == "center"

    copied = apply_title_preset("minimal_subtitle")
    assert copied.position == "bottom-center"
    copied.title = "Mutated Copy"
    assert get_title_preset("minimal_subtitle").params.title != "Mutated Copy"

    with pytest.raises(ValueError, match="Unknown title preset"):
        get_title_preset("nonexistent_preset")


def test_title_params_strict_validation() -> None:
    valid = TitleOverlayParams(
        preset_id="broadcast_lower_third",
        title="MARC DELACROIX",
        subtitle="Director of Photography",
        position="bottom-left",
        accent_color="#E68442",
        start_s=0.0,
        end_s=5.0,
        font_size=36,
        box_opacity=0.85,
    )
    assert valid.accent_color == "#e68442"
    assert valid.is_active() is True

    invalid_cases: list[dict[str, object]] = [
        {"accent_color": "red"},
        {"accent_color": "#fff"},
        {"accent_color": "#e68442:fontcolor=red"},
        {"position": "top-right"},
        {"start_s": 5.0, "end_s": 5.0},
        {"start_s": 6.0, "end_s": 5.0},
        {"start_s": -0.1, "end_s": 2.0},
        {"start_s": float("nan"), "end_s": 2.0},
        {"start_s": False, "end_s": 2.0},
        {"end_s": float("inf")},
        {"font_size": 10},
        {"font_size": 120},
        {"font_size": True},
        {"box_opacity": -0.1},
        {"box_opacity": 1.2},
        {"box_opacity": False},
        {"title": "x" * 201},
        {"subtitle": 123},
    ]
    for kwargs in invalid_cases:
        with pytest.raises((ValidationError, ValueError)):
            TitleOverlayParams(**kwargs)  # type: ignore[arg-type]


def test_strict_ffmpeg_drawtext_escaping_blocks_injection() -> None:
    payload = "Host: 'Live' \\ path\\',drawbox=x=0:color=red;[in]100% %{localtime}\r\nLine2\x00End"
    sanitized = sanitize_title_text(payload)
    assert "\n" not in sanitized
    assert "\r" not in sanitized
    assert "\x00" not in sanitized

    escaped = escape_ffmpeg_drawtext_text(payload)
    assert "\n" not in escaped
    assert "\r" not in escaped
    # Every colon must be backslash-escaped
    for idx, ch in enumerate(escaped):
        if ch == ":":
            assert idx > 0 and escaped[idx - 1] == "\\"
    # Backslashes doubled before quote-breaks
    assert "\\\\" in escaped
    assert "'\\\\\\''" in escaped

    compiled = compile_title_overlay(
        TitleOverlayParams(
            title=payload,
            subtitle="Sub: 'Check' \\ 50%\nNext",
            position="bottom-left",
            accent_color="#689cff",
            start_s=1.0,
            end_s=4.5,
        )
    )
    assert compiled.is_active is True
    assert "\n" not in compiled.filtergraph
    assert "\r" not in compiled.filtergraph
    assert "expansion=none" in compiled.filtergraph
    assert "enable='between(t,1.000,4.500)'" in compiled.filtergraph
    assert "drawbox=" in compiled.filtergraph
    assert "drawtext=" in compiled.filtergraph
    assert compiled.ffmpeg_vf_args == ["-vf", compiled.filtergraph]


def test_inactive_or_empty_title_returns_empty_filtergraph() -> None:
    bypassed = TitleOverlayParams(title="Hello", subtitle="World", enabled=False)
    assert bypassed.is_active() is False
    res_bypassed = compile_title_overlay(bypassed)
    assert res_bypassed.filtergraph == ""
    assert res_bypassed.ffmpeg_vf_args == []
    assert res_bypassed.is_active is False

    empty_text = TitleOverlayParams(title="   ", subtitle="\n\t", enabled=True)
    assert empty_text.is_active() is False
    assert compile_title_filter(empty_text) == ""

    with pytest.raises(ValueError, match="Unsupported pixel format"):
        compile_title_filter(TitleOverlayParams(), pix_fmt="bgr0")

    with pytest.raises(FileNotFoundError):
        compile_title_filter(TitleOverlayParams(), fontfile=Path("/nonexistent/font.ttf"))

    with pytest.raises(ValueError, match="control characters"):
        compile_title_filter(TitleOverlayParams(), fontfile="bad\nfont.ttf")


def test_build_render_plan_and_remote_request_include_title_overlay(tmp_path: Path) -> None:
    caps = HardwareCapabilities(
        ffmpeg_path="ffmpeg",
        h264_nvenc=False,
        libx264=True,
        libx265=True,
        prores_ks=True,
    )
    title = apply_title_preset("center_title_card")
    plan = build_render_plan(
        input_path=tmp_path / "in.mp4",
        output_path=tmp_path / "out.mp4",
        profile=RenderProfile.WEB_H264,
        title_overlay=title,
        caps=caps,
        prefer_hw=False,
    )
    assert plan.video_filter is not None
    assert "drawbox=" in plan.video_filter
    assert "drawtext=" in plan.video_filter
    assert "format=yuv420p" in plan.video_filter

    req = RemoteRenderJobRequest(
        input_filename="clip.mp4",
        output_filename="titled.mp4",
        title_overlay=title,
    )
    assert req.title_overlay is not None
    assert req.title_overlay.preset_id == "center_title_card"


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg binary not available")
def test_real_ffmpeg_drawtext_drawbox_render_and_time_gate_smoke(tmp_path: Path) -> None:
    src = tmp_path / "src_black.mp4"
    out = tmp_path / "titled_out.mp4"

    # Generate 2.0s solid dark frame source at 25fps
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

    # Title active only during [0.40s, 1.40s] with injection-heavy characters
    title = TitleOverlayParams(
        preset_id="broadcast_lower_third",
        title="Studio: 'Live' \\ [100%];\nMaster",
        subtitle="Cam A: 'Rec.709' \\ 25p",
        position="bottom-left",
        accent_color="#e68442",
        start_s=0.4,
        end_s=1.4,
        font_size=36,
        box_opacity=0.85,
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
        title_overlay=title,
        caps=caps,
        prefer_hw=False,
    )
    result = execute_render_plan(plan)
    assert result.success is True, result.stderr_tail
    assert out.is_file()
    assert result.bytes_written > 0

    def _sample_luma(ts_s: float) -> tuple[float, int]:
        probe = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-ss",
                f"{ts_s:.2f}",
                "-i",
                str(out),
                "-frames:v",
                "1",
                "-f",
                "rawvideo",
                "-pix_fmt",
                "gray",
                "-",
            ],
            capture_output=True,
            check=False,
        )
        assert probe.returncode == 0
        raw = probe.stdout
        assert len(raw) == 640 * 360
        return sum(raw) / len(raw), max(raw)

    # Frame at t=0.08s is outside [0.4, 1.4] -> uniform dark luma
    avg_before, max_before = _sample_luma(0.08)
    # Frame at t=0.80s is inside [0.4, 1.4] -> brighter glyphs & accent bar rendered
    avg_during, max_during = _sample_luma(0.80)
    # Frame at t=1.72s is after 1.4s -> returns to uniform dark luma
    avg_after, max_after = _sample_luma(1.72)

    assert avg_during > avg_before + 0.3
    assert max_before < 32
    assert max_during > 160
    assert max_after < 32
    assert abs(avg_after - avg_before) < 0.2
