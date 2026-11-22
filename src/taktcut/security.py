"""Shared security primitives for taktcut: loopback checks and realpath workspace confinement."""

from __future__ import annotations

import os
import re
from pathlib import Path

LOOPBACK_HOSTS: frozenset[str] = frozenset({"127.0.0.1", "localhost", "::1"})

CONTENT_SECURITY_POLICY: str = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self'; "
    "img-src 'self' data: blob:; "
    "connect-src 'self'; "
    "object-src 'none'; "
    "base-uri 'none'; "
    "frame-ancestors 'none'"
)

TIMELINE_SUFFIXES: frozenset[str] = frozenset(
    {".drp", ".drt", ".fcpxml", ".xml", ".otio", ".otioz"}
)
OTIO_EXPORT_SUFFIXES: frozenset[str] = frozenset({".otio", ".otioz"})
LUT_SUFFIXES: frozenset[str] = frozenset({".cube"})
CDL_SUFFIXES: frozenset[str] = frozenset({".cdl", ".cc", ".ccc", ".xml"})
MEDIA_SUFFIXES: frozenset[str] = frozenset(
    {".mp4", ".mov", ".m4v", ".mkv", ".mxf", ".webm", ".wav", ".aac", ".mp3"}
)

_SKIP_DIRS: frozenset[str] = frozenset(
    {
        ".git",
        ".venv",
        "venv",
        "node_modules",
        "__pycache__",
        ".mypy_cache",
        ".pytest_cache",
        ".ruff_cache",
        "dist",
        "build",
    }
)


class PathConfinementError(PermissionError):
    """Raised when a requested path escapes the confined workspace root."""


def validate_loopback_host(host: str) -> str:
    """Ensure the UI server binds strictly to a local loopback interface."""
    normalized = host.strip()
    if normalized not in LOOPBACK_HOSTS:
        raise ValueError(
            f"Refusing non-loopback host {host!r}; allowed hosts: 127.0.0.1, localhost, ::1"
        )
    return normalized


def resolve_workspace_root(workspace_dir: Path | None) -> Path:
    """Resolve and validate the workspace directory via os.path.realpath."""
    target = workspace_dir if workspace_dir is not None else Path.cwd()
    root = Path(os.path.realpath(target))
    if not root.exists() or not root.is_dir():
        raise ValueError(f"Workspace directory does not exist or is not a directory: {root}")
    return root


def confine_workspace_path(
    workspace_root: Path,
    raw_path: str,
    *,
    must_exist: bool = False,
    allowed_suffixes: frozenset[str] | None = None,
) -> Path:
    """Resolve a user-supplied path strictly within workspace_root via realpath."""
    if not isinstance(raw_path, str):
        raise ValueError("Path must be a string")
    cleaned = raw_path.strip()
    if not cleaned:
        raise ValueError("Path cannot be empty")
    if "\x00" in cleaned:
        raise ValueError("Null byte in path is forbidden")

    root = Path(os.path.realpath(workspace_root))
    candidate = Path(cleaned)
    joined = candidate if candidate.is_absolute() else (root / candidate)
    resolved = Path(os.path.realpath(joined))

    try:
        resolved.relative_to(root)
    except ValueError as exc:
        raise PathConfinementError(
            f"Access denied: {raw_path!r} resolves outside workspace directory"
        ) from exc

    if resolved == root:
        raise ValueError("File path cannot point to the workspace root directory itself")

    if allowed_suffixes is not None and resolved.suffix.lower() not in allowed_suffixes:
        allowed_str = ", ".join(sorted(allowed_suffixes))
        raise ValueError(
            f"Unsupported extension {resolved.suffix or '(none)'!r}; expected one of: {allowed_str}"
        )

    if must_exist and not resolved.is_file():
        raise FileNotFoundError(f"File not found inside workspace: {raw_path}")

    return resolved


def sanitize_download_filename(raw_name: str | None, default_stem: str, suffix: str) -> str:
    """Produce a safe basename for Content-Disposition downloads."""
    base = Path(raw_name or "").name
    stem = Path(base).stem if base else default_stem
    safe_stem = re.sub(r"[^A-Za-z0-9._-]", "_", stem).strip("._-")
    if not safe_stem:
        safe_stem = default_stem
    clean_suffix = suffix if suffix.startswith(".") else f".{suffix}"
    return f"{safe_stem}{clean_suffix.lower()}"


def scan_workspace_files(
    workspace_root: Path,
    *,
    max_depth: int = 4,
    max_files: int = 300,
) -> dict[str, list[str]]:
    """List categorized workspace files strictly confined within workspace_root."""
    root = Path(os.path.realpath(workspace_root))
    timelines: list[str] = []
    luts: list[str] = []
    cdls: list[str] = []
    media: list[str] = []
    total_found = 0

    for current_dir, dirnames, filenames in os.walk(root, followlinks=False):
        rel_dir = Path(current_dir).relative_to(root)
        depth = 0 if rel_dir == Path(".") else len(rel_dir.parts)
        dirnames[:] = sorted(
            d
            for d in dirnames
            if d not in _SKIP_DIRS and not (root / rel_dir / d).is_symlink()
        )
        if depth >= max_depth:
            dirnames[:] = []

        for filename in sorted(filenames):
            full_path = Path(current_dir) / filename
            if full_path.is_symlink():
                real_item = Path(os.path.realpath(full_path))
                try:
                    real_item.relative_to(root)
                except ValueError:
                    continue
            rel_posix = full_path.relative_to(root).as_posix()
            ext = full_path.suffix.lower()
            if ext in TIMELINE_SUFFIXES:
                timelines.append(rel_posix)
            elif ext in LUT_SUFFIXES:
                luts.append(rel_posix)
            elif ext in CDL_SUFFIXES and ext != ".xml":
                cdls.append(rel_posix)
            elif ext in MEDIA_SUFFIXES:
                media.append(rel_posix)
            else:
                continue

            total_found += 1
            if total_found >= max_files:
                return {
                    "timelines": timelines,
                    "luts": luts,
                    "cdls": cdls,
                    "media": media,
                }

    return {
        "timelines": timelines,
        "luts": luts,
        "cdls": cdls,
        "media": media,
    }
