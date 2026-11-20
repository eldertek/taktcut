# taktcut

**Headless, clean-room timeline interchange, color pipeline, and deterministic FFmpeg/NVENC broadcast QA for DaVinci Resolve, Premiere Pro, and OpenTimelineIO workflows.**

`taktcut` bridges the gap between editorial project files (`.drp`, `.drt`, `.fcpxml`, `.otio`) and deterministic media delivery without requiring a running DaVinci Resolve Studio license, an active desktop session, or proprietary runtime APIs.

## Why taktcut

- **Works headlessly with Free or Studio exports**: Inspect `.drp`, `.drt`, `.fcpxml`, and `.otio`/`.otioz` files, convert timelines with exact rational frame math (`RationalTime`), and detect gaps or overlaps before rendering.
- **Zero cumulative frame drift**: All timeline offsets and clip durations use exact integer frames and rational framerates (`24000/1001`, `25/1`, `30000/1001`, `50/1`), preventing floating-point rounding drift across long sequences.
- **Portable color pipeline**: Parse ASC CDL parameters (`Slope`, `Offset`, `Power`, `Saturation`), validate 1D/3D `.cube` LUTs, bake CDL transforms into `.cube` 3D LUTs, and apply them via FFmpeg `lut3d` with explicit Rec.709 color tagging.
- **Deterministic FFmpeg & NVENC rendering**: Generates explicit FFmpeg command plans with `-pix_fmt yuv420p`, CFR lock, `2*fps` GOP sizing, `-movflags +faststart` MP4 streaming headers, and automatic `h264_nvenc` / `hevc_nvenc` detection with clean `libx264` fallback (plus `prores_ks` HQ MOV).
- **Automated broadcast QA gate**: Audits rendered files using `ffprobe` (codec, resolution, CFR parity, video vs. container duration, MP4 `moov`-before-`mdat` faststart check), `ebur128` loudness (`I`, `LRA`, `TruePeak <= -1.0 dBTP`), and multi-timestamp frame verification (start, mid, end).
- **Native CLI & MCP server**: Use directly from the command line or expose typed tools over `stdio` JSON-RPC via the Model Context Protocol (`mcp`).

## Clean-Room Guarantee

`taktcut` is strictly clean-room:
- Zero binary inspection, decompilation, or symbol extraction from proprietary NLE executables.
- Zero DRM or license bypasses.
- Operates exclusively on user-exported project/timeline/color files and open standards (ZIP, `defusedxml` XML parsing, ASWF OpenTimelineIO, ASC CDL, Adobe `.cube` LUTs, FFmpeg, EBU R128).

## Requirements

- Python 3.10+
- `ffmpeg` and `ffprobe` on `PATH`

## Installation

```bash
pip install -e ".[dev]"
```

Or run directly with `uv`:

```bash
uv pip install -e ".[dev]"
```

## Quickstart CLI

Inspect a DaVinci Resolve `.drp` / `.drt`, `.fcpxml`, or `.otio` timeline:

```bash
taktcut inspect timeline.drt
taktcut validate timeline.fcpxml
taktcut convert timeline.drt --out sequence.otio
```

Bake an ASC CDL grade into a portable 33-point `.cube` 3D LUT:

```bash
taktcut bake-lut --out look.cube --slope 1.05 1.0 0.96 --power 0.98 0.98 1.0 --sat 1.12
```

Build or execute a deterministic Rec.709 render plan:

```bash
taktcut render input.mov --out delivery.mp4 --profile web_h264 --lut look.cube --lufs -14 --dry-run
taktcut render input.mov --out delivery.mp4 --profile web_h264 --lut look.cube --lufs -14
```

Run the broadcast QA gate (`ffprobe` + `ebur128` + faststart + start/mid/end frame check):

```bash
taktcut qa delivery.mp4 --lufs -14 --max-tp -1.0
```

## MCP Server (`stdio`)

Start the MCP server over `stdio`:

```bash
taktcut mcp
```

Exposed MCP tools:
- `drp_inspect`: Parse `.drp`, `.drt`, `.fcpxml`, or `.otio`/`.otioz` timelines and metadata.
- `drp_to_otio`: Convert `.drp`, `.drt`, or `.fcpxml` timelines into OpenTimelineIO (`.otio`).
- `timeline_validate`: Check exact rational continuity, unintended black gaps, overlaps, and mixed framerates.
- `lut_bake_cdl`: Bake ASC CDL parameters into a validated 3D `.cube` LUT.
- `grade_apply_lut`: Render a graded clip using `.cube` LUT and/or ASC CDL with Rec.709 tagging.
- `render_plan`: Generate (and optionally execute) a deterministic FFmpeg/NVENC/x264/ProRes render plan.
- `qa_probe_loudness`: Measure EBU R128 integrated loudness, LRA, and true peak (`dBTP`).
- `qa_verify_media`: Run the full `ffprobe` + `ebur128` + `faststart` + multi-timestamp frame QA gate.

## Development & Tests

```bash
ruff check src tests
mypy
pytest -v
```

## License

MIT
