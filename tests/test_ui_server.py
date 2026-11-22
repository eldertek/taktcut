"""Automated tests for taktcut local Web Studio GUI server, APIs, and security."""

from __future__ import annotations

import base64
import json
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
    assert health["version"] == "0.1.3"
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
        "btn-tool-blade",
        "btn-timeline-split",
        "btn-timeline-snap",
        "btn-timeline-undo",
        "btn-timeline-redo",
        "timeline-tool-badge",
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
    ):
        assert elem_id in html_text
    assert "v0.1.3" in html_text

    css_status, _, css_raw = _http_call(f"{base_url}/styles.css")
    assert css_status == 200
    css_text = css_raw.decode("utf-8")
    assert ":focus-visible" in css_text
    assert "min-height: 44px" in css_text
    assert "\u2013" not in css_text and "\u2014" not in css_text

    i18n_status, _, i18n_raw = _http_call(f"{base_url}/i18n.js")
    assert i18n_status == 200
    i18n_text = i18n_raw.decode("utf-8")
    assert "\u2013" not in i18n_text and "\u2014" not in i18n_text
    assert '"Étalonnage"' in i18n_text
    assert '"TEMPÉRATURE"' in i18n_text
    assert '"Télécharger OTIO"' in i18n_text
    assert '"Sélection"' in i18n_text
    assert '"Rasoir"' in i18n_text
    assert '"Magnétisme"' in i18n_text
    assert '"Audio du Plan & Mixeur Pistes"' in i18n_text
    assert '"Fondu Entrée (s)"' in i18n_text
    assert '"Fondu Sortie (s)"' in i18n_text
    assert '"Fondu Enchaîné (fade)"' in i18n_text
    assert '"Volet Gauche (wipeleft)"' in i18n_text
    assert '"statusbar.shortcuts"' in i18n_text
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
  MARKER_COLORS,
  addMarkerInDocument,
  buildAtempoStagesClient,
  collectSnapTargets,
  compileAudioFilterClient,
  compileRetimeFilterClient,
  compileTransitionFilterClient,
  computeBpmBeatFrames,
  deleteMarkerInDocument,
  findActiveTransitionAtFrame,
  findAdjacentCutForClip,
  findAllCutJunctions,
  findMagneticSnap,
  formatRetimeBadgeText,
  isTrackAudiblyMuted,
  normalizeBpmConfig,
  normalizeClipAudio,
  normalizeClipRetime,
  normalizeClipTransition,
  normalizeMarkerColor,
  splitClipInDocument,
  splitClipsAtPlayhead,
  toggleTrackMuteInDocument,
  toggleTrackSoloInDocument,
  trimClipInDocument,
  updateClipAudioInDocument,
  updateClipRetimeInDocument,
  updateClipTransitionInDocument,
  updateMarkerInDocument,
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
"""
    proc = subprocess.run(
        [node, "--input-type=module", "-e", script],
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
                if width == 1440:
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

                    # Verify Clip Audio Gain / Fade Controls & Track Mute/Solo Mixer
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

                if width == 375:
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
                    page.locator('[data-grade-preset="teal_orange"]').click()
                    page.wait_for_function(
                        "() => document.getElementById('color-compile-badge').textContent"
                        " === 'GRADED'"
                    )
                    fg_text = page.locator("#color-filtergraph-output").text_content() or ""
                    assert "colorbalance=" in fg_text
                    assert "eq=contrast=1.1400:saturation=1.1800" in fg_text

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
                    )
                    assert (
                        page.locator("#title-text-input").input_value() == "ECLIPSE SHOWREEL 2026"
                    )
                    title_fg = page.locator("#title-filtergraph-output").text_content() or ""
                    assert "drawbox=" in title_fg
                    assert "drawtext=" in title_fg

                assert not errors, f"Console/page errors at {width}x{height}: {errors}"
                assert not bad_http, f"HTTP errors at {width}x{height}: {bad_http}"
                ctx.close()
            browser.close()
    except Exception as exc:
        if "Executable doesn't exist" in str(exc):
            pytest.skip("Playwright Chromium browser binary unavailable")
        raise
