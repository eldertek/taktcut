"""Safe SRT/WebVTT/ASS caption parser/exporter, word-level karaoke engine, and FFmpeg compiler."""

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

CaptionStyleId = Literal[
    "clean_white",
    "yellow_broadcast",
    "boxed_social",
    "netflix_clean",
    "social_karaoke",
    "broadcast_gold",
]
KaraokeMode = Literal["off", "color_pop", "pill_box", "progressive_fill"]
SafeMarginPresetId = Literal[
    "standard",
    "broadcast_action",
    "broadcast_title",
    "reels_tiktok",
    "upper_third",
    "custom",
]

CAPTION_STYLE_IDS: tuple[CaptionStyleId, ...] = (
    "clean_white",
    "yellow_broadcast",
    "boxed_social",
)
PRO_CAPTION_STYLE_IDS: tuple[CaptionStyleId, ...] = (
    "netflix_clean",
    "social_karaoke",
    "broadcast_gold",
)
ALL_CAPTION_STYLE_IDS: tuple[CaptionStyleId, ...] = CAPTION_STYLE_IDS + PRO_CAPTION_STYLE_IDS
KARAOKE_MODES: tuple[KaraokeMode, ...] = ("off", "color_pop", "pill_box", "progressive_fill")

SAFE_MARGIN_PRESETS: dict[SafeMarginPresetId, tuple[str, float]] = {
    "standard": ("Standard 8%", 0.08),
    "broadcast_action": ("Action Safe 5%", 0.05),
    "broadcast_title": ("Title Safe 10%", 0.10),
    "reels_tiktok": ("Reels / TikTok Safe 24%", 0.24),
    "upper_third": ("Upper Center 42%", 0.42),
    "custom": ("Custom Margin", 0.08),
}

CAPTION_MAX_CUES: int = 500
CAPTION_MAX_WORDS_PER_CUE: int = 80
CAPTION_MAX_WORD_LEN: int = 80
CAPTION_MAX_TEXT_LEN: int = 300
CAPTION_MAX_INPUT_BYTES: int = 512 * 1024
CAPTION_TIME_MAX_S: float = 86400.0
CAPTION_FONT_SIZE_MIN: int = 14
CAPTION_FONT_SIZE_MAX: int = 72
CAPTION_MARGIN_BOTTOM_MIN: float = 0.02
CAPTION_MARGIN_BOTTOM_MAX: float = 0.45
DEFAULT_HIGHLIGHT_COLOR: str = "#ffe047"

_HEX_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
_SRT_TS_RE = re.compile(r"^(\d{2,3}):([0-5]\d):([0-5]\d),(\d{3})$")
_VTT_TS_RE = re.compile(r"^(?:(\d{2,3}):)?([0-5]\d):([0-5]\d)\.(\d{3})$")
_ASS_TS_RE = re.compile(r"^(\d{1,2}):([0-5]\d):([0-5]\d)\.(\d{2})$")
_ASS_TAG_RE = re.compile(r"\{[^{}]{0,256}\}")
_ASS_KARAOKE_RE = re.compile(r"\{\\[kKfFoO]{1,2}(\d{1,6})\}([^\{]*)")
_SCRIPT_STYLE_BLOCK_RE = re.compile(
    r"<\s*(script|style)\b[^>]*>[\s\S]*?<\s*/\s*\1\s*>",
    re.IGNORECASE,
)
_HTML_TAG_RE = re.compile(r"<[^>\n]{0,512}>")
_ANY_TAG_RE = re.compile(r"<[^>]{0,512}>")


class CaptionStyleSpec(BaseModel):
    """Built-in broadcast, cinema, and social caption burn-in style."""

    id: CaptionStyleId
    name: str
    description: str
    font_color: str
    box_color: str
    box_opacity: float
    border_w: int
    default_font_size: int
    bold: bool
    highlight_color: str = DEFAULT_HIGHLIGHT_COLOR
    default_margin_bottom_pct: float = 0.08
    default_karaoke_mode: KaraokeMode = "off"
    default_uppercase: bool = False


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

PRO_CAPTION_STYLES: tuple[CaptionStyleSpec, ...] = (
    CaptionStyleSpec(
        id="netflix_clean",
        name="Netflix Clean",
        description=(
            "Cinema streaming subtitle style with crisp outline, soft shadow, and 10% safe margin."
        ),
        font_color="#ffffff",
        box_color="#000000",
        box_opacity=0.0,
        border_w=1,
        default_font_size=32,
        bold=False,
        highlight_color="#ffe047",
        default_margin_bottom_pct=0.10,
        default_karaoke_mode="off",
        default_uppercase=False,
    ),
    CaptionStyleSpec(
        id="social_karaoke",
        name="Social Karaoke Pop",
        description=(
            "High-retention Reels/Shorts word-pop karaoke style inside the 24% social safe zone."
        ),
        font_color="#ffffff",
        box_color="#141416",
        box_opacity=0.86,
        border_w=2,
        default_font_size=42,
        bold=True,
        highlight_color="#ffe047",
        default_margin_bottom_pct=0.24,
        default_karaoke_mode="color_pop",
        default_uppercase=True,
    ),
    CaptionStyleSpec(
        id="broadcast_gold",
        name="Broadcast Gold Safe",
        description="EBU/SMPTE title-safe gold caption plate with cyan karaoke accent.",
        font_color="#ffd54f",
        box_color="#0c0c0e",
        box_opacity=0.72,
        border_w=2,
        default_font_size=34,
        bold=True,
        highlight_color="#00e5ff",
        default_margin_bottom_pct=0.10,
        default_karaoke_mode="off",
        default_uppercase=False,
    ),
)


def list_caption_styles() -> tuple[CaptionStyleSpec, ...]:
    """Return the core caption burn-in styles."""
    return CAPTION_STYLES


def list_all_caption_styles() -> tuple[CaptionStyleSpec, ...]:
    """Return all core and pro broadcast/streaming/karaoke caption styles."""
    return CAPTION_STYLES + PRO_CAPTION_STYLES


def get_caption_style(style_id: str) -> CaptionStyleSpec:
    """Look up a built-in caption style by id or case-insensitive name."""
    cleaned = style_id.strip().lower()
    for spec in list_all_caption_styles():
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


def _validate_hex_color(raw: Any, field_name: str = "highlight_color") -> str:
    if not isinstance(raw, str) or not _HEX_COLOR_RE.match(raw.strip()):
        raise ValueError(f"{field_name} must be #RRGGBB hex, got {raw!r}")
    return raw.strip().lower()


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


def parse_ass_timestamp(raw: str) -> float:
    """Strictly parse an ASS timestamp (H:MM:SS.cc) into seconds."""
    if not isinstance(raw, str):
        raise ValueError("ASS timestamp must be a string")
    match = _ASS_TS_RE.match(raw.strip())
    if not match:
        raise ValueError(f"Invalid ASS timestamp: {raw!r} (expected H:MM:SS.cc)")
    hours = int(match.group(1))
    minutes = int(match.group(2))
    seconds = int(match.group(3))
    centis = int(match.group(4))
    total = hours * 3600.0 + minutes * 60.0 + seconds + centis / 100.0
    if total > CAPTION_TIME_MAX_S:
        raise ValueError(f"ASS timestamp exceeds {CAPTION_TIME_MAX_S}s limit: {raw!r}")
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


def format_ass_timestamp(seconds: float) -> str:
    """Format seconds into canonical ASS timestamp (H:MM:SS.cc)."""
    val = _validate_finite_float(seconds, "timestamp_s", 0.0, CAPTION_TIME_MAX_S)
    total_cs = round(val * 100.0)
    hours, rem = divmod(total_cs, 360_000)
    minutes, rem = divmod(rem, 6_000)
    secs, centis = divmod(rem, 100)
    return f"{hours:d}:{minutes:02d}:{secs:02d}.{centis:02d}"


class SubtitleWordTiming(BaseModel):
    """Single word timing slice inside a subtitle cue for karaoke highlight."""

    text: str
    start_s: float
    end_s: float

    @field_validator("start_s", "end_s", mode="before")
    @classmethod
    def _validate_word_time(cls, raw: Any, info: Any) -> float:
        return _validate_finite_float(raw, str(info.field_name), 0.0, CAPTION_TIME_MAX_S)

    @field_validator("text", mode="before")
    @classmethod
    def _validate_word_text(cls, raw: Any) -> str:
        if not isinstance(raw, str):
            raise ValueError("Word text must be a string")
        cleaned = sanitize_caption_text(raw).replace("\n", " ").strip()
        if not cleaned:
            raise ValueError("Word text cannot be empty after sanitization")
        if len(cleaned) > CAPTION_MAX_WORD_LEN:
            raise ValueError(f"Word text exceeds {CAPTION_MAX_WORD_LEN} chars")
        return cleaned

    @model_validator(mode="after")
    def _validate_word_window(self) -> SubtitleWordTiming:
        if self.end_s <= self.start_s:
            raise ValueError(
                f"Word end_s ({self.end_s}) must exceed start_s ({self.start_s})"
            )
        return self


class SubtitleCue(BaseModel):
    """Single validated subtitle cue with safe plain-text content and optional word timings."""

    index: int = Field(default=1, ge=1)
    start_s: float
    end_s: float
    text: str
    words: list[SubtitleWordTiming] = Field(default_factory=list)

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

    @field_validator("words")
    @classmethod
    def _validate_words_count(
        cls, words: list[SubtitleWordTiming]
    ) -> list[SubtitleWordTiming]:
        if len(words) > CAPTION_MAX_WORDS_PER_CUE:
            raise ValueError(
                f"Cue exceeds maximum of {CAPTION_MAX_WORDS_PER_CUE} word timings"
            )
        return words

    @model_validator(mode="after")
    def _validate_window(self) -> SubtitleCue:
        if self.end_s <= self.start_s:
            raise ValueError(
                f"Cue end_s ({self.end_s}) must be strictly greater than start_s ({self.start_s})"
            )
        return self


def compute_cue_word_timings(
    cue: SubtitleCue,
    *,
    uppercase: bool = False,
) -> list[SubtitleWordTiming]:
    """Return explicit word timings or deterministically split cue text proportionally by weight."""
    if cue.words:
        out: list[SubtitleWordTiming] = []
        for word in cue.words:
            label = word.text.upper() if uppercase else word.text
            out.append(word.model_copy(update={"text": label}))
        return out

    tokens = [tok for tok in sanitize_caption_text(cue.text).replace("\n", " ").split() if tok]
    if not tokens:
        return []

    total_span = max(0.01, cue.end_s - cue.start_s)
    weights = [max(1, len(re.sub(r"[^\w]", "", tok)) or len(tok)) for tok in tokens]
    weight_sum = sum(weights)

    timings: list[SubtitleWordTiming] = []
    cursor = cue.start_s
    for idx, (tok, w) in enumerate(zip(tokens, weights, strict=True)):
        label = tok.upper() if uppercase else tok
        if idx == len(tokens) - 1:
            end_t = max(cursor + 0.005, cue.end_s)
        else:
            share = total_span * (w / weight_sum)
            end_t = min(cue.end_s - 0.005 * (len(tokens) - 1 - idx), cursor + share)
            end_t = max(cursor + 0.005, round(end_t, 3))
        timings.append(
            SubtitleWordTiming(
                text=label,
                start_s=round(cursor, 3),
                end_s=round(end_t, 3),
            )
        )
        cursor = end_t
    return timings


def auto_chunk_cues(
    cues: Sequence[SubtitleCue | dict[str, Any]],
    *,
    max_words_per_cue: int = 4,
    uppercase: bool = False,
) -> list[SubtitleCue]:
    """Split cues into short punchy social/karaoke chunks with per-word timings."""
    if isinstance(max_words_per_cue, bool) or not isinstance(max_words_per_cue, int):
        raise ValueError("max_words_per_cue must be an integer")
    if max_words_per_cue < 1 or max_words_per_cue > 12:
        raise ValueError("max_words_per_cue must be within [1, 12]")

    validated = _coerce_cues(cues)
    chunked: list[SubtitleCue] = []
    for cue in validated:
        words = compute_cue_word_timings(cue, uppercase=uppercase)
        if not words:
            continue
        for start_idx in range(0, len(words), max_words_per_cue):
            group = words[start_idx : start_idx + max_words_per_cue]
            c_start = group[0].start_s
            c_end = max(c_start + 0.01, group[-1].end_s)
            chunked.append(
                SubtitleCue(
                    index=len(chunked) + 1,
                    start_s=round(c_start, 3),
                    end_s=round(c_end, 3),
                    text=" ".join(w.text for w in group),
                    words=group,
                )
            )
            if len(chunked) > CAPTION_MAX_CUES:
                raise ValueError(f"Chunked track exceeds maximum of {CAPTION_MAX_CUES} cues")
    return chunked


class SubtitleTrackParams(BaseModel):
    """Caption track, karaoke highlight, safe margins, and burn-in styling parameters."""

    cues: list[SubtitleCue] = Field(default_factory=list)
    style: CaptionStyleId = "clean_white"
    font_size: int = 34
    margin_bottom_pct: float = 0.08
    enabled: bool = True
    karaoke_mode: KaraokeMode = "off"
    highlight_color: str = DEFAULT_HIGHLIGHT_COLOR
    uppercase: bool = False
    safe_margin_preset: SafeMarginPresetId = "standard"
    max_words_per_cue: int = 0

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

    @field_validator("highlight_color", mode="before")
    @classmethod
    def _validate_hl_color(cls, raw: Any) -> str:
        return _validate_hex_color(raw, "highlight_color")

    @field_validator("max_words_per_cue", mode="before")
    @classmethod
    def _validate_max_words(cls, raw: Any) -> int:
        if isinstance(raw, bool) or not isinstance(raw, int | float):
            raise ValueError(f"max_words_per_cue must be an integer, got {raw!r}")
        val = int(round(float(raw)))
        if val != 0 and (val < 1 or val > 12):
            raise ValueError(f"max_words_per_cue must be 0 or within [1, 12], got {val}")
        return val

    def is_active(self) -> bool:
        """Return True when enabled and at least one cue is present."""
        return self.enabled and len(self.cues) > 0


class SubtitleCompileResult(BaseModel):
    """Compiled FFmpeg drawtext + ASS karaoke caption burn-in filtergraph and metadata."""

    filtergraph: str
    ffmpeg_vf_args: list[str] = Field(default_factory=list)
    is_active: bool
    cue_count: int
    style: CaptionStyleId
    escaped_cues: list[str] = Field(default_factory=list)
    karaoke_mode: KaraokeMode = "off"
    highlight_color: str = DEFAULT_HIGHLIGHT_COLOR
    uppercase: bool = False
    margin_bottom_pct: float = 0.08
    word_count: int = 0
    ass_preview: str = ""


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


def parse_ass(raw: str) -> list[SubtitleCue]:
    """Parse and strictly validate an ASS/SSA subtitle payload into safe SubtitleCue objects."""
    text = _prepare_raw_subtitle_input(raw, format_label="ASS")
    stripped = text.strip()
    if not stripped:
        raise ValueError("ASS input is empty")
    if "[Events]" not in stripped and "Dialogue:" not in stripped:
        raise ValueError("Invalid ASS input: missing [Events] / Dialogue lines")

    cues: list[SubtitleCue] = []
    for line in stripped.split("\n"):
        row = line.strip()
        if not row.startswith("Dialogue:"):
            continue
        payload = row[len("Dialogue:") :].strip()
        parts = payload.split(",", 9)
        if len(parts) < 10:
            raise ValueError(f"Malformed ASS Dialogue line: {row!r}")
        start_s = parse_ass_timestamp(parts[1])
        end_s = parse_ass_timestamp(parts[2])
        if end_s <= start_s:
            raise ValueError(
                f"ASS Dialogue end time ({end_s}) must exceed start time ({start_s})"
            )
        raw_dialogue_text = parts[9].replace("\\N", "\n").replace("\\n", "\n")

        parsed_words: list[SubtitleWordTiming] = []
        k_matches = list(_ASS_KARAOKE_RE.finditer(raw_dialogue_text))
        if k_matches:
            w_cursor = start_s
            for match in k_matches:
                dur_cs = max(1, int(match.group(1)))
                seg_text = sanitize_caption_text(
                    _ASS_TAG_RE.sub("", match.group(2)).replace("\n", " ")
                )
                seg_dur = dur_cs / 100.0
                w_end = min(end_s, round(w_cursor + seg_dur, 3))
                if w_end <= w_cursor:
                    w_end = round(w_cursor + 0.01, 3)
                for tok in seg_text.split():
                    if tok:
                        parsed_words.append(
                            SubtitleWordTiming(
                                text=tok,
                                start_s=round(w_cursor, 3),
                                end_s=round(max(w_cursor + 0.005, w_end), 3),
                            )
                        )
                w_cursor = w_end

        clean_text = sanitize_caption_text(_ASS_TAG_RE.sub("", raw_dialogue_text))
        if not clean_text:
            continue

        cues.append(
            SubtitleCue(
                index=len(cues) + 1,
                start_s=start_s,
                end_s=end_s,
                text=clean_text,
                words=parsed_words[:CAPTION_MAX_WORDS_PER_CUE],
            )
        )
        if len(cues) > CAPTION_MAX_CUES:
            raise ValueError(f"ASS exceeds maximum of {CAPTION_MAX_CUES} cues")

    if not cues:
        raise ValueError("ASS input contains no valid Dialogue cues")
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


def _hex_to_ass_color(hex_color: str, *, opacity: float = 1.0) -> str:
    """Convert #RRGGBB + opacity [0..1] to ASS &HAABBGGRR format (AA=00 opaque, FF transparent)."""
    clean = _validate_hex_color(hex_color, "color")
    r = clean[1:3].upper()
    g = clean[3:5].upper()
    b = clean[5:7].upper()
    alpha = round((1.0 - max(0.0, min(1.0, opacity))) * 255.0)
    return f"&H{alpha:02X}{b}{g}{r}"


def _escape_ass_text(raw: str) -> str:
    """Escape ASS braces and newlines safely."""
    clean = sanitize_caption_text(raw)
    escaped = clean.replace("\\", "/").replace("{", "(").replace("}", ")")
    return escaped.replace("\n", "\\N")


def export_ass(
    track: SubtitleTrackParams | dict[str, Any] | Sequence[SubtitleCue | dict[str, Any]],
    *,
    width: int = 1920,
    height: int = 1080,
) -> str:
    """Serialize validated cues & karaoke timings into Advanced SubStation Alpha (.ass)."""
    params = _coerce_track_params(track)
    spec = get_caption_style(params.style)

    primary_hex = (
        params.highlight_color if params.karaoke_mode != "off" else spec.font_color
    )
    primary_ass = _hex_to_ass_color(primary_hex, opacity=1.0)
    secondary_ass = _hex_to_ass_color(spec.font_color, opacity=1.0)
    outline_ass = _hex_to_ass_color("#000000", opacity=0.85)
    back_ass = (
        _hex_to_ass_color(spec.box_color, opacity=spec.box_opacity)
        if spec.box_opacity > 0.0
        else _hex_to_ass_color("#000000", opacity=0.55)
    )
    bold_flag = -1 if spec.bold else 0
    border_style = 3 if spec.box_opacity > 0.0 else 1
    outline_w = max(1, spec.border_w) if border_style == 1 else 6
    shadow_w = 1 if border_style == 1 else 0
    margin_v = max(12, round(height * params.margin_bottom_pct))
    font_px = max(14, round(height * (params.font_size / 1080.0)))

    lines: list[str] = [
        "[Script Info]",
        "Title: taktcut Studio Dynamic Captions",
        "ScriptType: v4.00+",
        "WrapStyle: 0",
        "ScaledBorderAndShadow: yes",
        f"PlayResX: {width}",
        f"PlayResY: {height}",
        "",
        "[V4+ Styles]",
        (
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
            "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, "
            "Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, "
            "MarginV, Encoding"
        ),
        (
            f"Style: TaktCutCaption,Arial,{font_px},{primary_ass},{secondary_ass},"
            f"{outline_ass},{back_ass},{bold_flag},0,0,0,100,100,0,0,{border_style},"
            f"{outline_w},{shadow_w},2,64,64,{margin_v},1"
        ),
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]

    k_tag = "kf" if params.karaoke_mode == "progressive_fill" else (
        "ko" if params.karaoke_mode == "pill_box" else "k"
    )
    for cue in params.cues:
        start_ts = format_ass_timestamp(cue.start_s)
        end_ts = format_ass_timestamp(cue.end_s)
        if params.karaoke_mode != "off":
            words = compute_cue_word_timings(cue, uppercase=params.uppercase)
            k_parts: list[str] = []
            for idx, word in enumerate(words):
                dur_cs = max(1, round((word.end_s - word.start_s) * 100.0))
                safe_w = _escape_ass_text(word.text)
                suffix = " " if idx < len(words) - 1 else ""
                k_parts.append(f"{{\\{k_tag}{dur_cs}}}{safe_w}{suffix}")
            event_text = "".join(k_parts)
        else:
            raw_txt = cue.text.upper() if params.uppercase else cue.text
            event_text = _escape_ass_text(raw_txt)
        lines.append(
            f"Dialogue: 0,{start_ts},{end_ts},TaktCutCaption,,0,0,0,,{event_text}"
        )

    return "\n".join(lines) + "\n"


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
    """Compile validated subtitle cues and karaoke into an injection-safe FFmpeg filtergraph."""
    params = _coerce_track_params(track, style=style)
    if pix_fmt is not None and pix_fmt not in ALLOWED_TITLE_PIX_FMTS:
        raise ValueError(f"Unsupported pixel format {pix_fmt!r}")

    if not params.is_active():
        return ""

    spec = get_caption_style(params.style)
    font_opt = _resolve_font_option(fontfile)
    font_color = _hex_to_ffmpeg_color(spec.font_color)
    box_color = _hex_to_ffmpeg_color(spec.box_color)
    hl_color = _hex_to_ffmpeg_color(params.highlight_color)

    fs_ratio = params.font_size / 1080.0
    fs_expr = f"max(14,round(h*{fs_ratio:.5f}))"
    pop_fs_ratio = (params.font_size * 1.12) / 1080.0
    pop_fs_expr = f"max(16,round(h*{pop_fs_ratio:.5f}))"
    line_step_ratio = (params.font_size * 1.38) / 1080.0
    bottom_y_ratio = 1.0 - params.margin_bottom_pct

    style_opts: list[str] = [f"fontcolor={font_color}"]
    if spec.border_w > 0:
        style_opts.append(f"borderw={spec.border_w}:bordercolor=0x000000@0.80")
    if spec.box_opacity > 0.0:
        box_border = 12 if spec.id in {"boxed_social", "social_karaoke"} else 8
        style_opts.append(
            f"box=1:boxcolor={box_color}@{spec.box_opacity:.2f}:boxborderw={box_border}"
        )
    style_opts.append("shadowcolor=0x000000@0.85:shadowx=1:shadowy=1")
    style_str = ":".join(style_opts)

    hl_style_opts: list[str] = [f"fontcolor={hl_color}"]
    if spec.border_w > 0:
        hl_style_opts.append(f"borderw={spec.border_w}:bordercolor=0x000000@0.85")
    if spec.box_opacity > 0.0:
        box_border = 12 if spec.id in {"boxed_social", "social_karaoke"} else 8
        hl_style_opts.append(
            f"box=1:boxcolor={box_color}@{spec.box_opacity:.2f}:boxborderw={box_border}"
        )
    hl_style_opts.append("shadowcolor=0x000000@0.85:shadowx=1:shadowy=1")
    hl_style_str = ":".join(hl_style_opts)

    filters: list[str] = []
    for cue in params.cues:
        raw_lines = [ln for ln in sanitize_caption_text(cue.text).split("\n") if ln]
        if not raw_lines:
            continue
        lines = [ln.upper() if params.uppercase else ln for ln in raw_lines]
        enable_expr = f"enable='between(t,{cue.start_s:.3f},{cue.end_s:.3f})'"
        total_lines = len(lines)

        if params.karaoke_mode == "progressive_fill":
            words = compute_cue_word_timings(cue, uppercase=params.uppercase)
            for idx, word in enumerate(words):
                phrase = " ".join(w.text for w in words[max(0, idx - 5) : idx + 1])
                escaped_phrase = escape_ffmpeg_drawtext_text(phrase)
                w_enable = f"enable='between(t,{word.start_s:.3f},{word.end_s:.3f})'"
                filters.append(
                    f"drawtext={font_opt}expansion=none:text='{escaped_phrase}':"
                    f"x=(w-tw)/2:y=round(h*{bottom_y_ratio:.4f}-th):fontsize='{fs_expr}':"
                    f"{hl_style_str}:{w_enable}"
                )
            continue

        for idx, line in enumerate(lines):
            escaped_line = escape_ffmpeg_drawtext_text(line)
            offset_from_bottom = (total_lines - 1 - idx) * line_step_ratio
            y_ratio = max(0.05, bottom_y_ratio - offset_from_bottom)
            filters.append(
                f"drawtext={font_opt}expansion=none:text='{escaped_line}':"
                f"x=(w-tw)/2:y=round(h*{y_ratio:.4f}-th):fontsize='{fs_expr}':"
                f"{style_str}:{enable_expr}"
            )

        if params.karaoke_mode in {"color_pop", "pill_box"}:
            words = compute_cue_word_timings(cue, uppercase=params.uppercase)
            top_line_y = max(0.06, bottom_y_ratio - total_lines * line_step_ratio - 0.015)
            for word in words:
                esc_word = escape_ffmpeg_drawtext_text(word.text)
                w_enable = f"enable='between(t,{word.start_s:.3f},{word.end_s:.3f})'"
                if params.karaoke_mode == "pill_box":
                    word_style = (
                        f"fontcolor=0x141416:box=1:boxcolor={hl_color}@0.94:boxborderw=12"
                    )
                else:
                    word_style = (
                        f"fontcolor={hl_color}:borderw=2:bordercolor=0x000000@0.88:"
                        "box=1:boxcolor=0x141416@0.88:boxborderw=10:"
                        "shadowcolor=0x000000@0.85:shadowx=1:shadowy=1"
                    )
                filters.append(
                    f"drawtext={font_opt}expansion=none:text='{esc_word}':"
                    f"x=(w-tw)/2:y=round(h*{top_line_y:.4f}-th):fontsize='{pop_fs_expr}':"
                    f"{word_style}:{w_enable}"
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
    """Compile subtitle cues and karaoke timings into a structured FFmpeg + ASS result."""
    params = _coerce_track_params(track, style=style)
    fg = compile_subtitles_filter(params, fontfile=fontfile, pix_fmt=pix_fmt)
    escaped_cues = [
        escape_ffmpeg_drawtext_text(
            (cue.text.upper() if params.uppercase else cue.text).replace("\n", " ")
        )
        for cue in params.cues
    ]
    word_count = sum(
        len(compute_cue_word_timings(cue, uppercase=params.uppercase))
        for cue in params.cues
    )
    ass_text = export_ass(params) if params.is_active() else ""
    return SubtitleCompileResult(
        filtergraph=fg,
        ffmpeg_vf_args=["-vf", fg] if fg else [],
        is_active=params.is_active(),
        cue_count=len(params.cues),
        style=params.style,
        escaped_cues=escaped_cues,
        karaoke_mode=params.karaoke_mode,
        highlight_color=params.highlight_color,
        uppercase=params.uppercase,
        margin_bottom_pct=params.margin_bottom_pct,
        word_count=word_count,
        ass_preview=ass_text,
    )
