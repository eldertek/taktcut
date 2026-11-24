"""False Color IRE Exposure, Zebra Clipping & Broadcast Legal Gamut Limiter Studio."""

from __future__ import annotations

import math
import shutil
import subprocess
from collections.abc import Sequence
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from taktcut.security import MEDIA_SUFFIXES, confine_workspace_path

FalseColorPalette = Literal["arri_ire", "atomos_ire", "davinci_exposure"]
BroadcastStandard = Literal["bypass", "ebu_r103", "itu_rec709", "smpte_rp2077"]
BroadcastLimiterMode = Literal["hard_clip", "soft_knee"]
BroadcastComplianceStatus = Literal["PASS", "WARN", "FAIL"]
BroadcastProbeSource = Literal["samples", "ffmpeg_signalstats", "procedural_preview"]

ALLOWED_FALSE_COLOR_PALETTES: tuple[FalseColorPalette, ...] = (
    "arri_ire",
    "atomos_ire",
    "davinci_exposure",
)
ALLOWED_BROADCAST_STANDARDS: tuple[BroadcastStandard, ...] = (
    "bypass",
    "ebu_r103",
    "itu_rec709",
    "smpte_rp2077",
)
ALLOWED_LIMITER_MODES: tuple[BroadcastLimiterMode, ...] = ("hard_clip", "soft_knee")

IRE_HISTOGRAM_BIN_COUNT = 32
IRE_HISTOGRAM_MIN = -5.0
IRE_HISTOGRAM_MAX = 109.0


class FalseColorBand(BaseModel):
    """Calibrated IRE exposure zone band for False Color mapping."""

    model_config = ConfigDict(extra="forbid")

    min_ire: float = Field(ge=-10.0, le=120.0)
    max_ire: float = Field(ge=-10.0, le=120.0)
    color_hex: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    label: str = Field(min_length=1, max_length=64)
    stop_note: str = Field(min_length=1, max_length=64)


class BroadcastStandardSpec(BaseModel):
    """Reference legal luma and chroma specification for a broadcast delivery standard."""

    model_config = ConfigDict(extra="forbid")

    standard: BroadcastStandard
    label: str
    luma_min_8bit: int = Field(ge=0, le=64)
    luma_max_8bit: int = Field(ge=180, le=255)
    chroma_min_8bit: int = Field(ge=0, le=64)
    chroma_max_8bit: int = Field(ge=192, le=255)
    excursion_warn_pct: float = Field(ge=0.0, le=100.0)
    excursion_fail_pct: float = Field(ge=0.0, le=100.0)
    summary: str


class ZebraConfig(BaseModel):
    """Dual-threshold Zebra clipping & skin-tone exposure guide settings."""

    model_config = ConfigDict(extra="forbid")

    enabled: bool = False
    high_enabled: bool = True
    high_ire: float = Field(default=95.0, ge=70.0, le=109.0)
    low_enabled: bool = False
    low_ire: float = Field(default=5.0, ge=0.0, le=30.0)
    skin_enabled: bool = False
    skin_min_ire: float = Field(default=48.0, ge=35.0, le=75.0)
    skin_max_ire: float = Field(default=62.0, ge=40.0, le=80.0)

    @model_validator(mode="after")
    def _validate_skin_range(self) -> ZebraConfig:
        if self.skin_max_ire <= self.skin_min_ire:
            raise ValueError("zebra.skin_max_ire must be strictly greater than skin_min_ire")
        return self


class BroadcastMonitorConfig(BaseModel):
    """Unified False Color, Zebra, and Broadcast Legal Gamut Limiter configuration."""

    model_config = ConfigDict(extra="forbid")

    false_color_enabled: bool = False
    false_color_palette: FalseColorPalette = "arri_ire"
    false_color_opacity: float = Field(default=0.92, ge=0.25, le=1.0)
    zebra: ZebraConfig = Field(default_factory=ZebraConfig)
    broadcast_standard: BroadcastStandard = "ebu_r103"
    limiter_enabled: bool = False
    limiter_mode: BroadcastLimiterMode = "soft_knee"
    soft_knee: float = Field(default=0.15, ge=0.0, le=1.0)
    luma_min_8bit: int = Field(default=16, ge=0, le=64)
    luma_max_8bit: int = Field(default=235, ge=180, le=255)
    chroma_max_8bit: int = Field(default=240, ge=192, le=255)
    gamut_desaturate_illegal: bool = True

    @model_validator(mode="after")
    def _validate_bounds(self) -> BroadcastMonitorConfig:
        if self.luma_max_8bit <= self.luma_min_8bit:
            raise ValueError("luma_max_8bit must be strictly greater than luma_min_8bit")
        return self


class BroadcastComplianceReport(BaseModel):
    """Luminance histogram, IRE statistics, and broadcast legal compliance audit."""

    model_config = ConfigDict(extra="forbid")

    standard: BroadcastStandard
    limiter_applied: bool
    sample_count: int = Field(ge=1)
    min_ire: float
    max_ire: float
    avg_ire: float
    min_luma_8bit: int = Field(ge=0, le=255)
    peak_luma_8bit: int = Field(ge=0, le=255)
    sub_black_pct: float = Field(ge=0.0, le=100.0)
    super_white_pct: float = Field(ge=0.0, le=100.0)
    skin_zone_pct: float = Field(ge=0.0, le=100.0)
    zebra_high_pct: float = Field(ge=0.0, le=100.0)
    zebra_low_pct: float = Field(ge=0.0, le=100.0)
    gamut_illegal_pct: float = Field(ge=0.0, le=100.0)
    histogram_bins: list[float]
    compliance_status: BroadcastComplianceStatus
    violations: list[str]
    probe_source: BroadcastProbeSource
    filtergraph: str


class BroadcastFilterCompileResult(BaseModel):
    """Compiled FFmpeg broadcast legal limiter and diagnostic filtergraph."""

    model_config = ConfigDict(extra="forbid")

    filtergraph: str
    vf_args: list[str]
    standard: BroadcastStandard
    limiter_enabled: bool
    limiter_mode: BroadcastLimiterMode
    legal_min_8bit: int
    legal_max_8bit: int
    chroma_max_8bit: int
    signalstats_probe_vf: str
    warnings: list[str]


def _band(
    min_ire: float,
    max_ire: float,
    color_hex: str,
    label: str,
    stop_note: str,
) -> FalseColorBand:
    return FalseColorBand(
        min_ire=min_ire,
        max_ire=max_ire,
        color_hex=color_hex,
        label=label,
        stop_note=stop_note,
    )


FALSE_COLOR_PALETTES: dict[FalseColorPalette, list[FalseColorBand]] = {
    "arri_ire": [
        _band(-10.0, 3.0, "#5b21b6", "Crush", "< 3 IRE"),
        _band(3.0, 12.0, "#2563eb", "Deep Shadow", "3-12 IRE"),
        _band(12.0, 25.0, "#0891b2", "Shadow", "12-25 IRE"),
        _band(25.0, 38.0, "#0d9488", "Low Mid", "25-38 IRE"),
        _band(38.0, 45.0, "#16a34a", "18% Grey", "38-45 IRE"),
        _band(45.0, 55.0, "#65a30d", "Neutral Mid", "45-55 IRE"),
        _band(55.0, 68.0, "#f472b6", "Skin Key", "55-68 IRE"),
        _band(68.0, 82.0, "#cbd5e1", "Highlight", "68-82 IRE"),
        _band(82.0, 94.0, "#eab308", "Caution", "82-94 IRE"),
        _band(94.0, 100.0, "#f97316", "Hot White", "94-100 IRE"),
        _band(100.0, 120.0, "#ef4444", "Clipped", ">= 100 IRE"),
    ],
    "atomos_ire": [
        _band(-10.0, 5.0, "#4338ca", "Black Clip", "< 5 IRE"),
        _band(5.0, 20.0, "#0284c7", "Shadows", "5-20 IRE"),
        _band(20.0, 40.0, "#0f766e", "Dark Mid", "20-40 IRE"),
        _band(40.0, 50.0, "#22c55e", "Mid Grey", "40-50 IRE"),
        _band(50.0, 65.0, "#ec4899", "Skin Tone", "50-65 IRE"),
        _band(65.0, 85.0, "#94a3b8", "Upper Mid", "65-85 IRE"),
        _band(85.0, 98.0, "#facc15", "Over Warn", "85-98 IRE"),
        _band(98.0, 120.0, "#dc2626", "White Clip", ">= 98 IRE"),
    ],
    "davinci_exposure": [
        _band(-10.0, 4.0, "#6d28d9", "Sub-Black", "< 4 IRE"),
        _band(4.0, 18.0, "#1d4ed8", "Toe", "4-18 IRE"),
        _band(18.0, 36.0, "#06b6d4", "Lower Key", "18-36 IRE"),
        _band(36.0, 46.0, "#10b981", "Middle Grey", "36-46 IRE"),
        _band(46.0, 62.0, "#f472b6", "Skin Zone", "46-62 IRE"),
        _band(62.0, 80.0, "#e2e8f0", "Shoulder", "62-80 IRE"),
        _band(80.0, 95.0, "#f59e0b", "Peak Warn", "80-95 IRE"),
        _band(95.0, 120.0, "#ef4444", "Legal Over", ">= 95 IRE"),
    ],
}

BROADCAST_STANDARD_SPECS: dict[BroadcastStandard, BroadcastStandardSpec] = {
    "bypass": BroadcastStandardSpec(
        standard="bypass",
        label="Full Range Bypass (0-255)",
        luma_min_8bit=0,
        luma_max_8bit=255,
        chroma_min_8bit=0,
        chroma_max_8bit=255,
        excursion_warn_pct=100.0,
        excursion_fail_pct=100.0,
        summary="Full-range 0-255 monitoring only; no broadcast legal clamping applied.",
    ),
    "ebu_r103": BroadcastStandardSpec(
        standard="ebu_r103",
        label="EBU R103 Broadcast Safe (16-235)",
        luma_min_8bit=16,
        luma_max_8bit=235,
        chroma_min_8bit=16,
        chroma_max_8bit=240,
        excursion_warn_pct=0.25,
        excursion_fail_pct=1.0,
        summary="EBU R103 studio range Y 16-235, C 16-240, max 1.0% transient excursion.",
    ),
    "itu_rec709": BroadcastStandardSpec(
        standard="itu_rec709",
        label="ITU-R BT.709 Legal (16-235)",
        luma_min_8bit=16,
        luma_max_8bit=235,
        chroma_min_8bit=16,
        chroma_max_8bit=240,
        excursion_warn_pct=0.5,
        excursion_fail_pct=2.0,
        summary="ITU-R BT.709 8-bit studio swing Y 16-235 and Cb/Cr 16-240.",
    ),
    "smpte_rp2077": BroadcastStandardSpec(
        standard="smpte_rp2077",
        label="SMPTE RP 2077 Soft Limiter (16-235)",
        luma_min_8bit=16,
        luma_max_8bit=235,
        chroma_min_8bit=16,
        chroma_max_8bit=240,
        excursion_warn_pct=0.5,
        excursion_fail_pct=1.5,
        summary="SMPTE RP 2077 broadcast television safe gamut with soft-knee rolloff.",
    ),
}


def get_false_color_palette(palette: FalseColorPalette = "arri_ire") -> list[FalseColorBand]:
    """Return calibrated False Color IRE exposure bands for the requested palette."""
    if palette not in FALSE_COLOR_PALETTES:
        raise ValueError(f"Unsupported false_color_palette: {palette!r}")
    return [band.model_copy() for band in FALSE_COLOR_PALETTES[palette]]


def list_broadcast_standards() -> list[BroadcastStandardSpec]:
    """Return all supported broadcast legal standards."""
    return [spec.model_copy() for spec in BROADCAST_STANDARD_SPECS.values()]


def normalize_broadcast_config(
    raw: dict[str, Any] | BroadcastMonitorConfig | None,
) -> BroadcastMonitorConfig:
    """Validate and normalize a BroadcastMonitorConfig payload with strict bounds."""
    if raw is None:
        return BroadcastMonitorConfig()
    if isinstance(raw, BroadcastMonitorConfig):
        return raw
    if not isinstance(raw, dict):
        raise ValueError("BroadcastMonitorConfig payload must be a JSON object")
    data = dict(raw)
    std = str(data.get("broadcast_standard", "ebu_r103")).strip().lower()
    if std not in BROADCAST_STANDARD_SPECS:
        allowed = ", ".join(ALLOWED_BROADCAST_STANDARDS)
        raise ValueError(f"Unsupported broadcast_standard {std!r}; expected one of: {allowed}")
    data["broadcast_standard"] = std
    if std == "bypass":
        data.setdefault("luma_min_8bit", 0)
        data.setdefault("luma_max_8bit", 255)
        data.setdefault("chroma_max_8bit", 255)
    return BroadcastMonitorConfig.model_validate(data)


def luma_8bit_to_ire(luma_8bit: float) -> float:
    """Convert 8-bit level (0-255) to IRE relative to broadcast studio range (16=0, 235=100)."""
    return ((float(luma_8bit) - 16.0) / 219.0) * 100.0


def ire_to_luma_8bit(ire: float) -> float:
    """Convert IRE value to 8-bit studio video code (0 IRE = 16, 100 IRE = 235)."""
    return max(0.0, min(255.0, 16.0 + (float(ire) / 100.0) * 219.0))


def full_range_rgb_to_luma_8bit(r: float, g: float, b: float) -> float:
    """Compute ITU-R BT.709 luma from 8-bit RGB channels (0-255)."""
    return 0.2126 * float(r) + 0.7152 * float(g) + 0.0722 * float(b)


def _soft_knee_clamp_channel(val: float, lo: float, hi: float, knee_ratio: float) -> float:
    """Clamp a single 0-255 channel into [lo, hi] with optional smooth shoulder/toe rolloff."""
    if knee_ratio <= 0.001:
        return max(lo, min(hi, val))
    span = max(1.0, hi - lo)
    knee = max(2.0, span * min(0.35, knee_ratio * 0.25))
    hi_start = hi - knee
    lo_end = lo + knee
    if val > hi_start:
        over = max(0.0, val - hi_start)
        compressed = hi_start + knee * math.tanh(over / max(1.0, knee * 1.35))
        return min(hi, compressed)
    if val < lo_end:
        under = max(0.0, lo_end - val)
        compressed = lo_end - knee * math.tanh(under / max(1.0, knee * 1.35))
        return max(lo, compressed)
    return val


def apply_broadcast_legal_clamp(
    r: float,
    g: float,
    b: float,
    config: BroadcastMonitorConfig,
) -> tuple[float, float, float]:
    """Clamp an 8-bit RGB triplet into broadcast legal limits when limiter is enabled."""
    if not config.limiter_enabled or config.broadcast_standard == "bypass":
        return (
            max(0.0, min(255.0, float(r))),
            max(0.0, min(255.0, float(g))),
            max(0.0, min(255.0, float(b))),
        )
    lo = float(config.luma_min_8bit)
    hi = float(config.luma_max_8bit)
    knee = config.soft_knee if config.limiter_mode == "soft_knee" else 0.0

    rr = _soft_knee_clamp_channel(float(r), lo, hi, knee)
    gg = _soft_knee_clamp_channel(float(g), lo, hi, knee)
    bb = _soft_knee_clamp_channel(float(b), lo, hi, knee)

    if config.gamut_desaturate_illegal:
        # Guard excessive chroma excursion relative to BT.709 luma
        y = full_range_rgb_to_luma_8bit(rr, gg, bb)
        max_chroma_radius = max(12.0, (float(config.chroma_max_8bit) - 128.0) * 1.1)
        peak_diff = max(abs(rr - y), abs(gg - y), abs(bb - y))
        if peak_diff > max_chroma_radius and peak_diff > 0.001:
            scale = max_chroma_radius / peak_diff
            rr = max(lo, min(hi, y + (rr - y) * scale))
            gg = max(lo, min(hi, y + (gg - y) * scale))
            bb = max(lo, min(hi, y + (bb - y) * scale))

    return (round(rr, 3), round(gg, 3), round(bb, 3))


def compile_broadcast_legal_filtergraph(
    config: BroadcastMonitorConfig,
) -> BroadcastFilterCompileResult:
    """Compile validated BroadcastMonitorConfig into a safe FFmpeg legal limiter filtergraph."""
    spec = BROADCAST_STANDARD_SPECS[config.broadcast_standard]
    warnings: list[str] = []
    lo = config.luma_min_8bit
    hi = config.luma_max_8bit
    chroma_hi = config.chroma_max_8bit
    chroma_lo = max(0, 256 - chroma_hi) if chroma_hi < 255 else 0

    signalstats_vf = "signalstats=stat=tout+vrep+brng,metadata=print:file=-"

    if not config.limiter_enabled or config.broadcast_standard == "bypass":
        if config.broadcast_standard != "bypass" and not config.limiter_enabled:
            warnings.append(
                "Broadcast legal limiter is bypassed; output may exceed legal 16-235 range."
            )
        return BroadcastFilterCompileResult(
            filtergraph="null",
            vf_args=[],
            standard=config.broadcast_standard,
            limiter_enabled=False,
            limiter_mode=config.limiter_mode,
            legal_min_8bit=spec.luma_min_8bit,
            legal_max_8bit=spec.luma_max_8bit,
            chroma_max_8bit=spec.chroma_max_8bit,
            signalstats_probe_vf=signalstats_vf,
            warnings=warnings,
        )

    filters: list[str] = []
    if config.limiter_mode == "soft_knee" and config.soft_knee > 0.0:
        span = max(1, hi - lo)
        knee_px = max(2, int(round(span * min(0.35, config.soft_knee * 0.25))))
        hi_start = hi - knee_px
        lo_end = lo + knee_px
        y_hi = f"{hi_start}+{knee_px}*((val-{hi_start})/({knee_px}+(val-{hi_start})))"
        y_lo = f"{lo_end}-{knee_px}*(({lo_end}-val)/({knee_px}+({lo_end}-val)))"
        y_expr = f"if(gt(val,{hi_start}),{y_hi},if(lt(val,{lo_end}),{y_lo},val))"
        c_clamp = f"clip(val,{chroma_lo},{chroma_hi})"
        filters.append(f"lutyuv=y='{y_expr}':u='{c_clamp}':v='{c_clamp}'")

    if config.gamut_desaturate_illegal:
        rgb_clamp = f"clip(val,{lo},{hi})"
        filters.append(f"lutrgb=r='{rgb_clamp}':g='{rgb_clamp}':b='{rgb_clamp}'")

    filters.append(f"limiter=min={lo}:max={hi}:planes=7")
    fg = ",".join(filters)
    return BroadcastFilterCompileResult(
        filtergraph=fg,
        vf_args=["-vf", fg],
        standard=config.broadcast_standard,
        limiter_enabled=True,
        limiter_mode=config.limiter_mode,
        legal_min_8bit=lo,
        legal_max_8bit=hi,
        chroma_max_8bit=chroma_hi,
        signalstats_probe_vf=signalstats_vf,
        warnings=warnings,
    )


def _generate_procedural_rgb_samples(count: int = 128) -> list[tuple[float, float, float]]:
    """Generate deterministic studio test-chart + highlight/shadow excursion RGB samples."""
    samples: list[tuple[float, float, float]] = []
    n = max(32, count)
    for idx in range(n):
        t = idx / float(max(1, n - 1))
        if idx % 16 == 0:
            samples.append(
                (248.0, 246.0, 242.0) if (idx // 16) % 2 == 0 else (8.0, 10.0, 12.0)
            )
        elif idx % 7 == 0:
            samples.append((182.0, 134.0, 112.0))
        else:
            luma = 14.0 + t * 228.0
            samples.append((min(255.0, luma * 1.03), luma, max(0.0, luma * 0.96)))
    return samples


def _probe_ffmpeg_signalstats(
    media_path: Path,
    workspace_root: Path | None = None,
) -> list[float] | None:
    """Optionally probe real luma distribution via FFmpeg signalstats when available."""
    ffmpeg_bin = shutil.which("ffmpeg")
    if ffmpeg_bin is None:
        return None
    if workspace_root is not None:
        safe_path = confine_workspace_path(
            workspace_root,
            str(media_path),
            must_exist=True,
            allowed_suffixes=MEDIA_SUFFIXES,
        )
    else:
        safe_path = media_path.resolve()
        if not safe_path.exists() or not safe_path.is_file():
            return None
    cmd = [
        ffmpeg_bin,
        "-hide_banner",
        "-nostats",
        "-i",
        str(safe_path),
        "-vf",
        "fps=2,scale=160:90,signalstats,metadata=print:file=-",
        "-frames:v",
        "12",
        "-f",
        "null",
        "-",
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=8, check=False)
    except (OSError, subprocess.SubprocessError):
        return None
    if proc.returncode != 0:
        return None
    lumas: list[float] = []
    for line in proc.stdout.splitlines():
        if (
            "lavfi.signalstats.YAVG=" in line
            or "lavfi.signalstats.YMIN=" in line
            or "lavfi.signalstats.YMAX=" in line
        ):
            try:
                lumas.append(float(line.split("=", 1)[1].strip()))
            except ValueError:
                continue
    return lumas if len(lumas) >= 3 else None


def analyze_broadcast_compliance(
    *,
    luma_samples: Sequence[float] | None = None,
    rgb_samples: Sequence[tuple[float, float, float]] | None = None,
    config: BroadcastMonitorConfig | None = None,
    media_path: str | Path | None = None,
    workspace_root: Path | None = None,
    execute_ffmpeg: bool = False,
) -> BroadcastComplianceReport:
    """Analyze luminance IRE histogram, Zebra triggers, and EBU R103/Rec.709 compliance."""
    cfg = config or BroadcastMonitorConfig()
    spec = BROADCAST_STANDARD_SPECS[cfg.broadcast_standard]
    compiled = compile_broadcast_legal_filtergraph(cfg)

    probe_source: BroadcastProbeSource = "procedural_preview"
    working_rgb: list[tuple[float, float, float]] = []

    if rgb_samples is not None and len(rgb_samples) > 0:
        probe_source = "samples"
        for triplet in rgb_samples:
            if len(triplet) != 3:
                raise ValueError("Each rgb_samples item must be a 3-tuple (R, G, B)")
            working_rgb.append((float(triplet[0]), float(triplet[1]), float(triplet[2])))
    elif luma_samples is not None and len(luma_samples) > 0:
        probe_source = "samples"
        for val in luma_samples:
            v = max(0.0, min(255.0, float(val)))
            working_rgb.append((v, v, v))
    elif execute_ffmpeg and media_path is not None:
        probed = _probe_ffmpeg_signalstats(Path(media_path), workspace_root=workspace_root)
        if probed is not None:
            probe_source = "ffmpeg_signalstats"
            working_rgb = [(v, v, v) for v in probed]

    if not working_rgb:
        working_rgb = _generate_procedural_rgb_samples()

    clamped_rgb = [apply_broadcast_legal_clamp(r, g, b, cfg) for r, g, b in working_rgb]
    luma_values = [full_range_rgb_to_luma_8bit(r, g, b) for r, g, b in clamped_rgb]
    ire_values = [luma_8bit_to_ire(y) for y in luma_values]

    n = len(clamped_rgb)
    bins = [0.0] * IRE_HISTOGRAM_BIN_COUNT
    bin_span = IRE_HISTOGRAM_MAX - IRE_HISTOGRAM_MIN

    sub_black_count = 0
    super_white_count = 0
    skin_count = 0
    zebra_high_count = 0
    zebra_low_count = 0
    gamut_illegal_count = 0

    if cfg.broadcast_standard == "bypass":
        lo_legal = float(spec.luma_min_8bit)
        hi_legal = float(spec.luma_max_8bit)
    else:
        lo_legal = float(cfg.luma_min_8bit)
        hi_legal = float(cfg.luma_max_8bit)
    chroma_max_dev = max(12.0, (float(cfg.chroma_max_8bit) - 128.0) * 1.1)

    for (r, g, b), y, ire in zip(clamped_rgb, luma_values, ire_values, strict=True):
        norm_idx = int(((ire - IRE_HISTOGRAM_MIN) / bin_span) * IRE_HISTOGRAM_BIN_COUNT)
        b_idx = max(0, min(IRE_HISTOGRAM_BIN_COUNT - 1, norm_idx))
        bins[b_idx] += 1.0

        if y < lo_legal - 0.05:
            sub_black_count += 1
        if y > hi_legal + 0.05:
            super_white_count += 1
        if cfg.zebra.skin_min_ire <= ire <= cfg.zebra.skin_max_ire:
            skin_count += 1
        if ire >= cfg.zebra.high_ire:
            zebra_high_count += 1
        if ire <= cfg.zebra.low_ire:
            zebra_low_count += 1

        if cfg.broadcast_standard != "bypass":
            peak_dev = max(abs(r - y), abs(g - y), abs(b - y))
            if (
                min(r, g, b) < lo_legal - 0.05
                or max(r, g, b) > hi_legal + 0.05
                or peak_dev > chroma_max_dev + 0.05
            ):
                gamut_illegal_count += 1

    peak_bin = max(bins) if bins else 1.0
    norm_bins = [round(val / max(1.0, peak_bin), 4) for val in bins]

    sub_black_pct = round((sub_black_count / n) * 100.0, 2)
    super_white_pct = round((super_white_count / n) * 100.0, 2)
    skin_zone_pct = round((skin_count / n) * 100.0, 2)
    zebra_high_pct = round((zebra_high_count / n) * 100.0, 2)
    zebra_low_pct = round((zebra_low_count / n) * 100.0, 2)
    gamut_illegal_pct = round((gamut_illegal_count / n) * 100.0, 2)

    violations: list[str] = []
    if cfg.broadcast_standard != "bypass":
        if sub_black_pct > 0.0:
            violations.append(
                f"Sub-black excursion below {int(lo_legal)} ({sub_black_pct:.2f}%)"
            )
        if super_white_pct > 0.0:
            violations.append(
                f"Super-white excursion above {int(hi_legal)} ({super_white_pct:.2f}%)"
            )
        if gamut_illegal_pct > max(sub_black_pct, super_white_pct):
            violations.append(
                f"Rec.709 RGB/chroma gamut excursion ({gamut_illegal_pct:.2f}%)"
            )

    total_excursion = max(gamut_illegal_pct, sub_black_pct + super_white_pct)
    if cfg.broadcast_standard == "bypass":
        status: BroadcastComplianceStatus = "PASS"
    elif total_excursion >= spec.excursion_fail_pct:
        status = "FAIL"
    elif total_excursion > spec.excursion_warn_pct:
        status = "WARN"
    else:
        status = "PASS"

    return BroadcastComplianceReport(
        standard=cfg.broadcast_standard,
        limiter_applied=compiled.limiter_enabled,
        sample_count=n,
        min_ire=round(min(ire_values), 2),
        max_ire=round(max(ire_values), 2),
        avg_ire=round(sum(ire_values) / n, 2),
        min_luma_8bit=int(round(min(luma_values))),
        peak_luma_8bit=int(round(max(luma_values))),
        sub_black_pct=sub_black_pct,
        super_white_pct=super_white_pct,
        skin_zone_pct=skin_zone_pct,
        zebra_high_pct=zebra_high_pct,
        zebra_low_pct=zebra_low_pct,
        gamut_illegal_pct=gamut_illegal_pct,
        histogram_bins=norm_bins,
        compliance_status=status,
        violations=violations,
        probe_source=probe_source,
        filtergraph=compiled.filtergraph,
    )
