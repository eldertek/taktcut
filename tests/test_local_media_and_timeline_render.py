"""Tests for local media registry, HTTP Range streaming, and multi-track timeline rendering."""

from __future__ import annotations

import json
import shutil
import subprocess
import threading
import urllib.request
from pathlib import Path

import pytest

from taktcut.local_media import (
    LocalMediaRegistry,
    ensure_media_thumbnail,
    extract_audio_peaks,
    probe_local_media,
)
from taktcut.models import (
    ClipTransformParams,
    ClipTransition,
    RationalFrameRate,
    RenderProfile,
    TimelineClip,
    TimelineDocument,
    TimelineTrack,
)
from taktcut.timeline_render import (
    TimelineRenderRequest,
    build_timeline_render_plan,
    execute_timeline_render_plan,
)
from taktcut.ui.server import create_ui_server

HAS_FFMPEG = shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def _make_sample_video(path: Path, *, duration_s: float = 1.5, color: str = "0x182230") -> Path:
    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"color=c={color}:s=320x180:r=25:d={duration_s}",
        "-f",
        "lavfi",
        "-i",
        f"sine=frequency=220:sample_rate=48000:duration={duration_s}",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        str(path),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return path


def _make_sample_audio(path: Path, *, duration_s: float = 1.2, freq: int = 110) -> Path:
    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"sine=frequency={freq}:sample_rate=48000:duration={duration_s}",
        "-c:a",
        "pcm_s16le",
        str(path),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return path


@pytest.mark.skipif(not HAS_FFMPEG, reason="ffmpeg/ffprobe required")
def test_local_media_probe_thumb_peaks_and_registry(tmp_path: Path) -> None:
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    vid = _make_sample_video(media_dir / "sentinel_bg.mp4", duration_s=1.2)
    aud = _make_sample_audio(media_dir / "sentinel_sub.wav", duration_s=1.0, freq=80)

    v_asset = probe_local_media(vid, workspace_root=tmp_path)
    assert v_asset.kind == "video"
    assert v_asset.width == 320
    assert v_asset.height == 180
    assert v_asset.duration_s > 0.8

    thumb = ensure_media_thumbnail(v_asset, tmp_path / ".thumbs")
    assert thumb is not None and thumb.is_file() and thumb.stat().st_size > 100

    a_asset = probe_local_media(aud, workspace_root=tmp_path)
    assert a_asset.kind == "audio"
    assert a_asset.duration_s > 0.8

    peaks = extract_audio_peaks(a_asset, tmp_path / ".peaks", num_bins=32)
    assert len(peaks) == 32
    assert max(peaks) > 0.1

    reg = LocalMediaRegistry(cache_dir=tmp_path / ".cache")
    imported = reg.register_paths([media_dir], workspace_root=tmp_path)
    assert len(imported) == 2
    mmap = reg.to_media_map()
    assert "media/sentinel_bg.mp4" in mmap
    assert "media/sentinel_sub.wav" in mmap


@pytest.mark.skipif(not HAS_FFMPEG, reason="ffmpeg/ffprobe required")
def test_multitrack_timeline_render_video_overlay_textplus_fx_and_audio(tmp_path: Path) -> None:
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    bg = _make_sample_video(media_dir / "probe_base.mp4", duration_s=2.0, color="0x120808")
    ov = _make_sample_video(media_dir / "probe_overlay.mp4", duration_s=1.5, color="0x301010")
    sfx = _make_sample_audio(media_dir / "probe_hit.wav", duration_s=1.0, freq=65)

    doc = TimelineDocument(
        name="Sentinel_Horror_Test",
        source_format="drt",
        fps=RationalFrameRate(num=25, den=1),
        width=640,
        height=360,
        tracks=[
            TimelineTrack(
                index=1,
                kind="video",
                name="V1 Base",
                clips=[
                    TimelineClip(
                        name="BaseShot",
                        track_index=1,
                        media_type="video",
                        start_frame=0,
                        duration_frames=50,
                        source_path="media/probe_base.mp4",
                        resolve_fx=[
                            {"effect": "vignette", "enabled": True, "intensity": 0.7},
                            {"effect": "flicker", "enabled": True, "intensity": 0.4},
                        ],
                    )
                ],
            ),
            TimelineTrack(
                index=2,
                kind="video",
                name="V2 Overlay",
                clips=[
                    TimelineClip(
                        name="OverlayScreen",
                        track_index=2,
                        media_type="video",
                        start_frame=10,
                        duration_frames=30,
                        source_path="media/probe_overlay.mp4",
                        composite_mode="screen",
                        opacity=65.0,
                        resolve_fx=[
                            {"effect": "digital_glitch", "enabled": True, "intensity": 0.6}
                        ],
                    )
                ],
            ),
            TimelineTrack(
                index=3,
                kind="video",
                name="V3 TextPlus",
                clips=[
                    TimelineClip(
                        name="TitleCard",
                        track_index=3,
                        media_type="video",
                        clip_kind="title",
                        start_frame=12,
                        duration_frames=28,
                        title_params={
                            "text": "SENTINEL TEST",
                            "font": "Anton",
                            "font_size": 56,
                            "color": "#ffffff",
                            "glow": 1.2,
                            "animation": "shake",
                        },
                    )
                ],
            ),
            TimelineTrack(
                index=1,
                kind="audio",
                name="A1 SFX",
                clips=[
                    TimelineClip(
                        name="SubHit",
                        track_index=1,
                        media_type="audio",
                        start_frame=5,
                        duration_frames=25,
                        source_path="media/probe_hit.wav",
                        audio_gain_db=2.0,
                        fade_in_s=0.1,
                        fade_out_s=0.2,
                        audio_fx=[
                            {"kind": "reverb", "enabled": True, "params": {"decay": 0.5}},
                            {"kind": "pitch_shift", "enabled": True, "params": {"semitones": -3}},
                        ],
                    )
                ],
            ),
        ],
    )

    out_mp4 = tmp_path / "renders" / "sentinel_out.mp4"
    req = TimelineRenderRequest(
        document=doc,
        output_path=str(out_mp4),
        width=640,
        height=360,
        profile=RenderProfile.WEB_H264,
        prefer_hw=False,
        color_grade={"contrast": 1.12, "saturation": 0.9, "lift": [0.02, -0.02, -0.02]},
    )
    plan = build_timeline_render_plan(
        req,
        workspace_root=tmp_path,
        media_lookup={
            "media/probe_base.mp4": bg,
            "media/probe_overlay.mp4": ov,
            "media/probe_hit.wav": sfx,
        },
    )
    progress_events: list[float] = []
    res = execute_timeline_render_plan(
        plan,
        progress_cb=lambda p: progress_events.append(p.percent),
        job_label="sentinel-test",
    )
    assert res.success, f"Render failed: {res.stderr_tail}"
    assert out_mp4.is_file() and res.bytes_written > 5000
    assert any(p >= 100.0 for p in progress_events)

    probe = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_streams",
            "-of",
            "json",
            str(out_mp4),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    streams = json.loads(probe.stdout)["streams"]
    types = {s["codec_type"] for s in streams}
    assert types == {"video", "audio"}


@pytest.mark.skipif(not HAS_FFMPEG, reason="ffmpeg/ffprobe required")
def test_server_media_import_range_stream_and_timeline_queue(tmp_path: Path) -> None:
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    _make_sample_video(media_dir / "qa_clip.mp4", duration_s=1.0, color="0x220808")

    server = create_ui_server(host="127.0.0.1", port=0, workspace_dir=tmp_path)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{port}"
    try:
        # 1. Import folder
        req = urllib.request.Request(
            f"{base}/api/media/import",
            data=json.dumps({"folder": "media"}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        assert len(data["imported"]) == 1
        asset_id = data["imported"][0]["media_id"]

        # 2. HTTP 206 Range stream check
        range_req = urllib.request.Request(
            f"{base}/api/media/stream?id={asset_id}",
            headers={"Range": "bytes=0-1023"},
        )
        with urllib.request.urlopen(range_req, timeout=10) as resp:
            assert resp.status == 206
            chunk = resp.read()
            assert len(chunk) == 1024

        # 3. Queue multi-track timeline render + Run Queue
        tl_doc = {
            "name": "QA_Queue_TL",
            "source_format": "drt",
            "fps": {"num": 25, "den": 1},
            "width": 320,
            "height": 180,
            "tracks": [
                {
                    "index": 1,
                    "kind": "video",
                    "name": "V1",
                    "clips": [
                        {
                            "name": "qa_clip",
                            "track_index": 1,
                            "media_type": "video",
                            "start_frame": 0,
                            "duration_frames": 25,
                            "source_path": "media/qa_clip.mp4",
                        }
                    ],
                }
            ],
        }
        add_req = urllib.request.Request(
            f"{base}/api/render/queue/add",
            data=json.dumps(
                {
                    "label": "QA Multi-Track",
                    "job_payload": {
                        "mode": "timeline",
                        "document": tl_doc,
                        "output_path": "renders/qa_queue_out.mp4",
                        "width": 320,
                        "height": 180,
                        "profile": "web_h264",
                        "prefer_hw": False,
                    },
                }
            ).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(add_req, timeout=15) as resp:
            add_data = json.loads(resp.read().decode("utf-8"))
        assert len(add_data["jobs"]) == 1

        run_req = urllib.request.Request(
            f"{base}/api/render/queue/run",
            data=json.dumps({"dry_run": False}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(run_req, timeout=60) as resp:
            run_data = json.loads(resp.read().decode("utf-8"))
        assert run_data["summary"]["completed_count"] == 1
        assert (tmp_path / "renders" / "qa_queue_out.mp4").is_file()

        # 4. Save project to workspace
        save_body = json.dumps(
            {
                "path": "qa_proj.taktcut.json",
                "project": {"schema_version": "taktcut.project.v1", "timeline": tl_doc},
            }
        ).encode("utf-8")
        save_req = urllib.request.Request(
            f"{base}/api/project/save-path",
            data=save_body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(save_req, timeout=10) as resp:
            save_data = json.loads(resp.read().decode("utf-8"))
        assert save_data["saved_path"] == "qa_proj.taktcut.json"
        assert (tmp_path / "qa_proj.taktcut.json").is_file()
    finally:
        server.shutdown()
        server.server_close()


@pytest.mark.skipif(not HAS_FFMPEG, reason="ffmpeg/ffprobe required")
def test_cinema_pack_transitions_blanking_dynamic_zoom_tracking_tapestop(tmp_path: Path) -> None:
    """Verify Pack Cinema: transitions, 2.39:1 blanking, Dynamic Zoom, tracking & Tape-Stop."""
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    c1 = _make_sample_video(media_dir / "probe_warm.mp4", duration_s=2.4, color="0x553015")
    c2 = _make_sample_video(media_dir / "probe_cold.mp4", duration_s=2.4, color="0x122238")
    c3 = _make_sample_video(media_dir / "probe_red.mp4", duration_s=2.0, color="0x600c0c")
    mb = _make_sample_audio(media_dir / "probe_box.wav", duration_s=3.0, freq=440)

    doc = TimelineDocument(
        name="Sentinel_Cinema_Pack_Test",
        source_format="drt",
        fps=RationalFrameRate(num=25, den=1),
        width=640,
        height=360,
        output_blanking="2.39",
        tracks=[
            TimelineTrack(
                index=1,
                kind="video",
                name="V1 Cinema",
                clips=[
                    TimelineClip(
                        name="WarmShot",
                        track_index=1,
                        media_type="video",
                        start_frame=0,
                        duration_frames=40,
                        source_path="media/probe_warm.mp4",
                        transform=ClipTransformParams(dynamic_zoom="slow_zoom_in"),
                        transition_out=ClipTransition(
                            preset="fade",
                            trans_style="cross",
                            duration_s=0.4,
                        ),
                        resolve_fx=[
                            {"effect": "warm_christmas", "enabled": True, "intensity": 0.7},
                            {"effect": "halation", "enabled": True, "intensity": 0.6},
                        ],
                    ),
                    TimelineClip(
                        name="ColdShot",
                        track_index=1,
                        media_type="video",
                        start_frame=40,
                        duration_frames=40,
                        source_path="media/probe_cold.mp4",
                        transform=ClipTransformParams(dynamic_zoom="slow_zoom_out"),
                        transition_out=ClipTransition(
                            preset="fadeblack",
                            trans_style="dip_color",
                            duration_s=0.5,
                            dip_color="#000000",
                        ),
                        resolve_fx=[
                            {"effect": "kodak_2383", "enabled": True, "intensity": 0.8},
                        ],
                    ),
                    TimelineClip(
                        name="RedShot",
                        track_index=1,
                        media_type="video",
                        start_frame=80,
                        duration_frames=35,
                        source_path="media/probe_red.mp4",
                    ),
                ],
            ),
            TimelineTrack(
                index=2,
                kind="video",
                name="V2 Cinema Titles",
                clips=[
                    TimelineClip(
                        name="Intertitle",
                        track_index=2,
                        media_type="video",
                        clip_kind="title",
                        start_frame=82,
                        duration_frames=30,
                        title_params={
                            "text": "SENTINEL SCOPE",
                            "subtitle": "TEST CARD",
                            "font": "Bahnschrift",
                            "font_size": 44,
                            "tracking": 0.8,
                            "color": "#f4f4f6",
                            "bg_color": "#000000",
                            "glow": 0.45,
                            "fade_in_s": 0.2,
                            "fade_out_s": 0.2,
                        },
                    )
                ],
            ),
            TimelineTrack(
                index=1,
                kind="audio",
                name="A1 MusicBox",
                pan=-0.35,
                clips=[
                    TimelineClip(
                        name="MusicBoxTapeStop",
                        track_index=1,
                        media_type="audio",
                        start_frame=0,
                        duration_frames=75,
                        source_path="media/probe_box.wav",
                        audio_gain_db=-2.0,
                        fade_in_s=0.1,
                        fade_out_s=0.25,
                        audio_fx=[
                            {
                                "kind": "tape_stop",
                                "enabled": True,
                                "params": {"end_ratio": 0.56, "hold_fraction": 0.35},
                            }
                        ],
                    )
                ],
            ),
        ],
    )

    out_mp4 = tmp_path / "renders" / "sentinel_cinema.mp4"
    req = TimelineRenderRequest(
        document=doc,
        output_path=str(out_mp4),
        width=640,
        height=360,
        profile=RenderProfile.WEB_H264,
        prefer_hw=False,
    )
    plan = build_timeline_render_plan(
        req,
        workspace_root=tmp_path,
        media_lookup={
            "media/probe_warm.mp4": c1,
            "media/probe_cold.mp4": c2,
            "media/probe_red.mp4": c3,
            "media/probe_box.wav": mb,
        },
    )
    assert "drawbox=x=0:y=0:w=640:h=46:color=black:t=fill" in plan.filter_complex
    assert "zoompan=z=" in plan.filter_complex
    assert "acrossfade=" in plan.filter_complex
    assert "pan=stereo|" in plan.filter_complex
    assert "vdip_1_0_" in plan.filter_complex

    res = execute_timeline_render_plan(plan, job_label="sentinel-cinema")
    assert res.success, f"Cinema Pack render failed: {res.stderr_tail}"
    assert out_mp4.is_file() and res.bytes_written > 4000


@pytest.mark.skipif(not HAS_FFMPEG, reason="ffmpeg/ffprobe required")
def test_resolve_archive_nested_media_nfc_and_image_sequence(tmp_path: Path) -> None:
    """Verify .dra nested MediaFiles/** resolution, NFD/NFC accents, and [start-end] sequences."""
    import unicodedata
    import zipfile

    from taktcut.resolve_archive import parse_resolve_archive

    dra_dir = tmp_path / "SampleClip.dra"
    nested_video_dir = dra_dir / "MediaFiles" / "0-Rush" / "Vid\u00e9o_A"
    nested_seq_dir = dra_dir / "MediaFiles" / "VFX" / "Orage"
    nested_video_dir.mkdir(parents=True)
    nested_seq_dir.mkdir(parents=True)

    _make_sample_video(nested_video_dir / "plan_01.mp4", duration_s=1.2, color="0x182838")
    for idx in range(6):
        frame_path = nested_seq_dir / f"ORAGE_4K.{idx:04d}.png"
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-f",
                "lavfi",
                "-i",
                "color=c=0x223355:s=320x180:d=0.04",
                "-frames:v",
                "1",
                str(frame_path),
            ],
            check=True,
            capture_output=True,
        )

    # Simulate macOS NFD accented path in project.drp XML
    nfd_video_path = unicodedata.normalize("NFD", "/Volumes/Disk/0-Rush/Vid\u00e9o_A/plan_01.mp4")
    seq_id = "11111111-2222-3333-4444-555555555555"
    # 25.0 fps LE IEEE double hex = 0000000000003940; 320x180 BE 2xuint64 hex
    fps_hex = "0000000000003940"
    res_hex = f"{320:016x}{180:016x}"
    mp_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Sm2MpFolder>
  <Sm2MpTimelineClip DbId="tl-clip-1">
    <Name>Assemblage</Name>
    <Sm2Timeline><Name>Assemblage</Name></Sm2Timeline>
    <Sm2Sequence DbId="{seq_id}">
      <FrameRate>{fps_hex}</FrameRate>
      <Resolution>{res_hex}</Resolution>
    </Sm2Sequence>
  </Sm2MpTimelineClip>
</Sm2MpFolder>"""
    seq_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Sm2SequenceContainer>
  <Sequence>{seq_id}</Sequence>
  <VideoTrackVec>
    <Element>
      <Sm2TiTrack>
        <Items>
          <Sm2TiVideoClip>
            <Name>plan_01.mp4</Name>
            <Start>90000</Start>
            <Duration>20</Duration>
            <In>0</In>
            <MediaFilePath>{nfd_video_path}</MediaFilePath>
            <MediaFrameRate>{fps_hex}</MediaFrameRate>
          </Sm2TiVideoClip>
          <Sm2TiVideoClip>
            <Name>ORAGE_4K.[0000-0005].png</Name>
            <Start>90020</Start>
            <Duration>6</Duration>
            <In>0</In>
            <MediaFilePath>/Volumes/Disk/VFX/Orage/ORAGE_4K.[0000-0005].png</MediaFilePath>
            <MediaFrameRate>{fps_hex}</MediaFrameRate>
          </Sm2TiVideoClip>
        </Items>
      </Sm2TiTrack>
    </Element>
  </VideoTrackVec>
</Sm2SequenceContainer>"""

    drp_path = dra_dir / "project.drp"
    with zipfile.ZipFile(drp_path, "w") as zf:
        zf.writestr("MediaPool/Master/MpFolder.xml", mp_xml)
        zf.writestr(f"SeqContainer/{seq_id}.xml", seq_xml)

    doc = parse_resolve_archive(dra_dir)
    assert doc.name == "Assemblage"
    clips = doc.tracks[0].clips
    assert len(clips) == 2
    assert not clips[0].media_offline
    assert clips[0].source_path.startswith("MediaFiles/")
    assert not clips[1].media_offline
    assert clips[1].source_path == "MediaFiles/VFX/Orage/ORAGE_4K.[0000-0005].png"

    out_mp4 = tmp_path / "renders" / "dra_seq_out.mp4"
    plan = build_timeline_render_plan(
        TimelineRenderRequest(
            document=doc,
            output_path=str(out_mp4),
            width=320,
            height=180,
            profile=RenderProfile.WEB_H264,
            prefer_hw=False,
        ),
        workspace_root=dra_dir,
    )
    assert "%04d.png" in " ".join(plan.argv)
    res = execute_timeline_render_plan(plan, job_label="sentinel-dra-seq")
    assert res.success, f"DRA image sequence render failed: {res.stderr_tail}"
    assert out_mp4.is_file() and res.bytes_written > 2000


@pytest.mark.skipif(not HAS_FFMPEG, reason="ffmpeg/ffprobe required")
def test_chunked_timeline_render_multi_segment_concat(tmp_path: Path) -> None:
    """Verify chunked multi-segment rendering + lossless concat preserves duration & streams."""
    from taktcut.timeline_render import execute_chunked_timeline_render

    media_dir = tmp_path / "media"
    media_dir.mkdir()
    c1 = _make_sample_video(media_dir / "seg_a.mp4", duration_s=4.5, color="0x123045")
    c2 = _make_sample_video(media_dir / "seg_b.mp4", duration_s=4.5, color="0x451220")

    doc = TimelineDocument(
        name="Sentinel_Chunked_TL",
        source_format="drt",
        fps=RationalFrameRate(num=25, den=1),
        width=320,
        height=180,
        tracks=[
            TimelineTrack(
                index=1,
                kind="video",
                name="V1",
                clips=[
                    TimelineClip(
                        name="SegA",
                        track_index=1,
                        media_type="video",
                        start_frame=0,
                        duration_frames=100,
                        source_path="media/seg_a.mp4",
                    ),
                    TimelineClip(
                        name="SegB",
                        track_index=1,
                        media_type="video",
                        start_frame=100,
                        duration_frames=100,
                        source_path="media/seg_b.mp4",
                    ),
                ],
            )
        ],
    )
    out_mp4 = tmp_path / "renders" / "chunked_out.mp4"
    req = TimelineRenderRequest(
        document=doc,
        output_path=str(out_mp4),
        width=320,
        height=180,
        profile=RenderProfile.WEB_H264,
        prefer_hw=False,
    )
    events: list[float] = []
    res = execute_chunked_timeline_render(
        req,
        workspace_root=tmp_path,
        media_lookup={"media/seg_a.mp4": c1, "media/seg_b.mp4": c2},
        progress_cb=lambda p: events.append(p.percent),
        job_label="sentinel-chunked",
        chunk_seconds=4.0,
    )
    assert res.success, f"Chunked render failed: {res.stderr_tail}"
    assert out_mp4.is_file() and res.bytes_written > 4000
    assert any(p >= 100.0 for p in events)

    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(out_mp4)],
        check=True,
        capture_output=True,
        text=True,
    )
    dur = float(json.loads(probe.stdout)["format"]["duration"])
    assert 7.5 <= dur <= 8.5


