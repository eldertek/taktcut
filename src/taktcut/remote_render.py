"""Remote Render Node HTTP server, client, and HTTPS/LAN SSRF guard for taktcut."""

from __future__ import annotations

import argparse
import base64
import binascii
import hmac
import ipaddress
import json
import re
import secrets
import shutil
import socket
import subprocess
import sys
import threading
import urllib.error
import urllib.request
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, ValidationError, field_validator

from taktcut import __version__
from taktcut.color import ColorGradeParams, bake_cdl_to_cube, parse_cube_lut
from taktcut.fx import FxNode, compile_fx_filtergraph
from taktcut.models import (
    AscCdlParams,
    HardwareCapabilities,
    RationalFrameRate,
    RenderPlan,
    RenderProfile,
    RenderResult,
)
from taktcut.render import (
    ClipAudioParams,
    build_render_plan,
    execute_render_plan,
    probe_hardware_capabilities,
)
from taktcut.security import (
    LUT_SUFFIXES,
    MEDIA_SUFFIXES,
    PathConfinementError,
    confine_workspace_path,
    resolve_workspace_root,
    sanitize_download_filename,
)
from taktcut.titles import TitleOverlayParams

MAX_REMOTE_JOB_BYTES: int = 64 * 1024 * 1024
_JOB_ID_RE = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
_BLOCKED_METADATA_HOSTS: frozenset[str] = frozenset(
    {
        "metadata.google.internal",
        "metadata",
        "instance-data",
        "169.254.169.254",
    }
)
_LAN_HOSTNAME_SUFFIXES: tuple[str, ...] = (".local", ".lan", ".home.arpa", ".internal")

RemoteJobStatus = Literal["queued", "running", "completed", "failed"]


class SsrfGuardError(ValueError):
    """Raised when a remote render URL violates HTTPS/LAN SSRF protections."""


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _is_lan_or_loopback_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Return True only for private RFC1918/ULA or loopback IPs, never link-local/public."""
    candidate: ipaddress.IPv4Address | ipaddress.IPv6Address = ip
    if isinstance(candidate, ipaddress.IPv6Address) and candidate.ipv4_mapped is not None:
        candidate = candidate.ipv4_mapped
    if candidate.is_link_local or candidate.is_unspecified or candidate.is_multicast:
        return False
    return bool(candidate.is_loopback or candidate.is_private)


def _is_disallowed_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Reject link-local metadata, unspecified, and multicast targets even over HTTPS."""
    candidate: ipaddress.IPv4Address | ipaddress.IPv6Address = ip
    if isinstance(candidate, ipaddress.IPv6Address) and candidate.ipv4_mapped is not None:
        candidate = candidate.ipv4_mapped
    return bool(candidate.is_link_local or candidate.is_unspecified or candidate.is_multicast)


def _parse_ip_literal(hostname: str) -> ipaddress.IPv4Address | ipaddress.IPv6Address | None:
    stripped = hostname.strip("[]")
    try:
        return ipaddress.ip_address(stripped)
    except ValueError:
        return None


def _is_declared_lan_hostname(hostname: str) -> bool:
    host_l = hostname.lower().rstrip(".")
    if host_l == "localhost" or host_l.endswith(".localhost"):
        return True
    return host_l.endswith(_LAN_HOSTNAME_SUFFIXES)


def validate_remote_node_url(raw_url: str, *, resolve_dns: bool = True) -> str:
    """Validate and normalize a remote render node URL against SSRF risks.

    Rules:
    - Only 'https' and 'http' schemes are permitted.
    - Embedded credentials (user:pass@), queries, fragments, and whitespace are rejected.
    - Link-local (169.254.0.0/16, fe80::/10), unspecified (0.0.0.0), multicast, and
      cloud metadata hostnames are always rejected, even on HTTPS.
    - Cleartext 'http://' is strictly restricted to loopback or LAN private addresses.
    """
    if not isinstance(raw_url, str):
        raise SsrfGuardError("Remote node URL must be a string")
    cleaned = raw_url.strip()
    if not cleaned:
        raise SsrfGuardError("Remote node URL cannot be empty")
    if any(ch.isspace() or ord(ch) < 32 for ch in cleaned):
        raise SsrfGuardError("Remote node URL must not contain whitespace or control characters")

    parsed = urlparse(cleaned)
    scheme = parsed.scheme.lower()
    if scheme not in {"https", "http"}:
        raise SsrfGuardError(
            f"Unsupported URL scheme {scheme or '(none)'!r}; expected https:// or LAN http://"
        )
    if parsed.username is not None or parsed.password is not None:
        raise SsrfGuardError("Embedded credentials in remote node URL are forbidden")
    if parsed.query or parsed.fragment:
        raise SsrfGuardError("Remote node URL must be a clean base URL without query or fragment")

    hostname = parsed.hostname
    if not hostname:
        raise SsrfGuardError("Remote node URL is missing a valid hostname")

    host_lower = hostname.lower().rstrip(".")
    if host_lower in _BLOCKED_METADATA_HOSTS:
        raise SsrfGuardError(f"Blocked metadata/link-local host: {hostname!r}")

    port = parsed.port
    if port is not None and (port < 1 or port > 65535):
        raise SsrfGuardError(f"Invalid port in remote node URL: {port}")

    ip_literal = _parse_ip_literal(hostname)
    if ip_literal is not None:
        if _is_disallowed_ip(ip_literal):
            raise SsrfGuardError(f"Blocked non-routable or link-local IP: {hostname!r}")
        if scheme == "http" and not _is_lan_or_loopback_ip(ip_literal):
            raise SsrfGuardError(
                f"Cleartext http:// is allowed only on loopback or LAN IPs, rejected {hostname!r}"
            )
    else:
        if scheme == "http" and not _is_declared_lan_hostname(host_lower):
            # Allow HTTP only if DNS explicitly resolves exclusively to LAN/loopback IPs.
            if not resolve_dns:
                raise SsrfGuardError(
                    f"Cleartext http:// rejected for non-LAN hostname {hostname!r}; use https://"
                )
            try:
                infos = socket.getaddrinfo(hostname, port or 80, type=socket.SOCK_STREAM)
            except OSError as exc:
                raise SsrfGuardError(
                    f"Cleartext http:// rejected for unverified public/non-LAN host {hostname!r}"
                ) from exc
            resolved_ips = [
                _parse_ip_literal(str(item[4][0]))
                for item in infos
                if item[4]
            ]
            valid_ips = [ip for ip in resolved_ips if ip is not None]
            if not valid_ips or not all(_is_lan_or_loopback_ip(ip) for ip in valid_ips):
                raise SsrfGuardError(
                    f"Cleartext http:// rejected for public/unsafe host {hostname!r}; use https://"
                )
        elif resolve_dns:
            try:
                infos = socket.getaddrinfo(
                    hostname,
                    port or (443 if scheme == "https" else 80),
                    type=socket.SOCK_STREAM,
                )
                for item in infos:
                    ip = _parse_ip_literal(str(item[4][0])) if item[4] else None
                    if ip is not None and _is_disallowed_ip(ip):
                        raise SsrfGuardError(
                            f"Hostname {hostname!r} resolved to blocked IP {ip}"
                        )
            except OSError:
                # Allow unresolved HTTPS or declared .local/.lan hostnames at validation time;
                # network transport will fail cleanly if unreachable.
                pass

    path = parsed.path.rstrip("/")
    return f"{scheme}://{parsed.netloc}{path}"


class RemoteRenderJobRequest(BaseModel):
    """Payload accepted by POST /api/remote/jobs on a taktcut Remote Render Node."""

    input_filename: str = "input.mp4"
    input_base64: str | None = None
    input_path: str | None = None
    output_filename: str = "remote_render.mp4"
    profile: RenderProfile = RenderProfile.WEB_H264
    fps: str | None = None
    target_lufs: float | None = None
    prefer_hw: bool = True
    fx_stack: list[FxNode] = Field(default_factory=list)
    cdl: AscCdlParams | None = None
    color_grade: ColorGradeParams | None = None
    lut_cube_text: str | None = None
    title_overlay: TitleOverlayParams | None = None
    audio_params: ClipAudioParams | None = None
    clip_duration_s: float | None = None

    @field_validator("input_filename", "output_filename")
    @classmethod
    def _validate_media_filename(cls, raw: str) -> str:
        cleaned = raw.strip()
        if not cleaned:
            raise ValueError("Filename cannot be empty")
        suffix = Path(cleaned).suffix.lower()
        if suffix not in MEDIA_SUFFIXES:
            allowed = ", ".join(sorted(MEDIA_SUFFIXES))
            raise ValueError(
                f"Unsupported media extension {suffix or '(none)'!r}; expected {allowed}"
            )
        return sanitize_download_filename(cleaned, "media", suffix)


class RemoteRenderJob(BaseModel):
    """Status and telemetry record for a remote render job."""

    job_id: str
    status: RemoteJobStatus
    created_at: str
    started_at: str | None = None
    finished_at: str | None = None
    profile: RenderProfile
    encoder: str = ""
    output_filename: str
    bytes_written: int = 0
    plan: RenderPlan | None = None
    result: RenderResult | None = None
    error: str | None = None
    download_path: str = ""


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Prevent HTTP 30x redirects from bypassing SSRF checks."""

    def redirect_request(
        self,
        req: urllib.request.Request,
        fp: Any,
        code: int,
        msg: str,
        headers: Any,
        newurl: str,
    ) -> urllib.request.Request | None:
        raise SsrfGuardError(f"Blocked HTTP redirect from remote render node to {newurl!r}")


class RemoteRenderClient:
    """SSRF-guarded HTTP(S) client with Bearer authentication for Remote Render Nodes."""

    def __init__(
        self,
        base_url: str,
        bearer_token: str,
        *,
        timeout: float = 30.0,
        resolve_dns: bool = True,
    ) -> None:
        self.base_url = validate_remote_node_url(base_url, resolve_dns=resolve_dns)
        cleaned_token = bearer_token.strip()
        if not cleaned_token:
            raise ValueError("Bearer token is required for remote render node authentication")
        self._token = cleaned_token
        self.timeout = max(1.0, float(timeout))
        self._opener = urllib.request.build_opener(_NoRedirectHandler())

    def _request_bytes(
        self,
        path: str,
        *,
        method: str = "GET",
        payload: dict[str, Any] | None = None,
    ) -> tuple[int, bytes]:
        url = f"{self.base_url}{path}"
        headers: dict[str, str] = {
            "Authorization": f"Bearer {self._token}",
            "Accept": "application/json",
        }
        data: bytes | None = None
        if payload is not None:
            data = json.dumps(payload, ensure_ascii=True).encode("utf-8")
            headers["Content-Type"] = "application/json"

        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with self._opener.open(req, timeout=self.timeout) as resp:
                return int(resp.status), bytes(resp.read())
        except urllib.error.HTTPError as err:
            err_body = err.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(err_body)
                msg = parsed.get("error") or err_body
            except json.JSONDecodeError:
                msg = err_body or f"HTTP {err.code}"
            raise RuntimeError(f"Remote render node HTTP {err.code}: {msg}") from err
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Unable to reach remote render node: {exc.reason}") from exc

    def health(self) -> dict[str, Any]:
        """Probe remote render node status and FFmpeg hardware capabilities."""
        _, raw = self._request_bytes("/api/remote/health", method="GET")
        data = json.loads(raw.decode("utf-8"))
        if not isinstance(data, dict):
            raise RuntimeError("Invalid health response from remote render node")
        return data

    def submit_job(self, job_request: RemoteRenderJobRequest) -> RemoteRenderJob:
        """Submit a render job to the remote node and return initial job state."""
        _, raw = self._request_bytes(
            "/api/remote/jobs",
            method="POST",
            payload=job_request.model_dump(mode="json"),
        )
        return RemoteRenderJob.model_validate_json(raw.decode("utf-8"))

    def get_job(self, job_id: str) -> RemoteRenderJob:
        """Poll a remote render job by id."""
        if not _JOB_ID_RE.fullmatch(job_id):
            raise ValueError(f"Invalid remote job id: {job_id!r}")
        _, raw = self._request_bytes(f"/api/remote/jobs/{job_id}", method="GET")
        return RemoteRenderJob.model_validate_json(raw.decode("utf-8"))

    def download_job_output(self, job_id: str, dest_path: Path) -> Path:
        """Download completed rendered media bytes into dest_path atomically."""
        if not _JOB_ID_RE.fullmatch(job_id):
            raise ValueError(f"Invalid remote job id: {job_id!r}")
        _, raw = self._request_bytes(f"/api/remote/jobs/{job_id}/download", method="GET")
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = dest_path.with_suffix(dest_path.suffix + ".part")
        tmp_path.write_bytes(raw)
        tmp_path.replace(dest_path)
        return dest_path


@dataclass
class RemoteRenderState:
    """Thread-safe job registry and hardware probe cache for RemoteRenderServer."""

    workspace_root: Path
    auth_token: str
    _lock: threading.Lock = field(default_factory=threading.Lock)
    _jobs: dict[str, RemoteRenderJob] = field(default_factory=dict)
    _job_outputs: dict[str, Path] = field(default_factory=dict)
    _cached_caps: HardwareCapabilities | None = None
    _cached_caps_verified: bool = False

    def verify_bearer(self, header_value: str | None) -> bool:
        if not header_value:
            return False
        parts = header_value.strip().split(" ", 1)
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return False
        return hmac.compare_digest(
            parts[1].strip().encode("utf-8"),
            self.auth_token.encode("utf-8"),
        )

    def get_capabilities(
        self,
        *,
        verify_nvenc_runtime: bool = False,
    ) -> tuple[HardwareCapabilities | None, str | None]:
        with self._lock:
            if self._cached_caps is not None and (
                not verify_nvenc_runtime or self._cached_caps_verified
            ):
                return self._cached_caps, None
        if shutil.which("ffmpeg") is None:
            return None, "ffmpeg binary not found on PATH"
        try:
            caps = probe_hardware_capabilities(verify_nvenc_runtime=verify_nvenc_runtime)
        except (FileNotFoundError, subprocess.SubprocessError, OSError) as exc:
            return None, str(exc)
        with self._lock:
            self._cached_caps = caps
            self._cached_caps_verified = verify_nvenc_runtime
        return caps, None

    def create_job(self, req: RemoteRenderJobRequest) -> RemoteRenderJob:
        if req.input_base64 is None and not req.input_path:
            raise ValueError("Provide either 'input_base64' or workspace 'input_path'")

        job_id = secrets.token_hex(12)
        job_dir = confine_workspace_path(
            self.workspace_root,
            f".taktcut-remote-jobs/{job_id}/keep.tmp",
            must_exist=False,
        ).parent
        job_dir.mkdir(parents=True, exist_ok=True)

        if req.input_base64 is not None:
            try:
                raw_media = base64.b64decode(req.input_base64, validate=True)
            except binascii.Error as exc:
                raise ValueError("Invalid base64 input_base64 media payload") from exc
            if len(raw_media) == 0 or len(raw_media) > MAX_REMOTE_JOB_BYTES:
                raise ValueError(
                    f"Input media size out of bounds (1..{MAX_REMOTE_JOB_BYTES} bytes)"
                )
            in_file = confine_workspace_path(
                self.workspace_root,
                f".taktcut-remote-jobs/{job_id}/{req.input_filename}",
                must_exist=False,
                allowed_suffixes=MEDIA_SUFFIXES,
            )
            in_file.write_bytes(raw_media)
        else:
            assert req.input_path is not None
            in_file = confine_workspace_path(
                self.workspace_root,
                req.input_path,
                must_exist=True,
                allowed_suffixes=MEDIA_SUFFIXES,
            )

        out_file = confine_workspace_path(
            self.workspace_root,
            f".taktcut-remote-jobs/{job_id}/out/{req.output_filename}",
            must_exist=False,
            allowed_suffixes=MEDIA_SUFFIXES,
        )

        is_prores = req.profile == RenderProfile.PRORES_HQ
        pix_fmt = "yuv422p10le" if is_prores else "yuv420p"

        lut_file: Path | None = None
        if req.lut_cube_text is not None and req.lut_cube_text.strip():
            lut_file = confine_workspace_path(
                self.workspace_root,
                f".taktcut-remote-jobs/{job_id}/grade.cube",
                must_exist=False,
                allowed_suffixes=LUT_SUFFIXES,
            )
            lut_file.write_text(req.lut_cube_text, encoding="utf-8")
            parse_cube_lut(lut_file)
        elif req.cdl is not None:
            lut_file = confine_workspace_path(
                self.workspace_root,
                f".taktcut-remote-jobs/{job_id}/cdl_grade.cube",
                must_exist=False,
                allowed_suffixes=LUT_SUFFIXES,
            )
            bake_cdl_to_cube(req.cdl, lut_file, size=33, title="taktcut_remote_cdl")

        fx_filtergraph: str | None = None
        if req.fx_stack:
            compiled = compile_fx_filtergraph(
                req.fx_stack,
                pix_fmt=pix_fmt,
                use_gpu=req.prefer_hw,
            )
            if compiled.filtergraph:
                fx_filtergraph = compiled.filtergraph

        caps, err = self.get_capabilities(verify_nvenc_runtime=req.prefer_hw)
        if caps is None:
            raise RuntimeError(err or "ffmpeg unavailable on remote render node")

        fps = RationalFrameRate.from_str(req.fps) if req.fps else None
        plan = build_render_plan(
            input_path=in_file,
            output_path=out_file,
            profile=req.profile,
            fps=fps,
            lut_path=lut_file,
            color_grade=req.color_grade if lut_file is None else None,
            fx_filtergraph=fx_filtergraph,
            title_overlay=req.title_overlay,
            audio_params=req.audio_params,
            clip_duration_s=req.clip_duration_s,
            target_lufs=req.target_lufs,
            prefer_hw=req.prefer_hw,
            caps=caps,
        )

        job = RemoteRenderJob(
            job_id=job_id,
            status="queued",
            created_at=_utc_now_iso(),
            profile=req.profile,
            encoder=plan.encoder,
            output_filename=req.output_filename,
            plan=plan,
            download_path=f"/api/remote/jobs/{job_id}/download",
        )
        with self._lock:
            self._jobs[job_id] = job
            self._job_outputs[job_id] = out_file

        worker = threading.Thread(
            target=self._execute_job_worker,
            args=(job_id, plan),
            daemon=True,
        )
        worker.start()
        return job

    def _execute_job_worker(self, job_id: str, plan: RenderPlan) -> None:
        with self._lock:
            current = self._jobs[job_id]
            self._jobs[job_id] = current.model_copy(
                update={"status": "running", "started_at": _utc_now_iso()}
            )
        try:
            result = execute_render_plan(plan)
            status: RemoteJobStatus = "completed" if result.success else "failed"
            err_msg = None if result.success else (result.stderr_tail or "FFmpeg render failed")
            with self._lock:
                cur = self._jobs[job_id]
                self._jobs[job_id] = cur.model_copy(
                    update={
                        "status": status,
                        "finished_at": _utc_now_iso(),
                        "bytes_written": result.bytes_written,
                        "result": result,
                        "error": err_msg,
                    }
                )
        except Exception as exc:  # noqa: BLE001
            with self._lock:
                cur = self._jobs[job_id]
                self._jobs[job_id] = cur.model_copy(
                    update={
                        "status": "failed",
                        "finished_at": _utc_now_iso(),
                        "error": str(exc),
                    }
                )

    def get_job(self, job_id: str) -> RemoteRenderJob | None:
        with self._lock:
            return self._jobs.get(job_id)

    def get_job_output_path(self, job_id: str) -> Path | None:
        with self._lock:
            return self._job_outputs.get(job_id)

    def job_counts(self) -> tuple[int, int]:
        with self._lock:
            total = len(self._jobs)
            active = sum(1 for j in self._jobs.values() if j.status in {"queued", "running"})
            return active, total


class RemoteRenderHandler(BaseHTTPRequestHandler):
    """HTTP request handler for the taktcut Remote Render Node."""

    server_version = f"taktcut-remote-node/{__version__}"
    protocol_version = "HTTP/1.1"

    @property
    def state(self) -> RemoteRenderState:
        srv = self.server
        assert isinstance(srv, RemoteRenderServer)
        return srv.state

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
        return

    def _send_bytes(
        self,
        status: int,
        content_type: str,
        body: bytes,
        *,
        extra_headers: dict[str, str] | None = None,
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _send_json(
        self,
        status: int,
        data: Any,
        *,
        extra_headers: dict[str, str] | None = None,
    ) -> None:
        encoded = json.dumps(data, ensure_ascii=True).encode("utf-8")
        self._send_bytes(
            status,
            "application/json; charset=utf-8",
            encoded,
            extra_headers=extra_headers,
        )

    def _require_auth(self) -> bool:
        if self.state.verify_bearer(self.headers.get("Authorization")):
            return True
        self._send_json(
            HTTPStatus.UNAUTHORIZED,
            {"error": "Unauthorized: valid Bearer token required"},
            extra_headers={"WWW-Authenticate": "Bearer"},
        )
        return False

    def _read_json_body(self) -> dict[str, Any]:
        raw_len = self.headers.get("Content-Length")
        if raw_len is None:
            raise ValueError("Missing Content-Length header")
        length = int(raw_len)
        if length < 0 or length > MAX_REMOTE_JOB_BYTES:
            raise ValueError(f"Payload size out of bounds (0..{MAX_REMOTE_JOB_BYTES} bytes)")
        raw = self.rfile.read(length)
        if len(raw) != length:
            raise ValueError("Incomplete request body")
        parsed = json.loads(raw.decode("utf-8"))
        if not isinstance(parsed, dict):
            raise ValueError("JSON body must be an object")
        return parsed

    def do_GET(self) -> None:  # noqa: N802
        if not self._require_auth():
            return
        route = urlparse(self.path).path

        if route == "/api/remote/health":
            caps, err = self.state.get_capabilities(verify_nvenc_runtime=False)
            active, total = self.state.job_counts()
            self._send_json(
                HTTPStatus.OK,
                {
                    "status": "ok",
                    "mode": "remote_render_node",
                    "version": __version__,
                    "ffmpeg_available": caps is not None,
                    "capabilities": caps.model_dump(mode="json") if caps else None,
                    "ffmpeg_error": err,
                    "active_jobs": active,
                    "total_jobs": total,
                },
            )
            return

        if route.startswith("/api/remote/jobs/"):
            tail = route[len("/api/remote/jobs/") :]
            if tail.endswith("/download"):
                job_id = tail[: -len("/download")]
                if not _JOB_ID_RE.fullmatch(job_id):
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Invalid job id"})
                    return
                job = self.state.get_job(job_id)
                out_path = self.state.get_job_output_path(job_id)
                if job is None or out_path is None:
                    self._send_json(HTTPStatus.NOT_FOUND, {"error": f"Unknown job: {job_id}"})
                    return
                if job.status != "completed" or not out_path.is_file():
                    self._send_json(
                        HTTPStatus.CONFLICT,
                        {"error": f"Job {job_id} is not ready for download (status={job.status})"},
                    )
                    return
                raw_bytes = out_path.read_bytes()
                safe_name = sanitize_download_filename(job.output_filename, "render", ".mp4")
                self._send_bytes(
                    HTTPStatus.OK,
                    "application/octet-stream",
                    raw_bytes,
                    extra_headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
                )
                return

            job_id = tail
            if not _JOB_ID_RE.fullmatch(job_id):
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Invalid job id"})
                return
            job = self.state.get_job(job_id)
            if job is None:
                self._send_json(HTTPStatus.NOT_FOUND, {"error": f"Unknown job: {job_id}"})
                return
            self._send_json(HTTPStatus.OK, job.model_dump(mode="json"))
            return

        self._send_json(HTTPStatus.NOT_FOUND, {"error": f"Unknown route: {route}"})

    def do_POST(self) -> None:  # noqa: N802
        if not self._require_auth():
            return
        route = urlparse(self.path).path
        if route != "/api/remote/jobs":
            self._send_json(HTTPStatus.NOT_FOUND, {"error": f"Unknown route: {route}"})
            return

        try:
            payload = self._read_json_body()
            req = RemoteRenderJobRequest.model_validate(payload)
            job = self.state.create_job(req)
            self._send_json(HTTPStatus.ACCEPTED, job.model_dump(mode="json"))
        except PathConfinementError as exc:
            self._send_json(HTTPStatus.FORBIDDEN, {"error": str(exc)})
        except FileNotFoundError as exc:
            self._send_json(HTTPStatus.NOT_FOUND, {"error": str(exc)})
        except (ValueError, ValidationError, TypeError, KeyError, json.JSONDecodeError) as exc:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
        except (RuntimeError, subprocess.SubprocessError, OSError) as exc:
            self._send_json(HTTPStatus.UNPROCESSABLE_ENTITY, {"error": str(exc)})


class RemoteRenderServer(ThreadingHTTPServer):
    """Multi-threaded HTTP server executing remote FFmpeg render jobs."""

    daemon_threads = True
    allow_reuse_address = True

    def __init__(
        self,
        server_address: tuple[str, int],
        workspace_root: Path,
        auth_token: str,
    ) -> None:
        self.state = RemoteRenderState(workspace_root=workspace_root, auth_token=auth_token)
        super().__init__(server_address, RemoteRenderHandler)


def create_remote_render_server(
    *,
    host: str = "127.0.0.1",
    port: int = 8742,
    workspace_dir: Path | None = None,
    auth_token: str | None = None,
) -> RemoteRenderServer:
    """Instantiate a configured RemoteRenderServer with mandatory Bearer token."""
    clean_host = host.strip()
    if not clean_host:
        raise ValueError("Host cannot be empty")
    if port < 0 or port > 65535:
        raise ValueError(f"Port must be in 0..65535, got {port}")
    token = auth_token.strip() if isinstance(auth_token, str) else ""
    if not token:
        token = secrets.token_urlsafe(24)
    workspace_root = resolve_workspace_root(workspace_dir)
    return RemoteRenderServer((clean_host, port), workspace_root=workspace_root, auth_token=token)


def serve_remote_render(
    *,
    host: str = "127.0.0.1",
    port: int = 8742,
    workspace_dir: Path | None = None,
    auth_token: str | None = None,
) -> int:
    """Run the blocking Remote Render Node HTTP server."""
    server = create_remote_render_server(
        host=host,
        port=port,
        workspace_dir=workspace_dir,
        auth_token=auth_token,
    )
    bound_host_raw, bound_port = server.server_address[0], server.server_address[1]
    bound_host = (
        bound_host_raw.decode("ascii")
        if isinstance(bound_host_raw, bytes)
        else str(bound_host_raw)
    )
    print(f"taktcut Remote Render Node listening on http://{bound_host}:{bound_port}")
    print(f"Workspace: {server.state.workspace_root}")
    print(f"Bearer token: {server.state.auth_token}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.shutdown()
        server.server_close()
    return 0


def _main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="taktcut-render-node",
        description="Start a taktcut Remote Render Node HTTP server.",
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8742)
    parser.add_argument("--workspace-dir", type=Path, default=None)
    parser.add_argument("--token", default=None)
    args = parser.parse_args(argv)
    return serve_remote_render(
        host=args.host,
        port=args.port,
        workspace_dir=args.workspace_dir,
        auth_token=args.token,
    )


if __name__ == "__main__":
    sys.exit(_main())
