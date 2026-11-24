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
    MOTION_TEMPLATES,
    TITLE_PRESETS,
    TitleOverlayParams,
    apply_motion_template,
    apply_title_preset,
    compile_title_filter,
    compile_title_overlay,
    escape_ffmpeg_drawtext_text,
    evaluate_title_motion,
    get_motion_template,
    get_title_preset,
    list_motion_templates,
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


def test_motion_templates_catalog_and_physics_validation() -> None:
    templates = list_motion_templates()
    assert len(templates) == 6
    assert [t.id for t in templates] == [
        "lower_third_editorial",
        "kinetic_spring_pop",
        "typewriter_terminal",
        "broadcast_corner_bug",
        "chapter_slate_card",
        "breaking_ticker_bar",
    ]
    assert len(MOTION_TEMPLATES) == 6

    tpl = get_motion_template("kinetic spring pop")
    assert tpl.id == "kinetic_spring_pop"
    assert tpl.params.animation_curve == "spring_overshoot"

    copied = apply_motion_template("typewriter_terminal")
    copied.title = "MUTATED"
    assert get_motion_template("typewriter_terminal").params.title != "MUTATED"

    with pytest.raises(ValueError, match="Unknown motion template"):
        get_motion_template("unknown_motion_tpl")

    for bad in (
        {"pos_x": 0.01},
        {"pos_y": 0.99},
        {"anim_in_s": 0.01},
        {"anim_out_s": -0.5},
        {"spring_stiffness": 10.0},
        {"spring_damping": 1.0},
        {"tracking": 30},
        {"stroke_width": 15},
        {"stroke_color": "blue"},
        {"shadow_depth": 20},
        {"bug_badge": "X" * 25},
        {"animation_curve": "bounce_invalid"},
        {"plate_style": "neon_box"},
    ):
        with pytest.raises((ValidationError, ValueError)):
            TitleOverlayParams(**bad)  # type: ignore[arg-type]


def test_evaluate_title_motion_curves_and_typewriter() -> None:
    spring_params = apply_motion_template("kinetic_spring_pop")
    spring_params.spring_stiffness = 380.0
    spring_params.spring_damping = 8.0

    outside = evaluate_title_motion(spring_params, 0.05)
    assert outside.visible is False
    assert outside.phase == "outside"
    assert outside.alpha == 0.0

    # Sample spring curve during anim_in to verify overshoot > 1.0
    samples = [
        evaluate_title_motion(spring_params, spring_params.start_s + 0.05 * i).eased_in
        for i in range(1, 11)
    ]
    assert max(samples) > 1.0

    hold = evaluate_title_motion(spring_params, 2.0)
    assert hold.visible is True
    assert hold.phase == "hold"
    assert hold.alpha == 1.0
    assert hold.eased_in == 1.0

    tw_params = apply_motion_template("typewriter_terminal")
    tw_start = evaluate_title_motion(tw_params, tw_params.start_s + 0.08)
    tw_mid = evaluate_title_motion(tw_params, tw_params.start_s + tw_params.anim_in_s * 0.5)
    tw_end = evaluate_title_motion(tw_params, tw_params.start_s + tw_params.anim_in_s + 0.1)
    assert 0 < tw_start.reveal_chars_title < tw_mid.reveal_chars_title <= tw_end.reveal_chars_title
    assert tw_end.reveal_chars_title == len(sanitize_title_text(tw_params.title))


def test_motion_title_compile_curves_bugs_and_escaping() -> None:
    for tpl in list_motion_templates():
        res = compile_title_overlay(tpl.params)
        assert res.is_active is True
        assert res.has_motion is True
        assert res.animation_curve == tpl.params.animation_curve
        assert "expansion=none" in res.filtergraph
        assert "\n" not in res.filtergraph

    bug_injected = TitleOverlayParams(
        title="Host: 'Live'",
        subtitle="Studio",
        custom_position_enabled=True,
        pos_x=0.82,
        pos_y=0.14,
        animation_curve="spring_overshoot",
        plate_style="outline_frame",
        stroke_width=3,
        stroke_color="#101216",
        bug_badge="CAM: '1' \\ \nLIVE",
    )
    compiled = compile_title_overlay(bug_injected)
    assert "borderw=3:bordercolor=0x101216" in compiled.filtergraph
    assert "exp(-" in compiled.filtergraph
    assert "cos(" in compiled.filtergraph
    assert "\n" not in compiled.filtergraph
    assert "\\:" in compiled.escaped_bug_badge


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg binary not available")
def test_real_ffmpeg_motion_spring_and_typewriter_render(tmp_path: Path) -> None:
    src = tmp_path / "motion_src.mp4"
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
            "color=c=0x101012:s=640x360:d=1.8:r=25",
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=48000:cl=stereo:d=1.8",
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

    caps = HardwareCapabilities(ffmpeg_path=shutil.which("ffmpeg") or "ffmpeg", libx264=True)
    for tpl_id in ("kinetic_spring_pop", "typewriter_terminal"):
        params = apply_motion_template(tpl_id)
        params.start_s = 0.2
        params.end_s = 1.5
        out = tmp_path / f"{tpl_id}.mp4"
        plan = build_render_plan(
            input_path=src,
            output_path=out,
            profile=RenderProfile.WEB_H264,
            title_overlay=params,
            caps=caps,
            prefer_hw=False,
        )
        result = execute_render_plan(plan)
        assert result.success is True, f"{tpl_id} failed: {result.stderr_tail}"
        assert out.is_file() and result.bytes_written > 0

