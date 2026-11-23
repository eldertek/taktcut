import {
  MARKER_COLOR_HEX,
  clampSplitWipePercent,
  computeBpmBeatFrames,
  computeInOutRangeMetrics,
  computeSplitWipeGeometry,
  findActiveTransitionAtFrame,
  formatRetimeBadgeText,
  formatTransformBadgeText,
  getAspectRatioPreset,
  getDynamicZoomShortTag,
  getTransitionPresetName,
  getTransitionShortTag,
  isClipTransformIdentity,
  normalizeClipRetime,
  normalizeClipTransform,
  normalizeClipTransition
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

function clamp01(val) {
  return val < 0 ? 0 : val > 1 ? 1 : val;
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
let _transScratchA = null;
let _transScratchB = null;
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

  // Subtle editorial specular keylight disc for glow/flare/chroma response
  const keyX = w * pal.keyX;
  const keyY = h * pal.keyY;
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

  // Subtle SMPTE top swatch strip inside frame
  const chipCols = [
    [0.72, 0.72, 0.72],
    [0.72, 0.72, 0.08],
    [0.08, 0.72, 0.72],
    [0.08, 0.72, 0.08],
    [0.72, 0.08, 0.72],
    [0.72, 0.08, 0.08],
    [0.08, 0.08, 0.72]
  ];
  const cw = w / chipCols.length;
  chipCols.forEach((col, i) => {
    const [r, g, b] = applyGradeOrCdlRgb(col[0], col[1], col[2], cdl);
    ctx.fillStyle = toCssRgb(r, g, b);
    ctx.fillRect(i * cw, 0, Math.ceil(cw), 12);
  });

  // Center crosshair
  ctx.strokeStyle = "rgba(216, 216, 222, 0.22)";
  ctx.lineWidth = 1;
  const cx = w / 2;
  const cy = h / 2;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy);
  ctx.lineTo(cx + 8, cy);
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx, cy + 8);
  ctx.stroke();

  // Active clip slate info
  const slatePad = Math.min(14, Math.max(6, Math.floor(w * 0.05)));
  const slateW = Math.max(40, w - slatePad * 2);
  const slateX = slatePad;
  const slateY = Math.max(16, h - 46);
  ctx.fillStyle = "rgba(20, 20, 22, 0.76)";
  ctx.fillRect(slateX, slateY, slateW, 34);
  ctx.strokeStyle = "#34343a";
  ctx.strokeRect(slateX, slateY, slateW, 34);

  const textMaxW = Math.max(24, slateW - 14);
  if (activeClips.length > 0) {
    const top = activeClips[activeClips.length - 1];
    const retimeNorm = normalizeClipRetime(top.clip);
    const isRetimed = Math.abs(retimeNorm.speedRate - 1.0) > 0.005 || retimeNorm.reverse;
    const localPos = playheadFrame - top.clip.start_frame;
    const retimedLocal = retimeNorm.reverse
      ? (Math.max(1, top.clip.duration_frames) - 1 - localPos) * retimeNorm.speedRate
      : localPos * retimeNorm.speedRate;
    const relOffset = (top.clip.source_in_frame || 0) + Math.round(retimedLocal);
    const retimeSlateTag = isRetimed
      ? ` | ${formatRetimeBadgeText(retimeNorm.speedRate, retimeNorm.reverse)}`
      : "";
    const transformNorm = normalizeClipTransform(top.clip);
    const transformSlateTag = !isClipTransformIdentity(transformNorm)
      ? ` | XF ${formatTransformBadgeText(transformNorm)}`
      : "";
    ctx.fillStyle = "#d8d8de";
    ctx.font = "600 11px ui-monospace, monospace";
    ctx.fillText(fitCanvasText(ctx, `${top.track}: ${top.clip.name}`, textMaxW), slateX + 7, slateY + 14);
    ctx.fillStyle = "#8e8e98";
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillText(
      fitCanvasText(
        ctx,
        `SRC+${relOffset}f${retimeSlateTag}${transformSlateTag} | ${doc.width}x${doc.height} | ${activeClips.length} active layer(s)`,
        textMaxW
      ),
      slateX + 7,
      slateY + 27
    );
  } else {
    ctx.fillStyle = "#8e8e98";
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillText(fitCanvasText(ctx, "BLACK / NO VIDEO AT PLAYHEAD", textMaxW), slateX + 7, slateY + 21);
  }
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

export function drawTitleOverlayOnFrame(ctx, fx, fy, frameW, frameH, titleState, tSec) {
  if (!titleState || titleState.enabled === false) return false;
  const rawTitle = typeof titleState.title === "string" ? titleState.title.replace(/[\r\n\t]+/g, " ").trim() : "";
  const rawSub = typeof titleState.subtitle === "string" ? titleState.subtitle.replace(/[\r\n\t]+/g, " ").trim() : "";
  if (!rawTitle && !rawSub) return false;

  const startS = Number.isFinite(Number(titleState.start_s)) ? Number(titleState.start_s) : 0;
  const endS = Number.isFinite(Number(titleState.end_s)) ? Number(titleState.end_s) : 5;
  if (tSec < startS || tSec > endS) return false;

  const pos = titleState.position || "bottom-left";
  const accent = /^#[0-9a-fA-F]{6}$/.test(String(titleState.accent_color || "").trim())
    ? String(titleState.accent_color).trim()
    : "#e68442";
  const [ar, ag, ab] = hexToRgbTuple(accent);
  const accentCss = `rgb(${ar}, ${ag}, ${ab})`;
  const opacity = Math.max(0, Math.min(1, Number.isFinite(Number(titleState.box_opacity)) ? Number(titleState.box_opacity) : 0.8));
  const refFontSize = Math.max(14, Math.min(96, Number.isFinite(Number(titleState.font_size)) ? Number(titleState.font_size) : 34));
  const titlePx = Math.max(10, Math.round(frameH * (refFontSize / 1080)));
  const subPx = Math.max(8, Math.round(frameH * (Math.max(12, refFontSize * 0.64) / 1080)));

  ctx.save();
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.72)";
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

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

    const cx = fx + frameW * 0.5;
    const maxTextW = Math.max(60, pw - frameW * 0.06);
    ctx.textAlign = "center";
    if (rawTitle) {
      ctx.font = `700 ${titlePx}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = "#d8d8de";
      const yPos = rawSub ? fy + frameH * 0.455 : fy + frameH * 0.5;
      ctx.fillText(fitCanvasText(ctx, rawTitle, maxTextW), cx, yPos);
    }
    if (rawSub) {
      ctx.font = `600 ${subPx}px ui-monospace, monospace`;
      ctx.fillStyle = accentCss;
      const yPos = rawTitle ? fy + frameH * 0.56 : fy + frameH * 0.5;
      ctx.fillText(fitCanvasText(ctx, rawSub, maxTextW), cx, yPos);
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

    const cx = fx + frameW * 0.5;
    const maxTextW = Math.max(60, pw - frameW * 0.05);
    ctx.textAlign = "center";
    if (rawTitle) {
      ctx.font = `700 ${titlePx}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = "#d8d8de";
      const yPos = rawSub ? fy + frameH * 0.842 : fy + frameH * 0.865;
      ctx.fillText(fitCanvasText(ctx, rawTitle, maxTextW), cx, yPos);
    }
    if (rawSub) {
      ctx.font = `600 ${subPx}px ui-monospace, monospace`;
      ctx.fillStyle = accentCss;
      const yPos = rawTitle ? fy + frameH * 0.885 : fy + frameH * 0.865;
      ctx.fillText(fitCanvasText(ctx, rawSub, maxTextW), cx, yPos);
    }
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

export function drawSubtitleOverlayOnFrame(ctx, fx, fy, frameW, frameH, subtitleState, tSec) {
  const cue = findActiveSubtitleCue(subtitleState, tSec);
  if (!cue) return null;

  const lines = sanitizeCanvasCaptionText(cue.text).slice(0, 3);
  if (lines.length === 0) return null;

  const styleId = subtitleState.style || "clean_white";
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
  const weight = styleId === "clean_white" ? "600" : "700";

  ctx.save();
  ctx.font = `${weight} ${px}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const fittedLines = lines.map((line) => fitCanvasText(ctx, line, maxTextW));
  const cx = fx + frameW * 0.5;
  const bottomY = fy + frameH * (1.0 - marginBottomPct);

  for (let i = 0; i < fittedLines.length; i += 1) {
    const lineText = fittedLines[i];
    const distFromBottom = fittedLines.length - 1 - i;
    const lineY = bottomY - distFromBottom * lineH - lineH * 0.45;
    const measuredW = Math.min(maxTextW, ctx.measureText(lineText).width);

    if (styleId === "boxed_social") {
      const padX = Math.max(8, Math.round(px * 0.48));
      const padY = Math.max(4, Math.round(px * 0.22));
      const boxW = measuredW + padX * 2;
      const boxH = px + padY * 2;
      ctx.fillStyle = "rgba(20, 20, 22, 0.86)";
      ctx.fillRect(cx - boxW / 2, lineY - boxH / 2, boxW, boxH);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(lineText, cx, lineY);
    } else if (styleId === "yellow_broadcast") {
      const padX = Math.max(6, Math.round(px * 0.34));
      const padY = Math.max(3, Math.round(px * 0.16));
      const boxW = measuredW + padX * 2;
      const boxH = px + padY * 2;
      ctx.fillStyle = "rgba(12, 12, 14, 0.55)";
      ctx.fillRect(cx - boxW / 2, lineY - boxH / 2, boxW, boxH);
      ctx.lineWidth = Math.max(2, Math.round(px * 0.14));
      ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
      ctx.strokeText(lineText, cx, lineY);
      ctx.fillStyle = "#ffe047";
      ctx.shadowColor = "rgba(0, 0, 0, 0.88)";
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(lineText, cx, lineY);
    } else {
      ctx.lineWidth = Math.max(2, Math.round(px * 0.14));
      ctx.strokeStyle = "rgba(0, 0, 0, 0.82)";
      ctx.strokeText(lineText, cx, lineY);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0, 0, 0, 0.88)";
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(lineText, cx, lineY);
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

  ctx.restore();
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

  for (let idx = 0; idx < clips.length; idx += 1) {
    const layer = clips[idx];
    const isTop = idx === clips.length - 1;
    const tf = normalizeClipTransform(layer && layer.clip ? layer.clip : null);
    const alpha = clamp01(tf.opacity_pct / 100.0);
    if (alpha <= 0.0001) {
      continue;
    }

    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.rect(0, 0, bufW, bufH);
    targetCtx.clip();
    targetCtx.globalAlpha *= alpha;

    if (!isClipTransformIdentity(tf)) {
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
  }
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
  const { ctx, width, height } = setupCanvas(canvas, 244, explicitW);
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
  const wipeActive = Boolean(splitWipeState && splitWipeState.enabled);

  const renderScenePass = (passCdl, passFxState, passTitleState, passSubState, passCkState) => {
    const pRawNodes = passFxState && Array.isArray(passFxState.nodes) ? passFxState.nodes : [];
    const pBypassAll = Boolean(passFxState && passFxState.bypassAll);
    const pActiveFx = pBypassAll ? [] : pRawNodes.filter((n) => n && n.enabled !== false);
    const pCkRaw = passCkState || (passFxState && passFxState.chromaKey) || null;
    const pCkActive = !pBypassAll && Boolean(pCkRaw && pCkRaw.enabled);
    const pCkMatteView = pCkRaw && pCkRaw.matteView === "alpha_matte" ? "alpha_matte" : "final";

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
        for (const mNode of mirrorNodes) {
          const mul = Math.min(1, evaluateNodeIntensity(mNode, tSec));
          if (mul <= 0.0001) continue;
          maxMul = Math.max(maxMul, mul);
          const axis = String((mNode.params && mNode.params.axis) || "horizontal").trim().toLowerCase();
          if (axis === "horizontal") flipH = !flipH;
          else if (axis === "vertical") flipV = !flipV;
          else if (axis === "both") {
            flipH = !flipH;
            flipV = !flipV;
          }
        }
        if ((flipH || flipV) && maxMul > 0.0001) {
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
        }
      }

      // Apply S_HueSatBright hue rotation & saturation boost on frame buffer
      const hueNodes = pActiveFx.filter((n) => n.effect === "hue_shift");
      if (hueNodes.length > 0 && !(pCkActive && pCkMatteView === "alpha_matte")) {
        let totalHueDeg = 0;
        let totalSat = 1;
        let anyHueActive = false;
        for (const hNode of hueNodes) {
          const mul = Math.min(1, evaluateNodeIntensity(hNode, tSec));
          if (mul <= 0.0001) continue;
          anyHueActive = true;
          const hp = hNode.params || {};
          const rawHue = Math.min(180, Math.max(-180, Number(hp.hue_deg ?? 30)));
          const rawSat = Math.min(2.5, Math.max(0, Number(hp.saturation ?? 1.25)));
          totalHueDeg += rawHue * mul;
          totalSat *= 1 + (rawSat - 1) * mul;
        }
        if (anyHueActive && (Math.abs(totalHueDeg) > 0.05 || Math.abs(totalSat - 1) > 0.005)) {
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
        }
      }

      // Apply Chroma Aberration & Sapphire RGB Split channel shift directly on frame buffer
      const shiftNodes = pActiveFx.filter(
        (n) => n.effect === "chroma_aberration" || n.effect === "rgb_split"
      );
      if (shiftNodes.length > 0 && !(pCkActive && pCkMatteView === "alpha_matte")) {
        let dx = 0;
        let dy = 0;
        for (const sNode of shiftNodes) {
          const mul = evaluateNodeIntensity(sNode, tSec);
          if (mul <= 0.0001) continue;
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
        }
      }

      // Apply S_LensDistortion radial barrel/pincushion warp on frame buffer
      const lensNodes = pActiveFx.filter((n) => n.effect === "lens_distortion");
      if (lensNodes.length > 0 && !(pCkActive && pCkMatteView === "alpha_matte")) {
        let totalK1 = 0;
        for (const lNode of lensNodes) {
          const mul = Math.min(1, evaluateNodeIntensity(lNode, tSec));
          if (mul <= 0.0001) continue;
          const lp = lNode.params || {};
          const rawK1 = Math.min(0.5, Math.max(-0.5, Number(lp.k1 ?? -0.22)));
          totalK1 += rawK1 * mul;
        }
        if (Math.abs(totalK1) > 0.001) {
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
        }
      }

      // Apply S_Sharpen broadcast unsharp mask convolution on frame buffer
      const unsharpNodes = pActiveFx.filter((n) => n.effect === "unsharp_mask");
      if (unsharpNodes.length > 0 && bw >= 3 && bh >= 3 && !(pCkActive && pCkMatteView === "alpha_matte")) {
        let totalSharpen = 0;
        for (const uNode of unsharpNodes) {
          const mul = Math.min(1, evaluateNodeIntensity(uNode, tSec));
          if (mul <= 0.0001) continue;
          const up = uNode.params || {};
          const rawAmt = Math.min(3.0, Math.max(0.2, Number(up.sharpen_amount ?? 1.2)));
          totalSharpen += rawAmt * mul;
        }
        if (totalSharpen > 0.01) {
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
        }
      }

      if (pCkActive && pCkMatteView === "final") {
        drawTransparencyCheckerboard(ctx, fx, fy, frameW, frameH);
      }

      const overscan = !hasLegacyShake && cameraShakeOverscan > 0 ? cameraShakeOverscan : 0;
      const drawX = fx - overscan + shiftX;
      const drawY = fy - overscan + shiftY;
      const drawW = frameW + overscan * 2;
      const drawH = frameH + overscan * 2;

      ctx.drawImage(buf, drawX, drawY, drawW, drawH);
      if (motionBlurAmt >= 0.05 && (Math.abs(shiftX) > 0.2 || Math.abs(shiftY) > 0.2)) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.42, motionBlurAmt * 0.42);
        ctx.drawImage(buf, fx - shiftX * 0.55, fy - shiftY * 0.55, frameW, frameH);
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

    // Apply optical/lighting FX passes over the 16:9 frame
    if (!(pCkActive && pCkMatteView === "alpha_matte")) for (const node of pActiveFx) {
      const p = node.params || {};
      const kfMul = evaluateNodeIntensity(node, tSec);
      if (kfMul <= 0.0001) continue;
      if (node.effect === "glow") {
        const brightness = Number(p.brightness ?? 0.85) * kfMul;
        const widthPx = Number(p.width ?? 18);
        const threshold = Number(p.threshold ?? 0.45);
        const [tr, tg, tb] = hexToRgbTuple(p.tint || "#ffd8a8");
        const alpha = clamp01((brightness / 2.2) * (1.15 - threshold * 0.45));

        if (buf && typeof ctx.filter === "string") {
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.globalAlpha = Math.min(0.85, alpha * 0.8);
          ctx.filter = `blur(${Math.max(2, Math.round(widthPx * 0.45))}px)`;
          ctx.drawImage(buf, fxOutX, fxOutY, fxOutW, fxOutH);
          ctx.restore();
        }

        const gx = fx + frameW * 0.72 + shiftX;
        const gy = fy + frameH * 0.32 + shiftY;
        const gr = Math.max(24, widthPx * 2.4);
        const gGrad = ctx.createRadialGradient(gx, gy, 2, gx, gy, gr);
        gGrad.addColorStop(0, `rgba(${tr}, ${tg}, ${tb}, ${Math.min(0.75, alpha * 0.85).toFixed(3)})`);
        gGrad.addColorStop(0.45, `rgba(${tr}, ${tg}, ${tb}, ${Math.min(0.4, alpha * 0.45).toFixed(3)})`);
        gGrad.addColorStop(1, `rgba(${tr}, ${tg}, ${tb}, 0)`);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = gGrad;
        ctx.fillRect(fx, fy, frameW, frameH);
        ctx.restore();
      } else if (node.effect === "lens_flare") {
        const cx = fx + Number(p.center_x ?? 0.72) * frameW;
        const cy = fy + Number(p.center_y ?? 0.28) * frameH;
        const brightness = Number(p.brightness ?? 0.95) * kfMul;
        const scale = Number(p.scale ?? 1.0);
        const [tr, tg, tb] = hexToRgbTuple(p.tint || "#7cc4ff");
        const alpha = clamp01(brightness * 0.75);

        ctx.save();
        ctx.globalCompositeOperation = "screen";

        const haloR = Math.max(22, frameH * 0.36 * scale);
        const halo = ctx.createRadialGradient(cx, cy, 1, cx, cy, haloR);
        halo.addColorStop(0, `rgba(255, 255, 255, ${Math.min(0.95, alpha).toFixed(3)})`);
        halo.addColorStop(0.22, `rgba(${tr}, ${tg}, ${tb}, ${(alpha * 0.75).toFixed(3)})`);
        halo.addColorStop(1, `rgba(${tr}, ${tg}, ${tb}, 0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
        ctx.fill();

        const streakHalfW = frameW * 0.45 * scale;
        const streakH = Math.max(3, 8 * scale);
        const sGrad = ctx.createLinearGradient(cx - streakHalfW, cy, cx + streakHalfW, cy);
        sGrad.addColorStop(0, `rgba(${tr}, ${tg}, ${tb}, 0)`);
        sGrad.addColorStop(0.42, `rgba(${tr}, ${tg}, ${tb}, ${(alpha * 0.65).toFixed(3)})`);
        sGrad.addColorStop(0.5, `rgba(255, 255, 255, ${Math.min(0.95, alpha).toFixed(3)})`);
        sGrad.addColorStop(0.58, `rgba(${tr}, ${tg}, ${tb}, ${(alpha * 0.65).toFixed(3)})`);
        sGrad.addColorStop(1, `rgba(${tr}, ${tg}, ${tb}, 0)`);
        ctx.fillStyle = sGrad;
        ctx.fillRect(cx - streakHalfW, cy - streakH / 2, streakHalfW * 2, streakH);

        const midX = fx + frameW * 0.5;
        const midY = fy + frameH * 0.5;
        const ghostX = midX - (cx - midX) * 0.55;
        const ghostY = midY - (cy - midY) * 0.55;
        ctx.strokeStyle = `rgba(${tr}, ${tg}, ${tb}, ${(alpha * 0.35).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ghostX, ghostY, 14 * scale, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
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
          ctx.save();
          ctx.fillStyle =
            delta >= 0
              ? `rgba(255, 255, 255, ${Math.min(0.55, delta * 1.35).toFixed(3)})`
              : `rgba(0, 0, 0, ${Math.min(0.65, Math.abs(delta) * 1.45).toFixed(3)})`;
          ctx.fillRect(fx, fy, frameW, frameH);
          ctx.restore();
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
            const sx = fx + nextRand() * frameW;
            const sy = fy + nextRand() * frameH;
            const bright = nextRand() > 0.5;
            ctx.fillStyle = bright ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.28)";
            ctx.fillRect(sx, sy, 1.5, 1.5);
          }

          if (scratches > 0.03) {
            const lineCount = Math.max(1, Math.round(scratches * 4));
            for (let i = 0; i < lineCount; i++) {
              const xFrac = ((0.21 + i * 0.27 + ((playheadFrame * (i + 3)) % 17) * 0.008) % 0.92) + 0.04;
              const lx = fx + frameW * xFrac;
              ctx.strokeStyle =
                i % 2 === 0
                  ? `rgba(255,255,255,${Math.min(0.45, scratches * 0.42).toFixed(3)})`
                  : `rgba(10,10,12,${Math.min(0.55, scratches * 0.48).toFixed(3)})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(lx, fy);
              ctx.lineTo(lx + (nextRand() - 0.5) * 1.5, fy + frameH);
              ctx.stroke();
            }
          }

          if (vignette > 0.02) {
            const midX = fx + frameW / 2;
            const midY = fy + frameH / 2;
            const vig = ctx.createRadialGradient(
              midX,
              midY,
              frameH * 0.25,
              midX,
              midY,
              frameW * 0.65
            );
            vig.addColorStop(0, "rgba(0,0,0,0)");
            vig.addColorStop(1, `rgba(0,0,0,${Math.min(0.82, vignette * 0.78).toFixed(3)})`);
            ctx.fillStyle = vig;
            ctx.fillRect(fx, fy, frameW, frameH);
          }
        }
      } else if (node.effect === "vignette") {
        const rawAngle = Math.min(1.2, Math.max(0.1, Number(p.angle_rad ?? 0.52)));
        const intensity = Math.min(1, kfMul);
        if (intensity > 0.005) {
          const effAngle = rawAngle * intensity;
          const midX = fx + frameW * 0.5;
          const midY = fy + frameH * 0.5;
          const innerR = Math.max(8, frameH * (0.44 - Math.min(0.28, effAngle * 0.22)));
          const outerR = Math.hypot(frameW * 0.5, frameH * 0.5) * 1.05;
          const edgeAlpha = Math.min(0.92, (0.22 + effAngle * 0.62) * intensity);
          const midAlpha = Math.min(0.45, edgeAlpha * 0.38);
          const vig = ctx.createRadialGradient(midX, midY, innerR, midX, midY, outerR);
          vig.addColorStop(0, "rgba(0, 0, 0, 0)");
          vig.addColorStop(0.55, `rgba(0, 0, 0, ${midAlpha.toFixed(3)})`);
          vig.addColorStop(1, `rgba(0, 0, 0, ${edgeAlpha.toFixed(3)})`);
          ctx.save();
          ctx.fillStyle = vig;
          ctx.fillRect(fx, fy, frameW, frameH);
          ctx.restore();
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
          ctx.save();
          for (let i = 0; i < speckCount; i++) {
            const sx = fx + nextRand() * frameW;
            const sy = fy + nextRand() * frameH;
            const sz = nextRand() > 0.72 ? 1.8 : 1.2;
            ctx.fillStyle = nextRand() > 0.5
              ? `rgba(245, 242, 236, ${brightAlpha})`
              : `rgba(12, 12, 15, ${darkAlpha})`;
            ctx.fillRect(sx, sy, sz, sz);
          }
          ctx.restore();
        }
      } else if (node.effect === "optical_glow") {
        const intensity = clamp01(Number(p.glow_intensity ?? 0.45) * kfMul);
        const radius = Math.min(24, Math.max(2, Number(p.glow_radius ?? 10)));
        if (intensity > 0.005) {
          if (buf && typeof ctx.filter === "string") {
            ctx.save();
            ctx.globalCompositeOperation = "screen";
            ctx.globalAlpha = intensity;
            const blurPx = Math.max(2, Math.round(radius * Math.max(0.5, frameW / 640)));
            ctx.filter = `blur(${blurPx}px)`;
            ctx.drawImage(buf, fxOutX, fxOutY, fxOutW, fxOutH);
            ctx.restore();
          } else {
            const midX = fx + frameW * 0.5 + shiftX;
            const midY = fy + frameH * 0.5 + shiftY;
            const gGrad = ctx.createRadialGradient(midX, midY, 4, midX, midY, Math.max(32, radius * 8));
            gGrad.addColorStop(0, `rgba(255, 244, 224, ${(intensity * 0.55).toFixed(3)})`);
            gGrad.addColorStop(1, "rgba(255, 244, 224, 0)");
            ctx.save();
            ctx.globalCompositeOperation = "screen";
            ctx.fillStyle = gGrad;
            ctx.fillRect(fx, fy, frameW, frameH);
            ctx.restore();
          }
        }
      } else if (node.effect === "halation") {
        const strength = clamp01(Number(p.halation_strength ?? 0.55) * kfMul);
        const radius = Math.min(20, Math.max(2, Number(p.halation_radius ?? 10)));
        if (strength > 0.005) {
          const halCanvas = buf
            ? (_halScratchCanvas = ensureScratchCanvas(_halScratchCanvas, bw, bh))
            : null;
          if (halCanvas && buf && typeof ctx.filter === "string") {
            const hctx = halCanvas.getContext("2d");
            const blurPx = Math.max(2, Math.round(radius * Math.max(0.5, frameW / 640)));
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

            ctx.save();
            ctx.globalCompositeOperation = "screen";
            ctx.globalAlpha = Math.min(0.92, strength * 0.85);
            ctx.drawImage(halCanvas, fxOutX, fxOutY, fxOutW, fxOutH);
            ctx.restore();
          }
          const hx = fx + frameW * 0.72 + shiftX;
          const hy = fy + frameH * 0.30 + shiftY;
          const hr = Math.max(28, radius * 4.2 * Math.max(0.5, frameW / 640));
          const hGrad = ctx.createRadialGradient(hx, hy, 2, hx, hy, hr);
          hGrad.addColorStop(0, `rgba(255, 118, 48, ${(strength * 0.58).toFixed(3)})`);
          hGrad.addColorStop(0.38, `rgba(255, 58, 20, ${(strength * 0.34).toFixed(3)})`);
          hGrad.addColorStop(1, "rgba(255, 40, 12, 0)");
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.fillStyle = hGrad;
          ctx.fillRect(fx, fy, frameW, frameH);
          ctx.restore();
        }
      } else if (node.effect === "scanlines") {
        const spacing = Math.round(Math.min(12, Math.max(2, Number(p.line_spacing_px ?? 4))));
        const opacity = Math.min(0.9, Math.max(0.1, Number(p.opacity ?? 0.45))) * Math.min(1, kfMul);
        if (opacity > 0.005) {
          const stepPx = Math.max(2, Math.round(spacing * Math.max(0.5, frameH / 360)));
          const lineH = stepPx >= 6 ? 2 : 1;
          ctx.save();
          ctx.fillStyle = `rgba(0, 0, 0, ${opacity.toFixed(3)})`;
          for (let y = fy; y < fy + frameH; y += stepPx) {
            ctx.fillRect(fx, y, frameW, lineH);
          }
          ctx.restore();
        }
      } else if (node.effect === "letterbox") {
        const parsedRatio = Number.parseFloat(String(p.ratio ?? "2.39"));
        const ratioVal = Number.isFinite(parsedRatio)
          ? Math.min(2.39, Math.max(1.85, parsedRatio))
          : 2.39;
        const frameAspect = frameW / Math.max(1, frameH);
        const barH = (frameAspect < ratioVal
          ? Math.max(0, (frameH - frameW / ratioVal) * 0.5)
          : 0) * Math.min(1, kfMul);
        if (barH >= 0.5) {
          ctx.save();
          ctx.fillStyle = "#000000";
          ctx.fillRect(fx, fy, frameW, barH);
          ctx.fillRect(fx, fy + frameH - barH, frameW, barH);
          ctx.restore();
        }
      }
    }

    // Composite Title & Lower-Third / Subtitle overlays (suppressed in Keyer Studio mode so matte & checkerboard stay clean)
    const suppressForKeyer = Boolean(pCkRaw && pCkRaw.enabled);
    const titleOnAir = suppressForKeyer
      ? false
      : drawTitleOverlayOnFrame(ctx, fx, fy, frameW, frameH, passTitleState, tSec);

    const activeSubCue = suppressForKeyer
      ? null
      : drawSubtitleOverlayOnFrame(ctx, fx, fy, frameW, frameH, passSubState, tSec);

    return { titleOnAir, activeSubCue };
  };

  ctx.save();
  ctx.beginPath();
  ctx.rect(fx, fy, frameW, frameH);
  ctx.clip();

  let titleOnAir = false;
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

  // FX & Chroma Key telemetry pill inside Program Monitor corner
  if (rawNodes.length > 0 || (ckRaw && ckRaw.enabled)) {
    const parts = [];
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

  // Broadcast & Social Safe-Area Guides (Action 90%, Title 80%, Reels/TikTok HUD)
  drawSafeAreaGuides(ctx, fx, fy, frameW, frameH, framingState);

  if (wipeActive && wipeGeom) {
    drawSplitWipeOverlay(ctx, fx, fy, frameW, frameH, wipeGeom, splitWipeState);
  }

  ctx.restore();

  // Frame border
  ctx.strokeStyle = "#2c2c31";
  ctx.lineWidth = 1;
  ctx.strokeRect(fx, fy, frameW, frameH);
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

  const labelColW = width < 480 ? 58 : 118;
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
  const spanFrames = Math.max(25, maxFrame - startFrame);
  const visibleSpan = spanFrames / zoom;
  const pxPerFrame = timelineW / visibleSpan;

  const frameToX = (f) => timelineX + (f - startFrame) * pxPerFrame;
  const xToRawFrame = (x) => startFrame + (x - timelineX) / pxPerFrame;
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
    ? computeBpmBeatFrames(doc, bpmGrid, startFrame, Math.ceil(startFrame + visibleSpan))
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

  for (let f = startFrame; f <= startFrame + visibleSpan; f += stepFrames) {
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

    // Track Mute (M) and Solo (S) buttons on label rail
    const msBtnW = width < 480 ? 13 : 16;
    const msBtnH = 18;
    const msBtnY = rowY + 13;
    const muteX = width < 480 ? 28 : 79;
    const soloX = width < 480 ? 43 : 97;

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

      const baseFill = trackAudiblyMuted
        ? (isAudio ? "#1b2b27" : "#1e2736")
        : isAudio
          ? clip.enabled ? "#214f44" : "#252529"
          : clip.enabled ? "#294670" : "#252529";
      const borderCol = isSelected
        ? "#e07b39"
        : trackAudiblyMuted
          ? "#3b3b44"
          : isAudio ? "#3d8c78" : "#4e78b0";

      ctx.fillStyle = baseFill;
      roundRectPath(ctx, drawX, clipY, drawW, clipH, 2);
      ctx.fill();

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

      // Trim handle brackets on selected or hovered trim edge
      const trimHandleW = drawW >= 12 ? Math.min(8, Math.max(4, drawW * 0.22)) : 0;
      if (trimHandleW > 0 && (isSelected || isTrimClip)) {
        const leftActive = isTrimClip && trimTarget.edge === "left";
        const rightActive = isTrimClip && trimTarget.edge === "right";
        if (isSelected || leftActive) {
          ctx.fillStyle = leftActive ? "#ffd166" : "rgba(255, 216, 168, 0.72)";
          ctx.fillRect(drawX + 1, clipY + 2, leftActive ? 3 : 2, clipH - 4);
        }
        if (isSelected || rightActive) {
          ctx.fillStyle = rightActive ? "#ffd166" : "rgba(255, 216, 168, 0.72)";
          ctx.fillRect(drawX + drawW - (rightActive ? 4 : 3), clipY + 2, rightActive ? 3 : 2, clipH - 4);
        }
      }

      const retimeNorm = normalizeClipRetime(clip);
      const hasRetime = Math.abs(retimeNorm.speedRate - 1.0) > 0.005 || retimeNorm.reverse;
      const transformNorm = !isAudio ? normalizeClipTransform(clip) : null;
      const hasTransform = Boolean(transformNorm && !isClipTransformIdentity(transformNorm));
      let speedBadgeW = 0;
      const rightReserve = showFadeHandles ? 14 : 5;
      if (hasRetime && drawW >= 42) {
        const badgeText = formatRetimeBadgeText(retimeNorm.speedRate, retimeNorm.reverse);
        ctx.font = "700 9px ui-monospace, monospace";
        const measuredW = Math.ceil(ctx.measureText(badgeText).width) + 8;
        if (measuredW + rightReserve + 18 <= drawW) {
          speedBadgeW = measuredW;
          const badgeX = drawX + drawW - rightReserve - speedBadgeW;
          const badgeY = clipY + 3;
          const badgeH = 14;
          ctx.fillStyle = retimeNorm.reverse
            ? "rgba(224, 123, 57, 0.28)"
            : "rgba(210, 153, 34, 0.24)";
          roundRectPath(ctx, badgeX, badgeY, speedBadgeW, badgeH, 2);
          ctx.fill();
          ctx.strokeStyle = retimeNorm.reverse ? "#e68442" : "#d29922";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = retimeNorm.reverse ? "#ffd8a8" : "#ffd166";
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

      if (drawW > 34) {
        const badgesOffset = speedBadgeW + transformBadgeW;
        const textClipW = Math.max(8, drawW - 8 - (badgesOffset > 0 ? badgesOffset + 10 : 0));
        ctx.save();
        ctx.beginPath();
        ctx.rect(drawX + 4, clipY, textClipW, clipH);
        ctx.clip();
        ctx.fillStyle = trackAudiblyMuted ? "#9696a0" : "#e6e6eb";
        ctx.font = "600 11px system-ui, sans-serif";
        ctx.fillText(clip.name, drawX + 6, rowY + 19);
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.rect(drawX + 4, clipY + 20, drawW - 8, clipH - 20);
        ctx.clip();
        ctx.fillStyle = "#a2a2ad";
        ctx.font = "10px ui-monospace, monospace";
        const gainTag = Math.abs(gainDb) >= 0.05
          ? ` | ${gainDb > 0 ? "+" : ""}${gainDb.toFixed(1)}dB`
          : "";
        const muteTag = trackAudiblyMuted ? " | MUTED" : "";
        const retimeTag = hasRetime && speedBadgeW === 0
          ? ` | ${formatRetimeBadgeText(retimeNorm.speedRate, retimeNorm.reverse)}`
          : "";
        ctx.fillText(
          `${clip.start_frame}-${clip.start_frame + clip.duration_frames}f${gainTag}${muteTag}${retimeTag}`,
          drawX + 6,
          rowY + 32
        );
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
      const isMarkerSnap = opts.snapGuideKind === "marker";
      const guideCol = isBeatSnap ? "#e6b842" : "#39c5cf";
      const textCol = isBeatSnap ? "#ffe394" : "#8de8ef";
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

  return {
    hitboxes,
    frameToX,
    xToFrame,
    xToRawFrame,
    pxPerFrame,
    startFrame,
    maxFrame,
    rulerHeight,
    labelColW
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

function renderColorPreviewScene(ctx, width, height, cdl, graded, showLabels) {
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
    if (showLabels) {
      ctx.fillStyle = "rgba(17, 17, 20, 0.78)";
      ctx.fillRect(i * swW + 3, row2Y + row2H - 18, Math.max(8, swW - 6), 15);
      ctx.fillStyle = "#d8d8de";
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillText(sw.label, i * swW + 6, row2Y + row2H - 7);
    }
  });

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

export function drawColorPreviewCanvas(canvas, cdl, wipeRatio, splitOpts = null) {
  const { ctx, width, height } = setupCanvas(canvas, 224);
  const wipeEnabled =
    splitOpts && typeof splitOpts.enabled === "boolean" ? splitOpts.enabled : true;
  const wipePct =
    splitOpts && splitOpts.positionPct !== undefined
      ? clampSplitWipePercent(splitOpts.positionPct)
      : clampSplitWipePercent((wipeRatio ?? 0.5) * 100);

  const drawHalf = (xStart, xEnd, graded) => {
    if (xEnd <= xStart) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(xStart, 0, xEnd - xStart, height);
    ctx.clip();
    renderColorPreviewScene(ctx, width, height, cdl, graded, true);
    ctx.restore();
  };

  if (wipeEnabled) {
    const geom = computeSplitWipeGeometry(0, 0, width, height, wipePct);
    drawHalf(0, geom.dividerX, false);
    drawHalf(geom.dividerX, width, true);
    drawSplitWipeOverlay(ctx, 0, 0, width, height, geom, splitOpts || {});
    canvas._splitWipeGeom = {
      ...geom,
      canvasWidth: width,
      canvasHeight: height
    };
  } else {
    drawHalf(0, width, true);
    canvas._splitWipeGeom = null;
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
