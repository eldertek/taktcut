"""Titles & Lower-Thirds generator and safe FFmpeg drawtext + drawbox compiler."""

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

TITLE_POSITIONS: tuple[TitlePosition, ...] = ("bottom-left", "center", "bottom-center")
ALLOWED_TITLE_PIX_FMTS: frozenset[str] = frozenset(
    {"yuv420p", "yuv422p10le", "rgb24", "yuv444p"}
)

TITLE_MAX_LEN: int = 200
TITLE_TIME_MAX_S: float = 86400.0
TITLE_FONT_SIZE_MIN: int = 14
TITLE_FONT_SIZE_MAX: int = 96

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
    """Parameters for a Broadcast Title or Lower-Third graphic overlay."""

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

    @field_validator("accent_color", mode="before")
    @classmethod
    def _validate_accent_color(cls, raw: Any) -> str:
        if not isinstance(raw, str) or not _HEX_COLOR_RE.match(raw.strip()):
            raise ValueError(f"accent_color must be #RRGGBB hex, got {raw!r}")
        return raw.strip().lower()

    @field_validator("start_s", "end_s", mode="before")
    @classmethod
    def _validate_time_s(cls, raw: Any, info: Any) -> float:
        return _validate_finite_float(raw, str(info.field_name), 0.0, TITLE_TIME_MAX_S)

    @field_validator("box_opacity", mode="before")
    @classmethod
    def _validate_box_opacity(cls, raw: Any) -> float:
        return _validate_finite_float(raw, "box_opacity", 0.0, 1.0)

    @field_validator("font_size", mode="before")
    @classmethod
    def _validate_font_size(cls, raw: Any) -> int:
        if isinstance(raw, bool) or not isinstance(raw, (int, float)):
            raise ValueError(f"font_size must be an integer, got {raw!r}")
        val = int(round(float(raw)))
        if val < TITLE_FONT_SIZE_MIN or val > TITLE_FONT_SIZE_MAX:
            raise ValueError(
                f"font_size must be in [{TITLE_FONT_SIZE_MIN}, {TITLE_FONT_SIZE_MAX}], got {val}"
            )
        return val

    @model_validator(mode="after")
    def _validate_time_window(self) -> TitleOverlayParams:
        if self.end_s <= self.start_s:
            raise ValueError(
                f"end_s ({self.end_s}) must be strictly greater than start_s ({self.start_s})"
            )
        return self

    def is_active(self) -> bool:
        """Return True when enabled and at least one sanitized line of text is present."""
        if not self.enabled:
            return False
        return bool(sanitize_title_text(self.title) or sanitize_title_text(self.subtitle))


class TitlePreset(BaseModel):
    """Built-in broadcast title or lower-third template."""

    id: TitlePresetId
    name: str
    description: str
    params: TitleOverlayParams


class TitleCompileResult(BaseModel):
    """Compiled FFmpeg drawbox + drawtext filtergraph and sanitized metadata."""

    filtergraph: str
    ffmpeg_vf_args: list[str] = Field(default_factory=list)
    is_active: bool
    escaped_title: str
    escaped_subtitle: str
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
    esc_title = escape_ffmpeg_drawtext_text(clean_title) if clean_title else ""
    esc_sub = escape_ffmpeg_drawtext_text(clean_sub) if clean_sub else ""
    accent = _hex_to_ffmpeg_color(params.accent_color)
    enable_expr = f"enable='between(t,{params.start_s:.3f},{params.end_s:.3f})'"

    # Scale user font_size relative to a 1080p reference raster so 720p/1080p/4K stay proportional.
    title_h_ratio = params.font_size / 1080.0
    sub_h_ratio = max(12.0, params.font_size * 0.64) / 1080.0
    title_fs = f"max(14,round(h*{title_h_ratio:.5f}))"
    sub_fs = f"max(11,round(h*{sub_h_ratio:.5f}))"

    filters: list[str] = []
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
        # bottom-center
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
    return TitleCompileResult(
        filtergraph=fg,
        ffmpeg_vf_args=["-vf", fg] if fg else [],
        is_active=params.is_active(),
        escaped_title=escape_ffmpeg_drawtext_text(clean_title) if clean_title else "",
        escaped_subtitle=escape_ffmpeg_drawtext_text(clean_sub) if clean_sub else "",
        params=params,
    )
