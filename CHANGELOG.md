# Changelog

All notable changes to TaktCut Studio are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
