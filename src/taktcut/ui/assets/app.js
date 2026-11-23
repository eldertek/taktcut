import {
  captureCleanColorStill,
  captureCleanFxStill,
  computeCueWordTimingsCanvas,
  drawColorCurvesCanvas,
  drawColorPreviewCanvas,
  drawColorScopeCanvas,
  drawFramesCanvas,
  drawHslCurvesCanvas,
  drawKeyframeCurveCanvas,
  drawLoudnessCanvas,
  drawProgramMonitorCanvas,
  drawQualifierSpectrumCanvas,
  drawRetimeRampEditorCanvas,
  drawStereoVuMeterCanvas,
  drawTimelineCanvas,
  drawTimelineOverviewCanvas,
  drawTransformGraphCanvas,
  findActiveSubtitleCue,
  framesToSmpte,
  renderFairlightDynamicsCanvas,
  renderFairlightEqCurveCanvas,
  sampleColorViewerInputRgb,
  trackPointSequenceCanvas
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
  COLOR_CURVE_PRESETS,
  CURVE_CHANNELS,
  DELIVERY_PRESETS,
  DYNAMIC_ZOOM_DEFAULT,
  FAIRLIGHT_EQ_BAND_ORDER,
  FAIRLIGHT_EQ_BAND_SPECS,
  HSL_CURVE_MODES,
  HSL_CURVE_PRESETS,
  HSL_HUE_ANCHOR_DEGREES,
  HSL_HUE_BOUNDS,
  HSL_HUE_VECTORS,
  LOUDNESS_PRESET_LUFS,
  MARKER_COLOR_HEX,
  MAX_COLOR_NODES,
  MAX_CURVE_POINTS,
  PLANAR_TRACKER_PRESETS_CLIENT,
  QUALIFIER_PRESETS,
  RETIME_SPEED_MAX,
  RETIME_SPEED_MIN,
  SNAP_THRESHOLD_PX,
  SPLIT_WIPE_HIT_RADIUS_PX,
  SPLIT_WIPE_POS_DEFAULT,
  STABILIZER_PRESETS_CLIENT,
  STILLS_GALLERY_MAX,
  TRACK_PAN_MAX,
  TRACK_PAN_MIN,
  TRACK_VOLUME_DB_MAX,
  TRACK_VOLUME_DB_MIN,
  TRANSFORM_BEZIER_PRESETS,
  TRANSFORM_BORDER_COLOR_DEFAULT,
  TRANSFORM_BORDER_FEATHER_DEFAULT,
  TRANSFORM_BORDER_FEATHER_MAX,
  TRANSFORM_BORDER_FEATHER_MIN,
  TRANSFORM_BORDER_WIDTH_DEFAULT,
  TRANSFORM_BORDER_WIDTH_MAX,
  TRANSFORM_BORDER_WIDTH_MIN,
  TRANSFORM_CROP_DEFAULT,
  TRANSFORM_CROP_MAX,
  TRANSFORM_CROP_MIN,
  TRANSFORM_CROP_SUM_MAX,
  TRANSFORM_KEYFRAME_PARAMS,
  TRANSFORM_OPACITY_DEFAULT,
  TRANSFORM_OPACITY_MAX,
  TRANSFORM_OPACITY_MIN,
  TRANSFORM_PARAM_BOUNDS,
  TRANSFORM_POS_DEFAULT,
  TRANSFORM_POS_MAX,
  TRANSFORM_POS_MIN,
  TRANSFORM_ROT_DEFAULT,
  TRANSFORM_ROT_MAX,
  TRANSFORM_ROT_MIN,
  TRANSFORM_SHADOW_BLUR_DEFAULT,
  TRANSFORM_SHADOW_BLUR_MAX,
  TRANSFORM_SHADOW_BLUR_MIN,
  TRANSFORM_SHADOW_COLOR_DEFAULT,
  TRANSFORM_SHADOW_OFFSET_MAX,
  TRANSFORM_SHADOW_OFFSET_MIN,
  TRANSFORM_SHADOW_OFFSET_X_DEFAULT,
  TRANSFORM_SHADOW_OFFSET_Y_DEFAULT,
  TRANSFORM_SHADOW_OPACITY_DEFAULT,
  TRANSFORM_SHADOW_OPACITY_MAX,
  TRANSFORM_SHADOW_OPACITY_MIN,
  TRANSFORM_ZOOM_DEFAULT,
  TRANSFORM_ZOOM_MAX,
  TRANSFORM_ZOOM_MIN,
  TRANSITION_DURATION_DEFAULT_S,
  TRANSITION_DURATION_MAX_S,
  TRANSITION_DURATION_MIN_S,
  addColorNodeToTree,
  addMarkerInDocument,
  addOutsideColorNodeInTree,
  appendClipToTrackInDocument,
  appendStillBounded,
  applyFairlightRackPresetClient,
  buildSourceTapeSegments,
  classifyMediaPoolEntry,
  clearTransformParamKeyframesInDocument,
  cloneTimelineDoc,
  collectSnapTargets,
  clampSplitWipePercent,
  compileAudioFilterClient,
  compileAutoDuckFilterClient,
  compileFairlightAudioFilterClient,
  compileFairlightAudioRackClient,
  compileFairlightMixerClient,
  compileRetimeFilterClient,
  compileTransitionFilterClient,
  compileVideoFadeFilterClient,
  computeInOutRangeMetrics,
  computeRetimeRampSummary,
  computeSplitWipePercentFromPointer,
  computeTimelineMaxFrame,
  computeTimelineZoomViewport,
  countSyncLockedTracks,
  createDefaultColorCurves,
  createDefaultColorNodeTree,
  createDefaultHslCurves,
  createDefaultPowerWindow,
  createDefaultQualifier,
  createEmptyTransformKeyframes,
  createStillRecord,
  deleteMarkerInDocument,
  deserializeColorNodeFromApi,
  estimateFairlightCompressorGrClient,
  estimateRenderFileSize,
  evaluateClipTransformAtTime,
  evaluateCornerPinsClient,
  evaluateCurvePchipClient,
  evaluatePowerWindowMask,
  evaluateRetimeSpeedAt,
  evaluateTrackPointClient,
  evaluateTransformParamAtTime,
  evaluateTimelineAudioLevels,
  filterMediaPoolEntries,
  filterTimelineClips,
  findAdjacentCutForClip,
  findAdjacentRollTarget,
  findClipIndex,
  findMagneticSnap,
  findTrackAndClip,
  formatCmx3600Edl,
  formatFcpxmlTimeline,
  formatFfmetadataFromMarkers,
  formatRetimeBadgeText,
  formatRetimeSpeedValue,
  formatShuttleSpeedLabel,
  formatTrackPanLabel,
  formatTransformBadgeText,
  formatYoutubeChaptersFromMarkers,
  getAspectRatioPreset,
  getClipTrimBounds,
  getSelectedColorNode,
  getTransformKeyframeCount,
  getTransformPresetClient,
  getTransitionPresetName,
  hasClipDveBorderOrFeather,
  hasClipDveCrop,
  hasClipDveDropShadow,
  hasSplittableClipAtFrame,
  hasTransformKeyframes,
  insertClipAtFrameInDocument,
  isClipTransformIdentity,
  isColorCurvesIdentity,
  isColorNodeIdentity,
  isCurveChannelIdentity,
  isHslCurveChannelIdentity,
  isHslCurvesIdentity,
  isPointerOnSplitWipeDivider,
  isPowerWindowActive,
  isQualifierActive,
  isTrackAudiblyMuted,
  moveClipInDocument,
  moveColorNodeInTree,
  normalizeAutoDuckParams,
  normalizeClipAudio,
  normalizeClipLabelColor,
  normalizeClipRetime,
  normalizeClipTransform,
  normalizeClipTransition,
  normalizeColorCurves,
  normalizeColorGrade,
  normalizeColorNodeTree,
  normalizeCurvePoints,
  normalizeFairlightAudioParams,
  normalizeFairlightAudioRackParams,
  normalizeHslCurves,
  normalizeInOutRange,
  normalizePlanarTrackerClient,
  normalizeStabilizerClient,
  normalizeMarkerColor,
  normalizeMasterBusState,
  normalizePowerWindow,
  normalizeQualifier,
  normalizeTransformHexColor,
  normalizeTimelineTool,
  normalizeRetimeProcess,
  normalizeRetimeRampPoints,
  normalizeRetimeRampPreset,
  normalizeTrackMixerState,
  parseCubeLutTextClient,
  pickQualifierFromRgb,
  removeColorNodeFromTree,
  removeStillById,
  removeTransformKeyframeInDocument,
  resetAllTracksMixerInDocument,
  resolveRetimeRampPointsForPreset,
  resolveSourceTapeFrame,
  resolveTransformKeyframeBezier,
  rgbToHslClient,
  rippleDeleteClipInDocument,
  rippleTrimClipInDocument,
  rollEditCutInDocument,
  sanitizeStillDataUrl,
  selectColorNodeInTree,
  serializeColorNodeForApi,
  setAllTracksSyncLockInDocument,
  setClipLabelColor,
  setInOutRange,
  slideClipInDocument,
  slipClipInDocument,
  smartInsertClipInDocument,
  splitClipInDocument,
  splitClipsAtPlayhead,
  stepPlayheadInRange,
  stepShuttleSpeed,
  timelineDocToChapterInputs,
  toggleColorNodeBypassInTree,
  toggleTrackArmInDocument,
  toggleTrackMuteInDocument,
  toggleTrackSoloInDocument,
  toggleTrackSyncLockInDocument,
  trimClipInDocument,
  updateClipAudioInDocument,
  updateClipRetimeInDocument,
  updateClipTransformInDocument,
  updateClipTransitionInDocument,
  updateColorNodeInTree,
  updateMarkerInDocument,
  updateTrackMixerInDocument,
  updateTransformKeyframeBezierInDocument,
  upsertTransformKeyframeInDocument,
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
  timelineIndexQuery: "",
  timelineIndexColor: "all",
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
  timelineActiveEditHud: null,
  timelineNudgeEdge: "right",
  timelineLastEditReadout: "",
  timelineDragFixedMaxFrame: null,
  timelineUndoStack: [],
  timelineRedoStack: [],
  tfGraphParam: "zoom_pct",
  tfGraphMode: "value",
  tfGraphSelectedKfIdx: 0,
  tfGraphDrawMeta: null,
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
  fairlightRack: normalizeFairlightAudioRackParams(),
  fairlightRackTab: "eq",
  fairlightRackBandId: "low_mid",
  masterBus: {
    volume_db: 0.0,
    muted: false,
    dim_enabled: false,
    voice_isolation: false
  },
  mixerSelectedTrackCode: "A1",
  mixerDragDocBefore: null,
  vuMeter: {
    leftDb: -60,
    rightDb: -60,
    holdL: -60,
    holdR: -60,
    holdAgeL: 0,
    holdAgeR: 0,
    truePeakDbtp: -60,
    momentaryLufs: -70,
    integratedLufs: -70,
    lufsAccumSum: 0,
    lufsAccumCount: 0,
    trackLevels: {},
    duckReductionDb: 0,
    allMuted: false,
    decayRafId: null,
    lastTs: 0
  },
  colorNodeTree: createDefaultColorNodeTree(),
  colorGrade: cloneGradeParams(COLOR_GRADE_PRESETS.rec709_clean.params),
  colorActivePresetId: "rec709_clean",
  colorScopeMode: "parade",
  colorPresetsCatalog: null,
  colorLastCompile: null,
  colorCompileTimer: null,
  colorCompileSeq: 0,
  powerWindowOverlay: true,
  powerWindowDrag: null,
  qualifierHighlight: false,
  qualifierPickMode: false,
  qualifierPickDrag: false,
  qualifierLastSample: null,
  colorCurvesMode: "yrgb",
  colorCurvesChannel: "master",
  colorCurvesSelectedPt: -1,
  colorCurvesDrag: null,
  hslCurvesSelectedVec: "reds",
  hslCurvesDrag: null,
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
  planarTrackerTab: "planar",
  planarTrackerOverlay: true,
  planarTrackerDrag: null,
  dveOverlay: true,
  dveSplitGrid: false,
  dveDrag: null,
  planarTracker: {
    enabled: false,
    preset: "screen_insert",
    mode: "corner_pin",
    interpolation: "cubic",
    tl_x: 0.14,
    tl_y: 0.14,
    tr_x: 0.84,
    tr_y: 0.18,
    bl_x: 0.10,
    bl_y: 0.84,
    br_x: 0.86,
    br_y: 0.88,
    track_anchor_x: 0.50,
    track_anchor_y: 0.45,
    track_box_pct: 0.12,
    follow_track: true,
    track_keyframes: []
  },
  stabilizer: {
    enabled: false,
    preset: "smooth_gimbal",
    rx: 16,
    ry: 16,
    edge: "mirror",
    blocksize: 8,
    contrast: 125,
    search: "exhaustive",
    auto_zoom_pct: 106.0
  },
  colorPowerWindowTrack: {
    linked: false,
    keyframes: []
  },
  titleOverlay: cloneTitleParams(TITLE_PRESETS_FALLBACK.broadcast_lower_third.params),
  titlePresetsCatalog: null,
  titleLastCompile: null,
  titleCompileTimer: null,
  titleCompileSeq: 0,
  lowerThird: {
    enabled: false,
    title: "",
    subtitle: "",
    position: "bottom_left",
    font_size: 36,
    box_opacity: 0.65,
    start_s: 0.0,
    duration_s: 5.0
  },
  lowerThirdCompileSeq: 0,
  lowerThirdCompileTimer: null,
  deliverRetime: {
    enabled: false,
    speed: 1.0,
    reverse: false,
    retime_process: "nearest",
    ramp_preset: "constant",
    ramp_points: []
  },
  retimeRampSelectedIdx: -1,
  retimeRampDrag: null,
  retimeRampGeom: null,
  deliverRetimeCompileSeq: 0,
  deliverRetimeCompileTimer: null,
  reframe: {
    enabled: false,
    aspect_ratio: "source",
    pan_x: 0.0,
    pan_y: 0.0
  },
  reframeCompileSeq: 0,
  reframeCompileTimer: null,
  filmGrain: {
    enabled: false,
    preset: "35mm_fine",
    strength: 12,
    temporal: true
  },
  filmGrainCompileSeq: 0,
  filmGrainCompileTimer: null,
  vignette: {
    enabled: false,
    preset: "subtle_cinema",
    angle_deg: 24.0,
    mode: "forward"
  },
  vignetteCompileSeq: 0,
  vignetteCompileTimer: null,
  voiceCleanup: {
    enabled: false,
    preset: "youtube_voice",
    highpass_hz: 85,
    presence_db: 2.5,
    de_ess: 0.35
  },
  voiceCleanupCompileSeq: 0,
  voiceCleanupCompileTimer: null,
  subtitleTrack: {
    enabled: true,
    style: "clean_white",
    font_size: 34,
    margin_bottom_pct: 0.08,
    karaoke_mode: "off",
    highlight_color: "#ffe047",
    uppercase: false,
    safe_margin_preset: "standard",
    max_words_per_cue: 0,
    cues: [
      { index: 1, start_s: 0.5, end_s: 2.8, text: "Clean-room OpenTimelineIO interchange" },
      { index: 2, start_s: 3.2, end_s: 6.4, text: "Rec.709 color science and broadcast QA" },
      { index: 3, start_s: 7.0, end_s: 10.5, text: "Deterministic FFmpeg NVENC delivery" }
    ]
  },
  subtitleLastCompile: null,
  subtitleCompileTimer: null,
  subtitleOutputView: "fg",
  titlesSafeGuides: false,
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
  remotePollTimer: null,
  deliverSettingsTab: "video",
  mediaPoolInfoEntry: null,
  mediaPoolType: "all",
  mediaPoolSourceTape: false,
  mediaPoolActiveClipId: null,
  timelineViewStartFrame: 0,
  timelineOverviewDraw: null,
  sourceTapeState: null
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
  const clipLabelGroup = byId("clip-label-color-group");
  if (clipLabelGroup) {
    clipLabelGroup.setAttribute("aria-label", t("timeline.clipLabel.ariaGroup"));
  }
  const indexSearch = byId("timeline-index-search");
  if (indexSearch) {
    indexSearch.placeholder = t("timeline.index.searchPlaceholder");
    indexSearch.setAttribute("aria-label", t("timeline.index.searchAria"));
  }
  const indexFilterGroup = byId("timeline-index-color-filter");
  if (indexFilterGroup) {
    indexFilterGroup.setAttribute("aria-label", t("timeline.index.filterAria"));
  }
  const indexClearBtn = byId("btn-timeline-index-clear");
  if (indexClearBtn) {
    indexClearBtn.setAttribute("aria-label", t("timeline.index.clearAria"));
  }
  updateTransportStatusUI();
  updateIoRangeUI();
  renderShortcutsDialog();
  renderStillsGallery();
  renderUpdateButton();
  renderTimelineUI();
  renderMediaPool();
  renderFairlightAudioUI();
  renderColorNodeTreeUI();
  renderFxStack();
  renderDeliveryPresetStrip();
  updateDeliverSizeEstimate();
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
  redrawActiveCanvases();
  window.requestAnimationFrame(redrawActiveCanvases);
}

const DELIVER_SETTINGS_TABS = ["video", "audio", "looks", "file"];

function switchDeliverSettingsTab(tabName) {
  const nextTab = DELIVER_SETTINGS_TABS.includes(tabName) ? tabName : "video";
  state.deliverSettingsTab = nextTab;
  const tabList = byId("render-settings-tabs");
  if (tabList) {
    for (const btn of tabList.querySelectorAll(".deliver-subtab-btn[data-render-tab]")) {
      const isMatch = btn.getAttribute("data-render-tab") === nextTab;
      btn.classList.toggle("is-active", isMatch);
      btn.setAttribute("aria-selected", isMatch ? "true" : "false");
      btn.setAttribute("tabindex", isMatch ? "0" : "-1");
    }
  }
  for (const id of DELIVER_SETTINGS_TABS) {
    const panel = byId(`render-tabpanel-${id}`);
    if (!panel) continue;
    const isMatch = id === nextTab;
    panel.classList.toggle("is-hidden", !isMatch);
    if (isMatch) {
      panel.removeAttribute("hidden");
    } else {
      panel.setAttribute("hidden", "");
    }
  }
}

function syncDeliverTabIndicators() {
  const deintEl = byId("render-deinterlace");
  const framingEl = byId("render-use-framing");
  const exportFpsEl = byId("render-export-fps");
  const videoActive = Boolean(
    (state.deliverRetime && state.deliverRetime.enabled) ||
      (state.reframe && state.reframe.enabled) ||
      (deintEl && deintEl.checked) ||
      (framingEl && framingEl.checked) ||
      (exportFpsEl && exportFpsEl.value !== "source")
  );

  const audioOnlyEl = byId("render-audio-only-format");
  const audioActive = Boolean(
    (audioOnlyEl && audioOnlyEl.value !== "off") ||
      (state.voiceCleanup && state.voiceCleanup.enabled) ||
      (state.fairlightRack && !compileFairlightAudioRackClient(state.fairlightRack).is_identity) ||
      (state.fairlight &&
        ((state.fairlight.loudness_preset && state.fairlight.loudness_preset !== "off") ||
          (state.fairlight.dialogue_eq && state.fairlight.dialogue_eq !== "off")))
  );

  const lutEl = byId("render-lut-path");
  const tcEl = byId("render-timecode-burnin");
  const wmEl = byId("render-watermark-text");
  const cdlEl = byId("render-use-studio-cdl");
  const fxEl = byId("render-use-studio-fx");
  const titleEl = byId("render-use-studio-title");
  const subsEl = byId("render-use-studio-subtitles");
  const looksActive = Boolean(
    (lutEl && lutEl.value.trim()) ||
      (tcEl && tcEl.value !== "off") ||
      (wmEl && wmEl.value.trim()) ||
      (state.lowerThird && state.lowerThird.enabled) ||
      (state.filmGrain && state.filmGrain.enabled) ||
      (state.vignette && state.vignette.enabled) ||
      (cdlEl && cdlEl.checked) ||
      (fxEl && fxEl.checked) ||
      (titleEl && titleEl.checked) ||
      (subsEl && subsEl.checked)
  );

  const fileActive = state.renderEngine === "remote";

  const activeMap = {
    video: videoActive,
    audio: audioActive,
    looks: looksActive,
    file: fileActive
  };
  for (const [tabId, isOn] of Object.entries(activeMap)) {
    const btn = byId(`render-tab-${tabId}`);
    if (!btn) continue;
    btn.classList.toggle("has-indicator", isOn);
    const dot = btn.querySelector(".deliver-subtab-dot");
    if (dot) dot.classList.toggle("is-hidden", !isOn);
  }
}

function getEffectiveFxState() {
  return {
    bypassAll: state.fxBypassAll,
    nodes: state.fxStack,
    stabilizer: { ...state.stabilizer },
    planarTracker: { ...state.planarTracker }
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

function getEffectiveFramingState(includeTitlesSafe = false) {
  const showTitlesGuides = includeTitlesSafe && Boolean(state.titlesSafeGuides);
  const guidesEnabled = Boolean(state.framing.safeGuides) || showTitlesGuides;
  return {
    aspectPreset: state.framing.preset,
    framingMode: state.framing.mode,
    guides: {
      enabled: guidesEnabled,
      actionSafe: state.framing.guides.actionSafe || showTitlesGuides,
      titleSafe: state.framing.guides.titleSafe || showTitlesGuides,
      socialHud: state.framing.guides.socialHud || showTitlesGuides,
      captionMarginPct: showTitlesGuides ? state.subtitleTrack.margin_bottom_pct : null
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
  if (state.activeTab === "timeline" && state.timelineDoc) {
    renderTimelineTransformInspector();
    renderTimelineRetimeRampCanvas();
  }
}

function redrawActiveCanvases() {
  const activeColorChain = getActiveColorChainState();
  if (state.activeTab === "timeline") {
    const selVideoCtx = getSelectedClipLocalContext();
    drawProgramMonitorCanvas(
      byId("timeline-program-canvas"),
      state.timelineDoc,
      state.playheadFrame,
      activeColorChain,
      getEffectiveFxState(),
      getEffectiveTitleState(false),
      getEffectiveFramingState(),
      getEffectiveSubtitleState(false),
      null,
      null,
      {
        lowerThird: { ...state.lowerThird },
        reframe: { ...state.reframe },
        filmGrain: { ...state.filmGrain },
        vignette: { ...state.vignette },
        showPlanarTrackerOverlay: state.activeTab === "fx" && Boolean(state.planarTrackerOverlay),
        dveOverlay: Boolean(state.dveOverlay),
        dveSplitGrid: Boolean(state.dveSplitGrid),
        selectedDveClip: selVideoCtx ? selVideoCtx.clip : null,
        trimHud: state.timelineActiveEditHud
      }
    );
    const startFrame = state.timelineDoc ? state.timelineDoc.start_frame || 0 : 0;
    const zoomVp = computeTimelineZoomViewport(
      startFrame,
      state.timelineMaxFrame,
      state.timelineZoom,
      null,
      state.timelineViewStartFrame
    );
    state.timelineViewStartFrame = zoomVp.viewStartFrame;
    state.timelineOverviewDraw = drawTimelineOverviewCanvas(
      byId("timeline-overview-canvas"),
      state.timelineDoc,
      {
        zoom: state.timelineZoom,
        viewStartFrame: state.timelineViewStartFrame,
        playheadFrame: state.playheadFrame,
        ioRange: state.ioRange
      }
    );
    const tlDraw = drawTimelineCanvas(
      byId("timeline-canvas"),
      state.timelineDoc,
      state.timelineValidation,
      {
        zoom: state.timelineZoom,
        viewStartFrame: state.timelineViewStartFrame,
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
        activeEditHud: state.timelineActiveEditHud,
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
    renderFairlightRackCanvases();
  } else if (state.activeTab === "fx") {
    drawProgramMonitorCanvas(
      byId("fx-program-canvas"),
      state.timelineDoc,
      state.playheadFrame,
      activeColorChain,
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
      },
      {
        lowerThird: { ...state.lowerThird },
        reframe: { ...state.reframe },
        filmGrain: { ...state.filmGrain },
        vignette: { ...state.vignette },
        showPlanarTrackerOverlay: state.activeTab === "fx" && Boolean(state.planarTrackerOverlay)
      }
    );
    redrawFxKeyframeCanvases();
  } else if (state.activeTab === "titles") {
    drawProgramMonitorCanvas(
      byId("titles-program-canvas"),
      state.timelineDoc,
      state.playheadFrame,
      activeColorChain,
      getEffectiveFxState(),
      getEffectiveTitleState(true),
      getEffectiveFramingState(true),
      getEffectiveSubtitleState(true),
      null,
      null,
      {
        lowerThird: { ...state.lowerThird },
        reframe: { ...state.reframe },
        filmGrain: { ...state.filmGrain },
        vignette: { ...state.vignette },
        showPlanarTrackerOverlay: state.activeTab === "fx" && Boolean(state.planarTrackerOverlay)
      }
    );
  } else if (state.activeTab === "color") {
    const previewCanvas = byId("color-preview-canvas");
    const activeNode = getSelectedColorNode(state.colorNodeTree);
    drawColorPreviewCanvas(previewCanvas, activeColorChain, state.wipeRatio, {
      enabled: Boolean(state.colorSplitWipe.enabled),
      positionPct: state.colorSplitWipe.positionPct,
      isHovered: Boolean(state.colorSplitWipe.isHovered),
      isDragging: Boolean(state.colorSplitWipe.isDragging),
      beforeLabel: t("wipe.pill.before"),
      afterLabel: t("wipe.pill.after"),
      qualifierHighlight: Boolean(state.qualifierHighlight),
      activeNodeId: activeNode ? activeNode.id : null,
      powerWindow: {
        window: activeNode ? activeNode.power_window : null,
        showOverlay: Boolean(state.powerWindowOverlay)
      }
    });
    drawColorScopeCanvas(
      byId("color-scope-canvas"),
      activeColorChain,
      state.colorScopeMode,
      previewCanvas
    );
    drawQualifierSpectrumCanvas(
      byId("qual-spectrum-canvas"),
      activeNode ? activeNode.qualifier : createDefaultQualifier()
    );
    const curvesCanvasEl = byId("color-curves-canvas");
    if (HSL_CURVE_MODES.includes(state.colorCurvesMode)) {
      drawHslCurvesCanvas(
        curvesCanvasEl,
        activeNode ? activeNode.hsl_curves : createDefaultHslCurves(),
        state.colorCurvesMode,
        state.hslCurvesSelectedVec
      );
    } else {
      drawColorCurvesCanvas(
        curvesCanvasEl,
        activeNode ? activeNode.curves : createDefaultColorCurves(),
        state.colorCurvesChannel,
        state.colorCurvesSelectedPt,
        { previewCanvas, cdl: activeColorChain }
      );
    }
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
  state.timelineIndexQuery = "";
  state.timelineIndexColor = "all";
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
    renderMediaPool();
    renderTimelineIndex();
    renderDeliverChaptersPreview();
    updateDeliverSizeEstimate();
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
  renderMediaPool();
  renderTimelineIndex();
  renderDeliverChaptersPreview();
  updateDeliverSizeEstimate();
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

function getSelectedClipFadePayload() {
  const doc = state.timelineDoc;
  const info = getSelectedClipTrack();
  if (!doc || !info) return null;
  const norm = normalizeClipAudio(info.clip);
  const fpsRate = doc.fps ? Math.max(1, doc.fps.num / Math.max(1, doc.fps.den)) : 25;
  const clipDurationS = Math.max(0.04, info.clip.duration_frames / fpsRate);
  const isVideoClip = info.clip.media_type !== "audio";
  const fadeInS = isVideoClip ? norm.fadeInS : 0;
  const fadeOutS = isVideoClip ? norm.fadeOutS : 0;
  return {
    isIdentity: fadeInS < 1e-6 && fadeOutS < 1e-6,
    isVideoClip,
    clipDurationS,
    video_fade: {
      fade_in_s: fadeInS,
      fade_out_s: fadeOutS
    }
  };
}

function getSelectedClipRetimePayload() {
  const doc = state.timelineDoc;
  const info = getSelectedClipTrack();
  if (!doc || !info) return null;
  const norm = normalizeClipRetime(info.clip);
  const hasRamp = norm.rampPoints.length >= 2;
  const isIdentity =
    !norm.reverse &&
    norm.retimeProcess === "nearest" &&
    !hasRamp &&
    Math.abs(norm.speedRate - 1.0) <= 1e-6;
  return {
    isIdentity,
    retime_params: {
      speed_rate: norm.speedRate,
      reverse: norm.reverse,
      retime_process: norm.retimeProcess,
      ramp_preset: norm.rampPreset,
      ramp_points: norm.rampPoints
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

function preserveSelectionAcrossDoc(nextDoc) {
  let nextSel = state.timelineSelected;
  if (nextSel && nextSel.kind === "clip") {
    const ref = findClipIndex(state.timelineDoc, nextSel.data);
    if (ref) {
      const found = findTrackAndClip(nextDoc, ref.trackKind, ref.trackIndex, ref.clipIndex);
      if (found) nextSel = { kind: "clip", data: found.clip };
    }
  }
  return nextSel;
}

function toggleTrackMuteAction(trackKind, trackIndex) {
  if (!state.timelineDoc) return;
  const res = toggleTrackMuteInDocument(state.timelineDoc, trackKind, trackIndex);
  if (!res.changed) return;
  commitTimelineMutation(res.doc, preserveSelectionAcrossDoc(res.doc));
}

function toggleTrackSoloAction(trackKind, trackIndex) {
  if (!state.timelineDoc) return;
  const res = toggleTrackSoloInDocument(state.timelineDoc, trackKind, trackIndex);
  if (!res.changed) return;
  commitTimelineMutation(res.doc, preserveSelectionAcrossDoc(res.doc));
}

function toggleTrackArmAction(trackKind, trackIndex) {
  if (!state.timelineDoc) return;
  const res = toggleTrackArmInDocument(state.timelineDoc, trackKind, trackIndex);
  if (!res.changed) return;
  commitTimelineMutation(res.doc, preserveSelectionAcrossDoc(res.doc));
}

function toggleTrackSyncLockAction(trackKind, trackIndex) {
  if (!state.timelineDoc) return;
  const res = toggleTrackSyncLockInDocument(state.timelineDoc, trackKind, trackIndex);
  if (!res.changed) return;
  state.timelineLastEditReadout = `${trackKind === "audio" ? "A" : "V"}${trackIndex} Sync Lock ${
    res.track && res.track.sync_locked ? "ON" : "OFF"
  }`;
  commitTimelineMutation(res.doc, preserveSelectionAcrossDoc(res.doc));
}

function toggleAllTracksSyncLockAction() {
  if (!state.timelineDoc || !Array.isArray(state.timelineDoc.tracks)) return;
  const total = state.timelineDoc.tracks.length;
  const locked = countSyncLockedTracks(state.timelineDoc);
  const enable = locked < total;
  const res = setAllTracksSyncLockInDocument(state.timelineDoc, enable);
  if (!res.changed) return;
  state.timelineLastEditReadout = `Sync Lock ${enable ? "ALL ON" : "ALL OFF"} (${res.syncLockedTracks}/${total})`;
  commitTimelineMutation(res.doc, preserveSelectionAcrossDoc(res.doc));
}

function updateTrackMixerLive(trackKind, trackIndex, patch) {
  if (!state.timelineDoc) return;
  const code = `${trackKind === "audio" ? "A" : "V"}${trackIndex}`;
  state.mixerSelectedTrackCode = code;
  const res = updateTrackMixerInDocument(state.timelineDoc, trackKind, trackIndex, patch);
  if (!res.changed) {
    renderFairlightMixerPreview();
    return;
  }
  state.timelineDoc = res.doc;
  const trkMix = normalizeTrackMixerState(res.track);
  const dbEl = document.querySelector(`[data-track-db="${code}"]`);
  if (dbEl) dbEl.textContent = `${trkMix.volume_db >= 0 ? "+" : ""}${trkMix.volume_db.toFixed(1)}`;
  const panEl = document.querySelector(`[data-track-pan-label="${code}"]`);
  if (panEl) panEl.textContent = formatTrackPanLabel(trkMix.pan);
  renderFairlightMixerPreview();
  updateVuMeterInstant(performance.now(), state.playbackSpeed !== 0);
}

function commitTrackMixerDrag() {
  if (!state.mixerDragDocBefore || !state.timelineDoc) {
    state.mixerDragDocBefore = null;
    return;
  }
  const before = state.mixerDragDocBefore;
  state.mixerDragDocBefore = null;
  if (JSON.stringify(before.tracks) !== JSON.stringify(state.timelineDoc.tracks)) {
    state.timelineUndoStack.push(before);
    if (state.timelineUndoStack.length > 60) state.timelineUndoStack.shift();
    state.timelineRedoStack = [];
    updateHistoryButtons();
  }
}

function resetTrackMixerSingleAction(trackKind, trackIndex) {
  if (!state.timelineDoc) return;
  const code = `${trackKind === "audio" ? "A" : "V"}${trackIndex}`;
  state.mixerSelectedTrackCode = code;
  const res = updateTrackMixerInDocument(state.timelineDoc, trackKind, trackIndex, {
    volume_db: 0.0,
    pan: 0.0
  });
  if (!res.changed) return;
  commitTimelineMutation(res.doc, preserveSelectionAcrossDoc(res.doc));
}

function resetMixerConsoleAction() {
  state.masterBus = normalizeMasterBusState({
    volume_db: 0.0,
    muted: false,
    dim_enabled: false,
    voice_isolation: false
  });
  if (state.voiceCleanup.enabled) {
    state.voiceCleanup.enabled = false;
    syncVoiceCleanupControlsUI();
  }
  if (state.timelineDoc) {
    const res = resetAllTracksMixerInDocument(state.timelineDoc);
    if (res.changed) {
      commitTimelineMutation(res.doc, preserveSelectionAcrossDoc(res.doc));
      return;
    }
  }
  renderTimelineAudioInspector();
  renderFairlightAudioUI();
}

function setMasterBusState(patch) {
  const prevIso = Boolean(state.masterBus.voice_isolation);
  state.masterBus = normalizeMasterBusState({ ...state.masterBus, ...patch });
  if (Object.hasOwn(patch, "voice_isolation") && state.masterBus.voice_isolation !== prevIso) {
    state.voiceCleanup.enabled = Boolean(state.masterBus.voice_isolation);
    syncVoiceCleanupControlsUI();
  }
  renderTimelineAudioInspector();
  renderFairlightAudioUI();
  updateVuMeterInstant(performance.now(), state.playbackSpeed !== 0);
}

function renderFairlightMixerPreview() {
  const previewEl = byId("fairlight-mixer-af-preview");
  if (!previewEl) return;
  const tracks = state.timelineDoc && Array.isArray(state.timelineDoc.tracks) ? state.timelineDoc.tracks : [];
  const targetTrack =
    tracks.find((trk) => `${trk.kind === "audio" ? "A" : "V"}${trk.index}` === state.mixerSelectedTrackCode) ||
    tracks.find((trk) => trk.kind === "audio") ||
    tracks[0];
  if (!targetTrack) {
    previewEl.textContent = t("timeline.mixer.bypassed");
    return;
  }
  const code = `${targetTrack.kind === "audio" ? "A" : "V"}${targetTrack.index}`;
  const mix = normalizeTrackMixerState(targetTrack);
  const effMuted = isTrackAudiblyMuted(targetTrack, tracks);
  const compiled = compileFairlightMixerClient(
    { track_code: code, ...mix, muted: effMuted },
    state.masterBus,
    state.voiceCleanup
  );
  if (compiled.filtergraph) {
    previewEl.textContent = `${code} -> M1: -af ${compiled.filtergraph}`;
  } else {
    previewEl.textContent = `${code} -> M1: ${t("timeline.mixer.bypassed")}`;
  }
}

function renderTimelineFadeInspector() {
  const fadeCtrl = byId("clip-fade-controls");
  const fadeBadge = byId("clip-fade-badge");
  const fadePreview = byId("clip-fade-fg-preview");
  const fadeResetAll = byId("btn-clip-fade-reset-all");
  const fadeInRange = byId("clip-fade-in-range");
  const fadeInNum = byId("clip-fade-in-num");
  const fadeOutRange = byId("clip-fade-out-range");
  const fadeOutNum = byId("clip-fade-out-num");
  const rstIn = byId("btn-clip-fade-in-reset");
  const rstOut = byId("btn-clip-fade-out-reset");
  const quickBtns = document.querySelectorAll(".fade-quick-btn");

  const info = getSelectedClipTrack();
  const hasClip = Boolean(info);
  if (fadeCtrl) fadeCtrl.classList.toggle("is-disabled", !hasClip);
  for (const el of [
    fadeInRange,
    fadeInNum,
    fadeOutRange,
    fadeOutNum,
    rstIn,
    rstOut,
    fadeResetAll,
    ...quickBtns
  ]) {
    if (el) el.disabled = !hasClip;
  }

  if (!info) {
    if (fadeInRange) fadeInRange.value = "0";
    if (fadeInNum && document.activeElement !== fadeInNum) fadeInNum.value = "0.00";
    if (fadeOutRange) fadeOutRange.value = "0";
    if (fadeOutNum && document.activeElement !== fadeOutNum) fadeOutNum.value = "0.00";
    for (const btn of quickBtns) {
      btn.classList.remove("is-active");
      btn.setAttribute("aria-pressed", "false");
    }
    if (fadeBadge) {
      fadeBadge.textContent = "NO CLIP";
      fadeBadge.className = "nle-tag mono";
    }
    if (fadePreview) fadePreview.textContent = t("timeline.fade.bypassed");
    return;
  }

  const norm = normalizeClipAudio(info.clip);
  if (fadeInRange) fadeInRange.value = String(norm.fadeInS);
  if (fadeInNum && document.activeElement !== fadeInNum) fadeInNum.value = norm.fadeInS.toFixed(2);
  if (fadeOutRange) fadeOutRange.value = String(norm.fadeOutS);
  if (fadeOutNum && document.activeElement !== fadeOutNum) fadeOutNum.value = norm.fadeOutS.toFixed(2);

  for (const btn of quickBtns) {
    const edge = btn.getAttribute("data-fade-quick");
    const targetVal = Number.parseFloat(btn.getAttribute("data-fade-val") || "0");
    const currentVal = edge === "out" ? norm.fadeOutS : norm.fadeInS;
    const isMatch = Math.abs(currentVal - targetVal) < 0.01;
    btn.classList.toggle("is-active", isMatch);
    btn.setAttribute("aria-pressed", isMatch ? "true" : "false");
  }

  const hasAnyFade = norm.fadeInS > 1e-6 || norm.fadeOutS > 1e-6;
  if (fadeBadge) {
    if (!hasAnyFade) {
      fadeBadge.textContent = "OFF";
      fadeBadge.className = "nle-tag mono";
    } else {
      const parts = [];
      if (norm.fadeInS > 1e-6) parts.push(`IN ${norm.fadeInS.toFixed(1)}s`);
      if (norm.fadeOutS > 1e-6) parts.push(`OUT ${norm.fadeOutS.toFixed(1)}s`);
      fadeBadge.textContent = parts.join(" | ");
      fadeBadge.className = "nle-tag mono is-pass";
    }
  }

  if (fadePreview) {
    if (!hasAnyFade) {
      fadePreview.textContent = t("timeline.fade.bypassed");
    } else {
      const audioPayload = getSelectedClipAudioPayload();
      const fadePayload = getSelectedClipFadePayload();
      const clipDur = audioPayload ? audioPayload.clipDurationS : null;
      const previewParts = [];
      if (fadePayload && fadePayload.isVideoClip) {
        const compiledVf = compileVideoFadeFilterClient(fadePayload.video_fade, clipDur);
        if (compiledVf.filtergraph) previewParts.push(`-vf ${compiledVf.filtergraph}`);
      }
      if (audioPayload && !audioPayload.audio_params.muted) {
        const compiledAf = compileAudioFilterClient(
          { gain_db: 0, fade_in_s: norm.fadeInS, fade_out_s: norm.fadeOutS, muted: false },
          clipDur,
          null
        );
        if (compiledAf.filtergraph) previewParts.push(`-af ${compiledAf.filtergraph}`);
      }
      fadePreview.textContent =
        previewParts.length > 0 ? previewParts.join(" | ") : t("timeline.fade.bypassed");
    }
  }
}

function renderTimelineAudioInspector() {
  const ctrlGrid = byId("clip-audio-controls");
  const afBadge = byId("clip-audio-af-preview");
  const sendBtn = byId("btn-clip-audio-to-deliver");
  const mixerStrip = byId("track-mixer-strip");
  const mixerSummary = byId("track-mixer-summary");
  const gainRange = byId("clip-audio-gain-range");
  const gainNum = byId("clip-audio-gain-num");
  const rstGain = byId("btn-clip-gain-reset");

  renderTimelineFadeInspector();
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

  const master = normalizeMasterBusState(state.masterBus);
  state.masterBus = master;
  const expectedKeys = [...tracks.map((t) => `${t.kind === "audio" ? "A" : "V"}${t.index}`), "M1"].join(",");
  const canPatchInPlace = mixerStrip.dataset.stripKeys === expectedKeys;

  if (!canPatchInPlace) {
    mixerStrip.dataset.stripKeys = expectedKeys;
    const stripNodes = tracks.map((trk) => {
      const code = `${trk.kind === "audio" ? "A" : "V"}${trk.index}`;
      const trkMix = normalizeTrackMixerState(trk);
      const effMuted = isTrackAudiblyMuted(trk, tracks);
      const pill = dom("div", `mixer-ch-pill${effMuted ? " is-muted-effective" : ""}`);
      pill.dataset.stripCode = code;

      const head = dom("div", "mixer-ch-head");
      const tag = dom("span", `mixer-ch-tag mono ${trk.kind === "audio" ? "is-audio" : "is-video"}`, code);
      const dbBadge = dom(
        "span",
        "mixer-ch-db mono",
        `${trkMix.volume_db >= 0 ? "+" : ""}${trkMix.volume_db.toFixed(1)}`
      );
      dbBadge.setAttribute("data-track-db", code);
      head.replaceChildren(tag, dbBadge);

      const btnsRow = dom("div", "mixer-ch-btns");
      const mBtn = dom("button", `mixer-btn${trkMix.muted ? " is-mute" : ""}`, "M");
      mBtn.type = "button";
      mBtn.setAttribute("aria-pressed", trkMix.muted ? "true" : "false");
      mBtn.setAttribute("aria-label", `Mute track ${code}`);
      mBtn.setAttribute("data-track-mute", code);
      mBtn.addEventListener("click", () => toggleTrackMuteAction(trk.kind, trk.index));

      const sBtn = dom("button", `mixer-btn${trkMix.solo ? " is-solo" : ""}`, "S");
      sBtn.type = "button";
      sBtn.setAttribute("aria-pressed", trkMix.solo ? "true" : "false");
      sBtn.setAttribute("aria-label", `Solo track ${code}`);
      sBtn.setAttribute("data-track-solo", code);
      sBtn.addEventListener("click", () => toggleTrackSoloAction(trk.kind, trk.index));

      const rBtn = dom("button", `mixer-btn${trkMix.rec_armed ? " is-arm" : ""}`, "R");
      rBtn.type = "button";
      rBtn.setAttribute("aria-pressed", trkMix.rec_armed ? "true" : "false");
      rBtn.setAttribute("aria-label", `Arm track ${code}`);
      rBtn.setAttribute("data-track-arm", code);
      rBtn.addEventListener("click", () => toggleTrackArmAction(trk.kind, trk.index));
      btnsRow.replaceChildren(mBtn, sBtn, rBtn);

      const panRow = dom("div", "mixer-pan-row");
      const panInput = document.createElement("input");
      panInput.type = "range";
      panInput.className = "mixer-pan-input";
      panInput.min = String(TRACK_PAN_MIN);
      panInput.max = String(TRACK_PAN_MAX);
      panInput.step = "0.05";
      panInput.value = String(trkMix.pan);
      panInput.setAttribute("aria-label", `Pan track ${code}`);
      panInput.setAttribute("data-track-pan", code);
      panInput.addEventListener("pointerdown", () => {
        if (!state.mixerDragDocBefore && state.timelineDoc) {
          state.mixerDragDocBefore = cloneTimelineDoc(state.timelineDoc);
        }
      });
      panInput.addEventListener("input", () => {
        const val = Number.parseFloat(panInput.value);
        if (Number.isFinite(val)) {
          updateTrackMixerLive(trk.kind, trk.index, { pan: val });
        }
      });
      panInput.addEventListener("change", () => {
        commitTrackMixerDrag();
      });
      panInput.addEventListener("dblclick", () => {
        resetTrackMixerSingleAction(trk.kind, trk.index);
      });
      const panVal = dom("span", "mixer-pan-val mono", formatTrackPanLabel(trkMix.pan));
      panVal.setAttribute("data-track-pan-label", code);
      panRow.replaceChildren(panInput, panVal);

      const stage = dom("div", "mixer-fader-stage");
      const faderInput = document.createElement("input");
      faderInput.type = "range";
      faderInput.className = "mixer-fader-input";
      faderInput.min = String(TRACK_VOLUME_DB_MIN);
      faderInput.max = String(TRACK_VOLUME_DB_MAX);
      faderInput.step = "0.5";
      faderInput.value = String(trkMix.volume_db);
      faderInput.setAttribute("aria-label", `Fader track ${code} dB`);
      faderInput.setAttribute("data-track-fader", code);
      faderInput.addEventListener("pointerdown", () => {
        if (!state.mixerDragDocBefore && state.timelineDoc) {
          state.mixerDragDocBefore = cloneTimelineDoc(state.timelineDoc);
        }
      });
      faderInput.addEventListener("input", () => {
        const val = Number.parseFloat(faderInput.value);
        if (Number.isFinite(val)) {
          updateTrackMixerLive(trk.kind, trk.index, { volume_db: val });
        }
      });
      faderInput.addEventListener("change", () => {
        commitTrackMixerDrag();
      });
      faderInput.addEventListener("dblclick", () => {
        resetTrackMixerSingleAction(trk.kind, trk.index);
      });
      const meterWell = dom("div", "mixer-meter-well");
      const meterFill = dom("div", "mixer-meter-fill");
      meterFill.setAttribute("data-track-meter", code);
      meterWell.appendChild(meterFill);
      stage.replaceChildren(faderInput, meterWell);

      const unityBtn = dom("button", "mixer-unity-btn", "0dB");
      unityBtn.type = "button";
      unityBtn.setAttribute("aria-label", `Reset track ${code} fader and pan`);
      unityBtn.setAttribute("data-track-unity", code);
      unityBtn.addEventListener("click", () => resetTrackMixerSingleAction(trk.kind, trk.index));

      pill.replaceChildren(head, btnsRow, panRow, stage, unityBtn);
      return pill;
    });

    // Master Bus Strip M1
    const masterPill = dom("div", `mixer-ch-pill is-master${master.muted ? " is-muted-effective" : ""}`);
    masterPill.dataset.stripCode = "M1";

    const mHead = dom("div", "mixer-ch-head");
    const mTag = dom("span", "mixer-ch-tag mono is-master", "M1");
    const mDb = dom(
      "span",
      "mixer-ch-db mono",
      `${master.volume_db >= 0 ? "+" : ""}${master.volume_db.toFixed(1)}`
    );
    mDb.setAttribute("data-master-db", "M1");
    mHead.replaceChildren(mTag, mDb);

    const mBtns = dom("div", "mixer-ch-btns");
    const mMute = dom("button", `mixer-btn${master.muted ? " is-mute" : ""}`, "M");
    mMute.type = "button";
    mMute.setAttribute("aria-pressed", master.muted ? "true" : "false");
    mMute.setAttribute("aria-label", "Mute Master Bus");
    mMute.setAttribute("data-master-mute", "M1");
    mMute.addEventListener("click", () => setMasterBusState({ muted: !state.masterBus.muted }));

    const mDim = dom("button", `mixer-btn${master.dim_enabled ? " is-dim" : ""}`, "DIM");
    mDim.type = "button";
    mDim.setAttribute("aria-pressed", master.dim_enabled ? "true" : "false");
    mDim.setAttribute("aria-label", "Dim Master Bus -20 dB");
    mDim.setAttribute("data-master-dim", "M1");
    mDim.addEventListener("click", () => setMasterBusState({ dim_enabled: !state.masterBus.dim_enabled }));

    const mIso = dom("button", `mixer-btn${master.voice_isolation ? " is-iso" : ""}`, "ISO");
    mIso.type = "button";
    mIso.setAttribute("aria-pressed", master.voice_isolation ? "true" : "false");
    mIso.setAttribute("aria-label", "Voice Isolation Live Preview");
    mIso.setAttribute("data-master-iso", "M1");
    mIso.addEventListener("click", () => setMasterBusState({ voice_isolation: !state.masterBus.voice_isolation }));
    mBtns.replaceChildren(mMute, mDim, mIso);

    const mPanRow = dom("div", "mixer-pan-row");
    const mBusLbl = dom("span", "mixer-pan-val mono", t("timeline.mixer.masterLabel"));
    mBusLbl.style.flex = "1 1 auto";
    mBusLbl.style.textAlign = "center";
    mPanRow.appendChild(mBusLbl);

    const mStage = dom("div", "mixer-fader-stage");
    const mFader = document.createElement("input");
    mFader.type = "range";
    mFader.className = "mixer-fader-input";
    mFader.min = String(TRACK_VOLUME_DB_MIN);
    mFader.max = String(TRACK_VOLUME_DB_MAX);
    mFader.step = "0.5";
    mFader.value = String(master.volume_db);
    mFader.setAttribute("aria-label", "Master Bus M1 Fader dB");
    mFader.setAttribute("data-master-fader", "M1");
    mFader.addEventListener("input", () => {
      const val = Number.parseFloat(mFader.value);
      if (Number.isFinite(val)) {
        state.masterBus = normalizeMasterBusState({ ...state.masterBus, volume_db: val });
        const dbEl = document.querySelector('[data-master-db="M1"]');
        if (dbEl) dbEl.textContent = `${state.masterBus.volume_db >= 0 ? "+" : ""}${state.masterBus.volume_db.toFixed(1)}`;
        renderFairlightMixerPreview();
        updateVuMeterInstant(performance.now(), state.playbackSpeed !== 0);
      }
    });
    mFader.addEventListener("dblclick", () => setMasterBusState({ volume_db: 0.0 }));
    const mWell = dom("div", "mixer-meter-well");
    const mFill = dom("div", "mixer-meter-fill");
    mFill.setAttribute("data-master-meter", "M1");
    mWell.appendChild(mFill);
    mStage.replaceChildren(mFader, mWell);

    const mUnity = dom("button", "mixer-unity-btn", "0dB");
    mUnity.type = "button";
    mUnity.setAttribute("aria-label", "Reset Master Bus M1 fader");
    mUnity.setAttribute("data-master-unity", "M1");
    mUnity.addEventListener("click", () => setMasterBusState({ volume_db: 0.0, muted: false, dim_enabled: false }));

    masterPill.replaceChildren(mHead, mBtns, mPanRow, mStage, mUnity);
    stripNodes.push(masterPill);
    mixerStrip.replaceChildren(...stripNodes);
  } else {
    // Update existing strips in-place to preserve slider drag & focus
    for (const trk of tracks) {
      const code = `${trk.kind === "audio" ? "A" : "V"}${trk.index}`;
      const trkMix = normalizeTrackMixerState(trk);
      const effMuted = isTrackAudiblyMuted(trk, tracks);
      const pill = mixerStrip.querySelector(`[data-strip-code="${code}"]`);
      if (!pill) continue;
      pill.classList.toggle("is-muted-effective", effMuted);
      const dbEl = pill.querySelector(`[data-track-db="${code}"]`);
      if (dbEl) dbEl.textContent = `${trkMix.volume_db >= 0 ? "+" : ""}${trkMix.volume_db.toFixed(1)}`;
      const mBtn = pill.querySelector(`[data-track-mute="${code}"]`);
      if (mBtn) {
        mBtn.classList.toggle("is-mute", trkMix.muted);
        mBtn.setAttribute("aria-pressed", trkMix.muted ? "true" : "false");
      }
      const sBtn = pill.querySelector(`[data-track-solo="${code}"]`);
      if (sBtn) {
        sBtn.classList.toggle("is-solo", trkMix.solo);
        sBtn.setAttribute("aria-pressed", trkMix.solo ? "true" : "false");
      }
      const rBtn = pill.querySelector(`[data-track-arm="${code}"]`);
      if (rBtn) {
        rBtn.classList.toggle("is-arm", trkMix.rec_armed);
        rBtn.setAttribute("aria-pressed", trkMix.rec_armed ? "true" : "false");
      }
      const panIn = pill.querySelector(`[data-track-pan="${code}"]`);
      if (panIn && document.activeElement !== panIn) panIn.value = String(trkMix.pan);
      const panLbl = pill.querySelector(`[data-track-pan-label="${code}"]`);
      if (panLbl) panLbl.textContent = formatTrackPanLabel(trkMix.pan);
      const faderIn = pill.querySelector(`[data-track-fader="${code}"]`);
      if (faderIn && document.activeElement !== faderIn) faderIn.value = String(trkMix.volume_db);
    }
    const masterPill = mixerStrip.querySelector('[data-strip-code="M1"]');
    if (masterPill) {
      masterPill.classList.toggle("is-muted-effective", master.muted);
      const mDb = masterPill.querySelector('[data-master-db="M1"]');
      if (mDb) mDb.textContent = `${master.volume_db >= 0 ? "+" : ""}${master.volume_db.toFixed(1)}`;
      const mMute = masterPill.querySelector('[data-master-mute="M1"]');
      if (mMute) {
        mMute.classList.toggle("is-mute", master.muted);
        mMute.setAttribute("aria-pressed", master.muted ? "true" : "false");
      }
      const mDim = masterPill.querySelector('[data-master-dim="M1"]');
      if (mDim) {
        mDim.classList.toggle("is-dim", master.dim_enabled);
        mDim.setAttribute("aria-pressed", master.dim_enabled ? "true" : "false");
      }
      const mIso = masterPill.querySelector('[data-master-iso="M1"]');
      if (mIso) {
        mIso.classList.toggle("is-iso", master.voice_isolation);
        mIso.setAttribute("aria-pressed", master.voice_isolation ? "true" : "false");
      }
      const mFader = masterPill.querySelector('[data-master-fader="M1"]');
      if (mFader && document.activeElement !== mFader) mFader.value = String(master.volume_db);
    }
  }
  renderFairlightMixerPreview();

  const info = getSelectedClipTrack();
  const hasClip = Boolean(info);
  ctrlGrid.classList.toggle("is-disabled", !hasClip);
  for (const el of [gainRange, gainNum, rstGain, sendBtn]) {
    if (el) el.disabled = !hasClip;
  }

  if (!info) {
    if (gainRange) gainRange.value = "0";
    if (gainNum && document.activeElement !== gainNum) gainNum.value = "0.0";
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

  const isoBtn = byId("btn-fairlight-voice-iso");
  const isoBadge = byId("fairlight-voice-iso-badge");
  const isoOn = Boolean(state.masterBus.voice_isolation || state.voiceCleanup.enabled);
  if (isoBtn) {
    isoBtn.classList.toggle("is-active", isoOn);
    isoBtn.setAttribute("aria-pressed", isoOn ? "true" : "false");
    isoBtn.textContent = isoOn ? t("timeline.fairlight.isoOn") : t("timeline.fairlight.isoOff");
  }
  if (isoBadge) {
    const vc = getNormalizedVoiceCleanupPayload();
    const sign = vc.presence_db >= 0 ? "+" : "";
    isoBadge.textContent = `HP ${vc.highpass_hz}Hz | ${sign}${vc.presence_db.toFixed(1)}dB`;
    isoBadge.className = isoOn ? "nle-tag mono is-pass" : "nle-tag mono";
  }
  renderFairlightMixerPreview();

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
    const compiledRack = compileFairlightAudioRackClient(state.fairlightRack);
    const previewParts = [];
    if (compiledFull.filtergraph) previewParts.push(compiledFull.filtergraph);
    if (!clipParams.muted && !compiledRack.is_identity && compiledRack.filtergraph) {
      previewParts.push(compiledRack.filtergraph);
    }
    delPreview.textContent = previewParts.length > 0 ? `-af ${previewParts.join(",")}` : t("common.none");
  }
  renderFairlightAudioRackUI();
}

function renderFairlightRackCanvases() {
  if (state.activeTab !== "timeline") return;
  const eqCanvas = byId("fairlight-eq-canvas");
  if (eqCanvas && state.fairlightRackTab === "eq") {
    renderFairlightEqCurveCanvas(eqCanvas, state.fairlightRack, state.fairlightRackBandId);
  }
  const dynCanvas = byId("fairlight-dyn-canvas");
  if (dynCanvas && state.fairlightRackTab === "dyn") {
    const livePeak = Math.max(-48, Number(state.vuMeter.leftDb || -60), Number(state.vuMeter.rightDb || -60));
    const inputProbe = state.playbackPlaying ? livePeak : -12.0;
    renderFairlightDynamicsCanvas(dynCanvas, state.fairlightRack, inputProbe);
  }
}

function switchFairlightRackTab(tabId) {
  const nextTab = tabId === "dyn" ? "dyn" : "eq";
  state.fairlightRackTab = nextTab;
  const eqTab = byId("fairlight-rack-tab-eq");
  const dynTab = byId("fairlight-rack-tab-dyn");
  const eqPanel = byId("fairlight-rack-panel-eq");
  const dynPanel = byId("fairlight-rack-panel-dyn");
  if (eqTab) {
    eqTab.classList.toggle("is-active", nextTab === "eq");
    eqTab.setAttribute("aria-selected", nextTab === "eq" ? "true" : "false");
    eqTab.setAttribute("tabindex", nextTab === "eq" ? "0" : "-1");
  }
  if (dynTab) {
    dynTab.classList.toggle("is-active", nextTab === "dyn");
    dynTab.setAttribute("aria-selected", nextTab === "dyn" ? "true" : "false");
    dynTab.setAttribute("tabindex", nextTab === "dyn" ? "0" : "-1");
  }
  if (eqPanel) {
    eqPanel.classList.toggle("is-hidden", nextTab !== "eq");
    eqPanel.hidden = nextTab !== "eq";
  }
  if (dynPanel) {
    dynPanel.classList.toggle("is-hidden", nextTab !== "dyn");
    dynPanel.hidden = nextTab !== "dyn";
  }
  renderFairlightRackCanvases();
}

function renderFairlightAudioRackUI() {
  const rack = normalizeFairlightAudioRackParams(state.fairlightRack);
  state.fairlightRack = rack;
  const compiled = compileFairlightAudioRackClient(rack);

  const badgeEl = byId("fairlight-rack-badge");
  if (badgeEl) {
    if (compiled.is_identity) {
      badgeEl.textContent = "BYPASS";
      badgeEl.className = "nle-tag mono";
    } else {
      const tags = [];
      if (rack.eq_enabled) tags.push(`EQ ${compiled.eq_band_summary}`);
      if (rack.compressor.enabled) tags.push(`COMP ${rack.compressor.threshold_db.toFixed(0)}dB`);
      if (rack.limiter.enabled) tags.push(`${rack.limiter.ceiling_db.toFixed(1)} dBTP`);
      badgeEl.textContent = tags.join(" | ");
      badgeEl.className = "nle-tag mono is-pass";
    }
  }

  const presetEl = byId("fairlight-rack-preset");
  if (presetEl) presetEl.value = rack.preset_id;

  const eqBtn = byId("btn-fairlight-eq-toggle");
  if (eqBtn) {
    eqBtn.classList.toggle("is-active", rack.eq_enabled);
    eqBtn.setAttribute("aria-pressed", rack.eq_enabled ? "true" : "false");
    eqBtn.textContent = rack.eq_enabled ? t("timeline.fairlightRack.eqOn") : t("timeline.fairlightRack.eqOff");
  }
  const hpfBtn = byId("btn-fairlight-hpf-toggle");
  if (hpfBtn) {
    hpfBtn.classList.toggle("is-active", rack.hpf_enabled);
    hpfBtn.setAttribute("aria-pressed", rack.hpf_enabled ? "true" : "false");
    hpfBtn.textContent = rack.hpf_enabled ? t("timeline.fairlightRack.hpfOn") : t("timeline.fairlightRack.hpfOff");
  }
  const hpfHzEl = byId("fairlight-hpf-hz");
  if (hpfHzEl && document.activeElement !== hpfHzEl) {
    hpfHzEl.value = String(Math.round(rack.hpf_hz));
  }

  // Band buttons & active band controls
  for (const band of rack.bands) {
    const btn = document.querySelector(`.fairlight-band-btn[data-eq-band="${band.band_id}"]`);
    if (btn) {
      const isSel = band.band_id === state.fairlightRackBandId;
      btn.classList.toggle("is-active", isSel);
      btn.setAttribute("aria-pressed", isSel ? "true" : "false");
      const spec = FAIRLIGHT_EQ_BAND_SPECS[band.band_id];
      const fLabel = band.freq_hz >= 1000 ? `${(band.freq_hz / 1000).toFixed(1)}k` : `${Math.round(band.freq_hz)}Hz`;
      btn.textContent = `${spec ? spec.shortLabel : band.band_id} ${fLabel}`;
    }
  }

  const activeBand =
    rack.bands.find((b) => b.band_id === state.fairlightRackBandId) || rack.bands[1];
  const activeSpec = FAIRLIGHT_EQ_BAND_SPECS[activeBand.band_id];
  const bandLabel = byId("fairlight-eq-band-label");
  if (bandLabel) {
    const typeLabel = activeBand.filter_type.toUpperCase();
    bandLabel.textContent = `${activeSpec ? activeSpec.shortLabel : activeBand.band_id} (${typeLabel})`;
  }
  const bandEnableBtn = byId("btn-fairlight-band-enable");
  if (bandEnableBtn) {
    bandEnableBtn.classList.toggle("is-active", activeBand.enabled);
    bandEnableBtn.setAttribute("aria-pressed", activeBand.enabled ? "true" : "false");
    bandEnableBtn.textContent = activeBand.enabled
      ? t("timeline.fairlightRack.bandOn")
      : t("timeline.fairlightRack.bandOff");
  }

  const freqRange = byId("fairlight-band-freq-range");
  const freqNum = byId("fairlight-band-freq-num");
  const freqStep = activeSpec.maxFreq >= 5000 ? "50" : "10";
  for (const el of [freqRange, freqNum]) {
    if (!el) continue;
    el.min = String(activeSpec.minFreq);
    el.max = String(activeSpec.maxFreq);
    el.step = freqStep;
  }
  if (freqRange) freqRange.value = String(Math.round(activeBand.freq_hz));
  if (freqNum && document.activeElement !== freqNum) freqNum.value = String(Math.round(activeBand.freq_hz));

  const gainRange = byId("fairlight-band-gain-range");
  const gainNum = byId("fairlight-band-gain-num");
  if (gainRange) gainRange.value = String(activeBand.gain_db);
  if (gainNum && document.activeElement !== gainNum) gainNum.value = activeBand.gain_db.toFixed(1);

  const qRange = byId("fairlight-band-q-range");
  const qNum = byId("fairlight-band-q-num");
  if (qRange) qRange.value = String(activeBand.q);
  if (qNum && document.activeElement !== qNum) qNum.value = activeBand.q.toFixed(1);

  // Dynamics & Limiter controls
  const compBtn = byId("btn-fairlight-comp-toggle");
  if (compBtn) {
    compBtn.classList.toggle("is-active", rack.compressor.enabled);
    compBtn.setAttribute("aria-pressed", rack.compressor.enabled ? "true" : "false");
    compBtn.textContent = rack.compressor.enabled
      ? t("timeline.fairlightRack.compOn")
      : t("timeline.fairlightRack.compOff");
  }
  const grBadge = byId("fairlight-comp-gr-badge");
  if (grBadge) {
    grBadge.textContent = `GR ${compiled.estimated_gr_db.toFixed(1)} dB`;
    grBadge.className =
      rack.compressor.enabled && compiled.estimated_gr_db < -0.1
        ? "nle-tag mono is-warn"
        : "nle-tag mono";
  }
  const threshRange = byId("fairlight-comp-thresh-range");
  const threshNum = byId("fairlight-comp-thresh-num");
  if (threshRange) threshRange.value = String(rack.compressor.threshold_db);
  if (threshNum && document.activeElement !== threshNum) threshNum.value = rack.compressor.threshold_db.toFixed(1);
  const ratioNum = byId("fairlight-comp-ratio-num");
  if (ratioNum && document.activeElement !== ratioNum) ratioNum.value = rack.compressor.ratio.toFixed(1);
  const atkNum = byId("fairlight-comp-attack-num");
  if (atkNum && document.activeElement !== atkNum) atkNum.value = rack.compressor.attack_ms.toFixed(1);
  const relNum = byId("fairlight-comp-release-num");
  if (relNum && document.activeElement !== relNum) relNum.value = String(Math.round(rack.compressor.release_ms));
  const makeupNum = byId("fairlight-comp-makeup-num");
  if (makeupNum && document.activeElement !== makeupNum) makeupNum.value = rack.compressor.makeup_db.toFixed(1);

  const limBtn = byId("btn-fairlight-lim-toggle");
  if (limBtn) {
    limBtn.classList.toggle("is-active", rack.limiter.enabled);
    limBtn.setAttribute("aria-pressed", rack.limiter.enabled ? "true" : "false");
    limBtn.textContent = rack.limiter.enabled
      ? t("timeline.fairlightRack.limOn")
      : t("timeline.fairlightRack.limOff");
  }
  const limBadge = byId("fairlight-lim-ceiling-badge");
  if (limBadge) {
    limBadge.textContent = `${rack.limiter.ceiling_db.toFixed(1)} dBTP`;
    limBadge.className = rack.limiter.enabled ? "nle-tag mono is-pass" : "nle-tag mono";
  }
  const limRange = byId("fairlight-lim-ceiling-range");
  const limNum = byId("fairlight-lim-ceiling-num");
  if (limRange) limRange.value = String(rack.limiter.ceiling_db);
  if (limNum && document.activeElement !== limNum) limNum.value = rack.limiter.ceiling_db.toFixed(1);

  const previewEl = byId("fairlight-rack-af-preview");
  if (previewEl) {
    previewEl.textContent = compiled.filtergraph
      ? `-af ${compiled.filtergraph}`
      : t("timeline.fairlightRack.bypassed");
  }

  syncDeliverTabIndicators();
  renderFairlightRackCanvases();
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
  const isoPill = byId("timeline-vu-iso-pill");
  const tpBadge = byId("timeline-vu-tp-badge");
  const lufsMEl = byId("timeline-vu-lufs-m");
  const lufsIEl = byId("timeline-vu-lufs-i");
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
  if (isoPill) {
    const showIso = Boolean((state.masterBus.voice_isolation || state.voiceCleanup.enabled) && !vm.allMuted);
    isoPill.classList.toggle("is-hidden", !showIso);
    if (showIso) {
      isoPill.className = "nle-tag mono is-pass";
    }
  }
  if (tpBadge) {
    if (vm.allMuted || vm.truePeakDbtp <= -59.5) {
      tpBadge.textContent = "-inf dBTP";
      tpBadge.className = "v";
    } else {
      tpBadge.textContent = `${vm.truePeakDbtp.toFixed(1)} dBTP`;
      tpBadge.className = vm.truePeakDbtp > -1.0 ? "v is-hot" : "v is-pass";
    }
  }
  if (lufsMEl) {
    lufsMEl.textContent =
      vm.allMuted || vm.momentaryLufs <= -69.5 ? "-inf LUFS" : `${vm.momentaryLufs.toFixed(1)} LUFS`;
  }
  if (lufsIEl) {
    lufsIEl.textContent =
      vm.allMuted || vm.integratedLufs <= -69.5 ? "-inf LUFS" : `${vm.integratedLufs.toFixed(1)} LUFS`;
  }
  for (const [code, lvlDb] of Object.entries(vm.trackLevels || {})) {
    const fill = document.querySelector(`[data-track-meter="${code}"]`);
    if (fill) {
      const pct = vm.allMuted || lvlDb <= -59.5 ? 0 : Math.min(100, Math.max(2, ((lvlDb + 60) / 60) * 100));
      fill.style.height = `${pct.toFixed(1)}%`;
    }
  }
  const masterFill = document.querySelector('[data-master-meter="M1"]');
  if (masterFill) {
    const mPct = vm.allMuted || peakDb <= -59.5 ? 0 : Math.min(100, Math.max(2, ((peakDb + 60) / 60) * 100));
    masterFill.style.height = `${mPct.toFixed(1)}%`;
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
    autoDuck: state.autoDuck,
    masterBus: state.masterBus,
    voiceCleanup: state.voiceCleanup,
    fairlightRack: state.fairlightRack
  });
  vm.allMuted = evalRes.allAudioMuted;
  vm.duckReductionDb = evalRes.duckReductionDb;
  vm.trackLevels = evalRes.trackLevels || {};
  vm.truePeakDbtp = evalRes.truePeakDbtp ?? -60;
  vm.momentaryLufs = evalRes.momentaryLufs ?? -70;
  if (isPlaying && !evalRes.allAudioMuted && vm.momentaryLufs > -69.5) {
    const linE = Math.pow(10, vm.momentaryLufs / 10);
    vm.lufsAccumSum = (vm.lufsAccumSum || 0) + linE;
    vm.lufsAccumCount = (vm.lufsAccumCount || 0) + 1;
    vm.integratedLufs = Number((10 * Math.log10(vm.lufsAccumSum / vm.lufsAccumCount)).toFixed(1));
  } else if (!isPlaying && vm.leftDb <= -59.5 && vm.rightDb <= -59.5) {
    vm.truePeakDbtp = -60;
    vm.momentaryLufs = -70;
  }

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

function renderTimelineRetimeRampCanvas() {
  const rampCanvas = byId("clip-retime-ramp-canvas");
  if (!rampCanvas) return;
  const info = getSelectedClipTrack();
  if (!info) {
    state.retimeRampGeom = drawRetimeRampEditorCanvas(rampCanvas, { hasClip: false });
    return;
  }
  const norm = normalizeClipRetime(info.clip);
  const clipDurFrames = Math.max(1, Number(info.clip.duration_frames || 1));
  const localFrame = state.playheadFrame - Number(info.clip.start_frame || 0);
  const playheadNorm =
    localFrame >= 0 && localFrame <= clipDurFrames ? localFrame / clipDurFrames : null;
  const clampedSel =
    state.retimeRampSelectedIdx >= 0 && state.retimeRampSelectedIdx < norm.rampPoints.length
      ? state.retimeRampSelectedIdx
      : -1;
  state.retimeRampGeom = drawRetimeRampEditorCanvas(rampCanvas, {
    hasClip: true,
    retimeNorm: norm,
    selectedPointIdx: clampedSel,
    playheadNorm
  });
}

function renderTimelineRetimeInspector() {
  const ctrlBox = byId("clip-retime-controls");
  const badge = byId("clip-retime-badge");
  const sendBtn = byId("btn-clip-retime-to-deliver");
  const speedRange = byId("clip-retime-speed-range");
  const speedNum = byId("clip-retime-speed-num");
  const rstBtn = byId("btn-clip-retime-reset");
  const revBtn = byId("btn-clip-retime-reverse");
  const procSel = byId("clip-retime-process");
  const durNote = byId("clip-retime-dur-note");
  const presetBtns = document.querySelectorAll(".retime-preset-btn");
  const rampPresetBtns = document.querySelectorAll(".retime-ramp-preset-btn");
  const rampBadge = byId("clip-retime-ramp-badge");
  const rampAddBtn = byId("btn-retime-point-add");
  const rampDelBtn = byId("btn-retime-point-del");
  const rampRstBtn = byId("btn-retime-ramp-reset");
  const rampReadout = byId("clip-retime-ramp-readout");

  if (!ctrlBox) return;

  const info = getSelectedClipTrack();
  const hasClip = Boolean(info);
  ctrlBox.classList.toggle("is-disabled", !hasClip);
  for (const el of [
    speedRange,
    speedNum,
    rstBtn,
    revBtn,
    procSel,
    sendBtn,
    rampAddBtn,
    rampRstBtn,
    ...presetBtns,
    ...rampPresetBtns
  ]) {
    if (el) el.disabled = !hasClip;
  }

  if (!info) {
    state.retimeRampSelectedIdx = -1;
    if (speedRange) speedRange.value = "1";
    if (speedNum && document.activeElement !== speedNum) speedNum.value = "1.00";
    if (procSel) procSel.value = "nearest";
    if (revBtn) {
      revBtn.classList.remove("is-active");
      revBtn.setAttribute("aria-pressed", "false");
    }
    for (const btn of presetBtns) {
      btn.classList.remove("is-active");
      btn.setAttribute("aria-pressed", "false");
    }
    for (const btn of rampPresetBtns) {
      btn.classList.remove("is-active");
      btn.setAttribute("aria-pressed", "false");
    }
    if (rampDelBtn) rampDelBtn.disabled = true;
    if (rampBadge) {
      rampBadge.textContent = "CONSTANT";
      rampBadge.className = "nle-tag mono";
    }
    if (rampReadout) rampReadout.textContent = "--";
    if (badge) {
      badge.textContent = "NO CLIP";
      badge.className = "nle-tag mono";
    }
    if (durNote) durNote.textContent = "--";
    renderTimelineRetimeRampCanvas();
    return;
  }

  const norm = normalizeClipRetime(info.clip);
  const hasRamp = norm.rampPoints.length >= 2;
  if (state.retimeRampSelectedIdx >= norm.rampPoints.length) {
    state.retimeRampSelectedIdx = norm.rampPoints.length > 0 ? norm.rampPoints.length - 1 : -1;
  }
  if (speedRange) speedRange.value = String(norm.speedRate);
  if (speedNum && document.activeElement !== speedNum) {
    speedNum.value = norm.speedRate.toFixed(2);
  }
  if (procSel) procSel.value = norm.retimeProcess;
  if (revBtn) {
    revBtn.classList.toggle("is-active", norm.reverse);
    revBtn.setAttribute("aria-pressed", norm.reverse ? "true" : "false");
  }
  for (const btn of presetBtns) {
    const presetVal = Number.parseFloat(btn.getAttribute("data-retime-preset") || "1");
    const isMatch = !hasRamp && Math.abs(presetVal - norm.speedRate) < 0.005;
    btn.classList.toggle("is-active", isMatch);
    btn.setAttribute("aria-pressed", isMatch ? "true" : "false");
  }
  for (const btn of rampPresetBtns) {
    const rpId = btn.getAttribute("data-retime-ramp-preset") || "constant";
    const isMatch = norm.rampPreset === rpId;
    btn.classList.toggle("is-active", isMatch);
    btn.setAttribute("aria-pressed", isMatch ? "true" : "false");
  }

  const fpsRate = getTimelineFps();
  const baseDurS = info.clip.duration_frames / fpsRate;
  const summary = computeRetimeRampSummary(
    {
      speed_rate: norm.speedRate,
      retime_ramp_preset: norm.rampPreset,
      retime_ramp_points: norm.rampPoints
    },
    baseDurS
  );
  const srcFramesUsed = Math.max(1, Math.round(info.clip.duration_frames * summary.avgSpeed));
  const srcDurS = srcFramesUsed / fpsRate;
  if (durNote) {
    durNote.textContent = hasRamp
      ? `${info.clip.duration_frames}f (${baseDurS.toFixed(2)}s) | AVG ${summary.avgSpeed.toFixed(2)}x | SRC ${srcFramesUsed}f`
      : `${info.clip.duration_frames}f (${baseDurS.toFixed(2)}s) | SRC ${srcFramesUsed}f (${srcDurS.toFixed(2)}s)`;
  }

  if (rampBadge) {
    if (hasRamp) {
      rampBadge.textContent = `${norm.rampPoints.length} PTS | ${formatRetimeSpeedValue(summary.minSpeed)}-${formatRetimeSpeedValue(summary.maxSpeed)}`;
      rampBadge.className = norm.retimeProcess === "optical_flow" ? "nle-tag is-blue mono" : "nle-tag is-active mono";
    } else if (norm.retimeProcess === "optical_flow") {
      rampBadge.textContent = "OPTICAL FLOW";
      rampBadge.className = "nle-tag is-blue mono";
    } else {
      rampBadge.textContent = "CONSTANT";
      rampBadge.className = "nle-tag mono";
    }
  }

  if (rampDelBtn) {
    const canDel =
      hasRamp &&
      norm.rampPoints.length > 2 &&
      state.retimeRampSelectedIdx >= 0 &&
      state.retimeRampSelectedIdx < norm.rampPoints.length;
    rampDelBtn.disabled = !canDel;
  }

  if (rampReadout) {
    if (hasRamp) {
      const selPt =
        state.retimeRampSelectedIdx >= 0 && state.retimeRampSelectedIdx < norm.rampPoints.length
          ? norm.rampPoints[state.retimeRampSelectedIdx]
          : null;
      const selText = selPt
        ? ` | Pt #${state.retimeRampSelectedIdx + 1}: ${Math.round(selPt.pos_norm * 100)}% @ ${selPt.speed_rate.toFixed(2)}x`
        : "";
      rampReadout.textContent = `${norm.rampPreset.toUpperCase()} (${summary.minSpeed.toFixed(2)}x..${summary.maxSpeed.toFixed(2)}x)${selText}`;
    } else {
      rampReadout.textContent = `${norm.speedRate.toFixed(2)}x flat (${norm.retimeProcess})`;
    }
  }

  if (badge) {
    const compiled = compileRetimeFilterClient({
      speed_rate: norm.speedRate,
      reverse: norm.reverse,
      retime_process: norm.retimeProcess,
      ramp_preset: norm.rampPreset,
      ramp_points: norm.rampPoints,
      clip_duration_s: Math.max(0.5, baseDurS),
      fps: String(Math.round(fpsRate))
    });
    if (compiled.is_identity) {
      badge.textContent = "1.0x NORMAL";
      badge.className = "nle-tag mono";
    } else {
      const parts = [];
      if (compiled.video_filtergraph) parts.push(compiled.video_filtergraph);
      if (compiled.audio_filtergraph) parts.push(compiled.audio_filtergraph);
      badge.textContent = parts.join(" | ");
      badge.className = norm.reverse
        ? "nle-tag mono is-warn"
        : norm.retimeProcess === "optical_flow"
          ? "nle-tag mono is-blue"
          : "nle-tag mono is-pass";
    }
  }
  renderTimelineRetimeRampCanvas();
}

function getSelectedClipLocalContext() {
  const doc = state.timelineDoc;
  const info = getSelectedClipTrack();
  if (!doc || !info || !info.clip || info.clip.media_type === "audio") return null;
  const fpsRate = doc.fps ? Math.max(1, doc.fps.num / Math.max(1, doc.fps.den)) : 25;
  const durS = Math.max(0.2, (info.clip.duration_frames || 0) / fpsRate);
  const rawLocalS = (state.playheadFrame - (info.clip.start_frame || 0)) / fpsRate;
  const localTimeS = Number(Math.max(0, Math.min(durS, rawLocalS)).toFixed(4));
  return { ...info, fpsRate, durS, localTimeS };
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
  const dveCropBadge = byId("clip-dve-crop-badge");
  const dveCropRstBtn = byId("btn-clip-dve-crop-reset");
  const cropLeftRange = byId("clip-dve-crop-left-range");
  const cropLeftNum = byId("clip-dve-crop-left-num");
  const cropRightRange = byId("clip-dve-crop-right-range");
  const cropRightNum = byId("clip-dve-crop-right-num");
  const cropTopRange = byId("clip-dve-crop-top-range");
  const cropTopNum = byId("clip-dve-crop-top-num");
  const cropBottomRange = byId("clip-dve-crop-bottom-range");
  const cropBottomNum = byId("clip-dve-crop-bottom-num");
  const borderWidthRange = byId("clip-dve-border-width-range");
  const borderWidthNum = byId("clip-dve-border-width-num");
  const borderColorInput = byId("clip-dve-border-color");
  const borderFeatherRange = byId("clip-dve-border-feather-range");
  const borderFeatherNum = byId("clip-dve-border-feather-num");
  const dveShadowBadge = byId("clip-dve-shadow-badge");
  const dveShadowRstBtn = byId("btn-clip-dve-shadow-reset");
  const shadowOpacityRange = byId("clip-dve-shadow-opacity-range");
  const shadowOpacityNum = byId("clip-dve-shadow-opacity-num");
  const shadowColorInput = byId("clip-dve-shadow-color");
  const shadowBlurRange = byId("clip-dve-shadow-blur-range");
  const shadowBlurNum = byId("clip-dve-shadow-blur-num");
  const shadowOffXRange = byId("clip-dve-shadow-offx-range");
  const shadowOffXNum = byId("clip-dve-shadow-offx-num");
  const shadowOffYRange = byId("clip-dve-shadow-offy-range");
  const shadowOffYNum = byId("clip-dve-shadow-offy-num");
  const presetBtns = document.querySelectorAll(".transform-preset-btn");
  const kfDiamondBtns = document.querySelectorAll(".kf-diamond-btn");
  const graphParamBtns = document.querySelectorAll(".transform-graph-param-btn");
  const graphModeBtns = document.querySelectorAll(".transform-graph-mode-btn");
  const bezierPresetBtns = document.querySelectorAll(".transform-bezier-btn");
  const kfPrevBtn = byId("btn-tf-kf-prev");
  const kfToggleBtn = byId("btn-tf-kf-toggle");
  const kfNextBtn = byId("btn-tf-kf-next");
  const kfClearBtn = byId("btn-tf-kf-clear");
  const bzX1 = byId("tf-bezier-x1");
  const bzY1 = byId("tf-bezier-y1");
  const bzX2 = byId("tf-bezier-x2");
  const bzY2 = byId("tf-bezier-y2");
  const kfReadout = byId("transform-kf-readout");
  const graphCanvas = byId("transform-graph-canvas");

  if (!ctrlBox) return;

  const info = getSelectedClipTrack();
  const ctx = getSelectedClipLocalContext();
  const hasVideoClip = Boolean(ctx);
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
    dveCropRstBtn,
    cropLeftRange,
    cropLeftNum,
    cropRightRange,
    cropRightNum,
    cropTopRange,
    cropTopNum,
    cropBottomRange,
    cropBottomNum,
    borderWidthRange,
    borderWidthNum,
    borderColorInput,
    borderFeatherRange,
    borderFeatherNum,
    dveShadowRstBtn,
    shadowOpacityRange,
    shadowOpacityNum,
    shadowColorInput,
    shadowBlurRange,
    shadowBlurNum,
    shadowOffXRange,
    shadowOffXNum,
    shadowOffYRange,
    shadowOffYNum,
    kfPrevBtn,
    kfToggleBtn,
    kfNextBtn,
    kfClearBtn,
    bzX1,
    bzY1,
    bzX2,
    bzY2,
    ...presetBtns,
    ...kfDiamondBtns,
    ...graphParamBtns,
    ...graphModeBtns,
    ...bezierPresetBtns
  ]) {
    if (el) el.disabled = !hasVideoClip;
  }

  for (const modeBtn of graphModeBtns) {
    const isMode = (modeBtn.getAttribute("data-tf-graph-mode") || "value") === state.tfGraphMode;
    modeBtn.classList.toggle("is-active", isMode);
    modeBtn.setAttribute("aria-pressed", isMode ? "true" : "false");
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
    for (const [rEl, nEl, defVal] of [
      [cropLeftRange, cropLeftNum, TRANSFORM_CROP_DEFAULT],
      [cropRightRange, cropRightNum, TRANSFORM_CROP_DEFAULT],
      [cropTopRange, cropTopNum, TRANSFORM_CROP_DEFAULT],
      [cropBottomRange, cropBottomNum, TRANSFORM_CROP_DEFAULT],
      [borderWidthRange, borderWidthNum, TRANSFORM_BORDER_WIDTH_DEFAULT],
      [borderFeatherRange, borderFeatherNum, TRANSFORM_BORDER_FEATHER_DEFAULT],
      [shadowOpacityRange, shadowOpacityNum, TRANSFORM_SHADOW_OPACITY_DEFAULT],
      [shadowBlurRange, shadowBlurNum, TRANSFORM_SHADOW_BLUR_DEFAULT],
      [shadowOffXRange, shadowOffXNum, TRANSFORM_SHADOW_OFFSET_X_DEFAULT],
      [shadowOffYRange, shadowOffYNum, TRANSFORM_SHADOW_OFFSET_Y_DEFAULT]
    ]) {
      if (rEl) rEl.value = String(defVal);
      if (nEl && document.activeElement !== nEl) nEl.value = defVal.toFixed(1);
    }
    if (borderColorInput) borderColorInput.value = TRANSFORM_BORDER_COLOR_DEFAULT;
    if (shadowColorInput) shadowColorInput.value = TRANSFORM_SHADOW_COLOR_DEFAULT;
    if (dveCropBadge) {
      dveCropBadge.textContent = "OFF";
      dveCropBadge.className = "nle-tag mono";
    }
    if (dveShadowBadge) {
      dveShadowBadge.textContent = "OFF";
      dveShadowBadge.className = "nle-tag mono";
    }
    for (const btn of presetBtns) {
      btn.classList.remove("is-active");
      btn.setAttribute("aria-pressed", "false");
    }
    for (const dBtn of kfDiamondBtns) {
      dBtn.classList.remove("is-active", "has-keyframes");
      dBtn.setAttribute("aria-pressed", "false");
    }
    for (const pBtn of graphParamBtns) {
      const activeP = (pBtn.getAttribute("data-tf-graph-param") || "") === state.tfGraphParam;
      pBtn.classList.toggle("is-active", activeP);
      pBtn.classList.remove("has-keyframes");
      pBtn.setAttribute("aria-pressed", activeP ? "true" : "false");
    }
    if (kfReadout) kfReadout.textContent = "0 KF";
    if (graphCanvas) {
      state.tfGraphDrawMeta = drawTransformGraphCanvas(
        graphCanvas,
        null,
        state.tfGraphParam,
        5.0,
        0.0,
        { mode: state.tfGraphMode, selectedKfIdx: -1 }
      );
    }
    if (badge) {
      badge.textContent = info ? "AUDIO ONLY" : "NO CLIP";
      badge.className = "nle-tag mono";
    }
    return;
  }

  const norm = normalizeClipTransform(ctx.clip);
  const evalTf = evaluateClipTransformAtTime(norm, ctx.localTimeS);
  if (zoomRange) zoomRange.value = String(evalTf.zoom_pct);
  if (zoomNum && document.activeElement !== zoomNum) zoomNum.value = evalTf.zoom_pct.toFixed(1);
  if (posXRange) posXRange.value = String(evalTf.pos_x_pct);
  if (posXNum && document.activeElement !== posXNum) posXNum.value = evalTf.pos_x_pct.toFixed(1);
  if (posYRange) posYRange.value = String(evalTf.pos_y_pct);
  if (posYNum && document.activeElement !== posYNum) posYNum.value = evalTf.pos_y_pct.toFixed(1);
  if (rotRange) rotRange.value = String(evalTf.rotation_deg);
  if (rotNum && document.activeElement !== rotNum) rotNum.value = evalTf.rotation_deg.toFixed(1);
  if (opRange) opRange.value = String(evalTf.opacity_pct);
  if (opNum && document.activeElement !== opNum) opNum.value = evalTf.opacity_pct.toFixed(1);
  if (dzSel) dzSel.value = norm.dynamic_zoom || DYNAMIC_ZOOM_DEFAULT;
  for (const [rEl, nEl, curVal] of [
    [cropLeftRange, cropLeftNum, norm.crop_left_pct],
    [cropRightRange, cropRightNum, norm.crop_right_pct],
    [cropTopRange, cropTopNum, norm.crop_top_pct],
    [cropBottomRange, cropBottomNum, norm.crop_bottom_pct],
    [borderWidthRange, borderWidthNum, norm.border_width_px],
    [borderFeatherRange, borderFeatherNum, norm.border_feather_px],
    [shadowOpacityRange, shadowOpacityNum, norm.shadow_opacity_pct],
    [shadowBlurRange, shadowBlurNum, norm.shadow_blur_px],
    [shadowOffXRange, shadowOffXNum, norm.shadow_offset_x_px],
    [shadowOffYRange, shadowOffYNum, norm.shadow_offset_y_px]
  ]) {
    if (rEl) rEl.value = String(curVal);
    if (nEl && document.activeElement !== nEl) nEl.value = Number(curVal).toFixed(1);
  }
  if (borderColorInput && document.activeElement !== borderColorInput) {
    borderColorInput.value = norm.border_color || TRANSFORM_BORDER_COLOR_DEFAULT;
  }
  if (shadowColorInput && document.activeElement !== shadowColorInput) {
    shadowColorInput.value = norm.shadow_color || TRANSFORM_SHADOW_COLOR_DEFAULT;
  }
  const hasCrop = hasClipDveCrop(norm);
  const hasBdrFth = hasClipDveBorderOrFeather(norm);
  if (dveCropBadge) {
    const cParts = [];
    if (hasCrop) cParts.push("CROP");
    if (norm.border_width_px >= 0.5) cParts.push(`${Math.round(norm.border_width_px)}px`);
    if (norm.border_feather_px >= 1.0) cParts.push(`F${Math.round(norm.border_feather_px)}`);
    dveCropBadge.textContent = cParts.length > 0 ? cParts.join(" | ") : "OFF";
    dveCropBadge.className = hasCrop || hasBdrFth ? "nle-tag mono is-active" : "nle-tag mono";
  }
  if (dveCropRstBtn) dveCropRstBtn.disabled = !(hasCrop || hasBdrFth);
  const hasShadow = hasClipDveDropShadow(norm);
  if (dveShadowBadge) {
    dveShadowBadge.textContent = hasShadow
      ? `${Math.round(norm.shadow_opacity_pct)}% | ${Math.round(norm.shadow_blur_px)}px`
      : "OFF";
    dveShadowBadge.className = hasShadow ? "nle-tag mono is-active" : "nle-tag mono";
  }
  if (dveShadowRstBtn) dveShadowRstBtn.disabled = !hasShadow;

  for (const dBtn of kfDiamondBtns) {
    const param = dBtn.getAttribute("data-kf-param") || "";
    const lane = norm.keyframes[param] || [];
    const atPlayhead = lane.some((kf) => Math.abs(kf.time_s - ctx.localTimeS) <= 0.02);
    dBtn.classList.toggle("has-keyframes", lane.length > 0);
    dBtn.classList.toggle("is-active", atPlayhead);
    dBtn.setAttribute("aria-pressed", atPlayhead ? "true" : "false");
  }

  for (const pBtn of graphParamBtns) {
    const param = pBtn.getAttribute("data-tf-graph-param") || "";
    const lane = norm.keyframes[param] || [];
    const activeP = param === state.tfGraphParam;
    pBtn.classList.toggle("is-active", activeP);
    pBtn.classList.toggle("has-keyframes", lane.length > 0);
    pBtn.setAttribute("aria-pressed", activeP ? "true" : "false");
  }

  const activeLane = norm.keyframes[state.tfGraphParam] || [];
  if (activeLane.length === 0) {
    state.tfGraphSelectedKfIdx = -1;
  } else {
    const nearIdx = activeLane.findIndex((k) => Math.abs(k.time_s - ctx.localTimeS) <= 0.02);
    if (nearIdx >= 0) {
      state.tfGraphSelectedKfIdx = nearIdx;
    } else if (state.tfGraphSelectedKfIdx < 0 || state.tfGraphSelectedKfIdx >= activeLane.length) {
      state.tfGraphSelectedKfIdx = 0;
    }
  }

  const selKf =
    state.tfGraphSelectedKfIdx >= 0 && state.tfGraphSelectedKfIdx < activeLane.length
      ? activeLane[state.tfGraphSelectedKfIdx]
      : null;
  const activeBezier = selKf
    ? resolveTransformKeyframeBezier(selKf)
    : [...TRANSFORM_BEZIER_PRESETS.ease_in_out];
  const activeEasing = selKf ? selKf.easing : "ease_in_out";
  for (const bBtn of bezierPresetBtns) {
    const pId = bBtn.getAttribute("data-tf-bezier-preset") || "";
    const presetArr = TRANSFORM_BEZIER_PRESETS[pId];
    const isMatch = Boolean(
      selKf
        ? activeEasing === pId ||
            (presetArr &&
              presetArr.every((v, idx) => Math.abs(v - activeBezier[idx]) < 0.015))
        : pId === "ease_in_out"
    );
    bBtn.classList.toggle("is-active", isMatch);
    bBtn.setAttribute("aria-pressed", isMatch ? "true" : "false");
    bBtn.disabled = activeLane.length === 0;
  }
  const bzDisabled = activeLane.length === 0;
  for (const [el, val] of [
    [bzX1, activeBezier[0]],
    [bzY1, activeBezier[1]],
    [bzX2, activeBezier[2]],
    [bzY2, activeBezier[3]]
  ]) {
    if (el) {
      el.disabled = bzDisabled;
      if (document.activeElement !== el) el.value = String(Number(val.toFixed(2)));
    }
  }

  const hasAtCurrent = activeLane.some((k) => Math.abs(k.time_s - ctx.localTimeS) <= 0.02);
  if (kfToggleBtn) {
    kfToggleBtn.textContent = hasAtCurrent
      ? t("timeline.transform.kfDel")
      : t("timeline.transform.kfAdd");
    kfToggleBtn.classList.toggle("is-active", hasAtCurrent);
  }
  if (kfPrevBtn) kfPrevBtn.disabled = activeLane.length === 0;
  if (kfNextBtn) kfNextBtn.disabled = activeLane.length === 0;
  if (kfClearBtn) kfClearBtn.disabled = activeLane.length === 0;

  if (kfReadout) {
    const totalKf = getTransformKeyframeCount(norm);
    const paramMeta = TRANSFORM_PARAM_BOUNDS[state.tfGraphParam] || TRANSFORM_PARAM_BOUNDS.zoom_pct;
    if (selKf) {
      const bzStr = activeBezier.map((v) => v.toFixed(2)).join(",");
      kfReadout.textContent =
        `${paramMeta.label} KF ${state.tfGraphSelectedKfIdx + 1}/${activeLane.length}` +
        ` @ ${selKf.time_s.toFixed(2)}s (${selKf.value.toFixed(1)}${paramMeta.unit})` +
        ` | bezier(${bzStr}) | ${totalKf}KF`;
    } else {
      kfReadout.textContent =
        `${paramMeta.label}: 0 KF @ t=${ctx.localTimeS.toFixed(2)}s` +
        ` | ${totalKf}KF total`;
    }
  }

  if (graphCanvas) {
    state.tfGraphDrawMeta = drawTransformGraphCanvas(
      graphCanvas,
      norm,
      state.tfGraphParam,
      ctx.durS,
      ctx.localTimeS,
      { mode: state.tfGraphMode, selectedKfIdx: state.tfGraphSelectedKfIdx }
    );
  }

  for (const btn of presetBtns) {
    const pid = btn.getAttribute("data-transform-preset") || "";
    const preset = getTransformPresetClient(pid);
    const isMatch = Boolean(
      preset &&
        !hasTransformKeyframes(norm) &&
        Math.abs(preset.zoom_pct - norm.zoom_pct) < 0.1 &&
        Math.abs(preset.pos_x_pct - norm.pos_x_pct) < 0.1 &&
        Math.abs(preset.pos_y_pct - norm.pos_y_pct) < 0.1 &&
        Math.abs(preset.rotation_deg - norm.rotation_deg) < 0.1 &&
        Math.abs(preset.opacity_pct - norm.opacity_pct) < 0.1 &&
        Math.abs((preset.crop_left_pct || 0) - norm.crop_left_pct) < 0.1 &&
        Math.abs((preset.crop_right_pct || 0) - norm.crop_right_pct) < 0.1 &&
        Math.abs((preset.crop_top_pct || 0) - norm.crop_top_pct) < 0.1 &&
        Math.abs((preset.crop_bottom_pct || 0) - norm.crop_bottom_pct) < 0.1 &&
        Math.abs((preset.border_width_px || 0) - norm.border_width_px) < 0.1 &&
        Math.abs((preset.border_feather_px || 0) - norm.border_feather_px) < 0.1 &&
        Math.abs((preset.shadow_opacity_pct || 0) - norm.shadow_opacity_pct) < 0.1 &&
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

function renderTimelineClipLabelInspector() {
  const group = byId("clip-label-color-group");
  const badge = byId("clip-label-color-badge");
  if (!group) return;
  const info = getSelectedClipTrack();
  const hasClip = Boolean(info && info.clip);
  group.classList.toggle("is-disabled", !hasClip);
  const activeColor = hasClip ? normalizeClipLabelColor(info.clip.label_color) : "default";
  if (badge) {
    badge.textContent = hasClip
      ? t(`timeline.clipLabel.${activeColor}`)
      : t("timeline.clipLabel.noneSelected");
  }
  for (const btn of group.querySelectorAll("[data-clip-label-color]")) {
    const colorId = btn.getAttribute("data-clip-label-color");
    const isSel = hasClip && colorId === activeColor;
    btn.disabled = !hasClip;
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
    renderTimelineClipLabelInspector();
    renderTimelineEditNudgeInspector();
    renderTimelineMarkerInspector();
    renderTimelineTransformInspector();
    renderTimelineAudioInspector();
    renderTimelineRetimeInspector();
    renderTimelineTransitionInspector();
    syncTimelineIndexSelection();
    return;
  }
  if (sel.kind === "clip" || sel.kind === "transition") {
    const c = sel.data;
    const norm = normalizeClipAudio(c);
    const retimeNorm = normalizeClipRetime(c);
    const transformNorm = normalizeClipTransform(c);
    const transNorm = normalizeClipTransition(c);
    const labelColorId = normalizeClipLabelColor(c.label_color);
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
      ["Label", t(`timeline.clipLabel.${labelColorId}`)],
      ["Track", `${c.media_type === "audio" ? "A" : "V"}${c.track_index}`],
      ["Range", `${c.start_frame}f .. ${c.start_frame + c.duration_frames}f (${c.duration_frames}f)`],
      ["Transform", transformLabel],
      ["Retime", retimeLabel],
      ["Transition", transLabel],
      ["Audio", `${gainLabel} | ${fadeLabel}`],
      ["Source In", `${c.source_in_frame}f (${srcFps})`],
      ["Source Path", c.source_path || t("common.none")]
    ]);
    renderTimelineClipLabelInspector();
    renderTimelineEditNudgeInspector();
    renderTimelineMarkerInspector();
    renderTimelineTransformInspector();
    renderTimelineAudioInspector();
    renderTimelineRetimeInspector();
    renderTimelineTransitionInspector();
    syncTimelineIndexSelection();
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
  renderTimelineClipLabelInspector();
  renderTimelineMarkerInspector();
  renderTimelineTransformInspector();
  renderTimelineAudioInspector();
  renderTimelineRetimeInspector();
  renderTimelineTransitionInspector();
  syncTimelineIndexSelection();
}

function getSelectedTimelineClipId() {
  const info = getSelectedClipTrack();
  if (!info || !info.clip) return null;
  return info.clip.id != null && String(info.clip.id) !== ""
    ? String(info.clip.id)
    : `${info.ref.trackKind}:${info.ref.trackIndex}:${info.ref.clipIndex}`;
}

function syncTimelineIndexSelection() {
  const list = byId("timeline-index-list");
  if (!list) return;
  const selectedId = getSelectedTimelineClipId();
  for (const row of list.querySelectorAll("[data-index-clip-id]")) {
    const isSel = Boolean(selectedId && row.getAttribute("data-index-clip-id") === selectedId);
    row.classList.toggle("is-selected", isSel);
    if (isSel) {
      row.setAttribute("aria-current", "true");
    } else {
      row.removeAttribute("aria-current");
    }
  }
  const pool = byId("media-pool-list");
  if (pool) {
    for (const card of pool.querySelectorAll("[data-pool-clip-id]")) {
      const isSel = Boolean(selectedId && card.getAttribute("data-pool-clip-id") === selectedId);
      card.classList.toggle("is-selected", isSel);
    }
  }
  if (selectedId) {
    state.mediaPoolActiveClipId = selectedId;
  }
  if (state.timelineDoc && state.mediaPoolType !== "stills") {
    updateMasterBinCutToolbar();
  }
  if (state.mediaPoolSourceTape) {
    syncSourceTapeScrubToPlayhead();
  }
}

const MEDIA_POOL_PALETTES = {
  blue: { a: "#1b355e", b: "#10203a", accent: "#4c8dff" },
  teal: { a: "#14413f", b: "#0d2626", accent: "#2dd4bf" },
  amber: { a: "#4a2e10", b: "#261708", accent: "#f59e0b" },
  rose: { a: "#4d1a28", b: "#270d14", accent: "#f43f5e" },
  emerald: { a: "#153d2e", b: "#0d241b", accent: "#34d399" }
};

function hashClipSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function computeClipThumbPalette(entry) {
  const colorId = entry.labelColor && entry.labelColor !== "default" ? entry.labelColor : null;
  if (colorId && MEDIA_POOL_PALETTES[colorId]) {
    const pal = MEDIA_POOL_PALETTES[colorId];
    const seed = hashClipSeed(`${entry.id}:${entry.label}:${entry.trackId}`);
    return { ...pal, seed, angle: 118 + (seed % 44) };
  }
  const seed = hashClipSeed(`${entry.id}:${entry.label}:${entry.trackId}`);
  const isAudio = entry.trackKind === "audio";
  const hue = isAudio ? 148 + (seed % 34) : 204 + (seed % 56);
  return {
    a: `hsl(${hue} 38% 24%)`,
    b: `hsl(${(hue + 14) % 360} 34% 13%)`,
    accent: `hsl(${hue} 62% 58%)`,
    seed,
    angle: 118 + (seed % 44)
  };
}

function openMediaPoolInfoDialog(entry) {
  const doc = state.timelineDoc;
  if (!doc || !entry) return;
  selectClipFromTimelineIndex(entry);
  state.mediaPoolInfoEntry = entry;

  const dlg = byId("media-pool-info-dialog");
  if (!dlg) return;

  const fpsNum = Number(doc.fps && doc.fps.num ? doc.fps.num : 25);
  const fpsDen = Number(doc.fps && doc.fps.den ? doc.fps.den : 1);
  const fpsFloat = Math.max(1, fpsNum / Math.max(1, fpsDen));
  const found = findTrackAndClip(doc, entry.trackKind, entry.trackIndex, entry.clipIndex);
  const clip = found ? found.clip : null;

  const startFrames = entry.startFrames || 0;
  const durFrames = entry.durationFrames || 0;
  const endFrames = startFrames + durFrames;
  const durSec = (durFrames / fpsFloat).toFixed(2);
  const endTc = framesToSmpte(endFrames, fpsNum, fpsDen);
  const labelColorId = entry.labelColor || "default";
  const kindText = entry.trackKind === "audio" ? "Audio" : "Video";

  const titleEl = byId("media-pool-info-title");
  if (titleEl) titleEl.textContent = entry.label || entry.id;
  const subEl = byId("media-pool-info-subtitle");
  if (subEl) subEl.textContent = `${entry.trackId} (${kindText}) | ${durSec}s (${durFrames}f)`;
  const badgeEl = byId("media-pool-info-badge");
  if (badgeEl) badgeEl.textContent = t(`timeline.clipLabel.${labelColorId}`);

  const kvEl = byId("media-pool-info-kv");
  if (kvEl) {
    const sourceText =
      clip && (clip.media_path || clip.source_url)
        ? String(clip.media_path || clip.source_url)
        : entry.label;
    const gainDb = clip && Number.isFinite(Number(clip.audio_gain_db)) ? Number(clip.audio_gain_db) : 0;
    const speed = clip && Number.isFinite(Number(clip.speed)) ? Number(clip.speed) : 1;
    const inspectorText = `Gain ${gainDb.toFixed(1)} dB | Speed ${speed.toFixed(2)}x`;
    const rows = [
      [t("timeline.mediapool.field.track"), `${entry.trackId} (${kindText})`],
      [t("timeline.mediapool.field.color"), t(`timeline.clipLabel.${labelColorId}`)],
      [t("timeline.mediapool.field.start"), `${entry.startTimecode} (${startFrames}f)`],
      [t("timeline.mediapool.field.duration"), `${durSec}s (${durFrames}f)`],
      [t("timeline.mediapool.field.end"), `${endTc} (${endFrames}f)`],
      [t("timeline.mediapool.field.format"), `${doc.width || 1920}x${doc.height || 1080} @ ${fpsFloat.toFixed(2)} fps`],
      [t("timeline.mediapool.field.source"), sourceText],
      [t("timeline.mediapool.field.inspector"), inspectorText]
    ];
    const children = [];
    for (const [k, v] of rows) {
      children.push(dom("span", "kv-key", k));
      children.push(dom("span", "kv-val", v));
    }
    kvEl.replaceChildren(...children);
  }

  if (!dlg.open) {
    if (typeof dlg.showModal === "function") {
      dlg.showModal();
    } else {
      dlg.setAttribute("open", "");
    }
  }
}

function closeMediaPoolInfoDialog() {
  const dlg = byId("media-pool-info-dialog");
  if (!dlg || !dlg.open) return;
  if (typeof dlg.close === "function") {
    dlg.close();
  } else {
    dlg.removeAttribute("open");
  }
}

function getActiveMediaPoolEntry(clipEntries = null) {
  const doc = state.timelineDoc;
  if (!doc) return null;
  const poolEntries = Array.isArray(clipEntries)
    ? clipEntries
    : filterMediaPoolEntries(doc, {
        mediaType: state.mediaPoolType === "stills" ? "all" : state.mediaPoolType,
        stills: state.stillsGallery
      }).clipItems;
  if (poolEntries.length === 0) return null;
  const selectedId = getSelectedTimelineClipId();
  if (selectedId) {
    const selMatch = poolEntries.find((e) => e.id === selectedId);
    if (selMatch) return selMatch;
  }
  if (state.mediaPoolActiveClipId) {
    const activeMatch = poolEntries.find((e) => e.id === state.mediaPoolActiveClipId);
    if (activeMatch) return activeMatch;
  }
  return poolEntries[0];
}

function updateMasterBinCutToolbar(clipEntries) {
  const targetEl = byId("media-pool-active-target");
  const smartBtn = byId("btn-pool-smart-insert");
  const phBtn = byId("btn-pool-insert-playhead");
  const appendBtn = byId("btn-pool-append");
  const active = state.mediaPoolType === "stills" ? null : getActiveMediaPoolEntry(clipEntries);
  const disabled = !state.timelineDoc || !active;
  if (targetEl) {
    targetEl.textContent = active ? `${active.label} -> ${active.trackId}` : "--";
    targetEl.title = active ? `${active.label} (${active.trackId})` : "";
  }
  if (smartBtn) smartBtn.disabled = disabled;
  if (phBtn) phBtn.disabled = disabled;
  if (appendBtn) appendBtn.disabled = disabled;
}

function applyMasterBinEdit(mode) {
  const doc = state.timelineDoc;
  if (!doc) return false;
  const entry = getActiveMediaPoolEntry();
  if (!entry) return false;

  let res;
  if (mode === "append") {
    res = appendClipToTrackInDocument(doc, entry);
  } else if (mode === "smart_insert") {
    res = smartInsertClipInDocument(doc, entry, state.playheadFrame);
  } else {
    res = insertClipAtFrameInDocument(doc, entry, state.playheadFrame, { ripple: true });
  }
  if (!res || !res.changed || !res.insertedClip) return false;

  const trackLabel = `${res.trackKind === "audio" ? "A" : "V"}${res.trackIndex}`;
  const fps = Math.max(1, doc.fps ? doc.fps.num / Math.max(1, doc.fps.den) : 25);
  const tc = framesToSmpte(res.insertFrame, doc.fps ? doc.fps.num : 25, doc.fps ? doc.fps.den : 1);
  if (mode === "append") {
    commitTimelineMutation(res.doc, state.timelineSelected);
    state.mediaPoolActiveClipId = res.insertedClip.id;
    showBanner(
      t("timeline.mediapool.bannerAppended")
        .replace("{name}", res.insertedClip.name)
        .replace("{track}", trackLabel)
        .replace("{tc}", tc),
      "success"
    );
  } else {
    commitTimelineMutation(res.doc, { kind: "clip", data: res.insertedClip });
    state.mediaPoolActiveClipId = res.insertedClip.id;
    const key =
      mode === "smart_insert"
        ? "timeline.mediapool.bannerSmartInserted"
        : "timeline.mediapool.bannerInserted";
    showBanner(
      t(key)
        .replace("{name}", res.insertedClip.name)
        .replace("{track}", trackLabel)
        .replace("{tc}", tc),
      "success"
    );
  }
  void fps;
  return true;
}

function syncSourceTapeScrubToPlayhead() {
  const tape = state.sourceTapeState;
  const scrubEl = byId("source-tape-scrub");
  const readoutEl = byId("source-tape-readout");
  const tcEl = byId("source-tape-tc");
  const segHost = byId("source-tape-segments");
  if (!tape || !tape.segments || tape.segments.length === 0) return;

  const selectedId = getSelectedTimelineClipId() || state.mediaPoolActiveClipId;
  let activeSeg =
    tape.segments.find(
      (s) =>
        state.playheadFrame >= s.entry.startFrames &&
        state.playheadFrame < s.entry.startFrames + s.durationFrames
    ) ||
    tape.segments.find((s) => s.entry.id === selectedId) ||
    tape.segments[0];

  const offsetInClip = Math.max(
    0,
    Math.min(activeSeg.durationFrames - 1, state.playheadFrame - activeSeg.entry.startFrames)
  );
  const tapeFrame = activeSeg.tapeStartFrame + offsetInClip;
  if (scrubEl && document.activeElement !== scrubEl) {
    scrubEl.value = String(tapeFrame);
  }
  if (readoutEl) {
    readoutEl.textContent = `${activeSeg.entry.label} (${activeSeg.entry.trackId})`;
  }
  if (tcEl) {
    const doc = state.timelineDoc;
    const fpsNum = doc && doc.fps ? doc.fps.num : 25;
    const fpsDen = doc && doc.fps ? doc.fps.den : 1;
    tcEl.textContent = `${framesToSmpte(tapeFrame, fpsNum, fpsDen)} / ${tape.totalTimecode}`;
  }
  if (segHost) {
    for (const segBtn of segHost.querySelectorAll("[data-tape-clip-id]")) {
      const isAct = segBtn.getAttribute("data-tape-clip-id") === activeSeg.entry.id;
      segBtn.classList.toggle("is-active", isAct);
    }
  }
}

function renderMediaPoolSourceTape(clipEntries) {
  const host = byId("media-pool-source-tape");
  const tapeBtn = byId("btn-media-pool-source-tape");
  if (tapeBtn) {
    tapeBtn.classList.toggle("is-active", Boolean(state.mediaPoolSourceTape));
    tapeBtn.setAttribute("aria-pressed", state.mediaPoolSourceTape ? "true" : "false");
  }
  if (!host) return;
  const doc = state.timelineDoc;
  if (!state.mediaPoolSourceTape || !doc || !Array.isArray(clipEntries) || clipEntries.length === 0) {
    state.sourceTapeState = null;
    host.classList.add("is-hidden");
    return;
  }
  host.classList.remove("is-hidden");
  const tape = buildSourceTapeSegments(clipEntries, doc.fps || 25);
  state.sourceTapeState = tape;

  const scrubEl = byId("source-tape-scrub");
  if (scrubEl) {
    scrubEl.min = "0";
    scrubEl.max = String(Math.max(0, tape.totalFrames - 1));
  }

  const segHost = byId("source-tape-segments");
  if (segHost) {
    const segButtons = tape.segments.map((seg) => {
      const pal = computeClipThumbPalette(seg.entry);
      const btn = dom("button", "source-tape-segment");
      btn.type = "button";
      btn.setAttribute("role", "listitem");
      btn.setAttribute("data-tape-clip-id", seg.entry.id);
      btn.style.flexGrow = String(Math.max(1, seg.durationFrames));
      btn.style.setProperty("--tape-accent", pal.accent);
      btn.title = `${seg.entry.label} (${seg.entry.trackId} | ${seg.tapeStartTc} - ${seg.tapeEndTc})`;
      btn.setAttribute("aria-label", `${seg.entry.label} (${seg.entry.trackId})`);
      btn.addEventListener("click", () => {
        state.mediaPoolActiveClipId = seg.entry.id;
        selectClipFromTimelineIndex(seg.entry);
        syncSourceTapeScrubToPlayhead();
      });
      return btn;
    });
    segHost.replaceChildren(...segButtons);
  }
  syncSourceTapeScrubToPlayhead();
}

function renderMediaPool() {
  const list = byId("media-pool-list");
  if (!list) return;
  const countEl = byId("media-pool-count");
  const typeGroup = byId("media-pool-type-filter");
  if (typeGroup) {
    for (const pill of typeGroup.querySelectorAll("[data-pool-type]")) {
      const kind = pill.getAttribute("data-pool-type") || "all";
      const isAct = kind === state.mediaPoolType;
      pill.classList.toggle("is-active", isAct);
      pill.setAttribute("aria-pressed", isAct ? "true" : "false");
    }
  }

  const doc = state.timelineDoc;
  if (!doc && state.mediaPoolType !== "stills") {
    if (countEl) countEl.textContent = "0 CLIPS";
    list.replaceChildren(dom("div", "timeline-index-empty mono", t("timeline.mediapool.empty")));
    renderMediaPoolSourceTape([]);
    updateMasterBinCutToolbar([]);
    return;
  }

  const poolResult = filterMediaPoolEntries(doc, {
    mediaType: state.mediaPoolType,
    stills: state.stillsGallery
  });

  if (countEl) {
    if (poolResult.activeType === "stills") {
      const n = poolResult.stillItems.length;
      countEl.textContent = `${n} ${n === 1 ? "STILL" : "STILLS"}`;
    } else if (poolResult.activeType === "all") {
      const n = poolResult.clipItems.length;
      countEl.textContent = `${n} ${n === 1 ? "CLIP" : "CLIPS"}`;
    } else {
      countEl.textContent = `${poolResult.clipItems.length} / ${poolResult.totalClipCount}`;
    }
  }

  if (poolResult.activeType === "stills") {
    renderMediaPoolSourceTape([]);
    updateMasterBinCutToolbar([]);
    if (poolResult.stillItems.length === 0) {
      list.replaceChildren(dom("div", "timeline-index-empty mono", t("timeline.mediapool.emptyStills")));
      return;
    }
    const stillCards = poolResult.stillItems.map((still) => {
      const safeUrl = sanitizeStillDataUrl(still.dataUrl);
      const card = dom("button", "media-pool-card is-still");
      card.type = "button";
      card.setAttribute("role", "listitem");
      card.setAttribute("data-pool-still-id", still.id);
      card.title = `${still.filename} (${still.preset || still.label})`;

      const thumb = dom("div", "media-pool-thumb is-still-thumb");
      const thumbTop = dom("div", "media-pool-thumb-top");
      thumbTop.appendChild(dom("span", "media-pool-track mono", "STILL"));
      thumbTop.appendChild(dom("span", "media-pool-dur mono", still.source === "fx" ? "FX" : "CLR"));

      const visual = dom("div", "media-pool-visual is-still");
      if (safeUrl) {
        const img = document.createElement("img");
        img.className = "media-pool-still-img";
        img.src = safeUrl;
        img.alt = `${still.label} ${still.preset || ""}`.trim();
        img.loading = "lazy";
        visual.appendChild(img);
      }
      thumb.replaceChildren(thumbTop, visual);

      const nameEl = dom("span", "media-pool-name mono", still.preset || still.filename);
      const metaEl = dom("div", "media-pool-meta mono");
      metaEl.appendChild(
        dom("span", "media-pool-meta-tc", still.timecode || still.timestampLabel || "PNG")
      );
      card.replaceChildren(thumb, nameEl, metaEl);
      card.addEventListener("click", () => downloadStillPng(still));
      return card;
    });
    list.replaceChildren(...stillCards);
    return;
  }

  const entries = poolResult.clipItems;
  renderMediaPoolSourceTape(entries);
  updateMasterBinCutToolbar(entries);

  if (entries.length === 0) {
    list.replaceChildren(dom("div", "timeline-index-empty mono", t("timeline.mediapool.empty")));
    return;
  }

  const fpsFloat = Math.max(1, doc.fps.num / Math.max(1, doc.fps.den));
  const selectedId = getSelectedTimelineClipId();
  const infoHint = t("timeline.mediapool.infoHint");
  const cards = entries.map((entry) => {
    const isSel = Boolean(selectedId && entry.id === selectedId);
    const isAudio = entry.trackKind === "audio";
    const isTitle = entry.mediaCategory === "title";
    const durSec = (entry.durationFrames / fpsFloat).toFixed(1);
    const colorId = entry.labelColor || "default";
    const pal = computeClipThumbPalette(entry);

    const card = dom(
      "button",
      `media-pool-card${isAudio ? " is-audio" : isTitle ? " is-title" : " is-video"}${isSel ? " is-selected" : ""}`
    );
    card.type = "button";
    card.setAttribute("role", "listitem");
    card.setAttribute("data-pool-clip-id", entry.id);
    card.setAttribute("data-media-category", entry.mediaCategory || "video");
    card.setAttribute("data-label-color", colorId);
    card.title = `${entry.label} (${entry.trackId} | ${durSec}s | ${entry.durationFrames}f) - ${infoHint}`;

    const thumb = dom("div", "media-pool-thumb");
    thumb.style.setProperty("--pool-grad-a", pal.a);
    thumb.style.setProperty("--pool-grad-b", pal.b);
    thumb.style.setProperty("--pool-accent", pal.accent);
    thumb.style.setProperty("--pool-angle", `${pal.angle}deg`);

    const thumbTop = dom("div", "media-pool-thumb-top");
    thumbTop.appendChild(dom("span", "media-pool-track mono", entry.trackId));
    thumbTop.appendChild(dom("span", "media-pool-dur mono", `${durSec}s`));

    const visual = dom("div", `media-pool-visual${isAudio ? " is-wave" : " is-film"}`);
    visual.setAttribute("aria-hidden", "true");
    if (isAudio) {
      for (let i = 0; i < 7; i++) {
        const bar = dom("span", "media-pool-wave-bar");
        const pct = 28 + ((pal.seed >> (i * 4)) & 0x3f) % 68;
        bar.style.height = `${pct}%`;
        visual.appendChild(bar);
      }
    } else {
      for (let i = 0; i < 3; i++) {
        visual.appendChild(dom("span", "media-pool-film-tick"));
      }
    }

    thumb.replaceChildren(thumbTop, visual);

    const nameEl = dom("span", "media-pool-name mono", entry.label);
    const metaEl = dom("div", "media-pool-meta mono");
    if (colorId !== "default") {
      const swatch = dom("span", `clip-label-swatch is-${colorId}`);
      swatch.setAttribute("aria-hidden", "true");
      metaEl.appendChild(swatch);
    }
    metaEl.appendChild(dom("span", "media-pool-meta-tc", `${entry.startTimecode} | ${entry.durationFrames}f`));

    card.replaceChildren(thumb, nameEl, metaEl);
    card.addEventListener("click", () => {
      state.mediaPoolActiveClipId = entry.id;
      selectClipFromTimelineIndex(entry);
      updateMasterBinCutToolbar(entries);
    });
    card.addEventListener("dblclick", () => openMediaPoolInfoDialog(entry));
    card.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      openMediaPoolInfoDialog(entry);
    });
    return card;
  });
  list.replaceChildren(...cards);
}

function selectClipFromTimelineIndex(entry) {
  const doc = state.timelineDoc;
  if (!doc || !entry) return false;
  const found = findTrackAndClip(doc, entry.trackKind, entry.trackIndex, entry.clipIndex);
  if (!found) return false;
  stopPlayback();
  state.timelineSelected = { kind: "clip", data: found.clip };
  setPlayhead(entry.startFrames);
  renderTimelineSelection();
  return true;
}

function renderTimelineIndex() {
  const list = byId("timeline-index-list");
  if (!list) return;
  const countEl = byId("timeline-index-count");
  const clearBtn = byId("btn-timeline-index-clear");
  const filterGroup = byId("timeline-index-color-filter");
  const searchInput = byId("timeline-index-search");

  if (searchInput && document.activeElement !== searchInput && searchInput.value !== state.timelineIndexQuery) {
    searchInput.value = state.timelineIndexQuery;
  }

  if (filterGroup) {
    for (const pill of filterGroup.querySelectorAll("[data-index-color]")) {
      const colorId = pill.getAttribute("data-index-color") || "all";
      const isAct = colorId === state.timelineIndexColor;
      pill.classList.toggle("is-active", isAct);
      pill.setAttribute("aria-pressed", isAct ? "true" : "false");
    }
  }

  const hasActiveFilter =
    Boolean(state.timelineIndexQuery.trim()) || state.timelineIndexColor !== "all";
  if (clearBtn) {
    clearBtn.disabled = !hasActiveFilter;
  }

  const doc = state.timelineDoc;
  if (!doc) {
    if (countEl) countEl.textContent = "0 / 0";
    list.replaceChildren(dom("div", "timeline-index-empty mono", t("timeline.index.noTimeline")));
    return;
  }

  const allClips = filterTimelineClips(doc);
  const filtered = filterTimelineClips(doc, {
    query: state.timelineIndexQuery,
    labelColor: state.timelineIndexColor
  });
  if (countEl) {
    countEl.textContent = `${filtered.length} / ${allClips.length}`;
  }

  if (filtered.length === 0) {
    list.replaceChildren(dom("div", "timeline-index-empty mono", t("timeline.index.empty")));
    return;
  }

  const selectedId = getSelectedTimelineClipId();
  const rows = filtered.map((entry) => {
    const isSel = Boolean(selectedId && entry.id === selectedId);
    const btn = dom("button", `timeline-index-row${isSel ? " is-selected" : ""}`);
    btn.type = "button";
    btn.setAttribute("role", "listitem");
    btn.setAttribute("data-index-clip-id", entry.id);
    if (isSel) {
      btn.setAttribute("aria-current", "true");
    }
    const colorLabel = t(`timeline.clipLabel.${entry.labelColor}`);
    btn.title = `${entry.label} (${entry.trackId} | ${entry.startTimecode} | ${entry.durationFrames}f | ${colorLabel})`;
    btn.setAttribute(
      "aria-label",
      `${entry.label}, ${entry.trackId}, ${entry.startTimecode}, ${entry.durationFrames}f, ${colorLabel}`
    );

    const swatch = dom("span", `clip-label-swatch is-${entry.labelColor}`);
    swatch.setAttribute("aria-hidden", "true");
    const trackBadge = dom("span", "nle-tag mono timeline-index-track", entry.trackId);
    const nameEl = dom("span", "timeline-index-name mono", entry.label);
    const metaEl = dom("span", "timeline-index-meta mono");
    metaEl.replaceChildren(
      dom("span", "timeline-index-tc", entry.startTimecode),
      dom("span", "timeline-index-dur", `${entry.durationFrames}f`)
    );

    btn.replaceChildren(swatch, trackBadge, nameEl, metaEl);
    btn.addEventListener("click", () => selectClipFromTimelineIndex(entry));
    return btn;
  });

  list.replaceChildren(...rows);
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
      text: String(c.text),
      words: Array.isArray(c.words) ? c.words : []
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
    master_bus: normalizeMasterBusState(state.masterBus),
    fairlight_rack: normalizeFairlightAudioRackParams(state.fairlightRack),
    color: {
      grade: {
        ...cloneGradeParams(state.colorGrade),
        preserve_lightness: Boolean(state.colorGrade.preserve_lightness)
      },
      nodes: getSerializedColorNodes(),
      selected_node_id: state.colorNodeTree.selectedNodeId || "node-1",
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
      karaoke_mode: state.subtitleTrack.karaoke_mode || "off",
      highlight_color: state.subtitleTrack.highlight_color || "#ffe047",
      uppercase: Boolean(state.subtitleTrack.uppercase),
      safe_margin_preset: state.subtitleTrack.safe_margin_preset || "standard",
      max_words_per_cue: Number(state.subtitleTrack.max_words_per_cue ?? 0),
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
      lower_third: { ...state.lowerThird },
      retime: { ...state.deliverRetime },
      reframe: { ...state.reframe },
      film_grain: { ...state.filmGrain },
      vignette: { ...state.vignette },
      voice_cleanup: { ...state.voiceCleanup },
      export_fps: txt("render-export-fps", "source") || "source",
      deinterlace: chk("render-deinterlace", false),
      audio_only_format: txt("render-audio-only-format", "off") || "off",
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
  state.masterBus = normalizeMasterBusState(project.master_bus);
  state.fairlightRack = normalizeFairlightAudioRackParams(project.fairlight_rack);
  setPlayhead(Number(project.playhead_frame ?? 0));

  // Color state
  const col = project.color || {};
  if (Array.isArray(col.nodes) && col.nodes.length > 0) {
    state.colorNodeTree = normalizeColorNodeTree({
      nodes: col.nodes.map((n, idx) => deserializeColorNodeFromApi(n, idx)),
      selectedNodeId: col.selected_node_id || "node-1"
    });
    syncActiveColorGradeFromTree();
  } else {
    state.colorNodeTree = createDefaultColorNodeTree();
    if (col.grade) {
      state.colorNodeTree.nodes[0].grade = normalizeColorGrade(col.grade);
    }
    syncActiveColorGradeFromTree();
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
    karaoke_mode: sub.karaoke_mode || "off",
    highlight_color: sub.highlight_color || "#ffe047",
    uppercase: Boolean(sub.uppercase),
    safe_margin_preset: sub.safe_margin_preset || "standard",
    max_words_per_cue: Number(sub.max_words_per_cue ?? 0),
    cues: Array.isArray(sub.cues)
      ? sub.cues.map((c, idx) => ({
          index: idx + 1,
          start_s: Number(c.start_s),
          end_s: Number(c.end_s),
          text: String(c.text || ""),
          words: Array.isArray(c.words) ? c.words : []
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
  setVal("render-audio-only-format", del.audio_only_format || "off");
  syncDeliverProfileControlsState();
  setVal("render-container", del.container || (del.profile === "prores_hq" ? "mov" : "mp4"));
  if (del.profile !== "prores_hq" && del.video_crf !== null && del.video_crf !== undefined) {
    setVal("render-crf", del.video_crf);
  }
  if (del.profile !== "prores_hq" && del.audio_bitrate_kbps) {
    setVal("render-audio-bitrate", del.audio_bitrate_kbps);
  }
  if (del.audio_only_format && del.audio_only_format !== "off") {
    syncDeliverProfileControlsState();
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
  if (del.lower_third && typeof del.lower_third === "object") {
    state.lowerThird = {
      enabled: Boolean(del.lower_third.enabled),
      title: typeof del.lower_third.title === "string" ? del.lower_third.title : "",
      subtitle: typeof del.lower_third.subtitle === "string" ? del.lower_third.subtitle : "",
      position: ["bottom_left", "bottom_center", "top_left"].includes(del.lower_third.position)
        ? del.lower_third.position
        : "bottom_left",
      font_size: Number.isInteger(Number(del.lower_third.font_size))
        ? Math.min(96, Math.max(16, Number(del.lower_third.font_size)))
        : 36,
      box_opacity: Number.isFinite(Number(del.lower_third.box_opacity))
        ? Math.min(1, Math.max(0, Number(del.lower_third.box_opacity)))
        : 0.65,
      start_s: Number.isFinite(Number(del.lower_third.start_s))
        ? Math.max(0, Number(del.lower_third.start_s))
        : 0.0,
      duration_s: Number.isFinite(Number(del.lower_third.duration_s))
        ? Math.max(0.1, Number(del.lower_third.duration_s))
        : 5.0
    };
  }
  syncLowerThirdControlsUI({ syncInputs: true });
  if (del.retime && typeof del.retime === "object") {
    const rawSpd = Number(del.retime.speed);
    const rpPreset = normalizeRetimeRampPreset(del.retime.ramp_preset);
    const rpPoints = resolveRetimeRampPointsForPreset(rpPreset, del.retime.ramp_points);
    state.deliverRetime = {
      enabled: Boolean(del.retime.enabled),
      speed: Number.isFinite(rawSpd) ? Math.min(4.0, Math.max(0.25, rawSpd)) : 1.0,
      reverse: Boolean(del.retime.reverse),
      retime_process: normalizeRetimeProcess(del.retime.retime_process),
      ramp_preset: rpPreset,
      ramp_points: rpPoints
    };
  } else {
    state.deliverRetime = {
      enabled: false,
      speed: 1.0,
      reverse: false,
      retime_process: "nearest",
      ramp_preset: "constant",
      ramp_points: []
    };
  }
  syncDeliverRetimeControlsUI({ syncInputs: true });
  if (del.reframe && typeof del.reframe === "object") {
    const allowedRatios = new Set(["source", "16:9", "9:16", "4:5", "1:1", "2.39:1"]);
    const rawRatio = String(del.reframe.aspect_ratio || "source").trim().toLowerCase();
    const rawPx = Number(del.reframe.pan_x);
    const rawPy = Number(del.reframe.pan_y);
    state.reframe = {
      enabled: Boolean(del.reframe.enabled),
      aspect_ratio: allowedRatios.has(rawRatio) ? rawRatio : "source",
      pan_x: Number.isFinite(rawPx) ? Math.min(1, Math.max(-1, rawPx)) : 0.0,
      pan_y: Number.isFinite(rawPy) ? Math.min(1, Math.max(-1, rawPy)) : 0.0
    };
  } else {
    state.reframe = { enabled: false, aspect_ratio: "source", pan_x: 0.0, pan_y: 0.0 };
  }
  syncReframeControlsUI({ syncInputs: true });
  if (del.film_grain && typeof del.film_grain === "object") {
    const allowedPresets = new Set(["35mm_fine", "16mm_organic", "super8_heavy", "custom"]);
    const rawPreset = String(del.film_grain.preset || "35mm_fine").trim().toLowerCase();
    const rawStrength = Number(del.film_grain.strength);
    state.filmGrain = {
      enabled: Boolean(del.film_grain.enabled),
      preset: allowedPresets.has(rawPreset) ? rawPreset : "35mm_fine",
      strength: Number.isFinite(rawStrength) ? Math.min(60, Math.max(0, Math.round(rawStrength))) : 12,
      temporal: del.film_grain.temporal !== undefined ? Boolean(del.film_grain.temporal) : true
    };
  } else {
    state.filmGrain = { enabled: false, preset: "35mm_fine", strength: 12, temporal: true };
  }
  syncFilmGrainControlsUI({ syncInputs: true });
  if (del.vignette && typeof del.vignette === "object") {
    const allowedVigPresets = new Set(["subtle_cinema", "moody_portrait", "heavy_noir", "custom"]);
    const allowedVigModes = new Set(["forward", "backward"]);
    const rawVigPreset = String(del.vignette.preset || "subtle_cinema").trim().toLowerCase();
    const rawVigAngle = Number(del.vignette.angle_deg);
    const rawVigMode = String(del.vignette.mode || "forward").trim().toLowerCase();
    state.vignette = {
      enabled: Boolean(del.vignette.enabled),
      preset: allowedVigPresets.has(rawVigPreset) ? rawVigPreset : "subtle_cinema",
      angle_deg: Number.isFinite(rawVigAngle) ? Math.min(75.0, Math.max(5.0, rawVigAngle)) : 24.0,
      mode: allowedVigModes.has(rawVigMode) ? rawVigMode : "forward"
    };
  } else {
    state.vignette = { enabled: false, preset: "subtle_cinema", angle_deg: 24.0, mode: "forward" };
  }
  syncVignetteControlsUI({ syncInputs: true });
  if (del.voice_cleanup && typeof del.voice_cleanup === "object") {
    const allowedVcPresets = new Set(["youtube_voice", "podcast_warm", "broadcast_crisp", "custom"]);
    const rawVcPreset = String(del.voice_cleanup.preset || "youtube_voice").trim().toLowerCase();
    const rawVcHp = Number(del.voice_cleanup.highpass_hz);
    const rawVcPres = Number(del.voice_cleanup.presence_db);
    const rawVcDeEss = Number(del.voice_cleanup.de_ess);
    state.voiceCleanup = {
      enabled: Boolean(del.voice_cleanup.enabled),
      preset: allowedVcPresets.has(rawVcPreset) ? rawVcPreset : "youtube_voice",
      highpass_hz: Number.isFinite(rawVcHp) ? Math.min(200, Math.max(40, Math.round(rawVcHp))) : 85,
      presence_db: Number.isFinite(rawVcPres) ? Math.min(6.0, Math.max(-6.0, rawVcPres)) : 2.5,
      de_ess: Number.isFinite(rawVcDeEss) ? Math.min(1.0, Math.max(0.0, rawVcDeEss)) : 0.35
    };
  } else {
    state.voiceCleanup = {
      enabled: false,
      preset: "youtube_voice",
      highpass_hz: 85,
      presence_db: 2.5,
      de_ess: 0.35
    };
  }
  syncVoiceCleanupControlsUI({ syncInputs: true });
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
  ],
  pro_mist: [
    { name: "diffusion_strength", label: "Diffusion", kind: "float", default: 0.45, min_val: 0, max_val: 1, step: 0.05 },
    { name: "highlight_threshold", label: "Threshold", kind: "float", default: 0.55, min_val: 0.3, max_val: 0.9, step: 0.05 },
    { name: "bloom_radius", label: "Bloom Radius", kind: "float", default: 8, min_val: 2, max_val: 24, step: 1, unit: "px" },
    { name: "warmth", label: "Warmth", kind: "float", default: 0.2, min_val: -1, max_val: 1, step: 0.05 }
  ],
  directional_blur: [
    { name: "blur_amount", label: "Blur Amount", kind: "float", default: 8, min_val: 1, max_val: 24, step: 1, unit: "px" },
    { name: "angle_deg", label: "Angle (deg)", kind: "float", default: 0, min_val: -180, max_val: 180, step: 5, unit: "deg" }
  ],
  tilt_shift: [
    { name: "focus_y", label: "Focus Y", kind: "float", default: 0.52, min_val: 0.15, max_val: 0.85, step: 0.02 },
    { name: "band_height", label: "Focus Band", kind: "float", default: 0.24, min_val: 0.08, max_val: 0.55, step: 0.02 },
    { name: "blur_strength", label: "Bokeh Blur", kind: "float", default: 7, min_val: 2, max_val: 20, step: 1, unit: "px" },
    { name: "sat_boost", label: "Sat Boost", kind: "float", default: 1.3, min_val: 1, max_val: 1.8, step: 0.05 }
  ],
  prism_leak: [
    { name: "leak_intensity", label: "Leak Intensity", kind: "float", default: 0.55, min_val: 0, max_val: 1, step: 0.05 },
    { name: "leak_corner", label: "Leak Corner", kind: "enum", default: "top_left", options: ["top_left", "top_right", "bottom_left", "bottom_right"] },
    { name: "prism_shift_px", label: "Prism Shift", kind: "int", default: 4, min_val: 0, max_val: 12, step: 1, unit: "px" }
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
  ],
  black_promist_cinema: [
    { effect: "pro_mist", enabled: true, params: { diffusion_strength: 0.5, highlight_threshold: 0.52, bloom_radius: 10, warmth: 0.25 } },
    { effect: "film_grain", enabled: true, params: { strength: 10 } },
    { effect: "vignette", enabled: true, params: { angle_rad: 0.44 } }
  ],
  miniature_tilt_shift: [
    { effect: "tilt_shift", enabled: true, params: { focus_y: 0.52, band_height: 0.22, blur_strength: 9, sat_boost: 1.35 } },
    { effect: "unsharp_mask", enabled: true, params: { sharpen_amount: 1.15 } }
  ],
  anamorphic_prism_leak: [
    { effect: "prism_leak", enabled: true, params: { leak_intensity: 0.62, leak_corner: "top_left", prism_shift_px: 5 } },
    { effect: "optical_glow", enabled: true, params: { glow_intensity: 0.35, glow_radius: 12 } }
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
  invert_negative: "S_Invert",
  pro_mist: "S_ProMist",
  directional_blur: "S_DirectionalBlur",
  tilt_shift: "S_TiltShift",
  prism_leak: "S_PrismLeak"
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

function defaultEffectMaskClient() {
  return {
    shape: "off",
    center_x: 0.5,
    center_y: 0.5,
    radius_x: 0.35,
    radius_y: 0.35,
    feather: 0.12,
    invert: false
  };
}

function normalizeEffectMaskClient(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const shape = src.shape === "ellipse" || src.shape === "rect" ? src.shape : "off";
  const clampBound = (v, minV, maxV, defV) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(maxV, Math.max(minV, n)) : defV;
  };
  return {
    shape,
    center_x: clampBound(src.center_x, 0.05, 0.95, 0.5),
    center_y: clampBound(src.center_y, 0.05, 0.95, 0.5),
    radius_x: clampBound(src.radius_x, 0.05, 0.95, 0.35),
    radius_y: clampBound(src.radius_y, 0.05, 0.95, 0.35),
    feather: clampBound(src.feather, 0.01, 0.5, 0.12),
    invert: Boolean(src.invert)
  };
}

function createDefaultFxNode(effect) {
  const params = {};
  for (const sp of getFxSpecs(effect)) {
    params[sp.name] = sp.default;
  }
  return {
    effect,
    enabled: true,
    params,
    keyframes: [],
    kfOpen: false,
    effect_mask: defaultEffectMaskClient(),
    maskOpen: false
  };
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
      : [],
    effect_mask: normalizeEffectMaskClient(n.effect_mask)
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

function serializeStabilizerForApi(bypassAll = false) {
  const s = normalizeStabilizerClient(state.stabilizer);
  return {
    ...s,
    enabled: bypassAll ? false : Boolean(s.enabled)
  };
}

function serializePlanarTrackerForApi(bypassAll = false) {
  const p = normalizePlanarTrackerClient(state.planarTracker);
  return {
    ...p,
    enabled: bypassAll ? false : Boolean(p.enabled)
  };
}

function syncPlanarTrackerAndStabilizerUi() {
  const trk = normalizePlanarTrackerClient(state.planarTracker);
  const stab = normalizeStabilizerClient(state.stabilizer);
  const anyOn = Boolean(trk.enabled || stab.enabled);

  const badge = byId("fx-tracker-badge");
  if (badge) {
    if (state.fxBypassAll) {
      badge.textContent = "BYPASS";
      badge.className = "nle-tag mono is-warn";
    } else if (trk.enabled && stab.enabled) {
      badge.textContent = `TRK+STB ${Math.round(stab.auto_zoom_pct)}%`;
      badge.className = "nle-tag mono is-active";
    } else if (trk.enabled) {
      badge.textContent =
        trk.mode === "point_track_only"
          ? `TRK ${trk.track_keyframes.length}KF`
          : trk.mode === "rectify_perspective"
            ? "RECTIFY"
            : "CORNER-PIN";
      badge.className = "nle-tag mono is-active";
    } else if (stab.enabled) {
      badge.textContent = `STAB ${Math.round(stab.auto_zoom_pct)}%`;
      badge.className = "nle-tag mono is-active";
    } else {
      badge.textContent = "OFF";
      badge.className = "nle-tag mono";
    }
  }

  const toggleBtn = byId("btn-fx-tracker-toggle");
  if (toggleBtn) {
    toggleBtn.setAttribute("aria-pressed", trk.enabled ? "true" : "false");
    toggleBtn.classList.toggle("is-active", trk.enabled && !state.fxBypassAll);
  }
  const ovBtn = byId("btn-fx-tracker-overlay");
  if (ovBtn) {
    ovBtn.setAttribute("aria-pressed", state.planarTrackerOverlay ? "true" : "false");
    ovBtn.classList.toggle("is-active", Boolean(state.planarTrackerOverlay));
  }

  for (const tabBtn of document.querySelectorAll("[data-tracker-tab]")) {
    const tabId = tabBtn.getAttribute("data-tracker-tab");
    const isSel = tabId === state.planarTrackerTab;
    tabBtn.classList.toggle("is-active", isSel);
    tabBtn.setAttribute("aria-selected", isSel ? "true" : "false");
    tabBtn.tabIndex = isSel ? 0 : -1;
  }
  const planarPanel = byId("fx-tracker-panel-planar");
  const stabPanel = byId("fx-tracker-panel-stabilizer");
  if (planarPanel) {
    const hide = state.planarTrackerTab !== "planar";
    planarPanel.classList.toggle("is-hidden", hide);
    planarPanel.hidden = hide;
  }
  if (stabPanel) {
    const hide = state.planarTrackerTab !== "stabilizer";
    stabPanel.classList.toggle("is-hidden", hide);
    stabPanel.hidden = hide;
  }

  for (const btn of document.querySelectorAll("[data-tracker-preset]")) {
    const pid = btn.getAttribute("data-tracker-preset");
    const match = pid === trk.preset;
    btn.classList.toggle("is-active", match);
    btn.setAttribute("aria-pressed", match ? "true" : "false");
  }
  for (const btn of document.querySelectorAll("[data-stab-preset]")) {
    const pid = btn.getAttribute("data-stab-preset");
    const match = pid === stab.preset;
    btn.classList.toggle("is-active", match);
    btn.setAttribute("aria-pressed", match ? "true" : "false");
  }

  const modeEl = byId("fx-tracker-mode");
  if (modeEl) modeEl.value = trk.mode;
  const interpEl = byId("fx-tracker-interp");
  if (interpEl) interpEl.value = trk.interpolation;
  const followEl = byId("fx-tracker-follow-track");
  if (followEl) followEl.checked = Boolean(trk.follow_track);

  const pinPairs = [
    ["fx-pin-tl-x", trk.tl_x],
    ["fx-pin-tl-y", trk.tl_y],
    ["fx-pin-tr-x", trk.tr_x],
    ["fx-pin-tr-y", trk.tr_y],
    ["fx-pin-bl-x", trk.bl_x],
    ["fx-pin-bl-y", trk.bl_y],
    ["fx-pin-br-x", trk.br_x],
    ["fx-pin-br-y", trk.br_y]
  ];
  for (const [id, val] of pinPairs) {
    const el = byId(id);
    if (el && (state.planarTrackerDrag !== null || document.activeElement !== el)) {
      el.value = (val * 100).toFixed(1);
    }
  }

  const kfs = trk.track_keyframes || [];
  const clrBtn = byId("btn-fx-track-clear");
  if (clrBtn) clrBtn.disabled = kfs.length === 0;
  const linkBtn = byId("btn-fx-track-link-pw");
  if (linkBtn) {
    linkBtn.disabled = kfs.length === 0;
    linkBtn.classList.toggle("is-active", Boolean(state.colorPowerWindowTrack.linked));
  }
  const readout = byId("fx-tracker-track-readout");
  if (readout) {
    const curPt = evaluateTrackPointClient(trk, state.playheadFrame);
    const avgConf =
      kfs.length > 0
        ? Math.round((kfs.reduce((acc, item) => acc + item.confidence, 0) / kfs.length) * 100)
        : 100;
    readout.textContent = kfs.length > 0
      ? `${kfs.length} KF | ${Math.round(curPt.x * 100)}%, ${Math.round(curPt.y * 100)}% (${avgConf}%)`
      : `0 KF | Anchor ${Math.round(trk.track_anchor_x * 100)}%, ${Math.round(trk.track_anchor_y * 100)}%`;
  }

  const stabEn = byId("fx-stab-enabled");
  if (stabEn) stabEn.checked = Boolean(stab.enabled);
  const rxR = byId("fx-stab-rx-range");
  const rxN = byId("fx-stab-rx-num");
  if (rxR) rxR.value = String(stab.rx);
  if (rxN && document.activeElement !== rxN) rxN.value = String(stab.rx);
  const ryR = byId("fx-stab-ry-range");
  const ryN = byId("fx-stab-ry-num");
  if (ryR) ryR.value = String(stab.ry);
  if (ryN && document.activeElement !== ryN) ryN.value = String(stab.ry);
  const zoomR = byId("fx-stab-zoom-range");
  const zoomN = byId("fx-stab-zoom-num");
  if (zoomR) zoomR.value = String(stab.auto_zoom_pct);
  if (zoomN && document.activeElement !== zoomN) zoomN.value = stab.auto_zoom_pct.toFixed(1);
  const edgeEl = byId("fx-stab-edge");
  if (edgeEl) edgeEl.value = stab.edge;
  const searchEl = byId("fx-stab-search");
  if (searchEl) searchEl.value = stab.search;
  const blkEl = byId("fx-stab-blocksize");
  if (blkEl && document.activeElement !== blkEl) blkEl.value = String(stab.blocksize);

  const pwBadge = byId("pw-track-link-badge");
  const pwUnlink = byId("btn-pw-unlink-track");
  if (pwBadge) {
    const isLinked = Boolean(state.colorPowerWindowTrack.linked && state.colorPowerWindowTrack.keyframes.length > 0);
    pwBadge.classList.toggle("is-hidden", !isLinked);
    if (isLinked) {
      pwBadge.textContent = `TRACKED (${state.colorPowerWindowTrack.keyframes.length} KF)`;
    }
  }
  if (pwUnlink) {
    pwUnlink.classList.toggle(
      "is-hidden",
      !(state.colorPowerWindowTrack.linked && state.colorPowerWindowTrack.keyframes.length > 0)
    );
  }
  void anyOn;
}

function applyPlanarTrackerPresetClient(presetId) {
  const preset = PLANAR_TRACKER_PRESETS_CLIENT[presetId];
  if (!preset) return;
  state.planarTracker = {
    ...state.planarTracker,
    enabled: true,
    preset: preset.id,
    mode: preset.mode,
    interpolation: preset.interpolation,
    tl_x: preset.tl_x,
    tl_y: preset.tl_y,
    tr_x: preset.tr_x,
    tr_y: preset.tr_y,
    bl_x: preset.bl_x,
    bl_y: preset.bl_y,
    br_x: preset.br_x,
    br_y: preset.br_y
  };
  state.fxBypassAll = false;
  syncPlanarTrackerAndStabilizerUi();
  updateFxBadges();
  redrawActiveCanvases();
  compileFxNow();
}

function applyStabilizerPresetClient(presetId) {
  const preset = STABILIZER_PRESETS_CLIENT[presetId];
  if (!preset) return;
  state.stabilizer = {
    ...state.stabilizer,
    enabled: true,
    preset: preset.id,
    rx: preset.rx,
    ry: preset.ry,
    edge: preset.edge,
    blocksize: preset.blocksize,
    contrast: preset.contrast,
    search: preset.search,
    auto_zoom_pct: preset.auto_zoom_pct
  };
  state.fxBypassAll = false;
  syncPlanarTrackerAndStabilizerUi();
  updateFxBadges();
  redrawActiveCanvases();
  compileFxNow();
}

function runPlanarPointTrack(direction) {
  const doc = state.timelineDoc;
  const maxF = Math.max(25, state.timelineMaxFrame || 500);
  const startF = Math.max(0, Math.min(maxF, Math.round(state.playheadFrame || 0)));
  let frameList = [];
  if (direction === "back") {
    const endF = Math.max(0, startF - 24);
    for (let f = startF; f >= endF; f -= 1) frameList.push(f);
  } else if (direction === "analyze") {
    const lo = Math.max(0, startF - 25);
    const hi = Math.min(maxF, lo + 49);
    for (let f = lo; f <= hi; f += 1) frameList.push(f);
  } else {
    const endF = Math.min(maxF, startF + 24);
    for (let f = startF; f <= endF; f += 1) frameList.push(f);
  }
  if (frameList.length === 0) frameList = [startF];

  const tracked = trackPointSequenceCanvas(
    doc,
    getActiveColorChainState(),
    getEffectiveFramingState(),
    state.planarTracker.track_anchor_x,
    state.planarTracker.track_anchor_y,
    state.planarTracker.track_box_pct,
    frameList
  );
  const mergedMap = new Map();
  for (const kf of state.planarTracker.track_keyframes || []) {
    mergedMap.set(kf.frame, kf);
  }
  for (const kf of tracked) {
    mergedMap.set(kf.frame, kf);
  }
  const merged = Array.from(mergedMap.values()).sort((a, b) => a.frame - b.frame);
  state.planarTracker.track_keyframes = merged;
  state.planarTracker.enabled = true;
  state.fxBypassAll = false;
  if (state.colorPowerWindowTrack.linked) {
    state.colorPowerWindowTrack.keyframes = merged.map((k) => ({ ...k }));
    syncLinkedPowerWindowAtPlayhead();
  }
  syncPlanarTrackerAndStabilizerUi();
  updateFxBadges();
  redrawActiveCanvases();
  compileFxNow();
  showBanner(`Tracked ${tracked.length} frames (${merged.length} keyframes total)`, "success");
}

function syncLinkedPowerWindowAtPlayhead() {
  if (!state.colorPowerWindowTrack.linked) return false;
  const kfs = state.colorPowerWindowTrack.keyframes || [];
  if (!kfs.length) return false;
  const pt = evaluateTrackPointClient(
    { ...state.planarTracker, track_keyframes: kfs },
    state.playheadFrame
  );
  const active = syncActiveColorGradeFromTree();
  if (!active) return false;
  const nextShape =
    active.power_window && active.power_window.shape !== "off"
      ? active.power_window.shape
      : "circle";
  updateActivePowerWindow(
    {
      shape: nextShape,
      center_x: Number(Math.max(0, Math.min(1, pt.x)).toFixed(4)),
      center_y: Number(Math.max(0, Math.min(1, pt.y)).toFixed(4))
    },
    false
  );
  return true;
}

function linkPlanarTrackToPowerWindow() {
  const kfs = state.planarTracker.track_keyframes || [];
  if (!kfs.length) {
    showBanner("Track at least 1 frame before linking to Power Window", "info");
    return;
  }
  state.colorPowerWindowTrack = {
    linked: true,
    keyframes: kfs.map((k) => ({ ...k }))
  };
  syncLinkedPowerWindowAtPlayhead();
  syncPlanarTrackerAndStabilizerUi();
  scheduleColorCompile();
  showBanner(`Linked ${kfs.length} tracked keyframes to Color Power Window`, "success");
}

function unlinkPlanarTrackFromPowerWindow() {
  state.colorPowerWindowTrack = { linked: false, keyframes: [] };
  syncPlanarTrackerAndStabilizerUi();
}

function updateFxBadges() {
  const total = state.fxStack.length;
  const fxActiveCount = state.fxStack.filter((n) => n.enabled).length;
  const ckActiveCount = state.chromaKey.enabled ? 1 : 0;
  const stabActiveCount = state.stabilizer.enabled ? 1 : 0;
  const trkActiveCount = state.planarTracker.enabled ? 1 : 0;
  const activeCount = state.fxBypassAll
    ? 0
    : fxActiveCount + ckActiveCount + stabActiveCount + trkActiveCount;
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
  const maskList = Array.isArray(res.masked_effects) && res.masked_effects.length > 0
    ? ` | Mask: ${res.masked_effects.join(", ")}`
    : "";
  const activeLabels = [
    ...(res.stabilizer_active ? ["stabilizer"] : []),
    ...(res.planar_tracker_active ? ["planar_tracker"] : []),
    ...(res.chroma_key_active ? ["chroma_key"] : []),
    ...(Array.isArray(res.active_effects) ? res.active_effects : [])
  ];
  renderKv(kv, [
    ["Active FX", (activeLabels.join(", ") || t("common.none")) + kfList + maskList],
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
    const stabPayload = state.stabilizer.enabled ? serializeStabilizerForApi(state.fxBypassAll) : null;
    const trkPayload = state.planarTracker.enabled ? serializePlanarTrackerForApi(state.fxBypassAll) : null;

    const compiled = await api.compileFx({
      nodes: nodesPayload,
      chroma_key: ckPayload,
      stabilizer: stabPayload,
      planar_tracker: trkPayload,
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
    node.effect_mask = normalizeEffectMaskClient(node.effect_mask);
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

    const actions = dom("div", "btn-row fx-node-actions");
    const maskHasShape = node.effect_mask.shape !== "off";
    const maskActive = Boolean(node.maskOpen || maskHasShape);
    const maskLabel = maskHasShape
      ? `${t("fx.mask.toggle")} (${node.effect_mask.shape === "ellipse" ? t("fx.mask.ellipse") : t("fx.mask.rect")})`
      : t("fx.mask.toggle");
    const maskBtn = dom(
      "button",
      `btn btn-mini fx-mask-toggle-btn${maskActive ? " is-active" : ""}`,
      maskLabel
    );
    maskBtn.type = "button";
    maskBtn.setAttribute("aria-pressed", maskActive ? "true" : "false");
    maskBtn.addEventListener("click", () => {
      node.maskOpen = !maskActive;
      renderFxStack();
    });

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
      node.effect_mask = defaultEffectMaskClient();
      node.maskOpen = false;
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

    actions.replaceChildren(maskBtn, kfBtn, rstBtn, rmBtn);
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

    if (maskActive) {
      const m = node.effect_mask;
      const maskPanel = dom("div", "fx-mask-panel");
      const maskToolbar = dom("div", "fx-mask-toolbar");
      const shapeGroup = dom("div", "fx-mask-shape-group");
      shapeGroup.setAttribute("role", "group");
      shapeGroup.setAttribute("aria-label", `${FX_DISPLAY_TITLES[node.effect] || node.effect} effect mask shape`);
      for (const shapeId of ["off", "ellipse", "rect"]) {
        const shapeBtn = dom(
          "button",
          `btn btn-mini fx-mask-shape-btn${m.shape === shapeId ? " is-active" : ""}`,
          t(`fx.mask.${shapeId}`)
        );
        shapeBtn.type = "button";
        shapeBtn.setAttribute("data-fx-mask-shape", shapeId);
        shapeBtn.setAttribute("aria-pressed", m.shape === shapeId ? "true" : "false");
        shapeBtn.addEventListener("click", () => {
          m.shape = shapeId;
          node.maskOpen = shapeId !== "off";
          state.fxActivePresetId = "";
          renderFxStack();
          redrawActiveCanvases();
          scheduleFxCompile();
        });
        shapeGroup.appendChild(shapeBtn);
      }

      const maskToggles = dom("div", "fx-mask-toggles");
      const invBtn = dom(
        "button",
        `btn btn-mini fx-mask-invert-btn${m.invert ? " is-active" : ""}`,
        t("fx.mask.invert")
      );
      invBtn.type = "button";
      invBtn.disabled = m.shape === "off";
      invBtn.setAttribute("aria-pressed", m.invert ? "true" : "false");
      invBtn.addEventListener("click", () => {
        m.invert = !m.invert;
        state.fxActivePresetId = "";
        renderFxStack();
        redrawActiveCanvases();
        scheduleFxCompile();
      });

      const rstMaskBtn = dom("button", "btn btn-mini", t("fx.mask.reset"));
      rstMaskBtn.type = "button";
      rstMaskBtn.addEventListener("click", () => {
        node.effect_mask = defaultEffectMaskClient();
        node.maskOpen = false;
        state.fxActivePresetId = "";
        renderFxStack();
        redrawActiveCanvases();
        scheduleFxCompile();
      });
      maskToggles.replaceChildren(invBtn, rstMaskBtn);
      maskToolbar.replaceChildren(shapeGroup, maskToggles);

      const maskGrid = dom("div", `fx-mask-grid${m.shape === "off" ? " is-dimmed" : ""}`);
      const maskSpecs = [
        { key: "center_x", label: t("fx.mask.centerX"), min: 0.05, max: 0.95, step: 0.02 },
        { key: "center_y", label: t("fx.mask.centerY"), min: 0.05, max: 0.95, step: 0.02 },
        { key: "radius_x", label: t("fx.mask.radiusX"), min: 0.05, max: 0.95, step: 0.02 },
        { key: "radius_y", label: t("fx.mask.radiusY"), min: 0.05, max: 0.95, step: 0.02 },
        { key: "feather", label: t("fx.mask.feather"), min: 0.01, max: 0.5, step: 0.01 }
      ];
      for (const mSpec of maskSpecs) {
        const mRow = dom("div", "fx-param-row fx-mask-row");
        const mId = `fx-node-${nodeIdx}-mask-${mSpec.key}`;
        const mLbl = dom("label", "fx-param-label", mSpec.label);
        mLbl.setAttribute("for", mId);

        const mRange = dom("input");
        mRange.type = "range";
        mRange.id = mId;
        mRange.min = String(mSpec.min);
        mRange.max = String(mSpec.max);
        mRange.step = String(mSpec.step);
        mRange.value = String(m[mSpec.key]);
        mRange.disabled = m.shape === "off";

        const mNum = dom("input", "input-num mono");
        mNum.type = "number";
        mNum.min = String(mSpec.min);
        mNum.max = String(mSpec.max);
        mNum.step = String(mSpec.step);
        mNum.value = String(m[mSpec.key]);
        mNum.disabled = m.shape === "off";
        mNum.setAttribute("aria-label", `${mSpec.label} value`);

        mRange.addEventListener("input", () => {
          const val = Number.parseFloat(mRange.value);
          if (Number.isFinite(val)) {
            m[mSpec.key] = val;
            mNum.value = String(val);
            state.fxActivePresetId = "";
            redrawActiveCanvases();
            scheduleFxCompile();
          }
        });
        mNum.addEventListener("change", () => {
          const val = Number.parseFloat(mNum.value);
          if (Number.isFinite(val)) {
            const clamped = Math.min(mSpec.max, Math.max(mSpec.min, val));
            m[mSpec.key] = clamped;
            mRange.value = String(clamped);
            mNum.value = String(clamped);
            state.fxActivePresetId = "";
            redrawActiveCanvases();
            scheduleFxCompile();
          }
        });
        mRow.replaceChildren(mLbl, mRange, mNum);
        maskGrid.appendChild(mRow);
      }
      maskPanel.replaceChildren(maskToolbar, maskGrid);
      cardChildren.push(maskPanel);
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
    kfOpen: false,
    effect_mask: normalizeEffectMaskClient(n.effect_mask),
    maskOpen: Boolean(n.effect_mask && n.effect_mask.shape && n.effect_mask.shape !== "off")
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

const SUBTITLE_STYLE_DEFAULTS = {
  clean_white: { font_size: 34, margin_bottom_pct: 0.08, safe_margin_preset: "standard", karaoke_mode: "off", highlight_color: "#ffe047", uppercase: false },
  yellow_broadcast: { font_size: 34, margin_bottom_pct: 0.08, safe_margin_preset: "standard", karaoke_mode: "off", highlight_color: "#00e5ff", uppercase: false },
  boxed_social: { font_size: 38, margin_bottom_pct: 0.08, safe_margin_preset: "standard", karaoke_mode: "off", highlight_color: "#ffe047", uppercase: false },
  netflix_clean: { font_size: 32, margin_bottom_pct: 0.1, safe_margin_preset: "broadcast_title", karaoke_mode: "off", highlight_color: "#ffe047", uppercase: false },
  social_karaoke: { font_size: 42, margin_bottom_pct: 0.24, safe_margin_preset: "reels_tiktok", karaoke_mode: "color_pop", highlight_color: "#ffe047", uppercase: true },
  broadcast_gold: { font_size: 34, margin_bottom_pct: 0.1, safe_margin_preset: "broadcast_title", karaoke_mode: "off", highlight_color: "#00e5ff", uppercase: false }
};

const SUBTITLE_SAFE_MARGIN_MAP = {
  standard: 0.08,
  broadcast_action: 0.05,
  broadcast_title: 0.1,
  reels_tiktok: 0.24,
  upper_third: 0.42
};

function updateSubtitleStyleButtons() {
  for (const btn of document.querySelectorAll("[data-subtitle-style]")) {
    const sid = btn.getAttribute("data-subtitle-style");
    const isMatch = sid === state.subtitleTrack.style;
    btn.classList.toggle("is-active", isMatch);
    btn.setAttribute("aria-pressed", isMatch ? "true" : "false");
  }
  const hlHex = String(state.subtitleTrack.highlight_color || "#ffe047").toLowerCase();
  for (const sw of document.querySelectorAll("[data-hl-color]")) {
    const isMatch = String(sw.getAttribute("data-hl-color") || "").toLowerCase() === hlHex;
    sw.classList.toggle("is-active", isMatch);
    sw.setAttribute("aria-pressed", isMatch ? "true" : "false");
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

  const karaokeBadge = byId("subtitle-karaoke-badge");
  if (karaokeBadge) {
    const kMode = sub.karaoke_mode || "off";
    if (kMode === "off") {
      karaokeBadge.textContent = "KARAOKE OFF";
      karaokeBadge.className = "nle-tag mono";
    } else {
      const modeTag = kMode === "pill_box" ? "PILL" : kMode === "progressive_fill" ? "FILL" : "POP";
      karaokeBadge.textContent = `KARAOKE ${modeTag}`;
      karaokeBadge.className = "nle-tag is-active mono";
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
      for (const chip of row.querySelectorAll(".subtitle-word-chip")) {
        const wStart = Number.parseFloat(chip.getAttribute("data-word-start") || "-1");
        const wEnd = Number.parseFloat(chip.getAttribute("data-word-end") || "-1");
        const isWordActive = isActive && Number.isFinite(wStart) && Number.isFinite(wEnd) && tSec >= wStart && tSec <= wEnd;
        chip.classList.toggle("is-active-word", isWordActive);
      }
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
  const uppercase = Boolean(state.subtitleTrack.uppercase);
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
        cue.words = [];
        jumpBtn.textContent = `#${cue.index} @ ${formatCueTimecode(cue.start_s)}`;
        renderSubtitleWordStrip(wordStrip, cue);
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
        cue.words = [];
        renderSubtitleWordStrip(wordStrip, cue);
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

    const wordStrip = dom("div", "subtitle-word-strip mono");
    function renderSubtitleWordStrip(container, targetCue) {
      const words = computeCueWordTimingsCanvas(targetCue, uppercase);
      const chips = words.map((w) => {
        const chip = dom("button", "subtitle-word-chip mono");
        chip.type = "button";
        chip.setAttribute("data-word-start", String(w.start_s));
        chip.setAttribute("data-word-end", String(w.end_s));
        chip.title = `${w.start_s.toFixed(2)}s - ${w.end_s.toFixed(2)}s (Click to seek)`;
        const labelSpan = dom("span", "", w.text);
        const timeSpan = dom("span", "subtitle-word-time", `${w.start_s.toFixed(2)}s`);
        chip.append(labelSpan, timeSpan);
        chip.addEventListener("click", () => {
          stopPlayback();
          setPlayhead(Math.max(0, Math.round(w.start_s * fps)));
        });
        return chip;
      });
      container.replaceChildren(...chips);
    }

    renderSubtitleWordStrip(wordStrip, cue);
    textInput.addEventListener("input", () => {
      cue.text = textInput.value;
      cue.words = [];
      renderSubtitleWordStrip(wordStrip, cue);
      updateSubtitleTimingBadges();
      redrawActiveCanvases();
      scheduleSubtitleCompile();
    });

    row.append(head, textInput, wordStrip);
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
  const wordsTag = res.word_count ? ` | ${res.word_count}W` : "";
  badge.textContent = `COMPILED (${res.cue_count}${wordsTag})`;
  badge.className = "nle-tag is-active mono";
  const viewMode = state.subtitleOutputView === "ass" ? "ass" : "fg";
  out.textContent = viewMode === "ass" ? (res.ass_preview || res.filtergraph) : res.filtergraph;
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

async function autoChunkSubtitlesNow() {
  try {
    const validCues = state.subtitleTrack.cues.filter(
      (c) => String(c.text || "").trim().length > 0 && c.end_s > c.start_s
    );
    if (validCues.length === 0) {
      showBanner("Add or parse subtitle cues before auto-chunking.", "error");
      return;
    }
    const maxWordsEl = byId("subtitle-chunk-words");
    const maxWords = maxWordsEl ? Number.parseInt(maxWordsEl.value, 10) || 4 : 4;
    const res = await api.chunkSubtitles({
      cues: validCues,
      max_words_per_cue: maxWords,
      uppercase: Boolean(state.subtitleTrack.uppercase)
    });
    state.subtitleTrack.cues = Array.isArray(res.cues) ? res.cues : [];
    const rawEl = byId("subtitle-raw-input");
    if (rawEl) rawEl.value = formatCuesAsSrtLocal(state.subtitleTrack.cues);
    renderSubtitleCueList();
    redrawActiveCanvases();
    await compileSubtitlesNow();
    showBanner(`Chunked into ${res.cue_count} short cues (${res.word_count} words).`, "success");
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
      filename: `captions.${format}`,
      subtitle_track: {
        ...state.subtitleTrack,
        cues: validCues
      }
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
  const mRange = byId("subtitle-margin-range");
  const mNum = byId("subtitle-margin-num");
  const mPreset = byId("subtitle-safe-margin-preset");
  const kMode = byId("subtitle-karaoke-mode");
  const hlInput = byId("subtitle-highlight-color");
  const upperChk = byId("subtitle-uppercase");
  const rawEl = byId("subtitle-raw-input");
  const marginPctInt = Math.round((Number(sub.margin_bottom_pct ?? 0.08)) * 100);
  if (fsRange) fsRange.value = String(sub.font_size);
  if (fsNum) fsNum.value = String(sub.font_size);
  if (mRange) mRange.value = String(marginPctInt);
  if (mNum) mNum.value = String(marginPctInt);
  if (mPreset) mPreset.value = sub.safe_margin_preset || "standard";
  if (kMode) kMode.value = sub.karaoke_mode || "off";
  if (hlInput) hlInput.value = sub.highlight_color || "#ffe047";
  if (upperChk) upperChk.checked = Boolean(sub.uppercase);
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
  if (res.is_identity) {
    badge.textContent = "UNITY";
  } else {
    const tags = ["GRADED"];
    if (res.has_power_windows) tags.push("PW");
    if (res.has_qualifiers) tags.push("QUAL");
    if (res.has_curves) tags.push("CRV");
    badge.textContent = tags.join(" | ");
  }
  badge.className = `nle-tag mono ${res.is_identity ? "" : "is-pass"}`;
  out.textContent = res.filtergraph;
  renderColorNodeTreeUI();
}

function getActiveColorChainState() {
  state.colorNodeTree = normalizeColorNodeTree(state.colorNodeTree);
  return { nodes: state.colorNodeTree.nodes };
}

function syncActiveColorGradeFromTree() {
  state.colorNodeTree = normalizeColorNodeTree(state.colorNodeTree);
  const activeNode = getSelectedColorNode(state.colorNodeTree);
  state.colorGrade = activeNode.grade;
  return activeNode;
}

function getSerializedColorNodes() {
  state.colorNodeTree = normalizeColorNodeTree(state.colorNodeTree);
  return state.colorNodeTree.nodes.map((n) => serializeColorNodeForApi(n));
}

function renderColorNodeTreeUI() {
  state.colorNodeTree = normalizeColorNodeTree(state.colorNodeTree);
  const nodes = state.colorNodeTree.nodes;
  const activeNode = syncActiveColorGradeFromTree();
  const activeIdx = nodes.findIndex((n) => n.id === activeNode.id);

  const countBadge = byId("color-node-count");
  if (countBadge) {
    countBadge.textContent = `${nodes.length} / ${MAX_COLOR_NODES} NODES`;
  }

  const addBtn = byId("btn-color-node-add");
  if (addBtn) addBtn.disabled = nodes.length >= MAX_COLOR_NODES;

  const outsideBtn = byId("btn-color-node-outside");
  if (outsideBtn) {
    outsideBtn.disabled =
      nodes.length >= MAX_COLOR_NODES ||
      (!isPowerWindowActive(activeNode.power_window) && !isQualifierActive(activeNode.qualifier));
  }

  const delBtn = byId("btn-color-node-delete");
  if (delBtn) delBtn.disabled = nodes.length <= 1;

  const leftBtn = byId("btn-color-node-left");
  if (leftBtn) leftBtn.disabled = activeIdx <= 0;

  const rightBtn = byId("btn-color-node-right");
  if (rightBtn) rightBtn.disabled = activeIdx < 0 || activeIdx >= nodes.length - 1;

  const bypassBtn = byId("btn-color-node-bypass");
  if (bypassBtn) {
    const isBypassed = activeNode.enabled === false;
    bypassBtn.classList.toggle("is-active", isBypassed);
    bypassBtn.setAttribute("aria-pressed", isBypassed ? "true" : "false");
  }

  const labelInput = byId("color-node-label-input");
  if (labelInput && document.activeElement !== labelInput) {
    labelInput.value = activeNode.label;
  }

  const lutBadge = byId("color-node-lut-badge");
  const mixRange = byId("cube-lut-mix-range");
  const mixNum = byId("cube-lut-mix-num");
  const clearLutBtn = byId("btn-color-node-clear-lut");
  const hasLut = Boolean(activeNode.lut);

  if (lutBadge) {
    if (hasLut) {
      lutBadge.textContent = `${activeNode.lut.dimension} ${activeNode.lut.size}^3 ${activeNode.lut.title}`;
      lutBadge.className = "nle-tag is-pass mono";
    } else {
      lutBadge.textContent = t("color.nodes.noLut");
      lutBadge.className = "nle-tag mono";
    }
  }
  const mixPct = hasLut ? Math.round(Number(activeNode.lut.mix ?? 1) * 100) : 100;
  if (mixRange) {
    mixRange.disabled = !hasLut;
    mixRange.value = String(mixPct);
  }
  if (mixNum) {
    mixNum.disabled = !hasLut;
    if (document.activeElement !== mixNum) {
      mixNum.value = String(mixPct);
    }
  }
  if (clearLutBtn) clearLutBtn.disabled = !hasLut;

  const graph = byId("color-node-graph");
  if (!graph) return;
  const flowChildren = [];
  flowChildren.push(dom("span", "color-node-pin mono", "IN"));

  nodes.forEach((node, idx) => {
    flowChildren.push(dom("span", "color-node-link mono", "->"));
    const isSelected = node.id === activeNode.id;
    const isBypassed = node.enabled === false;
    const hasNodeLut = Boolean(node.lut);
    const isNeutral = isColorNodeIdentity(node);

    const card = dom(
      "div",
      `color-node-card${isSelected ? " is-selected" : ""}${isBypassed ? " is-bypassed" : ""}`
    );
    card.setAttribute("data-color-node-card", node.id);

    const selBtn = dom("button", "color-node-select");
    selBtn.type = "button";
    selBtn.setAttribute("data-color-node-id", node.id);
    selBtn.setAttribute("aria-pressed", isSelected ? "true" : "false");
    selBtn.setAttribute("aria-label", `Select serial node ${idx + 1}: ${node.label}`);

    const topRow = dom("div", "color-node-head");
    const idxTag = dom("span", "color-node-idx mono", String(idx + 1).padStart(2, "0"));
    const nameSpan = dom("span", "color-node-name", node.label);
    topRow.replaceChildren(idxTag, nameSpan);

    const metaRow = dom("div", "color-node-meta mono");
    let statusText = "UNITY";
    let statusClass = "color-node-status";
    if (isBypassed) {
      statusText = "BYPASS";
      statusClass = "color-node-status is-bypass";
    } else if (hasNodeLut) {
      statusText = `${node.lut.size}^3 LUT`;
      statusClass = "color-node-status is-lut";
    } else if (!isNeutral) {
      statusText = "GRADE";
      statusClass = "color-node-status is-graded";
    }
    metaRow.appendChild(dom("span", statusClass, statusText));
    if (isPowerWindowActive(node.power_window)) {
      const pwShort =
        node.power_window.shape === "circle"
          ? "CIR"
          : node.power_window.shape === "linear"
            ? "LIN"
            : "GRAD";
      const pwLabel = node.power_window.invert ? `INV ${pwShort}` : pwShort;
      metaRow.appendChild(
        dom(
          "span",
          `color-node-pw-tag${node.power_window.invert ? " is-invert" : ""}`,
          pwLabel
        )
      );
    }
    if (!isColorCurvesIdentity(node.curves)) {
      metaRow.appendChild(dom("span", "color-node-crv-tag", "CRV"));
    }
    if (!isHslCurvesIdentity(node.hsl_curves)) {
      metaRow.appendChild(dom("span", "color-node-crv-tag", "HSL"));
    }
    if (isQualifierActive(node.qualifier)) {
      const qualLabel = node.qualifier.invert ? "INV QUAL" : "QUAL";
      metaRow.appendChild(
        dom(
          "span",
          `color-node-qual-tag${node.qualifier.invert ? " is-invert" : ""}`,
          qualLabel
        )
      );
    }
    selBtn.replaceChildren(topRow, metaRow);
    selBtn.addEventListener("click", () => selectColorNodeAction(node.id));

    const bypBtn = dom(
      "button",
      `color-node-bypass-btn mono${isBypassed ? " is-bypassed" : ""}`,
      isBypassed ? "OFF" : "ON"
    );
    bypBtn.type = "button";
    bypBtn.setAttribute("data-color-node-bypass", node.id);
    bypBtn.setAttribute("aria-pressed", isBypassed ? "true" : "false");
    bypBtn.setAttribute("aria-label", `Toggle bypass for node ${idx + 1}`);
    bypBtn.addEventListener("click", () => toggleColorNodeBypassAction(node.id));

    card.replaceChildren(selBtn, bypBtn);
    flowChildren.push(card);
  });

  flowChildren.push(dom("span", "color-node-link mono", "->"));
  flowChildren.push(dom("span", "color-node-pin mono", "OUT"));
  graph.replaceChildren(...flowChildren);
  renderPowerWindowControlsUI(activeNode);
  renderQualifierControlsUI(activeNode);
  renderColorCurvesControlsUI(activeNode);
}

const QUALIFIER_CONTROL_DEFS = [
  { key: "hue_center", rangeId: "qual-hue-center-range", numId: "qual-hue-center-num", scale: 1, min: 0, max: 360, decimals: 0 },
  { key: "hue_width", rangeId: "qual-hue-width-range", numId: "qual-hue-width-num", scale: 1, min: 2, max: 360, decimals: 0 },
  { key: "hue_softness", rangeId: "qual-hue-soft-range", numId: "qual-hue-soft-num", scale: 1, min: 0, max: 60, decimals: 0 },
  { key: "sat_low", rangeId: "qual-sat-low-range", numId: "qual-sat-low-num", scale: 100, min: 0, max: 100, decimals: 0 },
  { key: "sat_high", rangeId: "qual-sat-high-range", numId: "qual-sat-high-num", scale: 100, min: 0, max: 100, decimals: 0 },
  { key: "sat_softness", rangeId: "qual-sat-soft-range", numId: "qual-sat-soft-num", scale: 100, min: 0, max: 40, decimals: 0 },
  { key: "lum_low", rangeId: "qual-lum-low-range", numId: "qual-lum-low-num", scale: 100, min: 0, max: 100, decimals: 0 },
  { key: "lum_high", rangeId: "qual-lum-high-range", numId: "qual-lum-high-num", scale: 100, min: 0, max: 100, decimals: 0 },
  { key: "lum_softness", rangeId: "qual-lum-soft-range", numId: "qual-lum-soft-num", scale: 100, min: 0, max: 40, decimals: 0 },
  { key: "blur_radius", rangeId: "qual-blur-range", numId: "qual-blur-num", scale: 1, min: 0, max: 8, decimals: 1 }
];

function renderQualifierControlsUI(activeNode) {
  const q = normalizeQualifier(activeNode ? activeNode.qualifier : null);
  const active = isQualifierActive(q);

  const badge = byId("qual-status-badge");
  if (badge) {
    if (!active) {
      badge.textContent = "OFF";
      badge.className = "nle-tag mono";
    } else {
      const presetTag = (q.preset || "custom").toUpperCase();
      badge.textContent = q.invert ? `${presetTag} | INV` : presetTag;
      badge.className = `nle-tag ${q.invert ? "is-blue" : "is-active"} mono`;
    }
  }

  const activePreset = active ? q.preset || "custom" : "off";
  for (const btn of document.querySelectorAll("[data-qual-preset]")) {
    const isSel = btn.getAttribute("data-qual-preset") === activePreset;
    btn.classList.toggle("is-active", isSel);
    btn.setAttribute("aria-pressed", isSel ? "true" : "false");
  }

  const pickBtn = byId("btn-qual-pick");
  const previewCanvas = byId("color-preview-canvas");
  if (pickBtn) {
    const picking = Boolean(state.qualifierPickMode);
    pickBtn.classList.toggle("is-active", picking);
    pickBtn.setAttribute("aria-pressed", picking ? "true" : "false");
  }
  if (previewCanvas) {
    previewCanvas.classList.toggle("is-eyedropper", Boolean(state.qualifierPickMode));
  }

  const hlOn = Boolean(state.qualifierHighlight);
  for (const hlId of ["btn-qual-highlight", "btn-color-qual-highlight"]) {
    const hlBtn = byId(hlId);
    if (hlBtn) {
      hlBtn.classList.toggle("is-active", hlOn);
      hlBtn.setAttribute("aria-pressed", hlOn ? "true" : "false");
    }
  }

  const invBtn = byId("btn-qual-invert");
  if (invBtn) {
    invBtn.disabled = !active;
    invBtn.classList.toggle("is-active", active && q.invert);
    invBtn.setAttribute("aria-pressed", active && q.invert ? "true" : "false");
  }

  const rstBtn = byId("btn-qual-reset");
  if (rstBtn) rstBtn.disabled = !active;

  const readout = byId("qual-pick-readout");
  if (readout) {
    if (state.qualifierLastSample) {
      const s = state.qualifierLastSample;
      readout.textContent = `H ${Math.round(s.h)}deg | S ${Math.round(s.s * 100)}% | L ${Math.round(s.l * 100)}%`;
    } else if (active) {
      readout.textContent = `H ${Math.round(q.hue_center)}deg +/-${Math.round(q.hue_width * 0.5)}`;
    } else {
      readout.textContent = "H -- | S -- | L --";
    }
  }

  const ctrlGrid = byId("color-qual-controls");
  if (ctrlGrid) ctrlGrid.classList.toggle("is-dimmed", !active);

  for (const def of QUALIFIER_CONTROL_DEFS) {
    const rawVal = Number(q[def.key]) * def.scale;
    const valStr = def.decimals > 0 ? rawVal.toFixed(def.decimals) : String(Math.round(rawVal));
    const rEl = byId(def.rangeId);
    const nEl = byId(def.numId);
    if (rEl) {
      rEl.disabled = !active;
      rEl.value = valStr;
    }
    if (nEl) {
      nEl.disabled = !active;
      if (document.activeElement !== nEl) {
        nEl.value = valStr;
      }
    }
  }
}

function updateActiveQualifier(patch, shouldCompile = true) {
  const active = syncActiveColorGradeFromTree();
  const merged = { ...active.qualifier, ...patch };
  if (merged.sat_low > merged.sat_high) {
    if (patch.sat_low !== undefined && patch.sat_high === undefined) {
      merged.sat_high = merged.sat_low;
    } else {
      merged.sat_low = merged.sat_high;
    }
  }
  if (merged.lum_low > merged.lum_high) {
    if (patch.lum_low !== undefined && patch.lum_high === undefined) {
      merged.lum_high = merged.lum_low;
    } else {
      merged.lum_low = merged.lum_high;
    }
  }
  const nextQual = normalizeQualifier(merged);
  state.colorNodeTree = updateColorNodeInTree(state.colorNodeTree, active.id, {
    qualifier: nextQual
  });
  syncActiveColorGradeFromTree();
  renderColorNodeTreeUI();
  if (state.activeTab === "color") {
    redrawActiveCanvases();
  }
  if (shouldCompile) {
    scheduleColorCompile();
  }
}

function applyQualifierPresetAction(presetId) {
  const preset = QUALIFIER_PRESETS[presetId] || QUALIFIER_PRESETS.off;
  const active = syncActiveColorGradeFromTree();
  state.qualifierLastSample = null;
  state.colorNodeTree = updateColorNodeInTree(state.colorNodeTree, active.id, {
    qualifier: normalizeQualifier(preset.qualifier)
  });
  syncActiveColorGradeFromTree();
  renderColorNodeTreeUI();
  if (state.activeTab === "color") {
    redrawActiveCanvases();
  }
  compileColorNow();
}

function toggleQualifierHighlight() {
  state.qualifierHighlight = !state.qualifierHighlight;
  renderColorNodeTreeUI();
  if (state.activeTab === "color") {
    redrawActiveCanvases();
  }
}

function toggleQualifierPickMode() {
  state.qualifierPickMode = !state.qualifierPickMode;
  renderColorNodeTreeUI();
}

function applyQualifierEyedropperAt(u, v, shouldCompile = true) {
  const previewCanvas = byId("color-preview-canvas");
  if (!previewCanvas) return;
  const active = syncActiveColorGradeFromTree();
  const sample = sampleColorViewerInputRgb(previewCanvas, state.colorNodeTree, u, v, active.id);
  if (!sample) return;
  const [h, s, l] = rgbToHslClient(sample[0], sample[1], sample[2]);
  state.qualifierLastSample = { h, s, l };
  const picked = pickQualifierFromRgb(sample[0], sample[1], sample[2], {
    invert: Boolean(active.qualifier && active.qualifier.invert)
  });
  state.colorNodeTree = updateColorNodeInTree(state.colorNodeTree, active.id, {
    qualifier: picked
  });
  syncActiveColorGradeFromTree();
  renderColorNodeTreeUI();
  if (state.activeTab === "color") {
    redrawActiveCanvases();
  }
  if (shouldCompile) {
    compileColorNow();
  }
}

const POWER_WINDOW_CONTROL_DEFS = [
  { key: "center_x", rangeId: "pw-cx-range", numId: "pw-cx-num", scale: 100, min: 0, max: 100, def: 50 },
  { key: "center_y", rangeId: "pw-cy-range", numId: "pw-cy-num", scale: 100, min: 0, max: 100, def: 50 },
  { key: "width", rangeId: "pw-w-range", numId: "pw-w-num", scale: 100, min: 5, max: 100, def: 45 },
  { key: "height", rangeId: "pw-h-range", numId: "pw-h-num", scale: 100, min: 5, max: 100, def: 45 },
  { key: "rotation_deg", rangeId: "pw-rot-range", numId: "pw-rot-num", scale: 1, min: -180, max: 180, def: 0 },
  { key: "softness", rangeId: "pw-soft-range", numId: "pw-soft-num", scale: 100, min: 0, max: 50, def: 12 }
];

function renderPowerWindowControlsUI(activeNode) {
  const pw = normalizePowerWindow(activeNode ? activeNode.power_window : null);
  const active = isPowerWindowActive(pw);

  const badge = byId("pw-status-badge");
  if (badge) {
    if (!active) {
      badge.textContent = "OFF";
      badge.className = "nle-tag mono";
    } else {
      const tag = pw.shape.toUpperCase();
      badge.textContent = pw.invert ? `${tag} | INV` : tag;
      badge.className = `nle-tag ${pw.invert ? "is-blue" : "is-active"} mono`;
    }
  }

  for (const btn of document.querySelectorAll("[data-pw-shape]")) {
    const isSel = btn.getAttribute("data-pw-shape") === pw.shape;
    btn.classList.toggle("is-active", isSel);
    btn.setAttribute("aria-pressed", isSel ? "true" : "false");
  }

  const invBtn = byId("btn-pw-invert");
  if (invBtn) {
    invBtn.disabled = !active;
    invBtn.classList.toggle("is-active", active && pw.invert);
    invBtn.setAttribute("aria-pressed", active && pw.invert ? "true" : "false");
  }

  const ovBtn = byId("btn-pw-overlay");
  if (ovBtn) {
    ovBtn.disabled = !active;
    ovBtn.classList.toggle("is-active", active && Boolean(state.powerWindowOverlay));
    ovBtn.setAttribute("aria-pressed", active && Boolean(state.powerWindowOverlay) ? "true" : "false");
  }

  const rstBtn = byId("btn-pw-reset");
  if (rstBtn) rstBtn.disabled = !active;

  const ctrlGrid = byId("color-pw-controls");
  if (ctrlGrid) ctrlGrid.classList.toggle("is-dimmed", !active);

  for (const def of POWER_WINDOW_CONTROL_DEFS) {
    const val = Math.round(Number(pw[def.key]) * def.scale);
    const rEl = byId(def.rangeId);
    const nEl = byId(def.numId);
    if (rEl) {
      rEl.disabled = !active;
      rEl.value = String(val);
    }
    if (nEl) {
      nEl.disabled = !active;
      if (document.activeElement !== nEl) {
        nEl.value = String(val);
      }
    }
  }
}

function updateActivePowerWindow(patch, shouldCompile = true) {
  const active = syncActiveColorGradeFromTree();
  const nextPw = normalizePowerWindow({ ...active.power_window, ...patch });
  state.colorNodeTree = updateColorNodeInTree(state.colorNodeTree, active.id, {
    power_window: nextPw
  });
  syncActiveColorGradeFromTree();
  renderColorNodeTreeUI();
  if (state.activeTab === "color") {
    redrawActiveCanvases();
  }
  if (shouldCompile) {
    scheduleColorCompile();
  }
}

function getActiveCurvePresetId(curves) {
  const c = normalizeColorCurves(curves);
  if (isColorCurvesIdentity(c)) return "linear";
  const samePts = (a, b) =>
    a.length === b.length &&
    a.every((pt, idx) => Math.abs(pt[0] - b[idx][0]) < 1e-3 && Math.abs(pt[1] - b[idx][1]) < 1e-3);
  for (const preset of Object.values(COLOR_CURVE_PRESETS)) {
    if (CURVE_CHANNELS.every((ch) => samePts(c[ch], normalizeCurvePoints(preset.curves[ch])))) {
      return preset.id;
    }
  }
  return "";
}

function getActiveHslCurvePresetId(hslCurves) {
  const h = normalizeHslCurves(hslCurves);
  if (isHslCurvesIdentity(h)) return "neutral";
  for (const preset of Object.values(HSL_CURVE_PRESETS)) {
    const p = normalizeHslCurves(preset.hsl_curves);
    const matches = HSL_CURVE_MODES.every((mode) =>
      HSL_HUE_VECTORS.every((vec) => Math.abs((h[mode][vec] || 0) - (p[mode][vec] || 0)) < 1e-3)
    );
    if (matches) return preset.id;
  }
  return "";
}

function formatHslVectorReadout(mode, vectorId, val) {
  const deg = HSL_HUE_ANCHOR_DEGREES[vectorId] || 0;
  const label = vectorId.toUpperCase();
  if (mode === "hue_vs_hue") {
    const sign = val > 0 ? "+" : "";
    return `${label} (${deg}°) | ${sign}${val.toFixed(1)} deg`;
  }
  if (mode === "hue_vs_sat") {
    const pct = Math.round(val * 100);
    const sign = pct > 0 ? "+" : "";
    return `${label} (${deg}°) | ${sign}${pct}% SAT`;
  }
  const sign = val > 0 ? "+" : "";
  return `${label} (${deg}°) | ${sign}${val.toFixed(2)} LUM`;
}

function renderColorCurvesControlsUI(activeNode) {
  const curves = normalizeColorCurves(activeNode ? activeNode.curves : null);
  const hslCurves = normalizeHslCurves(activeNode ? activeNode.hsl_curves : null);
  const mode = HSL_CURVE_MODES.includes(state.colorCurvesMode) ? state.colorCurvesMode : "yrgb";
  const isHslMode = mode !== "yrgb";
  const ch = CURVE_CHANNELS.includes(state.colorCurvesChannel) ? state.colorCurvesChannel : "master";
  const pts = normalizeCurvePoints(curves[ch]);
  if (state.colorCurvesSelectedPt >= pts.length) {
    state.colorCurvesSelectedPt = -1;
  }
  const selVec = HSL_HUE_VECTORS.includes(state.hslCurvesSelectedVec)
    ? state.hslCurvesSelectedVec
    : "reds";

  const titleEl = byId("curves-dock-title");
  if (titleEl) {
    const key = isHslMode ? "color.curves.hslTitle" : "color.curves.title";
    titleEl.setAttribute("data-i18n", key);
    titleEl.textContent = t(key);
  }
  const hintEl = byId("curves-hint-text");
  if (hintEl) {
    const key = isHslMode ? "color.curves.hslHint" : "color.curves.hint";
    hintEl.setAttribute("data-i18n", key);
    hintEl.textContent = t(key);
  }

  for (const btn of document.querySelectorAll("[data-curve-mode]")) {
    const isSel = btn.getAttribute("data-curve-mode") === mode;
    btn.classList.toggle("is-active", isSel);
    btn.setAttribute("aria-pressed", isSel ? "true" : "false");
  }

  byId("curves-channel-group")?.classList.toggle("is-hidden", isHslMode);
  byId("hsl-vector-strip")?.classList.toggle("is-hidden", !isHslMode);
  byId("curves-preset-strip")?.classList.toggle("is-hidden", isHslMode);
  byId("hsl-curves-preset-strip")?.classList.toggle("is-hidden", !isHslMode);

  const badge = byId("curves-status-badge");
  if (badge) {
    const activeChannels = CURVE_CHANNELS.filter((c) => !isCurveChannelIdentity(curves[c]));
    const activeHslModes = HSL_CURVE_MODES.filter((m) => !isHslCurveChannelIdentity(hslCurves[m]));
    if (activeChannels.length === 0 && activeHslModes.length === 0) {
      badge.textContent = "LINEAR";
      badge.className = "nle-tag mono";
    } else if (activeChannels.length > 0 && activeHslModes.length > 0) {
      badge.textContent = "YRGB+HSL";
      badge.className = "nle-tag is-blue mono";
    } else if (activeHslModes.length > 0) {
      const mTags = activeHslModes.map((m) =>
        m === "hue_vs_hue" ? "HvH" : m === "hue_vs_sat" ? "HvS" : "HvL"
      );
      badge.textContent = `HSL | ${mTags.join("+")}`;
      badge.className = "nle-tag is-blue mono";
    } else {
      const labels = activeChannels.map((c) => (c === "master" ? "Y" : c[0].toUpperCase()));
      badge.textContent = `ACTIVE | ${labels.join("+")}`;
      badge.className = "nle-tag is-blue mono";
    }
  }

  for (const btn of document.querySelectorAll("[data-curve-channel]")) {
    const isSel = btn.getAttribute("data-curve-channel") === ch;
    btn.classList.toggle("is-active", isSel);
    btn.setAttribute("aria-pressed", isSel ? "true" : "false");
  }

  for (const btn of document.querySelectorAll("[data-hsl-vector]")) {
    const isSel = btn.getAttribute("data-hsl-vector") === selVec;
    btn.classList.toggle("is-active", isSel);
    btn.setAttribute("aria-pressed", isSel ? "true" : "false");
  }

  const matchedPreset = getActiveCurvePresetId(curves);
  for (const btn of document.querySelectorAll("[data-curve-preset]")) {
    const isSel = btn.getAttribute("data-curve-preset") === matchedPreset;
    btn.classList.toggle("is-active", isSel);
    btn.setAttribute("aria-pressed", isSel ? "true" : "false");
  }

  const matchedHslPreset = getActiveHslCurvePresetId(hslCurves);
  for (const btn of document.querySelectorAll("[data-hsl-preset]")) {
    const isSel = btn.getAttribute("data-hsl-preset") === matchedHslPreset;
    btn.classList.toggle("is-active", isSel);
    btn.setAttribute("aria-pressed", isSel ? "true" : "false");
  }

  const selIdx = state.colorCurvesSelectedPt;
  const canDelete = !isHslMode && selIdx > 0 && selIdx < pts.length - 1;
  const delBtn = byId("btn-curves-delete-pt");
  if (delBtn) {
    delBtn.disabled = !canDelete;
    delBtn.classList.toggle("is-hidden", isHslMode);
  }

  const rstChBtn = byId("btn-curves-reset-ch");
  if (rstChBtn) {
    rstChBtn.disabled = isHslMode
      ? isHslCurveChannelIdentity(hslCurves[mode])
      : isCurveChannelIdentity(pts);
  }

  const rstAllBtn = byId("btn-curves-reset-all");
  if (rstAllBtn) {
    rstAllBtn.disabled = isColorCurvesIdentity(curves) && isHslCurvesIdentity(hslCurves);
  }

  const readout = byId("curves-point-readout");
  if (readout) {
    if (isHslMode) {
      readout.textContent = formatHslVectorReadout(mode, selVec, hslCurves[mode][selVec] || 0);
    } else if (selIdx >= 0 && selIdx < pts.length) {
      const [px, py] = pts[selIdx];
      readout.textContent = `PT ${selIdx + 1}/${pts.length} | IN ${px.toFixed(2)} | OUT ${py.toFixed(2)}`;
    } else {
      readout.textContent = `${ch === "master" ? "YRGB" : ch.toUpperCase()} | ${pts.length} KNOTS`;
    }
  }
}

function commitNodeCurvePatch(patch, shouldCompile = true, immediateCompile = false) {
  const active = syncActiveColorGradeFromTree();
  state.colorNodeTree = updateColorNodeInTree(state.colorNodeTree, active.id, patch);
  syncActiveColorGradeFromTree();
  renderColorNodeTreeUI();
  if (state.activeTab === "color") {
    redrawActiveCanvases();
  }
  if (immediateCompile) {
    compileColorNow();
  } else if (shouldCompile) {
    scheduleColorCompile();
  }
}

function updateActiveColorCurvesChannel(channel, nextPoints, shouldCompile = true, immediateCompile = false) {
  const active = syncActiveColorGradeFromTree();
  const ch = CURVE_CHANNELS.includes(channel) ? channel : "master";
  const curCurves = normalizeColorCurves(active.curves);
  const nextCurves = normalizeColorCurves({
    ...curCurves,
    [ch]: nextPoints
  });
  commitNodeCurvePatch({ curves: nextCurves }, shouldCompile, immediateCompile);
}

function updateActiveHslCurveVector(mode, vectorId, value, shouldCompile = true, immediateCompile = false) {
  if (!HSL_CURVE_MODES.includes(mode) || !HSL_HUE_VECTORS.includes(vectorId)) return;
  const active = syncActiveColorGradeFromTree();
  const curHsl = normalizeHslCurves(active.hsl_curves);
  const bounds = HSL_HUE_BOUNDS[mode];
  const clamped = Math.min(bounds.max, Math.max(bounds.min, Number(value) || 0));
  const nextHsl = normalizeHslCurves({
    ...curHsl,
    [mode]: {
      ...curHsl[mode],
      [vectorId]: Math.round(clamped * 10000) / 10000
    }
  });
  commitNodeCurvePatch({ hsl_curves: nextHsl }, shouldCompile, immediateCompile);
}

function applyColorCurvePresetAction(presetId) {
  const preset = COLOR_CURVE_PRESETS[presetId];
  if (!preset) return;
  state.colorCurvesSelectedPt = -1;
  commitNodeCurvePatch({ curves: normalizeColorCurves(preset.curves) }, true, true);
}

function applyHslCurvePresetAction(presetId) {
  const preset = HSL_CURVE_PRESETS[presetId];
  if (!preset) return;
  commitNodeCurvePatch({ hsl_curves: normalizeHslCurves(preset.hsl_curves) }, true, true);
}

function selectColorNodeAction(nodeId) {
  state.colorNodeTree = selectColorNodeInTree(state.colorNodeTree, nodeId);
  syncActiveColorGradeFromTree();
  state.colorActivePresetId = "";
  state.colorCurvesSelectedPt = -1;
  syncColorInputsFromState();
}

function addColorNodeAction() {
  if (state.colorNodeTree.nodes.length >= MAX_COLOR_NODES) return;
  state.colorNodeTree = addColorNodeToTree(state.colorNodeTree);
  syncActiveColorGradeFromTree();
  state.colorActivePresetId = "";
  state.colorCurvesSelectedPt = -1;
  syncColorInputsFromState();
  compileColorNow();
}

function addOutsideColorNodeAction() {
  if (state.colorNodeTree.nodes.length >= MAX_COLOR_NODES) return;
  const active = syncActiveColorGradeFromTree();
  if (!isPowerWindowActive(active.power_window) && !isQualifierActive(active.qualifier)) return;
  state.colorNodeTree = addOutsideColorNodeInTree(state.colorNodeTree, active.id);
  syncActiveColorGradeFromTree();
  state.colorActivePresetId = "";
  state.colorCurvesSelectedPt = -1;
  syncColorInputsFromState();
  compileColorNow();
}

function removeColorNodeAction() {
  const active = syncActiveColorGradeFromTree();
  if (state.colorNodeTree.nodes.length <= 1) return;
  state.colorNodeTree = removeColorNodeFromTree(state.colorNodeTree, active.id);
  syncActiveColorGradeFromTree();
  state.colorActivePresetId = "";
  state.colorCurvesSelectedPt = -1;
  syncColorInputsFromState();
  compileColorNow();
}

function toggleColorNodeBypassAction(nodeId = null) {
  const active = syncActiveColorGradeFromTree();
  const targetId = nodeId || active.id;
  state.colorNodeTree = toggleColorNodeBypassInTree(state.colorNodeTree, targetId);
  syncActiveColorGradeFromTree();
  syncColorInputsFromState();
  compileColorNow();
}

function moveColorNodeAction(direction) {
  const active = syncActiveColorGradeFromTree();
  state.colorNodeTree = moveColorNodeInTree(state.colorNodeTree, active.id, direction);
  syncActiveColorGradeFromTree();
  syncColorInputsFromState();
  compileColorNow();
}

function resetSelectedColorNodeAction() {
  const active = syncActiveColorGradeFromTree();
  state.colorCurvesSelectedPt = -1;
  state.qualifierLastSample = null;
  state.colorNodeTree = updateColorNodeInTree(state.colorNodeTree, active.id, {
    grade: cloneGradeParams(COLOR_GRADE_PRESETS.rec709_clean.params),
    curves: createDefaultColorCurves(),
    power_window: createDefaultPowerWindow(),
    qualifier: createDefaultQualifier(),
    lut: null
  });
  syncActiveColorGradeFromTree();
  state.colorActivePresetId = state.colorNodeTree.nodes.length === 1 ? "rec709_clean" : "";
  syncColorInputsFromState();
  compileColorNow();
}

async function compileColorNow() {
  const seq = ++state.colorCompileSeq;
  try {
    const serializedNodes = getSerializedColorNodes();
    const hasPw = serializedNodes.some(
      (n) => n.power_window && n.power_window.shape && n.power_window.shape !== "off"
    );
    const hasQual = serializedNodes.some(
      (n) => n.qualifier && n.qualifier.enabled === true
    );
    const hasCurves = serializedNodes.some(
      (n) => n.curves && !isColorCurvesIdentity(n.curves)
    );
    const hasHslCurves = serializedNodes.some(
      (n) => n.hsl_curves && !isHslCurvesIdentity(n.hsl_curves)
    );
    const payload =
      serializedNodes.length === 1 &&
      !serializedNodes[0].lut_table &&
      !hasPw &&
      !hasQual &&
      !hasCurves &&
      !hasHslCurves
        ? { grade: state.colorGrade }
        : { nodes: serializedNodes };
    const compiled = await api.compileColorGrade(payload);
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
  syncActiveColorGradeFromTree();
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
  renderColorNodeTreeUI();
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
  const active = syncActiveColorGradeFromTree();
  state.colorNodeTree = updateColorNodeInTree(state.colorNodeTree, active.id, {
    grade: cloneGradeParams(presetParams)
  });
  syncActiveColorGradeFromTree();
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
  renderMediaPool();
}

function grabMonitorStill(target) {
  const isFx = target === "fx";
  const fps =
    state.timelineDoc && state.timelineDoc.fps
      ? Math.max(1, state.timelineDoc.fps.num / Math.max(1, state.timelineDoc.fps.den))
      : 25;
  const tc = framesToSmpte(state.playheadFrame || 0, fps);

  const activeColorChain = getActiveColorChainState();
  let capture = null;
  let presetLabel = "";
  if (isFx) {
    const canvas = byId("fx-program-canvas");
    capture = captureCleanFxStill(
      canvas,
      state.timelineDoc,
      state.playheadFrame,
      activeColorChain,
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
    capture = captureCleanColorStill(canvas, activeColorChain);
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
        if (!wipe.enabled || (target === "color" && state.qualifierPickMode)) return;
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
        if (!wipe.enabled || (target === "color" && state.qualifierPickMode)) {
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

  const colorPreviewCanvas = byId("color-preview-canvas");
  if (colorPreviewCanvas) {
    const toPwCanvasPoint = (ev) => {
      const rect = colorPreviewCanvas.getBoundingClientRect();
      const geom = colorPreviewCanvas._powerWindowGeom;
      if (!geom || rect.width <= 0 || rect.height <= 0) return null;
      const scaleX = (geom.canvasWidth || rect.width) / rect.width;
      const scaleY = (geom.canvasHeight || rect.height) / rect.height;
      return {
        geom,
        x: (ev.clientX - rect.left) * scaleX,
        y: (ev.clientY - rect.top) * scaleY
      };
    };

    colorPreviewCanvas.addEventListener("pointerdown", (ev) => {
      if (state.colorSplitWipe.isDragging) return;
      if (state.qualifierPickMode) {
        const rect = colorPreviewCanvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const u = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
          const v = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
          ev.preventDefault();
          state.qualifierPickDrag = true;
          applyQualifierEyedropperAt(u, v, false);
          if (typeof colorPreviewCanvas.setPointerCapture === "function") {
            try {
              colorPreviewCanvas.setPointerCapture(ev.pointerId);
            } catch {
              // Ignore synthetic pointer capture errors
            }
          }
          return;
        }
      }
      if (!state.powerWindowOverlay) return;
      const activeNode = syncActiveColorGradeFromTree();
      if (!isPowerWindowActive(activeNode.power_window)) return;
      const pt = toPwCanvasPoint(ev);
      if (!pt) return;
      const { geom, x, y } = pt;
      const splitGeom = colorPreviewCanvas._splitWipeGeom;
      if (
        state.colorSplitWipe.enabled &&
        splitGeom &&
        isPointerOnSplitWipeDivider(x, y, splitGeom, SPLIT_WIPE_HIT_RADIUS_PX)
      ) {
        return;
      }

      let mode = null;
      if (Math.hypot(x - geom.handles.rotate.x, y - geom.handles.rotate.y) <= 13) {
        mode = "rotate";
      } else if (Math.hypot(x - geom.handles.resize.x, y - geom.handles.resize.y) <= 13) {
        mode = "resize";
      } else if (Math.hypot(x - geom.handles.move.x, y - geom.handles.move.y) <= 14) {
        mode = "move";
      } else {
        const u = x / Math.max(1, geom.canvasWidth);
        const v = y / Math.max(1, geom.canvasHeight);
        const m = evaluatePowerWindowMask(
          { ...activeNode.power_window, invert: false },
          u,
          v
        );
        if (m > 0.35) mode = "move";
      }
      if (!mode) return;
      ev.preventDefault();
      state.powerWindowDrag = {
        mode,
        startX: x,
        startY: y,
        startPw: { ...activeNode.power_window }
      };
      if (typeof colorPreviewCanvas.setPointerCapture === "function") {
        try {
          colorPreviewCanvas.setPointerCapture(ev.pointerId);
        } catch {
          // Ignore synthetic pointer capture errors
        }
      }
    });

    colorPreviewCanvas.addEventListener("pointermove", (ev) => {
      if (state.qualifierPickDrag && state.qualifierPickMode) {
        const rect = colorPreviewCanvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const u = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
          const v = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
          ev.preventDefault();
          applyQualifierEyedropperAt(u, v, false);
        }
        return;
      }
      if (!state.powerWindowDrag) return;
      const pt = toPwCanvasPoint(ev);
      if (!pt) return;
      ev.preventDefault();
      const { geom, x, y } = pt;
      const drag = state.powerWindowDrag;
      const w = Math.max(1, geom.canvasWidth);
      const h = Math.max(1, geom.canvasHeight);

      if (drag.mode === "move") {
        const dx = (x - drag.startX) / w;
        const dy = (y - drag.startY) / h;
        updateActivePowerWindow(
          {
            center_x: Math.min(1, Math.max(0, drag.startPw.center_x + dx)),
            center_y: Math.min(1, Math.max(0, drag.startPw.center_y + dy))
          },
          false
        );
      } else if (drag.mode === "rotate") {
        const angleRad = Math.atan2(x - geom.cxPx, -(y - geom.cyPx));
        let deg = Math.round((angleRad * 180) / Math.PI);
        if (deg > 180) deg -= 360;
        if (deg < -180) deg += 360;
        updateActivePowerWindow({ rotation_deg: deg }, false);
      } else if (drag.mode === "resize") {
        const rad = -(drag.startPw.rotation_deg * Math.PI) / 180;
        const dx = x - geom.cxPx;
        const dy = y - geom.cyPx;
        const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
        if (drag.startPw.shape === "gradient") {
          const nextH = Math.min(1, Math.max(0.05, (Math.abs(ly) * 2) / h));
          updateActivePowerWindow({ height: nextH }, false);
        } else {
          const nextW = Math.min(1, Math.max(0.05, (Math.abs(lx) * 2) / w));
          const nextH = Math.min(1, Math.max(0.05, (Math.abs(ly) * 2) / h));
          updateActivePowerWindow({ width: nextW, height: nextH }, false);
        }
      }
    });

    const endPwDrag = (ev) => {
      if (state.qualifierPickDrag) {
        state.qualifierPickDrag = false;
        if (ev && typeof colorPreviewCanvas.releasePointerCapture === "function") {
          try {
            if (colorPreviewCanvas.hasPointerCapture && colorPreviewCanvas.hasPointerCapture(ev.pointerId)) {
              colorPreviewCanvas.releasePointerCapture(ev.pointerId);
            }
          } catch {
            // Ignore pointer release errors
          }
        }
        compileColorNow();
      }
      if (!state.powerWindowDrag) return;
      state.powerWindowDrag = null;
      if (ev && typeof colorPreviewCanvas.releasePointerCapture === "function") {
        try {
          if (colorPreviewCanvas.hasPointerCapture && colorPreviewCanvas.hasPointerCapture(ev.pointerId)) {
            colorPreviewCanvas.releasePointerCapture(ev.pointerId);
          }
        } catch {
          // Ignore pointer release errors
        }
      }
      compileColorNow();
    };
    colorPreviewCanvas.addEventListener("pointerup", endPwDrag);
    colorPreviewCanvas.addEventListener("pointercancel", endPwDrag);
  }

  const fxCanvas = byId("fx-program-canvas");
  if (fxCanvas) {
    const toFxPoint = (ev) => {
      const geom = fxCanvas._planarTrackerGeom;
      if (!geom) return null;
      const rect = fxCanvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const logicalW = geom.canvasWidth || rect.width;
      const logicalH = geom.canvasHeight || rect.height;
      const containScale = Math.min(rect.width / logicalW, rect.height / logicalH);
      const drawnW = logicalW * containScale;
      const drawnH = logicalH * containScale;
      const offsetX = (rect.width - drawnW) * 0.5;
      const offsetY = (rect.height - drawnH) * 0.5;
      return {
        geom,
        x: (ev.clientX - rect.left - offsetX) / containScale,
        y: (ev.clientY - rect.top - offsetY) / containScale
      };
    };

    fxCanvas.addEventListener("pointerdown", (ev) => {
      if (state.fxSplitWipe.isDragging || !state.planarTracker.enabled || !state.planarTrackerOverlay) return;
      const pt = toFxPoint(ev);
      if (!pt || !pt.geom || !pt.geom.handles) return;
      const hitOrder = pt.geom.mode === "point_track_only" ? ["anchor"] : ["tl", "tr", "bl", "br", "anchor"];
      let hitKey = null;
      let bestDist = 16;
      for (const key of hitOrder) {
        const h = pt.geom.handles[key];
        if (!h) continue;
        const d = Math.hypot(pt.x - h.x, pt.y - h.y);
        if (d <= bestDist) {
          bestDist = d;
          hitKey = key;
        }
      }
      if (!hitKey) return;
      ev.preventDefault();
      if (document.activeElement && document.activeElement !== fxCanvas && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
      }
      state.planarTrackerDrag = { key: hitKey };
      if (typeof fxCanvas.setPointerCapture === "function") {
        try {
          fxCanvas.setPointerCapture(ev.pointerId);
        } catch {
          // Ignore synthetic pointer capture error
        }
      }
    });

    fxCanvas.addEventListener("pointermove", (ev) => {
      if (!state.planarTrackerDrag) return;
      const pt = toFxPoint(ev);
      if (!pt || !pt.geom) return;
      ev.preventDefault();
      const { geom, x, y } = pt;
      const normX = (x - geom.fx) / Math.max(1, geom.frameW);
      const normY = (y - geom.fy) / Math.max(1, geom.frameH);
      const key = state.planarTrackerDrag.key;
      if (key === "anchor") {
        state.planarTracker.track_anchor_x = Number(Math.max(0.02, Math.min(0.98, normX)).toFixed(4));
        state.planarTracker.track_anchor_y = Number(Math.max(0.02, Math.min(0.98, normY)).toFixed(4));
      } else {
        let dx = 0;
        let dy = 0;
        if (state.planarTracker.follow_track && state.planarTracker.track_keyframes.length >= 1) {
          const ref = state.planarTracker.track_keyframes[0];
          const cur = evaluateTrackPointClient(state.planarTracker, state.playheadFrame);
          dx = cur.x - ref.x;
          dy = cur.y - ref.y;
        }
        const cx = Number(Math.max(-0.25, Math.min(1.25, normX - dx)).toFixed(4));
        const cy = Number(Math.max(-0.25, Math.min(1.25, normY - dy)).toFixed(4));
        state.planarTracker[`${key}_x`] = cx;
        state.planarTracker[`${key}_y`] = cy;
        state.planarTracker.preset = "custom";
      }
      syncPlanarTrackerAndStabilizerUi();
      redrawActiveCanvases();
      scheduleFxCompile();
    });

    const endTrkDrag = (ev) => {
      if (!state.planarTrackerDrag) return;
      state.planarTrackerDrag = null;
      if (ev && typeof fxCanvas.releasePointerCapture === "function") {
        try {
          if (fxCanvas.hasPointerCapture && fxCanvas.hasPointerCapture(ev.pointerId)) {
            fxCanvas.releasePointerCapture(ev.pointerId);
          }
        } catch {
          // Ignore pointer release errors
        }
      }
      compileFxNow();
    };
    fxCanvas.addEventListener("pointerup", endTrkDrag);
    fxCanvas.addEventListener("pointercancel", endTrkDrag);
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
    state.colorNodeTree = createDefaultColorNodeTree();
    state.colorCurvesSelectedPt = -1;
    state.qualifierHighlight = false;
    state.qualifierPickMode = false;
    state.qualifierLastSample = null;
    syncActiveColorGradeFromTree();
    state.colorActivePresetId = "rec709_clean";
    syncColorInputsFromState();
    compileColorNow();
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
    const serializedNodes = getSerializedColorNodes();
    const payload =
      serializedNodes.length === 1 && !serializedNodes[0].lut_table
        ? { grade: state.colorGrade, size, title, out_path: outPath || null }
        : { nodes: serializedNodes, size, title, out_path: outPath || null };
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
    const serializedNodes = getSerializedColorNodes();
    const dlPayload =
      serializedNodes.length === 1 && !serializedNodes[0].lut_table
        ? { grade: state.colorGrade, size, title, filename: `${title}.cube` }
        : { nodes: serializedNodes, size, title, filename: `${title}.cube` };
    const blob = await api.downloadCubeBlob(dlPayload);
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
  const audioOnlyEl = byId("render-audio-only-format");
  if (!profileEl) return;
  const prof = profileEl.value;
  const audioOnlyFmt = audioOnlyEl ? audioOnlyEl.value : "off";
  const isAudioOnly = audioOnlyFmt !== "off";
  const isProres = prof === "prores_hq";

  profileEl.disabled = isAudioOnly;
  if (containerEl) {
    containerEl.disabled = isAudioOnly;
    if (!isAudioOnly) {
      containerEl.value = isProres ? "mov" : "mp4";
    }
  }
  if (crfEl) {
    crfEl.disabled = isProres || isAudioOnly;
    if (isAudioOnly) {
      crfEl.placeholder = "N/A (Audio-Only)";
    } else if (isProres) {
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
    audioEl.disabled = isProres || isAudioOnly;
    if (audioOnlyFmt === "wav24") {
      audioEl.value = "pcm_s24le";
    } else if (audioOnlyFmt === "mp3_320") {
      audioEl.value = "320";
    } else if (audioOnlyFmt === "aac_256") {
      audioEl.value = "256";
    } else if (isProres) {
      audioEl.value = "pcm_s24le";
    } else if (audioEl.value === "pcm_s24le") {
      audioEl.value = "192";
    }
  }
}

function syncAudioOnlyOutputPath() {
  const audioOnlyEl = byId("render-audio-only-format");
  const outEl = byId("render-output-path");
  const profileEl = byId("render-profile");
  if (!audioOnlyEl || !outEl) return;
  const fmt = audioOnlyEl.value || "off";
  const cur = outEl.value.trim() || "renders/delivery_web.mp4";
  const stem = cur.replace(/\.(mp4|mov|m4v|mkv|mxf|webm|wav|aac|mp3)$/i, "");
  if (fmt === "wav24") {
    outEl.value = `${stem}.wav`;
  } else if (fmt === "mp3_320") {
    outEl.value = `${stem}.mp3`;
  } else if (fmt === "aac_256") {
    outEl.value = `${stem}.aac`;
  } else {
    const ext = profileEl && profileEl.value === "prores_hq" ? "mov" : "mp4";
    outEl.value = `${stem}.${ext}`;
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

function computeDeliverBaseDurationInfo() {
  const doc = state.timelineDoc;
  const fpsObj = doc && doc.fps ? doc.fps : { num: 25, den: 1 };
  const timelineFps = Math.max(1, Number(fpsObj.num || 25) / Math.max(1, Number(fpsObj.den || 1)));
  const minF = doc ? doc.start_frame || 0 : 0;
  const maxF = doc ? Math.max(minF, state.timelineMaxFrame || minF) : 0;
  const metrics = computeInOutRangeMetrics(state.ioRange, timelineFps, minF, maxF);

  let durationS = 0;
  let scope = "timeline";
  if (doc) {
    if (metrics.isComplete) {
      durationS = Math.max(0, metrics.durationFrames / timelineFps);
      scope = "io";
    } else if (metrics.isActive) {
      durationS = Math.max(0, metrics.effectiveDurationFrames / timelineFps);
      scope = "io";
    } else {
      durationS = Math.max(0, (maxF - minF) / timelineFps);
      scope = "timeline";
    }
  }
  return { durationS, scope, timelineFps };
}

function updateDeliverRetimeDurationEstimate() {
  const durEl = byId("render-retime-duration-estimate");
  if (!durEl) return;
  const { durationS } = computeDeliverBaseDurationInfo();
  if (durationS <= 0) {
    durEl.textContent = "--";
    return;
  }
  const rt = getNormalizedDeliverRetimePayload();
  const summary = computeRetimeRampSummary(
    {
      speed_rate: rt.speed,
      retime_ramp_preset: rt.ramp_preset,
      retime_ramp_points: rt.ramp_points
    },
    durationS
  );
  const effectiveSpeed = rt.enabled ? summary.avgSpeed : 1.0;
  const effectiveDur = durationS / effectiveSpeed;
  if (!rt.enabled) {
    durEl.textContent = `${durationS.toFixed(2)}s (1.00x)`;
    return;
  }
  const revTag = rt.reverse ? " REV" : "";
  const ofTag = rt.retime_process === "optical_flow" ? " OF" : rt.retime_process === "frame_blend" ? " FB" : "";
  durEl.textContent = `${durationS.toFixed(2)}s -> ${effectiveDur.toFixed(2)}s (${effectiveSpeed.toFixed(2)}x${ofTag}${revTag})`;
}

function updateDeliverSizeEstimate() {
  const badgeEl = byId("deliver-size-estimate");
  const detailEl = byId("deliver-size-detail");
  if (!badgeEl) return;

  const doc = state.timelineDoc;
  const { durationS: baseDurationS, scope, timelineFps } = computeDeliverBaseDurationInfo();
  const rt = getNormalizedDeliverRetimePayload();
  const rtSummary = computeRetimeRampSummary(
    {
      speed_rate: rt.speed,
      retime_ramp_preset: rt.ramp_preset,
      retime_ramp_points: rt.ramp_points
    },
    baseDurationS
  );
  const durationS =
    rt && rt.enabled && rtSummary.avgSpeed > 0
      ? baseDurationS / rtSummary.avgSpeed
      : baseDurationS;
  updateDeliverRetimeDurationEstimate();

  const profileEl = byId("render-profile");
  const profile = profileEl ? profileEl.value : "web_h264";
  const codecLabel =
    profile === "prores_hq" ? "ProRes 422 HQ" : profile === "master_hevc" ? "HEVC" : "H.264";

  const useFramingEl = byId("render-use-framing");
  const useFraming = useFramingEl ? Boolean(useFramingEl.checked) : false;
  const resEl = byId("render-resolution");
  let targetW = state.renderConfig.targetWidth || 1920;
  let targetH = state.renderConfig.targetHeight || 1080;
  if (resEl && resEl.value && /^\d+x\d+$/.test(resEl.value)) {
    const [rw, rh] = resEl.value.split("x").map((n) => Number.parseInt(n, 10));
    if (Number.isInteger(rw) && Number.isInteger(rh) && rw > 0 && rh > 0) {
      targetW = rw;
      targetH = rh;
    }
  }
  const width = !useFraming && doc && doc.width ? doc.width : targetW;
  const height = !useFraming && doc && doc.height ? doc.height : targetH;

  const exportFpsEl = byId("render-export-fps");
  const exportFpsRaw = exportFpsEl ? exportFpsEl.value : "source";
  const fpsEl = byId("render-fps");
  const fpsInputRaw = fpsEl ? fpsEl.value.trim() : "";
  const effectiveFps =
    exportFpsRaw && exportFpsRaw !== "source" ? exportFpsRaw : fpsInputRaw || timelineFps;

  const crfEl = byId("render-crf");
  const crfRaw = crfEl ? crfEl.value.trim() : "";
  const crf =
    profile !== "prores_hq" && /^-?\d+$/.test(crfRaw) ? Number.parseInt(crfRaw, 10) : null;

  const audioEl = byId("render-audio-bitrate");
  const audioRaw = audioEl ? audioEl.value : "192";
  const audioBitrateKbps =
    profile !== "prores_hq" && /^\d+$/.test(audioRaw) ? Number.parseInt(audioRaw, 10) : null;

  const audioOnlyEl = byId("render-audio-only-format");
  const audioOnlyFormat = audioOnlyEl ? audioOnlyEl.value : "off";

  const est = estimateRenderFileSize({
    durationS,
    codec: profile,
    width,
    height,
    fps: effectiveFps,
    crf,
    audioBitrateKbps,
    audioOnlyFormat
  });

  badgeEl.textContent = est.formattedSize;
  badgeEl.className =
    est.warning === "invalid_duration" || est.warning === "large_file"
      ? "nle-tag is-warn mono deliver-estimate-badge"
      : "nle-tag is-blue mono deliver-estimate-badge";

  if (detailEl) {
    if (est.warning === "invalid_duration") {
      detailEl.textContent = t("render.estimate.invalidDuration");
    } else if (audioOnlyFormat !== "off") {
      const scopeLabel =
        scope === "io" ? t("render.estimate.scopeIo") : t("render.estimate.scopeTimeline");
      const audioOnlyLabel =
        audioOnlyFormat === "wav24"
          ? "WAV 24-bit 48 kHz"
          : audioOnlyFormat === "mp3_320"
            ? "MP3 320 kbps"
            : "AAC 256 kbps";
      const parts = [
        `${durationS.toFixed(1)}s (${scopeLabel})`,
        t("render.label.audioOnly"),
        audioOnlyLabel
      ];
      if (est.warning === "large_file") {
        parts.push(t("render.estimate.largeFile"));
      }
      detailEl.textContent = parts.join(" | ");
    } else {
      const scopeLabel =
        scope === "io" ? t("render.estimate.scopeIo") : t("render.estimate.scopeTimeline");
      const videoMbps = (est.videoBitrateKbps / 1000).toFixed(1);
      const audioLabel =
        profile === "prores_hq" ? "PCM 24b" : `AAC ${est.audioBitrateKbps} kbps`;
      const fpsDisplay =
        typeof effectiveFps === "number" ? Number(effectiveFps.toFixed(2)) : effectiveFps;
      const parts = [
        `${durationS.toFixed(1)}s (${scopeLabel})`,
        `${width}x${height} @ ${fpsDisplay} fps`,
        `${codecLabel} ~${videoMbps} Mbps + ${audioLabel}`
      ];
      if (est.warning === "large_file") {
        parts.push(t("render.estimate.largeFile"));
      }
      detailEl.textContent = parts.join(" | ");
    }
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

const LOWER_THIRD_PRESETS = {
  interview: {
    enabled: true,
    title: "Claire Laurent",
    subtitle: "Lead Cinematographer | Studio Paris",
    position: "bottom_left",
    font_size: 36,
    box_opacity: 0.7,
    start_s: 0.0,
    duration_s: 5.0
  },
  youtube_intro: {
    enabled: true,
    title: "EPISODE 12: COLOR GRADING",
    subtitle: "Subscribe & Hit the Bell",
    position: "bottom_center",
    font_size: 44,
    box_opacity: 0.75,
    start_s: 0.0,
    duration_s: 4.0
  },
  broadcast_tag: {
    enabled: true,
    title: "LIVE | PARIS STUDIO",
    subtitle: "REC.709 25P FEED",
    position: "top_left",
    font_size: 28,
    box_opacity: 0.65,
    start_s: 0.0,
    duration_s: 6.0
  }
};

function getNormalizedLowerThirdPayload() {
  const lt = state.lowerThird;
  return {
    enabled: Boolean(lt.enabled),
    title: String(lt.title || ""),
    subtitle: String(lt.subtitle || ""),
    position: ["bottom_left", "bottom_center", "top_left"].includes(lt.position)
      ? lt.position
      : "bottom_left",
    font_size: Math.min(96, Math.max(16, Math.round(Number(lt.font_size || 36)))),
    box_opacity: Math.min(1, Math.max(0, Number.isFinite(Number(lt.box_opacity)) ? Number(lt.box_opacity) : 0.65)),
    start_s: Math.min(86400, Math.max(0, Number.isFinite(Number(lt.start_s)) ? Number(lt.start_s) : 0.0)),
    duration_s: Math.min(86400, Math.max(0.1, Number.isFinite(Number(lt.duration_s)) ? Number(lt.duration_s) : 5.0))
  };
}

function syncLowerThirdPresetButtons() {
  const lt = state.lowerThird;
  for (const btn of document.querySelectorAll(".lower-third-preset-btn[data-lt-preset]")) {
    const pid = btn.getAttribute("data-lt-preset");
    const preset = pid ? LOWER_THIRD_PRESETS[pid] : null;
    const isMatch = Boolean(
      preset &&
      lt.enabled &&
      lt.title === preset.title &&
      lt.subtitle === preset.subtitle &&
      lt.position === preset.position
    );
    btn.classList.toggle("is-active", isMatch);
    btn.setAttribute("aria-pressed", isMatch ? "true" : "false");
  }
}

function syncLowerThirdControlsUI(opts = {}) {
  const lt = state.lowerThird;
  const syncInputs = Boolean(opts.syncInputs);
  const enabledEl = byId("render-lower-third-enabled");
  if (enabledEl && enabledEl.checked !== Boolean(lt.enabled)) {
    enabledEl.checked = Boolean(lt.enabled);
  }
  if (syncInputs) {
    const titleEl = byId("render-lower-third-title");
    const subEl = byId("render-lower-third-subtitle");
    const posEl = byId("render-lower-third-position");
    const fsEl = byId("render-lower-third-font-size");
    const opEl = byId("render-lower-third-box-opacity");
    const startEl = byId("render-lower-third-start");
    const durEl = byId("render-lower-third-duration");
    if (titleEl) titleEl.value = lt.title;
    if (subEl) subEl.value = lt.subtitle;
    if (posEl) posEl.value = lt.position;
    if (fsEl) fsEl.value = String(lt.font_size);
    if (opEl) opEl.value = Number(lt.box_opacity).toFixed(2);
    if (startEl) startEl.value = Number(lt.start_s).toFixed(1);
    if (durEl) durEl.value = Number(lt.duration_s).toFixed(1);
  }
  const opValEl = byId("render-lower-third-box-opacity-value");
  if (opValEl) {
    opValEl.textContent = Number(lt.box_opacity).toFixed(2);
  }
  const hasText = Boolean(String(lt.title || "").trim() || String(lt.subtitle || "").trim());
  const badgeEl = byId("render-lower-third-badge");
  if (badgeEl) {
    if (!lt.enabled) {
      badgeEl.textContent = "OFF";
      badgeEl.className = "nle-tag mono";
    } else if (hasText) {
      badgeEl.textContent = "ACTIVE";
      badgeEl.className = "nle-tag is-active mono";
    } else {
      badgeEl.textContent = "EMPTY";
      badgeEl.className = "nle-tag mono";
    }
  }
  syncLowerThirdPresetButtons();
  scheduleLowerThirdCompile();
}

function applyLowerThirdPreset(presetId) {
  const preset = LOWER_THIRD_PRESETS[presetId];
  if (!preset) return;
  state.lowerThird = { ...preset };
  syncLowerThirdControlsUI({ syncInputs: true });
  redrawActiveCanvases();
}

function scheduleLowerThirdCompile() {
  if (state.lowerThirdCompileTimer) {
    window.clearTimeout(state.lowerThirdCompileTimer);
  }
  const seq = ++state.lowerThirdCompileSeq;
  state.lowerThirdCompileTimer = window.setTimeout(async () => {
    const previewEl = byId("render-lower-third-preview");
    const payload = getNormalizedLowerThirdPayload();
    if (!payload.enabled || (!payload.title.trim() && !payload.subtitle.trim())) {
      if (previewEl) previewEl.textContent = "(off)";
      return;
    }
    try {
      const compiled = await api.compileLowerThird({ lower_third: payload });
      if (seq !== state.lowerThirdCompileSeq) return;
      if (previewEl) {
        previewEl.textContent = compiled.filtergraph || "(off)";
      }
    } catch (err) {
      if (seq !== state.lowerThirdCompileSeq) return;
      if (previewEl) previewEl.textContent = `Error: ${err.message}`;
    }
  }, 80);
}

function getNormalizedDeliverRetimePayload() {
  const rt = state.deliverRetime;
  const rawSpeed = Number(rt.speed);
  const speed = Number.isFinite(rawSpeed)
    ? Math.min(RETIME_SPEED_MAX, Math.max(RETIME_SPEED_MIN, Number(rawSpeed.toFixed(2))))
    : 1.0;
  const retimeProcess = normalizeRetimeProcess(rt.retime_process);
  const rampPreset = normalizeRetimeRampPreset(rt.ramp_preset);
  const rampPoints = resolveRetimeRampPointsForPreset(rampPreset, rt.ramp_points);
  return {
    enabled: Boolean(rt.enabled),
    speed,
    reverse: Boolean(rt.reverse),
    retime_process: retimeProcess,
    ramp_preset: rampPreset,
    ramp_points: rampPoints
  };
}

function syncDeliverRetimePresetButtons() {
  const rt = getNormalizedDeliverRetimePayload();
  for (const btn of document.querySelectorAll(".retime-deliver-preset-btn[data-deliver-retime-speed]")) {
    const presetVal = Number.parseFloat(btn.getAttribute("data-deliver-retime-speed") || "1");
    const isMatch = rt.ramp_points.length < 2 && Math.abs(presetVal - rt.speed) < 0.005;
    btn.classList.toggle("is-active", isMatch);
    btn.setAttribute("aria-pressed", isMatch ? "true" : "false");
  }
}

function syncDeliverRetimeControlsUI(opts = {}) {
  const rt = getNormalizedDeliverRetimePayload();
  const syncInputs = Boolean(opts.syncInputs);
  const enabledEl = byId("render-retime-enabled");
  if (enabledEl && enabledEl.checked !== rt.enabled) {
    enabledEl.checked = rt.enabled;
  }
  const speedEl = byId("render-retime-speed");
  if (syncInputs && speedEl) {
    speedEl.value = rt.speed.toFixed(2);
  }
  const speedValEl = byId("render-retime-speed-value");
  if (speedValEl) {
    speedValEl.textContent = `${rt.speed.toFixed(2)}x`;
  }
  const procEl = byId("render-retime-process");
  if (procEl) {
    procEl.value = rt.retime_process;
  }
  const rampSelEl = byId("render-retime-ramp-preset");
  if (rampSelEl) {
    rampSelEl.value = rt.ramp_preset === "custom" ? "constant" : rt.ramp_preset;
  }
  const revBtn = byId("render-retime-reverse");
  if (revBtn) {
    revBtn.classList.toggle("is-active", rt.reverse);
    revBtn.setAttribute("aria-pressed", rt.reverse ? "true" : "false");
  }
  const badgeEl = byId("render-retime-badge");
  if (badgeEl) {
    const hasRamp = rt.ramp_points.length >= 2;
    const isActive =
      rt.enabled &&
      (rt.reverse ||
        rt.retime_process !== "nearest" ||
        hasRamp ||
        Math.abs(rt.speed - 1.0) > 1e-6);
    if (!rt.enabled) {
      badgeEl.textContent = "OFF";
      badgeEl.className = "nle-tag mono";
    } else if (isActive) {
      badgeEl.textContent = formatRetimeBadgeText(
        rt.speed,
        rt.reverse,
        rt.retime_process,
        rt.ramp_points
      );
      badgeEl.className = rt.reverse
        ? "nle-tag is-warn mono"
        : rt.retime_process === "optical_flow"
          ? "nle-tag is-blue mono"
          : "nle-tag is-active mono";
    } else {
      badgeEl.textContent = "1.00x";
      badgeEl.className = "nle-tag mono";
    }
  }
  syncDeliverRetimePresetButtons();
  updateDeliverRetimeDurationEstimate();
  scheduleDeliverRetimeCompile();
}

function scheduleDeliverRetimeCompile() {
  if (state.deliverRetimeCompileTimer) {
    window.clearTimeout(state.deliverRetimeCompileTimer);
  }
  const seq = ++state.deliverRetimeCompileSeq;
  state.deliverRetimeCompileTimer = window.setTimeout(async () => {
    const previewEl = byId("render-retime-preview");
    const payload = getNormalizedDeliverRetimePayload();
    const hasRamp = payload.ramp_points.length >= 2;
    if (
      !payload.enabled ||
      (!payload.reverse &&
        payload.retime_process === "nearest" &&
        !hasRamp &&
        Math.abs(payload.speed - 1.0) <= 1e-6)
    ) {
      if (previewEl) previewEl.textContent = "(off)";
      return;
    }
    try {
      const { durationS, timelineFps } = computeDeliverBaseDurationInfo();
      const compiled = await api.compileRetimeFilter({
        ...payload,
        fps: String(Math.round(timelineFps || 25)),
        clip_duration_s: durationS > 0 ? durationS : 10.0
      });
      if (seq !== state.deliverRetimeCompileSeq) return;
      if (previewEl) {
        const parts = [];
        if (compiled.video_filtergraph) parts.push(`-vf ${compiled.video_filtergraph}`);
        if (compiled.audio_filtergraph) parts.push(`-af ${compiled.audio_filtergraph}`);
        previewEl.textContent = parts.length > 0 ? parts.join(" | ") : "(off)";
      }
    } catch (err) {
      if (seq !== state.deliverRetimeCompileSeq) return;
      if (previewEl) previewEl.textContent = `Error: ${err.message}`;
    }
  }, 80);
}

function getNormalizedReframePayload() {
  const rf = state.reframe;
  const allowed = new Set(["source", "16:9", "9:16", "4:5", "1:1", "2.39:1"]);
  const rawRatio = String(rf.aspect_ratio || "source").trim().toLowerCase();
  const ratio = allowed.has(rawRatio) ? rawRatio : "source";
  const rawPx = Number(rf.pan_x);
  const rawPy = Number(rf.pan_y);
  return {
    enabled: Boolean(rf.enabled),
    aspect_ratio: ratio,
    pan_x: Number.isFinite(rawPx) ? Math.min(1.0, Math.max(-1.0, rawPx)) : 0.0,
    pan_y: Number.isFinite(rawPy) ? Math.min(1.0, Math.max(-1.0, rawPy)) : 0.0
  };
}

function syncReframePresetButtons() {
  const rf = getNormalizedReframePayload();
  for (const btn of document.querySelectorAll(".reframe-deliver-preset-btn[data-deliver-reframe-ratio]")) {
    const btnRatio = String(btn.getAttribute("data-deliver-reframe-ratio") || "").trim().toLowerCase();
    const isMatch = rf.aspect_ratio === btnRatio;
    btn.classList.toggle("is-active", isMatch);
    btn.setAttribute("aria-pressed", isMatch ? "true" : "false");
  }
}

function syncReframeControlsUI(opts = {}) {
  const rf = getNormalizedReframePayload();
  const syncInputs = Boolean(opts.syncInputs);
  const enabledEl = byId("render-reframe-enabled");
  if (enabledEl && enabledEl.checked !== rf.enabled) {
    enabledEl.checked = rf.enabled;
  }
  const panXEl = byId("render-reframe-pan-x");
  if (syncInputs && panXEl) {
    panXEl.value = rf.pan_x.toFixed(2);
  }
  const panXValEl = byId("render-reframe-pan-x-value");
  if (panXValEl) {
    panXValEl.textContent = rf.pan_x.toFixed(2);
  }
  const panYEl = byId("render-reframe-pan-y");
  if (syncInputs && panYEl) {
    panYEl.value = rf.pan_y.toFixed(2);
  }
  const panYValEl = byId("render-reframe-pan-y-value");
  if (panYValEl) {
    panYValEl.textContent = rf.pan_y.toFixed(2);
  }
  const badgeEl = byId("render-reframe-badge");
  if (badgeEl) {
    const isActive = rf.enabled && rf.aspect_ratio !== "source";
    if (!rf.enabled || rf.aspect_ratio === "source") {
      badgeEl.textContent = "OFF";
      badgeEl.className = "nle-tag mono";
    } else if (isActive) {
      badgeEl.textContent = rf.aspect_ratio.toUpperCase();
      badgeEl.className = "nle-tag is-active mono";
    }
  }
  syncReframePresetButtons();
  scheduleReframeCompile();
}

function scheduleReframeCompile() {
  if (state.reframeCompileTimer) {
    window.clearTimeout(state.reframeCompileTimer);
  }
  const seq = ++state.reframeCompileSeq;
  state.reframeCompileTimer = window.setTimeout(async () => {
    const previewEl = byId("render-reframe-preview");
    const payload = getNormalizedReframePayload();
    if (!payload.enabled || payload.aspect_ratio === "source") {
      if (previewEl) previewEl.textContent = "(off)";
      return;
    }
    try {
      const compiled = await api.compileReframeFilter({ reframe: payload });
      if (seq !== state.reframeCompileSeq) return;
      if (previewEl) {
        previewEl.textContent = compiled.filtergraph ? `-vf ${compiled.filtergraph}` : "(off)";
      }
    } catch (err) {
      if (seq !== state.reframeCompileSeq) return;
      if (previewEl) previewEl.textContent = `Error: ${err.message}`;
    }
  }, 80);
}

const FILM_GRAIN_PRESET_STRENGTHS = {
  "35mm_fine": 10,
  "16mm_organic": 22,
  "super8_heavy": 38
};

const FILM_GRAIN_BADGE_LABELS = {
  "35mm_fine": "35MM",
  "16mm_organic": "16MM",
  "super8_heavy": "SUPER 8",
  custom: "CUSTOM"
};

function getNormalizedFilmGrainPayload() {
  const fg = state.filmGrain;
  const allowed = new Set(["35mm_fine", "16mm_organic", "super8_heavy", "custom"]);
  const rawPreset = String(fg.preset || "35mm_fine").trim().toLowerCase();
  const preset = allowed.has(rawPreset) ? rawPreset : "35mm_fine";
  const rawStrength = Number(fg.strength);
  const strength = Number.isFinite(rawStrength) ? Math.min(60, Math.max(0, Math.round(rawStrength))) : 12;
  return {
    enabled: Boolean(fg.enabled),
    preset,
    strength,
    temporal: fg.temporal !== undefined ? Boolean(fg.temporal) : true
  };
}

function syncFilmGrainPresetButtons() {
  const fg = getNormalizedFilmGrainPayload();
  for (const btn of document.querySelectorAll(".film-grain-deliver-preset-btn[data-deliver-film-grain-preset]")) {
    const btnPreset = String(btn.getAttribute("data-deliver-film-grain-preset") || "").trim().toLowerCase();
    const isMatch = fg.preset === btnPreset;
    btn.classList.toggle("is-active", isMatch);
    btn.setAttribute("aria-pressed", isMatch ? "true" : "false");
  }
}

function syncFilmGrainControlsUI(opts = {}) {
  const fg = getNormalizedFilmGrainPayload();
  const syncInputs = Boolean(opts.syncInputs);
  const enabledEl = byId("render-film-grain-enabled");
  if (enabledEl && enabledEl.checked !== fg.enabled) {
    enabledEl.checked = fg.enabled;
  }
  const strengthEl = byId("render-film-grain-strength");
  if (syncInputs && strengthEl) {
    strengthEl.value = String(fg.strength);
  }
  const strengthValEl = byId("render-film-grain-strength-value");
  if (strengthValEl) {
    strengthValEl.textContent = String(fg.strength);
  }
  const temporalEl = byId("render-film-grain-temporal");
  if (temporalEl && temporalEl.checked !== fg.temporal) {
    temporalEl.checked = fg.temporal;
  }
  const badgeEl = byId("render-film-grain-badge");
  if (badgeEl) {
    if (!fg.enabled || fg.strength <= 0) {
      badgeEl.textContent = "OFF";
      badgeEl.className = "nle-tag mono";
    } else {
      const tag = FILM_GRAIN_BADGE_LABELS[fg.preset] || "CUSTOM";
      badgeEl.textContent = `${tag} ${fg.strength}`;
      badgeEl.className = "nle-tag is-active mono";
    }
  }
  syncFilmGrainPresetButtons();
  scheduleFilmGrainCompile();
}

function scheduleFilmGrainCompile() {
  if (state.filmGrainCompileTimer) {
    window.clearTimeout(state.filmGrainCompileTimer);
  }
  const seq = ++state.filmGrainCompileSeq;
  state.filmGrainCompileTimer = window.setTimeout(async () => {
    const previewEl = byId("render-film-grain-preview");
    const payload = getNormalizedFilmGrainPayload();
    if (!payload.enabled || payload.strength <= 0) {
      if (previewEl) previewEl.textContent = "(off)";
      return;
    }
    try {
      const compiled = await api.compileFilmGrainFilter({ film_grain: payload });
      if (seq !== state.filmGrainCompileSeq) return;
      if (previewEl) {
        previewEl.textContent = compiled.filtergraph ? `-vf ${compiled.filtergraph}` : "(off)";
      }
    } catch (err) {
      if (seq !== state.filmGrainCompileSeq) return;
      if (previewEl) previewEl.textContent = `Error: ${err.message}`;
    }
  }, 80);
}

const VIGNETTE_PRESET_ANGLES_DEG = {
  subtle_cinema: 18.0,
  moody_portrait: 32.0,
  heavy_noir: 52.0
};

const VIGNETTE_BADGE_LABELS = {
  subtle_cinema: "SUBTLE",
  moody_portrait: "MOODY",
  heavy_noir: "NOIR",
  custom: "CUSTOM"
};

function getNormalizedVignettePayload() {
  const vig = state.vignette;
  const allowedPresets = new Set(["subtle_cinema", "moody_portrait", "heavy_noir", "custom"]);
  const allowedModes = new Set(["forward", "backward"]);
  const rawPreset = String(vig.preset || "subtle_cinema").trim().toLowerCase();
  const preset = allowedPresets.has(rawPreset) ? rawPreset : "subtle_cinema";
  const rawAngle = Number(vig.angle_deg);
  const angle_deg = Number.isFinite(rawAngle) ? Math.min(75.0, Math.max(5.0, rawAngle)) : 24.0;
  const rawMode = String(vig.mode || "forward").trim().toLowerCase();
  const mode = allowedModes.has(rawMode) ? rawMode : "forward";
  return {
    enabled: Boolean(vig.enabled),
    preset,
    angle_deg,
    mode
  };
}

function syncVignettePresetButtons() {
  const vig = getNormalizedVignettePayload();
  for (const btn of document.querySelectorAll(".vignette-deliver-preset-btn[data-deliver-vignette-preset]")) {
    const btnPreset = String(btn.getAttribute("data-deliver-vignette-preset") || "").trim().toLowerCase();
    const isMatch = vig.preset === btnPreset;
    btn.classList.toggle("is-active", isMatch);
    btn.setAttribute("aria-pressed", isMatch ? "true" : "false");
  }
}

function syncVignetteControlsUI(opts = {}) {
  const vig = getNormalizedVignettePayload();
  const syncInputs = Boolean(opts.syncInputs);
  const enabledEl = byId("render-vignette-enabled");
  if (enabledEl && enabledEl.checked !== vig.enabled) {
    enabledEl.checked = vig.enabled;
  }
  const angleEl = byId("render-vignette-angle");
  if (syncInputs && angleEl) {
    angleEl.value = String(vig.angle_deg);
  }
  const angleValEl = byId("render-vignette-angle-value");
  if (angleValEl) {
    angleValEl.textContent = `${vig.angle_deg.toFixed(1)} deg`;
  }
  const modeEl = byId("render-vignette-mode");
  if (syncInputs && modeEl) {
    modeEl.value = vig.mode;
  }
  const badgeEl = byId("render-vignette-badge");
  if (badgeEl) {
    if (!vig.enabled) {
      badgeEl.textContent = "OFF";
      badgeEl.className = "nle-tag mono";
    } else {
      const tag = VIGNETTE_BADGE_LABELS[vig.preset] || "CUSTOM";
      badgeEl.textContent = `${tag} ${vig.angle_deg.toFixed(0)}deg`;
      badgeEl.className = "nle-tag is-active mono";
    }
  }
  syncVignettePresetButtons();
  scheduleVignetteCompile();
}

function scheduleVignetteCompile() {
  if (state.vignetteCompileTimer) {
    window.clearTimeout(state.vignetteCompileTimer);
  }
  const seq = ++state.vignetteCompileSeq;
  state.vignetteCompileTimer = window.setTimeout(async () => {
    const previewEl = byId("render-vignette-preview");
    const payload = getNormalizedVignettePayload();
    if (!payload.enabled) {
      if (previewEl) previewEl.textContent = "(off)";
      return;
    }
    try {
      const compiled = await api.compileVignetteFilter({ vignette: payload });
      if (seq !== state.vignetteCompileSeq) return;
      if (previewEl) {
        previewEl.textContent = compiled.filtergraph ? `-vf ${compiled.filtergraph}` : "(off)";
      }
    } catch (err) {
      if (seq !== state.vignetteCompileSeq) return;
      if (previewEl) previewEl.textContent = `Error: ${err.message}`;
    }
  }, 80);
}

const VOICE_CLEANUP_PRESETS = {
  youtube_voice: { highpass_hz: 85, presence_db: 2.5, de_ess: 0.35 },
  podcast_warm: { highpass_hz: 65, presence_db: 1.5, de_ess: 0.25 },
  broadcast_crisp: { highpass_hz: 110, presence_db: 4.0, de_ess: 0.50 }
};

const VOICE_CLEANUP_BADGE_LABELS = {
  youtube_voice: "YOUTUBE",
  podcast_warm: "PODCAST",
  broadcast_crisp: "BROADCAST",
  custom: "CUSTOM"
};

function getNormalizedVoiceCleanupPayload() {
  const vc = state.voiceCleanup;
  const allowedPresets = new Set(["youtube_voice", "podcast_warm", "broadcast_crisp", "custom"]);
  const rawPreset = String(vc.preset || "youtube_voice").trim().toLowerCase();
  const preset = allowedPresets.has(rawPreset) ? rawPreset : "youtube_voice";
  const rawHp = Number(vc.highpass_hz);
  const highpass_hz = Number.isFinite(rawHp) ? Math.min(200, Math.max(40, Math.round(rawHp))) : 85;
  const rawPres = Number(vc.presence_db);
  const presence_db = Number.isFinite(rawPres) ? Math.min(6.0, Math.max(-6.0, rawPres)) : 2.5;
  const rawDeEss = Number(vc.de_ess);
  const de_ess = Number.isFinite(rawDeEss) ? Math.min(1.0, Math.max(0.0, rawDeEss)) : 0.35;
  return {
    enabled: Boolean(vc.enabled),
    preset,
    highpass_hz,
    presence_db,
    de_ess
  };
}

function syncVoiceCleanupPresetButtons() {
  const vc = getNormalizedVoiceCleanupPayload();
  for (const btn of document.querySelectorAll(".voice-cleanup-deliver-preset-btn[data-deliver-voice-cleanup-preset]")) {
    const btnPreset = String(btn.getAttribute("data-deliver-voice-cleanup-preset") || "").trim().toLowerCase();
    const isMatch = vc.preset === btnPreset;
    btn.classList.toggle("is-active", isMatch);
    btn.setAttribute("aria-pressed", isMatch ? "true" : "false");
  }
}

function syncVoiceCleanupControlsUI(opts = {}) {
  const vc = getNormalizedVoiceCleanupPayload();
  const syncInputs = Boolean(opts.syncInputs);
  const enabledEl = byId("render-voice-cleanup-enabled");
  if (enabledEl && enabledEl.checked !== vc.enabled) {
    enabledEl.checked = vc.enabled;
  }
  const hpEl = byId("render-voice-cleanup-highpass");
  if (syncInputs && hpEl) hpEl.value = String(vc.highpass_hz);
  const hpValEl = byId("render-voice-cleanup-highpass-value");
  if (hpValEl) hpValEl.textContent = `${vc.highpass_hz} Hz`;

  const presEl = byId("render-voice-cleanup-presence");
  if (syncInputs && presEl) presEl.value = String(vc.presence_db);
  const presValEl = byId("render-voice-cleanup-presence-value");
  if (presValEl) {
    const sign = vc.presence_db > 0 ? "+" : "";
    presValEl.textContent = `${sign}${vc.presence_db.toFixed(1)} dB`;
  }

  const deEssEl = byId("render-voice-cleanup-deess");
  if (syncInputs && deEssEl) deEssEl.value = String(vc.de_ess);
  const deEssValEl = byId("render-voice-cleanup-deess-value");
  if (deEssValEl) deEssValEl.textContent = vc.de_ess.toFixed(2);

  const badgeEl = byId("render-voice-cleanup-badge");
  if (badgeEl) {
    if (!vc.enabled) {
      badgeEl.textContent = "OFF";
      badgeEl.className = "nle-tag mono";
    } else {
      const tag = VOICE_CLEANUP_BADGE_LABELS[vc.preset] || "CUSTOM";
      badgeEl.textContent = `${tag} HP${vc.highpass_hz}`;
      badgeEl.className = "nle-tag is-active mono";
    }
  }
  syncVoiceCleanupPresetButtons();
  scheduleVoiceCleanupCompile();
}

function scheduleVoiceCleanupCompile() {
  if (state.voiceCleanupCompileTimer) {
    window.clearTimeout(state.voiceCleanupCompileTimer);
  }
  const seq = ++state.voiceCleanupCompileSeq;
  state.voiceCleanupCompileTimer = window.setTimeout(async () => {
    const previewEl = byId("render-voice-cleanup-preview");
    const payload = getNormalizedVoiceCleanupPayload();
    if (!payload.enabled) {
      if (previewEl) previewEl.textContent = "(off)";
      return;
    }
    try {
      const compiled = await api.compileVoiceCleanupFilter({ voice_cleanup: payload });
      if (seq !== state.voiceCleanupCompileSeq) return;
      if (previewEl) {
        previewEl.textContent = compiled.filtergraph ? `-af ${compiled.filtergraph}` : "(off)";
      }
    } catch (err) {
      if (seq !== state.voiceCleanupCompileSeq) return;
      if (previewEl) previewEl.textContent = `Error: ${err.message}`;
    }
  }, 80);
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
  const audioOnlyEl = byId("render-audio-only-format");
  if (audioOnlyEl) audioOnlyEl.value = "off";
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
  updateDeliverSizeEstimate();
  redrawActiveCanvases();
  showBanner(`${getDeliveryPresetLabel(preset)} (${preset.width}x${preset.height}, ${preset.container.toUpperCase()})`, "info");
}

function countTimelineVideoClips(doc) {
  if (!doc || !Array.isArray(doc.tracks)) return 0;
  let count = 0;
  for (const trk of doc.tracks) {
    if (!trk || trk.kind !== "video" || !Array.isArray(trk.clips)) continue;
    for (const clip of trk.clips) {
      if (!clip || clip.enabled === false) continue;
      if ((Number(clip.duration_frames) || 0) > 0) {
        count += 1;
      }
    }
  }
  return count;
}

function renderDeliverChaptersPreview() {
  const previewEl = byId("deliver-chapters-preview");
  const countEl = byId("deliver-chapters-count");
  const ytBtn = byId("btn-export-yt-chapters");
  const ffBtn = byId("btn-export-ffmetadata");
  const edlBtn = byId("btn-export-cmx-edl");
  const fcpxmlBtn = byId("btn-export-fcpxml");
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
  const hasVideoClips = countTimelineVideoClips(state.timelineDoc) > 0;
  if (edlBtn) edlBtn.disabled = !hasVideoClips;
  if (fcpxmlBtn) fcpxmlBtn.disabled = !hasVideoClips;
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

function exportCmx3600Edl() {
  const clipCount = countTimelineVideoClips(state.timelineDoc);
  if (clipCount === 0) {
    showBanner(t("render.chapters.emptyEdl"), "error");
    return;
  }
  const edlTitle =
    state.timelineDoc && state.timelineDoc.name ? state.timelineDoc.name : "TAKTCUT_TIMELINE";
  const content = formatCmx3600Edl(state.timelineDoc, edlTitle);
  const filename = `${getSafeTimelineStem()}.edl`;
  triggerBlobDownload(new Blob([content], { type: "text/plain; charset=utf-8" }), filename);
  const msg = t("render.chapters.exportedEdl")
    .replace("{filename}", filename)
    .replace("{count}", String(clipCount));
  const feedbackEl = byId("deliver-chapters-feedback");
  if (feedbackEl) feedbackEl.textContent = msg;
  showBanner(msg, "success");
}

function exportFcpxmlTimeline() {
  const clipCount = countTimelineVideoClips(state.timelineDoc);
  if (clipCount === 0) {
    showBanner(t("render.chapters.emptyFcpxml"), "error");
    return;
  }
  const projectName =
    state.timelineDoc && state.timelineDoc.name ? state.timelineDoc.name : "TaktCut_Timeline";
  const content = formatFcpxmlTimeline(state.timelineDoc, projectName);
  const filename = `${getSafeTimelineStem()}.fcpxml`;
  triggerBlobDownload(new Blob([content], { type: "application/xml; charset=utf-8" }), filename);
  const msg = t("render.chapters.exportedFcpxml")
    .replace("{filename}", filename)
    .replace("{count}", String(clipCount));
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
    const stabilizerPayload =
      useStudioFx && !state.fxBypassAll && state.stabilizer.enabled
        ? serializeStabilizerForApi(false)
        : null;
    const planarTrackerPayload =
      useStudioFx && !state.fxBypassAll && state.planarTracker.enabled
        ? serializePlanarTrackerForApi(false)
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
    const clipFadeInfo =
      useClipAudioEl && useClipAudioEl.checked ? getSelectedClipFadePayload() : null;
    const videoFadePayload = clipFadeInfo ? clipFadeInfo.video_fade : null;
    const clipDurationPayload =
      (audioParamsPayload && clipAudioInfo) || (videoFadePayload && (videoFadePayload.fade_in_s > 0 || videoFadePayload.fade_out_s > 0))
        ? (clipAudioInfo ? clipAudioInfo.clipDurationS : clipFadeInfo ? clipFadeInfo.clipDurationS : null)
        : null;

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
    const lowerThirdPayload = getNormalizedLowerThirdPayload();
    const deliverRetimePayload = getNormalizedDeliverRetimePayload();
    const reframePayload = getNormalizedReframePayload();
    const reframeActivePayload =
      reframePayload.enabled && reframePayload.aspect_ratio !== "source" ? reframePayload : null;
    const filmGrainPayload = getNormalizedFilmGrainPayload();
    const filmGrainActivePayload =
      filmGrainPayload.enabled && filmGrainPayload.strength > 0 ? filmGrainPayload : null;
    const vignettePayload = getNormalizedVignettePayload();
    const vignetteActivePayload = vignettePayload.enabled ? vignettePayload : null;
    const voiceCleanupPayload = getNormalizedVoiceCleanupPayload();
    const voiceCleanupActivePayload = voiceCleanupPayload.enabled ? voiceCleanupPayload : null;
    const fairlightRackCompiled = compileFairlightAudioRackClient(state.fairlightRack);
    const fairlightRackActivePayload = !fairlightRackCompiled.is_identity
      ? fairlightRackCompiled.params
      : null;
    const effectiveRetimeParamsPayload = deliverRetimePayload.enabled ? null : retimeParamsPayload;
    const exportFpsEl = byId("render-export-fps");
    const exportFps = exportFpsEl ? exportFpsEl.value : "source";
    const deinterlaceEl = byId("render-deinterlace");
    const deinterlace = deinterlaceEl ? Boolean(deinterlaceEl.checked) : false;
    const audioOnlyEl = byId("render-audio-only-format");
    const audioOnlyFormat = audioOnlyEl ? audioOnlyEl.value : "off";

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
        color_nodes: !lutPath && useStudioCdl ? getSerializedColorNodes() : null,
        chroma_key: chromaKeyPayload,
        stabilizer: stabilizerPayload,
        planar_tracker: planarTrackerPayload,
        fx_stack: fxPayload,
        title_overlay: titlePayload,
        lower_third: lowerThirdPayload.enabled ? lowerThirdPayload : null,
        subtitle_track: subtitlePayload,
        audio_params: audioParamsPayload,
        video_fade: videoFadePayload,
        retime: deliverRetimePayload.enabled ? deliverRetimePayload : null,
        retime_params: effectiveRetimeParamsPayload,
        transform_params: transformParamsPayload,
        framing: framingPayload,
        reframe: reframeActivePayload,
        film_grain: filmGrainActivePayload,
        vignette: vignetteActivePayload,
        voice_cleanup: voiceCleanupActivePayload,
        fairlight_rack: fairlightRackActivePayload,
        clip_duration_s: clipDurationPayload,
        target_lufs: targetLufs,
        loudness_preset: fairlightPayload.loudness_preset,
        dialogue_eq: fairlightPayload.dialogue_eq,
        timecode_burnin: timecodeBurnin,
        review_watermark_text: reviewWatermarkText,
        review_watermark_opacity: reviewWatermarkOpacity,
        export_fps: exportFps,
        deinterlace,
        audio_only_format: audioOnlyFormat,
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
      color_nodes: !lutPath && useStudioCdl ? getSerializedColorNodes() : null,
      chroma_key: chromaKeyPayload,
      stabilizer: stabilizerPayload,
      planar_tracker: planarTrackerPayload,
      fx_stack: fxPayload,
      title_overlay: titlePayload,
      lower_third: lowerThirdPayload.enabled ? lowerThirdPayload : null,
      subtitle_track: subtitlePayload,
      audio_params: audioParamsPayload,
      video_fade: videoFadePayload,
      retime: deliverRetimePayload.enabled ? deliverRetimePayload : null,
      retime_params: effectiveRetimeParamsPayload,
      transform_params: transformParamsPayload,
      framing: framingPayload,
      reframe: reframeActivePayload,
      film_grain: filmGrainActivePayload,
      vignette: vignetteActivePayload,
      voice_cleanup: voiceCleanupActivePayload,
      fairlight_rack: fairlightRackActivePayload,
      clip_duration_s: clipDurationPayload,
      target_lufs: targetLufs,
      loudness_preset: fairlightPayload.loudness_preset,
      dialogue_eq: fairlightPayload.dialogue_eq,
      timecode_burnin: timecodeBurnin,
      review_watermark_text: reviewWatermarkText,
      review_watermark_opacity: reviewWatermarkOpacity,
      export_fps: exportFps,
      deinterlace,
      audio_only_format: audioOnlyFormat,
      prefer_hw: preferHw,
      execute
    };
    const data = await api.buildOrExecuteRender(body);
    const plan = data.plan;
    state.lastRenderCommand = data.shell_command || plan.argv.join(" ");

    const planIsAudioOnly = Boolean(plan.audio_only_format && plan.audio_only_format !== "off");
    byId("render-encoder-badge").textContent = planIsAudioOnly
      ? `${plan.encoder} / ${plan.audio_only_format}`
      : `${plan.encoder} / ${plan.pix_fmt}`;
    byId("render-encoder-badge").className = "nle-tag is-active mono";

    const fpsLabel = plan.fps.den === 1 ? String(plan.fps.num) : `${plan.fps.num}/${plan.fps.den}`;
    const rasterLabel = planIsAudioOnly
      ? "Audio-Only (-vn)"
      : plan.target_width && plan.target_height
        ? `${plan.target_width}x${plan.target_height} (${plan.framing_mode || "fill"})`
        : "Source (Native)";
    const qualityLabel = planIsAudioOnly
      ? "Audio-Only (-vn)"
      : plan.video_crf !== null && plan.video_crf !== undefined
        ? `CRF ${plan.video_crf} (${plan.encoder_preset || "medium"})`
        : "ProRes 422 HQ (10-bit)";
    const audioBitrateLabel =
      plan.audio_only_format === "wav24"
        ? "WAV PCM 24-bit 48 kHz"
        : plan.audio_only_format === "mp3_320"
          ? "MP3 320 kbps (libmp3lame)"
          : plan.audio_only_format === "aac_256"
            ? "AAC 256 kbps"
            : plan.audio_bitrate_kbps
              ? `AAC ${plan.audio_bitrate_kbps} kbps`
              : "PCM 24-bit 48 kHz";
    const presetObj = plan.delivery_preset
      ? getDeliveryPresetsList().find((p) => p.id === plan.delivery_preset)
      : null;
    renderKv(byId("render-plan-kv"), [
      ["Preset", presetObj ? getDeliveryPresetLabel(presetObj) : t("render.presets.custom")],
      ["Profile", plan.profile],
      [t("render.plan.audioOnly"), plan.audio_only_format || "off"],
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
      [
        t("render.plan.lowerThird"),
        plan.lower_third_enabled
          ? `${plan.lower_third_title || plan.lower_third_subtitle} (${plan.lower_third_position})`
          : "off"
      ],
      [
        t("render.plan.retime"),
        plan.retime_enabled
          ? `${Number(plan.retime_speed ?? 1).toFixed(2)}x${
              plan.retime_ramp_preset && plan.retime_ramp_preset !== "constant"
                ? ` ${plan.retime_ramp_preset}`
                : ""
            }${plan.retime_process && plan.retime_process !== "nearest" ? ` (${plan.retime_process})` : ""}${
              plan.retime_reverse ? " REV" : ""
            }`
          : "off"
      ],
      [
        t("render.plan.reframe"),
        plan.reframe_enabled
          ? `${plan.reframe_aspect_ratio} (${Number(plan.reframe_pan_x ?? 0).toFixed(2)}, ${Number(plan.reframe_pan_y ?? 0).toFixed(2)})`
          : "off"
      ],
      [
        t("render.plan.filmGrain"),
        plan.film_grain_enabled
          ? `${plan.film_grain_preset} (${plan.film_grain_strength}, ${plan.film_grain_temporal ? "T+U" : "U"})`
          : "off"
      ],
      [
        t("render.plan.vignette"),
        plan.vignette_enabled
          ? `${plan.vignette_preset} (${Number(plan.vignette_angle_deg ?? 24).toFixed(1)} deg, ${plan.vignette_mode})`
          : "off"
      ],
      [
        t("render.plan.voiceCleanup"),
        plan.voice_cleanup_enabled
          ? `${plan.voice_cleanup_preset} (HP ${plan.voice_cleanup_highpass_hz}Hz, ${Number(plan.voice_cleanup_presence_db ?? 2.5) >= 0 ? "+" : ""}${Number(plan.voice_cleanup_presence_db ?? 2.5).toFixed(1)}dB, DS ${Number(plan.voice_cleanup_de_ess ?? 0.35).toFixed(2)})`
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

function getTimelineToolLabel(tool) {
  switch (tool) {
    case "trim":
      return "RIPPLE (T)";
    case "roll":
      return "ROLL (R)";
    case "slip":
      return "SLIP (Y)";
    case "slide":
      return "SLIDE (U)";
    case "blade":
      return "BLADE (B)";
    default:
      return "SELECT (A)";
  }
}

function renderTimelineEditNudgeInspector() {
  const modePill = byId("timeline-edit-mode-pill");
  const syncPill = byId("timeline-sync-lock-pill");
  const edgeInBtn = byId("btn-nudge-edge-in");
  const edgeOutBtn = byId("btn-nudge-edge-out");
  const readoutEl = byId("timeline-edit-nudge-readout");
  const stepBtns = document.querySelectorAll("[data-nudge-delta]");

  const tool = normalizeTimelineTool(state.timelineTool);
  if (modePill) {
    modePill.textContent = getTimelineToolLabel(tool);
  }
  const totalTracks = state.timelineDoc && Array.isArray(state.timelineDoc.tracks)
    ? state.timelineDoc.tracks.length
    : 0;
  const lockedTracks = countSyncLockedTracks(state.timelineDoc);
  if (syncPill) {
    syncPill.textContent = `${lockedTracks}/${totalTracks} SYNC`;
    syncPill.className = `nle-tag mono ${lockedTracks > 0 ? "is-snap" : ""}`;
  }

  const showEdge = tool === "trim" || tool === "roll";
  if (edgeInBtn) {
    edgeInBtn.classList.toggle("is-active", state.timelineNudgeEdge === "left");
    edgeInBtn.setAttribute("aria-pressed", state.timelineNudgeEdge === "left" ? "true" : "false");
    edgeInBtn.disabled = !showEdge;
  }
  if (edgeOutBtn) {
    edgeOutBtn.classList.toggle("is-active", state.timelineNudgeEdge === "right");
    edgeOutBtn.setAttribute("aria-pressed", state.timelineNudgeEdge === "right" ? "true" : "false");
    edgeOutBtn.disabled = !showEdge;
  }

  const ref = getSelectedClipRef();
  const canNudge = Boolean(ref && tool !== "blade");
  for (const btn of stepBtns) {
    btn.disabled = !canNudge;
  }
  if (readoutEl) {
    if (!ref) {
      readoutEl.textContent = t("timeline.editNudge.idle");
    } else {
      const found = findTrackAndClip(state.timelineDoc, ref.trackKind, ref.trackIndex, ref.clipIndex);
      const clip = found ? found.clip : null;
      const base = clip
        ? `Start ${clip.start_frame}f | Dur ${clip.duration_frames}f | SrcIn ${clip.source_in_frame || 0}f`
        : "";
      readoutEl.textContent = state.timelineLastEditReadout
        ? `${state.timelineLastEditReadout} (${base})`
        : base;
    }
  }
}

function setNudgeEdge(edge) {
  state.timelineNudgeEdge = edge === "left" ? "left" : "right";
  renderTimelineEditNudgeInspector();
}

function nudgeSelectedClipAction(deltaFrames) {
  const ref = getSelectedClipRef();
  if (!ref || !state.timelineDoc) return false;
  const tool = normalizeTimelineTool(state.timelineTool);
  if (tool === "blade") return false;
  const delta = Math.round(Number(deltaFrames) || 0);
  if (delta === 0) return false;

  let nextDoc = state.timelineDoc;
  let focusClip = null;
  let changed = false;
  let detail = "";

  if (tool === "trim") {
    const res = rippleTrimClipInDocument(
      state.timelineDoc,
      ref.trackKind,
      ref.trackIndex,
      ref.clipIndex,
      state.timelineNudgeEdge,
      delta
    );
    changed = res.changed;
    nextDoc = res.doc;
    focusClip = res.clip;
    detail = res.detail;
  } else if (tool === "roll") {
    const target = findAdjacentRollTarget(
      state.timelineDoc,
      ref.trackKind,
      ref.trackIndex,
      ref.clipIndex,
      state.timelineNudgeEdge
    );
    if (!target) {
      state.timelineLastEditReadout = "Roll requires adjacent clip at cut edge.";
      renderTimelineEditNudgeInspector();
      return false;
    }
    const res = rollEditCutInDocument(
      state.timelineDoc,
      target.trackKind,
      target.trackIndex,
      target.leftClipIndex,
      delta
    );
    changed = res.changed;
    nextDoc = res.doc;
    focusClip = state.timelineNudgeEdge === "left" ? res.rightClip : res.leftClip;
    detail = res.detail;
  } else if (tool === "slip") {
    const res = slipClipInDocument(
      state.timelineDoc,
      ref.trackKind,
      ref.trackIndex,
      ref.clipIndex,
      delta
    );
    changed = res.changed;
    nextDoc = res.doc;
    focusClip = res.clip;
    detail = res.detail;
  } else if (tool === "slide") {
    const res = slideClipInDocument(
      state.timelineDoc,
      ref.trackKind,
      ref.trackIndex,
      ref.clipIndex,
      delta
    );
    changed = res.changed;
    nextDoc = res.doc;
    focusClip = res.clip;
    detail = res.detail;
  } else {
    const res = moveClipInDocument(
      state.timelineDoc,
      ref.trackKind,
      ref.trackIndex,
      ref.clipIndex,
      delta
    );
    changed = res.changed;
    nextDoc = res.doc;
    focusClip = res.clip;
    detail = res.detail;
  }

  state.timelineLastEditReadout = detail || "";
  if (!changed) {
    renderTimelineEditNudgeInspector();
    return false;
  }
  const nextSel = focusClip ? { kind: "clip", data: focusClip } : preserveSelectionAcrossDoc(nextDoc);
  commitTimelineMutation(nextDoc, nextSel);
  return true;
}

function updateTimelineToolbarUI() {
  const selectBtn = byId("btn-tool-select");
  const trimBtn = byId("btn-tool-trim");
  const rollBtn = byId("btn-tool-roll");
  const slipBtn = byId("btn-tool-slip");
  const slideBtn = byId("btn-tool-slide");
  const bladeBtn = byId("btn-tool-blade");
  const snapBtn = byId("btn-timeline-snap");
  const syncLockBtn = byId("btn-timeline-sync-lock");
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

  const tool = normalizeTimelineTool(state.timelineTool);
  const isBlade = tool === "blade";
  const toolBtns = [
    [selectBtn, "select"],
    [trimBtn, "trim"],
    [rollBtn, "roll"],
    [slipBtn, "slip"],
    [slideBtn, "slide"],
    [bladeBtn, "blade"]
  ];
  for (const [btn, key] of toolBtns) {
    if (!btn) continue;
    const active = tool === key;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  }
  if (snapBtn) {
    snapBtn.classList.toggle("is-active", state.timelineSnapEnabled);
    snapBtn.setAttribute("aria-pressed", state.timelineSnapEnabled ? "true" : "false");
  }
  const totalTracks = state.timelineDoc && Array.isArray(state.timelineDoc.tracks)
    ? state.timelineDoc.tracks.length
    : 0;
  const lockedTracks = countSyncLockedTracks(state.timelineDoc);
  if (syncLockBtn) {
    const anyLocked = lockedTracks > 0;
    syncLockBtn.classList.toggle("is-active", anyLocked);
    syncLockBtn.setAttribute("aria-pressed", anyLocked ? "true" : "false");
    syncLockBtn.disabled = !state.timelineDoc;
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
    const modeLabel = getTimelineToolLabel(tool);
    const snapLabel = state.timelineSnapEnabled ? " | SNAP (N)" : "";
    const syncLabel = totalTracks > 0 ? ` | SYNC ${lockedTracks}/${totalTracks}` : "";
    const bpmLabel = state.bpmGrid.enabled ? ` | ${state.bpmGrid.bpm} BPM` : "";
    toolBadge.textContent = `${modeLabel}${snapLabel}${syncLabel}${bpmLabel}`;
    toolBadge.className = `nle-tag mono ${
      isBlade ? "is-blade" : state.timelineSnapEnabled ? "is-snap" : ""
    }`;
  }
  if (tlCanvas) {
    tlCanvas.classList.toggle("is-blade-mode", isBlade);
  }
  renderTimelineEditNudgeInspector();
}

function setTimelineTool(tool) {
  const next = normalizeTimelineTool(tool);
  state.timelineTool = next;
  if (next !== "blade") {
    state.timelineBladePreview = null;
  }
  if (next === "blade") {
    state.timelineActiveSnapFrame = null;
    state.timelineActiveSnapKind = null;
  }
  state.timelineActiveEditHud = null;
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
  if (state.timelineZoom > 1 && state.timelineDoc) {
    const startFrame = state.timelineDoc.start_frame || 0;
    const vp = computeTimelineZoomViewport(
      startFrame,
      state.timelineMaxFrame,
      state.timelineZoom,
      state.playheadFrame,
      state.timelineViewStartFrame
    );
    state.timelineViewStartFrame = vp.viewStartFrame;
  }
  updatePlayheadReadout();
  updateTimelineToolbarUI();
  if (state.mediaPoolSourceTape) {
    syncSourceTapeScrubToPlayhead();
  }
  if (state.colorPowerWindowTrack.linked) {
    syncLinkedPowerWindowAtPlayhead();
  }
  if (state.activeTab === "fx") {
    syncPlanarTrackerAndStabilizerUi();
  }
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
  updateDeliverSizeEstimate();
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
      { kbd: "Shift+H", descKey: "shortcuts.key.qualHighlight" },
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

  if (
    !ev.ctrlKey &&
    !ev.metaKey &&
    !ev.altKey &&
    ev.shiftKey &&
    lower === "h" &&
    state.activeTab === "color"
  ) {
    ev.preventDefault();
    toggleQualifierHighlight();
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
    } else if (state.activeTab === "color" && !ev.ctrlKey && !ev.metaKey && lower === "o") {
      ev.preventDefault();
      addOutsideColorNodeAction();
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
    if (lower === "t") {
      ev.preventDefault();
      setTimelineTool(state.timelineTool === "trim" ? "select" : "trim");
      return;
    }
    if (lower === "r") {
      ev.preventDefault();
      setTimelineTool(state.timelineTool === "roll" ? "select" : "roll");
      return;
    }
    if (lower === "y") {
      ev.preventDefault();
      setTimelineTool(state.timelineTool === "slip" ? "select" : "slip");
      return;
    }
    if (lower === "u") {
      ev.preventDefault();
      setTimelineTool(state.timelineTool === "slide" ? "select" : "slide");
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
    if (ev.key === "Escape" && state.timelineTool !== "select") {
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

function bindTimelineOverviewCanvas(canvas) {
  if (!canvas) return;
  const ovPtr = { active: false, pointerId: null };

  const scrubAt = (ev) => {
    const ov = state.timelineOverviewDraw;
    if (!state.timelineDoc || !ov || typeof ov.xToFrame !== "function") return;
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const frame = ov.xToFrame(x);
    if (state.timelineZoom > 1) {
      const vp = computeTimelineZoomViewport(
        ov.startFrame,
        ov.maxFrame,
        state.timelineZoom,
        frame,
        null
      );
      state.timelineViewStartFrame = vp.viewStartFrame;
    }
    setPlayhead(frame);
  };

  canvas.addEventListener("pointerdown", (ev) => {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    stopPlayback();
    ovPtr.active = true;
    ovPtr.pointerId = ev.pointerId;
    if (canvas.setPointerCapture) {
      try {
        canvas.setPointerCapture(ev.pointerId);
      } catch {
        // Ignore synthetic pointer events
      }
    }
    scrubAt(ev);
  });

  canvas.addEventListener("pointermove", (ev) => {
    if (!ovPtr.active || (ovPtr.pointerId !== null && ev.pointerId !== ovPtr.pointerId)) return;
    scrubAt(ev);
  });

  const endDrag = (ev) => {
    if (!ovPtr.active || (ovPtr.pointerId !== null && ev.pointerId !== ovPtr.pointerId)) return;
    ovPtr.active = false;
    ovPtr.pointerId = null;
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
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
    if (railHit && railHit.kind === "track_sync_lock" && railHit.box) {
      toggleTrackSyncLockAction(railHit.box.trackKind, railHit.box.trackIndex);
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

    if (
      (state.timelineTool === "trim" ||
        state.timelineTool === "roll" ||
        state.timelineTool === "slip" ||
        state.timelineTool === "slide") &&
      inTrackArea
    ) {
      const hit = hitTestTimeline(x, y, { includeTrim: true, includeFade: false });
      if (hit && (hit.kind === "trim" || hit.kind === "clip") && hit.box) {
        const edge =
          hit.kind === "trim"
            ? hit.edge
            : x - hit.box.x < hit.box.w * 0.5
              ? "left"
              : "right";
        const origDoc = cloneTimelineDoc(state.timelineDoc);
        const foundOrig = findTrackAndClip(
          origDoc,
          hit.box.trackKind,
          hit.box.trackIndex,
          hit.box.clipIndex
        );
        if (foundOrig) {
          const rawStartFrame = state.timelineXToRawFrame
            ? Math.round(state.timelineXToRawFrame(x))
            : state.timelineXToFrame(x);
          if (state.timelineTool === "roll") {
            const rollTarget =
              findAdjacentRollTarget(origDoc, hit.box.trackKind, hit.box.trackIndex, hit.box.clipIndex, edge) ||
              findAdjacentRollTarget(
                origDoc,
                hit.box.trackKind,
                hit.box.trackIndex,
                hit.box.clipIndex,
                edge === "left" ? "right" : "left"
              );
            if (rollTarget) {
              ptr.mode = "roll";
              ptr.editTarget = { ...rollTarget, x, y: hit.box.y };
              ptr.startFrame = rawStartFrame;
              ptr.preSnapshot = captureTimelineSnapshot();
              ptr.origDoc = origDoc;
              state.timelineDragFixedMaxFrame = Math.max(
                state.timelineMaxFrame,
                computeTimelineMaxFrame(origDoc)
              );
              state.timelineActiveTrim = {
                trackKind: rollTarget.trackKind,
                trackIndex: rollTarget.trackIndex,
                clipIndex: rollTarget.leftClipIndex,
                edge: "right"
              };
              state.timelineActiveEditHud = {
                op: "roll",
                label: "ROLL 0f",
                detail: `OUT ${rollTarget.leftClip.duration_frames}f | IN ${rollTarget.rightClip.duration_frames}f`,
                color: "#39c5cf",
                x,
                y: hit.box.y
              };
              canvas.classList.add("is-trimming");
              redrawActiveCanvases();
              return;
            }
          } else {
            const mode = state.timelineTool === "trim" ? "ripple_trim" : state.timelineTool;
            ptr.mode = mode;
            ptr.editTarget = {
              trackKind: hit.box.trackKind,
              trackIndex: hit.box.trackIndex,
              clipIndex: hit.box.clipIndex,
              edge,
              origEdgeFrame:
                edge === "left"
                  ? foundOrig.clip.start_frame
                  : foundOrig.clip.start_frame + foundOrig.clip.duration_frames,
              x,
              y: hit.box.y
            };
            ptr.startFrame = rawStartFrame;
            ptr.preSnapshot = captureTimelineSnapshot();
            ptr.origDoc = origDoc;
            state.timelineDragFixedMaxFrame = Math.max(
              state.timelineMaxFrame,
              computeTimelineMaxFrame(origDoc)
            );
            state.timelineActiveTrim = {
              trackKind: hit.box.trackKind,
              trackIndex: hit.box.trackIndex,
              clipIndex: hit.box.clipIndex,
              edge
            };
            const hudCol =
              mode === "ripple_trim" ? "#f59e0b" : mode === "slip" ? "#ffd166" : "#5eead4";
            state.timelineActiveEditHud = {
              op: mode,
              label: mode === "ripple_trim" ? "RIPPLE 0f" : mode === "slip" ? "SLIP 0f" : "SLIDE 0f",
              detail: `DUR ${foundOrig.clip.duration_frames}f | SRC IN ${foundOrig.clip.source_in_frame || 0}f`,
              color: hudCol,
              x,
              y: hit.box.y
            };
            canvas.classList.add("is-trimming");
            redrawActiveCanvases();
            return;
          }
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
          const isMsBtn =
            railHover &&
            (railHover.kind === "track_mute" ||
              railHover.kind === "track_solo" ||
              railHover.kind === "track_sync_lock");
          const isEditTool =
            state.timelineTool === "trim" ||
            state.timelineTool === "roll" ||
            state.timelineTool === "slip" ||
            state.timelineTool === "slide";
          const toolCursor =
            state.timelineTool === "trim" || state.timelineTool === "roll"
              ? "ew-resize"
              : state.timelineTool === "slip" || state.timelineTool === "slide"
                ? "grab"
                : "crosshair";
          canvas.style.cursor = isMsBtn
            ? "pointer"
            : nearPh
              ? "ew-resize"
              : isEditTool && inTrackArea
                ? toolCursor
                : "crosshair";
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

    if (
      (ptr.mode === "ripple_trim" ||
        ptr.mode === "roll" ||
        ptr.mode === "slip" ||
        ptr.mode === "slide") &&
      ptr.editTarget &&
      ptr.origDoc
    ) {
      const tgt = ptr.editTarget;
      const rawNow = state.timelineXToRawFrame
        ? Math.round(state.timelineXToRawFrame(x))
        : state.timelineXToFrame(x);
      const rawDelta = rawNow - (ptr.startFrame || 0);
      let nextDoc = cloneTimelineDoc(ptr.origDoc);
      let focusClip = null;
      let hud = null;

      if (ptr.mode === "ripple_trim") {
        const res = rippleTrimClipInDocument(
          ptr.origDoc,
          tgt.trackKind,
          tgt.trackIndex,
          tgt.clipIndex,
          tgt.edge,
          rawDelta
        );
        if (res.changed) nextDoc = res.doc;
        focusClip =
          findTrackAndClip(nextDoc, tgt.trackKind, tgt.trackIndex, tgt.clipIndex)?.clip || null;
        const syncTag = res.syncLockedTracks > 0 ? ` | SYNC ${res.syncLockedTracks}` : "";
        hud = {
          op: "ripple_trim",
          label: `RIPPLE ${res.deltaApplied >= 0 ? `+${res.deltaApplied}` : res.deltaApplied}f`,
          detail: focusClip
            ? `DUR ${focusClip.duration_frames}f | SRC IN ${focusClip.source_in_frame || 0}f${syncTag}`
            : res.detail,
          color: "#f59e0b",
          x,
          y: tgt.y
        };
      } else if (ptr.mode === "roll") {
        const res = rollEditCutInDocument(
          ptr.origDoc,
          tgt.trackKind,
          tgt.trackIndex,
          tgt.leftClipIndex,
          rawDelta
        );
        if (res.changed) nextDoc = res.doc;
        const leftC = findTrackAndClip(nextDoc, tgt.trackKind, tgt.trackIndex, tgt.leftClipIndex)?.clip;
        const rightC = findTrackAndClip(nextDoc, tgt.trackKind, tgt.trackIndex, tgt.rightClipIndex)?.clip;
        focusClip = leftC || rightC || null;
        hud = {
          op: "roll",
          label: `ROLL ${res.deltaApplied >= 0 ? `+${res.deltaApplied}` : res.deltaApplied}f`,
          detail: leftC && rightC ? `OUT ${leftC.duration_frames}f | IN ${rightC.duration_frames}f` : res.detail,
          color: "#39c5cf",
          x,
          y: tgt.y
        };
      } else if (ptr.mode === "slip") {
        const res = slipClipInDocument(
          ptr.origDoc,
          tgt.trackKind,
          tgt.trackIndex,
          tgt.clipIndex,
          rawDelta
        );
        if (res.changed) nextDoc = res.doc;
        focusClip =
          findTrackAndClip(nextDoc, tgt.trackKind, tgt.trackIndex, tgt.clipIndex)?.clip || null;
        hud = {
          op: "slip",
          label: `SLIP ${res.deltaApplied >= 0 ? `+${res.deltaApplied}` : res.deltaApplied}f`,
          detail: focusClip ? `SRC IN ${focusClip.source_in_frame || 0}f | DUR ${focusClip.duration_frames}f` : res.detail,
          color: "#ffd166",
          x,
          y: tgt.y
        };
      } else if (ptr.mode === "slide") {
        const res = slideClipInDocument(
          ptr.origDoc,
          tgt.trackKind,
          tgt.trackIndex,
          tgt.clipIndex,
          rawDelta
        );
        if (res.changed) nextDoc = res.doc;
        focusClip =
          findTrackAndClip(nextDoc, tgt.trackKind, tgt.trackIndex, tgt.clipIndex)?.clip || null;
        hud = {
          op: "slide",
          label: `SLIDE ${res.deltaApplied >= 0 ? `+${res.deltaApplied}` : res.deltaApplied}f`,
          detail: focusClip ? `START ${focusClip.start_frame}f | DUR ${focusClip.duration_frames}f` : res.detail,
          color: "#5eead4",
          x,
          y: tgt.y
        };
      }

      state.timelineDoc = nextDoc;
      state.timelineValidation = validateTimelineClient(nextDoc);
      state.timelineActiveEditHud = hud;
      state.timelineLastEditReadout = hud ? `${hud.label} (${hud.detail})` : "";
      if (focusClip) {
        state.timelineSelected = { kind: "clip", data: focusClip };
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
    const wasAdvancedEdit =
      ptr.mode === "ripple_trim" ||
      ptr.mode === "roll" ||
      ptr.mode === "slip" ||
      ptr.mode === "slide";
    const wasMoved = ptr.moved;
    const preSnap = ptr.preSnapshot;
    const trimTarget = ptr.trimTarget;
    const fadeTarget = ptr.fadeTarget;
    const editTarget = ptr.editTarget;

    ptr.active = false;
    ptr.pointerId = null;
    ptr.mode = null;
    ptr.trimTarget = null;
    ptr.fadeTarget = null;
    ptr.editTarget = null;
    ptr.startFrame = 0;
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

    if (wasAdvancedEdit) {
      state.timelineActiveTrim = null;
      state.timelineActiveEditHud = null;
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
      if (!wasMoved && preSnap && editTarget) {
        const idx = editTarget.leftClipIndex !== undefined ? editTarget.leftClipIndex : editTarget.clipIndex;
        const origFound = findTrackAndClip(
          preSnap.doc,
          editTarget.trackKind,
          editTarget.trackIndex,
          idx
        );
        state.timelineDoc = preSnap.doc;
        state.timelineValidation = validateTimelineClient(preSnap.doc);
        if (origFound) {
          state.timelineSelected = { kind: "clip", data: origFound.clip };
        }
        renderTimelineUI();
        return;
      }
      if (preSnap && editTarget) {
        const changed = JSON.stringify(preSnap.doc) !== JSON.stringify(state.timelineDoc);
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
            kind: match.kind === "clip_keyframe" ? "clip" : match.kind,
            markerIndex: match.kind === "marker" && match.box ? match.box.markerIndex : undefined,
            data: match.data
          }
        : null;
      if (match && match.kind === "clip_keyframe" && match.box) {
        state.playheadFrame = match.box.frame;
        updatePlayheadReadout();
      } else if (match && match.kind === "transition" && match.box) {
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

  for (const btn of document.querySelectorAll(".fade-quick-btn")) {
    btn.addEventListener("click", () => {
      const info = getSelectedClipTrack();
      if (!info) return;
      const edge = btn.getAttribute("data-fade-quick");
      const val = Number.parseFloat(btn.getAttribute("data-fade-val") || "0");
      if (!Number.isFinite(val)) return;
      const patch = edge === "out" ? { fade_out_s: val } : { fade_in_s: val };
      const res = updateClipAudioInDocument(
        state.timelineDoc,
        info.ref.trackKind,
        info.ref.trackIndex,
        info.ref.clipIndex,
        patch
      );
      if (res.changed) {
        commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
      }
    });
  }

  const fadeResetAllBtn = byId("btn-clip-fade-reset-all");
  if (fadeResetAllBtn) {
    fadeResetAllBtn.addEventListener("click", () => {
      const info = getSelectedClipTrack();
      if (!info) return;
      const res = updateClipAudioInDocument(
        state.timelineDoc,
        info.ref.trackKind,
        info.ref.trackIndex,
        info.ref.clipIndex,
        { fade_in_s: 0, fade_out_s: 0 }
      );
      if (res.changed) {
        commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
      }
    });
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
      setMasterBusState({ voice_isolation: false });
    });
  }
  const isoBtn = byId("btn-fairlight-voice-iso");
  if (isoBtn) {
    isoBtn.addEventListener("click", () => {
      const nextIso = !(state.masterBus.voice_isolation || state.voiceCleanup.enabled);
      setMasterBusState({ voice_isolation: nextIso });
    });
  }
  const mixerResetBtn = byId("btn-mixer-reset");
  if (mixerResetBtn) {
    mixerResetBtn.addEventListener("click", () => {
      resetMixerConsoleAction();
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
  const procEl = byId("clip-retime-process");
  const sendBtn = byId("btn-clip-retime-to-deliver");
  const presetBtns = document.querySelectorAll(".retime-preset-btn");
  const rampPresetBtns = document.querySelectorAll(".retime-ramp-preset-btn");
  const rampCanvas = byId("clip-retime-ramp-canvas");
  const rampAddBtn = byId("btn-retime-point-add");
  const rampDelBtn = byId("btn-retime-point-del");
  const rampRstBtn = byId("btn-retime-ramp-reset");
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
      state.retimeRampSelectedIdx = -1;
      const res = updateClipRetimeInDocument(
        state.timelineDoc,
        info.ref.trackKind,
        info.ref.trackIndex,
        info.ref.clipIndex,
        {
          speed_rate: speedVal,
          retime_ramp_preset: "constant",
          retime_ramp_points: []
        }
      );
      if (res.changed) {
        commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
      }
    });
  }

  for (const btn of rampPresetBtns) {
    btn.addEventListener("click", () => {
      const info = getSelectedClipTrack();
      if (!info) return;
      const presetId = btn.getAttribute("data-retime-ramp-preset") || "constant";
      const pts = resolveRetimeRampPointsForPreset(presetId, []);
      state.retimeRampSelectedIdx = pts.length >= 2 ? 1 : -1;
      const res = updateClipRetimeInDocument(
        state.timelineDoc,
        info.ref.trackKind,
        info.ref.trackIndex,
        info.ref.clipIndex,
        {
          retime_ramp_preset: presetId,
          retime_ramp_points: pts
        }
      );
      if (res.changed) {
        commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
      } else {
        renderTimelineRetimeInspector();
      }
    });
  }

  if (procEl) {
    procEl.addEventListener("change", () => {
      const info = getSelectedClipTrack();
      if (!info) return;
      const res = updateClipRetimeInDocument(
        state.timelineDoc,
        info.ref.trackKind,
        info.ref.trackIndex,
        info.ref.clipIndex,
        { retime_process: procEl.value }
      );
      if (res.changed) {
        commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
      }
    });
  }

  const addRampPointAt = (posNorm, speedRate) => {
    const info = getSelectedClipTrack();
    if (!info) return;
    const norm = normalizeClipRetime(info.clip);
    const basePts =
      norm.rampPoints.length >= 2
        ? norm.rampPoints.map((pt) => ({ ...pt }))
        : [
            { pos_norm: 0.0, speed_rate: norm.speedRate },
            { pos_norm: 1.0, speed_rate: norm.speedRate }
          ];
    const u = Math.max(0.0, Math.min(1.0, Number(posNorm)));
    const spd =
      speedRate !== undefined
        ? Math.max(RETIME_SPEED_MIN, Math.min(RETIME_SPEED_MAX, Number(speedRate)))
        : evaluateRetimeSpeedAt(basePts, u, norm.speedRate);
    basePts.push({ pos_norm: Number(u.toFixed(4)), speed_rate: Number(spd.toFixed(2)) });
    const nextPts = normalizeRetimeRampPoints(basePts);
    let selIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < nextPts.length; i++) {
      const d = Math.abs(nextPts[i].pos_norm - u);
      if (d < bestD) {
        bestD = d;
        selIdx = i;
      }
    }
    state.retimeRampSelectedIdx = selIdx;
    const res = updateClipRetimeInDocument(
      state.timelineDoc,
      info.ref.trackKind,
      info.ref.trackIndex,
      info.ref.clipIndex,
      { retime_ramp_preset: "custom", retime_ramp_points: nextPts }
    );
    if (res.changed) {
      commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
    }
  };

  if (rampAddBtn) {
    rampAddBtn.addEventListener("click", () => {
      const info = getSelectedClipTrack();
      if (!info) return;
      const dur = Math.max(1, Number(info.clip.duration_frames || 1));
      const local = state.playheadFrame - Number(info.clip.start_frame || 0);
      const posNorm = local >= 0 && local <= dur ? local / dur : 0.5;
      addRampPointAt(posNorm);
    });
  }

  if (rampDelBtn) {
    rampDelBtn.addEventListener("click", () => {
      const info = getSelectedClipTrack();
      if (!info) return;
      const norm = normalizeClipRetime(info.clip);
      if (norm.rampPoints.length <= 2) return;
      const idx = state.retimeRampSelectedIdx;
      if (idx < 0 || idx >= norm.rampPoints.length) return;
      const nextPts = norm.rampPoints.filter((_, i) => i !== idx);
      state.retimeRampSelectedIdx = Math.min(idx, nextPts.length - 1);
      const res = updateClipRetimeInDocument(
        state.timelineDoc,
        info.ref.trackKind,
        info.ref.trackIndex,
        info.ref.clipIndex,
        { retime_ramp_preset: "custom", retime_ramp_points: nextPts }
      );
      if (res.changed) {
        commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
      }
    });
  }

  if (rampRstBtn) {
    rampRstBtn.addEventListener("click", () => {
      const info = getSelectedClipTrack();
      if (!info) return;
      state.retimeRampSelectedIdx = -1;
      const res = updateClipRetimeInDocument(
        state.timelineDoc,
        info.ref.trackKind,
        info.ref.trackIndex,
        info.ref.clipIndex,
        { retime_ramp_preset: "constant", retime_ramp_points: [] }
      );
      if (res.changed) {
        commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
      }
    });
  }

  if (rampCanvas) {
    const canvasCoords = (ev) => {
      const rect = rampCanvas.getBoundingClientRect();
      return {
        x: ev.clientX - rect.left,
        y: ev.clientY - rect.top
      };
    };

    rampCanvas.addEventListener("pointerdown", (ev) => {
      const info = getSelectedClipTrack();
      const geom = state.retimeRampGeom;
      if (!info || !geom) return;
      const { x, y } = canvasCoords(ev);
      let hitIdx = -1;
      let bestDist = 14;
      for (const pt of geom.points) {
        const d = Math.hypot(pt.x - x, pt.y - y);
        if (d <= bestDist) {
          bestDist = d;
          hitIdx = pt.index;
        }
      }
      const norm = normalizeClipRetime(info.clip);
      if (hitIdx >= 0) {
        state.retimeRampSelectedIdx = hitIdx;
        const pts =
          norm.rampPoints.length >= 2
            ? norm.rampPoints.map((pt) => ({ ...pt }))
            : [
                { pos_norm: 0.0, speed_rate: norm.speedRate },
                { pos_norm: 1.0, speed_rate: norm.speedRate }
              ];
        state.retimeRampDrag = {
          snap: captureTimelineSnapshot(),
          pointIdx: hitIdx,
          points: pts
        };
        if (rampCanvas.setPointerCapture) {
          try {
            rampCanvas.setPointerCapture(ev.pointerId);
          } catch {
            // ignore synthetic pointer capture failure
          }
        }
        renderTimelineRetimeInspector();
      } else if (x >= geom.padL && x <= geom.padL + geom.plotW) {
        const u = geom.xToPos(x);
        const spd = geom.yToSpeed(y);
        addRampPointAt(u, spd);
      }
    });

    rampCanvas.addEventListener("pointermove", (ev) => {
      const drag = state.retimeRampDrag;
      const geom = state.retimeRampGeom;
      if (!drag || !geom) return;
      const { x, y } = canvasCoords(ev);
      const pts = drag.points.map((pt) => ({ ...pt }));
      const idx = drag.pointIdx;
      if (idx < 0 || idx >= pts.length) return;
      const nextSpd = geom.yToSpeed(y);
      let nextPos = pts[idx].pos_norm;
      if (idx === 0) {
        nextPos = 0.0;
      } else if (idx === pts.length - 1) {
        nextPos = 1.0;
      } else {
        const minPos = pts[idx - 1].pos_norm + 0.02;
        const maxPos = pts[idx + 1].pos_norm - 0.02;
        nextPos = Math.max(minPos, Math.min(maxPos, geom.xToPos(x)));
      }
      pts[idx] = {
        pos_norm: Number(nextPos.toFixed(4)),
        speed_rate: Number(nextSpd.toFixed(2))
      };
      drag.points = pts;
      liveUpdateRetime({ retime_ramp_preset: "custom", retime_ramp_points: pts });
    });

    const finishRampDrag = () => {
      const drag = state.retimeRampDrag;
      if (!drag) return;
      state.retimeRampDrag = null;
      if (drag.snap) {
        pushUndoSnapshot(drag.snap);
        updateTimelineToolbarUI();
      }
    };
    rampCanvas.addEventListener("pointerup", finishRampDrag);
    rampCanvas.addEventListener("pointercancel", finishRampDrag);
  }

  if (rangeEl) {
    rangeEl.addEventListener("pointerdown", () => {
      dragSnap = captureTimelineSnapshot();
    });
    rangeEl.addEventListener("input", () => {
      const val = Number.parseFloat(rangeEl.value);
      if (!Number.isFinite(val)) return;
      if (!dragSnap) dragSnap = captureTimelineSnapshot();
      liveUpdateRetime({
        speed_rate: val,
        retime_ramp_preset: "constant",
        retime_ramp_points: []
      });
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
        liveUpdateRetime({
          speed_rate: val,
          retime_ramp_preset: "constant",
          retime_ramp_points: []
        });
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
          {
            speed_rate: clamped,
            retime_ramp_preset: "constant",
            retime_ramp_points: []
          }
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
      state.retimeRampSelectedIdx = -1;
      const res = updateClipRetimeInDocument(
        state.timelineDoc,
        info.ref.trackKind,
        info.ref.trackIndex,
        info.ref.clipIndex,
        {
          speed_rate: 1.0,
          reverse: false,
          retime_process: "nearest",
          retime_ramp_preset: "constant",
          retime_ramp_points: []
        }
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
      showBanner("Selected clip speed, ramp & optical flow linked to Deliver page.", "success");
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

  const liveUpdateTransformField = (field, val, baseDocOverride = null, baseRefOverride = null) => {
    const ctx = getSelectedClipLocalContext();
    if (!ctx) return { changed: false };
    const docSrc = baseDocOverride || state.timelineDoc;
    const ref = baseRefOverride || ctx.ref;
    const found = findTrackAndClip(docSrc, ref.trackKind, ref.trackIndex, ref.clipIndex);
    if (!found || found.clip.media_type === "audio") return { changed: false };
    const norm = normalizeClipTransform(found.clip);
    const lane = norm.keyframes[field] || [];
    let res;
    if (lane.length > 0) {
      const nearest =
        lane.find((k) => Math.abs(k.time_s - ctx.localTimeS) <= 0.02) ||
        lane[Math.max(0, Math.min(lane.length - 1, state.tfGraphSelectedKfIdx))] ||
        lane[0];
      res = upsertTransformKeyframeInDocument(
        docSrc,
        ref.trackKind,
        ref.trackIndex,
        ref.clipIndex,
        field,
        {
          time_s: ctx.localTimeS,
          value: val,
          easing: nearest ? nearest.easing : "ease_in_out",
          bezier: nearest ? resolveTransformKeyframeBezier(nearest) : [...TRANSFORM_BEZIER_PRESETS.ease_in_out]
        }
      );
    } else {
      res = updateClipTransformInDocument(
        docSrc,
        ref.trackKind,
        ref.trackIndex,
        ref.clipIndex,
        { [field]: val }
      );
    }
    if (!res.changed) return res;
    state.timelineDoc = res.doc;
    state.timelineSelected = { kind: "clip", data: res.clip };
    renderTimelineSelection();
    if (state.activeTab === "timeline") redrawActiveCanvases();
    return res;
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
          crop_left_pct: preset.crop_left_pct ?? TRANSFORM_CROP_DEFAULT,
          crop_right_pct: preset.crop_right_pct ?? TRANSFORM_CROP_DEFAULT,
          crop_top_pct: preset.crop_top_pct ?? TRANSFORM_CROP_DEFAULT,
          crop_bottom_pct: preset.crop_bottom_pct ?? TRANSFORM_CROP_DEFAULT,
          border_width_px: preset.border_width_px ?? TRANSFORM_BORDER_WIDTH_DEFAULT,
          border_color: preset.border_color ?? TRANSFORM_BORDER_COLOR_DEFAULT,
          border_feather_px: preset.border_feather_px ?? TRANSFORM_BORDER_FEATHER_DEFAULT,
          shadow_opacity_pct: preset.shadow_opacity_pct ?? TRANSFORM_SHADOW_OPACITY_DEFAULT,
          shadow_blur_px: preset.shadow_blur_px ?? TRANSFORM_SHADOW_BLUR_DEFAULT,
          shadow_offset_x_px: preset.shadow_offset_x_px ?? TRANSFORM_SHADOW_OFFSET_X_DEFAULT,
          shadow_offset_y_px: preset.shadow_offset_y_px ?? TRANSFORM_SHADOW_OFFSET_Y_DEFAULT,
          shadow_color: preset.shadow_color ?? TRANSFORM_SHADOW_COLOR_DEFAULT,
          dynamic_zoom: preset.dynamic_zoom || DYNAMIC_ZOOM_DEFAULT,
          keyframes: createEmptyTransformKeyframes()
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
        liveUpdateTransformField(spec.field, val);
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
          liveUpdateTransformField(spec.field, val);
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
          const res = liveUpdateTransformField(spec.field, clamped, baseDoc, baseRef);
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
        const origNorm = normalizeClipTransform(info.clip);
        const res = updateClipTransformInDocument(
          state.timelineDoc,
          info.ref.trackKind,
          info.ref.trackIndex,
          info.ref.clipIndex,
          {
            [spec.field]: spec.def,
            keyframes: {
              ...origNorm.keyframes,
              [spec.field]: []
            }
          }
        );
        if (res.changed) {
          commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
        }
      });
    }
  }

  const toggleKeyframeAtPlayhead = (paramName) => {
    const ctx = getSelectedClipLocalContext();
    if (!ctx) return;
    state.tfGraphParam = paramName;
    const norm = normalizeClipTransform(ctx.clip);
    const lane = norm.keyframes[paramName] || [];
    const existing = lane.find((k) => Math.abs(k.time_s - ctx.localTimeS) <= 0.02);
    let res;
    if (existing) {
      res = removeTransformKeyframeInDocument(
        state.timelineDoc,
        ctx.ref.trackKind,
        ctx.ref.trackIndex,
        ctx.ref.clipIndex,
        paramName,
        existing.time_s
      );
    } else {
      const curVal = evaluateTransformParamAtTime(norm, paramName, ctx.localTimeS);
      res = upsertTransformKeyframeInDocument(
        state.timelineDoc,
        ctx.ref.trackKind,
        ctx.ref.trackIndex,
        ctx.ref.clipIndex,
        paramName,
        {
          time_s: ctx.localTimeS,
          value: curVal,
          easing: "ease_in_out",
          bezier: [...TRANSFORM_BEZIER_PRESETS.ease_in_out]
        }
      );
    }
    if (res.changed) {
      commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
    } else {
      renderTimelineTransformInspector();
    }
  };

  for (const dBtn of document.querySelectorAll(".kf-diamond-btn")) {
    dBtn.addEventListener("click", () => {
      const param = dBtn.getAttribute("data-kf-param") || "zoom_pct";
      toggleKeyframeAtPlayhead(param);
    });
  }

  for (const pBtn of document.querySelectorAll(".transform-graph-param-btn")) {
    pBtn.addEventListener("click", () => {
      const param = pBtn.getAttribute("data-tf-graph-param") || "zoom_pct";
      if (TRANSFORM_KEYFRAME_PARAMS.includes(param)) {
        state.tfGraphParam = param;
        state.tfGraphSelectedKfIdx = 0;
        renderTimelineTransformInspector();
      }
    });
  }

  for (const modeBtn of document.querySelectorAll(".transform-graph-mode-btn")) {
    modeBtn.addEventListener("click", () => {
      const mode = modeBtn.getAttribute("data-tf-graph-mode") === "speed" ? "speed" : "value";
      state.tfGraphMode = mode;
      renderTimelineTransformInspector();
    });
  }

  const jumpToAdjacentKeyframe = (dir) => {
    const ctx = getSelectedClipLocalContext();
    if (!ctx) return;
    const norm = normalizeClipTransform(ctx.clip);
    const lane = norm.keyframes[state.tfGraphParam] || [];
    if (lane.length === 0) return;
    let target = null;
    if (dir < 0) {
      for (let i = lane.length - 1; i >= 0; i -= 1) {
        if (lane[i].time_s < ctx.localTimeS - 0.02) {
          target = { kf: lane[i], idx: i };
          break;
        }
      }
      if (!target) target = { kf: lane[0], idx: 0 };
    } else {
      for (let i = 0; i < lane.length; i += 1) {
        if (lane[i].time_s > ctx.localTimeS + 0.02) {
          target = { kf: lane[i], idx: i };
          break;
        }
      }
      if (!target) target = { kf: lane[lane.length - 1], idx: lane.length - 1 };
    }
    state.tfGraphSelectedKfIdx = target.idx;
    const absFrame = Math.max(
      0,
      Math.min(
        state.timelineMaxFrame,
        Math.round((ctx.clip.start_frame || 0) + target.kf.time_s * ctx.fpsRate)
      )
    );
    state.playheadFrame = absFrame;
    updatePlayheadReadout();
    redrawActiveCanvases();
  };

  byId("btn-tf-kf-prev")?.addEventListener("click", () => jumpToAdjacentKeyframe(-1));
  byId("btn-tf-kf-next")?.addEventListener("click", () => jumpToAdjacentKeyframe(1));
  byId("btn-tf-kf-toggle")?.addEventListener("click", () => {
    toggleKeyframeAtPlayhead(state.tfGraphParam);
  });
  byId("btn-tf-kf-clear")?.addEventListener("click", () => {
    const ctx = getSelectedClipLocalContext();
    if (!ctx) return;
    const res = clearTransformParamKeyframesInDocument(
      state.timelineDoc,
      ctx.ref.trackKind,
      ctx.ref.trackIndex,
      ctx.ref.clipIndex,
      state.tfGraphParam
    );
    if (res.changed) {
      state.tfGraphSelectedKfIdx = -1;
      commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
    }
  });

  const applySelectedKeyframeBezier = (easing, bezier, commit = true, dragSnap = null) => {
    const ctx = getSelectedClipLocalContext();
    if (!ctx) return;
    const norm = normalizeClipTransform(ctx.clip);
    const lane = norm.keyframes[state.tfGraphParam] || [];
    if (lane.length === 0) return;
    const kfIdx = Math.max(0, Math.min(lane.length - 1, state.tfGraphSelectedKfIdx));
    const res = updateTransformKeyframeBezierInDocument(
      state.timelineDoc,
      ctx.ref.trackKind,
      ctx.ref.trackIndex,
      ctx.ref.clipIndex,
      state.tfGraphParam,
      kfIdx,
      easing,
      bezier
    );
    if (!res.changed) return;
    if (commit) {
      commitTimelineMutation(res.doc, { kind: "clip", data: res.clip }, dragSnap);
    } else {
      state.timelineDoc = res.doc;
      state.timelineSelected = { kind: "clip", data: res.clip };
      renderTimelineSelection();
      if (state.activeTab === "timeline") redrawActiveCanvases();
    }
  };

  for (const bBtn of document.querySelectorAll(".transform-bezier-btn")) {
    bBtn.addEventListener("click", () => {
      const pId = bBtn.getAttribute("data-tf-bezier-preset") || "ease_in_out";
      const preset = TRANSFORM_BEZIER_PRESETS[pId];
      if (!preset) return;
      const easing = pId === "snap_pop" ? "bezier" : pId;
      applySelectedKeyframeBezier(easing, [...preset], true);
    });
  }

  for (const bzId of ["tf-bezier-x1", "tf-bezier-y1", "tf-bezier-x2", "tf-bezier-y2"]) {
    const el = byId(bzId);
    if (!el) continue;
    el.addEventListener("change", () => {
      const x1 = Number.parseFloat(byId("tf-bezier-x1")?.value || "0.42");
      const y1 = Number.parseFloat(byId("tf-bezier-y1")?.value || "0");
      const x2 = Number.parseFloat(byId("tf-bezier-x2")?.value || "0.58");
      const y2 = Number.parseFloat(byId("tf-bezier-y2")?.value || "1");
      if (![x1, y1, x2, y2].every((v) => Number.isFinite(v))) {
        renderTimelineTransformInspector();
        return;
      }
      applySelectedKeyframeBezier(
        "bezier",
        [
          Math.max(0, Math.min(1, x1)),
          Math.max(-1.5, Math.min(2.5, y1)),
          Math.max(0, Math.min(1, x2)),
          Math.max(-1.5, Math.min(2.5, y2))
        ],
        true
      );
    });
  }

  const graphCanvas = byId("transform-graph-canvas");
  if (graphCanvas) {
    const graphPtr = { active: false, mode: null, kfIdx: -1, handleRole: null, snap: null, pointerId: null };
    const getCanvasXY = (ev) => {
      const rect = graphCanvas.getBoundingClientRect();
      return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
    };

    graphCanvas.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      const ctx = getSelectedClipLocalContext();
      const meta = state.tfGraphDrawMeta;
      if (!ctx || !meta) return;
      const { x, y } = getCanvasXY(ev);

      for (const h of meta.handles || []) {
        if (Math.hypot(x - h.x, y - h.y) <= 11) {
          graphPtr.active = true;
          graphPtr.mode = "handle";
          graphPtr.kfIdx = h.kfIdx;
          graphPtr.handleRole = h.role;
          graphPtr.snap = captureTimelineSnapshot();
          graphPtr.pointerId = ev.pointerId;
          try { graphCanvas.setPointerCapture(ev.pointerId); } catch (_) {}
          return;
        }
      }
      for (const kf of meta.keyframes || []) {
        if (Math.hypot(x - kf.x, y - kf.y) <= 11) {
          state.tfGraphSelectedKfIdx = kf.idx;
          graphPtr.active = true;
          graphPtr.mode = "keyframe";
          graphPtr.kfIdx = kf.idx;
          graphPtr.snap = captureTimelineSnapshot();
          graphPtr.pointerId = ev.pointerId;
          try { graphCanvas.setPointerCapture(ev.pointerId); } catch (_) {}
          renderTimelineTransformInspector();
          return;
        }
      }
      const { plotRect, durationSec } = meta;
      if (
        x >= plotRect.x &&
        x <= plotRect.x + plotRect.w &&
        y >= plotRect.y &&
        y <= plotRect.y + plotRect.h
      ) {
        const tClick = ((x - plotRect.x) / Math.max(1, plotRect.w)) * durationSec;
        const absF = Math.max(
          0,
          Math.min(
            state.timelineMaxFrame,
            Math.round((ctx.clip.start_frame || 0) + tClick * ctx.fpsRate)
          )
        );
        state.playheadFrame = absF;
        updatePlayheadReadout();
        redrawActiveCanvases();
      }
    });

    graphCanvas.addEventListener("pointermove", (ev) => {
      if (!graphPtr.active) return;
      const ctx = getSelectedClipLocalContext();
      const meta = state.tfGraphDrawMeta;
      if (!ctx || !meta) return;
      const { x, y } = getCanvasXY(ev);
      const { plotRect, durationSec, yMin, yMax } = meta;
      const norm = normalizeClipTransform(ctx.clip);
      const lane = norm.keyframes[state.tfGraphParam] || [];
      if (graphPtr.mode === "handle" && graphPtr.kfIdx >= 0 && graphPtr.kfIdx < lane.length - 1) {
        const k0 = lane[graphPtr.kfIdx];
        const k1 = lane[graphPtr.kfIdx + 1];
        const dt = k1.time_s - k0.time_s;
        const dv = k1.value - k0.value;
        if (dt <= 1e-5) return;
        const tPtr = ((x - plotRect.x) / Math.max(1, plotRect.w)) * durationSec;
        const vPtr = yMax - ((y - plotRect.y) / Math.max(1, plotRect.h)) * (yMax - yMin);
        const uNorm = Math.max(0, Math.min(1, (tPtr - k0.time_s) / dt));
        const yNorm = Math.abs(dv) <= 1e-4 ? 0.5 : Math.max(-1.5, Math.min(2.5, (vPtr - k0.value) / dv));
        const bz = resolveTransformKeyframeBezier(k0);
        if (graphPtr.handleRole === "p1") {
          bz[0] = Number(uNorm.toFixed(4));
          bz[1] = Number(yNorm.toFixed(4));
        } else {
          bz[2] = Number(uNorm.toFixed(4));
          bz[3] = Number(yNorm.toFixed(4));
        }
        applySelectedKeyframeBezier("bezier", bz, false);
      } else if (graphPtr.mode === "keyframe" && graphPtr.kfIdx >= 0 && graphPtr.kfIdx < lane.length) {
        const curKf = lane[graphPtr.kfIdx];
        const bounds = TRANSFORM_PARAM_BOUNDS[state.tfGraphParam] || TRANSFORM_PARAM_BOUNDS.zoom_pct;
        const tRaw = Math.max(0, Math.min(durationSec, ((x - plotRect.x) / Math.max(1, plotRect.w)) * durationSec));
        const nextVal =
          meta.mode === "value"
            ? Math.max(bounds.min, Math.min(bounds.max, yMax - ((y - plotRect.y) / Math.max(1, plotRect.h)) * (yMax - yMin)))
            : curKf.value;
        const prevT = graphPtr.kfIdx > 0 ? lane[graphPtr.kfIdx - 1].time_s + 0.04 : 0;
        const nextT = graphPtr.kfIdx < lane.length - 1 ? lane[graphPtr.kfIdx + 1].time_s - 0.04 : durationSec;
        const clampedT = Math.max(prevT, Math.min(nextT, tRaw));
        const nextLane = lane.map((item, idx) =>
          idx === graphPtr.kfIdx
            ? { ...item, time_s: Number(clampedT.toFixed(4)), value: Number(nextVal.toFixed(2)) }
            : item
        );
        const res = updateClipTransformInDocument(
          state.timelineDoc,
          ctx.ref.trackKind,
          ctx.ref.trackIndex,
          ctx.ref.clipIndex,
          {
            keyframes: {
              ...norm.keyframes,
              [state.tfGraphParam]: nextLane
            }
          }
        );
        if (res.changed) {
          state.timelineDoc = res.doc;
          state.timelineSelected = { kind: "clip", data: res.clip };
          renderTimelineSelection();
          redrawActiveCanvases();
        }
      }
    });

    const endGraphPtr = (ev) => {
      if (!graphPtr.active) return;
      if (graphPtr.snap) {
        pushUndoSnapshot(graphPtr.snap);
        updateTimelineToolbarUI();
      }
      if (graphPtr.pointerId !== null) {
        try { graphCanvas.releasePointerCapture(graphPtr.pointerId); } catch (_) {}
      }
      graphPtr.active = false;
      graphPtr.mode = null;
      graphPtr.snap = null;
      graphPtr.pointerId = null;
    };
    graphCanvas.addEventListener("pointerup", endGraphPtr);
    graphCanvas.addEventListener("pointercancel", endGraphPtr);
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
          crop_left_pct: TRANSFORM_CROP_DEFAULT,
          crop_right_pct: TRANSFORM_CROP_DEFAULT,
          crop_top_pct: TRANSFORM_CROP_DEFAULT,
          crop_bottom_pct: TRANSFORM_CROP_DEFAULT,
          border_width_px: TRANSFORM_BORDER_WIDTH_DEFAULT,
          border_color: TRANSFORM_BORDER_COLOR_DEFAULT,
          border_feather_px: TRANSFORM_BORDER_FEATHER_DEFAULT,
          shadow_opacity_pct: TRANSFORM_SHADOW_OPACITY_DEFAULT,
          shadow_blur_px: TRANSFORM_SHADOW_BLUR_DEFAULT,
          shadow_offset_x_px: TRANSFORM_SHADOW_OFFSET_X_DEFAULT,
          shadow_offset_y_px: TRANSFORM_SHADOW_OFFSET_Y_DEFAULT,
          shadow_color: TRANSFORM_SHADOW_COLOR_DEFAULT,
          dynamic_zoom: DYNAMIC_ZOOM_DEFAULT,
          keyframes: createEmptyTransformKeyframes()
        }
      );
      if (res.changed) {
        state.tfGraphSelectedKfIdx = -1;
        commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
      }
    });
  }

  // DVE Crop, Feather Border & Drop Shadow controls
  const dveFields = [
    { field: "crop_left_pct", rangeId: "clip-dve-crop-left-range", numId: "clip-dve-crop-left-num", min: TRANSFORM_CROP_MIN, max: TRANSFORM_CROP_MAX },
    { field: "crop_right_pct", rangeId: "clip-dve-crop-right-range", numId: "clip-dve-crop-right-num", min: TRANSFORM_CROP_MIN, max: TRANSFORM_CROP_MAX },
    { field: "crop_top_pct", rangeId: "clip-dve-crop-top-range", numId: "clip-dve-crop-top-num", min: TRANSFORM_CROP_MIN, max: TRANSFORM_CROP_MAX },
    { field: "crop_bottom_pct", rangeId: "clip-dve-crop-bottom-range", numId: "clip-dve-crop-bottom-num", min: TRANSFORM_CROP_MIN, max: TRANSFORM_CROP_MAX },
    { field: "border_width_px", rangeId: "clip-dve-border-width-range", numId: "clip-dve-border-width-num", min: TRANSFORM_BORDER_WIDTH_MIN, max: TRANSFORM_BORDER_WIDTH_MAX },
    { field: "border_feather_px", rangeId: "clip-dve-border-feather-range", numId: "clip-dve-border-feather-num", min: TRANSFORM_BORDER_FEATHER_MIN, max: TRANSFORM_BORDER_FEATHER_MAX },
    { field: "shadow_opacity_pct", rangeId: "clip-dve-shadow-opacity-range", numId: "clip-dve-shadow-opacity-num", min: TRANSFORM_SHADOW_OPACITY_MIN, max: TRANSFORM_SHADOW_OPACITY_MAX },
    { field: "shadow_blur_px", rangeId: "clip-dve-shadow-blur-range", numId: "clip-dve-shadow-blur-num", min: TRANSFORM_SHADOW_BLUR_MIN, max: TRANSFORM_SHADOW_BLUR_MAX },
    { field: "shadow_offset_x_px", rangeId: "clip-dve-shadow-offx-range", numId: "clip-dve-shadow-offx-num", min: TRANSFORM_SHADOW_OFFSET_MIN, max: TRANSFORM_SHADOW_OFFSET_MAX },
    { field: "shadow_offset_y_px", rangeId: "clip-dve-shadow-offy-range", numId: "clip-dve-shadow-offy-num", min: TRANSFORM_SHADOW_OFFSET_MIN, max: TRANSFORM_SHADOW_OFFSET_MAX }
  ];

  const livePatchDve = (patch, baseDocOverride = null, baseRefOverride = null) => {
    const info = getSelectedClipTrack();
    if (!info || info.clip.media_type === "audio") return { changed: false };
    const docSrc = baseDocOverride || state.timelineDoc;
    const ref = baseRefOverride || info.ref;
    const res = updateClipTransformInDocument(docSrc, ref.trackKind, ref.trackIndex, ref.clipIndex, patch);
    if (!res.changed) return res;
    state.timelineDoc = res.doc;
    state.timelineSelected = { kind: "clip", data: res.clip };
    renderTimelineSelection();
    if (state.activeTab === "timeline") redrawActiveCanvases();
    return res;
  };

  for (const spec of dveFields) {
    const rangeEl = byId(spec.rangeId);
    const numEl = byId(spec.numId);
    let dragSnap = null;
    if (rangeEl) {
      rangeEl.addEventListener("pointerdown", () => {
        dragSnap = captureTimelineSnapshot();
      });
      rangeEl.addEventListener("input", () => {
        const val = Number.parseFloat(rangeEl.value);
        if (!Number.isFinite(val)) return;
        if (!dragSnap) dragSnap = captureTimelineSnapshot();
        livePatchDve({ [spec.field]: val });
      });
      rangeEl.addEventListener("change", () => {
        const val = Number.parseFloat(rangeEl.value);
        if (Number.isFinite(val) && dragSnap) {
          pushUndoSnapshot(dragSnap);
          updateTimelineToolbarUI();
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
          livePatchDve({ [spec.field]: val });
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
          const res = livePatchDve({ [spec.field]: clamped }, baseDoc, baseRef);
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
  }

  for (const [elId, field, defHex] of [
    ["clip-dve-border-color", "border_color", TRANSFORM_BORDER_COLOR_DEFAULT],
    ["clip-dve-shadow-color", "shadow_color", TRANSFORM_SHADOW_COLOR_DEFAULT]
  ]) {
    const colorEl = byId(elId);
    let colorSnap = null;
    if (colorEl) {
      colorEl.addEventListener("pointerdown", () => {
        colorSnap = captureTimelineSnapshot();
      });
      colorEl.addEventListener("input", () => {
        if (!colorSnap) colorSnap = captureTimelineSnapshot();
        livePatchDve({ [field]: normalizeTransformHexColor(colorEl.value, defHex) });
      });
      colorEl.addEventListener("change", () => {
        const hex = normalizeTransformHexColor(colorEl.value, defHex);
        const info = getSelectedClipTrack();
        if (!info || info.clip.media_type === "audio") {
          colorSnap = null;
          return;
        }
        if (colorSnap) {
          pushUndoSnapshot(colorSnap);
          updateTimelineToolbarUI();
        } else {
          const res = livePatchDve({ [field]: hex });
          if (res.changed) {
            commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
          }
        }
        colorSnap = null;
      });
    }
  }

  const dveCropRstBtn = byId("btn-clip-dve-crop-reset");
  if (dveCropRstBtn) {
    dveCropRstBtn.addEventListener("click", () => {
      const info = getSelectedClipTrack();
      if (!info || info.clip.media_type === "audio") return;
      const res = updateClipTransformInDocument(
        state.timelineDoc,
        info.ref.trackKind,
        info.ref.trackIndex,
        info.ref.clipIndex,
        {
          crop_left_pct: TRANSFORM_CROP_DEFAULT,
          crop_right_pct: TRANSFORM_CROP_DEFAULT,
          crop_top_pct: TRANSFORM_CROP_DEFAULT,
          crop_bottom_pct: TRANSFORM_CROP_DEFAULT,
          border_width_px: TRANSFORM_BORDER_WIDTH_DEFAULT,
          border_color: TRANSFORM_BORDER_COLOR_DEFAULT,
          border_feather_px: TRANSFORM_BORDER_FEATHER_DEFAULT
        }
      );
      if (res.changed) commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
    });
  }

  const dveShadowRstBtn = byId("btn-clip-dve-shadow-reset");
  if (dveShadowRstBtn) {
    dveShadowRstBtn.addEventListener("click", () => {
      const info = getSelectedClipTrack();
      if (!info || info.clip.media_type === "audio") return;
      const res = updateClipTransformInDocument(
        state.timelineDoc,
        info.ref.trackKind,
        info.ref.trackIndex,
        info.ref.clipIndex,
        {
          shadow_opacity_pct: TRANSFORM_SHADOW_OPACITY_DEFAULT,
          shadow_blur_px: TRANSFORM_SHADOW_BLUR_DEFAULT,
          shadow_offset_x_px: TRANSFORM_SHADOW_OFFSET_X_DEFAULT,
          shadow_offset_y_px: TRANSFORM_SHADOW_OFFSET_Y_DEFAULT,
          shadow_color: TRANSFORM_SHADOW_COLOR_DEFAULT
        }
      );
      if (res.changed) commitTimelineMutation(res.doc, { kind: "clip", data: res.clip });
    });
  }

  const dveOverlayBtn = byId("btn-dve-overlay");
  if (dveOverlayBtn) {
    dveOverlayBtn.addEventListener("click", () => {
      state.dveOverlay = !state.dveOverlay;
      dveOverlayBtn.classList.toggle("is-active", state.dveOverlay);
      dveOverlayBtn.setAttribute("aria-pressed", state.dveOverlay ? "true" : "false");
      if (state.activeTab === "timeline") redrawActiveCanvases();
    });
  }

  const dveSplitGridBtn = byId("btn-dve-split-grid");
  if (dveSplitGridBtn) {
    dveSplitGridBtn.addEventListener("click", () => {
      state.dveSplitGrid = !state.dveSplitGrid;
      dveSplitGridBtn.classList.toggle("is-active", state.dveSplitGrid);
      dveSplitGridBtn.setAttribute("aria-pressed", state.dveSplitGrid ? "true" : "false");
      if (state.activeTab === "timeline") redrawActiveCanvases();
    });
  }

  // Interactive Program Monitor DVE Transform / PiP / Crop Handles
  const programCanvas = byId("timeline-program-canvas");
  if (programCanvas) {
    const toProgramPoint = (ev) => {
      const geom = programCanvas._dveTransformGeom;
      if (!geom) return null;
      const rect = programCanvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const logicalW = geom.canvasWidth || rect.width;
      const logicalH = geom.canvasHeight || rect.height;
      const containScale = Math.min(rect.width / logicalW, rect.height / logicalH);
      const drawnW = logicalW * containScale;
      const drawnH = logicalH * containScale;
      const offsetX = (rect.width - drawnW) * 0.5;
      const offsetY = (rect.height - drawnH) * 0.5;
      return {
        geom,
        x: (ev.clientX - rect.left - offsetX) / containScale,
        y: (ev.clientY - rect.top - offsetY) / containScale
      };
    };

    const isInsideRotatedBox = (px, py, geom) => {
      const dx = px - geom.center.x;
      const dy = py - geom.center.y;
      const cosR = Math.cos(-geom.rad);
      const sinR = Math.sin(-geom.rad);
      const lx = dx * cosR - dy * sinR;
      const ly = dx * sinR + dy * cosR;
      return Math.abs(lx) <= geom.boxW * 0.5 && Math.abs(ly) <= geom.boxH * 0.5;
    };

    programCanvas.addEventListener("pointerdown", (ev) => {
      if (!state.dveOverlay) return;
      const ctx = getSelectedClipLocalContext();
      if (!ctx) return;
      const pt = toProgramPoint(ev);
      if (!pt || !pt.geom || !pt.geom.handles) return;
      const hitPriority = ["rot", "tl", "tr", "br", "bl", "t", "r", "b", "l", "move"];
      let hitKey = null;
      let bestDist = 14;
      for (const key of hitPriority) {
        const h = pt.geom.handles[key];
        if (!h) continue;
        const d = Math.hypot(pt.x - h.x, pt.y - h.y);
        if (d <= bestDist) {
          bestDist = d;
          hitKey = key;
        }
      }
      if (!hitKey && isInsideRotatedBox(pt.x, pt.y, pt.geom)) {
        hitKey = "move";
      }
      if (!hitKey) return;
      ev.preventDefault();
      if (document.activeElement && document.activeElement !== programCanvas && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
      }
      const norm = normalizeClipTransform(ctx.clip);
      state.dveDrag = {
        key: hitKey,
        startX: pt.x,
        startY: pt.y,
        startGeom: pt.geom,
        startNorm: norm,
        startDist: Math.max(8, Math.hypot(pt.x - pt.geom.center.x, pt.y - pt.geom.center.y)),
        snap: captureTimelineSnapshot()
      };
      if (typeof programCanvas.setPointerCapture === "function") {
        try {
          programCanvas.setPointerCapture(ev.pointerId);
        } catch {
          // Ignore synthetic pointer capture error
        }
      }
    });

    programCanvas.addEventListener("pointermove", (ev) => {
      if (!state.dveDrag) return;
      const pt = toProgramPoint(ev);
      if (!pt || !pt.geom) return;
      ev.preventDefault();
      const { key, startX, startY, startGeom, startNorm, startDist } = state.dveDrag;
      const fw = Math.max(1, startGeom.frameW);
      const fh = Math.max(1, startGeom.frameH);
      const patch = {};
      if (key === "move") {
        let nextX = startNorm.pos_x_pct + ((pt.x - startX) / fw) * 100.0;
        let nextY = startNorm.pos_y_pct + ((pt.y - startY) / fh) * 100.0;
        if (state.dveSplitGrid) {
          for (const target of [-25, 0, 25]) {
            if (Math.abs(nextX - target) < 2.2) nextX = target;
            if (Math.abs(nextY - target) < 2.2) nextY = target;
          }
        }
        patch.pos_x_pct = Number(Math.max(TRANSFORM_POS_MIN, Math.min(TRANSFORM_POS_MAX, nextX)).toFixed(1));
        patch.pos_y_pct = Number(Math.max(TRANSFORM_POS_MIN, Math.min(TRANSFORM_POS_MAX, nextY)).toFixed(1));
      } else if (key === "tl" || key === "tr" || key === "br" || key === "bl") {
        const curDist = Math.max(4, Math.hypot(pt.x - startGeom.center.x, pt.y - startGeom.center.y));
        const nextZoom = startNorm.zoom_pct * (curDist / startDist);
        patch.zoom_pct = Number(Math.max(TRANSFORM_ZOOM_MIN, Math.min(TRANSFORM_ZOOM_MAX, nextZoom)).toFixed(1));
      } else if (key === "rot") {
        const angRad = Math.atan2(pt.x - startGeom.center.x, -(pt.y - startGeom.center.y));
        const deg = (angRad * 180.0) / Math.PI;
        patch.rotation_deg = Number(Math.max(TRANSFORM_ROT_MIN, Math.min(TRANSFORM_ROT_MAX, deg)).toFixed(1));
      } else if (key === "l" || key === "r" || key === "t" || key === "b") {
        const dx = pt.x - startX;
        const dy = pt.y - startY;
        const cosR = Math.cos(-startGeom.rad);
        const sinR = Math.sin(-startGeom.rad);
        const ldx = dx * cosR - dy * sinR;
        const ldy = dx * sinR + dy * cosR;
        const zoomScale = Math.max(0.1, startNorm.zoom_pct / 100.0);
        if (key === "l") {
          const nextL = startNorm.crop_left_pct + (ldx / (fw * zoomScale)) * 100.0;
          patch.crop_left_pct = Number(
            Math.max(TRANSFORM_CROP_MIN, Math.min(TRANSFORM_CROP_MAX, TRANSFORM_CROP_SUM_MAX - startNorm.crop_right_pct, nextL)).toFixed(1)
          );
        } else if (key === "r") {
          const nextR = startNorm.crop_right_pct - (ldx / (fw * zoomScale)) * 100.0;
          patch.crop_right_pct = Number(
            Math.max(TRANSFORM_CROP_MIN, Math.min(TRANSFORM_CROP_MAX, TRANSFORM_CROP_SUM_MAX - startNorm.crop_left_pct, nextR)).toFixed(1)
          );
        } else if (key === "t") {
          const nextT = startNorm.crop_top_pct + (ldy / (fh * zoomScale)) * 100.0;
          patch.crop_top_pct = Number(
            Math.max(TRANSFORM_CROP_MIN, Math.min(TRANSFORM_CROP_MAX, TRANSFORM_CROP_SUM_MAX - startNorm.crop_bottom_pct, nextT)).toFixed(1)
          );
        } else if (key === "b") {
          const nextB = startNorm.crop_bottom_pct - (ldy / (fh * zoomScale)) * 100.0;
          patch.crop_bottom_pct = Number(
            Math.max(TRANSFORM_CROP_MIN, Math.min(TRANSFORM_CROP_MAX, TRANSFORM_CROP_SUM_MAX - startNorm.crop_top_pct, nextB)).toFixed(1)
          );
        }
      }
      if (Object.keys(patch).length > 0) {
        livePatchDve(patch);
      }
    });

    const endDveDrag = (ev) => {
      if (!state.dveDrag) return;
      const dragSnap = state.dveDrag.snap;
      state.dveDrag = null;
      if (ev && typeof programCanvas.releasePointerCapture === "function") {
        try {
          if (programCanvas.hasPointerCapture && programCanvas.hasPointerCapture(ev.pointerId)) {
            programCanvas.releasePointerCapture(ev.pointerId);
          }
        } catch {
          // Ignore release error
        }
      }
      if (dragSnap) {
        pushUndoSnapshot(dragSnap);
        updateTimelineToolbarUI();
      }
    };
    programCanvas.addEventListener("pointerup", endDveDrag);
    programCanvas.addEventListener("pointercancel", endDveDrag);
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

function wireTimelineClipLabelControls() {
  const group = byId("clip-label-color-group");
  if (!group) return;
  for (const btn of group.querySelectorAll("[data-clip-label-color]")) {
    btn.addEventListener("click", () => {
      const info = getSelectedClipTrack();
      const colorId = btn.getAttribute("data-clip-label-color");
      if (!info || !colorId || !state.timelineDoc) return;
      const clipId =
        info.clip && info.clip.id != null
          ? String(info.clip.id)
          : `${info.ref.trackKind}:${info.ref.trackIndex}:${info.ref.clipIndex}`;
      const res = setClipLabelColor(state.timelineDoc, clipId, colorId);
      if (res.changed && res.clip) {
        const selKind =
          state.timelineSelected && state.timelineSelected.kind === "transition"
            ? "transition"
            : "clip";
        commitTimelineMutation(res.doc, { kind: selKind, data: res.clip });
      }
    });
  }
}

function wireTimelineIndexControls() {
  const searchInput = byId("timeline-index-search");
  const clearBtn = byId("btn-timeline-index-clear");
  const filterGroup = byId("timeline-index-color-filter");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.timelineIndexQuery = searchInput.value;
      renderTimelineIndex();
    });
    searchInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && (state.timelineIndexQuery || searchInput.value)) {
        ev.preventDefault();
        state.timelineIndexQuery = "";
        searchInput.value = "";
        renderTimelineIndex();
      }
    });
  }

  if (filterGroup) {
    for (const pill of filterGroup.querySelectorAll("[data-index-color]")) {
      pill.addEventListener("click", () => {
        const nextColor = pill.getAttribute("data-index-color") || "all";
        state.timelineIndexColor = nextColor;
        renderTimelineIndex();
      });
    }
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      state.timelineIndexQuery = "";
      state.timelineIndexColor = "all";
      if (searchInput) {
        searchInput.value = "";
      }
      renderTimelineIndex();
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

  const closePoolInfoBtn = byId("btn-close-media-pool-info");
  const closePoolInfoFooter = byId("btn-media-pool-info-close-footer");
  const jumpPoolInfoBtn = byId("btn-media-pool-info-jump");
  const poolInfoDlg = byId("media-pool-info-dialog");
  if (closePoolInfoBtn) closePoolInfoBtn.addEventListener("click", closeMediaPoolInfoDialog);
  if (closePoolInfoFooter) closePoolInfoFooter.addEventListener("click", closeMediaPoolInfoDialog);
  if (jumpPoolInfoBtn) {
    jumpPoolInfoBtn.addEventListener("click", () => {
      if (state.mediaPoolInfoEntry) {
        selectClipFromTimelineIndex(state.mediaPoolInfoEntry);
      }
      closeMediaPoolInfoDialog();
    });
  }
  if (poolInfoDlg) {
    poolInfoDlg.addEventListener("click", (ev) => {
      if (ev.target === poolInfoDlg) closeMediaPoolInfoDialog();
    });
  }

  const renderTabsRoot = byId("render-settings-tabs");
  if (renderTabsRoot) {
    const renderTabBtns = Array.from(
      renderTabsRoot.querySelectorAll(".deliver-subtab-btn[data-render-tab]")
    );
    for (const btn of renderTabBtns) {
      btn.addEventListener("click", () => {
        const nextTab = btn.getAttribute("data-render-tab");
        if (nextTab) switchDeliverSettingsTab(nextTab);
      });
      btn.addEventListener("keydown", (ev) => {
        const idx = renderTabBtns.indexOf(btn);
        if (idx < 0) return;
        let targetIdx = -1;
        if (ev.key === "ArrowRight") targetIdx = (idx + 1) % renderTabBtns.length;
        else if (ev.key === "ArrowLeft") targetIdx = (idx - 1 + renderTabBtns.length) % renderTabBtns.length;
        else if (ev.key === "Home") targetIdx = 0;
        else if (ev.key === "End") targetIdx = renderTabBtns.length - 1;
        if (targetIdx >= 0) {
          ev.preventDefault();
          const targetBtn = renderTabBtns[targetIdx];
          const nextTab = targetBtn.getAttribute("data-render-tab");
          if (nextTab) switchDeliverSettingsTab(nextTab);
          targetBtn.focus();
        }
      });
    }
  }
  const panelRenderEl = byId("panel-render");
  if (panelRenderEl) {
    panelRenderEl.addEventListener("change", syncDeliverTabIndicators);
    panelRenderEl.addEventListener("input", syncDeliverTabIndicators);
    panelRenderEl.addEventListener("click", (ev) => {
      if (ev.target && ev.target.closest("button")) {
        window.requestAnimationFrame(syncDeliverTabIndicators);
      }
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
  const toolTrimBtn = byId("btn-tool-trim");
  if (toolTrimBtn) {
    toolTrimBtn.addEventListener("click", () =>
      setTimelineTool(state.timelineTool === "trim" ? "select" : "trim")
    );
  }
  const toolRollBtn = byId("btn-tool-roll");
  if (toolRollBtn) {
    toolRollBtn.addEventListener("click", () =>
      setTimelineTool(state.timelineTool === "roll" ? "select" : "roll")
    );
  }
  const toolSlipBtn = byId("btn-tool-slip");
  if (toolSlipBtn) {
    toolSlipBtn.addEventListener("click", () =>
      setTimelineTool(state.timelineTool === "slip" ? "select" : "slip")
    );
  }
  const toolSlideBtn = byId("btn-tool-slide");
  if (toolSlideBtn) {
    toolSlideBtn.addEventListener("click", () =>
      setTimelineTool(state.timelineTool === "slide" ? "select" : "slide")
    );
  }
  byId("btn-tool-blade").addEventListener("click", () =>
    setTimelineTool(state.timelineTool === "blade" ? "select" : "blade")
  );
  const syncLockBtn = byId("btn-timeline-sync-lock");
  if (syncLockBtn) {
    syncLockBtn.addEventListener("click", toggleAllTracksSyncLockAction);
  }
  const nudgeEdgeInBtn = byId("btn-nudge-edge-in");
  if (nudgeEdgeInBtn) {
    nudgeEdgeInBtn.addEventListener("click", () => setNudgeEdge("left"));
  }
  const nudgeEdgeOutBtn = byId("btn-nudge-edge-out");
  if (nudgeEdgeOutBtn) {
    nudgeEdgeOutBtn.addEventListener("click", () => setNudgeEdge("right"));
  }
  for (const nudgeBtn of document.querySelectorAll("[data-nudge-delta]")) {
    nudgeBtn.addEventListener("click", () => {
      const delta = Number.parseInt(nudgeBtn.getAttribute("data-nudge-delta") || "0", 10);
      nudgeSelectedClipAction(delta);
    });
  }
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
    if (state.timelineDoc) {
      const startFrame = state.timelineDoc.start_frame || 0;
      const vp = computeTimelineZoomViewport(
        startFrame,
        state.timelineMaxFrame,
        state.timelineZoom,
        state.playheadFrame,
        null
      );
      state.timelineViewStartFrame = vp.viewStartFrame;
    }
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

  bindTimelineOverviewCanvas(byId("timeline-overview-canvas"));
  bindTimelineCanvasScrub(byId("timeline-canvas"));

  const poolFilterGroup = byId("media-pool-type-filter");
  if (poolFilterGroup) {
    for (const pill of poolFilterGroup.querySelectorAll("[data-pool-type]")) {
      pill.addEventListener("click", () => {
        const nextType = pill.getAttribute("data-pool-type") || "all";
        state.mediaPoolType = nextType;
        renderMediaPool();
        pill.blur();
      });
    }
  }
  const sourceTapeBtn = byId("btn-media-pool-source-tape");
  if (sourceTapeBtn) {
    sourceTapeBtn.addEventListener("click", () => {
      state.mediaPoolSourceTape = !state.mediaPoolSourceTape;
      renderMediaPool();
      sourceTapeBtn.blur();
    });
  }
  const sourceTapeScrub = byId("source-tape-scrub");
  if (sourceTapeScrub) {
    sourceTapeScrub.addEventListener("input", () => {
      const tape = state.sourceTapeState;
      if (!tape) return;
      stopPlayback();
      const val = Number.parseInt(sourceTapeScrub.value, 10);
      const resolved = resolveSourceTapeFrame(tape, val);
      if (resolved && resolved.segment && resolved.segment.entry) {
        state.mediaPoolActiveClipId = resolved.segment.entry.id;
        const found = findTrackAndClip(
          state.timelineDoc,
          resolved.segment.entry.trackKind,
          resolved.segment.entry.trackIndex,
          resolved.segment.entry.clipIndex
        );
        if (found) {
          state.timelineSelected = { kind: "clip", data: found.clip };
        }
        setPlayhead(resolved.timelineFrame);
        renderTimelineSelection();
      }
    });
    sourceTapeScrub.addEventListener("change", () => {
      sourceTapeScrub.blur();
    });
  }
  const smartInsertBtn = byId("btn-pool-smart-insert");
  if (smartInsertBtn) {
    smartInsertBtn.addEventListener("click", () => {
      applyMasterBinEdit("smart_insert");
      smartInsertBtn.blur();
    });
  }
  const insertPhBtn = byId("btn-pool-insert-playhead");
  if (insertPhBtn) {
    insertPhBtn.addEventListener("click", () => {
      applyMasterBinEdit("insert_playhead");
      insertPhBtn.blur();
    });
  }
  const appendBtn = byId("btn-pool-append");
  if (appendBtn) {
    appendBtn.addEventListener("click", () => {
      applyMasterBinEdit("append");
      appendBtn.blur();
    });
  }
  wireClipAudioInspector();
  wireClipRetimeInspector();
  wireClipTransformInspector();
  wireClipTransitionInspector();
  wireTimelineClipLabelControls();
  wireTimelineIndexControls();
  wireTimelineMarkerAndBpmControls();

  // FX page events
  for (const btn of document.querySelectorAll("[data-fx-preset]")) {
    btn.addEventListener("click", () => {
      const pid = btn.getAttribute("data-fx-preset");
      if (pid) applyFxPreset(pid);
    });
  }
  for (const btn of document.querySelectorAll("[data-fx-cat-filter]")) {
    btn.addEventListener("click", () => {
      const cat = btn.getAttribute("data-fx-cat-filter") || "all";
      for (const tab of document.querySelectorAll("[data-fx-cat-filter]")) {
        const active = (tab.getAttribute("data-fx-cat-filter") || "all") === cat;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-pressed", active ? "true" : "false");
      }
      for (const group of document.querySelectorAll(".fx-ofx-group[data-fx-category]")) {
        const groupCat = group.getAttribute("data-fx-category") || "";
        group.classList.toggle("is-hidden", cat !== "all" && groupCat !== cat);
      }
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
    syncPlanarTrackerAndStabilizerUi();
    updateFxBadges();
    renderFxStack();
    redrawActiveCanvases();
    compileFxNow();
  });
  byId("btn-fx-reset-all").addEventListener("click", () => {
    state.fxStack = [];
    state.chromaKey.enabled = false;
    state.chromaKey.matteView = "final";
    state.planarTracker.enabled = false;
    state.planarTracker.track_keyframes = [];
    state.stabilizer.enabled = false;
    state.fxBypassAll = false;
    state.fxActivePresetId = "";
    syncChromaKeyControlsFromState();
    syncPlanarTrackerAndStabilizerUi();
    updateFxBadges();
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

  const btnPwUnlink = byId("btn-pw-unlink-track");
  if (btnPwUnlink) {
    btnPwUnlink.addEventListener("click", unlinkPlanarTrackFromPowerWindow);
  }
  const btnTrkToggle = byId("btn-fx-tracker-toggle");
  if (btnTrkToggle) {
    btnTrkToggle.addEventListener("click", () => {
      state.planarTracker.enabled = !state.planarTracker.enabled;
      state.fxBypassAll = false;
      syncPlanarTrackerAndStabilizerUi();
      updateFxBadges();
      redrawActiveCanvases();
      compileFxNow();
    });
  }
  const btnTrkOverlay = byId("btn-fx-tracker-overlay");
  if (btnTrkOverlay) {
    btnTrkOverlay.addEventListener("click", () => {
      state.planarTrackerOverlay = !state.planarTrackerOverlay;
      syncPlanarTrackerAndStabilizerUi();
      redrawActiveCanvases();
    });
  }
  for (const tabBtn of document.querySelectorAll("[data-tracker-tab]")) {
    tabBtn.addEventListener("click", () => {
      const tabId = tabBtn.getAttribute("data-tracker-tab");
      state.planarTrackerTab = tabId === "stabilizer" ? "stabilizer" : "planar";
      syncPlanarTrackerAndStabilizerUi();
    });
  }
  for (const btn of document.querySelectorAll("[data-tracker-preset]")) {
    btn.addEventListener("click", () => {
      const pid = btn.getAttribute("data-tracker-preset");
      if (pid) applyPlanarTrackerPresetClient(pid);
    });
  }
  const trkModeEl = byId("fx-tracker-mode");
  if (trkModeEl) {
    trkModeEl.addEventListener("change", () => {
      state.planarTracker.mode = trkModeEl.value;
      state.planarTracker.enabled = true;
      state.fxBypassAll = false;
      syncPlanarTrackerAndStabilizerUi();
      updateFxBadges();
      redrawActiveCanvases();
      compileFxNow();
    });
  }
  const trkInterpEl = byId("fx-tracker-interp");
  if (trkInterpEl) {
    trkInterpEl.addEventListener("change", () => {
      state.planarTracker.interpolation = trkInterpEl.value === "linear" ? "linear" : "cubic";
      compileFxNow();
    });
  }
  const trkFollowEl = byId("fx-tracker-follow-track");
  if (trkFollowEl) {
    trkFollowEl.addEventListener("change", () => {
      state.planarTracker.follow_track = Boolean(trkFollowEl.checked);
      syncPlanarTrackerAndStabilizerUi();
      redrawActiveCanvases();
      compileFxNow();
    });
  }
  const btnTrackBack = byId("btn-fx-track-back");
  if (btnTrackBack) btnTrackBack.addEventListener("click", () => runPlanarPointTrack("back"));
  const btnTrackFwd = byId("btn-fx-track-fwd");
  if (btnTrackFwd) btnTrackFwd.addEventListener("click", () => runPlanarPointTrack("fwd"));
  const btnTrackAnalyze = byId("btn-fx-track-analyze");
  if (btnTrackAnalyze) btnTrackAnalyze.addEventListener("click", () => runPlanarPointTrack("analyze"));
  const btnTrackClear = byId("btn-fx-track-clear");
  if (btnTrackClear) {
    btnTrackClear.addEventListener("click", () => {
      state.planarTracker.track_keyframes = [];
      if (state.colorPowerWindowTrack.linked) {
        unlinkPlanarTrackFromPowerWindow();
      }
      syncPlanarTrackerAndStabilizerUi();
      redrawActiveCanvases();
      compileFxNow();
    });
  }
  const btnTrackLinkPw = byId("btn-fx-track-link-pw");
  if (btnTrackLinkPw) btnTrackLinkPw.addEventListener("click", linkPlanarTrackToPowerWindow);
  const btnResetPins = byId("btn-fx-tracker-reset-pins");
  if (btnResetPins) {
    btnResetPins.addEventListener("click", () => {
      state.planarTracker.tl_x = 0.0;
      state.planarTracker.tl_y = 0.0;
      state.planarTracker.tr_x = 1.0;
      state.planarTracker.tr_y = 0.0;
      state.planarTracker.bl_x = 0.0;
      state.planarTracker.bl_y = 1.0;
      state.planarTracker.br_x = 1.0;
      state.planarTracker.br_y = 1.0;
      state.planarTracker.preset = "custom";
      syncPlanarTrackerAndStabilizerUi();
      redrawActiveCanvases();
      compileFxNow();
    });
  }
  const pinInputMap = [
    ["fx-pin-tl-x", "tl_x"],
    ["fx-pin-tl-y", "tl_y"],
    ["fx-pin-tr-x", "tr_x"],
    ["fx-pin-tr-y", "tr_y"],
    ["fx-pin-bl-x", "bl_x"],
    ["fx-pin-bl-y", "bl_y"],
    ["fx-pin-br-x", "br_x"],
    ["fx-pin-br-y", "br_y"]
  ];
  for (const [id, field] of pinInputMap) {
    const el = byId(id);
    if (!el) continue;
    el.addEventListener("input", () => {
      const pct = Number.parseFloat(el.value);
      if (Number.isFinite(pct) && pct >= -25 && pct <= 125) {
        state.planarTracker[field] = Number((pct / 100).toFixed(4));
        state.planarTracker.preset = "custom";
        state.planarTracker.enabled = true;
        state.fxBypassAll = false;
        syncPlanarTrackerAndStabilizerUi();
        updateFxBadges();
        redrawActiveCanvases();
        scheduleFxCompile();
      }
    });
    el.addEventListener("change", () => {
      const parsed = Number.parseFloat(el.value);
      const clampedPct = Number.isFinite(parsed)
        ? Math.max(-25, Math.min(125, parsed))
        : state.planarTracker[field] * 100;
      state.planarTracker[field] = Number((clampedPct / 100).toFixed(4));
      el.value = clampedPct.toFixed(1);
      syncPlanarTrackerAndStabilizerUi();
      redrawActiveCanvases();
      compileFxNow();
    });
  }

  const stabEnabledEl = byId("fx-stab-enabled");
  if (stabEnabledEl) {
    stabEnabledEl.addEventListener("change", () => {
      state.stabilizer.enabled = Boolean(stabEnabledEl.checked);
      state.fxBypassAll = false;
      syncPlanarTrackerAndStabilizerUi();
      updateFxBadges();
      redrawActiveCanvases();
      compileFxNow();
    });
  }
  const btnStabReset = byId("btn-fx-stab-reset");
  if (btnStabReset) {
    btnStabReset.addEventListener("click", () => {
      state.stabilizer = {
        enabled: false,
        preset: "smooth_gimbal",
        rx: 16,
        ry: 16,
        edge: "mirror",
        blocksize: 8,
        contrast: 125,
        search: "exhaustive",
        auto_zoom_pct: 106.0
      };
      syncPlanarTrackerAndStabilizerUi();
      updateFxBadges();
      redrawActiveCanvases();
      compileFxNow();
    });
  }
  for (const btn of document.querySelectorAll("[data-stab-preset]")) {
    btn.addEventListener("click", () => {
      const pid = btn.getAttribute("data-stab-preset");
      if (pid) applyStabilizerPresetClient(pid);
    });
  }
  const bindStabNumericPair = (rangeId, numId, field, minVal, maxVal, isFloat = false) => {
    const rEl = byId(rangeId);
    const nEl = byId(numId);
    if (!rEl || !nEl) return;
    rEl.addEventListener("input", () => {
      const val = Number.parseFloat(rEl.value);
      if (Number.isFinite(val)) {
        state.stabilizer[field] = isFloat ? val : Math.round(val);
        state.stabilizer.preset = "custom";
        state.stabilizer.enabled = true;
        state.fxBypassAll = false;
        nEl.value = isFloat ? val.toFixed(1) : String(Math.round(val));
        syncPlanarTrackerAndStabilizerUi();
        updateFxBadges();
        redrawActiveCanvases();
        scheduleFxCompile();
      }
    });
    nEl.addEventListener("input", () => {
      const val = Number.parseFloat(nEl.value);
      if (Number.isFinite(val) && val >= minVal && val <= maxVal) {
        state.stabilizer[field] = isFloat ? val : Math.round(val);
        state.stabilizer.preset = "custom";
        state.stabilizer.enabled = true;
        state.fxBypassAll = false;
        rEl.value = String(val);
        syncPlanarTrackerAndStabilizerUi();
        updateFxBadges();
        redrawActiveCanvases();
        scheduleFxCompile();
      }
    });
    nEl.addEventListener("change", () => {
      const parsed = Number.parseFloat(nEl.value);
      const clamped = Number.isFinite(parsed)
        ? Math.min(maxVal, Math.max(minVal, parsed))
        : state.stabilizer[field];
      const norm = isFloat ? Number(clamped.toFixed(1)) : Math.round(clamped);
      state.stabilizer[field] = norm;
      rEl.value = String(norm);
      nEl.value = isFloat ? norm.toFixed(1) : String(norm);
      syncPlanarTrackerAndStabilizerUi();
      redrawActiveCanvases();
      compileFxNow();
    });
  };
  bindStabNumericPair("fx-stab-rx-range", "fx-stab-rx-num", "rx", 0, 64, false);
  bindStabNumericPair("fx-stab-ry-range", "fx-stab-ry-num", "ry", 0, 64, false);
  bindStabNumericPair("fx-stab-zoom-range", "fx-stab-zoom-num", "auto_zoom_pct", 100, 135, true);
  const stabEdgeEl = byId("fx-stab-edge");
  if (stabEdgeEl) {
    stabEdgeEl.addEventListener("change", () => {
      state.stabilizer.edge = stabEdgeEl.value;
      state.stabilizer.preset = "custom";
      syncPlanarTrackerAndStabilizerUi();
      compileFxNow();
    });
  }
  const stabSearchEl = byId("fx-stab-search");
  if (stabSearchEl) {
    stabSearchEl.addEventListener("change", () => {
      state.stabilizer.search = stabSearchEl.value === "less" ? "less" : "exhaustive";
      state.stabilizer.preset = "custom";
      syncPlanarTrackerAndStabilizerUi();
      compileFxNow();
    });
  }
  const stabBlkEl = byId("fx-stab-blocksize");
  if (stabBlkEl) {
    stabBlkEl.addEventListener("change", () => {
      const parsed = Number.parseInt(stabBlkEl.value, 10);
      const clamped = Number.isFinite(parsed) ? Math.max(4, Math.min(64, parsed)) : 8;
      state.stabilizer.blocksize = clamped;
      state.stabilizer.preset = "custom";
      stabBlkEl.value = String(clamped);
      syncPlanarTrackerAndStabilizerUi();
      compileFxNow();
    });
  }
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

  // Titles Safe Guides toggle
  const titlesSafeBtn = byId("btn-titles-safe-guides");
  if (titlesSafeBtn) {
    titlesSafeBtn.addEventListener("click", () => {
      state.titlesSafeGuides = !state.titlesSafeGuides;
      titlesSafeBtn.classList.toggle("is-active", state.titlesSafeGuides);
      titlesSafeBtn.setAttribute("aria-pressed", state.titlesSafeGuides ? "true" : "false");
      redrawActiveCanvases();
    });
  }

  // Captions & Subtitles Track events
  for (const btn of document.querySelectorAll("[data-subtitle-style]")) {
    btn.addEventListener("click", () => {
      const sid = btn.getAttribute("data-subtitle-style");
      if (!sid) return;
      state.subtitleTrack.style = sid;
      const preset = SUBTITLE_STYLE_DEFAULTS[sid];
      if (preset) {
        state.subtitleTrack.font_size = preset.font_size;
        state.subtitleTrack.margin_bottom_pct = preset.margin_bottom_pct;
        state.subtitleTrack.safe_margin_preset = preset.safe_margin_preset;
        state.subtitleTrack.karaoke_mode = preset.karaoke_mode;
        state.subtitleTrack.highlight_color = preset.highlight_color;
        state.subtitleTrack.uppercase = preset.uppercase;
      }
      syncSubtitleControlsFromState();
      updateSubtitleTimingBadges();
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
  byId("subtitle-karaoke-mode").addEventListener("change", (ev) => {
    state.subtitleTrack.karaoke_mode = ev.target.value || "off";
    updateSubtitleTimingBadges();
    redrawActiveCanvases();
    compileSubtitlesNow();
  });
  byId("subtitle-highlight-color").addEventListener("input", (ev) => {
    state.subtitleTrack.highlight_color = String(ev.target.value || "#ffe047").toLowerCase();
    updateSubtitleStyleButtons();
    redrawActiveCanvases();
    scheduleSubtitleCompile();
  });
  for (const sw of document.querySelectorAll("[data-hl-color]")) {
    sw.addEventListener("click", () => {
      const hex = String(sw.getAttribute("data-hl-color") || "#ffe047").toLowerCase();
      state.subtitleTrack.highlight_color = hex;
      const hlInput = byId("subtitle-highlight-color");
      if (hlInput) hlInput.value = hex;
      updateSubtitleStyleButtons();
      redrawActiveCanvases();
      compileSubtitlesNow();
    });
  }
  byId("subtitle-uppercase").addEventListener("change", (ev) => {
    state.subtitleTrack.uppercase = Boolean(ev.target.checked);
    renderSubtitleCueList();
    redrawActiveCanvases();
    compileSubtitlesNow();
  });
  byId("subtitle-safe-margin-preset").addEventListener("change", (ev) => {
    const pid = ev.target.value || "standard";
    state.subtitleTrack.safe_margin_preset = pid;
    if (Object.hasOwn(SUBTITLE_SAFE_MARGIN_MAP, pid)) {
      const pct = SUBTITLE_SAFE_MARGIN_MAP[pid];
      state.subtitleTrack.margin_bottom_pct = pct;
      const pctInt = Math.round(pct * 100);
      byId("subtitle-margin-range").value = String(pctInt);
      byId("subtitle-margin-num").value = String(pctInt);
    }
    redrawActiveCanvases();
    compileSubtitlesNow();
  });
  byId("subtitle-margin-range").addEventListener("input", () => {
    const pctInt = Number.parseInt(byId("subtitle-margin-range").value, 10);
    state.subtitleTrack.margin_bottom_pct = Number((pctInt / 100).toFixed(2));
    state.subtitleTrack.safe_margin_preset = "custom";
    byId("subtitle-margin-num").value = String(pctInt);
    byId("subtitle-safe-margin-preset").value = "custom";
    redrawActiveCanvases();
    scheduleSubtitleCompile();
  });
  byId("subtitle-margin-num").addEventListener("input", () => {
    const val = Number.parseInt(byId("subtitle-margin-num").value, 10);
    if (Number.isFinite(val) && val >= 2 && val <= 45) {
      state.subtitleTrack.margin_bottom_pct = Number((val / 100).toFixed(2));
      state.subtitleTrack.safe_margin_preset = "custom";
      byId("subtitle-margin-range").value = String(val);
      byId("subtitle-safe-margin-preset").value = "custom";
      redrawActiveCanvases();
      scheduleSubtitleCompile();
    }
  });
  byId("subtitle-margin-num").addEventListener("blur", () => {
    const raw = Number.parseInt(byId("subtitle-margin-num").value, 10);
    if (!Number.isFinite(raw) || raw < 2 || raw > 45) {
      byId("subtitle-margin-num").value = String(Math.round(state.subtitleTrack.margin_bottom_pct * 100));
    }
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
      const lower = file.name.toLowerCase();
      const fmt = lower.endsWith(".vtt") ? "vtt" : lower.endsWith(".ass") ? "ass" : "srt";
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
  byId("btn-subtitle-auto-chunk").addEventListener("click", autoChunkSubtitlesNow);
  byId("btn-subtitle-export-srt").addEventListener("click", () => exportSubtitlesAndDownload("srt"));
  byId("btn-subtitle-export-vtt").addEventListener("click", () => exportSubtitlesAndDownload("vtt"));
  byId("btn-subtitle-export-ass").addEventListener("click", () => exportSubtitlesAndDownload("ass"));
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
  byId("btn-subtitle-view-fg").addEventListener("click", () => {
    state.subtitleOutputView = "fg";
    byId("btn-subtitle-view-fg").classList.add("is-active");
    byId("btn-subtitle-view-fg").setAttribute("aria-pressed", "true");
    byId("btn-subtitle-view-ass").classList.remove("is-active");
    byId("btn-subtitle-view-ass").setAttribute("aria-pressed", "false");
    renderSubtitleCompileResult(state.subtitleLastCompile);
  });
  byId("btn-subtitle-view-ass").addEventListener("click", () => {
    state.subtitleOutputView = "ass";
    byId("btn-subtitle-view-ass").classList.add("is-active");
    byId("btn-subtitle-view-ass").setAttribute("aria-pressed", "true");
    byId("btn-subtitle-view-fg").classList.remove("is-active");
    byId("btn-subtitle-view-fg").setAttribute("aria-pressed", "false");
    renderSubtitleCompileResult(state.subtitleLastCompile);
  });
  byId("btn-subtitle-compile").addEventListener("click", compileSubtitlesNow);
  byId("btn-subtitle-copy-fg").addEventListener("click", async () => {
    const res = state.subtitleLastCompile;
    const textToCopy = res
      ? (state.subtitleOutputView === "ass" ? res.ass_preview : res.filtergraph)
      : "";
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      showBanner("Copied Subtitles output to clipboard.", "success");
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
      const nextGrade = {
        lift: c.offset.map((v) => clampColorNum(v, -1, 1)),
        gamma: c.power.map((v) => clampColorNum(1.0 - v, -1, 1)),
        gain: c.slope.map((v) => clampColorNum(v - 1.0, -1, 1)),
        contrast: 1.0,
        saturation: clampColorNum(c.saturation, 0, 3),
        temperature: 0.0
      };
      const active = syncActiveColorGradeFromTree();
      state.colorNodeTree = updateColorNodeInTree(state.colorNodeTree, active.id, {
        grade: nextGrade
      });
      syncActiveColorGradeFromTree();
      state.colorActivePresetId = "";
      syncColorInputsFromState();
      compileColorNow();
      showBanner(`Imported ASC CDL from ${file.name}`, "success");
    } catch (err) {
      showBanner(err.message, "error");
    }
  });

  byId("btn-color-node-add")?.addEventListener("click", addColorNodeAction);
  byId("btn-color-node-outside")?.addEventListener("click", addOutsideColorNodeAction);
  byId("btn-color-node-bypass")?.addEventListener("click", () => toggleColorNodeBypassAction(null));
  byId("btn-color-node-left")?.addEventListener("click", () => moveColorNodeAction(-1));
  byId("btn-color-node-right")?.addEventListener("click", () => moveColorNodeAction(1));
  byId("btn-color-node-reset")?.addEventListener("click", resetSelectedColorNodeAction);
  byId("btn-color-node-delete")?.addEventListener("click", removeColorNodeAction);

  for (const btn of document.querySelectorAll("[data-pw-shape]")) {
    btn.addEventListener("click", () => {
      const shape = btn.getAttribute("data-pw-shape") || "off";
      updateActivePowerWindow({ shape }, true);
    });
  }
  byId("btn-pw-invert")?.addEventListener("click", () => {
    const active = syncActiveColorGradeFromTree();
    if (!isPowerWindowActive(active.power_window)) return;
    updateActivePowerWindow({ invert: !active.power_window.invert }, true);
  });
  byId("btn-pw-overlay")?.addEventListener("click", () => {
    state.powerWindowOverlay = !state.powerWindowOverlay;
    renderColorNodeTreeUI();
    redrawActiveCanvases();
  });
  byId("btn-pw-reset")?.addEventListener("click", () => {
    const active = syncActiveColorGradeFromTree();
    const curShape = active.power_window ? active.power_window.shape : "off";
    updateActivePowerWindow(
      createDefaultPowerWindow({ shape: curShape === "off" ? "off" : curShape }),
      true
    );
  });
  for (const def of POWER_WINDOW_CONTROL_DEFS) {
    const rEl = byId(def.rangeId);
    const nEl = byId(def.numId);
    rEl?.addEventListener("input", () => {
      const raw = Number.parseFloat(rEl.value);
      if (!Number.isFinite(raw)) return;
      const clamped = Math.min(def.max, Math.max(def.min, raw));
      updateActivePowerWindow({ [def.key]: clamped / def.scale }, true);
    });
    nEl?.addEventListener("change", () => {
      const raw = Number.parseFloat(nEl.value);
      if (!Number.isFinite(raw)) {
        renderColorNodeTreeUI();
        return;
      }
      const clamped = Math.min(def.max, Math.max(def.min, raw));
      updateActivePowerWindow({ [def.key]: clamped / def.scale }, true);
    });
  }

  for (const btn of document.querySelectorAll("[data-qual-preset]")) {
    btn.addEventListener("click", () => {
      const presetId = btn.getAttribute("data-qual-preset") || "off";
      applyQualifierPresetAction(presetId);
    });
  }
  byId("btn-qual-pick")?.addEventListener("click", toggleQualifierPickMode);
  byId("btn-qual-highlight")?.addEventListener("click", toggleQualifierHighlight);
  byId("btn-color-qual-highlight")?.addEventListener("click", toggleQualifierHighlight);
  byId("btn-qual-invert")?.addEventListener("click", () => {
    const active = syncActiveColorGradeFromTree();
    if (!isQualifierActive(active.qualifier)) return;
    updateActiveQualifier({ invert: !active.qualifier.invert }, true);
  });
  byId("btn-qual-reset")?.addEventListener("click", () => {
    applyQualifierPresetAction("off");
  });
  for (const def of QUALIFIER_CONTROL_DEFS) {
    const rEl = byId(def.rangeId);
    const nEl = byId(def.numId);
    rEl?.addEventListener("input", () => {
      const raw = Number.parseFloat(rEl.value);
      if (!Number.isFinite(raw)) return;
      const clamped = Math.min(def.max, Math.max(def.min, raw));
      updateActiveQualifier({ [def.key]: clamped / def.scale, preset: "custom" }, true);
    });
    nEl?.addEventListener("change", () => {
      const raw = Number.parseFloat(nEl.value);
      if (!Number.isFinite(raw)) {
        renderColorNodeTreeUI();
        return;
      }
      const clamped = Math.min(def.max, Math.max(def.min, raw));
      updateActiveQualifier({ [def.key]: clamped / def.scale, preset: "custom" }, true);
    });
  }

  for (const btn of document.querySelectorAll("[data-curve-mode]")) {
    btn.addEventListener("click", () => {
      const nextMode = btn.getAttribute("data-curve-mode") || "yrgb";
      if (nextMode !== "yrgb" && !HSL_CURVE_MODES.includes(nextMode)) return;
      state.colorCurvesMode = nextMode;
      state.colorCurvesDrag = null;
      state.hslCurvesDrag = null;
      renderColorNodeTreeUI();
      if (state.activeTab === "color") redrawActiveCanvases();
    });
  }

  for (const btn of document.querySelectorAll("[data-hsl-vector]")) {
    btn.addEventListener("click", () => {
      const vec = btn.getAttribute("data-hsl-vector") || "reds";
      if (!HSL_HUE_VECTORS.includes(vec)) return;
      state.hslCurvesSelectedVec = vec;
      renderColorNodeTreeUI();
      if (state.activeTab === "color") redrawActiveCanvases();
    });
  }

  for (const btn of document.querySelectorAll("[data-hsl-preset]")) {
    btn.addEventListener("click", () => {
      const presetId = btn.getAttribute("data-hsl-preset") || "neutral";
      applyHslCurvePresetAction(presetId);
    });
  }

  for (const btn of document.querySelectorAll("[data-curve-channel]")) {
    btn.addEventListener("click", () => {
      const ch = btn.getAttribute("data-curve-channel") || "master";
      if (!CURVE_CHANNELS.includes(ch)) return;
      state.colorCurvesChannel = ch;
      state.colorCurvesSelectedPt = -1;
      renderColorNodeTreeUI();
      if (state.activeTab === "color") redrawActiveCanvases();
    });
  }

  for (const btn of document.querySelectorAll("[data-curve-preset]")) {
    btn.addEventListener("click", () => {
      const presetId = btn.getAttribute("data-curve-preset") || "linear";
      applyColorCurvePresetAction(presetId);
    });
  }

  byId("btn-curves-delete-pt")?.addEventListener("click", () => {
    if (HSL_CURVE_MODES.includes(state.colorCurvesMode)) return;
    const active = syncActiveColorGradeFromTree();
    const ch = state.colorCurvesChannel || "master";
    const pts = normalizeCurvePoints(normalizeColorCurves(active.curves)[ch]);
    const idx = state.colorCurvesSelectedPt;
    if (idx <= 0 || idx >= pts.length - 1) return;
    const nextPts = pts.filter((_, i) => i !== idx);
    state.colorCurvesSelectedPt = -1;
    updateActiveColorCurvesChannel(ch, nextPts, true, true);
  });

  byId("btn-curves-reset-ch")?.addEventListener("click", () => {
    if (HSL_CURVE_MODES.includes(state.colorCurvesMode)) {
      const mode = state.colorCurvesMode;
      const active = syncActiveColorGradeFromTree();
      const curHsl = normalizeHslCurves(active.hsl_curves);
      commitNodeCurvePatch(
        { hsl_curves: normalizeHslCurves({ ...curHsl, [mode]: {} }) },
        true,
        true
      );
      return;
    }
    const ch = state.colorCurvesChannel || "master";
    state.colorCurvesSelectedPt = -1;
    updateActiveColorCurvesChannel(ch, [[0, 0], [1, 1]], true, true);
  });

  byId("btn-curves-reset-all")?.addEventListener("click", () => {
    state.colorCurvesSelectedPt = -1;
    commitNodeCurvePatch(
      {
        curves: createDefaultColorCurves(),
        hsl_curves: createDefaultHslCurves()
      },
      true,
      true
    );
  });

  const curvesCanvas = byId("color-curves-canvas");
  if (curvesCanvas) {
    const getCurveCanvasCoords = (ev) => {
      const rect = curvesCanvas.getBoundingClientRect();
      const isHsl = HSL_CURVE_MODES.includes(state.colorCurvesMode);
      const fallbackPad = isHsl ? 16 : 14;
      const geom = (isHsl ? curvesCanvas._hslGeom : curvesCanvas._curvesGeom) || {
        pad: fallbackPad,
        width: Math.max(176, rect.width),
        height: 196,
        plotW: Math.max(40, rect.width - fallbackPad * 2),
        plotH: Math.max(40, 196 - fallbackPad * 2 - (isHsl ? 10 : 0))
      };
      const scaleX = rect.width > 0 ? geom.width / rect.width : 1;
      const scaleY = rect.height > 0 ? geom.height / rect.height : 1;
      const px = (ev.clientX - rect.left) * scaleX;
      const py = (ev.clientY - rect.top) * scaleY;
      const u = Math.min(1, Math.max(0, (px - geom.pad) / geom.plotW));
      const v = Math.min(1, Math.max(0, 1 - (py - geom.pad) / geom.plotH));
      return { px, py, u, v, geom };
    };

    const findNearestHslVector = (px, geom) => {
      if (geom && Array.isArray(geom.points) && geom.points.length > 0) {
        let bestVec = geom.points[0].vector;
        let bestDx = Infinity;
        for (const pt of geom.points) {
          const dx = Math.abs(px - pt.x);
          if (dx < bestDx) {
            bestDx = dx;
            bestVec = pt.vector;
          }
        }
        return bestVec;
      }
      return state.hslCurvesSelectedVec || "reds";
    };

    const hslValueFromV = (v, mode) => {
      const bounds = HSL_HUE_BOUNDS[mode] || HSL_HUE_BOUNDS.hue_vs_hue;
      const raw = bounds.min + v * (bounds.max - bounds.min);
      return Math.min(bounds.max, Math.max(bounds.min, raw));
    };

    const findCurveKnotNear = (px, py, geom) => {
      if (!geom || !Array.isArray(geom.points)) return -1;
      let bestIdx = -1;
      let bestDist = 11;
      for (const pt of geom.points) {
        const d = Math.hypot(px - pt.x, py - pt.y);
        if (d <= bestDist) {
          bestDist = d;
          bestIdx = pt.index;
        }
      }
      return bestIdx;
    };

    curvesCanvas.addEventListener("pointerdown", (ev) => {
      if (ev.button === 2) return;
      curvesCanvas.focus();
      const { px, py, u, v, geom } = getCurveCanvasCoords(ev);
      if (HSL_CURVE_MODES.includes(state.colorCurvesMode)) {
        const mode = state.colorCurvesMode;
        const vec = findNearestHslVector(px, geom);
        state.hslCurvesSelectedVec = vec;
        state.hslCurvesDrag = { mode, vector: vec };
        const nextVal = hslValueFromV(v, mode);
        updateActiveHslCurveVector(mode, vec, nextVal, false, false);
        try {
          curvesCanvas.setPointerCapture(ev.pointerId);
        } catch (_) {}
        return;
      }
      const ch = state.colorCurvesChannel || "master";
      const active = syncActiveColorGradeFromTree();
      let pts = normalizeCurvePoints(normalizeColorCurves(active.curves)[ch]);
      let hitIdx = findCurveKnotNear(px, py, geom);
      if (hitIdx < 0) {
        if (pts.length >= MAX_CURVE_POINTS) {
          showBanner(`Curve channel max ${MAX_CURVE_POINTS} knots reached`, "info");
          return;
        }
        const snappedY = Math.round(v * 10000) / 10000;
        const snappedX = Math.round(Math.min(0.99, Math.max(0.01, u)) * 10000) / 10000;
        const merged = normalizeCurvePoints([...pts, [snappedX, snappedY]]);
        hitIdx = merged.findIndex((p) => Math.abs(p[0] - snappedX) < 0.002);
        if (hitIdx < 0) hitIdx = 0;
        pts = merged;
        state.colorCurvesSelectedPt = hitIdx;
        updateActiveColorCurvesChannel(ch, pts, false, false);
      } else {
        state.colorCurvesSelectedPt = hitIdx;
        renderColorCurvesControlsUI(active);
        redrawActiveCanvases();
      }
      state.colorCurvesDrag = { channel: ch, index: hitIdx };
      try {
        curvesCanvas.setPointerCapture(ev.pointerId);
      } catch (_) {}
    });

    curvesCanvas.addEventListener("pointermove", (ev) => {
      if (state.hslCurvesDrag) {
        const { v } = getCurveCanvasCoords(ev);
        const { mode, vector } = state.hslCurvesDrag;
        updateActiveHslCurveVector(mode, vector, hslValueFromV(v, mode), false, false);
        return;
      }
      if (!state.colorCurvesDrag) return;
      const { u, v } = getCurveCanvasCoords(ev);
      const { channel, index } = state.colorCurvesDrag;
      const active = syncActiveColorGradeFromTree();
      const pts = normalizeCurvePoints(normalizeColorCurves(active.curves)[channel]);
      if (index < 0 || index >= pts.length) return;
      let nextX = pts[index][0];
      if (index > 0 && index < pts.length - 1) {
        const minX = pts[index - 1][0] + 0.01;
        const maxX = pts[index + 1][0] - 0.01;
        nextX = Math.min(maxX, Math.max(minX, u));
      }
      const nextY = Math.min(1, Math.max(0, v));
      const updated = pts.map((p, i) =>
        i === index ? [Math.round(nextX * 10000) / 10000, Math.round(nextY * 10000) / 10000] : p
      );
      state.colorCurvesSelectedPt = index;
      updateActiveColorCurvesChannel(channel, updated, false, false);
    });

    const endCurveDrag = (ev) => {
      if (state.hslCurvesDrag) {
        state.hslCurvesDrag = null;
        try {
          if (ev && ev.pointerId !== undefined) curvesCanvas.releasePointerCapture(ev.pointerId);
        } catch (_) {}
        scheduleColorCompile();
        return;
      }
      if (!state.colorCurvesDrag) return;
      state.colorCurvesDrag = null;
      try {
        if (ev && ev.pointerId !== undefined) curvesCanvas.releasePointerCapture(ev.pointerId);
      } catch (_) {}
      scheduleColorCompile();
    };
    curvesCanvas.addEventListener("pointerup", endCurveDrag);
    curvesCanvas.addEventListener("pointercancel", endCurveDrag);

    const removeKnotAtEvent = (ev) => {
      const { px, py, geom } = getCurveCanvasCoords(ev);
      if (HSL_CURVE_MODES.includes(state.colorCurvesMode)) {
        const vec = findNearestHslVector(px, geom);
        state.hslCurvesSelectedVec = vec;
        updateActiveHslCurveVector(state.colorCurvesMode, vec, 0.0, true, true);
        return;
      }
      const hitIdx = findCurveKnotNear(px, py, geom);
      const ch = state.colorCurvesChannel || "master";
      const active = syncActiveColorGradeFromTree();
      const pts = normalizeCurvePoints(normalizeColorCurves(active.curves)[ch]);
      if (hitIdx > 0 && hitIdx < pts.length - 1) {
        const nextPts = pts.filter((_, i) => i !== hitIdx);
        state.colorCurvesSelectedPt = -1;
        updateActiveColorCurvesChannel(ch, nextPts, true, true);
      }
    };
    curvesCanvas.addEventListener("dblclick", removeKnotAtEvent);
    curvesCanvas.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      removeKnotAtEvent(ev);
    });

    curvesCanvas.addEventListener("keydown", (ev) => {
      if (HSL_CURVE_MODES.includes(state.colorCurvesMode)) {
        const mode = state.colorCurvesMode;
        const bounds = HSL_HUE_BOUNDS[mode];
        const vec = HSL_HUE_VECTORS.includes(state.hslCurvesSelectedVec)
          ? state.hslCurvesSelectedVec
          : "reds";
        const vecIdx = HSL_HUE_VECTORS.indexOf(vec);
        if (ev.key === "ArrowLeft") {
          ev.preventDefault();
          ev.stopPropagation();
          state.hslCurvesSelectedVec = HSL_HUE_VECTORS[(vecIdx + 5) % 6];
          renderColorNodeTreeUI();
          if (state.activeTab === "color") redrawActiveCanvases();
          return;
        }
        if (ev.key === "ArrowRight") {
          ev.preventDefault();
          ev.stopPropagation();
          state.hslCurvesSelectedVec = HSL_HUE_VECTORS[(vecIdx + 1) % 6];
          renderColorNodeTreeUI();
          if (state.activeTab === "color") redrawActiveCanvases();
          return;
        }
        if (ev.key === "0" || ev.key === "Delete" || ev.key === "Backspace") {
          ev.preventDefault();
          ev.stopPropagation();
          updateActiveHslCurveVector(mode, vec, 0.0, true, true);
          return;
        }
        const delta = ev.shiftKey ? bounds.step * 0.25 : bounds.step;
        let dv = 0;
        if (ev.key === "ArrowUp") dv = delta;
        else if (ev.key === "ArrowDown") dv = -delta;
        else return;
        ev.preventDefault();
        ev.stopPropagation();
        const active = syncActiveColorGradeFromTree();
        const curVal = normalizeHslCurves(active.hsl_curves)[mode][vec] || 0;
        updateActiveHslCurveVector(mode, vec, curVal + dv, true, false);
        return;
      }
      const idx = state.colorCurvesSelectedPt;
      const ch = state.colorCurvesChannel || "master";
      const active = syncActiveColorGradeFromTree();
      const pts = normalizeCurvePoints(normalizeColorCurves(active.curves)[ch]);
      if (idx < 0 || idx >= pts.length) return;
      if (ev.key === "Delete" || ev.key === "Backspace") {
        if (idx > 0 && idx < pts.length - 1) {
          ev.preventDefault();
          ev.stopPropagation();
          const nextPts = pts.filter((_, i) => i !== idx);
          state.colorCurvesSelectedPt = -1;
          updateActiveColorCurvesChannel(ch, nextPts, true, true);
        }
        return;
      }
      const step = ev.shiftKey ? 0.005 : 0.02;
      let dx = 0;
      let dy = 0;
      if (ev.key === "ArrowUp") dy = step;
      else if (ev.key === "ArrowDown") dy = -step;
      else if (ev.key === "ArrowRight") dx = step;
      else if (ev.key === "ArrowLeft") dx = -step;
      else return;
      ev.preventDefault();
      ev.stopPropagation();
      let nx = pts[idx][0];
      if (idx > 0 && idx < pts.length - 1) {
        nx = Math.min(pts[idx + 1][0] - 0.01, Math.max(pts[idx - 1][0] + 0.01, nx + dx));
      }
      const ny = Math.min(1, Math.max(0, pts[idx][1] + dy));
      const updated = pts.map((p, i) =>
        i === idx ? [Math.round(nx * 10000) / 10000, Math.round(ny * 10000) / 10000] : p
      );
      updateActiveColorCurvesChannel(ch, updated, true, false);
    });
  }

  byId("color-node-label-input")?.addEventListener("change", (ev) => {
    const active = syncActiveColorGradeFromTree();
    const nextLabel = ev.target.value.trim() || active.label;
    state.colorNodeTree = updateColorNodeInTree(state.colorNodeTree, active.id, {
      label: nextLabel
    });
    renderColorNodeTreeUI();
  });

  byId("cube-file-input")?.addEventListener("change", async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    try {
      const cubeContent = await file.text();
      let parsedLut = null;
      try {
        const res = await api.parseCubeLut(cubeContent, file.name);
        if (res && res.lut) {
          parsedLut = {
            title: res.lut.title || file.name.replace(/\.cube$/i, ""),
            dimension: res.lut.dimension,
            size: res.lut.size,
            domainMin: res.lut.domain_min || res.lut.domainMin || [0, 0, 0],
            domainMax: res.lut.domain_max || res.lut.domainMax || [1, 1, 1],
            entryCount: res.lut.entry_count || res.lut.entryCount,
            mix: 1.0,
            table: res.lut.table
          };
        }
      } catch (apiErr) {
        parsedLut = parseCubeLutTextClient(cubeContent, file.name.replace(/\.cube$/i, ""));
        if (!parsedLut) throw apiErr;
      }
      if (!parsedLut) {
        parsedLut = parseCubeLutTextClient(cubeContent, file.name.replace(/\.cube$/i, ""));
      }
      const active = syncActiveColorGradeFromTree();
      state.colorNodeTree = updateColorNodeInTree(state.colorNodeTree, active.id, {
        lut: parsedLut
      });
      syncActiveColorGradeFromTree();
      state.colorActivePresetId = "";
      syncColorInputsFromState();
      compileColorNow();
      showBanner(`Loaded ${parsedLut.dimension} ${parsedLut.size}^3 .cube LUT onto ${active.label}`, "success");
    } catch (err) {
      showBanner(err.message, "error");
    } finally {
      ev.target.value = "";
    }
  });

  const applyLutMixPct = (rawPct) => {
    const active = syncActiveColorGradeFromTree();
    if (!active.lut) return;
    const pct = Math.min(100, Math.max(0, Math.round(Number(rawPct))));
    if (!Number.isFinite(pct)) return;
    const nextLut = { ...active.lut, mix: pct / 100 };
    state.colorNodeTree = updateColorNodeInTree(state.colorNodeTree, active.id, { lut: nextLut });
    syncActiveColorGradeFromTree();
    const rEl = byId("cube-lut-mix-range");
    const nEl = byId("cube-lut-mix-num");
    if (rEl) rEl.value = String(pct);
    if (nEl && document.activeElement !== nEl) nEl.value = String(pct);
    redrawActiveCanvases();
  };

  byId("cube-lut-mix-range")?.addEventListener("input", (ev) => {
    applyLutMixPct(ev.target.value);
  });
  byId("cube-lut-mix-num")?.addEventListener("change", (ev) => {
    applyLutMixPct(ev.target.value);
    renderColorNodeTreeUI();
  });
  byId("btn-color-node-clear-lut")?.addEventListener("click", () => {
    const active = syncActiveColorGradeFromTree();
    state.colorNodeTree = updateColorNodeInTree(state.colorNodeTree, active.id, { lut: null });
    syncActiveColorGradeFromTree();
    syncColorInputsFromState();
    compileColorNow();
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
    updateDeliverSizeEstimate();
  });
  const renderContainerEl = byId("render-container");
  if (renderContainerEl) {
    renderContainerEl.addEventListener("change", () => {
      const ext = renderContainerEl.value === "mov" ? "mov" : "mp4";
      const cur = byId("render-output-path").value.trim() || `renders/delivery.${ext}`;
      const stem = cur.replace(/\.(mp4|mov)$/i, "");
      byId("render-output-path").value = `${stem}.${ext}`;
      markDeliverPresetCustom();
      updateDeliverSizeEstimate();
    });
  }
  const renderCrfEl = byId("render-crf");
  if (renderCrfEl) {
    renderCrfEl.addEventListener("input", () => {
      markDeliverPresetCustom();
      updateDeliverSizeEstimate();
    });
    renderCrfEl.addEventListener("change", updateDeliverSizeEstimate);
  }
  const renderAudioBitrateEl = byId("render-audio-bitrate");
  if (renderAudioBitrateEl) {
    renderAudioBitrateEl.addEventListener("change", () => {
      markDeliverPresetCustom();
      updateDeliverSizeEstimate();
    });
  }
  const renderAudioOnlyEl = byId("render-audio-only-format");
  if (renderAudioOnlyEl) {
    renderAudioOnlyEl.addEventListener("change", () => {
      markDeliverPresetCustom();
      syncDeliverProfileControlsState();
      syncAudioOnlyOutputPath();
      updateDeliverSizeEstimate();
    });
  }
  const renderFpsEl = byId("render-fps");
  if (renderFpsEl) {
    renderFpsEl.addEventListener("input", updateDeliverSizeEstimate);
    renderFpsEl.addEventListener("change", updateDeliverSizeEstimate);
  }
  const renderExportFpsEl = byId("render-export-fps");
  if (renderExportFpsEl) {
    renderExportFpsEl.addEventListener("change", updateDeliverSizeEstimate);
  }
  const renderUseFramingEl = byId("render-use-framing");
  if (renderUseFramingEl) {
    renderUseFramingEl.addEventListener("change", updateDeliverSizeEstimate);
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
        updateDeliverSizeEstimate();
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
      updateDeliverSizeEstimate();
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
  const ltEnabledEl = byId("render-lower-third-enabled");
  if (ltEnabledEl) {
    ltEnabledEl.addEventListener("change", () => {
      state.lowerThird.enabled = Boolean(ltEnabledEl.checked);
      syncLowerThirdControlsUI();
      redrawActiveCanvases();
    });
  }
  for (const btn of document.querySelectorAll(".lower-third-preset-btn[data-lt-preset]")) {
    btn.addEventListener("click", () => {
      const pid = btn.getAttribute("data-lt-preset");
      if (pid) applyLowerThirdPreset(pid);
    });
  }
  const ltTitleEl = byId("render-lower-third-title");
  if (ltTitleEl) {
    ltTitleEl.addEventListener("input", () => {
      state.lowerThird.title = ltTitleEl.value;
      syncLowerThirdControlsUI();
      redrawActiveCanvases();
    });
  }
  const ltSubEl = byId("render-lower-third-subtitle");
  if (ltSubEl) {
    ltSubEl.addEventListener("input", () => {
      state.lowerThird.subtitle = ltSubEl.value;
      syncLowerThirdControlsUI();
      redrawActiveCanvases();
    });
  }
  const ltPosEl = byId("render-lower-third-position");
  if (ltPosEl) {
    ltPosEl.addEventListener("change", () => {
      state.lowerThird.position = ltPosEl.value;
      syncLowerThirdControlsUI();
      redrawActiveCanvases();
    });
  }
  const ltFontSizeEl = byId("render-lower-third-font-size");
  if (ltFontSizeEl) {
    ltFontSizeEl.addEventListener("input", () => {
      const val = Number.parseInt(ltFontSizeEl.value, 10);
      if (Number.isInteger(val) && val >= 16 && val <= 96) {
        state.lowerThird.font_size = val;
        syncLowerThirdControlsUI();
        redrawActiveCanvases();
      }
    });
    ltFontSizeEl.addEventListener("blur", () => {
      const raw = Number.parseInt(ltFontSizeEl.value, 10);
      const clamped = Number.isFinite(raw) ? Math.min(96, Math.max(16, raw)) : state.lowerThird.font_size;
      state.lowerThird.font_size = clamped;
      ltFontSizeEl.value = String(clamped);
      syncLowerThirdControlsUI();
      redrawActiveCanvases();
    });
  }
  const ltOpacityEl = byId("render-lower-third-box-opacity");
  if (ltOpacityEl) {
    const onOpacityChange = () => {
      const val = Number(ltOpacityEl.value);
      if (Number.isFinite(val) && val >= 0 && val <= 1) {
        state.lowerThird.box_opacity = val;
        syncLowerThirdControlsUI();
        redrawActiveCanvases();
      }
    };
    ltOpacityEl.addEventListener("input", onOpacityChange);
    ltOpacityEl.addEventListener("change", onOpacityChange);
  }
  const ltStartEl = byId("render-lower-third-start");
  if (ltStartEl) {
    ltStartEl.addEventListener("input", () => {
      const val = Number.parseFloat(ltStartEl.value);
      if (Number.isFinite(val) && val >= 0 && val <= 86400) {
        state.lowerThird.start_s = val;
        syncLowerThirdControlsUI();
        redrawActiveCanvases();
      }
    });
    ltStartEl.addEventListener("blur", () => {
      const raw = Number.parseFloat(ltStartEl.value);
      const clamped = Number.isFinite(raw) ? Math.min(86400, Math.max(0, raw)) : state.lowerThird.start_s;
      state.lowerThird.start_s = clamped;
      ltStartEl.value = clamped.toFixed(1);
      syncLowerThirdControlsUI();
      redrawActiveCanvases();
    });
  }
  const ltDurEl = byId("render-lower-third-duration");
  if (ltDurEl) {
    ltDurEl.addEventListener("input", () => {
      const val = Number.parseFloat(ltDurEl.value);
      if (Number.isFinite(val) && val >= 0.1 && val <= 86400) {
        state.lowerThird.duration_s = val;
        syncLowerThirdControlsUI();
        redrawActiveCanvases();
      }
    });
    ltDurEl.addEventListener("blur", () => {
      const raw = Number.parseFloat(ltDurEl.value);
      const clamped = Number.isFinite(raw) ? Math.min(86400, Math.max(0.1, raw)) : state.lowerThird.duration_s;
      state.lowerThird.duration_s = clamped;
      ltDurEl.value = clamped.toFixed(1);
      syncLowerThirdControlsUI();
      redrawActiveCanvases();
    });
  }
  syncLowerThirdControlsUI({ syncInputs: true });
  const rtEnabledEl = byId("render-retime-enabled");
  if (rtEnabledEl) {
    rtEnabledEl.addEventListener("change", () => {
      state.deliverRetime.enabled = Boolean(rtEnabledEl.checked);
      syncDeliverRetimeControlsUI();
      updateDeliverSizeEstimate();
    });
  }
  for (const btn of document.querySelectorAll(".retime-deliver-preset-btn[data-deliver-retime-speed]")) {
    btn.addEventListener("click", () => {
      const val = Number.parseFloat(btn.getAttribute("data-deliver-retime-speed") || "1");
      if (!Number.isFinite(val)) return;
      state.deliverRetime.speed = Math.min(RETIME_SPEED_MAX, Math.max(RETIME_SPEED_MIN, val));
      state.deliverRetime.ramp_preset = "constant";
      state.deliverRetime.ramp_points = [];
      if (Math.abs(state.deliverRetime.speed - 1.0) > 1e-6) {
        state.deliverRetime.enabled = true;
      }
      syncDeliverRetimeControlsUI({ syncInputs: true });
      updateDeliverSizeEstimate();
    });
  }
  const rtSpeedEl = byId("render-retime-speed");
  if (rtSpeedEl) {
    const onRtSpeedChange = () => {
      const val = Number.parseFloat(rtSpeedEl.value);
      if (Number.isFinite(val) && val >= RETIME_SPEED_MIN && val <= RETIME_SPEED_MAX) {
        state.deliverRetime.speed = Number(val.toFixed(2));
        state.deliverRetime.ramp_preset = "constant";
        state.deliverRetime.ramp_points = [];
        syncDeliverRetimeControlsUI();
        updateDeliverSizeEstimate();
      }
    };
    rtSpeedEl.addEventListener("input", onRtSpeedChange);
    rtSpeedEl.addEventListener("change", onRtSpeedChange);
  }
  const rtRevBtn = byId("render-retime-reverse");
  if (rtRevBtn) {
    rtRevBtn.addEventListener("click", () => {
      state.deliverRetime.reverse = !state.deliverRetime.reverse;
      if (state.deliverRetime.reverse) {
        state.deliverRetime.enabled = true;
      }
      syncDeliverRetimeControlsUI();
      updateDeliverSizeEstimate();
    });
  }
  const rtProcEl = byId("render-retime-process");
  if (rtProcEl) {
    rtProcEl.addEventListener("change", () => {
      state.deliverRetime.retime_process = normalizeRetimeProcess(rtProcEl.value);
      if (state.deliverRetime.retime_process !== "nearest") {
        state.deliverRetime.enabled = true;
      }
      syncDeliverRetimeControlsUI();
      updateDeliverSizeEstimate();
    });
  }
  const rtRampSelEl = byId("render-retime-ramp-preset");
  if (rtRampSelEl) {
    rtRampSelEl.addEventListener("change", () => {
      const presetId = normalizeRetimeRampPreset(rtRampSelEl.value);
      state.deliverRetime.ramp_preset = presetId;
      state.deliverRetime.ramp_points = resolveRetimeRampPointsForPreset(presetId, []);
      if (presetId !== "constant") {
        state.deliverRetime.enabled = true;
      }
      syncDeliverRetimeControlsUI();
      updateDeliverSizeEstimate();
    });
  }
  syncDeliverRetimeControlsUI({ syncInputs: true });

  const rfEnabledEl = byId("render-reframe-enabled");
  if (rfEnabledEl) {
    rfEnabledEl.addEventListener("change", () => {
      state.reframe.enabled = Boolean(rfEnabledEl.checked);
      if (state.reframe.enabled && state.reframe.aspect_ratio === "source") {
        state.reframe.aspect_ratio = "9:16";
      }
      syncReframeControlsUI();
      redrawActiveCanvases();
    });
  }
  for (const btn of document.querySelectorAll(".reframe-deliver-preset-btn[data-deliver-reframe-ratio]")) {
    btn.addEventListener("click", () => {
      const ratio = String(btn.getAttribute("data-deliver-reframe-ratio") || "source").trim().toLowerCase();
      state.reframe.aspect_ratio = ratio;
      if (ratio !== "source") {
        state.reframe.enabled = true;
      }
      syncReframeControlsUI();
      redrawActiveCanvases();
    });
  }
  const rfPanXEl = byId("render-reframe-pan-x");
  if (rfPanXEl) {
    const onPanXChange = () => {
      const val = Number.parseFloat(rfPanXEl.value);
      if (Number.isFinite(val) && val >= -1 && val <= 1) {
        state.reframe.pan_x = Number(val.toFixed(2));
        syncReframeControlsUI();
        redrawActiveCanvases();
      }
    };
    rfPanXEl.addEventListener("input", onPanXChange);
    rfPanXEl.addEventListener("change", onPanXChange);
  }
  const rfPanYEl = byId("render-reframe-pan-y");
  if (rfPanYEl) {
    const onPanYChange = () => {
      const val = Number.parseFloat(rfPanYEl.value);
      if (Number.isFinite(val) && val >= -1 && val <= 1) {
        state.reframe.pan_y = Number(val.toFixed(2));
        syncReframeControlsUI();
        redrawActiveCanvases();
      }
    };
    rfPanYEl.addEventListener("input", onPanYChange);
    rfPanYEl.addEventListener("change", onPanYChange);
  }
  const rfResetBtn = byId("render-reframe-reset");
  if (rfResetBtn) {
    rfResetBtn.addEventListener("click", () => {
      state.reframe.pan_x = 0.0;
      state.reframe.pan_y = 0.0;
      syncReframeControlsUI({ syncInputs: true });
      redrawActiveCanvases();
    });
  }
  syncReframeControlsUI({ syncInputs: true });

  const fgEnabledEl = byId("render-film-grain-enabled");
  if (fgEnabledEl) {
    fgEnabledEl.addEventListener("change", () => {
      state.filmGrain.enabled = Boolean(fgEnabledEl.checked);
      syncFilmGrainControlsUI();
      redrawActiveCanvases();
    });
  }
  for (const btn of document.querySelectorAll(".film-grain-deliver-preset-btn[data-deliver-film-grain-preset]")) {
    btn.addEventListener("click", () => {
      const preset = String(btn.getAttribute("data-deliver-film-grain-preset") || "35mm_fine").trim().toLowerCase();
      state.filmGrain.preset = preset;
      if (Object.prototype.hasOwnProperty.call(FILM_GRAIN_PRESET_STRENGTHS, preset)) {
        state.filmGrain.strength = FILM_GRAIN_PRESET_STRENGTHS[preset];
      }
      state.filmGrain.enabled = true;
      syncFilmGrainControlsUI({ syncInputs: true });
      redrawActiveCanvases();
    });
  }
  const fgStrengthEl = byId("render-film-grain-strength");
  if (fgStrengthEl) {
    const onStrengthChange = () => {
      const val = Number.parseInt(fgStrengthEl.value, 10);
      if (Number.isInteger(val) && val >= 0 && val <= 60) {
        state.filmGrain.strength = val;
        const matchedPreset = Object.entries(FILM_GRAIN_PRESET_STRENGTHS).find(([, s]) => s === val);
        state.filmGrain.preset = matchedPreset ? matchedPreset[0] : "custom";
        syncFilmGrainControlsUI();
        redrawActiveCanvases();
      }
    };
    fgStrengthEl.addEventListener("input", onStrengthChange);
    fgStrengthEl.addEventListener("change", onStrengthChange);
  }
  const fgTemporalEl = byId("render-film-grain-temporal");
  if (fgTemporalEl) {
    fgTemporalEl.addEventListener("change", () => {
      state.filmGrain.temporal = Boolean(fgTemporalEl.checked);
      syncFilmGrainControlsUI();
      redrawActiveCanvases();
    });
  }
  syncFilmGrainControlsUI({ syncInputs: true });

  const vigEnabledEl = byId("render-vignette-enabled");
  if (vigEnabledEl) {
    vigEnabledEl.addEventListener("change", () => {
      state.vignette.enabled = Boolean(vigEnabledEl.checked);
      syncVignetteControlsUI();
      redrawActiveCanvases();
    });
  }
  for (const btn of document.querySelectorAll(".vignette-deliver-preset-btn[data-deliver-vignette-preset]")) {
    btn.addEventListener("click", () => {
      const preset = String(btn.getAttribute("data-deliver-vignette-preset") || "subtle_cinema").trim().toLowerCase();
      state.vignette.preset = preset;
      if (Object.prototype.hasOwnProperty.call(VIGNETTE_PRESET_ANGLES_DEG, preset)) {
        state.vignette.angle_deg = VIGNETTE_PRESET_ANGLES_DEG[preset];
      }
      state.vignette.enabled = true;
      syncVignetteControlsUI({ syncInputs: true });
      redrawActiveCanvases();
    });
  }
  const vigAngleEl = byId("render-vignette-angle");
  if (vigAngleEl) {
    const onAngleChange = () => {
      const val = Number.parseFloat(vigAngleEl.value);
      if (Number.isFinite(val) && val >= 5.0 && val <= 75.0) {
        state.vignette.angle_deg = val;
        const matchedPreset = Object.entries(VIGNETTE_PRESET_ANGLES_DEG).find(([, deg]) => Math.abs(deg - val) < 1e-6);
        state.vignette.preset = matchedPreset ? matchedPreset[0] : "custom";
        syncVignetteControlsUI();
        redrawActiveCanvases();
      }
    };
    vigAngleEl.addEventListener("input", onAngleChange);
    vigAngleEl.addEventListener("change", onAngleChange);
  }
  const vigModeEl = byId("render-vignette-mode");
  if (vigModeEl) {
    vigModeEl.addEventListener("change", () => {
      const val = String(vigModeEl.value || "forward").trim().toLowerCase();
      state.vignette.mode = val === "backward" ? "backward" : "forward";
      syncVignetteControlsUI();
      redrawActiveCanvases();
    });
  }
  syncVignetteControlsUI({ syncInputs: true });

  const matchVoiceCleanupPreset = () => {
    const hit = Object.entries(VOICE_CLEANUP_PRESETS).find(([, spec]) => (
      spec.highpass_hz === state.voiceCleanup.highpass_hz &&
      Math.abs(spec.presence_db - state.voiceCleanup.presence_db) < 1e-6 &&
      Math.abs(spec.de_ess - state.voiceCleanup.de_ess) < 1e-6
    ));
    state.voiceCleanup.preset = hit ? hit[0] : "custom";
  };

  const vcEnabledEl = byId("render-voice-cleanup-enabled");
  if (vcEnabledEl) {
    vcEnabledEl.addEventListener("change", () => {
      state.voiceCleanup.enabled = Boolean(vcEnabledEl.checked);
      state.masterBus = normalizeMasterBusState({
        ...state.masterBus,
        voice_isolation: state.voiceCleanup.enabled
      });
      syncVoiceCleanupControlsUI();
      renderTimelineAudioInspector();
      renderFairlightAudioUI();
    });
  }
  for (const btn of document.querySelectorAll(".voice-cleanup-deliver-preset-btn[data-deliver-voice-cleanup-preset]")) {
    btn.addEventListener("click", () => {
      const preset = String(btn.getAttribute("data-deliver-voice-cleanup-preset") || "youtube_voice").trim().toLowerCase();
      state.voiceCleanup.preset = preset;
      if (Object.prototype.hasOwnProperty.call(VOICE_CLEANUP_PRESETS, preset)) {
        const spec = VOICE_CLEANUP_PRESETS[preset];
        state.voiceCleanup.highpass_hz = spec.highpass_hz;
        state.voiceCleanup.presence_db = spec.presence_db;
        state.voiceCleanup.de_ess = spec.de_ess;
      }
      state.voiceCleanup.enabled = true;
      syncVoiceCleanupControlsUI({ syncInputs: true });
    });
  }
  const vcHpEl = byId("render-voice-cleanup-highpass");
  if (vcHpEl) {
    const onHpChange = () => {
      const val = Number.parseInt(vcHpEl.value, 10);
      if (Number.isInteger(val) && val >= 40 && val <= 200) {
        state.voiceCleanup.highpass_hz = val;
        matchVoiceCleanupPreset();
        syncVoiceCleanupControlsUI();
      }
    };
    vcHpEl.addEventListener("input", onHpChange);
    vcHpEl.addEventListener("change", onHpChange);
  }
  const vcPresEl = byId("render-voice-cleanup-presence");
  if (vcPresEl) {
    const onPresChange = () => {
      const val = Number.parseFloat(vcPresEl.value);
      if (Number.isFinite(val) && val >= -6.0 && val <= 6.0) {
        state.voiceCleanup.presence_db = val;
        matchVoiceCleanupPreset();
        syncVoiceCleanupControlsUI();
      }
    };
    vcPresEl.addEventListener("input", onPresChange);
    vcPresEl.addEventListener("change", onPresChange);
  }
  const vcDeEssEl = byId("render-voice-cleanup-deess");
  if (vcDeEssEl) {
    const onDeEssChange = () => {
      const val = Number.parseFloat(vcDeEssEl.value);
      if (Number.isFinite(val) && val >= 0.0 && val <= 1.0) {
        state.voiceCleanup.de_ess = val;
        matchVoiceCleanupPreset();
        syncVoiceCleanupControlsUI();
      }
    };
    vcDeEssEl.addEventListener("input", onDeEssChange);
    vcDeEssEl.addEventListener("change", onDeEssChange);
  }
  syncVoiceCleanupControlsUI({ syncInputs: true });
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
  const exportEdlBtn = byId("btn-export-cmx-edl");
  if (exportEdlBtn) exportEdlBtn.addEventListener("click", exportCmx3600Edl);
  const exportFcpxmlBtn = byId("btn-export-fcpxml");
  if (exportFcpxmlBtn) exportFcpxmlBtn.addEventListener("click", exportFcpxmlTimeline);

  // QA page events
  byId("qa-media-select").addEventListener("change", () => {
    const val = byId("qa-media-select").value;
    if (val) byId("qa-media-path").value = val;
  });
  byId("btn-run-qa").addEventListener("click", runBroadcastQa);
  byId("btn-qa-gen-sample").addEventListener("click", generateSampleClip);

  document.addEventListener("keydown", handleTransportKeydown);
  window.addEventListener("resize", redrawActiveCanvases);
  wireFairlightAudioRackEvents();
}

function wireFairlightAudioRackEvents() {
  const updateRack = (mutator) => {
    const next = normalizeFairlightAudioRackParams(state.fairlightRack);
    mutator(next);
    state.fairlightRack = normalizeFairlightAudioRackParams(next);
    renderFairlightAudioUI();
  };

  for (const tabBtn of document.querySelectorAll(".fairlight-rack-tab-btn[data-rack-tab]")) {
    tabBtn.addEventListener("click", () => {
      switchFairlightRackTab(tabBtn.getAttribute("data-rack-tab"));
    });
    tabBtn.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
        ev.preventDefault();
        const nextTab = state.fairlightRackTab === "eq" ? "dyn" : "eq";
        switchFairlightRackTab(nextTab);
        const focusEl = byId(nextTab === "eq" ? "fairlight-rack-tab-eq" : "fairlight-rack-tab-dyn");
        if (focusEl) focusEl.focus();
      }
    });
  }

  byId("fairlight-rack-preset")?.addEventListener("change", (ev) => {
    state.fairlightRack = applyFairlightRackPresetClient(ev.target.value);
    renderFairlightAudioUI();
  });

  byId("btn-fairlight-rack-reset")?.addEventListener("click", () => {
    state.fairlightRack = applyFairlightRackPresetClient("flat");
    renderFairlightAudioUI();
  });

  byId("btn-fairlight-eq-toggle")?.addEventListener("click", () => {
    updateRack((r) => {
      r.eq_enabled = !r.eq_enabled;
    });
  });

  byId("btn-fairlight-hpf-toggle")?.addEventListener("click", () => {
    updateRack((r) => {
      r.hpf_enabled = !r.hpf_enabled;
      if (r.hpf_enabled) r.eq_enabled = true;
    });
  });

  byId("fairlight-hpf-hz")?.addEventListener("input", (ev) => {
    const val = Number.parseFloat(ev.target.value);
    if (!Number.isFinite(val)) return;
    updateRack((r) => {
      r.hpf_hz = Math.max(20, Math.min(250, val));
    });
  });

  for (const btn of document.querySelectorAll(".fairlight-band-btn[data-eq-band]")) {
    btn.addEventListener("click", () => {
      const bandId = btn.getAttribute("data-eq-band");
      if (FAIRLIGHT_EQ_BAND_ORDER.includes(bandId)) {
        state.fairlightRackBandId = bandId;
        renderFairlightAudioRackUI();
      }
    });
  }

  byId("btn-fairlight-band-enable")?.addEventListener("click", () => {
    updateRack((r) => {
      const b = r.bands.find((x) => x.band_id === state.fairlightRackBandId);
      if (b) b.enabled = !b.enabled;
    });
  });

  const bindBandParam = (rangeId, numId, prop, minV, maxV, autoEnableEq = false) => {
    const onVal = (raw) => {
      const val = Number.parseFloat(raw);
      if (!Number.isFinite(val)) return;
      const spec = FAIRLIGHT_EQ_BAND_SPECS[state.fairlightRackBandId];
      const lo = prop === "freq_hz" && spec ? spec.minFreq : minV;
      const hi = prop === "freq_hz" && spec ? spec.maxFreq : maxV;
      updateRack((r) => {
        const b = r.bands.find((x) => x.band_id === state.fairlightRackBandId);
        if (b) {
          b[prop] = Math.max(lo, Math.min(hi, val));
          if (autoEnableEq && Math.abs(b.gain_db) > 1e-6) {
            r.eq_enabled = true;
            b.enabled = true;
          }
        }
      });
    };
    byId(rangeId)?.addEventListener("input", (ev) => onVal(ev.target.value));
    byId(numId)?.addEventListener("input", (ev) => onVal(ev.target.value));
  };
  bindBandParam("fairlight-band-freq-range", "fairlight-band-freq-num", "freq_hz", 20, 20000, false);
  bindBandParam("fairlight-band-gain-range", "fairlight-band-gain-num", "gain_db", -18, 18, true);
  bindBandParam("fairlight-band-q-range", "fairlight-band-q-num", "q", 0.3, 10, false);

  // Interactive pointer drag on 4-Band EQ canvas
  const eqCanvas = byId("fairlight-eq-canvas");
  if (eqCanvas) {
    let draggingBandId = null;
    const applyPointerToBand = (ev) => {
      const geom = eqCanvas._fairlightEqGeom;
      if (!geom || !draggingBandId) return;
      const rect = eqCanvas.getBoundingClientRect();
      const px = ev.clientX - rect.left;
      const py = ev.clientY - rect.top;
      const u = Math.max(0, Math.min(1, (px - geom.padL) / Math.max(1, geom.plotW)));
      const v = Math.max(0, Math.min(1, (py - geom.padT) / Math.max(1, geom.plotH)));
      const freq = Math.pow(10, geom.logMin + u * (geom.logMax - geom.logMin));
      const gain = 18 - v * 36;
      const spec = FAIRLIGHT_EQ_BAND_SPECS[draggingBandId];
      updateRack((r) => {
        r.eq_enabled = true;
        const b = r.bands.find((x) => x.band_id === draggingBandId);
        if (b && spec) {
          b.enabled = true;
          b.freq_hz = Math.round(Math.max(spec.minFreq, Math.min(spec.maxFreq, freq)));
          b.gain_db = Number(Math.max(-18, Math.min(18, gain)).toFixed(1));
        }
      });
    };
    eqCanvas.addEventListener("pointerdown", (ev) => {
      const geom = eqCanvas._fairlightEqGeom;
      if (!geom || !Array.isArray(geom.nodes)) return;
      const rect = eqCanvas.getBoundingClientRect();
      const px = ev.clientX - rect.left;
      const py = ev.clientY - rect.top;
      let best = null;
      let bestDist = 24;
      for (const n of geom.nodes) {
        const d = Math.hypot(px - n.x, py - n.y);
        if (d < bestDist) {
          bestDist = d;
          best = n;
        }
      }
      if (best) {
        draggingBandId = best.band_id;
        state.fairlightRackBandId = best.band_id;
        eqCanvas.setPointerCapture?.(ev.pointerId);
        applyPointerToBand(ev);
      }
    });
    eqCanvas.addEventListener("pointermove", (ev) => {
      if (draggingBandId) applyPointerToBand(ev);
    });
    const endDrag = (ev) => {
      if (!draggingBandId) return;
      draggingBandId = null;
      try {
        eqCanvas.releasePointerCapture?.(ev.pointerId);
      } catch {
        // ignore release when not captured
      }
    };
    eqCanvas.addEventListener("pointerup", endDrag);
    eqCanvas.addEventListener("pointercancel", endDrag);
  }

  // Dynamics Compressor & Limiter controls
  byId("btn-fairlight-comp-toggle")?.addEventListener("click", () => {
    updateRack((r) => {
      r.compressor.enabled = !r.compressor.enabled;
    });
  });

  const bindCompParam = (id, prop, minV, maxV) => {
    byId(id)?.addEventListener("input", (ev) => {
      const val = Number.parseFloat(ev.target.value);
      if (!Number.isFinite(val)) return;
      updateRack((r) => {
        r.compressor[prop] = Math.max(minV, Math.min(maxV, val));
      });
    });
  };
  bindCompParam("fairlight-comp-thresh-range", "threshold_db", -60, 0);
  bindCompParam("fairlight-comp-thresh-num", "threshold_db", -60, 0);
  bindCompParam("fairlight-comp-ratio-num", "ratio", 1, 20);
  bindCompParam("fairlight-comp-attack-num", "attack_ms", 0.5, 250);
  bindCompParam("fairlight-comp-release-num", "release_ms", 10, 1500);
  bindCompParam("fairlight-comp-makeup-num", "makeup_db", 0, 24);

  byId("btn-fairlight-lim-toggle")?.addEventListener("click", () => {
    updateRack((r) => {
      r.limiter.enabled = !r.limiter.enabled;
    });
  });

  const bindLimCeiling = (id) => {
    byId(id)?.addEventListener("input", (ev) => {
      const val = Number.parseFloat(ev.target.value);
      if (!Number.isFinite(val)) return;
      updateRack((r) => {
        r.limiter.ceiling_db = Math.max(-12, Math.min(-0.1, val));
      });
    });
  };
  bindLimCeiling("fairlight-lim-ceiling-range");
  bindLimCeiling("fairlight-lim-ceiling-num");
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
  switchDeliverSettingsTab(state.deliverSettingsTab);
  syncDeliverTabIndicators();
  renderFairlightAudioUI();
  renderDeliveryPresetStrip();
  updateDeliverSizeEstimate();
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
  syncPlanarTrackerAndStabilizerUi();
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
