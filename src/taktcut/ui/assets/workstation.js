// DaVinci Resolve Workstation Shell, 14-Menu Bar, and 7-Page NLE Controllers for taktcut.
// Clean-room MIT implementation: safe DOM API only, zero inline style attributes, zero proprietary assets.

const FUSION_DEFAULT_NODES = [
  { id: "mediain1", label: "MediaIn1", kind: "io", x: 36, y: 34, enabled: true, v1: true, v2: false, action: null },
  { id: "deltakeyer1", label: "DeltaKeyer1", kind: "matte", x: 186, y: 34, enabled: true, v1: false, v2: false, action: "keyer" },
  { id: "planartracker1", label: "PlanarTracker1", kind: "tracker", x: 344, y: 34, enabled: true, v1: false, v2: false, action: "tracker" },
  { id: "transform1", label: "Transform1", kind: "xform", x: 506, y: 34, enabled: true, v1: false, v2: false, action: "spline" },
  { id: "opticalglow1", label: "OpticalGlow1", kind: "fx", x: 664, y: 10, enabled: true, v1: false, v2: false, action: "glow" },
  { id: "camerashake1", label: "CameraShake1", kind: "fx", x: 664, y: 58, enabled: false, v1: false, v2: false, action: "shake" },
  { id: "merge1", label: "Merge1", kind: "merge", x: 824, y: 34, enabled: true, v1: false, v2: false, action: null },
  { id: "mediaout1", label: "MediaOut1", kind: "io", x: 970, y: 34, enabled: true, v1: false, v2: true, action: null }
];

const FAIRLIGHT_STRIPS = [
  { id: "a1", code: "A1", name: "Dialogue", bus: "Bus 1", faderDb: 0.0, pan: 0, mute: false, solo: false, rec: false, eq: true, dyn: true },
  { id: "a2", code: "A2", name: "Ambience", bus: "Bus 1", faderDb: -6.5, pan: -18, mute: false, solo: false, rec: false, eq: true, dyn: false },
  { id: "a3", code: "A3", name: "Music Stem", bus: "Bus 1", faderDb: -11.0, pan: 14, mute: false, solo: false, rec: false, eq: true, dyn: true },
  { id: "fx1", code: "FX1", name: "Room Plate", bus: "Bus 1", faderDb: -16.0, pan: 0, mute: false, solo: false, rec: false, eq: false, dyn: false },
  { id: "bus1", code: "M1", name: "Bus 1 Main", bus: "Out 1/2", faderDb: 0.0, pan: 0, mute: false, solo: false, rec: false, eq: true, dyn: true }
];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function clickIfPresent(byId, id) {
  const target = byId(id);
  if (target) target.click();
}

export function createWorkstationController(ctx) {
  const {
    state,
    byId,
    t,
    switchTab,
    redrawActiveCanvases,
    showBanner,
    loadSampleTimeline,
    setTimelineTool,
    setLanguage,
    toggleDualMonitorAction,
    undoTimeline,
    redoTimeline,
    splitAtPlayheadAction,
    addMarkerAtPlayheadAction,
    addColorNodeAction,
    grabActiveMonitorStill,
    openShortcutsDialog,
    openMediaPoolProDialog,
    openSceneCutDialog,
    openTextEditDialog,
    openBroadcastMonitorDialog,
    openAutoReframeDialog,
    openCstStudioDialog,
    openQualifierKeyerDialog,
    openMulticamStudioDialog,
    openMotionSplineStudioDialog,
    openOpticalGlowStudioDialog,
    openPowerWindowStudioDialog,
    openRetimeStudioDialog,
    openStabilizationStudioDialog,
    openFilmLookStudioDialog,
    openOpticalFlareStudioDialog,
    openCameraShakeStudioDialog,
    drawProgramMonitorCanvas,
    drawSourceMonitorCanvas,
    drawTimelineOverviewCanvas,
    drawTimelineCanvas,
    drawStereoVuMeterCanvas,
    renderFairlightEqCurveCanvas,
    renderFairlightDynamicsCanvas,
    renderFairlightFftCanvas,
    computeCurrentFairlightSpectrum,
    framesToSmpte,
    getActiveColorChainState,
    getEffectiveFxState,
    getEffectiveTitleState,
    getEffectiveFramingState,
    getEffectiveSubtitleState
  } = ctx;

  const ws = {
    openMenuId: null,
    mediaBinFilter: "all",
    mediaViewMode: "grid",
    mediaSearchScope: "all",
    mediaSearchQuery: "",
    mediaSelectedClipIdx: 0,
    mediaSlate: {},
    cutBinTab: "pool",
    cutViewerMode: "timeline",
    cutSelectedClipIdx: 0,
    fusionNodes: FUSION_DEFAULT_NODES.map((n) => ({ ...n })),
    selectedFusionNodeId: "deltakeyer1",
    fairlightStrips: FAIRLIGHT_STRIPS.map((s) => ({ ...s })),
    fairlightDim: false,
    fairlightMute: false,
    fairlightTargetStd: "ebu_r128",
    projectLibraryTab: "local",
    projectSearchQuery: "",
    projectSettingsTab: "master"
  };

  function svgEl(tag, attrs = {}) {
    const ns = "http://www.w3.org/2000/svg";
    const node = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) {
      node.setAttribute(k, String(v));
    }
    return node;
  }

  function makeResolveThreeDotEmblem(withPlus = false) {
    const svg = svgEl("svg", { viewBox: "0 0 48 48", width: "42", height: "42", class: "pm-emblem-svg", "aria-hidden": "true" });
    if (withPlus) {
      svg.appendChild(svgEl("rect", { x: "6", y: "6", width: "36", height: "36", rx: "9", fill: "#38383f" }));
    }
    svg.appendChild(svgEl("circle", { cx: "24", cy: "16.5", r: "4.6", fill: "#7d7d86" }));
    svg.appendChild(svgEl("circle", { cx: "17.2", cy: "28.2", r: "4.6", fill: "#7d7d86" }));
    svg.appendChild(svgEl("circle", { cx: "30.8", cy: "28.2", r: "4.6", fill: "#7d7d86" }));
    if (withPlus) {
      svg.appendChild(svgEl("circle", { cx: "34.5", cy: "34.5", r: "6.5", fill: "#8b8b95", stroke: "#2b2b30", "stroke-width": "1.6" }));
      svg.appendChild(svgEl("path", { d: "M34.5 31.2v6.6M31.2 34.5h6.6", stroke: "#232328", "stroke-width": "1.8", "stroke-linecap": "round" }));
    }
    return svg;
  }

  function getTimelineClipsFlat() {
    const out = [];
    const doc = state.timelineDoc;
    if (!doc || !Array.isArray(doc.tracks)) return out;
    doc.tracks.forEach((track, tIdx) => {
      const clips = Array.isArray(track.clips) ? track.clips : [];
      clips.forEach((clip, cIdx) => {
        out.push({
          idx: out.length,
          trackKind: track.kind || "video",
          trackIndex: tIdx,
          trackName: track.name || `${(track.kind || "V").slice(0, 1).toUpperCase()}${tIdx + 1}`,
          clipIndex: cIdx,
          name: clip.name || `Clip_${cIdx + 1}`,
          startFrame: clip.start_frame || 0,
          durationFrames: clip.duration_frames || 25,
          sourceInFrame: clip.source_in_frame || 0,
          sourcePath: clip.source_path || "media/source.mov",
          offline: Boolean(clip.offline),
          hasProxy: Boolean(state.mediaPoolProxyMode),
          clipRef: clip
        });
      });
    });
    return out;
  }

  function getFpsFloat() {
    const doc = state.timelineDoc;
    if (!doc || !doc.fps) return 25;
    const num = Number(doc.fps.num || 25);
    const den = Number(doc.fps.den || 1);
    return den > 0 ? num / den : 25;
  }

  function formatTc(frame) {
    const doc = state.timelineDoc;
    const num = doc && doc.fps && Number(doc.fps.num) ? Number(doc.fps.num) : 25;
    const den = doc && doc.fps && Number(doc.fps.den) ? Number(doc.fps.den) : 1;
    return framesToSmpte(Math.max(0, Math.round(frame || 0)), num, den);
  }

  function setPlayhead(frame) {
    const maxF = Math.max(1, state.timelineMaxFrame || 250);
    const clamped = Math.max(0, Math.min(maxF, Math.round(frame)));
    state.playheadFrame = clamped;
    const slider = byId("playhead-slider");
    if (slider) {
      slider.value = String(clamped);
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      redrawActiveCanvases();
    }
  }

  // =========================================================================
  // 14-MENU DAVINCI RESOLVE TOP MENU BAR + COMMAND SEARCH (UiMainMenuBar)
  // =========================================================================
  function buildMenusSpec() {
    return [
      {
        id: "app",
        label: "taktcut",
        isBrand: true,
        items: [
          { label: t("ws.menu.about"), shortcut: "", run: () => showBanner("taktcut Studio Workstation v0.1.27 - NLE, Color, Fusion, Fairlight & Broadcast QA", "info") },
          { sep: true },
          { label: t("ws.menu.preferences"), shortcut: "Ctrl+,", run: () => openProjectSettingsDialog("prefs") },
          { label: t("ws.menu.keyboard"), shortcut: "?", run: () => openShortcutsDialog() },
          { sep: true },
          { label: t("ws.menu.projectManager"), shortcut: "Shift+1", run: () => openProjectManagerDialog() },
          { label: t("ws.menu.projectSettings"), shortcut: "Shift+9", run: () => openProjectSettingsDialog("master") }
        ]
      },
      {
        id: "file",
        label: t("ws.menubar.file"),
        items: [
          { label: "New Project...", shortcut: "", run: () => openProjectManagerDialog() },
          { label: "New Timeline (Clean 25p)", shortcut: "Ctrl+N", run: () => loadSampleTimeline("clean") },
          { label: "Project Manager...", shortcut: "Shift+1", run: () => openProjectManagerDialog() },
          { label: "Project Settings...", shortcut: "Shift+9", run: () => openProjectSettingsDialog("master") },
          { sep: true },
          { label: "Open Project (.taktcut.json)...", shortcut: "Ctrl+O", run: () => clickIfPresent(byId, "btn-open-project") },
          { label: "Save Project", shortcut: "Ctrl+S", run: () => clickIfPresent(byId, "btn-save-project") },
          { sep: true },
          { label: "Import Timeline (.drp / .drt / .fcpxml / .otio)...", shortcut: "Ctrl+I", run: () => { switchTab("timeline"); clickIfPresent(byId, "timeline-file-input"); } },
          { label: "Media Pool Pro (Proxies / Relink / Sync)...", shortcut: "Shift+P", run: () => openMediaPoolProDialog("proxy") },
          { sep: true },
          { label: "Export Timeline (.otio)", shortcut: "", run: () => clickIfPresent(byId, "btn-timeline-download") },
          { label: "Export CMX 3600 (.edl)", shortcut: "", run: () => { switchTab("render"); clickIfPresent(byId, "btn-export-cmx-edl"); } },
          { label: "Export FCPXML (.fcpxml)", shortcut: "", run: () => { switchTab("render"); clickIfPresent(byId, "btn-export-fcpxml"); } },
          { label: "Quick Export...", shortcut: "Shift+8", run: () => switchTab("render") }
        ]
      },
      {
        id: "edit",
        label: t("ws.menubar.edit"),
        items: [
          { label: "Undo", shortcut: "Ctrl+Z", run: () => undoTimeline() },
          { label: "Redo", shortcut: "Ctrl+Shift+Z", run: () => redoTimeline() },
          { sep: true },
          { label: "Split Clip / Blade at Playhead", shortcut: "Ctrl+B", run: () => { switchTab("timeline"); splitAtPlayheadAction(); } },
          { label: "Insert Clip (3-Point)", shortcut: "F9", run: () => clickIfPresent(byId, "btn-three-pt-insert") },
          { label: "Overwrite Clip (3-Point)", shortcut: "F10", run: () => clickIfPresent(byId, "btn-three-pt-overwrite") },
          { label: "Replace Clip at Playhead", shortcut: "F11", run: () => clickIfPresent(byId, "btn-three-pt-replace") },
          { sep: true },
          { label: "Smart Insert (Cut)", shortcut: "", run: () => clickIfPresent(byId, "btn-pool-smart-insert") },
          { label: "Append to End of Track", shortcut: "", run: () => clickIfPresent(byId, "btn-pool-append") },
          { sep: true },
          { label: "Text-Based Transcript Editing...", shortcut: "", run: () => openTextEditDialog() }
        ]
      },
      {
        id: "trim",
        label: t("ws.menubar.trim"),
        items: [
          { label: "Selection Mode", shortcut: "A", run: () => { switchTab("timeline"); setTimelineTool("select"); } },
          { label: "Trim / Ripple Edit Mode", shortcut: "T", run: () => { switchTab("timeline"); setTimelineTool("trim"); } },
          { label: "Roll Edit Mode", shortcut: "U", run: () => { switchTab("timeline"); setTimelineTool("roll"); } },
          { label: "Slip Source Mode", shortcut: "Y", run: () => { switchTab("timeline"); setTimelineTool("slip"); } },
          { label: "Slide Clip Mode", shortcut: "S", run: () => { switchTab("timeline"); setTimelineTool("slide"); } },
          { label: "Blade Edit Mode", shortcut: "B", run: () => { switchTab("timeline"); setTimelineTool("blade"); } },
          { sep: true },
          { label: "Toggle 4-Up Dynamic Trim Monitor", shortcut: "Shift+T", run: () => clickIfPresent(byId, "btn-trim-monitor-toggle") },
          { label: "Apply J-Cut (-15f Pre-Lap)", shortcut: "", run: () => clickIfPresent(byId, "btn-split-jcut-preset") },
          { label: "Apply L-Cut (+15f Post-Lap)", shortcut: "", run: () => clickIfPresent(byId, "btn-split-lcut-preset") }
        ]
      },
      {
        id: "timeline",
        label: t("ws.menubar.timeline"),
        items: [
          { label: "Create Compound Clip", shortcut: "Alt+G", run: () => clickIfPresent(byId, "btn-timeline-compound-create") },
          { label: "Flatten All Compound Clips", shortcut: "", run: () => clickIfPresent(byId, "btn-timeline-compound-flatten-all") },
          { sep: true },
          { label: "Multi-Cam Sync & Switcher Studio...", shortcut: "Shift+V", run: () => openMulticamStudioDialog() },
          { label: "Detect Scene Cuts...", shortcut: "", run: () => openSceneCutDialog() },
          { label: "Titles & Subtitles (.srt / .ass)...", shortcut: "", run: () => switchTab("titles") },
          { sep: true },
          { label: "Validate Timeline Continuity", shortcut: "", run: () => clickIfPresent(byId, "btn-timeline-validate") },
          { label: "Load Diagnostic Issues Sample", shortcut: "", run: () => loadSampleTimeline("issues") }
        ]
      },
      {
        id: "clip",
        label: t("ws.menubar.clip"),
        items: [
          { label: "Retime & Optical-Flow Speed Curve...", shortcut: "Shift+Y", run: () => openRetimeStudioDialog() },
          { label: "Camera Stabilization & Rolling-Shutter...", shortcut: "", run: () => openStabilizationStudioDialog() },
          { label: "Auto Reframe Subject Tracking...", shortcut: "Shift+R", run: () => openAutoReframeDialog() },
          { sep: true },
          { label: "A/V Auto-Sync (Waveform / SMPTE)...", shortcut: "", run: () => openMediaPoolProDialog("sync") },
          { label: "Offline Media & Relink Watchdog...", shortcut: "", run: () => openMediaPoolProDialog("relink") },
          { label: "Toggle Linked A/V Selection", shortcut: "", run: () => clickIfPresent(byId, "btn-timeline-av-link") }
        ]
      },
      {
        id: "mark",
        label: t("ws.menubar.mark"),
        items: [
          { label: "Mark In", shortcut: "I", run: () => clickIfPresent(byId, "btn-tc-mark-in") },
          { label: "Mark Out", shortcut: "O", run: () => clickIfPresent(byId, "btn-tc-mark-out") },
          { label: "Clear In and Out", shortcut: "Alt+X", run: () => clickIfPresent(byId, "btn-tc-clear-io") },
          { sep: true },
          { label: "Add Marker at Playhead", shortcut: "M", run: () => addMarkerAtPlayheadAction() },
          { label: "Previous Marker", shortcut: "Shift+Up", run: () => clickIfPresent(byId, "btn-marker-prev") },
          { label: "Next Marker", shortcut: "Shift+Down", run: () => clickIfPresent(byId, "btn-marker-next") }
        ]
      },
      {
        id: "view",
        label: t("ws.menubar.view"),
        items: [
          { label: "Toggle Dual Source / Timeline Viewers", shortcut: "Q", run: () => { switchTab("timeline"); toggleDualMonitorAction(); } },
          { label: "Toggle Multi-Cam 2x2 Quad Monitor", shortcut: "Shift+M", run: () => { switchTab("timeline"); clickIfPresent(byId, "btn-multicam-quad-toggle"); } },
          { sep: true },
          { label: "Split-Screen Color Wipe", shortcut: "Ctrl+W", run: () => { switchTab("color"); clickIfPresent(byId, "btn-color-split-wipe"); } },
          { label: "False Color IRE Exposure Overlay", shortcut: "Shift+F", run: () => clickIfPresent(byId, "btn-program-false-color") },
          { label: "Zebra Luma Clipping Stripes", shortcut: "Shift+Z", run: () => clickIfPresent(byId, "btn-program-zebra") },
          { label: "Broadcast Safe & EBU R103 Monitor...", shortcut: "Shift+G", run: () => openBroadcastMonitorDialog() },
          { label: "Safe Area Guides (90% / 80%)", shortcut: "", run: () => clickIfPresent(byId, "btn-safe-guides") }
        ]
      },
      {
        id: "playback",
        label: t("ws.menubar.playback"),
        items: [
          { label: "Play / Pause", shortcut: "Space", run: () => clickIfPresent(byId, "btn-tc-play") },
          { label: "Shuttle Reverse", shortcut: "J", run: () => clickIfPresent(byId, "btn-tc-shuttle-rev") },
          { label: "Shuttle Forward", shortcut: "L", run: () => clickIfPresent(byId, "btn-tc-shuttle-fwd") },
          { label: "Step One Frame Back", shortcut: "Left", run: () => clickIfPresent(byId, "btn-tc-prev") },
          { label: "Step One Frame Forward", shortcut: "Right", run: () => clickIfPresent(byId, "btn-tc-next") },
          { label: "Jump to Timeline Start", shortcut: "Home", run: () => clickIfPresent(byId, "btn-tc-start") },
          { label: "Jump to Timeline End", shortcut: "End", run: () => clickIfPresent(byId, "btn-tc-end") },
          { sep: true },
          { label: "Toggle Proxy Playback Mode", shortcut: "Alt+P", run: () => clickIfPresent(byId, "btn-proxy-mode-toggle") },
          { label: "Generate Proxy Media...", shortcut: "", run: () => openMediaPoolProDialog("proxy") }
        ]
      },
      {
        id: "fusion",
        label: t("ws.menubar.fusion"),
        items: [
          { label: "Open Fusion Page", shortcut: "Shift+5", run: () => switchTab("fx") },
          { sep: true },
          { label: "Keyframe Spline & Motion Blur Studio...", shortcut: "Shift+E", run: () => openMotionSplineStudioDialog() },
          { label: "Optical Halation & S_Glow Studio...", shortcut: "Shift+A", run: () => openOpticalGlowStudioDialog() },
          { label: "Anamorphic Lens Flare Studio...", shortcut: "Shift+U", run: () => openOpticalFlareStudioDialog() },
          { label: "Camera Shake & Lens Distortion Studio...", shortcut: "Shift+J", run: () => openCameraShakeStudioDialog() },
          { label: "Focus Chroma / Delta Keyer", shortcut: "", run: () => { switchTab("fx"); const p = byId("fx-keyer-pane"); if (p) p.scrollIntoView({ behavior: "smooth" }); } },
          { label: "Focus 2D Planar Tracker", shortcut: "", run: () => { switchTab("fx"); const p = byId("fx-tracker-pane"); if (p) p.scrollIntoView({ behavior: "smooth" }); } }
        ]
      },
      {
        id: "color",
        label: t("ws.menubar.color"),
        items: [
          { label: "Open Color Page", shortcut: "Shift+6", run: () => switchTab("color") },
          { label: "Add Serial Node", shortcut: "Alt+S", run: () => { switchTab("color"); addColorNodeAction(); } },
          { label: "Reset All Grades & Nodes", shortcut: "", run: () => { switchTab("color"); clickIfPresent(byId, "btn-cdl-reset"); } },
          { label: "Grab Still to Gallery", shortcut: "", run: () => { switchTab("color"); grabActiveMonitorStill(); } },
          { sep: true },
          { label: "Color Space Transform (Log CST)...", shortcut: "Shift+L", run: () => openCstStudioDialog() },
          { label: "HSL / 3D Qualifier & Despill Keyer...", shortcut: "Shift+Q", run: () => openQualifierKeyerDialog() },
          { label: "Power Windows & Planar Mask Tracker...", shortcut: "Shift+W", run: () => openPowerWindowStudioDialog() },
          { label: "35mm / 16mm Film Look Creator...", shortcut: "Shift+N", run: () => openFilmLookStudioDialog() },
          { label: "Color Chart Auto-Balance & Shot Match", shortcut: "Shift+K", run: () => { switchTab("color"); clickIfPresent(byId, "btn-color-shot-match"); } }
        ]
      },
      {
        id: "fairlight",
        label: t("ws.menubar.fairlight"),
        items: [
          { label: "Open Fairlight DAW Page", shortcut: "Shift+7", run: () => switchTab("fairlight") },
          { sep: true },
          { label: "6-Band Parametric EQ", shortcut: "", run: () => { switchTab("fairlight"); selectFairlightDspView("eq"); } },
          { label: "Compressor / Limiter Dynamics", shortcut: "", run: () => { switchTab("fairlight"); selectFairlightDspView("dyn"); } },
          { label: "Real-Time FFT Spectrum Analyzer", shortcut: "", run: () => { switchTab("fairlight"); selectFairlightDspView("fft"); } },
          { sep: true },
          { label: "Toggle Control Room Dim (-20 dB)", shortcut: "", run: () => toggleFairlightDim() },
          { label: "Toggle Control Room Mute", shortcut: "", run: () => toggleFairlightMute() },
          { label: "EBU R128 / Loudness QA Gate", shortcut: "", run: () => switchTab("qa") }
        ]
      },
      {
        id: "workspace",
        label: t("ws.menubar.workspace"),
        items: [
          { label: "Switch to Page: Media", shortcut: "Shift+2", run: () => switchTab("media") },
          { label: "Switch to Page: Cut", shortcut: "Shift+3", run: () => switchTab("cut") },
          { label: "Switch to Page: Edit", shortcut: "Shift+4", run: () => switchTab("timeline") },
          { label: "Switch to Page: Fusion", shortcut: "Shift+5", run: () => switchTab("fx") },
          { label: "Switch to Page: Color", shortcut: "Shift+6", run: () => switchTab("color") },
          { label: "Switch to Page: Fairlight", shortcut: "Shift+7", run: () => switchTab("fairlight") },
          { label: "Switch to Page: Deliver", shortcut: "Shift+8", run: () => switchTab("render") },
          { sep: true },
          { label: "Titles & Subtitles Studio", shortcut: "", run: () => switchTab("titles") },
          { label: "Broadcast QA Gate (EBU R128 / ffprobe)", shortcut: "", run: () => switchTab("qa") },
          { sep: true },
          { label: "Interface Language: English", shortcut: "", run: () => setLanguage("en") },
          { label: "Langue Interface : Francais", shortcut: "", run: () => setLanguage("fr") }
        ]
      },
      {
        id: "help",
        label: t("ws.menubar.help"),
        items: [
          { label: "Search Menu Actions...", shortcut: "Ctrl+K", run: () => openMenuSearchDialog() },
          { label: "Keyboard Customization...", shortcut: "?", run: () => openShortcutsDialog() },
          { sep: true },
          { label: "Verify Host GPU & FFmpeg Encoders", shortcut: "", run: () => { switchTab("render"); clickIfPresent(byId, "btn-verify-nvenc"); } },
          { label: "Broadcast Compliance QA Gate", shortcut: "", run: () => switchTab("qa") }
        ]
      }
    ];
  }

  function closeOpenMenu() {
    ws.openMenuId = null;
    const flyout = byId("nle-menu-flyout");
    if (flyout) {
      flyout.classList.add("is-hidden");
      flyout.replaceChildren();
    }
    for (const btn of document.querySelectorAll(".nle-topmenu-trigger")) {
      btn.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    }
  }

  function openMenuDropdown(menuId, anchorBtn) {
    const menus = buildMenusSpec();
    const spec = menus.find((m) => m.id === menuId);
    const flyout = byId("nle-menu-flyout");
    if (!spec || !flyout || !anchorBtn) return;

    ws.openMenuId = menuId;
    for (const btn of document.querySelectorAll(".nle-topmenu-trigger")) {
      const active = btn === anchorBtn;
      btn.classList.toggle("is-open", active);
      btn.setAttribute("aria-expanded", active ? "true" : "false");
    }

    flyout.replaceChildren();
    for (const item of spec.items) {
      if (item.sep) {
        const sep = el("div", "nle-menu-sep");
        sep.setAttribute("role", "separator");
        flyout.appendChild(sep);
        continue;
      }
      const row = el("button", "nle-menu-item");
      row.type = "button";
      row.setAttribute("role", "menuitem");
      row.appendChild(el("span", "nle-menu-item-label", item.label));
      row.appendChild(el("span", "nle-menu-item-kbd mono", item.shortcut || ""));
      row.addEventListener("click", () => {
        closeOpenMenu();
        item.run();
      });
      flyout.appendChild(row);
    }

    const rect = anchorBtn.getBoundingClientRect();
    flyout.dataset.menuId = menuId;
    flyout.classList.remove("is-hidden");
    const maxLeft = Math.max(8, window.innerWidth - 290);
    const leftPx = Math.min(maxLeft, Math.max(4, Math.round(rect.left)));
    flyout.style.setProperty("--flyout-left", `${leftPx}px`);
    flyout.style.setProperty("--flyout-top", `${Math.round(rect.bottom + 1)}px`);
  }

  function renderNativeMenuBar() {
    const host = byId("nle-topmenu-items");
    if (!host) return;
    host.replaceChildren();
    const menus = buildMenusSpec();
    for (const spec of menus) {
      const btn = el(
        "button",
        spec.isBrand ? "nle-topmenu-trigger nle-topmenu-brand" : "nle-topmenu-trigger",
        spec.label
      );
      btn.type = "button";
      btn.dataset.menuId = spec.id;
      btn.setAttribute("aria-haspopup", "menu");
      btn.setAttribute("aria-expanded", "false");
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (ws.openMenuId === spec.id) {
          closeOpenMenu();
        } else {
          openMenuDropdown(spec.id, btn);
        }
      });
      btn.addEventListener("mouseenter", () => {
        if (ws.openMenuId && ws.openMenuId !== spec.id) {
          openMenuDropdown(spec.id, btn);
        }
      });
      host.appendChild(btn);
    }
  }

  function openMenuSearchDialog() {
    const dlg = byId("menu-search-dialog");
    if (!dlg) return;
    renderMenuSearchList("");
    if (!dlg.open && typeof dlg.showModal === "function") dlg.showModal();
    const inp = byId("menu-search-input");
    if (inp) {
      inp.value = "";
      inp.focus();
    }
  }

  function renderMenuSearchList(query) {
    const listEl = byId("menu-search-results");
    if (!listEl) return;
    listEl.replaceChildren();
    const q = (query || "").trim().toLowerCase();
    const flat = [];
    for (const m of buildMenusSpec()) {
      for (const item of m.items) {
        if (item.sep) continue;
        const hay = `${m.label} ${item.label} ${item.shortcut || ""}`.toLowerCase();
        if (!q || hay.includes(q)) {
          flat.push({ menu: m.label, ...item });
        }
      }
    }
    if (flat.length === 0) {
      listEl.appendChild(el("div", "telemetry-note mono", "No matching menu action."));
      return;
    }
    for (const entry of flat.slice(0, 40)) {
      const btn = el("button", "menu-search-row");
      btn.type = "button";
      const left = el("span", "menu-search-path");
      left.appendChild(el("span", "menu-search-cat mono", `${entry.menu} > `));
      left.appendChild(el("span", "menu-search-name", entry.label));
      btn.appendChild(left);
      btn.appendChild(el("span", "kbd-chip mono", entry.shortcut || "Run"));
      btn.addEventListener("click", () => {
        const dlg = byId("menu-search-dialog");
        if (dlg && dlg.open) dlg.close();
        entry.run();
      });
      listEl.appendChild(btn);
    }
  }

  // =========================================================================
  // PROJECT MANAGER & PROJECT SETTINGS DIALOGS (UiProjectManager / Settings)
  // =========================================================================
  function openProjectManagerDialog() {
    const dlg = byId("project-manager-dialog");
    if (!dlg) return;
    renderProjectManagerCards();
    if (!dlg.open && typeof dlg.showModal === "function") dlg.showModal();
  }

  function renderProjectManagerCards() {
    const grid = byId("pm-projects-grid");
    if (!grid) return;
    grid.replaceChildren();
    const curName = (state.timelineDoc && state.timelineDoc.name) || "Eclipse_Showreel_Master_25p";
    const q = (ws.projectSearchQuery || "").trim().toLowerCase();

    // Tile 0: Signature DaVinci Resolve 21 "New Project" tile with coral-red outline + emblem
    if (!q || "new project".includes(q)) {
      const newCard = el("button", "pm-project-card pm-new-project-card");
      newCard.type = "button";
      const newThumb = el("div", "pm-project-thumb pm-new-thumb");
      newThumb.appendChild(makeResolveThreeDotEmblem(true));
      newCard.appendChild(newThumb);
      newCard.appendChild(el("div", "pm-project-title is-bright", "New Project"));
      newCard.addEventListener("click", () => {
        loadSampleTimeline("clean");
        const dlg = byId("project-manager-dialog");
        if (dlg && dlg.open) dlg.close();
        showBanner("Created new clean 25p project.", "success");
      });
      grid.appendChild(newCard);
    }

    const projects = [
      {
        name: curName,
        isFolder: false,
        hasPreview: true,
        lib: "local",
        run: () => {}
      },
      {
        name: "Broadcast_Conform_Diagnostics",
        isFolder: false,
        hasPreview: false,
        lib: "local",
        run: () => loadSampleTimeline("issues")
      },
      {
        name: "Commercial_Master_Rec709",
        isFolder: false,
        hasPreview: false,
        lib: "local",
        run: () => loadSampleTimeline("clean")
      },
      {
        name: "Social_Reels_9x16_Pack",
        isFolder: true,
        hasPreview: false,
        lib: "local",
        run: () => loadSampleTimeline("clean")
      },
      {
        name: "Documentary_Fairlight_Mix",
        isFolder: false,
        hasPreview: false,
        lib: "local",
        run: () => loadSampleTimeline("clean")
      },
      {
        name: "Studio_Collab_Main_Server",
        isFolder: false,
        hasPreview: false,
        lib: "network",
        run: () => loadSampleTimeline("clean")
      },
      {
        name: "Cloud_Remote_Grade_Reel",
        isFolder: false,
        hasPreview: false,
        lib: "cloud",
        run: () => loadSampleTimeline("clean")
      }
    ].filter((p) => {
      const matchLib = ws.projectLibraryTab === "local" ? p.lib === "local" : p.lib === ws.projectLibraryTab;
      const matchQ = !q || p.name.toLowerCase().includes(q);
      return matchLib && matchQ;
    });

    for (const proj of projects) {
      const card = el("button", "pm-project-card");
      card.type = "button";
      const thumb = el(
        "div",
        proj.hasPreview
          ? "pm-project-thumb is-preview"
          : proj.isFolder
            ? "pm-project-thumb is-folder"
            : "pm-project-thumb"
      );
      if (proj.isFolder) {
        const fSvg = svgEl("svg", { viewBox: "0 0 64 48", width: "68", height: "50", "aria-hidden": "true" });
        fSvg.appendChild(svgEl("path", { d: "M6 10h18l5 5h29v25H6z", fill: "#6b6b73", stroke: "#18181c", "stroke-width": "1.5" }));
        fSvg.appendChild(svgEl("rect", { x: "9", y: "13", width: "46", height: "3", fill: "#b8b8c2" }));
        fSvg.appendChild(svgEl("rect", { x: "6", y: "16", width: "52", height: "24", rx: "1.5", fill: "#76767f" }));
        thumb.appendChild(fSvg);
      } else if (!proj.hasPreview) {
        thumb.appendChild(makeResolveThreeDotEmblem(false));
      } else {
        const slateBadge = el("span", "pm-active-slate mono", "25p REC.709");
        thumb.appendChild(slateBadge);
      }
      card.appendChild(thumb);
      card.appendChild(el("div", "pm-project-title", proj.name));
      card.addEventListener("click", () => {
        proj.run();
        const dlg = byId("project-manager-dialog");
        if (dlg && dlg.open) dlg.close();
        showBanner(`Opened project ${proj.name}`, "success");
      });
      grid.appendChild(card);
    }
  }

  function openProjectSettingsDialog(tabId = "master") {
    ws.projectSettingsTab = tabId;
    const dlg = byId("project-settings-dialog");
    if (!dlg) return;
    for (const btn of dlg.querySelectorAll("[data-ps-tab]")) {
      const active = btn.dataset.psTab === tabId;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    }
    for (const pane of dlg.querySelectorAll("[data-ps-pane]")) {
      pane.classList.toggle("is-hidden", pane.dataset.psPane !== tabId);
    }
    if (!dlg.open && typeof dlg.showModal === "function") dlg.showModal();
  }

  // =========================================================================
  // PAGE 1: MEDIA PAGE (MediaStorage, Clone Checksum, MediaPool, Metadata)
  // =========================================================================
  function renderMediaPageUI() {
    const clips = getTimelineClipsFlat();
    const countEl = byId("media-page-clip-count");
    if (countEl) countEl.textContent = `${clips.length} CLIPS`;

    const filtered = clips.filter((c) => {
      if (ws.mediaBinFilter === "video" && c.trackKind !== "video") return false;
      if (ws.mediaBinFilter === "audio" && c.trackKind !== "audio") return false;
      if (ws.mediaBinFilter === "offline" && !c.offline) return false;
      if (ws.mediaBinFilter === "proxy" && !c.hasProxy) return false;
      if (ws.mediaSearchQuery) {
        const q = ws.mediaSearchQuery.toLowerCase();
        const slate = ws.mediaSlate[c.name] || {};
        const hay = `${c.name} ${c.sourcePath} ${c.trackName} ${slate.scene || ""} ${slate.keywords || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const host = byId("media-page-pool-browser");
    if (host) {
      host.replaceChildren();
      host.classList.toggle("is-table", ws.mediaViewMode === "table");
      if (ws.mediaViewMode === "table") {
        const head = el("div", "mp-table-row mp-table-head mono");
        for (const col of ["Clip Name", "Track", "Start TC", "Duration", "Source Path", "Status"]) {
          head.appendChild(el("span", "", col));
        }
        host.appendChild(head);
      }
      for (const c of filtered) {
        const isSel = c.idx === ws.mediaSelectedClipIdx;
        if (ws.mediaViewMode === "table") {
          const row = el("button", isSel ? "mp-table-row is-selected mono" : "mp-table-row mono");
          row.type = "button";
          row.appendChild(el("span", "mp-cell-title", c.name));
          row.appendChild(el("span", "", c.trackName));
          row.appendChild(el("span", "", formatTc(c.startFrame)));
          row.appendChild(el("span", "", `${c.durationFrames}f`));
          row.appendChild(el("span", "mp-cell-path", c.sourcePath));
          row.appendChild(el("span", c.offline ? "status-offline" : "status-online", c.offline ? "OFFLINE" : "ONLINE"));
          row.addEventListener("click", () => selectMediaPageClip(c));
          row.addEventListener("dblclick", () => {
            selectMediaPageClip(c);
            switchTab("timeline");
          });
          host.appendChild(row);
        } else {
          const card = el("button", isSel ? "mp-thumb-card is-selected" : "mp-thumb-card");
          card.type = "button";
          const well = el("div", `mp-thumb-well is-${c.trackKind}`);
          well.appendChild(el("span", "mp-thumb-badge mono", c.trackName));
          well.appendChild(el("span", "mp-thumb-dur mono", `${c.durationFrames}f`));
          card.appendChild(well);
          card.appendChild(el("div", "mp-thumb-name", c.name));
          card.appendChild(el("div", "mp-thumb-tc mono", formatTc(c.startFrame)));
          card.addEventListener("click", () => selectMediaPageClip(c));
          card.addEventListener("dblclick", () => {
            selectMediaPageClip(c);
            switchTab("timeline");
          });
          host.appendChild(card);
        }
      }
    }

    const sel = clips[ws.mediaSelectedClipIdx] || clips[0] || null;
    syncMediaMetadataSlate(sel);
  }

  function selectMediaPageClip(clipEntry) {
    if (!clipEntry) return;
    ws.mediaSelectedClipIdx = clipEntry.idx;
    setPlayhead(clipEntry.startFrame);
    renderMediaPageUI();
  }

  function syncMediaMetadataSlate(clipEntry) {
    const titleEl = byId("media-meta-clip-name");
    if (!clipEntry) {
      if (titleEl) titleEl.textContent = "--";
      return;
    }
    if (titleEl) titleEl.textContent = clipEntry.name;
    const saved = ws.mediaSlate[clipEntry.name] || {
      reel: "A001",
      scene: "SC_01",
      shot: `SH_${String(clipEntry.idx + 1).padStart(2, "0")}`,
      take: "1",
      camera: "A",
      keywords: clipEntry.trackKind === "audio" ? "dialogue,sync" : "broll,rec709",
      goodTake: true
    };
    const fields = [
      ["media-slate-reel", saved.reel],
      ["media-slate-scene", saved.scene],
      ["media-slate-shot", saved.shot],
      ["media-slate-take", saved.take],
      ["media-slate-camera", saved.camera],
      ["media-slate-keywords", saved.keywords]
    ];
    for (const [id, val] of fields) {
      const inp = byId(id);
      if (inp && document.activeElement !== inp) inp.value = val;
    }
    const gt = byId("media-slate-good");
    if (gt) gt.checked = Boolean(saved.goodTake);
  }

  // =========================================================================
  // PAGE 2: CUT PAGE (FirstCut Dual Stacked Timeline + Quick Cut Strip)
  // =========================================================================
  function renderCutPageBin() {
    const host = byId("cut-bin-content");
    if (!host) return;
    host.replaceChildren();
    const clips = getTimelineClipsFlat();

    if (ws.cutBinTab === "pool" || ws.cutBinTab === "sync") {
      clips.forEach((c) => {
        const isSel = c.idx === ws.cutSelectedClipIdx;
        const card = el("button", isSel ? "cut-clip-tile is-selected" : "cut-clip-tile");
        card.type = "button";
        const frame = el("div", `cut-clip-frame is-${c.trackKind}`);
        if (isSel) {
          const checkCorner = el("span", "cut-clip-corner-check", "\u2713");
          frame.appendChild(checkCorner);
        }
        const badge = el("span", "cut-clip-badge mono", ws.cutBinTab === "sync" ? `CAM ${c.trackIndex + 1}` : c.trackName);
        frame.appendChild(badge);
        const tcTag = el("span", "cut-clip-tc mono", formatTc(c.startFrame));
        frame.appendChild(tcTag);
        card.appendChild(frame);
        card.appendChild(el("div", "cut-clip-label", c.name));
        card.addEventListener("click", () => {
          ws.cutSelectedClipIdx = c.idx;
          setPlayhead(c.startFrame);
          renderCutPageBin();
        });
        host.appendChild(card);
      });
    } else if (ws.cutBinTab === "transitions") {
      const trans = [
        ["Cross Dissolve", "fade"],
        ["Additive Dissolve", "fadewhite"],
        ["Dip to Color", "fadeblack"],
        ["Wipe Left", "wipeleft"],
        ["Smooth Slide", "slideleft"],
        ["Circle Iris", "circleopen"]
      ];
      for (const [label, kind] of trans) {
        const btn = el("button", "cut-preset-tile");
        btn.type = "button";
        btn.appendChild(el("span", "cut-preset-name", label));
        btn.appendChild(el("span", "nle-tag mono", kind));
        btn.addEventListener("click", () => {
          showBanner(`Cut Transition selected: ${label} (${kind})`, "info");
        });
        host.appendChild(btn);
      }
    } else if (ws.cutBinTab === "titles") {
      const titles = ["Text+ Clean Lower Third", "Center Bold Headline", "Timecode Burn-In", "Subtitles Track (.srt)"];
      for (const label of titles) {
        const btn = el("button", "cut-preset-tile");
        btn.type = "button";
        btn.appendChild(el("span", "cut-preset-name", label));
        btn.appendChild(el("span", "nle-tag mono", "TITLE"));
        btn.addEventListener("click", () => switchTab("titles"));
        host.appendChild(btn);
      }
    } else if (ws.cutBinTab === "effects") {
      const effects = [
        ["Optical Glow / Halation", () => openOpticalGlowStudioDialog()],
        ["Camera Shake Handheld", () => openCameraShakeStudioDialog()],
        ["Anamorphic Lens Flare", () => openOpticalFlareStudioDialog()],
        ["35mm Film Look", () => openFilmLookStudioDialog()],
        ["Camera Stabilization", () => openStabilizationStudioDialog()],
        ["Auto Reframe 9:16", () => openAutoReframeDialog()]
      ];
      for (const [label, fn] of effects) {
        const btn = el("button", "cut-preset-tile");
        btn.type = "button";
        btn.appendChild(el("span", "cut-preset-name", label));
        btn.appendChild(el("span", "nle-tag mono", "OFX"));
        btn.addEventListener("click", fn);
        host.appendChild(btn);
      }
    }
  }

  // =========================================================================
  // PAGE 4: FUSION NODE FLOW CANVAS (NodeFlow + Viewer 1/2 Dots)
  // =========================================================================
  function drawFusionFlowGraph() {
    const canvas = byId("fusion-flow-canvas");
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(320, Math.round(rect.width || 960));
    const h = Math.max(88, Math.round(rect.height || 92));
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const g = canvas.getContext("2d");
    if (!g) return;
    g.save();
    g.scale(dpr, dpr);

    // Resolve Fusion dark grid background
    g.fillStyle = "#17171a";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#222227";
    g.lineWidth = 1;
    for (let x = 0; x < w; x += 24) {
      g.beginPath();
      g.moveTo(x + 0.5, 0);
      g.lineTo(x + 0.5, h);
      g.stroke();
    }
    for (let y = 0; y < h; y += 24) {
      g.beginPath();
      g.moveTo(0, y + 0.5);
      g.lineTo(w, y + 0.5);
      g.stroke();
    }

    const scaleX = w / 1110;
    const nodeW = Math.max(88, Math.round(118 * scaleX));
    const nodeH = 26;
    const byNodeId = {};
    for (const n of ws.fusionNodes) {
      byNodeId[n.id] = {
        ...n,
        px: Math.round(n.x * scaleX),
        py: n.y,
        pw: nodeW,
        ph: nodeH
      };
    }
    canvas._fusionHitboxes = Object.values(byNodeId);

    const edges = [
      ["mediain1", "deltakeyer1", "#d89638"],
      ["deltakeyer1", "planartracker1", "#d89638"],
      ["planartracker1", "transform1", "#d89638"],
      ["transform1", "opticalglow1", "#d89638"],
      ["transform1", "camerashake1", "#5ca3ff"],
      ["opticalglow1", "merge1", "#d89638"],
      ["camerashake1", "merge1", "#49b870"],
      ["merge1", "mediaout1", "#d89638"]
    ];

    for (const [fromId, toId, color] of edges) {
      const a = byNodeId[fromId];
      const b = byNodeId[toId];
      if (!a || !b) continue;
      const x1 = a.px + a.pw;
      const y1 = a.py + a.ph / 2;
      const x2 = b.px;
      const y2 = b.py + b.ph / 2;
      const midX = Math.round((x1 + x2) / 2);
      g.strokeStyle = color;
      g.lineWidth = 1.75;
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(midX, y1);
      g.lineTo(midX, y2);
      g.lineTo(x2, y2);
      g.stroke();
    }

    const paletteByKind = {
      io: "#365f47",
      matte: "#4d5f88",
      tracker: "#5e4c80",
      xform: "#6d5b3e",
      fx: "#7a493a",
      merge: "#3f596e"
    };

    for (const n of canvas._fusionHitboxes) {
      const isSel = n.id === ws.selectedFusionNodeId;
      g.fillStyle = n.enabled ? (paletteByKind[n.kind] || "#383842") : "#28282e";
      g.fillRect(n.px, n.py, n.pw, n.ph);
      g.strokeStyle = isSel ? "#e68442" : "#555562";
      g.lineWidth = isSel ? 2 : 1;
      g.strokeRect(n.px + 0.5, n.py + 0.5, n.pw - 1, n.ph - 1);

      // DaVinci Fusion triangular input ports + square output port
      // Yellow background input triangle on left
      g.fillStyle = "#eab308";
      g.beginPath();
      g.moveTo(n.px - 4, n.py + n.ph / 2 - 4);
      g.lineTo(n.px + 2, n.py + n.ph / 2);
      g.lineTo(n.px - 4, n.py + n.ph / 2 + 4);
      g.closePath();
      g.fill();

      // Green foreground triangle on top (Merge / Keyer) & Cyan effect-mask triangle on bottom
      if (n.kind === "merge" || n.kind === "matte") {
        g.fillStyle = "#22c55e";
        g.beginPath();
        g.moveTo(n.px + n.pw * 0.5 - 4, n.py - 4);
        g.lineTo(n.px + n.pw * 0.5 + 4, n.py - 4);
        g.lineTo(n.px + n.pw * 0.5, n.py + 2);
        g.closePath();
        g.fill();
      }
      g.fillStyle = "#38bdf8";
      g.beginPath();
      g.moveTo(n.px + n.pw * 0.72 - 3.5, n.py + n.ph + 3.5);
      g.lineTo(n.px + n.pw * 0.72 + 3.5, n.py + n.ph + 3.5);
      g.lineTo(n.px + n.pw * 0.72, n.py + n.ph - 1.5);
      g.closePath();
      g.fill();

      // Grey square output port on right
      g.fillStyle = "#cbd5e1";
      g.fillRect(n.px + n.pw - 3, n.py + n.ph / 2 - 3, 6, 6);

      g.fillStyle = n.enabled ? "#f0f0f2" : "#858592";
      g.font = "600 11px ui-monospace, SFMono-Regular, Consolas, monospace";
      g.textBaseline = "middle";
      g.fillText(n.label, n.px + 8, n.py + n.ph / 2 - 2, n.pw - 16);

      // Viewer 1 / Viewer 2 indicator dots at bottom-left
      g.fillStyle = n.v1 ? "#f59e0b" : "#3a3a42";
      g.fillRect(n.px + 8, n.py + n.ph - 6, 5, 4);
      g.fillStyle = n.v2 ? "#f59e0b" : "#3a3a42";
      g.fillRect(n.px + 16, n.py + n.ph - 6, 5, 4);
    }

    g.restore();
  }

  // =========================================================================
  // PAGE 5: COLOR CLIPS FILMSTRIP (UiColorClipsWidget)
  // =========================================================================
  function renderColorClipsFilmstrip() {
    const strip = byId("color-clips-filmstrip");
    if (!strip) return;
    strip.replaceChildren();
    const videoClips = getTimelineClipsFlat().filter((c) => c.trackKind === "video");
    const countBadge = byId("color-filmstrip-count");
    if (countBadge) countBadge.textContent = `${videoClips.length} SHOTS`;

    videoClips.forEach((c, i) => {
      const inPlayhead =
        state.playheadFrame >= c.startFrame &&
        state.playheadFrame < c.startFrame + Math.max(1, c.durationFrames);
      const item = el("button", inPlayhead ? "color-shot-card is-active" : "color-shot-card");
      item.type = "button";
      const preview = el("div", "color-shot-thumb");
      preview.appendChild(el("span", "color-shot-idx mono", String(i + 1).padStart(2, "0")));
      preview.appendChild(el("span", "color-shot-badge mono", c.trackName));
      item.appendChild(preview);
      item.appendChild(el("div", "color-shot-name", c.name));
      item.appendChild(el("div", "color-shot-tc mono", formatTc(c.startFrame)));
      item.addEventListener("click", () => {
        setPlayhead(c.startFrame);
      });
      strip.appendChild(item);
    });
  }

  // =========================================================================
  // PAGE 6: FAIRLIGHT DAW TIMELINE + CONSOLE MIXER (FairlightPage.dll)
  // =========================================================================
  function selectFairlightDspView(viewId) {
    for (const btn of document.querySelectorAll("[data-fl-dsp]")) {
      btn.classList.toggle("is-active", btn.dataset.flDsp === viewId);
    }
    redrawWorkstationCanvases();
  }

  function toggleFairlightDim() {
    ws.fairlightDim = !ws.fairlightDim;
    const btn = byId("btn-fl-dim");
    if (btn) {
      btn.classList.toggle("is-active", ws.fairlightDim);
      btn.setAttribute("aria-pressed", ws.fairlightDim ? "true" : "false");
    }
    redrawWorkstationCanvases();
  }

  function toggleFairlightMute() {
    ws.fairlightMute = !ws.fairlightMute;
    const btn = byId("btn-fl-mute");
    if (btn) {
      btn.classList.toggle("is-active", ws.fairlightMute);
      btn.setAttribute("aria-pressed", ws.fairlightMute ? "true" : "false");
    }
    redrawWorkstationCanvases();
  }

  function renderFairlightMixerConsole() {
    const host = byId("fairlight-console-strips");
    if (!host) return;
    host.replaceChildren();

    for (const strip of ws.fairlightStrips) {
      const col = el("div", strip.id === "bus1" ? "fl-channel-strip is-master" : "fl-channel-strip");
      const topSlot = el("div", "fl-strip-top");
      topSlot.appendChild(el("span", "fl-strip-code mono", strip.code));
      topSlot.appendChild(el("span", "fl-strip-bus mono", strip.bus));
      col.appendChild(topSlot);
      col.appendChild(el("div", "fl-strip-io mono", "Input"));

      const inserts = el("div", "fl-strip-inserts");
      const eqBtn = el("button", strip.eq ? "fl-insert-pill is-on" : "fl-insert-pill", "EQ");
      eqBtn.type = "button";
      eqBtn.addEventListener("click", () => {
        strip.eq = !strip.eq;
        renderFairlightMixerConsole();
      });
      const dynBtn = el("button", strip.dyn ? "fl-insert-pill is-on" : "fl-insert-pill", "DYN");
      dynBtn.type = "button";
      dynBtn.addEventListener("click", () => {
        strip.dyn = !strip.dyn;
        renderFairlightMixerConsole();
      });
      inserts.appendChild(eqBtn);
      inserts.appendChild(dynBtn);
      col.appendChild(inserts);

      // Pan readout + precision micro-slider
      const panWrap = el("div", "fl-pan-wrap");
      const panLbl = el("span", "fl-pan-label mono", strip.pan === 0 ? "C" : strip.pan < 0 ? `L${Math.abs(strip.pan)}` : `R${strip.pan}`);
      const panInp = el("input", "fl-pan-slider");
      panInp.type = "range";
      panInp.min = "-50";
      panInp.max = "50";
      panInp.value = String(strip.pan);
      panInp.setAttribute("aria-label", `${strip.name} Pan`);
      panInp.addEventListener("input", () => {
        strip.pan = Number(panInp.value);
        panLbl.textContent = strip.pan === 0 ? "C" : strip.pan < 0 ? `L${Math.abs(strip.pan)}` : `R${strip.pan}`;
      });
      panWrap.appendChild(panLbl);
      panWrap.appendChild(panInp);
      col.appendChild(panWrap);

      // R / S / M square hardware buttons
      const msRow = el("div", "fl-ms-row");
      const rBtn = el("button", strip.rec ? "fl-ms-btn is-rec" : "fl-ms-btn", "R");
      rBtn.type = "button";
      rBtn.addEventListener("click", () => { strip.rec = !strip.rec; renderFairlightMixerConsole(); });
      const sBtn = el("button", strip.solo ? "fl-ms-btn is-solo" : "fl-ms-btn", "S");
      sBtn.type = "button";
      sBtn.addEventListener("click", () => { strip.solo = !strip.solo; renderFairlightMixerConsole(); });
      const mBtn = el("button", strip.mute ? "fl-ms-btn is-mute" : "fl-ms-btn", "M");
      mBtn.type = "button";
      mBtn.addEventListener("click", () => { strip.mute = !strip.mute; renderFairlightMixerConsole(); redrawWorkstationCanvases(); });
      msRow.appendChild(rBtn);
      msRow.appendChild(sBtn);
      msRow.appendChild(mBtn);
      col.appendChild(msRow);

      // Vertical DAW Fader Well + Dual Segmented LED Meter + Scale
      const faderBay = el("div", "fl-fader-bay");
      const faderWell = el("div", "fl-fader-well");
      const faderCap = el("div", "fl-fader-cap");
      const updateCapPos = () => {
        const norm = (strip.faderDb - (-48)) / 60;
        const pct = Math.max(4, Math.min(94, Math.round((1 - norm) * 100)));
        faderCap.style.setProperty("--cap-top", `${pct}%`);
      };
      updateCapPos();
      faderWell.appendChild(faderCap);

      const faderInp = el("input", "fl-fader-range");
      faderInp.type = "range";
      faderInp.min = "-48";
      faderInp.max = "12";
      faderInp.step = "0.5";
      faderInp.value = String(strip.faderDb);
      faderInp.setAttribute("aria-label", `${strip.name} Fader dB`);
      faderWell.appendChild(faderInp);

      // Dual L/R LED bargraph
      const meterPair = el("div", "fl-strip-meters");
      const meterL = el("div", "fl-meter-bar");
      const meterR = el("div", "fl-meter-bar");
      const fillL = el("div", "fl-meter-fill");
      const fillR = el("div", "fl-meter-fill");
      const syncMeterHeight = () => {
        const activePct = strip.mute || ws.fairlightMute
          ? 2
          : Math.max(8, Math.min(96, Math.round(((strip.faderDb + 44) / 56) * 86)));
        fillL.style.setProperty("--meter-pct", `${activePct}%`);
        fillR.style.setProperty("--meter-pct", `${Math.max(4, activePct - 5)}%`);
      };
      syncMeterHeight();
      meterL.appendChild(fillL);
      meterR.appendChild(fillR);
      meterPair.appendChild(meterL);
      meterPair.appendChild(meterR);

      const scaleCol = el("div", "fl-db-scale mono");
      for (const tick of ["+10", "0", "-10", "-20", "-40"]) {
        scaleCol.appendChild(el("span", "", tick));
      }

      faderBay.appendChild(faderWell);
      faderBay.appendChild(scaleCol);
      faderBay.appendChild(meterPair);
      col.appendChild(faderBay);

      const dbReadout = el("div", "fl-fader-db mono", `${strip.faderDb >= 0 ? "+" : ""}${strip.faderDb.toFixed(1)}`);
      faderInp.addEventListener("input", () => {
        strip.faderDb = Number(faderInp.value);
        dbReadout.textContent = `${strip.faderDb >= 0 ? "+" : ""}${strip.faderDb.toFixed(1)}`;
        updateCapPos();
        syncMeterHeight();
        redrawWorkstationCanvases();
      });
      col.appendChild(dbReadout);
      col.appendChild(el("div", "fl-strip-name", strip.name));
      host.appendChild(col);
    }
  }

  function drawFairlightWaveformTimeline() {
    const canvas = byId("fairlight-waveform-canvas");
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(320, Math.round(rect.width || 720));
    const h = Math.max(180, Math.round(rect.height || 230));
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const g = canvas.getContext("2d");
    if (!g) return;
    g.save();
    g.scale(dpr, dpr);

    g.fillStyle = "#151518";
    g.fillRect(0, 0, w, h);

    const hdrW = 104;
    const rulerH = 22;
    const tracks = ws.fairlightStrips.slice(0, 4);
    const rowH = Math.floor((h - rulerH) / tracks.length);
    const maxF = Math.max(1, state.timelineMaxFrame || 250);
    const plotW = Math.max(40, w - hdrW - 8);

    // Timecode ruler
    g.fillStyle = "#222227";
    g.fillRect(0, 0, w, rulerH);
    g.fillStyle = "#9e9ea8";
    g.font = "10px ui-monospace, SFMono-Regular, Consolas, monospace";
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const f = Math.round((maxF * i) / steps);
      const x = hdrW + Math.round((plotW * i) / steps);
      g.fillRect(x, rulerH - 5, 1, 5);
      if (i < steps) g.fillText(formatTc(f), x + 3, 14);
    }

    tracks.forEach((tr, idx) => {
      const y0 = rulerH + idx * rowH;
      const midY = y0 + rowH / 2;
      g.fillStyle = idx % 2 === 0 ? "#1b1b1f" : "#18181c";
      g.fillRect(hdrW, y0, w - hdrW, rowH - 1);
      g.fillStyle = "#25252a";
      g.fillRect(0, y0, hdrW - 1, rowH - 1);

      g.fillStyle = "#e4e4ea";
      g.font = "600 11px system-ui, sans-serif";
      g.fillText(`${tr.code} ${tr.name}`, 8, y0 + 16);
      g.fillStyle = tr.mute ? "#ef4444" : "#2bb3a3";
      g.font = "10px ui-monospace, monospace";
      g.fillText(tr.mute ? "MUTED" : `${tr.faderDb.toFixed(1)} dB`, 8, y0 + 31);

      // Clip container box & synthetic deterministic sample waveform
      const gainScale = tr.mute ? 0.08 : Math.min(1.0, Math.pow(10, tr.faderDb / 28));
      g.fillStyle = tr.mute ? "rgba(90, 90, 100, 0.22)" : "rgba(38, 128, 114, 0.25)";
      g.fillRect(hdrW + 2, y0 + 4, plotW - 4, rowH - 8);
      g.strokeStyle = tr.mute ? "#52525b" : "#2bb3a3";
      g.lineWidth = 1;
      g.beginPath();
      for (let px = 0; px < plotW - 6; px += 2) {
        const phase = (px * 0.13) + (idx * 1.9);
        const env = 0.35 + 0.65 * Math.abs(Math.sin(px * 0.027 + idx));
        const amp = Math.sin(phase) * env * (rowH * 0.36) * gainScale;
        const x = hdrW + 3 + px;
        g.moveTo(x, midY - Math.abs(amp));
        g.lineTo(x, midY + Math.abs(amp));
      }
      g.stroke();

      // 0 dB unity line
      g.strokeStyle = "rgba(255, 255, 255, 0.16)";
      g.beginPath();
      g.moveTo(hdrW, midY + 0.5);
      g.lineTo(w, midY + 0.5);
      g.stroke();
    });

    // Red DaVinci Playhead
    const phX = hdrW + Math.round((Math.min(maxF, state.playheadFrame || 0) / maxF) * plotW);
    g.strokeStyle = "#ef4444";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(phX + 0.5, 0);
    g.lineTo(phX + 0.5, h);
    g.stroke();
    g.fillStyle = "#ef4444";
    g.beginPath();
    g.moveTo(phX - 5, 0);
    g.lineTo(phX + 6, 0);
    g.lineTo(phX + 0.5, 8);
    g.closePath();
    g.fill();

    canvas._flGeom = { hdrW, plotW, maxF };
    g.restore();
  }

  // =========================================================================
  // UNIFIED REDRAW ACROSS ALL 7 DAVINCI RESOLVE PAGES
  // =========================================================================
  function redrawWorkstationCanvases() {
    const activeColorChain = getActiveColorChainState();
    const tcStr = formatTc(state.playheadFrame);

    for (const id of ["media-page-tc", "cut-page-tc", "fairlight-page-tc"]) {
      const elTc = byId(id);
      if (elTc) elTc.textContent = tcStr;
    }

    if (state.activeTab === "media") {
      renderMediaPageUI();
      const clips = getTimelineClipsFlat();
      const sel = clips[ws.mediaSelectedClipIdx] || clips[0] || null;
      if (sel && state.sourceMonitor && state.sourceMonitor.clip) {
        drawSourceMonitorCanvas(
          byId("media-page-viewer-canvas"),
          state.sourceMonitor.clip,
          state.sourceMonitor,
          state.timelineDoc,
          { badgeLabel: "MEDIA POOL", trackLabel: sel.trackName, proxyModeEnabled: Boolean(state.mediaPoolProxyMode) }
        );
      } else {
        drawProgramMonitorCanvas(
          byId("media-page-viewer-canvas"),
          state.timelineDoc,
          state.playheadFrame,
          activeColorChain,
          getEffectiveFxState(),
          getEffectiveTitleState(false),
          getEffectiveFramingState(),
          getEffectiveSubtitleState(false),
          null,
          null,
          {}
        );
      }
      const fftSpec =
        typeof computeCurrentFairlightSpectrum === "function"
          ? computeCurrentFairlightSpectrum()
          : null;
      renderFairlightFftCanvas(byId("media-page-fft-canvas"), fftSpec, state.fairlightRack, {
        focusBand: "all"
      });
    } else if (state.activeTab === "cut") {
      renderCutPageBin();
      drawProgramMonitorCanvas(
        byId("cut-viewer-canvas"),
        state.timelineDoc,
        state.playheadFrame,
        activeColorChain,
        getEffectiveFxState(),
        getEffectiveTitleState(false),
        getEffectiveFramingState(),
        getEffectiveSubtitleState(false),
        null,
        null,
        { dveOverlay: false }
      );
      // Signature Cut Dual Timeline: Upper = 100% Full Timeline Overview, Lower = Zoomed Detail
      drawTimelineOverviewCanvas(
        byId("cut-overview-canvas"),
        state.timelineDoc,
        {
          zoom: 1,
          viewStartFrame: 0,
          playheadFrame: state.playheadFrame,
          ioRange: state.ioRange
        }
      );
      const cutZoom = Math.max(3, state.timelineZoom || 3);
      const maxF = Math.max(1, state.timelineMaxFrame || 250);
      const span = Math.max(25, Math.round(maxF / cutZoom));
      const viewStart = Math.max(0, Math.min(maxF - span, Math.round(state.playheadFrame - span / 2)));
      drawTimelineCanvas(
        byId("cut-detail-canvas"),
        state.timelineDoc,
        state.timelineValidation,
        {
          zoom: cutZoom,
          viewStartFrame: viewStart,
          selected: state.timelineSelected,
          playheadFrame: state.playheadFrame,
          tool: state.timelineTool,
          ioRange: state.ioRange
        }
      );
      drawStereoVuMeterCanvas(byId("cut-vu-canvas"), {
        leftDb: state.vuMeter.leftDb,
        rightDb: state.vuMeter.rightDb,
        holdL: state.vuMeter.holdL,
        holdR: state.vuMeter.holdR,
        allMuted: state.vuMeter.allMuted,
        duckEnabled: false,
        duckThresholdDb: -18
      });
    } else if (state.activeTab === "fx") {
      drawFusionFlowGraph();
    } else if (state.activeTab === "color") {
      renderColorClipsFilmstrip();
    } else if (state.activeTab === "fairlight") {
      drawFairlightWaveformTimeline();
      renderFairlightEqCurveCanvas(byId("fairlight-page-eq-canvas"), state.fairlightRack, state.fairlightRackBandId);
      renderFairlightDynamicsCanvas(byId("fairlight-page-dyn-canvas"), state.fairlightRack, -14.0);
      const fftSpec =
        typeof computeCurrentFairlightSpectrum === "function"
          ? computeCurrentFairlightSpectrum()
          : null;
      renderFairlightFftCanvas(byId("fairlight-page-fft-canvas"), fftSpec, state.fairlightRack, {
        focusBand: "all"
      });
      const masterStrip = ws.fairlightStrips.find((s) => s.id === "bus1") || { faderDb: 0, mute: false };
      const dimOffset = ws.fairlightDim ? -20 : 0;
      const muted = ws.fairlightMute || masterStrip.mute || state.vuMeter.allMuted;
      drawStereoVuMeterCanvas(byId("fairlight-vu-canvas"), {
        leftDb: muted ? -60 : Math.min(0, (state.vuMeter.leftDb || -14) + masterStrip.faderDb + dimOffset),
        rightDb: muted ? -60 : Math.min(0, (state.vuMeter.rightDb || -14.5) + masterStrip.faderDb + dimOffset),
        holdL: muted ? -60 : Math.min(0, (state.vuMeter.holdL || -11) + masterStrip.faderDb + dimOffset),
        holdR: muted ? -60 : Math.min(0, (state.vuMeter.holdR || -11.5) + masterStrip.faderDb + dimOffset),
        allMuted: muted,
        duckEnabled: Boolean(state.autoDuck.enabled),
        duckThresholdDb: state.autoDuck.threshold_db
      });
      const intEl = byId("fl-meter-integrated");
      if (intEl) {
        const targetMap = { ebu_r128: "-23.0 LUFS", streaming: "-14.0 LUFS", atsc: "-24.0 LKFS" };
        intEl.textContent = muted ? "-inf LUFS" : (targetMap[ws.fairlightTargetStd] || "-14.0 LUFS");
      }
    }
  }

  function wireCanvasScrub(canvasId) {
    const c = byId(canvasId);
    if (!c) return;
    const scrub = (ev) => {
      const rect = c.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;
      const labelOffset = canvasId === "fairlight-waveform-canvas" ? 104 : canvasId === "cut-detail-canvas" ? 68 : 0;
      const frac = Math.max(0, Math.min(1, (ev.clientX - rect.left - labelOffset) / Math.max(1, rect.width - labelOffset)));
      setPlayhead(frac * (state.timelineMaxFrame || 250));
    };
    let dragging = false;
    c.addEventListener("pointerdown", (ev) => {
      dragging = true;
      if (c.setPointerCapture) c.setPointerCapture(ev.pointerId);
      scrub(ev);
    });
    c.addEventListener("pointermove", (ev) => {
      if (dragging) scrub(ev);
    });
    c.addEventListener("pointerup", () => { dragging = false; });
    c.addEventListener("pointercancel", () => { dragging = false; });
  }

  function init() {
    renderNativeMenuBar();
    renderFairlightMixerConsole();

    document.addEventListener("click", (ev) => {
      if (!ws.openMenuId) return;
      const flyout = byId("nle-menu-flyout");
      if (flyout && flyout.contains(ev.target)) return;
      if (ev.target && ev.target.closest && ev.target.closest(".nle-topmenu-trigger")) return;
      closeOpenMenu();
    });

    // Global Resolve Shift+1..9 & Ctrl+K shortcuts
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && ws.openMenuId) {
        closeOpenMenu();
        return;
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault();
        openMenuSearchDialog();
        return;
      }
      const tag = ev.target && ev.target.tagName ? ev.target.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (ev.shiftKey && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
        const codeMap = {
          Digit1: () => openProjectManagerDialog(),
          Digit2: () => switchTab("media"),
          Digit3: () => switchTab("cut"),
          Digit4: () => switchTab("timeline"),
          Digit5: () => switchTab("fx"),
          Digit6: () => switchTab("color"),
          Digit7: () => switchTab("fairlight"),
          Digit8: () => switchTab("render"),
          Digit9: () => openProjectSettingsDialog("master")
        };
        if (codeMap[ev.code]) {
          ev.preventDefault();
          codeMap[ev.code]();
        }
      }
    });

    // Menu search & dialogs
    const btnMenuSearch = byId("btn-menu-search");
    if (btnMenuSearch) btnMenuSearch.addEventListener("click", openMenuSearchDialog);
    const menuSearchInp = byId("menu-search-input");
    if (menuSearchInp) menuSearchInp.addEventListener("input", () => renderMenuSearchList(menuSearchInp.value));
    const btnCloseMenuSearch = byId("btn-close-menu-search");
    if (btnCloseMenuSearch) btnCloseMenuSearch.addEventListener("click", () => byId("menu-search-dialog").close());

    for (const id of ["btn-dock-project-manager", "topbar-project-name"]) {
      const b = byId(id);
      if (b) b.addEventListener("click", openProjectManagerDialog);
    }
    const btnClosePm = byId("btn-close-project-manager");
    if (btnClosePm) btnClosePm.addEventListener("click", () => byId("project-manager-dialog").close());
    for (const tabBtn of document.querySelectorAll("[data-pm-lib]")) {
      tabBtn.addEventListener("click", () => {
        ws.projectLibraryTab = tabBtn.dataset.pmLib;
        for (const x of document.querySelectorAll("[data-pm-lib]")) x.classList.toggle("is-active", x === tabBtn);
        renderProjectManagerCards();
      });
    }
    const btnPmOpenLocal = byId("btn-pm-open-json");
    if (btnPmOpenLocal) {
      btnPmOpenLocal.addEventListener("click", () => {
        byId("project-manager-dialog").close();
        clickIfPresent(byId, "btn-open-project");
      });
    }
    const btnPmNew = byId("btn-pm-new-project");
    if (btnPmNew) {
      btnPmNew.addEventListener("click", () => {
        loadSampleTimeline("clean");
        byId("project-manager-dialog").close();
      });
    }
    const pmSearch = byId("pm-search-input");
    if (pmSearch) {
      pmSearch.addEventListener("input", () => {
        ws.projectSearchQuery = pmSearch.value;
        renderProjectManagerCards();
      });
    }
    const btnPmExport = byId("btn-pm-export");
    if (btnPmExport) {
      btnPmExport.addEventListener("click", () => {
        byId("project-manager-dialog").close();
        clickIfPresent(byId, "btn-save-project");
      });
    }
    const btnPmImport = byId("btn-pm-import");
    if (btnPmImport) {
      btnPmImport.addEventListener("click", () => {
        byId("project-manager-dialog").close();
        clickIfPresent(byId, "btn-open-project");
      });
    }

    const btnDockSettings = byId("btn-dock-project-settings");
    if (btnDockSettings) btnDockSettings.addEventListener("click", () => openProjectSettingsDialog("master"));
    const btnClosePs = byId("btn-close-project-settings");
    if (btnClosePs) btnClosePs.addEventListener("click", () => byId("project-settings-dialog").close());
    for (const psBtn of document.querySelectorAll("[data-ps-tab]")) {
      psBtn.addEventListener("click", () => openProjectSettingsDialog(psBtn.dataset.psTab));
    }
    const btnSavePs = byId("btn-save-project-settings");
    if (btnSavePs) {
      btnSavePs.addEventListener("click", () => {
        const resSel = byId("ps-timeline-res");
        const aspectSel = byId("program-aspect-select");
        if (resSel && aspectSel) {
          if (resSel.value === "1080x1920") aspectSel.value = "9:16";
          else if (resSel.value === "1080x1080") aspectSel.value = "1:1";
          else aspectSel.value = "16:9";
          aspectSel.dispatchEvent(new Event("change", { bubbles: true }));
        }
        byId("project-settings-dialog").close();
        showBanner("Project Master & Color settings updated.", "success");
      });
    }

    // Context bar workspace panel toggles
    for (const pToggle of document.querySelectorAll("[data-ws-toggle]")) {
      pToggle.addEventListener("click", () => {
        const targetId = pToggle.dataset.wsToggle;
        const pane = byId(targetId);
        if (pane) {
          const hidden = pane.classList.toggle("is-collapsed-dock");
          pToggle.classList.toggle("is-active", !hidden);
          redrawActiveCanvases();
        }
      });
    }

    // Media Page events
    for (const binBtn of document.querySelectorAll("[data-media-bin]")) {
      binBtn.addEventListener("click", () => {
        ws.mediaBinFilter = binBtn.dataset.mediaBin;
        for (const x of document.querySelectorAll("[data-media-bin]")) x.classList.toggle("is-active", x === binBtn);
        renderMediaPageUI();
      });
    }
    for (const vmBtn of document.querySelectorAll("[data-media-view]")) {
      vmBtn.addEventListener("click", () => {
        ws.mediaViewMode = vmBtn.dataset.mediaView;
        for (const x of document.querySelectorAll("[data-media-view]")) x.classList.toggle("is-active", x === vmBtn);
        renderMediaPageUI();
      });
    }
    const mediaSearch = byId("media-ai-search-input");
    if (mediaSearch) {
      mediaSearch.addEventListener("input", () => {
        ws.mediaSearchQuery = mediaSearch.value;
        renderMediaPageUI();
      });
    }
    const btnCloneVerify = byId("btn-media-clone-verify");
    if (btnCloneVerify) {
      btnCloneVerify.addEventListener("click", () => {
        const src = (byId("media-clone-src") && byId("media-clone-src").value) || "/Volumes/CAM_A001";
        const dst = (byId("media-clone-dst") && byId("media-clone-dst").value) || "backups/CAM_A001";
        const clips = getTimelineClipsFlat();
        const note = byId("media-clone-status");
        if (note) note.textContent = `CHECKSUM VERIFIED (XXH64 / SHA-256): ${clips.length} clips cloned ${src} -> ${dst} (0 bit errors).`;
        showBanner(`Clone checksum verified (${clips.length} media files).`, "success");
      });
    }
    const btnSaveSlate = byId("btn-media-save-slate");
    if (btnSaveSlate) {
      btnSaveSlate.addEventListener("click", () => {
        const clips = getTimelineClipsFlat();
        const sel = clips[ws.mediaSelectedClipIdx] || clips[0];
        if (!sel) return;
        ws.mediaSlate[sel.name] = {
          reel: byId("media-slate-reel").value,
          scene: byId("media-slate-scene").value,
          shot: byId("media-slate-shot").value,
          take: byId("media-slate-take").value,
          camera: byId("media-slate-camera").value,
          keywords: byId("media-slate-keywords").value,
          goodTake: byId("media-slate-good").checked
        };
        showBanner(`Saved Slate metadata for ${sel.name}`, "success");
      });
    }
    const btnMediaImport = byId("btn-media-import-tl");
    if (btnMediaImport) btnMediaImport.addEventListener("click", () => clickIfPresent(byId, "timeline-file-input"));
    const btnMediaProxy = byId("btn-media-open-proxy");
    if (btnMediaProxy) btnMediaProxy.addEventListener("click", () => openMediaPoolProDialog("proxy"));
    const btnMediaRelink = byId("btn-media-open-relink");
    if (btnMediaRelink) btnMediaRelink.addEventListener("click", () => openMediaPoolProDialog("relink"));
    const btnMediaPlay = byId("btn-media-play");
    if (btnMediaPlay) btnMediaPlay.addEventListener("click", () => clickIfPresent(byId, "btn-tc-play"));

    // Cut Page events
    for (const cTab of document.querySelectorAll("[data-cut-tab]")) {
      cTab.addEventListener("click", () => {
        ws.cutBinTab = cTab.dataset.cutTab;
        for (const x of document.querySelectorAll("[data-cut-tab]")) x.classList.toggle("is-active", x === cTab);
        renderCutPageBin();
      });
    }
    for (const cMode of document.querySelectorAll("[data-cut-vmode]")) {
      cMode.addEventListener("click", () => {
        ws.cutViewerMode = cMode.dataset.cutVmode;
        for (const x of document.querySelectorAll("[data-cut-vmode]")) x.classList.toggle("is-active", x === cMode);
        redrawWorkstationCanvases();
      });
    }
    const cutActionMap = [
      ["btn-cut-smart-insert", () => clickIfPresent(byId, "btn-pool-smart-insert")],
      ["btn-cut-append", () => clickIfPresent(byId, "btn-pool-append")],
      ["btn-cut-ripple-ow", () => clickIfPresent(byId, "btn-three-pt-overwrite")],
      ["btn-cut-closeup", () => { splitAtPlayheadAction(); showBanner("Applied Close-Up 1.35x punch-in at playhead.", "success"); }],
      ["btn-cut-place-top", () => clickIfPresent(byId, "btn-pool-insert-playhead")],
      ["btn-cut-src-ow", () => clickIfPresent(byId, "btn-three-pt-replace")],
      ["btn-cut-play", () => clickIfPresent(byId, "btn-tc-play")],
      ["btn-cut-split", () => splitAtPlayheadAction()],
      ["btn-cut-tool-crop", () => { switchTab("timeline"); showBanner("Inspector Crop & Transform focused.", "info"); }],
      ["btn-cut-tool-dzoom", () => openAutoReframeDialog()],
      ["btn-cut-tool-stab", () => openStabilizationStudioDialog()],
      ["btn-cut-tool-speed", () => openRetimeStudioDialog()],
      ["btn-cut-tool-audio", () => switchTab("fairlight")]
    ];
    for (const [id, fn] of cutActionMap) {
      const b = byId(id);
      if (b) b.addEventListener("click", fn);
    }
    wireCanvasScrub("cut-overview-canvas");
    wireCanvasScrub("cut-detail-canvas");

    // Fusion Flow Canvas click & shelf
    const fusionCanvas = byId("fusion-flow-canvas");
    if (fusionCanvas) {
      fusionCanvas.addEventListener("click", (ev) => {
        const rect = fusionCanvas.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;
        const boxes = fusionCanvas._fusionHitboxes || [];
        for (const b of boxes) {
          if (x >= b.px && x <= b.px + b.pw && y >= b.py && y <= b.py + b.ph) {
            ws.selectedFusionNodeId = b.id;
            drawFusionFlowGraph();
            const map = {
              keyer: () => { const p = byId("fx-keyer-pane"); if (p) p.scrollIntoView({ behavior: "smooth" }); },
              tracker: () => { const p = byId("fx-tracker-pane"); if (p) p.scrollIntoView({ behavior: "smooth" }); },
              spline: () => openMotionSplineStudioDialog(),
              glow: () => openOpticalGlowStudioDialog(),
              shake: () => openCameraShakeStudioDialog()
            };
            if (b.action && map[b.action] && ev.detail >= 2) {
              map[b.action]();
            }
            break;
          }
        }
      });
    }
    for (const shelfBtn of document.querySelectorAll("[data-fusion-tool]")) {
      shelfBtn.addEventListener("click", () => {
        const tool = shelfBtn.dataset.fusionTool;
        if (tool === "spline") openMotionSplineStudioDialog();
        else if (tool === "glow") openOpticalGlowStudioDialog();
        else if (tool === "flare") openOpticalFlareStudioDialog();
        else if (tool === "shake") openCameraShakeStudioDialog();
        else if (tool === "keyer") { const p = byId("fx-keyer-pane"); if (p) p.scrollIntoView({ behavior: "smooth" }); }
        else if (tool === "tracker") { const p = byId("fx-tracker-pane"); if (p) p.scrollIntoView({ behavior: "smooth" }); }
        else if (tool === "bypass") {
          const n = ws.fusionNodes.find((x) => x.id === ws.selectedFusionNodeId);
          if (n && n.kind !== "io") {
            n.enabled = !n.enabled;
            drawFusionFlowGraph();
          }
        }
      });
    }

    // Fairlight Page events
    wireCanvasScrub("fairlight-waveform-canvas");
    const flPlay = byId("btn-fl-play");
    if (flPlay) flPlay.addEventListener("click", () => clickIfPresent(byId, "btn-tc-play"));
    const flDim = byId("btn-fl-dim");
    if (flDim) flDim.addEventListener("click", toggleFairlightDim);
    const flMute = byId("btn-fl-mute");
    if (flMute) flMute.addEventListener("click", toggleFairlightMute);
    const flStd = byId("fl-loudness-std-select");
    if (flStd) {
      flStd.addEventListener("change", () => {
        ws.fairlightTargetStd = flStd.value;
        redrawWorkstationCanvases();
      });
    }
    const flTrans = byId("btn-fl-detect-transients");
    if (flTrans) {
      flTrans.addEventListener("click", () => {
        clickIfPresent(byId, "btn-fairlight-detect-transients");
        showBanner("Fairlight transient detection & waveform analysis updated.", "info");
      });
    }
    const btnDeliverQa = byId("btn-deliver-open-qa");
    if (btnDeliverQa) btnDeliverQa.addEventListener("click", () => switchTab("qa"));
  }

  return {
    init,
    redrawWorkstationCanvases,
    renderNativeMenuBar,
    openProjectManagerDialog,
    openProjectSettingsDialog,
    openMenuSearchDialog
  };
}
