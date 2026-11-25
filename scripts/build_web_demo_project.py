"""Build a browser-playable demo project from a real DaVinci Resolve archive (.dra).

Usage:
    python scripts/build_web_demo_project.py <archive.dra> <output_dir> [--slug edit-page-effects]

The script parses every timeline of the archive with ``taktcut.resolve_archive``, transcodes the
archive ``MediaFiles`` into lightweight H.264/AAC web proxies (frequent keyframes for accurate
scrubbing), extracts poster thumbnails and writes ``project.json`` consumed by the static web demo.
Media are never committed to the taktcut repository: the output folder lives with the website.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any

from taktcut.resolve_archive import load_resolve_archive, parse_resolve_archive

VIDEO_EXT = {".mov", ".mp4", ".mxf", ".m4v", ".avi", ".mkv"}
AUDIO_EXT = {".wav", ".aif", ".aiff", ".mp3", ".m4a", ".flac"}
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".exr", ".dpx"}


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "media"


def probe(path: Path) -> dict[str, Any]:
    out = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=codec_type,width,height,r_frame_rate",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    data = json.loads(out)
    streams = data.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video" and s.get("width")), None)
    has_audio = any(s.get("codec_type") == "audio" for s in streams)
    fps = 0.0
    if video and video.get("r_frame_rate") and "/" in video["r_frame_rate"]:
        num, den = video["r_frame_rate"].split("/")
        fps = float(num) / max(1.0, float(den))
    return {
        "duration_s": float(data.get("format", {}).get("duration") or 0.0),
        "width": int(video["width"]) if video else 0,
        "height": int(video["height"]) if video else 0,
        "fps": fps,
        "has_audio": has_audio,
    }


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, capture_output=True)


def build_media(src: Path, out_dir: Path, slug: str) -> dict[str, Any]:
    info = probe(src)
    ext = src.suffix.lower()
    media_dir = out_dir / "media"
    thumb_dir = out_dir / "thumbs"
    media_dir.mkdir(parents=True, exist_ok=True)
    thumb_dir.mkdir(parents=True, exist_ok=True)
    thumb = thumb_dir / f"{slug}.jpg"
    entry: dict[str, Any] = {"name": src.name, **info}

    if ext in IMAGE_EXT:
        dst = media_dir / f"{slug}.png"
        run(
            [
                "ffmpeg",
                "-y",
                "-v",
                "error",
                "-i",
                str(src),
                "-vf",
                "scale='min(960,iw)':-2",
                str(dst),
            ]
        )
        run(
            [
                "ffmpeg",
                "-y",
                "-v",
                "error",
                "-i",
                str(src),
                "-vf",
                "scale=320:-2",
                "-q:v",
                "4",
                str(thumb),
            ]
        )
        entry.update(kind="image", url=f"media/{dst.name}", thumb=f"thumbs/{thumb.name}")
        return entry

    if ext in AUDIO_EXT or (ext in VIDEO_EXT and info["width"] == 0):
        dst = media_dir / f"{slug}.m4a"
        run(
            [
                "ffmpeg",
                "-y",
                "-v",
                "error",
                "-i",
                str(src),
                "-vn",
                "-ac",
                "2",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                str(dst),
            ]
        )
        entry.update(kind="audio", url=f"media/{dst.name}", thumb="")
        return entry

    dst = media_dir / f"{slug}.mp4"
    gop = max(6, round(info["fps"] or 24) // 2)
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(src), "-map", "0:v:0"]
    if info["has_audio"]:
        cmd += ["-map", "0:a:0?", "-c:a", "aac", "-b:a", "128k", "-ac", "2"]
    cmd += [
        "-vf",
        "scale='min(960,iw)':-2:flags=lanczos,format=yuv420p",
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "24",
        "-g",
        str(gop),
        "-keyint_min",
        str(gop),
        "-sc_threshold",
        "0",
        "-movflags",
        "+faststart",
        str(dst),
    ]
    run(cmd)
    seek = max(0.0, min(info["duration_s"] * 0.4, info["duration_s"] - 0.05))
    run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-ss",
            f"{seek:.3f}",
            "-i",
            str(src),
            "-frames:v",
            "1",
            "-vf",
            "scale=320:-2",
            "-q:v",
            "4",
            str(thumb),
        ]
    )
    entry.update(kind="video", url=f"media/{dst.name}", thumb=f"thumbs/{thumb.name}")
    return entry


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--slug", default="")
    parser.add_argument("--credit", default="")
    parser.add_argument("--source-url", default="")
    args = parser.parse_args()

    archive = load_resolve_archive(args.archive)
    slug = args.slug or slugify(archive.project_name)
    out_dir: Path = args.output / slug
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)

    media: dict[str, Any] = {}
    if archive.media_root is not None:
        for src in sorted(archive.media_root.iterdir()):
            if src.is_file():
                rel = f"MediaFiles/{src.name}"
                media[rel] = build_media(src, out_dir, slugify(src.stem))
                print("media", rel, "->", media[rel]["url"])

    timelines = []
    for info in archive.timelines:
        doc = parse_resolve_archive(args.archive, timeline_name=info.sequence_id)
        doc_json = doc.model_dump(mode="json", exclude_none=True)
        fps = doc.fps.as_float
        for track in doc_json["tracks"]:
            for clip in track["clips"]:
                entry = media.get(clip.get("source_path", ""))
                if not entry or entry["kind"] == "image" or entry["duration_s"] <= 0:
                    continue
                src_fps = entry["fps"] or fps
                total = max(1, int(entry["duration_s"] * src_fps))
                if clip.get("source_in_frame", 0) >= total:
                    clip["source_in_frame"] = clip["source_in_frame"] % total
        timelines.append(
            {
                "id": info.sequence_id,
                "name": info.name,
                "folder": info.folder,
                "is_compound": info.is_compound,
                "document": doc_json,
            }
        )

    main_doc = parse_resolve_archive(args.archive)
    manifest = {
        "schema": "taktcut.web-demo-project/1",
        "id": slug,
        "project_name": archive.project_name,
        "archive_name": args.archive.name,
        "source_url": args.source_url,
        "credit": args.credit,
        "main_timeline": main_doc.name,
        "width": archive.width,
        "height": archive.height,
        "timelines": timelines,
        "media": media,
    }
    poster = next(
        (m["thumb"] for m in media.values() if m.get("kind") == "video" and m.get("thumb")), ""
    )
    manifest["poster"] = poster
    (out_dir / "project.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    total = sum(f.stat().st_size for f in out_dir.rglob("*") if f.is_file())
    print(f"OK {out_dir} timelines={len(timelines)} media={len(media)} bytes={total}")


if __name__ == "__main__":
    main()
