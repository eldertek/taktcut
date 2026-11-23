"""Tests for taktcut Remote Render Node client/server, Bearer auth, SSRF guard, and UI proxy."""

from __future__ import annotations

import base64
import json
import shutil
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest

from taktcut.remote_render import (
    RemoteRenderClient,
    RemoteRenderJobRequest,
    SsrfGuardError,
    create_remote_render_server,
    validate_remote_node_url,
)
from taktcut.ui.samples import generate_synthetic_sample_clip
from taktcut.ui.server import create_ui_server


def _http_call(
    url: str,
    *,
    method: str = "GET",
    payload: Any = None,
    headers: dict[str, str] | None = None,
) -> tuple[int, dict[str, str], bytes]:
    req_headers = dict(headers or {})
    body: bytes | None = None
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        req_headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp_headers = {k.lower(): v for k, v in resp.headers.items()}
            return resp.status, resp_headers, resp.read()
    except urllib.error.HTTPError as err:
        resp_headers = {k.lower(): v for k, v in err.headers.items()}
        return err.code, resp_headers, err.read()


@pytest.fixture()
def remote_node_server(tmp_path: Path) -> Iterator[tuple[str, str, Path]]:
    node_ws = tmp_path / "remote_node_ws"
    node_ws.mkdir(parents=True, exist_ok=True)
    token = "titouan-super-secret-bearer-token"
    server = create_remote_render_server(
        host="127.0.0.1",
        port=0,
        workspace_dir=node_ws,
        auth_token=token,
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address[0], server.server_address[1]
    host_s = host.decode("ascii") if isinstance(host, bytes) else str(host)
    try:
        yield f"http://{host_s}:{port}", token, node_ws
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


@pytest.fixture()
def studio_ui_server(tmp_path: Path) -> Iterator[tuple[str, Path]]:
    studio_ws = tmp_path / "studio_ws"
    studio_ws.mkdir(parents=True, exist_ok=True)
    server = create_ui_server(host="127.0.0.1", port=0, workspace_dir=studio_ws)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address[0], server.server_address[1]
    host_s = host.decode("ascii") if isinstance(host, bytes) else str(host)
    try:
        yield f"http://{host_s}:{port}", studio_ws
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_ssrf_guard_allows_https_and_lan_and_blocks_unsafe_targets() -> None:
    allowed_urls = (
        "https://render.eldertek.io:8742/",
        "https://192.168.1.42:8742",
        "http://192.168.1.50:8742",
        "http://10.0.10.25:8742",
        "http://172.16.4.8:8742",
        "http://127.0.0.1:8742",
        "http://localhost:8742",
        "http://titouan-gpu.lan:8742",
        "http://render-node.local:8742",
    )
    for url in allowed_urls:
        normalized = validate_remote_node_url(url, resolve_dns=False)
        assert normalized.startswith(("https://", "http://"))
        assert not normalized.endswith("/")

    blocked_urls = (
        "",
        "http://evil.example.com:8742",
        "http://8.8.8.8:8742",
        "http://169.254.169.254/latest/meta-data",
        "https://169.254.169.254/latest/meta-data",
        "http://metadata.google.internal",
        "http://0.0.0.0:8742",
        "https://0.0.0.0:8742",
        "file:///etc/passwd",
        "ftp://192.168.1.50:21",
        "https://user:pass@render.eldertek.io:8742",
        "https://render.eldertek.io:8742?token=leak",
        "http://192.168.1.50:8742\nHost: evil",
    )
    for bad in blocked_urls:
        with pytest.raises(SsrfGuardError):
            validate_remote_node_url(bad, resolve_dns=False)


def test_remote_node_requires_valid_bearer_token(
    remote_node_server: tuple[str, str, Path],
) -> None:
    node_url, token, _ = remote_node_server

    s_missing, h_missing, _ = _http_call(f"{node_url}/api/remote/health")
    assert s_missing == 401
    assert h_missing.get("www-authenticate") == "Bearer"

    s_wrong, _, _ = _http_call(
        f"{node_url}/api/remote/health",
        headers={"Authorization": "Bearer wrong-token"},
    )
    assert s_wrong == 401

    s_post_unauth, _, _ = _http_call(
        f"{node_url}/api/remote/jobs",
        method="POST",
        payload={},
    )
    assert s_post_unauth == 401

    s_ok, _, raw_ok = _http_call(
        f"{node_url}/api/remote/health",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert s_ok == 200
    health = json.loads(raw_ok.decode("utf-8"))
    assert health["status"] == "ok"
    assert health["mode"] == "remote_render_node"


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg binary not on PATH")
def test_remote_node_client_and_ui_proxy_render_roundtrip(
    remote_node_server: tuple[str, str, Path],
    studio_ui_server: tuple[str, Path],
    tmp_path: Path,
) -> None:
    node_url, token, _ = remote_node_server
    ui_url, studio_ws = studio_ui_server

    sample_in = studio_ws / ".taktcut-samples" / "sample_rec709.mp4"
    generate_synthetic_sample_clip(sample_in)

    # 1. Direct RemoteRenderClient submission + polling + download
    client = RemoteRenderClient(node_url, token)
    health = client.health()
    assert health["ffmpeg_available"] is True

    direct_req = RemoteRenderJobRequest(
        input_filename="sample_rec709.mp4",
        input_base64=base64.b64encode(sample_in.read_bytes()).decode("ascii"),
        output_filename="direct_remote.mp4",
        profile="web_h264",
        fps="25",
        prefer_hw=False,
    )
    direct_job = client.submit_job(direct_req)
    assert direct_job.status in {"queued", "running", "completed"}

    deadline = time.monotonic() + 30.0
    while direct_job.status in {"queued", "running"} and time.monotonic() < deadline:
        time.sleep(0.15)
        direct_job = client.get_job(direct_job.job_id)

    assert direct_job.status == "completed", direct_job.error
    assert direct_job.bytes_written > 0

    direct_out = tmp_path / "downloaded_direct.mp4"
    client.download_job_output(direct_job.job_id, direct_out)
    assert direct_out.is_file()
    assert direct_out.stat().st_size == direct_job.bytes_written

    # 2. Studio UI proxy probe + SSRF rejection + job submit & poll with keyframed FX
    bad_probe_status, _, _ = _http_call(
        f"{ui_url}/api/remote/probe",
        method="POST",
        payload={"remote_url": "http://169.254.169.254/latest", "bearer_token": token},
    )
    assert bad_probe_status == 400

    probe_status, _, probe_raw = _http_call(
        f"{ui_url}/api/remote/probe",
        method="POST",
        payload={"remote_url": node_url, "bearer_token": token},
    )
    assert probe_status == 200
    assert json.loads(probe_raw.decode("utf-8"))["health"]["status"] == "ok"

    trav_status, _, _ = _http_call(
        f"{ui_url}/api/remote/jobs",
        method="POST",
        payload={
            "remote_url": node_url,
            "bearer_token": token,
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "../../escape.mp4",
        },
    )
    assert trav_status == 403

    sub_status, _, sub_raw = _http_call(
        f"{ui_url}/api/remote/jobs",
        method="POST",
        payload={
            "remote_url": node_url,
            "bearer_token": token,
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/remote_fx_out.mp4",
            "profile": "web_h264",
            "fps": "25",
            "timecode_burnin": "bottom_right",
            "review_watermark_text": "CONFIDENTIAL",
            "review_watermark_opacity": 0.45,
            "lower_third": {
                "enabled": True,
                "title": "Claire Laurent",
                "subtitle": "Studio Paris",
                "position": "bottom_left",
                "font_size": 36,
                "box_opacity": 0.65,
                "start_s": 0.0,
                "duration_s": 4.0,
            },
            "export_fps": "30",
            "deinterlace": True,
            "prefer_hw": False,
            "cdl": {
                "slope": [1.05, 1.0, 0.95],
                "offset": [0.0, 0.0, 0.0],
                "power": [1.0, 1.0, 1.0],
                "saturation": 1.08,
            },
            "fx_stack": [
                {
                    "effect": "glow",
                    "enabled": True,
                    "params": {"brightness": 0.9, "width": 16.0},
                    "keyframes": [
                        {"time_s": 0.0, "value": 0.0, "easing": "ease_in_out"},
                        {"time_s": 0.4, "value": 1.0, "easing": "ease_in_out"},
                    ],
                }
            ],
        },
    )
    assert sub_status == 202
    sub_data = json.loads(sub_raw.decode("utf-8"))
    job_id = sub_data["job"]["job_id"]
    assert "titouan-super-secret" not in sub_raw.decode("utf-8")

    polled_data: dict[str, Any] = sub_data
    deadline = time.monotonic() + 30.0
    while polled_data["job"]["status"] in {"queued", "running"} and time.monotonic() < deadline:
        time.sleep(0.15)
        p_status, _, p_raw = _http_call(f"{ui_url}/api/remote/jobs/{job_id}")
        assert p_status == 200
        polled_data = json.loads(p_raw.decode("utf-8"))

    assert polled_data["job"]["status"] == "completed", polled_data["job"].get("error")
    assert polled_data["job"]["plan"]["export_fps"] == "30"
    assert polled_data["job"]["plan"]["deinterlace"] is True
    assert polled_data["job"]["plan"]["fps"] == {"num": 30, "den": 1}
    assert polled_data["job"]["plan"]["video_filter"].startswith(
        "yadif=mode=0:parity=-1:deint=0,fps=30,"
    )
    assert polled_data["job"]["plan"]["timecode_burnin"] == "bottom_right"
    assert "timecode='00\\:00\\:00\\:00':rate=30" in polled_data["job"]["plan"]["video_filter"]
    assert polled_data["job"]["plan"]["review_watermark_text"] == "CONFIDENTIAL"
    assert polled_data["job"]["plan"]["review_watermark_opacity"] == pytest.approx(0.45)
    assert (
        "text='CONFIDENTIAL':fontsize=42:fontcolor=white@0.45:x=(w-text_w)/2:y=(h-text_h)/2"
        in polled_data["job"]["plan"]["video_filter"]
    )
    assert polled_data["job"]["plan"]["lower_third_enabled"] is True
    assert polled_data["job"]["plan"]["lower_third_title"] == "Claire Laurent"
    assert "enable='between(t,0.00,4.00)'" in polled_data["job"]["plan"]["video_filter"]
    assert polled_data["downloaded"] is True
    assert polled_data["local_output_path"] == "renders/remote_fx_out.mp4"
    local_rendered = studio_ws / "renders" / "remote_fx_out.mp4"
    assert local_rendered.is_file()
    assert local_rendered.stat().st_size > 0

    # Audio-only master job via remote render node (MP3 320 + Fairlight EQ & Loudness)
    ao_status, _, ao_raw = _http_call(
        f"{ui_url}/api/remote/jobs",
        method="POST",
        payload={
            "remote_url": node_url,
            "bearer_token": token,
            "input_path": ".taktcut-samples/sample_rec709.mp4",
            "output_path": "renders/remote_audio_master.mp4",
            "profile": "web_h264",
            "fps": "25",
            "dialogue_eq": "derumble",
            "loudness_preset": "reels_16",
            "audio_only_format": "mp3_320",
            "prefer_hw": False,
        },
    )
    assert ao_status == 202
    ao_sub = json.loads(ao_raw.decode("utf-8"))
    ao_job_id = ao_sub["job"]["job_id"]
    ao_polled: dict[str, Any] = ao_sub
    ao_deadline = time.monotonic() + 30.0
    while ao_polled["job"]["status"] in {"queued", "running"} and time.monotonic() < ao_deadline:
        time.sleep(0.15)
        p_status, _, p_raw = _http_call(f"{ui_url}/api/remote/jobs/{ao_job_id}")
        assert p_status == 200
        ao_polled = json.loads(p_raw.decode("utf-8"))

    assert ao_polled["job"]["status"] == "completed", ao_polled["job"].get("error")
    assert ao_polled["job"]["plan"]["audio_only_format"] == "mp3_320"
    assert ao_polled["job"]["plan"]["encoder"] == "libmp3lame"
    assert ao_polled["job"]["plan"]["video_filter"] is None
    assert (
        ao_polled["job"]["plan"]["audio_filter"]
        == "highpass=f=100,loudnorm=I=-16.0:TP=-1.0:LRA=11"
    )
    assert "-vn" in ao_polled["job"]["plan"]["argv"]
    assert ao_polled["downloaded"] is True
    assert ao_polled["local_output_path"] == "renders/remote_audio_master.mp3"
    local_ao = studio_ws / "renders" / "remote_audio_master.mp3"
    assert local_ao.is_file()
    assert local_ao.stat().st_size > 0


def test_remote_node_cli_help() -> None:
    proc = subprocess.run(
        [sys.executable, "-m", "taktcut.cli", "render-node", "--help"],
        capture_output=True,
        text=True,
        timeout=10,
        check=False,
    )
    assert proc.returncode == 0
    assert "--token" in proc.stdout
    assert "--port" in proc.stdout
    assert "--workspace-dir" in proc.stdout


def test_remote_render_request_accepts_dynamic_zoom() -> None:
    from taktcut.remote_render import RemoteRenderJobRequest

    req = RemoteRenderJobRequest(
        input_base64="AAAA",
        transform_params={"dynamic_zoom": "slow_zoom_out"},  # type: ignore[arg-type]
    )
    assert req.transform_params is not None
    assert req.transform_params.dynamic_zoom == "slow_zoom_out"
    assert req.transform_params.is_identity() is False

    with pytest.raises((ValueError, Exception)):
        RemoteRenderJobRequest(
            input_base64="AAAA",
            transform_params={"dynamic_zoom": "invalid_dz"},  # type: ignore[arg-type]
        )


def test_remote_render_request_accepts_retime() -> None:
    from taktcut.remote_render import RemoteRenderJobRequest

    req = RemoteRenderJobRequest(
        input_base64="AAAA",
        retime={"enabled": True, "speed": 0.25, "reverse": True},  # type: ignore[arg-type]
    )
    assert req.retime is not None
    assert req.retime.enabled is True
    assert req.retime.speed == pytest.approx(0.25)
    assert req.retime.reverse is True

    with pytest.raises((ValueError, Exception)):
        RemoteRenderJobRequest(
            input_base64="AAAA",
            retime={"enabled": True, "speed": 6.0},  # type: ignore[arg-type]
        )
