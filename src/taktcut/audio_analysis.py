"""Fairlight 32-band FFT spectrum, stereo correlation, and transient beat detection."""

from __future__ import annotations

import math
import shutil
import struct
import subprocess
from collections.abc import Sequence
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from taktcut.models import (
    BPM_DEFAULT,
    BPM_MAX,
    BPM_MIN,
    MARKER_COLOR_PRESETS,
    TimelineClip,
    TimelineDocument,
    TimelineMarker,
    TimelineTrack,
    _check_finite_number,
    compute_bpm_beat_frames,
)
from taktcut.render import (
    FairlightAudioRackParams,
    compile_fairlight_audio_rack_filter,
)

FFT_BAND_COUNT: int = 32
FFT_BAND_FREQS_HZ: tuple[float, ...] = tuple(
    round(20.0 * (1000.0 ** (idx / float(FFT_BAND_COUNT - 1))), 1)
    for idx in range(FFT_BAND_COUNT)
)

TransientFocusBand = Literal["full", "kick_low", "snare_mid", "hihat_high"]
ALLOWED_TRANSIENT_FOCUS_BANDS: tuple[TransientFocusBand, ...] = (
    "full",
    "kick_low",
    "snare_mid",
    "hihat_high",
)
TRANSIENT_FOCUS_FREQ_RANGES: dict[TransientFocusBand, tuple[float, float]] = {
    "full": (20.0, 20000.0),
    "kick_low": (28.0, 180.0),
    "snare_mid": (180.0, 3200.0),
    "hihat_high": (3200.0, 18000.0),
}

TRANSIENT_SENSITIVITY_MIN: float = 0.10
TRANSIENT_SENSITIVITY_MAX: float = 0.95
TRANSIENT_SENSITIVITY_DEFAULT: float = 0.55
TRANSIENT_MIN_INTERVAL_MS_MIN: int = 80
TRANSIENT_MIN_INTERVAL_MS_MAX: int = 1000
TRANSIENT_MIN_INTERVAL_MS_DEFAULT: int = 220
TRANSIENT_MAX_MARKERS_LIMIT: int = 64


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _format_freq_label(freq_hz: float) -> str:
    if freq_hz >= 1000.0:
        khz = freq_hz / 1000.0
        if abs(khz - round(khz)) < 0.08:
            return f"{int(round(khz))}k"
        return f"{khz:.1f}k"
    return str(int(round(freq_hz)))


def validate_transient_focus_band(raw: Any) -> TransientFocusBand:
    """Validate and normalize a transient frequency focus band."""
    if not isinstance(raw, str):
        raise ValueError(f"freq_focus must be a string, got {raw!r}")
    cleaned = raw.strip().lower()
    if cleaned == "full":
        return "full"
    if cleaned == "kick_low":
        return "kick_low"
    if cleaned == "snare_mid":
        return "snare_mid"
    if cleaned == "hihat_high":
        return "hihat_high"
    allowed = ", ".join(ALLOWED_TRANSIENT_FOCUS_BANDS)
    raise ValueError(f"Unsupported freq_focus {raw!r}; expected one of: {allowed}")


def evaluate_fairlight_dynamics_transfer_db(
    rack: FairlightAudioRackParams,
    input_db: float,
) -> float:
    """Evaluate Fairlight Compressor + True-Peak Limiter transfer curve in dBFS."""
    out_db = _clamp(float(input_db), -90.0, 0.0)
    if rack.compressor.enabled:
        comp = rack.compressor
        half_knee = comp.knee_db * 0.5
        if 2.0 * (out_db - comp.threshold_db) < -comp.knee_db:
            pass
        elif 2.0 * abs(out_db - comp.threshold_db) <= comp.knee_db and comp.knee_db > 0.05:
            diff = out_db - comp.threshold_db + half_knee
            out_db = out_db + ((1.0 / comp.ratio - 1.0) * diff * diff) / (2.0 * comp.knee_db)
        else:
            out_db = comp.threshold_db + (out_db - comp.threshold_db) / comp.ratio
        out_db += comp.makeup_db
    if rack.limiter.enabled:
        out_db = min(out_db, rack.limiter.ceiling_db)
    return _clamp(out_db, -90.0, 0.0)


class AudioSpectrumBand(BaseModel):
    """Single logarithmic frequency bin in the 32-band Fairlight FFT analyzer."""

    index: int = Field(ge=0, lt=FFT_BAND_COUNT)
    freq_hz: float = Field(ge=20.0, le=20000.0)
    label: str
    pre_db: float = Field(ge=-90.0, le=0.0)
    post_db: float = Field(ge=-90.0, le=0.0)
    peak_hold_db: float = Field(ge=-90.0, le=0.0)


class AudioSpectrumAnalysis(BaseModel):
    """32-band FFT spectrum snapshot with stereo correlation and dominant frequency."""

    playhead_frame: int = Field(ge=0)
    time_s: float = Field(ge=0.0)
    bands: list[AudioSpectrumBand]
    correlation: float = Field(ge=-1.0, le=1.0)
    rms_db: float = Field(ge=-90.0, le=0.0)
    peak_db: float = Field(ge=-90.0, le=0.0)
    dominant_hz: float = Field(ge=20.0, le=20000.0)
    centroid_hz: float = Field(ge=20.0, le=20000.0)
    active_audio_clips: int = Field(ge=0)
    ffmpeg_filter: str


class TransientDetectConfig(BaseModel):
    """Configuration for deterministic audio transient detection and auto-marking."""

    sensitivity: float = Field(
        default=TRANSIENT_SENSITIVITY_DEFAULT,
        ge=TRANSIENT_SENSITIVITY_MIN,
        le=TRANSIENT_SENSITIVITY_MAX,
    )
    min_interval_ms: int = Field(
        default=TRANSIENT_MIN_INTERVAL_MS_DEFAULT,
        ge=TRANSIENT_MIN_INTERVAL_MS_MIN,
        le=TRANSIENT_MIN_INTERVAL_MS_MAX,
    )
    freq_focus: TransientFocusBand = "full"
    marker_color: str = "Cyan"
    max_markers: int = Field(default=32, ge=1, le=TRANSIENT_MAX_MARKERS_LIMIT)
    snap_to_bpm: bool = False
    bpm: float = Field(default=BPM_DEFAULT, ge=BPM_MIN, le=BPM_MAX)

    @field_validator("sensitivity", "bpm", mode="before")
    @classmethod
    def _validate_finite_float(cls, raw: Any, info: Any) -> float:
        return _check_finite_number(raw, str(info.field_name))

    @field_validator("freq_focus", mode="before")
    @classmethod
    def _validate_focus(cls, raw: Any) -> TransientFocusBand:
        return validate_transient_focus_band(raw)

    @field_validator("marker_color", mode="before")
    @classmethod
    def _validate_marker_color(cls, raw: Any) -> str:
        if not isinstance(raw, str):
            raise ValueError(f"marker_color must be a string, got {raw!r}")
        cleaned = raw.strip().title()
        if cleaned not in MARKER_COLOR_PRESETS:
            allowed = ", ".join(MARKER_COLOR_PRESETS)
            raise ValueError(f"Unsupported marker_color {raw!r}; expected one of: {allowed}")
        return cleaned


class AudioTransientPeak(BaseModel):
    """Detected audio onset / beat transient anchored to an integer timeline frame."""

    frame: int = Field(ge=0)
    time_s: float = Field(ge=0.0)
    strength: float = Field(ge=0.0, le=1.0)
    flux_db: float = Field(ge=0.0, le=60.0)
    band: TransientFocusBand


class TransientAnalysisResult(BaseModel):
    """Result of transient peak detection, BPM estimation, and auto-marker generation."""

    peaks: list[AudioTransientPeak]
    markers: list[TimelineMarker]
    estimated_bpm: float = Field(ge=BPM_MIN, le=BPM_MAX)
    spectral_centroid_hz: float = Field(ge=20.0, le=20000.0)
    peak_count: int = Field(ge=0)
    config: TransientDetectConfig
    ffmpeg_filter: str


def _biquad_magnitude_db(
    b0: float,
    b1: float,
    b2: float,
    a0: float,
    a1: float,
    a2: float,
    w: float,
) -> float:
    cos1 = math.cos(w)
    sin1 = math.sin(w)
    cos2 = math.cos(2.0 * w)
    sin2 = math.sin(2.0 * w)
    num_re = b0 + b1 * cos1 + b2 * cos2
    num_im = -(b1 * sin1 + b2 * sin2)
    den_re = a0 + a1 * cos1 + a2 * cos2
    den_im = -(a1 * sin1 + a2 * sin2)
    num_mag_sq = num_re * num_re + num_im * num_im
    den_mag_sq = max(1e-18, den_re * den_re + den_im * den_im)
    return 10.0 * math.log10(max(1e-9, num_mag_sq / den_mag_sq))


def evaluate_fairlight_eq_response_db(
    rack: FairlightAudioRackParams,
    freq_hz: float,
    sample_rate: float = 48000.0,
) -> float:
    """Evaluate combined Fairlight HPF + 4-band biquad EQ magnitude response in dB."""
    if not rack.eq_enabled:
        return 0.0
    total_db = 0.0
    w = (2.0 * math.pi * _clamp(float(freq_hz), 15.0, sample_rate * 0.48)) / sample_rate
    if rack.hpf_enabled:
        w0 = (2.0 * math.pi * _clamp(rack.hpf_hz, 20.0, 250.0)) / sample_rate
        cos_w0 = math.cos(w0)
        alpha = math.sin(w0) / (2.0 * 0.7071)
        b0 = (1.0 + cos_w0) * 0.5
        b1 = -(1.0 + cos_w0)
        b2 = (1.0 + cos_w0) * 0.5
        a0 = 1.0 + alpha
        a1 = -2.0 * cos_w0
        a2 = 1.0 - alpha
        total_db += _biquad_magnitude_db(b0, b1, b2, a0, a1, a2, w)

    for band in rack.bands:
        if not band.enabled or abs(band.gain_db) <= 1e-6:
            continue
        f0 = _clamp(band.freq_hz, 20.0, sample_rate * 0.45)
        w0 = (2.0 * math.pi * f0) / sample_rate
        cos_w0 = math.cos(w0)
        sin_w0 = math.sin(w0)
        amp = 10.0 ** (band.gain_db / 40.0)
        q_val = _clamp(band.q, 0.3, 10.0)
        alpha = sin_w0 / (2.0 * q_val)

        if band.filter_type == "lowshelf":
            sq_a = math.sqrt(amp)
            b0 = amp * (amp + 1.0 - (amp - 1.0) * cos_w0 + 2.0 * sq_a * alpha)
            b1 = 2.0 * amp * (amp - 1.0 - (amp + 1.0) * cos_w0)
            b2 = amp * (amp + 1.0 - (amp - 1.0) * cos_w0 - 2.0 * sq_a * alpha)
            a0 = amp + 1.0 + (amp - 1.0) * cos_w0 + 2.0 * sq_a * alpha
            a1 = -2.0 * (amp - 1.0 + (amp + 1.0) * cos_w0)
            a2 = amp + 1.0 + (amp - 1.0) * cos_w0 - 2.0 * sq_a * alpha
        elif band.filter_type == "highshelf":
            sq_a = math.sqrt(amp)
            b0 = amp * (amp + 1.0 + (amp - 1.0) * cos_w0 + 2.0 * sq_a * alpha)
            b1 = -2.0 * amp * (amp - 1.0 + (amp + 1.0) * cos_w0)
            b2 = amp * (amp + 1.0 + (amp - 1.0) * cos_w0 - 2.0 * sq_a * alpha)
            a0 = amp + 1.0 - (amp - 1.0) * cos_w0 + 2.0 * sq_a * alpha
            a1 = 2.0 * (amp - 1.0 - (amp + 1.0) * cos_w0)
            a2 = amp + 1.0 - (amp - 1.0) * cos_w0 - 2.0 * sq_a * alpha
        else:
            b0 = 1.0 + alpha * amp
            b1 = -2.0 * cos_w0
            b2 = 1.0 - alpha * amp
            a0 = 1.0 + alpha / amp
            a1 = -2.0 * cos_w0
            a2 = 1.0 - alpha / amp

        total_db += _biquad_magnitude_db(b0, b1, b2, a0, a1, a2, w)

    return _clamp(total_db, -24.0, 24.0)


def _decode_audio_pcm_ffmpeg(
    source_path: Path,
    start_s: float,
    duration_s: float,
    *,
    sample_rate: int = 48000,
) -> tuple[list[float], list[float]] | None:
    """Decode stereo float32 PCM from a real local media file using FFmpeg when available."""
    if not source_path.is_file():
        return None
    ffmpeg_bin = shutil.which("ffmpeg")
    if ffmpeg_bin is None:
        return None
    cmd = [
        ffmpeg_bin,
        "-v",
        "error",
        "-ss",
        f"{max(0.0, start_s):.4f}",
        "-t",
        f"{_clamp(duration_s, 0.02, 30.0):.4f}",
        "-i",
        str(source_path),
        "-vn",
        "-ac",
        "2",
        "-ar",
        str(sample_rate),
        "-f",
        "f32le",
        "pipe:1",
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=6.0, check=False)
    except (OSError, subprocess.SubprocessError):
        return None
    if proc.returncode != 0 or len(proc.stdout) < 16:
        return None

    frame_count = len(proc.stdout) // 8
    if frame_count < 64:
        return None
    samples = struct.unpack(f"<{frame_count * 2}f", proc.stdout[: frame_count * 8])
    left = [float(samples[idx * 2]) for idx in range(frame_count)]
    right = [float(samples[idx * 2 + 1]) for idx in range(frame_count)]
    return left, right


def compute_fft_32_bands_from_pcm(
    left: Sequence[float],
    right: Sequence[float] | None = None,
    *,
    sample_rate: int = 48000,
) -> tuple[list[float], float, float, float]:
    """Compute 32 logarithmic band levels (dBFS), stereo correlation, RMS dBFS, and peak dBFS."""
    n = min(len(left), len(right) if right is not None else len(left), 2048)
    if n < 32:
        return ([-90.0] * FFT_BAND_COUNT, 1.0, -90.0, -90.0)

    l_buf = [float(left[i]) for i in range(n)]
    r_buf = [float(right[i]) for i in range(n)] if right is not None else list(l_buf)

    sum_sq = 0.0
    peak_abs = 0.0
    sum_lr = 0.0
    sum_ll = 0.0
    sum_rr = 0.0
    mono_win: list[float] = []
    win_sum = 0.0

    for i in range(n):
        lv = l_buf[i]
        rv = r_buf[i]
        mv = 0.5 * (lv + rv)
        w = 0.5 * (1.0 - math.cos((2.0 * math.pi * i) / max(1, n - 1)))
        mono_win.append(mv * w)
        win_sum += w
        sum_sq += 0.5 * (lv * lv + rv * rv)
        peak_abs = max(peak_abs, abs(lv), abs(rv))
        sum_lr += lv * rv
        sum_ll += lv * lv
        sum_rr += rv * rv

    rms_lin = math.sqrt(sum_sq / n)
    rms_db = _clamp(20.0 * math.log10(max(1e-5, rms_lin)), -90.0, 0.0)
    peak_db = _clamp(20.0 * math.log10(max(1e-5, peak_abs)), -90.0, 0.0)
    denom = math.sqrt(max(1e-12, sum_ll * sum_rr))
    correlation = _clamp(sum_lr / denom, -1.0, 1.0) if denom > 1e-10 else 1.0

    scale = max(1.0, win_sum * 0.5)
    band_dbs: list[float] = []
    for freq_hz in FFT_BAND_FREQS_HZ:
        omega = (2.0 * math.pi * min(freq_hz, sample_rate * 0.48)) / float(sample_rate)
        coeff = 2.0 * math.cos(omega)
        q1 = 0.0
        q2 = 0.0
        for sample in mono_win:
            q0 = coeff * q1 - q2 + sample
            q2 = q1
            q1 = q0
        power = max(1e-12, q1 * q1 + q2 * q2 - q1 * q2 * coeff)
        mag = math.sqrt(power) / scale
        db = _clamp(20.0 * math.log10(max(1e-5, mag)), -90.0, 0.0)
        band_dbs.append(round(db, 2))

    return band_dbs, round(correlation, 3), round(rms_db, 2), round(peak_db, 2)


def _has_solo_audio_track(doc: TimelineDocument) -> bool:
    return any(trk.kind == "audio" and trk.solo for trk in doc.tracks)


def _is_track_audibly_muted(track: TimelineTrack, any_solo: bool) -> bool:
    if track.kind != "audio":
        return True
    if track.muted:
        return True
    return any_solo and not track.solo


def _clip_fade_envelope_db(clip: TimelineClip, time_in_clip_s: float, clip_dur_s: float) -> float:
    env = 1.0
    if clip.fade_in_s > 1e-4 and time_in_clip_s < clip.fade_in_s:
        env *= _clamp(time_in_clip_s / clip.fade_in_s, 0.02, 1.0)
    if clip.fade_out_s > 1e-4 and (clip_dur_s - time_in_clip_s) < clip.fade_out_s:
        env *= _clamp((clip_dur_s - time_in_clip_s) / clip.fade_out_s, 0.02, 1.0)
    return 20.0 * math.log10(max(0.02, env))


def _classify_audio_clip_profile(clip: TimelineClip) -> Literal["dialogue", "music", "sfx"]:
    hay = f"{clip.name} {clip.source_path or ''}".lower()
    if any(tok in hay for tok in ("vo", "dialog", "speech", "voice", "narr", "interview")):
        return "dialogue"
    if any(tok in hay for tok in ("sfx", "riser", "hit", "whoosh", "fx", "amb")):
        return "sfx"
    return "music"


def _deterministic_clip_spectrum_band_db(
    profile: Literal["dialogue", "music", "sfx"],
    freq_hz: float,
    time_s: float,
    clip_seed: int,
) -> float:
    log_f = math.log10(max(20.0, freq_hz))
    phase_mod = math.sin(time_s * 5.2 + clip_seed * 0.7 + log_f * 2.1)
    beat_pulse = max(0.0, math.sin(time_s * math.pi * (128.0 / 60.0) * 2.0)) ** 3.0

    if profile == "dialogue":
        # Speech energy peaks around 180 Hz fundamental and 1.2 kHz - 3.5 kHz formants
        fund = -12.0 * ((log_f - math.log10(210.0)) ** 2)
        formant = 7.5 * math.exp(-((log_f - math.log10(1900.0)) ** 2) / 0.14)
        air_roll = -14.0 * max(0.0, log_f - math.log10(5500.0))
        sub_roll = -22.0 * max(0.0, math.log10(95.0) - log_f)
        base = -21.0 + fund + formant + air_roll + sub_roll + phase_mod * 3.4
        return _clamp(base, -82.0, -3.0)

    if profile == "sfx":
        sweep_hz = 320.0 + 1800.0 * (0.5 + 0.5 * math.sin(time_s * 2.7 + clip_seed))
        peak = 13.0 * math.exp(-((log_f - math.log10(sweep_hz)) ** 2) / 0.12)
        base = -28.0 + peak - 5.0 * abs(log_f - math.log10(1200.0)) + phase_mod * 4.0
        return _clamp(base, -82.0, -4.0)

    # Music bed: kick weight at 60 Hz, warm mids at 320 Hz, snare/presence at 2.6 kHz, hats at 9 kHz
    kick_bump = 11.0 * beat_pulse * math.exp(-((log_f - math.log10(62.0)) ** 2) / 0.08)
    snare_bump = 7.5 * (1.0 - 0.4 * beat_pulse) * math.exp(
        -((log_f - math.log10(2400.0)) ** 2) / 0.16
    )
    hat_bump = 6.0 * (0.5 + 0.5 * math.sin(time_s * 16.0 + clip_seed)) * math.exp(
        -((log_f - math.log10(9500.0)) ** 2) / 0.11
    )
    pink_tilt = -3.8 * (log_f - math.log10(120.0))
    base = -18.5 + pink_tilt + kick_bump + snare_bump + hat_bump + phase_mod * 2.6
    return _clamp(base, -82.0, -2.5)


def _compile_analyzer_ffmpeg_filter(rack: FairlightAudioRackParams | None) -> str:
    rack_af = compile_fairlight_audio_rack_filter(rack) if rack is not None else None
    prefix = f"{rack_af}," if rack_af else ""
    return (
        f"{prefix}asplit=2[sp_a][sp_b];"
        "[sp_a]showspectrumpic=s=640x240:mode=combined:scale=log:color=intensity[v_spec];"
        "[sp_b]aphasemeter=s=320x48[v_phase]"
    )


def analyze_audio_spectrum(
    doc: TimelineDocument,
    playhead_frame: int = 0,
    *,
    fairlight_rack: FairlightAudioRackParams | None = None,
    master_gain_db: float = 0.0,
    peak_hold_prev: Sequence[float] | None = None,
    pcm_left: Sequence[float] | None = None,
    pcm_right: Sequence[float] | None = None,
    sample_rate: int = 48000,
) -> AudioSpectrumAnalysis:
    """Analyze 32-band logarithmic FFT spectrum and stereo correlation at playhead_frame."""
    fps = max(1.0, doc.fps.as_float)
    clamped_frame = max(0, int(playhead_frame))
    time_s = round(clamped_frame / fps, 4)
    rack = fairlight_rack if fairlight_rack is not None else FairlightAudioRackParams()
    master_gain = _clamp(float(master_gain_db), -48.0, 12.0)

    any_solo = _has_solo_audio_track(doc)
    active_clips: list[tuple[TimelineTrack, TimelineClip]] = []
    for trk in doc.tracks:
        if _is_track_audibly_muted(trk, any_solo):
            continue
        for clip in trk.clips:
            if not clip.enabled or clip.duration_frames <= 0:
                continue
            if clip.start_frame <= clamped_frame < clip.start_frame + clip.duration_frames:
                active_clips.append((trk, clip))

    pre_dbs: list[float] | None = None
    correlation = 0.92
    rms_db = -90.0
    peak_db = -90.0

    if pcm_left is not None and len(pcm_left) >= 32:
        pre_dbs, correlation, rms_db, peak_db = compute_fft_32_bands_from_pcm(
            pcm_left,
            pcm_right,
            sample_rate=sample_rate,
        )
    elif active_clips:
        for _, clip in active_clips:
            if clip.source_path:
                clip_offset_s = (
                    (clamped_frame - clip.start_frame + clip.source_in_frame) / fps
                )
                decoded = _decode_audio_pcm_ffmpeg(
                    Path(clip.source_path),
                    clip_offset_s,
                    0.045,
                    sample_rate=sample_rate,
                )
                if decoded is not None:
                    pre_dbs, correlation, rms_db, peak_db = compute_fft_32_bands_from_pcm(
                        decoded[0],
                        decoded[1],
                        sample_rate=sample_rate,
                    )
                    break

    if pre_dbs is None:
        if not active_clips:
            pre_dbs = [-90.0] * FFT_BAND_COUNT
            correlation = 1.0
            rms_db = -90.0
            peak_db = -90.0
        else:
            pre_dbs = []
            for freq_hz in FFT_BAND_FREQS_HZ:
                energy_lin = 0.0
                for trk, clip in active_clips:
                    clip_rel_s = (clamped_frame - clip.start_frame) / fps
                    clip_dur_s = clip.duration_frames / fps
                    gain_db = (
                        float(clip.audio_gain_db)
                        + float(trk.volume_db)
                        + master_gain
                        + _clip_fade_envelope_db(clip, clip_rel_s, clip_dur_s)
                    )
                    profile = _classify_audio_clip_profile(clip)
                    seed = sum(ord(ch) for ch in clip.name) + trk.index * 17
                    bin_db = _deterministic_clip_spectrum_band_db(profile, freq_hz, time_s, seed)
                    total_bin_db = _clamp(bin_db + gain_db, -90.0, 0.0)
                    energy_lin += 10.0 ** (total_bin_db / 10.0)
                pre_val = _clamp(10.0 * math.log10(max(1e-9, energy_lin)), -90.0, 0.0)
                pre_dbs.append(round(pre_val, 2))

            pan_spread = sum(abs(trk.pan) for trk, _ in active_clips) / len(active_clips)
            correlation = round(
                _clamp(0.94 - pan_spread * 0.35 + 0.04 * math.sin(time_s * 3.1), -1.0, 1.0),
                3,
            )

    post_dbs: list[float] = []
    bands: list[AudioSpectrumBand] = []
    weighted_log_f = 0.0
    total_weight = 0.0
    best_idx = 0
    best_db = -91.0
    sum_lin = 0.0

    for idx, freq_hz in enumerate(FFT_BAND_FREQS_HZ):
        pre_val = pre_dbs[idx]
        if pre_val <= -89.5:
            post_val = -90.0
        else:
            eq_delta = evaluate_fairlight_eq_response_db(
                rack, freq_hz, sample_rate=float(sample_rate)
            )
            shaped = _clamp(pre_val + eq_delta, -90.0, 0.0)
            post_val = _clamp(evaluate_fairlight_dynamics_transfer_db(rack, shaped), -90.0, 0.0)

        prev_hold = (
            float(peak_hold_prev[idx])
            if peak_hold_prev is not None and idx < len(peak_hold_prev)
            else post_val
        )
        peak_hold = _clamp(max(post_val, prev_hold - 0.6), -90.0, 0.0)
        post_dbs.append(round(post_val, 2))
        bands.append(
            AudioSpectrumBand(
                index=idx,
                freq_hz=freq_hz,
                label=_format_freq_label(freq_hz),
                pre_db=round(pre_val, 2),
                post_db=round(post_val, 2),
                peak_hold_db=round(peak_hold, 2),
            )
        )
        if post_val > best_db:
            best_db = post_val
            best_idx = idx
        w_lin = 10.0 ** (post_val / 20.0) if post_val > -89.5 else 0.0
        sum_lin += w_lin * w_lin
        weighted_log_f += w_lin * math.log10(freq_hz)
        total_weight += w_lin

    if active_clips or (pcm_left is not None and len(pcm_left) >= 32):
        avg_lin = math.sqrt(max(1e-10, sum_lin / max(1, FFT_BAND_COUNT)))
        rms_db = round(_clamp(20.0 * math.log10(max(1e-5, avg_lin)) + 6.0, -90.0, 0.0), 2)
        peak_db = round(_clamp(max(post_dbs), -90.0, 0.0), 2)

    centroid_hz = (
        round(_clamp(10.0 ** (weighted_log_f / total_weight), 20.0, 20000.0), 1)
        if total_weight > 1e-6
        else 1000.0
    )
    dominant_hz = FFT_BAND_FREQS_HZ[best_idx]

    return AudioSpectrumAnalysis(
        playhead_frame=clamped_frame,
        time_s=time_s,
        bands=bands,
        correlation=correlation,
        rms_db=rms_db,
        peak_db=peak_db,
        dominant_hz=dominant_hz,
        centroid_hz=centroid_hz,
        active_audio_clips=len(active_clips),
        ffmpeg_filter=_compile_analyzer_ffmpeg_filter(rack),
    )


def _compute_timeline_max_frame(doc: TimelineDocument) -> int:
    max_f = doc.start_frame + 1
    for trk in doc.tracks:
        for clip in trk.clips:
            max_f = max(max_f, clip.start_frame + max(0, clip.duration_frames))
    return max_f


def _estimate_bpm_from_frames(frames: Sequence[int], fps_rate: float) -> float:
    if len(frames) < 2:
        return BPM_DEFAULT
    buckets: dict[int, float] = {}
    for idx in range(len(frames) - 1):
        dt = (frames[idx + 1] - frames[idx]) / max(1.0, fps_rate)
        if dt <= 0.05:
            continue
        raw_bpm = 60.0 / dt
        while raw_bpm < BPM_MIN:
            raw_bpm *= 2.0
        while raw_bpm > BPM_MAX:
            raw_bpm *= 0.5
        if BPM_MIN <= raw_bpm <= BPM_MAX:
            key = round(raw_bpm)
            buckets[key] = buckets.get(key, 0.0) + 1.0
    if not buckets:
        return BPM_DEFAULT
    best_bpm = max(buckets.items(), key=lambda item: (item[1], -abs(item[0] - BPM_DEFAULT)))[0]
    return float(_clamp(float(best_bpm), BPM_MIN, BPM_MAX))


def _compute_pcm_onset_envelope(
    pcm_mono: Sequence[float],
    fps_rate: float,
    total_frames: int,
    sample_rate: int,
    focus: TransientFocusBand,
) -> list[float]:
    hop = max(1, int(round(sample_rate / max(1.0, fps_rate))))
    lo_hz, hi_hz = TRANSIENT_FOCUS_FREQ_RANGES[focus]
    target_freqs = [f for f in FFT_BAND_FREQS_HZ if lo_hz <= f <= hi_hz]
    if not target_freqs:
        target_freqs = [1000.0]
    # Subsample up to 6 representative center frequencies for fast O(N) onset flux
    step = max(1, len(target_freqs) // 6)
    probe_freqs = target_freqs[::step]

    prev_energies = [0.0] * len(probe_freqs)
    flux_vals: list[float] = []
    n_samples = len(pcm_mono)
    win_len = min(1024, max(128, hop))

    for frame_idx in range(total_frames):
        center = frame_idx * hop
        if center >= n_samples:
            flux_vals.append(0.0)
            continue
        start = max(0, center - win_len // 2)
        end = min(n_samples, start + win_len)
        seg = pcm_mono[start:end]
        if len(seg) < 16:
            flux_vals.append(0.0)
            continue

        frame_flux = 0.0
        for f_idx, freq_hz in enumerate(probe_freqs):
            omega = (2.0 * math.pi * min(freq_hz, sample_rate * 0.48)) / float(sample_rate)
            coeff = 2.0 * math.cos(omega)
            q1 = 0.0
            q2 = 0.0
            for val in seg:
                q0 = coeff * q1 - q2 + float(val)
                q2 = q1
                q1 = q0
            energy = math.sqrt(max(0.0, q1 * q1 + q2 * q2 - q1 * q2 * coeff)) / len(seg)
            diff = max(0.0, energy - prev_energies[f_idx])
            prev_energies[f_idx] = energy
            frame_flux += diff
        flux_vals.append(frame_flux / max(1, len(probe_freqs)))

    max_flux = max(flux_vals, default=0.0)
    if max_flux <= 1e-9:
        return [0.0] * len(flux_vals)
    return [_clamp(v / max_flux, 0.0, 1.0) for v in flux_vals]


def detect_audio_transients(
    doc: TimelineDocument,
    config: TransientDetectConfig | dict[str, Any] | None = None,
    *,
    fairlight_rack: FairlightAudioRackParams | None = None,
    pcm_mono: Sequence[float] | None = None,
    sample_rate: int = 48000,
) -> TransientAnalysisResult:
    """Detect rhythmic beat/onset transients across timeline audio and generate TimelineMarkers."""
    cfg = (
        config
        if isinstance(config, TransientDetectConfig)
        else TransientDetectConfig.model_validate(config or {})
    )
    fps_rate = max(1.0, doc.fps.as_float)
    start_frame = max(0, doc.start_frame)
    max_frame = max(start_frame + 1, _compute_timeline_max_frame(doc))
    total_frames = min(15000, max_frame - start_frame)
    any_solo = _has_solo_audio_track(doc)

    active_audio_clips: list[tuple[TimelineTrack, TimelineClip]] = []
    for trk in doc.tracks:
        if _is_track_audibly_muted(trk, any_solo):
            continue
        for clip in trk.clips:
            if clip.enabled and clip.duration_frames > 0:
                active_audio_clips.append((trk, clip))

    envelope: list[float] | None = None
    if pcm_mono is not None and len(pcm_mono) >= 64:
        envelope = _compute_pcm_onset_envelope(
            pcm_mono, fps_rate, total_frames, sample_rate, cfg.freq_focus
        )
    elif active_audio_clips:
        for _, clip in active_audio_clips:
            if clip.source_path:
                decoded = _decode_audio_pcm_ffmpeg(
                    Path(clip.source_path),
                    max(0.0, clip.source_in_frame / fps_rate),
                    min(30.0, clip.duration_frames / fps_rate),
                    sample_rate=sample_rate,
                )
                if decoded is not None:
                    mono = [
                        0.5 * (l_v + r_v)
                        for l_v, r_v in zip(decoded[0], decoded[1], strict=False)
                    ]
                    envelope = _compute_pcm_onset_envelope(
                        mono, fps_rate, total_frames, sample_rate, cfg.freq_focus
                    )
                    break

    if envelope is None:
        envelope = [0.0] * total_frames
        if active_audio_clips:
            beat_period_s = 60.0 / cfg.bpm
            for rel_f in range(total_frames):
                abs_f = start_frame + rel_f
                t_s = abs_f / fps_rate
                frame_energy = 0.0
                for trk, clip in active_audio_clips:
                    if not (clip.start_frame <= abs_f < clip.start_frame + clip.duration_frames):
                        continue
                    profile = _classify_audio_clip_profile(clip)
                    gain_db = _clamp(clip.audio_gain_db + trk.volume_db, -36.0, 12.0)
                    gain_lin = _clamp(10.0 ** (gain_db / 20.0), 0.05, 2.5)
                    beat_phase = (t_s / beat_period_s) % 1.0
                    half_beat_phase = (t_s / (beat_period_s * 0.5)) % 1.0
                    kick_hit = math.exp(-((beat_phase * 9.0) ** 2))
                    snare_phase = ((t_s - beat_period_s * 0.5) / (beat_period_s * 2.0)) % 1.0
                    snare_hit = math.exp(-((snare_phase * 14.0) ** 2)) * 0.92
                    hat_hit = math.exp(-((half_beat_phase * 16.0) ** 2)) * 0.68
                    clip_edge = 1.0 if abs_f == clip.start_frame else 0.0

                    if profile == "dialogue":
                        syllable_phase = ((t_s * 3.1) + 0.17 * trk.index) % 1.0
                        onset = math.exp(-((syllable_phase * 10.0) ** 2)) * 0.72
                    elif profile == "sfx":
                        onset = max(clip_edge, math.exp(-(((t_s * 1.8) % 1.0 * 11.0) ** 2)) * 0.85)
                    else:
                        if cfg.freq_focus == "kick_low":
                            onset = kick_hit
                        elif cfg.freq_focus == "snare_mid":
                            onset = max(snare_hit, kick_hit * 0.45)
                        elif cfg.freq_focus == "hihat_high":
                            onset = max(hat_hit, snare_hit * 0.55)
                        else:
                            onset = max(kick_hit, snare_hit * 0.9, hat_hit * 0.75)
                    frame_energy = max(frame_energy, _clamp(onset * gain_lin, 0.0, 1.0))
                envelope[rel_f] = frame_energy

    threshold = _clamp(1.02 - cfg.sensitivity * 0.85, 0.12, 0.92)
    min_gap_frames = max(1, int(round((cfg.min_interval_ms / 1000.0) * fps_rate)))

    candidate_peaks: list[tuple[int, float]] = []
    last_peak_f = -min_gap_frames * 2
    for rel_f in range(total_frames):
        val = envelope[rel_f]
        if val < threshold:
            continue
        prev_v = envelope[rel_f - 1] if rel_f > 0 else 0.0
        next_v = envelope[rel_f + 1] if rel_f + 1 < total_frames else 0.0
        if val >= prev_v and val >= next_v:
            abs_f = start_frame + rel_f
            if abs_f - last_peak_f >= min_gap_frames:
                candidate_peaks.append((abs_f, val))
                last_peak_f = abs_f
            elif candidate_peaks and val > candidate_peaks[-1][1]:
                candidate_peaks[-1] = (abs_f, val)
                last_peak_f = abs_f

    beat_ticks = (
        compute_bpm_beat_frames(
            doc.fps,
            start_frame,
            start_frame + total_frames,
            bpm=cfg.bpm,
            offset_s=0.0,
        )
        if cfg.snap_to_bpm
        else []
    )
    beat_frames = [bt.frame for bt in beat_ticks]

    peaks: list[AudioTransientPeak] = []
    markers: list[TimelineMarker] = []
    seen_frames: set[int] = set()
    for raw_frame, strength in candidate_peaks:
        final_frame = raw_frame
        if beat_frames:
            nearest = min(beat_frames, key=lambda bf: abs(bf - raw_frame))
            if abs(nearest - raw_frame) <= max(2, int(round(fps_rate * 0.08))):
                final_frame = nearest
        if final_frame in seen_frames:
            continue
        seen_frames.add(final_frame)
        t_s = round(final_frame / fps_rate, 3)
        flux_db = round(_clamp(strength * 36.0, 0.0, 60.0), 2)
        peaks.append(
            AudioTransientPeak(
                frame=final_frame,
                time_s=t_s,
                strength=round(strength, 3),
                flux_db=flux_db,
                band=cfg.freq_focus,
            )
        )
        idx = len(peaks)
        markers.append(
            TimelineMarker(
                name=f"Beat {idx}" if cfg.snap_to_bpm else f"Transient {idx}",
                frame=final_frame,
                duration_frames=1,
                color=cfg.marker_color,
                note=f"{cfg.freq_focus} | +{flux_db:.1f} dB @ {t_s:.2f}s",
            )
        )
        if len(peaks) >= cfg.max_markers:
            break

    est_bpm = _estimate_bpm_from_frames([p.frame for p in peaks], fps_rate)
    lo_hz, hi_hz = TRANSIENT_FOCUS_FREQ_RANGES[cfg.freq_focus]
    centroid_hz = round(math.sqrt(lo_hz * hi_hz), 1)
    spec = analyze_audio_spectrum(
        doc,
        peaks[0].frame if peaks else start_frame,
        fairlight_rack=fairlight_rack,
    )
    if spec.active_audio_clips > 0:
        centroid_hz = spec.centroid_hz

    rack_af = (
        compile_fairlight_audio_rack_filter(fairlight_rack)
        if fairlight_rack is not None
        else None
    )
    prefix = f"{rack_af}," if rack_af else ""
    ffmpeg_filter = (
        f"{prefix}highpass=f={lo_hz:.1f},lowpass=f={hi_hz:.1f},"
        "astats=metadata=1:reset=1,ebur128=metadata=1"
    )

    return TransientAnalysisResult(
        peaks=peaks,
        markers=markers,
        estimated_bpm=est_bpm,
        spectral_centroid_hz=centroid_hz,
        peak_count=len(peaks),
        config=cfg,
        ffmpeg_filter=ffmpeg_filter,
    )
