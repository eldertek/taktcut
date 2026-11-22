"""One-click PyInstaller desktop entry point for taktcut Studio."""

from __future__ import annotations

import argparse
import multiprocessing
import os
import socket
import sys
import threading
import webbrowser
from pathlib import Path

from taktcut.ui.security import validate_loopback_host
from taktcut.ui.server import TaktcutUiServer, create_ui_server, resolve_assets_dir

DEFAULT_DESKTOP_PORT = 8103


def _is_port_busy(host: str, port: int) -> bool:
    if port <= 0:
        return False
    family = socket.AF_INET6 if ":" in host else socket.AF_INET
    with socket.socket(family, socket.SOCK_STREAM) as probe:
        if sys.platform.startswith("win") and hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            probe.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        try:
            probe.bind((host, port))
        except OSError:
            return True
    return False


def resolve_desktop_workspace(workspace_dir: Path | None = None) -> Path:
    """Choose a safe writable workspace directory when launched from a 1-click binary."""
    if workspace_dir is not None:
        return workspace_dir
    cwd = Path.cwd()
    if getattr(sys, "frozen", False):
        win_dir = os.environ.get("WINDIR", r"C:\Windows").lower()
        if str(cwd).lower().startswith(win_dir) or not os.access(cwd, os.W_OK):
            return Path.home()
    return cwd


def create_desktop_server(
    *,
    host: str = "127.0.0.1",
    preferred_port: int = DEFAULT_DESKTOP_PORT,
    workspace_dir: Path | None = None,
) -> TaktcutUiServer:
    """Bind the UI server to preferred_port (8103) or fall back to an ephemeral free port."""
    safe_host = validate_loopback_host(host)
    resolved_ws = resolve_desktop_workspace(workspace_dir)
    if _is_port_busy(safe_host, preferred_port):
        return create_ui_server(host=safe_host, port=0, workspace_dir=resolved_ws)
    try:
        return create_ui_server(host=safe_host, port=preferred_port, workspace_dir=resolved_ws)
    except OSError:
        if preferred_port == 0:
            raise
        return create_ui_server(host=safe_host, port=0, workspace_dir=resolved_ws)


def build_desktop_arg_parser(prog: str = "TaktCut") -> argparse.ArgumentParser:
    """Build CLI options for the 1-click desktop launcher."""
    parser = argparse.ArgumentParser(
        prog=prog,
        description="Launch taktcut Studio locally and open it in the default browser.",
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Loopback interface to bind (default: 127.0.0.1)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_DESKTOP_PORT,
        help=(
            "Preferred TCP port (falls back to a free port if busy, "
            f"default: {DEFAULT_DESKTOP_PORT})"
        ),
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Do not automatically open the browser",
    )
    parser.add_argument(
        "--workspace-dir",
        type=Path,
        default=None,
        help="Confined workspace root (default: current directory or user home if frozen)",
    )
    return parser


def launch_desktop_studio(
    *,
    host: str = "127.0.0.1",
    preferred_port: int = DEFAULT_DESKTOP_PORT,
    workspace_dir: Path | None = None,
    open_browser: bool = True,
) -> int:
    """Start the local studio server on 127.0.0.1 and open the browser."""
    assets_dir = resolve_assets_dir()
    if not assets_dir.is_dir():
        raise FileNotFoundError(f"taktcut UI assets directory not found: {assets_dir}")

    server = create_desktop_server(
        host=host,
        preferred_port=preferred_port,
        workspace_dir=workspace_dir,
    )
    raw_host, bound_port = server.server_address[0], server.server_address[1]
    bound_host = raw_host.decode("ascii") if isinstance(raw_host, bytes) else str(raw_host)
    url_host = f"[{bound_host}]" if ":" in bound_host else bound_host
    url = f"http://{url_host}:{bound_port}/"

    if sys.stdout is not None:
        print(f"taktcut studio running at {url}", flush=True)
        print(f"Workspace directory (confined): {server.app_state.workspace_root}", flush=True)
        print("Press Ctrl+C to stop.", flush=True)

    if open_browser:
        threading.Timer(0.25, webbrowser.open, args=(url,)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        if sys.stdout is not None:
            print("\nShutting down taktcut studio.", flush=True)
    finally:
        server.server_close()
    return 0


def main(argv: list[str] | None = None) -> int:
    """PyInstaller 1-click entry point."""
    multiprocessing.freeze_support()
    parser = build_desktop_arg_parser()
    args = parser.parse_args(argv)
    try:
        return launch_desktop_studio(
            host=args.host,
            preferred_port=args.port,
            workspace_dir=args.workspace_dir,
            open_browser=not args.no_open,
        )
    except ValueError as exc:
        parser.error(str(exc))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
