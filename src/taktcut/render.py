"""Deterministic FFmpeg & NVENC render planning and execution."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from taktcut.color import REC709_FFMPEG_FLAGS, build_rec709_lut_filter
from taktcut.models import (
    HardwareCapabilities,
    RationalFrameRate,
    RenderPlan,
    RenderProfile,
    RenderResult,
)


def _test_nvenc_runtime(ffmpeg_bin: str, encoder: str) -> bool:
    """Verify whether an NVENC encoder initializes cleanly on the host GPU."""
    cmd = [
        ffmpeg_bin,
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=256x256:d=0.04:r=25",
        "-frames:v",
        "1",
        "-c:v",
        encoder,
        "-f",
        "null",
        "-",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    return proc.returncode == 0


def probe_hardware_capabilities(
    ffmpeg_bin: str = "ffmpeg",
    verify_nvenc_runtime: bool = True,
) -> HardwareCapabilities:
    """Inspect available FFmpeg video encoders with optional live NVENC runtime check."""
    resolved = shutil.which(ffmpeg_bin) or ffmpeg_bin
    proc = subprocess.run(
        [resolved, "-hide_banner", "-encoders"],
        capture_output=True,
        text=True,
        check=True,
    )
    out = proc.stdout
    has_h264_nvenc = "h264_nvenc" in out
    has_hevc_nvenc = "hevc_nvenc" in out
    if verify_nvenc_runtime:
        if has_h264_nvenc:
            has_h264_nvenc = _test_nvenc_runtime(resolved, "h264_nvenc")
        if has_hevc_nvenc:
            has_hevc_nvenc = _test_nvenc_runtime(resolved, "hevc_nvenc")

    return HardwareCapabilities(
        ffmpeg_path=resolved,
        h264_nvenc=has_h264_nvenc,
        hevc_nvenc=has_hevc_nvenc,
        libx264="libx264" in out,
        libx265="libx265" in out,
        prores_ks="prores_ks" in out,
    )


def select_encoder(
    profile: RenderProfile,
    caps: HardwareCapabilities,
    prefer_hw: bool = True,
) -> str:
    """Pick deterministic hardware or software fallback encoder for the profile."""
    if profile == RenderProfile.WEB_H264:
        if prefer_hw and caps.h264_nvenc:
            return "h264_nvenc"
        if caps.libx264:
            return "libx264"
        raise RuntimeError("Neither h264_nvenc nor libx264 is available in FFmpeg")

    if profile == RenderProfile.MASTER_HEVC:
        if prefer_hw and caps.hevc_nvenc:
            return "hevc_nvenc"
        if caps.libx265:
            return "libx265"
        raise RuntimeError("Neither hevc_nvenc nor libx265 is available in FFmpeg")

    if caps.prores_ks:
        return "prores_ks"
    return "prores"


def build_render_plan(
    input_path: Path,
    output_path: Path,
    profile: RenderProfile = RenderProfile.WEB_H264,
    fps: RationalFrameRate | None = None,
    lut_path: Path | None = None,
    fx_filtergraph: str | None = None,
    target_lufs: float | None = None,
    prefer_hw: bool = True,
    caps: HardwareCapabilities | None = None,
    ffmpeg_bin: str = "ffmpeg",
) -> RenderPlan:
    """Compile a deterministic FFmpeg command plan with CFR lock, GOP=2*fps, and Rec.709 tags."""
    hw = caps or probe_hardware_capabilities(ffmpeg_bin=ffmpeg_bin, verify_nvenc_runtime=prefer_hw)
    encoder = select_encoder(profile, hw, prefer_hw=prefer_hw)
    target_fps = fps or RationalFrameRate(num=25, den=1)
    gop = max(2, round(2 * target_fps.as_float))

    is_prores = profile == RenderProfile.PRORES_HQ
    pix_fmt = "yuv422p10le" if is_prores else "yuv420p"
    faststart = not is_prores

    vf_parts: list[str] = []
    if fx_filtergraph:
        vf_parts.append(fx_filtergraph)
    if lut_path is not None:
        vf_parts.append(build_rec709_lut_filter(lut_path, target_pix_fmt=pix_fmt))
    video_filter = ",".join(vf_parts) if vf_parts else None

    audio_filter: str | None = None
    if target_lufs is not None:
        lra = 11.0 if target_lufs >= -16.0 else 7.0
        audio_filter = f"loudnorm=I={target_lufs:.1f}:TP=-1.0:LRA={lra:.1f}"

    argv: list[str] = [
        hw.ffmpeg_path,
        "-hide_banner",
        "-y",
        "-i",
        str(input_path),
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
    ]

    if video_filter is not None:
        argv.extend(["-vf", video_filter])

    argv.extend(["-fps_mode", "cfr", "-r", target_fps.ffmpeg_rate])
    argv.extend(["-c:v", encoder])

    if encoder == "h264_nvenc":
        argv.extend(["-preset", "p5", "-rc", "vbr", "-cq", "18", "-b:v", "0"])
    elif encoder == "hevc_nvenc":
        argv.extend(["-preset", "p5", "-rc", "vbr", "-cq", "20", "-b:v", "0"])
    elif encoder == "libx264":
        argv.extend(["-preset", "medium", "-crf", "18"])
    elif encoder == "libx265":
        argv.extend(["-preset", "medium", "-crf", "20"])
    elif encoder == "prores_ks":
        argv.extend(["-profile:v", "3"])

    argv.extend(["-pix_fmt", pix_fmt, "-g", str(gop)])
    argv.extend(REC709_FFMPEG_FLAGS)

    if audio_filter is not None:
        argv.extend(["-af", audio_filter])

    if is_prores:
        argv.extend(["-c:a", "pcm_s24le", "-ar", "48000"])
    else:
        argv.extend(["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"])

    if faststart:
        argv.extend(["-movflags", "+faststart"])

    argv.append(str(output_path))

    return RenderPlan(
        input_path=str(input_path),
        output_path=str(output_path),
        profile=profile,
        encoder=encoder,
        fps=target_fps,
        gop_frames=gop,
        pix_fmt=pix_fmt,
        faststart=faststart,
        target_lufs=target_lufs,
        lut_path=str(lut_path) if lut_path is not None else None,
        video_filter=video_filter,
        audio_filter=audio_filter,
        argv=argv,
    )


def execute_render_plan(plan: RenderPlan) -> RenderResult:
    """Execute a compiled RenderPlan via FFmpeg and verify output integrity."""
    out_file = Path(plan.output_path)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    proc = subprocess.run(plan.argv, capture_output=True, text=True, check=False)
    bytes_written = out_file.stat().st_size if out_file.exists() else 0
    tail = "\n".join(proc.stderr.splitlines()[-15:]) if proc.stderr else ""
    success = proc.returncode == 0 and bytes_written > 0
    return RenderResult(
        success=success,
        output_path=plan.output_path,
        encoder=plan.encoder,
        bytes_written=bytes_written,
        returncode=proc.returncode,
        stderr_tail=tail,
    )
