import {
  drawColorPreviewCanvas,
  drawColorScopeCanvas,
  drawFramesCanvas,
  drawLoudnessCanvas,
  drawTimelineCanvas
} from "/canvas.js";
import { TRANSLATIONS } from "/i18n.js";

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
  timelineSelected: null,
  timelineZoom: 1,
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
  lastQaReport: null
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

async function apiJson(url, options = {}) {
  const init = {
    method: options.method || "GET",
    headers: { Accept: "application/json" }
  };
  if (options.body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }
  const resp = await fetch(url, init);
  let data = null;
  try {
    data = await resp.json();
  } catch {
    data = null;
  }
  if (!resp.ok) {
    const errMsg = data && data.error ? data.error : `HTTP ${resp.status}`;
    throw new Error(errMsg);
  }
  return data;
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
  renderTimelineUI();
  if (state.lastQaReport) renderQaReport(state.lastQaReport);
}

function switchTab(tabName) {
  state.activeTab = tabName;
  for (const btn of document.querySelectorAll(".nav-tab")) {
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

function redrawActiveCanvases() {
  if (state.activeTab === "timeline") {
    state.timelineHitboxes = drawTimelineCanvas(
      byId("timeline-canvas"),
      state.timelineDoc,
      state.timelineValidation,
      { zoom: state.timelineZoom, selected: state.timelineSelected }
    );
  } else if (state.activeTab === "color") {
    drawColorPreviewCanvas(byId("color-preview-canvas"), state.cdl, state.wipeRatio);
    drawColorScopeCanvas(byId("color-scope-canvas"), state.cdl);
  } else if (state.activeTab === "qa" && state.lastQaReport) {
    drawLoudnessCanvas(byId("qa-loudness-canvas"), state.lastQaReport.loudness);
    drawFramesCanvas(byId("qa-frames-canvas"), state.lastQaReport.frame_samples);
  }
}

/* WORKSPACE 1: TIMELINE */
function setTimelineData(payload) {
  state.timelineDoc = payload.document;
  state.timelineValidation = payload.validation;
  state.timelineSelected = null;

  const doc = state.timelineDoc;
  if (doc) {
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
    byId("tl-meta-name").textContent = "--";
    byId("tl-meta-format").textContent = "--";
    byId("tl-meta-fps").textContent = "--";
    byId("tl-meta-res").textContent = "--";
    byId("tl-meta-dur").textContent = "--";
    byId("tl-meta-counts").textContent = "--";
    pill.textContent = "--";
    pill.className = "badge badge-muted mono";
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
    pill.className = val.valid ? "badge badge-pass mono" : "badge badge-fail mono";
  }

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
      ["Start Frame", `${c.start_frame}f`],
      ["Duration", `${c.duration_frames}f`],
      ["End Exclusive", `${c.start_frame + c.duration_frames}f`],
      ["Source In", `${c.source_in_frame}f`],
      ["Source FPS", srcFps],
      ["Source Path", c.source_path || t("common.none")],
      ["Enabled", String(c.enabled)]
    ]);
    return;
  }
  const mk = sel.data;
  renderKv(box, [
    ["Type", "Marker"],
    ["Name", mk.name],
    ["Frame", `${mk.frame}f`],
    ["Duration", `${mk.duration_frames}f`],
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
      const badge = dom("span", `badge mono ${issue.kind === "gap" ? "badge-warn" : "badge-fail"}`, issue.kind.toUpperCase());
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
        dom("span", "badge badge-indigo mono", `MARKER @ ${mk.frame}f`),
        dom("span", "mono", mk.color)
      );
      li.replaceChildren(head, dom("span", "", `${mk.name}${mk.note ? " - " + mk.note : ""}`));
      items.push(li);
    }
  }

  if (doc && doc.lut_refs && doc.lut_refs.length > 0) {
    const li = dom("div", "issue-item");
    li.replaceChildren(
      dom("span", "badge badge-muted mono", "LUT REFS"),
      dom("span", "mono", doc.lut_refs.join(", "))
    );
    items.push(li);
  }

  list.replaceChildren(...items);
}

async function loadSampleTimeline(preset) {
  try {
    const data = await apiJson(`/api/sample?preset=${encodeURIComponent(preset)}`);
    setTimelineData(data);
    byId("timeline-export-feedback").textContent = "";
    hideBanner();
  } catch (err) {
    showBanner(err.message, "error");
  }
}

/* WORKSPACE 2: COLOR CDL & CUBE */
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
  if (state.activeTab === "color") {
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
    const data = await apiJson("/api/color/bake", { method: "POST", body: payload });
    const info = data.info;
    byId("cube-info-badge").textContent = `${info.dimension} ${info.size}^3 (${info.entry_count} pts)`;
    byId("cube-info-badge").className = "badge badge-pass mono";

    const lines = data.cube_text.split(/\r?\n/).filter((ln) => ln.trim() !== "");
    const snippet = [
      ...lines.slice(0, 10),
      `... (${lines.length} total lines) ...`,
      ...lines.slice(-4)
    ].join("\n");
    byId("cube-preview-output").textContent = snippet;

    if (data.saved_path) {
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
    const resp = await fetch("/api/color/download-cube", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...state.cdl, size, title, filename: `${title}.cube` })
    });
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${resp.status}`);
    }
    const blob = await resp.blob();
    const safeStem = title.replace(/[^A-Za-z0-9._-]/g, "_") || "taktcut_cdl";
    triggerBlobDownload(blob, `${safeStem}.cube`);
    showBanner(`Downloaded ${safeStem}.cube`, "success");
  } catch (err) {
    showBanner(err.message, "error");
  }
}

/* WORKSPACE 3: RENDER & FFMPEG */
function renderCapabilitiesStrip(caps, ffmpegError) {
  const strip = byId("render-caps-strip");
  const pill = byId("ffmpeg-status-pill");
  if (!caps) {
    pill.textContent = "FFmpeg: missing";
    pill.className = "badge badge-fail mono";
    strip.replaceChildren(
      dom("span", "badge badge-fail", ffmpegError || "ffmpeg not found on PATH")
    );
    return;
  }

  const hasNvenc = caps.h264_nvenc || caps.hevc_nvenc;
  pill.textContent = hasNvenc ? "FFmpeg + NVENC" : "FFmpeg (CPU)";
  pill.className = hasNvenc ? "badge badge-pass mono" : "badge badge-indigo mono";

  const items = [
    ["h264_nvenc", caps.h264_nvenc],
    ["hevc_nvenc", caps.hevc_nvenc],
    ["libx264", caps.libx264],
    ["libx265", caps.libx265],
    ["prores_ks", caps.prores_ks]
  ];
  const badges = items.map(([label, ok]) =>
    dom("span", `badge ${ok ? "badge-pass" : "badge-muted"}`, `${label}: ${ok ? "ON" : "OFF"}`)
  );
  badges.push(dom("span", "badge badge-muted", caps.ffmpeg_path));
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
    const preferHw = byId("render-prefer-hw").checked;

    const body = {
      input_path: inputPath,
      output_path: outputPath,
      profile,
      fps,
      lut_path: lutPath,
      cdl: !lutPath && useStudioCdl ? state.cdl : null,
      target_lufs: targetLufs,
      prefer_hw: preferHw,
      execute
    };
    const data = await apiJson("/api/render/plan", { method: "POST", body });
    const plan = data.plan;
    state.lastRenderCommand = data.shell_command || plan.argv.join(" ");

    byId("render-encoder-badge").textContent = `${plan.encoder} / ${plan.pix_fmt}`;
    byId("render-encoder-badge").className = "badge badge-indigo mono";

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

/* WORKSPACE 4: BROADCAST QA GATE */
function renderQaReport(report) {
  state.lastQaReport = report;
  const overall = byId("qa-overall-badge");
  overall.textContent = report.passed ? t("common.pass") : t("common.fail");
  overall.className = `badge mono ${report.passed ? "badge-pass" : "badge-fail"}`;

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
  cfrBadge.className = `badge mono ${p.is_cfr ? "badge-pass" : "badge-fail"}`;

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
    loudBadge.className = `badge mono ${l.passed ? "badge-pass" : "badge-fail"}`;
    renderKv(byId("qa-loudness-kv"), [
      ["Integrated", `${l.integrated_lufs.toFixed(2)} LUFS`],
      ["Target", `${l.target_lufs.toFixed(1)} +/- ${l.tolerance_lu.toFixed(1)} LU`],
      ["LRA", `${l.lra_lu.toFixed(2)} LU`],
      ["True Peak", `${l.true_peak_dbtp.toFixed(2)} dBTP (max ${l.max_true_peak_dbtp.toFixed(1)})`]
    ]);
  } else {
    loudBadge.textContent = "NO AUDIO";
    loudBadge.className = "badge badge-muted mono";
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
    const data = await apiJson("/api/qa/verify", { method: "POST", body });
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
    const data = await apiJson("/api/sample/generate-clip", { method: "POST", body: {} });
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
  const data = await apiJson("/api/workspace/files");
  const files = data.files || {};
  populateSelectOptions(byId("timeline-workspace-select"), files.timelines || [], "-- select timeline --");
  populateSelectOptions(byId("render-input-select"), files.media || [], "-- select media --");
  populateSelectOptions(byId("qa-media-select"), files.media || [], "-- select media --");
}

function wireEvents() {
  byId("status-banner-close").addEventListener("click", hideBanner);
  byId("lang-en").addEventListener("click", () => setLanguage("en"));
  byId("lang-fr").addEventListener("click", () => setLanguage("fr"));

  for (const tabBtn of document.querySelectorAll(".nav-tab")) {
    tabBtn.addEventListener("click", () => switchTab(tabBtn.getAttribute("data-tab")));
  }

  // Timeline workspace events
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
      const data = await apiJson("/api/timeline/inspect", {
        method: "POST",
        body: { path, timeline_name: seqName }
      });
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
      const data = await apiJson("/api/timeline/inspect", {
        method: "POST",
        body: { filename: file.name, content_base64: b64, timeline_name: seqName }
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
      const data = await apiJson("/api/timeline/validate", {
        method: "POST",
        body: { document: state.timelineDoc }
      });
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
      const resp = await fetch("/api/timeline/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: state.timelineDoc, format: fmt })
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
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
      const data = await apiJson("/api/timeline/convert", {
        method: "POST",
        body: { document: state.timelineDoc, out_path: outPath }
      });
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

  byId("timeline-canvas").addEventListener("click", (ev) => {
    const canvas = byId("timeline-canvas");
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const boxes = state.timelineHitboxes || [];
    let match = null;
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        match = { kind: b.kind, data: b.data };
        break;
      }
    }
    state.timelineSelected = match;
    renderTimelineSelection();
    redrawActiveCanvases();
  });

  // Color workspace events
  wireCdlInputs();
  byId("btn-bake-cube").addEventListener("click", bakeCubeLut);
  byId("btn-download-cube").addEventListener("click", downloadCubeLut);

  byId("cdl-file-input").addEventListener("change", async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    try {
      const xmlContent = await file.text();
      const data = await apiJson("/api/color/parse-cdl", {
        method: "POST",
        body: { xml_content: xmlContent }
      });
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
    showBanner("Active Studio CDL grade linked to Render Plan.", "success");
  });

  // Render workspace events
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
      const data = await apiJson("/api/render/capabilities?verify_nvenc=true&refresh=true");
      renderCapabilitiesStrip(data.capabilities, data.error);
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

  // QA workspace events
  byId("qa-media-select").addEventListener("change", () => {
    const val = byId("qa-media-select").value;
    if (val) byId("qa-media-path").value = val;
  });
  byId("btn-run-qa").addEventListener("click", runBroadcastQa);
  byId("btn-qa-gen-sample").addEventListener("click", generateSampleClip);

  window.addEventListener("resize", redrawActiveCanvases);
}

async function bootstrap() {
  wireEvents();
  syncCdlInputsFromState();

  try {
    const savedLang = window.localStorage.getItem("taktcut.lang");
    if (savedLang === "fr" || savedLang === "en") state.lang = savedLang;
  } catch {
    // Ignore storage access failures
  }
  setLanguage(state.lang);

  try {
    const health = await apiJson("/api/health");
    byId("version-badge").textContent = `v${health.version}`;
    byId("workspace-path-label").textContent = health.workspace_dir;
    byId("workspace-pill").title = health.workspace_dir;
    renderCapabilitiesStrip(health.capabilities, health.ffmpeg_error);
  } catch (err) {
    showBanner(`Health check failed: ${err.message}`, "error");
  }

  await Promise.allSettled([
    refreshWorkspaceFiles(),
    loadSampleTimeline("clean")
  ]);
}

bootstrap();
