"""Command-line interface for taktcut."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from taktcut.color import bake_cdl_to_cube
from taktcut.drp import export_otio, load_timeline, validate_timeline
from taktcut.mcp_server import serve_stdio
from taktcut.models import AscCdlParams, RationalFrameRate, RenderProfile
from taktcut.qa import run_qa_gate
from taktcut.render import build_render_plan, execute_render_plan
from taktcut.ui.server import serve_ui


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="taktcut",
        description="Clean-room timeline interchange, color pipeline, and FFmpeg/NVENC QA toolkit.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_inspect = sub.add_parser("inspect", help="Inspect a .drp, .drt, .fcpxml, or .otio timeline")
    p_inspect.add_argument("path", type=Path)
    p_inspect.add_argument("--timeline", default=None)

    p_val = sub.add_parser("validate", help="Validate integer-frame continuity and gaps")
    p_val.add_argument("path", type=Path)
    p_val.add_argument("--timeline", default=None)

    p_conv = sub.add_parser("convert", help="Convert .drp/.drt/.fcpxml to .otio or .otioz")
    p_conv.add_argument("path", type=Path)
    p_conv.add_argument("--out", type=Path, required=True)
    p_conv.add_argument("--timeline", default=None)

    p_lut = sub.add_parser("bake-lut", help="Bake ASC CDL parameters into a 3D .cube LUT")
    p_lut.add_argument("--out", type=Path, required=True)
    p_lut.add_argument("--slope", type=float, nargs=3, default=[1.0, 1.0, 1.0])
    p_lut.add_argument("--offset", type=float, nargs=3, default=[0.0, 0.0, 0.0])
    p_lut.add_argument("--power", type=float, nargs=3, default=[1.0, 1.0, 1.0])
    p_lut.add_argument("--sat", type=float, default=1.0)
    p_lut.add_argument("--size", type=int, default=33)

    p_ren = sub.add_parser("render", help="Build or execute a deterministic FFmpeg/NVENC render")
    p_ren.add_argument("input", type=Path)
    p_ren.add_argument("--out", type=Path, required=True)
    p_ren.add_argument(
        "--profile",
        choices=[p.value for p in RenderProfile],
        default=RenderProfile.WEB_H264.value,
    )
    p_ren.add_argument("--fps", default=None, help="Rational FPS, e.g. 25 or 24000/1001")
    p_ren.add_argument("--lut", type=Path, default=None)
    p_ren.add_argument("--lufs", type=float, default=None)
    p_ren.add_argument("--no-hw", action="store_true")
    p_ren.add_argument("--dry-run", action="store_true")

    p_qa = sub.add_parser("qa", help="Run ffprobe + EBU R128 + faststart + frame QA gate")
    p_qa.add_argument("path", type=Path)
    p_qa.add_argument("--lufs", type=float, default=-14.0)
    p_qa.add_argument("--max-tp", type=float, default=-1.0)
    p_qa.add_argument("--tolerance", type=float, default=1.5)
    p_qa.add_argument("--no-faststart-check", action="store_true")

    sub.add_parser("mcp", help="Start the taktcut MCP server over stdio")

    p_ui = sub.add_parser("ui", help="Launch the local taktcut Web Studio GUI on 127.0.0.1")
    p_ui.add_argument(
        "--host",
        default="127.0.0.1",
        help="Loopback interface to bind (default: 127.0.0.1)",
    )
    p_ui.add_argument(
        "--port",
        type=int,
        default=8741,
        help="TCP port to listen on (0 for ephemeral port, default: 8741)",
    )
    p_ui.add_argument(
        "--no-open",
        action="store_true",
        help="Do not open a web browser tab automatically",
    )
    p_ui.add_argument(
        "--workspace-dir",
        type=Path,
        default=None,
        help="Confined workspace directory for media, timelines, and LUTs (default: cwd)",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    if args.command == "inspect":
        doc = load_timeline(args.path, timeline_name=args.timeline)
        print(doc.model_dump_json(indent=2))
        return 0

    if args.command == "validate":
        doc = load_timeline(args.path, timeline_name=args.timeline)
        res = validate_timeline(doc)
        print(res.model_dump_json(indent=2))
        return 0 if res.valid else 2

    if args.command == "convert":
        doc = load_timeline(args.path, timeline_name=args.timeline)
        written = export_otio(doc, args.out)
        print(json.dumps({"output_path": str(written), "timeline": doc.name}, indent=2))
        return 0

    if args.command == "bake-lut":
        cdl = AscCdlParams(
            slope=(args.slope[0], args.slope[1], args.slope[2]),
            offset=(args.offset[0], args.offset[1], args.offset[2]),
            power=(args.power[0], args.power[1], args.power[2]),
            saturation=args.sat,
        )
        info = bake_cdl_to_cube(cdl, args.out, size=args.size)
        print(info.model_dump_json(indent=2))
        return 0

    if args.command == "render":
        fps = RationalFrameRate.from_str(args.fps) if args.fps else None
        plan = build_render_plan(
            input_path=args.input,
            output_path=args.out,
            profile=RenderProfile(args.profile),
            fps=fps,
            lut_path=args.lut,
            target_lufs=args.lufs,
            prefer_hw=not args.no_hw,
        )
        if args.dry_run:
            print(plan.model_dump_json(indent=2))
            return 0
        result = execute_render_plan(plan)
        print(result.model_dump_json(indent=2))
        return 0 if result.success else 1

    if args.command == "qa":
        report = run_qa_gate(
            args.path,
            target_lufs=args.lufs,
            tolerance_lu=args.tolerance,
            max_true_peak_dbtp=args.max_tp,
            require_faststart=not args.no_faststart_check,
        )
        print(report.model_dump_json(indent=2))
        return 0 if report.passed else 2

    if args.command == "mcp":
        serve_stdio()
        return 0

    if args.command == "ui":
        try:
            return serve_ui(
                host=args.host,
                port=args.port,
                workspace_dir=args.workspace_dir,
                open_browser=not args.no_open,
            )
        except ValueError as exc:
            parser.error(str(exc))
            return 2

    return 1


if __name__ == "__main__":
    sys.exit(main())
