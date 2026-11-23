"""Deterministic FFmpeg & NVENC render planning and execution."""

from __future__ import annotations

import json
import math
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Literal, cast

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from taktcut.color import (
    REC709_FFMPEG_FLAGS,
    ColorGradeParams,
    build_rec709_lut_filter,
    compile_color_grade_filter,
    escape_ffmpeg_filter_path,
)
from taktcut.fx import ChromaKeyParams, compile_chroma_key_filter
from taktcut.models import (
    ALLOWED_DYNAMIC_ZOOM_PRESETS,
    ALLOWED_TIMECODE_BURNIN,
    ClipTransformParams,
    DialogueEqPresetId,
    DynamicZoomPresetId,
    HardwareCapabilities,
    LoudnessPresetId,
    RationalFrameRate,
    RenderPlan,
    RenderProfile,
    RenderResult,
    TimecodeBurnInPosition,
)
from taktcut.subtitles import SubtitleTrackParams, compile_subtitles_filter
from taktcut.titles import TitleOverlayParams, compile_title_filter, resolve_default_fontfile

AUDIO_GAIN_DB_MIN: float = -24.0
AUDIO_GAIN_DB_MAX: float = 12.0
AUDIO_FADE_S_MIN: float = 0.0
AUDIO_FADE_S_MAX: float = 5.0
AUTO_DUCK_THRESHOLD_DB_MIN: float = -40.0
AUTO_DUCK_THRESHOLD_DB_MAX: float = -6.0
AUTO_DUCK_THRESHOLD_DB_DEFAULT: float = -24.0
AUTO_DUCK_RATIO_MIN: float = 2.0
AUTO_DUCK_RATIO_MAX: float = 12.0
AUTO_DUCK_RATIO_DEFAULT: float = 6.0
AUTO_DUCK_ATTACK_MS_MIN: float = 10.0
AUTO_DUCK_ATTACK_MS_MAX: float = 200.0
AUTO_DUCK_ATTACK_MS_DEFAULT: float = 40.0
AUTO_DUCK_RELEASE_MS_MIN: float = 100.0
AUTO_DUCK_RELEASE_MS_MAX: float = 1500.0
AUTO_DUCK_RELEASE_MS_DEFAULT: float = 400.0
RETIME_SPEED_MIN: float = 0.25
RETIME_SPEED_MAX: float = 4.0
CLIP_DURATION_MAX_S: float = 86400.0
TARGET_LUFS_MIN: float = -70.0
TARGET_LUFS_MAX: float = -5.0
ALLOWED_LOUDNESS_PRESETS: frozenset[str] = frozenset(
    {"off", "youtube_14", "reels_16", "broadcast_23"}
)
ALLOWED_DIALOGUE_EQ_PRESETS: frozenset[str] = frozenset(
    {"off", "voice_clarity", "podcast_warm", "derumble"}
)
LOUDNESS_PRESET_LUFS: dict[str, float] = {
    "youtube_14": -14.0,
    "reels_16": -16.0,
    "broadcast_23": -23.0,
}
DIALOGUE_EQ_FILTERS: dict[str, str] = {
    "voice_clarity": "highpass=f=80,equalizer=f=3000:t=q:w=1.2:g=3",
    "podcast_warm": "highpass=f=70,equalizer=f=180:t=q:w=1.0:g=2,equalizer=f=4000:t=q:w=1.2:g=2",
    "derumble": "highpass=f=100",
}
RENDER_CRF_MIN: int = 0
RENDER_CRF_MAX: int = 51
RENDER_AUDIO_BITRATE_KBPS_MIN: int = 64
RENDER_AUDIO_BITRATE_KBPS_MAX: int = 512
RENDER_AUDIO_BITRATE_OPTIONS_KBPS: tuple[int, ...] = (96, 128, 160, 192, 256, 320)
RENDER_DIMENSION_MIN: int = 128
RENDER_DIMENSION_MAX: int = 7680
ENCODER_PRESET_MAP: dict[str, tuple[str, str]] = {
    "fast": ("p3", "veryfast"),
    "medium": ("p5", "medium"),
    "slow": ("p7", "slow"),
}

TIMECODE_BURNIN_POSITIONS: dict[str, str] = {
    "top_left": "x=24:y=24",
    "bottom_center": "x=(w-tw)/2:y=h-th-24",
    "bottom_right": "x=w-tw-24:y=h-th-24",
}
_TIMECODE_MONO_FONTS_WIN: tuple[str, ...] = (
    "C:/Windows/Fonts/consola.ttf",
    "C:/Windows/Fonts/cour.ttf",
)
_TIMECODE_MONO_FONTS_MAC: tuple[str, ...] = (
    "/System/Library/Fonts/Supplemental/Courier New.ttf",
    "/System/Library/Fonts/Menlo.ttc",
)
_TIMECODE_MONO_FONTS_LINUX: tuple[str, ...] = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
    "/usr/share/fonts/TTF/DejaVuSansMono.ttf",
)


def validate_timecode_burnin(raw: Any) -> TimecodeBurnInPosition:
    """Validate and normalize a Data Burn-In SMPTE timecode overlay position."""
    if not isinstance(raw, str):
        raise ValueError(f"timecode_burnin must be a string, got {raw!r}")
    cleaned = raw.strip().lower()
    if cleaned not in ALLOWED_TIMECODE_BURNIN:
        allowed = ", ".join(ALLOWED_TIMECODE_BURNIN)
        raise ValueError(f"Unsupported timecode_burnin {raw!r}; expected one of: {allowed}")
    return cleaned


def resolve_timecode_fontfile() -> Path | None:
    """Locate a standard monospace (or sans-serif) font file for SMPTE timecode drawtext."""
    if sys.platform.startswith("win"):
        candidates = _TIMECODE_MONO_FONTS_WIN
    elif sys.platform == "darwin":
        candidates = _TIMECODE_MONO_FONTS_MAC
    else:
        candidates = _TIMECODE_MONO_FONTS_LINUX
    for raw in candidates:
        candidate = Path(raw)
        if candidate.is_file():
            return candidate
    return resolve_default_fontfile()


def compile_timecode_burnin_filter(
    timecode_burnin: TimecodeBurnInPosition,
    fps: RationalFrameRate,
    *,
    fontfile: Path | str | None = None,
) -> str | None:
    """Compile a validated SMPTE timecode burn-in position into an FFmpeg drawtext filter."""
    pos = validate_timecode_burnin(timecode_burnin)
    if pos == "off":
        return None

    resolved_font: Path | None = None
    if fontfile is not None:
        raw_str = str(fontfile)
        if any(ord(c) < 32 or ord(c) == 127 for c in raw_str):
            raise ValueError("fontfile path contains invalid control characters")
        candidate = Path(raw_str)
        if not candidate.is_file():
            raise FileNotFoundError(f"Font file not found: {candidate}")
        resolved_font = candidate
    else:
        resolved_font = resolve_timecode_fontfile()

    font_opt = f"fontfile='{escape_ffmpeg_filter_path(resolved_font)}':" if resolved_font else ""
    coords = TIMECODE_BURNIN_POSITIONS[pos]
    return (
        f"drawtext={font_opt}timecode='00\\:00\\:00\\:00':rate={fps.ffmpeg_rate}"
        f":fontsize=28:fontcolor=white:box=1:boxcolor=black@0.65:{coords}"
    )


def _validate_bounded_int(
    raw: Any,
    field_name: str,
    min_val: int,
    max_val: int,
    *,
    even: bool = False,
) -> int:
    if isinstance(raw, bool) or not isinstance(raw, int):
        raise ValueError(f"{field_name} must be an integer, got {raw!r}")
    if raw < min_val or raw > max_val:
        raise ValueError(f"{field_name} must be within [{min_val}, {max_val}], got {raw}")
    if even and raw % 2 != 0:
        raise ValueError(f"{field_name} must be divisible by 2, got {raw}")
    return raw


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


def validate_loudness_preset(raw: Any) -> LoudnessPresetId:
    """Validate and normalize a Fairlight loudness target normalizer preset identifier."""
    if not isinstance(raw, str):
        raise ValueError(f"loudness_preset must be a string, got {raw!r}")
    cleaned = raw.strip().lower()
    if cleaned not in ALLOWED_LOUDNESS_PRESETS:
        allowed = ", ".join(sorted(ALLOWED_LOUDNESS_PRESETS))
        raise ValueError(f"Unsupported loudness_preset {raw!r}; expected one of: {allowed}")
    return cast(LoudnessPresetId, cleaned)


def validate_dialogue_eq(raw: Any) -> DialogueEqPresetId:
    """Validate and normalize a Fairlight dialogue EQ preset identifier."""
    if not isinstance(raw, str):
        raise ValueError(f"dialogue_eq must be a string, got {raw!r}")
    cleaned = raw.strip().lower()
    if cleaned not in ALLOWED_DIALOGUE_EQ_PRESETS:
        allowed = ", ".join(sorted(ALLOWED_DIALOGUE_EQ_PRESETS))
        raise ValueError(f"Unsupported dialogue_eq {raw!r}; expected one of: {allowed}")
    return cast(DialogueEqPresetId, cleaned)


class FairlightAudioParams(BaseModel):
    """Fairlight master Dialogue EQ and Loudness Target Normalizer parameters."""

    model_config = ConfigDict(extra="forbid")

    loudness_preset: LoudnessPresetId = "off"
    dialogue_eq: DialogueEqPresetId = "off"

    @field_validator("loudness_preset", mode="before")
    @classmethod
    def _validate_loudness_preset(cls, raw: Any) -> LoudnessPresetId:
        return validate_loudness_preset(raw)

    @field_validator("dialogue_eq", mode="before")
    @classmethod
    def _validate_dialogue_eq(cls, raw: Any) -> DialogueEqPresetId:
        return validate_dialogue_eq(raw)

    def is_identity(self) -> bool:
        """Return True when both dialogue_eq and loudness_preset are bypassed ('off')."""
        return self.loudness_preset == "off" and self.dialogue_eq == "off"


def compile_dialogue_eq_filter(dialogue_eq: DialogueEqPresetId) -> str | None:
    """Compile a validated Fairlight Dialogue EQ preset into an FFmpeg -af filter snippet."""
    cleaned = validate_dialogue_eq(dialogue_eq)
    if cleaned == "off":
        return None
    return DIALOGUE_EQ_FILTERS[cleaned]


def compile_loudness_preset_filter(loudness_preset: LoudnessPresetId) -> str | None:
    """Compile a validated Loudness Target Normalizer preset into FFmpeg loudnorm."""
    cleaned = validate_loudness_preset(loudness_preset)
    if cleaned == "off":
        return None
    lufs = LOUDNESS_PRESET_LUFS[cleaned]
    return f"loudnorm=I={lufs:.1f}:TP=-1.0:LRA=11"


def compile_fairlight_audio_filter(params: FairlightAudioParams) -> str | None:
    """Compile Fairlight Dialogue EQ followed by Loudness Target Normalizer into -af."""
    parts: list[str] = []
    eq_af = compile_dialogue_eq_filter(params.dialogue_eq)
    if eq_af is not None:
        parts.append(eq_af)
    loud_af = compile_loudness_preset_filter(params.loudness_preset)
    if loud_af is not None:
        parts.append(loud_af)
    return ",".join(parts) if parts else None


class AudioCompileResult(BaseModel):
    """Compiled FFmpeg audio filtergraph and validated clip/Fairlight audio parameters."""

    filtergraph: str
    ffmpeg_af_args: list[str]
    is_identity: bool
    params: ClipAudioParams
    loudness_preset: LoudnessPresetId = "off"
    dialogue_eq: DialogueEqPresetId = "off"


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
    loudness_preset: LoudnessPresetId | None = None,
    dialogue_eq: DialogueEqPresetId | None = None,
) -> AudioCompileResult:
    """Compile clip audio controls, Fairlight dialogue EQ, and loudness into AudioCompileResult."""
    resolved_loudness: LoudnessPresetId = (
        validate_loudness_preset(loudness_preset) if loudness_preset is not None else "off"
    )
    resolved_eq: DialogueEqPresetId = (
        validate_dialogue_eq(dialogue_eq) if dialogue_eq is not None else "off"
    )

    af_parts: list[str] = []
    clip_af = compile_audio_filter(params, clip_duration_s=clip_duration_s)
    if clip_af is not None:
        af_parts.append(clip_af)
    if not params.muted:
        eq_af = compile_dialogue_eq_filter(resolved_eq)
        if eq_af is not None:
            af_parts.append(eq_af)
        if resolved_loudness != "off":
            loud_af = compile_loudness_preset_filter(resolved_loudness)
            if loud_af is not None:
                af_parts.append(loud_af)
        elif target_lufs is not None:
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
        loudness_preset=resolved_loudness,
        dialogue_eq=resolved_eq,
    )


_AUDIO_PAD_LABEL_RE = re.compile(r"^[A-Za-z0-9_:]{1,32}$")


def _validate_audio_pad_label(label: str, field_name: str) -> str:
    if not isinstance(label, str) or not _AUDIO_PAD_LABEL_RE.fullmatch(label):
        raise ValueError(f"{field_name} contains unsafe or invalid FFmpeg pad label: {label!r}")
    return label


class AutoDuckParams(BaseModel):
    """Sidechain music auto-ducking parameters with strict Fairlight-grade numeric bounds."""

    enabled: bool = False
    threshold_db: float = AUTO_DUCK_THRESHOLD_DB_DEFAULT
    ratio: float = AUTO_DUCK_RATIO_DEFAULT
    attack_ms: float = AUTO_DUCK_ATTACK_MS_DEFAULT
    release_ms: float = AUTO_DUCK_RELEASE_MS_DEFAULT

    @field_validator("enabled", mode="before")
    @classmethod
    def _validate_enabled(cls, raw: Any) -> bool:
        if not isinstance(raw, bool):
            raise ValueError(f"enabled must be a boolean, got {raw!r}")
        return raw

    @field_validator("threshold_db", mode="before")
    @classmethod
    def _validate_threshold_db(cls, raw: Any) -> float:
        return _validate_bounded_float(
            raw,
            "threshold_db",
            AUTO_DUCK_THRESHOLD_DB_MIN,
            AUTO_DUCK_THRESHOLD_DB_MAX,
        )

    @field_validator("ratio", mode="before")
    @classmethod
    def _validate_ratio(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "ratio", AUTO_DUCK_RATIO_MIN, AUTO_DUCK_RATIO_MAX)

    @field_validator("attack_ms", mode="before")
    @classmethod
    def _validate_attack_ms(cls, raw: Any) -> float:
        return _validate_bounded_float(
            raw,
            "attack_ms",
            AUTO_DUCK_ATTACK_MS_MIN,
            AUTO_DUCK_ATTACK_MS_MAX,
        )

    @field_validator("release_ms", mode="before")
    @classmethod
    def _validate_release_ms(cls, raw: Any) -> float:
        return _validate_bounded_float(
            raw,
            "release_ms",
            AUTO_DUCK_RELEASE_MS_MIN,
            AUTO_DUCK_RELEASE_MS_MAX,
        )

    def is_identity(self) -> bool:
        """Return True when auto-ducking is disabled."""
        return not self.enabled

    def threshold_linear(self) -> float:
        """Convert threshold_db to FFmpeg sidechaincompress linear amplitude threshold."""
        return float(10.0 ** (self.threshold_db / 20.0))


class AutoDuckCompileResult(BaseModel):
    """Compiled FFmpeg sidechaincompress filtergraph and validated auto-duck parameters."""

    filtergraph: str
    ffmpeg_args: list[str]
    threshold_linear: float
    is_identity: bool
    params: AutoDuckParams


def compile_auto_duck_filter(
    params: AutoDuckParams,
    *,
    music_pad: str = "0:a",
    sidechain_pad: str = "1:a",
    output_pad: str = "aout",
    mix_sidechain: bool = False,
) -> str | None:
    """Compile validated AutoDuckParams into an FFmpeg sidechaincompress filtergraph."""
    m_pad = _validate_audio_pad_label(music_pad, "music_pad")
    s_pad = _validate_audio_pad_label(sidechain_pad, "sidechain_pad")
    o_pad = _validate_audio_pad_label(output_pad, "output_pad")
    if not params.enabled:
        return None
    thresh_lin = params.threshold_linear()
    sc = (
        "sidechaincompress="
        f"threshold={thresh_lin:.6f}:"
        f"ratio={params.ratio:.2f}:"
        f"attack={params.attack_ms:.1f}:"
        f"release={params.release_ms:.1f}"
    )
    if not mix_sidechain:
        return f"[{m_pad}][{s_pad}]{sc}[{o_pad}]"
    return (
        f"[{s_pad}]asplit[sc_trig][sc_vo];"
        f"[{m_pad}][sc_trig]{sc}[ducked_mx];"
        f"[ducked_mx][sc_vo]amix=inputs=2:duration=longest:normalize=0[{o_pad}]"
    )


def compile_auto_duck_filter_result(
    params: AutoDuckParams,
    *,
    music_pad: str = "0:a",
    sidechain_pad: str = "1:a",
    output_pad: str = "aout",
    mix_sidechain: bool = False,
) -> AutoDuckCompileResult:
    """Compile AutoDuckParams into structured filtergraph, FFmpeg argv slice, and metadata."""
    fg = compile_auto_duck_filter(
        params,
        music_pad=music_pad,
        sidechain_pad=sidechain_pad,
        output_pad=output_pad,
        mix_sidechain=mix_sidechain,
    ) or ""
    o_pad = _validate_audio_pad_label(output_pad, "output_pad")
    return AutoDuckCompileResult(
        filtergraph=fg,
        ffmpeg_args=["-filter_complex", fg, "-map", f"[{o_pad}]"] if fg else [],
        threshold_linear=round(params.threshold_linear(), 6),
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


AspectRatioPresetId = Literal["16:9", "9:16", "1:1", "4:5"]
FramingMode = Literal["fill", "fit"]


class AspectRatioPreset(BaseModel):
    """Canonical target delivery aspect ratio preset with output dimensions."""

    id: AspectRatioPresetId
    label: str
    width: int
    height: int
    description: str


ASPECT_RATIO_PRESETS: tuple[AspectRatioPreset, ...] = (
    AspectRatioPreset(
        id="16:9",
        label="16:9 1920x1080",
        width=1920,
        height=1080,
        description="Standard broadcast and widescreen 16:9 HD delivery.",
    ),
    AspectRatioPreset(
        id="9:16",
        label="9:16 1080x1920 Reels/Shorts",
        width=1080,
        height=1920,
        description="Vertical 9:16 social framing for Reels, Shorts, and TikTok.",
    ),
    AspectRatioPreset(
        id="1:1",
        label="1:1 1080x1080 Square",
        width=1080,
        height=1080,
        description="Square 1:1 social feed delivery.",
    ),
    AspectRatioPreset(
        id="4:5",
        label="4:5 1080x1350 Feed",
        width=1080,
        height=1350,
        description="Vertical 4:5 social feed delivery.",
    ),
)

_ASPECT_PRESET_MAP: dict[str, AspectRatioPreset] = {p.id: p for p in ASPECT_RATIO_PRESETS}


def list_aspect_presets() -> list[AspectRatioPreset]:
    """Return all built-in aspect ratio presets in deterministic display order."""
    return list(ASPECT_RATIO_PRESETS)


def get_aspect_preset(preset_id: str) -> AspectRatioPreset:
    """Lookup an aspect ratio preset by canonical id."""
    if not isinstance(preset_id, str):
        raise ValueError(f"preset must be a string, got {preset_id!r}")
    cleaned = preset_id.strip()
    preset = _ASPECT_PRESET_MAP.get(cleaned)
    if preset is None:
        allowed = ", ".join(_ASPECT_PRESET_MAP.keys())
        raise ValueError(
            f"Unsupported aspect ratio preset {preset_id!r}; expected one of: {allowed}"
        )
    return preset


class FramingParams(BaseModel):
    """Aspect ratio reframe parameters for safe FFmpeg scale+crop (Fill) or scale+pad (Fit)."""

    preset: AspectRatioPresetId = "16:9"
    mode: FramingMode = "fill"
    pan_x: float = 0.0
    pan_y: float = 0.0
    enabled: bool = True
    target_width: int | None = None
    target_height: int | None = None

    @field_validator("preset", mode="before")
    @classmethod
    def _validate_preset(cls, raw: Any) -> str:
        return get_aspect_preset(raw).id

    @field_validator("mode", mode="before")
    @classmethod
    def _validate_mode(cls, raw: Any) -> str:
        if not isinstance(raw, str):
            raise ValueError(f"mode must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned not in {"fill", "fit"}:
            raise ValueError(f"Unsupported framing mode {raw!r}; expected 'fill' or 'fit'")
        return cleaned

    @field_validator("pan_x", "pan_y", mode="before")
    @classmethod
    def _validate_pan(cls, raw: Any, info: Any) -> float:
        return _validate_bounded_float(raw, str(info.field_name), -1.0, 1.0)

    @field_validator("enabled", mode="before")
    @classmethod
    def _validate_enabled(cls, raw: Any) -> bool:
        if not isinstance(raw, bool):
            raise ValueError(f"enabled must be a boolean, got {raw!r}")
        return raw

    @field_validator("target_width", "target_height", mode="before")
    @classmethod
    def _validate_target_dim(cls, raw: Any, info: Any) -> int | None:
        if raw is None:
            return None
        return _validate_bounded_int(
            raw,
            str(info.field_name),
            RENDER_DIMENSION_MIN,
            RENDER_DIMENSION_MAX,
            even=True,
        )

    @model_validator(mode="after")
    def _validate_target_pair(self) -> FramingParams:
        if (self.target_width is None) != (self.target_height is None):
            raise ValueError("target_width and target_height must be provided together")
        return self

    def target_dimensions(self) -> tuple[int, int]:
        if self.target_width is not None and self.target_height is not None:
            return (self.target_width, self.target_height)
        spec = _ASPECT_PRESET_MAP[self.preset]
        return (spec.width, spec.height)


DeliveryPresetId = Literal[
    "youtube_1080p_h264",
    "youtube_4k_hevc",
    "reels_tiktok_9_16",
    "broadcast_prores_422",
    "fast_draft_720p",
]
EncoderPresetId = Literal["fast", "medium", "slow"]


class DeliveryPreset(BaseModel):
    """Curated 1-click DaVinci-style quick-export delivery preset."""

    id: DeliveryPresetId
    label: str
    label_fr: str
    badge: str
    profile: RenderProfile
    codec_label: str
    container: Literal["mp4", "mov"]
    aspect_ratio: AspectRatioPresetId
    width: int
    height: int
    framing_mode: FramingMode
    crf: int | None = None
    encoder_preset: EncoderPresetId | None = None
    audio_codec: Literal["aac", "pcm_s24le"]
    audio_bitrate_kbps: int | None = None
    target_lufs: float
    default_output_path: str
    description: str
    description_fr: str


DELIVERY_PRESETS: tuple[DeliveryPreset, ...] = (
    DeliveryPreset(
        id="youtube_1080p_h264",
        label="YouTube 1080p H.264",
        label_fr="YouTube 1080p H.264",
        badge="1080p H.264",
        profile=RenderProfile.WEB_H264,
        codec_label="H.264",
        container="mp4",
        aspect_ratio="16:9",
        width=1920,
        height=1080,
        framing_mode="fill",
        crf=18,
        encoder_preset="medium",
        audio_codec="aac",
        audio_bitrate_kbps=192,
        target_lufs=-14.0,
        default_output_path="renders/youtube_1080p.mp4",
        description="1080p 16:9 H.264 MP4 (+faststart) at CRF 18, AAC 192 kbps, -14 LUFS.",
        description_fr="MP4 H.264 1080p 16:9 (+faststart), CRF 18, AAC 192 kbps, -14 LUFS.",
    ),
    DeliveryPreset(
        id="youtube_4k_hevc",
        label="YouTube 4K HEVC",
        label_fr="YouTube 4K HEVC",
        badge="4K HEVC",
        profile=RenderProfile.MASTER_HEVC,
        codec_label="HEVC",
        container="mp4",
        aspect_ratio="16:9",
        width=3840,
        height=2160,
        framing_mode="fill",
        crf=20,
        encoder_preset="medium",
        audio_codec="aac",
        audio_bitrate_kbps=320,
        target_lufs=-14.0,
        default_output_path="renders/youtube_4k_hevc.mp4",
        description="4K UHD 16:9 HEVC MP4 (+faststart) at CRF 20, AAC 320 kbps, -14 LUFS.",
        description_fr="MP4 HEVC 4K UHD 16:9 (+faststart), CRF 20, AAC 320 kbps, -14 LUFS.",
    ),
    DeliveryPreset(
        id="reels_tiktok_9_16",
        label="Reels / TikTok 9:16",
        label_fr="Reels / TikTok 9:16",
        badge="9:16 Social",
        profile=RenderProfile.WEB_H264,
        codec_label="H.264",
        container="mp4",
        aspect_ratio="9:16",
        width=1080,
        height=1920,
        framing_mode="fill",
        crf=18,
        encoder_preset="medium",
        audio_codec="aac",
        audio_bitrate_kbps=192,
        target_lufs=-14.0,
        default_output_path="renders/reels_tiktok_9_16.mp4",
        description="Vertical 9:16 H.264 MP4 (1080x1920 fill crop) at CRF 18, AAC 192 kbps.",
        description_fr="MP4 H.264 vertical 9:16 (1080x1920 recadré), CRF 18, AAC 192 kbps.",
    ),
    DeliveryPreset(
        id="broadcast_prores_422",
        label="Broadcast ProRes 422",
        label_fr="Broadcast ProRes 422",
        badge="ProRes MOV",
        profile=RenderProfile.PRORES_HQ,
        codec_label="ProRes 422",
        container="mov",
        aspect_ratio="16:9",
        width=1920,
        height=1080,
        framing_mode="fill",
        crf=None,
        encoder_preset=None,
        audio_codec="pcm_s24le",
        audio_bitrate_kbps=None,
        target_lufs=-23.0,
        default_output_path="renders/broadcast_prores_422.mov",
        description=(
            "Broadcast ProRes 422 HQ MOV (10-bit 4:2:2), 24-bit PCM 48 kHz, -23 LUFS EBU R128."
        ),
        description_fr=(
            "MOV ProRes 422 HQ Broadcast (10 bits 4:2:2), PCM 24 bits 48 kHz, -23 LUFS EBU R128."
        ),
    ),
    DeliveryPreset(
        id="fast_draft_720p",
        label="Fast Draft 720p",
        label_fr="Brouillon Rapide 720p",
        badge="720p Draft",
        profile=RenderProfile.WEB_H264,
        codec_label="H.264",
        container="mp4",
        aspect_ratio="16:9",
        width=1280,
        height=720,
        framing_mode="fill",
        crf=26,
        encoder_preset="fast",
        audio_codec="aac",
        audio_bitrate_kbps=128,
        target_lufs=-14.0,
        default_output_path="renders/fast_draft_720p.mp4",
        description="Fast 720p H.264 review draft at CRF 26, AAC 128 kbps, fast encode.",
        description_fr="Brouillon rapide 720p H.264, CRF 26, AAC 128 kbps, encodage rapide.",
    ),
)

_DELIVERY_PRESET_MAP: dict[str, DeliveryPreset] = {p.id: p for p in DELIVERY_PRESETS}


def list_delivery_presets() -> list[DeliveryPreset]:
    """Return all curated quick-export delivery presets in deterministic display order."""
    return list(DELIVERY_PRESETS)


def get_delivery_preset(preset_id: str) -> DeliveryPreset:
    """Lookup a curated quick-export delivery preset by canonical id."""
    if not isinstance(preset_id, str):
        raise ValueError(f"delivery_preset must be a string, got {preset_id!r}")
    cleaned = preset_id.strip().lower()
    preset = _DELIVERY_PRESET_MAP.get(cleaned)
    if preset is None:
        allowed = ", ".join(_DELIVERY_PRESET_MAP.keys())
        raise ValueError(
            f"Unsupported delivery preset {preset_id!r}; expected one of: {allowed}"
        )
    return preset


class FramingCompileResult(BaseModel):
    """Compiled FFmpeg scale+crop/pad framing filtergraph and target raster."""

    filtergraph: str
    ffmpeg_vf_args: list[str]
    target_width: int
    target_height: int
    is_identity: bool
    params: FramingParams


def compile_framing_filter(params: FramingParams) -> str | None:
    """Compile validated FramingParams into a safe FFmpeg scale+crop (fill) or scale+pad (fit)."""
    if not params.enabled:
        return None
    w, h = params.target_dimensions()
    if params.mode == "fill":
        scale_part = (
            f"scale=w={w}:h={h}:force_original_aspect_ratio=increase:"
            "force_divisible_by=2:flags=lanczos"
        )
        x_expr = (
            f"(iw-{w})/2"
            if math.isclose(params.pan_x, 0.0, abs_tol=1e-6)
            else f"(iw-{w})/2*(1+({params.pan_x:.4f}))"
        )
        y_expr = (
            f"(ih-{h})/2"
            if math.isclose(params.pan_y, 0.0, abs_tol=1e-6)
            else f"(ih-{h})/2*(1+({params.pan_y:.4f}))"
        )
        crop_part = f"crop=w={w}:h={h}:x={x_expr}:y={y_expr}"
        return f"{scale_part},{crop_part},setsar=1"

    scale_part = (
        f"scale=w={w}:h={h}:force_original_aspect_ratio=decrease:"
        "force_divisible_by=2:flags=lanczos"
    )
    pad_part = f"pad=w={w}:h={h}:x=(ow-iw)/2:y=(oh-ih)/2:color=black"
    return f"{scale_part},{pad_part},setsar=1"


def compile_framing_filter_result(params: FramingParams) -> FramingCompileResult:
    """Compile framing parameters into structured filtergraph, argv slice, and target raster."""
    fg = compile_framing_filter(params) or ""
    w, h = params.target_dimensions()
    return FramingCompileResult(
        filtergraph=fg,
        ffmpeg_vf_args=["-vf", fg] if fg else [],
        target_width=w,
        target_height=h,
        is_identity=(fg == ""),
        params=params,
    )


ALLOWED_TRANSFORM_PIX_FMTS: frozenset[str] = frozenset(
    {"yuv420p", "yuv422p10le", "yuv444p", "rgba", "rgb24"}
)
DYNAMIC_ZOOM_DEFAULT_DURATION_S: float = 5.0
DYNAMIC_ZOOM_SCALE_FACTOR: float = 1.15
DYNAMIC_ZOOM_SCALE_DELTA: float = 0.15


def compile_dynamic_zoom_filter(
    preset: DynamicZoomPresetId | str,
    *,
    clip_duration_s: float | None = None,
) -> str | None:
    """Compile a Ken Burns / Dynamic Zoom preset into a deterministic FFmpeg filtergraph."""
    if not isinstance(preset, str):
        raise ValueError(f"dynamic_zoom must be a string, got {preset!r}")
    cleaned = preset.strip().lower()
    if cleaned not in ALLOWED_DYNAMIC_ZOOM_PRESETS:
        allowed = ", ".join(ALLOWED_DYNAMIC_ZOOM_PRESETS)
        raise ValueError(f"Unsupported dynamic_zoom preset {preset!r}; expected one of: {allowed}")
    if cleaned == "off":
        return None

    dur_s = DYNAMIC_ZOOM_DEFAULT_DURATION_S
    if clip_duration_s is not None:
        if (
            isinstance(clip_duration_s, bool)
            or not isinstance(clip_duration_s, (int, float))
            or not math.isfinite(float(clip_duration_s))
            or float(clip_duration_s) <= 0.0
            or float(clip_duration_s) > CLIP_DURATION_MAX_S
        ):
            raise ValueError(
                f"clip_duration_s must be within (0, {CLIP_DURATION_MAX_S}], "
                f"got {clip_duration_s!r}"
            )
        dur_s = max(0.1, float(clip_duration_s))

    progress_expr = f"min(1,t/{dur_s:.3f})"
    scale_str = f"{DYNAMIC_ZOOM_SCALE_FACTOR:.2f}"
    delta_str = f"{DYNAMIC_ZOOM_SCALE_DELTA:.2f}"

    if cleaned == "slow_zoom_in":
        scale_expr = f"1+{delta_str}*{progress_expr}"
        return (
            "split[dz_ref][dz_src];"
            f"[dz_src]scale=w='trunc(iw*({scale_expr})/2)*2':"
            f"h='trunc(ih*({scale_expr})/2)*2':eval=frame:flags=lanczos[dz_sc];"
            "[dz_ref][dz_sc]overlay=x='(W-w)/2':y='(H-h)/2':shortest=1,setsar=1"
        )
    if cleaned == "slow_zoom_out":
        scale_expr = f"{scale_str}-{delta_str}*{progress_expr}"
        return (
            "split[dz_ref][dz_src];"
            f"[dz_src]scale=w='trunc(iw*({scale_expr})/2)*2':"
            f"h='trunc(ih*({scale_expr})/2)*2':eval=frame:flags=lanczos[dz_sc];"
            "[dz_ref][dz_sc]overlay=x='(W-w)/2':y='(H-h)/2':shortest=1,setsar=1"
        )
    if cleaned == "pan_left_to_right":
        return (
            f"scale=w=ceil(iw*{scale_str}/2)*2:h=ceil(ih*{scale_str}/2)*2:flags=lanczos,"
            f"crop=w=trunc(iw/{scale_str}/2)*2:h=trunc(ih/{scale_str}/2)*2:"
            f"x='(iw-ow)*{progress_expr}':y='(ih-oh)/2',setsar=1"
        )
    # pan_right_to_left
    return (
        f"scale=w=ceil(iw*{scale_str}/2)*2:h=ceil(ih*{scale_str}/2)*2:flags=lanczos,"
        f"crop=w=trunc(iw/{scale_str}/2)*2:h=trunc(ih/{scale_str}/2)*2:"
        f"x='(iw-ow)*(1-{progress_expr})':y='(ih-oh)/2',setsar=1"
    )


class TransformCompileResult(BaseModel):
    """Compiled FFmpeg clip motion transform filtergraph and validated parameters."""

    filtergraph: str
    ffmpeg_vf_args: list[str]
    is_identity: bool
    params: ClipTransformParams


def compile_transform_filter(
    params: ClipTransformParams,
    *,
    pix_fmt: str | None = None,
    clip_duration_s: float | None = None,
) -> str | None:
    """Compile validated ClipTransformParams into a safe FFmpeg transform filtergraph."""
    if pix_fmt is not None and pix_fmt not in ALLOWED_TRANSFORM_PIX_FMTS:
        raise ValueError(f"Unsupported pixel format: {pix_fmt!r}")
    if params.is_identity():
        return None

    if params.opacity_pct <= 1e-6:
        parts = ["drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill", "setsar=1"]
        if pix_fmt is not None:
            parts.append(f"format={pix_fmt}")
        return ",".join(parts)

    dz_graph = compile_dynamic_zoom_filter(params.dynamic_zoom, clip_duration_s=clip_duration_s)
    if not params.has_static_transform():
        assert dz_graph is not None
        return f"{dz_graph},format={pix_fmt}" if pix_fmt is not None else dz_graph

    fg_steps: list[str] = []
    if not math.isclose(params.zoom_pct, 100.0, abs_tol=1e-4):
        zoom_scale = params.zoom_pct / 100.0
        fg_steps.append(
            f"scale=w=ceil(iw*{zoom_scale:.6f}/2)*2:h=ceil(ih*{zoom_scale:.6f}/2)*2:flags=lanczos"
        )

    has_rot = not math.isclose(params.rotation_deg, 0.0, abs_tol=1e-4)
    has_opacity = not math.isclose(params.opacity_pct, 100.0, abs_tol=1e-4)
    if has_rot or has_opacity:
        fg_steps.append("format=yuva420p")
    if has_rot:
        rad = params.rotation_deg * math.pi / 180.0
        fg_steps.append(f"rotate={rad:.6f}:ow=rotw({rad:.6f}):oh=roth({rad:.6f}):c=black@0")
    if has_opacity:
        alpha = params.opacity_pct / 100.0
        fg_steps.append(f"colorchannelmixer=aa={alpha:.4f}")

    dx = params.pos_x_pct / 100.0
    dy = params.pos_y_pct / 100.0
    x_expr = "(W-w)/2" if math.isclose(dx, 0.0, abs_tol=1e-6) else f"(W-w)/2+W*({dx:.4f})"
    y_expr = "(H-h)/2" if math.isclose(dy, 0.0, abs_tol=1e-6) else f"(H-h)/2+H*({dy:.4f})"

    fg_chain = ",".join(fg_steps)
    if fg_chain:
        graph = (
            "split[xf_bg][xf_fg];"
            "[xf_bg]drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill[xf_blk];"
            f"[xf_fg]{fg_chain}[xf_ov];"
            f"[xf_blk][xf_ov]overlay=x={x_expr}:y={y_expr}:shortest=1,setsar=1"
        )
    else:
        graph = (
            "split[xf_bg][xf_fg];"
            "[xf_bg]drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill[xf_blk];"
            f"[xf_blk][xf_fg]overlay=x={x_expr}:y={y_expr}:shortest=1,setsar=1"
        )

    if dz_graph is not None:
        graph = f"{dz_graph},{graph}"
    if pix_fmt is not None:
        graph = f"{graph},format={pix_fmt}"
    return graph


def compile_transform_filter_result(
    params: ClipTransformParams,
    *,
    pix_fmt: str | None = None,
    clip_duration_s: float | None = None,
) -> TransformCompileResult:
    """Compile clip transform parameters into structured filtergraph and argv slice."""
    fg = compile_transform_filter(params, pix_fmt=pix_fmt, clip_duration_s=clip_duration_s) or ""
    return TransformCompileResult(
        filtergraph=fg,
        ffmpeg_vf_args=["-vf", fg] if fg else [],
        is_identity=(fg == ""),
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


def _validate_encoder_preset(raw: str | None) -> str | None:
    if raw is None:
        return None
    if not isinstance(raw, str):
        raise ValueError(f"encoder_preset must be a string, got {raw!r}")
    cleaned = raw.strip().lower()
    if cleaned not in ENCODER_PRESET_MAP:
        allowed = ", ".join(ENCODER_PRESET_MAP.keys())
        raise ValueError(f"Unsupported encoder_preset {raw!r}; expected one of: {allowed}")
    return cleaned


def build_render_plan(
    input_path: Path,
    output_path: Path,
    profile: RenderProfile | None = None,
    fps: RationalFrameRate | None = None,
    lut_path: Path | None = None,
    color_grade: ColorGradeParams | None = None,
    chroma_key: ChromaKeyParams | None = None,
    fx_filtergraph: str | None = None,
    title_overlay: TitleOverlayParams | None = None,
    subtitle_track: SubtitleTrackParams | None = None,
    audio_params: ClipAudioParams | None = None,
    retime_params: ClipRetimeParams | None = None,
    transform_params: ClipTransformParams | None = None,
    framing: FramingParams | None = None,
    clip_duration_s: float | None = None,
    target_lufs: float | None = None,
    prefer_hw: bool = True,
    caps: HardwareCapabilities | None = None,
    ffmpeg_bin: str = "ffmpeg",
    *,
    delivery_preset: str | None = None,
    video_crf: int | None = None,
    audio_bitrate_kbps: int | None = None,
    encoder_preset: str | None = None,
    loudness_preset: LoudnessPresetId | None = None,
    dialogue_eq: DialogueEqPresetId | None = None,
    timecode_burnin: TimecodeBurnInPosition | None = None,
) -> RenderPlan:
    """Compile a deterministic FFmpeg command plan with CFR lock, GOP=2*fps, and Rec.709 tags."""
    preset_obj = get_delivery_preset(delivery_preset) if delivery_preset is not None else None
    resolved_loudness_preset: LoudnessPresetId = (
        validate_loudness_preset(loudness_preset) if loudness_preset is not None else "off"
    )
    resolved_dialogue_eq: DialogueEqPresetId = (
        validate_dialogue_eq(dialogue_eq) if dialogue_eq is not None else "off"
    )
    resolved_timecode_burnin: TimecodeBurnInPosition = (
        validate_timecode_burnin(timecode_burnin) if timecode_burnin is not None else "off"
    )
    resolved_profile = (
        profile
        if profile is not None
        else (preset_obj.profile if preset_obj is not None else RenderProfile.WEB_H264)
    )
    validated_crf = (
        _validate_bounded_int(video_crf, "video_crf", RENDER_CRF_MIN, RENDER_CRF_MAX)
        if video_crf is not None
        else None
    )
    validated_audio_kbps = (
        _validate_bounded_int(
            audio_bitrate_kbps,
            "audio_bitrate_kbps",
            RENDER_AUDIO_BITRATE_KBPS_MIN,
            RENDER_AUDIO_BITRATE_KBPS_MAX,
        )
        if audio_bitrate_kbps is not None
        else None
    )
    validated_enc_preset = _validate_encoder_preset(encoder_preset)

    hw = caps or probe_hardware_capabilities(ffmpeg_bin=ffmpeg_bin, verify_nvenc_runtime=prefer_hw)
    encoder = select_encoder(resolved_profile, hw, prefer_hw=prefer_hw)
    target_fps = fps or RationalFrameRate(num=25, den=1)
    gop = max(2, round(2 * target_fps.as_float))

    is_prores = resolved_profile == RenderProfile.PRORES_HQ
    pix_fmt = "yuv422p10le" if is_prores else "yuv420p"
    faststart = not is_prores

    effective_crf: int | None = None
    effective_audio_kbps: int | None = None
    effective_enc_preset: str | None = None
    if not is_prores:
        default_crf = 20 if resolved_profile == RenderProfile.MASTER_HEVC else 18
        effective_crf = (
            validated_crf
            if validated_crf is not None
            else (
                preset_obj.crf
                if preset_obj is not None and preset_obj.crf is not None
                else default_crf
            )
        )
        effective_audio_kbps = (
            validated_audio_kbps
            if validated_audio_kbps is not None
            else (
                preset_obj.audio_bitrate_kbps
                if preset_obj is not None and preset_obj.audio_bitrate_kbps is not None
                else 192
            )
        )
        effective_enc_preset = (
            validated_enc_preset
            if validated_enc_preset is not None
            else (
                preset_obj.encoder_preset
                if preset_obj is not None and preset_obj.encoder_preset is not None
                else "medium"
            )
        )

    effective_framing = framing
    if effective_framing is None and preset_obj is not None:
        effective_framing = FramingParams(
            preset=preset_obj.aspect_ratio,
            mode=preset_obj.framing_mode,
            target_width=preset_obj.width,
            target_height=preset_obj.height,
            enabled=True,
        )

    if loudness_preset is not None and resolved_loudness_preset != "off":
        effective_lufs: float | None = LOUDNESS_PRESET_LUFS[resolved_loudness_preset]
    elif loudness_preset is not None and resolved_loudness_preset == "off":
        effective_lufs = target_lufs
    else:
        effective_lufs = (
            target_lufs
            if target_lufs is not None
            else (preset_obj.target_lufs if preset_obj is not None else None)
        )

    retime_vf: str | None = None
    retime_af: str | None = None
    if retime_params is not None and not retime_params.is_identity():
        retime_vf, retime_af = compile_retime_filter(retime_params)

    framing_vf: str | None = None
    target_width: int | None = None
    target_height: int | None = None
    framing_mode: str | None = None
    if effective_framing is not None and effective_framing.enabled:
        framing_vf = compile_framing_filter(effective_framing)
        if framing_vf is not None:
            target_width, target_height = effective_framing.target_dimensions()
            framing_mode = effective_framing.mode

    transform_vf: str | None = None
    if transform_params is not None and not transform_params.is_identity():
        transform_vf = compile_transform_filter(
            transform_params,
            pix_fmt=pix_fmt,
            clip_duration_s=clip_duration_s,
        )

    vf_parts: list[str] = []
    if retime_vf is not None:
        vf_parts.append(retime_vf)
    if framing_vf is not None:
        vf_parts.append(framing_vf)
    if transform_vf is not None:
        vf_parts.append(transform_vf)
    if chroma_key is not None and chroma_key.is_active():
        ck_fg = compile_chroma_key_filter(chroma_key, pix_fmt=pix_fmt)
        if ck_fg:
            vf_parts.append(ck_fg)
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
    if subtitle_track is not None and subtitle_track.is_active():
        sub_fg = compile_subtitles_filter(subtitle_track, pix_fmt=pix_fmt)
        if sub_fg:
            vf_parts.append(sub_fg)
    tc_vf = compile_timecode_burnin_filter(resolved_timecode_burnin, target_fps)
    if tc_vf is not None:
        vf_parts.append(tc_vf)
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
    is_muted = audio_params is not None and audio_params.muted
    if not is_muted:
        eq_af = compile_dialogue_eq_filter(resolved_dialogue_eq)
        if eq_af is not None:
            af_parts.append(eq_af)
        if resolved_loudness_preset != "off":
            loud_af = compile_loudness_preset_filter(resolved_loudness_preset)
            if loud_af is not None:
                af_parts.append(loud_af)
        elif effective_lufs is not None:
            validated_lufs = _validate_bounded_float(
                effective_lufs,
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

    nvenc_preset, x26x_preset = ENCODER_PRESET_MAP[effective_enc_preset or "medium"]
    crf_h264 = effective_crf if effective_crf is not None else 18
    crf_hevc = effective_crf if effective_crf is not None else 20
    if encoder == "h264_nvenc":
        argv.extend(
            ["-preset", nvenc_preset, "-rc", "vbr", "-cq", str(crf_h264), "-b:v", "0"]
        )
    elif encoder == "hevc_nvenc":
        argv.extend(
            ["-preset", nvenc_preset, "-rc", "vbr", "-cq", str(crf_hevc), "-b:v", "0"]
        )
    elif encoder == "libx264":
        argv.extend(["-preset", x26x_preset, "-crf", str(crf_h264)])
    elif encoder == "libx265":
        argv.extend(["-preset", x26x_preset, "-crf", str(crf_hevc)])
    elif encoder == "prores_ks":
        argv.extend(["-profile:v", "3"])

    argv.extend(["-pix_fmt", pix_fmt, "-g", str(gop)])
    argv.extend(REC709_FFMPEG_FLAGS)

    if audio_filter is not None:
        argv.extend(["-af", audio_filter])

    if is_prores:
        argv.extend(["-c:a", "pcm_s24le", "-ar", "48000"])
    else:
        argv.extend(
            [
                "-c:a",
                "aac",
                "-b:a",
                f"{effective_audio_kbps or 192}k",
                "-ar",
                "48000",
                "-ac",
                "2",
            ]
        )

    if faststart:
        argv.extend(["-movflags", "+faststart"])

    argv.append(str(output_path))

    return RenderPlan(
        input_path=str(input_path),
        output_path=str(output_path),
        profile=resolved_profile,
        encoder=encoder,
        fps=target_fps,
        gop_frames=gop,
        pix_fmt=pix_fmt,
        faststart=faststart,
        delivery_preset=preset_obj.id if preset_obj is not None else None,
        video_crf=effective_crf,
        audio_bitrate_kbps=effective_audio_kbps,
        encoder_preset=effective_enc_preset,
        target_lufs=effective_lufs,
        loudness_preset=resolved_loudness_preset,
        dialogue_eq=resolved_dialogue_eq,
        timecode_burnin=resolved_timecode_burnin,
        target_width=target_width,
        target_height=target_height,
        framing_mode=framing_mode,
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
