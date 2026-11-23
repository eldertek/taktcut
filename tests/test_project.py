"""Unit tests for full .taktcut.json project serialization and strict validation."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from taktcut.color import ColorGradeParams
from taktcut.fx import ChromaKeyParams, FxNode, Keyframe
from taktcut.models import (
    BpmGridConfig,
    ClipTransformParams,
    ClipTransition,
    RationalFrameRate,
    RenderProfile,
    TimelineClip,
    TimelineDocument,
    TimelineMarker,
    TimelineTrack,
)
from taktcut.project import (
    PROJECT_MAX_BYTES,
    PROJECT_SCHEMA_VERSION,
    ProjectColorState,
    ProjectDeliveryState,
    ProjectFramingState,
    ProjectFxState,
    ProjectSafeGuides,
    TaktcutProject,
    export_project_dict,
    export_project_json,
    load_project_file,
    parse_project_json,
    save_project_file,
    validate_project_payload,
)
from taktcut.render import AutoDuckParams, FramingParams
from taktcut.subtitles import SubtitleCue, SubtitleTrackParams
from taktcut.titles import TitleOverlayParams


def _build_full_test_project() -> TaktcutProject:
    fps_25 = RationalFrameRate(num=25, den=1)
    timeline = TimelineDocument(
        name="Master_Commercial_25p",
        source_format="drt",
        fps=fps_25,
        width=1920,
        height=1080,
        start_frame=0,
        color_space_tags=["Rec.709 / Gamma 2.4"],
        lut_refs=["luts/editorial.cube"],
        tracks=[
            TimelineTrack(
                index=1,
                kind="video",
                name="V1 Picture",
                muted=False,
                solo=False,
                clips=[
                    TimelineClip(
                        name="Shot_01",
                        track_index=1,
                        media_type="video",
                        start_frame=0,
                        duration_frames=125,
                        source_in_frame=12,
                        source_path="media/shot_01.mov",
                        media_ref="m-01",
                        source_fps=fps_25,
                        speed_rate=1.25,
                        reverse=False,
                        transform=ClipTransformParams(
                            zoom_pct=28.0,
                            pos_x_pct=32.0,
                            pos_y_pct=32.0,
                            rotation_deg=-15.0,
                            opacity_pct=85.0,
                        ),
                        transition_out=ClipTransition(
                            preset="fadeblack",
                            duration_s=0.75,
                            include_audio=True,
                            audio_curve="qsin",
                        ),
                    ),
                    TimelineClip(
                        name="Shot_02",
                        track_index=1,
                        media_type="video",
                        start_frame=125,
                        duration_frames=150,
                        source_in_frame=0,
                        source_path="media/shot_02.mov",
                        media_ref="m-02",
                        source_fps=fps_25,
                        speed_rate=0.5,
                        reverse=True,
                        transform=ClipTransformParams(
                            dynamic_zoom="pan_left_to_right",
                        ),
                    ),
                ],
            ),
            TimelineTrack(
                index=1,
                kind="audio",
                name="A1 Dialogue",
                muted=False,
                solo=True,
                clips=[
                    TimelineClip(
                        name="VO_Main",
                        track_index=1,
                        media_type="audio",
                        start_frame=0,
                        duration_frames=275,
                        source_in_frame=0,
                        source_path="audio/vo_main.wav",
                        media_ref="a-01",
                        audio_gain_db=-2.5,
                        fade_in_s=0.35,
                        fade_out_s=0.80,
                    ),
                ],
            ),
        ],
        markers=[
            TimelineMarker(
                name="Drop Beat",
                frame=75,
                duration_frames=1,
                color="Gold",
                note="Sync cut on beat 4",
            ),
        ],
    )

    return TaktcutProject(
        project_name="Master_Commercial_25p",
        timeline=timeline,
        playhead_frame=125,
        timeline_zoom=2.5,
        snap_enabled=False,
        bpm_grid=BpmGridConfig(enabled=True, bpm=134.5, offset_s=-0.25),
        color=ProjectColorState(
            grade=ColorGradeParams(
                lift=(-0.08, 0.01, 0.10),
                gamma=(0.02, 0.0, -0.03),
                gain=(0.12, 0.04, -0.09),
                contrast=1.16,
                saturation=1.22,
                temperature=0.18,
                preserve_lightness=True,
            ),
            active_preset_id="",
            wipe_ratio=0.65,
            scope_mode="vectorscope",
        ),
        fx=ProjectFxState(
            nodes=[
                FxNode(
                    effect="glow",
                    enabled=True,
                    params={
                        "brightness": 1.1,
                        "width": 24.0,
                        "threshold": 0.42,
                        "tint": "#ffd2a0",
                    },
                    keyframes=[
                        Keyframe(time_s=0.0, value=0.2, easing="ease_in"),
                        Keyframe(time_s=2.5, value=1.0, easing="ease_out"),
                    ],
                ),
                FxNode(
                    effect="shake",
                    enabled=False,
                    params={
                        "amplitude": 12.0,
                        "frequency": 8.0,
                        "motion_blur": 0.4,
                        "seed": 101,
                    },
                ),
            ],
            bypass_all=False,
            active_preset_id="",
            chroma_key=ChromaKeyParams(
                preset="custom",
                key_color="#12b850",
                similarity=0.24,
                blend=0.11,
                despill=True,
                despill_type="green",
                enabled=True,
            ),
            chroma_key_matte_view="alpha_matte",
        ),
        title_overlay=TitleOverlayParams(
            preset_id="center_title_card",
            title="STUDIO SHOWREEL",
            subtitle="REC.709 MASTER",
            position="center",
            accent_color="#689cff",
            start_s=0.5,
            end_s=4.5,
            font_size=44,
            box_opacity=0.85,
            enabled=True,
        ),
        subtitle_track=SubtitleTrackParams(
            cues=[
                SubtitleCue(index=1, start_s=0.4, end_s=2.2, text="Opening title line"),
                SubtitleCue(
                    index=2,
                    start_s=2.6,
                    end_s=5.0,
                    text="Second caption line\nWith line break",
                ),
            ],
            style="boxed_social",
            font_size=38,
            margin_bottom_pct=0.10,
            enabled=True,
        ),
        framing=ProjectFramingState(
            framing=FramingParams(
                preset="9:16",
                mode="fit",
                pan_x=0.15,
                pan_y=-0.10,
                enabled=True,
                target_width=1080,
                target_height=1920,
            ),
            safe_guides=ProjectSafeGuides(
                enabled=True,
                action_safe=True,
                title_safe=False,
                social_hud=True,
            ),
        ),
        delivery=ProjectDeliveryState(
            delivery_preset="reels_tiktok_9_16",
            profile=RenderProfile.WEB_H264,
            container="mp4",
            video_crf=19,
            audio_bitrate_kbps=256,
            encoder_preset="slow",
            fps="25",
            target_lufs=-14.0,
            lut_path="luts/editorial.cube",
            input_path=".taktcut-samples/sample_rec709.mp4",
            output_path="renders/reels_master.mp4",
            use_framing=True,
            use_studio_cdl=False,
            use_studio_fx=True,
            use_studio_title=True,
            use_studio_subtitles=True,
            use_clip_audio=True,
            use_clip_retime=True,
            use_clip_transform=True,
            prefer_hw=False,
        ),
    )


def test_project_lossless_roundtrip_json_and_disk(tmp_path: Path) -> None:
    original = _build_full_test_project()
    raw_json = export_project_json(original)
    parsed = parse_project_json(raw_json)

    assert parsed.schema_version == PROJECT_SCHEMA_VERSION
    assert parsed.app_version != ""
    assert parsed.saved_at.endswith("Z")

    # Compare all domain fields losslessly against stamped original
    stamped = TaktcutProject.model_validate(
        {
            **original.model_dump(mode="json"),
            "app_version": parsed.app_version,
            "saved_at": parsed.saved_at,
        }
    )
    assert parsed.model_dump(mode="json") == stamped.model_dump(mode="json")

    # Verify disk save & load round-trip
    project_file = tmp_path / "projects" / "Master_Commercial_25p.taktcut.json"
    saved = save_project_file(original, project_file)
    assert project_file.is_file()
    loaded = load_project_file(project_file)
    assert loaded.model_dump(mode="json") == saved.model_dump(mode="json")

    # Spot-check nested edit properties
    assert loaded.timeline.tracks[0].clips[0].transform is not None
    assert loaded.timeline.tracks[0].clips[0].transform.zoom_pct == pytest.approx(28.0)
    assert loaded.timeline.tracks[0].clips[0].transform.pos_x_pct == pytest.approx(32.0)
    assert loaded.timeline.tracks[0].clips[0].transform.rotation_deg == pytest.approx(-15.0)
    assert loaded.timeline.tracks[0].clips[0].transform.opacity_pct == pytest.approx(85.0)
    assert loaded.timeline.tracks[0].clips[0].transform.dynamic_zoom == "off"
    assert loaded.timeline.tracks[0].clips[1].transform is not None
    assert loaded.timeline.tracks[0].clips[1].transform.dynamic_zoom == "pan_left_to_right"
    assert loaded.timeline.tracks[0].clips[0].transition_out is not None
    assert loaded.timeline.tracks[0].clips[0].transition_out.preset == "fadeblack"
    assert loaded.timeline.tracks[0].clips[1].reverse is True
    assert loaded.timeline.tracks[1].solo is True
    assert loaded.timeline.tracks[1].clips[0].audio_gain_db == pytest.approx(-2.5)
    assert loaded.bpm_grid.bpm == pytest.approx(134.5)
    assert loaded.color.grade.preserve_lightness is True
    assert loaded.color.scope_mode == "vectorscope"
    assert len(loaded.fx.nodes) == 2
    assert len(loaded.fx.nodes[0].keyframes) == 2
    assert loaded.fx.chroma_key.key_color == "#12b850"
    assert loaded.fx.chroma_key_matte_view == "alpha_matte"
    assert loaded.title_overlay.position == "center"
    assert len(loaded.subtitle_track.cues) == 2
    assert loaded.framing.framing.preset == "9:16"
    assert loaded.framing.safe_guides.title_safe is False
    assert loaded.delivery.delivery_preset == "reels_tiktok_9_16"
    assert loaded.delivery.audio_bitrate_kbps == 256


@pytest.mark.parametrize(
    "raw_payload",
    [
        "",
        "   \n  ",
        "{not valid json",
        "[]",
        '"just a string"',
        b"\xff\xfe\x00\x01",
        '{"schema_version": "taktcut.project.v1", "playhead_frame": NaN}',
        '{"schema_version": "taktcut.project.v1", "timeline_zoom": Infinity}',
    ],
)
def test_project_rejects_malformed_json_and_nan(raw_payload: str | bytes) -> None:
    with pytest.raises(ValueError):
        parse_project_json(raw_payload)


def test_project_rejects_oversized_payload() -> None:
    oversized = "{" + " " * (PROJECT_MAX_BYTES + 10) + "}"
    with pytest.raises(ValueError, match="maximum size"):
        parse_project_json(oversized)


def _mutated_dict(mutator: Any) -> dict[str, Any]:
    base = export_project_dict(_build_full_test_project())
    mutator(base)
    return base


@pytest.mark.parametrize(
    "mutator",
    [
        lambda d: d.pop("schema_version"),
        lambda d: d.__setitem__("schema_version", "taktcut.project.v2"),
        lambda d: d.__setitem__("unexpected_extra_key", 123),
        lambda d: d.__setitem__("project_name", "   "),
        lambda d: d.__setitem__("project_name", "bad\x00name"),
        lambda d: d.__setitem__("playhead_frame", -5),
        lambda d: d.__setitem__("playhead_frame", True),
        lambda d: d.__setitem__("timeline_zoom", 9.5),
        lambda d: d.__setitem__("snap_enabled", "yes"),
        lambda d: d["bpm_grid"].__setitem__("bpm", 400.0),
        lambda d: d["bpm_grid"].__setitem__("offset_s", -25.0),
        lambda d: d["color"].__setitem__("wipe_ratio", 1.5),
        lambda d: d["color"]["grade"].__setitem__("contrast", 3.5),
        lambda d: d["color"]["grade"].__setitem__("lift", [-1.5, 0.0, 0.0]),
        lambda d: d["fx"]["nodes"][0]["params"].__setitem__("brightness", 99.0),
        lambda d: d["fx"]["nodes"][0]["params"].__setitem__("unknown_param", 1.0),
        lambda d: d["fx"]["nodes"][0]["params"].__setitem__("tint", "not-a-hex"),
        lambda d: d["fx"]["chroma_key"].__setitem__("similarity", 0.99),
        lambda d: d["fx"]["chroma_key"].__setitem__("key_color", "#123"),
        lambda d: d["fx"]["chroma_key"].__setitem__("despill", "true"),
        lambda d: d["title_overlay"].__setitem__("end_s", 0.1),
        lambda d: d["title_overlay"].__setitem__("font_size", 250),
        lambda d: d["subtitle_track"].__setitem__("font_size", 200),
        lambda d: d["subtitle_track"]["cues"][0].__setitem__("text", "<script>alert(1)</script>"),
        lambda d: d["framing"]["framing"].__setitem__("pan_x", 2.0),
        lambda d: d["framing"]["safe_guides"].__setitem__("enabled", 1),
        lambda d: d["delivery"].__setitem__("video_crf", 99),
        lambda d: d["delivery"].__setitem__("video_crf", True),
        lambda d: d["delivery"].__setitem__("fps", "0/0"),
        lambda d: d["delivery"].__setitem__("target_lufs", 2.0),
        lambda d: d["delivery"].__setitem__("loudness_preset", "spotify_14"),
        lambda d: d["delivery"].__setitem__("dialogue_eq", "highpass=f=80;evil"),
        lambda d: d["delivery"].__setitem__("input_path", "bad\x00.mp4"),
        lambda d: d["timeline"]["tracks"][0]["clips"][0].__setitem__("speed_rate", 10.0),
        lambda d: d["timeline"]["tracks"][0]["clips"][0]["transform"].__setitem__(
            "zoom_pct", 500.0
        ),
        lambda d: d["timeline"]["tracks"][0]["clips"][0]["transform"].__setitem__(
            "rotation_deg", 270.0
        ),
        lambda d: d["timeline"]["tracks"][0]["clips"][0]["transform"].__setitem__(
            "dynamic_zoom", "invalid_ken_burns"
        ),
        lambda d: d["timeline"]["tracks"][1]["clips"][0].__setitem__("audio_gain_db", 48.0),
        lambda d: d["auto_duck"].__setitem__("threshold_db", -2.0),
        lambda d: d["auto_duck"].__setitem__("ratio", 25.0),
    ],
)
def test_project_rejects_corrupted_and_out_of_bounds_fields(mutator: Any) -> None:
    bad = _mutated_dict(mutator)
    with pytest.raises((ValueError, ValidationError)):
        validate_project_payload(bad)


def test_project_auto_duck_roundtrip() -> None:
    proj = _build_full_test_project()
    proj.auto_duck = AutoDuckParams(
        enabled=True,
        threshold_db=-18.0,
        ratio=8.0,
        attack_ms=30.0,
        release_ms=550.0,
    )
    raw_json = export_project_json(proj)
    loaded = parse_project_json(raw_json)
    assert loaded.auto_duck.enabled is True
    assert loaded.auto_duck.threshold_db == -18.0
    assert loaded.auto_duck.ratio == 8.0
    assert loaded.auto_duck.attack_ms == 30.0
    assert loaded.auto_duck.release_ms == 550.0


def test_project_fx_vignette_and_film_grain_roundtrip() -> None:
    proj = _build_full_test_project()
    proj.fx.nodes = [
        FxNode(effect="film_grain", enabled=True, params={"strength": 22.0}),
        FxNode(effect="vignette", enabled=True, params={"angle_rad": 0.85}),
    ]
    proj.fx.active_preset_id = "35mm_cinema"

    raw_json = export_project_json(proj)
    loaded = parse_project_json(raw_json)

    assert loaded.fx.active_preset_id == "35mm_cinema"
    assert len(loaded.fx.nodes) == 2
    assert loaded.fx.nodes[0].effect == "film_grain"
    assert loaded.fx.nodes[0].params["strength"] == pytest.approx(22.0)
    assert loaded.fx.nodes[1].effect == "vignette"
    assert loaded.fx.nodes[1].params["angle_rad"] == pytest.approx(0.85)

    for bad_grain in (-1.0, 45.0):
        bad_payload = export_project_dict(loaded)
        bad_payload["fx"]["nodes"][0]["params"]["strength"] = bad_grain
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)

    for bad_angle in (0.05, 1.5):
        bad_payload = export_project_dict(loaded)
        bad_payload["fx"]["nodes"][1]["params"]["angle_rad"] = bad_angle
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)


def test_project_fx_optical_glow_and_rgb_split_roundtrip() -> None:
    proj = _build_full_test_project()
    proj.fx.nodes = [
        FxNode(
            effect="optical_glow",
            enabled=True,
            params={"glow_intensity": 0.72, "glow_radius": 16.0},
        ),
        FxNode(
            effect="rgb_split",
            enabled=True,
            params={"chroma_shift_px": 6},
        ),
    ]
    proj.fx.active_preset_id = "cyberpunk_glow"

    raw_json = export_project_json(proj)
    loaded = parse_project_json(raw_json)

    assert loaded.fx.active_preset_id == "cyberpunk_glow"
    assert len(loaded.fx.nodes) == 2
    assert loaded.fx.nodes[0].effect == "optical_glow"
    assert loaded.fx.nodes[0].params["glow_intensity"] == pytest.approx(0.72)
    assert loaded.fx.nodes[0].params["glow_radius"] == pytest.approx(16.0)
    assert loaded.fx.nodes[1].effect == "rgb_split"
    assert loaded.fx.nodes[1].params["chroma_shift_px"] == 6

    for bad_intensity in (-0.1, 1.25):
        bad_payload = export_project_dict(loaded)
        bad_payload["fx"]["nodes"][0]["params"]["glow_intensity"] = bad_intensity
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)

    for bad_radius in (1.5, 28.0):
        bad_payload = export_project_dict(loaded)
        bad_payload["fx"]["nodes"][0]["params"]["glow_radius"] = bad_radius
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)

    for bad_shift in (-1, 15):
        bad_payload = export_project_dict(loaded)
        bad_payload["fx"]["nodes"][1]["params"]["chroma_shift_px"] = bad_shift
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)


def test_project_fairlight_loudness_and_dialogue_eq_roundtrip(tmp_path: Path) -> None:
    proj = _build_full_test_project()
    proj.delivery.loudness_preset = "broadcast_23"
    proj.delivery.dialogue_eq = "podcast_warm"
    proj.delivery.target_lufs = -23.0

    raw_json = export_project_json(proj)
    loaded = parse_project_json(raw_json)
    assert loaded.delivery.loudness_preset == "broadcast_23"
    assert loaded.delivery.dialogue_eq == "podcast_warm"
    assert loaded.delivery.target_lufs == pytest.approx(-23.0)

    proj_path = tmp_path / "fairlight_session.taktcut.json"
    save_project_file(proj, proj_path)
    disk_loaded = load_project_file(proj_path)
    assert disk_loaded.delivery.loudness_preset == "broadcast_23"
    assert disk_loaded.delivery.dialogue_eq == "podcast_warm"

    for bad_field, bad_val in (
        ("loudness_preset", "cinema_24"),
        ("loudness_preset", 14),
        ("dialogue_eq", "compressor_heavy"),
        ("dialogue_eq", True),
    ):
        bad_payload = export_project_dict(disk_loaded)
        bad_payload["delivery"][bad_field] = bad_val
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)


def test_project_fx_halation_letterbox_cinema_35mm_roundtrip(tmp_path: Path) -> None:
    proj = _build_full_test_project()
    proj.fx.nodes = [
        FxNode(
            effect="halation",
            enabled=True,
            params={"halation_strength": 0.65, "halation_radius": 12.5},
        ),
        FxNode(
            effect="letterbox",
            enabled=True,
            params={"ratio": "2.39"},
        ),
        FxNode(
            effect="film_grain",
            enabled=True,
            params={"strength": 14.0},
        ),
    ]
    proj.fx.active_preset_id = "cinema_35mm"

    raw_json = export_project_json(proj)
    loaded = parse_project_json(raw_json)
    assert loaded.fx.active_preset_id == "cinema_35mm"
    assert [n.effect for n in loaded.fx.nodes] == ["halation", "letterbox", "film_grain"]
    assert loaded.fx.nodes[0].params["halation_strength"] == pytest.approx(0.65)
    assert loaded.fx.nodes[0].params["halation_radius"] == pytest.approx(12.5)
    assert loaded.fx.nodes[1].params["ratio"] == "2.39"

    proj_path = tmp_path / "cinema_35mm.taktcut.json"
    save_project_file(proj, proj_path)
    disk_loaded = load_project_file(proj_path)
    assert disk_loaded.fx.nodes[1].params["ratio"] == "2.39"

    for bad_strength in (-0.1, 1.5, True):
        bad_payload = export_project_dict(loaded)
        bad_payload["fx"]["nodes"][0]["params"]["halation_strength"] = bad_strength
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)

    for bad_radius in (1.0, 25.0):
        bad_payload = export_project_dict(loaded)
        bad_payload["fx"]["nodes"][0]["params"]["halation_radius"] = bad_radius
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)

    for bad_ratio in ("1.33", "2.39;whoami", 99, False):
        bad_payload = export_project_dict(loaded)
        bad_payload["fx"]["nodes"][1]["params"]["ratio"] = bad_ratio
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)


def test_project_fx_camera_shake_lens_distortion_action_handheld_roundtrip(
    tmp_path: Path,
) -> None:
    proj = _build_full_test_project()
    proj.fx.nodes = [
        FxNode(
            effect="camera_shake",
            enabled=True,
            params={"amplitude_px": 10.0, "frequency_hz": 5.5},
        ),
        FxNode(
            effect="lens_distortion",
            enabled=True,
            params={"k1": -0.28},
        ),
        FxNode(
            effect="rgb_split",
            enabled=True,
            params={"chroma_shift_px": 2},
        ),
        FxNode(
            effect="vignette",
            enabled=True,
            params={"angle_rad": 0.52},
        ),
    ]
    proj.fx.active_preset_id = "action_handheld"

    raw_json = export_project_json(proj)
    loaded = parse_project_json(raw_json)
    assert loaded.fx.active_preset_id == "action_handheld"
    assert [n.effect for n in loaded.fx.nodes] == [
        "camera_shake",
        "lens_distortion",
        "rgb_split",
        "vignette",
    ]
    assert loaded.fx.nodes[0].params["amplitude_px"] == pytest.approx(10.0)
    assert loaded.fx.nodes[0].params["frequency_hz"] == pytest.approx(5.5)
    assert loaded.fx.nodes[1].params["k1"] == pytest.approx(-0.28)

    proj_path = tmp_path / "action_handheld.taktcut.json"
    save_project_file(proj, proj_path)
    disk_loaded = load_project_file(proj_path)
    assert disk_loaded.fx.nodes[0].params["amplitude_px"] == pytest.approx(10.0)
    assert disk_loaded.fx.nodes[1].params["k1"] == pytest.approx(-0.28)

    for bad_amp in (0.5, 25.0, True):
        bad_payload = export_project_dict(loaded)
        bad_payload["fx"]["nodes"][0]["params"]["amplitude_px"] = bad_amp
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)

    for bad_freq in (0.2, 13.0, False):
        bad_payload = export_project_dict(loaded)
        bad_payload["fx"]["nodes"][0]["params"]["frequency_hz"] = bad_freq
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)

    for bad_k1 in (-0.65, 0.75, True):
        bad_payload = export_project_dict(loaded)
        bad_payload["fx"]["nodes"][1]["params"]["k1"] = bad_k1
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)


def test_project_fx_scanlines_unsharp_mask_retro_vhs_roundtrip(tmp_path: Path) -> None:
    proj = _build_full_test_project()
    proj.fx.nodes = [
        FxNode(
            effect="scanlines",
            enabled=True,
            params={"line_spacing_px": 4, "opacity": 0.45},
        ),
        FxNode(
            effect="unsharp_mask",
            enabled=True,
            params={"sharpen_amount": 1.35},
        ),
        FxNode(
            effect="rgb_split",
            enabled=True,
            params={"chroma_shift_px": 4},
        ),
        FxNode(
            effect="film_grain",
            enabled=True,
            params={"strength": 18.0},
        ),
    ]
    proj.fx.active_preset_id = "retro_vhs"

    raw_json = export_project_json(proj)
    loaded = parse_project_json(raw_json)
    assert loaded.fx.active_preset_id == "retro_vhs"
    assert [n.effect for n in loaded.fx.nodes] == [
        "scanlines",
        "unsharp_mask",
        "rgb_split",
        "film_grain",
    ]
    assert loaded.fx.nodes[0].params["line_spacing_px"] == 4
    assert loaded.fx.nodes[0].params["opacity"] == pytest.approx(0.45)
    assert loaded.fx.nodes[1].params["sharpen_amount"] == pytest.approx(1.35)

    proj_path = tmp_path / "retro_vhs.taktcut.json"
    save_project_file(proj, proj_path)
    disk_loaded = load_project_file(proj_path)
    assert disk_loaded.fx.nodes[0].params["line_spacing_px"] == 4
    assert disk_loaded.fx.nodes[1].params["sharpen_amount"] == pytest.approx(1.35)

    for bad_spacing in (1, 13, True):
        bad_payload = export_project_dict(loaded)
        bad_payload["fx"]["nodes"][0]["params"]["line_spacing_px"] = bad_spacing
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)

    for bad_opacity in (0.05, 0.95, False):
        bad_payload = export_project_dict(loaded)
        bad_payload["fx"]["nodes"][0]["params"]["opacity"] = bad_opacity
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)

    for bad_amount in (0.1, 3.5, True):
        bad_payload = export_project_dict(loaded)
        bad_payload["fx"]["nodes"][1]["params"]["sharpen_amount"] = bad_amount
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)


def test_project_fx_hue_shift_mirror_flip_neon_shift_roundtrip(tmp_path: Path) -> None:
    proj = _build_full_test_project()
    proj.fx.nodes = [
        FxNode(
            effect="hue_shift",
            enabled=True,
            params={"hue_deg": 45.0, "saturation": 1.45},
        ),
        FxNode(
            effect="mirror_flip",
            enabled=True,
            params={"axis": "both"},
        ),
        FxNode(
            effect="optical_glow",
            enabled=True,
            params={"glow_intensity": 0.65, "glow_radius": 14.0},
        ),
        FxNode(
            effect="vignette",
            enabled=True,
            params={"angle_rad": 0.58},
        ),
    ]
    proj.fx.active_preset_id = "neon_shift"

    raw_json = export_project_json(proj)
    loaded = parse_project_json(raw_json)
    assert loaded.fx.active_preset_id == "neon_shift"
    assert [n.effect for n in loaded.fx.nodes] == [
        "hue_shift",
        "mirror_flip",
        "optical_glow",
        "vignette",
    ]
    assert loaded.fx.nodes[0].params["hue_deg"] == pytest.approx(45.0)
    assert loaded.fx.nodes[0].params["saturation"] == pytest.approx(1.45)
    assert loaded.fx.nodes[1].params["axis"] == "both"

    proj_path = tmp_path / "neon_shift.taktcut.json"
    save_project_file(proj, proj_path)
    disk_loaded = load_project_file(proj_path)
    assert disk_loaded.fx.nodes[0].params["hue_deg"] == pytest.approx(45.0)
    assert disk_loaded.fx.nodes[1].params["axis"] == "both"

    for bad_hue in (-181.0, 181.0, True):
        bad_payload = export_project_dict(loaded)
        bad_payload["fx"]["nodes"][0]["params"]["hue_deg"] = bad_hue
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)

    for bad_sat in (-0.1, 2.6, False):
        bad_payload = export_project_dict(loaded)
        bad_payload["fx"]["nodes"][0]["params"]["saturation"] = bad_sat
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)

    for bad_axis in ("diagonal", "", 123, True):
        bad_payload = export_project_dict(loaded)
        bad_payload["fx"]["nodes"][1]["params"]["axis"] = bad_axis
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)


def test_project_fx_mosaic_pixelate_invert_negative_retro_arcade_roundtrip(
    tmp_path: Path,
) -> None:
    proj = _build_full_test_project()
    proj.fx.nodes = [
        FxNode(
            effect="mosaic_pixelate",
            enabled=True,
            params={"block_size_px": 10},
        ),
        FxNode(
            effect="invert_negative",
            enabled=True,
            params={"mode": "luma"},
        ),
        FxNode(
            effect="scanlines",
            enabled=True,
            params={"line_spacing_px": 4, "opacity": 0.45},
        ),
        FxNode(
            effect="rgb_split",
            enabled=True,
            params={"chroma_shift_px": 3},
        ),
    ]
    proj.fx.active_preset_id = "retro_arcade"

    raw_json = export_project_json(proj)
    loaded = parse_project_json(raw_json)
    assert loaded.fx.active_preset_id == "retro_arcade"
    assert [n.effect for n in loaded.fx.nodes] == [
        "mosaic_pixelate",
        "invert_negative",
        "scanlines",
        "rgb_split",
    ]
    assert loaded.fx.nodes[0].params["block_size_px"] == 10
    assert loaded.fx.nodes[1].params["mode"] == "luma"

    proj_path = tmp_path / "retro_arcade.taktcut.json"
    save_project_file(proj, proj_path)
    disk_loaded = load_project_file(proj_path)
    assert disk_loaded.fx.nodes[0].params["block_size_px"] == 10
    assert disk_loaded.fx.nodes[1].params["mode"] == "luma"

    for bad_block in (3, 49, True, "12"):
        bad_payload = export_project_dict(loaded)
        bad_payload["fx"]["nodes"][0]["params"]["block_size_px"] = bad_block
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)

    for bad_mode in ("cmyk", "", 123, False):
        bad_payload = export_project_dict(loaded)
        bad_payload["fx"]["nodes"][1]["params"]["mode"] = bad_mode
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)


def test_project_delivery_timecode_burnin_roundtrip(tmp_path: Path) -> None:
    proj = _build_full_test_project()
    assert proj.delivery.timecode_burnin == "off"

    proj.delivery.timecode_burnin = "bottom_center"
    raw_json = export_project_json(proj)
    loaded = parse_project_json(raw_json)
    assert loaded.delivery.timecode_burnin == "bottom_center"

    proj_path = tmp_path / "client_review_tc.taktcut.json"
    proj.delivery.timecode_burnin = "top_left"
    save_project_file(proj, proj_path)
    disk_loaded = load_project_file(proj_path)
    assert disk_loaded.delivery.timecode_burnin == "top_left"

    for bad_tc in ("top_right", "", "bottom_center;evil", 42, True):
        bad_payload = export_project_dict(disk_loaded)
        bad_payload["delivery"]["timecode_burnin"] = bad_tc
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)


def test_project_delivery_review_watermark_roundtrip(tmp_path: Path) -> None:
    proj = _build_full_test_project()
    assert proj.delivery.review_watermark_text == ""
    assert proj.delivery.review_watermark_opacity == pytest.approx(0.35)

    proj.delivery.review_watermark_text = "DRAFT - CLIENT REVIEW"
    proj.delivery.review_watermark_opacity = 0.50
    raw_json = export_project_json(proj)
    loaded = parse_project_json(raw_json)
    assert loaded.delivery.review_watermark_text == "DRAFT - CLIENT REVIEW"
    assert loaded.delivery.review_watermark_opacity == pytest.approx(0.50)

    proj_path = tmp_path / "client_review_wm.taktcut.json"
    proj.delivery.review_watermark_text = "CONFIDENTIAL"
    proj.delivery.review_watermark_opacity = 0.25
    save_project_file(proj, proj_path)
    disk_loaded = load_project_file(proj_path)
    assert disk_loaded.delivery.review_watermark_text == "CONFIDENTIAL"
    assert disk_loaded.delivery.review_watermark_opacity == pytest.approx(0.25)

    for bad_wm in ("A" * 41, "bad;text", "bad:text", "CLIENT'S", 42, True):
        bad_payload = export_project_dict(disk_loaded)
        bad_payload["delivery"]["review_watermark_text"] = bad_wm
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)

    for bad_op in (0.14, 0.81, True, "0.40"):
        bad_payload = export_project_dict(disk_loaded)
        bad_payload["delivery"]["review_watermark_opacity"] = bad_op
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)


def test_project_delivery_export_fps_and_deinterlace_roundtrip(tmp_path: Path) -> None:
    proj = _build_full_test_project()
    assert proj.delivery.export_fps == "source"
    assert proj.delivery.deinterlace is False

    proj.delivery.export_fps = "60"
    proj.delivery.deinterlace = True
    raw_json = export_project_json(proj)
    loaded = parse_project_json(raw_json)
    assert loaded.delivery.export_fps == "60"
    assert loaded.delivery.deinterlace is True

    proj_path = tmp_path / "broadcast_deint_24.taktcut.json"
    proj.delivery.export_fps = "24"
    proj.delivery.deinterlace = True
    save_project_file(proj, proj_path)
    disk_loaded = load_project_file(proj_path)
    assert disk_loaded.delivery.export_fps == "24"
    assert disk_loaded.delivery.deinterlace is True

    for bad_fps in ("120", "", "23.976", "24;evil", 24, True):
        bad_payload = export_project_dict(disk_loaded)
        bad_payload["delivery"]["export_fps"] = bad_fps
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)

    for bad_deint in ("true", "false", 1, 0, None, "yadif"):
        bad_payload = export_project_dict(disk_loaded)
        bad_payload["delivery"]["deinterlace"] = bad_deint
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)


def test_project_delivery_audio_only_format_roundtrip(tmp_path: Path) -> None:
    proj = _build_full_test_project()
    assert proj.delivery.audio_only_format == "off"

    for fmt in ("wav24", "mp3_320", "aac_256"):
        proj.delivery.audio_only_format = fmt  # type: ignore[assignment]
        raw_json = export_project_json(proj)
        loaded = parse_project_json(raw_json)
        assert loaded.delivery.audio_only_format == fmt

    proj_path = tmp_path / "audio_master.taktcut.json"
    proj.delivery.audio_only_format = "wav24"
    save_project_file(proj, proj_path)
    disk_loaded = load_project_file(proj_path)
    assert disk_loaded.delivery.audio_only_format == "wav24"

    for bad_fmt in ("", "flac", "ogg", "wav", 320, True, None):
        bad_payload = export_project_dict(disk_loaded)
        bad_payload["delivery"]["audio_only_format"] = bad_fmt
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)


def test_project_delivery_lower_third_roundtrip(tmp_path: Path) -> None:
    from taktcut.render import LowerThirdParams

    proj = _build_full_test_project()
    assert proj.delivery.lower_third.enabled is False

    proj.delivery.lower_third = LowerThirdParams(
        enabled=True,
        title="Claire Laurent",
        subtitle="Director | Studio Paris",
        position="bottom_center",
        font_size=40,
        box_opacity=0.70,
        start_s=1.0,
        duration_s=4.5,
    )
    raw_json = export_project_json(proj)
    loaded = parse_project_json(raw_json)
    assert loaded.delivery.lower_third.enabled is True
    assert loaded.delivery.lower_third.title == "Claire Laurent"
    assert loaded.delivery.lower_third.position == "bottom_center"

    proj_path = tmp_path / "lower_third_proj.taktcut.json"
    save_project_file(proj, proj_path)
    disk_loaded = load_project_file(proj_path)
    assert disk_loaded.delivery.lower_third.duration_s == pytest.approx(4.5)

    for bad_pos in ("top_right", "center", 123):
        bad_payload = export_project_dict(disk_loaded)
        bad_payload["delivery"]["lower_third"]["position"] = bad_pos
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)


def test_project_delivery_retime_roundtrip(tmp_path: Path) -> None:
    from taktcut.render import RetimeParams

    proj = _build_full_test_project()
    assert proj.delivery.retime.enabled is False
    assert proj.delivery.retime.speed == pytest.approx(1.0)
    assert proj.delivery.retime.reverse is False

    proj.delivery.retime = RetimeParams(enabled=True, speed=0.25, reverse=True)
    raw_json = export_project_json(proj)
    loaded = parse_project_json(raw_json)
    assert loaded.delivery.retime.enabled is True
    assert loaded.delivery.retime.speed == pytest.approx(0.25)
    assert loaded.delivery.retime.reverse is True

    proj_path = tmp_path / "retime_proj.taktcut.json"
    save_project_file(proj, proj_path)
    disk_loaded = load_project_file(proj_path)
    assert disk_loaded.delivery.retime.enabled is True
    assert disk_loaded.delivery.retime.speed == pytest.approx(0.25)
    assert disk_loaded.delivery.retime.reverse is True

    for bad_speed in (0.1, 4.5, True, "fast"):
        bad_payload = export_project_dict(disk_loaded)
        bad_payload["delivery"]["retime"]["speed"] = bad_speed
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)


def test_project_delivery_reframe_roundtrip(tmp_path: Path) -> None:
    from taktcut.render import ReframeParams

    proj = _build_full_test_project()
    assert proj.delivery.reframe.enabled is False
    assert proj.delivery.reframe.aspect_ratio == "source"
    assert proj.delivery.reframe.pan_x == pytest.approx(0.0)
    assert proj.delivery.reframe.pan_y == pytest.approx(0.0)

    proj.delivery.reframe = ReframeParams(
        enabled=True, aspect_ratio="4:5", pan_x=-0.35, pan_y=0.25
    )
    raw_json = export_project_json(proj)
    loaded = parse_project_json(raw_json)
    assert loaded.delivery.reframe.enabled is True
    assert loaded.delivery.reframe.aspect_ratio == "4:5"
    assert loaded.delivery.reframe.pan_x == pytest.approx(-0.35)
    assert loaded.delivery.reframe.pan_y == pytest.approx(0.25)

    proj_path = tmp_path / "reframe_proj.taktcut.json"
    save_project_file(proj, proj_path)
    disk_loaded = load_project_file(proj_path)
    assert disk_loaded.delivery.reframe.enabled is True
    assert disk_loaded.delivery.reframe.aspect_ratio == "4:5"
    assert disk_loaded.delivery.reframe.pan_x == pytest.approx(-0.35)
    assert disk_loaded.delivery.reframe.pan_y == pytest.approx(0.25)

    for bad_key, bad_val in (
        ("aspect_ratio", "21:9"),
        ("pan_x", -1.5),
        ("pan_y", 1.5),
        ("pan_x", True),
    ):
        bad_payload = export_project_dict(disk_loaded)
        bad_payload["delivery"]["reframe"][bad_key] = bad_val
        with pytest.raises((ValueError, ValidationError)):
            validate_project_payload(bad_payload)
