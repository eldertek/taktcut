# Documentation taktcut

[English](../index.md) | [Francais](index.md)

`taktcut` est une boite a outils de post-production clean-room et multiplateforme permettant d'inspecter des timelines DaVinci Resolve (`.drp`, `.drt`), FCPXML (`.fcpxml`) et OpenTimelineIO (`.otio`, `.otioz`), de generer des LUT 3D `.cube` depuis l'ASC CDL v1.2, de preparer des rendus deterministes FFmpeg/NVENC en Rec.709 et d'executer un portail QA broadcast (CFR, faststart MP4, sonie EBU R128 et controle d'images).

## Choisir Votre Mode d'Utilisation

| Profil | Interface | Capacites Principales | Guide |
| :--- | :--- | :--- | :--- |
| Monteurs, Etalonneurs, Charges de Post-Prod | **Studio Web Local** (`taktcut ui` / `taktcut-ui`) | Visionneuse multi-pistes, etalonnage CDL temps reel & export `.cube`, constructeur de rendu FFmpeg/NVENC, et tableau QA broadcast | [Guide Interface Graphique](gui-guide.md) |
| Ingenieurs Pipeline, DevOps, CI | **Ligne de Commande** (`taktcut`) | Sorties JSON scriptables, conversion headless `.drp`/`.drt`/`.fcpxml`, generation `.cube`, plans de rendu et codes de retour QA | [Reference CLI](cli-reference.md) |
| Agents IA & Automatisation | **Serveur MCP** (`taktcut mcp`) | Expose les 8 outils timeline, couleur, rendu et QA via JSON-RPC `stdio` pour Claude Desktop, Cursor ou Antigravity | [Configuration MCP](mcp-setup.md) |

## Demarrage Rapide (30 Secondes)

### 1. Installation

```bash
git clone https://github.com/eldertek/taktcut.git
cd taktcut
python -m venv .venv
# Linux / macOS : source .venv/bin/activate
# Windows PowerShell : .venv\Scripts\Activate.ps1
pip install -e ".[dev]"
```

Prerequis :
- Python 3.10+
- `ffmpeg` et `ffprobe` dans le `PATH` (requis pour le Rendu et le Portail QA Broadcast ; optionnel pour l'inspection de timelines et les LUT `.cube`).

### 2. Lancer l'Interface Graphique Style NLE

```bash
# Ouvrir dans votre navigateur par defaut :
taktcut ui --workspace-dir /chemin/vers/votre/projet

# Ou ouvrir en fenetre bureau autonome sans barre navigateur :
taktcut ui --desktop --workspace-dir /chemin/vers/votre/projet
# (ou via la commande dediee : taktcut-ui --desktop)
```

Le studio s'ouvre sur `http://127.0.0.1:8741/`. Utilisez le selecteur **EN / FR** en haut a droite pour basculer toute l'interface en francais. Les ressources statiques ESM (`src/taktcut/ui/assets/`) peuvent aussi etre deployees sur un hebergement web statique (ex. `eclipse-technology.eu/demos/taktcut/`) grace a `window.__TAKTCUT_CONFIG__` et l'adaptateur client.

## Principes Clean-Room & Securite

- Aucune inspection binaire, decompilation ou contournement de licence d'editeurs proprietaires.
- Analyse XML strictement protegee par `defusedxml` (blocage DTD et entites externes XXE).
- Extraction ZIP `.drp`/`.drt` protegee contre le ZipSlip et limitee a 128 Mio d'XML decompresse.
- `taktcut ui` ecoute uniquement sur loopback (`127.0.0.1`, `localhost`, `::1`), applique une politique `Content-Security-Policy` stricte et confine chaque chemin fichier dans le repertoire de travail via `realpath`.
