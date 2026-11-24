"""Unit tests for taktcut.color_cst (Camera Log CST, Bradford 3x3, Filmic Tone Mapping)."""

from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import ValidationError

from taktcut.color_cst import (
    ALLOWED_CST_INPUT_SPACES,
    ALLOWED_CST_OUTPUT_SPACES,
    CST_INPUT_SPACE_SPECS,
    CST_OUTPUT_SPACE_SPECS,
    CstConfig,
    analyze_cst_pipeline,
    bake_cst_to_cube,
    compile_cst_filtergraph,
    compute_bradford_adaptation_3x3,
    compute_cst_gamut_matrix,
    compute_rgb_to_xyz_3x3,
    encode_input_log_channel,
    eotf_decode_channel,
    evaluate_cst_rgb,
    generate_cst_cube_text,
    get_cst_preset,
    list_cst_input_spaces,
    list_cst_output_spaces,
    list_cst_presets,
    normalize_cst_config,
    oetf_encode_channel,
)


def test_cst_metadata_and_presets_catalog() -> None:
    inputs = list_cst_input_spaces()
    outputs = list_cst_output_spaces()
    presets = list_cst_presets()
    assert {s.space_id for s in inputs} == set(ALLOWED_CST_INPUT_SPACES)
    assert {s.space_id for s in outputs} == set(ALLOWED_CST_OUTPUT_SPACES)
    assert len(presets) >= 8
    p = get_cst_preset("arri_logc4_to_rec709")
    assert p.config.input_space == "arri_logc4"
    assert p.config.output_space == "rec709_gamma24"
    with pytest.raises(ValueError, match="Unsupported CST preset_id"):
        get_cst_preset("nonexistent_cst")


@pytest.mark.parametrize(
    "space",
    [
        "arri_logc3",
        "arri_logc4",
        "sony_slog3",
        "red_log3g10",
        "canon_clog2",
        "panasonic_vlog",
        "acescct",
    ],
)
def test_log_encode_decode_middle_grey_roundtrip(space: str) -> None:
    mid_grey = 0.18
    encoded = encode_input_log_channel(mid_grey, space)  # type: ignore[arg-type]
    assert 0.2 < encoded < 0.55
    decoded = eotf_decode_channel(encoded, space)  # type: ignore[arg-type]
    assert decoded == pytest.approx(mid_grey, rel=0.015, abs=0.003)


def test_bradford_adaptation_and_gamut_matrices() -> None:
    # Identical white point yields exact identity adaptation
    eye = compute_bradford_adaptation_3x3((0.3127, 0.3290), (0.3127, 0.3290))
    for i in range(3):
        for j in range(3):
            assert eye[i][j] == pytest.approx(1.0 if i == j else 0.0, abs=1e-6)

    # ACES AP1 (D60) -> Rec.709 (D65) must activate Bradford adaptation & preserve neutral grey
    cfg = CstConfig(
        enabled=True,
        input_space="acescct",
        output_space="rec709_gamma24",
        bradford_adaptation=True,
    )
    m_comb, _, _, _, bradford_active = compute_cst_gamut_matrix(cfg)
    assert bradford_active is True
    # Equal scene-referred RGB in D60 must map to equal RGB in D65 (row sums = 1.0)
    for row in m_comb:
        assert sum(row) == pytest.approx(1.0, abs=0.015)

    # Rec.709 primaries matrix maps pure white (1, 1, 1) to D65 Y=1.0
    m_709 = compute_rgb_to_xyz_3x3(CST_OUTPUT_SPACE_SPECS["rec709_gamma24"].primaries)
    assert sum(m_709[1]) == pytest.approx(1.0, abs=1e-5)


def test_cst_config_validation_and_normalization() -> None:
    with pytest.raises(ValidationError):
        CstConfig(exposure_ev=12.0)
    with pytest.raises(ValidationError):
        CstConfig(shoulder_strength=1.5)
    with pytest.raises(ValidationError):
        CstConfig(unknown_extra=1)  # type: ignore[call-arg]

    cfg = normalize_cst_config({"input_space": "sony_slog3", "enabled": True})
    assert cfg.input_space == "sony_slog3"
    assert cfg.enabled is True
    assert normalize_cst_config(None).enabled is False


def test_cst_evaluation_compile_and_analysis() -> None:
    cfg = CstConfig(
        enabled=True,
        input_space="arri_logc4",
        output_space="rec709_gamma24",
        tone_mapping_mode="filmic_aces",
        gamut_mapping_mode="saturation_compress",
        shoulder_strength=0.6,
        toe_strength=0.35,
    )
    compiled = compile_cst_filtergraph(cfg)
    assert compiled.config.enabled is True
    assert len(compiled.bradford_matrix_3x3) == 3
    assert len(compiled.tone_curve_samples) == 33
    assert 0.35 <= compiled.middle_grey_out <= 0.65
    assert "colorchannelmixer=" in compiled.ffmpeg_filter_expr
    assert "curves=master=" in compiled.ffmpeg_filter_expr
    assert "setparams=" in compiled.ffmpeg_filter_expr

    # Higher shoulder strength increases highlight roll-off compression
    soft_cfg = cfg.model_copy(update={"shoulder_strength": 0.95})
    hard_cfg = cfg.model_copy(update={"shoulder_strength": 0.05})
    assert (
        compile_cst_filtergraph(soft_cfg).highlight_rolloff_db
        < compile_cst_filtergraph(hard_cfg).highlight_rolloff_db
    )

    # Evaluate neutral grey through full CST pipeline
    mg_log = CST_INPUT_SPACE_SPECS["arri_logc4"].middle_grey_signal
    r_o, g_o, b_o, oog = evaluate_cst_rgb(mg_log, mg_log, mg_log, cfg)
    assert r_o == pytest.approx(g_o, abs=0.01)
    assert g_o == pytest.approx(b_o, abs=0.01)
    assert 0.35 <= r_o <= 0.65
    assert oog is False

    # HDR PQ output encodes higher peak white nits cleanly
    pq_val = oetf_encode_channel(0.5, "rec2020_pq", white_point_nits=1000.0)
    assert 0.45 < pq_val < 0.85

    analysis = analyze_cst_pipeline(cfg)
    assert len(analysis.patches) == 24
    assert analysis.dynamic_range_preserved_stops >= 10.0
    assert "ARRI LogC4" in analysis.summary


def test_cst_cube_lut_generation_and_baking(tmp_path: Path) -> None:
    cfg = get_cst_preset("sony_slog3_to_rec709").config
    cube_text = generate_cst_cube_text(cfg, size=17, title="Sony_SLog3_709")
    assert 'TITLE "Sony_SLog3_709"' in cube_text
    assert "LUT_3D_SIZE 17" in cube_text
    data_lines = [
        ln
        for ln in cube_text.splitlines()
        if ln and not ln.startswith("#") and not ln.startswith(("TITLE", "LUT_", "DOMAIN_"))
    ]
    assert len(data_lines) == 17**3

    out_cube = tmp_path / "luts" / "cst_slog3.cube"
    info = bake_cst_to_cube(cfg, out_cube, size=17, title="Sony_SLog3_709")
    assert out_cube.is_file()
    assert info.dimension == "3D"
    assert info.entry_count == 17**3
