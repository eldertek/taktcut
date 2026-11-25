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
