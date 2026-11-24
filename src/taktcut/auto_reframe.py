"""Auto Reframe & Multi-Aspect Subject Tracking Studio (Premiere / Resolve Smart Reframe)."""

from __future__ import annotations

import hashlib
import math
import re
import shutil
import subprocess
from collections.abc import Sequence
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from taktcut.models import (
    ALLOWED_AUTO_REFRAME_ASPECT_RATIOS,
    ALLOWED_AUTO_REFRAME_MOTION_PRESETS,
    ALLOWED_AUTO_REFRAME_SUBJECT_PRIORITIES,
    AutoReframeAspectRatio,
    AutoReframeKeyframe,
    AutoReframeMotionPreset,
    AutoReframeSubjectPriority,
    ClipAutoReframeTrack,
    TimelineClip,
    TimelineDocument,
)
from taktcut.security import MEDIA_SUFFIXES, confine_workspace_path

AutoReframeProbeSource = Literal["ffmpeg_saliency", "procedural_saliency", "custom_samples"]

_ASPECT_ALIAS_MAP: dict[str, AutoReframeAspectRatio] = {
    "9:16": "9:16",
    "4:5": "4:5",
    "1:1": "1:1",
    "21:9": "21:9",
    "2.39:1": "21:9",
    "16:9": "16:9",
}

_MOTION_PRESET_TUNING: dict[AutoReframeMotionPreset, dict[str, Any]] = {
    "slower": {
        "label": "Slower Motion",
        "smoothing_window": 1.65,
        "deadband_threshold": 0.12,
        "max_pan_velocity": 0.28,
        "rdp_epsilon": 0.045,
        "description": "Tripod and dialogue stabilization with minimal camera drift.",
    },
    "default": {
        "label": "Default Motion",
        "smoothing_window": 0.85,
        "deadband_threshold": 0.06,
        "max_pan_velocity": 0.62,
        "rdp_epsilon": 0.028,
        "description": "Balanced natural subject follow for interviews and vlogs.",
    },
    "faster": {
        "label": "Faster Motion",
        "smoothing_window": 0.32,
        "deadband_threshold": 0.025,
        "max_pan_velocity": 1.45,
        "rdp_epsilon": 0.016,
        "description": "High-agility tracking for sports, dance, and rapid action.",
    },
}


class AutoReframeAspectSpec(BaseModel):
    """Target delivery aspect specification for multi-aspect Auto Reframe."""

    model_config = ConfigDict(extra="forbid")

    aspect_ratio: AutoReframeAspectRatio
    ratio_num: int = Field(ge=1)
    ratio_den: int = Field(ge=1)
    target_width: int = Field(ge=64)
    target_height: int = Field(ge=64)
    label: str
    platform_hint: str


class AutoReframeMotionSpec(BaseModel):
    """Motion damping and keyframe simplification preset specification."""

    model_config = ConfigDict(extra="forbid")

    preset: AutoReframeMotionPreset
    label: str
    smoothing_window: float
    deadband_threshold: float
    max_pan_velocity: float
    rdp_epsilon: float
    description: str


AUTO_REFRAME_ASPECT_SPECS: dict[AutoReframeAspectRatio, AutoReframeAspectSpec] = {
    "9:16": AutoReframeAspectSpec(
        aspect_ratio="9:16",
        ratio_num=9,
        ratio_den=16,
        target_width=1080,
        target_height=1920,
        label="9:16 Vertical",
        platform_hint="Reels / Shorts / TikTok",
    ),
    "4:5": AutoReframeAspectSpec(
        aspect_ratio="4:5",
        ratio_num=4,
        ratio_den=5,
        target_width=1080,
        target_height=1350,
        label="4:5 Portrait Feed",
        platform_hint="Instagram / LinkedIn Feed",
    ),
    "1:1": AutoReframeAspectSpec(
        aspect_ratio="1:1",
        ratio_num=1,
        ratio_den=1,
        target_width=1080,
        target_height=1080,
        label="1:1 Square",
        platform_hint="Square Social / Carousel",
    ),
    "21:9": AutoReframeAspectSpec(
        aspect_ratio="21:9",
        ratio_num=21,
        ratio_den=9,
        target_width=2560,
        target_height=1080,
        label="21:9 Cinemascope",
        platform_hint="Widescreen / Anamorphic",
    ),
    "16:9": AutoReframeAspectSpec(
        aspect_ratio="16:9",
        ratio_num=16,
        ratio_den=9,
        target_width=1920,
        target_height=1080,
        label="16:9 Landscape",
        platform_hint="YouTube / Broadcast HD",
    ),
}


class AutoReframeConfig(BaseModel):
    """Validated Auto Reframe subject-tracking and FFmpeg compilation settings."""

    model_config = ConfigDict(extra="forbid")

    enabled: bool = True
    aspect_ratio: AutoReframeAspectRatio = "9:16"
    motion_preset: AutoReframeMotionPreset = "default"
    subject_priority: AutoReframeSubjectPriority = "auto_saliency"
    source_width: int = Field(default=1920, ge=128, le=7680)
    source_height: int = Field(default=1080, ge=128, le=4320)
    fps: float = Field(default=25.0, ge=1.0, le=120.0)
    duration_s: float = Field(default=10.0, ge=0.2, le=86400.0)
    headroom_bias: float = Field(default=-0.12, ge=-0.5, le=0.5)
    smoothing_window: float = Field(default=0.85, ge=0.05, le=4.0)
    deadband_threshold: float = Field(default=0.06, ge=0.0, le=0.4)
    max_pan_velocity: float = Field(default=0.62, ge=0.05, le=3.0)
    rdp_epsilon: float = Field(default=0.028, ge=0.002, le=0.2)
    sample_interval_s: float = Field(default=0.4, ge=0.1, le=5.0)
    include_scale: bool = True

    @field_validator("aspect_ratio", mode="before")
    @classmethod
    def _validate_aspect_ratio(cls, raw: Any) -> AutoReframeAspectRatio:
        if not isinstance(raw, str):
            raise ValueError(f"aspect_ratio must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        canonical = _ASPECT_ALIAS_MAP.get(cleaned)
        if canonical is None:
            allowed = ", ".join(ALLOWED_AUTO_REFRAME_ASPECT_RATIOS)
            raise ValueError(f"Unsupported aspect_ratio {raw!r}; expected one of: {allowed}")
        return canonical

    @field_validator("motion_preset", mode="before")
    @classmethod
    def _validate_motion_preset(cls, raw: Any) -> AutoReframeMotionPreset:
        if not isinstance(raw, str):
            raise ValueError(f"motion_preset must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned == "slower":
            return "slower"
        if cleaned == "default":
            return "default"
        if cleaned == "faster":
            return "faster"
        allowed = ", ".join(ALLOWED_AUTO_REFRAME_MOTION_PRESETS)
        raise ValueError(f"Unsupported motion_preset {raw!r}; expected one of: {allowed}")

    @field_validator("subject_priority", mode="before")
    @classmethod
    def _validate_subject_priority(cls, raw: Any) -> AutoReframeSubjectPriority:
        if not isinstance(raw, str):
            raise ValueError(f"subject_priority must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned == "auto_saliency":
            return "auto_saliency"
        if cleaned == "face_headroom":
            return "face_headroom"
        if cleaned == "action_center":
            return "action_center"
        if cleaned == "manual_override":
            return "manual_override"
        allowed = ", ".join(ALLOWED_AUTO_REFRAME_SUBJECT_PRIORITIES)
        raise ValueError(f"Unsupported subject_priority {raw!r}; expected one of: {allowed}")


class AutoReframeSaliencySample(BaseModel):
    """Raw per-sample optical saliency subject observation before smoothing."""

    model_config = ConfigDict(extra="forbid")

    time_s: float = Field(ge=0.0, le=86400.0)
    frame: int = Field(ge=0)
    subject_x: float = Field(ge=0.0, le=1.0)
    subject_y: float = Field(ge=0.0, le=1.0)
    saliency_energy: float = Field(default=0.75, ge=0.0, le=1.0)
    confidence: float = Field(default=0.88, ge=0.0, le=1.0)


class AutoReframeStats(BaseModel):
    """Diagnostic tracking metrics and output dimensions for Auto Reframe."""

    model_config = ConfigDict(extra="forbid")

    raw_sample_count: int = Field(ge=1)
    keyframe_count: int = Field(ge=1)
    pan_travel_x: float = Field(ge=0.0)
    pan_travel_y: float = Field(ge=0.0)
    avg_confidence: float = Field(ge=0.0, le=1.0)
    peak_velocity: float = Field(ge=0.0)
    smoothness_score: float = Field(ge=0.0, le=100.0)
    crop_width: int = Field(ge=2)
    crop_height: int = Field(ge=2)
    output_width: int = Field(ge=2)
    output_height: int = Field(ge=2)


class AutoReframeCompileResult(BaseModel):
    """Compiled FFmpeg piecewise-linear crop + scale filtergraph for Auto Reframe."""

    model_config = ConfigDict(extra="forbid")

    filtergraph: str
    ffmpeg_vf_args: list[str]
    crop_width: int = Field(ge=2)
    crop_height: int = Field(ge=2)
    output_width: int = Field(ge=2)
    output_height: int = Field(ge=2)
    aspect_ratio: AutoReframeAspectRatio
    keyframe_count: int = Field(ge=0)
    is_active: bool
    x_expr: str
    y_expr: str
    warnings: list[str] = Field(default_factory=list)


class AutoReframeAnalysisResult(BaseModel):
    """Complete Auto Reframe subject-tracking analysis, smoothed keyframes, and FFmpeg graph."""

    model_config = ConfigDict(extra="forbid")

    config: AutoReframeConfig
    raw_samples: list[AutoReframeSaliencySample]
    keyframes: list[AutoReframeKeyframe]
    stats: AutoReframeStats
    compiled: AutoReframeCompileResult
    probe_source: AutoReframeProbeSource
    clip_name: str = ""
    warnings: list[str] = Field(default_factory=list)


class AutoReframeApplyResult(BaseModel):
    """Outcome of attaching or clearing Auto Reframe keyframes on a TimelineClip."""

    model_config = ConfigDict(extra="forbid")

    changed: bool
    track_kind: Literal["video", "audio"]
    track_index: int = Field(ge=1)
    clip_index: int = Field(ge=0)
    clip_name: str
    auto_reframe: ClipAutoReframeTrack | None = None
    compiled: AutoReframeCompileResult | None = None
    document: TimelineDocument


def list_auto_reframe_aspect_specs() -> list[AutoReframeAspectSpec]:
    """Return ordered list of supported Auto Reframe target aspect ratios."""
    return [AUTO_REFRAME_ASPECT_SPECS[key] for key in ALLOWED_AUTO_REFRAME_ASPECT_RATIOS]


def list_auto_reframe_motion_presets() -> list[AutoReframeMotionSpec]:
    """Return ordered list of motion-smoothing presets (Slower, Default, Faster)."""
    return [
        AutoReframeMotionSpec(preset=key, **_MOTION_PRESET_TUNING[key])
        for key in ALLOWED_AUTO_REFRAME_MOTION_PRESETS
    ]


def normalize_auto_reframe_config(raw: Any) -> AutoReframeConfig:
    """Validate and normalize AutoReframeConfig, applying motion preset defaults when omitted."""
    if isinstance(raw, AutoReframeConfig):
        return raw
    if raw is None:
        return AutoReframeConfig()
    if not isinstance(raw, dict):
        raise ValueError(f"AutoReframeConfig must be an object or None, got {type(raw).__name__}")

    data = dict(raw)
    preset_raw = data.get("motion_preset", "default")
    preset_key: AutoReframeMotionPreset = "default"
    if isinstance(preset_raw, str):
        cleaned = preset_raw.strip().lower()
        if cleaned == "slower":
            preset_key = "slower"
        elif cleaned == "faster":
            preset_key = "faster"
        elif cleaned == "default":
            preset_key = "default"
    preset_defaults = _MOTION_PRESET_TUNING[preset_key]

    for field_name in ("smoothing_window", "deadband_threshold", "max_pan_velocity", "rdp_epsilon"):
        if field_name not in data or data[field_name] is None:
            data[field_name] = preset_defaults[field_name]

    if "headroom_bias" not in data or data["headroom_bias"] is None:
        if data.get("subject_priority") == "face_headroom":
            data["headroom_bias"] = -0.18
        elif data.get("subject_priority") == "action_center":
            data["headroom_bias"] = 0.0

    return AutoReframeConfig.model_validate(data)


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(value)))


def _even_int(value: float, minimum: int = 2, maximum: int = 8192) -> int:
    rounded = int(round(value))
    even = max(minimum, min(maximum, (rounded // 2) * 2))
    if even < minimum:
        even = minimum
    return even


def compute_crop_geometry(
    source_width: int,
    source_height: int,
    aspect_ratio: AutoReframeAspectRatio,
) -> tuple[int, int, int, int]:
    """Compute even-aligned crop dimensions (crop_w, crop_h, slack_x, slack_y)."""
    spec = AUTO_REFRAME_ASPECT_SPECS[aspect_ratio]
    sw = max(64, int(source_width))
    sh = max(64, int(source_height))
    src_aspect = sw / sh
    target_aspect = spec.ratio_num / spec.ratio_den

    if src_aspect > target_aspect + 1e-6:
        crop_h = _even_int(sh, 2, sh)
        crop_w = _even_int(crop_h * target_aspect, 2, sw)
    elif src_aspect < target_aspect - 1e-6:
        crop_w = _even_int(sw, 2, sw)
        crop_h = _even_int(crop_w / target_aspect, 2, sh)
    else:
        crop_w = _even_int(sw, 2, sw)
        crop_h = _even_int(sh, 2, sh)

    slack_x = max(0, sw - crop_w)
    slack_y = max(0, sh - crop_h)
    return crop_w, crop_h, slack_x, slack_y


def subject_to_pan(
    subject_x: float,
    subject_y: float,
    source_width: int,
    source_height: int,
    aspect_ratio: AutoReframeAspectRatio,
    headroom_bias: float = -0.12,
) -> tuple[float, float]:
    """Map normalized subject position (0..1, 0..1) into normalized crop pan (-1..1, -1..1)."""
    crop_w, crop_h, slack_x, slack_y = compute_crop_geometry(
        source_width, source_height, aspect_ratio
    )
    sx = _clamp(subject_x, 0.0, 1.0)
    sy = _clamp(subject_y, 0.0, 1.0)

    if slack_x <= 0:
        pan_x = 0.0
    else:
        desired_x = sx * source_width - crop_w * 0.5
        clamped_x = _clamp(desired_x, 0.0, float(slack_x))
        pan_x = (clamped_x / slack_x) * 2.0 - 1.0

    if slack_y <= 0:
        pan_y = 0.0
    else:
        desired_y = sy * source_height - crop_h * (0.5 + headroom_bias * 0.35)
        clamped_y = _clamp(desired_y, 0.0, float(slack_y))
        pan_y = (clamped_y / slack_y) * 2.0 - 1.0

    return round(_clamp(pan_x, -1.0, 1.0), 4), round(_clamp(pan_y, -1.0, 1.0), 4)


def pan_to_subject(
    pan_x: float,
    pan_y: float,
    source_width: int,
    source_height: int,
    aspect_ratio: AutoReframeAspectRatio,
) -> tuple[float, float]:
    """Invert normalized crop pan (-1..1) back to approximate subject center (0..1)."""
    crop_w, crop_h, slack_x, slack_y = compute_crop_geometry(
        source_width, source_height, aspect_ratio
    )
    px = _clamp(pan_x, -1.0, 1.0)
    py = _clamp(pan_y, -1.0, 1.0)
    crop_x = slack_x * 0.5 * (1.0 + px)
    crop_y = slack_y * 0.5 * (1.0 + py)
    sx = (crop_x + crop_w * 0.5) / max(1, source_width)
    sy = (crop_y + crop_h * 0.5) / max(1, source_height)
    return round(_clamp(sx, 0.0, 1.0), 4), round(_clamp(sy, 0.0, 1.0), 4)


_CROPDETECT_RE = re.compile(
    r"t:(?P<time>[0-9]+(?:\.[0-9]+)?)\s+crop=(?P<w>\d+):(?P<h>\d+):(?P<x>\d+):(?P<y>\d+)"
)


def parse_ffmpeg_cropdetect_saliency(
    stderr_text: str,
    source_width: int,
    source_height: int,
    fps: float,
) -> list[AutoReframeSaliencySample]:
    """Parse FFmpeg cropdetect timestamps and active-region centers into saliency samples."""
    samples: list[AutoReframeSaliencySample] = []
    seen_times: set[int] = set()
    sw = max(1, int(source_width))
    sh = max(1, int(source_height))
    for match in _CROPDETECT_RE.finditer(stderr_text or ""):
        t_val = float(match.group("time"))
        cw = float(match.group("w"))
        ch = float(match.group("h"))
        cx = float(match.group("x"))
        cy = float(match.group("y"))
        bucket = int(round(t_val * 5.0))
        if bucket in seen_times:
            continue
        seen_times.add(bucket)
        subj_x = _clamp((cx + cw * 0.5) / sw, 0.05, 0.95)
        subj_y = _clamp((cy + ch * 0.5) / sh, 0.05, 0.95)
        area_ratio = _clamp((cw * ch) / (sw * sh), 0.1, 1.0)
        conf = _clamp(0.76 + (1.0 - area_ratio) * 0.22, 0.55, 0.98)
        samples.append(
            AutoReframeSaliencySample(
                time_s=round(t_val, 3),
                frame=max(0, int(round(t_val * fps))),
                subject_x=round(subj_x, 4),
                subject_y=round(subj_y, 4),
                saliency_energy=round(_clamp(0.65 + (1.0 - area_ratio) * 0.35, 0.2, 1.0), 4),
                confidence=round(conf, 4),
            )
        )
    return samples


def _probe_ffmpeg_saliency(
    media_path: str,
    workspace_root: Path | None,
    config: AutoReframeConfig,
) -> list[AutoReframeSaliencySample] | None:
    """Run bounded FFmpeg cropdetect probe on a confined workspace media file."""
    ffmpeg_bin = shutil.which("ffmpeg")
    if not ffmpeg_bin or workspace_root is None:
        return None
    confined = confine_workspace_path(
        workspace_root,
        media_path,
        must_exist=True,
        allowed_suffixes=MEDIA_SUFFIXES,
    )
    if not confined.is_file():
        return None

    probe_dur = min(float(config.duration_s), 30.0)
    cmd = [
        ffmpeg_bin,
        "-hide_banner",
        "-nostats",
        "-t",
        f"{probe_dur:.2f}",
        "-i",
        str(confined),
        "-vf",
        "fps=2.5,cropdetect=24:16:0",
        "-f",
        "null",
        "-",
    ]
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if proc.returncode != 0:
        return None
    parsed = parse_ffmpeg_cropdetect_saliency(
        proc.stderr or "",
        config.source_width,
        config.source_height,
        config.fps,
    )
    return parsed if len(parsed) >= 2 else None


def synthesize_subject_trajectory(
    config: AutoReframeConfig,
    *,
    seed_key: str = "taktcut_clip",
) -> list[AutoReframeSaliencySample]:
    """Generate deterministic multi-subject optical saliency curve over clip duration."""
    digest = hashlib.sha256(seed_key.encode("utf-8")).digest()
    phase = (digest[0] / 255.0) * math.tau
    amp_x = 0.22 + (digest[1] / 255.0) * 0.18
    amp_y = 0.08 + (digest[2] / 255.0) * 0.09
    cut_norm = 0.48 + (digest[3] / 255.0) * 0.16

    dur = max(0.2, float(config.duration_s))
    step = max(0.1, min(config.sample_interval_s, dur / 4.0))
    count = max(3, min(180, int(math.floor(dur / step)) + 1))

    base_y = 0.38 if config.subject_priority == "face_headroom" else 0.48
    if config.subject_priority == "action_center":
        amp_x = min(0.42, amp_x * 1.32)

    samples: list[AutoReframeSaliencySample] = []
    for idx in range(count):
        u = idx / max(1, count - 1)
        t_s = round(u * dur, 3)
        frame = max(0, int(round(t_s * config.fps)))
        if config.subject_priority == "manual_override":
            sx = 0.5 + math.sin(u * math.pi * 1.2 + phase) * 0.12
            sy = base_y
        elif u < cut_norm:
            sx = 0.5 + math.sin(u * math.pi * 2.1 + phase) * amp_x
            sy = base_y + math.cos(u * math.pi * 1.5 + phase) * amp_y
        else:
            # Simulate a speaker/action cut shift on second half of clip
            sx = 0.5 - math.cos((u - cut_norm) * math.pi * 2.4 + phase) * (amp_x * 0.92)
            sy = base_y + math.sin((u - cut_norm) * math.pi * 1.8) * amp_y
        energy = _clamp(0.68 + 0.24 * abs(math.cos(u * math.pi * 3.0 + phase)), 0.35, 0.99)
        conf = _clamp(0.84 + 0.13 * math.sin(u * math.pi + 0.4), 0.62, 0.99)
        samples.append(
            AutoReframeSaliencySample(
                time_s=t_s,
                frame=frame,
                subject_x=round(_clamp(sx, 0.08, 0.92), 4),
                subject_y=round(_clamp(sy, 0.12, 0.88), 4),
                saliency_energy=round(energy, 4),
                confidence=round(conf, 4),
            )
        )
    return samples


def _rdp_simplify_indices(
    points: Sequence[tuple[float, float, float]],
    epsilon: float,
) -> list[int]:
    """Simplify 2D pan trajectory (t_norm, pan_x, pan_y) via Ramer-Douglas-Peucker."""
    n = len(points)
    if n <= 2:
        return list(range(n))

    keep = [False] * n
    keep[0] = True
    keep[-1] = True
    stack: list[tuple[int, int]] = [(0, n - 1)]

    while stack:
        start_idx, end_idx = stack.pop()
        if end_idx - start_idx <= 1:
            continue
        t0, x0, y0 = points[start_idx]
        t1, x1, y1 = points[end_idx]
        dt = max(1e-6, t1 - t0)
        max_dist = -1.0
        split_idx = -1
        for i in range(start_idx + 1, end_idx):
            ti, xi, yi = points[i]
            alpha = (ti - t0) / dt
            proj_x = x0 + (x1 - x0) * alpha
            proj_y = y0 + (y1 - y0) * alpha
            dist = math.hypot(xi - proj_x, yi - proj_y)
            if dist > max_dist:
                max_dist = dist
                split_idx = i
        if max_dist > epsilon and split_idx != -1:
            keep[split_idx] = True
            stack.append((start_idx, split_idx))
            stack.append((split_idx, end_idx))

    return [idx for idx, flag in enumerate(keep) if flag]


def solve_smoothed_pan_keyframes(
    raw_samples: Sequence[AutoReframeSaliencySample],
    config: AutoReframeConfig,
) -> list[AutoReframeKeyframe]:
    """Apply deadband, velocity limiting, cut-snap, and RDP reduction to raw saliency samples."""
    ordered = sorted(raw_samples, key=lambda s: (s.time_s, s.frame))
    if not ordered:
        return [
            AutoReframeKeyframe(
                time_s=0.0,
                frame=0,
                pan_x=0.0,
                pan_y=0.0,
                subject_x=0.5,
                subject_y=0.44,
                confidence=1.0,
                is_manual=False,
            )
        ]

    raw_pans: list[tuple[float, float]] = [
        subject_to_pan(
            s.subject_x,
            s.subject_y,
            config.source_width,
            config.source_height,
            config.aspect_ratio,
            config.headroom_bias,
        )
        for s in ordered
    ]

    smoothed: list[tuple[float, float]] = []
    cur_x, cur_y = raw_pans[0]
    smoothed.append((cur_x, cur_y))

    for idx in range(1, len(ordered)):
        dt = max(0.02, ordered[idx].time_s - ordered[idx - 1].time_s)
        tgt_x, tgt_y = raw_pans[idx]
        raw_jump = math.hypot(
            ordered[idx].subject_x - ordered[idx - 1].subject_x,
            ordered[idx].subject_y - ordered[idx - 1].subject_y,
        )

        # Hard scene-cut snap if subject jumps across frame between adjacent samples
        if raw_jump > 0.42:
            cur_x, cur_y = tgt_x, tgt_y
            smoothed.append((round(cur_x, 4), round(cur_y, 4)))
            continue

        # Deadband hysteresis prevents jitter on stationary subjects
        err_x = tgt_x - cur_x
        err_y = tgt_y - cur_y
        if math.hypot(err_x, err_y) <= config.deadband_threshold:
            smoothed.append((round(cur_x, 4), round(cur_y, 4)))
            continue

        alpha = 1.0 - math.exp(-dt / max(0.05, config.smoothing_window * 0.42))
        step_x = err_x * alpha
        step_y = err_y * alpha
        max_step = config.max_pan_velocity * dt
        step_mag = math.hypot(step_x, step_y)
        if step_mag > max_step and step_mag > 1e-6:
            scale = max_step / step_mag
            step_x *= scale
            step_y *= scale

        cur_x = _clamp(cur_x + step_x, -1.0, 1.0)
        cur_y = _clamp(cur_y + step_y, -1.0, 1.0)
        smoothed.append((round(cur_x, 4), round(cur_y, 4)))

    dur = max(0.2, ordered[-1].time_s - ordered[0].time_s)
    rdp_input = [
        ((ordered[i].time_s - ordered[0].time_s) / dur, smoothed[i][0], smoothed[i][1])
        for i in range(len(ordered))
    ]
    kept_indices = _rdp_simplify_indices(rdp_input, config.rdp_epsilon)
    if len(kept_indices) > 48:
        stride = max(1, len(kept_indices) // 48)
        kept_indices = sorted(
            set([kept_indices[0], kept_indices[-1], *kept_indices[::stride]])
        )

    keyframes: list[AutoReframeKeyframe] = []
    for i in kept_indices:
        smp = ordered[i]
        px, py = smoothed[i]
        sx, sy = pan_to_subject(
            px, py, config.source_width, config.source_height, config.aspect_ratio
        )
        keyframes.append(
            AutoReframeKeyframe(
                time_s=round(smp.time_s, 3),
                frame=smp.frame,
                pan_x=round(px, 4),
                pan_y=round(py, 4),
                subject_x=sx,
                subject_y=sy,
                confidence=smp.confidence,
                is_manual=False,
            )
        )
    return keyframes


def evaluate_auto_reframe_at_time(
    keyframes: Sequence[AutoReframeKeyframe],
    time_s: float,
) -> AutoReframeKeyframe:
    """Evaluate smoothly interpolated Auto Reframe pan and subject position at time_s."""
    ordered = sorted(keyframes, key=lambda kf: (kf.time_s, kf.frame))
    if not ordered:
        return AutoReframeKeyframe(
            time_s=max(0.0, float(time_s)),
            frame=0,
            pan_x=0.0,
            pan_y=0.0,
            subject_x=0.5,
            subject_y=0.44,
            confidence=1.0,
            is_manual=False,
        )
    t_val = max(0.0, float(time_s))
    if t_val <= ordered[0].time_s or len(ordered) == 1:
        first = ordered[0]
        return first.model_copy(update={"time_s": round(t_val, 3)})
    if t_val >= ordered[-1].time_s:
        last = ordered[-1]
        return last.model_copy(update={"time_s": round(t_val, 3)})

    for idx in range(len(ordered) - 1):
        a = ordered[idx]
        b = ordered[idx + 1]
        if t_val <= b.time_s:
            span = b.time_s - a.time_s
            if span <= 1e-6:
                return b.model_copy(update={"time_s": round(t_val, 3)})
            u = _clamp((t_val - a.time_s) / span, 0.0, 1.0)
            # Cosine smoothstep easing for organic pan acceleration/deceleration
            eased = u * u * (3.0 - 2.0 * u)
            return AutoReframeKeyframe(
                time_s=round(t_val, 3),
                frame=int(round(a.frame + (b.frame - a.frame) * u)),
                pan_x=round(a.pan_x + (b.pan_x - a.pan_x) * eased, 4),
                pan_y=round(a.pan_y + (b.pan_y - a.pan_y) * eased, 4),
                subject_x=round(a.subject_x + (b.subject_x - a.subject_x) * eased, 4),
                subject_y=round(a.subject_y + (b.subject_y - a.subject_y) * eased, 4),
                confidence=round(a.confidence + (b.confidence - a.confidence) * u, 4),
                is_manual=a.is_manual or b.is_manual,
            )
    return ordered[-1]


def _build_piecewise_pan_expr(
    keyframes: Sequence[AutoReframeKeyframe],
    axis: Literal["x", "y"],
) -> str:
    """Build bounded FFmpeg piecewise linear expression for pan_x or pan_y over t."""
    if not keyframes:
        return "0"
    ordered = sorted(keyframes, key=lambda kf: (kf.time_s, kf.frame))
    vals = [kf.pan_x if axis == "x" else kf.pan_y for kf in ordered]
    if len(ordered) == 1 or all(math.isclose(v, vals[0], abs_tol=1e-4) for v in vals):
        return f"{vals[0]:.4f}"

    expr = f"{vals[-1]:.4f}"
    for idx in range(len(ordered) - 2, -1, -1):
        t0 = ordered[idx].time_s
        t1 = ordered[idx + 1].time_s
        v0 = vals[idx]
        v1 = vals[idx + 1]
        dt = t1 - t0
        if dt <= 1e-4 or math.isclose(v0, v1, abs_tol=1e-4):
            seg_expr = f"{v0:.4f}"
        else:
            slope = (v1 - v0) / dt
            seg_expr = f"({v0:.4f}+({slope:.5f})*(t-{t0:.3f}))"
        expr = f"if(lt(t,{t1:.3f}),{seg_expr},{expr})"
    return expr


def compile_auto_reframe_filtergraph(
    config: AutoReframeConfig,
    keyframes: Sequence[AutoReframeKeyframe],
    *,
    include_scale: bool | None = None,
) -> AutoReframeCompileResult:
    """Compile validated Auto Reframe keyframes into a bounded FFmpeg crop+scale filtergraph."""
    spec = AUTO_REFRAME_ASPECT_SPECS[config.aspect_ratio]
    crop_w, crop_h, slack_x, slack_y = compute_crop_geometry(
        config.source_width, config.source_height, config.aspect_ratio
    )
    use_scale = config.include_scale if include_scale is None else bool(include_scale)
    warnings: list[str] = []

    if not config.enabled:
        return AutoReframeCompileResult(
            filtergraph="null",
            ffmpeg_vf_args=[],
            crop_width=crop_w,
            crop_height=crop_h,
            output_width=spec.target_width,
            output_height=spec.target_height,
            aspect_ratio=config.aspect_ratio,
            keyframe_count=len(keyframes),
            is_active=False,
            x_expr="0",
            y_expr="0",
            warnings=["Auto Reframe is disabled; returning pass-through filtergraph."],
        )

    ordered = sorted(keyframes, key=lambda kf: (kf.time_s, kf.frame))
    if slack_x <= 0:
        x_expr = "0"
    else:
        pan_x_expr = _build_piecewise_pan_expr(ordered, "x")
        x_expr = f"max(0,min(iw-ow,(iw-ow)/2*(1+({pan_x_expr}))))"

    if slack_y <= 0:
        y_expr = "0"
    else:
        pan_y_expr = _build_piecewise_pan_expr(ordered, "y")
        y_expr = f"max(0,min(ih-oh,(ih-oh)/2*(1+({pan_y_expr}))))"

    crop_stage = f"crop=w={crop_w}:h={crop_h}:x='{x_expr}':y='{y_expr}'"
    if use_scale:
        fg = f"{crop_stage},scale={spec.target_width}:{spec.target_height}:flags=lanczos,setsar=1"
    else:
        fg = f"{crop_stage},setsar=1"

    return AutoReframeCompileResult(
        filtergraph=fg,
        ffmpeg_vf_args=["-vf", fg],
        crop_width=crop_w,
        crop_height=crop_h,
        output_width=spec.target_width if use_scale else crop_w,
        output_height=spec.target_height if use_scale else crop_h,
        aspect_ratio=config.aspect_ratio,
        keyframe_count=len(ordered),
        is_active=True,
        x_expr=x_expr,
        y_expr=y_expr,
        warnings=warnings,
    )


def _compute_stats(
    raw_samples: Sequence[AutoReframeSaliencySample],
    keyframes: Sequence[AutoReframeKeyframe],
    config: AutoReframeConfig,
    compiled: AutoReframeCompileResult,
) -> AutoReframeStats:
    travel_x = 0.0
    travel_y = 0.0
    peak_vel = 0.0
    for idx in range(1, len(keyframes)):
        dx = abs(keyframes[idx].pan_x - keyframes[idx - 1].pan_x)
        dy = abs(keyframes[idx].pan_y - keyframes[idx - 1].pan_y)
        dt = max(0.05, keyframes[idx].time_s - keyframes[idx - 1].time_s)
        travel_x += dx
        travel_y += dy
        peak_vel = max(peak_vel, math.hypot(dx, dy) / dt)

    avg_conf = (
        sum(kf.confidence for kf in keyframes) / len(keyframes)
        if keyframes
        else 1.0
    )
    raw_jitter = 0.0
    for idx in range(1, len(raw_samples)):
        raw_jitter += abs(raw_samples[idx].subject_x - raw_samples[idx - 1].subject_x)
    kf_jitter = travel_x * 0.5
    if raw_jitter > 1e-4:
        ratio = min(1.0, kf_jitter / (raw_jitter * 1.4 + 0.1))
        smoothness = _clamp(100.0 * (1.0 - ratio), 45.0, 99.5)
    else:
        smoothness = 98.5

    return AutoReframeStats(
        raw_sample_count=max(1, len(raw_samples)),
        keyframe_count=max(1, len(keyframes)),
        pan_travel_x=round(travel_x, 3),
        pan_travel_y=round(travel_y, 3),
        avg_confidence=round(avg_conf, 4),
        peak_velocity=round(peak_vel, 3),
        smoothness_score=round(smoothness, 1),
        crop_width=compiled.crop_width,
        crop_height=compiled.crop_height,
        output_width=compiled.output_width,
        output_height=compiled.output_height,
    )


def analyze_auto_reframe_clip(
    *,
    config: AutoReframeConfig | dict[str, Any] | None = None,
    clip_name: str = "Sequence Clip",
    media_path: str | None = None,
    workspace_root: Path | None = None,
    execute_ffmpeg: bool = False,
    custom_samples: Sequence[dict[str, Any] | AutoReframeSaliencySample] | None = None,
) -> AutoReframeAnalysisResult:
    """Analyze subject saliency across a clip and solve smoothed Auto Reframe keyframes."""
    cfg = normalize_auto_reframe_config(config)
    warnings: list[str] = []
    probe_source: AutoReframeProbeSource = "procedural_saliency"
    raw_samples: list[AutoReframeSaliencySample] = []

    if custom_samples is not None and len(custom_samples) > 0:
        for item in custom_samples:
            if isinstance(item, AutoReframeSaliencySample):
                raw_samples.append(item)
            else:
                raw_samples.append(AutoReframeSaliencySample.model_validate(item))
        probe_source = "custom_samples"
    else:
        if execute_ffmpeg and media_path:
            probed = _probe_ffmpeg_saliency(media_path, workspace_root, cfg)
            if probed:
                raw_samples = probed
                probe_source = "ffmpeg_saliency"
            else:
                warnings.append(
                    "FFmpeg saliency probe unavailable or sparse; "
                    "using optical saliency synthesis."
                )
        if not raw_samples:
            seed = f"{clip_name}|{media_path or ''}|{cfg.subject_priority}|{cfg.duration_s:.2f}"
            raw_samples = synthesize_subject_trajectory(cfg, seed_key=seed)
            probe_source = "procedural_saliency"

    keyframes = solve_smoothed_pan_keyframes(raw_samples, cfg)
    compiled = compile_auto_reframe_filtergraph(cfg, keyframes)
    stats = _compute_stats(raw_samples, keyframes, cfg, compiled)
    return AutoReframeAnalysisResult(
        config=cfg,
        raw_samples=raw_samples,
        keyframes=keyframes,
        stats=stats,
        compiled=compiled,
        probe_source=probe_source,
        clip_name=clip_name,
        warnings=warnings,
    )


def _locate_clip(
    doc: TimelineDocument,
    track_kind: Literal["video", "audio"],
    track_index: int,
    clip_index: int,
) -> tuple[int, TimelineClip]:
    for t_idx, track in enumerate(doc.tracks):
        if track.kind == track_kind and track.index == track_index:
            if clip_index < 0 or clip_index >= len(track.clips):
                raise ValueError(
                    f"clip_index {clip_index} out of range for {track_kind} track {track_index}"
                )
            return t_idx, track.clips[clip_index]
    raise ValueError(f"Track {track_kind} #{track_index} not found in TimelineDocument")


def apply_auto_reframe_to_document(
    doc: TimelineDocument,
    *,
    track_kind: Literal["video", "audio"] = "video",
    track_index: int = 1,
    clip_index: int = 0,
    config: AutoReframeConfig | dict[str, Any] | None = None,
    keyframes: Sequence[AutoReframeKeyframe | dict[str, Any]] | None = None,
) -> AutoReframeApplyResult:
    """Attach non-destructive ClipAutoReframeTrack keyframes onto a TimelineClip."""
    if track_kind != "video":
        raise ValueError("Auto Reframe can only be applied to video tracks")
    cfg = normalize_auto_reframe_config(config)
    t_idx, target_clip = _locate_clip(doc, track_kind, track_index, clip_index)

    validated_kfs: list[AutoReframeKeyframe] = []
    if keyframes:
        for raw_kf in keyframes:
            if isinstance(raw_kf, AutoReframeKeyframe):
                validated_kfs.append(raw_kf)
            else:
                validated_kfs.append(AutoReframeKeyframe.model_validate(raw_kf))
    else:
        fps_val = doc.fps.as_float if doc.fps else cfg.fps
        dur_s = max(0.2, target_clip.duration_frames / max(1.0, fps_val))
        analysis = analyze_auto_reframe_clip(
            config=cfg.model_copy(update={"fps": fps_val, "duration_s": dur_s}),
            clip_name=target_clip.name,
            media_path=target_clip.source_path or None,
        )
        validated_kfs = analysis.keyframes

    track_model = ClipAutoReframeTrack(
        enabled=cfg.enabled,
        aspect_ratio=cfg.aspect_ratio,
        motion_preset=cfg.motion_preset,
        subject_priority=cfg.subject_priority,
        headroom_bias=cfg.headroom_bias,
        keyframes=validated_kfs,
    )
    compiled = compile_auto_reframe_filtergraph(cfg, track_model.keyframes)

    next_doc = doc.model_copy(deep=True)
    next_doc.tracks[t_idx].clips[clip_index].auto_reframe = track_model
    return AutoReframeApplyResult(
        changed=True,
        track_kind=track_kind,
        track_index=track_index,
        clip_index=clip_index,
        clip_name=target_clip.name,
        auto_reframe=track_model,
        compiled=compiled,
        document=next_doc,
    )


def clear_auto_reframe_from_document(
    doc: TimelineDocument,
    *,
    track_kind: Literal["video", "audio"] = "video",
    track_index: int = 1,
    clip_index: int = 0,
) -> AutoReframeApplyResult:
    """Remove Auto Reframe tracking metadata from a TimelineClip."""
    t_idx, target_clip = _locate_clip(doc, track_kind, track_index, clip_index)
    had_reframe = target_clip.auto_reframe is not None
    next_doc = doc.model_copy(deep=True)
    next_doc.tracks[t_idx].clips[clip_index].auto_reframe = None
    return AutoReframeApplyResult(
        changed=had_reframe,
        track_kind=track_kind,
        track_index=track_index,
        clip_index=clip_index,
        clip_name=target_clip.name,
        auto_reframe=None,
        compiled=None,
        document=next_doc,
    )
