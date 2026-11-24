"""DaVinci Resolve Power Windows, Keyframed Shape Mask (Inside/Outside Blur & Grade)
and 4-Point Planar Screen-Pin Tracker Studio.

Provides strictly typed models, deterministic geometry/homography math, and FFmpeg
compilation for:
- Presets: portrait_spotlight_oval, privacy_plate_pixelate, cinema_horizon_grad,
  billboard_corner_pin, custom.
- Shape geometries: ellipse, rounded_box, linear_gradient, planar_quad.
- Temporal keyframe trajectory interpolation & planar motion drift/jitter simulation.
- 3x3 Direct Linear Transform (DLT) 4-point planar homography solver & inverter.
- Inside/Outside exposure EV, Gaussian blur, privacy pixelation mosaic, and radial vignette.
- Inspection modes: final_composite, matte_bw, red_overlay, wireframe_handles.
- FFmpeg filtergraph compiler (geq, perspective corner-pin, gblur, boxblur, crop, vignette).
- JSON export (taktcut.power_window.v1) & non-destructive TimelineClip attachment.
"""

from __future__ import annotations

import json
import math
import re
from collections.abc import Mapping, Sequence
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from taktcut.models import (
    ClipPowerWindowKeyframeRef,
    ClipPowerWindowTrack,
    TimelineDocument,
)

PowerWindowPresetId = Literal[
    "portrait_spotlight_oval",
    "privacy_plate_pixelate",
    "cinema_horizon_grad",
    "billboard_corner_pin",
    "custom",
]

PowerWindowShapeType = Literal[
    "ellipse",
    "rounded_box",
    "linear_gradient",
    "planar_quad",
]

PowerWindowViewMode = Literal[
    "final_composite",
    "matte_bw",
    "red_overlay",
    "wireframe_handles",
]

ALLOWED_POWER_WINDOW_PRESET_IDS: tuple[PowerWindowPresetId, ...] = (
    "portrait_spotlight_oval",
    "privacy_plate_pixelate",
    "cinema_horizon_grad",
    "billboard_corner_pin",
    "custom",
)

ALLOWED_POWER_WINDOW_SHAPE_TYPES: tuple[PowerWindowShapeType, ...] = (
    "ellipse",
    "rounded_box",
    "linear_gradient",
    "planar_quad",
)

ALLOWED_POWER_WINDOW_VIEW_MODES: tuple[PowerWindowViewMode, ...] = (
    "final_composite",
    "matte_bw",
    "red_overlay",
    "wireframe_handles",
)

QuadCorners = tuple[
    tuple[float, float],
    tuple[float, float],
    tuple[float, float],
    tuple[float, float],
]

DEFAULT_QUAD_CORNERS: QuadCorners = (
    (0.28, 0.22),
    (0.72, 0.18),
    (0.76, 0.68),
    (0.24, 0.72),
)

_SAFE_TITLE_RE = re.compile(r"[^A-Za-z0-9_-]+")


def _clamp(value: float, lo: float, hi: float) -> float:
    return min(hi, max(lo, value))


def _clamp01(value: float) -> float:
    return min(1.0, max(0.0, value))


def _smoothstep(edge0: float, edge1: float, x: float) -> float:
    if edge1 <= edge0:
        return 1.0 if x >= edge1 else 0.0
    t = _clamp01((x - edge0) / (edge1 - edge0))
    return t * t * (3.0 - 2.0 * t)


def _rec709_luma(r: float, g: float, b: float) -> float:
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _validate_bounded_float(raw: Any, field_name: str, lo: float, hi: float) -> float:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raise ValueError(f"{field_name} must be a finite number, got {raw!r}")
    val = float(raw)
    if not math.isfinite(val) or val < lo or val > hi:
        raise ValueError(f"{field_name} must be in [{lo}, {hi}], got {raw!r}")
    return val


def _validate_bounded_int(raw: Any, field_name: str, lo: int, hi: int) -> int:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raise ValueError(f"{field_name} must be an integer in [{lo}, {hi}], got {raw!r}")
    fval = float(raw)
    if not math.isfinite(fval):
        raise ValueError(f"{field_name} must be finite, got {raw!r}")
    ival = int(round(fval))
    if ival < lo or ival > hi:
        raise ValueError(f"{field_name} must be in [{lo}, {hi}], got {raw!r}")
    return ival


def _validate_quad_corners(raw: Any, field_name: str) -> QuadCorners:
    if not isinstance(raw, (list, tuple)) or len(raw) != 4:
        raise ValueError(f"{field_name} must contain 4 corner (x, y) pairs, got {raw!r}")
    pts: list[tuple[float, float]] = []
    for idx, pt in enumerate(raw):
        if not isinstance(pt, (list, tuple)) or len(pt) != 2:
            raise ValueError(f"{field_name}[{idx}] must be a (x, y) pair, got {pt!r}")
        px = _validate_bounded_float(pt[0], f"{field_name}[{idx}][0]", 0.0, 1.0)
        py = _validate_bounded_float(pt[1], f"{field_name}[{idx}][1]", 0.0, 1.0)
        pts.append((px, py))
    return (pts[0], pts[1], pts[2], pts[3])


class PowerWindowKeyframe(BaseModel):
    """Single temporal keyframe for Power Window mask & planar quad trajectory."""

    model_config = ConfigDict(extra="ignore")

    t_norm: float = Field(ge=0.0, le=1.0)
    cx: float = Field(default=0.5, ge=0.0, le=1.0)
    cy: float = Field(default=0.5, ge=0.0, le=1.0)
    rx: float = Field(default=0.22, ge=0.02, le=0.95)
    ry: float = Field(default=0.28, ge=0.02, le=0.95)
    rotation_deg: float = Field(default=0.0, ge=-180.0, le=180.0)
    softness_px: float = Field(default=32.0, ge=0.0, le=180.0)
    quad_corners: QuadCorners = DEFAULT_QUAD_CORNERS

    @field_validator("t_norm", "cx", "cy", mode="before")
    @classmethod
    def _val_unit(cls, raw: Any, info: Any) -> float:
        return _validate_bounded_float(raw, str(info.field_name), 0.0, 1.0)

    @field_validator("rx", "ry", mode="before")
    @classmethod
    def _val_radius(cls, raw: Any, info: Any) -> float:
        return _validate_bounded_float(raw, str(info.field_name), 0.02, 0.95)

    @field_validator("rotation_deg", mode="before")
    @classmethod
    def _val_rot(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "rotation_deg", -180.0, 180.0)

    @field_validator("softness_px", mode="before")
    @classmethod
    def _val_soft(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "softness_px", 0.0, 180.0)

    @field_validator("quad_corners", mode="before")
    @classmethod
    def _val_quad(cls, raw: Any) -> QuadCorners:
        return _validate_quad_corners(raw, "quad_corners")


class PowerWindowConfig(BaseModel):
    """Complete Power Window, Inside/Outside Grade & 4-Point Planar Tracker specification."""

    model_config = ConfigDict(extra="ignore")

    enabled: bool = True
    preset_id: PowerWindowPresetId = "portrait_spotlight_oval"
    shape_type: PowerWindowShapeType = "ellipse"

    cx: float = Field(default=0.50, ge=0.0, le=1.0)
    cy: float = Field(default=0.44, ge=0.0, le=1.0)
    rx: float = Field(default=0.22, ge=0.02, le=0.95)
    ry: float = Field(default=0.30, ge=0.02, le=0.95)
    rotation_deg: float = Field(default=0.0, ge=-180.0, le=180.0)
    corner_radius: float = Field(default=0.22, ge=0.0, le=1.0)
    softness_px: float = Field(default=36.0, ge=0.0, le=180.0)
    invert_matte: bool = False
    quad_corners: QuadCorners = DEFAULT_QUAD_CORNERS

    inside_exposure_ev: float = Field(default=0.55, ge=-3.0, le=3.0)
    outside_exposure_ev: float = Field(default=-0.65, ge=-3.0, le=3.0)
    inside_blur_px: float = Field(default=0.0, ge=0.0, le=48.0)
    outside_blur_px: float = Field(default=10.0, ge=0.0, le=48.0)
    inside_pixelate_size: int = Field(default=1, ge=1, le=64)
    vignette_opacity: float = Field(default=0.35, ge=0.0, le=1.0)

    view_mode: PowerWindowViewMode = "final_composite"
    playhead_norm: float = Field(default=0.0, ge=0.0, le=1.0)
    track_drift_x: float = Field(default=0.08, ge=-0.5, le=0.5)
    track_drift_y: float = Field(default=-0.03, ge=-0.5, le=0.5)
    track_jitter: float = Field(default=0.008, ge=0.0, le=0.1)
    track_keyframes: list[PowerWindowKeyframe] = Field(default_factory=list)

    width: int = Field(default=1920, ge=64, le=7680)
    height: int = Field(default=1080, ge=64, le=4320)

    @field_validator(
        "cx", "cy", "corner_radius", "vignette_opacity", "playhead_norm", mode="before"
    )
    @classmethod
    def _val_unit_fields(cls, raw: Any, info: Any) -> float:
        return _validate_bounded_float(raw, str(info.field_name), 0.0, 1.0)

    @field_validator("rx", "ry", mode="before")
    @classmethod
    def _val_radii(cls, raw: Any, info: Any) -> float:
        return _validate_bounded_float(raw, str(info.field_name), 0.02, 0.95)

    @field_validator("rotation_deg", mode="before")
    @classmethod
    def _val_rotation(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "rotation_deg", -180.0, 180.0)

    @field_validator("softness_px", mode="before")
    @classmethod
    def _val_softness(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "softness_px", 0.0, 180.0)

    @field_validator("inside_exposure_ev", "outside_exposure_ev", mode="before")
    @classmethod
    def _val_ev(cls, raw: Any, info: Any) -> float:
        return _validate_bounded_float(raw, str(info.field_name), -3.0, 3.0)

    @field_validator("inside_blur_px", "outside_blur_px", mode="before")
    @classmethod
    def _val_blur(cls, raw: Any, info: Any) -> float:
        return _validate_bounded_float(raw, str(info.field_name), 0.0, 48.0)

    @field_validator("inside_pixelate_size", mode="before")
    @classmethod
    def _val_pixelate(cls, raw: Any) -> int:
        return _validate_bounded_int(raw, "inside_pixelate_size", 1, 64)

    @field_validator("track_drift_x", "track_drift_y", mode="before")
    @classmethod
    def _val_drift(cls, raw: Any, info: Any) -> float:
        return _validate_bounded_float(raw, str(info.field_name), -0.5, 0.5)

    @field_validator("track_jitter", mode="before")
    @classmethod
    def _val_jitter(cls, raw: Any) -> float:
        return _validate_bounded_float(raw, "track_jitter", 0.0, 0.1)

    @field_validator("quad_corners", mode="before")
    @classmethod
    def _val_quad_corners(cls, raw: Any) -> QuadCorners:
        return _validate_quad_corners(raw, "quad_corners")

    @model_validator(mode="after")
    def _normalize_dimensions_and_keyframes(self) -> PowerWindowConfig:
        if self.width % 2 != 0:
            self.width -= 1
        if self.height % 2 != 0:
            self.height -= 1
        if self.track_keyframes:
            self.track_keyframes = sorted(self.track_keyframes, key=lambda k: k.t_norm)
        return self


class PowerWindowInterpolatedGeometry(BaseModel):
    """Evaluated shape geometry at a normalized timeline time t_norm."""

    model_config = ConfigDict(extra="forbid")

    t_norm: float
    shape_type: PowerWindowShapeType
    cx: float
    cy: float
    rx: float
    ry: float
    rotation_deg: float
    corner_radius: float
    softness_px: float
    invert_matte: bool
    quad_corners: QuadCorners
    homography_3x3: list[list[float]]


class PowerWindowPreset(BaseModel):
    """Curated DaVinci Resolve / Premiere Power Window preset."""

    model_config = ConfigDict(extra="forbid")

    preset_id: PowerWindowPresetId
    label: str
    category: str
    description: str
    default_config: PowerWindowConfig


class PowerWindowTrackResult(BaseModel):
    """Output of the simulated planar / shape motion tracker."""

    model_config = ConfigDict(extra="forbid")

    preset_id: PowerWindowPresetId
    shape_type: PowerWindowShapeType
    frame_count: int
    total_displacement_px: float
    mean_confidence: float
    max_residual_px: float
    homography_3x3: list[list[float]]
    keyframes: list[PowerWindowKeyframe]


class PowerWindowEvaluateResult(BaseModel):
    """Evaluated matte, planar homography, and inside/outside preview metrics."""

    model_config = ConfigDict(extra="forbid")

    preset_id: PowerWindowPresetId
    shape_type: PowerWindowShapeType
    view_mode: PowerWindowViewMode
    t_norm: float
    sample_count: int
    width: int
    height: int
    inside_coverage_pct: float
    mean_luma_inside: float
    mean_luma_outside: float
    mean_luma_before: float
    mean_luma_after: float
    luma_histogram_before: list[int]
    luma_histogram_after: list[int]
    matte_map: list[float]
    preview_rgb_map: list[tuple[float, float, float]]
    interpolated_geometry: PowerWindowInterpolatedGeometry


class PowerWindowCompileResult(BaseModel):
    """Compiled FFmpeg filtergraph for Power Window mask & planar corner-pin."""

    model_config = ConfigDict(extra="forbid")

    enabled: bool
    preset_id: PowerWindowPresetId
    shape_type: PowerWindowShapeType
    view_mode: PowerWindowViewMode
    has_planar_pin: bool
    has_pixelate: bool
    vf_chain: str
    filter_complex: str
    ffmpeg_command: str
    warnings: list[str] = Field(default_factory=list)


class PowerWindowExportResult(BaseModel):
    """JSON export payload compatible with DaVinci Resolve & Premiere Lumetri."""

    model_config = ConfigDict(extra="forbid")

    schema_version: str = "taktcut.power_window.v1"
    title: str
    preset_id: PowerWindowPresetId
    compatible_hosts: list[str]
    json_text: str
    filename: str
    saved_path: str | None = None


_POWER_WINDOW_PRESETS: tuple[PowerWindowPreset, ...] = (
    PowerWindowPreset(
        preset_id="portrait_spotlight_oval",
        label="Portrait Spotlight Oval",
        category="Beauty & Key Light",
        description=(
            "Soft elliptical subject key lift (+0.55 EV) with outside background falloff "
            "(-0.65 EV, 10px lens blur, 35% radial vignette)."
        ),
        default_config=PowerWindowConfig(
            enabled=True,
            preset_id="portrait_spotlight_oval",
            shape_type="ellipse",
            cx=0.48,
            cy=0.43,
            rx=0.20,
            ry=0.30,
            rotation_deg=-4.0,
            corner_radius=0.22,
            softness_px=38.0,
            invert_matte=False,
            quad_corners=((0.28, 0.20), (0.68, 0.20), (0.68, 0.68), (0.28, 0.68)),
            inside_exposure_ev=0.55,
            outside_exposure_ev=-0.65,
            inside_blur_px=0.0,
            outside_blur_px=10.0,
            inside_pixelate_size=1,
            vignette_opacity=0.35,
            view_mode="final_composite",
            track_drift_x=0.05,
            track_drift_y=-0.02,
            track_jitter=0.005,
        ),
    ),
    PowerWindowPreset(
        preset_id="privacy_plate_pixelate",
        label="Privacy Plate Pixelate",
        category="Broadcast Compliance",
        description=(
            "Tracked rounded-box anonymizer applying an 18px mosaic + 6px pre-blur strictly "
            "inside the mask for license plates or faces."
        ),
        default_config=PowerWindowConfig(
            enabled=True,
            preset_id="privacy_plate_pixelate",
            shape_type="rounded_box",
            cx=0.34,
            cy=0.66,
            rx=0.14,
            ry=0.09,
            rotation_deg=2.0,
            corner_radius=0.28,
            softness_px=12.0,
            invert_matte=False,
            quad_corners=((0.20, 0.56), (0.48, 0.56), (0.48, 0.76), (0.20, 0.76)),
            inside_exposure_ev=-0.10,
            outside_exposure_ev=0.0,
            inside_blur_px=6.0,
            outside_blur_px=0.0,
            inside_pixelate_size=18,
            vignette_opacity=0.0,
            view_mode="final_composite",
            track_drift_x=0.16,
            track_drift_y=0.03,
            track_jitter=0.006,
        ),
    ),
    PowerWindowPreset(
        preset_id="cinema_horizon_grad",
        label="Cinema Horizon Grad",
        category="Sky & Landscape ND",
        description=(
            "Wide feathered linear ND gradient (-0.90 EV upper sky pull-down) with subtle "
            "cinema vignette."
        ),
        default_config=PowerWindowConfig(
            enabled=True,
            preset_id="cinema_horizon_grad",
            shape_type="linear_gradient",
            cx=0.50,
            cy=0.36,
            rx=0.45,
            ry=0.26,
            rotation_deg=-3.0,
            corner_radius=0.10,
            softness_px=72.0,
            invert_matte=False,
            quad_corners=((0.10, 0.08), (0.90, 0.08), (0.90, 0.42), (0.10, 0.42)),
            inside_exposure_ev=-0.90,
            outside_exposure_ev=0.10,
            inside_blur_px=0.0,
            outside_blur_px=0.0,
            inside_pixelate_size=1,
            vignette_opacity=0.22,
            view_mode="final_composite",
            track_drift_x=0.02,
            track_drift_y=0.01,
            track_jitter=0.002,
        ),
    ),
    PowerWindowPreset(
        preset_id="billboard_corner_pin",
        label="Billboard 4-Pt Planar Pin",
        category="Planar Tracker & Screen Insert",
        description=(
            "4-point DLT homography planar screen-pin mask isolating an angled billboard "
            "with inside lift and outside falloff."
        ),
        default_config=PowerWindowConfig(
            enabled=True,
            preset_id="billboard_corner_pin",
            shape_type="planar_quad",
            cx=0.68,
            cy=0.38,
            rx=0.18,
            ry=0.18,
            rotation_deg=0.0,
            corner_radius=0.05,
            softness_px=14.0,
            invert_matte=False,
            quad_corners=((0.53, 0.16), (0.88, 0.23), (0.84, 0.56), (0.50, 0.48)),
            inside_exposure_ev=0.45,
            outside_exposure_ev=-0.45,
            inside_blur_px=0.0,
            outside_blur_px=5.0,
            inside_pixelate_size=1,
            vignette_opacity=0.18,
            view_mode="final_composite",
            track_drift_x=-0.09,
            track_drift_y=0.04,
            track_jitter=0.007,
        ),
    ),
    PowerWindowPreset(
        preset_id="custom",
        label="Custom Power Window",
        category="User Defined",
        description="Clean custom elliptical Power Window ready for manual handle sculpting.",
        default_config=PowerWindowConfig(
            enabled=True,
            preset_id="custom",
            shape_type="ellipse",
            cx=0.50,
            cy=0.50,
            rx=0.24,
            ry=0.24,
            rotation_deg=0.0,
            corner_radius=0.20,
            softness_px=28.0,
            invert_matte=False,
            quad_corners=((0.28, 0.25), (0.72, 0.25), (0.72, 0.75), (0.28, 0.75)),
            inside_exposure_ev=0.25,
            outside_exposure_ev=-0.25,
            inside_blur_px=0.0,
            outside_blur_px=4.0,
            inside_pixelate_size=1,
            vignette_opacity=0.15,
            view_mode="final_composite",
            track_drift_x=0.06,
            track_drift_y=0.0,
            track_jitter=0.004,
        ),
    ),
)

_PRESET_MAP: dict[str, PowerWindowPreset] = {p.preset_id: p for p in _POWER_WINDOW_PRESETS}


def list_power_window_presets() -> list[PowerWindowPreset]:
    """Return all curated Power Window & Planar Tracker presets."""
    return [p.model_copy(deep=True) for p in _POWER_WINDOW_PRESETS]


def get_power_window_preset(preset_id: str) -> PowerWindowPreset:
    """Lookup a curated Power Window preset by ID."""
    cleaned = str(preset_id or "").strip()
    if cleaned not in _PRESET_MAP:
        raise ValueError(f"Unsupported power window preset: {preset_id!r}")
    return _PRESET_MAP[cleaned].model_copy(deep=True)


def normalize_power_window_config(raw: Any = None) -> PowerWindowConfig:
    """Merge partial config overrides over a preset's defaults and validate strictly."""
    if isinstance(raw, PowerWindowConfig):
        return raw.model_copy(deep=True)
    if raw is None:
        return get_power_window_preset("portrait_spotlight_oval").default_config
    if not isinstance(raw, Mapping):
        raise ValueError("PowerWindowConfig payload must be a mapping")

    raw_preset = str(raw.get("preset_id") or "portrait_spotlight_oval").strip()
    if raw_preset in _PRESET_MAP:
        base = get_power_window_preset(raw_preset).default_config.model_dump()
    else:
        base = get_power_window_preset("custom").default_config.model_dump()
        base["preset_id"] = raw_preset

    merged = dict(base)
    for k, v in raw.items():
        if v is not None:
            merged[k] = v
    return PowerWindowConfig.model_validate(merged)


def _solve_linear_system_8x8(matrix: list[list[float]], rhs: list[float]) -> list[float] | None:
    """Solve an 8x8 linear system using Gaussian elimination with partial pivoting."""
    n = 8
    a = [row[:] + [rhs[idx]] for idx, row in enumerate(matrix)]

    for col in range(n):
        pivot_row = col
        pivot_val = abs(a[col][col])
        for row in range(col + 1, n):
            cand = abs(a[row][col])
            if cand > pivot_val:
                pivot_val = cand
                pivot_row = row
        if pivot_val < 1e-11:
            return None
        if pivot_row != col:
            a[col], a[pivot_row] = a[pivot_row], a[col]

        diag = a[col][col]
        for j in range(col, n + 1):
            a[col][j] /= diag
        for row in range(n):
            if row == col:
                continue
            factor = a[row][col]
            if abs(factor) < 1e-14:
                continue
            for j in range(col, n + 1):
                a[row][j] -= factor * a[col][j]

    return [a[i][n] for i in range(n)]


def compute_planar_homography_dlt(
    src_quad: Sequence[tuple[float, float]],
    dst_quad: Sequence[tuple[float, float]],
) -> list[list[float]]:
    """Compute a 3x3 Direct Linear Transform (DLT) homography H mapping src_quad -> dst_quad."""
    if len(src_quad) != 4 or len(dst_quad) != 4:
        raise ValueError("Homography requires exactly 4 source and 4 destination points.")

    rows: list[list[float]] = []
    rhs: list[float] = []
    for (x, y), (u, v) in zip(src_quad, dst_quad, strict=True):
        rows.append([x, y, 1.0, 0.0, 0.0, 0.0, -u * x, -u * y])
        rhs.append(u)
        rows.append([0.0, 0.0, 0.0, x, y, 1.0, -v * x, -v * y])
        rhs.append(v)

    sol = _solve_linear_system_8x8(rows, rhs)
    if sol is None:
        return [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]]

    return [
        [round(sol[0], 6), round(sol[1], 6), round(sol[2], 6)],
        [round(sol[3], 6), round(sol[4], 6), round(sol[5], 6)],
        [round(sol[6], 6), round(sol[7], 6), 1.0],
    ]


def invert_3x3_matrix(m: Sequence[Sequence[float]]) -> list[list[float]]:
    """Compute the analytical inverse of a 3x3 matrix, falling back to identity if singular."""
    a, b, c = m[0][0], m[0][1], m[0][2]
    d, e, f = m[1][0], m[1][1], m[1][2]
    g, h, i = m[2][0], m[2][1], m[2][2]

    c00 = e * i - f * h
    c01 = -(d * i - f * g)
    c02 = d * h - e * g
    c10 = -(b * i - c * h)
    c11 = a * i - c * g
    c12 = -(a * h - b * g)
    c20 = b * f - c * e
    c21 = -(a * f - c * d)
    c22 = a * e - b * d

    det = a * c00 + b * c01 + c * c02
    if abs(det) < 1e-11:
        return [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]]

    inv_det = 1.0 / det
    return [
        [c00 * inv_det, c10 * inv_det, c20 * inv_det],
        [c01 * inv_det, c11 * inv_det, c21 * inv_det],
        [c02 * inv_det, c12 * inv_det, c22 * inv_det],
    ]


def apply_homography_to_uv(
    h_mat: Sequence[Sequence[float]],
    u: float,
    v: float,
) -> tuple[float, float]:
    """Project 2D coordinates (u, v) through a 3x3 homography matrix."""
    x = h_mat[0][0] * u + h_mat[0][1] * v + h_mat[0][2]
    y = h_mat[1][0] * u + h_mat[1][1] * v + h_mat[1][2]
    w = h_mat[2][0] * u + h_mat[2][1] * v + h_mat[2][2]
    if abs(w) < 1e-9:
        return (0.5, 0.5)
    return (x / w, y / w)


def _canonical_unit_square() -> QuadCorners:
    return ((0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0))


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def interpolate_power_window_at_time(
    config: PowerWindowConfig,
    t_norm: float | None = None,
) -> PowerWindowInterpolatedGeometry:
    """Interpolate Power Window shape and 4-point quad corners at normalized time t_norm."""
    t_val = _clamp01(config.playhead_norm if t_norm is None else t_norm)
    kfs = sorted(config.track_keyframes, key=lambda k: k.t_norm)

    if not kfs:
        cx, cy = config.cx, config.cy
        rx, ry = config.rx, config.ry
        rot = config.rotation_deg
        soft = config.softness_px
        quad = config.quad_corners
    elif t_val <= kfs[0].t_norm or len(kfs) == 1:
        k0 = kfs[0]
        cx, cy, rx, ry = k0.cx, k0.cy, k0.rx, k0.ry
        rot, soft, quad = k0.rotation_deg, k0.softness_px, k0.quad_corners
    elif t_val >= kfs[-1].t_norm:
        kn = kfs[-1]
        cx, cy, rx, ry = kn.cx, kn.cy, kn.rx, kn.ry
        rot, soft, quad = kn.rotation_deg, kn.softness_px, kn.quad_corners
    else:
        lo_kf = kfs[0]
        hi_kf = kfs[-1]
        for idx in range(len(kfs) - 1):
            if kfs[idx].t_norm <= t_val <= kfs[idx + 1].t_norm:
                lo_kf = kfs[idx]
                hi_kf = kfs[idx + 1]
                break
        span = hi_kf.t_norm - lo_kf.t_norm
        alpha = 0.0 if span <= 1e-9 else _clamp01((t_val - lo_kf.t_norm) / span)
        cx = _lerp(lo_kf.cx, hi_kf.cx, alpha)
        cy = _lerp(lo_kf.cy, hi_kf.cy, alpha)
        rx = _lerp(lo_kf.rx, hi_kf.rx, alpha)
        ry = _lerp(lo_kf.ry, hi_kf.ry, alpha)
        rot = _lerp(lo_kf.rotation_deg, hi_kf.rotation_deg, alpha)
        soft = _lerp(lo_kf.softness_px, hi_kf.softness_px, alpha)
        pts: list[tuple[float, float]] = []
        for idx in range(4):
            qx = _clamp01(_lerp(lo_kf.quad_corners[idx][0], hi_kf.quad_corners[idx][0], alpha))
            qy = _clamp01(_lerp(lo_kf.quad_corners[idx][1], hi_kf.quad_corners[idx][1], alpha))
            pts.append((round(qx, 5), round(qy, 5)))
        quad = (pts[0], pts[1], pts[2], pts[3])

    h_mat = compute_planar_homography_dlt(_canonical_unit_square(), quad)
    return PowerWindowInterpolatedGeometry(
        t_norm=round(t_val, 4),
        shape_type=config.shape_type,
        cx=round(cx, 5),
        cy=round(cy, 5),
        rx=round(rx, 5),
        ry=round(ry, 5),
        rotation_deg=round(rot, 3),
        corner_radius=config.corner_radius,
        softness_px=round(soft, 2),
        invert_matte=config.invert_matte,
        quad_corners=quad,
        homography_3x3=h_mat,
    )


def simulate_power_window_track(
    config: PowerWindowConfig,
    *,
    num_keyframes: int = 9,
    drift_x: float | None = None,
    drift_y: float | None = None,
    jitter: float | None = None,
    rotation_drift_deg: float = 4.0,
) -> PowerWindowTrackResult:
    """Simulate a planar / feature tracker trajectory across t_norm in [0, 1]."""
    count = max(2, min(33, int(num_keyframes)))
    dx = config.track_drift_x if drift_x is None else _clamp(drift_x, -0.5, 0.5)
    dy = config.track_drift_y if drift_y is None else _clamp(drift_y, -0.5, 0.5)
    jit = config.track_jitter if jitter is None else _clamp(jitter, 0.0, 0.1)

    base_cx = config.cx
    base_cy = config.cy
    base_quad = config.quad_corners

    keyframes: list[PowerWindowKeyframe] = []
    residuals: list[float] = []
    confs: list[float] = []

    for i in range(count):
        t = i / float(count - 1)
        ease_t = t * t * (3.0 - 2.0 * t)
        jx = jit * math.sin(t * math.pi * 5.0 + 0.4) * (1.0 if i > 0 else 0.0)
        jy = jit * math.cos(t * math.pi * 4.0 + 1.1) * (1.0 if i > 0 else 0.0)

        off_x = dx * ease_t + jx
        off_y = dy * ease_t + jy
        cur_cx = _clamp01(base_cx + off_x)
        cur_cy = _clamp01(base_cy + off_y)
        scale_mod = 1.0 + 0.06 * math.sin(t * math.pi)
        cur_rx = _clamp(config.rx * scale_mod, 0.02, 0.95)
        cur_ry = _clamp(config.ry * scale_mod, 0.02, 0.95)
        cur_rot = _clamp(config.rotation_deg + rotation_drift_deg * ease_t, -180.0, 180.0)

        quad_pts: list[tuple[float, float]] = []
        for q_idx, (qx, qy) in enumerate(base_quad):
            persp_skew = 0.014 * ease_t * (1.0 if q_idx in (1, 2) else -0.5)
            nx = _clamp01(qx + off_x + persp_skew)
            ny = _clamp01(qy + off_y + 0.008 * ease_t * (1.0 if q_idx in (2, 3) else -0.4))
            quad_pts.append((round(nx, 5), round(ny, 5)))
        quad: QuadCorners = (quad_pts[0], quad_pts[1], quad_pts[2], quad_pts[3])

        res_px = math.hypot(jx * config.width, jy * config.height)
        residuals.append(res_px)
        conf = _clamp(0.99 - jit * 2.2 - 0.04 * abs(t - 0.5), 0.72, 0.995)
        confs.append(conf)

        keyframes.append(
            PowerWindowKeyframe(
                t_norm=round(t, 4),
                cx=round(cur_cx, 5),
                cy=round(cur_cy, 5),
                rx=round(cur_rx, 5),
                ry=round(cur_ry, 5),
                rotation_deg=round(cur_rot, 3),
                softness_px=round(config.softness_px, 2),
                quad_corners=quad,
            )
        )

    total_disp_px = math.hypot(dx * config.width, dy * config.height)
    mean_conf = sum(confs) / len(confs)
    max_res = max(residuals) if residuals else 0.0
    updated_cfg = config.model_copy(update={"track_keyframes": keyframes})
    geom_now = interpolate_power_window_at_time(updated_cfg, config.playhead_norm)

    return PowerWindowTrackResult(
        preset_id=config.preset_id,
        shape_type=config.shape_type,
        frame_count=count,
        total_displacement_px=round(total_disp_px, 2),
        mean_confidence=round(mean_conf, 4),
        max_residual_px=round(max_res, 3),
        homography_3x3=geom_now.homography_3x3,
        keyframes=keyframes,
    )


def _point_in_polygon(x: float, y: float, poly: Sequence[tuple[float, float]]) -> bool:
    inside = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi):
            inside = not inside
        j = i
    return inside


def _dist_point_to_segment(
    px: float,
    py: float,
    ax: float,
    ay: float,
    bx: float,
    by: float,
) -> float:
    vx = bx - ax
    vy = by - ay
    wx = px - ax
    wy = py - ay
    c1 = wx * vx + wy * vy
    if c1 <= 0.0:
        return math.hypot(px - ax, py - ay)
    c2 = vx * vx + vy * vy
    if c2 <= c1:
        return math.hypot(px - bx, py - by)
    t = c1 / c2
    proj_x = ax + t * vx
    proj_y = ay + t * vy
    return math.hypot(px - proj_x, py - proj_y)


def evaluate_power_window_mask_at_uv(
    geom: PowerWindowInterpolatedGeometry,
    u: float,
    v: float,
    width: int = 1920,
    height: int = 1080,
) -> float:
    """Evaluate soft Power Window alpha matte weight in [0, 1] at normalized (u, v)."""
    ref_dim = float(max(64, min(width, height)))
    soft_norm = max(0.002, geom.softness_px / ref_dim)

    rad = -math.radians(geom.rotation_deg)
    cos_r = math.cos(rad)
    sin_r = math.sin(rad)
    du = u - geom.cx
    dv = v - geom.cy
    lx = du * cos_r - dv * sin_r
    ly = du * sin_r + dv * cos_r

    if geom.shape_type == "ellipse":
        rx = max(0.015, geom.rx)
        ry = max(0.015, geom.ry)
        dist = math.hypot(lx / rx, ly / ry)
        feather_rel = soft_norm / max(0.02, min(rx, ry))
        matte = 1.0 - _smoothstep(1.0 - feather_rel * 0.5, 1.0 + feather_rel * 0.5, dist)
    elif geom.shape_type == "rounded_box":
        rx = max(0.015, geom.rx)
        ry = max(0.015, geom.ry)
        cr = _clamp(geom.corner_radius, 0.0, 0.95) * min(rx, ry)
        qx = abs(lx) - (rx - cr)
        qy = abs(ly) - (ry - cr)
        sdf = math.hypot(max(qx, 0.0), max(qy, 0.0)) + min(max(qx, qy), 0.0) - cr
        matte = 1.0 - _smoothstep(-soft_norm * 0.5, soft_norm * 0.5, sdf)
    elif geom.shape_type == "linear_gradient":
        half_span = max(0.02, soft_norm * 1.45)
        # Positive inside (above rotated horizon line ly < 0), smoothly rolling off across cy
        matte = 1.0 - _smoothstep(-half_span, half_span, ly)
    else:
        # planar_quad: signed distance to 4-corner polygon
        quad = geom.quad_corners
        inside = _point_in_polygon(u, v, quad)
        min_edge_dist = min(
            _dist_point_to_segment(
                u,
                v,
                quad[idx][0],
                quad[idx][1],
                quad[(idx + 1) % 4][0],
                quad[(idx + 1) % 4][1],
            )
            for idx in range(4)
        )
        sdf = -min_edge_dist if inside else min_edge_dist
        matte = 1.0 - _smoothstep(-soft_norm * 0.5, soft_norm * 0.5, sdf)

    matte = _clamp01(matte)
    if geom.invert_matte:
        matte = 1.0 - matte
    return matte


def _build_synthetic_scene(width: int = 24, height: int = 16) -> list[tuple[float, float, float]]:
    """Generate a deterministic 24x16 cinema scene with sky, portrait, plate, and billboard."""
    out: list[tuple[float, float, float]] = []
    for y in range(height):
        ny = y / float(max(1, height - 1))
        for x in range(width):
            nx = x / float(max(1, width - 1))
            # Sky / horizon backdrop
            if ny < 0.45:
                r = 0.24 + 0.16 * (1.0 - ny)
                g = 0.34 + 0.18 * (1.0 - ny)
                b = 0.58 + 0.22 * (1.0 - ny)
            else:
                r = 0.14 + 0.06 * nx
                g = 0.16 + 0.06 * (1.0 - ny)
                b = 0.20 + 0.05 * ny

            # Billboard on right upper side
            if 0.52 <= nx <= 0.88 and 0.18 <= ny <= 0.54:
                r, g, b = 0.78, 0.72, 0.62
                if 0.58 <= nx <= 0.82 and 0.26 <= ny <= 0.46:
                    r, g, b = 0.22, 0.56, 0.88

            # Subject portrait oval in center-left
            d_head = math.hypot((nx - 0.48) * 1.5, ny - 0.40)
            if d_head < 0.18:
                r = 0.68 - 0.18 * d_head
                g = 0.48 - 0.12 * d_head
                b = 0.38 - 0.10 * d_head

            # Lower license plate target box
            if 0.24 <= nx <= 0.44 and 0.60 <= ny <= 0.74:
                r, g, b = 0.86, 0.88, 0.90
                if abs(nx - 0.34) < 0.05 and abs(ny - 0.67) < 0.03:
                    r, g, b = 0.18, 0.20, 0.28

            out.append((_clamp01(r), _clamp01(g), _clamp01(b)))
    return out


def _parse_rgb_samples(
    samples: Sequence[Sequence[float]] | None,
    pixels: Sequence[float] | None,
    width: int,
    height: int,
) -> tuple[list[tuple[float, float, float]], int, int]:
    if pixels is not None and len(pixels) >= 4 and width > 0 and height > 0:
        expected = width * height * 4
        if len(pixels) >= expected:
            out: list[tuple[float, float, float]] = []
            for idx in range(0, expected, 4):
                r = float(pixels[idx])
                g = float(pixels[idx + 1])
                b = float(pixels[idx + 2])
                scale = 255.0 if max(r, g, b) > 1.5 else 1.0
                out.append((_clamp01(r / scale), _clamp01(g / scale), _clamp01(b / scale)))
            return out, width, height

    if samples is not None:
        if len(samples) == 0:
            return [], 0, 0
        out_s: list[tuple[float, float, float]] = []
        for s in samples:
            if len(s) >= 3:
                r, g, b = float(s[0]), float(s[1]), float(s[2])
                scale = 255.0 if max(r, g, b) > 1.5 else 1.0
                out_s.append((_clamp01(r / scale), _clamp01(g / scale), _clamp01(b / scale)))
        n = len(out_s)
        sw = width if width > 0 and width * height == n else n
        sh = height if height > 0 and width * height == n else 1
        return out_s, sw, sh

    synth_w, synth_h = 24, 16
    return _build_synthetic_scene(synth_w, synth_h), synth_w, synth_h


def _separable_box_blur_rgb_2d(
    grid: list[tuple[float, float, float]],
    width: int,
    height: int,
    blur_px: float,
) -> list[tuple[float, float, float]]:
    if blur_px < 0.4 or width <= 1 or height <= 1:
        return list(grid)
    radius = max(1, min(4, int(round(blur_px / 6.0))))
    horiz: list[tuple[float, float, float]] = [(0.0, 0.0, 0.0)] * (width * height)
    denom = float(radius * 2 + 1)
    for y in range(height):
        row_off = y * width
        for x in range(width):
            ar = ag = ab = 0.0
            for dx in range(-radius, radius + 1):
                sx = min(width - 1, max(0, x + dx))
                pr, pg, pb = grid[row_off + sx]
                ar += pr
                ag += pg
                ab += pb
            horiz[row_off + x] = (ar / denom, ag / denom, ab / denom)

    out: list[tuple[float, float, float]] = [(0.0, 0.0, 0.0)] * (width * height)
    for y in range(height):
        for x in range(width):
            ar = ag = ab = 0.0
            for dy in range(-radius, radius + 1):
                sy = min(height - 1, max(0, y + dy))
                pr, pg, pb = horiz[sy * width + x]
                ar += pr
                ag += pg
                ab += pb
            out[y * width + x] = (ar / denom, ag / denom, ab / denom)
    return out


def _apply_pixelate_grid(
    grid: list[tuple[float, float, float]],
    width: int,
    height: int,
    pixelate_size: int,
) -> list[tuple[float, float, float]]:
    if pixelate_size <= 1 or width <= 1 or height <= 1:
        return list(grid)
    block = max(2, min(8, int(round(pixelate_size / 5.0))))
    out = list(grid)
    for by in range(0, height, block):
        for bx in range(0, width, block):
            y_end = min(height, by + block)
            x_end = min(width, bx + block)
            ar = ag = ab = 0.0
            cnt = 0
            for y in range(by, y_end):
                for x in range(bx, x_end):
                    pr, pg, pb = grid[y * width + x]
                    ar += pr
                    ag += pg
                    ab += pb
                    cnt += 1
            mean_rgb = (ar / cnt, ag / cnt, ab / cnt)
            for y in range(by, y_end):
                for x in range(bx, x_end):
                    out[y * width + x] = mean_rgb
    return out


def evaluate_power_window_samples(
    config: PowerWindowConfig,
    samples: Sequence[Sequence[float]] | None = None,
    *,
    width: int = 0,
    height: int = 0,
    pixels: Sequence[float] | None = None,
    t_norm: float | None = None,
) -> PowerWindowEvaluateResult:
    """Evaluate Power Window matte, inside/outside blur, pixelation, EV grade, and vignette."""
    geom = interpolate_power_window_at_time(config, t_norm)
    rgb_list, w, h = _parse_rgb_samples(samples, pixels, width, height)
    total = len(rgb_list)

    if total == 0:
        return PowerWindowEvaluateResult(
            preset_id=config.preset_id,
            shape_type=config.shape_type,
            view_mode=config.view_mode,
            t_norm=geom.t_norm,
            sample_count=0,
            width=1,
            height=1,
            inside_coverage_pct=0.0,
            mean_luma_inside=0.0,
            mean_luma_outside=0.0,
            mean_luma_before=0.0,
            mean_luma_after=0.0,
            luma_histogram_before=[0] * 16,
            luma_histogram_after=[0] * 16,
            matte_map=[],
            preview_rgb_map=[],
            interpolated_geometry=geom,
        )

    in_blur_grid = _separable_box_blur_rgb_2d(rgb_list, w, h, config.inside_blur_px)
    if config.inside_pixelate_size > 1:
        in_blur_grid = _apply_pixelate_grid(in_blur_grid, w, h, config.inside_pixelate_size)
    out_blur_grid = _separable_box_blur_rgb_2d(rgb_list, w, h, config.outside_blur_px)

    in_gain = math.pow(2.0, config.inside_exposure_ev * 0.65)
    out_gain = math.pow(2.0, config.outside_exposure_ev * 0.65)

    mattes: list[float] = []
    hist_before = [0] * 16
    hist_after = [0] * 16
    luma_before_sum = 0.0
    luma_after_sum = 0.0
    inside_luma_sum = 0.0
    inside_weight_sum = 0.0
    outside_luma_sum = 0.0
    outside_weight_sum = 0.0
    covered_count = 0
    preview_rgb: list[tuple[float, float, float]] = []

    for idx, (br, bg, bb) in enumerate(rgb_list):
        px = idx % w
        py = idx // w
        u = px / float(max(1, w - 1)) if w > 1 else 0.5
        v = py / float(max(1, h - 1)) if h > 1 else 0.5

        lum_before = _rec709_luma(br, bg, bb)
        luma_before_sum += lum_before
        hist_before[min(15, max(0, int(_clamp01(lum_before) * 15.9999)))] += 1

        m = evaluate_power_window_mask_at_uv(geom, u, v, config.width, config.height)
        mattes.append(m)
        if m >= 0.5:
            covered_count += 1

        if not config.enabled:
            out_r, out_g, out_b = br, bg, bb
        else:
            ir, ig, ib = in_blur_grid[idx]
            or_, og, ob = out_blur_grid[idx]
            in_r = _clamp01(ir * in_gain)
            in_g = _clamp01(ig * in_gain)
            in_b = _clamp01(ib * in_gain)

            # Radial vignette attenuates outside corners cleanly
            rad_dist = math.hypot((u - 0.5) * 1.4, (v - 0.5) * 1.4)
            vig_factor = 1.0 - config.vignette_opacity * _smoothstep(0.35, 1.05, rad_dist)
            out_r_base = _clamp01(or_ * out_gain * vig_factor)
            out_g_base = _clamp01(og * out_gain * vig_factor)
            out_b_base = _clamp01(ob * out_gain * vig_factor)

            comp_r = _lerp(out_r_base, in_r, m)
            comp_g = _lerp(out_g_base, in_g, m)
            comp_b = _lerp(out_b_base, in_b, m)

            if config.view_mode == "matte_bw":
                out_r, out_g, out_b = m, m, m
            elif config.view_mode == "red_overlay":
                inv = 1.0 - m
                out_r = _clamp01(comp_r * (1.0 - 0.55 * inv) + 0.92 * 0.55 * inv)
                out_g = _clamp01(comp_g * (1.0 - 0.55 * inv) + 0.14 * 0.55 * inv)
                out_b = _clamp01(comp_b * (1.0 - 0.55 * inv) + 0.18 * 0.55 * inv)
            else:
                out_r, out_g, out_b = comp_r, comp_g, comp_b

        lum_after = _rec709_luma(out_r, out_g, out_b)
        luma_after_sum += lum_after
        hist_after[min(15, max(0, int(_clamp01(lum_after) * 15.9999)))] += 1

        inside_luma_sum += lum_after * m
        inside_weight_sum += m
        outside_luma_sum += lum_after * (1.0 - m)
        outside_weight_sum += 1.0 - m

        if idx < 384:
            preview_rgb.append((round(out_r, 4), round(out_g, 4), round(out_b, 4)))

    cov_pct = 100.0 * covered_count / float(total)
    mean_in = inside_luma_sum / inside_weight_sum if inside_weight_sum > 1e-6 else 0.0
    mean_out = outside_luma_sum / outside_weight_sum if outside_weight_sum > 1e-6 else 0.0

    return PowerWindowEvaluateResult(
        preset_id=config.preset_id,
        shape_type=config.shape_type,
        view_mode=config.view_mode,
        t_norm=geom.t_norm,
        sample_count=total,
        width=w,
        height=h,
        inside_coverage_pct=round(cov_pct, 2),
        mean_luma_inside=round(mean_in, 4),
        mean_luma_outside=round(mean_out, 4),
        mean_luma_before=round(luma_before_sum / float(total), 4),
        mean_luma_after=round(luma_after_sum / float(total), 4),
        luma_histogram_before=hist_before,
        luma_histogram_after=hist_after,
        matte_map=[round(m, 4) for m in mattes[:2048]],
        preview_rgb_map=preview_rgb,
        interpolated_geometry=geom,
    )


def _compile_geq_mask_expr(geom: PowerWindowInterpolatedGeometry, width: int, height: int) -> str:
    """Build an FFmpeg geq normalized expression evaluating the Power Window matte in [0, 1]."""
    rad = -math.radians(geom.rotation_deg)
    cos_r = round(math.cos(rad), 5)
    sin_r = round(math.sin(rad), 5)
    soft_norm = round(max(0.004, geom.softness_px / float(max(64, min(width, height)))), 5)

    du = f"((X/W)-{round(geom.cx, 4)})"
    dv = f"((Y/H)-{round(geom.cy, 4)})"
    lx = f"({du}*{cos_r}-{dv}*{sin_r})"
    ly = f"({du}*{sin_r}+{dv}*{cos_r})"

    if geom.shape_type == "ellipse":
        rx = round(max(0.015, geom.rx), 4)
        ry = round(max(0.015, geom.ry), 4)
        d_expr = f"hypot({lx}/{rx},{ly}/{ry})"
        f_rel = round(max(0.01, soft_norm / max(0.02, min(rx, ry))), 4)
        core = f"clip(1-(({d_expr}-(1-{f_rel}*0.5))/{f_rel}),0,1)"
    elif geom.shape_type == "rounded_box":
        rx = round(max(0.015, geom.rx), 4)
        ry = round(max(0.015, geom.ry), 4)
        cr = round(_clamp(geom.corner_radius, 0.0, 0.95) * min(rx, ry), 4)
        qx = f"(abs({lx})-{round(max(0.001, rx - cr), 4)})"
        qy = f"(abs({ly})-{round(max(0.001, ry - cr), 4)})"
        sdf = f"(hypot(max({qx},0),max({qy},0))+min(max({qx},{qy}),0)-{cr})"
        core = f"clip(0.5-({sdf}/{soft_norm}),0,1)"
    elif geom.shape_type == "linear_gradient":
        span = round(max(0.02, soft_norm * 2.2), 4)
        core = f"clip(0.5-({ly}/{span}),0,1)"
    else:
        # planar_quad bounding + convex edge envelope
        xs = [p[0] for p in geom.quad_corners]
        ys = [p[1] for p in geom.quad_corners]
        qcx = round(sum(xs) / 4.0, 4)
        qcy = round(sum(ys) / 4.0, 4)
        qrx = round(max(0.02, (max(xs) - min(xs)) * 0.5), 4)
        qry = round(max(0.02, (max(ys) - min(ys)) * 0.5), 4)
        q_dist = f"max(abs((X/W)-{qcx})/{qrx},abs((Y/H)-{qcy})/{qry})"
        core = f"clip(1-(({q_dist}-(1-{soft_norm}))/{max(0.02, soft_norm)}),0,1)"

    return f"(1-({core}))" if geom.invert_matte else core


def _ev_to_brightness_eq(ev: float) -> str:
    bright = round(_clamp(ev * 0.18, -0.8, 0.8), 4)
    contrast = round(_clamp(1.0 + ev * 0.12, 0.4, 2.0), 4)
    return f"eq=brightness={bright}:contrast={contrast}"


def compile_power_window_filtergraph(config: PowerWindowConfig) -> PowerWindowCompileResult:
    """Compile a Power Window & 4-Point Planar Corner-Pin FFmpeg filtergraph."""
    geom = interpolate_power_window_at_time(config, config.playhead_norm)
    warnings: list[str] = []

    if not config.enabled:
        return PowerWindowCompileResult(
            enabled=False,
            preset_id=config.preset_id,
            shape_type=config.shape_type,
            view_mode=config.view_mode,
            has_planar_pin=False,
            has_pixelate=False,
            vf_chain="null",
            filter_complex="[0:v]null[vout]",
            ffmpeg_command='ffmpeg -i input.mp4 -vf "null" output.mp4',
            warnings=["Power Window bypass active (enabled=false)."],
        )

    mask_expr = _compile_geq_mask_expr(geom, config.width, config.height)

    if config.view_mode == "matte_bw":
        chain = f"format=gray,geq=lum='255*{mask_expr}',format=yuv420p"
        ff_cmd = (
            f'ffmpeg -i input.mp4 -filter_complex "[0:v]{chain}[vout]" -map "[vout]" output.mp4'
        )
        return PowerWindowCompileResult(
            enabled=True,
            preset_id=config.preset_id,
            shape_type=config.shape_type,
            view_mode=config.view_mode,
            has_planar_pin=config.shape_type == "planar_quad",
            has_pixelate=config.inside_pixelate_size > 1,
            vf_chain=chain,
            filter_complex=f"[0:v]{chain}[vout]",
            ffmpeg_command=ff_cmd,
            warnings=warnings,
        )

    # Inside branch: optional crop+scale privacy pixelate, gblur, and exposure eq
    in_filters: list[str] = []
    if abs(config.inside_exposure_ev) > 0.01:
        in_filters.append(_ev_to_brightness_eq(config.inside_exposure_ev))
    if config.inside_blur_px >= 0.5:
        sigma_in = round(max(0.5, config.inside_blur_px * 0.55), 2)
        in_filters.append(f"gblur=sigma={sigma_in}:steps=2")
    has_pixelate = config.inside_pixelate_size > 1
    if has_pixelate:
        # Mosaic quantization via downscale + neighbor upscale (paired with crop ROI when aligned)
        pix_w = max(16, config.width // max(2, config.inside_pixelate_size))
        pix_h = max(16, config.height // max(2, config.inside_pixelate_size))
        crop_w = max(16, min(config.width, int(round(config.width * min(1.0, geom.rx * 2.4)))))
        crop_h = max(16, min(config.height, int(round(config.height * min(1.0, geom.ry * 2.4)))))
        crop_w -= crop_w % 2
        crop_h -= crop_h % 2
        in_filters.append(
            f"crop=w={config.width}:h={config.height}:x=0:y=0,"
            f"scale={pix_w}:{pix_h}:flags=neighbor,"
            f"scale={config.width}:{config.height}:flags=neighbor"
        )
        if crop_w < config.width or crop_h < config.height:
            warnings.append(
                f"Privacy mosaic active ({config.inside_pixelate_size}px in {crop_w}x{crop_h} ROI)."
            )

    has_planar_pin = config.shape_type == "planar_quad"
    if has_planar_pin:
        q = geom.quad_corners
        x0 = round(q[0][0] * config.width, 1)
        y0 = round(q[0][1] * config.height, 1)
        x1 = round(q[1][0] * config.width, 1)
        y1 = round(q[1][1] * config.height, 1)
        x2 = round(q[3][0] * config.width, 1)
        y2 = round(q[3][1] * config.height, 1)
        x3 = round(q[2][0] * config.width, 1)
        y3 = round(q[2][1] * config.height, 1)
        in_filters.append(
            f"perspective=x0={x0}:y0={y0}:x1={x1}:y1={y1}:x2={x2}:y2={y2}:x3={x3}:y3={y3}"
            ":interpolation=linear:sense=destination"
        )

    in_chain = ",".join(in_filters) if in_filters else "null"

    # Outside branch: exposure eq, boxblur/gblur, radial vignette
    out_filters: list[str] = []
    if abs(config.outside_exposure_ev) > 0.01:
        out_filters.append(_ev_to_brightness_eq(config.outside_exposure_ev))
    if config.outside_blur_px >= 0.5:
        luma_r = max(1, min(32, int(round(config.outside_blur_px * 0.45))))
        out_filters.append(f"boxblur=luma_radius={luma_r}:luma_power=2")
    if config.vignette_opacity > 0.01:
        vig_angle = round(_clamp(0.35 + config.vignette_opacity * 0.85, 0.2, 1.4), 3)
        out_filters.append(f"vignette=angle={vig_angle}:mode=forward")
    out_chain = ",".join(out_filters) if out_filters else "null"

    graph_parts = [
        "[0:v]format=yuv420p,split=3[pw_in_src][pw_out_src][pw_mask_src]",
        f"[pw_in_src]{in_chain}[pw_inside]",
        f"[pw_out_src]{out_chain}[pw_outside]",
        f"[pw_mask_src]format=gray,geq=lum='255*{mask_expr}'[pw_matte]",
        "[pw_outside][pw_inside][pw_matte]maskedmerge[pw_comp]",
    ]

    if config.view_mode == "red_overlay":
        graph_parts.append(
            "[pw_comp]format=rgb24,"
            f"geq=r='clip(r(X,Y)+120*(1-{mask_expr}),0,255)':"
            f"g='clip(g(X,Y)*(0.55+0.45*{mask_expr}),0,255)':"
            f"b='clip(b(X,Y)*(0.55+0.45*{mask_expr}),0,255)',format=yuv420p[vout]"
        )
    else:
        graph_parts.append("[pw_comp]format=yuv420p[vout]")

    filter_complex = ";".join(graph_parts)
    ffmpeg_cmd = (
        f'ffmpeg -i input.mp4 -filter_complex "{filter_complex}" -map "[vout]" output.mp4'
    )
    return PowerWindowCompileResult(
        enabled=True,
        preset_id=config.preset_id,
        shape_type=config.shape_type,
        view_mode=config.view_mode,
        has_planar_pin=has_planar_pin,
        has_pixelate=has_pixelate,
        vf_chain=filter_complex,
        filter_complex=filter_complex,
        ffmpeg_command=ffmpeg_cmd,
        warnings=warnings,
    )


def export_power_window_json(
    config: PowerWindowConfig,
    *,
    title: str = "TAKTCUT_POWER_WINDOW",
) -> PowerWindowExportResult:
    """Export Power Window geometry, homography 3x3, and keyframes as JSON."""
    cleaned_title = _SAFE_TITLE_RE.sub("_", str(title or "TAKTCUT_POWER_WINDOW").strip()).strip("_")
    if not cleaned_title:
        cleaned_title = "TAKTCUT_POWER_WINDOW"

    geom = interpolate_power_window_at_time(config, config.playhead_norm)
    compiled = compile_power_window_filtergraph(config)
    hosts = [
        "DaVinci Resolve Studio Color",
        "Adobe Premiere Lumetri Mask",
        "FFmpeg MaskedMerge / Perspective",
    ]
    payload = {
        "schema_version": "taktcut.power_window.v1",
        "title": cleaned_title,
        "preset_id": config.preset_id,
        "compatible_hosts": hosts,
        "geometry": {
            "enabled": config.enabled,
            "shape_type": config.shape_type,
            "cx": geom.cx,
            "cy": geom.cy,
            "rx": geom.rx,
            "ry": geom.ry,
            "rotation_deg": geom.rotation_deg,
            "corner_radius": config.corner_radius,
            "softness_px": geom.softness_px,
            "invert_matte": config.invert_matte,
            "quad_corners": [list(pt) for pt in geom.quad_corners],
        },
        "homography_3x3": geom.homography_3x3,
        "effects": {
            "inside_exposure_ev": config.inside_exposure_ev,
            "outside_exposure_ev": config.outside_exposure_ev,
            "inside_blur_px": config.inside_blur_px,
            "outside_blur_px": config.outside_blur_px,
            "inside_pixelate_size": config.inside_pixelate_size,
            "vignette_opacity": config.vignette_opacity,
        },
        "view_mode": config.view_mode,
        "track_keyframes": [
            {
                "t_norm": kf.t_norm,
                "cx": kf.cx,
                "cy": kf.cy,
                "rx": kf.rx,
                "ry": kf.ry,
                "rotation_deg": kf.rotation_deg,
                "softness_px": kf.softness_px,
                "quad_corners": [list(pt) for pt in kf.quad_corners],
            }
            for kf in config.track_keyframes
        ],
        "ffmpeg_filter_complex": compiled.filter_complex,
    }
    json_text = json.dumps(payload, indent=2)
    filename = f"{cleaned_title.lower()}_{config.preset_id}_power_window.json"
    return PowerWindowExportResult(
        schema_version="taktcut.power_window.v1",
        title=cleaned_title,
        preset_id=config.preset_id,
        compatible_hosts=hosts,
        json_text=json_text,
        filename=filename,
    )


def apply_power_window_to_document(
    document: TimelineDocument,
    config: PowerWindowConfig,
    *,
    track_index: int = 1,
    clip_index: int = 0,
) -> TimelineDocument:
    """Attach a non-destructive ClipPowerWindowTrack onto the target video clip."""
    eval_res = evaluate_power_window_samples(config)
    compiled = compile_power_window_filtergraph(config)
    geom = eval_res.interpolated_geometry

    next_doc = document.model_copy(deep=True)
    video_tracks = [t for t in next_doc.tracks if t.kind == "video"]
    target_track = next((t for t in video_tracks if t.index == track_index), None)
    if target_track is None and video_tracks:
        target_track = video_tracks[0]
    if target_track is None or not target_track.clips:
        raise ValueError("No video clip available in timeline document.")

    clamped_idx = max(0, min(len(target_track.clips) - 1, clip_index))
    target_clip = target_track.clips[clamped_idx]
    target_clip.power_window = ClipPowerWindowTrack(
        enabled=config.enabled,
        preset_id=config.preset_id,
        shape_type=config.shape_type,
        cx=geom.cx,
        cy=geom.cy,
        rx=geom.rx,
        ry=geom.ry,
        rotation_deg=geom.rotation_deg,
        corner_radius=config.corner_radius,
        softness_px=geom.softness_px,
        invert_matte=config.invert_matte,
        quad_corners=geom.quad_corners,
        inside_exposure_ev=config.inside_exposure_ev,
        outside_exposure_ev=config.outside_exposure_ev,
        inside_blur_px=config.inside_blur_px,
        outside_blur_px=config.outside_blur_px,
        inside_pixelate_size=config.inside_pixelate_size,
        vignette_opacity=config.vignette_opacity,
        view_mode=config.view_mode,
        inside_coverage_pct=eval_res.inside_coverage_pct,
        homography_3x3=geom.homography_3x3,
        ffmpeg_vf=compiled.vf_chain[:16384],
        track_keyframes=[
            ClipPowerWindowKeyframeRef(
                t_norm=kf.t_norm,
                cx=kf.cx,
                cy=kf.cy,
                rx=kf.rx,
                ry=kf.ry,
                rotation_deg=kf.rotation_deg,
                softness_px=kf.softness_px,
                quad_corners=kf.quad_corners,
            )
            for kf in config.track_keyframes
        ],
    )
    return next_doc
