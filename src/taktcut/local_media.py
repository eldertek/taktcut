"""Local media import, ffprobe metadata, thumbnail and audio peak extraction for taktcut."""

from __future__ import annotations

import array
import contextlib
import hashlib
import json
import math
import mimetypes
import os
import shutil
import subprocess
from collections.abc import Sequence
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field

from taktcut.security import AUDIO_SUFFIXES, IMAGE_SUFFIXES, MEDIA_SUFFIXES, VIDEO_SUFFIXES

MediaKind = Literal["video", "audio", "image"]

_MIME_FALLBACKS: dict[str, str] = {
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
    ".mxf": "application/mxf",
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".aac": "audio/aac",
    ".m4a": "audio/mp4",
    ".flac": "audio/flac",
    ".ogg": "audio/ogg",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
}


class LocalMediaAsset(BaseModel):
    """Probed local media asset registered in the taktcut studio Media Pool."""

    media_id: str
    name: str
    path: str
    rel_path: str = ""
    kind: MediaKind
    mime_type: str
    file_size: int = Field(ge=0)
    width: int = Field(default=0, ge=0)
    height: int = Field(default=0, ge=0)
    fps_num: int = Field(default=25, ge=1)
    fps_den: int = Field(default=1, ge=1)
    duration_s: float = Field(default=5.0, ge=0.0)
    duration_frames: int = Field(default=125, ge=1)
    has_video: bool = False
    has_audio: bool = False
    audio_channels: int = Field(default=0, ge=0)
    sample_rate: int = Field(default=0, ge=0)
    video_codec: str = ""
    audio_codec: str = ""
    stream_url: str = ""
    thumb_url: str = ""
    peaks_url: str = ""
    peaks: list[float] = Field(default_factory=list)


def guess_media_mime(path: Path) -> str:
    """Return a browser-friendly MIME type for a local media file."""
    ext = path.suffix.lower()
    if ext in _MIME_FALLBACKS:
        return _MIME_FALLBACKS[ext]
    guessed, _ = mimetypes.guess_type(str(path))
    return guessed or "application/octet-stream"


def media_cache_key(path: Path) -> str:
    """Build a stable short cache identifier from resolved path, mtime and size."""
    resolved = os.path.realpath(path)
    try:
        st = os.stat(resolved)
        sig = f"{resolved}|{st.st_size}|{st.st_mtime_ns}"
    except OSError:
        sig = resolved
    return hashlib.sha256(sig.encode("utf-8", errors="ignore")).hexdigest()[:16]


def _parse_rate(raw: str | None) -> tuple[int, int]:
    if not raw or raw in {"0/0", "N/A"}:
        return (25, 1)
    if "/" in raw:
        num_s, den_s = raw.split("/", 1)
        try:
            n = int(num_s)
            d = int(den_s)
            if n > 0 and d > 0:
                return (n, d)
        except ValueError:
            return (25, 1)
    try:
        val = float(raw)
        if math.isfinite(val) and val > 0:
            return (max(1, round(val * 1000)), 1000)
    except ValueError:
        pass
    return (25, 1)


def _find_tool(name: str) -> str:
    found = shutil.which(name)
    return found or name


def probe_local_media(
    path: Path,
    *,
    workspace_root: Path | None = None,
    default_image_duration_s: float = 5.0,
) -> LocalMediaAsset:
    """Probe a local video, audio, or image file via ffprobe into a LocalMediaAsset."""
    resolved = Path(os.path.realpath(path))
    if not resolved.is_file():
        raise FileNotFoundError(f"Media file not found: {path}")
    ext = resolved.suffix.lower()
    if ext not in MEDIA_SUFFIXES:
        raise ValueError(f"Unsupported media extension {ext!r} for {resolved.name}")

    media_id = media_cache_key(resolved)
    file_size = resolved.stat().st_size
    rel_path = ""
    if workspace_root is not None:
        root_real = Path(os.path.realpath(workspace_root))
        try:
            rel_path = resolved.relative_to(root_real).as_posix()
        except ValueError:
            rel_path = resolved.as_posix()
    else:
        rel_path = resolved.as_posix()

    kind: MediaKind
    if ext in IMAGE_SUFFIXES:
        kind = "image"
    elif ext in AUDIO_SUFFIXES:
        kind = "audio"
    else:
        kind = "video"

    width = 0
    height = 0
    fps_num, fps_den = (25, 1)
    duration_s = default_image_duration_s if kind == "image" else 0.0
    has_video = kind in ("video", "image")
    has_audio = kind == "audio"
    audio_channels = 0
    sample_rate = 0
    video_codec = ""
    audio_codec = ""

    ffprobe_bin = _find_tool("ffprobe")
    try:
        proc = subprocess.run(
            [
                ffprobe_bin,
                "-v",
                "error",
                "-print_format",
                "json",
                "-show_format",
                "-show_streams",
                str(resolved),
            ],
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )
        if proc.returncode == 0 and proc.stdout.strip():
            data = json.loads(proc.stdout)
            fmt = data.get("format") or {}
            streams = data.get("streams") or []
            raw_dur = fmt.get("duration")
            if raw_dur not in (None, "N/A") and kind != "image":
                try:
                    parsed = float(raw_dur)
                    if math.isfinite(parsed) and parsed > 0:
                        duration_s = parsed
                except ValueError:
                    pass
            has_video = False
            has_audio = False
            for st in streams:
                ctype = st.get("codec_type")
                if ctype == "video" and not has_video:
                    has_video = True
                    width = int(st.get("width") or 0)
                    height = int(st.get("height") or 0)
                    video_codec = str(st.get("codec_name") or "")
                    if kind != "image":
                        rate_raw = st.get("avg_frame_rate") or st.get("r_frame_rate")
                        fps_num, fps_den = _parse_rate(
                            str(rate_raw) if rate_raw else None
                        )
                        if duration_s <= 0 and st.get("duration") not in (None, "N/A"):
                            try:
                                sd = float(st["duration"])
                                if math.isfinite(sd) and sd > 0:
                                    duration_s = sd
                            except ValueError:
                                pass
                elif ctype == "audio" and not has_audio:
                    has_audio = True
                    audio_channels = int(st.get("channels") or 2)
                    sample_rate = int(st.get("sample_rate") or 48000)
                    audio_codec = str(st.get("codec_name") or "")
                    if duration_s <= 0 and st.get("duration") not in (None, "N/A"):
                        try:
                            sd = float(st["duration"])
                            if math.isfinite(sd) and sd > 0:
                                duration_s = sd
                        except ValueError:
                            pass
            if ext in IMAGE_SUFFIXES:
                kind = "image"
                duration_s = default_image_duration_s
            elif has_video and ext in VIDEO_SUFFIXES:
                kind = "video"
            elif has_audio and not has_video:
                kind = "audio"
    except (OSError, subprocess.SubprocessError, ValueError):
        pass

    if duration_s <= 0:
        duration_s = default_image_duration_s
    fps_val = fps_num / max(1, fps_den)
    duration_frames = max(1, round(duration_s * fps_val))

    return LocalMediaAsset(
        media_id=media_id,
        name=resolved.name,
        path=resolved.as_posix(),
        rel_path=rel_path,
        kind=kind,
        mime_type=guess_media_mime(resolved),
        file_size=file_size,
        width=width,
        height=height,
        fps_num=fps_num,
        fps_den=fps_den,
        duration_s=round(duration_s, 4),
        duration_frames=duration_frames,
        has_video=has_video,
        has_audio=has_audio,
        audio_channels=audio_channels,
        sample_rate=sample_rate,
        video_codec=video_codec,
        audio_codec=audio_codec,
        stream_url=f"/api/media/stream?id={media_id}",
        thumb_url=f"/api/media/thumb?id={media_id}" if has_video else "",
        peaks_url=f"/api/media/peaks?id={media_id}" if has_audio else "",
    )


def ensure_media_thumbnail(
    asset: LocalMediaAsset,
    cache_dir: Path,
    *,
    width: int = 320,
) -> Path | None:
    """Create or return a cached JPEG thumbnail for a video or image asset."""
    if not asset.has_video:
        return None
    cache_dir.mkdir(parents=True, exist_ok=True)
    out_jpg = cache_dir / f"{asset.media_id}_thumb.jpg"
    if out_jpg.is_file() and out_jpg.stat().st_size > 200:
        return out_jpg

    ffmpeg_bin = _find_tool("ffmpeg")
    seek_s = min(1.0, asset.duration_s * 0.2) if asset.kind == "video" else 0.0
    cmd = [ffmpeg_bin, "-y", "-v", "error"]
    if asset.kind == "video" and seek_s > 0.05:
        cmd.extend(["-ss", f"{seek_s:.2f}"])
    cmd.extend(
        [
            "-i",
            asset.path,
            "-frames:v",
            "1",
            "-vf",
            f"scale={width}:-2:force_original_aspect_ratio=decrease",
            "-q:v",
            "4",
            str(out_jpg),
        ]
    )
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=25, check=False)
    if proc.returncode == 0 and out_jpg.is_file() and out_jpg.stat().st_size > 100:
        return out_jpg
    # Retry at t=0 for very short clips
    if seek_s > 0.05:
        cmd_retry = [
            ffmpeg_bin,
            "-y",
            "-v",
            "error",
            "-i",
            asset.path,
            "-frames:v",
            "1",
            "-vf",
            f"scale={width}:-2:force_original_aspect_ratio=decrease",
            "-q:v",
            "4",
            str(out_jpg),
        ]
        proc2 = subprocess.run(
            cmd_retry, capture_output=True, text=True, timeout=25, check=False
        )
        if proc2.returncode == 0 and out_jpg.is_file() and out_jpg.stat().st_size > 100:
            return out_jpg
    return None


def extract_audio_peaks(
    asset: LocalMediaAsset,
    cache_dir: Path,
    *,
    num_bins: int = 160,
) -> list[float]:
    """Compute normalized audio waveform peak envelopes [0..1] via FFmpeg PCM pipe."""
    if not asset.has_audio:
        return []
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / f"{asset.media_id}_peaks_{num_bins}.json"
    if cache_file.is_file():
        try:
            loaded = json.loads(cache_file.read_text(encoding="utf-8"))
            if isinstance(loaded, list) and len(loaded) > 0:
                return [float(x) for x in loaded]
        except (OSError, ValueError):
            pass

    ffmpeg_bin = _find_tool("ffmpeg")
    cmd = [
        ffmpeg_bin,
        "-v",
        "error",
        "-i",
        asset.path,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "4000",
        "-f",
        "s16le",
        "-t",
        "300",
        "pipe:1",
    ]
    proc = subprocess.run(cmd, capture_output=True, timeout=30, check=False)
    if proc.returncode != 0 or len(proc.stdout) < 4:
        return [0.15] * min(num_bins, 32)

    raw_bytes = proc.stdout[: len(proc.stdout) - (len(proc.stdout) % 2)]
    samples = array.array("h")
    samples.frombytes(raw_bytes)
    n = len(samples)
    if n == 0:
        return [0.1] * min(num_bins, 32)

    bins = max(8, min(512, int(num_bins)))
    step = max(1, n // bins)
    peaks: list[float] = []
    max_amp = 1.0
    for idx in range(bins):
        start = idx * step
        end = n if idx == bins - 1 else min(n, start + step)
        if start >= n:
            peaks.append(0.0)
            continue
        seg = samples[start:end]
        pk = max((abs(v) for v in seg), default=0) / 32768.0
        peaks.append(pk)
        if pk > max_amp:
            max_amp = pk

    norm = [round(min(1.0, p / max(0.05, max_amp)), 4) for p in peaks]
    with contextlib.suppress(OSError):
        cache_file.write_text(json.dumps(norm), encoding="utf-8")
    return norm


class LocalMediaRegistry:
    """In-memory registry of imported local media assets for the running studio."""

    def __init__(self, cache_dir: Path) -> None:
        self._cache_dir = cache_dir
        self._by_id: dict[str, LocalMediaAsset] = {}
        self._by_path: dict[str, str] = {}

    @property
    def cache_dir(self) -> Path:
        return self._cache_dir

    def register_file(
        self,
        path: Path,
        *,
        workspace_root: Path | None = None,
        generate_thumb: bool = True,
        generate_peaks: bool = True,
    ) -> LocalMediaAsset:
        asset = probe_local_media(path, workspace_root=workspace_root)
        if generate_thumb and asset.has_video:
            ensure_media_thumbnail(asset, self._cache_dir)
        if generate_peaks and asset.has_audio:
            asset.peaks = extract_audio_peaks(asset, self._cache_dir, num_bins=120)
        self._by_id[asset.media_id] = asset
        self._by_path[os.path.realpath(path)] = asset.media_id
        self._by_path[asset.path] = asset.media_id
        if asset.rel_path:
            self._by_path[asset.rel_path] = asset.media_id
        return asset

    def register_paths(
        self,
        paths: Sequence[Path],
        *,
        workspace_root: Path | None = None,
    ) -> list[LocalMediaAsset]:
        out: list[LocalMediaAsset] = []
        for raw_p in paths:
            p = Path(raw_p)
            if p.is_dir():
                for child in sorted(p.rglob("*")):
                    if child.is_file() and child.suffix.lower() in MEDIA_SUFFIXES:
                        out.append(
                            self.register_file(child, workspace_root=workspace_root)
                        )
            elif p.is_file() and p.suffix.lower() in MEDIA_SUFFIXES:
                out.append(self.register_file(p, workspace_root=workspace_root))
        return out

    def get_by_id(self, media_id: str) -> LocalMediaAsset | None:
        return self._by_id.get(media_id)

    def get_by_path(self, raw_path: str) -> LocalMediaAsset | None:
        mid = self._by_path.get(raw_path) or self._by_path.get(
            os.path.realpath(raw_path)
        )
        return self._by_id.get(mid) if mid else None

    def list_assets(self) -> list[LocalMediaAsset]:
        return list(self._by_id.values())

    def to_media_map(self) -> dict[str, dict[str, Any]]:
        """Return a media_engine.js compatible map keyed by path and rel_path."""
        out: dict[str, dict[str, Any]] = {}
        for asset in self._by_id.values():
            entry: dict[str, Any] = {
                "media_id": asset.media_id,
                "name": asset.name,
                "kind": asset.kind,
                "url": asset.stream_url.lstrip("/"),
                "thumb": asset.thumb_url.lstrip("/") if asset.thumb_url else "",
                "peaks_url": asset.peaks_url.lstrip("/") if asset.peaks_url else "",
                "peaks": asset.peaks,
                "width": asset.width,
                "height": asset.height,
                "fps": round(asset.fps_num / max(1, asset.fps_den), 4),
                "duration_s": asset.duration_s,
                "duration_frames": asset.duration_frames,
                "has_video": asset.has_video,
                "has_audio": asset.has_audio,
                "audio_channels": asset.audio_channels,
                "sample_rate": asset.sample_rate,
                "path": asset.path,
                "rel_path": asset.rel_path,
            }
            out[asset.path] = entry
            if asset.rel_path:
                out[asset.rel_path] = entry
        return out
