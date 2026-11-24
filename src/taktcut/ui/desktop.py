"""Cross-platform frameless desktop application launcher for taktcut Studio."""

from __future__ import annotations

import importlib.util
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import webbrowser
from collections.abc import Callable
from pathlib import Path


def find_desktop_browser_binary() -> Path | None:
    """Locate an installed Chromium-based browser supporting --app window mode."""
    candidates: list[str] = []
    if sys.platform.startswith("win"):
        pf86 = os.environ.get("PROGRAMFILES(X86)", r"C:\Program Files (x86)")
        pf = os.environ.get("PROGRAMFILES", r"C:\Program Files")
        local_app = os.environ.get("LOCALAPPDATA", "")
        candidates.extend(
            [
                str(Path(pf86) / "Microsoft" / "Edge" / "Application" / "msedge.exe"),
                str(Path(pf) / "Microsoft" / "Edge" / "Application" / "msedge.exe"),
                str(Path(pf) / "Google" / "Chrome" / "Application" / "chrome.exe"),
                str(Path(pf86) / "Google" / "Chrome" / "Application" / "chrome.exe"),
            ]
        )
        if local_app:
            candidates.append(
                str(Path(local_app) / "Google" / "Chrome" / "Application" / "chrome.exe")
            )
        for exe in ("msedge", "chrome", "chromium"):
            found = shutil.which(exe)
            if found:
                candidates.append(found)
    elif sys.platform == "darwin":
        candidates.extend(
            [
                "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
                "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                "/Applications/Chromium.app/Contents/MacOS/Chromium",
                "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
            ]
        )
    else:
        linux_bins = (
            "microsoft-edge",
            "google-chrome",
            "chromium",
            "chromium-browser",
            "brave-browser",
        )
        for exe in linux_bins:
            found = shutil.which(exe)
            if found:
                candidates.append(found)

    for raw in candidates:
        path = Path(raw)
        if path.is_file():
            return path
    return None


def build_desktop_app_command(browser_bin: Path, url: str, profile_dir: Path) -> list[str]:
    """Build deterministic Chromium/Edge --app command arguments."""
    return [
        str(browser_bin),
        f"--app={url}",
        "--window-size=1440,900",
        f"--user-data-dir={profile_dir}",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-translate",
        "--disable-features=Translate,TranslateUI,msTranslate,EdgeTranslate",
    ]


def has_pywebview() -> bool:
    """Check whether optional pywebview native window backend is installed."""
    return importlib.util.find_spec("webview") is not None


def run_with_pywebview(
    url: str,
    start_server: Callable[[], None],
    stop_server: Callable[[], None],
) -> int:
    """Launch a native desktop window via pywebview if available."""
    import webview  # type: ignore[import-not-found]

    srv_thread = threading.Thread(target=start_server, daemon=True)
    srv_thread.start()
    try:
        webview.create_window("taktcut Studio", url, width=1440, height=900, min_size=(390, 640))
        webview.start()
    finally:
        stop_server()
        srv_thread.join(timeout=3)
    return 0


def launch_desktop_browser_window(url: str) -> bool:
    """Spawn a frameless Chromium/Edge --app window; returns True if spawned."""
    browser = find_desktop_browser_binary()
    if browser is None:
        return False
    profile_dir = Path(tempfile.gettempdir()) / "taktcut-studio-app-profile"
    profile_dir.mkdir(parents=True, exist_ok=True)
    cmd = build_desktop_app_command(browser, url, profile_dir)
    subprocess.Popen(
        cmd,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    return True


def open_studio_window(url: str, *, desktop: bool = False) -> None:
    """Open taktcut Studio in frameless desktop app mode or default browser."""
    if desktop and launch_desktop_browser_window(url):
        return
    if desktop:
        print("Desktop --app browser not found; falling back to default web browser.", flush=True)
    webbrowser.open(url)
