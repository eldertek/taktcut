"""Local ThreadingHTTPServer backend for taktcut Web Studio GUI."""

from __future__ import annotations

import argparse
import base64
import binascii
import json
import os
import shlex
import shutil
import subprocess
import sys
import tempfile
import threading
from dataclasses import dataclass, field
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from defusedxml.common import DefusedXmlException
from pydantic import ValidationError

from taktcut import __version__
from taktcut.color import (
    COLOR_BALANCE_MAX,
    COLOR_BALANCE_MIN,
    CONTRAST_MAX,
    CONTRAST_MIN,
    MAX_COLOR_NODES,
    SATURATION_MAX,
    SATURATION_MIN,
    TEMPERATURE_MAX,
    TEMPERATURE_MIN,
    ColorGradeParams,
    ColorNodeParams,
    apply_color_preset,
    bake_cdl_to_cube,
    bake_color_grade_to_cube,
    bake_color_node_chain_to_cube,
    compile_color_grade,
    compile_color_node_chain,
    list_color_curves_presets,
    list_color_presets,
    parse_cdl_xml,
    parse_cube_lut,
    parse_cube_lut_text,
)
from taktcut.drp import export_otio, load_timeline, validate_timeline
from taktcut.fx import (
    CHROMA_KEY_BLEND_MAX,
    CHROMA_KEY_BLEND_MIN,
    CHROMA_KEY_DEFAULT_BLEND,
    CHROMA_KEY_DEFAULT_SIMILARITY,
    CHROMA_KEY_SIMILARITY_MAX,
    CHROMA_KEY_SIMILARITY_MIN,
    FX_PARAM_SPECS,
    ChromaKeyParams,
    FxNode,
    PlanarTrackerParams,
    StabilizerParams,
    apply_chroma_key_preset,
    apply_planar_tracker_preset,
    apply_stabilizer_preset,
    compile_chroma_key,
    compile_fx_filtergraph,
    compile_planar_tracker,
    compile_stabilizer,
    get_fx_preset,
    list_chroma_key_presets,
    list_fx_presets,
    list_planar_tracker_presets,
    list_stabilizer_presets,
)
from taktcut.models import (
    REVIEW_WATERMARK_OPACITY_DEFAULT,
    TRANSFORM_BORDER_FEATHER_MAX,
    TRANSFORM_BORDER_FEATHER_MIN,
    TRANSFORM_BORDER_WIDTH_MAX,
    TRANSFORM_BORDER_WIDTH_MIN,
    TRANSFORM_CROP_MAX,
    TRANSFORM_CROP_MIN,
    TRANSFORM_CROP_SUM_MAX,
    TRANSFORM_SHADOW_BLUR_MAX,
    TRANSFORM_SHADOW_BLUR_MIN,
    TRANSFORM_SHADOW_OFFSET_MAX,
    TRANSFORM_SHADOW_OFFSET_MIN,
    TRANSFORM_SHADOW_OPACITY_MAX,
    TRANSFORM_SHADOW_OPACITY_MIN,
    AscCdlParams,
    AudioOnlyFormatId,
    ClipTransformParams,
    DialogueEqPresetId,
    ExportFpsOption,
    HardwareCapabilities,
    LoudnessPresetId,
    RationalFrameRate,
    RenderProfile,
    TimecodeBurnInPosition,
    TimelineDocument,
    list_dve_layout_presets,
)
from taktcut.project import (
    PROJECT_FILE_SUFFIX,
    PROJECT_SCHEMA_VERSION,
    export_project_dict,
    export_project_json,
    load_project_file,
    parse_project_json,
    validate_project_payload,
)
from taktcut.qa import run_qa_gate
from taktcut.remote_render import (
    MAX_REMOTE_JOB_BYTES,
    RemoteRenderClient,
    RemoteRenderJobRequest,
)
from taktcut.render import (
    AUTO_DUCK_ATTACK_MS_DEFAULT,
    AUTO_DUCK_RATIO_DEFAULT,
    AUTO_DUCK_RELEASE_MS_DEFAULT,
    AUTO_DUCK_THRESHOLD_DB_DEFAULT,
    RENDER_AUDIO_BITRATE_KBPS_MAX,
    RENDER_AUDIO_BITRATE_KBPS_MIN,
    RENDER_AUDIO_BITRATE_OPTIONS_KBPS,
    RENDER_CRF_MAX,
    RENDER_CRF_MIN,
    AutoDuckParams,
    ClipAudioParams,
    ClipRetimeParams,
    ClipVideoFadeParams,
    FairlightAudioParams,
    FairlightChannelStripParams,
    FilmGrainParams,
    FramingParams,
    LowerThirdParams,
    MasterBusParams,
    ReframeParams,
    RetimeParams,
    VignetteParams,
    VoiceCleanupParams,
    build_render_plan,
    compile_audio_filter_result,
    compile_auto_duck_filter_result,
    compile_fairlight_mixer_filter,
    compile_film_grain_filter_result,
    compile_framing_filter_result,
    compile_lower_third_filter_result,
    compile_reframe_filter_result,
    compile_retime_filter_result,
    compile_transform_filter_result,
    compile_video_fade_filter_result,
    compile_vignette_filter_result,
    compile_voice_cleanup_filter_result,
    execute_render_plan,
    list_aspect_presets,
    list_delivery_presets,
    probe_hardware_capabilities,
    resolve_audio_only_output_path,
    validate_audio_only_format,
    validate_deinterlace,
    validate_dialogue_eq,
    validate_export_fps,
    validate_loudness_preset,
    validate_review_watermark_opacity,
    validate_review_watermark_text,
    validate_timecode_burnin,
)
from taktcut.subtitles import (
    ALL_CAPTION_STYLE_IDS,
    CAPTION_FONT_SIZE_MAX,
    CAPTION_FONT_SIZE_MIN,
    CAPTION_MARGIN_BOTTOM_MAX,
    CAPTION_MARGIN_BOTTOM_MIN,
    CAPTION_MAX_CUES,
    CAPTION_MAX_TEXT_LEN,
    CAPTION_STYLE_IDS,
    CAPTION_TIME_MAX_S,
    KARAOKE_MODES,
    SAFE_MARGIN_PRESETS,
    SubtitleTrackParams,
    auto_chunk_cues,
    compile_subtitles,
    compute_cue_word_timings,
    export_ass,
    export_srt,
    export_vtt,
    list_all_caption_styles,
    list_caption_styles,
    parse_ass,
    parse_srt,
    parse_vtt,
)
from taktcut.titles import (
    TITLE_FONT_SIZE_MAX,
    TITLE_FONT_SIZE_MIN,
    TITLE_MAX_LEN,
    TITLE_POSITIONS,
    TITLE_TIME_MAX_S,
    TitleOverlayParams,
    apply_title_preset,
    compile_title_overlay,
    list_title_presets,
)
from taktcut.transitions import (
    TRANSITION_DURATION_DEFAULT_S,
    TRANSITION_DURATION_MAX_S,
    TRANSITION_DURATION_MIN_S,
    TRANSITION_OFFSET_MAX_S,
    TransitionParams,
    compile_transition_filter_result,
    list_transition_presets,
)
from taktcut.ui.desktop import has_pywebview, open_studio_window, run_with_pywebview
from taktcut.ui.samples import build_sample_timeline, generate_synthetic_sample_clip
from taktcut.ui.security import (
    CDL_SUFFIXES,
    CONTENT_SECURITY_POLICY,
    LUT_SUFFIXES,
    MEDIA_SUFFIXES,
    OTIO_EXPORT_SUFFIXES,
    PROJECT_SUFFIXES,
    SUBTITLE_SUFFIXES,
    TIMELINE_SUFFIXES,
    PathConfinementError,
    confine_workspace_path,
    resolve_workspace_root,
    sanitize_download_filename,
    scan_workspace_files,
    validate_loopback_host,
)
from taktcut.updater import apply_ota_update, check_for_update, launch_windows_swap_script


def resolve_assets_dir() -> Path:
    """Resolve UI static assets directory in source, wheel, or PyInstaller _MEIPASS."""
    meipass = getattr(sys, "_MEIPASS", None)
    if isinstance(meipass, str) and meipass:
        bundled = Path(meipass) / "taktcut" / "ui" / "assets"
        if bundled.is_dir():
            return bundled
    return Path(__file__).resolve().parent / "assets"


ASSETS_DIR: Path = resolve_assets_dir()
MAX_REQUEST_BYTES: int = 32 * 1024 * 1024

STATIC_ROUTE_MAP: dict[str, tuple[str, str]] = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/styles.css": ("styles.css", "text/css; charset=utf-8"),
    "/app.js": ("app.js", "application/javascript; charset=utf-8"),
    "/i18n.js": ("i18n.js", "application/javascript; charset=utf-8"),
    "/canvas.js": ("canvas.js", "application/javascript; charset=utf-8"),
    "/color_wheels.js": ("color_wheels.js", "application/javascript; charset=utf-8"),
    "/timeline_ops.js": ("timeline_ops.js", "application/javascript; charset=utf-8"),
    "/demo_adapter.js": ("demo_adapter.js", "application/javascript; charset=utf-8"),
    "/favicon.svg": ("favicon.svg", "image/svg+xml"),
}


@dataclass(frozen=True)
class UiServerConfig:
    """Configuration for the taktcut local web studio server."""

    host: str = "127.0.0.1"
    port: int = 8741
    workspace_dir: Path | None = None
    open_browser: bool = True
    desktop: bool = False


@dataclass
class _TrackedRemoteJob:
    """Client-side proxy tracking record for a remote render job."""

    job_id: str
    remote_url: str
    bearer_token: str
    local_output_path: Path
    local_output_rel: str
    downloaded: bool = False


@dataclass
class UiAppState:
    """Thread-safe shared state for the UI HTTP server."""

    workspace_root: Path
    _caps_lock: threading.Lock = field(default_factory=threading.Lock)
    _cached_caps: HardwareCapabilities | None = None
    _cached_caps_verified: bool = False
    _remote_jobs_lock: threading.Lock = field(default_factory=threading.Lock)
    _remote_jobs: dict[str, _TrackedRemoteJob] = field(default_factory=dict)

    def track_remote_job(
        self,
        *,
        job_id: str,
        remote_url: str,
        bearer_token: str,
        local_output_path: Path,
        local_output_rel: str,
    ) -> None:
        with self._remote_jobs_lock:
            self._remote_jobs[job_id] = _TrackedRemoteJob(
                job_id=job_id,
                remote_url=remote_url,
                bearer_token=bearer_token,
                local_output_path=local_output_path,
                local_output_rel=local_output_rel,
            )

    def get_tracked_remote_job(self, job_id: str) -> _TrackedRemoteJob | None:
        with self._remote_jobs_lock:
            return self._remote_jobs.get(job_id)

    def mark_remote_job_downloaded(self, job_id: str) -> None:
        with self._remote_jobs_lock:
            rec = self._remote_jobs.get(job_id)
            if rec is not None:
                rec.downloaded = True

    def get_capabilities(
        self,
        *,
        verify_nvenc_runtime: bool = False,
        refresh: bool = False,
    ) -> tuple[HardwareCapabilities | None, str | None]:
        with self._caps_lock:
            if (
                not refresh
                and self._cached_caps is not None
                and (not verify_nvenc_runtime or self._cached_caps_verified)
            ):
                return self._cached_caps, None
            if shutil.which("ffmpeg") is None:
                return None, "ffmpeg binary not found on PATH"
            try:
                caps = probe_hardware_capabilities(verify_nvenc_runtime=verify_nvenc_runtime)
            except (FileNotFoundError, subprocess.SubprocessError, OSError) as exc:
                return None, str(exc)
            self._cached_caps = caps
            self._cached_caps_verified = verify_nvenc_runtime
            return caps, None


def _triplet(raw: Any, default: tuple[float, float, float]) -> tuple[float, float, float]:
    if raw is None:
        return default
    if not isinstance(raw, list) or len(raw) != 3:
        raise ValueError("Expected an RGB array of 3 numeric values")
    return (float(raw[0]), float(raw[1]), float(raw[2]))


def _build_cdl_from_payload(payload: dict[str, Any]) -> AscCdlParams:
    return AscCdlParams(
        slope=_triplet(payload.get("slope"), (1.0, 1.0, 1.0)),
        offset=_triplet(payload.get("offset"), (0.0, 0.0, 0.0)),
        power=_triplet(payload.get("power"), (1.0, 1.0, 1.0)),
        saturation=float(payload.get("saturation", 1.0)),
    )


def _has_color_grade_fields(payload: dict[str, Any]) -> bool:
    return any(
        key in payload for key in ("grade", "lift", "gamma", "gain", "contrast", "temperature")
    )


def _build_color_nodes_from_payload(raw_nodes: Any) -> list[ColorNodeParams]:
    if not isinstance(raw_nodes, list) or not raw_nodes:
        raise ValueError("'nodes' must be a non-empty array")
    if len(raw_nodes) > MAX_COLOR_NODES:
        raise ValueError(f"Color node tree cannot exceed {MAX_COLOR_NODES} nodes")
    return [ColorNodeParams.model_validate(item) for item in raw_nodes]


def _build_color_grade_from_payload(payload: dict[str, Any]) -> ColorGradeParams:
    preset_id = payload.get("preset") or payload.get("preset_id")
    if preset_id is not None:
        if not isinstance(preset_id, str) or not preset_id.strip():
            raise ValueError("preset must be a non-empty string")
        return apply_color_preset(preset_id)
    raw_grade = payload.get("grade")
    source: dict[str, Any] = raw_grade if isinstance(raw_grade, dict) else payload
    if raw_grade is not None and not isinstance(raw_grade, dict):
        raise ValueError("'grade' must be a JSON object")
    return ColorGradeParams.model_validate(
        {
            "lift": source.get("lift", (0.0, 0.0, 0.0)),
            "gamma": source.get("gamma", (0.0, 0.0, 0.0)),
            "gain": source.get("gain", (0.0, 0.0, 0.0)),
            "contrast": source.get("contrast", 1.0),
            "saturation": source.get("saturation", 1.0),
            "temperature": source.get("temperature", 0.0),
            "preserve_lightness": source.get("preserve_lightness", False),
        }
    )


def _build_audio_params_from_payload(
    payload: dict[str, Any],
    *,
    allow_top_level: bool = False,
) -> tuple[ClipAudioParams | None, float | None]:
    raw_clip_dur = payload.get("clip_duration_s")
    clip_duration_s: float | None = None
    if raw_clip_dur not in (None, ""):
        if isinstance(raw_clip_dur, bool) or not isinstance(raw_clip_dur, (int, float)):
            raise ValueError("clip_duration_s must be a finite number")
        clip_duration_s = float(raw_clip_dur)

    raw_audio = payload.get("audio_params")
    if raw_audio is None:
        raw_audio = payload.get("audio")
    if raw_audio is not None:
        if not isinstance(raw_audio, dict):
            raise ValueError("'audio_params' must be a JSON object")
        return (
            ClipAudioParams.model_validate(
                {
                    "gain_db": raw_audio.get("gain_db", 0.0),
                    "fade_in_s": raw_audio.get("fade_in_s", 0.0),
                    "fade_out_s": raw_audio.get("fade_out_s", 0.0),
                    "muted": bool(raw_audio.get("muted", False)),
                }
            ),
            clip_duration_s,
        )

    if allow_top_level:
        return (
            ClipAudioParams.model_validate(
                {
                    "gain_db": payload.get("gain_db", 0.0),
                    "fade_in_s": payload.get("fade_in_s", 0.0),
                    "fade_out_s": payload.get("fade_out_s", 0.0),
                    "muted": bool(payload.get("muted", False)),
                }
            ),
            clip_duration_s,
        )
    return None, clip_duration_s


def _build_video_fade_from_payload(
    payload: dict[str, Any],
    *,
    allow_top_level: bool = False,
) -> ClipVideoFadeParams | None:
    raw_fade = payload.get("video_fade")
    if raw_fade is not None:
        if not isinstance(raw_fade, dict):
            raise ValueError("'video_fade' must be a JSON object")
        return ClipVideoFadeParams.model_validate(
            {
                "fade_in_s": raw_fade.get("fade_in_s", raw_fade.get("fade_in_sec", 0.0)),
                "fade_out_s": raw_fade.get("fade_out_s", raw_fade.get("fade_out_sec", 0.0)),
            }
        )

    has_top_level_fade = any(
        key in payload and payload[key] is not None
        for key in ("fade_in_s", "fade_out_s", "fade_in_sec", "fade_out_sec")
    )
    if allow_top_level or has_top_level_fade:
        return ClipVideoFadeParams.model_validate(
            {
                "fade_in_s": payload.get("fade_in_s", payload.get("fade_in_sec", 0.0)),
                "fade_out_s": payload.get("fade_out_s", payload.get("fade_out_sec", 0.0)),
            }
        )
    return None


def _build_auto_duck_params_from_payload(
    payload: dict[str, Any],
    *,
    allow_top_level: bool = False,
) -> AutoDuckParams | None:
    raw_duck = payload.get("auto_duck")
    if raw_duck is None:
        raw_duck = payload.get("duck")
    if raw_duck is not None:
        if not isinstance(raw_duck, dict):
            raise ValueError("'auto_duck' must be a JSON object")
        return AutoDuckParams.model_validate(
            {
                "enabled": raw_duck.get("enabled", False),
                "threshold_db": raw_duck.get("threshold_db", AUTO_DUCK_THRESHOLD_DB_DEFAULT),
                "ratio": raw_duck.get("ratio", AUTO_DUCK_RATIO_DEFAULT),
                "attack_ms": raw_duck.get("attack_ms", AUTO_DUCK_ATTACK_MS_DEFAULT),
                "release_ms": raw_duck.get("release_ms", AUTO_DUCK_RELEASE_MS_DEFAULT),
            }
        )

    if allow_top_level:
        return AutoDuckParams.model_validate(
            {
                "enabled": payload.get("enabled", False),
                "threshold_db": payload.get("threshold_db", AUTO_DUCK_THRESHOLD_DB_DEFAULT),
                "ratio": payload.get("ratio", AUTO_DUCK_RATIO_DEFAULT),
                "attack_ms": payload.get("attack_ms", AUTO_DUCK_ATTACK_MS_DEFAULT),
                "release_ms": payload.get("release_ms", AUTO_DUCK_RELEASE_MS_DEFAULT),
            }
        )
    return None


def _build_fairlight_params_from_payload(
    payload: dict[str, Any],
) -> tuple[LoudnessPresetId | None, DialogueEqPresetId | None]:
    raw_fairlight = payload.get("fairlight")
    if raw_fairlight is not None:
        if not isinstance(raw_fairlight, dict):
            raise ValueError("'fairlight' must be a JSON object")
        validated = FairlightAudioParams.model_validate(raw_fairlight)
        return validated.loudness_preset, validated.dialogue_eq

    loudness_preset: LoudnessPresetId | None = None
    dialogue_eq: DialogueEqPresetId | None = None
    if "loudness_preset" in payload and payload["loudness_preset"] is not None:
        loudness_preset = validate_loudness_preset(payload["loudness_preset"])
    if "dialogue_eq" in payload and payload["dialogue_eq"] is not None:
        dialogue_eq = validate_dialogue_eq(payload["dialogue_eq"])
    return loudness_preset, dialogue_eq


def _extract_timecode_burnin(payload: dict[str, Any]) -> TimecodeBurnInPosition:
    raw = payload.get("timecode_burnin")
    if raw is None or raw == "":
        return "off"
    return validate_timecode_burnin(raw)


def _extract_export_fps(payload: dict[str, Any]) -> ExportFpsOption:
    raw = payload.get("export_fps")
    if raw is None or raw == "":
        return "source"
    return validate_export_fps(raw)


def _extract_deinterlace(payload: dict[str, Any]) -> bool:
    raw = payload.get("deinterlace")
    if raw is None:
        return False
    return validate_deinterlace(raw)


def _extract_audio_only_format(payload: dict[str, Any]) -> AudioOnlyFormatId:
    raw = payload.get("audio_only_format")
    if raw is None or raw == "":
        return "off"
    return validate_audio_only_format(raw)


def _extract_review_watermark(payload: dict[str, Any]) -> tuple[str, float]:
    raw_text = payload.get("review_watermark_text")
    text = validate_review_watermark_text(raw_text) if raw_text is not None else ""
    raw_opacity = payload.get("review_watermark_opacity")
    opacity = (
        validate_review_watermark_opacity(raw_opacity)
        if raw_opacity is not None
        else REVIEW_WATERMARK_OPACITY_DEFAULT
    )
    return text, opacity


def _build_retime_from_payload(
    payload: dict[str, Any],
    *,
    allow_top_level: bool = False,
) -> RetimeParams | None:
    if "retime" in payload:
        raw_rt = payload.get("retime")
        if raw_rt is None:
            return None
        if not isinstance(raw_rt, dict):
            raise ValueError("'retime' must be a JSON object")
        if (
            "speed_rate" in raw_rt
            and "speed" not in raw_rt
            and "enabled" not in raw_rt
        ):
            return None
        return RetimeParams.model_validate(raw_rt)
    if allow_top_level and (
        "enabled" in payload
        or "speed" in payload
        or ("speed_rate" not in payload and "retime_params" not in payload)
    ):
        allowed_keys = (
            "enabled",
            "speed",
            "reverse",
            "retime_process",
            "ramp_preset",
            "ramp_points",
        )
        subset = {k: payload[k] for k in allowed_keys if k in payload and payload[k] is not None}
        return RetimeParams.model_validate(subset)
    return None


def _build_reframe_from_payload(
    payload: dict[str, Any],
    *,
    allow_top_level: bool = False,
) -> ReframeParams | None:
    if "reframe" in payload:
        raw_rf = payload.get("reframe")
        if raw_rf is None:
            return None
        if not isinstance(raw_rf, dict):
            raise ValueError("'reframe' must be a JSON object")
        return ReframeParams.model_validate(raw_rf)
    if allow_top_level:
        allowed_keys = ("enabled", "aspect_ratio", "pan_x", "pan_y")
        subset = {k: payload[k] for k in allowed_keys if k in payload and payload[k] is not None}
        return ReframeParams.model_validate(subset)
    return None


def _build_film_grain_from_payload(
    payload: dict[str, Any],
    *,
    allow_top_level: bool = False,
) -> FilmGrainParams | None:
    if "film_grain" in payload:
        raw_fg = payload.get("film_grain")
        if raw_fg is None:
            return None
        if not isinstance(raw_fg, dict):
            raise ValueError("'film_grain' must be a JSON object")
        return FilmGrainParams.model_validate(raw_fg)
    if allow_top_level:
        allowed_keys = ("enabled", "preset", "strength", "temporal")
        subset = {k: payload[k] for k in allowed_keys if k in payload and payload[k] is not None}
        return FilmGrainParams.model_validate(subset)
    return None


def _build_vignette_from_payload(
    payload: dict[str, Any],
    *,
    allow_top_level: bool = False,
) -> VignetteParams | None:
    if "vignette" in payload:
        raw_vig = payload.get("vignette")
        if raw_vig is None:
            return None
        if not isinstance(raw_vig, dict):
            raise ValueError("'vignette' must be a JSON object")
        return VignetteParams.model_validate(raw_vig)
    if allow_top_level:
        allowed_keys = ("enabled", "preset", "angle_deg", "mode")
        subset = {k: payload[k] for k in allowed_keys if k in payload and payload[k] is not None}
        return VignetteParams.model_validate(subset)
    return None


def _build_voice_cleanup_from_payload(
    payload: dict[str, Any],
    *,
    allow_top_level: bool = False,
) -> VoiceCleanupParams | None:
    if "voice_cleanup" in payload:
        raw_vc = payload.get("voice_cleanup")
        if raw_vc is None:
            return None
        if not isinstance(raw_vc, dict):
            raise ValueError("'voice_cleanup' must be a JSON object")
        return VoiceCleanupParams.model_validate(raw_vc)
    if allow_top_level:
        allowed_keys = ("enabled", "preset", "highpass_hz", "presence_db", "de_ess")
        subset = {k: payload[k] for k in allowed_keys if k in payload and payload[k] is not None}
        return VoiceCleanupParams.model_validate(subset)
    return None


def _build_fairlight_mixer_from_payload(
    payload: dict[str, Any],
) -> tuple[FairlightChannelStripParams, MasterBusParams, VoiceCleanupParams | None]:
    raw_ch = payload.get("channel")
    if raw_ch is None:
        ch_keys = ("track_code", "volume_db", "pan", "muted", "solo", "rec_armed")
        ch_data = {k: payload[k] for k in ch_keys if k in payload and payload[k] is not None}
        channel = FairlightChannelStripParams.model_validate(ch_data)
    else:
        if not isinstance(raw_ch, dict):
            raise ValueError("'channel' must be a JSON object")
        channel = FairlightChannelStripParams.model_validate(raw_ch)

    raw_master = payload.get("master")
    if raw_master is None:
        master = MasterBusParams()
    else:
        if not isinstance(raw_master, dict):
            raise ValueError("'master' must be a JSON object")
        master = MasterBusParams.model_validate(raw_master)

    voice_cleanup = _build_voice_cleanup_from_payload(payload)
    return channel, master, voice_cleanup


def _build_retime_params_from_payload(
    payload: dict[str, Any],
    *,
    allow_top_level: bool = False,
) -> ClipRetimeParams | None:
    raw_retime = payload.get("retime_params")
    if raw_retime is None:
        raw_retime = payload.get("retime")
    if raw_retime is not None:
        if not isinstance(raw_retime, dict):
            raise ValueError("'retime_params' must be a JSON object")
        rev_raw = raw_retime.get("reverse", False)
        if not isinstance(rev_raw, bool):
            raise ValueError("reverse must be a boolean")
        retime_payload: dict[str, Any] = {
            "speed_rate": raw_retime.get("speed_rate", 1.0),
            "reverse": rev_raw,
        }
        if raw_retime.get("retime_process") is not None:
            retime_payload["retime_process"] = raw_retime["retime_process"]
        if raw_retime.get("ramp_preset") is not None:
            retime_payload["ramp_preset"] = raw_retime["ramp_preset"]
        if raw_retime.get("ramp_points") is not None:
            retime_payload["ramp_points"] = raw_retime["ramp_points"]
        return ClipRetimeParams.model_validate(retime_payload)

    if allow_top_level:
        rev_raw = payload.get("reverse", False)
        if not isinstance(rev_raw, bool):
            raise ValueError("reverse must be a boolean")
        top_payload: dict[str, Any] = {
            "speed_rate": payload.get("speed_rate", 1.0),
            "reverse": rev_raw,
        }
        if payload.get("retime_process") is not None:
            top_payload["retime_process"] = payload["retime_process"]
        if payload.get("ramp_preset") is not None:
            top_payload["ramp_preset"] = payload["ramp_preset"]
        if payload.get("ramp_points") is not None:
            top_payload["ramp_points"] = payload["ramp_points"]
        return ClipRetimeParams.model_validate(top_payload)
    return None


_TRANSFORM_OPTIONAL_DVE_FIELDS: tuple[str, ...] = (
    "crop_left_pct",
    "crop_right_pct",
    "crop_top_pct",
    "crop_bottom_pct",
    "border_width_px",
    "border_color",
    "border_feather_px",
    "shadow_opacity_pct",
    "shadow_blur_px",
    "shadow_offset_x_px",
    "shadow_offset_y_px",
    "shadow_color",
)


def _extract_transform_dict(src: dict[str, Any]) -> dict[str, Any]:
    xf_payload: dict[str, Any] = {
        "zoom_pct": src.get("zoom_pct", 100.0),
        "pos_x_pct": src.get("pos_x_pct", 0.0),
        "pos_y_pct": src.get("pos_y_pct", 0.0),
        "rotation_deg": src.get("rotation_deg", 0.0),
        "opacity_pct": src.get("opacity_pct", 100.0),
        "dynamic_zoom": src.get("dynamic_zoom", "off"),
    }
    for field_name in _TRANSFORM_OPTIONAL_DVE_FIELDS:
        if src.get(field_name) is not None:
            xf_payload[field_name] = src[field_name]
    if src.get("keyframes") is not None:
        xf_payload["keyframes"] = src["keyframes"]
    return xf_payload


def _build_transform_params_from_payload(
    payload: dict[str, Any],
    *,
    allow_top_level: bool = False,
) -> ClipTransformParams | None:
    raw_transform = payload.get("transform_params")
    if raw_transform is None:
        raw_transform = payload.get("transform")
    if raw_transform is not None:
        if not isinstance(raw_transform, dict):
            raise ValueError("'transform_params' must be a JSON object")
        return ClipTransformParams.model_validate(_extract_transform_dict(raw_transform))

    if allow_top_level:
        return ClipTransformParams.model_validate(_extract_transform_dict(payload))
    return None


def _build_framing_params_from_payload(
    payload: dict[str, Any],
    *,
    allow_top_level: bool = False,
) -> FramingParams | None:
    raw_framing = payload.get("framing")
    if raw_framing is not None:
        if not isinstance(raw_framing, dict):
            raise ValueError("'framing' must be a JSON object")
        preset_val = raw_framing.get("preset", raw_framing.get("aspect_preset", "16:9"))
        enabled_val = raw_framing.get("enabled", True)
        framing_payload: dict[str, Any] = {
            "preset": preset_val,
            "mode": raw_framing.get("mode", "fill"),
            "pan_x": raw_framing.get("pan_x", 0.0),
            "pan_y": raw_framing.get("pan_y", 0.0),
            "enabled": enabled_val,
        }
        if raw_framing.get("target_width") is not None:
            framing_payload["target_width"] = raw_framing.get("target_width")
        if raw_framing.get("target_height") is not None:
            framing_payload["target_height"] = raw_framing.get("target_height")
        return FramingParams.model_validate(framing_payload)

    has_top_level = any(
        key in payload for key in ("aspect_preset", "framing_preset", "framing_mode")
    )
    if allow_top_level or has_top_level:
        preset_val = payload.get(
            "aspect_preset", payload.get("framing_preset", payload.get("preset", "16:9"))
        )
        mode_val = payload.get("framing_mode", payload.get("mode", "fill"))
        enabled_val = payload.get("enabled", True)
        return FramingParams.model_validate(
            {
                "preset": preset_val,
                "mode": mode_val,
                "pan_x": payload.get("pan_x", 0.0),
                "pan_y": payload.get("pan_y", 0.0),
                "enabled": enabled_val,
            }
        )
    return None


def _build_title_overlay_from_payload(payload: dict[str, Any]) -> TitleOverlayParams:
    preset_only = payload.get("preset")
    if preset_only is not None and "title" not in payload and "title_overlay" not in payload:
        if not isinstance(preset_only, str) or not preset_only.strip():
            raise ValueError("preset must be a non-empty string")
        return apply_title_preset(preset_only)

    raw_title = payload.get("title_overlay")
    if raw_title is not None and not isinstance(raw_title, dict):
        raise ValueError("'title_overlay' must be a JSON object")
    source: dict[str, Any] = raw_title if isinstance(raw_title, dict) else payload
    preset_id = source.get("preset_id") or source.get("preset") or "broadcast_lower_third"
    if not isinstance(preset_id, str) or not preset_id.strip():
        raise ValueError("preset_id must be a non-empty string")
    base = apply_title_preset(preset_id)
    merged: dict[str, Any] = {
        "preset_id": base.preset_id,
        "title": source.get("title", base.title),
        "subtitle": source.get("subtitle", base.subtitle),
        "position": source.get("position", base.position),
        "accent_color": source.get("accent_color", base.accent_color),
        "start_s": source.get("start_s", base.start_s),
        "end_s": source.get("end_s", base.end_s),
        "font_size": source.get("font_size", base.font_size),
        "box_opacity": source.get("box_opacity", base.box_opacity),
        "enabled": bool(source.get("enabled", base.enabled)),
    }
    return TitleOverlayParams.model_validate(merged)


def _build_lower_third_from_payload(
    payload: dict[str, Any],
    *,
    allow_top_level: bool = False,
) -> LowerThirdParams | None:
    if "lower_third" in payload:
        raw_lt = payload.get("lower_third")
        if raw_lt is None:
            return None
        if not isinstance(raw_lt, dict):
            raise ValueError("'lower_third' must be a JSON object")
        return LowerThirdParams.model_validate(raw_lt)
    if allow_top_level:
        allowed_keys = (
            "enabled",
            "title",
            "subtitle",
            "position",
            "font_size",
            "box_opacity",
            "start_s",
            "duration_s",
        )
        subset = {k: payload[k] for k in allowed_keys if k in payload and payload[k] is not None}
        return LowerThirdParams.model_validate(subset)
    return None


def _build_subtitle_track_from_payload(payload: dict[str, Any]) -> SubtitleTrackParams:
    raw_sub = payload.get("subtitle_track")
    if raw_sub is not None and not isinstance(raw_sub, dict):
        raise ValueError("'subtitle_track' must be a JSON object")
    source: dict[str, Any] = raw_sub if isinstance(raw_sub, dict) else payload
    raw_cues = source.get("cues", [])
    if not isinstance(raw_cues, list):
        raise ValueError("'cues' must be a list")
    enabled_raw = source.get("enabled", True)
    if not isinstance(enabled_raw, bool):
        raise ValueError("enabled must be a boolean")
    uppercase_raw = source.get("uppercase", False)
    if not isinstance(uppercase_raw, bool):
        raise ValueError("uppercase must be a boolean")
    return SubtitleTrackParams.model_validate(
        {
            "cues": raw_cues,
            "style": source.get("style", "clean_white"),
            "font_size": source.get("font_size", 34),
            "margin_bottom_pct": source.get("margin_bottom_pct", 0.08),
            "enabled": enabled_raw,
            "karaoke_mode": source.get("karaoke_mode", "off"),
            "highlight_color": source.get("highlight_color", "#ffe047"),
            "uppercase": uppercase_raw,
            "safe_margin_preset": source.get("safe_margin_preset", "standard"),
            "max_words_per_cue": source.get("max_words_per_cue", 0),
        }
    )


def _build_chroma_key_from_payload(payload: dict[str, Any]) -> ChromaKeyParams:
    raw_ck = payload.get("chroma_key")
    if raw_ck is not None and not isinstance(raw_ck, dict):
        raise ValueError("'chroma_key' must be a JSON object")
    source: dict[str, Any] = raw_ck if isinstance(raw_ck, dict) else payload
    if (
        "preset" in source
        and "key_color" not in source
        and "similarity" not in source
        and "blend" not in source
        and "despill" not in source
        and "despill_type" not in source
    ):
        preset_id = source.get("preset")
        if not isinstance(preset_id, str) or not preset_id.strip():
            raise ValueError("preset must be a non-empty string")
        base = apply_chroma_key_preset(preset_id)
        if "enabled" in source:
            return ChromaKeyParams.model_validate(
                {**base.model_dump(), "enabled": source["enabled"]}
            )
        return base

    preset_val = source.get("preset", "studio_green")
    valid_ck_presets = {"studio_green", "chroma_blue", "custom"}
    base = (
        apply_chroma_key_preset(preset_val)
        if isinstance(preset_val, str) and preset_val.strip().lower() in valid_ck_presets
        else ChromaKeyParams()
    )
    return ChromaKeyParams.model_validate(
        {
            "preset": source.get("preset", base.preset),
            "key_color": source.get("key_color", base.key_color),
            "similarity": source.get("similarity", base.similarity),
            "blend": source.get("blend", base.blend),
            "despill": source.get("despill", base.despill),
            "despill_type": source.get("despill_type", base.despill_type),
            "enabled": source.get("enabled", True),
        }
    )


def _build_stabilizer_from_payload(payload: dict[str, Any]) -> StabilizerParams:
    raw_stab = payload.get("stabilizer")
    if raw_stab is not None and not isinstance(raw_stab, dict):
        raise ValueError("'stabilizer' must be a JSON object")
    source: dict[str, Any] = raw_stab if isinstance(raw_stab, dict) else payload
    preset_val = source.get("preset", "smooth_gimbal")
    valid_presets = {"smooth_gimbal", "locked_tripod", "handheld_rescue"}
    if (
        isinstance(preset_val, str)
        and preset_val.strip().lower() in valid_presets
        and all(
            k not in source
            for k in ("rx", "ry", "edge", "blocksize", "contrast", "search", "auto_zoom_pct")
        )
    ):
        enabled_flag = bool(source.get("enabled", True))
        return apply_stabilizer_preset(preset_val, enabled=enabled_flag)
    base = (
        apply_stabilizer_preset(preset_val, enabled=bool(source.get("enabled", False)))
        if isinstance(preset_val, str) and preset_val.strip().lower() in valid_presets
        else StabilizerParams()
    )
    return StabilizerParams.model_validate(
        {
            "enabled": source.get("enabled", base.enabled),
            "preset": source.get("preset", base.preset),
            "rx": source.get("rx", base.rx),
            "ry": source.get("ry", base.ry),
            "edge": source.get("edge", base.edge),
            "blocksize": source.get("blocksize", base.blocksize),
            "contrast": source.get("contrast", base.contrast),
            "search": source.get("search", base.search),
            "auto_zoom_pct": source.get("auto_zoom_pct", base.auto_zoom_pct),
        }
    )


def _build_planar_tracker_from_payload(payload: dict[str, Any]) -> PlanarTrackerParams:
    raw_trk = payload.get("planar_tracker")
    if raw_trk is not None and not isinstance(raw_trk, dict):
        raise ValueError("'planar_tracker' must be a JSON object")
    source: dict[str, Any] = raw_trk if isinstance(raw_trk, dict) else payload
    preset_val = source.get("preset", "screen_insert")
    valid_presets = {"screen_insert", "anamorphic_skew", "deskew_rectify", "point_follow"}
    coord_keys = (
        "mode",
        "interpolation",
        "tl_x",
        "tl_y",
        "tr_x",
        "tr_y",
        "bl_x",
        "bl_y",
        "br_x",
        "br_y",
        "track_anchor_x",
        "track_anchor_y",
        "track_box_pct",
        "follow_track",
        "track_keyframes",
    )
    if (
        isinstance(preset_val, str)
        and preset_val.strip().lower() in valid_presets
        and all(k not in source for k in coord_keys)
    ):
        enabled_flag = bool(source.get("enabled", True))
        return apply_planar_tracker_preset(preset_val, enabled=enabled_flag)
    base = (
        apply_planar_tracker_preset(preset_val, enabled=bool(source.get("enabled", False)))
        if isinstance(preset_val, str) and preset_val.strip().lower() in valid_presets
        else PlanarTrackerParams()
    )
    return PlanarTrackerParams.model_validate(
        {
            "enabled": source.get("enabled", base.enabled),
            "preset": source.get("preset", base.preset),
            "mode": source.get("mode", base.mode),
            "interpolation": source.get("interpolation", base.interpolation),
            "tl_x": source.get("tl_x", base.tl_x),
            "tl_y": source.get("tl_y", base.tl_y),
            "tr_x": source.get("tr_x", base.tr_x),
            "tr_y": source.get("tr_y", base.tr_y),
            "bl_x": source.get("bl_x", base.bl_x),
            "bl_y": source.get("bl_y", base.bl_y),
            "br_x": source.get("br_x", base.br_x),
            "br_y": source.get("br_y", base.br_y),
            "track_anchor_x": source.get("track_anchor_x", base.track_anchor_x),
            "track_anchor_y": source.get("track_anchor_y", base.track_anchor_y),
            "track_box_pct": source.get("track_box_pct", base.track_box_pct),
            "follow_track": source.get("follow_track", base.follow_track),
            "track_keyframes": source.get("track_keyframes", base.track_keyframes),
        }
    )


def _build_transition_params_from_payload(payload: dict[str, Any]) -> TransitionParams:
    raw_trans = payload.get("transition")
    if raw_trans is not None and not isinstance(raw_trans, dict):
        raise ValueError("'transition' must be a JSON object")
    source: dict[str, Any] = raw_trans if isinstance(raw_trans, dict) else payload
    include_audio_raw = source.get("include_audio", True)
    if not isinstance(include_audio_raw, bool):
        raise ValueError("include_audio must be a boolean")
    curve = source.get("audio_curve")
    c1 = source.get("audio_curve1", curve if curve is not None else "tri")
    c2 = source.get("audio_curve2", curve if curve is not None else "tri")
    return TransitionParams.model_validate(
        {
            "preset": source.get("preset", "fade"),
            "duration_s": source.get("duration_s", TRANSITION_DURATION_DEFAULT_S),
            "include_audio": include_audio_raw,
            "audio_curve1": c1,
            "audio_curve2": c2,
        }
    )


def _resolve_timeline_from_payload(
    state: UiAppState,
    payload: dict[str, Any],
) -> TimelineDocument:
    timeline_name = payload.get("timeline_name")
    if timeline_name is not None and not isinstance(timeline_name, str):
        raise ValueError("timeline_name must be a string")
    clean_tl_name = timeline_name.strip() or None if isinstance(timeline_name, str) else None

    if "document" in payload and payload["document"] is not None:
        return TimelineDocument.model_validate(payload["document"])

    if "content_base64" in payload and payload["content_base64"] is not None:
        filename = payload.get("filename")
        if not isinstance(filename, str) or not filename.strip():
            raise ValueError("filename is required when uploading content_base64")
        suffix = Path(filename.strip()).suffix.lower()
        if suffix not in TIMELINE_SUFFIXES:
            raise ValueError(f"Unsupported timeline extension: {suffix or '(none)'}")
        b64_raw = payload["content_base64"]
        if not isinstance(b64_raw, str):
            raise ValueError("content_base64 must be a string")
        try:
            decoded = base64.b64decode(b64_raw, validate=True)
        except binascii.Error as exc:
            raise ValueError("Invalid base64 timeline payload") from exc
        if len(decoded) > MAX_REQUEST_BYTES:
            raise ValueError("Uploaded timeline exceeds maximum allowed size")
        with tempfile.TemporaryDirectory(prefix="taktcut_ui_tl_") as tmp_dir:
            tmp_file = Path(tmp_dir) / f"upload{suffix}"
            tmp_file.write_bytes(decoded)
            return load_timeline(tmp_file, timeline_name=clean_tl_name)

    raw_path = payload.get("path")
    if not isinstance(raw_path, str) or not raw_path.strip():
        raise ValueError("Provide a workspace 'path', 'document', or uploaded file payload")

    confined = confine_workspace_path(
        state.workspace_root,
        raw_path,
        must_exist=True,
        allowed_suffixes=TIMELINE_SUFFIXES,
    )
    return load_timeline(confined, timeline_name=clean_tl_name)


class TaktcutRequestHandler(BaseHTTPRequestHandler):
    """HTTP request handler serving static studio assets and real taktcut APIs."""

    server_version = f"taktcut-studio/{__version__}"
    protocol_version = "HTTP/1.1"

    @property
    def app_state(self) -> UiAppState:
        srv = self.server
        assert isinstance(srv, TaktcutUiServer)
        return srv.app_state

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
        # Suppress noisy per-request stderr logs unless debugging.
        return

    def _send_security_headers(self, *, cache_control: str) -> None:
        self.send_header("Content-Security-Policy", CONTENT_SECURITY_POLICY)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", cache_control)

    def _send_bytes(
        self,
        status: int,
        content_type: str,
        body: bytes,
        *,
        cache_control: str = "no-store",
        extra_headers: dict[str, str] | None = None,
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self._send_security_headers(cache_control=cache_control)
        if extra_headers:
            for key, value in extra_headers.items():
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def _send_json(self, status: int, data: Any) -> None:
        encoded = json.dumps(data, ensure_ascii=True).encode("utf-8")
        self._send_bytes(status, "application/json; charset=utf-8", encoded)

    def _read_json_body(self) -> dict[str, Any]:
        raw_len = self.headers.get("Content-Length")
        if raw_len is None:
            raise ValueError("Missing Content-Length header")
        try:
            length = int(raw_len)
        except ValueError as exc:
            raise ValueError("Invalid Content-Length header") from exc
        if length < 0 or length > MAX_REQUEST_BYTES:
            raise ValueError(f"Request payload size out of bounds (0..{MAX_REQUEST_BYTES} bytes)")
        raw_bytes = self.rfile.read(length)
        if len(raw_bytes) != length:
            raise ValueError("Incomplete request body")
        try:
            parsed = json.loads(raw_bytes.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValueError(f"Malformed JSON request body: {exc}") from exc
        if not isinstance(parsed, dict):
            raise ValueError("JSON body must be an object")
        return parsed

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        route = parsed.path
        query = parse_qs(parsed.query)

        if route in STATIC_ROUTE_MAP:
            filename, content_type = STATIC_ROUTE_MAP[route]
            assets_root = resolve_assets_dir().resolve()
            asset_path = (assets_root / filename).resolve()
            try:
                asset_path.relative_to(assets_root)
            except ValueError:
                self._send_json(HTTPStatus.FORBIDDEN, {"error": "Invalid asset path"})
                return
            if not asset_path.is_file():
                self._send_json(HTTPStatus.NOT_FOUND, {"error": f"Asset missing: {filename}"})
                return
            self._send_bytes(
                HTTPStatus.OK,
                content_type,
                asset_path.read_bytes(),
                cache_control="no-cache",
            )
            return

        if route == "/api/update/check":
            info = check_for_update(__version__)
            self._send_json(HTTPStatus.OK, info.to_dict())
            return

        if route == "/api/health":
            caps, err = self.app_state.get_capabilities(verify_nvenc_runtime=False)
            self._send_json(
                HTTPStatus.OK,
                {
                    "status": "ok",
                    "version": __version__,
                    "workspace_dir": str(self.app_state.workspace_root),
                    "ffmpeg_available": caps is not None,
                    "capabilities": caps.model_dump(mode="json") if caps else None,
                    "ffmpeg_error": err,
                },
            )
            return

        if route == "/api/sample":
            preset = query.get("preset", ["clean"])[0]
            if preset not in {"clean", "issues"}:
                self._send_json(
                    HTTPStatus.BAD_REQUEST,
                    {"error": "preset must be 'clean' or 'issues'"},
                )
                return
            doc = build_sample_timeline(preset=preset)
            val = validate_timeline(doc)
            self._send_json(
                HTTPStatus.OK,
                {
                    "document": doc.model_dump(mode="json"),
                    "validation": val.model_dump(mode="json"),
                },
            )
            return

        if route == "/api/workspace/files":
            files = scan_workspace_files(self.app_state.workspace_root)
            self._send_json(
                HTTPStatus.OK,
                {
                    "workspace_dir": str(self.app_state.workspace_root),
                    "files": files,
                },
            )
            return

        if route == "/api/render/capabilities":
            verify_nvenc = query.get("verify_nvenc", ["false"])[0].lower() == "true"
            refresh = query.get("refresh", ["false"])[0].lower() == "true"
            caps, err = self.app_state.get_capabilities(
                verify_nvenc_runtime=verify_nvenc,
                refresh=refresh or verify_nvenc,
            )
            self._send_json(
                HTTPStatus.OK,
                {
                    "ffmpeg_available": caps is not None,
                    "capabilities": caps.model_dump(mode="json") if caps else None,
                    "error": err,
                },
            )
            return

        if route == "/api/render/presets":
            self._send_json(
                HTTPStatus.OK,
                {
                    "presets": [p.model_dump(mode="json") for p in list_delivery_presets()],
                    "audio_bitrates_kbps": list(RENDER_AUDIO_BITRATE_OPTIONS_KBPS),
                    "bounds": {
                        "crf": {"min": RENDER_CRF_MIN, "max": RENDER_CRF_MAX},
                        "audio_bitrate_kbps": {
                            "min": RENDER_AUDIO_BITRATE_KBPS_MIN,
                            "max": RENDER_AUDIO_BITRATE_KBPS_MAX,
                        },
                    },
                },
            )
            return

        if route == "/api/fx/presets":
            self._send_json(
                HTTPStatus.OK,
                {
                    "presets": [p.model_dump(mode="json") for p in list_fx_presets()],
                    "specs": {
                        fx: [s.model_dump(mode="json") for s in specs]
                        for fx, specs in FX_PARAM_SPECS.items()
                    },
                    "chroma_key_presets": [
                        p.model_dump(mode="json") for p in list_chroma_key_presets()
                    ],
                    "stabilizer_presets": [
                        p.model_dump(mode="json") for p in list_stabilizer_presets()
                    ],
                    "planar_tracker_presets": [
                        p.model_dump(mode="json") for p in list_planar_tracker_presets()
                    ],
                },
            )
            return

        if route == "/api/fx/chroma-key/presets":
            self._send_json(
                HTTPStatus.OK,
                {
                    "presets": [p.model_dump(mode="json") for p in list_chroma_key_presets()],
                    "despill_types": ["green", "blue"],
                    "bounds": {
                        "similarity": {
                            "min": CHROMA_KEY_SIMILARITY_MIN,
                            "max": CHROMA_KEY_SIMILARITY_MAX,
                            "default": CHROMA_KEY_DEFAULT_SIMILARITY,
                        },
                        "blend": {
                            "min": CHROMA_KEY_BLEND_MIN,
                            "max": CHROMA_KEY_BLEND_MAX,
                            "default": CHROMA_KEY_DEFAULT_BLEND,
                        },
                    },
                },
            )
            return

        if route == "/api/color/presets":
            self._send_json(
                HTTPStatus.OK,
                {
                    "presets": [p.model_dump(mode="json") for p in list_color_presets()],
                    "curve_presets": [
                        p.model_dump(mode="json") for p in list_color_curves_presets()
                    ],
                    "bounds": {
                        "lift": {
                            "min": COLOR_BALANCE_MIN,
                            "max": COLOR_BALANCE_MAX,
                            "default": 0.0,
                        },
                        "gamma": {
                            "min": COLOR_BALANCE_MIN,
                            "max": COLOR_BALANCE_MAX,
                            "default": 0.0,
                        },
                        "gain": {
                            "min": COLOR_BALANCE_MIN,
                            "max": COLOR_BALANCE_MAX,
                            "default": 0.0,
                        },
                        "contrast": {"min": CONTRAST_MIN, "max": CONTRAST_MAX, "default": 1.0},
                        "saturation": {
                            "min": SATURATION_MIN,
                            "max": SATURATION_MAX,
                            "default": 1.0,
                        },
                        "temperature": {
                            "min": TEMPERATURE_MIN,
                            "max": TEMPERATURE_MAX,
                            "default": 0.0,
                        },
                    },
                },
            )
            return

        if route == "/api/transform/presets":
            self._send_json(
                HTTPStatus.OK,
                {
                    "presets": [p.model_dump(mode="json") for p in list_dve_layout_presets()],
                    "bounds": {
                        "crop_pct": {
                            "min": TRANSFORM_CROP_MIN,
                            "max": TRANSFORM_CROP_MAX,
                            "sum_max": TRANSFORM_CROP_SUM_MAX,
                        },
                        "border_width_px": {
                            "min": TRANSFORM_BORDER_WIDTH_MIN,
                            "max": TRANSFORM_BORDER_WIDTH_MAX,
                        },
                        "border_feather_px": {
                            "min": TRANSFORM_BORDER_FEATHER_MIN,
                            "max": TRANSFORM_BORDER_FEATHER_MAX,
                        },
                        "shadow_opacity_pct": {
                            "min": TRANSFORM_SHADOW_OPACITY_MIN,
                            "max": TRANSFORM_SHADOW_OPACITY_MAX,
                        },
                        "shadow_blur_px": {
                            "min": TRANSFORM_SHADOW_BLUR_MIN,
                            "max": TRANSFORM_SHADOW_BLUR_MAX,
                        },
                        "shadow_offset_px": {
                            "min": TRANSFORM_SHADOW_OFFSET_MIN,
                            "max": TRANSFORM_SHADOW_OFFSET_MAX,
                        },
                    },
                },
            )
            return

        if route == "/api/titles/presets":
            self._send_json(
                HTTPStatus.OK,
                {
                    "presets": [p.model_dump(mode="json") for p in list_title_presets()],
                    "positions": list(TITLE_POSITIONS),
                    "bounds": {
                        "max_len": TITLE_MAX_LEN,
                        "start_s": {"min": 0.0, "max": TITLE_TIME_MAX_S},
                        "end_s": {"min": 0.0, "max": TITLE_TIME_MAX_S},
                        "font_size": {"min": TITLE_FONT_SIZE_MIN, "max": TITLE_FONT_SIZE_MAX},
                        "box_opacity": {"min": 0.0, "max": 1.0},
                    },
                },
            )
            return

        if route == "/api/subtitles/styles":
            self._send_json(
                HTTPStatus.OK,
                {
                    "styles": [s.model_dump(mode="json") for s in list_caption_styles()],
                    "pro_styles": [s.model_dump(mode="json") for s in list_all_caption_styles()],
                    "style_ids": list(CAPTION_STYLE_IDS),
                    "all_style_ids": list(ALL_CAPTION_STYLE_IDS),
                    "karaoke_modes": list(KARAOKE_MODES),
                    "safe_margin_presets": [
                        {"id": pid, "label": label, "margin_bottom_pct": pct}
                        for pid, (label, pct) in SAFE_MARGIN_PRESETS.items()
                    ],
                    "bounds": {
                        "max_cues": CAPTION_MAX_CUES,
                        "max_text_len": CAPTION_MAX_TEXT_LEN,
                        "font_size": {"min": CAPTION_FONT_SIZE_MIN, "max": CAPTION_FONT_SIZE_MAX},
                        "margin_bottom_pct": {
                            "min": CAPTION_MARGIN_BOTTOM_MIN,
                            "max": CAPTION_MARGIN_BOTTOM_MAX,
                        },
                        "time_max_s": CAPTION_TIME_MAX_S,
                    },
                },
            )
            return

        if route == "/api/transitions/presets":
            self._send_json(
                HTTPStatus.OK,
                {
                    "presets": [p.model_dump(mode="json") for p in list_transition_presets()],
                    "bounds": {
                        "duration_s": {
                            "min": TRANSITION_DURATION_MIN_S,
                            "max": TRANSITION_DURATION_MAX_S,
                            "default": TRANSITION_DURATION_DEFAULT_S,
                        },
                        "offset_s": {"min": 0.0, "max": TRANSITION_OFFSET_MAX_S},
                    },
                },
            )
            return

        if route == "/api/framing/presets":
            self._send_json(
                HTTPStatus.OK,
                {
                    "presets": [p.model_dump(mode="json") for p in list_aspect_presets()],
                    "modes": ["fill", "fit"],
                    "bounds": {
                        "pan_x": {"min": -1.0, "max": 1.0},
                        "pan_y": {"min": -1.0, "max": 1.0},
                    },
                },
            )
            return

        if route.startswith("/api/remote/jobs/"):
            job_id = route[len("/api/remote/jobs/") :].strip()
            if not job_id or "/" in job_id:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Invalid remote job id"})
                return
            tracked = self.app_state.get_tracked_remote_job(job_id)
            if tracked is None:
                self._send_json(HTTPStatus.NOT_FOUND, {"error": f"Unknown remote job: {job_id}"})
                return
            try:
                client = RemoteRenderClient(tracked.remote_url, tracked.bearer_token)
                job = client.get_job(job_id)
                if job.status == "completed" and not tracked.downloaded:
                    client.download_job_output(job_id, tracked.local_output_path)
                    self.app_state.mark_remote_job_downloaded(job_id)
                    tracked = self.app_state.get_tracked_remote_job(job_id)
                self._send_json(
                    HTTPStatus.OK,
                    {
                        "job": job.model_dump(mode="json"),
                        "remote_url": tracked.remote_url if tracked else "",
                        "local_output_path": tracked.local_output_rel if tracked else "",
                        "downloaded": bool(tracked and tracked.downloaded),
                    },
                )
            except ValueError as exc:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            except (RuntimeError, OSError) as exc:
                self._send_json(HTTPStatus.BAD_GATEWAY, {"error": str(exc)})
            return

        self._send_json(HTTPStatus.NOT_FOUND, {"error": f"Unknown route: {route}"})

    def do_POST(self) -> None:  # noqa: N802
        route = urlparse(self.path).path
        try:
            payload = self._read_json_body()
            self._dispatch_post(route, payload)
        except PathConfinementError as exc:
            self._send_json(HTTPStatus.FORBIDDEN, {"error": str(exc)})
        except FileNotFoundError as exc:
            self._send_json(HTTPStatus.NOT_FOUND, {"error": str(exc)})
        except (ValueError, ValidationError, DefusedXmlException, TypeError, KeyError) as exc:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
        except (RuntimeError, subprocess.SubprocessError, OSError) as exc:
            self._send_json(HTTPStatus.UNPROCESSABLE_ENTITY, {"error": str(exc)})
        except Exception as exc:  # noqa: BLE001
            self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(exc)})

    def _dispatch_post(self, route: str, payload: dict[str, Any]) -> None:
        if route == "/api/timeline/inspect":
            doc = _resolve_timeline_from_payload(self.app_state, payload)
            val = validate_timeline(doc)
            self._send_json(
                HTTPStatus.OK,
                {
                    "document": doc.model_dump(mode="json"),
                    "validation": val.model_dump(mode="json"),
                },
            )
            return

        if route == "/api/timeline/validate":
            doc = _resolve_timeline_from_payload(self.app_state, payload)
            val = validate_timeline(doc)
            self._send_json(
                HTTPStatus.OK,
                {
                    "document": doc.model_dump(mode="json"),
                    "validation": val.model_dump(mode="json"),
                },
            )
            return

        if route == "/api/timeline/convert":
            doc = _resolve_timeline_from_payload(self.app_state, payload)
            val = validate_timeline(doc)
            raw_out = payload.get("out_path")
            if raw_out is not None and str(raw_out).strip():
                out_file = confine_workspace_path(
                    self.app_state.workspace_root,
                    str(raw_out),
                    must_exist=False,
                    allowed_suffixes=OTIO_EXPORT_SUFFIXES,
                )
                written = export_otio(doc, out_file, bundle_missing_only=True)
                rel_out = written.relative_to(self.app_state.workspace_root).as_posix()
                self._send_json(
                    HTTPStatus.OK,
                    {
                        "timeline_name": doc.name,
                        "output_path": rel_out,
                        "absolute_path": str(written),
                        "format": written.suffix.lower().lstrip("."),
                        "bytes_written": written.stat().st_size,
                        "validation": val.model_dump(mode="json"),
                    },
                )
                return

            fmt = str(payload.get("format", "otio")).strip().lower()
            if fmt not in {"otio", "otioz"}:
                raise ValueError("format must be 'otio' or 'otioz'")
            safe_name = sanitize_download_filename(doc.name, "timeline", f".{fmt}")
            with tempfile.TemporaryDirectory(prefix="taktcut_ui_otio_") as tmp_dir:
                tmp_out = Path(tmp_dir) / safe_name
                export_otio(doc, tmp_out, bundle_missing_only=True)
                raw_bytes = tmp_out.read_bytes()
            self._send_json(
                HTTPStatus.OK,
                {
                    "timeline_name": doc.name,
                    "filename": safe_name,
                    "format": fmt,
                    "bytes_written": len(raw_bytes),
                    "content_base64": base64.b64encode(raw_bytes).decode("ascii"),
                    "otio_text": raw_bytes.decode("utf-8") if fmt == "otio" else None,
                    "validation": val.model_dump(mode="json"),
                },
            )
            return

        if route == "/api/timeline/download":
            doc = _resolve_timeline_from_payload(self.app_state, payload)
            fmt = str(payload.get("format", "otio")).strip().lower()
            if fmt not in {"otio", "otioz"}:
                raise ValueError("format must be 'otio' or 'otioz'")
            safe_name = sanitize_download_filename(doc.name, "timeline", f".{fmt}")
            with tempfile.TemporaryDirectory(prefix="taktcut_ui_dl_") as tmp_dir:
                tmp_out = Path(tmp_dir) / safe_name
                export_otio(doc, tmp_out, bundle_missing_only=True)
                raw_bytes = tmp_out.read_bytes()
            mime = "application/zip" if fmt == "otioz" else "application/json; charset=utf-8"
            self._send_bytes(
                HTTPStatus.OK,
                mime,
                raw_bytes,
                extra_headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
            )
            return

        if route == "/api/project/export":
            raw_project = payload.get("project")
            if raw_project is None:
                project_input = {
                    k: v for k, v in payload.items() if k not in {"out_path", "filename"}
                }
            else:
                if not isinstance(raw_project, dict):
                    raise ValueError("'project' must be a JSON object")
                project_input = raw_project

            exported_dict = export_project_dict(project_input, stamp_metadata=True)
            project_json = export_project_json(exported_dict, stamp_metadata=False)
            raw_name = payload.get("filename") or exported_dict.get("project_name") or "project"
            if not isinstance(raw_name, str):
                raise ValueError("filename must be a string")
            filename = sanitize_download_filename(raw_name, "project", PROJECT_FILE_SUFFIX)

            project_saved_rel: str | None = None
            raw_out = payload.get("out_path")
            if raw_out is not None and str(raw_out).strip():
                out_file = confine_workspace_path(
                    self.app_state.workspace_root,
                    str(raw_out),
                    must_exist=False,
                    allowed_suffixes=PROJECT_SUFFIXES,
                )
                if not out_file.name.lower().endswith(PROJECT_FILE_SUFFIX):
                    raise ValueError(
                        f"Project output file must end with {PROJECT_FILE_SUFFIX!r}"
                    )
                out_file.parent.mkdir(parents=True, exist_ok=True)
                out_file.write_text(project_json, encoding="utf-8")
                project_saved_rel = out_file.relative_to(self.app_state.workspace_root).as_posix()

            self._send_json(
                HTTPStatus.OK,
                {
                    "schema_version": PROJECT_SCHEMA_VERSION,
                    "filename": filename,
                    "project": exported_dict,
                    "project_json": project_json,
                    "bytes_written": len(project_json.encode("utf-8")),
                    "saved_path": project_saved_rel,
                },
            )
            return

        if route == "/api/project/import":
            if "project_json" in payload and payload["project_json"] is not None:
                raw_json = payload["project_json"]
                if not isinstance(raw_json, str):
                    raise ValueError("project_json must be a string")
                project_obj = parse_project_json(raw_json)
            elif "content_base64" in payload and payload["content_base64"] is not None:
                b64_raw = payload["content_base64"]
                if not isinstance(b64_raw, str):
                    raise ValueError("content_base64 must be a string")
                try:
                    decoded = base64.b64decode(b64_raw, validate=True)
                except binascii.Error as exc:
                    raise ValueError("Invalid base64 project payload") from exc
                project_obj = parse_project_json(decoded)
            elif "project" in payload and payload["project"] is not None:
                project_obj = validate_project_payload(payload["project"])
            elif isinstance(payload.get("path"), str) and payload["path"].strip():
                confined = confine_workspace_path(
                    self.app_state.workspace_root,
                    payload["path"],
                    must_exist=True,
                    allowed_suffixes=PROJECT_SUFFIXES,
                )
                if not confined.name.lower().endswith(PROJECT_FILE_SUFFIX):
                    raise ValueError(
                        f"Project file must end with {PROJECT_FILE_SUFFIX!r}"
                    )
                project_obj = load_project_file(confined)
            elif "schema_version" in payload:
                project_obj = validate_project_payload(payload)
            else:
                raise ValueError(
                    "Provide 'project_json', 'content_base64', 'project', or workspace 'path'"
                )

            val = validate_timeline(project_obj.timeline)
            self._send_json(
                HTTPStatus.OK,
                {
                    "schema_version": PROJECT_SCHEMA_VERSION,
                    "project": project_obj.model_dump(mode="json"),
                    "validation": val.model_dump(mode="json"),
                },
            )
            return

        if route == "/api/color/parse-cdl":
            xml_content = payload.get("xml_content")
            if isinstance(xml_content, str) and xml_content.strip():
                with tempfile.TemporaryDirectory(prefix="taktcut_ui_cdl_") as tmp_dir:
                    tmp_cdl = Path(tmp_dir) / "input.cdl"
                    tmp_cdl.write_text(xml_content, encoding="utf-8")
                    cdl = parse_cdl_xml(tmp_cdl)
            else:
                raw_path = payload.get("path")
                if not isinstance(raw_path, str) or not raw_path.strip():
                    raise ValueError("Provide 'path' or 'xml_content'")
                confined = confine_workspace_path(
                    self.app_state.workspace_root,
                    raw_path,
                    must_exist=True,
                    allowed_suffixes=CDL_SUFFIXES,
                )
                cdl = parse_cdl_xml(confined)
            self._send_json(HTTPStatus.OK, {"cdl": cdl.model_dump(mode="json")})
            return

        if route == "/api/color/parse-cube":
            cube_content = payload.get("cube_content")
            if isinstance(cube_content, str) and cube_content.strip():
                raw_fname = str(payload.get("filename") or "uploaded.cube").strip()
                source_name = raw_fname or "uploaded.cube"
                info, table = parse_cube_lut_text(cube_content, source_name=source_name)
                self._send_json(
                    HTTPStatus.OK,
                    {
                        "info": info.model_dump(mode="json"),
                        "lut": {
                            "title": info.title,
                            "dimension": info.dimension,
                            "size": info.size,
                            "domain_min": list(info.domain_min),
                            "domain_max": list(info.domain_max),
                            "entry_count": info.entry_count,
                            "table": [list(row) for row in table],
                        },
                    },
                )
                return
            raw_path = payload.get("path")
            if not isinstance(raw_path, str) or not raw_path.strip():
                raise ValueError("Provide workspace 'path' or 'cube_content' for a .cube file")
            confined = confine_workspace_path(
                self.app_state.workspace_root,
                raw_path,
                must_exist=True,
                allowed_suffixes=LUT_SUFFIXES,
            )
            info = parse_cube_lut(confined)
            self._send_json(HTTPStatus.OK, {"info": info.model_dump(mode="json")})
            return

        if route == "/api/color/compile":
            raw_pix_fmt = payload.get("pix_fmt")
            pix_fmt = str(raw_pix_fmt) if raw_pix_fmt is not None else None
            if isinstance(payload.get("nodes"), list) and len(payload["nodes"]) > 0:
                color_nodes = _build_color_nodes_from_payload(payload["nodes"])
                compiled_chain = compile_color_node_chain(color_nodes, pix_fmt=pix_fmt)
                self._send_json(HTTPStatus.OK, compiled_chain.model_dump(mode="json"))
                return
            grade = _build_color_grade_from_payload(payload)
            if isinstance(payload.get("curves"), dict):
                single_node = ColorNodeParams.model_validate(
                    {"grade": grade, "curves": payload["curves"]}
                )
                compiled_chain = compile_color_node_chain([single_node], pix_fmt=pix_fmt)
                self._send_json(HTTPStatus.OK, compiled_chain.model_dump(mode="json"))
                return
            compiled_color = compile_color_grade(grade, pix_fmt=pix_fmt)
            self._send_json(HTTPStatus.OK, compiled_color.model_dump(mode="json"))
            return

        if route == "/api/color/bake":
            has_nodes = isinstance(payload.get("nodes"), list) and len(payload["nodes"]) > 0
            nodes_obj: list[ColorNodeParams] | None = (
                _build_color_nodes_from_payload(payload["nodes"]) if has_nodes else None
            )
            use_grade = not has_nodes and _has_color_grade_fields(payload)
            grade_obj: ColorGradeParams | None = None
            cdl_obj: AscCdlParams | None = None
            if use_grade:
                grade_obj = _build_color_grade_from_payload(payload)
            elif not has_nodes:
                cdl_obj = _build_cdl_from_payload(payload)
            size = int(payload.get("size", 33))
            title = str(payload.get("title", "taktcut_cdl")).strip() or "taktcut_cdl"
            raw_out = payload.get("out_path")

            if raw_out is not None and str(raw_out).strip():
                out_file = confine_workspace_path(
                    self.app_state.workspace_root,
                    str(raw_out),
                    must_exist=False,
                    allowed_suffixes=LUT_SUFFIXES,
                )
                if nodes_obj is not None:
                    info = bake_color_node_chain_to_cube(
                        nodes_obj, out_file, size=size, title=title
                    )
                elif grade_obj is not None:
                    info = bake_color_grade_to_cube(grade_obj, out_file, size=size, title=title)
                else:
                    assert cdl_obj is not None
                    info = bake_cdl_to_cube(cdl_obj, out_file, size=size, title=title)
                cube_text = out_file.read_text(encoding="utf-8")
                saved_rel: str | None = out_file.relative_to(
                    self.app_state.workspace_root
                ).as_posix()
            else:
                with tempfile.TemporaryDirectory(prefix="taktcut_ui_cube_") as tmp_dir:
                    tmp_cube = Path(tmp_dir) / "baked.cube"
                    if nodes_obj is not None:
                        info = bake_color_node_chain_to_cube(
                            nodes_obj, tmp_cube, size=size, title=title
                        )
                    elif grade_obj is not None:
                        info = bake_color_grade_to_cube(grade_obj, tmp_cube, size=size, title=title)
                    else:
                        assert cdl_obj is not None
                        info = bake_cdl_to_cube(cdl_obj, tmp_cube, size=size, title=title)
                    cube_text = tmp_cube.read_text(encoding="utf-8")
                saved_rel = None

            bake_resp: dict[str, Any] = {
                "info": info.model_dump(mode="json"),
                "saved_path": saved_rel,
                "cube_text": cube_text,
            }
            if grade_obj is not None:
                bake_resp["grade"] = grade_obj.model_dump(mode="json")
            if cdl_obj is not None:
                bake_resp["cdl"] = cdl_obj.model_dump(mode="json")
            self._send_json(HTTPStatus.OK, bake_resp)
            return

        if route == "/api/color/download-cube":
            has_nodes = isinstance(payload.get("nodes"), list) and len(payload["nodes"]) > 0
            nodes_dl: list[ColorNodeParams] | None = (
                _build_color_nodes_from_payload(payload["nodes"]) if has_nodes else None
            )
            use_grade = not has_nodes and _has_color_grade_fields(payload)
            grade_dl = _build_color_grade_from_payload(payload) if use_grade else None
            cdl_dl = None if (has_nodes or use_grade) else _build_cdl_from_payload(payload)
            size = int(payload.get("size", 33))
            title = str(payload.get("title", "taktcut_cdl")).strip() or "taktcut_cdl"
            filename = sanitize_download_filename(
                str(payload.get("filename") or title),
                "taktcut_cdl",
                ".cube",
            )
            with tempfile.TemporaryDirectory(prefix="taktcut_ui_cubedl_") as tmp_dir:
                tmp_cube = Path(tmp_dir) / filename
                if nodes_dl is not None:
                    bake_color_node_chain_to_cube(nodes_dl, tmp_cube, size=size, title=title)
                elif grade_dl is not None:
                    bake_color_grade_to_cube(grade_dl, tmp_cube, size=size, title=title)
                else:
                    assert cdl_dl is not None
                    bake_cdl_to_cube(cdl_dl, tmp_cube, size=size, title=title)
                cube_bytes = tmp_cube.read_bytes()
            self._send_bytes(
                HTTPStatus.OK,
                "text/plain; charset=utf-8",
                cube_bytes,
                extra_headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
            return

        if route == "/api/render/plan":
            raw_in = payload.get("input_path")
            raw_out = payload.get("output_path")
            if not isinstance(raw_in, str) or not isinstance(raw_out, str):
                raise ValueError("input_path and output_path strings are required")

            execute = bool(payload.get("execute", False))
            in_file = confine_workspace_path(
                self.app_state.workspace_root,
                raw_in,
                must_exist=execute,
                allowed_suffixes=MEDIA_SUFFIXES,
            )
            out_file = confine_workspace_path(
                self.app_state.workspace_root,
                raw_out,
                must_exist=False,
                allowed_suffixes=MEDIA_SUFFIXES,
            )

            raw_preset = payload.get("delivery_preset")
            delivery_preset: str | None = None
            if raw_preset not in (None, ""):
                if not isinstance(raw_preset, str):
                    raise ValueError("delivery_preset must be a string")
                delivery_preset = raw_preset.strip()

            raw_profile = payload.get("profile")
            profile: RenderProfile | None = None
            if raw_profile not in (None, ""):
                profile = RenderProfile(str(raw_profile))
            elif delivery_preset is None:
                profile = RenderProfile.WEB_H264

            raw_crf = payload.get("video_crf")
            video_crf: int | None = None
            if raw_crf not in (None, ""):
                if isinstance(raw_crf, bool) or not isinstance(raw_crf, int):
                    raise ValueError("video_crf must be an integer")
                video_crf = raw_crf

            raw_audio_kbps = payload.get("audio_bitrate_kbps")
            audio_bitrate_kbps: int | None = None
            if raw_audio_kbps not in (None, ""):
                if isinstance(raw_audio_kbps, bool) or not isinstance(raw_audio_kbps, int):
                    raise ValueError("audio_bitrate_kbps must be an integer")
                audio_bitrate_kbps = raw_audio_kbps

            raw_enc_preset = payload.get("encoder_preset")
            encoder_preset: str | None = None
            if raw_enc_preset not in (None, ""):
                if not isinstance(raw_enc_preset, str):
                    raise ValueError("encoder_preset must be a string")
                encoder_preset = raw_enc_preset

            raw_fps = payload.get("fps")
            fps = RationalFrameRate.from_str(str(raw_fps)) if raw_fps else None

            raw_lufs = payload.get("target_lufs")
            target_lufs = float(raw_lufs) if raw_lufs not in (None, "") else None

            prefer_hw = bool(payload.get("prefer_hw", True))

            lut_file: Path | None = None
            color_grade_obj: ColorGradeParams | None = None
            color_nodes_obj: list[ColorNodeParams] | None = None
            raw_lut = payload.get("lut_path")
            if isinstance(raw_lut, str) and raw_lut.strip():
                lut_file = confine_workspace_path(
                    self.app_state.workspace_root,
                    raw_lut,
                    must_exist=True,
                    allowed_suffixes=LUT_SUFFIXES,
                )
            elif isinstance(payload.get("color_nodes"), list) and len(payload["color_nodes"]) > 0:
                parsed_nodes = _build_color_nodes_from_payload(payload["color_nodes"])
                if any(
                    n.enabled and n.lut_table is not None and n.lut_mix > 1e-6
                    for n in parsed_nodes
                ):
                    lut_file = confine_workspace_path(
                        self.app_state.workspace_root,
                        ".taktcut-samples/studio_node_tree.cube",
                        must_exist=False,
                        allowed_suffixes=LUT_SUFFIXES,
                    )
                    bake_color_node_chain_to_cube(
                        parsed_nodes, lut_file, size=33, title="taktcut_studio_node_tree"
                    )
                else:
                    color_nodes_obj = parsed_nodes
            elif isinstance(payload.get("color_grade"), dict):
                color_grade_obj = _build_color_grade_from_payload({"grade": payload["color_grade"]})
            elif isinstance(payload.get("cdl"), dict):
                cdl = _build_cdl_from_payload(payload["cdl"])
                lut_file = confine_workspace_path(
                    self.app_state.workspace_root,
                    ".taktcut-samples/studio_grade.cube",
                    must_exist=False,
                    allowed_suffixes=LUT_SUFFIXES,
                )
                bake_cdl_to_cube(cdl, lut_file, size=33, title="taktcut_studio_grade")

            caps, err = self.app_state.get_capabilities(verify_nvenc_runtime=prefer_hw)
            if caps is None:
                if execute:
                    raise RuntimeError(err or "ffmpeg unavailable")
                # Dry-run planning stays deterministic even when ffmpeg is absent from PATH.
                caps = HardwareCapabilities(
                    ffmpeg_path="ffmpeg",
                    h264_nvenc=False,
                    hevc_nvenc=False,
                    libx264=True,
                    libx265=True,
                    prores_ks=True,
                )

            fx_filtergraph: str | None = None
            raw_fx = payload.get("fx_stack")
            if isinstance(raw_fx, list) and len(raw_fx) > 0:
                effective_fx_profile = profile or RenderProfile.WEB_H264
                if delivery_preset and profile is None:
                    from taktcut.render import get_delivery_preset

                    effective_fx_profile = get_delivery_preset(delivery_preset).profile
                is_prores = effective_fx_profile == RenderProfile.PRORES_HQ
                fx_pix_fmt = "yuv422p10le" if is_prores else "yuv420p"
                compiled_fx = compile_fx_filtergraph(
                    raw_fx,
                    pix_fmt=fx_pix_fmt,
                    use_gpu=prefer_hw,
                )
                if compiled_fx.filtergraph:
                    fx_filtergraph = compiled_fx.filtergraph

            chroma_key_obj: ChromaKeyParams | None = None
            raw_chroma_key = payload.get("chroma_key")
            if raw_chroma_key is not None:
                if not isinstance(raw_chroma_key, dict):
                    raise ValueError("'chroma_key' must be a JSON object")
                chroma_key_obj = _build_chroma_key_from_payload({"chroma_key": raw_chroma_key})

            stabilizer_obj: StabilizerParams | None = None
            raw_stabilizer = payload.get("stabilizer")
            if raw_stabilizer is not None:
                if not isinstance(raw_stabilizer, dict):
                    raise ValueError("'stabilizer' must be a JSON object")
                stabilizer_obj = _build_stabilizer_from_payload({"stabilizer": raw_stabilizer})

            planar_tracker_obj: PlanarTrackerParams | None = None
            raw_planar_tracker = payload.get("planar_tracker")
            if raw_planar_tracker is not None:
                if not isinstance(raw_planar_tracker, dict):
                    raise ValueError("'planar_tracker' must be a JSON object")
                planar_tracker_obj = _build_planar_tracker_from_payload(
                    {"planar_tracker": raw_planar_tracker}
                )

            audio_params, clip_duration_s = _build_audio_params_from_payload(payload)
            video_fade = _build_video_fade_from_payload(
                payload, allow_top_level=(audio_params is None)
            )
            loudness_preset, dialogue_eq = _build_fairlight_params_from_payload(payload)
            timecode_burnin = _extract_timecode_burnin(payload)
            review_watermark_text, review_watermark_opacity = _extract_review_watermark(payload)
            export_fps = _extract_export_fps(payload)
            deinterlace = _extract_deinterlace(payload)
            audio_only_format = _extract_audio_only_format(payload)
            out_file = resolve_audio_only_output_path(out_file, audio_only_format)
            retime_obj = _build_retime_from_payload(payload)
            retime_params = (
                _build_retime_params_from_payload(payload) if retime_obj is None else None
            )
            transform_params = _build_transform_params_from_payload(payload)
            framing_params = _build_framing_params_from_payload(payload)
            reframe_obj = _build_reframe_from_payload(payload)
            film_grain_obj = _build_film_grain_from_payload(payload)
            vignette_obj = _build_vignette_from_payload(payload)
            voice_cleanup_obj = _build_voice_cleanup_from_payload(payload)

            title_overlay_obj: TitleOverlayParams | None = None
            raw_title_overlay = payload.get("title_overlay")
            if raw_title_overlay is not None:
                if not isinstance(raw_title_overlay, dict):
                    raise ValueError("'title_overlay' must be a JSON object")
                title_overlay_obj = _build_title_overlay_from_payload(
                    {"title_overlay": raw_title_overlay}
                )

            subtitle_track_obj: SubtitleTrackParams | None = None
            raw_subtitle_track = payload.get("subtitle_track")
            if raw_subtitle_track is not None:
                if not isinstance(raw_subtitle_track, dict):
                    raise ValueError("'subtitle_track' must be a JSON object")
                subtitle_track_obj = _build_subtitle_track_from_payload(
                    {"subtitle_track": raw_subtitle_track}
                )

            lower_third_obj = _build_lower_third_from_payload(payload)

            plan = build_render_plan(
                input_path=in_file,
                output_path=out_file,
                profile=profile,
                fps=fps,
                lut_path=lut_file,
                color_grade=color_grade_obj,
                color_nodes=color_nodes_obj,
                chroma_key=chroma_key_obj,
                stabilizer=stabilizer_obj,
                planar_tracker=planar_tracker_obj,
                fx_filtergraph=fx_filtergraph,
                title_overlay=title_overlay_obj,
                lower_third=lower_third_obj,
                subtitle_track=subtitle_track_obj,
                audio_params=audio_params,
                video_fade=video_fade,
                retime=retime_obj,
                retime_params=retime_params,
                transform_params=transform_params,
                framing=framing_params,
                reframe=reframe_obj,
                film_grain=film_grain_obj,
                vignette=vignette_obj,
                voice_cleanup=voice_cleanup_obj,
                clip_duration_s=clip_duration_s,
                target_lufs=target_lufs,
                loudness_preset=loudness_preset,
                dialogue_eq=dialogue_eq,
                timecode_burnin=timecode_burnin,
                review_watermark_text=review_watermark_text,
                review_watermark_opacity=review_watermark_opacity,
                export_fps=export_fps,
                deinterlace=deinterlace,
                audio_only_format=audio_only_format,
                prefer_hw=prefer_hw,
                caps=caps,
                delivery_preset=delivery_preset,
                video_crf=video_crf,
                audio_bitrate_kbps=audio_bitrate_kbps,
                encoder_preset=encoder_preset,
            )
            response: dict[str, Any] = {
                "plan": plan.model_dump(mode="json"),
                "shell_command": shlex.join(plan.argv),
                "result": None,
            }
            if execute:
                result = execute_render_plan(plan)
                response["result"] = result.model_dump(mode="json")
            self._send_json(HTTPStatus.OK, response)
            return

        if route == "/api/titles/compile":
            title_params = _build_title_overlay_from_payload(payload)
            raw_pix_fmt = payload.get("pix_fmt")
            pix_fmt = str(raw_pix_fmt) if raw_pix_fmt is not None else None
            compiled_title = compile_title_overlay(title_params, pix_fmt=pix_fmt)
            self._send_json(HTTPStatus.OK, compiled_title.model_dump(mode="json"))
            return

        if route == "/api/subtitles/parse":
            raw_fmt = str(payload.get("format", "auto")).strip().lower()
            if raw_fmt not in {"auto", "srt", "vtt", "ass"}:
                raise ValueError("format must be 'auto', 'srt', 'vtt', or 'ass'")
            raw_content = payload.get("content")
            if isinstance(raw_content, str):
                text_content = raw_content
            else:
                raw_path = payload.get("path")
                if not isinstance(raw_path, str) or not raw_path.strip():
                    raise ValueError("Provide 'content' string or workspace 'path'")
                confined = confine_workspace_path(
                    self.app_state.workspace_root,
                    raw_path,
                    must_exist=True,
                    allowed_suffixes=SUBTITLE_SUFFIXES,
                )
                text_content = confined.read_text(encoding="utf-8-sig")
                if raw_fmt == "auto":
                    raw_fmt = confined.suffix.lower().lstrip(".")

            detected_fmt = raw_fmt
            if detected_fmt == "auto":
                stripped_head = text_content.lstrip("\ufeff").lstrip()
                first_line = stripped_head.splitlines()[0:1]
                head = first_line[0].strip() if first_line else ""
                if head == "WEBVTT" or head.startswith(("WEBVTT ", "WEBVTT\t")):
                    detected_fmt = "vtt"
                elif (
                    "[Script Info]" in stripped_head
                    or "[Events]" in stripped_head
                    or head.startswith("Dialogue:")
                ):
                    detected_fmt = "ass"
                else:
                    detected_fmt = "srt"

            if detected_fmt == "vtt":
                cues = parse_vtt(text_content)
            elif detected_fmt == "ass":
                cues = parse_ass(text_content)
            else:
                cues = parse_srt(text_content)

            raw_chunk = payload.get("auto_chunk_words", 0)
            if isinstance(raw_chunk, int) and not isinstance(raw_chunk, bool) and raw_chunk > 0:
                cues = auto_chunk_cues(cues, max_words_per_cue=raw_chunk)
            else:
                cues = [
                    cue.model_copy(update={"words": compute_cue_word_timings(cue)})
                    for cue in cues
                ]

            self._send_json(
                HTTPStatus.OK,
                {
                    "format": detected_fmt,
                    "cue_count": len(cues),
                    "cues": [c.model_dump(mode="json") for c in cues],
                },
            )
            return

        if route == "/api/subtitles/chunk":
            raw_cues = payload.get("cues", [])
            if not isinstance(raw_cues, list):
                raise ValueError("'cues' must be a list")
            raw_max_words = payload.get("max_words_per_cue", 4)
            if isinstance(raw_max_words, bool) or not isinstance(raw_max_words, int):
                raise ValueError("max_words_per_cue must be an integer")
            uppercase_raw = payload.get("uppercase", False)
            if not isinstance(uppercase_raw, bool):
                raise ValueError("uppercase must be a boolean")
            chunked = auto_chunk_cues(
                raw_cues,
                max_words_per_cue=raw_max_words,
                uppercase=uppercase_raw,
            )
            word_count = sum(len(c.words) for c in chunked)
            self._send_json(
                HTTPStatus.OK,
                {
                    "cue_count": len(chunked),
                    "word_count": word_count,
                    "cues": [c.model_dump(mode="json") for c in chunked],
                },
            )
            return

        if route == "/api/subtitles/export":
            raw_fmt = str(payload.get("format", "srt")).strip().lower()
            if raw_fmt not in {"srt", "vtt", "ass"}:
                raise ValueError("format must be 'srt', 'vtt', or 'ass'")
            raw_cues = payload.get("cues", [])
            if not isinstance(raw_cues, list):
                raise ValueError("'cues' must be a list")
            if raw_fmt == "vtt":
                exported = export_vtt(raw_cues)
            elif raw_fmt == "ass":
                if isinstance(payload.get("subtitle_track"), dict):
                    sub_params = _build_subtitle_track_from_payload(payload)
                else:
                    sub_params = _build_subtitle_track_from_payload(
                        {"subtitle_track": {**payload, "cues": raw_cues}}
                    )
                exported = export_ass(sub_params)
            else:
                exported = export_srt(raw_cues)
            filename = sanitize_download_filename(
                str(payload.get("filename") or "captions"),
                "captions",
                f".{raw_fmt}",
            )
            sub_saved_rel: str | None = None
            raw_out = payload.get("out_path")
            if raw_out is not None and str(raw_out).strip():
                out_file = confine_workspace_path(
                    self.app_state.workspace_root,
                    str(raw_out),
                    must_exist=False,
                    allowed_suffixes=SUBTITLE_SUFFIXES,
                )
                out_file.parent.mkdir(parents=True, exist_ok=True)
                out_file.write_text(exported, encoding="utf-8")
                sub_saved_rel = out_file.relative_to(self.app_state.workspace_root).as_posix()
            self._send_json(
                HTTPStatus.OK,
                {
                    "format": raw_fmt,
                    "filename": filename,
                    "content": exported,
                    "cue_count": len(raw_cues),
                    "saved_path": sub_saved_rel,
                },
            )
            return

        if route == "/api/subtitles/compile":
            sub_params = _build_subtitle_track_from_payload(payload)
            raw_pix_fmt = payload.get("pix_fmt")
            pix_fmt = str(raw_pix_fmt) if raw_pix_fmt is not None else None
            compiled_subs = compile_subtitles(sub_params, pix_fmt=pix_fmt)
            self._send_json(HTTPStatus.OK, compiled_subs.model_dump(mode="json"))
            return

        if route == "/api/lower-third/compile":
            lt_params = _build_lower_third_from_payload(payload, allow_top_level=True)
            assert lt_params is not None
            compiled_lt = compile_lower_third_filter_result(lt_params)
            self._send_json(HTTPStatus.OK, compiled_lt.model_dump(mode="json"))
            return

        if route == "/api/audio/compile":
            audio_params, clip_duration_s = _build_audio_params_from_payload(
                payload, allow_top_level=True
            )
            assert audio_params is not None
            loudness_preset, dialogue_eq = _build_fairlight_params_from_payload(payload)
            raw_lufs = payload.get("target_lufs")
            target_lufs_val = float(raw_lufs) if raw_lufs not in (None, "") else None
            compiled_audio = compile_audio_filter_result(
                audio_params,
                clip_duration_s=clip_duration_s,
                target_lufs=target_lufs_val,
                loudness_preset=loudness_preset,
                dialogue_eq=dialogue_eq,
            )
            self._send_json(HTTPStatus.OK, compiled_audio.model_dump(mode="json"))
            return

        if route == "/api/fade/compile":
            video_fade = _build_video_fade_from_payload(payload, allow_top_level=True)
            assert video_fade is not None
            audio_params, clip_duration_s = _build_audio_params_from_payload(
                payload, allow_top_level=True
            )
            assert audio_params is not None
            compiled_vf = compile_video_fade_filter_result(
                video_fade, clip_duration_s=clip_duration_s
            )
            fade_only_audio = ClipAudioParams(
                gain_db=0.0,
                fade_in_s=video_fade.fade_in_s,
                fade_out_s=video_fade.fade_out_s,
                muted=audio_params.muted,
            )
            compiled_af = compile_audio_filter_result(
                fade_only_audio, clip_duration_s=clip_duration_s
            )
            self._send_json(
                HTTPStatus.OK,
                {
                    "video_filtergraph": compiled_vf.filtergraph,
                    "audio_filtergraph": "" if audio_params.muted else compiled_af.filtergraph,
                    "ffmpeg_vf_args": compiled_vf.ffmpeg_vf_args,
                    "ffmpeg_af_args": [] if audio_params.muted else compiled_af.ffmpeg_af_args,
                    "is_identity": compiled_vf.is_identity and (
                        audio_params.muted or compiled_af.is_identity
                    ),
                    "params": video_fade.model_dump(mode="json"),
                },
            )
            return

        if route == "/api/audio/duck/compile":
            duck_params = _build_auto_duck_params_from_payload(payload, allow_top_level=True)
            assert duck_params is not None
            mix_sc = bool(payload.get("mix_sidechain", False))
            compiled_duck = compile_auto_duck_filter_result(duck_params, mix_sidechain=mix_sc)
            self._send_json(HTTPStatus.OK, compiled_duck.model_dump(mode="json"))
            return

        if route == "/api/retime/compile":
            raw_fps = payload.get("fps")
            rt_fps = RationalFrameRate.from_str(str(raw_fps)) if raw_fps not in (None, "") else None
            raw_dur = payload.get("clip_duration_s")
            rt_dur: float | None = None
            if raw_dur not in (None, ""):
                if isinstance(raw_dur, bool) or not isinstance(raw_dur, (int, float)):
                    raise ValueError("clip_duration_s must be a finite number")
                rt_dur = float(raw_dur)
            retime_obj = _build_retime_from_payload(payload, allow_top_level=True)
            if retime_obj is not None:
                compiled_retime = compile_retime_filter_result(
                    retime_obj,
                    target_fps=rt_fps,
                    clip_duration_s=rt_dur,
                )
            else:
                retime_params = _build_retime_params_from_payload(payload, allow_top_level=True)
                assert retime_params is not None
                compiled_retime = compile_retime_filter_result(
                    retime_params,
                    target_fps=rt_fps,
                    clip_duration_s=rt_dur,
                )
            self._send_json(HTTPStatus.OK, compiled_retime.model_dump(mode="json"))
            return

        if route == "/api/transform/compile":
            transform_params = _build_transform_params_from_payload(payload, allow_top_level=True)
            assert transform_params is not None
            raw_pix_fmt = payload.get("pix_fmt")
            pix_fmt = str(raw_pix_fmt) if raw_pix_fmt is not None else None
            raw_clip_dur = payload.get("clip_duration_s")
            xf_clip_duration_s: float | None = None
            if raw_clip_dur not in (None, ""):
                if isinstance(raw_clip_dur, bool) or not isinstance(raw_clip_dur, (int, float)):
                    raise ValueError("clip_duration_s must be a finite number")
                xf_clip_duration_s = float(raw_clip_dur)
            compiled_transform = compile_transform_filter_result(
                transform_params,
                pix_fmt=pix_fmt,
                clip_duration_s=xf_clip_duration_s,
            )
            self._send_json(HTTPStatus.OK, compiled_transform.model_dump(mode="json"))
            return

        if route == "/api/framing/compile":
            framing_params = _build_framing_params_from_payload(payload, allow_top_level=True)
            assert framing_params is not None
            compiled_framing = compile_framing_filter_result(framing_params)
            self._send_json(HTTPStatus.OK, compiled_framing.model_dump(mode="json"))
            return

        if route == "/api/reframe/compile":
            reframe_obj = _build_reframe_from_payload(payload, allow_top_level=True)
            assert reframe_obj is not None
            compiled_reframe = compile_reframe_filter_result(reframe_obj)
            self._send_json(HTTPStatus.OK, compiled_reframe.model_dump(mode="json"))
            return

        if route == "/api/film-grain/compile":
            film_grain_obj = _build_film_grain_from_payload(payload, allow_top_level=True)
            assert film_grain_obj is not None
            compiled_film_grain = compile_film_grain_filter_result(film_grain_obj)
            self._send_json(HTTPStatus.OK, compiled_film_grain.model_dump(mode="json"))
            return

        if route == "/api/vignette/compile":
            vignette_obj = _build_vignette_from_payload(payload, allow_top_level=True)
            assert vignette_obj is not None
            compiled_vignette = compile_vignette_filter_result(vignette_obj)
            self._send_json(HTTPStatus.OK, compiled_vignette.model_dump(mode="json"))
            return

        if route == "/api/voice-cleanup/compile":
            vc_obj = _build_voice_cleanup_from_payload(payload, allow_top_level=True)
            assert vc_obj is not None
            compiled_vc = compile_voice_cleanup_filter_result(vc_obj)
            self._send_json(HTTPStatus.OK, compiled_vc.model_dump(mode="json"))
            return

        if route == "/api/fairlight/mixer/compile":
            channel, master, vc_obj = _build_fairlight_mixer_from_payload(payload)
            compiled_mixer = compile_fairlight_mixer_filter(
                channel,
                master,
                voice_cleanup=vc_obj,
            )
            self._send_json(HTTPStatus.OK, compiled_mixer.model_dump(mode="json"))
            return

        if route == "/api/transitions/compile":
            trans_params = _build_transition_params_from_payload(payload)
            raw_dur_a = payload.get("clip_a_duration_s")
            raw_dur_b = payload.get("clip_b_duration_s")
            raw_offset = payload.get("offset_s")
            raw_pix_fmt = payload.get("pix_fmt")
            for name, raw_val in (
                ("clip_a_duration_s", raw_dur_a),
                ("clip_b_duration_s", raw_dur_b),
                ("offset_s", raw_offset),
            ):
                if raw_val not in (None, "") and (
                    isinstance(raw_val, bool) or not isinstance(raw_val, int | float)
                ):
                    raise ValueError(f"{name} must be a finite number")
            dur_a = float(raw_dur_a) if raw_dur_a not in (None, "") else None
            dur_b = float(raw_dur_b) if raw_dur_b not in (None, "") else None
            offset_val = float(raw_offset) if raw_offset not in (None, "") else None
            if dur_a is None and offset_val is None:
                dur_a = 5.0
            pix_fmt = str(raw_pix_fmt) if raw_pix_fmt is not None else None
            compiled_trans = compile_transition_filter_result(
                trans_params,
                clip_a_duration_s=dur_a,
                clip_b_duration_s=dur_b,
                offset_s=offset_val,
                pix_fmt=pix_fmt,
            )
            self._send_json(HTTPStatus.OK, compiled_trans.model_dump(mode="json"))
            return

        if route == "/api/fx/chroma-key/compile":
            ck_params = _build_chroma_key_from_payload(payload)
            raw_pix_fmt = payload.get("pix_fmt")
            pix_fmt = str(raw_pix_fmt) if raw_pix_fmt is not None else None
            compiled_ck = compile_chroma_key(ck_params, pix_fmt=pix_fmt)
            self._send_json(HTTPStatus.OK, compiled_ck.model_dump(mode="json"))
            return

        if route == "/api/fx/stabilize/compile":
            stab_params = _build_stabilizer_from_payload(payload)
            raw_pix_fmt = payload.get("pix_fmt")
            pix_fmt = str(raw_pix_fmt) if raw_pix_fmt is not None else None
            raw_w = payload.get("width")
            raw_h = payload.get("height")
            w_val = int(raw_w) if raw_w is not None else None
            h_val = int(raw_h) if raw_h is not None else None
            compiled_stab = compile_stabilizer(
                stab_params,
                width=w_val,
                height=h_val,
                pix_fmt=pix_fmt,
            )
            self._send_json(HTTPStatus.OK, compiled_stab.model_dump(mode="json"))
            return

        if route == "/api/fx/tracker/compile":
            trk_params = _build_planar_tracker_from_payload(payload)
            raw_pix_fmt = payload.get("pix_fmt")
            pix_fmt = str(raw_pix_fmt) if raw_pix_fmt is not None else None
            compiled_trk = compile_planar_tracker(trk_params, pix_fmt=pix_fmt)
            self._send_json(HTTPStatus.OK, compiled_trk.model_dump(mode="json"))
            return

        if route == "/api/fx/compile":
            preset_id = payload.get("preset") or payload.get("preset_id")
            if preset_id is not None:
                if not isinstance(preset_id, str) or not preset_id.strip():
                    raise ValueError("preset must be a non-empty string")
                nodes: list[Any] = list(get_fx_preset(preset_id).nodes)
            else:
                raw_nodes = payload.get("nodes")
                if raw_nodes is None:
                    raw_nodes = payload.get("stack")
                if raw_nodes is None:
                    raw_nodes = payload.get("effects", [])
                if not isinstance(raw_nodes, list):
                    raise ValueError("'nodes' must be a list of FX node objects")
                nodes = raw_nodes

            chroma_key_compile: ChromaKeyParams | None = None
            raw_ck = payload.get("chroma_key")
            if raw_ck is not None:
                if not isinstance(raw_ck, dict):
                    raise ValueError("'chroma_key' must be a JSON object")
                chroma_key_compile = _build_chroma_key_from_payload({"chroma_key": raw_ck})

            stabilizer_compile: StabilizerParams | None = None
            raw_stab = payload.get("stabilizer")
            if raw_stab is not None:
                if not isinstance(raw_stab, dict):
                    raise ValueError("'stabilizer' must be a JSON object")
                stabilizer_compile = _build_stabilizer_from_payload({"stabilizer": raw_stab})

            planar_tracker_compile: PlanarTrackerParams | None = None
            raw_trk = payload.get("planar_tracker")
            if raw_trk is not None:
                if not isinstance(raw_trk, dict):
                    raise ValueError("'planar_tracker' must be a JSON object")
                planar_tracker_compile = _build_planar_tracker_from_payload(
                    {"planar_tracker": raw_trk}
                )

            duration_s = float(payload.get("duration_seconds", 10.0))
            width_px = int(payload.get("width", 1920))
            height_px = int(payload.get("height", 1080))
            fps_val = float(payload.get("fps", 25.0))
            pix_fmt = str(payload.get("pix_fmt", "yuv420p"))
            use_gpu = bool(payload.get("use_gpu", False))

            compiled = compile_fx_filtergraph(
                nodes,
                duration_seconds=duration_s,
                width=width_px,
                height=height_px,
                fps=fps_val,
                pix_fmt=pix_fmt,
                use_gpu=use_gpu,
                chroma_key=chroma_key_compile,
                stabilizer=stabilizer_compile,
                planar_tracker=planar_tracker_compile,
            )
            self._send_json(HTTPStatus.OK, compiled.model_dump(mode="json"))
            return

        if route == "/api/qa/verify":
            raw_path = payload.get("path")
            if not isinstance(raw_path, str) or not raw_path.strip():
                raise ValueError("Workspace media 'path' is required")
            media_file = confine_workspace_path(
                self.app_state.workspace_root,
                raw_path,
                must_exist=True,
                allowed_suffixes=MEDIA_SUFFIXES,
            )
            target_lufs = float(payload.get("target_lufs", -14.0))
            tolerance_lu = float(payload.get("tolerance_lu", 1.5))
            max_true_peak_dbtp = float(payload.get("max_true_peak_dbtp", -1.0))
            require_faststart = bool(payload.get("require_faststart", True))

            report = run_qa_gate(
                media_file,
                target_lufs=target_lufs,
                tolerance_lu=tolerance_lu,
                max_true_peak_dbtp=max_true_peak_dbtp,
                require_faststart=require_faststart,
            )
            self._send_json(HTTPStatus.OK, {"report": report.model_dump(mode="json")})
            return

        if route == "/api/sample/generate-clip":
            rel_target = ".taktcut-samples/sample_rec709.mp4"
            out_file = confine_workspace_path(
                self.app_state.workspace_root,
                rel_target,
                must_exist=False,
                allowed_suffixes=MEDIA_SUFFIXES,
            )
            generated = generate_synthetic_sample_clip(out_file)
            self._send_json(
                HTTPStatus.OK,
                {
                    "path": rel_target,
                    "absolute_path": str(generated),
                    "bytes_written": generated.stat().st_size,
                },
            )
            return

        if route == "/api/remote/probe":
            remote_url = payload.get("remote_url")
            bearer_token = payload.get("bearer_token")
            if not isinstance(remote_url, str) or not isinstance(bearer_token, str):
                raise ValueError("remote_url and bearer_token strings are required")
            client = RemoteRenderClient(remote_url, bearer_token, timeout=10.0)
            probe_info = client.health()
            self._send_json(
                HTTPStatus.OK,
                {
                    "remote_url": client.base_url,
                    "health": probe_info,
                },
            )
            return

        if route in {"/api/remote/jobs", "/api/render/remote/submit"}:
            remote_url = payload.get("remote_url")
            bearer_token = payload.get("bearer_token")
            raw_in = payload.get("input_path")
            raw_out = payload.get("output_path")
            if not isinstance(remote_url, str) or not isinstance(bearer_token, str):
                raise ValueError("remote_url and bearer_token strings are required")
            if not isinstance(raw_in, str) or not isinstance(raw_out, str):
                raise ValueError("input_path and output_path strings are required")

            in_file = confine_workspace_path(
                self.app_state.workspace_root,
                raw_in,
                must_exist=True,
                allowed_suffixes=MEDIA_SUFFIXES,
            )
            out_file = confine_workspace_path(
                self.app_state.workspace_root,
                raw_out,
                must_exist=False,
                allowed_suffixes=MEDIA_SUFFIXES,
            )
            raw_media = in_file.read_bytes()
            if len(raw_media) == 0 or len(raw_media) > MAX_REMOTE_JOB_BYTES:
                raise ValueError(
                    f"Input media exceeds remote transfer limit ({MAX_REMOTE_JOB_BYTES} bytes)"
                )

            profile = RenderProfile(str(payload.get("profile", RenderProfile.WEB_H264.value)))
            raw_fps = payload.get("fps")
            fps_str = RationalFrameRate.from_str(str(raw_fps)).ffmpeg_rate if raw_fps else None
            raw_lufs = payload.get("target_lufs")
            target_lufs = float(raw_lufs) if raw_lufs not in (None, "") else None
            prefer_hw = bool(payload.get("prefer_hw", True))

            lut_cube_text: str | None = None
            raw_lut = payload.get("lut_path")
            if isinstance(raw_lut, str) and raw_lut.strip():
                lut_file = confine_workspace_path(
                    self.app_state.workspace_root,
                    raw_lut,
                    must_exist=True,
                    allowed_suffixes=LUT_SUFFIXES,
                )
                lut_cube_text = lut_file.read_text(encoding="utf-8")

            cdl_params: AscCdlParams | None = None
            color_grade_remote: ColorGradeParams | None = None
            if lut_cube_text is None and isinstance(payload.get("color_grade"), dict):
                color_grade_remote = _build_color_grade_from_payload(
                    {"grade": payload["color_grade"]}
                )
            elif lut_cube_text is None and isinstance(payload.get("cdl"), dict):
                cdl_params = _build_cdl_from_payload(payload["cdl"])

            fx_nodes: list[FxNode] = []
            raw_fx = payload.get("fx_stack")
            if isinstance(raw_fx, list) and len(raw_fx) > 0:
                fx_nodes = [FxNode.model_validate(item) for item in raw_fx]

            chroma_key_remote: ChromaKeyParams | None = None
            if isinstance(payload.get("chroma_key"), dict):
                chroma_key_remote = _build_chroma_key_from_payload(
                    {"chroma_key": payload["chroma_key"]}
                )

            audio_params, clip_duration_s = _build_audio_params_from_payload(payload)
            video_fade = _build_video_fade_from_payload(
                payload, allow_top_level=(audio_params is None)
            )
            loudness_preset, dialogue_eq = _build_fairlight_params_from_payload(payload)
            timecode_burnin = _extract_timecode_burnin(payload)
            review_watermark_text, review_watermark_opacity = _extract_review_watermark(payload)
            export_fps = _extract_export_fps(payload)
            deinterlace = _extract_deinterlace(payload)
            audio_only_format = _extract_audio_only_format(payload)
            out_file = resolve_audio_only_output_path(out_file, audio_only_format)
            retime_obj = _build_retime_from_payload(payload)
            retime_params = (
                _build_retime_params_from_payload(payload) if retime_obj is None else None
            )
            transform_params = _build_transform_params_from_payload(payload)
            framing_params = _build_framing_params_from_payload(payload)
            reframe_obj = _build_reframe_from_payload(payload)
            film_grain_obj = _build_film_grain_from_payload(payload)
            vignette_obj = _build_vignette_from_payload(payload)
            voice_cleanup_obj = _build_voice_cleanup_from_payload(payload)
            title_overlay_remote: TitleOverlayParams | None = None
            if isinstance(payload.get("title_overlay"), dict):
                title_overlay_remote = _build_title_overlay_from_payload(
                    {"title_overlay": payload["title_overlay"]}
                )
            subtitle_track_remote: SubtitleTrackParams | None = None
            if isinstance(payload.get("subtitle_track"), dict):
                subtitle_track_remote = _build_subtitle_track_from_payload(
                    {"subtitle_track": payload["subtitle_track"]}
                )
            lower_third_remote = _build_lower_third_from_payload(payload)

            job_req = RemoteRenderJobRequest(
                input_filename=in_file.name,
                input_base64=base64.b64encode(raw_media).decode("ascii"),
                output_filename=out_file.name,
                profile=profile,
                fps=fps_str,
                target_lufs=target_lufs,
                prefer_hw=prefer_hw,
                fx_stack=fx_nodes,
                cdl=cdl_params,
                color_grade=color_grade_remote,
                chroma_key=chroma_key_remote,
                lut_cube_text=lut_cube_text,
                title_overlay=title_overlay_remote,
                lower_third=lower_third_remote,
                subtitle_track=subtitle_track_remote,
                audio_params=audio_params,
                video_fade=video_fade,
                retime=retime_obj,
                retime_params=retime_params,
                transform_params=transform_params,
                framing=framing_params,
                reframe=reframe_obj,
                film_grain=film_grain_obj,
                vignette=vignette_obj,
                voice_cleanup=voice_cleanup_obj,
                clip_duration_s=clip_duration_s,
                loudness_preset=loudness_preset or "off",
                dialogue_eq=dialogue_eq or "off",
                timecode_burnin=timecode_burnin,
                review_watermark_text=review_watermark_text,
                review_watermark_opacity=review_watermark_opacity,
                export_fps=export_fps,
                deinterlace=deinterlace,
                audio_only_format=audio_only_format,
            )
            client = RemoteRenderClient(remote_url, bearer_token, timeout=30.0)
            job = client.submit_job(job_req)
            rel_out = out_file.relative_to(self.app_state.workspace_root).as_posix()
            self.app_state.track_remote_job(
                job_id=job.job_id,
                remote_url=client.base_url,
                bearer_token=bearer_token.strip(),
                local_output_path=out_file,
                local_output_rel=rel_out,
            )
            self._send_json(
                HTTPStatus.ACCEPTED,
                {
                    "job": job.model_dump(mode="json"),
                    "remote_url": client.base_url,
                    "local_output_path": rel_out,
                    "downloaded": False,
                },
            )
            return

        if route == "/api/update/apply":
            update_result = apply_ota_update(__version__, defer_restart=True)
            if not update_result.applied and update_result.error not in {
                None,
                "not_frozen",
                "up_to_date",
            }:
                self._send_json(HTTPStatus.UNPROCESSABLE_ENTITY, update_result.to_dict())
                return
            self._send_json(HTTPStatus.OK, update_result.to_dict())
            if update_result.applied and update_result.restarting:
                srv = self.server
                helper_script = update_result.helper_script

                def _perform_restart() -> None:
                    if sys.platform.startswith("win") and helper_script:
                        launch_windows_swap_script(Path(helper_script))
                        srv.shutdown()
                        os._exit(0)
                    else:
                        srv.shutdown()
                        os.execv(sys.executable, [sys.executable, *sys.argv[1:]])

                threading.Timer(0.25, _perform_restart).start()
            return

        self._send_json(HTTPStatus.NOT_FOUND, {"error": f"Unknown API route: {route}"})


class TaktcutUiServer(ThreadingHTTPServer):
    """Multi-threaded loopback HTTP server holding studio application state."""

    daemon_threads = True
    allow_reuse_address = True

    def __init__(
        self,
        server_address: tuple[str, int],
        workspace_root: Path,
    ) -> None:
        self.app_state = UiAppState(workspace_root=workspace_root)
        super().__init__(server_address, TaktcutRequestHandler)


def create_ui_server(
    *,
    host: str = "127.0.0.1",
    port: int = 8741,
    workspace_dir: Path | None = None,
) -> TaktcutUiServer:
    """Instantiate a configured TaktcutUiServer without starting its blocking loop."""
    safe_host = validate_loopback_host(host)
    if port < 0 or port > 65535:
        raise ValueError(f"Port must be in 0..65535, got {port}")
    workspace_root = resolve_workspace_root(workspace_dir)
    return TaktcutUiServer((safe_host, port), workspace_root=workspace_root)


def serve_ui(
    *,
    host: str = "127.0.0.1",
    port: int = 8741,
    workspace_dir: Path | None = None,
    open_browser: bool = True,
    desktop: bool = False,
) -> int:
    """Start the taktcut studio web UI server until interrupted."""
    server = create_ui_server(host=host, port=port, workspace_dir=workspace_dir)
    raw_host, bound_port = server.server_address[0], server.server_address[1]
    bound_host = raw_host.decode("ascii") if isinstance(raw_host, bytes) else str(raw_host)
    url_host = f"[{bound_host}]" if ":" in bound_host else bound_host
    url = f"http://{url_host}:{bound_port}/"
    print(f"taktcut studio running at {url}", flush=True)
    print(f"Workspace directory (confined): {server.app_state.workspace_root}", flush=True)
    print("Press Ctrl+C to stop.", flush=True)

    if open_browser and desktop and has_pywebview():
        def _stop_server() -> None:
            server.shutdown()
            server.server_close()

        return run_with_pywebview(
            url,
            start_server=server.serve_forever,
            stop_server=_stop_server,
        )

    if open_browser:
        threading.Timer(0.25, open_studio_window, args=(url,), kwargs={"desktop": desktop}).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down taktcut studio.")
    finally:
        server.server_close()
    return 0


def build_ui_arg_parser(prog: str = "taktcut-ui") -> argparse.ArgumentParser:
    """Build argument parser shared by taktcut-ui and taktcut ui."""
    parser = argparse.ArgumentParser(
        prog=prog,
        description="Launch the local taktcut DaVinci-style Studio GUI bound to 127.0.0.1.",
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Loopback interface to bind (default: 127.0.0.1)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8741,
        help="TCP port to listen on (0 for ephemeral port, default: 8741)",
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Do not open a browser or desktop window automatically",
    )
    parser.add_argument(
        "--desktop",
        action="store_true",
        help="Open as a standalone frameless desktop app window (Edge/Chrome --app or pywebview)",
    )
    parser.add_argument(
        "--workspace-dir",
        type=Path,
        default=None,
        help="Confined workspace root for file picking, renders, and QA (default: cwd)",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    """Entry point for the standalone taktcut-ui command."""
    parser = build_ui_arg_parser()
    args = parser.parse_args(argv)
    try:
        return serve_ui(
            host=args.host,
            port=args.port,
            workspace_dir=args.workspace_dir,
            open_browser=not args.no_open,
            desktop=args.desktop,
        )
    except ValueError as exc:
        parser.error(str(exc))
        return 2
