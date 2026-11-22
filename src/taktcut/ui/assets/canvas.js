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

function setupCanvas(canvas, cssHeight) {
  const rect = canvas.parentElement
    ? canvas.parentElement.getBoundingClientRect()
    : canvas.getBoundingClientRect();
  const width = Math.max(260, Math.floor(rect.width));
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

function hexToRgbTuple(hex) {
  if (typeof hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(hex.trim())) {
    return [255, 216, 168];
  }
  const clean = hex.trim().slice(1);
  const num = Number.parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

let _fxScratchCanvas = null;
function getFxScratchCanvas(w, h) {
  if (!_fxScratchCanvas && typeof document !== "undefined") {
    _fxScratchCanvas = document.createElement("canvas");
  }
  if (!_fxScratchCanvas) return null;
  const cw = Math.max(1, Math.round(w));
  const ch = Math.max(1, Math.round(h));
  if (_fxScratchCanvas.width !== cw || _fxScratchCanvas.height !== ch) {
    _fxScratchCanvas.width = cw;
    _fxScratchCanvas.height = ch;
  }
  return _fxScratchCanvas;
}

function drawBaseProgramScene(ctx, w, h, doc, playheadFrame, cdl, activeClips) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  const c0 = applyGradeOrCdlRgb(0.14, 0.18, 0.24, cdl);
  const c1 = applyGradeOrCdlRgb(0.24, 0.26, 0.30, cdl);
  const c2 = applyGradeOrCdlRgb(0.10, 0.11, 0.14, cdl);
  grad.addColorStop(0, toCssRgb(c0[0], c0[1], c0[2]));
  grad.addColorStop(0.55, toCssRgb(c1[0], c1[1], c1[2]));
  grad.addColorStop(1, toCssRgb(c2[0], c2[1], c2[2]));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle editorial specular keylight disc for glow/flare/chroma response
  const keyX = w * 0.72;
  const keyY = h * 0.32;
  const keyR = Math.max(18, Math.min(w, h) * 0.2);
  const keyRgb = applyGradeOrCdlRgb(0.95, 0.90, 0.82, cdl);
  const keyGrad = ctx.createRadialGradient(keyX, keyY, 2, keyX, keyY, keyR);
  keyGrad.addColorStop(
    0,
    `rgba(${Math.round(keyRgb[0] * 255)}, ${Math.round(keyRgb[1] * 255)}, ${Math.round(keyRgb[2] * 255)}, 0.52)`
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

  // Action/Title Safe Reticle
  ctx.strokeStyle = "rgba(216, 216, 222, 0.24)";
  ctx.lineWidth = 1;
  ctx.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
  ctx.setLineDash([]);

  // Center crosshair
  const cx = w / 2;
  const cy = h / 2;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy);
  ctx.lineTo(cx + 8, cy);
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx, cy + 8);
  ctx.stroke();

  // Active clip slate info
  ctx.fillStyle = "rgba(20, 20, 22, 0.76)";
  ctx.fillRect(14, h - 48, Math.max(120, w - 28), 34);
  ctx.strokeStyle = "#34343a";
  ctx.strokeRect(14, h - 48, Math.max(120, w - 28), 34);

  if (activeClips.length > 0) {
    const top = activeClips[activeClips.length - 1];
    const relOffset = playheadFrame - top.clip.start_frame + (top.clip.source_in_frame || 0);
    ctx.fillStyle = "#d8d8de";
    ctx.font = "600 11px ui-monospace, monospace";
    ctx.fillText(`${top.track}: ${top.clip.name}`, 22, h - 31);
    ctx.fillStyle = "#8e8e98";
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillText(
      `SRC+${relOffset}f | ${doc.width}x${doc.height} | ${activeClips.length} active layer(s)`,
      22,
      h - 18
    );
  } else {
    ctx.fillStyle = "#8e8e98";
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillText("BLACK / NO VIDEO AT PLAYHEAD", 22, h - 27);
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

export function drawProgramMonitorCanvas(
  canvas,
  doc,
  playheadFrame,
  cdl,
  fxState = null,
  titleState = null
) {
  const { ctx, width, height } = setupCanvas(canvas, 244);
  ctx.fillStyle = "#141416";
  ctx.fillRect(0, 0, width, height);

  // 16:9 letterbox / pillarbox viewer frame
  const targetAspect = 16 / 9;
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

  const rawNodes = fxState && Array.isArray(fxState.nodes) ? fxState.nodes : [];
  const bypassAll = Boolean(fxState && fxState.bypassAll);
  const activeFx = bypassAll ? [] : rawNodes.filter((n) => n && n.enabled !== false);

  // Compute spatial shake + gate-weave displacement
  let shiftX = 0;
  let shiftY = 0;
  let motionBlurAmt = 0;
  for (const node of activeFx) {
    const p = node.params || {};
    const kfMul = evaluateNodeIntensity(node, tSec);
    if (kfMul <= 0.0001) continue;
    if (node.effect === "shake") {
      const amp = Number(p.amplitude ?? 14) * kfMul * (frameW / 640);
      const freq = Number(p.frequency ?? 6);
      const seed = Number(p.seed ?? 42);
      const p1 = ((seed % 360) * Math.PI) / 180 + 0.65;
      const p2 = (((seed * 7 + 53) % 360) * Math.PI) / 180 + 1.15;
      shiftX += amp * Math.sin(tSec * freq * Math.PI * 2 + p1);
      shiftY += amp * Math.cos(tSec * freq * 1.37 * Math.PI * 2 + p2);
      motionBlurAmt = Math.max(motionBlurAmt, Number(p.motion_blur ?? 0) * Math.min(1, kfMul));
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

  ctx.save();
  ctx.beginPath();
  ctx.rect(fx, fy, frameW, frameH);
  ctx.clip();

  if (buf) {
    const bctx = buf.getContext("2d");
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, bw, bh);
    drawBaseProgramScene(bctx, bw, bh, doc, playheadFrame, cdl, activeClips);

    // Apply Chroma Aberration RGB channel split directly on frame buffer
    const chromaNode = activeFx.find((n) => n.effect === "chroma_aberration");
    if (chromaNode) {
      const chromaMul = evaluateNodeIntensity(chromaNode, tSec);
      const p = chromaNode.params || {};
      const spread = Number(p.spread ?? 8) * chromaMul;
      const angleRad = (Number(p.angle ?? 15) * Math.PI) / 180;
      const dx = Math.round(Math.cos(angleRad) * spread * (bw / 640));
      const dy = Math.round(Math.sin(angleRad) * spread * (bw / 640));
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
            d[oi + 3] = 255;
          }
        }
        bctx.putImageData(outImg, 0, 0);
      }
    }

    ctx.drawImage(buf, fx + shiftX, fy + shiftY, frameW, frameH);
    if (motionBlurAmt >= 0.05 && (Math.abs(shiftX) > 0.2 || Math.abs(shiftY) > 0.2)) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.42, motionBlurAmt * 0.42);
      ctx.drawImage(buf, fx - shiftX * 0.55, fy - shiftY * 0.55, frameW, frameH);
      ctx.restore();
    }
  } else {
    ctx.save();
    ctx.translate(fx + shiftX, fy + shiftY);
    drawBaseProgramScene(ctx, frameW, frameH, doc, playheadFrame, cdl, activeClips);
    ctx.restore();
  }

  // Apply optical/lighting FX passes over the 16:9 frame
  for (const node of activeFx) {
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
        ctx.drawImage(buf, fx + shiftX, fy + shiftY, frameW, frameH);
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

      // Radial optical halo
      const haloR = Math.max(22, frameH * 0.36 * scale);
      const halo = ctx.createRadialGradient(cx, cy, 1, cx, cy, haloR);
      halo.addColorStop(0, `rgba(255, 255, 255, ${Math.min(0.95, alpha).toFixed(3)})`);
      halo.addColorStop(0.22, `rgba(${tr}, ${tg}, ${tb}, ${(alpha * 0.75).toFixed(3)})`);
      halo.addColorStop(1, `rgba(${tr}, ${tg}, ${tb}, 0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fill();

      // Anamorphic horizontal streak
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

      // Secondary opposite lens ghost ring
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

        // Deterministic grain specks seeded by playheadFrame
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

        // Vertical film gate scratches
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

        // Optical edge vignette
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
    }
  }

  // Composite Title & Lower-Third overlay over graded/FX video
  const titleOnAir = drawTitleOverlayOnFrame(ctx, fx, fy, frameW, frameH, titleState, tSec);

  if (titleState && titleState.showBadge) {
    const label = titleState.enabled === false
      ? "TITLE: BYPASSED"
      : titleOnAir
        ? "TITLE: ON AIR"
        : `TITLE: ${Number(titleState.start_s ?? 0).toFixed(1)}s-${Number(titleState.end_s ?? 0).toFixed(1)}s`;
    ctx.font = "700 10px ui-monospace, monospace";
    const tw = Math.min(frameW - 20, ctx.measureText(label).width + 12);
    ctx.fillStyle = titleOnAir ? "rgba(63, 185, 80, 0.90)" : "rgba(20, 20, 22, 0.84)";
    ctx.fillRect(fx + 8, fy + 16, tw, 17);
    ctx.fillStyle = titleOnAir ? "#111114" : "#a4a4ae";
    ctx.fillText(label, fx + 14, fy + 28);
  }

  // FX telemetry pill inside Program Monitor corner
  if (rawNodes.length > 0) {
    const label = bypassAll
      ? "FX: BYPASSED (A/B)"
      : activeFx.length > 0
        ? `FX: ${activeFx.map((n) => n.effect.toUpperCase()).slice(0, 3).join(" + ")}${activeFx.length > 3 ? " +" : ""}`
        : "FX: ALL OFF";
    ctx.font = "700 10px ui-monospace, monospace";
    const tw = Math.min(frameW - 20, ctx.measureText(label).width + 12);
    ctx.fillStyle = bypassAll || activeFx.length === 0 ? "rgba(20, 20, 22, 0.84)" : "rgba(230, 132, 66, 0.92)";
    ctx.fillRect(fx + frameW - tw - 8, fy + 16, tw, 17);
    ctx.fillStyle = bypassAll || activeFx.length === 0 ? "#a4a4ae" : "#111114";
    ctx.fillText(label, fx + frameW - tw - 2, fy + 28);
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

  ctx.font = "10px ui-monospace, monospace";
  ctx.save();
  ctx.beginPath();
  ctx.rect(timelineX, 0, timelineW, rulerHeight);
  ctx.clip();
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

      if (drawW > 34) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(drawX + 4, clipY, drawW - 8, clipH);
        ctx.clip();
        ctx.fillStyle = trackAudiblyMuted ? "#9696a0" : "#e6e6eb";
        ctx.font = "600 11px system-ui, sans-serif";
        ctx.fillText(clip.name, drawX + 6, rowY + 19);
        ctx.fillStyle = "#a2a2ad";
        ctx.font = "10px ui-monospace, monospace";
        const gainTag = Math.abs(gainDb) >= 0.05
          ? ` | ${gainDb > 0 ? "+" : ""}${gainDb.toFixed(1)}dB`
          : "";
        const muteTag = trackAudiblyMuted ? " | MUTED" : "";
        ctx.fillText(
          `${clip.start_frame}-${clip.start_frame + clip.duration_frames}f${gainTag}${muteTag}`,
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

  // Markers
  const markerPalette = {
    Blue: "#528bff",
    Yellow: "#d29922",
    Green: "#3fb950",
    Red: "#e5534b",
    Purple: "#a371f7",
    Cyan: "#39c5cf"
  };

  for (const mk of doc.markers || []) {
    const mx = frameToX(mk.frame);
    if (mx < timelineX || mx > timelineX + timelineW) continue;
    const col = markerPalette[mk.color] || "#528bff";

    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(mx - 5, rulerHeight - 13);
    ctx.lineTo(mx + 5, rulerHeight - 13);
    ctx.lineTo(mx, rulerHeight - 4);
    ctx.closePath();
    ctx.fill();

    hitboxes.push({
      kind: "marker",
      x: mx - 7,
      y: rulerHeight - 16,
      w: 14,
      h: 16,
      data: mk
    });
  }

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
      ctx.save();
      ctx.strokeStyle = "#39c5cf";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();

      // Snap diamond marker on ruler seam
      ctx.fillStyle = "#39c5cf";
      ctx.beginPath();
      ctx.moveTo(gx, rulerHeight - 5);
      ctx.lineTo(gx + 4, rulerHeight);
      ctx.lineTo(gx, rulerHeight + 5);
      ctx.lineTo(gx - 4, rulerHeight);
      ctx.closePath();
      ctx.fill();

      // Compact SNAP frame pill
      const snapLabel = `SNAP ${opts.snapGuideFrame}f`;
      ctx.font = "700 9px ui-monospace, monospace";
      const tw = ctx.measureText(snapLabel).width + 8;
      const pillX = Math.min(timelineX + timelineW - tw - 2, Math.max(timelineX + 2, gx + 5));
      ctx.fillStyle = "rgba(17, 17, 20, 0.9)";
      ctx.fillRect(pillX, 2, tw, 13);
      ctx.strokeStyle = "#39c5cf";
      ctx.lineWidth = 1;
      ctx.strokeRect(pillX, 2, tw, 13);
      ctx.fillStyle = "#8de8ef";
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

export function drawColorPreviewCanvas(canvas, cdl, wipeRatio) {
  const { ctx, width, height } = setupCanvas(canvas, 224);
  const wipeX = Math.round(width * clamp01(wipeRatio));

  const drawHalf = (xStart, xEnd, graded) => {
    if (xEnd <= xStart) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(xStart, 0, xEnd - xStart, height);
    ctx.clip();

    const barW = width / SMPTE_BARS.length;
    const row1H = 88;
    SMPTE_BARS.forEach((col, i) => {
      const [r, g, b] = graded ? applyGradeOrCdlRgb(col[0], col[1], col[2], cdl) : col;
      ctx.fillStyle = toCssRgb(r, g, b);
      ctx.fillRect(i * barW, 0, Math.ceil(barW), row1H);
    });

    const row2Y = row1H;
    const row2H = 66;
    const swW = width / REFERENCE_SWATCHES.length;
    REFERENCE_SWATCHES.forEach((sw, i) => {
      const [r, g, b] = graded ? applyGradeOrCdlRgb(sw.rgb[0], sw.rgb[1], sw.rgb[2], cdl) : sw.rgb;
      ctx.fillStyle = toCssRgb(r, g, b);
      ctx.fillRect(i * swW, row2Y, Math.ceil(swW), row2H);
      ctx.fillStyle = "rgba(17, 17, 20, 0.78)";
      ctx.fillRect(i * swW + 3, row2Y + row2H - 18, Math.max(8, swW - 6), 15);
      ctx.fillStyle = "#d8d8de";
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillText(sw.label, i * swW + 6, row2Y + row2H - 7);
    });

    const row3Y = row1H + row2H;
    const row3H = 38;
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

    ctx.restore();
  };

  drawHalf(0, wipeX, false);
  drawHalf(wipeX, width, true);

  ctx.strokeStyle = "#e07b39";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(wipeX, 0);
  ctx.lineTo(wipeX, height);
  ctx.stroke();

  ctx.fillStyle = "rgba(17, 17, 20, 0.85)";
  ctx.fillRect(8, 8, 72, 18);
  ctx.fillStyle = "#d8d8de";
  ctx.font = "700 10px ui-monospace, monospace";
  ctx.fillText("ORIGINAL", 14, 20);

  ctx.fillStyle = "#e07b39";
  ctx.fillRect(width - 96, 8, 88, 18);
  ctx.fillStyle = "#111114";
  ctx.fillText("COLOR GRADE", width - 90, 20);
}

export function drawColorScopeCanvas(canvas, cdl) {
  const { ctx, width, height } = setupCanvas(canvas, 224);
  ctx.fillStyle = "#141416";
  ctx.fillRect(0, 0, width, height);

  const split = width >= 380;
  const curveBoxW = split ? Math.floor(width * 0.5) : width;
  const pad = 16;
  const plotW = curveBoxW - pad * 2;
  const plotH = height - pad * 2;

  ctx.strokeStyle = "#27272d";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const gx = pad + (plotW * i) / 4;
    const gy = pad + (plotH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(gx, pad);
    ctx.lineTo(gx, pad + plotH);
    ctx.moveTo(pad, gy);
    ctx.lineTo(pad + plotW, gy);
    ctx.stroke();
  }

  ctx.save();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = "#484852";
  ctx.beginPath();
  ctx.moveTo(pad, pad + plotH);
  ctx.lineTo(pad + plotW, pad);
  ctx.stroke();
  ctx.restore();

  const channels = [
    { idx: 0, color: "#e5534b" },
    { idx: 1, color: "#3fb950" },
    { idx: 2, color: "#528bff" }
  ];
  const samples = 48;
  for (const ch of channels) {
    ctx.strokeStyle = ch.color;
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const xNorm = i / samples;
      const outRgb = applyGradeOrCdlRgb(xNorm, xNorm, xNorm, cdl);
      const px = pad + xNorm * plotW;
      const py = pad + (1 - outRgb[ch.idx]) * plotH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  ctx.fillStyle = "#8e8e98";
  ctx.font = "10px ui-monospace, monospace";
  ctx.fillText("WAVEFORM / RGB CURVE", pad + 4, pad + 11);

  if (!split) return;

  const cx = curveBoxW + Math.floor((width - curveBoxW) / 2);
  const cy = Math.floor(height / 2);
  const radius = Math.min((width - curveBoxW) / 2 - 16, height / 2 - 18);

  ctx.strokeStyle = "#27272d";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx, cy + radius);
  ctx.stroke();

  const vectors = [
    { rgb: [0.75, 0.0, 0.0], col: "#e5534b" },
    { rgb: [0.75, 0.75, 0.0], col: "#d29922" },
    { rgb: [0.0, 0.75, 0.0], col: "#3fb950" },
    { rgb: [0.0, 0.75, 0.75], col: "#39c5cf" },
    { rgb: [0.0, 0.0, 0.75], col: "#528bff" },
    { rgb: [0.75, 0.0, 0.75], col: "#c678dd" }
  ];

  const rgbToVec = (r, g, b) => {
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const pb = (b - y) / 1.8556;
    const pr = (r - y) / 1.5748;
    return [pb * 2.0, -pr * 2.0];
  };

  for (const v of vectors) {
    const [ox, oy] = rgbToVec(v.rgb[0], v.rgb[1], v.rgb[2]);
    const graded = applyGradeOrCdlRgb(v.rgb[0], v.rgb[1], v.rgb[2], cdl);
    const [gx, gy] = rgbToVec(graded[0], graded[1], graded[2]);

    const px0 = cx + ox * radius;
    const py0 = cy + oy * radius;
    const px1 = cx + gx * radius;
    const py1 = cy + gy * radius;

    ctx.strokeStyle = "#484852";
    ctx.strokeRect(px0 - 3.5, py0 - 3.5, 7, 7);

    ctx.strokeStyle = v.col;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px0, py0);
    ctx.lineTo(px1, py1);
    ctx.stroke();

    ctx.fillStyle = v.col;
    ctx.beginPath();
    ctx.arc(px1, py1, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#8e8e98";
  ctx.font = "10px ui-monospace, monospace";
  ctx.fillText("VECTORSCOPE", curveBoxW + 10, 18);
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
