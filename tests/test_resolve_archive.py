"""Tests for the real DaVinci Resolve archive (.dra / project.drp) reader."""

from __future__ import annotations

import struct
import zipfile
from pathlib import Path

from taktcut.drp import load_timeline, parse_drp
from taktcut.resolve_archive import (
    decode_hex_fps,
    decode_hex_resolution,
    list_archive_timelines,
    sanitize_resolve_xml,
)

SEQ_ID = "a3df1304-58f9-4c78-90f3-660935e50d82"
FPS24_HEX = struct.pack("<d", 24.0).hex() + "0" * 16
FPS2398_HEX = struct.pack("<d", 24000 / 1001).hex() + "0" * 16
RES_HEX = struct.pack(">QQ", 1920, 1080).hex()


def _clip(
    tag: str, name: str, start: int, dur: int, src_in: int, media: str, media_start: float = 0.0
) -> str:
    return f"""
     <Element>
      <{tag} DbId="clip-{name}-{start}">
       <Name>{name}</Name>
       <Start>{start}</Start>
       <Duration>{dur}</Duration>
       <Flags>0</Flags>
       <In>{src_in}</In>
       <MediaRef>ref-{name}</MediaRef>
       <MediaStartTime>{media_start}</MediaStartTime>
       <MediaFilePath>/Volumes/MEDIA/Effects/{media}</MediaFilePath>
       <MediaFrameRate>{FPS24_HEX}</MediaFrameRate>
       <pLmVerTable>
        <ListMgt::LmVersionTable DbId="v-{start}"><VerType>0</VerType></ListMgt::LmVersionTable>
       </pLmVerTable>
      </{tag}>
     </Element>"""


def _build_archive(tmp: Path) -> Path:
    dra = tmp / "Training Edit.dra"
    media = dra / "MediaFiles"
    media.mkdir(parents=True)
    for name in ("shot_a.mov", "shot_b.mov", "logo.png"):
        (media / name).write_bytes(b"\x00")
    clip_a = _clip("Sm2TiVideoClip", "shot_a.mov", 86400, 48, 12, "shot_a.mov")
    clip_b = _clip("Sm2TiVideoClip", "shot_b.mov", 86448, 72, 86405, "shot_b.mov", 3600.0)
    seq = f"""<?xml version="1.0" encoding="UTF-8"?>
<Sm2SequenceContainer DbId="cont-1">
 <VideoTrackVec>
  <Element>
   <Sm2TiTrack DbId="t1">
    <Type>0</Type>
    <Sequence>{SEQ_ID}</Sequence>
    <Items>{clip_a}{clip_b}
     <Element>
      <Sm2TiTransition DbId="tr1">
       <PrettyType>Cross Dissolve</PrettyType><Start>86442</Start><Duration>12</Duration>
      </Sm2TiTransition>
     </Element>
    </Items>
   </Sm2TiTrack>
  </Element>
  <Element>
   <Sm2TiTrack DbId="t2">
    <Sequence>{SEQ_ID}</Sequence>
    <Items>{_clip("Sm2TiVideoClip", "logo.png", 86410, 60, 0, "logo.png")}</Items>
   </Sm2TiTrack>
  </Element>
 </VideoTrackVec>
 <AudioTrackVec>
  <Element>
   <Sm2TiTrack DbId="a1">
    <Sequence>{SEQ_ID}</Sequence>
    <Items>{_clip("Sm2TiAudioClip", "shot_a.mov", 86400, 48, 12, "shot_a.mov")}</Items>
   </Sm2TiTrack>
  </Element>
 </AudioTrackVec>
</Sm2SequenceContainer>"""
    mp_folder = f"""<?xml version="1.0" encoding="UTF-8"?>
<Sm2MpFolder DbId="f1">
 <Name>Assembly</Name>
 <MediaVec>
  <Element>
   <Sm2MpTimelineClip DbId="mp-1">
    <Name>Assembly Cut</Name>
    <TimelineSharedHandle>
     <Sm2Timeline DbId="tl-1">
      <Name>Assembly Cut</Name>
      <Sequence>
       <Sm2Sequence DbId="{SEQ_ID}">
        <FrameRate>{FPS24_HEX}</FrameRate>
        <Resolution>{RES_HEX}</Resolution>
       </Sm2Sequence>
      </Sequence>
     </Sm2Timeline>
    </TimelineSharedHandle>
   </Sm2MpTimelineClip>
  </Element>
 </MediaVec>
</Sm2MpFolder>"""
    project = """<?xml version="1.0" encoding="UTF-8"?>
<SM_Project DbId="p1">
 <ProjectName>Training Edit</ProjectName>
 <Width>1920</Width>
 <Height>1080</Height>
 <PowerNodeList>
  <ListMgt::LmPowerNodeList DbId="pn"><PowerNodes/></ListMgt::LmPowerNodeList>
 </PowerNodeList>
</SM_Project>"""
    with zipfile.ZipFile(dra / "project.drp", "w") as zf:
        zf.writestr("project.xml", project)
        zf.writestr("MediaPool/Master/000_Assembly/MpFolder.xml", mp_folder)
        zf.writestr(f"SeqContainer/{SEQ_ID}.xml", seq)
    return dra


def test_sanitize_cpp_scoped_tags() -> None:
    raw = b"<a><ListMgt::LmVersion x='1'/><ListMgt::Lm>t</ListMgt::Lm></a>"
    assert b"::" not in sanitize_resolve_xml(raw)


def test_hex_scalars() -> None:
    fps = decode_hex_fps(FPS2398_HEX)
    assert fps is not None and abs(fps.as_float - 23.976) < 0.001
    assert decode_hex_resolution(RES_HEX) == (1920, 1080)
    assert decode_hex_fps("zz") is None


def test_parse_real_archive_folder(tmp_path: Path) -> None:
    dra = _build_archive(tmp_path)
    timelines = list_archive_timelines(dra)
    assert [t["name"] for t in timelines] == ["Assembly Cut"]
    assert timelines[0]["width"] == 1920

    doc = load_timeline(dra)
    assert doc.name == "Assembly Cut"
    assert doc.start_frame == 0
    video = [t for t in doc.tracks if t.kind == "video"]
    audio = [t for t in doc.tracks if t.kind == "audio"]
    assert len(video) == 2 and len(audio) == 1
    first, second = video[0].clips
    assert (first.start_frame, first.duration_frames, first.source_in_frame) == (0, 48, 12)
    assert first.source_path == "MediaFiles/shot_a.mov"
    assert first.transition_out is not None and first.transition_out.duration_s == 0.5
    # Source In expressed in media timecode is rebased on MediaStartTime (01:00:00:00 at 24p)
    assert second.source_in_frame == 5
    assert video[1].clips[0].source_path == "MediaFiles/logo.png"


def test_parse_drp_inside_archive(tmp_path: Path) -> None:
    dra = _build_archive(tmp_path)
    doc = parse_drp(dra / "project.drp", timeline_name="Assembly Cut")
    assert sum(len(t.clips) for t in doc.tracks) == 4
