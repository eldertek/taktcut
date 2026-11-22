"""Tests for taktcut OTA updater, PyInstaller desktop entry, and UI update endpoints."""

from __future__ import annotations

import hashlib
import json
import os
import sys
import threading
import urllib.error
import urllib.request
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest

from taktcut import __version__
from taktcut.desktop_entry import create_desktop_server
from taktcut.ui.server import create_ui_server, resolve_assets_dir
from taktcut.updater import (
    UpdateInfo,
    apply_ota_update,
    check_for_update,
    expected_asset_name,
    is_allowed_download_url,
    parse_semver,
    verify_sha256,
)


def _http_call(
    url: str,
    *,
    method: str = "GET",
    payload: Any = None,
) -> tuple[int, dict[str, str], bytes]:
    body: bytes | None = None
    headers: dict[str, str] = {}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
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


def test_parse_semver_valid_and_invalid() -> None:
    assert parse_semver("v0.1.0") == (0, 1, 0)
    assert parse_semver("V1.2.3") == (1, 2, 3)
    assert parse_semver("0.12.4") == (0, 12, 4)
    assert parse_semver("2.0.0-rc.1+build42") == (2, 0, 0)

    for bad in ("", "0.1", "v1.2.3.4", "latest", "1.a.0", "-1.0.0"):
        with pytest.raises(ValueError):
            parse_semver(bad)


def test_expected_asset_name_per_os() -> None:
    assert expected_asset_name("win32") == "TaktCut-Windows.exe"
    assert expected_asset_name("darwin") == "TaktCut-macOS.zip"
    assert expected_asset_name("linux") == "TaktCut-Linux"


def test_check_for_update_available_and_sha256_lookup(monkeypatch: pytest.MonkeyPatch) -> None:
    want_asset = expected_asset_name()
    fake_sha = "a" * 64
    release_payload = {
        "tag_name": "v0.2.0",
        "html_url": "https://github.com/eldertek/taktcut/releases/tag/v0.2.0",
        "assets": [
            {
                "name": want_asset,
                "browser_download_url": (
                    f"https://github.com/eldertek/taktcut/releases/download/v0.2.0/{want_asset}"
                ),
            },
            {
                "name": "SHA256SUMS.txt",
                "browser_download_url": (
                    "https://github.com/eldertek/taktcut/releases/download/v0.2.0/SHA256SUMS.txt"
                ),
            },
        ],
    }

    def fake_fetch(url: str, **_: Any) -> bytes:
        if url.endswith("/releases/latest"):
            return json.dumps(release_payload).encode("utf-8")
        if url.endswith("SHA256SUMS.txt"):
            return f"{fake_sha}  {want_asset}\n".encode()
        raise AssertionError(f"Unexpected URL: {url}")

    monkeypatch.setattr("taktcut.updater._fetch_bytes", fake_fetch)
    info = check_for_update("0.1.0")
    assert info.update_available is True
    assert info.latest_version == "0.2.0"
    assert info.asset_name == want_asset
    assert info.sha256 == fake_sha
    assert info.error is None


def test_check_for_update_up_to_date(monkeypatch: pytest.MonkeyPatch) -> None:
    release_payload = {
        "tag_name": "v0.1.0",
        "html_url": "https://github.com/eldertek/taktcut/releases/tag/v0.1.0",
        "assets": [],
    }
    monkeypatch.setattr(
        "taktcut.updater._fetch_bytes",
        lambda *args, **kwargs: json.dumps(release_payload).encode("utf-8"),
    )
    info = check_for_update("0.1.0")
    assert info.update_available is False
    assert info.latest_version == "0.1.0"
    assert info.error is None


def test_check_for_update_offline_failsafe(monkeypatch: pytest.MonkeyPatch) -> None:
    def raise_offline(*args: Any, **kwargs: Any) -> bytes:
        raise urllib.error.URLError("network unreachable")

    monkeypatch.setattr("taktcut.updater._fetch_bytes", raise_offline)
    info = check_for_update("0.1.0")
    assert info.update_available is False
    assert info.current_version == "0.1.0"
    assert info.latest_version == "0.1.0"
    assert info.error is not None
    assert "Offline" in info.error


def test_verify_sha256_ok_and_ko(tmp_path: Path) -> None:
    target = tmp_path / "payload.bin"
    content = b"taktcut-ota-test-binary"
    target.write_bytes(content)
    expected = hashlib.sha256(content).hexdigest()

    assert verify_sha256(target, expected) is True
    assert verify_sha256(target, expected.upper()) is True
    assert verify_sha256(target, "0" * 64) is False
    assert verify_sha256(target, "not-a-hex-digest") is False
    assert verify_sha256(tmp_path / "missing.bin", expected) is False


def test_allowed_download_url_guard() -> None:
    assert is_allowed_download_url(
        "https://github.com/eldertek/taktcut/releases/download/v0.1.0/TaktCut-Windows.exe"
    )
    assert is_allowed_download_url(
        "https://objects.githubusercontent.com/github-production-release-asset/12345"
    )
    assert not is_allowed_download_url(
        "http://github.com/eldertek/taktcut/releases/download/v0.1.0/TaktCut-Linux"
    )
    assert not is_allowed_download_url("https://evil.example.com/TaktCut-Windows.exe")
    assert not is_allowed_download_url("https://github.com/other/repo/releases/TaktCut-Linux")
    assert not is_allowed_download_url("https://user:pass@github.com/eldertek/taktcut/a")
    assert not is_allowed_download_url("file:///tmp/TaktCut-Linux")


def test_apply_ota_update_non_frozen_and_guards(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(sys, "frozen", False, raising=False)
    res_not_frozen = apply_ota_update("0.1.0")
    assert res_not_frozen.applied is False
    assert res_not_frozen.error == "not_frozen"

    monkeypatch.setattr(sys, "frozen", True, raising=False)
    bad_info = UpdateInfo(
        current_version="0.1.0",
        latest_version="0.2.0",
        update_available=True,
        asset_name="TaktCut-Linux",
        asset_url="https://evil.example.com/TaktCut-Linux",
        is_frozen=True,
        can_apply_ota=False,
    )
    res_bad_url = apply_ota_update("0.1.0", update_info=bad_info, executable_path=tmp_path / "app")
    assert res_bad_url.applied is False
    assert res_bad_url.error == "invalid_asset_url"

    payload_bytes = b"new-release-binary"
    wrong_sha = "f" * 64
    good_info = UpdateInfo(
        current_version="0.1.0",
        latest_version="0.2.0",
        update_available=True,
        asset_name="TaktCut-Linux",
        asset_url="https://objects.githubusercontent.com/release/TaktCut-Linux",
        sha256=wrong_sha,
        is_frozen=True,
        can_apply_ota=True,
    )

    def fake_download(url: str, dest: Path, *, repo: str, timeout: float) -> None:
        dest.write_bytes(payload_bytes)

    monkeypatch.setattr("taktcut.updater._download_to_file", fake_download)
    res_bad_sha = apply_ota_update(
        "0.1.0",
        update_info=good_info,
        executable_path=tmp_path / "TaktCut-Linux",
        restart=False,
    )
    assert res_bad_sha.applied is False
    assert res_bad_sha.error == "checksum_mismatch"


def test_apply_ota_update_posix_and_windows_staging(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    payload_bytes = b"new-taktcut-binary-v0.2.0"
    payload_sha = hashlib.sha256(payload_bytes).hexdigest()
    monkeypatch.setattr(sys, "frozen", True, raising=False)

    def fake_download(url: str, dest: Path, *, repo: str, timeout: float) -> None:
        dest.write_bytes(payload_bytes)

    monkeypatch.setattr("taktcut.updater._download_to_file", fake_download)

    # POSIX atomic os.replace + os.execv
    monkeypatch.setattr(sys, "platform", "linux")
    posix_exe = tmp_path / "TaktCut-Linux"
    posix_exe.write_bytes(b"old-binary")
    exec_calls: list[tuple[str, list[str]]] = []
    monkeypatch.setattr(
        os,
        "execv",
        lambda path, argv: exec_calls.append((path, list(argv))),
    )
    posix_info = UpdateInfo(
        current_version="0.1.0",
        latest_version="0.2.0",
        update_available=True,
        asset_name="TaktCut-Linux",
        asset_url="https://github.com/eldertek/taktcut/releases/download/v0.2.0/TaktCut-Linux",
        sha256=payload_sha,
        is_frozen=True,
        can_apply_ota=True,
    )
    res_posix = apply_ota_update(
        "0.1.0",
        update_info=posix_info,
        executable_path=posix_exe,
        argv=["--no-open"],
        restart=True,
    )
    assert res_posix.applied is True
    assert posix_exe.read_bytes() == payload_bytes
    assert exec_calls == [(str(posix_exe.resolve()), [str(posix_exe.resolve()), "--no-open"])]

    # Windows .bat staging
    monkeypatch.setattr(sys, "platform", "win32")
    win_exe = tmp_path / "TaktCut-Windows.exe"
    win_exe.write_bytes(b"old-win-exe")
    win_info = UpdateInfo(
        current_version="0.1.0",
        latest_version="0.2.0",
        update_available=True,
        asset_name="TaktCut-Windows.exe",
        asset_url="https://github.com/eldertek/taktcut/releases/download/v0.2.0/TaktCut-Windows.exe",
        sha256=payload_sha,
        is_frozen=True,
        can_apply_ota=True,
    )
    res_win = apply_ota_update(
        "0.1.0",
        update_info=win_info,
        executable_path=win_exe,
        restart=True,
        defer_restart=True,
        pid=999999,
    )
    assert res_win.applied is True
    assert res_win.restarting is True
    assert res_win.staged_path is not None
    assert Path(res_win.staged_path).read_bytes() == payload_bytes
    assert res_win.helper_script is not None
    bat_text = Path(res_win.helper_script).read_text(encoding="utf-8")
    assert "999999" in bat_text
    assert "move /Y" in bat_text
    assert str(win_exe.resolve()) in bat_text
    Path(res_win.staged_path).unlink(missing_ok=True)
    Path(res_win.helper_script).unlink(missing_ok=True)


def test_meipass_assets_resolution_and_desktop_port_fallback(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_meipass = tmp_path / "meipass"
    bundled_assets = fake_meipass / "taktcut" / "ui" / "assets"
    bundled_assets.mkdir(parents=True)
    (bundled_assets / "index.html").write_text("<html>ok</html>", encoding="utf-8")

    monkeypatch.setattr(sys, "_MEIPASS", str(fake_meipass), raising=False)
    assert resolve_assets_dir() == bundled_assets

    busy = create_ui_server(host="127.0.0.1", port=0, workspace_dir=tmp_path)
    try:
        busy_port = busy.server_address[1]
        fallback = create_desktop_server(
            host="127.0.0.1",
            preferred_port=busy_port,
            workspace_dir=tmp_path,
        )
        try:
            assert fallback.server_address[1] != busy_port
            assert fallback.server_address[1] > 0
        finally:
            fallback.server_close()
    finally:
        busy.server_close()


def test_ui_update_endpoints(
    ui_server: tuple[str, Path],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    base_url, _ = ui_server
    expected_info = UpdateInfo(
        current_version=__version__,
        latest_version="0.2.0",
        update_available=True,
        asset_name="TaktCut-Windows.exe",
        asset_url="https://github.com/eldertek/taktcut/releases/download/v0.2.0/TaktCut-Windows.exe",
        sha256="b" * 64,
        release_url="https://github.com/eldertek/taktcut/releases/tag/v0.2.0",
        is_frozen=False,
        can_apply_ota=False,
        error=None,
    )
    monkeypatch.setattr("taktcut.ui.server.check_for_update", lambda *args, **kwargs: expected_info)

    status, headers, raw = _http_call(f"{base_url}/api/update/check")
    assert status == 200
    assert headers["cache-control"] == "no-store"
    data = json.loads(raw.decode("utf-8"))
    assert data["update_available"] is True
    assert data["latest_version"] == "0.2.0"

    apply_status, _, apply_raw = _http_call(
        f"{base_url}/api/update/apply",
        method="POST",
        payload={},
    )
    assert apply_status == 200
    apply_data = json.loads(apply_raw.decode("utf-8"))
    assert apply_data["applied"] is False
    assert apply_data["error"] == "not_frozen"
