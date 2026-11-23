"""Multi-track Compound Clip, Nested Sub-Sequence Flatten, and AE Pre-Comp Editor engine."""

from __future__ import annotations

import re
from collections.abc import Sequence
from typing import Literal

from pydantic import BaseModel, Field

from taktcut.models import (
    ALLOWED_COMPOUND_COLOR_TAGS,
    ALLOWED_PRECOMP_BLEND_MODES,
    MAX_COMPOUND_NESTING_DEPTH,
    CompoundColorTag,
    CompoundSubSequence,
    PrecompBlendMode,
    RationalFrameRate,
    TimelineClip,
    TimelineDocument,
    TimelineMarker,
    TimelineTrack,
    conform_source_frames,
)

CompoundOpKind = Literal[
    "create_compound",
    "decompose_compound",
    "update_compound",
    "flatten_all",
]

ALLOWED_COMPOUND_OPS: tuple[str, ...] = (
    "create",
    "decompose",
    "update",
    "flatten_all",
    "compile",
)


class CompoundClipRef(BaseModel):
    """Reference to a specific clip slot inside a TimelineDocument."""

    track_kind: Literal["video", "audio"] = "video"
    track_index: int = Field(ge=1)
    clip_index: int = Field(ge=0)


class CompoundOpResult(BaseModel):
    """Structured immutable result of a Compound Clip / Pre-Comp operation."""

    changed: bool
    op: CompoundOpKind
    compound_id: str = ""
    track_kind: Literal["video", "audio"] = "video"
    track_index: int = Field(default=1, ge=1)
    clip_index: int = Field(default=0, ge=0)
    nested_clip_count: int = Field(default=0, ge=0)
    nested_track_count: int = Field(default=0, ge=0)
    max_depth: int = Field(default=0, ge=0)
    detail: str = ""
    document: TimelineDocument


class CompoundCompileResult(BaseModel):
    """Compiled FFmpeg filter_complex graph for a multi-track Pre-Comp / Compound Clip."""

    compound_id: str
    name: str
    duration_s: float = Field(ge=0.0)
    video_track_count: int = Field(ge=0)
    audio_track_count: int = Field(ge=0)
    total_nested_clips: int = Field(ge=0)
    precomp_blend_mode: PrecompBlendMode = "normal"
    collapse_transforms: bool = True
    filter_complex: str
    video_map_label: str | None = None
    audio_map_label: str | None = None
    warnings: list[str] = Field(default_factory=list)


def _slugify_compound_id(raw: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "_", raw.strip().lower()).strip("_")
    return cleaned[:48] if cleaned else "compound_clip"


def _clamp_gain_db(val: float) -> float:
    return max(-24.0, min(12.0, round(val, 2)))


def _compute_subsequence_depth(sub: CompoundSubSequence) -> int:
    max_child = 0
    for trk in sub.tracks:
        for clip in trk.clips:
            d = compute_compound_depth(clip)
            if d > max_child:
                max_child = d
    return 1 + max_child


def compute_compound_depth(clip: TimelineClip) -> int:
    """Return nesting depth of a clip (0 for normal clip, 1+ for Compound Clip)."""
    if clip.compound_subsequence is None:
        return 0
    return _compute_subsequence_depth(clip.compound_subsequence)


def compute_document_compound_depth(doc: TimelineDocument) -> int:
    """Return maximum Compound Clip nesting depth across all tracks in a document."""
    max_depth = 0
    for trk in doc.tracks:
        for clip in trk.clips:
            d = compute_compound_depth(clip)
            if d > max_depth:
                max_depth = d
    return max_depth


def count_compound_clips(doc: TimelineDocument) -> int:
    """Count top-level Compound Clips present in a TimelineDocument."""
    total = 0
    for trk in doc.tracks:
        for clip in trk.clips:
            if clip.compound_subsequence is not None:
                total += 1
    return total


def _next_compound_name_and_id(
    doc: TimelineDocument, requested_name: str | None
) -> tuple[str, str]:
    existing_ids: set[str] = set()
    existing_count = 0
    for trk in doc.tracks:
        for clip in trk.clips:
            if clip.compound_subsequence is not None:
                existing_count += 1
                existing_ids.add(clip.compound_subsequence.id)

    base_name = (
        requested_name.strip()
        if isinstance(requested_name, str) and requested_name.strip()
        else ""
    )
    if not base_name:
        base_name = f"Compound Clip {existing_count + 1}"
    base_name = base_name[:120]

    base_id = _slugify_compound_id(base_name)
    cand_id = base_id
    suffix = 2
    while cand_id in existing_ids:
        cand_id = f"{base_id}_{suffix}"
        suffix += 1
    return base_name, cand_id


def _clips_overlap_range(clips: Sequence[TimelineClip], start_frame: int, end_frame: int) -> bool:
    for c in clips:
        if c.duration_frames <= 0:
            continue
        if c.start_frame < end_frame and c.end_frame_exclusive > start_frame:
            return True
    return False


def _find_or_create_free_track(
    doc: TimelineDocument,
    kind: Literal["video", "audio"],
    preferred_index: int,
    start_frame: int,
    end_frame: int,
) -> TimelineTrack:
    same_kind = sorted(
        (t for t in doc.tracks if t.kind == kind),
        key=lambda t: t.index,
    )
    for trk in same_kind:
        if trk.index == preferred_index and not _clips_overlap_range(
            trk.clips, start_frame, end_frame
        ):
            return trk
    for trk in same_kind:
        if trk.index >= preferred_index and not _clips_overlap_range(
            trk.clips, start_frame, end_frame
        ):
            return trk
    for trk in same_kind:
        if not _clips_overlap_range(trk.clips, start_frame, end_frame):
            return trk

    next_index = max((t.index for t in same_kind), default=0) + 1
    prefix = "V" if kind == "video" else "A"
    new_track = TimelineTrack(
        index=next_index,
        kind=kind,
        name=f"{prefix}{next_index}",
        clips=[],
    )
    doc.tracks.append(new_track)
    return new_track


def _sort_tracks_canonical(doc: TimelineDocument) -> None:
    for trk in doc.tracks:
        trk.clips.sort(key=lambda c: (c.start_frame, c.duration_frames, c.name))
    doc.tracks.sort(key=lambda t: (0 if t.kind == "video" else 1, t.index))


def _slice_clip_to_window(
    clip: TimelineClip,
    win_start: int,
    win_end: int,
    timeline_fps: RationalFrameRate,
) -> tuple[TimelineClip | None, TimelineClip | None, TimelineClip | None]:
    """Split clip against [win_start, win_end) into (left, mid, right)."""
    c_start = clip.start_frame
    c_end = clip.end_frame_exclusive
    ov_start = max(c_start, win_start)
    ov_end = min(c_end, win_end)
    if ov_end <= ov_start:
        return clip.model_copy(deep=True), None, None

    left_keep: TimelineClip | None = None
    if ov_start > c_start:
        left_keep = clip.model_copy(deep=True)
        left_keep.duration_frames = ov_start - c_start

    mid_offset = ov_start - c_start
    mid_src_delta = (
        conform_source_frames(mid_offset, clip.source_fps, timeline_fps)
        if clip.source_fps is not None and clip.source_fps.fraction != timeline_fps.fraction
        else mid_offset
    )
    middle = clip.model_copy(deep=True)
    middle.start_frame = ov_start
    middle.duration_frames = ov_end - ov_start
    middle.source_in_frame = max(0, clip.source_in_frame + mid_src_delta)

    right_keep: TimelineClip | None = None
    if c_end > ov_end:
        right_offset = ov_end - c_start
        right_src_delta = (
            conform_source_frames(right_offset, clip.source_fps, timeline_fps)
            if clip.source_fps is not None and clip.source_fps.fraction != timeline_fps.fraction
            else right_offset
        )
        right_keep = clip.model_copy(deep=True)
        right_keep.start_frame = ov_end
        right_keep.duration_frames = c_end - ov_end
        right_keep.source_in_frame = max(0, clip.source_in_frame + right_src_delta)

    return left_keep, middle, right_keep


def _build_subsequence_from_collected(
    *,
    comp_id: str,
    comp_name: str,
    fps: RationalFrameRate,
    width: int,
    height: int,
    range_start: int,
    range_end: int,
    collected_tracks: Sequence[tuple[Literal["video", "audio"], int, str, list[TimelineClip]]],
    markers: Sequence[TimelineMarker],
    precomp_blend_mode: PrecompBlendMode,
    collapse_transforms: bool,
    color_tag: CompoundColorTag,
) -> CompoundSubSequence:
    nested_tracks: list[TimelineTrack] = []
    vid_idx = 0
    aud_idx = 0
    for kind, _orig_idx, orig_name, raw_clips in sorted(
        collected_tracks,
        key=lambda item: (0 if item[0] == "video" else 1, item[1]),
    ):
        if not raw_clips:
            continue
        if kind == "video":
            vid_idx += 1
            new_idx = vid_idx
        else:
            aud_idx += 1
            new_idx = aud_idx
        shifted_clips: list[TimelineClip] = []
        for c in raw_clips:
            c_copy = c.model_copy(deep=True)
            c_copy.start_frame = max(0, c.start_frame - range_start)
            c_copy.track_index = new_idx
            shifted_clips.append(c_copy)
        shifted_clips.sort(key=lambda item: (item.start_frame, item.duration_frames))
        prefix = "V" if kind == "video" else "A"
        nested_tracks.append(
            TimelineTrack(
                index=new_idx,
                kind=kind,
                name=orig_name or f"{prefix}{new_idx}",
                clips=shifted_clips,
            )
        )

    duration_frames = max(1, range_end - range_start)
    nested_markers: list[TimelineMarker] = []
    for mk in markers:
        mk_copy = mk.model_copy(deep=True)
        mk_copy.frame = max(0, mk.frame - range_start)
        nested_markers.append(mk_copy)

    return CompoundSubSequence(
        id=comp_id,
        name=comp_name,
        fps=fps.model_copy(deep=True),
        width=width,
        height=height,
        duration_frames=duration_frames,
        tracks=nested_tracks,
        markers=nested_markers,
        precomp_blend_mode=precomp_blend_mode,
        collapse_transforms=collapse_transforms,
        color_tag=color_tag,
    )


def create_compound_clip(
    doc: TimelineDocument,
    *,
    target_clips: Sequence[CompoundClipRef] | None = None,
    in_frame: int | None = None,
    out_frame: int | None = None,
    name: str | None = None,
    include_audio: bool = True,
    precomp_blend_mode: PrecompBlendMode = "normal",
    collapse_transforms: bool = True,
    color_tag: CompoundColorTag = "amber",
) -> CompoundOpResult:
    """Nest selected clips or an In/Out multi-track range into a Compound Clip / Pre-Comp."""
    if precomp_blend_mode not in ALLOWED_PRECOMP_BLEND_MODES:
        raise ValueError(f"Unsupported precomp_blend_mode: {precomp_blend_mode!r}")
    if color_tag not in ALLOWED_COMPOUND_COLOR_TAGS:
        raise ValueError(f"Unsupported color_tag: {color_tag!r}")

    next_doc = doc.model_copy(deep=True)
    comp_name, comp_id = _next_compound_name_and_id(next_doc, name)

    use_range = in_frame is not None and out_frame is not None
    if use_range:
        assert in_frame is not None and out_frame is not None
        if in_frame < 0 or out_frame <= in_frame:
            raise ValueError(
                f"Invalid compound range [{in_frame}, {out_frame}); "
                "expected 0 <= in_frame < out_frame"
            )
        collected: list[tuple[Literal["video", "audio"], int, str, list[TimelineClip]]] = []
        total_nested = 0
        max_child_depth = 0
        anchor_kind: Literal["video", "audio"] = "video"
        anchor_index: int | None = None

        for trk in next_doc.tracks:
            if not include_audio and trk.kind == "audio":
                continue
            remaining: list[TimelineClip] = []
            extracted: list[TimelineClip] = []
            for clip in trk.clips:
                if clip.duration_frames <= 0:
                    remaining.append(clip)
                    continue
                if clip.start_frame < out_frame and clip.end_frame_exclusive > in_frame:
                    child_depth = compute_compound_depth(clip)
                    if child_depth > max_child_depth:
                        max_child_depth = child_depth
                    left_k, mid_ex, right_k = _slice_clip_to_window(
                        clip, in_frame, out_frame, next_doc.fps
                    )
                    if left_k is not None:
                        remaining.append(left_k)
                    if mid_ex is not None:
                        extracted.append(mid_ex)
                        total_nested += 1
                    if right_k is not None:
                        remaining.append(right_k)
                else:
                    remaining.append(clip)
            trk.clips = remaining
            if extracted:
                collected.append((trk.kind, trk.index, trk.name, extracted))
                if trk.kind == "video" and (anchor_index is None or trk.index < anchor_index):
                    anchor_kind = "video"
                    anchor_index = trk.index
                elif trk.kind == "audio" and anchor_index is None:
                    anchor_kind = "audio"
                    anchor_index = trk.index

        if total_nested == 0:
            return CompoundOpResult(
                changed=False,
                op="create_compound",
                detail="No clips overlap the selected In/Out range.",
                document=doc.model_copy(deep=True),
            )
        if 1 + max_child_depth > MAX_COMPOUND_NESTING_DEPTH:
            raise ValueError(
                f"Compound nesting depth exceeds maximum ({MAX_COMPOUND_NESTING_DEPTH})"
            )

        extracted_markers: list[TimelineMarker] = []
        kept_markers: list[TimelineMarker] = []
        for mk in next_doc.markers:
            if in_frame <= mk.frame < out_frame:
                extracted_markers.append(mk)
            else:
                kept_markers.append(mk)
        next_doc.markers = kept_markers

        sub = _build_subsequence_from_collected(
            comp_id=comp_id,
            comp_name=comp_name,
            fps=next_doc.fps,
            width=next_doc.width,
            height=next_doc.height,
            range_start=in_frame,
            range_end=out_frame,
            collected_tracks=collected,
            markers=extracted_markers,
            precomp_blend_mode=precomp_blend_mode,
            collapse_transforms=collapse_transforms,
            color_tag=color_tag,
        )
        range_start = in_frame
        range_end = out_frame
        preferred_idx = anchor_index if anchor_index is not None else 1
    else:
        refs = list(target_clips or ())
        if not refs:
            return CompoundOpResult(
                changed=False,
                op="create_compound",
                detail="Select at least one clip or set an In/Out range to create a Compound Clip.",
                document=doc.model_copy(deep=True),
            )
        selected_map: dict[tuple[Literal["video", "audio"], int], set[int]] = {}
        for ref in refs:
            selected_map.setdefault((ref.track_kind, ref.track_index), set()).add(ref.clip_index)

        picked_clips: list[tuple[TimelineTrack, TimelineClip]] = []
        max_child_depth = 0
        for trk in next_doc.tracks:
            idxs = selected_map.get((trk.kind, trk.index))
            if not idxs:
                continue
            for c_idx in sorted(idxs):
                if 0 <= c_idx < len(trk.clips):
                    clip = trk.clips[c_idx]
                    if clip.duration_frames > 0:
                        picked_clips.append((trk, clip))
                        d = compute_compound_depth(clip)
                        if d > max_child_depth:
                            max_child_depth = d

        if not picked_clips:
            return CompoundOpResult(
                changed=False,
                op="create_compound",
                detail="No valid non-empty clips matched selection.",
                document=doc.model_copy(deep=True),
            )
        if 1 + max_child_depth > MAX_COMPOUND_NESTING_DEPTH:
            raise ValueError(
                f"Compound nesting depth exceeds maximum ({MAX_COMPOUND_NESTING_DEPTH})"
            )

        range_start = min(c.start_frame for _, c in picked_clips)
        range_end = max(c.end_frame_exclusive for _, c in picked_clips)
        anchor_kind = "video" if any(t.kind == "video" for t, _ in picked_clips) else "audio"
        preferred_idx = min(
            t.index for t, _ in picked_clips if t.kind == anchor_kind
        )

        collected = []
        total_nested = 0
        for trk in next_doc.tracks:
            idxs = selected_map.get((trk.kind, trk.index))
            if not idxs:
                continue
            extracted = []
            remaining = []
            for idx, clip in enumerate(trk.clips):
                if idx in idxs and clip.duration_frames > 0:
                    extracted.append(clip)
                    total_nested += 1
                else:
                    remaining.append(clip)
            trk.clips = remaining
            if extracted:
                collected.append((trk.kind, trk.index, trk.name, extracted))

        sub = _build_subsequence_from_collected(
            comp_id=comp_id,
            comp_name=comp_name,
            fps=next_doc.fps,
            width=next_doc.width,
            height=next_doc.height,
            range_start=range_start,
            range_end=range_end,
            collected_tracks=collected,
            markers=[],
            precomp_blend_mode=precomp_blend_mode,
            collapse_transforms=collapse_transforms,
            color_tag=color_tag,
        )

    target_track = _find_or_create_free_track(
        next_doc,
        anchor_kind,
        preferred_idx,
        range_start,
        range_end,
    )
    comp_clip = TimelineClip(
        name=comp_name,
        track_index=target_track.index,
        media_type=anchor_kind,
        start_frame=range_start,
        duration_frames=sub.duration_frames,
        source_in_frame=0,
        source_path=f"compound://{comp_id}",
        media_ref=comp_id,
        source_fps=next_doc.fps.model_copy(deep=True),
        enabled=True,
        compound_subsequence=sub,
    )
    target_track.clips.append(comp_clip)
    _sort_tracks_canonical(next_doc)
    new_clip_idx = target_track.clips.index(comp_clip)

    return CompoundOpResult(
        changed=True,
        op="create_compound",
        compound_id=comp_id,
        track_kind=anchor_kind,
        track_index=target_track.index,
        clip_index=new_clip_idx,
        nested_clip_count=total_nested,
        nested_track_count=len(sub.tracks),
        max_depth=compute_document_compound_depth(next_doc),
        detail=f"Created Compound Clip '{comp_name}' ({len(sub.tracks)}T / {total_nested}C).",
        document=next_doc,
    )


def decompose_compound_clip(
    doc: TimelineDocument,
    *,
    track_kind: Literal["video", "audio"] = "video",
    track_index: int = 1,
    clip_index: int = 0,
) -> CompoundOpResult:
    """Flatten / Decompose in Place a Compound Clip back onto parent timeline tracks."""
    next_doc = doc.model_copy(deep=True)
    target_track: TimelineTrack | None = None
    for trk in next_doc.tracks:
        if trk.kind == track_kind and trk.index == track_index:
            target_track = trk
            break
    if target_track is None or not (0 <= clip_index < len(target_track.clips)):
        return CompoundOpResult(
            changed=False,
            op="decompose_compound",
            detail="Selected clip slot was not found.",
            document=doc.model_copy(deep=True),
        )

    comp_clip = target_track.clips[clip_index]
    sub = comp_clip.compound_subsequence
    if sub is None:
        return CompoundOpResult(
            changed=False,
            op="decompose_compound",
            detail="Selected clip is not a Compound Clip.",
            document=doc.model_copy(deep=True),
        )

    comp_id = sub.id
    comp_name = sub.name
    # Remove shell first so its own slot on target_track becomes available for nested V1/A1!
    target_track.clips.pop(clip_index)

    vis_start = max(0, comp_clip.source_in_frame)
    vis_span = max(1, round(comp_clip.duration_frames * comp_clip.speed_rate))
    vis_end = vis_start + vis_span

    unpacked_count = 0
    first_placed: tuple[Literal["video", "audio"], int, TimelineClip] | None = None

    for n_trk in sorted(sub.tracks, key=lambda t: (0 if t.kind == "video" else 1, t.index)):
        for n_clip in n_trk.clips:
            if n_clip.duration_frames <= 0:
                continue
            ov_start = max(n_clip.start_frame, vis_start)
            ov_end = min(n_clip.end_frame_exclusive, vis_end)
            if ov_end <= ov_start:
                continue

            left_trim = ov_start - n_clip.start_frame
            src_delta = (
                conform_source_frames(left_trim, n_clip.source_fps, sub.fps)
                if n_clip.source_fps is not None and n_clip.source_fps.fraction != sub.fps.fraction
                else left_trim
            )
            parent_start = comp_clip.start_frame + round(
                (ov_start - vis_start) / comp_clip.speed_rate
            )
            parent_dur = max(1, round((ov_end - ov_start) / comp_clip.speed_rate))
            parent_end = parent_start + parent_dur

            preferred_tidx = (
                target_track.index
                if n_trk.kind == target_track.kind and n_trk.index == 1
                else n_trk.index
            )
            dest_track = _find_or_create_free_track(
                next_doc,
                n_trk.kind,
                preferred_tidx,
                parent_start,
                parent_end,
            )

            placed = n_clip.model_copy(deep=True)
            placed.track_index = dest_track.index
            placed.start_frame = parent_start
            placed.duration_frames = parent_dur
            placed.source_in_frame = max(0, n_clip.source_in_frame + src_delta)
            placed.enabled = n_clip.enabled and comp_clip.enabled
            placed.audio_gain_db = _clamp_gain_db(
                n_clip.audio_gain_db + comp_clip.audio_gain_db
            )
            if comp_clip.speed_rate != 1.0:
                placed.speed_rate = max(
                    0.1,
                    min(16.0, round(n_clip.speed_rate * comp_clip.speed_rate, 4)),
                )

            dest_track.clips.append(placed)
            unpacked_count += 1
            if first_placed is None:
                first_placed = (dest_track.kind, dest_track.index, placed)

    for mk in sub.markers:
        if vis_start <= mk.frame < vis_end:
            mk_copy = mk.model_copy(deep=True)
            mk_copy.frame = comp_clip.start_frame + round(
                (mk.frame - vis_start) / comp_clip.speed_rate
            )
            next_doc.markers.append(mk_copy)

    _sort_tracks_canonical(next_doc)
    next_doc.markers.sort(key=lambda m: (m.frame, m.name))

    out_kind: Literal["video", "audio"] = track_kind
    out_tidx = track_index
    out_cidx = 0
    if first_placed is not None:
        out_kind, out_tidx, first_clip_ref = first_placed
        for trk in next_doc.tracks:
            if trk.kind == out_kind and trk.index == out_tidx and first_clip_ref in trk.clips:
                out_cidx = trk.clips.index(first_clip_ref)
                break

    return CompoundOpResult(
        changed=True,
        op="decompose_compound",
        compound_id=comp_id,
        track_kind=out_kind,
        track_index=out_tidx,
        clip_index=out_cidx,
        nested_clip_count=unpacked_count,
        nested_track_count=len(sub.tracks),
        max_depth=compute_document_compound_depth(next_doc),
        detail=f"Decomposed '{comp_name}' into {unpacked_count} clip(s).",
        document=next_doc,
    )


def compound_to_timeline_document(
    clip: TimelineClip,
    fallback_fps: RationalFrameRate,
) -> TimelineDocument:
    """Convert a Compound Clip's subsequence into an editable TimelineDocument."""
    sub = clip.compound_subsequence
    if sub is None:
        raise ValueError("Clip does not contain a CompoundSubSequence")
    return TimelineDocument(
        name=sub.name,
        source_format="drt",
        fps=sub.fps.model_copy(deep=True) if sub.fps else fallback_fps.model_copy(deep=True),
        width=sub.width,
        height=sub.height,
        start_frame=0,
        tracks=[t.model_copy(deep=True) for t in sub.tracks],
        markers=[m.model_copy(deep=True) for m in sub.markers],
    )


def update_compound_subsequence(
    doc: TimelineDocument,
    *,
    track_kind: Literal["video", "audio"] = "video",
    track_index: int = 1,
    clip_index: int = 0,
    sub_doc: TimelineDocument | CompoundSubSequence | None = None,
    precomp_blend_mode: PrecompBlendMode | None = None,
    collapse_transforms: bool | None = None,
    color_tag: CompoundColorTag | None = None,
    name: str | None = None,
) -> CompoundOpResult:
    """Commit Pre-Comp Editor edits back onto the parent TimelineClip's CompoundSubSequence."""
    next_doc = doc.model_copy(deep=True)
    target_track: TimelineTrack | None = None
    for trk in next_doc.tracks:
        if trk.kind == track_kind and trk.index == track_index:
            target_track = trk
            break
    if target_track is None or not (0 <= clip_index < len(target_track.clips)):
        return CompoundOpResult(
            changed=False,
            op="update_compound",
            detail="Target Compound Clip slot not found.",
            document=doc.model_copy(deep=True),
        )

    comp_clip = target_track.clips[clip_index]
    if comp_clip.compound_subsequence is None:
        return CompoundOpResult(
            changed=False,
            op="update_compound",
            detail="Target clip is not a Compound Clip.",
            document=doc.model_copy(deep=True),
        )

    sub = comp_clip.compound_subsequence.model_copy(deep=True)
    if sub_doc is not None:
        if isinstance(sub_doc, CompoundSubSequence):
            sub = sub_doc.model_copy(deep=True)
        else:
            max_end = 1
            for trk in sub_doc.tracks:
                for c in trk.clips:
                    if c.end_frame_exclusive > max_end:
                        max_end = c.end_frame_exclusive
            sub.tracks = [t.model_copy(deep=True) for t in sub_doc.tracks]
            sub.markers = [m.model_copy(deep=True) for m in sub_doc.markers]
            sub.duration_frames = max(1, max_end)
            if sub_doc.name.strip():
                sub.name = sub_doc.name.strip()[:120]

    if precomp_blend_mode is not None:
        if precomp_blend_mode not in ALLOWED_PRECOMP_BLEND_MODES:
            raise ValueError(f"Unsupported precomp_blend_mode: {precomp_blend_mode!r}")
        sub.precomp_blend_mode = precomp_blend_mode
    if collapse_transforms is not None:
        sub.collapse_transforms = collapse_transforms
    if color_tag is not None:
        if color_tag not in ALLOWED_COMPOUND_COLOR_TAGS:
            raise ValueError(f"Unsupported color_tag: {color_tag!r}")
        sub.color_tag = color_tag
    if isinstance(name, str) and name.strip():
        sub.name = name.strip()[:120]

    comp_clip.compound_subsequence = sub
    comp_clip.name = sub.name
    # Check nesting depth on entire doc after update
    depth = compute_document_compound_depth(next_doc)
    if depth > MAX_COMPOUND_NESTING_DEPTH:
        raise ValueError(
            f"Compound nesting depth ({depth}) exceeds maximum ({MAX_COMPOUND_NESTING_DEPTH})"
        )

    nested_clips = sum(len(t.clips) for t in sub.tracks)
    return CompoundOpResult(
        changed=True,
        op="update_compound",
        compound_id=sub.id,
        track_kind=track_kind,
        track_index=track_index,
        clip_index=clip_index,
        nested_clip_count=nested_clips,
        nested_track_count=len(sub.tracks),
        max_depth=depth,
        detail=f"Updated Pre-Comp '{sub.name}' ({len(sub.tracks)}T / {nested_clips}C).",
        document=next_doc,
    )


def flatten_all_compounds(doc: TimelineDocument) -> CompoundOpResult:
    """Recursively decompose every Compound Clip in a TimelineDocument."""
    working = doc.model_copy(deep=True)
    flattened = 0
    guard = 0
    while guard < 128:
        guard += 1
        found_slot: tuple[Literal["video", "audio"], int, int] | None = None
        for trk in working.tracks:
            for idx, clip in enumerate(trk.clips):
                if clip.compound_subsequence is not None:
                    found_slot = (trk.kind, trk.index, idx)
                    break
            if found_slot is not None:
                break
        if found_slot is None:
            break
        res = decompose_compound_clip(
            working,
            track_kind=found_slot[0],
            track_index=found_slot[1],
            clip_index=found_slot[2],
        )
        if not res.changed:
            break
        working = res.document
        flattened += 1

    total_clips = sum(len(t.clips) for t in working.tracks)
    return CompoundOpResult(
        changed=flattened > 0,
        op="flatten_all",
        nested_clip_count=total_clips,
        nested_track_count=len(working.tracks),
        max_depth=compute_document_compound_depth(working),
        detail=(
            f"Flattened {flattened} Compound Clip(s) into {len(working.tracks)} track(s)."
            if flattened > 0
            else "No Compound Clips present in timeline."
        ),
        document=working,
    )


def compile_compound_filtergraph(
    sub: CompoundSubSequence,
    *,
    speed_rate: float = 1.0,
    master_gain_db: float = 0.0,
) -> CompoundCompileResult:
    """Compile a multi-track CompoundSubSequence into an FFmpeg -filter_complex graph."""
    if speed_rate <= 0.0:
        raise ValueError(f"speed_rate must be positive, got {speed_rate}")
    fps_val = sub.fps.as_float
    dur_s = round((sub.duration_frames / fps_val) / speed_rate, 3)
    width = sub.width if sub.width > 0 else 1920
    height = sub.height if sub.height > 0 else 1080

    video_tracks = sorted(
        (t for t in sub.tracks if t.kind == "video" and not t.muted),
        key=lambda t: t.index,
    )
    audio_tracks = sorted(
        (t for t in sub.tracks if t.kind == "audio" and not t.muted),
        key=lambda t: t.index,
    )

    stages: list[str] = []
    warnings: list[str] = []
    total_nested_clips = sum(len(t.clips) for t in sub.tracks)

    # Base black canvas for deterministic multi-layer compositing
    video_label: str | None = None
    if video_tracks:
        base_tag = "cmp_base"
        stages.append(
            f"color=c=black:s={width}x{height}:r={sub.fps.ffmpeg_rate}:d={dur_s:.3f}[{base_tag}]"
        )
        current_v = base_tag
        v_input_idx = 0
        layer_idx = 0
        for trk in video_tracks:
            for clip in trk.clips:
                if not clip.enabled or clip.duration_frames <= 0:
                    continue
                t0 = round((clip.start_frame / fps_val) / speed_rate, 3)
                t1 = round((clip.end_frame_exclusive / fps_val) / speed_rate, 3)
                in_s = round(clip.source_in_frame / fps_val, 3)
                src_dur = round((clip.duration_frames / fps_val) / speed_rate, 3)
                prep_tag = f"cmp_v{layer_idx}"
                if clip.compound_subsequence is not None:
                    warnings.append(
                        f"Nested sub-comp '{clip.name}' flattened at compositing stage {layer_idx}"
                    )
                scale_chain = (
                    f"[{v_input_idx}:v]trim=start={in_s:.3f}:duration={src_dur:.3f},"
                    f"setpts=PTS-STARTPTS+{t0:.3f}/TB,"
                    f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
                    f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2[{prep_tag}]"
                )
                stages.append(scale_chain)

                out_tag = f"cmp_comp{layer_idx}"
                if sub.precomp_blend_mode == "normal" or layer_idx == 0:
                    stages.append(
                        f"[{current_v}][{prep_tag}]overlay=x=0:y=0:eof_action=pass:"
                        f"enable='between(t,{t0:.3f},{t1:.3f})'[{out_tag}]"
                    )
                else:
                    stages.append(
                        f"[{current_v}][{prep_tag}]blend=all_mode={sub.precomp_blend_mode}:"
                        f"all_opacity=1.0:enable='between(t,{t0:.3f},{t1:.3f})'[{out_tag}]"
                    )
                current_v = out_tag
                v_input_idx += 1
                layer_idx += 1

        if layer_idx > 0:
            if not sub.collapse_transforms:
                raster_tag = "cmp_raster"
                stages.append(f"[{current_v}]format=yuv420p[{raster_tag}]")
                current_v = raster_tag
            video_label = f"[{current_v}]"
        else:
            video_label = f"[{base_tag}]"

    audio_label: str | None = None
    audio_buses: list[str] = []
    a_idx = 0
    for trk in audio_tracks:
        for clip in trk.clips:
            if not clip.enabled or clip.duration_frames <= 0:
                continue
            in_s = round(clip.source_in_frame / fps_val, 3)
            src_dur = round((clip.duration_frames / fps_val) / speed_rate, 3)
            delay_ms = max(0, round(((clip.start_frame / fps_val) / speed_rate) * 1000))
            eff_gain = _clamp_gain_db(clip.audio_gain_db + trk.volume_db + master_gain_db)
            bus_tag = f"cmp_a{a_idx}"
            stages.append(
                f"[{a_idx}:a]atrim=start={in_s:.3f}:duration={src_dur:.3f},"
                f"asetpts=PTS-STARTPTS,volume={eff_gain:.2f}dB,"
                f"adelay={delay_ms}|{delay_ms}[{bus_tag}]"
            )
            audio_buses.append(f"[{bus_tag}]")
            a_idx += 1

    if len(audio_buses) == 1:
        audio_label = audio_buses[0]
    elif len(audio_buses) > 1:
        joined = "".join(audio_buses)
        stages.append(f"{joined}amix=inputs={len(audio_buses)}:normalize=0[cmp_amix]")
        audio_label = "[cmp_amix]"

    filter_complex = ";".join(stages)
    return CompoundCompileResult(
        compound_id=sub.id,
        name=sub.name,
        duration_s=dur_s,
        video_track_count=len(video_tracks),
        audio_track_count=len(audio_tracks),
        total_nested_clips=total_nested_clips,
        precomp_blend_mode=sub.precomp_blend_mode,
        collapse_transforms=sub.collapse_transforms,
        filter_complex=filter_complex,
        video_map_label=video_label,
        audio_map_label=audio_label,
        warnings=warnings,
    )
