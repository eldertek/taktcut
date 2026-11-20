"""Tests for taktcut MCP server registration and stdio JSON-RPC handshake."""

from __future__ import annotations

import asyncio
import json
import subprocess
import sys
from pathlib import Path

from taktcut.drp import create_sample_drt_bytes
from taktcut.mcp_server import create_mcp_server


def test_mcp_tools_registered_and_callable(tmp_path: Path) -> None:
    server = create_mcp_server()
    tools = asyncio.run(server.list_tools())
    tool_names = {t.name for t in tools}
    expected = {
        "drp_inspect",
        "drp_to_otio",
        "timeline_validate",
        "lut_bake_cdl",
        "grade_apply_lut",
        "render_plan",
        "qa_probe_loudness",
        "qa_verify_media",
    }
    assert expected.issubset(tool_names)

    drt = tmp_path / "qa-bot.drt"
    drt.write_bytes(create_sample_drt_bytes(name="mcp-smoke", fps="25"))
    out_otio = tmp_path / "mcp-smoke.otio"

    call_res = asyncio.run(
        server.call_tool(
            "drp_to_otio",
            {"path": str(drt), "out_otio": str(out_otio)},
        )
    )
    assert out_otio.exists()
    conv_meta = call_res.structured_content
    assert conv_meta is not None
    assert conv_meta["valid"] is True
    assert conv_meta["timeline_name"] == "mcp-smoke"


def test_mcp_stdio_jsonrpc_handshake() -> None:
    init_req = json.dumps(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "qa-bot", "version": "0.1.0"},
            },
        }
    )
    initialized_notif = json.dumps(
        {"jsonrpc": "2.0", "method": "notifications/initialized"}
    )
    list_req = json.dumps({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
    with subprocess.Popen(
        [sys.executable, "-m", "taktcut.cli", "mcp"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    ) as proc:
        assert proc.stdin is not None
        assert proc.stdout is not None
        assert proc.stderr is not None

        proc.stdin.write(init_req + "\n")
        proc.stdin.flush()
        init_line = proc.stdout.readline()
        assert init_line, proc.stderr.read()

        proc.stdin.write(initialized_notif + "\n" + list_req + "\n")
        proc.stdin.flush()
        list_line = proc.stdout.readline()
        assert list_line, proc.stderr.read()

        proc.stdin.close()
        stderr_out = proc.stderr.read()
        ret = proc.wait(timeout=10)
        assert ret == 0, stderr_out
        responses = [json.loads(init_line), json.loads(list_line)]

    ids = {msg.get("id"): msg for msg in responses}
    assert 1 in ids
    assert 2 in ids
    listed = {tool["name"] for tool in ids[2]["result"]["tools"]}
    assert "drp_inspect" in listed
    assert "qa_verify_media" in listed
