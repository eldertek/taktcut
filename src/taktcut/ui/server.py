"""Local ThreadingHTTPServer backend for taktcut Web Studio GUI."""

from __future__ import annotations

import argparse
import base64
import binascii
import json
import shlex
import shutil
import subprocess
import tempfile
import threading
import webbrowser
from dataclasses import dataclass, field
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from defusedxml.common import DefusedXmlException
from pydantic import ValidationError

from taktcut import __version__
from taktcut.color import bake_cdl_to_cube, parse_cdl_xml, parse_cube_lut
from taktcut.drp import export_otio, load_timeline, validate_timeline
from taktcut.models import (
    AscCdlParams,
    HardwareCapabilities,
    RationalFrameRate,
    RenderProfile,
    TimelineDocument,
)
from taktcut.qa import run_qa_gate
from taktcut.render import build_render_plan, execute_render_plan, probe_hardware_capabilities
from taktcut.ui.samples import build_sample_timeline, generate_synthetic_sample_clip
from taktcut.ui.security import (
    CDL_SUFFIXES,
    CONTENT_SECURITY_POLICY,
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

ASSETS_DIR: Path = Path(__file__).resolve().parent / "assets"
MAX_REQUEST_BYTES: int = 32 * 1024 * 1024

STATIC_ROUTE_MAP: dict[str, tuple[str, str]] = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/styles.css": ("styles.css", "text/css; charset=utf-8"),
    "/app.js": ("app.js", "application/javascript; charset=utf-8"),
    "/i18n.js": ("i18n.js", "application/javascript; charset=utf-8"),
    "/canvas.js": ("canvas.js", "application/javascript; charset=utf-8"),
    "/favicon.svg": ("favicon.svg", "image/svg+xml"),
}


@dataclass(frozen=True)
class UiServerConfig:
    """Configuration for the taktcut local web studio server."""

    host: str = "127.0.0.1"
    port: int = 8741
    workspace_dir: Path | None = None
    open_browser: bool = True


@dataclass
class UiAppState:
    """Thread-safe shared state for the UI HTTP server."""

    workspace_root: Path
    _caps_lock: threading.Lock = field(default_factory=threading.Lock)
    _cached_caps: HardwareCapabilities | None = None
    _cached_caps_verified: bool = False

    def get_capabilities(
        self,
        *,
        verify_nvenc_runtime: bool = False,
        refresh: bool = False,
    ) -> tuple[HardwareCapabilities | None, str | None]:
        with self._caps_lock:
            if (
                not refresh
                and self._cached_caps is not None
                and (not verify_nvenc_runtime or self._cached_caps_verified)
            ):
                return self._cached_caps, None
            if shutil.which("ffmpeg") is None:
                return None, "ffmpeg binary not found on PATH"
            try:
                caps = probe_hardware_capabilities(verify_nvenc_runtime=verify_nvenc_runtime)
            except (FileNotFoundError, subprocess.SubprocessError, OSError) as exc:
                return None, str(exc)
            self._cached_caps = caps
            self._cached_caps_verified = verify_nvenc_runtime
            return caps, None


def _triplet(raw: Any, default: tuple[float, float, float]) -> tuple[float, float, float]:
    if raw is None:
        return default
    if not isinstance(raw, list) or len(raw) != 3:
        raise ValueError("Expected an RGB array of 3 numeric values")
    return (float(raw[0]), float(raw[1]), float(raw[2]))


def _build_cdl_from_payload(payload: dict[str, Any]) -> AscCdlParams:
    return AscCdlParams(
        slope=_triplet(payload.get("slope"), (1.0, 1.0, 1.0)),
        offset=_triplet(payload.get("offset"), (0.0, 0.0, 0.0)),
        power=_triplet(payload.get("power"), (1.0, 1.0, 1.0)),
        saturation=float(payload.get("saturation", 1.0)),
    )


def _resolve_timeline_from_payload(
    state: UiAppState,
    payload: dict[str, Any],
) -> TimelineDocument:
    timeline_name = payload.get("timeline_name")
    if timeline_name is not None and not isinstance(timeline_name, str):
        raise ValueError("timeline_name must be a string")
    clean_tl_name = timeline_name.strip() or None if isinstance(timeline_name, str) else None

    if "document" in payload and payload["document"] is not None:
        return TimelineDocument.model_validate(payload["document"])

    if "content_base64" in payload and payload["content_base64"] is not None:
        filename = payload.get("filename")
        if not isinstance(filename, str) or not filename.strip():
            raise ValueError("filename is required when uploading content_base64")
        suffix = Path(filename.strip()).suffix.lower()
        if suffix not in TIMELINE_SUFFIXES:
            raise ValueError(f"Unsupported timeline extension: {suffix or '(none)'}")
        b64_raw = payload["content_base64"]
        if not isinstance(b64_raw, str):
            raise ValueError("content_base64 must be a string")
        try:
            decoded = base64.b64decode(b64_raw, validate=True)
        except binascii.Error as exc:
            raise ValueError("Invalid base64 timeline payload") from exc
        if len(decoded) > MAX_REQUEST_BYTES:
            raise ValueError("Uploaded timeline exceeds maximum allowed size")
        with tempfile.TemporaryDirectory(prefix="taktcut_ui_tl_") as tmp_dir:
            tmp_file = Path(tmp_dir) / f"upload{suffix}"
            tmp_file.write_bytes(decoded)
            return load_timeline(tmp_file, timeline_name=clean_tl_name)

    raw_path = payload.get("path")
    if not isinstance(raw_path, str) or not raw_path.strip():
        raise ValueError("Provide a workspace 'path', 'document', or uploaded file payload")

    confined = confine_workspace_path(
        state.workspace_root,
        raw_path,
        must_exist=True,
        allowed_suffixes=TIMELINE_SUFFIXES,
    )
    return load_timeline(confined, timeline_name=clean_tl_name)


class TaktcutRequestHandler(BaseHTTPRequestHandler):
    """HTTP request handler serving static studio assets and real taktcut APIs."""

    server_version = "taktcut-studio/0.1"
    protocol_version = "HTTP/1.1"

    @property
    def app_state(self) -> UiAppState:
        srv = self.server
        assert isinstance(srv, TaktcutUiServer)
        return srv.app_state

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
        # Suppress noisy per-request stderr logs unless debugging.
        return

    def _send_security_headers(self, *, cache_control: str) -> None:
        self.send_header("Content-Security-Policy", CONTENT_SECURITY_POLICY)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", cache_control)

    def _send_bytes(
        self,
        status: int,
        content_type: str,
        body: bytes,
        *,
        cache_control: str = "no-store",
        extra_headers: dict[str, str] | None = None,
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self._send_security_headers(cache_control=cache_control)
        if extra_headers:
            for key, value in extra_headers.items():
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def _send_json(self, status: int, data: Any) -> None:
        encoded = json.dumps(data, ensure_ascii=True).encode("utf-8")
        self._send_bytes(status, "application/json; charset=utf-8", encoded)

    def _read_json_body(self) -> dict[str, Any]:
        raw_len = self.headers.get("Content-Length")
        if raw_len is None:
            raise ValueError("Missing Content-Length header")
        try:
            length = int(raw_len)
        except ValueError as exc:
            raise ValueError("Invalid Content-Length header") from exc
        if length < 0 or length > MAX_REQUEST_BYTES:
            raise ValueError(f"Request payload size out of bounds (0..{MAX_REQUEST_BYTES} bytes)")
        raw_bytes = self.rfile.read(length)
        if len(raw_bytes) != length:
            raise ValueError("Incomplete request body")
        try:
            parsed = json.loads(raw_bytes.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValueError(f"Malformed JSON request body: {exc}") from exc
        if not isinstance(parsed, dict):
            raise ValueError("JSON body must be an object")
        return parsed

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        route = parsed.path
        query = parse_qs(parsed.query)

        if route in STATIC_ROUTE_MAP:
            filename, content_type = STATIC_ROUTE_MAP[route]
            asset_path = (ASSETS_DIR / filename).resolve()
            if not asset_path.is_file():
                self._send_json(HTTPStatus.NOT_FOUND, {"error": f"Asset missing: {filename}"})
                return
            self._send_bytes(
                HTTPStatus.OK,
                content_type,
                asset_path.read_bytes(),
                cache_control="no-cache",
            )
            return

        if route == "/api/health":
            caps, err = self.app_state.get_capabilities(verify_nvenc_runtime=False)
            self._send_json(
                HTTPStatus.OK,
                {
                    "status": "ok",
                    "version": __version__,
                    "workspace_dir": str(self.app_state.workspace_root),
                    "ffmpeg_available": caps is not None,
                    "capabilities": caps.model_dump(mode="json") if caps else None,
                    "ffmpeg_error": err,
                },
            )
            return

        if route == "/api/sample":
            preset = query.get("preset", ["clean"])[0]
            if preset not in {"clean", "issues"}:
                self._send_json(
                    HTTPStatus.BAD_REQUEST,
                    {"error": "preset must be 'clean' or 'issues'"},
                )
                return
            doc = build_sample_timeline(preset=preset)
            val = validate_timeline(doc)
            self._send_json(
                HTTPStatus.OK,
                {
                    "document": doc.model_dump(mode="json"),
                    "validation": val.model_dump(mode="json"),
                },
            )
            return

        if route == "/api/workspace/files":
            files = scan_workspace_files(self.app_state.workspace_root)
            self._send_json(
                HTTPStatus.OK,
                {
                    "workspace_dir": str(self.app_state.workspace_root),
                    "files": files,
                },
            )
            return

        if route == "/api/render/capabilities":
            verify_nvenc = query.get("verify_nvenc", ["false"])[0].lower() == "true"
            refresh = query.get("refresh", ["false"])[0].lower() == "true"
            caps, err = self.app_state.get_capabilities(
                verify_nvenc_runtime=verify_nvenc,
                refresh=refresh or verify_nvenc,
            )
            self._send_json(
                HTTPStatus.OK,
                {
                    "ffmpeg_available": caps is not None,
                    "capabilities": caps.model_dump(mode="json") if caps else None,
                    "error": err,
                },
            )
            return

        self._send_json(HTTPStatus.NOT_FOUND, {"error": f"Unknown route: {route}"})

    def do_POST(self) -> None:  # noqa: N802
        route = urlparse(self.path).path
        try:
            payload = self._read_json_body()
            self._dispatch_post(route, payload)
        except PathConfinementError as exc:
            self._send_json(HTTPStatus.FORBIDDEN, {"error": str(exc)})
        except FileNotFoundError as exc:
            self._send_json(HTTPStatus.NOT_FOUND, {"error": str(exc)})
        except (ValueError, ValidationError, DefusedXmlException, TypeError, KeyError) as exc:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
        except (RuntimeError, subprocess.SubprocessError, OSError) as exc:
            self._send_json(HTTPStatus.UNPROCESSABLE_ENTITY, {"error": str(exc)})
        except Exception as exc:  # noqa: BLE001
            self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(exc)})

    def _dispatch_post(self, route: str, payload: dict[str, Any]) -> None:
        if route == "/api/timeline/inspect":
            doc = _resolve_timeline_from_payload(self.app_state, payload)
            val = validate_timeline(doc)
            self._send_json(
                HTTPStatus.OK,
                {
                    "document": doc.model_dump(mode="json"),
                    "validation": val.model_dump(mode="json"),
                },
            )
            return

        if route == "/api/timeline/validate":
            doc = _resolve_timeline_from_payload(self.app_state, payload)
            val = validate_timeline(doc)
            self._send_json(
                HTTPStatus.OK,
                {
                    "document": doc.model_dump(mode="json"),
                    "validation": val.model_dump(mode="json"),
                },
            )
            return

        if route == "/api/timeline/convert":
            doc = _resolve_timeline_from_payload(self.app_state, payload)
            val = validate_timeline(doc)
            raw_out = payload.get("out_path")
            if raw_out is not None and str(raw_out).strip():
                out_file = confine_workspace_path(
                    self.app_state.workspace_root,
                    str(raw_out),
                    must_exist=False,
                    allowed_suffixes=OTIO_EXPORT_SUFFIXES,
                )
                written = export_otio(doc, out_file, bundle_missing_only=True)
                rel_out = written.relative_to(self.app_state.workspace_root).as_posix()
                self._send_json(
                    HTTPStatus.OK,
                    {
                        "timeline_name": doc.name,
                        "output_path": rel_out,
                        "absolute_path": str(written),
                        "format": written.suffix.lower().lstrip("."),
                        "bytes_written": written.stat().st_size,
                        "validation": val.model_dump(mode="json"),
                    },
                )
                return

            fmt = str(payload.get("format", "otio")).strip().lower()
            if fmt not in {"otio", "otioz"}:
                raise ValueError("format must be 'otio' or 'otioz'")
            safe_name = sanitize_download_filename(doc.name, "timeline", f".{fmt}")
            with tempfile.TemporaryDirectory(prefix="taktcut_ui_otio_") as tmp_dir:
                tmp_out = Path(tmp_dir) / safe_name
                export_otio(doc, tmp_out, bundle_missing_only=True)
                raw_bytes = tmp_out.read_bytes()
            self._send_json(
                HTTPStatus.OK,
                {
                    "timeline_name": doc.name,
                    "filename": safe_name,
                    "format": fmt,
                    "bytes_written": len(raw_bytes),
                    "content_base64": base64.b64encode(raw_bytes).decode("ascii"),
                    "otio_text": raw_bytes.decode("utf-8") if fmt == "otio" else None,
                    "validation": val.model_dump(mode="json"),
                },
            )
            return

        if route == "/api/timeline/download":
            doc = _resolve_timeline_from_payload(self.app_state, payload)
            fmt = str(payload.get("format", "otio")).strip().lower()
            if fmt not in {"otio", "otioz"}:
                raise ValueError("format must be 'otio' or 'otioz'")
            safe_name = sanitize_download_filename(doc.name, "timeline", f".{fmt}")
            with tempfile.TemporaryDirectory(prefix="taktcut_ui_dl_") as tmp_dir:
                tmp_out = Path(tmp_dir) / safe_name
                export_otio(doc, tmp_out, bundle_missing_only=True)
                raw_bytes = tmp_out.read_bytes()
            mime = "application/zip" if fmt == "otioz" else "application/json; charset=utf-8"
            self._send_bytes(
                HTTPStatus.OK,
                mime,
                raw_bytes,
                extra_headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
            )
            return

        if route == "/api/color/parse-cdl":
            xml_content = payload.get("xml_content")
            if isinstance(xml_content, str) and xml_content.strip():
                with tempfile.TemporaryDirectory(prefix="taktcut_ui_cdl_") as tmp_dir:
                    tmp_cdl = Path(tmp_dir) / "input.cdl"
                    tmp_cdl.write_text(xml_content, encoding="utf-8")
                    cdl = parse_cdl_xml(tmp_cdl)
            else:
                raw_path = payload.get("path")
                if not isinstance(raw_path, str) or not raw_path.strip():
                    raise ValueError("Provide 'path' or 'xml_content'")
                confined = confine_workspace_path(
                    self.app_state.workspace_root,
                    raw_path,
                    must_exist=True,
                    allowed_suffixes=CDL_SUFFIXES,
                )
                cdl = parse_cdl_xml(confined)
            self._send_json(HTTPStatus.OK, {"cdl": cdl.model_dump(mode="json")})
            return

        if route == "/api/color/parse-cube":
            raw_path = payload.get("path")
            if not isinstance(raw_path, str) or not raw_path.strip():
                raise ValueError("Provide workspace 'path' to a .cube file")
            confined = confine_workspace_path(
                self.app_state.workspace_root,
                raw_path,
                must_exist=True,
                allowed_suffixes=LUT_SUFFIXES,
            )
            info = parse_cube_lut(confined)
            self._send_json(HTTPStatus.OK, {"info": info.model_dump(mode="json")})
            return

        if route == "/api/color/bake":
            cdl = _build_cdl_from_payload(payload)
            size = int(payload.get("size", 33))
            title = str(payload.get("title", "taktcut_cdl")).strip() or "taktcut_cdl"
            raw_out = payload.get("out_path")

            if raw_out is not None and str(raw_out).strip():
                out_file = confine_workspace_path(
                    self.app_state.workspace_root,
                    str(raw_out),
                    must_exist=False,
                    allowed_suffixes=LUT_SUFFIXES,
                )
                info = bake_cdl_to_cube(cdl, out_file, size=size, title=title)
                cube_text = out_file.read_text(encoding="utf-8")
                saved_rel: str | None = out_file.relative_to(
                    self.app_state.workspace_root
                ).as_posix()
            else:
                with tempfile.TemporaryDirectory(prefix="taktcut_ui_cube_") as tmp_dir:
                    tmp_cube = Path(tmp_dir) / "baked.cube"
                    info = bake_cdl_to_cube(cdl, tmp_cube, size=size, title=title)
                    cube_text = tmp_cube.read_text(encoding="utf-8")
                saved_rel = None

            self._send_json(
                HTTPStatus.OK,
                {
                    "info": info.model_dump(mode="json"),
                    "cdl": cdl.model_dump(mode="json"),
                    "saved_path": saved_rel,
                    "cube_text": cube_text,
                },
            )
            return

        if route == "/api/color/download-cube":
            cdl = _build_cdl_from_payload(payload)
            size = int(payload.get("size", 33))
            title = str(payload.get("title", "taktcut_cdl")).strip() or "taktcut_cdl"
            filename = sanitize_download_filename(
                str(payload.get("filename") or title),
                "taktcut_cdl",
                ".cube",
            )
            with tempfile.TemporaryDirectory(prefix="taktcut_ui_cubedl_") as tmp_dir:
                tmp_cube = Path(tmp_dir) / filename
                bake_cdl_to_cube(cdl, tmp_cube, size=size, title=title)
                cube_bytes = tmp_cube.read_bytes()
            self._send_bytes(
                HTTPStatus.OK,
                "text/plain; charset=utf-8",
                cube_bytes,
                extra_headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
            return

        if route == "/api/render/plan":
            raw_in = payload.get("input_path")
            raw_out = payload.get("output_path")
            if not isinstance(raw_in, str) or not isinstance(raw_out, str):
                raise ValueError("input_path and output_path strings are required")

            execute = bool(payload.get("execute", False))
            in_file = confine_workspace_path(
                self.app_state.workspace_root,
                raw_in,
                must_exist=execute,
                allowed_suffixes=MEDIA_SUFFIXES,
            )
            out_file = confine_workspace_path(
                self.app_state.workspace_root,
                raw_out,
                must_exist=False,
                allowed_suffixes=MEDIA_SUFFIXES,
            )

            profile = RenderProfile(str(payload.get("profile", RenderProfile.WEB_H264.value)))
            raw_fps = payload.get("fps")
            fps = RationalFrameRate.from_str(str(raw_fps)) if raw_fps else None

            raw_lufs = payload.get("target_lufs")
            target_lufs = float(raw_lufs) if raw_lufs not in (None, "") else None

            prefer_hw = bool(payload.get("prefer_hw", True))

            lut_file: Path | None = None
            raw_lut = payload.get("lut_path")
            if isinstance(raw_lut, str) and raw_lut.strip():
                lut_file = confine_workspace_path(
                    self.app_state.workspace_root,
                    raw_lut,
                    must_exist=True,
                    allowed_suffixes=LUT_SUFFIXES,
                )
            elif isinstance(payload.get("cdl"), dict):
                cdl = _build_cdl_from_payload(payload["cdl"])
                lut_file = confine_workspace_path(
                    self.app_state.workspace_root,
                    ".taktcut-samples/studio_grade.cube",
                    must_exist=False,
                    allowed_suffixes=LUT_SUFFIXES,
                )
                bake_cdl_to_cube(cdl, lut_file, size=33, title="taktcut_studio_grade")

            caps, err = self.app_state.get_capabilities(verify_nvenc_runtime=prefer_hw)
            if caps is None:
                raise RuntimeError(err or "ffmpeg unavailable")

            plan = build_render_plan(
                input_path=in_file,
                output_path=out_file,
                profile=profile,
                fps=fps,
                lut_path=lut_file,
                target_lufs=target_lufs,
                prefer_hw=prefer_hw,
                caps=caps,
            )
            response: dict[str, Any] = {
                "plan": plan.model_dump(mode="json"),
                "shell_command": shlex.join(plan.argv),
                "result": None,
            }
            if execute:
                result = execute_render_plan(plan)
                response["result"] = result.model_dump(mode="json")
            self._send_json(HTTPStatus.OK, response)
            return

        if route == "/api/qa/verify":
            raw_path = payload.get("path")
            if not isinstance(raw_path, str) or not raw_path.strip():
                raise ValueError("Workspace media 'path' is required")
            media_file = confine_workspace_path(
                self.app_state.workspace_root,
                raw_path,
                must_exist=True,
                allowed_suffixes=MEDIA_SUFFIXES,
            )
            target_lufs = float(payload.get("target_lufs", -14.0))
            tolerance_lu = float(payload.get("tolerance_lu", 1.5))
            max_true_peak_dbtp = float(payload.get("max_true_peak_dbtp", -1.0))
            require_faststart = bool(payload.get("require_faststart", True))

            report = run_qa_gate(
                media_file,
                target_lufs=target_lufs,
                tolerance_lu=tolerance_lu,
                max_true_peak_dbtp=max_true_peak_dbtp,
                require_faststart=require_faststart,
            )
            self._send_json(HTTPStatus.OK, {"report": report.model_dump(mode="json")})
            return

        if route == "/api/sample/generate-clip":
            rel_target = ".taktcut-samples/sample_rec709.mp4"
            out_file = confine_workspace_path(
                self.app_state.workspace_root,
                rel_target,
                must_exist=False,
                allowed_suffixes=MEDIA_SUFFIXES,
            )
            generated = generate_synthetic_sample_clip(out_file)
            self._send_json(
                HTTPStatus.OK,
                {
                    "path": rel_target,
                    "absolute_path": str(generated),
                    "bytes_written": generated.stat().st_size,
                },
            )
            return

        self._send_json(HTTPStatus.NOT_FOUND, {"error": f"Unknown API route: {route}"})


class TaktcutUiServer(ThreadingHTTPServer):
    """Multi-threaded loopback HTTP server holding studio application state."""

    daemon_threads = True
    allow_reuse_address = True

    def __init__(
        self,
        server_address: tuple[str, int],
        workspace_root: Path,
    ) -> None:
        self.app_state = UiAppState(workspace_root=workspace_root)
        super().__init__(server_address, TaktcutRequestHandler)


def create_ui_server(
    *,
    host: str = "127.0.0.1",
    port: int = 8741,
    workspace_dir: Path | None = None,
) -> TaktcutUiServer:
    """Instantiate a configured TaktcutUiServer without starting its blocking loop."""
    safe_host = validate_loopback_host(host)
    if port < 0 or port > 65535:
        raise ValueError(f"Port must be in 0..65535, got {port}")
    workspace_root = resolve_workspace_root(workspace_dir)
    return TaktcutUiServer((safe_host, port), workspace_root=workspace_root)


def serve_ui(
    *,
    host: str = "127.0.0.1",
    port: int = 8741,
    workspace_dir: Path | None = None,
    open_browser: bool = True,
) -> int:
    """Start the taktcut studio web UI server until interrupted."""
    server = create_ui_server(host=host, port=port, workspace_dir=workspace_dir)
    raw_host, bound_port = server.server_address[0], server.server_address[1]
    bound_host = raw_host.decode("ascii") if isinstance(raw_host, bytes) else str(raw_host)
    url_host = f"[{bound_host}]" if ":" in bound_host else bound_host
    url = f"http://{url_host}:{bound_port}/"
    print(f"taktcut studio running at {url}", flush=True)
    print(f"Workspace directory (confined): {server.app_state.workspace_root}", flush=True)
    print("Press Ctrl+C to stop.", flush=True)

    if open_browser:
        threading.Timer(0.25, webbrowser.open, args=(url,)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down taktcut studio.")
    finally:
        server.server_close()
    return 0


def build_ui_arg_parser(prog: str = "taktcut-ui") -> argparse.ArgumentParser:
    """Build argument parser shared by taktcut-ui and taktcut ui."""
    parser = argparse.ArgumentParser(
        prog=prog,
        description="Launch the local taktcut Web Studio GUI bound to 127.0.0.1.",
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Loopback interface to bind (default: 127.0.0.1)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8741,
        help="TCP port to listen on (0 for ephemeral port, default: 8741)",
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Do not open a web browser tab automatically",
    )
    parser.add_argument(
        "--workspace-dir",
        type=Path,
        default=None,
        help="Confined workspace root for file picking, renders, and QA (default: cwd)",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    """Entry point for the standalone taktcut-ui command."""
    parser = build_ui_arg_parser()
    args = parser.parse_args(argv)
    try:
        return serve_ui(
            host=args.host,
            port=args.port,
            workspace_dir=args.workspace_dir,
            open_browser=not args.no_open,
        )
    except ValueError as exc:
        parser.error(str(exc))
        return 2
