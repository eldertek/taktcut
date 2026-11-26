# Changelog

All notable changes to TaktCut Studio are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-11-26

Production DaVinci Resolve Studio 21 `.dra` / `.drp` parity release validated end-to-end on real multi-camera 4K Sony FX3 S-Log3 + ProRes 4444 archives (21 video tracks, 7 audio tracks, 234 video clips, 87 audio clips, 0 offline media).

### Added
- **Resolve 21 `EffectFiltersBA` Full Inspector Decoding** (`src/taktcut/resolve_db.py`, `src/taktcut/resolve_archive.py`):
  - Decodes Resolve 21 Zstd/protobuf `EffectFiltersBA` envelopes with signed zigzag varints for Composite Mode (`Normal`, `Add`, `Subtract`, `Difference`, `Multiply`, `Screen`, `Overlay`, `Hard Light`, `Soft Light`, `Darken`, `Lighten`, `Exclusion`), Opacity, 2D Transform (`Zoom X/Y`, `Position X/Y` with Resolve Y-up to TaktCut Y-down coordinate conversion, `Rotation`), Inspector Crop (`Left/Right/Top/Bottom`), Video Fades, and Audio Volume/Fades.
- **Resolve 21 Color Page `VersionBody` Decoding & Per-Clip Camera Log CST** (`src/taktcut/resolve_db.py`, `src/taktcut/models.py`, `src/taktcut/timeline_render.py`):
  - Decodes Resolve `ProtoVersion.VersionBody` serial node graphs including `colorspacetransformv2` chains (e.g. Sony S-Log3 / S-Gamut3.Cine -> DaVinci Wide Gamut -> Rec.709 Gamma 2.4 with Forward OOTF middle-grey calibration), unmasked Primary Corrector wheels (`Lift`, `Gamma`, `Gain`, `Offset`, `Contrast`, `Saturation`, `Temperature`), RGB Mixer diagonal boosts, HDR Zones (`Global`, `Dark`, `Light`, `Highlight`), and Film Look Creator, while automatically skipping Power Window and HSL Qualifier localized nodes.
  - Bakes and caches per-clip 33x33x33 `.cube` 3D LUTs on demand before per-clip color grades in Deliver renders.
- **Automatic Chunked Multi-Segment Rendering** (`src/taktcut/timeline_render.py`, `src/taktcut/ui/server.py`):
  - Automatically splits very large multi-track timelines (20+ tracks, 150+ clips) into bounded FFmpeg segments (`<= 2 GB` RAM peak) and concatenates them losslessly via FFmpeg concat demuxer, enabling full 4K feature/clip exports without memory exhaustion or Win32 command-line overflow.

### Fixed
- **DaVinci `.dra` Nested `MediaFiles/**`, NFC Accents & Image Sequences** (`src/taktcut/resolve_archive.py`, `src/taktcut/timeline_render.py`):
  - Recursively indexes nested `MediaFiles/**` folders with Unicode NFC/NFD normalization (solving macOS NFD accented filenames like `Théo.mov` and `Léonard.mov` on Windows), resolves Resolve `[start-end]` PNG/EXR image sequences, computes `_hour_offset` from positive video starts, and compacts FFmpeg filtergraphs via `-filter_complex_script` on Windows.
- **Nested `<OriginalClip>` Ghost Clip Exclusion** (`src/taktcut/resolve_archive.py`):
  - Parses only direct track items under `Items/Element` instead of recursing into Resolve's `<OriginalClip>` backup subtrees, eliminating duplicate compound/fusion ghost clips overlapping active timeline edits.
- **Unified RGBA 2D Transform & Alpha-Preserving Blend Compositing** (`src/taktcut/timeline_render.py`):
  - Replaces separate zoom-in/zoom-out branches with exact RGBA canvas intersection geometry (`scale` -> `crop` -> `format=rgba` -> Inspector crop -> `rotate` -> exact `(ox, oy)` intersection + transparent `pad`), supporting all zooms (`10%..300%`) and off-edge translations without opaque black boxes.
  - Upgrades blend modes (`screen`, `add`, `multiply`, `overlay`, `hardlight`, `softlight`, `lighten`, `darken`, `difference`, `subtract`, `exclusion`, `divide`) to alpha-preserving W3C compositing (`Cr = (1 - a) * Cb + a * B(Cb, Cs)`) and guards ProRes 4444 / PNG alpha channels against YUV-only FFmpeg `eq` filters.

## [0.2.0] - 2026-11-25

Major milestone introducing full DaVinci Resolve Studio 21 interface parity across all 7 pages, a local multi-track FFmpeg/NVENC timeline rendering engine, the Resolve Cinema Pack (real Deliver transitions, 2.39:1 Output Blanking, Dynamic Zoom, cinema `Text+` tracking, Kodak 2383 / highlight-targeted 35mm Halation, Fairlight Tape-Stop), and standalone 1-click desktop binaries.

### Added
- **Resolve Cinema Pack (Deliver & Live Preview)** (`src/taktcut/timeline_render.py`, `src/taktcut/models.py`, `src/taktcut/ui/server.py`, `src/taktcut/ui/assets/canvas.js`, `src/taktcut/ui/assets/inspector.js`, `src/taktcut/ui/assets/resolve_effects_engine.js`):
  - Real multi-track Deliver video transitions (`Cross Dissolve`, `Blur Dissolve`, `Additive Dissolve`, `Dip To Color Dissolve` with custom Dip Color swatch, and `Brightness Flash`).
  - `Output Blanking` cinema scope framing (`2.39:1`, `2.35:1`, `2.00:1`, `1.85:1`, `2.40:1`) rendered both live on the Program Monitor and natively in Deliver FFmpeg exports.
  - Subpixel `Dynamic Zoom` (`slow_zoom_in`, `slow_zoom_out`, `pan_left_to_right`, `pan_right_to_left`) compiled into multi-track renders.
  - Minimalist cinema `Text+` typography with `Tracking` (letter-spacing), `Bahnschrift` / `Garamond` / `Georgia` / `Open Sans` / `Anton` font support, soft optical bloom, and pure black intertitle card backgrounds.
  - `Kodak 2383` Film Look Creator, `horror_cold` / `warm_christmas` cinema looks, and highlight-targeted 35mm optical `Halation` (extracting bright highlights only above luma threshold).
  - Fairlight `Tape Stop` progressive pitch-drop / wind-down (`asplit` + `asetrate` + `vibrato` + `acrossfade`), `wow_flutter`, and constant-power stereo `pan` per track and clip.
- **DaVinci Resolve Studio 21 Full 7-Page UI Parity** (`src/taktcut/ui/`):
  - Complete workstation across Media, Cut (dual timeline & Source Tape), Edit (6-tab Inspector, Effects Library taxonomy, live hover scrub preview, timeline drag-and-drop, Viewer edit overlay, clip context menu), Fusion (node graph & viewers), Color (Primaries Wheels, HDR, Curves, Color Warper, Qualifier, Power Windows, Serial Nodes, Scopes), Fairlight (DAW mixer, 32-band FFT, Broadcast Audio Rack), Deliver (Render Settings & Batch Render Queue), and Project Manager.
  - Real Resolve `.dra` archive and `Project.db` reader with bundled training demo timelines and Open Sans UI typography.
- **Local Media Engine & Standalone Desktop App** (`src/taktcut/local_media.py`, `src/taktcut/desktop_entry.py`):
  - Local file import (`MP4`, `MOV`, `WAV`, `MP3`, `PNG`, `JPG`) with HTTP Range streaming, thumbnails, waveform peak extraction, and confined workspace persistence (`.taktcut.json`).
  - Multi-track video/audio compositing with blend modes (`screen`, `add`, `multiply`, `overlay`), per-clip color grades, 3D `.cube` LUTs, Resolve FX, and Fairlight audio plugins.
- **Pro Finishing & Editorial Studios**:
  - 35mm/16mm Film Look Creator (`Shift+N`), Optical Glow & Anamorphic Lens Flare (`Shift+U`), Camera Shake & Lens Distortion (`Shift+J`), Camera Stabilization, Optical-Flow Speed-Ramp Retime (`Shift+Y`), Power Windows & 4-Point Planar Tracker (`Shift+W`), Multi-Cam Quad Live Switcher (`Shift+V`), Camera Log CST (`Shift+L`), Auto Reframe (`Shift+R`), False Color IRE & Dual Zebra Broadcast Safe, Text-Based Rough-Cut, Scene Cut Detection, Media Pool Pro Proxies & A/V Sync.

### Fixed
- **Windows FreeType Non-ASCII Font Crash** (`src/taktcut/timeline_render.py`): automatically caches bundled and system fonts to an ASCII-only path so FFmpeg `drawtext` never crashes on Windows user profiles containing accented characters.
- **Multi-Track FFmpeg Deadlock & NVENC Fallback** (`src/taktcut/timeline_render.py`): streams stderr to a temporary log file to prevent Windows pipe deadlocks and automatically falls back from `h264_nvenc` / `hevc_nvenc` to `libx264` / `libx265` if hardware encoding fails at runtime.
- **Broadcast EBU R128 True Peak Compliance** (`src/taktcut/timeline_render.py`): enforces `alimiter=limit=0.84:level=disabled` after `loudnorm` so exported masters strictly stay below `-1.0 dBTP` (verified `-14.2 LUFS` / `-1.6 dBTP` in Broadcast QA Gate).
- **Color Viewer Multi-Layer Alpha & Desktop Window Polish** (`src/taktcut/ui/assets/canvas.js`, `src/taktcut/desktop_entry.py`): fixed multi-track black letterbox overwrite on stacked clips and suppressed Chromium translate popups in `--desktop` mode.

## [0.1.27] - 2026-11-23

### Added
- Baseline clean-room OpenTimelineIO, DaVinci Resolve interchange, ASC CDL / `.cube` LUT color science, FFmpeg/NVENC render pipeline, Broadcast QA Gate, MCP server, and initial cross-platform PyInstaller desktop release pipeline (`TaktCut-Windows.exe`, `TaktCut-macOS.zip`, `TaktCut-Linux`).
