// DaVinci Resolve 21 Interactive Behaviors:
// - Timeline Drag & Drop Target Resolver & Drop Mutator (UiEditTimelineWidgetImp)
// - Program Viewer 7-Zone Edit Overlay (UiPlayerDropAssistant)
// - Timeline Clip & Track Right-Click Context Menu (UiTimelineListContextMenu)
// Clean-room MIT implementation.

const MIME_TYPE = "application/x-taktcut-drag";

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

export function readDragPayload(ev, fallbackPayload = null) {
  if (fallbackPayload) return fallbackPayload;
  if (!ev || !ev.dataTransfer) return null;
  try {
    const raw = ev.dataTransfer.getData(MIME_TYPE);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore malformed drag payload
  }
  return null;
}

function snapFrameToTimeline(doc, rawFrame, snapEnabled, playheadFrame, pxPerFrame) {
  const f0 = Math.max(0, Math.round(rawFrame));
  if (!snapEnabled || !doc) return { frame: f0, snapped: false, snapKind: null };
  const tolFrames = Math.max(3, Math.round(10 / Math.max(0.05, pxPerFrame || 1)));
  let best = f0;
  let bestDist = tolFrames + 1;
  let snapKind = null;

  const trySnap = (candidate, kind) => {
    const d = Math.abs(candidate - f0);
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
      snapKind = kind;
    }
  };

  trySnap(0, "clip");
  if (Number.isFinite(playheadFrame)) trySnap(Math.round(playheadFrame), "playhead");
  for (const trk of doc.tracks || []) {
    for (const c of trk.clips || []) {
      trySnap(c.start_frame, "clip");
      trySnap(c.start_frame + c.duration_frames, "clip");
    }
  }
  for (const mk of doc.markers || []) {
    trySnap(mk.frame, "marker");
  }
  return { frame: best, snapped: bestDist <= tolFrames, snapKind };
}

function findRowAtY(trackRows, y, preferKind = "video") {
  if (!Array.isArray(trackRows) || trackRows.length === 0) return null;
  for (const r of trackRows) {
    if (y >= r.y && y <= r.y + r.h) return r;
  }
  const matching = trackRows.filter((r) => r.kind === preferKind);
  if (matching.length > 0) {
    if (y < matching[0].y) return matching[0];
    return matching[matching.length - 1];
  }
  return trackRows[0];
}

// Compute live Resolve drop preview overlay & drop target from drag pointer coordinates
export function resolveTimelineDropTarget(payload, doc, geom, x, y, opts = {}) {
  if (!payload || !doc || !geom || !geom.frameToX || !geom.xToRawFrame) return null;
  const { hitboxes = [], trackRows = [], rulerHeight = 36, timelineX = 164, pxPerFrame = 1 } = geom;
  if (x < timelineX - 24) return null;

  const fps = doc.fps ? Math.max(1, doc.fps.num / Math.max(1, doc.fps.den)) : 25;
  const snapEnabled = opts.snapEnabled !== false;
  const playheadFrame = Number.isFinite(opts.playheadFrame) ? opts.playheadFrame : 0;
  const rawFrame = Math.max(0, geom.xToRawFrame(x));
  const dropKind = payload.dropKind || "clip-fx";

  // 1. Video Transition / Audio Transition -> Snap to nearest cut junction or clip edge
  if (dropKind === "transition" || dropKind === "audio-transition") {
    const isAudio = dropKind === "audio-transition";
    const wantKind = isAudio ? "audio" : "video";
    const durFrames = Math.max(6, Math.round((payload.duration_s || 1.0) * fps));
    const row = findRowAtY(trackRows, y, wantKind);
    const candidateRows = trackRows.filter((r) => r.kind === wantKind);
    const activeRow = row && row.kind === wantKind ? row : candidateRows[0];
    if (!activeRow) return null;

    const trk = (doc.tracks || []).find((t) => t.kind === activeRow.kind && t.index === activeRow.index);
    if (!trk || !Array.isArray(trk.clips) || trk.clips.length === 0) return null;

    const sorted = trk.clips
      .map((clip, clipIndex) => ({ clip, clipIndex }))
      .sort((a, b) => a.clip.start_frame - b.clip.start_frame);

    let bestCut = null;
    let bestDistPx = Infinity;

    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      const endF = a.clip.start_frame + a.clip.duration_frames;
      const endX = geom.frameToX(endF);
      const next = sorted[i + 1];
      const isJunction = Boolean(next && next.clip.start_frame === endF);
      const dist = Math.abs(x - endX);
      if (dist < bestDistPx) {
        bestDistPx = dist;
        const rel = x - endX;
        const alignment = isJunction
          ? (rel < -10 ? "end" : rel > 10 ? "start" : "center")
          : "end";
        bestCut = {
          mode: "transition",
          isAudio,
          trackKind: activeRow.kind,
          trackIndex: activeRow.index,
          clipIndex: a.clipIndex,
          cutFrame: endF,
          durationFrames: durFrames,
          alignment,
          rowY: activeRow.y,
          rowH: activeRow.h,
          label: `${payload.name} (${(payload.duration_s || 1.0).toFixed(1)}s)`
        };
      }
      // Also consider clip head edge if first clip or separated
      if (i === 0 || (sorted[i - 1].clip.start_frame + sorted[i - 1].clip.duration_frames !== a.clip.start_frame)) {
        const startX = geom.frameToX(a.clip.start_frame);
        const sDist = Math.abs(x - startX);
        if (sDist < bestDistPx) {
          bestDistPx = sDist;
          bestCut = {
            mode: "transition",
            isAudio,
            trackKind: activeRow.kind,
            trackIndex: activeRow.index,
            clipIndex: a.clipIndex,
            edge: "in",
            cutFrame: a.clip.start_frame,
            durationFrames: durFrames,
            alignment: "start",
            rowY: activeRow.y,
            rowH: activeRow.h,
            label: `${payload.name} (${(payload.duration_s || 1.0).toFixed(1)}s)`
          };
        }
      }
    }
    return bestCut;
  }

  // 2. Resolve FX Filter / Toolbox Clip FX / Fairlight Audio FX -> Target exact clip under cursor
  if (dropKind === "clip-fx" || dropKind === "audio-fx") {
    const isAudio = dropKind === "audio-fx";
    const wantKind = isAudio ? "audio" : "video";
    let hitClip = null;
    for (let i = hitboxes.length - 1; i >= 0; i--) {
      const box = hitboxes[i];
      if (box.kind !== "clip" || box.trackKind !== wantKind) continue;
      if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
        hitClip = box;
        break;
      }
    }
    if (!hitClip) {
      // Fallback: nearest clip on the hovered matching track if within 36px horizontally
      const row = findRowAtY(trackRows, y, wantKind);
      if (row && row.kind === wantKind) {
        let bestD = 36;
        for (const box of hitboxes) {
          if (box.kind !== "clip" || box.trackKind !== row.kind || box.trackIndex !== row.index) continue;
          const d = x < box.x ? box.x - x : x > box.x + box.w ? x - (box.x + box.w) : 0;
          if (d < bestD) {
            bestD = d;
            hitClip = box;
          }
        }
      }
    }
    if (!hitClip) return null;
    return {
      mode: "clip_target",
      isAudio,
      trackKind: hitClip.trackKind,
      trackIndex: hitClip.trackIndex,
      clipIndex: hitClip.clipIndex,
      box: { x: hitClip.x, y: hitClip.y, w: hitClip.w, h: hitClip.h },
      label: `${payload.name} -> ${hitClip.data ? hitClip.data.name : "Clip"}`
    };
  }

  // 3. Titles / Generators / Adjustment Clip / Fusion Comp / Media Pool Clips -> Ghost Clip at exact (track, frame)
  const isAudioMedia = dropKind === "media" && payload.mediaType === "audio";
  const preferKind = isAudioMedia ? "audio" : "video";
  const matchingRows = trackRows.filter((r) => r.kind === preferKind);
  const topVideoRow = trackRows.find((r) => r.kind === "video");
  const createNewTrack =
    preferKind === "video" &&
    topVideoRow &&
    y >= rulerHeight - 6 &&
    y < topVideoRow.y + 10 &&
    (dropKind === "title" || dropKind === "adjustment" || dropKind === "generator" || dropKind === "fusion_comp" || dropKind === "media");

  let targetRow = findRowAtY(trackRows, y, preferKind);
  if (!targetRow || targetRow.kind !== preferKind) {
    targetRow = matchingRows[0] || trackRows[0];
  }
  if (!targetRow) return null;

  const durationFrames = Math.max(10, Math.round(payload.defaultFrames || payload.durationFrames || Math.round(fps * 5)));
  const snapped = snapFrameToTimeline(doc, rawFrame, snapEnabled, playheadFrame, pxPerFrame);
  const ghostKind =
    dropKind === "title" ? "title" :
    dropKind === "generator" ? "generator" :
    dropKind === "adjustment" ? "adjustment" :
    dropKind === "fusion_comp" ? "fusion_comp" : "media";
  const nextTrackIdx = createNewTrack
    ? Math.max(1, ...matchingRows.map((r) => r.index)) + 1
    : targetRow.index;
  const trackTag = `${preferKind === "audio" ? "A" : "V"}${nextTrackIdx}`;

  return {
    mode: "ghost_clip",
    ghostKind,
    createNewTrack: Boolean(createNewTrack),
    trackKind: preferKind,
    trackIndex: nextTrackIdx,
    startFrame: snapped.frame,
    durationFrames,
    snapFrame: snapped.snapped ? snapped.frame : null,
    snapKind: snapped.snapKind,
    rowY: targetRow.y,
    rowH: targetRow.h,
    label: `${trackTag} | ${payload.name}`
  };
}

// Apply a resolved drop onto a cloned timeline document cleanly (full Undo/Redo support)
export function applyTimelineDrop(origDoc, payload, target, helpers = {}) {
  if (!origDoc || !payload || !target) return null;
  const doc = JSON.parse(JSON.stringify(origDoc));
  const fps = doc.fps ? Math.max(1, doc.fps.num / Math.max(1, doc.fps.den)) : 25;

  if (target.mode === "transition") {
    const trk = (doc.tracks || []).find((t) => t.kind === target.trackKind && t.index === target.trackIndex);
    const clip = trk && trk.clips ? trk.clips[target.clipIndex] : null;
    if (!clip) return null;
    const durS = Number(payload.duration_s || 1.0);
    if (target.isAudio) {
      if (target.edge === "in") {
        clip.fade_in_s = durS;
      } else {
        clip.fade_out_s = durS;
        clip.transition_out = {
          preset: "fade",
          trans_style: payload.fadeCurve || "0db",
          label: payload.name,
          duration_s: durS,
          alignment: target.alignment || "center"
        };
      }
      return {
        doc,
        selected: { kind: "transition", data: clip },
        inspectorTab: "transition",
        banner: `${payload.name} dropped on ${clip.name}.`
      };
    }
    if (target.edge === "in") {
      clip.fade_in_s = durS;
      clip.transition_in = {
        preset: payload.transition || "fade",
        trans_style: payload.transStyle || payload.transition || "cross",
        label: payload.name,
        duration_s: durS,
        alignment: "start"
      };
    } else {
      clip.transition_out = {
        preset: payload.transition || "fade",
        trans_style: payload.transStyle || payload.transition || "cross",
        label: payload.name,
        duration_s: durS,
        alignment: target.alignment || "center"
      };
    }
    return {
      doc,
      selected: { kind: "transition", data: clip },
      inspectorTab: "transition",
      banner: `${payload.name} applied at cut on ${clip.name}.`
    };
  }

  if (target.mode === "clip_target") {
    const trk = (doc.tracks || []).find((t) => t.kind === target.trackKind && t.index === target.trackIndex);
    const clip = trk && trk.clips ? trk.clips[target.clipIndex] : null;
    if (!clip) return null;
    if (target.isAudio) {
      if (!Array.isArray(clip.audio_fx)) clip.audio_fx = [];
      clip.audio_fx.push({
        id: payload.audioFxId || payload.name.toLowerCase().replace(/\s+/g, "_"),
        name: payload.name,
        enabled: true,
        params: { ...(payload.defaultParams || { mix: 0.65 }) }
      });
      return {
        doc,
        selected: { kind: "clip", data: clip },
        inspectorTab: "audio",
        banner: `Fairlight FX "${payload.name}" applied to ${clip.name}.`
      };
    }
    if (!Array.isArray(clip.clip_fx)) clip.clip_fx = [];
    const baseNode = payload.fx && typeof helpers.createDefaultFxNode === "function"
      ? helpers.createDefaultFxNode(payload.fx)
      : { effect: payload.fx || "__resolve_style__", enabled: true, params: {} };
    clip.clip_fx.push({
      ...baseNode,
      effect: payload.fx || "__resolve_style__",
      fxStyle: payload.fxStyle || payload.fx || "",
      displayName: payload.name,
      enabled: true,
      params: { ...(baseNode.params || {}), ...(payload.defaultParams || {}) },
      defaultParams: { ...(baseNode.params || {}), ...(payload.defaultParams || {}) }
    });
    return {
      doc,
      selected: { kind: "clip", data: clip },
      inspectorTab: "effects",
      banner: `${payload.name} dropped onto ${clip.name}.`
    };
  }

  if (target.mode === "ghost_clip") {
    let trk = (doc.tracks || []).find((t) => t.kind === target.trackKind && t.index === target.trackIndex);
    if (!trk) {
      trk = {
        kind: target.trackKind,
        index: target.trackIndex,
        name: `${target.trackKind === "audio" ? "Audio" : "Video"} ${target.trackIndex}`,
        muted: false,
        solo: false,
        sync_locked: false,
        clips: []
      };
      if (target.trackKind === "video") {
        // Insert new top video track at the top (Resolve V3 above V2 above V1, or matching doc track order)
        const firstVideoIdx = doc.tracks.findIndex((t) => t.kind === "video");
        const lastVideoIdx = doc.tracks.reduce((acc, t, i) => (t.kind === "video" ? i : acc), -1);
        const ascending = firstVideoIdx >= 0 && lastVideoIdx > firstVideoIdx &&
          doc.tracks[firstVideoIdx].index < doc.tracks[lastVideoIdx].index;
        if (ascending) doc.tracks.splice(lastVideoIdx + 1, 0, trk);
        else doc.tracks.splice(Math.max(0, firstVideoIdx), 0, trk);
      } else {
        doc.tracks.push(trk);
      }
    }

    const startFrame = Math.max(0, Math.round(target.startFrame));
    const durFrames = Math.max(10, Math.round(target.durationFrames || Math.round(fps * 5)));
    let newClip;
    if (payload.dropKind === "media" && payload.clipTemplate) {
      newClip = {
        ...JSON.parse(JSON.stringify(payload.clipTemplate)),
        start_frame: startFrame,
        duration_frames: durFrames,
        track_index: trk.index,
        media_type: trk.kind
      };
    } else {
      newClip = {
        name: payload.name,
        source_path: payload.dropKind === "title" ? `title://${payload.titleStyle}` :
          payload.dropKind === "generator" ? `generator://${payload.genStyle}` :
          `${payload.dropKind}://${payload.name.toLowerCase().replace(/\s+/g, "_")}`,
        media_type: trk.kind,
        track_index: trk.index,
        start_frame: startFrame,
        duration_frames: durFrames,
        source_in_frame: 0,
        enabled: true,
        clip_kind: payload.dropKind,
        clip_fx: []
      };
      if (payload.dropKind === "title") {
        newClip.title_style = payload.titleStyle || "text";
        newClip.title_props = {
          text: payload.defaultText || payload.name,
          subtitle: payload.defaultSub || "",
          font_size: 46,
          color: "#ffffff",
          accent: "#e64b3d"
        };
      } else if (payload.dropKind === "generator") {
        newClip.generator_style = payload.genStyle || "solid";
        newClip.generator_params = {
          color: payload.defaultColor || "#1e3a5f",
          color2: "#8a2c52"
        };
      }
    }

    // Resolve Overwrite semantics: cleanly trim/split overlapped clips on the target track
    const endFrame = startFrame + durFrames;
    const nextClips = [];
    for (const ex of trk.clips || []) {
      const exStart = ex.start_frame || 0;
      const exEnd = exStart + (ex.duration_frames || 0);
      if (exEnd <= startFrame || exStart >= endFrame) {
        nextClips.push(ex);
        continue;
      }
      if (exStart < startFrame) {
        const leftPart = JSON.parse(JSON.stringify(ex));
        leftPart.duration_frames = startFrame - exStart;
        delete leftPart.transition_out;
        nextClips.push(leftPart);
      }
      if (exEnd > endFrame) {
        const rightPart = JSON.parse(JSON.stringify(ex));
        const shift = endFrame - exStart;
        rightPart.start_frame = endFrame;
        rightPart.duration_frames = exEnd - endFrame;
        rightPart.source_in_frame = (ex.source_in_frame || 0) + shift;
        nextClips.push(rightPart);
      }
    }
    nextClips.push(newClip);
    nextClips.sort((a, b) => a.start_frame - b.start_frame);
    trk.clips = nextClips;

    return {
      doc,
      selected: { kind: "clip", data: newClip },
      inspectorTab: payload.dropKind === "adjustment" ? "effects" : "video",
      movePlayheadTo: startFrame + Math.min(12, Math.floor(durFrames * 0.25)),
      banner: `${newClip.name} added to ${trk.kind === "audio" ? "A" : "V"}${trk.index} at frame ${startFrame}.`
    };
  }
  return null;
}

// ============================================================================
// DAVINCI RESOLVE PROGRAM VIEWER EDIT OVERLAY (UiPlayerDropAssistant)
// ============================================================================
const VIEWER_EDIT_ZONES = [
  { id: "insert", label: "Insert", shortcut: "F9" },
  { id: "overwrite", label: "Overwrite", shortcut: "F10" },
  { id: "replace", label: "Replace", shortcut: "F11" },
  { id: "fit_to_fill", label: "Fit to Fill", shortcut: "Shift+F11" },
  { id: "place_on_top", label: "Place on Top", shortcut: "F12" },
  { id: "append_end", label: "Append at End", shortcut: "Shift+F12" },
  { id: "ripple_overwrite", label: "Ripple Overwrite", shortcut: "Shift+F10" }
];

export function createViewerDropAssistant(viewerContainer, callbacks) {
  if (!viewerContainer) return null;
  let overlay = viewerContainer.querySelector(".viewer-drop-assistant");
  if (!overlay) {
    overlay = el("div", "viewer-drop-assistant is-hidden");
    overlay.setAttribute("role", "region");
    overlay.setAttribute("aria-label", "DaVinci Resolve Viewer Edit Overlay");
    const title = el("div", "vda-title", "EDIT OVERLAY");
    overlay.appendChild(title);
    for (const z of VIEWER_EDIT_ZONES) {
      const zoneBtn = el("div", "vda-zone");
      zoneBtn.dataset.editZone = z.id;
      zoneBtn.append(el("span", "vda-zone-label", z.label), el("span", "vda-zone-kbd mono", z.shortcut));
      zoneBtn.addEventListener("dragover", (ev) => {
        ev.preventDefault();
        for (const o of overlay.querySelectorAll(".vda-zone.is-hot")) o.classList.remove("is-hot");
        zoneBtn.classList.add("is-hot");
      });
      zoneBtn.addEventListener("drop", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        hide();
        const payload = readDragPayload(ev, callbacks.getActiveDragPayload ? callbacks.getActiveDragPayload() : null);
        if (payload && callbacks.onViewerEditDrop) {
          callbacks.onViewerEditDrop(z.id, payload);
        }
      });
      overlay.appendChild(zoneBtn);
    }
    viewerContainer.appendChild(overlay);
  }

  let dragDepth = 0;
  const show = () => overlay.classList.remove("is-hidden");
  const hide = () => {
    dragDepth = 0;
    overlay.classList.add("is-hidden");
    for (const o of overlay.querySelectorAll(".vda-zone.is-hot")) o.classList.remove("is-hot");
  };

  viewerContainer.addEventListener("dragenter", (ev) => {
    const payload = readDragPayload(ev, callbacks.getActiveDragPayload ? callbacks.getActiveDragPayload() : null);
    if (!payload) return;
    if (payload.dropKind === "transition" || payload.dropKind === "audio-transition" || payload.dropKind === "audio-fx") return;
    ev.preventDefault();
    dragDepth += 1;
    show();
  });

  viewerContainer.addEventListener("dragover", (ev) => {
    const payload = readDragPayload(ev, callbacks.getActiveDragPayload ? callbacks.getActiveDragPayload() : null);
    if (!payload) return;
    if (payload.dropKind === "transition" || payload.dropKind === "audio-transition" || payload.dropKind === "audio-fx") return;
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = "copy";
    show();
  });

  viewerContainer.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) hide();
  });

  viewerContainer.addEventListener("drop", (ev) => {
    const payload = readDragPayload(ev, callbacks.getActiveDragPayload ? callbacks.getActiveDragPayload() : null);
    if (!payload) return;
    ev.preventDefault();
    hide();
    if (payload.dropKind === "clip-fx" && callbacks.onViewerEditDrop) {
      callbacks.onViewerEditDrop("apply_fx_at_playhead", payload);
    } else if (callbacks.onViewerEditDrop) {
      callbacks.onViewerEditDrop("overwrite", payload);
    }
  });

  return { show, hide };
}

// ============================================================================
// DAVINCI RESOLVE TIMELINE RIGHT-CLICK CONTEXT MENU
// ============================================================================
export function createTimelineContextMenu(canvas, callbacks) {
  if (!canvas) return null;
  let menu = document.getElementById("nle-timeline-context-menu");
  if (!menu) {
    menu = el("div", "nle-context-menu is-hidden");
    menu.id = "nle-timeline-context-menu";
    menu.setAttribute("role", "menu");
    document.body.appendChild(menu);
  }

  const closeMenu = () => {
    menu.classList.add("is-hidden");
    menu.replaceChildren();
  };

  document.addEventListener("click", (ev) => {
    if (!menu.classList.contains("is-hidden") && !menu.contains(ev.target)) closeMenu();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeMenu();
  });

  const addItem = (label, shortcut, run, danger = false) => {
    const btn = el("button", `nle-ctx-item${danger ? " is-danger" : ""}`);
    btn.type = "button";
    btn.setAttribute("role", "menuitem");
    btn.append(el("span", "nle-ctx-label", label));
    if (shortcut) btn.append(el("span", "nle-ctx-kbd mono", shortcut));
    btn.addEventListener("click", () => {
      closeMenu();
      run();
    });
    menu.appendChild(btn);
  };
  const addSep = () => menu.appendChild(el("div", "nle-ctx-sep"));

  canvas.addEventListener("contextmenu", (ev) => {
    if (!callbacks || !callbacks.onContextMenuQuery) return;
    ev.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const info = callbacks.onContextMenuQuery(x, y);
    if (!info) return;

    menu.replaceChildren();
    if (info.clipHit) {
      const c = info.clipHit.data;
      addItem(`Split "${c.name}" at Playhead`, "Ctrl+B", () => callbacks.onAction("split", info));
      addItem("Add Cross Dissolve", "Ctrl+T", () => callbacks.onAction("add_transition", info));
      addItem("Open in Inspector > Effects", "", () => callbacks.onAction("inspect_fx", info));
      if (Array.isArray(c.clip_fx) && c.clip_fx.length > 0) {
        addItem(`Remove All Clip FX (${c.clip_fx.length})`, "", () => callbacks.onAction("clear_clip_fx", info), true);
      }
      addSep();
      addItem("Duplicate Clip", "Alt+Drag", () => callbacks.onAction("duplicate", info));
      addItem(c.enabled === false ? "Enable Clip" : "Disable Clip", "D", () => callbacks.onAction("toggle_enable", info));
      addItem("Link / Unlink A/V", "Alt+L", () => callbacks.onAction("toggle_link", info));
      addSep();
      addItem("Ripple Delete", "Shift+Bksp", () => callbacks.onAction("ripple_delete", info), true);
      addItem("Delete Selected", "Bksp", () => callbacks.onAction("delete", info), true);
    } else {
      addItem("Insert Text+ Title Here", "", () => callbacks.onAction("add_title_here", info));
      addItem("Insert Adjustment Clip Here", "", () => callbacks.onAction("add_adjustment_here", info));
      addItem("Insert Solid Color Generator Here", "", () => callbacks.onAction("add_generator_here", info));
      addSep();
      addItem("Add Video Track", "", () => callbacks.onAction("add_video_track", info));
      addItem("Add Audio Track", "", () => callbacks.onAction("add_audio_track", info));
    }

    menu.classList.remove("is-hidden");
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mw = menu.offsetWidth || 220;
    const mh = menu.offsetHeight || 220;
    menu.style.left = `${Math.max(6, Math.min(vw - mw - 6, ev.clientX))}px`;
    menu.style.top = `${Math.max(6, Math.min(vh - mh - 6, ev.clientY))}px`;
  });

  return { closeMenu };
}
