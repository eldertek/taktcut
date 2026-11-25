"""Clean-room reader for real DaVinci Resolve project archives (.dra folders and their project.drp).

A Resolve archive (``Name.dra/``) holds ``project.drp`` (a ZIP of XML documents written by the
Resolve database layer) plus a ``MediaFiles/`` directory with the consolidated media.

Layout observed on public training archives (Resolve 17+):

* ``MediaPool/Master/<NNN_Folder>/MpFolder.xml`` lists media pool items. Timelines appear as
  ``Sm2MpTimelineClip`` > ``Sm2Timeline`` (``Name``) > ``Sm2Sequence`` (``FrameRate`` LE double hex,
  ``Resolution`` BE 2 x uint64 hex).
* ``SeqContainer/<uuid>.xml`` holds one ``Sm2SequenceContainer`` with ``VideoTrackVec`` and
  ``AudioTrackVec``. Each ``Sm2TiTrack`` references its ``Sm2Sequence`` by id and lists ``Items``
  (``Sm2TiVideoClip``, ``Sm2TiAudioClip``, ``Sm2TiTransition``) in absolute record frames.

Only element names, integer frames and documented binary scalars are read. No proprietary code
or assets are bundled; parsing is strictly read-only and uses defusedxml.
"""

from __future__ import annotations

import math
import re
import struct
import unicodedata
import zipfile
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath
from typing import Any
from xml.etree.ElementTree import Element

import defusedxml.ElementTree as DefusedET

from taktcut.models import (
    ClipTransition,
    RationalFrameRate,
    TimelineClip,
    TimelineDocument,
    TimelineTrack,
)

MAX_ARCHIVE_XML_BYTES = 128 * 1024 * 1024
_CPP_SCOPE_TAG = re.compile(rb"<(/?)([A-Za-z_][\w.\-]*)::")
_FOLDER_PREFIX = re.compile(r"^\d{3}_")
SEQUENCE_CONTAINER_MARKER = b"<Sm2SequenceContainer"


def sanitize_resolve_xml(raw: bytes) -> bytes:
    """Rewrite C++ scoped element names (``ListMgt::LmVersion``) into well-formed XML names."""
    return _CPP_SCOPE_TAG.sub(rb"<\1\2__", raw)


def parse_resolve_xml(raw: bytes) -> Element:
    return DefusedET.fromstring(sanitize_resolve_xml(raw))


def _text(elem: Element | None, tag: str) -> str:
    if elem is None:
        return ""
    found = elem.find(tag)
    if found is None or found.text is None:
        return ""
    return found.text.strip()


def _int(raw: str, default: int = 0) -> int:
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


def _hex_bytes(raw: str) -> bytes:
    raw = raw.strip()
    if not raw or len(raw) % 2:
        return b""
    try:
        return bytes.fromhex(raw)
    except ValueError:
        return b""


def decode_hex_fps(raw: str) -> RationalFrameRate | None:
    """Decode ``FrameRate`` / ``MediaFrameRate`` hex text (little-endian IEEE double)."""
    data = _hex_bytes(raw)
    if len(data) < 8:
        return None
    value = struct.unpack_from("<d", data, 0)[0]
    if not math.isfinite(value) or not 1.0 <= value <= 240.0:
        return None
    return RationalFrameRate.from_float(value)


def decode_hex_resolution(raw: str) -> tuple[int, int] | None:
    data = _hex_bytes(raw)
    if len(data) < 16:
        return None
    width, height = struct.unpack_from(">QQ", data, 0)
    if 16 <= width <= 16384 and 16 <= height <= 16384:
        return int(width), int(height)
    return None


@dataclass
class ArchiveTimelineInfo:
    sequence_id: str
    name: str
    folder: str
    fps: RationalFrameRate
    width: int
    height: int
    is_compound: bool
    media_pool_clip_id: str = ""
    container_key: str = ""
    video_clip_count: int = 0
    audio_clip_count: int = 0

    def as_dict(self) -> dict[str, Any]:
        return {
            "sequence_id": self.sequence_id,
            "name": self.name,
            "folder": self.folder,
            "fps": self.fps.as_float,
            "width": self.width,
            "height": self.height,
            "is_compound": self.is_compound,
            "video_clip_count": self.video_clip_count,
            "audio_clip_count": self.audio_clip_count,
        }


@dataclass
class ResolveArchive:
    project_name: str
    width: int
    height: int
    timelines: list[ArchiveTimelineInfo] = field(default_factory=list)
    containers: dict[str, bytes] = field(default_factory=dict)
    media_root: Path | None = None
    media_index: dict[str, list[str]] = field(default_factory=dict)
    media_dirs: dict[str, list[str]] = field(default_factory=dict)


_IMAGE_SEQ_RE = re.compile(r"^(.*)\[(\d+)-(\d+)\]([^/\\]+)$")


def _norm_key(text: str) -> str:
    return unicodedata.normalize("NFC", text).lower()


def _build_media_index(media_root: Path) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    """Recursively index all files and folders under a .dra archive MediaFiles directory."""
    by_name: dict[str, list[str]] = {}
    by_dir: dict[str, list[str]] = {}
    for item in media_root.rglob("*"):
        if item.name.startswith("."):
            continue
        rel = item.relative_to(media_root).as_posix()
        key = _norm_key(item.name)
        if item.is_file():
            by_name.setdefault(key, []).append(rel)
        elif item.is_dir():
            by_dir.setdefault(key, []).append(rel)
    return by_name, by_dir


def _read_entries(drp_path: Path) -> dict[str, bytes]:
    entries: dict[str, bytes] = {}
    total = 0
    with zipfile.ZipFile(drp_path, "r") as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            norm = info.filename.replace("\\", "/")
            if norm.startswith("/") or ".." in norm.split("/"):
                raise ValueError(f"Unsafe archive path detected: {info.filename}")
            if not norm.lower().endswith(".xml"):
                continue
            total += info.file_size
            if total > MAX_ARCHIVE_XML_BYTES:
                raise ValueError("Archive exceeds uncompressed XML safety limit")
            entries[norm] = zf.read(info.filename)
    return entries


def is_resolve_archive_drp(entries: dict[str, bytes]) -> bool:
    return any(
        key.startswith("SeqContainer/") and SEQUENCE_CONTAINER_MARKER in raw[:2048]
        for key, raw in entries.items()
    )


def resolve_drp_path(path: Path) -> Path:
    """Accept a ``.dra`` folder or a ``project.drp`` file and return the ``.drp`` path."""
    if path.is_dir():
        candidate = path / "project.drp"
        if candidate.is_file():
            return candidate
        drps = sorted(path.glob("*.drp"))
        if drps:
            return drps[0]
        raise ValueError(f"No project.drp found inside archive folder: {path}")
    return path


def _folder_label(mp_key: str) -> tuple[str, bool]:
    parts = PurePosixPath(mp_key).parts
    folders = [p for p in parts[2:-1]]  # skip MediaPool/Master and MpFolder.xml
    labels = [_FOLDER_PREFIX.sub("", p) for p in folders]
    is_compound = any("compound" in lbl.lower() for lbl in labels)
    return " / ".join(labels) or "Master", is_compound


def load_resolve_archive(path: Path) -> ResolveArchive:
    drp_path = resolve_drp_path(path)
    entries = _read_entries(drp_path)
    if not is_resolve_archive_drp(entries):
        raise ValueError("Not a DaVinci Resolve archive project (no Sm2SequenceContainer found)")

    project_name = (
        drp_path.parent.stem if drp_path.parent.suffix.lower() == ".dra" else drp_path.stem
    )
    width, height = 1920, 1080
    project_xml = entries.get("project.xml")
    if project_xml is not None:
        proj = parse_resolve_xml(project_xml)
        found = proj.find(".//ProjectName")
        if found is not None and found.text:
            project_name = found.text.strip()
        w_el = proj.find(".//Width")
        h_el = proj.find(".//Height")
        if w_el is not None and h_el is not None:
            width = _int(w_el.text or "", 1920) or 1920
            height = _int(h_el.text or "", 1080) or 1080

    archive = ResolveArchive(project_name=project_name, width=width, height=height)
    media_dir = drp_path.parent / "MediaFiles"
    if media_dir.is_dir():
        archive.media_root = media_dir
        archive.media_index, archive.media_dirs = _build_media_index(media_dir)
    else:
        archive.media_root = None

    timelines: dict[str, ArchiveTimelineInfo] = {}
    for key in sorted(entries):
        if not key.startswith("MediaPool/") or not key.endswith("MpFolder.xml"):
            continue
        root = parse_resolve_xml(entries[key])
        folder, is_compound = _folder_label(key)
        owners: dict[str, tuple[Element, str]] = {}
        for owner in root.iter():
            if not owner.tag.startswith("Sm2Mp"):
                continue
            owner_name = _text(owner, "Name")
            for seq_owned in owner.findall(".//Sm2Sequence"):
                owners[seq_owned.attrib.get("DbId", "")] = (owner, owner_name)
        for seq_id, (mp_clip, owner_name) in owners.items():
            seq_el = mp_clip.find(f".//Sm2Sequence[@DbId='{seq_id}']")
            if seq_el is None or not seq_id or seq_id in timelines:
                continue
            timeline_el = mp_clip.find(".//Sm2Timeline")
            name = _text(timeline_el, "Name") or owner_name or seq_id[:8]
            fps = decode_hex_fps(_text(seq_el, "FrameRate")) or RationalFrameRate(num=24, den=1)
            res = decode_hex_resolution(_text(seq_el, "Resolution")) or (width, height)
            timelines[seq_id] = ArchiveTimelineInfo(
                sequence_id=seq_id,
                name=name,
                folder=folder,
                fps=fps,
                width=res[0],
                height=res[1],
                is_compound=is_compound or mp_clip.tag != "Sm2MpTimelineClip",
                media_pool_clip_id=mp_clip.attrib.get("DbId", ""),
            )

    for key, raw in entries.items():
        if not key.startswith("SeqContainer/"):
            continue
        match = re.search(rb"<Sequence>([0-9a-fA-F\-]{36})</Sequence>", raw)
        if not match:
            continue
        seq_id = match.group(1).decode("ascii")
        archive.containers[seq_id] = raw
        info = timelines.get(seq_id)
        if info is None:
            info = ArchiveTimelineInfo(
                sequence_id=seq_id,
                name=f"Compound {seq_id[:8]}",
                folder="Compound Clips",
                fps=RationalFrameRate(num=24, den=1),
                width=width,
                height=height,
                is_compound=True,
            )
            timelines[seq_id] = info
        info.container_key = key
        info.video_clip_count = raw.count(b"<Sm2TiVideoClip ")
        info.audio_clip_count = raw.count(b"<Sm2TiAudioClip ")

    archive.timelines = [t for t in timelines.values() if t.container_key]
    archive.timelines.sort(key=lambda t: (t.is_compound, t.folder.lower(), t.name.lower()))
    return archive


def list_archive_timelines(path: Path) -> list[dict[str, Any]]:
    return [t.as_dict() for t in load_resolve_archive(path).timelines]


def _pick_timeline(archive: ResolveArchive, timeline_name: str | None) -> ArchiveTimelineInfo:
    if not archive.timelines:
        raise ValueError("Resolve archive contains no timeline")
    if timeline_name:
        wanted = timeline_name.strip().lower()
        for info in archive.timelines:
            if wanted in {
                info.name.lower(),
                info.sequence_id.lower(),
                f"{info.folder} / {info.name}".lower(),
            }:
                return info
        raise ValueError(f"Timeline not found in archive: {timeline_name}")
    main = [t for t in archive.timelines if not t.is_compound] or archive.timelines
    return max(main, key=lambda t: (t.video_clip_count + t.audio_clip_count, -len(t.name)))


def _pick_best_rel_candidate(media_path: str, candidates: list[str]) -> str:
    """Pick the archive MediaFiles relative path whose trailing segments best match media_path."""
    if len(candidates) == 1:
        return candidates[0]
    src_parts = [_norm_key(p) for p in PurePosixPath(media_path.replace("\\", "/")).parts if p]

    def _score(rel: str) -> tuple[int, int]:
        rel_parts = [_norm_key(p) for p in PurePosixPath(rel).parts if p]
        matched = 0
        for a, b in zip(reversed(src_parts), reversed(rel_parts), strict=False):
            if a == b:
                matched += 1
            else:
                break
        return (matched, -len(rel_parts))

    return max(candidates, key=_score)


def _media_relpath(archive: ResolveArchive, media_path: str) -> str:
    if not media_path:
        return ""
    norm = media_path.replace("\\", "/")
    posix = PurePosixPath(norm)
    base = posix.name
    if archive.media_root is None:
        return media_path

    # 1. Exact flat match in MediaFiles/
    if (archive.media_root / base).is_file():
        return f"MediaFiles/{base}"

    # 2. Recursive suffix/filename match inside MediaFiles/** subdirectories (NFC normalized)
    cands = archive.media_index.get(_norm_key(base))
    if cands:
        best = _pick_best_rel_candidate(norm, cands)
        return f"MediaFiles/{best}"

    # 3. DaVinci Resolve image sequence notation: prefix[0000-0349].png
    seq_m = _IMAGE_SEQ_RE.match(base)
    if seq_m:
        prefix, start_s, _end_s, ext = seq_m.groups()
        first_frame = f"{prefix}{start_s}{ext}"
        seq_cands = archive.media_index.get(_norm_key(first_frame))
        if seq_cands:
            best_first = _pick_best_rel_candidate(norm, seq_cands)
            parent_rel = PurePosixPath(best_first).parent.as_posix()
            if parent_rel and parent_rel != ".":
                return f"MediaFiles/{parent_rel}/{base}"
            return f"MediaFiles/{base}"
    return media_path


def _hour_offset(min_start: int, fps: RationalFrameRate) -> int:
    hour = round(fps.as_float * 3600)
    if hour <= 0 or min_start < hour:
        return 0
    return (min_start // hour) * hour


def _compound_preview_sources(archive: ResolveArchive) -> dict[str, str]:
    """Map compound media pool clip ids to the first media file of their nested timeline."""
    previews: dict[str, str] = {}
    for info in archive.timelines:
        raw = archive.containers.get(info.sequence_id)
        if not raw or not info.media_pool_clip_id:
            continue
        match = re.search(rb"<MediaFilePath>([^<]+)</MediaFilePath>", raw)
        if match:
            previews[info.media_pool_clip_id] = _media_relpath(
                archive, match.group(1).decode("utf-8", "replace")
            )
    return previews


def parse_resolve_archive(path: Path, timeline_name: str | None = None) -> TimelineDocument:
    """Parse a real Resolve ``.dra`` archive (or its ``project.drp``) into a TimelineDocument."""
    from taktcut.resolve_db import decode_effect_filters

    archive = load_resolve_archive(path)
    info = _pick_timeline(archive, timeline_name)
    root = parse_resolve_xml(archive.containers[info.sequence_id])
    fps = info.fps
    compound_previews = _compound_preview_sources(archive)
    timeline_names = {
        t.media_pool_clip_id: t.name for t in archive.timelines if t.media_pool_clip_id
    }

    raw_tracks: list[tuple[str, int, list[dict[str, Any]], list[tuple[int, int, str]]]] = []
    min_start: int | None = None
    for vec_tag, kind in (("VideoTrackVec", "video"), ("AudioTrackVec", "audio")):
        vec = root.find(vec_tag)
        if vec is None:
            continue
        for idx, track_el in enumerate(vec.findall("./Element/Sm2TiTrack"), start=1):
            items: list[dict[str, Any]] = []
            transitions: list[tuple[int, int, str]] = []
            items_el = track_el.find("Items")
            for item in [] if items_el is None else list(items_el.iter()):
                tag = item.tag
                if tag == "Sm2TiTransition":
                    transitions.append(
                        (
                            _int(_text(item, "Start")),
                            _int(_text(item, "Duration")),
                            _text(item, "PrettyType"),
                        )
                    )
                    continue
                if tag not in {"Sm2TiVideoClip", "Sm2TiAudioClip"}:
                    continue
                start = _int(_text(item, "Start"))
                items.append({"el": item, "start": start})
                min_start = start if min_start is None else min(min_start, start)
            raw_tracks.append((kind, idx, items, transitions))

    video_positive_starts = [
        entry["start"]
        for (k, _idx, items, _tr) in raw_tracks
        if k == "video"
        for entry in items
        if entry["start"] > 0
    ]
    offset_ref = min(video_positive_starts) if video_positive_starts else (min_start or 0)
    offset = _hour_offset(offset_ref, fps)
    tracks: list[TimelineTrack] = []
    warnings: list[str] = []
    for kind, idx, items, transitions in raw_tracks:
        clips: list[TimelineClip] = []
        for entry in items:
            el: Element = entry["el"]
            duration = max(0, _int(_text(el, "Duration")))
            media_path = _text(el, "MediaFilePath")
            media_ref = _text(el, "MediaRef")
            name = _text(el, "Name") or PurePosixPath(media_path).name or "Clip"
            source_path = _media_relpath(archive, media_path)
            if not source_path and media_ref in compound_previews:
                source_path = compound_previews[media_ref]
                name = timeline_names.get(media_ref, name)
            transform = None
            effects_hex = _text(el, "EffectFiltersBA")
            if effects_hex:
                try:
                    transform = decode_effect_filters(_hex_bytes(effects_hex))
                except (ValueError, struct.error):
                    transform = None
            clip_fps = decode_hex_fps(_text(el, "MediaFrameRate"))
            source_in = max(0, _int(_text(el, "In")))
            try:
                media_start_s = float(_text(el, "MediaStartTime") or 0.0)
            except ValueError:
                media_start_s = 0.0
            media_start_frames = (
                round(media_start_s * (clip_fps or fps).as_float)
                if math.isfinite(media_start_s)
                else 0
            )
            if media_start_frames > 0 and source_in >= media_start_frames:
                source_in -= media_start_frames
            clips.append(
                TimelineClip(
                    name=name,
                    track_index=idx,
                    media_type="video" if kind == "video" else "audio",
                    start_frame=max(0, entry["start"] - offset),
                    duration_frames=duration,
                    source_in_frame=source_in,
                    source_path=source_path,
                    media_ref=media_ref,
                    source_fps=clip_fps,
                    enabled=_int(_text(el, "Flags")) != 2,
                    transform=transform,
                    media_offline=bool(media_path) and not source_path.startswith("MediaFiles/"),
                )
            )
        clips.sort(key=lambda c: (c.start_frame, c.name))
        for t_start, t_dur, pretty in transitions:
            t_rel = t_start - offset
            for clip in clips:
                end = clip.start_frame + clip.duration_frames
                if t_rel - 1 <= end <= t_rel + t_dur + 1:
                    seconds = max(0.1, min(2.0, t_dur / max(fps.as_float, 1.0)))
                    clip.transition_out = ClipTransition(
                        preset="fade",
                        duration_s=round(seconds, 3),
                        include_audio=kind == "audio" or "fade" in pretty.lower(),
                    )
                    break
        label = "Video" if kind == "video" else "Audio"
        tracks.append(
            TimelineTrack(
                index=idx,
                kind="video" if kind == "video" else "audio",
                name=f"{label} {idx}",
                clips=clips,
            )
        )

    offline = sum(1 for t in tracks for c in t.clips if c.media_offline)
    if offline:
        warnings.append(f"{offline} clip(s) reference media outside the archive MediaFiles folder")

    return TimelineDocument(
        name=info.name,
        source_format="drp",
        fps=fps,
        width=info.width,
        height=info.height,
        start_frame=0,
        tracks=tracks,
        markers=[],
        warnings=warnings,
    )
