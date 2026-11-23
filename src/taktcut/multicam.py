"""Multi-Cam Angle Sync Bank, Live Cut Switcher, Flatten & FFmpeg Compiler."""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, Field

from taktcut.models import (
    MAX_MULTICAM_ANGLES,
    MULTICAM_ANGLE_COLORS,
    MulticamAngle,
    MulticamBank,
    MulticamCutEvent,
    MulticamCutMode,
    MulticamSyncMode,
    TimelineClip,
    TimelineDocument,
)

ALLOWED_MULTICAM_OPS: tuple[str, ...] = (
    "create",
    "sync",
    "switch_angle",
    "delete_cut",
    "update_angle",
    "flatten",
    "compile",
)

MulticamOpKind = Literal[
    "create_multicam",
    "sync_multicam",
    "switch_angle",
    "delete_cut",
    "update_angle",
    "flatten_multicam",
]

MulticamCompileMode = Literal["active_cuts", "quad_view"]
ALLOWED_MULTICAM_COMPILE_MODES: tuple[MulticamCompileMode, ...] = ("active_cuts", "quad_view")

_ANGLE_LETTERS: tuple[str, ...] = ("A", "B", "C", "D", "E", "F", "G", "H")
_DEFAULT_ANGLE_LABELS: tuple[str, ...] = (
    "CAM A - Wide Master",
    "CAM B - Medium Talent",
    "CAM C - Tight Close",
    "CAM D - Overhead Stage",
)
_DEFAULT_SLATE_PEAKS: tuple[int, ...] = (12, 26, 5, 34)


class MulticamOpResult(BaseModel):
    """Structured immutable result of a Multi-Cam operation."""

    changed: bool
    op: MulticamOpKind
    multicam_id: str = ""
    track_kind: Literal["video", "audio"] = "video"
    track_index: int = Field(default=1, ge=1)
    clip_index: int = Field(default=0, ge=0)
    angle_count: int = Field(default=0, ge=0)
    cut_count: int = Field(default=0, ge=0)
    active_angle: int = Field(default=1, ge=1, le=MAX_MULTICAM_ANGLES)
    detail: str = ""
    document: TimelineDocument


class MulticamSegment(BaseModel):
    """Resolved editorial cut segment inside a Multi-Cam Sync Bank."""

    start_frame: int = Field(ge=0)
    end_frame: int = Field(ge=1)
    duration_frames: int = Field(ge=1)
    angle_index: int = Field(ge=1, le=MAX_MULTICAM_ANGLES)
    angle_name: str
    cut_mode: MulticamCutMode = "video_only"
    source_in_frame: int = Field(ge=0)
    source_path: str = ""


class MulticamCompileResult(BaseModel):
    """Compiled FFmpeg filter_complex graph for Multi-Cam Cuts or 2x2 Quad View."""

    multicam_id: str
    name: str
    mode: MulticamCompileMode = "active_cuts"
    duration_s: float = Field(ge=0.0)
    angle_count: int = Field(ge=2)
    segment_count: int = Field(ge=1)
    segments: list[MulticamSegment] = Field(default_factory=list)
    filter_complex: str
    video_map_label: str = "[v_mc]"
    audio_map_label: str | None = "[a_mc]"
    warnings: list[str] = Field(default_factory=list)


def _slugify_multicam_id(raw: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "_", raw.strip().lower()).strip("_")
    return cleaned[:48] if cleaned else "multicam_bank"


def smpte_to_frames(tc: str, fps_int: int) -> int:
    """Convert SMPTE HH:MM:SS:FF timecode string into integer frames."""
    parts = tc.strip().split(":")
    if len(parts) != 4:
        return 0
    hh, mm, ss, ff = (int(p) for p in parts)
    rate = max(1, fps_int)
    return ((hh * 3600 + mm * 60 + ss) * rate) + min(rate - 1, max(0, ff))


def frames_to_smpte(frames: int, fps_int: int) -> str:
    """Format non-negative integer frame count as SMPTE HH:MM:SS:FF."""
    rate = max(1, fps_int)
    total = max(0, int(frames))
    ff = total % rate
    total_s = total // rate
    ss = total_s % 60
    mm = (total_s // 60) % 60
    hh = total_s // 3600
    return f"{hh:02d}:{mm:02d}:{ss:02d}:{ff:02d}"


def count_multicam_clips(doc: TimelineDocument) -> int:
    """Count top-level Multi-Cam clips present in a TimelineDocument."""
    total = 0
    for trk in doc.tracks:
        for clip in trk.clips:
            if clip.multicam_bank is not None:
                total += 1
    return total


def _next_multicam_name_and_id(
    doc: TimelineDocument, requested_name: str | None
) -> tuple[str, str]:
    existing_ids: set[str] = set()
    existing_count = 0
    for trk in doc.tracks:
        for clip in trk.clips:
            if clip.multicam_bank is not None:
                existing_count += 1
                existing_ids.add(clip.multicam_bank.id)

    base_name = (
        requested_name.strip()
        if isinstance(requested_name, str) and requested_name.strip()
        else ""
    )
    if not base_name:
        base_name = f"Multi-Cam Bank {existing_count + 1}"
    base_name = base_name[:120]

    base_id = _slugify_multicam_id(base_name)
    cand_id = base_id
    suffix = 2
    while cand_id in existing_ids:
        cand_id = f"{base_id}_{suffix}"
        suffix += 1
    return base_name, cand_id


def resolve_active_angle_at_frame(bank: MulticamBank, local_frame: int) -> MulticamCutEvent:
    """Return the active MulticamCutEvent governing local_frame inside the bank."""
    target = max(0, min(bank.duration_frames - 1, int(local_frame)))
    active = bank.cuts[0]
    for cut in bank.cuts:
        if cut.frame <= target:
            active = cut
        else:
            break
    return active


def compute_multicam_segments(bank: MulticamBank) -> list[MulticamSegment]:
    """Expand sorted Multi-Cam cut events into contiguous frame-exact segments."""
    angle_map: dict[int, MulticamAngle] = {a.angle_index: a for a in bank.angles}
    ordered_cuts = sorted(bank.cuts, key=lambda c: c.frame)
    segments: list[MulticamSegment] = []
    for idx, cut in enumerate(ordered_cuts):
        start_f = max(0, min(bank.duration_frames - 1, cut.frame))
        end_f = (
            ordered_cuts[idx + 1].frame
            if idx + 1 < len(ordered_cuts)
            else bank.duration_frames
        )
        end_f = max(start_f + 1, min(bank.duration_frames, end_f))
        angle = angle_map.get(cut.angle_index, bank.angles[0])
        src_in = max(0, angle.source_in_frame + angle.sync_offset_frames + start_f)
        segments.append(
            MulticamSegment(
                start_frame=start_f,
                end_frame=end_f,
                duration_frames=end_f - start_f,
                angle_index=angle.angle_index,
                angle_name=angle.name,
                cut_mode=cut.cut_mode,
                source_in_frame=src_in,
                source_path=angle.source_path,
            )
        )
    return segments


def sync_multicam_bank(bank: MulticamBank, sync_mode: MulticamSyncMode) -> MulticamBank:
    """Compute deterministic frame sync offsets across all camera angles for sync_mode."""
    fps_int = max(1, round(bank.fps.as_float))
    angles = [a.model_copy(deep=True) for a in bank.angles]

    if sync_mode == "in_point":
        for a in angles:
            a.sync_offset_frames = 0
    elif sync_mode == "timecode":
        tc_frames = [smpte_to_frames(a.timecode_start, fps_int) for a in angles]
        min_tc = min(tc_frames) if tc_frames else 0
        for a, tc_f in zip(angles, tc_frames, strict=True):
            a.sync_offset_frames = max(-100000, min(100000, tc_f - min_tc))
    elif sync_mode == "audio_waveform":
        ref_peak = angles[0].audio_peak_frame if angles[0].audio_peak_frame is not None else 12
        for idx, a in enumerate(angles):
            peak = a.audio_peak_frame
            if peak is None:
                peak = _DEFAULT_SLATE_PEAKS[idx % len(_DEFAULT_SLATE_PEAKS)]
                a.audio_peak_frame = peak
            a.sync_offset_frames = max(-100000, min(100000, ref_peak - peak))
    else:  # marker
        ref_in = angles[0].source_in_frame
        for a in angles:
            a.sync_offset_frames = max(-100000, min(100000, a.source_in_frame - ref_in))

    return bank.model_copy(update={"sync_mode": sync_mode, "angles": angles})


def _build_default_angles_from_clip(
    clip: TimelineClip,
    duration_frames: int,
    fps_int: int,
) -> list[MulticamAngle]:
    base_stem = re.sub(r"\.[A-Za-z0-9]+$", "", clip.source_path or clip.name).strip() or "cam"
    angles: list[MulticamAngle] = []
    base_tc_frames = smpte_to_frames("01:00:00:00", fps_int) + clip.source_in_frame
    for idx in range(4):
        letter = _ANGLE_LETTERS[idx]
        tc_offset = idx * 8
        angles.append(
            MulticamAngle(
                angle_index=idx + 1,
                name=_DEFAULT_ANGLE_LABELS[idx],
                source_path=(
                    clip.source_path
                    if idx == 0 and clip.source_path
                    else f"{base_stem}_cam{letter}.mov"
                ),
                media_ref=clip.media_ref if idx == 0 else "",
                source_in_frame=clip.source_in_frame,
                duration_frames=max(duration_frames, clip.duration_frames),
                sync_offset_frames=0,
                timecode_start=frames_to_smpte(base_tc_frames + tc_offset, fps_int),
                audio_peak_frame=_DEFAULT_SLATE_PEAKS[idx],
                color_tag=MULTICAM_ANGLE_COLORS[idx % len(MULTICAM_ANGLE_COLORS)],
                audio_follow=(idx == 0),
                enabled=True,
            )
        )
    return angles


def _find_clip(
    doc: TimelineDocument,
    track_kind: Literal["video", "audio"],
    track_index: int,
    clip_index: int,
) -> tuple[int, TimelineClip]:
    for idx, trk in enumerate(doc.tracks):
        if trk.kind == track_kind and trk.index == track_index:
            if clip_index < 0 or clip_index >= len(trk.clips):
                raise ValueError(
                    f"Clip index {clip_index} out of bounds for {track_kind.upper()}{track_index}"
                )
            return idx, trk.clips[clip_index]
    raise ValueError(f"Track {track_kind.upper()}{track_index} not found")


def create_multicam_clip(
    doc: TimelineDocument,
    *,
    track_kind: Literal["video", "audio"] = "video",
    track_index: int = 1,
    clip_index: int = 0,
    name: str | None = None,
    sync_mode: MulticamSyncMode = "audio_waveform",
    angles: list[MulticamAngle] | None = None,
) -> MulticamOpResult:
    """Convert a selected clip (and stacked tracks if present) into a Multi-Cam Sync Bank."""
    if track_kind != "video":
        raise ValueError("Multi-Cam Sync Bank requires a video track clip")

    next_doc = doc.model_copy(deep=True)
    trk_pos, target = _find_clip(next_doc, track_kind, track_index, clip_index)
    if target.multicam_bank is not None:
        return MulticamOpResult(
            changed=False,
            op="create_multicam",
            multicam_id=target.multicam_bank.id,
            track_kind="video",
            track_index=track_index,
            clip_index=clip_index,
            angle_count=len(target.multicam_bank.angles),
            cut_count=len(target.multicam_bank.cuts),
            active_angle=target.multicam_bank.cuts[0].angle_index,
            detail="Selected clip is already a Multi-Cam Sync Bank",
            document=doc,
        )

    if target.duration_frames < 1:
        raise ValueError("Multi-Cam clip requires positive duration_frames (>= 1)")

    bank_name, bank_id = _next_multicam_name_and_id(next_doc, name)
    fps_int = max(1, round(next_doc.fps.as_float))
    span_start = target.start_frame
    span_end = target.end_frame_exclusive

    built_angles: list[MulticamAngle]
    if angles is not None and len(angles) >= 2:
        built_angles = [a.model_copy(deep=True) for a in angles[:MAX_MULTICAM_ANGLES]]
    else:
        stacked: list[TimelineClip] = [target]
        for trk in sorted(next_doc.tracks, key=lambda t: t.index):
            if trk.kind != "video" or trk.index == track_index:
                continue
            for c in trk.clips:
                if (
                    c.duration_frames > 0
                    and c.start_frame < span_end
                    and c.end_frame_exclusive > span_start
                ):
                    stacked.append(c)
                    break
        if len(stacked) >= 2:
            built_angles = []
            base_tc_frames = smpte_to_frames("01:00:00:00", fps_int)
            for idx, sc in enumerate(stacked[:MAX_MULTICAM_ANGLES]):
                letter = _ANGLE_LETTERS[idx]
                tc_str = frames_to_smpte(base_tc_frames + sc.source_in_frame, fps_int)
                built_angles.append(
                    MulticamAngle(
                        angle_index=idx + 1,
                        name=sc.name or f"CAM {letter}",
                        source_path=sc.source_path,
                        media_ref=sc.media_ref,
                        source_in_frame=sc.source_in_frame,
                        duration_frames=max(target.duration_frames, sc.duration_frames),
                        sync_offset_frames=0,
                        timecode_start=tc_str,
                        audio_peak_frame=_DEFAULT_SLATE_PEAKS[idx % len(_DEFAULT_SLATE_PEAKS)],
                        color_tag=MULTICAM_ANGLE_COLORS[idx % len(MULTICAM_ANGLE_COLORS)],
                        audio_follow=(idx == 0),
                        enabled=True,
                    )
                )
        else:
            built_angles = _build_default_angles_from_clip(target, target.duration_frames, fps_int)

    raw_bank = MulticamBank(
        id=bank_id,
        name=bank_name,
        fps=next_doc.fps,
        width=next_doc.width,
        height=next_doc.height,
        duration_frames=target.duration_frames,
        sync_mode=sync_mode,
        audio_follow_angle=built_angles[0].angle_index,
        angles=built_angles,
        cuts=[
            MulticamCutEvent(
                frame=0,
                angle_index=built_angles[0].angle_index,
                cut_mode="video_only",
            )
        ],
    )
    synced_bank = sync_multicam_bank(raw_bank, sync_mode)

    mc_clip = target.model_copy(
        update={
            "name": bank_name,
            "multicam_bank": synced_bank,
        }
    )
    next_doc.tracks[trk_pos].clips[clip_index] = mc_clip

    return MulticamOpResult(
        changed=True,
        op="create_multicam",
        multicam_id=synced_bank.id,
        track_kind="video",
        track_index=track_index,
        clip_index=clip_index,
        angle_count=len(synced_bank.angles),
        cut_count=len(synced_bank.cuts),
        active_angle=synced_bank.cuts[0].angle_index,
        detail=(
            f"Created Multi-Cam Bank '{bank_name}' "
            f"({len(synced_bank.angles)} angles, sync={sync_mode})"
        ),
        document=next_doc,
    )


def sync_multicam_clip(
    doc: TimelineDocument,
    *,
    track_kind: Literal["video", "audio"] = "video",
    track_index: int = 1,
    clip_index: int = 0,
    sync_mode: MulticamSyncMode = "audio_waveform",
) -> MulticamOpResult:
    """Re-synchronize all camera angles of a Multi-Cam clip using sync_mode."""
    next_doc = doc.model_copy(deep=True)
    trk_pos, target = _find_clip(next_doc, track_kind, track_index, clip_index)
    if target.multicam_bank is None:
        raise ValueError("Selected clip is not a Multi-Cam Sync Bank")

    synced_bank = sync_multicam_bank(target.multicam_bank, sync_mode)
    next_doc.tracks[trk_pos].clips[clip_index] = target.model_copy(
        update={"multicam_bank": synced_bank}
    )

    return MulticamOpResult(
        changed=True,
        op="sync_multicam",
        multicam_id=synced_bank.id,
        track_kind=track_kind,
        track_index=track_index,
        clip_index=clip_index,
        angle_count=len(synced_bank.angles),
        cut_count=len(synced_bank.cuts),
        active_angle=synced_bank.cuts[0].angle_index,
        detail=f"Synchronized {len(synced_bank.angles)} angles via {sync_mode}",
        document=next_doc,
    )


def switch_multicam_angle(
    doc: TimelineDocument,
    *,
    track_kind: Literal["video", "audio"] = "video",
    track_index: int = 1,
    clip_index: int = 0,
    frame: int,
    angle_index: int,
    cut_mode: MulticamCutMode = "video_only",
) -> MulticamOpResult:
    """Switch active Multi-Cam angle at timeline frame (inserting or updating a cut event)."""
    next_doc = doc.model_copy(deep=True)
    trk_pos, target = _find_clip(next_doc, track_kind, track_index, clip_index)
    if target.multicam_bank is None:
        raise ValueError("Selected clip is not a Multi-Cam Sync Bank")

    bank = target.multicam_bank.model_copy(deep=True)
    valid_angles = {a.angle_index for a in bank.angles}
    if angle_index not in valid_angles:
        raise ValueError(f"Angle {angle_index} does not exist in Multi-Cam Bank '{bank.name}'")

    local_frame = max(0, min(bank.duration_frames - 1, int(frame) - target.start_frame))
    cuts_by_frame: dict[int, MulticamCutEvent] = {c.frame: c for c in bank.cuts}
    cuts_by_frame[local_frame] = MulticamCutEvent(
        frame=local_frame,
        angle_index=angle_index,
        cut_mode=cut_mode,
    )

    # Collapse redundant adjacent cuts pointing to the same angle (except frame 0)
    ordered: list[MulticamCutEvent] = []
    for f in sorted(cuts_by_frame):
        ev = cuts_by_frame[f]
        if ordered and ordered[-1].angle_index == ev.angle_index and ev.frame != 0:
            continue
        ordered.append(ev)

    audio_follow = bank.audio_follow_angle
    if cut_mode in ("audio_video", "audio_only") and local_frame == 0:
        audio_follow = angle_index

    updated_bank = bank.model_copy(
        update={
            "cuts": ordered,
            "audio_follow_angle": audio_follow,
        }
    )
    next_doc.tracks[trk_pos].clips[clip_index] = target.model_copy(
        update={"multicam_bank": updated_bank}
    )

    return MulticamOpResult(
        changed=True,
        op="switch_angle",
        multicam_id=updated_bank.id,
        track_kind=track_kind,
        track_index=track_index,
        clip_index=clip_index,
        angle_count=len(updated_bank.angles),
        cut_count=len(updated_bank.cuts),
        active_angle=angle_index,
        detail=f"Switched to Angle {angle_index} at +{local_frame}f ({cut_mode})",
        document=next_doc,
    )


def delete_multicam_cut(
    doc: TimelineDocument,
    *,
    track_kind: Literal["video", "audio"] = "video",
    track_index: int = 1,
    clip_index: int = 0,
    local_frame: int,
) -> MulticamOpResult:
    """Remove a Multi-Cam cut point at local_frame (frame 0 base angle cannot be removed)."""
    next_doc = doc.model_copy(deep=True)
    trk_pos, target = _find_clip(next_doc, track_kind, track_index, clip_index)
    if target.multicam_bank is None:
        raise ValueError("Selected clip is not a Multi-Cam Sync Bank")

    bank = target.multicam_bank.model_copy(deep=True)
    if local_frame <= 0:
        return MulticamOpResult(
            changed=False,
            op="delete_cut",
            multicam_id=bank.id,
            track_kind=track_kind,
            track_index=track_index,
            clip_index=clip_index,
            angle_count=len(bank.angles),
            cut_count=len(bank.cuts),
            active_angle=bank.cuts[0].angle_index,
            detail="Base angle cut at frame 0 cannot be deleted",
            document=doc,
        )

    kept = [c for c in bank.cuts if c.frame != local_frame]
    if len(kept) == len(bank.cuts):
        return MulticamOpResult(
            changed=False,
            op="delete_cut",
            multicam_id=bank.id,
            track_kind=track_kind,
            track_index=track_index,
            clip_index=clip_index,
            angle_count=len(bank.angles),
            cut_count=len(bank.cuts),
            active_angle=bank.cuts[0].angle_index,
            detail=f"No Multi-Cam cut found at +{local_frame}f",
            document=doc,
        )

    updated_bank = bank.model_copy(update={"cuts": kept})
    next_doc.tracks[trk_pos].clips[clip_index] = target.model_copy(
        update={"multicam_bank": updated_bank}
    )

    return MulticamOpResult(
        changed=True,
        op="delete_cut",
        multicam_id=updated_bank.id,
        track_kind=track_kind,
        track_index=track_index,
        clip_index=clip_index,
        angle_count=len(updated_bank.angles),
        cut_count=len(updated_bank.cuts),
        active_angle=updated_bank.cuts[0].angle_index,
        detail=f"Removed Multi-Cam cut at +{local_frame}f",
        document=next_doc,
    )


def update_multicam_angle(
    doc: TimelineDocument,
    *,
    track_kind: Literal["video", "audio"] = "video",
    track_index: int = 1,
    clip_index: int = 0,
    angle_index: int,
    name: str | None = None,
    sync_offset_frames: int | None = None,
    timecode_start: str | None = None,
    audio_follow: bool | None = None,
    audio_peak_frame: int | None = None,
) -> MulticamOpResult:
    """Update metadata or manual slip sync offset of a specific camera angle."""
    next_doc = doc.model_copy(deep=True)
    trk_pos, target = _find_clip(next_doc, track_kind, track_index, clip_index)
    if target.multicam_bank is None:
        raise ValueError("Selected clip is not a Multi-Cam Sync Bank")

    bank = target.multicam_bank.model_copy(deep=True)
    found = False
    next_angles: list[MulticamAngle] = []
    for angle in bank.angles:
        if angle.angle_index != angle_index:
            next_angles.append(angle)
            continue
        found = True
        updates: dict[str, object] = {}
        if name is not None and name.strip():
            updates["name"] = name.strip()[:80]
        if sync_offset_frames is not None:
            updates["sync_offset_frames"] = max(-100000, min(100000, int(sync_offset_frames)))
        if timecode_start is not None:
            updates["timecode_start"] = timecode_start
        if audio_follow is not None:
            updates["audio_follow"] = audio_follow
        if audio_peak_frame is not None:
            updates["audio_peak_frame"] = max(0, int(audio_peak_frame))
        next_angles.append(angle.model_copy(update=updates))

    if not found:
        raise ValueError(f"Angle {angle_index} does not exist in Multi-Cam Bank '{bank.name}'")

    updated_bank = bank.model_copy(update={"angles": next_angles})
    next_doc.tracks[trk_pos].clips[clip_index] = target.model_copy(
        update={"multicam_bank": updated_bank}
    )

    return MulticamOpResult(
        changed=True,
        op="update_angle",
        multicam_id=updated_bank.id,
        track_kind=track_kind,
        track_index=track_index,
        clip_index=clip_index,
        angle_count=len(updated_bank.angles),
        cut_count=len(updated_bank.cuts),
        active_angle=angle_index,
        detail=f"Updated Angle {angle_index} in '{updated_bank.name}'",
        document=next_doc,
    )


def flatten_multicam_clip(
    doc: TimelineDocument,
    *,
    track_kind: Literal["video", "audio"] = "video",
    track_index: int = 1,
    clip_index: int = 0,
) -> MulticamOpResult:
    """Flatten a Multi-Cam Sync Bank into discrete frame-accurate TimelineClip edits."""
    next_doc = doc.model_copy(deep=True)
    trk_pos, target = _find_clip(next_doc, track_kind, track_index, clip_index)
    if target.multicam_bank is None:
        raise ValueError("Selected clip is not a Multi-Cam Sync Bank")

    bank = target.multicam_bank
    segments = compute_multicam_segments(bank)
    angle_map = {a.angle_index: a for a in bank.angles}
    flat_clips: list[TimelineClip] = []
    for seg in segments:
        angle = angle_map.get(seg.angle_index, bank.angles[0])
        flat_clips.append(
            TimelineClip(
                name=angle.name,
                track_index=target.track_index,
                media_type=target.media_type,
                start_frame=target.start_frame + seg.start_frame,
                duration_frames=seg.duration_frames,
                source_in_frame=seg.source_in_frame,
                source_path=angle.source_path or target.source_path,
                media_ref=angle.media_ref or target.media_ref,
                source_fps=target.source_fps or bank.fps,
                enabled=target.enabled,
                audio_gain_db=target.audio_gain_db,
                fade_in_s=target.fade_in_s if seg.start_frame == 0 else 0.0,
                fade_out_s=target.fade_out_s if seg.end_frame == bank.duration_frames else 0.0,
                speed_rate=target.speed_rate,
                reverse=target.reverse,
                retime_process=target.retime_process,
                transform=target.transform.model_copy(deep=True) if target.transform else None,
            )
        )

    trk = next_doc.tracks[trk_pos]
    trk.clips = trk.clips[:clip_index] + flat_clips + trk.clips[clip_index + 1 :]

    return MulticamOpResult(
        changed=True,
        op="flatten_multicam",
        multicam_id=bank.id,
        track_kind=track_kind,
        track_index=track_index,
        clip_index=clip_index,
        angle_count=len(bank.angles),
        cut_count=len(flat_clips),
        active_angle=segments[0].angle_index if segments else 1,
        detail=f"Flattened Multi-Cam '{bank.name}' into {len(flat_clips)} timeline clip(s)",
        document=next_doc,
    )


def compile_multicam_filtergraph(
    bank: MulticamBank,
    *,
    mode: MulticamCompileMode = "active_cuts",
) -> MulticamCompileResult:
    """Compile deterministic FFmpeg filter_complex graph for Multi-Cam Cuts or 2x2 Quad View."""
    fps_val = bank.fps.as_float
    duration_s = round(bank.duration_frames / max(1e-6, fps_val), 4)
    segments = compute_multicam_segments(bank)
    angle_to_input = {a.angle_index: idx for idx, a in enumerate(bank.angles)}
    warnings: list[str] = []

    if mode == "quad_view":
        quad_angles = bank.angles[:4]
        cell_w = max(320, (bank.width or 1920) // 2)
        cell_h = max(180, (bank.height or 1080) // 2)
        stages: list[str] = []
        cell_labels: list[str] = []
        for idx, angle in enumerate(quad_angles):
            in_idx = angle_to_input[angle.angle_index]
            lbl = f"[mc_q{idx}]"
            offset_frames = max(0, angle.source_in_frame + angle.sync_offset_frames)
            end_frame = offset_frames + bank.duration_frames
            stages.append(
                f"[{in_idx}:v]trim=start_frame={offset_frames}:end_frame={end_frame},"
                f"setpts=PTS-STARTPTS,scale={cell_w}:{cell_h}:force_original_aspect_ratio=decrease,"
                f"pad={cell_w}:{cell_h}:(ow-iw)/2:(oh-ih)/2:color=#101116{lbl}"
            )
            cell_labels.append(lbl)
        while len(cell_labels) < 4:
            pad_idx = len(cell_labels)
            pad_lbl = f"[mc_q{pad_idx}]"
            stages.append(f"color=c=#101116:s={cell_w}x{cell_h}:d={duration_s:.4f}{pad_lbl}")
            cell_labels.append(pad_lbl)
        layout = "0_0|w0_0|0_h0|w0_h0"
        stages.append(
            f"{''.join(cell_labels)}xstack=inputs=4:layout={layout}[v_mc_quad]"
        )
        return MulticamCompileResult(
            multicam_id=bank.id,
            name=bank.name,
            mode="quad_view",
            duration_s=duration_s,
            angle_count=len(bank.angles),
            segment_count=len(segments),
            segments=segments,
            filter_complex=";".join(stages),
            video_map_label="[v_mc_quad]",
            audio_map_label=None,
            warnings=warnings,
        )

    # active_cuts mode
    stages = []
    v_labels: list[str] = []
    a_labels: list[str] = []
    w = bank.width or 1920
    h = bank.height or 1080

    for idx, seg in enumerate(segments):
        in_idx = angle_to_input.get(seg.angle_index, 0)
        v_lbl = f"[mc_v{idx}]"
        v_end = seg.source_in_frame + seg.duration_frames
        stages.append(
            f"[{in_idx}:v]trim=start_frame={seg.source_in_frame}:end_frame={v_end},"
            f"setpts=PTS-STARTPTS,scale={w}:{h}:force_original_aspect_ratio=decrease,"
            f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2{v_lbl}"
        )
        v_labels.append(v_lbl)

        audio_in_idx = (
            in_idx
            if seg.cut_mode in ("audio_video", "audio_only")
            else angle_to_input.get(bank.audio_follow_angle or 1, 0)
        )
        t_start = seg.source_in_frame / max(1e-6, fps_val)
        t_end = v_end / max(1e-6, fps_val)
        a_lbl = f"[mc_a{idx}]"
        stages.append(
            f"[{audio_in_idx}:a]atrim=start={t_start:.4f}:end={t_end:.4f},"
            f"asetpts=PTS-STARTPTS{a_lbl}"
        )
        a_labels.append(a_lbl)

    if len(v_labels) == 1:
        stages.append(f"{v_labels[0]}copy[v_mc]")
        stages.append(f"{a_labels[0]}acopy[a_mc]")
    else:
        stages.append(f"{''.join(v_labels)}concat=n={len(v_labels)}:v=1:a=0[v_mc]")
        stages.append(f"{''.join(a_labels)}concat=n={len(a_labels)}:v=0:a=1[a_mc]")

    return MulticamCompileResult(
        multicam_id=bank.id,
        name=bank.name,
        mode="active_cuts",
        duration_s=duration_s,
        angle_count=len(bank.angles),
        segment_count=len(segments),
        segments=segments,
        filter_complex=";".join(stages),
        video_map_label="[v_mc]",
        audio_map_label="[a_mc]",
        warnings=warnings,
    )
