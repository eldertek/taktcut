"""Titles, Lower-Thirds & Motion Graphics Studio (Text+, Broadcast Bugs, Spring Physics)."""

from __future__ import annotations

import math
import re
import sys
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from taktcut.color import escape_ffmpeg_filter_path

TitlePresetId = Literal["broadcast_lower_third", "center_title_card", "minimal_subtitle"]
TitlePosition = Literal["bottom-left", "center", "bottom-center"]
AnimationCurveId = Literal[
    "none",
    "spring_overshoot",
    "ease_out_expo",
    "typewriter",
    "slide_wipe",
    "kinetic_bounce",
]
PlateStyleId = Literal["solid_bar", "glass_pill", "outline_frame", "none"]
MotionTemplateId = Literal[
    "lower_third_editorial",
    "kinetic_spring_pop",
    "typewriter_terminal",
    "broadcast_corner_bug",
    "chapter_slate_card",
    "breaking_ticker_bar",
]

TITLE_POSITIONS: tuple[TitlePosition, ...] = ("bottom-left", "center", "bottom-center")
TITLE_ANIMATION_CURVES: tuple[AnimationCurveId, ...] = (
    "none",
    "spring_overshoot",
    "ease_out_expo",
    "typewriter",
    "slide_wipe",
    "kinetic_bounce",
)
TITLE_PLATE_STYLES: tuple[PlateStyleId, ...] = (
    "solid_bar",
    "glass_pill",
    "outline_frame",
    "none",
)
ALLOWED_TITLE_PIX_FMTS: frozenset[str] = frozenset(
    {"yuv420p", "yuv422p10le", "rgb24", "yuv444p"}
)

TITLE_MAX_LEN: int = 200
TITLE_BUG_MAX_LEN: int = 24
TITLE_TIME_MAX_S: float = 86400.0
TITLE_FONT_SIZE_MIN: int = 14
TITLE_FONT_SIZE_MAX: int = 96
TITLE_POS_MIN: float = 0.04
TITLE_POS_MAX: float = 0.96
TITLE_ANIM_IN_MIN: float = 0.05
TITLE_ANIM_IN_MAX: float = 5.0
TITLE_ANIM_OUT_MIN: float = 0.0
TITLE_ANIM_OUT_MAX: float = 5.0
TITLE_STIFFNESS_MIN: float = 40.0
TITLE_STIFFNESS_MAX: float = 600.0
TITLE_DAMPING_MIN: float = 4.0
TITLE_DAMPING_MAX: float = 40.0
TITLE_TRACKING_MIN: int = -4
TITLE_TRACKING_MAX: int = 24
TITLE_STROKE_MIN: int = 0
TITLE_STROKE_MAX: int = 10
TITLE_SHADOW_MIN: int = 0
TITLE_SHADOW_MAX: int = 12

_HEX_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")

_FONT_CANDIDATES_WIN: tuple[str, ...] = (
    "C:/Windows/Fonts/segoeui.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/calibri.ttf",
    "C:/Windows/Fonts/consola.ttf",
)
_FONT_CANDIDATES_MAC: tuple[str, ...] = (
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/Library/Fonts/Arial.ttf",
)
_FONT_CANDIDATES_LINUX: tuple[str, ...] = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
    "/usr/share/fonts/TTF/DejaVuSans.ttf",
)


def resolve_default_fontfile() -> Path | None:
    """Locate a standard system sans-serif font file for FFmpeg drawtext."""
    if sys.platform.startswith("win"):
        candidates = _FONT_CANDIDATES_WIN
    elif sys.platform == "darwin":
        candidates = _FONT_CANDIDATES_MAC
    else:
        candidates = _FONT_CANDIDATES_LINUX

    for raw in candidates:
        candidate = Path(raw)
        if candidate.is_file():
            return candidate
    return None


def _validate_finite_float(
    raw: Any,
    field_name: str,
    min_val: float,
    max_val: float,
) -> float:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raise ValueError(f"{field_name} must be a finite number, got {raw!r}")
    val = float(raw)
    if not math.isfinite(val):
        raise ValueError(f"{field_name} must be finite, got {raw!r}")
    if val < min_val or val > max_val:
        raise ValueError(f"{field_name} must be within [{min_val}, {max_val}], got {val}")
    return val


def _validate_int_range(raw: Any, field_name: str, min_val: int, max_val: int) -> int:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raise ValueError(f"{field_name} must be an integer, got {raw!r}")
    fval = float(raw)
    if not math.isfinite(fval):
        raise ValueError(f"{field_name} must be finite, got {raw!r}")
    val = int(round(fval))
    if val < min_val or val > max_val:
        raise ValueError(f"{field_name} must be in [{min_val}, {max_val}], got {val}")
    return val


def sanitize_title_text(raw: str) -> str:
    """Normalize newlines and control characters to single spaces to block line-break injection."""
    normalized = raw.replace("\r\n", " ").replace("\n", " ").replace("\r", " ").replace("\t", " ")
    cleaned = "".join(ch if (ord(ch) >= 32 and ord(ch) != 127) else " " for ch in normalized)
    return cleaned.strip()


def escape_ffmpeg_drawtext_text(raw: str) -> str:
    """Strictly escape text for FFmpeg drawtext single-quoted option value (text='...').

    Handles FFmpeg's two-stage unescaping (filtergraph parser + option parser):
    - Strips/normalizes newlines and control chars.
    - Escapes backslashes (\\ -> \\\\) before quote-breaking so trailing backslashes
      cannot escape the closing quote.
    - Escapes single quotes (' -> '\\'' at level 1 -> \\' at level 2 via '\\''' -> '''\\\\\\'''').
    - Escapes colons (: -> \\:) so option splitting cannot inject drawtext parameters.
    """
    cleaned = sanitize_title_text(raw)
    out: list[str] = []
    for ch in cleaned:
        if ch == "\\":
            out.append("\\\\")
        elif ch == "'":
            out.append("'\\\\\\''")
        elif ch == ":":
            out.append("\\:")
        else:
            out.append(ch)
    return "".join(out)


def _hex_to_ffmpeg_color(hex_color: str) -> str:
    return f"0x{hex_color[1:].lower()}"


class TitleOverlayParams(BaseModel):
    """Parameters for a Broadcast Title, Lower-Third, or Text+ Motion Graphic overlay."""

    preset_id: TitlePresetId = "broadcast_lower_third"
    title: str = "ALEXANDRE MOREAU"
    subtitle: str = "Lead Colorist | Studio Paris"
    position: TitlePosition = "bottom-left"
    accent_color: str = "#e68442"
    start_s: float = 0.5
    end_s: float = 5.5
    font_size: int = 34
    box_opacity: float = 0.80
    enabled: bool = True

    # Motion Graphics & Text+ Studio extensions (backward-compatible defaults)
    motion_template: MotionTemplateId | None = None
    custom_position_enabled: bool = False
    pos_x: float = 0.28
    pos_y: float = 0.83
    animation_curve: AnimationCurveId = "none"
    anim_in_s: float = 0.45
    anim_out_s: float = 0.30
    spring_stiffness: float = 180.0
    spring_damping: float = 14.0
    tracking: int = 0
    stroke_width: int = 0
    stroke_color: str = "#090a0d"
    shadow_depth: int = 2
    plate_style: PlateStyleId = "solid_bar"
    bug_badge: str = ""

    @field_validator("title", "subtitle", mode="before")
    @classmethod
    def _validate_text_field(cls, raw: Any, info: Any) -> str:
        if not isinstance(raw, str):
            raise ValueError(f"{info.field_name} must be a string")
        if len(raw) > TITLE_MAX_LEN:
            raise ValueError(
                f"{info.field_name} exceeds maximum length of {TITLE_MAX_LEN} characters"
            )
        return raw

    @field_validator("bug_badge", mode="before")
    @classmethod
    def _validate_bug_badge(cls, raw: Any) -> str:
        if raw is None:
            return ""
        if not isinstance(raw, str):
            raise ValueError("bug_badge must be a string")
        if len(raw) > TITLE_BUG_MAX_LEN:
            raise ValueError(
                f"bug_badge exceeds maximum length of {TITLE_BUG_MAX_LEN} characters"
            )
        return raw

    @field_validator("accent_color", "stroke_color", mode="before")
    @classmethod
    def _validate_hex_color(cls, raw: Any, info: Any) -> str:
        if not isinstance(raw, str) or not _HEX_COLOR_RE.match(raw.strip()):
            raise ValueError(f"{info.field_name} must be #RRGGBB hex, got {raw!r}")
        return raw.strip().lower()

    @field_validator("start_s", "end_s", mode="before")
    @classmethod
    def _validate_time_s(cls, raw: Any, info: Any) -> float:
        return _validate_finite_float(raw, str(info.field_name), 0.0, TITLE_TIME_MAX_S)

    @field_validator("box_opacity", mode="before")
    @classmethod
    def _validate_box_opacity(cls, raw: Any) -> float:
        return _validate_finite_float(raw, "box_opacity", 0.0, 1.0)

    @field_validator("pos_x", "pos_y", mode="before")
    @classmethod
    def _validate_pos_norm(cls, raw: Any, info: Any) -> float:
        return _validate_finite_float(raw, str(info.field_name), TITLE_POS_MIN, TITLE_POS_MAX)

    @field_validator("anim_in_s", mode="before")
    @classmethod
    def _validate_anim_in(cls, raw: Any) -> float:
        return _validate_finite_float(raw, "anim_in_s", TITLE_ANIM_IN_MIN, TITLE_ANIM_IN_MAX)

    @field_validator("anim_out_s", mode="before")
    @classmethod
    def _validate_anim_out(cls, raw: Any) -> float:
        return _validate_finite_float(raw, "anim_out_s", TITLE_ANIM_OUT_MIN, TITLE_ANIM_OUT_MAX)

    @field_validator("spring_stiffness", mode="before")
    @classmethod
    def _validate_stiffness(cls, raw: Any) -> float:
        return _validate_finite_float(
            raw, "spring_stiffness", TITLE_STIFFNESS_MIN, TITLE_STIFFNESS_MAX
        )

    @field_validator("spring_damping", mode="before")
    @classmethod
    def _validate_damping(cls, raw: Any) -> float:
        return _validate_finite_float(raw, "spring_damping", TITLE_DAMPING_MIN, TITLE_DAMPING_MAX)

    @field_validator("font_size", mode="before")
    @classmethod
    def _validate_font_size(cls, raw: Any) -> int:
        return _validate_int_range(raw, "font_size", TITLE_FONT_SIZE_MIN, TITLE_FONT_SIZE_MAX)

    @field_validator("tracking", mode="before")
    @classmethod
    def _validate_tracking(cls, raw: Any) -> int:
        return _validate_int_range(raw, "tracking", TITLE_TRACKING_MIN, TITLE_TRACKING_MAX)

    @field_validator("stroke_width", mode="before")
    @classmethod
    def _validate_stroke_width(cls, raw: Any) -> int:
        return _validate_int_range(raw, "stroke_width", TITLE_STROKE_MIN, TITLE_STROKE_MAX)

    @field_validator("shadow_depth", mode="before")
    @classmethod
    def _validate_shadow_depth(cls, raw: Any) -> int:
        return _validate_int_range(raw, "shadow_depth", TITLE_SHADOW_MIN, TITLE_SHADOW_MAX)

    @model_validator(mode="after")
    def _validate_time_window(self) -> TitleOverlayParams:
        if self.end_s <= self.start_s:
            raise ValueError(
                f"end_s ({self.end_s}) must be strictly greater than start_s ({self.start_s})"
            )
        return self

    def is_active(self) -> bool:
        """Return True when enabled and at least one sanitized text line or bug badge is present."""
        if not self.enabled:
            return False
        return bool(sanitize_title_text(self.title) or sanitize_title_text(self.subtitle))


class TitlePreset(BaseModel):
    """Built-in broadcast title or lower-third template."""

    id: TitlePresetId
    name: str
    description: str
    params: TitleOverlayParams


class MotionTemplate(BaseModel):
    """After Effects / Resolve Fusion Motion Graphics Studio template."""

    id: MotionTemplateId
    name: str
    category: Literal["lower_third", "kinetic", "typewriter", "bug", "slate", "chyron"]
    description: str
    params: TitleOverlayParams


class TitleMotionFrame(BaseModel):
    """Deterministic evaluated motion physics state at a given timeline timestamp."""

    t_s: float
    visible: bool
    phase: Literal["outside", "in", "hold", "out"]
    progress_in: float
    progress_out: float
    eased_in: float
    offset_x_norm: float
    offset_y_norm: float
    scale: float
    alpha: float
    reveal_chars_title: int
    reveal_chars_sub: int
    cursor_visible: bool
    wipe_ratio: float


class TitleCompileResult(BaseModel):
    """Compiled FFmpeg drawbox + drawtext filtergraph and sanitized metadata."""

    filtergraph: str
    ffmpeg_vf_args: list[str] = Field(default_factory=list)
    is_active: bool
    escaped_title: str
    escaped_subtitle: str
    escaped_bug_badge: str = ""
    animation_curve: AnimationCurveId = "none"
    plate_style: PlateStyleId = "solid_bar"
    has_motion: bool = False
    params: TitleOverlayParams


TITLE_PRESETS: tuple[TitlePreset, ...] = (
    TitlePreset(
        id="broadcast_lower_third",
        name="Broadcast Lower-Third",
        description="Left-anchored broadcast plate with vertical accent bar, name, and role.",
        params=TitleOverlayParams(
            preset_id="broadcast_lower_third",
            title="ALEXANDRE MOREAU",
            subtitle="Lead Colorist | Studio Paris",
            position="bottom-left",
            accent_color="#e68442",
            start_s=0.5,
            end_s=5.5,
            font_size=34,
            box_opacity=0.82,
            enabled=True,
        ),
    ),
    TitlePreset(
        id="center_title_card",
        name="Center Title Card",
        description="Centered slate card with top accent rule for chapter openers and packshots.",
        params=TitleOverlayParams(
            preset_id="center_title_card",
            title="ECLIPSE SHOWREEL 2026",
            subtitle="REC.709 BROADCAST MASTER",
            position="center",
            accent_color="#689cff",
            start_s=0.0,
            end_s=4.0,
            font_size=48,
            box_opacity=0.80,
            enabled=True,
        ),
    ),
    TitlePreset(
        id="minimal_subtitle",
        name="Minimal Subtitle",
        description="Clean bottom-center caption pill with subtle dark backing and hairline rule.",
        params=TitleOverlayParams(
            preset_id="minimal_subtitle",
            title="Clean-room timeline interchange",
            subtitle="",
            position="bottom-center",
            accent_color="#d8d8de",
            start_s=1.0,
            end_s=6.0,
            font_size=26,
            box_opacity=0.72,
            enabled=True,
        ),
    ),
)

MOTION_TEMPLATES: tuple[MotionTemplate, ...] = (
    MotionTemplate(
        id="lower_third_editorial",
        name="Editorial Lower-Third",
        category="lower_third",
        description="Slide-wipe lower-third with damped rail and live role badge.",
        params=TitleOverlayParams(
            preset_id="broadcast_lower_third",
            motion_template="lower_third_editorial",
            title="ALEXANDRE MOREAU",
            subtitle="Lead Colorist | Studio Paris",
            position="bottom-left",
            custom_position_enabled=True,
            pos_x=0.28,
            pos_y=0.82,
            accent_color="#e68442",
            start_s=0.4,
            end_s=5.4,
            font_size=34,
            box_opacity=0.84,
            animation_curve="slide_wipe",
            anim_in_s=0.45,
            anim_out_s=0.30,
            spring_stiffness=190.0,
            spring_damping=15.0,
            tracking=1,
            stroke_width=0,
            shadow_depth=2,
            plate_style="solid_bar",
            bug_badge="STUDIO A",
            enabled=True,
        ),
    ),
    MotionTemplate(
        id="kinetic_spring_pop",
        name="Kinetic Spring Pop",
        category="kinetic",
        description="Spring-overshoot Text+ title with bold stroke and floating punch.",
        params=TitleOverlayParams(
            preset_id="center_title_card",
            motion_template="kinetic_spring_pop",
            title="NEXT CHAPTER",
            subtitle="COLOR SCIENCE WORKFLOW",
            position="center",
            custom_position_enabled=True,
            pos_x=0.50,
            pos_y=0.48,
            accent_color="#ff9d42",
            start_s=0.2,
            end_s=4.5,
            font_size=54,
            box_opacity=0.0,
            animation_curve="spring_overshoot",
            anim_in_s=0.55,
            anim_out_s=0.28,
            spring_stiffness=240.0,
            spring_damping=11.0,
            tracking=4,
            stroke_width=3,
            stroke_color="#090a0d",
            shadow_depth=4,
            plate_style="none",
            bug_badge="HDR",
            enabled=True,
        ),
    ),
    MotionTemplate(
        id="typewriter_terminal",
        name="Typewriter Callout",
        category="typewriter",
        description="Progressive character reveal with terminal cursor and crisp glass pill.",
        params=TitleOverlayParams(
            preset_id="broadcast_lower_third",
            motion_template="typewriter_terminal",
            title="SCENE 04 // EXTERIOR NIGHT",
            subtitle="CAM A | 25FPS | 800 ASA",
            position="bottom-left",
            custom_position_enabled=True,
            pos_x=0.31,
            pos_y=0.78,
            accent_color="#38e08d",
            start_s=0.3,
            end_s=5.5,
            font_size=30,
            box_opacity=0.80,
            animation_curve="typewriter",
            anim_in_s=1.10,
            anim_out_s=0.25,
            spring_stiffness=180.0,
            spring_damping=16.0,
            tracking=2,
            stroke_width=1,
            stroke_color="#090a0d",
            shadow_depth=2,
            plate_style="glass_pill",
            bug_badge="TC LOCK",
            enabled=True,
        ),
    ),
    MotionTemplate(
        id="broadcast_corner_bug",
        name="Broadcast Corner Bug",
        category="bug",
        description="Top-right network bug with live status tag and exponential ease-out.",
        params=TitleOverlayParams(
            preset_id="minimal_subtitle",
            motion_template="broadcast_corner_bug",
            title="TAKTCUT LIVE",
            subtitle="4K REC.709 FEED",
            position="bottom-center",
            custom_position_enabled=True,
            pos_x=0.84,
            pos_y=0.11,
            accent_color="#ef5350",
            start_s=0.0,
            end_s=8.0,
            font_size=22,
            box_opacity=0.86,
            animation_curve="ease_out_expo",
            anim_in_s=0.35,
            anim_out_s=0.25,
            spring_stiffness=200.0,
            spring_damping=18.0,
            tracking=2,
            stroke_width=0,
            shadow_depth=1,
            plate_style="outline_frame",
            bug_badge="LIVE",
            enabled=True,
        ),
    ),
    MotionTemplate(
        id="chapter_slate_card",
        name="Fusion Title Slate",
        category="slate",
        description="Cinematic wide-tracked opener with glass frame and exponential settle.",
        params=TitleOverlayParams(
            preset_id="center_title_card",
            motion_template="chapter_slate_card",
            title="ECLIPSE SHOWREEL 2026",
            subtitle="MASTER GRADE | PARIS",
            position="center",
            custom_position_enabled=True,
            pos_x=0.50,
            pos_y=0.50,
            accent_color="#689cff",
            start_s=0.2,
            end_s=5.0,
            font_size=46,
            box_opacity=0.76,
            animation_curve="ease_out_expo",
            anim_in_s=0.50,
            anim_out_s=0.35,
            spring_stiffness=170.0,
            spring_damping=16.0,
            tracking=6,
            stroke_width=1,
            stroke_color="#090a0d",
            shadow_depth=3,
            plate_style="outline_frame",
            bug_badge="MASTER",
            enabled=True,
        ),
    ),
    MotionTemplate(
        id="breaking_ticker_bar",
        name="News Chyron Bar",
        category="chyron",
        description="Full-width broadcast chyron with kinetic bounce headline and alert bug.",
        params=TitleOverlayParams(
            preset_id="bottom-center" if False else "minimal_subtitle",
            motion_template="breaking_ticker_bar",
            title="BROADCAST DELIVERY PIPELINE ACTIVE",
            subtitle="EBU R128 -23.0 LUFS VERIFIED | FASTSTART OK",
            position="bottom-center",
            custom_position_enabled=True,
            pos_x=0.50,
            pos_y=0.87,
            accent_color="#ffd54f",
            start_s=0.3,
            end_s=6.5,
            font_size=28,
            box_opacity=0.88,
            animation_curve="kinetic_bounce",
            anim_in_s=0.50,
            anim_out_s=0.30,
            spring_stiffness=220.0,
            spring_damping=12.0,
            tracking=1,
            stroke_width=1,
            stroke_color="#090a0d",
            shadow_depth=2,
            plate_style="solid_bar",
            bug_badge="FLASH",
            enabled=True,
        ),
    ),
)


def list_title_presets() -> tuple[TitlePreset, ...]:
    """Return all built-in broadcast title and lower-third presets."""
    return TITLE_PRESETS


def get_title_preset(preset_id: str) -> TitlePreset:
    """Look up a built-in title preset by id or case-insensitive name."""
    cleaned = preset_id.strip().lower()
    for preset in TITLE_PRESETS:
        if preset.id == cleaned or preset.name.lower() == cleaned:
            return preset
    raise ValueError(f"Unknown title preset: {preset_id!r}")


def apply_title_preset(preset_id: str) -> TitleOverlayParams:
    """Return a fresh validated TitleOverlayParams copy for the requested preset."""
    return get_title_preset(preset_id).params.model_copy(deep=True)


def list_motion_templates() -> tuple[MotionTemplate, ...]:
    """Return all Motion Graphics Studio templates."""
    return MOTION_TEMPLATES


def get_motion_template(template_id: str) -> MotionTemplate:
    """Look up a Motion Graphics Studio template by id or case-insensitive name."""
    cleaned = template_id.strip().lower()
    for tpl in MOTION_TEMPLATES:
        if tpl.id == cleaned or tpl.name.lower() == cleaned:
            return tpl
    raise ValueError(f"Unknown motion template: {template_id!r}")


def apply_motion_template(template_id: str) -> TitleOverlayParams:
    """Return a fresh validated TitleOverlayParams copy for the requested motion template."""
    return get_motion_template(template_id).params.model_copy(deep=True)


def _spring_overshoot_value(u: float, stiffness: float, damping: float) -> float:
    """Evaluate normalized [0..1] step response of a damped harmonic oscillator."""
    if u <= 0.0:
        return 0.0
    if u >= 1.0:
        return 1.0
    omega = math.sqrt(max(40.0, stiffness))
    zeta = min(0.95, max(0.12, damping / (2.0 * omega)))
    omega_d = omega * math.sqrt(max(0.01, 1.0 - zeta * zeta))
    # Map normalized u in [0, 1] onto physical settle time (~0.85s equivalent)
    t_phys = u * 0.85
    env = math.exp(-zeta * omega * t_phys)
    damp_term = zeta / math.sqrt(max(0.01, 1.0 - zeta * zeta))
    response = 1.0 - env * (
        math.cos(omega_d * t_phys) + damp_term * math.sin(omega_d * t_phys)
    )
    return response


def evaluate_title_motion(
    title_overlay: TitleOverlayParams | dict[str, Any],
    t_s: float,
) -> TitleMotionFrame:
    """Evaluate deterministic animation physics and reveal state at timestamp t_s."""
    params = _coerce_title_params(title_overlay)
    t = float(t_s) if math.isfinite(t_s) else 0.0
    clean_title = sanitize_title_text(params.title)
    clean_sub = sanitize_title_text(params.subtitle)

    if not params.is_active() or t < params.start_s or t > params.end_s:
        return TitleMotionFrame(
            t_s=t,
            visible=False,
            phase="outside",
            progress_in=0.0,
            progress_out=0.0,
            eased_in=0.0,
            offset_x_norm=0.0,
            offset_y_norm=0.0,
            scale=1.0,
            alpha=0.0,
            reveal_chars_title=0,
            reveal_chars_sub=0,
            cursor_visible=False,
            wipe_ratio=0.0,
        )

    elapsed = max(0.0, t - params.start_s)
    remaining = max(0.0, params.end_s - t)
    anim_in = max(TITLE_ANIM_IN_MIN, params.anim_in_s)
    anim_out = max(0.0, params.anim_out_s)

    progress_in = min(1.0, elapsed / anim_in)
    progress_out = min(1.0, remaining / anim_out) if anim_out > 0.0 else 1.0

    if params.animation_curve == "none":
        return TitleMotionFrame(
            t_s=t,
            visible=True,
            phase="hold",
            progress_in=1.0,
            progress_out=1.0,
            eased_in=1.0,
            offset_x_norm=0.0,
            offset_y_norm=0.0,
            scale=1.0,
            alpha=1.0,
            reveal_chars_title=len(clean_title),
            reveal_chars_sub=len(clean_sub),
            cursor_visible=False,
            wipe_ratio=1.0,
        )

    phase: Literal["in", "hold", "out"] = "hold"
    if elapsed < anim_in:
        phase = "in"
    elif anim_out > 0.0 and remaining < anim_out:
        phase = "out"

    curve = params.animation_curve
    eased_in = progress_in
    offset_x = 0.0
    offset_y = 0.0
    scale = 1.0
    wipe_ratio = 1.0
    reveal_title = len(clean_title)
    reveal_sub = len(clean_sub)
    cursor_visible = False

    if curve == "spring_overshoot":
        eased_in = _spring_overshoot_value(
            progress_in, params.spring_stiffness, params.spring_damping
        )
        offset_x = -(1.0 - eased_in) * 0.075
        scale = 0.88 + 0.12 * eased_in
        wipe_ratio = max(0.0, min(1.25, eased_in))
    elif curve == "kinetic_bounce":
        omega = math.sqrt(max(40.0, params.spring_stiffness))
        decay = min(9.0, max(2.5, params.spring_damping * 0.42))
        bounce = abs(math.cos(omega * 0.55 * progress_in)) * math.exp(-decay * progress_in)
        eased_in = 1.0 - bounce if progress_in < 1.0 else 1.0
        offset_y = -bounce * 0.075
        scale = 1.0 + bounce * 0.10
        wipe_ratio = min(1.0, progress_in * 1.4)
    elif curve == "ease_out_expo":
        eased_in = 1.0 if progress_in >= 1.0 else 1.0 - math.pow(2.0, -10.0 * progress_in)
        offset_y = (1.0 - eased_in) * 0.045
        scale = 0.96 + 0.04 * eased_in
        wipe_ratio = eased_in
    elif curve == "slide_wipe":
        inv = 1.0 - progress_in
        eased_in = 1.0 - inv * inv * inv
        offset_x = -(1.0 - eased_in) * 0.11
        wipe_ratio = eased_in
    elif curve == "typewriter":
        eased_in = progress_in
        reveal_title = min(
            len(clean_title),
            max(0, int(math.floor(progress_in * (len(clean_title) + 0.99)))),
        )
        sub_prog = max(0.0, min(1.0, (progress_in - 0.35) / 0.65))
        reveal_sub = min(
            len(clean_sub),
            max(0, int(math.floor(sub_prog * (len(clean_sub) + 0.99)))),
        )
        cursor_visible = progress_in < 1.0 or (int(elapsed * 4.0) % 2 == 0)
        wipe_ratio = min(1.0, progress_in * 1.6)

    fade_in = min(1.0, elapsed / min(0.16, anim_in))
    alpha = max(0.0, min(1.0, fade_in * progress_out))

    return TitleMotionFrame(
        t_s=t,
        visible=True,
        phase=phase,
        progress_in=round(progress_in, 4),
        progress_out=round(progress_out, 4),
        eased_in=round(eased_in, 4),
        offset_x_norm=round(offset_x, 5),
        offset_y_norm=round(offset_y, 5),
        scale=round(scale, 4),
        alpha=round(alpha, 4),
        reveal_chars_title=reveal_title,
        reveal_chars_sub=reveal_sub,
        cursor_visible=cursor_visible,
        wipe_ratio=round(wipe_ratio, 4),
    )


def _coerce_title_params(raw: TitleOverlayParams | dict[str, Any]) -> TitleOverlayParams:
    if isinstance(raw, TitleOverlayParams):
        return TitleOverlayParams.model_validate(raw.model_dump())
    return TitleOverlayParams.model_validate(raw)


def _resolve_font_option(fontfile: Path | str | None) -> str:
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
        resolved_font = resolve_default_fontfile()

    if resolved_font is None:
        return ""
    escaped = escape_ffmpeg_filter_path(resolved_font)
    return f"fontfile='{escaped}':"


def _is_legacy_static_title(params: TitleOverlayParams) -> bool:
    return (
        not params.custom_position_enabled
        and params.animation_curve == "none"
        and params.plate_style == "solid_bar"
        and params.stroke_width == 0
        and params.shadow_depth == 2
        and not sanitize_title_text(params.bug_badge)
    )


def _resolve_motion_anchor_box(
    params: TitleOverlayParams,
) -> tuple[float, float, float, float, str]:
    """Return normalized (box_x, box_y, box_w, box_h, text_align) for Motion Graphics."""
    is_bug = params.motion_template == "broadcast_corner_bug"
    is_chyron = params.motion_template == "breaking_ticker_bar"
    if is_bug:
        box_w, box_h, align = 0.25, 0.11, "left"
    elif is_chyron:
        box_w, box_h, align = 0.84, 0.12, "center"
    elif params.position == "center":
        box_w, box_h, align = 0.68, 0.28, "center"
    elif params.position == "bottom-center":
        box_w, box_h, align = 0.66, 0.12, "center"
    else:
        box_w, box_h, align = 0.46, 0.14, "left"

    if params.custom_position_enabled:
        cx = params.pos_x
        cy = params.pos_y
    elif params.position == "bottom-left":
        cx, cy = 0.28, 0.83
    elif params.position == "center":
        cx, cy = 0.50, 0.50
    else:
        cx, cy = 0.50, 0.865

    box_x = max(0.02, min(0.98 - box_w, cx - box_w / 2.0))
    box_y = max(0.02, min(0.98 - box_h, cy - box_h / 2.0))
    return box_x, box_y, box_w, box_h, align


def _build_motion_alpha_expr(params: TitleOverlayParams) -> str:
    if params.animation_curve == "none":
        return "1"
    s = params.start_s
    e = params.end_s
    fade_in = min(0.18, max(0.04, params.anim_in_s * 0.38))
    if params.anim_out_s > 0.0:
        return (
            f"min(1,max(0,(t-{s:.3f})/{fade_in:.3f}))*"
            f"min(1,max(0,({e:.3f}-t)/{params.anim_out_s:.3f}))"
        )
    return f"min(1,max(0,(t-{s:.3f})/{fade_in:.3f}))"


def _build_motion_xy_exprs(
    params: TitleOverlayParams,
    base_x_expr: str,
    base_y_expr: str,
) -> tuple[str, str]:
    curve = params.animation_curve
    if curve in ("none", "typewriter"):
        return base_x_expr, base_y_expr

    s = params.start_s
    dur = max(TITLE_ANIM_IN_MIN, params.anim_in_s)
    s_end = min(params.end_s, s + dur)

    if curve == "spring_overshoot":
        omega = math.sqrt(max(40.0, params.spring_stiffness))
        zeta = min(0.95, max(0.12, params.spring_damping / (2.0 * omega)))
        decay = zeta * omega * (0.85 / dur)
        freq = omega * math.sqrt(max(0.01, 1.0 - zeta * zeta)) * (0.85 / dur)
        x_expr = (
            f"round({base_x_expr}-exp(-{decay:.3f}*max(0,t-{s:.3f}))*"
            f"cos({freq:.3f}*max(0,t-{s:.3f}))*w*0.075*lt(t,{s_end:.3f}))"
        )
        return x_expr, base_y_expr

    if curve == "kinetic_bounce":
        omega = math.sqrt(max(40.0, params.spring_stiffness))
        decay = min(9.0, max(2.5, params.spring_damping * 0.42)) / dur
        freq = (omega * 0.55) / dur
        y_expr = (
            f"round({base_y_expr}-abs(cos({freq:.3f}*max(0,t-{s:.3f})))*"
            f"exp(-{decay:.3f}*max(0,t-{s:.3f}))*h*0.075*lt(t,{s_end:.3f}))"
        )
        return base_x_expr, y_expr

    if curve == "ease_out_expo":
        y_expr = (
            f"round({base_y_expr}+exp(-7.0*max(0,t-{s:.3f})/{dur:.3f})*"
            f"h*0.045*lt(t,{s_end:.3f}))"
        )
        return base_x_expr, y_expr

    # slide_wipe
    x_expr = (
        f"round({base_x_expr}-pow(max(0,1-max(0,t-{s:.3f})/{dur:.3f}),3)*w*0.11)"
    )
    return x_expr, base_y_expr


def _typewriter_slices(
    text: str, start_s: float, anim_in_s: float, end_s: float
) -> list[tuple[float, float, str]]:
    """Build deterministic stepped prefix windows (up to 16 steps) for safe FFmpeg drawtext."""
    n = len(text)
    if n == 0:
        return []
    steps = min(n, 16)
    type_end = min(end_s, start_s + max(TITLE_ANIM_IN_MIN, anim_in_s))
    slices: list[tuple[float, float, str]] = []
    if type_end <= start_s:
        return [(start_s, end_s, text)]

    for i in range(1, steps + 1):
        char_count = n if i == steps else max(1, int(round((i / steps) * n)))
        t0 = start_s + ((i - 1) / steps) * (type_end - start_s)
        t1 = end_s if i == steps else start_s + (i / steps) * (type_end - start_s)
        if t1 > t0:
            slices.append((t0, t1, text[:char_count]))
    return slices


def compile_title_filter(
    title_overlay: TitleOverlayParams | dict[str, Any],
    *,
    fontfile: Path | str | None = None,
    pix_fmt: str | None = None,
) -> str:
    """Compile a validated TitleOverlayParams into an FFmpeg drawbox + drawtext filtergraph."""
    params = _coerce_title_params(title_overlay)
    if pix_fmt is not None and pix_fmt not in ALLOWED_TITLE_PIX_FMTS:
        raise ValueError(f"Unsupported pixel format {pix_fmt!r}")

    if not params.is_active():
        return ""

    font_opt = _resolve_font_option(fontfile)
    clean_title = sanitize_title_text(params.title)
    clean_sub = sanitize_title_text(params.subtitle)
    clean_bug = sanitize_title_text(params.bug_badge)
    esc_title = escape_ffmpeg_drawtext_text(clean_title) if clean_title else ""
    esc_sub = escape_ffmpeg_drawtext_text(clean_sub) if clean_sub else ""
    esc_bug = escape_ffmpeg_drawtext_text(clean_bug) if clean_bug else ""
    accent = _hex_to_ffmpeg_color(params.accent_color)
    enable_expr = f"enable='between(t,{params.start_s:.3f},{params.end_s:.3f})'"

    # Scale user font_size relative to a 1080p reference raster so 720p/1080p/4K stay proportional.
    title_h_ratio = params.font_size / 1080.0
    sub_h_ratio = max(12.0, params.font_size * 0.64) / 1080.0
    title_fs = f"max(14,round(h*{title_h_ratio:.5f}))"
    sub_fs = f"max(11,round(h*{sub_h_ratio:.5f}))"

    filters: list[str] = []

    if _is_legacy_static_title(params):
        if params.position == "bottom-left":
            if params.box_opacity > 0.0:
                filters.append(
                    f"drawbox=x=round(iw*0.05):y=round(ih*0.76):w=round(iw*0.46):h=round(ih*0.14):"
                    f"color=0x141416@{params.box_opacity:.2f}:t=fill:{enable_expr}"
                )
            filters.append(
                f"drawbox=x=round(iw*0.05):y=round(ih*0.76):w='max(4,round(iw*0.004))':"
                f"h=round(ih*0.14):color={accent}@1.00:t=fill:{enable_expr}"
            )
            if esc_title and esc_sub:
                title_y = "round(h*0.782)"
                sub_y = "round(h*0.838)"
            else:
                title_y = "round(h*0.830-th/2)"
                sub_y = "round(h*0.830-th/2)"
            if esc_title:
                filters.append(
                    f"drawtext={font_opt}expansion=none:text='{esc_title}':"
                    f"x=round(w*0.068):y={title_y}:fontsize='{title_fs}':"
                    f"fontcolor=0xd8d8de:shadowcolor=0x000000@0.70:shadowx=1:shadowy=1:{enable_expr}"
                )
            if esc_sub:
                filters.append(
                    f"drawtext={font_opt}expansion=none:text='{esc_sub}':"
                    f"x=round(w*0.068):y={sub_y}:fontsize='{sub_fs}':"
                    f"fontcolor={accent}:shadowcolor=0x000000@0.70:shadowx=1:shadowy=1:{enable_expr}"
                )
        elif params.position == "center":
            if params.box_opacity > 0.0:
                filters.append(
                    f"drawbox=x=round(iw*0.14):y=round(ih*0.34):w=round(iw*0.72):h=round(ih*0.32):"
                    f"color=0x141416@{params.box_opacity:.2f}:t=fill:{enable_expr}"
                )
            filters.append(
                f"drawbox=x=round(iw*0.42):y=round(ih*0.34):w=round(iw*0.16):"
                f"h='max(3,round(ih*0.004))':color={accent}@1.00:t=fill:{enable_expr}"
            )
            if esc_title and esc_sub:
                title_y = "round(h*0.455-th/2)"
                sub_y = "round(h*0.560-th/2)"
            else:
                title_y = "(h-th)/2"
                sub_y = "(h-th)/2"
            if esc_title:
                filters.append(
                    f"drawtext={font_opt}expansion=none:text='{esc_title}':"
                    f"x=(w-tw)/2:y={title_y}:fontsize='{title_fs}':"
                    f"fontcolor=0xd8d8de:shadowcolor=0x000000@0.75:shadowx=1:shadowy=1:{enable_expr}"
                )
            if esc_sub:
                filters.append(
                    f"drawtext={font_opt}expansion=none:text='{esc_sub}':"
                    f"x=(w-tw)/2:y={sub_y}:fontsize='{sub_fs}':"
                    f"fontcolor={accent}:shadowcolor=0x000000@0.75:shadowx=1:shadowy=1:{enable_expr}"
                )
        else:
            if params.box_opacity > 0.0:
                filters.append(
                    f"drawbox=x=round(iw*0.16):y=round(ih*0.81):w=round(iw*0.68):h=round(ih*0.11):"
                    f"color=0x141416@{params.box_opacity:.2f}:t=fill:{enable_expr}"
                )
            filters.append(
                f"drawbox=x=round(iw*0.44):y=round(ih*0.916):w=round(iw*0.12):"
                f"h='max(2,round(ih*0.003))':color={accent}@1.00:t=fill:{enable_expr}"
            )
            if esc_title and esc_sub:
                title_y = "round(h*0.842-th/2)"
                sub_y = "round(h*0.885-th/2)"
            else:
                title_y = "round(h*0.862-th/2)"
                sub_y = "round(h*0.862-th/2)"
            if esc_title:
                filters.append(
                    f"drawtext={font_opt}expansion=none:text='{esc_title}':"
                    f"x=(w-tw)/2:y={title_y}:fontsize='{title_fs}':"
                    f"fontcolor=0xd8d8de:shadowcolor=0x000000@0.70:shadowx=1:shadowy=1:{enable_expr}"
                )
            if esc_sub:
                filters.append(
                    f"drawtext={font_opt}expansion=none:text='{esc_sub}':"
                    f"x=(w-tw)/2:y={sub_y}:fontsize='{sub_fs}':"
                    f"fontcolor={accent}:shadowcolor=0x000000@0.70:shadowx=1:shadowy=1:{enable_expr}"
                )

        if pix_fmt is not None:
            filters.append(f"format={pix_fmt}")
        return ",".join(filters)

    # Motion Graphics & Text+ Studio compiler path
    box_x, box_y, box_w, box_h, align = _resolve_motion_anchor_box(params)
    if params.plate_style == "solid_bar":
        if params.box_opacity > 0.0:
            filters.append(
                f"drawbox=x=round(iw*{box_x:.4f}):y=round(ih*{box_y:.4f}):"
                f"w=round(iw*{box_w:.4f}):h=round(ih*{box_h:.4f}):"
                f"color=0x141416@{params.box_opacity:.2f}:t=fill:{enable_expr}"
            )
        if align == "left":
            filters.append(
                f"drawbox=x=round(iw*{box_x:.4f}):y=round(ih*{box_y:.4f}):"
                f"w='max(4,round(iw*0.004))':h=round(ih*{box_h:.4f}):"
                f"color={accent}@1.00:t=fill:{enable_expr}"
            )
        else:
            rule_x = box_x + box_w * 0.35
            rule_w = box_w * 0.30
            filters.append(
                f"drawbox=x=round(iw*{rule_x:.4f}):y=round(ih*{box_y:.4f}):"
                f"w=round(iw*{rule_w:.4f}):h='max(3,round(ih*0.004))':"
                f"color={accent}@1.00:t=fill:{enable_expr}"
            )
    elif params.plate_style == "glass_pill":
        if params.box_opacity > 0.0:
            filters.append(
                f"drawbox=x=round(iw*{box_x:.4f}):y=round(ih*{box_y:.4f}):"
                f"w=round(iw*{box_w:.4f}):h=round(ih*{box_h:.4f}):"
                f"color=0x161820@{params.box_opacity:.2f}:t=fill:{enable_expr}"
            )
        filters.append(
            f"drawbox=x=round(iw*{box_x:.4f}):y=round(ih*{box_y:.4f}):"
            f"w=round(iw*{box_w:.4f}):h='max(2,round(ih*0.003))':"
            f"color={accent}@0.95:t=fill:{enable_expr}"
        )
    elif params.plate_style == "outline_frame":
        if params.box_opacity > 0.0:
            fill_alpha = max(0.14, params.box_opacity * 0.50)
            filters.append(
                f"drawbox=x=round(iw*{box_x:.4f}):y=round(ih*{box_y:.4f}):"
                f"w=round(iw*{box_w:.4f}):h=round(ih*{box_h:.4f}):"
                f"color=0x111217@{fill_alpha:.2f}:t=fill:{enable_expr}"
            )
        filters.append(
            f"drawbox=x=round(iw*{box_x:.4f}):y=round(ih*{box_y:.4f}):"
            f"w=round(iw*{box_w:.4f}):h=round(ih*{box_h:.4f}):"
            f"color={accent}@0.95:t=3:{enable_expr}"
        )

    if esc_bug:
        bug_w = min(0.14, max(0.06, 0.02 + len(clean_bug) * 0.009))
        bug_h = 0.036
        bug_x = box_x if align == "left" else max(0.02, box_x + (box_w - bug_w) * 0.5)
        bug_y = max(0.015, box_y - bug_h - 0.006)
        bug_fs = "max(11,round(h*0.017))"
        filters.append(
            f"drawbox=x=round(iw*{bug_x:.4f}):y=round(ih*{bug_y:.4f}):"
            f"w=round(iw*{bug_w:.4f}):h=round(ih*{bug_h:.4f}):"
            f"color={accent}@0.96:t=fill:{enable_expr}"
        )
        filters.append(
            f"drawtext={font_opt}expansion=none:text='{esc_bug}':"
            f"x=round(w*{bug_x + bug_w * 0.5:.4f}-tw/2):"
            f"y=round(h*{bug_y + bug_h * 0.5:.4f}-th/2):"
            f"fontsize='{bug_fs}':fontcolor=0x111216:{enable_expr}"
        )

    base_tx = (
        f"w*{(box_x + 0.018):.4f}"
        if align == "left"
        else f"(w*{(box_x + box_w * 0.5):.4f}-tw/2)"
    )

    if esc_title and esc_sub:
        base_title_y = f"(h*{(box_y + box_h * 0.36):.4f}-th/2)"
        base_sub_y = f"(h*{(box_y + box_h * 0.72):.4f}-th/2)"
    else:
        base_title_y = f"(h*{(box_y + box_h * 0.5):.4f}-th/2)"
        base_sub_y = f"(h*{(box_y + box_h * 0.5):.4f}-th/2)"

    stroke_opt = ""
    if params.stroke_width > 0:
        stroke_col = _hex_to_ffmpeg_color(params.stroke_color)
        stroke_opt = f":borderw={params.stroke_width}:bordercolor={stroke_col}"
    shadow_opt = (
        f":shadowcolor=0x000000@0.75:shadowx={params.shadow_depth}:shadowy={params.shadow_depth}"
    )
    alpha_expr = _build_motion_alpha_expr(params)
    alpha_opt = f":alpha='{alpha_expr}'" if params.animation_curve != "none" else ""

    if params.animation_curve == "typewriter":
        if clean_title:
            for t0, t1, prefix in _typewriter_slices(
                clean_title, params.start_s, params.anim_in_s, params.end_s
            ):
                esc_slice = escape_ffmpeg_drawtext_text(prefix)
                filters.append(
                    f"drawtext={font_opt}expansion=none:text='{esc_slice}':"
                    f"x={base_tx}:y={base_title_y}:fontsize='{title_fs}':"
                    f"fontcolor=0xe8e9ee{stroke_opt}{shadow_opt}{alpha_opt}:"
                    f"enable='between(t,{t0:.3f},{t1:.3f})'"
                )
        if clean_sub:
            sub_start = min(params.end_s - 0.05, params.start_s + params.anim_in_s * 0.35)
            sub_in = max(0.05, params.anim_in_s * 0.65)
            for t0, t1, prefix in _typewriter_slices(clean_sub, sub_start, sub_in, params.end_s):
                esc_slice = escape_ffmpeg_drawtext_text(prefix)
                filters.append(
                    f"drawtext={font_opt}expansion=none:text='{esc_slice}':"
                    f"x={base_tx}:y={base_sub_y}:fontsize='{sub_fs}':"
                    f"fontcolor={accent}{stroke_opt}{shadow_opt}{alpha_opt}:"
                    f"enable='between(t,{t0:.3f},{t1:.3f})'"
                )
    else:
        if esc_title:
            tx_expr, ty_expr = _build_motion_xy_exprs(params, base_tx, base_title_y)
            filters.append(
                f"drawtext={font_opt}expansion=none:text='{esc_title}':"
                f"x='{tx_expr}':y='{ty_expr}':fontsize='{title_fs}':"
                f"fontcolor=0xe8e9ee{stroke_opt}{shadow_opt}{alpha_opt}:{enable_expr}"
            )
        if esc_sub:
            sx_expr, sy_expr = _build_motion_xy_exprs(params, base_tx, base_sub_y)
            filters.append(
                f"drawtext={font_opt}expansion=none:text='{esc_sub}':"
                f"x='{sx_expr}':y='{sy_expr}':fontsize='{sub_fs}':"
                f"fontcolor={accent}{stroke_opt}{shadow_opt}{alpha_opt}:{enable_expr}"
            )

    if pix_fmt is not None:
        filters.append(f"format={pix_fmt}")
    return ",".join(filters)


def compile_title_overlay(
    title_overlay: TitleOverlayParams | dict[str, Any],
    *,
    fontfile: Path | str | None = None,
    pix_fmt: str | None = None,
) -> TitleCompileResult:
    """Compile TitleOverlayParams into a structured FFmpeg filtergraph result."""
    params = _coerce_title_params(title_overlay)
    fg = compile_title_filter(params, fontfile=fontfile, pix_fmt=pix_fmt)
    clean_title = sanitize_title_text(params.title)
    clean_sub = sanitize_title_text(params.subtitle)
    clean_bug = sanitize_title_text(params.bug_badge)
    return TitleCompileResult(
        filtergraph=fg,
        ffmpeg_vf_args=["-vf", fg] if fg else [],
        is_active=params.is_active(),
        escaped_title=escape_ffmpeg_drawtext_text(clean_title) if clean_title else "",
        escaped_subtitle=escape_ffmpeg_drawtext_text(clean_sub) if clean_sub else "",
        escaped_bug_badge=escape_ffmpeg_drawtext_text(clean_bug) if clean_bug else "",
        animation_curve=params.animation_curve,
        plate_style=params.plate_style,
        has_motion=params.animation_curve != "none",
        params=params,
    )
