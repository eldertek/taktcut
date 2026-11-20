"""Broadcast QA gate: ffprobe audit, MP4 faststart check, EBU R128, and frame sampling."""

from __future__ import annotations

import json
import re
import shutil
import struct
import subprocess
from fractions import Fraction
from pathlib import Path
from typing import Any

from taktcut.models import FrameSample, LoudnessReport, QaReport, StreamProbe

_I_RE = re.compile(r"I:\s+([-+]?\d+(?:\.\d+)?)\s+LUFS")
_LRA_RE = re.compile(r"LRA:\s+([-+]?\d+(?:\.\d+)?)\s+LU")
_PEAK_RE = re.compile(r"True peak:\s+Peak:\s+([-+]?\d+(?:\.\d+)?)\s+dBFS")
_YAVG_RE = re.compile(r"lavfi\.signalstats\.YAVG=([-+]?\d+(?:\.\d+)?)")
_YMIN_RE = re.compile(r"lavfi\.signalstats\.YMIN=(\d+)")
_YMAX_RE = re.compile(r"lavfi\.signalstats\.YMAX=(\d+)")


def check_mp4_faststart(path: Path) -> bool | None:
    """Return True if 'moov' atom precedes 'mdat' in an MP4/MOV file, None if not applicable."""
    if path.suffix.lower() not in {".mp4", ".mov", ".m4v"}:
        return None
    moov_pos: int | None = None
    mdat_pos: int | None = None
    with path.open("rb") as fh:
        while True:
            offset = fh.tell()
            header = fh.read(8)
            if len(header) < 8:
                break
            size32, box_type = struct.unpack(">I4s", header)
            if size32 == 1:
                ext = fh.read(8)
                if len(ext) < 8:
                    break
                box_size = struct.unpack(">Q", ext)[0]
            elif size32 == 0:
                box_size = 0
            else:
                box_size = size32

            if box_type == b"moov" and moov_pos is None:
                moov_pos = offset
            elif box_type == b"mdat" and mdat_pos is None:
                mdat_pos = offset

            if moov_pos is not None and mdat_pos is not None:
                return moov_pos < mdat_pos
            if box_size < 8:
                break
            fh.seek(offset + box_size)

    if moov_pos is not None and mdat_pos is None:
        return True
    return False if (moov_pos is not None or mdat_pos is not None) else None


def _parse_rate_fraction(raw: str) -> Fraction | None:
    if not raw or raw == "0/0":
        return None
    if "/" in raw:
        n_s, d_s = raw.split("/", 1)
        den = int(d_s)
        return Fraction(int(n_s), den) if den != 0 else None
    return Fraction(raw)


def probe_media(path: Path, ffprobe_bin: str = "ffprobe") -> StreamProbe:
    """Inspect video/audio streams, CFR lock, color tags, and container parity via ffprobe."""
    resolved = shutil.which(ffprobe_bin) or ffprobe_bin
    cmd = [
        resolved,
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        str(path),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
    data: dict[str, Any] = json.loads(proc.stdout)
    fmt: dict[str, Any] = data.get("format", {})
    streams: list[dict[str, Any]] = data.get("streams", [])

    v_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    a_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)

    container_dur = float(fmt.get("duration", 0.0) or 0.0)
    video_dur = float(v_stream.get("duration", container_dur) or 0.0) if v_stream else 0.0

    r_rate_s = str(v_stream.get("r_frame_rate", "")) if v_stream else ""
    avg_rate_s = str(v_stream.get("avg_frame_rate", "")) if v_stream else ""
    r_frac = _parse_rate_fraction(r_rate_s)
    avg_frac = _parse_rate_fraction(avg_rate_s)
    is_cfr = False
    if r_frac is not None and avg_frac is not None and r_frac > 0:
        is_cfr = abs(float(r_frac) - float(avg_frac)) < 0.05

    return StreamProbe(
        path=str(path),
        format_name=str(fmt.get("format_name", "")),
        container_duration_s=container_dur,
        video_codec=str(v_stream.get("codec_name", "")) if v_stream else "",
        width=int(v_stream.get("width", 0)) if v_stream else 0,
        height=int(v_stream.get("height", 0)) if v_stream else 0,
        pix_fmt=str(v_stream.get("pix_fmt", "")) if v_stream else "",
        r_frame_rate=r_rate_s,
        avg_frame_rate=avg_rate_s,
        is_cfr=is_cfr,
        video_duration_s=video_dur,
        duration_delta_s=abs(container_dur - video_dur),
        color_space=str(v_stream.get("color_space", "")) if v_stream else "",
        color_primaries=str(v_stream.get("color_primaries", "")) if v_stream else "",
        color_transfer=str(v_stream.get("color_transfer", "")) if v_stream else "",
        color_range=str(v_stream.get("color_range", "")) if v_stream else "",
        audio_codec=str(a_stream.get("codec_name", "")) if a_stream else "",
        audio_sample_rate=int(a_stream.get("sample_rate", 0)) if a_stream else 0,
        audio_channels=int(a_stream.get("channels", 0)) if a_stream else 0,
        has_faststart=check_mp4_faststart(path),
    )


def audit_loudness(
    path: Path,
    target_lufs: float = -14.0,
    tolerance_lu: float = 1.5,
    max_true_peak_dbtp: float = -1.0,
    ffmpeg_bin: str = "ffmpeg",
) -> LoudnessReport:
    """Run FFmpeg EBU R128 loudness & true-peak audit."""
    resolved = shutil.which(ffmpeg_bin) or ffmpeg_bin
    cmd = [
        resolved,
        "-hide_banner",
        "-nostats",
        "-i",
        str(path),
        "-vn",
        "-af",
        "ebur128=peak=true",
        "-f",
        "null",
        "-",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    stderr = proc.stderr
    if "Summary:" not in stderr:
        raise RuntimeError(f"FFmpeg ebur128 summary missing for {path}: {stderr[-300:]}")

    summary = stderr.rsplit("Summary:", 1)[-1]
    i_match = _I_RE.search(summary)
    lra_match = _LRA_RE.search(summary)
    peak_match = _PEAK_RE.search(summary)
    if not (i_match and lra_match and peak_match):
        raise RuntimeError(f"Unable to parse ebur128 summary block:\n{summary}")

    integrated = float(i_match.group(1))
    lra = float(lra_match.group(1))
    true_peak = float(peak_match.group(1))

    passed = (
        abs(integrated - target_lufs) <= tolerance_lu
        and true_peak <= max_true_peak_dbtp
    )
    return LoudnessReport(
        path=str(path),
        integrated_lufs=integrated,
        lra_lu=lra,
        true_peak_dbtp=true_peak,
        target_lufs=target_lufs,
        tolerance_lu=tolerance_lu,
        max_true_peak_dbtp=max_true_peak_dbtp,
        passed=passed,
    )


def sample_frame_stats(
    path: Path,
    duration_s: float,
    ffmpeg_bin: str = "ffmpeg",
) -> list[FrameSample]:
    """Verify video frame readability and luminance at start, midpoint, and near-end."""
    resolved = shutil.which(ffmpeg_bin) or ffmpeg_bin
    if duration_s <= 0.2:
        timestamps = [0.0]
    else:
        timestamps = [
            0.0,
            round(duration_s * 0.5, 3),
            round(max(0.05, duration_s - 0.1), 3),
        ]

    samples: list[FrameSample] = []
    for ts in timestamps:
        cmd = [
            resolved,
            "-hide_banner",
            "-ss",
            str(ts),
            "-i",
            str(path),
            "-frames:v",
            "1",
            "-vf",
            "signalstats,metadata=mode=print:file=-",
            "-f",
            "null",
            "-",
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
        text = proc.stdout + "\n" + proc.stderr
        yavg_m = _YAVG_RE.search(text)
        ymin_m = _YMIN_RE.search(text)
        ymax_m = _YMAX_RE.search(text)
        if proc.returncode == 0 and yavg_m:
            samples.append(
                FrameSample(
                    timestamp_s=ts,
                    y_avg=float(yavg_m.group(1)),
                    y_min=int(ymin_m.group(1)) if ymin_m else 0,
                    y_max=int(ymax_m.group(1)) if ymax_m else 0,
                )
            )
    return samples


def run_qa_gate(
    path: Path,
    target_lufs: float = -14.0,
    tolerance_lu: float = 1.5,
    max_true_peak_dbtp: float = -1.0,
    require_faststart: bool = True,
    ffmpeg_bin: str = "ffmpeg",
    ffprobe_bin: str = "ffprobe",
) -> QaReport:
    """Execute complete broadcast verification gate (probe + loudness + multi-timestamp frames)."""
    probe = probe_media(path, ffprobe_bin=ffprobe_bin)
    failures: list[str] = []

    if not probe.video_codec:
        failures.append("No video stream detected")
    elif not probe.is_cfr:
        failures.append(
            f"Variable frame rate detected (r={probe.r_frame_rate}, avg={probe.avg_frame_rate})"
        )

    if require_faststart and probe.has_faststart is False:
        failures.append("MP4 moov atom is not placed before mdat (+faststart missing)")

    loudness: LoudnessReport | None = None
    if probe.audio_codec:
        loudness = audit_loudness(
            path,
            target_lufs=target_lufs,
            tolerance_lu=tolerance_lu,
            max_true_peak_dbtp=max_true_peak_dbtp,
            ffmpeg_bin=ffmpeg_bin,
        )
        if not loudness.passed:
            failures.append(
                f"Loudness failed: I={loudness.integrated_lufs} LUFS "
                f"(target {target_lufs} +/- {tolerance_lu}), "
                f"TruePeak={loudness.true_peak_dbtp} dBTP (max {max_true_peak_dbtp})"
            )

    samples = sample_frame_stats(
        path,
        duration_s=probe.video_duration_s or probe.container_duration_s,
        ffmpeg_bin=ffmpeg_bin,
    )
    if probe.video_codec and len(samples) == 0:
        failures.append("Failed to decode frame signalstats at start/mid/end")

    return QaReport(
        path=str(path),
        probe=probe,
        loudness=loudness,
        frame_samples=samples,
        passed=len(failures) == 0,
        failures=failures,
    )
