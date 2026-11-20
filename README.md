# taktcut

Headless, clean-room timeline interchange, ASC CDL / `.cube` color pipeline, and deterministic FFmpeg/NVENC broadcast QA for DaVinci Resolve, Premiere Pro, and OpenTimelineIO workflows.

`taktcut` inspects `.drp`, `.drt`, `.fcpxml`, and `.otio` exports, bakes ASC CDL grades into `.cube` 3D LUTs, renders Rec.709 deliverables via FFmpeg/NVENC, and runs an EBU R128 + faststart QA gate from the CLI or MCP without opening a desktop NLE.

## Why taktcut

| Workflow | Proprietary paywalls | taktcut (MIT) |
| :--- | :--- | :--- |
| Headless timeline inspection & conversion | DaVinci Resolve Studio ($295) requires an active desktop GUI session for scripting | Headless `.drp`, `.drt`, `.fcpxml`, and `.otio`/`.otioz` parser with exact `RationalTime` frame math |
| Color look baking & Rec.709 delivery | Desktop NLE lock-in (Premiere Pro $22.99/mo, Resolve Studio $295) | ASC CDL parser, 33-point `.cube` 3D LUT baker, and FFmpeg `lut3d` Rec.709 render plans |
| Broadcast loudness & streaming QA | Manual NLE export checks or paid QC suites | Automated `ffprobe` CFR/faststart check, `ebur128` loudness audit, and start/mid/end frame verification |
| CI & agent integration | Closed desktop plugins | Scriptable CLI and `stdio` JSON-RPC MCP server |

## Clean-Room Guarantee

- Zero binary inspection, decompilation, or symbol extraction from proprietary NLE executables.
- Zero DRM or license bypasses.
- Operates strictly on user-exported project/timeline/color files and open standards (ZIP, `defusedxml` XML parsing, ASWF OpenTimelineIO, ASC CDL, Adobe `.cube` LUTs, FFmpeg, EBU R128).

## Requirements

- Python 3.10+
- `ffmpeg` and `ffprobe` on `PATH`

## Installation

```bash
git clone https://github.com/eldertek/taktcut.git
cd taktcut
pip install -e ".[dev]"
```

## Quickstart CLI

Inspect, validate, and convert a `.drp` / `.drt`, `.fcpxml`, or `.otio` timeline:

```bash
taktcut inspect timeline.drt
taktcut validate timeline.fcpxml
taktcut convert timeline.drt --out sequence.otio
```

Bake an ASC CDL grade into a 33-point `.cube` 3D LUT and build a Rec.709 render plan:

```bash
taktcut bake-lut --out look.cube --slope 1.05 1.0 0.96 --power 0.98 0.98 1.0 --sat 1.12
taktcut render input.mov --out delivery.mp4 --profile web_h264 --lut look.cube --lufs -14 --dry-run
```

Run the broadcast QA gate (`ffprobe` + `ebur128` + `moov`-before-`mdat` faststart + start/mid/end frame verification):

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
- `drp_to_otio`: Convert `.drp`, `.drt`, or `.fcpxml` timelines into OpenTimelineIO (`.otio` or `.otioz`).
- `timeline_validate`: Check integer-frame continuity, gaps, overlaps, and framerate parity.
- `lut_bake_cdl`: Bake ASC CDL parameters (`slope`, `offset`, `power`, `saturation`) into a 3D `.cube` LUT.
- `grade_apply_lut`: Render a graded clip using a `.cube` LUT or ASC CDL with Rec.709 tags.
- `render_plan`: Build (and optionally execute) a deterministic FFmpeg/NVENC/`libx264`/`prores_ks` render plan.
- `qa_probe_loudness`: Measure EBU R128 integrated loudness (`LUFS`), `LRA`, and true peak (`dBTP`).
- `qa_verify_media`: Run the full `ffprobe` + `ebur128` + `faststart` + multi-timestamp frame QA gate.

## v0.1 Scope and Known Limitations

- `.drp` / `.drt` XML inspection targets timeline tracks, clip timing, framerates, and metadata; proprietary Fusion node graphs, Fairlight DSP plugins, and third-party OFX effects are not rendered.
- Color pipeline covers ASC CDL and 1D/3D `.cube` LUTs in Rec.709; full OpenColorIO ACES config graphs are not bundled in v0.1.
- Hardware encoding (`h264_nvenc` / `hevc_nvenc`) requires an NVIDIA GPU and an NVENC-enabled FFmpeg build; otherwise `taktcut` falls back to `libx264` (`--no-hw` forces CPU encoding).

## Development & Tests

```bash
ruff check src tests
mypy
pytest -v
```

## Commercial Support & Custom Pipelines

Need custom post-production automation, CI media pipelines, or dedicated maintenance? See [Eclipse Technology Open Source Pro](https://eclipse-technology.eu/open-source-pro.html).

## License

MIT License. See [LICENSE](LICENSE).
