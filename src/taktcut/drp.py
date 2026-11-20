"""Clean-room defusedxml parser for .drp, .drt, .fcpxml, and OpenTimelineIO."""

from __future__ import annotations

import io
import zipfile
from fractions import Fraction
from pathlib import Path
from typing import Literal
from xml.etree.ElementTree import Element

import defusedxml.ElementTree as DefusedET
import opentimelineio as otio

from taktcut.models import (
    GapIssue,
    RationalFrameRate,
    TimelineClip,
    TimelineDocument,
    TimelineMarker,
    TimelineTrack,
    TimelineValidationResult,
    seconds_to_rational_frames,
)

MAX_ARCHIVE_BYTES = 128 * 1024 * 1024  # 128 MiB uncompressed guard against zip bombs


def _parse_xml_bytes(raw: bytes) -> Element:
    """Parse XML strictly via defusedxml (blocks DTD, external entities, entity expansion)."""
    return DefusedET.fromstring(raw)


def _parse_fcpxml_time(raw: str | None) -> Fraction:
    """Parse FCPXML rational time like '1001/24000s', '12s', or '0s' into exact Fraction seconds."""
    if not raw:
        return Fraction(0)
    text = raw.strip()
    if text.endswith("s"):
        text = text[:-1]
    if "/" in text:
        num_s, den_s = text.split("/", 1)
        return Fraction(int(num_s), int(den_s))
    return Fraction(text)


def _parse_int_or_frame_prefix(raw: str | None, default: int = 0) -> int:
    """Parse integer frame counts or 'N|hexfraction' strings safely."""
    if not raw:
        return default
    text = raw.strip()
    if "|" in text:
        text = text.split("|", 1)[0]
    try:
        return int(text)
    except ValueError:
        return default


def _first_text(elem: Element, *tags: str) -> str:
    for tag in tags:
        found = elem.find(f".//{tag}")
        if found is not None and found.text:
            return found.text.strip()
    return ""


def _read_zip_xml_entries(path: Path) -> dict[str, bytes]:
    """Read XML entries from a .drp/.drt ZIP archive safely into memory."""
    entries: dict[str, bytes] = {}
    total_read = 0
    with zipfile.ZipFile(path, "r") as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            normalized = info.filename.replace("\\", "/")
            if normalized.startswith("/") or ".." in normalized.split("/"):
                raise ValueError(f"Unsafe archive path detected: {info.filename}")
            if not normalized.lower().endswith(".xml"):
                continue
            total_read += info.file_size
            if total_read > MAX_ARCHIVE_BYTES:
                raise ValueError("Archive exceeds clean-room uncompressed XML limit")
            entries[normalized] = zf.read(info.filename)
    return entries


def _extract_resolve_sequence(
    seq_root: Element,
    name: str,
    source_format: Literal["drp", "drt"],
    default_fps: RationalFrameRate,
) -> TimelineDocument:
    """Extract normalized tracks, clips, and markers from a clean-room Resolve XML sequence."""
    fps_text = _first_text(seq_root, "FrameRate", "TimelineFrameRate", "fps")
    fps = (
        RationalFrameRate.from_str(fps_text)
        if fps_text
        else default_fps
    )
    width_s = _first_text(seq_root, "Width", "FormatWidth")
    height_s = _first_text(seq_root, "Height", "FormatHeight")
    width = int(width_s) if width_s.isdigit() else 1920
    height = int(height_s) if height_s.isdigit() else 1080
    start_frame = _parse_int_or_frame_prefix(_first_text(seq_root, "StartFrame", "Start"), 0)

    tracks: list[TimelineTrack] = []
    markers: list[TimelineMarker] = []
    lut_refs: list[str] = []

    for elem in seq_root.iter():
        if elem.text and ".cube" in elem.text.lower():
            candidate = elem.text.strip()
            if candidate not in lut_refs:
                lut_refs.append(candidate)

    def _collect_track_group(
        container_tags: tuple[str, ...],
        track_tags: tuple[str, ...],
        kind: Literal["video", "audio"],
    ) -> None:
        track_elems: list[Element] = []
        for ctag in container_tags:
            for container in seq_root.findall(f".//{ctag}"):
                for ttag in track_tags:
                    track_elems.extend(container.findall(ttag))
        if not track_elems:
            for ttag in track_tags:
                track_elems.extend(seq_root.findall(f".//{ttag}"))

        for idx_counter, track_el in enumerate(track_elems, start=1):
            idx_attr = track_el.attrib.get("index") or _first_text(track_el, "Index", "TrackIndex")
            track_idx = int(idx_attr) if idx_attr and idx_attr.isdigit() else idx_counter
            track_name = track_el.attrib.get("name") or _first_text(track_el, "Name")
            if not track_name:
                prefix = "V" if kind == "video" else "A"
                track_name = f"{prefix}{track_idx}"

            clips: list[TimelineClip] = []
            clip_tags = (
                ("Sm2TiVideoClip", "Clip")
                if kind == "video"
                else ("Sm2TiAudioClip", "Clip")
            )
            for clip_tag in clip_tags:
                for clip_el in track_el.findall(f".//{clip_tag}"):
                    clip_name = (
                        clip_el.attrib.get("name")
                        or _first_text(clip_el, "Name", "ClipName")
                        or "untitled"
                    )
                    c_start = _parse_int_or_frame_prefix(
                        clip_el.attrib.get("start") or _first_text(clip_el, "Start"),
                        0,
                    )
                    c_dur = _parse_int_or_frame_prefix(
                        clip_el.attrib.get("duration") or _first_text(clip_el, "Duration"),
                        0,
                    )
                    c_in = _parse_int_or_frame_prefix(
                        clip_el.attrib.get("in") or _first_text(clip_el, "In"),
                        0,
                    )
                    flags = _parse_int_or_frame_prefix(_first_text(clip_el, "Flags"), 0)
                    media_ref = clip_el.attrib.get("mediaRef") or _first_text(clip_el, "MediaRef")
                    source_path = clip_el.attrib.get("src") or _first_text(
                        clip_el,
                        "FilePath",
                        "SourcePath",
                    )
                    src_fps_s = _first_text(clip_el, "MediaFrameRate")
                    src_fps = RationalFrameRate.from_str(src_fps_s) if src_fps_s else None

                    clips.append(
                        TimelineClip(
                            name=clip_name,
                            track_index=track_idx,
                            media_type=kind,
                            start_frame=c_start,
                            duration_frames=c_dur,
                            source_in_frame=c_in,
                            source_path=source_path,
                            media_ref=media_ref,
                            source_fps=src_fps,
                            enabled=(flags != 2),
                        )
                    )
            clips.sort(key=lambda c: (c.start_frame, c.name))
            tracks.append(
                TimelineTrack(
                    index=track_idx,
                    kind=kind,
                    name=track_name,
                    clips=clips,
                )
            )

    _collect_track_group(("VideoTracks",), ("Sm2TiTrack", "VideoTrack", "Track"), "video")
    _collect_track_group(("AudioTracks",), ("Sm2TiAudioTrack", "AudioTrack"), "audio")

    for mk_el in seq_root.findall(".//Marker"):
        mk_name = mk_el.attrib.get("name") or _first_text(mk_el, "Name") or "Marker"
        mk_frame = _parse_int_or_frame_prefix(
            mk_el.attrib.get("frame") or _first_text(mk_el, "Frame", "Start"),
            0,
        )
        mk_dur = _parse_int_or_frame_prefix(
            mk_el.attrib.get("duration") or _first_text(mk_el, "Duration"),
            1,
        )
        mk_color = mk_el.attrib.get("color") or _first_text(mk_el, "Color") or "Blue"
        mk_note = _first_text(mk_el, "Note")
        markers.append(
            TimelineMarker(
                name=mk_name,
                frame=mk_frame,
                duration_frames=mk_dur,
                color=mk_color,
                note=mk_note,
            )
        )

    return TimelineDocument(
        name=name,
        source_format=source_format,
        fps=fps,
        width=width,
        height=height,
        start_frame=start_frame,
        tracks=tracks,
        markers=markers,
        lut_refs=lut_refs,
    )


def parse_drp(path: Path, timeline_name: str | None = None) -> TimelineDocument:
    """Parse a clean-room .drp ZIP/XML project archive into a normalized TimelineDocument."""
    entries = _read_zip_xml_entries(path)
    if not entries:
        raise ValueError(f"No XML entries found in archive: {path}")

    project_xml_bytes = entries.get("project.xml")
    project_name = path.stem
    default_fps = RationalFrameRate(num=24, den=1)

    if project_xml_bytes is not None:
        proj_root = _parse_xml_bytes(project_xml_bytes)
        found_name = _first_text(proj_root, "ProjectName", "Name")
        if found_name:
            project_name = found_name
        fps_str = _first_text(proj_root, "TimelineFrameRate", "FrameRate")
        if fps_str:
            default_fps = RationalFrameRate.from_str(fps_str)

    seq_candidates = [
        (k, v)
        for k, v in sorted(entries.items())
        if k.startswith("SeqContainer/") or k.lower().endswith("timeline.xml")
    ]
    if seq_candidates:
        chosen_key, chosen_bytes = seq_candidates[0]
        if timeline_name:
            for key, raw in seq_candidates:
                root = _parse_xml_bytes(raw)
                seq_n = root.attrib.get("name") or _first_text(root, "Name")
                if seq_n == timeline_name or Path(key).stem == timeline_name:
                    chosen_key, chosen_bytes = key, raw
                    break
        seq_root = _parse_xml_bytes(chosen_bytes)
        seq_title = (
            seq_root.attrib.get("name")
            or _first_text(seq_root, "Name")
            or Path(chosen_key).stem
        )
        return _extract_resolve_sequence(seq_root, seq_title, "drp", default_fps)

    if project_xml_bytes is not None:
        proj_root = _parse_xml_bytes(project_xml_bytes)
        return _extract_resolve_sequence(proj_root, project_name, "drp", default_fps)

    first_key = sorted(entries.keys())[0]
    root = _parse_xml_bytes(entries[first_key])
    return _extract_resolve_sequence(root, project_name, "drp", default_fps)


def parse_drt(path: Path) -> TimelineDocument:
    """Parse a clean-room .drt timeline (plain XML or ZIP-wrapped XML)."""
    raw = path.read_bytes()
    if raw.startswith(b"PK"):
        entries = _read_zip_xml_entries(path)
        if not entries:
            raise ValueError(f"Empty ZIP .drt archive: {path}")
        seq_key = next(
            (k for k in sorted(entries) if k.startswith("SeqContainer/")),
            sorted(entries)[0],
        )
        root = _parse_xml_bytes(entries[seq_key])
    else:
        root = _parse_xml_bytes(raw)

    seq_name = root.attrib.get("name") or _first_text(root, "Name") or path.stem
    return _extract_resolve_sequence(root, seq_name, "drt", RationalFrameRate(num=25, den=1))


def parse_fcpxml(path: Path) -> TimelineDocument:
    """Parse FCPXML (1.8-1.11) using exact rational time fractions."""
    root = _parse_xml_bytes(path.read_bytes())

    formats: dict[str, tuple[RationalFrameRate, int, int]] = {}
    for fmt in root.findall(".//resources/format"):
        fmt_id = fmt.attrib.get("id", "")
        fd_raw = fmt.attrib.get("frameDuration", "1/24s")
        fd = _parse_fcpxml_time(fd_raw)
        fps_frac = Fraction(1, 1) / fd if fd > 0 else Fraction(24, 1)
        fps = RationalFrameRate(num=fps_frac.numerator, den=fps_frac.denominator)
        width = int(fmt.attrib.get("width", "1920"))
        height = int(fmt.attrib.get("height", "1080"))
        formats[fmt_id] = (fps, width, height)

    assets: dict[str, str] = {}
    for asset in root.findall(".//resources/asset"):
        aid = asset.attrib.get("id", "")
        src = asset.attrib.get("src", "")
        if not src:
            media_rep = asset.find("media-rep")
            if media_rep is not None:
                src = media_rep.attrib.get("src", "")
        assets[aid] = src

    seq = root.find(".//sequence")
    if seq is None:
        raise ValueError(f"No <sequence> found in FCPXML: {path}")

    fmt_id = seq.attrib.get("format", "")
    fps, width, height = formats.get(fmt_id, (RationalFrameRate(num=24, den=1), 1920, 1080))
    seq_name = seq.attrib.get("name") or path.stem
    project_el = root.find(".//project")
    if project_el is not None and project_el.attrib.get("name"):
        seq_name = project_el.attrib["name"]

    video_clips: list[TimelineClip] = []
    audio_clips: list[TimelineClip] = []
    markers: list[TimelineMarker] = []

    spine = seq.find("spine")
    if spine is not None:
        cursor_sec = Fraction(0)
        for child in spine:
            tag = child.tag
            dur_sec = _parse_fcpxml_time(child.attrib.get("duration", "0s"))
            offset_attr = child.attrib.get("offset")
            pos_sec = _parse_fcpxml_time(offset_attr) if offset_attr is not None else cursor_sec
            start_frame = seconds_to_rational_frames(pos_sec, fps)
            dur_frames = seconds_to_rational_frames(dur_sec, fps)

            if tag in {"asset-clip", "clip", "mc-clip", "ref-clip"}:
                in_sec = _parse_fcpxml_time(child.attrib.get("start", "0s"))
                in_frame = seconds_to_rational_frames(in_sec, fps)
                ref_id = child.attrib.get("ref", "")
                lane = int(child.attrib.get("lane", "0"))
                clip_name = child.attrib.get("name", ref_id or tag)
                clip = TimelineClip(
                    name=clip_name,
                    track_index=1 if lane == 0 else abs(lane) + 1,
                    media_type="audio" if lane < 0 else "video",
                    start_frame=start_frame,
                    duration_frames=dur_frames,
                    source_in_frame=in_frame,
                    source_path=assets.get(ref_id, ""),
                    media_ref=ref_id,
                    enabled=child.attrib.get("enabled", "1") != "0",
                )
                if lane < 0:
                    audio_clips.append(clip)
                else:
                    video_clips.append(clip)

                for mk in child.findall("marker"):
                    mk_start = _parse_fcpxml_time(mk.attrib.get("start", "0s"))
                    mk_dur = _parse_fcpxml_time(mk.attrib.get("duration", "1/24s"))
                    markers.append(
                        TimelineMarker(
                            name=mk.attrib.get("value", "Marker"),
                            frame=seconds_to_rational_frames(pos_sec + mk_start, fps),
                            duration_frames=max(1, seconds_to_rational_frames(mk_dur, fps)),
                            note=mk.attrib.get("note", ""),
                        )
                    )
            cursor_sec = pos_sec + dur_sec

    tracks: list[TimelineTrack] = []
    if video_clips:
        tracks.append(TimelineTrack(index=1, kind="video", name="V1", clips=video_clips))
    if audio_clips:
        tracks.append(TimelineTrack(index=1, kind="audio", name="A1", clips=audio_clips))

    return TimelineDocument(
        name=seq_name,
        source_format="fcpxml",
        fps=fps,
        width=width,
        height=height,
        start_frame=0,
        tracks=tracks,
        markers=markers,
    )


def parse_otio_file(path: Path) -> TimelineDocument:
    """Load an existing .otio or .otioz timeline into TimelineDocument."""
    tl = otio.adapters.read_from_file(str(path))
    if not isinstance(tl, otio.schema.Timeline):
        raise ValueError(f"Expected OTIO Timeline in {path}, got {type(tl).__name__}")

    rate_val = 24.0
    if tl.global_start_time is not None:
        rate_val = float(tl.global_start_time.rate)
    elif tl.tracks:
        for trk in tl.tracks:
            if len(trk) > 0 and trk[0].source_range is not None:
                rate_val = float(trk[0].source_range.start_time.rate)
                break

    fps = RationalFrameRate.from_float(rate_val)
    tracks: list[TimelineTrack] = []
    v_idx = 0
    a_idx = 0
    for trk in tl.tracks:
        is_audio = trk.kind == otio.schema.TrackKind.Audio
        if is_audio:
            a_idx += 1
            t_idx = a_idx
            kind: Literal["video", "audio"] = "audio"
        else:
            v_idx += 1
            t_idx = v_idx
            kind = "video"

        clips: list[TimelineClip] = []
        cursor = 0
        for item in trk:
            sr = item.trimmed_range()
            dur_frames = round(sr.duration.rescaled_to(fps.as_float).value)
            if isinstance(item, otio.schema.Clip):
                src_path = ""
                if isinstance(item.media_reference, otio.schema.ExternalReference):
                    src_path = item.media_reference.target_url
                in_frames = round(sr.start_time.rescaled_to(fps.as_float).value)
                clips.append(
                    TimelineClip(
                        name=item.name or "clip",
                        track_index=t_idx,
                        media_type=kind,
                        start_frame=cursor,
                        duration_frames=max(0, dur_frames),
                        source_in_frame=max(0, in_frames),
                        source_path=src_path,
                    )
                )
            cursor += max(0, dur_frames)

        tracks.append(
            TimelineTrack(
                index=t_idx,
                kind=kind,
                name=trk.name or f"{'A' if is_audio else 'V'}{t_idx}",
                clips=clips,
            )
        )

    fmt: Literal["otio", "otioz"] = "otioz" if path.suffix.lower() == ".otioz" else "otio"
    return TimelineDocument(
        name=tl.name or path.stem,
        source_format=fmt,
        fps=fps,
        tracks=tracks,
    )


def load_timeline(path: Path, timeline_name: str | None = None) -> TimelineDocument:
    """Dispatch parser cleanly based on file extension."""
    suffix = path.suffix.lower()
    if suffix == ".drp":
        return parse_drp(path, timeline_name=timeline_name)
    if suffix == ".drt":
        return parse_drt(path)
    if suffix in {".fcpxml", ".xml"}:
        return parse_fcpxml(path)
    if suffix in {".otio", ".otioz"}:
        return parse_otio_file(path)
    raise ValueError(f"Unsupported timeline format: {path.suffix}")


def to_otio(doc: TimelineDocument) -> otio.schema.Timeline:
    """Convert normalized TimelineDocument to ASWF OpenTimelineIO with exact RationalTime."""
    rate = doc.fps.as_float
    tl = otio.schema.Timeline(
        name=doc.name,
        global_start_time=otio.opentime.RationalTime(doc.start_frame, rate),
    )
    tl.metadata["taktcut"] = {
        "fps_num": doc.fps.num,
        "fps_den": doc.fps.den,
        "width": doc.width,
        "height": doc.height,
        "lut_refs": doc.lut_refs,
    }

    for trk in doc.tracks:
        otio_kind = (
            otio.schema.TrackKind.Audio
            if trk.kind == "audio"
            else otio.schema.TrackKind.Video
        )
        otio_track = otio.schema.Track(name=trk.name, kind=otio_kind)
        ordered = sorted(trk.clips, key=lambda c: c.start_frame)
        cursor = doc.start_frame
        for clip in ordered:
            if clip.start_frame > cursor:
                gap_len = clip.start_frame - cursor
                otio_track.append(
                    otio.schema.Gap(
                        source_range=otio.opentime.TimeRange(
                            start_time=otio.opentime.RationalTime(0, rate),
                            duration=otio.opentime.RationalTime(gap_len, rate),
                        )
                    )
                )
                cursor = clip.start_frame

            media_ref: otio.schema.MediaReference = (
                otio.schema.ExternalReference(target_url=clip.source_path)
                if clip.source_path
                else otio.schema.MissingReference()
            )
            otio_clip = otio.schema.Clip(
                name=clip.name,
                media_reference=media_ref,
                source_range=otio.opentime.TimeRange(
                    start_time=otio.opentime.RationalTime(clip.source_in_frame, rate),
                    duration=otio.opentime.RationalTime(clip.duration_frames, rate),
                ),
            )
            otio_clip.enabled = clip.enabled
            otio_track.append(otio_clip)
            cursor = max(cursor, clip.end_frame_exclusive)

        tl.tracks.append(otio_track)

    if doc.markers and len(tl.tracks) > 0:
        for mk in doc.markers:
            tl.tracks[0].markers.append(
                otio.schema.Marker(
                    name=mk.name,
                    marked_range=otio.opentime.TimeRange(
                        start_time=otio.opentime.RationalTime(mk.frame, rate),
                        duration=otio.opentime.RationalTime(mk.duration_frames, rate),
                    ),
                    color=mk.color.upper(),
                    comment=mk.note,
                )
            )

    return tl


def export_otio(
    doc: TimelineDocument,
    out_path: Path,
    *,
    bundle_missing_only: bool = False,
) -> Path:
    """Serialize TimelineDocument to .otio or .otioz."""
    tl = to_otio(doc)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if out_path.suffix.lower() == ".otioz":
        from opentimelineio.adapters import file_bundle_utils

        if out_path.exists():
            out_path.unlink()
        policy = (
            file_bundle_utils.MediaReferencePolicy.AllMissing
            if bundle_missing_only
            else file_bundle_utils.MediaReferencePolicy.MissingIfNotFile
        )
        otio.adapters.write_to_file(tl, str(out_path), media_policy=policy)
    else:
        otio.adapters.write_to_file(tl, str(out_path))
    return out_path


def validate_timeline(doc: TimelineDocument) -> TimelineValidationResult:
    """Audit exact integer-frame continuity, overlaps, gaps, zero-duration clips, and FPS."""
    issues: list[GapIssue] = []
    total_clips = 0

    for track in doc.tracks:
        ordered = sorted(track.clips, key=lambda c: (c.start_frame, c.duration_frames))
        total_clips += len(ordered)
        prev_end: int | None = None

        for clip in ordered:
            if clip.duration_frames <= 0:
                issues.append(
                    GapIssue(
                        kind="zero_duration",
                        track_kind=track.kind,
                        track_index=track.index,
                        start_frame=clip.start_frame,
                        end_frame=clip.end_frame_exclusive,
                        detail=(
                            f"Clip '{clip.name}' has non-positive duration "
                            f"({clip.duration_frames} frames)"
                        ),
                    )
                )
            if (
                clip.source_fps is not None
                and clip.source_fps.fraction != doc.fps.fraction
            ):
                issues.append(
                    GapIssue(
                        kind="fps_mismatch",
                        track_kind=track.kind,
                        track_index=track.index,
                        start_frame=clip.start_frame,
                        end_frame=clip.end_frame_exclusive,
                        detail=(
                            f"Clip '{clip.name}' source FPS {clip.source_fps.ffmpeg_rate} "
                            f"differs from timeline {doc.fps.ffmpeg_rate}"
                        ),
                    )
                )
            if prev_end is not None:
                if clip.start_frame < prev_end:
                    issues.append(
                        GapIssue(
                            kind="overlap",
                            track_kind=track.kind,
                            track_index=track.index,
                            start_frame=clip.start_frame,
                            end_frame=prev_end,
                            detail=(
                                f"Clip '{clip.name}' overlaps previous clip by "
                                f"{prev_end - clip.start_frame} frames"
                            ),
                        )
                    )
                elif clip.start_frame > prev_end:
                    issues.append(
                        GapIssue(
                            kind="gap",
                            track_kind=track.kind,
                            track_index=track.index,
                            start_frame=prev_end,
                            end_frame=clip.start_frame,
                            detail=(
                                f"Black/silent gap of {clip.start_frame - prev_end} frames "
                                f"before '{clip.name}'"
                            ),
                        )
                    )
            prev_end = max(prev_end or 0, clip.end_frame_exclusive)

    return TimelineValidationResult(
        timeline_name=doc.name,
        valid=len(issues) == 0,
        total_tracks=len(doc.tracks),
        total_clips=total_clips,
        issues=issues,
    )


def create_sample_drt_bytes(name: str = "qa-sample-timeline", fps: str = "25") -> bytes:
    """Create a clean-room .drt XML fixture for deterministic unit tests."""
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<Sm2Sequence name="{name}">\n'
        f"  <FrameRate>{fps}</FrameRate>\n"
        "  <Width>1920</Width>\n"
        "  <Height>1080</Height>\n"
        "  <StartFrame>0</StartFrame>\n"
        "  <VideoTracks>\n"
        '    <Sm2TiTrack index="1" name="V1">\n'
        '      <Sm2TiVideoClip name="shot_01" start="0" duration="50" '
        'in="0" src="media/shot_01.mov" />\n'
        '      <Sm2TiVideoClip name="shot_02" start="50" duration="50" '
        'in="12" src="media/shot_02.mov" />\n'
        "    </Sm2TiTrack>\n"
        "  </VideoTracks>\n"
        "</Sm2Sequence>\n"
    ).encode()


def create_sample_drp_bytes(name: str = "qa-sample-project", fps: str = "24000/1001") -> bytes:
    """Create a clean-room .drp ZIP+XML fixture in memory for unit tests."""
    buf = io.BytesIO()
    proj_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        "<SM_Project>\n"
        f"  <ProjectName>{name}</ProjectName>\n"
        f"  <TimelineFrameRate>{fps}</TimelineFrameRate>\n"
        "</SM_Project>\n"
    ).encode()
    seq_xml = create_sample_drt_bytes(name="Main Cut", fps=fps)
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("project.xml", proj_xml)
        zf.writestr("SeqContainer/0001-main.xml", seq_xml)
    return buf.getvalue()
