"""Tests for clean-room .drp, .drt, .fcpxml, .otio parsing and rational frame math."""

from __future__ import annotations

import io
import zipfile
from fractions import Fraction
from pathlib import Path

import opentimelineio as otio
import pytest
from defusedxml.common import DefusedXmlException

from taktcut.drp import (
    create_sample_drp_bytes,
    create_sample_drt_bytes,
    export_otio,
    load_timeline,
    parse_drp,
    parse_drt,
    parse_fcpxml,
    validate_timeline,
)
from taktcut.models import (
    RationalFrameRate,
    TimelineClip,
    TimelineDocument,
    TimelineTrack,
    conform_source_frames,
    seconds_to_rational_frames,
)


def test_rational_zero_frame_drift_and_conform() -> None:
    fps_24 = RationalFrameRate(num=24, den=1)
    fps_25 = RationalFrameRate(num=25, den=1)
    fps_50 = RationalFrameRate(num=50, den=1)
    fps_ntsc = RationalFrameRate.from_str("24000/1001")

    assert fps_ntsc.num == 24000
    assert fps_ntsc.den == 1001
    assert seconds_to_rational_frames(Fraction(0), fps_24) == 0

    # Simulate 200 beats at 152 BPM using exact rational timestamps (0 cumulative drift).
    beat_dur = Fraction(60, 152)
    positions = [seconds_to_rational_frames(beat_dur * i, fps_25) for i in range(200)]
    expected_last = round(Fraction(60 * 199, 152) * Fraction(25, 1))
    assert positions[-1] == expected_last

    # 50p source conformed into 25p timeline: 40 timeline frames consume 80 source frames.
    assert conform_source_frames(40, fps_50, fps_25) == 80
    assert conform_source_frames(0, fps_50, fps_25) == 0


def test_drt_roundtrip_to_otio_and_validation(tmp_path: Path) -> None:
    drt_path = tmp_path / "qa-sample.drt"
    drt_path.write_bytes(create_sample_drt_bytes(name="probe-cut", fps="25"))

    doc = parse_drt(drt_path)
    assert doc.name == "probe-cut"
    assert doc.fps == RationalFrameRate(num=25, den=1)
    assert len(doc.tracks) == 1
    assert len(doc.tracks[0].clips) == 2

    val = validate_timeline(doc)
    assert val.valid is True
    assert val.issues == []

    otio_path = tmp_path / "probe-cut.otio"
    export_otio(doc, otio_path)
    assert otio_path.exists()

    reloaded = load_timeline(otio_path)
    assert reloaded.name == "probe-cut"
    assert len(reloaded.tracks[0].clips) == 2
    assert reloaded.tracks[0].clips[1].start_frame == 50

    raw_otio = otio.adapters.read_from_file(str(otio_path))
    assert raw_otio.metadata["taktcut"]["fps_num"] == 25


def test_drp_zip_parsing_and_zipslip_guard(tmp_path: Path) -> None:
    drp_path = tmp_path / "sentinel-project.drp"
    drp_path.write_bytes(create_sample_drp_bytes(name="sentinel-proj", fps="24000/1001"))

    doc = parse_drp(drp_path)
    assert doc.name == "Main Cut"
    assert doc.fps == RationalFrameRate(num=24000, den=1001)
    assert validate_timeline(doc).valid is True

    bad_drp = tmp_path / "unsafe.drp"
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("../../evil.xml", "<root/>")
    bad_drp.write_bytes(buf.getvalue())

    with pytest.raises(ValueError, match="Unsafe archive path"):
        parse_drp(bad_drp)


def test_fcpxml_rational_parse_and_zero_frame_validation(tmp_path: Path) -> None:
    fcpxml = tmp_path / "qa-bot.fcpxml"
    fcpxml.write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<fcpxml version="1.10">\n'
        "  <resources>\n"
        '    <format id="r1" frameDuration="1001/24000s" width="1920" height="1080" />\n'
        '    <asset id="a1" src="file:///media/shot_a.mov" />\n'
        "  </resources>\n"
        "  <library><event><project name=\"qa-bot-edit\">\n"
        '    <sequence format="r1">\n'
        "      <spine>\n"
        '        <asset-clip name="c1" ref="a1" offset="0s" start="0s" duration="24024/24000s">\n'
        '          <marker start="1001/24000s" duration="1001/24000s" value="cue-1" />\n'
        "        </asset-clip>\n"
        '        <asset-clip name="c2" ref="a1" offset="24024/24000s" start="0s" duration="0s" />\n'
        "      </spine>\n"
        "    </sequence>\n"
        "  </project></event></library>\n"
        "</fcpxml>\n",
        encoding="utf-8",
    )

    doc = parse_fcpxml(fcpxml)
    assert doc.name == "qa-bot-edit"
    assert doc.fps == RationalFrameRate(num=24000, den=1001)
    assert doc.tracks[0].clips[0].duration_frames == 24
    assert doc.markers[0].frame == 1

    # Second clip has 0 duration: validate_timeline must flag zero_duration!
    val = validate_timeline(doc)
    assert val.valid is False
    assert any(issue.kind == "zero_duration" for issue in val.issues)


def test_validate_timeline_detects_gaps_and_overlaps() -> None:
    doc = TimelineDocument(
        name="gap-check",
        source_format="drt",
        fps=RationalFrameRate(num=25, den=1),
        tracks=[
            TimelineTrack(
                index=1,
                kind="video",
                name="V1",
                clips=[
                    TimelineClip(
                        name="a",
                        track_index=1,
                        start_frame=0,
                        duration_frames=25,
                    ),
                    TimelineClip(
                        name="b",
                        track_index=1,
                        start_frame=30,
                        duration_frames=20,
                    ),
                    TimelineClip(
                        name="c",
                        track_index=1,
                        start_frame=45,
                        duration_frames=10,
                    ),
                ],
            )
        ],
    )
    res = validate_timeline(doc)
    assert res.valid is False
    kinds = {i.kind for i in res.issues}
    assert kinds == {"gap", "overlap"}


def test_defusedxml_blocks_xxe_dtd_in_drt(tmp_path: Path) -> None:
    malicious = tmp_path / "dtd-attack.drt"
    malicious.write_text(
        '<?xml version="1.0"?>\n'
        '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>\n'
        "<Sm2Sequence><Name>&xxe;</Name></Sm2Sequence>\n",
        encoding="utf-8",
    )
    with pytest.raises(DefusedXmlException):
        parse_drt(malicious)
