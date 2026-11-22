"""Stdlib-only OTA release checker, SHA-256 verifier, and binary self-updater."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
import zipfile
from collections.abc import Sequence
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

DEFAULT_REPO = "eldertek/taktcut"
GITHUB_API_BASE = "https://api.github.com"
ALLOWED_OBJECT_PREFIX = "https://objects.githubusercontent.com/"
_SEMVER_RE = re.compile(r"^[vV]?(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$")
_REPO_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
_HEX64_RE = re.compile(r"^[0-9a-fA-F]{64}$")
_CHUNK_SIZE = 65536
_MAX_ZIP_EXTRACT_BYTES = 256 * 1024 * 1024


@dataclass(frozen=True)
class UpdateInfo:
    """Result of checking GitHub Releases for a newer taktcut version."""

    current_version: str
    latest_version: str
    update_available: bool
    asset_name: str | None = None
    asset_url: str | None = None
    sha256: str | None = None
    release_url: str | None = None
    is_frozen: bool = False
    can_apply_ota: bool = False
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Serialize update metadata to a JSON-compatible dictionary."""
        return asdict(self)


@dataclass(frozen=True)
class UpdateApplyResult:
    """Result of attempting an in-place OTA binary update."""

    applied: bool
    restarting: bool
    message: str
    target_version: str | None = None
    staged_path: str | None = None
    helper_script: str | None = None
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Serialize apply result to a JSON-compatible dictionary."""
        return asdict(self)


def parse_semver(tag: str) -> tuple[int, int, int]:
    """Parse a semantic version tag like 'v0.1.0' or '1.2.3' into (major, minor, patch)."""
    if not isinstance(tag, str):
        raise ValueError("Version tag must be a string")
    match = _SEMVER_RE.fullmatch(tag.strip())
    if match is None:
        raise ValueError(f"Invalid semantic version tag: {tag!r}")
    return (int(match.group(1)), int(match.group(2)), int(match.group(3)))


def expected_asset_name(platform_name: str | None = None) -> str:
    """Return the release asset filename expected for the given or current OS."""
    plat = (platform_name if platform_name is not None else sys.platform).lower()
    if plat.startswith("win"):
        return "TaktCut-Windows.exe"
    if plat == "darwin":
        return "TaktCut-macOS.zip"
    return "TaktCut-Linux"


def is_frozen_binary() -> bool:
    """Return True when executing inside a frozen PyInstaller bundle."""
    return bool(getattr(sys, "frozen", False))


def _validate_repo(repo: str) -> str:
    cleaned = repo.strip()
    if _REPO_RE.fullmatch(cleaned) is None:
        raise ValueError(f"Invalid GitHub repository slug: {repo!r}")
    return cleaned


def is_allowed_download_url(url: str, repo: str = DEFAULT_REPO) -> bool:
    """Verify that an OTA download URL is strictly HTTPS on GitHub release hosts."""
    if not isinstance(url, str):
        return False
    cleaned = url.strip()
    if not cleaned or any(ch.isspace() for ch in cleaned):
        return False
    parsed = urlparse(cleaned)
    if parsed.scheme != "https" or parsed.username or parsed.password:
        return False
    clean_repo = _validate_repo(repo)
    repo_prefix = f"https://github.com/{clean_repo}/"
    return cleaned.startswith(repo_prefix) or cleaned.startswith(ALLOWED_OBJECT_PREFIX)


class _StrictGitHubRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Ensure every HTTP redirect stays on the allowlisted GitHub HTTPS prefixes."""

    def __init__(self, repo: str) -> None:
        super().__init__()
        self._repo = repo

    def redirect_request(
        self,
        req: urllib.request.Request,
        fp: Any,
        code: int,
        msg: str,
        headers: Any,
        newurl: str,
    ) -> urllib.request.Request | None:
        if not is_allowed_download_url(newurl, repo=self._repo):
            raise ValueError(f"Blocked redirect to untrusted OTA URL: {newurl!r}")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _fetch_bytes(
    url: str,
    *,
    timeout: float,
    headers: dict[str, str] | None = None,
    repo: str | None = None,
    enforce_download_allowlist: bool = False,
) -> bytes:
    if enforce_download_allowlist and (repo is None or not is_allowed_download_url(url, repo=repo)):
        raise ValueError(f"Blocked untrusted OTA download URL: {url!r}")
    req = urllib.request.Request(url, headers=headers or {}, method="GET")
    if enforce_download_allowlist and repo is not None:
        opener = urllib.request.build_opener(_StrictGitHubRedirectHandler(repo))
        with opener.open(req, timeout=timeout) as resp:
            return bytes(resp.read())
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return bytes(resp.read())


def _download_to_file(url: str, dest_path: Path, *, repo: str, timeout: float) -> None:
    if not is_allowed_download_url(url, repo=repo):
        raise ValueError(f"Blocked untrusted OTA download URL: {url!r}")
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "taktcut-ota-updater"},
        method="GET",
    )
    opener = urllib.request.build_opener(_StrictGitHubRedirectHandler(repo))
    with opener.open(req, timeout=timeout) as resp, dest_path.open("wb") as handle:
        while True:
            chunk = resp.read(_CHUNK_SIZE)
            if not chunk:
                break
            handle.write(chunk)


def _parse_sha256sums(raw_text: str, asset_name: str) -> str | None:
    for line in raw_text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        parts = stripped.split()
        if len(parts) < 2:
            continue
        digest = parts[0].strip()
        filename = parts[-1].lstrip("*").strip()
        if Path(filename).name == asset_name and _HEX64_RE.fullmatch(digest):
            return digest.lower()
    return None


def _extract_asset_sha256(
    assets: list[dict[str, Any]],
    target_asset: dict[str, Any],
    asset_name: str,
    *,
    repo: str,
    timeout: float,
) -> str | None:
    raw_digest = target_asset.get("digest")
    if isinstance(raw_digest, str) and raw_digest.lower().startswith("sha256:"):
        candidate = raw_digest.split(":", 1)[1].strip()
        if _HEX64_RE.fullmatch(candidate):
            return candidate.lower()

    for asset in assets:
        if asset.get("name") == "SHA256SUMS.txt":
            sums_url = asset.get("browser_download_url")
            if isinstance(sums_url, str) and is_allowed_download_url(sums_url, repo=repo):
                try:
                    raw = _fetch_bytes(
                        sums_url,
                        timeout=timeout,
                        headers={"User-Agent": "taktcut-ota-updater"},
                        repo=repo,
                        enforce_download_allowlist=True,
                    )
                    return _parse_sha256sums(raw.decode("utf-8", errors="replace"), asset_name)
                except (urllib.error.URLError, TimeoutError, OSError, ValueError):
                    return None
    return None


def verify_sha256(file_path: Path, expected_hex: str) -> bool:
    """Verify the SHA-256 digest of file_path against expected_hex in constant time."""
    if not isinstance(expected_hex, str):
        return False
    cleaned = expected_hex.strip().lower()
    if _HEX64_RE.fullmatch(cleaned) is None:
        return False
    if not file_path.is_file():
        return False

    digest = hashlib.sha256()
    with file_path.open("rb") as handle:
        while True:
            chunk = handle.read(_CHUNK_SIZE)
            if not chunk:
                break
            digest.update(chunk)
    return hmac.compare_digest(digest.hexdigest().lower(), cleaned)


def check_for_update(
    current_version: str,
    repo: str = DEFAULT_REPO,
    timeout: float = 4.0,
) -> UpdateInfo:
    """Query GitHub latest release fail-safely and return UpdateInfo for the current OS."""
    frozen = is_frozen_binary()
    try:
        clean_repo = _validate_repo(repo)
        current_tuple = parse_semver(current_version)
    except ValueError as exc:
        return UpdateInfo(
            current_version=current_version,
            latest_version=current_version,
            update_available=False,
            is_frozen=frozen,
            can_apply_ota=False,
            error=str(exc),
        )

    api_url = f"{GITHUB_API_BASE}/repos/{clean_repo}/releases/latest"
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": f"taktcut/{current_version}",
    }
    try:
        raw_bytes = _fetch_bytes(api_url, timeout=timeout, headers=headers)
        payload = json.loads(raw_bytes.decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError) as exc:
        return UpdateInfo(
            current_version=current_version,
            latest_version=current_version,
            update_available=False,
            is_frozen=frozen,
            can_apply_ota=False,
            error=f"Offline or release check failed: {exc}",
        )
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        return UpdateInfo(
            current_version=current_version,
            latest_version=current_version,
            update_available=False,
            is_frozen=frozen,
            can_apply_ota=False,
            error=f"Invalid GitHub release payload: {exc}",
        )

    if not isinstance(payload, dict):
        return UpdateInfo(
            current_version=current_version,
            latest_version=current_version,
            update_available=False,
            is_frozen=frozen,
            can_apply_ota=False,
            error="Unexpected GitHub release response format",
        )

    raw_tag = payload.get("tag_name")
    if not isinstance(raw_tag, str):
        return UpdateInfo(
            current_version=current_version,
            latest_version=current_version,
            update_available=False,
            is_frozen=frozen,
            can_apply_ota=False,
            error="Release metadata missing tag_name",
        )

    try:
        latest_tuple = parse_semver(raw_tag)
    except ValueError as exc:
        return UpdateInfo(
            current_version=current_version,
            latest_version=current_version,
            update_available=False,
            is_frozen=frozen,
            can_apply_ota=False,
            error=str(exc),
        )

    latest_clean = f"{latest_tuple[0]}.{latest_tuple[1]}.{latest_tuple[2]}"
    update_available = latest_tuple > current_tuple
    release_url = payload.get("html_url")
    safe_release_url = release_url if isinstance(release_url, str) else None

    want_asset = expected_asset_name()
    raw_assets = payload.get("assets")
    assets: list[dict[str, Any]] = (
        [item for item in raw_assets if isinstance(item, dict)]
        if isinstance(raw_assets, list)
        else []
    )
    matched_asset = next((a for a in assets if a.get("name") == want_asset), None)
    asset_url: str | None = None
    sha256_hex: str | None = None

    if matched_asset is not None:
        raw_url = matched_asset.get("browser_download_url")
        if isinstance(raw_url, str) and is_allowed_download_url(raw_url, repo=clean_repo):
            asset_url = raw_url
        sha256_hex = _extract_asset_sha256(
            assets,
            matched_asset,
            want_asset,
            repo=clean_repo,
            timeout=timeout,
        )

    return UpdateInfo(
        current_version=current_version,
        latest_version=latest_clean,
        update_available=update_available,
        asset_name=want_asset if matched_asset is not None else None,
        asset_url=asset_url,
        sha256=sha256_hex,
        release_url=safe_release_url,
        is_frozen=frozen,
        can_apply_ota=update_available and frozen and asset_url is not None,
        error=None,
    )


def _extract_macos_binary_from_zip(zip_path: Path, dest_binary: Path) -> None:
    with zipfile.ZipFile(zip_path, "r") as zf:
        candidates = [
            info
            for info in zf.infolist()
            if not info.is_dir() and Path(info.filename).name in {"TaktCut", "taktcut"}
        ]
        if not candidates:
            non_dirs = [info for info in zf.infolist() if not info.is_dir()]
            if len(non_dirs) != 1:
                raise RuntimeError("macOS release archive does not contain TaktCut binary")
            candidates = non_dirs

        member = candidates[0]
        if member.file_size > _MAX_ZIP_EXTRACT_BYTES:
            raise RuntimeError("macOS release binary exceeds maximum allowed size")
        resolved_member = Path(member.filename)
        if resolved_member.is_absolute() or ".." in resolved_member.parts:
            raise ValueError(f"Unsafe zip member path: {member.filename!r}")

        with zf.open(member, "r") as src, dest_binary.open("wb") as dst:
            shutil.copyfileobj(src, dst, length=_CHUNK_SIZE)


def _make_executable(path: Path) -> None:
    if sys.platform.startswith("win"):
        return
    mode = path.stat().st_mode
    path.chmod(mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)


def _write_windows_swap_script(
    *,
    staged_exe: Path,
    target_exe: Path,
    pid: int,
    relaunch_args: Sequence[str],
) -> Path:
    fd, raw_script = tempfile.mkstemp(prefix="taktcut_ota_", suffix=".bat")
    os.close(fd)
    script_path = Path(raw_script)

    def _bat_quote(value: str) -> str:
        sanitized = value.replace('"', "")
        return f'"{sanitized}"'

    args_str = " ".join(_bat_quote(arg) for arg in relaunch_args)
    launch_line = f'start "" {_bat_quote(str(target_exe))}'
    if args_str:
        launch_line = f"{launch_line} {args_str}"

    lines = [
        "@echo off",
        "setlocal",
        f"set TARGET_PID={pid}",
        ":wait_loop",
        'tasklist /FI "PID eq %TARGET_PID%" 2>NUL | find /I "%TARGET_PID%" >NUL',
        "if not errorlevel 1 (",
        "  ping -n 2 127.0.0.1 >NUL",
        "  goto wait_loop",
        ")",
        f"move /Y {_bat_quote(str(staged_exe))} {_bat_quote(str(target_exe))} >NUL",
        "if errorlevel 1 (",
        "  ping -n 2 127.0.0.1 >NUL",
        f"  move /Y {_bat_quote(str(staged_exe))} {_bat_quote(str(target_exe))} >NUL",
        ")",
        launch_line,
        'del "%~f0"',
    ]
    script_path.write_text("\r\n".join(lines) + "\r\n", encoding="utf-8")
    return script_path


def launch_windows_swap_script(script_path: Path) -> None:
    """Spawn the detached Windows .bat self-replacement helper."""
    creation_flags = getattr(subprocess, "CREATE_NO_WINDOW", 0) | getattr(
        subprocess, "DETACHED_PROCESS", 0
    )
    subprocess.Popen(
        ["cmd.exe", "/c", str(script_path)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        stdin=subprocess.DEVNULL,
        creationflags=creation_flags,
        close_fds=True,
    )


def apply_ota_update(
    current_version: str,
    *,
    repo: str = DEFAULT_REPO,
    timeout: float = 30.0,
    check_timeout: float = 4.0,
    expected_sha256: str | None = None,
    update_info: UpdateInfo | None = None,
    restart: bool = True,
    defer_restart: bool = False,
    argv: Sequence[str] | None = None,
    executable_path: Path | None = None,
    pid: int | None = None,
) -> UpdateApplyResult:
    """Download, verify, and atomically apply an OTA binary update for frozen builds."""
    if not is_frozen_binary():
        return UpdateApplyResult(
            applied=False,
            restarting=False,
            message="OTA updates require a packaged binary release; upgrade via pip or git.",
            error="not_frozen",
        )

    info = (
        update_info
        if update_info is not None
        else check_for_update(current_version, repo=repo, timeout=check_timeout)
    )
    if info.error:
        return UpdateApplyResult(
            applied=False,
            restarting=False,
            message=info.error,
            error="check_failed",
        )
    if not info.update_available:
        return UpdateApplyResult(
            applied=False,
            restarting=False,
            message=f"Already running latest version v{info.current_version}.",
            target_version=info.latest_version,
            error="up_to_date",
        )
    if not info.asset_url or not is_allowed_download_url(info.asset_url, repo=repo):
        return UpdateApplyResult(
            applied=False,
            restarting=False,
            message="No trusted GitHub release asset URL found for this platform.",
            target_version=info.latest_version,
            error="invalid_asset_url",
        )

    target_exe = (executable_path or Path(sys.executable)).resolve()
    target_dir = target_exe.parent
    relaunch_args = list(argv) if argv is not None else list(sys.argv[1:])
    sha_to_verify = expected_sha256 or info.sha256

    with tempfile.TemporaryDirectory(prefix="taktcut_ota_dl_") as tmp_dir_raw:
        tmp_dir = Path(tmp_dir_raw)
        download_name = info.asset_name or Path(urlparse(info.asset_url).path).name or "update.bin"
        downloaded_path = tmp_dir / download_name
        try:
            _download_to_file(info.asset_url, downloaded_path, repo=repo, timeout=timeout)
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
            return UpdateApplyResult(
                applied=False,
                restarting=False,
                message=f"Failed to download release asset: {exc}",
                target_version=info.latest_version,
                error="download_failed",
            )

        if sha_to_verify is not None and not verify_sha256(downloaded_path, sha_to_verify):
            return UpdateApplyResult(
                applied=False,
                restarting=False,
                message="SHA-256 verification failed for downloaded release asset.",
                target_version=info.latest_version,
                error="checksum_mismatch",
            )

        fd, staged_raw = tempfile.mkstemp(
            prefix=".taktcut_staged_",
            suffix=target_exe.suffix,
            dir=str(target_dir),
        )
        os.close(fd)
        staged_path = Path(staged_raw)

        try:
            if downloaded_path.suffix.lower() == ".zip":
                _extract_macos_binary_from_zip(downloaded_path, staged_path)
            else:
                shutil.copyfile(downloaded_path, staged_path)
            _make_executable(staged_path)
        except Exception as exc:  # noqa: BLE001
            staged_path.unlink(missing_ok=True)
            return UpdateApplyResult(
                applied=False,
                restarting=False,
                message=f"Failed to prepare update binary: {exc}",
                target_version=info.latest_version,
                error="stage_failed",
            )

    if sys.platform.startswith("win"):
        script_path = _write_windows_swap_script(
            staged_exe=staged_path,
            target_exe=target_exe,
            pid=pid if pid is not None else os.getpid(),
            relaunch_args=relaunch_args,
        )
        if restart and not defer_restart:
            launch_windows_swap_script(script_path)
        return UpdateApplyResult(
            applied=True,
            restarting=restart,
            message=f"Update v{info.latest_version} staged; restarting application.",
            target_version=info.latest_version,
            staged_path=str(staged_path),
            helper_script=str(script_path),
        )

    os.replace(staged_path, target_exe)
    if restart and not defer_restart:
        os.execv(str(target_exe), [str(target_exe), *relaunch_args])
    return UpdateApplyResult(
        applied=True,
        restarting=restart,
        message=f"Update v{info.latest_version} installed; restarting application.",
        target_version=info.latest_version,
        staged_path=str(target_exe),
    )
