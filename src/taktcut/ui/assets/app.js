import {
  captureCleanColorStill,
  captureCleanFxStill,
  drawColorPreviewCanvas,
  drawColorScopeCanvas,
  drawFramesCanvas,
  drawKeyframeCurveCanvas,
  drawLoudnessCanvas,
  drawProgramMonitorCanvas,
  drawStereoVuMeterCanvas,
  drawTimelineCanvas,
  findActiveSubtitleCue,
  framesToSmpte
} from "./canvas.js";
import { bindColorWheelEvents, drawColorWheel } from "./color_wheels.js";
import { createApiClient } from "./demo_adapter.js";
import { TRANSLATIONS } from "./i18n.js";
import {
  AUDIO_FADE_S_MAX,
  AUDIO_FADE_S_MIN,
  AUDIO_GAIN_DB_MAX,
  AUDIO_GAIN_DB_MIN,
  AUTO_DUCK_ATTACK_MS_DEFAULT,
  AUTO_DUCK_ATTACK_MS_MAX,
  AUTO_DUCK_ATTACK_MS_MIN,
  AUTO_DUCK_RATIO_DEFAULT,
  AUTO_DUCK_RATIO_MAX,
  AUTO_DUCK_RATIO_MIN,
  AUTO_DUCK_RELEASE_MS_DEFAULT,
  AUTO_DUCK_RELEASE_MS_MAX,
  AUTO_DUCK_RELEASE_MS_MIN,
  AUTO_DUCK_THRESHOLD_DB_DEFAULT,
  AUTO_DUCK_THRESHOLD_DB_MAX,
  AUTO_DUCK_THRESHOLD_DB_MIN,
  BPM_DEFAULT,
  BPM_MAX,
  BPM_MIN,
  BPM_OFFSET_MAX_S,
  BPM_OFFSET_MIN_S,
  DELIVERY_PRESETS,
  DYNAMIC_ZOOM_DEFAULT,
  LOUDNESS_PRESET_LUFS,
  MARKER_COLOR_HEX,
  RETIME_SPEED_MAX,
  RETIME_SPEED_MIN,
  SNAP_THRESHOLD_PX,
  SPLIT_WIPE_HIT_RADIUS_PX,
  SPLIT_WIPE_POS_DEFAULT,
  STILLS_GALLERY_MAX,
  TRANSFORM_OPACITY_DEFAULT,
  TRANSFORM_OPACITY_MAX,
  TRANSFORM_OPACITY_MIN,
  TRANSFORM_POS_DEFAULT,
  TRANSFORM_POS_MAX,
  TRANSFORM_POS_MIN,
  TRANSFORM_ROT_DEFAULT,
  TRANSFORM_ROT_MAX,
  TRANSFORM_ROT_MIN,
  TRANSFORM_ZOOM_DEFAULT,
  TRANSFORM_ZOOM_MAX,
  TRANSFORM_ZOOM_MIN,
  TRANSITION_DURATION_DEFAULT_S,
  TRANSITION_DURATION_MAX_S,
  TRANSITION_DURATION_MIN_S,
  addMarkerInDocument,
  appendStillBounded,
  cloneTimelineDoc,
  collectSnapTargets,
  clampSplitWipePercent,
  compileAudioFilterClient,
  compileAutoDuckFilterClient,
  compileFairlightAudioFilterClient,
  compileRetimeFilterClient,
  compileTransitionFilterClient,
  computeInOutRangeMetrics,
  computeSplitWipePercentFromPointer,
  computeTimelineMaxFrame,
  createStillRecord,
  deleteMarkerInDocument,
  evaluateTimelineAudioLevels,
  findAdjacentCutForClip,
  findClipIndex,
  findMagneticSnap,
  findTrackAndClip,
  formatFfmetadataFromMarkers,
  formatRetimeBadgeText,
  formatShuttleSpeedLabel,
  formatTransformBadgeText,
  formatYoutubeChaptersFromMarkers,
  getAspectRatioPreset,
  getClipTrimBounds,
  getTransformPresetClient,
  getTransitionPresetName,
  hasSplittableClipAtFrame,
  isClipTransformIdentity,
  isPointerOnSplitWipeDivider,
  isTrackAudiblyMuted,
  normalizeAutoDuckParams,
  normalizeClipAudio,
  normalizeClipRetime,
  normalizeClipTransform,
  normalizeClipTransition,
  normalizeFairlightAudioParams,
  normalizeInOutRange,
  normalizeMarkerColor,
  removeStillById,
  rippleDeleteClipInDocument,
  sanitizeStillDataUrl,
  setInOutRange,
  splitClipInDocument,
  splitClipsAtPlayhead,
  stepPlayheadInRange,
  stepShuttleSpeed,
  timelineDocToChapterInputs,
  toggleTrackMuteInDocument,
  toggleTrackSoloInDocument,
  trimClipInDocument,
  updateClipAudioInDocument,
  updateClipRetimeInDocument,
  updateClipTransformInDocument,
  updateClipTransitionInDocument,
  updateMarkerInDocument,
  validateTimelineClient
} from "./timeline_ops.js";

const api = createApiClient();

const COLOR_GRADE_PRESETS = {
  rec709_clean: {
    id: "rec709_clean",
    name: "Rec.709 Clean",
    params: {
      lift: [0.0, 0.0, 0.0],
      gamma: [0.0, 0.0, 0.0],
      gain: [0.0, 0.0, 0.0],
      contrast: 1.0,
      saturation: 1.0,
      temperature: 0.0
    }
  },
  teal_orange: {
    id: "teal_orange",
    name: "Teal & Orange",
    params: {
      lift: [-0.14, 0.02, 0.16],
      gamma: [0.04, 0.0, -0.04],
      gain: [0.14, 0.04, -0.14],
      contrast: 1.14,
      saturation: 1.18,
      temperature: 0.12
    }
  },
  film_warm: {
    id: "film_warm",
    name: "Film Warm",
    params: {
      lift: [0.02, 0.01, -0.03],
      gamma: [0.06, 0.02, -0.06],
      gain: [0.10, 0.04, -0.10],
      contrast: 1.08,
      saturation: 1.10,
      temperature: 0.28
    }
  },
  noir_bw: {
    id: "noir_bw",
    name: "Noir B&W",
    params: {
      lift: [-0.04, -0.04, -0.02],
      gamma: [-0.03, -0.03, -0.03],
      gain: [0.06, 0.06, 0.08],
      contrast: 1.32,
      saturation: 0.0,
      temperature: -0.10
    }
  }
};

function cloneGradeParams(p) {
  return {
    lift: [...p.lift],
    gamma: [...p.gamma],
    gain: [...p.gain],
    contrast: Number(p.contrast),
    saturation: Number(p.saturation),
    temperature: Number(p.temperature)
  };
}

const TITLE_PRESETS_FALLBACK = {
  broadcast_lower_third: {
    id: "broadcast_lower_third",
    name: "Broadcast Lower-Third",
    params: {
      preset_id: "broadcast_lower_third",
      title: "ALEXANDRE MOREAU",
      subtitle: "Lead Colorist | Studio Paris",
      position: "bottom-left",
      accent_color: "#e68442",
      start_s: 0.5,
      end_s: 5.5,
      font_size: 34,
      box_opacity: 0.82,
      enabled: true
    }
  },
  center_title_card: {
    id: "center_title_card",
    name: "Center Title Card",
    params: {
      preset_id: "center_title_card",
      title: "ECLIPSE SHOWREEL 2026",
      subtitle: "REC.709 BROADCAST MASTER",
      position: "center",
      accent_color: "#689cff",
      start_s: 0.0,
      end_s: 4.0,
      font_size: 48,
      box_opacity: 0.80,
      enabled: true
    }
  },
  minimal_subtitle: {
    id: "minimal_subtitle",
    name: "Minimal Subtitle",
    params: {
      preset_id: "minimal_subtitle",
      title: "Clean-room timeline interchange",
      subtitle: "",
      position: "bottom-center",
      accent_color: "#d8d8de",
      start_s: 1.0,
      end_s: 6.0,
      font_size: 26,
      box_opacity: 0.72,
      enabled: true
    }
  }
};

function cloneTitleParams(p) {
  return {
    preset_id: p.preset_id || "broadcast_lower_third",
    title: String(p.title ?? ""),
    subtitle: String(p.subtitle ?? ""),
    position: p.position || "bottom-left",
    accent_color: p.accent_color || "#e68442",
    start_s: Number(p.start_s ?? 0.5),
    end_s: Number(p.end_s ?? 5.5),
    font_size: Number(p.font_size ?? 34),
    box_opacity: Number(p.box_opacity ?? 0.82),
    enabled: p.enabled !== false
  };
}

const state = {
  lang: "en",
  activeTab: "timeline",
  timelineDoc: null,
  timelineValidation: null,
  timelineHitboxes: [],
  timelineFrameToX: null,
  timelineXToFrame: null,
  timelineXToRawFrame: null,
  timelinePxPerFrame: 0,
  timelineStartFrame: 0,
  timelineRulerHeight: 36,
  timelineLabelColW: 118,
  timelineSelected: null,
  timelineZoom: 1,
  timelineTool: "select",
  timelineSnapEnabled: true,
  timelineActiveSnapFrame: null,
  timelineActiveSnapKind: null,
  markerNewColor: "Cyan",
  bpmGrid: {
    enabled: false,
    bpm: BPM_DEFAULT,
    offset_s: 0.0
  },
  timelineBladePreview: null,
  timelineHoverTrim: null,
  timelineActiveTrim: null,
  timelineHoverFade: null,
  timelineActiveFade: null,
  timelineHoverTransition: null,
  timelineDragFixedMaxFrame: null,
  timelineUndoStack: [],
  timelineRedoStack: [],
  playheadFrame: 25,
  timelineMaxFrame: 500,
  ioRange: { in_frame: null, out_frame: null },
  ioLoopEnabled: false,
  playbackSpeed: 0,
  playbackRafId: null,
  playbackLastTs: 0,
  playbackAccumFrames: 0,
  autoDuck: {
    enabled: false,
    threshold_db: AUTO_DUCK_THRESHOLD_DB_DEFAULT,
    ratio: AUTO_DUCK_RATIO_DEFAULT,
    attack_ms: AUTO_DUCK_ATTACK_MS_DEFAULT,
    release_ms: AUTO_DUCK_RELEASE_MS_DEFAULT
  },
  fairlight: {
    loudness_preset: "youtube_14",
    dialogue_eq: "off"
  },
  vuMeter: {
    leftDb: -60,
    rightDb: -60,
    holdL: -60,
    holdR: -60,
    holdAgeL: 0,
    holdAgeR: 0,
    duckReductionDb: 0,
    allMuted: false,
    decayRafId: null,
    lastTs: 0
  },
  colorGrade: cloneGradeParams(COLOR_GRADE_PRESETS.rec709_clean.params),
  colorActivePresetId: "rec709_clean",
  colorScopeMode: "parade",
  colorPresetsCatalog: null,
  colorLastCompile: null,
  colorCompileTimer: null,
  colorCompileSeq: 0,
  wipeRatio: 0.5,
  colorSplitWipe: {
    enabled: true,
    positionPct: SPLIT_WIPE_POS_DEFAULT,
    isHovered: false,
    isDragging: false
  },
  fxSplitWipe: {
    enabled: false,
    positionPct: SPLIT_WIPE_POS_DEFAULT,
    isHovered: false,
    isDragging: false
  },
  stillsGallery: [],
  stillSeqCounter: 0,
  lastBakedCubePath: "",
  lastRenderCommand: "",
  lastRenderOutputPath: "",
  lastQaReport: null,
  updateInfo: null,
  fxSpecs: null,
  fxPresets: null,
  fxStack: [],
  fxBypassAll: false,
  fxActivePresetId: "",
  fxLastCompile: null,
  fxCompileTimer: null,
  chromaKey: {
    enabled: false,
    preset: "studio_green",
    key_color: "#00b140",
    similarity: 0.18,
    blend: 0.08,
    despill: true,
    despill_type: "green",
    matteView: "final"
  },
  chromaKeyPresetsCatalog: null,
  titleOverlay: cloneTitleParams(TITLE_PRESETS_FALLBACK.broadcast_lower_third.params),
  titlePresetsCatalog: null,
  titleLastCompile: null,
  titleCompileTimer: null,
  titleCompileSeq: 0,
  subtitleTrack: {
    enabled: true,
    style: "clean_white",
    font_size: 34,
    margin_bottom_pct: 0.08,
    cues: [
      { index: 1, start_s: 0.5, end_s: 2.8, text: "Clean-room OpenTimelineIO interchange" },
      { index: 2, start_s: 3.2, end_s: 6.4, text: "Rec.709 color science and broadcast QA" },
      { index: 3, start_s: 7.0, end_s: 10.5, text: "Deterministic FFmpeg NVENC delivery" }
    ]
  },
  subtitleLastCompile: null,
  subtitleCompileTimer: null,
  transitionPresetsCatalog: null,
  framing: {
    preset: "16:9",
    mode: "fill",
    safeGuides: false,
    guides: {
      actionSafe: true,
      titleSafe: true,
      socialHud: true
    }
  },
  deliveryPresetsCatalog: null,
  activeDeliveryPresetId: null,
  renderConfig: {
    targetWidth: 1920,
    targetHeight: 1080,
    encoderPreset: "medium"
  },
  renderEngine: "local",
  remotePollTimer: null
};

function byId(id) {
  return document.getElementById(id);
}

function dom(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function t(key) {
  const table = TRANSLATIONS[state.lang] || TRANSLATIONS.en;
  return table[key] || TRANSLATIONS.en[key] || key;
}

function showBanner(message, kind = "info") {
  const banner = byId("status-banner");
  const textEl = byId("status-banner-text");
  textEl.textContent = message;
  banner.classList.remove("is-hidden", "is-error", "is-success");
  if (kind === "error") banner.classList.add("is-error");
  if (kind === "success") banner.classList.add("is-success");
}

function hideBanner() {
  byId("status-banner").classList.add("is-hidden");
}

function renderKv(container, pairs) {
  const nodes = [];
  for (const [k, v] of pairs) {
    nodes.push(dom("span", "kv-key", k));
    nodes.push(dom("span", "kv-val", v));
  }
  container.replaceChildren(...nodes);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = dom("a", "is-hidden");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setLanguage(lang) {
  state.lang = lang === "fr" ? "fr" : "en";
  try {
    window.localStorage.setItem("taktcut.lang", state.lang);
  } catch {
    // Ignore storage restrictions
  }
  byId("lang-en").classList.toggle("is-active", state.lang === "en");
  byId("lang-fr").classList.toggle("is-active", state.lang === "fr");

  for (const node of document.querySelectorAll("[data-i18n]")) {
    const key = node.getAttribute("data-i18n");
    if (key) node.textContent = t(key);
  }
  const helpBtn = byId("btn-shortcuts-help");
  if (helpBtn) {
    const tip = t("shortcuts.helpTooltip");
    helpBtn.title = tip;
    helpBtn.setAttribute("aria-label", tip);
  }
  for (const grabId of ["btn-color-grab-still", "btn-fx-grab-still"]) {
    const grabBtn = byId(grabId);
    if (grabBtn) {
      grabBtn.title = t("stills.btn.grabTitle");
    }
  }
  const wmInput = byId("render-watermark-text");
  if (wmInput) {
    wmInput.placeholder = t("render.watermark.placeholder");
  }
  updateTransportStatusUI();
  updateIoRangeUI();
  renderShortcutsDialog();
  renderStillsGallery();
  renderUpdateButton();
  renderTimelineUI();
  renderFairlightAudioUI();
  renderFxStack();
  renderDeliveryPresetStrip();
  updateTitleTimingBadges();
  updateSubtitleTimingBadges();
  if (state.fxLastCompile) renderFxCompileResult(state.fxLastCompile);
  if (state.titleLastCompile) renderTitleCompileResult(state.titleLastCompile);
  if (state.subtitleLastCompile) renderSubtitleCompileResult(state.subtitleLastCompile);
  if (state.lastQaReport) renderQaReport(state.lastQaReport);
  redrawActiveCanvases();
}

function renderUpdateButton() {
  const btn = byId("update-banner-btn");
  if (!btn) return;
  const info = state.updateInfo;
  if (!info || !info.update_available || !info.latest_version) {
    btn.classList.add("is-hidden");
    btn.textContent = "";
    return;
  }
  btn.textContent = t("update.available").replace("{version}", info.latest_version);
  btn.title = info.release_url || `v${info.latest_version}`;
  btn.classList.remove("is-hidden");
}

async function checkForStudioUpdate() {
  try {
    const info = await api.checkForUpdate();
    state.updateInfo = info;
    renderUpdateButton();
  } catch {
    // Fail-safe offline: keep update button hidden
  }
}

async function applyStudioUpdate() {
  const btn = byId("update-banner-btn");
  if (!btn || !state.updateInfo || !state.updateInfo.update_available) return;
  btn.disabled = true;
  btn.textContent = t("update.applying");
  try {
    const res = await api.applyUpdate();
    if (res.applied) {
      const ver = res.target_version || state.updateInfo.latest_version;
      showBanner(t("update.restarting").replace("{version}", ver), "success");
      return;
    }
    showBanner(res.message || "Update unavailable in current runtime.", "info");
  } catch (err) {
    showBanner(err.message, "error");
  } finally {
    btn.disabled = false;
    renderUpdateButton();
  }
}

function switchTab(tabName) {
  if (tabName !== "timeline" && tabName !== "fx" && tabName !== "titles" && state.playbackSpeed !== 0) {
    stopPlayback();
  }
  state.activeTab = tabName;
  for (const btn of document.querySelectorAll(".page-tab")) {
    const isMatch = btn.getAttribute("data-tab") === tabName;
    btn.classList.toggle("is-active", isMatch);
    btn.setAttribute("aria-selected", isMatch ? "true" : "false");
  }
  for (const panel of document.querySelectorAll(".workspace-panel")) {
    const isMatch = panel.id === `panel-${tabName}`;
    panel.classList.toggle("is-hidden", !isMatch);
  }
  window.requestAnimationFrame(redrawActiveCanvases);
}

function getEffectiveFxState() {
  return {
    bypassAll: state.fxBypassAll,
    nodes: state.fxStack
  };
}

function getEffectiveChromaKeyState() {
  return {
    ...state.chromaKey
  };
}

function getEffectiveTitleState(showBadge = false) {
  return {
    ...state.titleOverlay,
    showBadge
  };
}

function getEffectiveSubtitleState(showBadge = false) {
  return {
    ...state.subtitleTrack,
    showBadge
  };
}

function getEffectiveFramingState() {
  return {
    aspectPreset: state.framing.preset,
    framingMode: state.framing.mode,
    guides: {
      enabled: state.framing.safeGuides,
      actionSafe: state.framing.guides.actionSafe,
      titleSafe: state.framing.guides.titleSafe,
      socialHud: state.framing.guides.socialHud
    }
  };
}

function syncFramingControlsUI() {
  const spec = getAspectRatioPreset(state.framing.preset);
  const progAspect = byId("program-aspect-select");
  const progMode = byId("program-framing-mode");
  const renderAspect = byId("render-aspect-preset");
  const renderMode = byId("render-framing-mode");
  if (progAspect && progAspect.value !== spec.id) progAspect.value = spec.id;
  if (progMode && progMode.value !== state.framing.mode) progMode.value = state.framing.mode;
  if (renderAspect && renderAspect.value !== spec.id) renderAspect.value = spec.id;
  if (renderMode && renderMode.value !== state.framing.mode) renderMode.value = state.framing.mode;

  const badge = byId("program-framing-badge");
  if (badge) {
    const modeTag = state.framing.mode === "fit" ? "FIT" : "FILL";
    badge.textContent = `${spec.width}x${spec.height} ${modeTag}`;
    badge.className = `nle-tag mono${spec.id !== "16:9" || state.framing.mode !== "fill" ? " is-active" : ""}`;
  }

  const safeBtn = byId("btn-safe-guides");
  if (safeBtn) {
    safeBtn.classList.toggle("is-active", state.framing.safeGuides);
    safeBtn.setAttribute("aria-pressed", state.framing.safeGuides ? "true" : "false");
  }
  for (const chip of document.querySelectorAll("[data-safe-guide]")) {
    const key = chip.getAttribute("data-safe-guide");
    const active = Boolean(key && state.framing.guides[key]);
    chip.classList.toggle("is-active", active);
    chip.classList.toggle("is-dimmed", !state.framing.safeGuides);
    chip.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function updatePlayheadReadout() {
  const doc = state.timelineDoc;
  const fpsNum = doc ? doc.fps.num : 25;
  const fpsDen = doc ? doc.fps.den : 1;
  const smpte = framesToSmpte(state.playheadFrame, fpsNum, fpsDen);
  byId("program-tc").textContent = smpte;
  byId("program-frame-counter").textContent = `${state.playheadFrame}f / ${state.timelineMaxFrame}f`;
  byId("playhead-slider").max = String(Math.max(1, state.timelineMaxFrame));
  byId("playhead-slider").value = String(state.playheadFrame);

  const fxTc = byId("fx-program-tc");
  const fxSlider = byId("fx-playhead-slider");
  if (fxTc) fxTc.textContent = smpte;
  if (fxSlider) {
    fxSlider.max = String(Math.max(1, state.timelineMaxFrame));
    fxSlider.value = String(state.playheadFrame);
  }

  const titlesTc = byId("titles-program-tc");
  const titlesSlider = byId("titles-playhead-slider");
  const titlesCounter = byId("titles-frame-counter");
  if (titlesTc) titlesTc.textContent = smpte;
  if (titlesSlider) {
    titlesSlider.max = String(Math.max(1, state.timelineMaxFrame));
    titlesSlider.value = String(state.playheadFrame);
  }
  if (titlesCounter) {
    titlesCounter.textContent = `${state.playheadFrame}f / ${state.timelineMaxFrame}f`;
  }
  updateTitleTimingBadges();
  updateSubtitleTimingBadges();
}

function redrawActiveCanvases() {
  if (state.activeTab === "timeline") {
    drawProgramMonitorCanvas(
      byId("timeline-program-canvas"),
      state.timelineDoc,
      state.playheadFrame,
      state.colorGrade,
      getEffectiveFxState(),
      getEffectiveTitleState(false),
      getEffectiveFramingState(),
      getEffectiveSubtitleState(false)
    );
    const tlDraw = drawTimelineCanvas(
      byId("timeline-canvas"),
      state.timelineDoc,
      state.timelineValidation,
      {
        zoom: state.timelineZoom,
        selected: state.timelineSelected,
        playheadFrame: state.playheadFrame,
        tool: state.timelineTool,
        snapGuideFrame: state.timelineActiveSnapFrame,
        snapGuideKind: state.timelineActiveSnapKind,
        bpmGrid: state.bpmGrid,
        bladePreview: state.timelineBladePreview,
        hoverTrim: state.timelineHoverTrim,
        activeTrim: state.timelineActiveTrim,
        hoverFade: state.timelineHoverFade,
        activeFade: state.timelineActiveFade,
        hoverTransition: state.timelineHoverTransition,
        fixedMaxFrame: state.timelineDragFixedMaxFrame,
        ioRange: state.ioRange
      }
    );
    state.timelineHitboxes = tlDraw.hitboxes;
    state.timelineFrameToX = tlDraw.frameToX;
    state.timelineXToFrame = tlDraw.xToFrame;
    state.timelineXToRawFrame = tlDraw.xToRawFrame;
    state.timelinePxPerFrame = tlDraw.pxPerFrame;
    state.timelineStartFrame = tlDraw.startFrame;
    state.timelineRulerHeight = tlDraw.rulerHeight;
    state.timelineLabelColW = tlDraw.labelColW;
    drawStereoVuMeterCanvas(byId("timeline-vu-meter"), {
      leftDb: state.vuMeter.leftDb,
      rightDb: state.vuMeter.rightDb,
      holdL: state.vuMeter.holdL,
      holdR: state.vuMeter.holdR,
      allMuted: state.vuMeter.allMuted,
      duckEnabled: Boolean(state.autoDuck.enabled),
      duckThresholdDb: state.autoDuck.threshold_db
    });
  } else if (state.activeTab === "fx") {
    drawProgramMonitorCanvas(
      byId("fx-program-canvas"),
      state.timelineDoc,
      state.playheadFrame,
      state.colorGrade,
      getEffectiveFxState(),
      getEffectiveTitleState(false),
      getEffectiveFramingState(),
      getEffectiveSubtitleState(false),
      getEffectiveChromaKeyState(),
      {
        enabled: Boolean(state.fxSplitWipe.enabled),
        positionPct: state.fxSplitWipe.positionPct,
        isHovered: Boolean(state.fxSplitWipe.isHovered),
        isDragging: Boolean(state.fxSplitWipe.isDragging),
        beforeLabel: t("wipe.pill.before"),
        afterLabel: t("wipe.pill.after")
      }
    );
    redrawFxKeyframeCanvases();
  } else if (state.activeTab === "titles") {
    drawProgramMonitorCanvas(
      byId("titles-program-canvas"),
      state.timelineDoc,
      state.playheadFrame,
      state.colorGrade,
      getEffectiveFxState(),
      getEffectiveTitleState(true),
      getEffectiveFramingState(),
      getEffectiveSubtitleState(true)
    );
  } else if (state.activeTab === "color") {
    const previewCanvas = byId("color-preview-canvas");
    drawColorPreviewCanvas(previewCanvas, state.colorGrade, state.wipeRatio, {
      enabled: Boolean(state.colorSplitWipe.enabled),
      positionPct: state.colorSplitWipe.positionPct,
      isHovered: Boolean(state.colorSplitWipe.isHovered),
      isDragging: Boolean(state.colorSplitWipe.isDragging),
      beforeLabel: t("wipe.pill.before"),
      afterLabel: t("wipe.pill.after")
    });
    drawColorScopeCanvas(
      byId("color-scope-canvas"),
      state.colorGrade,
      state.colorScopeMode,
      previewCanvas
    );
    drawColorWheel(byId("wheel-lift"), "lift", state.colorGrade.lift);
    drawColorWheel(byId("wheel-gamma"), "gamma", state.colorGrade.gamma);
    drawColorWheel(byId("wheel-gain"), "gain", state.colorGrade.gain);
  } else if (state.activeTab === "qa" && state.lastQaReport) {
    drawLoudnessCanvas(byId("qa-loudness-canvas"), state.lastQaReport.loudness);
    drawFramesCanvas(byId("qa-frames-canvas"), state.lastQaReport.frame_samples);
  }
}

/* PAGE 1: TIMELINE */
function setTimelineData(payload) {
  stopPlayback();
  state.timelineDoc = payload.document;
  state.timelineValidation = payload.validation;
  state.timelineSelected = null;
  state.timelineUndoStack = [];
  state.timelineRedoStack = [];
  state.timelineActiveSnapFrame = null;
  state.timelineActiveSnapKind = null;
  state.timelineBladePreview = null;
  state.timelineHoverTrim = null;
  state.timelineActiveTrim = null;
  state.timelineHoverFade = null;
  state.timelineActiveFade = null;
  state.timelineHoverTransition = null;
  state.timelineDragFixedMaxFrame = null;
  state.ioRange = { in_frame: null, out_frame: null };
  state.ioLoopEnabled = false;

  const doc = state.timelineDoc;
  if (doc) {
    state.timelineMaxFrame = computeTimelineMaxFrame(doc);
    state.playheadFrame = Math.min(state.playheadFrame, state.timelineMaxFrame);

    let firstClip = null;
    let activeAtPlayhead = null;
    for (const trk of doc.tracks || []) {
      for (const c of trk.clips || []) {
        if (!firstClip) firstClip = c;
        if (
          !activeAtPlayhead &&
          trk.kind === "video" &&
          state.playheadFrame >= c.start_frame &&
          state.playheadFrame < c.start_frame + c.duration_frames
        ) {
          activeAtPlayhead = c;
        }
      }
    }
    if (activeAtPlayhead || firstClip) {
      state.timelineSelected = { kind: "clip", data: activeAtPlayhead || firstClip };
    }

    const cleanStem = (doc.name || "timeline").replace(/[^A-Za-z0-9._-]/g, "_");
    const fmt = byId("otio-format-select").value;
    byId("otio-workspace-out").value = `exports/${cleanStem}.${fmt}`;
  }
  updateTimelineToolbarUI();
  updateIoRangeUI();
  renderTimelineUI();
}

function renderTimelineUI() {
  const doc = state.timelineDoc;
  const val = state.timelineValidation;
  const pill = byId("timeline-validation-pill");

  if (!doc) {
    byId("topbar-project-name").textContent = "taktcut";
    byId("topbar-seq-meta").textContent = "--";
    byId("tl-meta-name").textContent = "--";
    byId("tl-meta-format").textContent = "--";
    byId("tl-meta-fps").textContent = "--";
    byId("tl-meta-res").textContent = "--";
    byId("tl-meta-dur").textContent = "--";
    byId("tl-meta-counts").textContent = "--";
    pill.textContent = "--";
    pill.className = "nle-tag mono";
    byId("timeline-selection-detail").replaceChildren(
      dom("span", "kv-val", t("timeline.empty.selection"))
    );
    const rippleBtn = byId("btn-clip-ripple-delete");
    if (rippleBtn) rippleBtn.disabled = true;
    byId("timeline-issues-list").replaceChildren();
    renderDeliverChaptersPreview();
    return;
  }

  let maxEnd = doc.start_frame || 0;
  let clipCount = 0;
  for (const trk of doc.tracks || []) {
    for (const c of trk.clips || []) {
      clipCount += 1;
      if (c.start_frame + c.duration_frames > maxEnd) {
        maxEnd = c.start_frame + c.duration_frames;
      }
    }
  }
  const durFrames = Math.max(0, maxEnd - (doc.start_frame || 0));
  const fpsFloat = doc.fps.num / Math.max(1, doc.fps.den);
  const durSec = (durFrames / fpsFloat).toFixed(2);
  const fpsStr = doc.fps.den === 1 ? String(doc.fps.num) : `${doc.fps.num}/${doc.fps.den}`;

  byId("topbar-project-name").textContent = doc.name;
  byId("topbar-seq-meta").textContent = `${fpsStr}fps | ${doc.width}x${doc.height} | ${durFrames}f`;

  byId("tl-meta-name").textContent = doc.name;
  byId("tl-meta-format").textContent = doc.source_format.toUpperCase();
  byId("tl-meta-fps").textContent = `${fpsStr} (${fpsFloat.toFixed(3)})`;
  byId("tl-meta-res").textContent = `${doc.width}x${doc.height}`;
  byId("tl-meta-dur").textContent = `${durFrames}f (${durSec}s)`;
  byId("tl-meta-counts").textContent = `${doc.tracks.length}T / ${clipCount}C`;

  if (val) {
    pill.textContent = val.valid
      ? `${t("common.pass")} (0 issues)`
      : `${t("common.fail")} (${val.issues.length} issues)`;
    pill.className = val.valid ? "nle-tag is-pass mono" : "nle-tag is-fail mono";
  }

  updatePlayheadReadout();
  updateTimelineToolbarUI();
  renderTimelineSelection();
  renderTimelineIssues();
  renderDeliverChaptersPreview();
  if (state.activeTab === "timeline") {
    redrawActiveCanvases();
  }
}

function getSelectedClipTrack() {
  const doc = state.timelineDoc;
  const sel = state.timelineSelected;
  if (!doc || !sel || (sel.kind !== "clip" && sel.kind !== "transition")) return null;
  const ref = findClipIndex(doc, sel.data);
  if (!ref) return null;
  const found = findTrackAndClip(doc, ref.trackKind, ref.trackIndex, ref.clipIndex);
  if (!found) return null;
  return { ref, trk: found.trk, clip: found.clip };
}

function getSelectedTransitionTarget() {
  const doc = state.timelineDoc;
  const info = getSelectedClipTrack();
  if (!doc || !info) return null;
  return findAdjacentCutForClip(doc, info.ref.trackKind, info.ref.trackIndex, info.ref.clipIndex);
}

function getSelectedClipAudioPayload() {
  const doc = state.timelineDoc;
  const info = getSelectedClipTrack();
  if (!doc || !info) return null;
  const norm = normalizeClipAudio(info.clip);
  const muted = isTrackAudiblyMuted(info.trk, doc.tracks || []);
  const fpsRate = doc.fps ? Math.max(1, doc.fps.num / Math.max(1, doc.fps.den)) : 25;
  const clipDurationS = Math.max(0.04, info.clip.duration_frames / fpsRate);
  const isIdentity =
    !muted &&
    Math.abs(norm.gainDb) < 1e-6 &&
    norm.fadeInS < 1e-6 &&
    norm.fadeOutS < 1e-6;
  return {
    isIdentity,
    clipDurationS,
    audio_params: {
      gain_db: norm.gainDb,
      fade_in_s: norm.fadeInS,
      fade_out_s: norm.fadeOutS,
      muted
    }
  };
}

function getSelectedClipRetimePayload() {
  const doc = state.timelineDoc;
  const info = getSelectedClipTrack();
  if (!doc || !info) return null;
  const norm = normalizeClipRetime(info.clip);
  const isIdentity = !norm.reverse && Math.abs(norm.speedRate - 1.0) <= 1e-6;
  return {
    isIdentity,
    retime_params: {
      speed_rate: norm.speedRate,
      reverse: norm.reverse
    }
  };
}

function getSelectedClipTransformPayload() {
  const doc = state.timelineDoc;
  const info = getSelectedClipTrack();
  if (!doc || !info) return null;
  const norm = normalizeClipTransform(info.clip);
  const isIdentity = isClipTransformIdentity(norm);
  return {
    isIdentity,
    transform_params: norm
  };
}

function toggleTrackMuteAction(trackKind, trackIndex) {
  if (!state.timelineDoc) return;
  const res = toggleTrackMuteInDocument(state.timelineDoc, trackKind, trackIndex);
  if (!res.changed) return;
  let nextSel = state.timelineSelected;
  if (nextSel && nextSel.kind === "clip") {
    const ref = findClipIndex(state.timelineDoc, nextSel.data);
    if (ref) {
      const found = findTrackAndClip(res.doc, ref.trackKind, ref.trackIndex, ref.clipIndex);
      if (found) nextSel = { kind: "clip", data: found.clip };
    }
  }
  commitTimelineMutation(res.doc, nextSel);
}

function toggleTrackSoloAction(trackKind, trackIndex) {
  if (!state.timelineDoc) return;
  const res = toggleTrackSoloInDocument(state.timelineDoc, trackKind, trackIndex);
  if (!res.changed) return;
  let nextSel = state.timelineSelected;
  if (nextSel && nextSel.kind === "clip") {
    const ref = findClipIndex(state.timelineDoc, nextSel.data);
    if (ref) {
      const found = findTrackAndClip(res.doc, ref.trackKind, ref.trackIndex, ref.clipIndex);
      if (found) nextSel = { kind: "clip", data: found.clip };
    }
  }
  commitTimelineMutation(res.doc, nextSel);
}

function renderTimelineAudioInspector() {
  const ctrlGrid = byId("clip-audio-controls");
  const afBadge = byId("clip-audio-af-preview");
  const sendBtn = byId("btn-clip-audio-to-deliver");
  const mixerStrip = byId("track-mixer-strip");
  const mixerSummary = byId("track-mixer-summary");
  const gainRange = byId("clip-audio-gain-range");
  const gainNum = byId("clip-audio-gain-num");
  const fadeInRange = byId("clip-fade-in-range");
  const fadeInNum = byId("clip-fade-in-num");
  const fadeOutRange = byId("clip-fade-out-range");
  const fadeOutNum = byId("clip-fade-out-num");
  const rstGain = byId("btn-clip-gain-reset");
  const rstIn = byId("btn-clip-fade-in-reset");
  const rstOut = byId("btn-clip-fade-out-reset");

  if (!ctrlGrid || !mixerStrip) return;

  const doc = state.timelineDoc;
  const tracks = doc && Array.isArray(doc.tracks) ? doc.tracks : [];
  const anySolo = tracks.some((t) => Boolean(t && t.solo));
  const mutedCount = tracks.filter((t) => Boolean(t && t.muted)).length;

  if (mixerSummary) {
    if (anySolo) {
      mixerSummary.textContent = "SOLO ACTIVE";
      mixerSummary.className = "nle-tag mono is-warn";
    } else if (mutedCount > 0) {
      mixerSummary.textContent = `${mutedCount} MUTED`;
      mixerSummary.className = "nle-tag mono is-fail";
    } else {
      mixerSummary.textContent = "ALL ACTIVE";
      mixerSummary.className = "nle-tag mono";
    }
  }

  const mixerPills = tracks.map((trk) => {
    const code = `${trk.kind === "audio" ? "A" : "V"}${trk.index}`;
    const effMuted = isTrackAudiblyMuted(trk, tracks);
    const pill = dom("div", `mixer-ch-pill${effMuted ? " is-muted-effective" : ""}`);
    const tag = dom("span", `mixer-ch-tag mono ${trk.kind === "audio" ? "is-audio" : "is-video"}`, code);

    const mBtn = dom("button", `mixer-btn${trk.muted ? " is-mute" : ""}`, "M");
    mBtn.type = "button";
    mBtn.setAttribute("aria-pressed", trk.muted ? "true" : "false");
    mBtn.setAttribute("aria-label", `Mute track ${code}`);
    mBtn.setAttribute("data-track-mute", code);
    mBtn.addEventListener("click", () => toggleTrackMuteAction(trk.kind, trk.index));

    const sBtn = dom("button", `mixer-btn${trk.solo ? " is-solo" : ""}`, "S");
    sBtn.type = "button";
    sBtn.setAttribute("aria-pressed", trk.solo ? "true" : "false");
    sBtn.setAttribute("aria-label", `Solo track ${code}`);
    sBtn.setAttribute("data-track-solo", code);
    sBtn.addEventListener("click", () => toggleTrackSoloAction(trk.kind, trk.index));

    pill.replaceChildren(tag, mBtn, sBtn);
    return pill;
  });
  mixerStrip.replaceChildren(...mixerPills);

  const info = getSelectedClipTrack();
  const hasClip = Boolean(info);
  ctrlGrid.classList.toggle("is-disabled", !hasClip);
  for (const el of [gainRange, gainNum, fadeInRange, fadeInNum, fadeOutRange, fadeOutNum, rstGain, rstIn, rstOut, sendBtn]) {
    if (el) el.disabled = !hasClip;
  }

  if (!info) {
    if (gainRange) gainRange.value = "0";
    if (gainNum && document.activeElement !== gainNum) gainNum.value = "0.0";
    if (fadeInRange) fadeInRange.value = "0";
    if (fadeInNum && document.activeElement !== fadeInNum) fadeInNum.value = "0.00";
    if (fadeOutRange) fadeOutRange.value = "0";
    if (fadeOutNum && document.activeElement !== fadeOutNum) fadeOutNum.value = "0.00";
    if (afBadge) {
      afBadge.textContent = "NO CLIP";
      afBadge.className = "nle-tag mono";
    }
    renderAutoDuckInspector();
    updateVuMeterInstant(performance.now(), state.playbackSpeed !== 0);
    return;
  }

  const norm = normalizeClipAudio(info.clip);
  if (gainRange) gainRange.value = String(norm.gainDb);
  if (gainNum && document.activeElement !== gainNum) gainNum.value = norm.gainDb.toFixed(1);
  if (fadeInRange) fadeInRange.value = String(norm.fadeInS);
  if (fadeInNum && document.activeElement !== fadeInNum) fadeInNum.value = norm.fadeInS.toFixed(2);
  if (fadeOutRange) fadeOutRange.value = String(norm.fadeOutS);
  if (fadeOutNum && document.activeElement !== fadeOutNum) fadeOutNum.value = norm.fadeOutS.toFixed(2);

  const payload = getSelectedClipAudioPayload();
  if (afBadge && payload) {
    const compiled = compileAudioFilterClient(payload.audio_params, payload.clipDurationS, null);
    if (payload.audio_params.muted) {
      afBadge.textContent = "volume=0 (MUTED)";
      afBadge.className = "nle-tag mono is-fail";
    } else if (compiled.filtergraph) {
      afBadge.textContent = compiled.filtergraph;
      afBadge.className = "nle-tag mono is-pass";
    } else {
      afBadge.textContent = "UNITY 0.0 dB";
      afBadge.className = "nle-tag mono";
    }
  }
  renderAutoDuckInspector();
  renderFairlightAudioUI();
  updateVuMeterInstant(performance.now(), state.playbackSpeed !== 0);
}

function renderAutoDuckInspector() {
  const duck = normalizeAutoDuckParams(state.autoDuck);
  state.autoDuck = duck;

  const toggleBtn = byId("btn-auto-duck-toggle");
  const badge = byId("auto-duck-badge");
  const ctrlBox = byId("auto-duck-controls");
  const threshRange = byId("auto-duck-threshold-range");
  const threshNum = byId("auto-duck-threshold-num");
  const ratioNum = byId("auto-duck-ratio-num");
  const attackNum = byId("auto-duck-attack-num");
  const releaseNum = byId("auto-duck-release-num");
  const fgPreview = byId("auto-duck-fg-preview");

  if (toggleBtn) {
    toggleBtn.textContent = duck.enabled ? t("timeline.duck.on") : t("timeline.duck.off");
    toggleBtn.setAttribute("aria-pressed", duck.enabled ? "true" : "false");
    toggleBtn.classList.toggle("is-active", duck.enabled);
  }
  if (ctrlBox) {
    ctrlBox.classList.toggle("is-dimmed", !duck.enabled);
  }
  if (threshRange) threshRange.value = String(duck.threshold_db);
  if (threshNum && document.activeElement !== threshNum) {
    threshNum.value = String(Math.round(duck.threshold_db));
  }
  if (ratioNum && document.activeElement !== ratioNum) {
    ratioNum.value = duck.ratio.toFixed(1);
  }
  if (attackNum && document.activeElement !== attackNum) {
    attackNum.value = String(Math.round(duck.attack_ms));
  }
  if (releaseNum && document.activeElement !== releaseNum) {
    releaseNum.value = String(Math.round(duck.release_ms));
  }

  const compiled = compileAutoDuckFilterClient(duck, { mix_sidechain: true });
  if (badge) {
    if (!duck.enabled) {
      badge.textContent = `${Math.round(duck.threshold_db)} dB | ${duck.ratio.toFixed(1)}:1`;
      badge.className = "nle-tag mono";
    } else {
      badge.textContent = `${Math.round(duck.threshold_db)} dB | ${duck.ratio.toFixed(1)}:1`;
      badge.className = "nle-tag mono is-pass";
    }
  }
  if (fgPreview) {
    fgPreview.textContent = duck.enabled ? compiled.filtergraph : t("timeline.duck.bypassed");
  }
}

function renderFairlightAudioUI() {
  const fairlight = normalizeFairlightAudioParams(state.fairlight);
  state.fairlight = fairlight;

  const tlEq = byId("fairlight-dialogue-eq");
  const tlLoud = byId("fairlight-loudness-preset");
  const delEq = byId("render-dialogue-eq");
  const delLoud = byId("render-loudness-preset");
  const statusBadge = byId("fairlight-status-badge");
  const tlPreview = byId("fairlight-af-preview");
  const delPreview = byId("render-audio-af-preview");

  if (tlEq) tlEq.value = fairlight.dialogue_eq;
  if (delEq) delEq.value = fairlight.dialogue_eq;
  if (tlLoud) tlLoud.value = fairlight.loudness_preset;
  if (delLoud) delLoud.value = fairlight.loudness_preset;

  const compiledFairlight = compileFairlightAudioFilterClient(fairlight);
  if (statusBadge) {
    if (compiledFairlight.is_identity) {
      statusBadge.textContent = "BYPASS";
      statusBadge.className = "nle-tag mono";
    } else {
      const tags = [];
      if (fairlight.dialogue_eq !== "off") {
        const eqTags = {
          voice_clarity: "CLARITY",
          podcast_warm: "WARM",
          derumble: "HP100"
        };
        tags.push(eqTags[fairlight.dialogue_eq] || fairlight.dialogue_eq.toUpperCase());
      }
      if (fairlight.loudness_preset !== "off") {
        const lufs = LOUDNESS_PRESET_LUFS[fairlight.loudness_preset];
        tags.push(`${lufs.toFixed(0)} LUFS`);
      }
      statusBadge.textContent = tags.join(" | ");
      statusBadge.className = "nle-tag mono is-pass";
    }
  }

  if (tlPreview) {
    tlPreview.textContent = compiledFairlight.filtergraph
      ? `-af ${compiledFairlight.filtergraph}`
      : t("timeline.fairlight.bypassed");
  }

  if (delPreview) {
    const useClipAudioEl = byId("render-use-clip-audio");
    const clipInfo =
      useClipAudioEl && useClipAudioEl.checked ? getSelectedClipAudioPayload() : null;
    const clipParams = clipInfo ? clipInfo.audio_params : { gain_db: 0, fade_in_s: 0, fade_out_s: 0, muted: false };
    const clipDur = clipInfo ? clipInfo.clipDurationS : null;
    const lufsEl = byId("render-lufs");
    const lufsRaw = lufsEl ? lufsEl.value.trim() : "";
    const parsedLufs = lufsRaw !== "" ? Number.parseFloat(lufsRaw) : null;
    const fallbackLufs =
      fairlight.loudness_preset === "off" && parsedLufs !== null && Number.isFinite(parsedLufs)
        ? parsedLufs
        : null;
    const compiledFull = compileAudioFilterClient(clipParams, clipDur, fallbackLufs, fairlight);
    delPreview.textContent = compiledFull.filtergraph ? `-af ${compiledFull.filtergraph}` : t("common.none");
  }
}

function setFairlightState(patch, opts = {}) {
  const { syncLufs = true, markCustom = true } = opts;
  state.fairlight = normalizeFairlightAudioParams({ ...state.fairlight, ...patch });
  if (syncLufs && Object.hasOwn(patch, "loudness_preset")) {
    const lufsEl = byId("render-lufs");
    if (lufsEl) {
      if (state.fairlight.loudness_preset === "off") {
        lufsEl.value = "";
      } else {
        const presetLufs = LOUDNESS_PRESET_LUFS[state.fairlight.loudness_preset];
        if (Number.isFinite(presetLufs)) {
          lufsEl.value = presetLufs.toFixed(1);
        }
      }
    }
  }
  if (markCustom) markDeliverPresetCustom();
  renderFairlightAudioUI();
}

function renderVuMeterReadout() {
  const vm = state.vuMeter;
  const peakBadge = byId("timeline-vu-peak-badge");
  const duckPill = byId("timeline-vu-duck-pill");
  const peakDb = Math.max(vm.leftDb, vm.rightDb);

  if (peakBadge) {
    if (vm.allMuted) {
      peakBadge.textContent = "MUTED";
      peakBadge.className = "nle-tag mono is-fail";
    } else if (peakDb <= -59.5) {
      peakBadge.textContent = "-inf dBFS";
      peakBadge.className = "nle-tag mono";
    } else {
      peakBadge.textContent = `${peakDb.toFixed(1)} dBFS`;
      peakBadge.className =
        peakDb >= -1.5
          ? "nle-tag mono is-fail"
          : peakDb >= -9.0
            ? "nle-tag mono is-warn"
            : "nle-tag mono is-pass";
    }
  }
  if (duckPill) {
    const showGr = Boolean(state.autoDuck.enabled && vm.duckReductionDb < -0.05 && !vm.allMuted);
    duckPill.classList.toggle("is-hidden", !showGr);
    if (showGr) {
      duckPill.textContent = `GR ${vm.duckReductionDb.toFixed(1)} dB`;
      duckPill.className = "nle-tag mono is-warn";
    }
  }
  if (state.activeTab === "timeline") {
    drawStereoVuMeterCanvas(byId("timeline-vu-meter"), {
      leftDb: vm.leftDb,
      rightDb: vm.rightDb,
      holdL: vm.holdL,
      holdR: vm.holdR,
      allMuted: vm.allMuted,
      duckEnabled: Boolean(state.autoDuck.enabled),
      duckThresholdDb: state.autoDuck.threshold_db
    });
  }
}

function updateVuMeterInstant(ts, isPlaying) {
  const vm = state.vuMeter;
  const dtSec = vm.lastTs > 0 ? Math.min(0.1, Math.max(0.008, (ts - vm.lastTs) / 1000)) : 0.016;
  vm.lastTs = ts;

  const evalRes = evaluateTimelineAudioLevels(state.timelineDoc, state.playheadFrame, {
    isPlaying,
    phaseSec: ts / 1000,
    autoDuck: state.autoDuck
  });
  vm.allMuted = evalRes.allAudioMuted;
  vm.duckReductionDb = evalRes.duckReductionDb;

  const smoothChannel = (curDb, targetDb, holdDb, holdAge) => {
    const attackAlpha = Math.min(1, dtSec * 24);
    const releaseAlpha = Math.min(1, dtSec * 8.5);
    const nextDb =
      targetDb > curDb
        ? curDb + (targetDb - curDb) * attackAlpha
        : curDb + (targetDb - curDb) * releaseAlpha;
    const clampedDb = nextDb < -59.6 && targetDb <= -59.9 ? -60 : Math.max(-60, Math.min(0, nextDb));
    let nextHold = holdDb;
    let nextAge = holdAge + dtSec;
    if (clampedDb >= holdDb) {
      nextHold = clampedDb;
      nextAge = 0;
    } else if (nextAge > 0.65) {
      nextHold = Math.max(clampedDb, holdDb - dtSec * 26);
    }
    return { db: clampedDb, hold: nextHold, age: nextAge };
  };

  const resL = smoothChannel(vm.leftDb, evalRes.leftDb, vm.holdL, vm.holdAgeL);
  const resR = smoothChannel(vm.rightDb, evalRes.rightDb, vm.holdR, vm.holdAgeR);
  vm.leftDb = resL.db;
  vm.holdL = resL.hold;
  vm.holdAgeL = resL.age;
  vm.rightDb = resR.db;
  vm.holdR = resR.hold;
  vm.holdAgeR = resR.age;

  renderVuMeterReadout();
}

function stopVuMeterDecay() {
  if (state.vuMeter.decayRafId !== null) {
    window.cancelAnimationFrame(state.vuMeter.decayRafId);
    state.vuMeter.decayRafId = null;
  }
}

function startVuMeterDecay() {
  stopVuMeterDecay();
  const stepDecay = (ts) => {
    if (state.playbackSpeed !== 0) {
      state.vuMeter.decayRafId = null;
      return;
    }
    updateVuMeterInstant(ts, false);
    const vm = state.vuMeter;
    const settled =
      vm.leftDb <= -59.5 && vm.rightDb <= -59.5 && vm.holdL <= -59.5 && vm.holdR <= -59.5;
    if (settled) {
      vm.leftDb = -60;
      vm.rightDb = -60;
      vm.holdL = -60;
      vm.holdR = -60;
      vm.duckReductionDb = 0;
      vm.decayRafId = null;
      renderVuMeterReadout();
      return;
    }
    state.vuMeter.decayRafId = window.requestAnimationFrame(stepDecay);
  };
  const vm = state.vuMeter;
  if (vm.leftDb > -59.5 || vm.rightDb > -59.5 || vm.holdL > -59.5 || vm.holdR > -59.5) {
    state.vuMeter.decayRafId = window.requestAnimationFrame(stepDecay);
  } else {
    updateVuMeterInstant(performance.now(), false);
  }
}

function renderTimelineRetimeInspector() {
  const ctrlBox = byId("clip-retime-controls");
  const badge = byId("clip-retime-badge");
  const sendBtn = byId("btn-clip-retime-to-deliver");
  const speedRange = byId("clip-retime-speed-range");
  const speedNum = byId("clip-retime-speed-num");
  const rstBtn = byId("btn-clip-retime-reset");
  const revBtn = byId("btn-clip-retime-reverse");
  const durNote = byId("clip-retime-dur-note");
  const presetBtns = document.querySelectorAll(".retime-preset-btn");

  if (!ctrlBox) return;

  const info = getSelectedClipTrack();
  const hasClip = Boolean(info);
  ctrlBox.classList.toggle("is-disabled", !hasClip);
  for (const el of [speedRange, speedNum, rstBtn, revBtn, sendBtn, ...presetBtns]) {
    if (el) el.disabled = !hasClip;
  }

  if (!info) {
    if (speedRange) speedRange.value = "1";
    if (speedNum && document.activeElement !== speedNum) speedNum.value = "1.00";
    if (revBtn) {
      revBtn.classList.remove("is-active");
      revBtn.setAttribute("aria-pressed", "false");
    }
    for (const btn of presetBtns) {
      btn.classList.remove("is-active");
      btn.setAttribute("aria-pressed", "false");
    }
    if (badge) {
      badge.textContent = "NO CLIP";
      badge.className = "nle-tag mono";
    }
    if (durNote) durNote.textContent = "--";
    return;
  }

  const norm = normalizeClipRetime(info.clip);
  if (speedRange) speedRange.value = String(norm.speedRate);
  if (speedNum && document.activeElement !== speedNum) {
    speedNum.value = norm.speedRate.toFixed(2);
  }
  if (revBtn) {
    revBtn.classList.toggle("is-active", norm.reverse);
    revBtn.setAttribute("aria-pressed", norm.reverse ? "true" : "false");
  }
  for (const btn of presetBtns) {
    const presetVal = Number.parseFloat(btn.getAttribute("data-retime-preset") || "1");
    const isMatch = Math.abs(presetVal - norm.speedRate) < 0.005;
    btn.classList.toggle("is-active", isMatch);
    btn.setAttribute("aria-pressed", isMatch ? "true" : "false");
  }

  const fpsRate = getTimelineFps();
  const baseDurS = info.clip.duration_frames / fpsRate;
  const srcFramesUsed = Math.max(1, Math.round(info.clip.duration_frames * norm.speedRate));
  const srcDurS = srcFramesUsed / fpsRate;
  if (durNote) {
    durNote.textContent = `${info.clip.duration_frames}f (${baseDurS.toFixed(2)}s) | SRC ${srcFramesUsed}f (${srcDurS.toFixed(2)}s)`;
  }

  if (badge) {
    const compiled = compileRetimeFilterClient({
      speed_rate: norm.speedRate,
      reverse: norm.reverse
    });
    if (compiled.is_identity) {
      badge.textContent = "1.0x NORMAL";
      badge.className = "nle-tag mono";
    } else {
      const parts = [];
      if (compiled.video_filtergraph) parts.push(compiled.video_filtergraph);
      if (compiled.audio_filtergraph) parts.push(compiled.audio_filtergraph);
      badge.textContent = parts.join(" | ");
      badge.className = norm.reverse ? "nle-tag mono is-warn" : "nle-tag mono is-pass";
    }
  }
}

function renderTimelineTransformInspector() {
  const ctrlBox = byId("clip-transform-controls");
  const badge = byId("clip-transform-badge");
  const rstAllBtn = byId("btn-clip-transform-reset-all");
  const sendBtn = byId("btn-clip-transform-to-deliver");
  const zoomRange = byId("clip-transform-zoom-range");
  const zoomNum = byId("clip-transform-zoom-num");
  const zoomRst = byId("btn-clip-transform-zoom-reset");
  const posXRange = byId("clip-transform-posx-range");
  const posXNum = byId("clip-transform-posx-num");
  const posXRst = byId("btn-clip-transform-posx-reset");
  const posYRange = byId("clip-transform-posy-range");
  const posYNum = byId("clip-transform-posy-num");
  const posYRst = byId("btn-clip-transform-posy-reset");
  const rotRange = byId("clip-transform-rot-range");
  const rotNum = byId("clip-transform-rot-num");
  const rotRst = byId("btn-clip-transform-rot-reset");
  const opRange = byId("clip-transform-opacity-range");
  const opNum = byId("clip-transform-opacity-num");
  const opRst = byId("btn-clip-transform-opacity-reset");
  const dzSel = byId("clip-transform-dynamic-zoom");
  const presetBtns = document.querySelectorAll(".transform-preset-btn");

  if (!ctrlBox) return;

  const info = getSelectedClipTrack();
  const hasVideoClip = Boolean(info && info.clip && info.clip.media_type !== "audio");
  ctrlBox.classList.toggle("is-disabled", !hasVideoClip);
  for (const el of [
    rstAllBtn,
    sendBtn,
    zoomRange,
    zoomNum,
    zoomRst,
    posXRange,
    posXNum,
    posXRst,
    posYRange,
    posYNum,
    posYRst,
    rotRange,
    rotNum,
    rotRst,
    opRange,
    opNum,
    opRst,
    dzSel,
    ...presetBtns
  ]) {
    if (el) el.disabled = !hasVideoClip;
  }

  if (!hasVideoClip) {
    if (zoomRange) zoomRange.value = String(TRANSFORM_ZOOM_DEFAULT);
    if (zoomNum && document.activeElement !== zoomNum) zoomNum.value = TRANSFORM_ZOOM_DEFAULT.toFixed(1);
    if (posXRange) posXRange.value = String(TRANSFORM_POS_DEFAULT);
    if (posXNum && document.activeElement !== posXNum) posXNum.value = TRANSFORM_POS_DEFAULT.toFixed(1);
    if (posYRange) posYRange.value = String(TRANSFORM_POS_DEFAULT);
    if (posYNum && document.activeElement !== posYNum) posYNum.value = TRANSFORM_POS_DEFAULT.toFixed(1);
    if (rotRange) rotRange.value = String(TRANSFORM_ROT_DEFAULT);
    if (rotNum && document.activeElement !== rotNum) rotNum.value = TRANSFORM_ROT_DEFAULT.toFixed(1);
    if (opRange) opRange.value = String(TRANSFORM_OPACITY_DEFAULT);
    if (opNum && document.activeElement !== opNum) opNum.value = TRANSFORM_OPACITY_DEFAULT.toFixed(1);
    if (dzSel) dzSel.value = DYNAMIC_ZOOM_DEFAULT;
    for (const btn of presetBtns) {
      btn.classList.remove("is-active");
      btn.setAttribute("aria-pressed", "false");
    }
    if (badge) {
      badge.textContent = info ? "AUDIO ONLY" : "NO CLIP";
      badge.className = "nle-tag mono";
    }
    return;
  }

  const norm = normalizeClipTransform(info.clip);
  if (zoomRange) zoomRange.value = String(norm.zoom_pct);
  if (zoomNum && document.activeElement !== zoomNum) zoomNum.value = norm.zoom_pct.toFixed(1);
  if (posXRange) posXRange.value = String(norm.pos_x_pct);
  if (posXNum && document.activeElement !== posXNum) posXNum.value = norm.pos_x_pct.toFixed(1);
  if (posYRange) posYRange.value = String(norm.pos_y_pct);
  if (posYNum && document.activeElement !== posYNum) posYNum.value = norm.pos_y_pct.toFixed(1);
  if (rotRange) rotRange.value = String(norm.rotation_deg);
  if (rotNum && document.activeElement !== rotNum) rotNum.value = norm.rotation_deg.toFixed(1);
  if (opRange) opRange.value = String(norm.opacity_pct);
  if (opNum && document.activeElement !== opNum) opNum.value = norm.opacity_pct.toFixed(1);
  if (dzSel) dzSel.value = norm.dynamic_zoom || DYNAMIC_ZOOM_DEFAULT;

  for (const btn of presetBtns) {
    const pid = btn.getAttribute("data-transform-preset") || "";
    const preset = getTransformPresetClient(pid);
    const isMatch = Boolean(
      preset &&
        Math.abs(preset.zoom_pct - norm.zoom_pct) < 0.1 &&
        Math.abs(preset.pos_x_pct - norm.pos_x_pct) < 0.1 &&
        Math.abs(preset.pos_y_pct - norm.pos_y_pct) < 0.1 &&
        Math.abs(preset.rotation_deg - norm.rotation_deg) < 0.1 &&
        Math.abs(preset.opacity_pct - norm.opacity_pct) < 0.1 &&
        (preset.dynamic_zoom || DYNAMIC_ZOOM_DEFAULT) === (norm.dynamic_zoom || DYNAMIC_ZOOM_DEFAULT)
    );
    btn.classList.toggle("is-active", isMatch);
    btn.setAttribute("aria-pressed", isMatch ? "true" : "false");
  }

  const isIdentity = isClipTransformIdentity(norm);
  if (rstAllBtn) rstAllBtn.disabled = isIdentity;
  if (badge) {
    badge.textContent = formatTransformBadgeText(norm);
    badge.className = isIdentity ? "nle-tag mono" : "nle-tag mono is-active";
  }
}

function renderTimelineTransitionInspector() {
  const ctrlBox = byId("clip-transition-controls");
  const badge = byId("clip-transition-badge");
  const junctionNote = byId("clip-transition-junction-note");
  const presetSel = byId("clip-transition-preset");
  const durRange = byId("clip-transition-dur-range");
  const durNum = byId("clip-transition-dur-num");
  const rstBtn = byId("btn-clip-transition-reset");
  const audioChk = byId("clip-transition-audio");
  const previewBtn = byId("btn-clip-transition-preview");
  const fgPreview = byId("clip-transition-fg-preview");

  if (!ctrlBox) return;

  const junction = getSelectedTransitionTarget();
  const hasCut = Boolean(junction);
  ctrlBox.classList.toggle("is-disabled", !hasCut);
  if (presetSel) presetSel.disabled = !hasCut;
  if (previewBtn) previewBtn.disabled = !hasCut;

  if (!junction) {
    if (presetSel) presetSel.value = "none";
    if (durRange) {
      durRange.value = String(TRANSITION_DURATION_DEFAULT_S);
      durRange.disabled = true;
    }
    if (durNum) {
      if (document.activeElement !== durNum) durNum.value = TRANSITION_DURATION_DEFAULT_S.toFixed(2);
      durNum.disabled = true;
    }
    if (audioChk) {
      audioChk.checked = true;
      audioChk.disabled = true;
    }
    if (rstBtn) rstBtn.disabled = true;
    if (badge) {
      badge.textContent = "NO ADJACENT CUT";
      badge.className = "nle-tag mono";
    }
    if (junctionNote) {
      junctionNote.textContent = "Select an adjacent clip pair to apply a cut transition.";
    }
    if (fgPreview) fgPreview.textContent = "--";
    return;
  }

  const trans = junction.transition;
  const trackTag = `${junction.trackKind === "audio" ? "A" : "V"}${junction.trackIndex}`;
  if (junctionNote) {
    junctionNote.textContent = `${trackTag} CUT @ ${junction.cutFrame}f: ${junction.clipA.name} -> ${junction.clipB.name}`;
  }

  const isActive = Boolean(trans);
  if (presetSel) presetSel.value = isActive ? trans.preset : "none";
  const durVal = isActive ? trans.duration_s : TRANSITION_DURATION_DEFAULT_S;
  if (durRange) {
    durRange.value = String(durVal);
    durRange.disabled = !isActive;
  }
  if (durNum) {
    if (document.activeElement !== durNum) durNum.value = durVal.toFixed(2);
    durNum.disabled = !isActive;
  }
  if (audioChk) {
    audioChk.checked = isActive ? trans.include_audio : true;
    audioChk.disabled = !isActive;
  }
  if (rstBtn) rstBtn.disabled = !isActive;

  if (!isActive) {
    if (badge) {
      badge.textContent = "NONE (CUT)";
      badge.className = "nle-tag mono";
    }
    if (fgPreview) fgPreview.textContent = "Hard cut (no xfade / acrossfade)";
    return;
  }

  const compiled = compileTransitionFilterClient(
    trans,
    junction.clipADurationS,
    junction.clipBDurationS
  );
  if (badge) {
    badge.textContent = `${getTransitionPresetName(trans.preset)} ${trans.duration_s.toFixed(2)}s`;
    badge.className = "nle-tag mono is-active";
  }
  if (fgPreview) {
    fgPreview.textContent = compiled.filter_complex;
  }
}

function getSelectedMarkerInfo() {
  const doc = state.timelineDoc;
  const sel = state.timelineSelected;
  if (!doc || !Array.isArray(doc.markers) || !sel || sel.kind !== "marker") return null;
  let idx = Number.isInteger(sel.markerIndex) ? sel.markerIndex : -1;
  if (idx < 0 || idx >= doc.markers.length) {
    idx = doc.markers.indexOf(sel.data);
  }
  if (idx < 0 || idx >= doc.markers.length) return null;
  return { markerIndex: idx, marker: doc.markers[idx] };
}

function renderTimelineMarkerInspector() {
  const dock = byId("timeline-marker-inspector");
  if (!dock) return;
  const info = getSelectedMarkerInfo();
  if (!info) {
    dock.classList.add("is-hidden");
    return;
  }
  dock.classList.remove("is-hidden");
  const { marker } = info;
  const doc = state.timelineDoc;
  const fps = doc && doc.fps ? doc.fps : { num: 25, den: 1 };
  const frameBadge = byId("marker-frame-badge");
  if (frameBadge) {
    frameBadge.textContent = `${marker.frame}f | ${framesToSmpte(marker.frame, fps.num, fps.den)}`;
  }
  const labelInput = byId("marker-label-input");
  if (labelInput && document.activeElement !== labelInput) {
    labelInput.value = marker.name || "";
  }
  const noteInput = byId("marker-note-input");
  if (noteInput && document.activeElement !== noteInput) {
    noteInput.value = marker.note || "";
  }
  const activeColor = normalizeMarkerColor(marker.color);
  for (const btn of document.querySelectorAll("[data-marker-edit-color]")) {
    const col = btn.getAttribute("data-marker-edit-color");
    const isSel = col === activeColor;
    btn.classList.toggle("is-active", isSel);
    btn.setAttribute("aria-pressed", isSel ? "true" : "false");
  }
}

function renderTimelineSelection() {
  const box = byId("timeline-selection-detail");
  const rippleBtn = byId("btn-clip-ripple-delete");
  const sel = state.timelineSelected;
  if (rippleBtn) {
    rippleBtn.disabled = !getSelectedClipRef();
  }
  if (!sel) {
    box.replaceChildren(dom("span", "kv-val", t("timeline.empty.selection")));
    renderTimelineMarkerInspector();
    renderTimelineTransformInspector();
    renderTimelineAudioInspector();
    renderTimelineRetimeInspector();
    renderTimelineTransitionInspector();
    return;
  }
  if (sel.kind === "clip" || sel.kind === "transition") {
    const c = sel.data;
    const norm = normalizeClipAudio(c);
    const retimeNorm = normalizeClipRetime(c);
    const transformNorm = normalizeClipTransform(c);
    const transNorm = normalizeClipTransition(c);
    const srcFps = c.source_fps
      ? c.source_fps.den === 1
        ? String(c.source_fps.num)
        : `${c.source_fps.num}/${c.source_fps.den}`
      : "inherit";
    const gainLabel = `${norm.gainDb >= 0 ? "+" : ""}${norm.gainDb.toFixed(1)} dB`;
    const fadeLabel = `In ${norm.fadeInS.toFixed(2)}s / Out ${norm.fadeOutS.toFixed(2)}s`;
    const retimeLabel = formatRetimeBadgeText(retimeNorm.speedRate, retimeNorm.reverse);
    const transformLabel = c.media_type === "audio" ? "N/A" : formatTransformBadgeText(transformNorm);
    const transLabel = transNorm
      ? `${getTransitionPresetName(transNorm.preset)} (${transNorm.duration_s.toFixed(2)}s)`
      : t("common.none");
    renderKv(box, [
      ["Type", sel.kind === "transition" ? `Transition (${c.media_type.toUpperCase()})` : `Clip (${c.media_type.toUpperCase()})`],
      ["Name", c.name],
      ["Track", `${c.media_type === "audio" ? "A" : "V"}${c.track_index}`],
      ["Range", `${c.start_frame}f .. ${c.start_frame + c.duration_frames}f (${c.duration_frames}f)`],
      ["Transform", transformLabel],
      ["Retime", retimeLabel],
      ["Transition", transLabel],
      ["Audio", `${gainLabel} | ${fadeLabel}`],
      ["Source In", `${c.source_in_frame}f (${srcFps})`],
      ["Source Path", c.source_path || t("common.none")]
    ]);
    renderTimelineMarkerInspector();
    renderTimelineTransformInspector();
    renderTimelineAudioInspector();
    renderTimelineRetimeInspector();
    renderTimelineTransitionInspector();
    return;
  }
  const mkInfo = getSelectedMarkerInfo();
  const mk = mkInfo ? mkInfo.marker : sel.data;
  renderKv(box, [
    ["Type", "Marker"],
    ["Name", mk.name],
    ["Frame", `${mk.frame}f (${mk.duration_frames}f)`],
    ["Color", mk.color],
    ["Note", mk.note || t("common.none")]
  ]);
  renderTimelineMarkerInspector();
  renderTimelineTransformInspector();
  renderTimelineAudioInspector();
  renderTimelineRetimeInspector();
  renderTimelineTransitionInspector();
}

function renderTimelineIssues() {
  const list = byId("timeline-issues-list");
  const doc = state.timelineDoc;
  const val = state.timelineValidation;
  const items = [];
  const markers = doc && Array.isArray(doc.markers) ? doc.markers : [];
  const countEl = byId("timeline-marker-count");
  if (countEl) {
    countEl.textContent = `${markers.length} MKR`;
  }

  if (val && val.issues && val.issues.length > 0) {
    for (const issue of val.issues) {
      const li = dom("div", `issue-item ${issue.kind === "gap" ? "is-warn" : "is-error"}`);
      const head = dom("div", "issue-head");
      const badge = dom("span", `nle-tag mono ${issue.kind === "gap" ? "is-warn" : "is-fail"}`, issue.kind.toUpperCase());
      const span = dom("span", "mono", `${issue.track_kind.toUpperCase()}${issue.track_index} [${issue.start_frame}..${issue.end_frame}f]`);
      head.replaceChildren(badge, span);
      li.replaceChildren(head, dom("span", "", issue.detail));
      items.push(li);
    }
  } else {
    items.push(dom("div", "issue-item", t("timeline.empty.issues")));
  }

  if (markers.length > 0) {
    const fps = doc && doc.fps ? doc.fps : { num: 25, den: 1 };
    const selMarker = getSelectedMarkerInfo();
    markers.forEach((mk, mkIdx) => {
      const isSelected = Boolean(selMarker && selMarker.markerIndex === mkIdx);
      const card = dom("div", `marker-card${isSelected ? " is-selected" : ""}`);
      card.style.borderLeftColor = MARKER_COLOR_HEX[mk.color] || "#39c5cf";

      const head = dom("div", "marker-card-head");
      const jumpBtn = dom("button", "marker-jump-btn mono");
      jumpBtn.type = "button";
      jumpBtn.setAttribute("data-marker-jump", String(mkIdx));
      jumpBtn.title = `Jump to ${mk.frame}f`;
      const dot = dom("span", `marker-dot is-${String(mk.color || "Cyan").toLowerCase()}`);
      dot.setAttribute("aria-hidden", "true");
      const jumpLabel = dom("span", "", `${mk.frame}f | ${framesToSmpte(mk.frame, fps.num, fps.den)} | ${mk.color}`);
      jumpBtn.replaceChildren(dot, jumpLabel);
      jumpBtn.addEventListener("click", () => jumpToMarkerAction(mkIdx));

      const actions = dom("div", "marker-card-actions");
      const delBtn = dom("button", "btn btn-mini btn-danger-mini", t("timeline.marker.delete"));
      delBtn.type = "button";
      delBtn.setAttribute("data-marker-delete", String(mkIdx));
      delBtn.setAttribute("aria-label", `Delete marker ${mk.name || mk.frame}`);
      delBtn.addEventListener("click", () => deleteMarkerAction(mkIdx));
      actions.replaceChildren(delBtn);

      head.replaceChildren(jumpBtn, actions);

      const inlineInput = dom("input", "input-control marker-inline-label mono");
      inlineInput.type = "text";
      inlineInput.maxLength = 120;
      inlineInput.value = mk.name || "";
      inlineInput.setAttribute("data-marker-inline-label", String(mkIdx));
      inlineInput.setAttribute("aria-label", `Marker label at ${mk.frame}f`);

      let rowDragSnap = null;
      inlineInput.addEventListener("focus", () => {
        rowDragSnap = captureTimelineSnapshot();
      });
      inlineInput.addEventListener("input", () => {
        if (!rowDragSnap) rowDragSnap = captureTimelineSnapshot();
        const res = updateMarkerInDocument(state.timelineDoc, mkIdx, { name: inlineInput.value });
        if (!res.changed) return;
        state.timelineDoc = res.doc;
        if (state.timelineSelected && state.timelineSelected.kind === "marker" && state.timelineSelected.markerIndex === mkIdx) {
          state.timelineSelected = { kind: "marker", markerIndex: mkIdx, data: res.marker };
        }
        renderTimelineSelection();
        if (state.activeTab === "timeline") redrawActiveCanvases();
      });
      inlineInput.addEventListener("change", () => {
        const trimmed = inlineInput.value.trim() || `Marker ${mkIdx + 1}`;
        inlineInput.value = trimmed;
        const baseDoc = rowDragSnap && rowDragSnap.doc ? rowDragSnap.doc : state.timelineDoc;
        const res = updateMarkerInDocument(baseDoc, mkIdx, { name: trimmed });
        if (res.changed) {
          commitTimelineMutation(
            res.doc,
            { kind: "marker", markerIndex: res.markerIndex, data: res.marker },
            rowDragSnap
          );
        } else {
          renderTimelineUI();
        }
        rowDragSnap = null;
      });
      inlineInput.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          inlineInput.blur();
        }
      });

      const children = [head, inlineInput];
      if (mk.note) {
        children.push(dom("span", "telemetry-note mono", mk.note));
      }
      card.replaceChildren(...children);
      items.push(card);
    });
  }

  if (doc && doc.lut_refs && doc.lut_refs.length > 0) {
    const li = dom("div", "issue-item");
    li.replaceChildren(
      dom("span", "nle-tag mono", "LUT REFS"),
      dom("span", "mono", doc.lut_refs.join(", "))
    );
    items.push(li);
  }

  list.replaceChildren(...items);
}

async function loadSampleTimeline(preset) {
  try {
    const data = await api.getSampleTimeline(preset);
    setTimelineData(data);
    byId("timeline-export-feedback").textContent = "";
    hideBanner();
  } catch (err) {
    showBanner(err.message, "error");
  }
}

/* FULL PROJECT SAVE & LOAD (.taktcut.json, taktcut.project.v1) */
function serializeFullProjectState() {
  if (!state.timelineDoc) {
    throw new Error("Load or inspect a timeline before saving a project.");
  }
  const profileEl = byId("render-profile");
  const profile = profileEl ? profileEl.value : "web_h264";
  const isProres = profile === "prores_hq";
  const containerEl = byId("render-container");
  const container = containerEl && containerEl.value === "mov" ? "mov" : "mp4";
  const crfEl = byId("render-crf");
  const crfRaw = crfEl ? crfEl.value.trim() : "";
  const videoCrf = !isProres && /^-?\d+$/.test(crfRaw) ? Number.parseInt(crfRaw, 10) : null;
  const audioEl = byId("render-audio-bitrate");
  const audioRaw = audioEl ? audioEl.value : "192";
  const audioBitrateKbps = !isProres && /^\d+$/.test(audioRaw) ? Number.parseInt(audioRaw, 10) : null;
  const fpsEl = byId("render-fps");
  const fpsStr = (fpsEl && fpsEl.value.trim()) || "25";
  const lufsEl = byId("render-lufs");
  const lufsRaw = lufsEl ? lufsEl.value.trim() : "";
  const parsedLufs = lufsRaw !== "" ? Number.parseFloat(lufsRaw) : null;
  const targetLufs = parsedLufs !== null && Number.isFinite(parsedLufs) ? parsedLufs : null;

  const aspectSpec = getAspectRatioPreset(state.framing.preset);
  const framingWidth = Number.isInteger(state.renderConfig.targetWidth)
    ? state.renderConfig.targetWidth
    : aspectSpec.width;
  const framingHeight = Number.isInteger(state.renderConfig.targetHeight)
    ? state.renderConfig.targetHeight
    : aspectSpec.height;

  const validSubCues = (state.subtitleTrack.cues || [])
    .filter((c) => String(c.text || "").trim().length > 0 && Number(c.end_s) > Number(c.start_s))
    .map((c, idx) => ({
      index: idx + 1,
      start_s: Number(c.start_s),
      end_s: Number(c.end_s),
      text: String(c.text)
    }));

  const chk = (id, fallback = false) => {
    const el = byId(id);
    return el ? Boolean(el.checked) : fallback;
  };
  const txt = (id, fallback = "") => {
    const el = byId(id);
    return el ? el.value.trim() : fallback;
  };

  return {
    schema_version: "taktcut.project.v1",
    project_name: String(state.timelineDoc.name || "Untitled_Project").slice(0, 160),
    timeline: cloneTimelineDoc(state.timelineDoc),
    playhead_frame: Math.max(0, Math.round(state.playheadFrame || 0)),
    timeline_zoom: Math.min(6, Math.max(1, Number(state.timelineZoom || 1.0))),
    snap_enabled: Boolean(state.timelineSnapEnabled),
    bpm_grid: {
      enabled: Boolean(state.bpmGrid.enabled),
      bpm: Number(state.bpmGrid.bpm ?? BPM_DEFAULT),
      offset_s: Number(state.bpmGrid.offset_s ?? 0.0)
    },
    auto_duck: normalizeAutoDuckParams(state.autoDuck),
    color: {
      grade: {
        ...cloneGradeParams(state.colorGrade),
        preserve_lightness: Boolean(state.colorGrade.preserve_lightness)
      },
      active_preset_id: String(state.colorActivePresetId || ""),
      wipe_ratio: Math.min(1, Math.max(0, Number(state.wipeRatio ?? 0.5))),
      scope_mode: ["parade", "waveform", "vectorscope"].includes(state.colorScopeMode)
        ? state.colorScopeMode
        : "parade"
    },
    fx: {
      nodes: serializeFxStackForApi(false),
      bypass_all: Boolean(state.fxBypassAll),
      active_preset_id: String(state.fxActivePresetId || ""),
      chroma_key: serializeChromaKeyForApi(false),
      chroma_key_matte_view: state.chromaKey.matteView === "alpha_matte" ? "alpha_matte" : "final"
    },
    title_overlay: cloneTitleParams(state.titleOverlay),
    subtitle_track: {
      enabled: Boolean(state.subtitleTrack.enabled),
      style: state.subtitleTrack.style || "clean_white",
      font_size: Number(state.subtitleTrack.font_size ?? 34),
      margin_bottom_pct: Number(state.subtitleTrack.margin_bottom_pct ?? 0.08),
      cues: validSubCues
    },
    framing: {
      framing: {
        preset: state.framing.preset,
        mode: state.framing.mode === "fit" ? "fit" : "fill",
        pan_x: 0.0,
        pan_y: 0.0,
        enabled: true,
        target_width: framingWidth,
        target_height: framingHeight
      },
      safe_guides: {
        enabled: Boolean(state.framing.safeGuides),
        action_safe: Boolean(state.framing.guides.actionSafe),
        title_safe: Boolean(state.framing.guides.titleSafe),
        social_hud: Boolean(state.framing.guides.socialHud)
      }
    },
    delivery: {
      delivery_preset: state.activeDeliveryPresetId || null,
      profile,
      container,
      video_crf: videoCrf,
      audio_bitrate_kbps: audioBitrateKbps,
      encoder_preset: !isProres ? state.renderConfig.encoderPreset || "medium" : null,
      fps: fpsStr,
      target_lufs: targetLufs,
      loudness_preset: normalizeFairlightAudioParams(state.fairlight).loudness_preset,
      dialogue_eq: normalizeFairlightAudioParams(state.fairlight).dialogue_eq,
      timecode_burnin: txt("render-timecode-burnin", "off") || "off",
      review_watermark_text: txt("render-watermark-text", ""),
      review_watermark_opacity: Number(byId("render-watermark-opacity")?.value ?? 0.35),
      export_fps: txt("render-export-fps", "source") || "source",
      deinterlace: chk("render-deinterlace", false),
      lut_path: txt("render-lut-path", ""),
      input_path: txt("render-input-path", ".taktcut-samples/sample_rec709.mp4"),
      output_path: txt("render-output-path", "renders/delivery_web.mp4"),
      use_framing: chk("render-use-framing", false),
      use_studio_cdl: chk("render-use-studio-cdl", false),
      use_studio_fx: chk("render-use-studio-fx", false),
      use_studio_title: chk("render-use-studio-title", false),
      use_studio_subtitles: chk("render-use-studio-subtitles", false),
      use_clip_audio: chk("render-use-clip-audio", true),
      use_clip_retime: chk("render-use-clip-retime", true),
      use_clip_transform: chk("render-use-clip-transform", true),
      prefer_hw: chk("render-prefer-hw", true)
    }
  };
}

function applyFullProjectState(project, validation) {
  stopPlayback();
  const tlValidation = validation || validateTimelineClient(project.timeline);
  setTimelineData({ document: project.timeline, validation: tlValidation });

  state.timelineZoom = Math.min(6, Math.max(1, Number(project.timeline_zoom ?? 1.0)));
  const zoomEl = byId("timeline-zoom");
  const zoomLabelEl = byId("timeline-zoom-label");
  if (zoomEl) zoomEl.value = String(state.timelineZoom);
  if (zoomLabelEl) zoomLabelEl.textContent = `${state.timelineZoom.toFixed(1)}x`;

  state.timelineSnapEnabled = project.snap_enabled !== false;
  const bpm = project.bpm_grid || {};
  state.bpmGrid = {
    enabled: Boolean(bpm.enabled),
    bpm: Number(bpm.bpm ?? BPM_DEFAULT),
    offset_s: Number(bpm.offset_s ?? 0.0)
  };
  state.autoDuck = normalizeAutoDuckParams(project.auto_duck);
  setPlayhead(Number(project.playhead_frame ?? 0));

  // Color state
  const col = project.color || {};
  if (col.grade) {
    state.colorGrade = {
      ...cloneGradeParams(col.grade),
      preserve_lightness: Boolean(col.grade.preserve_lightness)
    };
  }
  state.colorActivePresetId = String(col.active_preset_id || "");
  state.colorSplitWipe.positionPct = clampSplitWipePercent(Number(col.wipe_ratio ?? 0.5) * 100);
  state.wipeRatio = state.colorSplitWipe.positionPct / 100;
  state.colorScopeMode = ["parade", "waveform", "vectorscope"].includes(col.scope_mode)
    ? col.scope_mode
    : "parade";
  syncSplitWipeControls("color");
  for (const btn of document.querySelectorAll("[data-scope-mode]")) {
    const active = btn.getAttribute("data-scope-mode") === state.colorScopeMode;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  }
  syncColorInputsFromState();

  // FX & Chroma Key state
  const fx = project.fx || {};
  state.fxStack = Array.isArray(fx.nodes)
    ? fx.nodes.map((node) => ({
        effect: node.effect,
        enabled: node.enabled !== false,
        params: { ...(node.params || {}) },
        keyframes: Array.isArray(node.keyframes) ? node.keyframes.map((k) => ({ ...k })) : [],
        kfOpen: Array.isArray(node.keyframes) && node.keyframes.length > 0
      }))
    : [];
  state.fxBypassAll = Boolean(fx.bypass_all);
  state.fxActivePresetId = String(fx.active_preset_id || "");
  const ck = fx.chroma_key || {};
  state.chromaKey = {
    enabled: Boolean(ck.enabled),
    preset: ck.preset || "studio_green",
    key_color: String(ck.key_color || "#00b140").toLowerCase(),
    similarity: Number(ck.similarity ?? 0.18),
    blend: Number(ck.blend ?? 0.08),
    despill: ck.despill !== false,
    despill_type: ck.despill_type === "blue" ? "blue" : "green",
    matteView: fx.chroma_key_matte_view === "alpha_matte" ? "alpha_matte" : "final"
  };
  syncChromaKeyControlsFromState();
  renderFxStack();

  // Title Overlay state
  if (project.title_overlay) {
    state.titleOverlay = cloneTitleParams(project.title_overlay);
  }
  syncTitleInputsFromState();

  // Subtitles state
  const sub = project.subtitle_track || {};
  state.subtitleTrack = {
    enabled: sub.enabled !== false,
    style: sub.style || "clean_white",
    font_size: Number(sub.font_size ?? 34),
    margin_bottom_pct: Number(sub.margin_bottom_pct ?? 0.08),
    cues: Array.isArray(sub.cues)
      ? sub.cues.map((c, idx) => ({
          index: idx + 1,
          start_s: Number(c.start_s),
          end_s: Number(c.end_s),
          text: String(c.text || "")
        }))
      : []
  };
  const subRawEl = byId("subtitle-raw-input");
  if (subRawEl) {
    subRawEl.value = state.subtitleTrack.cues.length > 0
      ? formatCuesAsSrtLocal(state.subtitleTrack.cues)
      : "";
  }
  syncSubtitleControlsFromState();

  // Framing & Safe Guides state
  const frWrap = project.framing || {};
  const frParams = frWrap.framing || {};
  const sg = frWrap.safe_guides || {};
  const aspectSpec = getAspectRatioPreset(frParams.preset || "16:9");
  state.framing = {
    preset: aspectSpec.id,
    mode: frParams.mode === "fit" ? "fit" : "fill",
    safeGuides: Boolean(sg.enabled),
    guides: {
      actionSafe: sg.action_safe !== false,
      titleSafe: sg.title_safe !== false,
      socialHud: sg.social_hud !== false
    }
  };

  // Delivery state
  const del = project.delivery || {};
  state.activeDeliveryPresetId = del.delivery_preset || null;
  state.renderConfig.targetWidth = Number.isInteger(frParams.target_width)
    ? frParams.target_width
    : aspectSpec.width;
  state.renderConfig.targetHeight = Number.isInteger(frParams.target_height)
    ? frParams.target_height
    : aspectSpec.height;
  state.renderConfig.encoderPreset = del.encoder_preset || "medium";

  const setVal = (id, val) => {
    const el = byId(id);
    if (el && val !== undefined && val !== null) el.value = String(val);
  };
  const setChk = (id, flag) => {
    const el = byId(id);
    if (el) el.checked = Boolean(flag);
  };

  setVal("render-profile", del.profile || "web_h264");
  syncDeliverProfileControlsState();
  setVal("render-container", del.container || (del.profile === "prores_hq" ? "mov" : "mp4"));
  if (del.profile !== "prores_hq" && del.video_crf !== null && del.video_crf !== undefined) {
    setVal("render-crf", del.video_crf);
  }
  if (del.profile !== "prores_hq" && del.audio_bitrate_kbps) {
    setVal("render-audio-bitrate", del.audio_bitrate_kbps);
  }
  setVal("render-fps", del.fps || "25");
  setVal("render-lufs", del.target_lufs !== null && del.target_lufs !== undefined ? del.target_lufs : "");
  state.fairlight = normalizeFairlightAudioParams({
    loudness_preset: del.loudness_preset || "off",
    dialogue_eq: del.dialogue_eq || "off"
  });
  setVal("render-lut-path", del.lut_path || "");
  setVal("render-timecode-burnin", del.timecode_burnin || "off");
  setVal("render-export-fps", del.export_fps || "source");
  setChk("render-deinterlace", Boolean(del.deinterlace));
  setVal("render-watermark-text", del.review_watermark_text || "");
  const wmOpacityVal =
    del.review_watermark_opacity !== null && del.review_watermark_opacity !== undefined
      ? Number(del.review_watermark_opacity)
      : 0.35;
  setVal(
    "render-watermark-opacity",
    Number.isFinite(wmOpacityVal) ? wmOpacityVal.toFixed(2) : "0.35"
  );
  syncReviewWatermarkControlsUI();
  setVal("render-input-path", del.input_path || ".taktcut-samples/sample_rec709.mp4");
  setVal("render-output-path", del.output_path || "renders/delivery_web.mp4");
  setVal("render-resolution", `${state.renderConfig.targetWidth}x${state.renderConfig.targetHeight}`);

  setChk("render-use-framing", del.use_framing);
  setChk("render-use-studio-cdl", del.use_studio_cdl);
  setChk("render-use-studio-fx", del.use_studio_fx);
  setChk("render-use-studio-title", del.use_studio_title);
  setChk("render-use-studio-subtitles", del.use_studio_subtitles);
  setChk("render-use-clip-audio", del.use_clip_audio !== false);
  setChk("render-use-clip-retime", del.use_clip_retime !== false);
  setChk("render-use-clip-transform", del.use_clip_transform !== false);
  setChk("render-prefer-hw", del.prefer_hw !== false);

  syncFramingControlsUI();
  renderFairlightAudioUI();
  renderDeliveryPresetStrip();
  updateTimelineToolbarUI();
  updateIoRangeUI();
  renderTimelineUI();
  redrawActiveCanvases();

  compileColorNow();
  compileFxNow();
  compileTitleNow();
  compileSubtitlesNow();
}

async function saveProjectAction() {
  try {
    const projectPayload = serializeFullProjectState();
    const res = await api.exportProject({ project: projectPayload });
    const filename = res.filename || "project.taktcut.json";
    const jsonText = res.project_json || JSON.stringify(res.project, null, 2);
    triggerBlobDownload(new Blob([jsonText], { type: "application/json; charset=utf-8" }), filename);
    showBanner(t("project.saved").replace("{name}", filename), "success");
  } catch (err) {
    showBanner(err.message, "error");
  }
}

async function openProjectFromFile(file) {
  try {
    const text = await file.text();
    const res = await api.importProject({ project_json: text });
    applyFullProjectState(res.project, res.validation);
    const label = res.project.project_name || file.name;
    showBanner(t("project.loaded").replace("{name}", label), "success");
  } catch (err) {
    showBanner(err.message, "error");
  }
}

/* PAGE 2: SAPPHIRE FX LIBRARY, EFFECT CONTROLS & LIVE COMPILER */
const FX_PARAM_FALLBACK = {
  glow: [
    { name: "brightness", label: "Brightness", kind: "float", default: 0.85, min_val: 0, max_val: 3, step: 0.05 },
    { name: "width", label: "Width / Blur", kind: "float", default: 18, min_val: 1, max_val: 80, step: 0.5 },
    { name: "threshold", label: "Threshold", kind: "float", default: 0.45, min_val: 0, max_val: 1, step: 0.01 },
    { name: "tint", label: "Tint", kind: "color", default: "#ffd8a8" }
  ],
  shake: [
    { name: "amplitude", label: "Amplitude", kind: "float", default: 14, min_val: 0, max_val: 64, step: 0.5 },
    { name: "frequency", label: "Frequency", kind: "float", default: 6, min_val: 0.2, max_val: 30, step: 0.2 },
    { name: "motion_blur", label: "Motion Blur", kind: "float", default: 0.35, min_val: 0, max_val: 1, step: 0.05 },
    { name: "seed", label: "Seed", kind: "int", default: 42, min_val: 0, max_val: 9999, step: 1 }
  ],
  flicker: [
    { name: "amplitude", label: "Amplitude", kind: "float", default: 0.18, min_val: 0, max_val: 0.5, step: 0.01 },
    { name: "frequency", label: "Frequency", kind: "float", default: 8, min_val: 0.5, max_val: 30, step: 0.5 },
    { name: "randomness", label: "Randomness", kind: "float", default: 0.35, min_val: 0, max_val: 1, step: 0.05 }
  ],
  lens_flare: [
    { name: "center_x", label: "Center X", kind: "float", default: 0.72, min_val: 0, max_val: 1, step: 0.01 },
    { name: "center_y", label: "Center Y", kind: "float", default: 0.28, min_val: 0, max_val: 1, step: 0.01 },
    { name: "brightness", label: "Brightness", kind: "float", default: 0.95, min_val: 0, max_val: 2, step: 0.05 },
    { name: "scale", label: "Scale", kind: "float", default: 1.0, min_val: 0.2, max_val: 2.5, step: 0.05 },
    { name: "tint", label: "Tint", kind: "color", default: "#7cc4ff" }
  ],
  film_damage: [
    { name: "mix", label: "Mix", kind: "float", default: 0.75, min_val: 0, max_val: 1, step: 0.05 },
    { name: "grain", label: "Grain", kind: "float", default: 28, min_val: 0, max_val: 100, step: 1 },
    { name: "scratches", label: "Scratches", kind: "float", default: 0.45, min_val: 0, max_val: 1, step: 0.05 },
    { name: "vignette", label: "Vignette", kind: "float", default: 0.55, min_val: 0, max_val: 1, step: 0.05 },
    { name: "gate_weave", label: "Gate Weave", kind: "float", default: 0.25, min_val: 0, max_val: 1, step: 0.05 }
  ],
  chroma_aberration: [
    { name: "spread", label: "Spread", kind: "float", default: 8, min_val: 0, max_val: 40, step: 0.5 },
    { name: "angle", label: "Angle", kind: "float", default: 15, min_val: -180, max_val: 180, step: 1 },
    { name: "blur", label: "Blur", kind: "float", default: 0.8, min_val: 0, max_val: 10, step: 0.1 }
  ],
  vignette: [
    { name: "angle_rad", label: "Angle (rad)", kind: "float", default: 0.52, min_val: 0.1, max_val: 1.2, step: 0.02 }
  ],
  film_grain: [
    { name: "strength", label: "Strength", kind: "float", default: 14, min_val: 0, max_val: 40, step: 1 }
  ],
  optical_glow: [
    { name: "glow_intensity", label: "Glow Intensity", kind: "float", default: 0.45, min_val: 0, max_val: 1, step: 0.05 },
    { name: "glow_radius", label: "Glow Radius", kind: "float", default: 10, min_val: 2, max_val: 24, step: 0.5 }
  ],
  rgb_split: [
    { name: "chroma_shift_px", label: "Chroma Shift", kind: "int", default: 4, min_val: 0, max_val: 12, step: 1 }
  ],
  halation: [
    { name: "halation_strength", label: "Halation Strength", kind: "float", default: 0.55, min_val: 0, max_val: 1, step: 0.05 },
    { name: "halation_radius", label: "Halation Radius", kind: "float", default: 10, min_val: 2, max_val: 20, step: 0.5 }
  ],
  letterbox: [
    { name: "ratio", label: "Aspect Ratio", kind: "enum", default: "2.39", unit: ":1", options: ["2.39", "2.35", "1.85", "2.00"] }
  ],
  camera_shake: [
    { name: "amplitude_px", label: "Amplitude", kind: "float", default: 8.0, min_val: 1.0, max_val: 24.0, step: 0.5 },
    { name: "frequency_hz", label: "Frequency", kind: "float", default: 4.5, min_val: 0.5, max_val: 12.0, step: 0.5 }
  ],
  lens_distortion: [
    { name: "k1", label: "Distortion (k1)", kind: "float", default: -0.22, min_val: -0.50, max_val: 0.50, step: 0.02 }
  ],
  scanlines: [
    { name: "line_spacing_px", label: "Line Spacing", kind: "int", default: 4, min_val: 2, max_val: 12, step: 1, unit: "px" },
    { name: "opacity", label: "Opacity", kind: "float", default: 0.45, min_val: 0.10, max_val: 0.90, step: 0.05 }
  ],
  unsharp_mask: [
    { name: "sharpen_amount", label: "Sharpen Amount", kind: "float", default: 1.20, min_val: 0.20, max_val: 3.00, step: 0.10 }
  ],
  hue_shift: [
    { name: "hue_deg", label: "Hue (deg)", kind: "float", default: 30.0, min_val: -180.0, max_val: 180.0, step: 1.0, unit: "deg" },
    { name: "saturation", label: "Saturation", kind: "float", default: 1.25, min_val: 0.0, max_val: 2.5, step: 0.05 }
  ],
  mirror_flip: [
    { name: "axis", label: "Mirror Axis", kind: "enum", default: "horizontal", options: ["horizontal", "vertical", "both"] }
  ],
  mosaic_pixelate: [
    { name: "block_size_px", label: "Block Size (px)", kind: "int", default: 12, min_val: 4, max_val: 48, step: 1, unit: "px" }
  ],
  invert_negative: [
    { name: "mode", label: "Invert Mode", kind: "enum", default: "rgb", options: ["rgb", "luma"] }
  ]
};

const FX_PRESET_FALLBACK = {
  dreamy_glow: [
    { effect: "glow", enabled: true, params: { brightness: 1.15, width: 26, threshold: 0.38, tint: "#ffe0b8" } }
  ],
  music_video_shake: [
    { effect: "shake", enabled: true, params: { amplitude: 18, frequency: 9.5, motion_blur: 0.55, seed: 108 } },
    { effect: "chroma_aberration", enabled: true, params: { spread: 5, angle: 12, blur: 0.5 } }
  ],
  vintage_35mm_film: [
    { effect: "film_damage", enabled: true, params: { mix: 0.85, grain: 34, scratches: 0.55, vignette: 0.65, gate_weave: 0.35 } },
    { effect: "flicker", enabled: true, params: { amplitude: 0.08, frequency: 12, randomness: 0.5 } }
  ],
  anamorphic_flare: [
    { effect: "lens_flare", enabled: true, params: { center_x: 0.74, center_y: 0.3, brightness: 1.25, scale: 1.25, tint: "#6eb8ff" } },
    { effect: "glow", enabled: true, params: { brightness: 0.55, width: 16, threshold: 0.55, tint: "#b8dcff" } }
  ],
  rgb_glitch_split: [
    { effect: "chroma_aberration", enabled: true, params: { spread: 16, angle: 8, blur: 1.2 } },
    { effect: "shake", enabled: true, params: { amplitude: 6, frequency: 18, motion_blur: 0.25, seed: 77 } }
  ],
  strobe_flicker: [
    { effect: "flicker", enabled: true, params: { amplitude: 0.32, frequency: 14, randomness: 0.25 } },
    { effect: "glow", enabled: true, params: { brightness: 0.75, width: 14, threshold: 0.42, tint: "#ffffff" } }
  ],
  "35mm_cinema": [
    { effect: "film_grain", enabled: true, params: { strength: 16 } },
    { effect: "vignette", enabled: true, params: { angle_rad: 0.45 } }
  ],
  moody_vignette: [
    { effect: "vignette", enabled: true, params: { angle_rad: 0.92 } },
    { effect: "film_grain", enabled: true, params: { strength: 8 } }
  ],
  cyberpunk_glow: [
    { effect: "optical_glow", enabled: true, params: { glow_intensity: 0.72, glow_radius: 16 } },
    { effect: "rgb_split", enabled: true, params: { chroma_shift_px: 6 } }
  ],
  anamorphic_dream: [
    { effect: "optical_glow", enabled: true, params: { glow_intensity: 0.55, glow_radius: 20 } },
    { effect: "rgb_split", enabled: true, params: { chroma_shift_px: 3 } },
    { effect: "vignette", enabled: true, params: { angle_rad: 0.42 } }
  ],
  cinema_35mm: [
    { effect: "halation", enabled: true, params: { halation_strength: 0.55, halation_radius: 10 } },
    { effect: "letterbox", enabled: true, params: { ratio: "2.39" } },
    { effect: "film_grain", enabled: true, params: { strength: 14 } }
  ],
  action_handheld: [
    { effect: "camera_shake", enabled: true, params: { amplitude_px: 10.0, frequency_hz: 5.5 } },
    { effect: "rgb_split", enabled: true, params: { chroma_shift_px: 2 } },
    { effect: "vignette", enabled: true, params: { angle_rad: 0.52 } }
  ],
  retro_vhs: [
    { effect: "scanlines", enabled: true, params: { line_spacing_px: 4, opacity: 0.45 } },
    { effect: "rgb_split", enabled: true, params: { chroma_shift_px: 4 } },
    { effect: "film_grain", enabled: true, params: { strength: 18.0 } }
  ],
  neon_shift: [
    { effect: "hue_shift", enabled: true, params: { hue_deg: 45.0, saturation: 1.45 } },
    { effect: "optical_glow", enabled: true, params: { glow_intensity: 0.65, glow_radius: 14.0 } },
    { effect: "vignette", enabled: true, params: { angle_rad: 0.58 } }
  ],
  retro_arcade: [
    { effect: "mosaic_pixelate", enabled: true, params: { block_size_px: 10 } },
    { effect: "scanlines", enabled: true, params: { line_spacing_px: 4, opacity: 0.45 } },
    { effect: "rgb_split", enabled: true, params: { chroma_shift_px: 3 } }
  ]
};

const FX_DISPLAY_TITLES = {
  glow: "S_Glow",
  shake: "S_Shake",
  flicker: "S_Flicker",
  lens_flare: "S_LensFlare",
  film_damage: "S_FilmDamage",
  chroma_aberration: "S_ChromaAberration",
  vignette: "S_Vignette",
  film_grain: "S_FilmGrain",
  optical_glow: "S_OpticalGlow",
  rgb_split: "S_RGBSplit",
  halation: "S_Halation",
  letterbox: "S_Letterbox",
  camera_shake: "S_Shake Handheld",
  lens_distortion: "S_LensDistortion",
  scanlines: "S_ScanLines",
  unsharp_mask: "S_Sharpen",
  hue_shift: "S_HueSatBright",
  mirror_flip: "S_FlipFlop",
  mosaic_pixelate: "S_Mosaic",
  invert_negative: "S_Invert"
};

function getFxParamLabel(spec) {
  const key = `fx.param.${spec.name}`;
  const translated = t(key);
  return translated !== key ? translated : spec.label;
}

function getFxEnumOptionLabel(spec, optVal) {
  const key = `fx.enum.${spec.name}.${optVal}`;
  const translated = t(key);
  return translated !== key ? translated : `${optVal}${spec.unit || ""}`;
}

function getFxSpecs(effect) {
  if (state.fxSpecs && state.fxSpecs[effect]) return state.fxSpecs[effect];
  return FX_PARAM_FALLBACK[effect] || [];
}

function createDefaultFxNode(effect) {
  const params = {};
  for (const sp of getFxSpecs(effect)) {
    params[sp.name] = sp.default;
  }
  return { effect, enabled: true, params, keyframes: [], kfOpen: false };
}

function getFxDurationSeconds() {
  const el = byId("fx-duration-input");
  const raw = el ? Number.parseFloat(el.value) : 10;
  return Number.isFinite(raw) && raw > 0.1 ? raw : 10;
}

function serializeFxStackForApi(forceDisabled = false) {
  return state.fxStack.map((n) => ({
    effect: n.effect,
    enabled: forceDisabled ? false : n.enabled !== false,
    params: { ...n.params },
    keyframes: Array.isArray(n.keyframes)
      ? n.keyframes.map((k) => ({
          time_s: Number(k.time_s),
          value: Number(k.value),
          easing: k.easing || "linear"
        }))
      : []
  }));
}

function redrawFxKeyframeCanvases() {
  const dur = getFxDurationSeconds();
  const fps = getTimelineFps();
  const curT = state.playheadFrame / fps;
  for (const canvas of document.querySelectorAll(".fx-kf-canvas")) {
    const idx = Number.parseInt(canvas.getAttribute("data-node-idx") || "-1", 10);
    const node = state.fxStack[idx];
    if (node) {
      drawKeyframeCurveCanvas(canvas, node.keyframes || [], dur, curT);
    }
  }
}

const CHROMA_KEY_PRESETS_FALLBACK = {
  studio_green: {
    id: "studio_green",
    name: "Studio Green",
    key_color: "#00b140",
    similarity: 0.18,
    blend: 0.08,
    despill: true,
    despill_type: "green"
  },
  chroma_blue: {
    id: "chroma_blue",
    name: "Chroma Blue",
    key_color: "#0047bb",
    similarity: 0.2,
    blend: 0.08,
    despill: true,
    despill_type: "blue"
  },
  custom: {
    id: "custom",
    name: "Custom Hex",
    key_color: "#00b140",
    similarity: 0.18,
    blend: 0.08,
    despill: true,
    despill_type: "green"
  }
};

function serializeChromaKeyForApi(forceDisabled = false) {
  const ck = state.chromaKey;
  return {
    preset: ck.preset || "studio_green",
    key_color: ck.key_color || "#00b140",
    similarity: Number(ck.similarity ?? 0.18),
    blend: Number(ck.blend ?? 0.08),
    despill: Boolean(ck.despill),
    despill_type: ck.despill_type === "blue" ? "blue" : "green",
    enabled: forceDisabled ? false : Boolean(ck.enabled)
  };
}

function syncChromaKeyControlsFromState() {
  const ck = state.chromaKey;
  const badge = byId("fx-keyer-badge");
  const toggleBtn = byId("btn-fx-keyer-toggle");
  const picker = byId("fx-keyer-color-picker");
  const hexInput = byId("fx-keyer-hex-input");
  const customSwatch = byId("fx-keyer-custom-swatch");
  const despillEl = byId("fx-keyer-despill");
  const despillTypeEl = byId("fx-keyer-despill-type");
  const simRange = byId("fx-keyer-similarity-range");
  const simNum = byId("fx-keyer-similarity-num");
  const blendRange = byId("fx-keyer-blend-range");
  const blendNum = byId("fx-keyer-blend-num");

  if (badge) {
    if (state.fxBypassAll && ck.enabled) {
      badge.textContent = "BYPASSED (A/B)";
      badge.className = "nle-tag is-warn mono";
    } else if (ck.enabled) {
      badge.textContent = `${String(ck.key_color).toUpperCase()} | ${ck.despill ? "DESPILL" : "RAW"}`;
      badge.className = "nle-tag is-pass mono";
    } else {
      badge.textContent = "OFF";
      badge.className = "nle-tag mono";
    }
  }
  if (toggleBtn) {
    toggleBtn.setAttribute("aria-pressed", ck.enabled ? "true" : "false");
    toggleBtn.classList.toggle("is-on", ck.enabled);
  }
  for (const btn of document.querySelectorAll("[data-keyer-preset]")) {
    const pid = btn.getAttribute("data-keyer-preset");
    const match = pid === ck.preset;
    btn.classList.toggle("is-active", match);
    btn.setAttribute("aria-pressed", match ? "true" : "false");
  }
  for (const btn of document.querySelectorAll("[data-fx-matte]")) {
    const mode = btn.getAttribute("data-fx-matte");
    const match = mode === ck.matteView;
    btn.classList.toggle("is-active", match);
    btn.setAttribute("aria-pressed", match ? "true" : "false");
  }
  if (picker) picker.value = ck.key_color;
  if (hexInput && document.activeElement !== hexInput) {
    hexInput.value = String(ck.key_color).toUpperCase();
    hexInput.removeAttribute("aria-invalid");
  }
  if (customSwatch) {
    customSwatch.style.backgroundColor = ck.key_color;
  }
  if (despillEl) despillEl.checked = Boolean(ck.despill);
  if (despillTypeEl) despillTypeEl.value = ck.despill_type === "blue" ? "blue" : "green";
  if (simRange) simRange.value = String(ck.similarity);
  if (simNum && document.activeElement !== simNum) simNum.value = String(ck.similarity);
  if (blendRange) blendRange.value = String(ck.blend);
  if (blendNum && document.activeElement !== blendNum) blendNum.value = String(ck.blend);
}

function applyChromaKeyPreset(presetId) {
  let preset = null;
  if (Array.isArray(state.chromaKeyPresetsCatalog)) {
    preset = state.chromaKeyPresetsCatalog.find((p) => p.id === presetId) || null;
  }
  if (!preset) {
    preset = CHROMA_KEY_PRESETS_FALLBACK[presetId] || null;
  }
  if (!preset) return;
  state.chromaKey.preset = preset.id;
  state.chromaKey.enabled = true;
  if (preset.id !== "custom") {
    state.chromaKey.key_color = String(preset.key_color || "#00b140").toLowerCase();
    state.chromaKey.similarity = Number(preset.similarity ?? 0.18);
    state.chromaKey.blend = Number(preset.blend ?? 0.08);
    state.chromaKey.despill = Boolean(preset.despill !== undefined ? preset.despill : true);
    state.chromaKey.despill_type = preset.despill_type === "blue" ? "blue" : "green";
  }
  state.fxBypassAll = false;
  syncChromaKeyControlsFromState();
  updateFxBadges();
  redrawActiveCanvases();
  compileFxNow();
}

function updateFxBadges() {
  const total = state.fxStack.length;
  const fxActiveCount = state.fxStack.filter((n) => n.enabled).length;
  const ckActiveCount = state.chromaKey.enabled ? 1 : 0;
  const activeCount = state.fxBypassAll ? 0 : fxActiveCount + ckActiveCount;
  const activeBadge = byId("fx-active-badge");
  const stackBadge = byId("fx-stack-count");
  const bypassBtn = byId("btn-fx-bypass-all");

  if (activeBadge) {
    activeBadge.textContent = state.fxBypassAll ? "BYPASSED (A/B)" : `${activeCount} FX ACTIVE`;
    activeBadge.className = `nle-tag mono ${
      state.fxBypassAll ? "is-warn" : activeCount > 0 ? "is-active" : ""
    }`;
  }
  if (stackBadge) {
    stackBadge.textContent = `${total} node${total === 1 ? "" : "s"}`;
  }
  if (bypassBtn) {
    bypassBtn.setAttribute("aria-pressed", state.fxBypassAll ? "true" : "false");
    bypassBtn.classList.toggle("btn-bypass-global", true);
    bypassBtn.classList.toggle("is-bypassed", state.fxBypassAll);
  }
  for (const btn of document.querySelectorAll("[data-fx-preset]")) {
    const pid = btn.getAttribute("data-fx-preset");
    btn.classList.toggle("is-active", pid === state.fxActivePresetId);
  }
}

function renderFxCompileResult(res) {
  state.fxLastCompile = res;
  const badge = byId("fx-compile-badge");
  const kv = byId("fx-compile-kv");
  const out = byId("fx-filtergraph-output");
  if (!badge || !kv || !out) return;

  if (!res || !res.filtergraph) {
    badge.textContent = "IDLE";
    badge.className = "nle-tag mono";
    renderKv(kv, [
      ["Active FX", "0"],
      ["Est. Render", "0.00s"],
      ["Realtime", "--"],
      ["Complexity", "idle"]
    ]);
    out.textContent = t("fx.compiler.empty");
    return;
  }

  badge.textContent = `${res.estimated_render_seconds.toFixed(2)}s est.`;
  badge.className = `nle-tag mono ${
    res.complexity_tier === "heavy" ? "is-warn" : "is-pass"
  }`;
  const kfList = Array.isArray(res.keyframed_effects) && res.keyframed_effects.length > 0
    ? ` | KF: ${res.keyframed_effects.join(", ")}`
    : "";
  const activeLabels = [
    ...(res.chroma_key_active ? ["chroma_key"] : []),
    ...(Array.isArray(res.active_effects) ? res.active_effects : [])
  ];
  renderKv(kv, [
    ["Active FX", (activeLabels.join(", ") || t("common.none")) + kfList],
    ["Est. Render", `${res.estimated_render_seconds.toFixed(2)}s`],
    ["Realtime", `${res.realtime_factor.toFixed(2)}x`],
    ["Complexity", `${res.complexity_tier.toUpperCase()} (${res.bypassed_count} bypassed)`]
  ]);
  out.textContent = res.filtergraph;
}

async function compileFxNow() {
  try {
    const duration_seconds = getFxDurationSeconds();
    const resStr = byId("fx-resolution-select").value || "1920x1080";
    const [wStr, hStr] = resStr.split("x");
    const width = Number.parseInt(wStr, 10) || 1920;
    const height = Number.parseInt(hStr, 10) || 1080;
    const use_gpu = byId("fx-use-gpu").checked;
    const fps = getTimelineFps();

    const nodesPayload = serializeFxStackForApi(state.fxBypassAll);
    const ckPayload = state.chromaKey.enabled ? serializeChromaKeyForApi(state.fxBypassAll) : null;

    const compiled = await api.compileFx({
      nodes: nodesPayload,
      chroma_key: ckPayload,
      duration_seconds,
      width,
      height,
      fps,
      use_gpu
    });
    renderFxCompileResult(compiled);
  } catch (err) {
    showBanner(err.message, "error");
  }
}

function scheduleFxCompile() {
  if (state.fxCompileTimer !== null) {
    window.clearTimeout(state.fxCompileTimer);
  }
  state.fxCompileTimer = window.setTimeout(() => {
    state.fxCompileTimer = null;
    compileFxNow();
  }, 80);
}

function applyFadeToNode(node, mode) {
  const dur = getFxDurationSeconds();
  const fadeSpan = Math.min(1.0, Math.max(0.25, dur * 0.25));
  if (mode === "in") {
    node.keyframes = [
      { time_s: 0.0, value: 0.0, easing: "ease_in_out" },
      { time_s: Number(fadeSpan.toFixed(2)), value: 1.0, easing: "ease_in_out" }
    ];
  } else if (mode === "out") {
    const startOut = Math.max(0, Number((dur - fadeSpan).toFixed(2)));
    node.keyframes = [
      { time_s: startOut, value: 1.0, easing: "ease_in_out" },
      { time_s: Number(dur.toFixed(2)), value: 0.0, easing: "ease_in_out" }
    ];
  } else if (fadeSpan * 2 >= dur - 0.05) {
    node.keyframes = [
      { time_s: 0.0, value: 0.0, easing: "ease_in_out" },
      { time_s: Number((dur * 0.5).toFixed(2)), value: 1.0, easing: "ease_in_out" },
      { time_s: Number(dur.toFixed(2)), value: 0.0, easing: "ease_in_out" }
    ];
  } else {
    node.keyframes = [
      { time_s: 0.0, value: 0.0, easing: "ease_in_out" },
      { time_s: Number(fadeSpan.toFixed(2)), value: 1.0, easing: "linear" },
      { time_s: Number((dur - fadeSpan).toFixed(2)), value: 1.0, easing: "ease_in_out" },
      { time_s: Number(dur.toFixed(2)), value: 0.0, easing: "ease_in_out" }
    ];
  }
  node.kfOpen = true;
}

function renderFxStack() {
  const container = byId("fx-controls-stack");
  if (!container) return;
  updateFxBadges();

  if (state.fxStack.length === 0) {
    container.replaceChildren(dom("div", "fx-empty-note", t("fx.controls.empty")));
    return;
  }

  const cards = state.fxStack.map((node, nodeIdx) => {
    if (!Array.isArray(node.keyframes)) node.keyframes = [];
    const card = dom("article", `fx-node-card${node.enabled ? "" : " is-bypassed"}`);

    // Header
    const head = dom("div", "fx-node-head");
    const titleGroup = dom("div", "fx-node-title-group");

    const bypassBtn = dom(
      "button",
      `fx-bypass-btn mono${node.enabled ? " is-on" : ""}`,
      t("fx.controls.bypass")
    );
    bypassBtn.type = "button";
    bypassBtn.setAttribute("aria-pressed", node.enabled ? "true" : "false");
    bypassBtn.setAttribute("aria-label", `Toggle ${FX_DISPLAY_TITLES[node.effect] || node.effect}`);
    bypassBtn.addEventListener("click", () => {
      node.enabled = !node.enabled;
      state.fxActivePresetId = "";
      renderFxStack();
      redrawActiveCanvases();
      scheduleFxCompile();
    });

    const titleSpan = dom("span", "fx-node-title mono", FX_DISPLAY_TITLES[node.effect] || node.effect);
    const idxTag = dom("span", "nle-tag mono", `#${nodeIdx + 1}`);
    titleGroup.replaceChildren(bypassBtn, titleSpan, idxTag);

    const actions = dom("div", "btn-row");
    const kfActive = Boolean(node.kfOpen || node.keyframes.length > 0);
    const kfLabel = node.keyframes.length > 0
      ? `${t("fx.kf.toggle")} (${node.keyframes.length})`
      : t("fx.kf.toggle");
    const kfBtn = dom(
      "button",
      `btn btn-mini fx-kf-toggle-btn${kfActive ? " is-active" : ""}`,
      kfLabel
    );
    kfBtn.type = "button";
    kfBtn.setAttribute("aria-pressed", kfActive ? "true" : "false");
    kfBtn.addEventListener("click", () => {
      node.kfOpen = !kfActive;
      renderFxStack();
      redrawFxKeyframeCanvases();
    });

    const rstBtn = dom("button", "btn btn-mini", t("fx.controls.reset"));
    rstBtn.type = "button";
    rstBtn.addEventListener("click", () => {
      const def = createDefaultFxNode(node.effect);
      node.params = { ...def.params };
      node.keyframes = [];
      node.kfOpen = false;
      node.enabled = true;
      state.fxActivePresetId = "";
      renderFxStack();
      redrawActiveCanvases();
      scheduleFxCompile();
    });

    const rmBtn = dom("button", "btn btn-mini", t("fx.controls.remove"));
    rmBtn.type = "button";
    rmBtn.addEventListener("click", () => {
      state.fxStack.splice(nodeIdx, 1);
      state.fxActivePresetId = "";
      renderFxStack();
      redrawActiveCanvases();
      scheduleFxCompile();
    });

    actions.replaceChildren(kfBtn, rstBtn, rmBtn);
    head.replaceChildren(titleGroup, actions);

    // Parameters
    const paramGrid = dom("div", "fx-param-grid");
    const specs = getFxSpecs(node.effect);
    for (const spec of specs) {
      const row = dom("div", "fx-param-row");
      const inputId = `fx-node-${nodeIdx}-${spec.name}`;
      const labelText = getFxParamLabel(spec);
      const label = dom("label", "fx-param-label", labelText);
      label.setAttribute("for", inputId);

      const curVal = node.params[spec.name] !== undefined ? node.params[spec.name] : spec.default;

      if (spec.kind === "color") {
        const colorWrap = dom("div", "fx-color-control");
        const colorInput = dom("input", "fx-color-input");
        colorInput.type = "color";
        colorInput.id = inputId;
        colorInput.value = String(curVal);

        const hexReadout = dom("span", "mono nle-tag", String(curVal).toUpperCase());
        colorInput.addEventListener("input", () => {
          node.params[spec.name] = colorInput.value;
          hexReadout.textContent = colorInput.value.toUpperCase();
          state.fxActivePresetId = "";
          redrawActiveCanvases();
          scheduleFxCompile();
        });
        colorWrap.replaceChildren(colorInput, hexReadout);
        row.replaceChildren(label, colorWrap, dom("span", "mono", "HEX"));
      } else if (spec.kind === "enum") {
        const options = Array.isArray(spec.options) && spec.options.length > 0
          ? spec.options
          : [String(spec.default)];
        const selectEl = dom("select", "input-select mono");
        selectEl.id = inputId;
        selectEl.setAttribute("aria-label", labelText);
        const curStr = String(curVal);
        const optEls = options.map((optVal) => {
          const opt = dom("option", "", getFxEnumOptionLabel(spec, optVal));
          opt.value = String(optVal);
          if (String(optVal) === curStr) opt.selected = true;
          return opt;
        });
        selectEl.replaceChildren(...optEls);
        const badgeEl = dom("span", "mono nle-tag", getFxEnumOptionLabel(spec, curStr));
        selectEl.addEventListener("change", () => {
          node.params[spec.name] = selectEl.value;
          badgeEl.textContent = getFxEnumOptionLabel(spec, selectEl.value);
          state.fxActivePresetId = "";
          redrawActiveCanvases();
          scheduleFxCompile();
        });
        row.replaceChildren(label, selectEl, badgeEl);
      } else {
        const slider = dom("input");
        slider.type = "range";
        slider.id = inputId;
        slider.min = String(spec.min_val ?? 0);
        slider.max = String(spec.max_val ?? 1);
        slider.step = String(spec.step ?? 0.01);
        slider.value = String(curVal);

        const numInput = dom("input", "input-num mono");
        numInput.type = "number";
        numInput.min = String(spec.min_val ?? 0);
        numInput.max = String(spec.max_val ?? 1);
        numInput.step = String(spec.step ?? 0.01);
        numInput.value = String(curVal);
        numInput.setAttribute("aria-label", `${labelText} value`);

        slider.addEventListener("input", () => {
          const val = Number.parseFloat(slider.value);
          if (Number.isFinite(val)) {
            node.params[spec.name] = spec.kind === "int" ? Math.round(val) : val;
            numInput.value = String(node.params[spec.name]);
            state.fxActivePresetId = "";
            redrawActiveCanvases();
            scheduleFxCompile();
          }
        });

        numInput.addEventListener("change", () => {
          const val = Number.parseFloat(numInput.value);
          if (Number.isFinite(val)) {
            const minV = spec.min_val ?? 0;
            const maxV = spec.max_val ?? 1;
            const clamped = Math.min(maxV, Math.max(minV, val));
            node.params[spec.name] = spec.kind === "int" ? Math.round(clamped) : clamped;
            slider.value = String(node.params[spec.name]);
            numInput.value = String(node.params[spec.name]);
            state.fxActivePresetId = "";
            redrawActiveCanvases();
            scheduleFxCompile();
          }
        });

        row.replaceChildren(label, slider, numInput);
      }

      paramGrid.appendChild(row);
    }

    const cardChildren = [head, paramGrid];

    if (kfActive) {
      const kfPanel = dom("div", "fx-kf-panel");
      const kfToolbar = dom("div", "fx-kf-toolbar");

      const fadeInBtn = dom("button", "btn btn-chip mono", t("fx.kf.fadeIn"));
      fadeInBtn.type = "button";
      fadeInBtn.addEventListener("click", () => {
        applyFadeToNode(node, "in");
        renderFxStack();
        redrawActiveCanvases();
        scheduleFxCompile();
      });

      const fadeOutBtn = dom("button", "btn btn-chip mono", t("fx.kf.fadeOut"));
      fadeOutBtn.type = "button";
      fadeOutBtn.addEventListener("click", () => {
        applyFadeToNode(node, "out");
        renderFxStack();
        redrawActiveCanvases();
        scheduleFxCompile();
      });

      const fadeBothBtn = dom("button", "btn btn-chip mono", t("fx.kf.fadeInOut"));
      fadeBothBtn.type = "button";
      fadeBothBtn.addEventListener("click", () => {
        applyFadeToNode(node, "in_out");
        renderFxStack();
        redrawActiveCanvases();
        scheduleFxCompile();
      });

      const addKfBtn = dom("button", "btn btn-mini mono", t("fx.kf.addAtPlayhead"));
      addKfBtn.type = "button";
      addKfBtn.addEventListener("click", () => {
        const curT = Number((state.playheadFrame / getTimelineFps()).toFixed(2));
        const existing = node.keyframes.find((k) => Math.abs(Number(k.time_s) - curT) < 0.02);
        if (existing) {
          existing.value = existing.value > 0 ? 0.0 : 1.0;
        } else {
          node.keyframes.push({ time_s: curT, value: 1.0, easing: "ease_in_out" });
        }
        node.keyframes.sort((a, b) => Number(a.time_s) - Number(b.time_s));
        node.kfOpen = true;
        renderFxStack();
        redrawActiveCanvases();
        scheduleFxCompile();
      });

      const clearKfBtn = dom("button", "btn btn-mini mono", t("fx.kf.clear"));
      clearKfBtn.type = "button";
      clearKfBtn.addEventListener("click", () => {
        node.keyframes = [];
        renderFxStack();
        redrawActiveCanvases();
        scheduleFxCompile();
      });

      kfToolbar.replaceChildren(fadeInBtn, fadeOutBtn, fadeBothBtn, addKfBtn, clearKfBtn);

      const curveWell = dom("div", "fx-kf-canvas-well");
      const curveCanvas = dom("canvas", "fx-kf-canvas");
      curveCanvas.setAttribute("data-node-idx", String(nodeIdx));
      curveCanvas.setAttribute("aria-label", `${FX_DISPLAY_TITLES[node.effect] || node.effect} keyframe curve`);
      curveWell.appendChild(curveCanvas);

      const kfList = dom("div", "fx-kf-list");
      if (node.keyframes.length === 0) {
        kfList.appendChild(dom("div", "fx-kf-empty", t("fx.kf.empty")));
      } else {
        node.keyframes.forEach((kf, kfIdx) => {
          const kfRow = dom("div", "fx-kf-row");

          const tWrap = dom("label", "fx-kf-field");
          tWrap.appendChild(dom("span", "fx-kf-field-label", t("fx.kf.time")));
          const tInput = dom("input", "input-num mono");
          tInput.type = "number";
          tInput.min = "0";
          tInput.max = "86400";
          tInput.step = "0.1";
          tInput.value = String(kf.time_s);
          tInput.addEventListener("input", () => {
            const parsed = Number.parseFloat(tInput.value);
            if (Number.isFinite(parsed) && parsed >= 0) {
              kf.time_s = parsed;
              redrawActiveCanvases();
              scheduleFxCompile();
            }
          });
          tInput.addEventListener("change", () => {
            const parsed = Number.parseFloat(tInput.value);
            kf.time_s = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
            node.keyframes.sort((a, b) => Number(a.time_s) - Number(b.time_s));
            renderFxStack();
            redrawActiveCanvases();
            scheduleFxCompile();
          });
          tWrap.appendChild(tInput);

          const vWrap = dom("label", "fx-kf-field");
          vWrap.appendChild(dom("span", "fx-kf-field-label", t("fx.kf.value")));
          const vInput = dom("input", "input-num mono");
          vInput.type = "number";
          vInput.min = "0";
          vInput.max = "2";
          vInput.step = "0.05";
          vInput.value = String(kf.value);
          vInput.addEventListener("input", () => {
            const parsed = Number.parseFloat(vInput.value);
            if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 2) {
              kf.value = parsed;
              redrawActiveCanvases();
              scheduleFxCompile();
            }
          });
          vInput.addEventListener("change", () => {
            const parsed = Number.parseFloat(vInput.value);
            kf.value = Number.isFinite(parsed) ? Math.min(2, Math.max(0, parsed)) : 1;
            vInput.value = String(kf.value);
            redrawActiveCanvases();
            scheduleFxCompile();
          });
          vWrap.appendChild(vInput);

          const eWrap = dom("label", "fx-kf-field");
          eWrap.appendChild(dom("span", "fx-kf-field-label", t("fx.kf.easing")));
          const eSelect = dom("select", "input-control mono");
          for (const optVal of ["linear", "ease_in", "ease_out", "ease_in_out"]) {
            const opt = dom("option", "", optVal);
            opt.value = optVal;
            if ((kf.easing || "linear") === optVal) opt.selected = true;
            eSelect.appendChild(opt);
          }
          eSelect.addEventListener("change", () => {
            kf.easing = eSelect.value;
            redrawActiveCanvases();
            scheduleFxCompile();
          });
          eWrap.appendChild(eSelect);

          const delKfBtn = dom("button", "btn btn-mini mono", "x");
          delKfBtn.type = "button";
          delKfBtn.setAttribute("aria-label", `Delete keyframe ${kfIdx + 1}`);
          delKfBtn.addEventListener("click", () => {
            node.keyframes.splice(kfIdx, 1);
            renderFxStack();
            redrawActiveCanvases();
            scheduleFxCompile();
          });

          kfRow.replaceChildren(tWrap, vWrap, eWrap, delKfBtn);
          kfList.appendChild(kfRow);
        });
      }

      kfPanel.replaceChildren(kfToolbar, curveWell, kfList);
      cardChildren.push(kfPanel);
    }

    card.replaceChildren(...cardChildren);
    return card;
  });

  container.replaceChildren(...cards);
  window.requestAnimationFrame(redrawFxKeyframeCanvases);
}

function applyFxPreset(presetId) {
  let presetNodes = null;
  if (state.fxPresets) {
    const found = state.fxPresets.find((p) => p.id === presetId);
    if (found) presetNodes = found.nodes;
  }
  if (!presetNodes) {
    presetNodes = FX_PRESET_FALLBACK[presetId];
  }
  if (!presetNodes) return;

  state.fxStack = presetNodes.map((n) => ({
    effect: n.effect,
    enabled: n.enabled !== false,
    params: { ...n.params },
    keyframes: Array.isArray(n.keyframes) ? n.keyframes.map((k) => ({ ...k })) : [],
    kfOpen: false
  }));
  state.fxBypassAll = false;
  state.fxActivePresetId = presetId;
  renderFxStack();
  redrawActiveCanvases();
  compileFxNow();
}

function addFxNode(effect) {
  state.fxStack.push(createDefaultFxNode(effect));
  state.fxBypassAll = false;
  state.fxActivePresetId = "";
  renderFxStack();
  redrawActiveCanvases();
  compileFxNow();
}

/* PAGE 3: TITLES & LOWER-THIRDS GENERATOR */
function updateTitleTimingBadges() {
  const ov = state.titleOverlay;
  const fps = getTimelineFps();
  const tSec = state.playheadFrame / fps;
  const hasText = Boolean(ov.title.trim() || ov.subtitle.trim());
  const inWindow = ov.enabled && hasText && tSec >= ov.start_s && tSec <= ov.end_s;

  const onAirBadge = byId("title-onair-badge");
  if (onAirBadge) {
    if (!ov.enabled) {
      onAirBadge.textContent = "BYPASSED";
      onAirBadge.className = "nle-tag mono";
    } else if (!hasText) {
      onAirBadge.textContent = "EMPTY";
      onAirBadge.className = "nle-tag is-warn mono";
    } else if (inWindow) {
      onAirBadge.textContent = "ON AIR";
      onAirBadge.className = "nle-tag is-pass mono";
    } else {
      onAirBadge.textContent = "STANDBY";
      onAirBadge.className = "nle-tag is-blue mono";
    }
  }

  const toggleBtn = byId("btn-title-toggle");
  if (toggleBtn) {
    toggleBtn.textContent = ov.enabled ? t("titles.btn.enabled") : t("titles.btn.bypassed");
    toggleBtn.setAttribute("aria-pressed", ov.enabled ? "true" : "false");
    toggleBtn.classList.toggle("is-active", ov.enabled);
  }

  const winBadge = byId("titles-window-badge");
  if (winBadge) {
    winBadge.textContent = `${ov.start_s.toFixed(2)}s - ${ov.end_s.toFixed(2)}s`;
  }

  const kv = byId("title-window-kv");
  if (kv) {
    const dur = Math.max(0, ov.end_s - ov.start_s);
    renderKv(kv, [
      ["Preset", ov.preset_id],
      ["Position", ov.position],
      ["Accent", ov.accent_color],
      ["Playhead", `${tSec.toFixed(2)}s (${inWindow ? "VISIBLE" : "HIDDEN"})`],
      ["Window", `${ov.start_s.toFixed(2)}s .. ${ov.end_s.toFixed(2)}s (${dur.toFixed(2)}s)`]
    ]);
  }
}

function updateTitlePresetButtons() {
  for (const btn of document.querySelectorAll("[data-title-preset]")) {
    const pid = btn.getAttribute("data-title-preset");
    const isMatch = pid === state.titleOverlay.preset_id;
    btn.classList.toggle("is-active", isMatch);
    btn.setAttribute("aria-pressed", isMatch ? "true" : "false");
  }
}

function syncTitleInputsFromState() {
  const ov = state.titleOverlay;
  const titleEl = byId("title-text-input");
  const subEl = byId("title-subtitle-input");
  const posEl = byId("title-position-select");
  const colEl = byId("title-accent-color");
  const hexEl = byId("title-accent-hex");
  const startEl = byId("title-start-input");
  const endEl = byId("title-end-input");
  const fsRange = byId("title-font-size-range");
  const fsNum = byId("title-font-size-num");
  const opRange = byId("title-opacity-range");
  const opNum = byId("title-opacity-num");

  if (titleEl) titleEl.value = ov.title;
  if (subEl) subEl.value = ov.subtitle;
  if (posEl) posEl.value = ov.position;
  if (colEl) colEl.value = ov.accent_color;
  if (hexEl) hexEl.textContent = ov.accent_color;
  if (startEl) startEl.value = String(ov.start_s);
  if (endEl) endEl.value = String(ov.end_s);
  if (fsRange) fsRange.value = String(ov.font_size);
  if (fsNum) fsNum.value = String(ov.font_size);
  if (opRange) opRange.value = String(ov.box_opacity);
  if (opNum) opNum.value = ov.box_opacity.toFixed(2);
  updateTitlePresetButtons();
  updateTitleTimingBadges();
}

function applyTitlePreset(presetId) {
  let presetParams = null;
  if (state.titlePresetsCatalog) {
    const found = state.titlePresetsCatalog.find((p) => p.id === presetId);
    if (found && found.params) presetParams = found.params;
  }
  if (!presetParams && TITLE_PRESETS_FALLBACK[presetId]) {
    presetParams = TITLE_PRESETS_FALLBACK[presetId].params;
  }
  if (!presetParams) return;
  state.titleOverlay = cloneTitleParams(presetParams);
  syncTitleInputsFromState();
  redrawActiveCanvases();
  compileTitleNow();
}

function renderTitleCompileResult(res) {
  state.titleLastCompile = res;
  const badge = byId("title-compile-badge");
  const out = byId("title-filtergraph-output");
  const kv = byId("title-compile-kv");
  if (!badge || !out || !kv) return;

  if (!res || !res.is_active || !res.filtergraph) {
    badge.textContent = "INACTIVE";
    badge.className = "nle-tag mono";
    out.textContent = t("titles.compiler.empty");
    renderKv(kv, [
      ["Status", state.titleOverlay.enabled ? "EMPTY TEXT" : "BYPASSED"],
      ["Position", state.titleOverlay.position]
    ]);
    return;
  }
  badge.textContent = "COMPILED";
  badge.className = "nle-tag is-active mono";
  out.textContent = res.filtergraph;
  renderKv(kv, [
    ["Status", "ACTIVE"],
    ["Escaped Title", res.escaped_title || t("common.none")],
    ["Escaped Subtitle", res.escaped_subtitle || t("common.none")],
    ["Time Gate", `between(t,${res.params.start_s.toFixed(3)},${res.params.end_s.toFixed(3)})`]
  ]);
}

function scheduleTitleCompile() {
  if (state.titleCompileTimer !== null) {
    window.clearTimeout(state.titleCompileTimer);
  }
  state.titleCompileTimer = window.setTimeout(compileTitleNow, 110);
}

async function compileTitleNow() {
  const seq = ++state.titleCompileSeq;
  try {
    const res = await api.compileTitle({ title_overlay: state.titleOverlay });
    if (seq !== state.titleCompileSeq) return;
    renderTitleCompileResult(res);
  } catch (err) {
    if (seq !== state.titleCompileSeq) return;
    const badge = byId("title-compile-badge");
    const out = byId("title-filtergraph-output");
    if (badge) {
      badge.textContent = "ERROR";
      badge.className = "nle-tag is-fail mono";
    }
    if (out) out.textContent = `# ${err.message}`;
  }
}

/* PAGE 3: CAPTIONS & SUBTITLES TRACK (.SRT / .VTT) */
const SAMPLE_SRT_TEXT = [
  "1",
  "00:00:00,500 --> 00:00:02,800",
  "Clean-room OpenTimelineIO interchange",
  "",
  "2",
  "00:00:03,200 --> 00:00:06,400",
  "Rec.709 color science and broadcast QA",
  "",
  "3",
  "00:00:07,000 --> 00:00:10,500",
  "Deterministic FFmpeg NVENC delivery",
  ""
].join("\n");

function formatCueTimecode(seconds) {
  const totalMs = Math.max(0, Math.round(Number(seconds || 0) * 1000));
  const hh = Math.floor(totalMs / 3600000);
  const mm = Math.floor((totalMs % 3600000) / 60000);
  const ss = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function formatCuesAsSrtLocal(cues) {
  return cues
    .map((c, idx) => `${idx + 1}\n${formatCueTimecode(c.start_s)} --> ${formatCueTimecode(c.end_s)}\n${c.text}`)
    .join("\n\n");
}

function updateSubtitleStyleButtons() {
  for (const btn of document.querySelectorAll("[data-subtitle-style]")) {
    const sid = btn.getAttribute("data-subtitle-style");
    const isMatch = sid === state.subtitleTrack.style;
    btn.classList.toggle("is-active", isMatch);
    btn.setAttribute("aria-pressed", isMatch ? "true" : "false");
  }
}

function updateSubtitleTimingBadges() {
  const sub = state.subtitleTrack;
  const fps = getTimelineFps();
  const tSec = state.playheadFrame / fps;
  const activeCue = findActiveSubtitleCue(sub, tSec);

  const onAirBadge = byId("subtitle-onair-badge");
  if (onAirBadge) {
    if (!sub.enabled) {
      onAirBadge.textContent = "BYPASSED";
      onAirBadge.className = "nle-tag mono";
    } else if (sub.cues.length === 0) {
      onAirBadge.textContent = "EMPTY";
      onAirBadge.className = "nle-tag is-warn mono";
    } else if (activeCue) {
      onAirBadge.textContent = `ON AIR #${activeCue.index}`;
      onAirBadge.className = "nle-tag is-pass mono";
    } else {
      onAirBadge.textContent = "STANDBY";
      onAirBadge.className = "nle-tag is-blue mono";
    }
  }

  const countBadge = byId("subtitle-cue-count-badge");
  if (countBadge) {
    countBadge.textContent = `${sub.cues.length} CUES`;
  }

  const toggleBtn = byId("btn-subtitle-toggle");
  if (toggleBtn) {
    toggleBtn.textContent = sub.enabled ? t("subtitles.btn.enabled") : t("subtitles.btn.bypassed");
    toggleBtn.setAttribute("aria-pressed", sub.enabled ? "true" : "false");
    toggleBtn.classList.toggle("is-active", sub.enabled);
  }

  const list = byId("subtitle-cue-list");
  if (list) {
    for (const row of list.querySelectorAll(".subtitle-cue-row")) {
      const idx = Number.parseInt(row.getAttribute("data-cue-idx") || "-1", 10);
      const cue = sub.cues[idx];
      const isActive = Boolean(activeCue && cue && activeCue.index === cue.index);
      row.classList.toggle("is-active-cue", isActive);
    }
  }
}

function renderSubtitleCueList() {
  const list = byId("subtitle-cue-list");
  if (!list) return;
  const cues = state.subtitleTrack.cues;
  if (!cues || cues.length === 0) {
    list.replaceChildren(dom("div", "subtitle-cue-empty", t("subtitles.cues.empty")));
    updateSubtitleTimingBadges();
    return;
  }

  const fps = getTimelineFps();
  const rows = cues.map((cue, idx) => {
    cue.index = idx + 1;
    const row = dom("div", "subtitle-cue-row");
    row.setAttribute("role", "listitem");
    row.setAttribute("data-cue-idx", String(idx));

    const head = dom("div", "subtitle-cue-head");
    const jumpBtn = dom(
      "button",
      "btn btn-mini mono",
      `#${cue.index} @ ${formatCueTimecode(cue.start_s)}`
    );
    jumpBtn.type = "button";
    jumpBtn.addEventListener("click", () => {
      stopPlayback();
      const targetFrame = Math.max(0, Math.round(cue.start_s * fps));
      setPlayhead(targetFrame);
    });

    const timesWrap = dom("div", "subtitle-cue-times mono");
    const startInput = dom("input", "input-num subtitle-time-num");
    startInput.type = "number";
    startInput.step = "0.1";
    startInput.min = "0";
    startInput.max = "86400";
    startInput.value = String(cue.start_s);
    startInput.setAttribute("aria-label", `Cue ${cue.index} start seconds`);
    startInput.addEventListener("input", () => {
      const val = Number.parseFloat(startInput.value);
      if (Number.isFinite(val) && val >= 0 && val < cue.end_s) {
        cue.start_s = Number(val.toFixed(3));
        jumpBtn.textContent = `#${cue.index} @ ${formatCueTimecode(cue.start_s)}`;
        updateSubtitleTimingBadges();
        redrawActiveCanvases();
        scheduleSubtitleCompile();
      }
    });
    startInput.addEventListener("blur", () => {
      const raw = Number.parseFloat(startInput.value);
      if (!Number.isFinite(raw) || raw < 0 || raw >= cue.end_s) {
        startInput.value = String(cue.start_s);
      }
    });

    const arrowSpan = dom("span", "nle-tag mono", "->");
    const endInput = dom("input", "input-num subtitle-time-num");
    endInput.type = "number";
    endInput.step = "0.1";
    endInput.min = "0.1";
    endInput.max = "86400";
    endInput.value = String(cue.end_s);
    endInput.setAttribute("aria-label", `Cue ${cue.index} end seconds`);
    endInput.addEventListener("input", () => {
      const val = Number.parseFloat(endInput.value);
      if (Number.isFinite(val) && val > cue.start_s && val <= 86400) {
        cue.end_s = Number(val.toFixed(3));
        updateSubtitleTimingBadges();
        redrawActiveCanvases();
        scheduleSubtitleCompile();
      }
    });
    endInput.addEventListener("blur", () => {
      const raw = Number.parseFloat(endInput.value);
      if (!Number.isFinite(raw) || raw <= cue.start_s || raw > 86400) {
        endInput.value = String(cue.end_s);
      }
    });

    const delBtn = dom("button", "btn btn-mini mono", "x");
    delBtn.type = "button";
    delBtn.setAttribute("aria-label", `Delete cue ${cue.index}`);
    delBtn.addEventListener("click", () => {
      state.subtitleTrack.cues.splice(idx, 1);
      renderSubtitleCueList();
      redrawActiveCanvases();
      compileSubtitlesNow();
    });

    timesWrap.append(startInput, arrowSpan, endInput);
    head.append(jumpBtn, timesWrap, delBtn);

    const textInput = dom("input", "input-control subtitle-cue-text-input");
    textInput.type = "text";
    textInput.maxLength = 300;
    textInput.value = cue.text;
    textInput.setAttribute("aria-label", `Cue ${cue.index} caption text`);
    textInput.addEventListener("input", () => {
      cue.text = textInput.value;
      updateSubtitleTimingBadges();
      redrawActiveCanvases();
      scheduleSubtitleCompile();
    });

    row.append(head, textInput);
    return row;
  });

  list.replaceChildren(...rows);
  updateSubtitleTimingBadges();
}

function renderSubtitleCompileResult(res) {
  state.subtitleLastCompile = res;
  const badge = byId("subtitle-compile-badge");
  const out = byId("subtitle-filtergraph-output");
  if (!badge || !out) return;

  if (!res || !res.is_active || !res.filtergraph) {
    badge.textContent = "INACTIVE";
    badge.className = "nle-tag mono";
    out.textContent = t("subtitles.compiler.empty");
    return;
  }
  badge.textContent = `COMPILED (${res.cue_count})`;
  badge.className = "nle-tag is-active mono";
  out.textContent = res.filtergraph;
}

function scheduleSubtitleCompile() {
  if (state.subtitleCompileTimer !== null) {
    window.clearTimeout(state.subtitleCompileTimer);
  }
  state.subtitleCompileTimer = window.setTimeout(compileSubtitlesNow, 120);
}

async function compileSubtitlesNow() {
  try {
    const validCues = state.subtitleTrack.cues.filter(
      (c) => String(c.text || "").trim().length > 0 && c.end_s > c.start_s
    );
    const payload = {
      subtitle_track: {
        ...state.subtitleTrack,
        cues: validCues
      }
    };
    const res = await api.compileSubtitles(payload);
    renderSubtitleCompileResult(res);
  } catch (err) {
    const badge = byId("subtitle-compile-badge");
    const out = byId("subtitle-filtergraph-output");
    if (badge) {
      badge.textContent = "ERROR";
      badge.className = "nle-tag is-fail mono";
    }
    if (out) out.textContent = `# ${err.message}`;
  }
}

async function parseSubtitleRawInput(rawContent, format = "auto") {
  try {
    const res = await api.parseSubtitles({ content: rawContent, format });
    state.subtitleTrack.cues = Array.isArray(res.cues) ? res.cues : [];
    renderSubtitleCueList();
    redrawActiveCanvases();
    await compileSubtitlesNow();
    showBanner(`Parsed ${res.cue_count} caption cues (${String(res.format || "srt").toUpperCase()}).`, "success");
  } catch (err) {
    showBanner(err.message, "error");
  }
}

async function exportSubtitlesAndDownload(format) {
  try {
    const validCues = state.subtitleTrack.cues.filter(
      (c) => String(c.text || "").trim().length > 0 && c.end_s > c.start_s
    );
    const res = await api.exportSubtitles({
      cues: validCues,
      format,
      filename: `captions.${format}`
    });
    const rawEl = byId("subtitle-raw-input");
    if (rawEl) rawEl.value = res.content || "";
    const mime = format === "vtt" ? "text/vtt;charset=utf-8" : "text/plain;charset=utf-8";
    triggerBlobDownload(new Blob([res.content || ""], { type: mime }), res.filename || `captions.${format}`);
    showBanner(`Exported ${res.cue_count} cues as .${format}.`, "success");
  } catch (err) {
    showBanner(err.message, "error");
  }
}

function syncSubtitleControlsFromState() {
  const sub = state.subtitleTrack;
  const fsRange = byId("subtitle-font-size-range");
  const fsNum = byId("subtitle-font-size-num");
  const rawEl = byId("subtitle-raw-input");
  if (fsRange) fsRange.value = String(sub.font_size);
  if (fsNum) fsNum.value = String(sub.font_size);
  if (rawEl && !rawEl.value.trim() && sub.cues.length > 0) {
    rawEl.value = formatCuesAsSrtLocal(sub.cues);
  }
  updateSubtitleStyleButtons();
  renderSubtitleCueList();
}

/* PAGE 4: COLOR WHEELS, LUMETRI TONE, SCOPES, FFMPEG & .CUBE */
const COLOR_WHEEL_BINDINGS = [
  { group: "lift", idx: 0, range: "lift-r-range", num: "lift-r-num", min: -1, max: 1, decimals: 2 },
  { group: "lift", idx: 1, range: "lift-g-range", num: "lift-g-num", min: -1, max: 1, decimals: 2 },
  { group: "lift", idx: 2, range: "lift-b-range", num: "lift-b-num", min: -1, max: 1, decimals: 2 },
  { group: "gamma", idx: 0, range: "gamma-r-range", num: "gamma-r-num", min: -1, max: 1, decimals: 2 },
  { group: "gamma", idx: 1, range: "gamma-g-range", num: "gamma-g-num", min: -1, max: 1, decimals: 2 },
  { group: "gamma", idx: 2, range: "gamma-b-range", num: "gamma-b-num", min: -1, max: 1, decimals: 2 },
  { group: "gain", idx: 0, range: "gain-r-range", num: "gain-r-num", min: -1, max: 1, decimals: 2 },
  { group: "gain", idx: 1, range: "gain-g-range", num: "gain-g-num", min: -1, max: 1, decimals: 2 },
  { group: "gain", idx: 2, range: "gain-b-range", num: "gain-b-num", min: -1, max: 1, decimals: 2 }
];

const COLOR_TONE_BINDINGS = [
  { key: "contrast", range: "grade-contrast-range", num: "grade-contrast-num", reset: "btn-reset-contrast", min: 0, max: 2, def: 1.0, decimals: 2 },
  { key: "saturation", range: "grade-saturation-range", num: "grade-saturation-num", reset: "btn-reset-saturation", min: 0, max: 3, def: 1.0, decimals: 2 },
  { key: "temperature", range: "grade-temperature-range", num: "grade-temperature-num", reset: "btn-reset-temperature", min: -1, max: 1, def: 0.0, decimals: 2 }
];

function clampColorNum(val, minVal, maxVal) {
  return Math.min(maxVal, Math.max(minVal, val));
}

function updateColorPresetBadges() {
  const activeId = state.colorActivePresetId;
  for (const btn of document.querySelectorAll("[data-grade-preset]")) {
    const pid = btn.getAttribute("data-grade-preset");
    const isMatch = pid === activeId;
    btn.classList.toggle("is-active", isMatch);
    btn.setAttribute("aria-pressed", isMatch ? "true" : "false");
  }
  const badge = byId("color-preset-badge");
  if (badge) {
    const presetObj = COLOR_GRADE_PRESETS[activeId];
    badge.textContent = presetObj ? presetObj.name : "Custom Grade";
    badge.className = `nle-tag mono ${presetObj ? "is-active" : "is-blue"}`;
  }
}

function renderColorCompileResult(res) {
  state.colorLastCompile = res;
  const badge = byId("color-compile-badge");
  const out = byId("color-filtergraph-output");
  if (!badge || !out) return;
  if (!res || !res.filtergraph) {
    badge.textContent = "UNITY";
    badge.className = "nle-tag mono";
    out.textContent = "";
    return;
  }
  badge.textContent = res.is_identity ? "UNITY" : "GRADED";
  badge.className = `nle-tag mono ${res.is_identity ? "" : "is-pass"}`;
  out.textContent = res.filtergraph;
}

async function compileColorNow() {
  const seq = ++state.colorCompileSeq;
  try {
    const compiled = await api.compileColorGrade({ grade: state.colorGrade });
    if (seq !== state.colorCompileSeq) return;
    renderColorCompileResult(compiled);
  } catch (err) {
    if (seq !== state.colorCompileSeq) return;
    showBanner(err.message, "error");
  }
}

function scheduleColorCompile() {
  if (state.colorCompileTimer !== null) {
    window.clearTimeout(state.colorCompileTimer);
  }
  state.colorCompileTimer = window.setTimeout(() => {
    state.colorCompileTimer = null;
    compileColorNow();
  }, 80);
}

function syncColorInputsFromState() {
  for (const b of COLOR_WHEEL_BINDINGS) {
    const val = state.colorGrade[b.group][b.idx];
    const rEl = byId(b.range);
    const nEl = byId(b.num);
    if (rEl) rEl.value = String(val);
    if (nEl) nEl.value = val.toFixed(b.decimals);
  }
  for (const tb of COLOR_TONE_BINDINGS) {
    const val = state.colorGrade[tb.key];
    const rEl = byId(tb.range);
    const nEl = byId(tb.num);
    if (rEl) rEl.value = String(val);
    if (nEl) nEl.value = val.toFixed(tb.decimals);
  }
  updateColorPresetBadges();
  if (state.activeTab === "color" || state.activeTab === "timeline" || state.activeTab === "fx") {
    redrawActiveCanvases();
  }
}

function applyColorPresetUI(presetId) {
  let presetParams = null;
  if (Array.isArray(state.colorPresetsCatalog)) {
    const found = state.colorPresetsCatalog.find((p) => p.id === presetId);
    if (found && found.params) presetParams = found.params;
  }
  if (!presetParams && COLOR_GRADE_PRESETS[presetId]) {
    presetParams = COLOR_GRADE_PRESETS[presetId].params;
  }
  if (!presetParams) return;
  state.colorGrade = cloneGradeParams(presetParams);
  state.colorActivePresetId = presetId;
  syncColorInputsFromState();
  compileColorNow();
}

function syncSplitWipeControls(target) {
  const isColor = target === "color";
  const wipe = isColor ? state.colorSplitWipe : state.fxSplitWipe;
  const clampedPct = clampSplitWipePercent(wipe.positionPct, SPLIT_WIPE_POS_DEFAULT);
  wipe.positionPct = clampedPct;
  if (isColor) {
    state.wipeRatio = clampedPct / 100;
  }

  const btn = byId(isColor ? "btn-color-split-wipe" : "btn-fx-split-wipe");
  const group = byId(isColor ? "color-split-wipe-group" : "fx-split-wipe-group");
  const slider = byId(isColor ? "cdl-wipe-slider" : "fx-wipe-slider");
  const label = byId(isColor ? "cdl-wipe-label" : "fx-wipe-label");
  const canvas = byId(isColor ? "color-preview-canvas" : "fx-program-canvas");
  const active = Boolean(wipe.enabled);

  if (btn) {
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  }
  if (group) {
    group.classList.toggle("is-enabled", active);
  }
  if (slider) {
    slider.value = String(Math.round(clampedPct));
  }
  if (label) {
    label.textContent = `${Math.round(clampedPct)}%`;
  }
  if (canvas) {
    canvas.classList.toggle("is-wipe-enabled", active);
    if (!active) {
      wipe.isHovered = false;
      wipe.isDragging = false;
      canvas.classList.remove("is-wipe-hover", "is-wipe-dragging");
    }
  }
}

function toggleSplitWipe(target) {
  const wipe = target === "color" ? state.colorSplitWipe : state.fxSplitWipe;
  wipe.enabled = !wipe.enabled;
  syncSplitWipeControls(target);
  redrawActiveCanvases();
}

function toggleActiveSplitWipe() {
  if (state.activeTab === "color") {
    toggleSplitWipe("color");
    return true;
  }
  if (state.activeTab === "fx") {
    toggleSplitWipe("fx");
    return true;
  }
  return false;
}

function dataUrlToPngBlob(dataUrl) {
  const safe = sanitizeStillDataUrl(dataUrl);
  if (!safe) return null;
  const commaIdx = safe.indexOf(",");
  if (commaIdx < 0) return null;
  const b64 = safe.slice(commaIdx + 1);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new Blob([bytes], { type: "image/png" });
}

function downloadStillPng(still) {
  if (!still) return;
  const blob = dataUrlToPngBlob(still.dataUrl);
  if (!blob) return;
  triggerBlobDownload(blob, still.filename);
  showBanner(t("stills.banner.downloaded").replace("{filename}", still.filename), "success");
}

function removeStillFromGallery(stillId) {
  state.stillsGallery = removeStillById(state.stillsGallery, stillId);
  renderStillsGallery();
}

function renderStillsGalleryContainer(container) {
  if (!container) return;
  const stills = Array.isArray(state.stillsGallery) ? state.stillsGallery : [];
  const head = dom("div", "stills-gallery-head");
  head.appendChild(dom("span", "stills-gallery-title", t("stills.gallery.title")));
  head.appendChild(dom("span", "nle-tag mono", `${stills.length}/${STILLS_GALLERY_MAX}`));

  if (stills.length === 0) {
    const emptyMsg = dom("p", "stills-gallery-empty", t("stills.gallery.empty"));
    container.replaceChildren(head, emptyMsg);
    return;
  }

  const list = dom("div", "stills-gallery-list");
  list.setAttribute("role", "list");
  for (const still of stills) {
    const safeUrl = sanitizeStillDataUrl(still.dataUrl);
    if (!safeUrl) continue;

    const card = dom("div", "still-card");
    card.setAttribute("role", "listitem");
    card.dataset.stillId = still.id;

    const dlBtn = dom("button", "still-download-btn");
    dlBtn.type = "button";
    dlBtn.title = `${t("stills.action.download")}: ${still.filename}`;
    dlBtn.setAttribute("aria-label", `${t("stills.action.download")} ${still.filename}`);
    dlBtn.addEventListener("click", () => downloadStillPng(still));

    const img = document.createElement("img");
    img.className = "still-thumb";
    img.src = safeUrl;
    img.alt = `${still.label} ${still.preset || ""} ${still.timecode || still.timestampLabel}`.trim();
    img.loading = "lazy";
    dlBtn.appendChild(img);

    const meta = dom("span", "still-meta");
    const row = dom("span", "still-meta-row");
    const srcPill = dom(
      "span",
      still.source === "fx" ? "still-source-pill is-fx mono" : "still-source-pill mono",
      still.source === "fx" ? t("stills.source.fx") : t("stills.source.color")
    );
    row.appendChild(srcPill);
    row.appendChild(dom("span", "still-time mono", still.timecode || still.timestampLabel));
    meta.appendChild(row);
    if (still.preset) {
      meta.appendChild(dom("span", "still-preset", still.preset));
    }
    dlBtn.appendChild(meta);

    const delBtn = dom("button", "still-delete-btn", "x");
    delBtn.type = "button";
    delBtn.title = t("stills.action.delete");
    delBtn.setAttribute("aria-label", `${t("stills.action.delete")} ${still.filename}`);
    delBtn.addEventListener("click", () => removeStillFromGallery(still.id));

    card.appendChild(dlBtn);
    card.appendChild(delBtn);
    list.appendChild(card);
  }
  container.replaceChildren(head, list);
}

function renderStillsGallery() {
  renderStillsGalleryContainer(byId("color-stills-gallery"));
  renderStillsGalleryContainer(byId("fx-stills-gallery"));
}

function grabMonitorStill(target) {
  const isFx = target === "fx";
  const fps =
    state.timelineDoc && state.timelineDoc.fps
      ? Math.max(1, state.timelineDoc.fps.num / Math.max(1, state.timelineDoc.fps.den))
      : 25;
  const tc = framesToSmpte(state.playheadFrame || 0, fps);

  let capture = null;
  let presetLabel = "";
  if (isFx) {
    const canvas = byId("fx-program-canvas");
    capture = captureCleanFxStill(
      canvas,
      state.timelineDoc,
      state.playheadFrame,
      state.colorGrade,
      getEffectiveFxState(),
      getEffectiveTitleState(false),
      getEffectiveFramingState(),
      getEffectiveSubtitleState(false),
      getEffectiveChromaKeyState()
    );
    presetLabel =
      state.fxActivePresetId ||
      (state.fxStack.length > 0 ? `${state.fxStack.length} FX` : "Program");
  } else {
    const canvas = byId("color-preview-canvas");
    capture = captureCleanColorStill(canvas, state.colorGrade);
    const presetBadge = byId("color-preset-badge");
    presetLabel =
      (presetBadge && presetBadge.textContent ? presetBadge.textContent.trim() : "") ||
      state.colorActivePresetId ||
      "Rec.709";
  }

  if (!capture || !sanitizeStillDataUrl(capture.dataUrl)) {
    return false;
  }

  state.stillSeqCounter += 1;
  const now = new Date();
  const still = createStillRecord({
    id: `still-${isFx ? "fx" : "color"}-${now.getTime()}-${state.stillSeqCounter}`,
    source: isFx ? "fx" : "color",
    dataUrl: capture.dataUrl,
    label: isFx ? "FX" : "COLOR",
    preset: presetLabel,
    timecode: isFx ? tc : "",
    createdAt: now,
    width: capture.width,
    height: capture.height
  });
  state.stillsGallery = appendStillBounded(state.stillsGallery, still, STILLS_GALLERY_MAX);
  renderStillsGallery();
  showBanner(
    t("stills.banner.grabbed")
      .replace("{source}", isFx ? t("stills.source.fx") : t("stills.source.color"))
      .replace("{filename}", still.filename),
    "success"
  );
  return true;
}

function grabActiveMonitorStill() {
  if (state.activeTab === "color") {
    return grabMonitorStill("color");
  }
  if (state.activeTab === "fx") {
    return grabMonitorStill("fx");
  }
  return false;
}

function wireColorInputs() {
  for (const b of COLOR_WHEEL_BINDINGS) {
    const rangeEl = byId(b.range);
    const numEl = byId(b.num);
    rangeEl.addEventListener("input", () => {
      const val = Number.parseFloat(rangeEl.value);
      if (Number.isFinite(val)) {
        state.colorGrade[b.group][b.idx] = clampColorNum(val, b.min, b.max);
        numEl.value = state.colorGrade[b.group][b.idx].toFixed(b.decimals);
        state.colorActivePresetId = "";
        updateColorPresetBadges();
        redrawActiveCanvases();
        scheduleColorCompile();
      }
    });
    numEl.addEventListener("change", () => {
      const val = Number.parseFloat(numEl.value);
      if (Number.isFinite(val)) {
        const clamped = clampColorNum(val, b.min, b.max);
        state.colorGrade[b.group][b.idx] = clamped;
        rangeEl.value = String(clamped);
        numEl.value = clamped.toFixed(b.decimals);
        state.colorActivePresetId = "";
        updateColorPresetBadges();
        redrawActiveCanvases();
        scheduleColorCompile();
      }
    });
  }

  for (const group of ["lift", "gamma", "gain"]) {
    const wheelCanvas = byId(`wheel-${group}`);
    bindColorWheelEvents(
      wheelCanvas,
      group,
      () => state.colorGrade[group],
      (nextRgb) => {
        state.colorGrade[group] = nextRgb;
        state.colorActivePresetId = "";
        syncColorInputsFromState();
        scheduleColorCompile();
      }
    );
    byId(`btn-reset-${group}`).addEventListener("click", () => {
      state.colorGrade[group] = [0.0, 0.0, 0.0];
      state.colorActivePresetId = "";
      syncColorInputsFromState();
      compileColorNow();
    });
  }

  for (const tb of COLOR_TONE_BINDINGS) {
    const rangeEl = byId(tb.range);
    const numEl = byId(tb.num);
    rangeEl.addEventListener("input", () => {
      const val = Number.parseFloat(rangeEl.value);
      if (Number.isFinite(val)) {
        const clamped = clampColorNum(val, tb.min, tb.max);
        state.colorGrade[tb.key] = clamped;
        numEl.value = clamped.toFixed(tb.decimals);
        state.colorActivePresetId = "";
        updateColorPresetBadges();
        redrawActiveCanvases();
        scheduleColorCompile();
      }
    });
    numEl.addEventListener("change", () => {
      const val = Number.parseFloat(numEl.value);
      if (Number.isFinite(val)) {
        const clamped = clampColorNum(val, tb.min, tb.max);
        state.colorGrade[tb.key] = clamped;
        rangeEl.value = String(clamped);
        numEl.value = clamped.toFixed(tb.decimals);
        state.colorActivePresetId = "";
        updateColorPresetBadges();
        redrawActiveCanvases();
        scheduleColorCompile();
      }
    });
    byId(tb.reset).addEventListener("click", () => {
      state.colorGrade[tb.key] = tb.def;
      state.colorActivePresetId = "";
      syncColorInputsFromState();
      compileColorNow();
    });
  }

  const splitWipeDescriptors = {
    color: {
      stateObj: () => state.colorSplitWipe,
      btnId: "btn-color-split-wipe",
      groupId: "color-split-wipe-group",
      sliderId: "cdl-wipe-slider",
      labelId: "cdl-wipe-label",
      canvasId: "color-preview-canvas"
    },
    fx: {
      stateObj: () => state.fxSplitWipe,
      btnId: "btn-fx-split-wipe",
      groupId: "fx-split-wipe-group",
      sliderId: "fx-wipe-slider",
      labelId: "fx-wipe-label",
      canvasId: "fx-program-canvas"
    }
  };

  for (const target of ["color", "fx"]) {
    const desc = splitWipeDescriptors[target];
    const btn = byId(desc.btnId);
    const slider = byId(desc.sliderId);
    const canvas = byId(desc.canvasId);

    if (btn) {
      btn.addEventListener("click", () => toggleSplitWipe(target));
    }
    if (slider) {
      slider.addEventListener("input", () => {
        const wipe = desc.stateObj();
        wipe.positionPct = clampSplitWipePercent(slider.value, wipe.positionPct);
        if (!wipe.enabled) wipe.enabled = true;
        syncSplitWipeControls(target);
        redrawActiveCanvases();
      });
    }
    if (canvas) {
      const toCanvasPoint = (ev) => {
        const geom = canvas._splitWipeGeom;
        if (!geom) return null;
        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return null;
        const scaleX = (geom.canvasWidth || rect.width) / rect.width;
        const scaleY = (geom.canvasHeight || rect.height) / rect.height;
        return {
          geom,
          x: (ev.clientX - rect.left) * scaleX,
          y: (ev.clientY - rect.top) * scaleY
        };
      };

      canvas.addEventListener("pointerdown", (ev) => {
        const wipe = desc.stateObj();
        if (!wipe.enabled) return;
        const pt = toCanvasPoint(ev);
        if (!pt || !isPointerOnSplitWipeDivider(pt.x, pt.y, pt.geom, SPLIT_WIPE_HIT_RADIUS_PX)) {
          return;
        }
        ev.preventDefault();
        wipe.isDragging = true;
        wipe.isHovered = true;
        wipe.positionPct = Math.round(
          computeSplitWipePercentFromPointer(
            pt.x,
            pt.geom.frameRect.x,
            pt.geom.frameRect.width
          )
        );
        canvas.classList.add("is-wipe-dragging");
        if (typeof canvas.setPointerCapture === "function") {
          try {
            canvas.setPointerCapture(ev.pointerId);
          } catch {
            // Ignore synthetic event pointer capture errors
          }
        }
        syncSplitWipeControls(target);
        redrawActiveCanvases();
      });

      canvas.addEventListener("pointermove", (ev) => {
        const wipe = desc.stateObj();
        if (!wipe.enabled) {
          if (wipe.isHovered || wipe.isDragging) {
            wipe.isHovered = false;
            wipe.isDragging = false;
            canvas.classList.remove("is-wipe-hover", "is-wipe-dragging");
          }
          return;
        }
        const pt = toCanvasPoint(ev);
        if (!pt) return;

        if (wipe.isDragging) {
          ev.preventDefault();
          const nextPct = Math.round(
            computeSplitWipePercentFromPointer(
              pt.x,
              pt.geom.frameRect.x,
              pt.geom.frameRect.width
            )
          );
          if (nextPct !== Math.round(wipe.positionPct)) {
            wipe.positionPct = nextPct;
            syncSplitWipeControls(target);
          }
          redrawActiveCanvases();
          return;
        }

        const hit = isPointerOnSplitWipeDivider(pt.x, pt.y, pt.geom, SPLIT_WIPE_HIT_RADIUS_PX);
        if (hit !== wipe.isHovered) {
          wipe.isHovered = hit;
          canvas.classList.toggle("is-wipe-hover", hit);
          redrawActiveCanvases();
        }
      });

      const endWipeDrag = (ev) => {
        const wipe = desc.stateObj();
        if (!wipe.isDragging) return;
        wipe.isDragging = false;
        canvas.classList.remove("is-wipe-dragging");
        if (ev && typeof canvas.releasePointerCapture === "function") {
          try {
            if (canvas.hasPointerCapture && canvas.hasPointerCapture(ev.pointerId)) {
              canvas.releasePointerCapture(ev.pointerId);
            }
          } catch {
            // Ignore pointer release failures
          }
        }
        redrawActiveCanvases();
      };

      canvas.addEventListener("pointerup", endWipeDrag);
      canvas.addEventListener("pointercancel", endWipeDrag);
      canvas.addEventListener("pointerleave", () => {
        const wipe = desc.stateObj();
        if (!wipe.isDragging && wipe.isHovered) {
          wipe.isHovered = false;
          canvas.classList.remove("is-wipe-hover");
          redrawActiveCanvases();
        }
      });
    }
  }

  for (const btn of document.querySelectorAll("[data-grade-preset]")) {
    btn.addEventListener("click", () => {
      const pid = btn.getAttribute("data-grade-preset");
      if (pid) applyColorPresetUI(pid);
    });
  }

  for (const btn of document.querySelectorAll("[data-scope-mode]")) {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-scope-mode");
      if (mode !== "parade" && mode !== "waveform" && mode !== "vectorscope") return;
      state.colorScopeMode = mode;
      for (const other of document.querySelectorAll("[data-scope-mode]")) {
        const active = other.getAttribute("data-scope-mode") === mode;
        other.classList.toggle("is-active", active);
        other.setAttribute("aria-pressed", active ? "true" : "false");
      }
      redrawActiveCanvases();
    });
  }

  byId("btn-cdl-reset").addEventListener("click", () => {
    applyColorPresetUI("rec709_clean");
  });

  byId("cube-size-select").addEventListener("change", () => {
    const s = byId("cube-size-select").value;
    byId("cube-info-badge").textContent = `${s}x${s}x${s}`;
  });
}

async function bakeCubeLut() {
  try {
    const size = Number.parseInt(byId("cube-size-select").value, 10);
    const title = byId("cube-title-input").value.trim() || "taktcut_grade";
    const outPath = byId("cube-out-path").value.trim();
    const payload = {
      grade: state.colorGrade,
      size,
      title,
      out_path: outPath || null
    };
    const data = await api.bakeCube(payload);
    const info = data.info;
    byId("cube-info-badge").textContent = `${info.dimension} ${info.size}^3 (${info.entry_count} pts)`;
    byId("cube-info-badge").className = "nle-tag is-pass mono";

    const lines = data.cube_text.split(/\r?\n/).filter((ln) => ln.trim() !== "");
    const snippet = [
      ...lines.slice(0, 10),
      `... (${lines.length} total lines) ...`,
      ...lines.slice(-4)
    ].join("\n");
    byId("cube-preview-output").textContent = snippet;

    if (data.saved_path && !api.isStaticDemo()) {
      state.lastBakedCubePath = data.saved_path;
      showBanner(`Saved 3D .cube LUT to ${data.saved_path}`, "success");
      await refreshWorkspaceFiles();
    } else {
      showBanner(`Baked & validated ${info.size}x${info.size}x${info.size} .cube LUT`, "success");
    }
  } catch (err) {
    showBanner(err.message, "error");
  }
}

async function downloadCubeLut() {
  try {
    const size = Number.parseInt(byId("cube-size-select").value, 10);
    const title = byId("cube-title-input").value.trim() || "taktcut_grade";
    const blob = await api.downloadCubeBlob({
      grade: state.colorGrade,
      size,
      title,
      filename: `${title}.cube`
    });
    const safeStem = title.replace(/[^A-Za-z0-9._-]/g, "_") || "taktcut_grade";
    triggerBlobDownload(blob, `${safeStem}.cube`);
    showBanner(`Downloaded ${safeStem}.cube`, "success");
  } catch (err) {
    showBanner(err.message, "error");
  }
}

/* PAGE 3: DELIVER / RENDER */
function renderCapabilitiesStrip(caps, ffmpegError, isDemo) {
  const strip = byId("render-caps-strip");
  const pill = byId("ffmpeg-status-pill");
  if (isDemo) {
    pill.textContent = "Static Web Demo";
    pill.className = "nle-tag is-blue mono";
  } else if (!caps) {
    pill.textContent = "FFmpeg: missing";
    pill.className = "nle-tag is-fail mono";
    strip.replaceChildren(
      dom("span", "nle-tag is-fail", ffmpegError || "ffmpeg not found on PATH")
    );
    return;
  } else {
    const hasNvenc = caps.h264_nvenc || caps.hevc_nvenc;
    pill.textContent = hasNvenc ? "FFmpeg + NVENC" : "FFmpeg (CPU)";
    pill.className = hasNvenc ? "nle-tag is-pass mono" : "nle-tag is-blue mono";
  }

  const items = [
    ["h264_nvenc", caps.h264_nvenc],
    ["hevc_nvenc", caps.hevc_nvenc],
    ["libx264", caps.libx264],
    ["libx265", caps.libx265],
    ["prores_ks", caps.prores_ks]
  ];
  const badges = items.map(([label, ok]) =>
    dom("span", `nle-tag ${ok ? "is-pass" : ""}`, `${label}: ${ok ? "ON" : "OFF"}`)
  );
  badges.push(dom("span", "nle-tag", caps.ffmpeg_path));
  strip.replaceChildren(...badges);
}

function setRenderEngine(engine) {
  state.renderEngine = engine === "remote" ? "remote" : "local";
  const isRemote = state.renderEngine === "remote";
  const localBtn = byId("btn-engine-local");
  const remoteBtn = byId("btn-engine-remote");
  const panel = byId("remote-render-panel");
  const pill = byId("remote-node-status-pill");
  if (localBtn) {
    localBtn.classList.toggle("is-active", !isRemote);
    localBtn.setAttribute("aria-pressed", isRemote ? "false" : "true");
  }
  if (remoteBtn) {
    remoteBtn.classList.toggle("is-active", isRemote);
    remoteBtn.setAttribute("aria-pressed", isRemote ? "true" : "false");
  }
  if (panel) panel.classList.toggle("is-hidden", !isRemote);
  if (pill) pill.classList.toggle("is-hidden", !isRemote);
}

async function probeRemoteRenderNode() {
  const pill = byId("remote-node-status-pill");
  const note = byId("remote-node-caps-note");
  try {
    const remote_url = byId("remote-node-url").value.trim();
    const bearer_token = byId("remote-bearer-token").value.trim();
    const data = await api.probeRemoteNode({ remote_url, bearer_token });
    const h = data.health || {};
    const caps = h.capabilities || {};
    const hasNvenc = Boolean(caps.h264_nvenc || caps.hevc_nvenc);
    if (pill) {
      pill.textContent = h.ffmpeg_available ? (hasNvenc ? "ONLINE (NVENC)" : "ONLINE (CPU)") : "NO FFMPEG";
      pill.className = `nle-tag mono ${h.ffmpeg_available ? "is-pass" : "is-warn"}`;
    }
    if (note) {
      note.textContent = `Connected to ${data.remote_url} (v${h.version || "?"} | active jobs: ${h.active_jobs ?? 0})`;
    }
    showBanner(`Remote render node ready: ${data.remote_url}`, "success");
  } catch (err) {
    if (pill) {
      pill.textContent = "ERROR";
      pill.className = "nle-tag mono is-fail";
    }
    if (note) note.textContent = err.message;
    showBanner(err.message, "error");
  }
}

function stopRemotePoll() {
  if (state.remotePollTimer !== null) {
    window.clearTimeout(state.remotePollTimer);
    state.remotePollTimer = null;
  }
}

function renderRemoteJobTelemetry(data) {
  const job = data.job;
  const plan = job.plan;
  const badge = byId("render-encoder-badge");
  if (badge) {
    badge.textContent = `REMOTE | ${job.status.toUpperCase()} (${job.encoder || "..."})`;
    badge.className = `nle-tag mono ${
      job.status === "completed" ? "is-pass" : job.status === "failed" ? "is-fail" : "is-active"
    }`;
  }
  if (plan) {
    const fpsLabel = plan.fps.den === 1 ? String(plan.fps.num) : `${plan.fps.num}/${plan.fps.den}`;
    state.lastRenderCommand = plan.argv.join(" ");
    renderKv(byId("render-plan-kv"), [
      ["Engine", `REMOTE (${data.remote_url || "node"})`],
      ["Job ID", job.job_id],
      ["Status", job.status.toUpperCase()],
      ["Encoder", `${plan.encoder} (${plan.pix_fmt})`],
      ["Rational FPS", fpsLabel],
      ["Video Filter", plan.video_filter || t("common.none")],
      ["Audio Filter", plan.audio_filter || t("common.none")],
      ["Local Output", data.local_output_path || "--"]
    ]);
    byId("render-argv-output").textContent = state.lastRenderCommand;
  }
  const execBox = byId("render-exec-result");
  execBox.classList.remove("is-hidden");
  byId("render-exec-output").textContent = [
    `job_id: ${job.job_id}`,
    `status: ${job.status}`,
    `encoder: ${job.encoder}`,
    `bytes_written: ${job.bytes_written}`,
    `downloaded_local: ${Boolean(data.downloaded)}`,
    job.error ? `error: ${job.error}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function getDeliveryPresetsList() {
  return state.deliveryPresetsCatalog && state.deliveryPresetsCatalog.length > 0
    ? state.deliveryPresetsCatalog
    : DELIVERY_PRESETS;
}

function getDeliveryPresetLabel(preset) {
  if (!preset) return t("render.presets.custom");
  if (state.lang === "fr" && preset.label_fr) return preset.label_fr;
  return preset.label;
}

function syncDeliverProfileControlsState() {
  const profileEl = byId("render-profile");
  const containerEl = byId("render-container");
  const crfEl = byId("render-crf");
  const audioEl = byId("render-audio-bitrate");
  if (!profileEl) return;
  const prof = profileEl.value;
  const isProres = prof === "prores_hq";
  if (containerEl) {
    containerEl.value = isProres ? "mov" : "mp4";
  }
  if (crfEl) {
    crfEl.disabled = isProres;
    if (isProres) {
      crfEl.value = "";
      crfEl.placeholder = "N/A (ProRes)";
    } else {
      crfEl.placeholder = prof === "master_hevc" ? "20" : "18";
      if (!crfEl.value.trim()) {
        crfEl.value = prof === "master_hevc" ? "20" : "18";
      }
    }
  }
  if (audioEl) {
    audioEl.disabled = isProres;
    if (isProres) {
      audioEl.value = "pcm_s24le";
    } else if (audioEl.value === "pcm_s24le") {
      audioEl.value = "192";
    }
  }
}

function renderDeliveryPresetStrip() {
  const strip = byId("render-preset-strip");
  const badge = byId("render-active-preset-badge");
  const presets = getDeliveryPresetsList();
  const activePreset = presets.find((p) => p.id === state.activeDeliveryPresetId) || null;
  if (badge) {
    badge.textContent = activePreset ? getDeliveryPresetLabel(activePreset) : t("render.presets.custom");
    badge.className = `nle-tag mono${activePreset ? " is-active" : ""}`;
  }
  if (!strip) return;

  const cards = [];
  for (const preset of presets) {
    const isActive = preset.id === state.activeDeliveryPresetId;
    const btn = dom("button", `deliver-preset-card${isActive ? " is-active" : ""}`);
    btn.type = "button";
    btn.setAttribute("data-delivery-preset", preset.id);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    const desc = state.lang === "fr" && preset.description_fr ? preset.description_fr : preset.description;
    if (desc) btn.title = desc;

    const top = dom("div", "deliver-preset-top");
    top.appendChild(dom("span", "deliver-preset-title", getDeliveryPresetLabel(preset)));
    top.appendChild(dom("span", "deliver-preset-badge mono", String(preset.container || "mp4").toUpperCase()));

    const qualityTag =
      preset.crf !== null && preset.crf !== undefined ? `CRF ${preset.crf}` : "10b 4:2:2";
    const audioTag = preset.audio_bitrate_kbps ? `${preset.audio_bitrate_kbps}k` : "PCM 24b";
    const meta = dom(
      "div",
      "deliver-preset-meta mono",
      `${preset.codec_label} | ${preset.width}x${preset.height} | ${qualityTag} | ${audioTag}`
    );

    btn.appendChild(top);
    btn.appendChild(meta);
    btn.addEventListener("click", () => applyDeliveryPreset(preset.id));
    cards.push(btn);
  }
  strip.replaceChildren(...cards);
}

function markDeliverPresetCustom() {
  if (state.activeDeliveryPresetId !== null) {
    state.activeDeliveryPresetId = null;
    renderDeliveryPresetStrip();
  }
}

function syncReviewWatermarkControlsUI() {
  const wmInput = byId("render-watermark-text");
  const wmText = wmInput ? wmInput.value.trim() : "";
  for (const btn of document.querySelectorAll(".watermark-preset-btn[data-watermark-preset]")) {
    const presetVal = btn.getAttribute("data-watermark-preset") || "";
    const active = wmText === presetVal;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  }
  const opSlider = byId("render-watermark-opacity");
  const opLabel = byId("render-watermark-opacity-value");
  if (opSlider && opLabel) {
    const num = Number(opSlider.value);
    opLabel.textContent = Number.isFinite(num) ? num.toFixed(2) : "0.35";
  }
}

function applyDeliveryPreset(presetId) {
  const presets = getDeliveryPresetsList();
  const preset = presets.find((p) => p.id === presetId);
  if (!preset) return;

  state.activeDeliveryPresetId = preset.id;
  state.renderConfig.targetWidth = preset.width;
  state.renderConfig.targetHeight = preset.height;
  state.renderConfig.encoderPreset = preset.encoder_preset || "medium";

  const profileEl = byId("render-profile");
  const containerEl = byId("render-container");
  const outEl = byId("render-output-path");
  const crfEl = byId("render-crf");
  const audioEl = byId("render-audio-bitrate");
  const lufsEl = byId("render-lufs");
  const resEl = byId("render-resolution");
  const useFramingEl = byId("render-use-framing");

  if (profileEl) profileEl.value = preset.profile;
  if (containerEl) containerEl.value = preset.container;
  if (outEl && preset.default_output_path) outEl.value = preset.default_output_path;
  if (crfEl) {
    if (preset.crf !== null && preset.crf !== undefined) {
      crfEl.value = String(preset.crf);
    } else {
      crfEl.value = "";
    }
  }
  syncDeliverProfileControlsState();
  if (audioEl) {
    audioEl.value = preset.audio_bitrate_kbps ? String(preset.audio_bitrate_kbps) : "pcm_s24le";
  }
  if (lufsEl && Number.isFinite(Number(preset.target_lufs))) {
    const presetLufsVal = Number(preset.target_lufs);
    lufsEl.value = presetLufsVal.toFixed(1);
    const matchedPreset = Object.entries(LOUDNESS_PRESET_LUFS).find(
      ([, v]) => Math.abs(v - presetLufsVal) < 0.05
    );
    state.fairlight.loudness_preset = matchedPreset ? matchedPreset[0] : "off";
  }

  state.framing.preset = preset.aspect_ratio;
  state.framing.mode = preset.framing_mode === "fit" ? "fit" : "fill";
  if (resEl) {
    const resKey = `${preset.width}x${preset.height}`;
    resEl.value = resKey;
  }
  if (useFramingEl) useFramingEl.checked = true;

  syncFramingControlsUI();
  renderFairlightAudioUI();
  renderDeliveryPresetStrip();
  redrawActiveCanvases();
  showBanner(`${getDeliveryPresetLabel(preset)} (${preset.width}x${preset.height}, ${preset.container.toUpperCase()})`, "info");
}

function renderDeliverChaptersPreview() {
  const previewEl = byId("deliver-chapters-preview");
  const countEl = byId("deliver-chapters-count");
  const ytBtn = byId("btn-export-yt-chapters");
  const ffBtn = byId("btn-export-ffmetadata");
  if (!previewEl) return;

  const { markers } = timelineDocToChapterInputs(state.timelineDoc);
  const ytText = formatYoutubeChaptersFromMarkers(markers);
  const hasChapters = markers.length > 0 && ytText.length > 0;
  const lineCount = hasChapters ? ytText.split("\n").length : 0;

  previewEl.textContent = hasChapters ? ytText : t("render.chapters.empty");
  previewEl.classList.toggle("is-empty", !hasChapters);
  if (countEl) {
    countEl.textContent = `${lineCount} CHP`;
    countEl.className = hasChapters ? "nle-tag is-active mono" : "nle-tag mono";
  }
  if (ytBtn) ytBtn.disabled = !hasChapters;
  if (ffBtn) ffBtn.disabled = !hasChapters;
}

function getSafeTimelineStem() {
  const raw = state.timelineDoc && state.timelineDoc.name ? state.timelineDoc.name : "timeline";
  return raw.replace(/[^A-Za-z0-9._-]/g, "_") || "timeline";
}

function exportYoutubeChapters() {
  const { markers } = timelineDocToChapterInputs(state.timelineDoc);
  const content = formatYoutubeChaptersFromMarkers(markers);
  if (!content) {
    showBanner(t("render.chapters.empty"), "error");
    return;
  }
  const filename = `${getSafeTimelineStem()}_youtube_chapters.txt`;
  triggerBlobDownload(new Blob([content], { type: "text/plain; charset=utf-8" }), filename);
  const lineCount = content.split("\n").length;
  const msg = t("render.chapters.exportedYt")
    .replace("{filename}", filename)
    .replace("{count}", String(lineCount));
  const feedbackEl = byId("deliver-chapters-feedback");
  if (feedbackEl) feedbackEl.textContent = msg;
  showBanner(msg, "success");
}

function exportFfmetadataChapters() {
  const { markers, totalDurationS } = timelineDocToChapterInputs(state.timelineDoc);
  if (markers.length === 0) {
    showBanner(t("render.chapters.empty"), "error");
    return;
  }
  const content = formatFfmetadataFromMarkers(markers, totalDurationS);
  const filename = `${getSafeTimelineStem()}_ffmetadata.txt`;
  triggerBlobDownload(new Blob([content], { type: "text/plain; charset=utf-8" }), filename);
  const msg = t("render.chapters.exportedFfmeta")
    .replace("{filename}", filename)
    .replace("{count}", String(markers.length));
  const feedbackEl = byId("deliver-chapters-feedback");
  if (feedbackEl) feedbackEl.textContent = msg;
  showBanner(msg, "success");
}

async function buildOrExecuteRender(execute) {
  try {
    stopRemotePoll();
    const inputPath = byId("render-input-path").value.trim();
    const outputPath = byId("render-output-path").value.trim();
    const profile = byId("render-profile").value;
    const isProres = profile === "prores_hq";
    const crfRaw = byId("render-crf") ? byId("render-crf").value.trim() : "";
    const parsedCrf =
      !isProres && crfRaw !== "" && /^-?\d+$/.test(crfRaw) ? Number.parseInt(crfRaw, 10) : null;
    if (!isProres && crfRaw !== "" && (parsedCrf === null || parsedCrf < 0 || parsedCrf > 51)) {
      throw new Error("Video CRF must be an integer between 0 and 51.");
    }
    const audioRaw = byId("render-audio-bitrate") ? byId("render-audio-bitrate").value : "192";
    const parsedAudioKbps =
      !isProres && /^\d+$/.test(audioRaw) ? Number.parseInt(audioRaw, 10) : null;
    const fps = byId("render-fps").value.trim() || null;
    const lutPath = byId("render-lut-path").value.trim() || null;
    const lufsRaw = byId("render-lufs").value.trim();
    const targetLufs = lufsRaw !== "" ? Number.parseFloat(lufsRaw) : null;
    const useStudioCdl = byId("render-use-studio-cdl").checked;
    const useStudioFxEl = byId("render-use-studio-fx");
    const useStudioFx = useStudioFxEl ? useStudioFxEl.checked : false;
    const useStudioTitleEl = byId("render-use-studio-title");
    const useStudioTitle = useStudioTitleEl ? useStudioTitleEl.checked : false;
    const useStudioSubsEl = byId("render-use-studio-subtitles");
    const useStudioSubs = useStudioSubsEl ? useStudioSubsEl.checked : false;
    const preferHw = byId("render-prefer-hw").checked;

    const fxPayload =
      useStudioFx && !state.fxBypassAll && state.fxStack.length > 0
        ? serializeFxStackForApi(false)
        : null;
    const chromaKeyPayload =
      useStudioFx && !state.fxBypassAll && state.chromaKey.enabled
        ? serializeChromaKeyForApi(false)
        : null;
    const titlePayload =
      useStudioTitle &&
      state.titleOverlay.enabled &&
      (state.titleOverlay.title.trim() || state.titleOverlay.subtitle.trim())
        ? state.titleOverlay
        : null;
    const activeValidCues = state.subtitleTrack.cues.filter(
      (c) => String(c.text || "").trim().length > 0 && c.end_s > c.start_s
    );
    const subtitlePayload =
      useStudioSubs && state.subtitleTrack.enabled && activeValidCues.length > 0
        ? { ...state.subtitleTrack, cues: activeValidCues }
        : null;

    const useClipAudioEl = byId("render-use-clip-audio");
    const clipAudioInfo =
      useClipAudioEl && useClipAudioEl.checked ? getSelectedClipAudioPayload() : null;
    const audioParamsPayload =
      clipAudioInfo && !clipAudioInfo.isIdentity ? clipAudioInfo.audio_params : null;
    const clipDurationPayload =
      audioParamsPayload && clipAudioInfo ? clipAudioInfo.clipDurationS : null;

    const useClipRetimeEl = byId("render-use-clip-retime");
    const clipRetimeInfo =
      useClipRetimeEl && useClipRetimeEl.checked ? getSelectedClipRetimePayload() : null;
    const retimeParamsPayload =
      clipRetimeInfo && !clipRetimeInfo.isIdentity ? clipRetimeInfo.retime_params : null;

    const useClipTransformEl = byId("render-use-clip-transform");
    const clipTransformInfo =
      useClipTransformEl && useClipTransformEl.checked ? getSelectedClipTransformPayload() : null;
    const transformParamsPayload =
      clipTransformInfo && !clipTransformInfo.isIdentity ? clipTransformInfo.transform_params : null;

    const useFramingEl = byId("render-use-framing");
    const framingPayload =
      useFramingEl && useFramingEl.checked
        ? {
            preset: state.framing.preset,
            mode: state.framing.mode,
            target_width: state.renderConfig.targetWidth,
            target_height: state.renderConfig.targetHeight,
            enabled: true
          }
        : null;

    const fairlightPayload = normalizeFairlightAudioParams(state.fairlight);
    const tcBurnInEl = byId("render-timecode-burnin");
    const timecodeBurnin = tcBurnInEl ? tcBurnInEl.value : "off";
    const wmTextEl = byId("render-watermark-text");
    const reviewWatermarkText = wmTextEl ? wmTextEl.value.trim() : "";
    const wmOpacityEl = byId("render-watermark-opacity");
    const reviewWatermarkOpacity = wmOpacityEl ? Number(wmOpacityEl.value) : 0.35;
    const exportFpsEl = byId("render-export-fps");
    const exportFps = exportFpsEl ? exportFpsEl.value : "source";
    const deinterlaceEl = byId("render-deinterlace");
    const deinterlace = deinterlaceEl ? Boolean(deinterlaceEl.checked) : false;

    if (execute && state.renderEngine === "remote") {
      const remote_url = byId("remote-node-url").value.trim();
      const bearer_token = byId("remote-bearer-token").value.trim();
      const submitData = await api.submitRemoteJob({
        remote_url,
        bearer_token,
        input_path: inputPath,
        output_path: outputPath,
        profile,
        fps,
        lut_path: lutPath,
        color_grade: !lutPath && useStudioCdl ? state.colorGrade : null,
        chroma_key: chromaKeyPayload,
        fx_stack: fxPayload,
        title_overlay: titlePayload,
        subtitle_track: subtitlePayload,
        audio_params: audioParamsPayload,
        retime_params: retimeParamsPayload,
        transform_params: transformParamsPayload,
        framing: framingPayload,
        clip_duration_s: clipDurationPayload,
        target_lufs: targetLufs,
        loudness_preset: fairlightPayload.loudness_preset,
        dialogue_eq: fairlightPayload.dialogue_eq,
        timecode_burnin: timecodeBurnin,
        review_watermark_text: reviewWatermarkText,
        review_watermark_opacity: reviewWatermarkOpacity,
        export_fps: exportFps,
        deinterlace,
        prefer_hw: preferHw
      });
      renderRemoteJobTelemetry(submitData);
      showBanner(`Submitted remote render job ${submitData.job.job_id}`, "info");

      const pollOnce = async () => {
        try {
          const polled = await api.getRemoteJob(submitData.job.job_id);
          renderRemoteJobTelemetry(polled);
          if (polled.job.status === "completed") {
            state.lastRenderOutputPath = polled.local_output_path || outputPath;
            showBanner(
              `Remote render completed & saved to ${state.lastRenderOutputPath} (${polled.job.bytes_written} bytes)`,
              "success"
            );
            await refreshWorkspaceFiles();
            return;
          }
          if (polled.job.status === "failed") {
            showBanner(`Remote render failed: ${polled.job.error || "unknown error"}`, "error");
            return;
          }
          state.remotePollTimer = window.setTimeout(pollOnce, 500);
        } catch (pollErr) {
          showBanner(`Remote poll error: ${pollErr.message}`, "error");
        }
      };
      state.remotePollTimer = window.setTimeout(pollOnce, 350);
      return;
    }

    const body = {
      input_path: inputPath,
      output_path: outputPath,
      profile,
      delivery_preset: state.activeDeliveryPresetId || null,
      video_crf: parsedCrf,
      audio_bitrate_kbps: parsedAudioKbps,
      encoder_preset: !isProres ? state.renderConfig.encoderPreset || "medium" : null,
      fps,
      lut_path: lutPath,
      color_grade: !lutPath && useStudioCdl ? state.colorGrade : null,
      chroma_key: chromaKeyPayload,
      fx_stack: fxPayload,
      title_overlay: titlePayload,
      subtitle_track: subtitlePayload,
      audio_params: audioParamsPayload,
      retime_params: retimeParamsPayload,
      transform_params: transformParamsPayload,
      framing: framingPayload,
      clip_duration_s: clipDurationPayload,
      target_lufs: targetLufs,
      loudness_preset: fairlightPayload.loudness_preset,
      dialogue_eq: fairlightPayload.dialogue_eq,
      timecode_burnin: timecodeBurnin,
      review_watermark_text: reviewWatermarkText,
      review_watermark_opacity: reviewWatermarkOpacity,
      export_fps: exportFps,
      deinterlace,
      prefer_hw: preferHw,
      execute
    };
    const data = await api.buildOrExecuteRender(body);
    const plan = data.plan;
    state.lastRenderCommand = data.shell_command || plan.argv.join(" ");

    byId("render-encoder-badge").textContent = `${plan.encoder} / ${plan.pix_fmt}`;
    byId("render-encoder-badge").className = "nle-tag is-active mono";

    const fpsLabel = plan.fps.den === 1 ? String(plan.fps.num) : `${plan.fps.num}/${plan.fps.den}`;
    const rasterLabel =
      plan.target_width && plan.target_height
        ? `${plan.target_width}x${plan.target_height} (${plan.framing_mode || "fill"})`
        : "Source (Native)";
    const qualityLabel =
      plan.video_crf !== null && plan.video_crf !== undefined
        ? `CRF ${plan.video_crf} (${plan.encoder_preset || "medium"})`
        : "ProRes 422 HQ (10-bit)";
    const audioBitrateLabel = plan.audio_bitrate_kbps
      ? `AAC ${plan.audio_bitrate_kbps} kbps`
      : "PCM 24-bit 48 kHz";
    const presetObj = plan.delivery_preset
      ? getDeliveryPresetsList().find((p) => p.id === plan.delivery_preset)
      : null;
    renderKv(byId("render-plan-kv"), [
      ["Preset", presetObj ? getDeliveryPresetLabel(presetObj) : t("render.presets.custom")],
      ["Profile", plan.profile],
      ["Encoder", plan.encoder],
      ["Target Raster", rasterLabel],
      ["Video Quality", qualityLabel],
      ["Audio Stream", audioBitrateLabel],
      ["Rational FPS", fpsLabel],
      [
        t("render.plan.exportFps"),
        plan.export_fps && plan.export_fps !== "source"
          ? `${plan.export_fps} fps`
          : t("render.exportFps.source")
      ],
      [
        t("render.plan.deinterlace"),
        plan.deinterlace ? "yadif (mode=0:parity=-1:deint=0)" : "off"
      ],
      ["GOP Frames", String(plan.gop_frames)],
      ["Pixel Format", plan.pix_fmt],
      ["MP4 Faststart", String(plan.faststart)],
      [t("render.plan.timecodeBurnin"), plan.timecode_burnin || "off"],
      [
        t("render.plan.reviewWatermark"),
        plan.review_watermark_text
          ? `${plan.review_watermark_text} (${Math.round((plan.review_watermark_opacity ?? 0.35) * 100)}%)`
          : "off"
      ],
      ["Video Filter", plan.video_filter || t("common.none")],
      ["Audio Filter", plan.audio_filter || t("common.none")]
    ]);
    byId("render-argv-output").textContent = state.lastRenderCommand;

    const execBox = byId("render-exec-result");
    if (data.result) {
      execBox.classList.remove("is-hidden");
      const res = data.result;
      state.lastRenderOutputPath = outputPath;
      byId("render-exec-output").textContent = [
        `success: ${res.success}`,
        `encoder: ${res.encoder}`,
        `bytes_written: ${res.bytes_written}`,
        `returncode: ${res.returncode}`,
        res.stderr_tail ? `stderr_tail:\n${res.stderr_tail}` : ""
      ]
        .filter(Boolean)
        .join("\n");
      if (res.success) {
        showBanner(`Rendered ${outputPath} (${res.bytes_written} bytes via ${res.encoder})`, "success");
        await refreshWorkspaceFiles();
      } else {
        showBanner(`Render failed with exit code ${res.returncode}`, "error");
      }
    } else {
      execBox.classList.add("is-hidden");
      showBanner(`Built deterministic ${plan.encoder} render plan (dry-run).`, "success");
    }
  } catch (err) {
    showBanner(err.message, "error");
  }
}

/* PAGE 4: BROADCAST QA GATE */
function renderQaReport(report) {
  state.lastQaReport = report;
  const overall = byId("qa-overall-badge");
  overall.textContent = report.passed ? t("common.pass") : t("common.fail");
  overall.className = `nle-tag mono ${report.passed ? "is-pass" : "is-fail"}`;

  const failBox = byId("qa-failures-box");
  const failList = byId("qa-failures-list");
  if (report.failures && report.failures.length > 0) {
    failBox.classList.remove("is-hidden");
    failList.replaceChildren(
      ...report.failures.map((msg) => dom("li", "issue-item is-error", msg))
    );
  } else {
    failBox.classList.add("is-hidden");
    failList.replaceChildren();
  }

  const p = report.probe;
  const cfrBadge = byId("qa-cfr-badge");
  cfrBadge.textContent = p.is_cfr ? "CFR LOCKED" : "VFR";
  cfrBadge.className = `nle-tag mono ${p.is_cfr ? "is-pass" : "is-fail"}`;

  const faststartLabel =
    p.has_faststart === true ? "PASS (moov < mdat)" : p.has_faststart === false ? "FAIL (moov after mdat)" : "N/A";
  renderKv(byId("qa-probe-kv"), [
    ["Format", p.format_name],
    ["Video Codec", p.video_codec || t("common.none")],
    ["Raster", `${p.width}x${p.height} (${p.pix_fmt})`],
    ["Frame Rate", `r=${p.r_frame_rate} avg=${p.avg_frame_rate}`],
    ["Duration", `${p.video_duration_s.toFixed(3)}s (delta ${p.duration_delta_s.toFixed(3)}s)`],
    ["Color Tags", `${p.color_space || "?"} / ${p.color_primaries || "?"} / ${p.color_transfer || "?"}`],
    ["Audio", `${p.audio_codec || "none"} ${p.audio_sample_rate}Hz ${p.audio_channels}ch`],
    ["Faststart", faststartLabel]
  ]);

  const l = report.loudness;
  const loudBadge = byId("qa-loudness-badge");
  if (l) {
    loudBadge.textContent = l.passed ? `${l.integrated_lufs.toFixed(1)} LUFS` : "OUT OF SPEC";
    loudBadge.className = `nle-tag mono ${l.passed ? "is-pass" : "is-fail"}`;
    renderKv(byId("qa-loudness-kv"), [
      ["Integrated", `${l.integrated_lufs.toFixed(2)} LUFS`],
      ["Target", `${l.target_lufs.toFixed(1)} +/- ${l.tolerance_lu.toFixed(1)} LU`],
      ["LRA", `${l.lra_lu.toFixed(2)} LU`],
      ["True Peak", `${l.true_peak_dbtp.toFixed(2)} dBTP (max ${l.max_true_peak_dbtp.toFixed(1)})`]
    ]);
  } else {
    loudBadge.textContent = "NO AUDIO";
    loudBadge.className = "nle-tag mono";
    renderKv(byId("qa-loudness-kv"), [["Audio Stream", t("common.none")]]);
  }

  const framePairs = (report.frame_samples || []).map((s) => [
    `t=${s.timestamp_s}s`,
    `YAVG=${s.y_avg.toFixed(1)} (min ${s.y_min}, max ${s.y_max})`
  ]);
  renderKv(
    byId("qa-frames-list"),
    framePairs.length > 0 ? framePairs : [["Frames", t("common.none")]]
  );

  if (state.activeTab === "qa") {
    redrawActiveCanvases();
  }
}

async function runBroadcastQa() {
  try {
    const body = {
      path: byId("qa-media-path").value.trim(),
      target_lufs: Number.parseFloat(byId("qa-target-lufs").value),
      tolerance_lu: Number.parseFloat(byId("qa-tolerance-lu").value),
      max_true_peak_dbtp: Number.parseFloat(byId("qa-max-tp").value),
      require_faststart: byId("qa-require-faststart").checked
    };
    const data = await api.verifyQa(body);
    renderQaReport(data.report);
    showBanner(
      data.report.passed ? "Broadcast QA Gate PASSED." : "Broadcast QA Gate FAILED (see anomalies).",
      data.report.passed ? "success" : "error"
    );
  } catch (err) {
    showBanner(err.message, "error");
  }
}

async function generateSampleClip() {
  try {
    const data = await api.generateSampleClip();
    byId("render-input-path").value = data.path;
    byId("qa-media-path").value = data.path;
    await refreshWorkspaceFiles();
    showBanner(`Generated synthetic Rec.709 clip: ${data.path} (${data.bytes_written} bytes)`, "success");
  } catch (err) {
    showBanner(err.message, "error");
  }
}

function populateSelectOptions(selectEl, items, emptyLabel) {
  const opts = [dom("option", "", emptyLabel)];
  opts[0].value = "";
  for (const item of items) {
    const opt = dom("option", "", item);
    opt.value = item;
    opts.push(opt);
  }
  selectEl.replaceChildren(...opts);
}

async function refreshWorkspaceFiles() {
  const data = await api.getWorkspaceFiles();
  const files = data.files || {};
  populateSelectOptions(byId("timeline-workspace-select"), files.timelines || [], "-- select timeline --");
  populateSelectOptions(byId("render-input-select"), files.media || [], "-- select media --");
  populateSelectOptions(byId("qa-media-select"), files.media || [], "-- select media --");
}

function updateTimelineToolbarUI() {
  const selectBtn = byId("btn-tool-select");
  const bladeBtn = byId("btn-tool-blade");
  const snapBtn = byId("btn-timeline-snap");
  const addMarkerBtn = byId("btn-timeline-add-marker");
  const inspAddMarkerBtn = byId("btn-inspector-add-marker");
  const bpmBtn = byId("btn-bpm-grid");
  const bpmInput = byId("bpm-grid-bpm");
  const offsetInput = byId("bpm-grid-offset");
  const splitBtn = byId("btn-timeline-split");
  const undoBtn = byId("btn-timeline-undo");
  const redoBtn = byId("btn-timeline-redo");
  const toolBadge = byId("timeline-tool-badge");
  const tlCanvas = byId("timeline-canvas");

  const isBlade = state.timelineTool === "blade";
  if (selectBtn) {
    selectBtn.classList.toggle("is-active", !isBlade);
    selectBtn.setAttribute("aria-pressed", !isBlade ? "true" : "false");
  }
  if (bladeBtn) {
    bladeBtn.classList.toggle("is-active", isBlade);
    bladeBtn.setAttribute("aria-pressed", isBlade ? "true" : "false");
  }
  if (snapBtn) {
    snapBtn.classList.toggle("is-active", state.timelineSnapEnabled);
    snapBtn.setAttribute("aria-pressed", state.timelineSnapEnabled ? "true" : "false");
  }
  if (addMarkerBtn) {
    addMarkerBtn.disabled = !state.timelineDoc;
  }
  if (inspAddMarkerBtn) {
    inspAddMarkerBtn.disabled = !state.timelineDoc;
  }
  if (bpmBtn) {
    bpmBtn.classList.toggle("is-active", state.bpmGrid.enabled);
    bpmBtn.setAttribute("aria-pressed", state.bpmGrid.enabled ? "true" : "false");
  }
  if (bpmInput && document.activeElement !== bpmInput) {
    bpmInput.value = String(state.bpmGrid.bpm);
  }
  if (offsetInput && document.activeElement !== offsetInput) {
    const off = Number(state.bpmGrid.offset_s);
    offsetInput.value = Number.isInteger(off * 10) ? off.toFixed(1) : String(Number(off.toFixed(3)));
  }
  if (splitBtn) {
    const selClip =
      state.timelineSelected && state.timelineSelected.kind === "clip"
        ? state.timelineSelected.data
        : null;
    splitBtn.disabled = !hasSplittableClipAtFrame(state.timelineDoc, state.playheadFrame, selClip);
  }
  if (undoBtn) {
    undoBtn.disabled = state.timelineUndoStack.length === 0;
  }
  if (redoBtn) {
    redoBtn.disabled = state.timelineRedoStack.length === 0;
  }
  if (toolBadge) {
    const modeLabel = isBlade ? "BLADE (B)" : "SELECT (A)";
    const snapLabel = state.timelineSnapEnabled ? " | SNAP (N)" : "";
    const bpmLabel = state.bpmGrid.enabled ? ` | ${state.bpmGrid.bpm} BPM` : "";
    toolBadge.textContent = `${modeLabel}${snapLabel}${bpmLabel}`;
    toolBadge.className = `nle-tag mono ${
      isBlade ? "is-blade" : state.timelineSnapEnabled ? "is-snap" : ""
    }`;
  }
  if (tlCanvas) {
    tlCanvas.classList.toggle("is-blade-mode", isBlade);
  }
}

function setTimelineTool(tool) {
  const next = tool === "blade" ? "blade" : "select";
  state.timelineTool = next;
  if (next !== "blade") {
    state.timelineBladePreview = null;
    state.timelineActiveSnapFrame = null;
    state.timelineActiveSnapKind = null;
  }
  updateTimelineToolbarUI();
  if (state.activeTab === "timeline") {
    redrawActiveCanvases();
  }
}

function toggleTimelineSnap() {
  state.timelineSnapEnabled = !state.timelineSnapEnabled;
  if (!state.timelineSnapEnabled) {
    state.timelineActiveSnapFrame = null;
    state.timelineActiveSnapKind = null;
  }
  updateTimelineToolbarUI();
  if (state.activeTab === "timeline") {
    redrawActiveCanvases();
  }
}

function toggleBpmGrid() {
  state.bpmGrid.enabled = !state.bpmGrid.enabled;
  updateTimelineToolbarUI();
  if (state.activeTab === "timeline") {
    redrawActiveCanvases();
  }
}

function setNewMarkerColor(color) {
  state.markerNewColor = normalizeMarkerColor(color);
  for (const btn of document.querySelectorAll("[data-marker-new-color]")) {
    const col = btn.getAttribute("data-marker-new-color");
    const active = col === state.markerNewColor;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function addMarkerAtPlayheadAction() {
  if (!state.timelineDoc) return false;
  const res = addMarkerInDocument(state.timelineDoc, {
    frame: state.playheadFrame,
    color: state.markerNewColor
  });
  if (!res.changed) return false;
  commitTimelineMutation(res.doc, {
    kind: "marker",
    markerIndex: res.markerIndex,
    data: res.marker
  });
  return true;
}

function jumpToMarkerAction(markerIndex) {
  const doc = state.timelineDoc;
  if (!doc || !Array.isArray(doc.markers)) return false;
  const mk = doc.markers[markerIndex];
  if (!mk) return false;
  stopPlayback();
  state.timelineSelected = { kind: "marker", markerIndex, data: mk };
  setPlayhead(mk.frame);
  renderTimelineSelection();
  renderTimelineIssues();
  return true;
}

function deleteMarkerAction(markerIndex) {
  if (!state.timelineDoc) return false;
  const res = deleteMarkerInDocument(state.timelineDoc, markerIndex);
  if (!res.changed) return false;
  commitTimelineMutation(res.doc, null);
  return true;
}

function captureTimelineSnapshot() {
  return {
    doc: cloneTimelineDoc(state.timelineDoc),
    selected: state.timelineSelected ? cloneTimelineDoc(state.timelineSelected) : null,
    playheadFrame: state.playheadFrame
  };
}

function pushUndoSnapshot(snapshot) {
  if (!snapshot || !snapshot.doc) return;
  state.timelineUndoStack.push(snapshot);
  if (state.timelineUndoStack.length > 50) {
    state.timelineUndoStack.shift();
  }
  state.timelineRedoStack = [];
}

function commitTimelineMutation(nextDoc, nextSelected = null, preSnapshot = null) {
  const snap = preSnapshot || captureTimelineSnapshot();
  pushUndoSnapshot(snap);
  state.timelineDoc = nextDoc;
  state.timelineSelected = nextSelected;
  state.timelineValidation = validateTimelineClient(nextDoc);
  state.timelineMaxFrame = computeTimelineMaxFrame(nextDoc);
  state.playheadFrame = Math.min(state.playheadFrame, state.timelineMaxFrame);
  state.ioRange = normalizeInOutRange(
    state.ioRange,
    nextDoc ? nextDoc.start_frame || 0 : 0,
    state.timelineMaxFrame
  );
  updateIoRangeUI();
  renderTimelineUI();
}

function undoTimeline() {
  if (state.timelineUndoStack.length === 0) return;
  const currentSnap = captureTimelineSnapshot();
  const prevSnap = state.timelineUndoStack.pop();
  state.timelineRedoStack.push(currentSnap);
  state.timelineDoc = prevSnap.doc;
  state.timelineSelected = prevSnap.selected;
  state.timelineValidation = validateTimelineClient(prevSnap.doc);
  state.timelineMaxFrame = computeTimelineMaxFrame(prevSnap.doc);
  state.playheadFrame = Math.min(state.playheadFrame, state.timelineMaxFrame);
  state.timelineActiveSnapFrame = null;
  state.timelineBladePreview = null;
  state.ioRange = normalizeInOutRange(
    state.ioRange,
    prevSnap.doc ? prevSnap.doc.start_frame || 0 : 0,
    state.timelineMaxFrame
  );
  updateIoRangeUI();
  renderTimelineUI();
}

function redoTimeline() {
  if (state.timelineRedoStack.length === 0) return;
  const currentSnap = captureTimelineSnapshot();
  const nextSnap = state.timelineRedoStack.pop();
  state.timelineUndoStack.push(currentSnap);
  state.timelineDoc = nextSnap.doc;
  state.timelineSelected = nextSnap.selected;
  state.timelineValidation = validateTimelineClient(nextSnap.doc);
  state.timelineMaxFrame = computeTimelineMaxFrame(nextSnap.doc);
  state.playheadFrame = Math.min(state.playheadFrame, state.timelineMaxFrame);
  state.timelineActiveSnapFrame = null;
  state.timelineBladePreview = null;
  state.ioRange = normalizeInOutRange(
    state.ioRange,
    nextSnap.doc ? nextSnap.doc.start_frame || 0 : 0,
    state.timelineMaxFrame
  );
  updateIoRangeUI();
  renderTimelineUI();
}

function splitClipAction(trackKind, trackIndex, clipIndex, splitFrame) {
  if (!state.timelineDoc) return false;
  const res = splitClipInDocument(state.timelineDoc, trackKind, trackIndex, clipIndex, splitFrame);
  if (!res.split) return false;
  commitTimelineMutation(res.doc, { kind: "clip", data: res.rightClip });
  return true;
}

function splitAtPlayheadAction() {
  if (!state.timelineDoc) return false;
  const selClip =
    state.timelineSelected && state.timelineSelected.kind === "clip"
      ? state.timelineSelected.data
      : null;
  const res = splitClipsAtPlayhead(state.timelineDoc, state.playheadFrame, selClip);
  if (res.splitCount <= 0) return false;
  const nextSel = res.focusClip ? { kind: "clip", data: res.focusClip } : state.timelineSelected;
  commitTimelineMutation(res.doc, nextSel);
  return true;
}

function getSelectedClipRef() {
  if (!state.timelineDoc || !state.timelineSelected) return null;
  if (state.timelineSelected.kind !== "clip" && state.timelineSelected.kind !== "transition") {
    return null;
  }
  return findClipIndex(state.timelineDoc, state.timelineSelected.data);
}

function rippleDeleteSelectedClipAction() {
  const ref = getSelectedClipRef();
  if (!ref) return false;
  const res = rippleDeleteClipInDocument(
    state.timelineDoc,
    ref.trackKind,
    ref.trackIndex,
    ref.clipIndex
  );
  if (!res.changed) return false;
  const nextSel = res.focusClip ? { kind: "clip", data: res.focusClip } : null;
  commitTimelineMutation(res.doc, nextSel);
  return true;
}

function setPlayhead(frame) {
  state.playheadFrame = Math.max(0, Math.min(state.timelineMaxFrame, Math.round(frame)));
  updatePlayheadReadout();
  updateTimelineToolbarUI();
  if (
    state.activeTab === "timeline" ||
    state.activeTab === "fx" ||
    state.activeTab === "titles"
  ) {
    redrawActiveCanvases();
  }
}

function getTimelineFps() {
  const doc = state.timelineDoc;
  if (!doc || !doc.fps) return 25;
  return Math.max(1, doc.fps.num / Math.max(1, doc.fps.den));
}

function updateTransportStatusUI() {
  const playBtn = byId("btn-tc-play");
  const shuttleRevBtn = byId("btn-tc-shuttle-rev");
  const shuttleFwdBtn = byId("btn-tc-shuttle-fwd");
  const speedPill = byId("timeline-shuttle-speed-pill");
  const fxPlayBtn = byId("btn-fx-play");
  const titlesPlayBtn = byId("btn-titles-play");
  const pill = byId("transport-state-pill");
  const isPlaying = state.playbackSpeed !== 0;

  if (playBtn) {
    playBtn.textContent = isPlaying ? t("timeline.transport.pause") : t("timeline.transport.play");
    playBtn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    playBtn.classList.toggle("is-playing", isPlaying);
  }
  if (shuttleRevBtn) {
    const revActive = state.playbackSpeed < 0;
    shuttleRevBtn.setAttribute("aria-pressed", revActive ? "true" : "false");
    shuttleRevBtn.classList.toggle("is-reverse", revActive);
  }
  if (shuttleFwdBtn) {
    const fwdActive = state.playbackSpeed > 0;
    shuttleFwdBtn.setAttribute("aria-pressed", fwdActive ? "true" : "false");
    shuttleFwdBtn.classList.toggle("is-playing", fwdActive);
  }
  if (speedPill) {
    speedPill.textContent = formatShuttleSpeedLabel(state.playbackSpeed);
    speedPill.className = `nle-tag mono shuttle-speed-pill${
      state.playbackSpeed > 0 ? " is-forward" : state.playbackSpeed < 0 ? " is-reverse" : ""
    }`;
  }
  if (fxPlayBtn) {
    fxPlayBtn.textContent = isPlaying ? t("timeline.transport.pause") : t("timeline.transport.play");
    fxPlayBtn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    fxPlayBtn.classList.toggle("is-playing", isPlaying);
  }
  if (titlesPlayBtn) {
    titlesPlayBtn.textContent = isPlaying ? t("timeline.transport.pause") : t("timeline.transport.play");
    titlesPlayBtn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    titlesPlayBtn.classList.toggle("is-playing", isPlaying);
  }
  if (pill) {
    if (state.playbackSpeed > 0) {
      pill.textContent = `PLAY ${state.playbackSpeed}x`;
      pill.className = "statusbar-state is-playing";
    } else if (state.playbackSpeed < 0) {
      pill.textContent = `REV ${Math.abs(state.playbackSpeed)}x`;
      pill.className = "statusbar-state is-reverse";
    } else {
      pill.textContent = "STOP";
      pill.className = "statusbar-state";
    }
  }
}

function stopPlayback() {
  if (state.playbackRafId !== null) {
    window.cancelAnimationFrame(state.playbackRafId);
    state.playbackRafId = null;
  }
  state.playbackSpeed = 0;
  state.playbackLastTs = 0;
  state.playbackAccumFrames = 0;
  updateTransportStatusUI();
  startVuMeterDecay();
}

function playbackTick(ts) {
  if (state.playbackSpeed === 0) {
    state.playbackRafId = null;
    return;
  }
  if (!state.playbackLastTs) {
    state.playbackLastTs = ts;
  }
  const dtSec = Math.min(0.25, Math.max(0, (ts - state.playbackLastTs) / 1000));
  state.playbackLastTs = ts;

  const fps = getTimelineFps();
  state.playbackAccumFrames += dtSec * fps * state.playbackSpeed;
  const wholeDelta =
    state.playbackAccumFrames >= 0
      ? Math.floor(state.playbackAccumFrames)
      : Math.ceil(state.playbackAccumFrames);

  if (wholeDelta !== 0) {
    state.playbackAccumFrames -= wholeDelta;
    const minF = state.timelineDoc ? state.timelineDoc.start_frame || 0 : 0;
    const step = stepPlayheadInRange(
      state.playheadFrame,
      wholeDelta,
      minF,
      state.timelineMaxFrame,
      state.ioRange,
      state.ioLoopEnabled
    );
    setPlayhead(step.frame);
    if (step.stop) {
      stopPlayback();
      return;
    }
  }
  updateVuMeterInstant(ts, true);
  state.playbackRafId = window.requestAnimationFrame(playbackTick);
}

function startShuttle(speed) {
  if (speed === 0) {
    stopPlayback();
    return;
  }
  stopVuMeterDecay();
  const minF = state.timelineDoc ? state.timelineDoc.start_frame || 0 : 0;
  const metrics = computeInOutRangeMetrics(
    state.ioRange,
    getTimelineFps(),
    minF,
    state.timelineMaxFrame
  );
  const useLoop = Boolean(state.ioLoopEnabled && metrics.isComplete && metrics.durationFrames > 0);
  const lo = useLoop ? metrics.in_frame : minF;
  const hi = useLoop ? metrics.out_frame : state.timelineMaxFrame;

  if (speed > 0 && (state.playheadFrame >= hi || (useLoop && state.playheadFrame < lo))) {
    setPlayhead(lo);
  } else if (speed < 0 && (state.playheadFrame <= lo || (useLoop && state.playheadFrame > hi))) {
    setPlayhead(hi);
  }
  state.playbackSpeed = speed;
  state.playbackLastTs = 0;
  state.playbackAccumFrames = 0;
  updateTransportStatusUI();
  updateVuMeterInstant(performance.now(), true);
  if (state.playbackRafId === null) {
    state.playbackRafId = window.requestAnimationFrame(playbackTick);
  }
}

function togglePlayPause() {
  const next = stepShuttleSpeed(state.playbackSpeed, "toggle");
  startShuttle(next);
}

function stepShuttle(direction) {
  const next = stepShuttleSpeed(state.playbackSpeed, direction > 0 ? "forward" : "reverse");
  startShuttle(next);
}

function updateIoRangeUI() {
  const doc = state.timelineDoc;
  const minF = doc ? doc.start_frame || 0 : 0;
  const fpsNum = doc && doc.fps ? doc.fps.num : 25;
  const fpsDen = doc && doc.fps ? doc.fps.den : 1;
  const fpsRate = Math.max(1, fpsNum / Math.max(1, fpsDen));
  const metrics = computeInOutRangeMetrics(state.ioRange, fpsRate, minF, state.timelineMaxFrame);

  const inBtn = byId("btn-tc-mark-in");
  const outBtn = byId("btn-tc-mark-out");
  const clearBtn = byId("btn-tc-clear-io");
  const loopBtn = byId("btn-tc-loop-io");
  const pill = byId("timeline-io-range-pill");

  if (inBtn) {
    inBtn.disabled = !doc;
    inBtn.classList.toggle("is-active", metrics.hasIn);
  }
  if (outBtn) {
    outBtn.disabled = !doc;
    outBtn.classList.toggle("is-active", metrics.hasOut);
  }
  if (clearBtn) {
    clearBtn.disabled = !doc || !metrics.isActive;
  }
  if (loopBtn) {
    const canLoop = Boolean(doc && metrics.isComplete && metrics.durationFrames > 0);
    if (!canLoop) state.ioLoopEnabled = false;
    loopBtn.disabled = !canLoop;
    loopBtn.classList.toggle("is-active", Boolean(canLoop && state.ioLoopEnabled));
    loopBtn.setAttribute("aria-pressed", canLoop && state.ioLoopEnabled ? "true" : "false");
  }
  if (pill) {
    if (!doc || !metrics.isActive) {
      pill.textContent = t("timeline.io.none");
      pill.className = "nle-tag mono io-range-pill";
    } else if (metrics.isComplete) {
      const inSmpte = framesToSmpte(metrics.in_frame, fpsNum, fpsDen);
      const outSmpte = framesToSmpte(metrics.out_frame, fpsNum, fpsDen);
      const durSmpte = framesToSmpte(metrics.durationFrames, fpsNum, fpsDen);
      pill.textContent = `IN ${inSmpte} -> OUT ${outSmpte} | ${durSmpte} (${metrics.durationFrames}f / ${metrics.durationSeconds.toFixed(2)}s)`;
      pill.className = "nle-tag mono io-range-pill is-active";
    } else if (metrics.hasIn) {
      const inSmpte = framesToSmpte(metrics.in_frame, fpsNum, fpsDen);
      pill.textContent = `IN ${inSmpte} (${metrics.in_frame}f) -> OUT --`;
      pill.className = "nle-tag mono io-range-pill is-active";
    } else {
      const outSmpte = framesToSmpte(metrics.out_frame, fpsNum, fpsDen);
      pill.textContent = `IN -- -> OUT ${outSmpte} (${metrics.out_frame}f)`;
      pill.className = "nle-tag mono io-range-pill is-active";
    }
  }
}

function setInPointAction() {
  if (!state.timelineDoc) return false;
  const minF = state.timelineDoc.start_frame || 0;
  state.ioRange = setInOutRange(
    state.ioRange,
    "in",
    state.playheadFrame,
    minF,
    state.timelineMaxFrame
  );
  updateIoRangeUI();
  if (state.activeTab === "timeline") redrawActiveCanvases();
  return true;
}

function setOutPointAction() {
  if (!state.timelineDoc) return false;
  const minF = state.timelineDoc.start_frame || 0;
  state.ioRange = setInOutRange(
    state.ioRange,
    "out",
    state.playheadFrame,
    minF,
    state.timelineMaxFrame
  );
  updateIoRangeUI();
  if (state.activeTab === "timeline") redrawActiveCanvases();
  return true;
}

function clearInOutAction() {
  if (!state.timelineDoc) return false;
  state.ioRange = setInOutRange(state.ioRange, "clear");
  state.ioLoopEnabled = false;
  updateIoRangeUI();
  if (state.activeTab === "timeline") redrawActiveCanvases();
  return true;
}

function jumpToInPointAction() {
  const minF = state.timelineDoc ? state.timelineDoc.start_frame || 0 : 0;
  const norm = normalizeInOutRange(state.ioRange, minF, state.timelineMaxFrame);
  if (norm.in_frame === null) return false;
  stopPlayback();
  setPlayhead(norm.in_frame);
  return true;
}

function jumpToOutPointAction() {
  const minF = state.timelineDoc ? state.timelineDoc.start_frame || 0 : 0;
  const norm = normalizeInOutRange(state.ioRange, minF, state.timelineMaxFrame);
  if (norm.out_frame === null) return false;
  stopPlayback();
  setPlayhead(norm.out_frame);
  return true;
}

function toggleIoLoopAction() {
  if (!state.timelineDoc) return false;
  const minF = state.timelineDoc.start_frame || 0;
  const metrics = computeInOutRangeMetrics(
    state.ioRange,
    getTimelineFps(),
    minF,
    state.timelineMaxFrame
  );
  if (!metrics.isComplete || metrics.durationFrames <= 0) {
    state.ioLoopEnabled = false;
    updateIoRangeUI();
    return false;
  }
  state.ioLoopEnabled = !state.ioLoopEnabled;
  updateIoRangeUI();
  return true;
}

const NLE_SHORTCUT_GROUPS = [
  {
    titleKey: "shortcuts.group.transport",
    items: [
      { kbd: "Space", descKey: "shortcuts.key.space" },
      { kbd: "J", descKey: "shortcuts.key.j" },
      { kbd: "K", descKey: "shortcuts.key.k" },
      { kbd: "L", descKey: "shortcuts.key.l" },
      { kbd: "Left / Right", descKey: "shortcuts.key.arrows" },
      { kbd: "Home / End", descKey: "shortcuts.key.homeEnd" }
    ]
  },
  {
    titleKey: "shortcuts.group.range",
    items: [
      { kbd: "I", descKey: "shortcuts.key.markIn" },
      { kbd: "O", descKey: "shortcuts.key.markOut" },
      { kbd: "Alt+X", descKey: "shortcuts.key.clearIo" },
      { kbd: "M", descKey: "shortcuts.key.marker" }
    ]
  },
  {
    titleKey: "shortcuts.group.tools",
    items: [
      { kbd: "A", descKey: "shortcuts.key.select" },
      { kbd: "B", descKey: "shortcuts.key.blade" },
      { kbd: "Shift+Backspace", descKey: "shortcuts.key.rippleDelete" },
      { kbd: "N", descKey: "shortcuts.key.snap" },
      { kbd: "Ctrl+Z", descKey: "shortcuts.key.undo" },
      { kbd: "Ctrl+Shift+Z / Y", descKey: "shortcuts.key.redo" }
    ]
  },
  {
    titleKey: "shortcuts.group.studio",
    items: [
      { kbd: "W / Ctrl+W", descKey: "shortcuts.key.splitWipe" },
      { kbd: "Shift+S", descKey: "shortcuts.key.grabStill" },
      { kbd: "Ctrl+S", descKey: "shortcuts.key.save" },
      { kbd: "?", descKey: "shortcuts.key.help" }
    ]
  }
];

function renderShortcutsDialog() {
  const grid = byId("nle-shortcuts-grid");
  if (!grid) return;
  const sections = [];
  for (const group of NLE_SHORTCUT_GROUPS) {
    const sec = dom("section", "shortcut-group");
    sec.appendChild(dom("h3", "shortcut-group-title", t(group.titleKey)));
    const ul = dom("ul", "shortcut-list");
    for (const item of group.items) {
      const li = dom("li", "shortcut-row");
      li.appendChild(dom("span", "shortcut-desc", t(item.descKey)));
      li.appendChild(dom("kbd", "shortcut-kbd mono", item.kbd));
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    sections.push(sec);
  }
  grid.replaceChildren(...sections);
}

function openShortcutsDialog() {
  const dlg = byId("nle-shortcuts-dialog");
  if (!dlg) return;
  renderShortcutsDialog();
  if (!dlg.open) {
    if (typeof dlg.showModal === "function") {
      dlg.showModal();
    } else {
      dlg.setAttribute("open", "");
    }
  }
}

function closeShortcutsDialog() {
  const dlg = byId("nle-shortcuts-dialog");
  if (!dlg || !dlg.open) return;
  if (typeof dlg.close === "function") {
    dlg.close();
  } else {
    dlg.removeAttribute("open");
  }
}

function toggleShortcutsDialog() {
  const dlg = byId("nle-shortcuts-dialog");
  if (!dlg) return;
  if (dlg.open) {
    closeShortcutsDialog();
  } else {
    openShortcutsDialog();
  }
}

function isEditableTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true;
  }
  if (target instanceof HTMLElement && target.isContentEditable) {
    return true;
  }
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function handleTransportKeydown(ev) {
  if (ev.defaultPrevented) return;
  const lower = ev.key.toLowerCase();
  const shortcutsDlg = byId("nle-shortcuts-dialog");
  if (shortcutsDlg && shortcutsDlg.open) {
    if (ev.key === "?" && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      ev.preventDefault();
      closeShortcutsDialog();
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      closeShortcutsDialog();
    }
    return;
  }

  if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && !ev.shiftKey && lower === "s") {
    ev.preventDefault();
    saveProjectAction();
    return;
  }
  if (isEditableTarget(ev.target)) return;

  if (ev.key === "?" && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
    ev.preventDefault();
    openShortcutsDialog();
    return;
  }

  if ((ev.ctrlKey || ev.metaKey) && !ev.altKey) {
    if (!ev.shiftKey && lower === "w" && (state.activeTab === "color" || state.activeTab === "fx")) {
      ev.preventDefault();
      toggleActiveSplitWipe();
      return;
    }
    if (state.activeTab === "timeline") {
      if (lower === "z" && !ev.shiftKey) {
        ev.preventDefault();
        undoTimeline();
        return;
      }
      if ((lower === "z" && ev.shiftKey) || (lower === "y" && !ev.shiftKey)) {
        ev.preventDefault();
        redoTimeline();
        return;
      }
    }
    return;
  }

  if (
    !ev.ctrlKey &&
    !ev.metaKey &&
    !ev.altKey &&
    !ev.shiftKey &&
    lower === "w" &&
    (state.activeTab === "color" || state.activeTab === "fx")
  ) {
    ev.preventDefault();
    toggleActiveSplitWipe();
    return;
  }

  if (
    !ev.ctrlKey &&
    !ev.metaKey &&
    !ev.altKey &&
    ev.shiftKey &&
    lower === "s" &&
    (state.activeTab === "color" || state.activeTab === "fx")
  ) {
    ev.preventDefault();
    grabActiveMonitorStill();
    return;
  }

  const onPlayheadTab =
    state.activeTab === "timeline" ||
    state.activeTab === "fx" ||
    state.activeTab === "titles";

  if (ev.altKey) {
    if (onPlayheadTab && !ev.ctrlKey && !ev.metaKey && lower === "x") {
      ev.preventDefault();
      clearInOutAction();
    }
    return;
  }

  if (!onPlayheadTab) {
    return;
  }

  if (ev.code === "Space" || ev.key === " ") {
    if (
      ev.target instanceof Element &&
      (ev.target.tagName === "BUTTON" ||
        ev.target.tagName === "A" ||
        ev.target.getAttribute("role") === "tab")
    ) {
      return;
    }
    ev.preventDefault();
    togglePlayPause();
    return;
  }

  if (lower === "i" && !ev.shiftKey) {
    ev.preventDefault();
    setInPointAction();
    return;
  }
  if (lower === "i" && ev.shiftKey) {
    ev.preventDefault();
    jumpToInPointAction();
    return;
  }
  if (lower === "o" && !ev.shiftKey) {
    ev.preventDefault();
    setOutPointAction();
    return;
  }
  if (lower === "o" && ev.shiftKey) {
    ev.preventDefault();
    jumpToOutPointAction();
    return;
  }
  if (ev.key === "Home") {
    ev.preventDefault();
    stopPlayback();
    setPlayhead(state.timelineDoc ? state.timelineDoc.start_frame || 0 : 0);
    return;
  }
  if (ev.key === "End") {
    ev.preventDefault();
    stopPlayback();
    setPlayhead(state.timelineMaxFrame);
    return;
  }

  if (state.activeTab === "timeline") {
    if (lower === "m") {
      ev.preventDefault();
      addMarkerAtPlayheadAction();
      return;
    }
    if (lower === "n") {
      ev.preventDefault();
      toggleTimelineSnap();
      return;
    }
    if (lower === "b") {
      ev.preventDefault();
      setTimelineTool(state.timelineTool === "blade" ? "select" : "blade");
      return;
    }
    if (lower === "a") {
      ev.preventDefault();
      setTimelineTool("select");
      return;
    }
    if (ev.key === "Backspace" && ev.shiftKey && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      ev.preventDefault();
      rippleDeleteSelectedClipAction();
      return;
    }
    if (ev.key === "Escape" && state.timelineTool === "blade") {
      ev.preventDefault();
      setTimelineTool("select");
      return;
    }
  }

  if (lower === "k") {
    ev.preventDefault();
    stopPlayback();
    return;
  }
  if (lower === "l") {
    ev.preventDefault();
    stepShuttle(1);
    return;
  }
  if (lower === "j") {
    ev.preventDefault();
    stepShuttle(-1);
    return;
  }
  if (ev.key === "ArrowLeft") {
    ev.preventDefault();
    stopPlayback();
    setPlayhead(state.playheadFrame - (ev.shiftKey ? 10 : 1));
    return;
  }
  if (ev.key === "ArrowRight") {
    ev.preventDefault();
    stopPlayback();
    setPlayhead(state.playheadFrame + (ev.shiftKey ? 10 : 1));
  }
}

function hitTestTimeline(x, y, opts = {}) {
  const includeTrim = Boolean(opts.includeTrim);
  const includeFade = Boolean(opts.includeFade);
  const boxes = state.timelineHitboxes || [];
  for (let i = boxes.length - 1; i >= 0; i--) {
    const b = boxes[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      if (b.kind === "transition") {
        return { kind: "transition", box: b, data: b.data };
      }
      if (includeFade && b.kind === "clip" && b.fadeHandlesEnabled) {
        if (Math.abs(y - b.fadeHandleY) <= 10) {
          if (Math.abs(x - b.fadeInHandleX) <= 8) {
            return { kind: "fade", edge: "in", box: b, data: b.data };
          }
          if (Math.abs(x - b.fadeOutHandleX) <= 8) {
            return { kind: "fade", edge: "out", box: b, data: b.data };
          }
        }
      }
      if (includeTrim && b.kind === "clip" && b.trimHandleW > 0) {
        if (x <= b.x + b.trimHandleW) {
          return { kind: "trim", edge: "left", box: b, data: b.data };
        }
        if (x >= b.x + b.w - b.trimHandleW) {
          return { kind: "trim", edge: "right", box: b, data: b.data };
        }
      }
      return { kind: b.kind, box: b, data: b.data };
    }
  }
  return null;
}

function resolvePointerFrame(x, opts = {}) {
  const minFrame = opts.minFrame !== undefined ? opts.minFrame : (state.timelineStartFrame || 0);
  const maxFrame = opts.maxFrame !== undefined ? opts.maxFrame : state.timelineMaxFrame;
  const rawExact = state.timelineXToRawFrame
    ? state.timelineXToRawFrame(x)
    : state.timelineXToFrame
      ? state.timelineXToFrame(x)
      : minFrame;
  const clampedRaw = Math.max(minFrame, Math.min(maxFrame, rawExact));

  if (state.timelineSnapEnabled && state.timelineDoc && state.timelinePxPerFrame > 0) {
    const targets = collectSnapTargets(state.timelineDoc, {
      excludeClip: opts.excludeClip || null,
      includePlayhead: Boolean(opts.includePlayhead),
      playheadFrame: state.playheadFrame,
      bpmGrid: state.bpmGrid,
      maxFrame
    });
    const snap = findMagneticSnap(
      clampedRaw,
      targets,
      state.timelinePxPerFrame,
      SNAP_THRESHOLD_PX,
      minFrame,
      maxFrame
    );
    return {
      frame: snap.frame,
      snapFrame: snap.snapped ? snap.frame : null,
      snapKind: snap.snapped ? snap.kind : null
    };
  }

  return {
    frame: Math.max(minFrame, Math.min(maxFrame, Math.round(clampedRaw))),
    snapFrame: null,
    snapKind: null
  };
}

function bindTimelineCanvasScrub(canvas) {
  const ptr = {
    active: false,
    pointerId: null,
    mode: null,
    startX: 0,
    startY: 0,
    moved: false,
    trimTarget: null,
    fadeTarget: null,
    preSnapshot: null,
    origDoc: null,
    origBounds: null
  };

  const getCanvasPos = (ev) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ev.clientX - rect.left,
      y: ev.clientY - rect.top
    };
  };

  const isNearPlayhead = (x) => {
    if (!state.timelineFrameToX) return false;
    const phX = state.timelineFrameToX(state.playheadFrame);
    return Math.abs(x - phX) <= 10;
  };

  const sameTrimRef = (a, b) => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return (
      a.trackKind === b.trackKind &&
      a.trackIndex === b.trackIndex &&
      a.clipIndex === b.clipIndex &&
      a.edge === b.edge
    );
  };

  canvas.addEventListener("pointerdown", (ev) => {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    stopPlayback();
    if (!state.timelineDoc || !state.timelineXToFrame) return;

    const { x, y } = getCanvasPos(ev);
    const railHit = hitTestTimeline(x, y, { includeTrim: false, includeFade: false });
    if (railHit && railHit.kind === "track_mute" && railHit.box) {
      toggleTrackMuteAction(railHit.box.trackKind, railHit.box.trackIndex);
      return;
    }
    if (railHit && railHit.kind === "track_solo" && railHit.box) {
      toggleTrackSoloAction(railHit.box.trackKind, railHit.box.trackIndex);
      return;
    }

    const rulerH = state.timelineRulerHeight || 36;
    const labelW = state.timelineLabelColW || 0;
    const inRuler = y <= rulerH;
    const nearPh = isNearPlayhead(x);
    const inTrackArea = x >= labelW;

    if (!inRuler && !nearPh && !inTrackArea) return;

    if (state.timelineTool === "blade" && inTrackArea && !inRuler && !nearPh) {
      const hit = hitTestTimeline(x, y, { includeTrim: false });
      if (hit && hit.kind === "clip" && hit.box) {
        const res = resolvePointerFrame(x, { includePlayhead: true });
        if (splitClipAction(hit.box.trackKind, hit.box.trackIndex, hit.box.clipIndex, res.frame)) {
          state.timelineBladePreview = null;
          state.timelineActiveSnapFrame = null;
          redrawActiveCanvases();
          return;
        }
      }
    }

    ptr.active = true;
    ptr.pointerId = ev.pointerId;
    ptr.startX = x;
    ptr.startY = y;
    ptr.moved = false;
    ptr.trimTarget = null;
    ptr.fadeTarget = null;
    ptr.preSnapshot = null;
    ptr.origDoc = null;
    ptr.origBounds = null;

    if (canvas.setPointerCapture) {
      try {
        canvas.setPointerCapture(ev.pointerId);
      } catch {
        // Ignore synthetic pointer events without active browser capture
      }
    }

    if (inRuler) {
      ptr.mode = "scrub";
      canvas.classList.add("is-scrubbing");
      const res = resolvePointerFrame(x, { includePlayhead: false });
      state.timelineActiveSnapFrame = res.snapFrame;
      state.timelineActiveSnapKind = res.snapKind;
      setPlayhead(res.frame);
      return;
    }

    if (state.timelineTool === "select" && inTrackArea) {
      const hit = hitTestTimeline(x, y, { includeTrim: true, includeFade: true });
      if (hit && hit.kind === "fade" && hit.box) {
        const target = {
          trackKind: hit.box.trackKind,
          trackIndex: hit.box.trackIndex,
          clipIndex: hit.box.clipIndex,
          edge: hit.edge
        };
        const origDoc = cloneTimelineDoc(state.timelineDoc);
        const foundOrig = findTrackAndClip(origDoc, target.trackKind, target.trackIndex, target.clipIndex);
        if (foundOrig) {
          const norm = normalizeClipAudio(foundOrig.clip);
          ptr.mode = "fade";
          ptr.fadeTarget = target;
          ptr.preSnapshot = captureTimelineSnapshot();
          ptr.origDoc = origDoc;
          state.timelineActiveFade = {
            ...target,
            x,
            y: hit.box.y,
            seconds: target.edge === "in" ? norm.fadeInS : norm.fadeOutS
          };
          state.timelineHoverFade = null;
          state.timelineHoverTrim = null;
          canvas.classList.add("is-fading");
          redrawActiveCanvases();
          return;
        }
      }
      if (hit && hit.kind === "trim" && hit.box) {
        const target = {
          trackKind: hit.box.trackKind,
          trackIndex: hit.box.trackIndex,
          clipIndex: hit.box.clipIndex,
          edge: hit.edge
        };
        const origDoc = cloneTimelineDoc(state.timelineDoc);
        const origBounds = getClipTrimBounds(origDoc, target.trackKind, target.trackIndex, target.clipIndex);
        if (origBounds) {
          ptr.mode = "trim";
          ptr.trimTarget = target;
          ptr.preSnapshot = captureTimelineSnapshot();
          ptr.origDoc = origDoc;
          ptr.origBounds = origBounds;
          state.timelineDragFixedMaxFrame = Math.max(
            state.timelineMaxFrame,
            computeTimelineMaxFrame(origDoc)
          );
          state.timelineActiveTrim = target;
          state.timelineHoverTrim = null;
          canvas.classList.add("is-trimming");
          redrawActiveCanvases();
          return;
        }
      }
    }

    if (nearPh) {
      ptr.mode = "scrub";
      canvas.classList.add("is-scrubbing");
      const res = resolvePointerFrame(x, { includePlayhead: false });
      state.timelineActiveSnapFrame = res.snapFrame;
      state.timelineActiveSnapKind = res.snapKind;
      setPlayhead(res.frame);
      return;
    }

    ptr.mode = "pending";
  });

  canvas.addEventListener("pointermove", (ev) => {
    const { x, y } = getCanvasPos(ev);
    if (!ptr.active) {
      if (state.timelineDoc && state.timelineFrameToX) {
        const rulerH = state.timelineRulerHeight || 36;
        const labelW = state.timelineLabelColW || 0;
        const inRuler = y <= rulerH && x >= labelW;
        const nearPh = isNearPlayhead(x);
        const inTrackArea = x >= labelW && y > rulerH;

        if (state.timelineTool === "blade" && inTrackArea) {
          const res = resolvePointerFrame(x, { includePlayhead: true });
          const hit = hitTestTimeline(x, y, { includeTrim: false });
          const valid =
            Boolean(hit && hit.kind === "clip") &&
            res.frame > hit.data.start_frame &&
            res.frame < hit.data.start_frame + hit.data.duration_frames;
          const nextPreview = valid
            ? { frame: res.frame, y: hit.box.y, h: hit.box.h, valid: true }
            : { frame: res.frame, valid: false };
          const prevPreview = state.timelineBladePreview;
          const prevSnap = state.timelineActiveSnapFrame;
          state.timelineBladePreview = nextPreview;
          state.timelineActiveSnapFrame = res.snapFrame;
          state.timelineActiveSnapKind = res.snapKind;
          state.timelineHoverTrim = null;
          canvas.style.cursor = valid ? "cell" : "crosshair";
          if (
            !prevPreview ||
            prevPreview.frame !== nextPreview.frame ||
            prevPreview.valid !== nextPreview.valid ||
            prevSnap !== state.timelineActiveSnapFrame
          ) {
            redrawActiveCanvases();
          }
          return;
        }

        let needRedraw = false;
        if (state.timelineBladePreview || state.timelineActiveSnapFrame !== null) {
          state.timelineBladePreview = null;
          state.timelineActiveSnapFrame = null;
          state.timelineActiveSnapKind = null;
          needRedraw = true;
        }

        if (inRuler) {
          canvas.style.cursor = "ew-resize";
          if (state.timelineHoverTrim || state.timelineHoverFade) {
            state.timelineHoverTrim = null;
            state.timelineHoverFade = null;
            needRedraw = true;
          }
        } else if (state.timelineTool === "select" && inTrackArea) {
          const hit = hitTestTimeline(x, y, { includeTrim: true, includeFade: true });
          if (hit && hit.kind === "transition" && hit.box) {
            const nextTransHover = {
              trackKind: hit.box.trackKind,
              trackIndex: hit.box.trackIndex,
              clipIndex: hit.box.clipIndex
            };
            canvas.style.cursor = "pointer";
            const prevTrans = state.timelineHoverTransition;
            const sameTrans =
              prevTrans &&
              prevTrans.trackKind === nextTransHover.trackKind &&
              prevTrans.trackIndex === nextTransHover.trackIndex &&
              prevTrans.clipIndex === nextTransHover.clipIndex;
            if (!sameTrans || state.timelineHoverTrim || state.timelineHoverFade) {
              state.timelineHoverTransition = nextTransHover;
              state.timelineHoverTrim = null;
              state.timelineHoverFade = null;
              needRedraw = true;
            }
          } else if (hit && hit.kind === "fade" && hit.box) {
            const nextFadeHover = {
              trackKind: hit.box.trackKind,
              trackIndex: hit.box.trackIndex,
              clipIndex: hit.box.clipIndex,
              edge: hit.edge
            };
            canvas.style.cursor = "ew-resize";
            if (!sameTrimRef(state.timelineHoverFade, nextFadeHover) || state.timelineHoverTrim || state.timelineHoverTransition) {
              state.timelineHoverFade = nextFadeHover;
              state.timelineHoverTrim = null;
              state.timelineHoverTransition = null;
              needRedraw = true;
            }
          } else if (hit && hit.kind === "trim" && hit.box) {
            const nextHover = {
              trackKind: hit.box.trackKind,
              trackIndex: hit.box.trackIndex,
              clipIndex: hit.box.clipIndex,
              edge: hit.edge
            };
            canvas.style.cursor = "ew-resize";
            if (!sameTrimRef(state.timelineHoverTrim, nextHover) || state.timelineHoverFade || state.timelineHoverTransition) {
              state.timelineHoverTrim = nextHover;
              state.timelineHoverFade = null;
              state.timelineHoverTransition = null;
              needRedraw = true;
            }
          } else {
            canvas.style.cursor = nearPh ? "ew-resize" : "crosshair";
            if (state.timelineHoverTrim || state.timelineHoverFade || state.timelineHoverTransition) {
              state.timelineHoverTrim = null;
              state.timelineHoverFade = null;
              state.timelineHoverTransition = null;
              needRedraw = true;
            }
          }
        } else {
          const railHover = hitTestTimeline(x, y, { includeTrim: false, includeFade: false });
          const isMsBtn = railHover && (railHover.kind === "track_mute" || railHover.kind === "track_solo");
          canvas.style.cursor = isMsBtn ? "pointer" : nearPh ? "ew-resize" : "crosshair";
          if (state.timelineHoverTrim || state.timelineHoverFade || state.timelineHoverTransition) {
            state.timelineHoverTrim = null;
            state.timelineHoverFade = null;
            state.timelineHoverTransition = null;
            needRedraw = true;
          }
        }

        if (needRedraw) redrawActiveCanvases();
      }
      return;
    }

    if (ev.pointerId !== ptr.pointerId || !state.timelineXToFrame) return;

    if (Math.hypot(x - ptr.startX, y - ptr.startY) >= 3) {
      ptr.moved = true;
    }

    if (ptr.mode === "fade" && ptr.fadeTarget && ptr.origDoc) {
      const foundOrig = findTrackAndClip(
        ptr.origDoc,
        ptr.fadeTarget.trackKind,
        ptr.fadeTarget.trackIndex,
        ptr.fadeTarget.clipIndex
      );
      if (foundOrig) {
        const origClip = foundOrig.clip;
        const fpsRate = getTimelineFps();
        const rawFrame = state.timelineXToRawFrame
          ? state.timelineXToRawFrame(x)
          : state.timelineXToFrame(x);
        const clipStart = origClip.start_frame;
        const clipEnd = origClip.start_frame + origClip.duration_frames;
        const maxFadeForClip = Math.min(AUDIO_FADE_S_MAX, origClip.duration_frames / fpsRate);
        const rawSec =
          ptr.fadeTarget.edge === "in"
            ? (rawFrame - clipStart) / fpsRate
            : (clipEnd - rawFrame) / fpsRate;
        const snappedSec = Math.round(Math.max(0, Math.min(maxFadeForClip, rawSec)) * 20) / 20;
        const patch =
          ptr.fadeTarget.edge === "in" ? { fade_in_s: snappedSec } : { fade_out_s: snappedSec };
        const updated = updateClipAudioInDocument(
          ptr.origDoc,
          ptr.fadeTarget.trackKind,
          ptr.fadeTarget.trackIndex,
          ptr.fadeTarget.clipIndex,
          patch
        );
        const nextDoc = updated.changed ? updated.doc : cloneTimelineDoc(ptr.origDoc);
        const foundNext = findTrackAndClip(
          nextDoc,
          ptr.fadeTarget.trackKind,
          ptr.fadeTarget.trackIndex,
          ptr.fadeTarget.clipIndex
        );
        state.timelineDoc = nextDoc;
        if (foundNext) {
          state.timelineSelected = { kind: "clip", data: foundNext.clip };
        }
        state.timelineActiveFade = {
          ...ptr.fadeTarget,
          x,
          y: state.timelineActiveFade ? state.timelineActiveFade.y : 44,
          seconds: snappedSec
        };
        renderTimelineUI();
      }
      return;
    }

    if (ptr.mode === "trim" && ptr.trimTarget && ptr.origDoc && ptr.origBounds) {
      const edge = ptr.trimTarget.edge;
      const minBound = edge === "left" ? ptr.origBounds.minStart : ptr.origBounds.minEnd;
      const rawMax = edge === "left" ? ptr.origBounds.maxStart : ptr.origBounds.maxEnd;
      const fixedMax = state.timelineDragFixedMaxFrame || state.timelineMaxFrame;
      const maxBound = Number.isFinite(rawMax) ? rawMax : Math.max(fixedMax, minBound + 500);
      const res = resolvePointerFrame(x, {
        includePlayhead: true,
        excludeClip: ptr.trimTarget,
        minFrame: minBound,
        maxFrame: maxBound
      });
      state.timelineActiveSnapFrame = res.snapFrame;
      state.timelineActiveSnapKind = res.snapKind;
      const trimmed = trimClipInDocument(
        ptr.origDoc,
        ptr.trimTarget.trackKind,
        ptr.trimTarget.trackIndex,
        ptr.trimTarget.clipIndex,
        edge,
        res.frame
      );
      const nextDoc = trimmed.changed ? trimmed.doc : cloneTimelineDoc(ptr.origDoc);
      const found = findTrackAndClip(
        nextDoc,
        ptr.trimTarget.trackKind,
        ptr.trimTarget.trackIndex,
        ptr.trimTarget.clipIndex
      );
      state.timelineDoc = nextDoc;
      state.timelineValidation = validateTimelineClient(nextDoc);
      if (found) {
        state.timelineSelected = { kind: "clip", data: found.clip };
      }
      renderTimelineUI();
      return;
    }

    if (ptr.mode === "pending" && ptr.moved) {
      ptr.mode = "scrub";
      canvas.classList.add("is-scrubbing");
    }
    if (ptr.mode === "scrub") {
      const res = resolvePointerFrame(x, { includePlayhead: false });
      const prevSnap = state.timelineActiveSnapFrame;
      state.timelineActiveSnapFrame = res.snapFrame;
      state.timelineActiveSnapKind = res.snapKind;
      if (res.frame !== state.playheadFrame) {
        setPlayhead(res.frame);
      } else if (prevSnap !== state.timelineActiveSnapFrame) {
        redrawActiveCanvases();
      }
    }
  });

  const finishPointer = (ev, cancelled) => {
    if (!ptr.active || ev.pointerId !== ptr.pointerId) return;
    const { x, y } = getCanvasPos(ev);
    const wasScrub = ptr.mode === "scrub";
    const wasTrim = ptr.mode === "trim";
    const wasFade = ptr.mode === "fade";
    const wasMoved = ptr.moved;
    const preSnap = ptr.preSnapshot;
    const trimTarget = ptr.trimTarget;
    const fadeTarget = ptr.fadeTarget;

    ptr.active = false;
    ptr.pointerId = null;
    ptr.mode = null;
    ptr.trimTarget = null;
    ptr.fadeTarget = null;
    ptr.preSnapshot = null;
    ptr.origDoc = null;
    ptr.origBounds = null;
    canvas.classList.remove("is-scrubbing");
    canvas.classList.remove("is-trimming");
    canvas.classList.remove("is-fading");

    if (canvas.releasePointerCapture) {
      try {
        if (!canvas.hasPointerCapture || canvas.hasPointerCapture(ev.pointerId)) {
          canvas.releasePointerCapture(ev.pointerId);
        }
      } catch {
        // Ignore pointer capture release errors
      }
    }

    if (wasFade) {
      state.timelineActiveFade = null;
      if (cancelled && preSnap) {
        state.timelineDoc = preSnap.doc;
        state.timelineSelected = preSnap.selected;
        renderTimelineUI();
        return;
      }
      if (!wasMoved && preSnap && fadeTarget) {
        const origFound = findTrackAndClip(
          preSnap.doc,
          fadeTarget.trackKind,
          fadeTarget.trackIndex,
          fadeTarget.clipIndex
        );
        state.timelineDoc = preSnap.doc;
        if (origFound) state.timelineSelected = { kind: "clip", data: origFound.clip };
        renderTimelineUI();
        return;
      }
      if (preSnap && fadeTarget) {
        const origFound = findTrackAndClip(
          preSnap.doc,
          fadeTarget.trackKind,
          fadeTarget.trackIndex,
          fadeTarget.clipIndex
        );
        const curFound = findTrackAndClip(
          state.timelineDoc,
          fadeTarget.trackKind,
          fadeTarget.trackIndex,
          fadeTarget.clipIndex
        );
        const changed =
          origFound &&
          curFound &&
          (Math.abs((origFound.clip.fade_in_s || 0) - (curFound.clip.fade_in_s || 0)) > 1e-6 ||
            Math.abs((origFound.clip.fade_out_s || 0) - (curFound.clip.fade_out_s || 0)) > 1e-6);
        if (changed) {
          pushUndoSnapshot(preSnap);
        } else {
          state.timelineDoc = preSnap.doc;
          state.timelineSelected = preSnap.selected;
        }
      }
      renderTimelineUI();
      return;
    }

    if (wasTrim) {
      state.timelineActiveTrim = null;
      state.timelineActiveSnapFrame = null;
      state.timelineActiveSnapKind = null;
      state.timelineDragFixedMaxFrame = null;
      if (cancelled && preSnap) {
        state.timelineDoc = preSnap.doc;
        state.timelineSelected = preSnap.selected;
        state.timelineValidation = validateTimelineClient(preSnap.doc);
        state.timelineMaxFrame = computeTimelineMaxFrame(preSnap.doc);
        renderTimelineUI();
        return;
      }
      if (!wasMoved && preSnap && trimTarget) {
        const origFound = findTrackAndClip(
          preSnap.doc,
          trimTarget.trackKind,
          trimTarget.trackIndex,
          trimTarget.clipIndex
        );
        state.timelineDoc = preSnap.doc;
        state.timelineValidation = validateTimelineClient(preSnap.doc);
        if (origFound) {
          state.timelineSelected = { kind: "clip", data: origFound.clip };
        }
        renderTimelineUI();
        return;
      }
      if (preSnap && trimTarget) {
        const origFound = findTrackAndClip(
          preSnap.doc,
          trimTarget.trackKind,
          trimTarget.trackIndex,
          trimTarget.clipIndex
        );
        const curFound = findTrackAndClip(
          state.timelineDoc,
          trimTarget.trackKind,
          trimTarget.trackIndex,
          trimTarget.clipIndex
        );
        const changed =
          origFound &&
          curFound &&
          (origFound.clip.start_frame !== curFound.clip.start_frame ||
            origFound.clip.duration_frames !== curFound.clip.duration_frames);
        if (changed) {
          pushUndoSnapshot(preSnap);
          state.timelineMaxFrame = computeTimelineMaxFrame(state.timelineDoc);
          state.playheadFrame = Math.min(state.playheadFrame, state.timelineMaxFrame);
        } else {
          state.timelineDoc = preSnap.doc;
          state.timelineSelected = preSnap.selected;
          state.timelineValidation = validateTimelineClient(preSnap.doc);
        }
      }
      renderTimelineUI();
      return;
    }

    if (cancelled || !state.timelineXToFrame) {
      if (state.timelineActiveSnapFrame !== null) {
        state.timelineActiveSnapFrame = null;
        state.timelineActiveSnapKind = null;
        redrawActiveCanvases();
      }
      return;
    }

    if (wasScrub) {
      const res = resolvePointerFrame(x, { includePlayhead: false });
      state.timelineActiveSnapFrame = null;
      state.timelineActiveSnapKind = null;
      if (res.frame !== state.playheadFrame) {
        setPlayhead(res.frame);
      } else {
        redrawActiveCanvases();
      }
      if (!wasMoved) {
        const match = hitTestTimeline(x, y);
        if (match && match.kind === "marker") {
          state.timelineSelected = {
            kind: "marker",
            markerIndex: match.box ? match.box.markerIndex : undefined,
            data: match.data
          };
          setPlayhead(match.data.frame);
          renderTimelineSelection();
          renderTimelineIssues();
          redrawActiveCanvases();
        }
      }
      return;
    }

    if (!wasMoved) {
      const match = hitTestTimeline(x, y, { includeTrim: false });
      state.timelineSelected = match
        ? {
            kind: match.kind,
            markerIndex: match.kind === "marker" && match.box ? match.box.markerIndex : undefined,
            data: match.data
          }
        : null;
      if (match && match.kind === "transition" && match.box) {
        state.playheadFrame = match.box.cutFrame;
        updatePlayheadReadout();
      } else if (match && match.kind === "clip") {
        state.playheadFrame = match.data.start_frame;
        updatePlayheadReadout();
      } else if (match && match.kind === "marker") {
        state.playheadFrame = match.data.frame;
        updatePlayheadReadout();
      } else {
        const res = resolvePointerFrame(x, { includePlayhead: false });
        state.playheadFrame = res.frame;
        updatePlayheadReadout();
      }
      updateTimelineToolbarUI();
      renderTimelineSelection();
      renderTimelineIssues();
      redrawActiveCanvases();
    }
  };

  canvas.addEventListener("pointerup", (ev) => finishPointer(ev, false));
  canvas.addEventListener("pointercancel", (ev) => finishPointer(ev, true));
  canvas.addEventListener("pointerleave", () => {
    if (!ptr.active) {
      canvas.style.cursor = "crosshair";
      if (
        state.timelineBladePreview ||
        state.timelineHoverTrim ||
        state.timelineHoverFade ||
        state.timelineHoverTransition ||
        state.timelineActiveSnapFrame !== null
      ) {
        state.timelineBladePreview = null;
        state.timelineHoverTrim = null;
        state.timelineHoverFade = null;
        state.timelineHoverTransition = null;
        state.timelineActiveSnapFrame = null;
        state.timelineActiveSnapKind = null;
        redrawActiveCanvases();
      }
    }
  });
}

function wireClipAudioInspector() {
  const bindings = [
    {
      field: "audio_gain_db",
      rangeId: "clip-audio-gain-range",
      numId: "clip-audio-gain-num",
      resetId: "btn-clip-gain-reset",
      min: AUDIO_GAIN_DB_MIN,
      max: AUDIO_GAIN_DB_MAX,
      decimals: 1
    },
    {
      field: "fade_in_s",
      rangeId: "clip-fade-in-range",
      numId: "clip-fade-in-num",
      resetId: "btn-clip-fade-in-reset",
      min: AUDIO_FADE_S_MIN,
      max: AUDIO_FADE_S_MAX,
      decimals: 2
    },
    {
      field: "fade_out_s",
      rangeId: "clip-fade-out-range",
      numId: "clip-fade-out-num",
      resetId: "btn-clip-fade-out-reset",
      min: AUDIO_FADE_S_MIN,
      max: AUDIO_FADE_S_MAX,
      decimals: 2
    }
  ];

  const liveUpdateClipField = (field, val) => {
    const info = getSelectedClipTrack();
    if (!info) return;
    const res = updateClipAudioInDocument(
      state.timelineDoc,
      info.ref.trackKind,
      info.ref.trackIndex,
      info.ref.clipIndex,
      { [field]: val }
    );
    if (!res.changed) return;
    state.timelineDoc = res.doc;
    state.timelineSelected = { kind: "clip", data: res.clip };
    renderTimelineSelection();
    if (state.activeTab === "timeline") redrawActiveCanvases();
  };

  for (const b of bindings) {
    const rangeEl = byId(b.rangeId);
    const numEl = byId(b.numId);
    const rstEl = byId(b.resetId);
    let dragSnap = null;

    if (rangeEl) {
      rangeEl.addEventListener("pointerdown", () => {
        dragSnap = captureTimelineSnapshot();
      });
      rangeEl.addEventListener("input", () => {
        const val = Number.parseFloat(rangeEl.value);
        if (!Number.isFinite(val)) return;
        if (!dragSnap) dragSnap = captureTimelineSnapshot();
        liveUpdateClipField(b.field, val);
      });
      rangeEl.addEventListener("change", () => {
        const val = Number.parseFloat(rangeEl.value);
        if (Number.isFinite(val) && dragSnap) {
          const info = getSelectedClipTrack();
          if (info) {
            pushUndoSnapshot(dragSnap);
            updateTimelineToolbarUI();
          }
        }
        dragSnap = null;
      });
    }

    if (numEl) {
      numEl.addEventListener("focus", () => {
        dragSnap = captureTimelineSnapshot();
      });
      numEl.addEventListener("input", () => {
        const val = Number.parseFloat(numEl.value);
        if (Number.isFinite(val) && val >= b.min && val <= b.max) {
          if (!dragSnap) dragSnap = captureTimelineSnapshot();
          liveUpdateClipField(b.field, val);
        }
      });
      numEl.addEventListener("change", () => {
        const raw = Number.parseFloat(numEl.value);
        const info = getSelectedClipTrack();
        if (!info) return;
        if (!Number.isFinite(raw)) {
          renderTimelineAudioInspector();
          dragSnap = null;
          return;
        }
        const clamped = Math.min(b.max, Math.max(b.min, raw));
        const baseDoc = dragSnap && dragSnap.doc ? dragSnap.doc : state.timelineDoc;
        const baseRef = dragSnap && dragSnap.selected && dragSnap.selected.kind === "clip"
          ? findClipIndex(baseDoc, dragSnap.selected.data)
          : info.ref;
        if (baseRef) {
          const res = updateClipAudioInDocument(
            baseDoc,
            baseRef.trackKind,
            baseRef.trackIndex,
            baseRef.clipIndex,
            { [b.field]: clamped }
          );
          if (res.changed) {
            commitTimelineMutation(res.doc, { kind: "clip", data: res.clip }, dragSnap);
          } else {
            renderTimelineSelection();
          }
        }
        numEl.value = clamped.toFixed(b.decimals);
        dragSnap = null;
      });
    }

    if (rstEl) {
      rstEl.addEventListener("click", () => {
        const info = getSelectedClipTrack();
        if (!info) return;
        const res = updateClipAudioInDocument(
          state.timelineDoc,
          info.ref.trackKind,
          info.ref.trackIndex,
          info.ref.clipIndex,
          { [b.field]: 0 }
        );
        if (res.changed) {
          commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
        }
      });
    }
  }

  const sendBtn = byId("btn-clip-audio-to-deliver");
  if (sendBtn) {
    sendBtn.addEventListener("click", () => {
      const chk = byId("render-use-clip-audio");
      if (chk) chk.checked = true;
      switchTab("render");
      showBanner("Selected clip audio gain, fades & track mute/solo linked to Deliver page.", "success");
    });
  }

  wireAutoDuckInspector();
  wireFairlightAudioInspector();
}

function wireFairlightAudioInspector() {
  const tlEq = byId("fairlight-dialogue-eq");
  const tlLoud = byId("fairlight-loudness-preset");
  const delEq = byId("render-dialogue-eq");
  const delLoud = byId("render-loudness-preset");
  const resetBtn = byId("btn-fairlight-reset");

  if (tlEq) {
    tlEq.addEventListener("change", () => {
      setFairlightState({ dialogue_eq: tlEq.value }, { syncLufs: false, markCustom: false });
    });
  }
  if (delEq) {
    delEq.addEventListener("change", () => {
      setFairlightState({ dialogue_eq: delEq.value }, { syncLufs: false, markCustom: true });
    });
  }
  if (tlLoud) {
    tlLoud.addEventListener("change", () => {
      setFairlightState({ loudness_preset: tlLoud.value }, { syncLufs: true, markCustom: true });
    });
  }
  if (delLoud) {
    delLoud.addEventListener("change", () => {
      setFairlightState({ loudness_preset: delLoud.value }, { syncLufs: true, markCustom: true });
    });
  }
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      setFairlightState(
        { loudness_preset: "off", dialogue_eq: "off" },
        { syncLufs: true, markCustom: true }
      );
    });
  }
}

function wireAutoDuckInspector() {
  const toggleBtn = byId("btn-auto-duck-toggle");
  const threshRange = byId("auto-duck-threshold-range");
  const threshNum = byId("auto-duck-threshold-num");
  const resetBtn = byId("btn-auto-duck-reset");
  const ratioNum = byId("auto-duck-ratio-num");
  const attackNum = byId("auto-duck-attack-num");
  const releaseNum = byId("auto-duck-release-num");

  const updateDuckState = (patch) => {
    state.autoDuck = normalizeAutoDuckParams({ ...state.autoDuck, ...patch });
    renderAutoDuckInspector();
    updateVuMeterInstant(performance.now(), state.playbackSpeed !== 0);
  };

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      updateDuckState({ enabled: !state.autoDuck.enabled });
    });
  }

  if (threshRange) {
    threshRange.addEventListener("input", () => {
      const val = Number.parseFloat(threshRange.value);
      if (Number.isFinite(val)) {
        updateDuckState({ threshold_db: val });
      }
    });
  }

  const bindDuckNumeric = (el, field, minVal, maxVal, decimals) => {
    if (!el) return;
    el.addEventListener("input", () => {
      const val = Number.parseFloat(el.value);
      if (Number.isFinite(val) && val >= minVal && val <= maxVal) {
        updateDuckState({ [field]: val });
      }
    });
    el.addEventListener("change", () => {
      const raw = Number.parseFloat(el.value);
      if (!Number.isFinite(raw)) {
        renderAutoDuckInspector();
        return;
      }
      const clamped = Math.min(maxVal, Math.max(minVal, raw));
      updateDuckState({ [field]: clamped });
      el.value = decimals > 0 ? clamped.toFixed(decimals) : String(Math.round(clamped));
    });
  };

  bindDuckNumeric(
    threshNum,
    "threshold_db",
    AUTO_DUCK_THRESHOLD_DB_MIN,
    AUTO_DUCK_THRESHOLD_DB_MAX,
    0
  );
  bindDuckNumeric(ratioNum, "ratio", AUTO_DUCK_RATIO_MIN, AUTO_DUCK_RATIO_MAX, 1);
  bindDuckNumeric(attackNum, "attack_ms", AUTO_DUCK_ATTACK_MS_MIN, AUTO_DUCK_ATTACK_MS_MAX, 0);
  bindDuckNumeric(releaseNum, "release_ms", AUTO_DUCK_RELEASE_MS_MIN, AUTO_DUCK_RELEASE_MS_MAX, 0);

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      state.autoDuck = normalizeAutoDuckParams({
        enabled: false,
        threshold_db: AUTO_DUCK_THRESHOLD_DB_DEFAULT,
        ratio: AUTO_DUCK_RATIO_DEFAULT,
        attack_ms: AUTO_DUCK_ATTACK_MS_DEFAULT,
        release_ms: AUTO_DUCK_RELEASE_MS_DEFAULT
      });
      renderAutoDuckInspector();
      updateVuMeterInstant(performance.now(), state.playbackSpeed !== 0);
    });
  }
}

function wireClipRetimeInspector() {
  const rangeEl = byId("clip-retime-speed-range");
  const numEl = byId("clip-retime-speed-num");
  const rstEl = byId("btn-clip-retime-reset");
  const revEl = byId("btn-clip-retime-reverse");
  const sendBtn = byId("btn-clip-retime-to-deliver");
  const presetBtns = document.querySelectorAll(".retime-preset-btn");
  let dragSnap = null;

  const liveUpdateRetime = (patch) => {
    const info = getSelectedClipTrack();
    if (!info) return;
    const res = updateClipRetimeInDocument(
      state.timelineDoc,
      info.ref.trackKind,
      info.ref.trackIndex,
      info.ref.clipIndex,
      patch
    );
    if (!res.changed) return;
    state.timelineDoc = res.doc;
    state.timelineSelected = { kind: "clip", data: res.clip };
    renderTimelineSelection();
    if (state.activeTab === "timeline") redrawActiveCanvases();
  };

  for (const btn of presetBtns) {
    btn.addEventListener("click", () => {
      const info = getSelectedClipTrack();
      if (!info) return;
      const speedVal = Number.parseFloat(btn.getAttribute("data-retime-preset") || "1");
      if (!Number.isFinite(speedVal)) return;
      const res = updateClipRetimeInDocument(
        state.timelineDoc,
        info.ref.trackKind,
        info.ref.trackIndex,
        info.ref.clipIndex,
        { speed_rate: speedVal }
      );
      if (res.changed) {
        commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
      }
    });
  }

  if (rangeEl) {
    rangeEl.addEventListener("pointerdown", () => {
      dragSnap = captureTimelineSnapshot();
    });
    rangeEl.addEventListener("input", () => {
      const val = Number.parseFloat(rangeEl.value);
      if (!Number.isFinite(val)) return;
      if (!dragSnap) dragSnap = captureTimelineSnapshot();
      liveUpdateRetime({ speed_rate: val });
    });
    rangeEl.addEventListener("change", () => {
      const val = Number.parseFloat(rangeEl.value);
      if (Number.isFinite(val) && dragSnap) {
        const info = getSelectedClipTrack();
        if (info) {
          pushUndoSnapshot(dragSnap);
          updateTimelineToolbarUI();
        }
      }
      dragSnap = null;
    });
  }

  if (numEl) {
    numEl.addEventListener("focus", () => {
      dragSnap = captureTimelineSnapshot();
    });
    numEl.addEventListener("input", () => {
      const val = Number.parseFloat(numEl.value);
      if (Number.isFinite(val) && val >= RETIME_SPEED_MIN && val <= RETIME_SPEED_MAX) {
        if (!dragSnap) dragSnap = captureTimelineSnapshot();
        liveUpdateRetime({ speed_rate: val });
      }
    });
    numEl.addEventListener("change", () => {
      const raw = Number.parseFloat(numEl.value);
      const info = getSelectedClipTrack();
      if (!info) return;
      if (!Number.isFinite(raw)) {
        renderTimelineRetimeInspector();
        dragSnap = null;
        return;
      }
      const clamped = Math.min(RETIME_SPEED_MAX, Math.max(RETIME_SPEED_MIN, raw));
      const baseDoc = dragSnap && dragSnap.doc ? dragSnap.doc : state.timelineDoc;
      const baseRef = dragSnap && dragSnap.selected && dragSnap.selected.kind === "clip"
        ? findClipIndex(baseDoc, dragSnap.selected.data)
        : info.ref;
      if (baseRef) {
        const res = updateClipRetimeInDocument(
          baseDoc,
          baseRef.trackKind,
          baseRef.trackIndex,
          baseRef.clipIndex,
          { speed_rate: clamped }
        );
        if (res.changed) {
          commitTimelineMutation(res.doc, { kind: "clip", data: res.clip }, dragSnap);
        } else {
          renderTimelineSelection();
        }
      }
      numEl.value = clamped.toFixed(2);
      dragSnap = null;
    });
  }

  if (revEl) {
    revEl.addEventListener("click", () => {
      const info = getSelectedClipTrack();
      if (!info) return;
      const norm = normalizeClipRetime(info.clip);
      const res = updateClipRetimeInDocument(
        state.timelineDoc,
        info.ref.trackKind,
        info.ref.trackIndex,
        info.ref.clipIndex,
        { reverse: !norm.reverse }
      );
      if (res.changed) {
        commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
      }
    });
  }

  if (rstEl) {
    rstEl.addEventListener("click", () => {
      const info = getSelectedClipTrack();
      if (!info) return;
      const res = updateClipRetimeInDocument(
        state.timelineDoc,
        info.ref.trackKind,
        info.ref.trackIndex,
        info.ref.clipIndex,
        { speed_rate: 1.0, reverse: false }
      );
      if (res.changed) {
        commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
      }
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", () => {
      const chk = byId("render-use-clip-retime");
      if (chk) chk.checked = true;
      switchTab("render");
      showBanner("Selected clip speed / retime linked to Deliver page.", "success");
    });
  }
}

function wireClipTransformInspector() {
  const rstAllBtn = byId("btn-clip-transform-reset-all");
  const sendBtn = byId("btn-clip-transform-to-deliver");
  const dzSel = byId("clip-transform-dynamic-zoom");
  const presetBtns = document.querySelectorAll(".transform-preset-btn");

  const fields = [
    {
      field: "zoom_pct",
      rangeId: "clip-transform-zoom-range",
      numId: "clip-transform-zoom-num",
      rstId: "btn-clip-transform-zoom-reset",
      min: TRANSFORM_ZOOM_MIN,
      max: TRANSFORM_ZOOM_MAX,
      def: TRANSFORM_ZOOM_DEFAULT
    },
    {
      field: "pos_x_pct",
      rangeId: "clip-transform-posx-range",
      numId: "clip-transform-posx-num",
      rstId: "btn-clip-transform-posx-reset",
      min: TRANSFORM_POS_MIN,
      max: TRANSFORM_POS_MAX,
      def: TRANSFORM_POS_DEFAULT
    },
    {
      field: "pos_y_pct",
      rangeId: "clip-transform-posy-range",
      numId: "clip-transform-posy-num",
      rstId: "btn-clip-transform-posy-reset",
      min: TRANSFORM_POS_MIN,
      max: TRANSFORM_POS_MAX,
      def: TRANSFORM_POS_DEFAULT
    },
    {
      field: "rotation_deg",
      rangeId: "clip-transform-rot-range",
      numId: "clip-transform-rot-num",
      rstId: "btn-clip-transform-rot-reset",
      min: TRANSFORM_ROT_MIN,
      max: TRANSFORM_ROT_MAX,
      def: TRANSFORM_ROT_DEFAULT
    },
    {
      field: "opacity_pct",
      rangeId: "clip-transform-opacity-range",
      numId: "clip-transform-opacity-num",
      rstId: "btn-clip-transform-opacity-reset",
      min: TRANSFORM_OPACITY_MIN,
      max: TRANSFORM_OPACITY_MAX,
      def: TRANSFORM_OPACITY_DEFAULT
    }
  ];

  const liveUpdateTransform = (patch) => {
    const info = getSelectedClipTrack();
    if (!info || info.clip.media_type === "audio") return;
    const res = updateClipTransformInDocument(
      state.timelineDoc,
      info.ref.trackKind,
      info.ref.trackIndex,
      info.ref.clipIndex,
      patch
    );
    if (!res.changed) return;
    state.timelineDoc = res.doc;
    state.timelineSelected = { kind: "clip", data: res.clip };
    renderTimelineSelection();
    if (state.activeTab === "timeline") redrawActiveCanvases();
  };

  for (const btn of presetBtns) {
    btn.addEventListener("click", () => {
      const info = getSelectedClipTrack();
      if (!info || info.clip.media_type === "audio") return;
      const pid = btn.getAttribute("data-transform-preset") || "";
      const preset = getTransformPresetClient(pid);
      if (!preset) return;
      const res = updateClipTransformInDocument(
        state.timelineDoc,
        info.ref.trackKind,
        info.ref.trackIndex,
        info.ref.clipIndex,
        {
          zoom_pct: preset.zoom_pct,
          pos_x_pct: preset.pos_x_pct,
          pos_y_pct: preset.pos_y_pct,
          rotation_deg: preset.rotation_deg,
          opacity_pct: preset.opacity_pct,
          dynamic_zoom: preset.dynamic_zoom || DYNAMIC_ZOOM_DEFAULT
        }
      );
      if (res.changed) {
        commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
      }
    });
  }

  if (dzSel) {
    dzSel.addEventListener("change", () => {
      const info = getSelectedClipTrack();
      if (!info || info.clip.media_type === "audio") return;
      const res = updateClipTransformInDocument(
        state.timelineDoc,
        info.ref.trackKind,
        info.ref.trackIndex,
        info.ref.clipIndex,
        { dynamic_zoom: dzSel.value }
      );
      if (res.changed) {
        commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
      }
    });
  }

  for (const spec of fields) {
    const rangeEl = byId(spec.rangeId);
    const numEl = byId(spec.numId);
    const rstEl = byId(spec.rstId);
    let dragSnap = null;

    if (rangeEl) {
      rangeEl.addEventListener("pointerdown", () => {
        dragSnap = captureTimelineSnapshot();
      });
      rangeEl.addEventListener("input", () => {
        const val = Number.parseFloat(rangeEl.value);
        if (!Number.isFinite(val)) return;
        if (!dragSnap) dragSnap = captureTimelineSnapshot();
        liveUpdateTransform({ [spec.field]: val });
      });
      rangeEl.addEventListener("change", () => {
        const val = Number.parseFloat(rangeEl.value);
        if (Number.isFinite(val) && dragSnap) {
          const info = getSelectedClipTrack();
          if (info && info.clip.media_type !== "audio") {
            pushUndoSnapshot(dragSnap);
            updateTimelineToolbarUI();
          }
        }
        dragSnap = null;
      });
    }

    if (numEl) {
      numEl.addEventListener("focus", () => {
        dragSnap = captureTimelineSnapshot();
      });
      numEl.addEventListener("input", () => {
        const val = Number.parseFloat(numEl.value);
        if (Number.isFinite(val) && val >= spec.min && val <= spec.max) {
          if (!dragSnap) dragSnap = captureTimelineSnapshot();
          liveUpdateTransform({ [spec.field]: val });
        }
      });
      numEl.addEventListener("change", () => {
        const raw = Number.parseFloat(numEl.value);
        const info = getSelectedClipTrack();
        if (!info || info.clip.media_type === "audio") return;
        if (!Number.isFinite(raw)) {
          renderTimelineTransformInspector();
          dragSnap = null;
          return;
        }
        const clamped = Math.min(spec.max, Math.max(spec.min, raw));
        const baseDoc = dragSnap && dragSnap.doc ? dragSnap.doc : state.timelineDoc;
        const baseRef =
          dragSnap && dragSnap.selected && dragSnap.selected.kind === "clip"
            ? findClipIndex(baseDoc, dragSnap.selected.data)
            : info.ref;
        if (baseRef) {
          const res = updateClipTransformInDocument(
            baseDoc,
            baseRef.trackKind,
            baseRef.trackIndex,
            baseRef.clipIndex,
            { [spec.field]: clamped }
          );
          if (res.changed) {
            commitTimelineMutation(res.doc, { kind: "clip", data: res.clip }, dragSnap);
          } else {
            renderTimelineSelection();
          }
        }
        numEl.value = clamped.toFixed(1);
        dragSnap = null;
      });
    }

    if (rstEl) {
      rstEl.addEventListener("click", () => {
        const info = getSelectedClipTrack();
        if (!info || info.clip.media_type === "audio") return;
        const res = updateClipTransformInDocument(
          state.timelineDoc,
          info.ref.trackKind,
          info.ref.trackIndex,
          info.ref.clipIndex,
          { [spec.field]: spec.def }
        );
        if (res.changed) {
          commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
        }
      });
    }
  }

  if (rstAllBtn) {
    rstAllBtn.addEventListener("click", () => {
      const info = getSelectedClipTrack();
      if (!info || info.clip.media_type === "audio") return;
      const res = updateClipTransformInDocument(
        state.timelineDoc,
        info.ref.trackKind,
        info.ref.trackIndex,
        info.ref.clipIndex,
        {
          zoom_pct: TRANSFORM_ZOOM_DEFAULT,
          pos_x_pct: TRANSFORM_POS_DEFAULT,
          pos_y_pct: TRANSFORM_POS_DEFAULT,
          rotation_deg: TRANSFORM_ROT_DEFAULT,
          opacity_pct: TRANSFORM_OPACITY_DEFAULT,
          dynamic_zoom: DYNAMIC_ZOOM_DEFAULT
        }
      );
      if (res.changed) {
        commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
      }
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", () => {
      const chk = byId("render-use-clip-transform");
      if (chk) chk.checked = true;
      switchTab("render");
      showBanner("Selected clip motion transform linked to Deliver page.", "success");
    });
  }
}

function wireClipTransitionInspector() {
  const presetSel = byId("clip-transition-preset");
  const durRange = byId("clip-transition-dur-range");
  const durNum = byId("clip-transition-dur-num");
  const audioChk = byId("clip-transition-audio");
  const rstBtn = byId("btn-clip-transition-reset");
  const previewBtn = byId("btn-clip-transition-preview");
  let dragSnap = null;

  const liveUpdateTransition = (patch) => {
    const junction = getSelectedTransitionTarget();
    if (!junction) return;
    const res = updateClipTransitionInDocument(
      state.timelineDoc,
      junction.trackKind,
      junction.trackIndex,
      junction.clipAIndex,
      patch
    );
    if (!res.changed) return;
    state.timelineDoc = res.doc;
    const selKind =
      state.timelineSelected && state.timelineSelected.kind === "transition"
        ? "transition"
        : "clip";
    state.timelineSelected = { kind: selKind, data: res.clip };
    renderTimelineSelection();
    if (state.activeTab === "timeline") redrawActiveCanvases();
  };

  if (presetSel) {
    presetSel.addEventListener("change", () => {
      const junction = getSelectedTransitionTarget();
      if (!junction) return;
      const val = presetSel.value;
      const patch =
        val === "none"
          ? null
          : {
              preset: val,
              duration_s: junction.transition
                ? junction.transition.duration_s
                : TRANSITION_DURATION_DEFAULT_S,
              include_audio: junction.transition ? junction.transition.include_audio : true
            };
      const res = updateClipTransitionInDocument(
        state.timelineDoc,
        junction.trackKind,
        junction.trackIndex,
        junction.clipAIndex,
        patch
      );
      if (res.changed) {
        const selKind =
          state.timelineSelected && state.timelineSelected.kind === "transition"
            ? "transition"
            : "clip";
        commitTimelineMutation(res.doc, { kind: selKind, data: res.clip });
      }
    });
  }

  if (durRange) {
    durRange.addEventListener("pointerdown", () => {
      dragSnap = captureTimelineSnapshot();
    });
    durRange.addEventListener("input", () => {
      const val = Number.parseFloat(durRange.value);
      if (!Number.isFinite(val)) return;
      if (!dragSnap) dragSnap = captureTimelineSnapshot();
      liveUpdateTransition({ duration_s: val });
    });
    durRange.addEventListener("change", () => {
      const val = Number.parseFloat(durRange.value);
      if (Number.isFinite(val) && dragSnap) {
        const junction = getSelectedTransitionTarget();
        if (junction) {
          pushUndoSnapshot(dragSnap);
          updateTimelineToolbarUI();
        }
      }
      dragSnap = null;
    });
  }

  if (durNum) {
    durNum.addEventListener("focus", () => {
      dragSnap = captureTimelineSnapshot();
    });
    durNum.addEventListener("input", () => {
      const val = Number.parseFloat(durNum.value);
      if (
        Number.isFinite(val) &&
        val >= TRANSITION_DURATION_MIN_S &&
        val <= TRANSITION_DURATION_MAX_S
      ) {
        if (!dragSnap) dragSnap = captureTimelineSnapshot();
        liveUpdateTransition({ duration_s: val });
      }
    });
    durNum.addEventListener("change", () => {
      const raw = Number.parseFloat(durNum.value);
      const junction = getSelectedTransitionTarget();
      if (!junction) return;
      if (!Number.isFinite(raw)) {
        renderTimelineTransitionInspector();
        dragSnap = null;
        return;
      }
      const clamped = Math.min(TRANSITION_DURATION_MAX_S, Math.max(TRANSITION_DURATION_MIN_S, raw));
      const baseDoc = dragSnap && dragSnap.doc ? dragSnap.doc : state.timelineDoc;
      const res = updateClipTransitionInDocument(
        baseDoc,
        junction.trackKind,
        junction.trackIndex,
        junction.clipAIndex,
        { duration_s: clamped }
      );
      if (res.changed) {
        const selKind =
          state.timelineSelected && state.timelineSelected.kind === "transition"
            ? "transition"
            : "clip";
        commitTimelineMutation(res.doc, { kind: selKind, data: res.clip }, dragSnap);
      } else {
        renderTimelineSelection();
      }
      durNum.value = clamped.toFixed(2);
      dragSnap = null;
    });
  }

  if (audioChk) {
    audioChk.addEventListener("change", () => {
      const junction = getSelectedTransitionTarget();
      if (!junction || !junction.transition) return;
      const res = updateClipTransitionInDocument(
        state.timelineDoc,
        junction.trackKind,
        junction.trackIndex,
        junction.clipAIndex,
        { include_audio: audioChk.checked }
      );
      if (res.changed) {
        const selKind =
          state.timelineSelected && state.timelineSelected.kind === "transition"
            ? "transition"
            : "clip";
        commitTimelineMutation(res.doc, { kind: selKind, data: res.clip });
      }
    });
  }

  if (rstBtn) {
    rstBtn.addEventListener("click", () => {
      const junction = getSelectedTransitionTarget();
      if (!junction) return;
      const res = updateClipTransitionInDocument(
        state.timelineDoc,
        junction.trackKind,
        junction.trackIndex,
        junction.clipAIndex,
        null
      );
      if (res.changed) {
        commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
      }
    });
  }

  if (previewBtn) {
    previewBtn.addEventListener("click", () => {
      const junction = getSelectedTransitionTarget();
      if (!junction) return;
      stopPlayback();
      setPlayhead(junction.cutFrame);
    });
  }
}

function wireTimelineMarkerAndBpmControls() {
  for (const btn of document.querySelectorAll("[data-marker-new-color]")) {
    btn.addEventListener("click", () => {
      const col = btn.getAttribute("data-marker-new-color");
      if (col) setNewMarkerColor(col);
    });
  }

  for (const btn of document.querySelectorAll("[data-marker-edit-color]")) {
    btn.addEventListener("click", () => {
      const info = getSelectedMarkerInfo();
      const col = btn.getAttribute("data-marker-edit-color");
      if (!info || !col) return;
      const res = updateMarkerInDocument(state.timelineDoc, info.markerIndex, { color: col });
      if (res.changed) {
        commitTimelineMutation(res.doc, {
          kind: "marker",
          markerIndex: res.markerIndex,
          data: res.marker
        });
      }
    });
  }

  const jumpBtn = byId("btn-marker-jump");
  if (jumpBtn) {
    jumpBtn.addEventListener("click", () => {
      const info = getSelectedMarkerInfo();
      if (info) jumpToMarkerAction(info.markerIndex);
    });
  }

  const delBtn = byId("btn-marker-delete");
  if (delBtn) {
    delBtn.addEventListener("click", () => {
      const info = getSelectedMarkerInfo();
      if (info) deleteMarkerAction(info.markerIndex);
    });
  }

  const labelInput = byId("marker-label-input");
  if (labelInput) {
    let dragSnap = null;
    labelInput.addEventListener("focus", () => {
      dragSnap = captureTimelineSnapshot();
    });
    labelInput.addEventListener("input", () => {
      const info = getSelectedMarkerInfo();
      if (!info) return;
      if (!dragSnap) dragSnap = captureTimelineSnapshot();
      const res = updateMarkerInDocument(state.timelineDoc, info.markerIndex, {
        name: labelInput.value
      });
      if (!res.changed) return;
      state.timelineDoc = res.doc;
      state.timelineSelected = {
        kind: "marker",
        markerIndex: res.markerIndex,
        data: res.marker
      };
      const inlineEl = document.querySelector(
        `[data-marker-inline-label="${res.markerIndex}"]`
      );
      if (inlineEl && document.activeElement !== inlineEl) {
        inlineEl.value = res.marker.name;
      }
      renderTimelineSelection();
      if (state.activeTab === "timeline") redrawActiveCanvases();
    });
    labelInput.addEventListener("change", () => {
      const info = getSelectedMarkerInfo();
      if (!info) {
        dragSnap = null;
        return;
      }
      const trimmed = labelInput.value.trim() || `Marker ${info.markerIndex + 1}`;
      labelInput.value = trimmed;
      const baseDoc = dragSnap && dragSnap.doc ? dragSnap.doc : state.timelineDoc;
      const res = updateMarkerInDocument(baseDoc, info.markerIndex, { name: trimmed });
      if (res.changed) {
        commitTimelineMutation(
          res.doc,
          { kind: "marker", markerIndex: res.markerIndex, data: res.marker },
          dragSnap
        );
      } else {
        renderTimelineUI();
      }
      dragSnap = null;
    });
    labelInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        labelInput.blur();
      }
    });
  }

  const noteInput = byId("marker-note-input");
  if (noteInput) {
    let dragSnap = null;
    noteInput.addEventListener("focus", () => {
      dragSnap = captureTimelineSnapshot();
    });
    noteInput.addEventListener("input", () => {
      const info = getSelectedMarkerInfo();
      if (!info) return;
      if (!dragSnap) dragSnap = captureTimelineSnapshot();
      const res = updateMarkerInDocument(state.timelineDoc, info.markerIndex, {
        note: noteInput.value
      });
      if (!res.changed) return;
      state.timelineDoc = res.doc;
      state.timelineSelected = {
        kind: "marker",
        markerIndex: res.markerIndex,
        data: res.marker
      };
      renderTimelineSelection();
    });
    noteInput.addEventListener("change", () => {
      const info = getSelectedMarkerInfo();
      if (!info) {
        dragSnap = null;
        return;
      }
      const trimmed = noteInput.value.trim();
      noteInput.value = trimmed;
      const baseDoc = dragSnap && dragSnap.doc ? dragSnap.doc : state.timelineDoc;
      const res = updateMarkerInDocument(baseDoc, info.markerIndex, { note: trimmed });
      if (res.changed) {
        commitTimelineMutation(
          res.doc,
          { kind: "marker", markerIndex: res.markerIndex, data: res.marker },
          dragSnap
        );
      } else {
        renderTimelineUI();
      }
      dragSnap = null;
    });
    noteInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        noteInput.blur();
      }
    });
  }

  const bpmBtn = byId("btn-bpm-grid");
  if (bpmBtn) {
    bpmBtn.addEventListener("click", toggleBpmGrid);
  }

  const bpmInput = byId("bpm-grid-bpm");
  if (bpmInput) {
    bpmInput.addEventListener("input", () => {
      const val = Number.parseFloat(bpmInput.value);
      if (Number.isFinite(val) && val >= BPM_MIN && val <= BPM_MAX) {
        state.bpmGrid.bpm = Math.round(val * 10) / 10;
        updateTimelineToolbarUI();
        if (state.activeTab === "timeline") redrawActiveCanvases();
      }
    });
    bpmInput.addEventListener("change", () => {
      const raw = Number.parseFloat(bpmInput.value);
      const next = Number.isFinite(raw)
        ? Math.round(Math.min(BPM_MAX, Math.max(BPM_MIN, raw)) * 10) / 10
        : state.bpmGrid.bpm;
      state.bpmGrid.bpm = next;
      bpmInput.value = String(next);
      updateTimelineToolbarUI();
      if (state.activeTab === "timeline") redrawActiveCanvases();
    });
  }

  const offsetInput = byId("bpm-grid-offset");
  if (offsetInput) {
    offsetInput.addEventListener("input", () => {
      const val = Number.parseFloat(offsetInput.value);
      if (Number.isFinite(val) && val >= BPM_OFFSET_MIN_S && val <= BPM_OFFSET_MAX_S) {
        state.bpmGrid.offset_s = Math.round(val * 1000) / 1000;
        if (state.activeTab === "timeline") redrawActiveCanvases();
      }
    });
    offsetInput.addEventListener("change", () => {
      const raw = Number.parseFloat(offsetInput.value);
      const next = Number.isFinite(raw)
        ? Math.round(Math.min(BPM_OFFSET_MAX_S, Math.max(BPM_OFFSET_MIN_S, raw)) * 1000) / 1000
        : state.bpmGrid.offset_s;
      state.bpmGrid.offset_s = next;
      offsetInput.value = Number(next).toFixed(1);
      if (state.activeTab === "timeline") redrawActiveCanvases();
    });
  }
}

function wireEvents() {
  byId("status-banner-close").addEventListener("click", hideBanner);
  const updateBtn = byId("update-banner-btn");
  if (updateBtn) updateBtn.addEventListener("click", applyStudioUpdate);
  const saveProjBtn = byId("btn-save-project");
  if (saveProjBtn) saveProjBtn.addEventListener("click", saveProjectAction);
  const openProjBtn = byId("btn-open-project");
  const projFileInput = byId("project-file-input");
  if (openProjBtn && projFileInput) {
    openProjBtn.addEventListener("click", () => projFileInput.click());
    projFileInput.addEventListener("change", async (ev) => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      await openProjectFromFile(file);
      ev.target.value = "";
    });
  }
  byId("lang-en").addEventListener("click", () => setLanguage("en"));
  byId("lang-fr").addEventListener("click", () => setLanguage("fr"));
  const helpBtn = byId("btn-shortcuts-help");
  if (helpBtn) helpBtn.addEventListener("click", toggleShortcutsDialog);
  const closeHelpBtn = byId("btn-close-shortcuts-dialog");
  if (closeHelpBtn) closeHelpBtn.addEventListener("click", closeShortcutsDialog);
  const shortcutsDlg = byId("nle-shortcuts-dialog");
  if (shortcutsDlg) {
    shortcutsDlg.addEventListener("click", (ev) => {
      if (ev.target === shortcutsDlg) closeShortcutsDialog();
    });
  }

  for (const tabBtn of document.querySelectorAll(".page-tab")) {
    tabBtn.addEventListener("click", () => switchTab(tabBtn.getAttribute("data-tab")));
  }

  // Timeline page events
  byId("btn-load-sample-clean").addEventListener("click", () => loadSampleTimeline("clean"));
  byId("btn-load-sample-issues").addEventListener("click", () => loadSampleTimeline("issues"));
  byId("btn-refresh-workspace").addEventListener("click", () => {
    refreshWorkspaceFiles().catch((err) => showBanner(err.message, "error"));
  });

  byId("btn-inspect-workspace").addEventListener("click", async () => {
    try {
      const path = byId("timeline-workspace-select").value;
      if (!path) throw new Error("Select a timeline file from the workspace dropdown first.");
      const seqName = byId("timeline-name-filter").value.trim() || null;
      const data = await api.inspectTimeline({ path, timeline_name: seqName });
      setTimelineData(data);
      showBanner(`Inspected ${path}`, "success");
    } catch (err) {
      showBanner(err.message, "error");
    }
  });

  byId("timeline-file-input").addEventListener("change", async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);
      const seqName = byId("timeline-name-filter").value.trim() || null;
      const data = await api.inspectTimeline({
        filename: file.name,
        content_base64: b64,
        timeline_name: seqName
      });
      setTimelineData(data);
      showBanner(`Loaded local file ${file.name}`, "success");
    } catch (err) {
      showBanner(err.message, "error");
    }
  });

  byId("btn-timeline-validate").addEventListener("click", async () => {
    try {
      if (!state.timelineDoc) throw new Error("Load or inspect a timeline first.");
      const data = await api.validateTimeline({ document: state.timelineDoc });
      state.timelineDoc = data.document;
      state.timelineValidation = data.validation;
      state.timelineMaxFrame = computeTimelineMaxFrame(data.document);
      renderTimelineUI();
      showBanner(
        data.validation.valid
          ? "Timeline validation passed with 0 issues."
          : `Validation detected ${data.validation.issues.length} issue(s).`,
        data.validation.valid ? "success" : "error"
      );
    } catch (err) {
      showBanner(err.message, "error");
    }
  });

  byId("otio-format-select").addEventListener("change", () => {
    const fmt = byId("otio-format-select").value;
    const cur = byId("otio-workspace-out").value.trim() || "exports/timeline.otio";
    byId("otio-workspace-out").value = cur.replace(/\.(otioz|otio)$/i, "") + `.${fmt}`;
  });

  byId("btn-timeline-download").addEventListener("click", async () => {
    try {
      if (!state.timelineDoc) throw new Error("Load or inspect a timeline first.");
      const fmt = byId("otio-format-select").value;
      const blob = await api.downloadOtioBlob(state.timelineDoc, fmt);
      const stem = (state.timelineDoc.name || "timeline").replace(/[^A-Za-z0-9._-]/g, "_");
      triggerBlobDownload(blob, `${stem}.${fmt}`);
      byId("timeline-export-feedback").textContent = `Downloaded ${stem}.${fmt} (${blob.size} bytes)`;
    } catch (err) {
      showBanner(err.message, "error");
    }
  });

  byId("btn-timeline-save").addEventListener("click", async () => {
    try {
      if (!state.timelineDoc) throw new Error("Load or inspect a timeline first.");
      const outPath = byId("otio-workspace-out").value.trim();
      const data = await api.saveOtioToWorkspace({ document: state.timelineDoc, out_path: outPath });
      byId("timeline-export-feedback").textContent = `Saved ${data.output_path} (${data.bytes_written} bytes)`;
      showBanner(`Exported OTIO to ${data.output_path}`, "success");
      await refreshWorkspaceFiles();
    } catch (err) {
      showBanner(err.message, "error");
    }
  });

  byId("btn-tool-select").addEventListener("click", () => setTimelineTool("select"));
  byId("btn-tool-blade").addEventListener("click", () =>
    setTimelineTool(state.timelineTool === "blade" ? "select" : "blade")
  );
  byId("btn-timeline-split").addEventListener("click", splitAtPlayheadAction);
  const rippleDeleteBtn = byId("btn-clip-ripple-delete");
  if (rippleDeleteBtn) {
    rippleDeleteBtn.addEventListener("click", rippleDeleteSelectedClipAction);
  }
  byId("btn-timeline-snap").addEventListener("click", toggleTimelineSnap);
  byId("btn-timeline-add-marker").addEventListener("click", addMarkerAtPlayheadAction);
  byId("btn-inspector-add-marker").addEventListener("click", addMarkerAtPlayheadAction);
  byId("btn-timeline-undo").addEventListener("click", undoTimeline);
  byId("btn-timeline-redo").addEventListener("click", redoTimeline);

  byId("timeline-zoom").addEventListener("input", () => {
    state.timelineZoom = Number.parseFloat(byId("timeline-zoom").value);
    byId("timeline-zoom-label").textContent = `${state.timelineZoom.toFixed(1)}x`;
    redrawActiveCanvases();
  });

  byId("playhead-slider").addEventListener("input", () => {
    stopPlayback();
    setPlayhead(Number.parseInt(byId("playhead-slider").value, 10));
  });
  byId("btn-tc-start").addEventListener("click", () => {
    stopPlayback();
    setPlayhead(state.timelineDoc ? state.timelineDoc.start_frame || 0 : 0);
  });
  byId("btn-tc-prev").addEventListener("click", () => {
    stopPlayback();
    setPlayhead(state.playheadFrame - 1);
  });
  const shuttleRevBtn = byId("btn-tc-shuttle-rev");
  if (shuttleRevBtn) shuttleRevBtn.addEventListener("click", () => stepShuttle(-1));
  byId("btn-tc-play").addEventListener("click", togglePlayPause);
  const shuttleFwdBtn = byId("btn-tc-shuttle-fwd");
  if (shuttleFwdBtn) shuttleFwdBtn.addEventListener("click", () => stepShuttle(1));
  byId("btn-tc-next").addEventListener("click", () => {
    stopPlayback();
    setPlayhead(state.playheadFrame + 1);
  });
  byId("btn-tc-end").addEventListener("click", () => {
    stopPlayback();
    setPlayhead(state.timelineMaxFrame);
  });
  const markInBtn = byId("btn-tc-mark-in");
  if (markInBtn) markInBtn.addEventListener("click", setInPointAction);
  const markOutBtn = byId("btn-tc-mark-out");
  if (markOutBtn) markOutBtn.addEventListener("click", setOutPointAction);
  const clearIoBtn = byId("btn-tc-clear-io");
  if (clearIoBtn) clearIoBtn.addEventListener("click", clearInOutAction);
  const loopIoBtn = byId("btn-tc-loop-io");
  if (loopIoBtn) loopIoBtn.addEventListener("click", toggleIoLoopAction);

  bindTimelineCanvasScrub(byId("timeline-canvas"));
  wireClipAudioInspector();
  wireClipRetimeInspector();
  wireClipTransformInspector();
  wireClipTransitionInspector();
  wireTimelineMarkerAndBpmControls();

  // FX page events
  for (const btn of document.querySelectorAll("[data-fx-preset]")) {
    btn.addEventListener("click", () => {
      const pid = btn.getAttribute("data-fx-preset");
      if (pid) applyFxPreset(pid);
    });
  }
  for (const btn of document.querySelectorAll("[data-fx-add]")) {
    btn.addEventListener("click", () => {
      const eff = btn.getAttribute("data-fx-add");
      if (eff) addFxNode(eff);
    });
  }
  byId("btn-color-grab-still").addEventListener("click", () => grabMonitorStill("color"));
  byId("btn-fx-grab-still").addEventListener("click", () => grabMonitorStill("fx"));

  byId("btn-fx-bypass-all").addEventListener("click", () => {
    state.fxBypassAll = !state.fxBypassAll;
    syncChromaKeyControlsFromState();
    renderFxStack();
    redrawActiveCanvases();
    compileFxNow();
  });
  byId("btn-fx-reset-all").addEventListener("click", () => {
    state.fxStack = [];
    state.chromaKey.enabled = false;
    state.chromaKey.matteView = "final";
    state.fxBypassAll = false;
    state.fxActivePresetId = "";
    syncChromaKeyControlsFromState();
    renderFxStack();
    redrawActiveCanvases();
    compileFxNow();
  });
  for (const btn of document.querySelectorAll("[data-fx-matte]")) {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-fx-matte");
      state.chromaKey.matteView = mode === "alpha_matte" ? "alpha_matte" : "final";
      syncChromaKeyControlsFromState();
      redrawActiveCanvases();
    });
  }
  byId("btn-fx-keyer-toggle").addEventListener("click", () => {
    state.chromaKey.enabled = !state.chromaKey.enabled;
    state.fxBypassAll = false;
    syncChromaKeyControlsFromState();
    updateFxBadges();
    redrawActiveCanvases();
    compileFxNow();
  });
  for (const btn of document.querySelectorAll("[data-keyer-preset]")) {
    btn.addEventListener("click", () => {
      const pid = btn.getAttribute("data-keyer-preset");
      if (pid) applyChromaKeyPreset(pid);
    });
  }
  byId("fx-keyer-color-picker").addEventListener("input", () => {
    const val = byId("fx-keyer-color-picker").value;
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      state.chromaKey.key_color = val.toLowerCase();
      state.chromaKey.preset = "custom";
      state.chromaKey.enabled = true;
      state.fxBypassAll = false;
      syncChromaKeyControlsFromState();
      updateFxBadges();
      redrawActiveCanvases();
      scheduleFxCompile();
    }
  });
  const ckHexInput = byId("fx-keyer-hex-input");
  ckHexInput.addEventListener("input", () => {
    const raw = ckHexInput.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
      ckHexInput.removeAttribute("aria-invalid");
      state.chromaKey.key_color = raw.toLowerCase();
      state.chromaKey.preset = "custom";
      state.chromaKey.enabled = true;
      state.fxBypassAll = false;
      syncChromaKeyControlsFromState();
      updateFxBadges();
      redrawActiveCanvases();
      scheduleFxCompile();
    } else {
      ckHexInput.setAttribute("aria-invalid", "true");
    }
  });
  ckHexInput.addEventListener("change", () => {
    const raw = ckHexInput.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
      state.chromaKey.key_color = raw.toLowerCase();
      state.chromaKey.preset = "custom";
      ckHexInput.removeAttribute("aria-invalid");
    } else {
      ckHexInput.value = String(state.chromaKey.key_color).toUpperCase();
      ckHexInput.removeAttribute("aria-invalid");
    }
    syncChromaKeyControlsFromState();
    updateFxBadges();
    redrawActiveCanvases();
    compileFxNow();
  });
  byId("fx-keyer-despill").addEventListener("change", () => {
    state.chromaKey.despill = byId("fx-keyer-despill").checked;
    syncChromaKeyControlsFromState();
    redrawActiveCanvases();
    compileFxNow();
  });
  byId("fx-keyer-despill-type").addEventListener("change", () => {
    state.chromaKey.despill_type = byId("fx-keyer-despill-type").value === "blue" ? "blue" : "green";
    syncChromaKeyControlsFromState();
    redrawActiveCanvases();
    compileFxNow();
  });
  const bindKeyerNumericPair = (rangeId, numId, field, minVal, maxVal) => {
    const rEl = byId(rangeId);
    const nEl = byId(numId);
    rEl.addEventListener("input", () => {
      const val = Number.parseFloat(rEl.value);
      if (Number.isFinite(val)) {
        state.chromaKey[field] = val;
        nEl.value = String(val);
        redrawActiveCanvases();
        scheduleFxCompile();
      }
    });
    nEl.addEventListener("input", () => {
      const val = Number.parseFloat(nEl.value);
      if (Number.isFinite(val) && val >= minVal && val <= maxVal) {
        state.chromaKey[field] = val;
        rEl.value = String(val);
        redrawActiveCanvases();
        scheduleFxCompile();
      }
    });
    nEl.addEventListener("change", () => {
      const parsed = Number.parseFloat(nEl.value);
      const clamped = Number.isFinite(parsed)
        ? Math.min(maxVal, Math.max(minVal, parsed))
        : state.chromaKey[field];
      const rounded = Number(clamped.toFixed(2));
      state.chromaKey[field] = rounded;
      rEl.value = String(rounded);
      nEl.value = String(rounded);
      redrawActiveCanvases();
      compileFxNow();
    });
  };
  bindKeyerNumericPair("fx-keyer-similarity-range", "fx-keyer-similarity-num", "similarity", 0.01, 0.8);
  bindKeyerNumericPair("fx-keyer-blend-range", "fx-keyer-blend-num", "blend", 0.0, 0.5);
  byId("btn-fx-play").addEventListener("click", togglePlayPause);
  byId("btn-fx-step").addEventListener("click", () => {
    stopPlayback();
    setPlayhead(state.playheadFrame + 1);
  });
  byId("fx-playhead-slider").addEventListener("input", () => {
    stopPlayback();
    setPlayhead(Number.parseInt(byId("fx-playhead-slider").value, 10));
  });
  byId("fx-duration-input").addEventListener("change", () => {
    redrawFxKeyframeCanvases();
    compileFxNow();
  });
  byId("fx-resolution-select").addEventListener("change", compileFxNow);
  byId("fx-use-gpu").addEventListener("change", compileFxNow);
  byId("btn-fx-compile").addEventListener("click", compileFxNow);
  byId("btn-fx-copy-fg").addEventListener("click", async () => {
    const fg = state.fxLastCompile ? state.fxLastCompile.filtergraph : "";
    if (!fg) return;
    try {
      await navigator.clipboard.writeText(fg);
      showBanner("Copied FX FFmpeg filtergraph to clipboard.", "success");
    } catch {
      showBanner("Clipboard unavailable; copy directly from filtergraph box.", "error");
    }
  });
  byId("btn-fx-send-render").addEventListener("click", () => {
    const chk = byId("render-use-studio-fx");
    if (chk) chk.checked = true;
    switchTab("render");
    showBanner("Active FX Studio filtergraph linked to Deliver page.", "success");
  });

  // Titles & Lower-Thirds page events
  for (const btn of document.querySelectorAll("[data-title-preset]")) {
    btn.addEventListener("click", () => {
      const pid = btn.getAttribute("data-title-preset");
      if (pid) applyTitlePreset(pid);
    });
  }
  byId("btn-title-toggle").addEventListener("click", () => {
    state.titleOverlay.enabled = !state.titleOverlay.enabled;
    updateTitleTimingBadges();
    redrawActiveCanvases();
    compileTitleNow();
  });
  byId("title-text-input").addEventListener("input", () => {
    state.titleOverlay.title = byId("title-text-input").value;
    updateTitleTimingBadges();
    redrawActiveCanvases();
    scheduleTitleCompile();
  });
  byId("title-subtitle-input").addEventListener("input", () => {
    state.titleOverlay.subtitle = byId("title-subtitle-input").value;
    updateTitleTimingBadges();
    redrawActiveCanvases();
    scheduleTitleCompile();
  });
  byId("title-position-select").addEventListener("change", () => {
    state.titleOverlay.position = byId("title-position-select").value;
    updateTitleTimingBadges();
    redrawActiveCanvases();
    compileTitleNow();
  });
  byId("title-accent-color").addEventListener("input", () => {
    const hex = byId("title-accent-color").value;
    state.titleOverlay.accent_color = hex;
    const hexEl = byId("title-accent-hex");
    if (hexEl) hexEl.textContent = hex;
    updateTitleTimingBadges();
    redrawActiveCanvases();
    scheduleTitleCompile();
  });
  byId("title-start-input").addEventListener("input", () => {
    const val = Number.parseFloat(byId("title-start-input").value);
    if (Number.isFinite(val) && val >= 0 && val < state.titleOverlay.end_s) {
      state.titleOverlay.start_s = val;
      updateTitleTimingBadges();
      redrawActiveCanvases();
      scheduleTitleCompile();
    }
  });
  byId("title-start-input").addEventListener("blur", () => {
    const raw = Number.parseFloat(byId("title-start-input").value);
    if (!Number.isFinite(raw) || raw < 0 || raw >= state.titleOverlay.end_s) {
      byId("title-start-input").value = String(state.titleOverlay.start_s);
    }
  });
  byId("title-end-input").addEventListener("input", () => {
    const val = Number.parseFloat(byId("title-end-input").value);
    if (Number.isFinite(val) && val > state.titleOverlay.start_s && val <= 86400) {
      state.titleOverlay.end_s = val;
      updateTitleTimingBadges();
      redrawActiveCanvases();
      scheduleTitleCompile();
    }
  });
  byId("title-end-input").addEventListener("blur", () => {
    const raw = Number.parseFloat(byId("title-end-input").value);
    if (!Number.isFinite(raw) || raw <= state.titleOverlay.start_s || raw > 86400) {
      byId("title-end-input").value = String(state.titleOverlay.end_s);
    }
  });
  byId("btn-title-set-start").addEventListener("click", () => {
    const tSec = Number((state.playheadFrame / getTimelineFps()).toFixed(2));
    state.titleOverlay.start_s = tSec;
    if (state.titleOverlay.end_s <= tSec) {
      state.titleOverlay.end_s = Number((tSec + 2.0).toFixed(2));
    }
    syncTitleInputsFromState();
    redrawActiveCanvases();
    compileTitleNow();
  });
  byId("btn-title-set-end").addEventListener("click", () => {
    const tSec = Number((state.playheadFrame / getTimelineFps()).toFixed(2));
    if (tSec <= state.titleOverlay.start_s) {
      showBanner("End time must be after Start time.", "error");
      return;
    }
    state.titleOverlay.end_s = tSec;
    syncTitleInputsFromState();
    redrawActiveCanvases();
    compileTitleNow();
  });
  byId("title-font-size-range").addEventListener("input", () => {
    const val = Number.parseInt(byId("title-font-size-range").value, 10);
    state.titleOverlay.font_size = val;
    byId("title-font-size-num").value = String(val);
    redrawActiveCanvases();
    scheduleTitleCompile();
  });
  byId("title-font-size-num").addEventListener("input", () => {
    const val = Number.parseInt(byId("title-font-size-num").value, 10);
    if (Number.isFinite(val) && val >= 14 && val <= 96) {
      state.titleOverlay.font_size = val;
      byId("title-font-size-range").value = String(val);
      redrawActiveCanvases();
      scheduleTitleCompile();
    }
  });
  byId("title-font-size-num").addEventListener("blur", () => {
    const raw = Number.parseInt(byId("title-font-size-num").value, 10);
    if (!Number.isFinite(raw) || raw < 14 || raw > 96) {
      byId("title-font-size-num").value = String(state.titleOverlay.font_size);
    }
  });
  byId("title-opacity-range").addEventListener("input", () => {
    const val = Number.parseFloat(byId("title-opacity-range").value);
    state.titleOverlay.box_opacity = val;
    byId("title-opacity-num").value = val.toFixed(2);
    redrawActiveCanvases();
    scheduleTitleCompile();
  });
  byId("title-opacity-num").addEventListener("input", () => {
    const val = Number.parseFloat(byId("title-opacity-num").value);
    if (Number.isFinite(val) && val >= 0 && val <= 1) {
      state.titleOverlay.box_opacity = val;
      byId("title-opacity-range").value = String(val);
      redrawActiveCanvases();
      scheduleTitleCompile();
    }
  });
  byId("title-opacity-num").addEventListener("blur", () => {
    const raw = Number.parseFloat(byId("title-opacity-num").value);
    if (!Number.isFinite(raw) || raw < 0 || raw > 1) {
      byId("title-opacity-num").value = state.titleOverlay.box_opacity.toFixed(2);
    }
  });
  byId("btn-titles-play").addEventListener("click", togglePlayPause);
  byId("btn-titles-step").addEventListener("click", () => {
    stopPlayback();
    setPlayhead(state.playheadFrame + 1);
  });
  byId("titles-playhead-slider").addEventListener("input", () => {
    stopPlayback();
    setPlayhead(Number.parseInt(byId("titles-playhead-slider").value, 10));
  });
  byId("btn-title-compile").addEventListener("click", compileTitleNow);
  byId("btn-title-copy-fg").addEventListener("click", async () => {
    const fg = state.titleLastCompile ? state.titleLastCompile.filtergraph : "";
    if (!fg) return;
    try {
      await navigator.clipboard.writeText(fg);
      showBanner("Copied Title FFmpeg filtergraph to clipboard.", "success");
    } catch {
      showBanner("Clipboard unavailable; copy directly from filtergraph box.", "error");
    }
  });
  byId("btn-title-send-render").addEventListener("click", () => {
    const chk = byId("render-use-studio-title");
    if (chk) chk.checked = true;
    switchTab("render");
    showBanner("Active Title / Lower-Third overlay linked to Deliver page.", "success");
  });

  // Captions & Subtitles Track events
  for (const btn of document.querySelectorAll("[data-subtitle-style]")) {
    btn.addEventListener("click", () => {
      const sid = btn.getAttribute("data-subtitle-style");
      if (!sid) return;
      state.subtitleTrack.style = sid;
      updateSubtitleStyleButtons();
      redrawActiveCanvases();
      compileSubtitlesNow();
    });
  }
  byId("btn-subtitle-toggle").addEventListener("click", () => {
    state.subtitleTrack.enabled = !state.subtitleTrack.enabled;
    updateSubtitleTimingBadges();
    redrawActiveCanvases();
    compileSubtitlesNow();
  });
  byId("subtitle-font-size-range").addEventListener("input", () => {
    const val = Number.parseInt(byId("subtitle-font-size-range").value, 10);
    state.subtitleTrack.font_size = val;
    byId("subtitle-font-size-num").value = String(val);
    redrawActiveCanvases();
    scheduleSubtitleCompile();
  });
  byId("subtitle-font-size-num").addEventListener("input", () => {
    const val = Number.parseInt(byId("subtitle-font-size-num").value, 10);
    if (Number.isFinite(val) && val >= 14 && val <= 72) {
      state.subtitleTrack.font_size = val;
      byId("subtitle-font-size-range").value = String(val);
      redrawActiveCanvases();
      scheduleSubtitleCompile();
    }
  });
  byId("subtitle-font-size-num").addEventListener("blur", () => {
    const raw = Number.parseInt(byId("subtitle-font-size-num").value, 10);
    if (!Number.isFinite(raw) || raw < 14 || raw > 72) {
      byId("subtitle-font-size-num").value = String(state.subtitleTrack.font_size);
    }
  });
  byId("btn-subtitle-parse").addEventListener("click", () => {
    const raw = byId("subtitle-raw-input").value;
    parseSubtitleRawInput(raw, "auto");
  });
  byId("subtitle-file-input").addEventListener("change", async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      byId("subtitle-raw-input").value = text;
      const fmt = file.name.toLowerCase().endsWith(".vtt") ? "vtt" : "srt";
      await parseSubtitleRawInput(text, fmt);
    } catch (err) {
      showBanner(err.message, "error");
    } finally {
      ev.target.value = "";
    }
  });
  byId("btn-subtitle-sample").addEventListener("click", () => {
    byId("subtitle-raw-input").value = SAMPLE_SRT_TEXT;
    parseSubtitleRawInput(SAMPLE_SRT_TEXT, "srt");
  });
  byId("btn-subtitle-export-srt").addEventListener("click", () => exportSubtitlesAndDownload("srt"));
  byId("btn-subtitle-export-vtt").addEventListener("click", () => exportSubtitlesAndDownload("vtt"));
  byId("btn-subtitle-clear").addEventListener("click", () => {
    state.subtitleTrack.cues = [];
    byId("subtitle-raw-input").value = "";
    renderSubtitleCueList();
    redrawActiveCanvases();
    compileSubtitlesNow();
  });
  byId("btn-subtitle-add-cue").addEventListener("click", () => {
    const tSec = Number((state.playheadFrame / getTimelineFps()).toFixed(2));
    const endSec = Number((tSec + 2.5).toFixed(2));
    state.subtitleTrack.cues.push({
      index: state.subtitleTrack.cues.length + 1,
      start_s: tSec,
      end_s: endSec,
      text: "New caption line"
    });
    state.subtitleTrack.enabled = true;
    renderSubtitleCueList();
    redrawActiveCanvases();
    compileSubtitlesNow();
  });
  byId("btn-subtitle-compile").addEventListener("click", compileSubtitlesNow);
  byId("btn-subtitle-copy-fg").addEventListener("click", async () => {
    const fg = state.subtitleLastCompile ? state.subtitleLastCompile.filtergraph : "";
    if (!fg) return;
    try {
      await navigator.clipboard.writeText(fg);
      showBanner("Copied Subtitles FFmpeg filtergraph to clipboard.", "success");
    } catch {
      showBanner("Clipboard unavailable; copy directly from filtergraph box.", "error");
    }
  });
  byId("btn-subtitle-send-render").addEventListener("click", () => {
    const chk = byId("render-use-studio-subtitles");
    if (chk) chk.checked = true;
    switchTab("render");
    showBanner("Active Captions / SRT track linked to Deliver page.", "success");
  });

  // Color page events
  wireColorInputs();
  byId("btn-color-copy-fg").addEventListener("click", async () => {
    const fg = state.colorLastCompile ? state.colorLastCompile.filtergraph : "";
    if (!fg) return;
    try {
      await navigator.clipboard.writeText(fg);
      showBanner("Copied Color FFmpeg filtergraph to clipboard.", "success");
    } catch {
      showBanner("Clipboard unavailable; copy directly from filtergraph box.", "error");
    }
  });
  byId("btn-bake-cube").addEventListener("click", bakeCubeLut);
  byId("btn-download-cube").addEventListener("click", downloadCubeLut);

  byId("cdl-file-input").addEventListener("change", async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    try {
      const xmlContent = await file.text();
      const data = await api.parseCdlXml(xmlContent);
      const c = data.cdl;
      state.colorGrade = {
        lift: c.offset.map((v) => clampColorNum(v, -1, 1)),
        gamma: c.power.map((v) => clampColorNum(1.0 - v, -1, 1)),
        gain: c.slope.map((v) => clampColorNum(v - 1.0, -1, 1)),
        contrast: 1.0,
        saturation: clampColorNum(c.saturation, 0, 3),
        temperature: 0.0
      };
      state.colorActivePresetId = "";
      syncColorInputsFromState();
      compileColorNow();
      showBanner(`Imported ASC CDL from ${file.name}`, "success");
    } catch (err) {
      showBanner(err.message, "error");
    }
  });

  byId("btn-send-lut-render").addEventListener("click", () => {
    if (state.lastBakedCubePath) {
      byId("render-lut-path").value = state.lastBakedCubePath;
      byId("render-use-studio-cdl").checked = false;
    } else {
      byId("render-lut-path").value = "";
      byId("render-use-studio-cdl").checked = true;
    }
    switchTab("render");
    showBanner("Active Color Page grade linked to Deliver page.", "success");
  });

  // Timeline Program Monitor Aspect Ratio & Broadcast Safe Guides
  const progAspect = byId("program-aspect-select");
  if (progAspect) {
    progAspect.addEventListener("change", () => {
      state.framing.preset = progAspect.value;
      const useFraming = byId("render-use-framing");
      if (useFraming && (state.framing.preset !== "16:9" || state.framing.mode !== "fill")) {
        useFraming.checked = true;
      }
      syncFramingControlsUI();
      redrawActiveCanvases();
    });
  }
  const progMode = byId("program-framing-mode");
  if (progMode) {
    progMode.addEventListener("change", () => {
      state.framing.mode = progMode.value === "fit" ? "fit" : "fill";
      const useFraming = byId("render-use-framing");
      if (useFraming && (state.framing.preset !== "16:9" || state.framing.mode !== "fill")) {
        useFraming.checked = true;
      }
      syncFramingControlsUI();
      redrawActiveCanvases();
    });
  }
  const safeBtn = byId("btn-safe-guides");
  if (safeBtn) {
    safeBtn.addEventListener("click", () => {
      state.framing.safeGuides = !state.framing.safeGuides;
      if (
        state.framing.safeGuides &&
        !state.framing.guides.actionSafe &&
        !state.framing.guides.titleSafe &&
        !state.framing.guides.socialHud
      ) {
        state.framing.guides.actionSafe = true;
        state.framing.guides.titleSafe = true;
        state.framing.guides.socialHud = true;
      }
      syncFramingControlsUI();
      redrawActiveCanvases();
    });
  }
  for (const chip of document.querySelectorAll("[data-safe-guide]")) {
    chip.addEventListener("click", () => {
      const key = chip.getAttribute("data-safe-guide");
      if (!key) return;
      if (!state.framing.safeGuides) {
        state.framing.safeGuides = true;
        state.framing.guides[key] = true;
      } else {
        state.framing.guides[key] = !state.framing.guides[key];
        if (
          !state.framing.guides.actionSafe &&
          !state.framing.guides.titleSafe &&
          !state.framing.guides.socialHud
        ) {
          state.framing.safeGuides = false;
        }
      }
      syncFramingControlsUI();
      redrawActiveCanvases();
    });
  }

  // Deliver page events
  const engLocalBtn = byId("btn-engine-local");
  const engRemoteBtn = byId("btn-engine-remote");
  const remoteProbeBtn = byId("btn-remote-probe");
  if (engLocalBtn) engLocalBtn.addEventListener("click", () => setRenderEngine("local"));
  if (engRemoteBtn) engRemoteBtn.addEventListener("click", () => setRenderEngine("remote"));
  if (remoteProbeBtn) remoteProbeBtn.addEventListener("click", probeRemoteRenderNode);

  byId("render-input-select").addEventListener("change", () => {
    const val = byId("render-input-select").value;
    if (val) byId("render-input-path").value = val;
  });
  byId("render-profile").addEventListener("change", () => {
    const prof = byId("render-profile").value;
    const cur = byId("render-output-path").value.trim() || "renders/delivery.mp4";
    const stem = cur.replace(/\.(mp4|mov)$/i, "");
    byId("render-output-path").value = prof === "prores_hq" ? `${stem}.mov` : `${stem}.mp4`;
    state.renderConfig.encoderPreset = "medium";
    syncDeliverProfileControlsState();
    markDeliverPresetCustom();
  });
  const renderContainerEl = byId("render-container");
  if (renderContainerEl) {
    renderContainerEl.addEventListener("change", () => {
      const ext = renderContainerEl.value === "mov" ? "mov" : "mp4";
      const cur = byId("render-output-path").value.trim() || `renders/delivery.${ext}`;
      const stem = cur.replace(/\.(mp4|mov)$/i, "");
      byId("render-output-path").value = `${stem}.${ext}`;
      markDeliverPresetCustom();
    });
  }
  const renderCrfEl = byId("render-crf");
  if (renderCrfEl) {
    renderCrfEl.addEventListener("input", markDeliverPresetCustom);
  }
  const renderAudioBitrateEl = byId("render-audio-bitrate");
  if (renderAudioBitrateEl) {
    renderAudioBitrateEl.addEventListener("change", markDeliverPresetCustom);
  }
  const renderLufsEl = byId("render-lufs");
  if (renderLufsEl) {
    renderLufsEl.addEventListener("input", () => {
      const raw = renderLufsEl.value.trim();
      const parsed = raw !== "" ? Number.parseFloat(raw) : null;
      let matched = "off";
      if (parsed !== null && Number.isFinite(parsed)) {
        const hit = Object.entries(LOUDNESS_PRESET_LUFS).find(
          ([, v]) => Math.abs(v - parsed) < 0.05
        );
        if (hit) matched = hit[0];
      }
      setFairlightState({ loudness_preset: matched }, { syncLufs: false, markCustom: true });
    });
  }
  const renderUseClipAudioEl = byId("render-use-clip-audio");
  if (renderUseClipAudioEl) {
    renderUseClipAudioEl.addEventListener("change", renderFairlightAudioUI);
  }
  const renderResEl = byId("render-resolution");
  if (renderResEl) {
    renderResEl.addEventListener("change", () => {
      const [rw, rh] = renderResEl.value.split("x").map((n) => Number.parseInt(n, 10));
      if (Number.isInteger(rw) && Number.isInteger(rh)) {
        state.renderConfig.targetWidth = rw;
        state.renderConfig.targetHeight = rh;
        if (rw === 1080 && rh === 1920) state.framing.preset = "9:16";
        else if (rw === 1080 && rh === 1080) state.framing.preset = "1:1";
        else if (rw === 1080 && rh === 1350) state.framing.preset = "4:5";
        else state.framing.preset = "16:9";
        const useFraming = byId("render-use-framing");
        if (useFraming) useFraming.checked = true;
        syncFramingControlsUI();
        redrawActiveCanvases();
        markDeliverPresetCustom();
      }
    });
  }
  const renderAspect = byId("render-aspect-preset");
  if (renderAspect) {
    renderAspect.addEventListener("change", () => {
      state.framing.preset = renderAspect.value;
      const spec = getAspectRatioPreset(renderAspect.value);
      state.renderConfig.targetWidth = spec.width;
      state.renderConfig.targetHeight = spec.height;
      if (renderResEl) renderResEl.value = `${spec.width}x${spec.height}`;
      const useFraming = byId("render-use-framing");
      if (useFraming) useFraming.checked = true;
      syncFramingControlsUI();
      redrawActiveCanvases();
      markDeliverPresetCustom();
    });
  }
  const renderMode = byId("render-framing-mode");
  if (renderMode) {
    renderMode.addEventListener("change", () => {
      state.framing.mode = renderMode.value === "fit" ? "fit" : "fill";
      const useFraming = byId("render-use-framing");
      if (useFraming) useFraming.checked = true;
      syncFramingControlsUI();
      redrawActiveCanvases();
      markDeliverPresetCustom();
    });
  }
  byId("btn-verify-nvenc").addEventListener("click", async () => {
    try {
      const data = await api.verifyRenderCapabilities();
      renderCapabilitiesStrip(data.capabilities, data.error, api.isStaticDemo());
      showBanner("Hardware encoder runtime verification complete.", "success");
    } catch (err) {
      showBanner(err.message, "error");
    }
  });
  byId("btn-generate-sample-clip").addEventListener("click", generateSampleClip);
  const wmTextInput = byId("render-watermark-text");
  if (wmTextInput) {
    wmTextInput.addEventListener("input", syncReviewWatermarkControlsUI);
  }
  const wmOpacitySlider = byId("render-watermark-opacity");
  if (wmOpacitySlider) {
    wmOpacitySlider.addEventListener("input", syncReviewWatermarkControlsUI);
    wmOpacitySlider.addEventListener("change", syncReviewWatermarkControlsUI);
  }
  for (const btn of document.querySelectorAll(".watermark-preset-btn[data-watermark-preset]")) {
    btn.addEventListener("click", () => {
      const presetVal = btn.getAttribute("data-watermark-preset") || "";
      if (wmTextInput) {
        wmTextInput.value = presetVal;
      }
      syncReviewWatermarkControlsUI();
    });
  }
  syncReviewWatermarkControlsUI();
  byId("btn-build-render-plan").addEventListener("click", () => buildOrExecuteRender(false));
  byId("btn-execute-render").addEventListener("click", () => buildOrExecuteRender(true));
  byId("btn-copy-ffmpeg-cmd").addEventListener("click", async () => {
    if (!state.lastRenderCommand) return;
    try {
      await navigator.clipboard.writeText(state.lastRenderCommand);
      showBanner("Copied FFmpeg command to clipboard.", "success");
    } catch {
      showBanner("Clipboard unavailable; copy directly from command box.", "error");
    }
  });
  byId("btn-send-render-qa").addEventListener("click", () => {
    if (state.lastRenderOutputPath) {
      byId("qa-media-path").value = state.lastRenderOutputPath;
    }
    switchTab("qa");
    runBroadcastQa();
  });
  const exportYtBtn = byId("btn-export-yt-chapters");
  if (exportYtBtn) exportYtBtn.addEventListener("click", exportYoutubeChapters);
  const exportFfmetaBtn = byId("btn-export-ffmetadata");
  if (exportFfmetaBtn) exportFfmetaBtn.addEventListener("click", exportFfmetadataChapters);

  // QA page events
  byId("qa-media-select").addEventListener("change", () => {
    const val = byId("qa-media-select").value;
    if (val) byId("qa-media-path").value = val;
  });
  byId("btn-run-qa").addEventListener("click", runBroadcastQa);
  byId("btn-qa-gen-sample").addEventListener("click", generateSampleClip);

  document.addEventListener("keydown", handleTransportKeydown);
  window.addEventListener("resize", redrawActiveCanvases);
}

async function loadFxCatalog() {
  try {
    const data = await api.getFxPresets();
    if (data && Array.isArray(data.presets) && data.presets.length > 0) {
      state.fxPresets = data.presets;
    }
    if (data && data.specs && Object.keys(data.specs).length > 0) {
      state.fxSpecs = data.specs;
    }
    if (data && Array.isArray(data.chroma_key_presets) && data.chroma_key_presets.length > 0) {
      state.chromaKeyPresetsCatalog = data.chroma_key_presets;
    }
  } catch {
    // Fallback to built-in catalog constants
  }
}

async function loadColorCatalog() {
  try {
    const data = await api.getColorPresets();
    if (data && Array.isArray(data.presets) && data.presets.length > 0) {
      state.colorPresetsCatalog = data.presets;
    }
  } catch {
    // Fallback to built-in COLOR_GRADE_PRESETS constants
  }
}

async function loadTitlesCatalog() {
  try {
    const data = await api.getTitlePresets();
    if (data && Array.isArray(data.presets) && data.presets.length > 0) {
      state.titlePresetsCatalog = data.presets;
    }
  } catch {
    // Fallback to built-in TITLE_PRESETS_FALLBACK constants
  }
}

async function loadTransitionsCatalog() {
  try {
    const data = await api.getTransitionPresets();
    if (data && Array.isArray(data.presets) && data.presets.length > 0) {
      state.transitionPresetsCatalog = data.presets;
    }
  } catch {
    // Fallback to built-in TRANSITION_PRESETS constants
  }
}

async function loadRenderPresetsCatalog() {
  try {
    const data = await api.getRenderPresets();
    if (data && Array.isArray(data.presets) && data.presets.length > 0) {
      state.deliveryPresetsCatalog = data.presets;
      renderDeliveryPresetStrip();
    }
  } catch {
    // Fallback to built-in DELIVERY_PRESETS constants
  }
}

async function bootstrap() {
  wireEvents();
  syncFramingControlsUI();
  syncDeliverProfileControlsState();
  renderFairlightAudioUI();
  renderDeliveryPresetStrip();
  syncColorInputsFromState();
  syncSplitWipeControls("color");
  syncSplitWipeControls("fx");
  renderStillsGallery();
  compileColorNow();
  syncTitleInputsFromState();
  compileTitleNow();
  syncSubtitleControlsFromState();
  compileSubtitlesNow();
  syncChromaKeyControlsFromState();
  renderFxStack();
  renderFxCompileResult(null);

  const urlLang = new URLSearchParams(window.location.search).get("lang");
  let savedLang = null;
  try {
    savedLang = window.localStorage.getItem("taktcut.lang");
  } catch {
    // Ignore storage access failures
  }
  if (urlLang === "fr" || urlLang === "en") state.lang = urlLang;
  else if (savedLang === "fr" || savedLang === "en") state.lang = savedLang;
  setLanguage(state.lang);

  try {
    const health = await api.initHealth();
    byId("version-badge").textContent = `v${health.version}`;
    byId("workspace-path-label").textContent = health.workspace_dir;
    byId("workspace-pill").title = health.workspace_dir;
    byId("runtime-mode-pill").textContent = api.isStaticDemo()
      ? "STATIC WEB DEMO (CLIENT-SIDE ENGINE)"
      : "LOCAL STUDIO SERVER (127.0.0.1)";
    renderCapabilitiesStrip(health.capabilities, health.ffmpeg_error, api.isStaticDemo());
  } catch (err) {
    showBanner(`Health check failed: ${err.message}`, "error");
  }

  await Promise.allSettled([
    refreshWorkspaceFiles(),
    loadSampleTimeline("clean"),
    checkForStudioUpdate(),
    loadFxCatalog(),
    loadColorCatalog(),
    loadTitlesCatalog(),
    loadTransitionsCatalog(),
    loadRenderPresetsCatalog()
  ]);
}

bootstrap();
