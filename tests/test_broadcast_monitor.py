"""Unit tests for taktcut.broadcast_monitor (False Color, Zebra, EBU R103 Legal Limiter)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from taktcut.broadcast_monitor import (
    ALLOWED_BROADCAST_STANDARDS,
    ALLOWED_FALSE_COLOR_PALETTES,
    IRE_HISTOGRAM_BIN_COUNT,
    BroadcastMonitorConfig,
    ZebraConfig,
    analyze_broadcast_compliance,
    apply_broadcast_legal_clamp,
    compile_broadcast_legal_filtergraph,
    get_false_color_palette,
    ire_to_luma_8bit,
    list_broadcast_standards,
    luma_8bit_to_ire,
    normalize_broadcast_config,
)


def test_false_color_palettes_cover_full_ire_range() -> None:
    for pid in ALLOWED_FALSE_COLOR_PALETTES:
        bands = get_false_color_palette(pid)
        assert len(bands) >= 8
        assert bands[0].min_ire <= 0.0
        assert bands[-1].max_ire >= 100.0
        for idx in range(len(bands) - 1):
            assert bands[idx].max_ire <= bands[idx + 1].min_ire + 0.001

    with pytest.raises(ValueError, match="Unsupported false_color_palette"):
        get_false_color_palette("invalid_palette")  # type: ignore[arg-type]


def test_broadcast_standards_and_ire_conversions() -> None:
    stds = list_broadcast_standards()
    assert {s.standard for s in stds} == set(ALLOWED_BROADCAST_STANDARDS)
    assert luma_8bit_to_ire(16.0) == pytest.approx(0.0, abs=0.05)
    assert luma_8bit_to_ire(235.0) == pytest.approx(100.0, abs=0.05)
    assert ire_to_luma_8bit(0.0) == pytest.approx(16.0, abs=0.05)
    assert ire_to_luma_8bit(100.0) == pytest.approx(235.0, abs=0.05)


def test_zebra_and_monitor_config_validation() -> None:
    with pytest.raises(ValidationError):
        ZebraConfig(skin_min_ire=65.0, skin_max_ire=60.0)

    with pytest.raises(ValidationError):
        BroadcastMonitorConfig(luma_min_8bit=60, luma_max_8bit=150)

    with pytest.raises(ValidationError):
        BroadcastMonitorConfig(luma_min_8bit=64, luma_max_8bit=180, extra_field=1)  # type: ignore[call-arg]

    cfg_bypass = normalize_broadcast_config({"broadcast_standard": "bypass"})
    assert cfg_bypass.luma_min_8bit == 0
    assert cfg_bypass.luma_max_8bit == 255


def test_legal_clamp_hard_clip_and_soft_knee() -> None:
    hard_cfg = BroadcastMonitorConfig(
        broadcast_standard="ebu_r103",
        limiter_enabled=True,
        limiter_mode="hard_clip",
        luma_min_8bit=16,
        luma_max_8bit=235,
        gamut_desaturate_illegal=False,
    )
    assert apply_broadcast_legal_clamp(2.0, 250.0, 128.0, hard_cfg) == (16.0, 235.0, 128.0)

    gamut_cfg = hard_cfg.model_copy(update={"gamut_desaturate_illegal": True})

    soft_cfg = BroadcastMonitorConfig(
        broadcast_standard="smpte_rp2077",
        limiter_enabled=True,
        limiter_mode="soft_knee",
        soft_knee=0.25,
        luma_min_8bit=16,
        luma_max_8bit=235,
    )
    r_out, g_out, b_out = apply_broadcast_legal_clamp(4.0, 248.0, 140.0, soft_cfg)
    assert 16.0 <= r_out <= 235.0
    assert 16.0 <= g_out <= 235.0
    assert 16.0 <= b_out <= 235.0

    # Oversaturated illegal chroma gets pulled back toward luma
    sat_r, sat_g, sat_b = apply_broadcast_legal_clamp(255.0, 16.0, 16.0, gamut_cfg)
    assert 16.0 <= sat_r <= 235.0
    assert 16.0 <= sat_g <= 235.0
    assert 16.0 <= sat_b <= 235.0


def test_compliance_analysis_pass_and_fail() -> None:
    illegal_samples = [4.0, 8.0, 120.0, 130.0, 246.0, 252.0] * 10
    unclamped_cfg = BroadcastMonitorConfig(
        broadcast_standard="ebu_r103",
        limiter_enabled=False,
        zebra=ZebraConfig(enabled=True, high_ire=95.0, low_enabled=True, low_ire=5.0),
    )
    fail_report = analyze_broadcast_compliance(luma_samples=illegal_samples, config=unclamped_cfg)
    assert fail_report.compliance_status == "FAIL"
    assert fail_report.sub_black_pct > 10.0
    assert fail_report.super_white_pct > 10.0
    assert len(fail_report.histogram_bins) == IRE_HISTOGRAM_BIN_COUNT
    assert len(fail_report.violations) >= 2

    clamped_cfg = unclamped_cfg.model_copy(update={"limiter_enabled": True})
    pass_report = analyze_broadcast_compliance(luma_samples=illegal_samples, config=clamped_cfg)
    assert pass_report.compliance_status == "PASS"
    assert pass_report.sub_black_pct == 0.0
    assert pass_report.super_white_pct == 0.0
    assert pass_report.min_luma_8bit >= 16
    assert pass_report.peak_luma_8bit <= 235
    assert pass_report.violations == []


def test_compile_broadcast_legal_filtergraph() -> None:
    bypass_res = compile_broadcast_legal_filtergraph(
        BroadcastMonitorConfig(broadcast_standard="ebu_r103", limiter_enabled=False)
    )
    assert bypass_res.filtergraph == "null"
    assert bypass_res.vf_args == []
    assert len(bypass_res.warnings) == 1

    hard_res = compile_broadcast_legal_filtergraph(
        BroadcastMonitorConfig(
            broadcast_standard="itu_rec709",
            limiter_enabled=True,
            limiter_mode="hard_clip",
            gamut_desaturate_illegal=False,
        )
    )
    assert hard_res.filtergraph == "limiter=min=16:max=235:planes=7"
    assert hard_res.vf_args == ["-vf", "limiter=min=16:max=235:planes=7"]

    soft_res = compile_broadcast_legal_filtergraph(
        BroadcastMonitorConfig(
            broadcast_standard="ebu_r103",
            limiter_enabled=True,
            limiter_mode="soft_knee",
            soft_knee=0.2,
            gamut_desaturate_illegal=True,
        )
    )
    assert "lutyuv=" in soft_res.filtergraph
    assert "lutrgb=" in soft_res.filtergraph
    assert "limiter=min=16:max=235:planes=7" in soft_res.filtergraph
