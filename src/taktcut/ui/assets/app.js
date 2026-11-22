import {
  drawColorPreviewCanvas,
  drawColorScopeCanvas,
  drawFramesCanvas,
  drawLoudnessCanvas,
  drawProgramMonitorCanvas,
  drawTimelineCanvas,
  framesToSmpte
} from "./canvas.js";
import { bindColorWheelEvents, drawColorWheel } from "./color_wheels.js";
import { createApiClient } from "./demo_adapter.js";
import { TRANSLATIONS } from "./i18n.js";

const api = createApiClient();

const CDL_PRESETS = {
  neutral: {
    slope: [1.0, 1.0, 1.0],
    offset: [0.0, 0.0, 0.0],
    power: [1.0, 1.0, 1.0],
    saturation: 1.0
  },
  warm: {
    slope: [1.06, 1.0, 0.94],
    offset: [0.01, 0.0, -0.01],
    power: [0.96, 0.98, 1.03],
    saturation: 1.12
  },
  teal: {
    slope: [1.08, 1.01, 0.9],
    offset: [-0.015, 0.005, 0.025],
    power: [0.95, 1.0, 1.04],
    saturation: 1.16
  },
  bleach: {
    slope: [1.14, 1.14, 1.14],
    offset: [-0.025, -0.025, -0.025],
    power: [1.08, 1.08, 1.08],
    saturation: 0.72
  },
  cool: {
    slope: [0.94, 0.99, 1.07],
    offset: [-0.005, 0.0, 0.012],
    power: [1.02, 1.0, 0.95],
    saturation: 1.04
  }
};

const state = {
  lang: "en",
  activeTab: "timeline",
  timelineDoc: null,
  timelineValidation: null,
  timelineHitboxes: [],
  timelineFrameToX: null,
  timelineXToFrame: null,
  timelineRulerHeight: 36,
  timelineLabelColW: 118,
  timelineSelected: null,
  timelineZoom: 1,
  playheadFrame: 25,
  timelineMaxFrame: 500,
  playbackSpeed: 0,
  playbackRafId: null,
  playbackLastTs: 0,
  playbackAccumFrames: 0,
  cdl: {
    slope: [1.06, 1.0, 0.94],
    offset: [0.01, 0.0, -0.01],
    power: [0.96, 0.98, 1.03],
    saturation: 1.12
  },
  wipeRatio: 0.5,
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
  fxCompileTimer: null
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
  updateTransportStatusUI();
  renderUpdateButton();
  renderTimelineUI();
  renderFxStack();
  if (state.fxLastCompile) renderFxCompileResult(state.fxLastCompile);
  if (state.lastQaReport) renderQaReport(state.lastQaReport);
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
  if (tabName !== "timeline" && tabName !== "fx" && state.playbackSpeed !== 0) {
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
}

function redrawActiveCanvases() {
  if (state.activeTab === "timeline") {
    drawProgramMonitorCanvas(
      byId("timeline-program-canvas"),
      state.timelineDoc,
      state.playheadFrame,
      state.cdl,
      getEffectiveFxState()
    );
    const tlDraw = drawTimelineCanvas(
      byId("timeline-canvas"),
      state.timelineDoc,
      state.timelineValidation,
      { zoom: state.timelineZoom, selected: state.timelineSelected, playheadFrame: state.playheadFrame }
    );
    state.timelineHitboxes = tlDraw.hitboxes;
    state.timelineFrameToX = tlDraw.frameToX;
    state.timelineXToFrame = tlDraw.xToFrame;
    state.timelineRulerHeight = tlDraw.rulerHeight;
    state.timelineLabelColW = tlDraw.labelColW;
  } else if (state.activeTab === "fx") {
    drawProgramMonitorCanvas(
      byId("fx-program-canvas"),
      state.timelineDoc,
      state.playheadFrame,
      state.cdl,
      getEffectiveFxState()
    );
  } else if (state.activeTab === "color") {
    drawColorPreviewCanvas(byId("color-preview-canvas"), state.cdl, state.wipeRatio);
    drawColorScopeCanvas(byId("color-scope-canvas"), state.cdl);
    drawColorWheel(byId("wheel-offset"), "offset", state.cdl.offset);
    drawColorWheel(byId("wheel-power"), "power", state.cdl.power);
    drawColorWheel(byId("wheel-slope"), "slope", state.cdl.slope);
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

  const doc = state.timelineDoc;
  if (doc) {
    let maxEnd = doc.start_frame || 0;
    let firstClip = null;
    for (const trk of doc.tracks || []) {
      for (const c of trk.clips || []) {
        if (!firstClip) firstClip = c;
        if (c.start_frame + c.duration_frames > maxEnd) maxEnd = c.start_frame + c.duration_frames;
      }
    }
    state.timelineMaxFrame = Math.max(1, maxEnd);
    state.playheadFrame = Math.min(state.playheadFrame, state.timelineMaxFrame);

    let activeAtPlayhead = null;
    for (const trk of doc.tracks || []) {
      if (trk.kind !== "video") continue;
      for (const c of trk.clips || []) {
        if (state.playheadFrame >= c.start_frame && state.playheadFrame < c.start_frame + c.duration_frames) {
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
    byId("timeline-issues-list").replaceChildren();
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
  renderTimelineSelection();
  renderTimelineIssues();
  if (state.activeTab === "timeline") {
    redrawActiveCanvases();
  }
}

function renderTimelineSelection() {
  const box = byId("timeline-selection-detail");
  const sel = state.timelineSelected;
  if (!sel) {
    box.replaceChildren(dom("span", "kv-val", t("timeline.empty.selection")));
    return;
  }
  if (sel.kind === "clip") {
    const c = sel.data;
    const srcFps = c.source_fps
      ? c.source_fps.den === 1
        ? String(c.source_fps.num)
        : `${c.source_fps.num}/${c.source_fps.den}`
      : "inherit";
    renderKv(box, [
      ["Type", `Clip (${c.media_type.toUpperCase()})`],
      ["Name", c.name],
      ["Track", `${c.media_type === "audio" ? "A" : "V"}${c.track_index}`],
      ["Range", `${c.start_frame}f .. ${c.start_frame + c.duration_frames}f (${c.duration_frames}f)`],
      ["Source In", `${c.source_in_frame}f (${srcFps})`],
      ["Source Path", c.source_path || t("common.none")]
    ]);
    return;
  }
  const mk = sel.data;
  renderKv(box, [
    ["Type", "Marker"],
    ["Name", mk.name],
    ["Frame", `${mk.frame}f (${mk.duration_frames}f)`],
    ["Color", mk.color],
    ["Note", mk.note || t("common.none")]
  ]);
}

function renderTimelineIssues() {
  const list = byId("timeline-issues-list");
  const doc = state.timelineDoc;
  const val = state.timelineValidation;
  const items = [];

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

  if (doc && doc.markers && doc.markers.length > 0) {
    for (const mk of doc.markers) {
      const li = dom("div", "issue-item");
      const head = dom("div", "issue-head");
      head.replaceChildren(
        dom("span", "nle-tag is-blue mono", `MARKER @ ${mk.frame}f`),
        dom("span", "mono", mk.color)
      );
      li.replaceChildren(head, dom("span", "", `${mk.name}${mk.note ? " - " + mk.note : ""}`));
      items.push(li);
    }
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
  ]
};

const FX_DISPLAY_TITLES = {
  glow: "S_Glow",
  shake: "S_Shake",
  flicker: "S_Flicker",
  lens_flare: "S_LensFlare",
  film_damage: "S_FilmDamage",
  chroma_aberration: "S_ChromaAberration"
};

function getFxSpecs(effect) {
  if (state.fxSpecs && state.fxSpecs[effect]) return state.fxSpecs[effect];
  return FX_PARAM_FALLBACK[effect] || [];
}

function createDefaultFxNode(effect) {
  const params = {};
  for (const sp of getFxSpecs(effect)) {
    params[sp.name] = sp.default;
  }
  return { effect, enabled: true, params };
}

function updateFxBadges() {
  const total = state.fxStack.length;
  const activeCount = state.fxBypassAll ? 0 : state.fxStack.filter((n) => n.enabled).length;
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
  renderKv(kv, [
    ["Active FX", res.active_effects.join(", ") || t("common.none")],
    ["Est. Render", `${res.estimated_render_seconds.toFixed(2)}s`],
    ["Realtime", `${res.realtime_factor.toFixed(2)}x`],
    ["Complexity", `${res.complexity_tier.toUpperCase()} (${res.bypassed_count} bypassed)`]
  ]);
  out.textContent = res.filtergraph;
}

async function compileFxNow() {
  try {
    const durRaw = Number.parseFloat(byId("fx-duration-input").value);
    const duration_seconds = Number.isFinite(durRaw) && durRaw > 0 ? durRaw : 10;
    const resStr = byId("fx-resolution-select").value || "1920x1080";
    const [wStr, hStr] = resStr.split("x");
    const width = Number.parseInt(wStr, 10) || 1920;
    const height = Number.parseInt(hStr, 10) || 1080;
    const use_gpu = byId("fx-use-gpu").checked;
    const fps = getTimelineFps();

    const nodesPayload = state.fxBypassAll
      ? state.fxStack.map((n) => ({ ...n, enabled: false }))
      : state.fxStack;

    const compiled = await api.compileFx({
      nodes: nodesPayload,
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

function renderFxStack() {
  const container = byId("fx-controls-stack");
  if (!container) return;
  updateFxBadges();

  if (state.fxStack.length === 0) {
    container.replaceChildren(dom("div", "fx-empty-note", t("fx.controls.empty")));
    return;
  }

  const cards = state.fxStack.map((node, nodeIdx) => {
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
    const rstBtn = dom("button", "btn btn-mini", t("fx.controls.reset"));
    rstBtn.type = "button";
    rstBtn.addEventListener("click", () => {
      const def = createDefaultFxNode(node.effect);
      node.params = { ...def.params };
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

    actions.replaceChildren(rstBtn, rmBtn);
    head.replaceChildren(titleGroup, actions);

    // Parameters
    const paramGrid = dom("div", "fx-param-grid");
    const specs = getFxSpecs(node.effect);
    for (const spec of specs) {
      const row = dom("div", "fx-param-row");
      const inputId = `fx-node-${nodeIdx}-${spec.name}`;
      const label = dom("label", "fx-param-label", spec.label);
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
        numInput.setAttribute("aria-label", `${spec.label} value`);

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

    card.replaceChildren(head, paramGrid);
    return card;
  });

  container.replaceChildren(...cards);
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
    params: { ...n.params }
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

/* PAGE 3: COLOR WHEELS, BARS, SCOPES & .CUBE */
const CDL_BINDINGS = [
  { group: "slope", idx: 0, range: "slope-r-range", num: "slope-r-num", decimals: 2 },
  { group: "slope", idx: 1, range: "slope-g-range", num: "slope-g-num", decimals: 2 },
  { group: "slope", idx: 2, range: "slope-b-range", num: "slope-b-num", decimals: 2 },
  { group: "offset", idx: 0, range: "offset-r-range", num: "offset-r-num", decimals: 3 },
  { group: "offset", idx: 1, range: "offset-g-range", num: "offset-g-num", decimals: 3 },
  { group: "offset", idx: 2, range: "offset-b-range", num: "offset-b-num", decimals: 3 },
  { group: "power", idx: 0, range: "power-r-range", num: "power-r-num", decimals: 2 },
  { group: "power", idx: 1, range: "power-g-range", num: "power-g-num", decimals: 2 },
  { group: "power", idx: 2, range: "power-b-range", num: "power-b-num", decimals: 2 }
];

function syncCdlInputsFromState() {
  for (const b of CDL_BINDINGS) {
    const val = state.cdl[b.group][b.idx];
    byId(b.range).value = String(val);
    byId(b.num).value = val.toFixed(b.decimals);
  }
  byId("sat-range").value = String(state.cdl.saturation);
  byId("sat-num").value = state.cdl.saturation.toFixed(2);
  if (state.activeTab === "color" || state.activeTab === "timeline") {
    redrawActiveCanvases();
  }
}

function wireCdlInputs() {
  for (const b of CDL_BINDINGS) {
    const rangeEl = byId(b.range);
    const numEl = byId(b.num);
    rangeEl.addEventListener("input", () => {
      const val = Number.parseFloat(rangeEl.value);
      if (Number.isFinite(val)) {
        state.cdl[b.group][b.idx] = val;
        numEl.value = val.toFixed(b.decimals);
        redrawActiveCanvases();
      }
    });
    numEl.addEventListener("change", () => {
      const val = Number.parseFloat(numEl.value);
      if (Number.isFinite(val)) {
        state.cdl[b.group][b.idx] = val;
        rangeEl.value = String(val);
        redrawActiveCanvases();
      }
    });
  }

  for (const group of ["offset", "power", "slope"]) {
    const wheelCanvas = byId(`wheel-${group}`);
    bindColorWheelEvents(
      wheelCanvas,
      group,
      () => state.cdl[group],
      (nextRgb) => {
        state.cdl[group] = nextRgb;
        syncCdlInputsFromState();
      }
    );
    byId(`btn-reset-${group}`).addEventListener("click", () => {
      state.cdl[group] = group === "offset" ? [0.0, 0.0, 0.0] : [1.0, 1.0, 1.0];
      syncCdlInputsFromState();
    });
  }

  const satRange = byId("sat-range");
  const satNum = byId("sat-num");
  satRange.addEventListener("input", () => {
    const val = Number.parseFloat(satRange.value);
    if (Number.isFinite(val)) {
      state.cdl.saturation = val;
      satNum.value = val.toFixed(2);
      redrawActiveCanvases();
    }
  });
  satNum.addEventListener("change", () => {
    const val = Number.parseFloat(satNum.value);
    if (Number.isFinite(val)) {
      state.cdl.saturation = val;
      satRange.value = String(val);
      redrawActiveCanvases();
    }
  });

  const wipeSlider = byId("cdl-wipe-slider");
  wipeSlider.addEventListener("input", () => {
    state.wipeRatio = Number.parseFloat(wipeSlider.value);
    byId("cdl-wipe-label").textContent = `${Math.round(state.wipeRatio * 100)}%`;
    redrawActiveCanvases();
  });

  for (const btn of document.querySelectorAll("[data-cdl-preset]")) {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-cdl-preset");
      const preset = CDL_PRESETS[key];
      if (!preset) return;
      state.cdl = {
        slope: [...preset.slope],
        offset: [...preset.offset],
        power: [...preset.power],
        saturation: preset.saturation
      };
      syncCdlInputsFromState();
    });
  }

  byId("btn-cdl-reset").addEventListener("click", () => {
    const n = CDL_PRESETS.neutral;
    state.cdl = {
      slope: [...n.slope],
      offset: [...n.offset],
      power: [...n.power],
      saturation: n.saturation
    };
    syncCdlInputsFromState();
  });

  byId("cube-size-select").addEventListener("change", () => {
    const s = byId("cube-size-select").value;
    byId("cube-info-badge").textContent = `${s}x${s}x${s}`;
  });
}

async function bakeCubeLut() {
  try {
    const size = Number.parseInt(byId("cube-size-select").value, 10);
    const title = byId("cube-title-input").value.trim() || "taktcut_cdl";
    const outPath = byId("cube-out-path").value.trim();
    const payload = {
      ...state.cdl,
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
    const title = byId("cube-title-input").value.trim() || "taktcut_cdl";
    const blob = await api.downloadCubeBlob({ ...state.cdl, size, title, filename: `${title}.cube` });
    const safeStem = title.replace(/[^A-Za-z0-9._-]/g, "_") || "taktcut_cdl";
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

async function buildOrExecuteRender(execute) {
  try {
    const inputPath = byId("render-input-path").value.trim();
    const outputPath = byId("render-output-path").value.trim();
    const profile = byId("render-profile").value;
    const fps = byId("render-fps").value.trim() || null;
    const lutPath = byId("render-lut-path").value.trim() || null;
    const lufsRaw = byId("render-lufs").value.trim();
    const targetLufs = lufsRaw !== "" ? Number.parseFloat(lufsRaw) : null;
    const useStudioCdl = byId("render-use-studio-cdl").checked;
    const useStudioFxEl = byId("render-use-studio-fx");
    const useStudioFx = useStudioFxEl ? useStudioFxEl.checked : false;
    const preferHw = byId("render-prefer-hw").checked;

    const body = {
      input_path: inputPath,
      output_path: outputPath,
      profile,
      fps,
      lut_path: lutPath,
      cdl: !lutPath && useStudioCdl ? state.cdl : null,
      fx_stack: useStudioFx && !state.fxBypassAll && state.fxStack.length > 0 ? state.fxStack : null,
      target_lufs: targetLufs,
      prefer_hw: preferHw,
      execute
    };
    const data = await api.buildOrExecuteRender(body);
    const plan = data.plan;
    state.lastRenderCommand = data.shell_command || plan.argv.join(" ");

    byId("render-encoder-badge").textContent = `${plan.encoder} / ${plan.pix_fmt}`;
    byId("render-encoder-badge").className = "nle-tag is-active mono";

    const fpsLabel = plan.fps.den === 1 ? String(plan.fps.num) : `${plan.fps.num}/${plan.fps.den}`;
    renderKv(byId("render-plan-kv"), [
      ["Profile", plan.profile],
      ["Encoder", plan.encoder],
      ["Rational FPS", fpsLabel],
      ["GOP Frames", String(plan.gop_frames)],
      ["Pixel Format", plan.pix_fmt],
      ["MP4 Faststart", String(plan.faststart)],
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

function setPlayhead(frame) {
  state.playheadFrame = Math.max(0, Math.min(state.timelineMaxFrame, Math.round(frame)));
  updatePlayheadReadout();
  if (state.activeTab === "timeline" || state.activeTab === "fx") {
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
  const fxPlayBtn = byId("btn-fx-play");
  const pill = byId("transport-state-pill");
  const isPlaying = state.playbackSpeed !== 0;

  if (playBtn) {
    playBtn.textContent = isPlaying ? t("timeline.transport.pause") : t("timeline.transport.play");
    playBtn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    playBtn.classList.toggle("is-playing", isPlaying);
  }
  if (fxPlayBtn) {
    fxPlayBtn.textContent = isPlaying ? t("timeline.transport.pause") : t("timeline.transport.play");
    fxPlayBtn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    fxPlayBtn.classList.toggle("is-playing", isPlaying);
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
    const next = state.playheadFrame + wholeDelta;
    if (next >= state.timelineMaxFrame) {
      setPlayhead(state.timelineMaxFrame);
      stopPlayback();
      return;
    }
    if (next <= 0) {
      setPlayhead(0);
      stopPlayback();
      return;
    }
    setPlayhead(next);
  }
  state.playbackRafId = window.requestAnimationFrame(playbackTick);
}

function startShuttle(speed) {
  if (speed === 0) {
    stopPlayback();
    return;
  }
  if (speed > 0 && state.playheadFrame >= state.timelineMaxFrame) {
    setPlayhead(0);
  } else if (speed < 0 && state.playheadFrame <= 0) {
    setPlayhead(state.timelineMaxFrame);
  }
  state.playbackSpeed = speed;
  state.playbackLastTs = 0;
  state.playbackAccumFrames = 0;
  updateTransportStatusUI();
  if (state.playbackRafId === null) {
    state.playbackRafId = window.requestAnimationFrame(playbackTick);
  }
}

function togglePlayPause() {
  if (state.playbackSpeed !== 0) {
    stopPlayback();
  } else {
    startShuttle(1);
  }
}

function stepShuttle(direction) {
  if (direction > 0) {
    const next = state.playbackSpeed <= 0 ? 1 : Math.min(8, state.playbackSpeed * 2);
    startShuttle(next);
  } else {
    const next = state.playbackSpeed >= 0 ? 1 : Math.min(8, Math.abs(state.playbackSpeed) * 2);
    startShuttle(-next);
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
  if (ev.defaultPrevented || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (isEditableTarget(ev.target)) return;
  if (state.activeTab !== "timeline" && state.activeTab !== "fx") return;

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

  const lower = ev.key.toLowerCase();
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

function hitTestTimeline(x, y) {
  const boxes = state.timelineHitboxes || [];
  for (let i = boxes.length - 1; i >= 0; i--) {
    const b = boxes[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      return { kind: b.kind, data: b.data };
    }
  }
  return null;
}

function bindTimelineCanvasScrub(canvas) {
  const ptr = {
    active: false,
    pointerId: null,
    mode: null,
    startX: 0,
    startY: 0,
    moved: false
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

  canvas.addEventListener("pointerdown", (ev) => {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    stopPlayback();
    if (!state.timelineDoc || !state.timelineXToFrame) return;

    const { x, y } = getCanvasPos(ev);
    const rulerH = state.timelineRulerHeight || 36;
    const labelW = state.timelineLabelColW || 0;
    const inRuler = y <= rulerH;
    const nearPh = isNearPlayhead(x);
    const inTrackArea = x >= labelW;

    if (!inRuler && !nearPh && !inTrackArea) return;

    ptr.active = true;
    ptr.pointerId = ev.pointerId;
    ptr.startX = x;
    ptr.startY = y;
    ptr.moved = false;

    if (canvas.setPointerCapture) {
      try {
        canvas.setPointerCapture(ev.pointerId);
      } catch {
        // Ignore synthetic pointer events without active browser capture
      }
    }

    if (inRuler || nearPh) {
      ptr.mode = "scrub";
      canvas.classList.add("is-scrubbing");
      setPlayhead(state.timelineXToFrame(x));
    } else {
      ptr.mode = "pending";
    }
  });

  canvas.addEventListener("pointermove", (ev) => {
    const { x, y } = getCanvasPos(ev);
    if (!ptr.active) {
      if (state.timelineDoc && state.timelineFrameToX) {
        const rulerH = state.timelineRulerHeight || 36;
        const labelW = state.timelineLabelColW || 0;
        const hoverScrub = (y <= rulerH && x >= labelW) || isNearPlayhead(x);
        canvas.style.cursor = hoverScrub ? "ew-resize" : "crosshair";
      }
      return;
    }
    if (ev.pointerId !== ptr.pointerId || !state.timelineXToFrame) return;

    if (Math.hypot(x - ptr.startX, y - ptr.startY) >= 4) {
      ptr.moved = true;
    }
    if (ptr.mode === "pending" && ptr.moved) {
      ptr.mode = "scrub";
      canvas.classList.add("is-scrubbing");
    }
    if (ptr.mode === "scrub") {
      const nextFrame = state.timelineXToFrame(x);
      if (nextFrame !== state.playheadFrame) {
        setPlayhead(nextFrame);
      }
    }
  });

  const finishPointer = (ev, cancelled) => {
    if (!ptr.active || ev.pointerId !== ptr.pointerId) return;
    const { x, y } = getCanvasPos(ev);
    const wasScrub = ptr.mode === "scrub";
    const wasMoved = ptr.moved;

    ptr.active = false;
    ptr.pointerId = null;
    ptr.mode = null;
    canvas.classList.remove("is-scrubbing");

    if (canvas.releasePointerCapture) {
      try {
        if (!canvas.hasPointerCapture || canvas.hasPointerCapture(ev.pointerId)) {
          canvas.releasePointerCapture(ev.pointerId);
        }
      } catch {
        // Ignore pointer capture release errors
      }
    }

    if (cancelled || !state.timelineXToFrame) return;

    if (wasScrub) {
      const finalFrame = state.timelineXToFrame(x);
      if (finalFrame !== state.playheadFrame) {
        setPlayhead(finalFrame);
      }
      if (!wasMoved) {
        const match = hitTestTimeline(x, y);
        if (match && match.kind === "marker") {
          state.timelineSelected = match;
          setPlayhead(match.data.frame);
          renderTimelineSelection();
          redrawActiveCanvases();
        }
      }
      return;
    }

    if (!wasMoved) {
      const match = hitTestTimeline(x, y);
      state.timelineSelected = match;
      if (match && match.kind === "clip") {
        state.playheadFrame = match.data.start_frame;
        updatePlayheadReadout();
      } else if (match && match.kind === "marker") {
        state.playheadFrame = match.data.frame;
        updatePlayheadReadout();
      } else {
        state.playheadFrame = state.timelineXToFrame(x);
        updatePlayheadReadout();
      }
      renderTimelineSelection();
      redrawActiveCanvases();
    }
  };

  canvas.addEventListener("pointerup", (ev) => finishPointer(ev, false));
  canvas.addEventListener("pointercancel", (ev) => finishPointer(ev, true));
  canvas.addEventListener("pointerleave", () => {
    if (!ptr.active) {
      canvas.style.cursor = "crosshair";
    }
  });
}

function wireEvents() {
  byId("status-banner-close").addEventListener("click", hideBanner);
  const updateBtn = byId("update-banner-btn");
  if (updateBtn) updateBtn.addEventListener("click", applyStudioUpdate);
  byId("lang-en").addEventListener("click", () => setLanguage("en"));
  byId("lang-fr").addEventListener("click", () => setLanguage("fr"));

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
      setTimelineData(data);
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
    setPlayhead(0);
  });
  byId("btn-tc-prev").addEventListener("click", () => {
    stopPlayback();
    setPlayhead(state.playheadFrame - 1);
  });
  byId("btn-tc-play").addEventListener("click", togglePlayPause);
  byId("btn-tc-next").addEventListener("click", () => {
    stopPlayback();
    setPlayhead(state.playheadFrame + 1);
  });
  byId("btn-tc-end").addEventListener("click", () => {
    stopPlayback();
    setPlayhead(state.timelineMaxFrame);
  });

  bindTimelineCanvasScrub(byId("timeline-canvas"));

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
  byId("btn-fx-bypass-all").addEventListener("click", () => {
    state.fxBypassAll = !state.fxBypassAll;
    renderFxStack();
    redrawActiveCanvases();
    compileFxNow();
  });
  byId("btn-fx-reset-all").addEventListener("click", () => {
    state.fxStack = [];
    state.fxBypassAll = false;
    state.fxActivePresetId = "";
    renderFxStack();
    redrawActiveCanvases();
    compileFxNow();
  });
  byId("btn-fx-play").addEventListener("click", togglePlayPause);
  byId("btn-fx-step").addEventListener("click", () => {
    stopPlayback();
    setPlayhead(state.playheadFrame + 1);
  });
  byId("fx-playhead-slider").addEventListener("input", () => {
    stopPlayback();
    setPlayhead(Number.parseInt(byId("fx-playhead-slider").value, 10));
  });
  byId("fx-duration-input").addEventListener("change", compileFxNow);
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

  // Color page events
  wireCdlInputs();
  byId("btn-bake-cube").addEventListener("click", bakeCubeLut);
  byId("btn-download-cube").addEventListener("click", downloadCubeLut);

  byId("cdl-file-input").addEventListener("change", async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    try {
      const xmlContent = await file.text();
      const data = await api.parseCdlXml(xmlContent);
      state.cdl = {
        slope: [...data.cdl.slope],
        offset: [...data.cdl.offset],
        power: [...data.cdl.power],
        saturation: data.cdl.saturation
      };
      syncCdlInputsFromState();
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
    showBanner("Active Color Page CDL grade linked to Deliver page.", "success");
  });

  // Deliver page events
  byId("render-input-select").addEventListener("change", () => {
    const val = byId("render-input-select").value;
    if (val) byId("render-input-path").value = val;
  });
  byId("render-profile").addEventListener("change", () => {
    const prof = byId("render-profile").value;
    const cur = byId("render-output-path").value.trim() || "renders/delivery.mp4";
    const stem = cur.replace(/\.(mp4|mov)$/i, "");
    byId("render-output-path").value = prof === "prores_hq" ? `${stem}.mov` : `${stem}.mp4`;
  });
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
  } catch {
    // Fallback to built-in catalog constants
  }
}

async function bootstrap() {
  wireEvents();
  syncCdlInputsFromState();
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
    loadFxCatalog()
  ]);
}

bootstrap();
