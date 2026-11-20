const U_R = { x: 0, y: -1 };
const U_G = { x: -0.8660254, y: 0.5 };
const U_B = { x: 0.8660254, y: 0.5 };

const WHEEL_CONFIGS = {
  offset: { scale: 0.18, invertPower: false, minVal: -0.4, maxVal: 0.4, masterMin: -0.25, masterMax: 0.25 },
  power: { scale: 0.45, invertPower: true, minVal: 0.2, maxVal: 2.5, masterMin: 0.4, masterMax: 1.8 },
  slope: { scale: 0.55, invertPower: false, minVal: 0.2, maxVal: 2.5, masterMin: 0.4, masterMax: 1.8 }
};

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function wheelRgbToNorm(group, rgb) {
  const cfg = WHEEL_CONFIGS[group];
  const mean = (rgb[0] + rgb[1] + rgb[2]) / 3;
  const sign = cfg.invertPower ? -1 : 1;
  const dR = sign * (rgb[0] - mean);
  const dG = sign * (rgb[1] - mean);
  const dB = sign * (rgb[2] - mean);

  const nx = ((2 / 3) * (dR * U_R.x + dG * U_G.x + dB * U_B.x)) / cfg.scale;
  const ny = ((2 / 3) * (dR * U_R.y + dG * U_G.y + dB * U_B.y)) / cfg.scale;
  const mag = Math.hypot(nx, ny);
  if (mag > 1) {
    return { nx: nx / mag, ny: ny / mag, mean };
  }
  return { nx, ny, mean };
}

export function normToWheelRgb(group, nx, ny, mean) {
  const cfg = WHEEL_CONFIGS[group];
  const mag = Math.hypot(nx, ny);
  const cx = mag > 1 ? nx / mag : nx;
  const cy = mag > 1 ? ny / mag : ny;
  const sign = cfg.invertPower ? -1 : 1;

  const dR = (cx * U_R.x + cy * U_R.y) * cfg.scale * sign;
  const dG = (cx * U_G.x + cy * U_G.y) * cfg.scale * sign;
  const dB = (cx * U_B.x + cy * U_B.y) * cfg.scale * sign;

  return [
    clamp(mean + dR, cfg.minVal, cfg.maxVal),
    clamp(mean + dG, cfg.minVal, cfg.maxVal),
    clamp(mean + dB, cfg.minVal, cfg.maxVal)
  ];
}

export function drawColorWheel(canvas, group, rgb) {
  const size = 148;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 8;
  const innerR = outerR - 8;

  ctx.clearRect(0, 0, size, size);

  // Hue spectrum ring matching (U_R, U_G, U_B) frame
  const segs = 72;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1.2) / segs) * Math.PI * 2;
    const am = (a0 + a1) * 0.5;
    const ux = Math.cos(am);
    const uy = Math.sin(am);
    const r = Math.round(clamp(0.55 + 0.45 * (ux * U_R.x + uy * U_R.y), 0, 1) * 235);
    const g = Math.round(clamp(0.55 + 0.45 * (ux * U_G.x + uy * U_G.y), 0, 1) * 235);
    const b = Math.round(clamp(0.55 + 0.45 * (ux * U_B.x + uy * U_B.y), 0, 1) * 235);

    ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR - 2, a0, a1);
    ctx.stroke();
  }

  // Dark inner well
  ctx.fillStyle = "#17171a";
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#2f2f36";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle radial crosshair & 50% guide
  ctx.strokeStyle = "#27272d";
  ctx.beginPath();
  ctx.arc(cx, cy, innerR * 0.5, 0, Math.PI * 2);
  ctx.moveTo(cx - innerR, cy);
  ctx.lineTo(cx + innerR, cy);
  ctx.moveTo(cx, cy - innerR);
  ctx.lineTo(cx, cy + innerR);
  ctx.stroke();

  // Center neutral pip
  ctx.fillStyle = "#484852";
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();

  // Current puck position
  const { nx, ny } = wheelRgbToNorm(group, rgb);
  const px = cx + nx * (innerR - 6);
  const py = cy + ny * (innerR - 6);

  ctx.strokeStyle = "rgba(224, 123, 57, 0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(px, py);
  ctx.stroke();

  ctx.fillStyle = "#d8d8de";
  ctx.strokeStyle = "#e07b39";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

export function bindColorWheelEvents(canvas, group, getRgb, onChange) {
  let dragging = false;

  const updateFromPointer = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const usableR = Math.max(20, rect.width / 2 - 14);
    const nx = (ev.clientX - rect.left - cx) / usableR;
    const ny = (ev.clientY - rect.top - cy) / usableR;
    const cur = getRgb();
    const mean = (cur[0] + cur[1] + cur[2]) / 3;
    const next = normToWheelRgb(group, nx, ny, mean);
    onChange(next);
  };

  canvas.addEventListener("pointerdown", (ev) => {
    dragging = true;
    canvas.setPointerCapture(ev.pointerId);
    updateFromPointer(ev);
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (dragging) updateFromPointer(ev);
  });
  canvas.addEventListener("pointerup", (ev) => {
    if (dragging) {
      dragging = false;
      canvas.releasePointerCapture(ev.pointerId);
    }
  });
  canvas.addEventListener("dblclick", () => {
    const def = group === "offset" ? [0, 0, 0] : [1, 1, 1];
    onChange(def);
  });
}
