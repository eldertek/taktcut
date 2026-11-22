---
name: Bug report
about: Report a bug in timeline parsing, ASC CDL/.cube baking, FFmpeg/NVENC render, QA gate, or Web Studio UI
title: "[Bug]: "
labels: bug
assignees: ""
---

## Summary

A clear and concise description of the bug.

## Area

- [ ] Timeline parser / OTIO interchange (`.drp`, `.drt`, `.fcpxml`, `.otio`/`.otioz`)
- [ ] Color pipeline (ASC CDL / `.cube` LUT baking)
- [ ] Render planner / FFmpeg / NVENC
- [ ] Broadcast QA gate (`ffprobe`, `ebur128`, `signalstats`)
- [ ] Web Studio UI (`taktcut ui`)
- [ ] MCP server (`taktcut mcp`)

## Steps to Reproduce

1. Run command or UI action (`...`)
2. Input file type / flags (`...`)
3. Observed error or unexpected output (`...`)

## Expected Behavior

What you expected to happen.

## Environment

- OS: (e.g. Windows 11, Ubuntu 24.04, macOS 15)
- Python version: (`python --version`)
- taktcut version / commit SHA: (`taktcut --version` or `git rev-parse --short HEAD`)
- FFmpeg version: (`ffmpeg -version`)
- Browser (if Web Studio UI): (e.g. Chromium / Firefox / Edge, viewport size)

## Sample / Logs (Optional)

Attach redacted command output, console errors, or a minimal synthetic timeline snippet (no proprietary binaries or confidential media).
