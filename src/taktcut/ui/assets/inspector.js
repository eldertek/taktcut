// DaVinci Resolve 21 Inspector Controller for taktcut (UiPlayerInspectorContainer).
// Derived from IDA Pro BMDDavUI + Resolve.exe UiQInspector* / UiPlayerInspector* hierarchy.
// Clean-room MIT implementation, safe DOM API only, zero inline style attributes.

export const COMPOSITE_MODES = [
  "Normal",
  "Add",
  "Color",
  "Color Burn",
  "Color Dodge",
  "Darken",
  "Darker Color",
  "Difference",
  "Divide",
  "Exclusion",
  "Hard Light",
  "Hard Mix",
  "Hue",
  "Lighten",
  "Lighter Color",
  "Linear Burn",
  "Linear Dodge",
  "Linear Light",
  "Luminosity",
  "Multiply",
  "Overlay",
  "Pin Light",
  "Saturation",
  "Screen",
  "Soft Light",
  "Subtract",
  "Vivid Light",
  "Foreground",
  "Alpha",
  "Inverted Alpha",
  "Lum"
];

export const RETIME_PROCESS_MODES = ["Project Settings", "Nearest", "Frame Blend", "Optical Flow"];
export const MOTION_ESTIMATION_MODES = [
  "Project Settings",
  "Standard Faster",
  "Standard Better",
  "Enhanced Faster",
  "Enhanced Better",
  "Speed Warp Faster",
  "Speed Warp Better"
];
export const SCALING_MODES = ["Project Settings", "Crop", "Fit", "Fill", "Stretch"];
export const RESIZE_FILTER_MODES = ["Project Settings", "Sharper", "Smoother", "Bicubic", "Bilinear", "Lanczos"];

const INSPECTOR_TABS = [
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
  { id: "effects", label: "Effects" },
  { id: "transition", label: "Transition" },
  { id: "image", label: "Image" },
  { id: "file", label: "File" }
];

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) {
    node.setAttribute(k, String(v));
  }
  return node;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function tabIcon(id) {
  const svg = svgEl("svg", { viewBox: "0 0 18 18", width: "16", height: "16", class: "insp-tab-svg", "aria-hidden": "true" });
  if (id === "video") {
    svg.appendChild(svgEl("rect", { x: "2.5", y: "3.5", width: "13", height: "11", rx: "1.2", fill: "none", stroke: "currentColor", "stroke-width": "1.35" }));
    svg.appendChild(svgEl("path", { d: "M7.2 6.8L11.5 9l-4.3 2.2z", fill: "currentColor" }));
  } else if (id === "audio") {
    svg.appendChild(svgEl("path", { d: "M3.5 7.2h2.8l3.7-2.8v9.2l-3.7-2.8H3.5z", fill: "none", stroke: "currentColor", "stroke-width": "1.3" }));
    svg.appendChild(svgEl("path", { d: "M12.3 6.5a3.5 3.5 0 010 5M14.2 5a5.6 5.6 0 010 8", fill: "none", stroke: "currentColor", "stroke-width": "1.25", "stroke-linecap": "round" }));
  } else if (id === "effects") {
    svg.appendChild(svgEl("path", { d: "M3 15L11.8 6.2M10.2 3.2v2.2M14.8 7.8h-2.2M13.8 4.2l-1.4 1.4M10.2 9.4l-1.4-1.4", fill: "none", stroke: "currentColor", "stroke-width": "1.3", "stroke-linecap": "round" }));
  } else if (id === "transition") {
    svg.appendChild(svgEl("rect", { x: "2.5", y: "4", width: "5.5", height: "10", rx: "1", fill: "none", stroke: "currentColor", "stroke-width": "1.3" }));
    svg.appendChild(svgEl("rect", { x: "10", y: "4", width: "5.5", height: "10", rx: "1", fill: "none", stroke: "currentColor", "stroke-width": "1.3" }));
    svg.appendChild(svgEl("path", { d: "M8 6.5l2 2.5-2 2.5", fill: "none", stroke: "currentColor", "stroke-width": "1.3" }));
  } else if (id === "image") {
    svg.appendChild(svgEl("rect", { x: "2.5", y: "3.5", width: "13", height: "11", rx: "1.2", fill: "none", stroke: "currentColor", "stroke-width": "1.3" }));
    svg.appendChild(svgEl("circle", { cx: "6.5", cy: "7.2", r: "1.3", fill: "currentColor" }));
    svg.appendChild(svgEl("path", { d: "M4 12.8l3.5-3.4 2.5 2.3 2.1-1.9 2.4 3", fill: "none", stroke: "currentColor", "stroke-width": "1.2" }));
  } else {
    svg.appendChild(svgEl("path", { d: "M4 2.8h6l4 4v8.4H4z", fill: "none", stroke: "currentColor", "stroke-width": "1.3" }));
    svg.appendChild(svgEl("path", { d: "M10 2.8v4h4", fill: "none", stroke: "currentColor", "stroke-width": "1.2" }));
  }
  return svg;
}

function resetIconSvg() {
  const svg = svgEl("svg", { viewBox: "0 0 14 14", width: "12", height: "12", "aria-hidden": "true" });
  svg.appendChild(svgEl("path", { d: "M10.5 4.3A4.3 4.3 0 1011 8.5M10.8 2.2v2.4H8.4", fill: "none", stroke: "currentColor", "stroke-width": "1.25", "stroke-linecap": "round", "stroke-linejoin": "round" }));
  return svg;
}

export function normalizeInspectorMeta(clip) {
  if (!clip) return {};
  if (!clip.transform || typeof clip.transform !== "object") clip.transform = {};
  const tf = clip.transform;
  if (tf.zoom_pct === undefined) tf.zoom_pct = 100;
  if (tf.zoom_y_pct === undefined) tf.zoom_y_pct = tf.zoom_pct;
  if (tf.zoom_linked === undefined) tf.zoom_linked = true;
  if (tf.pos_x_pct === undefined) tf.pos_x_pct = 0;
  if (tf.pos_y_pct === undefined) tf.pos_y_pct = 0;
  if (tf.rotation_deg === undefined) tf.rotation_deg = 0;
  if (tf.anchor_x_pct === undefined) tf.anchor_x_pct = 0;
  if (tf.anchor_y_pct === undefined) tf.anchor_y_pct = 0;
  if (tf.pitch === undefined) tf.pitch = 0;
  if (tf.yaw === undefined) tf.yaw = 0;
  if (tf.flip_h === undefined) tf.flip_h = false;
  if (tf.flip_v === undefined) tf.flip_v = false;
  if (tf.crop_left_pct === undefined) tf.crop_left_pct = 0;
  if (tf.crop_right_pct === undefined) tf.crop_right_pct = 0;
  if (tf.crop_top_pct === undefined) tf.crop_top_pct = 0;
  if (tf.crop_bottom_pct === undefined) tf.crop_bottom_pct = 0;
  if (tf.border_feather_px === undefined) tf.border_feather_px = 0;
  if (tf.crop_retain_pos === undefined) tf.crop_retain_pos = false;
  if (tf.dynamic_zoom_ease === undefined) tf.dynamic_zoom_ease = "linear";
  if (tf.dynamic_zoom_swap === undefined) tf.dynamic_zoom_swap = false;
  if (tf.composite_mode === undefined) tf.composite_mode = "Normal";
  if (tf.opacity_pct === undefined) tf.opacity_pct = 100;
  if (!clip.stabilization) {
    clip.stabilization = { enabled: false, mode: "Perspective", cameraLock: false, zoom: true, croppingRatio: 0.5, smooth: 0.25, strength: 0.5 };
  }
  if (!clip.lensCorrection) {
    clip.lensCorrection = { enabled: false, distortion: 0 };
  }
  if (!clip.retimeScaling) {
    clip.retimeScaling = { retimeProcess: "Project Settings", motionEst: "Project Settings", scaling: "Project Settings", resizeFilter: "Project Settings" };
  }
  if (!clip.retime || typeof clip.retime !== "object") {
    clip.retime = { speed_pct: 100, direction: "forward", ripple: false, pitch_correction: true };
  }
  if (!clip.audio || typeof clip.audio !== "object") {
    clip.audio = { volume_db: 0, pitch_semi: 0, pitch_cents: 0, pan: 0, voice_iso_on: false, voice_iso_amt: 65, lvl_on: false, lvl_mix: 50, eq_on: true };
  }
  return clip;
}

export function createResolveInspectorController(ctx) {
  const {
    state,
    byId,
    showBanner,
    redrawActiveCanvases,
    getSelectedClipTrack,
    syncTransformFieldFromExternal,
    updateAudioRackField,
    addFxNode,
    renderFxStack,
    openFxStudioByKey,
    openStabilizationStudioDialog,
    openRetimeStudioDialog,
    getFpsFloat,
    framesToSmpte
  } = ctx;

  const uiState = {
    activeTab: "video",
    expanded: {
      transform: true,
      cropping: false,
      dynamic_zoom: false,
      composite: true,
      speed_change: false,
      stabilization: false,
      lens_correction: false,
      retime_scaling: false,
      audio_volume: true,
      audio_pitch: false,
      audio_pan: false,
      audio_voice_iso: true,
      audio_dialogue_lvl: false,
      audio_eq: true,
      transition_main: true,
      file_info: true,
      file_slate: true,
      file_markers: true
    }
  };

  function makeTogglePill(checked, onChange) {
    const btn = el("button", `insp-switch${checked ? " is-checked" : ""}`);
    btn.type = "button";
    btn.setAttribute("role", "switch");
    btn.setAttribute("aria-checked", checked ? "true" : "false");
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const next = !checked;
      onChange(next);
    });
    return btn;
  }

  function makeAccordion(key, title, opts = {}) {
    const { switchChecked = null, onSwitch = null, onReset = null, enabled = true, badgeText = "" } = opts;
    const section = el("section", `insp-accordion${uiState.expanded[key] ? " is-open" : ""}${!enabled ? " is-disabled-sec" : ""}`);
    const hdr = el("div", "insp-acc-header");
    const left = el("button", "insp-acc-toggle");
    left.type = "button";
    if (switchChecked !== null && onSwitch) {
      left.appendChild(makeTogglePill(switchChecked, onSwitch));
    }
    const labelSpan = el("span", "insp-acc-title", title);
    left.appendChild(labelSpan);
    if (badgeText) {
      left.appendChild(el("span", "insp-acc-badge tabular", badgeText));
    }
    left.addEventListener("click", () => {
      uiState.expanded[key] = !uiState.expanded[key];
      render();
    });

    const right = el("div", "insp-acc-actions");
    if (onReset) {
      const rst = el("button", "insp-icon-btn");
      rst.type = "button";
      rst.title = `Reset ${title}`;
      rst.appendChild(resetIconSvg());
      rst.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onReset();
      });
      right.appendChild(rst);
    }
    const chev = el("span", "insp-acc-chevron", uiState.expanded[key] ? "\u25be" : "\u25b8");
    right.appendChild(chev);

    hdr.append(left, right);
    section.appendChild(hdr);
    const body = el("div", `insp-acc-body${uiState.expanded[key] ? "" : " is-hidden"}`);
    section.appendChild(body);
    return { section, body };
  }

  function makeSliderRow(cfg) {
    const {
      label,
      value,
      min,
      max,
      step,
      unit = "",
      decimals = 3,
      defaultValue = 0,
      hasKeyframe = true,
      onChange,
      onReset
    } = cfg;
    const row = el("div", "insp-param-row");
    row.appendChild(el("span", "insp-param-label", label));

    const ctrl = el("div", "insp-param-ctrl");
    const slider = document.createElement("input");
    slider.type = "range";
    slider.className = "insp-slider";
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);

    const num = document.createElement("input");
    num.type = "number";
    num.className = "insp-num tabular";
    num.min = String(min);
    num.max = String(max);
    num.step = String(step);
    num.value = Number(value).toFixed(decimals);
    num.setAttribute("aria-label", label);

    slider.addEventListener("input", () => {
      const v = Number.parseFloat(slider.value);
      num.value = v.toFixed(decimals);
      onChange(v, false);
    });
    slider.addEventListener("change", () => {
      const v = Number.parseFloat(slider.value);
      onChange(v, true);
    });
    num.addEventListener("change", () => {
      const raw = Number.parseFloat(num.value);
      const clamped = Number.isFinite(raw) ? Math.min(max, Math.max(min, raw)) : defaultValue;
      num.value = clamped.toFixed(decimals);
      slider.value = String(clamped);
      onChange(clamped, true);
    });
    num.addEventListener("dblclick", () => {
      num.value = Number(defaultValue).toFixed(decimals);
      slider.value = String(defaultValue);
      if (onReset) onReset();
      else onChange(defaultValue, true);
    });

    ctrl.append(slider, num);
    if (unit) ctrl.appendChild(el("span", "insp-unit", unit));

    const kfBtn = el("button", `insp-kf-btn${hasKeyframe ? "" : " is-hidden"}`, "\u25c7");
    kfBtn.type = "button";
    kfBtn.title = "Toggle Keyframe";
    kfBtn.addEventListener("click", () => {
      kfBtn.classList.toggle("is-active");
    });

    const rstBtn = el("button", "insp-icon-btn");
    rstBtn.type = "button";
    rstBtn.title = `Reset ${label}`;
    rstBtn.appendChild(resetIconSvg());
    rstBtn.addEventListener("click", () => {
      if (onReset) onReset();
      else onChange(defaultValue, true);
    });

    ctrl.append(kfBtn, rstBtn);
    row.appendChild(ctrl);
    return row;
  }

  function makeDualNumRow(cfg) {
    const { label, xLabel = "X", yLabel = "Y", xVal, yVal, min, max, step, decimals = 3, linkable = false, linked = true, onToggleLink = null, onChangeX, onChangeY, onReset } = cfg;
    const row = el("div", "insp-param-row");
    row.appendChild(el("span", "insp-param-label", label));

    const ctrl = el("div", "insp-dual-ctrl");
    const mkInput = (axisLbl, val, handler) => {
      const box = el("label", "insp-axis-box");
      box.appendChild(el("span", "insp-axis-tag", axisLbl));
      const inp = document.createElement("input");
      inp.type = "number";
      inp.className = "insp-num insp-num-compact tabular";
      inp.min = String(min);
      inp.max = String(max);
      inp.step = String(step);
      inp.value = Number(val).toFixed(decimals);
      inp.addEventListener("change", () => {
        const parsed = Number.parseFloat(inp.value);
        if (Number.isFinite(parsed)) {
          const v = Math.min(max, Math.max(min, parsed));
          inp.value = v.toFixed(decimals);
          handler(v, true);
        }
      });
      box.appendChild(inp);
      return box;
    };

    ctrl.appendChild(mkInput(xLabel, xVal, onChangeX));
    if (linkable) {
      const linkBtn = el("button", `insp-link-btn${linked ? " is-active" : ""}`, "\ud83d\udd17");
      linkBtn.type = "button";
      linkBtn.title = linked ? "Linked X/Y" : "Unlinked X/Y";
      linkBtn.addEventListener("click", () => onToggleLink && onToggleLink(!linked));
      ctrl.appendChild(linkBtn);
    }
    ctrl.appendChild(mkInput(yLabel, yVal, onChangeY));

    const rstBtn = el("button", "insp-icon-btn");
    rstBtn.type = "button";
    rstBtn.title = `Reset ${label}`;
    rstBtn.appendChild(resetIconSvg());
    rstBtn.addEventListener("click", () => onReset && onReset());
    ctrl.appendChild(rstBtn);

    row.appendChild(ctrl);
    return row;
  }

  function makeSelectRow(label, options, value, onChange, onReset = null) {
    const row = el("div", "insp-param-row");
    row.appendChild(el("span", "insp-param-label", label));
    const ctrl = el("div", "insp-param-ctrl");
    const sel = document.createElement("select");
    sel.className = "insp-select";
    for (const opt of options) {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      if (opt === value) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener("change", () => onChange(sel.value));
    ctrl.appendChild(sel);
    if (onReset) {
      const rst = el("button", "insp-icon-btn");
      rst.type = "button";
      rst.appendChild(resetIconSvg());
      rst.addEventListener("click", onReset);
      ctrl.appendChild(rst);
    }
    row.appendChild(ctrl);
    return row;
  }

  function makeSegmentedRow(label, items, activeId, onPick) {
    const row = el("div", "insp-param-row");
    if (label) row.appendChild(el("span", "insp-param-label", label));
    const grp = el("div", "insp-seg-group");
    for (const it of items) {
      const b = el("button", `insp-seg-btn${it.id === activeId ? " is-active" : ""}`, it.label);
      b.type = "button";
      b.addEventListener("click", () => onPick(it.id));
      grp.appendChild(b);
    }
    row.appendChild(grp);
    return row;
  }

  function renderVideoTab(host, selInfo) {
    if (!selInfo || !selInfo.clip) {
      host.appendChild(el("div", "insp-empty", "Select a clip on the timeline to inspect Video parameters."));
      return;
    }
    const clip = normalizeInspectorMeta(selInfo.clip);
    const tf = clip.transform;
    const updateTf = (field, value, commit = true) => {
      if (syncTransformFieldFromExternal) {
        syncTransformFieldFromExternal(field, value, commit);
      } else {
        tf[field] = value;
        redrawActiveCanvases();
      }
    };

    // 1. Transform
    const tr = makeAccordion("transform", "Transform", {
      switchChecked: true,
      onSwitch: () => {},
      onReset: () => {
        tf.zoom_pct = 100;
        tf.zoom_y_pct = 100;
        tf.pos_x_pct = 0;
        tf.pos_y_pct = 0;
        tf.rotation_deg = 0;
        tf.anchor_x_pct = 0;
        tf.anchor_y_pct = 0;
        tf.pitch = 0;
        tf.yaw = 0;
        tf.flip_h = false;
        tf.flip_v = false;
        updateTf("zoom_pct", 100, true);
        render();
      }
    });
    tr.body.appendChild(makeDualNumRow({
      label: "Zoom",
      xLabel: "X",
      yLabel: "Y",
      xVal: Number((tf.zoom_pct || 100) / 100),
      yVal: Number((tf.zoom_y_pct ?? tf.zoom_pct ?? 100) / 100),
      min: 0.1,
      max: 5.0,
      step: 0.01,
      decimals: 3,
      linkable: true,
      linked: tf.zoom_linked !== false,
      onToggleLink: (v) => { tf.zoom_linked = v; if (v) tf.zoom_y_pct = tf.zoom_pct; render(); redrawActiveCanvases(); },
      onChangeX: (v, c) => {
        tf.zoom_pct = Number((v * 100).toFixed(2));
        if (tf.zoom_linked !== false) tf.zoom_y_pct = tf.zoom_pct;
        updateTf("zoom_pct", tf.zoom_pct, c);
        if (c) render();
      },
      onChangeY: (v, c) => {
        tf.zoom_y_pct = Number((v * 100).toFixed(2));
        if (tf.zoom_linked !== false) {
          tf.zoom_pct = tf.zoom_y_pct;
          updateTf("zoom_pct", tf.zoom_pct, c);
        } else {
          redrawActiveCanvases();
        }
        if (c) render();
      },
      onReset: () => { tf.zoom_pct = 100; tf.zoom_y_pct = 100; updateTf("zoom_pct", 100, true); render(); }
    }));
    tr.body.appendChild(makeDualNumRow({
      label: "Position",
      xLabel: "X",
      yLabel: "Y",
      xVal: Number((tf.pos_x_pct || 0) * 19.2),
      yVal: Number((tf.pos_y_pct || 0) * 10.8),
      min: -3840,
      max: 3840,
      step: 1,
      decimals: 3,
      onChangeX: (v, c) => updateTf("pos_x_pct", Number((v / 19.2).toFixed(3)), c),
      onChangeY: (v, c) => updateTf("pos_y_pct", Number((v / 10.8).toFixed(3)), c),
      onReset: () => { updateTf("pos_x_pct", 0, true); updateTf("pos_y_pct", 0, true); render(); }
    }));
    tr.body.appendChild(makeSliderRow({
      label: "Rotation Angle",
      value: tf.rotation_deg || 0,
      min: -180,
      max: 180,
      step: 0.1,
      decimals: 3,
      defaultValue: 0,
      onChange: (v, c) => updateTf("rotation_deg", v, c),
      onReset: () => { updateTf("rotation_deg", 0, true); render(); }
    }));
    tr.body.appendChild(makeDualNumRow({
      label: "Anchor Point",
      xLabel: "X",
      yLabel: "Y",
      xVal: tf.anchor_x_pct || 0,
      yVal: tf.anchor_y_pct || 0,
      min: -1000,
      max: 1000,
      step: 1,
      decimals: 3,
      onChangeX: (v) => { tf.anchor_x_pct = v; redrawActiveCanvases(); },
      onChangeY: (v) => { tf.anchor_y_pct = v; redrawActiveCanvases(); },
      onReset: () => { tf.anchor_x_pct = 0; tf.anchor_y_pct = 0; render(); redrawActiveCanvases(); }
    }));
    tr.body.appendChild(makeSliderRow({
      label: "Pitch",
      value: tf.pitch || 0,
      min: -1,
      max: 1,
      step: 0.005,
      decimals: 3,
      defaultValue: 0,
      onChange: (v) => { tf.pitch = v; redrawActiveCanvases(); },
      onReset: () => { tf.pitch = 0; render(); redrawActiveCanvases(); }
    }));
    tr.body.appendChild(makeSliderRow({
      label: "Yaw",
      value: tf.yaw || 0,
      min: -1,
      max: 1,
      step: 0.005,
      decimals: 3,
      defaultValue: 0,
      onChange: (v) => { tf.yaw = v; redrawActiveCanvases(); },
      onReset: () => { tf.yaw = 0; render(); redrawActiveCanvases(); }
    }));
    const flipRow = el("div", "insp-param-row");
    flipRow.appendChild(el("span", "insp-param-label", "Flip"));
    const flipGrp = el("div", "insp-flip-group");
    const fh = el("button", `insp-mini-toggle${tf.flip_h ? " is-active" : ""}`, "Flip H");
    fh.type = "button";
    fh.addEventListener("click", () => { tf.flip_h = !tf.flip_h; render(); redrawActiveCanvases(); });
    const fv = el("button", `insp-mini-toggle${tf.flip_v ? " is-active" : ""}`, "Flip V");
    fv.type = "button";
    fv.addEventListener("click", () => { tf.flip_v = !tf.flip_v; render(); redrawActiveCanvases(); });
    flipGrp.append(fh, fv);
    flipRow.appendChild(flipGrp);
    tr.body.appendChild(flipRow);
    host.appendChild(tr.section);

    // 2. Cropping
    const cr = makeAccordion("cropping", "Cropping", {
      onReset: () => {
        for (const k of ["crop_left_pct", "crop_right_pct", "crop_top_pct", "crop_bottom_pct", "border_feather_px"]) {
          updateTf(k, 0, true);
        }
        render();
      }
    });
    for (const [lbl, fld] of [
      ["Crop Left", "crop_left_pct"],
      ["Crop Right", "crop_right_pct"],
      ["Crop Top", "crop_top_pct"],
      ["Crop Bottom", "crop_bottom_pct"]
    ]) {
      cr.body.appendChild(makeSliderRow({
        label: lbl,
        value: tf[fld] || 0,
        min: 0,
        max: 45,
        step: 0.25,
        decimals: 3,
        defaultValue: 0,
        onChange: (v, c) => updateTf(fld, v, c),
        onReset: () => { updateTf(fld, 0, true); render(); }
      }));
    }
    cr.body.appendChild(makeSliderRow({
      label: "Softness",
      value: tf.border_feather_px || 0,
      min: 0,
      max: 40,
      step: 0.5,
      decimals: 3,
      defaultValue: 0,
      onChange: (v, c) => updateTf("border_feather_px", v, c),
      onReset: () => { updateTf("border_feather_px", 0, true); render(); }
    }));
    host.appendChild(cr.section);

    // 3. Dynamic Zoom
    const dzOn = Boolean(tf.dynamic_zoom_preset && tf.dynamic_zoom_preset !== "off");
    const dz = makeAccordion("dynamic_zoom", "Dynamic Zoom", {
      switchChecked: dzOn,
      onSwitch: (next) => {
        tf.dynamic_zoom_preset = next ? "slow_zoom_in" : "off";
        updateTf("dynamic_zoom_preset", tf.dynamic_zoom_preset, true);
        render();
      },
      onReset: () => { tf.dynamic_zoom_preset = "off"; tf.dynamic_zoom_ease = "linear"; tf.dynamic_zoom_swap = false; render(); redrawActiveCanvases(); }
    });
    dz.body.appendChild(makeSegmentedRow("Dynamic Zoom Ease", [
      { id: "linear", label: "Linear" },
      { id: "ease_in", label: "Ease In" },
      { id: "ease_out", label: "Ease Out" },
      { id: "ease_in_out", label: "Ease In & Out" }
    ], tf.dynamic_zoom_ease || "linear", (id) => { tf.dynamic_zoom_ease = id; render(); redrawActiveCanvases(); }));
    const swapRow = el("div", "insp-param-row");
    swapRow.appendChild(el("span", "insp-param-label", "Direction"));
    const swapBtn = el("button", "insp-action-btn", "Swap");
    swapBtn.type = "button";
    swapBtn.addEventListener("click", () => {
      tf.dynamic_zoom_swap = !tf.dynamic_zoom_swap;
      tf.dynamic_zoom_preset = tf.dynamic_zoom_swap ? "slow_zoom_out" : "slow_zoom_in";
      redrawActiveCanvases();
      showBanner("Swapped Dynamic Zoom Start/End.", "info");
    });
    swapRow.appendChild(swapBtn);
    dz.body.appendChild(swapRow);
    host.appendChild(dz.section);

    // 4. Composite
    const comp = makeAccordion("composite", "Composite", {
      onReset: () => { tf.composite_mode = "Normal"; updateTf("opacity_pct", 100, true); render(); }
    });
    comp.body.appendChild(makeSelectRow("Composite Mode", COMPOSITE_MODES, tf.composite_mode || "Normal", (v) => {
      tf.composite_mode = v;
      redrawActiveCanvases();
    }, () => { tf.composite_mode = "Normal"; render(); redrawActiveCanvases(); }));
    comp.body.appendChild(makeSliderRow({
      label: "Opacity",
      value: tf.opacity_pct ?? 100,
      min: 0,
      max: 100,
      step: 1,
      decimals: 2,
      defaultValue: 100,
      onChange: (v, c) => updateTf("opacity_pct", v, c),
      onReset: () => { updateTf("opacity_pct", 100, true); render(); }
    }));
    host.appendChild(comp.section);

    // 5. Speed Change
    const spd = makeAccordion("speed_change", "Speed Change", {
      onReset: () => { clip.retime = { speed_pct: 100, direction: "forward", ripple: false, pitch_correction: true }; render(); redrawActiveCanvases(); }
    });
    spd.body.appendChild(makeSegmentedRow("Direction", [
      { id: "forward", label: "Forward" },
      { id: "freeze", label: "Freeze" },
      { id: "reverse", label: "Reverse" }
    ], clip.retime.direction || "forward", (id) => { clip.retime.direction = id; if (id === "freeze") clip.retime.speed_pct = 0; else if (clip.retime.speed_pct === 0) clip.retime.speed_pct = 100; render(); redrawActiveCanvases(); }));
    spd.body.appendChild(makeSliderRow({
      label: "Speed %",
      value: clip.retime.speed_pct ?? 100,
      min: 0,
      max: 800,
      step: 1,
      decimals: 2,
      unit: "%",
      defaultValue: 100,
      onChange: (v) => { clip.retime.speed_pct = v; redrawActiveCanvases(); },
      onReset: () => { clip.retime.speed_pct = 100; render(); redrawActiveCanvases(); }
    }));
    const spAct = el("div", "insp-param-row");
    spAct.appendChild(el("span", "insp-param-label", "Curve"));
    const spBtn = el("button", "insp-action-btn", "Speed Curve Studio");
    spBtn.type = "button";
    spBtn.addEventListener("click", () => openRetimeStudioDialog && openRetimeStudioDialog());
    spAct.appendChild(spBtn);
    spd.body.appendChild(spAct);
    host.appendChild(spd.section);

    // 6. Stabilization
    const st = clip.stabilization;
    const stab = makeAccordion("stabilization", "Stabilization", {
      switchChecked: st.enabled,
      onSwitch: (v) => { st.enabled = v; render(); redrawActiveCanvases(); },
      onReset: () => { clip.stabilization = { enabled: false, mode: "Perspective", cameraLock: false, zoom: true, croppingRatio: 0.5, smooth: 0.25, strength: 0.5 }; render(); }
    });
    stab.body.appendChild(makeSelectRow("Mode", ["Perspective", "Similarity", "Translation"], st.mode || "Perspective", (v) => { st.mode = v; }));
    stab.body.appendChild(makeSliderRow({ label: "Cropping Ratio", value: st.croppingRatio, min: 0.25, max: 1.0, step: 0.01, decimals: 3, defaultValue: 0.5, onChange: (v) => { st.croppingRatio = v; } }));
    stab.body.appendChild(makeSliderRow({ label: "Smooth", value: st.smooth, min: 0, max: 1, step: 0.01, decimals: 3, defaultValue: 0.25, onChange: (v) => { st.smooth = v; } }));
    stab.body.appendChild(makeSliderRow({ label: "Strength", value: st.strength, min: 0, max: 1, step: 0.01, decimals: 3, defaultValue: 0.5, onChange: (v) => { st.strength = v; } }));
    const stRunRow = el("div", "insp-param-row");
    stRunRow.appendChild(el("span", "insp-param-label", ""));
    const stRunBtn = el("button", "insp-action-btn", "Stabilize");
    stRunBtn.type = "button";
    stRunBtn.addEventListener("click", () => openStabilizationStudioDialog && openStabilizationStudioDialog());
    stRunRow.appendChild(stRunBtn);
    stab.body.appendChild(stRunRow);
    host.appendChild(stab.section);

    // 7. Lens Correction
    const lc = clip.lensCorrection;
    const lens = makeAccordion("lens_correction", "Lens Correction", {
      switchChecked: lc.enabled,
      onSwitch: (v) => { lc.enabled = v; render(); redrawActiveCanvases(); },
      onReset: () => { lc.distortion = 0; render(); redrawActiveCanvases(); }
    });
    lens.body.appendChild(makeSliderRow({
      label: "Distortion",
      value: lc.distortion || 0,
      min: -100,
      max: 100,
      step: 0.5,
      decimals: 3,
      defaultValue: 0,
      onChange: (v) => { lc.distortion = v; redrawActiveCanvases(); }
    }));
    host.appendChild(lens.section);

    // 8. Retime and Scaling
    const rs = clip.retimeScaling;
    const rts = makeAccordion("retime_scaling", "Retime and Scaling", {
      onReset: () => { clip.retimeScaling = { retimeProcess: "Project Settings", motionEst: "Project Settings", scaling: "Project Settings", resizeFilter: "Project Settings" }; render(); }
    });
    rts.body.appendChild(makeSelectRow("Retime Process", RETIME_PROCESS_MODES, rs.retimeProcess, (v) => { rs.retimeProcess = v; }));
    rts.body.appendChild(makeSelectRow("Motion Estimation", MOTION_ESTIMATION_MODES, rs.motionEst, (v) => { rs.motionEst = v; }));
    rts.body.appendChild(makeSelectRow("Scaling", SCALING_MODES, rs.scaling, (v) => { rs.scaling = v; redrawActiveCanvases(); }));
    rts.body.appendChild(makeSelectRow("Resize Filter", RESIZE_FILTER_MODES, rs.resizeFilter, (v) => { rs.resizeFilter = v; }));
    host.appendChild(rts.section);
  }

  function renderAudioTab(host, selInfo) {
    const rack = state.fairlightRack || { volume_db: 0, pan: 0, eq_on: true, voice_iso_on: false };
    const clip = selInfo && selInfo.clip ? normalizeInspectorMeta(selInfo.clip) : null;
    const aud = clip ? clip.audio : { volume_db: rack.gain_db ?? 0, pitch_semi: 0, pitch_cents: 0, pan: 0, voice_iso_on: false, voice_iso_amt: 65, lvl_on: false, lvl_mix: 50, eq_on: true };

    const vol = makeAccordion("audio_volume", "Volume", {
      onReset: () => { aud.volume_db = 0; if (updateAudioRackField) updateAudioRackField("gain_db", 0); render(); }
    });
    vol.body.appendChild(makeSliderRow({
      label: "Volume",
      value: aud.volume_db ?? 0,
      min: -60,
      max: 12,
      step: 0.5,
      decimals: 2,
      unit: "dB",
      defaultValue: 0,
      onChange: (v) => { aud.volume_db = v; if (updateAudioRackField) updateAudioRackField("gain_db", v); }
    }));
    host.appendChild(vol.section);

    const pit = makeAccordion("audio_pitch", "Pitch", {
      onReset: () => { aud.pitch_semi = 0; aud.pitch_cents = 0; render(); }
    });
    pit.body.appendChild(makeSliderRow({ label: "Semitones", value: aud.pitch_semi ?? 0, min: -24, max: 24, step: 1, decimals: 0, defaultValue: 0, onChange: (v) => { aud.pitch_semi = v; } }));
    pit.body.appendChild(makeSliderRow({ label: "Cents", value: aud.pitch_cents ?? 0, min: -100, max: 100, step: 1, decimals: 0, defaultValue: 0, onChange: (v) => { aud.pitch_cents = v; } }));
    host.appendChild(pit.section);

    const pan = makeAccordion("audio_pan", "Pan", {
      onReset: () => { aud.pan = 0; render(); }
    });
    pan.body.appendChild(makeSliderRow({ label: "Pan", value: aud.pan ?? 0, min: -100, max: 100, step: 1, decimals: 2, defaultValue: 0, onChange: (v) => { aud.pan = v; } }));
    host.appendChild(pan.section);

    const vi = makeAccordion("audio_voice_iso", "Voice Isolation", {
      switchChecked: Boolean(aud.voice_iso_on),
      onSwitch: (v) => { aud.voice_iso_on = v; if (updateAudioRackField) updateAudioRackField("voice_iso", v); render(); }
    });
    vi.body.appendChild(makeSliderRow({ label: "Amount", value: aud.voice_iso_amt ?? 65, min: 0, max: 100, step: 1, decimals: 0, unit: "%", defaultValue: 65, onChange: (v) => { aud.voice_iso_amt = v; } }));
    host.appendChild(vi.section);

    const dl = makeAccordion("audio_dialogue_lvl", "Dialogue Leveler", {
      switchChecked: Boolean(aud.lvl_on),
      onSwitch: (v) => { aud.lvl_on = v; render(); }
    });
    dl.body.appendChild(makeSliderRow({ label: "Mix", value: aud.lvl_mix ?? 50, min: 0, max: 100, step: 1, decimals: 0, unit: "%", defaultValue: 50, onChange: (v) => { aud.lvl_mix = v; } }));
    host.appendChild(dl.section);

    const eq = makeAccordion("audio_eq", "Equalizer", {
      switchChecked: aud.eq_on !== false,
      onSwitch: (v) => { aud.eq_on = v; render(); }
    });
    eq.body.appendChild(el("div", "insp-note", "6-Band Clip Parametric EQ syncs with Fairlight Console Mixer."));
    host.appendChild(eq.section);
  }

  function renderEffectsTab(host) {
    const stack = Array.isArray(state.fxStack) ? state.fxStack : [];
    const quickBar = el("div", "insp-fx-quickbar");
    const addSel = document.createElement("select");
    addSel.className = "insp-select";
    const quickEffects = [
      ["", "+ Add Resolve FX..."],
      ["glow", "Resolve FX Light: Glow"],
      ["halation", "Resolve FX Film: Halation"],
      ["lens_flare", "Resolve FX Light: Lens Flare"],
      ["film_grain", "Resolve FX Texture: Film Grain"],
      ["vignette", "Resolve FX Stylize: Vignette"],
      ["directional_blur", "Resolve FX Blur: Directional Blur"],
      ["tilt_shift", "Resolve FX Blur: Tilt-Shift Blur"],
      ["mosaic_pixelate", "Resolve FX Blur: Mosaic Blur"],
      ["unsharp_mask", "Resolve FX Sharpen: Sharpen"],
      ["camera_shake", "Resolve FX Transform: Camera Shake"],
      ["lens_distortion", "Resolve FX Transform: Lens Distortion"],
      ["scanlines", "Resolve FX Texture: Scanlines"],
      ["film_damage", "Resolve FX Texture: Film Damage"],
      ["invert_negative", "Resolve FX Color: Invert Color"],
      ["mirror_flip", "Resolve FX Transform: Mirror"]
    ];
    for (const [val, text] of quickEffects) {
      const o = document.createElement("option");
      o.value = val;
      o.textContent = text;
      addSel.appendChild(o);
    }
    addSel.addEventListener("change", () => {
      if (!addSel.value) return;
      if (addFxNode) addFxNode(addSel.value);
      addSel.value = "";
      render();
    });
    quickBar.appendChild(addSel);
    host.appendChild(quickBar);

    if (stack.length === 0) {
      host.appendChild(el("div", "insp-empty", "Drag any Resolve FX filter from Effects Library onto a clip, or add one above."));
      return;
    }

    stack.forEach((node, idx) => {
      const key = `fx_${idx}_${node.effect}`;
      if (uiState.expanded[key] === undefined) uiState.expanded[key] = true;
      const title = ctx.getFxDisplayTitle ? ctx.getFxDisplayTitle(node.effect) : node.effect;
      const sec = makeAccordion(key, title, {
        switchChecked: node.enabled !== false,
        onSwitch: (v) => {
          node.enabled = v;
          if (renderFxStack) renderFxStack();
          redrawActiveCanvases();
          render();
        },
        onReset: () => {
          if (ctx.resetFxNodeAtIndex) ctx.resetFxNodeAtIndex(idx);
          render();
        }
      });
      const actRow = el("div", "insp-fx-node-bar");
      const studioBtn = el("button", "insp-action-btn", "Open Studio");
      studioBtn.type = "button";
      studioBtn.addEventListener("click", () => openFxStudioByKey && openFxStudioByKey(node.effect));
      const delBtn = el("button", "insp-danger-btn", "Remove");
      delBtn.type = "button";
      delBtn.addEventListener("click", () => {
        state.fxStack.splice(idx, 1);
        if (renderFxStack) renderFxStack();
        redrawActiveCanvases();
        render();
      });
      actRow.append(studioBtn, delBtn);
      sec.body.appendChild(actRow);

      const params = node.params || {};
      const specs = (ctx.getFxSpecsForEffect ? ctx.getFxSpecsForEffect(node.effect) : []) || [];
      if (specs.length > 0) {
        for (const sp of specs) {
          if (sp.kind === "float" || sp.kind === "int") {
            sec.body.appendChild(makeSliderRow({
              label: sp.label || sp.name,
              value: params[sp.name] ?? sp.default,
              min: sp.min,
              max: sp.max,
              step: sp.step || (sp.kind === "int" ? 1 : 0.05),
              decimals: sp.kind === "int" ? 0 : 2,
              defaultValue: sp.default,
              onChange: (v) => {
                params[sp.name] = sp.kind === "int" ? Math.round(v) : v;
                if (renderFxStack) renderFxStack();
                redrawActiveCanvases();
              },
              onReset: () => {
                params[sp.name] = sp.default;
                if (renderFxStack) renderFxStack();
                redrawActiveCanvases();
                render();
              }
            }));
          } else if (sp.kind === "enum" && Array.isArray(sp.options)) {
            sec.body.appendChild(makeSelectRow(sp.label || sp.name, sp.options.map(String), String(params[sp.name] ?? sp.default), (v) => {
              params[sp.name] = v;
              if (renderFxStack) renderFxStack();
              redrawActiveCanvases();
            }));
          }
        }
      } else {
        for (const [k, v] of Object.entries(params)) {
          if (typeof v === "number") {
            sec.body.appendChild(makeSliderRow({
              label: k,
              value: v,
              min: 0,
              max: Math.max(10, v * 2),
              step: 0.1,
              decimals: 2,
              defaultValue: v,
              onChange: (nv) => { params[k] = nv; redrawActiveCanvases(); }
            }));
          }
        }
      }
      host.appendChild(sec.section);
    });
  }

  function renderTransitionTab(host, selInfo) {
    const tr = selInfo && selInfo.clip && selInfo.clip.transition_out ? selInfo.clip.transition_out : null;
    const sec = makeAccordion("transition_main", "Video Transition", {
      onReset: () => render()
    });
    if (!tr) {
      sec.body.appendChild(el("div", "insp-empty", "Select a transition handle on the timeline or apply Cross Dissolve from Effects Library."));
      host.appendChild(sec.section);
      return;
    }
    sec.body.appendChild(makeSelectRow("Transition", ["Cross Dissolve", "Additive Dissolve", "Blur Dissolve", "Dip to Color Dissolve", "Wipe", "Iris"], tr.preset || "Cross Dissolve", (v) => {
      tr.preset = v.toLowerCase().replace(/\s+/g, "");
      redrawActiveCanvases();
    }));
    sec.body.appendChild(makeSliderRow({
      label: "Duration",
      value: tr.duration_s || 1.0,
      min: 0.1,
      max: 5.0,
      step: 0.1,
      decimals: 2,
      unit: "s",
      defaultValue: 1.0,
      onChange: (v) => { tr.duration_s = v; redrawActiveCanvases(); }
    }));
    sec.body.appendChild(makeSegmentedRow("Alignment", [
      { id: "start", label: "Start" },
      { id: "center", label: "Center" },
      { id: "end", label: "End" }
    ], tr.alignment || "center", (id) => { tr.alignment = id; render(); redrawActiveCanvases(); }));
    host.appendChild(sec.section);
  }

  function renderImageTab(host) {
    const ov = state.titleOverlay || { title: "", subtitle: "", font_size: 48, enabled: true };
    const sec = makeAccordion("transition_main", "Title & Graphic Properties");
    const rowT = el("div", "insp-param-row");
    rowT.appendChild(el("span", "insp-param-label", "Rich Text"));
    const inpT = document.createElement("input");
    inpT.type = "text";
    inpT.className = "insp-text-input";
    inpT.value = ov.title || "";
    inpT.placeholder = "Title text...";
    inpT.addEventListener("input", () => { ov.title = inpT.value; redrawActiveCanvases(); });
    rowT.appendChild(inpT);
    sec.body.appendChild(rowT);
    sec.body.appendChild(makeSliderRow({
      label: "Size",
      value: ov.font_size || 48,
      min: 12,
      max: 160,
      step: 1,
      decimals: 0,
      defaultValue: 48,
      onChange: (v) => { ov.font_size = v; redrawActiveCanvases(); }
    }));
    host.appendChild(sec.section);
  }

  function renderFileTab(host, selInfo) {
    const info = makeAccordion("file_info", "Clip Metadata & File Attributes");
    if (!selInfo || !selInfo.clip) {
      info.body.appendChild(el("div", "insp-empty", "No active clip selected."));
    } else {
      const c = selInfo.clip;
      const fps = getFpsFloat ? getFpsFloat() : 25;
      const rows = [
        ["File Name", c.name || "--"],
        ["Track", `${selInfo.trackKind === "audio" ? "Audio" : "Video"} ${Number(selInfo.trackIndex || 0) + 1}`],
        ["Start TC", framesToSmpte ? framesToSmpte(c.start_frame || 0, fps, 1) : String(c.start_frame || 0)],
        ["Duration", `${c.duration_frames || 0} frames (${((c.duration_frames || 0) / fps).toFixed(2)}s)`],
        ["Source Path", c.source_path || "--"]
      ];
      for (const [k, v] of rows) {
        const r = el("div", "insp-meta-row");
        r.append(el("span", "insp-meta-k", k), el("span", "insp-meta-v tabular", v));
        info.body.appendChild(r);
      }
    }
    host.appendChild(info.section);
  }

  function render() {
    const root = byId("resolve-inspector-root");
    if (!root) return;
    root.replaceChildren();

    const selInfo = getSelectedClipTrack ? getSelectedClipTrack() : null;
    const clip = selInfo && selInfo.clip ? selInfo.clip : null;

    // 1. Resolve Clip Title Bar + Master Bypass + Reset All
    const hdr = el("div", "insp-top-bar");
    const clipBadge = el("div", "insp-clip-title", clip ? clip.name : "Inspector");
    const tools = el("div", "insp-top-tools");
    const resetAllBtn = el("button", "insp-icon-btn");
    resetAllBtn.type = "button";
    resetAllBtn.title = "Reset Inspector Parameters";
    resetAllBtn.appendChild(resetIconSvg());
    resetAllBtn.addEventListener("click", () => {
      if (clip && clip.transform) {
        clip.transform = {};
        normalizeInspectorMeta(clip);
        if (syncTransformFieldFromExternal) syncTransformFieldFromExternal("zoom_pct", 100, true);
        render();
        redrawActiveCanvases();
      }
    });
    tools.appendChild(resetAllBtn);
    hdr.append(clipBadge, tools);
    root.appendChild(hdr);

    // 2. 6-Tab Resolve Header Bar (UiQInspectorTabIconTextButton)
    const tabBar = el("div", "insp-tab-bar");
    tabBar.setAttribute("role", "tablist");
    for (const tab of INSPECTOR_TABS) {
      const btn = el("button", `insp-tab-btn${uiState.activeTab === tab.id ? " is-active" : ""}`);
      btn.type = "button";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", uiState.activeTab === tab.id ? "true" : "false");
      btn.dataset.inspTab = tab.id;
      btn.appendChild(tabIcon(tab.id));
      btn.appendChild(el("span", "insp-tab-label", tab.label));
      btn.addEventListener("click", () => {
        uiState.activeTab = tab.id;
        render();
      });
      tabBar.appendChild(btn);
    }
    root.appendChild(tabBar);

    // 3. Tab Scroll Contents Container (COLOR_OCTOPUS_GRAY #17181a)
    const body = el("div", "insp-scroll-body");
    if (uiState.activeTab === "video") renderVideoTab(body, selInfo);
    else if (uiState.activeTab === "audio") renderAudioTab(body, selInfo);
    else if (uiState.activeTab === "effects") renderEffectsTab(body);
    else if (uiState.activeTab === "transition") renderTransitionTab(body, selInfo);
    else if (uiState.activeTab === "image") renderImageTab(body);
    else renderFileTab(body, selInfo);
    root.appendChild(body);
  }

  return { render, setTab: (tab) => { uiState.activeTab = tab; render(); } };
}
