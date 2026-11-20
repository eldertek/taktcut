# Reference CLI

[English](../cli-reference.md) | [Francais](cli-reference.md) | [Accueil](index.md)

Chaque sous-commande `taktcut` produit du JSON structure sur `stdout` (a l'exception de `taktcut mcp` qui communique en JSON-RPC sur `stdio` et de `taktcut ui` / `taktcut-ui` qui demarre le serveur Web Studio local).

## Vue d'Ensemble

| Commande | Role | Codes de Retour Non Nuls |
| :--- | :--- | :--- |
| `taktcut inspect` | Analyse `.drp`, `.drt`, `.fcpxml` ou `.otio`/`.otioz` en JSON normalise | `1` / `2` en cas d'erreur |
| `taktcut validate` | Verifie continuite en trames entieres, gaps, chevauchements, duree nulle et FPS | `2` si la validation echoue |
| `taktcut convert` | Convertit `.drp`, `.drt` ou `.fcpxml` vers `.otio` ou `.otioz` | `1` / `2` en cas d'erreur |
| `taktcut bake-lut` | Genere une LUT 3D `.cube` validee depuis des parametres ASC CDL | `1` / `2` si parametres invalides |
| `taktcut render` | Prepare (`--dry-run`) ou execute un rendu FFmpeg/NVENC Rec.709 deterministe | `1` si l'encodage echoue |
| `taktcut qa` | Execute l'audit `ffprobe` CFR/faststart, sonie EBU R128 et stats d'images | `2` si le portail QA echoue |
| `taktcut mcp` | Demarre le serveur MCP `stdio` JSON-RPC | `1` en cas d'erreur |
| `taktcut ui` / `taktcut-ui` | Lance l'interface graphique Web Studio locale sur loopback uniquement | `2` si hote/arguments invalides |

---

## `taktcut inspect`

Inspecte un fichier `.drp`, `.drt`, `.fcpxml`, `.xml`, `.otio` ou `.otioz` sans ouvrir de logiciel de montage.

```bash
taktcut inspect <path> [--timeline NOM]
```

- `path` : Chemin vers le fichier projet ou timeline.
- `--timeline NOM` : Nom de sequence optionnel lorsqu'un `.drp` contient plusieurs timelines.

Exemple :

```bash
taktcut inspect project.drp --timeline "Main Cut"
```

---

## `taktcut validate`

Controle la continuite exacte en trames entieres sur toutes les pistes (`gap`, `overlap`, `zero_duration`, `fps_mismatch`).

```bash
taktcut validate <path> [--timeline NOM]
```

- Retourne `0` si `valid` vaut `true`, et `2` si des anomalies sont detectees.

Exemple :

```bash
taktcut validate timeline.fcpxml
```

---

## `taktcut convert`

Convertit `.drp`, `.drt`, `.fcpxml` ou `.otio` vers OpenTimelineIO (`.otio` ou `.otioz`) avec metadonnee `RationalTime`.

```bash
taktcut convert <path> --out <SORTIE> [--timeline NOM]
```

- `--out` : Chemin cible `.otio` ou `.otioz` (dossiers parents crees automatiquement).
- `--timeline NOM` : Selecteur optionnel pour archive `.drp`.

Exemple :

```bash
taktcut convert timeline.drt --out exports/sequence.otio
```

---

## `taktcut bake-lut`

Genere une LUT 3D `.cube` (domaine `0.0..1.0`) a partir des parametres ASC CDL v1.2 (`Slope`, `Offset`, `Power`, `Saturation`).

```bash
taktcut bake-lut --out <SORTIE> [--slope R V B] [--offset R V B] [--power R V B] [--sat FLOAT] [--size INT]
```

Options et valeurs par defaut :
- `--out` (requis) : Chemin `.cube` de sortie.
- `--slope R V B` : 3 flottants (defaut `1.0 1.0 1.0`).
- `--offset R V B` : 3 flottants (defaut `0.0 0.0 0.0`).
- `--power R V B` : 3 flottants strictement positifs (defaut `1.0 1.0 1.0`).
- `--sat FLOAT` : Saturation luma Rec.709, `>= 0.0` (defaut `1.0`).
- `--size INT` : Taille de grille 3D entre `2` et `65` (defaut `33`).

Exemple :

```bash
taktcut bake-lut --out look.cube --slope 1.05 1.0 0.96 --offset 0.01 0.0 -0.01 --power 0.98 0.98 1.0 --sat 1.12 --size 33
```

---

## `taktcut render`

Compile (et optionnellement execute) un plan de rendu FFmpeg/NVENC Rec.709 deterministe avec verrouillage CFR (`-fps_mode cfr`) et `GOP = 2 * fps`.

```bash
taktcut render <input> --out <SORTIE> [--profile PROFIL] [--fps CADENCE] [--lut CHEMIN] [--lufs FLOAT] [--no-hw] [--dry-run]
```

Options et valeurs par defaut :
- `--out` (requis) : Fichier media de sortie.
- `--profile` : `web_h264` (defaut, H.264 + AAC + `+faststart`), `master_hevc` (HEVC + AAC + `+faststart`), ou `prores_hq` (ProRes 422 HQ `yuv422p10le` + `pcm_s24le`).
- `--fps CADENCE` : Cadence rationnelle ex. `25`, `24`, ou `24000/1001` (defaut `25`).
- `--lut CHEMIN` : LUT `.cube` validee appliquee via `lut3d` en interpolation tetraedrique.
- `--lufs FLOAT` : Active `loudnorm` vers la sonie integree cible (`TP=-1.0`).
- `--no-hw` : Force l'encodage CPU (`libx264` / `libx265`) sans NVENC.
- `--dry-run` : Affiche le plan JSON `RenderPlan` complet sans lancer FFmpeg.

Exemple :

```bash
taktcut render input.mov --out delivery.mp4 --profile web_h264 --fps 25 --lut look.cube --lufs -14 --dry-run
```

---

## `taktcut qa`

Execute le portail QA complet (`ffprobe` flux/CFR/Rec.709, placement `moov` avant `mdat` faststart, sonie EBU R128 et decodage debut/milieu/fin `signalstats`).

```bash
taktcut qa <path> [--lufs FLOAT] [--max-tp FLOAT] [--tolerance FLOAT] [--no-faststart-check]
```

Options et valeurs par defaut :
- `--lufs` : Cible de sonie integree en LUFS (defaut `-14.0`).
- `--max-tp` : True peak maximal autorise en dBTP (defaut `-1.0`).
- `--tolerance` : Tolerance en LU autour de `--lufs` (defaut `1.5`).
- `--no-faststart-check` : Ignore la verification MP4/MOV `+faststart`.

Codes de retour : `0` si `passed` est `true`, `2` si au moins un controle echoue.

---

## `taktcut ui` et `taktcut-ui`

Demarre l'interface graphique locale Web Studio sur un `ThreadingHTTPServer` confine au loopback.

```bash
taktcut ui [--host HOTE] [--port PORT] [--no-open] [--workspace-dir DOSSIER]
taktcut-ui [--host HOTE] [--port PORT] [--no-open] [--workspace-dir DOSSIER]
```

Options :
- `--host` : Adresse loopback (`127.0.0.1`, `localhost`, ou `::1` ; defaut `127.0.0.1`). Les adresses non-loopback sont refusees.
- `--port` : Port TCP (`0` choisit un port libre ; defaut `8741`).
- `--no-open` : N'ouvre pas automatiquement le navigateur.
- `--workspace-dir` : Repertoire confine pour la lecture/ecriture de fichiers (defaut : repertoire courant).

---

## `taktcut mcp`

Demarre le serveur MCP sur `stdio`. Voir [Configuration MCP](mcp-setup.md).
