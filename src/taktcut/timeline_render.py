"""Multi-track timeline compositor and FFmpeg render engine for taktcut Deliver."""

from __future__ import annotations

import contextlib
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from taktcut.color import (
    REC709_FFMPEG_FLAGS,
    ColorGradeParams,
    compile_color_grade_filter,
    escape_ffmpeg_filter_path,
)
from taktcut.models import (
    HardwareCapabilities,
    RenderProfile,
    RenderResult,
    TimelineClip,
    TimelineDocument,
)
from taktcut.security import IMAGE_SUFFIXES
from taktcut.titles import escape_ffmpeg_drawtext_text, resolve_default_fontfile


class TimelineRenderRequest(BaseModel):
    """Parameters for full multi-track timeline compositing and rendering."""

    document: TimelineDocument
    output_path: str
    width: int = Field(default=1920, ge=128, le=7680)
    height: int = Field(default=1080, ge=128, le=4320)
    fps_override: float | None = Field(default=None, gt=0.0, le=120.0)
    in_frame: int | None = Field(default=None, ge=0)
    out_frame: int | None = Field(default=None, ge=1)
    profile: RenderProfile = RenderProfile.WEB_H264
    video_crf: int = Field(default=17, ge=0, le=51)
    audio_bitrate_kbps: int = Field(default=256, ge=64, le=512)
    encoder_preset: str = "medium"
    prefer_hw: bool = True
    audio_only_format: str = "off"
    loudness_preset: str = "off"
    color_grade: dict[str, Any] | None = None
    lut_path: str | None = None
    fusion_nodes: list[dict[str, Any]] = Field(default_factory=list)


class TimelineRenderPlan(BaseModel):
    """Compiled FFmpeg multi-track render plan ready for execution."""

    output_path: str
    encoder: str
    width: int
    height: int
    fps: float
    start_s: float
    end_s: float
    duration_s: float
    video_clip_count: int
    audio_clip_count: int
    filter_complex: str
    argv: list[str]
    warnings: list[str] = Field(default_factory=list)


class TimelineRenderProgress(BaseModel):
    """Live progress telemetry for an active multi-track timeline render."""

    active: bool = False
    job_label: str = ""
    output_path: str = ""
    percent: float = 0.0
    out_time_s: float = 0.0
    total_duration_s: float = 0.0
    speed: str = ""
    fps_encoding: float = 0.0
    status: str = "idle"
    error: str = ""


_FONT_SEARCH_CANDIDATES: dict[str, tuple[str, ...]] = {
    "anton": (
        "C:/Workspace/03_Associations/INTv/Affiches GR/"
        "GR294 - inspi/3D-decor/blender/Anton-Regular.ttf",
        "C:/Workspace/03_Associations/INTv/Affiches GR/"
        "GR293 - Depot/affiche-marionnettiste/sources/Anton-Regular.ttf",
        "C:/Windows/Fonts/Anton-Regular.ttf",
        "C:/Windows/Fonts/impact.ttf",
        "C:/Windows/Fonts/ariblk.ttf",
    ),
    "impact": (
        "C:/Windows/Fonts/impact.ttf",
        "C:/Windows/Fonts/ariblk.ttf",
    ),
    "open_sans_bold": (
        "C:/Workspace/05_Ressources/taktcut/src/taktcut/ui/assets/fonts/OpenSans-Bold.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
    ),
    "open_sans": (
        "C:/Workspace/05_Ressources/taktcut/src/taktcut/ui/assets/fonts/OpenSans-Regular.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ),
    "mono": (
        "C:/Windows/Fonts/consolab.ttf",
        "C:/Windows/Fonts/consola.ttf",
        "C:/Windows/Fonts/courbd.ttf",
    ),
}


def _ensure_ascii_font_path(font_path: Path) -> Path:
    """Return an ASCII-only filesystem path for FFmpeg FreeType drawtext on Windows."""
    raw = str(font_path)
    if raw.isascii() and "~" not in raw:
        return font_path
    # Copy bundled/user font once to an ASCII-safe cache directory so FreeType never
    # crashes on non-ASCII Windows usernames or PyInstaller _MEIPASS temp paths.
    candidates_dirs: list[Path] = []
    if getattr(sys, "frozen", False):
        exe_dir = Path(sys.executable).resolve().parent
        if str(exe_dir).isascii():
            candidates_dirs.append(exe_dir / ".taktcut_fonts")
    prog_data = os.environ.get("PROGRAMDATA", "")
    if prog_data and prog_data.isascii():
        candidates_dirs.append(Path(prog_data) / "TaktCut" / "fonts")
    candidates_dirs.append(Path("C:/Workspace/05_Ressources/taktcut/.font_cache"))
    for cache_dir in candidates_dirs:
        try:
            cache_dir.mkdir(parents=True, exist_ok=True)
            dst = cache_dir / font_path.name
            if not dst.is_file() or dst.stat().st_size != font_path.stat().st_size:
                shutil.copy2(font_path, dst)
            if str(dst).isascii():
                return dst
        except OSError:
            continue
    return font_path


def resolve_title_font(font_name: str | None) -> Path | None:
    """Locate a local TTF/OTF font file matching a Resolve/Text+ font family."""
    key = (font_name or "").strip().lower().replace("-", "_").replace(" ", "_")
    # Check bundled taktcut fonts first (PyInstaller safe via __file__)
    ui_fonts = Path(__file__).resolve().parent / "ui" / "assets" / "fonts"

    candidates: list[Path] = []
    if "anton" in key:
        candidates.append(ui_fonts / "Anton-Regular.ttf")
        candidates.extend(Path(p) for p in _FONT_SEARCH_CANDIDATES["anton"])
    elif "impact" in key:
        candidates.extend(Path(p) for p in _FONT_SEARCH_CANDIDATES["impact"])
    elif "mono" in key or "consola" in key or "courier" in key:
        candidates.extend(Path(p) for p in _FONT_SEARCH_CANDIDATES["mono"])
    elif "bold" in key or "heavy" in key or "black" in key:
        candidates.append(ui_fonts / "OpenSans-Bold.ttf")
        candidates.extend(Path(p) for p in _FONT_SEARCH_CANDIDATES["open_sans_bold"])
    else:
        candidates.append(ui_fonts / "OpenSans-Bold.ttf")
        candidates.append(ui_fonts / "OpenSans-Regular.ttf")
        candidates.extend(Path(p) for p in _FONT_SEARCH_CANDIDATES["open_sans_bold"])
        candidates.extend(Path(p) for p in _FONT_SEARCH_CANDIDATES["open_sans"])

    for cand in candidates:
        if cand.is_file():
            return _ensure_ascii_font_path(cand)
    fallback = resolve_default_fontfile()
    return _ensure_ascii_font_path(fallback) if fallback else None


def _sanitize_hex_color(raw: Any, fallback: str = "#ffffff") -> str:
    if isinstance(raw, str):
        cleaned = raw.strip().lower()
        if re.fullmatch(r"#[0-9a-f]{6}", cleaned):
            return cleaned
        if re.fullmatch(r"0x[0-9a-f]{6}", cleaned):
            return "#" + cleaned[2:]
    return fallback


def _hex_to_ffmpeg(hex_color: str) -> str:
    return "0x" + _sanitize_hex_color(hex_color).lstrip("#")


def _resolve_clip_source(
    clip: TimelineClip,
    *,
    workspace_root: Path | None = None,
    media_lookup: dict[str, Path] | None = None,
) -> Path | None:
    raw = (clip.source_path or "").strip()
    if not raw or raw.startswith(("title://", "generator://", "adjustment://", "fusion://")):
        return None
    if media_lookup and raw in media_lookup and media_lookup[raw].is_file():
        return media_lookup[raw]
    cand = Path(raw)
    if cand.is_file():
        return Path(os.path.realpath(cand))
    if workspace_root is not None:
        joined = workspace_root / raw
        if joined.is_file():
            return Path(os.path.realpath(joined))
    return None


def _is_title_clip(clip: TimelineClip) -> bool:
    if clip.clip_kind == "title":
        return True
    if clip.title_params and bool(clip.title_params.get("text") or clip.title_params.get("title")):
        return True
    return clip.source_path.startswith("title://")


def _is_generator_clip(clip: TimelineClip) -> bool:
    if clip.clip_kind == "generator":
        return True
    if clip.generator_params and bool(clip.generator_params.get("generator_type")):
        return True
    return clip.source_path.startswith("generator://")


def _as_float(raw: Any, default: float) -> float:
    if isinstance(raw, (int, float)) and not isinstance(raw, bool):
        return float(raw)
    if isinstance(raw, str):
        with contextlib.suppress(ValueError):
            return float(raw)
    return default


def _compile_resolve_fx_filters(
    fx_list: list[dict[str, Any]],
    width: int,
    height: int,
) -> list[str]:
    """Translate Resolve FX horror/cinema effects into deterministic FFmpeg video filters."""
    filters: list[str] = []
    for fx in fx_list:
        if not isinstance(fx, dict) or fx.get("enabled", True) is False:
            continue
        raw_id = (
            str(
                fx.get("id")
                or fx.get("effect_id")
                or fx.get("effect")
                or fx.get("kind")
                or fx.get("name")
                or ""
            )
            .strip()
            .lower()
        )
        key = re.sub(r"[^a-z0-9]+", "_", raw_id).strip("_")
        raw_params = fx.get("params")
        fx_params: dict[str, Any] = raw_params if isinstance(raw_params, dict) else {}
        strength = _as_float(
            fx.get(
                "strength",
                fx.get(
                    "intensity",
                    fx.get(
                        "amount",
                        fx_params.get("strength", fx_params.get("intensity", 0.65)),
                    ),
                ),
            ),
            0.65,
        )
        strength = max(0.0, min(2.0, strength))
        if strength <= 0.001:
            continue

        if any(k in key for k in ("analog_damage", "vhs", "tape", "crt", "scanline")):
            shift = max(2, min(14, round(4 + strength * 6)))
            noise_s = max(8, min(60, round(18 + strength * 26)))
            filters.append(f"rgbashift=rh={shift}:bh=-{shift}:rv=1:bv=-1")
            filters.append(f"noise=alls={noise_s}:allf=t+u")
            filters.append("eq=contrast=1.12:saturation=0.78:brightness=-0.03")
            filters.append("drawgrid=w=0:h=4:t=1:c=black@0.26")
        elif any(k in key for k in ("glitch", "rgb_split", "chromatic", "prism")):
            shift = max(3, min(28, round(6 + strength * 14)))
            filters.append(f"rgbashift=rh={shift}:bh=-{shift}:gv=2:bv=-2")
            if "glitch" in key:
                noise_s = max(12, min(70, round(24 + strength * 30)))
                filters.append(f"noise=alls={noise_s}:allf=t+u")
        elif any(k in key for k in ("camera_shake", "shake")):
            amp = max(2, min(36, round(6 + strength * 18)))
            freq = _as_float(fx.get("frequency", 14.0), 14.0)
            freq = max(1.0, min(40.0, freq))
            pad_w = width + amp * 2 + 4
            pad_h = height + amp * 2 + 4
            filters.append(
                f"scale={pad_w}:{pad_h}:flags=bilinear,"
                f"crop={width}:{height}:"
                f"x='(iw-ow)/2+{amp}*sin(t*{freq:.2f})':"
                f"y='(ih-oh)/2+{amp}*cos(t*{freq * 0.83:.2f})'"
            )
        elif any(k in key for k in ("flicker", "strobe")):
            rate = _as_float(fx.get("rate", fx.get("frequency", 11.0)), 11.0)
            rate = max(1.0, min(30.0, rate))
            depth = max(0.05, min(0.95, 0.35 + strength * 0.45))
            filters.append(
                f"eq=brightness='-{depth * 0.45:.3f}*gt(sin(2*PI*{rate:.2f}*t),0.45)':eval=frame"
            )
        elif any(k in key for k in ("vignette",)):
            angle = max(0.35, min(1.35, 0.55 + strength * 0.55))
            filters.append(f"vignette=angle={angle:.3f}")
        elif any(k in key for k in ("film_grain", "grain", "film_damage")):
            grain_s = max(6, min(55, round(12 + strength * 24)))
            filters.append(f"noise=alls={grain_s}:allf=t+u")
        elif any(k in key for k in ("blur", "defocus", "radial_blur", "directional_blur")):
            sigma = max(0.5, min(24.0, 2.0 + strength * 8.0))
            filters.append(f"gblur=sigma={sigma:.2f}")
        elif any(k in key for k in ("horror_red", "crimson", "red_tint")):
            filters.append("colorchannelmixer=rr=1.22:gg=0.52:bb=0.46")
            filters.append("eq=contrast=1.25:brightness=-0.06")
        elif any(k in key for k in ("invert", "negative")):
            filters.append("negate")
    return filters


def _has_glow_fx(fx_list: list[dict[str, Any]]) -> tuple[bool, float, str]:
    for fx in fx_list:
        if not isinstance(fx, dict) or fx.get("enabled", True) is False:
            continue
        raw_id = str(fx.get("id") or fx.get("effect_id") or fx.get("name") or "").strip().lower()
        if any(k in raw_id for k in ("glow", "halation", "bloom", "light_ray")):
            strength = max(
                0.1,
                min(1.5, _as_float(fx.get("strength", fx.get("intensity", 0.65)), 0.65)),
            )
            tint = "red" if "halation" in raw_id else str(fx.get("tint", "white"))
            return (True, strength, tint)
    return (False, 0.0, "white")


def _compile_fairlight_audio_fx(
    audio_fx_list: list[dict[str, Any]],
    *,
    reverse: bool = False,
) -> list[str]:
    """Translate Fairlight FX horror/cinematic audio plugins into FFmpeg -af filters."""
    af: list[str] = []
    if reverse:
        af.append("areverse")
    for fx in audio_fx_list:
        if not isinstance(fx, dict) or fx.get("enabled", True) is False:
            continue
        raw_id = (
            str(fx.get("id") or fx.get("kind") or fx.get("plugin") or fx.get("name") or "")
            .strip()
            .lower()
        )
        key = re.sub(r"[^a-z0-9]+", "_", raw_id).strip("_")
        raw_p = fx.get("params")
        p: dict[str, Any] = raw_p if isinstance(raw_p, dict) else {}
        if any(k in key for k in ("reverse",)):
            af.append("areverse")
        elif any(k in key for k in ("pitch", "demon", "deep_voice")):
            semitones = _as_float(
                fx.get("semitones", fx.get("coarse", p.get("semitones", -4.0))), -4.0
            )
            semitones = max(-12.0, min(12.0, semitones))
            ratio = 2.0 ** (semitones / 12.0)
            preserve_tempo = bool(fx.get("preserve_tempo", p.get("preserve_tempo", True)))
            af.append(f"asetrate=48000*{ratio:.5f},aresample=48000")
            if preserve_tempo:
                inv = max(0.5, min(2.0, 1.0 / ratio))
                af.append(f"atempo={inv:.5f}")
        elif any(k in key for k in ("reverb", "cavern", "hall", "dark_reverb")):
            decay = max(0.15, min(0.85, _as_float(fx.get("decay", p.get("decay", 0.55)), 0.55)))
            af.append(
                f"aecho=0.85:0.88:55|125|240|410:"
                f"{decay:.2f}|{decay * 0.72:.2f}|{decay * 0.5:.2f}|{decay * 0.32:.2f}"
            )
            af.append("lowpass=f=4200")
        elif any(k in key for k in ("echo", "delay")):
            raw_delay = _as_float(fx.get("delay_ms", p.get("delay_ms", 220)), 220)
            delay_ms = max(40, min(1200, int(raw_delay)))
            decay = max(0.15, min(0.85, _as_float(fx.get("decay", p.get("decay", 0.45)), 0.45)))
            af.append(f"aecho=0.85:0.8:{delay_ms}|{delay_ms * 2}:{decay:.2f}|{decay * 0.5:.2f}")
        elif any(k in key for k in ("distortion", "overdrive", "bitcrusher", "crush")):
            bits = max(4, min(14, int(_as_float(fx.get("bits", p.get("bits", 8)), 8))))
            mix = max(0.1, min(1.0, _as_float(fx.get("mix", p.get("mix", 0.65)), 0.65)))
            af.append(f"acrusher=level_in=1.8:level_out=1.0:bits={bits}:mode=log:mix={mix:.2f}")
        elif any(k in key for k in ("radio", "telephone", "bandpass", "intercom")):
            af.append("highpass=f=360,lowpass=f=2800")
            af.append("acrusher=level_in=1.5:level_out=1.0:bits=10:mode=log:mix=0.35")
        elif any(k in key for k in ("bass_boost", "sub", "lfe")):
            gain = max(1.0, min(12.0, _as_float(fx.get("gain_db", p.get("gain_db", 5.5)), 5.5)))
            af.append(f"equalizer=f=60:t=q:w=1.1:g={gain:.1f}")
        elif any(k in key for k in ("eq", "highpass", "lowpass")):
            hp = _as_float(fx.get("highpass_hz", p.get("highpass_hz", 0.0)), 0.0)
            lp = _as_float(fx.get("lowpass_hz", p.get("lowpass_hz", 0.0)), 0.0)
            if hp >= 20.0:
                af.append(f"highpass=f={min(8000.0, hp):.0f}")
            if lp >= 200.0:
                af.append(f"lowpass=f={min(18000.0, lp):.0f}")
    return af


def _build_title_filter_chain(
    clip: TimelineClip,
    label_out: str,
    *,
    width: int,
    height: int,
    fps: float,
    dur_s: float,
    prefix: str,
) -> list[str]:
    """Compile an animated Resolve Text+ / Title clip with optional cinematic glow."""
    tp = clip.title_params or {}
    raw_text = str(tp.get("text") or tp.get("title") or clip.name or "TITLE").strip()
    lines = [ln.strip() for ln in raw_text.replace("\\n", "\n").splitlines() if ln.strip()]
    if not lines:
        lines = ["TITLE"]
    subtitle = str(tp.get("subtitle") or "").strip()
    if subtitle:
        lines.append(subtitle)

    font_name = str(tp.get("font") or "Anton")
    font_path = resolve_title_font(font_name)
    font_opt = f"fontfile='{escape_ffmpeg_filter_path(font_path)}':" if font_path else ""

    base_fs = int(tp.get("font_size", 112))
    base_fs = max(20, min(260, round(base_fs * (height / 1080.0))))
    color_hex = _sanitize_hex_color(tp.get("color", "#f4f4f6"), "#f4f4f6")
    ff_color = _hex_to_ffmpeg(color_hex)
    accent_hex = _sanitize_hex_color(tp.get("accent_color", color_hex), color_hex)
    accent_line = int(tp.get("accent_line", -1))

    anim = str(tp.get("anim") or tp.get("animation") or "fade").strip().lower()
    glow_strength = float(tp.get("glow", tp.get("glow_strength", 0.75)))
    glow_strength = max(0.0, min(2.0, glow_strength))
    glow_color = _sanitize_hex_color(tp.get("glow_color", color_hex), color_hex)
    shake_px = float(tp.get("shake_px", 0.0))
    if anim == "shake" and shake_px <= 0.0:
        shake_px = 5.0
    elif anim == "glitch" and shake_px <= 0.0:
        shake_px = 9.0

    y_offset_pct = float(tp.get("y_offset_pct", 0.0))
    line_spacing = round(base_fs * 1.24)
    total_text_h = line_spacing * len(lines)
    base_y_center = round(height * (0.5 + y_offset_pct / 100.0) - total_text_h / 2)

    fade_in_s = max(0.0, min(dur_s * 0.45, float(tp.get("fade_in_s", clip.fade_in_s or 0.12))))
    fade_out_s = max(0.0, min(dur_s * 0.45, float(tp.get("fade_out_s", clip.fade_out_s or 0.18))))

    # Build alpha expression
    alpha_parts: list[str] = ["1"]
    if fade_in_s > 0.01:
        alpha_parts.append(f"min(1,t/{fade_in_s:.3f})")
    if fade_out_s > 0.01:
        alpha_parts.append(f"min(1,max(0,({dur_s:.3f}-t)/{fade_out_s:.3f}))")
    if anim in ("flicker", "horror_flicker", "strobe"):
        alpha_parts.append("(0.22+0.78*gt(sin(t*37)+cos(t*23), -0.45))")
    alpha_expr = "*".join(alpha_parts)

    draw_filters: list[str] = []
    for idx, line in enumerate(lines):
        esc = escape_ffmpeg_drawtext_text(line)
        line_color = _hex_to_ffmpeg(accent_hex) if idx == accent_line else ff_color
        fs_cur = round(base_fs * 0.62) if (subtitle and idx == len(lines) - 1) else base_fs
        y_pos = base_y_center + idx * line_spacing
        if shake_px > 0.1:
            x_expr = f"(w-text_w)/2+{shake_px:.1f}*sin(t*51+{idx})"
            y_expr = f"{y_pos}+{shake_px * 0.65:.1f}*cos(t*43+{idx})"
        else:
            x_expr = "(w-text_w)/2"
            y_expr = str(y_pos)

        enable_part = ""
        if anim == "word_reveal" and len(lines) > 1:
            reveal_t = idx * min(0.55, dur_s / max(2, len(lines) + 1))
            enable_part = f":enable='gte(t,{reveal_t:.3f})'"

        draw_filters.append(
            f"drawtext={font_opt}expansion=none:text='{esc}'"
            f":fontsize={fs_cur}:fontcolor={line_color}"
            f":alpha='{alpha_expr}'"
            f":shadowcolor=black@0.85:shadowx=0:shadowy=4"
            f":x='{x_expr}':y='{y_expr}'{enable_part}"
        )

    chains: list[str] = []
    raw_lbl = f"{prefix}_txt_raw"
    chains.append(
        f"color=c=black@0.0:s={width}x{height}:r={fps:.4f}:d={dur_s:.4f},"
        f"format=rgba,{','.join(draw_filters)}[{raw_lbl}]"
    )

    cur_lbl = raw_lbl
    if glow_strength > 0.05:
        sigma = max(4.0, min(32.0, 10.0 + glow_strength * 14.0))
        c_fg = f"{prefix}_tfg"
        c_bg = f"{prefix}_tbg"
        c_gl = f"{prefix}_tgl"
        c_out = f"{prefix}_tgout"
        tint_filter = ""
        if glow_color != color_hex and glow_color.startswith("#"):
            gr = int(glow_color[1:3], 16) / 255.0
            gg = int(glow_color[3:5], 16) / 255.0
            gb = int(glow_color[5:7], 16) / 255.0
            tint_filter = (
                f",colorchannelmixer=rr={gr:.3f}:gg={gg:.3f}:bb={gb:.3f}"
                f":aa={min(1.0, glow_strength * 0.95):.3f}"
            )
        else:
            tint_filter = f",colorchannelmixer=aa={min(1.0, glow_strength * 0.95):.3f}"
        chains.append(f"[{cur_lbl}]split[{c_fg}][{c_bg}]")
        chains.append(f"[{c_bg}]gblur=sigma={sigma:.1f}{tint_filter}[{c_gl}]")
        chains.append(f"[{c_gl}][{c_fg}]overlay=format=auto[{c_out}]")
        cur_lbl = c_out

    if anim == "glitch":
        g_out = f"{prefix}_tglitch"
        chains.append(f"[{cur_lbl}]rgbashift=rh=6:bh=-6:rv=1:bv=-1[{g_out}]")
        cur_lbl = g_out

    if anim in ("zoom_in", "punch_in"):
        z_out = f"{prefix}_tzoom"
        # Gentle zoom-in punch using scale + crop
        chains.append(
            f"[{cur_lbl}]scale=w='trunc(iw*(1+0.08*min(1,t/{max(0.2, dur_s):.2f}))/2)*2':"
            f"h='trunc(ih*(1+0.08*min(1,t/{max(0.2, dur_s):.2f}))/2)*2':eval=frame,"
            f"crop={width}:{height}[{z_out}]"
        )
        cur_lbl = z_out

    extra_fx = _compile_resolve_fx_filters(clip.resolve_fx, width, height)
    if extra_fx:
        fx_out = f"{prefix}_tfx"
        chains.append(f"[{cur_lbl}]{','.join(extra_fx)}[{fx_out}]")
        cur_lbl = fx_out

    chains.append(f"[{cur_lbl}]format=rgba[{label_out}]")
    return chains


def _build_generator_filter_chain(
    clip: TimelineClip,
    label_out: str,
    *,
    width: int,
    height: int,
    fps: float,
    dur_s: float,
    prefix: str,
) -> list[str]:
    """Compile a Resolve Generator (Solid Color, Noise/VHS Static, Flash, Gradient)."""
    gp = clip.generator_params or {}
    gtype = str(
        gp.get("generator_type")
        or clip.source_path.replace("generator://", "")
        or "solid_color"
    ).strip().lower()
    color_hex = _sanitize_hex_color(gp.get("color", "#000000"), "#000000")
    ff_color = _hex_to_ffmpeg(color_hex)

    chains: list[str] = []
    if any(k in gtype for k in ("noise", "static", "snow", "vhs")):
        noise_s = max(20, min(100, int(gp.get("noise_strength", 88))))
        chains.append(
            f"color=c=0x2a2a2a:s={width}x{height}:r={fps:.4f}:d={dur_s:.4f},"
            f"noise=alls={noise_s}:allf=t+u,eq=contrast=2.2:saturation=0.0,"
            f"drawgrid=w=0:h=3:t=1:c=black@0.35,format=rgba[{prefix}_g0]"
        )
    else:
        chains.append(
            f"color=c={ff_color}:s={width}x{height}:r={fps:.4f}:d={dur_s:.4f},"
            f"format=rgba[{prefix}_g0]"
        )

    cur = f"{prefix}_g0"
    extra_fx = _compile_resolve_fx_filters(clip.resolve_fx, width, height)
    if extra_fx:
        chains.append(f"[{cur}]{','.join(extra_fx)}[{prefix}_gfx]")
        cur = f"{prefix}_gfx"
    chains.append(f"[{cur}]format=rgba[{label_out}]")
    return chains


def _choose_encoder(
    profile: RenderProfile,
    prefer_hw: bool,
    caps: HardwareCapabilities | None,
) -> tuple[str, list[str]]:
    if profile == RenderProfile.PRORES_HQ:
        return ("prores_ks", ["-c:v", "prores_ks", "-profile:v", "3", "-pix_fmt", "yuv422p10le"])
    if profile == RenderProfile.DNXHR_HQ:
        return ("dnxhd", ["-c:v", "dnxhd", "-profile:v", "dnxhr_hq", "-pix_fmt", "yuv422p"])
    if profile == RenderProfile.MASTER_HEVC:
        if prefer_hw and caps and caps.hevc_nvenc:
            return (
                "hevc_nvenc",
                ["-c:v", "hevc_nvenc", "-preset", "p5", "-rc", "vbr", "-cq", "20"],
            )
        return ("libx265", ["-c:v", "libx265", "-preset", "medium", "-crf", "20"])
    if prefer_hw and caps and caps.h264_nvenc:
        return (
            "h264_nvenc",
            ["-c:v", "h264_nvenc", "-preset", "p5", "-rc", "vbr", "-cq", "17"],
        )
    return ("libx264", ["-c:v", "libx264", "-preset", "medium", "-crf", "17"])


def build_timeline_render_plan(
    req: TimelineRenderRequest,
    *,
    workspace_root: Path | None = None,
    media_lookup: dict[str, Path] | None = None,
    caps: HardwareCapabilities | None = None,
) -> TimelineRenderPlan:
    """Compile an entire multi-track TimelineDocument into an FFmpeg filter_complex command."""
    doc = req.document
    fps = float(req.fps_override) if req.fps_override else doc.fps.as_float
    fps = max(1.0, min(120.0, fps))
    w = req.width - (req.width % 2)
    h = req.height - (req.height % 2)

    max_frame = 1
    for trk in doc.tracks:
        for clp in trk.clips:
            if clp.enabled:
                max_frame = max(max_frame, clp.start_frame + clp.duration_frames)

    start_f = req.in_frame if req.in_frame is not None else 0
    end_f = req.out_frame if req.out_frame is not None else max_frame
    if end_f <= start_f:
        end_f = start_f + max(1, round(fps))

    start_s = start_f / fps
    end_s = end_f / fps
    total_dur_s = max(0.08, end_s - start_s)

    ffmpeg_bin = caps.ffmpeg_path if caps else (shutil.which("ffmpeg") or "ffmpeg")
    inputs: list[str] = []
    filter_parts: list[str] = []
    warnings: list[str] = []

    # Master opaque black base canvas
    filter_parts.append(
        f"color=c=black:s={w}x{h}:r={fps:.4f}:d={total_dur_s:.4f},format=rgba[vbase0]"
    )
    current_v = "vbase0"
    v_step = 0
    input_idx = 0
    video_clip_count = 0
    audio_clip_count = 0
    audio_mix_labels: list[str] = []

    # Video tracks bottom-to-top (V1, V2, V3...)
    video_tracks = sorted(
        [t for t in doc.tracks if t.kind == "video" and not t.muted],
        key=lambda t: t.index,
    )
    for trk in video_tracks:
        for c_idx, clip in enumerate(sorted(trk.clips, key=lambda c: c.start_frame)):
            if not clip.enabled or clip.duration_frames <= 0:
                continue
            c_start_s = clip.start_frame / fps
            c_end_s = (clip.start_frame + clip.duration_frames) / fps
            if c_end_s <= start_s or c_start_s >= end_s:
                continue

            vis_start = max(c_start_s, start_s)
            vis_end = min(c_end_s, end_s)
            vis_dur = max(1.0 / fps, vis_end - vis_start)
            rel_start = vis_start - start_s
            trim_head = max(0.0, vis_start - c_start_s)
            prefix = f"v{trk.index}_{c_idx}_{v_step}"
            clip_lbl = f"{prefix}_ready"

            if _is_title_clip(clip):
                filter_parts.extend(
                    _build_title_filter_chain(
                        clip,
                        clip_lbl,
                        width=w,
                        height=h,
                        fps=fps,
                        dur_s=vis_dur,
                        prefix=prefix,
                    )
                )
            elif _is_generator_clip(clip):
                filter_parts.extend(
                    _build_generator_filter_chain(
                        clip,
                        clip_lbl,
                        width=w,
                        height=h,
                        fps=fps,
                        dur_s=vis_dur,
                        prefix=prefix,
                    )
                )
            else:
                src_path = _resolve_clip_source(
                    clip, workspace_root=workspace_root, media_lookup=media_lookup
                )
                if src_path is None:
                    warnings.append(
                        f"Video clip '{clip.name}' missing source ({clip.source_path}); skipped"
                    )
                    continue

                is_image = src_path.suffix.lower() in IMAGE_SUFFIXES
                src_fps = clip.source_fps.as_float if clip.source_fps else fps
                speed = max(0.25, min(4.0, float(clip.speed_rate or 1.0)))
                src_in_s = (clip.source_in_frame / max(1.0, src_fps)) + trim_head * speed
                src_read_s = vis_dur * speed + 0.15

                in_i = input_idx
                input_idx += 1
                if is_image:
                    inputs.extend(["-loop", "1", "-t", f"{vis_dur:.4f}", "-i", str(src_path)])
                else:
                    inputs.extend(
                        [
                            "-ss",
                            f"{max(0.0, src_in_s):.4f}",
                            "-t",
                            f"{max(0.08, src_read_s):.4f}",
                            "-i",
                            str(src_path),
                        ]
                    )

                chain: list[str] = []
                # Scale cover + crop to timeline raster (or zoom/position transform)
                zoom_pct = 100.0
                pos_x_pct = 0.0
                pos_y_pct = 0.0
                rot_deg = 0.0
                if clip.transform is not None:
                    zoom_pct = float(clip.transform.zoom_pct)
                    pos_x_pct = float(clip.transform.pos_x_pct)
                    pos_y_pct = float(clip.transform.pos_y_pct)
                    rot_deg = float(clip.transform.rotation_deg)

                if not is_image and abs(speed - 1.0) > 0.005:
                    chain.append(f"setpts=PTS/{speed:.5f}")
                if not is_image and clip.reverse:
                    chain.append("reverse")

                # Scale to fill timeline frame cleanly (supports 4:5 -> 16:9 crop or 16:9 -> 16:9)
                scale_mult = max(0.1, min(3.0, zoom_pct / 100.0))
                sw = max(2, round(w * scale_mult) - (round(w * scale_mult) % 2))
                sh = max(2, round(h * scale_mult) - (round(h * scale_mult) % 2))
                chain.append(f"scale={sw}:{sh}:force_original_aspect_ratio=increase")
                crop_x = f"(iw-{w})/2-({pos_x_pct / 100.0:.4f}*{w})"
                crop_y = f"(ih-{h})/2-({pos_y_pct / 100.0:.4f}*{h})"
                if sw >= w and sh >= h:
                    chain.append(
                        f"crop={w}:{h}:x='max(0,min(iw-{w},{crop_x}))':"
                        f"y='max(0,min(ih-{h},{crop_y}))'"
                    )
                else:
                    chain.append(
                        f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=black@0.0"
                    )
                if abs(rot_deg) > 0.05:
                    rad = rot_deg * math.pi / 180.0
                    chain.append(f"rotate={rad:.5f}:c=black@0.0")

                chain.append(f"fps={fps:.4f}")
                chain.append("setsar=1")
                chain.append(f"trim=duration={vis_dur:.4f},setpts=PTS-STARTPTS")

                # Per-clip Color Grade
                if clip.color_grade:
                    try:
                        cg_obj = ColorGradeParams.model_validate(clip.color_grade)
                        cg_vf = compile_color_grade_filter(cg_obj)
                        if cg_vf:
                            chain.append(cg_vf)
                    except Exception:
                        pass

                # Per-clip Resolve FX
                fx_filters = _compile_resolve_fx_filters(clip.resolve_fx, w, h)
                chain.extend(fx_filters)
                chain.append("format=rgba")

                base_src_lbl = f"{prefix}_src"
                filter_parts.append(f"[{in_i}:v]{','.join(chain)}[{base_src_lbl}]")
                cur_c = base_src_lbl

                # Optional Glow / Halation pass
                has_glow, g_str, g_tint = _has_glow_fx(clip.resolve_fx)
                if has_glow:
                    sigma = max(4.0, min(28.0, 8.0 + g_str * 14.0))
                    g_a, g_b, g_bl, g_out = (
                        f"{prefix}_ga",
                        f"{prefix}_gb",
                        f"{prefix}_gbl",
                        f"{prefix}_gout",
                    )
                    filter_parts.append(f"[{cur_c}]split[{g_a}][{g_b}]")
                    tint_f = (
                        ",colorchannelmixer=rr=1.35:gg=0.35:bb=0.25"
                        if g_tint == "red"
                        else ""
                    )
                    filter_parts.append(
                        f"[{g_b}]gblur=sigma={sigma:.1f}{tint_f},format=rgba[{g_bl}]"
                    )
                    filter_parts.append(
                        f"[{g_a}][{g_bl}]blend=all_mode=screen:all_opacity={min(0.95, g_str):.2f},"
                        f"format=rgba[{g_out}]"
                    )
                    cur_c = g_out

                # Per-clip video fades & opacity
                post_c: list[str] = []
                op_val = max(0.0, min(1.0, float(clip.opacity) / 100.0))
                if clip.transform is not None:
                    op_val *= max(0.0, min(1.0, float(clip.transform.opacity_pct) / 100.0))
                if op_val < 0.995:
                    post_c.append(f"colorchannelmixer=aa={op_val:.3f}")
                if clip.fade_in_s > 0.01:
                    fi = min(clip.fade_in_s, vis_dur * 0.5)
                    post_c.append(f"fade=t=in:st=0:d={fi:.3f}:alpha=1")
                if clip.fade_out_s > 0.01:
                    fo = min(clip.fade_out_s, vis_dur * 0.5)
                    post_c.append(f"fade=t=out:st={max(0.0, vis_dur - fo):.3f}:d={fo:.3f}:alpha=1")
                if post_c:
                    filter_parts.append(f"[{cur_c}]{','.join(post_c)}[{clip_lbl}]")
                else:
                    filter_parts.append(f"[{cur_c}]copy[{clip_lbl}]")

            # Shift clip PTS to its exact timeline position and composite onto current_v
            shifted_lbl = f"{prefix}_ts"
            next_v = f"vbase{v_step + 1}"
            v_step += 1
            video_clip_count += 1
            mode = (clip.composite_mode or "normal").strip().lower()
            en_expr = f"between(t,{rel_start:.4f},{rel_start + vis_dur:.4f})"

            if mode in ("screen", "add", "addition", "multiply", "overlay", "lighten", "darken"):
                ff_mode = "addition" if mode == "add" else mode
                b_op = max(0.05, min(1.0, float(clip.opacity) / 100.0))
                # Shift clip PTS, pad to timeline duration with transparent/black outside range
                filter_parts.append(
                    f"[{clip_lbl}]setpts=PTS-STARTPTS+{rel_start:.4f}/TB,format=rgb24[{shifted_lbl}]"
                )
                b_copy = f"{prefix}_bcopy"
                b_main = f"{prefix}_bmain"
                b_rgb = f"{prefix}_brgb"
                b_bld = f"{prefix}_bbld"
                filter_parts.append(f"[{current_v}]split[{b_main}][{b_copy}]")
                filter_parts.append(f"[{b_copy}]format=rgb24[{b_rgb}]")
                filter_parts.append(
                    f"[{b_rgb}][{shifted_lbl}]blend=all_mode={ff_mode}:all_opacity={b_op:.3f}:"
                    f"eof_action=pass,format=rgba[{b_bld}]"
                )
                filter_parts.append(
                    f"[{b_main}][{b_bld}]overlay=shortest=0:eof_action=pass:"
                    f"enable='{en_expr}',format=rgba[{next_v}]"
                )
            else:
                filter_parts.append(
                    f"[{clip_lbl}]setpts=PTS-STARTPTS+{rel_start:.4f}/TB[{shifted_lbl}]"
                )
                filter_parts.append(
                    f"[{current_v}][{shifted_lbl}]overlay=0:0:eof_action=pass:"
                    f"enable='{en_expr}',format=rgba[{next_v}]"
                )
            current_v = next_v

    # Global Color Page grade + LUT applied to master video output
    master_v_filters: list[str] = []
    if req.color_grade:
        try:
            g_cg = ColorGradeParams.model_validate(req.color_grade)
            g_vf = compile_color_grade_filter(g_cg)
            if g_vf:
                master_v_filters.append(g_vf)
        except Exception:
            pass
    if req.lut_path and Path(req.lut_path).is_file():
        lut_esc = escape_ffmpeg_filter_path(Path(req.lut_path))
        master_v_filters.append(f"lut3d=file='{lut_esc}'")

    master_v_filters.append("format=yuv420p")
    filter_parts.append(f"[{current_v}]{','.join(master_v_filters)}[vout]")

    # Audio tracks (A1..An)
    audio_tracks = sorted(
        [t for t in doc.tracks if t.kind == "audio" and not t.muted],
        key=lambda t: t.index,
    )
    has_solo = any(t.solo for t in audio_tracks)
    if has_solo:
        audio_tracks = [t for t in audio_tracks if t.solo]

    a_step = 0
    for trk in audio_tracks:
        for c_idx, clip in enumerate(sorted(trk.clips, key=lambda c: c.start_frame)):
            if not clip.enabled or clip.duration_frames <= 0:
                continue
            c_start_s = clip.start_frame / fps
            c_end_s = (clip.start_frame + clip.duration_frames) / fps
            if c_end_s <= start_s or c_start_s >= end_s:
                continue

            src_path = _resolve_clip_source(
                clip, workspace_root=workspace_root, media_lookup=media_lookup
            )
            if src_path is None:
                warnings.append(
                    f"Audio clip '{clip.name}' missing source file ({clip.source_path}); skipped"
                )
                continue

            vis_start = max(c_start_s, start_s)
            vis_end = min(c_end_s, end_s)
            vis_dur = max(0.04, vis_end - vis_start)
            rel_start = vis_start - start_s
            trim_head = max(0.0, vis_start - c_start_s)
            src_fps = clip.source_fps.as_float if clip.source_fps else fps
            src_in_s = (clip.source_in_frame / max(1.0, src_fps)) + trim_head

            in_i = input_idx
            input_idx += 1
            inputs.extend(
                [
                    "-ss",
                    f"{max(0.0, src_in_s):.4f}",
                    "-t",
                    f"{vis_dur + 0.1:.4f}",
                    "-i",
                    str(src_path),
                ]
            )

            achain: list[str] = [
                f"atrim=duration={vis_dur:.4f}",
                "asetpts=PTS-STARTPTS",
                "aresample=48000",
                "aformat=sample_fmts=fltp:channel_layouts=stereo",
            ]
            # Fairlight Audio FX
            achain.extend(_compile_fairlight_audio_fx(clip.audio_fx, reverse=clip.reverse))

            # Gain (clip + track)
            total_db = float(clip.audio_gain_db or 0.0) + float(trk.volume_db or 0.0)
            total_db = max(-48.0, min(18.0, total_db))
            if abs(total_db) > 0.05:
                achain.append(f"volume={total_db:.2f}dB")

            # Fades
            if clip.fade_in_s > 0.005:
                fi = min(clip.fade_in_s, vis_dur * 0.5)
                achain.append(f"afade=t=in:st=0:d={fi:.3f}")
            if clip.fade_out_s > 0.005:
                fo = min(clip.fade_out_s, vis_dur * 0.5)
                achain.append(f"afade=t=out:st={max(0.0, vis_dur - fo):.3f}:d={fo:.3f}")

            # Exact timeline placement via adelay (ms)
            delay_ms = max(0, round(rel_start * 1000.0))
            if delay_ms > 0:
                achain.append(f"adelay={delay_ms}|{delay_ms}")

            albl = f"a{trk.index}_{c_idx}_{a_step}"
            a_step += 1
            audio_clip_count += 1
            filter_parts.append(f"[{in_i}:a]{','.join(achain)}[{albl}]")
            audio_mix_labels.append(albl)

    # Master audio bus (always generate stereo 48kHz bed so MP4 always has valid audio)
    filter_parts.append(
        f"anullsrc=r=48000:cl=stereo,atrim=duration={total_dur_s:.4f}[asilence]"
    )
    mix_inputs = ["asilence", *audio_mix_labels]
    mix_in_str = "".join(f"[{lbl}]" for lbl in mix_inputs)
    master_af: list[str] = [
        f"amix=inputs={len(mix_inputs)}:duration=first:dropout_transition=0:normalize=0",
        f"atrim=duration={total_dur_s:.4f}",
        "alimiter=limit=0.95:attack=3:release=50",
    ]
    if req.loudness_preset in ("youtube_14", "reels_16", "broadcast_23"):
        lufs_map = {"youtube_14": -14.0, "reels_16": -16.0, "broadcast_23": -23.0}
        master_af.append(f"loudnorm=I={lufs_map[req.loudness_preset]:.1f}:TP=-1.0:LRA=11")
    filter_parts.append(f"{mix_in_str}{','.join(master_af)}[aout]")

    filter_complex = ";\n".join(filter_parts)
    encoder, enc_args = _choose_encoder(req.profile, req.prefer_hw, caps)
    if encoder in ("libx264", "libx265") and req.video_crf is not None and "-crf" in enc_args:
        idx_c = enc_args.index("-crf")
        enc_args[idx_c + 1] = str(req.video_crf)
    elif (
        encoder in ("h264_nvenc", "hevc_nvenc")
        and req.video_crf is not None
        and "-cq" in enc_args
    ):
        idx_c = enc_args.index("-cq")
        enc_args[idx_c + 1] = str(req.video_crf)

    argv: list[str] = [ffmpeg_bin, "-y", "-hide_banner", *inputs]
    argv.extend(["-filter_complex", filter_complex])

    if req.audio_only_format != "off":
        argv.extend(["-map", "[aout]"])
        if req.audio_only_format == "wav24":
            argv.extend(["-c:a", "pcm_s24le", "-ar", "48000", "-ac", "2"])
        elif req.audio_only_format == "mp3_320":
            argv.extend(["-c:a", "libmp3lame", "-b:a", "320k", "-ar", "48000", "-ac", "2"])
        else:
            argv.extend(["-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2"])
    else:
        argv.extend(["-map", "[vout]", "-map", "[aout]"])
        argv.extend(enc_args)
        argv.extend(["-r", f"{fps:.4f}", "-g", str(max(12, round(fps * 2)))])
        argv.extend(REC709_FFMPEG_FLAGS)
        if req.profile in (RenderProfile.PRORES_HQ, RenderProfile.DNXHR_HQ):
            argv.extend(["-c:a", "pcm_s24le", "-ar", "48000", "-ac", "2"])
        else:
            argv.extend(
                [
                    "-c:a",
                    "aac",
                    "-b:a",
                    f"{req.audio_bitrate_kbps}k",
                    "-ar",
                    "48000",
                    "-ac",
                    "2",
                    "-movflags",
                    "+faststart",
                ]
            )
    argv.append(req.output_path)

    return TimelineRenderPlan(
        output_path=req.output_path,
        encoder=encoder,
        width=w,
        height=h,
        fps=round(fps, 4),
        start_s=round(start_s, 4),
        end_s=round(end_s, 4),
        duration_s=round(total_dur_s, 4),
        video_clip_count=video_clip_count,
        audio_clip_count=audio_clip_count,
        filter_complex=filter_complex,
        argv=argv,
        warnings=warnings,
    )


def execute_timeline_render_plan(
    plan: TimelineRenderPlan,
    *,
    progress_cb: Callable[[TimelineRenderProgress], None] | None = None,
    job_label: str = "Timeline Render",
) -> RenderResult:
    """Execute a multi-track TimelineRenderPlan via FFmpeg with live progress callbacks."""
    out_file = Path(plan.output_path)
    out_file.parent.mkdir(parents=True, exist_ok=True)

    # Write filter_complex to a temporary UTF-8 script file so Windows CLI length limits
    # never truncate long multi-track graphs.
    tmp_dir = Path(tempfile.mkdtemp(prefix="taktcut_fc_"))
    fc_file = tmp_dir / "filter_complex.txt"
    fc_file.write_text(plan.filter_complex, encoding="utf-8")

    run_argv: list[str] = []
    i = 0
    while i < len(plan.argv):
        tok = plan.argv[i]
        if tok == "-filter_complex" and i + 1 < len(plan.argv):
            run_argv.extend(["-/filter_complex", str(fc_file)])
            i += 2
            continue
        run_argv.append(tok)
        i += 1

    # Insert -progress pipe:1 before output path
    run_argv = [*run_argv[:-1], "-progress", "pipe:1", "-nostats", run_argv[-1]]

    if progress_cb:
        progress_cb(
            TimelineRenderProgress(
                active=True,
                job_label=job_label,
                output_path=plan.output_path,
                percent=0.0,
                total_duration_s=plan.duration_s,
                status="rendering",
            )
        )

    stderr_lines: list[str] = []
    started = time.monotonic()
    rc = 1
    stderr_log = tmp_dir / "ffmpeg_stderr.log"
    try:
        with stderr_log.open("w+", encoding="utf-8", errors="replace") as err_fh:
            proc = subprocess.Popen(
                run_argv,
                stdout=subprocess.PIPE,
                stderr=err_fh,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            cur_time_s = 0.0
            cur_speed = ""
            cur_fps = 0.0
            assert proc.stdout is not None
            for line in proc.stdout:
                line = line.strip()
                if "=" not in line:
                    continue
                k, v = line.split("=", 1)
                if k == "out_time_us":
                    with contextlib.suppress(ValueError):
                        cur_time_s = max(0.0, int(v) / 1_000_000.0)
                elif k == "fps":
                    with contextlib.suppress(ValueError):
                        cur_fps = float(v)
                elif k == "speed":
                    cur_speed = v.strip()
                elif k == "progress" and progress_cb:
                    pct = (
                        100.0
                        if v == "end"
                        else min(99.5, (cur_time_s / max(0.01, plan.duration_s)) * 100.0)
                    )
                    progress_cb(
                        TimelineRenderProgress(
                            active=(v != "end"),
                            job_label=job_label,
                            output_path=plan.output_path,
                            percent=round(pct, 1),
                            out_time_s=round(cur_time_s, 2),
                            total_duration_s=plan.duration_s,
                            speed=cur_speed,
                            fps_encoding=round(cur_fps, 1),
                            status="completed" if v == "end" else "rendering",
                        )
                    )
            rc = proc.wait()
            err_fh.flush()
            err_fh.seek(0)
            stderr_lines = err_fh.read().splitlines()
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    # Automatic fallback to libx264 if hardware NVENC failed at runtime
    if rc != 0 and plan.encoder in ("h264_nvenc", "hevc_nvenc"):
        fallback_argv = list(plan.argv)
        for idx_tok, tok in enumerate(fallback_argv):
            if tok == "h264_nvenc":
                fallback_argv[idx_tok] = "libx264"
            elif tok == "hevc_nvenc":
                fallback_argv[idx_tok] = "libx265"
            elif tok == "p5":
                fallback_argv[idx_tok] = "medium"
            elif tok == "-cq":
                fallback_argv[idx_tok] = "-crf"
        # Strip -rc vbr if present
        cleaned_fb: list[str] = []
        skip_next = False
        for idx_tok, tok in enumerate(fallback_argv):
            if skip_next:
                skip_next = False
                continue
            if tok == "-rc" and idx_tok + 1 < len(fallback_argv):
                skip_next = True
                continue
            cleaned_fb.append(tok)
        fb_plan = plan.model_copy(
            update={
                "encoder": "libx264" if plan.encoder == "h264_nvenc" else "libx265",
                "argv": cleaned_fb,
            }
        )
        return execute_timeline_render_plan(fb_plan, progress_cb=progress_cb, job_label=job_label)

    bytes_written = out_file.stat().st_size if out_file.exists() else 0
    success = rc == 0 and bytes_written > 0
    tail = "\n".join(stderr_lines[-20:])
    if progress_cb:
        progress_cb(
            TimelineRenderProgress(
                active=False,
                job_label=job_label,
                output_path=plan.output_path,
                percent=100.0 if success else 0.0,
                out_time_s=plan.duration_s if success else 0.0,
                total_duration_s=plan.duration_s,
                status="completed" if success else "failed",
                error="" if success else (tail or f"FFmpeg exited with code {rc}"),
            )
        )

    _ = started
    _ = sys.platform
    return RenderResult(
        success=success,
        output_path=plan.output_path,
        encoder=plan.encoder,
        bytes_written=bytes_written,
        returncode=rc,
        stderr_tail=tail,
    )
