# MCP Server Setup Guide

[English](mcp-setup.md) | [Francais](fr/mcp-setup.md) | [Home](index.md)

`taktcut` includes a clean-room Model Context Protocol (`stdio` JSON-RPC) server exposing 8 post-production tools for AI assistants and automated studio agents.

## Client Configuration

### Claude Desktop / Cursor / Antigravity

If `taktcut` is installed in an active global environment on `PATH`:

```json
{
  "mcpServers": {
    "taktcut": {
      "command": "taktcut",
      "args": ["mcp"]
    }
  }
}
```

If `taktcut` is installed inside a project virtual environment (recommended for isolated workstations):

**Linux / macOS:**

```json
{
  "mcpServers": {
    "taktcut": {
      "command": "/path/to/taktcut/.venv/bin/taktcut",
      "args": ["mcp"]
    }
  }
}
```

**Windows:**

```json
{
  "mcpServers": {
    "taktcut": {
      "command": "C:\\Workspace\\05_Ressources\\taktcut\\.venv\\Scripts\\taktcut.exe",
      "args": ["mcp"]
    }
  }
}
```

You can also invoke it via Python module mode:

```json
{
  "mcpServers": {
    "taktcut": {
      "command": "python",
      "args": ["-m", "taktcut.cli", "mcp"]
    }
  }
}
```

---

## Exposed MCP Tools

| Tool Name | Key Parameters | Description |
| :--- | :--- | :--- |
| `drp_inspect` | `path`, `timeline_name?` | Parse `.drp`, `.drt`, `.fcpxml`, or `.otio`/`.otioz` into normalized `TimelineDocument` JSON without opening Resolve. |
| `drp_to_otio` | `path`, `out_otio`, `timeline_name?` | Convert `.drp`, `.drt`, or `.fcpxml` to `.otio` or `.otioz` and return validation summary. |
| `timeline_validate` | `path`, `timeline_name?` | Audit integer-frame continuity (`gap`, `overlap`, `zero_duration`, `fps_mismatch`). |
| `lut_bake_cdl` | `out_cube`, `slope?`, `offset?`, `power?`, `saturation?`, `size?`, `title?` | Bake ASC CDL parameters into a validated 3D `.cube` LUT (`size` defaults to `33`). |
| `grade_apply_lut` | `input_path`, `output_path`, `cube_path?`, `cdl_slope?`, `cdl_offset?`, `cdl_power?`, `cdl_saturation?`, `profile?`, `target_lufs?`, `prefer_hw?` | Render media through a `.cube` LUT or inline ASC CDL parameters with Rec.709 color tags. |
| `render_plan` | `input_path`, `output_path`, `profile?`, `fps_num?`, `fps_den?`, `target_lufs?`, `cube_path?`, `prefer_hw?`, `execute?` | Build (and optionally execute when `execute=true`) a deterministic FFmpeg/NVENC/`libx264`/`prores_ks` render plan. |
| `qa_probe_loudness` | `media_path`, `target_lufs?`, `max_true_peak_dbtp?`, `tolerance_lu?` | Measure EBU R128 integrated loudness (`LUFS`), `LRA` (`LU`), and true peak (`dBTP`). |
| `qa_verify_media` | `media_path`, `target_lufs?`, `max_true_peak_dbtp?`, `tolerance_lu?`, `require_faststart?` | Run the full `ffprobe` CFR/pix_fmt + `+faststart` + `ebur128` + start/mid/end frame verification gate. |

## Quick Handshake Smoke Test

Verify the `stdio` server starts and responds cleanly:

```bash
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"probe","version":"0.1.0"}}}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":2,"method":"tools/list"}\n' | taktcut mcp
```
