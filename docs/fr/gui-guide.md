# Guide de l'Interface Graphique Workstation & Web Studio

[English](../gui-guide.md) | [Francais](gui-guide.md) | [Accueil](index.md)

L'interface `taktcut` Studio adopte une ergonomie de station de montage et d'etalonnage ancree inspiree de DaVinci Resolve (pages `Montage`, `Etalonnage`, `Export`, `QA Broadcast`) pour permettre aux monteurs, etalonneurs et charges de finition de travailler visuellement sans ligne de commande.

## Lancer en Mode Navigateur ou Application Bureau (`--desktop`)

Executez l'une des commandes suivantes depuis votre dossier de projet :

```bash
# Ouvrir dans votre navigateur par defaut :
taktcut ui

# Ouvrir en fenetre bureau autonome sans barre d'adresse (Edge/Chrome --app ou pywebview) :
taktcut ui --desktop
# ou directement :
taktcut-ui --desktop
```

Options disponibles :
- `--desktop` : Lance une fenetre applicative autonome (`msedge --app=...`, `google-chrome --app=...`, ou `pywebview` si installe, avec repli automatique vers le navigateur par defaut).
- `--workspace-dir CHEMIN` : Confine la navigation fichiers, les sauvegardes `.cube`, les rendus et le controle QA dans un dossier specifique (par defaut le repertoire courant).
- `--port 8741` : Port TCP local (`0` choisit automatiquement un port libre).
- `--host 127.0.0.1` : Interface loopback uniquement (`127.0.0.1`, `localhost`, ou `::1`).
- `--no-open` : Demarre le serveur sans ouvrir automatiquement de fenetre.

En haut a droite, **EN / FR** bascule toute l'interface entre anglais et francais instantanement.

### Deploiement Web Statique (Demo Eclipse)

Les ressources front-end (`src/taktcut/ui/assets/`) utilisent des chemins relatifs (`./`) et lisent `window.__TAKTCUT_CONFIG__` (`apiBase`, `mode`: `"auto" | "server" | "static-demo"`, `adapter`). Lors d'un deploiement statique sans backend Python (ex. [https://eclipse-technology.eu/demos/taktcut/](https://eclipse-technology.eu/demos/taktcut/)), l'application active automatiquement son moteur client de demonstration (inspection timeline, export `.otio`, etalonnage ASC CDL, generation `.cube` et plan FFmpeg dry-run).

---

## Page 01 : Montage (Media Pool, Moniteur Programme & Timeline Ancree)

![Station de Montage taktcut](../assets/taktcut-ui-desktop.png)

1. **Media Pool & Source (Panneau Gauche)** :
   - Cliquez sur **Timeline Exemple** pour charger un montage 25p multi-pistes (`V1`, `V2`, `A1`, `A2` et marqueurs), ou **Diag. Anomalies** pour visualiser la detection d'ecarts, chevauchements, durees nulles et ecarts de cadence.
   - Selectionnez un fichier `.drp`, `.drt`, `.fcpxml` ou `.otio`/`.otioz` dans **Timeline Espace** ou importez un fichier local via **Importer Fichier Local**.
   - Exportez vers OpenTimelineIO (`.otio` JSON ou `.otioz`) via **Telecharger OTIO** ou **Sauver WS**.
2. **Moniteur Programme & Inspecteur (Centre)** :
   - Deplacez la tete de lecture ou avancez image par image (`|<`, `<`, `>`, `>|`) avec lecture **Timecode SMPTE** (`00:00:00:00`) et affichage du plan actif.
   - Cliquez sur un plan ou marqueur dans la **Timeline Multi-Pistes Ancree** en bas pour afficher ses trames entieres exactes (`start_frame`, `duration_frames`, `source_in_frame`, `source_path`).
3. **Continuite & Marqueurs (Panneau Droit)** :
   - Consultez le statut de continuite (`CONFORME` / `ECHEC`), les marqueurs et les references `.cube`.

---

## Page 02 : Etalonnage (Roues Primaires, Scopes & LUT `.cube`)

![Roues Couleur DaVinci & Scopes taktcut](../assets/taktcut-ui-cdl.png)

1. **Moniteur Couleur & Scopes Temps Reel (Haut)** :
   - Deplacez le curseur **Volet** sur le **Moniteur Couleur (Rec.709 Avant / Apres)** pour comparer image brute et image etalonnee.
   - Visualisez les **Courbes RVB** et le **Vecteurscope Rec.709** en direct a droite.
   - Appliquez les **Pre-reglages** ou importez un fichier XML ASC CDL (`.cdl` / `.cc`).
2. **Roues Primaires & Generateur `.cube` (Bas)** :
   - Deplacez le curseur chromatique a l'interieur des roues **LIFT (OFFSET)**, **GAMMA (POWER)** et **GAIN (SLOPE)** (double-clic ou bouton **Rst** pour reinitialiser) ou affinez chaque barre R/V/B et **Saturation**.
   - Choisissez **Titre LUT** et **Grille 3D** (`17`, `33`, `65`), puis cliquez sur **Generer .cube**, **Telecharger .cube** ou **Envoyer en Export**.

---

## Page 03 : Export (Plan de Rendu FFmpeg / NVENC)

![Page Export taktcut](../assets/taktcut-ui-render.png)

1. **Detection Encodeurs FFmpeg & Materiel** : Affiche les encodeurs disponibles (`h264_nvenc`, `hevc_nvenc`, `libx264`, `libx265`, `prores_ks`) avec test runtime via **Tester Runtime GPU**.
2. **Parametres d'Export** : Selectionnez un media (ou cliquez sur **Generer Clip Test**), choisissez le profil (`web_h264`, `master_hevc`, `prores_hq`), la cadence rationnelle, une LUT `.cube` ou le grade CDL actif, et la sonie cible (LUFS).
3. **Previsualisation & Execution** : Cliquez sur **Construire Plan (Dry-Run)** pour controler la ligne de commande FFmpeg exacte, ou **Executer le Rendu** puis **Envoyer au Portail QA**.

---

## Page 04 : Portail QA Broadcast

![Portail QA Broadcast taktcut](../assets/taktcut-ui-qa.png)

Controlez vos livrables avant diffusion :
- **Audit Conteneur & Flux (`ffprobe`)** : Codec, definition, format de pixels, verrouillage CFR (`r_frame_rate` vs `avg_frame_rate`), balises Rec.709, flux audio et placement MP4 `+faststart` (`moov` avant `mdat`).
- **Sonie EBU R128 (`ebur128`)** : Sonie integree (`LUFS`), plage dynamique (`LRA`) et pic reel (`dBTP`) compares a la bande de tolerance.
- **Statistiques Images (`signalstats`)** : Niveaux de luminance (`YMIN`, `YAVG`, `YMAX`) au debut, au milieu et en fin de fichier.

---

## Vue Mobile & Ecrans Compacts

![Vue Mobile taktcut Studio](../assets/taktcut-ui-mobile.png)

Tous les panneaux s'empilent proprement jusqu'aux ecrans `375px` sans aucun debordement horizontal tout en gardant les 4 onglets de pages accessibles en bas d'ecran.
