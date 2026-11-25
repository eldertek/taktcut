// Real media engine for taktcut web projects: maps timeline clips to browser-playable proxies,
// feeds decoded frames to the Program Monitor canvas and keeps audio tracks in sync with the playhead.

const state = {
  baseUrl: "",
  media: {},
  videos: new Map(),
  images: new Map(),
  thumbs: new Map(),
  audio: new Map(),
  redraw: null,
  redrawQueued: false,
  playing: false,
  speed: 0,
  usedThisFrame: new Set(),
  stats: { frameCalls: 0, lastTarget: 0, lastFrame: 0, lastKey: "" }
};

if (typeof window !== "undefined") {
  window.__taktcutMedia = state;
}

function hiddenHost() {
  let host = document.getElementById("taktcut-media-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "taktcut-media-host";
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;pointer-events:none;";
    document.body.appendChild(host);
  }
  return host;
}

function queueRedraw() {
  if (state.redrawQueued || typeof state.redraw !== "function") return;
  state.redrawQueued = true;
  window.requestAnimationFrame(() => {
    state.redrawQueued = false;
    state.redraw();
  });
}

export function setMediaRedrawCallback(fn) {
  state.redraw = fn;
}

export function clearProjectMedia() {
  for (const v of state.videos.values()) {
    v.pause();
    v.removeAttribute("src");
    v.load();
    v.remove();
  }
  for (const a of state.audio.values()) {
    a.el.pause();
    a.el.remove();
  }
  state.videos.clear();
  state.images.clear();
  state.thumbs.clear();
  state.audio.clear();
  state.media = {};
  state.baseUrl = "";
}

function resolveMediaAssetUrl(rel) {
  if (!rel) return "";
  if (/^(https?:|blob:|data:|\/)/i.test(rel)) return rel;
  return state.baseUrl + rel;
}

export function registerProjectMedia(baseUrl, mediaMap) {
  clearProjectMedia();
  state.baseUrl = !baseUrl ? "" : baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  state.media = {};
  mergeProjectMedia(baseUrl, mediaMap);
}

export function mergeProjectMedia(baseUrl, mediaMap) {
  if (baseUrl !== undefined && baseUrl !== null && !state.baseUrl) {
    state.baseUrl = !baseUrl ? "" : baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  }
  const incoming = mediaMap || {};
  for (const [key, entry] of Object.entries(incoming)) {
    state.media[key] = entry;
    if (entry.thumb) {
      const img = new Image();
      img.decoding = "async";
      img.onload = queueRedraw;
      img.src = resolveMediaAssetUrl(entry.thumb);
      state.thumbs.set(key, img);
    }
    if (entry.kind === "image") {
      const img = new Image();
      img.decoding = "async";
      img.onload = queueRedraw;
      img.src = resolveMediaAssetUrl(entry.url);
      state.images.set(key, img);
    }
  }
  queueRedraw();
}

export function getRegisteredMediaEntries() {
  return Object.entries(state.media).map(([key, entry]) => ({ key, ...entry }));
}

export function hasProjectMedia() {
  return Object.keys(state.media).length > 0;
}

export function getMediaEntry(clip) {
  if (!clip || !clip.source_path) return null;
  return state.media[clip.source_path] || null;
}

export function getMediaUrl(clip, kind = "media") {
  const entry = getMediaEntry(clip);
  if (!entry) return "";
  const rel = kind === "thumb" ? entry.thumb : entry.url;
  return resolveMediaAssetUrl(rel);
}

function getVideo(key, entry) {
  let v = state.videos.get(key);
  if (v) return v;
  v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.crossOrigin = "anonymous";
  v.src = resolveMediaAssetUrl(entry.url);
  v.addEventListener("seeked", queueRedraw);
  v.addEventListener("loadeddata", queueRedraw);
  hiddenHost().appendChild(v);
  state.videos.set(key, v);
  return v;
}

function clipSourceTime(clip, frame, docFps, entry) {
  const srcFps = clip.source_fps && clip.source_fps.num
    ? clip.source_fps.num / Math.max(1, clip.source_fps.den || 1)
    : entry.fps || docFps;
  const speed = Number(clip.speed_rate) > 0 ? Number(clip.speed_rate) : 1;
  const local = Math.max(0, frame - (clip.start_frame || 0));
  let t = ((clip.source_in_frame || 0) + local * speed * (srcFps / docFps)) / srcFps;
  const dur = entry.duration_s || 0;
  if (dur > 0) {
    if (t >= dur) t = Math.max(0, dur - 1 / srcFps);
  }
  return t;
}

// Returns a drawable (video or image) for the clip at the given timeline frame, or null.
export function getClipFrameSource(clip, frame, doc) {
  const entry = getMediaEntry(clip);
  if (!entry) return null;
  const key = clip.source_path;
  if (entry.kind === "image") {
    const img = state.images.get(key);
    return img && img.complete && img.naturalWidth > 0 ? img : null;
  }
  if (entry.kind !== "video") return null;
  const docFps = doc && doc.fps ? doc.fps.num / Math.max(1, doc.fps.den) : 25;
  const v = getVideo(key, entry);
  state.usedThisFrame.add(v);
  if (!state.endScheduled) {
    state.endScheduled = true;
    window.setTimeout(endFrame, 0);
  }
  const target = clipSourceTime(clip, frame, docFps, entry);
  state.stats.frameCalls += 1;
  state.stats.lastTarget = target;
  state.stats.lastFrame = frame;
  state.stats.lastKey = key;
  const tol = state.playing ? 0.25 : 0.5 / Math.max(1, entry.fps || docFps);
  if (state.playing && state.speed === 1) {
    v.playbackRate = Math.max(0.25, Math.min(4, Number(clip.speed_rate) || 1));
    if (Math.abs(v.currentTime - target) > tol && !v.seeking) v.currentTime = target;
    if (v.paused) v.play().catch(() => {});
  } else {
    if (!v.paused) v.pause();
    if (Math.abs(v.currentTime - target) > tol && !v.seeking) v.currentTime = target;
  }
  return v.readyState >= 2 ? v : null;
}

export function getClipThumbnail(clip) {
  if (!clip || !clip.source_path) return null;
  const img = state.thumbs.get(clip.source_path);
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

// Called once per rendered frame after the Program Monitor draw: pause videos not on screen.
export function endFrame() {
  state.endScheduled = false;
  for (const v of state.videos.values()) {
    if (!state.usedThisFrame.has(v) && !v.paused) v.pause();
  }
  state.usedThisFrame.clear();
}

function getAudio(trackKey) {
  let slot = state.audio.get(trackKey);
  if (!slot) {
    const el = document.createElement("audio");
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    hiddenHost().appendChild(el);
    slot = { el, key: "" };
    state.audio.set(trackKey, slot);
  }
  return slot;
}

// Keep one audio element per audio track in sync with the playhead while playing at 1x.
export function syncProjectAudio(doc, frame, speed, trackMix = null) {
  state.playing = speed !== 0;
  state.speed = speed;
  if (!doc || !Array.isArray(doc.tracks) || !hasProjectMedia()) return;
  const docFps = doc.fps ? doc.fps.num / Math.max(1, doc.fps.den) : 25;
  const audible = speed === 1;
  const seen = new Set();
  for (const trk of doc.tracks) {
    if (trk.kind !== "audio") continue;
    const trackKey = `A${trk.index}`;
    seen.add(trackKey);
    const slot = getAudio(trackKey);
    const clip = (trk.clips || []).find(
      (c) => c.enabled !== false && frame >= c.start_frame && frame < c.start_frame + c.duration_frames
    );
    const entry = clip ? getMediaEntry(clip) : null;
    const muted = Boolean(trk.muted) || (trackMix && trackMix[trackKey] && trackMix[trackKey].mute);
    if (!audible || !clip || !entry || muted || (entry.kind === "video" && !entry.has_audio) || entry.kind === "image") {
      if (!slot.el.paused) slot.el.pause();
      continue;
    }
    if (slot.key !== clip.source_path) {
      slot.key = clip.source_path;
      slot.el.src = resolveMediaAssetUrl(entry.url);
    }
    const gainDb = Number(clip.audio_gain_db || 0) + Number(trk.volume_db || 0);
    slot.el.volume = Math.max(0, Math.min(1, Math.pow(10, gainDb / 20)));
    const target = clipSourceTime(clip, frame, docFps, entry);
    if (Math.abs(slot.el.currentTime - target) > 0.2) slot.el.currentTime = target;
    if (slot.el.paused) slot.el.play().catch(() => {});
  }
  for (const [key, slot] of state.audio.entries()) {
    if (!seen.has(key) && !slot.el.paused) slot.el.pause();
  }
  if (!state.playing) {
    for (const v of state.videos.values()) if (!v.paused) v.pause();
  }
}

export async function fetchDemoProject(manifestUrl) {
  const res = await fetch(manifestUrl, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Project manifest HTTP ${res.status}`);
  const manifest = await res.json();
  const base = new URL(".", new URL(manifestUrl, window.location.href)).href;
  return { manifest, base };
}
