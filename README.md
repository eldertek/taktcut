# taktcut

Clean-room OpenTimelineIO interchange, ASC CDL / `.cube` color pipeline, deterministic FFmpeg/NVENC rendering, and broadcast QA toolkit with local Web Studio GUI, CLI, and MCP server.

`taktcut` inspects `.drp`, `.drt`, `.fcpxml`, and `.otio`/`.otioz` exports, bakes ASC CDL grades into `.cube` 3D LUTs, renders Rec.709 deliverables via FFmpeg/NVENC, and runs an EBU R128 + faststart QA gate from the **Web Studio GUI**, **CLI**, or **MCP** without opening a desktop NLE.

![taktcut Web Studio GUI](docs/assets/taktcut-ui-desktop.png)

## Why taktcut

| Workflow | Proprietary paywalls | taktcut (MIT) |
| :--- | :--- | :--- |
| Headless & visual timeline inspection | DaVinci Resolve Studio ($295) requires an active desktop GUI session for scripting | Clean-room `.drp`, `.drt`, `.fcpxml`, and `.otio`/`.otioz` parser with exact `RationalTime` frame math & Web Studio viewer |
| Color look baking & Rec.709 delivery | Desktop NLE lock-in (Premiere Pro $22.99/mo, Resolve Studio $295) | ASC CDL v1.2 studio & XML parser, 33-point `.cube` 3D LUT baker, and FFmpeg `lut3d` Rec.709 render plans |
| Broadcast loudness & streaming QA | Manual NLE export checks or paid QC suites | Automated `ffprobe` CFR/faststart check, `ebur128` loudness audit, and start/mid/end frame verification |
| CI & agent integration | Closed desktop plugins | Scriptable CLI, loopback Web Studio (`taktcut ui`), and `stdio` JSON-RPC MCP server |

## Clean-Room & Security Guarantee

- Zero binary inspection, decompilation, or symbol extraction from proprietary NLE executables.
- Zero DRM or license bypasses.
- Operates strictly on user-exported project/timeline/color files and open standards (ZIP, `defusedxml` XML parsing, ASWF OpenTimelineIO, ASC CDL, Adobe `.cube` LUTs, FFmpeg, EBU R128).
- `taktcut ui` binds strictly to loopback (`127.0.0.1`), enforces strict `Content-Security-Policy`, and confines every workspace path via `realpath`.

## Requirements

- Python 3.10+
- `ffmpeg` and `ffprobe` on `PATH` (for rendering and Broadcast QA Gate)

## Installation

```bash
git clone https://github.com/eldertek/taktcut.git
cd taktcut
pip install -e ".[dev]"
```

## Quickstart: NLE Studio GUI & Desktop Mode

Launch the docked DaVinci-style workstation interface (EN/FR toggle included) in your browser or as a standalone frameless desktop window (`--desktop`):

```bash
# Browser mode:
taktcut ui --workspace-dir /path/to/your/project

# Frameless Desktop App mode (Edge/Chrome --app or pywebview):
taktcut ui --desktop --workspace-dir /path/to/your/project
# or standalone command:
taktcut-ui --desktop --workspace-dir /path/to/your/project
```

Four docked workstation pages:
1. **Timeline**: Media Pool loader (`.drp`, `.drt`, `.fcpxml`, `.otio`/`.otioz`, or sample fixture), Program Monitor with SMPTE timecode scrub, Docked Multi-Track Timeline (`V1`, `V2`, `A1`, `A2`), continuity validation, and `.otio`/`.otioz` export.
2. **Color**: Interactive **Lift / Gamma / Gain** DaVinci Color Wheels & Primary Bars, Rec.709 Before/After split monitor, live RGB curves & vectorscope, `.cdl` import, and 3D `.cube` LUT baking.
3. **Deliver**: Host NVENC/CPU encoder probe, deterministic Rec.709 FFmpeg render planning & execution, studio LUT linking, and EBU R128 loudnorm.
4. **Broadcast QA**: `ffprobe` CFR/faststart audit, EBU R128 LUFS/dBTP gauges, and start/mid/end frame signalstats verification.

Static frontend assets (`src/taktcut/ui/assets/`) also run standalone on static web hosting (via relative imports, `window.__TAKTCUT_CONFIG__`, and a client-side demo adapter).

See the full visual walkthrough in [Web Studio & Desktop Guide (EN)](docs/gui-guide.md) | [Guide Interface Graphique (FR)](docs/fr/gui-guide.md).

## Quickstart: CLI

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

## Quickstart: MCP Server (`stdio`)

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

## Documentation

| Language | Hub | GUI Guide | CLI Reference | MCP Setup |
| :--- | :--- | :--- | :--- | :--- |
| English | [docs/index.md](docs/index.md) | [docs/gui-guide.md](docs/gui-guide.md) | [docs/cli-reference.md](docs/cli-reference.md) | [docs/mcp-setup.md](docs/mcp-setup.md) |
| Francais | [docs/fr/index.md](docs/fr/index.md) | [docs/fr/gui-guide.md](docs/fr/gui-guide.md) | [docs/fr/cli-reference.md](docs/fr/cli-reference.md) | [docs/fr/mcp-setup.md](docs/fr/mcp-setup.md) |

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
