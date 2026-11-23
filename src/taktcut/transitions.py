"""Video & Audio Transitions (xfade + acrossfade) presets, validation, and FFmpeg compiler."""

from __future__ import annotations

import math
import re
import subprocess
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from taktcut.color import REC709_FFMPEG_FLAGS
from taktcut.models import (
    ALLOWED_ACROSSFADE_CURVES,
    ALLOWED_TRANSITION_PRESETS,
    ClipTransition,
    HardwareCapabilities,
    RationalFrameRate,
    RenderProfile,
    RenderResult,
    TimelineDocument,
    TransitionPresetId,
)
from taktcut.render import probe_hardware_capabilities, select_encoder

TRANSITION_DURATION_MIN_S: float = 0.1
TRANSITION_DURATION_MAX_S: float = 2.0
TRANSITION_DURATION_DEFAULT_S: float = 0.5
TRANSITION_OFFSET_MAX_S: float = 86400.0

ALLOWED_TRANSITION_PIX_FMTS: frozenset[str] = frozenset(
    {"yuv420p", "yuv422p10le", "rgb24", "yuv444p"}
)

_PAD_LABEL_RE = re.compile(r"^[A-Za-z0-9_:]{1,32}$")


def _validate_finite_bounded_float(
    raw: Any,
    field_name: str,
    min_val: float,
    max_val: float,
    *,
    strict_gt_min: bool = False,
) -> float:
    if isinstance(raw, bool) or not isinstance(raw, int | float):
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


def _validate_pad_label(label: str, field_name: str) -> str:
    if not isinstance(label, str) or not _PAD_LABEL_RE.fullmatch(label):
        raise ValueError(f"{field_name} contains unsafe or invalid FFmpeg pad label: {label!r}")
    return label


class TransitionPreset(BaseModel):
    """Built-in broadcast cut transition preset mapped to FFmpeg xfade."""

    id: TransitionPresetId
    name: str
    ffmpeg_xfade: TransitionPresetId
    description: str
    default_duration_s: float = TRANSITION_DURATION_DEFAULT_S


TRANSITION_PRESETS: tuple[TransitionPreset, ...] = (
    TransitionPreset(
        id="fade",
        name="Cross Dissolve",
        ffmpeg_xfade="fade",
        description="Classic linear luminance & chroma dissolve between adjacent clips.",
        default_duration_s=0.5,
    ),
    TransitionPreset(
        id="fadeblack",
        name="Dip to Black",
        ffmpeg_xfade="fadeblack",
        description="Fade outgoing clip down to broadcast black before fading incoming clip up.",
        default_duration_s=0.5,
    ),
    TransitionPreset(
        id="wipeleft",
        name="Wipe Left",
        ffmpeg_xfade="wipeleft",
        description="Directional horizontal wipe revealing incoming clip from right to left.",
        default_duration_s=0.5,
    ),
    TransitionPreset(
        id="slideright",
        name="Slide Right",
        ffmpeg_xfade="slideright",
        description="Incoming clip slides in from the left while pushing outgoing clip right.",
        default_duration_s=0.5,
    ),
    TransitionPreset(
        id="zoomin",
        name="Smooth Zoom",
        ffmpeg_xfade="zoomin",
        description="Dynamic optical zoom transition bridging outgoing and incoming shots.",
        default_duration_s=0.5,
    ),
)


class TransitionParams(BaseModel):
    """Validated video & audio transition parameters for FFmpeg xfade + acrossfade."""

    preset: TransitionPresetId = "fade"
    duration_s: float = Field(
        default=TRANSITION_DURATION_DEFAULT_S,
        ge=TRANSITION_DURATION_MIN_S,
        le=TRANSITION_DURATION_MAX_S,
    )
    include_audio: bool = True
    audio_curve1: str = "tri"
    audio_curve2: str = "tri"

    @field_validator("preset", mode="before")
    @classmethod
    def _validate_preset(cls, raw: Any) -> str:
        if not isinstance(raw, str):
            raise ValueError(f"preset must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned not in ALLOWED_TRANSITION_PRESETS:
            allowed = ", ".join(sorted(ALLOWED_TRANSITION_PRESETS))
            raise ValueError(f"Unsupported transition preset {raw!r}; expected: {allowed}")
        return cleaned

    @field_validator("duration_s", mode="before")
    @classmethod
    def _validate_duration_s(cls, raw: Any) -> float:
        return _validate_finite_bounded_float(
            raw,
            "duration_s",
            TRANSITION_DURATION_MIN_S,
            TRANSITION_DURATION_MAX_S,
        )

    @field_validator("audio_curve1", "audio_curve2", mode="before")
    @classmethod
    def _validate_audio_curve(cls, raw: Any, info: Any) -> str:
        if not isinstance(raw, str):
            raise ValueError(f"{info.field_name} must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned not in ALLOWED_ACROSSFADE_CURVES:
            raise ValueError(f"Unsupported acrossfade curve {raw!r} for {info.field_name}")
        return cleaned


class TransitionCompileResult(BaseModel):
    """Compiled FFmpeg xfade + acrossfade filtergraphs and metadata."""

    preset: TransitionPresetId
    preset_name: str
    duration_s: float
    offset_s: float
    include_audio: bool
    audio_curve1: str
    audio_curve2: str
    video_filtergraph: str
    audio_filtergraph: str
    filter_complex: str
    ffmpeg_args: list[str] = Field(default_factory=list)


class CutJunction(BaseModel):
    """Adjacent clip cut junction detected on a timeline track."""

    track_kind: Literal["video", "audio"]
    track_index: int
    cut_frame: int
    clip_a_index: int
    clip_b_index: int
    clip_a_name: str
    clip_b_name: str
    clip_a_duration_s: float
    clip_b_duration_s: float
    max_transition_duration_s: float
    transition: ClipTransition | None = None


def list_transition_presets() -> tuple[TransitionPreset, ...]:
    """Return all supported FFmpeg xfade transition presets."""
    return TRANSITION_PRESETS


def get_transition_preset(preset_id: str) -> TransitionPreset:
    """Look up a transition preset by id or case-insensitive display name."""
    if not isinstance(preset_id, str):
        raise ValueError(f"Transition preset must be a string, got {preset_id!r}")
    cleaned = preset_id.strip().lower()
    for preset in TRANSITION_PRESETS:
        if preset.id == cleaned or preset.name.lower() == cleaned:
            return preset
    raise ValueError(f"Unknown transition preset: {preset_id!r}")


def apply_transition_preset(
    preset_id: str,
    *,
    duration_s: float | None = None,
    include_audio: bool = True,
) -> TransitionParams:
    """Create validated TransitionParams from a preset id or name."""
    preset = get_transition_preset(preset_id)
    dur = preset.default_duration_s if duration_s is None else duration_s
    return TransitionParams(
        preset=preset.id,
        duration_s=dur,
        include_audio=include_audio,
    )


def _coerce_transition_params(
    raw: TransitionParams | ClipTransition | dict[str, Any],
) -> TransitionParams:
    if isinstance(raw, TransitionParams):
        return TransitionParams.model_validate(raw.model_dump())
    if isinstance(raw, ClipTransition):
        return TransitionParams(
            preset=raw.preset,
            duration_s=raw.duration_s,
            include_audio=raw.include_audio,
            audio_curve1=raw.audio_curve,
            audio_curve2=raw.audio_curve,
        )
    if isinstance(raw, dict):
        mapped = dict(raw)
        if (
            "audio_curve" in mapped
            and "audio_curve1" not in mapped
            and "audio_curve2" not in mapped
        ):
            curve = mapped.pop("audio_curve")
            mapped["audio_curve1"] = curve
            mapped["audio_curve2"] = curve
        return TransitionParams.model_validate(mapped)
    raise ValueError(f"Unsupported transition parameters type: {type(raw).__name__}")


def compute_xfade_offset_s(
    clip_a_duration_s: float,
    duration_s: float,
    *,
    clip_b_duration_s: float | None = None,
) -> float:
    """Compute exact FFmpeg xfade offset (clip_a_duration_s - duration_s) with bounds checks."""
    dur_a = _validate_finite_bounded_float(
        clip_a_duration_s,
        "clip_a_duration_s",
        0.0,
        TRANSITION_OFFSET_MAX_S,
        strict_gt_min=True,
    )
    trans_d = _validate_finite_bounded_float(
        duration_s,
        "duration_s",
        TRANSITION_DURATION_MIN_S,
        TRANSITION_DURATION_MAX_S,
    )
    if trans_d > dur_a + 1e-9:
        raise ValueError(
            f"Transition duration_s ({trans_d:.3f}s) exceeds clip A duration ({dur_a:.3f}s)"
        )
    if clip_b_duration_s is not None:
        dur_b = _validate_finite_bounded_float(
            clip_b_duration_s,
            "clip_b_duration_s",
            0.0,
            TRANSITION_OFFSET_MAX_S,
            strict_gt_min=True,
        )
        if trans_d > dur_b + 1e-9:
            raise ValueError(
                f"Transition duration_s ({trans_d:.3f}s) exceeds clip B duration ({dur_b:.3f}s)"
            )
    return round(max(0.0, dur_a - trans_d), 6)


def compile_transition_filter(
    params: TransitionParams | ClipTransition | dict[str, Any],
    *,
    clip_a_duration_s: float | None = None,
    clip_b_duration_s: float | None = None,
    offset_s: float | None = None,
    pix_fmt: str | None = None,
    video_in_a: str = "0:v",
    video_in_b: str = "1:v",
    audio_in_a: str = "0:a",
    audio_in_b: str = "1:a",
    video_out: str = "vout",
    audio_out: str = "aout",
) -> tuple[str, str | None]:
    """Compile validated TransitionParams into safe FFmpeg (xfade, acrossfade) filter chains."""
    validated = _coerce_transition_params(params)
    if pix_fmt is not None and pix_fmt not in ALLOWED_TRANSITION_PIX_FMTS:
        raise ValueError(f"Unsupported transition pixel format {pix_fmt!r}")

    v_in_a = _validate_pad_label(video_in_a, "video_in_a")
    v_in_b = _validate_pad_label(video_in_b, "video_in_b")
    a_in_a = _validate_pad_label(audio_in_a, "audio_in_a")
    a_in_b = _validate_pad_label(audio_in_b, "audio_in_b")
    v_out = _validate_pad_label(video_out, "video_out")
    a_out = _validate_pad_label(audio_out, "audio_out")

    if offset_s is not None:
        resolved_offset = _validate_finite_bounded_float(
            offset_s,
            "offset_s",
            0.0,
            TRANSITION_OFFSET_MAX_S,
        )
        if clip_a_duration_s is not None:
            compute_xfade_offset_s(
                clip_a_duration_s,
                validated.duration_s,
                clip_b_duration_s=clip_b_duration_s,
            )
        elif clip_b_duration_s is not None:
            dur_b = _validate_finite_bounded_float(
                clip_b_duration_s,
                "clip_b_duration_s",
                0.0,
                TRANSITION_OFFSET_MAX_S,
                strict_gt_min=True,
            )
            if validated.duration_s > dur_b + 1e-9:
                raise ValueError(
                    f"Transition duration_s ({validated.duration_s:.3f}s) exceeds "
                    f"clip B duration ({dur_b:.3f}s)"
                )
    elif clip_a_duration_s is not None:
        resolved_offset = compute_xfade_offset_s(
            clip_a_duration_s,
            validated.duration_s,
            clip_b_duration_s=clip_b_duration_s,
        )
    else:
        raise ValueError("Provide either clip_a_duration_s or offset_s to compile xfade")

    v_filter = (
        f"[{v_in_a}][{v_in_b}]"
        f"xfade=transition={validated.preset}:duration={validated.duration_s:.3f}:offset={resolved_offset:.3f}"
    )
    if pix_fmt is not None:
        v_filter += f",format={pix_fmt}"
    v_filter += f"[{v_out}]"

    a_filter: str | None = None
    if validated.include_audio:
        a_filter = (
            f"[{a_in_a}][{a_in_b}]"
            f"acrossfade=d={validated.duration_s:.3f}"
            f":c1={validated.audio_curve1}:c2={validated.audio_curve2}"
            f"[{a_out}]"
        )

    return v_filter, a_filter


def compile_transition_filter_result(
    params: TransitionParams | ClipTransition | dict[str, Any],
    *,
    clip_a_duration_s: float | None = None,
    clip_b_duration_s: float | None = None,
    offset_s: float | None = None,
    pix_fmt: str | None = None,
    video_in_a: str = "0:v",
    video_in_b: str = "1:v",
    audio_in_a: str = "0:a",
    audio_in_b: str = "1:a",
    video_out: str = "vout",
    audio_out: str = "aout",
) -> TransitionCompileResult:
    """Compile transition parameters into a structured TransitionCompileResult."""
    validated = _coerce_transition_params(params)
    preset_obj = get_transition_preset(validated.preset)
    v_fg, a_fg = compile_transition_filter(
        validated,
        clip_a_duration_s=clip_a_duration_s,
        clip_b_duration_s=clip_b_duration_s,
        offset_s=offset_s,
        pix_fmt=pix_fmt,
        video_in_a=video_in_a,
        video_in_b=video_in_b,
        audio_in_a=audio_in_a,
        audio_in_b=audio_in_b,
        video_out=video_out,
        audio_out=audio_out,
    )
    resolved_offset = (
        float(offset_s)
        if offset_s is not None
        else compute_xfade_offset_s(
            clip_a_duration_s if clip_a_duration_s is not None else validated.duration_s,
            validated.duration_s,
            clip_b_duration_s=clip_b_duration_s,
        )
    )
    filter_complex = f"{v_fg};{a_fg}" if a_fg is not None else v_fg
    ffmpeg_args = ["-filter_complex", filter_complex, "-map", f"[{video_out}]"]
    if a_fg is not None:
        ffmpeg_args.extend(["-map", f"[{audio_out}]"])

    return TransitionCompileResult(
        preset=validated.preset,
        preset_name=preset_obj.name,
        duration_s=validated.duration_s,
        offset_s=round(resolved_offset, 6),
        include_audio=validated.include_audio,
        audio_curve1=validated.audio_curve1,
        audio_curve2=validated.audio_curve2,
        video_filtergraph=v_fg,
        audio_filtergraph=a_fg or "",
        filter_complex=filter_complex,
        ffmpeg_args=ffmpeg_args,
    )


def find_adjacent_cut_junctions(doc: TimelineDocument) -> list[CutJunction]:
    """Locate all exact adjacent clip cut junctions across tracks in a TimelineDocument."""
    fps = max(1.0, doc.fps.as_float)
    junctions: list[CutJunction] = []
    for track in doc.tracks:
        indexed_clips = sorted(
            enumerate(track.clips),
            key=lambda item: (item[1].start_frame, item[1].duration_frames),
        )
        for pos in range(len(indexed_clips) - 1):
            idx_a, clip_a = indexed_clips[pos]
            idx_b, clip_b = indexed_clips[pos + 1]
            if clip_a.duration_frames <= 0 or clip_b.duration_frames <= 0:
                continue
            if clip_a.end_frame_exclusive != clip_b.start_frame:
                continue
            dur_a_s = clip_a.duration_frames / fps
            dur_b_s = clip_b.duration_frames / fps
            max_dur_s = round(
                min(TRANSITION_DURATION_MAX_S, dur_a_s, dur_b_s),
                3,
            )
            junctions.append(
                CutJunction(
                    track_kind=track.kind,
                    track_index=track.index,
                    cut_frame=clip_a.end_frame_exclusive,
                    clip_a_index=idx_a,
                    clip_b_index=idx_b,
                    clip_a_name=clip_a.name,
                    clip_b_name=clip_b.name,
                    clip_a_duration_s=round(dur_a_s, 6),
                    clip_b_duration_s=round(dur_b_s, 6),
                    max_transition_duration_s=max_dur_s,
                    transition=clip_a.transition_out,
                )
            )
    return junctions


def build_transition_render_argv(
    clip_a_path: Path,
    clip_b_path: Path,
    output_path: Path,
    params: TransitionParams | ClipTransition | dict[str, Any],
    *,
    clip_a_duration_s: float,
    clip_b_duration_s: float | None = None,
    profile: RenderProfile = RenderProfile.WEB_H264,
    fps: RationalFrameRate | None = None,
    prefer_hw: bool = True,
    caps: HardwareCapabilities | None = None,
    ffmpeg_bin: str = "ffmpeg",
) -> list[str]:
    """Compile a deterministic two-clip FFmpeg xfade + acrossfade render command."""
    hw = caps or probe_hardware_capabilities(ffmpeg_bin=ffmpeg_bin, verify_nvenc_runtime=prefer_hw)
    encoder = select_encoder(profile, hw, prefer_hw=prefer_hw)
    target_fps = fps or RationalFrameRate(num=25, den=1)
    gop = max(2, round(2 * target_fps.as_float))
    is_prores = profile == RenderProfile.PRORES_HQ
    is_dnxhr = profile == RenderProfile.DNXHR_HQ
    is_mezzanine = is_prores or is_dnxhr
    pix_fmt = "yuv422p10le" if is_prores else ("yuv422p" if is_dnxhr else "yuv420p")

    compiled = compile_transition_filter_result(
        params,
        clip_a_duration_s=clip_a_duration_s,
        clip_b_duration_s=clip_b_duration_s,
        pix_fmt=pix_fmt,
    )

    argv: list[str] = [
        hw.ffmpeg_path,
        "-hide_banner",
        "-y",
        "-i",
        str(clip_a_path),
        "-i",
        str(clip_b_path),
        *compiled.ffmpeg_args,
        "-fps_mode",
        "cfr",
        "-r",
        target_fps.ffmpeg_rate,
        "-c:v",
        encoder,
    ]
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
    elif encoder == "dnxhd":
        argv.extend(["-profile:v", "dnxhr_hq"])

    argv.extend(["-pix_fmt", pix_fmt, "-g", str(gop)])
    argv.extend(REC709_FFMPEG_FLAGS)

    if compiled.include_audio:
        if is_mezzanine:
            argv.extend(["-c:a", "pcm_s24le", "-ar", "48000"])
        else:
            argv.extend(["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"])

    if not is_mezzanine:
        argv.extend(["-movflags", "+faststart"])

    argv.append(str(output_path))
    return argv


def execute_transition_render(
    argv: list[str],
    output_path: Path,
    *,
    encoder: str = "libx264",
) -> RenderResult:
    """Execute a compiled two-clip transition FFmpeg argv and return RenderResult."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    proc = subprocess.run(argv, capture_output=True, text=True, check=False)
    bytes_written = output_path.stat().st_size if output_path.exists() else 0
    tail = "\n".join(proc.stderr.splitlines()[-15:]) if proc.stderr else ""
    return RenderResult(
        success=(proc.returncode == 0 and bytes_written > 0),
        output_path=str(output_path),
        encoder=encoder,
        bytes_written=bytes_written,
        returncode=proc.returncode,
        stderr_tail=tail,
    )
