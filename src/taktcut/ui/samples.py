"""Clean-room sample timeline fixtures and synthetic FFmpeg test-clip helper."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from taktcut.color import REC709_FFMPEG_FLAGS
from taktcut.models import (
    RationalFrameRate,
    TimelineClip,
    TimelineDocument,
    TimelineMarker,
    TimelineTrack,
)


def build_sample_timeline(preset: str = "clean") -> TimelineDocument:
    """Create a deterministic multi-track sample TimelineDocument for UI exploration."""
    fps_25 = RationalFrameRate(num=25, den=1)
    fps_ntsc = RationalFrameRate(num=24000, den=1001)

    if preset == "issues":
        return TimelineDocument(
            name="Diagnostic_Master_Cut_25p",
            source_format="drt",
            fps=fps_25,
            width=1920,
            height=1080,
            start_frame=0,
            color_space_tags=["Rec.709 / Gamma 2.4"],
            lut_refs=["luts/warm_editorial_v1.cube"],
            warnings=["Diagnostic fixture containing deliberate gap, overlap, and FPS mismatch."],
            tracks=[
                TimelineTrack(
                    index=1,
                    kind="video",
                    name="V1 Main Picture",
                    clips=[
                        TimelineClip(
                            name="A001_Opening_Wide",
                            track_index=1,
                            media_type="video",
                            start_frame=0,
                            duration_frames=100,
                            source_in_frame=24,
                            source_path="media/A001_Opening_Wide.mov",
                            media_ref="m-01",
                            source_fps=fps_25,
                        ),
                        TimelineClip(
                            name="A002_Studio_Detail",
                            track_index=1,
                            media_type="video",
                            start_frame=125,
                            duration_frames=100,
                            source_in_frame=0,
                            source_path="media/A002_Studio_Detail.mov",
                            media_ref="m-02",
                            source_fps=fps_ntsc,
                        ),
                        TimelineClip(
                            name="A003_Talent_Close",
                            track_index=1,
                            media_type="video",
                            start_frame=210,
                            duration_frames=140,
                            source_in_frame=12,
                            source_path="media/A003_Talent_Close.mov",
                            media_ref="m-03",
                            source_fps=fps_25,
                        ),
                        TimelineClip(
                            name="A004_Empty_MarkerClip",
                            track_index=1,
                            media_type="video",
                            start_frame=350,
                            duration_frames=0,
                            source_in_frame=0,
                            source_path="media/A004_Empty.mov",
                            media_ref="m-04",
                            source_fps=fps_25,
                        ),
                    ],
                ),
                TimelineTrack(
                    index=1,
                    kind="audio",
                    name="A1 Dialogue",
                    clips=[
                        TimelineClip(
                            name="VO_Intro_Clean",
                            track_index=1,
                            media_type="audio",
                            start_frame=0,
                            duration_frames=350,
                            source_in_frame=0,
                            source_path="audio/vo_intro.wav",
                            media_ref="a-01",
                        ),
                    ],
                ),
            ],
            markers=[
                TimelineMarker(
                    name="Gap Alert",
                    frame=100,
                    duration_frames=25,
                    color="Red",
                    note="25-frame black gap before A002",
                ),
                TimelineMarker(
                    name="Overlap Check",
                    frame=210,
                    duration_frames=15,
                    color="Yellow",
                    note="15-frame overlap on V1",
                ),
            ],
        )

    return TimelineDocument(
        name="Eclipse_Showreel_Master_25p",
        source_format="drt",
        fps=fps_25,
        width=1920,
        height=1080,
        start_frame=0,
        color_space_tags=["Rec.709 / Gamma 2.4"],
        lut_refs=["luts/warm_editorial_v1.cube"],
        tracks=[
            TimelineTrack(
                index=1,
                kind="video",
                name="V1 Main Picture",
                clips=[
                    TimelineClip(
                        name="A001_Opening_Wide",
                        track_index=1,
                        media_type="video",
                        start_frame=0,
                        duration_frames=125,
                        source_in_frame=24,
                        source_path="media/A001_Opening_Wide.mov",
                        media_ref="m-01",
                        source_fps=fps_25,
                    ),
                    TimelineClip(
                        name="A002_Studio_Detail",
                        track_index=1,
                        media_type="video",
                        start_frame=125,
                        duration_frames=100,
                        source_in_frame=10,
                        source_path="media/A002_Studio_Detail.mov",
                        media_ref="m-02",
                        source_fps=fps_25,
                        speed_rate=0.5,
                    ),
                    TimelineClip(
                        name="A003_Talent_Close",
                        track_index=1,
                        media_type="video",
                        start_frame=225,
                        duration_frames=150,
                        source_in_frame=48,
                        source_path="media/A003_Talent_Close.mov",
                        media_ref="m-03",
                        source_fps=fps_25,
                    ),
                    TimelineClip(
                        name="A004_End_Packshot",
                        track_index=1,
                        media_type="video",
                        start_frame=375,
                        duration_frames=125,
                        source_in_frame=0,
                        source_path="media/A004_End_Packshot.mov",
                        media_ref="m-04",
                        source_fps=fps_25,
                        speed_rate=2.0,
                        reverse=True,
                    ),
                ],
            ),
            TimelineTrack(
                index=2,
                kind="video",
                name="V2 Titles & GFX",
                clips=[
                    TimelineClip(
                        name="GFX_LowerThird_Main",
                        track_index=2,
                        media_type="video",
                        start_frame=25,
                        duration_frames=150,
                        source_in_frame=0,
                        source_path="gfx/lower_third_main.mov",
                        media_ref="g-01",
                        source_fps=fps_25,
                    ),
                ],
            ),
            TimelineTrack(
                index=1,
                kind="audio",
                name="A1 Dialogue / VO",
                clips=[
                    TimelineClip(
                        name="VO_Intro_Clean",
                        track_index=1,
                        media_type="audio",
                        start_frame=0,
                        duration_frames=125,
                        source_in_frame=0,
                        source_path="audio/vo_intro.wav",
                        media_ref="a-01",
                        audio_gain_db=1.5,
                        fade_in_s=0.4,
                    ),
                    TimelineClip(
                        name="VO_Feature_Main",
                        track_index=1,
                        media_type="audio",
                        start_frame=125,
                        duration_frames=250,
                        source_in_frame=0,
                        source_path="audio/vo_feature.wav",
                        media_ref="a-02",
                    ),
                    TimelineClip(
                        name="VO_Tagline_End",
                        track_index=1,
                        media_type="audio",
                        start_frame=375,
                        duration_frames=125,
                        source_in_frame=0,
                        source_path="audio/vo_tagline.wav",
                        media_ref="a-03",
                        fade_out_s=0.6,
                    ),
                ],
            ),
            TimelineTrack(
                index=2,
                kind="audio",
                name="A2 Music Stem",
                clips=[
                    TimelineClip(
                        name="MX_Bed_Full_20s",
                        track_index=2,
                        media_type="audio",
                        start_frame=0,
                        duration_frames=500,
                        source_in_frame=0,
                        source_path="audio/mx_bed_20s.wav",
                        media_ref="a-04",
                        audio_gain_db=-6.0,
                        fade_in_s=1.2,
                        fade_out_s=2.0,
                    ),
                ],
            ),
        ],
        markers=[
            TimelineMarker(
                name="Intro Title Cue",
                frame=25,
                duration_frames=1,
                color="Blue",
                note="Lower third fade-in",
            ),
            TimelineMarker(
                name="Grade Reference",
                frame=225,
                duration_frames=1,
                color="Yellow",
                note="Rec.709 skin tone check",
            ),
            TimelineMarker(
                name="Loudness Gate",
                frame=375,
                duration_frames=1,
                color="Green",
                note="-14.0 LUFS web target",
            ),
        ],
    )


def generate_synthetic_sample_clip(out_path: Path, ffmpeg_bin: str = "ffmpeg") -> Path:
    """Generate a 2-second 25fps Rec.709 testsrc2 + 1kHz sine MP4 clip with +faststart."""
    resolved = shutil.which(ffmpeg_bin)
    if resolved is None:
        raise FileNotFoundError("ffmpeg binary not found on PATH")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cmd: list[str] = [
        resolved,
        "-hide_banner",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=640x360:rate=25:duration=2",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=1000:sample_rate=48000:duration=2",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-g",
        "50",
        *REC709_FFMPEG_FLAGS,
        "-af",
        "loudnorm=I=-14.0:TP=-1.0:LRA=11.0",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-movflags",
        "+faststart",
        str(out_path),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.returncode != 0 or not out_path.exists():
        tail = "\n".join(proc.stderr.splitlines()[-10:]) if proc.stderr else "FFmpeg failed"
        raise RuntimeError(f"Failed to generate synthetic sample clip: {tail}")
    return out_path
