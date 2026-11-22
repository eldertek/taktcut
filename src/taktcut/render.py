"""Deterministic FFmpeg & NVENC render planning and execution."""

from __future__ import annotations

import json
import math
import shutil
import subprocess
from pathlib import Path
from typing import Any

from pydantic import BaseModel, field_validator

from taktcut.color import (
    REC709_FFMPEG_FLAGS,
    ColorGradeParams,
    build_rec709_lut_filter,
    compile_color_grade_filter,
)
from taktcut.models import (
    HardwareCapabilities,
    RationalFrameRate,
    RenderPlan,
    RenderProfile,
    RenderResult,
)
from taktcut.titles import TitleOverlayParams, compile_title_filter

AUDIO_GAIN_DB_MIN: float = -24.0
AUDIO_GAIN_DB_MAX: float = 12.0
AUDIO_FADE_S_MIN: float = 0.0
AUDIO_FADE_S_MAX: float = 5.0
RETIME_SPEED_MIN: float = 0.25
RETIME_SPEED_MAX: float = 4.0
CLIP_DURATION_MAX_S: float = 86400.0
TARGET_LUFS_MIN: float = -70.0
TARGET_LUFS_MAX: float = -5.0


def _validate_bounded_float(
    raw: Any,
    field_name: str,
    min_val: float,
    max_val: float,
    *,
    strict_gt_min: bool = False,
) -> float:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raise ValueError(f"{field_name} must be a finite number, got {raw!r}")
    val = float(raw)
    if not math.isfinite(val):
        raise ValueError(f"{field_name} must be finite, got {raw!r}")
    if strict_gt_min:
        if val <= min_val or val > max_val:
            raise ValueError(
                f"{field_name} must be within ({min_val}, {max_val}], got {val}"
            )
    elif val < min_val or val > max_val:
        raise ValueError(
            f"{field_name} must be within [{min_val}, {max_val}], got {val}"
        )
    return val


class ClipAudioParams(BaseModel):
    """Per-clip audio gain and fade-in/out parameters with strict numeric bounds."""

    gain_db: float = 0.0
    fade_in_s: float = 0.0
    fade_out_s: float = 0.0
    muted: bool = False

    @field_validator("gain_db", mode="before")
    @classmethod
    def _validate_gain_db(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "gain_db", AUDIO_GAIN_DB_MIN, AUDIO_GAIN_DB_MAX)

    @field_validator("fade_in_s", mode="before")
    @classmethod
    def _validate_fade_in_s(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "fade_in_s", AUDIO_FADE_S_MIN, AUDIO_FADE_S_MAX)

    @field_validator("fade_out_s", mode="before")
    @classmethod
    def _validate_fade_out_s(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "fade_out_s", AUDIO_FADE_S_MIN, AUDIO_FADE_S_MAX)

    def is_identity(self) -> bool:
        """Return True when gain is 0 dB, fades are 0 s, and track is unmuted."""
        return (
            not self.muted
            and math.isclose(self.gain_db, 0.0, abs_tol=1e-6)
            and math.isclose(self.fade_in_s, 0.0, abs_tol=1e-6)
            and math.isclose(self.fade_out_s, 0.0, abs_tol=1e-6)
        )


class AudioCompileResult(BaseModel):
    """Compiled FFmpeg audio filtergraph and validated clip audio parameters."""

    filtergraph: str
    ffmpeg_af_args: list[str]
    is_identity: bool
    params: ClipAudioParams


def compile_audio_filter(
    params: ClipAudioParams,
    *,
    clip_duration_s: float | None = None,
) -> str | None:
    """Compile validated clip gain, fade-in, fade-out, and mute into an FFmpeg -af filter."""
    validated_dur: float | None = None
    if clip_duration_s is not None:
        validated_dur = _validate_bounded_float(
            clip_duration_s,
            "clip_duration_s",
            0.0,
            CLIP_DURATION_MAX_S,
            strict_gt_min=True,
        )

    if params.muted:
        return "volume=0"

    parts: list[str] = []
    if not math.isclose(params.gain_db, 0.0, abs_tol=1e-6):
        parts.append(f"volume={params.gain_db:.2f}dB")

    if params.fade_in_s > 1e-6:
        fade_in_d = (
            min(params.fade_in_s, validated_dur)
            if validated_dur is not None
            else params.fade_in_s
        )
        if fade_in_d > 1e-6:
            parts.append(f"afade=t=in:st=0.000:d={fade_in_d:.3f}")

    if params.fade_out_s > 1e-6:
        if validated_dur is None:
            raise ValueError("clip_duration_s must be provided when fade_out_s > 0")
        fade_out_d = min(params.fade_out_s, validated_dur)
        fade_out_st = max(0.0, validated_dur - fade_out_d)
        if fade_out_d > 1e-6:
            parts.append(f"afade=t=out:st={fade_out_st:.3f}:d={fade_out_d:.3f}")

    return ",".join(parts) if parts else None


def compile_audio_filter_result(
    params: ClipAudioParams,
    *,
    clip_duration_s: float | None = None,
    target_lufs: float | None = None,
) -> AudioCompileResult:
    """Compile clip audio controls and optional loudnorm into an AudioCompileResult."""
    af_parts: list[str] = []
    clip_af = compile_audio_filter(params, clip_duration_s=clip_duration_s)
    if clip_af is not None:
        af_parts.append(clip_af)
    if target_lufs is not None and not params.muted:
        validated_lufs = _validate_bounded_float(
            target_lufs,
            "target_lufs",
            TARGET_LUFS_MIN,
            TARGET_LUFS_MAX,
        )
        lra = 11.0 if validated_lufs >= -16.0 else 7.0
        af_parts.append(f"loudnorm=I={validated_lufs:.1f}:TP=-1.0:LRA={lra:.1f}")
    fg = ",".join(af_parts)
    return AudioCompileResult(
        filtergraph=fg,
        ffmpeg_af_args=["-af", fg] if fg else [],
        is_identity=(fg == ""),
        params=params,
    )


class ClipRetimeParams(BaseModel):
    """Per-clip speed multiplier (0.25x..4.0x) and reverse direction parameters."""

    speed_rate: float = 1.0
    reverse: bool = False

    @field_validator("speed_rate", mode="before")
    @classmethod
    def _validate_speed_rate(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "speed_rate", RETIME_SPEED_MIN, RETIME_SPEED_MAX)

    def is_identity(self) -> bool:
        """Return True when speed_rate is 1.0x and reverse is False."""
        return not self.reverse and math.isclose(self.speed_rate, 1.0, abs_tol=1e-6)


class RetimeCompileResult(BaseModel):
    """Compiled FFmpeg video and audio filtergraphs for clip retime."""

    video_filtergraph: str
    audio_filtergraph: str
    ffmpeg_vf_args: list[str]
    ffmpeg_af_args: list[str]
    is_identity: bool
    params: ClipRetimeParams


def build_atempo_stages(speed_rate: float) -> list[float]:
    """Decompose speed_rate in [0.25, 4.0] into safe FFmpeg atempo stages within [0.5, 2.0]."""
    rate = _validate_bounded_float(speed_rate, "speed_rate", RETIME_SPEED_MIN, RETIME_SPEED_MAX)
    if math.isclose(rate, 1.0, abs_tol=1e-6):
        return []
    stages: list[float] = []
    rem = rate
    if rem < 1.0:
        while rem < 0.5 - 1e-9:
            stages.append(0.5)
            rem /= 0.5
        if not math.isclose(rem, 1.0, abs_tol=1e-6):
            stages.append(rem)
    else:
        while rem > 2.0 + 1e-9:
            stages.append(2.0)
            rem /= 2.0
        if not math.isclose(rem, 1.0, abs_tol=1e-6):
            stages.append(rem)
    return stages


def compile_retime_filter(params: ClipRetimeParams) -> tuple[str | None, str | None]:
    """Compile validated clip speed_rate and reverse into FFmpeg (vf, af) filter strings."""
    if params.is_identity():
        return (None, None)

    vf_parts: list[str] = []
    af_parts: list[str] = []

    if not math.isclose(params.speed_rate, 1.0, abs_tol=1e-6):
        pts_scale = 1.0 / params.speed_rate
        vf_parts.append(f"setpts={pts_scale:.6f}*PTS")
        for stage in build_atempo_stages(params.speed_rate):
            af_parts.append(f"atempo={stage:.4f}")

    if params.reverse:
        vf_parts.append("reverse")
        af_parts.append("areverse")

    return (
        ",".join(vf_parts) if vf_parts else None,
        ",".join(af_parts) if af_parts else None,
    )


def compile_retime_filter_result(params: ClipRetimeParams) -> RetimeCompileResult:
    """Compile clip retime parameters into structured video/audio filtergraphs and argv slices."""
    vf, af = compile_retime_filter(params)
    vf_str = vf or ""
    af_str = af or ""
    return RetimeCompileResult(
        video_filtergraph=vf_str,
        audio_filtergraph=af_str,
        ffmpeg_vf_args=["-vf", vf_str] if vf_str else [],
        ffmpeg_af_args=["-af", af_str] if af_str else [],
        is_identity=params.is_identity(),
        params=params,
    )


def _probe_media_duration_s(media_path: Path) -> float | None:
    """Best-effort ffprobe container duration lookup for real files."""
    ffprobe_bin = shutil.which("ffprobe")
    if ffprobe_bin is None or not media_path.is_file():
        return None
    proc = subprocess.run(
        [
            ffprobe_bin,
            "-hide_banner",
            "-loglevel",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            str(media_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        return None
    try:
        payload = json.loads(proc.stdout)
        dur = float(payload["format"]["duration"])
        return dur if math.isfinite(dur) and dur > 0.0 else None
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        return None


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
    color_grade: ColorGradeParams | None = None,
    fx_filtergraph: str | None = None,
    title_overlay: TitleOverlayParams | None = None,
    audio_params: ClipAudioParams | None = None,
    retime_params: ClipRetimeParams | None = None,
    clip_duration_s: float | None = None,
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

    retime_vf: str | None = None
    retime_af: str | None = None
    if retime_params is not None and not retime_params.is_identity():
        retime_vf, retime_af = compile_retime_filter(retime_params)

    vf_parts: list[str] = []
    if retime_vf is not None:
        vf_parts.append(retime_vf)
    if fx_filtergraph:
        vf_parts.append(fx_filtergraph)
    if color_grade is not None and not color_grade.is_identity():
        vf_parts.append(compile_color_grade_filter(color_grade, pix_fmt=pix_fmt))
    if lut_path is not None:
        vf_parts.append(build_rec709_lut_filter(lut_path, target_pix_fmt=pix_fmt))
    if title_overlay is not None and title_overlay.is_active():
        title_fg = compile_title_filter(title_overlay, pix_fmt=pix_fmt)
        if title_fg:
            vf_parts.append(title_fg)
    video_filter = ",".join(vf_parts) if vf_parts else None

    resolved_clip_dur = clip_duration_s
    if (
        resolved_clip_dur is None
        and audio_params is not None
        and not audio_params.muted
        and audio_params.fade_out_s > 1e-6
    ):
        probed_dur = _probe_media_duration_s(input_path)
        if probed_dur is not None:
            rate = retime_params.speed_rate if retime_params is not None else 1.0
            resolved_clip_dur = probed_dur / rate

    af_parts: list[str] = []
    if retime_af is not None:
        af_parts.append(retime_af)
    if audio_params is not None:
        clip_af = compile_audio_filter(audio_params, clip_duration_s=resolved_clip_dur)
        if clip_af is not None:
            af_parts.append(clip_af)
    if target_lufs is not None and not (audio_params is not None and audio_params.muted):
        validated_lufs = _validate_bounded_float(
            target_lufs,
            "target_lufs",
            TARGET_LUFS_MIN,
            TARGET_LUFS_MAX,
        )
        lra = 11.0 if validated_lufs >= -16.0 else 7.0
        af_parts.append(f"loudnorm=I={validated_lufs:.1f}:TP=-1.0:LRA={lra:.1f}")
    audio_filter: str | None = ",".join(af_parts) if af_parts else None

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
