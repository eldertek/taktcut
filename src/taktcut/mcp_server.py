"""Model Context Protocol (MCP) stdio server for taktcut."""

from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Any

from mcp.server.mcpserver import MCPServer

from taktcut.color import bake_cdl_to_cube, parse_cube_lut
from taktcut.drp import export_otio, load_timeline, validate_timeline
from taktcut.models import AscCdlParams, RationalFrameRate, RenderProfile
from taktcut.qa import audit_loudness, run_qa_gate
from taktcut.render import build_render_plan, execute_render_plan


def _triplet_or_default(
    values: list[float] | None,
    default: tuple[float, float, float],
) -> tuple[float, float, float]:
    if values is None:
        return default
    if len(values) != 3:
        raise ValueError(f"Expected 3 float values, got {len(values)}")
    return (float(values[0]), float(values[1]), float(values[2]))


def create_mcp_server() -> MCPServer:
    """Create and configure the taktcut MCPServer instance."""
    server = MCPServer(
        name="taktcut",
        instructions=(
            "Clean-room timeline interchange (.drp/.drt/.fcpxml/.otio), "
            "ASC CDL/.cube color grading, deterministic FFmpeg/NVENC rendering, "
            "and EBU R128 broadcast QA."
        ),
    )

    @server.tool()
    def drp_inspect(path: str, timeline_name: str | None = None) -> dict[str, Any]:
        """Inspect a .drp, .drt, .fcpxml, or .otio/.otioz timeline file without opening Resolve."""
        doc = load_timeline(Path(path), timeline_name=timeline_name)
        return doc.model_dump(mode="json")

    @server.tool()
    def drp_to_otio(
        path: str,
        out_otio: str,
        timeline_name: str | None = None,
    ) -> dict[str, Any]:
        """Convert a .drp, .drt, or .fcpxml timeline into OpenTimelineIO (.otio or .otioz)."""
        doc = load_timeline(Path(path), timeline_name=timeline_name)
        written = export_otio(doc, Path(out_otio))
        validation = validate_timeline(doc)
        return {
            "output_path": str(written),
            "timeline_name": doc.name,
            "fps": doc.fps.ffmpeg_rate,
            "valid": validation.valid,
            "issues_count": len(validation.issues),
        }

    @server.tool()
    def timeline_validate(path: str, timeline_name: str | None = None) -> dict[str, Any]:
        """Validate integer-frame continuity, overlaps, gaps, and FPS parity on a timeline."""
        doc = load_timeline(Path(path), timeline_name=timeline_name)
        return validate_timeline(doc).model_dump(mode="json")

    @server.tool()
    def lut_bake_cdl(
        out_cube: str,
        slope: list[float] | None = None,
        offset: list[float] | None = None,
        power: list[float] | None = None,
        saturation: float = 1.0,
        size: int = 33,
        title: str = "taktcut_cdl",
    ) -> dict[str, Any]:
        """Bake ASC CDL (Slope, Offset, Power, Saturation) into a 3D .cube LUT file."""
        cdl = AscCdlParams(
            slope=_triplet_or_default(slope, (1.0, 1.0, 1.0)),
            offset=_triplet_or_default(offset, (0.0, 0.0, 0.0)),
            power=_triplet_or_default(power, (1.0, 1.0, 1.0)),
            saturation=saturation,
        )
        info = bake_cdl_to_cube(cdl, Path(out_cube), size=size, title=title)
        return info.model_dump(mode="json")

    @server.tool()
    def grade_apply_lut(
        input_path: str,
        output_path: str,
        cube_path: str | None = None,
        cdl_slope: list[float] | None = None,
        cdl_offset: list[float] | None = None,
        cdl_power: list[float] | None = None,
        cdl_saturation: float = 1.0,
        profile: str = "web_h264",
        target_lufs: float | None = None,
        prefer_hw: bool = True,
    ) -> dict[str, Any]:
        """Apply a .cube LUT or ASC CDL grade to media and render with Rec.709 color tags."""
        render_prof = RenderProfile(profile)
        has_cdl = any(v is not None for v in (cdl_slope, cdl_offset, cdl_power)) or (
            cdl_saturation != 1.0
        )

        if cube_path is not None:
            parse_cube_lut(Path(cube_path))
            plan = build_render_plan(
                input_path=Path(input_path),
                output_path=Path(output_path),
                profile=render_prof,
                lut_path=Path(cube_path),
                target_lufs=target_lufs,
                prefer_hw=prefer_hw,
            )
            result = execute_render_plan(plan)
            return {
                "plan": plan.model_dump(mode="json"),
                "result": result.model_dump(mode="json"),
            }

        if has_cdl:
            cdl = AscCdlParams(
                slope=_triplet_or_default(cdl_slope, (1.0, 1.0, 1.0)),
                offset=_triplet_or_default(cdl_offset, (0.0, 0.0, 0.0)),
                power=_triplet_or_default(cdl_power, (1.0, 1.0, 1.0)),
                saturation=cdl_saturation,
            )
            with tempfile.TemporaryDirectory(prefix="taktcut_lut_") as tmp_dir:
                baked = Path(tmp_dir) / "cdl_grade.cube"
                bake_cdl_to_cube(cdl, baked, size=33, title="taktcut_inline_cdl")
                plan = build_render_plan(
                    input_path=Path(input_path),
                    output_path=Path(output_path),
                    profile=render_prof,
                    lut_path=baked,
                    target_lufs=target_lufs,
                    prefer_hw=prefer_hw,
                )
                result = execute_render_plan(plan)
                return {
                    "plan": plan.model_dump(mode="json"),
                    "result": result.model_dump(mode="json"),
                }

        plan = build_render_plan(
            input_path=Path(input_path),
            output_path=Path(output_path),
            profile=render_prof,
            target_lufs=target_lufs,
            prefer_hw=prefer_hw,
        )
        result = execute_render_plan(plan)
        return {
            "plan": plan.model_dump(mode="json"),
            "result": result.model_dump(mode="json"),
        }

    @server.tool()
    def render_plan(
        input_path: str,
        output_path: str,
        profile: str = "web_h264",
        fps_num: int | None = None,
        fps_den: int = 1,
        target_lufs: float | None = None,
        cube_path: str | None = None,
        prefer_hw: bool = True,
        execute: bool = False,
    ) -> dict[str, Any]:
        """Build (and optionally execute) a deterministic FFmpeg/NVENC/x264/ProRes render plan."""
        fps = RationalFrameRate(num=fps_num, den=fps_den) if fps_num is not None else None
        plan = build_render_plan(
            input_path=Path(input_path),
            output_path=Path(output_path),
            profile=RenderProfile(profile),
            fps=fps,
            lut_path=Path(cube_path) if cube_path else None,
            target_lufs=target_lufs,
            prefer_hw=prefer_hw,
        )
        payload: dict[str, Any] = {"plan": plan.model_dump(mode="json")}
        if execute:
            payload["result"] = execute_render_plan(plan).model_dump(mode="json")
        return payload

    @server.tool()
    def qa_probe_loudness(
        media_path: str,
        target_lufs: float = -14.0,
        max_true_peak_dbtp: float = -1.0,
        tolerance_lu: float = 1.5,
    ) -> dict[str, Any]:
        """Measure EBU R128 integrated loudness (LUFS), LRA (LU), and True Peak (dBTP)."""
        report = audit_loudness(
            Path(media_path),
            target_lufs=target_lufs,
            tolerance_lu=tolerance_lu,
            max_true_peak_dbtp=max_true_peak_dbtp,
        )
        return report.model_dump(mode="json")

    @server.tool()
    def qa_verify_media(
        media_path: str,
        target_lufs: float = -14.0,
        max_true_peak_dbtp: float = -1.0,
        tolerance_lu: float = 1.5,
        require_faststart: bool = True,
    ) -> dict[str, Any]:
        """Run full QA gate: ffprobe CFR/pix_fmt, faststart, ebur128, and start/mid/end frames."""
        report = run_qa_gate(
            Path(media_path),
            target_lufs=target_lufs,
            tolerance_lu=tolerance_lu,
            max_true_peak_dbtp=max_true_peak_dbtp,
            require_faststart=require_faststart,
        )
        return report.model_dump(mode="json")

    return server


def serve_stdio() -> None:
    """Run the taktcut MCP server over stdio."""
    server = create_mcp_server()
    server.run(transport="stdio")
