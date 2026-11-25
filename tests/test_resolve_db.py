"""Clean-room tests for DaVinci Resolve 21 Project.db binary/SQLite decoding and math."""

from __future__ import annotations

import io
import sqlite3
import struct
import zipfile
from pathlib import Path

import pytest
import zstandard as zstd

from taktcut.color import (
    RESOLVE_CONTRAST_PIVOT_REC709,
    ColorGradeParams,
    apply_resolve_grade_rgb,
)
from taktcut.drp import load_timeline, parse_drp
from taktcut.resolve_db import (
    decode_effect_filters,
    decode_sequence_fps,
    decode_sequence_resolution,
    decode_timemap_speed,
    parse_qt_variant_map,
    parse_resolve_project_db,
    unpack_resolve_blob,
)
from taktcut.ui.server import create_ui_server


def _encode_qstring(text: str) -> bytes:
    raw = text.encode("utf-16-be")
    return struct.pack(">I", len(raw)) + raw


def _encode_qvariant_map(entries: list[tuple[str, str, object]]) -> bytes:
    out = bytearray(struct.pack(">II", 1, len(entries)))
    for key, kind, val in entries:
        out.extend(_encode_qstring(key))
        if kind == "double":
            out.extend(struct.pack(">IBd", 6, 0, float(val)))  # type: ignore[arg-type]
        elif kind == "str":
            out.extend(struct.pack(">IB", 10, 0))
            out.extend(_encode_qstring(str(val)))
        elif kind == "bytes":
            raw = bytes(val)  # type: ignore[arg-type]
            out.extend(struct.pack(">IBI", 12, 0, len(raw)))
            out.extend(raw)
        elif kind == "int":
            out.extend(struct.pack(">IBi", 2, 0, int(val)))  # type: ignore[arg-type]
    return bytes(out)


def _varint(val: int) -> bytes:
    buf = bytearray()
    while True:
        b = val & 0x7F
        val >>= 7
        if val:
            buf.append(b | 0x80)
        else:
            buf.append(b)
            return bytes(buf)


def _pb_msg(field_num: int, payload: bytes) -> bytes:
    return _varint((field_num << 3) | 2) + _varint(len(payload)) + payload


def _pb_varint(field_num: int, val: int) -> bytes:
    return _varint((field_num << 3) | 0) + _varint(val)


def _pb_f64(field_num: int, val: float) -> bytes:
    return _varint((field_num << 3) | 1) + struct.pack("<d", val)


def _build_synthetic_resolve_db(db_path: Path) -> None:
    conn = sqlite3.connect(db_path)
    conn.executescript(
        """
        CREATE TABLE "Sm2Timeline" (Sm2Timeline_id TEXT, DbType TEXT, Name TEXT, Sequence TEXT);
        CREATE TABLE "Sm2Sequence" (
            Sm2Sequence_id TEXT, DbType TEXT, FrameRate BLOB, Resolution BLOB, FieldsBlob BLOB
        );
        CREATE TABLE "Sm2SequenceContainer" (Sm2SequenceContainer_id TEXT, Sm2Sequence_id TEXT);
        CREATE TABLE "Sm2SequenceContainer_Sm2TiTrack" (
            DbOwner TEXT, DbAssociate TEXT, DbPropertyName TEXT, DbIndex INT
        );
        CREATE TABLE "Sm2TiTrack" (
            Sm2TiTrack_id TEXT, DbType TEXT, Type INT, UserDefinedName TEXT, Flags INT
        );
        CREATE TABLE "Sm2TiItem" (
            Sm2TiItem_id TEXT, DbType TEXT, Name TEXT, Start INT, Duration INT, "In" TEXT,
            MediaFilePath TEXT, MediaFrameRate BLOB, Flags INT, EffectFiltersBA BLOB,
            MediaTimemapBA BLOB, MarkersBA BLOB, MediaRef TEXT, Sm2TiTrack_id TEXT
        );
        CREATE TABLE "Sm2MpMedia" (Sm2MpMedia_id TEXT, Name TEXT);
        CREATE TABLE "ListMgt::LmVersion" (Name TEXT, HasCorrection INT, Body BLOB);
        CREATE TABLE "BtLockableBlob" (BtLockableBlob_id TEXT, FieldsBlob BLOB);
        """
    )

    fps_25 = struct.pack("<d", 25.0) + b"\x00" * 8
    res_1080p = struct.pack(">QQ", 1920, 1080)
    conn.execute(
        'INSERT INTO "Sm2Timeline" VALUES (?, ?, ?, ?)',
        ("tl-1", "Sm2Timeline", "Main_Cut_v6", "seq-1"),
    )
    conn.execute(
        'INSERT INTO "Sm2Sequence" VALUES (?, ?, ?, ?, ?)',
        ("seq-1", "Sm2Sequence", fps_25, res_1080p, b""),
    )
    conn.execute('INSERT INTO "Sm2SequenceContainer" VALUES (?, ?)', ("sc-1", "seq-1"))
    conn.execute(
        'INSERT INTO "Sm2TiTrack" VALUES (?, ?, ?, ?, ?)',
        ("trk-v1", "Sm2TiTrack", 0, "Plans", 0),
    )
    conn.execute(
        'INSERT INTO "Sm2TiTrack" VALUES (?, ?, ?, ?, ?)',
        ("trk-a1", "Sm2TiTrack", 1, "Voix", 0),
    )
    conn.execute(
        'INSERT INTO "Sm2SequenceContainer_Sm2TiTrack" VALUES (?, ?, ?, ?)',
        ("sc-1", "trk-v1", "VideoTrackVec", 0),
    )
    conn.execute(
        'INSERT INTO "Sm2SequenceContainer_Sm2TiTrack" VALUES (?, ?, ?, ?)',
        ("sc-1", "trk-a1", "AudioTrackVec", 0),
    )

    # Synthetic Zstd EffectFiltersBA with zoom_x = 1.06 (field 42)
    param_msg = _pb_varint(1, 42) + _pb_msg(3, _pb_msg(1, _pb_f64(2, 1.06)))
    fx_raw = _pb_msg(1, _pb_varint(1, 4) + _pb_msg(9, param_msg))
    fx_comp = b"\x00\x00\x00\x02\x00\x00\x00\x00\x81" + zstd.ZstdCompressor().compress(fx_raw)

    # Synthetic MediaTimemapBA with 2.0x speed (5.72 / 2.86)
    kf_pb = b"\x80" + _pb_msg(1, b"") + _pb_msg(1, _pb_f64(1, 5.72) + _pb_f64(2, 2.86))
    tm_blob = _encode_qvariant_map([
        ("XMax", "double", 5.72),
        ("YMax", "double", 2.86),
        ("KeyframesBA", "bytes", kf_pb),
        ("DbType", "str", "Sm2TimeMap"),
    ])

    conn.execute(
        'INSERT INTO "Sm2TiItem" VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        (
            "itm-v1",
            "Sm2TiVideoClip",
            "FX3_2507.MP4",
            90000,
            100,
            "18|000000000000c03d",
            "media/FX3_2507.MP4",
            struct.pack("<d", 50.0) + b"\x00" * 8,
            0,
            fx_comp,
            tm_blob,
            b"",
            "med-1",
            "trk-v1",
        ),
    )
    conn.execute(
        'INSERT INTO "Sm2TiItem" VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        (
            "itm-a1",
            "Sm2TiAudioClip",
            "VO_Main.wav",
            90000,
            100,
            "0",
            "audio/VO_Main.wav",
            fps_25,
            0,
            b"",
            b"",
            b"",
            "med-2",
            "trk-a1",
        ),
    )

    # Graded Color nodes + LUT ref
    node_blob = _pb_msg(
        1,
        _pb_msg(7, _pb_msg(6, b"CST in"))
        + _pb_msg(7, _pb_msg(6, b"Balance nuit"))
        + _pb_msg(7, _pb_msg(6, b"CST out")),
    )
    conn.execute(
        'INSERT INTO "ListMgt::LmVersion" VALUES (?, ?, ?)',
        ("Version 1", 1, b"\x81" + zstd.ZstdCompressor().compress(node_blob)),
    )
    conn.execute(
        'INSERT INTO "BtLockableBlob" VALUES (?, ?)',
        ("b-1", _encode_qvariant_map([("Lut", "str", "Alister_V-Look_V3_-2p00.cube")])),
    )
    conn.commit()
    conn.close()


def test_decode_primitives_and_bounds() -> None:
    assert decode_sequence_fps(struct.pack("<d", 25.0) + b"\x00" * 8).ffmpeg_rate == "25"
    ntsc_fps = decode_sequence_fps(struct.pack("<d", 23.976023976) + b"\x00" * 8)
    assert ntsc_fps.ffmpeg_rate == "24000/1001"
    assert decode_sequence_resolution(struct.pack(">QQ", 3840, 2160)) == (3840, 2160)

    qblob = _encode_qvariant_map([
        ("XMax", "double", 5.72),
        ("YMax", "double", 2.86),
        ("DbType", "str", "Sm2TimeMap"),
    ])
    parsed = parse_qt_variant_map(qblob)
    assert parsed["DbType"] == "Sm2TimeMap"
    assert parsed["XMax"] == pytest.approx(5.72)

    speed, pts = decode_timemap_speed(qblob)
    assert speed == pytest.approx(2.0)
    assert pts == []

    # Zstd header decompression & decode_effect_filters
    param_msg = _pb_varint(1, 42) + _pb_msg(3, _pb_msg(1, _pb_f64(2, 1.04)))
    fx_raw = _pb_msg(1, _pb_msg(9, param_msg))
    comp = b"\x00\x00\x00\x02\x00\x00\x00\x00\x81" + zstd.ZstdCompressor().compress(fx_raw)
    assert unpack_resolve_blob(comp) == fx_raw
    xform = decode_effect_filters(comp)
    assert xform is not None
    assert xform.zoom_pct == pytest.approx(104.0)


def test_parse_resolve_project_db_and_drp_wrapper(tmp_path: Path) -> None:
    db_file = tmp_path / "Project.db"
    _build_synthetic_resolve_db(db_file)

    doc = parse_resolve_project_db(db_file)
    assert doc.name == "Main_Cut_v6"
    assert doc.width == 1920 and doc.height == 1080
    assert doc.fps.ffmpeg_rate == "25"
    assert doc.start_frame == 0
    assert "Origin Frame: 90000" in doc.color_space_tags
    assert len(doc.tracks) == 2
    v1 = doc.tracks[0]
    assert v1.name == "Plans"
    assert v1.clips[0].start_frame == 0
    assert v1.clips[0].source_in_frame == 18
    assert v1.clips[0].speed_rate == pytest.approx(2.0)
    assert v1.clips[0].transform is not None
    assert v1.clips[0].transform.zoom_pct == pytest.approx(106.0)
    assert "Alister_V-Look_V3_-2p00.cube" in doc.lut_refs
    assert any("Balance nuit" in w for w in doc.warnings)

    # Also test loading via load_timeline(.db) and ZIP .drp containing project.db
    assert load_timeline(db_file).name == "Main_Cut_v6"
    drp_buf = io.BytesIO()
    with zipfile.ZipFile(drp_buf, "w") as zf:
        zf.write(db_file, "project.db")
    drp_path = tmp_path / "AM_Test.drp"
    drp_path.write_bytes(drp_buf.getvalue())
    doc_drp = parse_drp(drp_path)
    assert doc_drp.name == "Main_Cut_v6"
    first_xform = doc_drp.tracks[0].clips[0].transform
    assert first_xform is not None
    assert first_xform.zoom_pct == pytest.approx(106.0)


def test_resolve_0435_pivot_color_grade_math() -> None:
    neutral = ColorGradeParams()
    assert apply_resolve_grade_rgb(0.25, 0.5, 0.75, neutral) == pytest.approx((0.25, 0.5, 0.75))

    # Contrast around 0.435 Rec.709 pivot keeps grey at 0.435 strictly invariant
    hi_contrast = ColorGradeParams(contrast=1.6)
    r, g, b = apply_resolve_grade_rgb(
        RESOLVE_CONTRAST_PIVOT_REC709,
        RESOLVE_CONTRAST_PIVOT_REC709,
        RESOLVE_CONTRAST_PIVOT_REC709,
        hi_contrast,
    )
    assert (r, g, b) == pytest.approx((0.435, 0.435, 0.435), abs=1e-5)

    # Saturation 0 yields equal RGB channels (monochrome)
    bw = ColorGradeParams(saturation=0.0)
    br, bg, bb = apply_resolve_grade_rgb(0.9, 0.4, 0.1, bw)
    assert br == pytest.approx(bg) and bg == pytest.approx(bb)


def test_resolve_api_endpoints_and_fail_closed(tmp_path: Path) -> None:
    import json
    import threading
    from urllib.error import HTTPError
    from urllib.request import Request, urlopen

    srv = create_ui_server(host="127.0.0.1", port=0, workspace_dir=tmp_path)
    host, port = srv.server_address[:2]
    base = f"http://{host}:{port}"
    th = threading.Thread(target=srv.serve_forever, daemon=True)
    th.start()
    try:
        with urlopen(f"{base}/api/resolve/local-projects", timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            assert "projects" in data
            assert isinstance(data["projects"], list)

        req = Request(
            f"{base}/api/resolve/open-project",
            data=json.dumps({"project_name": "../../NonExistent"}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with pytest.raises(HTTPError) as exc_info:
            urlopen(req, timeout=5)
        assert exc_info.value.code == 400
    finally:
        srv.shutdown()
        srv.server_close()
