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
    FX_PRESETS,
    FX_TYPES,
    FxNode,
    compile_fx_filtergraph,
    compile_preset_filtergraph,
    default_fx_node,
    get_fx_preset,
    normalize_fx_node,
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


def test_six_presets_compile_and_lookup() -> None:
    expected_names = {
        "Dreamy Glow",
        "Music Video Shake",
        "Vintage 35mm Film",
        "Anamorphic Flare",
        "RGB Glitch Split",
        "Strobe Flicker",
    }
    assert {p.name for p in FX_PRESETS} == expected_names
    assert len(FX_PRESETS) == 6

    for preset in FX_PRESETS:
        by_id = get_fx_preset(preset.id)
        by_name = get_fx_preset(preset.name.lower())
        assert by_id.id == by_name.id
        res = compile_preset_filtergraph(preset.id, duration_seconds=5.0)
        assert len(res.filtergraph) > 10
        assert res.estimated_render_seconds > 0

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
    assert len(p_data["presets"]) == 6
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
