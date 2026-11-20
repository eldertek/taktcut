# Configuration du Serveur MCP

[English](../mcp-setup.md) | [Francais](mcp-setup.md) | [Accueil](index.md)

`taktcut` embarque un serveur Model Context Protocol (`stdio` JSON-RPC) exposant 8 outils de post-production aux assistants IA et agents d'automatisation.

## Configuration des Clients

### Claude Desktop / Cursor / Antigravity

Si `taktcut` est installe globalement dans votre `PATH` :

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

Si `taktcut` est installe dans un environnement virtuel dedie (recommande) :

**Linux / macOS :**

```json
{
  "mcpServers": {
    "taktcut": {
      "command": "/chemin/vers/taktcut/.venv/bin/taktcut",
      "args": ["mcp"]
    }
  }
}
```

**Windows :**

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

Ou via le module Python directement :

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

## Outils MCP Exposes

| Nom de l'Outil | Parametres Principaux | Description |
| :--- | :--- | :--- |
| `drp_inspect` | `path`, `timeline_name?` | Analyse `.drp`, `.drt`, `.fcpxml` ou `.otio`/`.otioz` en `TimelineDocument` JSON sans ouvrir Resolve. |
| `drp_to_otio` | `path`, `out_otio`, `timeline_name?` | Convertit `.drp`, `.drt` ou `.fcpxml` vers `.otio` ou `.otioz` avec resume de validation. |
| `timeline_validate` | `path`, `timeline_name?` | Audite la continuite en trames entieres (`gap`, `overlap`, `zero_duration`, `fps_mismatch`). |
| `lut_bake_cdl` | `out_cube`, `slope?`, `offset?`, `power?`, `saturation?`, `size?`, `title?` | Genere une LUT 3D `.cube` validee depuis l'ASC CDL (`size` = `33` par defaut). |
| `grade_apply_lut` | `input_path`, `output_path`, `cube_path?`, `cdl_slope?`, `cdl_offset?`, `cdl_power?`, `cdl_saturation?`, `profile?`, `target_lufs?`, `prefer_hw?` | Applique une LUT `.cube` ou des reglages ASC CDL et encode avec balises Rec.709. |
| `render_plan` | `input_path`, `output_path`, `profile?`, `fps_num?`, `fps_den?`, `target_lufs?`, `cube_path?`, `prefer_hw?`, `execute?` | Construit (et execute si `execute=true`) un plan deterministe FFmpeg/NVENC/`libx264`/`prores_ks`. |
| `qa_probe_loudness` | `media_path`, `target_lufs?`, `max_true_peak_dbtp?`, `tolerance_lu?` | Mesure la sonie integree EBU R128 (`LUFS`), `LRA` (`LU`) et `True Peak` (`dBTP`). |
| `qa_verify_media` | `media_path`, `target_lufs?`, `max_true_peak_dbtp?`, `tolerance_lu?`, `require_faststart?` | Execute le portail QA complet : `ffprobe` CFR/pix_fmt, `+faststart`, `ebur128` et verification d'images debut/milieu/fin. |

## Test Rapide Handshake `stdio`

```bash
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"probe","version":"0.1.0"}}}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":2,"method":"tools/list"}\n' | taktcut mcp
```
