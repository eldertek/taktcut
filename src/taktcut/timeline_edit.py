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
    "link_av",
    "unlink_av",
    "split_edit_jl",
    "align_av_split",
]

ALLOWED_TIMELINE_EDIT_OPS: tuple[TimelineEditOp, ...] = (
    "ripple_trim",
    "roll",
    "slip",
    "slide",
    "ripple_delete",
    "toggle_sync_lock",
    "set_all_sync_lock",
    "link_av",
    "unlink_av",
    "split_edit_jl",
    "align_av_split",
)

SplitEditCutType = Literal["unlinked", "aligned", "j_cut", "l_cut", "jl_cut"]


class AvSplitEditInfo(BaseModel):
    """Computed J-Cut / L-Cut split-edit offset telemetry for a linked A/V clip pair."""

    linked: bool
    link_group_id: str = ""
    cut_type: SplitEditCutType = "unlinked"
    in_offset_frames: int = 0
    out_offset_frames: int = 0
    video_track_index: int | None = None
    video_clip_index: int | None = None
    video_name: str = ""
    audio_track_index: int | None = None
    audio_clip_index: int | None = None
    audio_name: str = ""


class SplitEditCompileResult(BaseModel):
    """Compiled FFmpeg filtergraph snippet for a J-Cut / L-Cut split-edit A/V pair."""

    linked: bool
    link_group_id: str = ""
    cut_type: SplitEditCutType = "unlinked"
    in_offset_frames: int = 0
    out_offset_frames: int = 0
    video_filter: str = ""
    audio_filter: str = ""
    filter_complex: str = ""
    is_identity: bool = True


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
    *,
    exclude_clips: tuple[TimelineClip, ...] = (),
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
            if any(clip is ex for ex in exclude_clips):
                upstream_end = max(upstream_end, clip.start_frame + clip.duration_frames)
                continue
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
    exclude_clips: tuple[TimelineClip, ...] = (),
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
            if any(clip is ex for ex in exclude_clips):
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


def _find_linked_partner_in_doc(
    doc: TimelineDocument,
    source_clip: TimelineClip,
) -> tuple[TimelineTrack, int, TimelineClip] | None:
    """Locate the primary linked A/V partner sharing source_clip.link_group_id."""
    gid = source_clip.link_group_id.strip()
    if not gid:
        return None
    fallback: tuple[TimelineTrack, int, TimelineClip] | None = None
    for trk in doc.tracks:
        for idx, candidate in enumerate(trk.clips):
            if candidate is source_clip or candidate.link_group_id.strip() != gid:
                continue
            if candidate.media_type != source_clip.media_type:
                return trk, idx, candidate
            if fallback is None:
                fallback = (trk, idx, candidate)
    return fallback


def find_linked_partner_clip(
    doc: TimelineDocument,
    track_kind: Literal["video", "audio"],
    track_index: int,
    clip_index: int,
) -> tuple[TimelineTrack, int, TimelineClip] | None:
    """Return the linked partner (track, clip_index, clip) in an A/V link group."""
    found = _find_track_and_clip(doc, track_kind, track_index, clip_index)
    if found is None:
        return None
    _, clip = found
    return _find_linked_partner_in_doc(doc, clip)


def compute_av_split_info(
    doc: TimelineDocument,
    track_kind: Literal["video", "audio"],
    track_index: int,
    clip_index: int,
) -> AvSplitEditInfo:
    """Compute J-Cut / L-Cut split-edit offset telemetry for a clip and its linked A/V partner."""
    found = _find_track_and_clip(doc, track_kind, track_index, clip_index)
    if found is None:
        return AvSplitEditInfo(linked=False)
    trk, clip = found
    gid = clip.link_group_id.strip()
    partner = _find_linked_partner_in_doc(doc, clip)
    if not gid or partner is None:
        return AvSplitEditInfo(linked=False, link_group_id=gid)
    p_trk, p_idx, p_clip = partner

    if trk.kind == "video" and p_trk.kind == "audio":
        v_trk, v_idx, v_clip = trk, clip_index, clip
        a_trk, a_idx, a_clip = p_trk, p_idx, p_clip
    elif trk.kind == "audio" and p_trk.kind == "video":
        v_trk, v_idx, v_clip = p_trk, p_idx, p_clip
        a_trk, a_idx, a_clip = trk, clip_index, clip
    else:
        return AvSplitEditInfo(linked=True, link_group_id=gid, cut_type="aligned")

    in_off = a_clip.start_frame - v_clip.start_frame
    out_off = (a_clip.start_frame + a_clip.duration_frames) - (
        v_clip.start_frame + v_clip.duration_frames
    )
    if in_off != 0 and out_off != 0:
        cut_type: SplitEditCutType = "jl_cut"
    elif in_off != 0:
        cut_type = "j_cut"
    elif out_off != 0:
        cut_type = "l_cut"
    else:
        cut_type = "aligned"

    return AvSplitEditInfo(
        linked=True,
        link_group_id=gid,
        cut_type=cut_type,
        in_offset_frames=in_off,
        out_offset_frames=out_off,
        video_track_index=v_trk.index,
        video_clip_index=v_idx,
        video_name=v_clip.name,
        audio_track_index=a_trk.index,
        audio_clip_index=a_idx,
        audio_name=a_clip.name,
    )


def compile_split_edit_ffmpeg(
    doc: TimelineDocument,
    track_kind: Literal["video", "audio"],
    track_index: int,
    clip_index: int,
) -> SplitEditCompileResult:
    """Compile a deterministic FFmpeg filtergraph snippet for a linked A/V J-Cut / L-Cut pair."""
    info = compute_av_split_info(doc, track_kind, track_index, clip_index)
    if (
        not info.linked
        or info.video_track_index is None
        or info.video_clip_index is None
        or info.audio_track_index is None
        or info.audio_clip_index is None
    ):
        return SplitEditCompileResult(linked=False)

    v_found = _find_track_and_clip(doc, "video", info.video_track_index, info.video_clip_index)
    a_found = _find_track_and_clip(doc, "audio", info.audio_track_index, info.audio_clip_index)
    if v_found is None or a_found is None:
        return SplitEditCompileResult(linked=False)

    _, v_clip = v_found
    _, a_clip = a_found
    fps = max(1.0, doc.fps.as_float)

    v_src_in = max(0, v_clip.source_in_frame)
    v_src_end = v_src_in + max(1, v_clip.duration_frames)
    a_src_in_s = max(0, a_clip.source_in_frame) / fps
    a_src_end_s = (max(0, a_clip.source_in_frame) + max(1, a_clip.duration_frames)) / fps

    v_parts = [
        f"trim=start_frame={v_src_in}:end_frame={v_src_end}",
        "setpts=PTS-STARTPTS",
    ]
    a_parts = [
        f"atrim=start={a_src_in_s:.3f}:end={a_src_end_s:.3f}",
        "asetpts=PTS-STARTPTS",
    ]

    in_off = info.in_offset_frames
    out_off = info.out_offset_frames
    if in_off < 0:
        pre_lap_s = abs(in_off) / fps
        v_parts.append(f"tpad=start_duration={pre_lap_s:.3f}:start_mode=clone")
    elif in_off > 0:
        delay_ms = round((in_off / fps) * 1000)
        a_parts.append(f"adelay={delay_ms}|{delay_ms}")

    if out_off > 0:
        post_lap_s = out_off / fps
        v_parts.append(f"tpad=stop_duration={post_lap_s:.3f}:stop_mode=clone")
    elif out_off < 0:
        pad_s = abs(out_off) / fps
        a_parts.append(f"apad=pad_dur={pad_s:.3f}")

    v_filter = f"[0:v]{','.join(v_parts)}[v_split]"
    a_filter = f"[1:a]{','.join(a_parts)}[a_split]"
    filter_complex = f"{v_filter};{a_filter}"
    is_identity = in_off == 0 and out_off == 0
    return SplitEditCompileResult(
        linked=True,
        link_group_id=info.link_group_id,
        cut_type=info.cut_type,
        in_offset_frames=in_off,
        out_offset_frames=out_off,
        video_filter=v_filter,
        audio_filter=a_filter,
        filter_complex=filter_complex,
        is_identity=is_identity,
    )


def ripple_trim_clip(
    doc: TimelineDocument,
    track_kind: Literal["video", "audio"],
    track_index: int,
    clip_index: int,
    edge: Literal["left", "right"],
    delta_frames: int,
    *,
    respect_av_link: bool = False,
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
    partner_info = _find_linked_partner_in_doc(next_doc, clip) if respect_av_link else None
    partner_clip = partner_info[2] if partner_info is not None else None
    exclude_tuple: tuple[TimelineClip, ...] = (
        (clip, partner_clip) if partner_clip is not None else (clip,)
    )
    orig_dur = clip.duration_frames
    orig_end = clip.start_frame + orig_dur

    if edge == "right":
        min_delta = 1 - orig_dur
        if partner_clip is not None:
            min_delta = max(min_delta, 1 - partner_clip.duration_frames)
        eff_delta = max(min_delta, delta_frames)
        if eff_delta < 0:
            eff_delta = _sync_lock_negative_floor(
                next_doc, trk, orig_end, eff_delta, exclude_clips=exclude_tuple
            )
        if eff_delta == 0:
            return TimelineEditResult(
                changed=False,
                op="ripple_trim",
                sync_locked_tracks=_count_sync_locked(doc),
                detail="Ripple trim clamped at boundary.",
                document=doc,
            )
        clip.duration_frames = orig_dur + eff_delta
        if partner_clip is not None:
            partner_clip.duration_frames += eff_delta
        shifted = _apply_sync_locked_ripple(
            next_doc, trk, orig_end, eff_delta, exclude_clips=exclude_tuple
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
    if partner_clip is not None:
        max_pos_delta = min(max_pos_delta, partner_clip.duration_frames - 1)
    min_neg_delta = _min_tl_delta_for_source_in(
        clip.source_in_frame, clip.source_fps, next_doc.fps, delta_frames
    )
    if partner_clip is not None:
        partner_min_neg = _min_tl_delta_for_source_in(
            partner_clip.source_in_frame, partner_clip.source_fps, next_doc.fps, delta_frames
        )
        min_neg_delta = max(min_neg_delta, partner_min_neg)
    eff_delta = max(min_neg_delta, min(max_pos_delta, delta_frames))
    ripple_shift = -eff_delta
    if ripple_shift < 0:
        clamped_shift = _sync_lock_negative_floor(
            next_doc, trk, orig_end, ripple_shift, exclude_clips=exclude_tuple
        )
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
    if partner_clip is not None:
        p_src_delta = _compute_source_frame_delta(eff_delta, partner_clip.source_fps, next_doc.fps)
        partner_clip.source_in_frame = max(0, partner_clip.source_in_frame + p_src_delta)
        partner_clip.duration_frames -= eff_delta
    shifted = _apply_sync_locked_ripple(
        next_doc, trk, orig_end, ripple_shift, exclude_clips=exclude_tuple
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


def _next_av_link_group_id(doc: TimelineDocument) -> str:
    used = {
        c.link_group_id.strip()
        for trk in doc.tracks
        for c in trk.clips
        if c.link_group_id.strip()
    }
    idx = 1
    while True:
        cand = f"av-{idx:02d}"
        if cand not in used:
            return cand
        idx += 1


def link_av_clips(
    doc: TimelineDocument,
    track_kind: Literal["video", "audio"],
    track_index: int,
    clip_index: int,
    *,
    partner_track_kind: Literal["video", "audio"] | None = None,
    partner_track_index: int | None = None,
    partner_clip_index: int | None = None,
) -> TimelineEditResult:
    """Link a video/audio clip pair into an A/V link group for synchronized edits & J/L-Cuts."""
    next_doc = doc.model_copy(deep=True)
    found = _find_track_and_clip(next_doc, track_kind, track_index, clip_index)
    if found is None:
        return TimelineEditResult(
            changed=False,
            op="link_av",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Target clip not found.",
            document=doc,
        )
    trk, clip = found
    if clip.link_group_id.strip() and _find_linked_partner_in_doc(next_doc, clip) is not None:
        return TimelineEditResult(
            changed=False,
            op="link_av",
            sync_locked_tracks=_count_sync_locked(doc),
            detail=f"Clip already linked ({clip.link_group_id}).",
            document=doc,
        )

    partner_clip: TimelineClip | None = None
    if (
        partner_track_kind is not None
        and partner_track_index is not None
        and partner_clip_index is not None
    ):
        p_found = _find_track_and_clip(
            next_doc, partner_track_kind, partner_track_index, partner_clip_index
        )
        if p_found is not None and p_found[1] is not clip:
            partner_clip = p_found[1]
    else:
        want_kind: Literal["video", "audio"] = "audio" if trk.kind == "video" else "video"
        c_start = clip.start_frame
        c_end = clip.start_frame + clip.duration_frames
        best_score: tuple[int, int, int, int] | None = None
        for cand_trk in next_doc.tracks:
            if cand_trk.kind != want_kind:
                continue
            for cand_idx, cand in enumerate(cand_trk.clips):
                if cand is clip or cand.link_group_id.strip():
                    continue
                ov = min(c_end, cand.start_frame + cand.duration_frames) - max(
                    c_start, cand.start_frame
                )
                dist = abs(cand.start_frame - c_start)
                # Maximize overlap (negative for min-tuple), then minimize distance & track index
                score = (-max(0, ov), dist, cand_trk.index, cand_idx)
                if best_score is None or score < best_score:
                    best_score = score
                    partner_clip = cand

    if partner_clip is None:
        return TimelineEditResult(
            changed=False,
            op="link_av",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="No unlinked opposite-media clip found to link.",
            document=doc,
        )

    gid = _next_av_link_group_id(next_doc)
    clip.link_group_id = gid
    partner_clip.link_group_id = gid
    return TimelineEditResult(
        changed=True,
        op="link_av",
        sync_locked_tracks=_count_sync_locked(next_doc),
        detail=f"Linked {clip.name} + {partner_clip.name} ({gid})",
        document=next_doc,
    )


def unlink_av_clips(
    doc: TimelineDocument,
    track_kind: Literal["video", "audio"],
    track_index: int,
    clip_index: int,
) -> TimelineEditResult:
    """Unlink a clip from its A/V link group so audio/video edit independently."""
    next_doc = doc.model_copy(deep=True)
    found = _find_track_and_clip(next_doc, track_kind, track_index, clip_index)
    if found is None:
        return TimelineEditResult(
            changed=False,
            op="unlink_av",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Target clip not found.",
            document=doc,
        )
    _, clip = found
    gid = clip.link_group_id.strip()
    if not gid:
        return TimelineEditResult(
            changed=False,
            op="unlink_av",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Clip is already unlinked.",
            document=doc,
        )
    clip.link_group_id = ""
    remaining = [
        c for t in next_doc.tracks for c in t.clips if c.link_group_id.strip() == gid
    ]
    if len(remaining) <= 1:
        for rem in remaining:
            rem.link_group_id = ""
    return TimelineEditResult(
        changed=True,
        op="unlink_av",
        sync_locked_tracks=_count_sync_locked(next_doc),
        detail=f"Unlinked {clip.name} ({gid})",
        document=next_doc,
    )


def apply_split_edit_jl(
    doc: TimelineDocument,
    track_kind: Literal["video", "audio"],
    track_index: int,
    clip_index: int,
    *,
    edge: Literal["left", "right"] = "left",
    delta_frames: int = 0,
    target_kind: Literal["video", "audio"] = "audio",
) -> TimelineEditResult:
    """Apply an independent J-Cut (edge='left') or L-Cut (edge='right') split-edit trim."""
    if delta_frames == 0:
        return TimelineEditResult(
            changed=False,
            op="split_edit_jl",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Zero split-edit delta.",
            document=doc,
        )
    next_doc = doc.model_copy(deep=True)
    info = compute_av_split_info(next_doc, track_kind, track_index, clip_index)
    if (
        not info.linked
        or info.video_track_index is None
        or info.video_clip_index is None
        or info.audio_track_index is None
        or info.audio_clip_index is None
    ):
        return TimelineEditResult(
            changed=False,
            op="split_edit_jl",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Select an A/V linked clip pair for J/L-Cut split edit.",
            document=doc,
        )

    t_kind: Literal["video", "audio"] = target_kind
    t_idx = info.audio_track_index if t_kind == "audio" else info.video_track_index
    c_idx = info.audio_clip_index if t_kind == "audio" else info.video_clip_index
    found = _find_track_and_clip(next_doc, t_kind, t_idx, c_idx)
    if found is None:
        return TimelineEditResult(
            changed=False,
            op="split_edit_jl",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Split-edit target clip not found.",
            document=doc,
        )
    trk, target = found
    prev_clip = trk.clips[c_idx - 1] if c_idx > 0 else None
    next_clip = trk.clips[c_idx + 1] if c_idx + 1 < len(trk.clips) else None
    orig_end = target.start_frame + target.duration_frames

    if edge == "left":
        min_delta = next_doc.start_frame - target.start_frame
        if prev_clip is not None:
            prev_end = prev_clip.start_frame + prev_clip.duration_frames
            min_delta = max(min_delta, prev_end - target.start_frame)
        min_delta = _min_tl_delta_for_source_in(
            target.source_in_frame, target.source_fps, next_doc.fps, min_delta
        )
        max_delta = target.duration_frames - 1
        eff_delta = max(min_delta, min(max_delta, delta_frames))
        if eff_delta == 0:
            return TimelineEditResult(
                changed=False,
                op="split_edit_jl",
                sync_locked_tracks=_count_sync_locked(doc),
                detail="Split-edit In edge clamped at neighbor or source start.",
                document=doc,
            )
        src_delta = _compute_source_frame_delta(eff_delta, target.source_fps, next_doc.fps)
        target.start_frame += eff_delta
        target.duration_frames -= eff_delta
        target.source_in_frame = max(0, target.source_in_frame + src_delta)
    else:
        min_delta = 1 - target.duration_frames
        max_delta = (
            next_clip.start_frame - orig_end if next_clip is not None else max(0, delta_frames)
        )
        eff_delta = max(min_delta, min(max_delta, delta_frames))
        if eff_delta == 0:
            return TimelineEditResult(
                changed=False,
                op="split_edit_jl",
                sync_locked_tracks=_count_sync_locked(doc),
                detail="Split-edit Out edge clamped at neighbor or min duration.",
                document=doc,
            )
        target.duration_frames += eff_delta

    updated_info = compute_av_split_info(next_doc, track_kind, track_index, clip_index)
    tag = (
        f"J-Cut {updated_info.in_offset_frames:+d}f"
        if updated_info.in_offset_frames != 0 and updated_info.out_offset_frames == 0
        else (
            f"L-Cut {updated_info.out_offset_frames:+d}f"
            if updated_info.out_offset_frames != 0 and updated_info.in_offset_frames == 0
            else (
                f"Split J:{updated_info.in_offset_frames:+d}f "
                f"L:{updated_info.out_offset_frames:+d}f"
            )
        )
    )
    return TimelineEditResult(
        changed=True,
        op="split_edit_jl",
        delta_applied=eff_delta,
        sync_locked_tracks=_count_sync_locked(next_doc),
        detail=f"{tag} ({t_kind.upper()} {edge} {eff_delta:+d}f)",
        document=next_doc,
    )


def align_av_split(
    doc: TimelineDocument,
    track_kind: Literal["video", "audio"],
    track_index: int,
    clip_index: int,
) -> TimelineEditResult:
    """Re-align a linked audio clip's In/Out boundaries flush with its linked video clip."""
    next_doc = doc.model_copy(deep=True)
    info = compute_av_split_info(next_doc, track_kind, track_index, clip_index)
    if (
        not info.linked
        or info.video_track_index is None
        or info.video_clip_index is None
        or info.audio_track_index is None
        or info.audio_clip_index is None
    ):
        return TimelineEditResult(
            changed=False,
            op="align_av_split",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Clip is not A/V linked.",
            document=doc,
        )
    if info.in_offset_frames == 0 and info.out_offset_frames == 0:
        return TimelineEditResult(
            changed=False,
            op="align_av_split",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="A/V pair is already aligned.",
            document=doc,
        )
    v_found = _find_track_and_clip(next_doc, "video", info.video_track_index, info.video_clip_index)
    a_found = _find_track_and_clip(next_doc, "audio", info.audio_track_index, info.audio_clip_index)
    if v_found is None or a_found is None:
        return TimelineEditResult(
            changed=False,
            op="align_av_split",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Linked clips not found.",
            document=doc,
        )
    _, v_clip = v_found
    a_trk, a_clip = a_found
    a_idx = info.audio_clip_index
    prev_a = a_trk.clips[a_idx - 1] if a_idx > 0 else None
    next_a = a_trk.clips[a_idx + 1] if a_idx + 1 < len(a_trk.clips) else None

    target_start = v_clip.start_frame
    target_end = v_clip.start_frame + v_clip.duration_frames
    if prev_a is not None:
        target_start = max(target_start, prev_a.start_frame + prev_a.duration_frames)
    target_start = max(next_doc.start_frame, target_start)
    if next_a is not None:
        target_end = min(target_end, next_a.start_frame)
    if target_end <= target_start:
        return TimelineEditResult(
            changed=False,
            op="align_av_split",
            sync_locked_tracks=_count_sync_locked(doc),
            detail="Cannot align A/V pair without overlapping adjacent audio clip.",
            document=doc,
        )

    start_shift = target_start - a_clip.start_frame
    src_shift = _compute_source_frame_delta(start_shift, a_clip.source_fps, next_doc.fps)
    a_clip.source_in_frame = max(0, a_clip.source_in_frame + src_shift)
    a_clip.start_frame = target_start
    a_clip.duration_frames = target_end - target_start
    return TimelineEditResult(
        changed=True,
        op="align_av_split",
        sync_locked_tracks=_count_sync_locked(next_doc),
        detail=f"Aligned {a_clip.name} to {v_clip.name} ({a_clip.start_frame}f..{target_end}f)",
        document=next_doc,
    )


def ripple_delete_clip(
    doc: TimelineDocument,
    track_kind: Literal["video", "audio"],
    track_index: int,
    clip_index: int,
    *,
    respect_av_link: bool = False,
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
    partner_info = _find_linked_partner_in_doc(next_doc, deleted) if respect_av_link else None
    del_start = deleted.start_frame
    del_dur = max(0, deleted.duration_frames)
    del_end = del_start + del_dur
    doc_start = next_doc.start_frame

    del trk.clips[clip_index]
    if partner_info is not None:
        p_trk, p_idx, _ = partner_info
        if p_trk is not trk and 0 <= p_idx < len(p_trk.clips):
            del p_trk.clips[p_idx]

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
    respect_av_link: bool = False,
    target_kind: Literal["video", "audio"] = "audio",
    partner_track_kind: Literal["video", "audio"] | None = None,
    partner_track_index: int | None = None,
    partner_clip_index: int | None = None,
) -> TimelineEditResult:
    """Dispatch a validated timeline edit operation by name."""
    if op == "ripple_trim":
        return ripple_trim_clip(
            doc,
            track_kind,
            track_index,
            clip_index,
            edge,
            delta_frames,
            respect_av_link=respect_av_link,
        )
    if op == "roll":
        return roll_edit_cut(doc, track_kind, track_index, clip_index, delta_frames)
    if op == "slip":
        return slip_clip(doc, track_kind, track_index, clip_index, delta_frames)
    if op == "slide":
        return slide_clip(doc, track_kind, track_index, clip_index, delta_frames)
    if op == "ripple_delete":
        return ripple_delete_clip(
            doc, track_kind, track_index, clip_index, respect_av_link=respect_av_link
        )
    if op == "toggle_sync_lock":
        return toggle_track_sync_lock(doc, track_kind, track_index)
    if op == "set_all_sync_lock":
        return set_all_tracks_sync_lock(doc, enabled)
    if op == "link_av":
        return link_av_clips(
            doc,
            track_kind,
            track_index,
            clip_index,
            partner_track_kind=partner_track_kind,
            partner_track_index=partner_track_index,
            partner_clip_index=partner_clip_index,
        )
    if op == "unlink_av":
        return unlink_av_clips(doc, track_kind, track_index, clip_index)
    if op == "split_edit_jl":
        return apply_split_edit_jl(
            doc,
            track_kind,
            track_index,
            clip_index,
            edge=edge,
            delta_frames=delta_frames,
            target_kind=target_kind,
        )
    if op == "align_av_split":
        return align_av_split(doc, track_kind, track_index, clip_index)
    raise ValueError(f"Unsupported timeline edit op: {op!r}")
