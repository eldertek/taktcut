"""Unit tests for Fairlight 32-band FFT spectrum analyzer and transient beat detection."""

from __future__ import annotations

import math

import pytest

from taktcut.audio_analysis import (
    FFT_BAND_COUNT,
    FFT_BAND_FREQS_HZ,
    TransientDetectConfig,
    analyze_audio_spectrum,
    compute_fft_32_bands_from_pcm,
    detect_audio_transients,
    evaluate_fairlight_eq_response_db,
)
from taktcut.render import apply_fairlight_rack_preset
from taktcut.ui.samples import build_sample_timeline


def test_fft_band_grid_is_32_logarithmic_bins() -> None:
    assert FFT_BAND_COUNT == 32
    assert len(FFT_BAND_FREQS_HZ) == 32
    assert FFT_BAND_FREQS_HZ[0] == 20.0
    assert FFT_BAND_FREQS_HZ[-1] == 20000.0
    for idx in range(len(FFT_BAND_FREQS_HZ) - 1):
        assert FFT_BAND_FREQS_HZ[idx] < FFT_BAND_FREQS_HZ[idx + 1]


def test_compute_fft_32_bands_from_pcm_detects_1khz_tone_and_phase() -> None:
    sr = 48000
    n = 2048
    left = [0.5 * math.sin(2.0 * math.pi * 1000.0 * i / sr) for i in range(n)]
    right_in_phase = list(left)
    right_inverted = [-v for v in left]

    bands_in, corr_in, rms_in, peak_in = compute_fft_32_bands_from_pcm(
        left, right_in_phase, sample_rate=sr
    )
    assert len(bands_in) == 32
    assert corr_in > 0.99
    assert -15.0 <= rms_in <= -5.0
    assert -7.0 <= peak_in <= -5.5
    max_idx = max(range(32), key=lambda idx: bands_in[idx])
    assert 750.0 <= FFT_BAND_FREQS_HZ[max_idx] <= 1350.0

    _, corr_inv, _, _ = compute_fft_32_bands_from_pcm(left, right_inverted, sample_rate=sr)
    assert corr_inv < -0.99


def test_analyze_audio_spectrum_honors_tracks_mute_and_fairlight_eq() -> None:
    doc = build_sample_timeline("clean")
    flat_rack = apply_fairlight_rack_preset("flat")
    voice_rack = apply_fairlight_rack_preset("broadcast_voice")

    res_flat = analyze_audio_spectrum(doc, playhead_frame=25, fairlight_rack=flat_rack)
    assert len(res_flat.bands) == 32
    assert res_flat.active_audio_clips >= 1
    assert res_flat.rms_db > -60.0
    assert "showspectrumpic=" in res_flat.ffmpeg_filter
    assert "aphasemeter=" in res_flat.ffmpeg_filter

    res_voice = analyze_audio_spectrum(
        doc,
        playhead_frame=25,
        fairlight_rack=voice_rack,
        peak_hold_prev=[b.peak_hold_db for b in res_flat.bands],
    )
    assert "highpass=f=85.0" in res_voice.ffmpeg_filter
    # HPF 85 Hz attenuates 25 Hz band relative to pre_db
    sub_band = res_voice.bands[1]
    assert sub_band.post_db < sub_band.pre_db
    assert evaluate_fairlight_eq_response_db(voice_rack, 25.0) < -6.0

    muted_doc = doc.model_copy(deep=True)
    for trk in muted_doc.tracks:
        if trk.kind == "audio":
            trk.muted = True
    res_muted = analyze_audio_spectrum(muted_doc, playhead_frame=25, fairlight_rack=flat_rack)
    assert res_muted.active_audio_clips == 0
    assert res_muted.rms_db == -90.0
    assert all(b.post_db == -90.0 for b in res_muted.bands)


def test_detect_audio_transients_and_pcm_impulses() -> None:
    doc = build_sample_timeline("clean")
    res_high = detect_audio_transients(
        doc,
        TransientDetectConfig(
            sensitivity=0.80,
            min_interval_ms=200,
            freq_focus="kick_low",
            marker_color="Gold",
            max_markers=24,
            snap_to_bpm=True,
            bpm=120.0,
        ),
    )
    assert res_high.peak_count > 0
    assert res_high.peak_count == len(res_high.peaks) == len(res_high.markers)
    assert all(m.color == "Gold" for m in res_high.markers)
    assert all(m.name.startswith("Beat ") for m in res_high.markers)
    assert 60.0 <= res_high.estimated_bpm <= 200.0
    assert "astats=" in res_high.ffmpeg_filter

    for idx in range(len(res_high.peaks) - 1):
        dt_ms = (
            (res_high.peaks[idx + 1].frame - res_high.peaks[idx].frame)
            / doc.fps.as_float
            * 1000.0
        )
        assert dt_ms >= 150.0

    # Real PCM impulse train at 120 BPM (every 0.5s) on 25 fps timeline
    sr = 48000
    dur_s = 3.0
    pcm = [0.0] * int(sr * dur_s)
    for hit_s in (0.5, 1.0, 1.5, 2.0):
        idx0 = int(hit_s * sr) - 600
        for k in range(1600):
            if 0 <= idx0 + k < len(pcm):
                pcm[idx0 + k] = 0.9 * math.sin(2.0 * math.pi * 120.0 * k / sr)
    pcm_res = detect_audio_transients(
        doc,
        TransientDetectConfig(sensitivity=0.7, min_interval_ms=250, freq_focus="full"),
        pcm_mono=pcm,
        sample_rate=sr,
    )
    assert pcm_res.peak_count >= 3
    assert any(abs(pk.frame - 12) <= 2 for pk in pcm_res.peaks)


def test_transient_detect_config_validation_rejects_invalid_values() -> None:
    with pytest.raises(ValueError):
        TransientDetectConfig(sensitivity=1.5)
    with pytest.raises(ValueError):
        TransientDetectConfig(min_interval_ms=20)
    with pytest.raises(ValueError):
        TransientDetectConfig(freq_focus="bogus")  # type: ignore[arg-type]
    with pytest.raises(ValueError):
        TransientDetectConfig(marker_color="Purple")
