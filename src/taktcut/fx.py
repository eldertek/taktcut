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
    "vignette",
    "film_grain",
    "optical_glow",
    "rgb_split",
    "halation",
    "letterbox",
    "camera_shake",
    "lens_distortion",
    "scanlines",
    "unsharp_mask",
    "hue_shift",
    "mirror_flip",
    "mosaic_pixelate",
    "invert_negative",
]

FX_TYPES: tuple[FxType, ...] = (
    "glow",
    "shake",
    "flicker",
    "lens_flare",
    "film_damage",
    "chroma_aberration",
    "vignette",
    "film_grain",
    "optical_glow",
    "rgb_split",
    "halation",
    "letterbox",
    "camera_shake",
    "lens_distortion",
    "scanlines",
    "unsharp_mask",
    "hue_shift",
    "mirror_flip",
    "mosaic_pixelate",
    "invert_negative",
)

LETTERBOX_RATIOS: tuple[str, ...] = ("2.39", "2.35", "1.85", "2.00")
MIRROR_FLIP_AXES: tuple[str, ...] = ("horizontal", "vertical", "both")
INVERT_NEGATIVE_MODES: tuple[str, ...] = ("rgb", "luma")
_LETTERBOX_RATIO_ALIASES: dict[str, str] = {
    "2.39": "2.39",
    "2.35": "2.35",
    "1.85": "1.85",
    "2.00": "2.00",
    "2.0": "2.00",
    "2": "2.00",
}

EasingType = Literal["linear", "ease_in", "ease_out", "ease_in_out"]

EASING_TYPES: tuple[EasingType, ...] = (
    "linear",
    "ease_in",
    "ease_out",
    "ease_in_out",
)

MAX_KEYFRAMES_PER_NODE: int = 64

ALLOWED_PIX_FMTS: frozenset[str] = frozenset({"yuv420p", "yuv422p10le", "rgb24", "yuv444p"})
ALLOWED_CHROMA_PIX_FMTS: frozenset[str] = ALLOWED_PIX_FMTS | {"rgba"}
_HEX_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")

CHROMA_KEY_SIMILARITY_MIN: float = 0.01
CHROMA_KEY_SIMILARITY_MAX: float = 0.80
CHROMA_KEY_BLEND_MIN: float = 0.0
CHROMA_KEY_BLEND_MAX: float = 0.50
CHROMA_KEY_DEFAULT_SIMILARITY: float = 0.18
CHROMA_KEY_DEFAULT_BLEND: float = 0.08

ChromaKeyPresetId = Literal["studio_green", "chroma_blue", "custom"]
DespillType = Literal["green", "blue"]

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
    "AngleRad": "angle_rad",
    "Strength": "strength",
    "GlowIntensity": "glow_intensity",
    "GlowRadius": "glow_radius",
    "ChromaShiftPx": "chroma_shift_px",
    "HalationStrength": "halation_strength",
    "HalationRadius": "halation_radius",
    "Ratio": "ratio",
    "AmplitudePx": "amplitude_px",
    "FrequencyHz": "frequency_hz",
    "K1": "k1",
    "LineSpacingPx": "line_spacing_px",
    "Opacity": "opacity",
    "SharpenAmount": "sharpen_amount",
    "HueDeg": "hue_deg",
    "Hue": "hue_deg",
    "Saturation": "saturation",
    "Axis": "axis",
    "BlockSizePx": "block_size_px",
    "BlockSize": "block_size_px",
    "Mode": "mode",
}


class FxParamSpec(BaseModel):
    """Schema and bounds for a single Sapphire-style FX parameter."""

    name: str
    label: str
    kind: Literal["float", "int", "color", "enum"]
    default: float | int | str
    min_val: float | None = None
    max_val: float | None = None
    step: float | None = None
    unit: str = ""
    options: tuple[str, ...] | None = None


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
    "vignette": (
        FxParamSpec(
            name="angle_rad",
            label="Angle (rad)",
            kind="float",
            default=0.52,
            min_val=0.1,
            max_val=1.2,
            step=0.02,
            unit="rad",
        ),
    ),
    "film_grain": (
        FxParamSpec(
            name="strength",
            label="Strength",
            kind="float",
            default=14.0,
            min_val=0.0,
            max_val=40.0,
            step=1.0,
        ),
    ),
    "optical_glow": (
        FxParamSpec(
            name="glow_intensity",
            label="Glow Intensity",
            kind="float",
            default=0.45,
            min_val=0.0,
            max_val=1.0,
            step=0.05,
        ),
        FxParamSpec(
            name="glow_radius",
            label="Glow Radius",
            kind="float",
            default=10.0,
            min_val=2.0,
            max_val=24.0,
            step=0.5,
            unit="px",
        ),
    ),
    "rgb_split": (
        FxParamSpec(
            name="chroma_shift_px",
            label="Chroma Shift",
            kind="int",
            default=4,
            min_val=0.0,
            max_val=12.0,
            step=1.0,
            unit="px",
        ),
    ),
    "halation": (
        FxParamSpec(
            name="halation_strength",
            label="Halation Strength",
            kind="float",
            default=0.55,
            min_val=0.0,
            max_val=1.0,
            step=0.05,
        ),
        FxParamSpec(
            name="halation_radius",
            label="Halation Radius",
            kind="float",
            default=10.0,
            min_val=2.0,
            max_val=20.0,
            step=0.5,
            unit="px",
        ),
    ),
    "letterbox": (
        FxParamSpec(
            name="ratio",
            label="Aspect Ratio",
            kind="enum",
            default="2.39",
            unit=":1",
            options=LETTERBOX_RATIOS,
        ),
    ),
    "camera_shake": (
        FxParamSpec(
            name="amplitude_px",
            label="Amplitude",
            kind="float",
            default=8.0,
            min_val=1.0,
            max_val=24.0,
            step=0.5,
            unit="px",
        ),
        FxParamSpec(
            name="frequency_hz",
            label="Frequency",
            kind="float",
            default=4.5,
            min_val=0.5,
            max_val=12.0,
            step=0.5,
            unit="Hz",
        ),
    ),
    "lens_distortion": (
        FxParamSpec(
            name="k1",
            label="Distortion (k1)",
            kind="float",
            default=-0.22,
            min_val=-0.50,
            max_val=0.50,
            step=0.02,
        ),
    ),
    "scanlines": (
        FxParamSpec(
            name="line_spacing_px",
            label="Line Spacing",
            kind="int",
            default=4,
            min_val=2,
            max_val=12,
            step=1,
            unit="px",
        ),
        FxParamSpec(
            name="opacity",
            label="Opacity",
            kind="float",
            default=0.45,
            min_val=0.10,
            max_val=0.90,
            step=0.05,
        ),
    ),
    "unsharp_mask": (
        FxParamSpec(
            name="sharpen_amount",
            label="Sharpen Amount",
            kind="float",
            default=1.20,
            min_val=0.20,
            max_val=3.00,
            step=0.10,
        ),
    ),
    "hue_shift": (
        FxParamSpec(
            name="hue_deg",
            label="Hue (deg)",
            kind="float",
            default=30.0,
            min_val=-180.0,
            max_val=180.0,
            step=1.0,
            unit="deg",
        ),
        FxParamSpec(
            name="saturation",
            label="Saturation",
            kind="float",
            default=1.25,
            min_val=0.0,
            max_val=2.5,
            step=0.05,
        ),
    ),
    "mirror_flip": (
        FxParamSpec(
            name="axis",
            label="Mirror Axis",
            kind="enum",
            default="horizontal",
            options=MIRROR_FLIP_AXES,
        ),
    ),
    "mosaic_pixelate": (
        FxParamSpec(
            name="block_size_px",
            label="Block Size (px)",
            kind="int",
            default=12,
            min_val=4,
            max_val=48,
            step=1,
            unit="px",
        ),
    ),
    "invert_negative": (
        FxParamSpec(
            name="mode",
            label="Invert Mode",
            kind="enum",
            default="rgb",
            options=INVERT_NEGATIVE_MODES,
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
    "vignette": 0.35,
    "film_grain": 0.45,
    "optical_glow": 1.20,
    "rgb_split": 0.55,
    "halation": 1.25,
    "letterbox": 0.20,
    "camera_shake": 0.65,
    "lens_distortion": 0.55,
    "scanlines": 0.25,
    "unsharp_mask": 0.45,
    "hue_shift": 0.30,
    "mirror_flip": 0.20,
    "mosaic_pixelate": 0.30,
    "invert_negative": 0.20,
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

    @field_validator("params", mode="before")
    @classmethod
    def _reject_bool_params(cls, raw: Any) -> Any:
        if isinstance(raw, dict):
            for key, val in raw.items():
                if isinstance(val, bool):
                    raise ValueError(f"Parameter {key!r} must be numeric, not bool")
        return raw


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
    chroma_key_active: bool = False
    stabilizer_active: bool = False
    planar_tracker_active: bool = False
    bypassed_count: int
    normalized_nodes: list[FxNode]
    estimated_render_seconds: float
    realtime_factor: float
    complexity_tier: Literal["idle", "light", "medium", "heavy"]
    warnings: list[str] = Field(default_factory=list)


def _validate_finite_bound_float(
    raw: Any,
    field_name: str,
    min_val: float,
    max_val: float,
) -> float:
    if isinstance(raw, bool) or not isinstance(raw, int | float):
        raise ValueError(f"{field_name} must be a finite number, got {raw!r}")
    val = float(raw)
    if not math.isfinite(val):
        raise ValueError(f"{field_name} must be finite, got {raw!r}")
    if val < min_val or val > max_val:
        raise ValueError(f"{field_name} must be within [{min_val}, {max_val}], got {val}")
    return val


class ChromaKeyParams(BaseModel):
    """Validated Chroma Key / Green Screen Studio parameters for FFmpeg colorkey + despill."""

    preset: ChromaKeyPresetId = "studio_green"
    key_color: str = "#00b140"
    similarity: float = CHROMA_KEY_DEFAULT_SIMILARITY
    blend: float = CHROMA_KEY_DEFAULT_BLEND
    despill: bool = True
    despill_type: DespillType = "green"
    enabled: bool = True

    @field_validator("preset", mode="before")
    @classmethod
    def _validate_preset(cls, raw: Any) -> str:
        if not isinstance(raw, str):
            raise ValueError(f"preset must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned not in {"studio_green", "chroma_blue", "custom"}:
            raise ValueError(
                f"Unsupported chroma key preset {raw!r}; "
                "expected 'studio_green', 'chroma_blue', or 'custom'"
            )
        return cleaned

    @field_validator("key_color", mode="before")
    @classmethod
    def _validate_key_color(cls, raw: Any) -> str:
        if not isinstance(raw, str):
            raise ValueError(f"key_color must be a hex string '#RRGGBB', got {raw!r}")
        trimmed = raw.strip()
        if not _HEX_COLOR_RE.fullmatch(trimmed):
            raise ValueError(f"Invalid hex color {raw!r}; expected '#RRGGBB'")
        return trimmed.lower()

    @field_validator("similarity", mode="before")
    @classmethod
    def _validate_similarity(cls, raw: Any) -> float:
        return _validate_finite_bound_float(
            raw,
            "similarity",
            CHROMA_KEY_SIMILARITY_MIN,
            CHROMA_KEY_SIMILARITY_MAX,
        )

    @field_validator("blend", mode="before")
    @classmethod
    def _validate_blend(cls, raw: Any) -> float:
        return _validate_finite_bound_float(
            raw,
            "blend",
            CHROMA_KEY_BLEND_MIN,
            CHROMA_KEY_BLEND_MAX,
        )

    @field_validator("despill", "enabled", mode="before")
    @classmethod
    def _validate_bool_flag(cls, raw: Any, info: Any) -> bool:
        if not isinstance(raw, bool):
            raise ValueError(f"{info.field_name} must be a boolean, got {raw!r}")
        return raw

    @field_validator("despill_type", mode="before")
    @classmethod
    def _validate_despill_type(cls, raw: Any) -> str:
        if not isinstance(raw, str):
            raise ValueError(f"despill_type must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned not in {"green", "blue"}:
            raise ValueError(
                f"Unsupported despill_type {raw!r}; expected 'green' or 'blue'"
            )
        return cleaned

    def is_active(self) -> bool:
        """Return True when chroma keying is enabled."""
        return self.enabled


class ChromaKeyPreset(BaseModel):
    """Built-in broadcast chroma key studio preset."""

    id: ChromaKeyPresetId
    name: str
    key_color: str
    similarity: float
    blend: float
    despill: bool
    despill_type: DespillType
    description: str


class ChromaKeyCompileResult(BaseModel):
    """Compiled FFmpeg colorkey + optional despill filtergraph and validated parameters."""

    filtergraph: str
    ffmpeg_vf_args: list[str]
    is_active: bool
    params: ChromaKeyParams


CHROMA_KEY_PRESETS: tuple[ChromaKeyPreset, ...] = (
    ChromaKeyPreset(
        id="studio_green",
        name="Studio Green",
        key_color="#00b140",
        similarity=0.18,
        blend=0.08,
        despill=True,
        despill_type="green",
        description="Broadcast studio green screen (#00B140) with green spill suppression.",
    ),
    ChromaKeyPreset(
        id="chroma_blue",
        name="Chroma Blue",
        key_color="#0047bb",
        similarity=0.20,
        blend=0.08,
        despill=True,
        despill_type="blue",
        description="Broadcast chroma blue screen (#0047BB) with blue spill suppression.",
    ),
    ChromaKeyPreset(
        id="custom",
        name="Custom Hex",
        key_color="#00b140",
        similarity=0.18,
        blend=0.08,
        despill=True,
        despill_type="green",
        description="Custom #RRGGBB key color with selectable green or blue spill suppression.",
    ),
)


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
    FxPreset(
        id="35mm_cinema",
        name="35mm Cinema",
        category="Film",
        description="Clean 35mm theatrical grain paired with subtle optical lens vignette.",
        nodes=[
            FxNode(
                effect="film_grain",
                enabled=True,
                params={
                    "strength": 16.0,
                },
            ),
            FxNode(
                effect="vignette",
                enabled=True,
                params={
                    "angle_rad": 0.45,
                },
            ),
        ],
    ),
    FxPreset(
        id="moody_vignette",
        name="Moody Vignette",
        category="Film",
        description="Deep anamorphic edge falloff with fine 35mm shadow grain texture.",
        nodes=[
            FxNode(
                effect="vignette",
                enabled=True,
                params={
                    "angle_rad": 0.92,
                },
            ),
            FxNode(
                effect="film_grain",
                enabled=True,
                params={
                    "strength": 8.0,
                },
            ),
        ],
    ),
    FxPreset(
        id="cyberpunk_glow",
        name="Cyberpunk Glow",
        category="Stylize",
        description=(
            "Neon Sapphire optical glow paired with prismatic RGB horizontal channel split."
        ),
        nodes=[
            FxNode(
                effect="optical_glow",
                enabled=True,
                params={
                    "glow_intensity": 0.72,
                    "glow_radius": 16.0,
                },
            ),
            FxNode(
                effect="rgb_split",
                enabled=True,
                params={
                    "chroma_shift_px": 6,
                },
            ),
        ],
    ),
    FxPreset(
        id="anamorphic_dream",
        name="Anamorphic Dream",
        category="Optical",
        description="Wide optical halation with subtle chromatic fringe and cinema vignette.",
        nodes=[
            FxNode(
                effect="optical_glow",
                enabled=True,
                params={
                    "glow_intensity": 0.55,
                    "glow_radius": 20.0,
                },
            ),
            FxNode(
                effect="rgb_split",
                enabled=True,
                params={
                    "chroma_shift_px": 3,
                },
            ),
            FxNode(
                effect="vignette",
                enabled=True,
                params={
                    "angle_rad": 0.42,
                },
            ),
        ],
    ),
    FxPreset(
        id="cinema_35mm",
        name="35mm Cinema Halation",
        category="Film",
        description=(
            "35mm red-orange highlight halation with 2.39:1 anamorphic letterbox and organic grain."
        ),
        nodes=[
            FxNode(
                effect="halation",
                enabled=True,
                params={
                    "halation_strength": 0.55,
                    "halation_radius": 10.0,
                },
            ),
            FxNode(
                effect="letterbox",
                enabled=True,
                params={
                    "ratio": "2.39",
                },
            ),
            FxNode(
                effect="film_grain",
                enabled=True,
                params={
                    "strength": 14.0,
                },
            ),
        ],
    ),
    FxPreset(
        id="action_handheld",
        name="Action Handheld",
        category="Motion",
        description=(
            "Organic handheld camera shake paired with subtle RGB split and optical vignette."
        ),
        nodes=[
            FxNode(
                effect="camera_shake",
                enabled=True,
                params={
                    "amplitude_px": 10.0,
                    "frequency_hz": 5.5,
                },
            ),
            FxNode(
                effect="rgb_split",
                enabled=True,
                params={
                    "chroma_shift_px": 2,
                },
            ),
            FxNode(
                effect="vignette",
                enabled=True,
                params={
                    "angle_rad": 0.52,
                },
            ),
        ],
    ),
    FxPreset(
        id="retro_vhs",
        name="Retro VHS CRT",
        category="Retro",
        description=(
            "CRT horizontal scanlines combined with VHS RGB channel split and analog tape grain."
        ),
        nodes=[
            FxNode(
                effect="scanlines",
                enabled=True,
                params={
                    "line_spacing_px": 4,
                    "opacity": 0.45,
                },
            ),
            FxNode(
                effect="rgb_split",
                enabled=True,
                params={
                    "chroma_shift_px": 4,
                },
            ),
            FxNode(
                effect="film_grain",
                enabled=True,
                params={
                    "strength": 18.0,
                },
            ),
        ],
    ),
    FxPreset(
        id="neon_shift",
        name="Neon Hue Shift",
        category="Stylize",
        description=(
            "Vibrant 45-degree hue rotation and saturation boost with optical glow and vignette."
        ),
        nodes=[
            FxNode(
                effect="hue_shift",
                enabled=True,
                params={
                    "hue_deg": 45.0,
                    "saturation": 1.45,
                },
            ),
            FxNode(
                effect="optical_glow",
                enabled=True,
                params={
                    "glow_intensity": 0.65,
                    "glow_radius": 14.0,
                },
            ),
            FxNode(
                effect="vignette",
                enabled=True,
                params={
                    "angle_rad": 0.58,
                },
            ),
        ],
    ),
    FxPreset(
        id="retro_arcade",
        name="Retro Arcade Pixel",
        category="Stylize",
        description=(
            "8-bit mosaic pixelation paired with CRT scanlines and RGB chromatic split."
        ),
        nodes=[
            FxNode(
                effect="mosaic_pixelate",
                enabled=True,
                params={
                    "block_size_px": 10,
                },
            ),
            FxNode(
                effect="scanlines",
                enabled=True,
                params={
                    "line_spacing_px": 4,
                    "opacity": 0.45,
                },
            ),
            FxNode(
                effect="rgb_split",
                enabled=True,
                params={
                    "chroma_shift_px": 3,
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


def normalize_enum_fx_param(raw: Any, spec: FxParamSpec) -> str:
    """Validate and canonicalize an enum FX parameter against its allowed options."""
    if isinstance(raw, bool):
        raise ValueError(f"Parameter {spec.name!r} must not be bool")
    options = spec.options or ()
    if isinstance(raw, int | float):
        if spec.name != "ratio":
            raise ValueError(
                f"Parameter {spec.name!r} must be one of {', '.join(options)}, got {raw!r}"
            )
        num = float(raw)
        if not math.isfinite(num):
            raise ValueError(f"Parameter {spec.name!r} must be finite, got {raw!r}")
        candidate = f"{num:.2f}"
    elif isinstance(raw, str):
        trimmed = raw.strip()
        if spec.name in ("axis", "mode"):
            candidate = trimmed.lower()
        else:
            candidate = _LETTERBOX_RATIO_ALIASES.get(trimmed, trimmed)
    else:
        raise ValueError(f"Parameter {spec.name!r} must be a valid option string, got {raw!r}")

    if spec.name == "ratio" and candidate in _LETTERBOX_RATIO_ALIASES:
        candidate = _LETTERBOX_RATIO_ALIASES[candidate]
    if candidate not in options:
        raise ValueError(
            f"Unsupported value {raw!r} for {spec.name!r}; expected one of {', '.join(options)}"
        )
    return candidate


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
        elif spec.kind == "enum":
            normalized_params[spec.name] = normalize_enum_fx_param(raw_val, spec)
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


def _compile_vignette(params: dict[str, float | int | str]) -> str:
    angle_rad = _clamp_num(float(params["angle_rad"]), 0.1, 1.2)
    return f"vignette=angle={angle_rad:.3f}"


def _compile_film_grain(params: dict[str, float | int | str]) -> str:
    strength = _clamp_num(float(params["strength"]), 0.0, 40.0)
    alls = round(strength)
    return f"noise=alls={alls}:allf=t+u"


def _compile_optical_glow(idx: int, params: dict[str, float | int | str]) -> str:
    intensity = _clamp_num(float(params["glow_intensity"]), 0.0, 1.0)
    radius = _clamp_num(float(params["glow_radius"]), 2.0, 24.0)
    g0 = "g0" if idx == 0 else f"g{idx}a"
    g1 = "g1" if idx == 0 else f"g{idx}b"
    gb = "gb" if idx == 0 else f"gb{idx}"
    return (
        f"split[{g0}][{g1}];"
        f"[{g1}]gblur=sigma={radius:.2f}[{gb}];"
        f"[{g0}][{gb}]blend=all_mode=screen:all_opacity={intensity:.4f}"
    )


def _compile_rgb_split(params: dict[str, float | int | str]) -> str:
    shift_px = round(_clamp_num(float(params["chroma_shift_px"]), 0.0, 12.0))
    return f"rgbashift=rh={shift_px}:bh={-shift_px}"


def _compile_halation(idx: int, params: dict[str, float | int | str]) -> str:
    strength = _clamp_num(float(params["halation_strength"]), 0.0, 1.0)
    radius = _clamp_num(float(params["halation_radius"]), 2.0, 20.0)
    base_pad = f"hal{idx}_base"
    src_pad = f"hal{idx}_src"
    blur_pad = f"hal{idx}_blur"
    return (
        f"split[{base_pad}][{src_pad}];"
        f"[{src_pad}]lutrgb="
        "r='if(gte(val,155),min(255,(val-155)*2.4000),0)':"
        "g='if(gte(val,155),min(255,(val-155)*0.8200),0)':"
        "b='if(gte(val,155),min(255,(val-155)*0.1800),0)',"
        f"gblur=sigma={radius:.2f}:steps=2[{blur_pad}];"
        f"[{base_pad}][{blur_pad}]blend=all_mode=screen:all_opacity={strength:.4f}"
    )


def _compile_letterbox(params: dict[str, float | int | str]) -> str:
    ratio_str = normalize_enum_fx_param(params["ratio"], FX_PARAM_SPECS["letterbox"][0])
    ratio_val = float(ratio_str)
    bar_frac = round(max(0.0, (1.0 - (16.0 / 9.0) / ratio_val) / 2.0), 4)
    return (
        f"drawbox=x=0:y=0:w=iw:h='round(ih*{bar_frac:.4f})':color=black@1:t=fill,"
        f"drawbox=x=0:y='ih-round(ih*{bar_frac:.4f})':w=iw:h='round(ih*{bar_frac:.4f})':"
        "color=black@1:t=fill"
    )


def _compile_camera_shake(
    params: dict[str, float | int | str],
    keyframes: Sequence[Keyframe] = (),
) -> str:
    amp = _clamp_num(float(params["amplitude_px"]), 1.0, 24.0)
    freq = _clamp_num(float(params["frequency_hz"]), 0.5, 12.0)

    if keyframes:
        max_k = max(k.value for k in keyframes)
        if max_k <= 0.0001:
            return "null"
        pad_amp = max(1, math.ceil(amp * max_k))
        kf_expr = _build_keyframe_expr(keyframes, time_var="t", clamp_unit=False)
        amp_expr = f"({amp:.4f}*({kf_expr}))"
    else:
        pad_amp = max(1, math.ceil(amp))
        amp_expr = f"{amp:.4f}"

    omega_x = round(2.0 * math.pi * freq, 4)
    omega_y = round(omega_x * 1.37, 4)
    margin = 2 * pad_amp
    return (
        f"scale=w=iw+{margin}:h=ih+{margin}:flags=bilinear,"
        f"crop=w=iw-{margin}:h=ih-{margin}:"
        f"x='{pad_amp}+{amp_expr}*sin(t*{omega_x:.4f})':"
        f"y='{pad_amp}+{amp_expr}*cos(t*{omega_y:.4f}+0.7)'"
    )


def _compile_lens_distortion(params: dict[str, float | int | str]) -> str:
    k1 = _clamp_num(float(params["k1"]), -0.50, 0.50)
    return f"lenscorrection=cx=0.5:cy=0.5:k1={k1:.4f}:k2=0"


def _compile_scanlines(params: dict[str, float | int | str]) -> str:
    spacing = round(_clamp_num(float(params["line_spacing_px"]), 2.0, 12.0))
    opacity = _clamp_num(float(params["opacity"]), 0.10, 0.90)
    return f"drawgrid=w=0:h={spacing}:t=1:c=black@{opacity:.4f}"


def _compile_unsharp_mask(params: dict[str, float | int | str]) -> str:
    amount = _clamp_num(float(params["sharpen_amount"]), 0.20, 3.00)
    return f"unsharp=5:5:{amount:.4f}:5:5:0.0"


def _compile_hue_shift(params: dict[str, float | int | str]) -> str:
    hue_deg = _clamp_num(float(params["hue_deg"]), -180.0, 180.0)
    saturation = _clamp_num(float(params["saturation"]), 0.0, 2.5)
    return f"hue=h={hue_deg:.2f}:s={saturation:.4f}"


def _compile_mirror_flip(params: dict[str, float | int | str]) -> str:
    axis = normalize_enum_fx_param(params["axis"], FX_PARAM_SPECS["mirror_flip"][0])
    if axis == "vertical":
        return "vflip"
    if axis == "both":
        return "hflip,vflip"
    return "hflip"


def _compile_mosaic_pixelate(params: dict[str, float | int | str]) -> str:
    block_size = round(_clamp_num(float(params["block_size_px"]), 4.0, 48.0))
    return f"pixelize=w={block_size}:h={block_size}"


def _compile_invert_negative(
    params: dict[str, float | int | str],
    *,
    needs_rgb: bool = False,
) -> str:
    mode = normalize_enum_fx_param(params["mode"], FX_PARAM_SPECS["invert_negative"][0])
    if mode == "luma":
        if needs_rgb:
            return "format=yuv444p,negate=components=y:negate_alpha=0,format=rgb24"
        return "format=yuv444p,negate=components=y:negate_alpha=0"
    return "negate=negate_alpha=0"


def list_chroma_key_presets() -> list[ChromaKeyPreset]:
    """Return all built-in Chroma Key / Green Screen Studio presets."""
    return [preset.model_copy(deep=True) for preset in CHROMA_KEY_PRESETS]


def get_chroma_key_preset(preset_id: str) -> ChromaKeyPreset:
    """Look up a built-in chroma key preset by id or case-insensitive display name."""
    if not isinstance(preset_id, str):
        raise ValueError(f"preset_id must be a string, got {preset_id!r}")
    target = preset_id.strip().lower()
    for preset in CHROMA_KEY_PRESETS:
        if preset.id == target or preset.name.lower() == target:
            return preset.model_copy(deep=True)
    raise ValueError(f"Unknown chroma key preset: {preset_id!r}")


def apply_chroma_key_preset(preset_id: str) -> ChromaKeyParams:
    """Return a validated ChromaKeyParams object initialized from a built-in preset."""
    preset = get_chroma_key_preset(preset_id)
    return ChromaKeyParams(
        preset=preset.id,
        key_color=preset.key_color,
        similarity=preset.similarity,
        blend=preset.blend,
        despill=preset.despill,
        despill_type=preset.despill_type,
        enabled=True,
    )


def _coerce_chroma_key_params(raw: ChromaKeyParams | dict[str, Any]) -> ChromaKeyParams:
    if isinstance(raw, ChromaKeyParams):
        return ChromaKeyParams.model_validate(raw.model_dump())
    return ChromaKeyParams.model_validate(raw)


def compile_chroma_key_filter(
    chroma_key: ChromaKeyParams | dict[str, Any],
    *,
    pix_fmt: str | None = None,
) -> str:
    """Compile validated ChromaKeyParams into a safe FFmpeg colorkey + optional despill filter."""
    params = _coerce_chroma_key_params(chroma_key)
    if pix_fmt is not None and pix_fmt not in ALLOWED_CHROMA_PIX_FMTS:
        raise ValueError(f"Unsupported pixel format: {pix_fmt!r}")
    if not params.is_active():
        return ""

    ff_color = f"0x{params.key_color[1:].lower()}"
    parts: list[str] = [
        "format=rgba",
        f"colorkey=color={ff_color}:similarity={params.similarity:.4f}:blend={params.blend:.4f}",
    ]
    if params.despill:
        parts.append(f"despill=type={params.despill_type}")
    if pix_fmt is not None and pix_fmt != "rgba":
        parts.append(f"format={pix_fmt}")
    return ",".join(parts)


def compile_chroma_key(
    chroma_key: ChromaKeyParams | dict[str, Any],
    *,
    pix_fmt: str | None = None,
) -> ChromaKeyCompileResult:
    """Compile Chroma Key parameters into an FFmpeg filtergraph, argv slice, and metadata."""
    params = _coerce_chroma_key_params(chroma_key)
    fg = compile_chroma_key_filter(params, pix_fmt=pix_fmt)
    return ChromaKeyCompileResult(
        filtergraph=fg,
        ffmpeg_vf_args=["-vf", fg] if fg else [],
        is_active=bool(fg),
        params=params,
    )


StabilizerPresetId = Literal["smooth_gimbal", "locked_tripod", "handheld_rescue", "custom"]
StabilizerEdgeMode = Literal["mirror", "clamp", "original", "blank"]
StabilizerSearchMode = Literal["exhaustive", "less"]

STABILIZER_RX_MIN: int = 0
STABILIZER_RX_MAX: int = 64
STABILIZER_RY_MIN: int = 0
STABILIZER_RY_MAX: int = 64
STABILIZER_BLOCKSIZE_MIN: int = 4
STABILIZER_BLOCKSIZE_MAX: int = 64
STABILIZER_CONTRAST_MIN: int = 1
STABILIZER_CONTRAST_MAX: int = 255
STABILIZER_AUTO_ZOOM_MIN: float = 100.0
STABILIZER_AUTO_ZOOM_MAX: float = 135.0
STABILIZER_AUTO_ZOOM_DEFAULT: float = 106.0

ALLOWED_STABILIZER_PRESETS: tuple[StabilizerPresetId, ...] = (
    "smooth_gimbal",
    "locked_tripod",
    "handheld_rescue",
    "custom",
)
ALLOWED_STABILIZER_EDGES: tuple[StabilizerEdgeMode, ...] = (
    "mirror",
    "clamp",
    "original",
    "blank",
)
ALLOWED_STABILIZER_SEARCH_MODES: tuple[StabilizerSearchMode, ...] = (
    "exhaustive",
    "less",
)


def _validate_finite_bound_int(
    raw: Any,
    field_name: str,
    min_val: int,
    max_val: int,
) -> int:
    if isinstance(raw, bool) or not isinstance(raw, int | float):
        raise ValueError(f"{field_name} must be an integer, got {raw!r}")
    val = float(raw)
    if not math.isfinite(val):
        raise ValueError(f"{field_name} must be finite, got {raw!r}")
    ival = round(val)
    if ival < min_val or ival > max_val:
        raise ValueError(f"{field_name} must be within [{min_val}, {max_val}], got {ival}")
    return ival


class StabilizerParams(BaseModel):
    """Validated motion stabilizer parameters compiled to FFmpeg deshake + auto-zoom."""

    enabled: bool = False
    preset: StabilizerPresetId = "smooth_gimbal"
    rx: int = 16
    ry: int = 16
    edge: StabilizerEdgeMode = "mirror"
    blocksize: int = 8
    contrast: int = 125
    search: StabilizerSearchMode = "exhaustive"
    auto_zoom_pct: float = STABILIZER_AUTO_ZOOM_DEFAULT

    @field_validator("enabled", mode="before")
    @classmethod
    def _validate_enabled(cls, raw: Any) -> bool:
        if not isinstance(raw, bool):
            raise ValueError(f"enabled must be a boolean, got {raw!r}")
        return raw

    @field_validator("preset", mode="before")
    @classmethod
    def _validate_preset(cls, raw: Any) -> str:
        if not isinstance(raw, str):
            raise ValueError(f"preset must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned not in ALLOWED_STABILIZER_PRESETS:
            allowed = ", ".join(ALLOWED_STABILIZER_PRESETS)
            raise ValueError(f"Unsupported stabilizer preset {raw!r}; expected one of: {allowed}")
        return cleaned

    @field_validator("rx", mode="before")
    @classmethod
    def _validate_rx(cls, raw: Any) -> int:
        return _validate_finite_bound_int(raw, "rx", STABILIZER_RX_MIN, STABILIZER_RX_MAX)

    @field_validator("ry", mode="before")
    @classmethod
    def _validate_ry(cls, raw: Any) -> int:
        return _validate_finite_bound_int(raw, "ry", STABILIZER_RY_MIN, STABILIZER_RY_MAX)

    @field_validator("edge", mode="before")
    @classmethod
    def _validate_edge(cls, raw: Any) -> str:
        if not isinstance(raw, str):
            raise ValueError(f"edge must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned not in ALLOWED_STABILIZER_EDGES:
            allowed = ", ".join(ALLOWED_STABILIZER_EDGES)
            raise ValueError(f"Unsupported stabilizer edge {raw!r}; expected one of: {allowed}")
        return cleaned

    @field_validator("blocksize", mode="before")
    @classmethod
    def _validate_blocksize(cls, raw: Any) -> int:
        return _validate_finite_bound_int(
            raw,
            "blocksize",
            STABILIZER_BLOCKSIZE_MIN,
            STABILIZER_BLOCKSIZE_MAX,
        )

    @field_validator("contrast", mode="before")
    @classmethod
    def _validate_contrast(cls, raw: Any) -> int:
        return _validate_finite_bound_int(
            raw,
            "contrast",
            STABILIZER_CONTRAST_MIN,
            STABILIZER_CONTRAST_MAX,
        )

    @field_validator("search", mode="before")
    @classmethod
    def _validate_search(cls, raw: Any) -> str:
        if not isinstance(raw, str):
            raise ValueError(f"search must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned not in ALLOWED_STABILIZER_SEARCH_MODES:
            allowed = ", ".join(ALLOWED_STABILIZER_SEARCH_MODES)
            raise ValueError(f"Unsupported stabilizer search {raw!r}; expected one of: {allowed}")
        return cleaned

    @field_validator("auto_zoom_pct", mode="before")
    @classmethod
    def _validate_auto_zoom_pct(cls, raw: Any) -> float:
        return _validate_finite_bound_float(
            raw,
            "auto_zoom_pct",
            STABILIZER_AUTO_ZOOM_MIN,
            STABILIZER_AUTO_ZOOM_MAX,
        )

    def is_active(self) -> bool:
        """Return True when motion stabilization is enabled."""
        return self.enabled


class StabilizerPreset(BaseModel):
    """Curated DaVinci/Premiere style motion stabilizer preset."""

    id: StabilizerPresetId
    name: str
    rx: int
    ry: int
    edge: StabilizerEdgeMode
    blocksize: int
    contrast: int
    search: StabilizerSearchMode
    auto_zoom_pct: float
    description: str


class StabilizerCompileResult(BaseModel):
    """Compiled FFmpeg deshake stabilizer filtergraph and validated parameters."""

    filtergraph: str
    ffmpeg_vf_args: list[str]
    is_active: bool
    params: StabilizerParams


STABILIZER_PRESETS: tuple[StabilizerPreset, ...] = (
    StabilizerPreset(
        id="smooth_gimbal",
        name="Smooth Gimbal",
        rx=16,
        ry=16,
        edge="mirror",
        blocksize=8,
        contrast=125,
        search="exhaustive",
        auto_zoom_pct=106.0,
        description="Subtle handheld smoothing with 106% edge compensation.",
    ),
    StabilizerPreset(
        id="locked_tripod",
        name="Locked Tripod",
        rx=32,
        ry=32,
        edge="clamp",
        blocksize=16,
        contrast=100,
        search="exhaustive",
        auto_zoom_pct=112.0,
        description="Tight tripod-style lockup for static interviews and B-roll.",
    ),
    StabilizerPreset(
        id="handheld_rescue",
        name="Handheld Rescue",
        rx=48,
        ry=48,
        edge="mirror",
        blocksize=12,
        contrast=90,
        search="exhaustive",
        auto_zoom_pct=118.0,
        description="Wide 48px search window for heavy walking handheld jitter.",
    ),
)


def list_stabilizer_presets() -> list[StabilizerPreset]:
    """Return built-in motion stabilizer presets."""
    return list(STABILIZER_PRESETS)


def get_stabilizer_preset(preset_id: str) -> StabilizerPreset:
    """Lookup a motion stabilizer preset by id."""
    cleaned = preset_id.strip().lower()
    for preset in STABILIZER_PRESETS:
        if preset.id == cleaned:
            return preset
    raise ValueError(f"Unknown stabilizer preset: {preset_id!r}")


def apply_stabilizer_preset(preset_id: str, *, enabled: bool = True) -> StabilizerParams:
    """Create StabilizerParams from a curated preset."""
    preset = get_stabilizer_preset(preset_id)
    return StabilizerParams(
        enabled=enabled,
        preset=preset.id,
        rx=preset.rx,
        ry=preset.ry,
        edge=preset.edge,
        blocksize=preset.blocksize,
        contrast=preset.contrast,
        search=preset.search,
        auto_zoom_pct=preset.auto_zoom_pct,
    )


def _coerce_stabilizer_params(raw: StabilizerParams | dict[str, Any]) -> StabilizerParams:
    if isinstance(raw, StabilizerParams):
        return StabilizerParams.model_validate(raw.model_dump())
    return StabilizerParams.model_validate(raw)


def compile_stabilizer_filter(
    stabilizer: StabilizerParams | dict[str, Any],
    *,
    width: int | None = None,
    height: int | None = None,
    pix_fmt: str | None = None,
) -> str:
    """Compile validated StabilizerParams into a safe FFmpeg deshake + auto-zoom filter."""
    params = _coerce_stabilizer_params(stabilizer)
    if pix_fmt is not None and pix_fmt not in ALLOWED_CHROMA_PIX_FMTS:
        raise ValueError(f"Unsupported pixel format: {pix_fmt!r}")
    if not params.is_active():
        return ""

    eff_rx = max(0, min(64, round(params.rx / 16) * 16))
    parts: list[str] = [
        (
            f"deshake=x=-1:y=-1:w=-1:h=-1"
            f":rx={eff_rx}:ry={params.ry}"
            f":edge={params.edge}:blocksize={params.blocksize}"
            f":contrast={params.contrast}:search={params.search}"
        )
    ]
    if params.auto_zoom_pct > 100.05:
        z = params.auto_zoom_pct / 100.0
        parts.append(
            f"scale=w=ceil(iw*{z:.4f}/2)*2:h=ceil(ih*{z:.4f}/2)*2:flags=bicubic"
        )
        if width is not None and height is not None:
            w_even = max(2, (int(width) // 2) * 2)
            h_even = max(2, (int(height) // 2) * 2)
            parts.append(
                f"crop=w={w_even}:h={h_even}:x=(iw-{w_even})/2:y=(ih-{h_even})/2"
            )
        else:
            parts.append(
                f"crop=w=floor(iw/{z:.4f}/2)*2:h=floor(ih/{z:.4f}/2)*2"
            )
        parts.append("setsar=1")
    if pix_fmt is not None:
        parts.append(f"format={pix_fmt}")
    return ",".join(parts)


def compile_stabilizer(
    stabilizer: StabilizerParams | dict[str, Any],
    *,
    width: int | None = None,
    height: int | None = None,
    pix_fmt: str | None = None,
) -> StabilizerCompileResult:
    """Compile motion stabilizer parameters into an FFmpeg filtergraph and metadata."""
    params = _coerce_stabilizer_params(stabilizer)
    fg = compile_stabilizer_filter(params, width=width, height=height, pix_fmt=pix_fmt)
    return StabilizerCompileResult(
        filtergraph=fg,
        ffmpeg_vf_args=["-vf", fg] if fg else [],
        is_active=bool(fg),
        params=params,
    )


CornerPinMode = Literal["corner_pin", "rectify_perspective", "point_track_only"]
PerspectiveInterpolation = Literal["linear", "cubic"]
PlanarTrackerPresetId = Literal[
    "screen_insert",
    "anamorphic_skew",
    "deskew_rectify",
    "point_follow",
    "custom",
]

ALLOWED_CORNER_PIN_MODES: tuple[CornerPinMode, ...] = (
    "corner_pin",
    "rectify_perspective",
    "point_track_only",
)
ALLOWED_PERSPECTIVE_INTERP: tuple[PerspectiveInterpolation, ...] = ("linear", "cubic")
ALLOWED_PLANAR_TRACKER_PRESETS: tuple[PlanarTrackerPresetId, ...] = (
    "screen_insert",
    "anamorphic_skew",
    "deskew_rectify",
    "point_follow",
    "custom",
)
PIN_COORD_MIN: float = -0.25
PIN_COORD_MAX: float = 1.25
TRACK_ANCHOR_MIN: float = 0.02
TRACK_ANCHOR_MAX: float = 0.98
TRACK_BOX_PCT_MIN: float = 0.04
TRACK_BOX_PCT_MAX: float = 0.35
MAX_TRACK_KEYFRAMES: int = 256
MAX_PERSPECTIVE_EXPR_SEGMENTS: int = 20


class TrackPointKeyframe(BaseModel):
    """A single 2D tracked feature keyframe in normalized frame coordinates."""

    frame: int = Field(ge=0)
    x: float
    y: float
    confidence: float = 1.0

    @field_validator("frame", mode="before")
    @classmethod
    def _validate_frame(cls, raw: Any) -> int:
        return _validate_finite_bound_int(raw, "frame", 0, 10_000_000)

    @field_validator("x", "y", mode="before")
    @classmethod
    def _validate_xy(cls, raw: Any, info: Any) -> float:
        return _validate_finite_bound_float(raw, str(info.field_name), -0.5, 1.5)

    @field_validator("confidence", mode="before")
    @classmethod
    def _validate_confidence(cls, raw: Any) -> float:
        return _validate_finite_bound_float(raw, "confidence", 0.0, 1.0)


class PlanarTrackerParams(BaseModel):
    """Validated 2D Planar Point Tracker and 4-Corner Pin perspective parameters."""

    enabled: bool = False
    preset: PlanarTrackerPresetId = "screen_insert"
    mode: CornerPinMode = "corner_pin"
    interpolation: PerspectiveInterpolation = "cubic"
    tl_x: float = 0.08
    tl_y: float = 0.10
    tr_x: float = 0.92
    tr_y: float = 0.08
    bl_x: float = 0.06
    bl_y: float = 0.90
    br_x: float = 0.94
    br_y: float = 0.92
    track_anchor_x: float = 0.50
    track_anchor_y: float = 0.45
    track_box_pct: float = 0.12
    follow_track: bool = True
    track_keyframes: list[TrackPointKeyframe] = Field(default_factory=list)

    @field_validator("enabled", "follow_track", mode="before")
    @classmethod
    def _validate_bools(cls, raw: Any, info: Any) -> bool:
        if not isinstance(raw, bool):
            raise ValueError(f"{info.field_name} must be a boolean, got {raw!r}")
        return raw

    @field_validator("preset", mode="before")
    @classmethod
    def _validate_preset(cls, raw: Any) -> str:
        if not isinstance(raw, str):
            raise ValueError(f"preset must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned not in ALLOWED_PLANAR_TRACKER_PRESETS:
            allowed = ", ".join(ALLOWED_PLANAR_TRACKER_PRESETS)
            raise ValueError(
                f"Unsupported planar tracker preset {raw!r}; expected one of: {allowed}"
            )
        return cleaned

    @field_validator("mode", mode="before")
    @classmethod
    def _validate_mode(cls, raw: Any) -> str:
        if not isinstance(raw, str):
            raise ValueError(f"mode must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned not in ALLOWED_CORNER_PIN_MODES:
            allowed = ", ".join(ALLOWED_CORNER_PIN_MODES)
            raise ValueError(f"Unsupported corner-pin mode {raw!r}; expected one of: {allowed}")
        return cleaned

    @field_validator("interpolation", mode="before")
    @classmethod
    def _validate_interpolation(cls, raw: Any) -> str:
        if not isinstance(raw, str):
            raise ValueError(f"interpolation must be a string, got {raw!r}")
        cleaned = raw.strip().lower()
        if cleaned not in ALLOWED_PERSPECTIVE_INTERP:
            allowed = ", ".join(ALLOWED_PERSPECTIVE_INTERP)
            raise ValueError(f"Unsupported interpolation {raw!r}; expected one of: {allowed}")
        return cleaned

    @field_validator(
        "tl_x",
        "tl_y",
        "tr_x",
        "tr_y",
        "bl_x",
        "bl_y",
        "br_x",
        "br_y",
        mode="before",
    )
    @classmethod
    def _validate_pin_coord(cls, raw: Any, info: Any) -> float:
        return _validate_finite_bound_float(
            raw,
            str(info.field_name),
            PIN_COORD_MIN,
            PIN_COORD_MAX,
        )

    @field_validator("track_anchor_x", "track_anchor_y", mode="before")
    @classmethod
    def _validate_anchor(cls, raw: Any, info: Any) -> float:
        return _validate_finite_bound_float(
            raw,
            str(info.field_name),
            TRACK_ANCHOR_MIN,
            TRACK_ANCHOR_MAX,
        )

    @field_validator("track_box_pct", mode="before")
    @classmethod
    def _validate_track_box_pct(cls, raw: Any) -> float:
        return _validate_finite_bound_float(
            raw,
            "track_box_pct",
            TRACK_BOX_PCT_MIN,
            TRACK_BOX_PCT_MAX,
        )

    @field_validator("track_keyframes")
    @classmethod
    def _validate_track_keyframes(
        cls,
        kfs: list[TrackPointKeyframe],
    ) -> list[TrackPointKeyframe]:
        if len(kfs) > MAX_TRACK_KEYFRAMES:
            raise ValueError(f"At most {MAX_TRACK_KEYFRAMES} track keyframes are supported")
        dedup: dict[int, TrackPointKeyframe] = {}
        for kf in kfs:
            dedup[kf.frame] = kf
        return [dedup[f] for f in sorted(dedup)]

    def is_identity_corners(self) -> bool:
        """Return True when all 4 corner pins match the unwarped frame corners."""
        return (
            abs(self.tl_x - 0.0) <= 1e-4
            and abs(self.tl_y - 0.0) <= 1e-4
            and abs(self.tr_x - 1.0) <= 1e-4
            and abs(self.tr_y - 0.0) <= 1e-4
            and abs(self.bl_x - 0.0) <= 1e-4
            and abs(self.bl_y - 1.0) <= 1e-4
            and abs(self.br_x - 1.0) <= 1e-4
            and abs(self.br_y - 1.0) <= 1e-4
        )

    def is_active(self) -> bool:
        """Return True when planar tracking / corner-pin produces an active perspective warp."""
        if not self.enabled or self.mode == "point_track_only":
            return False
        has_track_motion = self.follow_track and len(self.track_keyframes) >= 2
        return not self.is_identity_corners() or has_track_motion


class PlanarTrackerPreset(BaseModel):
    """Curated Mocha/Fusion style 2D Planar Tracker & Corner-Pin preset."""

    id: PlanarTrackerPresetId
    name: str
    mode: CornerPinMode
    interpolation: PerspectiveInterpolation
    tl_x: float
    tl_y: float
    tr_x: float
    tr_y: float
    bl_x: float
    bl_y: float
    br_x: float
    br_y: float
    description: str


class PlanarTrackerCompileResult(BaseModel):
    """Compiled FFmpeg perspective corner-pin filtergraph and validated parameters."""

    filtergraph: str
    ffmpeg_vf_args: list[str]
    is_active: bool
    mode: CornerPinMode
    uses_per_frame_eval: bool
    keyframe_count: int
    params: PlanarTrackerParams


PLANAR_TRACKER_PRESETS: tuple[PlanarTrackerPreset, ...] = (
    PlanarTrackerPreset(
        id="screen_insert",
        name="Screen Insert",
        mode="corner_pin",
        interpolation="cubic",
        tl_x=0.14,
        tl_y=0.14,
        tr_x=0.84,
        tr_y=0.18,
        bl_x=0.10,
        bl_y=0.84,
        br_x=0.86,
        br_y=0.88,
        description="Perspective corner-pin insert for angled monitors and billboards.",
    ),
    PlanarTrackerPreset(
        id="anamorphic_skew",
        name="Anamorphic Skew",
        mode="corner_pin",
        interpolation="cubic",
        tl_x=0.05,
        tl_y=0.06,
        tr_x=0.95,
        tr_y=0.14,
        bl_x=0.12,
        bl_y=0.94,
        br_x=0.90,
        br_y=0.86,
        description="Dynamic 4-corner parallax warp for HUD and screen overlays.",
    ),
    PlanarTrackerPreset(
        id="deskew_rectify",
        name="Deskew / Rectify",
        mode="rectify_perspective",
        interpolation="cubic",
        tl_x=0.12,
        tl_y=0.10,
        tr_x=0.88,
        tr_y=0.14,
        bl_x=0.08,
        bl_y=0.90,
        br_x=0.92,
        br_y=0.88,
        description="Flatten a skewed planar region in source footage back to full 16:9.",
    ),
    PlanarTrackerPreset(
        id="point_follow",
        name="2D Point Follow",
        mode="point_track_only",
        interpolation="cubic",
        tl_x=0.0,
        tl_y=0.0,
        tr_x=1.0,
        tr_y=0.0,
        bl_x=0.0,
        bl_y=1.0,
        br_x=1.0,
        br_y=1.0,
        description="Track 2D anchor without warping picture; drive Color Power Windows.",
    ),
)


def list_planar_tracker_presets() -> list[PlanarTrackerPreset]:
    """Return built-in 2D Planar Tracker & Corner-Pin presets."""
    return list(PLANAR_TRACKER_PRESETS)


def get_planar_tracker_preset(preset_id: str) -> PlanarTrackerPreset:
    """Lookup a 2D Planar Tracker preset by id."""
    cleaned = preset_id.strip().lower()
    for preset in PLANAR_TRACKER_PRESETS:
        if preset.id == cleaned:
            return preset
    raise ValueError(f"Unknown planar tracker preset: {preset_id!r}")


def apply_planar_tracker_preset(preset_id: str, *, enabled: bool = True) -> PlanarTrackerParams:
    """Create PlanarTrackerParams from a curated preset."""
    preset = get_planar_tracker_preset(preset_id)
    return PlanarTrackerParams(
        enabled=enabled,
        preset=preset.id,
        mode=preset.mode,
        interpolation=preset.interpolation,
        tl_x=preset.tl_x,
        tl_y=preset.tl_y,
        tr_x=preset.tr_x,
        tr_y=preset.tr_y,
        bl_x=preset.bl_x,
        bl_y=preset.bl_y,
        br_x=preset.br_x,
        br_y=preset.br_y,
    )


def _coerce_planar_tracker_params(
    raw: PlanarTrackerParams | dict[str, Any],
) -> PlanarTrackerParams:
    if isinstance(raw, PlanarTrackerParams):
        return PlanarTrackerParams.model_validate(raw.model_dump())
    return PlanarTrackerParams.model_validate(raw)


def evaluate_track_point_at_frame(
    params: PlanarTrackerParams,
    frame: int,
) -> tuple[float, float, float]:
    """Evaluate normalized 2D track (x, y, confidence) at integer frame via linear interp."""
    kfs = params.track_keyframes
    if not kfs:
        return (params.track_anchor_x, params.track_anchor_y, 1.0)
    if frame <= kfs[0].frame:
        return (kfs[0].x, kfs[0].y, kfs[0].confidence)
    if frame >= kfs[-1].frame:
        return (kfs[-1].x, kfs[-1].y, kfs[-1].confidence)
    for idx in range(len(kfs) - 1):
        a = kfs[idx]
        b = kfs[idx + 1]
        if a.frame <= frame <= b.frame:
            span = max(1, b.frame - a.frame)
            u = (frame - a.frame) / span
            return (
                a.x + (b.x - a.x) * u,
                a.y + (b.y - a.y) * u,
                a.confidence + (b.confidence - a.confidence) * u,
            )
    return (kfs[-1].x, kfs[-1].y, kfs[-1].confidence)


def evaluate_corner_pins_at_frame(
    params: PlanarTrackerParams,
    frame: int,
) -> tuple[tuple[float, float], tuple[float, float], tuple[float, float], tuple[float, float]]:
    """Return ((tl_x, tl_y), (tr_x, tr_y), (bl_x, bl_y), (br_x, br_y)) at frame."""
    dx = 0.0
    dy = 0.0
    if params.follow_track and len(params.track_keyframes) >= 1:
        ref_x = params.track_keyframes[0].x
        ref_y = params.track_keyframes[0].y
        cur_x, cur_y, _ = evaluate_track_point_at_frame(params, frame)
        dx = cur_x - ref_x
        dy = cur_y - ref_y
    return (
        (params.tl_x + dx, params.tl_y + dy),
        (params.tr_x + dx, params.tr_y + dy),
        (params.bl_x + dx, params.bl_y + dy),
        (params.br_x + dx, params.br_y + dy),
    )


def track_point_sequence_luma(
    frames: Sequence[Sequence[int] | bytes | bytearray],
    width: int,
    height: int,
    *,
    anchor_x: float,
    anchor_y: float,
    box_pct: float = 0.12,
    search_radius_px: int = 20,
    start_frame: int = 0,
) -> list[TrackPointKeyframe]:
    """Track a 2D luminance template patch across grayscale frames via SSD block matching."""
    if width < 8 or height < 8:
        raise ValueError(f"Frame dimensions too small for tracking: {width}x{height}")
    if not frames:
        return []
    expected_len = width * height
    for idx, buf in enumerate(frames):
        if len(buf) != expected_len:
            raise ValueError(
                f"Frame {idx} buffer length {len(buf)} != {width}x{height}={expected_len}"
            )

    ax = _validate_finite_bound_float(anchor_x, "anchor_x", 0.02, 0.98)
    ay = _validate_finite_bound_float(anchor_y, "anchor_y", 0.02, 0.98)
    bp = _validate_finite_bound_float(box_pct, "box_pct", 0.04, 0.35)
    rad = max(2, min(64, int(search_radius_px)))

    half_w = max(3, round(width * bp * 0.5))
    half_h = max(3, round(height * bp * 0.5))
    cur_px = ax * width
    cur_py = ay * height

    results: list[TrackPointKeyframe] = [
        TrackPointKeyframe(
            frame=start_frame,
            x=round(cur_px / width, 5),
            y=round(cur_py / height, 5),
            confidence=1.0,
        )
    ]

    for f_idx in range(1, len(frames)):
        prev_buf = frames[f_idx - 1]
        curr_buf = frames[f_idx]
        cx_i = max(half_w, min(width - 1 - half_w, round(cur_px)))
        cy_i = max(half_h, min(height - 1 - half_h, round(cur_py)))

        # Compute template energy for normalized confidence
        tpl_vals: list[int] = []
        tpl_sum = 0
        for dy_t in range(-half_h, half_h + 1):
            row_off = (cy_i + dy_t) * width
            for dx_t in range(-half_w, half_w + 1):
                v = int(prev_buf[row_off + cx_i + dx_t])
                tpl_vals.append(v)
                tpl_sum += v
        n_pix = len(tpl_vals)
        tpl_mean = tpl_sum / max(1, n_pix)
        tpl_var = sum((v - tpl_mean) ** 2 for v in tpl_vals)

        min_dx = max(half_w - cx_i, -rad)
        max_dx = min(width - 1 - half_w - cx_i, rad)
        min_dy = max(half_h - cy_i, -rad)
        max_dy = min(height - 1 - half_h - cy_i, rad)

        best_ssd = float("inf")
        best_ox = 0
        best_oy = 0
        ssd_grid: dict[tuple[int, int], float] = {}

        for oy in range(min_dy, max_dy + 1):
            for ox in range(min_dx, max_dx + 1):
                ssd = 0.0
                k = 0
                base_y = cy_i + oy
                base_x = cx_i + ox
                for dy_t in range(-half_h, half_h + 1):
                    row_off = (base_y + dy_t) * width + base_x
                    for dx_t in range(-half_w, half_w + 1):
                        diff = int(curr_buf[row_off + dx_t]) - tpl_vals[k]
                        ssd += diff * diff
                        k += 1
                ssd_grid[(ox, oy)] = ssd
                if ssd < best_ssd:
                    best_ssd = ssd
                    best_ox = ox
                    best_oy = oy

        # Parabolic sub-pixel refinement on X and Y
        sub_x = 0.0
        sub_y = 0.0
        if (best_ox - 1, best_oy) in ssd_grid and (best_ox + 1, best_oy) in ssd_grid:
            s_l = ssd_grid[(best_ox - 1, best_oy)]
            s_c = ssd_grid[(best_ox, best_oy)]
            s_r = ssd_grid[(best_ox + 1, best_oy)]
            denom_x = 2.0 * (s_l - 2.0 * s_c + s_r)
            if abs(denom_x) > 1e-6:
                sub_x = max(-0.5, min(0.5, (s_l - s_r) / denom_x))
        if (best_ox, best_oy - 1) in ssd_grid and (best_ox, best_oy + 1) in ssd_grid:
            s_u = ssd_grid[(best_ox, best_oy - 1)]
            s_c = ssd_grid[(best_ox, best_oy)]
            s_d = ssd_grid[(best_ox, best_oy + 1)]
            denom_y = 2.0 * (s_u - 2.0 * s_c + s_d)
            if abs(denom_y) > 1e-6:
                sub_y = max(-0.5, min(0.5, (s_u - s_d) / denom_y))

        cur_px = max(2.0, min(width - 2.0, cx_i + best_ox + sub_x))
        cur_py = max(2.0, min(height - 2.0, cy_i + best_oy + sub_y))
        norm_denom = max(tpl_var, n_pix * 225.0)
        conf = max(0.0, min(1.0, 1.0 - (best_ssd / norm_denom)))
        results.append(
            TrackPointKeyframe(
                frame=start_frame + f_idx,
                x=round(cur_px / width, 5),
                y=round(cur_py / height, 5),
                confidence=round(conf, 4),
            )
        )
    return results


def _downsample_track_keyframes(
    keyframes: Sequence[TrackPointKeyframe],
    max_points: int,
) -> list[TrackPointKeyframe]:
    if len(keyframes) <= max_points:
        return list(keyframes)
    step = (len(keyframes) - 1) / (max_points - 1)
    indices = sorted({0, len(keyframes) - 1, *(round(i * step) for i in range(max_points))})
    return [keyframes[i] for i in indices]


def _build_piecewise_delta_expr(
    keyframes: Sequence[TrackPointKeyframe],
    axis: Literal["x", "y"],
    dim_sym: Literal["W", "H"],
) -> str:
    sampled = _downsample_track_keyframes(keyframes, MAX_PERSPECTIVE_EXPR_SEGMENTS + 1)
    ref = sampled[0].x if axis == "x" else sampled[0].y
    deltas = [
        (kf.frame, round((kf.x if axis == "x" else kf.y) - ref, 5))
        for kf in sampled
    ]
    if all(abs(d) <= 1e-5 for _, d in deltas):
        return ""

    # Build nested if(lt(in, f_next), lerp_expr, tail)
    tail = f"({deltas[-1][1]:+.5f})*{dim_sym}"
    expr = tail
    for idx in range(len(deltas) - 2, -1, -1):
        f0, d0 = deltas[idx]
        f1, d1 = deltas[idx + 1]
        span = max(1, f1 - f0)
        if abs(d1 - d0) <= 1e-5:
            seg_val = f"({d0:+.5f})*{dim_sym}"
        else:
            slope = (d1 - d0) / span
            seg_val = f"(({d0:+.5f})+({slope:+.7f})*max(0\\,in-{f0}))*{dim_sym}"
        expr = f"if(lt(in\\,{f1})\\,{seg_val}\\,{expr})"
    return expr


def compile_planar_tracker_filter(
    planar_tracker: PlanarTrackerParams | dict[str, Any],
    *,
    pix_fmt: str | None = None,
) -> str:
    """Compile validated PlanarTrackerParams into an FFmpeg perspective corner-pin filter."""
    params = _coerce_planar_tracker_params(planar_tracker)
    if pix_fmt is not None and pix_fmt not in ALLOWED_CHROMA_PIX_FMTS:
        raise ValueError(f"Unsupported pixel format: {pix_fmt!r}")
    if not params.is_active():
        return ""

    sense = "destination" if params.mode == "corner_pin" else "source"
    use_dynamic = params.follow_track and len(params.track_keyframes) >= 2
    dx_expr = _build_piecewise_delta_expr(params.track_keyframes, "x", "W") if use_dynamic else ""
    dy_expr = _build_piecewise_delta_expr(params.track_keyframes, "y", "H") if use_dynamic else ""
    has_eval_frame = bool(dx_expr or dy_expr)

    def _coord_expr(base: float, dim_sym: Literal["W", "H"], delta_expr: str) -> str:
        base_str = f"{base:.4f}*{dim_sym}"
        return f"{base_str}+{delta_expr}" if delta_expr else base_str

    x0 = _coord_expr(params.tl_x, "W", dx_expr)
    y0 = _coord_expr(params.tl_y, "H", dy_expr)
    x1 = _coord_expr(params.tr_x, "W", dx_expr)
    y1 = _coord_expr(params.tr_y, "H", dy_expr)
    x2 = _coord_expr(params.bl_x, "W", dx_expr)
    y2 = _coord_expr(params.bl_y, "H", dy_expr)
    x3 = _coord_expr(params.br_x, "W", dx_expr)
    y3 = _coord_expr(params.br_y, "H", dy_expr)

    persp = (
        f"perspective=x0={x0}:y0={y0}:x1={x1}:y1={y1}"
        f":x2={x2}:y2={y2}:x3={x3}:y3={y3}"
        f":interpolation={params.interpolation}:sense={sense}"
    )
    if has_eval_frame:
        persp += ":eval=frame"
    if pix_fmt is not None:
        return f"{persp},format={pix_fmt}"
    return persp


def compile_planar_tracker(
    planar_tracker: PlanarTrackerParams | dict[str, Any],
    *,
    pix_fmt: str | None = None,
) -> PlanarTrackerCompileResult:
    """Compile Planar Tracker / Corner-Pin parameters into FFmpeg filtergraph and metadata."""
    params = _coerce_planar_tracker_params(planar_tracker)
    fg = compile_planar_tracker_filter(params, pix_fmt=pix_fmt)
    uses_eval = ":eval=frame" in fg
    return PlanarTrackerCompileResult(
        filtergraph=fg,
        ffmpeg_vf_args=["-vf", fg] if fg else [],
        is_active=bool(fg),
        mode=params.mode,
        uses_per_frame_eval=uses_eval,
        keyframe_count=len(params.track_keyframes),
        params=params,
    )


def compile_fx_filtergraph(
    nodes: Sequence[FxNode | dict[str, Any]],
    *,
    duration_seconds: float = 10.0,
    width: int = 1920,
    height: int = 1080,
    fps: float = 25.0,
    pix_fmt: str = "yuv420p",
    use_gpu: bool = False,
    chroma_key: ChromaKeyParams | dict[str, Any] | None = None,
    stabilizer: StabilizerParams | dict[str, Any] | None = None,
    planar_tracker: PlanarTrackerParams | dict[str, Any] | None = None,
) -> FxCompileResult:
    """Compile an FX stack (plus optional stabilizer, planar tracker, and chroma keyer)."""
    if pix_fmt not in ALLOWED_PIX_FMTS:
        raise ValueError(f"Unsupported pixel format: {pix_fmt!r}")

    dur = _clamp_num(float(duration_seconds), 0.1, 86400.0)
    w_px = round(_clamp_num(float(width), 64.0, 7680.0))
    h_px = round(_clamp_num(float(height), 64.0, 4320.0))
    rate = _clamp_num(float(fps), 1.0, 240.0)

    normalized_nodes = [normalize_fx_node(item) for item in nodes]
    active_nodes = [item for item in normalized_nodes if item.enabled]
    bypassed_count = len(normalized_nodes) - len(active_nodes)

    ck_params = _coerce_chroma_key_params(chroma_key) if chroma_key is not None else None
    ck_active = bool(ck_params is not None and ck_params.is_active())

    stab_params = _coerce_stabilizer_params(stabilizer) if stabilizer is not None else None
    stab_active = bool(stab_params is not None and stab_params.is_active())

    trk_params = (
        _coerce_planar_tracker_params(planar_tracker) if planar_tracker is not None else None
    )
    trk_active = bool(trk_params is not None and trk_params.is_active())

    if not active_nodes and not ck_active and not stab_active and not trk_active:
        return FxCompileResult(
            filtergraph="",
            ffmpeg_vf_args=[],
            active_effects=[],
            chroma_key_active=False,
            stabilizer_active=False,
            planar_tracker_active=False,
            bypassed_count=bypassed_count,
            normalized_nodes=normalized_nodes,
            estimated_render_seconds=0.0,
            realtime_factor=0.0,
            complexity_tier="idle",
            warnings=[],
        )

    needs_rgb = any(
        n.effect in {
            "glow",
            "lens_flare",
            "chroma_aberration",
            "optical_glow",
            "rgb_split",
            "halation",
        }
        for n in active_nodes
    )

    segments: list[str] = []
    total_weight = 0.0
    if stab_active and stab_params is not None:
        stab_seg = compile_stabilizer_filter(stab_params, width=w_px, height=h_px, pix_fmt=None)
        if stab_seg:
            segments.append(stab_seg)
            total_weight += 0.90

    if trk_active and trk_params is not None:
        trk_seg = compile_planar_tracker_filter(trk_params, pix_fmt=None)
        if trk_seg:
            segments.append(trk_seg)
            total_weight += 0.85

    if ck_active and ck_params is not None:
        ck_seg = compile_chroma_key_filter(ck_params, pix_fmt=None)
        if ck_seg:
            segments.append(ck_seg)
            total_weight += 0.75

    if needs_rgb:
        segments.append("format=rgb24")

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
        elif node.effect == "vignette":
            seg = _compile_vignette(node.params)
            segments.append(_wrap_keyframed_segment(idx, seg, node.keyframes) if has_kf else seg)
        elif node.effect == "film_grain":
            seg = _compile_film_grain(node.params)
            segments.append(_wrap_keyframed_segment(idx, seg, node.keyframes) if has_kf else seg)
        elif node.effect == "optical_glow":
            seg = _compile_optical_glow(idx, node.params)
            segments.append(_wrap_keyframed_segment(idx, seg, node.keyframes) if has_kf else seg)
        elif node.effect == "rgb_split":
            seg = _compile_rgb_split(node.params)
            segments.append(_wrap_keyframed_segment(idx, seg, node.keyframes) if has_kf else seg)
        elif node.effect == "halation":
            seg = _compile_halation(idx, node.params)
            segments.append(_wrap_keyframed_segment(idx, seg, node.keyframes) if has_kf else seg)
        elif node.effect == "letterbox":
            seg = _compile_letterbox(node.params)
            segments.append(_wrap_keyframed_segment(idx, seg, node.keyframes) if has_kf else seg)
        elif node.effect == "camera_shake":
            segments.append(_compile_camera_shake(node.params, node.keyframes))
        elif node.effect == "lens_distortion":
            seg = _compile_lens_distortion(node.params)
            segments.append(_wrap_keyframed_segment(idx, seg, node.keyframes) if has_kf else seg)
        elif node.effect == "scanlines":
            seg = _compile_scanlines(node.params)
            segments.append(_wrap_keyframed_segment(idx, seg, node.keyframes) if has_kf else seg)
        elif node.effect == "unsharp_mask":
            seg = _compile_unsharp_mask(node.params)
            segments.append(_wrap_keyframed_segment(idx, seg, node.keyframes) if has_kf else seg)
        elif node.effect == "hue_shift":
            seg = _compile_hue_shift(node.params)
            segments.append(_wrap_keyframed_segment(idx, seg, node.keyframes) if has_kf else seg)
        elif node.effect == "mirror_flip":
            seg = _compile_mirror_flip(node.params)
            segments.append(_wrap_keyframed_segment(idx, seg, node.keyframes) if has_kf else seg)
        elif node.effect == "mosaic_pixelate":
            seg = _compile_mosaic_pixelate(node.params)
            segments.append(_wrap_keyframed_segment(idx, seg, node.keyframes) if has_kf else seg)
        elif node.effect == "invert_negative":
            seg = _compile_invert_negative(node.params, needs_rgb=needs_rgb)
            segments.append(_wrap_keyframed_segment(idx, seg, node.keyframes) if has_kf else seg)

    if needs_rgb or ck_active:
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
        chroma_key_active=ck_active,
        stabilizer_active=stab_active,
        planar_tracker_active=trk_active,
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
    """Compile one of the built-in Sapphire-inspired presets."""
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
