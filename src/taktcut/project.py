"""Full TaktCut project serialization and validation (.taktcut.json, schema taktcut.project.v1)."""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from taktcut.color import ColorGradeParams
from taktcut.fx import (
    FX_PARAM_SPECS,
    MAX_KEYFRAMES_PER_NODE,
    ChromaKeyParams,
    FxNode,
    _canonicalize_param_keys,
    _validate_hex_color,
    normalize_enum_fx_param,
    normalize_fx_node,
)
from taktcut.models import (
    BpmGridConfig,
    DialogueEqPresetId,
    LoudnessPresetId,
    RationalFrameRate,
    RenderProfile,
    TimecodeBurnInPosition,
    TimelineDocument,
)
from taktcut.render import (
    RENDER_AUDIO_BITRATE_KBPS_MAX,
    RENDER_AUDIO_BITRATE_KBPS_MIN,
    RENDER_CRF_MAX,
    RENDER_CRF_MIN,
    TARGET_LUFS_MAX,
    TARGET_LUFS_MIN,
    AutoDuckParams,
    DeliveryPresetId,
    EncoderPresetId,
    FramingParams,
    validate_dialogue_eq,
    validate_loudness_preset,
    validate_timecode_burnin,
)
from taktcut.subtitles import SubtitleTrackParams
from taktcut.titles import TitleOverlayParams, apply_title_preset

PROJECT_SCHEMA_VERSION: Literal["taktcut.project.v1"] = "taktcut.project.v1"
PROJECT_FILE_SUFFIX: str = ".taktcut.json"
PROJECT_MAX_BYTES: int = 8 * 1024 * 1024
PROJECT_MAX_NAME_LEN: int = 160
PROJECT_MAX_FX_NODES: int = 64
PROJECT_MAX_PLAYHEAD_FRAME: int = 10_000_000
PROJECT_ZOOM_MIN: float = 1.0
PROJECT_ZOOM_MAX: float = 6.0


def _current_app_version() -> str:
    from taktcut import __version__

    return __version__


def _utc_iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _require_bool(raw: Any, field_name: str) -> bool:
    if not isinstance(raw, bool):
        raise ValueError(f"{field_name} must be a boolean, got {raw!r}")
    return raw


def _require_finite_float(
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


def _require_bounded_int(
    raw: Any,
    field_name: str,
    min_val: int,
    max_val: int,
) -> int:
    if isinstance(raw, bool) or not isinstance(raw, int):
        raise ValueError(f"{field_name} must be an integer, got {raw!r}")
    if raw < min_val or raw > max_val:
        raise ValueError(f"{field_name} must be within [{min_val}, {max_val}], got {raw}")
    return raw


def _require_safe_text(raw: Any, field_name: str, *, max_len: int, allow_empty: bool = True) -> str:
    if not isinstance(raw, str):
        raise ValueError(f"{field_name} must be a string")
    if "\x00" in raw:
        raise ValueError(f"{field_name} contains forbidden null byte")
    trimmed = raw.strip()
    if not allow_empty and not trimmed:
        raise ValueError(f"{field_name} cannot be empty")
    if len(trimmed) > max_len:
        raise ValueError(f"{field_name} exceeds maximum length of {max_len} characters")
    return trimmed


def _reject_json_constant(token: str) -> Any:
    raise ValueError(f"Non-standard JSON numeric constant {token!r} is not allowed")


class ProjectSafeGuides(BaseModel):
    """Broadcast and social HUD safe-guide visibility flags."""

    model_config = ConfigDict(extra="forbid")

    enabled: bool = False
    action_safe: bool = True
    title_safe: bool = True
    social_hud: bool = True

    @field_validator("enabled", "action_safe", "title_safe", "social_hud", mode="before")
    @classmethod
    def _validate_flags(cls, raw: Any, info: Any) -> bool:
        return _require_bool(raw, str(info.field_name))


class ProjectFramingState(BaseModel):
    """Program monitor and delivery aspect ratio framing + safe guides state."""

    model_config = ConfigDict(extra="forbid")

    framing: FramingParams = Field(default_factory=FramingParams)
    safe_guides: ProjectSafeGuides = Field(default_factory=ProjectSafeGuides)


class ProjectDeliveryState(BaseModel):
    """Deliver page preset, codec, loudness, and pipeline toggle state."""

    model_config = ConfigDict(extra="forbid")

    delivery_preset: DeliveryPresetId | None = None
    profile: RenderProfile = RenderProfile.WEB_H264
    container: Literal["mp4", "mov"] = "mp4"
    video_crf: int | None = 18
    audio_bitrate_kbps: int | None = 192
    encoder_preset: EncoderPresetId | None = "medium"
    fps: str = "25"
    target_lufs: float | None = -14.0
    loudness_preset: LoudnessPresetId = "off"
    dialogue_eq: DialogueEqPresetId = "off"
    timecode_burnin: TimecodeBurnInPosition = "off"
    lut_path: str = ""
    input_path: str = ".taktcut-samples/sample_rec709.mp4"
    output_path: str = "renders/delivery_web.mp4"
    use_framing: bool = False
    use_studio_cdl: bool = False
    use_studio_fx: bool = False
    use_studio_title: bool = False
    use_studio_subtitles: bool = False
    use_clip_audio: bool = True
    use_clip_retime: bool = True
    use_clip_transform: bool = True
    prefer_hw: bool = True

    @field_validator("video_crf", mode="before")
    @classmethod
    def _validate_crf(cls, raw: Any) -> int | None:
        if raw is None:
            return None
        return _require_bounded_int(raw, "video_crf", RENDER_CRF_MIN, RENDER_CRF_MAX)

    @field_validator("audio_bitrate_kbps", mode="before")
    @classmethod
    def _validate_audio_bitrate(cls, raw: Any) -> int | None:
        if raw is None:
            return None
        return _require_bounded_int(
            raw,
            "audio_bitrate_kbps",
            RENDER_AUDIO_BITRATE_KBPS_MIN,
            RENDER_AUDIO_BITRATE_KBPS_MAX,
        )

    @field_validator("target_lufs", mode="before")
    @classmethod
    def _validate_lufs(cls, raw: Any) -> float | None:
        if raw is None:
            return None
        return _require_finite_float(raw, "target_lufs", TARGET_LUFS_MIN, TARGET_LUFS_MAX)

    @field_validator("loudness_preset", mode="before")
    @classmethod
    def _validate_loudness_preset(cls, raw: Any) -> LoudnessPresetId:
        return validate_loudness_preset(raw)

    @field_validator("dialogue_eq", mode="before")
    @classmethod
    def _validate_dialogue_eq(cls, raw: Any) -> DialogueEqPresetId:
        return validate_dialogue_eq(raw)

    @field_validator("timecode_burnin", mode="before")
    @classmethod
    def _validate_timecode_burnin(cls, raw: Any) -> TimecodeBurnInPosition:
        return validate_timecode_burnin(raw)

    @field_validator("fps", mode="before")
    @classmethod
    def _validate_fps(cls, raw: Any) -> str:
        text = _require_safe_text(raw, "fps", max_len=32, allow_empty=False)
        try:
            rate = RationalFrameRate.from_str(text)
        except ZeroDivisionError as exc:
            raise ValueError(f"Invalid rational fps {raw!r}: denominator cannot be zero") from exc
        if rate.as_float <= 0.0 or rate.as_float > 240.0:
            raise ValueError(f"fps must be within (0, 240], got {rate.as_float}")
        return text

    @field_validator("lut_path", "input_path", "output_path", mode="before")
    @classmethod
    def _validate_paths(cls, raw: Any, info: Any) -> str:
        return _require_safe_text(raw, str(info.field_name), max_len=512, allow_empty=True)

    @field_validator(
        "use_framing",
        "use_studio_cdl",
        "use_studio_fx",
        "use_studio_title",
        "use_studio_subtitles",
        "use_clip_audio",
        "use_clip_retime",
        "use_clip_transform",
        "prefer_hw",
        mode="before",
    )
    @classmethod
    def _validate_delivery_flags(cls, raw: Any, info: Any) -> bool:
        return _require_bool(raw, str(info.field_name))


class ProjectColorState(BaseModel):
    """Color page primary grade, active preset, wipe split, and scope mode."""

    model_config = ConfigDict(extra="forbid")

    grade: ColorGradeParams = Field(default_factory=ColorGradeParams)
    active_preset_id: str = "rec709_clean"
    wipe_ratio: float = 0.5
    scope_mode: Literal["parade", "waveform", "vectorscope"] = "parade"

    @field_validator("active_preset_id", mode="before")
    @classmethod
    def _validate_active_preset_id(cls, raw: Any) -> str:
        return _require_safe_text(raw, "active_preset_id", max_len=64, allow_empty=True)

    @field_validator("wipe_ratio", mode="before")
    @classmethod
    def _validate_wipe_ratio(cls, raw: Any) -> float:
        return _require_finite_float(raw, "wipe_ratio", 0.0, 1.0)


def _validate_fx_node_strict(raw_node: FxNode | dict[str, Any]) -> FxNode:
    node = raw_node if isinstance(raw_node, FxNode) else FxNode.model_validate(raw_node)
    if not isinstance(node.enabled, bool):
        raise ValueError("FxNode.enabled must be a boolean")
    if len(node.keyframes) > MAX_KEYFRAMES_PER_NODE:
        raise ValueError(
            f"Too many keyframes ({len(node.keyframes)}); maximum is {MAX_KEYFRAMES_PER_NODE}"
        )

    specs = FX_PARAM_SPECS[node.effect]
    spec_by_name = {spec.name: spec for spec in specs}
    canonical = _canonicalize_param_keys(node.effect, node.params)
    unknown = sorted(k for k in canonical if k not in spec_by_name)
    if unknown:
        raise ValueError(f"Unsupported parameters for {node.effect}: {', '.join(unknown)}")

    for spec in specs:
        if spec.name not in canonical:
            continue
        raw_val = canonical[spec.name]
        if spec.kind == "color":
            _validate_hex_color(raw_val)
            continue
        if spec.kind == "enum":
            normalize_enum_fx_param(raw_val, spec)
            continue
        if isinstance(raw_val, bool) or not isinstance(raw_val, int | float):
            raise ValueError(f"FX param {spec.name!r} must be a finite number, got {raw_val!r}")
        num = float(raw_val)
        if not math.isfinite(num):
            raise ValueError(f"FX param {spec.name!r} must be finite, got {raw_val!r}")
        min_v = spec.min_val if spec.min_val is not None else 0.0
        max_v = spec.max_val if spec.max_val is not None else 9999.0
        if num < min_v or num > max_v:
            raise ValueError(
                f"FX param {spec.name!r} for {node.effect} must be within [{min_v}, {max_v}], "
                f"got {num}"
            )

    return normalize_fx_node(node)


class ProjectFxState(BaseModel):
    """Sapphire FX stack, global A/B bypass, and Chroma Key studio state."""

    model_config = ConfigDict(extra="forbid")

    nodes: list[FxNode] = Field(default_factory=list)
    bypass_all: bool = False
    active_preset_id: str = ""
    chroma_key: ChromaKeyParams = Field(default_factory=lambda: ChromaKeyParams(enabled=False))
    chroma_key_matte_view: Literal["final", "alpha_matte"] = "final"

    @field_validator("bypass_all", mode="before")
    @classmethod
    def _validate_bypass(cls, raw: Any) -> bool:
        return _require_bool(raw, "bypass_all")

    @field_validator("active_preset_id", mode="before")
    @classmethod
    def _validate_preset_id(cls, raw: Any) -> str:
        return _require_safe_text(raw, "active_preset_id", max_len=64, allow_empty=True)

    @field_validator("nodes")
    @classmethod
    def _validate_nodes(cls, nodes: list[FxNode]) -> list[FxNode]:
        if len(nodes) > PROJECT_MAX_FX_NODES:
            raise ValueError(f"FX stack exceeds maximum of {PROJECT_MAX_FX_NODES} nodes")
        return [_validate_fx_node_strict(node) for node in nodes]


class TaktcutProject(BaseModel):
    """Complete deterministic TaktCut project state (.taktcut.json, taktcut.project.v1)."""

    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["taktcut.project.v1"] = PROJECT_SCHEMA_VERSION
    project_name: str = "Untitled_Project"
    app_version: str = ""
    saved_at: str = ""
    timeline: TimelineDocument
    playhead_frame: int = 0
    timeline_zoom: float = 1.0
    snap_enabled: bool = True
    bpm_grid: BpmGridConfig = Field(default_factory=BpmGridConfig)
    auto_duck: AutoDuckParams = Field(default_factory=AutoDuckParams)
    color: ProjectColorState = Field(default_factory=ProjectColorState)
    fx: ProjectFxState = Field(default_factory=ProjectFxState)
    title_overlay: TitleOverlayParams = Field(
        default_factory=lambda: apply_title_preset("broadcast_lower_third")
    )
    subtitle_track: SubtitleTrackParams = Field(default_factory=SubtitleTrackParams)
    framing: ProjectFramingState = Field(default_factory=ProjectFramingState)
    delivery: ProjectDeliveryState = Field(default_factory=ProjectDeliveryState)

    @field_validator("project_name", mode="before")
    @classmethod
    def _validate_project_name(cls, raw: Any) -> str:
        return _require_safe_text(
            raw,
            "project_name",
            max_len=PROJECT_MAX_NAME_LEN,
            allow_empty=False,
        )

    @field_validator("app_version", "saved_at", mode="before")
    @classmethod
    def _validate_meta_str(cls, raw: Any, info: Any) -> str:
        return _require_safe_text(raw, str(info.field_name), max_len=64, allow_empty=True)

    @field_validator("playhead_frame", mode="before")
    @classmethod
    def _validate_playhead_frame(cls, raw: Any) -> int:
        return _require_bounded_int(raw, "playhead_frame", 0, PROJECT_MAX_PLAYHEAD_FRAME)

    @field_validator("timeline_zoom", mode="before")
    @classmethod
    def _validate_timeline_zoom(cls, raw: Any) -> float:
        return _require_finite_float(raw, "timeline_zoom", PROJECT_ZOOM_MIN, PROJECT_ZOOM_MAX)

    @field_validator("snap_enabled", mode="before")
    @classmethod
    def _validate_snap_enabled(cls, raw: Any) -> bool:
        return _require_bool(raw, "snap_enabled")


def validate_project_payload(payload: TaktcutProject | dict[str, Any]) -> TaktcutProject:
    """Strictly validate a TaktcutProject model or dictionary payload."""
    if isinstance(payload, TaktcutProject):
        return TaktcutProject.model_validate(payload.model_dump())
    if not isinstance(payload, dict):
        raise ValueError("Project payload must be a JSON object")
    if payload.get("schema_version") != PROJECT_SCHEMA_VERSION:
        raise ValueError(
            f"Unsupported or missing project schema_version {payload.get('schema_version')!r}; "
            f"expected {PROJECT_SCHEMA_VERSION!r}"
        )
    return TaktcutProject.model_validate(payload)


def export_project_dict(
    project: TaktcutProject | dict[str, Any],
    *,
    stamp_metadata: bool = True,
) -> dict[str, Any]:
    """Validate and serialize a complete project state into a JSON-ready dictionary."""
    validated = validate_project_payload(project)
    if stamp_metadata:
        updates: dict[str, str] = {}
        if not validated.app_version:
            updates["app_version"] = _current_app_version()
        if not validated.saved_at:
            updates["saved_at"] = _utc_iso_now()
        if updates:
            validated = validated.model_copy(update=updates)
    return validated.model_dump(mode="json")


def export_project_json(
    project: TaktcutProject | dict[str, Any],
    *,
    indent: int = 2,
    stamp_metadata: bool = True,
) -> str:
    """Serialize a validated TaktcutProject into canonical UTF-8 JSON text."""
    data = export_project_dict(project, stamp_metadata=stamp_metadata)
    return json.dumps(data, ensure_ascii=False, indent=indent, allow_nan=False) + "\n"


def parse_project_json(raw_json: str | bytes) -> TaktcutProject:
    """Parse and strictly validate a .taktcut.json payload, rejecting malformed JSON/NaN/bounds."""
    if isinstance(raw_json, bytes):
        if len(raw_json) > PROJECT_MAX_BYTES:
            raise ValueError(f"Project file exceeds maximum size of {PROJECT_MAX_BYTES} bytes")
        try:
            text = raw_json.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ValueError(f"Project file is not valid UTF-8: {exc}") from exc
    elif isinstance(raw_json, str):
        encoded_len = len(raw_json.encode("utf-8"))
        if encoded_len > PROJECT_MAX_BYTES:
            raise ValueError(f"Project file exceeds maximum size of {PROJECT_MAX_BYTES} bytes")
        text = raw_json
    else:
        raise ValueError("Project payload must be a UTF-8 JSON string or bytes")

    if not text.strip():
        raise ValueError("Project JSON input is empty")

    try:
        parsed = json.loads(text, parse_constant=_reject_json_constant)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Malformed project JSON: {exc}") from exc

    if not isinstance(parsed, dict):
        raise ValueError("Project JSON root must be an object")

    return validate_project_payload(parsed)


def save_project_file(
    project: TaktcutProject | dict[str, Any],
    out_path: Path,
) -> TaktcutProject:
    """Validate and write a .taktcut.json project file cleanly to disk."""
    validated = TaktcutProject.model_validate(export_project_dict(project, stamp_metadata=True))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(export_project_json(validated, stamp_metadata=False), encoding="utf-8")
    return validated


def load_project_file(path: Path) -> TaktcutProject:
    """Read, parse, and strictly validate a .taktcut.json project file from disk."""
    raw_bytes = path.read_bytes()
    return parse_project_json(raw_bytes)
