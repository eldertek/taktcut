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
    assert '"Télécharger OTIO"' in i18n_text
    assert "innerHTML" not in i18n_text


def test_ui_responsive_playwright_viewports(ui_server: tuple[str, Path]) -> None:
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        pytest.skip("Playwright not installed in this environment")

    base_url, _ = ui_server
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            for width, height in ((375, 812), (1440, 900)):
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
                assert not errors, f"Console/page errors at {width}x{height}: {errors}"
                assert not bad_http, f"HTTP errors at {width}x{height}: {bad_http}"
                ctx.close()
            browser.close()
    except Exception as exc:
        if "Executable doesn't exist" in str(exc):
            pytest.skip("Playwright Chromium browser binary unavailable")
        raise
