"""Clean-room binary & SQLite reader for DaVinci Resolve 18-21 Project.db & .drp/.drt blobs."""

from __future__ import annotations

import base64
import math
import os
import re
import sqlite3
import struct
import zlib
from pathlib import Path
from typing import Any, Literal

import zstandard as zstd
from pydantic import BaseModel, Field

from taktcut.models import (
    MAX_RETIME_RAMP_POINTS,
    RETIME_SPEED_MAX,
    RETIME_SPEED_MIN,
    ClipTransformParams,
    RationalFrameRate,
    RetimeSpeedPoint,
    TimelineClip,
    TimelineDocument,
    TimelineMarker,
    TimelineTrack,
)

ZSTD_MAGIC = b"\x28\xb5\x2f\xfd"
MAX_BLOB_DECOMPRESSED_BYTES = 16 * 1024 * 1024
DEFAULT_CONTRAST_PIVOT_REC709 = 0.435


class LocalResolveProjectInfo(BaseModel):
    """Summary metadata for a locally installed DaVinci Resolve SQLite Project.db."""

    project_name: str
    library_name: str = "Resolve Project Library"
    db_path: str
    timeline_names: list[str] = Field(default_factory=list)
    active_timeline: str = ""
    width: int = 1920
    height: int = 1080
    fps: str = "25"
    track_count: int = 0
    clip_count: int = 0
    media_count: int = 0
    graded_versions: int = 0
    node_labels: list[str] = Field(default_factory=list)
    lut_refs: list[str] = Field(default_factory=list)
    thumbnail_data_url: str = ""


def _parse_int_or_frame_prefix(raw: Any, default: int = 0) -> int:
    if raw is None:
        return default
    if isinstance(raw, bool):
        return default
    if isinstance(raw, (int, float)):
        return int(raw) if math.isfinite(float(raw)) else default
    text = str(raw).strip()
    if "|" in text:
        text = text.split("|", 1)[0]
    try:
        return int(float(text))
    except ValueError:
        return default


def _clamp(val: float, lo: float, hi: float) -> float:
    return min(hi, max(lo, val))


def unpack_resolve_blob(blob: bytes, max_bytes: int = MAX_BLOB_DECOMPRESSED_BYTES) -> bytes:
    """Safely unpack Resolve Zstandard (0x81) or zlib (0x789c) compressed payloads."""
    if not blob:
        return b""
    z_idx = blob.find(ZSTD_MAGIC)
    if z_idx >= 0:
        dctx = zstd.ZstdDecompressor()
        return dctx.decompress(blob[z_idx:], max_output_size=max_bytes)
    for hdr in (b"\x78\x9c", b"\x78\xda", b"\x78\x01"):
        z_off = blob.find(hdr)
        if z_off >= 0:
            try:
                decomp = zlib.decompressobj()
                out = decomp.decompress(blob[z_off:], max_bytes + 1)
                if len(out) <= max_bytes:
                    return out
            except zlib.error:
                continue
    return blob


def _read_u32_be(buf: bytes, off: int) -> tuple[int, int]:
    if off + 4 > len(buf):
        raise EOFError("Truncated uint32")
    return struct.unpack_from(">I", buf, off)[0], off + 4


def parse_qt_variant_map(buf: bytes, max_items: int = 256) -> dict[str, Any]:
    """Decode Resolve Qt5 QDataStream QVariantMap binary header (version 00000001)."""
    if len(buf) < 8:
        return {}
    version, off = _read_u32_be(buf, 0)
    if version not in (1, 2):
        return {}
    count, off = _read_u32_be(buf, off)
    if count > max_items:
        count = max_items

    result: dict[str, Any] = {}
    for _ in range(count):
        if off + 9 > len(buf):
            break
        klen, off = _read_u32_be(buf, off)
        if klen == 0xFFFFFFFF:
            key = ""
        elif klen > len(buf) - off:
            break
        else:
            key = buf[off : off + klen].decode("utf-16-be", errors="replace")
            off += klen

        if off + 5 > len(buf):
            break
        qtype, off = _read_u32_be(buf, off)
        _is_null = buf[off]
        off += 1

        if qtype == 1:  # Bool
            if off + 1 > len(buf):
                break
            val: Any = bool(buf[off])
            off += 1
        elif qtype == 2:  # Int32
            if off + 4 > len(buf):
                break
            val = struct.unpack_from(">i", buf, off)[0]
            off += 4
        elif qtype == 3:  # UInt32
            if off + 4 > len(buf):
                break
            val = struct.unpack_from(">I", buf, off)[0]
            off += 4
        elif qtype in (4, 5):  # LongLong / ULongLong
            if off + 8 > len(buf):
                break
            fmt = ">q" if qtype == 4 else ">Q"
            val = struct.unpack_from(fmt, buf, off)[0]
            off += 8
        elif qtype == 6:  # Double
            if off + 8 > len(buf):
                break
            val = struct.unpack_from(">d", buf, off)[0]
            off += 8
        elif qtype == 10:  # QString
            slen, off = _read_u32_be(buf, off)
            if slen == 0xFFFFFFFF:
                val = None
            elif slen > len(buf) - off:
                break
            else:
                val = buf[off : off + slen].decode("utf-16-be", errors="replace")
                off += slen
        elif qtype == 12:  # QByteArray
            blen, off = _read_u32_be(buf, off)
            if blen == 0xFFFFFFFF:
                val = None
            elif blen > len(buf) - off:
                break
            else:
                val = buf[off : off + blen]
                off += blen
        else:
            break
        if key:
            result[key] = val
    return result


def _read_varint(buf: bytes, pos: int) -> tuple[int, int]:
    shift = 0
    value = 0
    while pos < len(buf) and shift < 64:
        byte = buf[pos]
        pos += 1
        value |= (byte & 0x7F) << shift
        if not (byte & 0x80):
            return value, pos
        shift += 7
    raise ValueError("Invalid varint in protobuf wire payload")


def iter_protobuf_fields(buf: bytes) -> list[tuple[int, int, Any]]:
    """Clean-room Protobuf wire-level parser returning (field_num, wire_type, value)."""
    fields: list[tuple[int, int, Any]] = []
    pos = 0
    while pos < len(buf):
        tag, pos = _read_varint(buf, pos)
        field_num = tag >> 3
        wire_type = tag & 0x07
        if wire_type == 0:
            val, pos = _read_varint(buf, pos)
            fields.append((field_num, wire_type, val))
        elif wire_type == 1:
            if pos + 8 > len(buf):
                break
            fields.append((field_num, wire_type, buf[pos : pos + 8]))
            pos += 8
        elif wire_type == 2:
            ln, pos = _read_varint(buf, pos)
            if pos + ln > len(buf):
                break
            fields.append((field_num, wire_type, buf[pos : pos + ln]))
            pos += ln
        elif wire_type == 5:
            if pos + 4 > len(buf):
                break
            fields.append((field_num, wire_type, buf[pos : pos + 4]))
            pos += 4
        else:
            break
    return fields


def decode_sequence_fps(raw: Any, fallback: RationalFrameRate | None = None) -> RationalFrameRate:
    """Decode Resolve Sm2Sequence FrameRate LE double/binary blob or string."""
    default = fallback or RationalFrameRate(num=25, den=1)
    if isinstance(raw, bytes) and len(raw) >= 8:
        fps_f = struct.unpack_from("<d", raw, 0)[0]
        if math.isfinite(fps_f) and 1.0 <= fps_f <= 240.0:
            return RationalFrameRate.from_float(fps_f)
    if isinstance(raw, (int, float)) and math.isfinite(float(raw)) and 1.0 <= float(raw) <= 240.0:
        return RationalFrameRate.from_float(float(raw))
    if isinstance(raw, str) and raw.strip():
        try:
            return RationalFrameRate.from_str(raw.strip())
        except ValueError:
            return default
    return default


def decode_sequence_resolution(raw: Any) -> tuple[int, int]:
    """Decode Resolve Sm2Sequence big-endian 2x uint64 width/height resolution."""
    if isinstance(raw, bytes) and len(raw) >= 16:
        w, h = struct.unpack_from(">QQ", raw, 0)
        if 16 <= w <= 16384 and 16 <= h <= 16384:
            return int(w), int(h)
    return 1920, 1080


def decode_timemap_speed(raw: Any) -> tuple[float, list[RetimeSpeedPoint]]:
    """Decode Resolve Sm2TimeMap QVariantMap & Protobuf keyframes into speed_rate + curve."""
    if not isinstance(raw, bytes) or len(raw) < 12:
        return 1.0, []
    qmap = parse_qt_variant_map(raw)
    if not qmap:
        return 1.0, []

    keyframes_blob = qmap.get("KeyframesBA")
    coords: list[tuple[float, float]] = []
    if isinstance(keyframes_blob, bytes) and len(keyframes_blob) >= 4:
        unpacked = unpack_resolve_blob(keyframes_blob)
        pb_start = 1 if unpacked[:1] == b"\x80" else 0
        try:
            for fnum, wtype, val in iter_protobuf_fields(unpacked[pb_start:]):
                if fnum == 1 and wtype == 2 and isinstance(val, bytes):
                    x_val = 0.0
                    y_val = 0.0
                    for sfnum, swtype, sval in iter_protobuf_fields(val):
                        if sfnum == 1 and swtype == 1 and isinstance(sval, bytes):
                            x_val = struct.unpack_from("<d", sval, 0)[0]
                        elif sfnum == 2 and swtype == 1 and isinstance(sval, bytes):
                            y_val = struct.unpack_from("<d", sval, 0)[0]
                    if math.isfinite(x_val) and math.isfinite(y_val):
                        coords.append((x_val, y_val))
        except ValueError:
            coords = []

    if len(coords) >= 2:
        x_max = max(pt[0] for pt in coords)
        y_max = max(pt[1] for pt in coords)
        if x_max > 0.01 and y_max > 0.01:
            avg_speed = _clamp(x_max / y_max, RETIME_SPEED_MIN, RETIME_SPEED_MAX)
            ramp_pts: list[RetimeSpeedPoint] = []
            if len(coords) >= 3:
                for i in range(len(coords) - 1):
                    dx = coords[i + 1][0] - coords[i][0]
                    dy = coords[i + 1][1] - coords[i][1]
                    seg_spd = (
                        _clamp(dx / dy, RETIME_SPEED_MIN, RETIME_SPEED_MAX)
                        if dy > 1e-4
                        else avg_speed
                    )
                    pos_norm = _clamp(coords[i][1] / y_max, 0.0, 1.0)
                    ramp_pts.append(
                        RetimeSpeedPoint(pos_norm=pos_norm, speed_rate=round(seg_spd, 4))
                    )
                    if len(ramp_pts) >= MAX_RETIME_RAMP_POINTS - 1:
                        break
                if ramp_pts and ramp_pts[-1].pos_norm < 0.999:
                    ramp_pts.append(
                        RetimeSpeedPoint(pos_norm=1.0, speed_rate=ramp_pts[-1].speed_rate)
                    )
            return round(avg_speed, 4), ramp_pts

    x_m = qmap.get("XMax")
    y_m = qmap.get("YMax")
    if (
        isinstance(x_m, (int, float))
        and isinstance(y_m, (int, float))
        and y_m > 0.01
        and x_m > 0.01
    ):
        spd = _clamp(float(x_m) / float(y_m), RETIME_SPEED_MIN, RETIME_SPEED_MAX)
        return round(spd, 4), []
    return 1.0, []


def decode_effect_filters(raw: Any) -> ClipTransformParams | None:
    """Decode Resolve EffectFiltersBA zstd-Protobuf DVE transform parameters (zoom X/Y)."""
    if not isinstance(raw, bytes) or len(raw) < 12:
        return None
    unpacked = unpack_resolve_blob(raw)
    if len(unpacked) < 8:
        return None
    # EffectFiltersBA payload may start with 0x80 header byte before protobuf frames
    pb_bytes = unpacked[1:] if unpacked[:1] == b"\x80" else unpacked
    scale_x: float | None = None
    scale_y: float | None = None
    try:
        for fnum, wtype, val in iter_protobuf_fields(pb_bytes):
            if fnum == 1 and wtype == 2 and isinstance(val, bytes):
                for sfnum, swtype, sval in iter_protobuf_fields(val):
                    if sfnum == 9 and swtype == 2 and isinstance(sval, bytes):
                        param_id: int | None = None
                        param_val: float | None = None
                        for pfnum, pwtype, pval in iter_protobuf_fields(sval):
                            if pfnum == 1 and pwtype == 0:
                                param_id = int(pval)
                            elif pfnum == 3 and pwtype == 2 and isinstance(pval, bytes):
                                for vfnum, vwtype, vval in iter_protobuf_fields(pval):
                                    if vfnum == 1 and vwtype == 2 and isinstance(vval, bytes):
                                        for dfnum, dwtype, dval in iter_protobuf_fields(vval):
                                            if (
                                                dfnum == 2
                                                and dwtype == 1
                                                and isinstance(dval, bytes)
                                            ):
                                                param_val = struct.unpack_from("<d", dval, 0)[0]
                        if param_id == 42 and param_val is not None and math.isfinite(param_val):
                            scale_x = param_val
                        elif param_id == 43 and param_val is not None and math.isfinite(param_val):
                            scale_y = param_val
    except ValueError:
        return None

    chosen_scale = scale_x if scale_x is not None else scale_y
    if chosen_scale is None or abs(chosen_scale - 1.0) < 0.002:
        return None
    zoom_pct = round(_clamp(chosen_scale * 100.0, 25.0, 400.0), 2)
    return ClipTransformParams(zoom_pct=zoom_pct)


def decode_marker_blob(raw: Any) -> list[TimelineMarker]:
    """Decode Resolve MarkersBA binary/Qt blob cleanly when present."""
    if not isinstance(raw, bytes) or len(raw) < 12:
        return []
    unpacked = unpack_resolve_blob(raw)
    qmap = parse_qt_variant_map(unpacked)
    markers: list[TimelineMarker] = []
    if qmap and ("Name" in qmap or "FrameId" in qmap):
        name = str(qmap.get("Name") or "Marker")[:80]
        frame = _parse_int_or_frame_prefix(qmap.get("FrameId"), 0)
        dur = max(1, _parse_int_or_frame_prefix(qmap.get("Duration"), 1))
        color = str(qmap.get("Color") or "Cyan")[:24]
        note = str(qmap.get("Note") or "")[:200]
        markers.append(
            TimelineMarker(
                name=name,
                frame=max(0, frame),
                duration_frames=dur,
                color=color,
                note=note,
            )
        )
    return markers


def _extract_jpeg_thumbnail_data_url(seq_fields_blob: Any) -> str:
    if not isinstance(seq_fields_blob, bytes) or len(seq_fields_blob) < 32:
        return ""
    qmap = parse_qt_variant_map(seq_fields_blob)
    thumb_blob = qmap.get("Thumbnail")
    if isinstance(thumb_blob, bytes):
        tmap = parse_qt_variant_map(thumb_blob)
        buf = tmap.get("Buffer")
        if isinstance(buf, bytes) and buf.startswith(b"\xff\xd8\xff") and len(buf) <= 512 * 1024:
            return "data:image/jpeg;base64," + base64.b64encode(buf).decode("ascii")
    return ""


def _extract_node_labels_and_luts(conn: sqlite3.Connection) -> tuple[list[str], list[str], int]:
    """Extract Color node labels & .cube LUT refs from LmVersion + BtLockableBlob."""
    node_labels: list[str] = []
    lut_refs: list[str] = []
    graded_count = 0

    try:
        rows = conn.execute(
            'SELECT HasCorrection, Body FROM "ListMgt::LmVersion" WHERE HasCorrection = 1 LIMIT 32'
        ).fetchall()
    except sqlite3.Error:
        rows = []

    for _hc, body in rows:
        graded_count += 1
        if not isinstance(body, bytes) or len(body) < 8:
            continue
        unpacked = unpack_resolve_blob(body)
        try:
            for fnum, wtype, val in iter_protobuf_fields(unpacked):
                if fnum == 1 and wtype == 2 and isinstance(val, bytes):
                    for sfnum, swtype, sval in iter_protobuf_fields(val):
                        if sfnum == 7 and swtype == 2 and isinstance(sval, bytes):
                            for nfnum, nwtype, nval in iter_protobuf_fields(sval):
                                if nfnum == 6 and nwtype == 2 and isinstance(nval, bytes):
                                    lbl = nval.decode("utf-8", errors="replace").strip()
                                    if lbl and lbl not in node_labels and len(node_labels) < 16:
                                        node_labels.append(lbl)
        except ValueError:
            continue

    try:
        blob_rows = conn.execute(
            'SELECT FieldsBlob FROM "BtLockableBlob" WHERE FieldsBlob IS NOT NULL LIMIT 64'
        ).fetchall()
    except sqlite3.Error:
        blob_rows = []
    for (fb,) in blob_rows:
        if not isinstance(fb, bytes):
            continue
        qmap = parse_qt_variant_map(fb)
        for v in qmap.values():
            if isinstance(v, str) and ".cube" in v.lower():
                clean = v.strip()
                if clean not in lut_refs:
                    lut_refs.append(clean)
        # Also scan UTF-8/ASCII chunks for .cube refs
        txt = fb.decode("latin-1", errors="ignore")
        if ".cube" in txt.lower():
            for match in re.findall(r"[A-Za-z0-9_./\\ -]{1,128}\.cube", txt, flags=re.IGNORECASE):
                tclean = match.strip()
                if tclean and tclean not in lut_refs:
                    lut_refs.append(tclean)

    return node_labels, lut_refs, graded_count


def _default_resolve_projects_roots() -> list[Path]:
    candidates: list[Path] = []
    appdata = os.environ.get("APPDATA")
    if appdata:
        candidates.append(
            Path(appdata)
            / "Blackmagic Design"
            / "DaVinci Resolve"
            / "Support"
            / "Resolve Project Library"
            / "Resolve Projects"
            / "Users"
        )
    return [c for c in candidates if c.is_dir()]


def discover_local_resolve_projects(
    roots: list[Path] | None = None,
) -> list[LocalResolveProjectInfo]:
    """Scan installed DaVinci Resolve SQLite libraries in strict read-only mode."""
    search_roots = roots if roots is not None else _default_resolve_projects_roots()
    found: list[LocalResolveProjectInfo] = []

    for root in search_roots:
        for db_file in sorted(root.glob("*/Projects/*/Project.db")):
            proj_name = db_file.parent.name
            user_name = db_file.parent.parent.parent.name
            try:
                conn = sqlite3.connect(f"file:{db_file.resolve()}?mode=ro", uri=True)
            except sqlite3.Error:
                continue
            try:
                tl_rows = conn.execute('SELECT Name FROM "Sm2Timeline" ORDER BY rowid').fetchall()
                tl_names = [str(r[0]) for r in tl_rows if r and r[0]]
                seq_row = conn.execute(
                    'SELECT FrameRate, Resolution, FieldsBlob FROM "Sm2Sequence" LIMIT 1'
                ).fetchone()
                fps_obj = (
                    decode_sequence_fps(seq_row[0])
                    if seq_row
                    else RationalFrameRate(num=25, den=1)
                )
                w, h = decode_sequence_resolution(seq_row[1]) if seq_row else (1920, 1080)
                thumb_url = _extract_jpeg_thumbnail_data_url(seq_row[2]) if seq_row else ""
                trk_cnt = conn.execute('SELECT COUNT(*) FROM "Sm2TiTrack"').fetchone()[0]
                itm_cnt = conn.execute('SELECT COUNT(*) FROM "Sm2TiItem"').fetchone()[0]
                med_cnt = conn.execute('SELECT COUNT(*) FROM "Sm2MpMedia"').fetchone()[0]
                node_labels, lut_refs, graded_cnt = _extract_node_labels_and_luts(conn)
                found.append(
                    LocalResolveProjectInfo(
                        project_name=proj_name,
                        library_name=f"Local ({user_name})",
                        db_path=str(db_file.resolve()),
                        timeline_names=tl_names,
                        active_timeline=tl_names[0] if tl_names else proj_name,
                        width=w,
                        height=h,
                        fps=fps_obj.ffmpeg_rate,
                        track_count=int(trk_cnt),
                        clip_count=int(itm_cnt),
                        media_count=int(med_cnt),
                        graded_versions=graded_cnt,
                        node_labels=node_labels,
                        lut_refs=lut_refs,
                        thumbnail_data_url=thumb_url,
                    )
                )
            except sqlite3.Error:
                continue
            finally:
                conn.close()
    return found


def parse_resolve_project_db(
    path: Path,
    timeline_name: str | None = None,
    *,
    normalize_start: bool = True,
) -> TimelineDocument:
    """Parse a DaVinci Resolve 18-21 SQLite Project.db into a normalized TimelineDocument."""
    resolved = path.resolve()
    if not resolved.is_file():
        raise FileNotFoundError(f"Resolve Project.db not found: {path}")

    conn = sqlite3.connect(f"file:{resolved}?mode=ro", uri=True)
    try:
        timelines = conn.execute(
            'SELECT Sm2Timeline_id, Name, Sequence FROM "Sm2Timeline" ORDER BY rowid'
        ).fetchall()
        chosen_tl: tuple[Any, ...] | None = None
        if timeline_name:
            target = timeline_name.strip().lower()
            for row in timelines:
                if str(row[1] or "").strip().lower() == target:
                    chosen_tl = row
                    break
        if chosen_tl is None and timelines:
            chosen_tl = timelines[0]

        tl_name = (
            str(chosen_tl[1]).strip()
            if chosen_tl and chosen_tl[1]
            else resolved.parent.name or resolved.stem
        )
        seq_id = str(chosen_tl[2]) if chosen_tl and chosen_tl[2] else None

        seq_row = None
        if seq_id:
            seq_row = conn.execute(
                'SELECT Sm2Sequence_id, FrameRate, Resolution FROM "Sm2Sequence" '
                'WHERE Sm2Sequence_id = ?',
                (seq_id,),
            ).fetchone()
        if seq_row is None:
            seq_row = conn.execute(
                'SELECT Sm2Sequence_id, FrameRate, Resolution FROM "Sm2Sequence" LIMIT 1'
            ).fetchone()

        fps = decode_sequence_fps(seq_row[1] if seq_row else None)
        width, height = decode_sequence_resolution(seq_row[2] if seq_row else None)
        resolved_seq_id = str(seq_row[0]) if seq_row else None

        track_rows: list[tuple[Any, ...]] = []
        if resolved_seq_id:
            track_rows = conn.execute(
                'SELECT trk.Sm2TiTrack_id, trk.Type, trk.UserDefinedName, '
                'rel.DbPropertyName, rel.DbIndex '
                'FROM "Sm2SequenceContainer" sc '
                'JOIN "Sm2SequenceContainer_Sm2TiTrack" rel '
                'ON rel.DbOwner = sc.Sm2SequenceContainer_id '
                'JOIN "Sm2TiTrack" trk ON trk.Sm2TiTrack_id = rel.DbAssociate '
                'WHERE sc.Sm2Sequence_id = ? '
                'ORDER BY rel.DbPropertyName DESC, rel.DbIndex ASC',
                (resolved_seq_id,),
            ).fetchall()
        if not track_rows:
            track_rows = conn.execute(
                'SELECT Sm2TiTrack_id, Type, UserDefinedName, \'Track\', rowid '
                'FROM "Sm2TiTrack" ORDER BY Type ASC, rowid ASC'
            ).fetchall()

        raw_clips_by_track: list[
            tuple[Literal["video", "audio"], int, str, list[TimelineClip]]
        ] = []
        markers: list[TimelineMarker] = []
        v_idx = 0
        a_idx = 0
        min_clip_start: int | None = None

        for trk_id, trk_type, user_name, prop_name, _db_idx in track_rows:
            kind: Literal["video", "audio"] = (
                "audio" if trk_type == 1 or str(prop_name or "").startswith("Audio") else "video"
            )
            if kind == "video":
                v_idx += 1
                t_num = v_idx
                t_label = str(user_name or "").strip() or f"V{v_idx}"
            else:
                a_idx += 1
                t_num = a_idx
                t_label = str(user_name or "").strip() or f"A{a_idx}"

            item_rows = conn.execute(
                'SELECT DbType, Name, Start, Duration, "In", MediaFilePath, MediaFrameRate, '
                'Flags, EffectFiltersBA, MediaTimemapBA, MarkersBA, MediaRef '
                'FROM "Sm2TiItem" WHERE Sm2TiTrack_id = ? ORDER BY Start ASC',
                (trk_id,),
            ).fetchall()

            t_clips: list[TimelineClip] = []
            for (
                _dbtype,
                item_name,
                start_raw,
                dur_raw,
                in_raw,
                src_path,
                src_fps_raw,
                flags_raw,
                fx_blob,
                tm_blob,
                mk_blob,
                media_ref,
            ) in item_rows:
                c_start = max(0, _parse_int_or_frame_prefix(start_raw, 0))
                c_dur = max(0, _parse_int_or_frame_prefix(dur_raw, 0))
                c_in = max(0, _parse_int_or_frame_prefix(in_raw, 0))
                if min_clip_start is None or c_start < min_clip_start:
                    min_clip_start = c_start

                flags = _parse_int_or_frame_prefix(flags_raw, 0)
                src_fps = decode_sequence_fps(src_fps_raw, fps) if src_fps_raw else None
                transform = decode_effect_filters(fx_blob) if kind == "video" else None
                speed_rate, ramp_points = decode_timemap_speed(tm_blob)
                if mk_blob:
                    markers.extend(decode_marker_blob(mk_blob))

                t_clips.append(
                    TimelineClip(
                        name=str(item_name or "clip")[:200],
                        track_index=t_num,
                        media_type=kind,
                        start_frame=c_start,
                        duration_frames=c_dur,
                        source_in_frame=c_in,
                        source_path=str(src_path or ""),
                        media_ref=str(media_ref or ""),
                        source_fps=src_fps,
                        enabled=(flags != 2),
                        speed_rate=speed_rate,
                        retime_ramp_preset="custom" if ramp_points else "constant",
                        retime_ramp_points=ramp_points,
                        transform=transform,
                    )
                )
            t_clips.sort(key=lambda c: (c.start_frame, c.name))
            raw_clips_by_track.append((kind, t_num, t_label, t_clips))

        # Rebase 01:00:00:00 (e.g., frame 90000) timeline lead-in so clips open at 0 in canvas
        origin_frame = 0
        if normalize_start and min_clip_start is not None and min_clip_start >= 18000:
            origin_frame = min_clip_start
            for _k, _idx, _lbl, clips in raw_clips_by_track:
                for c in clips:
                    c.start_frame = max(0, c.start_frame - min_clip_start)

        tracks = [
            TimelineTrack(index=t_num, kind=kind, name=t_label, clips=clips)
            for kind, t_num, t_label, clips in raw_clips_by_track
        ]
        node_labels, lut_refs, graded_cnt = _extract_node_labels_and_luts(conn)
        warnings: list[str] = []
        if node_labels:
            joined_nodes = ", ".join(node_labels[:6])
            warnings.append(
                f"Resolve 21 Project.db Color Nodes ({graded_cnt} graded): {joined_nodes}"
            )
        color_tags = ["Resolve 21 Project.db"]
        if origin_frame > 0:
            color_tags.append(f"Origin Frame: {origin_frame}")
        if lut_refs:
            color_tags.append(f"3D LUTs: {len(lut_refs)}")

        return TimelineDocument(
            name=tl_name,
            source_format="drp",
            fps=fps,
            width=width,
            height=height,
            start_frame=0 if origin_frame > 0 else (min_clip_start or 0),
            tracks=tracks,
            markers=markers,
            color_space_tags=color_tags,
            lut_refs=lut_refs,
            warnings=warnings,
        )
    finally:
        conn.close()
