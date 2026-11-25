// DaVinci Resolve 21 Clean-Room Real-Time Effects, Transitions, Titles, Generators,
// Live Hover Preview (UiEffectLivePreviewManager / UiTitleLivePreviewManager),
// and Timeline Drag & Drop Overlay Renderer (UiEditTimelineWidgetImp).

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function hexToRgb(hex) {
  const raw = String(hex || "#204a6e").replace("#", "").trim();
  if (raw.length === 3) {
    return [
      Number.parseInt(raw[0] + raw[0], 16) || 0,
      Number.parseInt(raw[1] + raw[1], 16) || 0,
      Number.parseInt(raw[2] + raw[2], 16) || 0
    ];
  }
  const num = Number.parseInt(raw.slice(0, 6), 16);
  if (!Number.isFinite(num)) return [32, 74, 110];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

// ============================================================================
// 1. RESOLVE GENERATORS & FUSION GENERATORS
// ============================================================================
export function renderResolveGenerator(ctx, w, h, genStyle, progress = 0.5, params = {}) {
  const style = String(genStyle || "solid").toLowerCase();
  const u = clamp01(progress);
  ctx.save();

  if (style === "smpte" || style === "ebu_bar" || style === "bt2111") {
    const topColors = style === "ebu_bar"
      ? ["#ebebeb", "#ebeb10", "#10ebeb", "#10eb10", "#eb10eb", "#eb1010", "#1010eb", "#101010"]
      : ["#c0c0c0", "#c0c000", "#00c0c0", "#00c000", "#c000c0", "#c00000", "#0000c0"];
    const topH = style === "ebu_bar" ? h : Math.round(h * 0.67);
    const barW = w / topColors.length;
    topColors.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(Math.floor(i * barW), 0, Math.ceil(barW) + 1, topH);
    });
    if (style !== "ebu_bar") {
      const midY = topH;
      const midH = Math.round(h * 0.08);
      const midCols = ["#0000c0", "#131313", "#c000c0", "#131313", "#00c0c0", "#131313", "#c0c0c0"];
      midCols.forEach((col, i) => {
        ctx.fillStyle = col;
        ctx.fillRect(Math.floor(i * barW), midY, Math.ceil(barW) + 1, midH);
      });
      const botY = midY + midH;
      const botH = h - botY;
      const botSegs = [
        [0, 0.18, "#00214c"],
        [0.18, 0.36, "#ffffff"],
        [0.36, 0.54, "#32006a"],
        [0.54, 0.72, "#131313"],
        [0.72, 0.78, "#090909"],
        [0.78, 0.84, "#131313"],
        [0.84, 0.90, "#1f1f1f"],
        [0.90, 1.0, "#131313"]
      ];
      for (const [a, b, col] of botSegs) {
        ctx.fillStyle = col;
        ctx.fillRect(Math.floor(a * w), botY, Math.ceil((b - a) * w) + 1, botH);
      }
    }
  } else if (style === "10_step") {
    for (let i = 0; i < 10; i++) {
      const v = Math.round((i / 9) * 255);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(Math.floor((i * w) / 10), 0, Math.ceil(w / 10) + 1, h);
    }
  } else if (style === "grey_scale") {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, "#000000");
    g.addColorStop(1, "#ffffff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (style === "four_color") {
    const phase = u * Math.PI * 2;
    const g1 = ctx.createLinearGradient(0, 0, w, h);
    g1.addColorStop(0, params.color || "#1c3f6e");
    g1.addColorStop(0.5, `hsl(${(210 + Math.sin(phase) * 40).toFixed(0)}, 64%, 40%)`);
    g1.addColorStop(1, params.color2 || "#8a2c52");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);
    const g2 = ctx.createRadialGradient(w * (0.25 + u * 0.5), h * 0.35, 10, w * 0.5, h * 0.5, w * 0.72);
    g2.addColorStop(0, "rgba(240, 168, 72, 0.55)");
    g2.addColorStop(1, "rgba(240, 168, 72, 0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
  } else if (style === "window") {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    const padX = w * (0.16 - u * 0.04);
    const padY = h * (0.18 - u * 0.04);
    ctx.fillStyle = params.color || "#ffffff";
    ctx.fillRect(padX, padY, w - padX * 2, h - padY * 2);
  } else if (style === "checkerboard") {
    const cell = Math.max(12, Math.round(w / 18));
    for (let y = 0; y < h; y += cell) {
      for (let x = 0; x < w; x += cell) {
        const dark = ((Math.floor(x / cell) + Math.floor(y / cell)) & 1) === 0;
        ctx.fillStyle = dark ? "#1f2026" : "#d8d8e0";
        ctx.fillRect(x, y, cell, cell);
      }
    }
  } else if (style === "grid") {
    ctx.fillStyle = "#101218";
    ctx.fillRect(0, 0, w, h);
    const step = Math.max(16, Math.round(w / 16));
    ctx.strokeStyle = params.color || "rgba(57, 197, 207, 0.45)";
    ctx.lineWidth = 1;
    for (let x = (u * step) % step; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  } else if (style === "starfield") {
    ctx.fillStyle = "#060811";
    ctx.fillRect(0, 0, w, h);
    let rng = 133742;
    const rand = () => {
      rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
      return rng / 4294967296;
    };
    const cx = w * 0.5;
    const cy = h * 0.5;
    for (let i = 0; i < 160; i++) {
      const ang = rand() * Math.PI * 2;
      const dist = ((rand() + u * 0.65) % 1.0);
      const px = cx + Math.cos(ang) * dist * w * 0.62;
      const py = cy + Math.sin(ang) * dist * h * 0.62;
      const sz = 0.8 + dist * 2.2;
      ctx.fillStyle = `rgba(235, 244, 255, ${(0.25 + dist * 0.75).toFixed(2)})`;
      ctx.fillRect(px, py, sz, sz);
    }
  } else if (style === "abstract_mesh" || style === "contours" || style === "grad_lines" || style === "hex_glow" || style === "dreamy" || style === "noise_grad" || style === "fast_noise" || style === "vintage") {
    const [r, g, b] = hexToRgb(params.color || "#2d4f7c");
    const bg = ctx.createLinearGradient(0, 0, w, h);
    if (style === "vintage") {
      bg.addColorStop(0, "#4a3826");
      bg.addColorStop(1, "#1e160f");
    } else if (style === "fast_noise") {
      bg.addColorStop(0, "#14161c");
      bg.addColorStop(1, "#2a2e3a");
    } else {
      bg.addColorStop(0, `rgb(${Math.round(r * 0.35)},${Math.round(g * 0.35)},${Math.round(b * 0.45)})`);
      bg.addColorStop(1, `rgb(${Math.min(255, r + 40)},${Math.min(255, g + 20)},${Math.min(255, b + 55)})`);
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    if (style === "contours" || style === "grad_lines" || style === "abstract_mesh") {
      ctx.strokeStyle = style === "grad_lines" ? "rgba(230, 75, 61, 0.6)" : "rgba(130, 215, 245, 0.45)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        const baseY = (i / 13) * h;
        for (let x = 0; x <= w; x += Math.max(8, Math.round(w / 32))) {
          const wave = Math.sin((x / w) * Math.PI * 3 + u * Math.PI * 2 + i * 0.55) * (h * 0.08);
          if (x === 0) ctx.moveTo(x, baseY + wave);
          else ctx.lineTo(x, baseY + wave);
        }
        ctx.stroke();
      }
    } else if (style === "hex_glow" || style === "dreamy") {
      for (let i = 0; i < 9; i++) {
        const bx = w * (0.12 + ((i * 0.23 + u * 0.3) % 0.8));
        const by = h * (0.2 + ((i * 0.31) % 0.65));
        const rad = Math.max(18, Math.min(w, h) * (0.1 + (i % 3) * 0.06));
        const rg = ctx.createRadialGradient(bx, by, 2, bx, by, rad);
        rg.addColorStop(0, style === "hex_glow" ? "rgba(96, 178, 255, 0.52)" : "rgba(255, 175, 118, 0.48)");
        rg.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(bx, by, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // fast_noise / noise_grad / vintage grain texture
      let rng = ((Math.round(u * 60) + 11) * 2654435761) >>> 0;
      const rand = () => {
        rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
        return rng / 4294967296;
      };
      for (let i = 0; i < 360; i++) {
        const px = rand() * w;
        const py = rand() * h;
        const sz = style === "fast_noise" ? 4 + rand() * 8 : 2 + rand() * 3;
        ctx.fillStyle = rand() > 0.5 ? "rgba(255,248,235,0.16)" : "rgba(0,0,0,0.2)";
        ctx.fillRect(px, py, sz, sz);
      }
    }
  } else {
    // Solid Color / Color Generator
    ctx.fillStyle = params.color || "#1e3a5f";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

// ============================================================================
// 2. RESOLVE TITLES, FUSION TITLES & SUBTITLES (ANIMATED BY PROGRESS 0..1)
// ============================================================================
export function renderResolveTitle(ctx, w, h, titleStyle, progress = 0.5, props = {}) {
  const style = String(titleStyle || "text").toLowerCase();
  const u = clamp01(progress);
  const ease = u < 0.2 ? (u / 0.2) * (2 - u / 0.2) : u > 0.85 ? Math.max(0, (1 - u) / 0.15) : 1;
  const text = String(props.text || props.defaultText || "CUSTOM TITLE");
  const sub = String(props.subtitle || props.defaultSub || "");
  const fontScale = Number(props.font_size || 46) / 46;
  const color = props.color || "#ffffff";
  const accent = props.accent || "#e64b3d";

  ctx.save();
  ctx.textBaseline = "middle";

  if (style.startsWith("sub_")) {
    const capSize = Math.max(12, Math.round(h * 0.056 * fontScale));
    ctx.font = `600 ${capSize}px 'Open Sans', 'Segoe UI', sans-serif`;
    ctx.textAlign = "center";
    const lines = text.split("\n");
    const line = lines[0] || text;
    const tw = ctx.measureText(line).width + 24;
    const bx = (w - tw) * 0.5;
    const by = h * 0.84;
    const bh = capSize + 12;
    if (style === "sub_black" || style === "sub_blue" || style === "sub_red") {
      ctx.fillStyle = style === "sub_blue" ? "rgba(37, 85, 114, 0.9)" : style === "sub_red" ? "rgba(205, 56, 44, 0.9)" : "rgba(10, 10, 12, 0.86)";
      if (style === "sub_blue" || style === "sub_red") {
        ctx.beginPath();
        ctx.moveTo(bx + 8, by - bh * 0.5);
        ctx.lineTo(bx + tw, by - bh * 0.5);
        ctx.lineTo(bx + tw - 8, by + bh * 0.5);
        ctx.lineTo(bx, by + bh * 0.5);
        ctx.closePath();
        ctx.fill();
      } else {
        roundRect(ctx, bx, by - bh * 0.5, tw, bh, 3);
        ctx.fill();
      }
    }
    ctx.fillStyle = style === "sub_yellow" ? "#ffd84d" : "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = 4;
    ctx.fillText(line, w * 0.5, by);
    ctx.restore();
    return;
  }

  if (style === "scroll") {
    const sz = Math.max(13, Math.round(h * 0.062 * fontScale));
    ctx.font = `600 ${sz}px 'Open Sans', 'Segoe UI', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = color;
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 6;
    const lines = text.split("\n");
    const baseY = h * (0.92 - u * 0.72);
    lines.forEach((ln, idx) => {
      ctx.fillText(ln, w * 0.5, baseY + idx * (sz + 10));
    });
    ctx.restore();
    return;
  }

  if (style.includes("l3") || style === "bg_reveal_l3" || style === "clean_l3" || style === "fade_on_l3" || style === "jitter_l3" || style === "scroll_l3") {
    const isRight = style === "l3_right";
    const isMid = style === "l3_mid";
    const titleSz = Math.max(13, Math.round(h * 0.062 * fontScale));
    const subSz = Math.max(10, Math.round(h * 0.04 * fontScale));
    ctx.font = `700 ${titleSz}px 'Open Sans', 'Segoe UI', sans-serif`;
    const mainW = ctx.measureText(text).width;
    ctx.font = `400 ${subSz}px 'Open Sans', 'Segoe UI', sans-serif`;
    const subW = sub ? ctx.measureText(sub).width : 0;
    const boxW = Math.min(w * 0.78, Math.max(mainW, subW) + 32);
    const boxH = titleSz + (sub ? subSz + 18 : 16);
    const slideOffset = (1 - ease) * (isRight ? 36 : -36);
    const x = (isMid ? (w - boxW) * 0.5 : isRight ? w - boxW - w * 0.06 : w * 0.06) + slideOffset;
    const y = h * 0.73;

    ctx.globalAlpha = ease;
    ctx.fillStyle = "rgba(18, 19, 24, 0.84)";
    roundRect(ctx, x, y, boxW, boxH, 3);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillRect(isRight ? x + boxW - 4 : x, y, 4, boxH);

    ctx.textAlign = isRight ? "right" : isMid ? "center" : "left";
    const tx = isRight ? x + boxW - 14 : isMid ? x + boxW * 0.5 : x + 14;
    ctx.fillStyle = color;
    ctx.font = `700 ${titleSz}px 'Open Sans', 'Segoe UI', sans-serif`;
    ctx.fillText(text, tx, y + titleSz * 0.7 + 4);
    if (sub) {
      ctx.fillStyle = "#b8bcc8";
      ctx.font = `400 ${subSz}px 'Open Sans', 'Segoe UI', sans-serif`;
      ctx.fillText(sub, tx, y + titleSz + subSz * 0.8 + 6);
    }
    ctx.restore();
    return;
  }

  if (style === "callout" || style === "callout_lines") {
    ctx.globalAlpha = ease;
    const targetX = w * 0.38;
    const targetY = h * 0.56;
    const elbowX = w * 0.52;
    const elbowY = h * 0.34;
    const endX = w * 0.82;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(targetX, targetY, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(targetX, targetY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(targetX + 5, targetY - 4);
    ctx.lineTo(elbowX, elbowY);
    ctx.lineTo(elbowX + (endX - elbowX) * ease, elbowY);
    ctx.stroke();

    const sz = Math.max(11, Math.round(h * 0.05 * fontScale));
    ctx.textAlign = "left";
    ctx.font = `700 ${sz}px 'Open Sans', 'Segoe UI', sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(text, elbowX + 6, elbowY - sz * 0.75);
    if (sub) {
      ctx.font = `400 ${Math.max(9, Math.round(sz * 0.72))}px 'Open Sans', 'Segoe UI', sans-serif`;
      ctx.fillStyle = "#c4c8d4";
      ctx.fillText(sub, elbowX + 6, elbowY + sz * 0.72);
    }
    ctx.restore();
    return;
  }

  // Center / Fusion cinematic titles
  const mainSize = Math.max(16, Math.round(h * 0.1 * fontScale));
  const subSize = Math.max(10, Math.round(h * 0.044 * fontScale));
  const cx = w * 0.5;
  const cy = h * 0.5;

  if (style === "letterbox") {
    const barH = h * 0.12 * ease;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, barH);
    ctx.fillRect(0, h - barH, w, barH);
  }

  ctx.translate(cx, cy);
  if (style === "spin") ctx.rotate((1 - ease) * -0.45);
  else if (style === "stretch") ctx.scale(0.65 + ease * 0.35, 1.35 - ease * 0.35);
  else if (style === "drop_in") ctx.translate(0, (1 - ease) * -h * 0.22);

  ctx.globalAlpha = style === "neon" ? (0.65 + 0.35 * Math.abs(Math.sin(u * 26))) * ease : ease;
  ctx.font = `700 ${mainSize}px 'Open Sans', 'Segoe UI', sans-serif`;
  ctx.textAlign = "center";

  if (style === "dark_box" || style === "bg_reveal" || style === "headline") {
    const tw = ctx.measureText(text).width + 34;
    const bh = mainSize + (sub ? subSize + 24 : 20);
    ctx.fillStyle = style === "headline" ? "rgba(230, 75, 61, 0.9)" : "rgba(15, 16, 20, 0.84)";
    roundRect(ctx, -tw * 0.5, -bh * 0.5, tw, bh, 3);
    ctx.fill();
  }

  if (style === "line_reveal" || style === "center_reveal") {
    const lineW = w * 0.42 * ease;
    ctx.fillStyle = accent;
    ctx.fillRect(-lineW * 0.5, mainSize * 0.46, lineW, 2.5);
  }

  if (style === "glitch") {
    const off = Math.sin(u * 35) * 4;
    ctx.fillStyle = "rgba(255, 60, 80, 0.85)";
    ctx.fillText(text, -off, -1);
    ctx.fillStyle = "rgba(60, 220, 255, 0.85)";
    ctx.fillText(text, off, 1);
  }

  if (style === "neon") {
    ctx.shadowColor = "#39c5cf";
    ctx.shadowBlur = 16;
  } else {
    ctx.shadowColor = "rgba(0, 0, 0, 0.78)";
    ctx.shadowBlur = 8;
  }
  ctx.fillStyle = style === "neon" ? "#b4f8ff" : color;
  ctx.fillText(text, 0, sub ? -subSize * 0.45 : 0);

  if (sub) {
    ctx.shadowBlur = 4;
    ctx.font = `400 ${subSize}px 'Open Sans', 'Segoe UI', sans-serif`;
    ctx.fillStyle = "#d8dce6";
    ctx.fillText(sub, 0, mainSize * 0.62);
  }
  ctx.restore();
}

// ============================================================================
// 3. RESOLVE VIDEO TRANSITIONS (40+ DISSOLVE / IRIS / WIPE / FUSION STYLES)
// ============================================================================
function buildPolygonPath(ctx, cx, cy, r, sides, rotOffset = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rotOffset + (i * Math.PI * 2) / sides;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function renderResolveTransition(ctx, canvasA, canvasB, w, h, transStyle, progress) {
  const u = clamp01(progress);
  const s = String(transStyle || "cross").toLowerCase();
  const eased = u * u * (3 - 2 * u);

  ctx.save();
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);

  if (s === "dip_color" || s === "fadeblack") {
    if (u < 0.5) {
      ctx.globalAlpha = clamp01(1 - u * 2);
      ctx.drawImage(canvasA, 0, 0, w, h);
    } else {
      ctx.globalAlpha = clamp01((u - 0.5) * 2);
      ctx.drawImage(canvasB, 0, 0, w, h);
    }
  } else if (s === "additive" || s === "trans_glow") {
    ctx.drawImage(canvasA, 0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = u;
    ctx.drawImage(canvasB, 0, 0, w, h);
    if (s === "trans_glow") {
      const peak = Math.sin(u * Math.PI);
      ctx.fillStyle = `rgba(255, 224, 175, ${(peak * 0.45).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    }
  } else if (s === "brightness_flash") {
    const peak = Math.sin(u * Math.PI);
    ctx.drawImage(u < 0.5 ? canvasA : canvasB, 0, 0, w, h);
    ctx.fillStyle = `rgba(255, 255, 255, ${(peak * 0.92).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);
  } else if (s === "blur") {
    const peak = Math.sin(u * Math.PI);
    const px = Math.round(peak * 14);
    ctx.filter = px > 0 ? `blur(${px}px)` : "none";
    ctx.drawImage(canvasA, 0, 0, w, h);
    ctx.globalAlpha = u;
    ctx.drawImage(canvasB, 0, 0, w, h);
    ctx.filter = "none";
  } else if (s === "crash_zoom" || s === "zoomin" || s === "smooth") {
    const scaleA = 1 + eased * (s === "smooth" ? 0.1 : 0.45);
    ctx.globalAlpha = clamp01(1 - eased);
    ctx.drawImage(canvasA, (w - w * scaleA) * 0.5, (h - h * scaleA) * 0.5, w * scaleA, h * scaleA);
    const scaleB = (s === "smooth" ? 0.94 : 0.72) + eased * (s === "smooth" ? 0.06 : 0.28);
    ctx.globalAlpha = clamp01(eased);
    ctx.drawImage(canvasB, (w - w * scaleB) * 0.5, (h - h * scaleB) * 0.5, w * scaleB, h * scaleB);
  } else if (s === "slide_right" || s === "slideright") {
    const sx = w * eased;
    ctx.drawImage(canvasA, sx, 0, w, h);
    ctx.drawImage(canvasB, sx - w, 0, w, h);
  } else if (s === "slide_left") {
    const sx = w * eased;
    ctx.drawImage(canvasA, -sx, 0, w, h);
    ctx.drawImage(canvasB, w - sx, 0, w, h);
  } else if (s === "slide_up") {
    const sy = h * eased;
    ctx.drawImage(canvasA, 0, -sy, w, h);
    ctx.drawImage(canvasB, 0, h - sy, w, h);
  } else if (s === "slide_down") {
    const sy = h * eased;
    ctx.drawImage(canvasA, 0, sy, w, h);
    ctx.drawImage(canvasB, 0, sy - h, w, h);
  } else if (s === "flip_over" || s === "box_twist") {
    const half = u < 0.5;
    const scaleX = Math.max(0.02, Math.abs(Math.cos(u * Math.PI)));
    ctx.translate(w * 0.5, h * 0.5);
    ctx.scale(scaleX, 1);
    ctx.drawImage(half ? canvasA : canvasB, -w * 0.5, -h * 0.5, w, h);
  } else if (s.startsWith("iris_")) {
    ctx.drawImage(canvasA, 0, 0, w, h);
    const cx = w * 0.5;
    const cy = h * 0.5;
    const maxR = Math.hypot(cx, cy) * 1.15;
    const r = maxR * eased;
    ctx.save();
    if (s === "iris_diamond") buildPolygonPath(ctx, cx, cy, r, 4, -Math.PI / 2);
    else if (s === "iris_square") buildPolygonPath(ctx, cx, cy, r, 4, Math.PI / 4);
    else if (s === "iris_triangle") buildPolygonPath(ctx, cx, cy, r, 3, -Math.PI / 2);
    else if (s === "iris_pentagon") buildPolygonPath(ctx, cx, cy, r, 5, -Math.PI / 2);
    else if (s === "iris_hex") buildPolygonPath(ctx, cx, cy, r, 6, 0);
    else if (s === "iris_cross") {
      const arm = r * 0.42;
      ctx.beginPath();
      ctx.rect(cx - arm, cy - r, arm * 2, r * 2);
      ctx.rect(cx - r, cy - arm, r * 2, arm * 2);
    } else if (s === "iris_eye") {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.55, 0, 0, Math.PI * 2);
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
    ctx.clip();
    ctx.drawImage(canvasB, 0, 0, w, h);
    ctx.restore();
  } else if (s === "wipe_barn") {
    ctx.drawImage(canvasA, 0, 0, w, h);
    const hw = (w * 0.5) * eased;
    ctx.save();
    ctx.beginPath();
    ctx.rect(w * 0.5 - hw, 0, hw * 2, h);
    ctx.clip();
    ctx.drawImage(canvasB, 0, 0, w, h);
    ctx.restore();
  } else if (s === "wipe_clock" || s === "wipe_spiral") {
    ctx.drawImage(canvasA, 0, 0, w, h);
    const cx = w * 0.5;
    const cy = h * 0.5;
    const r = Math.hypot(cx, cy) * 1.1;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + u * Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(canvasB, 0, 0, w, h);
    ctx.restore();
  } else if (s === "wipe_checker") {
    ctx.drawImage(canvasA, 0, 0, w, h);
    const cols = 8;
    const rows = 5;
    const cw = w / cols;
    const ch = h / rows;
    ctx.save();
    ctx.beginPath();
    for (let ry = 0; ry < rows; ry++) {
      for (let rx = 0; rx < cols; rx++) {
        const thresh = ((rx + ry) / (cols + rows)) * 0.65;
        const local = clamp01((u - thresh) / 0.35);
        if (local > 0.01) {
          ctx.rect(rx * cw, ry * ch, cw * local + 0.5, ch + 0.5);
        }
      }
    }
    ctx.clip();
    ctx.drawImage(canvasB, 0, 0, w, h);
    ctx.restore();
  } else if (s === "wipe_diag") {
    ctx.drawImage(canvasA, 0, 0, w, h);
    const span = (w + h) * u;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(span, 0);
    ctx.lineTo(0, span);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(canvasB, 0, 0, w, h);
    ctx.restore();
  } else if (s === "wipe_box" || s === "wipe_center") {
    ctx.drawImage(canvasA, 0, 0, w, h);
    const bw = w * eased;
    const bh = h * eased;
    ctx.save();
    ctx.beginPath();
    ctx.rect((w - bw) * 0.5, (h - bh) * 0.5, bw, bh);
    ctx.clip();
    ctx.drawImage(canvasB, 0, 0, w, h);
    ctx.restore();
  } else if (s === "wipe_band" || s === "wipe_edge" || s === "wipeleft" || s === "luma_wipe" || s === "page_curl") {
    const seamX = w * (1 - u);
    ctx.drawImage(canvasA, 0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(seamX, 0, w - seamX, h);
    ctx.clip();
    ctx.drawImage(canvasB, 0, 0, w, h);
    ctx.restore();
    if (s === "page_curl") {
      const curlW = Math.min(28, Math.sin(u * Math.PI) * 32);
      const cg = ctx.createLinearGradient(seamX - curlW, 0, seamX + 6, 0);
      cg.addColorStop(0, "rgba(0,0,0,0)");
      cg.addColorStop(0.6, "rgba(255,255,255,0.45)");
      cg.addColorStop(1, "rgba(0,0,0,0.65)");
      ctx.fillStyle = cg;
      ctx.fillRect(seamX - curlW, 0, curlW + 6, h);
    } else {
      ctx.strokeStyle = "#e68442";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(seamX, 0);
      ctx.lineTo(seamX, h);
      ctx.stroke();
    }
  } else if (s === "block_glitch" || s === "rgb_split" || s === "trans_shake") {
    const peak = Math.sin(u * Math.PI);
    const jx = (s === "trans_shake" ? Math.sin(u * 40) : Math.sin(u * 24)) * 18 * peak;
    const jy = Math.cos(u * 32) * 8 * peak;
    ctx.drawImage(u < 0.5 ? canvasA : canvasB, jx, jy, w, h);
    if (s === "rgb_split" || s === "block_glitch") {
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.55 * peak;
      ctx.drawImage(canvasB, -10 * peak, 0, w, h);
      ctx.drawImage(canvasA, 10 * peak, 0, w, h);
    }
  } else if (s === "burn_away") {
    ctx.drawImage(canvasB, 0, 0, w, h);
    const seamY = h * (1 - u);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, seamY);
    ctx.clip();
    ctx.drawImage(canvasA, 0, 0, w, h);
    ctx.restore();
    const fire = ctx.createLinearGradient(0, seamY - 14, 0, seamY + 14);
    fire.addColorStop(0, "rgba(255,80,10,0)");
    fire.addColorStop(0.5, "rgba(255,180,40,0.92)");
    fire.addColorStop(1, "rgba(220,40,10,0)");
    ctx.fillStyle = fire;
    ctx.fillRect(0, seamY - 14, w, 28);
  } else {
    // Cross Dissolve / Non-Additive Dissolve
    ctx.drawImage(canvasA, 0, 0, w, h);
    ctx.globalAlpha = u;
    ctx.drawImage(canvasB, 0, 0, w, h);
  }
  ctx.restore();
}

// ============================================================================
// 4. RESOLVE FX & TOOLBOX EFFECT LIVE SHADERS (ALL STYLES)
// ============================================================================
let _fxTempCanvas = null;
function ensureTemp(w, h) {
  if (typeof document === "undefined") return null;
  if (!_fxTempCanvas) _fxTempCanvas = document.createElement("canvas");
  if (_fxTempCanvas.width !== w || _fxTempCanvas.height !== h) {
    _fxTempCanvas.width = w;
    _fxTempCanvas.height = h;
  }
  return _fxTempCanvas;
}

export function applyResolveFxStylePass(ctx, w, h, fxStyle, params = {}, progress = 0.65, tSec = 0) {
  const s = String(fxStyle || "").toLowerCase();
  if (!s) return;
  const u = clamp01(progress);
  const strength = Number(params.strength ?? params.intensity ?? 0.85);
  const tmp = ensureTemp(w, h);
  if (!tmp) return;

  ctx.save();
  if (s === "gaussian_blur" || s === "box_blur" || s === "lens_blur" || s === "defocus_bg" || s === "beauty") {
    const px = Math.max(2, Math.round((s === "beauty" ? 3 : Number(params.blur_strength ?? params.blur_amount ?? 8)) * (0.4 + u * 0.6)));
    const tctx = tmp.getContext("2d");
    tctx.clearRect(0, 0, w, h);
    tctx.drawImage(ctx.canvas, 0, 0, w, h);
    ctx.filter = `blur(${px}px)`;
    if (s === "beauty") ctx.globalAlpha = 0.45;
    ctx.drawImage(tmp, 0, 0, w, h);
    ctx.filter = "none";
    if (s === "defocus_bg") {
      // Keep sharp elliptical foreground focus
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.5, w * 0.24, h * 0.36, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(tmp, 0, 0, w, h);
    }
  } else if (s === "radial_blur" || s === "zoom_blur" || s === "motion_blur" || s === "motion_trails" || s === "smear") {
    const tctx = tmp.getContext("2d");
    tctx.clearRect(0, 0, w, h);
    tctx.drawImage(ctx.canvas, 0, 0, w, h);
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      ctx.globalAlpha = 0.22;
      if (s === "zoom_blur" || s === "radial_blur") {
        const sc = 1 + i * 0.025 * (0.5 + u * 0.5);
        ctx.drawImage(tmp, (w - w * sc) * 0.5, (h - h * sc) * 0.5, w * sc, h * sc);
      } else {
        ctx.drawImage(tmp, i * 3.5 * (0.4 + u * 0.6), 0, w, h);
      }
    }
  } else if (s === "false_color") {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      let r = 0, g = 0, b = 0;
      if (l < 0.08) { r = 110; g = 30; b = 175; }
      else if (l < 0.2) { r = 38; g = 90; b = 220; }
      else if (l < 0.38) { r = 45; g = 185; b = 165; }
      else if (l < 0.52) { r = 95; g = 195; b = 75; }
      else if (l < 0.65) { r = 215; g = 125; b = 165; }
      else if (l < 0.84) { r = 242; g = 212; b = 45; }
      else { r = 235; g = 45; b = 45; }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    ctx.putImageData(img, 0, 0);
  } else if (s === "edge_detect" || s === "emboss" || s === "depth_map") {
    const src = ctx.getImageData(0, 0, w, h);
    const out = ctx.createImageData(w, h);
    const sd = src.data;
    const od = out.data;
    const stride = w * 4;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * stride + x * 4;
        const lC = 0.299 * sd[idx] + 0.587 * sd[idx + 1] + 0.114 * sd[idx + 2];
        const lR = 0.299 * sd[idx + 4] + 0.587 * sd[idx + 5] + 0.114 * sd[idx + 6];
        const lD = 0.299 * sd[idx + stride] + 0.587 * sd[idx + stride + 1] + 0.114 * sd[idx + stride + 2];
        if (s === "edge_detect") {
          const mag = Math.min(255, Math.round(Math.hypot(lR - lC, lD - lC) * 3.4));
          od[idx] = mag; od[idx + 1] = Math.min(255, Math.round(mag * 1.08)); od[idx + 2] = Math.min(255, Math.round(mag * 1.25)); od[idx + 3] = 255;
        } else if (s === "emboss") {
          const v = Math.max(0, Math.min(255, Math.round(128 + (lR - lC + lD - lC) * 2.1)));
          od[idx] = v; od[idx + 1] = v; od[idx + 2] = v; od[idx + 3] = 255;
        } else {
          // Depth Map: bright center/foreground -> warm white, edges -> deep dark
          const ny = y / h;
          const nx = Math.abs(x / w - 0.5) * 2;
          const depth = Math.max(0, Math.min(255, Math.round(lC * 0.65 + (1 - nx * 0.45) * 85 + ny * 30)));
          od[idx] = depth; od[idx + 1] = depth; od[idx + 2] = depth; od[idx + 3] = 255;
        }
      }
    }
    ctx.putImageData(out, 0, 0);
  } else if (s === "watercolor" || s === "abstraction") {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const levels = s === "abstraction" ? 5 : 7;
    const step = 255 / levels;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.round(Math.round(d[i] / step) * step);
      d[i + 1] = Math.round(Math.round(d[i + 1] / step) * step);
      d[i + 2] = Math.round(Math.round(d[i + 2] / step) * step);
    }
    ctx.putImageData(img, 0, 0);
  } else if (s === "ripple" || s === "waviness" || s === "vortex" || s === "dent") {
    const src = ctx.getImageData(0, 0, w, h);
    const out = ctx.createImageData(w, h);
    const sd = src.data;
    const od = out.data;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const maxR = Math.hypot(cx, cy);
    const phase = u * Math.PI * 2 + tSec * 3;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sx = x;
        let sy = y;
        const dx = x - cx;
        const dy = y - cy;
        const r = Math.hypot(dx, dy);
        if (s === "ripple") {
          const wave = Math.sin(r * 0.14 - phase) * 6;
          sx = x + (dx / Math.max(1, r)) * wave;
          sy = y + (dy / Math.max(1, r)) * wave;
        } else if (s === "waviness") {
          sx = x + Math.sin(y * 0.08 + phase) * 8;
          sy = y + Math.cos(x * 0.06 + phase) * 4;
        } else if (s === "vortex") {
          const amt = Math.max(0, 1 - r / (maxR * 0.8)) * 1.45 * (0.4 + u * 0.6);
          const ca = Math.cos(amt);
          const sa = Math.sin(amt);
          sx = cx + dx * ca - dy * sa;
          sy = cy + dx * sa + dy * ca;
        } else {
          const f = 1 - Math.max(0, 1 - r / (maxR * 0.65)) * 0.35;
          sx = cx + dx * f;
          sy = cy + dy * f;
        }
        const ix = Math.max(0, Math.min(w - 1, Math.round(sx)));
        const iy = Math.max(0, Math.min(h - 1, Math.round(sy)));
        const di = (y * w + x) * 4;
        const si = (iy * w + ix) * 4;
        od[di] = sd[si]; od[di + 1] = sd[si + 1]; od[di + 2] = sd[si + 2]; od[di + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  } else if (s === "digital_glitch" || s === "analog_damage" || s === "jpeg_damage") {
    const tctx = tmp.getContext("2d");
    tctx.clearRect(0, 0, w, h);
    tctx.drawImage(ctx.canvas, 0, 0, w, h);
    const slices = s === "analog_damage" ? 12 : 8;
    for (let i = 0; i < slices; i++) {
      const sy = Math.floor(((i * 0.17 + u * 0.5) % 0.9) * h);
      const sh = Math.max(4, Math.floor(h * 0.05));
      const shift = Math.sin(i * 11 + u * 25) * 18;
      ctx.drawImage(tmp, 0, sy, w, sh, shift, sy, w, sh);
    }
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.28;
    ctx.drawImage(tmp, 4, 0, w, h);
  } else if (s === "binoculars") {
    const tctx = tmp.getContext("2d");
    tctx.clearRect(0, 0, w, h);
    tctx.drawImage(ctx.canvas, 0, 0, w, h);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    const r = Math.min(w * 0.27, h * 0.43);
    ctx.arc(w * 0.34, h * 0.5, r, 0, Math.PI * 2);
    ctx.arc(w * 0.66, h * 0.5, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(tmp, 0, 0, w, h);
    ctx.restore();
  } else if (s === "cctv" || s === "night_vision") {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const isNvg = s === "night_vision";
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = isNvg ? Math.round(l * 0.24) : Math.round(l * 0.9);
      d[i + 1] = isNvg ? Math.min(255, Math.round(l * 1.25)) : Math.round(l * 0.95);
      d[i + 2] = isNvg ? Math.round(l * 0.32) : Math.round(l * 0.92);
    }
    ctx.putImageData(img, 0, 0);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    ctx.font = "700 11px ui-monospace, Consolas, monospace";
    ctx.fillStyle = isNvg ? "#64ff8a" : "#ececf2";
    ctx.fillText(isNvg ? "NVG GAIN +18dB | IR ON" : "CAM 01  REC ●  25FPS", 12, 20);
  } else if (s === "dslr" || s === "drone_overlay" || s === "video_call") {
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 1.5;
    const m = 18;
    const arm = 18;
    ctx.beginPath();
    ctx.moveTo(m, m + arm); ctx.lineTo(m, m); ctx.lineTo(m + arm, m);
    ctx.moveTo(w - m - arm, m); ctx.lineTo(w - m, m); ctx.lineTo(w - m, m + arm);
    ctx.moveTo(m, h - m - arm); ctx.lineTo(m, h - m); ctx.lineTo(m + arm, h - m);
    ctx.moveTo(w - m - arm, h - m); ctx.lineTo(w - m, h - m); ctx.lineTo(w - m, h - m - arm);
    ctx.stroke();
    ctx.font = "600 10px ui-monospace, Consolas, monospace";
    ctx.fillStyle = "#f2f2f7";
    if (s === "dslr") {
      ctx.fillText("1/50   F2.8   ISO 800   RAW   [AF-C]", m + 4, h - m - 6);
    } else if (s === "drone_overlay") {
      ctx.fillText(`ALT 142m   SPD 12.4m/s   BAT 84%   HDG ${Math.round(u * 360)}°`, m + 4, h - m - 6);
    } else {
      ctx.fillStyle = "rgba(24,25,30,0.84)";
      roundRect(ctx, w * 0.5 - 70, h - 34, 140, 22, 11);
      ctx.fill();
      ctx.fillStyle = "#5eead4";
      ctx.textAlign = "center";
      ctx.fillText("● LIVE CALL  00:14:22", w * 0.5, h - 19);
    }
  } else if (s === "colored_border" || s === "paper_edge") {
    const bw = Number(params.border_px ?? 12);
    ctx.strokeStyle = s === "paper_edge" ? "#e8dcc4" : (params.color || "#e64b3d");
    ctx.lineWidth = bw;
    ctx.strokeRect(bw * 0.5, bw * 0.5, w - bw, h - bw);
  } else if (s === "repeat" || s === "video_collage") {
    const tctx = tmp.getContext("2d");
    tctx.clearRect(0, 0, w, h);
    tctx.drawImage(ctx.canvas, 0, 0, w, h);
    ctx.fillStyle = "#0e0e12";
    ctx.fillRect(0, 0, w, h);
    const pad = s === "video_collage" ? 6 : 0;
    const cw = (w - pad * 3) * 0.5;
    const ch = (h - pad * 3) * 0.5;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        ctx.drawImage(tmp, pad + c * (cw + pad), pad + r * (ch + pad), cw, ch);
      }
    }
  } else if (s === "pip" || s === "dve" || s === "drop_shadow" || s === "fx_transform") {
    const tctx = tmp.getContext("2d");
    tctx.clearRect(0, 0, w, h);
    tctx.drawImage(ctx.canvas, 0, 0, w, h);
    const sc = s === "pip" ? 0.44 : s === "drop_shadow" ? 0.84 : 0.78;
    const dw = w * sc;
    const dh = h * sc;
    const dx = s === "pip" ? w - dw - 18 : (w - dw) * 0.5;
    const dy = s === "pip" ? 18 : (h - dh) * 0.5;
    if (s !== "pip") {
      ctx.fillStyle = "#0c0d10";
      ctx.fillRect(0, 0, w, h);
    }
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 6;
    ctx.shadowOffsetY = 8;
    ctx.drawImage(tmp, dx, dy, dw, dh);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(dx, dy, dw, dh);
  } else if (s === "burn_away") {
    const vg = ctx.createRadialGradient(w * 0.5, h * 0.5, h * (0.48 - u * 0.25), w * 0.5, h * 0.5, w * 0.62);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(0.75, "rgba(255,118,28,0.68)");
    vg.addColorStop(1, "rgba(18,8,4,0.96)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  } else if (s === "keyer_3d" || s === "keyer_luma" || s === "keyer_hsl" || s === "matte_shrink") {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const isGreen = g > r * 1.15 && g > b * 1.15 && g > 70;
        const keyed = s === "keyer_luma" ? luma < 0.28 : isGreen || (s === "keyer_3d" && g > r + 24);
        if (keyed) {
          const chk = (((x >> 3) + (y >> 3)) & 1) ? 46 : 30;
          d[i] = chk; d[i + 1] = chk; d[i + 2] = chk + 4;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  } else if (s === "color_palette") {
    const barH = Math.max(16, Math.round(h * 0.11));
    const sw = ["#1d2b44", "#486b8a", "#c87b58", "#d6ad78", "#2d5a46", "#8c3b36"];
    sw.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect((i * w) / sw.length, h - barH, w / sw.length + 1, barH);
    });
  } else if (s === "film_look_creator" || s === "aces_transform" || s === "cst_look" || s === "contrast_pop" || s === "dehaze" || s === "relight" || s === "chromatic_adaptation" || s === "texture_pop" || s === "ocio_cdl" || s === "ocio_cs" || s === "ocio_display" || s === "ocio_file" || s === "dctl_look" || s === "color_compressor" || s === "color_stabilizer" || s === "gamut_limiter" || s === "gamut_mapping" || s === "despill" || s === "light_rays" || s === "lens_reflections" || s === "aperture_diffraction") {
    // Crisp filmic / optical / color-science visual treatment
    const tctx = tmp.getContext("2d");
    tctx.clearRect(0, 0, w, h);
    tctx.drawImage(ctx.canvas, 0, 0, w, h);
    const sat = s === "film_look_creator" ? 1.18 : s === "contrast_pop" || s === "dehaze" ? 1.24 : s === "aces_transform" ? 1.12 : 1.08;
    const con = s === "contrast_pop" || s === "dehaze" || s === "texture_pop" ? 1.22 : s === "film_look_creator" ? 1.16 : 1.1;
    ctx.filter = `contrast(${con}) saturate(${sat})`;
    ctx.drawImage(tmp, 0, 0, w, h);
    ctx.filter = "none";

    if (s === "relight" || s === "light_rays" || s === "lens_reflections" || s === "aperture_diffraction") {
      const lx = w * (0.2 + u * 0.6);
      const ly = h * 0.25;
      const rg = ctx.createRadialGradient(lx, ly, 4, lx, ly, w * 0.55);
      rg.addColorStop(0, "rgba(255, 226, 168, 0.58)");
      rg.addColorStop(0.45, "rgba(255, 168, 92, 0.22)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    } else if (s === "film_look_creator") {
      const vg = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.3, w * 0.5, h * 0.5, w * 0.68);
      vg.addColorStop(0, "rgba(255, 200, 150, 0.08)");
      vg.addColorStop(1, "rgba(10, 18, 28, 0.42)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }
  } else {
    // Subtle clean visual accent for revival/refinement tools (Noise Reduction / Deband / Sharpen)
    const tctx = tmp.getContext("2d");
    tctx.clearRect(0, 0, w, h);
    tctx.drawImage(ctx.canvas, 0, 0, w, h);
    ctx.filter = `contrast(${(1 + 0.14 * strength).toFixed(2)}) brightness(${(1 + 0.04 * strength).toFixed(2)})`;
    ctx.drawImage(tmp, 0, 0, w, h);
    ctx.filter = "none";
  }
  ctx.restore();
}

// ============================================================================
// 5. LIVE HOVER PREVIEW HUD OVERLAY (UiEffectLivePreviewManager)
// ============================================================================
export function drawResolveLivePreviewHud(ctx, fx, fy, frameW, frameH, preview) {
  if (!preview) return;
  const u = clamp01(preview.progress ?? 0.5);
  ctx.save();

  if (preview.dropKind === "audio-fx" || preview.dropKind === "audio-transition") {
    // Fairlight Audio FX / Crossfade live curve HUD overlay in bottom third of viewer
    const boxW = Math.min(frameW - 32, 300);
    const boxH = 68;
    const bx = fx + (frameW - boxW) * 0.5;
    const by = fy + frameH - boxH - 22;
    ctx.fillStyle = "rgba(17, 18, 22, 0.88)";
    roundRect(ctx, bx, by, boxW, boxH, 4);
    ctx.fill();
    ctx.strokeStyle = "#2ea461";
    ctx.lineWidth = 1.25;
    ctx.stroke();

    ctx.strokeStyle = "#39d98a";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const frac = i / 40;
      const x = bx + 12 + frac * (boxW - 24);
      const env = preview.dropKind === "audio-transition"
        ? Math.sin(frac * Math.PI)
        : 0.4 + 0.55 * Math.abs(Math.sin(frac * 9 + u * 8));
      const y = by + boxH * 0.58 + Math.sin(frac * 28 + u * 12) * 14 * env;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.font = "600 10px 'Open Sans', 'Segoe UI', sans-serif";
    ctx.fillStyle = "#88f0b8";
    ctx.fillText(`FAIRLIGHT PREVIEW  ${preview.name}`, bx + 10, by + 16);
  }

  // Top-left Resolve Live Preview Pill
  const tag = `LIVE PREVIEW  ${preview.name}  ${Math.round(u * 100)}%`;
  ctx.font = "600 10px 'Open Sans', 'Segoe UI', sans-serif";
  const tw = Math.min(frameW - 16, Math.ceil(ctx.measureText(tag).width) + 16);
  const px = fx + 8;
  const py = fy + 8;
  ctx.fillStyle = "rgba(20, 21, 26, 0.88)";
  roundRect(ctx, px, py, tw, 19, 3);
  ctx.fill();
  ctx.strokeStyle = "#e64b3d";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#f4f4f8";
  ctx.fillText(tag, px + 8, py + 13);

  // Bottom coral hover-scrub progress bar across frame
  const barY = fy + frameH - 3;
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  ctx.fillRect(fx, barY, frameW, 3);
  ctx.fillStyle = "#e64b3d";
  ctx.fillRect(fx, barY, frameW * u, 3);
  ctx.restore();
}

// ============================================================================
// 6. TIMELINE DRAG & DROP VISUAL OVERLAY (UiEditTimelineWidgetImp)
// ============================================================================
export function drawTimelineDropPreview(ctx, geom, dropPreview) {
  if (!dropPreview || !geom || typeof geom.frameToX !== "function") return;
  const { timelineX, timelineW, rulerHeight, height, frameToX, pxPerFrame } = geom;
  ctx.save();

  if (dropPreview.mode === "transition") {
    const cutX = frameToX(dropPreview.cutFrame);
    const spanPx = Math.max(24, Math.min(120, (dropPreview.durationFrames || 25) * pxPerFrame));
    const align = dropPreview.alignment || "center";
    const bx = align === "start" ? cutX : align === "end" ? cutX - spanPx : cutX - spanPx * 0.5;
    const clampedX = Math.max(timelineX, bx);
    const clampedW = Math.min(timelineX + timelineW, bx + spanPx) - clampedX;
    const by = dropPreview.rowY + 3;
    const bh = Math.max(18, dropPreview.rowH - 6);
    const col = dropPreview.isAudio ? "#2ea461" : "#e64b3d";

    if (clampedW > 4) {
      ctx.fillStyle = dropPreview.isAudio ? "rgba(46, 164, 97, 0.34)" : "rgba(230, 75, 61, 0.34)";
      roundRect(ctx, clampedX, by, clampedW, bh, 3);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Vertical cut alignment highlight
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(cutX, rulerHeight);
    ctx.lineTo(cutX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label pill
    const lbl = `${dropPreview.label || "Transition"} (${align.toUpperCase()})`;
    ctx.font = "700 9.5px 'Open Sans', 'Segoe UI', sans-serif";
    const lw = Math.min(timelineW - 8, ctx.measureText(lbl).width + 14);
    const lx = Math.max(timelineX + 4, Math.min(timelineX + timelineW - lw - 4, cutX - lw * 0.5));
    const ly = Math.max(rulerHeight + 2, by - 19);
    ctx.fillStyle = "rgba(18, 19, 24, 0.94)";
    roundRect(ctx, lx, ly, lw, 16, 3);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(lbl, lx + 7, ly + 11.5);
  } else if (dropPreview.mode === "clip_target") {
    const { x, y, w, h } = dropPreview.box;
    const col = dropPreview.isAudio ? "#2ea461" : "#e64b3d";
    ctx.fillStyle = dropPreview.isAudio ? "rgba(46, 164, 97, 0.24)" : "rgba(230, 75, 61, 0.24)";
    roundRect(ctx, x, y, w, h, 3);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    const lbl = `+ ${dropPreview.label || "Apply Effect"}`;
    ctx.font = "700 9.5px 'Open Sans', 'Segoe UI', sans-serif";
    const lw = Math.min(timelineW - 8, ctx.measureText(lbl).width + 14);
    const lx = Math.max(timelineX + 4, Math.min(timelineX + timelineW - lw - 4, x + w * 0.5 - lw * 0.5));
    const ly = Math.max(rulerHeight + 2, y - 19);
    ctx.fillStyle = "rgba(18, 19, 24, 0.95)";
    roundRect(ctx, lx, ly, lw, 16, 3);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(lbl, lx + 7, ly + 11.5);
  } else if (dropPreview.mode === "ghost_clip") {
    const gx0 = frameToX(dropPreview.startFrame);
    const gw = Math.max(16, (dropPreview.durationFrames || 125) * pxPerFrame);
    const drawX = Math.max(timelineX, gx0);
    const drawW = Math.min(timelineX + timelineW, gx0 + gw) - drawX;
    const gy = dropPreview.createNewTrack ? rulerHeight + 3 : dropPreview.rowY + 4;
    const gh = dropPreview.createNewTrack ? 28 : Math.max(20, dropPreview.rowH - 8);
    const fillMap = {
      title: "rgba(138, 72, 160, 0.42)",
      generator: "rgba(48, 128, 152, 0.42)",
      adjustment: "rgba(92, 118, 196, 0.44)",
      fusion_comp: "rgba(122, 92, 168, 0.44)",
      media: "rgba(57, 134, 214, 0.42)",
      move: "rgba(230, 132, 66, 0.36)"
    };
    const strokeMap = {
      title: "#c084fc",
      generator: "#38bdf8",
      adjustment: "#85d5f7",
      fusion_comp: "#a78bfa",
      media: "#60a5fa",
      move: "#ffd166"
    };
    const kind = dropPreview.ghostKind || "media";

    if (drawW > 3) {
      ctx.fillStyle = fillMap[kind] || fillMap.media;
      roundRect(ctx, drawX, gy, drawW, gh, 3);
      ctx.fill();
      ctx.strokeStyle = strokeMap[kind] || "#e64b3d";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = "700 9.5px 'Open Sans', 'Segoe UI', sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(dropPreview.label || "Drop Clip", drawX + 6, gy + Math.min(16, gh * 0.62), Math.max(10, drawW - 10));
    }

    if (dropPreview.createNewTrack) {
      ctx.font = "700 9px 'Open Sans', 'Segoe UI', sans-serif";
      ctx.fillStyle = "#85d5f7";
      ctx.fillText("+ NEW TRACK", 10, gy + 16);
    }

    // Vertical start snap indicator
    if (gx0 >= timelineX && gx0 <= timelineX + timelineW) {
      ctx.strokeStyle = "#39c5cf";
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(Math.round(gx0) + 0.5, rulerHeight);
      ctx.lineTo(Math.round(gx0) + 0.5, height);
      ctx.stroke();
    }
  }
  ctx.restore();
}
