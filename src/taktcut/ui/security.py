"""Security primitives for taktcut local studio UI (re-exported from taktcut.security)."""

from __future__ import annotations

from taktcut.security import (
    CDL_SUFFIXES,
    CONTENT_SECURITY_POLICY,
    LOOPBACK_HOSTS,
    LUT_SUFFIXES,
    MEDIA_SUFFIXES,
    OTIO_EXPORT_SUFFIXES,
    TIMELINE_SUFFIXES,
    PathConfinementError,
    confine_workspace_path,
    resolve_workspace_root,
    sanitize_download_filename,
    scan_workspace_files,
    validate_loopback_host,
)

__all__ = [
    "CDL_SUFFIXES",
    "CONTENT_SECURITY_POLICY",
    "LOOPBACK_HOSTS",
    "LUT_SUFFIXES",
    "MEDIA_SUFFIXES",
    "OTIO_EXPORT_SUFFIXES",
    "PathConfinementError",
    "TIMELINE_SUFFIXES",
    "confine_workspace_path",
    "resolve_workspace_root",
    "sanitize_download_filename",
    "scan_workspace_files",
    "validate_loopback_host",
]
