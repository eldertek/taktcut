const U_R = { x: 0, y: -1 };
const U_G = { x: -0.8660254, y: 0.5 };
const U_B = { x: 0.8660254, y: 0.5 };

const WHEEL_CONFIGS = {
  lift: { scale: 0.45, invertPower: false, minVal: -1.0, maxVal: 1.0, masterMin: -1.0, masterMax: 1.0 },
  gamma: { scale: 0.45, invertPower: false, minVal: -1.0, maxVal: 1.0, masterMin: -1.0, masterMax: 1.0 },
  gain: { scale: 0.45, invertPower: false, minVal: -1.0, maxVal: 1.0, masterMin: -1.0, masterMax: 1.0 },
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
  const outerR = size / 2 - 6;
  const ringR = outerR - 4;
  const innerR = outerR - 10;

  ctx.clearRect(0, 0, size, size);

  // Outer recessed DaVinci trackball housing
  ctx.fillStyle = "#111114";
  ctx.beginPath();
  ctx.arc(cx, cy, outerR + 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#2c2c33";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR + 2, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle precision hue ring matching (U_R, U_G, U_B) vector angles
  const segs = 96;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1.25) / segs) * Math.PI * 2;
    const am = (a0 + a1) * 0.5;
    const ux = Math.cos(am);
    const uy = Math.sin(am);
    const r = Math.round(clamp(0.5 + 0.46 * (ux * U_R.x + uy * U_R.y), 0, 1) * 215);
    const g = Math.round(clamp(0.5 + 0.46 * (ux * U_G.x + uy * U_G.y), 0, 1) * 215);
    const b = Math.round(clamp(0.5 + 0.46 * (ux * U_B.x + uy * U_B.y), 0, 1) * 215);

    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.82)`;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, a0, a1);
    ctx.stroke();
  }

  // Deep matte trackball well
  const wellGrad = ctx.createRadialGradient(cx, cy - innerR * 0.25, 4, cx, cy, innerR);
  wellGrad.addColorStop(0, "#1d1d22");
  wellGrad.addColorStop(1, "#121216");
  ctx.fillStyle = wellGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#2b2b32";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.stroke();

  // DaVinci precision crosshair & 50% saturation reticle
  ctx.strokeStyle = "#26262c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR * 0.48, 0, Math.PI * 2);
  ctx.moveTo(cx - innerR + 3, cy);
  ctx.lineTo(cx + innerR - 3, cy);
  ctx.moveTo(cx, cy - innerR + 3);
  ctx.lineTo(cx, cy + innerR - 3);
  ctx.stroke();

  // Center neutral ring
  ctx.strokeStyle = "#52525e";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
  ctx.stroke();

  // Current puck position
  const { nx, ny } = wheelRgbToNorm(group, rgb);
  const px = cx + nx * (innerR - 6);
  const py = cy + ny * (innerR - 6);
  const moved = Math.hypot(nx, ny) > 0.008;

  if (moved) {
    ctx.strokeStyle = "rgba(230, 75, 56, 0.72)";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();
  }

  ctx.fillStyle = moved ? "#ffffff" : "#dcdce4";
  ctx.strokeStyle = moved ? "#e64b38" : "#111114";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(px, py, 4.5, 0, Math.PI * 2);
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
    const isZeroNeutral =
      group === "offset" || group === "lift" || group === "gamma" || group === "gain";
    const def = isZeroNeutral ? [0, 0, 0] : [1, 1, 1];
    onChange(def);
  });
}
