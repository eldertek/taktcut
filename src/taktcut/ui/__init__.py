"""Local Web Studio GUI package for taktcut."""

from taktcut.ui.desktop import build_desktop_app_command, find_desktop_browser_binary
from taktcut.ui.security import PathConfinementError, confine_workspace_path, validate_loopback_host
from taktcut.ui.server import (
    TaktcutUiServer,
    UiAppState,
    UiServerConfig,
    build_ui_arg_parser,
    create_ui_server,
    main,
    serve_ui,
)

__all__ = [
    "PathConfinementError",
    "TaktcutUiServer",
    "UiAppState",
    "UiServerConfig",
    "build_desktop_app_command",
    "build_ui_arg_parser",
    "confine_workspace_path",
    "create_ui_server",
    "find_desktop_browser_binary",
    "main",
    "serve_ui",
    "validate_loopback_host",
]
