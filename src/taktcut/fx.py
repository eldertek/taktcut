"""Sapphire-inspired deterministic video FX stack and FFmpeg filtergraph compiler."""

from __future__ import annotations

import math
import re
from collections.abc import Sequence
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

FxType = Literal[
    "glow",
    "shake",
    "flicker",
    "lens_flare",
    "film_damage",
    "chroma_aberration",
]

FX_TYPES: tuple[FxType, ...] = (
    "glow",
    "shake",
    "flicker",
    "lens_flare",
    "film_damage",
    "chroma_aberration",
)

EasingType = Literal["linear", "ease_in", "ease_out", "ease_in_out"]

EASING_TYPES: tuple[EasingType, ...] = (
    "linear",
    "ease_in",
    "ease_out",
    "ease_in_out",
)

MAX_KEYFRAMES_PER_NODE: int = 64

ALLOWED_PIX_FMTS: frozenset[str] = frozenset({"yuv420p", "yuv422p10le", "rgb24", "yuv444p"})
_HEX_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")

_PARAM_ALIASES: dict[str, str] = {
    "Brightness": "brightness",
    "Width": "width",
    "Blur": "blur",
    "Threshold": "threshold",
    "Tint": "tint",
    "Amplitude": "amplitude",
    "Frequency": "frequency",
    "MotionBlur": "motion_blur",
    "Seed": "seed",
    "Randomness": "randomness",
    "CenterX": "center_x",
    "CenterY": "center_y",
    "Scale": "scale",
    "Mix": "mix",
    "Grain": "grain",
    "Scratches": "scratches",
    "Vignette": "vignette",
    "GateWeave": "gate_weave",
    "Spread": "spread",
    "Angle": "angle",
}


class FxParamSpec(BaseModel):
    """Schema and bounds for a single Sapphire-style FX parameter."""

    name: str
    label: str
    kind: Literal["float", "int", "color"]
    default: float | int | str
    min_val: float | None = None
    max_val: float | None = None
    step: float | None = None
    unit: str = ""


FX_PARAM_SPECS: dict[FxType, tuple[FxParamSpec, ...]] = {
    "glow": (
        FxParamSpec(
            name="brightness",
            label="Brightness",
            kind="float",
            default=0.85,
            min_val=0.0,
            max_val=3.0,
            step=0.05,
        ),
        FxParamSpec(
            name="width",
            label="Width / Blur",
            kind="float",
            default=18.0,
            min_val=1.0,
            max_val=80.0,
            step=0.5,
            unit="px",
        ),
        FxParamSpec(
            name="threshold",
            label="Threshold",
            kind="float",
            default=0.45,
            min_val=0.0,
            max_val=1.0,
            step=0.01,
        ),
        FxParamSpec(
            name="tint",
            label="Tint",
            kind="color",
            default="#ffd8a8",
        ),
    ),
    "shake": (
        FxParamSpec(
            name="amplitude",
            label="Amplitude",
            kind="float",
            default=14.0,
            min_val=0.0,
            max_val=64.0,
            step=0.5,
            unit="px",
        ),
        FxParamSpec(
            name="frequency",
            label="Frequency",
            kind="float",
            default=6.0,
            min_val=0.2,
            max_val=30.0,
            step=0.2,
            unit="Hz",
        ),
        FxParamSpec(
            name="motion_blur",
            label="Motion Blur",
            kind="float",
            default=0.35,
            min_val=0.0,
            max_val=1.0,
            step=0.05,
        ),
        FxParamSpec(
            name="seed",
            label="Seed",
            kind="int",
            default=42,
            min_val=0.0,
            max_val=9999.0,
            step=1.0,
        ),
    ),
    "flicker": (
        FxParamSpec(
            name="amplitude",
            label="Amplitude",
            kind="float",
            default=0.18,
            min_val=0.0,
            max_val=0.5,
            step=0.01,
        ),
        FxParamSpec(
            name="frequency",
            label="Frequency",
            kind="float",
            default=8.0,
            min_val=0.5,
            max_val=30.0,
            step=0.5,
            unit="Hz",
        ),
        FxParamSpec(
            name="randomness",
            label="Randomness",
            kind="float",
            default=0.35,
            min_val=0.0,
            max_val=1.0,
            step=0.05,
        ),
    ),
    "lens_flare": (
        FxParamSpec(
            name="center_x",
            label="Center X",
            kind="float",
            default=0.72,
            min_val=0.0,
            max_val=1.0,
            step=0.01,
        ),
        FxParamSpec(
            name="center_y",
            label="Center Y",
            kind="float",
            default=0.28,
            min_val=0.0,
            max_val=1.0,
            step=0.01,
        ),
        FxParamSpec(
            name="brightness",
            label="Brightness",
            kind="float",
            default=0.95,
            min_val=0.0,
            max_val=2.0,
            step=0.05,
        ),
        FxParamSpec(
            name="scale",
            label="Scale",
            kind="float",
            default=1.0,
            min_val=0.2,
            max_val=2.5,
            step=0.05,
        ),
        FxParamSpec(
            name="tint",
            label="Tint",
            kind="color",
            default="#7cc4ff",
        ),
    ),
    "film_damage": (
        FxParamSpec(
            name="mix",
            label="Mix",
            kind="float",
            default=0.75,
            min_val=0.0,
            max_val=1.0,
            step=0.05,
        ),
        FxParamSpec(
            name="grain",
            label="Grain",
            kind="float",
            default=28.0,
            min_val=0.0,
            max_val=100.0,
            step=1.0,
        ),
        FxParamSpec(
            name="scratches",
            label="Scratches",
            kind="float",
            default=0.45,
            min_val=0.0,
            max_val=1.0,
            step=0.05,
        ),
        FxParamSpec(
            name="vignette",
            label="Vignette",
            kind="float",
            default=0.55,
            min_val=0.0,
            max_val=1.0,
            step=0.05,
        ),
        FxParamSpec(
            name="gate_weave",
            label="Gate Weave",
            kind="float",
            default=0.25,
            min_val=0.0,
            max_val=1.0,
            step=0.05,
        ),
    ),
    "chroma_aberration": (
        FxParamSpec(
            name="spread",
            label="Spread",
            kind="float",
            default=8.0,
            min_val=0.0,
            max_val=40.0,
            step=0.5,
            unit="px",
        ),
        FxParamSpec(
            name="angle",
            label="Angle",
            kind="float",
            default=15.0,
            min_val=-180.0,
            max_val=180.0,
            step=1.0,
            unit="deg",
        ),
        FxParamSpec(
            name="blur",
            label="Blur",
            kind="float",
            default=0.8,
            min_val=0.0,
            max_val=10.0,
            step=0.1,
            unit="px",
        ),
    ),
}

_FX_COMPLEXITY_WEIGHTS: dict[FxType, float] = {
    "glow": 1.45,
    "shake": 0.70,
    "flicker": 0.25,
    "lens_flare": 1.25,
    "film_damage": 1.10,
    "chroma_aberration": 0.65,
}


class Keyframe(BaseModel):
    """Temporal keyframe controlling an FX node's intensity multiplier over time."""

    time_s: float = Field(ge=0.0, le=86400.0)
    value: float = Field(ge=0.0, le=2.0)
    easing: EasingType = "linear"

    @field_validator("time_s", "value")
    @classmethod
    def _validate_finite(cls, val: float) -> float:
        if not math.isfinite(val):
            raise ValueError(f"Keyframe numeric field must be finite, got {val!r}")
        return float(val)


class FxNode(BaseModel):
    """A single effect instance in the Premiere/AE-style Effect Controls stack."""

    effect: FxType
    enabled: bool = True
    params: dict[str, float | int | str] = Field(default_factory=dict)
    keyframes: list[Keyframe] = Field(default_factory=list)


class FxPreset(BaseModel):
    """One-click Sapphire/Resolve preset combining curated FX nodes."""

    id: str
    name: str
    category: str
    description: str
    nodes: list[FxNode]


class FxCompileResult(BaseModel):
    """Compiled FFmpeg filtergraph and deterministic render cost estimate."""

    filtergraph: str
    ffmpeg_vf_args: list[str]
    active_effects: list[FxType]
    keyframed_effects: list[FxType] = Field(default_factory=list)
    bypassed_count: int
    normalized_nodes: list[FxNode]
    estimated_render_seconds: float
    realtime_factor: float
    complexity_tier: Literal["idle", "light", "medium", "heavy"]
    warnings: list[str] = Field(default_factory=list)


FX_PRESETS: tuple[FxPreset, ...] = (
    FxPreset(
        id="dreamy_glow",
        name="Dreamy Glow",
        category="Stylize",
        description="Soft halation and warm highlight bloom inspired by S_Glow.",
        nodes=[
            FxNode(
                effect="glow",
                enabled=True,
                params={
                    "brightness": 1.15,
                    "width": 26.0,
                    "threshold": 0.38,
                    "tint": "#ffe0b8",
                },
            ),
        ],
    ),
    FxPreset(
        id="music_video_shake",
        name="Music Video Shake",
        category="Motion",
        description="Energetic handheld impact camera shake with directional motion blur.",
        nodes=[
            FxNode(
                effect="shake",
                enabled=True,
                params={
                    "amplitude": 18.0,
                    "frequency": 9.5,
                    "motion_blur": 0.55,
                    "seed": 108,
                },
            ),
            FxNode(
                effect="chroma_aberration",
                enabled=True,
                params={
                    "spread": 5.0,
                    "angle": 12.0,
                    "blur": 0.5,
                },
            ),
        ],
    ),
    FxPreset(
        id="vintage_35mm_film",
        name="Vintage 35mm Film",
        category="Film",
        description="Organic 35mm grain, vertical gate scratches, vignette, and gate weave.",
        nodes=[
            FxNode(
                effect="film_damage",
                enabled=True,
                params={
                    "mix": 0.85,
                    "grain": 34.0,
                    "scratches": 0.55,
                    "vignette": 0.65,
                    "gate_weave": 0.35,
                },
            ),
            FxNode(
                effect="flicker",
                enabled=True,
                params={
                    "amplitude": 0.08,
                    "frequency": 12.0,
                    "randomness": 0.5,
                },
            ),
        ],
    ),
    FxPreset(
        id="anamorphic_flare",
        name="Anamorphic Flare",
        category="Optical",
        description="Cyan-blue anamorphic streak and radial optical highlight bloom.",
        nodes=[
            FxNode(
                effect="lens_flare",
                enabled=True,
                params={
                    "center_x": 0.74,
                    "center_y": 0.30,
                    "brightness": 1.25,
                    "scale": 1.25,
                    "tint": "#6eb8ff",
                },
            ),
            FxNode(
                effect="glow",
                enabled=True,
                params={
                    "brightness": 0.55,
                    "width": 16.0,
                    "threshold": 0.55,
                    "tint": "#b8dcff",
                },
            ),
        ],
    ),
    FxPreset(
        id="rgb_glitch_split",
        name="RGB Glitch Split",
        category="Distort",
        description="Prismatic RGB channel separation with subtle micro-shake.",
        nodes=[
            FxNode(
                effect="chroma_aberration",
                enabled=True,
                params={
                    "spread": 16.0,
                    "angle": 8.0,
                    "blur": 1.2,
                },
            ),
            FxNode(
                effect="shake",
                enabled=True,
                params={
                    "amplitude": 6.0,
                    "frequency": 18.0,
                    "motion_blur": 0.25,
                    "seed": 77,
                },
            ),
        ],
    ),
    FxPreset(
        id="strobe_flicker",
        name="Strobe Flicker",
        category="Lighting",
        description="High-energy club luminance pulse paired with bright highlight bloom.",
        nodes=[
            FxNode(
                effect="flicker",
                enabled=True,
                params={
                    "amplitude": 0.32,
                    "frequency": 14.0,
                    "randomness": 0.25,
                },
            ),
            FxNode(
                effect="glow",
                enabled=True,
                params={
                    "brightness": 0.75,
                    "width": 14.0,
                    "threshold": 0.42,
                    "tint": "#ffffff",
                },
            ),
        ],
    ),
)


def _clamp_num(value: float, min_val: float, max_val: float) -> float:
    if not math.isfinite(value):
        raise ValueError(f"Parameter must be finite, got {value!r}")
    if value < min_val:
        return min_val
    if value > max_val:
        return max_val
    return value


def _validate_hex_color(raw: Any) -> str:
    if not isinstance(raw, str):
        raise ValueError(f"Tint color must be a hex string '#RRGGBB', got {raw!r}")
    trimmed = raw.strip()
    if not _HEX_COLOR_RE.fullmatch(trimmed):
        raise ValueError(f"Invalid hex color {raw!r}; expected '#RRGGBB'")
    return trimmed.lower()


def _hex_to_rgb_unit(hex_color: str) -> tuple[float, float, float]:
    val = int(hex_color[1:], 16)
    return (
        ((val >> 16) & 0xFF) / 255.0,
        ((val >> 8) & 0xFF) / 255.0,
        (val & 0xFF) / 255.0,
    )


def _canonicalize_param_keys(effect: FxType, raw_params: dict[str, Any]) -> dict[str, Any]:
    mapped: dict[str, Any] = {}
    for key, val in raw_params.items():
        if key == "Blur" and effect == "glow":
            mapped["width"] = val
            continue
        if key == "blur" and effect == "glow" and "width" not in raw_params:
            mapped["width"] = val
            continue
        canonical = _PARAM_ALIASES.get(key, key)
        mapped[canonical] = val
    return mapped


def _normalize_keyframes(raw_kfs: Sequence[Keyframe]) -> list[Keyframe]:
    if len(raw_kfs) > MAX_KEYFRAMES_PER_NODE:
        raise ValueError(
            f"Too many keyframes ({len(raw_kfs)}); maximum allowed is {MAX_KEYFRAMES_PER_NODE}"
        )
    normalized: list[Keyframe] = []
    for kf in raw_kfs:
        t_val = round(_clamp_num(float(kf.time_s), 0.0, 86400.0), 4)
        v_val = round(_clamp_num(float(kf.value), 0.0, 2.0), 4)
        normalized.append(Keyframe(time_s=t_val, value=v_val, easing=kf.easing))
    normalized.sort(key=lambda item: item.time_s)
    return normalized


def evaluate_easing(t_norm: float, easing: EasingType = "linear") -> float:
    """Evaluate a normalized [0, 1] interpolation factor for the requested curve."""
    if not math.isfinite(t_norm):
        raise ValueError(f"Interpolation factor must be finite, got {t_norm!r}")
    u = _clamp_num(float(t_norm), 0.0, 1.0)
    if easing == "linear":
        return u
    if easing == "ease_in":
        return u * u
    if easing == "ease_out":
        inv = 1.0 - u
        return 1.0 - inv * inv
    if easing == "ease_in_out":
        return u * u * (3.0 - 2.0 * u)
    raise ValueError(f"Unsupported easing curve: {easing!r}")


def evaluate_keyframes(
    keyframes: Sequence[Keyframe | dict[str, Any]],
    time_s: float,
) -> float:
    """Deterministically evaluate keyframed intensity multiplier at time_s (seconds)."""
    if not math.isfinite(time_s):
        raise ValueError(f"time_s must be finite, got {time_s!r}")
    if not keyframes:
        return 1.0

    parsed = [
        kf if isinstance(kf, Keyframe) else Keyframe.model_validate(kf)
        for kf in keyframes
    ]
    ordered = sorted(parsed, key=lambda item: item.time_s)
    t_clamped = max(0.0, float(time_s))

    if t_clamped <= ordered[0].time_s:
        return float(ordered[0].value)
    if t_clamped >= ordered[-1].time_s:
        return float(ordered[-1].value)

    for idx in range(len(ordered) - 1):
        k0 = ordered[idx]
        k1 = ordered[idx + 1]
        if t_clamped <= k1.time_s:
            dt = k1.time_s - k0.time_s
            if dt <= 1e-9:
                return float(k1.value)
            u = (t_clamped - k0.time_s) / dt
            w = evaluate_easing(u, k0.easing)
            return round(k0.value + (k1.value - k0.value) * w, 6)

    return float(ordered[-1].value)


def evaluate_node_intensity(node: FxNode | dict[str, Any], time_s: float) -> float:
    """Evaluate a node's effective intensity multiplier (0 if bypassed, 1 if unkeyframed)."""
    parsed = node if isinstance(node, FxNode) else FxNode.model_validate(node)
    if not parsed.enabled:
        return 0.0
    if not parsed.keyframes:
        return 1.0
    return evaluate_keyframes(parsed.keyframes, time_s)


def build_fade_keyframes(
    duration_seconds: float,
    *,
    mode: Literal["in", "out", "in_out"] = "in_out",
    fade_in_s: float = 1.0,
    fade_out_s: float = 1.0,
    easing: EasingType = "ease_in_out",
    peak: float = 1.0,
) -> list[Keyframe]:
    """Generate a 1-click 2-point fade-in, fade-out, or symmetric fade-in/out envelope."""
    dur = _clamp_num(float(duration_seconds), 0.1, 86400.0)
    peak_val = round(_clamp_num(float(peak), 0.0, 2.0), 4)
    in_s = _clamp_num(float(fade_in_s), 0.05, dur)
    out_s = _clamp_num(float(fade_out_s), 0.05, dur)

    if mode == "in":
        return [
            Keyframe(time_s=0.0, value=0.0, easing=easing),
            Keyframe(time_s=round(in_s, 4), value=peak_val, easing=easing),
        ]
    if mode == "out":
        start_out = round(max(0.0, dur - out_s), 4)
        return [
            Keyframe(time_s=start_out, value=peak_val, easing=easing),
            Keyframe(time_s=round(dur, 4), value=0.0, easing=easing),
        ]
    if in_s + out_s >= dur - 1e-4:
        mid = round(dur * 0.5, 4)
        return [
            Keyframe(time_s=0.0, value=0.0, easing=easing),
            Keyframe(time_s=mid, value=peak_val, easing=easing),
            Keyframe(time_s=round(dur, 4), value=0.0, easing=easing),
        ]
    return [
        Keyframe(time_s=0.0, value=0.0, easing=easing),
        Keyframe(time_s=round(in_s, 4), value=peak_val, easing="linear"),
        Keyframe(time_s=round(dur - out_s, 4), value=peak_val, easing=easing),
        Keyframe(time_s=round(dur, 4), value=0.0, easing=easing),
    ]


def sample_keyframe_curve(
    keyframes: Sequence[Keyframe | dict[str, Any]],
    duration_seconds: float,
    *,
    samples: int = 41,
) -> list[dict[str, float]]:
    """Sample deterministic (time_s, value) curve points for UI preview and inspection."""
    dur = _clamp_num(float(duration_seconds), 0.1, 86400.0)
    count = max(2, min(512, int(samples)))
    return [
        {
            "time_s": round(dur * idx / (count - 1), 4),
            "value": round(evaluate_keyframes(keyframes, dur * idx / (count - 1)), 6),
        }
        for idx in range(count)
    ]


def normalize_fx_node(raw_node: FxNode | dict[str, Any]) -> FxNode:
    """Validate and clamp an FX node's parameters and keyframes strictly within safe bounds."""
    node = raw_node if isinstance(raw_node, FxNode) else FxNode.model_validate(raw_node)
    specs = FX_PARAM_SPECS[node.effect]
    canonical_raw = _canonicalize_param_keys(node.effect, node.params)

    normalized_params: dict[str, float | int | str] = {}
    for spec in specs:
        raw_val = canonical_raw.get(spec.name, spec.default)
        if spec.kind == "color":
            normalized_params[spec.name] = _validate_hex_color(raw_val)
        elif spec.kind == "int":
            if isinstance(raw_val, bool):
                raise ValueError(f"Parameter {spec.name!r} must be numeric, not bool")
            num = float(raw_val)
            min_v = spec.min_val if spec.min_val is not None else 0.0
            max_v = spec.max_val if spec.max_val is not None else 9999.0
            normalized_params[spec.name] = round(_clamp_num(num, min_v, max_v))
        else:
            if isinstance(raw_val, bool):
                raise ValueError(f"Parameter {spec.name!r} must be numeric, not bool")
            num = float(raw_val)
            min_v = spec.min_val if spec.min_val is not None else 0.0
            max_v = spec.max_val if spec.max_val is not None else 1.0
            normalized_params[spec.name] = round(_clamp_num(num, min_v, max_v), 4)

    normalized_kfs = _normalize_keyframes(node.keyframes)
    return FxNode(
        effect=node.effect,
        enabled=node.enabled,
        params=normalized_params,
        keyframes=normalized_kfs,
    )


def default_fx_node(effect: FxType) -> FxNode:
    """Create a normalized default FxNode for the requested effect type."""
    return normalize_fx_node(FxNode(effect=effect, enabled=True, params={}))


def list_fx_presets() -> list[FxPreset]:
    """Return all built-in 1-click Sapphire-inspired presets."""
    return [preset.model_copy(deep=True) for preset in FX_PRESETS]


def get_fx_preset(preset_id: str) -> FxPreset:
    """Look up a built-in preset by id or case-insensitive display name."""
    target = preset_id.strip().lower()
    for preset in FX_PRESETS:
        if preset.id == target or preset.name.lower() == target:
            return preset.model_copy(deep=True)
    raise ValueError(f"Unknown FX preset: {preset_id!r}")


def _compile_glow(idx: int, params: dict[str, float | int | str]) -> str:
    brightness = float(params["brightness"])
    width = float(params["width"])
    threshold = float(params["threshold"])
    tint = str(params["tint"])
    tr, tg, tb = _hex_to_rgb_unit(tint)

    thr255 = round(threshold * 255.0, 2)
    gain_scale = min(2.6, 0.85 + brightness * 0.85)
    gr = round(max(0.05, tr * gain_scale), 4)
    gg = round(max(0.05, tg * gain_scale), 4)
    gb = round(max(0.05, tb * gain_scale), 4)
    opacity = round(min(1.0, max(0.0, brightness / 1.5)), 4)

    base_pad = f"glow{idx}_base"
    src_pad = f"glow{idx}_src"
    blur_pad = f"glow{idx}_blur"
    return (
        f"split[{base_pad}][{src_pad}];"
        f"[{src_pad}]lutrgb="
        f"r='if(gte(val,{thr255}),min(255,(val-{thr255})*{gr:.4f}),0)':"
        f"g='if(gte(val,{thr255}),min(255,(val-{thr255})*{gg:.4f}),0)':"
        f"b='if(gte(val,{thr255}),min(255,(val-{thr255})*{gb:.4f}),0)',"
        f"gblur=sigma={width:.2f}:steps=2[{blur_pad}];"
        f"[{base_pad}][{blur_pad}]blend=all_mode=screen:all_opacity={opacity:.4f}"
    )


def _build_keyframe_expr(
    keyframes: Sequence[Keyframe],
    *,
    time_var: str = "T",
    clamp_unit: bool = True,
) -> str:
    """Compile sorted keyframes into a deterministic piecewise FFmpeg expression."""
    ordered = sorted(keyframes, key=lambda item: item.time_s)
    if not ordered:
        return "1.0000"
    if len(ordered) == 1:
        val = _clamp_num(ordered[0].value, 0.0, 1.0) if clamp_unit else ordered[0].value
        return f"{val:.4f}"

    def _fmt_val(raw: float) -> float:
        return _clamp_num(raw, 0.0, 1.0) if clamp_unit else raw

    expr = f"{_fmt_val(ordered[-1].value):.4f}"
    for idx in range(len(ordered) - 2, -1, -1):
        k0 = ordered[idx]
        k1 = ordered[idx + 1]
        v0 = _fmt_val(k0.value)
        v1 = _fmt_val(k1.value)
        dt = k1.time_s - k0.time_s
        if dt <= 1e-6:
            seg_expr = f"{v1:.4f}"
        else:
            u = f"clip(({time_var}-{k0.time_s:.4f})/{dt:.4f},0,1)"
            if k0.easing == "linear":
                curve = u
            elif k0.easing == "ease_in":
                curve = f"pow({u},2)"
            elif k0.easing == "ease_out":
                curve = f"(1-pow(1-{u},2))"
            else:
                curve = f"(3*pow({u},2)-2*pow({u},3))"
            dv = v1 - v0
            seg_expr = f"{v0:.4f}" if abs(dv) <= 1e-6 else f"({v0:.4f}+({dv:.4f})*{curve})"
        expr = f"if(lt({time_var},{k1.time_s:.4f}),{seg_expr},{expr})"

    first_v = _fmt_val(ordered[0].value)
    full_expr = f"if(lte({time_var},{ordered[0].time_s:.4f}),{first_v:.4f},{expr})"
    return f"clip({full_expr},0,1)" if clamp_unit else full_expr


def _wrap_keyframed_segment(idx: int, segment: str, keyframes: Sequence[Keyframe]) -> str:
    """Wrap an FX segment in a dry/wet blend controlled by its keyframe intensity curve."""
    if segment == "null":
        return "null"
    expr = _build_keyframe_expr(keyframes, time_var="T", clamp_unit=True)
    dry_pad = f"kfd{idx}"
    wet_pad = f"kfw{idx}"
    out_pad = f"kfo{idx}"
    return (
        f"split[{dry_pad}][{wet_pad}];"
        f"[{wet_pad}]{segment}[{out_pad}];"
        f"[{dry_pad}][{out_pad}]blend=all_expr='A*(1-({expr}))+B*({expr})'"
    )


def _compile_shake(
    params: dict[str, float | int | str],
    keyframes: Sequence[Keyframe] = (),
) -> str:
    amplitude = float(params["amplitude"])
    frequency = float(params["frequency"])
    motion_blur = float(params["motion_blur"])
    seed = int(params["seed"])

    amp = round(amplitude)
    if amp <= 0:
        return "null"

    if keyframes:
        max_k = max(k.value for k in keyframes)
        if max_k <= 0.0001:
            return "null"
        pad_amp = max(1, round(amp * max_k))
        kf_expr = _build_keyframe_expr(keyframes, time_var="t", clamp_unit=False)
        amp_expr = f"({amp}*({kf_expr}))"
    else:
        pad_amp = amp
        amp_expr = str(amp)

    omega = round(2.0 * math.pi * frequency, 4)
    omega2 = round(omega * 1.37, 4)
    phase1 = round((seed % 360) * math.pi / 180.0, 4)
    phase2 = round(((seed * 7 + 53) % 360) * math.pi / 180.0, 4)
    segment = (
        f"pad=iw+{2 * pad_amp}:ih+{2 * pad_amp}:{pad_amp}:{pad_amp}:color=black,"
        f"crop=iw-{2 * pad_amp}:ih-{2 * pad_amp}:"
        f"x='{pad_amp}+{amp_expr}*sin(t*{omega:.4f}+{phase1:.4f})':"
        f"y='{pad_amp}+{amp_expr}*cos(t*{omega2:.4f}+{phase2:.4f})'"
    )
    if motion_blur >= 0.05:
        segment += f",tblend=all_mode=average:all_opacity={motion_blur:.3f}"
    return segment


def _compile_flicker(
    params: dict[str, float | int | str],
    keyframes: Sequence[Keyframe] = (),
) -> str:
    amplitude = float(params["amplitude"])
    frequency = float(params["frequency"])
    randomness = float(params["randomness"])
    if amplitude <= 0.0001:
        return "null"

    if keyframes:
        if max(k.value for k in keyframes) <= 0.0001:
            return "null"
        kf_expr = _build_keyframe_expr(keyframes, time_var="t", clamp_unit=False)
        amp_expr = f"({amplitude:.4f}*({kf_expr}))"
    else:
        amp_expr = f"{amplitude:.4f}"

    omega = round(2.0 * math.pi * frequency, 4)
    omega2 = round(omega * 1.73, 4)
    norm = round(1.0 + randomness, 4)
    return (
        f"eq=brightness='{amp_expr}*(sin(t*{omega:.4f})+"
        f"{randomness:.4f}*sin(t*{omega2:.4f}+1.7))/{norm:.4f}':eval=frame"
    )


def _compile_lens_flare(idx: int, params: dict[str, float | int | str]) -> str:
    cx = float(params["center_x"])
    cy = float(params["center_y"])
    brightness = float(params["brightness"])
    scale = float(params["scale"])
    tint = str(params["tint"])

    opacity = round(min(1.0, max(0.0, brightness * 0.65)), 4)
    tint_hex = f"0x{tint[1:].lower()}"
    halo_w = round(0.11 * scale, 4)
    halo_h = round(0.19 * scale, 4)
    streak_w = round(min(0.95, 0.62 * scale), 4)
    sigma = round(max(4.0, 16.0 * scale), 2)
    core_alpha = round(min(1.0, 0.55 + brightness * 0.22), 3)

    base_pad = f"lf{idx}_base"
    tmp_pad = f"lf{idx}_tmp"
    flare_pad = f"lf{idx}_flare"
    return (
        f"split[{base_pad}][{tmp_pad}];"
        f"[{tmp_pad}]drawbox=x=0:y=0:w=iw:h=ih:color=black@1:t=fill,"
        f"drawbox=x='iw*{cx:.4f}-iw*{halo_w / 2:.4f}':"
        f"y='ih*{cy:.4f}-ih*{halo_h / 2:.4f}':"
        f"w='iw*{halo_w:.4f}':h='ih*{halo_h:.4f}':color={tint_hex}@0.9:t=fill,"
        f"drawbox=x='iw*{cx:.4f}-iw*{streak_w / 2:.4f}':"
        f"y='ih*{cy:.4f}-2':w='iw*{streak_w:.4f}':h=4:color=0xffffff@{core_alpha}:t=fill,"
        f"gblur=sigma={sigma:.2f}:steps=2[{flare_pad}];"
        f"[{base_pad}][{flare_pad}]blend=all_mode=screen:all_opacity={opacity:.4f}"
    )


def _compile_film_damage(params: dict[str, float | int | str]) -> str:
    mix = float(params["mix"])
    grain = float(params["grain"])
    scratches = float(params["scratches"])
    vignette = float(params["vignette"])
    gate_weave = float(params["gate_weave"])

    if mix <= 0.001:
        return "null"

    parts: list[str] = []
    grain_strength = round(min(100.0, grain * mix * 0.65), 2)
    if grain_strength >= 0.5:
        parts.append(f"noise=alls={grain_strength:.2f}:allf=t+u")

    vig_strength = vignette * mix
    if vig_strength >= 0.02:
        vig_angle = round(0.15 + vig_strength * 0.72, 3)
        parts.append(f"vignette=angle={vig_angle:.3f}")

    micro_amp = round(0.035 * mix, 4)
    parts.append(f"eq=brightness='{micro_amp:.4f}*sin(t*19.3)':eval=frame")

    scratch_strength = scratches * mix
    if scratch_strength >= 0.03:
        sc_alpha = round(min(0.65, scratch_strength * 0.45), 3)
        parts.append(
            f"drawbox=x='iw*0.29':y=0:w=1:h=ih:color=white@{sc_alpha:.3f}:t=fill,"
            f"drawbox=x='iw*0.74':y=0:w=1:h=ih:color=black@{sc_alpha:.3f}:t=fill"
        )

    weave_strength = gate_weave * mix
    if weave_strength >= 0.05:
        wv = max(1, round(weave_strength * 4.0))
        parts.append(
            f"pad=iw+{2 * wv}:ih+{2 * wv}:{wv}:{wv}:color=black,"
            f"crop=iw-{2 * wv}:ih-{2 * wv}:"
            f"x='{wv}+{wv}*sin(t*7.1)':y='{wv}+{wv}*cos(t*5.3)'"
        )

    return ",".join(parts)


def _compile_chroma_aberration(params: dict[str, float | int | str]) -> str:
    spread = float(params["spread"])
    angle = float(params["angle"])
    blur = float(params["blur"])

    rad = math.radians(angle)
    rh = round(spread * math.cos(rad))
    rv = round(spread * math.sin(rad))
    bh = -rh
    bv = -rv
    segment = f"rgbashift=rh={rh}:rv={rv}:bh={bh}:bv={bv}:edge=smear"
    if blur >= 0.1:
        segment += f",gblur=sigma={blur:.2f}"
    return segment


def compile_fx_filtergraph(
    nodes: Sequence[FxNode | dict[str, Any]],
    *,
    duration_seconds: float = 10.0,
    width: int = 1920,
    height: int = 1080,
    fps: float = 25.0,
    pix_fmt: str = "yuv420p",
    use_gpu: bool = False,
) -> FxCompileResult:
    """Compile a multi-effect stack into a deterministic FFmpeg -vf filtergraph."""
    if pix_fmt not in ALLOWED_PIX_FMTS:
        raise ValueError(f"Unsupported pixel format: {pix_fmt!r}")

    dur = _clamp_num(float(duration_seconds), 0.1, 86400.0)
    w_px = round(_clamp_num(float(width), 64.0, 7680.0))
    h_px = round(_clamp_num(float(height), 64.0, 4320.0))
    rate = _clamp_num(float(fps), 1.0, 240.0)

    normalized_nodes = [normalize_fx_node(item) for item in nodes]
    active_nodes = [item for item in normalized_nodes if item.enabled]
    bypassed_count = len(normalized_nodes) - len(active_nodes)

    if not active_nodes:
        return FxCompileResult(
            filtergraph="",
            ffmpeg_vf_args=[],
            active_effects=[],
            bypassed_count=bypassed_count,
            normalized_nodes=normalized_nodes,
            estimated_render_seconds=0.0,
            realtime_factor=0.0,
            complexity_tier="idle",
            warnings=[],
        )

    needs_rgb = any(
        n.effect in {"glow", "lens_flare", "chroma_aberration"} for n in active_nodes
    )

    segments: list[str] = []
    if needs_rgb:
        segments.append("format=rgb24")

    total_weight = 0.0
    active_effects: list[FxType] = []
    keyframed_effects: list[FxType] = []

    for idx, node in enumerate(active_nodes):
        active_effects.append(node.effect)
        total_weight += _FX_COMPLEXITY_WEIGHTS[node.effect]
        has_kf = len(node.keyframes) > 0
        if has_kf:
            keyframed_effects.append(node.effect)

        if node.effect == "glow":
            seg = _compile_glow(idx, node.params)
            segments.append(_wrap_keyframed_segment(idx, seg, node.keyframes) if has_kf else seg)
        elif node.effect == "shake":
            segments.append(_compile_shake(node.params, node.keyframes))
        elif node.effect == "flicker":
            segments.append(_compile_flicker(node.params, node.keyframes))
        elif node.effect == "lens_flare":
            seg = _compile_lens_flare(idx, node.params)
            segments.append(_wrap_keyframed_segment(idx, seg, node.keyframes) if has_kf else seg)
        elif node.effect == "film_damage":
            seg = _compile_film_damage(node.params)
            segments.append(_wrap_keyframed_segment(idx, seg, node.keyframes) if has_kf else seg)
        elif node.effect == "chroma_aberration":
            seg = _compile_chroma_aberration(node.params)
            segments.append(_wrap_keyframed_segment(idx, seg, node.keyframes) if has_kf else seg)

    if needs_rgb:
        segments.append(f"format={pix_fmt}")

    filtergraph = ",".join(segments)

    pixel_scale = (w_px * h_px) / (1920.0 * 1080.0)
    fps_scale = rate / 25.0
    gpu_factor = 0.38 if use_gpu else 1.0
    est_seconds = round(
        max(0.05, dur * (0.12 + total_weight * 0.14) * pixel_scale * fps_scale * gpu_factor),
        2,
    )
    rt_factor = round(dur / est_seconds, 2) if est_seconds > 0 else 0.0

    if total_weight <= 1.2:
        tier: Literal["idle", "light", "medium", "heavy"] = "light"
    elif total_weight <= 2.5:
        tier = "medium"
    else:
        tier = "heavy"

    return FxCompileResult(
        filtergraph=filtergraph,
        ffmpeg_vf_args=["-vf", filtergraph],
        active_effects=active_effects,
        keyframed_effects=keyframed_effects,
        bypassed_count=bypassed_count,
        normalized_nodes=normalized_nodes,
        estimated_render_seconds=est_seconds,
        realtime_factor=rt_factor,
        complexity_tier=tier,
        warnings=[],
    )


def compile_preset_filtergraph(
    preset_id: str,
    *,
    duration_seconds: float = 10.0,
    width: int = 1920,
    height: int = 1080,
    fps: float = 25.0,
    pix_fmt: str = "yuv420p",
    use_gpu: bool = False,
) -> FxCompileResult:
    """Compile one of the 6 built-in Sapphire-inspired presets."""
    preset = get_fx_preset(preset_id)
    return compile_fx_filtergraph(
        preset.nodes,
        duration_seconds=duration_seconds,
        width=width,
        height=height,
        fps=fps,
        pix_fmt=pix_fmt,
        use_gpu=use_gpu,
    )
