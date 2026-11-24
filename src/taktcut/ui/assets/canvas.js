import {
  CLIP_LABEL_COLORS,
  COLORCHECKER_24_PATCHES_CLIENT,
  COLOR_WARPER_BOUNDS,
  COLOR_WARPER_HUE_COUNT,
  COLOR_WARPER_HUE_LABELS,
  COLOR_WARPER_RING_RADII,
  COLOR_WARPER_SAT_RINGS,
  CURVE_CHANNELS,
  FAIRLIGHT_EQ_BAND_SPECS,
  FFT_BAND_FREQS_HZ,
  HSL_CURVE_MODES,
  HSL_HUE_ANCHOR_DEGREES,
  HSL_HUE_BOUNDS,
  HSL_HUE_VECTORS,
  MARKER_COLOR_HEX,
  RETIME_SPEED_MAX,
  RETIME_SPEED_MIN,
  TRANSFORM_PARAM_BOUNDS,
  TRANSIENT_FOCUS_FREQ_RANGES,
  applyColorNodeChainRgbAtClient,
  applyColorNodeChainRgbClient,
  applyColorNodesBeforeTargetClient,
  buildCurveLut256Client,
  clampSplitWipePercent,
  computeAvSplitEditInfo,
  computeBpmBeatFrames,
  computeInOutRangeMetrics,
  computeSplitWipeGeometry,
  computeTimelineZoomViewport,
  computeTitleOverlayAnchorBox,
  estimateFairlightCompressorGrClient,
  evaluateActiveNodeMaskAtClient,
  evaluateClipFadeEnvelope,
  evaluateClipTransformAtTime,
  evaluateCornerPinsClient,
  evaluateFairlightDynamicsTransferDb,
  evaluateFairlightEqBandDb,
  evaluateFairlightEqCurveDb,
  evaluatePeriodicHueCurveClient,
  evaluateRetimeSourceOffset,
  evaluateTitleMotionState,
  evaluateRetimeSpeedAt,
  evaluateTrackPointClient,
  evaluateTransformParamAtTime,
  evaluateTransformParamSpeedAtTime,
  findActiveTransitionAtFrame,
  formatRetimeBadgeText,
  formatRetimeSpeedValue,
  formatTransformBadgeText,
  getAllTransformKeyframeTimes,
  getAspectRatioPreset,
  getDynamicZoomShortTag,
  getTransitionPresetName,
  getTransitionShortTag,
  hasClipDveCrop,
  hasClipDveStyling,
  hasTransformKeyframes,
  isClipTransformIdentity,
  isColorWarperIdentity,
  isCurveChannelIdentity,
  isPowerWindowActive,
  isQualifierActive,
  normalizeClipLabelColor,
  normalizeClipLinkGroupId,
  normalizeClipRetime,
  normalizeClipTransform,
  normalizeClipTransition,
  normalizeColorCurves,
  normalizeColorWarper,
  normalizeCurvePoints,
  normalizeFairlightAudioRackParams,
  normalizeHslCurves,
  normalizePlanarTrackerClient,
  normalizePowerWindow,
  normalizeQualifier,
  normalizeStabilizerClient,
  resolveTransformKeyframeBezier,
  sampleTransformCurve
} from "./timeline_ops.js";

export function evaluateEasing(tNorm, easing = "linear") {
  const u = clamp01(Number.isFinite(tNorm) ? tNorm : 0);
  if (easing === "ease_in") return u * u;
  if (easing === "ease_out") {
    const inv = 1 - u;
    return 1 - inv * inv;
  }
  if (easing === "ease_in_out") return u * u * (3 - 2 * u);
  return u;
}

export function evaluateKeyframes(keyframes, timeSec) {
  if (!Array.isArray(keyframes) || keyframes.length === 0) return 1.0;
  const ordered = [...keyframes].sort((a, b) => Number(a.time_s) - Number(b.time_s));
  const t = Math.max(0, Number.isFinite(timeSec) ? timeSec : 0);
  if (t <= Number(ordered[0].time_s)) return Number(ordered[0].value);
  const last = ordered[ordered.length - 1];
  if (t >= Number(last.time_s)) return Number(last.value);
  for (let i = 0; i < ordered.length - 1; i++) {
    const k0 = ordered[i];
    const k1 = ordered[i + 1];
    const t0 = Number(k0.time_s);
    const t1 = Number(k1.time_s);
    if (t <= t1) {
      const dt = t1 - t0;
      if (dt <= 1e-6) return Number(k1.value);
      const u = (t - t0) / dt;
      const w = evaluateEasing(u, k0.easing || "linear");
      return Number(k0.value) + (Number(k1.value) - Number(k0.value)) * w;
    }
  }
  return Number(last.value);
}

export function evaluateNodeIntensity(node, timeSec) {
  if (!node || node.enabled === false) return 0.0;
  if (!Array.isArray(node.keyframes) || node.keyframes.length === 0) return 1.0;
  return Math.max(0, Math.min(2, evaluateKeyframes(node.keyframes, timeSec)));
}

export function drawKeyframeCurveCanvas(canvas, keyframes, durationSec, currentTimeSec) {
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas, 74);
  const dur = Math.max(0.5, Number.isFinite(durationSec) ? durationSec : 10);
  const kfs = Array.isArray(keyframes)
    ? [...keyframes].sort((a, b) => Number(a.time_s) - Number(b.time_s))
    : [];
  const maxVal = Math.max(1.0, ...kfs.map((k) => Number(k.value) || 0));
  const padL = 26;
  const padR = 10;
  const padT = 10;
  const padB = 14;
  const plotW = Math.max(40, width - padL - padR);
  const plotH = Math.max(20, height - padT - padB);

  const timeToX = (t) => padL + (clamp01(t / dur)) * plotW;
  const valToY = (v) => padT + (1 - clamp01(v / maxVal)) * plotH;

  ctx.fillStyle = "#141416";
  ctx.fillRect(0, 0, width, height);

  // Subtle horizontal grid lines (0%, 50%, 100%)
  ctx.strokeStyle = "#26262c";
  ctx.lineWidth = 1;
  for (const frac of [0, 0.5, 1]) {
    const gy = padT + (1 - frac) * plotH;
    ctx.beginPath();
    ctx.moveTo(padL, gy);
    ctx.lineTo(padL + plotW, gy);
    ctx.stroke();
  }

  ctx.fillStyle = "#8e8e98";
  ctx.font = "9px ui-monospace, monospace";
  ctx.fillText(maxVal > 1 ? `${Math.round(maxVal * 100)}%` : "100%", 2, padT + 4);
  ctx.fillText("0%", 6, padT + plotH + 3);

  // Sampled interpolation curve
  const samples = 64;
  ctx.beginPath();
  for (let i = 0; i <= samples; i++) {
    const t = (dur * i) / samples;
    const v = kfs.length > 0 ? evaluateKeyframes(kfs, t) : 1.0;
    const px = timeToX(t);
    const py = valToY(v);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = kfs.length > 0 ? "#e68442" : "#528bff";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Fill area under curve
  ctx.lineTo(padL + plotW, padT + plotH);
  ctx.lineTo(padL, padT + plotH);
  ctx.closePath();
  ctx.fillStyle = kfs.length > 0 ? "rgba(230, 132, 66, 0.14)" : "rgba(82, 139, 255, 0.1)";
  ctx.fill();

  // Keyframe diamonds
  for (const kf of kfs) {
    const kx = timeToX(Number(kf.time_s));
    const ky = valToY(Number(kf.value));
    ctx.fillStyle = "#ffd8a8";
    ctx.strokeStyle = "#e68442";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(kx, ky - 4.5);
    ctx.lineTo(kx + 4.5, ky);
    ctx.lineTo(kx, ky + 4.5);
    ctx.lineTo(kx - 4.5, ky);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Current playhead needle & evaluated readout
  const curT = Math.max(0, Math.min(dur, Number.isFinite(currentTimeSec) ? currentTimeSec : 0));
  const curV = kfs.length > 0 ? evaluateKeyframes(kfs, curT) : 1.0;
  const nx = timeToX(curT);
  ctx.strokeStyle = "#689cff";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(nx, padT - 4);
  ctx.lineTo(nx, padT + plotH + 2);
  ctx.stroke();

  ctx.fillStyle = "#d8d8de";
  ctx.font = "600 9px ui-monospace, monospace";
  const tag = `t=${curT.toFixed(2)}s | ${(curV * 100).toFixed(0)}%`;
  const tw = ctx.measureText(tag).width;
  ctx.fillText(tag, Math.max(padL, padL + plotW - tw - 2), padT + 2);
}

export function drawTransformGraphCanvas(
  canvas,
  transformOrClip,
  paramName,
  durationSec,
  currentTimeSec,
  options = {}
) {
  if (!canvas) return null;
  const { ctx, width, height } = setupCanvas(canvas, 136);
  const norm = normalizeClipTransform(transformOrClip);
  const bounds = TRANSFORM_PARAM_BOUNDS[paramName] || TRANSFORM_PARAM_BOUNDS.zoom_pct;
  const lane = norm.keyframes && Array.isArray(norm.keyframes[paramName]) ? norm.keyframes[paramName] : [];
  const dur = Math.max(0.2, Number.isFinite(Number(durationSec)) ? Number(durationSec) : 5.0);
  const mode = options.mode === "speed" ? "speed" : "value";
  const selectedKfIdx =
    Number.isInteger(options.selectedKfIdx) && options.selectedKfIdx >= 0 && options.selectedKfIdx < lane.length
      ? options.selectedKfIdx
      : lane.length > 0
        ? 0
        : -1;

  const padL = 36;
  const padR = 12;
  const padT = 16;
  const padB = 18;
  const plotW = Math.max(60, width - padL - padR);
  const plotH = Math.max(40, height - padT - padB);
  const samples = sampleTransformCurve(norm, paramName, dur, 72);

  let yMin;
  let yMax;
  if (mode === "speed") {
    const speeds = samples.map((s) => s.speed);
    const minS = Math.min(0, ...speeds);
    const maxS = Math.max(0, ...speeds);
    const span = Math.max(10, maxS - minS);
    yMin = minS - span * 0.12;
    yMax = maxS + span * 0.18;
  } else {
    const vals = [
      ...samples.map((s) => s.value),
      ...lane.map((k) => k.value),
      Number(norm[paramName]) || bounds.def
    ];
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    if (Math.abs(hi - lo) < 1e-3) {
      const margin = paramName === "zoom_pct" ? 30 : paramName === "opacity_pct" ? 25 : 20;
      lo = Math.max(bounds.min, lo - margin);
      hi = Math.min(bounds.max, hi + margin);
    } else {
      const pad = (hi - lo) * 0.16;
      lo = Math.max(bounds.min, lo - pad);
      hi = Math.min(bounds.max, hi + pad);
    }
    if (Math.abs(hi - lo) < 1e-3) {
      lo = bounds.min;
      hi = bounds.max;
    }
    yMin = lo;
    yMax = hi;
  }

  const timeToX = (t) => padL + clamp01(t / dur) * plotW;
  const valToY = (v) => padT + (1 - (v - yMin) / Math.max(1e-6, yMax - yMin)) * plotH;

  ctx.fillStyle = "#111216";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#16171d";
  ctx.fillRect(padL, padT, plotW, plotH);

  // Grid lines
  ctx.strokeStyle = "#262832";
  ctx.lineWidth = 1;
  for (const frac of [0, 0.25, 0.5, 0.75, 1]) {
    const gy = padT + (1 - frac) * plotH;
    ctx.beginPath();
    ctx.moveTo(padL, gy);
    ctx.lineTo(padL + plotW, gy);
    ctx.stroke();
  }
  for (const tFrac of [0.25, 0.5, 0.75]) {
    const gx = padL + tFrac * plotW;
    ctx.beginPath();
    ctx.moveTo(gx, padT);
    ctx.lineTo(gx, padT + plotH);
    ctx.stroke();
  }

  // Zero baseline when visible
  if (yMin < 0 && yMax > 0) {
    const zy = valToY(0);
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "#3f4354";
    ctx.beginPath();
    ctx.moveTo(padL, zy);
    ctx.lineTo(padL + plotW, zy);
    ctx.stroke();
    ctx.restore();
  }

  // Axis labels
  ctx.fillStyle = "#8e91a0";
  ctx.font = "9px ui-monospace, monospace";
  const fmtAxis = (v) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));
  ctx.fillText(fmtAxis(yMax), 3, padT + 6);
  ctx.fillText(fmtAxis((yMin + yMax) * 0.5), 3, padT + plotH * 0.5 + 3);
  ctx.fillText(fmtAxis(yMin), 3, padT + plotH);
  ctx.fillText("0.0s", padL, height - 4);
  const endLabel = `${dur.toFixed(1)}s`;
  ctx.fillText(endLabel, padL + plotW - ctx.measureText(endLabel).width, height - 4);

  // Sampled Value or Speed Curve
  const strokeColor =
    mode === "speed" ? "#3fb950" : lane.length > 0 ? "#e68442" : "#528bff";
  const fillColor =
    mode === "speed"
      ? "rgba(63, 185, 80, 0.14)"
      : lane.length > 0
        ? "rgba(230, 132, 66, 0.15)"
        : "rgba(82, 139, 255, 0.10)";

  ctx.beginPath();
  samples.forEach((pt, i) => {
    const px = timeToX(pt.time_s);
    const py = valToY(mode === "speed" ? pt.speed : pt.value);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  const baseFillY = mode === "speed" && yMin < 0 && yMax > 0 ? valToY(0) : padT + plotH;
  ctx.lineTo(padL + plotW, baseFillY);
  ctx.lineTo(padL, baseFillY);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();

  const handleHits = [];
  const kfHits = [];

  // Bezier control handles for selected segment (Value mode)
  if (mode === "value" && selectedKfIdx >= 0 && selectedKfIdx < lane.length - 1) {
    const k0 = lane[selectedKfIdx];
    const k1 = lane[selectedKfIdx + 1];
    const dt = k1.time_s - k0.time_s;
    const dv = k1.value - k0.value;
    if (dt > 1e-5) {
      const [bx1, by1, bx2, by2] = resolveTransformKeyframeBezier(k0);
      const x0 = timeToX(k0.time_s);
      const y0 = valToY(k0.value);
      const xEnd = timeToX(k1.time_s);
      const yEnd = valToY(k1.value);

      const h1x = timeToX(k0.time_s + bx1 * dt);
      const h1y = valToY(k0.value + by1 * dv);
      const h2x = timeToX(k0.time_s + bx2 * dt);
      const h2y = valToY(k0.value + by2 * dv);

      ctx.save();
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(h1x, h1y);
      ctx.moveTo(xEnd, yEnd);
      ctx.lineTo(h2x, h2y);
      ctx.stroke();

      for (const h of [
        { role: "p1", x: h1x, y: h1y, kfIdx: selectedKfIdx },
        { role: "p2", x: h2x, y: h2y, kfIdx: selectedKfIdx }
      ]) {
        ctx.fillStyle = "#ffd166";
        ctx.strokeStyle = "#16171d";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(h.x, h.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        handleHits.push(h);
      }
      ctx.restore();
    }
  }

  // Keyframe diamonds
  lane.forEach((kf, idx) => {
    const kx = timeToX(kf.time_s);
    const ky = mode === "speed"
      ? valToY(evaluateTransformParamSpeedAtTime(norm, paramName, kf.time_s))
      : valToY(kf.value);
    const isSel = idx === selectedKfIdx;
    const r = isSel ? 5.5 : 4.5;
    ctx.save();
    ctx.fillStyle = isSel ? "#ffd166" : "#ffd8a8";
    ctx.strokeStyle = isSel ? "#ffffff" : "#e68442";
    ctx.lineWidth = isSel ? 1.8 : 1.3;
    ctx.beginPath();
    ctx.moveTo(kx, ky - r);
    ctx.lineTo(kx + r, ky);
    ctx.lineTo(kx, ky + r);
    ctx.lineTo(kx - r, ky);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    kfHits.push({ idx, x: kx, y: ky, time_s: kf.time_s, value: kf.value });
  });

  // Playhead needle & telemetry readout
  const curT = Math.max(0, Math.min(dur, Number.isFinite(Number(currentTimeSec)) ? Number(currentTimeSec) : 0));
  const curVal =
    mode === "speed"
      ? evaluateTransformParamSpeedAtTime(norm, paramName, curT)
      : evaluateTransformParamAtTime(norm, paramName, curT);
  const nx = timeToX(curT);
  ctx.strokeStyle = "#689cff";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(nx, padT - 3);
  ctx.lineTo(nx, padT + plotH + 2);
  ctx.stroke();

  const unitTag = mode === "speed" ? `${bounds.unit}/s` : bounds.unit;
  const tag =
    mode === "speed"
      ? `SPEED t=${curT.toFixed(2)}s | ${curVal >= 0 ? "+" : ""}${curVal.toFixed(1)} ${unitTag}`
      : `VALUE t=${curT.toFixed(2)}s | ${curVal.toFixed(1)}${unitTag}`;
  ctx.fillStyle = "#d8d8de";
  ctx.font = "600 9px ui-monospace, monospace";
  const tw = ctx.measureText(tag).width;
  ctx.fillText(tag, Math.max(padL, padL + plotW - tw - 2), padT - 4);

  return {
    plotRect: { x: padL, y: padT, w: plotW, h: plotH },
    durationSec: dur,
    yMin,
    yMax,
    mode,
    paramName,
    keyframes: kfHits,
    handles: handleHits
  };
}

function clamp01(val) {
  return val < 0 ? 0 : val > 1 ? 1 : val;
}

function clampNum(val, minVal, maxVal) {
  const num = Number(val);
  if (!Number.isFinite(num)) return minVal;
  return num < minVal ? minVal : num > maxVal ? maxVal : num;
}

function clampBalance(val) {
  return val < -1 ? -1 : val > 1 ? 1 : val;
}

export function applyColorGradeRgb(r, g, b, grade) {
  if (!grade) return [clamp01(r), clamp01(g), clamp01(b)];
  const lift = grade.lift || [0, 0, 0];
  const gamma = grade.gamma || [0, 0, 0];
  const gain = grade.gain || [0, 0, 0];
  const contrast = Number.isFinite(Number(grade.contrast)) ? Number(grade.contrast) : 1.0;
  const sat = Number.isFinite(Number(grade.saturation)) ? Number(grade.saturation) : 1.0;
  const temp = Number.isFinite(Number(grade.temperature)) ? Number(grade.temperature) : 0.0;

  const tempR = temp * 0.25;
  const tempG = temp * 0.03;
  const tempB = -temp * 0.28;

  const shadows = [clampBalance(lift[0]), clampBalance(lift[1]), clampBalance(lift[2])];
  const midtones = [
    clampBalance(gamma[0] + tempR),
    clampBalance(gamma[1] + tempG),
    clampBalance(gamma[2] + tempB)
  ];
  const highlights = [
    clampBalance(gain[0] + tempR * 0.8),
    clampBalance(gain[1] + tempG * 0.8),
    clampBalance(gain[2] + tempB * 0.8)
  ];

  const channels = [r, g, b];
  const graded = [0, 0, 0];
  for (let idx = 0; idx < 3; idx++) {
    const v = clamp01(channels[idx]);
    const wS = clamp01(1.0 - v / 0.55);
    const wM = clamp01(1.0 - Math.abs(v - 0.5) / 0.5);
    const wH = clamp01((v - 0.45) / 0.55);
    const balanced =
      v +
      (shadows[idx] * wS * 0.45 +
        midtones[idx] * wM * 0.40 +
        highlights[idx] * wH * 0.45);
    graded[idx] = clamp01((balanced - 0.5) * contrast + 0.5);
  }

  let sr = graded[0];
  let sg = graded[1];
  let sb = graded[2];
  if (Math.abs(sat - 1.0) > 1e-6) {
    const luma = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
    sr = luma + sat * (sr - luma);
    sg = luma + sat * (sg - luma);
    sb = luma + sat * (sb - luma);
  }
  return [clamp01(sr), clamp01(sg), clamp01(sb)];
}

export function applyAscCdlRgb(r, g, b, cdl) {
  const s = cdl.slope;
  const o = cdl.offset;
  const p = cdl.power;
  const sat = cdl.saturation;

  const sr0 = Math.pow(Math.max(0, r * s[0] + o[0]), p[0]);
  const sg0 = Math.pow(Math.max(0, g * s[1] + o[1]), p[1]);
  const sb0 = Math.pow(Math.max(0, b * s[2] + o[2]), p[2]);

  if (sat !== 1.0) {
    const luma = 0.2126 * sr0 + 0.7152 * sg0 + 0.0722 * sb0;
    return [
      clamp01(luma + sat * (sr0 - luma)),
      clamp01(luma + sat * (sg0 - luma)),
      clamp01(luma + sat * (sb0 - luma))
    ];
  }
  return [clamp01(sr0), clamp01(sg0), clamp01(sb0)];
}

export function applyGradeOrCdlRgb(r, g, b, colorState) {
  if (!colorState) return [clamp01(r), clamp01(g), clamp01(b)];
  if (Array.isArray(colorState.nodes)) {
    return applyColorNodeChainRgbClient(r, g, b, colorState.nodes);
  }
  if (Array.isArray(colorState.lift) || Array.isArray(colorState.gamma) || Array.isArray(colorState.gain)) {
    return applyColorGradeRgb(r, g, b, colorState);
  }
  if (Array.isArray(colorState.slope)) {
    return applyAscCdlRgb(r, g, b, colorState);
  }
  return [clamp01(r), clamp01(g), clamp01(b)];
}

export function framesToSmpte(frame, fpsNum, fpsDen) {
  const nominalFps = Math.max(1, Math.round(fpsNum / Math.max(1, fpsDen)));
  const safeFrame = Math.max(0, Math.round(frame));
  const ff = safeFrame % nominalFps;
  const totalSec = Math.floor(safeFrame / nominalFps);
  const ss = totalSec % 60;
  const mm = Math.floor(totalSec / 60) % 60;
  const hh = Math.floor(totalSec / 3600);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

function setupCanvas(canvas, cssHeight, explicitWidth = null) {
  let rawWidth = Number(explicitWidth);
  if (!Number.isFinite(rawWidth) || rawWidth <= 0) {
    const rect = canvas.parentElement
      ? canvas.parentElement.getBoundingClientRect()
      : canvas.getBoundingClientRect();
    rawWidth = rect.width;
  }
  const width = Math.max(260, Math.floor(rawWidth));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height: cssHeight };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function toCssRgb(r, g, b) {
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

function drawSplitWipeOverlay(ctx, fx, fy, frameW, frameH, geom, opts = {}) {
  if (!geom || frameW <= 0 || frameH <= 0) return;
  const isDragging = Boolean(opts && opts.isDragging);
  const isHovered = Boolean(opts && opts.isHovered);
  const beforeLabel = String((opts && opts.beforeLabel) || "BEFORE");
  const afterLabel = String((opts && opts.afterLabel) || "AFTER");
  const divX = geom.dividerX;
  const handleY = geom.handleY;

  ctx.save();
  // Dark outer halo for contrast over bright SMPTE bars or optical flares
  ctx.strokeStyle = "rgba(17, 17, 20, 0.72)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(divX, fy);
  ctx.lineTo(divX, fy + frameH);
  ctx.stroke();

  // Crisp vertical divider line
  ctx.strokeStyle = isDragging || isHovered ? "#ffb366" : "#e68442";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(divX, fy);
  ctx.lineTo(divX, fy + frameH);
  ctx.stroke();

  // Center DaVinci-style vertical grab handle bar
  const handleW = 14;
  const handleH = Math.min(34, Math.max(18, Math.round(frameH * 0.16)));
  const hx = Math.max(fx + 1, Math.min(fx + frameW - handleW - 1, divX - handleW / 2));
  const hy = handleY - handleH / 2;
  roundRectPath(ctx, hx, hy, handleW, handleH, 4);
  ctx.fillStyle = isDragging
    ? "#e68442"
    : isHovered
      ? "#2a2b32"
      : "rgba(17, 17, 20, 0.92)";
  ctx.fill();
  ctx.strokeStyle = isDragging ? "#ffd8a8" : "#e68442";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Grip chevrons and center tick inside handle bar
  const gripCx = hx + handleW / 2;
  const gripColor = isDragging ? "#111114" : "#f0f0f4";
  ctx.strokeStyle = gripColor;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(gripCx, handleY - 7);
  ctx.lineTo(gripCx, handleY + 7);
  ctx.moveTo(gripCx - 2.5, handleY - 3);
  ctx.lineTo(gripCx - 4.5, handleY);
  ctx.lineTo(gripCx - 2.5, handleY + 3);
  ctx.moveTo(gripCx + 2.5, handleY - 3);
  ctx.lineTo(gripCx + 4.5, handleY);
  ctx.lineTo(gripCx + 2.5, handleY + 3);
  ctx.stroke();

  // Corner BEFORE / AFTER pills
  ctx.font = "700 10px ui-monospace, monospace";
  const pillH = 18;
  const pillY = fy + 8;
  const beforeW = Math.min(Math.max(44, Math.ceil(ctx.measureText(beforeLabel).width) + 14), Math.max(44, frameW * 0.44));
  const afterW = Math.min(Math.max(44, Math.ceil(ctx.measureText(afterLabel).width) + 14), Math.max(44, frameW * 0.44));

  roundRectPath(ctx, fx + 8, pillY, beforeW, pillH, 3);
  ctx.fillStyle = "rgba(17, 17, 20, 0.88)";
  ctx.fill();
  ctx.strokeStyle = "rgba(164, 164, 174, 0.52)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#e8e8ee";
  ctx.fillText(beforeLabel, fx + 15, pillY + 12.5);

  const afterX = fx + frameW - afterW - 8;
  roundRectPath(ctx, afterX, pillY, afterW, pillH, 3);
  ctx.fillStyle = "#e68442";
  ctx.fill();
  ctx.strokeStyle = "#ffb366";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#111114";
  ctx.fillText(afterLabel, afterX + 7, pillY + 12.5);
  ctx.restore();
}

function hexToRgbTuple(hex) {
  if (typeof hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(hex.trim())) {
    return [255, 216, 168];
  }
  const clean = hex.trim().slice(1);
  const num = Number.parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

let _fxScratchCanvas = null;
let _halScratchCanvas = null;
let _tiltScratchCanvas = null;
let _fxMaskScratchCanvas = null;
let _transScratchA = null;
let _transScratchB = null;
let _dveLayerScratch = null;
let _dveTileScratch = null;
function ensureScratchCanvas(existing, w, h) {
  let canvas = existing;
  if (!canvas && typeof document !== "undefined") {
    canvas = document.createElement("canvas");
  }
  if (!canvas) return null;
  const cw = Math.max(1, Math.round(w));
  const ch = Math.max(1, Math.round(h));
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
  }
  return canvas;
}

function getFxScratchCanvas(w, h) {
  _fxScratchCanvas = ensureScratchCanvas(_fxScratchCanvas, w, h);
  return _fxScratchCanvas;
}

function isEffectMaskActive(node) {
  const m = node && node.effect_mask;
  return Boolean(m && (m.shape === "ellipse" || m.shape === "rect"));
}

function evaluateEffectMaskAt(u, v, mask) {
  if (!mask || (mask.shape !== "ellipse" && mask.shape !== "rect")) return 1.0;
  const cx = Math.min(0.95, Math.max(0.05, Number(mask.center_x ?? 0.5)));
  const cy = Math.min(0.95, Math.max(0.05, Number(mask.center_y ?? 0.5)));
  const rx = Math.min(0.95, Math.max(0.05, Number(mask.radius_x ?? 0.35)));
  const ry = Math.min(0.95, Math.max(0.05, Number(mask.radius_y ?? 0.35)));
  const f = Math.min(0.5, Math.max(0.01, Number(mask.feather ?? 0.12)));
  const du = (u - cx) / rx;
  const dv = (v - cy) / ry;
  const dist = mask.shape === "ellipse" ? Math.hypot(du, dv) : Math.max(Math.abs(du), Math.abs(dv));
  const weight = Math.min(1, Math.max(0, (1.0 + f - dist) / (2.0 * f)));
  return mask.invert ? 1.0 - weight : weight;
}

function blendImageDataWithEffectMask(dryImg, wetImg, w, h, mask) {
  const dry = dryImg.data;
  const wet = wetImg.data;
  for (let y = 0; y < h; y++) {
    const v = (y + 0.5) / h;
    const rowOff = y * w;
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w;
      const m = evaluateEffectMaskAt(u, v, mask);
      if (m >= 0.999) continue;
      const idx = (rowOff + x) * 4;
      if (m <= 0.001) {
        wet[idx] = dry[idx];
        wet[idx + 1] = dry[idx + 1];
        wet[idx + 2] = dry[idx + 2];
        wet[idx + 3] = dry[idx + 3];
      } else {
        const inv = 1.0 - m;
        wet[idx] = Math.round(dry[idx] * inv + wet[idx] * m);
        wet[idx + 1] = Math.round(dry[idx + 1] * inv + wet[idx + 1] * m);
        wet[idx + 2] = Math.round(dry[idx + 2] * inv + wet[idx + 2] * m);
        wet[idx + 3] = Math.round(dry[idx + 3] * inv + wet[idx + 3] * m);
      }
    }
  }
  return wetImg;
}

function runMaskedBufferPass(bctx, bw, bh, mask, applyFn) {
  if (!mask || (mask.shape !== "ellipse" && mask.shape !== "rect")) {
    applyFn();
    return;
  }
  const dryImg = bctx.getImageData(0, 0, bw, bh);
  applyFn();
  const wetImg = bctx.getImageData(0, 0, bw, bh);
  blendImageDataWithEffectMask(dryImg, wetImg, bw, bh, mask);
  bctx.putImageData(wetImg, 0, 0);
}

const CLIP_SCENE_PALETTES = [
  {
    bg0: [0.14, 0.18, 0.26],
    bg1: [0.22, 0.27, 0.34],
    bg2: [0.09, 0.11, 0.16],
    key: [0.95, 0.88, 0.78],
    keyX: 0.72,
    keyY: 0.32
  },
  {
    bg0: [0.24, 0.16, 0.14],
    bg1: [0.33, 0.24, 0.20],
    bg2: [0.13, 0.09, 0.09],
    key: [0.98, 0.78, 0.56],
    keyX: 0.30,
    keyY: 0.36
  },
  {
    bg0: [0.12, 0.22, 0.20],
    bg1: [0.18, 0.31, 0.28],
    bg2: [0.08, 0.13, 0.12],
    key: [0.76, 0.96, 0.90],
    keyX: 0.64,
    keyY: 0.28
  },
  {
    bg0: [0.20, 0.16, 0.26],
    bg1: [0.29, 0.24, 0.36],
    bg2: [0.11, 0.09, 0.15],
    key: [0.84, 0.86, 1.0],
    keyX: 0.38,
    keyY: 0.30
  }
];

function getClipScenePalette(clipName) {
  const str = String(clipName || "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return CLIP_SCENE_PALETTES[hash % CLIP_SCENE_PALETTES.length];
}

function drawBaseProgramScene(ctx, w, h, doc, playheadFrame, cdl, activeClips) {
  const topClip = activeClips.length > 0 ? activeClips[activeClips.length - 1] : null;
  const pal = topClip ? getClipScenePalette(topClip.clip.name) : CLIP_SCENE_PALETTES[0];
  const grad = ctx.createLinearGradient(0, 0, w, h);
  const c0 = applyGradeOrCdlRgb(pal.bg0[0], pal.bg0[1], pal.bg0[2], cdl);
  const c1 = applyGradeOrCdlRgb(pal.bg1[0], pal.bg1[1], pal.bg1[2], cdl);
  const c2 = applyGradeOrCdlRgb(pal.bg2[0], pal.bg2[1], pal.bg2[2], cdl);
  grad.addColorStop(0, toCssRgb(c0[0], c0[1], c0[2]));
  grad.addColorStop(0.55, toCssRgb(c1[0], c1[1], c1[2]));
  grad.addColorStop(1, toCssRgb(c2[0], c2[1], c2[2]));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle editorial specular keylight disc with smooth parallax for optical tracking
  const parallaxX = 0.045 * Math.sin((playheadFrame || 0) * 0.08);
  const parallaxY = 0.03 * Math.cos((playheadFrame || 0) * 0.06);
  const keyX = w * (pal.keyX + parallaxX);
  const keyY = h * (pal.keyY + parallaxY);
  const keyR = Math.max(18, Math.min(w, h) * 0.22);
  const keyRgb = applyGradeOrCdlRgb(pal.key[0], pal.key[1], pal.key[2], cdl);
  const keyGrad = ctx.createRadialGradient(keyX, keyY, 2, keyX, keyY, keyR);
  keyGrad.addColorStop(
    0,
    `rgba(${Math.round(keyRgb[0] * 255)}, ${Math.round(keyRgb[1] * 255)}, ${Math.round(keyRgb[2] * 255)}, 0.54)`
  );
  keyGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = keyGrad;
  ctx.beginPath();
  ctx.arc(keyX, keyY, keyR, 0, Math.PI * 2);
  ctx.fill();

  // Crisp studio optical fiducial core inside keylight for 2D planar feature tracking
  const coreR = Math.max(3, Math.min(6, Math.min(w, h) * 0.018));
  ctx.fillStyle = "rgba(255, 255, 255, 0.34)";
  ctx.beginPath();
  ctx.arc(keyX, keyY, coreR, 0, Math.PI * 2);
  ctx.fill();

  // Subtle optical framing reticule & cinematic horizon marks (no SMPTE bars on editorial picture)
  ctx.strokeStyle = "rgba(216, 216, 222, 0.16)";
  ctx.lineWidth = 1;
  const cx = w / 2;
  const cy = h / 2;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy);
  ctx.lineTo(cx + 8, cy);
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx, cy + 8);
  ctx.stroke();

  // Compact top-right clip HUD pill (kept clear of bottom-left lower-thirds & bottom-center subtitles)
  const hudPad = Math.min(10, Math.max(5, Math.floor(w * 0.02)));
  ctx.save();
  ctx.font = "600 9.5px ui-monospace, monospace";
  let hudText = "BLACK / NO VIDEO AT PLAYHEAD";
  if (activeClips.length > 0) {
    const top = activeClips[activeClips.length - 1];
    const localPos = playheadFrame - top.clip.start_frame;
    const retimedEval = evaluateRetimeSourceOffset(top.clip, localPos);
    const retimeNorm = retimedEval.retimeNorm;
    const isRetimed =
      retimedEval.isRamp ||
      retimeNorm.retimeProcess !== "nearest" ||
      Math.abs(retimeNorm.speedRate - 1.0) > 0.005 ||
      retimeNorm.reverse;
    const relOffset = (top.clip.source_in_frame || 0) + Math.round(retimedEval.sourceDeltaFrames);
    const retimeSlateTag = isRetimed
      ? retimedEval.isRamp
        ? ` | ${formatRetimeBadgeText(
            retimeNorm.speedRate,
            retimeNorm.reverse,
            retimeNorm.retimeProcess,
            retimeNorm.rampPoints
          )} @${formatRetimeSpeedValue(retimedEval.instantSpeed)}`
        : ` | ${formatRetimeBadgeText(
            retimeNorm.speedRate,
            retimeNorm.reverse,
            retimeNorm.retimeProcess,
            retimeNorm.rampPoints
          )}`
      : "";
    const transformNorm = normalizeClipTransform(top.clip);
    const transformSlateTag = !isClipTransformIdentity(transformNorm)
      ? ` | XF ${formatTransformBadgeText(transformNorm)}`
      : "";
    hudText = `${top.track}: ${top.clip.name} | +${relOffset}f${retimeSlateTag}${transformSlateTag}`;
  }
  const clippedHud = fitCanvasText(ctx, hudText, Math.max(40, w - hudPad * 2 - 14));
  const pillW = Math.min(w - hudPad * 2, Math.ceil(ctx.measureText(clippedHud).width) + 14);
  const pillX = w - hudPad - pillW;
  const pillY = hudPad;
  roundRectPath(ctx, pillX, pillY, pillW, 18, 2);
  ctx.fillStyle = "rgba(17, 17, 20, 0.68)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = activeClips.length > 0 ? "#d8d8de" : "#8e8e98";
  ctx.fillText(clippedHud, pillX + 7, pillY + 12);
  ctx.restore();
}

function fitCanvasText(ctx, text, maxWidth) {
  if (!text) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 1 && ctx.measureText(`${clipped}...`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}...`;
}

function drawTextPlusLine(ctx, text, x, y, align, maxWidth, trackingPx, strokeWidth, strokeColor) {
  if (!text) return;
  const fitted = fitCanvasText(ctx, text, maxWidth);
  const hasTracking = Math.abs(trackingPx) >= 0.4;
  if (!hasTracking) {
    ctx.textAlign = align;
    if (strokeWidth > 0) {
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = strokeColor;
      ctx.lineJoin = "round";
      ctx.strokeText(fitted, x, y);
    }
    ctx.fillText(fitted, x, y);
    return;
  }
  const chars = Array.from(fitted);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const totalW = widths.reduce((a, b) => a + b, 0) + Math.max(0, chars.length - 1) * trackingPx;
  let curX = align === "center" ? x - totalW * 0.5 : x;
  ctx.textAlign = "left";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (strokeWidth > 0) {
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = strokeColor;
      ctx.lineJoin = "round";
      ctx.strokeText(ch, curX, y);
    }
    ctx.fillText(ch, curX, y);
    curX += widths[i] + trackingPx;
  }
}

export function drawTitleOverlayOnFrame(
  ctx,
  fx,
  fy,
  frameW,
  frameH,
  titleState,
  tSec,
  overlayOpts = null
) {
  const showGizmo = Boolean(overlayOpts && overlayOpts.showTitleGizmo);
  if (!titleState || titleState.enabled === false) return false;
  const rawTitle =
    typeof titleState.title === "string"
      ? titleState.title.replace(/[\r\n\t]+/g, " ").trim()
      : "";
  const rawSub =
    typeof titleState.subtitle === "string"
      ? titleState.subtitle.replace(/[\r\n\t]+/g, " ").trim()
      : "";
  const rawBug =
    typeof titleState.bug_badge === "string"
      ? titleState.bug_badge.replace(/[\r\n\t]+/g, " ").trim()
      : "";
  if (!rawTitle && !rawSub) return false;

  const accent = /^#[0-9a-fA-F]{6}$/.test(String(titleState.accent_color || "").trim())
    ? String(titleState.accent_color).trim()
    : "#e68442";
  const [ar, ag, ab] = hexToRgbTuple(accent);
  const accentCss = `rgb(${ar}, ${ag}, ${ab})`;
  const strokeCol = /^#[0-9a-fA-F]{6}$/.test(String(titleState.stroke_color || "").trim())
    ? String(titleState.stroke_color).trim()
    : "#090a0d";

  const motion = evaluateTitleMotionState(titleState, tSec);
  const { boxX, boxY, boxW, boxH, cx, cy, align } = computeTitleOverlayAnchorBox(titleState);

  const isLegacyStatic =
    !titleState.custom_position_enabled &&
    (!titleState.animation_curve || titleState.animation_curve === "none") &&
    (!titleState.plate_style || titleState.plate_style === "solid_bar") &&
    Number(titleState.stroke_width || 0) === 0 &&
    Number(titleState.shadow_depth ?? 2) === 2 &&
    Number(titleState.tracking || 0) === 0 &&
    !rawBug;

  // Draw snap-guide laser lines when dragging or when snapGuides are active
  const snapGuides = overlayOpts && overlayOpts.titleSnapGuides ? overlayOpts.titleSnapGuides : null;
  if (showGizmo && snapGuides) {
    ctx.save();
    ctx.strokeStyle = "rgba(104, 156, 255, 0.85)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    if (typeof snapGuides.x === "number") {
      const gx = fx + frameW * snapGuides.x;
      ctx.beginPath();
      ctx.moveTo(gx, fy);
      ctx.lineTo(gx, fy + frameH);
      ctx.stroke();
    }
    if (typeof snapGuides.y === "number") {
      const gy = fy + frameH * snapGuides.y;
      ctx.beginPath();
      ctx.moveTo(fx, gy);
      ctx.lineTo(fx + frameW, gy);
      ctx.stroke();
    }
    ctx.restore();
  }

  const pxBase = fx + frameW * boxX;
  const pyBase = fy + frameH * boxY;
  const pwBase = frameW * boxW;
  const phBase = frameH * boxH;

  if (!motion.visible) {
    if (showGizmo) {
      ctx.save();
      ctx.strokeStyle = "rgba(230, 132, 66, 0.45)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(pxBase, pyBase, pwBase, phBase);
      const ax = fx + frameW * cx;
      const ay = fy + frameH * cy;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(ax, ay, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    return false;
  }

  const opacity = Math.max(
    0,
    Math.min(1, Number.isFinite(Number(titleState.box_opacity)) ? Number(titleState.box_opacity) : 0.8)
  );
  const refFontSize = Math.max(
    14,
    Math.min(96, Number.isFinite(Number(titleState.font_size)) ? Number(titleState.font_size) : 34)
  );
  const titlePx = Math.max(10, Math.round(frameH * (refFontSize / 1080)));
  const subPx = Math.max(8, Math.round(frameH * (Math.max(12, refFontSize * 0.64) / 1080)));
  const trackingPx = clampNum(Number(titleState.tracking || 0), -4, 24) * (frameH / 1080);
  const strokePx = clampNum(Number(titleState.stroke_width || 0), 0, 10) * Math.max(0.75, frameH / 540);
  const shadowPx = clampNum(Number(titleState.shadow_depth ?? 2), 0, 12) * Math.max(0.6, frameH / 720);
  const plateStyle = titleState.plate_style || "solid_bar";
  const curve = titleState.animation_curve || "none";

  ctx.save();
  ctx.globalAlpha = clampNum(motion.alpha, 0, 1);

  if (isLegacyStatic) {
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 0, 0, 0.72)";
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    const pos = titleState.position || "bottom-left";
    if (pos === "bottom-left") {
      const px = fx + frameW * 0.05;
      const py = fy + frameH * 0.76;
      const pw = frameW * 0.46;
      const ph = frameH * 0.14;
      if (opacity > 0) {
        ctx.fillStyle = `rgba(20, 20, 22, ${opacity.toFixed(3)})`;
        ctx.fillRect(px, py, pw, ph);
      }
      ctx.fillStyle = accentCss;
      ctx.fillRect(px, py, Math.max(3, frameW * 0.0045), ph);

      const tx = fx + frameW * 0.068;
      const maxTextW = Math.max(40, pw - frameW * 0.032);
      ctx.textAlign = "left";
      if (rawTitle) {
        ctx.font = `700 ${titlePx}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = "#d8d8de";
        const yPos = rawSub ? fy + frameH * 0.805 : fy + frameH * 0.83;
        ctx.fillText(fitCanvasText(ctx, rawTitle, maxTextW), tx, yPos);
      }
      if (rawSub) {
        ctx.font = `600 ${subPx}px ui-monospace, monospace`;
        ctx.fillStyle = accentCss;
        const yPos = rawTitle ? fy + frameH * 0.86 : fy + frameH * 0.83;
        ctx.fillText(fitCanvasText(ctx, rawSub, maxTextW), tx, yPos);
      }
    } else if (pos === "center") {
      const px = fx + frameW * 0.14;
      const py = fy + frameH * 0.34;
      const pw = frameW * 0.72;
      const ph = frameH * 0.32;
      if (opacity > 0) {
        ctx.fillStyle = `rgba(20, 20, 22, ${opacity.toFixed(3)})`;
        ctx.fillRect(px, py, pw, ph);
      }
      ctx.fillStyle = accentCss;
      ctx.fillRect(fx + frameW * 0.42, py, frameW * 0.16, Math.max(2, frameH * 0.006));

      const cxLegacy = fx + frameW * 0.5;
      const maxTextW = Math.max(60, pw - frameW * 0.06);
      ctx.textAlign = "center";
      if (rawTitle) {
        ctx.font = `700 ${titlePx}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = "#d8d8de";
        const yPos = rawSub ? fy + frameH * 0.455 : fy + frameH * 0.5;
        ctx.fillText(fitCanvasText(ctx, rawTitle, maxTextW), cxLegacy, yPos);
      }
      if (rawSub) {
        ctx.font = `600 ${subPx}px ui-monospace, monospace`;
        ctx.fillStyle = accentCss;
        const yPos = rawTitle ? fy + frameH * 0.56 : fy + frameH * 0.5;
        ctx.fillText(fitCanvasText(ctx, rawSub, maxTextW), cxLegacy, yPos);
      }
    } else {
      const px = fx + frameW * 0.16;
      const py = fy + frameH * 0.81;
      const pw = frameW * 0.68;
      const ph = frameH * 0.11;
      if (opacity > 0) {
        ctx.fillStyle = `rgba(20, 20, 22, ${opacity.toFixed(3)})`;
        ctx.fillRect(px, py, pw, ph);
      }
      ctx.fillStyle = accentCss;
      ctx.fillRect(fx + frameW * 0.44, fy + frameH * 0.916, frameW * 0.12, Math.max(2, frameH * 0.004));

      const cxLegacy = fx + frameW * 0.5;
      const maxTextW = Math.max(60, pw - frameW * 0.05);
      ctx.textAlign = "center";
      if (rawTitle) {
        ctx.font = `700 ${titlePx}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = "#d8d8de";
        const yPos = rawSub ? fy + frameH * 0.842 : fy + frameH * 0.865;
        ctx.fillText(fitCanvasText(ctx, rawTitle, maxTextW), cxLegacy, yPos);
      }
      if (rawSub) {
        ctx.font = `600 ${subPx}px ui-monospace, monospace`;
        ctx.fillStyle = accentCss;
        const yPos = rawTitle ? fy + frameH * 0.885 : fy + frameH * 0.865;
        ctx.fillText(fitCanvasText(ctx, rawSub, maxTextW), cxLegacy, yPos);
      }
    }
  } else {
    // Motion Graphics & Text+ rendering with spring scale, wipe, plate style, tracking, stroke & corner bug
    const offX = motion.offset_x_norm * frameW;
    const offY = motion.offset_y_norm * frameH;
    const pivotX = pxBase + pwBase * 0.5 + offX;
    const pivotY = pyBase + phBase * 0.5 + offY;

    ctx.translate(pivotX, pivotY);
    if (Math.abs(motion.scale - 1) > 0.001) {
      ctx.scale(motion.scale, motion.scale);
    }
    ctx.translate(-pwBase * 0.5, -phBase * 0.5);

    const drawW = curve === "slide_wipe" ? Math.max(4, pwBase * clampNum(motion.wipe_ratio, 0, 1)) : pwBase;
    if (plateStyle === "solid_bar") {
      if (opacity > 0) {
        ctx.fillStyle = `rgba(20, 20, 22, ${opacity.toFixed(3)})`;
        ctx.fillRect(0, 0, drawW, phBase);
      }
      ctx.fillStyle = accentCss;
      if (align === "left") {
        ctx.fillRect(0, 0, Math.max(3, frameW * 0.0045), phBase);
      } else {
        ctx.fillRect(pwBase * 0.35, 0, pwBase * 0.30, Math.max(2, frameH * 0.005));
      }
    } else if (plateStyle === "glass_pill") {
      const r = Math.min(12, phBase * 0.28);
      if (opacity > 0) {
        ctx.fillStyle = `rgba(22, 24, 32, ${opacity.toFixed(3)})`;
        ctx.beginPath();
        ctx.roundRect(0, 0, drawW, phBase, r);
        ctx.fill();
      }
      ctx.fillStyle = accentCss;
      ctx.fillRect(r * 0.5, 0, Math.max(0, drawW - r), Math.max(2, frameH * 0.0035));
    } else if (plateStyle === "outline_frame") {
      if (opacity > 0) {
        ctx.fillStyle = `rgba(17, 18, 23, ${Math.max(0.14, opacity * 0.50).toFixed(3)})`;
        ctx.fillRect(0, 0, drawW, phBase);
      }
      ctx.strokeStyle = accentCss;
      ctx.lineWidth = Math.max(1.5, frameH * 0.0035);
      ctx.strokeRect(0, 0, drawW, phBase);
    }

    if (rawBug) {
      const bugPx = Math.max(8, Math.round(frameH * 0.017));
      ctx.font = `800 ${bugPx}px ui-monospace, monospace`;
      const bugTw = ctx.measureText(rawBug).width;
      const bugW = Math.min(pwBase, Math.max(frameW * 0.06, bugTw + 14));
      const bugH = Math.max(14, frameH * 0.036);
      const bugX = align === "left" ? 0 : (pwBase - bugW) * 0.5;
      const bugY = -bugH - Math.max(3, frameH * 0.006);
      ctx.fillStyle = accentCss;
      ctx.fillRect(bugX, bugY, bugW, bugH);
      ctx.fillStyle = "#111216";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(rawBug, bugX + bugW * 0.5, bugY + bugH * 0.5);
    }

    ctx.textBaseline = "middle";
    ctx.shadowColor = shadowPx > 0 ? "rgba(0, 0, 0, 0.78)" : "transparent";
    ctx.shadowBlur = shadowPx > 0 ? Math.max(1, shadowPx * 1.1) : 0;
    ctx.shadowOffsetX = shadowPx;
    ctx.shadowOffsetY = shadowPx;

    const shownTitle = curve === "typewriter" ? rawTitle.slice(0, motion.reveal_chars_title) : rawTitle;
    const shownSub = curve === "typewriter" ? rawSub.slice(0, motion.reveal_chars_sub) : rawSub;
    const titleWithCursor =
      curve === "typewriter" && motion.cursor_visible && motion.reveal_chars_title < rawTitle.length
        ? `${shownTitle}|`
        : shownTitle;
    const txLocal = align === "left" ? frameW * 0.018 : pwBase * 0.5;
    const maxTextW = Math.max(40, pwBase - frameW * 0.036);

    if (rawTitle) {
      ctx.font = `700 ${titlePx}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = "#e8e9ee";
      const yPos = rawSub ? phBase * 0.36 : phBase * 0.5;
      drawTextPlusLine(ctx, titleWithCursor, txLocal, yPos, align, maxTextW, trackingPx, strokePx, strokeCol);
    }
    if (rawSub) {
      ctx.font = `600 ${subPx}px ui-monospace, monospace`;
      ctx.fillStyle = accentCss;
      const subCursor =
        curve === "typewriter" &&
        motion.cursor_visible &&
        motion.reveal_chars_title >= rawTitle.length
          ? `${shownSub}|`
          : shownSub;
      const yPos = rawTitle ? phBase * 0.72 : phBase * 0.5;
      drawTextPlusLine(ctx, subCursor, txLocal, yPos, align, maxTextW, trackingPx * 0.7, strokePx * 0.8, strokeCol);
    }
  }
  ctx.restore();

  if (showGizmo) {
    ctx.save();
    const isDragging = Boolean(overlayOpts && overlayOpts.titleDragging);
    ctx.strokeStyle = isDragging ? "#689cff" : "rgba(230, 132, 66, 0.82)";
    ctx.lineWidth = isDragging ? 1.5 : 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(pxBase, pyBase, pwBase, phBase);
    ctx.setLineDash([]);
    // Corner resize/anchor dots + center reticle
    const corners = [
      [pxBase, pyBase],
      [pxBase + pwBase, pyBase],
      [pxBase, pyBase + phBase],
      [pxBase + pwBase, pyBase + phBase]
    ];
    ctx.fillStyle = isDragging ? "#689cff" : "#e68442";
    for (const [hx, hy] of corners) {
      ctx.fillRect(hx - 2.5, hy - 2.5, 5, 5);
    }
    const ax = fx + frameW * cx;
    const ay = fy + frameH * cy;
    ctx.strokeStyle = isDragging ? "#689cff" : "#e68442";
    ctx.beginPath();
    ctx.arc(ax, ay, 5, 0, Math.PI * 2);
    ctx.moveTo(ax - 8, ay);
    ctx.lineTo(ax + 8, ay);
    ctx.moveTo(ax, ay - 8);
    ctx.lineTo(ax, ay + 8);
    ctx.stroke();
    ctx.restore();
  }

  return true;
}

export function drawTitleMotionCurveCanvas(canvas, titleState, tSec = 0) {
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas, 84);
  ctx.fillStyle = "#121318";
  ctx.fillRect(0, 0, width, height);

  const padL = 24;
  const padR = 10;
  const padT = 12;
  const padB = 14;
  const plotW = Math.max(40, width - padL - padR);
  const plotH = Math.max(24, height - padT - padB);

  const valToY = (v) => padT + plotH * (1 - clampNum((v + 0.1) / 1.45, 0, 1));
  const yZero = valToY(0);
  const yOne = valToY(1);

  ctx.strokeStyle = "#262832";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, yZero);
  ctx.lineTo(padL + plotW, yZero);
  ctx.moveTo(padL, yOne);
  ctx.lineTo(padL + plotW, yOne);
  ctx.stroke();

  ctx.fillStyle = "#7a7d8a";
  ctx.font = "600 9px ui-monospace, monospace";
  ctx.fillText("1.0", 3, yOne + 3);
  ctx.fillText("0.0", 3, yZero + 3);

  const startS = Number.isFinite(Number(titleState && titleState.start_s)) ? Number(titleState.start_s) : 0.5;
  const animIn = clampNum(Number((titleState && titleState.anim_in_s) ?? 0.45), 0.05, 5.0);
  const curve = (titleState && titleState.animation_curve) || "none";
  const samples = 64;

  ctx.strokeStyle = curve === "none" ? "#6e7280" : "#e68442";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const sampleT = startS + u * animIn;
    const st = evaluateTitleMotionState(
      { ...(titleState || {}), enabled: true, title: (titleState && titleState.title) || "X" },
      sampleT
    );
    const val = curve === "typewriter" ? (st.reveal_chars_title / Math.max(1, String((titleState && titleState.title) || "X").length)) : st.eased_in;
    const px = padL + u * plotW;
    const py = valToY(val);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Playhead dot within anim_in window
  const uNow = clampNum((tSec - startS) / animIn, 0, 1);
  const stNow = evaluateTitleMotionState(titleState, tSec);
  const valNow =
    !stNow.visible
      ? 0
      : curve === "typewriter"
        ? stNow.reveal_chars_title / Math.max(1, String((titleState && titleState.title) || "X").length)
        : stNow.eased_in;
  const dotX = padL + uNow * plotW;
  const dotY = valToY(valNow);
  ctx.fillStyle = stNow.visible ? "#689cff" : "#7a7d8a";
  ctx.beginPath();
  ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
  ctx.fill();
}

export function drawLowerThirdOverlayOnFrame(ctx, fx, fy, frameW, frameH, ltState, tSec) {
  if (!ltState || !ltState.enabled) return false;
  const rawTitle = typeof ltState.title === "string"
    ? ltState.title.replace(/[\r\n\t]+/g, " ").replace(/[\x00-\x1f\x7f]/g, " ").trim()
    : "";
  const rawSub = typeof ltState.subtitle === "string"
    ? ltState.subtitle.replace(/[\r\n\t]+/g, " ").replace(/[\x00-\x1f\x7f]/g, " ").trim()
    : "";
  if (!rawTitle && !rawSub) return false;

  const startS = Number.isFinite(Number(ltState.start_s)) ? Math.max(0, Number(ltState.start_s)) : 0;
  const durationS = Number.isFinite(Number(ltState.duration_s)) ? Math.max(0.1, Number(ltState.duration_s)) : 5;
  if (tSec < startS || tSec > startS + durationS) return false;

  const rawPos = typeof ltState.position === "string" ? ltState.position.trim().toLowerCase() : "bottom_left";
  const pos = rawPos === "bottom_center" || rawPos === "top_left" ? rawPos : "bottom_left";
  const fontSize = Math.max(16, Math.min(96, Number.isFinite(Number(ltState.font_size)) ? Number(ltState.font_size) : 36));
  const boxOpacity = Math.max(0, Math.min(1, Number.isFinite(Number(ltState.box_opacity)) ? Number(ltState.box_opacity) : 0.65));

  const titlePx = Math.max(10, Math.round(frameH * (fontSize / 1080)));
  const subPx = Math.max(8, Math.round(frameH * (Math.max(14, Math.round(fontSize * 0.65)) / 1080)));
  const padX = Math.max(6, Math.round(frameH * (12 / 1080)));
  const padY = Math.max(4, Math.round(frameH * (10 / 1080)));
  const lineGap = rawTitle && rawSub ? Math.max(3, Math.round(frameH * (6 / 1080))) : 0;

  const safeX = frameW * 0.05;
  const safeBottom = frameH * 0.08;
  const safeTop = frameH * 0.06;
  const maxTextW = Math.max(40, (pos === "bottom_center" ? frameW * 0.84 : frameW * 0.72) - padX * 2);

  ctx.save();
  ctx.font = `700 ${titlePx}px system-ui, -apple-system, sans-serif`;
  const fittedTitle = rawTitle ? fitCanvasText(ctx, rawTitle, maxTextW) : "";
  const titleW = fittedTitle ? ctx.measureText(fittedTitle).width : 0;

  ctx.font = `500 ${subPx}px system-ui, -apple-system, sans-serif`;
  const fittedSub = rawSub ? fitCanvasText(ctx, rawSub, maxTextW) : "";
  const subW = fittedSub ? ctx.measureText(fittedSub).width : 0;

  const contentW = Math.max(titleW, subW);
  const contentH = (fittedTitle ? titlePx : 0) + (fittedSub ? subPx : 0) + lineGap;
  const boxW = Math.min(frameW * 0.90, contentW + padX * 2);
  const boxH = contentH + padY * 2;

  let boxX = fx + safeX;
  let boxY = fy + frameH - safeBottom - boxH;
  if (pos === "bottom_center") {
    boxX = fx + (frameW - boxW) * 0.5;
    boxY = fy + frameH - safeBottom - boxH;
  } else if (pos === "top_left") {
    boxX = fx + safeX;
    boxY = fy + safeTop;
  }

  if (boxOpacity > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${boxOpacity.toFixed(3)})`;
    ctx.fillRect(boxX, boxY, boxW, boxH);
  }
  ctx.fillStyle = "#e68442";
  if (pos === "bottom_center") {
    ctx.fillRect(boxX, boxY + boxH - Math.max(2, Math.round(frameH * 0.003)), boxW, Math.max(2, Math.round(frameH * 0.003)));
  } else {
    ctx.fillRect(boxX, boxY, Math.max(2, Math.round(frameW * 0.0035)), boxH);
  }

  ctx.textBaseline = "top";
  ctx.textAlign = pos === "bottom_center" ? "center" : "left";
  ctx.shadowColor = "rgba(0, 0, 0, 0.72)";
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  const textX = pos === "bottom_center" ? boxX + boxW * 0.5 : boxX + padX;
  let cursorY = boxY + padY;
  if (fittedTitle) {
    ctx.font = `700 ${titlePx}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(fittedTitle, textX, cursorY);
    cursorY += titlePx + lineGap;
  }
  if (fittedSub) {
    ctx.font = `500 ${subPx}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "#d8d8de";
    ctx.fillText(fittedSub, textX, cursorY);
  }

  ctx.restore();
  return true;
}

function sanitizeCanvasCaptionText(raw) {
  let cur = String(raw || "").replace(/\r\n|\r/g, "\n").replace(/\t/g, " ");
  for (let i = 0; i < 6; i += 1) {
    const nxt = cur.replace(/<[^>]{0,256}>/g, "");
    if (nxt === cur) break;
    cur = nxt;
  }
  return cur
    .replace(/[<>]/g, "")
    .replace(/[\x00-\x09\x0b-\x1f\x7f]/g, " ")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function computeCueWordTimingsCanvas(cue, uppercase = false) {
  if (!cue) return [];
  if (Array.isArray(cue.words) && cue.words.length > 0) {
    return cue.words.map((w) => ({
      text: uppercase ? String(w.text || "").toUpperCase() : String(w.text || ""),
      start_s: Number(w.start_s ?? cue.start_s ?? 0),
      end_s: Number(w.end_s ?? cue.end_s ?? 1)
    }));
  }
  const cleanLines = sanitizeCanvasCaptionText(cue.text);
  const tokens = cleanLines.join(" ").split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const startS = Math.max(0, Number(cue.start_s ?? 0));
  const endS = Math.max(startS + 0.01, Number(cue.end_s ?? startS + 2));
  const totalSpan = endS - startS;
  const weights = tokens.map((tok) => Math.max(1, tok.replace(/[^\w]/g, "").length || tok.length));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  let cursor = startS;
  return tokens.map((tok, idx) => {
    const label = uppercase ? tok.toUpperCase() : tok;
    let endT;
    if (idx === tokens.length - 1) {
      endT = Math.max(cursor + 0.005, endS);
    } else {
      const share = totalSpan * (weights[idx] / weightSum);
      endT = Math.min(endS - 0.005 * (tokens.length - 1 - idx), cursor + share);
      endT = Math.max(cursor + 0.005, Number(endT.toFixed(3)));
    }
    const item = { text: label, start_s: Number(cursor.toFixed(3)), end_s: Number(endT.toFixed(3)) };
    cursor = endT;
    return item;
  });
}

export function findActiveSubtitleCue(subtitleState, tSec) {
  if (!subtitleState || subtitleState.enabled === false) return null;
  const cues = Array.isArray(subtitleState.cues) ? subtitleState.cues : [];
  let matched = null;
  for (const cue of cues) {
    if (!cue) continue;
    const startS = Number(cue.start_s);
    const endS = Number(cue.end_s);
    if (!Number.isFinite(startS) || !Number.isFinite(endS) || endS <= startS) continue;
    if (tSec >= startS && tSec <= endS) {
      matched = cue;
    }
  }
  return matched;
}

const CAPTION_CANVAS_STYLES = {
  clean_white: { fontColor: "#ffffff", boxColor: "rgba(0,0,0,0)", boxOpacity: 0, borderW: 2, weight: "600" },
  yellow_broadcast: { fontColor: "#ffe047", boxColor: "rgba(12, 12, 14, 0.55)", boxOpacity: 0.55, borderW: 2, weight: "700" },
  boxed_social: { fontColor: "#ffffff", boxColor: "rgba(20, 20, 22, 0.86)", boxOpacity: 0.86, borderW: 0, weight: "700" },
  netflix_clean: { fontColor: "#ffffff", boxColor: "rgba(0,0,0,0)", boxOpacity: 0, borderW: 1, weight: "500" },
  social_karaoke: { fontColor: "#ffffff", boxColor: "rgba(20, 20, 22, 0.86)", boxOpacity: 0.86, borderW: 2, weight: "800" },
  broadcast_gold: { fontColor: "#ffd54f", boxColor: "rgba(12, 12, 14, 0.72)", boxOpacity: 0.72, borderW: 2, weight: "700" }
};

export function drawSubtitleOverlayOnFrame(ctx, fx, fy, frameW, frameH, subtitleState, tSec) {
  const cue = findActiveSubtitleCue(subtitleState, tSec);
  if (!cue) return null;

  const uppercase = Boolean(subtitleState.uppercase);
  const rawLines = sanitizeCanvasCaptionText(cue.text).slice(0, 3);
  const lines = uppercase ? rawLines.map((l) => l.toUpperCase()) : rawLines;
  if (lines.length === 0) return null;

  const styleId = subtitleState.style || "clean_white";
  const spec = CAPTION_CANVAS_STYLES[styleId] || CAPTION_CANVAS_STYLES.clean_white;
  const karaokeMode = subtitleState.karaoke_mode || "off";
  const hlColor = /^#[0-9a-fA-F]{6}$/.test(String(subtitleState.highlight_color || ""))
    ? subtitleState.highlight_color
    : "#ffe047";
  const refFontSize = Math.max(
    14,
    Math.min(72, Number.isFinite(Number(subtitleState.font_size)) ? Number(subtitleState.font_size) : 34)
  );
  const px = Math.max(10, Math.round(frameH * (refFontSize / 1080)));
  const marginBottomPct = Math.max(
    0.02,
    Math.min(0.45, Number.isFinite(Number(subtitleState.margin_bottom_pct)) ? Number(subtitleState.margin_bottom_pct) : 0.08)
  );
  const lineH = Math.round(px * 1.38);
  const maxTextW = Math.max(60, frameW * 0.86);

  ctx.save();
  ctx.font = `${spec.weight} ${px}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "middle";

  const fittedLines = lines.map((line) => fitCanvasText(ctx, line, maxTextW));
  const cx = fx + frameW * 0.5;
  const bottomY = fy + frameH * (1.0 - marginBottomPct);

  const wordTimings = karaokeMode !== "off" ? computeCueWordTimingsCanvas(cue, uppercase) : [];
  let activeWordIdx = -1;
  if (wordTimings.length > 0) {
    for (let wi = 0; wi < wordTimings.length; wi += 1) {
      if (tSec >= wordTimings[wi].start_s && tSec <= wordTimings[wi].end_s) {
        activeWordIdx = wi;
        break;
      }
    }
    if (activeWordIdx < 0 && tSec >= cue.start_s) {
      activeWordIdx = wordTimings.length - 1;
    }
  }

  let runningWordCursor = 0;

  for (let i = 0; i < fittedLines.length; i += 1) {
    const lineText = fittedLines[i];
    const distFromBottom = fittedLines.length - 1 - i;
    const lineY = bottomY - distFromBottom * lineH - lineH * 0.45;
    const measuredW = Math.min(maxTextW, ctx.measureText(lineText).width);

    if (spec.boxOpacity > 0) {
      const padX = Math.max(6, Math.round(px * (styleId === "boxed_social" || styleId === "social_karaoke" ? 0.48 : 0.34)));
      const padY = Math.max(3, Math.round(px * (styleId === "boxed_social" || styleId === "social_karaoke" ? 0.22 : 0.16)));
      const boxW = measuredW + padX * 2;
      const boxH = px + padY * 2;
      ctx.fillStyle = spec.boxColor;
      ctx.fillRect(cx - boxW / 2, lineY - boxH / 2, boxW, boxH);
    }

    if (karaokeMode === "off" || wordTimings.length === 0) {
      ctx.textAlign = "center";
      if (spec.borderW > 0) {
        ctx.lineWidth = Math.max(1.5, Math.round(px * (spec.borderW >= 2 ? 0.14 : 0.09)));
        ctx.strokeStyle = "rgba(0, 0, 0, 0.84)";
        ctx.strokeText(lineText, cx, lineY);
      }
      ctx.fillStyle = spec.fontColor;
      ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(lineText, cx, lineY);
      continue;
    }

    const lineWords = lineText.split(/\s+/).filter(Boolean);
    const spaceW = ctx.measureText(" ").width;
    const wordWidths = lineWords.map((w) => ctx.measureText(w).width);
    const totalLineW = wordWidths.reduce((a, b) => a + b, 0) + Math.max(0, lineWords.length - 1) * spaceW;
    let drawX = cx - totalLineW / 2;
    ctx.textAlign = "left";

    for (let wi = 0; wi < lineWords.length; wi += 1) {
      const wText = lineWords[wi];
      const wW = wordWidths[wi];
      const globalIdx = runningWordCursor;
      runningWordCursor += 1;

      const isActive = globalIdx === activeWordIdx;
      const isSpoken = karaokeMode === "progressive_fill" && globalIdx <= activeWordIdx;
      const drawY = karaokeMode === "color_pop" && isActive ? lineY - Math.max(1.5, px * 0.08) : lineY;

      if (karaokeMode === "pill_box" && isActive) {
        const pPadX = Math.max(4, Math.round(px * 0.22));
        const pPadY = Math.max(2, Math.round(px * 0.12));
        ctx.fillStyle = hlColor;
        ctx.fillRect(drawX - pPadX, drawY - px / 2 - pPadY, wW + pPadX * 2, px + pPadY * 2);
      }

      if (spec.borderW > 0 && !(karaokeMode === "pill_box" && isActive)) {
        ctx.lineWidth = Math.max(1.5, Math.round(px * (spec.borderW >= 2 ? 0.14 : 0.09)));
        ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
        ctx.strokeText(wText, drawX, drawY);
      }

      if (karaokeMode === "pill_box" && isActive) {
        ctx.fillStyle = "#141416";
        ctx.shadowColor = "transparent";
      } else if (isActive || isSpoken) {
        ctx.fillStyle = hlColor;
        ctx.shadowColor = "rgba(0, 0, 0, 0.88)";
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
      } else {
        ctx.fillStyle = spec.fontColor;
        ctx.shadowColor = "rgba(0, 0, 0, 0.82)";
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
      }

      ctx.fillText(wText, drawX, drawY);
      drawX += wW + spaceW;
    }
  }

  ctx.restore();
  return cue;
}

export function drawSafeAreaGuides(ctx, fx, fy, frameW, frameH, framingState) {
  const guides = framingState && framingState.guides ? framingState.guides : null;
  if (!guides || !guides.enabled) return;

  ctx.save();
  ctx.font = "700 8px ui-monospace, monospace";
  ctx.textBaseline = "top";

  if (guides.socialHud) {
    // Top Reels/TikTok UI bar dead zone (top 14%)
    const topH = frameH * 0.14;
    ctx.fillStyle = "rgba(248, 113, 113, 0.16)";
    ctx.fillRect(fx, fy, frameW, topH);
    ctx.strokeStyle = "rgba(248, 113, 113, 0.72)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(fx, fy + topH);
    ctx.lineTo(fx + frameW, fy + topH);
    ctx.stroke();

    // Bottom caption / audio / progress bar dead zone (bottom 22%)
    const botH = frameH * 0.22;
    const botY = fy + frameH - botH;
    ctx.fillStyle = "rgba(248, 113, 113, 0.18)";
    ctx.fillRect(fx, botY, frameW, botH);
    ctx.beginPath();
    ctx.moveTo(fx, botY);
    ctx.lineTo(fx + frameW, botY);
    ctx.stroke();

    // Right-side social action rail (16% width x 38% height above bottom HUD)
    const railW = frameW * 0.16;
    const railH = frameH * 0.38;
    const railX = fx + frameW - railW;
    const railY = botY - railH;
    ctx.fillStyle = "rgba(248, 113, 113, 0.15)";
    ctx.fillRect(railX, railY, railW, railH);
    ctx.strokeRect(railX, railY, railW, railH);
    ctx.setLineDash([]);

    // Subtle social icon pips inside action rail
    const pipX = railX + railW * 0.5;
    const pipR = Math.max(2, Math.min(4, railW * 0.2));
    ctx.fillStyle = "rgba(255, 180, 176, 0.55)";
    for (let i = 0; i < 4; i++) {
      const pipY = railY + railH * (0.2 + i * 0.21);
      ctx.beginPath();
      ctx.arc(pipX, pipY, pipR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dead zone labels
    ctx.fillStyle = "#ff9b96";
    ctx.textAlign = "right";
    const topLbl = fitCanvasText(ctx, "HUD TOP", Math.max(24, frameW * 0.42));
    if (topH >= 14) {
      ctx.fillText(topLbl, fx + frameW - 5, fy + topH - 11);
    }
    ctx.textAlign = "center";
    const botLbl = fitCanvasText(ctx, "REELS / TIKTOK HUD", Math.max(24, frameW - 8));
    if (botH >= 16) {
      ctx.fillText(botLbl, fx + frameW * 0.5, botY + Math.max(3, botH * 0.42));
    }
    ctx.textAlign = "left";
  }

  if (guides.actionSafe !== false) {
    const ax = fx + frameW * 0.05;
    const ay = fy + frameH * 0.05;
    const aw = frameW * 0.9;
    const ah = frameH * 0.9;
    ctx.strokeStyle = "rgba(104, 156, 255, 0.78)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.strokeRect(ax, ay, aw, ah);

    // Corner L-brackets
    const brk = Math.max(4, Math.min(10, aw * 0.08, ah * 0.08));
    ctx.strokeStyle = "#689cff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ax, ay + brk);
    ctx.lineTo(ax, ay);
    ctx.lineTo(ax + brk, ay);
    ctx.moveTo(ax + aw - brk, ay);
    ctx.lineTo(ax + aw, ay);
    ctx.lineTo(ax + aw, ay + brk);
    ctx.moveTo(ax, ay + ah - brk);
    ctx.lineTo(ax, ay + ah);
    ctx.lineTo(ax + brk, ay + ah);
    ctx.moveTo(ax + aw - brk, ay + ah);
    ctx.lineTo(ax + aw, ay + ah);
    ctx.lineTo(ax + aw, ay + ah - brk);
    ctx.stroke();

    if (aw >= 82) {
      ctx.fillStyle = "#8cb4ff";
      ctx.fillText("ACTION 90%", ax + 4, ay + 3);
    }
  }

  if (guides.titleSafe !== false) {
    const tx = fx + frameW * 0.1;
    const ty = fy + frameH * 0.1;
    const tw = frameW * 0.8;
    const th = frameH * 0.8;
    ctx.strokeStyle = "rgba(230, 132, 66, 0.86)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(tx, ty, tw, th);
    ctx.setLineDash([]);

    if (tw >= 72) {
      ctx.fillStyle = "#f4a46b";
      ctx.fillText("TITLE 80%", tx + 4, ty + 3);
    }
  }

  if (Number.isFinite(Number(guides.captionMarginPct))) {
    const mPct = Math.max(0.02, Math.min(0.45, Number(guides.captionMarginPct)));
    const capY = fy + frameH * (1 - mPct);
    ctx.strokeStyle = "rgba(0, 229, 255, 0.86)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(fx + frameW * 0.08, capY);
    ctx.lineTo(fx + frameW * 0.92, capY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#7cecff";
    ctx.fillText(`CAPTION BASELINE ${Math.round(mPct * 100)}%`, fx + frameW * 0.08, Math.max(fy + 4, capY - 11));
  }

  ctx.restore();
}

const REFRAME_ASPECT_MAP = {
  "16:9": 16 / 9,
  "9:16": 9 / 16,
  "4:5": 4 / 5,
  "1:1": 1,
  "2.39:1": 2.39
};

export function drawReframeOverlayOnFrame(ctx, fx, fy, frameW, frameH, reframeState) {
  if (!reframeState || !reframeState.enabled) return false;
  const ratioKey = String(reframeState.aspect_ratio || "source").trim().toLowerCase();
  const targetRatio = REFRAME_ASPECT_MAP[ratioKey];
  if (!targetRatio || !Number.isFinite(targetRatio) || targetRatio <= 0) return false;

  const panX = Math.max(-1, Math.min(1, Number(reframeState.pan_x ?? 0) || 0));
  const panY = Math.max(-1, Math.min(1, Number(reframeState.pan_y ?? 0) || 0));

  const frameAspect = frameW / Math.max(1, frameH);
  let cropW = frameW;
  let cropH = frameH;
  if (frameAspect > targetRatio) {
    cropH = frameH;
    cropW = Math.min(frameW, frameH * targetRatio);
  } else {
    cropW = frameW;
    cropH = Math.min(frameH, frameW / targetRatio);
  }
  const slackX = Math.max(0, frameW - cropW);
  const slackY = Math.max(0, frameH - cropH);
  const cropX = Math.max(fx, Math.min(fx + slackX, fx + slackX * 0.5 * (1 + panX)));
  const cropY = Math.max(fy, Math.min(fy + slackY, fy + slackY * 0.5 * (1 + panY)));

  ctx.save();
  // Semi-transparent outer crop mask
  ctx.fillStyle = "rgba(10, 10, 14, 0.58)";
  if (cropY > fy + 0.5) {
    ctx.fillRect(fx, fy, frameW, cropY - fy);
  }
  if (cropY + cropH < fy + frameH - 0.5) {
    ctx.fillRect(fx, cropY + cropH, frameW, fy + frameH - (cropY + cropH));
  }
  if (cropX > fx + 0.5) {
    ctx.fillRect(fx, cropY, cropX - fx, cropH);
  }
  if (cropX + cropW < fx + frameW - 0.5) {
    ctx.fillRect(cropX + cropW, cropY, fx + frameW - (cropX + cropW), cropH);
  }

  // Rule of thirds subtle guides inside crop region
  ctx.strokeStyle = "rgba(230, 132, 66, 0.34)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(cropX + cropW / 3, cropY);
  ctx.lineTo(cropX + cropW / 3, cropY + cropH);
  ctx.moveTo(cropX + (cropW * 2) / 3, cropY);
  ctx.lineTo(cropX + (cropW * 2) / 3, cropY + cropH);
  ctx.moveTo(cropX, cropY + cropH / 3);
  ctx.lineTo(cropX + cropW, cropY + cropH / 3);
  ctx.moveTo(cropX, cropY + (cropH * 2) / 3);
  ctx.lineTo(cropX + cropW, cropY + (cropH * 2) / 3);
  ctx.stroke();
  ctx.setLineDash([]);

  // Crisp amber reframe box + corner brackets
  ctx.strokeStyle = "rgba(230, 132, 66, 0.95)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cropX + 0.75, cropY + 0.75, Math.max(2, cropW - 1.5), Math.max(2, cropH - 1.5));

  const brk = Math.max(6, Math.min(12, Math.min(cropW, cropH) * 0.14));
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cropX, cropY + brk);
  ctx.lineTo(cropX, cropY);
  ctx.lineTo(cropX + brk, cropY);
  ctx.moveTo(cropX + cropW - brk, cropY);
  ctx.lineTo(cropX + cropW, cropY);
  ctx.lineTo(cropX + cropW, cropY + brk);
  ctx.moveTo(cropX, cropY + cropH - brk);
  ctx.lineTo(cropX, cropY + cropH);
  ctx.lineTo(cropX + brk, cropY + cropH);
  ctx.moveTo(cropX + cropW - brk, cropY + cropH);
  ctx.lineTo(cropX + cropW, cropY + cropH);
  ctx.lineTo(cropX + cropW, cropY + cropH - brk);
  ctx.stroke();

  // Ratio pill inside crop region
  const pillText = `REFRAME ${ratioKey.toUpperCase()}`;
  ctx.font = "700 9px ui-monospace, monospace";
  const pillW = Math.min(Math.max(36, cropW - 8), ctx.measureText(pillText).width + 10);
  ctx.fillStyle = "rgba(230, 132, 66, 0.92)";
  ctx.fillRect(cropX + 4, cropY + 4, pillW, 15);
  ctx.fillStyle = "#111114";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText(fitCanvasText(ctx, pillText, Math.max(16, pillW - 8)), cropX + 8, cropY + 7);

  ctx.restore();
  return true;
}

const FILM_GRAIN_PRESET_TAGS = {
  "35mm_fine": "35MM",
  "16mm_organic": "16MM",
  "super8_heavy": "SUPER 8",
  custom: "CUSTOM"
};

export function drawFilmGrainOverlayOnFrame(ctx, fx, fy, frameW, frameH, filmGrainState, playheadFrame = 0) {
  if (!filmGrainState || !filmGrainState.enabled) return false;
  const rawStrength = Number(filmGrainState.strength ?? 0);
  const strength = Number.isFinite(rawStrength) ? Math.max(0, Math.min(60, Math.round(rawStrength))) : 0;
  if (strength <= 0) return false;
  const presetKey = String(filmGrainState.preset || "35mm_fine").trim().toLowerCase();
  const presetTag = FILM_GRAIN_PRESET_TAGS[presetKey] || "35MM";
  const temporal = filmGrainState.temporal !== undefined ? Boolean(filmGrainState.temporal) : true;
  const norm = strength / 60;
  const particleCount = Math.max(40, Math.min(260, Math.round(40 + norm * 220)));
  const grainSize = presetKey === "super8_heavy" ? 2 : 1;

  let seed = (temporal ? (Math.floor(Number(playheadFrame) || 0) + 1) * 2654435761 : 1337) ^ (strength * 1597334677);
  seed = seed >>> 0;
  const nextRand = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  ctx.save();
  const alphaBase = 0.06 + norm * 0.22;
  for (let i = 0; i < particleCount; i += 1) {
    const px = fx + nextRand() * Math.max(1, frameW - grainSize);
    const py = fy + nextRand() * Math.max(1, frameH - grainSize);
    const bright = nextRand() > 0.5;
    const alpha = (alphaBase * (0.45 + nextRand() * 0.55)).toFixed(3);
    ctx.fillStyle = bright ? `rgba(255, 250, 240, ${alpha})` : `rgba(12, 12, 16, ${alpha})`;
    ctx.fillRect(px, py, grainSize, grainSize);
  }

  const label = `GRAIN ${presetTag} ${strength} ${temporal ? "T+U" : "U"}`;
  ctx.font = "700 9px ui-monospace, monospace";
  const pillW = Math.min(Math.max(48, frameW - 16), ctx.measureText(label).width + 10);
  const pillX = fx + frameW - pillW - 8;
  const pillY = fy + frameH - 23;
  ctx.fillStyle = "rgba(20, 20, 22, 0.86)";
  ctx.fillRect(pillX, pillY, pillW, 15);
  ctx.strokeStyle = "rgba(230, 132, 66, 0.72)";
  ctx.lineWidth = 1;
  ctx.strokeRect(pillX + 0.5, pillY + 0.5, Math.max(1, pillW - 1), 14);
  ctx.fillStyle = "#f4a46b";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText(fitCanvasText(ctx, label, Math.max(16, pillW - 8)), pillX + 5, pillY + 3);
  ctx.restore();
  return true;
}

const VIGNETTE_PRESET_TAGS = {
  subtle_cinema: "SUBTLE",
  moody_portrait: "MOODY",
  heavy_noir: "NOIR",
  custom: "CUSTOM"
};

export function drawCinematicVignetteOverlayOnFrame(ctx, fx, fy, frameW, frameH, vignetteState) {
  if (!vignetteState || !vignetteState.enabled) return false;
  const rawAngle = Number(vignetteState.angle_deg ?? 24.0);
  const angleDeg = Number.isFinite(rawAngle) ? Math.max(5.0, Math.min(75.0, rawAngle)) : 24.0;
  const mode = String(vignetteState.mode || "forward").trim().toLowerCase() === "backward"
    ? "backward"
    : "forward";
  const presetKey = String(vignetteState.preset || "subtle_cinema").trim().toLowerCase();
  const presetTag = VIGNETTE_PRESET_TAGS[presetKey] || "SUBTLE";
  const norm = (angleDeg - 5.0) / 70.0;

  const cx = fx + frameW * 0.5;
  const cy = fy + frameH * 0.5;
  const rOuter = Math.max(2, Math.hypot(frameW * 0.5, frameH * 0.5));
  const rInner = Math.max(1, rOuter * (0.58 - norm * 0.34));
  const edgeAlpha = Math.min(0.88, 0.22 + norm * 0.62);

  ctx.save();
  ctx.beginPath();
  ctx.rect(fx, fy, frameW, frameH);
  ctx.clip();

  const grad = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter);
  if (mode === "backward") {
    grad.addColorStop(0, "rgba(255, 250, 240, 0)");
    grad.addColorStop(0.55, `rgba(255, 250, 240, ${(edgeAlpha * 0.28).toFixed(3)})`);
    grad.addColorStop(1, `rgba(255, 250, 240, ${(edgeAlpha * 0.72).toFixed(3)})`);
  } else {
    grad.addColorStop(0, "rgba(0, 0, 0, 0)");
    grad.addColorStop(0.55, `rgba(0, 0, 0, ${(edgeAlpha * 0.36).toFixed(3)})`);
    grad.addColorStop(1, `rgba(0, 0, 0, ${edgeAlpha.toFixed(3)})`);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(fx, fy, frameW, frameH);

  const label = `VIG ${presetTag} ${angleDeg.toFixed(0)}deg ${mode === "backward" ? "BRIGHT" : "DARK"}`;
  ctx.font = "700 9px ui-monospace, monospace";
  const pillW = Math.min(Math.max(48, frameW - 16), ctx.measureText(label).width + 10);
  const pillX = fx + 8;
  const pillY = fy + frameH - 23;
  ctx.fillStyle = "rgba(20, 20, 22, 0.86)";
  ctx.fillRect(pillX, pillY, pillW, 15);
  ctx.strokeStyle = mode === "backward" ? "rgba(120, 195, 255, 0.72)" : "rgba(230, 132, 66, 0.72)";
  ctx.lineWidth = 1;
  ctx.strokeRect(pillX + 0.5, pillY + 0.5, Math.max(1, pillW - 1), 14);
  ctx.fillStyle = mode === "backward" ? "#8ad0ff" : "#f4a46b";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText(fitCanvasText(ctx, label, Math.max(16, pillW - 8)), pillX + 5, pillY + 3);
  ctx.restore();
  return true;
}

function drawTransparencyCheckerboard(ctx, x, y, w, h, tile = 10) {
  ctx.fillStyle = "#1f1f24";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#2b2b33";
  const cols = Math.ceil(w / tile);
  const rows = Math.ceil(h / tile);
  for (let r = 0; r < rows; r += 1) {
    const ty = y + r * tile;
    const th = Math.min(tile, y + h - ty);
    for (let c = r % 2; c < cols; c += 2) {
      const tx = x + c * tile;
      const tw = Math.min(tile, x + w - tx);
      ctx.fillRect(tx, ty, tw, th);
    }
  }
}

function drawStudioKeyerPlate(targetCtx, w, h, doc, playheadFrame, cdl, activeClips, ckState) {
  const isBlueScreen =
    ckState &&
    (ckState.preset === "chroma_blue" ||
      (ckState.preset === "custom" && ckState.despill_type === "blue"));
  const baseRgb = isBlueScreen ? [0 / 255, 71 / 255, 187 / 255] : [0 / 255, 177 / 255, 64 / 255];
  const hiRgb = isBlueScreen ? [20 / 255, 92 / 255, 208 / 255] : [18 / 255, 198 / 255, 84 / 255];
  const loRgb = isBlueScreen ? [0 / 255, 52 / 255, 146 / 255] : [0 / 255, 140 / 255, 50 / 255];

  const cCenter = applyGradeOrCdlRgb(hiRgb[0], hiRgb[1], hiRgb[2], cdl);
  const cMid = applyGradeOrCdlRgb(baseRgb[0], baseRgb[1], baseRgb[2], cdl);
  const cEdge = applyGradeOrCdlRgb(loRgb[0], loRgb[1], loRgb[2], cdl);

  const bgGrad = targetCtx.createRadialGradient(w * 0.5, h * 0.44, Math.min(w, h) * 0.08, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
  bgGrad.addColorStop(0, toCssRgb(cCenter[0], cCenter[1], cCenter[2]));
  bgGrad.addColorStop(0.55, toCssRgb(cMid[0], cMid[1], cMid[2]));
  bgGrad.addColorStop(1, toCssRgb(cEdge[0], cEdge[1], cEdge[2]));
  targetCtx.fillStyle = bgGrad;
  targetCtx.fillRect(0, 0, w, h);

  // Subtle green/blue screen studio tracking markers (+)
  const markerRgb = isBlueScreen ? [0.16, 0.45, 0.85] : [0.12, 0.82, 0.36];
  targetCtx.strokeStyle = toCssRgb(markerRgb[0], markerRgb[1], markerRgb[2]);
  targetCtx.lineWidth = 1.5;
  const markers = [
    [0.16, 0.24],
    [0.84, 0.24],
    [0.16, 0.74],
    [0.84, 0.74]
  ];
  for (const [mx, my] of markers) {
    const px = w * mx;
    const py = h * my;
    targetCtx.beginPath();
    targetCtx.moveTo(px - 6, py);
    targetCtx.lineTo(px + 6, py);
    targetCtx.moveTo(px, py - 6);
    targetCtx.lineTo(px, py + 6);
    targetCtx.stroke();
  }

  // Subtle green/blue rim spill halo around subject to demonstrate despill toggle
  const cx = w * 0.5;
  const cy = h * 0.56;
  const spillColor = isBlueScreen ? "rgba(56, 128, 255, 0.85)" : "rgba(44, 214, 96, 0.85)";
  const headR = Math.max(14, Math.min(w, h) * 0.145);
  const headY = h * 0.36;
  const shoulderW = Math.max(44, w * 0.24);
  const shoulderTop = headY + headR * 0.88;

  // Spill edge glow on shoulders and head rim
  targetCtx.save();
  targetCtx.strokeStyle = spillColor;
  targetCtx.lineWidth = Math.max(4, Math.round(h * 0.028));
  targetCtx.beginPath();
  targetCtx.moveTo(cx - shoulderW, h);
  targetCtx.quadraticCurveTo(cx - shoulderW * 0.92, shoulderTop, cx, shoulderTop - 4);
  targetCtx.quadraticCurveTo(cx + shoulderW * 0.92, shoulderTop, cx + shoulderW, h);
  targetCtx.stroke();
  targetCtx.beginPath();
  targetCtx.arc(cx, headY, headR + 1.5, 0, Math.PI * 2);
  targetCtx.stroke();
  targetCtx.restore();

  // Foreground studio talent silhouette (wardrobe + skin + warm studio keylight)
  const jacketGrad = targetCtx.createLinearGradient(cx - shoulderW, shoulderTop, cx + shoulderW, h);
  jacketGrad.addColorStop(0, "#2b2f3a");
  jacketGrad.addColorStop(0.55, "#1f222b");
  jacketGrad.addColorStop(1, "#16181f");
  targetCtx.fillStyle = jacketGrad;
  targetCtx.beginPath();
  targetCtx.moveTo(cx - shoulderW, h);
  targetCtx.quadraticCurveTo(cx - shoulderW * 0.92, shoulderTop, cx, shoulderTop - 4);
  targetCtx.quadraticCurveTo(cx + shoulderW * 0.92, shoulderTop, cx + shoulderW, h);
  targetCtx.closePath();
  targetCtx.fill();

  // Crisp studio shirt V-collar
  targetCtx.fillStyle = "#e6e8ee";
  targetCtx.beginPath();
  targetCtx.moveTo(cx - headR * 0.55, shoulderTop + 2);
  targetCtx.lineTo(cx, shoulderTop + headR * 1.1);
  targetCtx.lineTo(cx + headR * 0.55, shoulderTop + 2);
  targetCtx.closePath();
  targetCtx.fill();

  // Neck + Head
  targetCtx.fillStyle = "#c98b68";
  targetCtx.fillRect(cx - headR * 0.34, headY + headR * 0.65, headR * 0.68, headR * 0.55);

  const skinGrad = targetCtx.createRadialGradient(
    cx - headR * 0.25,
    headY - headR * 0.25,
    2,
    cx,
    headY,
    headR
  );
  skinGrad.addColorStop(0, "#e5b08f");
  skinGrad.addColorStop(0.7, "#cc8f6d");
  skinGrad.addColorStop(1, "#a36b4f");
  targetCtx.fillStyle = skinGrad;
  targetCtx.beginPath();
  targetCtx.arc(cx, headY, headR, 0, Math.PI * 2);
  targetCtx.fill();

  // Hair cap
  targetCtx.fillStyle = "#262122";
  targetCtx.beginPath();
  targetCtx.arc(cx, headY - headR * 0.14, headR * 1.02, Math.PI * 1.02, Math.PI * 1.98);
  targetCtx.quadraticCurveTo(cx, headY - headR * 0.45, cx - headR * 1.02, headY - headR * 0.1);
  targetCtx.fill();
}

function applyChromaKeyOnBuffer(bctx, bw, bh, ckState, matteView) {
  const [kr, kg, kb] = hexToRgbTuple(ckState.key_color || "#00b140");
  const sim = Math.max(0.01, Math.min(0.8, Number(ckState.similarity ?? 0.18)));
  const blend = Math.max(0.0, Math.min(0.5, Number(ckState.blend ?? 0.08)));
  const despill = Boolean(ckState.despill);
  const despillType = ckState.despill_type === "blue" ? "blue" : "green";
  const isAlphaMatte = matteView === "alpha_matte";
  const maxDist = 441.6729559300637;

  const img = bctx.getImageData(0, 0, bw, bh);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const dist = Math.hypot(r - kr, g - kg, b - kb) / maxDist;
    let alpha = 255;
    if (dist <= sim) {
      alpha = 0;
    } else if (blend > 1e-5 && dist < sim + blend) {
      alpha = Math.max(0, Math.min(255, Math.round(((dist - sim) / blend) * 255)));
    }
    if (despill && alpha > 0) {
      if (despillType === "green") {
        const limit = Math.max(r, b) * 0.55 + ((r + b) * 0.5) * 0.45;
        if (g > limit) {
          g = Math.round(g - (g - limit) * 0.85);
        }
      } else {
        const limit = Math.max(r, g) * 0.55 + ((r + g) * 0.5) * 0.45;
        if (b > limit) {
          b = Math.round(b - (b - limit) * 0.85);
        }
      }
    }
    if (isAlphaMatte) {
      data[i] = alpha;
      data[i + 1] = alpha;
      data[i + 2] = alpha;
      data[i + 3] = 255;
    } else {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = alpha;
    }
  }
  bctx.putImageData(img, 0, 0);
}

function drawFramedBaseScene(targetCtx, bufW, bufH, doc, playheadFrame, cdl, clips, framingMode, srcAspect, targetAspect, ckState = null) {
  const renderSceneLayer = (layerClips, allowKeyerPlate) => {
    if (allowKeyerPlate && ckState && ckState.enabled) {
      drawStudioKeyerPlate(targetCtx, bufW, bufH, doc, playheadFrame, cdl, layerClips, ckState);
      return;
    }
    if (framingMode === "fit" && Math.abs(targetAspect - srcAspect) > 0.015) {
      targetCtx.fillStyle = "#000000";
      targetCtx.fillRect(0, 0, bufW, bufH);
      let innerW = bufW;
      let innerH = innerW / srcAspect;
      if (innerH > bufH) {
        innerH = bufH;
        innerW = innerH * srcAspect;
      }
      const ix = Math.floor((bufW - innerW) / 2);
      const iy = Math.floor((bufH - innerH) / 2);
      targetCtx.save();
      targetCtx.beginPath();
      targetCtx.rect(ix, iy, innerW, innerH);
      targetCtx.clip();
      targetCtx.translate(ix, iy);
      drawBaseProgramScene(targetCtx, innerW, innerH, doc, playheadFrame, cdl, layerClips);
      targetCtx.restore();
      return;
    }
    drawBaseProgramScene(targetCtx, bufW, bufH, doc, playheadFrame, cdl, layerClips);
  };

  if (!Array.isArray(clips) || clips.length === 0) {
    renderSceneLayer([], true);
    return;
  }

  targetCtx.fillStyle = "#000000";
  targetCtx.fillRect(0, 0, bufW, bufH);

  const fpsRate = doc && doc.fps ? Math.max(1, doc.fps.num / Math.max(1, doc.fps.den)) : 25;
  for (let idx = 0; idx < clips.length; idx += 1) {
    const layer = clips[idx];
    const isTop = idx === clips.length - 1;
    const clipLocalTimeS =
      layer && layer.clip
        ? Math.max(0, (playheadFrame - (layer.clip.start_frame || 0)) / fpsRate)
        : 0;
    const tf = evaluateClipTransformAtTime(layer && layer.clip ? layer.clip : null, clipLocalTimeS);
    const fadeEnv =
      layer && layer.clip ? evaluateClipFadeEnvelope(layer.clip, playheadFrame, fpsRate) : 1.0;
    const alpha = clamp01((tf.opacity_pct / 100.0) * fadeEnv);
    if (alpha <= 0.0001) {
      continue;
    }

    const hasDve = hasClipDveStyling(tf);
    const hasActiveTf =
      !isClipTransformIdentity(layer && layer.clip ? layer.clip : null) ||
      Math.abs(tf.zoom_pct - 100.0) > 1e-4 ||
      Math.abs(tf.pos_x_pct) > 1e-4 ||
      Math.abs(tf.pos_y_pct) > 1e-4 ||
      Math.abs(tf.rotation_deg) > 1e-4 ||
      hasDve;

    if (!hasDve) {
      targetCtx.save();
      targetCtx.beginPath();
      targetCtx.rect(0, 0, bufW, bufH);
      targetCtx.clip();
      targetCtx.globalAlpha *= alpha;

      if (hasActiveTf) {
        const cx = bufW * 0.5 + (tf.pos_x_pct / 100.0) * bufW;
        const cy = bufH * 0.5 + (tf.pos_y_pct / 100.0) * bufH;
        targetCtx.translate(cx, cy);
        if (Math.abs(tf.rotation_deg) > 1e-4) {
          targetCtx.rotate((tf.rotation_deg * Math.PI) / 180.0);
        }
        const scale = tf.zoom_pct / 100.0;
        if (Math.abs(scale - 1.0) > 1e-4) {
          targetCtx.scale(scale, scale);
        }
        targetCtx.translate(-bufW * 0.5, -bufH * 0.5);
      }

      renderSceneLayer(clips.slice(0, idx + 1), isTop);
      targetCtx.restore();
      continue;
    }

    _dveLayerScratch = ensureScratchCanvas(_dveLayerScratch, bufW, bufH);
    if (!_dveLayerScratch) {
      targetCtx.save();
      targetCtx.globalAlpha *= alpha;
      renderSceneLayer(clips.slice(0, idx + 1), isTop);
      targetCtx.restore();
      continue;
    }
    const lctx = _dveLayerScratch.getContext("2d");
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, bufW, bufH);
    if (isTop && ckState && ckState.enabled) {
      drawStudioKeyerPlate(lctx, bufW, bufH, doc, playheadFrame, cdl, clips.slice(0, idx + 1), ckState);
    } else if (framingMode === "fit" && Math.abs(targetAspect - srcAspect) > 0.015) {
      lctx.fillStyle = "#000000";
      lctx.fillRect(0, 0, bufW, bufH);
      let innerW = bufW;
      let innerH = innerW / srcAspect;
      if (innerH > bufH) {
        innerH = bufH;
        innerW = innerH * srcAspect;
      }
      const ix = Math.floor((bufW - innerW) / 2);
      const iy = Math.floor((bufH - innerH) / 2);
      lctx.save();
      lctx.beginPath();
      lctx.rect(ix, iy, innerW, innerH);
      lctx.clip();
      lctx.translate(ix, iy);
      drawBaseProgramScene(lctx, innerW, innerH, doc, playheadFrame, cdl, clips.slice(0, idx + 1));
      lctx.restore();
    } else {
      drawBaseProgramScene(lctx, bufW, bufH, doc, playheadFrame, cdl, clips.slice(0, idx + 1));
    }

    const cl = (tf.crop_left_pct || 0) / 100.0;
    const cr = (tf.crop_right_pct || 0) / 100.0;
    const ct = (tf.crop_top_pct || 0) / 100.0;
    const cb = (tf.crop_bottom_pct || 0) / 100.0;
    const sx = bufW * cl;
    const sy = bufH * ct;
    const sw = Math.max(2, bufW * Math.max(0.15, 1.0 - cl - cr));
    const sh = Math.max(2, bufH * Math.max(0.15, 1.0 - ct - cb));
    const scale = tf.zoom_pct / 100.0;
    const dstW = sw * scale;
    const dstH = sh * scale;
    const resScale = bufW / 1280.0;

    let drawSource = _dveLayerScratch;
    let drawSx = sx;
    let drawSy = sy;
    let drawSw = sw;
    let drawSh = sh;

    if (tf.border_feather_px >= 1.0) {
      const tileW = Math.max(4, Math.round(dstW));
      const tileH = Math.max(4, Math.round(dstH));
      _dveTileScratch = ensureScratchCanvas(_dveTileScratch, tileW, tileH);
      if (_dveTileScratch) {
        const tctx = _dveTileScratch.getContext("2d");
        tctx.setTransform(1, 0, 0, 1, 0, 0);
        tctx.clearRect(0, 0, tileW, tileH);
        tctx.drawImage(_dveLayerScratch, sx, sy, sw, sh, 0, 0, tileW, tileH);
        const fPx = Math.max(2, Math.min(tileW * 0.25, tileH * 0.25, tf.border_feather_px * resScale));
        tctx.save();
        tctx.globalCompositeOperation = "destination-in";
        const gTop = tctx.createLinearGradient(0, 0, 0, fPx);
        gTop.addColorStop(0, "rgba(0,0,0,0)");
        gTop.addColorStop(1, "rgba(0,0,0,1)");
        tctx.fillStyle = gTop;
        tctx.fillRect(0, 0, tileW, fPx);

        const gBot = tctx.createLinearGradient(0, tileH - fPx, 0, tileH);
        gBot.addColorStop(0, "rgba(0,0,0,1)");
        gBot.addColorStop(1, "rgba(0,0,0,0)");
        tctx.fillStyle = gBot;
        tctx.fillRect(0, tileH - fPx, tileW, fPx);

        const gLeft = tctx.createLinearGradient(0, 0, fPx, 0);
        gLeft.addColorStop(0, "rgba(0,0,0,0)");
        gLeft.addColorStop(1, "rgba(0,0,0,1)");
        tctx.fillStyle = gLeft;
        tctx.fillRect(0, 0, fPx, tileH);

        const gRight = tctx.createLinearGradient(tileW - fPx, 0, tileW, 0);
        gRight.addColorStop(0, "rgba(0,0,0,1)");
        gRight.addColorStop(1, "rgba(0,0,0,0)");
        tctx.fillStyle = gRight;
        tctx.fillRect(tileW - fPx, 0, fPx, tileH);
        tctx.restore();

        drawSource = _dveTileScratch;
        drawSx = 0;
        drawSy = 0;
        drawSw = tileW;
        drawSh = tileH;
      }
    }

    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.rect(0, 0, bufW, bufH);
    targetCtx.clip();
    targetCtx.globalAlpha *= alpha;

    const cx = bufW * 0.5 + (tf.pos_x_pct / 100.0) * bufW;
    const cy = bufH * 0.5 + (tf.pos_y_pct / 100.0) * bufH;
    targetCtx.translate(cx, cy);
    if (Math.abs(tf.rotation_deg) > 1e-4) {
      targetCtx.rotate((tf.rotation_deg * Math.PI) / 180.0);
    }

    if (tf.shadow_opacity_pct > 1e-4) {
      const [sr, sg, sb] = hexToRgbTuple(tf.shadow_color || "#000000");
      targetCtx.save();
      targetCtx.shadowColor = `rgba(${sr}, ${sg}, ${sb}, ${(tf.shadow_opacity_pct / 100.0).toFixed(3)})`;
      targetCtx.shadowBlur = Math.max(0, (tf.shadow_blur_px || 0) * resScale);
      targetCtx.shadowOffsetX = (tf.shadow_offset_x_px || 0) * resScale;
      targetCtx.shadowOffsetY = (tf.shadow_offset_y_px || 0) * resScale;
      targetCtx.drawImage(drawSource, drawSx, drawSy, drawSw, drawSh, -dstW * 0.5, -dstH * 0.5, dstW, dstH);
      targetCtx.restore();
    } else {
      targetCtx.drawImage(drawSource, drawSx, drawSy, drawSw, drawSh, -dstW * 0.5, -dstH * 0.5, dstW, dstH);
    }

    if (tf.border_width_px >= 0.5) {
      const bw = Math.max(1, tf.border_width_px * resScale);
      targetCtx.strokeStyle = tf.border_color || "#ffffff";
      targetCtx.lineWidth = bw;
      if (!hasClipDveCrop(tf) && tf.zoom_pct >= 99.9) {
        targetCtx.strokeRect(-dstW * 0.5 + bw * 0.5, -dstH * 0.5 + bw * 0.5, dstW - bw, dstH - bw);
      } else {
        targetCtx.strokeRect(-dstW * 0.5 - bw * 0.5, -dstH * 0.5 - bw * 0.5, dstW + bw, dstH + bw);
      }
    }

    targetCtx.restore();
  }
}

function computeUnitSquareHomography(p0, p1, p2, p3) {
  const dx1 = p1.x - p3.x;
  const dy1 = p1.y - p3.y;
  const dx2 = p2.x - p3.x;
  const dy2 = p2.y - p3.y;
  const dx3 = p0.x - p1.x - p2.x + p3.x;
  const dy3 = p0.y - p1.y - p2.y + p3.y;
  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) < 1e-8) return null;
  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const h = (dx1 * dy3 - dx3 * dy1) / det;
  const a = p1.x - p0.x + g * p1.x;
  const b = p2.x - p0.x + h * p2.x;
  const c = p0.x;
  const d = p1.y - p0.y + g * p1.y;
  const e = p2.y - p0.y + h * p2.y;
  const f = p0.y;
  return [a, b, c, d, e, f, g, h];
}

function evalHomography(H, u, v) {
  if (!H) return null;
  const w = H[6] * u + H[7] * v + 1;
  if (Math.abs(w) < 1e-6) return null;
  return {
    x: (H[0] * u + H[1] * v + H[2]) / w,
    y: (H[3] * u + H[4] * v + H[5]) / w
  };
}

function drawTexturedTriangle(ctx, img, s0, s1, s2, d0, d1, d2) {
  const denom = (s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y);
  if (Math.abs(denom) < 1e-6) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0.x, d0.y);
  ctx.lineTo(d1.x, d1.y);
  ctx.lineTo(d2.x, d2.y);
  ctx.closePath();
  ctx.clip();

  const m11 = ((d1.x - d0.x) * (s2.y - s0.y) - (d2.x - d0.x) * (s1.y - s0.y)) / denom;
  const m12 = ((d2.x - d0.x) * (s1.x - s0.x) - (d1.x - d0.x) * (s2.x - s0.x)) / denom;
  const m21 = ((d1.y - d0.y) * (s2.y - s0.y) - (d2.y - d0.y) * (s1.y - s0.y)) / denom;
  const m22 = ((d2.y - d0.y) * (s1.x - s0.x) - (d1.y - d0.y) * (s2.x - s0.x)) / denom;
  const dx = d0.x - m11 * s0.x - m12 * s0.y;
  const dy = d0.y - m21 * s0.x - m22 * s0.y;
  ctx.transform(m11, m21, m12, m22, dx, dy);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

function drawPerspectiveWarpedBuffer(ctx, buf, bw, bh, fx, fy, frameW, frameH, pins, mode) {
  const toDstPt = (pt) => ({ x: fx + pt.x * frameW, y: fy + pt.y * frameH });
  const toSrcPt = (pt) => ({
    x: Math.max(0, Math.min(bw, pt.x * bw)),
    y: Math.max(0, Math.min(bh, pt.y * bh))
  });
  const gridN = 8;
  const isRectify = mode === "rectify_perspective";
  const H = isRectify
    ? computeUnitSquareHomography(
        toSrcPt(pins.tl),
        toSrcPt(pins.tr),
        toSrcPt(pins.bl),
        toSrcPt(pins.br)
      )
    : computeUnitSquareHomography(
        toDstPt(pins.tl),
        toDstPt(pins.tr),
        toDstPt(pins.bl),
        toDstPt(pins.br)
      );

  if (!H) {
    ctx.drawImage(buf, fx, fy, frameW, frameH);
    return;
  }

  for (let iy = 0; iy < gridN; iy += 1) {
    const v0 = iy / gridN;
    const v1 = (iy + 1) / gridN;
    for (let ix = 0; ix < gridN; ix += 1) {
      const u0 = ix / gridN;
      const u1 = (ix + 1) / gridN;
      const cornersUv = [
        [u0, v0],
        [u1, v0],
        [u0, v1],
        [u1, v1]
      ];
      const srcPts = cornersUv.map(([u, v]) =>
        isRectify
          ? evalHomography(H, u, v) || { x: u * bw, y: v * bh }
          : { x: u * bw, y: v * bh }
      );
      const dstPts = cornersUv.map(([u, v]) =>
        isRectify
          ? { x: fx + u * frameW, y: fy + v * frameH }
          : evalHomography(H, u, v) || { x: fx + u * frameW, y: fy + v * frameH }
      );
      drawTexturedTriangle(ctx, buf, srcPts[0], srcPts[1], srcPts[2], dstPts[0], dstPts[1], dstPts[2]);
      drawTexturedTriangle(ctx, buf, srcPts[1], srcPts[3], srcPts[2], dstPts[1], dstPts[3], dstPts[2]);
    }
  }
}

export function drawPlanarTrackerOverlay(ctx, fx, fy, frameW, frameH, trackerState, playheadFrame) {
  const norm = normalizePlanarTrackerClient(trackerState);
  const pins = evaluateCornerPinsClient(norm, playheadFrame);
  const toCanvas = (pt) => ({ x: fx + pt.x * frameW, y: fy + pt.y * frameH });
  const cTl = toCanvas(pins.tl);
  const cTr = toCanvas(pins.tr);
  const cBl = toCanvas(pins.bl);
  const cBr = toCanvas(pins.br);

  ctx.save();
  // Draw 4-corner planar quad + 3x3 internal perspective grid
  if (norm.mode !== "point_track_only") {
    ctx.strokeStyle = "rgba(230, 132, 66, 0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (let i = 1; i <= 2; i += 1) {
      const f = i / 3;
      ctx.beginPath();
      ctx.moveTo(cTl.x + (cTr.x - cTl.x) * f, cTl.y + (cTr.y - cTl.y) * f);
      ctx.lineTo(cBl.x + (cBr.x - cBl.x) * f, cBl.y + (cBr.y - cBl.y) * f);
      ctx.moveTo(cTl.x + (cBl.x - cTl.x) * f, cTl.y + (cBl.y - cTl.y) * f);
      ctx.lineTo(cTr.x + (cBr.x - cTr.x) * f, cTr.y + (cBr.y - cTr.y) * f);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.strokeStyle = "rgba(230, 132, 66, 0.92)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cTl.x, cTl.y);
    ctx.lineTo(cTr.x, cTr.y);
    ctx.lineTo(cBr.x, cBr.y);
    ctx.lineTo(cBl.x, cBl.y);
    ctx.closePath();
    ctx.stroke();

    const pinItems = [
      { id: "tl", label: "TL", pt: cTl },
      { id: "tr", label: "TR", pt: cTr },
      { id: "bl", label: "BL", pt: cBl },
      { id: "br", label: "BR", pt: cBr }
    ];
    ctx.font = "700 9px ui-monospace, monospace";
    for (const item of pinItems) {
      ctx.fillStyle = "#141416";
      ctx.strokeStyle = "#e68442";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(item.pt.x, item.pt.y, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f4a46b";
      ctx.fillText(item.label, item.pt.x + 7, item.pt.y + 3);
    }
  }

  // Draw 2D motion spline across tracked keyframes
  const kfs = norm.track_keyframes || [];
  if (kfs.length >= 2) {
    ctx.strokeStyle = "rgba(104, 156, 255, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    kfs.forEach((kf, idx) => {
      const px = fx + kf.x * frameW;
      const py = fy + kf.y * frameH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    ctx.fillStyle = "rgba(104, 156, 255, 0.95)";
    for (let i = 0; i < kfs.length; i += Math.max(1, Math.floor(kfs.length / 20))) {
      const px = fx + kfs[i].x * frameW;
      const py = fy + kfs[i].y * frameH;
      ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
    }
  }

  // Draw active 2D track point pattern + search reticle
  const trkPt = evaluateTrackPointClient(norm, playheadFrame);
  const ax = fx + trkPt.x * frameW;
  const ay = fy + trkPt.y * frameH;
  const boxHalfW = Math.max(8, frameW * norm.track_box_pct * 0.5);
  const boxHalfH = Math.max(8, frameH * norm.track_box_pct * 0.5);
  ctx.strokeStyle = "rgba(63, 185, 80, 0.92)";
  ctx.lineWidth = 1.4;
  ctx.strokeRect(ax - boxHalfW, ay - boxHalfH, boxHalfW * 2, boxHalfH * 2);

  ctx.strokeStyle = "rgba(104, 156, 255, 0.55)";
  ctx.setLineDash([3, 2]);
  ctx.strokeRect(ax - boxHalfW * 1.65, ay - boxHalfH * 1.65, boxHalfW * 3.3, boxHalfH * 3.3);
  ctx.setLineDash([]);

  ctx.strokeStyle = "#3fb950";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ax - 7, ay);
  ctx.lineTo(ax + 7, ay);
  ctx.moveTo(ax, ay - 7);
  ctx.lineTo(ax, ay + 7);
  ctx.stroke();

  ctx.restore();
  return {
    fx,
    fy,
    frameW,
    frameH,
    mode: norm.mode,
    handles: {
      tl: cTl,
      tr: cTr,
      bl: cBl,
      br: cBr,
      anchor: { x: ax, y: ay }
    }
  };
}

let _trackerScratchCanvas = null;

export function trackPointSequenceCanvas(doc, cdl, framingState, anchorX, anchorY, boxPct, frameList) {
  if (!Array.isArray(frameList) || frameList.length === 0) return [];
  const w = 240;
  const h = 135;
  _trackerScratchCanvas = ensureScratchCanvas(_trackerScratchCanvas, w, h);
  if (!_trackerScratchCanvas) return [];
  const ctx = _trackerScratchCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  const aspectSpec = getAspectRatioPreset(
    framingState && framingState.aspectPreset ? framingState.aspectPreset : "16:9"
  );
  const framingMode = framingState && framingState.framingMode === "fit" ? "fit" : "fill";
  const targetAspect = aspectSpec.width / aspectSpec.height;
  const srcAspect = doc && doc.width > 0 && doc.height > 0 ? doc.width / doc.height : 16 / 9;

  const sampleGray = (frameNum) => {
    const activeClips = [];
    if (doc && doc.tracks) {
      for (const trk of doc.tracks) {
        if (trk.kind !== "video") continue;
        for (const c of trk.clips || []) {
          if (frameNum >= c.start_frame && frameNum < c.start_frame + c.duration_frames) {
            activeClips.push({ track: `V${trk.index}`, clip: c });
          }
        }
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    drawFramedBaseScene(
      ctx,
      w,
      h,
      doc,
      frameNum,
      cdl,
      activeClips,
      framingMode,
      srcAspect,
      targetAspect,
      null
    );
    const img = ctx.getImageData(0, 0, w, h).data;
    const gray = new Uint8Array(w * h);
    for (let i = 0, p = 0; i < img.length; i += 4, p += 1) {
      gray[p] = Math.round(0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2]);
    }
    return gray;
  };

  const halfW = Math.max(3, Math.round(w * Math.max(0.04, Math.min(0.35, boxPct)) * 0.5));
  const halfH = Math.max(3, Math.round(h * Math.max(0.04, Math.min(0.35, boxPct)) * 0.5));
  const rad = 18;
  let curPx = Math.max(0.02, Math.min(0.98, anchorX)) * w;
  let curPy = Math.max(0.02, Math.min(0.98, anchorY)) * h;
  let prevGray = sampleGray(frameList[0]);

  const results = [
    {
      frame: Math.max(0, Math.round(frameList[0])),
      x: Number((curPx / w).toFixed(5)),
      y: Number((curPy / h).toFixed(5)),
      confidence: 1.0
    }
  ];

  for (let idx = 1; idx < frameList.length; idx += 1) {
    const fNum = Math.max(0, Math.round(frameList[idx]));
    const currGray = sampleGray(fNum);
    const cxI = Math.max(halfW, Math.min(w - 1 - halfW, Math.round(curPx)));
    const cyI = Math.max(halfH, Math.min(h - 1 - halfH, Math.round(curPy)));

    const tpl = [];
    let tplSum = 0;
    for (let dyT = -halfH; dyT <= halfH; dyT += 1) {
      const rowOff = (cyI + dyT) * w;
      for (let dxT = -halfW; dxT <= halfW; dxT += 1) {
        const v = prevGray[rowOff + cxI + dxT];
        tpl.push(v);
        tplSum += v;
      }
    }
    const tplMean = tplSum / Math.max(1, tpl.length);
    let tplVar = 0;
    for (let k = 0; k < tpl.length; k += 1) {
      const d = tpl[k] - tplMean;
      tplVar += d * d;
    }

    const minDx = Math.max(halfW - cxI, -rad);
    const maxDx = Math.min(w - 1 - halfW - cxI, rad);
    const minDy = Math.max(halfH - cyI, -rad);
    const maxDy = Math.min(h - 1 - halfH - cyI, rad);

    let bestSsd = Number.POSITIVE_INFINITY;
    let bestOx = 0;
    let bestOy = 0;
    const ssdMap = new Map();

    for (let oy = minDy; oy <= maxDy; oy += 1) {
      for (let ox = minDx; ox <= maxDx; ox += 1) {
        let ssd = 0;
        let k = 0;
        const baseY = cyI + oy;
        const baseX = cxI + ox;
        for (let dyT = -halfH; dyT <= halfH; dyT += 1) {
          const rowOff = (baseY + dyT) * w + baseX;
          for (let dxT = -halfW; dxT <= halfW; dxT += 1) {
            const diff = currGray[rowOff + dxT] - tpl[k];
            ssd += diff * diff;
            k += 1;
          }
        }
        ssdMap.set(`${ox},${oy}`, ssd);
        if (ssd < bestSsd) {
          bestSsd = ssd;
          bestOx = ox;
          bestOy = oy;
        }
      }
    }

    let subX = 0;
    let subY = 0;
    if (ssdMap.has(`${bestOx - 1},${bestOy}`) && ssdMap.has(`${bestOx + 1},${bestOy}`)) {
      const sL = ssdMap.get(`${bestOx - 1},${bestOy}`);
      const sC = ssdMap.get(`${bestOx},${bestOy}`);
      const sR = ssdMap.get(`${bestOx + 1},${bestOy}`);
      const denomX = 2 * (sL - 2 * sC + sR);
      if (Math.abs(denomX) > 1e-6) subX = Math.max(-0.5, Math.min(0.5, (sL - sR) / denomX));
    }
    if (ssdMap.has(`${bestOx},${bestOy - 1}`) && ssdMap.has(`${bestOx},${bestOy + 1}`)) {
      const sU = ssdMap.get(`${bestOx},${bestOy - 1}`);
      const sC = ssdMap.get(`${bestOx},${bestOy}`);
      const sD = ssdMap.get(`${bestOx},${bestOy + 1}`);
      const denomY = 2 * (sU - 2 * sC + sD);
      if (Math.abs(denomY) > 1e-6) subY = Math.max(-0.5, Math.min(0.5, (sU - sD) / denomY));
    }

    curPx = Math.max(2, Math.min(w - 2, cxI + bestOx + subX));
    curPy = Math.max(2, Math.min(h - 2, cyI + bestOy + subY));
    const normDenom = Math.max(tplVar, tpl.length * 225.0);
    const conf = Math.max(0, Math.min(1, 1.0 - bestSsd / normDenom));
    results.push({
      frame: fNum,
      x: Number((curPx / w).toFixed(5)),
      y: Number((curPy / h).toFixed(5)),
      confidence: Number(conf.toFixed(4))
    });
    prevGray = currGray;
  }
  return results;
}

export function drawProgramMonitorCanvas(
  canvas,
  doc,
  playheadFrame,
  cdl,
  fxState = null,
  titleState = null,
  framingState = null,
  subtitleState = null,
  chromaKeyState = null,
  splitWipeState = null,
  renderOpts = null
) {
  const explicitW =
    renderOpts && Number(renderOpts.explicitWidth) > 0 ? Number(renderOpts.explicitWidth) : null;
  let targetCssH = 244;
  if (!explicitW && canvas && typeof canvas.closest === "function" && canvas.closest(".nle-viewer-dock")) {
    const parentH = canvas.parentElement ? canvas.parentElement.getBoundingClientRect().height : 0;
    if (parentH > 260) {
      targetCssH = Math.min(440, Math.floor(parentH) - 2);
    }
  }
  const { ctx, width, height } = setupCanvas(canvas, targetCssH, explicitW);
  ctx.fillStyle = "#141416";
  ctx.fillRect(0, 0, width, height);

  // Target aspect ratio letterbox / pillarbox viewer frame
  const aspectSpec = getAspectRatioPreset(framingState && framingState.aspectPreset ? framingState.aspectPreset : "16:9");
  const framingMode = framingState && framingState.framingMode === "fit" ? "fit" : "fill";
  const targetAspect = aspectSpec.width / aspectSpec.height;
  const srcAspect = doc && doc.width > 0 && doc.height > 0 ? doc.width / doc.height : 16 / 9;
  let frameW = width - 16;
  let frameH = frameW / targetAspect;
  if (frameH > height - 16) {
    frameH = height - 16;
    frameW = frameH * targetAspect;
  }
  const fx = Math.floor((width - frameW) / 2);
  const fy = Math.floor((height - frameH) / 2);

  // Active clips at playhead
  const activeClips = [];
  if (doc && doc.tracks) {
    for (const trk of doc.tracks) {
      if (trk.kind !== "video") continue;
      for (const c of trk.clips || []) {
        if (playheadFrame >= c.start_frame && playheadFrame < c.start_frame + c.duration_frames) {
          activeClips.push({ track: `V${trk.index}`, clip: c });
        }
      }
    }
  }

  const fps = doc && doc.fps ? Math.max(1, doc.fps.num / Math.max(1, doc.fps.den)) : 25;
  const tSec = playheadFrame / fps;
  const activeTrans = findActiveTransitionAtFrame(doc, playheadFrame);

  const rawNodes = fxState && Array.isArray(fxState.nodes) ? fxState.nodes : [];
  const bypassAll = Boolean(fxState && fxState.bypassAll);
  const activeFx = bypassAll ? [] : rawNodes.filter((n) => n && n.enabled !== false);
  const ckRaw = chromaKeyState || (fxState && fxState.chromaKey) || null;
  const ckActive = !bypassAll && Boolean(ckRaw && ckRaw.enabled);
  const ckMatteView = ckRaw && ckRaw.matteView === "alpha_matte" ? "alpha_matte" : "final";
  const stabRaw = fxState && fxState.stabilizer ? normalizeStabilizerClient(fxState.stabilizer) : null;
  const stabActive = !bypassAll && Boolean(stabRaw && stabRaw.enabled);
  const trkRaw = fxState && fxState.planarTracker ? normalizePlanarTrackerClient(fxState.planarTracker) : null;
  const trkActive = !bypassAll && Boolean(trkRaw && trkRaw.enabled);
  const wipeActive = Boolean(splitWipeState && splitWipeState.enabled);

  const renderScenePass = (passCdl, passFxState, passTitleState, passSubState, passCkState) => {
    const pRawNodes = passFxState && Array.isArray(passFxState.nodes) ? passFxState.nodes : [];
    const pBypassAll = Boolean(passFxState && passFxState.bypassAll);
    const pActiveFx = pBypassAll ? [] : pRawNodes.filter((n) => n && n.enabled !== false);
    const pCkRaw = passCkState || (passFxState && passFxState.chromaKey) || null;
    const pCkActive = !pBypassAll && Boolean(pCkRaw && pCkRaw.enabled);
    const pCkMatteView = pCkRaw && pCkRaw.matteView === "alpha_matte" ? "alpha_matte" : "final";
    const pStabRaw =
      !pBypassAll && passFxState && passFxState.stabilizer
        ? normalizeStabilizerClient(passFxState.stabilizer)
        : null;
    const pStabActive = Boolean(pStabRaw && pStabRaw.enabled);
    const pTrkRaw =
      !pBypassAll && passFxState && passFxState.planarTracker
        ? normalizePlanarTrackerClient(passFxState.planarTracker)
        : null;
    const pTrkActive = Boolean(pTrkRaw && pTrkRaw.enabled);

    // Compute spatial shake + camera_shake + gate-weave displacement
    let shiftX = 0;
    let shiftY = 0;
    let motionBlurAmt = 0;
    let cameraShakeOverscan = 0;
    let hasLegacyShake = false;
    for (const node of pActiveFx) {
      const p = node.params || {};
      const kfMul = evaluateNodeIntensity(node, tSec);
      if (kfMul <= 0.0001) continue;
      if (node.effect === "shake") {
        hasLegacyShake = true;
        const amp = Number(p.amplitude ?? 14) * kfMul * (frameW / 640);
        const freq = Number(p.frequency ?? 6);
        const seed = Number(p.seed ?? 42);
        const p1 = ((seed % 360) * Math.PI) / 180 + 0.65;
        const p2 = (((seed * 7 + 53) % 360) * Math.PI) / 180 + 1.15;
        shiftX += amp * Math.sin(tSec * freq * Math.PI * 2 + p1);
        shiftY += amp * Math.cos(tSec * freq * 1.37 * Math.PI * 2 + p2);
        motionBlurAmt = Math.max(motionBlurAmt, Number(p.motion_blur ?? 0) * Math.min(1, kfMul));
      } else if (node.effect === "camera_shake") {
        const ampPx = Math.min(24, Math.max(1, Number(p.amplitude_px ?? 8))) * kfMul * (frameW / 640);
        const freq = Math.min(12, Math.max(0.5, Number(p.frequency_hz ?? 4.5)));
        shiftX += ampPx * Math.sin(tSec * freq * Math.PI * 2);
        shiftY += ampPx * Math.cos(tSec * freq * 1.37 * Math.PI * 2 + 0.7);
        cameraShakeOverscan = Math.max(cameraShakeOverscan, ampPx);
      } else if (node.effect === "film_damage") {
        const mix = Number(p.mix ?? 0.75) * Math.min(1, kfMul);
        const weave = Number(p.gate_weave ?? 0.25) * mix;
        shiftX += weave * 4.5 * Math.sin(tSec * 7.1 + 0.4);
        shiftY += weave * 4.5 * Math.cos(tSec * 5.3 + 0.9);
      }
    }

    // Draw base 16:9 editorial frame into offscreen scratch buffer
    const bw = Math.max(1, Math.round(frameW));
    const bh = Math.max(1, Math.round(frameH));
    const buf = getFxScratchCanvas(bw, bh);

    if (buf) {
      const bctx = buf.getContext("2d");
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.clearRect(0, 0, bw, bh);

      _transScratchA = activeTrans ? ensureScratchCanvas(_transScratchA, bw, bh) : _transScratchA;
      _transScratchB = activeTrans ? ensureScratchCanvas(_transScratchB, bw, bh) : _transScratchB;

      if (activeTrans && _transScratchA && _transScratchB && !pCkRaw?.enabled) {
        const ctxA = _transScratchA.getContext("2d");
        const ctxB = _transScratchB.getContext("2d");
        ctxA.setTransform(1, 0, 0, 1, 0, 0);
        ctxB.setTransform(1, 0, 0, 1, 0, 0);
        ctxA.clearRect(0, 0, bw, bh);
        ctxB.clearRect(0, 0, bw, bh);

        const trkTag = `V${activeTrans.trackIndex}`;
        drawFramedBaseScene(
          ctxA,
          bw,
          bh,
          doc,
          playheadFrame,
          passCdl,
          [{ track: trkTag, clip: activeTrans.clipA }],
          framingMode,
          srcAspect,
          targetAspect
        );
        drawFramedBaseScene(
          ctxB,
          bw,
          bh,
          doc,
          playheadFrame,
          passCdl,
          [{ track: trkTag, clip: activeTrans.clipB }],
          framingMode,
          srcAspect,
          targetAspect
        );

        const u = clamp01(activeTrans.progress);
        const preset = activeTrans.transition.preset;
        bctx.fillStyle = "#000000";
        bctx.fillRect(0, 0, bw, bh);

        if (preset === "fadeblack") {
          if (u < 0.5) {
            bctx.save();
            bctx.globalAlpha = clamp01(1 - u * 2);
            bctx.drawImage(_transScratchA, 0, 0, bw, bh);
            bctx.restore();
          } else {
            bctx.save();
            bctx.globalAlpha = clamp01((u - 0.5) * 2);
            bctx.drawImage(_transScratchB, 0, 0, bw, bh);
            bctx.restore();
          }
        } else if (preset === "wipeleft") {
          const seamX = bw * (1 - u);
          bctx.drawImage(_transScratchA, 0, 0, bw, bh);
          bctx.save();
          bctx.beginPath();
          bctx.rect(seamX, 0, bw - seamX, bh);
          bctx.clip();
          bctx.drawImage(_transScratchB, 0, 0, bw, bh);
          bctx.restore();
          bctx.strokeStyle = "#e68442";
          bctx.lineWidth = 2;
          bctx.beginPath();
          bctx.moveTo(seamX, 0);
          bctx.lineTo(seamX, bh);
          bctx.stroke();
        } else if (preset === "slideright") {
          const slideX = bw * u;
          bctx.drawImage(_transScratchA, slideX, 0, bw, bh);
          bctx.drawImage(_transScratchB, slideX - bw, 0, bw, bh);
          bctx.strokeStyle = "#e68442";
          bctx.lineWidth = 2;
          bctx.beginPath();
          bctx.moveTo(slideX, 0);
          bctx.lineTo(slideX, bh);
          bctx.stroke();
        } else if (preset === "zoomin") {
          const eased = u * u * (3 - 2 * u);
          const scaleA = 1 + eased * 0.34;
          const wA = bw * scaleA;
          const hA = bh * scaleA;
          bctx.save();
          bctx.globalAlpha = clamp01(1 - eased);
          bctx.drawImage(_transScratchA, (bw - wA) / 2, (bh - hA) / 2, wA, hA);
          bctx.restore();

          const scaleB = 0.84 + eased * 0.16;
          const wB = bw * scaleB;
          const hB = bh * scaleB;
          bctx.save();
          bctx.globalAlpha = clamp01(eased);
          bctx.drawImage(_transScratchB, (bw - wB) / 2, (bh - hB) / 2, wB, hB);
          bctx.restore();
        } else {
          // Cross Dissolve (fade)
          bctx.drawImage(_transScratchA, 0, 0, bw, bh);
          bctx.save();
          bctx.globalAlpha = u;
          bctx.drawImage(_transScratchB, 0, 0, bw, bh);
          bctx.restore();
        }
      } else {
        drawFramedBaseScene(
          bctx,
          bw,
          bh,
          doc,
          playheadFrame,
          passCdl,
          activeClips,
          framingMode,
          srcAspect,
          targetAspect,
          pCkRaw
        );
      }

      if (pCkActive && pCkRaw) {
        applyChromaKeyOnBuffer(bctx, bw, bh, pCkRaw, pCkMatteView);
      }

      // Apply S_FlipFlop horizontal/vertical mirror flip on frame buffer
      const mirrorNodes = pActiveFx.filter((n) => n.effect === "mirror_flip");
      if (mirrorNodes.length > 0 && !(pCkActive && pCkMatteView === "alpha_matte")) {
        let flipH = false;
        let flipV = false;
        let maxMul = 0;
        let mirrorMask = null;
        for (const mNode of mirrorNodes) {
          const mul = Math.min(1, evaluateNodeIntensity(mNode, tSec));
          if (mul <= 0.0001) continue;
          maxMul = Math.max(maxMul, mul);
          if (!mirrorMask && isEffectMaskActive(mNode)) mirrorMask = mNode.effect_mask;
          const axis = String((mNode.params && mNode.params.axis) || "horizontal").trim().toLowerCase();
          if (axis === "horizontal") flipH = !flipH;
          else if (axis === "vertical") flipV = !flipV;
          else if (axis === "both") {
            flipH = !flipH;
            flipV = !flipV;
          }
        }
        if ((flipH || flipV) && maxMul > 0.0001) {
          runMaskedBufferPass(bctx, bw, bh, mirrorMask, () => {
            const srcImg = bctx.getImageData(0, 0, bw, bh);
            const outImg = bctx.createImageData(bw, bh);
            const s = srcImg.data;
            const d = outImg.data;
            const wetW = maxMul;
            const dryW = 1 - wetW;
            for (let y = 0; y < bh; y++) {
              const sy = flipV ? bh - 1 - y : y;
              const rowOff = y * bw;
              const srcRowOff = sy * bw;
              for (let x = 0; x < bw; x++) {
                const sx = flipH ? bw - 1 - x : x;
                const di = (rowOff + x) * 4;
                const si = (srcRowOff + sx) * 4;
                if (wetW >= 0.999) {
                  d[di] = s[si];
                  d[di + 1] = s[si + 1];
                  d[di + 2] = s[si + 2];
                  d[di + 3] = s[si + 3];
                } else {
                  d[di] = Math.round(s[di] * dryW + s[si] * wetW);
                  d[di + 1] = Math.round(s[di + 1] * dryW + s[si + 1] * wetW);
                  d[di + 2] = Math.round(s[di + 2] * dryW + s[si + 2] * wetW);
                  d[di + 3] = Math.round(s[di + 3] * dryW + s[si + 3] * wetW);
                }
              }
            }
            bctx.putImageData(outImg, 0, 0);
          });
        }
      }

      // Apply S_Mosaic retro block pixelation on frame buffer
      const mosaicNodes = pActiveFx.filter((n) => n.effect === "mosaic_pixelate");
      if (mosaicNodes.length > 0 && !(pCkActive && pCkMatteView === "alpha_matte")) {
        for (const mNode of mosaicNodes) {
          const mul = Math.min(1, evaluateNodeIntensity(mNode, tSec));
          if (mul <= 0.0001) continue;
          const mp = mNode.params || {};
          const rawBlock = Math.round(Math.min(48, Math.max(4, Number(mp.block_size_px ?? 12))));
          const blockPx = Math.max(2, Math.round(rawBlock * Math.max(0.5, bw / 1280)));
          const srcImg = bctx.getImageData(0, 0, bw, bh);
          const d = srcImg.data;
          const dryW = 1 - mul;
          for (let ty = 0; ty < bh; ty += blockPx) {
            const yEnd = Math.min(bh, ty + blockPx);
            for (let tx = 0; tx < bw; tx += blockPx) {
              const xEnd = Math.min(bw, tx + blockPx);
              let sumR = 0;
              let sumG = 0;
              let sumB = 0;
              let sumA = 0;
              let count = 0;
              for (let y = ty; y < yEnd; y++) {
                const rowOff = y * bw;
                for (let x = tx; x < xEnd; x++) {
                  const idx = (rowOff + x) * 4;
                  sumR += d[idx];
                  sumG += d[idx + 1];
                  sumB += d[idx + 2];
                  sumA += d[idx + 3];
                  count++;
                }
              }
              const avgR = sumR / count;
              const avgG = sumG / count;
              const avgB = sumB / count;
              const avgA = sumA / count;
              for (let y = ty; y < yEnd; y++) {
                const rowOff = y * bw;
                for (let x = tx; x < xEnd; x++) {
                  const idx = (rowOff + x) * 4;
                  if (mul >= 0.999) {
                    d[idx] = Math.round(avgR);
                    d[idx + 1] = Math.round(avgG);
                    d[idx + 2] = Math.round(avgB);
                    d[idx + 3] = Math.round(avgA);
                  } else {
                    d[idx] = Math.round(d[idx] * dryW + avgR * mul);
                    d[idx + 1] = Math.round(d[idx + 1] * dryW + avgG * mul);
                    d[idx + 2] = Math.round(d[idx + 2] * dryW + avgB * mul);
                    d[idx + 3] = Math.round(d[idx + 3] * dryW + avgA * mul);
                  }
                }
              }
            }
          }
          runMaskedBufferPass(bctx, bw, bh, mNode.effect_mask, () => {
            bctx.putImageData(srcImg, 0, 0);
          });
        }
      }

      // Apply S_HueSatBright hue rotation & saturation boost on frame buffer
      const hueNodes = pActiveFx.filter((n) => n.effect === "hue_shift");
      if (hueNodes.length > 0 && !(pCkActive && pCkMatteView === "alpha_matte")) {
        let totalHueDeg = 0;
        let totalSat = 1;
        let anyHueActive = false;
        let hueMask = null;
        for (const hNode of hueNodes) {
          const mul = Math.min(1, evaluateNodeIntensity(hNode, tSec));
          if (mul <= 0.0001) continue;
          anyHueActive = true;
          if (!hueMask && isEffectMaskActive(hNode)) hueMask = hNode.effect_mask;
          const hp = hNode.params || {};
          const rawHue = Math.min(180, Math.max(-180, Number(hp.hue_deg ?? 30)));
          const rawSat = Math.min(2.5, Math.max(0, Number(hp.saturation ?? 1.25)));
          totalHueDeg += rawHue * mul;
          totalSat *= 1 + (rawSat - 1) * mul;
        }
        if (anyHueActive && (Math.abs(totalHueDeg) > 0.05 || Math.abs(totalSat - 1) > 0.005)) {
          runMaskedBufferPass(bctx, bw, bh, hueMask, () => {
            const srcImg = bctx.getImageData(0, 0, bw, bh);
            const d = srcImg.data;
            const rad = (totalHueDeg * Math.PI) / 180;
            const cosA = Math.cos(rad);
            const sinA = Math.sin(rad);
            const sat = Math.min(2.5, Math.max(0, totalSat));
            const lumR = 0.213;
            const lumG = 0.715;
            const lumB = 0.072;
            const m00 = lumR + cosA * (1 - lumR) + sinA * (-lumR);
            const m01 = lumG + cosA * (-lumG) + sinA * (-lumG);
            const m02 = lumB + cosA * (-lumB) + sinA * (1 - lumB);
            const m10 = lumR + cosA * (-lumR) + sinA * 0.143;
            const m11 = lumG + cosA * (1 - lumG) + sinA * 0.140;
            const m12 = lumB + cosA * (-lumB) + sinA * (-0.283);
            const m20 = lumR + cosA * (-lumR) + sinA * (-(1 - lumR));
            const m21 = lumG + cosA * (-lumG) + sinA * lumG;
            const m22 = lumB + cosA * (1 - lumB) + sinA * lumB;
            const sr = (1 - sat) * lumR;
            const sg = (1 - sat) * lumG;
            const sb = (1 - sat) * lumB;
            const a00 = (sr + sat) * m00 + sg * m10 + sb * m20;
            const a01 = (sr + sat) * m01 + sg * m11 + sb * m21;
            const a02 = (sr + sat) * m02 + sg * m12 + sb * m22;
            const a10 = sr * m00 + (sg + sat) * m10 + sb * m20;
            const a11 = sr * m01 + (sg + sat) * m11 + sb * m21;
            const a12 = sr * m02 + (sg + sat) * m12 + sb * m22;
            const a20 = sr * m00 + sg * m10 + (sb + sat) * m20;
            const a21 = sr * m01 + sg * m11 + (sb + sat) * m21;
            const a22 = sr * m02 + sg * m12 + (sb + sat) * m22;
            for (let i = 0; i < d.length; i += 4) {
              const r = d[i];
              const g = d[i + 1];
              const b = d[i + 2];
              const nr = a00 * r + a01 * g + a02 * b;
              const ng = a10 * r + a11 * g + a12 * b;
              const nb = a20 * r + a21 * g + a22 * b;
              d[i] = nr < 0 ? 0 : nr > 255 ? 255 : Math.round(nr);
              d[i + 1] = ng < 0 ? 0 : ng > 255 ? 255 : Math.round(ng);
              d[i + 2] = nb < 0 ? 0 : nb > 255 ? 255 : Math.round(nb);
            }
            bctx.putImageData(srcImg, 0, 0);
          });
        }
      }

      // Apply S_Invert film negative (RGB or luma-only) on frame buffer
      const invertNodes = pActiveFx.filter((n) => n.effect === "invert_negative");
      if (invertNodes.length > 0 && !(pCkActive && pCkMatteView === "alpha_matte")) {
        for (const iNode of invertNodes) {
          const mul = Math.min(1, evaluateNodeIntensity(iNode, tSec));
          if (mul <= 0.0001) continue;
          const mode = String((iNode.params && iNode.params.mode) || "rgb").trim().toLowerCase();
          runMaskedBufferPass(bctx, bw, bh, iNode.effect_mask, () => {
            const srcImg = bctx.getImageData(0, 0, bw, bh);
            const d = srcImg.data;
            const dryW = 1 - mul;
            if (mode === "luma") {
              for (let i = 0; i < d.length; i += 4) {
                const r = d[i];
                const g = d[i + 1];
                const b = d[i + 2];
                const y = 0.299 * r + 0.587 * g + 0.114 * b;
                const deltaY = (255 - 2 * y) * mul;
                const nr = r + deltaY;
                const ng = g + deltaY;
                const nb = b + deltaY;
                d[i] = nr < 0 ? 0 : nr > 255 ? 255 : Math.round(nr);
                d[i + 1] = ng < 0 ? 0 : ng > 255 ? 255 : Math.round(ng);
                d[i + 2] = nb < 0 ? 0 : nb > 255 ? 255 : Math.round(nb);
              }
            } else {
              for (let i = 0; i < d.length; i += 4) {
                if (mul >= 0.999) {
                  d[i] = 255 - d[i];
                  d[i + 1] = 255 - d[i + 1];
                  d[i + 2] = 255 - d[i + 2];
                } else {
                  d[i] = Math.round(d[i] * dryW + (255 - d[i]) * mul);
                  d[i + 1] = Math.round(d[i + 1] * dryW + (255 - d[i + 1]) * mul);
                  d[i + 2] = Math.round(d[i + 2] * dryW + (255 - d[i + 2]) * mul);
                }
              }
            }
            bctx.putImageData(srcImg, 0, 0);
          });
        }
      }

      // Apply Chroma Aberration & Sapphire RGB Split channel shift directly on frame buffer
      const shiftNodes = pActiveFx.filter(
        (n) => n.effect === "chroma_aberration" || n.effect === "rgb_split"
      );
      if (shiftNodes.length > 0 && !(pCkActive && pCkMatteView === "alpha_matte")) {
        let dx = 0;
        let dy = 0;
        let shiftMask = null;
        for (const sNode of shiftNodes) {
          const mul = evaluateNodeIntensity(sNode, tSec);
          if (mul <= 0.0001) continue;
          if (!shiftMask && isEffectMaskActive(sNode)) shiftMask = sNode.effect_mask;
          const sp = sNode.params || {};
          if (sNode.effect === "chroma_aberration") {
            const spread = Number(sp.spread ?? 8) * mul;
            const angleRad = (Number(sp.angle ?? 15) * Math.PI) / 180;
            dx += Math.round(Math.cos(angleRad) * spread * (bw / 640));
            dy += Math.round(Math.sin(angleRad) * spread * (bw / 640));
          } else {
            const rawShift = Math.min(12, Math.max(0, Number(sp.chroma_shift_px ?? 4))) * mul;
            if (rawShift > 0.05) {
              dx += Math.max(1, Math.round(rawShift * Math.max(0.5, bw / 640)));
            }
          }
        }
        if (dx !== 0 || dy !== 0) {
          runMaskedBufferPass(bctx, bw, bh, shiftMask, () => {
            const srcImg = bctx.getImageData(0, 0, bw, bh);
            const outImg = bctx.createImageData(bw, bh);
            const s = srcImg.data;
            const d = outImg.data;
            for (let y = 0; y < bh; y++) {
              const ry = Math.min(bh - 1, Math.max(0, y - dy));
              const by = Math.min(bh - 1, Math.max(0, y + dy));
              const rowOff = y * bw;
              const rRowOff = ry * bw;
              const bRowOff = by * bw;
              for (let x = 0; x < bw; x++) {
                const rx = Math.min(bw - 1, Math.max(0, x - dx));
                const bx = Math.min(bw - 1, Math.max(0, x + dx));
                const oi = (rowOff + x) * 4;
                d[oi] = s[(rRowOff + rx) * 4];
                d[oi + 1] = s[oi + 1];
                d[oi + 2] = s[(bRowOff + bx) * 4 + 2];
                d[oi + 3] = s[oi + 3];
              }
            }
            bctx.putImageData(outImg, 0, 0);
          });
        }
      }

      // Apply S_LensDistortion radial barrel/pincushion warp on frame buffer
      const lensNodes = pActiveFx.filter((n) => n.effect === "lens_distortion");
      if (lensNodes.length > 0 && !(pCkActive && pCkMatteView === "alpha_matte")) {
        let totalK1 = 0;
        let lensMask = null;
        for (const lNode of lensNodes) {
          const mul = Math.min(1, evaluateNodeIntensity(lNode, tSec));
          if (mul <= 0.0001) continue;
          if (!lensMask && isEffectMaskActive(lNode)) lensMask = lNode.effect_mask;
          const lp = lNode.params || {};
          const rawK1 = Math.min(0.5, Math.max(-0.5, Number(lp.k1 ?? -0.22)));
          totalK1 += rawK1 * mul;
        }
        if (Math.abs(totalK1) > 0.001) {
          runMaskedBufferPass(bctx, bw, bh, lensMask, () => {
            const srcImg = bctx.getImageData(0, 0, bw, bh);
            const outImg = bctx.createImageData(bw, bh);
            const s = srcImg.data;
            const d = outImg.data;
            const cx = bw * 0.5;
            const cy = bh * 0.5;
            const invR2Max = 1 / Math.max(1, cx * cx + cy * cy);
            for (let y = 0; y < bh; y++) {
              const dy = y - cy;
              const dy2 = dy * dy;
              const rowOff = y * bw;
              for (let x = 0; x < bw; x++) {
                const dx = x - cx;
                const r2 = (dx * dx + dy2) * invR2Max;
                const factor = 1 + totalK1 * r2;
                const sx = Math.round(cx + dx * factor);
                const sy = Math.round(cy + dy * factor);
                const oi = (rowOff + x) * 4;
                if (sx >= 0 && sx < bw && sy >= 0 && sy < bh) {
                  const si = (sy * bw + sx) * 4;
                  d[oi] = s[si];
                  d[oi + 1] = s[si + 1];
                  d[oi + 2] = s[si + 2];
                  d[oi + 3] = s[si + 3];
                } else {
                  d[oi] = 0;
                  d[oi + 1] = 0;
                  d[oi + 2] = 0;
                  d[oi + 3] = 255;
                }
              }
            }
            bctx.putImageData(outImg, 0, 0);
          });
        }
      }

      // Apply S_Sharpen broadcast unsharp mask convolution on frame buffer
      const unsharpNodes = pActiveFx.filter((n) => n.effect === "unsharp_mask");
      if (unsharpNodes.length > 0 && bw >= 3 && bh >= 3 && !(pCkActive && pCkMatteView === "alpha_matte")) {
        let totalSharpen = 0;
        let unsharpMask = null;
        for (const uNode of unsharpNodes) {
          const mul = Math.min(1, evaluateNodeIntensity(uNode, tSec));
          if (mul <= 0.0001) continue;
          if (!unsharpMask && isEffectMaskActive(uNode)) unsharpMask = uNode.effect_mask;
          const up = uNode.params || {};
          const rawAmt = Math.min(3.0, Math.max(0.2, Number(up.sharpen_amount ?? 1.2)));
          totalSharpen += rawAmt * mul;
        }
        if (totalSharpen > 0.01) {
          runMaskedBufferPass(bctx, bw, bh, unsharpMask, () => {
            const srcImg = bctx.getImageData(0, 0, bw, bh);
            const outImg = bctx.createImageData(bw, bh);
            const s = srcImg.data;
            const d = outImg.data;
            const gain = Math.min(2.6, totalSharpen * 0.65);
            const stride = bw * 4;
            for (let y = 0; y < bh; y++) {
              const rowOff = y * stride;
              if (y === 0 || y === bh - 1) {
                for (let x = 0; x < stride; x++) d[rowOff + x] = s[rowOff + x];
                continue;
              }
              for (let x = 0; x < bw; x++) {
                const oi = rowOff + x * 4;
                if (x === 0 || x === bw - 1) {
                  d[oi] = s[oi];
                  d[oi + 1] = s[oi + 1];
                  d[oi + 2] = s[oi + 2];
                  d[oi + 3] = s[oi + 3];
                  continue;
                }
                const upI = oi - stride;
                const dnI = oi + stride;
                const ltI = oi - 4;
                const rtI = oi + 4;
                for (let c = 0; c < 3; c++) {
                  const center = s[oi + c];
                  const blur4 = (s[upI + c] + s[dnI + c] + s[ltI + c] + s[rtI + c]) * 0.25;
                  const val = center + (center - blur4) * gain;
                  d[oi + c] = val < 0 ? 0 : val > 255 ? 255 : Math.round(val);
                }
                d[oi + 3] = s[oi + 3];
              }
            }
            bctx.putImageData(outImg, 0, 0);
          });
        }
      }

      // Apply S_DirectionalBlur linear streak blur on frame buffer
      const dirBlurNodes = pActiveFx.filter((n) => n.effect === "directional_blur");
      if (dirBlurNodes.length > 0 && !(pCkActive && pCkMatteView === "alpha_matte")) {
        for (const dbNode of dirBlurNodes) {
          const mul = Math.min(1, evaluateNodeIntensity(dbNode, tSec));
          if (mul <= 0.0001) continue;
          const dbp = dbNode.params || {};
          const blurAmt = Math.min(24, Math.max(1, Number(dbp.blur_amount ?? 8))) * mul;
          const angleRad = (Math.min(180, Math.max(-180, Number(dbp.angle_deg ?? 0))) * Math.PI) / 180;
          const stepSpan = Math.max(1, blurAmt * Math.max(0.45, bw / 960));
          const ux = Math.cos(angleRad);
          const uy = Math.sin(angleRad);
          runMaskedBufferPass(bctx, bw, bh, dbNode.effect_mask, () => {
            const srcImg = bctx.getImageData(0, 0, bw, bh);
            const outImg = bctx.createImageData(bw, bh);
            const s = srcImg.data;
            const d = outImg.data;
            const taps = 9;
            const halfTaps = 4;
            for (let y = 0; y < bh; y++) {
              const rowOff = y * bw;
              for (let x = 0; x < bw; x++) {
                let accR = 0;
                let accG = 0;
                let accB = 0;
                let accA = 0;
                for (let k = -halfTaps; k <= halfTaps; k++) {
                  const frac = k / halfTaps;
                  const sx = Math.min(bw - 1, Math.max(0, Math.round(x + ux * stepSpan * frac)));
                  const sy = Math.min(bh - 1, Math.max(0, Math.round(y + uy * stepSpan * frac)));
                  const si = (sy * bw + sx) * 4;
                  accR += s[si];
                  accG += s[si + 1];
                  accB += s[si + 2];
                  accA += s[si + 3];
                }
                const oi = (rowOff + x) * 4;
                d[oi] = Math.round(accR / taps);
                d[oi + 1] = Math.round(accG / taps);
                d[oi + 2] = Math.round(accB / taps);
                d[oi + 3] = Math.round(accA / taps);
              }
            }
            bctx.putImageData(outImg, 0, 0);
          });
        }
      }

      // Apply S_TiltShift miniature selective-focus bokeh & saturation pop on frame buffer
      const tiltNodes = pActiveFx.filter((n) => n.effect === "tilt_shift");
      if (tiltNodes.length > 0 && !(pCkActive && pCkMatteView === "alpha_matte")) {
        for (const tNode of tiltNodes) {
          const mul = Math.min(1, evaluateNodeIntensity(tNode, tSec));
          if (mul <= 0.0001) continue;
          const tp = tNode.params || {};
          const focusY = Math.min(0.85, Math.max(0.15, Number(tp.focus_y ?? 0.52)));
          const bandH = Math.min(0.55, Math.max(0.08, Number(tp.band_height ?? 0.24)));
          const blurStr = Math.min(20, Math.max(2, Number(tp.blur_strength ?? 7))) * mul;
          const satBoost = 1 + (Math.min(1.8, Math.max(1.0, Number(tp.sat_boost ?? 1.3))) - 1) * mul;
          const halfBand = bandH * 0.5;
          const feather = Math.max(0.08, bandH * 0.65);

          _tiltScratchCanvas = ensureScratchCanvas(_tiltScratchCanvas, bw, bh);
          if (_tiltScratchCanvas) {
            const tctx = _tiltScratchCanvas.getContext("2d");
            tctx.setTransform(1, 0, 0, 1, 0, 0);
            tctx.clearRect(0, 0, bw, bh);
            if (typeof tctx.filter === "string") {
              const blurPx = Math.max(2, Math.round(blurStr * Math.max(0.5, bw / 640)));
              tctx.filter = `blur(${blurPx}px) saturate(${satBoost.toFixed(3)})`;
            }
            tctx.drawImage(buf, 0, 0, bw, bh);
            tctx.filter = "none";

            runMaskedBufferPass(bctx, bw, bh, tNode.effect_mask, () => {
              const dryImg = bctx.getImageData(0, 0, bw, bh);
              const blurImg = tctx.getImageData(0, 0, bw, bh);
              const d = dryImg.data;
              const b = blurImg.data;
              for (let y = 0; y < bh; y++) {
                const ny = (y + 0.5) / bh;
                const dist = Math.max(0, Math.abs(ny - focusY) - halfBand);
                const blurW = Math.min(1, dist / feather) * mul;
                const rowOff = y * bw;
                for (let x = 0; x < bw; x++) {
                  const idx = (rowOff + x) * 4;
                  const r0 = d[idx];
                  const g0 = d[idx + 1];
                  const b0 = d[idx + 2];
                  const luma = 0.2126 * r0 + 0.7152 * g0 + 0.0722 * b0;
                  const sr = Math.min(255, Math.max(0, luma + (r0 - luma) * satBoost));
                  const sg = Math.min(255, Math.max(0, luma + (g0 - luma) * satBoost));
                  const sb = Math.min(255, Math.max(0, luma + (b0 - luma) * satBoost));
                  if (blurW <= 0.001) {
                    d[idx] = Math.round(sr);
                    d[idx + 1] = Math.round(sg);
                    d[idx + 2] = Math.round(sb);
                  } else {
                    const inv = 1 - blurW;
                    d[idx] = Math.round(sr * inv + b[idx] * blurW);
                    d[idx + 1] = Math.round(sg * inv + b[idx + 1] * blurW);
                    d[idx + 2] = Math.round(sb * inv + b[idx + 2] * blurW);
                  }
                }
              }
              bctx.putImageData(dryImg, 0, 0);
            });
          }
        }
      }

      if (pCkActive && pCkMatteView === "final") {
        drawTransparencyCheckerboard(ctx, fx, fy, frameW, frameH);
      }

      const stabZoom = pStabActive && pStabRaw ? Math.max(1, pStabRaw.auto_zoom_pct / 100.0) : 1.0;
      const dampFactor = pStabActive ? 0.15 : 1.0;
      const effShiftX = shiftX * dampFactor;
      const effShiftY = shiftY * dampFactor;
      const overscan = !hasLegacyShake && cameraShakeOverscan > 0 ? cameraShakeOverscan : 0;
      const baseW = (frameW + overscan * 2) * stabZoom;
      const baseH = (frameH + overscan * 2) * stabZoom;
      const drawX = fx + (frameW - baseW) * 0.5 + effShiftX;
      const drawY = fy + (frameH - baseH) * 0.5 + effShiftY;
      const drawW = baseW;
      const drawH = baseH;

      if (pTrkActive && pTrkRaw && pTrkRaw.mode !== "point_track_only") {
        const pins = evaluateCornerPinsClient(pTrkRaw, playheadFrame);
        ctx.save();
        ctx.fillStyle = "#0b0b0e";
        ctx.fillRect(fx, fy, frameW, frameH);
        drawPerspectiveWarpedBuffer(ctx, buf, bw, bh, drawX, drawY, drawW, drawH, pins, pTrkRaw.mode);
        ctx.restore();
      } else {
        ctx.drawImage(buf, drawX, drawY, drawW, drawH);
      }
      if (motionBlurAmt >= 0.05 && (Math.abs(effShiftX) > 0.2 || Math.abs(effShiftY) > 0.2)) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.42, motionBlurAmt * 0.42);
        ctx.drawImage(buf, fx - effShiftX * 0.55, fy - effShiftY * 0.55, frameW, frameH);
        ctx.restore();
      }
    } else {
      ctx.save();
      ctx.translate(fx + shiftX, fy + shiftY);
      drawFramedBaseScene(
        ctx,
        frameW,
        frameH,
        doc,
        playheadFrame,
        passCdl,
        activeClips,
        framingMode,
        srcAspect,
        targetAspect,
        pCkRaw
      );
      ctx.restore();
    }

    const overscanOut = !hasLegacyShake && cameraShakeOverscan > 0 ? cameraShakeOverscan : 0;
    const fxOutX = fx - overscanOut + shiftX;
    const fxOutY = fy - overscanOut + shiftY;
    const fxOutW = frameW + overscanOut * 2;
    const fxOutH = frameH + overscanOut * 2;

    const renderOverlayFxNode = (octx, ox, oy, oW, oH, oOutX, oOutY, oOutW, oOutH, node, kfMul) => {
      const p = node.params || {};
      if (node.effect === "glow") {
        const brightness = Number(p.brightness ?? 0.85) * kfMul;
        const widthPx = Number(p.width ?? 18);
        const threshold = Number(p.threshold ?? 0.45);
        const [tr, tg, tb] = hexToRgbTuple(p.tint || "#ffd8a8");
        const alpha = clamp01((brightness / 2.2) * (1.15 - threshold * 0.45));

        if (buf && typeof octx.filter === "string") {
          octx.save();
          octx.globalCompositeOperation = "screen";
          octx.globalAlpha = Math.min(0.85, alpha * 0.8);
          octx.filter = `blur(${Math.max(2, Math.round(widthPx * 0.45))}px)`;
          octx.drawImage(buf, oOutX, oOutY, oOutW, oOutH);
          octx.restore();
        }

        const gx = ox + oW * 0.72 + shiftX;
        const gy = oy + oH * 0.32 + shiftY;
        const gr = Math.max(24, widthPx * 2.4);
        const gGrad = octx.createRadialGradient(gx, gy, 2, gx, gy, gr);
        gGrad.addColorStop(0, `rgba(${tr}, ${tg}, ${tb}, ${Math.min(0.75, alpha * 0.85).toFixed(3)})`);
        gGrad.addColorStop(0.45, `rgba(${tr}, ${tg}, ${tb}, ${Math.min(0.4, alpha * 0.45).toFixed(3)})`);
        gGrad.addColorStop(1, `rgba(${tr}, ${tg}, ${tb}, 0)`);
        octx.save();
        octx.globalCompositeOperation = "screen";
        octx.fillStyle = gGrad;
        octx.fillRect(ox, oy, oW, oH);
        octx.restore();
      } else if (node.effect === "lens_flare") {
        const cx = ox + Number(p.center_x ?? 0.72) * oW;
        const cy = oy + Number(p.center_y ?? 0.28) * oH;
        const brightness = Number(p.brightness ?? 0.95) * kfMul;
        const scale = Number(p.scale ?? 1.0);
        const [tr, tg, tb] = hexToRgbTuple(p.tint || "#7cc4ff");
        const alpha = clamp01(brightness * 0.75);

        octx.save();
        octx.globalCompositeOperation = "screen";

        const haloR = Math.max(22, oH * 0.36 * scale);
        const halo = octx.createRadialGradient(cx, cy, 1, cx, cy, haloR);
        halo.addColorStop(0, `rgba(255, 255, 255, ${Math.min(0.95, alpha).toFixed(3)})`);
        halo.addColorStop(0.22, `rgba(${tr}, ${tg}, ${tb}, ${(alpha * 0.75).toFixed(3)})`);
        halo.addColorStop(1, `rgba(${tr}, ${tg}, ${tb}, 0)`);
        octx.fillStyle = halo;
        octx.beginPath();
        octx.arc(cx, cy, haloR, 0, Math.PI * 2);
        octx.fill();

        const streakHalfW = oW * 0.45 * scale;
        const streakH = Math.max(3, 8 * scale);
        const sGrad = octx.createLinearGradient(cx - streakHalfW, cy, cx + streakHalfW, cy);
        sGrad.addColorStop(0, `rgba(${tr}, ${tg}, ${tb}, 0)`);
        sGrad.addColorStop(0.42, `rgba(${tr}, ${tg}, ${tb}, ${(alpha * 0.65).toFixed(3)})`);
        sGrad.addColorStop(0.5, `rgba(255, 255, 255, ${Math.min(0.95, alpha).toFixed(3)})`);
        sGrad.addColorStop(0.58, `rgba(${tr}, ${tg}, ${tb}, ${(alpha * 0.65).toFixed(3)})`);
        sGrad.addColorStop(1, `rgba(${tr}, ${tg}, ${tb}, 0)`);
        octx.fillStyle = sGrad;
        octx.fillRect(cx - streakHalfW, cy - streakH / 2, streakHalfW * 2, streakH);

        const midX = ox + oW * 0.5;
        const midY = oy + oH * 0.5;
        const ghostX = midX - (cx - midX) * 0.55;
        const ghostY = midY - (cy - midY) * 0.55;
        octx.strokeStyle = `rgba(${tr}, ${tg}, ${tb}, ${(alpha * 0.35).toFixed(3)})`;
        octx.lineWidth = 2;
        octx.beginPath();
        octx.arc(ghostX, ghostY, 14 * scale, 0, Math.PI * 2);
        octx.stroke();

        octx.restore();
      } else if (node.effect === "flicker") {
        const amp = Number(p.amplitude ?? 0.18) * kfMul;
        const freq = Number(p.frequency ?? 8);
        const rand = Number(p.randomness ?? 0.35);
        const delta =
          (amp *
            (Math.sin(tSec * freq * Math.PI * 2 + 0.45) +
              rand * Math.sin(tSec * freq * 1.73 * Math.PI * 2 + 1.7))) /
          (1 + rand);
        if (Math.abs(delta) > 0.005) {
          octx.save();
          octx.fillStyle =
            delta >= 0
              ? `rgba(255, 255, 255, ${Math.min(0.55, delta * 1.35).toFixed(3)})`
              : `rgba(0, 0, 0, ${Math.min(0.65, Math.abs(delta) * 1.45).toFixed(3)})`;
          octx.fillRect(ox, oy, oW, oH);
          octx.restore();
        }
      } else if (node.effect === "film_damage") {
        const mix = Number(p.mix ?? 0.75) * Math.min(1, kfMul);
        if (mix > 0.01) {
          const grain = Number(p.grain ?? 28) * mix;
          const scratches = Number(p.scratches ?? 0.45) * mix;
          const vignette = Number(p.vignette ?? 0.55) * mix;

          let rng = ((playheadFrame + 1) * 1664525 + 1013904223) >>> 0;
          const nextRand = () => {
            rng = (rng * 1664525 + 1013904223) >>> 0;
            return rng / 4294967296;
          };
          const speckCount = Math.round(grain * 6.5);
          for (let i = 0; i < speckCount; i++) {
            const sx = ox + nextRand() * oW;
            const sy = oy + nextRand() * oH;
            const bright = nextRand() > 0.5;
            octx.fillStyle = bright ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.28)";
            octx.fillRect(sx, sy, 1.5, 1.5);
          }

          if (scratches > 0.03) {
            const lineCount = Math.max(1, Math.round(scratches * 4));
            for (let i = 0; i < lineCount; i++) {
              const xFrac = ((0.21 + i * 0.27 + ((playheadFrame * (i + 3)) % 17) * 0.008) % 0.92) + 0.04;
              const lx = ox + oW * xFrac;
              octx.strokeStyle =
                i % 2 === 0
                  ? `rgba(255,255,255,${Math.min(0.45, scratches * 0.42).toFixed(3)})`
                  : `rgba(10,10,12,${Math.min(0.55, scratches * 0.48).toFixed(3)})`;
              octx.lineWidth = 1;
              octx.beginPath();
              octx.moveTo(lx, oy);
              octx.lineTo(lx + (nextRand() - 0.5) * 1.5, oy + oH);
              octx.stroke();
            }
          }

          if (vignette > 0.02) {
            const midX = ox + oW / 2;
            const midY = oy + oH / 2;
            const vig = octx.createRadialGradient(midX, midY, oH * 0.25, midX, midY, oW * 0.65);
            vig.addColorStop(0, "rgba(0,0,0,0)");
            vig.addColorStop(1, `rgba(0,0,0,${Math.min(0.82, vignette * 0.78).toFixed(3)})`);
            octx.fillStyle = vig;
            octx.fillRect(ox, oy, oW, oH);
          }
        }
      } else if (node.effect === "vignette") {
        const rawAngle = Math.min(1.2, Math.max(0.1, Number(p.angle_rad ?? 0.52)));
        const intensity = Math.min(1, kfMul);
        if (intensity > 0.005) {
          const effAngle = rawAngle * intensity;
          const midX = ox + oW * 0.5;
          const midY = oy + oH * 0.5;
          const innerR = Math.max(8, oH * (0.44 - Math.min(0.28, effAngle * 0.22)));
          const outerR = Math.hypot(oW * 0.5, oH * 0.5) * 1.05;
          const edgeAlpha = Math.min(0.92, (0.22 + effAngle * 0.62) * intensity);
          const midAlpha = Math.min(0.45, edgeAlpha * 0.38);
          const vig = octx.createRadialGradient(midX, midY, innerR, midX, midY, outerR);
          vig.addColorStop(0, "rgba(0, 0, 0, 0)");
          vig.addColorStop(0.55, `rgba(0, 0, 0, ${midAlpha.toFixed(3)})`);
          vig.addColorStop(1, `rgba(0, 0, 0, ${edgeAlpha.toFixed(3)})`);
          octx.save();
          octx.fillStyle = vig;
          octx.fillRect(ox, oy, oW, oH);
          octx.restore();
        }
      } else if (node.effect === "film_grain") {
        const strength = Math.min(40, Math.max(0, Number(p.strength ?? 14))) * kfMul;
        if (strength > 0.2) {
          let rng = (((playheadFrame + 17) * 1664525 + 1013904223) >>> 0);
          const nextRand = () => {
            rng = (rng * 1664525 + 1013904223) >>> 0;
            return rng / 4294967296;
          };
          const norm = Math.min(1, strength / 40);
          const speckCount = Math.round(strength * 14);
          const brightAlpha = (0.08 + norm * 0.22).toFixed(3);
          const darkAlpha = (0.10 + norm * 0.26).toFixed(3);
          octx.save();
          for (let i = 0; i < speckCount; i++) {
            const sx = ox + nextRand() * oW;
            const sy = oy + nextRand() * oH;
            const sz = nextRand() > 0.72 ? 1.8 : 1.2;
            octx.fillStyle = nextRand() > 0.5
              ? `rgba(245, 242, 236, ${brightAlpha})`
              : `rgba(12, 12, 15, ${darkAlpha})`;
            octx.fillRect(sx, sy, sz, sz);
          }
          octx.restore();
        }
      } else if (node.effect === "optical_glow") {
        const intensity = clamp01(Number(p.glow_intensity ?? 0.45) * kfMul);
        const radius = Math.min(24, Math.max(2, Number(p.glow_radius ?? 10)));
        if (intensity > 0.005) {
          if (buf && typeof octx.filter === "string") {
            octx.save();
            octx.globalCompositeOperation = "screen";
            octx.globalAlpha = intensity;
            const blurPx = Math.max(2, Math.round(radius * Math.max(0.5, oW / 640)));
            octx.filter = `blur(${blurPx}px)`;
            octx.drawImage(buf, oOutX, oOutY, oOutW, oOutH);
            octx.restore();
          } else {
            const midX = ox + oW * 0.5 + shiftX;
            const midY = oy + oH * 0.5 + shiftY;
            const gGrad = octx.createRadialGradient(midX, midY, 4, midX, midY, Math.max(32, radius * 8));
            gGrad.addColorStop(0, `rgba(255, 244, 224, ${(intensity * 0.55).toFixed(3)})`);
            gGrad.addColorStop(1, "rgba(255, 244, 224, 0)");
            octx.save();
            octx.globalCompositeOperation = "screen";
            octx.fillStyle = gGrad;
            octx.fillRect(ox, oy, oW, oH);
            octx.restore();
          }
        }
      } else if (node.effect === "halation") {
        const strength = clamp01(Number(p.halation_strength ?? 0.55) * kfMul);
        const radius = Math.min(20, Math.max(2, Number(p.halation_radius ?? 10)));
        if (strength > 0.005) {
          const halCanvas = buf
            ? (_halScratchCanvas = ensureScratchCanvas(_halScratchCanvas, bw, bh))
            : null;
          if (halCanvas && buf && typeof octx.filter === "string") {
            const hctx = halCanvas.getContext("2d");
            const blurPx = Math.max(2, Math.round(radius * Math.max(0.5, oW / 640)));
            hctx.save();
            hctx.setTransform(1, 0, 0, 1, 0, 0);
            hctx.globalCompositeOperation = "source-over";
            hctx.clearRect(0, 0, bw, bh);
            hctx.filter = `blur(${blurPx}px) brightness(1.22) contrast(1.45)`;
            hctx.drawImage(buf, 0, 0, bw, bh);
            hctx.filter = "none";
            hctx.globalCompositeOperation = "multiply";
            hctx.fillStyle = "rgb(255, 76, 22)";
            hctx.fillRect(0, 0, bw, bh);
            hctx.restore();

            octx.save();
            octx.globalCompositeOperation = "screen";
            octx.globalAlpha = Math.min(0.92, strength * 0.85);
            octx.drawImage(halCanvas, oOutX, oOutY, oOutW, oOutH);
            octx.restore();
          }
          const hx = ox + oW * 0.72 + shiftX;
          const hy = oy + oH * 0.30 + shiftY;
          const hr = Math.max(28, radius * 4.2 * Math.max(0.5, oW / 640));
          const hGrad = octx.createRadialGradient(hx, hy, 2, hx, hy, hr);
          hGrad.addColorStop(0, `rgba(255, 118, 48, ${(strength * 0.58).toFixed(3)})`);
          hGrad.addColorStop(0.38, `rgba(255, 58, 20, ${(strength * 0.34).toFixed(3)})`);
          hGrad.addColorStop(1, "rgba(255, 40, 12, 0)");
          octx.save();
          octx.globalCompositeOperation = "screen";
          octx.fillStyle = hGrad;
          octx.fillRect(ox, oy, oW, oH);
          octx.restore();
        }
      } else if (node.effect === "pro_mist") {
        const strength = clamp01(Number(p.diffusion_strength ?? 0.45) * kfMul);
        const radius = Math.min(24, Math.max(2, Number(p.bloom_radius ?? 8)));
        const warmth = Math.min(1, Math.max(-1, Number(p.warmth ?? 0.2)));
        if (strength > 0.005) {
          const tr = Math.round(255 - Math.max(0, -warmth) * 48);
          const tg = Math.round(244 - Math.abs(warmth) * 14);
          const tb = Math.round(230 - Math.max(0, warmth) * 68 + Math.max(0, -warmth) * 24);
          if (buf && typeof octx.filter === "string") {
            octx.save();
            octx.globalCompositeOperation = "screen";
            octx.globalAlpha = Math.min(0.75, strength * 0.65);
            const blurPx = Math.max(2, Math.round(radius * Math.max(0.5, oW / 640)));
            octx.filter = `blur(${blurPx}px) brightness(1.12) contrast(1.18)`;
            octx.drawImage(buf, oOutX, oOutY, oOutW, oOutH);
            octx.restore();
          }
          // Subtle shadow veil + warm/cool diffusion bloom
          octx.save();
          octx.globalCompositeOperation = "screen";
          octx.fillStyle = `rgba(${tr}, ${tg}, ${tb}, ${(strength * 0.14).toFixed(3)})`;
          octx.fillRect(ox, oy, oW, oH);
          const px = ox + oW * 0.65 + shiftX;
          const py = oy + oH * 0.35 + shiftY;
          const pr = Math.max(36, radius * 4.8 * Math.max(0.5, oW / 640));
          const pGrad = octx.createRadialGradient(px, py, 2, px, py, pr);
          pGrad.addColorStop(0, `rgba(${tr}, ${tg}, ${tb}, ${(strength * 0.42).toFixed(3)})`);
          pGrad.addColorStop(0.5, `rgba(${tr}, ${tg}, ${tb}, ${(strength * 0.18).toFixed(3)})`);
          pGrad.addColorStop(1, `rgba(${tr}, ${tg}, ${tb}, 0)`);
          octx.fillStyle = pGrad;
          octx.fillRect(ox, oy, oW, oH);
          octx.restore();
        }
      } else if (node.effect === "prism_leak") {
        const intensity = clamp01(Number(p.leak_intensity ?? 0.55) * kfMul);
        const corner = String(p.leak_corner ?? "top_left");
        const shiftPx = Math.round(Math.min(12, Math.max(0, Number(p.prism_shift_px ?? 4))));
        if (intensity > 0.005) {
          const coords = {
            top_left: [0.06, 0.06],
            top_right: [0.94, 0.06],
            bottom_left: [0.06, 0.94],
            bottom_right: [0.94, 0.94]
          };
          const [cxFrac, cyFrac] = coords[corner] || coords.top_left;
          const lx = ox + oW * cxFrac;
          const ly = oy + oH * cyFrac;
          const lr = Math.max(oW, oH) * 0.68;
          const leakGrad = octx.createRadialGradient(lx, ly, 2, lx, ly, lr);
          leakGrad.addColorStop(0, `rgba(255, 224, 150, ${(intensity * 0.78).toFixed(3)})`);
          leakGrad.addColorStop(0.32, `rgba(255, 138, 62, ${(intensity * 0.54).toFixed(3)})`);
          leakGrad.addColorStop(0.66, `rgba(218, 68, 132, ${(intensity * 0.24).toFixed(3)})`);
          leakGrad.addColorStop(1, "rgba(218, 68, 132, 0)");
          octx.save();
          octx.globalCompositeOperation = "screen";
          octx.fillStyle = leakGrad;
          octx.fillRect(ox, oy, oW, oH);
          if (shiftPx > 0) {
            const prismGrad = octx.createRadialGradient(
              lx + shiftPx * 2,
              ly + shiftPx,
              2,
              lx + shiftPx * 2,
              ly + shiftPx,
              lr * 0.55
            );
            prismGrad.addColorStop(0, `rgba(110, 210, 255, ${(intensity * 0.26).toFixed(3)})`);
            prismGrad.addColorStop(1, "rgba(110, 210, 255, 0)");
            octx.fillStyle = prismGrad;
            octx.fillRect(ox, oy, oW, oH);
          }
          octx.restore();
        }
      } else if (node.effect === "scanlines") {
        const spacing = Math.round(Math.min(12, Math.max(2, Number(p.line_spacing_px ?? 4))));
        const opacity = Math.min(0.9, Math.max(0.1, Number(p.opacity ?? 0.45))) * Math.min(1, kfMul);
        if (opacity > 0.005) {
          const stepPx = Math.max(2, Math.round(spacing * Math.max(0.5, oH / 360)));
          const lineH = stepPx >= 6 ? 2 : 1;
          octx.save();
          octx.fillStyle = `rgba(0, 0, 0, ${opacity.toFixed(3)})`;
          for (let y = oy; y < oy + oH; y += stepPx) {
            octx.fillRect(ox, y, oW, lineH);
          }
          octx.restore();
        }
      } else if (node.effect === "letterbox") {
        const parsedRatio = Number.parseFloat(String(p.ratio ?? "2.39"));
        const ratioVal = Number.isFinite(parsedRatio)
          ? Math.min(2.39, Math.max(1.85, parsedRatio))
          : 2.39;
        const frameAspect = oW / Math.max(1, oH);
        const barH = (frameAspect < ratioVal
          ? Math.max(0, (oH - oW / ratioVal) * 0.5)
          : 0) * Math.min(1, kfMul);
        if (barH >= 0.5) {
          octx.save();
          octx.fillStyle = "#000000";
          octx.fillRect(ox, oy, oW, barH);
          octx.fillRect(ox, oy + oH - barH, oW, barH);
          octx.restore();
        }
      }
    };

    const OVERLAY_FX_SET = new Set([
      "glow",
      "lens_flare",
      "flicker",
      "film_damage",
      "vignette",
      "film_grain",
      "optical_glow",
      "halation",
      "pro_mist",
      "prism_leak",
      "scanlines",
      "letterbox"
    ]);

    // Apply optical/lighting FX passes over the 16:9 frame
    if (!(pCkActive && pCkMatteView === "alpha_matte")) {
      for (const node of pActiveFx) {
        if (!OVERLAY_FX_SET.has(node.effect)) continue;
        const kfMul = evaluateNodeIntensity(node, tSec);
        if (kfMul <= 0.0001) continue;
        if (isEffectMaskActive(node)) {
          _fxMaskScratchCanvas = ensureScratchCanvas(_fxMaskScratchCanvas, bw, bh);
          if (_fxMaskScratchCanvas) {
            const mctx = _fxMaskScratchCanvas.getContext("2d");
            const tfm = ctx.getTransform();
            const sx = tfm.a || 1;
            const sy = tfm.d || 1;
            mctx.save();
            mctx.setTransform(1, 0, 0, 1, 0, 0);
            mctx.clearRect(0, 0, bw, bh);
            mctx.drawImage(ctx.canvas, fx * sx, fy * sy, frameW * sx, frameH * sy, 0, 0, bw, bh);
            mctx.restore();
            const dryImg = mctx.getImageData(0, 0, bw, bh);
            renderOverlayFxNode(
              mctx,
              0,
              0,
              bw,
              bh,
              fxOutX - fx,
              fxOutY - fy,
              fxOutW,
              fxOutH,
              node,
              kfMul
            );
            const wetImg = mctx.getImageData(0, 0, bw, bh);
            blendImageDataWithEffectMask(dryImg, wetImg, bw, bh, node.effect_mask);
            mctx.putImageData(wetImg, 0, 0);
            ctx.save();
            ctx.drawImage(_fxMaskScratchCanvas, fx, fy, frameW, frameH);
            ctx.restore();
            continue;
          }
        }
        renderOverlayFxNode(ctx, fx, fy, frameW, frameH, fxOutX, fxOutY, fxOutW, fxOutH, node, kfMul);
      }
      // Draw crisp dashed roto mask overlays for active masked FX nodes
      for (const node of pActiveFx) {
        if (!isEffectMaskActive(node)) continue;
        const m = node.effect_mask;
        const cx = fx + Math.min(0.95, Math.max(0.05, Number(m.center_x ?? 0.5))) * frameW;
        const cy = fy + Math.min(0.95, Math.max(0.05, Number(m.center_y ?? 0.5))) * frameH;
        const rx = Math.min(0.95, Math.max(0.05, Number(m.radius_x ?? 0.35))) * frameW;
        const ry = Math.min(0.95, Math.max(0.05, Number(m.radius_y ?? 0.35))) * frameH;
        ctx.save();
        ctx.beginPath();
        ctx.rect(fx, fy, frameW, frameH);
        ctx.clip();
        ctx.strokeStyle = m.invert ? "rgba(245, 158, 11, 0.85)" : "rgba(45, 212, 191, 0.85)";
        ctx.lineWidth = 1.4;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        if (m.shape === "ellipse") {
          ctx.ellipse(cx, cy, Math.max(4, rx), Math.max(4, ry), 0, 0, Math.PI * 2);
        } else {
          ctx.rect(cx - rx, cy - ry, Math.max(8, rx * 2), Math.max(8, ry * 2));
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy);
        ctx.lineTo(cx + 5, cy);
        ctx.moveTo(cx, cy - 5);
        ctx.lineTo(cx, cy + 5);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Composite Title & Lower-Third / Subtitle overlays (suppressed in Keyer Studio mode so matte & checkerboard stay clean)
    const suppressForKeyer = Boolean(pCkRaw && pCkRaw.enabled);
    const titleOnAir = suppressForKeyer
      ? false
      : drawTitleOverlayOnFrame(ctx, fx, fy, frameW, frameH, passTitleState, tSec, renderOpts);

    const lowerThirdState = renderOpts && renderOpts.lowerThird ? renderOpts.lowerThird : null;
    const lowerThirdOnAir = suppressForKeyer
      ? false
      : drawLowerThirdOverlayOnFrame(ctx, fx, fy, frameW, frameH, lowerThirdState, tSec);

    const activeSubCue = suppressForKeyer
      ? null
      : drawSubtitleOverlayOnFrame(ctx, fx, fy, frameW, frameH, passSubState, tSec);

    return { titleOnAir, lowerThirdOnAir, activeSubCue };
  };

  ctx.save();
  ctx.beginPath();
  ctx.rect(fx, fy, frameW, frameH);
  ctx.clip();

  let titleOnAir = false;
  let lowerThirdOnAir = false;
  let activeSubCue = null;
  let wipeGeom = null;

  if (wipeActive) {
    wipeGeom = computeSplitWipeGeometry(fx, fy, frameW, frameH, splitWipeState.positionPct);
    if (wipeGeom.leftRect.width > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(
        wipeGeom.leftRect.x,
        wipeGeom.leftRect.y,
        wipeGeom.leftRect.width,
        wipeGeom.leftRect.height
      );
      ctx.clip();
      renderScenePass(null, { nodes: [], bypassAll: true }, null, null, ckRaw);
      ctx.restore();
    }
    if (wipeGeom.rightRect.width > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(
        wipeGeom.rightRect.x,
        wipeGeom.rightRect.y,
        wipeGeom.rightRect.width,
        wipeGeom.rightRect.height
      );
      ctx.clip();
      const afterMeta = renderScenePass(cdl, fxState, titleState, subtitleState, chromaKeyState);
      titleOnAir = afterMeta.titleOnAir;
      lowerThirdOnAir = afterMeta.lowerThirdOnAir;
      activeSubCue = afterMeta.activeSubCue;
      ctx.restore();
    }
    canvas._splitWipeGeom = {
      ...wipeGeom,
      canvasWidth: width,
      canvasHeight: height
    };
  } else {
    const passMeta = renderScenePass(cdl, fxState, titleState, subtitleState, chromaKeyState);
    titleOnAir = passMeta.titleOnAir;
    lowerThirdOnAir = passMeta.lowerThirdOnAir;
    activeSubCue = passMeta.activeSubCue;
    canvas._splitWipeGeom = null;
  }

  const topPillOffset = wipeActive ? 32 : 16;
  let leftPillY = fy + topPillOffset;
  if (titleState && titleState.showBadge) {
    const label = titleState.enabled === false
      ? "TITLE: BYPASSED"
      : titleOnAir
        ? "TITLE: ON AIR"
        : `TITLE: ${Number(titleState.start_s ?? 0).toFixed(1)}s-${Number(titleState.end_s ?? 0).toFixed(1)}s`;
    ctx.font = "700 10px ui-monospace, monospace";
    const tw = Math.min(frameW - 20, ctx.measureText(label).width + 12);
    ctx.fillStyle = titleOnAir ? "rgba(63, 185, 80, 0.90)" : "rgba(20, 20, 22, 0.84)";
    ctx.fillRect(fx + 8, leftPillY, tw, 17);
    ctx.fillStyle = titleOnAir ? "#111114" : "#a4a4ae";
    ctx.fillText(label, fx + 14, leftPillY + 12);
    leftPillY += 20;
  }

  if (lowerThirdOnAir) {
    const ltLabel = "LT: ON AIR";
    ctx.font = "700 10px ui-monospace, monospace";
    const tw = Math.min(frameW - 20, ctx.measureText(ltLabel).width + 12);
    ctx.fillStyle = "rgba(230, 132, 66, 0.92)";
    ctx.fillRect(fx + 8, leftPillY, tw, 17);
    ctx.fillStyle = "#111114";
    ctx.fillText(ltLabel, fx + 14, leftPillY + 12);
    leftPillY += 20;
  }

  if (subtitleState && subtitleState.showBadge) {
    const cuesLen = Array.isArray(subtitleState.cues) ? subtitleState.cues.length : 0;
    const subLabel = subtitleState.enabled === false
      ? "SUB: BYPASSED"
      : activeSubCue
        ? `SUB: CUE #${activeSubCue.index || 1}`
        : cuesLen > 0
          ? `SUB: STANDBY (${cuesLen})`
          : "SUB: EMPTY";
    ctx.font = "700 10px ui-monospace, monospace";
    const tw = Math.min(frameW - 20, ctx.measureText(subLabel).width + 12);
    ctx.fillStyle = activeSubCue ? "rgba(104, 156, 255, 0.92)" : "rgba(20, 20, 22, 0.84)";
    ctx.fillRect(fx + 8, leftPillY, tw, 17);
    ctx.fillStyle = activeSubCue ? "#111114" : "#a4a4ae";
    ctx.fillText(subLabel, fx + 14, leftPillY + 12);
    leftPillY += 20;
  }

  if (activeTrans) {
    const pct = Math.round(clamp01(activeTrans.progress) * 100);
    const label = `TRANS: ${getTransitionPresetName(activeTrans.transition.preset).toUpperCase()} ${pct}% (${activeTrans.transition.duration_s.toFixed(2)}s)`;
    ctx.font = "700 10px ui-monospace, monospace";
    const tw = Math.min(frameW - 20, ctx.measureText(label).width + 12);
    ctx.fillStyle = "rgba(230, 132, 66, 0.94)";
    ctx.fillRect(fx + 8, leftPillY, tw, 17);
    ctx.fillStyle = "#111114";
    ctx.fillText(label, fx + 14, leftPillY + 12);
  }

  // FX, Chroma Key, Stabilizer & Planar Tracker telemetry pill inside Program Monitor corner
  if (rawNodes.length > 0 || (ckRaw && ckRaw.enabled) || stabActive || trkActive) {
    const parts = [];
    if (stabActive && stabRaw) {
      parts.push(`STAB ${Math.round(stabRaw.auto_zoom_pct)}%`);
    }
    if (trkActive && trkRaw) {
      parts.push(
        trkRaw.mode === "point_track_only"
          ? `TRK ${trkRaw.track_keyframes.length}KF`
          : trkRaw.mode === "rectify_perspective"
            ? "RECTIFY"
            : "CORNER-PIN"
      );
    }
    if (ckRaw && ckRaw.enabled) {
      const hexTag = String(ckRaw.key_color || "#00b140").toUpperCase();
      parts.push(ckMatteView === "alpha_matte" ? `KEY ${hexTag} (ALPHA)` : `KEY ${hexTag}`);
    }
    if (activeFx.length > 0) {
      parts.push(
        `${activeFx.map((n) => n.effect.toUpperCase()).slice(0, 2).join(" + ")}${activeFx.length > 2 ? " +" : ""}`
      );
    }
    const label = bypassAll
      ? "FX: BYPASSED (A/B)"
      : parts.length > 0
        ? `FX: ${parts.join(" + ")}`
        : "FX: ALL OFF";
    ctx.font = "700 10px ui-monospace, monospace";
    const tw = Math.min(frameW - 20, ctx.measureText(label).width + 12);
    const fxPillY = fy + topPillOffset;
    ctx.fillStyle = bypassAll || parts.length === 0
      ? "rgba(20, 20, 22, 0.84)"
      : ckActive
        ? "rgba(63, 185, 80, 0.92)"
        : "rgba(230, 132, 66, 0.92)";
    ctx.fillRect(fx + frameW - tw - 8, fxPillY, tw, 17);
    ctx.fillStyle = bypassAll || parts.length === 0 ? "#a4a4ae" : "#111114";
    ctx.fillText(label, fx + frameW - tw - 2, fxPillY + 12);
  }

  // Planar Tracker & 4-Corner Pin interactive overlay
  const showTrackerHud =
    trkActive &&
    trkRaw &&
    !(ckActive && ckMatteView === "alpha_matte") &&
    (!renderOpts || renderOpts.showPlanarTrackerOverlay !== false);
  if (showTrackerHud) {
    const trkGeom = drawPlanarTrackerOverlay(
      ctx,
      fx,
      fy,
      frameW,
      frameH,
      trkRaw,
      playheadFrame
    );
    canvas._planarTrackerGeom = {
      ...trkGeom,
      canvasWidth: width,
      canvasHeight: height
    };
  } else {
    canvas._planarTrackerGeom = null;
  }

  // Auto-Reframe & Social Aspect Ratio Crop overlay
  const reframeState = renderOpts && renderOpts.reframe ? renderOpts.reframe : null;
  drawReframeOverlayOnFrame(ctx, fx, fy, frameW, frameH, reframeState);

  // Cinematic Vignette preview overlay
  const vignetteState = renderOpts && renderOpts.vignette ? renderOpts.vignette : null;
  drawCinematicVignetteOverlayOnFrame(ctx, fx, fy, frameW, frameH, vignetteState);

  // Store Title Motion Graphics hit-test box for interactive viewer dragging
  if (renderOpts && renderOpts.showTitleGizmo && titleState) {
    const anchor = computeTitleOverlayAnchorBox(titleState);
    canvas._titleGizmoGeom = {
      fx,
      fy,
      frameW,
      frameH,
      boxX: fx + frameW * anchor.boxX,
      boxY: fy + frameH * anchor.boxY,
      boxW: frameW * anchor.boxW,
      boxH: frameH * anchor.boxH,
      cx: anchor.cx,
      cy: anchor.cy,
      canvasWidth: width,
      canvasHeight: height
    };
  } else {
    canvas._titleGizmoGeom = null;
  }

  // Film Grain (35mm / 16mm / Super 8) preview overlay
  const filmGrainState = renderOpts && renderOpts.filmGrain ? renderOpts.filmGrain : null;
  drawFilmGrainOverlayOnFrame(ctx, fx, fy, frameW, frameH, filmGrainState, playheadFrame);

  // Broadcast & Social Safe-Area Guides (Action 90%, Title 80%, Reels/TikTok HUD)
  drawSafeAreaGuides(ctx, fx, fy, frameW, frameH, framingState);

  if (renderOpts && renderOpts.dveSplitGrid) {
    drawSplitScreenGridGuide(ctx, fx, fy, frameW, frameH);
  }

  const showDveOverlay = Boolean(
    renderOpts &&
      renderOpts.dveOverlay &&
      renderOpts.selectedDveClip &&
      !(ckActive && ckMatteView === "alpha_matte")
  );
  if (showDveOverlay) {
    const dveGeom = drawDveTransformOverlay(
      ctx,
      fx,
      fy,
      frameW,
      frameH,
      renderOpts.selectedDveClip,
      playheadFrame,
      fps
    );
    canvas._dveTransformGeom = {
      ...dveGeom,
      canvasWidth: width,
      canvasHeight: height
    };
  } else {
    canvas._dveTransformGeom = null;
  }

  if (wipeActive && wipeGeom) {
    drawSplitWipeOverlay(ctx, fx, fy, frameW, frameH, wipeGeom, splitWipeState);
  }

  const mcQuadBank =
    renderOpts &&
    renderOpts.multicamQuadView &&
    renderOpts.multicamClip &&
    renderOpts.multicamClip.multicam_bank
      ? renderOpts.multicamClip.multicam_bank
      : null;

  if (mcQuadBank) {
    const quadGeom = drawMulticamQuadSwitcherOverlay(
      ctx,
      fx,
      fy,
      frameW,
      frameH,
      renderOpts.multicamClip,
      mcQuadBank,
      playheadFrame,
      fps,
      renderOpts.multicamHoveredAngle || null
    );
    canvas._multicamQuadGeom = {
      ...quadGeom,
      canvasWidth: width,
      canvasHeight: height
    };
  } else {
    canvas._multicamQuadGeom = null;
    if (renderOpts && renderOpts.trimMonitorState) {
      drawFourUpTrimMonitorOverlay(
        ctx,
        fx,
        fy,
        frameW,
        frameH,
        doc,
        cdl,
        framingMode,
        srcAspect,
        targetAspect,
        renderOpts.trimMonitorState,
        fps
      );
    } else {
      const activeMcEntry = activeClips.find((entry) => entry.clip && entry.clip.multicam_bank);
      if (activeMcEntry && activeMcEntry.clip && activeMcEntry.clip.multicam_bank) {
        drawMulticamActiveAngleBadge(
          ctx,
          fx,
          fy,
          frameW,
          activeMcEntry.clip,
          activeMcEntry.clip.multicam_bank,
          playheadFrame
        );
      }
    }
  }

  if (renderOpts && renderOpts.trimHud && renderOpts.trimHud.label) {
    const hud = renderOpts.trimHud;
    const hudText = hud.detail ? `${hud.label}  |  ${hud.detail}` : hud.label;
    ctx.save();
    ctx.font = "700 10.5px ui-monospace, monospace";
    const textW = ctx.measureText(hudText).width;
    const boxW = Math.min(frameW - 16, Math.max(110, textW + 20));
    const boxH = 22;
    const boxX = fx + (frameW - boxW) * 0.5;
    const boxY = fy + frameH - boxH - 10;
    ctx.fillStyle = "rgba(14, 15, 19, 0.92)";
    roundRectPath(ctx, boxX, boxY, boxW, boxH, 3);
    ctx.fill();
    ctx.strokeStyle = hud.color || "#f59e0b";
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.fillStyle = hud.color || "#ffd8a8";
    ctx.textAlign = "center";
    ctx.fillText(hudText, fx + frameW * 0.5, boxY + 14.5, boxW - 12);
    ctx.restore();
  }

  // Media Pool Pro: Offline slate & Proxy Mode HUD
  const offlineActive = activeClips.find((entry) => entry.clip && entry.clip.media_offline);
  if (offlineActive) {
    ctx.save();
    ctx.fillStyle = "rgba(42, 10, 14, 0.88)";
    ctx.fillRect(fx, fy, frameW, frameH);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.strokeRect(fx + 2, fy + 2, frameW - 4, frameH - 4);
    ctx.fillStyle = "#fca5a5";
    ctx.font = "800 14px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("MEDIA OFFLINE", fx + frameW * 0.5, fy + frameH * 0.5 - 10);
    ctx.fillStyle = "#f87171";
    ctx.font = "600 10px ui-monospace, monospace";
    ctx.fillText(
      String(offlineActive.clip.source_path || offlineActive.clip.name || ""),
      fx + frameW * 0.5,
      fy + frameH * 0.5 + 12,
      frameW - 24
    );
    ctx.restore();
  } else if (renderOpts && renderOpts.proxyModeEnabled) {
    const pxyClip = activeClips.find((entry) => entry.clip && entry.clip.proxy_path);
    if (pxyClip && pxyClip.clip) {
      const scaleLbl = pxyClip.clip.proxy_scale === "quarter" ? "1/4" : "1/2";
      const pxyText = `PROXY ON (${scaleLbl})`;
      ctx.save();
      ctx.font = "700 9.5px ui-monospace, monospace";
      const pw = ctx.measureText(pxyText).width + 14;
      const px = fx + frameW - pw - 8;
      const py = fy + 8;
      ctx.fillStyle = "rgba(15, 23, 34, 0.90)";
      roundRectPath(ctx, px, py, pw, 18, 2);
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#7dd3fc";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pxyText, px + pw * 0.5, py + 9.5);
      ctx.restore();
    }
  }

  ctx.restore();

  // Frame border
  ctx.strokeStyle = "#2c2c31";
  ctx.lineWidth = 1;
  ctx.strokeRect(fx, fy, frameW, frameH);
}

function drawFourUpTrimMonitorOverlay(
  ctx,
  fx,
  fy,
  frameW,
  frameH,
  doc,
  cdl,
  framingMode,
  srcAspect,
  targetAspect,
  trimState,
  fps
) {
  const tiles = Array.isArray(trimState && trimState.tiles) ? trimState.tiles : [];
  if (tiles.length === 0) return;
  const isTwoUp = trimState.layout === "2up" || tiles.length <= 2;
  const cols = 2;
  const rows = isTwoUp ? 1 : 2;
  const pad = 4;
  const gap = 4;
  const headerH = 20;
  const bodyY = fy + headerH + pad;
  const bodyH = Math.max(40, frameH - headerH - pad * 2);
  const cellW = Math.max(40, (frameW - pad * 2 - gap * (cols - 1)) / cols);
  const cellH = Math.max(30, (bodyH - gap * (rows - 1)) / rows);

  ctx.save();
  ctx.fillStyle = "#0b0c10";
  ctx.fillRect(fx, fy, frameW, frameH);

  // Top Trim Monitor Header Strip
  ctx.fillStyle = "#16171d";
  ctx.fillRect(fx, fy, frameW, headerH);
  ctx.strokeStyle = "#2d2e36";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(fx, fy + headerH);
  ctx.lineTo(fx + frameW, fy + headerH);
  ctx.stroke();

  const modeTitle = isTwoUp ? "2-UP TRIM MONITOR" : "4-UP TRIM MONITOR";
  const opTag = String(trimState.mode || "select").toUpperCase();
  const deltaStr =
    trimState.deltaFrames !== 0
      ? ` ${trimState.deltaFrames > 0 ? `+${trimState.deltaFrames}` : trimState.deltaFrames}f`
      : "";
  ctx.fillStyle = "#e68442";
  ctx.font = "700 9.5px ui-monospace, monospace";
  ctx.fillText(`${modeTitle} | ${opTag}${deltaStr}`, fx + 8, fy + 13.5);

  const sp = trimState.splitInfo;
  let syncPillText = "AV UNLINKED";
  let syncPillColor = "#8e8e98";
  if (sp && sp.linked) {
    if (sp.in_offset_frames === 0 && sp.out_offset_frames === 0) {
      syncPillText = `LINK ${sp.link_group_id} SYNCED`;
      syncPillColor = "#38e08d";
    } else if (sp.in_offset_frames !== 0 && sp.out_offset_frames === 0) {
      syncPillText = `J-CUT ${sp.in_offset_frames > 0 ? `+${sp.in_offset_frames}` : sp.in_offset_frames}f`;
      syncPillColor = "#39c5cf";
    } else if (sp.out_offset_frames !== 0 && sp.in_offset_frames === 0) {
      syncPillText = `L-CUT ${sp.out_offset_frames > 0 ? `+${sp.out_offset_frames}` : sp.out_offset_frames}f`;
      syncPillColor = "#f59e0b";
    } else {
      syncPillText = `J:${sp.in_offset_frames}f L:${sp.out_offset_frames}f`;
      syncPillColor = "#ffd166";
    }
  }
  ctx.font = "700 9px ui-monospace, monospace";
  const pillW = Math.ceil(ctx.measureText(syncPillText).width) + 12;
  const pillX = fx + frameW - pillW - 6;
  ctx.fillStyle = "rgba(18, 20, 26, 0.92)";
  roundRectPath(ctx, pillX, fy + 3, pillW, 14, 2);
  ctx.fill();
  ctx.strokeStyle = syncPillColor;
  ctx.stroke();
  ctx.fillStyle = syncPillColor;
  ctx.fillText(syncPillText, pillX + 6, fy + 13);

  const maxCells = cols * rows;
  for (let i = 0; i < maxCells; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = fx + pad + col * (cellW + gap);
    const cy = bodyY + row * (cellH + gap);
    const tile = tiles[i] || null;

    ctx.save();
    ctx.beginPath();
    ctx.rect(cx, cy, cellW, cellH);
    ctx.clip();

    if (tile && tile.clip) {
      ctx.save();
      ctx.translate(cx, cy);
      drawFramedBaseScene(
        ctx,
        cellW,
        cellH,
        doc,
        tile.frame,
        cdl,
        [{ track: tile.track, clip: tile.clip }],
        framingMode,
        srcAspect,
        targetAspect,
        null
      );
      ctx.restore();
    } else {
      ctx.fillStyle = "#121318";
      ctx.fillRect(cx, cy, cellW, cellH);
      ctx.strokeStyle = "#262730";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + cellW, cy + cellH);
      ctx.moveTo(cx + cellW, cy);
      ctx.lineTo(cx, cy + cellH);
      ctx.stroke();
      ctx.fillStyle = "#7a7a86";
      ctx.font = "700 9.5px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("NO ADJACENT CLIP", cx + cellW * 0.5, cy + cellH * 0.5 + 3);
      ctx.textAlign = "left";
    }

    // Role Badge top-left
    const accent = (tile && tile.accent) || "#8e8e98";
    const roleLabel = (tile && tile.role) || `PANE ${i + 1}`;
    ctx.font = "700 8.5px ui-monospace, monospace";
    const rW = Math.ceil(ctx.measureText(roleLabel).width) + 10;
    ctx.fillStyle = "rgba(12, 13, 18, 0.88)";
    roundRectPath(ctx, cx + 5, cy + 5, rW, 14, 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillText(roleLabel, cx + 10, cy + 14.5);

    // Bottom info footer
    ctx.fillStyle = "rgba(10, 11, 15, 0.84)";
    ctx.fillRect(cx, cy + cellH - 18, cellW, 18);
    if (tile && tile.clip) {
      const tcStr = framesToSmpte(tile.frame, doc.fps?.num || Math.round(fps), doc.fps?.den || 1);
      ctx.fillStyle = "#e4e4ea";
      ctx.font = "600 9px system-ui, sans-serif";
      ctx.fillText(String(tile.clip.name || "").slice(0, 18), cx + 6, cy + cellH - 6);
      ctx.fillStyle = accent;
      ctx.font = "700 8.5px ui-monospace, monospace";
      const rightLabel = `${tcStr} | SRC ${tile.sourceFrame}f`;
      const rlW = ctx.measureText(rightLabel).width;
      if (cellW > 130) {
        ctx.fillText(rightLabel, cx + cellW - rlW - 6, cy + cellH - 6);
      }
    }

    ctx.restore();
    ctx.strokeStyle = (tile && tile.clip) ? accent : "#2c2c34";
    ctx.lineWidth = 1.25;
    ctx.strokeRect(cx, cy, cellW, cellH);
  }

  ctx.restore();
}

const MULTICAM_PALETTE = {
  blue: { border: "#60a5fa", fill: "rgba(37, 99, 235, 0.22)", badge: "#1d4ed8", text: "#dbeafe" },
  teal: { border: "#2dd4bf", fill: "rgba(20, 184, 166, 0.22)", badge: "#0f766e", text: "#ccfbf1" },
  amber: { border: "#fbbf24", fill: "rgba(245, 158, 11, 0.22)", badge: "#b45309", text: "#fef3c7" },
  violet: { border: "#a78bfa", fill: "rgba(139, 92, 246, 0.22)", badge: "#6d28d9", text: "#ede9fe" }
};

function resolveMulticamCutAtFrameCanvas(bank, localFrame) {
  const cuts = Array.isArray(bank && bank.cuts) && bank.cuts.length
    ? [...bank.cuts].sort((a, b) => a.frame - b.frame)
    : [{ frame: 0, angle_index: 1, cut_mode: "video_only" }];
  const target = Math.max(0, Math.round(localFrame || 0));
  let active = cuts[0];
  for (const cut of cuts) {
    if (cut.frame <= target) {
      active = cut;
    } else {
      break;
    }
  }
  return active;
}

function drawMulticamActiveAngleBadge(ctx, fx, fy, frameW, clip, bank, playheadFrame) {
  const localFrame = Math.max(0, Math.min((bank.duration_frames || 1) - 1, playheadFrame - (clip.start_frame || 0)));
  const activeCut = resolveMulticamCutAtFrameCanvas(bank, localFrame);
  const angle = (bank.angles || []).find((a) => a.angle_index === activeCut.angle_index) || (bank.angles || [])[0];
  if (!angle) return;
  const pal = MULTICAM_PALETTE[angle.color_tag] || MULTICAM_PALETTE.blue;
  const offStr = `${angle.sync_offset_frames >= 0 ? "+" : ""}${angle.sync_offset_frames || 0}f`;
  const text = `MC A${angle.angle_index} ${angle.name.slice(0, 18)} | ${offStr}`;
  ctx.save();
  ctx.font = "700 10px ui-monospace, monospace";
  const bw = Math.min(frameW - 16, Math.ceil(ctx.measureText(text).width) + 14);
  const bx = fx + frameW - bw - 8;
  const by = fy + 8;
  ctx.fillStyle = "rgba(14, 15, 20, 0.90)";
  roundRectPath(ctx, bx, by, bw, 18, 2);
  ctx.fill();
  ctx.strokeStyle = pal.border;
  ctx.lineWidth = 1.25;
  ctx.stroke();
  ctx.fillStyle = pal.text;
  ctx.fillText(text, bx + 7, by + 12.5, bw - 12);
  ctx.restore();
}

function drawMulticamQuadSwitcherOverlay(
  ctx,
  fx,
  fy,
  frameW,
  frameH,
  clip,
  bank,
  playheadFrame,
  fps,
  hoveredAngleIndex
) {
  const localFrame = Math.max(
    0,
    Math.min((bank.duration_frames || 1) - 1, playheadFrame - (clip.start_frame || 0))
  );
  const activeCut = resolveMulticamCutAtFrameCanvas(bank, localFrame);
  const angles = (bank.angles || []).slice(0, 4);
  const gap = 4;
  const pad = 4;
  const cellW = Math.max(40, (frameW - pad * 2 - gap) / 2);
  const cellH = Math.max(30, (frameH - pad * 2 - gap) / 2);
  const cells = [];
  const tSec = playheadFrame / Math.max(1, fps || 25);

  ctx.save();
  ctx.fillStyle = "#0b0c10";
  ctx.fillRect(fx, fy, frameW, frameH);

  const cameraLooks = [
    { scale: 1.0, cx: 0.5, cy: 0.52, sky: "#182942", floor: "#141820", accent: "#60a5fa" },
    { scale: 1.32, cx: 0.48, cy: 0.48, sky: "#143030", floor: "#121b1b", accent: "#2dd4bf" },
    { scale: 1.75, cx: 0.53, cy: 0.44, sky: "#332515", floor: "#1c1610", accent: "#fbbf24" },
    { scale: 1.15, cx: 0.5, cy: 0.62, sky: "#261c3c", floor: "#171322", accent: "#a78bfa" }
  ];

  for (let i = 0; i < 4; i += 1) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = fx + pad + col * (cellW + gap);
    const cy = fy + pad + row * (cellH + gap);
    const angle = angles[i] || null;
    const look = cameraLooks[i % cameraLooks.length];

    ctx.save();
    ctx.beginPath();
    ctx.rect(cx, cy, cellW, cellH);
    ctx.clip();

    const bgGrad = ctx.createLinearGradient(cx, cy, cx, cy + cellH);
    bgGrad.addColorStop(0, look.sky);
    bgGrad.addColorStop(0.62, "#13161f");
    bgGrad.addColorStop(1, look.floor);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(cx, cy, cellW, cellH);

    if (angle) {
      const pal = MULTICAM_PALETTE[angle.color_tag] || MULTICAM_PALETTE.blue;
      const isLive = activeCut.angle_index === angle.angle_index;
      const isHovered = hoveredAngleIndex === angle.angle_index;
      const pulse = 0.5 + 0.5 * Math.sin(tSec * 2.2 + i * 1.4);

      // Stylized camera framing geometry (horizon + talent silhouette + motion bar)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.10)";
      ctx.lineWidth = 1;
      const horizonY = cy + cellH * (0.58 + (i === 3 ? -0.14 : 0));
      ctx.beginPath();
      ctx.moveTo(cx, horizonY);
      ctx.lineTo(cx + cellW, horizonY);
      ctx.stroke();

      const subjX = cx + cellW * look.cx + Math.sin(tSec * 1.1 + i * 0.9) * (cellW * 0.03);
      const subjY = cy + cellH * look.cy;
      const subjR = Math.min(cellW, cellH) * 0.11 * look.scale;
      ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
      ctx.beginPath();
      ctx.arc(subjX, subjY - subjR * 0.55, subjR * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(subjX, subjY + subjR * 0.55, subjR * 0.72, subjR * 0.58, 0, Math.PI, 0);
      ctx.fill();

      // Viewfinder rule-of-thirds corner brackets
      ctx.strokeStyle = isLive ? "rgba(239, 68, 68, 0.75)" : "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 1;
      const bLen = Math.max(6, Math.min(12, cellW * 0.06));
      ctx.beginPath();
      ctx.moveTo(cx + 8, cy + 8 + bLen);
      ctx.lineTo(cx + 8, cy + 8);
      ctx.lineTo(cx + 8 + bLen, cy + 8);
      ctx.moveTo(cx + cellW - 8 - bLen, cy + cellH - 8);
      ctx.lineTo(cx + cellW - 8, cy + cellH - 8);
      ctx.lineTo(cx + cellW - 8, cy + cellH - 8 - bLen);
      ctx.stroke();

      // Mini synced audio activity bars bottom-right
      const barBaseX = cx + cellW - 36;
      const barBaseY = cy + cellH - 8;
      for (let b = 0; b < 5; b += 1) {
        const amp = Math.max(2, Math.round(3 + 8 * Math.abs(Math.sin(tSec * 5.2 + i * 1.3 + b * 0.7)) * (0.6 + 0.4 * pulse)));
        ctx.fillStyle = isLive ? "#ef4444" : pal.border;
        ctx.fillRect(barBaseX + b * 5, barBaseY - amp, 3, amp);
      }

      // Top-left angle badge
      const labelTxt = `${angle.angle_index}  ${angle.name.slice(0, 16)}`;
      ctx.font = "700 9.5px ui-monospace, monospace";
      const tw = Math.min(cellW - 54, ctx.measureText(labelTxt).width + 10);
      ctx.fillStyle = "rgba(12, 13, 18, 0.86)";
      roundRectPath(ctx, cx + 6, cy + 6, tw, 16, 2);
      ctx.fill();
      ctx.fillStyle = pal.text;
      ctx.fillText(labelTxt, cx + 10, cy + 17, tw - 6);

      // Sync offset + slate pill bottom-left
      const offVal = Number(angle.sync_offset_frames || 0);
      const offTxt = `${offVal >= 0 ? "+" : ""}${offVal}f | ${angle.timecode_start || "01:00:00:00"}`;
      ctx.font = "600 8.5px ui-monospace, monospace";
      const ow = Math.min(cellW - 48, ctx.measureText(offTxt).width + 8);
      ctx.fillStyle = "rgba(12, 13, 18, 0.80)";
      ctx.fillRect(cx + 6, cy + cellH - 20, ow, 14);
      ctx.fillStyle = "#b8bcc8";
      ctx.fillText(offTxt, cx + 10, cy + cellH - 10, ow - 6);

      // LIVE Program Tally badge top-right
      if (isLive) {
        ctx.fillStyle = "#dc2626";
        roundRectPath(ctx, cx + cellW - 42, cy + 6, 36, 16, 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "800 9px ui-monospace, monospace";
        ctx.fillText("LIVE", cx + cellW - 36, cy + 17);
      } else {
        ctx.fillStyle = "rgba(17, 19, 26, 0.82)";
        roundRectPath(ctx, cx + cellW - 36, cy + 6, 30, 16, 2);
        ctx.fill();
        ctx.fillStyle = "#94a3b8";
        ctx.font = "700 8.5px ui-monospace, monospace";
        ctx.fillText(`KEY ${angle.angle_index}`, cx + cellW - 33, cy + 17);
      }

      ctx.restore();

      // Border tally (Red = Live Program, Cyan = Hover, Angle color = idle)
      ctx.strokeStyle = isLive ? "#ef4444" : isHovered ? "#38bdf8" : pal.border;
      ctx.lineWidth = isLive ? 2.5 : isHovered ? 2 : 1;
      ctx.strokeRect(cx + 0.5, cy + 0.5, cellW - 1, cellH - 1);

      cells.push({
        angleIndex: angle.angle_index,
        x: cx,
        y: cy,
        w: cellW,
        h: cellH
      });
    } else {
      ctx.fillStyle = "#4b5563";
      ctx.font = "700 10px ui-monospace, monospace";
      ctx.fillText(`ANGLE ${i + 1} EMPTY`, cx + 10, cy + 20);
      ctx.restore();
      ctx.strokeStyle = "#262833";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx + 0.5, cy + 0.5, cellW - 1, cellH - 1);
    }
  }

  ctx.restore();
  return { fx, fy, frameW, frameH, cells };
}

function drawSplitScreenGridGuide(ctx, fx, fy, frameW, frameH) {
  ctx.save();
  ctx.strokeStyle = "rgba(104, 156, 255, 0.55)";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);

  // 50% vertical & horizontal split center axes
  const midX = fx + frameW * 0.5;
  const midY = fy + frameH * 0.5;
  ctx.beginPath();
  ctx.moveTo(midX, fy);
  ctx.lineTo(midX, fy + frameH);
  ctx.moveTo(fx, midY);
  ctx.lineTo(fx + frameW, midY);
  ctx.stroke();

  // Quadrant center crosshairs (25% / 75%)
  ctx.strokeStyle = "rgba(104, 156, 255, 0.35)";
  ctx.setLineDash([2, 4]);
  for (const qx of [0.25, 0.75]) {
    for (const qy of [0.25, 0.75]) {
      const px = fx + frameW * qx;
      const py = fy + frameH * qy;
      ctx.beginPath();
      ctx.moveTo(px - 8, py);
      ctx.lineTo(px + 8, py);
      ctx.moveTo(px, py - 8);
      ctx.lineTo(px, py + 8);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawDveTransformOverlay(ctx, fx, fy, frameW, frameH, clip, playheadFrame, fpsRate) {
  const clipLocalTimeS = clip ? Math.max(0, (playheadFrame - (clip.start_frame || 0)) / Math.max(1, fpsRate)) : 0;
  const tf = evaluateClipTransformAtTime(clip, clipLocalTimeS);
  const cl = (tf.crop_left_pct || 0) / 100.0;
  const cr = (tf.crop_right_pct || 0) / 100.0;
  const ct = (tf.crop_top_pct || 0) / 100.0;
  const cb = (tf.crop_bottom_pct || 0) / 100.0;
  const cropW = frameW * Math.max(0.15, 1.0 - cl - cr);
  const cropH = frameH * Math.max(0.15, 1.0 - ct - cb);
  const scale = tf.zoom_pct / 100.0;
  const boxW = cropW * scale;
  const boxH = cropH * scale;
  const cx = fx + frameW * 0.5 + (tf.pos_x_pct / 100.0) * frameW;
  const cy = fy + frameH * 0.5 + (tf.pos_y_pct / 100.0) * frameH;
  const rad = (tf.rotation_deg * Math.PI) / 180.0;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);

  const toWorld = (lx, ly) => ({
    x: cx + lx * cosR - ly * sinR,
    y: cy + lx * sinR + ly * cosR
  });

  const hw = boxW * 0.5;
  const hh = boxH * 0.5;
  const tl = toWorld(-hw, -hh);
  const tr = toWorld(hw, -hh);
  const br = toWorld(hw, hh);
  const bl = toWorld(-hw, hh);
  const topMid = toWorld(0, -hh);
  const rightMid = toWorld(hw, 0);
  const botMid = toWorld(0, hh);
  const leftMid = toWorld(-hw, 0);
  const rotStem = toWorld(0, -hh - 20);

  ctx.save();
  // Bounding box
  ctx.strokeStyle = "#e68442";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.closePath();
  ctx.stroke();

  // Rotation stem
  ctx.strokeStyle = "rgba(230, 132, 66, 0.85)";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(topMid.x, topMid.y);
  ctx.lineTo(rotStem.x, rotStem.y);
  ctx.stroke();

  // Center crosshair
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy);
  ctx.lineTo(cx + 6, cy);
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx, cy + 6);
  ctx.stroke();

  // Corner scale handles
  for (const pt of [tl, tr, br, bl]) {
    ctx.fillStyle = "#141416";
    ctx.strokeStyle = "#e68442";
    ctx.lineWidth = 1.5;
    ctx.fillRect(pt.x - 4, pt.y - 4, 8, 8);
    ctx.strokeRect(pt.x - 4, pt.y - 4, 8, 8);
  }

  // Edge crop handles
  for (const pt of [topMid, rightMid, botMid, leftMid]) {
    ctx.fillStyle = "#689cff";
    ctx.strokeStyle = "#141416";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Rotation handle
  ctx.fillStyle = "#e68442";
  ctx.strokeStyle = "#141416";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.arc(rotStem.x, rotStem.y, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Live compact HUD readout
  const hudText = `DVE ${Math.round(tf.zoom_pct)}% | ${tf.pos_x_pct >= 0 ? "+" : ""}${Math.round(tf.pos_x_pct)},${tf.pos_y_pct >= 0 ? "+" : ""}${Math.round(tf.pos_y_pct)}`;
  ctx.font = "700 10px ui-monospace, monospace";
  const tw = Math.min(frameW - 16, ctx.measureText(hudText).width + 10);
  const hx = Math.max(fx + 6, Math.min(fx + frameW - tw - 6, cx - tw * 0.5));
  const hy = Math.max(fy + 6, Math.min(fy + frameH - 22, bl.y + 8));
  ctx.fillStyle = "rgba(20, 20, 22, 0.88)";
  ctx.fillRect(hx, hy, tw, 16);
  ctx.fillStyle = "#e68442";
  ctx.fillText(hudText, hx + 5, hy + 11.5);
  ctx.restore();

  return {
    fx,
    fy,
    frameW,
    frameH,
    center: { x: cx, y: cy },
    boxW,
    boxH,
    rad,
    tf,
    handles: {
      tl,
      tr,
      br,
      bl,
      t: topMid,
      r: rightMid,
      b: botMid,
      l: leftMid,
      rot: rotStem,
      move: { x: cx, y: cy }
    }
  };
}

export function drawTimelineCanvas(canvas, doc, validation, opts) {
  const tracks = doc ? doc.tracks || [] : [];
  const rowCount = Math.max(1, tracks.length);
  const rulerHeight = 36;
  const trackHeight = 44;
  const padBottom = 12;
  const totalHeight = rulerHeight + rowCount * trackHeight + padBottom;

  const { ctx, width, height } = setupCanvas(canvas, totalHeight);
  const hitboxes = [];

  ctx.fillStyle = "#1a1a1d";
  ctx.fillRect(0, 0, width, height);

  if (!doc) {
    ctx.fillStyle = "#8e8e98";
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillText("No timeline loaded.", 14, 24);
    return {
      hitboxes,
      frameToX: null,
      xToFrame: null,
      xToRawFrame: null,
      pxPerFrame: 0,
      startFrame: 0,
      maxFrame: 0,
      rulerHeight,
      labelColW: 0
    };
  }

  const labelColW = width < 480 ? 74 : 136;
  const timelineX = labelColW;
  const timelineW = Math.max(120, width - labelColW - 10);
  const zoom = opts && opts.zoom ? opts.zoom : 1;

  let maxFrame = doc.start_frame || 0;
  for (const trk of tracks) {
    for (const c of trk.clips || []) {
      const endF = c.start_frame + c.duration_frames;
      if (endF > maxFrame) maxFrame = endF;
    }
  }
  for (const mk of doc.markers || []) {
    if (mk.frame + (mk.duration_frames || 1) > maxFrame) {
      maxFrame = mk.frame + (mk.duration_frames || 1);
    }
  }
  if (opts && typeof opts.fixedMaxFrame === "number" && opts.fixedMaxFrame > maxFrame) {
    maxFrame = opts.fixedMaxFrame;
  }
  const startFrame = doc.start_frame || 0;
  const viewport = computeTimelineZoomViewport(
    startFrame,
    maxFrame,
    zoom,
    null,
    opts && opts.viewStartFrame !== undefined ? opts.viewStartFrame : null
  );
  const viewStart = viewport.viewStartFrame;
  const visibleSpan = viewport.visibleSpan;
  const pxPerFrame = timelineW / visibleSpan;

  const frameToX = (f) => timelineX + (f - viewStart) * pxPerFrame;
  const xToRawFrame = (x) => viewStart + (x - timelineX) / pxPerFrame;
  const xToFrame = (x) =>
    Math.max(startFrame, Math.min(maxFrame, Math.round(xToRawFrame(x))));

  // Ruler header background
  ctx.fillStyle = "#252529";
  ctx.fillRect(0, 0, width, rulerHeight);
  ctx.strokeStyle = "#111114";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, rulerHeight);
  ctx.lineTo(width, rulerHeight);
  ctx.moveTo(labelColW, 0);
  ctx.lineTo(labelColW, height);
  ctx.stroke();

  ctx.fillStyle = "#8e8e98";
  ctx.font = "600 10px ui-monospace, monospace";
  ctx.fillText("TRACKS", 10, 22);

  // Ruler ticks clipped to track area (upper band, clear of lower playhead cap)
  const minTickPx = width < 500 ? 68 : 94;
  const rawStep = Math.max(1, Math.ceil(minTickPx / Math.max(0.01, pxPerFrame)));
  const niceSteps = [1, 5, 10, 25, 50, 100, 125, 250, 500, 1000, 2500, 5000];
  const stepFrames = niceSteps.find((s) => s >= rawStep) || rawStep;

  // BPM Beat-Sync Grid (precomputed when enabled)
  const bpmGrid = opts && opts.bpmGrid && opts.bpmGrid.enabled ? opts.bpmGrid : null;
  const beatTicks = bpmGrid
    ? computeBpmBeatFrames(doc, bpmGrid, Math.floor(viewStart), Math.ceil(viewStart + visibleSpan))
    : [];
  const beatSpacingPx =
    beatTicks.length >= 2
      ? Math.abs(frameToX(beatTicks[1].frame) - frameToX(beatTicks[0].frame))
      : beatTicks.length === 1
        ? 40
        : 0;

  ctx.font = "10px ui-monospace, monospace";
  ctx.save();
  ctx.beginPath();
  ctx.rect(timelineX, 0, timelineW, rulerHeight);
  ctx.clip();

  if (beatTicks.length > 0) {
    let lastBarLabelX = -100;
    for (const bt of beatTicks) {
      const bxRaw = frameToX(bt.frame);
      if (bxRaw < timelineX || bxRaw > timelineX + timelineW) continue;
      if (!bt.isDownbeat && beatSpacingPx < 10) continue;
      const bx = Math.round(bxRaw) + 0.5;
      ctx.strokeStyle = bt.isDownbeat
        ? "rgba(230, 184, 66, 0.78)"
        : "rgba(57, 197, 207, 0.44)";
      ctx.lineWidth = bt.isDownbeat ? 1.25 : 1;
      ctx.beginPath();
      ctx.moveTo(bx, bt.isDownbeat ? 19 : 26);
      ctx.lineTo(bx, rulerHeight);
      ctx.stroke();

      if (bt.isDownbeat && bxRaw - lastBarLabelX >= 32) {
        ctx.fillStyle = "rgba(230, 184, 66, 0.88)";
        ctx.font = "700 8.5px ui-monospace, monospace";
        ctx.fillText(`B${bt.bar}`, bxRaw + 3, 28);
        lastBarLabelX = bxRaw;
      }
    }
    ctx.font = "10px ui-monospace, monospace";
  }

  const firstTick = startFrame + Math.max(0, Math.floor((viewStart - startFrame) / stepFrames)) * stepFrames;
  for (let f = firstTick; f <= viewStart + visibleSpan + stepFrames; f += stepFrames) {
    const x = frameToX(f);
    if (x < timelineX || x > timelineX + timelineW - 4) continue;
    ctx.strokeStyle = "#34343c";
    ctx.beginPath();
    ctx.moveTo(x, 18);
    ctx.lineTo(x, rulerHeight);
    ctx.stroke();

    ctx.fillStyle = "#9696a0";
    const label = width < 520 ? `${f}f` : `${framesToSmpte(f, doc.fps.num, doc.fps.den)} (${f}f)`;
    if (x + ctx.measureText(label).width + 6 <= timelineX + timelineW) {
      ctx.fillText(label, x + 4, 13);
    }
  }

  // In/Out Range Highlight Band on Ruler
  const ioMetrics = computeInOutRangeMetrics(
    opts && opts.ioRange ? opts.ioRange : null,
    doc.fps,
    startFrame,
    maxFrame
  );
  const ioInX = ioMetrics.hasIn ? frameToX(ioMetrics.in_frame) : null;
  const ioOutX = ioMetrics.hasOut ? frameToX(ioMetrics.out_frame) : null;
  if (ioMetrics.isActive) {
    const rx0 = Math.max(timelineX, ioInX !== null ? ioInX : timelineX);
    const rx1 = Math.min(timelineX + timelineW, ioOutX !== null ? ioOutX : timelineX + timelineW);
    if (rx1 > rx0) {
      ctx.fillStyle = ioMetrics.isComplete ? "rgba(57, 197, 207, 0.16)" : "rgba(57, 197, 207, 0.08)";
      ctx.fillRect(rx0, 0, rx1 - rx0, rulerHeight);
      ctx.fillStyle = ioMetrics.isComplete ? "#39c5cf" : "rgba(57, 197, 207, 0.6)";
      ctx.fillRect(rx0, 0, rx1 - rx0, 2);
      ctx.fillRect(rx0, rulerHeight - 2, rx1 - rx0, 2);
    }
  }
  ctx.restore();

  // Track lanes and clips
  const selected = opts ? opts.selected : null;
  const anySolo = tracks.some((t) => Boolean(t && t.solo));
  const fpsFloat = doc.fps ? Math.max(1, doc.fps.num / Math.max(1, doc.fps.den)) : 25;

  tracks.forEach((trk, idx) => {
    const rowY = rulerHeight + idx * trackHeight;
    const isAudio = trk.kind === "audio";
    const isDirectMuted = Boolean(trk.muted);
    const isSolo = Boolean(trk.solo);
    const trackAudiblyMuted = isDirectMuted || (anySolo && !isSolo);

    // Track label rail
    ctx.fillStyle = trackAudiblyMuted ? "#1f1f24" : "#252529";
    ctx.fillRect(0, rowY, labelColW, trackHeight);

    // Track timeline surface
    ctx.fillStyle = trackAudiblyMuted
      ? "#161619"
      : idx % 2 === 0 ? "#1b1b1f" : "#1e1e22";
    ctx.fillRect(timelineX, rowY, width - timelineX, trackHeight);
    ctx.strokeStyle = "#111114";
    ctx.beginPath();
    ctx.moveTo(0, rowY + trackHeight);
    ctx.lineTo(width, rowY + trackHeight);
    ctx.stroke();

    // Subtle BPM beat lines across track lane behind clips
    if (beatTicks.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(timelineX, rowY, timelineW, trackHeight);
      ctx.clip();
      for (const bt of beatTicks) {
        const bxRaw = frameToX(bt.frame);
        if (bxRaw < timelineX || bxRaw > timelineX + timelineW) continue;
        if (!bt.isDownbeat && beatSpacingPx < 12) continue;
        const bx = Math.round(bxRaw) + 0.5;
        ctx.strokeStyle = bt.isDownbeat
          ? "rgba(230, 184, 66, 0.18)"
          : "rgba(57, 197, 207, 0.09)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx, rowY);
        ctx.lineTo(bx, rowY + trackHeight);
        ctx.stroke();
      }
      ctx.restore();
    }

    const transientPeaks = opts && Array.isArray(opts.transientPeaks) ? opts.transientPeaks : [];
    if (isAudio && transientPeaks.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(timelineX, rowY, timelineW, trackHeight);
      ctx.clip();
      for (const pk of transientPeaks) {
        const txRaw = frameToX(pk.frame);
        if (txRaw < timelineX || txRaw > timelineX + timelineW) continue;
        const tx = Math.round(txRaw) + 0.5;
        ctx.strokeStyle = "rgba(63, 185, 80, 0.28)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx, rowY);
        ctx.lineTo(tx, rowY + trackHeight);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Track tag
    const tagX = width < 480 ? 4 : 6;
    const tagW = width < 480 ? 21 : 23;
    ctx.fillStyle = isAudio ? "#255c4e" : "#2c4e7c";
    roundRectPath(ctx, tagX, rowY + 12, tagW, 20, 2);
    ctx.fill();
    ctx.strokeStyle = isAudio ? "#3d8c78" : "#4c74ab";
    ctx.stroke();

    ctx.fillStyle = "#d8d8de";
    ctx.font = "700 9px ui-monospace, monospace";
    const shortCode = `${isAudio ? "A" : "V"}${trk.index}`;
    ctx.fillText(shortCode, tagX + 4, rowY + 25);

    if (width >= 480) {
      ctx.fillStyle = trackAudiblyMuted ? "#7a7a86" : "#b4b4be";
      ctx.font = "500 10px system-ui, sans-serif";
      const tName = (trk.name || shortCode).slice(0, 8);
      ctx.fillText(tName, 33, rowY + 25);
    }

    // Track Mute (M), Solo (S), and Sync Lock (L) buttons on label rail
    const msBtnW = width < 480 ? 13 : 16;
    const msBtnH = 18;
    const msBtnY = rowY + 13;
    const muteX = width < 480 ? 27 : 79;
    const soloX = width < 480 ? 42 : 97;
    const syncX = width < 480 ? 57 : 115;
    const isSyncLocked = Boolean(trk.sync_locked);

    ctx.fillStyle = isDirectMuted ? "#e5534b" : "#19191c";
    roundRectPath(ctx, muteX, msBtnY, msBtnW, msBtnH, 2);
    ctx.fill();
    ctx.strokeStyle = isDirectMuted ? "#f87171" : "#34343c";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = isDirectMuted ? "#ffffff" : "#8e8e98";
    ctx.font = "700 9px ui-monospace, monospace";
    ctx.fillText("M", muteX + (width < 480 ? 3.5 : 4.5), msBtnY + 12);

    ctx.fillStyle = isSolo ? "#d29922" : "#19191c";
    roundRectPath(ctx, soloX, msBtnY, msBtnW, msBtnH, 2);
    ctx.fill();
    ctx.strokeStyle = isSolo ? "#ffd166" : "#34343c";
    ctx.stroke();
    ctx.fillStyle = isSolo ? "#111114" : "#8e8e98";
    ctx.fillText("S", soloX + (width < 480 ? 3.5 : 4.5), msBtnY + 12);

    ctx.fillStyle = isSyncLocked ? "rgba(57, 197, 207, 0.24)" : "#19191c";
    roundRectPath(ctx, syncX, msBtnY, msBtnW, msBtnH, 2);
    ctx.fill();
    ctx.strokeStyle = isSyncLocked ? "#39c5cf" : "#34343c";
    ctx.stroke();
    ctx.fillStyle = isSyncLocked ? "#8de8ef" : "#6e6e78";
    ctx.fillText("L", syncX + (width < 480 ? 3.8 : 4.8), msBtnY + 12);

    hitboxes.push({
      kind: "track_mute",
      x: muteX,
      y: msBtnY,
      w: msBtnW,
      h: msBtnH,
      trackKind: trk.kind,
      trackIndex: trk.index,
      data: trk
    });
    hitboxes.push({
      kind: "track_solo",
      x: soloX,
      y: msBtnY,
      w: msBtnW,
      h: msBtnH,
      trackKind: trk.kind,
      trackIndex: trk.index,
      data: trk
    });
    hitboxes.push({
      kind: "track_sync_lock",
      x: syncX,
      y: msBtnY,
      w: msBtnW,
      h: msBtnH,
      trackKind: trk.kind,
      trackIndex: trk.index,
      data: trk
    });

    // Clips
    const clipList = trk.clips || [];
    for (let clipIndex = 0; clipIndex < clipList.length; clipIndex++) {
      const clip = clipList[clipIndex];
      const cx = frameToX(clip.start_frame);
      const cw = Math.max(5, clip.duration_frames * pxPerFrame);
      if (cx + cw < timelineX || cx > timelineX + timelineW) continue;
      const drawX = Math.max(timelineX, cx);
      const drawW = Math.min(timelineX + timelineW, cx + cw) - drawX;
      if (drawW <= 1) continue;

      const clipY = rowY + 4;
      const clipH = trackHeight - 8;

      const isSelected =
        selected &&
        selected.kind === "clip" &&
        selected.data.name === clip.name &&
        selected.data.start_frame === clip.start_frame &&
        selected.data.duration_frames === clip.duration_frames &&
        selected.data.track_index === clip.track_index &&
        selected.data.media_type === clip.media_type;

      const trimTarget = (opts && (opts.activeTrim || opts.hoverTrim)) || null;
      const isTrimClip =
        trimTarget &&
        trimTarget.trackKind === trk.kind &&
        trimTarget.trackIndex === trk.index &&
        trimTarget.clipIndex === clipIndex;

      const fadeTarget = (opts && (opts.activeFade || opts.hoverFade)) || null;
      const isFadeClip =
        fadeTarget &&
        fadeTarget.trackKind === trk.kind &&
        fadeTarget.trackIndex === trk.index &&
        fadeTarget.clipIndex === clipIndex;

      const isCompound = Boolean(clip.compound_subsequence);
      const isMulticam = Boolean(clip.multicam_bank);
      const cmpTagColors = {
        amber: { fill: "#382812", border: "#f59e0b", strip: "#fbbf24", text: "#fde68a" },
        violet: { fill: "#2a1e42", border: "#a78bfa", strip: "#c4b5fd", text: "#ede9fe" },
        teal: { fill: "#123432", border: "#2dd4bf", strip: "#5eead4", text: "#ccfbf1" },
        blue: { fill: "#172b4d", border: "#60a5fa", strip: "#93c5fd", text: "#dbeafe" }
      };
      const cmpTagKey =
        isCompound && cmpTagColors[clip.compound_subsequence.color_tag]
          ? clip.compound_subsequence.color_tag
          : "amber";
      const cmpPal = cmpTagColors[cmpTagKey];

      const baseFill = trackAudiblyMuted
        ? (isAudio ? "#1a2925" : "#1c2533")
        : isCompound && clip.enabled
          ? cmpPal.fill
          : isMulticam && clip.enabled
            ? "#182438"
            : isAudio
              ? clip.enabled ? "#1d4a40" : "#252529"
              : clip.enabled ? "#264066" : "#252529";
      const borderCol = isSelected
        ? "#e68442"
        : trackAudiblyMuted
          ? "#3b3b44"
          : isCompound
            ? cmpPal.border
            : isMulticam
              ? "#38bdf8"
              : isAudio ? "#347867" : "#446a9c";

      ctx.fillStyle = baseFill;
      roundRectPath(ctx, drawX, clipY, drawW, clipH, 2);
      ctx.fill();

      if (isMulticam && drawW > 8) {
        const mcBank = clip.multicam_bank;
        const mcDur = Math.max(1, Number(mcBank.duration_frames || clip.duration_frames || 1));
        const mcCuts = Array.isArray(mcBank.cuts) && mcBank.cuts.length
          ? [...mcBank.cuts].sort((a, b) => a.frame - b.frame)
          : [{ frame: 0, angle_index: 1 }];
        const angleMap = new Map((mcBank.angles || []).map((a) => [a.angle_index, a]));
        ctx.save();
        roundRectPath(ctx, drawX, clipY, drawW, clipH, 2);
        ctx.clip();
        for (let mIdx = 0; mIdx < mcCuts.length; mIdx += 1) {
          const cut = mcCuts[mIdx];
          const segStart = Math.max(0, cut.frame);
          const segEnd = mIdx + 1 < mcCuts.length ? Math.min(mcDur, mcCuts[mIdx + 1].frame) : mcDur;
          const sx = drawX + (segStart / mcDur) * drawW;
          const sw = Math.max(2, ((segEnd - segStart) / mcDur) * drawW);
          const angleObj = angleMap.get(cut.angle_index);
          const palKey = angleObj && MULTICAM_PALETTE[angleObj.color_tag] ? angleObj.color_tag : "blue";
          const pal = MULTICAM_PALETTE[palKey];
          ctx.fillStyle = pal.border;
          ctx.fillRect(sx, clipY, sw, 3);
          ctx.fillStyle = pal.fill;
          ctx.fillRect(sx, clipY + clipH - 9, sw, 9);
          if (mIdx > 0 && sx > drawX + 1 && sx < drawX + drawW - 1) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(sx, clipY + 3);
            ctx.lineTo(sx, clipY + clipH);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          if (sw >= 18) {
            ctx.fillStyle = pal.text;
            ctx.font = "700 8px ui-monospace, monospace";
            ctx.fillText(`A${cut.angle_index}`, sx + 3, clipY + clipH - 2);
          }
        }
        ctx.restore();
        roundRectPath(ctx, drawX, clipY, drawW, clipH, 2);
      }

      if (isCompound && drawW > 8) {
        ctx.save();
        roundRectPath(ctx, drawX, clipY, drawW, clipH, 2);
        ctx.clip();
        ctx.fillStyle = cmpPal.strip;
        ctx.fillRect(drawX, clipY, drawW, 3);
        const subTracks = clip.compound_subsequence.tracks || [];
        const subDur = Math.max(1, Number(clip.compound_subsequence.duration_frames || clip.duration_frames || 1));
        const maxRows = Math.min(4, subTracks.length);
        const rowAreaTop = clipY + clipH - 13;
        const rowStep = maxRows > 0 ? Math.max(2, Math.floor(10 / maxRows)) : 2;
        for (let rIdx = 0; rIdx < maxRows; rIdx++) {
          const nTrk = subTracks[rIdx];
          const barY = rowAreaTop + rIdx * rowStep;
          ctx.fillStyle =
            nTrk.kind === "video"
              ? "rgba(255, 255, 255, 0.24)"
              : "rgba(45, 212, 191, 0.28)";
          for (const nClip of nTrk.clips || []) {
            const nx0 = drawX + Math.max(0, (nClip.start_frame / subDur) * drawW);
            const nw = Math.max(2, ((nClip.duration_frames || 0) / subDur) * drawW);
            if (nx0 < drawX + drawW) {
              ctx.fillRect(nx0, barY, Math.min(nw, drawX + drawW - nx0), Math.max(1.5, rowStep - 0.5));
            }
          }
        }
        ctx.restore();
        roundRectPath(ctx, drawX, clipY, drawW, clipH, 2);
      }

      const labelColorId = normalizeClipLabelColor(clip.label_color);
      const labelMeta = CLIP_LABEL_COLORS[labelColorId];
      if (labelMeta && labelMeta.hex && drawW > 4) {
        ctx.save();
        roundRectPath(ctx, drawX, clipY, drawW, clipH, 2);
        ctx.clip();
        ctx.fillStyle = trackAudiblyMuted ? labelMeta.mutedHex : labelMeta.hex;
        ctx.fillRect(drawX, clipY, drawW, 4);
        ctx.restore();
        roundRectPath(ctx, drawX, clipY, drawW, clipH, 2);
      }

      ctx.strokeStyle = borderCol;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Audio gain level line + Fade-In / Fade-Out curves inside clip
      const gainDb = Number.isFinite(Number(clip.audio_gain_db))
        ? Math.max(-24, Math.min(12, Number(clip.audio_gain_db)))
        : 0;
      const fadeInS = Number.isFinite(Number(clip.fade_in_s))
        ? Math.max(0, Math.min(5, Number(clip.fade_in_s)))
        : 0;
      const fadeOutS = Number.isFinite(Number(clip.fade_out_s))
        ? Math.max(0, Math.min(5, Number(clip.fade_out_s)))
        : 0;

      const gainNorm = (gainDb + 24) / 36;
      const gainY = clipY + clipH - 4 - gainNorm * (clipH - 10);
      let fadeInPx = Math.max(0, fadeInS * fpsFloat * pxPerFrame);
      let fadeOutPx = Math.max(0, fadeOutS * fpsFloat * pxPerFrame);
      if (fadeInPx + fadeOutPx > cw && cw > 0) {
        const scale = cw / (fadeInPx + fadeOutPx);
        fadeInPx *= scale;
        fadeOutPx *= scale;
      }

      const hasAudioCurve =
        isSelected || Math.abs(gainDb) > 0.05 || fadeInS > 0.005 || fadeOutS > 0.005;

      if (hasAudioCurve && drawW > 8) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(drawX + 1, clipY + 1, drawW - 2, clipH - 2);
        ctx.clip();

        const clipBottom = clipY + clipH;
        const fadeInEndX = cx + fadeInPx;
        const fadeOutStartX = cx + cw - fadeOutPx;

        // Attenuated wedge overlays for Fade-In and Fade-Out
        if (fadeInPx >= 2) {
          ctx.fillStyle = "rgba(17, 17, 20, 0.54)";
          ctx.beginPath();
          ctx.moveTo(cx, clipY);
          ctx.lineTo(fadeInEndX, clipY);
          ctx.lineTo(fadeInEndX, gainY);
          ctx.quadraticCurveTo(cx + fadeInPx * 0.42, gainY, cx, clipBottom);
          ctx.closePath();
          ctx.fill();
        }
        if (fadeOutPx >= 2) {
          ctx.fillStyle = "rgba(17, 17, 20, 0.54)";
          ctx.beginPath();
          ctx.moveTo(fadeOutStartX, clipY);
          ctx.lineTo(cx + cw, clipY);
          ctx.lineTo(cx + cw, clipBottom);
          ctx.quadraticCurveTo(cx + cw - fadeOutPx * 0.42, gainY, fadeOutStartX, gainY);
          ctx.closePath();
          ctx.fill();
        }

        // Gain & Fade envelope curve line
        const curveColor = trackAudiblyMuted
          ? "#6e6e78"
          : gainDb > 0.05
            ? "#f4a46b"
            : gainDb < -0.05
              ? "#689cff"
              : isAudio
                ? "#5eead4"
                : "#9ec2ff";
        ctx.strokeStyle = curveColor;
        ctx.lineWidth = Math.abs(gainDb) > 0.05 || fadeInS > 0 || fadeOutS > 0 ? 1.5 : 1;
        if (Math.abs(gainDb) <= 0.05 && fadeInS === 0 && fadeOutS === 0) {
          ctx.setLineDash([3, 3]);
        }
        ctx.beginPath();
        if (fadeInPx >= 2) {
          ctx.moveTo(cx, clipBottom);
          ctx.quadraticCurveTo(cx + fadeInPx * 0.42, gainY, fadeInEndX, gainY);
        } else {
          ctx.moveTo(cx, gainY);
        }
        ctx.lineTo(fadeOutStartX, gainY);
        if (fadeOutPx >= 2) {
          ctx.quadraticCurveTo(cx + cw - fadeOutPx * 0.42, gainY, cx + cw, clipBottom);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Fade-In and Fade-Out draggable corner handles
      const showFadeHandles =
        drawW >= 28 && (isSelected || isFadeClip || fadeInS > 0.005 || fadeOutS > 0.005);
      const fadeHandleY = clipY + 6;
      const fadeInHandleX = Math.max(drawX + 7, Math.min(drawX + drawW - 14, cx + fadeInPx));
      const fadeOutHandleX = Math.min(drawX + drawW - 7, Math.max(drawX + 14, cx + cw - fadeOutPx));

      if (showFadeHandles) {
        const inActive = isFadeClip && fadeTarget.edge === "in";
        const outActive = isFadeClip && fadeTarget.edge === "out";

        // Fade-In handle
        ctx.fillStyle = inActive ? "#ffd166" : fadeInS > 0.005 ? "#5eead4" : "#d8d8de";
        ctx.strokeStyle = "#111114";
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(fadeInHandleX, fadeHandleY, inActive ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Fade-Out handle
        ctx.fillStyle = outActive ? "#ffd166" : fadeOutS > 0.005 ? "#5eead4" : "#d8d8de";
        ctx.beginPath();
        ctx.arc(fadeOutHandleX, fadeHandleY, outActive ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Trim / Roll / Slip / Slide handle brackets on selected or hovered clip
      const activeTool = (opts && opts.tool) || "select";
      const trimHandleW = drawW >= 12 ? Math.min(8, Math.max(4, drawW * 0.22)) : 0;
      if (trimHandleW > 0 && (isSelected || isTrimClip)) {
        const leftActive = isTrimClip && trimTarget.edge === "left";
        const rightActive = isTrimClip && trimTarget.edge === "right";
        const isRippleTool = activeTool === "trim";
        const isRollTool = activeTool === "roll";
        const bracketCol = isRollTool
          ? "#39c5cf"
          : isRippleTool
            ? "#f59e0b"
            : "#ffd166";
        if (isSelected || leftActive) {
          ctx.fillStyle = leftActive ? bracketCol : "rgba(255, 216, 168, 0.72)";
          ctx.fillRect(drawX + 1, clipY + 2, leftActive ? 3 : 2, clipH - 4);
        }
        if (isSelected || rightActive) {
          ctx.fillStyle = rightActive ? bracketCol : "rgba(255, 216, 168, 0.72)";
          ctx.fillRect(drawX + drawW - (rightActive ? 4 : 3), clipY + 2, rightActive ? 3 : 2, clipH - 4);
        }
      }
      if (isSelected && (activeTool === "slip" || activeTool === "slide") && drawW >= 24) {
        ctx.save();
        ctx.strokeStyle = activeTool === "slip" ? "#ffd166" : "#5eead4";
        ctx.lineWidth = 1.5;
        ctx.setLineDash(activeTool === "slip" ? [4, 3] : [2, 2]);
        roundRectPath(ctx, drawX + 1, clipY + 1, drawW - 2, clipH - 2, 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      const retimeNorm = normalizeClipRetime(clip);
      const hasRamp = retimeNorm.rampPoints.length >= 2;
      const hasRetime =
        hasRamp ||
        retimeNorm.retimeProcess !== "nearest" ||
        Math.abs(retimeNorm.speedRate - 1.0) > 0.005 ||
        retimeNorm.reverse;
      const transformNorm = !isAudio ? normalizeClipTransform(clip) : null;
      const hasTransform = Boolean(transformNorm && !isClipTransformIdentity(transformNorm));
      let speedBadgeW = 0;
      const rightReserve = showFadeHandles ? 14 : 5;
      if (hasRetime && drawW >= 42) {
        const badgeText = formatRetimeBadgeText(
          retimeNorm.speedRate,
          retimeNorm.reverse,
          retimeNorm.retimeProcess,
          retimeNorm.rampPoints
        );
        ctx.font = "700 9px ui-monospace, monospace";
        const measuredW = Math.ceil(ctx.measureText(badgeText).width) + 8;
        if (measuredW + rightReserve + 18 <= drawW) {
          speedBadgeW = measuredW;
          const badgeX = drawX + drawW - rightReserve - speedBadgeW;
          const badgeY = clipY + 3;
          const badgeH = 14;
          ctx.fillStyle = retimeNorm.reverse
            ? "rgba(224, 123, 57, 0.28)"
            : retimeNorm.retimeProcess === "optical_flow"
              ? "rgba(57, 197, 207, 0.24)"
              : "rgba(210, 153, 34, 0.24)";
          roundRectPath(ctx, badgeX, badgeY, speedBadgeW, badgeH, 2);
          ctx.fill();
          ctx.strokeStyle = retimeNorm.reverse
            ? "#e68442"
            : retimeNorm.retimeProcess === "optical_flow"
              ? "#39c5cf"
              : "#d29922";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = retimeNorm.reverse
            ? "#ffd8a8"
            : retimeNorm.retimeProcess === "optical_flow"
              ? "#a5f3fc"
              : "#ffd166";
          ctx.fillText(badgeText, badgeX + 4, badgeY + 10);
        }
      }
      let transformBadgeW = 0;
      if (hasTransform && drawW >= 48) {
        const dzTag =
          transformNorm.dynamic_zoom && transformNorm.dynamic_zoom !== "off"
            ? getDynamicZoomShortTag(transformNorm.dynamic_zoom)
            : "";
        const tfText =
          Math.abs(transformNorm.zoom_pct - 100.0) <= 0.05 && dzTag
            ? dzTag
            : dzTag
              ? `XF ${Math.round(transformNorm.zoom_pct)}% ${dzTag}`
              : `XF ${Math.round(transformNorm.zoom_pct)}%`;
        ctx.font = "700 9px ui-monospace, monospace";
        const measuredTfW = Math.ceil(ctx.measureText(tfText).width) + 8;
        const usedRight = rightReserve + (speedBadgeW > 0 ? speedBadgeW + 4 : 0);
        if (measuredTfW + usedRight + 18 <= drawW) {
          transformBadgeW = measuredTfW + (speedBadgeW > 0 ? 4 : 0);
          const badgeX = drawX + drawW - usedRight - measuredTfW;
          const badgeY = clipY + 3;
          const badgeH = 14;
          ctx.fillStyle = "rgba(82, 139, 255, 0.24)";
          roundRectPath(ctx, badgeX, badgeY, measuredTfW, badgeH, 2);
          ctx.fill();
          ctx.strokeStyle = "#528bff";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = "#b8d0ff";
          ctx.fillText(tfText, badgeX + 4, badgeY + 10);
        }
      }
      const hasFadeIn = fadeInS > 0.005;
      const hasFadeOut = fadeOutS > 0.005;
      let fadeBadgeW = 0;
      if ((hasFadeIn || hasFadeOut) && drawW >= 12) {
        const bevel = Math.min(8, Math.max(5, Math.floor(drawW * 0.14)));
        ctx.save();
        ctx.fillStyle = isAudio ? "rgba(94, 234, 212, 0.34)" : "rgba(255, 209, 102, 0.34)";
        if (hasFadeIn) {
          ctx.beginPath();
          ctx.moveTo(drawX + 1, clipY + 1);
          ctx.lineTo(drawX + 1 + bevel, clipY + 1);
          ctx.lineTo(drawX + 1, clipY + 1 + bevel);
          ctx.closePath();
          ctx.fill();
        }
        if (hasFadeOut) {
          ctx.beginPath();
          ctx.moveTo(drawX + drawW - 1, clipY + 1);
          ctx.lineTo(drawX + drawW - 1 - bevel, clipY + 1);
          ctx.lineTo(drawX + drawW - 1, clipY + 1 + bevel);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      if ((hasFadeIn || hasFadeOut) && drawW >= 54) {
        const fadeBadgeText =
          hasFadeIn && hasFadeOut
            ? `FADE ${fadeInS.toFixed(1)}/${fadeOutS.toFixed(1)}s`
            : hasFadeIn
              ? `FI ${fadeInS.toFixed(1)}s`
              : `FO ${fadeOutS.toFixed(1)}s`;
        ctx.font = "700 9px ui-monospace, monospace";
        const measuredFadeW = Math.ceil(ctx.measureText(fadeBadgeText).width) + 8;
        const usedRight = rightReserve + (speedBadgeW > 0 ? speedBadgeW + 4 : 0) + transformBadgeW;
        if (measuredFadeW + usedRight + 24 <= drawW) {
          fadeBadgeW = measuredFadeW + (speedBadgeW > 0 || transformBadgeW > 0 ? 4 : 0);
          const badgeX = drawX + drawW - usedRight - measuredFadeW;
          const badgeY = clipY + 3;
          const badgeH = 14;
          ctx.fillStyle = isAudio ? "rgba(45, 212, 191, 0.18)" : "rgba(255, 209, 102, 0.18)";
          roundRectPath(ctx, badgeX, badgeY, measuredFadeW, badgeH, 2);
          ctx.fill();
          ctx.strokeStyle = isAudio ? "#5eead4" : "#ffd166";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = isAudio ? "#99f6e4" : "#ffe69c";
          ctx.fillText(fadeBadgeText, badgeX + 4, badgeY + 10);
        }
      }

      if (drawW > 34) {
        // Reserve horizontal inset where bowtie transition badges straddle incoming/outgoing cuts
        let leftTransInset = 0;
        let rightTransInset = 0;
        for (const other of clipList) {
          if (!other || other === clip || other.duration_frames <= 0) continue;
          const otherEnd = other.start_frame + other.duration_frames;
          if (otherEnd === clip.start_frame) {
            const inTrans = normalizeClipTransition(other);
            if (inTrans) {
              const spanPx = Math.max(18, Math.min(inTrans.duration_s * fpsFloat * pxPerFrame, Math.min(other.duration_frames, clip.duration_frames) * pxPerFrame * 1.8));
              leftTransInset = Math.max(leftTransInset, Math.ceil(spanPx / 2) + 4);
            }
          }
        }
        if (clip.duration_frames > 0) {
          const outTrans = normalizeClipTransition(clip);
          if (outTrans) {
            const nextClip = clipList.find((o) => o && o !== clip && o.duration_frames > 0 && o.start_frame === clip.start_frame + clip.duration_frames);
            if (nextClip) {
              const spanPx = Math.max(18, Math.min(outTrans.duration_s * fpsFloat * pxPerFrame, Math.min(clip.duration_frames, nextClip.duration_frames) * pxPerFrame * 1.8));
              rightTransInset = Math.max(rightTransInset, Math.ceil(spanPx / 2) + 4);
            }
          }
        }
        const badgesOffset = speedBadgeW + transformBadgeW + fadeBadgeW;
        const textStartX = drawX + 5 + leftTransInset;
        const textMaxRight = drawX + drawW - 5 - rightTransInset - (badgesOffset > 0 ? badgesOffset + 8 : 0);
        const textClipW = Math.max(0, textMaxRight - textStartX);
        // Subtle DaVinci clip title header band
        if (clipH >= 28 && drawW > 8) {
          ctx.fillStyle = "rgba(10, 11, 15, 0.28)";
          ctx.fillRect(drawX + 1, clipY + 4, Math.max(0, drawW - 2), 14);
        }
        if (textClipW > 14) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(textStartX, clipY, textClipW, clipH);
          ctx.clip();
          ctx.fillStyle = trackAudiblyMuted ? "#9696a0" : "#ebebf0";
          ctx.font = "600 10.5px system-ui, sans-serif";
          ctx.fillText(clip.name, textStartX + 2, rowY + 17);
          ctx.restore();
        }

        const subClipW = Math.max(0, drawX + drawW - 6 - rightTransInset - textStartX);
        if (subClipW > 24) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(textStartX, clipY + 19, subClipW, clipH - 19);
          ctx.clip();
          ctx.fillStyle = "#a2a2ad";
          ctx.font = "9.5px ui-monospace, monospace";
          const gainTag = Math.abs(gainDb) >= 0.05
            ? ` | ${gainDb > 0 ? "+" : ""}${gainDb.toFixed(1)}dB`
            : "";
          const muteTag = trackAudiblyMuted ? " | MUTED" : "";
          const cmpSub = clip.compound_subsequence;
          const cmpCount = cmpSub
            ? (cmpSub.tracks || []).reduce((acc, t) => acc + (t.clips || []).length, 0)
            : 0;
          const cmpTag = cmpSub
            ? ` | CMP ${(cmpSub.tracks || []).length}T/${cmpCount}C`
            : "";
          const mcBank = clip.multicam_bank;
          const mcTag = mcBank
            ? ` | MC ${(mcBank.angles || []).length}x/${(mcBank.cuts || []).length}C`
            : "";
          const avGid = normalizeClipLinkGroupId(clip.link_group_id);
          const avSplit = avGid ? computeAvSplitEditInfo(doc, trk.kind, trk.index, clipIndex) : null;
          let avLinkTag = "";
          if (avSplit && avSplit.linked) {
            if (avSplit.cut_type === "j_cut") {
              avLinkTag = ` | J ${avSplit.in_offset_frames > 0 ? `+${avSplit.in_offset_frames}` : avSplit.in_offset_frames}f`;
            } else if (avSplit.cut_type === "l_cut") {
              avLinkTag = ` | L ${avSplit.out_offset_frames > 0 ? `+${avSplit.out_offset_frames}` : avSplit.out_offset_frames}f`;
            } else if (avSplit.cut_type === "jl_cut") {
              avLinkTag = ` | J:${avSplit.in_offset_frames} L:${avSplit.out_offset_frames}f`;
            } else {
              avLinkTag = ` | LINK ${avGid}`;
            }
          }
          const retimeTag = hasRetime && speedBadgeW === 0
            ? ` | ${formatRetimeBadgeText(
                retimeNorm.speedRate,
                retimeNorm.reverse,
                retimeNorm.retimeProcess,
                retimeNorm.rampPoints
              )}`
            : "";
          ctx.fillText(
            `${clip.start_frame}-${clip.start_frame + clip.duration_frames}f${avLinkTag}${cmpTag}${mcTag}${gainTag}${muteTag}${retimeTag}`,
            textStartX + 2,
            rowY + 32
          );
          ctx.restore();
        }
      }

      // J-Cut / L-Cut visual split-edit edge rails on linked clips
      const splitEdgeInfo = normalizeClipLinkGroupId(clip.link_group_id)
        ? computeAvSplitEditInfo(doc, trk.kind, trk.index, clipIndex)
        : null;
      if (splitEdgeInfo && splitEdgeInfo.linked && drawW >= 12) {
        if (splitEdgeInfo.in_offset_frames !== 0) {
          ctx.fillStyle = "#39c5cf";
          ctx.fillRect(drawX + 1, clipY + clipH - 3, Math.min(drawW - 2, 16), 2);
        }
        if (splitEdgeInfo.out_offset_frames !== 0) {
          ctx.fillStyle = "#f59e0b";
          const rw = Math.min(drawW - 2, 16);
          ctx.fillRect(drawX + drawW - 1 - rw, clipY + clipH - 3, rw, 2);
        }
      }

      if (hasRamp && drawW >= 26 && !isAudio) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(drawX + 2, clipY + 2, Math.max(0, drawW - 4), Math.max(0, clipH - 4));
        ctx.clip();
        const curveTop = clipY + clipH - 16;
        const curveBot = clipY + clipH - 3;
        const logMin = Math.log2(RETIME_SPEED_MIN);
        const logSpan = Math.log2(RETIME_SPEED_MAX) - logMin;
        const samples = Math.max(8, Math.min(32, Math.round(drawW / 6)));
        ctx.strokeStyle =
          retimeNorm.retimeProcess === "optical_flow"
            ? "rgba(57, 197, 207, 0.85)"
            : "rgba(255, 209, 102, 0.85)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let si = 0; si <= samples; si++) {
          const u = si / samples;
          const spd = evaluateRetimeSpeedAt(retimeNorm.rampPoints, u, retimeNorm.speedRate);
          const normY = (Math.log2(clamp01((spd - RETIME_SPEED_MIN) / (RETIME_SPEED_MAX - RETIME_SPEED_MIN)) * (RETIME_SPEED_MAX - RETIME_SPEED_MIN) + RETIME_SPEED_MIN) - logMin) / logSpan;
          const px = drawX + 3 + u * Math.max(1, drawW - 6);
          const py = curveBot - clamp01(normY) * (curveBot - curveTop);
          if (si === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      }

      const kfTimes = !isAudio && hasTransformKeyframes(transformNorm)
        ? getAllTransformKeyframeTimes(transformNorm)
        : [];
      if (kfTimes.length > 0 && drawW >= 18) {
        const kfLaneY = clipY + clipH - 8;
        ctx.save();
        ctx.strokeStyle = "rgba(255, 209, 102, 0.32)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(drawX + 4, kfLaneY);
        ctx.lineTo(drawX + drawW - 4, kfLaneY);
        ctx.stroke();
        ctx.restore();
      }

      hitboxes.push({
        kind: "clip",
        x: drawX,
        y: clipY,
        w: drawW,
        h: clipH,
        trackKind: trk.kind,
        trackIndex: trk.index,
        clipIndex,
        trimHandleW,
        fadeHandlesEnabled: drawW >= 28,
        fadeInHandleX,
        fadeOutHandleX,
        fadeHandleY,
        data: clip
      });

      if (kfTimes.length > 0 && drawW >= 18) {
        const kfLaneY = clipY + clipH - 8;
        for (const tSec of kfTimes) {
          const kfFrame = clip.start_frame + Math.round(tSec * fpsFloat);
          const kx = frameToX(kfFrame);
          if (kx < drawX + 3 || kx > drawX + drawW - 3) continue;
          ctx.save();
          ctx.fillStyle = "#ffd166";
          ctx.strokeStyle = "#e68442";
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.moveTo(kx, kfLaneY - 4);
          ctx.lineTo(kx + 4, kfLaneY);
          ctx.lineTo(kx, kfLaneY + 4);
          ctx.lineTo(kx - 4, kfLaneY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          hitboxes.push({
            kind: "clip_keyframe",
            x: kx - 6,
            y: kfLaneY - 6,
            w: 12,
            h: 12,
            frame: kfFrame,
            time_s: tSec,
            trackKind: trk.kind,
            trackIndex: trk.index,
            clipIndex,
            data: clip
          });
        }
      }
    }

    // Visual Bowtie Transition Badges at adjacent clip cut junctions
    const orderedClips = clipList
      .map((clip, idx) => ({ clip, idx }))
      .sort((a, b) => a.clip.start_frame - b.clip.start_frame || a.clip.duration_frames - b.clip.duration_frames);
    for (let pos = 0; pos < orderedClips.length - 1; pos++) {
      const pairA = orderedClips[pos];
      const pairB = orderedClips[pos + 1];
      if (pairA.clip.duration_frames <= 0 || pairB.clip.duration_frames <= 0) continue;
      const cutFrame = pairA.clip.start_frame + pairA.clip.duration_frames;
      if (cutFrame !== pairB.clip.start_frame) continue;

      const trans = normalizeClipTransition(pairA.clip);
      if (!trans) continue;

      const cutX = frameToX(cutFrame);
      if (cutX < timelineX - 24 || cutX > timelineX + timelineW + 24) continue;

      const clipY = rowY + 4;
      const clipH = trackHeight - 8;
      const maxPairPx = Math.max(
        18,
        Math.min(
          pairA.clip.duration_frames * pxPerFrame * 0.9,
          pairB.clip.duration_frames * pxPerFrame * 0.9
        ) * 2
      );
      const transPx = Math.max(18, Math.min(maxPairPx, trans.duration_s * fpsFloat * pxPerFrame));
      const halfSpan = transPx / 2;
      const badgeX = Math.max(timelineX, cutX - halfSpan);
      const badgeRight = Math.min(timelineX + timelineW, cutX + halfSpan);
      const badgeW = badgeRight - badgeX;
      if (badgeW <= 4) continue;

      const isTransSelected =
        selected &&
        selected.kind === "transition" &&
        selected.data &&
        selected.data.name === pairA.clip.name &&
        selected.data.start_frame === pairA.clip.start_frame &&
        selected.data.track_index === pairA.clip.track_index &&
        selected.data.media_type === pairA.clip.media_type;

      const hoverTrans = opts && opts.hoverTransition ? opts.hoverTransition : null;
      const isTransHovered =
        hoverTrans &&
        hoverTrans.trackKind === trk.kind &&
        hoverTrans.trackIndex === trk.index &&
        hoverTrans.clipIndex === pairA.idx;

      // Translucent transition span plate across the cut seam
      ctx.save();
      ctx.fillStyle = "rgba(17, 17, 20, 0.72)";
      roundRectPath(ctx, badgeX, clipY + 1, badgeW, clipH - 2, 2);
      ctx.fill();
      ctx.fillStyle = isTransSelected || isTransHovered
        ? "rgba(255, 209, 102, 0.30)"
        : "rgba(230, 132, 66, 0.24)";
      roundRectPath(ctx, badgeX, clipY + 1, badgeW, clipH - 2, 2);
      ctx.fill();
      ctx.strokeStyle = isTransSelected || isTransHovered ? "#ffd166" : "#e68442";
      ctx.lineWidth = isTransSelected ? 1.75 : 1.25;
      ctx.stroke();

      // Classic NLE Bowtie glyph centered on cutX
      const showBadgeText = badgeW >= 58;
      const midY = showBadgeText ? clipY + 12 : clipY + clipH / 2;
      const bowHalfW = Math.min(8, Math.max(5, badgeW * 0.24));
      const bowHalfH = showBadgeText ? 5.5 : 6.5;
      ctx.fillStyle = isTransSelected || isTransHovered ? "#ffd166" : "#e68442";
      ctx.strokeStyle = "#111114";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cutX - bowHalfW, midY - bowHalfH);
      ctx.lineTo(cutX, midY);
      ctx.lineTo(cutX - bowHalfW, midY + bowHalfH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cutX + bowHalfW, midY - bowHalfH);
      ctx.lineTo(cutX, midY);
      ctx.lineTo(cutX + bowHalfW, midY + bowHalfH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Compact transition label when wide enough
      if (showBadgeText) {
        const tag = getTransitionShortTag(trans.preset);
        const label = badgeW >= 78 ? `${tag} ${trans.duration_s.toFixed(1)}s` : tag;
        ctx.font = "700 8.5px ui-monospace, monospace";
        const tw = ctx.measureText(label).width;
        if (tw + 4 <= badgeW) {
          ctx.fillStyle = isTransSelected || isTransHovered ? "#ffd166" : "#ffd8a8";
          ctx.fillText(label, cutX - tw / 2, clipY + clipH - 6);
        }
      }
      ctx.restore();

      hitboxes.push({
        kind: "transition",
        x: Math.min(badgeX, cutX - 10),
        y: clipY,
        w: Math.max(badgeW, 20),
        h: clipH,
        trackKind: trk.kind,
        trackIndex: trk.index,
        clipIndex: pairA.idx,
        nextClipIndex: pairB.idx,
        cutFrame,
        data: pairA.clip
      });
    }

    // Validation issue overlays
    const issues = validation ? validation.issues || [] : [];
    for (const issue of issues) {
      if (issue.track_kind !== trk.kind || issue.track_index !== trk.index) continue;
      const ix = Math.max(timelineX, frameToX(issue.start_frame));
      const iw = Math.max(6, (issue.end_frame - issue.start_frame) * pxPerFrame);
      if (ix > timelineX + timelineW) continue;
      const clampedW = Math.min(iw, timelineX + timelineW - ix);
      ctx.fillStyle = issue.kind === "gap" ? "rgba(210, 153, 34, 0.28)" : "rgba(229, 83, 75, 0.34)";
      ctx.fillRect(ix, rowY + 3, clampedW, trackHeight - 6);
      ctx.strokeStyle = issue.kind === "gap" ? "#d29922" : "#e5534b";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ix, rowY + 3, clampedW, trackHeight - 6);
    }
  });

  // In/Out Range Track Overlay & Ruler Brackets
  if (ioMetrics.isActive) {
    const rx0 = Math.max(timelineX, ioInX !== null ? ioInX : timelineX);
    const rx1 = Math.min(timelineX + timelineW, ioOutX !== null ? ioOutX : timelineX + timelineW);
    if (rx1 > rx0) {
      ctx.fillStyle = ioMetrics.isComplete ? "rgba(57, 197, 207, 0.055)" : "rgba(57, 197, 207, 0.03)";
      ctx.fillRect(rx0, rulerHeight, rx1 - rx0, Math.max(0, height - rulerHeight - padBottom));
    }

    const drawIoBracket = (bxRaw, isIn) => {
      if (bxRaw === null || bxRaw < timelineX - 2 || bxRaw > timelineX + timelineW + 2) return;
      const bx = Math.round(bxRaw) + 0.5;
      ctx.save();
      ctx.strokeStyle = "rgba(94, 234, 212, 0.62)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(bx, rulerHeight);
      ctx.lineTo(bx, Math.max(rulerHeight, height - padBottom));
      ctx.stroke();
      ctx.setLineDash([]);

      const dir = isIn ? 1 : -1;
      ctx.strokeStyle = "#5eead4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + dir * 6, 3);
      ctx.lineTo(bx, 3);
      ctx.lineTo(bx, rulerHeight - 3);
      ctx.lineTo(bx + dir * 6, rulerHeight - 3);
      ctx.stroke();

      ctx.fillStyle = "#5eead4";
      ctx.font = "700 8.5px ui-monospace, monospace";
      const tag = isIn ? "I" : "O";
      const tagX = isIn ? bx + 3 : bx - 9;
      if (tagX >= timelineX && tagX <= timelineX + timelineW - 8) {
        ctx.fillText(tag, tagX, rulerHeight - 6);
      }
      ctx.restore();
    };

    drawIoBracket(ioInX, true);
    drawIoBracket(ioOutX, false);
  }

  // Detected Audio Transient Ticks on Ruler
  const rulerTransients = opts && Array.isArray(opts.transientPeaks) ? opts.transientPeaks : [];
  if (rulerTransients.length > 0) {
    ctx.save();
    for (const pk of rulerTransients) {
      const tx = frameToX(pk.frame);
      if (tx < timelineX || tx > timelineX + timelineW) continue;
      ctx.fillStyle = "#3fb950";
      ctx.beginPath();
      ctx.moveTo(tx, rulerHeight - 1);
      ctx.lineTo(tx - 3.5, rulerHeight - 7);
      ctx.lineTo(tx + 3.5, rulerHeight - 7);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Markers
  (doc.markers || []).forEach((mk, mkIdx) => {
    const mx = frameToX(mk.frame);
    if (mx < timelineX || mx > timelineX + timelineW) return;
    const col = MARKER_COLOR_HEX[mk.color] || "#39c5cf";
    const isMkSelected =
      selected &&
      selected.kind === "marker" &&
      (selected.markerIndex === mkIdx || selected.data === mk);

    if (isMkSelected) {
      ctx.save();
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(Math.round(mx) + 0.5, rulerHeight);
      ctx.lineTo(Math.round(mx) + 0.5, height);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(mx - 5.5, rulerHeight - 14);
    ctx.lineTo(mx + 5.5, rulerHeight - 14);
    ctx.lineTo(mx + 5.5, rulerHeight - 9);
    ctx.lineTo(mx, rulerHeight - 3);
    ctx.lineTo(mx - 5.5, rulerHeight - 9);
    ctx.closePath();
    ctx.fill();
    if (isMkSelected) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.25;
      ctx.stroke();
    }

    hitboxes.push({
      kind: "marker",
      markerIndex: mkIdx,
      x: mx - 7,
      y: rulerHeight - 16,
      w: 14,
      h: 16,
      data: mk
    });
  });

  // DaVinci Playhead Needle (lower ruler band so tick labels remain unobstructed)
  const playheadFrame = opts && typeof opts.playheadFrame === "number" ? opts.playheadFrame : startFrame;
  const phX = frameToX(playheadFrame);
  if (phX >= timelineX && phX <= timelineX + timelineW) {
    ctx.strokeStyle = "#e68442";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(phX, 20);
    ctx.lineTo(phX, height);
    ctx.stroke();

    ctx.fillStyle = "#e68442";
    ctx.beginPath();
    ctx.moveTo(phX - 6, 20);
    ctx.lineTo(phX + 6, 20);
    ctx.lineTo(phX + 6, 28);
    ctx.lineTo(phX, 35);
    ctx.lineTo(phX - 6, 28);
    ctx.closePath();
    ctx.fill();
  }

  // Crisp Vertical Magnetic Snap Guide Line
  if (opts && typeof opts.snapGuideFrame === "number") {
    const gxRaw = frameToX(opts.snapGuideFrame);
    if (gxRaw >= timelineX && gxRaw <= timelineX + timelineW) {
      const gx = Math.round(gxRaw) + 0.5;
      const isBeatSnap = opts.snapGuideKind === "beat";
      const isTransientSnap = opts.snapGuideKind === "transient";
      const guideCol = isBeatSnap ? "#e6b842" : isTransientSnap ? "#3fb950" : "#39c5cf";
      const textCol = isBeatSnap ? "#ffe394" : isTransientSnap ? "#7ee787" : "#8de8ef";
      ctx.save();
      ctx.strokeStyle = guideCol;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();

      // Snap diamond marker on ruler seam
      ctx.fillStyle = guideCol;
      ctx.beginPath();
      ctx.moveTo(gx, rulerHeight - 5);
      ctx.lineTo(gx + 4, rulerHeight);
      ctx.lineTo(gx, rulerHeight + 5);
      ctx.lineTo(gx - 4, rulerHeight);
      ctx.closePath();
      ctx.fill();

      // Compact SNAP / BEAT / MKR frame pill
      const snapPrefix = isBeatSnap ? "BEAT" : isMarkerSnap ? "MKR" : "SNAP";
      const snapLabel = `${snapPrefix} ${opts.snapGuideFrame}f`;
      ctx.font = "700 9px ui-monospace, monospace";
      const tw = ctx.measureText(snapLabel).width + 8;
      const pillX = Math.min(timelineX + timelineW - tw - 2, Math.max(timelineX + 2, gx + 5));
      ctx.fillStyle = "rgba(17, 17, 20, 0.9)";
      ctx.fillRect(pillX, 2, tw, 13);
      ctx.strokeStyle = guideCol;
      ctx.lineWidth = 1;
      ctx.strokeRect(pillX, 2, tw, 13);
      ctx.fillStyle = textCol;
      ctx.fillText(snapLabel, pillX + 4, 11.5);
      ctx.restore();
    }
  }

  // Blade / Razor Cut Preview Guide
  if (opts && opts.tool === "blade" && opts.bladePreview && typeof opts.bladePreview.frame === "number") {
    const bxRaw = frameToX(opts.bladePreview.frame);
    if (bxRaw >= timelineX && bxRaw <= timelineX + timelineW) {
      const bx = Math.round(bxRaw) + 0.5;
      ctx.save();
      ctx.strokeStyle = "rgba(248, 113, 113, 0.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(bx, rulerHeight);
      ctx.lineTo(bx, height);
      ctx.stroke();
      ctx.setLineDash([]);

      if (opts.bladePreview.valid) {
        const cy0 = opts.bladePreview.y - 2;
        const cy1 = opts.bladePreview.y + opts.bladePreview.h + 2;
        ctx.strokeStyle = "#f87171";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx, cy0);
        ctx.lineTo(bx, cy1);
        ctx.stroke();

        ctx.fillStyle = "#f87171";
        ctx.beginPath();
        ctx.moveTo(bx - 4, cy0 - 2);
        ctx.lineTo(bx + 4, cy0 - 2);
        ctx.lineTo(bx, cy0 + 4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Active Fade Drag Readout Pill
  if (opts && opts.activeFade && typeof opts.activeFade.seconds === "number") {
    const label = `${opts.activeFade.edge === "in" ? "FADE IN" : "FADE OUT"} ${opts.activeFade.seconds.toFixed(2)}s`;
    ctx.save();
    ctx.font = "700 9px ui-monospace, monospace";
    const tw = ctx.measureText(label).width + 10;
    const pillX = Math.max(timelineX + 4, Math.min(timelineX + timelineW - tw - 4, opts.activeFade.x - tw / 2));
    const pillY = Math.max(rulerHeight + 2, (opts.activeFade.y || rulerHeight + 10) - 16);
    ctx.fillStyle = "rgba(17, 17, 20, 0.92)";
    ctx.fillRect(pillX, pillY, tw, 14);
    ctx.strokeStyle = "#5eead4";
    ctx.lineWidth = 1;
    ctx.strokeRect(pillX, pillY, tw, 14);
    ctx.fillStyle = "#5eead4";
    ctx.fillText(label, pillX + 5, pillY + 10);
    ctx.restore();
  }

  // Active Ripple / Roll / Slip / Slide Drag Readout Pill
  if (opts && opts.activeEditHud && opts.activeEditHud.label) {
    const hud = opts.activeEditHud;
    const text = hud.detail ? `${hud.label} | ${hud.detail}` : hud.label;
    ctx.save();
    ctx.font = "700 9px ui-monospace, monospace";
    const tw = Math.min(timelineW - 8, ctx.measureText(text).width + 12);
    const pillX = Math.max(
      timelineX + 4,
      Math.min(timelineX + timelineW - tw - 4, (hud.x || timelineX + 40) - tw / 2)
    );
    const pillY = Math.max(rulerHeight + 2, (hud.y || rulerHeight + 18) - 16);
    ctx.fillStyle = "rgba(14, 15, 19, 0.94)";
    ctx.fillRect(pillX, pillY, tw, 15);
    ctx.strokeStyle = hud.color || "#f59e0b";
    ctx.lineWidth = 1;
    ctx.strokeRect(pillX, pillY, tw, 15);
    ctx.fillStyle = hud.color || "#ffd8a8";
    ctx.fillText(text, pillX + 6, pillY + 10.5, tw - 10);
    ctx.restore();
  }

  return {
    hitboxes,
    frameToX,
    xToFrame,
    xToRawFrame,
    pxPerFrame,
    startFrame,
    maxFrame,
    viewStartFrame: viewStart,
    viewEndFrame: viewStart + visibleSpan,
    visibleSpan,
    rulerHeight,
    labelColW
  };
}

export function drawTimelineOverviewCanvas(canvas, doc, opts = {}) {
  const totalHeight = 28;
  const { ctx, width, height } = setupCanvas(canvas, totalHeight);
  ctx.fillStyle = "#18181c";
  ctx.fillRect(0, 0, width, height);

  if (!doc) {
    return {
      startFrame: 0,
      maxFrame: 0,
      spanFrames: 25,
      timelineX: 0,
      timelineW: width,
      frameToX: () => 0,
      xToFrame: () => 0
    };
  }

  const labelColW = width < 480 ? 74 : 136;
  const timelineX = labelColW;
  const timelineW = Math.max(120, width - labelColW - 10);
  const tracks = Array.isArray(doc.tracks) ? doc.tracks : [];
  const startFrame = doc.start_frame || 0;
  let maxFrame = startFrame;
  for (const trk of tracks) {
    for (const c of trk.clips || []) {
      const endF = (c.start_frame || 0) + (c.duration_frames || 0);
      if (endF > maxFrame) maxFrame = endF;
    }
  }
  for (const mk of doc.markers || []) {
    const endM = (mk.frame || 0) + (mk.duration_frames || 1);
    if (endM > maxFrame) maxFrame = endM;
  }
  const spanFrames = Math.max(25, maxFrame - startFrame);
  const pxPerFrame = timelineW / spanFrames;
  const frameToX = (f) => timelineX + (f - startFrame) * pxPerFrame;
  const xToFrame = (x) =>
    Math.max(startFrame, Math.min(maxFrame, Math.round(startFrame + (x - timelineX) / pxPerFrame)));

  // Left overview label rail
  ctx.fillStyle = "#222227";
  ctx.fillRect(0, 0, labelColW, height);
  ctx.strokeStyle = "#111114";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(labelColW, 0);
  ctx.lineTo(labelColW, height);
  ctx.moveTo(0, height - 0.5);
  ctx.lineTo(width, height - 0.5);
  ctx.stroke();

  ctx.fillStyle = "#8e8e98";
  ctx.font = "600 9px ui-monospace, monospace";
  ctx.fillText(width < 480 ? "OVW" : "OVERVIEW", 8, 17);

  // I/O Range Highlight
  const ioMetrics = computeInOutRangeMetrics(
    opts && opts.ioRange ? opts.ioRange : null,
    doc.fps,
    startFrame,
    maxFrame
  );
  if (ioMetrics.isActive) {
    const rx0 = Math.max(timelineX, ioMetrics.hasIn ? frameToX(ioMetrics.in_frame) : timelineX);
    const rx1 = Math.min(
      timelineX + timelineW,
      ioMetrics.hasOut ? frameToX(ioMetrics.out_frame) : timelineX + timelineW
    );
    if (rx1 > rx0) {
      ctx.fillStyle = "rgba(57, 197, 207, 0.14)";
      ctx.fillRect(rx0, 1, rx1 - rx0, height - 2);
    }
  }

  // Mini track bars
  const rowCount = Math.max(1, tracks.length);
  const padY = 3;
  const usableH = Math.max(8, height - padY * 2);
  const laneH = Math.max(2, Math.floor((usableH - (rowCount - 1)) / rowCount));
  tracks.forEach((trk, idx) => {
    const ly = padY + idx * (laneH + 1);
    const isAudio = trk.kind === "audio";
    for (const clip of trk.clips || []) {
      const cx = frameToX(clip.start_frame || 0);
      const cw = Math.max(2, (clip.duration_frames || 0) * pxPerFrame);
      const drawX = Math.max(timelineX, cx);
      const drawW = Math.min(timelineX + timelineW, cx + cw) - drawX;
      if (drawW <= 0.5) continue;
      const labelColorId = normalizeClipLabelColor(clip.label_color);
      const labelMeta = CLIP_LABEL_COLORS[labelColorId];
      ctx.fillStyle =
        labelMeta && labelMeta.hex
          ? labelMeta.hex
          : isAudio
            ? "#2d7564"
            : "#3d6699";
      ctx.fillRect(drawX, ly, drawW, laneH);
    }
  });

  // Detected Audio Transient Ticks on Ruler
  const rulerTransients = opts && Array.isArray(opts.transientPeaks) ? opts.transientPeaks : [];
  if (rulerTransients.length > 0) {
    ctx.save();
    for (const pk of rulerTransients) {
      const tx = frameToX(pk.frame);
      if (tx < timelineX || tx > timelineX + timelineW) continue;
      ctx.fillStyle = "#3fb950";
      ctx.beginPath();
      ctx.moveTo(tx, rulerHeight - 1);
      ctx.lineTo(tx - 3.5, rulerHeight - 7);
      ctx.lineTo(tx + 3.5, rulerHeight - 7);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Markers ticks
  for (const mk of doc.markers || []) {
    const mx = frameToX(mk.frame || 0);
    if (mx < timelineX || mx > timelineX + timelineW) continue;
    ctx.fillStyle = MARKER_COLOR_HEX[mk.color] || "#528bff";
    ctx.fillRect(Math.round(mx) - 1, 1, 2, 4);
  }

  // Zoom Viewport Window Bracket
  const zoom = opts && opts.zoom ? Math.max(1, Number(opts.zoom)) : 1;
  const vp = computeTimelineZoomViewport(
    startFrame,
    maxFrame,
    zoom,
    null,
    opts && opts.viewStartFrame !== undefined ? opts.viewStartFrame : null
  );
  const vx0 = Math.max(timelineX, frameToX(vp.viewStartFrame));
  const vx1 = Math.min(timelineX + timelineW, frameToX(vp.viewEndFrame));
  const vw = Math.max(8, vx1 - vx0);
  if (zoom > 1.01) {
    ctx.fillStyle = "rgba(17, 17, 20, 0.55)";
    if (vx0 > timelineX) ctx.fillRect(timelineX, 1, vx0 - timelineX, height - 2);
    if (vx1 < timelineX + timelineW) {
      ctx.fillRect(vx1, 1, timelineX + timelineW - vx1, height - 2);
    }
    ctx.strokeStyle = "#e68442";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vx0 + 0.5, 1.5, vw - 1, height - 3);
  } else {
    ctx.strokeStyle = "rgba(230, 132, 66, 0.42)";
    ctx.lineWidth = 1;
    ctx.strokeRect(timelineX + 0.5, 1.5, timelineW - 1, height - 3);
  }

  // Playhead needle
  const ph = opts && typeof opts.playheadFrame === "number" ? opts.playheadFrame : startFrame;
  const px = Math.round(Math.max(timelineX, Math.min(timelineX + timelineW, frameToX(ph)))) + 0.5;
  ctx.strokeStyle = "#f4a46b";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px, 0);
  ctx.lineTo(px, height);
  ctx.stroke();

  return {
    startFrame,
    maxFrame,
    spanFrames,
    timelineX,
    timelineW,
    frameToX,
    xToFrame
  };
}

const SMPTE_BARS = [
  [0.75, 0.75, 0.75],
  [0.75, 0.75, 0.0],
  [0.0, 0.75, 0.75],
  [0.0, 0.75, 0.0],
  [0.75, 0.0, 0.75],
  [0.75, 0.0, 0.0],
  [0.0, 0.0, 0.75]
];

const REFERENCE_SWATCHES = [
  { label: "Skin L", rgb: [0.76, 0.56, 0.48] },
  { label: "Skin D", rgb: [0.43, 0.28, 0.21] },
  { label: "Sky", rgb: [0.27, 0.48, 0.72] },
  { label: "Foliage", rgb: [0.26, 0.44, 0.23] },
  { label: "Gold", rgb: [0.85, 0.65, 0.19] },
  { label: "Crimson", rgb: [0.72, 0.18, 0.22] }
];

let _pwBaseCanvas = null;
let _pwOutCanvas = null;

function hasActiveNodeMaskInChain(cdl) {
  if (!cdl || !Array.isArray(cdl.nodes)) return false;
  return cdl.nodes.some(
    (n) =>
      n &&
      n.enabled !== false &&
      (isPowerWindowActive(n.power_window) || isQualifierActive(n.qualifier))
  );
}

function drawColorPreviewSwatchLabels(ctx, width, height) {
  const row1H = Math.round((88 / 224) * height);
  const row2Y = row1H;
  const row2H = Math.round((66 / 224) * height);
  const swW = width / REFERENCE_SWATCHES.length;
  REFERENCE_SWATCHES.forEach((sw, i) => {
    ctx.fillStyle = "rgba(17, 17, 20, 0.78)";
    ctx.fillRect(i * swW + 3, row2Y + row2H - 18, Math.max(8, swW - 6), 15);
    ctx.fillStyle = "#d8d8de";
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillText(sw.label, i * swW + 6, row2Y + row2H - 7);
  });
}

function renderColorPreviewBaseChart(ctx, width, height, cdl, graded, showLabels) {
  const barW = width / SMPTE_BARS.length;
  const row1H = Math.round((88 / 224) * height);
  SMPTE_BARS.forEach((col, i) => {
    const [r, g, b] = graded ? applyGradeOrCdlRgb(col[0], col[1], col[2], cdl) : col;
    ctx.fillStyle = toCssRgb(r, g, b);
    ctx.fillRect(i * barW, 0, Math.ceil(barW), row1H);
  });

  const row2Y = row1H;
  const row2H = Math.round((66 / 224) * height);
  const swW = width / REFERENCE_SWATCHES.length;
  REFERENCE_SWATCHES.forEach((sw, i) => {
    const [r, g, b] = graded ? applyGradeOrCdlRgb(sw.rgb[0], sw.rgb[1], sw.rgb[2], cdl) : sw.rgb;
    ctx.fillStyle = toCssRgb(r, g, b);
    ctx.fillRect(i * swW, row2Y, Math.ceil(swW), row2H);
  });
  if (showLabels) {
    drawColorPreviewSwatchLabels(ctx, width, height);
  }

  const row3Y = row1H + row2H;
  const row3H = Math.round((38 / 224) * height);
  const steps = 32;
  const stepW = width / steps;
  for (let i = 0; i < steps; i++) {
    const v = i / (steps - 1);
    const [r, g, b] = graded ? applyGradeOrCdlRgb(v, v, v, cdl) : [v, v, v];
    ctx.fillStyle = toCssRgb(r, g, b);
    ctx.fillRect(i * stepW, row3Y, Math.ceil(stepW), row3H);
  }

  const row4Y = row3Y + row3H;
  const row4H = height - row4Y;
  const hueCols = Math.max(48, Math.floor(width / 4));
  const hStepW = width / hueCols;
  for (let i = 0; i < hueCols; i++) {
    const h = (i / hueCols) * 6;
    const x = 1 - Math.abs((h % 2) - 1);
    let rgb = [0.85, 0.2, 0.2];
    if (h < 1) rgb = [0.85, 0.2 + 0.65 * x, 0.2];
    else if (h < 2) rgb = [0.2 + 0.65 * x, 0.85, 0.2];
    else if (h < 3) rgb = [0.2, 0.85, 0.2 + 0.65 * x];
    else if (h < 4) rgb = [0.2, 0.2 + 0.65 * x, 0.85];
    else if (h < 5) rgb = [0.2 + 0.65 * x, 0.2, 0.85];
    else rgb = [0.85, 0.2, 0.2 + 0.65 * x];
    const [r, g, b] = graded ? applyGradeOrCdlRgb(rgb[0], rgb[1], rgb[2], cdl) : rgb;
    ctx.fillStyle = toCssRgb(r, g, b);
    ctx.fillRect(i * hStepW, row4Y, Math.ceil(hStepW), row4H);
  }
}

function renderColorPreviewScene(ctx, width, height, cdl, graded, showLabels, sceneOpts = null) {
  const showHighlight = Boolean(graded && sceneOpts && sceneOpts.qualifierHighlight);
  const hasMasks = Boolean(graded && hasActiveNodeMaskInChain(cdl));
  if (!showHighlight && !hasMasks) {
    renderColorPreviewBaseChart(ctx, width, height, cdl, graded, showLabels);
    return;
  }

  const pwW = Math.max(160, Math.min(280, Math.floor(width)));
  const pwH = Math.max(100, Math.min(168, Math.floor(height)));
  if (!_pwBaseCanvas) _pwBaseCanvas = document.createElement("canvas");
  if (!_pwOutCanvas) _pwOutCanvas = document.createElement("canvas");
  if (_pwBaseCanvas.width !== pwW || _pwBaseCanvas.height !== pwH) {
    _pwBaseCanvas.width = pwW;
    _pwBaseCanvas.height = pwH;
  }
  if (_pwOutCanvas.width !== pwW || _pwOutCanvas.height !== pwH) {
    _pwOutCanvas.width = pwW;
    _pwOutCanvas.height = pwH;
  }
  const baseCtx = _pwBaseCanvas.getContext("2d", { willReadFrequently: true });
  const outCtx = _pwOutCanvas.getContext("2d");
  if (!baseCtx || !outCtx) {
    renderColorPreviewBaseChart(ctx, width, height, cdl, graded, showLabels);
    return;
  }

  renderColorPreviewBaseChart(baseCtx, pwW, pwH, null, false, false);
  const srcImg = baseCtx.getImageData(0, 0, pwW, pwH);
  const outImg = outCtx.createImageData(pwW, pwH);
  const s = srcImg.data;
  const d = outImg.data;
  const nodes = cdl && Array.isArray(cdl.nodes) ? cdl.nodes : [];
  const activeNodeId = sceneOpts && sceneOpts.activeNodeId ? sceneOpts.activeNodeId : null;

  for (let py = 0; py < pwH; py++) {
    const v = (py + 0.5) / pwH;
    const rowOff = py * pwW * 4;
    for (let px = 0; px < pwW; px++) {
      const u = (px + 0.5) / pwW;
      const idx = rowOff + px * 4;
      const rIn = s[idx] / 255;
      const gIn = s[idx + 1] / 255;
      const bIn = s[idx + 2] / 255;
      if (showHighlight) {
        const m = evaluateActiveNodeMaskAtClient(rIn, gIn, bIn, u, v, nodes, activeNodeId);
        const lumByte = Math.round(clamp01(m) * 255);
        d[idx] = lumByte;
        d[idx + 1] = lumByte;
        d[idx + 2] = lumByte;
        d[idx + 3] = 255;
      } else {
        const [ro, go, bo] = applyColorNodeChainRgbAtClient(rIn, gIn, bIn, u, v, nodes);
        d[idx] = Math.round(clamp01(ro) * 255);
        d[idx + 1] = Math.round(clamp01(go) * 255);
        d[idx + 2] = Math.round(clamp01(bo) * 255);
        d[idx + 3] = 255;
      }
    }
  }
  outCtx.putImageData(outImg, 0, 0);
  ctx.drawImage(_pwOutCanvas, 0, 0, width, height);
  if (showLabels && !showHighlight) {
    drawColorPreviewSwatchLabels(ctx, width, height);
  }
}

function drawPowerWindowOverlay(ctx, width, height, rawPw, opts = {}) {
  const pw = normalizePowerWindow(rawPw);
  if (pw.shape === "off") return null;

  const cxPx = pw.center_x * width;
  const cyPx = pw.center_y * height;
  const rxPx = Math.max(8, pw.width * 0.5 * width);
  const ryPx = Math.max(8, pw.height * 0.5 * height);
  const rad = (pw.rotation_deg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const toWorld = (lx, ly) => ({
    x: cxPx + lx * cosA - ly * sinA,
    y: cyPx + lx * sinA + ly * cosA
  });

  const primaryColor = pw.invert ? "#689cff" : "#e68442";
  const featherColor = pw.invert ? "rgba(104, 156, 255, 0.55)" : "rgba(230, 132, 66, 0.55)";

  ctx.save();
  ctx.translate(cxPx, cyPx);
  ctx.rotate(rad);

  // Outer feather boundary
  if (pw.softness > 0.005) {
    ctx.save();
    ctx.strokeStyle = featherColor;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([4, 4]);
    if (pw.shape === "circle") {
      const fRx = rxPx * (1 + pw.softness);
      const fRy = ryPx * (1 + pw.softness);
      ctx.beginPath();
      ctx.ellipse(0, 0, fRx, fRy, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (pw.shape === "linear") {
      const pad = pw.softness * 0.5 * Math.min(width, height);
      ctx.strokeRect(-rxPx - pad, -ryPx - pad, (rxPx + pad) * 2, (ryPx + pad) * 2);
    } else {
      const spanPx = Math.max(12, (pw.height * 0.5 + pw.softness * 0.5) * height);
      const halfLine = width * 0.42;
      ctx.beginPath();
      ctx.moveTo(-halfLine, -spanPx);
      ctx.lineTo(halfLine, -spanPx);
      ctx.moveTo(-halfLine, spanPx);
      ctx.lineTo(halfLine, spanPx);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Inner primary shape
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 1.75;
  if (pw.shape === "circle") {
    ctx.beginPath();
    ctx.ellipse(0, 0, rxPx, ryPx, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (pw.shape === "linear") {
    ctx.strokeRect(-rxPx, -ryPx, rxPx * 2, ryPx * 2);
  } else {
    const halfLine = width * 0.45;
    ctx.beginPath();
    ctx.moveTo(-halfLine, 0);
    ctx.lineTo(halfLine, 0);
    ctx.stroke();
    // Direction indicator tick
    const dirY = pw.invert ? 12 : -12;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, dirY);
    ctx.stroke();
  }

  // Rotation stem & handle
  const rotLocalY = pw.shape === "gradient" ? -Math.min(40, height * 0.22) : -Math.min(ryPx + 18, height * 0.44);
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, pw.shape === "gradient" ? 0 : -ryPx);
  ctx.lineTo(0, rotLocalY);
  ctx.stroke();

  // Center crosshair
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(6, 0);
  ctx.moveTo(0, -6);
  ctx.lineTo(0, 6);
  ctx.stroke();

  // Center puck
  ctx.fillStyle = "#141416";
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Resize handle (corner for circle/linear, span bottom for gradient)
  const resLocalX = pw.shape === "gradient" ? 0 : rxPx;
  const resLocalY = pw.shape === "gradient" ? Math.min(ryPx, height * 0.42) : ryPx;
  ctx.fillStyle = primaryColor;
  ctx.fillRect(resLocalX - 4, resLocalY - 4, 8, 8);

  // Rotate handle
  ctx.fillStyle = "#d8d8de";
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, rotLocalY, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  return {
    shape: pw.shape,
    cxPx,
    cyPx,
    rxPx,
    ryPx,
    rad,
    canvasWidth: width,
    canvasHeight: height,
    handles: {
      move: { x: cxPx, y: cyPx },
      resize: toWorld(resLocalX, resLocalY),
      rotate: toWorld(0, rotLocalY)
    }
  };
}

function drawColorChartOverlay(ctx, width, height, cdl, splitOpts) {
  const patches =
    splitOpts && Array.isArray(splitOpts.shotMatchPatches) && splitOpts.shotMatchPatches.length > 0
      ? splitOpts.shotMatchPatches
      : COLORCHECKER_24_PATCHES_CLIENT.map(([name, rgb]) => ({
          name,
          target_rgb: rgb,
          matched_rgb: applyGradeOrCdlRgb(rgb[0], rgb[1], rgb[2], cdl)
        }));
  const count = Math.min(24, patches.length);
  const cols = 6;
  const rows = Math.ceil(count / cols);
  const boxW = Math.min(252, Math.max(150, Math.round(width * 0.44)));
  const cellW = Math.floor((boxW - 18 - (cols - 1) * 3) / cols);
  const cellH = Math.max(12, Math.min(18, Math.round(cellW * 0.56)));
  const gridW = cols * cellW + (cols - 1) * 3;
  const gridH = rows * cellH + (rows - 1) * 3;
  const panelW = gridW + 16;
  const panelH = gridH + 26;
  const px = Math.max(8, Math.round((width - panelW) / 2));
  const py = Math.max(30, height - panelH - 10);

  ctx.save();
  roundRectPath(ctx, px, py, panelW, panelH, 5);
  ctx.fillStyle = "rgba(15, 16, 20, 0.90)";
  ctx.fill();
  ctx.strokeStyle = "rgba(230, 132, 66, 0.72)";
  ctx.lineWidth = 1.25;
  ctx.stroke();

  ctx.fillStyle = "#d8d8de";
  ctx.font = "700 9px ui-monospace, monospace";
  ctx.fillText("COLORCHECKER 24 (TGT / OUT)", px + 8, py + 13);

  const gx0 = px + 8;
  const gy0 = py + 19;
  for (let i = 0; i < count; i++) {
    const p = patches[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = gx0 + col * (cellW + 3);
    const cy = gy0 + row * (cellH + 3);
    const tgt = p.target_rgb || [0.5, 0.5, 0.5];
    const out = p.matched_rgb || applyGradeOrCdlRgb(tgt[0], tgt[1], tgt[2], cdl);

    // Top-left triangle: target reference; bottom-right triangle: active node output
    ctx.fillStyle = toCssRgb(tgt[0], tgt[1], tgt[2]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + cellW, cy);
    ctx.lineTo(cx, cy + cellH);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = toCssRgb(out[0], out[1], out[2]);
    ctx.beginPath();
    ctx.moveTo(cx + cellW, cy);
    ctx.lineTo(cx + cellW, cy + cellH);
    ctx.lineTo(cx, cy + cellH);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 0.75;
    ctx.strokeRect(cx, cy, cellW, cellH);
  }
  ctx.restore();
}

export function sampleDataUrlRgbGrid(dataUrl, cols = 6, rows = 4) {
  return new Promise((resolve) => {
    if (!dataUrl || typeof dataUrl !== "string") {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const w = Math.max(12, cols * 8);
        const h = Math.max(8, rows * 8);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h).data;
        const samples = [];
        const cw = w / cols;
        const ch = h / rows;
        for (let r = 0; r < rows; r++) {
          for (let col = 0; col < cols; col++) {
            const x0 = Math.floor(col * cw);
            const x1 = Math.max(x0 + 1, Math.floor((col + 1) * cw));
            const y0 = Math.floor(r * ch);
            const y1 = Math.max(y0 + 1, Math.floor((r + 1) * ch));
            let sr = 0;
            let sg = 0;
            let sb = 0;
            let cnt = 0;
            for (let y = y0; y < y1; y++) {
              for (let x = x0; x < x1; x++) {
                const idx = (y * w + x) * 4;
                sr += imgData[idx] / 255;
                sg += imgData[idx + 1] / 255;
                sb += imgData[idx + 2] / 255;
                cnt += 1;
              }
            }
            samples.push(cnt > 0 ? [sr / cnt, sg / cnt, sb / cnt] : [0.5, 0.5, 0.5]);
          }
        }
        resolve(samples);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export function drawColorPreviewCanvas(canvas, cdl, wipeRatio, splitOpts = null) {
  const { ctx, width, height } = setupCanvas(canvas, 224);
  const wipeEnabled =
    splitOpts && typeof splitOpts.enabled === "boolean" ? splitOpts.enabled : true;
  const wipePct =
    splitOpts && splitOpts.positionPct !== undefined
      ? clampSplitWipePercent(splitOpts.positionPct)
      : clampSplitWipePercent((wipeRatio ?? 0.5) * 100);
  const isRefMatchMode = Boolean(splitOpts && splitOpts.wipeMode === "ref_match");

  const drawHalf = (xStart, xEnd, graded, overrideCdl = null) => {
    if (xEnd <= xStart) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(xStart, 0, xEnd - xStart, height);
    ctx.clip();
    renderColorPreviewScene(ctx, width, height, overrideCdl || cdl, graded, true, splitOpts);
    ctx.restore();
  };

  if (wipeEnabled) {
    const geom = computeSplitWipeGeometry(0, 0, width, height, wipePct);
    if (isRefMatchMode && splitOpts && splitOpts.refGrade) {
      drawHalf(0, geom.dividerX, true, splitOpts.refGrade);
      drawHalf(geom.dividerX, width, true, cdl);
    } else {
      drawHalf(0, geom.dividerX, false);
      drawHalf(geom.dividerX, width, true);
    }
    const overlayOpts = isRefMatchMode
      ? {
          ...(splitOpts || {}),
          beforeLabel: (splitOpts && splitOpts.refLabel) || "REF TARGET",
          afterLabel: (splitOpts && splitOpts.matchLabel) || "MATCHED"
        }
      : splitOpts || {};
    drawSplitWipeOverlay(ctx, 0, 0, width, height, geom, overlayOpts);
    canvas._splitWipeGeom = {
      ...geom,
      canvasWidth: width,
      canvasHeight: height
    };
  } else {
    drawHalf(0, width, true);
    canvas._splitWipeGeom = null;
  }

  if (splitOpts && splitOpts.showColorChartOverlay) {
    drawColorChartOverlay(ctx, width, height, cdl, splitOpts);
  }

  if (splitOpts && splitOpts.qualifierHighlight) {
    ctx.save();
    ctx.fillStyle = "rgba(17, 17, 20, 0.85)";
    ctx.strokeStyle = "#e68442";
    ctx.lineWidth = 1;
    ctx.fillRect(width - 122, 8, 114, 20);
    ctx.strokeRect(width - 122, 8, 114, 20);
    ctx.fillStyle = "#f4a46b";
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillText("HIGHLIGHT MATTE", width - 115, 21);
    ctx.restore();
  }

  const pwOpts = splitOpts && splitOpts.powerWindow ? splitOpts.powerWindow : null;
  if (pwOpts && pwOpts.showOverlay && pwOpts.window && isPowerWindowActive(pwOpts.window)) {
    canvas._powerWindowGeom = drawPowerWindowOverlay(ctx, width, height, pwOpts.window, pwOpts);
  } else {
    canvas._powerWindowGeom = null;
  }

  // Maintain an ungraded source buffer for instant eyedropper sampling
  const pickW = 280;
  const pickH = 168;
  if (!canvas._ungradedSourceCanvas) {
    canvas._ungradedSourceCanvas = document.createElement("canvas");
  }
  const srcBuf = canvas._ungradedSourceCanvas;
  if (srcBuf.width !== pickW || srcBuf.height !== pickH) {
    srcBuf.width = pickW;
    srcBuf.height = pickH;
  }
  const srcBufCtx = srcBuf.getContext("2d", { willReadFrequently: true });
  if (srcBufCtx) {
    renderColorPreviewBaseChart(srcBufCtx, pickW, pickH, null, false, false);
  }

  // Maintain a clean full-frame graded buffer of #color-preview-canvas for real ImageData scopes
  const scopeW = Math.max(260, Math.min(400, width));
  const scopeH = height;
  if (!canvas._gradedScopeCanvas) {
    canvas._gradedScopeCanvas = document.createElement("canvas");
  }
  const gradedBuf = canvas._gradedScopeCanvas;
  if (gradedBuf.width !== scopeW || gradedBuf.height !== scopeH) {
    gradedBuf.width = scopeW;
    gradedBuf.height = scopeH;
  }
  const gradedCtx = gradedBuf.getContext("2d", { willReadFrequently: true });
  if (gradedCtx) {
    renderColorPreviewScene(gradedCtx, scopeW, scopeH, cdl, true, false);
  }
}

export function sampleColorViewerInputRgb(canvas, cdl, u, v, activeNodeId = null) {
  if (!canvas || !canvas._ungradedSourceCanvas) return null;
  const buf = canvas._ungradedSourceCanvas;
  const ctx = buf.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const cu = clamp01(u);
  const cv = clamp01(v);
  const px = Math.min(buf.width - 1, Math.max(0, Math.floor(cu * buf.width)));
  const py = Math.min(buf.height - 1, Math.max(0, Math.floor(cv * buf.height)));
  const pixel = ctx.getImageData(px, py, 1, 1).data;
  const rIn = pixel[0] / 255;
  const gIn = pixel[1] / 255;
  const bIn = pixel[2] / 255;
  const nodes = cdl && Array.isArray(cdl.nodes) ? cdl.nodes : [];
  if (nodes.length === 0) return [rIn, gIn, bIn];
  return applyColorNodesBeforeTargetClient(rIn, gIn, bIn, cu, cv, nodes, activeNodeId);
}

export function drawQualifierSpectrumCanvas(canvas, rawQualifier) {
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas, 56);
  const q = normalizeQualifier(rawQualifier);

  ctx.fillStyle = "#111114";
  ctx.fillRect(0, 0, width, height);

  const labelW = 28;
  const padR = 6;
  const barX = labelW;
  const barW = Math.max(40, width - labelW - padR);
  const rows = [
    { key: "H", y: 5, h: 12 },
    { key: "S", y: 22, h: 12 },
    { key: "L", y: 39, h: 12 }
  ];

  // Hue spectrum track
  const hueGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  hueGrad.addColorStop(0.0, "#ff2a2a");
  hueGrad.addColorStop(1 / 6, "#ffff2a");
  hueGrad.addColorStop(2 / 6, "#2aff2a");
  hueGrad.addColorStop(3 / 6, "#2affff");
  hueGrad.addColorStop(4 / 6, "#2a2aff");
  hueGrad.addColorStop(5 / 6, "#ff2aff");
  hueGrad.addColorStop(1.0, "#ff2a2a");
  ctx.fillStyle = hueGrad;
  ctx.fillRect(barX, rows[0].y, barW, rows[0].h);

  // Saturation gradient track
  const satGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  satGrad.addColorStop(0.0, "#404046");
  satGrad.addColorStop(1.0, `hsl(${Math.round(q.hue_center)}, 92%, 55%)`);
  ctx.fillStyle = satGrad;
  ctx.fillRect(barX, rows[1].y, barW, rows[1].h);

  // Luminance gradient track
  const lumGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  lumGrad.addColorStop(0.0, "#0b0b0d");
  lumGrad.addColorStop(0.5, "#7e7e86");
  lumGrad.addColorStop(1.0, "#f5f5f7");
  ctx.fillStyle = lumGrad;
  ctx.fillRect(barX, rows[2].y, barW, rows[2].h);

  // Row labels & borders
  ctx.font = "9px ui-monospace, monospace";
  rows.forEach((row) => {
    ctx.fillStyle = q.enabled ? "#d8d8de" : "#6c6c75";
    ctx.fillText(row.key, 8, row.y + 9);
    ctx.strokeStyle = "#2b2b31";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, row.y, barW, row.h);
  });

  if (!q.enabled) {
    ctx.fillStyle = "rgba(17, 17, 20, 0.55)";
    ctx.fillRect(barX, 0, barW, height);
    return;
  }

  const strokeColor = q.invert ? "#689cff" : "#e68442";
  const drawRangeBracket = (y, h, lo, hi, soft) => {
    const x0 = barX + clamp01(lo) * barW;
    const x1 = barX + clamp01(hi) * barW;
    const xSoftL = barX + clamp01(lo - soft) * barW;
    const xSoftR = barX + clamp01(hi + soft) * barW;
    ctx.fillStyle = "rgba(12, 12, 15, 0.68)";
    if (!q.invert) {
      if (xSoftL > barX) ctx.fillRect(barX, y, xSoftL - barX, h);
      if (xSoftR < barX + barW) ctx.fillRect(xSoftR, y, barX + barW - xSoftR, h);
    } else if (x1 > x0) {
      ctx.fillRect(x0, y, x1 - x0, h);
    }
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, y, Math.max(2, x1 - x0), h);
    if (soft > 0.005) {
      ctx.save();
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = q.invert ? "rgba(104, 156, 255, 0.7)" : "rgba(230, 132, 66, 0.7)";
      ctx.beginPath();
      ctx.moveTo(xSoftL, y);
      ctx.lineTo(xSoftL, y + h);
      ctx.moveTo(xSoftR, y);
      ctx.lineTo(xSoftR, y + h);
      ctx.stroke();
      ctx.restore();
    }
  };

  // Hue bracket with wrap-around awareness
  if (q.hue_width < 359.9) {
    const hwNorm = (q.hue_width * 0.5) / 360.0;
    const hsNorm = q.hue_softness / 360.0;
    const cNorm = (q.hue_center % 360.0) / 360.0;
    const lo = cNorm - hwNorm;
    const hi = cNorm + hwNorm;
    if (lo < 0) {
      drawRangeBracket(rows[0].y, rows[0].h, 0, hi, hsNorm);
      drawRangeBracket(rows[0].y, rows[0].h, 1 + lo, 1, hsNorm);
    } else if (hi > 1) {
      drawRangeBracket(rows[0].y, rows[0].h, lo, 1, hsNorm);
      drawRangeBracket(rows[0].y, rows[0].h, 0, hi - 1, hsNorm);
    } else {
      drawRangeBracket(rows[0].y, rows[0].h, lo, hi, hsNorm);
    }
    const cx = barX + cNorm * barW;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(cx, rows[0].y - 2);
    ctx.lineTo(cx, rows[0].y + rows[0].h + 2);
    ctx.stroke();
  } else {
    drawRangeBracket(rows[0].y, rows[0].h, 0, 1, 0);
  }

  drawRangeBracket(rows[1].y, rows[1].h, q.sat_low, q.sat_high, q.sat_softness);
  drawRangeBracket(rows[2].y, rows[2].h, q.lum_low, q.lum_high, q.lum_softness);
}

function resolveCaptureCssWidth(sourceCanvas, fallbackWidth = 640) {
  if (sourceCanvas) {
    const parentRect = sourceCanvas.parentElement
      ? sourceCanvas.parentElement.getBoundingClientRect()
      : null;
    const selfRect = sourceCanvas.getBoundingClientRect ? sourceCanvas.getBoundingClientRect() : null;
    const candidate =
      parentRect && parentRect.width > 0
        ? parentRect.width
        : selfRect && selfRect.width > 0
          ? selfRect.width
          : 0;
    if (candidate > 0) {
      return Math.max(320, Math.floor(candidate));
    }
  }
  return fallbackWidth;
}

export function captureCleanColorStill(sourceCanvas, cdl) {
  const cssW = resolveCaptureCssWidth(sourceCanvas, 640);
  const cssH = 224;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const offscreen = document.createElement("canvas");
  offscreen.width = Math.floor(cssW * dpr);
  offscreen.height = Math.floor(cssH * dpr);
  const ctx = offscreen.getContext("2d");
  if (!ctx) return { dataUrl: "", width: 0, height: 0 };
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderColorPreviewScene(ctx, cssW, cssH, cdl, true, true);
  return {
    dataUrl: offscreen.toDataURL("image/png"),
    width: offscreen.width,
    height: offscreen.height
  };
}

export function captureCleanFxStill(
  sourceCanvas,
  doc,
  playheadFrame,
  cdl,
  fxState = null,
  titleState = null,
  framingState = null,
  subtitleState = null,
  chromaKeyState = null
) {
  const cssW = resolveCaptureCssWidth(sourceCanvas, 640);
  const offscreen = document.createElement("canvas");
  drawProgramMonitorCanvas(
    offscreen,
    doc,
    playheadFrame,
    cdl,
    fxState,
    titleState,
    framingState,
    subtitleState,
    chromaKeyState,
    { enabled: false },
    { explicitWidth: cssW }
  );
  return {
    dataUrl: offscreen.toDataURL("image/png"),
    width: offscreen.width,
    height: offscreen.height
  };
}

let _scopeTraceCanvas = null;
let _fallbackPreviewCanvas = null;

function getScopeTraceSurface(w, h) {
  if (!_scopeTraceCanvas) {
    _scopeTraceCanvas = document.createElement("canvas");
  }
  if (_scopeTraceCanvas.width !== w || _scopeTraceCanvas.height !== h) {
    _scopeTraceCanvas.width = w;
    _scopeTraceCanvas.height = h;
  }
  const traceCtx = _scopeTraceCanvas.getContext("2d");
  const imgData = traceCtx.createImageData(w, h);
  return { traceCanvas: _scopeTraceCanvas, traceCtx, imgData };
}

function getGradedPreviewImageData(previewCanvas, cdl) {
  const buf = previewCanvas && previewCanvas._gradedScopeCanvas ? previewCanvas._gradedScopeCanvas : null;
  if (buf && buf.width > 0 && buf.height > 0) {
    const bCtx = buf.getContext("2d", { willReadFrequently: true });
    if (bCtx) return bCtx.getImageData(0, 0, buf.width, buf.height);
  }
  if (previewCanvas && previewCanvas.width > 0 && previewCanvas.height > 0) {
    const pCtx = previewCanvas.getContext("2d", { willReadFrequently: true });
    if (pCtx) return pCtx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
  }
  if (!_fallbackPreviewCanvas) {
    _fallbackPreviewCanvas = document.createElement("canvas");
  }
  const fbW = 320;
  const fbH = 224;
  if (_fallbackPreviewCanvas.width !== fbW || _fallbackPreviewCanvas.height !== fbH) {
    _fallbackPreviewCanvas.width = fbW;
    _fallbackPreviewCanvas.height = fbH;
  }
  const fbCtx = _fallbackPreviewCanvas.getContext("2d", { willReadFrequently: true });
  renderColorPreviewScene(fbCtx, fbW, fbH, cdl, true, false);
  return fbCtx.getImageData(0, 0, fbW, fbH);
}

function drawIreGraticule(ctx, padL, padT, plotW, plotH, highlightLevels) {
  const ireLevels = [100, 75, 50, 25, 0];
  ctx.font = "9px ui-monospace, monospace";
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  for (const ire of ireLevels) {
    const y = Math.round(padT + (1 - ire / 100) * plotH) + 0.5;
    const isMajor = highlightLevels.includes(ire);
    ctx.strokeStyle = isMajor ? "#383844" : "#24242b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();

    ctx.fillStyle = isMajor ? "#9a9aa6" : "#6b6b76";
    ctx.fillText(String(ire), padL - 5, y);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawRgbParadeScope(ctx, width, height, srcImageData) {
  const padL = 30;
  const padR = 10;
  const padT = 22;
  const padB = 14;
  const plotW = Math.max(96, width - padL - padR);
  const plotH = Math.max(60, height - padT - padB);
  const gap = 6;
  const chW = Math.max(26, Math.floor((plotW - gap * 2) / 3));
  const totalTraceW = chW * 3 + gap * 2;

  const chMeta = [
    { label: "R", x0: padL, offset: 0, base: [229, 83, 75], peak: [255, 196, 190] },
    { label: "G", x0: padL + chW + gap, offset: chW + gap, base: [63, 198, 92], peak: [188, 255, 202] },
    { label: "B", x0: padL + (chW + gap) * 2, offset: (chW + gap) * 2, base: [82, 145, 255], peak: [194, 222, 255] }
  ];

  drawIreGraticule(ctx, padL, padT, totalTraceW, plotH, [100, 50, 0]);

  ctx.strokeStyle = "#2b2b33";
  ctx.lineWidth = 1;
  ctx.font = "700 10px ui-monospace, monospace";
  ctx.textAlign = "center";
  for (const ch of chMeta) {
    ctx.strokeRect(ch.x0 + 0.5, padT + 0.5, chW - 1, plotH - 1);
    ctx.fillStyle = `rgb(${ch.base[0]}, ${ch.base[1]}, ${ch.base[2]})`;
    ctx.fillText(ch.label, ch.x0 + chW / 2, padT - 6);
  }
  ctx.textAlign = "left";

  const srcW = srcImageData.width;
  const srcH = srcImageData.height;
  const data = srcImageData.data;
  const cellCount = chW * plotH;
  const densR = new Uint32Array(cellCount);
  const densG = new Uint32Array(cellCount);
  const densB = new Uint32Array(cellCount);
  const maxRow = plotH - 1;

  for (let sy = 0; sy < srcH; sy++) {
    const rowBase = sy * srcW * 4;
    for (let sx = 0; sx < srcW; sx++) {
      const col = Math.min(chW - 1, Math.floor((sx * chW) / srcW));
      const p = rowBase + sx * 4;
      const rRow = Math.max(0, Math.min(maxRow, Math.round((1 - data[p] / 255) * maxRow)));
      const gRow = Math.max(0, Math.min(maxRow, Math.round((1 - data[p + 1] / 255) * maxRow)));
      const bRow = Math.max(0, Math.min(maxRow, Math.round((1 - data[p + 2] / 255) * maxRow)));
      densR[rRow * chW + col] += 1;
      densG[gRow * chW + col] += 1;
      densB[bRow * chW + col] += 1;
    }
  }

  const { traceCanvas, traceCtx, imgData } = getScopeTraceSurface(totalTraceW, plotH);
  const out = imgData.data;
  const normPeak = Math.max(6, (srcW * srcH) / (chW * 9));
  const densities = [densR, densG, densB];

  for (let c = 0; c < 3; c++) {
    const dens = densities[c];
    const meta = chMeta[c];
    for (let y = 0; y < plotH; y++) {
      const dRow = y * chW;
      const outRow = y * totalTraceW;
      for (let x = 0; x < chW; x++) {
        const count = dens[dRow + x];
        if (count === 0) continue;
        const t = Math.min(1, Math.sqrt(count / normPeak));
        const hot = Math.max(0, (t - 0.55) / 0.45);
        const oi = (outRow + meta.offset + x) * 4;
        out[oi] = Math.round(meta.base[0] + (meta.peak[0] - meta.base[0]) * hot);
        out[oi + 1] = Math.round(meta.base[1] + (meta.peak[1] - meta.base[1]) * hot);
        out[oi + 2] = Math.round(meta.base[2] + (meta.peak[2] - meta.base[2]) * hot);
        out[oi + 3] = Math.round(78 + t * 177);
      }
    }
  }

  traceCtx.putImageData(imgData, 0, 0);
  ctx.drawImage(traceCanvas, padL, padT, totalTraceW, plotH);

  ctx.fillStyle = "#8e8e98";
  ctx.font = "700 10px ui-monospace, monospace";
  ctx.fillText("RGB PARADE", padL, 12);
}

function drawLumaWaveformScope(ctx, width, height, srcImageData) {
  const padL = 30;
  const padR = 10;
  const padT = 22;
  const padB = 14;
  const plotW = Math.max(96, width - padL - padR);
  const plotH = Math.max(60, height - padT - padB);

  drawIreGraticule(ctx, padL, padT, plotW, plotH, [100, 50, 0]);

  ctx.strokeStyle = "#24242b";
  ctx.lineWidth = 1;
  ctx.strokeRect(padL + 0.5, padT + 0.5, plotW - 1, plotH - 1);
  for (const frac of [0.25, 0.5, 0.75]) {
    const gx = Math.round(padL + frac * plotW) + 0.5;
    ctx.beginPath();
    ctx.moveTo(gx, padT);
    ctx.lineTo(gx, padT + plotH);
    ctx.stroke();
  }

  const srcW = srcImageData.width;
  const srcH = srcImageData.height;
  const data = srcImageData.data;
  const densY = new Uint32Array(plotW * plotH);
  const maxRow = plotH - 1;

  for (let sy = 0; sy < srcH; sy++) {
    const rowBase = sy * srcW * 4;
    for (let sx = 0; sx < srcW; sx++) {
      const col = Math.min(plotW - 1, Math.floor((sx * plotW) / srcW));
      const p = rowBase + sx * 4;
      const yVal = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
      const row = Math.max(0, Math.min(maxRow, Math.round((1 - yVal) * maxRow)));
      densY[row * plotW + col] += 1;
    }
  }

  const { traceCanvas, traceCtx, imgData } = getScopeTraceSurface(plotW, plotH);
  const out = imgData.data;
  const normPeak = Math.max(5, (srcW * srcH) / (plotW * 7));

  for (let i = 0; i < densY.length; i++) {
    const count = densY[i];
    if (count === 0) continue;
    const t = Math.min(1, Math.sqrt(count / normPeak));
    const hot = Math.max(0, (t - 0.5) / 0.5);
    const oi = i * 4;
    out[oi] = Math.round(118 + (242 - 118) * hot);
    out[oi + 1] = Math.round(224 + (255 - 224) * hot);
    out[oi + 2] = Math.round(166 + (246 - 166) * hot);
    out[oi + 3] = Math.round(80 + t * 175);
  }

  traceCtx.putImageData(imgData, 0, 0);
  ctx.drawImage(traceCanvas, padL, padT, plotW, plotH);

  ctx.fillStyle = "#8e8e98";
  ctx.font = "700 10px ui-monospace, monospace";
  ctx.fillText("LUMA WAVEFORM (REC.709 Y)", padL, 12);
}

function rgbToRec709CbCrVec(r, g, b) {
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const cb = (b - y) / 1.8556;
  const cr = (r - y) / 1.5748;
  return [cb * 2.0, -cr * 2.0];
}

function drawVectorscope(ctx, width, height, srcImageData) {
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2) + 5;
  const radius = Math.max(48, Math.floor(Math.min(width - 40, height - 34) / 2));
  const vecScale = 0.88;

  // Outer 100% circle, 75% dashed ring, 50% ring, crosshair axes
  ctx.strokeStyle = "#32323c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = "#282830";
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.75 * vecScale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "#24242b";
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.5 * vecScale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx, cy + radius);
  ctx.stroke();

  // Skin-tone I-line (~123 deg in Cb/Cr plane -> -123 deg in canvas Y-down space)
  const skinAngle = (-123 * Math.PI) / 180;
  const skinEndX = cx + Math.cos(skinAngle) * radius;
  const skinEndY = cy + Math.sin(skinAngle) * radius;
  ctx.strokeStyle = "rgba(230, 132, 66, 0.75)";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(skinEndX, skinEndY);
  ctx.stroke();

  ctx.fillStyle = "#e68442";
  ctx.font = "700 9px ui-monospace, monospace";
  ctx.fillText("I", skinEndX - 9, skinEndY + 9);

  // Real pixel Cb/Cr distribution cloud from graded ImageData
  const boxSize = radius * 2 + 2;
  const boxX = cx - radius - 1;
  const boxY = cy - radius - 1;
  const cells = boxSize * boxSize;
  const dens = new Uint32Array(cells);
  const sumR = new Float32Array(cells);
  const sumG = new Float32Array(cells);
  const sumB = new Float32Array(cells);

  const srcW = srcImageData.width;
  const srcH = srcImageData.height;
  const data = srcImageData.data;
  const totalPixels = srcW * srcH;

  for (let i = 0; i < totalPixels; i++) {
    const p = i * 4;
    const r = data[p] / 255;
    const g = data[p + 1] / 255;
    const b = data[p + 2] / 255;
    const [vx, vy] = rgbToRec709CbCrVec(r, g, b);
    const px = Math.round(radius + 1 + vx * vecScale * radius);
    const py = Math.round(radius + 1 + vy * vecScale * radius);
    if (px < 0 || px >= boxSize || py < 0 || py >= boxSize) continue;
    const idx = py * boxSize + px;
    dens[idx] += 1;
    sumR[idx] += r;
    sumG[idx] += g;
    sumB[idx] += b;
  }

  const { traceCanvas, traceCtx, imgData } = getScopeTraceSurface(boxSize, boxSize);
  const out = imgData.data;
  const normPeak = Math.max(8, totalPixels * 0.004);

  for (let i = 0; i < cells; i++) {
    const count = dens[i];
    if (count === 0) continue;
    const t = Math.min(1, Math.sqrt(count / normPeak));
    const avgR = sumR[i] / count;
    const avgG = sumG[i] / count;
    const avgB = sumB[i] / count;
    const oi = i * 4;
    out[oi] = Math.min(255, Math.round((0.25 + 0.75 * avgR) * 255));
    out[oi + 1] = Math.min(255, Math.round((0.25 + 0.75 * avgG) * 255));
    out[oi + 2] = Math.min(255, Math.round((0.25 + 0.75 * avgB) * 255));
    out[oi + 3] = Math.round(92 + t * 163);
  }

  traceCtx.putImageData(imgData, 0, 0);
  ctx.drawImage(traceCanvas, boxX, boxY, boxSize, boxSize);

  // 75% SMPTE broadcast target boxes (R, Yl, G, Cy, B, Mg)
  const targets = [
    { label: "R", rgb: [0.75, 0.0, 0.0], col: "#e5534b" },
    { label: "Yl", rgb: [0.75, 0.75, 0.0], col: "#d29922" },
    { label: "G", rgb: [0.0, 0.75, 0.0], col: "#3fb950" },
    { label: "Cy", rgb: [0.0, 0.75, 0.75], col: "#39c5cf" },
    { label: "B", rgb: [0.0, 0.0, 0.75], col: "#528bff" },
    { label: "Mg", rgb: [0.75, 0.0, 0.75], col: "#c678dd" }
  ];

  ctx.font = "700 9px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const tgt of targets) {
    const [vx, vy] = rgbToRec709CbCrVec(tgt.rgb[0], tgt.rgb[1], tgt.rgb[2]);
    const tx = cx + vx * vecScale * radius;
    const ty = cy + vy * vecScale * radius;
    ctx.strokeStyle = tgt.col;
    ctx.lineWidth = 1.25;
    ctx.strokeRect(tx - 4.5, ty - 4.5, 9, 9);

    const len = Math.hypot(vx, vy) || 1;
    const lx = tx + (vx / len) * 13;
    const ly = ty + (vy / len) * 13;
    ctx.fillStyle = tgt.col;
    ctx.fillText(tgt.label, lx, ly);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#8e8e98";
  ctx.font = "700 10px ui-monospace, monospace";
  ctx.fillText("VECTORSCOPE (Cb / Cr)", 12, 14);
}

export function drawColorScopeCanvas(canvas, cdl, scopeMode = "parade", previewCanvas = null) {
  const { ctx, width, height } = setupCanvas(canvas, 224);
  ctx.fillStyle = "#141416";
  ctx.fillRect(0, 0, width, height);

  const srcImageData = getGradedPreviewImageData(previewCanvas, cdl);
  const mode = scopeMode === "waveform" || scopeMode === "vectorscope" ? scopeMode : "parade";

  if (mode === "waveform") {
    drawLumaWaveformScope(ctx, width, height, srcImageData);
  } else if (mode === "vectorscope") {
    drawVectorscope(ctx, width, height, srcImageData);
  } else {
    drawRgbParadeScope(ctx, width, height, srcImageData);
  }
}

export function drawLoudnessCanvas(canvas, loudness) {
  const { ctx, width, height } = setupCanvas(canvas, 102);
  ctx.fillStyle = "#141416";
  ctx.fillRect(0, 0, width, height);

  if (!loudness) {
    ctx.fillStyle = "#8e8e98";
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillText("No audio loudness data.", 12, 54);
    return;
  }

  const padX = 12;
  const barW = width - padX * 2;
  const minLufs = -36;
  const maxLufs = 0;
  const toX = (val) => padX + clamp01((val - minLufs) / (maxLufs - minLufs)) * barW;

  const bandStart = toX(loudness.target_lufs - loudness.tolerance_lu);
  const bandEnd = toX(loudness.target_lufs + loudness.tolerance_lu);
  ctx.fillStyle = "rgba(63, 185, 80, 0.18)";
  ctx.fillRect(bandStart, 18, Math.max(4, bandEnd - bandStart), 24);
  ctx.strokeStyle = "#3fb950";
  ctx.strokeRect(bandStart, 18, Math.max(4, bandEnd - bandStart), 24);

  ctx.strokeStyle = "#2c2c31";
  ctx.strokeRect(padX, 22, barW, 16);

  const measX = toX(loudness.integrated_lufs);
  ctx.fillStyle = loudness.passed ? "#528bff" : "#e5534b";
  ctx.fillRect(padX + 1, 23, Math.max(2, measX - padX), 14);

  const tgtX = toX(loudness.target_lufs);
  ctx.strokeStyle = "#e07b39";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tgtX, 14);
  ctx.lineTo(tgtX, 46);
  ctx.stroke();

  ctx.fillStyle = "#d8d8de";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText(`I: ${loudness.integrated_lufs.toFixed(1)} LUFS`, padX, 68);
  ctx.fillStyle = "#8e8e98";
  ctx.fillText(`Target: ${loudness.target_lufs.toFixed(1)} +/- ${loudness.tolerance_lu.toFixed(1)}`, padX, 86);
  ctx.fillStyle = loudness.true_peak_dbtp <= loudness.max_true_peak_dbtp ? "#3fb950" : "#e5534b";
  ctx.fillText(`TP: ${loudness.true_peak_dbtp.toFixed(2)} dBTP`, Math.max(padX + 130, width - 126), 68);
}

export function drawFramesCanvas(canvas, samples) {
  const { ctx, width, height } = setupCanvas(canvas, 102);
  ctx.fillStyle = "#141416";
  ctx.fillRect(0, 0, width, height);

  if (!samples || samples.length === 0) {
    ctx.fillStyle = "#8e8e98";
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillText("No frame samples.", 12, 54);
    return;
  }

  const padX = 12;
  const barW = width - padX * 2;
  const rowH = Math.floor((height - 14) / samples.length);

  samples.forEach((s, idx) => {
    const y = 10 + idx * rowH;
    const minX = padX + (s.y_min / 255) * barW;
    const maxX = padX + (s.y_max / 255) * barW;
    const avgX = padX + (s.y_avg / 255) * barW;

    ctx.fillStyle = "#1e1e21";
    ctx.fillRect(padX, y + 6, barW, 10);
    ctx.fillStyle = "rgba(82, 139, 255, 0.55)";
    ctx.fillRect(minX, y + 6, Math.max(4, maxX - minX), 10);
    ctx.fillStyle = "#e07b39";
    ctx.fillRect(avgX - 1, y + 4, 2, 14);

    ctx.fillStyle = "#b4b4be";
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillText(`${s.timestamp_s}s  Y:${s.y_min}..${s.y_avg.toFixed(1)}..${s.y_max}`, padX, y + 4);
  });
}

export function drawStereoVuMeterCanvas(canvas, meterState = {}) {
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas, 56);
  ctx.fillStyle = "#141416";
  ctx.fillRect(0, 0, width, height);

  const minDb = -60;
  const maxDb = 0;
  const labelW = 18;
  const padR = 8;
  const padT = 7;
  const barW = Math.max(80, width - labelW - padR);
  const barH = 10;
  const gapY = 5;
  const dbToFrac = (db) => clamp01((db - minDb) / (maxDb - minDb));
  const dbToX = (db) => labelW + dbToFrac(db) * barW;

  const leftDb = Number.isFinite(Number(meterState.leftDb)) ? Number(meterState.leftDb) : minDb;
  const rightDb = Number.isFinite(Number(meterState.rightDb)) ? Number(meterState.rightDb) : minDb;
  const holdL = Number.isFinite(Number(meterState.holdL)) ? Number(meterState.holdL) : minDb;
  const holdR = Number.isFinite(Number(meterState.holdR)) ? Number(meterState.holdR) : minDb;
  const allMuted = Boolean(meterState.allMuted);
  const duckEnabled = Boolean(meterState.duckEnabled);
  const duckThreshDb = Number.isFinite(Number(meterState.duckThresholdDb))
    ? Number(meterState.duckThresholdDb)
    : -24;

  const grad = ctx.createLinearGradient(labelW, 0, labelW + barW, 0);
  grad.addColorStop(0.0, "#238636");
  grad.addColorStop(0.72, "#3fb950");
  grad.addColorStop(0.80, "#d29922");
  grad.addColorStop(0.94, "#e68442");
  grad.addColorStop(1.0, "#e5534b");

  const channels = [
    { label: "L", db: leftDb, hold: holdL, y: padT },
    { label: "R", db: rightDb, hold: holdR, y: padT + barH + gapY }
  ];

  for (const ch of channels) {
    ctx.fillStyle = allMuted ? "#6e6e78" : "#d8d8de";
    ctx.font = "700 9.5px ui-monospace, monospace";
    ctx.fillText(ch.label, 5, ch.y + 8.5);

    ctx.fillStyle = "#1b1b20";
    ctx.fillRect(labelW, ch.y, barW, barH);

    const activeFrac = dbToFrac(ch.db);
    if (activeFrac > 0.005 && !allMuted) {
      const fillW = Math.max(2, activeFrac * barW);
      ctx.fillStyle = grad;
      ctx.fillRect(labelW, ch.y + 1, fillW, barH - 2);
    }

    // Crisp Fairlight segment grid notches every 3 dB
    ctx.fillStyle = "#141416";
    for (let db = -57; db < 0; db += 3) {
      const sx = Math.round(dbToX(db));
      ctx.fillRect(sx, ch.y, 1, barH);
    }

    // Peak hold tick
    if (!allMuted && ch.hold > minDb + 0.5) {
      const hx = Math.min(labelW + barW - 2, Math.max(labelW, dbToX(ch.hold) - 1));
      ctx.fillStyle = ch.hold >= -3 ? "#ff8e88" : ch.hold >= -12 ? "#ffd166" : "#e6edf3";
      ctx.fillRect(hx, ch.y + 1, 2, barH - 2);
    }

    ctx.strokeStyle = "#2c2c31";
    ctx.lineWidth = 1;
    ctx.strokeRect(labelW + 0.5, ch.y + 0.5, barW - 1, barH - 1);
  }

  // -1.0 dBTP Broadcast True-Peak ceiling guide
  const tpCeilX = Math.round(dbToX(-1.0)) + 0.5;
  ctx.save();
  ctx.strokeStyle = "rgba(248, 113, 113, 0.72)";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(tpCeilX, padT - 1);
  ctx.lineTo(tpCeilX, padT + barH * 2 + gapY + 1);
  ctx.stroke();
  ctx.restore();

  // Optional Auto-Duck sidechain threshold marker across meter bridge
  if (duckEnabled) {
    const tx = Math.round(dbToX(duckThreshDb)) + 0.5;
    ctx.strokeStyle = "rgba(57, 197, 207, 0.85)";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(tx, padT - 2);
    ctx.lineTo(tx, padT + barH * 2 + gapY + 2);
    ctx.stroke();
  }

  // dBFS scale ticks below channels
  const scaleY = padT + barH * 2 + gapY + 12;
  const ticks = width < 320 ? [-48, -24, -12, -6, 0] : [-48, -36, -24, -18, -12, -6, -3, 0];
  ctx.font = "9px ui-monospace, monospace";
  ctx.fillStyle = "#8e8e98";
  for (const tick of ticks) {
    const x = dbToX(tick);
    ctx.strokeStyle = "#34343c";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, scaleY - 10);
    ctx.lineTo(x, scaleY - 7);
    ctx.stroke();
    const txt = tick === 0 ? "0" : String(tick);
    const tw = ctx.measureText(txt).width;
    const drawX = tick === 0 ? Math.min(width - tw - 2, x - tw + 2) : x - tw / 2;
    ctx.fillText(txt, Math.max(labelW, drawX), scaleY + 1);
  }
}

export function drawRetimeRampEditorCanvas(canvas, opts = {}) {
  if (!canvas) return null;
  const { ctx, width, height } = setupCanvas(canvas, 98);
  if (!ctx) return null;

  const hasClip = Boolean(opts.hasClip);
  const retimeNorm = normalizeClipRetime(opts.retimeNorm || {});
  const selectedPointIdx =
    typeof opts.selectedPointIdx === "number" ? opts.selectedPointIdx : -1;
  const playheadNorm = Number.isFinite(Number(opts.playheadNorm))
    ? clamp01(Number(opts.playheadNorm))
    : null;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#111114";
  ctx.fillRect(0, 0, width, height);

  const padL = 34;
  const padR = 12;
  const padT = 12;
  const padB = 18;
  const plotW = Math.max(40, width - padL - padR);
  const plotH = Math.max(32, height - padT - padB);

  const logMin = Math.log2(RETIME_SPEED_MIN);
  const logMax = Math.log2(RETIME_SPEED_MAX);
  const logSpan = Math.max(1e-6, logMax - logMin);

  const speedToY = (spd) => {
    const clamped = Math.max(RETIME_SPEED_MIN, Math.min(RETIME_SPEED_MAX, Number(spd) || 1.0));
    const norm = (Math.log2(clamped) - logMin) / logSpan;
    return padT + plotH - norm * plotH;
  };
  const yToSpeed = (y) => {
    const norm = clamp01((padT + plotH - y) / plotH);
    return Number(
      Math.max(
        RETIME_SPEED_MIN,
        Math.min(RETIME_SPEED_MAX, Math.pow(2, logMin + norm * logSpan))
      ).toFixed(2)
    );
  };
  const posToX = (posNorm) => padL + clamp01(posNorm) * plotW;
  const xToPos = (x) => clamp01((x - padL) / plotW);

  // Horizontal speed grid lines (0.25x, 0.5x, 1x, 2x, 4x)
  ctx.font = "9px ui-monospace, monospace";
  const speedTicks = [0.25, 0.5, 1.0, 2.0, 4.0];
  for (const tick of speedTicks) {
    const gy = Math.round(speedToY(tick)) + 0.5;
    const isUnity = Math.abs(tick - 1.0) < 1e-6;
    ctx.strokeStyle = isUnity ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, gy);
    ctx.lineTo(padL + plotW, gy);
    ctx.stroke();

    ctx.fillStyle = isUnity ? "#d8d8de" : "#6e6e78";
    const lbl = tick === 1 ? "1x" : tick < 1 ? `${tick}` : `${tick}x`;
    ctx.fillText(lbl, 4, gy + 3);
  }

  // Vertical time percent grid (0%, 25%, 50%, 75%, 100%)
  for (const pct of [0, 0.25, 0.5, 0.75, 1]) {
    const gx = Math.round(posToX(pct)) + 0.5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.beginPath();
    ctx.moveTo(gx, padT);
    ctx.lineTo(gx, padT + plotH);
    ctx.stroke();

    ctx.fillStyle = "#6e6e78";
    const pctText = `${Math.round(pct * 100)}%`;
    const tw = ctx.measureText(pctText).width;
    const tx = pct === 1 ? padL + plotW - tw : pct === 0 ? padL : gx - tw / 2;
    ctx.fillText(pctText, tx, height - 4);
  }

  // Plot frame border
  ctx.strokeStyle = "#2b2b33";
  ctx.lineWidth = 1;
  ctx.strokeRect(padL + 0.5, padT + 0.5, plotW - 1, plotH - 1);

  if (!hasClip) {
    ctx.fillStyle = "#6e6e78";
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillText("Select a clip to edit Speed Ramp curve", padL + 10, padT + plotH / 2 + 4);
    return {
      padL,
      padT,
      plotW,
      plotH,
      points: [],
      speedToY,
      yToSpeed,
      posToX,
      xToPos
    };
  }

  const pts =
    retimeNorm.rampPoints.length >= 2
      ? retimeNorm.rampPoints
      : [
          { pos_norm: 0.0, speed_rate: retimeNorm.speedRate },
          { pos_norm: 1.0, speed_rate: retimeNorm.speedRate }
        ];

  const isOpticalFlow = retimeNorm.retimeProcess === "optical_flow";
  const strokeHex = isOpticalFlow ? "#39c5cf" : "#e68442";
  const fillTop = isOpticalFlow ? "rgba(57, 197, 207, 0.24)" : "rgba(230, 132, 66, 0.26)";
  const fillBot = isOpticalFlow ? "rgba(57, 197, 207, 0.02)" : "rgba(230, 132, 66, 0.02)";

  // Smooth curve area + line
  const samples = 72;
  const curveCoords = [];
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const spd = evaluateRetimeSpeedAt(pts, u, retimeNorm.speedRate);
    curveCoords.push({ x: posToX(u), y: speedToY(spd), u, spd });
  }

  const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
  grad.addColorStop(0, fillTop);
  grad.addColorStop(1, fillBot);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(curveCoords[0].x, padT + plotH);
  for (const c of curveCoords) ctx.lineTo(c.x, c.y);
  ctx.lineTo(curveCoords[curveCoords.length - 1].x, padT + plotH);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = strokeHex;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < curveCoords.length; i++) {
    if (i === 0) ctx.moveTo(curveCoords[i].x, curveCoords[i].y);
    else ctx.lineTo(curveCoords[i].x, curveCoords[i].y);
  }
  ctx.stroke();

  // Playhead vertical cursor + live instantaneous speed dot
  if (playheadNorm !== null) {
    const phX = posToX(playheadNorm);
    const phSpd = evaluateRetimeSpeedAt(pts, playheadNorm, retimeNorm.speedRate);
    const phY = speedToY(phSpd);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(phX, padT);
    ctx.lineTo(phX, padT + plotH);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(phX, phY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Control point diamonds
  const renderedPoints = [];
  for (let idx = 0; idx < pts.length; idx++) {
    const pt = pts[idx];
    const px = posToX(pt.pos_norm);
    const py = speedToY(pt.speed_rate);
    const isSel = idx === selectedPointIdx;
    renderedPoints.push({ index: idx, x: px, y: py, pos_norm: pt.pos_norm, speed_rate: pt.speed_rate });

    if (isSel) {
      ctx.fillStyle = "rgba(255, 209, 102, 0.26)";
      ctx.beginPath();
      ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.PI / 4);
    const sz = isSel ? 5.2 : 4.2;
    ctx.fillStyle = isSel ? "#ffd166" : strokeHex;
    ctx.strokeStyle = "#111114";
    ctx.lineWidth = 1.4;
    ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
    ctx.strokeRect(-sz, -sz, sz * 2, sz * 2);
    ctx.restore();
  }

  return {
    padL,
    padT,
    plotW,
    plotH,
    points: renderedPoints,
    speedToY,
    yToSpeed,
    posToX,
    xToPos
  };
}

const CURVE_CHANNEL_COLORS = {
  master: "#e6e6ee",
  red: "#f06565",
  green: "#56cf74",
  blue: "#58a6ff"
};

export function drawColorCurvesCanvas(
  canvas,
  rawCurves,
  activeChannel = "master",
  selectedPointIdx = -1,
  opts = {}
) {
  if (!canvas) return null;
  const selfRect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
  const width = Math.max(176, Math.floor(selfRect && selfRect.width > 0 ? selfRect.width : 212));
  const height = 196;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const curves = normalizeColorCurves(rawCurves);
  const ch = CURVE_CHANNELS.includes(activeChannel) ? activeChannel : "master";
  const pad = 14;
  const plotW = Math.max(40, width - pad * 2);
  const plotH = Math.max(40, height - pad * 2);

  const toX = (u) => pad + clamp01(u) * plotW;
  const toY = (v) => pad + (1 - clamp01(v)) * plotH;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#111216";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#14161c";
  ctx.fillRect(pad, pad, plotW, plotH);

  // Live channel histogram backdrop sampled from graded color viewer
  const previewCanvas = opts && opts.previewCanvas ? opts.previewCanvas : null;
  const srcImg = previewCanvas ? getGradedPreviewImageData(previewCanvas, opts.cdl || null) : null;
  if (srcImg && srcImg.data && srcImg.data.length > 0) {
    const bins = 48;
    const hist = new Float32Array(bins);
    const data = srcImg.data;
    const step = Math.max(4, Math.floor(data.length / 4 / 1200) * 4);
    for (let i = 0; i < data.length; i += step) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      let val = 0;
      if (ch === "red") val = r;
      else if (ch === "green") val = g;
      else if (ch === "blue") val = b;
      else val = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const bin = Math.min(bins - 1, Math.max(0, Math.floor(val * bins)));
      hist[bin] += 1;
    }
    let maxH = 1;
    for (let b = 0; b < bins; b++) {
      if (hist[b] > maxH) maxH = hist[b];
    }
    const barW = plotW / bins;
    ctx.fillStyle =
      ch === "red"
        ? "rgba(240, 101, 101, 0.16)"
        : ch === "green"
          ? "rgba(86, 207, 116, 0.16)"
          : ch === "blue"
            ? "rgba(88, 166, 255, 0.16)"
            : "rgba(216, 216, 226, 0.14)";
    for (let b = 0; b < bins; b++) {
      const hNorm = Math.sqrt(hist[b] / maxH);
      const bh = hNorm * plotH * 0.78;
      if (bh > 0.5) {
        ctx.fillRect(pad + b * barW, pad + plotH - bh, Math.max(1, barW - 0.5), bh);
      }
    }
  }

  // 4x4 reference grid
  ctx.strokeStyle = "#22242e";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const gx = Math.round(pad + (i / 4) * plotW) + 0.5;
    const gy = Math.round(pad + (i / 4) * plotH) + 0.5;
    ctx.beginPath();
    ctx.moveTo(gx, pad);
    ctx.lineTo(gx, pad + plotH);
    ctx.moveTo(pad, gy);
    ctx.lineTo(pad + plotW, gy);
    ctx.stroke();
  }

  // Diagonal unity line
  ctx.save();
  ctx.strokeStyle = "#343746";
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(0));
  ctx.lineTo(toX(1), toY(1));
  ctx.stroke();
  ctx.restore();

  // Draw inactive channels subtly when modified
  for (const channel of CURVE_CHANNELS) {
    if (channel === ch) continue;
    const pts = curves[channel];
    if (isCurveChannelIdentity(pts)) continue;
    const lut = buildCurveLut256Client(pts);
    ctx.save();
    ctx.strokeStyle = CURVE_CHANNEL_COLORS[channel];
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    for (let i = 0; i < 256; i++) {
      const px = toX(i / 255);
      const py = toY(lut[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Draw active channel PCHIP spline
  const activePts = normalizeCurvePoints(curves[ch]);
  const activeLut = buildCurveLut256Client(activePts);
  const strokeColor = CURVE_CHANNEL_COLORS[ch];

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  for (let i = 0; i < 256; i++) {
    const px = toX(i / 255);
    const py = toY(activeLut[i]);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Control knots
  const renderedPts = [];
  for (let i = 0; i < activePts.length; i++) {
    const [u, v] = activePts[i];
    const px = toX(u);
    const py = toY(v);
    const isSel = i === selectedPointIdx;
    renderedPts.push({ index: i, u, v, x: px, y: py });

    if (isSel) {
      ctx.fillStyle = "rgba(224, 123, 57, 0.28)";
      ctx.beginPath();
      ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = isSel ? "#e07b39" : "#14151a";
    ctx.strokeStyle = isSel ? "#ffd166" : strokeColor;
    ctx.lineWidth = isSel ? 2 : 1.75;
    ctx.beginPath();
    ctx.arc(px, py, isSel ? 5 : 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  const geom = {
    pad,
    plotW,
    plotH,
    width,
    height,
    activeChannel: ch,
    points: renderedPts
  };
  canvas._curvesGeom = geom;
  return geom;
}

const HSL_VECTOR_COLORS = {
  reds: "#ff4b4b",
  yellows: "#ffd23f",
  greens: "#3ad97b",
  cyans: "#2ce6ff",
  blues: "#4b8bff",
  magentas: "#e85dff"
};

const HSL_VECTOR_SHORT = {
  reds: "R",
  yellows: "Y",
  greens: "G",
  cyans: "C",
  blues: "B",
  magentas: "M"
};

export function drawHslCurvesCanvas(
  canvas,
  rawHslCurves,
  rawMode = "hue_vs_hue",
  selectedVector = "reds"
) {
  if (!canvas) return null;
  const selfRect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
  const width = Math.max(176, Math.floor(selfRect && selfRect.width > 0 ? selfRect.width : 212));
  const height = 196;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const mode = HSL_CURVE_MODES.includes(rawMode) ? rawMode : "hue_vs_hue";
  const hsl = normalizeHslCurves(rawHslCurves);
  const channel = hsl[mode];
  const bounds = HSL_HUE_BOUNDS[mode];
  const selVec = HSL_HUE_VECTORS.includes(selectedVector) ? selectedVector : "reds";

  const pad = 16;
  const plotW = Math.max(40, width - pad * 2);
  const plotH = Math.max(40, height - pad * 2 - 10);
  const toX = (deg) => pad + (Math.max(0, Math.min(360, deg)) / 360) * plotW;
  const toY = (val) => {
    const norm = (val - bounds.min) / Math.max(1e-6, bounds.max - bounds.min);
    return pad + (1 - clamp01(norm)) * plotH;
  };

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#111216";
  ctx.fillRect(0, 0, width, height);

  // Hue spectrum gradient backdrop
  const grad = ctx.createLinearGradient(pad, 0, pad + plotW, 0);
  grad.addColorStop(0.0, "rgba(255, 75, 75, 0.22)");
  grad.addColorStop(1 / 6, "rgba(255, 210, 63, 0.22)");
  grad.addColorStop(2 / 6, "rgba(58, 217, 123, 0.22)");
  grad.addColorStop(3 / 6, "rgba(44, 230, 255, 0.22)");
  grad.addColorStop(4 / 6, "rgba(75, 139, 255, 0.22)");
  grad.addColorStop(5 / 6, "rgba(232, 93, 255, 0.22)");
  grad.addColorStop(1.0, "rgba(255, 75, 75, 0.22)");
  ctx.fillStyle = "#14161c";
  ctx.fillRect(pad, pad, plotW, plotH);
  ctx.fillStyle = grad;
  ctx.fillRect(pad, pad, plotW, plotH);

  // Horizontal quarter lines & zero baseline
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const gy = Math.round(pad + (i / 4) * plotH) + 0.5;
    ctx.beginPath();
    ctx.moveTo(pad, gy);
    ctx.lineTo(pad + plotW, gy);
    ctx.stroke();
  }
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
  ctx.setLineDash([4, 4]);
  const zeroY = Math.round(toY(0)) + 0.5;
  ctx.beginPath();
  ctx.moveTo(pad, zeroY);
  ctx.lineTo(pad + plotW, zeroY);
  ctx.stroke();
  ctx.restore();

  // Vertical anchor lines at 0, 60, 120, 180, 240, 300, 360
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  for (const vec of HSL_HUE_VECTORS) {
    const gx = Math.round(toX(HSL_HUE_ANCHOR_DEGREES[vec])) + 0.5;
    ctx.beginPath();
    ctx.moveTo(gx, pad);
    ctx.lineTo(gx, pad + plotH);
    ctx.stroke();
  }

  // Smooth periodic Catmull-Rom curve across 0..360 deg
  const vals6 = HSL_HUE_VECTORS.map((v) => Number(channel[v]) || 0);
  const steps = 180;
  ctx.strokeStyle = "#f4f7fb";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const deg = (i / steps) * 360;
    const rawVal = evaluatePeriodicHueCurveClient(vals6, deg);
    const clampedVal = Math.min(bounds.max, Math.max(bounds.min, rawVal));
    const px = toX(deg);
    const py = toY(clampedVal);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Periodic wrap-around ghost dot for Red at 360 deg
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = HSL_VECTOR_COLORS.reds;
  ctx.beginPath();
  ctx.arc(toX(360), toY(vals6[0]), 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 6 interactive vector anchor handles + labels
  const points = [];
  ctx.font = "600 9px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const vec of HSL_HUE_VECTORS) {
    const deg = HSL_HUE_ANCHOR_DEGREES[vec];
    const val = Number(channel[vec]) || 0;
    const px = toX(deg);
    const py = toY(val);
    const color = HSL_VECTOR_COLORS[vec];
    const isSel = vec === selVec;
    points.push({ vector: vec, deg, value: val, x: px, y: py });

    if (isSel) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = isSel ? color : "#14151a";
    ctx.strokeStyle = color;
    ctx.lineWidth = isSel ? 2.2 : 1.8;
    ctx.beginPath();
    ctx.arc(px, py, isSel ? 5.5 : 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isSel ? "#ffffff" : color;
    ctx.fillText(HSL_VECTOR_SHORT[vec], px, pad + plotH + 4);
  }

  const geom = {
    pad,
    plotW,
    plotH,
    width,
    height,
    mode,
    selectedVector: selVec,
    bounds,
    points
  };
  canvas._hslGeom = geom;
  return geom;
}

export function renderFairlightEqCurveCanvas(canvas, rawRackParams, selectedBandId = "low_mid") {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(240, Math.round(rect.width || canvas.clientWidth || 300));
  const height = Math.max(128, Math.round(rect.height || canvas.clientHeight || 156));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const params = normalizeFairlightAudioRackParams(rawRackParams);
  const padL = 28;
  const padR = 10;
  const padT = 12;
  const padB = 20;
  const plotW = Math.max(80, width - padL - padR);
  const plotH = Math.max(60, height - padT - padB);
  const logMin = Math.log10(20);
  const logMax = Math.log10(20000);
  const freqToX = (hz) => {
    const clamped = Math.max(20, Math.min(20000, hz));
    return padL + ((Math.log10(clamped) - logMin) / (logMax - logMin)) * plotW;
  };
  const dbToY = (db) => {
    const clamped = Math.max(-18, Math.min(18, db));
    return padT + ((18 - clamped) / 36) * plotH;
  };

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#111216";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#14161c";
  ctx.fillRect(padL, padT, plotW, plotH);

  // Horizontal dB graticule
  ctx.font = "9px ui-monospace, monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const db of [18, 12, 6, 0, -6, -12, -18]) {
    const y = Math.round(dbToY(db)) + 0.5;
    ctx.strokeStyle = db === 0 ? "#384152" : "#22242e";
    ctx.lineWidth = db === 0 ? 1.2 : 1;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    if (db === 18 || db === 0 || db === -18 || db === 12 || db === -12) {
      ctx.fillStyle = db === 0 ? "#cbd5e1" : "#6b7280";
      ctx.fillText(db > 0 ? `+${db}` : String(db), padL - 4, y);
    }
  }

  // Logarithmic frequency graticule
  const freqTicks = [
    { hz: 20, label: "20" },
    { hz: 50, label: "50" },
    { hz: 100, label: "100" },
    { hz: 200, label: "200" },
    { hz: 500, label: "500" },
    { hz: 1000, label: "1k" },
    { hz: 2000, label: "2k" },
    { hz: 5000, label: "5k" },
    { hz: 10000, label: "10k" },
    { hz: 20000, label: "20k" }
  ];
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const tick of freqTicks) {
    const x = Math.round(freqToX(tick.hz)) + 0.5;
    ctx.strokeStyle = tick.hz === 1000 ? "#323846" : "#1f222b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + plotH);
    ctx.stroke();
    if (tick.hz !== 200 && tick.hz !== 2000 && tick.hz !== 20000) {
      ctx.fillStyle = "#7a808e";
      ctx.fillText(tick.label, x, padT + plotH + 4);
    }
  }

  // Draw individual band translucent curves when EQ is enabled
  const samples = 120;
  if (params.eq_enabled) {
    for (const band of params.bands) {
      if (!band.enabled || Math.abs(band.gain_db) <= 0.05) continue;
      const spec = FAIRLIGHT_EQ_BAND_SPECS[band.band_id];
      ctx.save();
      ctx.strokeStyle = spec ? spec.color : "#39c5cf";
      ctx.globalAlpha = band.band_id === selectedBandId ? 0.55 : 0.24;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        const logF = logMin + (i / samples) * (logMax - logMin);
        const f = Math.pow(10, logF);
        const y = dbToY(evaluateFairlightEqBandDb(band, f));
        const x = padL + (i / samples) * plotW;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  // Composite response curve
  const zeroY = dbToY(0);
  const curvePts = [];
  for (let i = 0; i <= samples; i++) {
    const logF = logMin + (i / samples) * (logMax - logMin);
    const f = Math.pow(10, logF);
    const x = padL + (i / samples) * plotW;
    const db = params.eq_enabled ? evaluateFairlightEqCurveDb(params, f) : 0;
    const y = dbToY(db);
    curvePts.push({ x, y });
  }

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(padL, zeroY);
  for (const p of curvePts) ctx.lineTo(p.x, p.y);
  ctx.lineTo(padL + plotW, zeroY);
  ctx.closePath();
  ctx.fillStyle = params.eq_enabled ? "rgba(57, 197, 207, 0.16)" : "rgba(148, 163, 184, 0.06)";
  ctx.fill();

  ctx.beginPath();
  for (let i = 0; i < curvePts.length; i++) {
    if (i === 0) ctx.moveTo(curvePts[i].x, curvePts[i].y);
    else ctx.lineTo(curvePts[i].x, curvePts[i].y);
  }
  ctx.strokeStyle = params.eq_enabled ? "#7ee8f0" : "#64748b";
  ctx.lineWidth = params.eq_enabled ? 2.1 : 1.4;
  ctx.stroke();
  ctx.restore();

  // HPF marker line
  if (params.eq_enabled && params.hpf_enabled) {
    const hpfX = freqToX(params.hpf_hz);
    ctx.save();
    ctx.strokeStyle = "#f97316";
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(hpfX, padT);
    ctx.lineTo(hpfX, padT + plotH);
    ctx.stroke();
    ctx.restore();
  }

  // Band control nodes
  const nodes = [];
  for (const band of params.bands) {
    const spec = FAIRLIGHT_EQ_BAND_SPECS[band.band_id];
    const color = spec ? spec.color : "#39c5cf";
    const nx = freqToX(band.freq_hz);
    const ny = dbToY(band.gain_db);
    const isSel = band.band_id === selectedBandId;
    nodes.push({ band_id: band.band_id, x: nx, y: ny, freq_hz: band.freq_hz, gain_db: band.gain_db });

    if (isSel) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
      ctx.beginPath();
      ctx.arc(nx, ny, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = band.enabled && params.eq_enabled ? color : "#272a33";
    ctx.strokeStyle = isSel ? "#ffffff" : color;
    ctx.lineWidth = isSel ? 2 : 1.5;
    ctx.beginPath();
    ctx.arc(nx, ny, isSel ? 6 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#0f1115";
    ctx.font = "700 8px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(spec ? spec.shortLabel : "?", nx, ny + 0.5);
  }

  const geom = { padL, padR, padT, padB, plotW, plotH, logMin, logMax, width, height, nodes };
  canvas._fairlightEqGeom = geom;
  return geom;
}

export function renderFairlightDynamicsCanvas(canvas, rawRackParams, liveInputDb = -12.0) {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(220, Math.round(rect.width || canvas.clientWidth || 300));
  const height = Math.max(120, Math.round(rect.height || canvas.clientHeight || 148));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const params = normalizeFairlightAudioRackParams(rawRackParams);
  const padL = 28;
  const padR = 34;
  const padT = 12;
  const padB = 20;
  const plotW = Math.max(80, width - padL - padR);
  const plotH = Math.max(60, height - padT - padB);
  const dbToX = (db) => padL + ((Math.max(-60, Math.min(0, db)) + 60) / 60) * plotW;
  const dbToY = (db) => padT + (1 - (Math.max(-60, Math.min(0, db)) + 60) / 60) * plotH;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#111216";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#14161c";
  ctx.fillRect(padL, padT, plotW, plotH);

  ctx.font = "9px ui-monospace, monospace";
  for (const db of [0, -12, -24, -36, -48, -60]) {
    const x = Math.round(dbToX(db)) + 0.5;
    const y = Math.round(dbToY(db)) + 0.5;
    ctx.strokeStyle = "#22242e";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + plotH);
    ctx.stroke();
    if (db === 0 || db === -24 || db === -48) {
      ctx.fillStyle = "#7a808e";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(String(db), padL - 4, y);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(String(db), x, padT + plotH + 4);
    }
  }

  // 1:1 unity reference diagonal
  ctx.save();
  ctx.strokeStyle = "#333948";
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(dbToX(-60), dbToY(-60));
  ctx.lineTo(dbToX(0), dbToY(0));
  ctx.stroke();
  ctx.restore();

  // Threshold crosshair
  if (params.compressor.enabled) {
    const tx = dbToX(params.compressor.threshold_db);
    ctx.save();
    ctx.strokeStyle = "rgba(255, 182, 72, 0.55)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(tx, padT);
    ctx.lineTo(tx, padT + plotH);
    ctx.stroke();
    ctx.restore();
  }

  // Limiter ceiling line
  if (params.limiter.enabled) {
    const ly = dbToY(params.limiter.ceiling_db);
    ctx.save();
    ctx.strokeStyle = "rgba(248, 113, 113, 0.78)";
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(padL, ly);
    ctx.lineTo(padL + plotW, ly);
    ctx.stroke();
    ctx.restore();
  }

  // Transfer curve
  const dynActive = params.compressor.enabled || params.limiter.enabled;
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) {
    const inDb = -60 + i;
    const outDb = evaluateFairlightDynamicsTransferDb(params, inDb);
    const px = dbToX(inDb);
    const py = dbToY(outDb);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = dynActive ? "#39c5cf" : "#64748b";
  ctx.lineWidth = dynActive ? 2.1 : 1.4;
  ctx.stroke();

  // Live Gain Reduction (GR) vertical bar on the right
  const barX = padL + plotW + 10;
  const barW = 14;
  ctx.fillStyle = "#181a22";
  ctx.fillRect(barX, padT, barW, plotH);
  ctx.strokeStyle = "#2b2f3d";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, padT, barW, plotH);

  const grDb = estimateFairlightCompressorGrClient(params.compressor, liveInputDb);
  const grMag = Math.min(24, Math.max(0, Math.abs(grDb)));
  if (grMag > 0.05) {
    const grH = (grMag / 24) * plotH;
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(barX + 1, padT + 1, barW - 2, Math.max(2, grH - 2));
  }
  ctx.fillStyle = "#9ca3af";
  ctx.font = "700 8.5px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("GR", barX + barW * 0.5, padT + plotH + 4);
  return { plotW, plotH, grDb };
}

const COLOR_WARPER_AXIS_HEX = [
  "#ff4b4b", // 0: Red
  "#ffd23f", // 1: Yellow
  "#3ad97b", // 2: Green
  "#2ce6ff", // 3: Cyan
  "#4b8bff", // 4: Blue
  "#e85dff" // 5: Magenta
];

function warperPolarToXy(cx, cy, radius, hueDeg, satRatio) {
  const rad = ((hueDeg - 90) * Math.PI) / 180;
  return {
    x: cx + Math.cos(rad) * (satRatio * radius),
    y: cy + Math.sin(rad) * (satRatio * radius)
  };
}

export function drawColorWarperCanvas(canvas, rawWarper, selectedPoint = null, opts = {}) {
  if (!canvas) return null;
  const warper = normalizeColorWarper(rawWarper);
  const selfRect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
  const width = Math.max(180, Math.floor(selfRect && selfRect.width > 0 ? selfRect.width : 238));
  const height = Math.max(180, Math.floor(selfRect && selfRect.height > 0 ? selfRect.height : 212));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#111216";
  ctx.fillRect(0, 0, width, height);

  const cx = width * 0.5;
  const cy = height * 0.5;
  const maxR = Math.max(46, Math.min(width, height) * 0.37);

  // Subtle polar hue wheel backdrop inside maxR
  const sliceCount = 72;
  for (let i = 0; i < sliceCount; i += 1) {
    const a0 = ((i * 5 - 92.5) * Math.PI) / 180;
    const a1 = (((i + 1) * 5 - 87.5) * Math.PI) / 180;
    const hueDeg = i * 5;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.12);
    grad.addColorStop(0, "rgba(255,255,255,0.03)");
    grad.addColorStop(0.5, `hsla(${hueDeg}, 85%, 52%, 0.10)`);
    grad.addColorStop(1, `hsla(${hueDeg}, 92%, 55%, 0.18)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, maxR * 1.12, a0, a1);
    ctx.closePath();
    ctx.fill();
  }

  // Reference concentric saturation rings and home spokes
  ctx.save();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  for (const rFrac of COLOR_WARPER_RING_RADII) {
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * rFrac, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let hIdx = 0; hIdx < COLOR_WARPER_HUE_COUNT; hIdx += 1) {
    const end = warperPolarToXy(cx, cy, maxR, hIdx * 60, 1.08);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
  ctx.restore();

  // Compute home & warped coordinates for all 6x3 nodes
  const nodes = [];
  for (let rIdx = 0; rIdx < COLOR_WARPER_SAT_RINGS; rIdx += 1) {
    for (let hIdx = 0; hIdx < COLOR_WARPER_HUE_COUNT; hIdx += 1) {
      const pt = warper.points[rIdx * COLOR_WARPER_HUE_COUNT + hIdx];
      const baseAngle = hIdx * 60;
      const baseSat = COLOR_WARPER_RING_RADII[rIdx];
      const home = warperPolarToXy(cx, cy, maxR, baseAngle, baseSat);
      const warpedSat = Math.max(0.08, Math.min(1.22, baseSat + pt.sat_offset));
      const pos = warperPolarToXy(cx, cy, maxR, baseAngle + pt.hue_offset, warpedSat);
      nodes.push({
        hue_idx: hIdx,
        ring_idx: rIdx,
        hue_offset: pt.hue_offset,
        sat_offset: pt.sat_offset,
        homeX: home.x,
        homeY: home.y,
        x: pos.x,
        y: pos.y
      });
    }
  }
  const getNode = (hIdx, rIdx) => nodes[rIdx * COLOR_WARPER_HUE_COUNT + hIdx];

  // Draw warped spider-web rings (closed polygons across 6 spokes)
  for (let rIdx = 0; rIdx < COLOR_WARPER_SAT_RINGS; rIdx += 1) {
    ctx.beginPath();
    for (let hIdx = 0; hIdx < COLOR_WARPER_HUE_COUNT; hIdx += 1) {
      const n = getNode(hIdx, rIdx);
      if (hIdx === 0) ctx.moveTo(n.x, n.y);
      else ctx.lineTo(n.x, n.y);
    }
    ctx.closePath();
    ctx.strokeStyle = rIdx === 2 ? "rgba(226, 232, 240, 0.72)" : "rgba(186, 198, 218, 0.50)";
    ctx.lineWidth = rIdx === 2 ? 1.5 : 1.15;
    ctx.stroke();
  }

  // Draw warped radial spokes from neutral center through rings 0..2
  for (let hIdx = 0; hIdx < COLOR_WARPER_HUE_COUNT; hIdx += 1) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let rIdx = 0; rIdx < COLOR_WARPER_SAT_RINGS; rIdx += 1) {
      const n = getNode(hIdx, rIdx);
      ctx.lineTo(n.x, n.y);
    }
    ctx.strokeStyle = COLOR_WARPER_AXIS_HEX[hIdx];
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 1.35;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Outer hue label
    const lblPos = warperPolarToXy(cx, cy, maxR, hIdx * 60, 1.18);
    ctx.fillStyle = COLOR_WARPER_AXIS_HEX[hIdx];
    ctx.font = "700 10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(COLOR_WARPER_HUE_LABELS[hIdx] || "", lblPos.x, lblPos.y);
  }

  // Pinned neutral center anchor
  ctx.fillStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();

  const selH = selectedPoint ? Number(selectedPoint.hue_idx) : -1;
  const selR = selectedPoint ? Number(selectedPoint.ring_idx) : -1;
  const hoverH = opts && opts.hoverPoint ? Number(opts.hoverPoint.hue_idx) : -1;
  const hoverR = opts && opts.hoverPoint ? Number(opts.hoverPoint.ring_idx) : -1;

  // Draw displacement vectors + control node handles
  for (const n of nodes) {
    const isWarped = Math.abs(n.hue_offset) > 1e-3 || Math.abs(n.sat_offset) > 1e-4;
    if (isWarped) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(n.homeX, n.homeY);
      ctx.lineTo(n.x, n.y);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.beginPath();
      ctx.arc(n.homeX, n.homeY, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const isSel = n.hue_idx === selH && n.ring_idx === selR;
    const isHover = n.hue_idx === hoverH && n.ring_idx === hoverR;
    const nodeColor = COLOR_WARPER_AXIS_HEX[n.hue_idx];

    if (isSel || isHover) {
      ctx.fillStyle = isSel ? "rgba(230, 132, 66, 0.28)" : "rgba(255, 255, 255, 0.18)";
      ctx.beginPath();
      ctx.arc(n.x, n.y, isSel ? 9.5 : 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = isWarped || isSel ? nodeColor : "#1c1f28";
    ctx.strokeStyle = isSel ? "#ffffff" : nodeColor;
    ctx.lineWidth = isSel ? 2.1 : 1.6;
    ctx.beginPath();
    ctx.arc(n.x, n.y, isSel ? 5.2 : 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Subtle status badge in corner
  if (!isColorWarperIdentity(warper)) {
    ctx.fillStyle = "rgba(230, 132, 66, 0.92)";
    ctx.font = "700 9px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("6x3 WARP", 8, 7);
  } else {
    ctx.fillStyle = "rgba(148, 163, 184, 0.65)";
    ctx.font = "600 9px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("6x3 GRID", 8, 7);
  }

  const geom = { cx, cy, maxR, width, height, nodes };
  canvas._colorWarperGeom = geom;
  return geom;
}

export function hitTestColorWarperPoint(canvas, clientX, clientY) {
  if (!canvas || !canvas._colorWarperGeom) return null;
  const rect = canvas.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  let best = null;
  let bestDist = 18;
  for (const n of canvas._colorWarperGeom.nodes) {
    const d = Math.hypot(x - n.x, y - n.y);
    if (d <= bestDist) {
      bestDist = d;
      best = { hue_idx: n.hue_idx, ring_idx: n.ring_idx };
    }
  }
  return best;
}

export function clientPosToColorWarperOffset(canvas, clientX, clientY, hueIdx, ringIdx) {
  const geom = canvas && canvas._colorWarperGeom;
  if (!geom) return { hue_offset: 0, sat_offset: 0 };
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const dx = x - geom.cx;
  const dy = y - geom.cy;
  const distRatio = Math.max(0.08, Math.min(1.22, Math.hypot(dx, dy) / Math.max(1, geom.maxR)));
  const baseSat = COLOR_WARPER_RING_RADII[ringIdx] ?? 0.3333;
  const rawSatOffset = distRatio - baseSat;
  const satOffset = Math.max(
    COLOR_WARPER_BOUNDS.sat_offset.min,
    Math.min(COLOR_WARPER_BOUNDS.sat_offset.max, rawSatOffset)
  );
  const angleDeg = (((Math.atan2(dy, dx) * 180) / Math.PI + 90) % 360 + 360) % 360;
  const baseAngle = (Number(hueIdx) || 0) * 60;
  const rawDiff = ((angleDeg - baseAngle + 540) % 360) - 180;
  const hueOffset = Math.max(
    COLOR_WARPER_BOUNDS.hue_offset.min,
    Math.min(COLOR_WARPER_BOUNDS.hue_offset.max, rawDiff)
  );
  return {
    hue_offset: Math.round(hueOffset * 10) / 10,
    sat_offset: Math.round(satOffset * 1000) / 1000
  };
}

export function renderFairlightFftCanvas(canvas, spectrum, rawRackParams, options = {}) {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(240, Math.round(rect.width || canvas.clientWidth || 300));
  const height = Math.max(138, Math.round(rect.height || canvas.clientHeight || 160));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const padL = 28;
  const padR = 10;
  const padT = 22;
  const padB = 20;
  const plotW = Math.max(80, width - padL - padR);
  const plotH = Math.max(56, height - padT - padB);
  const minDb = -72;
  const maxDb = 0;
  const dbToY = (db) => {
    const clamped = Math.max(minDb, Math.min(maxDb, Number(db) || minDb));
    return padT + ((maxDb - clamped) / (maxDb - minDb)) * plotH;
  };

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#111216";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#14161c";
  ctx.fillRect(padL, padT, plotW, plotH);

  // Top Integrated Stereo Phase Correlation Meter (-1 .. 0 .. +1)
  const corr = spectrum && Number.isFinite(Number(spectrum.correlation))
    ? Math.max(-1, Math.min(1, Number(spectrum.correlation)))
    : 1.0;
  const corrY = 6;
  const corrH = 8;
  const corrW = Math.min(140, Math.max(72, Math.floor(plotW * 0.44)));
  const corrX = padL;
  ctx.fillStyle = "#1c1f27";
  ctx.fillRect(corrX, corrY, corrW, corrH);
  ctx.strokeStyle = "#2d3240";
  ctx.lineWidth = 1;
  ctx.strokeRect(corrX + 0.5, corrY + 0.5, corrW - 1, corrH - 1);
  const midX = corrX + corrW * 0.5;
  ctx.fillStyle = "#4b5563";
  ctx.fillRect(midX - 0.5, corrY + 1, 1, corrH - 2);
  const corrFillCol = corr >= 0.25 ? "#3fb950" : corr >= -0.25 ? "#d29922" : "#e5534b";
  const markerX = corrX + ((corr + 1) * 0.5) * corrW;
  ctx.fillStyle = corrFillCol;
  if (corr >= 0) {
    ctx.fillRect(midX, corrY + 2, Math.max(2, markerX - midX), corrH - 4);
  } else {
    ctx.fillRect(markerX, corrY + 2, Math.max(2, midX - markerX), corrH - 4);
  }
  ctx.fillStyle = "#9ca3af";
  ctx.font = "600 8.5px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`PHASE ${corr >= 0 ? "+" : ""}${corr.toFixed(2)}`, corrX + corrW + 6, corrY + corrH * 0.5);

  // Focus band highlight region
  const focusBand = options.focusBand || "full";
  const [fLo, fHi] = TRANSIENT_FOCUS_FREQ_RANGES[focusBand] || [20, 20000];
  const logMin = Math.log10(20);
  const logMax = Math.log10(20000);
  const freqToX = (hz) => {
    const clamped = Math.max(20, Math.min(20000, hz));
    return padL + ((Math.log10(clamped) - logMin) / (logMax - logMin)) * plotW;
  };
  if (focusBand !== "full") {
    const fx0 = freqToX(fLo);
    const fx1 = freqToX(fHi);
    ctx.fillStyle = "rgba(63, 185, 80, 0.08)";
    ctx.fillRect(fx0, padT, Math.max(2, fx1 - fx0), plotH);
    ctx.strokeStyle = "rgba(63, 185, 80, 0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(fx0 + 0.5, padT + 0.5, Math.max(1, fx1 - fx0 - 1), plotH - 1);
  }

  // dB graticule
  ctx.font = "9px ui-monospace, monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const db of [0, -12, -24, -36, -48, -60, -72]) {
    const y = Math.round(dbToY(db)) + 0.5;
    ctx.strokeStyle = db === -12 ? "#2f3848" : "#20232d";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    if (db === 0 || db === -24 || db === -48 || db === -72) {
      ctx.fillStyle = "#7a808e";
      ctx.fillText(String(db), padL - 4, y);
    }
  }

  // Log frequency ticks
  const freqTicks = [
    { hz: 20, label: "20" },
    { hz: 50, label: "50" },
    { hz: 100, label: "100" },
    { hz: 250, label: "250" },
    { hz: 500, label: "500" },
    { hz: 1000, label: "1k" },
    { hz: 2000, label: "2k" },
    { hz: 5000, label: "5k" },
    { hz: 10000, label: "10k" },
    { hz: 20000, label: "20k" }
  ];
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const tick of freqTicks) {
    const x = Math.round(freqToX(tick.hz)) + 0.5;
    ctx.strokeStyle = tick.hz === 1000 ? "#303644" : "#1d2028";
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + plotH);
    ctx.stroke();
    if (tick.hz !== 250 && tick.hz !== 2000 && tick.hz !== 20000) {
      ctx.fillStyle = "#7a808e";
      ctx.fillText(tick.label, x, padT + plotH + 4);
    }
  }

  const bands = spectrum && Array.isArray(spectrum.bands) ? spectrum.bands : [];
  const count = bands.length || FFT_BAND_FREQS_HZ.length;
  const barSlotW = plotW / Math.max(1, count);
  const barW = Math.max(2, Math.floor(barSlotW * 0.72));
  const hoverIdx = Number.isInteger(options.hoverBandIdx) ? options.hoverBandIdx : -1;
  const barBoxes = [];

  const barGrad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
  barGrad.addColorStop(0.0, "#f85149");
  barGrad.addColorStop(0.24, "#f0b429");
  barGrad.addColorStop(0.55, "#39c5cf");
  barGrad.addColorStop(1.0, "#2ea043");

  for (let i = 0; i < count; i++) {
    const b = bands[i] || {
      freq_hz: FFT_BAND_FREQS_HZ[i],
      label: String(Math.round(FFT_BAND_FREQS_HZ[i])),
      pre_db: -90,
      post_db: -90,
      peak_hold_db: -90
    };
    const x = padL + i * barSlotW + (barSlotW - barW) * 0.5;
    const postY = dbToY(b.post_db);
    const preY = dbToY(b.pre_db);
    const holdY = dbToY(b.peak_hold_db);
    const barH = Math.max(0, padT + plotH - postY);

    if (barH > 0.5) {
      ctx.fillStyle = barGrad;
      ctx.globalAlpha = i === hoverIdx ? 0.96 : 0.84;
      ctx.fillRect(x, postY, barW, barH);
      ctx.globalAlpha = 1;
    }

    // Pre-EQ ghost outline tick when EQ shifts band energy
    if (b.pre_db > minDb + 0.5 && Math.abs(b.pre_db - b.post_db) > 0.8) {
      ctx.fillStyle = "rgba(148, 163, 184, 0.55)";
      ctx.fillRect(x, preY, barW, 1.5);
    }

    // Peak-hold cap
    if (b.peak_hold_db > minDb + 0.5) {
      ctx.fillStyle = i === hoverIdx ? "#ffffff" : "#e2e8f0";
      ctx.fillRect(x, Math.max(padT, holdY - 1), barW, 2);
    }

    barBoxes.push({
      index: i,
      x: padL + i * barSlotW,
      y: padT,
      w: barSlotW,
      h: plotH,
      band: b
    });
  }

  // Overlay Fairlight 4-Band EQ + HPF curve (relative to -24 dB baseline)
  const rack = normalizeFairlightAudioRackParams(rawRackParams);
  if (rack.eq_enabled) {
    ctx.save();
    ctx.beginPath();
    const samples = 96;
    for (let i = 0; i <= samples; i++) {
      const logF = logMin + (i / samples) * (logMax - logMin);
      const f = Math.pow(10, logF);
      const eqDb = evaluateFairlightEqCurveDb(rack, f, 48000);
      const y = dbToY(-24 + eqDb);
      const x = padL + (i / samples) * plotW;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(126, 232, 240, 0.85)";
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // Hover readout chip in top-right header
  if (hoverIdx >= 0 && hoverIdx < barBoxes.length) {
    const hb = barBoxes[hoverIdx].band;
    const tag = `${hb.label}Hz ${Number(hb.post_db).toFixed(1)}dB`;
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 8.5px ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(tag, padL + plotW, corrY + corrH * 0.5);
  } else if (spectrum && Number.isFinite(Number(spectrum.dominant_hz))) {
    const dom = Number(spectrum.dominant_hz);
    const domStr = dom >= 1000 ? `${(dom / 1000).toFixed(1)}kHz` : `${Math.round(dom)}Hz`;
    ctx.fillStyle = "#7ee8f0";
    ctx.font = "600 8.5px ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(`DOM ${domStr}`, padL + plotW, corrY + corrH * 0.5);
  }

  const geom = { width, height, padL, padR, padT, padB, plotW, plotH, barBoxes };
  canvas._fairlightFftGeom = geom;
  return geom;
}

export function hitTestFairlightFftBand(canvas, clientX, clientY) {
  const geom = canvas && canvas._fairlightFftGeom;
  if (!geom) return -1;
  const rect = canvas.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return -1;
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (y < geom.padT || y > geom.padT + geom.plotH) return -1;
  for (const box of geom.barBoxes) {
    if (x >= box.x && x <= box.x + box.w) {
      return box.index;
    }
  }
  return -1;
}

export function drawCompoundMiniMapCanvas(canvas, clip, opts = {}) {
  if (!canvas) return null;
  const { ctx, width, height } = setupCanvas(canvas, 112);

  ctx.fillStyle = "#101116";
  ctx.fillRect(0, 0, width, height);

  const sub = clip && clip.compound_subsequence ? clip.compound_subsequence : null;
  if (!sub) {
    ctx.strokeStyle = "#262833";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
    ctx.fillStyle = "#7a7b88";
    ctx.font = "10.5px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      opts.emptyLabel || "No Compound Clip selected",
      width * 0.5,
      height * 0.5
    );
    return null;
  }

  const tagMap = {
    amber: "#f59e0b",
    violet: "#a78bfa",
    teal: "#2dd4bf",
    blue: "#60a5fa"
  };
  const accent = tagMap[sub.color_tag] || "#f59e0b";

  // Top summary header
  const headerH = 22;
  ctx.fillStyle = "#171820";
  ctx.fillRect(0, 0, width, headerH);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, width, 2);

  ctx.font = "700 9.5px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#e5e7eb";
  const blendStr = String(sub.precomp_blend_mode || "normal").toUpperCase();
  const colStr = sub.collapse_transforms !== false ? "CR:ON" : "CR:OFF";
  ctx.fillText(`${sub.name} | ${blendStr} | ${colStr}`, 8, headerH * 0.5 + 1);

  const tracks = Array.isArray(sub.tracks) ? sub.tracks : [];
  const totalDur = Math.max(1, Number(sub.duration_frames || 1));
  const bodyTop = headerH + 4;
  const bodyH = Math.max(20, height - bodyTop - 6);
  const labelW = 34;
  const plotX = labelW + 4;
  const plotW = Math.max(40, width - plotX - 8);

  if (tracks.length === 0) {
    ctx.fillStyle = "#7a7b88";
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillText("(empty subsequence)", plotX, bodyTop + bodyH * 0.5);
    return { width, height };
  }

  const rowH = Math.min(20, Math.max(10, Math.floor(bodyH / tracks.length) - 2));
  tracks.forEach((trk, idx) => {
    const ry = bodyTop + idx * (rowH + 2);
    if (ry + rowH > height - 2) return;
    const isAud = trk.kind === "audio";
    ctx.fillStyle = isAud ? "#5eead4" : "#93c5fd";
    ctx.font = "700 8.5px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`${isAud ? "A" : "V"}${trk.index}`, 6, ry + rowH * 0.5);

    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.fillRect(plotX, ry, plotW, rowH);

    for (const nc of trk.clips || []) {
      const x0 = plotX + Math.max(0, (nc.start_frame / totalDur) * plotW);
      const cw = Math.max(3, ((nc.duration_frames || 0) / totalDur) * plotW);
      const isNestedCmp = Boolean(nc.compound_subsequence);
      ctx.fillStyle = isNestedCmp
        ? "rgba(245, 158, 11, 0.55)"
        : isAud
          ? "rgba(45, 212, 191, 0.45)"
          : "rgba(96, 165, 250, 0.48)";
      ctx.fillRect(x0, ry + 1, Math.min(cw, plotX + plotW - x0), Math.max(4, rowH - 2));
      ctx.strokeStyle = isNestedCmp ? "#fbbf24" : isAud ? "#2dd4bf" : "#60a5fa";
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 0.5, ry + 1.5, Math.max(2, Math.min(cw, plotX + plotW - x0) - 1), Math.max(3, rowH - 3));
    }
  });

  // Nested markers ticks
  for (const mk of sub.markers || []) {
    const mx = plotX + Math.max(0, Math.min(plotW, (mk.frame / totalDur) * plotW));
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mx, bodyTop);
    ctx.lineTo(mx, height - 4);
    ctx.stroke();
  }

  return { width, height };
}

export function drawSourceMonitorCanvas(
  canvas,
  sourceClip,
  sourceState = {},
  doc = null,
  opts = {}
) {
  if (!canvas) return null;
  let targetCssH = 244;
  if (typeof canvas.closest === "function" && canvas.closest(".nle-viewer-dock")) {
    const parentH = canvas.parentElement ? canvas.parentElement.getBoundingClientRect().height : 0;
    if (parentH > 260) {
      targetCssH = Math.min(440, Math.floor(parentH) - 2);
    }
  }
  const { ctx, width, height } = setupCanvas(canvas, targetCssH);
  ctx.fillStyle = "#141416";
  ctx.fillRect(0, 0, width, height);

  if (!sourceClip) {
    ctx.fillStyle = "#7a7b88";
    ctx.font = "11px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      opts.emptyLabel || "Load a clip from Master Bin into Source Monitor",
      width * 0.5,
      height * 0.5
    );
    return { width, height };
  }

  const totalFrames = Math.max(1, Math.round(Number(sourceState.totalFrames ?? sourceClip.duration_frames) || 75));
  const playhead = Math.max(0, Math.min(totalFrames - 1, Math.round(Number(sourceState.playheadFrame) || 0)));
  const srcIn = sourceState.inFrame != null && Number.isFinite(Number(sourceState.inFrame))
    ? Math.max(0, Math.min(totalFrames - 1, Math.round(Number(sourceState.inFrame))))
    : null;
  const srcOut = sourceState.outFrame != null && Number.isFinite(Number(sourceState.outFrame))
    ? Math.max(1, Math.min(totalFrames, Math.round(Number(sourceState.outFrame))))
    : null;

  const srcAspect = doc && doc.width > 0 && doc.height > 0 ? doc.width / doc.height : 16 / 9;
  const scrubBandH = 22;
  const availH = Math.max(60, height - scrubBandH - 12);
  let frameW = width - 16;
  let frameH = frameW / srcAspect;
  if (frameH > availH) {
    frameH = availH;
    frameW = frameH * srcAspect;
  }
  const fx = Math.floor((width - frameW) / 2);
  const fy = Math.floor((availH - frameH) / 2) + 6;
  const bw = Math.max(1, Math.round(frameW));
  const bh = Math.max(1, Math.round(frameH));
  const isAudio = sourceClip.media_type === "audio" || sourceClip.trackKind === "audio";

  if (isAudio) {
    ctx.fillStyle = "#0e1417";
    ctx.fillRect(fx, fy, bw, bh);
    ctx.strokeStyle = "#26363d";
    ctx.lineWidth = 1;
    ctx.strokeRect(fx + 0.5, fy + 0.5, bw - 1, bh - 1);

    const midY = fy + bh * 0.5;
    ctx.strokeStyle = "rgba(94, 234, 212, 0.22)";
    ctx.beginPath();
    ctx.moveTo(fx, midY);
    ctx.lineTo(fx + bw, midY);
    ctx.stroke();

    const bars = Math.max(24, Math.min(96, Math.floor(bw / 4)));
    const barW = Math.max(2, bw / bars - 1);
    const seedBase = String(sourceClip.name || "audio")
      .split("")
      .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) & 0xffff, 17);
    for (let i = 0; i < bars; i++) {
      const n = Math.sin(i * 0.43 + seedBase * 0.17) * 0.5 + Math.cos(i * 0.19 + seedBase) * 0.35;
      const amp = Math.max(0.08, Math.min(0.88, Math.abs(n)));
      const hBar = amp * (bh * 0.72);
      const bx = fx + (i / bars) * bw;
      const u = i / bars;
      const inRange =
        (srcIn === null || u >= srcIn / totalFrames) &&
        (srcOut === null || u <= srcOut / totalFrames);
      ctx.fillStyle = inRange ? "#2dd4bf" : "rgba(45, 212, 191, 0.28)";
      ctx.fillRect(bx, midY - hBar * 0.5, barW, hBar);
    }

    ctx.fillStyle = "#5eead4";
    ctx.font = "700 10.5px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`AUDIO SRC: ${sourceClip.name || "Audio"}`, fx + 8, fy + 8);
  } else {
    const buf = getFxScratchCanvas(bw, bh);
    const bctx = buf.getContext("2d");
    const tempClip = {
      ...sourceClip,
      start_frame: 0,
      duration_frames: totalFrames,
      source_in_frame: sourceClip.source_in_frame || 0
    };
    drawFramedBaseScene(
      bctx,
      bw,
      bh,
      doc,
      playhead,
      null,
      [{ track: opts.trackLabel || "SRC", clip: tempClip }],
      "fill",
      srcAspect,
      srcAspect
    );
    ctx.drawImage(buf, fx, fy, bw, bh);
    ctx.strokeStyle = "#2b2b33";
    ctx.lineWidth = 1;
    ctx.strokeRect(fx + 0.5, fy + 0.5, bw - 1, bh - 1);
  }

  // Top badge overlay
  ctx.fillStyle = "rgba(14, 14, 18, 0.82)";
  ctx.fillRect(fx + 6, fy + 6, 70, 17);
  ctx.strokeStyle = "#39c5cf";
  ctx.lineWidth = 1;
  ctx.strokeRect(fx + 6.5, fy + 6.5, 69, 16);
  ctx.fillStyle = "#39c5cf";
  ctx.font = "700 9.5px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.badgeLabel || "SOURCE", fx + 41, fy + 15);

  if (sourceClip.media_offline) {
    ctx.save();
    ctx.fillStyle = "rgba(42, 10, 14, 0.88)";
    ctx.fillRect(fx, fy, bw, bh);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.strokeRect(fx + 2, fy + 2, bw - 4, bh - 4);
    ctx.fillStyle = "#fca5a5";
    ctx.font = "800 13px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("MEDIA OFFLINE", fx + bw * 0.5, fy + bh * 0.5);
    ctx.restore();
  } else if (opts.proxyModeEnabled && sourceClip.proxy_path) {
    const scaleLbl = sourceClip.proxy_scale === "quarter" ? "1/4" : "1/2";
    const pxyText = `PROXY (${scaleLbl})`;
    ctx.save();
    ctx.font = "700 9.5px ui-monospace, monospace";
    const pw = ctx.measureText(pxyText).width + 12;
    const px = fx + bw - pw - 6;
    const py = fy + 6;
    ctx.fillStyle = "rgba(15, 23, 34, 0.90)";
    ctx.fillRect(px, py, pw, 17);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, 16);
    ctx.fillStyle = "#7dd3fc";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(pxyText, px + pw * 0.5, py + 9);
    ctx.restore();
  }

  // Source I/O Scrub Strip
  const barX = fx;
  const barY = height - scrubBandH - 3;
  const barW = bw;
  const barH = scrubBandH - 4;
  ctx.fillStyle = "#18181d";
  ctx.fillRect(barX, barY, barW, barH);
  ctx.strokeStyle = "#2b2b33";
  ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1);

  const rangeStart = srcIn !== null ? srcIn : 0;
  const rangeEnd = srcOut !== null ? srcOut : totalFrames;
  const rx0 = barX + (rangeStart / totalFrames) * barW;
  const rx1 = barX + (rangeEnd / totalFrames) * barW;
  if (srcIn !== null || srcOut !== null) {
    ctx.fillStyle = "rgba(57, 197, 207, 0.22)";
    ctx.fillRect(rx0, barY + 1, Math.max(2, rx1 - rx0), barH - 2);
    ctx.fillStyle = "#39c5cf";
    if (srcIn !== null) ctx.fillRect(rx0 - 1, barY, 3, barH);
    if (srcOut !== null) ctx.fillRect(rx1 - 2, barY, 3, barH);
  }

  const phRatio = totalFrames > 1 ? playhead / (totalFrames - 1) : 0;
  const phX = barX + Math.max(1, Math.min(barW - 1, phRatio * barW));
  ctx.strokeStyle = "#ff5a36";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(phX, barY - 2);
  ctx.lineTo(phX, barY + barH + 2);
  ctx.stroke();

  ctx.fillStyle = "#d4d4dc";
  ctx.font = "10px ui-monospace, monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const durSpan = rangeEnd - rangeStart;
  ctx.fillText(
    `${playhead}f / ${totalFrames}f (${durSpan}f)`,
    barX + barW - 6,
    barY + barH * 0.5
  );

  return { width, height, barRect: { x: barX, y: barY, w: barW, h: barH }, totalFrames };
}

export function drawAvSyncWaveformCanvas(canvas, analysis, labels = {}) {
  if (!canvas) return null;
  const { ctx, width, height } = setupCanvas(canvas, 172);
  ctx.fillStyle = "#121317";
  ctx.fillRect(0, 0, width, height);

  if (!analysis || !Array.isArray(analysis.video_envelope) || analysis.video_envelope.length === 0) {
    ctx.fillStyle = "#7a7b88";
    ctx.font = "11px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      labels.empty || "Select a Video & Audio clip pair and run Analyze Sync",
      width * 0.5,
      height * 0.5
    );
    return { width, height };
  }

  const padX = 10;
  const topH = Math.floor(height * 0.54);
  const botY = topH + 8;
  const botH = height - botY - 12;
  const plotW = Math.max(40, width - padX * 2);

  // Top lane: Camera scratch waveform (amber) vs External audio waveform (cyan)
  ctx.fillStyle = "#171920";
  ctx.fillRect(padX, 8, plotW, topH - 10);
  ctx.strokeStyle = "#272a34";
  ctx.lineWidth = 1;
  ctx.strokeRect(padX + 0.5, 8.5, plotW - 1, topH - 11);

  const vEnv = analysis.video_envelope;
  const aEnv = Array.isArray(analysis.audio_envelope) ? analysis.audio_envelope : [];
  const bins = Math.max(1, vEnv.length);
  const laneMid = 8 + (topH - 10) * 0.5;
  const maxAmp = (topH - 22) * 0.44;

  const drawEnv = (env, color, yBias) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < env.length; i++) {
      const x = padX + (i / Math.max(1, bins - 1)) * plotW;
      const y = laneMid + yBias - env[i] * maxAmp;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  drawEnv(vEnv, "#f59e0b", 0);
  if (aEnv.length > 0) {
    drawEnv(aEnv, "#38bdf8", 6);
  }

  ctx.font = "700 9.5px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#f59e0b";
  ctx.fillText(labels.cam || "CAM SCRATCH", padX + 6, 12);
  ctx.fillStyle = "#38bdf8";
  ctx.fillText(labels.ext || "EXT AUDIO", padX + 86, 12);

  // Bottom lane: Cross-correlation curve across [-maxLag, +maxLag]
  ctx.fillStyle = "#15171d";
  ctx.fillRect(padX, botY, plotW, botH);
  ctx.strokeStyle = "#272a34";
  ctx.strokeRect(padX + 0.5, botY + 0.5, plotW - 1, botH - 1);

  const curve = Array.isArray(analysis.correlation_curve) ? analysis.correlation_curve : [];
  if (curve.length > 1) {
    const minLag = curve[0].lag;
    const maxLag = curve[curve.length - 1].lag;
    const lagSpan = Math.max(1, maxLag - minLag);
    const zeroX = padX + ((0 - minLag) / lagSpan) * plotW;
    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(zeroX, botY + 2);
    ctx.lineTo(zeroX, botY + botH - 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = "#2dd4bf";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < curve.length; i++) {
      const pt = curve[i];
      const x = padX + ((pt.lag - minLag) / lagSpan) * plotW;
      const normY = (pt.score + 1) * 0.5;
      const y = botY + botH - 4 - normY * (botH - 8);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const peakX = padX + ((analysis.offset_frames - minLag) / lagSpan) * plotW;
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(peakX, botY + 2);
    ctx.lineTo(peakX, botY + botH - 2);
    ctx.stroke();
  }

  const sign = analysis.offset_frames >= 0 ? "+" : "";
  const badgeTxt = `OFFSET ${sign}${analysis.offset_frames}f (${sign}${Number(analysis.offset_ms || 0).toFixed(1)} ms | ${Math.round((analysis.confidence || 0) * 100)}%)`;
  ctx.fillStyle = "#e2e8f0";
  ctx.textAlign = "right";
  ctx.fillText(badgeTxt, padX + plotW - 6, botY + 4);

  return { width, height };
}

export function drawSceneCutConfidenceCanvas(canvas, analysis, opts = {}) {
  if (!canvas) return null;
  const { ctx, width, height } = setupCanvas(canvas, 176);
  ctx.fillStyle = "#121317";
  ctx.fillRect(0, 0, width, height);

  const scores =
    analysis && Array.isArray(analysis.frame_scores) ? analysis.frame_scores : [];
  if (scores.length === 0) {
    ctx.fillStyle = "#7a7b88";
    ctx.font = "11px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      opts.emptyLabel || "Select a video clip and click Analyze Cuts",
      width * 0.5,
      height * 0.5
    );
    return { width, height, plotRect: null, totalFrames: 0 };
  }

  const padL = 34;
  const padR = 12;
  const padT = 22;
  const padB = 22;
  const plotW = Math.max(40, width - padL - padR);
  const plotH = Math.max(40, height - padT - padB);
  const totalFrames = Math.max(1, Number(analysis.clip_duration_frames) || scores.length);

  ctx.fillStyle = "#171920";
  ctx.fillRect(padL, padT, plotW, plotH);
  ctx.strokeStyle = "#272a34";
  ctx.lineWidth = 1;
  ctx.strokeRect(padL + 0.5, padT + 0.5, plotW - 1, plotH - 1);

  // Percentage gridlines (25%, 50%, 75%)
  ctx.font = "9px ui-monospace, monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const pct of [0.25, 0.5, 0.75]) {
    const gy = padT + plotH - pct * plotH;
    ctx.strokeStyle = "rgba(148, 163, 184, 0.16)";
    ctx.beginPath();
    ctx.moveTo(padL, gy);
    ctx.lineTo(padL + plotW, gy);
    ctx.stroke();
    ctx.fillStyle = "#64748b";
    ctx.fillText(`${Math.round(pct * 100)}`, padL - 5, gy);
  }

  // Build lookup of candidates by frame_offset for enabled/manual coloring
  const candMap = new Map();
  if (Array.isArray(analysis.candidates)) {
    for (const c of analysis.candidates) {
      candMap.set(Number(c.frame_offset), c);
    }
  }

  const barW = Math.max(1.5, Math.min(4, plotW / Math.max(1, scores.length)));
  for (let i = 0; i < scores.length; i += 1) {
    const pt = scores[i];
    const sc = Math.max(0, Math.min(1, Number(pt.score) || 0));
    const cand = candMap.get(Number(pt.frame_offset));
    const x = padL + (pt.frame_offset / Math.max(1, totalFrames - 1)) * plotW;
    const hBar = Math.max(1, sc * (plotH - 4));
    const y = padT + plotH - hBar;

    if (cand) {
      if (cand.enabled === false) {
        ctx.fillStyle = "rgba(100, 116, 139, 0.55)";
      } else if (cand.manual) {
        ctx.fillStyle = "#38bdf8";
      } else {
        ctx.fillStyle = "#f59e0b";
      }
      ctx.fillRect(x - barW * 0.6, y, Math.max(2.5, barW * 1.2), hBar);
    } else {
      ctx.fillStyle = "rgba(100, 116, 139, 0.45)";
      ctx.fillRect(x - barW * 0.4, y, barW * 0.8, hBar);
    }
  }

  // Cut pins along top of plot
  if (Array.isArray(analysis.candidates)) {
    for (const cand of analysis.candidates) {
      const off = Number(cand.frame_offset);
      const x = padL + (off / Math.max(1, totalFrames - 1)) * plotW;
      const isSelected = Number(opts.selectedOffset) === off;
      const color =
        cand.enabled === false
          ? "#64748b"
          : cand.manual
            ? "#38bdf8"
            : "#2dd4bf";

      ctx.strokeStyle = isSelected ? "#ffffff" : color;
      ctx.lineWidth = isSelected ? 1.8 : 1.1;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, padT - 5);
      ctx.lineTo(x + 4, padT);
      ctx.lineTo(x, padT + 5);
      ctx.lineTo(x - 4, padT);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Threshold dashed bar
  const thr = Math.max(0.05, Math.min(0.95, Number(analysis.threshold) || 0.35));
  const thrY = padT + plotH - thr * plotH;
  ctx.strokeStyle = "#f43f5e";
  ctx.lineWidth = 1.4;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(padL, thrY);
  ctx.lineTo(padL + plotW, thrY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Playhead cursor inside clip
  if (Number.isFinite(Number(opts.playheadOffset))) {
    const phOff = Math.max(0, Math.min(totalFrames - 1, Number(opts.playheadOffset)));
    const phX = padL + (phOff / Math.max(1, totalFrames - 1)) * plotW;
    ctx.strokeStyle = "#ff5a36";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(phX, padT - 2);
    ctx.lineTo(phX, padT + plotH + 2);
    ctx.stroke();
  }

  // Header & Footer labels
  ctx.font = "700 10px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText(
    `${analysis.clip_name || "CLIP"} (${totalFrames}f)`,
    padL,
    5
  );

  ctx.textAlign = "right";
  ctx.fillStyle = "#fb7185";
  ctx.fillText(`THR ${Math.round(thr * 100)}%`, padL + plotW, 5);

  ctx.font = "9.5px ui-monospace, monospace";
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText("0f", padL, height - 4);
  ctx.textAlign = "right";
  ctx.fillText(`${totalFrames}f`, padL + plotW, height - 4);

  return {
    width,
    height,
    plotRect: { x: padL, y: padT, w: plotW, h: plotH },
    totalFrames
  };
}
