# Contributing to taktcut

Thank you for your interest in contributing to `taktcut`!

## Clean-Room Policy

`taktcut` is a strictly clean-room MIT project. Contributions must follow these rules:

- Never inspect, decompile, reverse-engineer, or extract symbols from proprietary NLE executables or binaries.
- Never include DRM or license bypass code.
- Operate exclusively on user-exported interchange formats and open standards (`.drp`, `.drt`, `.fcpxml`, `.otio`/`.otioz`, ASC CDL, `.cube` LUTs, FFmpeg, EBU R128).
- Never commit copyrighted media assets or proprietary project files with sensitive metadata; use minimal synthetic fixtures generated in tests (`create_sample_drt_bytes`, FFmpeg `testsrc2`, etc.).

## Local Development Setup

Requires Python 3.10+ and `ffmpeg`/`ffprobe` on `PATH`:

```bash
git clone https://github.com/eldertek/taktcut.git
cd taktcut
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell:
# .venv\Scripts\Activate.ps1

pip install -e ".[dev]"
```

Launch the local Web Studio UI during frontend work:

```bash
taktcut ui --workspace-dir .
```

## Quality Checks

Before opening a pull request, verify that all checks pass:

```bash
ruff check src tests
mypy
pytest -v
```

### Frontend & Security Guidelines

- Keep `src/taktcut/ui/assets/` dependency-free (vanilla ES modules + CSS, compatible with both `taktcut ui` and static web hosting).
- Maintain strict CSP compatibility (no inline `<script>` or `<style>`, no `eval`).
- Never use `innerHTML` or unsafe DOM sinks; build nodes with `document.createElement` and `textContent`.
- Preserve keyboard accessibility (`:focus-visible`), `>= 44px` touch targets on narrow screens, and zero horizontal overflow from `375px` to `1440px`.
- Verify any workspace file path handling goes through `taktcut.ui.security`.

## Submitting Changes

1. Fork the repository and create a focused feature or fix branch.
2. Add or update unit/integration tests in `tests/`.
3. Run `ruff check src tests`, `mypy`, and `pytest -v`.
4. Open a pull request with a clear summary of the change and verification results.
