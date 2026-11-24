"""DaVinci Resolve / Premiere Pro Multi-Cam Angle Sync & Live Quad-View Switcher Studio."""

from __future__ import annotations

import json
import math
import re
from collections.abc import Mapping, Sequence
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from taktcut.models import (
    MULTICAM_ANGLE_COLORS,
    MulticamAngle,
    MulticamBank,
    MulticamCutEvent,
    MulticamCutMode,
    MulticamSyncMode,
    RationalFrameRate,
    TimelineClip,
    TimelineDocument,
    TimelineTrack,
)
from taktcut.multicam import frames_to_smpte, smpte_to_frames

MulticamStudioPresetId = Literal[
    "podcast_4cam_interview",
    "concert_3cam_audio_lock",
    "tutorial_2cam_pip_switch",
    "custom",
]
MulticamStudioSyncMode = Literal["audio_waveform", "timecode", "slate_marker"]
MulticamStudioCutMode = Literal["video_only", "video_and_audio"]
MulticamStudioCompileMode = Literal["program_stitch", "quad_view"]
MulticamCutSource = Literal["initial", "manual", "auto_speaker"]

ALLOWED_MULTICAM_STUDIO_PRESET_IDS: tuple[MulticamStudioPresetId, ...] = (
    "podcast_4cam_interview",
    "concert_3cam_audio_lock",
    "tutorial_2cam_pip_switch",
    "custom",
)
ALLOWED_MULTICAM_STUDIO_SYNC_MODES: tuple[MulticamStudioSyncMode, ...] = (
    "audio_waveform",
    "timecode",
    "slate_marker",
)
ALLOWED_MULTICAM_STUDIO_CUT_MODES: tuple[MulticamStudioCutMode, ...] = (
    "video_only",
    "video_and_audio",
)
ALLOWED_MULTICAM_STUDIO_COMPILE_MODES: tuple[MulticamStudioCompileMode, ...] = (
    "program_stitch",
    "quad_view",
)

MIN_MULTICAM_STUDIO_ANGLES = 2
MAX_MULTICAM_STUDIO_ANGLES = 4
ENVELOPE_SAMPLE_RATE_HZ = 20
DEFAULT_MIN_HOLD_MS = 450
MIN_HOLD_MS_LOWER = 100
MIN_HOLD_MS_UPPER = 5000

_TC_PATTERN = re.compile(r"^\d{2}:\d{2}:\d{2}:\d{2}$")
_SAFE_EDL_NAME_RE = re.compile(r"[^A-Za-z0-9_]+")


class MulticamStudioAngleSpec(BaseModel):
    """Single camera angle track inside the Multi-Cam Sync & Switcher Studio."""

    model_config = ConfigDict(extra="forbid")

    angle_index: int = Field(ge=1, le=MAX_MULTICAM_STUDIO_ANGLES)
    name: str = Field(min_length=1, max_length=64)
    source_path: str = Field(default="", max_length=260)
    color_tag: str = Field(default="#3b82f6", max_length=16)
    timecode_start: str = Field(default="01:00:00:00", max_length=16)
    slate_marker_frame: int = Field(default=12, ge=0, le=500000)
    manual_offset_frames: int = Field(default=0, ge=-100000, le=100000)
    audio_gain_db: float = Field(default=0.0, ge=-24.0, le=24.0)
    waveform_envelope: list[float] = Field(default_factory=list, max_length=4096)
    enabled: bool = True

    @field_validator("timecode_start")
    @classmethod
    def _validate_timecode(cls, value: str) -> str:
        cleaned = value.strip()
        if not _TC_PATTERN.match(cleaned):
            raise ValueError(f"Invalid SMPTE timecode {value!r}; expected HH:MM:SS:FF")
        return cleaned

    @field_validator("waveform_envelope")
    @classmethod
    def _clamp_envelope(cls, values: list[float]) -> list[float]:
        return [round(max(0.0, min(1.0, float(v))), 4) for v in values]


class MulticamStudioCutPoint(BaseModel):
    """Editorial cut switch event at a timeline offset in seconds."""

    model_config = ConfigDict(extra="forbid")

    time_s: float = Field(ge=0.0, le=86400.0)
    angle_index: int = Field(ge=1, le=MAX_MULTICAM_STUDIO_ANGLES)
    cut_mode: MulticamStudioCutMode = "video_only"
    source: MulticamCutSource = "manual"
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class MulticamStudioConfig(BaseModel):
    """Complete Multi-Cam Sync & Live Quad-View Switcher configuration."""

    model_config = ConfigDict(extra="forbid")

    preset_id: MulticamStudioPresetId = "podcast_4cam_interview"
    sync_mode: MulticamStudioSyncMode = "audio_waveform"
    cut_mode: MulticamStudioCutMode = "video_only"
    audio_follow_video: bool = False
    master_audio_angle: int = Field(default=1, ge=1, le=MAX_MULTICAM_STUDIO_ANGLES)
    compile_mode: MulticamStudioCompileMode = "program_stitch"
    fps: float = Field(default=25.0, ge=1.0, le=120.0)
    duration_s: float = Field(default=24.0, ge=1.0, le=86400.0)
    width: int = Field(default=1920, ge=320, le=7680)
    height: int = Field(default=1080, ge=180, le=4320)
    min_hold_ms: int = Field(
        default=DEFAULT_MIN_HOLD_MS, ge=MIN_HOLD_MS_LOWER, le=MIN_HOLD_MS_UPPER
    )
    speaker_threshold_db: float = Field(default=-28.0, ge=-60.0, le=0.0)
    speaker_hysteresis_db: float = Field(default=3.0, ge=0.0, le=24.0)
    angles: list[MulticamStudioAngleSpec] = Field(
        default_factory=list,
        max_length=MAX_MULTICAM_STUDIO_ANGLES,
    )
    cuts: list[MulticamStudioCutPoint] = Field(default_factory=list, max_length=2000)

    @model_validator(mode="after")
    def _normalize_angles_and_cuts(self) -> MulticamStudioConfig:
        if len(self.angles) < MIN_MULTICAM_STUDIO_ANGLES:
            defaults = _default_angles_for_preset(self.preset_id, self.fps, self.duration_s)
            existing_idx = {a.angle_index for a in self.angles}
            merged = list(self.angles)
            for item in defaults:
                if (
                    item.angle_index not in existing_idx
                    and len(merged) < MAX_MULTICAM_STUDIO_ANGLES
                ):
                    merged.append(item)
                    existing_idx.add(item.angle_index)
            self.angles = sorted(merged, key=lambda a: a.angle_index)
        else:
            seen: set[int] = set()
            deduped: list[MulticamStudioAngleSpec] = []
            for item in self.angles:
                if item.angle_index in seen:
                    raise ValueError(f"Duplicate angle_index {item.angle_index}")
                seen.add(item.angle_index)
                deduped.append(item)
            self.angles = sorted(deduped, key=lambda a: a.angle_index)

        valid_angles = {a.angle_index for a in self.angles}
        if self.master_audio_angle not in valid_angles:
            self.master_audio_angle = self.angles[0].angle_index

        if self.cut_mode == "video_only":
            self.audio_follow_video = False

        # Normalize cuts: keep t=0 anchor, sort, clamp, collapse same-angle consecutive
        by_time: dict[float, MulticamStudioCutPoint] = {}
        for cut in self.cuts:
            if cut.angle_index not in valid_angles:
                continue
            t_clamped = round(max(0.0, min(max(0.0, self.duration_s - 0.04), cut.time_s)), 3)
            by_time[t_clamped] = cut.model_copy(
                update={
                    "time_s": t_clamped,
                    "cut_mode": self.cut_mode
                    if cut.cut_mode not in ALLOWED_MULTICAM_STUDIO_CUT_MODES
                    else cut.cut_mode,
                }
            )
        if 0.0 not in by_time:
            by_time[0.0] = MulticamStudioCutPoint(
                time_s=0.0,
                angle_index=self.angles[0].angle_index,
                cut_mode=self.cut_mode,
                source="initial",
                confidence=1.0,
            )
        ordered: list[MulticamStudioCutPoint] = []
        for t_key in sorted(by_time):
            ev = by_time[t_key]
            if ordered and ordered[-1].angle_index == ev.angle_index and ev.time_s > 0.0:
                continue
            ordered.append(ev)
        self.cuts = ordered
        return self


class MulticamStudioPreset(BaseModel):
    """Preset definition for Multi-Cam Angle Sync & Switcher Studio."""

    model_config = ConfigDict(extra="forbid")

    preset_id: MulticamStudioPresetId
    label: str
    description: str
    angle_count: int = Field(ge=2, le=4)
    default_sync_mode: MulticamStudioSyncMode
    default_cut_mode: MulticamStudioCutMode
    default_audio_follow_video: bool
    min_hold_ms: int
    default_config: MulticamStudioConfig


class MulticamAngleSyncReport(BaseModel):
    """Computed alignment metrics and waveform envelope for a single camera angle."""

    model_config = ConfigDict(extra="forbid")

    angle_index: int = Field(ge=1, le=MAX_MULTICAM_STUDIO_ANGLES)
    name: str
    color_tag: str
    offset_frames: int
    offset_s: float
    micro_trim_ms: float
    confidence: float = Field(ge=0.0, le=1.0)
    peak_frame: int = Field(ge=0)
    peak_db: float
    rms_db: float
    waveform_envelope: list[float]


class MulticamSyncResult(BaseModel):
    """Multi-angle alignment report across all active camera tracks."""

    model_config = ConfigDict(extra="forbid")

    preset_id: MulticamStudioPresetId
    sync_mode: MulticamStudioSyncMode
    fps: float
    duration_s: float
    duration_frames: int
    reference_angle: int = Field(ge=1, le=MAX_MULTICAM_STUDIO_ANGLES)
    mean_confidence: float = Field(ge=0.0, le=1.0)
    angles: list[MulticamAngleSyncReport]
    notes: list[str] = Field(default_factory=list)


class MulticamStudioSegment(BaseModel):
    """Resolved editorial cut segment inside the Multi-Cam program."""

    model_config = ConfigDict(extra="forbid")

    segment_index: int = Field(ge=0)
    start_s: float = Field(ge=0.0)
    end_s: float = Field(gt=0.0)
    duration_s: float = Field(gt=0.0)
    duration_ms: int = Field(ge=1)
    start_frame: int = Field(ge=0)
    end_frame: int = Field(ge=1)
    duration_frames: int = Field(ge=1)
    angle_index: int = Field(ge=1, le=MAX_MULTICAM_STUDIO_ANGLES)
    angle_name: str
    color_tag: str
    cut_mode: MulticamStudioCutMode
    audio_angle_index: int = Field(ge=1, le=MAX_MULTICAM_STUDIO_ANGLES)
    is_short_cut: bool = False
    source: MulticamCutSource = "manual"


class MulticamAutoSwitchResult(BaseModel):
    """Result of Active Speaker Auto-Switch analysis and minimum-hold gating."""

    model_config = ConfigDict(extra="forbid")

    config: MulticamStudioConfig
    sync_report: MulticamSyncResult
    segments: list[MulticamStudioSegment]
    short_cut_count: int = Field(ge=0)
    short_cut_warnings: list[str] = Field(default_factory=list)
    speaker_activity_ratio: dict[int, float] = Field(default_factory=dict)


class MulticamStudioCompileResult(BaseModel):
    """Compiled FFmpeg filter_complex graph for Program Stitch or 2x2 Quad-View."""

    model_config = ConfigDict(extra="forbid")

    preset_id: MulticamStudioPresetId
    mode: MulticamStudioCompileMode
    duration_s: float = Field(gt=0.0)
    fps: float = Field(gt=0.0)
    width: int = Field(ge=320)
    height: int = Field(ge=180)
    angle_count: int = Field(ge=2, le=4)
    segment_count: int = Field(ge=1)
    short_cut_count: int = Field(ge=0)
    segments: list[MulticamStudioSegment]
    short_cut_warnings: list[str] = Field(default_factory=list)
    filter_complex: str
    ffmpeg_args: list[str]
    video_map_label: str
    audio_map_label: str | None


class MulticamEdlExportResult(BaseModel):
    """CMX 3600 EDL and Timeline JSON export payload."""

    model_config = ConfigDict(extra="forbid")

    format: Literal["edl", "timeline_json"]
    title: str
    fps: float
    segment_count: int
    short_cut_count: int
    edl_text: str
    timeline_json: str
    saved_path: str | None = None
    filename: str


def _amp_to_db(amp: float) -> float:
    return round(20.0 * math.log10(max(1e-4, min(1.0, amp))), 2)


def synthesize_angle_waveform(
    angle_index: int,
    duration_s: float = 24.0,
    *,
    sample_rate_hz: int = ENVELOPE_SAMPLE_RATE_HZ,
    shift_frames: int = 0,
    fps: float = 25.0,
    preset_id: MulticamStudioPresetId = "podcast_4cam_interview",
    slate_frame: int = 12,
) -> list[float]:
    """Generate deterministic multi-angle audio envelope with slate spike and speaker turns."""
    total_samples = max(20, min(4096, round(duration_s * sample_rate_hz)))
    shift_s = shift_frames / max(1.0, fps)
    slate_t = slate_frame / max(1.0, fps)
    samples: list[float] = []

    for i in range(total_samples):
        t = i / float(sample_rate_hz)
        # Aligned timeline coordinate relative to camera slate/reference
        t_ref = t + shift_s
        # Room tone floor
        noise = 0.045 + 0.015 * math.sin(t_ref * 13.7 + angle_index * 1.1)
        # Clap / slate transient impulse around slate_t
        clap_dist = abs(t - slate_t)
        clap = 0.94 * math.exp(-((clap_dist / 0.055) ** 2))

        speech = 0.0
        if preset_id == "concert_3cam_audio_lock":
            # Shared live PA music envelope with aperiodic phrase swells for unambiguous correlation
            beat = 0.38 + 0.28 * max(0.0, math.sin(t_ref * 1.45))
            solo = 0.28 * max(0.0, math.sin(t_ref * 0.43 + 0.5))
            bridge = 0.16 * max(0.0, math.cos(t_ref * 2.17))
            proximity = 1.0 if angle_index == 1 else (0.88 if angle_index == 2 else 0.80)
            speech = (beat + solo + bridge) * proximity
        elif preset_id == "tutorial_2cam_pip_switch":
            # Presenter (Cam 1) vs Screen/Desk VO & key clicks (Cam 2)
            cycle = t_ref % 8.0
            if angle_index == 1:
                active = 1.0 if (cycle < 4.5 or cycle > 6.8) else 0.18
            else:
                active = 0.88 if (4.2 <= cycle <= 7.1) else 0.16
            cadence = 0.55 + 0.35 * abs(math.sin(t_ref * 4.3 + angle_index * 0.4))
            speech = active * cadence * 0.82
        else:
            # 4-cam podcast turn-taking interview
            slot = int(max(0.0, t_ref) // 3.0) % 4
            dominant = (slot + 1) == angle_index
            base_energy = 0.82 if dominant else 0.14
            syllable = 0.58 + 0.36 * abs(math.sin(t_ref * 5.2 + angle_index * 0.7))
            speech = base_energy * syllable

        val = max(0.01, min(1.0, noise + clap + speech * 0.72))
        samples.append(round(val, 4))
    return samples


def correlate_audio_envelopes(
    ref_env: Sequence[float],
    cand_env: Sequence[float],
    *,
    sample_rate_hz: int = ENVELOPE_SAMPLE_RATE_HZ,
    fps: float = 25.0,
    max_lag_frames: int = 75,
) -> tuple[int, float, float]:
    """Compute normalized cross-correlation offset (frames, micro_trim_ms, confidence 0..1)."""
    n_ref = len(ref_env)
    n_cand = len(cand_env)
    if n_ref < 4 or n_cand < 4:
        return 0, 0.0, 0.5

    max_sample_lag = max(
        1, min(n_ref // 2, round((max_lag_frames / max(1.0, fps)) * sample_rate_hz))
    )
    mean_ref = sum(ref_env) / n_ref
    mean_cand = sum(cand_env) / n_cand

    scores: list[tuple[int, float]] = []
    for lag in range(-max_sample_lag, max_sample_lag + 1):
        num = 0.0
        den_a = 0.0
        den_b = 0.0
        overlap = 0
        for i in range(n_ref):
            j = i - lag
            if 0 <= j < n_cand:
                a = ref_env[i] - mean_ref
                b = cand_env[j] - mean_cand
                num += a * b
                den_a += a * a
                den_b += b * b
                overlap += 1
        if overlap < 4 or den_a <= 1e-9 or den_b <= 1e-9:
            corr = 0.0
        else:
            corr = num / math.sqrt(den_a * den_b)
        scores.append((lag, max(0.0, min(1.0, corr))))

    best_idx = max(range(len(scores)), key=lambda idx: scores[idx][1])
    best_lag_samples, best_corr = scores[best_idx]

    # Parabolic sub-sample refinement for micro-trim ms
    frac_samples = 0.0
    if 0 < best_idx < len(scores) - 1:
        y_l = scores[best_idx - 1][1]
        y_c = scores[best_idx][1]
        y_r = scores[best_idx + 1][1]
        denom = 2.0 * (y_l - 2.0 * y_c + y_r)
        if abs(denom) > 1e-9:
            frac_samples = max(-0.5, min(0.5, (y_l - y_r) / denom))

    exact_shift_s = (best_lag_samples + frac_samples) / float(sample_rate_hz)
    offset_frames = round(exact_shift_s * fps)
    residual_s = exact_shift_s - (offset_frames / max(1.0, fps))
    micro_trim_ms = round(residual_s * 1000.0, 2)
    confidence = round(max(0.15, min(0.99, best_corr)), 3)
    return offset_frames, micro_trim_ms, confidence


def _default_angles_for_preset(
    preset_id: MulticamStudioPresetId,
    fps: float,
    duration_s: float,
) -> list[MulticamStudioAngleSpec]:
    fps_int = max(1, round(fps))
    base_tc = smpte_to_frames("01:00:00:00", fps_int)
    if preset_id == "tutorial_2cam_pip_switch":
        specs = [
            ("CAM 1 - Presenter A-Cam", "media/cam1_presenter.mov", "#3b82f6", 0, 12),
            ("CAM 2 - Desk / Screen PiP", "media/cam2_overhead_desk.mov", "#10b981", 10, 22),
        ]
    elif preset_id == "concert_3cam_audio_lock":
        specs = [
            ("CAM 1 - Stage Wide FOH", "media/concert_foh_wide.mov", "#3b82f6", 0, 14),
            ("CAM 2 - Lead Vocal Close", "media/concert_vocal_close.mov", "#10b981", 18, 32),
            ("CAM 3 - Guitar / Drum Pit", "media/concert_stage_pit.mov", "#f59e0b", -9, 5),
        ]
    else:
        specs = [
            ("CAM 1 - Host Wide", "media/podcast_cam1_host.mov", "#3b82f6", 0, 12),
            ("CAM 2 - Guest A Medium", "media/podcast_cam2_guest_a.mov", "#10b981", 14, 26),
            ("CAM 3 - Guest B Close", "media/podcast_cam3_guest_b.mov", "#f59e0b", -7, 5),
            ("CAM 4 - Table Two-Shot", "media/podcast_cam4_twoshot.mov", "#ec4899", 21, 33),
        ]

    angles: list[MulticamStudioAngleSpec] = []
    for idx, (label, path, color_tag, tc_off, slate_f) in enumerate(specs, start=1):
        env = synthesize_angle_waveform(
            idx,
            duration_s=duration_s,
            shift_frames=12 - slate_f,
            fps=fps,
            preset_id=preset_id,
            slate_frame=slate_f,
        )
        angles.append(
            MulticamStudioAngleSpec(
                angle_index=idx,
                name=label,
                source_path=path,
                color_tag=color_tag
                or MULTICAM_ANGLE_COLORS[(idx - 1) % len(MULTICAM_ANGLE_COLORS)],
                timecode_start=frames_to_smpte(max(0, base_tc + tc_off), fps_int),
                slate_marker_frame=slate_f,
                manual_offset_frames=0,
                audio_gain_db=0.0,
                waveform_envelope=env,
                enabled=True,
            )
        )
    return angles


def list_multicam_studio_presets() -> list[MulticamStudioPreset]:
    """Return built-in broadcast Multi-Cam Studio presets."""
    podcast_angles = _default_angles_for_preset("podcast_4cam_interview", 25.0, 24.0)
    podcast_cfg = MulticamStudioConfig(
        preset_id="podcast_4cam_interview",
        sync_mode="audio_waveform",
        cut_mode="video_and_audio",
        audio_follow_video=True,
        master_audio_angle=1,
        compile_mode="program_stitch",
        fps=25.0,
        duration_s=24.0,
        min_hold_ms=650,
        speaker_threshold_db=-26.0,
        speaker_hysteresis_db=3.0,
        angles=podcast_angles,
        cuts=[
            MulticamStudioCutPoint(
                time_s=0.0, angle_index=1, cut_mode="video_and_audio", source="initial"
            ),
            MulticamStudioCutPoint(
                time_s=3.0, angle_index=2, cut_mode="video_and_audio", source="auto_speaker"
            ),
            MulticamStudioCutPoint(
                time_s=6.0, angle_index=3, cut_mode="video_and_audio", source="auto_speaker"
            ),
            MulticamStudioCutPoint(
                time_s=9.0, angle_index=4, cut_mode="video_and_audio", source="auto_speaker"
            ),
            MulticamStudioCutPoint(
                time_s=12.0, angle_index=1, cut_mode="video_and_audio", source="auto_speaker"
            ),
            MulticamStudioCutPoint(
                time_s=16.5, angle_index=2, cut_mode="video_and_audio", source="auto_speaker"
            ),
        ],
    )

    concert_angles = _default_angles_for_preset("concert_3cam_audio_lock", 25.0, 24.0)
    concert_cfg = MulticamStudioConfig(
        preset_id="concert_3cam_audio_lock",
        sync_mode="timecode",
        cut_mode="video_only",
        audio_follow_video=False,
        master_audio_angle=1,
        compile_mode="quad_view",
        fps=25.0,
        duration_s=24.0,
        min_hold_ms=500,
        speaker_threshold_db=-30.0,
        speaker_hysteresis_db=4.0,
        angles=concert_angles,
        cuts=[
            MulticamStudioCutPoint(
                time_s=0.0, angle_index=1, cut_mode="video_only", source="initial"
            ),
            MulticamStudioCutPoint(
                time_s=4.0, angle_index=2, cut_mode="video_only", source="manual"
            ),
            MulticamStudioCutPoint(
                time_s=8.5, angle_index=3, cut_mode="video_only", source="manual"
            ),
            MulticamStudioCutPoint(
                time_s=14.0, angle_index=1, cut_mode="video_only", source="manual"
            ),
        ],
    )

    tutorial_angles = _default_angles_for_preset("tutorial_2cam_pip_switch", 25.0, 24.0)
    tutorial_cfg = MulticamStudioConfig(
        preset_id="tutorial_2cam_pip_switch",
        sync_mode="slate_marker",
        cut_mode="video_only",
        audio_follow_video=False,
        master_audio_angle=1,
        compile_mode="program_stitch",
        fps=25.0,
        duration_s=24.0,
        min_hold_ms=550,
        speaker_threshold_db=-27.0,
        speaker_hysteresis_db=3.5,
        angles=tutorial_angles,
        cuts=[
            MulticamStudioCutPoint(
                time_s=0.0, angle_index=1, cut_mode="video_only", source="initial"
            ),
            MulticamStudioCutPoint(
                time_s=4.5, angle_index=2, cut_mode="video_only", source="manual"
            ),
            MulticamStudioCutPoint(
                time_s=11.0, angle_index=1, cut_mode="video_only", source="manual"
            ),
            MulticamStudioCutPoint(
                time_s=17.0, angle_index=2, cut_mode="video_only", source="manual"
            ),
        ],
    )

    custom_cfg = podcast_cfg.model_copy(
        update={
            "preset_id": "custom",
            "cut_mode": "video_only",
            "audio_follow_video": False,
        }
    )

    return [
        MulticamStudioPreset(
            preset_id="podcast_4cam_interview",
            label="Podcast 4-Cam Interview",
            description=(
                "4-angle studio interview with waveform cross-correlation "
                "and Audio-Follow-Video switching."
            ),
            angle_count=4,
            default_sync_mode="audio_waveform",
            default_cut_mode="video_and_audio",
            default_audio_follow_video=True,
            min_hold_ms=650,
            default_config=podcast_cfg,
        ),
        MulticamStudioPreset(
            preset_id="concert_3cam_audio_lock",
            label="Concert 3-Cam Audio Lock",
            description=(
                "3-angle live stage switching locked to Master FOH audio "
                "via SMPTE timecode."
            ),
            angle_count=3,
            default_sync_mode="timecode",
            default_cut_mode="video_only",
            default_audio_follow_video=False,
            min_hold_ms=500,
            default_config=concert_cfg,
        ),
        MulticamStudioPreset(
            preset_id="tutorial_2cam_pip_switch",
            label="Tutorial 2-Cam Desk Switch",
            description=(
                "2-angle presenter and overhead desk switching synced on "
                "clap/slate marker."
            ),
            angle_count=2,
            default_sync_mode="slate_marker",
            default_cut_mode="video_only",
            default_audio_follow_video=False,
            min_hold_ms=550,
            default_config=tutorial_cfg,
        ),
        MulticamStudioPreset(
            preset_id="custom",
            label="Custom Multi-Cam Bank",
            description=(
                "Custom 2 to 4 camera configuration with manual offsets "
                "and custom hold thresholds."
            ),
            angle_count=4,
            default_sync_mode="audio_waveform",
            default_cut_mode="video_only",
            default_audio_follow_video=False,
            min_hold_ms=450,
            default_config=custom_cfg,
        ),
    ]


def get_multicam_studio_preset(preset_id: str) -> MulticamStudioPreset:
    """Return a single Multi-Cam Studio preset by id."""
    cleaned = preset_id.strip().lower()
    for preset in list_multicam_studio_presets():
        if preset.preset_id == cleaned:
            return preset
    allowed = ", ".join(ALLOWED_MULTICAM_STUDIO_PRESET_IDS)
    raise ValueError(f"Unsupported multicam preset {preset_id!r}; expected one of: {allowed}")


def normalize_multicam_studio_config(raw: Any) -> MulticamStudioConfig:
    """Normalize an optional raw dict into a validated MulticamStudioConfig."""
    if isinstance(raw, MulticamStudioConfig):
        return raw
    if raw is None:
        return list_multicam_studio_presets()[0].default_config
    if not isinstance(raw, Mapping):
        raise ValueError("Multicam Studio config must be a JSON object")

    data = dict(raw)
    preset_raw = str(data.get("preset_id", "podcast_4cam_interview")).strip().lower()
    if preset_raw not in ALLOWED_MULTICAM_STUDIO_PRESET_IDS:
        allowed = ", ".join(ALLOWED_MULTICAM_STUDIO_PRESET_IDS)
        raise ValueError(f"Unsupported preset_id {preset_raw!r}; expected one of: {allowed}")

    # Fill missing fields from preset baseline if angles are omitted
    if "angles" not in data or not data.get("angles"):
        base_cfg = get_multicam_studio_preset(preset_raw).default_config.model_dump(mode="python")
        for key, val in data.items():
            base_cfg[key] = val
        return MulticamStudioConfig.model_validate(base_cfg)
    return MulticamStudioConfig.model_validate(data)


def sync_multicam_studio_angles(config: MulticamStudioConfig) -> MulticamSyncResult:
    """Align 2 to 4 camera tracks via audio cross-correlation, SMPTE timecode, or slate marker."""
    fps = float(config.fps)
    fps_int = max(1, round(fps))
    duration_frames = max(1, round(config.duration_s * fps))
    ref_angle = config.angles[0]

    # Ensure every angle has a deterministic envelope if omitted
    envelopes: dict[int, list[float]] = {}
    for angle in config.angles:
        if angle.waveform_envelope and len(angle.waveform_envelope) >= 8:
            envelopes[angle.angle_index] = list(angle.waveform_envelope)
        else:
            envelopes[angle.angle_index] = synthesize_angle_waveform(
                angle.angle_index,
                duration_s=config.duration_s,
                shift_frames=ref_angle.slate_marker_frame - angle.slate_marker_frame,
                fps=fps,
                preset_id=config.preset_id,
                slate_frame=angle.slate_marker_frame,
            )

    ref_env = envelopes[ref_angle.angle_index]
    ref_tc_frames = smpte_to_frames(ref_angle.timecode_start, fps_int)
    ref_slate = ref_angle.slate_marker_frame

    reports: list[MulticamAngleSyncReport] = []
    notes: list[str] = []

    for angle in config.angles:
        env = envelopes[angle.angle_index]
        peak_idx = max(range(len(env)), key=lambda idx: env[idx]) if env else 0
        peak_amp = env[peak_idx] if env else 0.1
        rms_amp = math.sqrt(sum(v * v for v in env) / max(1, len(env))) if env else 0.05
        peak_frame = round((peak_idx / float(ENVELOPE_SAMPLE_RATE_HZ)) * fps)

        if config.sync_mode == "audio_waveform":
            if angle.angle_index == ref_angle.angle_index:
                offset_frames = angle.manual_offset_frames
                micro_trim_ms = 0.0
                confidence = 0.99
            else:
                corr_frames, micro_trim_ms, confidence = correlate_audio_envelopes(
                    ref_env,
                    env,
                    sample_rate_hz=ENVELOPE_SAMPLE_RATE_HZ,
                    fps=fps,
                )
                offset_frames = corr_frames + angle.manual_offset_frames
        elif config.sync_mode == "timecode":
            tc_frames = smpte_to_frames(angle.timecode_start, fps_int)
            offset_frames = (tc_frames - ref_tc_frames) + angle.manual_offset_frames
            micro_trim_ms = 0.0
            confidence = 1.0 if _TC_PATTERN.match(angle.timecode_start) else 0.65
        else:  # slate_marker
            offset_frames = (ref_slate - angle.slate_marker_frame) + angle.manual_offset_frames
            micro_trim_ms = 0.0
            confidence = 0.97 if angle.slate_marker_frame >= 0 else 0.6

        offset_s = round(offset_frames / max(1.0, fps), 4)
        reports.append(
            MulticamAngleSyncReport(
                angle_index=angle.angle_index,
                name=angle.name,
                color_tag=angle.color_tag,
                offset_frames=offset_frames,
                offset_s=offset_s,
                micro_trim_ms=micro_trim_ms,
                confidence=confidence,
                peak_frame=peak_frame,
                peak_db=_amp_to_db(peak_amp),
                rms_db=_amp_to_db(rms_amp),
                waveform_envelope=env,
            )
        )

    mean_conf = round(sum(r.confidence for r in reports) / max(1, len(reports)), 3)
    notes.append(
        f"Synchronized {len(reports)} camera angles using {config.sync_mode} "
        f"(reference: {ref_angle.name}, mean confidence {mean_conf * 100:.1f}%)."
    )

    return MulticamSyncResult(
        preset_id=config.preset_id,
        sync_mode=config.sync_mode,
        fps=fps,
        duration_s=config.duration_s,
        duration_frames=duration_frames,
        reference_angle=ref_angle.angle_index,
        mean_confidence=mean_conf,
        angles=reports,
        notes=notes,
    )


def resolve_multicam_studio_segments(
    config: MulticamStudioConfig,
) -> tuple[list[MulticamStudioSegment], list[str]]:
    """Resolve cut points into segments and detect cuts shorter than min_hold_ms."""
    angle_map = {a.angle_index: a for a in config.angles}
    ordered_cuts = sorted(config.cuts, key=lambda c: c.time_s)
    fps = float(config.fps)
    total_frames = max(1, round(config.duration_s * fps))
    segments: list[MulticamStudioSegment] = []
    warnings: list[str] = []

    for idx, cut in enumerate(ordered_cuts):
        start_s = round(max(0.0, min(config.duration_s - 0.04, cut.time_s)), 3)
        end_s = (
            round(max(start_s + 0.04, min(config.duration_s, ordered_cuts[idx + 1].time_s)), 3)
            if idx + 1 < len(ordered_cuts)
            else round(config.duration_s, 3)
        )
        dur_s = round(max(0.04, end_s - start_s), 3)
        dur_ms = max(1, round(dur_s * 1000.0))
        start_f = max(0, min(total_frames - 1, round(start_s * fps)))
        end_f = max(start_f + 1, min(total_frames, round(end_s * fps)))
        dur_f = max(1, end_f - start_f)

        angle = angle_map.get(cut.angle_index, config.angles[0])
        effective_cut_mode: MulticamStudioCutMode = (
            "video_and_audio"
            if (config.cut_mode == "video_and_audio" or config.audio_follow_video)
            else cut.cut_mode
        )
        if config.cut_mode == "video_only" and not config.audio_follow_video:
            effective_cut_mode = "video_only"
        audio_angle = (
            angle.angle_index
            if (effective_cut_mode == "video_and_audio" and config.audio_follow_video)
            else config.master_audio_angle
        )
        is_short = dur_ms < config.min_hold_ms
        if is_short:
            warnings.append(
                f"Segment #{idx + 1} ({angle.name}) at {start_s:.2f}s is {dur_ms}ms "
                f"(< min hold {config.min_hold_ms}ms)."
            )

        segments.append(
            MulticamStudioSegment(
                segment_index=idx,
                start_s=start_s,
                end_s=end_s,
                duration_s=dur_s,
                duration_ms=dur_ms,
                start_frame=start_f,
                end_frame=end_f,
                duration_frames=dur_f,
                angle_index=angle.angle_index,
                angle_name=angle.name,
                color_tag=angle.color_tag,
                cut_mode=effective_cut_mode,
                audio_angle_index=audio_angle,
                is_short_cut=is_short,
                source=cut.source,
            )
        )

    return segments, warnings


def auto_switch_multicam_speakers(
    config: MulticamStudioConfig,
) -> MulticamAutoSwitchResult:
    """Auto-generate cut points on active mic energy peaks respecting min_hold_ms."""
    sync_report = sync_multicam_studio_angles(config)
    envelopes = {r.angle_index: r.waveform_envelope for r in sync_report.angles}
    offsets_s = {r.angle_index: r.offset_s for r in sync_report.angles}
    gains_db = {a.angle_index: a.audio_gain_db for a in config.angles}

    step_s = 0.1
    min_hold_s = max(0.1, config.min_hold_ms / 1000.0)
    total_steps = max(1, int(round(config.duration_s / step_s)))

    current_angle = config.angles[0].angle_index
    last_switch_s = 0.0
    generated_cuts: list[MulticamStudioCutPoint] = [
        MulticamStudioCutPoint(
            time_s=0.0,
            angle_index=current_angle,
            cut_mode=config.cut_mode,
            source="initial",
            confidence=1.0,
        )
    ]
    active_counts: dict[int, int] = {a.angle_index: 0 for a in config.angles}

    for step in range(total_steps):
        t = round(step * step_s, 3)
        # Skip initial slate burst when detecting active speaker
        if t < 0.8:
            active_counts[current_angle] += 1
            continue

        levels_db: dict[int, float] = {}
        for angle in config.angles:
            if not angle.enabled:
                continue
            env = envelopes.get(angle.angle_index, [])
            if not env:
                levels_db[angle.angle_index] = -60.0
                continue
            # Sample aligned waveform at timeline time t
            aligned_t = max(0.0, t - offsets_s.get(angle.angle_index, 0.0))
            sample_idx = max(0, min(len(env) - 1, round(aligned_t * ENVELOPE_SAMPLE_RATE_HZ)))
            amp = env[sample_idx]
            levels_db[angle.angle_index] = _amp_to_db(amp) + gains_db.get(angle.angle_index, 0.0)

        if levels_db:
            best_angle = max(levels_db, key=lambda idx: levels_db[idx])
            best_db = levels_db[best_angle]
            cur_db = levels_db.get(current_angle, -60.0)

            if (
                best_angle != current_angle
                and best_db >= config.speaker_threshold_db
                and (best_db - cur_db) >= config.speaker_hysteresis_db
                and (t - last_switch_s) >= min_hold_s
                and (config.duration_s - t) >= min_hold_s
            ):
                current_angle = best_angle
                last_switch_s = t
                conf = round(max(0.55, min(0.99, (best_db + 60.0) / 60.0)), 3)
                generated_cuts.append(
                    MulticamStudioCutPoint(
                        time_s=t,
                        angle_index=best_angle,
                        cut_mode=config.cut_mode,
                        source="auto_speaker",
                        confidence=conf,
                    )
                )

        active_counts[current_angle] = active_counts.get(current_angle, 0) + 1

    next_cfg = config.model_copy(update={"cuts": generated_cuts})
    segments, warnings = resolve_multicam_studio_segments(next_cfg)
    activity_ratio = {idx: round(cnt / float(total_steps), 3) for idx, cnt in active_counts.items()}

    return MulticamAutoSwitchResult(
        config=next_cfg,
        sync_report=sync_report,
        segments=segments,
        short_cut_count=len(warnings),
        short_cut_warnings=warnings,
        speaker_activity_ratio=activity_ratio,
    )


def compile_multicam_studio_filtergraph(
    config: MulticamStudioConfig,
    mode: MulticamStudioCompileMode | None = None,
) -> MulticamStudioCompileResult:
    """Compile FFmpeg filter_complex graph for Program Stitch or 2x2 Quad-View with Red Tally."""
    compile_mode = mode if mode is not None else config.compile_mode
    sync_report = sync_multicam_studio_angles(config)
    offsets_s = {r.angle_index: max(0.0, r.offset_s) for r in sync_report.angles}
    angle_to_input = {a.angle_index: idx for idx, a in enumerate(config.angles)}
    segments, warnings = resolve_multicam_studio_segments(config)

    w = int(config.width)
    h = int(config.height)
    stages: list[str] = []

    if compile_mode == "quad_view":
        cell_w = max(160, w // 2)
        cell_h = max(90, h // 2)
        cell_labels: list[str] = []
        quad_coords = [
            (0, 0),
            (cell_w, 0),
            (0, cell_h),
            (cell_w, cell_h),
        ]

        for slot in range(4):
            lbl = f"[mc_q{slot}]"
            if slot < len(config.angles):
                angle = config.angles[slot]
                in_idx = angle_to_input[angle.angle_index]
                off_s = offsets_s.get(angle.angle_index, 0.0)
                end_s = off_s + config.duration_s
                safe_title = re.sub(r"[:'\\]", "", angle.name)[:24]
                stages.append(
                    f"[{in_idx}:v]trim=start={off_s:.3f}:end={end_s:.3f},"
                    f"setpts=PTS-STARTPTS,scale={cell_w}:{cell_h}:force_original_aspect_ratio=decrease,"
                    f"pad={cell_w}:{cell_h}:(ow-iw)/2:(oh-ih)/2:color=#101116,"
                    f"drawtext=text='CAM {angle.angle_index} {safe_title}':x=12:y=12:"
                    f"fontsize=18:fontcolor=white:box=1:boxcolor=#0b0d12@0.75{lbl}"
                )
            else:
                stages.append(f"color=c=#101116:s={cell_w}x{cell_h}:d={config.duration_s:.3f}{lbl}")
            cell_labels.append(lbl)

        stages.append(f"{''.join(cell_labels)}xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0[mc_stack]")
        cur_lbl = "[mc_stack]"
        for seg_idx, seg in enumerate(segments):
            slot_idx = max(0, min(3, seg.angle_index - 1))
            qx, qy = quad_coords[slot_idx]
            next_lbl = "[v_mc_quad]" if seg_idx == len(segments) - 1 else f"[mc_tally_{seg_idx}]"
            stages.append(
                f"{cur_lbl}drawbox=x={qx}:y={qy}:w={cell_w}:h={cell_h}:"
                f"color=#e53935@0.95:t=6:enable='between(t,{seg.start_s:.3f},{seg.end_s:.3f})'{next_lbl}"
            )
            cur_lbl = next_lbl

        master_in = angle_to_input.get(config.master_audio_angle, 0)
        master_off = offsets_s.get(config.master_audio_angle, 0.0)
        stages.append(
            f"[{master_in}:a]atrim=start={master_off:.3f}:end={master_off + config.duration_s:.3f},"
            f"asetpts=PTS-STARTPTS[a_mc_quad]"
        )
        filter_complex = ";".join(stages)
        ffmpeg_args: list[str] = []
        for angle in config.angles:
            ffmpeg_args.extend(["-i", angle.source_path or f"cam{angle.angle_index}.mov"])
        ffmpeg_args.extend(
            [
                "-filter_complex",
                filter_complex,
                "-map",
                "[v_mc_quad]",
                "-map",
                "[a_mc_quad]",
            ]
        )
        return MulticamStudioCompileResult(
            preset_id=config.preset_id,
            mode="quad_view",
            duration_s=round(config.duration_s, 3),
            fps=float(config.fps),
            width=w,
            height=h,
            angle_count=len(config.angles),
            segment_count=len(segments),
            short_cut_count=len(warnings),
            segments=segments,
            short_cut_warnings=warnings,
            filter_complex=filter_complex,
            ffmpeg_args=ffmpeg_args,
            video_map_label="[v_mc_quad]",
            audio_map_label="[a_mc_quad]",
        )

    # program_stitch mode
    v_labels: list[str] = []
    a_labels: list[str] = []
    for idx, seg in enumerate(segments):
        v_in = angle_to_input.get(seg.angle_index, 0)
        v_off = offsets_s.get(seg.angle_index, 0.0)
        v_start = v_off + seg.start_s
        v_end = v_off + seg.end_s
        v_lbl = f"[mc_v{idx}]"
        stages.append(
            f"[{v_in}:v]trim=start={v_start:.3f}:end={v_end:.3f},"
            f"setpts=PTS-STARTPTS,scale={w}:{h}:force_original_aspect_ratio=decrease,"
            f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2{v_lbl}"
        )
        v_labels.append(v_lbl)

        a_in = angle_to_input.get(seg.audio_angle_index, 0)
        a_off = offsets_s.get(seg.audio_angle_index, 0.0)
        a_start = a_off + seg.start_s
        a_end = a_off + seg.end_s
        a_lbl = f"[mc_a{idx}]"
        stages.append(
            f"[{a_in}:a]atrim=start={a_start:.3f}:end={a_end:.3f},asetpts=PTS-STARTPTS{a_lbl}"
        )
        a_labels.append(a_lbl)

    if len(v_labels) == 1:
        stages.append(f"{v_labels[0]}copy[v_mc]")
        stages.append(f"{a_labels[0]}acopy[a_mc]")
    else:
        stages.append(f"{''.join(v_labels)}concat=n={len(v_labels)}:v=1:a=0[v_mc]")
        stages.append(f"{''.join(a_labels)}concat=n={len(a_labels)}:v=0:a=1[a_mc]")

    filter_complex = ";".join(stages)
    ffmpeg_args = []
    for angle in config.angles:
        ffmpeg_args.extend(["-i", angle.source_path or f"cam{angle.angle_index}.mov"])
    ffmpeg_args.extend(
        [
            "-filter_complex",
            filter_complex,
            "-map",
            "[v_mc]",
            "-map",
            "[a_mc]",
        ]
    )
    return MulticamStudioCompileResult(
        preset_id=config.preset_id,
        mode="program_stitch",
        duration_s=round(config.duration_s, 3),
        fps=float(config.fps),
        width=w,
        height=h,
        angle_count=len(config.angles),
        segment_count=len(segments),
        short_cut_count=len(warnings),
        segments=segments,
        short_cut_warnings=warnings,
        filter_complex=filter_complex,
        ffmpeg_args=ffmpeg_args,
        video_map_label="[v_mc]",
        audio_map_label="[a_mc]",
    )


def build_multicam_studio_timeline_doc(
    config: MulticamStudioConfig,
    title: str = "TaktCut Multi-Cam Edit",
) -> TimelineDocument:
    """Build a valid TaktCut TimelineDocument containing flattened Multi-Cam cut edits."""
    fps_int = max(1, round(config.fps))
    fps_spec = RationalFrameRate(num=fps_int, den=1)
    segments, _ = resolve_multicam_studio_segments(config)
    sync_report = sync_multicam_studio_angles(config)
    offsets_frames = {r.angle_index: max(0, r.offset_frames) for r in sync_report.angles}
    angle_map = {a.angle_index: a for a in config.angles}

    video_clips: list[TimelineClip] = []
    audio_clips: list[TimelineClip] = []
    for seg in segments:
        v_angle = angle_map.get(seg.angle_index, config.angles[0])
        v_off = offsets_frames.get(seg.angle_index, 0)
        video_clips.append(
            TimelineClip(
                name=v_angle.name,
                track_index=1,
                media_type="video",
                start_frame=seg.start_frame,
                duration_frames=seg.duration_frames,
                source_in_frame=v_off + seg.start_frame,
                source_path=v_angle.source_path or f"cam{v_angle.angle_index}.mov",
                source_fps=fps_spec,
            )
        )
        a_angle = angle_map.get(seg.audio_angle_index, config.angles[0])
        a_off = offsets_frames.get(seg.audio_angle_index, 0)
        audio_clips.append(
            TimelineClip(
                name=f"{a_angle.name} Audio",
                track_index=1,
                media_type="audio",
                start_frame=seg.start_frame,
                duration_frames=seg.duration_frames,
                source_in_frame=a_off + seg.start_frame,
                source_path=a_angle.source_path or f"cam{a_angle.angle_index}.mov",
                source_fps=fps_spec,
                audio_gain_db=a_angle.audio_gain_db,
            )
        )

    return TimelineDocument(
        name=title[:120] or "TaktCut Multi-Cam Edit",
        source_format="otio",
        fps=fps_spec,
        width=config.width,
        height=config.height,
        start_frame=0,
        tracks=[
            TimelineTrack(index=1, kind="video", name="V1 Multi-Cam Program", clips=video_clips),
            TimelineTrack(index=1, kind="audio", name="A1 Multi-Cam Mix", clips=audio_clips),
        ],
    )


def export_multicam_edl(
    config: MulticamStudioConfig,
    *,
    title: str = "TAKTCUT_MULTICAM",
    fmt: Literal["edl", "timeline_json"] = "edl",
) -> MulticamEdlExportResult:
    """Export Multi-Cam edits as CMX 3600 EDL text and TaktCut TimelineDocument JSON."""
    fps_int = max(1, round(config.fps))
    segments, warnings = resolve_multicam_studio_segments(config)
    sync_report = sync_multicam_studio_angles(config)
    offsets_frames = {r.angle_index: max(0, r.offset_frames) for r in sync_report.angles}
    angle_map = {a.angle_index: a for a in config.angles}

    clean_title = _SAFE_EDL_NAME_RE.sub("_", title.strip().upper()).strip("_") or "TAKTCUT_MULTICAM"
    lines: list[str] = [
        f"TITLE: {clean_title}",
        "FCM: NON-DROP FRAME",
        "",
    ]
    base_src_tc = smpte_to_frames("01:00:00:00", fps_int)
    for idx, seg in enumerate(segments, start=1):
        angle = angle_map.get(seg.angle_index, config.angles[0])
        reel = f"CAM_{angle.angle_index}".ljust(8)[:8]
        track_code = "AA/V" if seg.cut_mode == "video_and_audio" else "V   "
        off = offsets_frames.get(angle.angle_index, 0)
        src_in_tc = frames_to_smpte(base_src_tc + off + seg.start_frame, fps_int)
        src_out_tc = frames_to_smpte(base_src_tc + off + seg.end_frame, fps_int)
        rec_in_tc = frames_to_smpte(seg.start_frame, fps_int)
        rec_out_tc = frames_to_smpte(seg.end_frame, fps_int)
        lines.append(
            f"{idx:03d}  {reel} {track_code}  C        "
            f"{src_in_tc} {src_out_tc} {rec_in_tc} {rec_out_tc}"
        )
        lines.append(f"* FROM CLIP NAME: {angle.name}")
        if angle.source_path:
            lines.append(f"* SOURCE FILE: {angle.source_path}")
        lines.append("")

    edl_text = "\n".join(lines).rstrip() + "\n"
    timeline_doc = build_multicam_studio_timeline_doc(config, title=clean_title)
    timeline_json = json.dumps(timeline_doc.model_dump(mode="json"), indent=2) + "\n"
    ext = ".json" if fmt == "timeline_json" else ".edl"
    filename = f"{clean_title.lower()}{ext}"

    return MulticamEdlExportResult(
        format=fmt,
        title=clean_title,
        fps=float(config.fps),
        segment_count=len(segments),
        short_cut_count=len(warnings),
        edl_text=edl_text,
        timeline_json=timeline_json,
        saved_path=None,
        filename=filename,
    )


def apply_multicam_studio_to_document(
    doc: TimelineDocument,
    config: MulticamStudioConfig,
    *,
    track_index: int = 1,
    clip_index: int = 0,
) -> TimelineDocument:
    """Apply Multi-Cam Studio bank angles and cut events onto a TimelineDocument video clip."""
    next_doc = doc.model_copy(deep=True)
    fps_float = next_doc.fps.as_float if next_doc.fps else float(config.fps)
    fps_int = max(1, round(fps_float))
    sync_report = sync_multicam_studio_angles(config)
    offsets_map = {r.angle_index: r.offset_frames for r in sync_report.angles}

    target_trk_pos: int | None = None
    for idx, trk in enumerate(next_doc.tracks):
        if trk.kind == "video" and trk.index == track_index:
            target_trk_pos = idx
            break
    if target_trk_pos is None:
        raise ValueError(f"Video track V{track_index} not found")

    trk = next_doc.tracks[target_trk_pos]
    if not trk.clips:
        raise ValueError(f"Video track V{track_index} has no clips")

    safe_clip_idx = max(0, min(len(trk.clips) - 1, clip_index))
    target_clip = trk.clips[safe_clip_idx]
    bank_dur = max(1, target_clip.duration_frames)

    bank_angles: list[MulticamAngle] = []
    for a in config.angles:
        bank_color = MULTICAM_ANGLE_COLORS[(a.angle_index - 1) % len(MULTICAM_ANGLE_COLORS)]
        bank_angles.append(
            MulticamAngle(
                angle_index=a.angle_index,
                name=a.name,
                source_path=a.source_path,
                source_in_frame=0,
                duration_frames=bank_dur,
                sync_offset_frames=offsets_map.get(a.angle_index, 0),
                timecode_start=a.timecode_start,
                audio_peak_frame=a.slate_marker_frame,
                color_tag=bank_color,
                audio_follow=(a.angle_index == config.master_audio_angle),
                enabled=a.enabled,
            )
        )

    cut_events: list[MulticamCutEvent] = []
    for c in config.cuts:
        ratio = c.time_s / max(0.001, config.duration_s)
        local_f = max(0, min(bank_dur - 1, round(ratio * bank_dur)))
        mc_cut_mode: MulticamCutMode = (
            "audio_video"
            if (c.cut_mode == "video_and_audio" or config.audio_follow_video)
            else "video_only"
        )
        cut_events.append(
            MulticamCutEvent(
                frame=local_f,
                angle_index=c.angle_index,
                cut_mode=mc_cut_mode,
            )
        )

    sync_mode_mapped: MulticamSyncMode = (
        "marker" if config.sync_mode == "slate_marker" else config.sync_mode
    )
    bank = MulticamBank(
        id=f"mc_studio_{config.preset_id}",
        name=f"Multi-Cam ({config.preset_id})",
        fps=RationalFrameRate(num=fps_int, den=1),
        width=config.width,
        height=config.height,
        duration_frames=bank_dur,
        sync_mode=sync_mode_mapped,
        audio_follow_angle=config.master_audio_angle,
        angles=bank_angles,
        cuts=cut_events,
    )
    trk.clips[safe_clip_idx] = target_clip.model_copy(
        update={
            "name": bank.name,
            "multicam_bank": bank,
        }
    )
    return next_doc
