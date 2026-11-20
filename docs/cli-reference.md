# CLI Reference

[English](cli-reference.md) | [Francais](fr/cli-reference.md) | [Home](index.md)

Every `taktcut` subcommand outputs structured JSON to `stdout` (except `taktcut mcp` which runs JSON-RPC over `stdio` and `taktcut ui` / `taktcut-ui` which launches the local HTTP studio server).

## Summary

| Command | Purpose | Non-Zero Exit Codes |
| :--- | :--- | :--- |
| `taktcut inspect` | Parse `.drp`, `.drt`, `.fcpxml`, or `.otio`/`.otioz` into normalized JSON | `1` / `2` on parse/arg error |
| `taktcut validate` | Check integer-frame continuity, gaps, overlaps, zero-duration, FPS parity | `2` when validation fails |
| `taktcut convert` | Export `.drp`, `.drt`, or `.fcpxml` to `.otio` or `.otioz` | `1` / `2` on error |
| `taktcut bake-lut` | Bake ASC CDL parameters into a validated 3D `.cube` LUT | `1` / `2` on invalid parameters |
| `taktcut render` | Build (dry-run) or execute a deterministic FFmpeg/NVENC Rec.709 render | `1` if execution fails |
| `taktcut qa` | Run `ffprobe` CFR/faststart, EBU R128 loudness, and frame signalstats gate | `2` when QA gate fails |
| `taktcut mcp` | Start the `stdio` JSON-RPC MCP server | `1` on runtime error |
| `taktcut ui` / `taktcut-ui` | Launch the local Web Studio GUI bound strictly to loopback | `2` on invalid host/args |

---

## `taktcut inspect`

Inspect a `.drp`, `.drt`, `.fcpxml`, `.xml`, `.otio`, or `.otioz` timeline without launching a desktop NLE.

```bash
taktcut inspect <path> [--timeline NAME]
```

- `path`: Path to the timeline or project file.
- `--timeline NAME`: Optional sequence name when a `.drp` archive contains multiple sequences.

Example:

```bash
taktcut inspect project.drp --timeline "Main Cut"
```

---

## `taktcut validate`

Audit integer-frame continuity across every track (`gap`, `overlap`, `zero_duration`, `fps_mismatch`).

```bash
taktcut validate <path> [--timeline NAME]
```

- Returns exit code `0` when `valid` is `true`, and `2` when issues are found.

Example:

```bash
taktcut validate timeline.fcpxml
```

---

## `taktcut convert`

Convert `.drp`, `.drt`, `.fcpxml`, or `.otio` into OpenTimelineIO (`.otio` or `.otioz`) with exact `RationalTime` metadata.

```bash
taktcut convert <path> --out <OUT> [--timeline NAME]
```

- `--out`: Destination `.otio` or `.otioz` path (parent directories created automatically).
- `--timeline NAME`: Optional sequence selector for multi-sequence `.drp` archives.

Example:

```bash
taktcut convert timeline.drt --out exports/sequence.otio
```

---

## `taktcut bake-lut`

Bake ASC CDL v1.2 parameters (`Slope`, `Offset`, `Power`, `Saturation`) into a standard Adobe/Iridas 3D `.cube` LUT (`0.0..1.0` domain).

```bash
taktcut bake-lut --out <OUT> [--slope R G B] [--offset R G B] [--power R G B] [--sat FLOAT] [--size INT]
```

Flags and defaults:
- `--out` (required): Output `.cube` path.
- `--slope R G B`: 3 floats (default `1.0 1.0 1.0`).
- `--offset R G B`: 3 floats (default `0.0 0.0 0.0`).
- `--power R G B`: 3 strictly positive floats (default `1.0 1.0 1.0`).
- `--sat FLOAT`: Rec.709 luma saturation, `>= 0.0` (default `1.0`).
- `--size INT`: 3D cube grid size from `2` to `65` (default `33`).

Example:

```bash
taktcut bake-lut --out look.cube --slope 1.05 1.0 0.96 --offset 0.01 0.0 -0.01 --power 0.98 0.98 1.0 --sat 1.12 --size 33
```

---

## `taktcut render`

Compile (and optionally execute) a deterministic Rec.709 FFmpeg/NVENC render plan with CFR lock (`-fps_mode cfr`) and `GOP = 2 * fps`.

```bash
taktcut render <input> --out <OUT> [--profile PROFILE] [--fps RATE] [--lut PATH] [--lufs FLOAT] [--no-hw] [--dry-run]
```

Flags and defaults:
- `--out` (required): Destination media path.
- `--profile`: `web_h264` (default, H.264 + AAC + `+faststart`), `master_hevc` (HEVC + AAC + `+faststart`), or `prores_hq` (ProRes 422 HQ `yuv422p10le` + `pcm_s24le`).
- `--fps RATE`: Rational FPS such as `25`, `24`, or `24000/1001` (defaults to `25`).
- `--lut PATH`: Validated `.cube` LUT applied via FFmpeg `lut3d` tetrahedral interpolation.
- `--lufs FLOAT`: Enable `loudnorm` target integrated loudness (`TP=-1.0`, `LRA=11.0` if `>= -16.0` else `7.0`).
- `--no-hw`: Force CPU software encoder (`libx264` / `libx265`) instead of probing/using NVENC.
- `--dry-run`: Print the compiled JSON `RenderPlan` (`argv`, filters, pix_fmt) without invoking FFmpeg.

Example:

```bash
taktcut render input.mov --out delivery.mp4 --profile web_h264 --fps 25 --lut look.cube --lufs -14 --dry-run
```

---

## `taktcut qa`

Run the complete broadcast verification gate (`ffprobe` stream/CFR/color tags, MP4 `moov`-before-`mdat` faststart check, EBU R128 loudness & true peak, and start/midpoint/near-end frame `signalstats`).

```bash
taktcut qa <path> [--lufs FLOAT] [--max-tp FLOAT] [--tolerance FLOAT] [--no-faststart-check]
```

Flags and defaults:
- `--lufs`: Target integrated loudness in LUFS (default `-14.0`).
- `--max-tp`: Maximum allowed true peak in dBTP (default `-1.0`).
- `--tolerance`: Acceptable LU deviation around `--lufs` (default `1.5`).
- `--no-faststart-check`: Skip MP4/MOV `moov`-before-`mdat` check.

Exit codes: `0` when `passed` is `true`, `2` when any check fails.

Example:

```bash
taktcut qa delivery.mp4 --lufs -14 --max-tp -1.0 --tolerance 1.5
```

---

## `taktcut ui` and `taktcut-ui`

Start the local Web Studio GUI over `ThreadingHTTPServer` bound strictly to loopback.

```bash
taktcut ui [--host HOST] [--port PORT] [--no-open] [--workspace-dir DIR]
taktcut-ui [--host HOST] [--port PORT] [--no-open] [--workspace-dir DIR]
```

Flags and defaults:
- `--host`: Loopback bind host (`127.0.0.1`, `localhost`, or `::1`; default `127.0.0.1`). Non-loopback hosts are rejected.
- `--port`: TCP port (`0` selects an ephemeral OS port; default `8741`).
- `--no-open`: Do not open the default web browser automatically.
- `--workspace-dir`: Confined workspace root directory (default: current working directory).

---

## `taktcut mcp`

Start the Model Context Protocol server over `stdio`. See [MCP Setup Guide](mcp-setup.md).
