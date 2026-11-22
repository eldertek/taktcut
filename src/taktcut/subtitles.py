"""Safe SRT & WebVTT caption parser/exporter and FFmpeg drawtext burn-in compiler."""

from __future__ import annotations

import math
import re
from collections.abc import Sequence
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from taktcut.titles import (
    ALLOWED_TITLE_PIX_FMTS,
    _resolve_font_option,
    escape_ffmpeg_drawtext_text,
)

CaptionStyleId = Literal["clean_white", "yellow_broadcast", "boxed_social"]

CAPTION_STYLE_IDS: tuple[CaptionStyleId, ...] = (
    "clean_white",
    "yellow_broadcast",
    "boxed_social",
)

CAPTION_MAX_CUES: int = 500
CAPTION_MAX_TEXT_LEN: int = 300
CAPTION_MAX_INPUT_BYTES: int = 512 * 1024
CAPTION_TIME_MAX_S: float = 86400.0
CAPTION_FONT_SIZE_MIN: int = 14
CAPTION_FONT_SIZE_MAX: int = 72
CAPTION_MARGIN_BOTTOM_MIN: float = 0.02
CAPTION_MARGIN_BOTTOM_MAX: float = 0.45

_SRT_TS_RE = re.compile(r"^(\d{2,3}):([0-5]\d):([0-5]\d),(\d{3})$")
_VTT_TS_RE = re.compile(r"^(?:(\d{2,3}):)?([0-5]\d):([0-5]\d)\.(\d{3})$")
_SCRIPT_STYLE_BLOCK_RE = re.compile(
    r"<\s*(script|style)\b[^>]*>[\s\S]*?<\s*/\s*\1\s*>",
    re.IGNORECASE,
)
_HTML_TAG_RE = re.compile(r"<[^>\n]{0,512}>")
_ANY_TAG_RE = re.compile(r"<[^>]{0,512}>")


class CaptionStyleSpec(BaseModel):
    """Built-in broadcast and social caption burn-in style."""

    id: CaptionStyleId
    name: str
    description: str
    font_color: str
    box_color: str
    box_opacity: float
    border_w: int
    default_font_size: int
    bold: bool


CAPTION_STYLES: tuple[CaptionStyleSpec, ...] = (
    CaptionStyleSpec(
        id="clean_white",
        name="Clean White",
        description="Crisp white captions with black edge outline and drop shadow.",
        font_color="#ffffff",
        box_color="#000000",
        box_opacity=0.0,
        border_w=2,
        default_font_size=34,
        bold=False,
    ),
    CaptionStyleSpec(
        id="yellow_broadcast",
        name="Yellow Broadcast",
        description="Traditional broadcast yellow captions with subtle dark plate and shadow.",
        font_color="#ffe047",
        box_color="#0c0c0e",
        box_opacity=0.55,
        border_w=2,
        default_font_size=34,
        bold=True,
    ),
    CaptionStyleSpec(
        id="boxed_social",
        name="Boxed Social",
        description="High-contrast bold white captions on a solid dark social pill box.",
        font_color="#ffffff",
        box_color="#141416",
        box_opacity=0.86,
        border_w=0,
        default_font_size=38,
        bold=True,
    ),
)


def list_caption_styles() -> tuple[CaptionStyleSpec, ...]:
    """Return all built-in caption burn-in styles."""
    return CAPTION_STYLES


def get_caption_style(style_id: str) -> CaptionStyleSpec:
    """Look up a built-in caption style by id or case-insensitive name."""
    cleaned = style_id.strip().lower()
    for spec in CAPTION_STYLES:
        if spec.id == cleaned or spec.name.lower() == cleaned:
            return spec
    raise ValueError(f"Unknown caption style: {style_id!r}")


def _validate_finite_float(
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


def sanitize_caption_text(raw: str) -> str:
    """Strip HTML/script markup and control characters from subtitle cue text."""
    if not isinstance(raw, str):
        raise ValueError("Caption text must be a string")

    cur = raw.replace("\r\n", "\n").replace("\r", "\n").replace("\t", " ")

    # Iteratively strip script/style blocks and HTML tags so nested markup cannot survive.
    for _ in range(8):
        nxt = _SCRIPT_STYLE_BLOCK_RE.sub("", cur)
        nxt = _HTML_TAG_RE.sub("", nxt)
        nxt = _ANY_TAG_RE.sub("", nxt)
        if nxt == cur:
            break
        cur = nxt

    # Remove any unclosed angle brackets to guarantee zero HTML tag injection.
    cur = cur.replace("<", "").replace(">", "")

    cleaned_chars: list[str] = []
    for ch in cur:
        code = ord(ch)
        if ch == "\n":
            cleaned_chars.append(ch)
        elif code < 32 or code == 127 or (0x80 <= code <= 0x9F):
            cleaned_chars.append(" ")
        else:
            cleaned_chars.append(ch)

    normalized_lines: list[str] = []
    for line in "".join(cleaned_chars).split("\n"):
        collapsed = " ".join(line.split()).strip()
        if collapsed:
            normalized_lines.append(collapsed)
    return "\n".join(normalized_lines)


def parse_srt_timestamp(raw: str) -> float:
    """Strictly parse an SRT timestamp (HH:MM:SS,mmm) into seconds."""
    if not isinstance(raw, str):
        raise ValueError("SRT timestamp must be a string")
    match = _SRT_TS_RE.match(raw.strip())
    if not match:
        raise ValueError(f"Invalid SRT timestamp: {raw!r} (expected HH:MM:SS,mmm)")
    hours = int(match.group(1))
    minutes = int(match.group(2))
    seconds = int(match.group(3))
    millis = int(match.group(4))
    total = hours * 3600.0 + minutes * 60.0 + seconds + millis / 1000.0
    if total > CAPTION_TIME_MAX_S:
        raise ValueError(f"SRT timestamp exceeds {CAPTION_TIME_MAX_S}s limit: {raw!r}")
    return round(total, 3)


def parse_vtt_timestamp(raw: str) -> float:
    """Strictly parse a WebVTT timestamp (HH:MM:SS.mmm or MM:SS.mmm) into seconds."""
    if not isinstance(raw, str):
        raise ValueError("VTT timestamp must be a string")
    match = _VTT_TS_RE.match(raw.strip())
    if not match:
        raise ValueError(
            f"Invalid VTT timestamp: {raw!r} (expected HH:MM:SS.mmm or MM:SS.mmm)"
        )
    hours = int(match.group(1)) if match.group(1) is not None else 0
    minutes = int(match.group(2))
    seconds = int(match.group(3))
    millis = int(match.group(4))
    total = hours * 3600.0 + minutes * 60.0 + seconds + millis / 1000.0
    if total > CAPTION_TIME_MAX_S:
        raise ValueError(f"VTT timestamp exceeds {CAPTION_TIME_MAX_S}s limit: {raw!r}")
    return round(total, 3)


def format_srt_timestamp(seconds: float) -> str:
    """Format seconds into canonical SRT timestamp (HH:MM:SS,mmm)."""
    val = _validate_finite_float(seconds, "timestamp_s", 0.0, CAPTION_TIME_MAX_S)
    total_ms = round(val * 1000.0)
    hours, rem = divmod(total_ms, 3_600_000)
    minutes, rem = divmod(rem, 60_000)
    secs, millis = divmod(rem, 1_000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def format_vtt_timestamp(seconds: float) -> str:
    """Format seconds into canonical WebVTT timestamp (HH:MM:SS.mmm)."""
    val = _validate_finite_float(seconds, "timestamp_s", 0.0, CAPTION_TIME_MAX_S)
    total_ms = round(val * 1000.0)
    hours, rem = divmod(total_ms, 3_600_000)
    minutes, rem = divmod(rem, 60_000)
    secs, millis = divmod(rem, 1_000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


class SubtitleCue(BaseModel):
    """Single validated subtitle cue with safe plain-text content."""

    index: int = Field(default=1, ge=1)
    start_s: float
    end_s: float
    text: str

    @field_validator("start_s", "end_s", mode="before")
    @classmethod
    def _validate_time_s(cls, raw: Any, info: Any) -> float:
        return _validate_finite_float(raw, str(info.field_name), 0.0, CAPTION_TIME_MAX_S)

    @field_validator("text", mode="before")
    @classmethod
    def _validate_text(cls, raw: Any) -> str:
        if not isinstance(raw, str):
            raise ValueError("Cue text must be a string")
        if len(raw) > CAPTION_MAX_TEXT_LEN * 2:
            raise ValueError(
                f"Raw cue text exceeds maximum allowed buffer ({CAPTION_MAX_TEXT_LEN * 2} chars)"
            )
        cleaned = sanitize_caption_text(raw)
        if not cleaned:
            raise ValueError("Cue text cannot be empty after sanitization")
        if len(cleaned) > CAPTION_MAX_TEXT_LEN:
            raise ValueError(
                f"Cue text exceeds maximum length of {CAPTION_MAX_TEXT_LEN} characters"
            )
        return cleaned

    @model_validator(mode="after")
    def _validate_window(self) -> SubtitleCue:
        if self.end_s <= self.start_s:
            raise ValueError(
                f"Cue end_s ({self.end_s}) must be strictly greater than start_s ({self.start_s})"
            )
        return self


class SubtitleTrackParams(BaseModel):
    """Caption track and burn-in styling parameters."""

    cues: list[SubtitleCue] = Field(default_factory=list)
    style: CaptionStyleId = "clean_white"
    font_size: int = 34
    margin_bottom_pct: float = 0.08
    enabled: bool = True

    @field_validator("cues")
    @classmethod
    def _validate_cue_count(cls, cues: list[SubtitleCue]) -> list[SubtitleCue]:
        if len(cues) > CAPTION_MAX_CUES:
            raise ValueError(f"Subtitle track exceeds maximum of {CAPTION_MAX_CUES} cues")
        return [
            cue.model_copy(update={"index": idx})
            for idx, cue in enumerate(cues, start=1)
        ]

    @field_validator("font_size", mode="before")
    @classmethod
    def _validate_font_size(cls, raw: Any) -> int:
        if isinstance(raw, bool) or not isinstance(raw, int | float):
            raise ValueError(f"font_size must be an integer, got {raw!r}")
        val = int(round(float(raw)))
        if val < CAPTION_FONT_SIZE_MIN or val > CAPTION_FONT_SIZE_MAX:
            raise ValueError(
                f"font_size must be in [{CAPTION_FONT_SIZE_MIN}, {CAPTION_FONT_SIZE_MAX}], "
                f"got {val}"
            )
        return val

    @field_validator("margin_bottom_pct", mode="before")
    @classmethod
    def _validate_margin(cls, raw: Any) -> float:
        return _validate_finite_float(
            raw,
            "margin_bottom_pct",
            CAPTION_MARGIN_BOTTOM_MIN,
            CAPTION_MARGIN_BOTTOM_MAX,
        )

    def is_active(self) -> bool:
        """Return True when enabled and at least one cue is present."""
        return self.enabled and len(self.cues) > 0


class SubtitleCompileResult(BaseModel):
    """Compiled FFmpeg drawtext caption burn-in filtergraph and metadata."""

    filtergraph: str
    ffmpeg_vf_args: list[str] = Field(default_factory=list)
    is_active: bool
    cue_count: int
    style: CaptionStyleId
    escaped_cues: list[str] = Field(default_factory=list)


def _prepare_raw_subtitle_input(raw: str, *, format_label: str) -> str:
    if not isinstance(raw, str):
        raise ValueError(f"{format_label} input must be a string")
    if len(raw.encode("utf-8")) > CAPTION_MAX_INPUT_BYTES:
        raise ValueError(
            f"{format_label} input exceeds maximum size of {CAPTION_MAX_INPUT_BYTES} bytes"
        )
    text = raw.lstrip("\ufeff").replace("\r\n", "\n").replace("\r", "\n")
    return text


def parse_srt(raw: str) -> list[SubtitleCue]:
    """Parse and strictly validate an SRT caption payload into safe SubtitleCue objects."""
    text = _prepare_raw_subtitle_input(raw, format_label="SRT")
    stripped = text.strip()
    if not stripped:
        raise ValueError("SRT input is empty")

    blocks = re.split(r"\n[ \t]*\n+", stripped)
    cues: list[SubtitleCue] = []
    for block_idx, block in enumerate(blocks, start=1):
        lines = [ln.rstrip() for ln in block.split("\n") if ln.strip() != ""]
        if len(lines) < 3:
            raise ValueError(
                f"SRT block #{block_idx} must contain cue index, timing line, and text"
            )
        idx_line = lines[0].strip()
        if not idx_line.isdigit() or int(idx_line) < 1:
            raise ValueError(f"SRT block #{block_idx} has invalid cue index: {idx_line!r}")

        timing_line = lines[1].strip()
        if timing_line.count("-->") != 1:
            raise ValueError(f"SRT block #{block_idx} has invalid timing line: {timing_line!r}")
        raw_start, raw_end = timing_line.split("-->", 1)
        start_s = parse_srt_timestamp(raw_start)
        end_s = parse_srt_timestamp(raw_end)
        if end_s <= start_s:
            raise ValueError(
                f"SRT block #{block_idx} end time ({end_s}) must exceed start time ({start_s})"
            )

        cue_text = "\n".join(lines[2:])
        cue = SubtitleCue(
            index=len(cues) + 1,
            start_s=start_s,
            end_s=end_s,
            text=cue_text,
        )
        cues.append(cue)
        if len(cues) > CAPTION_MAX_CUES:
            raise ValueError(f"SRT exceeds maximum of {CAPTION_MAX_CUES} cues")

    return cues


def parse_vtt(raw: str) -> list[SubtitleCue]:
    """Parse and strictly validate a WebVTT caption payload into safe SubtitleCue objects."""
    text = _prepare_raw_subtitle_input(raw, format_label="WebVTT")
    stripped = text.strip()
    if not stripped:
        raise ValueError("WebVTT input is empty")

    blocks = re.split(r"\n[ \t]*\n+", stripped)
    header_lines = blocks[0].split("\n")
    first_line = header_lines[0].strip()
    if first_line != "WEBVTT" and not first_line.startswith(("WEBVTT ", "WEBVTT\t")):
        raise ValueError("Invalid WebVTT header: file must start with WEBVTT")

    cues: list[SubtitleCue] = []
    for block_idx, block in enumerate(blocks[1:], start=1):
        lines = [ln.rstrip() for ln in block.split("\n") if ln.strip() != ""]
        if not lines:
            continue
        head = lines[0].strip()
        if head == "NOTE" or head.startswith(("NOTE ", "NOTE\t")):
            continue
        if head in {"STYLE", "REGION"} or head.startswith(("STYLE ", "REGION ")):
            continue

        if "-->" in lines[0]:
            timing_idx = 0
        elif len(lines) >= 2 and "-->" in lines[1]:
            timing_idx = 1
        else:
            raise ValueError(f"WebVTT cue block #{block_idx} is missing timing line '-->'")

        timing_line = lines[timing_idx].strip()
        if timing_line.count("-->") != 1:
            raise ValueError(
                f"WebVTT cue block #{block_idx} has invalid timing line: {timing_line!r}"
            )
        raw_start, raw_end_and_settings = timing_line.split("-->", 1)
        end_parts = raw_end_and_settings.strip().split()
        if not end_parts:
            raise ValueError(f"WebVTT cue block #{block_idx} is missing end timestamp")
        raw_end = end_parts[0]

        start_s = parse_vtt_timestamp(raw_start)
        end_s = parse_vtt_timestamp(raw_end)
        if end_s <= start_s:
            raise ValueError(
                f"WebVTT cue #{block_idx} end time ({end_s}) must exceed start time ({start_s})"
            )

        text_lines = lines[timing_idx + 1 :]
        if not text_lines:
            raise ValueError(f"WebVTT cue block #{block_idx} has empty text")
        cue = SubtitleCue(
            index=len(cues) + 1,
            start_s=start_s,
            end_s=end_s,
            text="\n".join(text_lines),
        )
        cues.append(cue)
        if len(cues) > CAPTION_MAX_CUES:
            raise ValueError(f"WebVTT exceeds maximum of {CAPTION_MAX_CUES} cues")

    return cues


def _coerce_cues(cues: Sequence[SubtitleCue | dict[str, Any]]) -> list[SubtitleCue]:
    if len(cues) > CAPTION_MAX_CUES:
        raise ValueError(f"Subtitle track exceeds maximum of {CAPTION_MAX_CUES} cues")
    out: list[SubtitleCue] = []
    for idx, item in enumerate(cues, start=1):
        cue = (
            SubtitleCue.model_validate(item.model_dump())
            if isinstance(item, SubtitleCue)
            else SubtitleCue.model_validate(item)
        )
        out.append(cue.model_copy(update={"index": idx}))
    return out


def export_srt(cues: Sequence[SubtitleCue | dict[str, Any]]) -> str:
    """Serialize validated SubtitleCue items into clean SRT format."""
    validated = _coerce_cues(cues)
    if not validated:
        return ""
    blocks = [
        f"{cue.index}\n{format_srt_timestamp(cue.start_s)} --> "
        f"{format_srt_timestamp(cue.end_s)}\n{cue.text}"
        for cue in validated
    ]
    return "\n\n".join(blocks) + "\n"


def export_vtt(cues: Sequence[SubtitleCue | dict[str, Any]]) -> str:
    """Serialize validated SubtitleCue items into clean WebVTT format."""
    validated = _coerce_cues(cues)
    if not validated:
        return "WEBVTT\n\n"
    blocks = [
        f"{cue.index}\n{format_vtt_timestamp(cue.start_s)} --> "
        f"{format_vtt_timestamp(cue.end_s)}\n{cue.text}"
        for cue in validated
    ]
    return "WEBVTT\n\n" + "\n\n".join(blocks) + "\n"


def _coerce_track_params(
    track: SubtitleTrackParams | dict[str, Any] | Sequence[SubtitleCue | dict[str, Any]],
    *,
    style: CaptionStyleId | None = None,
) -> SubtitleTrackParams:
    if isinstance(track, SubtitleTrackParams):
        params = SubtitleTrackParams.model_validate(track.model_dump())
    elif isinstance(track, dict):
        params = SubtitleTrackParams.model_validate(track)
    else:
        params = SubtitleTrackParams(cues=_coerce_cues(track))

    if style is not None:
        params = params.model_copy(update={"style": style})
        SubtitleTrackParams.model_validate(params.model_dump())
    return params


def _hex_to_ffmpeg_color(hex_color: str) -> str:
    return f"0x{hex_color[1:].lower()}"


def compile_subtitles_filter(
    track: SubtitleTrackParams | dict[str, Any] | Sequence[SubtitleCue | dict[str, Any]],
    *,
    style: CaptionStyleId | None = None,
    fontfile: Path | str | None = None,
    pix_fmt: str | None = None,
) -> str:
    """Compile validated subtitle cues into an injection-safe FFmpeg drawtext filtergraph."""
    params = _coerce_track_params(track, style=style)
    if pix_fmt is not None and pix_fmt not in ALLOWED_TITLE_PIX_FMTS:
        raise ValueError(f"Unsupported pixel format {pix_fmt!r}")

    if not params.is_active():
        return ""

    spec = get_caption_style(params.style)
    font_opt = _resolve_font_option(fontfile)
    font_color = _hex_to_ffmpeg_color(spec.font_color)
    box_color = _hex_to_ffmpeg_color(spec.box_color)

    fs_ratio = params.font_size / 1080.0
    fs_expr = f"max(14,round(h*{fs_ratio:.5f}))"
    line_step_ratio = (params.font_size * 1.38) / 1080.0
    bottom_y_ratio = 1.0 - params.margin_bottom_pct

    style_opts: list[str] = [f"fontcolor={font_color}"]
    if spec.border_w > 0:
        style_opts.append(f"borderw={spec.border_w}:bordercolor=0x000000@0.80")
    if spec.box_opacity > 0.0:
        box_border = 12 if spec.id == "boxed_social" else 8
        style_opts.append(
            f"box=1:boxcolor={box_color}@{spec.box_opacity:.2f}:boxborderw={box_border}"
        )
    style_opts.append("shadowcolor=0x000000@0.85:shadowx=1:shadowy=1")
    style_str = ":".join(style_opts)

    filters: list[str] = []
    for cue in params.cues:
        lines = [ln for ln in sanitize_caption_text(cue.text).split("\n") if ln]
        if not lines:
            continue
        enable_expr = f"enable='between(t,{cue.start_s:.3f},{cue.end_s:.3f})'"
        total_lines = len(lines)
        for idx, line in enumerate(lines):
            escaped_line = escape_ffmpeg_drawtext_text(line)
            offset_from_bottom = (total_lines - 1 - idx) * line_step_ratio
            y_ratio = max(0.05, bottom_y_ratio - offset_from_bottom)
            filters.append(
                f"drawtext={font_opt}expansion=none:text='{escaped_line}':"
                f"x=(w-tw)/2:y=round(h*{y_ratio:.4f}-th):fontsize='{fs_expr}':"
                f"{style_str}:{enable_expr}"
            )

    if not filters:
        return ""
    if pix_fmt is not None:
        filters.append(f"format={pix_fmt}")
    return ",".join(filters)


def compile_subtitles(
    track: SubtitleTrackParams | dict[str, Any] | Sequence[SubtitleCue | dict[str, Any]],
    *,
    style: CaptionStyleId | None = None,
    fontfile: Path | str | None = None,
    pix_fmt: str | None = None,
) -> SubtitleCompileResult:
    """Compile subtitle cues into a structured FFmpeg filtergraph result."""
    params = _coerce_track_params(track, style=style)
    fg = compile_subtitles_filter(params, fontfile=fontfile, pix_fmt=pix_fmt)
    escaped_cues = [
        escape_ffmpeg_drawtext_text(cue.text.replace("\n", " "))
        for cue in params.cues
    ]
    return SubtitleCompileResult(
        filtergraph=fg,
        ffmpeg_vf_args=["-vf", fg] if fg else [],
        is_active=params.is_active(),
        cue_count=len(params.cues),
        style=params.style,
        escaped_cues=escaped_cues,
    )
