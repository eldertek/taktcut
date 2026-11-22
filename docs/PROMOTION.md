# taktcut - README Audit & Community Distribution Plan (Cycle #1)

## 1. README.md Audit

### What Already Works Well
- **Immediate positioning**: The opening paragraph explains all 4 core capabilities (OpenTimelineIO interchange, ASC CDL / `.cube` baking, deterministic FFmpeg/NVENC rendering, and Broadcast QA) and links directly to the zero-install web demo (`https://eclipse-technology.eu/demos/taktcut/`).
- **Clear differentiation**: The `Why taktcut` table contrasts MIT open-source workflows against $295 / $22.99/mo desktop NLE paywalls and highlights the clean-room, non-DRM guarantee.
- **Bilingual documentation**: Both English (`docs/index.md`) and French (`docs/fr/index.md`) guides are indexed cleanly.

### Concrete Gaps to Fix in Next Iteration
1. **Top-of-page trust & install friction**: Add GitHub CI status, MIT license, and Python 3.10+ badges under `# taktcut`, and list a one-line `pip install taktcut` / `pipx install taktcut` flow (once published to PyPI) ahead of `git clone` for non-contributor users.
2. **Use-case scannability**: Add a short "30-Second Workflows" section highlighting real creator & pipeline tasks (checking `-14 LUFS` YouTube/broadcast compliance, baking an ASC CDL look into a 33-pt `.cube` LUT, converting `.drp`/`.fcpxml` to `.otio` in CI).
3. **Contributor & issue triage hooks**: Add `CONTRIBUTING.md` and GitHub issue templates (timeline parser sample bug vs FFmpeg encoder profile request) to capture real-world `.drp`/`.fcpxml` edge cases from users.

---

## 2. Three Concrete Community Distribution Channels

> Note: Drafts only. Do not publish externally without explicit approval.

### Channel 1: GitHub Topics, PyPI Release & Awesome Lists
- **Targets**:
  - Repository Topics on `eldertek/taktcut`: `davinci-resolve`, `opentimelineio`, `ffmpeg`, `nvenc`, `color-grading`, `asc-cdl`, `cube-lut`, `ebur128`, `broadcast-qa`, `mcp-server`.
  - Awesome / ecosystem PRs: `krzemienski/awesome-video`, ASWF OpenTimelineIO community/integrations references, and `punkpeye/awesome-mcp-servers` (for the `taktcut mcp` stdio server).
- **Actionable angle**: Tag `v0.1.0` with wheel/sdist on PyPI so `pipx install taktcut` works in 10 seconds, and embed `docs/screenshot-desktop.png` in the release notes.

### Channel 2: Video Editors & Colorists (`r/VideoEditing`, `r/colorists`, `r/davinciresolve`, `r/YouTubers`)
- **Problem solved**: Editors often upload MP4s that fail YouTube/streaming loudness normalization (`-14 LUFS`), lack `+faststart` (`moov` atom after `mdat`), or need quick ASC CDL to 33-point `.cube` 3D LUT conversion without paying for Resolve Studio scripting.
- **Draft Post Outline**:
  - **Title**: `I built an open-source (MIT) Broadcast QA gate, CDL-to-.cube LUT baker, and .drp/.fcpxml to OTIO inspector that runs locally or in your browser`
  - **Key bullets**:
    1. Try it right in the browser with zero install (`https://eclipse-technology.eu/demos/taktcut/`): DaVinci-style Primary Color Wheels + live RGB curves/vectorscope + multi-track timeline inspector.
    2. Run locally (`taktcut ui --desktop`) for real FFmpeg/NVENC Rec.709 renders and an automated EBU R128 + CFR + `+faststart` Broadcast QA pass.
    3. Strictly clean-room MIT Python toolkit (only reads exported `.drp`/`.drt`/`.fcpxml`/`.otio` files).

### Channel 3: Media Pipeline & Developer Communities (`Show HN`, `r/ffmpeg`, MCP Dev Directories)
- **Problem solved**: Post-production TDs and DevOps engineers struggle to run headless timeline continuity checks, deterministic NVENC/libx264 command generation, and automated `ebur128` + `ffprobe` gates in CI or via AI agents.
- **Draft `Show HN` Angle**:
  - **Title**: `Show HN: taktcut - Clean-room OpenTimelineIO interchange, .cube LUT baker, and FFmpeg Broadcast QA (Web Studio + CLI + MCP)`
  - **Body points**:
    - Rational-time (`RationalTime`) integer-frame continuity validator catching gaps, overlaps, zero-duration clips, and FPS mismatches across `.drp`, `.drt`, `.fcpxml`, and `.otio`/`.otioz`.
    - Deterministic FFmpeg/NVENC render planner (`--dry-run` inspects exact CLI argv before execution) + `taktcut qa` gate (`ffprobe` CFR/faststart + `ebur128` LUFS/dBTP + start/mid/end `signalstats`).
    - Loopback-confined local Web Studio (`127.0.0.1` + strict CSP + `realpath` confinement) and `stdio` JSON-RPC MCP server.
