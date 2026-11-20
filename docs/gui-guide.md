# Web Studio & Desktop Workstation Guide

[English](gui-guide.md) | [Francais](fr/gui-guide.md) | [Home](index.md)

The `taktcut` Studio interface uses a docked NLE workstation layout modeled after DaVinci Resolve (`Timeline`, `Color`, `Deliver`, and `Broadcast QA` pages) so editors, colorists, and finishing producers can work visually without scripts or terminal commands.

## Launching Local Browser or Frameless Desktop Mode

Run either command from your project folder:

```bash
# Open in your default browser:
taktcut ui

# Open as a frameless desktop application window (Edge/Chrome --app or pywebview):
taktcut ui --desktop
# or standalone script:
taktcut-ui --desktop
```

Options:
- `--desktop`: Spawns a standalone frameless desktop application window (`msedge --app=...`, `google-chrome --app=...`, or `pywebview` if installed, with automatic fallback to the system browser).
- `--workspace-dir PATH`: Confines workspace file browsing, LUT saves, renders, and QA checks to a specific project folder (defaults to current working directory).
- `--port 8741`: Custom local TCP port (`0` picks an ephemeral available port).
- `--host 127.0.0.1`: Loopback host (`127.0.0.1`, `localhost`, or `::1` only).
- `--no-open`: Starts the server without opening any browser or desktop window.

In the top menu bar, switch between **EN** and **FR** at any time, inspect the active sequence raster/FPS, view your confined workspace directory, and verify FFmpeg/NVENC readiness.

### Static Web Deployment Mode (Eclipse Demo)

All frontend assets in `src/taktcut/ui/assets/` use relative module URLs (`./`) and support `window.__TAKTCUT_CONFIG__` (`apiBase`, `mode`: `"auto" | "server" | "static-demo"`, `adapter`). When hosted statically without a Python backend (such as [https://eclipse-technology.eu/demos/taktcut/](https://eclipse-technology.eu/demos/taktcut/)), the studio automatically activates its client-side demo engine for timeline inspection, `.otio` export, ASC CDL grading, `.cube` baking, and FFmpeg dry-run command generation.

---

## Page 01: Timeline (Media Pool, Program Monitor & Multi-Track Dock)

![taktcut Timeline Workstation](assets/taktcut-ui-desktop.png)

1. **Media Pool & Source (Left Dock)**:
   - Click **Sample Timeline** to load a clean 25p mastering timeline (`V1`, `V2`, `A1`, `A2`, plus markers), or **Diag. Issues** to inspect gaps, overlaps, zero-duration clips, and framerate mismatches.
   - Select any `.drp`, `.drt`, `.fcpxml`, or `.otio`/`.otioz` file from **Workspace Timeline** and click **Inspect**, or import a file from your computer via **Import Local File**.
   - Export to OpenTimelineIO (`.otio` JSON or `.otioz` bundle) via **Download OTIO** or **Save WS**.
2. **Program Monitor & Inspector (Center Dock)**:
   - Scrub the timeline playhead or step frame-by-frame (`|<`, `<`, `>`, `>|`) with live **SMPTE Timecode** (`00:00:00:00`) and active video layer slate overlay.
   - Click any clip or marker in the **Docked Multi-Track Timeline** at the bottom to inspect exact integer frames (`start_frame`, `duration_frames`, `source_in_frame`, `source_path`).
3. **Continuity & Markers (Right Dock)**:
   - Review real-time integer-frame validation (`PASS` / `FAIL`), marker cues, and referenced `.cube` LUT paths.

---

## Page 02: Color (DaVinci Primary Wheels, Scopes & `.cube` Baker)

![taktcut DaVinci Color Wheels & Scopes](assets/taktcut-ui-cdl.png)

1. **Color Viewer & Live Scopes (Top Split)**:
   - Drag the **Wipe** slider on the **Color Viewer (Rec.709 Before / After)** to compare original vs CDL-graded SMPTE bars, skin-tone patches, luminance ramp, and hue spectrum.
   - Monitor live **Waveform / RGB Transfer Curves** and the circular **Rec.709 Vectorscope** on the right.
   - Apply studio **Presets** (`Neutral`, `Warm Editorial`, `Teal & Amber`, `Crisp Contrast`, `Cool Broadcast`) or import an existing `.cdl`/`.cc` XML file.
2. **Primary Color Wheels & 3D `.cube` Baker (Bottom Split)**:
   - Drag the chroma puck inside the **LIFT (OFFSET)**, **GAMMA (POWER)**, and **GAIN (SLOPE)** color wheels (double-click any wheel or click **Rst** to reset) or fine-tune individual R/G/B and **Saturation** bars.
   - Configure **LUT Title** and **3D Grid Size** (`17`, `33`, or `65`), then click **Bake .cube**, **Download .cube**, or **Use in Deliver** to link your grade directly into the Deliver page.

---

## Page 03: Deliver (FFmpeg / NVENC Render Builder)

![taktcut Deliver Page](assets/taktcut-ui-render.png)

1. **Host FFmpeg & Hardware Encoder Probe**: Displays detected encoders (`h264_nvenc`, `hevc_nvenc`, `libx264`, `libx265`, `prores_ks`) and runs live GPU runtime verification via **Verify GPU Runtime**.
2. **Deliver Render Settings**: Pick a workspace input clip (or click **Generate Test Clip** for a 2-second 25fps Rec.709 synthetic clip), choose a profile (`web_h264`, `master_hevc`, `prores_hq`), rational FPS, `.cube` LUT or active Color Page CDL grade, and optional LUFS loudness target.
3. **Dry-Run & Execute**: Click **Build Plan (Dry-Run)** to inspect the exact FFmpeg command line, or **Execute Render** and then **Send to QA Gate**.

---

## Page 04: Broadcast QA Gate

![taktcut Broadcast QA Gate](assets/taktcut-ui-qa.png)

Verify deliverables before delivery with:
- **Container & Stream Probe (`ffprobe`)**: Codec, resolution, pixel format, CFR lock (`r_frame_rate` vs `avg_frame_rate`), duration delta, Rec.709 tags, audio sample rate, and MP4 `+faststart` (`moov` before `mdat`).
- **EBU R128 Loudness (`ebur128`)**: Integrated loudness (`LUFS`), loudness range (`LRA`), and true peak (`dBTP`) plotted against your target and tolerance band.
- **Frame Signalstats**: Start, midpoint, and near-end frame luminance ranges (`YMIN`, `YAVG`, `YMAX`).

---

## Mobile & Compact Viewports

![taktcut Studio Mobile View](assets/taktcut-ui-mobile.png)

Docked panes stack cleanly down to `375px` mobile screens with zero horizontal overflow while keeping the bottom 4-page NLE switcher accessible at all times.
