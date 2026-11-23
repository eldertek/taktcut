"""Deterministic integer-frame timeline edit operations (Ripple, Roll, Slip, Slide, Sync Lock)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from taktcut.models import (
    RationalFrameRate,
    TimelineClip,
    TimelineDocument,
    TimelineTrack,
    conform_source_frames,
)

TimelineEditOp = Literal[
    "ripple_trim",
    "roll",
    "slip",
    "slide",
    "ripple_delete",
    "toggle_sync_lock",
    "set_all_sync_lock",
]

ALLOWED_TIMELINE_EDIT_OPS: tuple[TimelineEditOp, ...] = (
    "ripple_trim",
    "roll",
    "slip",
    "slide",
    "ripple_delete",
    "toggle_sync_lock",
    "set_all_sync_lock",
)


class TimelineEditResult(BaseModel):
    """Structured immutable result of a deterministic timeline edit operation."""

    changed: bool
    op: TimelineEditOp
    delta_applied: int = 0
    shifted_count: int = 0
    sync_locked_tracks: int = Field(default=0, ge=0)
    detail: str = ""
    document: TimelineDocument


def _compute_source_frame_delta(
    timeline_delta_frames: int,
    source_fps: RationalFrameRate | None,
    timeline_fps: RationalFrameRate,
) -> int:
    if timeline_delta_frames == 0:
        return 0
    if source_fps is None:
        return timeline_delta_frames
    if source_fps.fraction == timeline_fps.fraction:
        return timeline_delta_frames
    return conform_source_frames(timeline_delta_frames, source_fps, timeline_fps)


def _min_tl_delta_for_source_in(
    current_source_in: int,
    source_fps: RationalFrameRate | None,
    timeline_fps: RationalFrameRate,
    candidate_min_tl_delta: int,
) -> int:
    """Return tightest timeline delta >= candidate_min_tl_delta keeping source_in >= 0."""
    if candidate_min_tl_delta >= 0:
        return candidate_min_tl_delta
    if source_fps is None or source_fps.fraction == timeline_fps.fraction:
        return max(candidate_min_tl_delta, -current_source_in)
    # Rational binary search on [candidate_min_tl_delta, 0]
    lo = candidate_min_tl_delta
    hi = 0
    best = 0
    while lo <= hi:
        mid = (lo + hi) // 2
        src_delta = _compute_source_frame_delta(mid, source_fps, timeline_fps)
        if current_source_in + src_delta >= 0:
            best = mid
            hi = mid - 1
        else:
            lo = mid + 1
    return best


def _find_track_and_clip(
    doc: TimelineDocument,
    track_kind: Literal["video", "audio"],
    track_index: int,
    clip_index: int,
) -> tuple[TimelineTrack, TimelineClip] | None:
    for trk in doc.tracks:
        if trk.kind == track_kind and trk.index == track_index:
            if 0 <= clip_index < len(trk.clips):
                return trk, trk.clips[clip_index]
            return None
    return None


def _count_sync_locked(doc: TimelineDocument) -> int:
    return sum(1 for trk in doc.tracks if trk.sync_locked)


def _sync_lock_negative_floor(
    doc: TimelineDocument,
    source_track: TimelineTrack,
    anchor_frame: int,
    proposed_shift: int,
) -> int:
    """Clamp negative ripple shift across sync-locked tracks to avoid overlaps or < start_frame."""
    if proposed_shift >= 0 or not source_track.sync_locked:
        return proposed_shift
    clamped = proposed_shift
    doc_start = doc.start_frame
    for trk in doc.tracks:
        if trk is source_track or not trk.sync_locked:
            continue
        upstream_end = doc_start
        earliest_down: int | None = None
        for clip in trk.clips:
            if clip.start_frame >= anchor_frame:
                if earliest_down is None or clip.start_frame < earliest_down:
                    earliest_down = clip.start_frame
            else:
                upstream_end = max(upstream_end, clip.start_frame + clip.duration_frames)
        if earliest_down is not None:
            max_neg = upstream_end - earliest_down
            if max_neg > clamped:
                clamped = max_neg
    return min(0, clamped)


def _apply_sync_locked_ripple(
    doc: TimelineDocument,
    source_track: TimelineTrack,
    anchor_frame: int,
    shift_frames: int,
    *,
    exclude_clip: TimelineClip | None = None,
) -> int:
    """Shift clips starting at/after anchor_frame on source track and all sync-locked tracks."""
    if shift_frames == 0:
        return 0
    shifted = 0
    doc_start = doc.start_frame
    for trk in doc.tracks:
        if trk is not source_track and not (source_track.sync_locked and trk.sync_locked):
            continue
        for clip in trk.clips:
            if exclude_clip is not None and clip is exclude_clip:
                continue
            if clip.start_frame >= anchor_frame:
                clip.start_frame = max(doc_start, clip.start_frame + shift_frames)
                shifted += 1
        trk.clips.sort(key=lambda c: (c.start_frame, c.duration_frames))
    return shifted


def toggle_track_sync_lock(
    doc: TimelineDocument,
    track_kind: Literal["video", "audio"],
    track_index: int,
) -> TimelineEditResult:
    """Toggle sync_locked on a single track without mutating the input document."""
    next_doc = doc.model_copy(deep=True)
    target = next(
        (t for t in next_doc.tracks if t.kind == track_kind and t.index == track_index),
        None,
    )
    if target is None:
        return TimelineEditResult(
            changed=False,
            op="toggle_sync_lock",
            sync_locked_tracks=_count_sync_locked(doc),
            detail=f"Track {track_kind} {track_index} not found.",
            document=doc,
        )
    target.sync_locked = not target.sync_locked
    return TimelineEditResult(
        changed=True,
        op="toggle_sync_lock",
        sync_locked_tracks=_count_sync_locked(next_doc),
        detail=f"{track_kind.upper()}{track_index} sync_locked={target.sync_locked}",
        document=next_doc,
    )


def set_all_tracks_sync_lock(doc: TimelineDocument, enabled: bool) -> TimelineEditResult:
    """Set sync_locked on every track in the timeline."""
    next_doc = doc.model_copy(deep=True)
    changed = False
    for trk in next_doc.tracks:
        if trk.sync_locked != enabled:
            trk.sync_locked = enabled
            changed = True
    if not changed:
        return TimelineEditResult(
            changed=False,
            op="set_all_sync_lock",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Sync Lock already in requested state.",
            document=doc,
        )
    return TimelineEditResult(
        changed=True,
        op="set_all_sync_lock",
        sync_locked_tracks=_count_sync_locked(next_doc),
        detail=f"All tracks sync_locked={enabled}",
        document=next_doc,
    )


def ripple_trim_clip(
    doc: TimelineDocument,
    track_kind: Literal["video", "audio"],
    track_index: int,
    clip_index: int,
    edge: Literal["left", "right"],
    delta_frames: int,
) -> TimelineEditResult:
    """Ripple trim a clip's left or right edge and shift downstream sync-locked clips."""
    if delta_frames == 0:
        return TimelineEditResult(
            changed=False,
            op="ripple_trim",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Zero delta.",
            document=doc,
        )
    next_doc = doc.model_copy(deep=True)
    found = _find_track_and_clip(next_doc, track_kind, track_index, clip_index)
    if found is None:
        return TimelineEditResult(
            changed=False,
            op="ripple_trim",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Target clip not found.",
            document=doc,
        )
    trk, clip = found
    orig_dur = clip.duration_frames
    orig_end = clip.start_frame + orig_dur

    if edge == "right":
        min_delta = 1 - orig_dur
        eff_delta = max(min_delta, delta_frames)
        if eff_delta < 0:
            eff_delta = _sync_lock_negative_floor(next_doc, trk, orig_end, eff_delta)
        if eff_delta == 0:
            return TimelineEditResult(
                changed=False,
                op="ripple_trim",
                sync_locked_tracks=_count_sync_locked(doc),
                detail="Ripple trim clamped at boundary.",
                document=doc,
            )
        clip.duration_frames = orig_dur + eff_delta
        shifted = _apply_sync_locked_ripple(
            next_doc, trk, orig_end, eff_delta, exclude_clip=clip
        )
        return TimelineEditResult(
            changed=True,
            op="ripple_trim",
            delta_applied=eff_delta,
            shifted_count=shifted,
            sync_locked_tracks=_count_sync_locked(next_doc),
            detail=f"Ripple Out {eff_delta:+d}f (dur={clip.duration_frames}f)",
            document=next_doc,
        )

    # edge == "left": +delta trims head shorter & shifts downstream left (-delta);
    # -delta extends head earlier (clamped by source_in_frame >= 0) & shifts downstream right.
    max_pos_delta = orig_dur - 1
    min_neg_delta = _min_tl_delta_for_source_in(
        clip.source_in_frame, clip.source_fps, next_doc.fps, delta_frames
    )
    eff_delta = max(min_neg_delta, min(max_pos_delta, delta_frames))
    ripple_shift = -eff_delta
    if ripple_shift < 0:
        clamped_shift = _sync_lock_negative_floor(next_doc, trk, orig_end, ripple_shift)
        eff_delta = -clamped_shift
        ripple_shift = clamped_shift
    if eff_delta == 0:
        return TimelineEditResult(
            changed=False,
            op="ripple_trim",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Ripple trim left clamped at source start or sync boundary.",
            document=doc,
        )
    src_delta = _compute_source_frame_delta(eff_delta, clip.source_fps, next_doc.fps)
    clip.source_in_frame = max(0, clip.source_in_frame + src_delta)
    clip.duration_frames = orig_dur - eff_delta
    shifted = _apply_sync_locked_ripple(
        next_doc, trk, orig_end, ripple_shift, exclude_clip=clip
    )
    return TimelineEditResult(
        changed=True,
        op="ripple_trim",
        delta_applied=eff_delta,
        shifted_count=shifted,
        sync_locked_tracks=_count_sync_locked(next_doc),
        detail=(
            f"Ripple In {eff_delta:+d}f "
            f"(srcIn={clip.source_in_frame}f, dur={clip.duration_frames}f)"
        ),
        document=next_doc,
    )


def roll_edit_cut(
    doc: TimelineDocument,
    track_kind: Literal["video", "audio"],
    track_index: int,
    left_clip_index: int,
    delta_frames: int,
) -> TimelineEditResult:
    """Roll an adjacent cut junction between left_clip and right_clip without changing duration."""
    if delta_frames == 0:
        return TimelineEditResult(
            changed=False,
            op="roll",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Zero delta.",
            document=doc,
        )
    next_doc = doc.model_copy(deep=True)
    found = _find_track_and_clip(next_doc, track_kind, track_index, left_clip_index)
    if found is None:
        return TimelineEditResult(
            changed=False,
            op="roll",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Left clip not found.",
            document=doc,
        )
    trk, left_clip = found
    if left_clip_index + 1 >= len(trk.clips):
        return TimelineEditResult(
            changed=False,
            op="roll",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="No adjacent incoming clip for roll edit.",
            document=doc,
        )
    right_clip = trk.clips[left_clip_index + 1]
    if left_clip.start_frame + left_clip.duration_frames != right_clip.start_frame:
        return TimelineEditResult(
            changed=False,
            op="roll",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Clips are not adjacent; roll edit requires flush cut junction.",
            document=doc,
        )

    min_delta = 1 - left_clip.duration_frames
    if delta_frames < 0:
        min_delta = _min_tl_delta_for_source_in(
            right_clip.source_in_frame, right_clip.source_fps, next_doc.fps, min_delta
        )
    max_delta = right_clip.duration_frames - 1
    eff_delta = max(min_delta, min(max_delta, delta_frames))
    if eff_delta == 0:
        return TimelineEditResult(
            changed=False,
            op="roll",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Roll edit clamped at clip/source bounds.",
            document=doc,
        )

    src_delta = _compute_source_frame_delta(eff_delta, right_clip.source_fps, next_doc.fps)
    left_clip.duration_frames += eff_delta
    right_clip.start_frame += eff_delta
    right_clip.duration_frames -= eff_delta
    right_clip.source_in_frame = max(0, right_clip.source_in_frame + src_delta)
    return TimelineEditResult(
        changed=True,
        op="roll",
        delta_applied=eff_delta,
        sync_locked_tracks=_count_sync_locked(next_doc),
        detail=(
            f"Roll {eff_delta:+d}f "
            f"(out={left_clip.duration_frames}f | in={right_clip.duration_frames}f)"
        ),
        document=next_doc,
    )


def slip_clip(
    doc: TimelineDocument,
    track_kind: Literal["video", "audio"],
    track_index: int,
    clip_index: int,
    delta_source_frames: int,
) -> TimelineEditResult:
    """Slip a clip's source_in_frame while locking its timeline start_frame and duration."""
    if delta_source_frames == 0:
        return TimelineEditResult(
            changed=False,
            op="slip",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Zero delta.",
            document=doc,
        )
    next_doc = doc.model_copy(deep=True)
    found = _find_track_and_clip(next_doc, track_kind, track_index, clip_index)
    if found is None:
        return TimelineEditResult(
            changed=False,
            op="slip",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Target clip not found.",
            document=doc,
        )
    _, clip = found
    new_src_in = max(0, clip.source_in_frame + delta_source_frames)
    eff_delta = new_src_in - clip.source_in_frame
    if eff_delta == 0:
        return TimelineEditResult(
            changed=False,
            op="slip",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Slip clamped at source frame 0.",
            document=doc,
        )
    clip.source_in_frame = new_src_in
    return TimelineEditResult(
        changed=True,
        op="slip",
        delta_applied=eff_delta,
        sync_locked_tracks=_count_sync_locked(next_doc),
        detail=f"Slip {eff_delta:+d}f (srcIn={clip.source_in_frame}f)",
        document=next_doc,
    )


def slide_clip(
    doc: TimelineDocument,
    track_kind: Literal["video", "audio"],
    track_index: int,
    clip_index: int,
    delta_frames: int,
) -> TimelineEditResult:
    """Slide a clip between neighbors, inversely trimming flush adjacent clips."""
    if delta_frames == 0:
        return TimelineEditResult(
            changed=False,
            op="slide",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Zero delta.",
            document=doc,
        )
    next_doc = doc.model_copy(deep=True)
    found = _find_track_and_clip(next_doc, track_kind, track_index, clip_index)
    if found is None:
        return TimelineEditResult(
            changed=False,
            op="slide",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Target clip not found.",
            document=doc,
        )
    trk, clip = found
    prev_clip = trk.clips[clip_index - 1] if clip_index > 0 else None
    next_clip = trk.clips[clip_index + 1] if clip_index + 1 < len(trk.clips) else None
    clip_end = clip.start_frame + clip.duration_frames

    left_adj = (
        prev_clip is not None
        and (prev_clip.start_frame + prev_clip.duration_frames) == clip.start_frame
    )
    right_adj = next_clip is not None and clip_end == next_clip.start_frame

    min_delta = next_doc.start_frame - clip.start_frame
    if prev_clip is not None:
        if left_adj:
            min_delta = max(min_delta, 1 - prev_clip.duration_frames)
        else:
            prev_end = prev_clip.start_frame + prev_clip.duration_frames
            min_delta = max(min_delta, prev_end - clip.start_frame)
    if next_clip is not None and right_adj and delta_frames < 0:
        min_delta = _min_tl_delta_for_source_in(
            next_clip.source_in_frame, next_clip.source_fps, next_doc.fps, min_delta
        )

    max_delta = delta_frames if delta_frames > 0 else 0
    if next_clip is not None:
        max_delta = (
            next_clip.duration_frames - 1
            if right_adj
            else next_clip.start_frame - clip_end
        )

    eff_delta = max(min_delta, min(max_delta, delta_frames))
    if eff_delta == 0:
        return TimelineEditResult(
            changed=False,
            op="slide",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Slide clamped at neighbor or start boundary.",
            document=doc,
        )

    if prev_clip is not None and left_adj:
        prev_clip.duration_frames += eff_delta
    clip.start_frame += eff_delta
    if next_clip is not None and right_adj:
        src_delta = _compute_source_frame_delta(eff_delta, next_clip.source_fps, next_doc.fps)
        next_clip.start_frame += eff_delta
        next_clip.duration_frames -= eff_delta
        next_clip.source_in_frame = max(0, next_clip.source_in_frame + src_delta)

    return TimelineEditResult(
        changed=True,
        op="slide",
        delta_applied=eff_delta,
        sync_locked_tracks=_count_sync_locked(next_doc),
        detail=f"Slide {eff_delta:+d}f (start={clip.start_frame}f)",
        document=next_doc,
    )


def ripple_delete_clip(
    doc: TimelineDocument,
    track_kind: Literal["video", "audio"],
    track_index: int,
    clip_index: int,
) -> TimelineEditResult:
    """Ripple-delete a clip and close its gap across the track and sync-locked tracks."""
    next_doc = doc.model_copy(deep=True)
    found = _find_track_and_clip(next_doc, track_kind, track_index, clip_index)
    if found is None:
        return TimelineEditResult(
            changed=False,
            op="ripple_delete",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Target clip not found.",
            document=doc,
        )
    trk, deleted = found
    del_start = deleted.start_frame
    del_dur = max(0, deleted.duration_frames)
    del_end = del_start + del_dur
    doc_start = next_doc.start_frame

    del trk.clips[clip_index]

    shifted = 0
    for other in trk.clips:
        other_end = other.start_frame + other.duration_frames
        if other.start_frame <= del_start and other_end == del_start and other.transition_out:
            other.transition_out = None
        if other.start_frame >= del_end or (del_dur == 0 and other.start_frame > del_start):
            other.start_frame = max(doc_start, other.start_frame - del_dur)
            shifted += 1
    trk.clips.sort(key=lambda c: (c.start_frame, c.duration_frames))

    if trk.sync_locked and del_dur > 0:
        for other_trk in next_doc.tracks:
            if other_trk is trk or not other_trk.sync_locked:
                continue
            other_trk.clips.sort(key=lambda c: (c.start_frame, c.duration_frames))
            prev_end = doc_start
            for other_clip in other_trk.clips:
                if other_clip.start_frame >= del_end:
                    target_start = max(doc_start, prev_end, other_clip.start_frame - del_dur)
                    if target_start != other_clip.start_frame:
                        other_clip.start_frame = target_start
                        shifted += 1
                prev_end = max(prev_end, other_clip.start_frame + other_clip.duration_frames)

    return TimelineEditResult(
        changed=True,
        op="ripple_delete",
        delta_applied=-del_dur,
        shifted_count=shifted,
        sync_locked_tracks=_count_sync_locked(next_doc),
        detail=f"Ripple deleted {deleted.name} (-{del_dur}f, shifted {shifted} clip(s))",
        document=next_doc,
    )


def apply_timeline_edit(
    doc: TimelineDocument,
    *,
    op: TimelineEditOp,
    track_kind: Literal["video", "audio"] = "video",
    track_index: int = 1,
    clip_index: int = 0,
    edge: Literal["left", "right"] = "right",
    delta_frames: int = 0,
    enabled: bool = True,
) -> TimelineEditResult:
    """Dispatch a validated timeline edit operation by name."""
    if op == "ripple_trim":
        return ripple_trim_clip(doc, track_kind, track_index, clip_index, edge, delta_frames)
    if op == "roll":
        return roll_edit_cut(doc, track_kind, track_index, clip_index, delta_frames)
    if op == "slip":
        return slip_clip(doc, track_kind, track_index, clip_index, delta_frames)
    if op == "slide":
        return slide_clip(doc, track_kind, track_index, clip_index, delta_frames)
    if op == "ripple_delete":
        return ripple_delete_clip(doc, track_kind, track_index, clip_index)
    if op == "toggle_sync_lock":
        return toggle_track_sync_lock(doc, track_kind, track_index)
    if op == "set_all_sync_lock":
        return set_all_tracks_sync_lock(doc, enabled)
    raise ValueError(f"Unsupported timeline edit op: {op!r}")
