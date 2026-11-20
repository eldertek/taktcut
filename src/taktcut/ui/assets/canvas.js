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

export function drawProgramMonitorCanvas(canvas, doc, playheadFrame, cdl) {
  const { ctx, width, height } = setupCanvas(canvas, 210);
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

  // Simulated Rec.709 editorial frame backdrop with CDL applied
  const grad = ctx.createLinearGradient(fx, fy, fx + frameW, fy + frameH);
  const c0 = applyAscCdlRgb(0.14, 0.18, 0.24, cdl);
  const c1 = applyAscCdlRgb(0.24, 0.26, 0.30, cdl);
  const c2 = applyAscCdlRgb(0.10, 0.11, 0.14, cdl);
  grad.addColorStop(0, toCssRgb(c0[0], c0[1], c0[2]));
  grad.addColorStop(0.55, toCssRgb(c1[0], c1[1], c1[2]));
  grad.addColorStop(1, toCssRgb(c2[0], c2[1], c2[2]));
  ctx.fillStyle = grad;
  ctx.fillRect(fx, fy, frameW, frameH);

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
  const cw = frameW / chipCols.length;
  chipCols.forEach((col, i) => {
    const [r, g, b] = applyAscCdlRgb(col[0], col[1], col[2], cdl);
    ctx.fillStyle = toCssRgb(r, g, b);
    ctx.fillRect(fx + i * cw, fy, Math.ceil(cw), 12);
  });

  // Action/Title Safe Reticle
  ctx.strokeStyle = "rgba(216, 216, 222, 0.22)";
  ctx.lineWidth = 1;
  ctx.strokeRect(fx + frameW * 0.05, fy + frameH * 0.05, frameW * 0.9, frameH * 0.9);
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(fx + frameW * 0.1, fy + frameH * 0.1, frameW * 0.8, frameH * 0.8);
  ctx.setLineDash([]);

  // Center crosshair
  const cx = fx + frameW / 2;
  const cy = fy + frameH / 2;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy);
  ctx.lineTo(cx + 8, cy);
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx, cy + 8);
  ctx.stroke();

  // Active clip slate info
  ctx.fillStyle = "rgba(20, 20, 22, 0.76)";
  ctx.fillRect(fx + 14, fy + frameH - 48, Math.max(120, frameW - 28), 34);
  ctx.strokeStyle = "#34343a";
  ctx.strokeRect(fx + 14, fy + frameH - 48, Math.max(120, frameW - 28), 34);

  if (activeClips.length > 0) {
    const top = activeClips[activeClips.length - 1];
    const relOffset = playheadFrame - top.clip.start_frame + (top.clip.source_in_frame || 0);
    ctx.fillStyle = "#d8d8de";
    ctx.font = "600 11px ui-monospace, monospace";
    ctx.fillText(`${top.track}: ${top.clip.name}`, fx + 22, fy + frameH - 31);
    ctx.fillStyle = "#8e8e98";
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillText(
      `SRC+${relOffset}f | ${doc.width}x${doc.height} | ${activeClips.length} active layer(s)`,
      fx + 22,
      fy + frameH - 18
    );
  } else {
    ctx.fillStyle = "#8e8e98";
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillText("BLACK / NO VIDEO AT PLAYHEAD", fx + 22, fy + frameH - 27);
  }

  // Frame border
  ctx.strokeStyle = "#2c2c31";
  ctx.lineWidth = 1;
  ctx.strokeRect(fx, fy, frameW, frameH);
}

export function drawTimelineCanvas(canvas, doc, validation, opts) {
  const tracks = doc ? doc.tracks || [] : [];
  const rowCount = Math.max(1, tracks.length);
  const rulerHeight = 32;
  const trackHeight = 38;
  const padBottom = 10;
  const totalHeight = rulerHeight + rowCount * trackHeight + padBottom;

  const { ctx, width, height } = setupCanvas(canvas, totalHeight);
  const hitboxes = [];

  ctx.fillStyle = "#1a1a1d";
  ctx.fillRect(0, 0, width, height);

  if (!doc) {
    ctx.fillStyle = "#8e8e98";
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillText("No timeline loaded.", 14, 24);
    return { hitboxes, frameToX: null, xToFrame: null };
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
  const startFrame = doc.start_frame || 0;
  const spanFrames = Math.max(25, maxFrame - startFrame);
  const visibleSpan = spanFrames / zoom;
  const pxPerFrame = timelineW / visibleSpan;

  const frameToX = (f) => timelineX + (f - startFrame) * pxPerFrame;
  const xToFrame = (x) =>
    Math.max(startFrame, Math.min(maxFrame, Math.round(startFrame + (x - timelineX) / pxPerFrame)));

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
  ctx.fillText("TRACKS", 10, 20);

  // Ruler ticks clipped to track area
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
    ctx.moveTo(x, rulerHeight - 8);
    ctx.lineTo(x, rulerHeight);
    ctx.stroke();

    ctx.fillStyle = "#8e8e98";
    const label = width < 520 ? `${f}f` : `${framesToSmpte(f, doc.fps.num, doc.fps.den)} (${f}f)`;
    if (x + ctx.measureText(label).width + 6 <= timelineX + timelineW) {
      ctx.fillText(label, x + 4, 15);
    }
  }
  ctx.restore();

  // Track lanes and clips
  const selected = opts ? opts.selected : null;
  tracks.forEach((trk, idx) => {
    const rowY = rulerHeight + idx * trackHeight;
    const isAudio = trk.kind === "audio";

    // Track label rail
    ctx.fillStyle = "#252529";
    ctx.fillRect(0, rowY, labelColW, trackHeight);

    // Track timeline surface
    ctx.fillStyle = idx % 2 === 0 ? "#1b1b1f" : "#1e1e22";
    ctx.fillRect(timelineX, rowY, width - timelineX, trackHeight);
    ctx.strokeStyle = "#111114";
    ctx.beginPath();
    ctx.moveTo(0, rowY + trackHeight);
    ctx.lineTo(width, rowY + trackHeight);
    ctx.stroke();

    // Track tag
    ctx.fillStyle = isAudio ? "#255c4e" : "#2c4e7c";
    roundRectPath(ctx, 8, rowY + 9, 24, 19, 2);
    ctx.fill();
    ctx.strokeStyle = isAudio ? "#3d8c78" : "#4c74ab";
    ctx.stroke();

    ctx.fillStyle = "#d8d8de";
    ctx.font = "700 10px ui-monospace, monospace";
    const shortCode = `${isAudio ? "A" : "V"}${trk.index}`;
    ctx.fillText(shortCode, 13, rowY + 22);

    if (width >= 480) {
      ctx.fillStyle = "#b4b4be";
      ctx.font = "500 11px system-ui, sans-serif";
      const tName = (trk.name || shortCode).slice(0, 11);
      ctx.fillText(tName, 38, rowY + 22);
    }

    // Clips
    for (const clip of trk.clips || []) {
      const cx = frameToX(clip.start_frame);
      const cw = Math.max(5, clip.duration_frames * pxPerFrame);
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
        ? clip.enabled ? "#214f44" : "#252529"
        : clip.enabled ? "#294670" : "#252529";
      const borderCol = isSelected
        ? "#e07b39"
        : isAudio ? "#3d8c78" : "#4e78b0";

      ctx.fillStyle = baseFill;
      roundRectPath(ctx, drawX, rowY + 4, drawW, trackHeight - 8, 2);
      ctx.fill();

      ctx.strokeStyle = borderCol;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      if (drawW > 34) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(drawX + 4, rowY + 4, drawW - 8, trackHeight - 8);
        ctx.clip();
        ctx.fillStyle = "#e6e6eb";
        ctx.font = "600 11px system-ui, sans-serif";
        ctx.fillText(clip.name, drawX + 6, rowY + 17);
        ctx.fillStyle = "#a2a2ad";
        ctx.font = "10px ui-monospace, monospace";
        ctx.fillText(`${clip.start_frame}-${clip.start_frame + clip.duration_frames}f`, drawX + 6, rowY + 29);
        ctx.restore();
      }

      hitboxes.push({
        kind: "clip",
        x: drawX,
        y: rowY + 4,
        w: drawW,
        h: trackHeight - 8,
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

  // DaVinci Playhead Needle
  const playheadFrame = opts && typeof opts.playheadFrame === "number" ? opts.playheadFrame : startFrame;
  const phX = frameToX(playheadFrame);
  if (phX >= timelineX && phX <= timelineX + timelineW) {
    ctx.strokeStyle = "#e07b39";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(phX, 12);
    ctx.lineTo(phX, height);
    ctx.stroke();

    ctx.fillStyle = "#e07b39";
    ctx.beginPath();
    ctx.moveTo(phX - 6, 4);
    ctx.lineTo(phX + 6, 4);
    ctx.lineTo(phX + 6, 11);
    ctx.lineTo(phX, 17);
    ctx.lineTo(phX - 6, 11);
    ctx.closePath();
    ctx.fill();
  }

  return { hitboxes, frameToX, xToFrame };
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
      const [r, g, b] = graded ? applyAscCdlRgb(col[0], col[1], col[2], cdl) : col;
      ctx.fillStyle = toCssRgb(r, g, b);
      ctx.fillRect(i * barW, 0, Math.ceil(barW), row1H);
    });

    const row2Y = row1H;
    const row2H = 66;
    const swW = width / REFERENCE_SWATCHES.length;
    REFERENCE_SWATCHES.forEach((sw, i) => {
      const [r, g, b] = graded ? applyAscCdlRgb(sw.rgb[0], sw.rgb[1], sw.rgb[2], cdl) : sw.rgb;
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
      const [r, g, b] = graded ? applyAscCdlRgb(v, v, v, cdl) : [v, v, v];
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
      const [r, g, b] = graded ? applyAscCdlRgb(rgb[0], rgb[1], rgb[2], cdl) : rgb;
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
  ctx.fillRect(width - 84, 8, 76, 18);
  ctx.fillStyle = "#111114";
  ctx.fillText("CDL GRADE", width - 78, 20);
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
      const outRgb = applyAscCdlRgb(xNorm, xNorm, xNorm, cdl);
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
    const graded = applyAscCdlRgb(v.rgb[0], v.rgb[1], v.rgb[2], cdl);
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
