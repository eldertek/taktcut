function clamp01(val) {
  return val < 0 ? 0 : val > 1 ? 1 : val;
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

function setupCanvas(canvas, cssHeight) {
  const rect = canvas.parentElement ? canvas.parentElement.getBoundingClientRect() : canvas.getBoundingClientRect();
  const width = Math.max(280, Math.floor(rect.width));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height: cssHeight };
}

function framesToSmpte(frame, fpsNum, fpsDen) {
  const nominalFps = Math.max(1, Math.round(fpsNum / Math.max(1, fpsDen)));
  const ff = frame % nominalFps;
  const totalSec = Math.floor(frame / nominalFps);
  const ss = totalSec % 60;
  const mm = Math.floor(totalSec / 60) % 60;
  const hh = Math.floor(totalSec / 3600);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
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

export function drawTimelineCanvas(canvas, doc, validation, opts) {
  const tracks = doc ? doc.tracks || [] : [];
  const rowCount = Math.max(1, tracks.length);
  const rulerHeight = 42;
  const trackHeight = 44;
  const padBottom = 14;
  const totalHeight = rulerHeight + rowCount * trackHeight + padBottom;

  const { ctx, width, height } = setupCanvas(canvas, totalHeight);
  const hitboxes = [];

  ctx.fillStyle = "#0e1424";
  ctx.fillRect(0, 0, width, height);

  if (!doc) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px ui-monospace, monospace";
    ctx.fillText("No timeline loaded.", 16, 36);
    return hitboxes;
  }

  const labelColW = width < 480 ? 64 : 112;
  const timelineX = labelColW;
  const timelineW = Math.max(120, width - labelColW - 14);
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
  const startFrame = doc.start_frame || 0;
  const spanFrames = Math.max(25, maxFrame - startFrame);
  const visibleSpan = spanFrames / zoom;
  const pxPerFrame = timelineW / visibleSpan;

  const frameToX = (f) => timelineX + (f - startFrame) * pxPerFrame;

  // Ruler header background
  ctx.fillStyle = "#121829";
  ctx.fillRect(0, 0, width, rulerHeight);
  ctx.strokeStyle = "#1e2640";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, rulerHeight);
  ctx.lineTo(width, rulerHeight);
  ctx.moveTo(labelColW, 0);
  ctx.lineTo(labelColW, height);
  ctx.stroke();

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 11px ui-monospace, monospace";
  ctx.fillText("TRACK", 12, 25);

  // Ticks
  const minTickPx = width < 500 ? 70 : 90;
  const rawStep = Math.max(1, Math.ceil(minTickPx / Math.max(0.01, pxPerFrame)));
  const niceSteps = [1, 5, 10, 25, 50, 100, 125, 250, 500, 1000, 2500, 5000];
  const stepFrames = niceSteps.find((s) => s >= rawStep) || rawStep;

  ctx.font = "11px ui-monospace, monospace";
  ctx.save();
  ctx.beginPath();
  ctx.rect(timelineX, 0, timelineW, rulerHeight);
  ctx.clip();
  for (let f = startFrame; f <= startFrame + visibleSpan; f += stepFrames) {
    const x = frameToX(f);
    if (x < timelineX || x > timelineX + timelineW - 4) continue;
    ctx.strokeStyle = "#273152";
    ctx.beginPath();
    ctx.moveTo(x, rulerHeight - 10);
    ctx.lineTo(x, height);
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    const label = width < 520 ? `${f}f` : `${framesToSmpte(f, doc.fps.num, doc.fps.den)} (${f}f)`;
    if (x + ctx.measureText(label).width + 6 <= timelineX + timelineW) {
      ctx.fillText(label, x + 4, 17);
    }
  }
  ctx.restore();

  // Track lanes and clips
  const selected = opts ? opts.selected : null;
  tracks.forEach((trk, idx) => {
    const rowY = rulerHeight + idx * trackHeight;
    const isAudio = trk.kind === "audio";

    ctx.fillStyle = idx % 2 === 0 ? "#0e1424" : "#101729";
    ctx.fillRect(0, rowY, width, trackHeight);
    ctx.strokeStyle = "#1e2640";
    ctx.beginPath();
    ctx.moveTo(0, rowY + trackHeight);
    ctx.lineTo(width, rowY + trackHeight);
    ctx.stroke();

    // Track badge
    ctx.fillStyle = isAudio ? "#14b8a6" : "#4f6df5";
    roundRectPath(ctx, 8, rowY + 11, 24, 20, 4);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 10px ui-monospace, monospace";
    const shortCode = `${isAudio ? "A" : "V"}${trk.index}`;
    ctx.fillText(shortCode, 12, rowY + 25);

    if (width >= 480) {
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "500 11px system-ui, sans-serif";
      const tName = (trk.name || shortCode).slice(0, 12);
      ctx.fillText(tName, 38, rowY + 25);
    }

    // Clips
    for (const clip of trk.clips || []) {
      const cx = frameToX(clip.start_frame);
      const cw = Math.max(6, clip.duration_frames * pxPerFrame);
      if (cx + cw < timelineX || cx > timelineX + timelineW) continue;
      const drawX = Math.max(timelineX, cx);
      const drawW = Math.min(timelineX + timelineW, cx + cw) - drawX;
      if (drawW <= 1) continue;

      const isSelected =
        selected &&
        selected.kind === "clip" &&
        selected.data.name === clip.name &&
        selected.data.start_frame === clip.start_frame &&
        selected.data.track_index === clip.track_index &&
        selected.data.media_type === clip.media_type;

      const baseFill = isAudio
        ? clip.enabled ? "#0f766e" : "#1e293b"
        : clip.enabled ? "#3b5bdb" : "#1e293b";
      const borderCol = isSelected
        ? "#f0f0f5"
        : isAudio ? "#2dd4bf" : "#748ffc";

      ctx.fillStyle = baseFill;
      roundRectPath(ctx, drawX, rowY + 6, drawW, trackHeight - 12, 5);
      ctx.fill();

      ctx.strokeStyle = borderCol;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      if (drawW > 34) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(drawX + 4, rowY + 6, drawW - 8, trackHeight - 12);
        ctx.clip();
        ctx.fillStyle = "#f8fafc";
        ctx.font = "600 11px system-ui, sans-serif";
        ctx.fillText(clip.name, drawX + 6, rowY + 21);
        ctx.fillStyle = "#cbd5e1";
        ctx.font = "10px ui-monospace, monospace";
        ctx.fillText(`${clip.start_frame}-${clip.start_frame + clip.duration_frames}f`, drawX + 6, rowY + 33);
        ctx.restore();
      }

      hitboxes.push({
        kind: "clip",
        x: drawX,
        y: rowY + 6,
        w: drawW,
        h: trackHeight - 12,
        data: clip
      });
    }

    // Validation issue overlays on this track
    const issues = validation ? validation.issues || [] : [];
    for (const issue of issues) {
      if (issue.track_kind !== trk.kind || issue.track_index !== trk.index) continue;
      const ix = Math.max(timelineX, frameToX(issue.start_frame));
      const iw = Math.max(6, (issue.end_frame - issue.start_frame) * pxPerFrame);
      if (ix > timelineX + timelineW) continue;
      const clampedW = Math.min(iw, timelineX + timelineW - ix);
      ctx.fillStyle = issue.kind === "gap" ? "rgba(245, 158, 11, 0.28)" : "rgba(239, 68, 68, 0.34)";
      ctx.fillRect(ix, rowY + 4, clampedW, trackHeight - 8);
      ctx.strokeStyle = issue.kind === "gap" ? "#f59e0b" : "#ef4444";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ix, rowY + 4, clampedW, trackHeight - 8);
    }
  });

  // Markers along ruler
  const markerPalette = {
    Blue: "#4f6df5",
    Yellow: "#f59e0b",
    Green: "#22c55e",
    Red: "#ef4444",
    Purple: "#a855f7",
    Cyan: "#06b6d4"
  };

  for (const mk of doc.markers || []) {
    const mx = frameToX(mk.frame);
    if (mx < timelineX || mx > timelineX + timelineW) continue;
    const col = markerPalette[mk.color] || "#4f6df5";

    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mx, rulerHeight - 16);
    ctx.lineTo(mx, height - 4);
    ctx.stroke();

    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(mx - 6, rulerHeight - 16);
    ctx.lineTo(mx + 6, rulerHeight - 16);
    ctx.lineTo(mx, rulerHeight - 6);
    ctx.closePath();
    ctx.fill();

    hitboxes.push({
      kind: "marker",
      x: mx - 8,
      y: rulerHeight - 20,
      w: 16,
      h: 22,
      data: mk
    });
  }

  return hitboxes;
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
  { label: "Skin Light", rgb: [0.76, 0.56, 0.48] },
  { label: "Skin Deep", rgb: [0.43, 0.28, 0.21] },
  { label: "Sky Blue", rgb: [0.27, 0.48, 0.72] },
  { label: "Foliage", rgb: [0.26, 0.44, 0.23] },
  { label: "Gold", rgb: [0.85, 0.65, 0.19] },
  { label: "Crimson", rgb: [0.72, 0.18, 0.22] }
];

function toCssRgb(r, g, b) {
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

export function drawColorPreviewCanvas(canvas, cdl, wipeRatio) {
  const { ctx, width, height } = setupCanvas(canvas, 250);
  const wipeX = Math.round(width * clamp01(wipeRatio));

  const drawHalf = (xStart, xEnd, graded) => {
    if (xEnd <= xStart) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(xStart, 0, xEnd - xStart, height);
    ctx.clip();

    // Row 1: SMPTE 75% bars
    const barW = width / SMPTE_BARS.length;
    const row1H = 98;
    SMPTE_BARS.forEach((col, i) => {
      const [r, g, b] = graded ? applyAscCdlRgb(col[0], col[1], col[2], cdl) : col;
      ctx.fillStyle = toCssRgb(r, g, b);
      ctx.fillRect(i * barW, 0, Math.ceil(barW), row1H);
    });

    // Row 2: Skin tone & natural color swatches
    const row2Y = row1H;
    const row2H = 74;
    const swW = width / REFERENCE_SWATCHES.length;
    REFERENCE_SWATCHES.forEach((sw, i) => {
      const [r, g, b] = graded ? applyAscCdlRgb(sw.rgb[0], sw.rgb[1], sw.rgb[2], cdl) : sw.rgb;
      ctx.fillStyle = toCssRgb(r, g, b);
      ctx.fillRect(i * swW, row2Y, Math.ceil(swW), row2H);
      ctx.fillStyle = "rgba(10, 14, 26, 0.72)";
      ctx.fillRect(i * swW + 4, row2Y + row2H - 20, Math.max(10, swW - 8), 16);
      ctx.fillStyle = "#f0f0f5";
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillText(sw.label, i * swW + 8, row2Y + row2H - 8);
    });

    // Row 3: 32-step tonal luminance ramp
    const row3Y = row1H + row2H;
    const row3H = 44;
    const steps = 32;
    const stepW = width / steps;
    for (let i = 0; i < steps; i++) {
      const v = i / (steps - 1);
      const [r, g, b] = graded ? applyAscCdlRgb(v, v, v, cdl) : [v, v, v];
      ctx.fillStyle = toCssRgb(r, g, b);
      ctx.fillRect(i * stepW, row3Y, Math.ceil(stepW), row3H);
    }

    // Row 4: Continuous hue spectrum strip
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
      const [r, g, b] = graded ? applyAscCdlRgb(rgb[0], rgb[1], rgb[2], cdl) : rgb;
      ctx.fillStyle = toCssRgb(r, g, b);
      ctx.fillRect(i * hStepW, row4Y, Math.ceil(hStepW), row4H);
    }

    ctx.restore();
  };

  drawHalf(0, wipeX, false);
  drawHalf(wipeX, width, true);

  // Split wipe line & labels
  ctx.strokeStyle = "#f0f0f5";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(wipeX, 0);
  ctx.lineTo(wipeX, height);
  ctx.stroke();

  ctx.fillStyle = "rgba(10, 14, 26, 0.82)";
  roundRectPath(ctx, 10, 10, 82, 22, 5);
  ctx.fill();
  ctx.fillStyle = "#f0f0f5";
  ctx.font = "700 10px ui-monospace, monospace";
  ctx.fillText("ORIGINAL", 18, 25);

  ctx.fillStyle = "rgba(79, 109, 245, 0.88)";
  roundRectPath(ctx, width - 98, 10, 88, 22, 5);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText("CDL GRADED", width - 90, 25);
}

export function drawColorScopeCanvas(canvas, cdl) {
  const { ctx, width, height } = setupCanvas(canvas, 210);
  ctx.fillStyle = "#0e1424";
  ctx.fillRect(0, 0, width, height);

  const split = width >= 460;
  const curveBoxW = split ? Math.floor(width * 0.54) : width;
  const pad = 18;
  const plotW = curveBoxW - pad * 2;
  const plotH = height - pad * 2;

  // Grid
  ctx.strokeStyle = "#1e2640";
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

  // Identity dashed line
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "#475569";
  ctx.beginPath();
  ctx.moveTo(pad, pad + plotH);
  ctx.lineTo(pad + plotW, pad);
  ctx.stroke();
  ctx.restore();

  // R, G, B 1D response curves
  const channels = [
    { idx: 0, color: "#f87171" },
    { idx: 1, color: "#4ade80" },
    { idx: 2, color: "#60a5fa" }
  ];
  const samples = 48;
  for (const ch of channels) {
    ctx.strokeStyle = ch.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const xNorm = i / samples;
      const inRgb = [xNorm, xNorm, xNorm];
      const outRgb = applyAscCdlRgb(inRgb[0], inRgb[1], inRgb[2], cdl);
      const px = pad + xNorm * plotW;
      const py = pad + (1 - outRgb[ch.idx]) * plotH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText("RGB LUT CURVE", pad + 6, pad + 14);

  if (!split) return;

  // Right half: Rec.709 color vectorscope targets
  const cx = curveBoxW + Math.floor((width - curveBoxW) / 2);
  const cy = Math.floor(height / 2);
  const radius = Math.min((width - curveBoxW) / 2 - 18, height / 2 - 18);

  ctx.strokeStyle = "#1e2640";
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
    { name: "R", rgb: [0.75, 0.0, 0.0], col: "#f87171" },
    { name: "Y", rgb: [0.75, 0.75, 0.0], col: "#facc15" },
    { name: "G", rgb: [0.0, 0.75, 0.0], col: "#4ade80" },
    { name: "C", rgb: [0.0, 0.75, 0.75], col: "#22d3ee" },
    { name: "B", rgb: [0.0, 0.0, 0.75], col: "#60a5fa" },
    { name: "M", rgb: [0.75, 0.0, 0.75], col: "#e879f9" }
  ];

  const rgbToVec = (r, g, b) => {
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const pb = (b - y) / 1.8556;
    const pr = (r - y) / 1.5748;
    return [pb * 2.0, -pr * 2.0];
  };

  for (const v of vectors) {
    const [ox, oy] = rgbToVec(v.rgb[0], v.rgb[1], v.rgb[2]);
    const graded = applyAscCdlRgb(v.rgb[0], v.rgb[1], v.rgb[2], cdl);
    const [gx, gy] = rgbToVec(graded[0], graded[1], graded[2]);

    const px0 = cx + ox * radius;
    const py0 = cy + oy * radius;
    const px1 = cx + gx * radius;
    const py1 = cy + gy * radius;

    ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(px0 - 4, py0 - 4, 8, 8);

    ctx.strokeStyle = v.col;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px0, py0);
    ctx.lineTo(px1, py1);
    ctx.stroke();

    ctx.fillStyle = v.col;
    ctx.beginPath();
    ctx.arc(px1, py1, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText("VECTORSCOPE", curveBoxW + 10, 20);
}

export function drawLoudnessCanvas(canvas, loudness) {
  const { ctx, width, height } = setupCanvas(canvas, 110);
  ctx.fillStyle = "#0e1424";
  ctx.fillRect(0, 0, width, height);

  if (!loudness) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px ui-monospace, monospace";
    ctx.fillText("No audio loudness data.", 14, 58);
    return;
  }

  const padX = 16;
  const barW = width - padX * 2;
  const minLufs = -36;
  const maxLufs = 0;
  const toX = (val) => padX + clamp01((val - minLufs) / (maxLufs - minLufs)) * barW;

  // Target tolerance band
  const bandStart = toX(loudness.target_lufs - loudness.tolerance_lu);
  const bandEnd = toX(loudness.target_lufs + loudness.tolerance_lu);
  ctx.fillStyle = "rgba(34, 197, 94, 0.18)";
  ctx.fillRect(bandStart, 22, Math.max(4, bandEnd - bandStart), 26);
  ctx.strokeStyle = "#22c55e";
  ctx.strokeRect(bandStart, 22, Math.max(4, bandEnd - bandStart), 26);

  // Track background
  ctx.strokeStyle = "#273152";
  ctx.strokeRect(padX, 26, barW, 18);

  // Measured LUFS bar
  const measX = toX(loudness.integrated_lufs);
  ctx.fillStyle = loudness.passed ? "#4f6df5" : "#ef4444";
  ctx.fillRect(padX + 1, 27, Math.max(2, measX - padX), 16);

  // Target line
  const tgtX = toX(loudness.target_lufs);
  ctx.strokeStyle = "#f0f0f5";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tgtX, 18);
  ctx.lineTo(tgtX, 52);
  ctx.stroke();

  ctx.fillStyle = "#f0f0f5";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText(`I: ${loudness.integrated_lufs.toFixed(1)} LUFS`, padX, 74);
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`Target: ${loudness.target_lufs.toFixed(1)} +/- ${loudness.tolerance_lu.toFixed(1)}`, padX, 94);
  ctx.fillStyle = loudness.true_peak_dbtp <= loudness.max_true_peak_dbtp ? "#22c55e" : "#ef4444";
  ctx.fillText(`TP: ${loudness.true_peak_dbtp.toFixed(2)} dBTP`, Math.max(padX + 150, width - 135), 74);
}

export function drawFramesCanvas(canvas, samples) {
  const { ctx, width, height } = setupCanvas(canvas, 110);
  ctx.fillStyle = "#0e1424";
  ctx.fillRect(0, 0, width, height);

  if (!samples || samples.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px ui-monospace, monospace";
    ctx.fillText("No frame samples.", 14, 58);
    return;
  }

  const padX = 16;
  const barW = width - padX * 2;
  const rowH = Math.floor((height - 20) / samples.length);

  samples.forEach((s, idx) => {
    const y = 12 + idx * rowH;
    const minX = padX + (s.y_min / 255) * barW;
    const maxX = padX + (s.y_max / 255) * barW;
    const avgX = padX + (s.y_avg / 255) * barW;

    ctx.fillStyle = "#121829";
    ctx.fillRect(padX, y + 6, barW, 12);
    ctx.fillStyle = "rgba(79, 109, 245, 0.55)";
    ctx.fillRect(minX, y + 6, Math.max(4, maxX - minX), 12);
    ctx.fillStyle = "#f0f0f5";
    ctx.fillRect(avgX - 1, y + 4, 2, 16);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillText(`${s.timestamp_s}s  Y:${s.y_min}..${s.y_avg.toFixed(1)}..${s.y_max}`, padX, y + 5);
  });
}
