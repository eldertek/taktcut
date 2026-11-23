"""Automated tests for taktcut local Web Studio GUI server, APIs, and security."""

from __future__ import annotations

import base64
import json
import re
import shutil
import subprocess
import sys
import threading
import urllib.error
import urllib.request
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest

from taktcut.drp import create_sample_drt_bytes
from taktcut.ui.desktop import build_desktop_app_command
from taktcut.ui.server import create_ui_server


def _http_call(
    url: str,
    *,
    method: str = "GET",
    payload: Any = None,
    raw_bytes: bytes | None = None,
) -> tuple[int, dict[str, str], bytes]:
    body: bytes | None = raw_bytes
    headers: dict[str, str] = {}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    elif raw_bytes is not None:
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp_headers = {k.lower(): v for k, v in resp.headers.items()}
            return resp.status, resp_headers, resp.read()
    except urllib.error.HTTPError as err:
        resp_headers = {k.lower(): v for k, v in err.headers.items()}
        return err.code, resp_headers, err.read()


@pytest.fixture()
def ui_server(tmp_path: Path) -> Iterator[tuple[str, Path]]:
    server = create_ui_server(host="127.0.0.1", port=0, workspace_dir=tmp_path)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address[0], server.server_address[1]
    host_s = host.decode("ascii") if isinstance(host, bytes) else str(host)
    base_url = f"http://{host_s}:{port}"
    try:
        yield base_url, tmp_path
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_ui_static_assets_and_csp_headers(ui_server: tuple[str, Path]) -> None:
    base_url, _ = ui_server
    for path, expected_ct in (
        ("/", "text/html"),
        ("/styles.css", "text/css"),
        ("/app.js", "application/javascript"),
        ("/i18n.js", "application/javascript"),
        ("/canvas.js", "application/javascript"),
        ("/color_wheels.js", "application/javascript"),
        ("/timeline_ops.js", "application/javascript"),
        ("/demo_adapter.js", "application/javascript"),
        ("/favicon.svg", "image/svg+xml"),
    ):
        status, headers, body = _http_call(f"{base_url}{path}")
        assert status == 200, f"GET {path} returned {status}"
        assert expected_ct in headers["content-type"]
        csp = headers["content-security-policy"]
        assert "default-src 'self'" in csp
        assert "script-src 'self'" in csp
        assert "style-src 'self'" in csp
        assert "img-src 'self' data: blob:" in csp
        assert headers["x-content-type-options"] == "nosniff"
        assert headers["x-frame-options"] == "DENY"
        assert len(body) > 0

    status_404, _, _ = _http_call(f"{base_url}/../server.py")
    assert status_404 == 404


def test_ui_health_and_sample_endpoints(ui_server: tuple[str, Path]) -> None:
    base_url, workspace = ui_server
    status, headers, raw = _http_call(f"{base_url}/api/health")
    assert status == 200
    assert headers["cache-control"] == "no-store"
    health = json.loads(raw.decode("utf-8"))
    assert health["status"] == "ok"
    assert health["version"] == "0.1.27"
    assert Path(health["workspace_dir"]).resolve() == workspace.resolve()

    s_status, _, s_raw = _http_call(f"{base_url}/api/sample")
    assert s_status == 200
    sample = json.loads(s_raw.decode("utf-8"))
    assert sample["document"]["name"] == "Eclipse_Showreel_Master_25p"
    assert sample["validation"]["valid"] is True

    i_status, _, i_raw = _http_call(f"{base_url}/api/sample?preset=issues")
    assert i_status == 200
    issues_sample = json.loads(i_raw.decode("utf-8"))
    assert issues_sample["validation"]["valid"] is False
    kinds = {issue["kind"] for issue in issues_sample["validation"]["issues"]}
    assert {"gap", "overlap", "zero_duration", "fps_mismatch"}.issubset(kinds)

    bad_status, _, _ = _http_call(f"{base_url}/api/sample?preset=unknown")
    assert bad_status == 400


def test_ui_timeline_inspect_validate_and_convert(ui_server: tuple[str, Path]) -> None:
    base_url, workspace = ui_server
    drt_file = workspace / "inputs" / "probe_edit.drt"
    drt_file.parent.mkdir(parents=True, exist_ok=True)
    drt_bytes = create_sample_drt_bytes(name="studio-ui-cut", fps="25")
    drt_file.write_bytes(drt_bytes)

    f_status, _, f_raw = _http_call(f"{base_url}/api/workspace/files")
    assert f_status == 200
    files_payload = json.loads(f_raw.decode("utf-8"))
    assert "inputs/probe_edit.drt" in files_payload["files"]["timelines"]

    ins_status, _, ins_raw = _http_call(
        f"{base_url}/api/timeline/inspect",
        method="POST",
        payload={"path": "inputs/probe_edit.drt"},
    )
    assert ins_status == 200
    ins_data = json.loads(ins_raw.decode("utf-8"))
    assert ins_data["document"]["name"] == "studio-ui-cut"
    assert ins_data["validation"]["valid"] is True

    up_status, _, up_raw = _http_call(
        f"{base_url}/api/timeline/inspect",
        method="POST",
        payload={
            "filename": "uploaded.drt",
            "content_base64": base64.b64encode(drt_bytes).decode("ascii"),
        },
    )
    assert up_status == 200
    assert json.loads(up_raw.decode("utf-8"))["document"]["name"] == "studio-ui-cut"

    val_status, _, val_raw = _http_call(
        f"{base_url}/api/timeline/validate",
        method="POST",
        payload={"document": ins_data["document"]},
    )
    assert val_status == 200
    assert json.loads(val_raw.decode("utf-8"))["validation"]["valid"] is True

    conv_status, _, conv_raw = _http_call(
        f"{base_url}/api/timeline/convert",
        method="POST",
        payload={"path": "inputs/probe_edit.drt", "out_path": "exports/studio-ui-cut.otio"},
    )
    assert conv_status == 200
    conv_data = json.loads(conv_raw.decode("utf-8"))
    assert conv_data["output_path"] == "exports/studio-ui-cut.otio"
    assert (workspace / "exports" / "studio-ui-cut.otio").is_file()

    dl_status, dl_headers, dl_bytes = _http_call(
        f"{base_url}/api/timeline/download",
        method="POST",
        payload={"path": "inputs/probe_edit.drt", "format": "otioz"},
    )
    assert dl_status == 200
    assert "application/zip" in dl_headers["content-type"]
    assert ".otioz" in dl_headers["content-disposition"]
    assert dl_bytes.startswith(b"PK")


def test_ui_color_bake_download_and_cdl_parse(ui_server: tuple[str, Path]) -> None:
    base_url, workspace = ui_server

    bake_status, _, bake_raw = _http_call(
        f"{base_url}/api/color/bake",
        method="POST",
        payload={
            "slope": [1.05, 1.0, 0.95],
            "offset": [0.01, 0.0, -0.01],
            "power": [0.98, 1.0, 1.02],
            "saturation": 1.1,
            "size": 17,
            "title": "qa_look",
            "out_path": "luts/qa_look.cube",
        },
    )
    assert bake_status == 200
    bake_data = json.loads(bake_raw.decode("utf-8"))
    assert bake_data["info"]["size"] == 17
    assert bake_data["info"]["entry_count"] == 17**3
    assert bake_data["saved_path"] == "luts/qa_look.cube"
    assert (workspace / "luts" / "qa_look.cube").is_file()

    dl_status, dl_headers, dl_bytes = _http_call(
        f"{base_url}/api/color/download-cube",
        method="POST",
        payload={"size": 5, "title": "probe_dl"},
    )
    assert dl_status == 200
    assert "attachment" in dl_headers["content-disposition"]
    assert "probe_dl.cube" in dl_headers["content-disposition"]
    cube_text = dl_bytes.decode("utf-8")
    assert "LUT_3D_SIZE 5" in cube_text

    bad_status, _, _ = _http_call(
        f"{base_url}/api/color/bake",
        method="POST",
        payload={"power": [0.0, 1.0, 1.0]},
    )
    assert bad_status == 400

    cdl_status, _, cdl_raw = _http_call(
        f"{base_url}/api/color/parse-cdl",
        method="POST",
        payload={
            "xml_content": (
                '<?xml version="1.0"?>'
                "<ColorCorrection><SOPNode><Slope>1.1 1.0 0.9</Slope></SOPNode>"
                "<SatNode><Saturation>1.2</Saturation></SatNode></ColorCorrection>"
            )
        },
    )
    assert cdl_status == 200
    assert json.loads(cdl_raw.decode("utf-8"))["cdl"]["saturation"] == pytest.approx(1.2)

    xxe_status, _, _ = _http_call(
        f"{base_url}/api/color/parse-cdl",
        method="POST",
        payload={
            "xml_content": (
                '<?xml version="1.0"?>'
                '<!DOCTYPE x [<!ENTITY e "1">]>'
                "<ColorCorrection><SOPNode><Slope>1 1 1</Slope></SOPNode></ColorCorrection>"
            )
        },
    )
    assert xxe_status == 400


def test_ui_color_presets_compile_and_render_plan(ui_server: tuple[str, Path]) -> None:
    base_url, workspace = ui_server

    p_status, _, p_raw = _http_call(f"{base_url}/api/color/presets")
    assert p_status == 200
    p_data = json.loads(p_raw.decode("utf-8"))
    assert [p["name"] for p in p_data["presets"]] == [
        "Rec.709 Clean",
        "Teal & Orange",
        "Film Warm",
        "Noir B&W",
    ]
    assert p_data["bounds"]["contrast"]["max"] == 2.0

    c_status, _, c_raw = _http_call(
        f"{base_url}/api/color/compile",
        method="POST",
        payload={"preset": "teal_orange"},
    )
    assert c_status == 200
    c_data = json.loads(c_raw.decode("utf-8"))
    assert "colorbalance=" in c_data["filtergraph"]
    assert "eq=contrast=1.1400:saturation=1.1800" in c_data["filtergraph"]
    assert c_data["is_identity"] is False

    bad_status, _, _ = _http_call(
        f"{base_url}/api/color/compile",
        method="POST",
        payload={
            "grade": {
                "lift": [1.5, 0.0, 0.0],
                "gamma": [0.0, 0.0, 0.0],
                "gain": [0.0, 0.0, 0.0],
                "contrast": 1.0,
                "saturation": 1.0,
                "temperature": 0.0,
            }
        },
    )
    assert bad_status == 400

    bake_status, _, bake_raw = _http_call(
        f"{base_url}/api/color/bake",
        method="POST",
        payload={
            "grade": c_data["params"],
            "size": 9,
            "title": "teal_orange_lut",
            "out_path": "luts/teal_orange_lut.cube",
        },
    )
    assert bake_status == 200
    bake_data = json.loads(bake_raw.decode("utf-8"))
    assert bake_data["info"]["entry_count"] == 729
    assert (workspace / "luts" / "teal_orange_lut.cube").is_file()

    plan_status, _, plan_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/color_graded.mp4",
            "profile": "web_h264",
            "color_grade": c_data["params"],
            "prefer_hw": False,
            "execute": False,
        },
    )
    assert plan_status == 200
    plan_data = json.loads(plan_raw.decode("utf-8"))
    assert "colorbalance=" in plan_data["plan"]["video_filter"]
    assert "eq=contrast=1.1400:saturation=1.1800" in plan_data["plan"]["video_filter"]


def test_ui_audio_compile_and_render_plan_audio_filters(ui_server: tuple[str, Path]) -> None:
    base_url, _ = ui_server

    ok_status, _, ok_raw = _http_call(
        f"{base_url}/api/audio/compile",
        method="POST",
        payload={
            "gain_db": -6.0,
            "fade_in_s": 0.5,
            "fade_out_s": 1.25,
            "muted": False,
            "clip_duration_s": 8.0,
        },
    )
    assert ok_status == 200
    ok_data = json.loads(ok_raw.decode("utf-8"))
    assert ok_data["filtergraph"] == (
        "volume=-6.00dB,afade=t=in:st=0.000:d=0.500,afade=t=out:st=6.750:d=1.250"
    )
    assert ok_data["is_identity"] is False

    mute_status, _, mute_raw = _http_call(
        f"{base_url}/api/audio/compile",
        method="POST",
        payload={"gain_db": 4.0, "muted": True},
    )
    assert mute_status == 200
    assert json.loads(mute_raw.decode("utf-8"))["filtergraph"] == "volume=0"

    bad_status, _, _ = _http_call(
        f"{base_url}/api/audio/compile",
        method="POST",
        payload={"gain_db": 18.0},
    )
    assert bad_status == 400

    bad_fade_status, _, _ = _http_call(
        f"{base_url}/api/audio/compile",
        method="POST",
        payload={"fade_in_s": 6.5},
    )
    assert bad_fade_status == 400

    plan_status, _, plan_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/audio_mix.mp4",
            "profile": "web_h264",
            "audio_params": {
                "gain_db": 3.0,
                "fade_in_s": 0.25,
                "fade_out_s": 0.75,
                "muted": False,
            },
            "clip_duration_s": 4.0,
            "target_lufs": -14.0,
            "prefer_hw": False,
            "execute": False,
        },
    )
    assert plan_status == 200
    plan_data = json.loads(plan_raw.decode("utf-8"))
    assert plan_data["plan"]["audio_filter"] == (
        "volume=3.00dB,afade=t=in:st=0.000:d=0.250,"
        "afade=t=out:st=3.250:d=0.750,loudnorm=I=-14.0:TP=-1.0:LRA=11.0"
    )
    assert plan_data["plan"]["video_filter"] == (
        "fade=t=in:st=0.000:d=0.250,fade=t=out:st=3.250:d=0.750"
    )


def test_ui_fade_compile_and_render_plan_video_audio_fades(ui_server: tuple[str, Path]) -> None:
    base_url, _ = ui_server

    ok_status, _, ok_raw = _http_call(
        f"{base_url}/api/fade/compile",
        method="POST",
        payload={"fade_in_s": 0.5, "fade_out_s": 1.0, "clip_duration_s": 5.0},
    )
    assert ok_status == 200
    ok_data = json.loads(ok_raw.decode("utf-8"))
    assert ok_data["is_identity"] is False
    assert ok_data["video_filtergraph"] == (
        "fade=t=in:st=0.000:d=0.500,fade=t=out:st=4.000:d=1.000"
    )
    assert ok_data["audio_filtergraph"] == (
        "afade=t=in:st=0.000:d=0.500,afade=t=out:st=4.000:d=1.000"
    )

    muted_status, _, muted_raw = _http_call(
        f"{base_url}/api/fade/compile",
        method="POST",
        payload={"fade_in_s": 0.5, "fade_out_s": 1.0, "muted": True, "clip_duration_s": 4.0},
    )
    assert muted_status == 200
    muted_data = json.loads(muted_raw.decode("utf-8"))
    assert muted_data["video_filtergraph"] == (
        "fade=t=in:st=0.000:d=0.500,fade=t=out:st=3.000:d=1.000"
    )
    assert muted_data["audio_filtergraph"] == ""

    bad_status, _, _ = _http_call(
        f"{base_url}/api/fade/compile",
        method="POST",
        payload={"fade_in_s": 5.5, "clip_duration_s": 6.0},
    )
    assert bad_status == 400

    # Dry-run /api/render/plan with top-level fade_in_s / fade_out_s (and muted audio opt-out)
    plan_status, _, plan_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/fade_dip.mp4",
            "profile": "web_h264",
            "video_fade": {"fade_in_s": 0.5, "fade_out_s": 1.0},
            "audio_params": {"gain_db": 0.0, "fade_in_s": 0.5, "fade_out_s": 1.0, "muted": True},
            "clip_duration_s": 6.0,
            "prefer_hw": False,
            "execute": False,
        },
    )
    assert plan_status == 200
    plan_data = json.loads(plan_raw.decode("utf-8"))
    assert plan_data["plan"]["video_filter"] == (
        "fade=t=in:st=0.000:d=0.500,fade=t=out:st=5.000:d=1.000"
    )
    assert plan_data["plan"]["audio_filter"] == "volume=0"

    # Audio-only clip opt-out of video dip-to-black while preserving afade
    ao_clip_status, _, ao_clip_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/fade_audio_clip_only.mp4",
            "profile": "web_h264",
            "video_fade": {"fade_in_s": 0.0, "fade_out_s": 0.0},
            "audio_params": {"gain_db": 0.0, "fade_in_s": 0.5, "fade_out_s": 1.0, "muted": False},
            "clip_duration_s": 6.0,
            "prefer_hw": False,
            "execute": False,
        },
    )
    assert ao_clip_status == 200
    ao_clip_data = json.loads(ao_clip_raw.decode("utf-8"))
    assert ao_clip_data["plan"]["video_filter"] is None
    assert ao_clip_data["plan"]["audio_filter"] == (
        "afade=t=in:st=0.000:d=0.500,afade=t=out:st=5.000:d=1.000"
    )


def test_ui_retime_compile_and_render_plan(ui_server: tuple[str, Path]) -> None:
    base_url, workspace = ui_server
    sample_clip = workspace / ".taktcut-samples" / "sample_rec709.mp4"
    sample_clip.parent.mkdir(parents=True, exist_ok=True)
    sample_clip.write_bytes(b"fake-mp4")

    status, _, raw = _http_call(
        f"{base_url}/api/retime/compile",
        method="POST",
        payload={"speed_rate": 4.0, "reverse": True},
    )
    assert status == 200
    data = json.loads(raw.decode("utf-8"))
    assert data["is_identity"] is False
    assert data["video_filtergraph"] == "setpts=0.250000*PTS,reverse"
    assert data["audio_filtergraph"] == "atempo=2.0000,atempo=2.0000,areverse"
    assert data["ffmpeg_vf_args"] == ["-vf", "setpts=0.250000*PTS,reverse"]
    assert data["ffmpeg_af_args"] == ["-af", "atempo=2.0000,atempo=2.0000,areverse"]

    id_status, _, id_raw = _http_call(
        f"{base_url}/api/retime/compile",
        method="POST",
        payload={"speed_rate": 1.0, "reverse": False},
    )
    assert id_status == 200
    id_data = json.loads(id_raw.decode("utf-8"))
    assert id_data["is_identity"] is True
    assert id_data["video_filtergraph"] == ""
    assert id_data["audio_filtergraph"] == ""

    for bad_payload in (
        {"speed_rate": 0.1},
        {"speed_rate": 5.0},
        {"speed_rate": True},
        {"speed_rate": 2.0, "reverse": "yes"},
    ):
        bad_status, _, _ = _http_call(
            f"{base_url}/api/retime/compile",
            method="POST",
            payload=bad_payload,
        )
        assert bad_status == 400

    plan_status, _, plan_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/retime_mix.mp4",
            "profile": "web_h264",
            "retime_params": {"speed_rate": 0.25, "reverse": True},
            "audio_params": {"gain_db": -3.0, "fade_in_s": 0.0, "fade_out_s": 0.0, "muted": False},
            "target_lufs": -14.0,
            "prefer_hw": False,
            "execute": False,
        },
    )
    assert plan_status == 200
    plan_data = json.loads(plan_raw.decode("utf-8"))
    assert plan_data["plan"]["video_filter"] == "setpts=4.000000*PTS,reverse"
    assert plan_data["plan"]["audio_filter"] == (
        "atempo=0.5000,atempo=0.5000,areverse,volume=-3.00dB,loudnorm=I=-14.0:TP=-1.0:LRA=11.0"
    )


def test_ui_framing_presets_compile_and_render_plan(ui_server: tuple[str, Path]) -> None:
    base_url, workspace = ui_server
    sample_clip = workspace / ".taktcut-samples" / "sample_rec709.mp4"
    sample_clip.parent.mkdir(parents=True, exist_ok=True)
    sample_clip.write_bytes(b"fake-mp4")

    p_status, _, p_raw = _http_call(f"{base_url}/api/framing/presets")
    assert p_status == 200
    presets_data = json.loads(p_raw.decode("utf-8"))
    assert [p["id"] for p in presets_data["presets"]] == ["16:9", "9:16", "1:1", "4:5"]
    assert presets_data["modes"] == ["fill", "fit"]

    c_status, _, c_raw = _http_call(
        f"{base_url}/api/framing/compile",
        method="POST",
        payload={"preset": "9:16", "mode": "fill"},
    )
    assert c_status == 200
    c_data = json.loads(c_raw.decode("utf-8"))
    assert c_data["target_width"] == 1080
    assert c_data["target_height"] == 1920
    assert "crop=w=1080:h=1920" in c_data["filtergraph"]

    for bad_payload in (
        {"preset": "21:9"},
        {"preset": "9:16", "mode": "stretch"},
        {"preset": "1:1", "pan_x": 1.5},
        {"framing": "bad"},
    ):
        bad_status, _, _ = _http_call(
            f"{base_url}/api/framing/compile",
            method="POST",
            payload=bad_payload,
        )
        assert bad_status == 400

    plan_status, _, plan_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/reels_9_16.mp4",
            "profile": "web_h264",
            "framing": {"preset": "9:16", "mode": "fill", "enabled": True},
            "prefer_hw": False,
            "execute": False,
        },
    )
    assert plan_status == 200
    plan_data = json.loads(plan_raw.decode("utf-8"))
    assert plan_data["plan"]["target_width"] == 1080
    assert plan_data["plan"]["target_height"] == 1920
    assert plan_data["plan"]["framing_mode"] == "fill"
    assert "scale=w=1080:h=1920:force_original_aspect_ratio=increase" in (
        plan_data["plan"]["video_filter"] or ""
    )
    assert "crop=w=1080:h=1920" in (plan_data["plan"]["video_filter"] or "")

    fit_status, _, fit_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/feed_4_5.mp4",
            "profile": "web_h264",
            "framing": {"preset": "4:5", "mode": "fit", "enabled": True},
            "prefer_hw": False,
            "execute": False,
        },
    )
    assert fit_status == 200
    fit_data = json.loads(fit_raw.decode("utf-8"))
    assert fit_data["plan"]["target_width"] == 1080
    assert fit_data["plan"]["target_height"] == 1350
    assert fit_data["plan"]["framing_mode"] == "fit"
    assert "pad=w=1080:h=1350" in (fit_data["plan"]["video_filter"] or "")


def test_ui_render_presets_endpoint_and_plan(ui_server: tuple[str, Path]) -> None:
    base_url, _ = ui_server
    p_status, _, p_raw = _http_call(f"{base_url}/api/render/presets")
    assert p_status == 200
    presets_data = json.loads(p_raw.decode("utf-8"))
    assert [p["id"] for p in presets_data["presets"]] == [
        "youtube_1080p_h264",
        "youtube_4k_hevc",
        "reels_tiktok_9_16",
        "broadcast_prores_422",
        "fast_draft_720p",
    ]
    assert presets_data["audio_bitrates_kbps"] == [96, 128, 160, 192, 256, 320]

    uhd_status, _, uhd_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/youtube_4k_hevc.mp4",
            "delivery_preset": "youtube_4k_hevc",
            "prefer_hw": False,
            "execute": False,
        },
    )
    assert uhd_status == 200
    uhd_plan = json.loads(uhd_raw.decode("utf-8"))["plan"]
    assert uhd_plan["delivery_preset"] == "youtube_4k_hevc"
    assert uhd_plan["profile"] == "master_hevc"
    assert uhd_plan["target_width"] == 3840
    assert uhd_plan["target_height"] == 2160
    assert uhd_plan["video_crf"] == 20
    assert uhd_plan["audio_bitrate_kbps"] == 320
    assert "320k" in uhd_plan["argv"]

    draft_status, _, draft_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/custom_draft.mp4",
            "delivery_preset": "fast_draft_720p",
            "video_crf": 24,
            "audio_bitrate_kbps": 160,
            "prefer_hw": False,
            "execute": False,
        },
    )
    assert draft_status == 200
    draft_plan = json.loads(draft_raw.decode("utf-8"))["plan"]
    assert draft_plan["video_crf"] == 24
    assert draft_plan["audio_bitrate_kbps"] == 160
    assert "160k" in draft_plan["argv"]

    for bad_payload in (
        {
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/bad.mp4",
            "delivery_preset": "invalid_preset",
        },
        {
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/bad.mp4",
            "video_crf": 99,
        },
        {
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/bad.mp4",
            "audio_bitrate_kbps": 16,
        },
    ):
        bad_status, _, _ = _http_call(
            f"{base_url}/api/render/plan",
            method="POST",
            payload=bad_payload,
        )
        assert bad_status == 400


def test_ui_render_plan_execute_and_qa_gate_roundtrip(ui_server: tuple[str, Path]) -> None:
    base_url, workspace = ui_server

    gen_status, _, gen_raw = _http_call(
        f"{base_url}/api/sample/generate-clip",
        method="POST",
        payload={},
    )
    assert gen_status == 200
    gen_data = json.loads(gen_raw.decode("utf-8"))
    assert gen_data["path"] == ".taktcut-samples/sample_rec709.mp4"
    assert (workspace / ".taktcut-samples" / "sample_rec709.mp4").is_file()

    dry_status, _, dry_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/dry_out.mp4",
            "profile": "web_h264",
            "fps": "25",
            "target_lufs": -14.0,
            "prefer_hw": False,
            "execute": False,
        },
    )
    assert dry_status == 200
    dry_data = json.loads(dry_raw.decode("utf-8"))
    assert dry_data["plan"]["encoder"] == "libx264"
    assert dry_data["plan"]["faststart"] is True
    assert dry_data["result"] is None

    exec_status, _, exec_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/graded_delivery.mp4",
            "profile": "web_h264",
            "fps": "25",
            "cdl": {
                "slope": [1.04, 1.0, 0.96],
                "offset": [0.0, 0.0, 0.0],
                "power": [0.98, 1.0, 1.02],
                "saturation": 1.08,
            },
            "target_lufs": -14.0,
            "prefer_hw": False,
            "execute": True,
        },
    )
    assert exec_status == 200
    exec_data = json.loads(exec_raw.decode("utf-8"))
    assert exec_data["result"]["success"] is True
    assert (workspace / "renders" / "graded_delivery.mp4").is_file()

    qa_status, _, qa_raw = _http_call(
        f"{base_url}/api/qa/verify",
        method="POST",
        payload={
            "path": "renders/graded_delivery.mp4",
            "target_lufs": -14.0,
            "tolerance_lu": 2.0,
            "max_true_peak_dbtp": -1.0,
            "require_faststart": True,
        },
    )
    assert qa_status == 200
    report = json.loads(qa_raw.decode("utf-8"))["report"]
    assert report["passed"] is True, report["failures"]
    assert report["probe"]["is_cfr"] is True
    assert report["probe"]["has_faststart"] is True
    assert report["loudness"]["passed"] is True


def test_ui_security_path_traversal_and_bad_json(ui_server: tuple[str, Path]) -> None:
    base_url, workspace = ui_server
    outside_drt = workspace.parent / f"{workspace.name}_outside.drt"
    outside_drt.write_bytes(create_sample_drt_bytes())

    sample_doc = json.loads(_http_call(f"{base_url}/api/sample")[2].decode("utf-8"))["document"]
    traversal_cases: list[tuple[str, dict[str, Any]]] = [
        ("/api/timeline/inspect", {"path": f"../{outside_drt.name}"}),
        ("/api/timeline/inspect", {"path": str(outside_drt)}),
        (
            "/api/timeline/convert",
            {"document": sample_doc, "out_path": "../escape.otio"},
        ),
        ("/api/color/bake", {"out_path": "../escape.cube"}),
        (
            "/api/render/plan",
            {
                "input_path": "../escape.mp4",
                "output_path": "renders/out.mp4",
                "execute": False,
            },
        ),
        (
            "/api/render/plan",
            {
                "input_path": "renders/in.mp4",
                "output_path": "../../escape.mp4",
                "execute": False,
            },
        ),
        (
            "/api/render/plan",
            {
                "input_path": "renders/in.mp4",
                "output_path": "renders/out.mp4",
                "lut_path": "../../escape.cube",
                "execute": False,
            },
        ),
        ("/api/qa/verify", {"path": "../../escape.mp4"}),
    ]

    for route, payload in traversal_cases:
        status, _, body = _http_call(f"{base_url}{route}", method="POST", payload=payload)
        assert status in (400, 403), f"{route} with {payload} returned {status}: {body!r}"
        assert status == 403, f"Expected 403 confinement rejection for {route}: {body!r}"

    bad_json_status, _, _ = _http_call(
        f"{base_url}/api/timeline/inspect",
        method="POST",
        raw_bytes=b"{not-valid-json",
    )
    assert bad_json_status == 400


def test_ui_cli_help_and_non_loopback_rejection() -> None:
    help_proc = subprocess.run(
        [sys.executable, "-m", "taktcut.cli", "ui", "--help"],
        capture_output=True,
        text=True,
        timeout=10,
        check=False,
    )
    assert help_proc.returncode == 0
    assert "--workspace-dir" in help_proc.stdout
    assert "--no-open" in help_proc.stdout
    assert "--desktop" in help_proc.stdout
    assert "--port" in help_proc.stdout

    cmd = build_desktop_app_command(
        Path("msedge.exe"),
        "http://127.0.0.1:8741/",
        Path("/tmp/profile"),
    )
    assert cmd[0] == "msedge.exe"
    assert "--app=http://127.0.0.1:8741/" in cmd
    assert "--window-size=1440,900" in cmd

    non_loopback = subprocess.run(
        [sys.executable, "-m", "taktcut.ui", "--host", "0.0.0.0", "--no-open"],
        capture_output=True,
        text=True,
        timeout=10,
        check=False,
    )
    assert non_loopback.returncode != 0
    assert "loopback" in non_loopback.stderr.lower()


def test_ui_accessibility_css_and_french_hygiene(ui_server: tuple[str, Path]) -> None:
    base_url, _ = ui_server
    html_status, _, html_raw = _http_call(f"{base_url}/")
    assert html_status == 200
    html_text = html_raw.decode("utf-8")
    assert "\u2013" not in html_text and "\u2014" not in html_text
    for elem_id in (
        "btn-tool-select",
        "btn-tool-trim",
        "btn-tool-roll",
        "btn-tool-slip",
        "btn-tool-slide",
        "btn-tool-blade",
        "btn-timeline-split",
        "btn-timeline-snap",
        "btn-timeline-sync-lock",
        "btn-timeline-undo",
        "btn-timeline-redo",
        "timeline-tool-badge",
        "timeline-edit-nudge-dock",
        "btn-nudge-edge-in",
        "btn-nudge-edge-out",
        "btn-nudge-m5",
        "btn-nudge-p5",
        "wheel-lift",
        "wheel-gamma",
        "wheel-gain",
        "grade-contrast-range",
        "grade-saturation-range",
        "grade-temperature-range",
        "color-filtergraph-output",
        "clip-audio-gain-range",
        "clip-audio-gain-num",
        "clip-fade-in-range",
        "clip-fade-in-num",
        "clip-fade-out-range",
        "clip-fade-out-num",
        "clip-audio-af-preview",
        "track-mixer-strip",
        "render-use-clip-audio",
        "clip-transition-preset",
        "clip-transition-dur-range",
        "clip-transition-dur-num",
        "clip-transition-badge",
        "clip-transition-audio",
        "btn-clip-transition-preview",
        "subtitles-workbench-pane",
        "subtitle-raw-input",
        "subtitle-cue-list",
        "subtitle-filtergraph-output",
        "render-use-studio-subtitles",
        "btn-scope-parade",
        "btn-scope-waveform",
        "btn-scope-vectorscope",
        "render-preset-strip",
        "render-active-preset-badge",
        "render-container",
        "render-crf",
        "render-audio-bitrate",
        "render-resolution",
        "btn-save-project",
        "btn-open-project",
        "project-file-input",
        "btn-shortcuts-help",
        "nle-shortcuts-dialog",
        "nle-shortcuts-grid",
        "btn-tc-shuttle-rev",
        "btn-tc-shuttle-fwd",
        "timeline-shuttle-speed-pill",
        "btn-tc-mark-in",
        "btn-tc-mark-out",
        "btn-tc-clear-io",
        "btn-tc-loop-io",
        "timeline-io-range-pill",
        "timeline-transform-inspector",
        "clip-transform-badge",
        "btn-clip-transform-reset-all",
        "clip-transform-presets",
        "clip-transform-dynamic-zoom",
        "clip-transform-zoom-range",
        "clip-transform-posx-range",
        "clip-transform-posy-range",
        "clip-transform-rot-range",
        "clip-transform-opacity-range",
        "render-use-clip-transform",
        "btn-color-split-wipe",
        "btn-fx-split-wipe",
        "fx-wipe-slider",
        "fx-wipe-label",
        "btn-color-grab-still",
        "btn-fx-grab-still",
        "color-stills-gallery",
        "fx-stills-gallery",
        "render-settings-tabs",
        "render-tab-video",
        "render-tab-audio",
        "render-tab-looks",
        "render-tab-file",
        "render-tabpanel-video",
        "render-tabpanel-audio",
        "render-tabpanel-looks",
        "render-tabpanel-file",
        "media-pool-info-dialog",
        "media-pool-info-kv",
        "media-pool-type-filter",
        "btn-media-pool-source-tape",
        "media-pool-cut-toolbar",
        "btn-pool-smart-insert",
        "btn-pool-insert-playhead",
        "btn-pool-append",
        "timeline-overview-canvas",
        "color-node-tree-dock",
        "color-node-graph",
        "color-node-count",
        "btn-color-node-add",
        "btn-color-node-outside",
        "btn-color-node-bypass",
        "btn-color-node-left",
        "btn-color-node-right",
        "btn-color-node-reset",
        "btn-color-node-delete",
        "color-node-label-input",
        "cube-file-input",
        "color-node-lut-badge",
        "cube-lut-mix-range",
        "cube-lut-mix-num",
        "btn-color-node-clear-lut",
        "color-power-window-dock",
        "pw-shape-group",
        "pw-status-badge",
        "btn-pw-invert",
        "btn-pw-overlay",
        "btn-pw-reset",
        "pw-cx-range",
        "pw-soft-range",
        "color-curves-dock",
        "color-curves-canvas",
        "curves-status-badge",
        "curves-channel-group",
        "curves-preset-strip",
        "curves-point-readout",
        "btn-curves-delete-pt",
        "btn-curves-reset-ch",
        "btn-curves-reset-all",
        "clip-retime-process",
        "retime-ramp-editor",
        "clip-retime-ramp-badge",
        "clip-retime-ramp-presets",
        "clip-retime-ramp-canvas",
        "btn-retime-point-add",
        "btn-retime-point-del",
        "btn-retime-ramp-reset",
        "clip-retime-ramp-readout",
        "render-retime-process",
        "render-retime-ramp-preset",
    ):
        assert elem_id in html_text
    assert "v0.1.27" in html_text

    css_status, _, css_raw = _http_call(f"{base_url}/styles.css")
    assert css_status == 200
    css_text = css_raw.decode("utf-8")
    assert ":focus-visible" in css_text
    assert "min-height: 44px" in css_text
    assert "100dvh" in css_text
    assert ".deliver-subtabs" in css_text
    assert ".deliver-actions-footer" in css_text
    assert ".media-pool-type-filter" in css_text
    assert ".timeline-overview-canvas" in css_text
    assert ".nle-titles-bottom" in css_text
    assert ".color-node-tree-dock" in css_text
    assert ".color-node-card" in css_text
    assert ".color-power-window-dock" in css_text
    assert ".pw-param-grid" in css_text
    assert ".color-curves-dock" in css_text
    assert ".color-curves-canvas" in css_text
    assert ".color-curves-tone-split" in css_text
    assert ".retime-ramp-editor" in css_text
    assert ".retime-ramp-canvas" in css_text
    assert ".retime-deliver-advanced-row" in css_text
    assert "\u2013" not in css_text and "\u2014" not in css_text

    i18n_status, _, i18n_raw = _http_call(f"{base_url}/i18n.js")
    assert i18n_status == 200
    i18n_text = i18n_raw.decode("utf-8")
    assert "\u2013" not in i18n_text and "\u2014" not in i18n_text
    assert '"Étalonnage"' in i18n_text
    assert '"Burn-Ins & Looks"' in i18n_text
    assert '"Incrustations & Looks"' in i18n_text
    assert '"Infos du Plan"' in i18n_text
    assert '"Bande Source"' in i18n_text
    assert '"Insertion Intel."' in i18n_text
    assert '"Ajouter Fin"' in i18n_text
    assert '"TEMPÉRATURE"' in i18n_text
    assert '"Télécharger OTIO"' in i18n_text
    assert '"Sélection"' in i18n_text
    assert '"Rasoir"' in i18n_text
    assert '"Magnétisme"' in i18n_text
    assert '"Audio du Plan & Mixeur Pistes"' in i18n_text
    assert '"Fondu Entrée (s)"' in i18n_text
    assert '"Parade RVB"' in i18n_text
    assert '"Oscilloscope Y"' in i18n_text
    assert '"Vecteurscope"' in i18n_text
    assert '"Fondu Sortie (s)"' in i18n_text
    assert '"Fondu Enchaîné (fade)"' in i18n_text
    assert '"Volet Gauche (wipeleft)"' in i18n_text
    assert '"statusbar.shortcuts"' in i18n_text
    assert '"Sauver Projet"' in i18n_text
    assert '"Ouvrir Projet"' in i18n_text
    assert '"NLE Keyboard Shortcuts"' in i18n_text
    assert '"Raccourcis Clavier NLE"' in i18n_text
    assert '"Volet Avant/Après"' in i18n_text
    assert '"AVANT"' in i18n_text
    assert '"APRÈS"' in i18n_text
    assert '"Capturer Image"' in i18n_text
    assert '"Galerie d\'Images"' in i18n_text
    assert '"Télécharger PNG"' in i18n_text
    assert '"Capturer Image Fixe PNG (Couleur & FX)"' in i18n_text
    assert '"Arbre de Nœuds Série"' in i18n_text
    assert '"+ Nœud Série"' in i18n_text
    assert '"Importer .cube"' in i18n_text
    assert "innerHTML" not in i18n_text
    for asset_path in ("/app.js", "/canvas.js", "/timeline_ops.js", "/demo_adapter.js"):
        asset_text = _http_call(f"{base_url}{asset_path}")[2].decode("utf-8")
        assert "\u2013" not in asset_text
        assert "\u2014" not in asset_text
        assert "innerHTML" not in asset_text


def test_timeline_ops_js_unit_suite() -> None:
    import shutil

    node = shutil.which("node")
    if node is None:
        pytest.skip("Node.js runtime not installed")

    ops_path = (
        Path(__file__).resolve().parents[1]
        / "src"
        / "taktcut"
        / "ui"
        / "assets"
        / "timeline_ops.js"
    ).as_uri()
    script = f"""
import assert from "node:assert/strict";
import {{
  BPM_DEFAULT,
  BPM_MAX,
  BPM_MIN,
  CLIP_LABEL_COLORS,
  CLIP_LABEL_COLOR_IDS,
  DELIVERY_PRESETS,
  MARKER_COLORS,
  MAX_COLOR_NODES,
  SHUTTLE_MAX_SPEED,
  SHUTTLE_SPEEDS,
  SPLIT_WIPE_HIT_RADIUS_PX,
  SPLIT_WIPE_POS_DEFAULT,
  SPLIT_WIPE_POS_MAX,
  SPLIT_WIPE_POS_MIN,
  STILLS_GALLERY_MAX,
  addColorNodeToTree,
  addMarkerInDocument,
  appendClipToTrackInDocument,
  appendStillBounded,
  applyColorNodeChainRgbClient,
  applyCubeLutRgbClient,
  bakeColorNodeChainToCubeTextClient,
  buildAtempoStagesClient,
  buildSourceTapeSegments,
  buildStillFilename,
  clampSplitWipePercent,
  classifyMediaPoolEntry,
  collectSnapTargets,
  compileAudioFilterClient,
  compileColorNodeChainClient,
  compileFairlightAudioFilterClient,
  compileFramingFilterClient,
  compileRetimeFilterClient,
  compileTransformFilterClient,
  compileTransitionFilterClient,
  compileVideoFadeFilterClient,
  computeBpmBeatFrames,
  computeInOutRangeMetrics,
  computeRetimeRampSummary,
  computeSplitWipeGeometry,
  computeSplitWipePercentFromPointer,
  computeTimelineZoomViewport,
  clearTransformParamKeyframesInDocument,
  createDefaultColorNodeTree,
  createStillRecord,
  deleteMarkerInDocument,
  escapeFfmetadataValue,
  escapeXmlAttr,
  estimateRenderFileSize,
  evaluateClipTransformAtTime,
  evaluateCubicBezier,
  evaluateCubicBezierDerivative,
  evaluateRetimeSourceOffset,
  evaluateRetimeSpeedAt,
  filterMediaPoolEntries,
  filterTimelineClips,
  findActiveTransitionAtFrame,
  findAdjacentCutForClip,
  findAllCutJunctions,
  findMagneticSnap,
  findNearestEditPointForTrack,
  formatCmx3600Edl,
  formatFcpxmlTimeline,
  formatFfmetadataFromMarkers,
  formatRetimeBadgeText,
  formatShuttleSpeedLabel,
  formatYoutubeChaptersFromMarkers,
  framesToSmpteTimecode,
  getDeliveryPresetClient,
  insertClipAtFrameInDocument,
  isPointerOnSplitWipeDivider,
  isTrackAudiblyMuted,
  isValidClipLabelColor,
  moveColorNodeInTree,
  normalizeBpmConfig,
  normalizeClipAudio,
  normalizeClipLabelColor,
  normalizeClipRetime,
  normalizeClipTransition,
  normalizeFairlightAudioParams,
  normalizeInOutRange,
  normalizeMarkerColor,
  parseCubeLutTextClient,
  removeColorNodeFromTree,
  removeStillById,
  removeTransformKeyframeInDocument,
  resolveSourceTapeFrame,
  sampleTransformCurve,
  sanitizeStillDataUrl,
  selectColorNodeInTree,
  toggleColorNodeBypassInTree,
  updateColorNodeInTree,
  normalizeSplitWipeState,
  rippleDeleteClipInDocument,
  setClipLabelColor,
  setInOutRange,
  smartInsertClipInDocument,
  splitClipInDocument,
  splitClipsAtPlayhead,
  stepPlayheadInRange,
  stepShuttleSpeed,
  timelineDocToChapterInputs,
  toggleTrackMuteInDocument,
  toggleTrackSoloInDocument,
  trimClipInDocument,
  updateClipAudioInDocument,
  updateClipRetimeInDocument,
  updateClipTransitionInDocument,
  updateMarkerInDocument,
  updateTransformKeyframeBezierInDocument,
  upsertTransformKeyframeInDocument,
  validateTimelineClient
}} from {json.dumps(ops_path)};

const doc = {{
  name: "Unit_Test_Cut",
  source_format: "drt",
  fps: {{ num: 25, den: 1 }},
  width: 1920,
  height: 1080,
  start_frame: 0,
  tracks: [
    {{
      index: 1,
      kind: "video",
      name: "V1",
      clips: [
        {{
          name: "C1", track_index: 1, media_type: "video",
          start_frame: 0, duration_frames: 100, source_in_frame: 10
        }},
        {{
          name: "C2", track_index: 1, media_type: "video",
          start_frame: 100, duration_frames: 100, source_in_frame: 0
        }}
      ]
    }}
  ],
  markers: [
    {{ name: "M1", frame: 50, duration_frames: 1, color: "Blue", note: "" }}
  ]
}};

const targets = collectSnapTargets(doc, {{ includePlayhead: true, playheadFrame: 75 }});
const snapMarker = findMagneticSnap(51.5, targets, 2.0, 10, 0, 200);
assert.equal(snapMarker.snapped, true);
assert.equal(snapMarker.frame, 50);

const snapNone = findMagneticSnap(30, targets, 2.0, 10, 0, 200);
assert.equal(snapNone.snapped, false);
assert.equal(snapNone.frame, 30);

const splitRes = splitClipInDocument(doc, "video", 1, 0, 40);
assert.equal(splitRes.split, true);
assert.equal(splitRes.doc.tracks[0].clips.length, 3);
assert.equal(splitRes.leftClip.duration_frames, 40);
assert.equal(splitRes.rightClip.start_frame, 40);
assert.equal(splitRes.rightClip.duration_frames, 60);
assert.equal(splitRes.rightClip.source_in_frame, 50);
assert.equal(validateTimelineClient(splitRes.doc).valid, true);

const edgeSplit = splitClipInDocument(doc, "video", 1, 0, 0);
assert.equal(edgeSplit.split, false);

const phSplit = splitClipsAtPlayhead(doc, 150);
assert.equal(phSplit.splitCount, 1);
assert.equal(phSplit.doc.tracks[0].clips.length, 3);

const trimRight = trimClipInDocument(doc, "video", 1, 0, "right", 80);
assert.equal(trimRight.changed, true);
assert.equal(trimRight.clip.duration_frames, 80);
assert.equal(validateTimelineClient(trimRight.doc).issues[0].kind, "gap");

const trimLeft = trimClipInDocument(doc, "video", 1, 1, "left", 120);
assert.equal(trimLeft.changed, true);
assert.equal(trimLeft.clip.start_frame, 120);
assert.equal(trimLeft.clip.duration_frames, 80);
assert.equal(trimLeft.clip.source_in_frame, 20);

const audioDoc = updateClipAudioInDocument(doc, "video", 1, 0, {{
  audio_gain_db: -6.0,
  fade_in_s: 1.0,
  fade_out_s: 1.5
}});
assert.equal(audioDoc.changed, true);
assert.equal(audioDoc.clip.audio_gain_db, -6);
assert.equal(audioDoc.clip.fade_in_s, 1);
assert.equal(audioDoc.clip.fade_out_s, 1.5);

const splitAudio = splitClipInDocument(audioDoc.doc, "video", 1, 0, 50);
assert.equal(splitAudio.split, true);
assert.equal(splitAudio.leftClip.audio_gain_db, -6);
assert.equal(splitAudio.leftClip.fade_in_s, 1);
assert.equal(splitAudio.leftClip.fade_out_s, 0);
assert.equal(splitAudio.rightClip.audio_gain_db, -6);
assert.equal(splitAudio.rightClip.fade_in_s, 0);
assert.equal(splitAudio.rightClip.fade_out_s, 1.5);

const mutedDoc = toggleTrackMuteInDocument(audioDoc.doc, "video", 1);
assert.equal(mutedDoc.changed, true);
assert.equal(isTrackAudiblyMuted(mutedDoc.track, mutedDoc.doc.tracks), true);

const soloDoc = toggleTrackSoloInDocument(audioDoc.doc, "video", 1);
assert.equal(soloDoc.changed, true);
assert.equal(isTrackAudiblyMuted(soloDoc.track, soloDoc.doc.tracks), false);

const compiledAf = compileAudioFilterClient(
  {{ gain_db: -6, fade_in_s: 1.0, fade_out_s: 1.5, muted: false }},
  10.0,
  null
);
assert.equal(
  compiledAf.filtergraph,
  "volume=-6.00dB,afade=t=in:st=0.000:d=1.000,afade=t=out:st=8.500:d=1.500"
);

const normFl = normalizeFairlightAudioParams({{
  loudness_preset: "bad",
  dialogue_eq: "voice_clarity"
}});
assert.equal(normFl.loudness_preset, "off");
assert.equal(normFl.dialogue_eq, "voice_clarity");

const compiledFl = compileFairlightAudioFilterClient({{
  loudness_preset: "youtube_14",
  dialogue_eq: "podcast_warm"
}});
assert.equal(
  compiledFl.filtergraph,
  "highpass=f=70,equalizer=f=180:t=q:w=1.0:g=2,equalizer=f=4000:t=q:w=1.2:g=2,loudnorm=I=-14.0:TP=-1.0:LRA=11"
);
const compiledAfFairlight = compileAudioFilterClient(
  {{ gain_db: -2.0, fade_in_s: 0.0, fade_out_s: 0.0, muted: false }},
  4.0,
  null,
  {{ loudness_preset: "broadcast_23", dialogue_eq: "derumble" }}
);
assert.equal(
  compiledAfFairlight.filtergraph,
  "volume=-2.00dB,highpass=f=100,loudnorm=I=-23.0:TP=-1.0:LRA=11"
);

const compiledVf = compileVideoFadeFilterClient({{ fade_in_s: 0.5, fade_out_s: 1.0 }}, 5.0);
assert.equal(compiledVf.is_identity, false);
assert.equal(
  compiledVf.filtergraph,
  "fade=t=in:st=0.000:d=0.500,fade=t=out:st=4.000:d=1.000"
);
const compiledVfClamped = compileVideoFadeFilterClient({{ fade_in_s: 3.0, fade_out_s: 3.0 }}, 2.0);
assert.equal(
  compiledVfClamped.filtergraph,
  "fade=t=in:st=0.000:d=1.000,fade=t=out:st=1.000:d=1.000"
);

const retimeNormDefault = normalizeClipRetime(doc.tracks[0].clips[0]);
assert.equal(retimeNormDefault.speedRate, 1);
assert.equal(retimeNormDefault.reverse, false);
assert.equal(formatRetimeBadgeText(0.5, false), "0.5x");
assert.equal(formatRetimeBadgeText(2.0, true), "2.0x REV");
assert.equal(formatRetimeBadgeText(0.25, false), "0.25x");

const retimeDoc = updateClipRetimeInDocument(doc, "video", 1, 0, {{
  speed_rate: 2.0,
  reverse: true
}});
assert.equal(retimeDoc.changed, true);
assert.equal(retimeDoc.clip.speed_rate, 2);
assert.equal(retimeDoc.clip.reverse, true);

const splitRetimed = splitClipInDocument(retimeDoc.doc, "video", 1, 0, 40);
assert.equal(splitRetimed.split, true);
assert.equal(splitRetimed.leftClip.speed_rate, 2);
assert.equal(splitRetimed.leftClip.reverse, true);
assert.equal(splitRetimed.rightClip.speed_rate, 2);
assert.equal(splitRetimed.rightClip.reverse, true);
assert.equal(splitRetimed.rightClip.source_in_frame, 90);

assert.deepEqual(buildAtempoStagesClient(0.25), [0.5, 0.5]);
assert.deepEqual(buildAtempoStagesClient(4.0), [2, 2]);

const compiledRt = compileRetimeFilterClient({{ speed_rate: 4.0, reverse: true }});
assert.equal(compiledRt.is_identity, false);
assert.equal(compiledRt.video_filtergraph, "setpts=0.250000*PTS,reverse");
assert.equal(compiledRt.audio_filtergraph, "atempo=2.0000,atempo=2.0000,areverse");

assert.equal(normalizeClipTransition(doc.tracks[0].clips[0]), null);
const transDoc = updateClipTransitionInDocument(doc, "video", 1, 0, {{
  preset: "wipeleft",
  duration_s: 0.8,
  include_audio: true
}});
assert.equal(transDoc.changed, true);
assert.equal(transDoc.clip.transition_out.preset, "wipeleft");
assert.equal(transDoc.clip.transition_out.duration_s, 0.8);

const junctions = findAllCutJunctions(transDoc.doc);
assert.equal(junctions.length, 1);
assert.equal(junctions[0].cutFrame, 100);
assert.ok(findAdjacentCutForClip(transDoc.doc, "video", 1, 0));
assert.ok(findAdjacentCutForClip(transDoc.doc, "video", 1, 1));

const activeMid = findActiveTransitionAtFrame(transDoc.doc, 100);
assert.ok(activeMid);
assert.equal(activeMid.transition.preset, "wipeleft");
assert.ok(activeMid.progress > 0.4 && activeMid.progress < 0.6);

const compiledTr = compileTransitionFilterClient(
  {{ preset: "fadeblack", duration_s: 0.5, include_audio: true }},
  4.0,
  3.0
);
assert.equal(
  compiledTr.video_filtergraph,
  "[0:v][1:v]xfade=transition=fadeblack:duration=0.500:offset=3.500[vout]"
);
assert.equal(
  compiledTr.audio_filtergraph,
  "[0:a][1:a]acrossfade=d=0.500:c1=tri:c2=tri[aout]"
);

// BPM Beat Grid & Timeline Marker CRUD + Snap Math
assert.equal(BPM_MIN, 60);
assert.equal(BPM_MAX, 200);
assert.equal(BPM_DEFAULT, 128);
assert.deepEqual(MARKER_COLORS, ["Cyan", "Gold", "Red", "Green"]);
assert.equal(normalizeMarkerColor("gold"), "Gold");
assert.equal(normalizeMarkerColor("unknown"), "Cyan");

const clampedBpm = normalizeBpmConfig({{ enabled: true, bpm: 240, offset_s: 0.25 }});
assert.equal(clampedBpm.enabled, true);
assert.equal(clampedBpm.bpm, 200);
assert.equal(clampedBpm.offset_s, 0.25);

const beats125 = computeBpmBeatFrames(doc, {{ enabled: true, bpm: 125, offset_s: 0.0 }}, 0, 60);
assert.deepEqual(
  beats125.map((b) => b.frame),
  [0, 12, 24, 36, 48, 60]
);
assert.equal(beats125[0].isDownbeat, true);
assert.equal(beats125[1].isDownbeat, false);
assert.equal(beats125[4].isDownbeat, true);
assert.equal(beats125[4].bar, 2);

const beatsOffset = computeBpmBeatFrames(doc, {{ enabled: true, bpm: 125, offset_s: 0.2 }}, 0, 60);
assert.deepEqual(
  beatsOffset.map((b) => b.frame),
  [5, 17, 29, 41, 53]
);

const beatTargets = collectSnapTargets(doc, {{
  bpmGrid: {{ enabled: true, bpm: 125, offset_s: 0.0 }},
  maxFrame: 200
}});
const beatSnap = findMagneticSnap(25.2, beatTargets, 2.0, 10, 0, 200);
assert.equal(beatSnap.snapped, true);
assert.equal(beatSnap.frame, 24);
assert.equal(beatSnap.kind, "beat");

const addedMk = addMarkerInDocument(doc, {{
  frame: 72,
  color: "Gold",
  name: "Chorus Drop"
}});
assert.equal(addedMk.changed, true);
assert.equal(addedMk.doc.markers.length, 2);
assert.equal(addedMk.markerIndex, 1);
assert.equal(addedMk.marker.color, "Gold");
assert.equal(addedMk.marker.name, "Chorus Drop");

const updatedMk = updateMarkerInDocument(addedMk.doc, 1, {{
  name: "Verse Hit",
  color: "Red"
}});
assert.equal(updatedMk.changed, true);
assert.equal(updatedMk.marker.name, "Verse Hit");
assert.equal(updatedMk.marker.color, "Red");

const targetsWithMk = collectSnapTargets(updatedMk.doc, {{
  bpmGrid: {{ enabled: true, bpm: 125, offset_s: 0.0 }},
  maxFrame: 200
}});
const mkSnap = findMagneticSnap(73.1, targetsWithMk, 2.0, 10, 0, 200);
assert.equal(mkSnap.snapped, true);
assert.equal(mkSnap.frame, 72);
assert.equal(mkSnap.kind, "marker");

const deletedMk = deleteMarkerInDocument(updatedMk.doc, 1);
assert.equal(deletedMk.changed, true);
assert.equal(deletedMk.doc.markers.length, 1);

assert.equal(DELIVERY_PRESETS.length, 5);
assert.deepEqual(
  DELIVERY_PRESETS.map((p) => p.id),
  [
    "youtube_1080p_h264",
    "youtube_4k_hevc",
    "reels_tiktok_9_16",
    "broadcast_prores_422",
    "fast_draft_720p"
  ]
);
const uhdPreset = getDeliveryPresetClient("youtube_4k_hevc");
assert.equal(uhdPreset.width, 3840);
assert.equal(uhdPreset.height, 2160);
assert.equal(uhdPreset.audio_bitrate_kbps, 320);
const uhdFraming = compileFramingFilterClient({{
  preset: uhdPreset.aspect_ratio,
  mode: uhdPreset.framing_mode,
  target_width: uhdPreset.width,
  target_height: uhdPreset.height,
  enabled: true
}});
assert.equal(uhdFraming.target_width, 3840);
assert.equal(uhdFraming.target_height, 2160);
assert.ok(uhdFraming.filtergraph.includes("scale=w=3840:h=2160"));

// J/K/L Shuttle Transport State Machine
assert.equal(SHUTTLE_MAX_SPEED, 4);
assert.deepEqual(SHUTTLE_SPEEDS, [-4, -2, -1, 0, 1, 2, 4]);
let spd = 0;
spd = stepShuttleSpeed(spd, "l");
assert.equal(spd, 1);
assert.equal(formatShuttleSpeedLabel(spd), "1x");
spd = stepShuttleSpeed(spd, "l");
assert.equal(spd, 2);
assert.equal(formatShuttleSpeedLabel(spd), "2x");
spd = stepShuttleSpeed(spd, "l");
assert.equal(spd, 4);
assert.equal(formatShuttleSpeedLabel(spd), "4x");
spd = stepShuttleSpeed(spd, "l");
assert.equal(spd, 4);
spd = stepShuttleSpeed(spd, "j");
assert.equal(spd, -1);
assert.equal(formatShuttleSpeedLabel(spd), "-1x");
spd = stepShuttleSpeed(spd, "j");
assert.equal(spd, -2);
assert.equal(formatShuttleSpeedLabel(spd), "-2x");
spd = stepShuttleSpeed(spd, "j");
assert.equal(spd, -4);
assert.equal(formatShuttleSpeedLabel(spd), "-4x");
spd = stepShuttleSpeed(spd, "j");
assert.equal(spd, -4);
spd = stepShuttleSpeed(spd, "k");
assert.equal(spd, 0);
assert.equal(formatShuttleSpeedLabel(spd), "0x");
assert.equal(stepShuttleSpeed(-2, "l"), 1);
assert.equal(stepShuttleSpeed(0, "toggle"), 1);
assert.equal(stepShuttleSpeed(2, "toggle"), 0);

// In/Out (I/O) Range Selection & Math
let io = setInOutRange(null, "in", 25, 0, 200);
assert.deepEqual(io, {{ in_frame: 25, out_frame: null }});
io = setInOutRange(io, "out", 125, 0, 200);
assert.deepEqual(io, {{ in_frame: 25, out_frame: 125 }});
const ioMetrics = computeInOutRangeMetrics(io, doc.fps, 0, 200);
assert.equal(ioMetrics.hasIn, true);
assert.equal(ioMetrics.hasOut, true);
assert.equal(ioMetrics.isActive, true);
assert.equal(ioMetrics.isComplete, true);
assert.equal(ioMetrics.durationFrames, 100);
assert.equal(ioMetrics.durationSeconds, 4.0);

// Setting In past Out clears Out; setting Out before In clears In
const ioInPastOut = setInOutRange(io, "in", 150, 0, 200);
assert.deepEqual(ioInPastOut, {{ in_frame: 150, out_frame: null }});
const ioOutBeforeIn = setInOutRange(ioInPastOut, "out", 60, 0, 200);
assert.deepEqual(ioOutBeforeIn, {{ in_frame: null, out_frame: 60 }});
const partialMetrics = computeInOutRangeMetrics(ioOutBeforeIn, 25, 0, 200);
assert.equal(partialMetrics.isActive, true);
assert.equal(partialMetrics.isComplete, false);
assert.equal(partialMetrics.durationFrames, null);
assert.equal(partialMetrics.effectiveStart, 0);
assert.equal(partialMetrics.effectiveEnd, 60);
assert.equal(partialMetrics.effectiveDurationFrames, 60);

// Alt+X Clear & normalize clamping
assert.deepEqual(setInOutRange(io, "clear"), {{ in_frame: null, out_frame: null }});
assert.deepEqual(normalizeInOutRange({{ in_frame: -10, out_frame: 999 }}, 0, 200), {{
  in_frame: 0,
  out_frame: 200
}});
assert.deepEqual(normalizeInOutRange({{ in_frame: 120, out_frame: 80 }}, 0, 200), {{
  in_frame: 120,
  out_frame: null
}});

// Loop & Bounds Playhead Stepping
assert.deepEqual(stepPlayheadInRange(124, 2, 0, 200, io, true), {{ frame: 25, stop: false }});
assert.deepEqual(stepPlayheadInRange(25, -1, 0, 200, io, true), {{ frame: 125, stop: false }});
assert.deepEqual(stepPlayheadInRange(198, 5, 0, 200, io, false), {{ frame: 200, stop: true }});
assert.deepEqual(stepPlayheadInRange(2, -5, 0, 200, io, false), {{ frame: 0, stop: true }});

// Ripple Delete (Shift+Backspace / Inspector action)
const rippleMultiTrack = {{
  name: "Ripple_Test",
  source_format: "drt",
  fps: {{ num: 25, den: 1 }},
  width: 1920,
  height: 1080,
  start_frame: 0,
  tracks: [
    {{
      index: 1,
      kind: "video",
      name: "V1",
      clips: [
        {{
          name: "V_A", track_index: 1, media_type: "video",
          start_frame: 0, duration_frames: 50, source_in_frame: 0,
          transition_out: {{ preset: "fade", duration_s: 0.4, include_audio: true }}
        }},
        {{
          name: "V_B", track_index: 1, media_type: "video",
          start_frame: 50, duration_frames: 75, source_in_frame: 10
        }},
        {{
          name: "V_C", track_index: 1, media_type: "video",
          start_frame: 125, duration_frames: 100, source_in_frame: 0
        }}
      ]
    }},
    {{
      index: 1,
      kind: "audio",
      name: "A1",
      clips: [
        {{
          name: "A_BG", track_index: 1, media_type: "audio",
          start_frame: 0, duration_frames: 225, source_in_frame: 0
        }}
      ]
    }}
  ],
  markers: []
}};

// Delete middle V_B: V_C shifts left by 75f, V_A clears transition, A1 untouched
const rippleMid = rippleDeleteClipInDocument(rippleMultiTrack, "video", 1, 1);
assert.equal(rippleMid.changed, true);
assert.equal(rippleMid.deletedClip.name, "V_B");
assert.equal(rippleMid.shiftedCount, 1);
assert.equal(rippleMid.focusClip.name, "V_C");
assert.equal(rippleMid.doc.tracks[0].clips.length, 2);
assert.equal(rippleMid.doc.tracks[0].clips[0].start_frame, 0);
assert.equal(rippleMid.doc.tracks[0].clips[0].transition_out, null);
assert.equal(rippleMid.doc.tracks[0].clips[1].name, "V_C");
assert.equal(rippleMid.doc.tracks[0].clips[1].start_frame, 50);
assert.equal(rippleMid.doc.tracks[0].clips[1].duration_frames, 100);
assert.equal(rippleMid.doc.tracks[1].clips[0].duration_frames, 225);
assert.equal(validateTimelineClient(rippleMid.doc).valid, true);
// Original document remains immutable for Undo/Redo
assert.equal(rippleMultiTrack.tracks[0].clips.length, 3);
assert.equal(rippleMultiTrack.tracks[0].clips[2].start_frame, 125);

// Delete first clip V_A from rippleMid result: V_C shifts to start_frame 0
const rippleFirst = rippleDeleteClipInDocument(rippleMid.doc, "video", 1, 0);
assert.equal(rippleFirst.changed, true);
assert.equal(rippleFirst.shiftedCount, 1);
assert.equal(rippleFirst.focusClip.name, "V_C");
assert.equal(rippleFirst.doc.tracks[0].clips.length, 1);
assert.equal(rippleFirst.doc.tracks[0].clips[0].start_frame, 0);

// Delete last remaining clip on V1: empty track, focusClip null
const rippleOnly = rippleDeleteClipInDocument(rippleFirst.doc, "video", 1, 0);
assert.equal(rippleOnly.changed, true);
assert.equal(rippleOnly.shiftedCount, 0);
assert.equal(rippleOnly.focusClip, null);
assert.equal(rippleOnly.doc.tracks[0].clips.length, 0);

// Delete trailing clip on multi-clip track: focuses previous clip
const rippleLast = rippleDeleteClipInDocument(rippleMid.doc, "video", 1, 1);
assert.equal(rippleLast.changed, true);
assert.equal(rippleLast.shiftedCount, 0);
assert.equal(rippleLast.focusClip.name, "V_A");

// Invalid track/index is a clean no-op
const rippleBad = rippleDeleteClipInDocument(rippleMultiTrack, "video", 9, 0);
assert.equal(rippleBad.changed, false);
assert.equal(rippleBad.doc, rippleMultiTrack);

// Split-Screen Before/After Wipe state clamping [0, 100] & geometry
assert.equal(SPLIT_WIPE_POS_MIN, 0);
assert.equal(SPLIT_WIPE_POS_MAX, 100);
assert.equal(SPLIT_WIPE_POS_DEFAULT, 50);
assert.equal(clampSplitWipePercent(-25), 0);
assert.equal(clampSplitWipePercent(0), 0);
assert.equal(clampSplitWipePercent(42.5), 42.5);
assert.equal(clampSplitWipePercent(145), 100);
assert.equal(clampSplitWipePercent(Number.NaN), 50);
assert.equal(clampSplitWipePercent(null, 75), 75);
assert.equal(clampSplitWipePercent(undefined, 150), 100);

const wipeNormFromRatio = normalizeSplitWipeState({{ enabled: true, wipe_ratio: 0.65 }}, false);
assert.equal(wipeNormFromRatio.enabled, true);
assert.equal(wipeNormFromRatio.positionPct, 65);
assert.equal(wipeNormFromRatio.ratio, 0.65);

const wipeNormClamped = normalizeSplitWipeState({{ positionPct: 180 }}, true);
assert.equal(wipeNormClamped.enabled, true);
assert.equal(wipeNormClamped.positionPct, 100);
assert.equal(wipeNormClamped.ratio, 1);

const wipeGeom = computeSplitWipeGeometry(20, 10, 400, 200, 50);
assert.equal(wipeGeom.dividerX, 220);
assert.equal(wipeGeom.handleX, 220);
assert.equal(wipeGeom.handleY, 110);
assert.deepEqual(wipeGeom.leftRect, {{ x: 20, y: 10, width: 200, height: 200 }});
assert.deepEqual(wipeGeom.rightRect, {{ x: 220, y: 10, width: 200, height: 200 }});

const wipeGeomZero = computeSplitWipeGeometry(10, 0, 300, 180, -10);
assert.equal(wipeGeomZero.dividerX, 10);
assert.equal(wipeGeomZero.leftRect.width, 0);
assert.equal(wipeGeomZero.rightRect.width, 300);

const wipeGeomFull = computeSplitWipeGeometry(10, 0, 300, 180, 120);
assert.equal(wipeGeomFull.dividerX, 310);
assert.equal(wipeGeomFull.leftRect.width, 300);
assert.equal(wipeGeomFull.rightRect.width, 0);

assert.equal(computeSplitWipePercentFromPointer(220, 20, 400), 50);
assert.equal(computeSplitWipePercentFromPointer(-50, 20, 400), 0);
assert.equal(computeSplitWipePercentFromPointer(600, 20, 400), 100);
assert.equal(computeSplitWipePercentFromPointer(100, 20, 0), 50);

assert.equal(isPointerOnSplitWipeDivider(220, 110, wipeGeom, SPLIT_WIPE_HIT_RADIUS_PX), true);
assert.equal(isPointerOnSplitWipeDivider(235, 50, wipeGeom, SPLIT_WIPE_HIT_RADIUS_PX), true);
assert.equal(isPointerOnSplitWipeDivider(260, 110, wipeGeom, SPLIT_WIPE_HIT_RADIUS_PX), false);
assert.equal(isPointerOnSplitWipeDivider(220, 250, wipeGeom, SPLIT_WIPE_HIT_RADIUS_PX), false);

// DaVinci Gallery Still Grab & bounded Stills Gallery helpers
assert.equal(STILLS_GALLERY_MAX, 8);
const stillDate = new Date(2026, 10, 23, 1, 14, 9);
assert.equal(buildStillFilename(stillDate), "taktcut-still-20261123-011409.png");
assert.equal(sanitizeStillDataUrl("javascript:alert(1)"), "");
assert.equal(sanitizeStillDataUrl("data:text/html,<script>alert(1)</script>"), "");
const validPngData =
  "data:image/png;base64," +
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
assert.equal(sanitizeStillDataUrl(validPngData), validPngData);

const stillRec = createStillRecord({{
  id: "s1",
  source: "color",
  dataUrl: validPngData,
  preset: "Teal & Orange",
  createdAt: stillDate,
  width: 640,
  height: 224,
}});
assert.equal(stillRec.filename, "taktcut-still-20261123-011409.png");
assert.equal(stillRec.source, "color");
assert.equal(stillRec.label, "COLOR");
assert.equal(stillRec.preset, "Teal & Orange");
assert.equal(stillRec.timestampLabel, "01:14:09");
assert.equal(stillRec.dataUrl, validPngData);

const xssStill = createStillRecord({{
  id: "xss",
  source: "unknown",
  dataUrl: "javascript:alert(1)",
  createdAt: stillDate,
}});
assert.equal(xssStill.source, "color");
assert.equal(xssStill.dataUrl, "");

let gallery = [];
for (let idx = 1; idx <= 10; idx += 1) {{
  const rec = createStillRecord({{
    id: `still-${{idx}}`,
    source: idx % 2 === 0 ? "fx" : "color",
    dataUrl: validPngData,
    createdAt: new Date(2026, 10, 23, 1, 14, idx),
  }});
  gallery = appendStillBounded(gallery, rec);
}}
assert.equal(gallery.length, 8);
assert.equal(gallery[0].id, "still-10");
assert.equal(gallery[7].id, "still-3");

const afterDelete = removeStillById(gallery, "still-9");
assert.equal(afterDelete.length, 7);
assert.equal(afterDelete.some((s) => s.id === "still-9"), false);
assert.equal(gallery.length, 8);

// YouTube Chapters & FFMETADATA export helpers
assert.equal(formatYoutubeChaptersFromMarkers([]), "");
assert.equal(formatYoutubeChaptersFromMarkers(null), "");
assert.equal(
  formatYoutubeChaptersFromMarkers([
    {{ time_s: 45, label: "Chorus Drop" }},
    {{ time_s: 12, label: "Verse\\nOne" }}
  ]),
  "00:00 Intro\\n00:12 Verse One\\n00:45 Chorus Drop"
);
assert.equal(
  formatYoutubeChaptersFromMarkers([
    {{ time_s: 0, label: "Cold Open" }},
    {{ time_s: 3665, label: "Encore Finale" }}
  ]),
  "00:00 Cold Open\\n01:01:05 Encore Finale"
);
assert.equal(
  formatYoutubeChaptersFromMarkers([{{ time_s: -3, label: "" }}]),
  "00:00 Chapter"
);

assert.equal(formatFfmetadataFromMarkers([], 20), ";FFMETADATA1\\n");
assert.equal(
  escapeFfmetadataValue("A=B;C#D\\\\E\\nF"),
  "A\\\\=B\\\\;C\\\\#D\\\\\\\\E\\\\\\nF"
);
const ffmetaOut = formatFfmetadataFromMarkers(
  [
    {{ time_s: 15, label: "Part=2;Peak#1\\\\Mix\\nEnd" }},
    {{ time_s: 0, label: "Intro" }}
  ],
  40
);
assert.equal(
  ffmetaOut,
  [
    ";FFMETADATA1",
    "[CHAPTER]",
    "TIMEBASE=1/1000",
    "START=0",
    "END=15000",
    "title=Intro",
    "[CHAPTER]",
    "TIMEBASE=1/1000",
    "START=15000",
    "END=40000",
    "title=Part\\\\=2\\\\;Peak\\\\#1\\\\\\\\Mix\\\\\\nEnd",
    ""
  ].join("\\n")
);

const chapterDocInputs = timelineDocToChapterInputs({{
  fps: {{ num: 25, den: 1 }},
  start_frame: 0,
  tracks: [
    {{
      index: 1,
      kind: "video",
      name: "V1",
      clips: [{{ start_frame: 0, duration_frames: 500 }}]
    }}
  ],
  markers: [
    {{ name: "Grade Reference", frame: 225, duration_frames: 1, color: "Gold" }},
    {{ name: "Intro Title Cue", frame: 25, duration_frames: 1, color: "Cyan" }}
  ]
}});
assert.equal(chapterDocInputs.totalDurationS, 20);
assert.equal(
  formatYoutubeChaptersFromMarkers(chapterDocInputs.markers),
  "00:00 Intro\\n00:01 Intro Title Cue\\n00:09 Grade Reference"
);

// estimateRenderFileSize unit tests
for (const badDur of [0, -5, NaN, null, undefined]) {{
  const res = estimateRenderFileSize({{
    durationS: badDur,
    codec: "web_h264",
    width: 1920,
    height: 1080,
    fps: 25,
    crf: 18,
    audioBitrateKbps: 192
  }});
  assert.equal(res.estimatedBytes, 0);
  assert.equal(res.estimatedMb, 0);
  assert.equal(res.formattedSize, "0 MB");
  assert.equal(res.videoBitrateKbps, 0);
  assert.equal(res.audioBitrateKbps, 0);
  assert.equal(res.warning, "invalid_duration");
}}

const h264_1080p = estimateRenderFileSize({{
  durationS: 20,
  codec: "web_h264",
  width: 1920,
  height: 1080,
  fps: 25,
  crf: 18,
  audioBitrateKbps: 192
}});
assert.equal(h264_1080p.formattedSize, "~18.4 MB");
assert.equal(h264_1080p.warning, null);
assert.equal(h264_1080p.audioBitrateKbps, 192);
assert.ok(h264_1080p.videoBitrateKbps > 5000);

const prores422_10s = estimateRenderFileSize({{
  durationS: 10,
  codec: "prores_422",
  width: 1920,
  height: 1080,
  fps: 25
}});
assert.equal(prores422_10s.formattedSize, "~145 MB");
assert.equal(prores422_10s.audioBitrateKbps, 2304);
assert.equal(prores422_10s.warning, null);

const proresHq_20s = estimateRenderFileSize({{
  durationS: 20,
  codec: "prores_hq",
  width: 1920,
  height: 1080,
  fps: 25,
  crf: 18,
  audioBitrateKbps: null
}});
assert.ok(proresHq_20s.estimatedBytes > prores422_10s.estimatedBytes);
assert.equal(proresHq_20s.audioBitrateKbps, 2304);

const hevc_1080p = estimateRenderFileSize({{
  durationS: 20,
  codec: "master_hevc",
  width: 1920,
  height: 1080,
  fps: 25,
  crf: 20,
  audioBitrateKbps: 192
}});
assert.ok(hevc_1080p.estimatedBytes < h264_1080p.estimatedBytes);

const uhd4k_hevc = estimateRenderFileSize({{
  durationS: 20,
  codec: "master_hevc",
  width: 3840,
  height: 2160,
  fps: 25,
  crf: 20,
  audioBitrateKbps: 320
}});
assert.ok(uhd4k_hevc.estimatedBytes > hevc_1080p.estimatedBytes * 3);

const hd720_h264 = estimateRenderFileSize({{
  durationS: 20,
  codec: "web_h264",
  width: 1280,
  height: 720,
  fps: 25,
  crf: 18,
  audioBitrateKbps: 128
}});
assert.ok(hd720_h264.estimatedBytes < h264_1080p.estimatedBytes);

const fps60_h264 = estimateRenderFileSize({{
  durationS: 20,
  codec: "web_h264",
  width: 1920,
  height: 1080,
  fps: 60,
  crf: 18,
  audioBitrateKbps: 192
}});
assert.ok(fps60_h264.estimatedBytes > h264_1080p.estimatedBytes);

const ntsc_h264 = estimateRenderFileSize({{
  durationS: 20,
  codec: "web_h264",
  width: 1920,
  height: 1080,
  fps: "24000/1001",
  crf: 18,
  audioBitrateKbps: 192
}});
assert.ok(ntsc_h264.estimatedBytes < h264_1080p.estimatedBytes);

const crf14_h264 = estimateRenderFileSize({{
  durationS: 20,
  codec: "web_h264",
  width: 1920,
  height: 1080,
  fps: 25,
  crf: 14,
  audioBitrateKbps: 192
}});
const crf26_h264 = estimateRenderFileSize({{
  durationS: 20,
  codec: "web_h264",
  width: 1920,
  height: 1080,
  fps: 25,
  crf: 26,
  audioBitrateKbps: 192
}});
assert.ok(crf14_h264.estimatedBytes > h264_1080p.estimatedBytes);
assert.ok(crf26_h264.estimatedBytes < h264_1080p.estimatedBytes);

const tinyClip = estimateRenderFileSize({{
  durationS: 0.5,
  codec: "web_h264",
  width: 1280,
  height: 720,
  fps: 25,
  crf: 26,
  audioBitrateKbps: 128
}});
assert.ok(tinyClip.formattedSize.endsWith(" KB"));

const hugeProres = estimateRenderFileSize({{
  durationS: 300,
  codec: "prores_hq",
  width: 3840,
  height: 2160,
  fps: 25
}});
assert.equal(hugeProres.warning, "large_file");
assert.ok(hugeProres.formattedSize.endsWith(" GB"));

const wav24_10s = estimateRenderFileSize({{
  durationS: 10,
  codec: "web_h264",
  audioOnlyFormat: "wav24"
}});
assert.equal(wav24_10s.videoBitrateKbps, 0);
assert.equal(wav24_10s.audioBitrateKbps, 2304);
assert.equal(wav24_10s.estimatedBytes, 2880000);

const mp3_10s = estimateRenderFileSize({{
  durationS: 10,
  audioOnlyFormat: "mp3_320"
}});
assert.equal(mp3_10s.videoBitrateKbps, 0);
assert.equal(mp3_10s.audioBitrateKbps, 320);

const aac_10s = estimateRenderFileSize({{
  durationS: 10,
  audioOnlyFormat: "aac_256"
}});
assert.equal(aac_10s.videoBitrateKbps, 0);
assert.equal(aac_10s.audioBitrateKbps, 256);

// framesToSmpteTimecode unit tests
assert.equal(framesToSmpteTimecode(0, 25), "00:00:00:00");
assert.equal(framesToSmpteTimecode(-42, 25), "00:00:00:00");
assert.equal(framesToSmpteTimecode(NaN, 25), "00:00:00:00");
assert.equal(framesToSmpteTimecode(null, 25), "00:00:00:00");
assert.equal(framesToSmpteTimecode(24, 24), "00:00:01:00");
assert.equal(framesToSmpteTimecode(25, 25), "00:00:01:00");
assert.equal(framesToSmpteTimecode(30, 30), "00:00:01:00");
assert.equal(framesToSmpteTimecode(60, 60), "00:00:01:00");
assert.equal(framesToSmpteTimecode(149, 25), "00:00:05:24");
assert.equal(framesToSmpteTimecode(91537, 25), "01:01:01:12");
assert.equal(framesToSmpteTimecode(24, {{ num: 24000, den: 1001 }}), "00:00:01:00");
assert.equal(framesToSmpteTimecode(50, 0), "00:00:02:00");

// formatCmx3600Edl unit tests
assert.equal(
  formatCmx3600Edl(null),
  "TITLE: TAKTCUT_TIMELINE\\nFCM: NON-DROP FRAME\\n"
);
assert.equal(
  formatCmx3600Edl({{ tracks: [] }}, "EMPTY\\nCUT"),
  "TITLE: EMPTY CUT\\nFCM: NON-DROP FRAME\\n"
);

const edlDoc = {{
  name: "Master Edit",
  fps: {{ num: 25, den: 1 }},
  start_frame: 0,
  tracks: [
    {{
      index: 1,
      kind: "video",
      name: "V1",
      clips: [
        {{
          name: "B_Roll_Two",
          start_frame: 100,
          duration_frames: 50,
          source_in_frame: 25,
          source_path: "media/b_roll_two.mov",
          enabled: true
        }},
        {{
          name: "Disabled_Clip",
          start_frame: 50,
          duration_frames: 25,
          source_in_frame: 0,
          enabled: false
        }},
        {{
          name: "",
          start_frame: 0,
          duration_frames: 100,
          source_in_frame: 12,
          source_path: "/Volumes/Media/A001_C001.mov"
        }},
        {{
          name: "Zero_Dur",
          start_frame: 150,
          duration_frames: 0,
          source_in_frame: 0
        }}
      ]
    }},
    {{
      index: 1,
      kind: "audio",
      name: "A1",
      clips: [
        {{
          name: "Narration_WAV",
          start_frame: 0,
          duration_frames: 150,
          source_in_frame: 0
        }}
      ]
    }}
  ]
}};

const edlOut = formatCmx3600Edl(edlDoc, "TAKTCUT_MASTER");
assert.equal(
  edlOut,
  [
    "TITLE: TAKTCUT_MASTER",
    "FCM: NON-DROP FRAME",
    "",
    "001  AX       V     C        00:00:00:12 00:00:04:12 00:00:00:00 00:00:04:00",
    "* FROM CLIP NAME: A001_C001.mov",
    "",
    "002  AX       V     C        00:00:01:00 00:00:03:00 00:00:04:00 00:00:06:00",
    "* FROM CLIP NAME: B_Roll_Two",
    ""
  ].join("\\n")
);

// escapeXmlAttr & formatFcpxmlTimeline unit tests
assert.equal(escapeXmlAttr(null), "");
assert.equal(escapeXmlAttr(undefined), "");
assert.equal(
  escapeXmlAttr('A & B <"tag"> \\'ok\\''),
  "A &amp; B &lt;&quot;tag&quot;&gt; &apos;ok&apos;"
);

const emptyFcpxml = formatFcpxmlTimeline(null);
assert.ok(
  emptyFcpxml.startsWith(
    '<?xml version="1.0" encoding="UTF-8"?>\\n<!DOCTYPE fcpxml>\\n<fcpxml version="1.10">'
  )
);
assert.ok(
  emptyFcpxml.includes(
    '<format id="r1" frameDuration="1/25s" width="1920" height="1080" />'
  )
);
assert.ok(emptyFcpxml.includes('<project name="TaktCut_Timeline">'));
assert.ok(
  emptyFcpxml.includes('<sequence format="r1" duration="0s" tcStart="0s" tcFormat="NDF">')
);
assert.ok(emptyFcpxml.includes("<spine />"));

const fcpxmlDoc = {{
  name: 'Master & "Final" Cut',
  fps: {{ num: 24000, den: 1001 }},
  width: 3840,
  height: 2160,
  start_frame: 0,
  tracks: [
    {{
      index: 1,
      kind: "video",
      name: "V1",
      clips: [
        {{
          name: "Shot A & 1",
          start_frame: 0,
          duration_frames: 24,
          source_in_frame: 0,
          source_path: "/Volumes/Media/Reel A/Shot_A.mov",
          enabled: true
        }},
        {{
          name: "Disabled_Shot",
          start_frame: 24,
          duration_frames: 24,
          source_in_frame: 0,
          source_path: "/Volumes/Media/Disabled.mov",
          enabled: false
        }},
        {{
          name: "Shot A Reused",
          start_frame: 48,
          duration_frames: 48,
          source_in_frame: 24,
          source_path: "/Volumes/Media/Reel A/Shot_A.mov",
          enabled: true
        }},
        {{
          name: "Zero_Dur",
          start_frame: 96,
          duration_frames: 0,
          source_in_frame: 0,
          source_path: "/Volumes/Media/Zero.mov"
        }}
      ]
    }},
    {{
      index: 1,
      kind: "audio",
      name: "A1",
      clips: [
        {{
          name: "Narration",
          start_frame: 0,
          duration_frames: 96,
          source_in_frame: 0,
          source_path: "audio/vo_master.wav"
        }}
      ]
    }}
  ],
  markers: [
    {{
      name: "Chapter <1>",
      frame: 12,
      duration_frames: 1,
      note: 'Check "quote"'
    }}
  ]
}};

const fcpxmlOut = formatFcpxmlTimeline(fcpxmlDoc, 'Reel & <Show>');
assert.ok(
  fcpxmlOut.includes(
    '<format id="r1" frameDuration="1001/24000s" width="3840" height="2160" />'
  )
);
assert.ok(fcpxmlOut.includes('<event name="Reel &amp; &lt;Show&gt;">'));
assert.ok(fcpxmlOut.includes('<project name="Reel &amp; &lt;Show&gt;">'));
assert.ok(
  fcpxmlOut.includes(
    '<sequence format="r1" duration="96096/24000s" tcStart="0s" tcFormat="NDF">'
  )
);
// Deduplicated assets: Shot_A.mov (r2) + vo_master.wav (r3), Disabled/Zero skipped
assert.equal((fcpxmlOut.match(/<asset id="/g) || []).length, 2);
assert.ok(fcpxmlOut.includes('src="file:///Volumes/Media/Reel%20A/Shot_A.mov"'));
assert.ok(fcpxmlOut.includes('src="file:///audio/vo_master.wav"'));
assert.ok(!fcpxmlOut.includes("Disabled.mov"));
assert.ok(!fcpxmlOut.includes("Zero.mov"));
// Gap between frame 24 and frame 48
assert.ok(
  fcpxmlOut.includes(
    '<gap name="Gap" offset="24024/24000s" duration="24024/24000s" start="0s" />'
  )
);
// Primary clips & connected audio & escaped marker
assert.ok(
  fcpxmlOut.includes(
    '<asset-clip ref="r2" offset="0s" name="Shot A &amp; 1" start="0s" duration="24024/24000s">'
  )
);
assert.ok(
  fcpxmlOut.includes(
    '<asset-clip ref="r3" lane="-1" offset="0s" name="Narration" ' +
      'start="0s" duration="96096/24000s" />'
  )
);
assert.ok(
  fcpxmlOut.includes(
    '<marker start="12012/24000s" duration="1001/24000s" ' +
      'value="Chapter &lt;1&gt;" note="Check &quot;quote&quot;" />'
  )
);
assert.ok(
  fcpxmlOut.includes(
    '<asset-clip ref="r2" offset="48048/24000s" name="Shot A Reused" ' +
      'start="24024/24000s" duration="48048/24000s" />'
  )
);

// Cycle #57: Clip Label Colors + setClipLabelColor
assert.deepEqual(
  CLIP_LABEL_COLOR_IDS,
  ["default", "blue", "teal", "amber", "rose", "emerald"]
);
assert.equal(CLIP_LABEL_COLORS.default.hex, null);
assert.equal(CLIP_LABEL_COLORS.blue.label, "A-Roll");
assert.equal(CLIP_LABEL_COLORS.teal.label, "B-Roll");
assert.equal(CLIP_LABEL_COLORS.amber.label, "VFX/GFX");
assert.equal(CLIP_LABEL_COLORS.rose.label, "Review");
assert.equal(CLIP_LABEL_COLORS.emerald.label, "Audio");
assert.equal(isValidClipLabelColor("blue"), true);
assert.equal(isValidClipLabelColor("purple"), false);
assert.equal(isValidClipLabelColor("__proto__"), false);
assert.equal(isValidClipLabelColor("constructor"), false);
assert.equal(normalizeClipLabelColor("  TEAL "), "teal");
assert.equal(normalizeClipLabelColor("unknown"), "default");

const labelDocBase = {{
  name: "Label_Test",
  source_format: "drt",
  fps: {{ num: 25, den: 1 }},
  width: 1920,
  height: 1080,
  start_frame: 0,
  tracks: [
    {{
      index: 1,
      kind: "video",
      name: "V1",
      clips: [
        {{
          id: "clip-a",
          name: "A_Roll_01",
          track_index: 1,
          media_type: "video",
          start_frame: 0,
          duration_frames: 100,
          source_in_frame: 0
        }},
        {{
          name: "B_Roll_01",
          track_index: 1,
          media_type: "video",
          start_frame: 100,
          duration_frames: 100,
          source_in_frame: 0
        }}
      ]
    }}
  ],
  markers: []
}};

const lblSetBlue = setClipLabelColor(labelDocBase, "clip-a", "blue");
assert.equal(lblSetBlue.changed, true);
assert.equal(lblSetBlue.clip.label_color, "blue");
assert.equal(labelDocBase.tracks[0].clips[0].label_color, undefined);

const lblRepeat = setClipLabelColor(lblSetBlue.doc, "clip-a", "blue");
assert.equal(lblRepeat.changed, false);
assert.equal(lblRepeat.doc, lblSetBlue.doc);

const lblComposite = setClipLabelColor(lblSetBlue.doc, "video:1:1", "teal");
assert.equal(lblComposite.changed, true);
assert.equal(lblComposite.doc.tracks[0].clips[1].label_color, "teal");
assert.equal(lblComposite.doc.tracks[0].clips[0].label_color, "blue");

const lblResetDefault = setClipLabelColor(lblComposite.doc, "clip-a", "default");
assert.equal(lblResetDefault.changed, true);
assert.equal(lblResetDefault.clip.label_color, "default");

const lblBadColor = setClipLabelColor(labelDocBase, "clip-a", "purple");
assert.equal(lblBadColor.changed, false);
assert.equal(lblBadColor.doc, labelDocBase);

const lblProtoColor = setClipLabelColor(labelDocBase, "clip-a", "__proto__");
assert.equal(lblProtoColor.changed, false);
assert.equal(lblProtoColor.doc, labelDocBase);

const lblBadClip = setClipLabelColor(labelDocBase, "missing-clip", "amber");
assert.equal(lblBadClip.changed, false);
assert.equal(lblBadClip.doc, labelDocBase);

// Timeline Index: filterTimelineClips(doc, {{ query, labelColor }})
assert.deepEqual(filterTimelineClips(null), []);
assert.deepEqual(filterTimelineClips({{ tracks: [] }}), []);

const indexDoc = {{
  name: "Index_Test_25p",
  source_format: "drt",
  fps: {{ num: 25, den: 1 }},
  width: 1920,
  height: 1080,
  start_frame: 0,
  tracks: [
    {{
      index: 1,
      kind: "video",
      name: "V1",
      clips: [
        {{
          id: "v1-open",
          name: "A001_Opening_Wide",
          track_index: 1,
          media_type: "video",
          start_frame: 0,
          duration_frames: 125,
          label_color: "blue"
        }},
        {{
          name: "A002_Studio_Broll",
          track_index: 1,
          media_type: "video",
          start_frame: 125,
          duration_frames: 100,
          label_color: "teal"
        }}
      ]
    }},
    {{
      index: 2,
      kind: "video",
      name: "V2",
      clips: [
        {{
          id: "v2-gfx",
          name: "GFX_LowerThird",
          track_index: 2,
          media_type: "video",
          start_frame: 25,
          duration_frames: 75,
          label_color: "amber"
        }}
      ]
    }},
    {{
      index: 1,
      kind: "audio",
      name: "A1",
      clips: [
        {{
          id: "a1-vo",
          name: "VO_Main_Intro",
          track_index: 1,
          media_type: "audio",
          start_frame: 0,
          duration_frames: 225,
          label_color: "emerald"
        }},
        {{
          id: "a1-rev",
          name: "SFX_Review_Hit",
          track_index: 1,
          media_type: "audio",
          start_frame: 150,
          duration_frames: 50,
          label_color: "rose"
        }},
        {{
          id: "a1-plain",
          name: "Room_Tone_Bed",
          track_index: 1,
          media_type: "audio",
          start_frame: 225,
          duration_frames: 100
        }}
      ]
    }}
  ],
  markers: []
}};

const indexSnapBefore = JSON.stringify(indexDoc);
const allIdx = filterTimelineClips(indexDoc);
assert.equal(allIdx.length, 6);
assert.deepEqual(
  allIdx.map((c) => c.id),
  ["v1-open", "a1-vo", "v2-gfx", "video:1:1", "a1-rev", "a1-plain"]
);
assert.deepEqual(allIdx[2], {{
  id: "v2-gfx",
  trackId: "V2",
  trackKind: "video",
  trackIndex: 2,
  clipIndex: 0,
  label: "GFX_LowerThird",
  labelColor: "amber",
  startFrames: 25,
  durationFrames: 75,
  startTimecode: "00:00:01:00"
}});
assert.equal(allIdx[3].trackId, "V1");
assert.equal(allIdx[3].startTimecode, "00:00:05:00");
assert.equal(allIdx[5].labelColor, "default");

assert.deepEqual(
  filterTimelineClips(indexDoc, {{ query: "  broll " }}).map((c) => c.id),
  ["video:1:1"]
);
assert.deepEqual(
  filterTimelineClips(indexDoc, {{ labelColor: "blue" }}).map((c) => c.label),
  ["A001_Opening_Wide"]
);
assert.deepEqual(
  filterTimelineClips(indexDoc, {{ labelColor: "B-Roll" }}).map((c) => c.id),
  ["video:1:1"]
);
assert.deepEqual(
  filterTimelineClips(indexDoc, {{ labelColor: "VFX/GFX" }}).map((c) => c.id),
  ["v2-gfx"]
);
assert.deepEqual(
  filterTimelineClips(indexDoc, {{ labelColor: "Review" }}).map((c) => c.id),
  ["a1-rev"]
);
assert.deepEqual(
  filterTimelineClips(indexDoc, {{ labelColor: "Audio" }}).map((c) => c.id),
  ["a1-vo"]
);
assert.deepEqual(
  filterTimelineClips(indexDoc, {{ labelColor: "default" }}).map((c) => c.id),
  ["a1-plain"]
);
assert.deepEqual(
  filterTimelineClips(indexDoc, {{ labelColor: "all" }}).length,
  6
);
assert.deepEqual(
  filterTimelineClips(indexDoc, {{ query: "VO", labelColor: "emerald" }}).map((c) => c.id),
  ["a1-vo"]
);
assert.deepEqual(
  filterTimelineClips(indexDoc, {{ query: "VO", labelColor: "blue" }}),
  []
);
assert.deepEqual(filterTimelineClips(indexDoc, {{ labelColor: "purple" }}), []);
assert.deepEqual(filterTimelineClips(indexDoc, {{ labelColor: "__proto__" }}), []);
assert.equal(JSON.stringify(indexDoc), indexSnapBefore);

// Master Bin Smart Bins, Cut Page Assembly, Source Tape, Dual-Timeline Zoom
assert.equal(
  classifyMediaPoolEntry({{ trackKind: "video", trackIndex: 1, label: "A001_Cam" }}),
  "video"
);
assert.equal(
  classifyMediaPoolEntry({{ trackKind: "video", trackIndex: 2, label: "GFX_LowerThird" }}),
  "title"
);
assert.equal(
  classifyMediaPoolEntry({{ trackKind: "audio", trackIndex: 1, label: "VO_Main" }}),
  "audio"
);

const sampleStills = [{{ id: "st-1", label: "COLOR", preset: "Teal" }}];
const poolResAll = filterMediaPoolEntries(indexDoc, {{
  mediaType: "all",
  stills: sampleStills
}});
assert.equal(poolResAll.counts.all, 6);
assert.equal(poolResAll.counts.audio, 3);
assert.equal(poolResAll.counts.stills, 1);
const poolResStills = filterMediaPoolEntries(indexDoc, {{
  mediaType: "stills",
  stills: sampleStills
}});
assert.equal(poolResStills.stillItems.length, 1);

const cutDoc = {{
  name: "Cut_Page_Unit",
  source_format: "drt",
  fps: {{ num: 25, den: 1 }},
  width: 1920,
  height: 1080,
  start_frame: 0,
  tracks: [
    {{
      index: 1,
      kind: "video",
      name: "V1",
      clips: [
        {{
          id: "v1-a",
          name: "Shot_A",
          track_index: 1,
          media_type: "video",
          start_frame: 0,
          duration_frames: 100
        }},
        {{
          id: "v1-b",
          name: "Shot_B",
          track_index: 1,
          media_type: "video",
          start_frame: 100,
          duration_frames: 100
        }}
      ]
    }}
  ],
  markers: []
}};
assert.equal(findNearestEditPointForTrack(cutDoc, "video", 1, 88), 100);
assert.equal(findNearestEditPointForTrack(cutDoc, "video", 1, 20), 0);

const refClip0 = {{ trackKind: "video", trackIndex: 1, clipIndex: 0 }};
const appRes = appendClipToTrackInDocument(cutDoc, refClip0);
assert.equal(appRes.changed, true);
assert.equal(appRes.insertFrame, 200);
assert.equal(appRes.doc.tracks[0].clips.length, 3);
assert.equal(appRes.doc.tracks[0].clips[2].start_frame, 200);

const smartRes = smartInsertClipInDocument(cutDoc, refClip0, 88);
assert.equal(smartRes.changed, true);
assert.equal(smartRes.nearestEditFrame, 100);
assert.equal(smartRes.insertedClip.start_frame, 100);
assert.equal(smartRes.doc.tracks[0].clips[2].start_frame, 200);

const midRes = insertClipAtFrameInDocument(cutDoc, refClip0, 50, {{ ripple: true }});
assert.equal(midRes.changed, true);
assert.equal(midRes.doc.tracks[0].clips.length, 4);
assert.equal(midRes.doc.tracks[0].clips[0].duration_frames, 50);
assert.equal(midRes.doc.tracks[0].clips[1].start_frame, 50);
assert.equal(midRes.doc.tracks[0].clips[2].start_frame, 150);
assert.equal(midRes.doc.tracks[0].clips[3].start_frame, 200);

const tape = buildSourceTapeSegments(filterTimelineClips(cutDoc), 25);
assert.equal(tape.totalFrames, 200);
const tapeHit = resolveSourceTapeFrame(tape, 125);
assert.equal(tapeHit.segment.entry.label, "Shot_B");
assert.equal(tapeHit.timelineFrame, 125);

const vpZoom = computeTimelineZoomViewport(0, 500, 2, 250, null);
assert.equal(vpZoom.visibleSpan, 250);
assert.equal(vpZoom.viewStartFrame, 125);
assert.equal(vpZoom.viewEndFrame, 375);

// DaVinci Resolve Serial Color Node Tree & 3D .cube LUT client unit checks
let colorTree = createDefaultColorNodeTree();
assert.equal(colorTree.nodes.length, 1);
assert.equal(colorTree.selectedNodeId, "node-1");

const parsedCube = parseCubeLutTextClient(
  [
    'TITLE "Test_Warm_2"',
    "LUT_3D_SIZE 2",
    "0 0 0",
    "1 0 0",
    "0 1 0",
    "1 1 0",
    "0 0 0.8",
    "1 0 0.8",
    "0 1 0.8",
    "1 0.85 0.7"
  ].join("\\n"),
  "fallback"
);
assert.equal(parsedCube.dimension, "3D");
assert.equal(parsedCube.size, 2);
assert.equal(parsedCube.entryCount, 8);
const [lr, lg, lb] = applyCubeLutRgbClient(1, 1, 1, parsedCube, 1.0);
assert.ok(Math.abs(lr - 1.0) < 1e-6 && Math.abs(lg - 0.85) < 1e-6 && Math.abs(lb - 0.7) < 1e-6);

colorTree = updateColorNodeInTree(colorTree, "node-1", {{
  label: "Balance",
  grade: {{
    lift: [0, 0, 0],
    gamma: [0, 0, 0],
    gain: [0, 0, 0],
    contrast: 1.1,
    saturation: 1.05,
    temperature: 0
  }}
}});
colorTree = addColorNodeToTree(colorTree, {{ label: "Look LUT", lut: parsedCube }});
assert.equal(colorTree.nodes.length, 2);
assert.equal(colorTree.selectedNodeId, "node-2");
colorTree = moveColorNodeInTree(colorTree, "node-2", -1);
assert.equal(colorTree.nodes[0].id, "node-2");
colorTree = moveColorNodeInTree(colorTree, "node-2", 1);
assert.equal(colorTree.nodes[1].id, "node-2");

const compiledTree = compileColorNodeChainClient(colorTree, "yuv420p");
assert.equal(compiledTree.is_identity, false);
assert.equal(compiledTree.active_node_count, 2);
assert.equal(compiledTree.has_lut_nodes, true);
assert.ok(compiledTree.filtergraph.includes("eq=contrast=1.1000:saturation=1.0500"));

colorTree = toggleColorNodeBypassInTree(colorTree, "node-2");
assert.equal(colorTree.nodes[1].enabled, false);
const [cr1, cg1, cb1] = applyColorNodeChainRgbClient(0.5, 0.5, 0.5, colorTree);
colorTree = toggleColorNodeBypassInTree(colorTree, "node-2");
const [cr2, cg2, cb2] = applyColorNodeChainRgbClient(0.5, 0.5, 0.5, colorTree);
assert.ok(Math.abs(cb1 - cb2) > 0.02);

const bakedCubeTxt = bakeColorNodeChainToCubeTextClient(colorTree, 3, "tree_bake");
assert.ok(bakedCubeTxt.includes("LUT_3D_SIZE 3"));
colorTree = removeColorNodeFromTree(colorTree, "node-2");
assert.equal(colorTree.nodes.length, 1);
assert.equal(removeColorNodeFromTree(colorTree, "node-1").nodes.length, 1);
assert.equal(MAX_COLOR_NODES, 8);

// Cubic-Bezier Transform Keyframe Graph Editor unit tests
assert.ok(Math.abs(evaluateCubicBezier(0.5, 0, 0, 1, 1) - 0.5) < 1e-5);
assert.ok(Math.abs(evaluateCubicBezier(0.5, 0.42, 0, 0.58, 1) - 0.5) < 1e-4);
assert.ok(evaluateCubicBezier(0.5, 0.16, 1.0, 0.3, 1.0) > 0.8);
assert.ok(evaluateCubicBezierDerivative(0.5, 0.42, 0, 0.58, 1) > 1.4);
assert.ok(evaluateCubicBezierDerivative(0.0, 0.42, 0, 0.58, 1) < 0.1);

let kfDoc = doc;
let kfRes = upsertTransformKeyframeInDocument(kfDoc, "video", 1, 0, "zoom_pct", {{
  time_s: 0.0,
  value: 100,
  easing: "ease_in_out",
  bezier: [0.42, 0, 0.58, 1]
}});
assert.equal(kfRes.changed, true);
kfDoc = kfRes.doc;
kfRes = upsertTransformKeyframeInDocument(kfDoc, "video", 1, 0, "zoom_pct", {{
  time_s: 2.0,
  value: 160,
  easing: "linear"
}});
assert.equal(kfRes.changed, true);
kfDoc = kfRes.doc;
const evalMid = evaluateClipTransformAtTime(kfRes.clip, 1.0);
assert.ok(Math.abs(evalMid.zoom_pct - 130.0) < 0.2);

kfRes = updateTransformKeyframeBezierInDocument(
  kfDoc, "video", 1, 0, "zoom_pct", 0, "bezier", [0.16, 1.0, 0.3, 1.0]
);
assert.equal(kfRes.changed, true);
kfDoc = kfRes.doc;
const evalPop = evaluateClipTransformAtTime(kfRes.clip, 1.0);
assert.ok(evalPop.zoom_pct > 145.0);

const curveSamples = sampleTransformCurve(kfRes.clip, "zoom_pct", 2.0, 20);
assert.equal(curveSamples.length, 21);
assert.ok(curveSamples.some((pt) => pt.speed > 20));

const compiledKf = compileTransformFilterClient(kfRes.clip.transform, "yuv420p", 4.0);
assert.equal(compiledKf.is_identity, false);
assert.equal(compiledKf.has_keyframes, true);
assert.equal(compiledKf.keyframe_count, 2);
assert.deepEqual(compiledKf.keyframed_params, ["zoom_pct"]);
assert.ok(compiledKf.filtergraph.includes("eval=frame"));

kfRes = removeTransformKeyframeInDocument(kfDoc, "video", 1, 0, "zoom_pct", 2.0);
assert.equal(kfRes.changed, true);
assert.equal(kfRes.clip.transform.keyframes.zoom_pct.length, 1);
kfRes = clearTransformParamKeyframesInDocument(kfRes.doc, "video", 1, 0, "zoom_pct");
assert.equal(kfRes.changed, true);
assert.equal(kfRes.clip.transform, null);

// Optical Flow & Speed Ramp Curve client unit checks
let rampRes = updateClipRetimeInDocument(doc, "video", 1, 0, {{
  retime_process: "optical_flow",
  retime_ramp_preset: "hero_slowmo"
}});
assert.equal(rampRes.changed, true);
assert.equal(rampRes.clip.retime_process, "optical_flow");
assert.equal(rampRes.clip.retime_ramp_preset, "hero_slowmo");
assert.equal(rampRes.clip.retime_ramp_points.length, 4);

const speedStart = evaluateRetimeSpeedAt(rampRes.clip.retime_ramp_points, 0.0, 1.0);
const speedMid = evaluateRetimeSpeedAt(rampRes.clip.retime_ramp_points, 0.5, 1.0);
assert.ok(Math.abs(speedStart - 1.5) < 1e-4);
assert.ok(Math.abs(speedMid - 0.35) < 1e-4);

const rampSum = computeRetimeRampSummary(rampRes.clip, 4.0);
assert.ok(rampSum.avgSpeed > 0.35 && rampSum.avgSpeed < 1.5);
assert.ok(rampSum.effectiveDurationS > 4.0);

const srcEvalMid = evaluateRetimeSourceOffset(rampRes.clip, 50);
assert.equal(srcEvalMid.isRamp, true);
assert.ok(srcEvalMid.sourceDeltaFrames > 0);

const badgeRamp = formatRetimeBadgeText(
  1.0,
  false,
  "optical_flow",
  rampRes.clip.retime_ramp_points
);
assert.equal(badgeRamp, "RAMP 0.35x-1.5x OF");

const compiledRampClient = compileRetimeFilterClient({{
  speed_rate: 1.0,
  reverse: false,
  retime_process: "optical_flow",
  ramp_preset: "hero_slowmo",
  ramp_points: rampRes.clip.retime_ramp_points,
  clip_duration_s: 4.0,
  fps: "25"
}});
assert.equal(compiledRampClient.is_identity, false);
assert.ok(compiledRampClient.video_filtergraph.includes("setpts='if(lt(T,"));
assert.ok(compiledRampClient.video_filtergraph.includes("minterpolate=fps=25:mi_mode=mci"));
"""
    proc = subprocess.run(
        [node, "--input-type=module"],
        input=script,
        capture_output=True,
        text=True,
        timeout=15,
        check=False,
    )
    assert proc.returncode == 0, f"Node timeline_ops tests failed:\n{proc.stderr}\n{proc.stdout}"


def test_bpm_beat_grid_and_marker_otio_roundtrip(tmp_path: Path) -> None:
    from pydantic import ValidationError

    from taktcut.drp import export_otio, load_timeline
    from taktcut.models import (
        MARKER_COLOR_PRESETS,
        BpmGridConfig,
        RationalFrameRate,
        TimelineClip,
        TimelineDocument,
        TimelineMarker,
        TimelineTrack,
        compute_bpm_beat_frames,
    )

    assert MARKER_COLOR_PRESETS == ("Cyan", "Gold", "Red", "Green")
    default_cfg = BpmGridConfig()
    assert default_cfg.enabled is False
    assert default_cfg.bpm == 128.0
    assert default_cfg.offset_s == 0.0

    with pytest.raises(ValidationError):
        BpmGridConfig(bpm=55.0)
    with pytest.raises(ValidationError):
        BpmGridConfig(bpm=210.0)
    with pytest.raises(ValidationError):
        BpmGridConfig(bpm=float("nan"))

    fps25 = RationalFrameRate(num=25, den=1)
    ticks_125 = compute_bpm_beat_frames(fps25, 0, 60, bpm=125.0, offset_s=0.0)
    assert [t.frame for t in ticks_125] == [0, 12, 24, 36, 48, 60]
    assert ticks_125[0].is_downbeat is True
    assert ticks_125[1].is_downbeat is False
    assert ticks_125[4].is_downbeat is True
    assert ticks_125[4].bar == 2

    ticks_128 = compute_bpm_beat_frames(fps25, 0, 50, bpm=128.0, offset_s=0.0)
    assert [t.frame for t in ticks_128] == [0, 12, 23, 35, 47]
    ticks_off = compute_bpm_beat_frames(fps25, 0, 50, bpm=125.0, offset_s=0.2)
    assert [t.frame for t in ticks_off] == [5, 17, 29, 41]
    assert compute_bpm_beat_frames(fps25, 20, 10, bpm=128.0) == []

    doc = TimelineDocument(
        name="Beat_Sync_Markers_Test",
        source_format="otio",
        fps=fps25,
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
                    )
                ],
            )
        ],
        markers=[
            TimelineMarker(name="Intro Beat", frame=0, color="Cyan"),
            TimelineMarker(name="Chorus Cue", frame=24, color="Gold"),
            TimelineMarker(name="Flash Hit", frame=48, color="Red"),
            TimelineMarker(name="Outro Tag", frame=72, color="Green"),
        ],
    )
    otio_path = tmp_path / "markers_export.otio"
    export_otio(doc, otio_path)
    reloaded = load_timeline(otio_path)
    assert [(m.name, m.frame, m.color.upper()) for m in reloaded.markers] == [
        ("Intro Beat", 0, "CYAN"),
        ("Chorus Cue", 24, "GOLD"),
        ("Flash Hit", 48, "RED"),
        ("Outro Tag", 72, "GREEN"),
    ]


def test_ui_transitions_endpoints(ui_server: tuple[str, Path]) -> None:
    base_url, _ = ui_server

    p_status, _, p_raw = _http_call(f"{base_url}/api/transitions/presets")
    assert p_status == 200
    presets_data = json.loads(p_raw.decode("utf-8"))
    assert [p["id"] for p in presets_data["presets"]] == [
        "fade",
        "fadeblack",
        "wipeleft",
        "slideright",
        "zoomin",
    ]
    assert presets_data["bounds"]["duration_s"] == {"min": 0.1, "max": 2.0, "default": 0.5}

    c_status, _, c_raw = _http_call(
        f"{base_url}/api/transitions/compile",
        method="POST",
        payload={
            "transition": {
                "preset": "slideright",
                "duration_s": 0.75,
                "include_audio": True,
            },
            "clip_a_duration_s": 5.0,
            "clip_b_duration_s": 4.0,
        },
    )
    assert c_status == 200
    compiled = json.loads(c_raw.decode("utf-8"))
    assert compiled["offset_s"] == 4.25
    assert (
        "xfade=transition=slideright:duration=0.750:offset=4.250"
        in compiled["video_filtergraph"]
    )
    assert "acrossfade=d=0.750:c1=tri:c2=tri" in compiled["audio_filtergraph"]

    bad_preset_status, _, _ = _http_call(
        f"{base_url}/api/transitions/compile",
        method="POST",
        payload={"preset": "fade;evil", "duration_s": 0.5, "clip_a_duration_s": 3.0},
    )
    assert bad_preset_status == 400

    bad_dur_status, _, _ = _http_call(
        f"{base_url}/api/transitions/compile",
        method="POST",
        payload={"preset": "fade", "duration_s": 2.5, "clip_a_duration_s": 5.0},
    )
    assert bad_dur_status == 400


def test_ui_titles_endpoints_and_render_integration(ui_server: tuple[str, Path]) -> None:
    base_url, _ = ui_server

    p_status, _, p_raw = _http_call(f"{base_url}/api/titles/presets")
    assert p_status == 200
    presets_data = json.loads(p_raw.decode("utf-8"))
    assert [p["id"] for p in presets_data["presets"]] == [
        "broadcast_lower_third",
        "center_title_card",
        "minimal_subtitle",
    ]
    assert presets_data["positions"] == ["bottom-left", "center", "bottom-center"]

    c_status, _, c_raw = _http_call(
        f"{base_url}/api/titles/compile",
        method="POST",
        payload={
            "title_overlay": {
                "preset_id": "broadcast_lower_third",
                "title": "Test: 'Quote' \\ 100%\nLine2",
                "subtitle": "Sub: Unit",
                "position": "bottom-left",
                "accent_color": "#e68442",
                "start_s": 0.5,
                "end_s": 4.5,
            }
        },
    )
    assert c_status == 200
    compiled = json.loads(c_raw.decode("utf-8"))
    assert compiled["is_active"] is True
    assert "drawbox=" in compiled["filtergraph"]
    assert "drawtext=" in compiled["filtergraph"]
    assert "expansion=none" in compiled["filtergraph"]
    assert "\n" not in compiled["filtergraph"]

    bad_status, _, _ = _http_call(
        f"{base_url}/api/titles/compile",
        method="POST",
        payload={
            "title_overlay": {
                "title": "Broken",
                "start_s": 5.0,
                "end_s": 2.0,
            }
        },
    )
    assert bad_status == 400

    r_status, _, r_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": "inputs/in.mp4",
            "output_path": "renders/out.mp4",
            "profile": "web_h264",
            "prefer_hw": False,
            "execute": False,
            "title_overlay": {
                "preset_id": "center_title_card",
                "title": "TITLE CARD",
                "subtitle": "REC.709",
                "position": "center",
                "accent_color": "#689cff",
                "start_s": 0.0,
                "end_s": 3.0,
            },
        },
    )
    assert r_status == 200
    plan_data = json.loads(r_raw.decode("utf-8"))
    vf = plan_data["plan"]["video_filter"] or ""
    assert "drawbox=" in vf
    assert "drawtext=" in vf


def test_ui_subtitles_endpoints_and_render_integration(ui_server: tuple[str, Path]) -> None:
    base_url, _ = ui_server

    s_status, _, s_raw = _http_call(f"{base_url}/api/subtitles/styles")
    assert s_status == 200
    styles_data = json.loads(s_raw.decode("utf-8"))
    assert [s["id"] for s in styles_data["styles"]] == [
        "clean_white",
        "yellow_broadcast",
        "boxed_social",
    ]

    p_status, _, p_raw = _http_call(
        f"{base_url}/api/subtitles/parse",
        method="POST",
        payload={
            "format": "auto",
            "content": (
                "1\n"
                "00:00:00,500 --> 00:00:02,500\n"
                "<script>alert(1)</script><b>First</b> cue\n\n"
                "2\n"
                "00:00:03,000 --> 00:00:05,000\n"
                "Second cue\n"
            ),
        },
    )
    assert p_status == 200
    parsed = json.loads(p_raw.decode("utf-8"))
    assert parsed["format"] == "srt"
    assert parsed["cue_count"] == 2
    assert parsed["cues"][0]["text"] == "First cue"

    bad_parse, _, _ = _http_call(
        f"{base_url}/api/subtitles/parse",
        method="POST",
        payload={"format": "srt", "content": "invalid srt"},
    )
    assert bad_parse == 400

    e_status, _, e_raw = _http_call(
        f"{base_url}/api/subtitles/export",
        method="POST",
        payload={"format": "vtt", "cues": parsed["cues"], "out_path": "captions/master.vtt"},
    )
    assert e_status == 200
    exported = json.loads(e_raw.decode("utf-8"))
    assert exported["format"] == "vtt"
    assert exported["saved_path"] == "captions/master.vtt"
    assert exported["content"].startswith("WEBVTT\n\n")

    c_status, _, c_raw = _http_call(
        f"{base_url}/api/subtitles/compile",
        method="POST",
        payload={
            "subtitle_track": {
                "cues": parsed["cues"],
                "style": "boxed_social",
                "font_size": 38,
                "enabled": True,
            }
        },
    )
    assert c_status == 200
    compiled = json.loads(c_raw.decode("utf-8"))
    assert compiled["is_active"] is True
    assert "drawtext=" in compiled["filtergraph"]
    assert "boxcolor=0x141416@0.86" in compiled["filtergraph"]

    r_status, _, r_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": "inputs/in.mp4",
            "output_path": "renders/out_sub.mp4",
            "profile": "web_h264",
            "prefer_hw": False,
            "execute": False,
            "subtitle_track": {
                "cues": parsed["cues"],
                "style": "yellow_broadcast",
                "font_size": 34,
                "enabled": True,
            },
        },
    )
    assert r_status == 200
    plan_data = json.loads(r_raw.decode("utf-8"))
    vf = plan_data["plan"]["video_filter"] or ""
    assert "drawtext=" in vf
    assert "fontcolor=0xffe047" in vf


def test_ui_chroma_key_endpoints_and_render_integration(ui_server: tuple[str, Path]) -> None:
    base_url, _ = ui_server

    p_status, _, p_raw = _http_call(f"{base_url}/api/fx/chroma-key/presets")
    assert p_status == 200
    presets = json.loads(p_raw.decode("utf-8"))
    assert [p["id"] for p in presets["presets"]] == ["studio_green", "chroma_blue", "custom"]

    c_status, _, c_raw = _http_call(
        f"{base_url}/api/fx/chroma-key/compile",
        method="POST",
        payload={
            "preset": "studio_green",
            "key_color": "#00B140",
            "similarity": 0.22,
            "blend": 0.10,
            "despill": True,
            "despill_type": "green",
        },
    )
    assert c_status == 200
    c_data = json.loads(c_raw.decode("utf-8"))
    assert c_data["filtergraph"] == (
        "format=rgba,colorkey=color=0x00b140:similarity=0.2200:blend=0.1000,despill=type=green"
    )

    r_status, _, r_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/keyed_out.mp4",
            "profile": "web_h264",
            "prefer_hw": False,
            "execute": False,
            "chroma_key": {
                "preset": "chroma_blue",
                "key_color": "#0047BB",
                "similarity": 0.20,
                "blend": 0.08,
                "despill": True,
                "despill_type": "blue",
                "enabled": True,
            },
        },
    )
    assert r_status == 200
    plan_data = json.loads(r_raw.decode("utf-8"))
    vf = plan_data["plan"]["video_filter"] or ""
    assert "colorkey=color=0x0047bb:similarity=0.2000:blend=0.0800" in vf
    assert "despill=type=blue" in vf

    bad_status, _, _ = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/bad_key.mp4",
            "chroma_key": {"key_color": "#00b140;echo pwn"},
        },
    )
    assert bad_status == 400


def test_ui_responsive_playwright_viewports(ui_server: tuple[str, Path]) -> None:
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        pytest.skip("Playwright not installed in this environment")

    base_url, _ = ui_server
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            for width, height in ((375, 812), (390, 844), (768, 1024), (1440, 900)):
                ctx = browser.new_context(viewport={"width": width, "height": height})
                page = ctx.new_page()
                errors: list[str] = []
                bad_http: list[str] = []

                def on_console(msg: Any, sink: list[str] = errors) -> None:
                    if msg.type == "error":
                        sink.append(msg.text)

                def on_pageerror(err: Any, sink: list[str] = errors) -> None:
                    sink.append(str(err))

                def on_response(resp_obj: Any, sink: list[str] = bad_http) -> None:
                    if resp_obj.status >= 400:
                        sink.append(f"{resp_obj.status} {resp_obj.url}")

                page.on("console", on_console)
                page.on("pageerror", on_pageerror)
                page.on("response", on_response)
                resp = page.goto(f"{base_url}/", wait_until="networkidle", timeout=15000)
                assert resp and resp.status == 200
                overflow = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert overflow <= 0, f"Horizontal overflow at {width}x{height}: {overflow}px"
                pool_cards = page.locator("#media-pool-list .media-pool-card")
                page.wait_for_selector("#media-pool-list .media-pool-card")
                assert pool_cards.count() >= 1
                first_pool_card = pool_cards.first
                assert first_pool_card.locator(".media-pool-visual").is_visible() is True
                assert first_pool_card.locator(".media-pool-dur").is_visible() is True
                assert first_pool_card.locator(".media-pool-meta-tc").is_visible() is True
                if width <= 820:
                    pool_box = first_pool_card.bounding_box()
                    assert pool_box is not None and pool_box["height"] >= 44
                    pill_box = page.locator(
                        '#media-pool-type-filter [data-pool-type="video"]'
                    ).bounding_box()
                    assert pill_box is not None and pill_box["height"] >= 44
                    append_box = page.locator("#btn-pool-append").bounding_box()
                    assert append_box is not None and append_box["height"] >= 44
                first_pool_card.dblclick()
                page.wait_for_selector("#media-pool-info-dialog[open]")
                pool_kv_text = page.locator("#media-pool-info-kv").text_content() or ""
                assert "V1" in pool_kv_text or "A1" in pool_kv_text
                page.locator("#btn-close-media-pool-info").click()
                page.wait_for_function(
                    "() => !document.getElementById('media-pool-info-dialog').open"
                )
                # Smart Bin type filter & Source Tape check
                page.locator('#media-pool-type-filter [data-pool-type="audio"]').click()
                assert page.locator("#media-pool-list .media-pool-card").count() >= 1
                assert page.locator('#media-pool-list .media-pool-card.is-video').count() == 0
                page.locator('#media-pool-type-filter [data-pool-type="all"]').click()
                page.locator("#btn-media-pool-source-tape").click()
                assert page.locator("#media-pool-source-tape").is_visible() is True
                page.locator("#btn-media-pool-source-tape").click()
                assert page.locator("#media-pool-source-tape").is_visible() is False
                page.locator("#playhead-slider").fill("25")
                page.locator("#playhead-slider").dispatch_event("input")
                page.locator("#playhead-slider").evaluate("el => el.blur()")
                assert page.locator("#program-frame-counter").text_content() == "25f / 500f"
                if width == 1440:
                    # Cut Page Append & Undo check (preserves playhead 25f, extends timeline)
                    page.locator("#btn-pool-append").click()
                    assert page.locator("#program-frame-counter").text_content() == "25f / 625f"
                    page.locator("#btn-timeline-undo").click()
                    assert page.locator("#program-frame-counter").text_content() == "25f / 500f"
                    # Dual-Timeline Overview Canvas visible
                    ov_box = page.locator("#timeline-overview-canvas").bounding_box()
                    assert ov_box is not None and ov_box["height"] >= 24
                    page.keyboard.press("ArrowRight")
                    assert page.locator("#program-frame-counter").text_content() == "26f / 500f"
                    page.keyboard.press("ArrowLeft")
                    assert page.locator("#program-frame-counter").text_content() == "25f / 500f"
                    page.keyboard.press("l")
                    assert page.locator("#transport-state-pill").text_content() == "PLAY 1x"
                    page.keyboard.press("l")
                    assert page.locator("#transport-state-pill").text_content() == "PLAY 2x"
                    page.keyboard.press("k")
                    assert page.locator("#transport-state-pill").text_content() == "STOP"
                    page.keyboard.press("j")
                    assert page.locator("#transport-state-pill").text_content() == "REV 1x"
                    page.keyboard.press("Space")
                    assert page.locator("#transport-state-pill").text_content() == "STOP"
                    page.locator("#timeline-name-filter").focus()
                    page.keyboard.press("l")
                    page.keyboard.press("Space")
                    assert page.locator("#transport-state-pill").text_content() == "STOP"

                    tl_box = page.locator("#timeline-canvas").bounding_box()
                    assert tl_box is not None
                    start_x = tl_box["x"] + 220
                    end_x = tl_box["x"] + tl_box["width"] * 0.72
                    ruler_y = tl_box["y"] + 24
                    page.mouse.move(start_x, ruler_y)
                    page.mouse.down()
                    frame_down = page.locator("#program-frame-counter").text_content()
                    page.mouse.move(end_x, ruler_y, steps=8)
                    frame_mid = page.locator("#program-frame-counter").text_content()
                    page.mouse.up()
                    assert frame_down != frame_mid
                    assert page.locator("#program-tc").text_content() != "00:00:00:00"

                    # Verify Clip Label Color selector, badge, and undo/redo
                    teal_pill = page.locator(
                        '#clip-label-color-group [data-clip-label-color="teal"]'
                    )
                    teal_pill.click()
                    assert teal_pill.get_attribute("aria-pressed") == "true"
                    assert page.locator("#clip-label-color-badge").text_content() == "B-Roll"
                    sel_detail = (
                        page.locator("#timeline-selection-detail").text_content() or ""
                    )
                    assert "B-Roll" in sel_detail
                    page.locator("#btn-timeline-undo").click()
                    assert page.locator("#clip-label-color-badge").text_content() == "Default"
                    page.locator("#btn-timeline-redo").click()
                    assert page.locator("#clip-label-color-badge").text_content() == "B-Roll"

                    # Verify Clip Audio Gain / Fade Controls & Track Mute/Solo Mixer
                    page.locator('[data-fade-quick="in"][data-fade-val="0.5"]').click()
                    page.locator('[data-fade-quick="out"][data-fade-val="1"]').click()
                    assert page.locator("#clip-fade-badge").text_content() == "IN 0.5s | OUT 1.0s"
                    fade_fg = page.locator("#clip-fade-fg-preview").text_content() or ""
                    assert "fade=t=in:st=0.000:d=0.500" in fade_fg
                    assert "fade=t=out:" in fade_fg
                    assert "afade=t=in:st=0.000:d=0.500" in fade_fg
                    assert "afade=t=out:" in fade_fg
                    page.locator("#btn-clip-fade-reset-all").click()
                    assert page.locator("#clip-fade-badge").text_content() == "OFF"

                    page.locator("#clip-audio-gain-num").fill("-6.0")
                    page.locator("#clip-audio-gain-num").press("Enter")
                    page.locator("#clip-fade-in-num").fill("1.25")
                    page.locator("#clip-fade-in-num").press("Enter")
                    page.locator("#clip-fade-out-num").fill("0.75")
                    page.locator("#clip-fade-out-num").press("Enter")
                    af_preview = page.locator("#clip-audio-af-preview").text_content() or ""
                    assert "volume=-6.00dB" in af_preview
                    assert "afade=t=in:st=0.000:d=1.250" in af_preview
                    assert "afade=t=out:" in af_preview

                    page.locator('[data-track-mute="V1"]').click()
                    assert page.locator("#track-mixer-summary").text_content() == "1 MUTED"
                    muted_af = page.locator("#clip-audio-af-preview").text_content() or ""
                    assert "volume=0" in muted_af
                    page.locator('[data-track-mute="V1"]').click()
                    assert page.locator("#track-mixer-summary").text_content() == "ALL ACTIVE"

                    page.locator('[data-track-solo="A2"]').click()
                    assert page.locator("#track-mixer-summary").text_content() == "SOLO ACTIVE"
                    page.locator('[data-track-solo="A2"]').click()
                    assert page.locator("#track-mixer-summary").text_content() == "ALL ACTIVE"

                    # Verify Fairlight Track Mixer Strip (Fader, Pan, Arm R, M1 DIM/ISO & LUFS)
                    assert page.locator('#track-mixer-strip [data-strip-code="A1"]').count() == 1
                    assert page.locator('#track-mixer-strip [data-strip-code="M1"]').count() == 1
                    page.locator('[data-track-arm="A1"]').click()
                    assert (
                        page.locator('[data-track-arm="A1"]').get_attribute("aria-pressed")
                        == "true"
                    )
                    page.locator('[data-track-fader="A1"]').fill("-6")
                    page.locator('[data-track-fader="A1"]').dispatch_event("input")
                    page.locator('[data-track-fader="A1"]').dispatch_event("change")
                    assert page.locator('[data-track-db="A1"]').text_content() == "-6.0"
                    page.locator('[data-track-pan="A1"]').fill("-0.5")
                    page.locator('[data-track-pan="A1"]').dispatch_event("input")
                    page.locator('[data-track-pan="A1"]').dispatch_event("change")
                    assert page.locator('[data-track-pan-label="A1"]').text_content() == "L50"
                    page.locator('[data-master-dim="M1"]').click()
                    page.locator("#btn-fairlight-voice-iso").click()
                    assert (
                        page.locator("#btn-fairlight-voice-iso").get_attribute("aria-pressed")
                        == "true"
                    )
                    mixer_af = page.locator("#fairlight-mixer-af-preview").text_content() or ""
                    assert "volume=-26.00dB" in mixer_af
                    assert "pan=stereo|c0=1.000*c0|c1=0.500*c1" in mixer_af
                    assert "highpass=f=85" in mixer_af
                    assert page.locator("#timeline-vu-tp-badge").is_visible() is True
                    assert page.locator("#timeline-vu-lufs-m").is_visible() is True
                    assert page.locator("#timeline-vu-lufs-i").is_visible() is True
                    page.locator("#btn-mixer-reset").click()
                    assert page.locator('[data-track-db="A1"]').text_content() == "+0.0"
                    assert page.locator('[data-track-pan-label="A1"]').text_content() == "C"
                    assert (
                        page.locator("#btn-fairlight-voice-iso").get_attribute("aria-pressed")
                        == "false"
                    )
                    tl_mon_box = page.locator("#timeline-program-canvas").bounding_box()
                    assert tl_mon_box is not None and tl_mon_box["y"] + tl_mon_box["height"] <= 900

                    # Verify Clip Speed / Retime Inspector presets & Reverse toggle
                    page.locator('[data-retime-preset="2.0"]').click()
                    rt_badge = page.locator("#clip-retime-badge").text_content() or ""
                    assert "setpts=0.500000*PTS" in rt_badge
                    assert "atempo=2.0000" in rt_badge
                    page.locator("#btn-clip-retime-reverse").click()
                    rt_badge_rev = page.locator("#clip-retime-badge").text_content() or ""
                    assert "reverse" in rt_badge_rev
                    assert "areverse" in rt_badge_rev
                    page.locator("#btn-clip-retime-reset").click()
                    assert page.locator("#clip-retime-badge").text_content() == "1.0x NORMAL"

                    # Verify Transform Keyframe Graph Editor (Value/Speed + Bezier Presets)
                    assert page.locator("#transform-graph-editor").is_visible() is True
                    assert page.locator("#transform-graph-canvas").is_visible() is True
                    page.locator("#timeline-index-list .timeline-index-row").first.click()
                    page.locator("#btn-clip-transform-zoom-kf").click()
                    assert "1/1" in (page.locator("#transform-kf-readout").text_content() or "")
                    prog_kf0 = page.evaluate(
                        "() => document.getElementById('timeline-program-canvas').toDataURL()"
                    )
                    for _ in range(12):
                        page.locator("#btn-tc-next").click()
                    page.locator("#clip-transform-zoom-num").fill("160")
                    page.locator("#clip-transform-zoom-num").press("Enter")
                    assert "2KF" in (page.locator("#clip-transform-badge").text_content() or "")
                    prog_kf1 = page.evaluate(
                        "() => document.getElementById('timeline-program-canvas').toDataURL()"
                    )
                    assert prog_kf1 != prog_kf0
                    page.locator("#btn-tf-kf-prev").click()
                    page.locator('[data-tf-bezier-preset="snap_pop"]').click()
                    assert page.locator("#tf-bezier-x1").input_value() == "0.16"
                    page.locator("#btn-tf-graph-speed").click()
                    assert (
                        page.locator("#btn-tf-graph-speed").get_attribute("aria-pressed")
                        == "true"
                    )
                    page.locator("#btn-tf-graph-value").click()
                    tl_mon_box_kf = page.locator("#timeline-program-canvas").bounding_box()
                    assert tl_mon_box_kf is not None
                    assert tl_mon_box_kf["y"] + tl_mon_box_kf["height"] <= 900
                    page.locator("#btn-clip-transform-reset-all").click()
                    assert page.locator("#clip-transform-badge").text_content() == "100% | 0,0"

                    # Verify Cut Transition Selector & Preview Cut scrub
                    page.locator("#clip-transition-preset").select_option("fadeblack")
                    page.locator("#clip-transition-dur-num").fill("0.90")
                    page.locator("#clip-transition-dur-num").press("Enter")
                    tr_badge = page.locator("#clip-transition-badge").text_content() or ""
                    assert "Dip to Black 0.90s" in tr_badge
                    tr_fg = page.locator("#clip-transition-fg-preview").text_content() or ""
                    assert "xfade=transition=fadeblack:duration=0.900" in tr_fg
                    assert "acrossfade=d=0.900" in tr_fg
                    page.locator("#btn-clip-transition-preview").click()
                    assert page.locator("#program-frame-counter").text_content() == "125f / 500f"

                    # Verify Timeline Markers (M / + Marker, edit label, jump, delete)
                    assert page.locator("#timeline-marker-count").text_content() == "3 MKR"
                    page.keyboard.press("m")
                    assert page.locator("#timeline-marker-count").text_content() == "4 MKR"
                    page.wait_for_selector("#timeline-marker-inspector:not(.is-hidden)")
                    page.locator("#marker-label-input").fill("Chorus Hit")
                    page.locator("#marker-label-input").press("Enter")
                    page.locator('[data-marker-edit-color="Gold"]').click()
                    sel_text = page.locator("#timeline-selection-detail").text_content() or ""
                    assert "Chorus Hit" in sel_text
                    assert "Gold" in sel_text

                    page.locator("#btn-tc-start").click()
                    assert page.locator("#program-frame-counter").text_content() == "0f / 500f"
                    page.locator('[data-marker-new-color="Red"]').click()
                    page.locator("#btn-timeline-add-marker").click()
                    assert page.locator("#timeline-marker-count").text_content() == "5 MKR"
                    # Jump to marker at frame 125 (Chorus Hit)
                    page.locator('[data-marker-jump]').nth(2).click()
                    assert page.locator("#program-frame-counter").text_content() == "125f / 500f"
                    # Delete dropped marker at index 0
                    page.locator('[data-marker-delete]').first.click()
                    assert page.locator("#timeline-marker-count").text_content() == "4 MKR"

                    # Verify BPM Beat Grid toggle and BPM/offset controls
                    page.locator("#btn-bpm-grid").click()
                    assert page.locator("#btn-bpm-grid").get_attribute("aria-pressed") == "true"
                    assert "128 BPM" in (page.locator("#timeline-tool-badge").text_content() or "")
                    page.locator("#bpm-grid-bpm").fill("140")
                    page.locator("#bpm-grid-bpm").press("Enter")
                    assert "140 BPM" in (page.locator("#timeline-tool-badge").text_content() or "")
                    page.locator("#bpm-grid-offset").fill("0.25")
                    page.locator("#bpm-grid-offset").press("Enter")

                    # Verify Timeline Index search, color filter, selection, and i18n
                    assert page.locator("#timeline-index-count").text_content() == "9 / 9"
                    page.locator(
                        '#timeline-index-color-filter [data-index-color="teal"]'
                    ).click()
                    assert page.locator("#timeline-index-count").text_content() == "1 / 9"
                    page.locator("#btn-timeline-index-clear").click()
                    assert page.locator("#timeline-index-count").text_content() == "9 / 9"

                    page.locator("#timeline-index-search").fill("GFX")
                    assert page.locator("#timeline-index-count").text_content() == "1 / 9"
                    idx_row = page.locator("#timeline-index-list .timeline-index-row").first
                    assert "GFX_LowerThird_Main" in (idx_row.text_content() or "")
                    idx_row.click()
                    assert page.locator("#program-frame-counter").text_content() == "25f / 500f"
                    assert page.locator("#program-tc").text_content() == "00:00:01:00"
                    assert "GFX_LowerThird_Main" in (
                        page.locator("#timeline-selection-detail").text_content() or ""
                    )

                    page.locator("#timeline-index-search").fill("NO_MATCH_CLIP")
                    assert page.locator("#timeline-index-count").text_content() == "0 / 9"
                    page.locator("#lang-fr").click()
                    assert (
                        page.locator("#timeline-index-heading").text_content()
                        == "Index Timeline"
                    )
                    assert (
                        page.locator("#timeline-index-list .timeline-index-empty").text_content()
                        == "Aucun plan correspondant"
                    )
                    page.locator("#lang-en").click()
                    page.locator("#btn-timeline-index-clear").click()
                    assert page.locator("#timeline-index-count").text_content() == "9 / 9"

                    # Verify Optical Flow & Speed Ramp Curve Editor in Clip Retime Inspector
                    page.locator("#timeline-index-list .timeline-index-row").first.click()
                    ramp_canvas_box = page.locator("#clip-retime-ramp-canvas").bounding_box()
                    assert ramp_canvas_box is not None and ramp_canvas_box["width"] > 120
                    assert ramp_canvas_box["height"] >= 80
                    page.locator('[data-retime-ramp-preset="hero_slowmo"]').click()
                    page.locator("#clip-retime-process").select_option("optical_flow")
                    page.locator("#btn-retime-point-add").click()
                    rt_badge_text = page.locator("#clip-retime-badge").text_content() or ""
                    assert "if(lt(T," in rt_badge_text
                    assert "minterpolate=fps=" in rt_badge_text
                    assert "mi_mode=mci" in rt_badge_text
                    page.locator("#btn-clip-retime-reset").click()
                    reset_rt_badge = page.locator("#clip-retime-badge").text_content() or ""
                    assert reset_rt_badge == "1.0x NORMAL"

                if width == 375:
                    pill_box = page.locator(
                        '#clip-label-color-group [data-clip-label-color="blue"]'
                    ).bounding_box()
                    assert pill_box is not None and pill_box["height"] >= 44, (
                        f"Expected clip label pill >= 44px on mobile, got {pill_box}"
                    )
                    for idx_selector in (
                        "#timeline-index-search",
                        "#btn-timeline-index-clear",
                        '#timeline-index-color-filter [data-index-color="blue"]',
                        "#timeline-index-list .timeline-index-row",
                        '[data-fade-quick="in"][data-fade-val="0.5"]',
                        "#btn-clip-fade-reset-all",
                        "#btn-mixer-reset",
                        "#btn-fairlight-voice-iso",
                        '[data-track-mute="A1"]',
                        '[data-track-arm="A1"]',
                        '[data-master-iso="M1"]',
                        '[data-track-fader="A1"]',
                        '[data-track-pan="A1"]',
                        "#btn-clip-transform-zoom-kf",
                        "#btn-tf-graph-value",
                        "#btn-tf-graph-speed",
                        "#btn-tf-kf-prev",
                        "#btn-tf-kf-toggle",
                        "#btn-tf-kf-next",
                        "#btn-tf-kf-clear",
                        '[data-tf-bezier-preset="ease_in_out"]',
                        "#clip-retime-process",
                        '[data-retime-ramp-preset="hero_slowmo"]',
                        "#btn-retime-point-add",
                        "#btn-retime-point-del",
                        "#btn-retime-ramp-reset",
                    ):
                        box = page.locator(idx_selector).first.bounding_box()
                        assert box is not None and box["height"] >= 44, (
                            f"Expected {idx_selector} >= 44px on mobile, got {box}"
                        )
                    page.locator("#btn-bpm-grid").click()
                    page.locator("#btn-timeline-add-marker").click()
                    mobile_overflow = page.evaluate(
                        "() => document.documentElement.scrollWidth - window.innerWidth"
                    )
                    assert mobile_overflow <= 0, (
                        f"Mobile overflow with BPM grid at {width}x{height}: {mobile_overflow}px"
                    )

                # Verify Color Grading Panel responsiveness and 4 presets at all viewports
                page.locator("#tab-color").click()
                page.wait_for_selector("#panel-color:not(.is-hidden)")
                color_overflow = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert color_overflow <= 0, (
                    f"Color page horizontal overflow at {width}x{height}: {color_overflow}px"
                )
                if width == 1440:
                    for preset_id, preset_label, expected_sat in (
                        ("teal_orange", "Teal & Orange", "1.18"),
                        ("film_warm", "Film Warm", "1.10"),
                        ("noir_bw", "Noir B&W", "0.00"),
                        ("rec709_clean", "Rec.709 Clean", "1.00"),
                    ):
                        page.locator(f'[data-grade-preset="{preset_id}"]').click()
                        assert page.locator("#color-preset-badge").text_content() == preset_label
                        assert page.locator("#grade-saturation-num").input_value() == expected_sat

                    # Verify Color Split-Screen Wipe toggle (W), slider (0..100%),
                    # divider drag, and Before/After pixels
                    assert (
                        page.locator("#btn-color-split-wipe").get_attribute("aria-pressed")
                        == "true"
                    )
                    assert page.locator("#cdl-wipe-label").text_content() == "50%"
                    page.locator('[data-grade-preset="noir_bw"]').click()
                    color_split_pixels = page.evaluate(
                        """() => {
                            const c = document.getElementById('color-preview-canvas');
                            const ctx = c.getContext('2d');
                            const y = Math.floor(c.height * 0.22);
                            const lp = ctx.getImageData(Math.floor(c.width * 0.25), y, 1, 1).data;
                            const rp = ctx.getImageData(Math.floor(c.width * 0.75), y, 1, 1).data;
                            const maxDiffL = Math.max(
                                Math.abs(lp[0] - lp[1]),
                                Math.abs(lp[1] - lp[2])
                            );
                            const grayR = Math.abs(rp[0] - rp[1]) <= 2
                                && Math.abs(rp[1] - rp[2]) <= 2;
                            return {
                                leftColored: maxDiffL > 20,
                                rightGray: grayR
                            };
                        }"""
                    )
                    assert color_split_pixels["leftColored"] is True
                    assert color_split_pixels["rightGray"] is True

                    # Pointer drag directly on #color-preview-canvas divider line (50% -> ~75%)
                    color_box = page.locator("#color-preview-canvas").bounding_box()
                    assert color_box is not None
                    div_x = color_box["x"] + color_box["width"] * 0.5
                    div_y = color_box["y"] + color_box["height"] * 0.5
                    page.mouse.move(div_x, div_y)
                    page.mouse.down()
                    page.mouse.move(color_box["x"] + color_box["width"] * 0.75, div_y, steps=4)
                    page.mouse.up()
                    wipe_txt = page.locator("#cdl-wipe-label").text_content() or "0%"
                    dragged_pct = int(wipe_txt.rstrip("%"))
                    assert 70 <= dragged_pct <= 80

                    # W shortcut toggles Color Split Wipe OFF and back ON
                    page.keyboard.press("w")
                    assert (
                        page.locator("#btn-color-split-wipe").get_attribute("aria-pressed")
                        == "false"
                    )
                    page.keyboard.press("w")
                    assert (
                        page.locator("#btn-color-split-wipe").get_attribute("aria-pressed")
                        == "true"
                    )

                    page.locator('[data-grade-preset="teal_orange"]').click()
                    page.wait_for_function(
                        "() => document.getElementById('color-compile-badge').textContent"
                        " === 'GRADED' && (document.getElementById('color-filtergraph-output')"
                        ".textContent || '').includes('eq=contrast=1.1400:saturation=1.1800')"
                    )
                    fg_text = page.locator("#color-filtergraph-output").text_content() or ""
                    assert "colorbalance=" in fg_text
                    assert "eq=contrast=1.1400:saturation=1.1800" in fg_text

                    # Verify DaVinci Gallery Still Grab (Color Monitor, no wipe line)
                    page.locator('[data-grade-preset="noir_bw"]').click()
                    assert page.locator("#color-stills-gallery .still-card").count() == 0
                    page.locator("#btn-color-grab-still").click()
                    assert page.locator("#color-stills-gallery .still-card").count() == 1
                    # Grabbed PNG must be clean Noir B&W on both left & right halves
                    clean_still_check = page.evaluate(
                        """() => new Promise((resolve) => {
                            const img = document.querySelector(
                                '#color-stills-gallery .still-thumb'
                            );
                            const src = img ? img.getAttribute('src') : '';
                            if (!src || !src.startsWith('data:image/png;base64,')) {
                                resolve({ valid: false });
                                return;
                            }
                            const probe = new Image();
                            probe.onload = () => {
                                const off = document.createElement('canvas');
                                off.width = probe.naturalWidth;
                                off.height = probe.naturalHeight;
                                const ctx = off.getContext('2d');
                                ctx.drawImage(probe, 0, 0);
                                const y = Math.floor(off.height * 0.22);
                                const lx = Math.floor(off.width * 0.25);
                                const rx = Math.floor(off.width * 0.75);
                                const lp = ctx.getImageData(lx, y, 1, 1).data;
                                const rp = ctx.getImageData(rx, y, 1, 1).data;
                                const leftGray =
                                    Math.abs(lp[0] - lp[1]) <= 2
                                    && Math.abs(lp[1] - lp[2]) <= 2;
                                const rightGray =
                                    Math.abs(rp[0] - rp[1]) <= 2
                                    && Math.abs(rp[1] - rp[2]) <= 2;
                                resolve({ valid: true, leftGray, rightGray });
                            };
                            probe.src = src;
                        })"""
                    )
                    assert clean_still_check == {
                        "valid": True,
                        "leftGray": True,
                        "rightGray": True,
                    }

                    # Shift+S shortcut grabs another still outside inputs, ignored inside inputs
                    page.locator("#grade-contrast-num").focus()
                    page.keyboard.press("Shift+S")
                    assert page.locator("#color-stills-gallery .still-card").count() == 1
                    page.locator("#grade-contrast-num").blur()
                    page.keyboard.press("Shift+S")
                    assert page.locator("#color-stills-gallery .still-card").count() == 2

                    # Clicking a still downloads taktcut-still-YYYYMMDD-HHMMSS.png
                    with page.expect_download() as dl_info:
                        page.locator("#color-stills-gallery .still-download-btn").first.click()
                    download = dl_info.value
                    assert re.match(
                        r"^taktcut-still-\d{8}-\d{6}\.png$",
                        download.suggested_filename,
                    )

                    # Delete button removes one still cleanly
                    page.locator("#color-stills-gallery .still-delete-btn").first.click()
                    assert page.locator("#color-stills-gallery .still-card").count() == 1

                    # Shortcuts dialog documents Shift+S
                    page.keyboard.press("?")
                    page.wait_for_selector("#nle-shortcuts-dialog[open]")
                    dlg_text = page.locator("#nle-shortcuts-grid").text_content() or ""
                    assert "Shift+S" in dlg_text
                    page.keyboard.press("Escape")

                    # Verify 04 Color monitors stay locked inside 100dvh viewport (1440x900)
                    color_monitor_box = page.locator("#color-preview-canvas").bounding_box()
                    color_scope_box = page.locator("#color-scope-canvas").bounding_box()
                    assert color_monitor_box is not None
                    assert color_scope_box is not None
                    assert color_monitor_box["y"] + color_monitor_box["height"] <= height
                    assert color_scope_box["y"] + color_scope_box["height"] <= height

                    # Verify DaVinci Serial Node Tree + .cube LUT import + Live Scope update
                    page.locator("#btn-cdl-reset").click()
                    assert page.locator("#color-node-count").text_content() == "1 / 8 NODES"
                    assert page.locator("#color-node-graph .color-node-card").count() == 1
                    page.locator("#btn-color-node-add").click()
                    assert page.locator("#color-node-count").text_content() == "2 / 8 NODES"
                    assert page.locator("#color-node-graph .color-node-card").count() == 2
                    page.locator('[data-grade-preset="teal_orange"]').click()
                    page.wait_for_function(
                        "() => document.getElementById('color-compile-badge').textContent"
                        " === 'GRADED' && (document.getElementById('color-filtergraph-output')"
                        ".textContent || '').includes('eq=contrast=1.1400:saturation=1.1800')"
                    )
                    scope_before_lut = page.evaluate(
                        "() => document.getElementById('color-scope-canvas').toDataURL()"
                    )
                    cube_payload = (
                        'TITLE "CI_Cinema_2x2x2"\n'
                        "LUT_3D_SIZE 2\n"
                        "0.0 0.0 0.0\n"
                        "1.0 0.0 0.0\n"
                        "0.0 0.8 0.0\n"
                        "1.0 0.8 0.0\n"
                        "0.0 0.0 0.65\n"
                        "1.0 0.0 0.65\n"
                        "0.0 0.8 0.65\n"
                        "0.95 0.78 0.60\n"
                    )
                    page.locator("#cube-file-input").set_input_files(
                        {
                            "name": "ci_cinema.cube",
                            "mimeType": "text/plain",
                            "buffer": cube_payload.encode("utf-8"),
                        }
                    )
                    page.wait_for_function(
                        "() => (document.getElementById('color-node-lut-badge')"
                        ".textContent || '').includes('3D 2^3')"
                    )
                    scope_after_lut = page.evaluate(
                        "() => document.getElementById('color-scope-canvas').toDataURL()"
                    )
                    assert scope_after_lut != scope_before_lut

                    # Bypass node 2 restores scope & filtergraph to node 1 only
                    page.locator("#btn-color-node-bypass").click()
                    assert (
                        page.locator("#btn-color-node-bypass").get_attribute("aria-pressed")
                        == "true"
                    )
                    scope_bypassed = page.evaluate(
                        "() => document.getElementById('color-scope-canvas').toDataURL()"
                    )
                    assert scope_bypassed != scope_after_lut
                    page.locator("#btn-color-node-clear-lut").click()
                    assert page.locator("#btn-color-node-clear-lut").is_disabled() is True
                    page.locator("#btn-color-node-delete").click()
                    assert page.locator("#color-node-count").text_content() == "1 / 8 NODES"

                    # Verify Power Window Circle/Linear/Gradient + Outside Node + maskedmerge
                    assert page.locator("#pw-status-badge").text_content() == "OFF"
                    assert page.locator("#btn-color-node-outside").is_disabled() is True
                    page.locator('[data-pw-shape="circle"]').click()
                    assert page.locator("#pw-status-badge").text_content() == "CIRCLE"
                    assert page.locator("#btn-color-node-outside").is_disabled() is False
                    assert page.locator("#pw-cx-num").is_disabled() is False
                    page.locator('[data-grade-preset="teal_orange"]').click()
                    page.wait_for_function(
                        "() => document.getElementById('color-compile-badge').textContent"
                        " === 'GRADED | PW' && (document.getElementById('color-filtergraph-output')"
                        ".textContent || '').includes('maskedmerge')"
                    )
                    scope_pw_inside = page.evaluate(
                        "() => document.getElementById('color-scope-canvas').toDataURL()"
                    )
                    page.locator("#btn-pw-invert").click()
                    assert page.locator("#pw-status-badge").text_content() == "CIRCLE | INV"
                    scope_pw_inv = page.evaluate(
                        "() => document.getElementById('color-scope-canvas').toDataURL()"
                    )
                    assert scope_pw_inv != scope_pw_inside
                    page.locator("#btn-color-node-outside").click()
                    assert page.locator("#color-node-count").text_content() == "2 / 8 NODES"
                    assert (
                        page.locator("#color-node-graph .color-node-pw-tag").count() == 2
                    )
                    page.locator('[data-pw-shape="linear"]').click()
                    assert page.locator("#pw-status-badge").text_content() == "LINEAR"
                    page.locator('[data-pw-shape="gradient"]').click()
                    assert page.locator("#pw-status-badge").text_content() == "GRADIENT"

                    # DaVinci HSL Qualifier: preset, FFmpeg compile, Highlight, Pick & Outside
                    page.locator("#btn-cdl-reset").click()
                    assert page.locator("#qual-status-badge").text_content() == "OFF"
                    page.locator('[data-qual-preset="skin_tones"]').click()
                    assert page.locator("#qual-status-badge").text_content() == "SKIN_TONES"
                    assert page.locator("#btn-color-node-outside").is_disabled() is False
                    page.locator('[data-grade-preset="teal_orange"]').click()
                    page.wait_for_function(
                        "() => (document.getElementById('color-compile-badge')"
                        ".textContent || '').includes('QUAL')"
                        " && (document.getElementById('color-filtergraph-output')"
                        ".textContent || '').includes('extractplanes=r')"
                        " && (document.getElementById('color-filtergraph-output')"
                        ".textContent || '').includes('maskedmerge')"
                    )
                    scope_qual_normal = page.evaluate(
                        "() => document.getElementById('color-preview-canvas').toDataURL()"
                    )
                    page.locator("#btn-qual-highlight").click()
                    assert (
                        page.locator("#btn-qual-highlight").get_attribute("aria-pressed") == "true"
                    )
                    assert (
                        page.locator("#btn-color-qual-highlight").get_attribute("aria-pressed")
                        == "true"
                    )
                    scope_qual_hl = page.evaluate(
                        "() => document.getElementById('color-preview-canvas').toDataURL()"
                    )
                    assert scope_qual_hl != scope_qual_normal
                    page.keyboard.press("Shift+H")
                    assert (
                        page.locator("#btn-qual-highlight").get_attribute("aria-pressed") == "false"
                    )

                    # Eyedropper Pick directly on #color-preview-canvas (sky/blue swatch area)
                    page.locator("#btn-qual-pick").click()
                    assert page.locator("#btn-qual-pick").get_attribute("aria-pressed") == "true"
                    prev_box = page.locator("#color-preview-canvas").bounding_box()
                    assert prev_box is not None and prev_box["width"] > 120
                    page.mouse.click(
                        prev_box["x"] + prev_box["width"] * 0.50,
                        prev_box["y"] + prev_box["height"] * 0.50,
                    )
                    assert page.locator("#qual-status-badge").text_content() == "CUSTOM"
                    pick_readout = page.locator("#qual-pick-readout").text_content() or ""
                    assert "deg |" in pick_readout and "S " in pick_readout and "L " in pick_readout
                    page.locator("#btn-qual-pick").click()
                    assert page.locator("#btn-qual-pick").get_attribute("aria-pressed") == "false"

                    page.locator("#btn-qual-invert").click()
                    assert page.locator("#qual-status-badge").text_content() == "CUSTOM | INV"
                    page.locator("#btn-color-node-outside").click()
                    assert page.locator("#color-node-count").text_content() == "2 / 8 NODES"
                    assert page.locator("#color-node-graph .color-node-qual-tag").count() == 2
                    page.locator("#btn-qual-reset").click()
                    assert page.locator("#qual-status-badge").text_content() == "OFF"
                    page.locator("#btn-cdl-reset").click()

                    # Custom YRGB Spline Curves: preset, canvas knot insert + keyboard nudge + reset
                    assert page.locator("#curves-status-badge").text_content() == "LINEAR"
                    page.locator('[data-curve-preset="film_s_curve"]').click()
                    page.wait_for_function(
                        "() => (document.getElementById('color-filtergraph-output')"
                        ".textContent || '').includes('curves=interp=pchip:master=')"
                    )
                    assert page.locator("#curves-status-badge").text_content() == "ACTIVE | Y"
                    assert "CRV" in (page.locator("#color-compile-badge").text_content() or "")
                    assert page.locator("#color-node-graph .color-node-crv-tag").count() >= 1

                    page.locator('[data-curve-channel="red"]').click()
                    curves_box = page.locator("#color-curves-canvas").bounding_box()
                    assert curves_box is not None and curves_box["width"] > 120
                    page.mouse.click(
                        curves_box["x"] + curves_box["width"] * 0.5,
                        curves_box["y"] + curves_box["height"] * 0.35,
                    )
                    assert page.locator("#curves-status-badge").text_content() == "ACTIVE | Y+R"
                    assert page.locator("#btn-curves-delete-pt").is_disabled() is False
                    readout_before = page.locator("#curves-point-readout").text_content() or ""
                    assert "PT " in readout_before
                    page.locator("#color-curves-canvas").press("ArrowUp")
                    readout_after = page.locator("#curves-point-readout").text_content() or ""
                    assert readout_after != readout_before
                    page.locator("#btn-curves-delete-pt").click()
                    assert page.locator("#curves-status-badge").text_content() == "ACTIVE | Y"
                    page.locator("#btn-curves-reset-all").click()
                    assert page.locator("#curves-status-badge").text_content() == "LINEAR"
                    page.locator("#btn-cdl-reset").click()
                else:
                    # Mobile check: Grab Still + Serial Node targets >= 44px + 0 overflow
                    page.locator("#btn-color-grab-still").click()
                    assert page.locator("#color-stills-gallery .still-card").count() == 1
                    grab_box = page.locator("#btn-color-grab-still").bounding_box()
                    del_loc = page.locator("#color-stills-gallery .still-delete-btn").first
                    del_box = del_loc.bounding_box()
                    assert grab_box is not None and grab_box["height"] >= 44
                    assert del_box is not None
                    assert del_box["width"] >= 44 and del_box["height"] >= 44
                    if width <= 820:
                        for node_sel in (
                            "#btn-color-node-add",
                            "#btn-color-node-outside",
                            "#btn-color-node-bypass",
                            "#cube-file-input",
                            '[data-pw-shape="circle"]',
                            '[data-qual-preset="skin_tones"]',
                            "#btn-qual-pick",
                            "#btn-qual-highlight",
                            "#btn-qual-invert",
                            "#btn-qual-reset",
                            '[data-curve-channel="master"]',
                            '[data-curve-preset="film_s_curve"]',
                        ):
                            node_box = page.locator(node_sel).bounding_box()
                            assert node_box is not None and node_box["height"] >= 44
                    color_still_overflow = page.evaluate(
                        "() => document.documentElement.scrollWidth - window.innerWidth"
                    )
                    assert color_still_overflow <= 0

                # Verify Titles & Lower-Thirds page responsiveness and compilation
                page.locator("#tab-titles").click()
                page.wait_for_selector("#panel-titles:not(.is-hidden)")
                titles_overflow = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert titles_overflow <= 0, (
                    f"Titles page horizontal overflow at {width}x{height}: {titles_overflow}px"
                )
                if width == 1440:
                    page.locator('[data-title-preset="center_title_card"]').click()
                    page.wait_for_function(
                        "() => document.getElementById('title-position-select').value === 'center'"
                        " && (document.getElementById('title-filtergraph-output')"
                        ".textContent || '').includes('ECLIPSE SHOWREEL 2026')"
                    )
                    assert (
                        page.locator("#title-text-input").input_value() == "ECLIPSE SHOWREEL 2026"
                    )
                    title_fg = page.locator("#title-filtergraph-output").text_content() or ""
                    assert "drawbox=" in title_fg
                    assert "drawtext=" in title_fg
                    assert page.locator("#title-filtergraph-drawer").get_attribute("open") is None
                    assert (
                        page.locator("#subtitle-filtergraph-drawer").get_attribute("open") is None
                    )
                    page.locator("#title-filtergraph-drawer > summary").click()
                    assert (
                        page.locator("#title-filtergraph-drawer").get_attribute("open") is not None
                    )
                    assert page.locator("#title-filtergraph-output").is_visible() is True
                    page.locator("#title-filtergraph-drawer > summary").click()

                # Verify FX Studio + Chroma Key / Green Screen Studio & Matte View at all viewports
                page.locator("#tab-fx").click()
                page.wait_for_selector("#panel-fx:not(.is-hidden)")
                page.locator('[data-keyer-preset="studio_green"]').click()
                page.wait_for_function(
                    "() => (document.getElementById('fx-filtergraph-output').textContent || '')"
                    ".includes('colorkey=color=0x00b140')"
                )
                assert page.locator("#btn-fx-keyer-toggle").get_attribute("aria-pressed") == "true"
                fx_overflow = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert fx_overflow <= 0, (
                    f"FX Chroma Key horizontal overflow at {width}x{height}: {fx_overflow}px"
                )
                if width == 1440:
                    # Verify FX Split-Screen Wipe toggle (W), divider drag, and toggle OFF
                    assert (
                        page.locator("#btn-fx-split-wipe").get_attribute("aria-pressed") == "false"
                    )
                    page.keyboard.press("w")
                    assert (
                        page.locator("#btn-fx-split-wipe").get_attribute("aria-pressed") == "true"
                    )
                    assert page.locator("#fx-wipe-label").text_content() == "50%"
                    fx_geom = page.evaluate(
                        """() => {
                            const c = document.getElementById('fx-program-canvas');
                            const r = c.getBoundingClientRect();
                            const g = c._splitWipeGeom;
                            const sx = r.width / (g.canvasWidth || r.width);
                            const sy = r.height / (g.canvasHeight || r.height);
                            return {
                                divX: r.left + g.dividerX * sx,
                                divY: r.top + g.handleY * sy,
                                targetX: r.left + (g.frameRect.x + g.frameRect.width * 0.30) * sx
                            };
                        }"""
                    )
                    page.mouse.move(fx_geom["divX"], fx_geom["divY"])
                    page.mouse.down()
                    page.mouse.move(fx_geom["targetX"], fx_geom["divY"], steps=4)
                    page.mouse.up()
                    fx_wipe_txt = page.locator("#fx-wipe-label").text_content() or "0%"
                    fx_dragged_pct = int(fx_wipe_txt.rstrip("%"))
                    assert 20 <= fx_dragged_pct <= 36
                    page.locator("#btn-fx-split-wipe").click()
                    assert (
                        page.locator("#btn-fx-split-wipe").get_attribute("aria-pressed") == "false"
                    )

                    page.locator('[data-keyer-preset="chroma_blue"]').click()
                    page.wait_for_function(
                        "() => (document.getElementById('fx-filtergraph-output').textContent || '')"
                        ".includes('colorkey=color=0x0047bb')"
                    )
                    page.locator("#fx-keyer-hex-input").fill("#14C864")
                    page.locator("#fx-keyer-hex-input").press("Enter")
                    page.wait_for_function(
                        "() => (document.getElementById('fx-filtergraph-output').textContent || '')"
                        ".includes('colorkey=color=0x14c864')"
                    )
                    page.locator("#btn-fx-matte-alpha").click()
                    assert (
                        page.locator("#btn-fx-matte-alpha").get_attribute("aria-pressed") == "true"
                    )
                    # Verify Alpha Matte renders crisp grayscale matte pixels on canvas
                    is_grayscale = page.evaluate(
                        """() => {
                            const c = document.getElementById('fx-program-canvas');
                            const ctx = c.getContext('2d');
                            const x = Math.floor(c.width * 0.18);
                            const y = Math.floor(c.height * 0.5);
                            const p = ctx.getImageData(x, y, 1, 1).data;
                            return Math.abs(p[0] - p[1]) <= 2 && Math.abs(p[1] - p[2]) <= 2;
                        }"""
                    )
                    assert is_grayscale is True
                    page.locator("#btn-fx-matte-final").click()
                    assert (
                        page.locator("#btn-fx-matte-final").get_attribute("aria-pressed") == "true"
                    )
                    # Grab Still from FX Program Monitor (button & Shift+S)
                    before_fx_stills = page.locator("#fx-stills-gallery .still-card").count()
                    page.locator("#btn-fx-grab-still").click()
                    assert (
                        page.locator("#fx-stills-gallery .still-card").count()
                        == before_fx_stills + 1
                    )
                    page.keyboard.press("Shift+S")
                    assert (
                        page.locator("#fx-stills-gallery .still-card").count()
                        == before_fx_stills + 2
                    )
                    # OpenFX categorized library & collapsible FFmpeg filtergraph drawer
                    assert page.locator("#fx-ofx-filterbar [data-fx-cat-filter]").count() == 5
                    assert page.locator("#fx-ofx-groups [data-fx-add]").count() == 24
                    assert page.locator("#fx-ofx-groups .fx-ofx-group:not(.is-hidden)").count() == 4
                    page.locator('[data-fx-cat-filter="film_retro"]').click()
                    assert (
                        page.locator('[data-fx-cat-filter="film_retro"]').get_attribute(
                            "aria-pressed"
                        )
                        == "true"
                    )
                    assert page.locator("#fx-ofx-groups .fx-ofx-group:not(.is-hidden)").count() == 1
                    assert page.locator('[data-fx-add="film_grain"]').is_visible() is True
                    page.locator('[data-fx-cat-filter="all"]').click()
                    assert page.locator("#fx-ofx-groups .fx-ofx-group:not(.is-hidden)").count() == 4
                    assert page.locator("#fx-filtergraph-drawer").get_attribute("open") is None
                    page.locator("#fx-filtergraph-drawer > summary").click()
                    assert page.locator("#fx-filtergraph-drawer").get_attribute("open") is not None
                    assert page.locator("#fx-filtergraph-output").is_visible() is True
                    page.locator("#fx-filtergraph-drawer > summary").click()

                    # Planar Tracker / Corner-Pin & Motion Stabilizer E2E (1440 & 375)
                    page.locator("#fx-tracker-pane").scroll_into_view_if_needed()
                    page.locator("#btn-fx-tracker-toggle").click()
                    assert (
                        page.locator("#btn-fx-tracker-toggle").get_attribute("aria-pressed")
                        == "true"
                    )
                    page.locator('[data-tracker-preset="anamorphic_skew"]').click()
                    page.wait_for_function(
                        "() => (document.getElementById('fx-filtergraph-output').textContent || '')"
                        ".includes('perspective=x0=0.0500*W')"
                    )
                    page.locator("#fx-pin-tl-x").fill("12.0")
                    page.locator("#fx-pin-tl-x").dispatch_event("change")
                    page.wait_for_function(
                        "() => (document.getElementById('fx-filtergraph-output').textContent || '')"
                        ".includes('perspective=x0=0.1200*W')"
                    )
                    # Drag Corner-Pin TL handle directly on #fx-program-canvas
                    page.locator("#fx-program-canvas").scroll_into_view_if_needed()
                    tl_drag_geom = page.evaluate(
                        """() => {
                            const c = document.getElementById('fx-program-canvas');
                            const r = c.getBoundingClientRect();
                            const g = c._planarTrackerGeom;
                            const lw = g.canvasWidth || r.width;
                            const lh = g.canvasHeight || r.height;
                            const cs = Math.min(r.width / lw, r.height / lh);
                            const ox = (r.width - lw * cs) * 0.5;
                            const oy = (r.height - lh * cs) * 0.5;
                            return {
                                x: r.left + ox + g.handles.tl.x * cs,
                                y: r.top + oy + g.handles.tl.y * cs
                            };
                        }"""
                    )
                    page.mouse.move(tl_drag_geom["x"], tl_drag_geom["y"])
                    page.mouse.down()
                    page.mouse.move(tl_drag_geom["x"] + 20, tl_drag_geom["y"] + 12, steps=3)
                    page.mouse.up()
                    dragged_tl_val = float(page.locator("#fx-pin-tl-x").input_value() or "12")
                    assert dragged_tl_val > 12.2

                    # Run real 2D SSD tracking forward & link to Color Power Window
                    page.locator("#btn-fx-track-fwd").click()
                    page.wait_for_function(
                        "() => ("
                        "document.getElementById('fx-tracker-track-readout').textContent || ''"
                        ").includes('25 KF')"
                    )
                    page.wait_for_function(
                        "() => (document.getElementById('fx-filtergraph-output').textContent || '')"
                        ".includes(':eval=frame')"
                    )
                    page.locator("#btn-fx-track-link-pw").click()
                    page.locator("#tab-color").click()
                    page.wait_for_selector("#panel-color:not(.is-hidden)")
                    assert page.locator("#pw-track-link-badge").is_visible() is True
                    assert "TRACKED (25 KF)" in (
                        page.locator("#pw-track-link-badge").text_content() or ""
                    )
                    page.locator("#btn-pw-unlink-track").click()
                    assert page.locator("#pw-track-link-badge").is_visible() is False

                    # Switch back to FX and test Motion Stabilizer sub-tab
                    page.locator("#tab-fx").click()
                    page.wait_for_selector("#panel-fx:not(.is-hidden)")
                    page.locator("#fx-tracker-tab-stabilizer").click()
                    assert page.locator("#fx-tracker-panel-stabilizer").is_visible() is True
                    page.locator('[data-stab-preset="locked_tripod"]').click()
                    page.wait_for_function(
                        "() => (document.getElementById('fx-filtergraph-output').textContent || '')"
                        ".includes('deshake=x=-1:y=-1:w=-1:h=-1:rx=32:ry=32')"
                    )
                    fx_trk_overflow = page.evaluate(
                        "() => document.documentElement.scrollWidth - window.innerWidth"
                    )
                    assert fx_trk_overflow <= 0, (
                        f"FX tracker overflow at {width}x{height}: {fx_trk_overflow}px"
                    )
                    if width <= 820:
                        for mob_sel in (
                            "#fx-tracker-tab-planar",
                            "#fx-tracker-tab-stabilizer",
                            "#btn-fx-track-fwd",
                            "#btn-fx-stab-reset",
                        ):
                            mb = page.locator(mob_sel).bounding_box()
                            assert mb is not None and mb["height"] >= 44, (
                                f"Mobile touch target < 44px for {mob_sel}: {mb}"
                            )
                    # Clean up FX tracker & stabilizer so later Deliver tests stay baseline
                    page.locator("#btn-fx-reset-all").click()
                    page.wait_for_function(
                        "() => (document.getElementById('fx-active-badge').textContent || '')"
                        ".includes('0 FX')"
                    )

                # Verify Deliver Quick-Export Preset Strip & DaVinci Compact Sub-Tabs
                page.locator("#tab-render").click()
                page.wait_for_selector("#panel-render:not(.is-hidden)")
                page.wait_for_selector('[data-delivery-preset="youtube_1080p_h264"]')
                page.wait_for_selector("#render-settings-tabs")
                assert page.locator("#render-tab-video").get_attribute("aria-selected") == "true"
                assert page.locator("#render-tabpanel-video").is_visible() is True
                assert page.locator("#render-tabpanel-audio").is_visible() is False
                assert page.locator("#render-tabpanel-looks").is_visible() is False
                assert page.locator("#render-tabpanel-file").is_visible() is False
                for subtab_id in (
                    "render-tab-video",
                    "render-tab-audio",
                    "render-tab-looks",
                    "render-tab-file",
                ):
                    subtab_loc = page.locator(f"#{subtab_id}")
                    assert subtab_loc.is_visible() is True
                    if width <= 820:
                        st_box = subtab_loc.bounding_box()
                        assert st_box is not None and st_box["height"] >= 44

                for footer_id in (
                    "deliver-size-estimate",
                    "btn-build-render-plan",
                    "btn-execute-render",
                    "btn-copy-ffmpeg-cmd",
                ):
                    f_loc = page.locator(f"#{footer_id}")
                    assert f_loc.is_visible() is True
                    if width == 1440:
                        f_box = f_loc.bounding_box()
                        assert f_box is not None and (f_box["y"] + f_box["height"]) <= height

                render_overflow = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert render_overflow <= 0, (
                    f"Deliver page horizontal overflow at {width}x{height}: {render_overflow}px"
                )
                page.locator('[data-delivery-preset="youtube_4k_hevc"]').click()
                assert page.locator("#render-profile").input_value() == "master_hevc"
                assert page.locator("#render-container").input_value() == "mp4"
                assert page.locator("#render-resolution").input_value() == "3840x2160"
                assert page.locator("#render-crf").input_value() == "20"
                assert page.locator("#render-audio-bitrate").input_value() == "320"
                assert (
                    page.locator('[data-delivery-preset="youtube_4k_hevc"]').get_attribute(
                        "aria-pressed"
                    )
                    == "true"
                )
                page.locator("#btn-build-render-plan").click()
                page.wait_for_function(
                    "() => (document.getElementById('render-argv-output').textContent || '')"
                    ".includes('3840')"
                )
                argv_text = page.locator("#render-argv-output").text_content() or ""
                assert "320k" in argv_text

                page.locator('[data-delivery-preset="broadcast_prores_422"]').click()
                assert page.locator("#render-profile").input_value() == "prores_hq"
                assert page.locator("#render-container").input_value() == "mov"
                assert page.locator("#render-output-path").input_value().endswith(".mov")
                assert page.locator("#render-crf").is_disabled() is True

                # Switch to Burn-Ins & Looks tab for Timecode Burn-In & Watermark
                page.locator("#render-tab-looks").click()
                assert page.locator("#render-tab-looks").get_attribute("aria-selected") == "true"
                assert page.locator("#render-tabpanel-looks").is_visible() is True

                # Verify Data Burn-In (SMPTE Timecode Overlay) control & touch target
                tc_sel = page.locator("#render-timecode-burnin")
                assert tc_sel.is_visible() is True
                tc_sel.select_option("bottom_center")
                assert tc_sel.input_value() == "bottom_center"
                if width <= 820:
                    tc_box = tc_sel.bounding_box()
                    assert tc_box is not None and tc_box["height"] >= 44
                page.locator("#btn-build-render-plan").click()
                page.wait_for_function(
                    "() => (document.getElementById('render-argv-output').textContent || '')"
                    ".includes('timecode=')"
                )
                tc_argv = page.locator("#render-argv-output").text_content() or ""
                assert "drawtext=" in tc_argv
                assert "timecode=" in tc_argv

                # Verify Client-Review Watermark Overlay control, presets, opacity, & touch target
                wm_input = page.locator("#render-watermark-text")
                wm_preset_draft = page.locator('[data-watermark-preset="DRAFT - CLIENT REVIEW"]')
                wm_opacity = page.locator("#render-watermark-opacity")
                assert wm_input.is_visible() is True
                assert wm_preset_draft.is_visible() is True
                assert wm_opacity.is_visible() is True
                if width <= 820:
                    for loc in (wm_input, wm_preset_draft, wm_opacity):
                        box = loc.bounding_box()
                        assert box is not None and box["height"] >= 44
                wm_preset_draft.click()
                assert wm_input.input_value() == "DRAFT - CLIENT REVIEW"
                assert wm_preset_draft.get_attribute("aria-pressed") == "true"
                wm_opacity.fill("0.5")
                wm_opacity.dispatch_event("input")
                assert page.locator("#render-watermark-opacity-value").text_content() == "0.50"
                page.locator("#btn-build-render-plan").click()
                page.wait_for_function(
                    "() => (document.getElementById('render-argv-output').textContent || '')"
                    ".includes('DRAFT - CLIENT REVIEW')"
                )
                wm_argv = page.locator("#render-argv-output").text_content() or ""
                wm_kv = page.locator("#render-plan-kv").text_content() or ""
                assert "DRAFT - CLIENT REVIEW" in wm_argv
                assert "white@0.50" in wm_argv
                assert (
                    "text='DRAFT - CLIENT REVIEW':fontsize=42"
                    ":fontcolor=white@0.50:x=(w-text_w)/2:y=(h-text_h)/2"
                ) in wm_kv

                wm_render_overflow = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert wm_render_overflow <= 0, (
                    f"Deliver watermark overflow at {width}x{height}: {wm_render_overflow}px"
                )

                # Switch back to Video tab for Export Frame Rate & Deinterlace (yadif)
                page.locator("#render-tab-video").click()
                assert page.locator("#render-tabpanel-video").is_visible() is True

                # Verify Deliver Export Frame Rate & Deinterlace (yadif) controls & touch targets
                export_fps_sel = page.locator("#render-export-fps")
                deint_chk = page.locator("#render-deinterlace")
                deint_label = page.locator("label:has(#render-deinterlace)")
                assert export_fps_sel.is_visible() is True
                assert deint_chk.is_visible() is True
                if width <= 820:
                    fps_box = export_fps_sel.bounding_box()
                    deint_box = deint_label.bounding_box()
                    assert fps_box is not None and fps_box["height"] >= 44
                    assert deint_box is not None and deint_box["height"] >= 44
                export_fps_sel.select_option("24")
                assert export_fps_sel.input_value() == "24"
                deint_chk.check()
                assert deint_chk.is_checked() is True
                page.locator("#btn-build-render-plan").click()
                page.wait_for_function(
                    "() => (document.getElementById('render-argv-output').textContent || '')"
                    ".includes('yadif=mode=0:parity=-1:deint=0,fps=24')"
                )
                deint_argv = page.locator("#render-argv-output").text_content() or ""
                deint_kv = page.locator("#render-plan-kv").text_content() or ""
                assert "yadif=mode=0:parity=-1:deint=0,fps=24" in deint_argv
                assert "-r 24" in deint_argv
                assert "24 fps" in deint_kv
                assert "yadif (mode=0:parity=-1:deint=0)" in deint_kv

                deint_render_overflow = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert deint_render_overflow <= 0, (
                    f"Deliver export_fps/deinterlace overflow at {width}x{height}: "
                    f"{deint_render_overflow}px"
                )

                # Restore a CRF-enabled MP4 preset before Audio-Only Master toggle checks
                page.locator('[data-delivery-preset="youtube_1080p_h264"]').click()
                assert page.locator("#render-profile").input_value() == "web_h264"
                assert page.locator("#render-crf").is_disabled() is False
                assert (page.locator("#render-output-path").input_value() or "").endswith(".mp4")

                # Switch to Audio tab for Audio-Only Master selector
                page.locator("#render-tab-audio").click()
                assert page.locator("#render-tabpanel-audio").is_visible() is True

                # Verify Deliver Audio-Only Master selector (#render-audio-only-format)
                audio_only_sel = page.locator("#render-audio-only-format")
                assert audio_only_sel.is_visible() is True
                if width <= 820:
                    ao_box = audio_only_sel.bounding_box()
                    assert ao_box is not None and ao_box["height"] >= 44
                audio_only_sel.select_option("wav24")
                assert audio_only_sel.input_value() == "wav24"
                assert page.locator("#render-profile").is_disabled() is True
                assert page.locator("#render-crf").is_disabled() is True
                assert (page.locator("#render-output-path").input_value() or "").endswith(".wav")
                page.locator("#btn-build-render-plan").click()
                page.wait_for_function(
                    "() => (document.getElementById('render-argv-output').textContent || '')"
                    ".includes('-vn') && "
                    "(document.getElementById('render-argv-output').textContent || '')"
                    ".includes('pcm_s24le')"
                )
                ao_argv = page.locator("#render-argv-output").text_content() or ""
                ao_kv = page.locator("#render-plan-kv").text_content() or ""
                ao_badge = page.locator("#render-encoder-badge").text_content() or ""
                assert "-vn" in ao_argv
                assert "pcm_s24le" in ao_argv
                assert "-c:v" not in ao_argv
                assert "wav24" in ao_kv
                assert "pcm_s24le / wav24" in ao_badge
                ao_overflow = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert ao_overflow <= 0, (
                    f"Deliver audio_only_format overflow at {width}x{height}: {ao_overflow}px"
                )
                audio_only_sel.select_option("off")
                assert page.locator("#render-profile").is_disabled() is False
                assert page.locator("#render-crf").is_disabled() is False
                assert (page.locator("#render-output-path").input_value() or "").endswith(".mp4")

                # Switch to Burn-Ins & Looks tab for Lower-Third / Title Overlay
                page.locator("#render-tab-looks").click()
                assert page.locator("#render-tabpanel-looks").is_visible() is True

                # Verify Deliver Lower-Third / Title Overlay panel, presets, touch targets & plan
                lt_chk = page.locator("#render-lower-third-enabled")
                lt_toggle_lbl = page.locator("label:has(#render-lower-third-enabled)")
                lt_preset_interview = page.locator('[data-lt-preset="interview"]')
                lt_title = page.locator("#render-lower-third-title")
                lt_sub = page.locator("#render-lower-third-subtitle")
                lt_pos = page.locator("#render-lower-third-position")
                lt_fs = page.locator("#render-lower-third-font-size")
                lt_op = page.locator("#render-lower-third-box-opacity")
                lt_start = page.locator("#render-lower-third-start")
                lt_dur = page.locator("#render-lower-third-duration")
                assert lt_chk.is_visible() is True
                assert lt_preset_interview.is_visible() is True
                assert lt_title.is_visible() is True
                assert lt_pos.is_visible() is True
                if width <= 820:
                    for lt_loc in (
                        lt_toggle_lbl,
                        lt_preset_interview,
                        lt_title,
                        lt_sub,
                        lt_pos,
                        lt_fs,
                        lt_op,
                        lt_start,
                        lt_dur,
                    ):
                        lt_box = lt_loc.bounding_box()
                        assert lt_box is not None and lt_box["height"] >= 44
                lt_preset_interview.click()
                assert lt_chk.is_checked() is True
                assert lt_title.input_value() == "Claire Laurent"
                assert lt_pos.input_value() == "bottom_left"
                assert lt_preset_interview.get_attribute("aria-pressed") == "true"
                page.wait_for_function(
                    "() => (document.getElementById('render-lower-third-preview')"
                    ".textContent || '').includes('between(t,0.00,5.00)')"
                )
                lt_pos.select_option("top_left")
                assert lt_pos.input_value() == "top_left"
                page.locator("#btn-build-render-plan").click()
                page.wait_for_function(
                    "() => (document.getElementById('render-argv-output').textContent || '')"
                    ".includes('Claire Laurent')"
                )
                lt_argv = page.locator("#render-argv-output").text_content() or ""
                lt_kv = page.locator("#render-plan-kv").text_content() or ""
                assert "drawtext=" in lt_argv
                assert "between(t,0.00,5.00)" in lt_argv
                assert "top_left" in lt_kv
                lt_overflow = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert lt_overflow <= 0, (
                    f"Deliver lower_third overflow at {width}x{height}: {lt_overflow}px"
                )
                page.locator("#tab-timeline").click()
                prog_with_lt = page.evaluate(
                    "() => document.getElementById('timeline-program-canvas').toDataURL()"
                )
                page.locator("#tab-render").click()
                lt_chk.uncheck()
                page.locator("#tab-timeline").click()
                prog_without_lt = page.evaluate(
                    "() => document.getElementById('timeline-program-canvas').toDataURL()"
                )
                assert prog_with_lt != prog_without_lt
                page.locator("#tab-render").click()

                # Switch to Video tab for Retime & Auto-Reframe
                page.locator("#render-tab-video").click()
                assert page.locator("#render-tabpanel-video").is_visible() is True

                # Verify Deliver Retime (Speed & Reverse) controls & dry-run plan
                rt_card = page.locator("#deliver-retime-card")
                rt_chk = page.locator("#render-retime-enabled")
                rt_speed = page.locator("#render-retime-speed")
                rt_rev = page.locator("#render-retime-reverse")
                rt_qtr = page.locator(
                    '.retime-deliver-preset-btn[data-deliver-retime-speed="0.25"]'
                )
                rt_4x = page.locator('.retime-deliver-preset-btn[data-deliver-retime-speed="4"]')
                assert rt_card.is_visible() is True
                assert rt_chk.is_checked() is False
                if width <= 820:
                    for rt_loc in (rt_speed, rt_rev, rt_qtr, rt_4x):
                        rt_box = rt_loc.bounding_box()
                        assert rt_box is not None and rt_box["height"] >= 44
                rt_qtr.click()
                assert rt_chk.is_checked() is True
                assert rt_qtr.get_attribute("aria-pressed") == "true"
                page.wait_for_function(
                    "() => (document.getElementById('render-retime-preview')"
                    ".textContent || '').includes('setpts=PTS/0.2500')"
                )
                rt_preview_qtr = page.locator("#render-retime-preview").text_content() or ""
                assert "atempo=0.5000,atempo=0.5000" in rt_preview_qtr
                rt_dur_text = page.locator("#render-retime-duration-estimate").text_content() or ""
                assert "0.25x" in rt_dur_text
                rt_rev.click()
                assert rt_rev.get_attribute("aria-pressed") == "true"
                page.wait_for_function(
                    "() => (document.getElementById('render-retime-preview')"
                    ".textContent || '').includes('areverse')"
                )
                page.locator("#btn-build-render-plan").click()
                page.wait_for_function(
                    "() => (document.getElementById('render-argv-output').textContent || '')"
                    ".includes('setpts=PTS/0.2500,reverse')"
                )
                rt_argv = page.locator("#render-argv-output").text_content() or ""
                rt_kv = page.locator("#render-plan-kv").text_content() or ""
                assert "atempo=0.5000,atempo=0.5000,areverse" in rt_argv
                assert "0.25x REV" in rt_kv
                rt_overflow = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert rt_overflow <= 0, (
                    f"Deliver retime overflow at {width}x{height}: {rt_overflow}px"
                )
                rt_proc_sel = page.locator("#render-retime-process")
                rt_ramp_sel = page.locator("#render-retime-ramp-preset")
                assert rt_proc_sel.is_visible() is True
                assert rt_ramp_sel.is_visible() is True
                if width <= 820:
                    for adv_loc in (rt_proc_sel, rt_ramp_sel):
                        adv_box = adv_loc.bounding_box()
                        assert adv_box is not None and adv_box["height"] >= 44
                rt_proc_sel.select_option("optical_flow")
                rt_ramp_sel.select_option("hero_slowmo")
                page.wait_for_function(
                    "() => (document.getElementById('render-retime-preview')"
                    ".textContent || '').includes('minterpolate=fps=')"
                )
                rt_ramp_preview = page.locator("#render-retime-preview").text_content() or ""
                assert "mi_mode=mci" in rt_ramp_preview
                assert "if(lt(T," in rt_ramp_preview
                rt_proc_sel.select_option("nearest")
                rt_ramp_sel.select_option("constant")
                rt_rev.click()
                rt_chk.uncheck()

                # Verify Deliver Auto-Reframe & Social Crop + Program Monitor live frame
                rf_card = page.locator("#deliver-reframe-card")
                rf_chk = page.locator("#render-reframe-enabled")
                rf_pan_x = page.locator("#render-reframe-pan-x")
                rf_pan_y = page.locator("#render-reframe-pan-y")
                rf_reset = page.locator("#render-reframe-reset")
                rf_9_16 = page.locator(
                    '.reframe-deliver-preset-btn[data-deliver-reframe-ratio="9:16"]'
                )
                rf_4_5 = page.locator(
                    '.reframe-deliver-preset-btn[data-deliver-reframe-ratio="4:5"]'
                )
                rf_1_1 = page.locator(
                    '.reframe-deliver-preset-btn[data-deliver-reframe-ratio="1:1"]'
                )
                rf_scope = page.locator(
                    '.reframe-deliver-preset-btn[data-deliver-reframe-ratio="2.39:1"]'
                )
                assert rf_card.is_visible() is True
                assert rf_chk.is_checked() is False
                if width <= 820:
                    for rf_loc in (rf_pan_x, rf_pan_y, rf_reset, rf_9_16, rf_4_5, rf_1_1, rf_scope):
                        rf_box = rf_loc.bounding_box()
                        assert rf_box is not None and rf_box["height"] >= 44
                rf_9_16.click()
                assert rf_chk.is_checked() is True
                assert rf_9_16.get_attribute("aria-pressed") == "true"
                rf_pan_x.fill("0.4")
                rf_pan_x.dispatch_event("input")
                rf_pan_y.fill("-0.25")
                rf_pan_y.dispatch_event("input")
                page.wait_for_function(
                    "() => (document.getElementById('render-reframe-preview')"
                    ".textContent || '').includes('crop=w=')"
                )
                rf_preview = page.locator("#render-reframe-preview").text_content() or ""
                assert "ih*9/16" in rf_preview
                assert "1+(0.4000)" in rf_preview
                assert "1+(-0.2500)" in rf_preview
                page.locator("#btn-build-render-plan").click()
                page.wait_for_function(
                    "() => (document.getElementById('render-argv-output').textContent || '')"
                    ".includes('ih*9/16')"
                )
                rf_argv = page.locator("#render-argv-output").text_content() or ""
                rf_kv = page.locator("#render-plan-kv").text_content() or ""
                assert "1+(0.4000)" in rf_argv
                assert "1+(-0.2500)" in rf_argv
                assert "9:16 (0.40, -0.25)" in rf_kv
                rf_overflow = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert rf_overflow <= 0, (
                    f"Deliver reframe overflow at {width}x{height}: {rf_overflow}px"
                )
                page.locator("#tab-timeline").click()
                prog_with_rf = page.evaluate(
                    "() => document.getElementById('timeline-program-canvas').toDataURL()"
                )
                assert prog_with_rf != prog_without_lt
                page.locator("#tab-render").click()
                rf_reset.click()
                rf_chk.uncheck()

                # Switch to Burn-Ins & Looks tab for Film Grain & Cinematic Vignette
                page.locator("#render-tab-looks").click()
                assert page.locator("#render-tabpanel-looks").is_visible() is True

                # Verify Deliver Film Grain (35mm / 16mm / Super 8) + Program Monitor live frame
                fg_card = page.locator("#deliver-film-grain-card")
                fg_chk = page.locator("#render-film-grain-enabled")
                fg_strength = page.locator("#render-film-grain-strength")
                fg_temporal = page.locator("#render-film-grain-temporal")
                fg_35 = page.locator(
                    '.film-grain-deliver-preset-btn[data-deliver-film-grain-preset="35mm_fine"]'
                )
                fg_16 = page.locator(
                    '.film-grain-deliver-preset-btn[data-deliver-film-grain-preset="16mm_organic"]'
                )
                fg_s8 = page.locator(
                    '.film-grain-deliver-preset-btn[data-deliver-film-grain-preset="super8_heavy"]'
                )
                assert fg_card.is_visible() is True
                assert fg_chk.is_checked() is False
                assert fg_temporal.is_checked() is True
                if width <= 820:
                    for fg_loc in (fg_strength, fg_35, fg_16, fg_s8):
                        fg_box = fg_loc.bounding_box()
                        assert fg_box is not None and fg_box["height"] >= 44
                fg_16.click()
                assert fg_chk.is_checked() is True
                assert fg_16.get_attribute("aria-pressed") == "true"
                page.wait_for_function(
                    "() => (document.getElementById('render-film-grain-preview')"
                    ".textContent || '').includes('noise=alls=22:allf=t+u')"
                )
                fg_temporal.uncheck()
                fg_strength.fill("30")
                fg_strength.dispatch_event("input")
                page.wait_for_function(
                    "() => (document.getElementById('render-film-grain-preview')"
                    ".textContent || '').includes('noise=alls=30:allf=u')"
                )
                page.locator("#btn-build-render-plan").click()
                page.wait_for_function(
                    "() => (document.getElementById('render-argv-output').textContent || '')"
                    ".includes('noise=alls=')"
                )
                fg_argv = page.locator("#render-argv-output").text_content() or ""
                fg_kv = page.locator("#render-plan-kv").text_content() or ""
                assert "noise=alls=30:allf=u" in fg_argv
                assert "custom (30, U)" in fg_kv
                fg_overflow = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert fg_overflow <= 0, (
                    f"Deliver film grain overflow at {width}x{height}: {fg_overflow}px"
                )
                page.locator("#tab-timeline").click()
                prog_with_fg = page.evaluate(
                    "() => document.getElementById('timeline-program-canvas').toDataURL()"
                )
                assert prog_with_fg != prog_without_lt
                page.locator("#tab-render").click()
                fg_temporal.check()
                fg_chk.uncheck()

                # Verify Deliver Cinematic Vignette + Program Monitor live frame
                vig_card = page.locator("#deliver-vignette-card")
                vig_chk = page.locator("#render-vignette-enabled")
                vig_angle = page.locator("#render-vignette-angle")
                vig_mode = page.locator("#render-vignette-mode")
                vig_subtle = page.locator(
                    '.vignette-deliver-preset-btn[data-deliver-vignette-preset="subtle_cinema"]'
                )
                vig_moody = page.locator(
                    '.vignette-deliver-preset-btn[data-deliver-vignette-preset="moody_portrait"]'
                )
                vig_noir = page.locator(
                    '.vignette-deliver-preset-btn[data-deliver-vignette-preset="heavy_noir"]'
                )
                assert vig_card.is_visible() is True
                assert vig_chk.is_checked() is False
                assert vig_mode.input_value() == "forward"
                if width <= 820:
                    for vig_loc in (vig_angle, vig_mode, vig_subtle, vig_moody, vig_noir):
                        vig_box = vig_loc.bounding_box()
                        assert vig_box is not None and vig_box["height"] >= 44
                vig_moody.click()
                assert vig_chk.is_checked() is True
                assert vig_moody.get_attribute("aria-pressed") == "true"
                page.wait_for_function(
                    "() => (document.getElementById('render-vignette-preview')"
                    ".textContent || '').includes('vignette=angle=0.5585:mode=forward')"
                )
                vig_mode.select_option("backward")
                vig_angle.fill("40")
                vig_angle.dispatch_event("input")
                page.wait_for_function(
                    "() => (document.getElementById('render-vignette-preview')"
                    ".textContent || '').includes('vignette=angle=0.6981:mode=backward')"
                )
                page.locator("#btn-build-render-plan").click()
                page.wait_for_function(
                    "() => (document.getElementById('render-argv-output').textContent || '')"
                    ".includes('vignette=angle=')"
                )
                vig_argv = page.locator("#render-argv-output").text_content() or ""
                vig_kv = page.locator("#render-plan-kv").text_content() or ""
                assert "vignette=angle=0.6981:mode=backward" in vig_argv
                assert "custom (40.0 deg, backward)" in vig_kv
                vig_overflow = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert vig_overflow <= 0, (
                    f"Deliver vignette overflow at {width}x{height}: {vig_overflow}px"
                )
                page.locator("#tab-timeline").click()
                prog_with_vig = page.evaluate(
                    "() => document.getElementById('timeline-program-canvas').toDataURL()"
                )
                assert prog_with_vig != prog_without_lt
                page.locator("#tab-render").click()
                vig_mode.select_option("forward")
                vig_chk.uncheck()

                # Switch to Audio tab for Fairlight Voice Cleanup
                page.locator("#render-tab-audio").click()
                assert page.locator("#render-tabpanel-audio").is_visible() is True

                # Verify Deliver Fairlight Voice Cleanup
                vc_card = page.locator("#deliver-voice-cleanup-card")
                vc_chk = page.locator("#render-voice-cleanup-enabled")
                vc_hp = page.locator("#render-voice-cleanup-highpass")
                vc_pres = page.locator("#render-voice-cleanup-presence")
                vc_deess = page.locator("#render-voice-cleanup-deess")
                vc_yt = page.locator(
                    '.voice-cleanup-deliver-preset-btn[data-deliver-voice-cleanup-preset="youtube_voice"]'
                )
                vc_pod = page.locator(
                    '.voice-cleanup-deliver-preset-btn[data-deliver-voice-cleanup-preset="podcast_warm"]'
                )
                vc_bc = page.locator(
                    '.voice-cleanup-deliver-preset-btn[data-deliver-voice-cleanup-preset="broadcast_crisp"]'
                )
                assert vc_card.is_visible() is True
                assert vc_chk.is_checked() is False
                if width <= 820:
                    for vc_loc in (vc_hp, vc_pres, vc_deess, vc_yt, vc_pod, vc_bc):
                        vc_box = vc_loc.bounding_box()
                        assert vc_box is not None and vc_box["height"] >= 44
                vc_pod.click()
                assert vc_chk.is_checked() is True
                assert vc_pod.get_attribute("aria-pressed") == "true"
                page.wait_for_function(
                    "() => (document.getElementById('render-voice-cleanup-preview')"
                    ".textContent || '').includes("
                    "'highpass=f=65,equalizer=f=3200:t=q:w=1.2:g=1.5,deesser=i=0.25:m=0.50:f=0.50:s=o')"
                )
                vc_hp.fill("100")
                vc_hp.dispatch_event("input")
                vc_pres.fill("3.5")
                vc_pres.dispatch_event("input")
                vc_deess.fill("0.45")
                vc_deess.dispatch_event("input")
                page.wait_for_function(
                    "() => (document.getElementById('render-voice-cleanup-preview')"
                    ".textContent || '').includes("
                    "'highpass=f=100,equalizer=f=3200:t=q:w=1.2:g=3.5,deesser=i=0.45:m=0.50:f=0.50:s=o')"
                )
                page.locator("#btn-build-render-plan").click()
                page.wait_for_function(
                    "() => (document.getElementById('render-argv-output').textContent || '')"
                    ".includes('equalizer=f=3200')"
                )
                vc_argv = page.locator("#render-argv-output").text_content() or ""
                vc_kv = page.locator("#render-plan-kv").text_content() or ""
                assert (
                    "highpass=f=100,equalizer=f=3200:t=q:w=1.2:g=3.5,deesser=i=0.45:m=0.50:f=0.50:s=o"
                    in vc_argv
                )
                assert "custom (HP 100Hz, +3.5dB, DS 0.45)" in vc_kv
                vc_overflow = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert vc_overflow <= 0, (
                    f"Deliver voice cleanup overflow at {width}x{height}: {vc_overflow}px"
                )
                vc_chk.uncheck()

                # Switch to File tab and verify engine switch, paths & pinned footer
                page.locator("#render-tab-file").click()
                assert page.locator("#render-tabpanel-file").is_visible() is True
                assert page.locator("#render-input-path").is_visible() is True
                assert page.locator("#render-output-path").is_visible() is True
                assert page.locator("#btn-engine-local").is_visible() is True
                assert page.locator("#btn-engine-remote").is_visible() is True
                assert page.locator("#deliver-size-estimate").is_visible() is True
                assert page.locator("#btn-build-render-plan").is_visible() is True
                page.locator("#render-tab-video").click()
                assert page.locator("#render-tabpanel-video").is_visible() is True

                # Verify Deliver Timeline Chapters & YouTube/FFMETADATA/EDL/FCPXML exports
                chapters_preview = page.locator("#deliver-chapters-preview")
                btn_yt = page.locator("#btn-export-yt-chapters")
                btn_ff = page.locator("#btn-export-ffmetadata")
                btn_edl = page.locator("#btn-export-cmx-edl")
                btn_fcpxml = page.locator("#btn-export-fcpxml")
                assert chapters_preview.is_visible() is True
                assert btn_yt.is_visible() is True
                assert btn_ff.is_visible() is True
                assert btn_edl.is_visible() is True
                assert btn_fcpxml.is_visible() is True
                chapters_text = chapters_preview.text_content() or ""
                assert "00:00 Intro" in chapters_text
                assert "00:01 Intro Title Cue" in chapters_text
                # 375px and 1440px each retain +1 added marker (4 markers + 00:00 Intro = 5 CHP)
                expected_chp = "5 CHP" if width in (375, 1440) else "4 CHP"
                assert (
                    page.locator("#deliver-chapters-count").text_content() or ""
                ) == expected_chp
                if width <= 820:
                    for chp_btn in (btn_yt, btn_ff, btn_edl, btn_fcpxml):
                        chp_box = chp_btn.bounding_box()
                        assert chp_box is not None and chp_box["height"] >= 44

                with page.expect_download() as yt_dl_info:
                    btn_yt.click()
                yt_dl = yt_dl_info.value
                assert yt_dl.suggested_filename.endswith("_youtube_chapters.txt")
                yt_dl_path = yt_dl.path()
                assert yt_dl_path is not None
                yt_dl_content = Path(yt_dl_path).read_text(encoding="utf-8")
                assert "00:00 Intro\n00:01 Intro Title Cue" in yt_dl_content

                with page.expect_download() as ff_dl_info:
                    btn_ff.click()
                ff_dl = ff_dl_info.value
                assert ff_dl.suggested_filename.endswith("_ffmetadata.txt")
                ff_dl_path = ff_dl.path()
                assert ff_dl_path is not None
                ff_dl_content = Path(ff_dl_path).read_text(encoding="utf-8")
                assert ff_dl_content.startswith(";FFMETADATA1\n")
                assert "[CHAPTER]" in ff_dl_content
                assert "TIMEBASE=1/1000" in ff_dl_content
                assert "title=Intro Title Cue" in ff_dl_content

                with page.expect_download() as edl_dl_info:
                    btn_edl.click()
                edl_dl = edl_dl_info.value
                assert edl_dl.suggested_filename.endswith(".edl")
                edl_dl_path = edl_dl.path()
                assert edl_dl_path is not None
                edl_dl_content = Path(edl_dl_path).read_text(encoding="utf-8")
                assert edl_dl_content.startswith("TITLE: ")
                assert "FCM: NON-DROP FRAME\n" in edl_dl_content
                assert "001  AX       V     C        " in edl_dl_content
                assert "* FROM CLIP NAME: " in edl_dl_content
                edl_feedback = page.locator("#deliver-chapters-feedback").text_content() or ""
                assert ".edl" in edl_feedback

                with page.expect_download() as fcpxml_dl_info:
                    btn_fcpxml.click()
                fcpxml_dl = fcpxml_dl_info.value
                assert fcpxml_dl.suggested_filename.endswith(".fcpxml")
                fcpxml_dl_path = fcpxml_dl.path()
                assert fcpxml_dl_path is not None
                fcpxml_dl_content = Path(fcpxml_dl_path).read_text(encoding="utf-8")
                expected_hdr = (
                    '<?xml version="1.0" encoding="UTF-8"?>\n'
                    "<!DOCTYPE fcpxml>\n"
                    '<fcpxml version="1.10">'
                )
                assert fcpxml_dl_content.startswith(expected_hdr)
                assert "<resources>" in fcpxml_dl_content
                assert '<format id="r1"' in fcpxml_dl_content
                assert "<asset id=" in fcpxml_dl_content
                assert "<library>" in fcpxml_dl_content
                assert "<spine>" in fcpxml_dl_content
                assert "<asset-clip " in fcpxml_dl_content
                from taktcut.drp import parse_fcpxml
                parsed_fcpxml = parse_fcpxml(Path(fcpxml_dl_path))
                assert len(parsed_fcpxml.tracks) >= 1
                assert len(parsed_fcpxml.tracks[0].clips) >= 1
                fcpxml_feedback = page.locator("#deliver-chapters-feedback").text_content() or ""
                assert ".fcpxml" in fcpxml_feedback

                chapters_overflow = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert chapters_overflow <= 0, (
                    f"Deliver chapters overflow at {width}x{height}: {chapters_overflow}px"
                )

                # Verify Save Project / Open Project controls and round-trip in top bar
                assert page.locator("#btn-save-project").is_visible() is True
                assert page.locator("#btn-open-project").is_visible() is True

                assert not errors, f"Console/page errors at {width}x{height}: {errors}"
                assert not bad_http, f"HTTP errors at {width}x{height}: {bad_http}"
                ctx.close()
            browser.close()
    except Exception as exc:
        if "Executable doesn't exist" in str(exc):
            pytest.skip("Playwright Chromium browser binary unavailable")
        raise


def test_ui_project_export_and_import_roundtrip(ui_server: tuple[str, Path]) -> None:
    base_url, workspace = ui_server

    s_status, _, s_raw = _http_call(f"{base_url}/api/sample")
    assert s_status == 200
    sample_doc = json.loads(s_raw.decode("utf-8"))["document"]

    project_payload = {
        "schema_version": "taktcut.project.v1",
        "project_name": "Studio_Session_01",
        "timeline": sample_doc,
        "playhead_frame": 125,
        "timeline_zoom": 2.0,
        "snap_enabled": False,
        "bpm_grid": {"enabled": True, "bpm": 132.0, "offset_s": 0.25},
        "color": {
            "grade": {
                "lift": [-0.05, 0.0, 0.05],
                "gamma": [0.02, 0.0, -0.02],
                "gain": [0.08, 0.02, -0.06],
                "contrast": 1.15,
                "saturation": 1.2,
                "temperature": 0.1,
                "preserve_lightness": True,
            },
            "active_preset_id": "",
            "wipe_ratio": 0.6,
            "scope_mode": "waveform",
        },
        "fx": {
            "nodes": [
                {
                    "effect": "glow",
                    "enabled": True,
                    "params": {
                        "brightness": 1.1,
                        "width": 20.0,
                        "threshold": 0.4,
                        "tint": "#ffd8a8",
                    },
                    "keyframes": [{"time_s": 0.0, "value": 0.5, "easing": "linear"}],
                }
            ],
            "bypass_all": False,
            "active_preset_id": "",
            "chroma_key": {
                "preset": "studio_green",
                "key_color": "#00b140",
                "similarity": 0.2,
                "blend": 0.08,
                "despill": True,
                "despill_type": "green",
                "enabled": True,
            },
            "chroma_key_matte_view": "alpha_matte",
        },
        "title_overlay": {
            "preset_id": "broadcast_lower_third",
            "title": "MARC DUPONT",
            "subtitle": "Director",
            "position": "bottom-left",
            "accent_color": "#e68442",
            "start_s": 1.0,
            "end_s": 4.5,
            "font_size": 36,
            "box_opacity": 0.85,
            "enabled": True,
        },
        "subtitle_track": {
            "cues": [{"index": 1, "start_s": 0.5, "end_s": 2.5, "text": "Bonjour Studio"}],
            "style": "yellow_broadcast",
            "font_size": 36,
            "margin_bottom_pct": 0.09,
            "enabled": True,
        },
        "framing": {
            "framing": {
                "preset": "9:16",
                "mode": "fit",
                "pan_x": 0.0,
                "pan_y": 0.0,
                "enabled": True,
                "target_width": 1080,
                "target_height": 1920,
            },
            "safe_guides": {
                "enabled": True,
                "action_safe": True,
                "title_safe": True,
                "social_hud": False,
            },
        },
        "delivery": {
            "delivery_preset": "reels_tiktok_9_16",
            "profile": "web_h264",
            "container": "mp4",
            "video_crf": 18,
            "audio_bitrate_kbps": 192,
            "encoder_preset": "medium",
            "fps": "25",
            "target_lufs": -14.0,
            "lut_path": "",
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/reels_tiktok_9_16.mp4",
            "use_framing": True,
            "use_studio_cdl": True,
            "use_studio_fx": True,
            "use_studio_title": True,
            "use_studio_subtitles": True,
            "use_clip_audio": True,
            "use_clip_retime": True,
            "prefer_hw": True,
        },
    }

    ex_status, _, ex_raw = _http_call(
        f"{base_url}/api/project/export",
        method="POST",
        payload={
            "project": project_payload,
            "out_path": "projects/Studio_Session_01.taktcut.json",
        },
    )
    assert ex_status == 200
    ex_data = json.loads(ex_raw.decode("utf-8"))
    assert ex_data["schema_version"] == "taktcut.project.v1"
    assert ex_data["filename"] == "Studio_Session_01.taktcut.json"
    assert ex_data["saved_path"] == "projects/Studio_Session_01.taktcut.json"
    assert (workspace / "projects" / "Studio_Session_01.taktcut.json").is_file()

    # Import back from raw project_json string
    im_status, _, im_raw = _http_call(
        f"{base_url}/api/project/import",
        method="POST",
        payload={"project_json": ex_data["project_json"]},
    )
    assert im_status == 200
    im_data = json.loads(im_raw.decode("utf-8"))
    assert im_data["project"] == ex_data["project"]
    assert im_data["validation"]["valid"] is True

    # Import back from workspace path and base64
    path_status, _, path_raw = _http_call(
        f"{base_url}/api/project/import",
        method="POST",
        payload={"path": "projects/Studio_Session_01.taktcut.json"},
    )
    assert path_status == 200
    assert json.loads(path_raw.decode("utf-8"))["project"] == ex_data["project"]

    b64_status, _, b64_raw = _http_call(
        f"{base_url}/api/project/import",
        method="POST",
        payload={
            "content_base64": base64.b64encode(ex_data["project_json"].encode("utf-8")).decode(
                "ascii"
            )
        },
    )
    assert b64_status == 200
    assert json.loads(b64_raw.decode("utf-8"))["project"] == ex_data["project"]

    # Reject malformed JSON, NaN, bad schema, out-of-bounds, and path traversal
    for bad_body in (
        {"project_json": "{corrupted json"},
        {"project_json": '{"schema_version": "taktcut.project.v1", "playhead_frame": NaN}'},
        {"project_json": json.dumps({"schema_version": "bad.v9"})},
        {
            "project_json": json.dumps(
                {**ex_data["project"], "bpm_grid": {"enabled": True, "bpm": 999.0, "offset_s": 0.0}}
            )
        },
    ):
        bad_status, _, _ = _http_call(
            f"{base_url}/api/project/import",
            method="POST",
            payload=bad_body,
        )
        assert bad_status == 400

    raw_bad_status, _, _ = _http_call(
        f"{base_url}/api/project/import",
        method="POST",
        raw_bytes=b"{not valid json",
    )
    assert raw_bad_status == 400

    trav_status, _, _ = _http_call(
        f"{base_url}/api/project/export",
        method="POST",
        payload={"project": project_payload, "out_path": "../escape.taktcut.json"},
    )
    assert trav_status == 403


def test_ui_transform_compile_and_render_plan_endpoint(ui_server: tuple[str, Path]) -> None:
    base_url, workspace = ui_server
    media_file = workspace / "inputs" / "clip_xf.mp4"
    media_file.parent.mkdir(parents=True, exist_ok=True)
    media_file.write_bytes(b"placeholder")

    ok_status, _, ok_raw = _http_call(
        f"{base_url}/api/transform/compile",
        method="POST",
        payload={
            "zoom_pct": 28.0,
            "pos_x_pct": 32.0,
            "pos_y_pct": 32.0,
            "rotation_deg": -10.0,
            "opacity_pct": 90.0,
            "pix_fmt": "yuv420p",
        },
    )
    assert ok_status == 200
    compiled = json.loads(ok_raw.decode("utf-8"))
    assert compiled["is_identity"] is False
    assert "overlay=" in compiled["filtergraph"]
    assert "rotate=" in compiled["filtergraph"]
    assert compiled["ffmpeg_vf_args"][0] == "-vf"

    bad_status, _, _ = _http_call(
        f"{base_url}/api/transform/compile",
        method="POST",
        payload={"zoom_pct": 450.0},
    )
    assert bad_status == 400

    plan_status, _, plan_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": "inputs/clip_xf.mp4",
            "output_path": "renders/clip_xf_out.mp4",
            "profile": "web_h264",
            "fps": "25",
            "prefer_hw": False,
            "transform_params": {
                "zoom_pct": 115.0,
                "pos_x_pct": 0.0,
                "pos_y_pct": 0.0,
                "rotation_deg": 0.0,
                "opacity_pct": 100.0,
            },
            "execute": False,
        },
    )
    assert plan_status == 200
    plan = json.loads(plan_raw.decode("utf-8"))["plan"]
    assert plan["video_filter"] is not None
    assert "scale=w=ceil(iw*1.150000/2)*2" in plan["video_filter"]

    # Dynamic Zoom / Ken Burns endpoints
    dz_status, _, dz_raw = _http_call(
        f"{base_url}/api/transform/compile",
        method="POST",
        payload={"dynamic_zoom": "slow_zoom_in", "pix_fmt": "yuv420p"},
    )
    assert dz_status == 200
    dz_compiled = json.loads(dz_raw.decode("utf-8"))
    assert dz_compiled["is_identity"] is False
    assert dz_compiled["params"]["dynamic_zoom"] == "slow_zoom_in"
    assert "eval=frame" in dz_compiled["filtergraph"]

    bad_dz_status, _, _ = _http_call(
        f"{base_url}/api/transform/compile",
        method="POST",
        payload={"dynamic_zoom": "bogus_ken_burns"},
    )
    assert bad_dz_status == 400

    dz_plan_status, _, dz_plan_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": "inputs/clip_xf.mp4",
            "output_path": "renders/clip_dz_out.mp4",
            "profile": "web_h264",
            "fps": "25",
            "prefer_hw": False,
            "transform_params": {"dynamic_zoom": "pan_right_to_left"},
            "execute": False,
        },
    )
    assert dz_plan_status == 200
    dz_plan = json.loads(dz_plan_raw.decode("utf-8"))["plan"]
    assert dz_plan["video_filter"] is not None
    assert "crop=" in dz_plan["video_filter"]


def test_ui_auto_duck_compile_and_vu_meter_assets(ui_server: tuple[str, Path]) -> None:
    base_url, _ = ui_server

    off_status, _, off_raw = _http_call(
        f"{base_url}/api/audio/duck/compile",
        method="POST",
        payload={"enabled": False, "threshold_db": -24.0},
    )
    assert off_status == 200
    off_data = json.loads(off_raw.decode("utf-8"))
    assert off_data["is_identity"] is True
    assert off_data["filtergraph"] == ""
    assert off_data["ffmpeg_args"] == []

    on_status, _, on_raw = _http_call(
        f"{base_url}/api/audio/duck/compile",
        method="POST",
        payload={
            "enabled": True,
            "threshold_db": -18.0,
            "ratio": 8.0,
            "attack_ms": 25.0,
            "release_ms": 600.0,
            "mix_sidechain": True,
        },
    )
    assert on_status == 200
    on_data = json.loads(on_raw.decode("utf-8"))
    assert on_data["is_identity"] is False
    assert "sidechaincompress=" in on_data["filtergraph"]
    assert "ratio=8.00:attack=25.0:release=600.0" in on_data["filtergraph"]

    bad_status, _, _ = _http_call(
        f"{base_url}/api/audio/duck/compile",
        method="POST",
        payload={"enabled": True, "threshold_db": -2.0},
    )
    assert bad_status == 400

    # Verify VU meter & Auto-Duck DOM hooks + zero innerHTML / zero em-en-dash in UI assets
    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    assert 'id="timeline-vu-meter"' in html_text
    assert 'id="btn-auto-duck-toggle"' in html_text
    assert 'id="auto-duck-threshold-range"' in html_text
    for asset_name in (
        "index.html",
        "app.js",
        "canvas.js",
        "timeline_ops.js",
        "i18n.js",
        "styles.css",
    ):
        content = (assets_dir / asset_name).read_text(encoding="utf-8")
        assert "\u2014" not in content, f"U+2014 found in {asset_name}"
        assert "\u2013" not in content, f"U+2013 found in {asset_name}"
        if asset_name.endswith(".js"):
            assert "innerHTML" not in content, f"innerHTML sink found in {asset_name}"


def test_ui_sapphire_optical_glow_and_rgb_split_endpoints_and_assets(
    ui_server: tuple[str, Path],
) -> None:
    base_url, _ = ui_server

    presets_status, _, presets_raw = _http_call(f"{base_url}/api/fx/presets")
    assert presets_status == 200
    presets_data = json.loads(presets_raw.decode("utf-8"))
    preset_ids = {p["id"] for p in presets_data["presets"]}
    assert {"cyberpunk_glow", "anamorphic_dream"}.issubset(preset_ids)
    assert "optical_glow" in presets_data["specs"]
    assert "rgb_split" in presets_data["specs"]

    compile_status, _, compile_raw = _http_call(
        f"{base_url}/api/fx/compile",
        method="POST",
        payload={
            "nodes": [
                {
                    "effect": "optical_glow",
                    "enabled": True,
                    "params": {"glow_intensity": 0.65, "glow_radius": 12.0},
                },
                {
                    "effect": "rgb_split",
                    "enabled": True,
                    "params": {"chroma_shift_px": 7},
                },
            ],
            "duration_seconds": 6.0,
        },
    )
    assert compile_status == 200
    compiled = json.loads(compile_raw.decode("utf-8"))
    assert compiled["active_effects"] == ["optical_glow", "rgb_split"]
    assert "split[g0][g1];[g1]gblur=sigma=12.00[gb]" in compiled["filtergraph"]
    assert "blend=all_mode=screen:all_opacity=0.6500" in compiled["filtergraph"]
    assert "rgbashift=rh=7:bh=-7" in compiled["filtergraph"]

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    assert 'data-fx-add="optical_glow"' in html_text
    assert 'data-fx-add="rgb_split"' in html_text
    assert 'data-fx-preset="cyberpunk_glow"' in html_text
    assert 'data-fx-preset="anamorphic_dream"' in html_text
    demo_js = (assets_dir / "demo_adapter.js").read_text(encoding="utf-8")
    assert "\u2014" not in demo_js and "\u2013" not in demo_js
    assert "innerHTML" not in demo_js


def test_ui_fairlight_loudness_and_dialogue_eq_endpoints_and_assets(
    ui_server: tuple[str, Path],
) -> None:
    base_url, _ = ui_server

    comp_status, _, comp_raw = _http_call(
        f"{base_url}/api/audio/compile",
        method="POST",
        payload={
            "gain_db": -1.5,
            "loudness_preset": "reels_16",
            "dialogue_eq": "voice_clarity",
        },
    )
    assert comp_status == 200
    comp_data = json.loads(comp_raw.decode("utf-8"))
    assert comp_data["loudness_preset"] == "reels_16"
    assert comp_data["dialogue_eq"] == "voice_clarity"
    assert comp_data["filtergraph"] == (
        "volume=-1.50dB,highpass=f=80,equalizer=f=3000:t=q:w=1.2:g=3,"
        "loudnorm=I=-16.0:TP=-1.0:LRA=11"
    )

    for bad_payload in (
        {"loudness_preset": "invalid_lufs"},
        {"dialogue_eq": "highpass=f=80;evil"},
        {"fairlight": "not-an-object"},
        {"fairlight": {"loudness_preset": "off", "extra_key": 1}},
    ):
        bad_status, _, _ = _http_call(
            f"{base_url}/api/audio/compile",
            method="POST",
            payload=bad_payload,
        )
        assert bad_status == 400

    plan_status, _, plan_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/fairlight_broadcast.mp4",
            "profile": "web_h264",
            "loudness_preset": "broadcast_23",
            "dialogue_eq": "podcast_warm",
            "prefer_hw": False,
            "execute": False,
        },
    )
    assert plan_status == 200
    plan_data = json.loads(plan_raw.decode("utf-8"))
    assert plan_data["plan"]["loudness_preset"] == "broadcast_23"
    assert plan_data["plan"]["dialogue_eq"] == "podcast_warm"
    assert plan_data["plan"]["target_lufs"] == -23.0
    assert plan_data["plan"]["audio_filter"] == (
        "highpass=f=70,equalizer=f=180:t=q:w=1.0:g=2,equalizer=f=4000:t=q:w=1.2:g=2,"
        "loudnorm=I=-23.0:TP=-1.0:LRA=11"
    )

    bad_plan_status, _, _ = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/bad.mp4",
            "loudness_preset": "unknown_target",
        },
    )
    assert bad_plan_status == 400

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    for elem_id in (
        "timeline-fairlight-dock",
        "fairlight-dialogue-eq",
        "fairlight-loudness-preset",
        "fairlight-status-badge",
        "fairlight-af-preview",
        "btn-fairlight-reset",
        "render-loudness-preset",
        "render-dialogue-eq",
        "render-audio-af-preview",
    ):
        assert f'id="{elem_id}"' in html_text

    i18n_text = (assets_dir / "i18n.js").read_text(encoding="utf-8")
    assert '"Fairlight Dialogue EQ & Loudness"' in i18n_text
    assert '"Fairlight EQ Dialogue & Sonie"' in i18n_text
    assert '"Normaliseur Sonie Cible"' in i18n_text

    for asset_name in (
        "index.html",
        "app.js",
        "canvas.js",
        "timeline_ops.js",
        "demo_adapter.js",
        "i18n.js",
        "styles.css",
    ):
        content = (assets_dir / asset_name).read_text(encoding="utf-8")
        assert "\u2014" not in content, f"U+2014 found in {asset_name}"
        assert "\u2013" not in content, f"U+2013 found in {asset_name}"
        if asset_name.endswith(".js"):
            assert "innerHTML" not in content, f"innerHTML sink found in {asset_name}"


def test_ui_sapphire_halation_letterbox_cinema_35mm_endpoints_and_assets(
    ui_server: tuple[str, Path],
) -> None:
    base_url, _ = ui_server

    presets_status, _, presets_raw = _http_call(f"{base_url}/api/fx/presets")
    assert presets_status == 200
    presets_data = json.loads(presets_raw.decode("utf-8"))
    preset_ids = {p["id"] for p in presets_data["presets"]}
    assert "cinema_35mm" in preset_ids
    assert "halation" in presets_data["specs"]
    assert "letterbox" in presets_data["specs"]
    lb_spec = presets_data["specs"]["letterbox"][0]
    assert lb_spec["kind"] == "enum"
    assert lb_spec["options"] == ["2.39", "2.35", "1.85", "2.00"]

    compile_status, _, compile_raw = _http_call(
        f"{base_url}/api/fx/compile",
        method="POST",
        payload={"preset_id": "cinema_35mm", "duration_seconds": 8.0},
    )
    assert compile_status == 200
    compiled = json.loads(compile_raw.decode("utf-8"))
    assert compiled["active_effects"] == ["halation", "letterbox", "film_grain"]
    assert "split[hal0_base][hal0_src]" in compiled["filtergraph"]
    assert "drawbox=x=0:y=0:w=iw:h='round(ih*0.1281)'" in compiled["filtergraph"]
    assert "noise=alls=14:allf=t+u" in compiled["filtergraph"]

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    assert 'data-fx-add="halation"' in html_text
    assert 'data-fx-add="letterbox"' in html_text
    assert 'data-fx-preset="cinema_35mm"' in html_text
    assert "24 FX" in html_text

    for asset_name in (
        "index.html",
        "app.js",
        "canvas.js",
        "demo_adapter.js",
        "i18n.js",
    ):
        content = (assets_dir / asset_name).read_text(encoding="utf-8")
        assert "\u2014" not in content, f"U+2014 found in {asset_name}"
        assert "\u2013" not in content, f"U+2013 found in {asset_name}"
        if asset_name.endswith(".js"):
            assert "innerHTML" not in content, f"innerHTML sink found in {asset_name}"


def test_ui_render_plan_dry_run_without_ffmpeg(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(shutil, "which", lambda _name: None)
    sample_in = tmp_path / ".taktcut-samples" / "sample_rec709.mp4"
    sample_in.parent.mkdir(parents=True, exist_ok=True)
    sample_in.write_bytes(b"fake-mp4")

    server = create_ui_server(host="127.0.0.1", port=0, workspace_dir=tmp_path)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address[0], server.server_address[1]
    host_s = host.decode("ascii") if isinstance(host, bytes) else str(host)
    base_url = f"http://{host_s}:{port}"
    try:
        dry_status, _, dry_raw = _http_call(
            f"{base_url}/api/render/plan",
            method="POST",
            payload={
                "input_path": ".taktcut-samples/sample_rec709.mp4",
                "output_path": "renders/youtube_4k_hevc.mp4",
                "delivery_preset": "youtube_4k_hevc",
                "prefer_hw": True,
                "execute": False,
            },
        )
        assert dry_status == 200
        dry_data = json.loads(dry_raw.decode("utf-8"))
        assert dry_data["plan"]["encoder"] == "libx265"
        assert "320k" in dry_data["plan"]["argv"]
        assert "3840" in dry_data["shell_command"]

        exec_status, _, exec_raw = _http_call(
            f"{base_url}/api/render/plan",
            method="POST",
            payload={
                "input_path": ".taktcut-samples/sample_rec709.mp4",
                "output_path": "renders/youtube_4k_hevc.mp4",
                "delivery_preset": "youtube_4k_hevc",
                "prefer_hw": False,
                "execute": True,
            },
        )
        assert exec_status == 422
        assert "ffmpeg" in json.loads(exec_raw.decode("utf-8"))["error"].lower()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_ui_dynamic_zoom_assets_and_i18n_parity(ui_server: tuple[str, Path]) -> None:
    base_url, _ = ui_server
    html_status, _, html_raw = _http_call(f"{base_url}/")
    assert html_status == 200
    html_text = html_raw.decode("utf-8")
    for preset in (
        "off",
        "slow_zoom_in",
        "slow_zoom_out",
        "pan_left_to_right",
        "pan_right_to_left",
    ):
        assert f'value="{preset}"' in html_text

    for asset in ("timeline_ops.js", "app.js", "demo_adapter.js", "i18n.js", "styles.css"):
        status, _, raw = _http_call(f"{base_url}/{asset}")
        assert status == 200
        text = raw.decode("utf-8")
        assert "\u2013" not in text and "\u2014" not in text
        if asset.endswith(".js"):
            assert "innerHTML" not in text

    _, _, ops_raw = _http_call(f"{base_url}/timeline_ops.js")
    ops_text = ops_raw.decode("utf-8")
    assert "compileDynamicZoomFilterClient" in ops_text
    assert "DYNAMIC_ZOOM_PRESETS" in ops_text

    _, _, i18n_raw = _http_call(f"{base_url}/i18n.js")
    i18n_text = i18n_raw.decode("utf-8")
    for key in (
        "timeline.transform.dynamicZoom",
        "timeline.transform.dzOff",
        "timeline.transform.dzSlowIn",
        "timeline.transform.dzSlowOut",
        "timeline.transform.dzPanL2R",
        "timeline.transform.dzPanR2L",
    ):
        assert i18n_text.count(f'"{key}"') == 2

    _, _, css_raw = _http_call(f"{base_url}/styles.css")
    css_text = css_raw.decode("utf-8")
    assert ".transform-dz-row" in css_text
    assert "max-width: 820px" in css_text


def test_ui_sapphire_camera_shake_lens_distortion_action_handheld_endpoints_and_assets(
    ui_server: tuple[str, Path],
) -> None:
    base_url, _ = ui_server

    presets_status, _, presets_raw = _http_call(f"{base_url}/api/fx/presets")
    assert presets_status == 200
    presets_data = json.loads(presets_raw.decode("utf-8"))
    preset_ids = {p["id"] for p in presets_data["presets"]}
    assert "action_handheld" in preset_ids
    assert "camera_shake" in presets_data["specs"]
    assert "lens_distortion" in presets_data["specs"]

    compile_status, _, compile_raw = _http_call(
        f"{base_url}/api/fx/compile",
        method="POST",
        payload={"preset_id": "action_handheld", "duration_seconds": 6.0},
    )
    assert compile_status == 200
    compiled = json.loads(compile_raw.decode("utf-8"))
    assert compiled["active_effects"] == ["camera_shake", "rgb_split", "vignette"]
    assert "scale=w=iw+20:h=ih+20:flags=bilinear" in compiled["filtergraph"]
    assert "rgbashift=rh=2:bh=-2" in compiled["filtergraph"]
    assert "vignette=angle=0.520" in compiled["filtergraph"]

    lens_status, _, lens_raw = _http_call(
        f"{base_url}/api/fx/compile",
        method="POST",
        payload={
            "nodes": [{"effect": "lens_distortion", "enabled": True, "params": {"k1": -0.3}}],
            "duration_seconds": 4.0,
        },
    )
    assert lens_status == 200
    lens_compiled = json.loads(lens_raw.decode("utf-8"))
    assert lens_compiled["filtergraph"] == "lenscorrection=cx=0.5:cy=0.5:k1=-0.3000:k2=0"

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    assert 'data-fx-add="camera_shake"' in html_text
    assert 'data-fx-add="lens_distortion"' in html_text
    assert 'data-fx-preset="action_handheld"' in html_text
    assert "24 FX" in html_text

    i18n_text = (assets_dir / "i18n.js").read_text(encoding="utf-8")
    for key in (
        "fx.preset.actionHandheld",
        "fx.add.camera_shake",
        "fx.add.lens_distortion",
        "fx.param.amplitude_px",
        "fx.param.frequency_hz",
        "fx.param.k1",
    ):
        assert i18n_text.count(f'"{key}"') == 2

    css_text = (assets_dir / "styles.css").read_text(encoding="utf-8")
    assert "#panel-fx .fx-preset-btn" in css_text

    for asset_name in (
        "index.html",
        "app.js",
        "canvas.js",
        "demo_adapter.js",
        "i18n.js",
        "styles.css",
    ):
        content = (assets_dir / asset_name).read_text(encoding="utf-8")
        assert "\u2014" not in content, f"U+2014 found in {asset_name}"
        assert "\u2013" not in content, f"U+2013 found in {asset_name}"
        if asset_name.endswith(".js"):
            assert "innerHTML" not in content, f"innerHTML sink found in {asset_name}"


def test_ui_sapphire_scanlines_unsharp_mask_retro_vhs_endpoints_and_assets(
    ui_server: tuple[str, Path],
) -> None:
    base_url, _ = ui_server

    presets_status, _, presets_raw = _http_call(f"{base_url}/api/fx/presets")
    assert presets_status == 200
    presets_data = json.loads(presets_raw.decode("utf-8"))
    preset_ids = {p["id"] for p in presets_data["presets"]}
    assert "retro_vhs" in preset_ids
    assert "scanlines" in presets_data["specs"]
    assert "unsharp_mask" in presets_data["specs"]

    compile_status, _, compile_raw = _http_call(
        f"{base_url}/api/fx/compile",
        method="POST",
        payload={"preset_id": "retro_vhs", "duration_seconds": 6.0},
    )
    assert compile_status == 200
    compiled = json.loads(compile_raw.decode("utf-8"))
    assert compiled["active_effects"] == ["scanlines", "rgb_split", "film_grain"]
    assert "drawgrid=w=0:h=4:t=1:c=black@0.4500" in compiled["filtergraph"]
    assert "rgbashift=rh=4:bh=-4" in compiled["filtergraph"]
    assert "noise=alls=18:allf=t+u" in compiled["filtergraph"]

    unsharp_status, _, unsharp_raw = _http_call(
        f"{base_url}/api/fx/compile",
        method="POST",
        payload={
            "nodes": [
                {
                    "effect": "unsharp_mask",
                    "enabled": True,
                    "params": {"sharpen_amount": 1.5},
                }
            ],
            "duration_seconds": 4.0,
        },
    )
    assert unsharp_status == 200
    unsharp_compiled = json.loads(unsharp_raw.decode("utf-8"))
    assert unsharp_compiled["filtergraph"] == "unsharp=5:5:1.5000:5:5:0.0"

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    assert 'data-fx-add="scanlines"' in html_text
    assert 'data-fx-add="unsharp_mask"' in html_text
    assert 'data-fx-preset="retro_vhs"' in html_text
    assert "24 FX" in html_text

    i18n_text = (assets_dir / "i18n.js").read_text(encoding="utf-8")
    for key in (
        "fx.preset.retroVhs",
        "fx.add.scanlines",
        "fx.add.unsharp_mask",
        "fx.param.line_spacing_px",
        "fx.param.opacity",
        "fx.param.sharpen_amount",
    ):
        assert i18n_text.count(f'"{key}"') == 2

    for asset_name in (
        "index.html",
        "app.js",
        "canvas.js",
        "demo_adapter.js",
        "i18n.js",
        "styles.css",
    ):
        content = (assets_dir / asset_name).read_text(encoding="utf-8")
        assert "\u2014" not in content, f"U+2014 found in {asset_name}"
        assert "\u2013" not in content, f"U+2013 found in {asset_name}"
        if asset_name.endswith(".js"):
            assert "innerHTML" not in content, f"innerHTML sink found in {asset_name}"


def test_ui_sapphire_hue_shift_mirror_flip_neon_shift_endpoints_and_assets(
    ui_server: tuple[str, Path],
) -> None:
    base_url, _ = ui_server

    presets_status, _, presets_raw = _http_call(f"{base_url}/api/fx/presets")
    assert presets_status == 200
    presets_data = json.loads(presets_raw.decode("utf-8"))
    preset_ids = {p["id"] for p in presets_data["presets"]}
    assert "neon_shift" in preset_ids
    assert "hue_shift" in presets_data["specs"]
    assert "mirror_flip" in presets_data["specs"]

    compile_status, _, compile_raw = _http_call(
        f"{base_url}/api/fx/compile",
        method="POST",
        payload={"preset_id": "neon_shift", "duration_seconds": 6.0},
    )
    assert compile_status == 200
    compiled = json.loads(compile_raw.decode("utf-8"))
    assert compiled["active_effects"] == ["hue_shift", "optical_glow", "vignette"]
    assert "hue=h=45.00:s=1.4500" in compiled["filtergraph"]
    assert "gblur=sigma=14.00" in compiled["filtergraph"]
    assert "vignette=angle=0.580" in compiled["filtergraph"]

    mirror_status, _, mirror_raw = _http_call(
        f"{base_url}/api/fx/compile",
        method="POST",
        payload={
            "nodes": [
                {
                    "effect": "mirror_flip",
                    "enabled": True,
                    "params": {"axis": "both"},
                }
            ],
            "duration_seconds": 4.0,
        },
    )
    assert mirror_status == 200
    mirror_compiled = json.loads(mirror_raw.decode("utf-8"))
    assert mirror_compiled["filtergraph"] == "hflip,vflip"

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    assert 'data-fx-add="hue_shift"' in html_text
    assert 'data-fx-add="mirror_flip"' in html_text
    assert 'data-fx-preset="neon_shift"' in html_text
    assert "24 FX" in html_text

    i18n_text = (assets_dir / "i18n.js").read_text(encoding="utf-8")
    for key in (
        "fx.preset.neonShift",
        "fx.add.hue_shift",
        "fx.add.mirror_flip",
        "fx.param.hue_deg",
        "fx.param.saturation",
        "fx.param.axis",
        "fx.enum.axis.horizontal",
        "fx.enum.axis.vertical",
        "fx.enum.axis.both",
    ):
        assert i18n_text.count(f'"{key}"') == 2

    for asset_name in (
        "index.html",
        "app.js",
        "canvas.js",
        "demo_adapter.js",
        "i18n.js",
        "styles.css",
    ):
        content = (assets_dir / asset_name).read_text(encoding="utf-8")
        assert "\u2014" not in content, f"U+2014 found in {asset_name}"
        assert "\u2013" not in content, f"U+2013 found in {asset_name}"
        if asset_name.endswith(".js"):
            assert "innerHTML" not in content, f"innerHTML sink found in {asset_name}"


def test_ui_sapphire_mosaic_pixelate_invert_negative_retro_arcade_endpoints_and_assets(
    ui_server: tuple[str, Path],
) -> None:
    base_url, _ = ui_server

    presets_status, _, presets_raw = _http_call(f"{base_url}/api/fx/presets")
    assert presets_status == 200
    presets_data = json.loads(presets_raw.decode("utf-8"))
    preset_ids = {p["id"] for p in presets_data["presets"]}
    assert "retro_arcade" in preset_ids
    assert "mosaic_pixelate" in presets_data["specs"]
    assert "invert_negative" in presets_data["specs"]

    compile_status, _, compile_raw = _http_call(
        f"{base_url}/api/fx/compile",
        method="POST",
        payload={"preset_id": "retro_arcade", "duration_seconds": 6.0},
    )
    assert compile_status == 200
    compiled = json.loads(compile_raw.decode("utf-8"))
    assert compiled["active_effects"] == ["mosaic_pixelate", "scanlines", "rgb_split"]
    assert "pixelize=w=10:h=10" in compiled["filtergraph"]
    assert "drawgrid=w=0:h=4:t=1:c=black@0.4500" in compiled["filtergraph"]
    assert "rgbashift=rh=3:bh=-3" in compiled["filtergraph"]

    inv_status, _, inv_raw = _http_call(
        f"{base_url}/api/fx/compile",
        method="POST",
        payload={
            "nodes": [
                {
                    "effect": "invert_negative",
                    "enabled": True,
                    "params": {"mode": "luma"},
                }
            ],
            "duration_seconds": 4.0,
        },
    )
    assert inv_status == 200
    inv_compiled = json.loads(inv_raw.decode("utf-8"))
    assert inv_compiled["filtergraph"] == "format=yuv444p,negate=components=y:negate_alpha=0"

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    assert 'data-fx-add="mosaic_pixelate"' in html_text
    assert 'data-fx-add="invert_negative"' in html_text
    assert 'data-fx-preset="retro_arcade"' in html_text
    assert "24 FX" in html_text

    i18n_text = (assets_dir / "i18n.js").read_text(encoding="utf-8")
    for key in (
        "fx.preset.retroArcade",
        "fx.add.mosaic_pixelate",
        "fx.add.invert_negative",
        "fx.param.block_size_px",
        "fx.param.mode",
        "fx.enum.mode.rgb",
        "fx.enum.mode.luma",
    ):
        assert i18n_text.count(f'"{key}"') == 2

    for asset_name in (
        "index.html",
        "app.js",
        "canvas.js",
        "demo_adapter.js",
        "i18n.js",
        "styles.css",
    ):
        content = (assets_dir / asset_name).read_text(encoding="utf-8")
        assert "\u2014" not in content, f"U+2014 found in {asset_name}"
        assert "\u2013" not in content, f"U+2013 found in {asset_name}"
        if asset_name.endswith(".js"):
            assert "innerHTML" not in content, f"innerHTML sink found in {asset_name}"


def test_ui_render_plan_timecode_burnin_endpoint_and_assets(
    ui_server: tuple[str, Path],
) -> None:
    base_url, _ = ui_server

    for pos, expected_coords in (
        ("top_left", "x=24:y=24"),
        ("bottom_center", "x=(w-tw)/2:y=h-th-24"),
        ("bottom_right", "x=w-tw-24:y=h-th-24"),
    ):
        status, _, raw = _http_call(
            f"{base_url}/api/render/plan",
            method="POST",
            payload={
                "input_path": ".taktcut-samples/sample_rec709.mp4",
                "output_path": f"renders/tc_{pos}.mp4",
                "profile": "web_h264",
                "fps": "25",
                "timecode_burnin": pos,
                "prefer_hw": False,
                "execute": False,
            },
        )
        assert status == 200
        plan = json.loads(raw.decode("utf-8"))["plan"]
        assert plan["timecode_burnin"] == pos
        assert "drawtext=" in plan["video_filter"]
        assert "timecode='00\\:00\\:00\\:00':rate=25" in plan["video_filter"]
        assert expected_coords in plan["video_filter"]

    bad_status, _, _ = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/tc_bad.mp4",
            "timecode_burnin": "top_right",
            "execute": False,
        },
    )
    assert bad_status == 400

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    assert 'id="render-timecode-burnin"' in html_text

    i18n_text = (assets_dir / "i18n.js").read_text(encoding="utf-8")
    for key in (
        "render.label.timecodeBurnin",
        "render.timecode.off",
        "render.timecode.top_left",
        "render.timecode.bottom_center",
        "render.timecode.bottom_right",
        "render.plan.timecodeBurnin",
    ):
        assert i18n_text.count(f'"{key}"') == 2


def test_ui_render_plan_review_watermark_endpoint_and_assets(
    ui_server: tuple[str, Path],
) -> None:
    base_url, _ = ui_server

    status, _, raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/wm_review.mp4",
            "profile": "web_h264",
            "fps": "25",
            "review_watermark_text": "DRAFT - CLIENT REVIEW",
            "review_watermark_opacity": 0.45,
            "prefer_hw": False,
            "execute": False,
        },
    )
    assert status == 200
    plan = json.loads(raw.decode("utf-8"))["plan"]
    assert plan["review_watermark_text"] == "DRAFT - CLIENT REVIEW"
    assert plan["review_watermark_opacity"] == pytest.approx(0.45)
    assert (
        "text='DRAFT - CLIENT REVIEW':fontsize=42"
        ":fontcolor=white@0.45:x=(w-text_w)/2:y=(h-text_h)/2"
    ) in plan["video_filter"]

    for bad_payload in (
        {"review_watermark_text": "A" * 41},
        {"review_watermark_text": "DRAFT;evil"},
        {"review_watermark_text": "CLIENT:REVIEW"},
        {"review_watermark_opacity": 0.10},
        {"review_watermark_opacity": 0.90},
    ):
        bad_status, _, _ = _http_call(
            f"{base_url}/api/render/plan",
            method="POST",
            payload={
                "input_path": ".taktcut-samples/sample_rec709.mp4",
                "output_path": "renders/wm_bad.mp4",
                "execute": False,
                **bad_payload,
            },
        )
        assert bad_status == 400

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    assert 'id="render-watermark-text"' in html_text
    assert 'id="render-watermark-opacity"' in html_text
    assert 'data-watermark-preset="DRAFT - CLIENT REVIEW"' in html_text
    assert 'data-watermark-preset="CONFIDENTIAL"' in html_text

    i18n_text = (assets_dir / "i18n.js").read_text(encoding="utf-8")
    for key in (
        "render.label.reviewWatermark",
        "render.watermark.placeholder",
        "render.watermark.preset.off",
        "render.watermark.preset.draft",
        "render.watermark.preset.confidential",
        "render.label.watermarkOpacity",
        "render.plan.reviewWatermark",
    ):
        assert i18n_text.count(f'"{key}"') == 2


def test_ui_render_plan_export_fps_and_deinterlace_endpoint_and_assets(
    ui_server: tuple[str, Path],
) -> None:
    base_url, _ = ui_server

    for fps_opt in ("source", "24", "25", "30", "60"):
        for deint in (False, True):
            status, _, raw = _http_call(
                f"{base_url}/api/render/plan",
                method="POST",
                payload={
                    "input_path": ".taktcut-samples/sample_rec709.mp4",
                    "output_path": f"renders/fps_{fps_opt}_{deint}.mp4",
                    "profile": "web_h264",
                    "fps": "25",
                    "export_fps": fps_opt,
                    "deinterlace": deint,
                    "prefer_hw": False,
                    "execute": False,
                },
            )
            assert status == 200
            plan = json.loads(raw.decode("utf-8"))["plan"]
            assert plan["export_fps"] == fps_opt
            assert plan["deinterlace"] is deint
            expected_num = 25 if fps_opt == "source" else int(fps_opt)
            assert plan["fps"] == {"num": expected_num, "den": 1}
            assert plan["gop_frames"] == 2 * expected_num
            vf = plan["video_filter"]
            if deint and fps_opt != "source":
                assert vf == f"yadif=mode=0:parity=-1:deint=0,fps={fps_opt}"
            elif deint:
                assert vf == "yadif=mode=0:parity=-1:deint=0"
            elif fps_opt != "source":
                assert vf == f"fps={fps_opt}"
            else:
                assert vf is None

    for bad_payload in (
        {"export_fps": "120"},
        {"export_fps": 24},
        {"export_fps": "24;evil"},
        {"deinterlace": "true"},
        {"deinterlace": 1},
    ):
        bad_status, _, _ = _http_call(
            f"{base_url}/api/render/plan",
            method="POST",
            payload={
                "input_path": ".taktcut-samples/sample_rec709.mp4",
                "output_path": "renders/fps_bad.mp4",
                "execute": False,
                **bad_payload,
            },
        )
        assert bad_status == 400

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    assert 'id="render-export-fps"' in html_text
    assert 'id="render-deinterlace"' in html_text

    i18n_text = (assets_dir / "i18n.js").read_text(encoding="utf-8")
    for key in (
        "render.label.exportFps",
        "render.exportFps.source",
        "render.plan.exportFps",
        "render.check.deinterlace",
        "render.plan.deinterlace",
    ):
        assert i18n_text.count(f'"{key}"') == 2

    for asset_file in assets_dir.iterdir():
        if asset_file.is_file() and asset_file.suffix in {".html", ".js", ".css"}:
            content = asset_file.read_text(encoding="utf-8")
            assert "innerHTML" not in content, f"innerHTML sink found in {asset_file.name}"
            assert "\u2013" not in content and "\u2014" not in content, (
                f"En/em dash found in {asset_file.name}"
            )


def test_ui_deliver_chapters_and_ffmetadata_assets() -> None:
    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    for elem_id in (
        "deliver-chapters-preview",
        "deliver-chapters-count",
        "deliver-chapters-feedback",
        "btn-export-yt-chapters",
        "btn-export-ffmetadata",
        "btn-export-cmx-edl",
        "btn-export-fcpxml",
    ):
        assert f'id="{elem_id}"' in html_text

    i18n_text = (assets_dir / "i18n.js").read_text(encoding="utf-8")
    for key in (
        "render.chapters.title",
        "render.chapters.previewLabel",
        "render.chapters.exportYt",
        "render.chapters.exportFfmeta",
        "render.chapters.exportEdl",
        "render.chapters.exportFcpxml",
        "render.chapters.empty",
        "render.chapters.emptyEdl",
        "render.chapters.emptyFcpxml",
        "render.chapters.exportedYt",
        "render.chapters.exportedFfmeta",
        "render.chapters.exportedEdl",
        "render.chapters.exportedFcpxml",
    ):
        assert i18n_text.count(f'"{key}"') == 2

    for asset_file in assets_dir.iterdir():
        if asset_file.is_file() and asset_file.suffix in {".html", ".js", ".css"}:
            content = asset_file.read_text(encoding="utf-8")
            assert "innerHTML" not in content, f"innerHTML sink found in {asset_file.name}"
            assert "\u2013" not in content and "\u2014" not in content, (
                f"En/em dash found in {asset_file.name}"
            )


def test_ui_deliver_size_estimate_assets() -> None:
    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    assert 'id="deliver-size-estimate"' in html_text
    assert 'id="deliver-size-detail"' in html_text

    i18n_text = (assets_dir / "i18n.js").read_text(encoding="utf-8")
    for key in (
        "render.estimate.label",
        "render.estimate.scopeTimeline",
        "render.estimate.scopeIo",
        "render.estimate.invalidDuration",
        "render.estimate.largeFile",
    ):
        assert i18n_text.count(f'"{key}"') == 2

    css_text = (assets_dir / "styles.css").read_text(encoding="utf-8")
    assert ".deliver-estimate-bar" in css_text
    assert ".deliver-estimate-badge" in css_text

    for asset_file in assets_dir.iterdir():
        if asset_file.is_file() and asset_file.suffix in {".html", ".js", ".css"}:
            content = asset_file.read_text(encoding="utf-8")
            assert "innerHTML" not in content, f"innerHTML sink found in {asset_file.name}"
            assert "\u2013" not in content and "\u2014" not in content, (
                f"En/em dash found in {asset_file.name}"
            )


def test_ui_render_plan_audio_only_format_endpoint_and_assets(
    ui_server: tuple[str, Path],
) -> None:
    base_url, _ = ui_server

    expected_cases = [
        ("off", "renders/ao_off.mp4", "libx264", None),
        ("wav24", "renders/ao_wav.wav", "pcm_s24le", None),
        ("mp3_320", "renders/ao_mp3.mp3", "libmp3lame", 320),
        ("aac_256", "renders/ao_aac.aac", "aac", 256),
    ]
    for fmt, expected_out, expected_enc, expected_kbps in expected_cases:
        status, _, raw = _http_call(
            f"{base_url}/api/render/plan",
            method="POST",
            payload={
                "input_path": ".taktcut-samples/sample_rec709.mp4",
                "output_path": (
                    f"renders/ao_{fmt.split('_')[0]}.mp4" if fmt != "off" else expected_out
                ),
                "profile": "web_h264",
                "fps": "25",
                "dialogue_eq": "voice_clarity",
                "loudness_preset": "youtube_14",
                "audio_only_format": fmt,
                "prefer_hw": False,
                "execute": False,
            },
        )
        assert status == 200
        plan = json.loads(raw.decode("utf-8"))["plan"]
        assert plan["audio_only_format"] == fmt
        assert plan["encoder"] == expected_enc
        assert (
            plan["audio_filter"]
            == "highpass=f=80,equalizer=f=3000:t=q:w=1.2:g=3,loudnorm=I=-14.0:TP=-1.0:LRA=11"
        )
        if fmt != "off":
            assert plan["output_path"].endswith(Path(expected_out).suffix)
            assert plan["audio_bitrate_kbps"] == expected_kbps
            assert plan["video_filter"] is None
            assert plan["gop_frames"] == 0
            assert plan["faststart"] is False
            assert "-vn" in plan["argv"]
            assert "-c:v" not in plan["argv"]
        else:
            assert "-vn" not in plan["argv"]
            assert "-c:v" in plan["argv"]

    for bad_payload in (
        {"audio_only_format": "flac"},
        {"audio_only_format": "ogg"},
        {"audio_only_format": 320},
        {"audio_only_format": "wav24;evil"},
    ):
        bad_status, _, _ = _http_call(
            f"{base_url}/api/render/plan",
            method="POST",
            payload={
                "input_path": ".taktcut-samples/sample_rec709.mp4",
                "output_path": "renders/ao_bad.mp4",
                "execute": False,
                **bad_payload,
            },
        )
        assert bad_status == 400

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    assert 'id="render-audio-only-format"' in html_text

    i18n_text = (assets_dir / "i18n.js").read_text(encoding="utf-8")
    for key in (
        "render.label.audioOnly",
        "render.audioOnly.off",
        "render.audioOnly.wav24",
        "render.audioOnly.mp3_320",
        "render.audioOnly.aac_256",
        "render.plan.audioOnly",
    ):
        assert i18n_text.count(f'"{key}"') == 2

    for asset_file in assets_dir.iterdir():
        if asset_file.is_file() and asset_file.suffix in {".html", ".js", ".css"}:
            content = asset_file.read_text(encoding="utf-8")
            assert "innerHTML" not in content, f"innerHTML sink found in {asset_file.name}"
            assert "\u2013" not in content and "\u2014" not in content, (
                f"En/em dash found in {asset_file.name}"
            )


def test_ui_lower_third_compile_and_render_plan_endpoints(
    ui_server: tuple[str, Path],
) -> None:
    base_url, _ = ui_server

    c_status, _, c_raw = _http_call(
        f"{base_url}/api/lower-third/compile",
        method="POST",
        payload={
            "enabled": True,
            "title": "Guest: 'Marc' \\ Cam; 1",
            "subtitle": "Lead Editor: Paris",
            "position": "bottom_center",
            "font_size": 42,
            "box_opacity": 0.70,
            "start_s": 1.5,
            "duration_s": 5.0,
        },
    )
    assert c_status == 200
    compiled = json.loads(c_raw.decode("utf-8"))
    assert compiled["is_active"] is True
    assert "drawtext=" in compiled["filtergraph"]
    assert "box=1:boxcolor=black@0.70:boxborderw=10" in compiled["filtergraph"]
    assert "enable='between(t,1.50,6.50)'" in compiled["filtergraph"]
    assert "\\:" in compiled["escaped_title"]
    assert "\\\\" in compiled["escaped_title"]
    assert "'\\\\\\''" in compiled["escaped_title"]

    off_status, _, off_raw = _http_call(
        f"{base_url}/api/lower-third/compile",
        method="POST",
        payload={"enabled": False, "title": "Hidden"},
    )
    assert off_status == 200
    assert json.loads(off_raw.decode("utf-8"))["is_active"] is False

    for bad_lt in (
        {"enabled": True, "title": "A" * 121},
        {"enabled": True, "position": "top_right"},
        {"enabled": True, "font_size": 10},
        {"enabled": True, "box_opacity": 1.5},
        {"enabled": True, "duration_s": 0.0},
    ):
        bad_c_status, _, _ = _http_call(
            f"{base_url}/api/lower-third/compile",
            method="POST",
            payload=bad_lt,
        )
        assert bad_c_status == 400

    rp_status, _, rp_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/lt_dryrun.mp4",
            "profile": "web_h264",
            "fps": "25",
            "lower_third": {
                "enabled": True,
                "title": "Claire Laurent",
                "subtitle": "Studio Paris",
                "position": "top_left",
                "font_size": 36,
                "box_opacity": 0.65,
                "start_s": 2.0,
                "duration_s": 4.0,
            },
            "prefer_hw": False,
            "execute": False,
        },
    )
    assert rp_status == 200
    plan = json.loads(rp_raw.decode("utf-8"))["plan"]
    assert plan["lower_third_enabled"] is True
    assert plan["lower_third_title"] == "Claire Laurent"
    assert plan["lower_third_position"] == "top_left"
    assert "box=1:boxcolor=black@0.65:boxborderw=10" in plan["video_filter"]
    assert "enable='between(t,2.00,6.00)'" in plan["video_filter"]

    bad_rp_status, _, _ = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/lt_bad.mp4",
            "lower_third": {"enabled": True, "position": "bad_pos"},
            "execute": False,
        },
    )
    assert bad_rp_status == 400

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    for elem_id in (
        "render-lower-third-enabled",
        "render-lower-third-title",
        "render-lower-third-subtitle",
        "render-lower-third-position",
        "render-lower-third-font-size",
        "render-lower-third-box-opacity",
        "render-lower-third-start",
        "render-lower-third-duration",
        "render-lower-third-preview",
    ):
        assert f'id="{elem_id}"' in html_text

    i18n_text = (assets_dir / "i18n.js").read_text(encoding="utf-8")
    for key in (
        "render.lowerThird.title",
        "render.lowerThird.toggle",
        "render.lowerThird.preset.interview",
        "render.lowerThird.preset.youtubeIntro",
        "render.lowerThird.preset.broadcastTag",
        "render.lowerThird.label.title",
        "render.lowerThird.label.subtitle",
        "render.lowerThird.label.position",
        "render.lowerThird.pos.bottomLeft",
        "render.lowerThird.pos.bottomCenter",
        "render.lowerThird.pos.topLeft",
        "render.lowerThird.label.fontSize",
        "render.lowerThird.label.boxOpacity",
        "render.lowerThird.label.start",
        "render.lowerThird.label.duration",
        "render.plan.lowerThird",
    ):
        assert i18n_text.count(f'"{key}"') == 2

    demo_text = (assets_dir / "demo_adapter.js").read_text(encoding="utf-8")
    assert "compileLowerThirdClient" in demo_text
    assert "/api/lower-third/compile" in demo_text

    for asset_file in assets_dir.iterdir():
        if asset_file.is_file() and asset_file.suffix in {".html", ".js", ".css"}:
            content = asset_file.read_text(encoding="utf-8")
            assert "innerHTML" not in content, f"innerHTML sink found in {asset_file.name}"
            assert "\u2013" not in content and "\u2014" not in content, (
                f"En/em dash found in {asset_file.name}"
            )


def test_ui_retime_params_compile_and_render_plan_endpoints(
    ui_server: tuple[str, Path],
) -> None:
    base_url, _ = ui_server

    c_status, _, c_raw = _http_call(
        f"{base_url}/api/retime/compile",
        method="POST",
        payload={"enabled": True, "speed": 0.25, "reverse": True},
    )
    assert c_status == 200
    compiled = json.loads(c_raw.decode("utf-8"))
    assert compiled["is_active"] is True
    assert compiled["is_identity"] is False
    assert compiled["video_filtergraph"] == "setpts=PTS/0.2500,reverse"
    assert compiled["audio_filtergraph"] == "atempo=0.5000,atempo=0.5000,areverse"
    assert compiled["ffmpeg_vf_args"] == ["-vf", "setpts=PTS/0.2500,reverse"]
    assert compiled["ffmpeg_af_args"] == ["-af", "atempo=0.5000,atempo=0.5000,areverse"]

    fast_status, _, fast_raw = _http_call(
        f"{base_url}/api/retime/compile",
        method="POST",
        payload={"enabled": True, "speed": 4.0, "reverse": False},
    )
    assert fast_status == 200
    fast_compiled = json.loads(fast_raw.decode("utf-8"))
    assert fast_compiled["video_filtergraph"] == "setpts=PTS/4.0000"
    assert fast_compiled["audio_filtergraph"] == "atempo=2.0000,atempo=2.0000"

    off_status, _, off_raw = _http_call(
        f"{base_url}/api/retime/compile",
        method="POST",
        payload={"enabled": False, "speed": 2.0, "reverse": True},
    )
    assert off_status == 200
    off_compiled = json.loads(off_raw.decode("utf-8"))
    assert off_compiled["is_active"] is False
    assert off_compiled["is_identity"] is True
    assert off_compiled["video_filtergraph"] == ""
    assert off_compiled["audio_filtergraph"] == ""

    for bad_rt in (
        {"enabled": True, "speed": 0.1},
        {"enabled": True, "speed": 4.5},
        {"enabled": True, "speed": True},
        {"enabled": "yes", "speed": 2.0},
        {"enabled": True, "reverse": "yes"},
    ):
        bad_c_status, _, _ = _http_call(
            f"{base_url}/api/retime/compile",
            method="POST",
            payload=bad_rt,
        )
        assert bad_c_status == 400

    rp_status, _, rp_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/retime_dryrun.mp4",
            "profile": "web_h264",
            "fps": "25",
            "retime": {"enabled": True, "speed": 2.0, "reverse": True},
            "prefer_hw": False,
            "execute": False,
        },
    )
    assert rp_status == 200
    plan = json.loads(rp_raw.decode("utf-8"))["plan"]
    assert plan["retime_enabled"] is True
    assert plan["retime_speed"] == pytest.approx(2.0)
    assert plan["retime_reverse"] is True
    assert "setpts=PTS/2.0000,reverse" in plan["video_filter"]
    assert "atempo=2.0000,areverse" in plan["audio_filter"]

    bad_rp_status, _, _ = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/retime_bad.mp4",
            "retime": {"enabled": True, "speed": 9.0},
            "execute": False,
        },
    )
    assert bad_rp_status == 400

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    for elem_id in (
        "deliver-retime-card",
        "render-retime-enabled",
        "render-retime-speed",
        "render-retime-speed-value",
        "render-retime-reverse",
        "render-retime-duration-estimate",
        "render-retime-preview",
    ):
        assert f'id="{elem_id}"' in html_text
    for spd_attr in ("0.25", "0.5", "1", "1.5", "2", "4"):
        assert f'data-deliver-retime-speed="{spd_attr}"' in html_text

    i18n_text = (assets_dir / "i18n.js").read_text(encoding="utf-8")
    for key in (
        "render.retime.title",
        "render.retime.toggle",
        "render.retime.label.speed",
        "render.retime.label.direction",
        "render.retime.reverse",
        "render.retime.label.duration",
        "render.plan.retime",
    ):
        assert i18n_text.count(f'"{key}"') == 2

    demo_text = (assets_dir / "demo_adapter.js").read_text(encoding="utf-8")
    assert "compileDeliverRetimeClient" in demo_text
    assert "retime_enabled" in demo_text


def test_ui_reframe_compile_and_render_plan_endpoints(
    ui_server: tuple[str, Path],
) -> None:
    base_url, _ = ui_server

    for ratio, expected_expr in (
        ("16:9", "ih*16/9"),
        ("9:16", "ih*9/16"),
        ("4:5", "ih*4/5"),
        ("1:1", "ih*1/1"),
        ("2.39:1", "ih*239/100"),
    ):
        c_status, _, c_raw = _http_call(
            f"{base_url}/api/reframe/compile",
            method="POST",
            payload={
                "enabled": True,
                "aspect_ratio": ratio,
                "pan_x": 0.25,
                "pan_y": -0.5,
            },
        )
        assert c_status == 200
        compiled = json.loads(c_raw.decode("utf-8"))
        assert compiled["is_active"] is True
        assert compiled["is_identity"] is False
        assert expected_expr in compiled["filtergraph"]
        assert "1+(0.2500)" in compiled["filtergraph"]
        assert "1+(-0.5000)" in compiled["filtergraph"]
        assert compiled["ffmpeg_vf_args"] == ["-vf", compiled["filtergraph"]]

    off_status, _, off_raw = _http_call(
        f"{base_url}/api/reframe/compile",
        method="POST",
        payload={"enabled": False, "aspect_ratio": "9:16", "pan_x": 0.5},
    )
    assert off_status == 200
    off_compiled = json.loads(off_raw.decode("utf-8"))
    assert off_compiled["is_active"] is False
    assert off_compiled["is_identity"] is True
    assert off_compiled["filtergraph"] == ""
    assert off_compiled["ffmpeg_vf_args"] == []

    for bad_rf in (
        {"enabled": True, "aspect_ratio": "21:9"},
        {"enabled": True, "aspect_ratio": "9:16", "pan_x": 1.2},
        {"enabled": True, "aspect_ratio": "9:16", "pan_y": -1.2},
        {"enabled": "yes", "aspect_ratio": "9:16"},
        {"enabled": True, "aspect_ratio": "9:16", "pan_x": True},
    ):
        bad_status, _, _ = _http_call(
            f"{base_url}/api/reframe/compile",
            method="POST",
            payload=bad_rf,
        )
        assert bad_status == 400

    rp_status, _, rp_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/reframe_dryrun.mp4",
            "profile": "web_h264",
            "fps": "25",
            "reframe": {
                "enabled": True,
                "aspect_ratio": "4:5",
                "pan_x": -0.4,
                "pan_y": 0.2,
            },
            "prefer_hw": False,
            "execute": False,
        },
    )
    assert rp_status == 200
    plan = json.loads(rp_raw.decode("utf-8"))["plan"]
    assert plan["reframe_enabled"] is True
    assert plan["reframe_aspect_ratio"] == "4:5"
    assert plan["reframe_pan_x"] == pytest.approx(-0.4)
    assert plan["reframe_pan_y"] == pytest.approx(0.2)
    assert "crop=w=" in plan["video_filter"]
    assert "ih*4/5" in plan["video_filter"]

    bad_rp_status, _, _ = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/reframe_bad.mp4",
            "reframe": {"enabled": True, "aspect_ratio": "9:16", "pan_x": 2.0},
            "execute": False,
        },
    )
    assert bad_rp_status == 400

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    for elem_id in (
        "deliver-reframe-card",
        "render-reframe-enabled",
        "render-reframe-badge",
        "render-reframe-pan-x",
        "render-reframe-pan-x-value",
        "render-reframe-pan-y",
        "render-reframe-pan-y-value",
        "render-reframe-reset",
        "render-reframe-preview",
    ):
        assert f'id="{elem_id}"' in html_text
    for ratio_attr in ("16:9", "9:16", "4:5", "1:1", "2.39:1"):
        assert f'data-deliver-reframe-ratio="{ratio_attr}"' in html_text

    i18n_text = (assets_dir / "i18n.js").read_text(encoding="utf-8")
    for key in (
        "render.reframe.title",
        "render.reframe.toggle",
        "render.reframe.label.panX",
        "render.reframe.label.panY",
        "render.reframe.reset",
        "render.plan.reframe",
    ):
        assert i18n_text.count(f'"{key}"') == 2

    demo_text = (assets_dir / "demo_adapter.js").read_text(encoding="utf-8")
    assert "compileReframeClient" in demo_text
    assert "reframe_enabled" in demo_text

    canvas_text = (assets_dir / "canvas.js").read_text(encoding="utf-8")
    assert "drawReframeOverlayOnFrame" in canvas_text


def test_ui_film_grain_compile_and_render_plan_endpoints(
    ui_server: tuple[str, Path],
) -> None:
    base_url, _ = ui_server

    for preset_name, strength_val, temporal_val, expected_fg in (
        ("35mm_fine", 10, True, "noise=alls=10:allf=t+u"),
        ("16mm_organic", 22, True, "noise=alls=22:allf=t+u"),
        ("super8_heavy", 38, False, "noise=alls=38:allf=u"),
        ("custom", 45, False, "noise=alls=45:allf=u"),
    ):
        c_status, _, c_raw = _http_call(
            f"{base_url}/api/film-grain/compile",
            method="POST",
            payload={
                "enabled": True,
                "preset": preset_name,
                "strength": strength_val,
                "temporal": temporal_val,
            },
        )
        assert c_status == 200
        compiled = json.loads(c_raw.decode("utf-8"))
        assert compiled["is_active"] is True
        assert compiled["is_identity"] is False
        assert compiled["filtergraph"] == expected_fg
        assert compiled["ffmpeg_vf_args"] == ["-vf", expected_fg]

    for off_payload in (
        {"enabled": False, "preset": "16mm_organic", "strength": 22, "temporal": True},
        {"enabled": True, "preset": "custom", "strength": 0, "temporal": True},
    ):
        off_status, _, off_raw = _http_call(
            f"{base_url}/api/film-grain/compile",
            method="POST",
            payload=off_payload,
        )
        assert off_status == 200
        off_compiled = json.loads(off_raw.decode("utf-8"))
        assert off_compiled["is_active"] is False
        assert off_compiled["is_identity"] is True
        assert off_compiled["filtergraph"] == ""
        assert off_compiled["ffmpeg_vf_args"] == []

    for bad_fg in (
        {"enabled": True, "preset": "70mm_bad", "strength": 12},
        {"enabled": True, "preset": "35mm_fine", "strength": -1},
        {"enabled": True, "preset": "35mm_fine", "strength": 61},
        {"enabled": True, "preset": "35mm_fine", "strength": 12.5},
        {"enabled": "yes", "preset": "35mm_fine", "strength": 12},
        {"enabled": True, "preset": "35mm_fine", "strength": 12, "temporal": "yes"},
    ):
        bad_status, _, _ = _http_call(
            f"{base_url}/api/film-grain/compile",
            method="POST",
            payload=bad_fg,
        )
        assert bad_status == 400

    rp_status, _, rp_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/film_grain_dryrun.mp4",
            "profile": "web_h264",
            "fps": "25",
            "film_grain": {
                "enabled": True,
                "preset": "16mm_organic",
                "strength": 22,
                "temporal": True,
            },
            "prefer_hw": False,
            "execute": False,
        },
    )
    assert rp_status == 200
    plan = json.loads(rp_raw.decode("utf-8"))["plan"]
    assert plan["film_grain_enabled"] is True
    assert plan["film_grain_preset"] == "16mm_organic"
    assert plan["film_grain_strength"] == 22
    assert plan["film_grain_temporal"] is True
    assert "noise=alls=22:allf=t+u" in plan["video_filter"]

    bad_rp_status, _, _ = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/film_grain_bad.mp4",
            "film_grain": {"enabled": True, "preset": "35mm_fine", "strength": 99},
            "execute": False,
        },
    )
    assert bad_rp_status == 400

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    for elem_id in (
        "deliver-film-grain-card",
        "render-film-grain-enabled",
        "render-film-grain-badge",
        "render-film-grain-strength",
        "render-film-grain-strength-value",
        "render-film-grain-temporal",
        "render-film-grain-preview",
    ):
        assert f'id="{elem_id}"' in html_text
    for preset_attr in ("35mm_fine", "16mm_organic", "super8_heavy"):
        assert f'data-deliver-film-grain-preset="{preset_attr}"' in html_text

    i18n_text = (assets_dir / "i18n.js").read_text(encoding="utf-8")
    for key in (
        "render.filmGrain.title",
        "render.filmGrain.toggle",
        "render.filmGrain.preset.35mm",
        "render.filmGrain.preset.16mm",
        "render.filmGrain.preset.super8",
        "render.filmGrain.label.strength",
        "render.filmGrain.label.temporal",
        "render.plan.filmGrain",
    ):
        assert i18n_text.count(f'"{key}"') == 2

    demo_text = (assets_dir / "demo_adapter.js").read_text(encoding="utf-8")
    assert "compileFilmGrainClient" in demo_text
    assert "film_grain_enabled" in demo_text

    canvas_text = (assets_dir / "canvas.js").read_text(encoding="utf-8")
    assert "drawFilmGrainOverlayOnFrame" in canvas_text


def test_ui_vignette_compile_and_render_plan_endpoints(
    ui_server: tuple[str, Path],
) -> None:
    import math

    base_url, _ = ui_server

    for preset_name, angle_val, mode_val in (
        ("subtle_cinema", 18.0, "forward"),
        ("moody_portrait", 32.0, "forward"),
        ("heavy_noir", 52.0, "backward"),
        ("custom", 40.0, "backward"),
    ):
        c_status, _, c_raw = _http_call(
            f"{base_url}/api/vignette/compile",
            method="POST",
            payload={
                "enabled": True,
                "preset": preset_name,
                "angle_deg": angle_val,
                "mode": mode_val,
            },
        )
        assert c_status == 200
        compiled = json.loads(c_raw.decode("utf-8"))
        expected_rad = angle_val * math.pi / 180.0
        expected_vf = f"vignette=angle={expected_rad:.4f}:mode={mode_val}"
        assert compiled["is_active"] is True
        assert compiled["is_identity"] is False
        assert compiled["filtergraph"] == expected_vf
        assert compiled["ffmpeg_vf_args"] == ["-vf", expected_vf]

    off_status, _, off_raw = _http_call(
        f"{base_url}/api/vignette/compile",
        method="POST",
        payload={
            "enabled": False,
            "preset": "heavy_noir",
            "angle_deg": 52.0,
            "mode": "forward",
        },
    )
    assert off_status == 200
    off_compiled = json.loads(off_raw.decode("utf-8"))
    assert off_compiled["is_active"] is False
    assert off_compiled["is_identity"] is True
    assert off_compiled["filtergraph"] == ""
    assert off_compiled["ffmpeg_vf_args"] == []

    for bad_vig in (
        {"enabled": True, "preset": "anamorphic_bad", "angle_deg": 24.0},
        {"enabled": True, "preset": "subtle_cinema", "angle_deg": 4.5},
        {"enabled": True, "preset": "subtle_cinema", "angle_deg": 76.0},
        {"enabled": True, "preset": "subtle_cinema", "angle_deg": True},
        {"enabled": "yes", "preset": "subtle_cinema", "angle_deg": 24.0},
        {"enabled": True, "preset": "subtle_cinema", "angle_deg": 24.0, "mode": "reverse"},
    ):
        bad_status, _, _ = _http_call(
            f"{base_url}/api/vignette/compile",
            method="POST",
            payload=bad_vig,
        )
        assert bad_status == 400

    rp_status, _, rp_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/vignette_dryrun.mp4",
            "profile": "web_h264",
            "fps": "25",
            "vignette": {
                "enabled": True,
                "preset": "moody_portrait",
                "angle_deg": 32.0,
                "mode": "forward",
            },
            "prefer_hw": False,
            "execute": False,
        },
    )
    assert rp_status == 200
    plan = json.loads(rp_raw.decode("utf-8"))["plan"]
    assert plan["vignette_enabled"] is True
    assert plan["vignette_preset"] == "moody_portrait"
    assert plan["vignette_angle_deg"] == pytest.approx(32.0)
    assert plan["vignette_mode"] == "forward"
    expected_plan_vf = f"vignette=angle={32.0 * math.pi / 180.0:.4f}:mode=forward"
    assert expected_plan_vf in plan["video_filter"]

    bad_rp_status, _, _ = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/vignette_bad.mp4",
            "vignette": {"enabled": True, "preset": "subtle_cinema", "angle_deg": 99.0},
            "execute": False,
        },
    )
    assert bad_rp_status == 400

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    for elem_id in (
        "deliver-vignette-card",
        "render-vignette-enabled",
        "render-vignette-badge",
        "render-vignette-angle",
        "render-vignette-angle-value",
        "render-vignette-mode",
        "render-vignette-preview",
    ):
        assert f'id="{elem_id}"' in html_text
    for preset_attr in ("subtle_cinema", "moody_portrait", "heavy_noir"):
        assert f'data-deliver-vignette-preset="{preset_attr}"' in html_text

    i18n_text = (assets_dir / "i18n.js").read_text(encoding="utf-8")
    for key in (
        "render.vignette.title",
        "render.vignette.toggle",
        "render.vignette.preset.subtle",
        "render.vignette.preset.moody",
        "render.vignette.preset.noir",
        "render.vignette.label.angle",
        "render.vignette.label.mode",
        "render.vignette.mode.forward",
        "render.vignette.mode.backward",
        "render.plan.vignette",
    ):
        assert i18n_text.count(f'"{key}"') == 2

    demo_text = (assets_dir / "demo_adapter.js").read_text(encoding="utf-8")
    assert "compileVignetteClient" in demo_text
    assert "vignette_enabled" in demo_text

    canvas_text = (assets_dir / "canvas.js").read_text(encoding="utf-8")
    assert "drawCinematicVignetteOverlayOnFrame" in canvas_text


def test_ui_voice_cleanup_compile_and_render_plan_endpoints(
    ui_server: tuple[str, Path],
) -> None:
    base_url, _ = ui_server

    for preset_name, hp_hz, pres_db, de_ess, expected_af in (
        (
            "youtube_voice",
            85,
            2.5,
            0.35,
            "highpass=f=85,equalizer=f=3200:t=q:w=1.2:g=2.5,deesser=i=0.35:m=0.50:f=0.50:s=o",
        ),
        (
            "podcast_warm",
            65,
            1.5,
            0.25,
            "highpass=f=65,equalizer=f=3200:t=q:w=1.2:g=1.5,deesser=i=0.25:m=0.50:f=0.50:s=o",
        ),
        (
            "broadcast_crisp",
            110,
            4.0,
            0.50,
            "highpass=f=110,equalizer=f=3200:t=q:w=1.2:g=4.0,deesser=i=0.50:m=0.50:f=0.50:s=o",
        ),
        (
            "custom",
            100,
            0.0,
            0.40,
            "highpass=f=100,deesser=i=0.40:m=0.50:f=0.50:s=o",
        ),
        (
            "custom",
            120,
            3.0,
            0.0,
            "highpass=f=120,equalizer=f=3200:t=q:w=1.2:g=3.0",
        ),
        (
            "custom",
            90,
            0.0,
            0.0,
            "highpass=f=90",
        ),
    ):
        c_status, _, c_raw = _http_call(
            f"{base_url}/api/voice-cleanup/compile",
            method="POST",
            payload={
                "enabled": True,
                "preset": preset_name,
                "highpass_hz": hp_hz,
                "presence_db": pres_db,
                "de_ess": de_ess,
            },
        )
        assert c_status == 200
        compiled = json.loads(c_raw.decode("utf-8"))
        assert compiled["is_active"] is True
        assert compiled["is_identity"] is False
        assert compiled["filtergraph"] == expected_af
        assert compiled["ffmpeg_af_args"] == ["-af", expected_af]

    off_status, _, off_raw = _http_call(
        f"{base_url}/api/voice-cleanup/compile",
        method="POST",
        payload={
            "enabled": False,
            "preset": "broadcast_crisp",
            "highpass_hz": 110,
            "presence_db": 4.0,
            "de_ess": 0.50,
        },
    )
    assert off_status == 200
    off_compiled = json.loads(off_raw.decode("utf-8"))
    assert off_compiled["is_active"] is False
    assert off_compiled["is_identity"] is True
    assert off_compiled["filtergraph"] == ""
    assert off_compiled["ffmpeg_af_args"] == []

    for bad_vc in (
        {"enabled": True, "preset": "studio_magic"},
        {"enabled": True, "preset": "youtube_voice", "highpass_hz": 39},
        {"enabled": True, "preset": "youtube_voice", "highpass_hz": 201},
        {"enabled": True, "preset": "youtube_voice", "highpass_hz": True},
        {"enabled": True, "preset": "youtube_voice", "presence_db": -6.5},
        {"enabled": True, "preset": "youtube_voice", "presence_db": 6.5},
        {"enabled": True, "preset": "youtube_voice", "de_ess": -0.1},
        {"enabled": True, "preset": "youtube_voice", "de_ess": 1.1},
        {"enabled": "yes", "preset": "youtube_voice"},
    ):
        bad_status, _, _ = _http_call(
            f"{base_url}/api/voice-cleanup/compile",
            method="POST",
            payload=bad_vc,
        )
        assert bad_status == 400

    rp_status, _, rp_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/voice_cleanup_dryrun.mp4",
            "profile": "web_h264",
            "fps": "25",
            "voice_cleanup": {
                "enabled": True,
                "preset": "podcast_warm",
                "highpass_hz": 65,
                "presence_db": 1.5,
                "de_ess": 0.25,
            },
            "prefer_hw": False,
            "execute": False,
        },
    )
    assert rp_status == 200
    plan = json.loads(rp_raw.decode("utf-8"))["plan"]
    assert plan["voice_cleanup_enabled"] is True
    assert plan["voice_cleanup_preset"] == "podcast_warm"
    assert plan["voice_cleanup_highpass_hz"] == 65
    assert plan["voice_cleanup_presence_db"] == pytest.approx(1.5)
    assert plan["voice_cleanup_de_ess"] == pytest.approx(0.25)
    expected_plan_af = (
        "highpass=f=65,equalizer=f=3200:t=q:w=1.2:g=1.5,deesser=i=0.25:m=0.50:f=0.50:s=o"
    )
    assert expected_plan_af in plan["audio_filter"]

    bad_rp_status, _, _ = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/voice_cleanup_bad.mp4",
            "voice_cleanup": {"enabled": True, "highpass_hz": 300},
            "execute": False,
        },
    )
    assert bad_rp_status == 400

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    for elem_id in (
        "deliver-voice-cleanup-card",
        "render-voice-cleanup-enabled",
        "render-voice-cleanup-badge",
        "render-voice-cleanup-highpass",
        "render-voice-cleanup-highpass-value",
        "render-voice-cleanup-presence",
        "render-voice-cleanup-presence-value",
        "render-voice-cleanup-deess",
        "render-voice-cleanup-deess-value",
        "render-voice-cleanup-preview",
    ):
        assert f'id="{elem_id}"' in html_text
    for preset_attr in ("youtube_voice", "podcast_warm", "broadcast_crisp"):
        assert f'data-deliver-voice-cleanup-preset="{preset_attr}"' in html_text

    i18n_text = (assets_dir / "i18n.js").read_text(encoding="utf-8")
    for key in (
        "render.voiceCleanup.title",
        "render.voiceCleanup.toggle",
        "render.voiceCleanup.preset.youtube",
        "render.voiceCleanup.preset.podcast",
        "render.voiceCleanup.preset.broadcast",
        "render.voiceCleanup.label.highpass",
        "render.voiceCleanup.label.presence",
        "render.voiceCleanup.label.deess",
        "render.plan.voiceCleanup",
    ):
        assert i18n_text.count(f'"{key}"') == 2

    demo_text = (assets_dir / "demo_adapter.js").read_text(encoding="utf-8")
    assert "compileVoiceCleanupClient" in demo_text
    assert "voice_cleanup_enabled" in demo_text
    assert "innerHTML" not in demo_text

    for asset_name in ("index.html", "app.js", "demo_adapter.js", "i18n.js", "styles.css"):
        content = (assets_dir / asset_name).read_text(encoding="utf-8")
        assert "\u2014" not in content
        assert "\u2013" not in content


def test_ui_color_node_tree_and_cube_import_endpoints(ui_server: tuple[str, Path]) -> None:
    base_url, _ = ui_server
    cube_text = (
        'TITLE "Server_Warm_2"\n'
        "LUT_3D_SIZE 2\n"
        "0.0 0.0 0.0\n"
        "1.0 0.0 0.0\n"
        "0.0 0.9 0.0\n"
        "1.0 0.9 0.0\n"
        "0.0 0.0 0.75\n"
        "1.0 0.0 0.75\n"
        "0.0 0.9 0.75\n"
        "1.0 0.85 0.75\n"
    )
    parse_status, _, parsed_raw = _http_call(
        f"{base_url}/api/color/parse-cube",
        method="POST",
        payload={"cube_content": cube_text, "filename": "server_warm.cube"},
    )
    assert parse_status == 200
    parsed = json.loads(parsed_raw.decode("utf-8"))
    assert parsed["info"]["dimension"] == "3D"
    assert parsed["info"]["size"] == 2
    assert parsed["lut"]["title"] == "Server_Warm_2"
    assert len(parsed["lut"]["table"]) == 8

    nodes_payload = [
        {
            "id": "node-1",
            "label": "Balance",
            "enabled": True,
            "grade": {
                "lift": [0.0, 0.0, 0.0],
                "gamma": [0.02, 0.0, -0.02],
                "gain": [0.0, 0.0, 0.0],
                "contrast": 1.1,
                "saturation": 1.05,
                "temperature": 0.05,
            },
        },
        {
            "id": "node-2",
            "label": "Warm Print",
            "enabled": True,
            "grade": {
                "lift": [0.0, 0.0, 0.0],
                "gamma": [0.0, 0.0, 0.0],
                "gain": [0.0, 0.0, 0.0],
                "contrast": 1.0,
                "saturation": 1.0,
                "temperature": 0.0,
            },
            "lut_title": parsed["lut"]["title"],
            "lut_dimension": "3D",
            "lut_size": 2,
            "lut_mix": 0.8,
            "lut_domain_min": parsed["lut"]["domain_min"],
            "lut_domain_max": parsed["lut"]["domain_max"],
            "lut_table": parsed["lut"]["table"],
        },
    ]

    comp_status, _, comp_raw = _http_call(
        f"{base_url}/api/color/compile",
        method="POST",
        payload={"nodes": nodes_payload, "pix_fmt": "yuv420p"},
    )
    assert comp_status == 200
    comp = json.loads(comp_raw.decode("utf-8"))
    assert comp["is_identity"] is False
    assert comp["active_node_count"] == 2
    assert comp["has_lut_nodes"] is True
    assert "eq=contrast=1.1000:saturation=1.0500" in comp["filtergraph"]

    bake_status, _, baked_raw = _http_call(
        f"{base_url}/api/color/bake",
        method="POST",
        payload={"nodes": nodes_payload, "size": 5, "title": "api_composite_tree"},
    )
    assert bake_status == 200
    baked = json.loads(baked_raw.decode("utf-8"))
    assert baked["info"]["size"] == 5
    assert baked["info"]["entry_count"] == 125
    assert "LUT_3D_SIZE 5" in baked["cube_text"]

    dl_status, _, dl_bytes = _http_call(
        f"{base_url}/api/color/download-cube",
        method="POST",
        payload={"nodes": nodes_payload, "size": 5, "title": "api_dl_tree"},
    )
    assert dl_status == 200
    assert b"LUT_3D_SIZE 5" in dl_bytes

    plan_status, _, plan_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/node_tree_out.mp4",
            "color_nodes": nodes_payload,
            "execute": False,
        },
    )
    assert plan_status == 200
    plan = json.loads(plan_raw.decode("utf-8"))
    assert "lut3d=" in (plan["plan"]["video_filter"] or "")

    pw_nodes_payload = [
        {
            "id": "node-1",
            "label": "Subject Spot",
            "enabled": True,
            "grade": {
                "lift": [0.0, 0.0, 0.0],
                "gamma": [0.04, 0.01, -0.04],
                "gain": [0.08, 0.02, -0.06],
                "contrast": 1.15,
                "saturation": 1.12,
                "temperature": 0.1,
            },
            "power_window": {
                "shape": "circle",
                "center_x": 0.5,
                "center_y": 0.5,
                "width": 0.45,
                "height": 0.45,
                "rotation_deg": 0.0,
                "softness": 0.12,
                "invert": False,
            },
        },
        {
            "id": "node-2",
            "label": "Outside",
            "enabled": True,
            "grade": {
                "lift": [-0.05, 0.0, 0.05],
                "gamma": [0.0, 0.0, 0.0],
                "gain": [0.0, 0.0, 0.0],
                "contrast": 1.0,
                "saturation": 0.85,
                "temperature": -0.1,
            },
            "power_window": {
                "shape": "circle",
                "center_x": 0.5,
                "center_y": 0.5,
                "width": 0.45,
                "height": 0.45,
                "rotation_deg": 0.0,
                "softness": 0.12,
                "invert": True,
            },
        },
    ]
    pw_comp_status, _, pw_comp_raw = _http_call(
        f"{base_url}/api/color/compile",
        method="POST",
        payload={"nodes": pw_nodes_payload, "pix_fmt": "yuv420p"},
    )
    assert pw_comp_status == 200
    pw_comp = json.loads(pw_comp_raw.decode("utf-8"))
    assert pw_comp["has_power_windows"] is True
    assert "maskedmerge" in pw_comp["filtergraph"]

    pw_plan_status, _, pw_plan_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/pw_node_tree_out.mp4",
            "color_nodes": pw_nodes_payload,
            "execute": False,
        },
    )
    assert pw_plan_status == 200
    pw_plan = json.loads(pw_plan_raw.decode("utf-8"))
    assert "maskedmerge" in (pw_plan["plan"]["video_filter"] or "")

    # Verify /api/color/presets includes qualifier_presets and compiles HSL Qualifier
    presets_status, _, presets_raw = _http_call(f"{base_url}/api/color/presets")
    assert presets_status == 200
    presets_json = json.loads(presets_raw.decode("utf-8"))
    assert len(presets_json.get("qualifier_presets", [])) >= 6

    qual_nodes_payload = [
        {
            "id": "node-1",
            "label": "Skin Key",
            "enabled": True,
            "grade": {
                "lift": [0.0, 0.0, 0.0],
                "gamma": [0.06, 0.01, -0.04],
                "gain": [0.04, 0.01, -0.03],
                "contrast": 1.05,
                "saturation": 1.15,
                "temperature": 0.08,
            },
            "qualifier": {
                "enabled": True,
                "preset": "skin_tones",
                "hue_center": 22.0,
                "hue_width": 44.0,
                "hue_softness": 18.0,
                "sat_low": 0.12,
                "sat_high": 0.75,
                "sat_softness": 0.08,
                "lum_low": 0.18,
                "lum_high": 0.88,
                "lum_softness": 0.10,
                "blur_radius": 1.0,
                "invert": False,
            },
        }
    ]
    qual_comp_status, _, qual_comp_raw = _http_call(
        f"{base_url}/api/color/compile",
        method="POST",
        payload={"nodes": qual_nodes_payload, "pix_fmt": "yuv420p"},
    )
    assert qual_comp_status == 200
    qual_comp = json.loads(qual_comp_raw.decode("utf-8"))
    assert qual_comp["has_qualifiers"] is True
    assert "extractplanes=r" in qual_comp["filtergraph"]
    assert "maskedmerge" in qual_comp["filtergraph"]

    qual_plan_status, _, qual_plan_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/qual_node_tree_out.mp4",
            "color_nodes": qual_nodes_payload,
            "execute": False,
        },
    )
    assert qual_plan_status == 200
    qual_plan = json.loads(qual_plan_raw.decode("utf-8"))
    assert "extractplanes=r" in (qual_plan["plan"]["video_filter"] or "")


def test_ui_fairlight_mixer_compile_and_project_persistence(
    ui_server: tuple[str, Path],
) -> None:
    base_url, _ = ui_server

    ok_status, _, ok_raw = _http_call(
        f"{base_url}/api/fairlight/mixer/compile",
        method="POST",
        payload={
            "channel": {
                "track_code": "A1",
                "volume_db": -6.0,
                "pan": -0.5,
                "muted": False,
                "solo": False,
                "rec_armed": True,
            },
            "master": {
                "volume_db": 0.0,
                "muted": False,
                "dim_enabled": True,
                "voice_isolation": True,
            },
        },
    )
    assert ok_status == 200
    compiled = json.loads(ok_raw.decode("utf-8"))
    assert compiled["is_identity"] is False
    assert compiled["effective_gain_db"] == pytest.approx(-26.0)
    assert compiled["pan_law_left"] == pytest.approx(1.0)
    assert compiled["pan_law_right"] == pytest.approx(0.5)
    assert "volume=-26.00dB" in compiled["filtergraph"]
    assert "pan=stereo|c0=1.000*c0|c1=0.500*c1" in compiled["filtergraph"]
    assert "highpass=f=85" in compiled["filtergraph"]

    id_status, _, id_raw = _http_call(
        f"{base_url}/api/fairlight/mixer/compile",
        method="POST",
        payload={
            "channel": {"track_code": "A2", "volume_db": 0.0, "pan": 0.0},
            "master": {"volume_db": 0.0, "muted": False, "dim_enabled": False},
        },
    )
    assert id_status == 200
    id_data = json.loads(id_raw.decode("utf-8"))
    assert id_data["is_identity"] is True
    assert id_data["filtergraph"] == ""
    assert id_data["ffmpeg_af_args"] == []

    mute_status, _, mute_raw = _http_call(
        f"{base_url}/api/fairlight/mixer/compile",
        method="POST",
        payload={
            "channel": {"track_code": "A1", "volume_db": 3.0, "pan": 0.25},
            "master": {"volume_db": 0.0, "muted": True},
        },
    )
    assert mute_status == 200
    mute_data = json.loads(mute_raw.decode("utf-8"))
    assert mute_data["filtergraph"] == "volume=0"
    assert mute_data["effective_gain_db"] == pytest.approx(-96.0)

    for bad_payload in (
        {"channel": {"track_code": "INVALID", "volume_db": 0.0}},
        {"channel": {"track_code": "A1", "volume_db": -60.0}},
        {"channel": {"track_code": "A1", "volume_db": True}},
        {"channel": {"track_code": "A1", "pan": 1.5}},
        {"master": {"dim_enabled": "yes"}},
        {"master": {"volume_db": 20.0}},
    ):
        bad_status, _, _ = _http_call(
            f"{base_url}/api/fairlight/mixer/compile",
            method="POST",
            payload=bad_payload,
        )
        assert bad_status == 400

    # Project save/export roundtrip with track mixer fields & master_bus
    sample_status, _, sample_raw = _http_call(f"{base_url}/api/sample")
    assert sample_status == 200
    doc = json.loads(sample_raw.decode("utf-8"))["document"]
    doc["tracks"][1]["volume_db"] = -4.5
    doc["tracks"][1]["pan"] = 0.35
    doc["tracks"][1]["rec_armed"] = True
    project_payload = {
        "schema_version": "taktcut.project.v1",
        "project_name": "Fairlight_Mixer_Test",
        "timeline": doc,
        "master_bus": {
            "volume_db": -1.5,
            "muted": False,
            "dim_enabled": True,
            "voice_isolation": True,
        },
    }
    exp_status, _, exp_raw = _http_call(
        f"{base_url}/api/project/export",
        method="POST",
        payload={"project": project_payload},
    )
    assert exp_status == 200
    exported_text = json.loads(exp_raw.decode("utf-8"))["project_json"]
    imp_status, _, imp_raw = _http_call(
        f"{base_url}/api/project/import",
        method="POST",
        payload={"project_json": exported_text},
    )
    assert imp_status == 200
    imported = json.loads(imp_raw.decode("utf-8"))["project"]
    assert imported["timeline"]["tracks"][1]["volume_db"] == pytest.approx(-4.5)
    assert imported["timeline"]["tracks"][1]["pan"] == pytest.approx(0.35)
    assert imported["timeline"]["tracks"][1]["rec_armed"] is True
    assert imported["master_bus"]["volume_db"] == pytest.approx(-1.5)
    assert imported["master_bus"]["dim_enabled"] is True
    assert imported["master_bus"]["voice_isolation"] is True

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    for asset_name in (
        "index.html",
        "app.js",
        "timeline_ops.js",
        "demo_adapter.js",
        "i18n.js",
        "styles.css",
    ):
        content = (assets_dir / asset_name).read_text(encoding="utf-8")
        assert "\u2014" not in content
        assert "\u2013" not in content
        if asset_name.endswith(".js"):
            assert "innerHTML" not in content


def test_ui_transform_keyframes_bezier_compile_and_project_persistence(
    ui_server: tuple[str, Path],
) -> None:
    import shutil
    import subprocess

    base_url, _ = ui_server

    payload = {
        "zoom_pct": 100.0,
        "pos_x_pct": 0.0,
        "pos_y_pct": 0.0,
        "rotation_deg": 0.0,
        "opacity_pct": 100.0,
        "dynamic_zoom": "off",
        "keyframes": {
            "zoom_pct": [
                {
                    "time_s": 0.0,
                    "value": 100.0,
                    "easing": "bezier",
                    "bezier": [0.16, 1.0, 0.3, 1.0],
                },
                {"time_s": 0.4, "value": 145.0, "easing": "ease_in_out"},
            ],
            "pos_x_pct": [
                {"time_s": 0.0, "value": -12.0, "easing": "ease_out"},
                {"time_s": 0.4, "value": 8.0, "easing": "linear"},
            ],
            "rotation_deg": [
                {"time_s": 0.0, "value": 0.0, "easing": "ease_in"},
                {"time_s": 0.4, "value": 12.0, "easing": "linear"},
            ],
            "opacity_pct": [
                {"time_s": 0.0, "value": 50.0, "easing": "linear"},
                {"time_s": 0.4, "value": 100.0, "easing": "linear"},
            ],
        },
        "pix_fmt": "yuv420p",
    }
    ok_status, _, ok_raw = _http_call(
        f"{base_url}/api/transform/compile",
        method="POST",
        payload=payload,
    )
    assert ok_status == 200
    compiled = json.loads(ok_raw.decode("utf-8"))
    assert compiled["is_identity"] is False
    assert compiled["has_keyframes"] is True
    assert compiled["keyframe_count"] == 8
    assert compiled["keyframed_params"] == [
        "zoom_pct",
        "pos_x_pct",
        "rotation_deg",
        "opacity_pct",
    ]
    assert "eval=frame" in compiled["filtergraph"]
    assert "blend=all_expr=" in compiled["filtergraph"]

    ffmpeg_bin = shutil.which("ffmpeg")
    if ffmpeg_bin is not None:
        proc = subprocess.run(
            [
                ffmpeg_bin,
                "-v",
                "error",
                "-f",
                "lavfi",
                "-i",
                "color=c=blue:s=320x180:d=0.4",
                "-vf",
                compiled["filtergraph"],
                "-f",
                "null",
                "-",
            ],
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
        assert proc.returncode == 0, f"FFmpeg failed on keyframed transform: {proc.stderr}"

    for bad_kf in (
        {"keyframes": {"zoom_pct": [{"time_s": -1.0, "value": 100.0}]}},
        {"keyframes": {"zoom_pct": [{"time_s": 0.0, "value": 500.0}]}},
        {
            "keyframes": {
                "zoom_pct": [
                    {
                        "time_s": 0.0,
                        "value": 100.0,
                        "easing": "bezier",
                        "bezier": [1.5, 0.0, 0.5, 1.0],
                    }
                ]
            }
        },
        {"keyframes": {"zoom_pct": [{"time_s": 0.0, "value": 100.0, "easing": "bogus"}]}},
    ):
        bad_status, _, _ = _http_call(
            f"{base_url}/api/transform/compile",
            method="POST",
            payload=bad_kf,
        )
        assert bad_status == 400

    # Verify project save/export roundtrip preserves clip.transform.keyframes
    sample_status, _, sample_raw = _http_call(f"{base_url}/api/sample")
    assert sample_status == 200
    doc = json.loads(sample_raw.decode("utf-8"))["document"]
    doc["tracks"][0]["clips"][0]["transform"] = {
        "zoom_pct": 100.0,
        "pos_x_pct": 0.0,
        "pos_y_pct": 0.0,
        "rotation_deg": 0.0,
        "opacity_pct": 100.0,
        "dynamic_zoom": "off",
        "keyframes": {
            "zoom_pct": [
                {
                    "time_s": 0.0,
                    "value": 100.0,
                    "easing": "bezier",
                    "bezier": [0.16, 1.0, 0.3, 1.0],
                },
                {"time_s": 1.2, "value": 135.0, "easing": "ease_in_out"},
            ]
        },
    }
    project_payload = {
        "schema_version": "taktcut.project.v1",
        "project_name": "Keyframe_Bezier_Test",
        "timeline": doc,
    }
    exp_status, _, exp_raw = _http_call(
        f"{base_url}/api/project/export",
        method="POST",
        payload={"project": project_payload},
    )
    assert exp_status == 200
    exported_text = json.loads(exp_raw.decode("utf-8"))["project_json"]
    imp_status, _, imp_raw = _http_call(
        f"{base_url}/api/project/import",
        method="POST",
        payload={"project_json": exported_text},
    )
    assert imp_status == 200
    imported = json.loads(imp_raw.decode("utf-8"))["project"]
    imp_kf = imported["timeline"]["tracks"][0]["clips"][0]["transform"]["keyframes"]["zoom_pct"]
    assert len(imp_kf) == 2
    assert imp_kf[0]["easing"] == "bezier"
    assert imp_kf[0]["bezier"] == [0.16, 1.0, 0.3, 1.0]
    assert imp_kf[1]["value"] == pytest.approx(135.0)


def test_ui_optical_flow_speed_ramp_endpoints_and_project_roundtrip(
    ui_server: tuple[str, Path],
) -> None:
    base_url, _ = ui_server

    comp_status, _, comp_raw = _http_call(
        f"{base_url}/api/retime/compile",
        method="POST",
        payload={
            "speed_rate": 1.0,
            "reverse": False,
            "retime_process": "optical_flow",
            "ramp_preset": "hero_slowmo",
            "clip_duration_s": 4.0,
            "fps": "25",
        },
    )
    assert comp_status == 200
    comp_body = json.loads(comp_raw.decode("utf-8"))
    assert comp_body["is_identity"] is False
    assert comp_body["retime_process"] == "optical_flow"
    assert comp_body["ramp_preset"] == "hero_slowmo"
    assert 0.35 < comp_body["avg_speed"] < 1.5
    assert "if(lt(T," in comp_body["video_filtergraph"]
    assert "minterpolate=fps=25:mi_mode=mci:mc_mode=aobmc:me_mode=bilat:vsbmc=1" in (
        comp_body["video_filtergraph"]
    )
    assert "atempo=" in comp_body["audio_filtergraph"]

    plan_status, _, plan_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/ramp_optical_flow.mp4",
            "prefer_hw": False,
            "retime": {
                "enabled": True,
                "speed": 1.0,
                "reverse": False,
                "retime_process": "frame_blend",
                "ramp_preset": "ramp_up",
            },
        },
    )
    assert plan_status == 200
    plan = json.loads(plan_raw.decode("utf-8"))["plan"]
    assert plan["retime_enabled"] is True
    assert plan["retime_process"] == "frame_blend"
    assert plan["retime_ramp_preset"] == "ramp_up"
    assert "minterpolate=fps=25:mi_mode=blend" in (plan["video_filter"] or "")

    bad_status, _, _ = _http_call(
        f"{base_url}/api/retime/compile",
        method="POST",
        payload={"retime_process": "bogus_mode"},
    )
    assert bad_status == 400

    sample_status, _, sample_raw = _http_call(f"{base_url}/api/sample")
    assert sample_status == 200
    doc = json.loads(sample_raw.decode("utf-8"))["document"]
    doc["tracks"][0]["clips"][0]["retime_process"] = "optical_flow"
    doc["tracks"][0]["clips"][0]["retime_ramp_preset"] = "bullet_pulse"
    doc["tracks"][0]["clips"][0]["retime_ramp_points"] = [
        {"pos_norm": 0.0, "speed_rate": 1.0},
        {"pos_norm": 0.25, "speed_rate": 3.5},
        {"pos_norm": 0.55, "speed_rate": 0.4},
        {"pos_norm": 1.0, "speed_rate": 1.0},
    ]
    exp_status, _, exp_raw = _http_call(
        f"{base_url}/api/project/export",
        method="POST",
        payload={
            "project": {
                "schema_version": "taktcut.project.v1",
                "project_name": "Speed_Ramp_OF_Test",
                "timeline": doc,
            }
        },
    )
    assert exp_status == 200
    exported_text = json.loads(exp_raw.decode("utf-8"))["project_json"]
    imp_status, _, imp_raw = _http_call(
        f"{base_url}/api/project/import",
        method="POST",
        payload={"project_json": exported_text},
    )
    assert imp_status == 200
    imp_clip = json.loads(imp_raw.decode("utf-8"))["project"]["timeline"]["tracks"][0]["clips"][0]
    assert imp_clip["retime_process"] == "optical_flow"
    assert imp_clip["retime_ramp_preset"] == "bullet_pulse"
    assert len(imp_clip["retime_ramp_points"]) == 4


def test_ui_color_curves_endpoints_and_project_roundtrip(ui_server: tuple[str, Path]) -> None:
    base_url, _workspace = ui_server

    presets_status, _, presets_raw = _http_call(f"{base_url}/api/color/presets")
    assert presets_status == 200
    presets_data = json.loads(presets_raw.decode("utf-8"))
    curve_presets = presets_data["curve_presets"]
    assert len(curve_presets) == 6
    assert any(p["id"] == "film_s_curve" for p in curve_presets)

    curves_payload = {
        "master": [[0.0, 0.0], [0.25, 0.18], [0.75, 0.84], [1.0, 1.0]],
        "red": [[0.0, 0.0], [0.5, 0.58], [1.0, 1.0]],
        "green": [[0.0, 0.0], [1.0, 1.0]],
        "blue": [[0.0, 0.0], [0.5, 0.44], [1.0, 1.0]],
    }
    nodes_payload = [
        {
            "id": "node-1",
            "label": "Curves Primary",
            "enabled": True,
            "curves": curves_payload,
        }
    ]
    comp_status, _, comp_raw = _http_call(
        f"{base_url}/api/color/compile",
        method="POST",
        payload={"nodes": nodes_payload, "pix_fmt": "yuv420p"},
    )
    assert comp_status == 200
    comp = json.loads(comp_raw.decode("utf-8"))
    assert comp["is_identity"] is False
    assert comp["has_curves"] is True
    assert "curves=interp=pchip:master=" in comp["filtergraph"]
    assert "red=" in comp["filtergraph"]
    assert "blue=" in comp["filtergraph"]

    shortcut_status, _, shortcut_raw = _http_call(
        f"{base_url}/api/color/compile",
        method="POST",
        payload={"curves": curves_payload},
    )
    assert shortcut_status == 200
    shortcut = json.loads(shortcut_raw.decode("utf-8"))
    assert shortcut["has_curves"] is True

    bake_status, _, baked_raw = _http_call(
        f"{base_url}/api/color/bake",
        method="POST",
        payload={"nodes": nodes_payload, "size": 5, "title": "api_curves_bake"},
    )
    assert bake_status == 200
    baked = json.loads(baked_raw.decode("utf-8"))
    assert "LUT_3D_SIZE 5" in baked["cube_text"]

    sample_status, _, sample_raw = _http_call(f"{base_url}/api/sample")
    assert sample_status == 200
    doc = json.loads(sample_raw.decode("utf-8"))["document"]
    exp_status, _, exp_raw = _http_call(
        f"{base_url}/api/project/export",
        method="POST",
        payload={
            "project": {
                "schema_version": "taktcut.project.v1",
                "project_name": "Curves_Roundtrip_Test",
                "timeline": doc,
                "color": {"nodes": nodes_payload, "selected_node_id": "node-1"},
            }
        },
    )
    assert exp_status == 200
    exported_text = json.loads(exp_raw.decode("utf-8"))["project_json"]
    imp_status, _, imp_raw = _http_call(
        f"{base_url}/api/project/import",
        method="POST",
        payload={"project_json": exported_text},
    )
    assert imp_status == 200
    imp_node = json.loads(imp_raw.decode("utf-8"))["project"]["color"]["nodes"][0]
    assert len(imp_node["curves"]["master"]) == 4
    assert imp_node["curves"]["red"][1] == [0.5, 0.58]


def test_ui_server_planar_tracker_and_stabilizer_api(
    ui_server: tuple[str, Path],
) -> None:
    base_url, workspace = ui_server

    presets_status, _, presets_raw = _http_call(f"{base_url}/api/fx/presets")
    assert presets_status == 200
    presets_data = json.loads(presets_raw.decode("utf-8"))
    assert len(presets_data["stabilizer_presets"]) == 3
    assert len(presets_data["planar_tracker_presets"]) == 4

    stab_status, _, stab_raw = _http_call(
        f"{base_url}/api/fx/stabilize/compile",
        method="POST",
        payload={"preset": "handheld_rescue", "width": 1920, "height": 1080, "pix_fmt": "yuv420p"},
    )
    assert stab_status == 200
    stab = json.loads(stab_raw.decode("utf-8"))
    assert stab["is_active"] is True
    assert "deshake=x=-1:y=-1:w=-1:h=-1:rx=48:ry=48" in stab["filtergraph"]

    trk_status, _, trk_raw = _http_call(
        f"{base_url}/api/fx/tracker/compile",
        method="POST",
        payload={
            "enabled": True,
            "mode": "corner_pin",
            "tl_x": 0.12,
            "tl_y": 0.14,
            "track_keyframes": [
                {"frame": 0, "x": 0.50, "y": 0.45, "confidence": 1.0},
                {"frame": 10, "x": 0.55, "y": 0.48, "confidence": 0.96},
            ],
        },
    )
    assert trk_status == 200
    trk = json.loads(trk_raw.decode("utf-8"))
    assert trk["is_active"] is True
    assert trk["uses_per_frame_eval"] is True
    assert ":eval=frame" in trk["filtergraph"]

    fx_status, _, fx_raw = _http_call(
        f"{base_url}/api/fx/compile",
        method="POST",
        payload={
            "nodes": [],
            "stabilizer": {"enabled": True, "preset": "smooth_gimbal"},
            "planar_tracker": {"enabled": True, "preset": "screen_insert"},
        },
    )
    assert fx_status == 200
    fx = json.loads(fx_raw.decode("utf-8"))
    assert fx["stabilizer_active"] is True
    assert fx["planar_tracker_active"] is True
    assert "deshake=" in fx["filtergraph"]
    assert "perspective=" in fx["filtergraph"]

    # Ensure sample clip exists for /api/render/plan
    _http_call(f"{base_url}/api/sample/generate-clip", method="POST", payload={})
    plan_status, _, plan_raw = _http_call(
        f"{base_url}/api/render/plan",
        method="POST",
        payload={
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/tracker_stab_plan.mp4",
            "stabilizer": {"enabled": True, "preset": "locked_tripod"},
            "planar_tracker": {"enabled": True, "preset": "anamorphic_skew"},
            "prefer_hw": False,
        },
    )
    assert plan_status == 200
    plan = json.loads(plan_raw.decode("utf-8"))["plan"]
    assert plan["stabilizer_enabled"] is True
    assert plan["planar_tracker_enabled"] is True
    assert "deshake=" in plan["video_filter"]
    assert "perspective=" in plan["video_filter"]
    assert (workspace / ".taktcut-samples" / "sample_rec709.mp4").exists()


def test_ui_karaoke_subtitles_ass_and_playwright_e2e(
    ui_server: tuple[str, Path],
) -> None:
    base_url, workspace = ui_server

    s_status, _, s_raw = _http_call(f"{base_url}/api/subtitles/styles")
    assert s_status == 200
    styles_data = json.loads(s_raw.decode("utf-8"))
    assert [s["id"] for s in styles_data["pro_styles"]] == [
        "clean_white",
        "yellow_broadcast",
        "boxed_social",
        "netflix_clean",
        "social_karaoke",
        "broadcast_gold",
    ]
    assert "color_pop" in styles_data["karaoke_modes"]
    assert any(p["id"] == "reels_tiktok" for p in styles_data["safe_margin_presets"])

    ch_status, _, ch_raw = _http_call(
        f"{base_url}/api/subtitles/chunk",
        method="POST",
        payload={
            "cues": [
                {
                    "index": 1,
                    "start_s": 0.5,
                    "end_s": 4.5,
                    "text": "Clean room OpenTimelineIO interchange workflow for broadcast studio",
                }
            ],
            "max_words_per_cue": 4,
            "uppercase": True,
        },
    )
    assert ch_status == 200
    chunked = json.loads(ch_raw.decode("utf-8"))
    assert chunked["cue_count"] == 2
    assert chunked["word_count"] == 8
    assert len(chunked["cues"][0]["words"]) == 4

    ass_exp_status, _, ass_exp_raw = _http_call(
        f"{base_url}/api/subtitles/export",
        method="POST",
        payload={
            "format": "ass",
            "cues": chunked["cues"],
            "out_path": "captions/karaoke_master.ass",
            "subtitle_track": {
                "cues": chunked["cues"],
                "style": "social_karaoke",
                "karaoke_mode": "color_pop",
                "highlight_color": "#00e5ff",
                "margin_bottom_pct": 0.24,
                "uppercase": True,
                "enabled": True,
            },
        },
    )
    assert ass_exp_status == 200
    ass_exported = json.loads(ass_exp_raw.decode("utf-8"))
    assert ass_exported["saved_path"] == "captions/karaoke_master.ass"
    assert "{\\k" in ass_exported["content"]
    assert (workspace / "captions" / "karaoke_master.ass").is_file()

    ass_parse_status, _, ass_parse_raw = _http_call(
        f"{base_url}/api/subtitles/parse",
        method="POST",
        payload={"format": "ass", "path": "captions/karaoke_master.ass"},
    )
    assert ass_parse_status == 200
    ass_parsed = json.loads(ass_parse_raw.decode("utf-8"))
    assert ass_parsed["format"] == "ass"
    assert ass_parsed["cue_count"] == 2

    comp_status, _, comp_raw = _http_call(
        f"{base_url}/api/subtitles/compile",
        method="POST",
        payload={
            "subtitle_track": {
                "cues": chunked["cues"],
                "style": "social_karaoke",
                "karaoke_mode": "pill_box",
                "highlight_color": "#38e08d",
                "margin_bottom_pct": 0.24,
                "uppercase": True,
                "enabled": True,
            }
        },
    )
    assert comp_status == 200
    compiled = json.loads(comp_raw.decode("utf-8"))
    assert compiled["karaoke_mode"] == "pill_box"
    assert compiled["word_count"] == 8
    assert "boxcolor=0x38e08d@0.94" in compiled["filtergraph"]
    assert "[Script Info]" in compiled["ass_preview"]

    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            console_errors: list[str] = []
            page.on(
                "console",
                lambda msg: console_errors.append(msg.text) if msg.type == "error" else None,
            )
            page.goto(base_url, wait_until="networkidle")
            page.click("#tab-titles")
            page.wait_for_selector("#panel-titles:not(.is-hidden)")

            page.click('[data-subtitle-style="social_karaoke"]')
            page.wait_for_function(
                "() => document.getElementById('subtitle-karaoke-badge')"
                "?.textContent === 'KARAOKE POP'"
            )
            assert page.locator("#subtitle-karaoke-mode").input_value() == "color_pop"
            assert page.locator("#subtitle-uppercase").is_checked() is True
            assert page.locator("#subtitle-margin-num").input_value() == "24"

            page.click("#btn-titles-safe-guides")
            assert page.locator("#btn-titles-safe-guides").get_attribute("aria-pressed") == "true"

            page.click("#btn-subtitle-auto-chunk")
            page.wait_for_function(
                "() => document.querySelectorAll("
                "'#subtitle-cue-list .subtitle-word-chip').length >= 6"
            )

            first_chip = page.locator("#subtitle-cue-list .subtitle-word-chip").first
            first_chip.click()

            page.click("#btn-subtitle-view-ass")
            page.locator("#subtitle-filtergraph-drawer summary").click()
            ass_out = page.locator("#subtitle-filtergraph-output").inner_text()
            assert "[V4+ Styles]" in ass_out
            assert "{\\k" in ass_out

            overflow_desktop = page.evaluate(
                "() => document.documentElement.scrollWidth - window.innerWidth"
            )
            assert overflow_desktop <= 0, f"Desktop overflow: {overflow_desktop}px"

            page.set_viewport_size({"width": 375, "height": 812})
            page.wait_for_timeout(120)
            overflow_mobile = page.evaluate(
                "() => document.documentElement.scrollWidth - window.innerWidth"
            )
            assert overflow_mobile <= 0, f"Mobile 375px overflow: {overflow_mobile}px"

            min_btn_h = page.evaluate(
                "() => document.getElementById('btn-subtitle-auto-chunk')"
                ".getBoundingClientRect().height"
            )
            assert min_btn_h >= 44, f"Mobile touch target too small: {min_btn_h}px"
            assert console_errors == [], f"Console errors: {console_errors}"
        finally:
            browser.close()


def test_dve_pip_split_screen_api_client_parity_and_playwright(tmp_path: Path) -> None:
    import shutil
    import subprocess

    server = create_ui_server(host="127.0.0.1", port=0, workspace_dir=tmp_path)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address[0], server.server_address[1]
    host_s = host.decode("ascii") if isinstance(host, bytes) else str(host)
    base_url = f"http://{host_s}:{port}"

    try:
        p_status, _, p_raw = _http_call(f"{base_url}/api/transform/presets")
        assert p_status == 200
        presets_data = json.loads(p_raw.decode("utf-8"))
        assert len(presets_data["presets"]) == 13
        assert presets_data["bounds"]["crop_pct"]["sum_max"] == 85.0

        pip_payload = {
            "transform_params": {
                "zoom_pct": 28.0,
                "pos_x_pct": 32.0,
                "pos_y_pct": 32.0,
                "crop_left_pct": 10.0,
                "crop_right_pct": 10.0,
                "border_width_px": 3.0,
                "border_color": "#e68442",
                "border_feather_px": 14.0,
                "shadow_opacity_pct": 55.0,
                "shadow_blur_px": 14.0,
                "shadow_offset_x_px": 8.0,
                "shadow_offset_y_px": 10.0,
                "shadow_color": "#000000",
            },
            "pix_fmt": "yuv420p",
        }
        c_status, _, c_raw = _http_call(
            f"{base_url}/api/transform/compile",
            method="POST",
            payload=pip_payload,
        )
        assert c_status == 200
        compiled = json.loads(c_raw.decode("utf-8"))
        assert compiled["is_identity"] is False
        assert "crop=w=" in compiled["filtergraph"]
        assert "pad=w=iw+6:h=ih+6:x=3:y=3:color=0xe68442" in compiled["filtergraph"]
        assert "alphamerge" in compiled["filtergraph"]
        assert "lutrgb=r=0:g=0:b=0" in compiled["filtergraph"]

        bad_status, _, _ = _http_call(
            f"{base_url}/api/transform/compile",
            method="POST",
            payload={"crop_left_pct": 45.0, "crop_right_pct": 45.0},
        )
        assert bad_status == 400

        bad_color_status, _, _ = _http_call(
            f"{base_url}/api/transform/compile",
            method="POST",
            payload={"border_color": "javascript:alert(1)"},
        )
        assert bad_color_status == 400

        node = shutil.which("node")
        if node:
            assets_url = (
                Path(__file__).resolve().parents[1]
                / "src"
                / "taktcut"
                / "ui"
                / "assets"
                / "timeline_ops.js"
            ).as_uri()
            script = f"""
import assert from "node:assert/strict";
import {{
  compileTransformFilterClient,
  getTransformPresetClient,
  normalizeClipTransform
}} from "{assets_url}";

const pipPreset = getTransformPresetClient("pip_bottom_right");
assert.ok(pipPreset);
const cPip = compileTransformFilterClient(pipPreset, "yuv420p");
assert.equal(cPip.is_identity, false);
assert.ok(cPip.filtergraph.includes("pad=w=iw+6:h=ih+6:x=3:y=3:color=0xe68442"));
assert.ok(cPip.filtergraph.includes("lutrgb=r=0:g=0:b=0"));

const payloadJson = {json.dumps(pip_payload["transform_params"])};
const cPayload = compileTransformFilterClient(payloadJson, "yuv420p");
assert.equal(cPayload.filtergraph, {json.dumps(compiled["filtergraph"])});

const normClamp = normalizeClipTransform({{ crop_left_pct: 45, crop_right_pct: 45 }});
assert.ok(normClamp.crop_left_pct + normClamp.crop_right_pct <= 85.0);
"""
            proc = subprocess.run(
                [node, "--input-type=module"],
                input=script,
                capture_output=True,
                text=True,
                timeout=15,
                check=False,
            )
            assert proc.returncode == 0, f"Node parity failed:\n{proc.stderr}\n{proc.stdout}"

        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch()
            try:
                page = browser.new_page(viewport={"width": 1440, "height": 900})
                console_errors: list[str] = []
                page.on(
                    "console",
                    lambda msg: console_errors.append(msg.text) if msg.type == "error" else None,
                )
                page.goto(base_url, wait_until="networkidle")
                page.wait_for_selector("#timeline-index-list .timeline-index-row")

                # Select first video clip via Timeline Index
                page.locator("#timeline-index-list .timeline-index-row").first.click()
                page.wait_for_function(
                    "() => !document.getElementById('clip-transform-zoom-range')?.disabled"
                )

                # Toggle Split Grid and apply PiP Bottom-Right preset
                page.click("#btn-dve-split-grid")
                assert page.locator("#btn-dve-split-grid").get_attribute("aria-pressed") == "true"
                page.click('[data-transform-preset="pip_bottom_right"]')
                page.wait_for_function(
                    "() => document.getElementById('clip-dve-shadow-badge')"
                    "?.textContent?.includes('55%')"
                )
                assert page.locator("#clip-dve-crop-badge").text_content() == "3px"

                # Open DVE Crop & Feather Border accordion and set Crop Left + Feather
                page.locator("#dve-crop-accordion summary").click()
                page.fill("#clip-dve-crop-left-num", "15")
                page.dispatch_event("#clip-dve-crop-left-num", "change")
                page.fill("#clip-dve-border-feather-num", "12")
                page.dispatch_event("#clip-dve-border-feather-num", "change")
                page.wait_for_function(
                    "() => document.getElementById('clip-dve-crop-badge')"
                    "?.textContent?.includes('CROP')"
                )

                # Apply Split 2x1 Left preset
                page.click('[data-transform-preset="split_2x1_left"]')
                assert page.locator("#clip-dve-crop-left-num").input_value() == "25.0"
                assert page.locator("#clip-transform-posx-num").input_value() == "-25.0"

                # Drag inside Program Monitor DVE box to reposition
                box = page.locator("#timeline-program-canvas").bounding_box()
                assert box is not None
                cx = box["x"] + box["width"] * 0.25
                cy = box["y"] + box["height"] * 0.5
                page.mouse.move(cx, cy)
                page.mouse.down()
                page.mouse.move(cx + 24, cy + 12, steps=4)
                page.mouse.up()

                overflow_desktop = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert overflow_desktop <= 0, f"Desktop overflow: {overflow_desktop}px"

                page.set_viewport_size({"width": 375, "height": 812})
                page.wait_for_function("() => window.innerWidth === 375")
                overflow_mobile = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert overflow_mobile <= 0, f"Mobile 375px overflow: {overflow_mobile}px"

                for btn_id in ("btn-dve-overlay", "btn-dve-split-grid", "btn-clip-dve-crop-reset"):
                    h = page.evaluate(
                        f"() => document.getElementById('{btn_id}').getBoundingClientRect().height"
                    )
                    assert h >= 44, f"Mobile touch target {btn_id} too small: {h}px"

                assert console_errors == [], f"Console errors: {console_errors}"
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_timeline_slip_slide_roll_ripple_sync_lock_parity_and_playwright(tmp_path: Path) -> None:
    import shutil
    import subprocess

    from taktcut.ui.samples import build_sample_timeline
    from taktcut.ui.server import ASSETS_DIR

    sample_doc = build_sample_timeline("clean").model_dump(mode="json")

    server = create_ui_server(host="127.0.0.1", port=0, workspace_dir=tmp_path)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = f"http://127.0.0.1:{port}"
    try:
        # 1. Server API parity for /api/timeline/edit
        status, _, body = _http_call(
            f"{base_url}/api/timeline/edit",
            method="POST",
            payload={
                "document": sample_doc,
                "op": "ripple_trim",
                "track_kind": "video",
                "track_index": 1,
                "clip_index": 0,
                "edge": "right",
                "delta_frames": 25,
            },
        )
        assert status == 200
        rip_res = json.loads(body.decode("utf-8"))
        assert rip_res["changed"] is True
        assert rip_res["delta_applied"] == 25
        assert rip_res["document"]["tracks"][0]["clips"][0]["duration_frames"] == 150
        assert rip_res["document"]["tracks"][0]["clips"][1]["start_frame"] == 150
        # A1 is sync_locked -> VO_Feature_Main (start 125) and VO_Tagline_End (start 375) shift +25
        assert rip_res["document"]["tracks"][2]["clips"][1]["start_frame"] == 150
        assert rip_res["document"]["tracks"][2]["clips"][2]["start_frame"] == 400
        # A2 is unlocked -> stays at 0
        assert rip_res["document"]["tracks"][3]["clips"][0]["start_frame"] == 0

        # Invalid op -> 400
        bad_status, _, _ = _http_call(
            f"{base_url}/api/timeline/edit",
            method="POST",
            payload={"document": sample_doc, "op": "bogus_op"},
        )
        assert bad_status == 400

        # 2. Node.js parity: timeline_ops.js + demo_adapter.js offline mode
        if shutil.which("node"):
            ops_url = (ASSETS_DIR / "timeline_ops.js").as_uri()
            demo_url = (ASSETS_DIR / "demo_adapter.js").as_uri()
            node_script = (
                "import assert from 'node:assert/strict';\n"
                f"import {{ createApiClient }} from '{demo_url}';\n"
                "import {\n"
                "  rippleTrimClipInDocument,\n"
                "  rollEditCutInDocument,\n"
                "  slipClipInDocument,\n"
                "  slideClipInDocument,\n"
                "  toggleTrackSyncLockInDocument\n"
                f"}} from '{ops_url}';\n"
                f"const doc = {json.dumps(sample_doc)};\n"
                "const r1 = rippleTrimClipInDocument(doc, 'video', 1, 0, 'right', 25);\n"
                "assert.equal(r1.changed, true);\n"
                "assert.equal(r1.doc.tracks[0].clips[1].start_frame, 150);\n"
                "assert.equal(r1.doc.tracks[2].clips[1].start_frame, 150);\n"
                "const roll1 = rollEditCutInDocument(doc, 'video', 1, 0, -15);\n"
                "assert.equal(roll1.changed, true);\n"
                "assert.equal(roll1.deltaApplied, -10);\n"
                "assert.equal(roll1.doc.tracks[0].clips[0].duration_frames, 115);\n"
                "assert.equal(roll1.doc.tracks[0].clips[1].start_frame, 115);\n"
                "assert.equal(roll1.doc.tracks[0].clips[1].duration_frames, 110);\n"
                "assert.equal(roll1.doc.tracks[0].clips[1].source_in_frame, 0);\n"
                "const slip1 = slipClipInDocument(doc, 'video', 1, 0, -10);\n"
                "assert.equal(slip1.changed, true);\n"
                "assert.equal(slip1.doc.tracks[0].clips[0].source_in_frame, 14);\n"
                "assert.equal(slip1.doc.tracks[0].clips[0].start_frame, 0);\n"
                "const slide1 = slideClipInDocument(doc, 'video', 1, 1, 20);\n"
                "assert.equal(slide1.changed, true);\n"
                "assert.equal(slide1.doc.tracks[0].clips[0].duration_frames, 145);\n"
                "assert.equal(slide1.doc.tracks[0].clips[1].start_frame, 145);\n"
                "assert.equal(slide1.doc.tracks[0].clips[2].start_frame, 245);\n"
                "const tog = toggleTrackSyncLockInDocument(doc, 'video', 2);\n"
                "assert.equal(tog.syncLockedTracks, 3);\n"
                "globalThis.window = { __TAKTCUT_CONFIG__: { mode: 'static-demo' } };\n"
                "const offlineApi = createApiClient();\n"
                "const apiRes = await offlineApi.editTimeline({\n"
                "  document: doc, op: 'ripple_trim', track_kind: 'video', track_index: 1,\n"
                "  clip_index: 0, edge: 'right', delta_frames: 25\n"
                "});\n"
                "assert.equal(apiRes.changed, true);\n"
                "assert.equal(apiRes.document.tracks[2].clips[1].start_frame, 150);\n"
            )
            proc = subprocess.run(
                ["node", "--input-type=module", "-e", node_script],
                capture_output=True,
                text=True,
                timeout=15,
                check=False,
            )
            assert proc.returncode == 0, f"Node parity failed:\n{proc.stderr}\n{proc.stdout}"

        # 3. Playwright E2E at 1440x900 and 375x812 + EN/FR
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch()
            try:
                page = browser.new_page(viewport={"width": 1440, "height": 900})
                console_errors: list[str] = []
                page.on(
                    "console",
                    lambda msg: console_errors.append(msg.text) if msg.type == "error" else None,
                )
                page.goto(base_url, wait_until="networkidle")
                page.wait_for_selector("#timeline-index-list .timeline-index-row")

                # Select first video clip A001_Opening_Wide (0..125f, srcIn 24f)
                page.locator("#timeline-index-list .timeline-index-row").first.click()
                page.wait_for_function(
                    "() => !document.getElementById('btn-nudge-p5')?.disabled"
                )

                # Switch to Slip (Y) via keyboard and nudge +5f -> srcIn 29f
                page.keyboard.press("y")
                assert page.locator("#btn-tool-slip").get_attribute("aria-pressed") == "true"
                page.click("#btn-nudge-p5")
                page.wait_for_function(
                    "() => document.getElementById('timeline-edit-nudge-readout')"
                    "?.textContent?.includes('SrcIn 29f')"
                )

                # Switch to Roll (R) and nudge Out +5f -> 130f
                page.keyboard.press("r")
                assert page.locator("#btn-tool-roll").get_attribute("aria-pressed") == "true"
                page.click("#btn-nudge-p5")
                page.wait_for_function(
                    "() => document.getElementById('timeline-edit-nudge-readout')"
                    "?.textContent?.includes('Dur 130f')"
                )

                # Switch to Ripple (T) and nudge +5f -> timeline duration extends 500f -> 505f
                page.keyboard.press("t")
                assert page.locator("#btn-tool-trim").get_attribute("aria-pressed") == "true"
                page.click("#btn-nudge-p5")
                page.wait_for_function(
                    "() => document.getElementById('program-frame-counter')"
                    "?.textContent?.includes('/ 505f')"
                )

                # Toggle Sync Lock all on/off via toolbar button and undo back
                page.click("#btn-timeline-sync-lock")
                page.wait_for_function(
                    "() => document.getElementById('timeline-sync-lock-pill')"
                    "?.textContent === '4/4 SYNC'"
                )

                # Switch to FR and check clean French labels
                page.click("#lang-fr")
                assert "Propagation" in (page.locator("#btn-tool-trim").text_content() or "")
                assert "Glissé" in (page.locator("#btn-tool-slip").text_content() or "")
                page.click("#lang-en")

                overflow_desktop = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert overflow_desktop <= 0, f"Desktop overflow: {overflow_desktop}px"

                # Mobile 375x812 touch target & zero horizontal overflow check
                page.set_viewport_size({"width": 375, "height": 812})
                page.wait_for_function("() => window.innerWidth === 375")
                overflow_mobile = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert overflow_mobile <= 0, f"Mobile 375px overflow: {overflow_mobile}px"

                for btn_id in (
                    "btn-tool-select",
                    "btn-tool-trim",
                    "btn-tool-roll",
                    "btn-tool-slip",
                    "btn-tool-slide",
                    "btn-timeline-sync-lock",
                    "btn-nudge-m5",
                    "btn-nudge-p5",
                ):
                    h = page.evaluate(
                        f"() => document.getElementById('{btn_id}').getBoundingClientRect().height"
                    )
                    assert h >= 44, f"Mobile touch target {btn_id} too small: {h}px"

                assert console_errors == [], f"Console errors: {console_errors}"
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_ui_fairlight_broadcast_audio_rack_e2e(tmp_path: Path) -> None:
    import shutil
    import subprocess

    from taktcut.render import (
        apply_fairlight_rack_preset,
        compile_fairlight_audio_rack_filter_result,
    )
    from taktcut.ui.server import ASSETS_DIR

    server = create_ui_server(host="127.0.0.1", port=0, workspace_dir=tmp_path)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = f"http://127.0.0.1:{port}"
    try:
        # 1. Backend API /api/fairlight/rack/compile (identity, preset, invalid -> 400)
        id_status, _, id_raw = _http_call(
            f"{base_url}/api/fairlight/rack/compile",
            method="POST",
            payload={"preset_id": "flat"},
        )
        assert id_status == 200
        id_data = json.loads(id_raw.decode("utf-8"))
        assert id_data["is_identity"] is True
        assert id_data["filtergraph"] == ""
        assert id_data["eq_band_summary"] == "BYPASS"

        bv_model = apply_fairlight_rack_preset("broadcast_voice")
        py_bv = compile_fairlight_audio_rack_filter_result(bv_model)
        bv_status, _, bv_raw = _http_call(
            f"{base_url}/api/fairlight/rack/compile",
            method="POST",
            payload={"fairlight_rack": bv_model.model_dump(mode="json")},
        )
        assert bv_status == 200
        bv_data = json.loads(bv_raw.decode("utf-8"))
        assert bv_data["is_identity"] is False
        assert bv_data["filtergraph"] == py_bv.filtergraph
        assert "lowshelf=" in bv_data["filtergraph"]
        assert "acompressor=" in bv_data["filtergraph"]
        assert "alimiter=" in bv_data["filtergraph"]

        for bad_payload in (
            {"fairlight_rack": "not-an-object"},
            {"fairlight_rack": {"preset_id": "bogus"}},
            {"fairlight_rack": {"hpf_hz": 500}},
            {"fairlight_rack": {"limiter": {"enabled": True, "ceiling_db": 0.5}}},
            {"fairlight_rack": {"compressor": {"enabled": True, "ratio": 99}}},
        ):
            bad_status, _, _ = _http_call(
                f"{base_url}/api/fairlight/rack/compile",
                method="POST",
                payload=bad_payload,
            )
            assert bad_status == 400

        # 2. Render plan endpoint with fairlight_rack
        sample_in = tmp_path / "rack_input.mp4"
        sample_in.write_bytes(b"fake-media")
        render_status, _, render_raw = _http_call(
            f"{base_url}/api/render/plan",
            method="POST",
            payload={
                "input_path": "rack_input.mp4",
                "output_path": "renders/rack_out.mp4",
                "profile": "web_h264",
                "fps": "25/1",
                "fairlight_rack": bv_model.model_dump(mode="json"),
                "execute": False,
            },
        )
        assert render_status == 200
        render_data = json.loads(render_raw.decode("utf-8"))
        assert render_data["plan"]["fairlight_rack_enabled"] is True
        assert render_data["plan"]["fairlight_rack_preset"] == "broadcast_voice"
        assert "lowshelf=" in render_data["plan"]["audio_filter"]
        assert "acompressor=" in render_data["plan"]["audio_filter"]
        assert "alimiter=" in render_data["plan"]["audio_filter"]

        # 3. Node.js parity + static-demo adapter parity
        if shutil.which("node"):
            ops_url = (ASSETS_DIR / "timeline_ops.js").as_uri()
            demo_url = (ASSETS_DIR / "demo_adapter.js").as_uri()
            node_script = (
                "import assert from 'node:assert/strict';\n"
                f"import {{ createApiClient }} from '{demo_url}';\n"
                "import {\n"
                "  applyFairlightRackPresetClient,\n"
                "  compileFairlightAudioRackClient,\n"
                "  evaluateFairlightEqCurveDb,\n"
                "  evaluateFairlightDynamicsTransferDb\n"
                f"}} from '{ops_url}';\n"
                "const bv = applyFairlightRackPresetClient('broadcast_voice');\n"
                "const comp = compileFairlightAudioRackClient(bv);\n"
                f"assert.equal(comp.filtergraph, {json.dumps(py_bv.filtergraph)});\n"
                "assert.equal(comp.is_identity, false);\n"
                "assert.ok(evaluateFairlightEqCurveDb(bv, 3200) > 2.0);\n"
                "assert.ok(evaluateFairlightEqCurveDb(bv, 40) < -5.0);\n"
                "assert.ok(evaluateFairlightDynamicsTransferDb(bv, 0) <= -0.99);\n"
                "globalThis.window = { __TAKTCUT_CONFIG__: { mode: 'static-demo' } };\n"
                "const client = createApiClient({ mode: 'static-demo' });\n"
                "const apiRes = await client.compileFairlightAudioRack({ fairlight_rack: bv });\n"
                f"assert.equal(apiRes.filtergraph, {json.dumps(py_bv.filtergraph)});\n"
                "console.log('FAIRLIGHT_RACK_PARITY_OK');\n"
            )
            proc = subprocess.run(
                ["node", "--input-type=module", "-e", node_script],
                capture_output=True,
                text=True,
                check=False,
            )
            assert proc.returncode == 0, f"Node parity failed: {proc.stderr}"
            assert "FAIRLIGHT_RACK_PARITY_OK" in proc.stdout

        # 4. Playwright live UI verification (1440x900 + 375x812, EN/FR, zero overflow)
        sync_playwright = pytest.importorskip("playwright.sync_api").sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            console_errors: list[str] = []
            page.on(
                "console",
                lambda msg: console_errors.append(msg.text) if msg.type == "error" else None,
            )
            page.on("pageerror", lambda err: console_errors.append(str(err)))
            try:
                page.goto(base_url, wait_until="networkidle")
                page.wait_for_function(
                    "() => document.getElementById('fairlight-rack-badge')"
                    "?.textContent === 'BYPASS'"
                )
                page.select_option("#fairlight-rack-preset", "broadcast_voice")
                page.wait_for_function(
                    "() => (document.getElementById('fairlight-rack-af-preview')"
                    "?.textContent || '').includes('acompressor=')"
                )
                rack_preview = page.locator("#fairlight-rack-af-preview").text_content() or ""
                assert "highpass=f=85.0" in rack_preview
                assert "lowshelf=" in rack_preview
                assert "alimiter=" in rack_preview

                eq_pixels = page.evaluate(
                    "() => {"
                    "  const c = document.getElementById('fairlight-eq-canvas');"
                    "  const ctx = c.getContext('2d');"
                    "  const d = ctx.getImageData(0, 0, c.width, c.height).data;"
                    "  let nonBg = 0;"
                    "  for (let i = 0; i < d.length; i += 16) {"
                    "    if (d[i] > 35 || d[i+1] > 35 || d[i+2] > 45) nonBg++;"
                    "  }"
                    "  return nonBg;"
                    "}"
                )
                assert eq_pixels > 50

                # Switch to Dynamics & Limiter tab and adjust Limiter ceiling
                page.click("#fairlight-rack-tab-dyn")
                assert (
                    page.locator("#fairlight-rack-tab-dyn").get_attribute("aria-selected")
                    == "true"
                )
                page.fill("#fairlight-lim-ceiling-num", "-2.0")
                page.locator("#fairlight-lim-ceiling-num").dispatch_event("input")
                page.wait_for_function(
                    "() => document.getElementById('fairlight-lim-ceiling-badge')?.textContent"
                    " === '-2.0 dBTP'"
                )
                dyn_pixels = page.evaluate(
                    "() => {"
                    "  const c = document.getElementById('fairlight-dyn-canvas');"
                    "  const ctx = c.getContext('2d');"
                    "  const d = ctx.getImageData(0, 0, c.width, c.height).data;"
                    "  let nonBg = 0;"
                    "  for (let i = 0; i < d.length; i += 16) {"
                    "    if (d[i] > 35 || d[i+1] > 35 || d[i+2] > 45) nonBg++;"
                    "  }"
                    "  return nonBg;"
                    "}"
                )
                assert dyn_pixels > 40

                # Verify Deliver Audio preview reflects Fairlight Rack
                del_preview = page.locator("#render-audio-af-preview").text_content() or ""
                assert "acompressor=" in del_preview
                assert "alimiter=" in del_preview

                # Switch to FR and check diacritics
                page.click("#lang-fr")
                assert "Dynamique & Limiteur" in (
                    page.locator("#fairlight-rack-tab-dyn").text_content() or ""
                )
                page.click("#lang-en")

                overflow_desktop = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert overflow_desktop <= 0, f"Desktop overflow: {overflow_desktop}px"

                # Mobile 375x812 check
                page.set_viewport_size({"width": 375, "height": 812})
                page.wait_for_function("() => window.innerWidth === 375")
                overflow_mobile = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert overflow_mobile <= 0, f"Mobile 375px overflow: {overflow_mobile}px"
                for btn_id in (
                    "fairlight-rack-tab-eq",
                    "fairlight-rack-tab-dyn",
                    "btn-fairlight-comp-toggle",
                    "btn-fairlight-lim-toggle",
                ):
                    h = page.evaluate(
                        f"() => document.getElementById('{btn_id}').getBoundingClientRect().height"
                    )
                    assert h >= 44, f"Mobile touch target {btn_id} too small: {h}px"

                # Reset back to BYPASS
                page.click("#btn-fairlight-rack-reset")
                page.wait_for_function(
                    "() => document.getElementById('fairlight-rack-badge')"
                    "?.textContent === 'BYPASS'"
                )
                assert console_errors == [], f"Console errors: {console_errors}"
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_ui_hsl_curves_endpoints_project_roundtrip_and_js_parity(
    ui_server: tuple[str, Path],
) -> None:
    base_url, _workspace = ui_server

    presets_status, _, presets_raw = _http_call(f"{base_url}/api/color/presets")
    assert presets_status == 200
    presets_data = json.loads(presets_raw.decode("utf-8"))
    hsl_presets = presets_data["hsl_curve_presets"]
    assert len(hsl_presets) == 6
    assert any(p["id"] == "teal_orange_push" for p in hsl_presets)

    hsl_payload = {
        "hue_vs_hue": {"reds": 12.0, "yellows": -8.0},
        "hue_vs_sat": {"greens": -0.60, "cyans": 0.35},
        "hue_vs_lum": {"blues": -0.22},
    }
    nodes_payload = [
        {
            "id": "node-1",
            "label": "HSL 6-Vector",
            "enabled": True,
            "hsl_curves": hsl_payload,
        }
    ]
    comp_status, _, comp_raw = _http_call(
        f"{base_url}/api/color/compile",
        method="POST",
        payload={"nodes": nodes_payload, "pix_fmt": "yuv420p"},
    )
    assert comp_status == 200
    comp = json.loads(comp_raw.decode("utf-8"))
    assert comp["is_identity"] is False
    assert comp["has_hsl_curves"] is True
    assert "huesaturation=colors=r:hue=12.00" in comp["filtergraph"]
    assert "huesaturation=colors=g:hue=0.00:saturation=-0.6000" in comp["filtergraph"]
    assert "huesaturation=colors=b:hue=0.00:saturation=0.0000:intensity=-0.2200" in comp[
        "filtergraph"
    ]

    shortcut_status, _, shortcut_raw = _http_call(
        f"{base_url}/api/color/compile",
        method="POST",
        payload={"hsl_curves": hsl_payload},
    )
    assert shortcut_status == 200
    shortcut = json.loads(shortcut_raw.decode("utf-8"))
    assert shortcut["has_hsl_curves"] is True

    bake_status, _, baked_raw = _http_call(
        f"{base_url}/api/color/bake",
        method="POST",
        payload={"nodes": nodes_payload, "size": 5, "title": "api_hsl_bake"},
    )
    assert bake_status == 200
    baked = json.loads(baked_raw.decode("utf-8"))
    assert "LUT_3D_SIZE 5" in baked["cube_text"]

    sample_status, _, sample_raw = _http_call(f"{base_url}/api/sample")
    assert sample_status == 200
    doc = json.loads(sample_raw.decode("utf-8"))["document"]
    exp_status, _, exp_raw = _http_call(
        f"{base_url}/api/project/export",
        method="POST",
        payload={
            "project": {
                "schema_version": "taktcut.project.v1",
                "project_name": "HSL_Curves_Roundtrip",
                "timeline": doc,
                "color": {"nodes": nodes_payload, "selected_node_id": "node-1"},
            }
        },
    )
    assert exp_status == 200
    exported_text = json.loads(exp_raw.decode("utf-8"))["project_json"]
    imp_status, _, imp_raw = _http_call(
        f"{base_url}/api/project/import",
        method="POST",
        payload={"project_json": exported_text},
    )
    assert imp_status == 200
    imp_node = json.loads(imp_raw.decode("utf-8"))["project"]["color"]["nodes"][0]
    assert imp_node["hsl_curves"]["hue_vs_hue"]["reds"] == pytest.approx(12.0)
    assert imp_node["hsl_curves"]["hue_vs_sat"]["greens"] == pytest.approx(-0.6)
    assert imp_node["hsl_curves"]["hue_vs_lum"]["blues"] == pytest.approx(-0.22)

    # Verify JS client & demo_adapter.js static-demo parity
    node_bin = shutil.which("node")
    assert node_bin is not None
    assets_dir = Path(__file__).resolve().parent.parent / "src" / "taktcut" / "ui" / "assets"
    ops_uri = (assets_dir / "timeline_ops.js").as_uri()
    demo_uri = (assets_dir / "demo_adapter.js").as_uri()
    js_script = f"""
globalThis.window = {{ location: {{ protocol: 'https:', search: '' }}, devicePixelRatio: 1 }};
globalThis.document = {{ createElement: () => ({{ getContext: () => null }}) }};
const ops = await import({json.dumps(ops_uri)});
const demo = await import({json.dumps(demo_uri)});
const hsl = {json.dumps(hsl_payload)};
const node = ops.createColorNode(1, {{ hsl_curves: hsl }});
const compiled = ops.compileColorNodeChainClient([node], 'yuv420p');
if (!compiled.has_hsl_curves) throw new Error('Expected has_hsl_curves=true');
if (!compiled.filtergraph.includes('huesaturation=colors=r:hue=12.00')) {{
  throw new Error('Unexpected JS filtergraph: ' + compiled.filtergraph);
}}
const [rOut, gOut, bOut] = ops.applyHslCurvesRgbClient(0.1, 0.85, 0.1, hsl);
if (gOut - rOut >= 0.35) throw new Error('Expected green sat reduction');
const gray = ops.applyHslCurvesRgbClient(0.5, 0.5, 0.5, hsl);
if (Math.abs(gray[0] - 0.5) > 1e-5) throw new Error('Expected gray neutrality');
const client = demo.createApiClient({{ mode: 'static-demo' }});
await client.initHealth();
const presetResp = await client.getColorPresets();
if (!Array.isArray(presetResp.hsl_curve_presets) || presetResp.hsl_curve_presets.length !== 6) {{
  throw new Error('Expected 6 demo hsl_curve_presets');
}}
const demoComp = await client.compileColorGrade({{ hsl_curves: hsl }});
if (!demoComp.has_hsl_curves || !demoComp.filtergraph.includes('huesaturation=colors=b')) {{
  throw new Error('Demo compileColorGrade parity failed');
}}
const cube = ops.bakeColorNodeChainToCubeTextClient([node], 5, 'js_hsl_bake');
if (!cube.includes('LUT_3D_SIZE 5')) throw new Error('Missing LUT_3D_SIZE 5');
console.log('HSL_JS_PARITY_OK');
"""
    proc = subprocess.run(
        [node_bin, "--input-type=module", "-e", js_script],
        capture_output=True,
        text=True,
        timeout=15,
        check=False,
    )
    assert proc.returncode == 0, f"Node parity failed: {proc.stderr}\n{proc.stdout}"
    assert "HSL_JS_PARITY_OK" in proc.stdout


def test_ui_hsl_curves_playwright_e2e(tmp_path: Path) -> None:
    from playwright.sync_api import sync_playwright

    workspace = tmp_path / "hsl_pw_ws"
    workspace.mkdir()

    server = create_ui_server(host="127.0.0.1", port=0, workspace_dir=workspace)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = f"http://127.0.0.1:{port}"
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            console_errors: list[str] = []
            page.on(
                "console",
                lambda msg: console_errors.append(msg.text) if msg.type == "error" else None,
            )
            page.on("pageerror", lambda err: console_errors.append(str(err)))
            try:
                page.goto(base_url, wait_until="networkidle")
                page.wait_for_selector("#tab-color")
                page.click("#tab-color")
                page.wait_for_selector("#color-curves-dock")

                # Switch Curve Mode to Hue vs Hue
                page.click("[data-curve-mode='hue_vs_hue']")
                page.wait_for_function(
                    "() => document.getElementById('hsl-vector-strip')"
                    " && !document.getElementById('hsl-vector-strip')"
                    ".classList.contains('is-hidden')"
                )
                assert (
                    page.locator("[data-curve-mode='hue_vs_hue']").get_attribute("aria-pressed")
                    == "true"
                )

                # Verify rainbow hue spectrum canvas rendered pixels
                hsl_pixels = page.evaluate(
                    "() => {"
                    "  const c = document.getElementById('color-curves-canvas');"
                    "  const ctx = c.getContext('2d');"
                    "  const d = ctx.getImageData(0, 0, c.width, c.height).data;"
                    "  let colored = 0;"
                    "  for (let i = 0; i < d.length; i += 16) {"
                    "    const spread = Math.max(d[i], d[i+1], d[i+2])"
                    " - Math.min(d[i], d[i+1], d[i+2]);"
                    "    if (spread > 18) colored++;"
                    "  }"
                    "  return colored;"
                    "}"
                )
                assert hsl_pixels > 50

                # Apply Teal & Orange HSL Curve Preset
                page.click("[data-hsl-preset='teal_orange_push']")
                page.wait_for_function(
                    "() => (document.getElementById('color-filtergraph-output')?.textContent || '')"
                    ".includes('huesaturation=colors=r')"
                )
                filter_text = page.locator("#color-filtergraph-output").text_content() or ""
                assert "huesaturation=colors=r:hue=8.00" in filter_text
                assert "huesaturation=colors=g" in filter_text
                assert "HSL" in (page.locator("#curves-status-badge").text_content() or "")

                # Switch to Hue vs Sat, select Greens, nudge down via keyboard
                page.click("[data-curve-mode='hue_vs_sat']")
                page.click("[data-hsl-vector='greens']")
                canvas = page.locator("#color-curves-canvas")
                canvas.focus()
                page.keyboard.press("ArrowDown")
                readout_text = page.locator("#curves-point-readout").text_content() or ""
                assert "GREENS (120°)" in readout_text
                assert "-47% SAT" in readout_text

                # Switch to FR and check diacritics, then back to EN
                page.click("#lang-fr")
                assert "Teinte / Teinte" in (
                    page.locator("[data-curve-mode='hue_vs_hue']").text_content() or ""
                )
                assert "Feuillage Émeraude" in (
                    page.locator("[data-hsl-preset='foliage_emerald']").text_content() or ""
                )
                page.click("#lang-en")

                overflow_desktop = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert overflow_desktop <= 0, f"Desktop overflow: {overflow_desktop}px"

                # Mobile 375x812 check
                page.set_viewport_size({"width": 375, "height": 812})
                page.wait_for_function("() => window.innerWidth === 375")
                overflow_mobile = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert overflow_mobile <= 0, f"Mobile 375px overflow: {overflow_mobile}px"

                for selector in (
                    "[data-curve-mode='hue_vs_hue']",
                    "[data-hsl-vector='greens']",
                    "[data-hsl-preset='teal_orange_push']",
                ):
                    h = page.evaluate(
                        f"() => document.querySelector({json.dumps(selector)})"
                        ".getBoundingClientRect().height"
                    )
                    assert h >= 44, f"Mobile touch target {selector} too small: {h}px"

                # Reset all curves cleanly
                page.click("#btn-curves-reset-all")
                page.wait_for_function(
                    "() => document.getElementById('curves-status-badge')?.textContent"
                    " === 'LINEAR'"
                )
                assert console_errors == [], f"Console errors: {console_errors}"
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_fx_pro_optical_pack_and_effect_mask_api_and_demo_parity(
    ui_server: tuple[str, Path],
) -> None:
    url, _ = ui_server
    status_p, _, raw_p = _http_call(f"{url}/api/fx/presets")
    assert status_p == 200
    presets_data = json.loads(raw_p.decode("utf-8"))
    specs = presets_data["specs"]
    for fx_id in ("pro_mist", "directional_blur", "tilt_shift", "prism_leak"):
        assert fx_id in specs
    assert len(specs) == 24
    preset_ids = {p["id"] for p in presets_data["presets"]}
    assert {
        "black_promist_cinema",
        "miniature_tilt_shift",
        "anamorphic_prism_leak",
    }.issubset(preset_ids)

    payload = {
        "nodes": [
            {
                "effect": "pro_mist",
                "enabled": True,
                "params": {
                    "diffusion_strength": 0.5,
                    "highlight_threshold": 0.52,
                    "bloom_radius": 10,
                    "warmth": 0.25,
                },
                "effect_mask": {
                    "shape": "ellipse",
                    "center_x": 0.5,
                    "center_y": 0.5,
                    "radius_x": 0.35,
                    "radius_y": 0.35,
                    "feather": 0.12,
                    "invert": False,
                },
            },
            {
                "effect": "directional_blur",
                "enabled": True,
                "params": {"blur_amount": 8, "angle_deg": 30},
            },
            {
                "effect": "tilt_shift",
                "enabled": True,
                "params": {
                    "focus_y": 0.52,
                    "band_height": 0.24,
                    "blur_strength": 7,
                    "sat_boost": 1.3,
                },
            },
            {
                "effect": "prism_leak",
                "enabled": True,
                "params": {
                    "leak_intensity": 0.55,
                    "leak_corner": "top_right",
                    "prism_shift_px": 4,
                },
            },
        ],
        "duration_seconds": 10.0,
        "width": 1920,
        "height": 1080,
    }
    status_c, _, raw_c = _http_call(f"{url}/api/fx/compile", method="POST", payload=payload)
    assert status_c == 200
    compiled = json.loads(raw_c.decode("utf-8"))
    assert compiled["active_effects"] == [
        "pro_mist",
        "directional_blur",
        "tilt_shift",
        "prism_leak",
    ]
    assert compiled["masked_effects"] == ["pro_mist"]
    assert "maskedmerge" in compiled["filtergraph"]
    assert "avgblur=sizeX=8:sizeY=1" in compiled["filtergraph"]
    assert "hypot(X/W-0.94,Y/H-0.06)" in compiled["filtergraph"]

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    html_text = (assets_dir / "index.html").read_text(encoding="utf-8")
    for fx_id in ("pro_mist", "directional_blur", "tilt_shift", "prism_leak"):
        assert f'data-fx-add="{fx_id}"' in html_text
    for pid in ("black_promist_cinema", "miniature_tilt_shift", "anamorphic_prism_leak"):
        assert f'data-fx-preset="{pid}"' in html_text
    assert "24 FX" in html_text

    for asset_name in (
        "index.html",
        "app.js",
        "canvas.js",
        "demo_adapter.js",
        "i18n.js",
        "styles.css",
    ):
        content = (assets_dir / asset_name).read_text(encoding="utf-8")
        assert "\u2014" not in content, f"U+2014 found in {asset_name}"
        assert "\u2013" not in content, f"U+2013 found in {asset_name}"
        if asset_name.endswith(".js"):
            assert "innerHTML" not in content, f"innerHTML sink found in {asset_name}"

    demo_js = (assets_dir / "demo_adapter.js").read_text(encoding="utf-8")
    if shutil.which("node") is not None:
        demo_url = (assets_dir / "demo_adapter.js").as_uri()
        node_script = (
            "globalThis.window = { __TAKTCUT_CONFIG__: { mode: 'static-demo' } };\n"
            f"const mod = await import({json.dumps(demo_url)});\n"
            "const client = mod.createApiClient();\n"
            f"const res = await client.compileFx({json.dumps(payload)});\n"
            "console.log(JSON.stringify(res));\n"
        )
        proc = subprocess.run(
            ["node", "--input-type=module", "-e", node_script],
            capture_output=True,
            text=True,
            timeout=10,
            check=True,
        )
        demo_compiled = json.loads(proc.stdout.strip())
        assert demo_compiled["active_effects"] == compiled["active_effects"]
        assert demo_compiled["masked_effects"] == compiled["masked_effects"]
        assert "maskedmerge" in demo_compiled["filtergraph"]
        assert "avgblur=sizeX=8:sizeY=1" in demo_compiled["filtergraph"]
    assert "compileEffectMaskExprClient" in demo_js


def test_fx_pro_optical_pack_and_effect_mask_playwright_responsive(
    ui_server: tuple[str, Path],
) -> None:
    pw_api = pytest.importorskip("playwright.sync_api")
    url, _ = ui_server
    with pw_api.sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            console_errors: list[str] = []
            page.on(
                "console",
                lambda msg: console_errors.append(msg.text)
                if msg.type == "error"
                else None,
            )
            page.on("pageerror", lambda exc: console_errors.append(str(exc)))
            page.goto(url, wait_until="domcontentloaded")
            page.click("#tab-fx")
            page.wait_for_selector("#panel-fx:not(.is-hidden)")

            # Apply Black Pro-Mist 1/4 1-click preset
            page.click("[data-fx-preset='black_promist_cinema']")
            page.wait_for_function(
                "() => (document.getElementById('fx-filtergraph-output')?.textContent || '')"
                ".includes('lutrgb=')"
            )

            # Add Directional Blur and Tilt-Shift and Prism Leak nodes
            page.click("[data-fx-add='directional_blur']")
            page.click("[data-fx-add='tilt_shift']")
            page.click("[data-fx-add='prism_leak']")
            page.wait_for_function(
                "() => document.querySelectorAll('#fx-controls-stack .fx-node-card').length"
                " === 6"
            )

            # Toggle Effect Mask -> Ellipse -> Invert on first FX card
            first_mask_btn = page.locator("#fx-controls-stack .fx-mask-toggle-btn").first
            first_mask_btn.click()
            page.locator(
                "#fx-controls-stack .fx-mask-panel [data-fx-mask-shape='ellipse']"
            ).first.click()
            page.locator("#fx-controls-stack .fx-mask-invert-btn").first.click()

            page.wait_for_function(
                "() => (document.getElementById('fx-filtergraph-output')?.textContent || '')"
                ".includes('1-clip(')"
            )
            fg_text = page.locator("#fx-filtergraph-output").text_content() or ""
            assert "maskedmerge" in fg_text
            assert "1-clip(" in fg_text
            kv_text = page.locator("#fx-compile-kv").text_content() or ""
            assert "Mask: pro_mist" in kv_text

            # Verify FX Program Monitor canvas painted live non-empty pixels
            rendered_pixels = page.evaluate(
                "() => {"
                "  const c = document.getElementById('fx-program-canvas');"
                "  const ctx = c.getContext('2d');"
                "  const d = ctx.getImageData(0, 0, c.width, c.height).data;"
                "  let lit = 0;"
                "  for (let i = 0; i < d.length; i += 16) {"
                "    if (d[i] + d[i+1] + d[i+2] > 90) lit++;"
                "  }"
                "  return lit;"
                "}"
            )
            assert rendered_pixels > 100

            # Check EN -> FR i18n switch
            page.click("#lang-fr")
            assert "Tous (24)" in (
                page.locator("[data-fx-cat-filter='all']").text_content() or ""
            )
            assert "Inverser" in (
                page.locator("#fx-controls-stack .fx-mask-invert-btn").first.text_content()
                or ""
            )
            page.click("#lang-en")

            overflow_desktop = page.evaluate(
                "() => document.documentElement.scrollWidth - window.innerWidth"
            )
            assert overflow_desktop <= 0, f"Desktop overflow: {overflow_desktop}px"

            # Mobile 375x812 check
            page.set_viewport_size({"width": 375, "height": 812})
            page.wait_for_function("() => window.innerWidth === 375")
            overflow_mobile = page.evaluate(
                "() => document.documentElement.scrollWidth - window.innerWidth"
            )
            assert overflow_mobile <= 0, f"Mobile 375px overflow: {overflow_mobile}px"

            for selector in (
                "[data-fx-add='pro_mist']",
                "#fx-controls-stack .fx-mask-toggle-btn",
                "#fx-controls-stack .fx-mask-panel [data-fx-mask-shape='ellipse']",
                "#fx-controls-stack .fx-mask-invert-btn",
            ):
                h = page.evaluate(
                    f"() => document.querySelector({json.dumps(selector)})"
                    ".getBoundingClientRect().height"
                )
                assert h >= 44, f"Mobile touch target {selector} too small: {h}px"

            assert console_errors == [], f"Console errors: {console_errors}"
        finally:
            browser.close()


def test_color_warper_api_presets_compile_bake_and_demo_parity(
    ui_server: tuple[str, Path],
) -> None:
    url, _ = ui_server
    st_p, _, raw_p = _http_call(f"{url}/api/color/presets")
    assert st_p == 200
    presets_data = json.loads(raw_p.decode("utf-8"))
    warper_presets = presets_data["warper_presets"]
    assert len(warper_presets) == 6
    assert any(p["id"] == "teal_orange_warp" for p in warper_presets)
    assert presets_data["bounds"]["color_warper"]["hue_count"] == 6
    assert presets_data["bounds"]["color_warper"]["sat_rings"] == 3

    warper_payload = {
        "points": [
            {"hue_idx": 0, "ring_idx": 2, "hue_offset": 24.0, "sat_offset": 0.15},
            {"hue_idx": 2, "ring_idx": 1, "hue_offset": 12.0, "sat_offset": -0.30},
        ]
    }
    node_req = {
        "nodes": [
            {
                "id": "node-1",
                "label": "Warper",
                "enabled": True,
                "color_warper": warper_payload,
            }
        ],
        "pix_fmt": "yuv420p",
    }
    st_c, _, raw_c = _http_call(f"{url}/api/color/compile", method="POST", payload=node_req)
    assert st_c == 200
    compiled = json.loads(raw_c.decode("utf-8"))
    assert compiled["is_identity"] is False
    assert compiled["has_color_warper"] is True
    assert "huesaturation=colors=r" in compiled["filtergraph"]

    st_s, _, raw_s = _http_call(
        f"{url}/api/color/compile",
        method="POST",
        payload={"color_warper": warper_payload},
    )
    assert st_s == 200
    standalone_compiled = json.loads(raw_s.decode("utf-8"))
    assert standalone_compiled["has_color_warper"] is True
    assert "huesaturation=colors=g" in standalone_compiled["filtergraph"]

    st_b, _, raw_b = _http_call(
        f"{url}/api/color/bake",
        method="POST",
        payload={
            "nodes": node_req["nodes"],
            "size": 17,
            "title": "warper_cube",
        },
    )
    assert st_b == 200
    baked = json.loads(raw_b.decode("utf-8"))
    assert baked["info"]["entry_count"] == 17**3
    assert "LUT_3D_SIZE 17" in baked["cube_text"]

    assets_dir = Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
    for asset_name in (
        "index.html",
        "app.js",
        "canvas.js",
        "demo_adapter.js",
        "i18n.js",
        "styles.css",
        "timeline_ops.js",
    ):
        content = (assets_dir / asset_name).read_text(encoding="utf-8")
        assert "\u2014" not in content, f"U+2014 found in {asset_name}"
        assert "\u2013" not in content, f"U+2013 found in {asset_name}"
        if asset_name.endswith(".js"):
            assert "innerHTML" not in content, f"innerHTML sink found in {asset_name}"

    if shutil.which("node") is not None:
        demo_url = (assets_dir / "demo_adapter.js").as_uri()
        node_script = (
            "globalThis.window = { __TAKTCUT_CONFIG__: { mode: 'static-demo' } };\n"
            f"const mod = await import({json.dumps(demo_url)});\n"
            "const client = mod.createApiClient();\n"
            "const pres = await client.getColorPresets();\n"
            f"const comp = await client.compileColorGrade({json.dumps(node_req)});\n"
            "console.log(JSON.stringify({ presCount: pres.warper_presets.length, comp }));\n"
        )
        proc = subprocess.run(
            ["node", "--input-type=module", "-e", node_script],
            capture_output=True,
            text=True,
            timeout=10,
            check=True,
        )
        out = json.loads(proc.stdout.strip())
        assert out["presCount"] == 6
        assert out["comp"]["has_color_warper"] is True
        assert out["comp"]["filtergraph"] == compiled["filtergraph"]


def test_color_warper_spider_grid_playwright_responsive(
    ui_server: tuple[str, Path],
) -> None:
    pw_api = pytest.importorskip("playwright.sync_api")
    url, _ = ui_server
    with pw_api.sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            console_errors: list[str] = []
            page.on(
                "console",
                lambda msg: console_errors.append(msg.text)
                if msg.type == "error"
                else None,
            )
            page.on("pageerror", lambda exc: console_errors.append(str(exc)))
            page.goto(url, wait_until="domcontentloaded")
            page.click("#tab-color")
            page.wait_for_selector("#panel-color:not(.is-hidden)")
            page.wait_for_selector("#color-warper-dock")

            # Verify Color Warper canvas painted spider grid
            painted_px = page.evaluate(
                "() => {"
                "  const c = document.getElementById('color-warper-canvas');"
                "  const ctx = c.getContext('2d');"
                "  const d = ctx.getImageData(0, 0, c.width, c.height).data;"
                "  let lit = 0;"
                "  for (let i = 0; i < d.length; i += 16) {"
                "    if (d[i] + d[i+1] + d[i+2] > 120) lit++;"
                "  }"
                "  return lit;"
                "}"
            )
            assert painted_px > 50

            # Apply Teal & Orange warper preset
            page.click("[data-warper-preset='teal_orange_warp']")
            page.wait_for_function(
                "() => (document.getElementById('warper-status-badge')?.textContent || '')"
                ".includes('WARPED')"
            )
            page.wait_for_function(
                "() => (document.getElementById('color-filtergraph-output')?.textContent || '')"
                ".includes('huesaturation=colors=')"
            )
            assert "WARP" in (
                page.locator("#color-node-graph .color-node-warp-tag").first.text_content() or ""
            )

            # Reset grid, select Cyan spoke (3) ring 2 (100%), nudge hue via numeric input
            page.click("#btn-warper-reset-all")
            page.wait_for_function(
                "() => (document.getElementById('warper-status-badge')?.textContent || '')"
                ".includes('IDENTITY')"
            )
            page.click("[data-warper-hue='3']")
            page.click("[data-warper-ring='2']")
            hue_num = page.locator("#warper-hue-num")
            hue_num.fill("18")
            hue_num.dispatch_event("change")
            page.wait_for_function(
                "() => (document.getElementById('warper-point-readout')?.textContent || '')"
                ".includes('PT C3 | H +18.0 deg')"
            )
            page.wait_for_function(
                "() => (document.getElementById('color-filtergraph-output')?.textContent || '')"
                ".includes('huesaturation=colors=c:hue=8.10')"
            )

            # Reset single point
            page.click("#btn-warper-reset-pt")
            page.wait_for_function(
                "() => (document.getElementById('warper-status-badge')?.textContent || '')"
                ".includes('IDENTITY')"
            )

            # Keyboard arrow nudge on canvas
            page.click("[data-warper-preset='kodak_warm_skin']")
            warper_canvas = page.locator("#color-warper-canvas")
            warper_canvas.focus()
            page.keyboard.press("ArrowRight")
            assert "WARPED" in (page.locator("#warper-status-badge").text_content() or "")

            # EN -> FR i18n check
            page.click("#lang-fr")
            assert "DÉFORMÉ" in (page.locator("#warper-status-badge").text_content() or "")
            assert "Peau Kodak" in (
                page.locator("[data-warper-preset='kodak_warm_skin']").text_content() or ""
            )
            page.click("#lang-en")

            overflow_desktop = page.evaluate(
                "() => document.documentElement.scrollWidth - window.innerWidth"
            )
            assert overflow_desktop <= 0, f"Desktop overflow: {overflow_desktop}px"

            # Mobile 375x812 check
            page.set_viewport_size({"width": 375, "height": 812})
            page.wait_for_function("() => window.innerWidth === 375")
            overflow_mobile = page.evaluate(
                "() => document.documentElement.scrollWidth - window.innerWidth"
            )
            assert overflow_mobile <= 0, f"Mobile 375px overflow: {overflow_mobile}px"

            for selector in (
                "[data-warper-preset='teal_orange_warp']",
                "[data-warper-hue='0']",
                "[data-warper-ring='2']",
                "#btn-warper-reset-pt",
                "#btn-warper-reset-all",
            ):
                h = page.evaluate(
                    f"() => document.querySelector({json.dumps(selector)})"
                    ".getBoundingClientRect().height"
                )
                assert h >= 44, f"Mobile touch target {selector} too small: {h}px"

            assert console_errors == [], f"Console errors: {console_errors}"
        finally:
            browser.close()


def test_fairlight_fft_analyzer_and_transient_marker_snapper_parity_and_ui(
    tmp_path: Path,
) -> None:
    from taktcut.render import apply_fairlight_rack_preset
    from taktcut.ui.samples import build_sample_timeline

    server = create_ui_server(host="127.0.0.1", port=0, workspace_dir=tmp_path)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address[0], server.server_address[1]
    host_s = host.decode("ascii") if isinstance(host, bytes) else str(host)
    base_url = f"http://{host_s}:{port}"
    try:
        doc = build_sample_timeline("clean")
        doc_json = doc.model_dump(mode="json")
        rack_bv = apply_fairlight_rack_preset("broadcast_voice").model_dump(mode="json")

        # 1. /api/fairlight/analyzer/spectrum valid & invalid
        status, _, raw = _http_call(
            f"{base_url}/api/fairlight/analyzer/spectrum",
            method="POST",
            payload={
                "document": doc_json,
                "playhead_frame": 25,
                "fairlight_rack": rack_bv,
                "master_gain_db": 0.0,
            },
        )
        assert status == 200
        spec_data = json.loads(raw.decode("utf-8"))
        assert len(spec_data["bands"]) == 32
        assert spec_data["active_audio_clips"] >= 1
        assert "showspectrumpic=" in spec_data["ffmpeg_filter"]

        bad_spec_status, _, _ = _http_call(
            f"{base_url}/api/fairlight/analyzer/spectrum",
            method="POST",
            payload={"document": doc_json, "playhead_frame": -5},
        )
        assert bad_spec_status == 400

        # 2. /api/fairlight/transients/detect valid & invalid
        status, _, raw = _http_call(
            f"{base_url}/api/fairlight/transients/detect",
            method="POST",
            payload={
                "document": doc_json,
                "config": {
                    "sensitivity": 0.70,
                    "min_interval_ms": 220,
                    "freq_focus": "kick_low",
                    "marker_color": "Gold",
                    "max_markers": 24,
                    "snap_to_bpm": True,
                    "bpm": 128.0,
                },
                "fairlight_rack": rack_bv,
            },
        )
        assert status == 200
        tr_data = json.loads(raw.decode("utf-8"))
        assert tr_data["peak_count"] > 0
        assert len(tr_data["markers"]) == tr_data["peak_count"]
        assert all(m["color"] == "Gold" for m in tr_data["markers"])

        bad_tr_status, _, _ = _http_call(
            f"{base_url}/api/fairlight/transients/detect",
            method="POST",
            payload={"document": doc_json, "config": {"freq_focus": "invalid_band"}},
        )
        assert bad_tr_status == 400

        # 3. Node.js demo_adapter.js static-demo parity
        node_bin = shutil.which("node")
        if node_bin:
            assets_dir = (
                Path(__file__).resolve().parents[1] / "src" / "taktcut" / "ui" / "assets"
            )
            demo_uri = (assets_dir / "demo_adapter.js").as_uri()
            script = (
                f"import {{ createApiClient }} from {json.dumps(demo_uri)};\n"
                "globalThis.window = { __TAKTCUT_CONFIG__: { mode: 'static-demo' } };\n"
                "const client = createApiClient();\n"
                f"const doc = {json.dumps(doc_json)};\n"
                f"const rack = {json.dumps(rack_bv)};\n"
                "const sp = await client.analyzeFairlightSpectrum("
                "{ document: doc, playhead_frame: 25, fairlight_rack: rack });\n"
                "if (!Array.isArray(sp.bands) || sp.bands.length !== 32) "
                "throw new Error('bands mismatch');\n"
                "const tr = await client.detectFairlightTransients("
                "{ document: doc, config: { sensitivity: 0.70, min_interval_ms: 220, "
                "freq_focus: 'kick_low', marker_color: 'Gold', max_markers: 24, "
                "snap_to_bpm: true, bpm: 128 }, fairlight_rack: rack });\n"
                f"if (tr.peak_count !== {tr_data['peak_count']}) "
                "throw new Error('peak_count mismatch: ' + tr.peak_count);\n"
                "console.log('FAIRLIGHT_FFT_PARITY_OK');\n"
            )
            proc = subprocess.run(
                [node_bin, "--input-type=module", "-e", script],
                capture_output=True,
                text=True,
                timeout=15,
                check=False,
            )
            assert proc.returncode == 0, proc.stderr
            assert "FAIRLIGHT_FFT_PARITY_OK" in proc.stdout

        # 4. Playwright live UI verification (1440x900 & 375x812, EN/FR, zero overflow)
        sync_playwright = pytest.importorskip("playwright.sync_api").sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            console_errors: list[str] = []
            page.on(
                "console",
                lambda msg: console_errors.append(msg.text) if msg.type == "error" else None,
            )
            page.on("pageerror", lambda err: console_errors.append(str(err)))
            try:
                page.goto(base_url, wait_until="networkidle")
                page.wait_for_function(
                    "() => document.getElementById('fairlight-rack-tab-fft') !== null"
                )
                page.click("#fairlight-rack-tab-fft")
                assert (
                    page.locator("#fairlight-rack-tab-fft").get_attribute("aria-selected")
                    == "true"
                )
                fft_pixels = page.evaluate(
                    "() => {"
                    "  const c = document.getElementById('fairlight-fft-canvas');"
                    "  const ctx = c.getContext('2d');"
                    "  const d = ctx.getImageData(0, 0, c.width, c.height).data;"
                    "  let nonBg = 0;"
                    "  for (let i = 0; i < d.length; i += 16) {"
                    "    if (d[i] > 35 || d[i+1] > 35 || d[i+2] > 45) nonBg++;"
                    "  }"
                    "  return nonBg;"
                    "}"
                )
                assert fft_pixels > 50

                initial_mkr_text = page.locator("#timeline-marker-count").text_content() or "0 MKR"
                initial_mkr_count = int(initial_mkr_text.split()[0])

                page.select_option("#fairlight-transient-focus", "kick_low")
                page.select_option("#fairlight-transient-color", "Gold")
                page.click("#btn-fairlight-detect-transients")
                page.wait_for_function(
                    "() => {"
                    "  const txt = document.getElementById('fairlight-transient-bpm-badge')"
                    "?.textContent || '';"
                    "  const parts = txt.split('|');"
                    "  return parts.length === 2 && parseInt(parts[1], 10) > 0;"
                    "}"
                )
                after_mkr_text = page.locator("#timeline-marker-count").text_content() or "0 MKR"
                after_mkr_count = int(after_mkr_text.split()[0])
                assert after_mkr_count > initial_mkr_count

                # Snap playhead to next transient and sync BPM grid
                page.click("#btn-fairlight-transient-next")
                page.click("#btn-fairlight-sync-bpm")
                assert (
                    page.locator("#btn-bpm-grid").get_attribute("aria-pressed") == "true"
                )

                # FR i18n check
                page.click("#lang-fr")
                assert "FFT & Transitoires" in (
                    page.locator("#fairlight-rack-tab-fft").text_content() or ""
                )
                assert "Détecter & Marquer" in (
                    page.locator("#btn-fairlight-detect-transients").text_content() or ""
                )
                page.click("#lang-en")

                overflow_desktop = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert overflow_desktop <= 0, f"Desktop overflow: {overflow_desktop}px"

                # Mobile 375x812 check
                page.set_viewport_size({"width": 375, "height": 812})
                page.wait_for_function("() => window.innerWidth === 375")
                overflow_mobile = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth"
                )
                assert overflow_mobile <= 0, f"Mobile 375px overflow: {overflow_mobile}px"

                for btn_id in (
                    "fairlight-rack-tab-fft",
                    "btn-fairlight-detect-transients",
                    "btn-fairlight-transient-prev",
                    "btn-fairlight-transient-next",
                    "btn-fairlight-sync-bpm",
                    "btn-fairlight-transients-clear",
                ):
                    h = page.evaluate(
                        f"() => document.getElementById('{btn_id}')"
                        ".getBoundingClientRect().height"
                    )
                    assert h >= 44, f"Mobile touch target {btn_id} too small: {h}px"

                page.click("#btn-fairlight-transients-clear")
                page.wait_for_function(
                    "() => (document.getElementById('fairlight-transient-bpm-badge')"
                    "?.textContent || '').includes('| 0 PK')"
                )
                assert console_errors == [], f"Console errors: {console_errors}"
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)





