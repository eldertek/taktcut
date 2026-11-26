"""Clean-room binary & SQLite reader for DaVinci Resolve 18-21 Project.db & .drp/.drt blobs."""

from __future__ import annotations

import base64
import math
import os
import re
import sqlite3
import struct
import zlib
from dataclasses import dataclass, field
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


# DaVinci Resolve Scripting API COMPOSITE_* constant ordering (index -> taktcut mode id)
RESOLVE_COMPOSITE_MODE_MAP: dict[int, str] = {
    0: "normal",
    1: "add",
    2: "subtract",
    3: "difference",
    4: "multiply",
    5: "screen",
    6: "overlay",
    7: "hardlight",
    8: "softlight",
    9: "darken",
    10: "lighten",
    11: "color_dodge",
    12: "color_burn",
    13: "exclusion",
    14: "hue",
    15: "saturation",
    16: "color",
    17: "luminosity",
    18: "divide",
    19: "add",  # Linear Dodge -> Add
    20: "multiply",  # Linear Burn -> Multiply
}

_RESOLVE_CST_INPUT_MAP: tuple[tuple[tuple[str, ...], str], ...] = (
    (("SONY_SLOG3", "SGAMUT3CINE", "SGAMUT3"), "sony_slog3"),
    (("ARRI_LOGC4", "AWG4"), "arri_logc4"),
    (("ARRI_LOGC", "ALEXA"), "arri_logc3"),
    (("RED_LOG3G10", "REDWIDEGAMUT"), "red_log3g10"),
    (("CANON_LOG2", "CANONLOG2", "CANON_CINEMA"), "canon_clog2"),
    (("PANASONIC_VLOG", "VGAMUT"), "panasonic_vlog"),
    (("ACESCCT",), "acescct"),
    (("LINEAR_GAMMA",), "linear_srgb"),
)

_RESOLVE_CST_OUTPUT_MAP: tuple[tuple[tuple[str, ...], str], ...] = (
    (("REC2020", "PQ"), "rec2020_pq"),
    (("REC2020", "ST2084"), "rec2020_pq"),
    (("REC2020", "HLG"), "rec2020_hlg"),
    (("DISPLAY_P3", "P3D65"), "display_p3"),
    (("SRGB",), "srgb_piecewise"),
    (("REC709", "TWOPOINTFOUR"), "rec709_gamma24"),
)

_LUT_FILE_RE = re.compile(r"[^<>\"\r\n]+\.(?:cube|3dl|ilut|olut|csp|lut)$", re.IGNORECASE)


@dataclass
class DecodedEffectFilters:
    """Decoded DaVinci Resolve Inspector parameters from EffectFiltersBA."""

    transform: ClipTransformParams | None = None
    composite_mode: str = "normal"
    opacity: float = 100.0
    fade_in_s: float = 0.0
    fade_out_s: float = 0.0
    audio_gain_db: float = 0.0


@dataclass
class DecodedResolveGrade:
    """Decoded DaVinci Resolve Color Page VersionBody (CST + primaries + LUTs)."""

    cst_config: dict[str, Any] = field(default_factory=dict)
    color_grade: dict[str, Any] = field(default_factory=dict)
    lut_refs: list[str] = field(default_factory=list)
    color_tags: list[str] = field(default_factory=list)


def _zigzag_decode(raw: int) -> int:
    return (raw >> 1) ^ -(raw & 1)


def _strip_resolve_pb_envelope(raw: bytes) -> bytes:
    """Decompress Zstd/zlib and strip Resolve 00000002 + u32 + 0x80/0x81 envelope."""
    if not raw:
        return b""
    if len(raw) > 9 and raw[:4] in (b"\x00\x00\x00\x01", b"\x00\x00\x00\x02"):
        marker = raw[8]
        if marker == 0x80:
            return raw[9:]
        if marker == 0x81:
            return unpack_resolve_blob(raw[9:])
    unpacked = unpack_resolve_blob(raw)
    if unpacked[:1] == b"\x80":
        return unpacked[1:]
    return unpacked


def _decode_proto_variant(buf: bytes) -> tuple[str, Any] | None:
    """Decode BtCommonProtoNamespace.ProtoVariant into (kind, value)."""
    for fnum, wtype, val in iter_protobuf_fields(buf):
        if fnum == 1 and wtype == 0:
            return ("int", _zigzag_decode(int(val)))
        if fnum == 2 and wtype == 1 and isinstance(val, bytes):
            dval = struct.unpack_from("<d", val, 0)[0]
            return ("double", dval if math.isfinite(dval) else 0.0)
        if fnum == 3 and wtype == 2 and isinstance(val, bytes):
            return ("string", val.decode("utf-8", errors="replace"))
        if fnum == 4 and wtype == 0:
            return ("uint", int(val))
        if fnum == 5 and wtype == 0:
            return ("bool", bool(val))
    return None


def decode_clip_effect_filters(raw: Any, *, fps: float = 25.0) -> DecodedEffectFilters:
    """Decode Resolve EffectFiltersBA (Composite, Transform, Crop, Fades, Audio Volume)."""
    result = DecodedEffectFilters()
    if not isinstance(raw, bytes) or len(raw) < 12:
        return result
    pb_bytes = _strip_resolve_pb_envelope(raw)
    if len(pb_bytes) < 4:
        return result

    safe_fps = max(1.0, float(fps))
    scale_x: float | None = None
    scale_y: float | None = None
    pos_x_frac: float | None = None
    pos_y_frac: float | None = None
    rot_deg: float | None = None
    crop_l: float = 0.0
    crop_r: float = 0.0
    crop_t: float = 0.0
    crop_b: float = 0.0

    try:
        for fnum, wtype, val in iter_protobuf_fields(pb_bytes):
            if fnum != 1 or wtype != 2 or not isinstance(val, bytes):
                continue
            flt_type: int | None = None
            flt_enabled = True
            params_raw: list[bytes] = []
            for sfnum, swtype, sval in iter_protobuf_fields(val):
                if sfnum == 1 and swtype == 0:
                    flt_type = _zigzag_decode(int(sval))
                elif sfnum == 2 and swtype == 0:
                    flt_enabled = bool(sval)
                elif sfnum == 9 and swtype == 2 and isinstance(sval, bytes):
                    params_raw.append(sval)
            if not flt_enabled:
                continue

            for pbytes in params_raw:
                param_id: int | None = None
                variant: tuple[str, Any] | None = None
                for pfnum, pwtype, pval in iter_protobuf_fields(pbytes):
                    if pfnum == 1 and pwtype == 0:
                        param_id = int(pval)
                    elif pfnum == 3 and pwtype == 2 and isinstance(pval, bytes):
                        for vfnum, vwtype, vval in iter_protobuf_fields(pval):
                            if vfnum == 1 and vwtype == 2 and isinstance(vval, bytes):
                                variant = _decode_proto_variant(vval)
                if param_id is None or variant is None:
                    continue
                _vkind, vval_obj = variant

                # Filter 1: Composite (0=mode, 1=opacity %)
                if flt_type == 1:
                    if param_id == 0 and isinstance(vval_obj, int):
                        result.composite_mode = RESOLVE_COMPOSITE_MODE_MAP.get(vval_obj, "normal")
                    elif param_id == 1 and isinstance(vval_obj, (int, float)):
                        result.opacity = round(_clamp(float(vval_obj), 0.0, 100.0), 2)

                # Filter 2 (or fallback when type absent): Transform
                elif flt_type in (2, None):
                    if param_id == 40 and isinstance(vval_obj, (int, float)):
                        pos_x_frac = float(vval_obj)
                    elif param_id == 41 and isinstance(vval_obj, (int, float)):
                        pos_y_frac = float(vval_obj)
                    elif param_id == 42 and isinstance(vval_obj, (int, float)):
                        scale_x = float(vval_obj)
                    elif param_id == 43 and isinstance(vval_obj, (int, float)):
                        scale_y = float(vval_obj)
                    elif param_id == 47 and isinstance(vval_obj, (int, float)):
                        rot_deg = float(vval_obj)

                # Filter 3: Crop (54=left, 55=right, 56=top, 57=bottom as % or fraction)
                elif flt_type == 3 and isinstance(vval_obj, (int, float)):
                    cval = float(vval_obj)
                    pct = cval * 100.0 if 0.0 < cval <= 0.45 else cval
                    if 0.0 < pct <= 45.0:
                        if param_id == 54:
                            crop_l = round(pct, 2)
                        elif param_id == 55:
                            crop_r = round(pct, 2)
                        elif param_id == 56:
                            crop_t = round(pct, 2)
                        elif param_id == 57:
                            crop_b = round(pct, 2)

                # Filter 36: Clip Video Fades (137=in frames, 138=out frames)
                elif flt_type == 36 and isinstance(vval_obj, (int, float)):
                    secs = _clamp(float(vval_obj) / safe_fps, 0.0, 5.0)
                    if param_id == 137:
                        result.fade_in_s = round(secs, 3)
                    elif param_id == 138:
                        result.fade_out_s = round(secs, 3)

                # Filter 62: Clip Audio Volume & Fades (95=dB, 97=in frames, 98=out frames)
                elif flt_type == 62 and isinstance(vval_obj, (int, float)):
                    if param_id == 95:
                        result.audio_gain_db = round(_clamp(float(vval_obj), -24.0, 12.0), 2)
                    elif param_id == 97:
                        result.fade_in_s = round(_clamp(float(vval_obj) / safe_fps, 0.0, 5.0), 3)
                    elif param_id == 98:
                        result.fade_out_s = round(_clamp(float(vval_obj) / safe_fps, 0.0, 5.0), 3)
    except ValueError:
        return result

    chosen_scale = scale_x if scale_x is not None else scale_y
    zoom_pct = (
        round(_clamp(chosen_scale * 100.0, 10.0, 300.0), 2)
        if chosen_scale is not None
        else 100.0
    )
    px_pct = round(_clamp((pos_x_frac or 0.0) * 100.0, -100.0, 100.0), 2)
    # DaVinci Resolve stores Position Y as positive=UP, negative=DOWN;
    # TaktCut canvas and FFmpeg coordinates use positive=DOWN, negative=UP.
    py_pct = round(_clamp(-(pos_y_frac or 0.0) * 100.0, -100.0, 100.0), 2)
    rot_val = round(_clamp(rot_deg or 0.0, -180.0, 180.0), 2)

    has_transform = (
        abs(zoom_pct - 100.0) > 0.15
        or abs(px_pct) > 0.05
        or abs(py_pct) > 0.05
        or abs(rot_val) > 0.05
        or (crop_l + crop_r + crop_t + crop_b) > 0.05
    )
    if has_transform:
        if crop_l + crop_r > 85.0:
            crop_l = crop_r = 0.0
        if crop_t + crop_b > 85.0:
            crop_t = crop_b = 0.0
        result.transform = ClipTransformParams(
            zoom_pct=zoom_pct,
            pos_x_pct=px_pct,
            pos_y_pct=py_pct,
            rotation_deg=rot_val,
            crop_left_pct=crop_l,
            crop_right_pct=crop_r,
            crop_top_pct=crop_t,
            crop_bottom_pct=crop_b,
        )
    return result


def decode_effect_filters(raw: Any) -> ClipTransformParams | None:
    """Decode Resolve EffectFiltersBA zstd-Protobuf DVE transform parameters."""
    return decode_clip_effect_filters(raw).transform


def _decode_ofx_param_val(buf: bytes) -> Any:
    """Decode ProtoVaCommonNamespace.OFXParamValueType into a Python scalar."""
    for fnum, wtype, val in iter_protobuf_fields(buf):
        if fnum == 1 and wtype == 0:
            return _zigzag_decode(int(val))
        if fnum == 2 and wtype == 1 and isinstance(val, bytes):
            d = struct.unpack_from("<d", val, 0)[0]
            return d if math.isfinite(d) else 0.0
        if fnum == 3 and wtype == 0:
            return bool(val)
        if fnum == 5 and wtype == 2 and isinstance(val, bytes):
            return val.decode("utf-8", errors="replace")
    return None


def _decode_ofx_params_msg(buf: bytes) -> tuple[str, bool, dict[str, Any]]:
    """Decode ProtoVaCommonNamespace.OFXParams -> (plugin_id, enabled, params_dict)."""
    plugin_id = ""
    enabled = True
    params: dict[str, Any] = {}
    for fnum, wtype, val in iter_protobuf_fields(buf):
        if fnum == 2 and wtype == 2 and isinstance(val, bytes):
            plugin_id = val.decode("utf-8", errors="replace")
        elif fnum == 4 and wtype == 0:
            enabled = bool(val)
        elif fnum == 5 and wtype == 2 and isinstance(val, bytes):
            pname = ""
            pval: Any = None
            for pfnum, pwtype, pval_raw in iter_protobuf_fields(val):
                if pfnum == 1 and pwtype == 2 and isinstance(pval_raw, bytes):
                    pname = pval_raw.decode("utf-8", errors="replace")
                elif pfnum == 2 and pwtype == 2 and isinstance(pval_raw, bytes):
                    pval = _decode_ofx_param_val(pval_raw)
            if pname and pval is not None:
                params[pname] = pval
    return plugin_id, enabled, params


def _decode_va_param_value(buf: bytes) -> tuple[str, Any] | None:
    """Decode ProtoVaCommonNamespace.ParamValueType scalar/OFX/HDR values."""
    for fnum, wtype, val in iter_protobuf_fields(buf):
        if fnum == 1 and wtype == 5 and isinstance(val, bytes):
            fv = struct.unpack_from("<f", val, 0)[0]
            return ("float", fv if math.isfinite(fv) else 0.0)
        if fnum == 2 and wtype == 0:
            return ("int", _zigzag_decode(int(val)))
        if fnum == 3 and wtype == 0:
            return ("uint", int(val))
        if fnum == 4 and wtype == 0:
            return ("bool", bool(val))
        if fnum == 5 and wtype == 2 and isinstance(val, bytes):
            return ("bytes", val)
        if fnum == 6 and wtype == 1 and isinstance(val, bytes):
            dv = struct.unpack_from("<d", val, 0)[0]
            return ("double", dv if math.isfinite(dv) else 0.0)
        if fnum == 16 and wtype == 2 and isinstance(val, bytes):
            # HDRGradeableKeyframeableParamsList
            zones: list[tuple[str, float]] = []
            for zf, zw, zv in iter_protobuf_fields(val):
                if zf == 1 and zw == 2 and isinstance(zv, bytes):
                    zname = ""
                    gain_jz = 0.0
                    for kf, kw, kv in iter_protobuf_fields(zv):
                        if kf == 1 and kw == 2 and isinstance(kv, bytes):
                            zname = kv.decode("utf-8", errors="replace")
                        elif kf == 2 and kw == 5 and isinstance(kv, bytes):
                            gv = struct.unpack_from("<f", kv, 0)[0]
                            if math.isfinite(gv):
                                gain_jz = gv
                    if zname:
                        zones.append((zname, gain_jz))
            return ("hdr_zones", zones)
        if fnum == 21 and wtype == 2 and isinstance(val, bytes):
            return ("ofx", _decode_ofx_params_msg(val))
    return None


def _match_cst_input_space(cs: str, gamma: str) -> str | None:
    combined = f"{cs} {gamma}".upper()
    for tokens, space_id in _RESOLVE_CST_INPUT_MAP:
        if any(tok in combined for tok in tokens):
            return space_id
    return None


def _match_cst_output_space(cs: str, gamma: str) -> str | None:
    combined = f"{cs} {gamma}".upper()
    for tokens, space_id in _RESOLVE_CST_OUTPUT_MAP:
        if all(tok in combined for tok in tokens):
            return space_id
    if "REC709" in combined or "TWOPOINTFOUR" in combined:
        return "rec709_gamma24"
    return None


def decode_resolve_color_version(raw: Any) -> DecodedResolveGrade:
    """Decode Resolve ProtoVersion.VersionBody into CST config, primary grade, and LUT refs."""
    result = DecodedResolveGrade()
    if not isinstance(raw, bytes) or len(raw) < 12:
        return result
    pb_bytes = _strip_resolve_pb_envelope(raw)
    if len(pb_bytes) < 4:
        return result

    nodes_raw: list[tuple[int, bytes]] = []
    try:
        for fnum, wtype, val in iter_protobuf_fields(pb_bytes):
            if fnum == 1 and wtype == 2 and isinstance(val, bytes):
                for gfnum, gwtype, gval in iter_protobuf_fields(val):
                    if gfnum == 7 and gwtype == 2 and isinstance(gval, bytes):
                        disp_idx = 0
                        for nfnum, nwtype, nval in iter_protobuf_fields(gval):
                            if nfnum == 2 and nwtype == 0:
                                disp_idx = int(nval)
                        nodes_raw.append((disp_idx, gval))
    except ValueError:
        return result

    nodes_raw.sort(key=lambda item: item[0])

    cst_in_space: str | None = None
    cst_out_space: str | None = None
    cst_fwd_ootf = True
    lift = [0.0, 0.0, 0.0]
    gamma = [0.0, 0.0, 0.0]
    gain = [0.0, 0.0, 0.0]
    contrast = 1.0
    saturation = 1.0
    temperature = 0.0
    has_grade_delta = False

    for _disp_idx, nbytes in nodes_raw:
        node_enabled = True
        ofx_list: list[tuple[str, bool, dict[str, Any]]] = []
        reg_params: dict[int, tuple[str, Any]] = {}
        has_active_window = False
        has_active_qualifier = False

        try:
            for nfnum, nwtype, nval in iter_protobuf_fields(nbytes):
                # NodeParams (field 10) -> enable flag & OFX plugins
                if nfnum == 10 and nwtype == 2 and isinstance(nval, bytes):
                    for npf, npw, npv in iter_protobuf_fields(nval):
                        if npf == 1 and npw == 2 and isinstance(npv, bytes):
                            pkey: int | None = None
                            pval_dec: tuple[str, Any] | None = None
                            for pf, pw, pv in iter_protobuf_fields(npv):
                                if pf == 1 and pw == 0:
                                    pkey = int(pv)
                                elif pf == 2 and pw == 2 and isinstance(pv, bytes):
                                    pval_dec = _decode_va_param_value(pv)
                            if pkey == 0xC0000001 and pval_dec and pval_dec[0] == "int":
                                node_enabled = bool(pval_dec[1])
                            elif pval_dec and pval_dec[0] == "ofx":
                                ofx_list.append(pval_dec[1])
                # MarkStore (9) -> marktimelines (1) -> marks (6) -> mark (2)
                elif nfnum == 9 and nwtype == 2 and isinstance(nval, bytes):
                    for msf, msw, msv in iter_protobuf_fields(nval):
                        if msf != 1 or msw != 2 or not isinstance(msv, bytes):
                            continue
                        grp_id = 0
                        first_mark: bytes | None = None
                        for mtf, mtw, mtv in iter_protobuf_fields(msv):
                            if mtf == 1 and mtw == 0:
                                grp_id = int(mtv)
                            elif (
                                mtf == 6
                                and mtw == 2
                                and isinstance(mtv, bytes)
                                and first_mark is None
                            ):
                                for mof, mow, mov in iter_protobuf_fields(mtv):
                                    if mof == 2 and mow == 2 and isinstance(mov, bytes):
                                        first_mark = mov
                        if first_mark is None:
                            continue
                        for mkf, mkw, mkv in iter_protobuf_fields(first_mark):
                            if mkf != 3 or mkw != 2 or not isinstance(mkv, bytes):
                                continue
                            pkey = None
                            pval_dec = None
                            for pf, pw, pv in iter_protobuf_fields(mkv):
                                if pf == 1 and pw == 0:
                                    pkey = int(pv)
                                elif pf == 2 and pw == 2 and isinstance(pv, bytes):
                                    pval_dec = _decode_va_param_value(pv)
                            if pkey is None or pval_dec is None:
                                continue
                            # Detect enabled Power Windows (0x085/087/08b/08d/08f)
                            if (
                                grp_id in (3, 4, 5, 6, 18)
                                and pval_dec[0] in ("int", "bool", "float")
                                and (pkey & 0x0000FFFF) in (0x0001, 0x0002, 0x000E)
                                and bool(pval_dec[1])
                            ):
                                has_active_window = True
                            # Detect non-neutral HSL qualifier width < 0.98
                            if (
                                pkey == 0x0830000F
                                and isinstance(pval_dec[1], (int, float))
                                and float(pval_dec[1]) < 0.98
                            ):
                                has_active_qualifier = True
                            reg_params[pkey] = pval_dec
        except ValueError:
            continue

        if not node_enabled:
            continue

        # 1. Inspect OFX plugins on this node (CST & Film Look Creator)
        for pid, ofx_en, ofx_p in ofx_list:
            if not ofx_en:
                continue
            low_pid = pid.lower()
            if "colorspacetransform" in low_pid:
                in_cs = str(ofx_p.get("inputColorSpace") or "")
                in_gm = str(ofx_p.get("inputGamma") or "")
                out_cs = str(ofx_p.get("outputColorSpace") or "")
                out_gm = str(ofx_p.get("outputGamma") or "")
                matched_in = _match_cst_input_space(in_cs, in_gm)
                if matched_in and cst_in_space is None:
                    cst_in_space = matched_in
                matched_out = _match_cst_output_space(out_cs, out_gm)
                if matched_out:
                    cst_out_space = matched_out
                    if "doFwdOOTF" in ofx_p:
                        cst_fwd_ootf = bool(ofx_p["doFwdOOTF"])
            elif "filmlook" in low_pid and not has_active_window and not has_active_qualifier:
                fl_c = ofx_p.get("colorContrast2")
                if isinstance(fl_c, (int, float)) and abs(float(fl_c) - 1.0) > 0.02:
                    contrast *= 1.0 + (float(fl_c) - 1.0) * 0.30
                    has_grade_delta = True
                fl_s = ofx_p.get("flPreSat")
                if isinstance(fl_s, (int, float)) and abs(float(fl_s) - 1.0) > 0.02:
                    saturation *= 0.72 + 0.28 * float(fl_s)
                    has_grade_delta = True

        # 2. Extract .cube LUT references
        lut_entry = reg_params.get(0x860000A1)
        if lut_entry and lut_entry[0] == "bytes" and isinstance(lut_entry[1], bytes):
            lut_txt = lut_entry[1].decode("utf-8", errors="replace").strip("\x00 ")
            if lut_txt and _LUT_FILE_RE.search(lut_txt) and lut_txt not in result.lut_refs:
                result.lut_refs.append(lut_txt)

        # Skip localized masked/qualified nodes when synthesizing full-frame primary grade
        if has_active_window or has_active_qualifier:
            continue

        def _fval(
            key: int,
            params: dict[int, tuple[str, Any]] = reg_params,
        ) -> float | None:
            item = params.get(key)
            if item and item[0] in ("float", "double", "int"):
                return float(item[1])
            return None

        # Lift R/G/B/Y (default 0.0)
        ly = _fval(0x0600001B) or 0.0
        for ch_i, k in enumerate((0x06000018, 0x06000019, 0x0600001A)):
            lv = _fval(k)
            if lv is not None or abs(ly) > 1e-4:
                lift[ch_i] += ((lv if lv is not None else 0.0) + ly * 0.5) * 0.35
                has_grade_delta = True

        # Gamma R/G/B/Y (default 0.0)
        gy = _fval(0x06000025) or 0.0
        for ch_i, k in enumerate((0x06000022, 0x06000023, 0x06000024)):
            gv = _fval(k)
            if gv is not None or abs(gy) > 1e-4:
                g_delta = ((gv if gv is not None else 0.0) + gy * 0.5) * 0.22
                gamma[ch_i] += _clamp(g_delta, -0.35, 0.35)
                has_grade_delta = True

        # Gain R/G/B/Y (default 1.0)
        ny = _fval(0x06000020)
        ny_d = (ny - 1.0) if ny is not None else 0.0
        for ch_i, k in enumerate((0x0600001D, 0x0600001E, 0x0600001F)):
            nv = _fval(k)
            if nv is not None or abs(ny_d) > 1e-4:
                gain[ch_i] += (((nv - 1.0) if nv is not None else 0.0) + ny_d * 0.5) * 0.40
                has_grade_delta = True

        # Offset R/G/B (default 0.0)
        for ch_i, k in enumerate((0x0600007D, 0x0600007E, 0x0600007F)):
            ov = _fval(k)
            if ov is not None and abs(ov) > 1e-4:
                delta = _clamp(ov * 0.22, -0.25, 0.25)
                lift[ch_i] += delta * 0.6
                gamma[ch_i] += delta
                gain[ch_i] += delta * 0.6
                has_grade_delta = True

        # Contrast (default 1.0) & Saturation (default 1.0 = 50 in Resolve UI)
        cv = _fval(0x860000C1)
        if cv is not None and abs(cv - 1.0) > 0.01:
            contrast *= _clamp(cv, 0.55, 1.75)
            has_grade_delta = True
        sv = _fval(0x06000005)
        if sv is not None and abs(sv - 1.0) > 0.01:
            saturation *= _clamp(sv, 0.0, 2.2)
            has_grade_delta = True

        # Temperature (Resolve Kelvin shift around 0 in wide-gamut pipeline)
        tv = _fval(0x86000115)
        if tv is not None and abs(tv) > 5.0:
            temperature += _clamp(tv / 6500.0, -0.45, 0.45)
            has_grade_delta = True

        # RGB Mixer diagonal R>R, G>G, B>B (default 1.0)
        for ch_i, k in enumerate((0x860000A7, 0x860000AB, 0x860000AF)):
            mv = _fval(k)
            if mv is not None and abs(mv - 1.0) > 0.01:
                boost = _clamp((mv - 1.0) * 0.35, -0.25, 0.25)
                gamma[ch_i] += boost * 0.6
                gain[ch_i] += boost
                has_grade_delta = True

        # HDR Zones (Global / Light / Dark exposure in stops)
        for pval_entry in reg_params.values():
            if pval_entry[0] == "hdr_zones":
                for zname, g_jz in pval_entry[1]:
                    if abs(g_jz) < 0.02:
                        continue
                    zl = zname.lower()
                    if zl == "global":
                        exp_d = _clamp(g_jz * 0.14, -0.22, 0.22)
                        for ch_i in range(3):
                            gamma[ch_i] += exp_d
                            gain[ch_i] += exp_d
                        has_grade_delta = True
                    elif zl == "dark":
                        exp_d = _clamp(g_jz * 0.10, -0.15, 0.15)
                        for ch_i in range(3):
                            lift[ch_i] += exp_d
                        has_grade_delta = True
                    elif zl in ("light", "highlight"):
                        exp_d = _clamp(g_jz * 0.09, -0.15, 0.15)
                        for ch_i in range(3):
                            gain[ch_i] += exp_d
                        has_grade_delta = True

    if cst_in_space is not None and cst_in_space != "rec709_gamma24":
        dst_space = cst_out_space or "rec709_gamma24"
        # Forward OOTF to Rec.709 Gamma 2.4 aligns middle grey (~0.39) with Resolve RCM/CST.
        cst_exp_ev = -0.35 if (dst_space == "rec709_gamma24" and cst_fwd_ootf) else 0.0
        result.cst_config = {
            "enabled": True,
            "preset_id": f"{cst_in_space}_to_{dst_space}",
            "input_space": cst_in_space,
            "output_space": dst_space,
            "bradford_adaptation": True,
            "gamut_mapping_mode": "saturation_compress",
            "gamut_compression": 0.30,
            "tone_mapping_mode": "filmic_aces",
            "exposure_ev": cst_exp_ev,
            "contrast": 1.08,
            "shoulder_strength": 0.45,
            "toe_strength": 0.25,
            "saturation": 1.06,
        }
        result.color_tags.append(f"CST:{cst_in_space}->{dst_space}")

    if has_grade_delta:
        clamped_lift = tuple(round(_clamp(v, -0.55, 0.55), 4) for v in lift)
        clamped_gamma = tuple(round(_clamp(v, -0.55, 0.55), 4) for v in gamma)
        clamped_gain = tuple(round(_clamp(v, -0.55, 0.55), 4) for v in gain)
        clamped_contrast = round(_clamp(contrast, 0.65, 1.55), 4)
        clamped_sat = round(_clamp(saturation, 0.0, 2.0), 4)
        clamped_temp = round(_clamp(temperature, -0.65, 0.65), 4)
        if (
            clamped_lift != (0.0, 0.0, 0.0)
            or clamped_gamma != (0.0, 0.0, 0.0)
            or clamped_gain != (0.0, 0.0, 0.0)
            or abs(clamped_contrast - 1.0) > 0.005
            or abs(clamped_sat - 1.0) > 0.005
            or abs(clamped_temp) > 0.005
        ):
            result.color_grade = {
                "lift": list(clamped_lift),
                "gamma": list(clamped_gamma),
                "gain": list(clamped_gain),
                "contrast": clamped_contrast,
                "saturation": clamped_sat,
                "temperature": clamped_temp,
            }

    return result


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
                decoded_fx = decode_clip_effect_filters(fx_blob, fps=fps.as_float)
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
                        audio_gain_db=decoded_fx.audio_gain_db if kind == "audio" else 0.0,
                        fade_in_s=decoded_fx.fade_in_s,
                        fade_out_s=decoded_fx.fade_out_s,
                        speed_rate=speed_rate,
                        retime_ramp_preset="custom" if ramp_points else "constant",
                        retime_ramp_points=ramp_points,
                        transform=decoded_fx.transform if kind == "video" else None,
                        composite_mode=decoded_fx.composite_mode if kind == "video" else "normal",
                        opacity=decoded_fx.opacity if kind == "video" else 100.0,
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
