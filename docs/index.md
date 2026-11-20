# taktcut Documentation

[English](index.md) | [Francais](fr/index.md)

`taktcut` is a clean-room, cross-platform post-production toolkit for inspecting DaVinci Resolve (`.drp`, `.drt`), FCPXML (`.fcpxml`), and OpenTimelineIO (`.otio`, `.otioz`) timelines, baking ASC CDL v1.2 color grades into 3D `.cube` LUTs, compiling deterministic FFmpeg/NVENC Rec.709 renders, and running automated broadcast QA gates (CFR, MP4 faststart, EBU R128 loudness, and multi-timestamp luma signalstats).

## Choose Your Workflow

| Audience | Interface | What You Can Do | Guide |
| :--- | :--- | :--- | :--- |
| Editors, Colorists, Producers | **Local Web Studio GUI** (`taktcut ui` / `taktcut-ui`) | Visual multi-track timeline inspection, real-time CDL grading & `.cube` export, FFmpeg/NVENC render builder, and broadcast QA dashboard in any browser | [Web Studio GUI Guide](gui-guide.md) |
| Pipeline Engineers, DevOps, CI | **Command-Line Interface** (`taktcut`) | Scriptable JSON output, headless `.drp`/`.drt`/`.fcpxml` conversion, batch `.cube` baking, dry-run/executed renders, and CI exit-code QA gates | [CLI Reference](cli-reference.md) |
| AI Agents & Studio Automation | **MCP Server** (`taktcut mcp`) | Expose all 8 timeline, color, render, and QA tools over `stdio` JSON-RPC to Claude Desktop, Cursor, or Antigravity | [MCP Setup Guide](mcp-setup.md) |

## Quickstart (30 Seconds)

### 1. Install

```bash
git clone https://github.com/eldertek/taktcut.git
cd taktcut
python -m venv .venv
# Linux / macOS: source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -e ".[dev]"
```

Requirements:
- Python 3.10+
- `ffmpeg` and `ffprobe` available on `PATH` (optional for timeline/LUT workflows, required for Render & Broadcast QA Gate).

### 2. Launch the Visual Studio GUI

```bash
taktcut ui --workspace-dir /path/to/your/project
```

Or using the standalone entrypoint:

```bash
taktcut-ui --workspace-dir /path/to/your/project
```

Your browser opens automatically at `http://127.0.0.1:8741/`. Click **Load Sample Timeline** or pick a timeline file from your workspace to inspect tracks, validate frame continuity, grade with ASC CDL sliders, build FFmpeg/NVENC commands, and verify broadcast QA metrics.

## Clean-Room & Security Design

- Zero binary inspection, decompilation, or DRM/license bypass of proprietary NLE software.
- XML parsing uses `defusedxml` strictly (blocking DTD, external entities, and entity expansion attacks).
- `.drp` / `.drt` ZIP archives enforce ZipSlip path traversal checks and a 128 MiB uncompressed XML cap.
- `taktcut ui` binds strictly to loopback interfaces (`127.0.0.1`, `localhost`, `::1`), enforces a strict `Content-Security-Policy`, and confines every workspace file read/write via `realpath`.
