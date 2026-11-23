"""Tests for Sapphire-inspired FX compiler, presets, clamping, and /api/fx/compile."""

from __future__ import annotations

import json
import shutil
import subprocess
import threading
import urllib.error
import urllib.request
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest

from taktcut.fx import (
    CHROMA_KEY_PRESETS,
    EASING_TYPES,
    FX_MASK_SHAPES,
    FX_PRESETS,
    FX_TYPES,
    MAX_KEYFRAMES_PER_NODE,
    PRISM_LEAK_CORNERS,
    ChromaKeyParams,
    FxEffectMask,
    FxNode,
    Keyframe,
    PlanarTrackerParams,
    StabilizerParams,
    TrackPointKeyframe,
    apply_chroma_key_preset,
    apply_planar_tracker_preset,
    apply_stabilizer_preset,
    build_fade_keyframes,
    compile_chroma_key,
    compile_fx_filtergraph,
    compile_planar_tracker,
    compile_preset_filtergraph,
    compile_stabilizer,
    default_fx_node,
    evaluate_corner_pins_at_frame,
    evaluate_easing,
    evaluate_keyframes,
    evaluate_node_intensity,
    evaluate_track_point_at_frame,
    get_chroma_key_preset,
    get_fx_preset,
    get_planar_tracker_preset,
    get_stabilizer_preset,
    list_chroma_key_presets,
    list_planar_tracker_presets,
    list_stabilizer_presets,
    normalize_fx_node,
    sample_keyframe_curve,
    track_point_sequence_luma,
)
from taktcut.ui.server import create_ui_server


def _http_call(
    url: str,
    *,
    method: str = "GET",
    payload: Any = None,
) -> tuple[int, bytes]:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"} if payload is not None else {}
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as err:
        return err.code, err.read()


@pytest.fixture()
def fx_ui_server(tmp_path: Path) -> Iterator[str]:
    server = create_ui_server(host="127.0.0.1", port=0, workspace_dir=tmp_path)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address[0], server.server_address[1]
    host_s = host.decode("ascii") if isinstance(host, bytes) else str(host)
    try:
        yield f"http://{host_s}:{port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_compile_all_six_individual_effects() -> None:
    glow = compile_fx_filtergraph([default_fx_node("glow")])
    assert "split[" in glow.filtergraph
    assert "gblur=" in glow.filtergraph
    assert "blend=all_mode=screen" in glow.filtergraph
    assert glow.active_effects == ["glow"]

    shake = compile_fx_filtergraph([default_fx_node("shake")])
    assert "pad=" in shake.filtergraph
    assert "crop=" in shake.filtergraph
    assert "sin(t*" in shake.filtergraph

    flicker = compile_fx_filtergraph([default_fx_node("flicker")])
    assert "eq=brightness=" in flicker.filtergraph
    assert "eval=frame" in flicker.filtergraph

    flare = compile_fx_filtergraph([default_fx_node("lens_flare")])
    assert "drawbox=" in flare.filtergraph
    assert "gblur=" in flare.filtergraph
    assert "blend=all_mode=screen" in flare.filtergraph

    film = compile_fx_filtergraph([default_fx_node("film_damage")])
    assert "noise=" in film.filtergraph
    assert "vignette=" in film.filtergraph
    assert "eq=brightness=" in film.filtergraph

    chroma = compile_fx_filtergraph([default_fx_node("chroma_aberration")])
    assert "rgbashift=" in chroma.filtergraph

    vig = compile_fx_filtergraph([default_fx_node("vignette")])
    assert vig.filtergraph == "vignette=angle=0.520"
    assert vig.active_effects == ["vignette"]

    grain = compile_fx_filtergraph([default_fx_node("film_grain")])
    assert grain.filtergraph == "noise=alls=14:allf=t+u"
    assert grain.active_effects == ["film_grain"]

    opt_glow = compile_fx_filtergraph([default_fx_node("optical_glow")])
    assert (
        "split[g0][g1];[g1]gblur=sigma=10.00[gb];"
        "[g0][gb]blend=all_mode=screen:all_opacity=0.4500"
    ) in opt_glow.filtergraph
    assert opt_glow.active_effects == ["optical_glow"]

    rgb_split = compile_fx_filtergraph([default_fx_node("rgb_split")])
    assert rgb_split.filtergraph == "format=rgb24,rgbashift=rh=4:bh=-4,format=yuv420p"
    assert rgb_split.active_effects == ["rgb_split"]

    # Determinism check
    assert compile_fx_filtergraph([default_fx_node("glow")]).filtergraph == glow.filtergraph


def test_compile_multi_effect_chain_and_bypass() -> None:
    stack = [
        FxNode(effect="glow", enabled=True, params={"brightness": 1.1, "width": 20.0}),
        FxNode(effect="glow", enabled=True, params={"brightness": 0.5, "width": 10.0}),
        FxNode(effect="shake", enabled=False, params={"amplitude": 20.0}),
        FxNode(effect="lens_flare", enabled=True, params={"center_x": 0.65, "center_y": 0.35}),
        FxNode(effect="film_damage", enabled=True, params={"mix": 0.8}),
        FxNode(effect="chroma_aberration", enabled=True, params={"spread": 9.0, "angle": 30.0}),
    ]
    res = compile_fx_filtergraph(stack, duration_seconds=12.0, width=1920, height=1080, fps=25.0)
    assert res.active_effects == ["glow", "glow", "lens_flare", "film_damage", "chroma_aberration"]
    assert res.bypassed_count == 1
    assert "glow0_base" in res.filtergraph
    assert "glow1_base" in res.filtergraph
    assert "lf2_base" in res.filtergraph
    assert res.estimated_render_seconds > 0
    assert res.complexity_tier == "heavy"

    # All bypassed -> idle empty graph
    all_off = compile_fx_filtergraph([FxNode(effect="shake", enabled=False)])
    assert all_off.filtergraph == ""
    assert all_off.ffmpeg_vf_args == []
    assert all_off.complexity_tier == "idle"
    assert all_off.estimated_render_seconds == 0.0


def test_ten_presets_compile_and_lookup() -> None:
    expected_names = {
        "Dreamy Glow",
        "Music Video Shake",
        "Vintage 35mm Film",
        "Anamorphic Flare",
        "RGB Glitch Split",
        "Strobe Flicker",
        "35mm Cinema",
        "Moody Vignette",
        "Cyberpunk Glow",
        "Anamorphic Dream",
        "35mm Cinema Halation",
        "Action Handheld",
        "Retro VHS CRT",
        "Neon Hue Shift",
        "Retro Arcade Pixel",
        "Black Pro-Mist 1/4",
        "Tilt-Shift Toy World",
        "Prism Light Leak",
    }
    assert {p.name for p in FX_PRESETS} == expected_names
    assert len(FX_PRESETS) == 18

    for preset in FX_PRESETS:
        by_id = get_fx_preset(preset.id)
        by_name = get_fx_preset(preset.name.lower())
        assert by_id.id == by_name.id
        res = compile_preset_filtergraph(preset.id, duration_seconds=5.0)
        assert len(res.filtergraph) > 10
        assert res.estimated_render_seconds > 0

    cinema_res = compile_preset_filtergraph("35mm_cinema", duration_seconds=5.0)
    assert cinema_res.filtergraph == "noise=alls=16:allf=t+u,vignette=angle=0.450"

    moody_res = compile_preset_filtergraph("moody_vignette", duration_seconds=5.0)
    assert moody_res.filtergraph == "vignette=angle=0.920,noise=alls=8:allf=t+u"

    cyber_res = compile_preset_filtergraph("cyberpunk_glow", duration_seconds=5.0)
    assert "gblur=sigma=16.00" in cyber_res.filtergraph
    assert "blend=all_mode=screen:all_opacity=0.7200" in cyber_res.filtergraph
    assert "rgbashift=rh=6:bh=-6" in cyber_res.filtergraph

    dream_res = compile_preset_filtergraph("anamorphic_dream", duration_seconds=5.0)
    assert "gblur=sigma=20.00" in dream_res.filtergraph
    assert "rgbashift=rh=3:bh=-3" in dream_res.filtergraph
    assert "vignette=angle=0.420" in dream_res.filtergraph

    with pytest.raises(ValueError, match="Unknown FX preset"):
        get_fx_preset("nonexistent_preset")


def test_parameter_clamping_aliases_and_injection_rejection() -> None:
    # Out-of-range numeric parameters are clamped deterministically
    clamped_glow = normalize_fx_node(
        {
            "effect": "glow",
            "params": {"Brightness": 99.0, "width": -5.0, "threshold": 2.5, "Tint": "#AABBCC"},
        }
    )
    assert clamped_glow.params["brightness"] == 3.0
    assert clamped_glow.params["width"] == 1.0
    assert clamped_glow.params["threshold"] == 1.0
    assert clamped_glow.params["tint"] == "#aabbcc"

    clamped_shake = normalize_fx_node(
        {
            "effect": "shake",
            "params": {"amplitude": 500, "frequency": 0.01, "MotionBlur": 9.0, "seed": -4},
        }
    )
    assert clamped_shake.params["amplitude"] == 64.0
    assert clamped_shake.params["frequency"] == 0.2
    assert clamped_shake.params["motion_blur"] == 1.0
    assert clamped_shake.params["seed"] == 0

    # Reject non-finite values & shell injection attempts
    with pytest.raises(ValueError, match="Invalid hex color"):
        normalize_fx_node({"effect": "glow", "params": {"tint": "#ffffff; rm -rf /"}})

    with pytest.raises(ValueError, match="Invalid hex color"):
        normalize_fx_node({"effect": "lens_flare", "params": {"tint": "0xffffff' && whoami"}})

    with pytest.raises(ValueError, match="finite"):
        normalize_fx_node({"effect": "flicker", "params": {"amplitude": float("nan")}})

    with pytest.raises(ValueError, match="Unsupported pixel format"):
        compile_fx_filtergraph([default_fx_node("glow")], pix_fmt="yuv420p;echo pwn")


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg binary not on PATH")
def test_compiled_filtergraphs_execute_in_real_ffmpeg() -> None:
    ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"
    # Verify every single effect AND full 6-effect stack executes cleanly in FFmpeg
    all_nodes = [default_fx_node(fx_type) for fx_type in FX_TYPES]
    cases = [[n] for n in all_nodes] + [all_nodes]
    for stack in cases:
        res = compile_fx_filtergraph(stack, duration_seconds=0.2, width=320, height=180, fps=25.0)
        cmd = [
            ffmpeg_bin,
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            "testsrc=duration=0.2:size=320x180:rate=25",
            "-vf",
            res.filtergraph,
            "-frames:v",
            "2",
            "-f",
            "null",
            "-",
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=20, check=False)
        assert proc.returncode == 0, f"FFmpeg rejected {res.active_effects}: {proc.stderr}"


def test_fx_compile_http_endpoint_and_presets(fx_ui_server: str) -> None:
    base_url = fx_ui_server

    p_status, p_raw = _http_call(f"{base_url}/api/fx/presets")
    assert p_status == 200
    p_data = json.loads(p_raw.decode("utf-8"))
    assert len(p_data["presets"]) == 18
    assert set(p_data["specs"].keys()) == set(FX_TYPES)

    c_status, c_raw = _http_call(
        f"{base_url}/api/fx/compile",
        method="POST",
        payload={
            "nodes": [
                {"effect": "glow", "enabled": True, "params": {"brightness": 1.2, "width": 22}},
                {
                    "effect": "chroma_aberration",
                    "enabled": True,
                    "params": {"spread": 10, "angle": 0},
                },
            ],
            "duration_seconds": 8.0,
            "width": 1920,
            "height": 1080,
            "fps": 25.0,
            "use_gpu": True,
        },
    )
    assert c_status == 200
    c_data = json.loads(c_raw.decode("utf-8"))
    assert "blend=all_mode=screen" in c_data["filtergraph"]
    assert "rgbashift=" in c_data["filtergraph"]
    assert c_data["estimated_render_seconds"] > 0
    assert c_data["active_effects"] == ["glow", "chroma_aberration"]

    preset_status, preset_raw = _http_call(
        f"{base_url}/api/fx/compile",
        method="POST",
        payload={"preset": "Vintage 35mm Film", "duration_seconds": 10.0},
    )
    assert preset_status == 200
    preset_data = json.loads(preset_raw.decode("utf-8"))
    assert "noise=" in preset_data["filtergraph"]
    assert "vignette=" in preset_data["filtergraph"]

    bad_status, _ = _http_call(
        f"{base_url}/api/fx/compile",
        method="POST",
        payload={"nodes": [{"effect": "glow", "params": {"tint": "bad;injection"}}]},
    )
    assert bad_status == 400

    kf_status, kf_raw = _http_call(
        f"{base_url}/api/fx/compile",
        method="POST",
        payload={
            "nodes": [
                {
                    "effect": "glow",
                    "enabled": True,
                    "params": {"brightness": 1.1},
                    "keyframes": [
                        {"time_s": 0.0, "value": 0.0, "easing": "ease_in_out"},
                        {"time_s": 2.0, "value": 1.0, "easing": "ease_in_out"},
                    ],
                }
            ],
            "duration_seconds": 4.0,
        },
    )
    assert kf_status == 200
    kf_data = json.loads(kf_raw.decode("utf-8"))
    assert kf_data["keyframed_effects"] == ["glow"]
    assert "blend=all_expr=" in kf_data["filtergraph"]


def test_keyframe_easing_and_deterministic_evaluation() -> None:
    for curve in EASING_TYPES:
        assert evaluate_easing(0.0, curve) == pytest.approx(0.0)
        assert evaluate_easing(1.0, curve) == pytest.approx(1.0)
        assert evaluate_easing(0.5, curve) == pytest.approx(
            {"linear": 0.5, "ease_in": 0.25, "ease_out": 0.75, "ease_in_out": 0.5}[curve]
        )

    assert evaluate_easing(0.25, "ease_in") < evaluate_easing(0.25, "linear")
    assert evaluate_easing(0.25, "ease_out") > evaluate_easing(0.25, "linear")
    assert evaluate_easing(0.25, "ease_in_out") < evaluate_easing(0.25, "linear")
    assert evaluate_easing(0.75, "ease_in_out") > evaluate_easing(0.75, "linear")

    # Unkeyframed defaults to 1.0; bypassed returns 0.0
    assert evaluate_keyframes([], 3.5) == 1.0
    assert evaluate_node_intensity(FxNode(effect="glow", enabled=False), 1.0) == 0.0
    assert evaluate_node_intensity(FxNode(effect="glow", enabled=True), 1.0) == 1.0

    # Unsorted input is sorted deterministically and clamped outside endpoints
    kfs = [
        Keyframe(time_s=4.0, value=0.0, easing="linear"),
        Keyframe(time_s=0.0, value=0.0, easing="ease_in"),
        Keyframe(time_s=2.0, value=1.0, easing="ease_out"),
    ]
    assert evaluate_keyframes(kfs, -1.0) == pytest.approx(0.0)
    assert evaluate_keyframes(kfs, 1.0) == pytest.approx(0.25)  # ease_in at u=0.5 -> 0.25
    assert evaluate_keyframes(kfs, 3.0) == pytest.approx(0.25)  # 1.0 + (-1.0)*0.75 = 0.25
    assert evaluate_keyframes(kfs, 10.0) == pytest.approx(0.0)

    # Identical timestamps resolve deterministically without zero division
    step_kfs = [
        Keyframe(time_s=1.0, value=0.0, easing="linear"),
        Keyframe(time_s=1.0, value=1.0, easing="linear"),
    ]
    assert evaluate_keyframes(step_kfs, 1.0) == pytest.approx(0.0)
    assert evaluate_keyframes(step_kfs, 1.5) == pytest.approx(1.0)


def test_fade_presets_curve_sampling_and_normalization_guards() -> None:
    fade_in = build_fade_keyframes(10.0, mode="in", fade_in_s=1.5, easing="ease_out")
    assert len(fade_in) == 2
    assert fade_in[0].time_s == 0.0 and fade_in[0].value == 0.0
    assert fade_in[1].time_s == 1.5 and fade_in[1].value == 1.0

    fade_out = build_fade_keyframes(10.0, mode="out", fade_out_s=2.0, easing="ease_in")
    assert len(fade_out) == 2
    assert fade_out[0].time_s == 8.0 and fade_out[0].value == 1.0
    assert fade_out[1].time_s == 10.0 and fade_out[1].value == 0.0

    both = build_fade_keyframes(10.0, mode="in_out", fade_in_s=1.0, fade_out_s=1.0)
    assert len(both) == 4
    curve = sample_keyframe_curve(both, 10.0, samples=11)
    assert len(curve) == 11
    assert curve[0]["value"] == 0.0
    assert curve[5]["value"] == 1.0
    assert curve[-1]["value"] == 0.0

    # Normalization sorts keyframes cleanly and enforces max count
    norm = normalize_fx_node(
        {
            "effect": "shake",
            "keyframes": [
                {"time_s": 2.0, "value": 1.0, "easing": "ease_out"},
                {"time_s": 0.0, "value": 0.0, "easing": "ease_in"},
            ],
        }
    )
    assert [k.time_s for k in norm.keyframes] == [0.0, 2.0]

    with pytest.raises(ValueError, match="Too many keyframes"):
        normalize_fx_node(
            FxNode(
                effect="glow",
                keyframes=[
                    Keyframe(time_s=float(i), value=1.0) for i in range(MAX_KEYFRAMES_PER_NODE + 1)
                ],
            )
        )


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg binary not on PATH")
def test_keyframed_filtergraphs_execute_in_real_ffmpeg() -> None:
    ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"
    kfs = build_fade_keyframes(0.3, mode="in_out", fade_in_s=0.1, fade_out_s=0.1)
    nodes = [FxNode(effect=fx_type, enabled=True, keyframes=kfs) for fx_type in FX_TYPES]
    res = compile_fx_filtergraph(nodes, duration_seconds=0.3, width=320, height=180, fps=25.0)
    assert set(res.keyframed_effects) == set(FX_TYPES)

    cmd = [
        ffmpeg_bin,
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "testsrc=duration=0.3:size=320x180:rate=25",
        "-vf",
        res.filtergraph,
        "-frames:v",
        "4",
        "-f",
        "null",
        "-",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=20, check=False)
    assert proc.returncode == 0, f"FFmpeg rejected keyframed stack: {proc.stderr}"


def test_chroma_key_presets_and_compile() -> None:
    presets = list_chroma_key_presets()
    assert len(presets) == 3
    assert [p.id for p in CHROMA_KEY_PRESETS] == ["studio_green", "chroma_blue", "custom"]

    green = apply_chroma_key_preset("studio_green")
    assert green.key_color == "#00b140"
    assert green.despill is True
    assert green.despill_type == "green"
    res_green = compile_chroma_key(green, pix_fmt="yuv420p")
    assert res_green.is_active is True
    assert res_green.filtergraph == (
        "format=rgba,colorkey=color=0x00b140:similarity=0.1800:blend=0.0800,"
        "despill=type=green,format=yuv420p"
    )
    assert res_green.ffmpeg_vf_args == ["-vf", res_green.filtergraph]

    blue = get_chroma_key_preset("Chroma Blue")
    assert blue.key_color == "#0047bb"
    res_blue = compile_chroma_key(
        ChromaKeyParams(
            preset="chroma_blue",
            key_color="#0047BB",
            similarity=0.22,
            blend=0.10,
            despill=False,
            despill_type="blue",
        )
    )
    assert res_blue.filtergraph == (
        "format=rgba,colorkey=color=0x0047bb:similarity=0.2200:blend=0.1000"
    )
    assert "despill=" not in res_blue.filtergraph

    disabled = compile_chroma_key(ChromaKeyParams(enabled=False))
    assert disabled.is_active is False
    assert disabled.filtergraph == ""
    assert disabled.ffmpeg_vf_args == []

    combined = compile_fx_filtergraph(
        [default_fx_node("glow")],
        chroma_key=green,
        pix_fmt="yuv420p",
    )
    assert combined.chroma_key_active is True
    assert combined.active_effects == ["glow"]
    assert combined.filtergraph.startswith(
        "format=rgba,colorkey=color=0x00b140:similarity=0.1800:blend=0.0800,despill=type=green,"
    )
    assert "blend=all_mode=screen" in combined.filtergraph

    with pytest.raises(ValueError, match="Unknown chroma key preset"):
        get_chroma_key_preset("magenta_screen")


def test_chroma_key_strict_hex_and_bounds_validation() -> None:
    bad_colors = [
        "#00b140; rm -rf /",
        "0x00b140",
        "#0f0",
        "#gggggg",
        "green",
        123456,
    ]
    for bad in bad_colors:
        with pytest.raises(ValueError, match="hex"):
            ChromaKeyParams(key_color=bad)  # type: ignore[arg-type]

    for bad_sim in (0.0, 0.009, 0.81, float("nan"), float("inf"), True):
        with pytest.raises(ValueError):
            ChromaKeyParams(similarity=bad_sim)  # type: ignore[arg-type]

    for bad_blend in (-0.01, 0.51, float("nan"), float("-inf"), False):
        with pytest.raises(ValueError):
            ChromaKeyParams(blend=bad_blend)  # type: ignore[arg-type]

    with pytest.raises(ValueError, match="despill_type"):
        ChromaKeyParams(despill_type="red")  # type: ignore[arg-type]

    with pytest.raises(ValueError, match="Unsupported pixel format"):
        compile_chroma_key(ChromaKeyParams(), pix_fmt="yuv420p;id")


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg binary not on PATH")
def test_chroma_key_executes_in_real_ffmpeg() -> None:
    ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"

    green_res = compile_chroma_key(apply_chroma_key_preset("studio_green"), pix_fmt="rgba")
    cmd_green = [
        ffmpeg_bin,
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=#00b140:s=16x16:d=0.08:r=25",
        "-vf",
        green_res.filtergraph,
        "-frames:v",
        "1",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgba",
        "-",
    ]
    proc_green = subprocess.run(cmd_green, capture_output=True, timeout=20, check=False)
    assert proc_green.returncode == 0, proc_green.stderr.decode("utf-8", errors="replace")
    assert len(proc_green.stdout) >= 4
    assert proc_green.stdout[3] == 0

    blue_res = compile_chroma_key(apply_chroma_key_preset("chroma_blue"), pix_fmt="rgba")
    cmd_blue = [
        ffmpeg_bin,
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=#0047bb:s=16x16:d=0.08:r=25",
        "-vf",
        blue_res.filtergraph,
        "-frames:v",
        "1",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgba",
        "-",
    ]
    proc_blue = subprocess.run(cmd_blue, capture_output=True, timeout=20, check=False)
    assert proc_blue.returncode == 0, proc_blue.stderr.decode("utf-8", errors="replace")
    assert len(proc_blue.stdout) >= 4
    assert proc_blue.stdout[3] == 0

    # Foreground skin/crimson color must remain opaque (alpha=255) when keying Studio Green
    cmd_fg = [
        ffmpeg_bin,
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=#d44432:s=16x16:d=0.08:r=25",
        "-vf",
        green_res.filtergraph,
        "-frames:v",
        "1",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgba",
        "-",
    ]
    proc_fg = subprocess.run(cmd_fg, capture_output=True, timeout=20, check=False)
    assert proc_fg.returncode == 0
    assert proc_fg.stdout[3] == 255

    # Combined Chroma Key + Sapphire Glow executes cleanly to yuv420p
    combined = compile_fx_filtergraph(
        [default_fx_node("glow")],
        chroma_key=apply_chroma_key_preset("studio_green"),
        duration_seconds=0.2,
        width=320,
        height=180,
        fps=25.0,
        pix_fmt="yuv420p",
    )
    cmd_combo = [
        ffmpeg_bin,
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "testsrc=duration=0.2:size=320x180:rate=25",
        "-vf",
        combined.filtergraph,
        "-frames:v",
        "2",
        "-f",
        "null",
        "-",
    ]
    proc_combo = subprocess.run(cmd_combo, capture_output=True, text=True, timeout=20, check=False)
    assert proc_combo.returncode == 0, f"FFmpeg rejected chroma_key+glow: {proc_combo.stderr}"


def test_chroma_key_http_endpoints(fx_ui_server: str) -> None:
    base_url = fx_ui_server

    p_status, p_raw = _http_call(f"{base_url}/api/fx/chroma-key/presets")
    assert p_status == 200
    p_data = json.loads(p_raw.decode("utf-8"))
    assert [p["id"] for p in p_data["presets"]] == ["studio_green", "chroma_blue", "custom"]
    assert p_data["bounds"]["similarity"] == {"min": 0.01, "max": 0.8, "default": 0.18}
    assert p_data["bounds"]["blend"] == {"min": 0.0, "max": 0.5, "default": 0.08}

    c_status, c_raw = _http_call(
        f"{base_url}/api/fx/chroma-key/compile",
        method="POST",
        payload={
            "preset": "custom",
            "key_color": "#12AB34",
            "similarity": 0.25,
            "blend": 0.12,
            "despill": True,
            "despill_type": "green",
            "pix_fmt": "yuv420p",
        },
    )
    assert c_status == 200
    c_data = json.loads(c_raw.decode("utf-8"))
    assert c_data["is_active"] is True
    assert c_data["filtergraph"] == (
        "format=rgba,colorkey=color=0x12ab34:similarity=0.2500:blend=0.1200,"
        "despill=type=green,format=yuv420p"
    )

    fx_status, fx_raw = _http_call(
        f"{base_url}/api/fx/compile",
        method="POST",
        payload={
            "nodes": [],
            "chroma_key": {
                "preset": "chroma_blue",
                "key_color": "#0047bb",
                "similarity": 0.20,
                "blend": 0.08,
                "despill": True,
                "despill_type": "blue",
                "enabled": True,
            },
        },
    )
    assert fx_status == 200
    fx_data = json.loads(fx_raw.decode("utf-8"))
    assert fx_data["chroma_key_active"] is True
    assert "colorkey=color=0x0047bb" in fx_data["filtergraph"]
    assert "despill=type=blue" in fx_data["filtergraph"]

    bad_hex_status, _ = _http_call(
        f"{base_url}/api/fx/chroma-key/compile",
        method="POST",
        payload={"key_color": "#00b140;whoami"},
    )
    assert bad_hex_status == 400

    bad_sim_status, _ = _http_call(
        f"{base_url}/api/fx/chroma-key/compile",
        method="POST",
        payload={"key_color": "#00b140", "similarity": 0.95},
    )
    assert bad_sim_status == 400


def test_vignette_and_film_grain_bounds_and_compilation() -> None:
    vig_low = normalize_fx_node({"effect": "vignette", "params": {"AngleRad": 0.01}})
    assert vig_low.params["angle_rad"] == 0.1
    assert compile_fx_filtergraph([vig_low]).filtergraph == "vignette=angle=0.100"

    vig_high = normalize_fx_node({"effect": "vignette", "params": {"angle_rad": 3.5}})
    assert vig_high.params["angle_rad"] == 1.2
    assert compile_fx_filtergraph([vig_high]).filtergraph == "vignette=angle=1.200"

    grain_low = normalize_fx_node({"effect": "film_grain", "params": {"Strength": -5.0}})
    assert grain_low.params["strength"] == 0.0
    assert compile_fx_filtergraph([grain_low]).filtergraph == "noise=alls=0:allf=t+u"

    grain_high = normalize_fx_node({"effect": "film_grain", "params": {"strength": 99.4}})
    assert grain_high.params["strength"] == 40.0
    assert compile_fx_filtergraph([grain_high]).filtergraph == "noise=alls=40:allf=t+u"

    grain_mid = normalize_fx_node({"effect": "film_grain", "params": {"strength": 18.6}})
    assert compile_fx_filtergraph([grain_mid]).filtergraph == "noise=alls=19:allf=t+u"

    with pytest.raises(ValueError, match="finite"):
        normalize_fx_node({"effect": "vignette", "params": {"angle_rad": float("nan")}})
    with pytest.raises(ValueError, match="finite"):
        normalize_fx_node({"effect": "film_grain", "params": {"strength": float("inf")}})
    with pytest.raises(ValueError, match="not bool"):
        normalize_fx_node({"effect": "vignette", "params": {"angle_rad": True}})
    with pytest.raises(ValueError, match="not bool"):
        normalize_fx_node({"effect": "film_grain", "params": {"strength": False}})


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg binary not on PATH")
def test_film_finishing_presets_execute_in_real_ffmpeg() -> None:
    ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"
    for preset_id in (
        "35mm_cinema",
        "moody_vignette",
        "cyberpunk_glow",
        "anamorphic_dream",
        "cinema_35mm",
    ):
        res = compile_preset_filtergraph(
            preset_id,
            duration_seconds=0.2,
            width=320,
            height=180,
            fps=25.0,
        )
        cmd = [
            ffmpeg_bin,
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            "testsrc=duration=0.2:size=320x180:rate=25",
            "-vf",
            res.filtergraph,
            "-frames:v",
            "2",
            "-f",
            "null",
            "-",
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=20, check=False)
        assert proc.returncode == 0, f"FFmpeg rejected {preset_id}: {proc.stderr}"


def test_optical_glow_and_rgb_split_bounds_and_compilation() -> None:
    glow_low = normalize_fx_node(
        {
            "effect": "optical_glow",
            "params": {"GlowIntensity": -0.5, "GlowRadius": 0.5},
        }
    )
    assert glow_low.params["glow_intensity"] == 0.0
    assert glow_low.params["glow_radius"] == 2.0
    low_res = compile_fx_filtergraph([glow_low])
    assert (
        low_res.filtergraph
        == "format=rgb24,split[g0][g1];[g1]gblur=sigma=2.00[gb];"
        "[g0][gb]blend=all_mode=screen:all_opacity=0.0000,format=yuv420p"
    )

    glow_high = normalize_fx_node(
        {
            "effect": "optical_glow",
            "params": {"glow_intensity": 2.4, "glow_radius": 99.0},
        }
    )
    assert glow_high.params["glow_intensity"] == 1.0
    assert glow_high.params["glow_radius"] == 24.0
    high_res = compile_fx_filtergraph([glow_high])
    assert "gblur=sigma=24.00" in high_res.filtergraph
    assert "all_opacity=1.0000" in high_res.filtergraph

    split_low = normalize_fx_node(
        {"effect": "rgb_split", "params": {"ChromaShiftPx": -3}}
    )
    assert split_low.params["chroma_shift_px"] == 0
    assert compile_fx_filtergraph([split_low]).filtergraph == (
        "format=rgb24,rgbashift=rh=0:bh=0,format=yuv420p"
    )

    split_high = normalize_fx_node(
        {"effect": "rgb_split", "params": {"chroma_shift_px": 25.4}}
    )
    assert split_high.params["chroma_shift_px"] == 12
    assert compile_fx_filtergraph([split_high]).filtergraph == (
        "format=rgb24,rgbashift=rh=12:bh=-12,format=yuv420p"
    )

    # Multi-node optical_glow chain must produce unique pad names
    multi = compile_fx_filtergraph(
        [
            FxNode(effect="optical_glow", params={"glow_intensity": 0.4, "glow_radius": 6.0}),
            FxNode(effect="optical_glow", params={"glow_intensity": 0.6, "glow_radius": 14.0}),
            FxNode(effect="rgb_split", params={"chroma_shift_px": 5}),
        ]
    )
    assert "split[g0][g1]" in multi.filtergraph
    assert "split[g1a][g1b]" in multi.filtergraph
    assert "rgbashift=rh=5:bh=-5" in multi.filtergraph

    with pytest.raises(ValueError, match="finite"):
        normalize_fx_node({"effect": "optical_glow", "params": {"glow_intensity": float("nan")}})
    with pytest.raises(ValueError, match="finite"):
        normalize_fx_node({"effect": "optical_glow", "params": {"glow_radius": float("inf")}})
    with pytest.raises(ValueError, match="not bool"):
        normalize_fx_node({"effect": "rgb_split", "params": {"chroma_shift_px": True}})


def test_halation_and_letterbox_bounds_compilation_and_cinema_35mm() -> None:
    hal_low = normalize_fx_node(
        {
            "effect": "halation",
            "params": {"HalationStrength": -0.25, "HalationRadius": 0.5},
        }
    )
    assert hal_low.params["halation_strength"] == 0.0
    assert hal_low.params["halation_radius"] == 2.0
    hal_low_res = compile_fx_filtergraph([hal_low])
    assert hal_low_res.active_effects == ["halation"]
    assert hal_low_res.filtergraph.startswith("format=rgb24,split[hal0_base][hal0_src];")
    assert "gblur=sigma=2.00:steps=2[hal0_blur]" in hal_low_res.filtergraph
    assert "blend=all_mode=screen:all_opacity=0.0000,format=yuv420p" in hal_low_res.filtergraph

    hal_high = normalize_fx_node(
        {
            "effect": "halation",
            "params": {"halation_strength": 1.8, "halation_radius": 45.0},
        }
    )
    assert hal_high.params["halation_strength"] == 1.0
    assert hal_high.params["halation_radius"] == 20.0
    hal_high_res = compile_fx_filtergraph([hal_high])
    assert "gblur=sigma=20.00:steps=2[hal0_blur]" in hal_high_res.filtergraph
    assert "all_opacity=1.0000" in hal_high_res.filtergraph

    for raw_ratio, expected_ratio, expected_frac in (
        ("2.39", "2.39", "0.1281"),
        (2.35, "2.35", "0.1217"),
        ("1.85", "1.85", "0.0195"),
        (2.0, "2.00", "0.0556"),
    ):
        lb_node = normalize_fx_node({"effect": "letterbox", "params": {"Ratio": raw_ratio}})
        assert lb_node.params["ratio"] == expected_ratio
        lb_res = compile_fx_filtergraph([lb_node])
        assert lb_res.active_effects == ["letterbox"]
        assert f"round(ih*{expected_frac})" in lb_res.filtergraph
        assert "format=rgb24" not in lb_res.filtergraph

    cinema = compile_preset_filtergraph("cinema_35mm", duration_seconds=6.0)
    assert cinema.active_effects == ["halation", "letterbox", "film_grain"]
    assert "lutrgb=" in cinema.filtergraph
    assert "round(ih*0.1281)" in cinema.filtergraph
    assert "noise=alls=14:allf=t+u" in cinema.filtergraph

    with pytest.raises(ValueError, match="finite"):
        normalize_fx_node({"effect": "halation", "params": {"halation_strength": float("nan")}})
    with pytest.raises(ValueError, match="finite"):
        normalize_fx_node({"effect": "halation", "params": {"halation_radius": float("inf")}})
    with pytest.raises(ValueError, match="not bool"):
        normalize_fx_node({"effect": "halation", "params": {"halation_strength": True}})
    with pytest.raises(ValueError, match="not bool"):
        normalize_fx_node({"effect": "letterbox", "params": {"ratio": True}})
    for bad_ratio in ("1.33", "2.39;rm -rf /", 4.0):
        with pytest.raises(ValueError, match="Unsupported value"):
            normalize_fx_node({"effect": "letterbox", "params": {"ratio": bad_ratio}})


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg binary not on PATH")
def test_letterbox_and_halation_pixel_output_in_real_ffmpeg() -> None:
    ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"
    w, h = 320, 180
    lb = compile_fx_filtergraph([FxNode(effect="letterbox", params={"ratio": "2.39"})])
    cmd = [
        ffmpeg_bin,
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        f"color=c=#ffffff:s={w}x{h}:d=0.04:r=25",
        "-vf",
        lb.filtergraph,
        "-frames:v",
        "1",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-",
    ]
    proc = subprocess.run(cmd, capture_output=True, timeout=20, check=False)
    assert proc.returncode == 0, proc.stderr.decode("utf-8", errors="replace")
    buf = proc.stdout
    assert len(buf) == w * h * 3
    top_black = sum(1 for y in range(h // 2) if buf[(y * w + w // 2) * 3] < 20)
    bot_black = sum(1 for y in range(h // 2, h) if buf[(y * w + w // 2) * 3] < 20)
    mid_off = ((h // 2) * w + w // 2) * 3
    assert top_black == bot_black == 23
    assert buf[mid_off] > 235

    # Verify halation executes cleanly across keyframed and non-keyframed pipelines
    hal = compile_fx_filtergraph(
        [
            FxNode(effect="halation", params={"halation_strength": 0.7, "halation_radius": 12.0}),
            FxNode(effect="letterbox", params={"ratio": "2.39"}),
            FxNode(effect="film_grain", params={"strength": 14.0}),
        ]
    )
    proc_hal = subprocess.run(
        [
            ffmpeg_bin,
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            f"testsrc=duration=0.2:size={w}x{h}:rate=25",
            "-vf",
            hal.filtergraph,
            "-frames:v",
            "2",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
        timeout=20,
        check=False,
    )
    assert proc_hal.returncode == 0, proc_hal.stderr


def test_camera_shake_lens_distortion_bounds_and_action_handheld() -> None:
    cs_low = normalize_fx_node(
        {
            "effect": "camera_shake",
            "params": {"AmplitudePx": -3.0, "FrequencyHz": 0.1},
        }
    )
    assert cs_low.params["amplitude_px"] == 1.0
    assert cs_low.params["frequency_hz"] == 0.5
    cs_low_res = compile_fx_filtergraph([cs_low])
    assert cs_low_res.active_effects == ["camera_shake"]
    assert "scale=w=iw+2:h=ih+2:flags=bilinear" in cs_low_res.filtergraph
    assert "crop=w=iw-2:h=ih-2:x='1+1.0000*sin(t*3.1416)'" in cs_low_res.filtergraph

    cs_high = normalize_fx_node(
        {
            "effect": "camera_shake",
            "params": {"amplitude_px": 40.0, "frequency_hz": 25.0},
        }
    )
    assert cs_high.params["amplitude_px"] == 24.0
    assert cs_high.params["frequency_hz"] == 12.0
    cs_high_res = compile_fx_filtergraph([cs_high])
    assert "scale=w=iw+48:h=ih+48:flags=bilinear" in cs_high_res.filtergraph
    assert "crop=w=iw-48:h=ih-48:x='24+24.0000*sin(" in cs_high_res.filtergraph

    ld_low = normalize_fx_node({"effect": "lens_distortion", "params": {"K1": -1.2}})
    assert ld_low.params["k1"] == -0.5
    ld_low_res = compile_fx_filtergraph([ld_low])
    assert ld_low_res.active_effects == ["lens_distortion"]
    assert ld_low_res.filtergraph == "lenscorrection=cx=0.5:cy=0.5:k1=-0.5000:k2=0"

    ld_high = normalize_fx_node({"effect": "lens_distortion", "params": {"k1": 0.95}})
    assert ld_high.params["k1"] == 0.5
    assert compile_fx_filtergraph([ld_high]).filtergraph == (
        "lenscorrection=cx=0.5:cy=0.5:k1=0.5000:k2=0"
    )

    action = compile_preset_filtergraph("action_handheld", duration_seconds=6.0)
    assert action.active_effects == ["camera_shake", "rgb_split", "vignette"]
    assert "scale=w=iw+20:h=ih+20:flags=bilinear" in action.filtergraph
    assert "rgbashift=rh=2:bh=-2" in action.filtergraph
    assert "vignette=angle=0.520" in action.filtergraph

    for bad_node in (
        {"effect": "camera_shake", "params": {"amplitude_px": float("nan")}},
        {"effect": "camera_shake", "params": {"frequency_hz": float("inf")}},
        {"effect": "camera_shake", "params": {"amplitude_px": True}},
        {"effect": "lens_distortion", "params": {"k1": float("nan")}},
        {"effect": "lens_distortion", "params": {"k1": False}},
    ):
        with pytest.raises(ValueError):
            normalize_fx_node(bad_node)


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg binary not on PATH")
def test_camera_shake_lens_distortion_and_action_handheld_execute_in_real_ffmpeg() -> None:
    ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"
    w, h = 320, 180

    # Verify camera_shake preserves exact output dimensions and moves frames cleanly
    cs = compile_fx_filtergraph(
        [FxNode(effect="camera_shake", params={"amplitude_px": 10.0, "frequency_hz": 5.5})]
    )
    proc_cs = subprocess.run(
        [
            ffmpeg_bin,
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            f"testsrc=duration=0.2:size={w}x{h}:rate=25",
            "-vf",
            cs.filtergraph,
            "-frames:v",
            "1",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgb24",
            "-",
        ],
        capture_output=True,
        timeout=20,
        check=False,
    )
    assert proc_cs.returncode == 0, proc_cs.stderr.decode("utf-8", errors="replace")
    assert len(proc_cs.stdout) == w * h * 3

    # Verify lens_distortion barrel (k1 < 0) and pincushion (k1 > 0) plus action_handheld
    for stack in (
        [FxNode(effect="lens_distortion", params={"k1": -0.35})],
        [FxNode(effect="lens_distortion", params={"k1": 0.35})],
        get_fx_preset("action_handheld").nodes,
    ):
        res = compile_fx_filtergraph(stack, duration_seconds=0.2, width=w, height=h, fps=25.0)
        proc = subprocess.run(
            [
                ffmpeg_bin,
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "lavfi",
                "-i",
                f"testsrc=duration=0.2:size={w}x{h}:rate=25",
                "-vf",
                res.filtergraph,
                "-frames:v",
                "3",
                "-f",
                "null",
                "-",
            ],
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )
        assert proc.returncode == 0, f"FFmpeg rejected {res.active_effects}: {proc.stderr}"


def test_scanlines_unsharp_mask_bounds_and_retro_vhs() -> None:
    assert len(FX_TYPES) >= 16
    assert "scanlines" in FX_TYPES
    assert "unsharp_mask" in FX_TYPES

    sl_low = normalize_fx_node(
        {
            "effect": "scanlines",
            "params": {"LineSpacingPx": 0, "Opacity": 0.01},
        }
    )
    assert sl_low.params["line_spacing_px"] == 2
    assert isinstance(sl_low.params["line_spacing_px"], int)
    assert sl_low.params["opacity"] == pytest.approx(0.10)
    sl_low_res = compile_fx_filtergraph([sl_low])
    assert sl_low_res.active_effects == ["scanlines"]
    assert sl_low_res.filtergraph == "drawgrid=w=0:h=2:t=1:c=black@0.1000"

    sl_high = normalize_fx_node(
        {
            "effect": "scanlines",
            "params": {"line_spacing_px": 25, "opacity": 1.8},
        }
    )
    assert sl_high.params["line_spacing_px"] == 12
    assert sl_high.params["opacity"] == pytest.approx(0.90)
    assert compile_fx_filtergraph([sl_high]).filtergraph == "drawgrid=w=0:h=12:t=1:c=black@0.9000"

    um_low = normalize_fx_node({"effect": "unsharp_mask", "params": {"SharpenAmount": -1.0}})
    assert um_low.params["sharpen_amount"] == pytest.approx(0.20)
    um_low_res = compile_fx_filtergraph([um_low])
    assert um_low_res.active_effects == ["unsharp_mask"]
    assert um_low_res.filtergraph == "unsharp=5:5:0.2000:5:5:0.0"

    um_high = normalize_fx_node({"effect": "unsharp_mask", "params": {"sharpen_amount": 9.5}})
    assert um_high.params["sharpen_amount"] == pytest.approx(3.00)
    assert compile_fx_filtergraph([um_high]).filtergraph == "unsharp=5:5:3.0000:5:5:0.0"

    kf_res = compile_fx_filtergraph(
        [
            FxNode(
                effect="scanlines",
                params={"line_spacing_px": 4, "opacity": 0.50},
                keyframes=[Keyframe(time_s=0.0, value=0.0), Keyframe(time_s=2.0, value=1.0)],
            )
        ]
    )
    assert kf_res.keyframed_effects == ["scanlines"]
    assert "drawgrid=w=0:h=4:t=1:c=black@0.5000" in kf_res.filtergraph
    assert "blend=all_expr=" in kf_res.filtergraph

    retro = compile_preset_filtergraph("retro_vhs", duration_seconds=6.0)
    assert retro.active_effects == ["scanlines", "rgb_split", "film_grain"]
    assert "drawgrid=w=0:h=4:t=1:c=black@0.4500" in retro.filtergraph
    assert "rgbashift=rh=4:bh=-4" in retro.filtergraph
    assert "noise=alls=18:allf=t+u" in retro.filtergraph

    for bad_node in (
        {"effect": "scanlines", "params": {"line_spacing_px": float("nan")}},
        {"effect": "scanlines", "params": {"opacity": float("inf")}},
        {"effect": "scanlines", "params": {"line_spacing_px": True}},
        {"effect": "unsharp_mask", "params": {"sharpen_amount": float("nan")}},
        {"effect": "unsharp_mask", "params": {"sharpen_amount": False}},
    ):
        with pytest.raises(ValueError):
            normalize_fx_node(bad_node)


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg binary not on PATH")
def test_scanlines_unsharp_mask_and_retro_vhs_execute_in_real_ffmpeg() -> None:
    ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"
    w, h = 320, 180

    for stack in (
        [FxNode(effect="scanlines", params={"line_spacing_px": 4, "opacity": 0.45})],
        [
            FxNode(
                effect="scanlines",
                params={"line_spacing_px": 6, "opacity": 0.65},
                keyframes=[Keyframe(time_s=0.0, value=0.0), Keyframe(time_s=0.2, value=1.0)],
            )
        ],
        [FxNode(effect="unsharp_mask", params={"sharpen_amount": 1.6})],
        get_fx_preset("retro_vhs").nodes,
    ):
        res = compile_fx_filtergraph(stack, duration_seconds=0.2, width=w, height=h, fps=25.0)
        proc = subprocess.run(
            [
                ffmpeg_bin,
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "lavfi",
                "-i",
                f"testsrc=duration=0.2:size={w}x{h}:rate=25",
                "-vf",
                res.filtergraph,
                "-frames:v",
                "3",
                "-f",
                "rawvideo",
                "-pix_fmt",
                "rgb24",
                "-",
            ],
            capture_output=True,
            timeout=20,
            check=False,
        )
        assert proc.returncode == 0, (
            f"FFmpeg rejected {res.active_effects}: "
            f"{proc.stderr.decode('utf-8', errors='replace')}"
        )
        assert len(proc.stdout) == 3 * w * h * 3


def test_hue_shift_mirror_flip_bounds_and_neon_shift() -> None:
    assert len(FX_TYPES) >= 18
    assert "hue_shift" in FX_TYPES
    assert "mirror_flip" in FX_TYPES

    hs_low = normalize_fx_node(
        {
            "effect": "hue_shift",
            "params": {"HueDeg": -270.0, "Saturation": -0.5},
        }
    )
    assert hs_low.params["hue_deg"] == pytest.approx(-180.0)
    assert hs_low.params["saturation"] == pytest.approx(0.0)
    hs_low_res = compile_fx_filtergraph([hs_low])
    assert hs_low_res.active_effects == ["hue_shift"]
    assert hs_low_res.filtergraph == "hue=h=-180.00:s=0.0000"

    hs_high = normalize_fx_node(
        {
            "effect": "hue_shift",
            "params": {"hue_deg": 320.0, "saturation": 4.2},
        }
    )
    assert hs_high.params["hue_deg"] == pytest.approx(180.0)
    assert hs_high.params["saturation"] == pytest.approx(2.5)
    assert compile_fx_filtergraph([hs_high]).filtergraph == "hue=h=180.00:s=2.5000"

    mf_h = normalize_fx_node({"effect": "mirror_flip", "params": {"Axis": " HORIZONTAL "}})
    assert mf_h.params["axis"] == "horizontal"
    assert compile_fx_filtergraph([mf_h]).filtergraph == "hflip"

    mf_v = normalize_fx_node({"effect": "mirror_flip", "params": {"axis": "vertical"}})
    assert compile_fx_filtergraph([mf_v]).filtergraph == "vflip"

    mf_b = normalize_fx_node({"effect": "mirror_flip", "params": {"axis": "both"}})
    assert compile_fx_filtergraph([mf_b]).filtergraph == "hflip,vflip"

    kf_res = compile_fx_filtergraph(
        [
            FxNode(
                effect="hue_shift",
                params={"hue_deg": 45.0, "saturation": 1.45},
                keyframes=[Keyframe(time_s=0.0, value=0.0), Keyframe(time_s=2.0, value=1.0)],
            ),
            FxNode(
                effect="mirror_flip",
                params={"axis": "both"},
                keyframes=[Keyframe(time_s=0.0, value=0.0), Keyframe(time_s=2.0, value=1.0)],
            ),
        ]
    )
    assert kf_res.keyframed_effects == ["hue_shift", "mirror_flip"]
    assert "hue=h=45.00:s=1.4500" in kf_res.filtergraph
    assert "hflip,vflip" in kf_res.filtergraph
    assert "blend=all_expr=" in kf_res.filtergraph

    neon = compile_preset_filtergraph("neon_shift", duration_seconds=6.0)
    assert neon.active_effects == ["hue_shift", "optical_glow", "vignette"]
    assert "hue=h=45.00:s=1.4500" in neon.filtergraph
    assert "gblur=sigma=14.00" in neon.filtergraph
    assert "blend=all_mode=screen:all_opacity=0.6500" in neon.filtergraph
    assert "vignette=angle=0.580" in neon.filtergraph

    for bad_node in (
        {"effect": "hue_shift", "params": {"hue_deg": float("nan")}},
        {"effect": "hue_shift", "params": {"saturation": float("inf")}},
        {"effect": "hue_shift", "params": {"hue_deg": True}},
        {"effect": "mirror_flip", "params": {"axis": "diagonal"}},
        {"effect": "mirror_flip", "params": {"axis": ""}},
        {"effect": "mirror_flip", "params": {"axis": False}},
    ):
        with pytest.raises(ValueError):
            normalize_fx_node(bad_node)


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg binary not on PATH")
def test_hue_shift_mirror_flip_and_neon_shift_execute_in_real_ffmpeg() -> None:
    ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"
    w, h = 320, 180

    for stack in (
        [FxNode(effect="hue_shift", params={"hue_deg": 45.0, "saturation": 1.45})],
        [
            FxNode(
                effect="hue_shift",
                params={"hue_deg": -90.0, "saturation": 1.8},
                keyframes=[Keyframe(time_s=0.0, value=0.0), Keyframe(time_s=0.2, value=1.0)],
            )
        ],
        [FxNode(effect="mirror_flip", params={"axis": "horizontal"})],
        [FxNode(effect="mirror_flip", params={"axis": "vertical"})],
        [FxNode(effect="mirror_flip", params={"axis": "both"})],
        get_fx_preset("neon_shift").nodes,
    ):
        res = compile_fx_filtergraph(stack, duration_seconds=0.2, width=w, height=h, fps=25.0)
        proc = subprocess.run(
            [
                ffmpeg_bin,
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "lavfi",
                "-i",
                f"testsrc=duration=0.2:size={w}x{h}:rate=25",
                "-vf",
                res.filtergraph,
                "-frames:v",
                "3",
                "-f",
                "rawvideo",
                "-pix_fmt",
                "rgb24",
                "-",
            ],
            capture_output=True,
            timeout=20,
            check=False,
        )
        assert proc.returncode == 0, (
            f"FFmpeg rejected {res.active_effects}: "
            f"{proc.stderr.decode('utf-8', errors='replace')}"
        )
        assert len(proc.stdout) == 3 * w * h * 3


def test_mosaic_pixelate_invert_negative_bounds_and_retro_arcade() -> None:
    assert len(FX_TYPES) >= 20
    assert "mosaic_pixelate" in FX_TYPES
    assert "invert_negative" in FX_TYPES

    mp_low = normalize_fx_node(
        {
            "effect": "mosaic_pixelate",
            "params": {"BlockSizePx": 1},
        }
    )
    assert mp_low.params["block_size_px"] == 4
    mp_low_res = compile_fx_filtergraph([mp_low])
    assert mp_low_res.active_effects == ["mosaic_pixelate"]
    assert mp_low_res.filtergraph == "pixelize=w=4:h=4"

    mp_high = normalize_fx_node(
        {
            "effect": "mosaic_pixelate",
            "params": {"BlockSize": 99},
        }
    )
    assert mp_high.params["block_size_px"] == 48
    assert compile_fx_filtergraph([mp_high]).filtergraph == "pixelize=w=48:h=48"

    inv_rgb = normalize_fx_node({"effect": "invert_negative", "params": {"Mode": " RGB "}})
    assert inv_rgb.params["mode"] == "rgb"
    assert compile_fx_filtergraph([inv_rgb]).filtergraph == "negate=negate_alpha=0"

    inv_luma = normalize_fx_node({"effect": "invert_negative", "params": {"mode": "luma"}})
    assert inv_luma.params["mode"] == "luma"
    assert (
        compile_fx_filtergraph([inv_luma]).filtergraph
        == "format=yuv444p,negate=components=y:negate_alpha=0"
    )

    inv_luma_rgb_combo = compile_fx_filtergraph(
        [
            FxNode(effect="invert_negative", params={"mode": "luma"}),
            FxNode(effect="rgb_split", params={"chroma_shift_px": 3}),
        ]
    )
    assert (
        "format=yuv444p,negate=components=y:negate_alpha=0,format=rgb24"
        in inv_luma_rgb_combo.filtergraph
    )

    kf_res = compile_fx_filtergraph(
        [
            FxNode(
                effect="mosaic_pixelate",
                params={"block_size_px": 16},
                keyframes=[Keyframe(time_s=0.0, value=0.0), Keyframe(time_s=2.0, value=1.0)],
            ),
            FxNode(
                effect="invert_negative",
                params={"mode": "rgb"},
                keyframes=[Keyframe(time_s=0.0, value=0.0), Keyframe(time_s=2.0, value=1.0)],
            ),
        ]
    )
    assert kf_res.keyframed_effects == ["mosaic_pixelate", "invert_negative"]
    assert "pixelize=w=16:h=16" in kf_res.filtergraph
    assert "negate=negate_alpha=0" in kf_res.filtergraph
    assert "blend=all_expr=" in kf_res.filtergraph

    arcade = compile_preset_filtergraph("retro_arcade", duration_seconds=6.0)
    assert arcade.active_effects == ["mosaic_pixelate", "scanlines", "rgb_split"]
    assert "pixelize=w=10:h=10" in arcade.filtergraph
    assert "drawgrid=w=0:h=4:t=1:c=black@0.4500" in arcade.filtergraph
    assert "rgbashift=rh=3:bh=-3" in arcade.filtergraph

    for bad_node in (
        {"effect": "mosaic_pixelate", "params": {"block_size_px": float("nan")}},
        {"effect": "mosaic_pixelate", "params": {"block_size_px": float("inf")}},
        {"effect": "mosaic_pixelate", "params": {"block_size_px": True}},
        {"effect": "invert_negative", "params": {"mode": "cmyk"}},
        {"effect": "invert_negative", "params": {"mode": ""}},
        {"effect": "invert_negative", "params": {"mode": 123}},
        {"effect": "invert_negative", "params": {"mode": False}},
    ):
        with pytest.raises(ValueError):
            normalize_fx_node(bad_node)


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg binary not on PATH")
def test_mosaic_pixelate_invert_negative_and_retro_arcade_execute_in_real_ffmpeg() -> None:
    ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"
    w, h = 320, 180

    for stack in (
        [FxNode(effect="mosaic_pixelate", params={"block_size_px": 12})],
        [
            FxNode(
                effect="mosaic_pixelate",
                params={"block_size_px": 18},
                keyframes=[Keyframe(time_s=0.0, value=0.0), Keyframe(time_s=0.2, value=1.0)],
            )
        ],
        [FxNode(effect="invert_negative", params={"mode": "rgb"})],
        [FxNode(effect="invert_negative", params={"mode": "luma"})],
        [
            FxNode(effect="invert_negative", params={"mode": "luma"}),
            FxNode(effect="rgb_split", params={"chroma_shift_px": 3}),
        ],
        get_fx_preset("retro_arcade").nodes,
    ):
        res = compile_fx_filtergraph(stack, duration_seconds=0.2, width=w, height=h, fps=25.0)
        proc = subprocess.run(
            [
                ffmpeg_bin,
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "lavfi",
                "-i",
                f"testsrc=duration=0.2:size={w}x{h}:rate=25",
                "-vf",
                res.filtergraph,
                "-frames:v",
                "3",
                "-f",
                "rawvideo",
                "-pix_fmt",
                "rgb24",
                "-",
            ],
            capture_output=True,
            timeout=20,
            check=False,
        )
        assert proc.returncode == 0, (
            f"FFmpeg rejected {res.active_effects}: "
            f"{proc.stderr.decode('utf-8', errors='replace')}"
        )
        assert len(proc.stdout) == 3 * w * h * 3



def test_stabilizer_presets_validation_and_compile() -> None:
    presets = list_stabilizer_presets()
    assert len(presets) == 3
    assert get_stabilizer_preset("locked_tripod").rx == 32

    off_res = compile_stabilizer(StabilizerParams(enabled=False))
    assert off_res.is_active is False
    assert off_res.filtergraph == ""

    gimbal = apply_stabilizer_preset("smooth_gimbal", enabled=True)
    res = compile_stabilizer(gimbal, width=1920, height=1080, pix_fmt="yuv420p")
    assert res.is_active is True
    assert "deshake=x=-1:y=-1:w=-1:h=-1:rx=16:ry=16:edge=mirror" in res.filtergraph
    assert "crop=w=1920:h=1080" in res.filtergraph
    assert res.filtergraph.endswith("setsar=1,format=yuv420p")

    for bad_kwargs in (
        {"rx": -1},
        {"rx": 65},
        {"ry": True},
        {"edge": "wrap"},
        {"search": "turbo"},
        {"auto_zoom_pct": 99.0},
        {"auto_zoom_pct": 140.0},
    ):
        with pytest.raises(ValueError):
            StabilizerParams(**bad_kwargs)  # type: ignore[arg-type]


def test_planar_tracker_corner_pin_ssd_tracking_and_compile() -> None:
    presets = list_planar_tracker_presets()
    assert len(presets) == 4
    assert get_planar_tracker_preset("deskew_rectify").mode == "rectify_perspective"

    pt_only = apply_planar_tracker_preset("point_follow", enabled=True)
    assert pt_only.is_active() is False
    assert compile_planar_tracker(pt_only).filtergraph == ""

    skew = apply_planar_tracker_preset("anamorphic_skew", enabled=True)
    static_res = compile_planar_tracker(skew, pix_fmt="yuv420p")
    assert static_res.is_active is True
    assert static_res.uses_per_frame_eval is False
    assert "perspective=x0=0.0500*W:y0=0.0600*H" in static_res.filtergraph
    assert ":interpolation=cubic:sense=destination" in static_res.filtergraph

    w, h = 96, 64
    frames: list[bytes] = []
    expected_centers: list[tuple[float, float]] = []
    for f_idx in range(6):
        cx = 28 + f_idx * 3
        cy = 24 + f_idx * 2
        expected_centers.append((cx / w, cy / h))
        buf = bytearray([20] * (w * h))
        for yy in range(cy - 6, cy + 7):
            for xx in range(cx - 6, cx + 7):
                buf[yy * w + xx] = min(250, 140 + (xx - cx + 6) * 6 + (yy - cy + 6) * 3)
        frames.append(bytes(buf))

    tracked = track_point_sequence_luma(
        frames,
        w,
        h,
        anchor_x=expected_centers[0][0],
        anchor_y=expected_centers[0][1],
        box_pct=0.14,
        search_radius_px=10,
        start_frame=10,
    )
    assert len(tracked) == 6
    assert tracked[0].frame == 10
    assert tracked[-1].frame == 15
    assert abs(tracked[-1].x - expected_centers[-1][0]) < 0.025
    assert abs(tracked[-1].y - expected_centers[-1][1]) < 0.025
    assert tracked[-1].confidence >= 0.90

    dyn_params = PlanarTrackerParams(
        enabled=True,
        mode="corner_pin",
        tl_x=0.10,
        tl_y=0.10,
        tr_x=0.90,
        tr_y=0.12,
        bl_x=0.08,
        bl_y=0.88,
        br_x=0.92,
        br_y=0.90,
        follow_track=True,
        track_keyframes=tracked,
    )
    mid_pt = evaluate_track_point_at_frame(dyn_params, 12)
    assert tracked[0].x < mid_pt[0] < tracked[-1].x
    pins_end = evaluate_corner_pins_at_frame(dyn_params, 15)
    assert pins_end[0][0] > dyn_params.tl_x

    dyn_res = compile_planar_tracker(dyn_params)
    assert dyn_res.is_active is True
    assert dyn_res.uses_per_frame_eval is True
    assert ":eval=frame" in dyn_res.filtergraph

    combined = compile_fx_filtergraph(
        [FxNode(effect="vignette")],
        stabilizer=apply_stabilizer_preset("smooth_gimbal", enabled=True),
        planar_tracker=dyn_params,
        chroma_key=apply_chroma_key_preset("studio_green"),
    )
    assert combined.stabilizer_active is True
    assert combined.planar_tracker_active is True
    assert combined.chroma_key_active is True
    assert "deshake=" in combined.filtergraph
    assert "perspective=" in combined.filtergraph
    assert "colorkey=" in combined.filtergraph

    with pytest.raises(ValueError):
        TrackPointKeyframe(frame=-1, x=0.5, y=0.5)


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg binary not on PATH")
def test_stabilizer_and_planar_tracker_execute_in_real_ffmpeg() -> None:
    ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"
    w, h = 320, 180
    stab = apply_stabilizer_preset("smooth_gimbal", enabled=True)
    trk = PlanarTrackerParams(
        enabled=True,
        mode="corner_pin",
        tl_x=0.08,
        tl_y=0.10,
        tr_x=0.92,
        tr_y=0.08,
        bl_x=0.06,
        bl_y=0.90,
        br_x=0.94,
        br_y=0.92,
        follow_track=True,
        track_keyframes=[
            TrackPointKeyframe(frame=0, x=0.50, y=0.50, confidence=1.0),
            TrackPointKeyframe(frame=5, x=0.53, y=0.52, confidence=0.98),
        ],
    )
    compiled = compile_fx_filtergraph(
        [],
        width=w,
        height=h,
        stabilizer=stab,
        planar_tracker=trk,
    )
    proc = subprocess.run(
        [
            ffmpeg_bin,
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            f"testsrc2=duration=0.24:size={w}x{h}:rate=25",
            "-vf",
            compiled.filtergraph,
            "-frames:v",
            "4",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgb24",
            "-",
        ],
        capture_output=True,
        timeout=20,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr.decode("utf-8", errors="replace")
    assert len(proc.stdout) == 4 * w * h * 3


def test_pro_mist_directional_blur_tilt_shift_prism_leak_and_presets() -> None:
    assert len(FX_TYPES) == 24
    for fx_name in ("pro_mist", "directional_blur", "tilt_shift", "prism_leak"):
        assert fx_name in FX_TYPES
    assert PRISM_LEAK_CORNERS == ("top_left", "top_right", "bottom_left", "bottom_right")

    pm = normalize_fx_node(
        {
            "effect": "pro_mist",
            "params": {
                "DiffusionStrength": 1.8,
                "HighlightThreshold": 0.1,
                "BloomRadius": 40.0,
                "Warmth": -3.0,
            },
        }
    )
    assert pm.params["diffusion_strength"] == 1.0
    assert pm.params["highlight_threshold"] == 0.3
    assert pm.params["bloom_radius"] == 24.0
    assert pm.params["warmth"] == -1.0

    db = normalize_fx_node(
        {
            "effect": "directional_blur",
            "params": {"BlurAmount": 99.0, "AngleDeg": 45.0},
        }
    )
    assert db.params["blur_amount"] == 24.0
    assert db.params["angle_deg"] == 45.0
    db_res = compile_fx_filtergraph([db])
    assert "avgblur=sizeX=24:sizeY=1" in db_res.filtergraph
    assert "rotate='45.00*PI/180'" in db_res.filtergraph

    ts = normalize_fx_node(
        {
            "effect": "tilt_shift",
            "params": {"FocusY": 0.5, "BandHeight": 0.25, "BlurStrength": 8.0, "SatBoost": 1.4},
        }
    )
    ts_res = compile_fx_filtergraph([ts])
    assert "maskedmerge" in ts_res.filtergraph
    assert "eq=saturation=1.4000" in ts_res.filtergraph

    pl = normalize_fx_node(
        {
            "effect": "prism_leak",
            "params": {"LeakIntensity": 0.7, "LeakCorner": "bottom_right", "PrismShiftPx": 5},
        }
    )
    pl_res = compile_fx_filtergraph([pl])
    assert "rgbashift=rh=5:bh=-5" in pl_res.filtergraph
    assert "hypot(X/W-0.94,Y/H-0.94)" in pl_res.filtergraph

    for preset_id in ("black_promist_cinema", "miniature_tilt_shift", "anamorphic_prism_leak"):
        p_res = compile_preset_filtergraph(preset_id)
        assert p_res.filtergraph
        assert p_res.complexity_tier in {"light", "medium", "heavy"}


def test_fx_effect_mask_validation_evaluation_and_ffmpeg_compile() -> None:
    assert FX_MASK_SHAPES == ("off", "ellipse", "rect")
    with pytest.raises(ValueError):
        FxEffectMask(shape="triangle")  # type: ignore[arg-type]
    with pytest.raises(ValueError):
        FxEffectMask(invert="yes")  # type: ignore[arg-type]
    with pytest.raises(ValueError):
        FxEffectMask(center_x=True)  # type: ignore[arg-type]

    ellipse = FxEffectMask(
        shape="ellipse",
        center_x=0.5,
        center_y=0.5,
        radius_x=0.30,
        radius_y=0.30,
        feather=0.10,
        invert=False,
    )
    assert ellipse.is_active() is True
    assert ellipse.evaluate_mask(0.5, 0.5) == pytest.approx(1.0)
    assert ellipse.evaluate_mask(0.95, 0.95) == pytest.approx(0.0)

    rect_inv = FxEffectMask(
        shape="rect",
        center_x=0.5,
        center_y=0.5,
        radius_x=0.25,
        radius_y=0.25,
        feather=0.05,
        invert=True,
    )
    assert rect_inv.evaluate_mask(0.5, 0.5) == pytest.approx(0.0)
    assert rect_inv.evaluate_mask(0.95, 0.95) == pytest.approx(1.0)

    compiled = compile_fx_filtergraph(
        [
            FxNode(effect="pro_mist", enabled=True, effect_mask=ellipse),
            FxNode(effect="mosaic_pixelate", enabled=True, effect_mask=rect_inv),
        ]
    )
    assert compiled.masked_effects == ["pro_mist", "mosaic_pixelate"]
    assert compiled.filtergraph.count("maskedmerge") == 2
    assert "hypot((X/W-0.5000)/0.3000,(Y/H-0.5000)/0.3000)" in compiled.filtergraph
    assert "max(abs(X/W-0.5000)/0.2500,abs(Y/H-0.5000)/0.2500)" in compiled.filtergraph

    if shutil.which("ffmpeg") is not None:
        ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"
        w, h = 320, 180
        combo = compile_fx_filtergraph(
            [
                FxNode(effect="pro_mist", enabled=True, effect_mask=ellipse),
                FxNode(
                    effect="directional_blur",
                    enabled=True,
                    params={"blur_amount": 8.0, "angle_deg": 25.0},
                    effect_mask=rect_inv,
                ),
                FxNode(effect="tilt_shift", enabled=True),
                FxNode(effect="prism_leak", enabled=True, params={"leak_corner": "top_right"}),
            ],
            width=w,
            height=h,
        )
        proc = subprocess.run(
            [
                ffmpeg_bin,
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "lavfi",
                "-i",
                f"testsrc2=duration=0.16:size={w}x{h}:rate=25",
                "-vf",
                combo.filtergraph,
                "-frames:v",
                "2",
                "-f",
                "rawvideo",
                "-pix_fmt",
                "rgb24",
                "-",
            ],
            capture_output=True,
            timeout=20,
            check=False,
        )
        assert proc.returncode == 0, proc.stderr.decode("utf-8", errors="replace")
        assert len(proc.stdout) == 2 * w * h * 3
