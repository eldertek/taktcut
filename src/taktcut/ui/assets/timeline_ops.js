export const SNAP_THRESHOLD_PX = 10;
export const AUDIO_GAIN_DB_MIN = -24;
export const AUDIO_GAIN_DB_MAX = 12;
export const AUDIO_FADE_S_MIN = 0;
export const AUDIO_FADE_S_MAX = 5;
export const AUTO_DUCK_THRESHOLD_DB_MIN = -40;
export const AUTO_DUCK_THRESHOLD_DB_MAX = -6;
export const AUTO_DUCK_THRESHOLD_DB_DEFAULT = -24;
export const AUTO_DUCK_RATIO_MIN = 2.0;
export const AUTO_DUCK_RATIO_MAX = 12.0;
export const AUTO_DUCK_RATIO_DEFAULT = 6.0;
export const AUTO_DUCK_ATTACK_MS_MIN = 10;
export const AUTO_DUCK_ATTACK_MS_MAX = 200;
export const AUTO_DUCK_ATTACK_MS_DEFAULT = 40;
export const AUTO_DUCK_RELEASE_MS_MIN = 100;
export const AUTO_DUCK_RELEASE_MS_MAX = 1500;
export const AUTO_DUCK_RELEASE_MS_DEFAULT = 400;
export const ALLOWED_LOUDNESS_PRESETS = ["off", "youtube_14", "reels_16", "broadcast_23"];
export const ALLOWED_DIALOGUE_EQ_PRESETS = ["off", "voice_clarity", "podcast_warm", "derumble"];
export const LOUDNESS_PRESET_LUFS = {
  youtube_14: -14.0,
  reels_16: -16.0,
  broadcast_23: -23.0
};
export const DIALOGUE_EQ_FILTERS = {
  voice_clarity: "highpass=f=80,equalizer=f=3000:t=q:w=1.2:g=3",
  podcast_warm: "highpass=f=70,equalizer=f=180:t=q:w=1.0:g=2,equalizer=f=4000:t=q:w=1.2:g=2",
  derumble: "highpass=f=100"
};
export const RETIME_SPEED_MIN = 0.25;
export const RETIME_SPEED_MAX = 4.0;
export const TRANSFORM_ZOOM_MIN = 10.0;
export const TRANSFORM_ZOOM_MAX = 300.0;
export const TRANSFORM_ZOOM_DEFAULT = 100.0;
export const TRANSFORM_POS_MIN = -100.0;
export const TRANSFORM_POS_MAX = 100.0;
export const TRANSFORM_POS_DEFAULT = 0.0;
export const TRANSFORM_ROT_MIN = -180.0;
export const TRANSFORM_ROT_MAX = 180.0;
export const TRANSFORM_ROT_DEFAULT = 0.0;
export const TRANSFORM_OPACITY_MIN = 0.0;
export const TRANSFORM_OPACITY_MAX = 100.0;
export const TRANSFORM_OPACITY_DEFAULT = 100.0;
export const DYNAMIC_ZOOM_DEFAULT = "off";
export const DYNAMIC_ZOOM_DEFAULT_DURATION_S = 5.0;
export const DYNAMIC_ZOOM_SCALE_FACTOR = 1.15;
export const DYNAMIC_ZOOM_SCALE_DELTA = 0.15;
export const ALLOWED_DYNAMIC_ZOOM_PRESETS = [
  "off",
  "slow_zoom_in",
  "slow_zoom_out",
  "pan_left_to_right",
  "pan_right_to_left"
];
export const DYNAMIC_ZOOM_PRESETS = [
  { id: "off", label: "Off", label_fr: "Désactivé", shortTag: "OFF" },
  { id: "slow_zoom_in", label: "Slow Zoom In", label_fr: "Zoom Avant Lent", shortTag: "DZ IN" },
  { id: "slow_zoom_out", label: "Slow Zoom Out", label_fr: "Zoom Arrière Lent", shortTag: "DZ OUT" },
  { id: "pan_left_to_right", label: "Pan Left -> Right", label_fr: "Pan Gauche -> Droite", shortTag: "PAN L>R" },
  { id: "pan_right_to_left", label: "Pan Right -> Left", label_fr: "Pan Droite -> Gauche", shortTag: "PAN R>L" }
];
export const TRANSITION_DURATION_MIN_S = 0.1;
export const TRANSITION_DURATION_MAX_S = 2.0;
export const TRANSITION_DURATION_DEFAULT_S = 0.5;
export const BPM_MIN = 60;
export const BPM_MAX = 200;
export const BPM_DEFAULT = 128;
export const BPM_OFFSET_MIN_S = -10.0;
export const BPM_OFFSET_MAX_S = 10.0;
export const BPM_OFFSET_DEFAULT_S = 0.0;
export const SPLIT_WIPE_POS_MIN = 0;
export const SPLIT_WIPE_POS_MAX = 100;
export const SPLIT_WIPE_POS_DEFAULT = 50;
export const SPLIT_WIPE_HIT_RADIUS_PX = 22;

export const MARKER_COLORS = ["Cyan", "Gold", "Red", "Green"];
export const MARKER_COLOR_HEX = {
  Cyan: "#39c5cf",
  Gold: "#e6b842",
  Red: "#e5534b",
  Green: "#3fb950",
  Blue: "#528bff",
  Yellow: "#d29922",
  Purple: "#a371f7"
};

export const CLIP_LABEL_COLORS = Object.freeze({
  default: Object.freeze({
    id: "default",
    label: "Default",
    label_fr: "Par défaut",
    hex: null,
    mutedHex: null
  }),
  blue: Object.freeze({
    id: "blue",
    label: "A-Roll",
    label_fr: "A-Roll",
    hex: "#4c8dff",
    mutedHex: "#31538f"
  }),
  teal: Object.freeze({
    id: "teal",
    label: "B-Roll",
    label_fr: "B-Roll",
    hex: "#2dd4bf",
    mutedHex: "#207b70"
  }),
  amber: Object.freeze({
    id: "amber",
    label: "VFX/GFX",
    label_fr: "VFX/GFX",
    hex: "#f59e0b",
    mutedHex: "#926111"
  }),
  rose: Object.freeze({
    id: "rose",
    label: "Review",
    label_fr: "Révision",
    hex: "#f43f5e",
    mutedHex: "#8d283b"
  }),
  emerald: Object.freeze({
    id: "emerald",
    label: "Audio",
    label_fr: "Audio",
    hex: "#34d399",
    mutedHex: "#247d5d"
  })
});

export const CLIP_LABEL_COLOR_IDS = Object.freeze(Object.keys(CLIP_LABEL_COLORS));

export const TRANSITION_PRESETS = [
  { id: "fade", name: "Cross Dissolve", shortTag: "FADE" },
  { id: "fadeblack", name: "Dip to Black", shortTag: "DIP BLK" },
  { id: "wipeleft", name: "Wipe Left", shortTag: "WIPE L" },
  { id: "slideright", name: "Slide Right", shortTag: "SLIDE R" },
  { id: "zoomin", name: "Smooth Zoom", shortTag: "ZOOM" }
];

export const TRANSFORM_PRESETS = [
  {
    id: "full_frame",
    label: "Full Frame",
    label_fr: "Plein Cadre",
    zoom_pct: 100.0,
    pos_x_pct: 0.0,
    pos_y_pct: 0.0,
    rotation_deg: 0.0,
    opacity_pct: 100.0,
    dynamic_zoom: "off"
  },
  {
    id: "pip_bottom_right",
    label: "PiP Bottom-Right",
    label_fr: "PiP Bas-Droite",
    zoom_pct: 28.0,
    pos_x_pct: 32.0,
    pos_y_pct: 32.0,
    rotation_deg: 0.0,
    opacity_pct: 100.0,
    dynamic_zoom: "off"
  },
  {
    id: "zoom_punch_115",
    label: "Zoom Punch 115%",
    label_fr: "Zoom Punch 115%",
    zoom_pct: 115.0,
    pos_x_pct: 0.0,
    pos_y_pct: 0.0,
    rotation_deg: 0.0,
    opacity_pct: 100.0,
    dynamic_zoom: "off"
  }
];

export const ASPECT_RATIO_PRESETS = [
  { id: "16:9", label: "16:9 1920x1080", width: 1920, height: 1080 },
  { id: "9:16", label: "9:16 1080x1920 Reels/Shorts", width: 1080, height: 1920 },
  { id: "1:1", label: "1:1 1080x1080 Square", width: 1080, height: 1080 },
  { id: "4:5", label: "4:5 1080x1350 Feed", width: 1080, height: 1350 }
];

export const DELIVERY_PRESETS = [
  {
    id: "youtube_1080p_h264",
    label: "YouTube 1080p H.264",
    label_fr: "YouTube 1080p H.264",
    badge: "1080p H.264",
    profile: "web_h264",
    codec_label: "H.264",
    container: "mp4",
    aspect_ratio: "16:9",
    width: 1920,
    height: 1080,
    framing_mode: "fill",
    crf: 18,
    encoder_preset: "medium",
    audio_codec: "aac",
    audio_bitrate_kbps: 192,
    target_lufs: -14.0,
    default_output_path: "renders/youtube_1080p.mp4"
  },
  {
    id: "youtube_4k_hevc",
    label: "YouTube 4K HEVC",
    label_fr: "YouTube 4K HEVC",
    badge: "4K HEVC",
    profile: "master_hevc",
    codec_label: "HEVC",
    container: "mp4",
    aspect_ratio: "16:9",
    width: 3840,
    height: 2160,
    framing_mode: "fill",
    crf: 20,
    encoder_preset: "medium",
    audio_codec: "aac",
    audio_bitrate_kbps: 320,
    target_lufs: -14.0,
    default_output_path: "renders/youtube_4k_hevc.mp4"
  },
  {
    id: "reels_tiktok_9_16",
    label: "Reels / TikTok 9:16",
    label_fr: "Reels / TikTok 9:16",
    badge: "9:16 Social",
    profile: "web_h264",
    codec_label: "H.264",
    container: "mp4",
    aspect_ratio: "9:16",
    width: 1080,
    height: 1920,
    framing_mode: "fill",
    crf: 18,
    encoder_preset: "medium",
    audio_codec: "aac",
    audio_bitrate_kbps: 192,
    target_lufs: -14.0,
    default_output_path: "renders/reels_tiktok_9_16.mp4"
  },
  {
    id: "broadcast_prores_422",
    label: "Broadcast ProRes 422",
    label_fr: "Broadcast ProRes 422",
    badge: "ProRes MOV",
    profile: "prores_hq",
    codec_label: "ProRes 422",
    container: "mov",
    aspect_ratio: "16:9",
    width: 1920,
    height: 1080,
    framing_mode: "fill",
    crf: null,
    encoder_preset: null,
    audio_codec: "pcm_s24le",
    audio_bitrate_kbps: null,
    target_lufs: -23.0,
    default_output_path: "renders/broadcast_prores_422.mov"
  },
  {
    id: "fast_draft_720p",
    label: "Fast Draft 720p",
    label_fr: "Brouillon Rapide 720p",
    badge: "720p Draft",
    profile: "web_h264",
    codec_label: "H.264",
    container: "mp4",
    aspect_ratio: "16:9",
    width: 1280,
    height: 720,
    framing_mode: "fill",
    crf: 26,
    encoder_preset: "fast",
    audio_codec: "aac",
    audio_bitrate_kbps: 128,
    target_lufs: -14.0,
    default_output_path: "renders/fast_draft_720p.mp4"
  }
];

const DELIVERY_PRESET_MAP = new Map(DELIVERY_PRESETS.map((p) => [p.id, p]));

export function getDeliveryPresetClient(presetId) {
  const clean = typeof presetId === "string" ? presetId.trim().toLowerCase() : "";
  return DELIVERY_PRESET_MAP.get(clean) || null;
}

const ASPECT_PRESET_MAP = new Map(ASPECT_RATIO_PRESETS.map((p) => [p.id, p]));

export function getAspectRatioPreset(presetId) {
  const clean = typeof presetId === "string" ? presetId.trim() : "";
  return ASPECT_PRESET_MAP.get(clean) || ASPECT_RATIO_PRESETS[0];
}

export function compileFramingFilterClient(params) {
  const p = params || {};
  const preset = getAspectRatioPreset(p.preset || p.aspect_preset || "16:9");
  const mode = typeof p.mode === "string" && p.mode.trim().toLowerCase() === "fit" ? "fit" : "fill";
  const enabled = p.enabled !== false;
  const panX = clampNum(Number.isFinite(Number(p.pan_x)) ? Number(p.pan_x) : 0, -1, 1);
  const panY = clampNum(Number.isFinite(Number(p.pan_y)) ? Number(p.pan_y) : 0, -1, 1);
  const hasCustomW = Number.isInteger(p.target_width) && p.target_width >= 128 && p.target_width <= 7680 && p.target_width % 2 === 0;
  const hasCustomH = Number.isInteger(p.target_height) && p.target_height >= 128 && p.target_height <= 7680 && p.target_height % 2 === 0;
  const w = hasCustomW && hasCustomH ? p.target_width : preset.width;
  const h = hasCustomW && hasCustomH ? p.target_height : preset.height;

  if (!enabled) {
    return {
      filtergraph: "",
      ffmpeg_vf_args: [],
      target_width: w,
      target_height: h,
      is_identity: true,
      params: { preset: preset.id, mode, pan_x: panX, pan_y: panY, enabled: false }
    };
  }

  let fg = "";
  if (mode === "fill") {
    const xExpr =
      Math.abs(panX) <= 1e-6 ? `(iw-${w})/2` : `(iw-${w})/2*(1+(${panX.toFixed(4)}))`;
    const yExpr =
      Math.abs(panY) <= 1e-6 ? `(ih-${h})/2` : `(ih-${h})/2*(1+(${panY.toFixed(4)}))`;
    fg =
      `scale=w=${w}:h=${h}:force_original_aspect_ratio=increase:force_divisible_by=2:flags=lanczos,` +
      `crop=w=${w}:h=${h}:x=${xExpr}:y=${yExpr},setsar=1`;
  } else {
    fg =
      `scale=w=${w}:h=${h}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos,` +
      `pad=w=${w}:h=${h}:x=(ow-iw)/2:y=(oh-ih)/2:color=black,setsar=1`;
  }
  return {
    filtergraph: fg,
    ffmpeg_vf_args: ["-vf", fg],
    target_width: w,
    target_height: h,
    is_identity: false,
    params: { preset: preset.id, mode, pan_x: panX, pan_y: panY, enabled: true }
  };
}

const ALLOWED_TRANSITION_IDS = new Set(TRANSITION_PRESETS.map((p) => p.id));

function clampNum(val, minVal, maxVal) {
  return Math.min(maxVal, Math.max(minVal, val));
}

export function normalizeClipAudio(clip) {
  const rawGain = clip && Number.isFinite(Number(clip.audio_gain_db)) ? Number(clip.audio_gain_db) : 0;
  const rawIn = clip && Number.isFinite(Number(clip.fade_in_s)) ? Number(clip.fade_in_s) : 0;
  const rawOut = clip && Number.isFinite(Number(clip.fade_out_s)) ? Number(clip.fade_out_s) : 0;
  return {
    gainDb: clampNum(rawGain, AUDIO_GAIN_DB_MIN, AUDIO_GAIN_DB_MAX),
    fadeInS: clampNum(rawIn, AUDIO_FADE_S_MIN, AUDIO_FADE_S_MAX),
    fadeOutS: clampNum(rawOut, AUDIO_FADE_S_MIN, AUDIO_FADE_S_MAX)
  };
}

export function normalizeClipRetime(clip) {
  const rawSpeed =
    clip && clip.speed_rate !== undefined && clip.speed_rate !== null && Number.isFinite(Number(clip.speed_rate))
      ? Number(clip.speed_rate)
      : 1.0;
  return {
    speedRate: Number(clampNum(rawSpeed, RETIME_SPEED_MIN, RETIME_SPEED_MAX).toFixed(2)),
    reverse: Boolean(clip && clip.reverse)
  };
}

export function formatRetimeSpeedValue(speedRate) {
  const clamped = clampNum(
    Number.isFinite(Number(speedRate)) ? Number(speedRate) : 1.0,
    RETIME_SPEED_MIN,
    RETIME_SPEED_MAX
  );
  const rounded = Number(clamped.toFixed(2));
  return Number.isInteger(rounded * 10) ? `${rounded.toFixed(1)}x` : `${rounded.toFixed(2)}x`;
}

export function formatRetimeBadgeText(speedRate, reverse) {
  const speedText = formatRetimeSpeedValue(speedRate);
  return reverse ? `${speedText} REV` : speedText;
}

export function buildAtempoStagesClient(speedRate) {
  const rate = clampNum(
    Number.isFinite(Number(speedRate)) ? Number(speedRate) : 1.0,
    RETIME_SPEED_MIN,
    RETIME_SPEED_MAX
  );
  if (Math.abs(rate - 1.0) <= 1e-6) return [];
  const stages = [];
  let rem = rate;
  if (rem < 1.0) {
    while (rem < 0.5 - 1e-9) {
      stages.push(0.5);
      rem /= 0.5;
    }
    if (Math.abs(rem - 1.0) > 1e-6) {
      stages.push(rem);
    }
  } else {
    while (rem > 2.0 + 1e-9) {
      stages.push(2.0);
      rem /= 2.0;
    }
    if (Math.abs(rem - 1.0) > 1e-6) {
      stages.push(rem);
    }
  }
  return stages;
}

export function compileRetimeFilterClient(params) {
  const p = params || {};
  const norm = normalizeClipRetime(p);
  const speedRate = norm.speedRate;
  const reverse = norm.reverse;
  const isIdentity = !reverse && Math.abs(speedRate - 1.0) <= 1e-6;

  const vfParts = [];
  const afParts = [];
  if (!isIdentity) {
    if (Math.abs(speedRate - 1.0) > 1e-6) {
      const ptsScale = 1.0 / speedRate;
      vfParts.push(`setpts=${ptsScale.toFixed(6)}*PTS`);
      for (const stage of buildAtempoStagesClient(speedRate)) {
        afParts.push(`atempo=${stage.toFixed(4)}`);
      }
    }
    if (reverse) {
      vfParts.push("reverse");
      afParts.push("areverse");
    }
  }

  const videoFiltergraph = vfParts.join(",");
  const audioFiltergraph = afParts.join(",");
  return {
    video_filtergraph: videoFiltergraph,
    audio_filtergraph: audioFiltergraph,
    ffmpeg_vf_args: videoFiltergraph ? ["-vf", videoFiltergraph] : [],
    ffmpeg_af_args: audioFiltergraph ? ["-af", audioFiltergraph] : [],
    is_identity: isIdentity,
    params: { speed_rate: speedRate, reverse }
  };
}

export function normalizeDynamicZoomPreset(raw) {
  const cleaned = typeof raw === "string" ? raw.trim().toLowerCase() : DYNAMIC_ZOOM_DEFAULT;
  return ALLOWED_DYNAMIC_ZOOM_PRESETS.includes(cleaned) ? cleaned : DYNAMIC_ZOOM_DEFAULT;
}

export function getDynamicZoomShortTag(presetId) {
  const clean = normalizeDynamicZoomPreset(presetId);
  const found = DYNAMIC_ZOOM_PRESETS.find((p) => p.id === clean);
  return found ? found.shortTag : "OFF";
}

export function normalizeClipTransform(clipOrTransform) {
  const src =
    clipOrTransform && clipOrTransform.transform && typeof clipOrTransform.transform === "object"
      ? clipOrTransform.transform
      : clipOrTransform &&
          (clipOrTransform.zoom_pct !== undefined ||
            clipOrTransform.pos_x_pct !== undefined ||
            clipOrTransform.pos_y_pct !== undefined ||
            clipOrTransform.rotation_deg !== undefined ||
            clipOrTransform.opacity_pct !== undefined ||
            clipOrTransform.dynamic_zoom !== undefined)
        ? clipOrTransform
        : {};
  const numOr = (raw, fallback) =>
    raw !== undefined && raw !== null && Number.isFinite(Number(raw)) ? Number(raw) : fallback;
  const zoom = clampNum(numOr(src.zoom_pct, TRANSFORM_ZOOM_DEFAULT), TRANSFORM_ZOOM_MIN, TRANSFORM_ZOOM_MAX);
  const posX = clampNum(numOr(src.pos_x_pct, TRANSFORM_POS_DEFAULT), TRANSFORM_POS_MIN, TRANSFORM_POS_MAX);
  const posY = clampNum(numOr(src.pos_y_pct, TRANSFORM_POS_DEFAULT), TRANSFORM_POS_MIN, TRANSFORM_POS_MAX);
  const rot = clampNum(numOr(src.rotation_deg, TRANSFORM_ROT_DEFAULT), TRANSFORM_ROT_MIN, TRANSFORM_ROT_MAX);
  const opacity = clampNum(
    numOr(src.opacity_pct, TRANSFORM_OPACITY_DEFAULT),
    TRANSFORM_OPACITY_MIN,
    TRANSFORM_OPACITY_MAX
  );
  const dynamicZoom = normalizeDynamicZoomPreset(src.dynamic_zoom);
  return {
    zoom_pct: Number(zoom.toFixed(1)),
    pos_x_pct: Number(posX.toFixed(1)),
    pos_y_pct: Number(posY.toFixed(1)),
    rotation_deg: Number(rot.toFixed(1)),
    opacity_pct: Number(opacity.toFixed(1)),
    dynamic_zoom: dynamicZoom
  };
}

export function hasStaticClipTransform(transformOrClip) {
  const norm = normalizeClipTransform(transformOrClip);
  return !(
    Math.abs(norm.zoom_pct - 100.0) <= 1e-4 &&
    Math.abs(norm.pos_x_pct) <= 1e-4 &&
    Math.abs(norm.pos_y_pct) <= 1e-4 &&
    Math.abs(norm.rotation_deg) <= 1e-4 &&
    Math.abs(norm.opacity_pct - 100.0) <= 1e-4
  );
}

export function isClipTransformIdentity(transformOrClip) {
  const norm = normalizeClipTransform(transformOrClip);
  return !hasStaticClipTransform(norm) && norm.dynamic_zoom === DYNAMIC_ZOOM_DEFAULT;
}

export function getTransformPresetClient(presetId) {
  const clean = typeof presetId === "string" ? presetId.trim().toLowerCase() : "";
  return TRANSFORM_PRESETS.find((p) => p.id === clean) || null;
}

export function formatTransformBadgeText(transformOrClip) {
  const norm = normalizeClipTransform(transformOrClip);
  if (isClipTransformIdentity(norm)) {
    return "100% | 0,0";
  }
  const parts = [`${Math.round(norm.zoom_pct)}%`];
  if (Math.abs(norm.pos_x_pct) > 0.05 || Math.abs(norm.pos_y_pct) > 0.05) {
    const sx = norm.pos_x_pct >= 0 ? `+${Math.round(norm.pos_x_pct)}` : `${Math.round(norm.pos_x_pct)}`;
    const sy = norm.pos_y_pct >= 0 ? `+${Math.round(norm.pos_y_pct)}` : `${Math.round(norm.pos_y_pct)}`;
    parts.push(`(${sx},${sy})`);
  }
  if (Math.abs(norm.rotation_deg) > 0.05) {
    parts.push(`${norm.rotation_deg.toFixed(0)}deg`);
  }
  if (Math.abs(norm.opacity_pct - 100.0) > 0.05) {
    parts.push(`${Math.round(norm.opacity_pct)}%OP`);
  }
  if (norm.dynamic_zoom && norm.dynamic_zoom !== DYNAMIC_ZOOM_DEFAULT) {
    parts.push(getDynamicZoomShortTag(norm.dynamic_zoom));
  }
  return parts.join(" ");
}

export function compileDynamicZoomFilterClient(presetId, clipDurationS = null) {
  const clean = normalizeDynamicZoomPreset(presetId);
  if (clean === DYNAMIC_ZOOM_DEFAULT) return null;
  const durS =
    clipDurationS !== null && clipDurationS !== undefined && Number.isFinite(Number(clipDurationS)) && Number(clipDurationS) > 0
      ? Math.max(0.1, Number(clipDurationS))
      : DYNAMIC_ZOOM_DEFAULT_DURATION_S;
  const progressExpr = `min(1,t/${durS.toFixed(3)})`;
  const scaleStr = DYNAMIC_ZOOM_SCALE_FACTOR.toFixed(2);
  const deltaStr = DYNAMIC_ZOOM_SCALE_DELTA.toFixed(2);
  if (clean === "slow_zoom_in") {
    const scaleExpr = `1+${deltaStr}*${progressExpr}`;
    return (
      "split[dz_ref][dz_src];" +
      `[dz_src]scale=w='trunc(iw*(${scaleExpr})/2)*2':h='trunc(ih*(${scaleExpr})/2)*2':eval=frame:flags=lanczos[dz_sc];` +
      "[dz_ref][dz_sc]overlay=x='(W-w)/2':y='(H-h)/2':shortest=1,setsar=1"
    );
  }
  if (clean === "slow_zoom_out") {
    const scaleExpr = `${scaleStr}-${deltaStr}*${progressExpr}`;
    return (
      "split[dz_ref][dz_src];" +
      `[dz_src]scale=w='trunc(iw*(${scaleExpr})/2)*2':h='trunc(ih*(${scaleExpr})/2)*2':eval=frame:flags=lanczos[dz_sc];` +
      "[dz_ref][dz_sc]overlay=x='(W-w)/2':y='(H-h)/2':shortest=1,setsar=1"
    );
  }
  if (clean === "pan_left_to_right") {
    return (
      `scale=w=ceil(iw*${scaleStr}/2)*2:h=ceil(ih*${scaleStr}/2)*2:flags=lanczos,` +
      `crop=w=trunc(iw/${scaleStr}/2)*2:h=trunc(ih/${scaleStr}/2)*2:` +
      `x='(iw-ow)*${progressExpr}':y='(ih-oh)/2',setsar=1`
    );
  }
  return (
    `scale=w=ceil(iw*${scaleStr}/2)*2:h=ceil(ih*${scaleStr}/2)*2:flags=lanczos,` +
    `crop=w=trunc(iw/${scaleStr}/2)*2:h=trunc(ih/${scaleStr}/2)*2:` +
    `x='(iw-ow)*(1-${progressExpr})':y='(ih-oh)/2',setsar=1`
  );
}

export function compileTransformFilterClient(params, pixFmt = null, clipDurationS = null) {
  const norm = normalizeClipTransform(params);
  const isIdentity = isClipTransformIdentity(norm);
  if (isIdentity) {
    return {
      filtergraph: "",
      ffmpeg_vf_args: [],
      is_identity: true,
      params: norm
    };
  }
  if (norm.opacity_pct <= 1e-6) {
    const parts = ["drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill", "setsar=1"];
    if (pixFmt) parts.push(`format=${pixFmt}`);
    const fg = parts.join(",");
    return {
      filtergraph: fg,
      ffmpeg_vf_args: ["-vf", fg],
      is_identity: false,
      params: norm
    };
  }
  const dzGraph = compileDynamicZoomFilterClient(norm.dynamic_zoom, clipDurationS);
  if (!hasStaticClipTransform(norm) && dzGraph) {
    const fg = pixFmt ? `${dzGraph},format=${pixFmt}` : dzGraph;
    return {
      filtergraph: fg,
      ffmpeg_vf_args: ["-vf", fg],
      is_identity: false,
      params: norm
    };
  }
  const fgSteps = [];
  if (Math.abs(norm.zoom_pct - 100.0) > 1e-4) {
    const zScale = norm.zoom_pct / 100.0;
    fgSteps.push(
      `scale=w=ceil(iw*${zScale.toFixed(6)}/2)*2:h=ceil(ih*${zScale.toFixed(6)}/2)*2:flags=lanczos`
    );
  }
  const hasRot = Math.abs(norm.rotation_deg) > 1e-4;
  const hasOpacity = Math.abs(norm.opacity_pct - 100.0) > 1e-4;
  if (hasRot || hasOpacity) {
    fgSteps.push("format=yuva420p");
  }
  if (hasRot) {
    const rad = (norm.rotation_deg * Math.PI) / 180.0;
    fgSteps.push(`rotate=${rad.toFixed(6)}:ow=rotw(${rad.toFixed(6)}):oh=roth(${rad.toFixed(6)}):c=black@0`);
  }
  if (hasOpacity) {
    const alpha = norm.opacity_pct / 100.0;
    fgSteps.push(`colorchannelmixer=aa=${alpha.toFixed(4)}`);
  }
  const dx = norm.pos_x_pct / 100.0;
  const dy = norm.pos_y_pct / 100.0;
  const xExpr = Math.abs(dx) <= 1e-6 ? "(W-w)/2" : `(W-w)/2+W*(${dx.toFixed(4)})`;
  const yExpr = Math.abs(dy) <= 1e-6 ? "(H-h)/2" : `(H-h)/2+H*(${dy.toFixed(4)})`;
  const fgChain = fgSteps.join(",");
  let graph = fgChain
    ? `split[xf_bg][xf_fg];[xf_bg]drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill[xf_blk];[xf_fg]${fgChain}[xf_ov];[xf_blk][xf_ov]overlay=x=${xExpr}:y=${yExpr}:shortest=1,setsar=1`
    : `split[xf_bg][xf_fg];[xf_bg]drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill[xf_blk];[xf_blk][xf_fg]overlay=x=${xExpr}:y=${yExpr}:shortest=1,setsar=1`;
  if (dzGraph) graph = `${dzGraph},${graph}`;
  if (pixFmt) graph = `${graph},format=${pixFmt}`;
  return {
    filtergraph: graph,
    ffmpeg_vf_args: ["-vf", graph],
    is_identity: false,
    params: norm
  };
}

export function isTrackAudiblyMuted(track, allTracks) {
  if (!track) return false;
  if (track.muted) return true;
  const anySolo = Array.isArray(allTracks) && allTracks.some((t) => Boolean(t && t.solo));
  return anySolo && !track.solo;
}

export function normalizeFairlightAudioParams(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const rawLoud = typeof src.loudness_preset === "string" ? src.loudness_preset.trim().toLowerCase() : "off";
  const rawEq = typeof src.dialogue_eq === "string" ? src.dialogue_eq.trim().toLowerCase() : "off";
  return {
    loudness_preset: ALLOWED_LOUDNESS_PRESETS.includes(rawLoud) ? rawLoud : "off",
    dialogue_eq: ALLOWED_DIALOGUE_EQ_PRESETS.includes(rawEq) ? rawEq : "off"
  };
}

export function compileFairlightAudioFilterClient(params) {
  const norm = normalizeFairlightAudioParams(params);
  const parts = [];
  if (norm.dialogue_eq !== "off" && DIALOGUE_EQ_FILTERS[norm.dialogue_eq]) {
    parts.push(DIALOGUE_EQ_FILTERS[norm.dialogue_eq]);
  }
  if (norm.loudness_preset !== "off" && Object.hasOwn(LOUDNESS_PRESET_LUFS, norm.loudness_preset)) {
    const lufs = LOUDNESS_PRESET_LUFS[norm.loudness_preset];
    parts.push(`loudnorm=I=${lufs.toFixed(1)}:TP=-1.0:LRA=11`);
  }
  const filtergraph = parts.join(",");
  return {
    filtergraph,
    ffmpeg_af_args: filtergraph ? ["-af", filtergraph] : [],
    is_identity: filtergraph === "",
    params: norm
  };
}

export function compileAudioFilterClient(
  params,
  clipDurationS = null,
  targetLufs = null,
  fairlightParams = null
) {
  const p = params || {};
  const gainDb = clampNum(
    Number.isFinite(Number(p.gain_db)) ? Number(p.gain_db) : 0,
    AUDIO_GAIN_DB_MIN,
    AUDIO_GAIN_DB_MAX
  );
  const fadeInS = clampNum(
    Number.isFinite(Number(p.fade_in_s)) ? Number(p.fade_in_s) : 0,
    AUDIO_FADE_S_MIN,
    AUDIO_FADE_S_MAX
  );
  const fadeOutS = clampNum(
    Number.isFinite(Number(p.fade_out_s)) ? Number(p.fade_out_s) : 0,
    AUDIO_FADE_S_MIN,
    AUDIO_FADE_S_MAX
  );
  const muted = Boolean(p.muted);
  const dur =
    clipDurationS !== null && clipDurationS !== undefined && Number.isFinite(Number(clipDurationS)) && Number(clipDurationS) > 0
      ? Number(clipDurationS)
      : null;
  const fairlight = normalizeFairlightAudioParams(fairlightParams);

  const parts = [];
  if (muted) {
    parts.push("volume=0");
  } else {
    if (Math.abs(gainDb) > 1e-6) {
      parts.push(`volume=${gainDb.toFixed(2)}dB`);
    }
    if (fadeInS > 1e-6) {
      const inD = dur !== null ? Math.min(fadeInS, dur) : fadeInS;
      if (inD > 1e-6) parts.push(`afade=t=in:st=0.000:d=${inD.toFixed(3)}`);
    }
    if (fadeOutS > 1e-6 && dur !== null) {
      const outD = Math.min(fadeOutS, dur);
      const outSt = Math.max(0, dur - outD);
      if (outD > 1e-6) parts.push(`afade=t=out:st=${outSt.toFixed(3)}:d=${outD.toFixed(3)}`);
    }
    if (fairlight.dialogue_eq !== "off" && DIALOGUE_EQ_FILTERS[fairlight.dialogue_eq]) {
      parts.push(DIALOGUE_EQ_FILTERS[fairlight.dialogue_eq]);
    }
    if (
      fairlight.loudness_preset !== "off" &&
      Object.hasOwn(LOUDNESS_PRESET_LUFS, fairlight.loudness_preset)
    ) {
      const presetLufs = LOUDNESS_PRESET_LUFS[fairlight.loudness_preset];
      parts.push(`loudnorm=I=${presetLufs.toFixed(1)}:TP=-1.0:LRA=11`);
    } else if (targetLufs !== null && targetLufs !== undefined && Number.isFinite(Number(targetLufs))) {
      const lufs = Number(targetLufs);
      const lra = lufs >= -16.0 ? 11.0 : 7.0;
      parts.push(`loudnorm=I=${lufs.toFixed(1)}:TP=-1.0:LRA=${lra.toFixed(1)}`);
    }
  }
  const filtergraph = parts.join(",");
  return {
    filtergraph,
    ffmpeg_af_args: filtergraph ? ["-af", filtergraph] : [],
    is_identity: filtergraph === "",
    params: { gain_db: gainDb, fade_in_s: fadeInS, fade_out_s: fadeOutS, muted },
    loudness_preset: fairlight.loudness_preset,
    dialogue_eq: fairlight.dialogue_eq
  };
}

export function compileVideoFadeFilterClient(params, clipDurationS = null) {
  const p = params && typeof params === "object" ? params : {};
  const rawIn = Number(p.fade_in_s ?? p.fade_in_sec ?? 0);
  const rawOut = Number(p.fade_out_s ?? p.fade_out_sec ?? 0);
  const fadeInS = clampNum(
    Number.isFinite(rawIn) ? rawIn : 0,
    AUDIO_FADE_S_MIN,
    AUDIO_FADE_S_MAX
  );
  const fadeOutS = clampNum(
    Number.isFinite(rawOut) ? rawOut : 0,
    AUDIO_FADE_S_MIN,
    AUDIO_FADE_S_MAX
  );
  const dur =
    clipDurationS !== null &&
    clipDurationS !== undefined &&
    Number.isFinite(Number(clipDurationS)) &&
    Number(clipDurationS) > 0
      ? Number(clipDurationS)
      : null;

  let fadeInD = dur !== null && fadeInS > 1e-6 ? Math.min(fadeInS, dur) : fadeInS > 1e-6 ? fadeInS : 0;
  let fadeOutD = dur !== null && fadeOutS > 1e-6 ? Math.min(fadeOutS, dur) : 0;
  if (dur !== null && fadeInD + fadeOutD > dur && fadeInD + fadeOutD > 1e-6) {
    const scale = dur / (fadeInD + fadeOutD);
    fadeInD *= scale;
    fadeOutD *= scale;
  }

  const parts = [];
  if (fadeInD > 1e-6) {
    parts.push(`fade=t=in:st=0.000:d=${fadeInD.toFixed(3)}`);
  }
  if (fadeOutD > 1e-6 && dur !== null) {
    const fadeOutSt = Math.max(0, dur - fadeOutD);
    parts.push(`fade=t=out:st=${fadeOutSt.toFixed(3)}:d=${fadeOutD.toFixed(3)}`);
  }
  const filtergraph = parts.join(",");
  return {
    filtergraph,
    ffmpeg_vf_args: filtergraph ? ["-vf", filtergraph] : [],
    is_identity: filtergraph === "",
    params: { fade_in_s: fadeInS, fade_out_s: fadeOutS }
  };
}

export function normalizeAutoDuckParams(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const enabled = Boolean(src.enabled);
  const rawThresh = Number(src.threshold_db);
  const thresholdDb = Number.isFinite(rawThresh)
    ? clampNum(rawThresh, AUTO_DUCK_THRESHOLD_DB_MIN, AUTO_DUCK_THRESHOLD_DB_MAX)
    : AUTO_DUCK_THRESHOLD_DB_DEFAULT;
  const rawRatio = Number(src.ratio);
  const ratio = Number.isFinite(rawRatio)
    ? clampNum(rawRatio, AUTO_DUCK_RATIO_MIN, AUTO_DUCK_RATIO_MAX)
    : AUTO_DUCK_RATIO_DEFAULT;
  const rawAttack = Number(src.attack_ms);
  const attackMs = Number.isFinite(rawAttack)
    ? clampNum(rawAttack, AUTO_DUCK_ATTACK_MS_MIN, AUTO_DUCK_ATTACK_MS_MAX)
    : AUTO_DUCK_ATTACK_MS_DEFAULT;
  const rawRelease = Number(src.release_ms);
  const releaseMs = Number.isFinite(rawRelease)
    ? clampNum(rawRelease, AUTO_DUCK_RELEASE_MS_MIN, AUTO_DUCK_RELEASE_MS_MAX)
    : AUTO_DUCK_RELEASE_MS_DEFAULT;

  return {
    enabled,
    threshold_db: Number(thresholdDb.toFixed(1)),
    ratio: Number(ratio.toFixed(2)),
    attack_ms: Number(attackMs.toFixed(1)),
    release_ms: Number(releaseMs.toFixed(1))
  };
}

export function compileAutoDuckFilterClient(params, opts = {}) {
  const norm = normalizeAutoDuckParams(params);
  const threshLin = Math.pow(10, norm.threshold_db / 20);
  if (!norm.enabled) {
    return {
      filtergraph: "",
      ffmpeg_args: [],
      threshold_linear: Number(threshLin.toFixed(6)),
      is_identity: true,
      params: norm
    };
  }
  const musicPad = typeof opts.music_pad === "string" && opts.music_pad ? opts.music_pad : "0:a";
  const sidechainPad =
    typeof opts.sidechain_pad === "string" && opts.sidechain_pad ? opts.sidechain_pad : "1:a";
  const outPad = typeof opts.output_pad === "string" && opts.output_pad ? opts.output_pad : "aout";
  const sc =
    `sidechaincompress=threshold=${threshLin.toFixed(6)}:` +
    `ratio=${norm.ratio.toFixed(2)}:attack=${norm.attack_ms.toFixed(1)}:release=${norm.release_ms.toFixed(1)}`;
  const fg = opts.mix_sidechain
    ? `[${sidechainPad}]asplit[sc_trig][sc_vo];[${musicPad}][sc_trig]${sc}[ducked_mx];[ducked_mx][sc_vo]amix=inputs=2:duration=longest:normalize=0[${outPad}]`
    : `[${musicPad}][${sidechainPad}]${sc}[${outPad}]`;
  return {
    filtergraph: fg,
    ffmpeg_args: ["-filter_complex", fg, "-map", `[${outPad}]`],
    threshold_linear: Number(threshLin.toFixed(6)),
    is_identity: false,
    params: norm
  };
}

export function evaluateClipFadeEnvelope(clip, frame, fpsRate = 25) {
  if (!clip || clip.enabled === false) return 0;
  const durFrames = Math.max(0, Number(clip.duration_frames) || 0);
  if (durFrames <= 0) return 0;
  const startF = Number(clip.start_frame) || 0;
  const f = Number(frame);
  if (!Number.isFinite(f) || f < startF || f >= startF + durFrames) return 0;

  const rate = Math.max(1, Number(fpsRate) || 25);
  const durS = durFrames / rate;
  const tInS = (f - startF) / rate;
  const tRemS = Math.max(0, durS - tInS);
  const norm = normalizeClipAudio(clip);
  let fadeInS = norm.fadeInS;
  let fadeOutS = norm.fadeOutS;
  if (fadeInS + fadeOutS > durS && durS > 0) {
    const scale = durS / (fadeInS + fadeOutS);
    fadeInS *= scale;
    fadeOutS *= scale;
  }
  const inEnv = fadeInS > 1e-6 && tInS < fadeInS ? clampNum(tInS / fadeInS, 0, 1) : 1.0;
  const outEnv = fadeOutS > 1e-6 && tRemS < fadeOutS ? clampNum(tRemS / fadeOutS, 0, 1) : 1.0;
  return clampNum(inEnv * outEnv, 0, 1);
}

function isMusicBedTrack(track, allAudioTracks) {
  if (!track) return false;
  const name = String(track.name || "").toLowerCase();
  if (name.includes("music") || name.includes("mx") || name.includes("bed") || name.includes("bgm")) {
    return true;
  }
  return Array.isArray(allAudioTracks) && allAudioTracks.length > 1 && Number(track.index) > 1;
}

export function evaluateTimelineAudioLevels(doc, frame, opts = {}) {
  const isPlaying = Boolean(opts.isPlaying);
  const phaseSec = Number.isFinite(Number(opts.phaseSec)) ? Number(opts.phaseSec) : 0;
  const autoDuck = normalizeAutoDuckParams(opts.autoDuck);
  const tracks = doc && Array.isArray(doc.tracks) ? doc.tracks : [];
  const audioTracks = tracks.filter((trk) => trk && trk.kind === "audio");
  const fpsRate =
    doc && doc.fps ? Math.max(1, Number(doc.fps.num || 25) / Math.max(1, Number(doc.fps.den || 1))) : 25;

  const audibleAudioTracks = audioTracks.filter((trk) => !isTrackAudiblyMuted(trk, tracks));
  const allAudioMuted = audioTracks.length > 0 && audibleAudioTracks.length === 0;

  if (!doc || !isPlaying || audibleAudioTracks.length === 0) {
    return {
      leftDb: -60,
      rightDb: -60,
      peakDb: -60,
      leftLin: 0,
      rightLin: 0,
      duckReductionDb: 0,
      activeClipCount: 0,
      allAudioMuted
    };
  }

  let fgLeft = 0;
  let fgRight = 0;
  let bgLeft = 0;
  let bgRight = 0;
  let activeClipCount = 0;
  const tBase = frame / fpsRate + phaseSec * 0.15;

  for (const trk of audibleAudioTracks) {
    const isBed = isMusicBedTrack(trk, audioTracks);
    for (const clip of trk.clips || []) {
      if (clip.enabled === false) continue;
      if (frame < clip.start_frame || frame >= clip.start_frame + clip.duration_frames) continue;
      const env = evaluateClipFadeEnvelope(clip, frame, fpsRate);
      if (env <= 1e-6) continue;
      activeClipCount += 1;
      const norm = normalizeClipAudio(clip);
      const gainLin = Math.pow(10, norm.gainDb / 20);
      const seed = (Number(trk.index) || 1) * 1.37 + (Number(clip.start_frame) || 0) * 0.03;

      let modL;
      let modR;
      if (isBed) {
        // Music stem: steady groove with gentle stereo width modulation
        const beat = 0.62 + 0.24 * Math.abs(Math.sin(tBase * 3.1 + seed)) + 0.14 * Math.sin(tBase * 6.2 + seed);
        modL = clampNum(0.21 * beat * (0.94 + 0.08 * Math.sin(tBase * 4.9 + seed)), 0.02, 0.55);
        modR = clampNum(0.21 * beat * (0.94 + 0.08 * Math.cos(tBase * 5.3 + seed + 0.6)), 0.02, 0.55);
      } else {
        // Dialogue / VO stem: natural syllabic speech cadence with slight stereo presence
        const speechGate = Math.max(0.18, 0.55 + 0.45 * Math.sin(tBase * 4.4 + seed));
        const syllabic = 0.52 + 0.34 * Math.sin(tBase * 9.7 + seed) + 0.14 * Math.cos(tBase * 14.3 + seed);
        const baseVo = clampNum(0.28 * speechGate * Math.max(0.2, syllabic), 0.02, 0.72);
        modL = baseVo * (0.97 + 0.04 * Math.sin(tBase * 7.1 + seed));
        modR = baseVo * (0.97 + 0.04 * Math.cos(tBase * 6.8 + seed + 0.35));
      }

      const clipL = modL * gainLin * env;
      const clipR = modR * gainLin * env;
      if (isBed) {
        bgLeft += clipL;
        bgRight += clipR;
      } else {
        fgLeft += clipL;
        fgRight += clipR;
      }
    }
  }

  let duckReductionDb = 0;
  if (autoDuck.enabled && (fgLeft > 1e-6 || fgRight > 1e-6) && (bgLeft > 1e-6 || bgRight > 1e-6)) {
    const fgPeakLin = Math.max(fgLeft, fgRight);
    const fgDb = 20 * Math.log10(Math.max(1e-5, fgPeakLin));
    if (fgDb > autoDuck.threshold_db) {
      const overshoot = fgDb - autoDuck.threshold_db;
      const reduction = Math.min(24, overshoot * (1 - 1 / autoDuck.ratio));
      if (reduction > 0.05) {
        duckReductionDb = -Number(reduction.toFixed(1));
        const duckScale = Math.pow(10, duckReductionDb / 20);
        bgLeft *= duckScale;
        bgRight *= duckScale;
      }
    }
  }

  const totalL = clampNum(fgLeft + bgLeft, 0, 1.0);
  const totalR = clampNum(fgRight + bgRight, 0, 1.0);
  const leftDb = totalL > 1e-3 ? clampNum(20 * Math.log10(totalL), -60, 0) : -60;
  const rightDb = totalR > 1e-3 ? clampNum(20 * Math.log10(totalR), -60, 0) : -60;
  const peakDb = Math.max(leftDb, rightDb);

  return {
    leftDb,
    rightDb,
    peakDb,
    leftLin: totalL,
    rightLin: totalR,
    duckReductionDb,
    activeClipCount,
    allAudioMuted
  };
}

export function cloneTimelineDoc(doc) {
  if (!doc) return null;
  if (typeof structuredClone === "function") {
    return structuredClone(doc);
  }
  return JSON.parse(JSON.stringify(doc));
}

export function computeTimelineMaxFrame(doc) {
  if (!doc) return 1;
  let maxEnd = doc.start_frame || 0;
  for (const trk of doc.tracks || []) {
    for (const c of trk.clips || []) {
      const endF = c.start_frame + c.duration_frames;
      if (endF > maxEnd) maxEnd = endF;
    }
  }
  for (const mk of doc.markers || []) {
    const endMk = mk.frame + (mk.duration_frames || 1);
    if (endMk > maxEnd) maxEnd = endMk;
  }
  return Math.max(1, maxEnd);
}

export function validateTimelineClient(doc) {
  const issues = [];
  let totalClips = 0;
  for (const trk of doc.tracks || []) {
    const ordered = [...(trk.clips || [])].sort(
      (a, b) => a.start_frame - b.start_frame || a.duration_frames - b.duration_frames
    );
    totalClips += ordered.length;
    let prevEnd = null;
    for (const clip of ordered) {
      const endEx = clip.start_frame + clip.duration_frames;
      if (clip.duration_frames <= 0) {
        issues.push({
          kind: "zero_duration",
          track_kind: trk.kind,
          track_index: trk.index,
          start_frame: clip.start_frame,
          end_frame: endEx,
          detail: `Clip '${clip.name}' has non-positive duration (${clip.duration_frames} frames)`
        });
      }
      if (clip.source_fps) {
        const docRate = doc.fps.num / doc.fps.den;
        const srcRate = clip.source_fps.num / clip.source_fps.den;
        if (Math.abs(docRate - srcRate) > 0.0001) {
          issues.push({
            kind: "fps_mismatch",
            track_kind: trk.kind,
            track_index: trk.index,
            start_frame: clip.start_frame,
            end_frame: endEx,
            detail: `Clip '${clip.name}' source FPS differs from timeline`
          });
        }
      }
      if (prevEnd !== null) {
        if (clip.start_frame < prevEnd) {
          issues.push({
            kind: "overlap",
            track_kind: trk.kind,
            track_index: trk.index,
            start_frame: clip.start_frame,
            end_frame: prevEnd,
            detail: `Clip '${clip.name}' overlaps previous clip by ${prevEnd - clip.start_frame} frames`
          });
        } else if (clip.start_frame > prevEnd) {
          issues.push({
            kind: "gap",
            track_kind: trk.kind,
            track_index: trk.index,
            start_frame: prevEnd,
            end_frame: clip.start_frame,
            detail: `Black/silent gap of ${clip.start_frame - prevEnd} frames before '${clip.name}'`
          });
        }
      }
      prevEnd = Math.max(prevEnd || 0, endEx);
    }
  }
  return {
    timeline_name: doc.name,
    valid: issues.length === 0,
    total_tracks: (doc.tracks || []).length,
    total_clips: totalClips,
    issues
  };
}

export function normalizeMarkerColor(color) {
  if (typeof color !== "string") return "Cyan";
  const cleaned = color.trim().toLowerCase();
  const match = Object.keys(MARKER_COLOR_HEX).find((k) => k.toLowerCase() === cleaned);
  return match || "Cyan";
}

export function normalizeBpmConfig(cfg) {
  const c = cfg && typeof cfg === "object" ? cfg : {};
  const enabled = Boolean(c.enabled);
  const rawBpm = Number(c.bpm);
  const bpm = Number.isFinite(rawBpm)
    ? Math.round(clampNum(rawBpm, BPM_MIN, BPM_MAX) * 10) / 10
    : BPM_DEFAULT;
  const rawOff = c.offset_s !== undefined ? Number(c.offset_s) : Number(c.offsetS);
  const offset_s = Number.isFinite(rawOff)
    ? Math.round(clampNum(rawOff, BPM_OFFSET_MIN_S, BPM_OFFSET_MAX_S) * 1000) / 1000
    : BPM_OFFSET_DEFAULT_S;
  return { enabled, bpm, offset_s };
}

export function computeBpmBeatFrames(docOrFps, bpmConfig, minFrame = 0, maxFrame = null) {
  const norm = normalizeBpmConfig(bpmConfig);
  const fpsObj =
    docOrFps && docOrFps.fps
      ? docOrFps.fps
      : docOrFps && docOrFps.num
        ? docOrFps
        : { num: 25, den: 1 };
  const fpsRate = Math.max(1, Number(fpsObj.num || 25) / Math.max(1, Number(fpsObj.den || 1)));
  const startF = Math.max(
    0,
    Math.floor(
      Number.isFinite(Number(minFrame))
        ? Number(minFrame)
        : docOrFps && Number.isFinite(Number(docOrFps.start_frame))
          ? Number(docOrFps.start_frame)
          : 0
    )
  );
  const fallbackEnd =
    docOrFps && docOrFps.tracks ? computeTimelineMaxFrame(docOrFps) : startF + Math.round(fpsRate * 20);
  const endF = Math.max(
    startF,
    Math.ceil(maxFrame !== null && Number.isFinite(Number(maxFrame)) ? Number(maxFrame) : fallbackEnd)
  );

  const beatDurationS = 60.0 / norm.bpm;
  const minBeatIdx = Math.floor((startF / fpsRate - norm.offset_s) / beatDurationS) - 1;
  const maxBeatIdx = Math.ceil((endF / fpsRate - norm.offset_s) / beatDurationS) + 1;
  const upperIdx = Math.min(maxBeatIdx, minBeatIdx + 50000);

  const beats = [];
  const seenFrames = new Set();
  for (let beatIdx = minBeatIdx; beatIdx <= upperIdx; beatIdx++) {
    const timeS = norm.offset_s + beatIdx * beatDurationS;
    const frame = Math.floor(timeS * fpsRate + 0.5);
    if (frame < startF || frame > endF || frame < 0) continue;
    if (seenFrames.has(frame)) continue;
    seenFrames.add(frame);
    const beatMod = ((beatIdx % 4) + 4) % 4;
    beats.push({
      frame,
      beatIndex: beatIdx,
      isDownbeat: beatMod === 0,
      bar: Math.floor(beatIdx / 4) + 1,
      beatInBar: beatMod + 1
    });
  }
  return beats;
}

export function addMarkerInDocument(doc, markerInput = {}) {
  if (!doc) return { doc, marker: null, markerIndex: -1, changed: false };
  const nextDoc = cloneTimelineDoc(doc);
  if (!Array.isArray(nextDoc.markers)) nextDoc.markers = [];

  const docStart = nextDoc.start_frame || 0;
  const rawFrame = Number(markerInput.frame);
  const frame = Math.max(docStart, Math.round(Number.isFinite(rawFrame) ? rawFrame : docStart));
  const color = normalizeMarkerColor(markerInput.color);
  const rawName = typeof markerInput.name === "string" ? markerInput.name.trim() : "";
  const name = rawName || `Marker ${nextDoc.markers.length + 1}`;
  const note = typeof markerInput.note === "string" ? markerInput.note.trim() : "";
  const rawDur = Number(markerInput.duration_frames);
  const duration_frames = Math.max(1, Math.round(Number.isFinite(rawDur) && rawDur > 0 ? rawDur : 1));

  const newMarker = { name, frame, duration_frames, color, note };
  const tagged = nextDoc.markers.map((m, idx) => ({ m, idx, isNew: false }));
  tagged.push({ m: newMarker, idx: tagged.length, isNew: true });
  tagged.sort((a, b) => a.m.frame - b.m.frame || a.idx - b.idx);
  nextDoc.markers = tagged.map((item) => item.m);
  const markerIndex = tagged.findIndex((item) => item.isNew);
  return { doc: nextDoc, marker: newMarker, markerIndex, changed: true };
}

export function updateMarkerInDocument(doc, markerIndex, patch = {}) {
  if (!doc || !Array.isArray(doc.markers)) {
    return { doc, marker: null, markerIndex: -1, changed: false };
  }
  if (!Number.isInteger(markerIndex) || markerIndex < 0 || markerIndex >= doc.markers.length) {
    return { doc, marker: null, markerIndex: -1, changed: false };
  }
  const orig = doc.markers[markerIndex];
  const docStart = doc.start_frame || 0;
  const nextName =
    patch.name !== undefined ? String(patch.name).slice(0, 120) : String(orig.name || "");
  const nextNote =
    patch.note !== undefined ? String(patch.note).slice(0, 240) : String(orig.note || "");
  const nextColor =
    patch.color !== undefined ? normalizeMarkerColor(patch.color) : normalizeMarkerColor(orig.color);
  const rawFrame = patch.frame !== undefined ? Number(patch.frame) : orig.frame;
  const nextFrame = Number.isFinite(rawFrame) ? Math.max(docStart, Math.round(rawFrame)) : orig.frame;

  const unchanged =
    nextName === String(orig.name || "") &&
    nextNote === String(orig.note || "") &&
    nextColor === normalizeMarkerColor(orig.color) &&
    nextFrame === orig.frame;
  if (unchanged) {
    return { doc, marker: orig, markerIndex, changed: false };
  }

  const nextDoc = cloneTimelineDoc(doc);
  const updated = {
    ...orig,
    name: nextName,
    note: nextNote,
    color: nextColor,
    frame: nextFrame
  };
  nextDoc.markers[markerIndex] = updated;

  let finalIndex = markerIndex;
  if (nextFrame !== orig.frame) {
    const tagged = nextDoc.markers.map((m, idx) => ({ m, idx, isEdited: idx === markerIndex }));
    tagged.sort((a, b) => a.m.frame - b.m.frame || a.idx - b.idx);
    nextDoc.markers = tagged.map((item) => item.m);
    finalIndex = tagged.findIndex((item) => item.isEdited);
  }
  return { doc: nextDoc, marker: nextDoc.markers[finalIndex], markerIndex: finalIndex, changed: true };
}

export function deleteMarkerInDocument(doc, markerIndex) {
  if (!doc || !Array.isArray(doc.markers)) {
    return { doc, removed: null, changed: false };
  }
  if (!Number.isInteger(markerIndex) || markerIndex < 0 || markerIndex >= doc.markers.length) {
    return { doc, removed: null, changed: false };
  }
  const nextDoc = cloneTimelineDoc(doc);
  const [removed] = nextDoc.markers.splice(markerIndex, 1);
  return { doc: nextDoc, removed, changed: true };
}

export function collectSnapTargets(doc, opts = {}) {
  if (!doc) return [];
  const excludeClip = opts.excludeClip || null;
  const includePlayhead = Boolean(opts.includePlayhead);
  const playheadFrame = opts.playheadFrame;
  const bpmGrid = opts.bpmGrid || opts.beatGrid || null;

  const byFrame = new Map();
  const priority = { playhead: 5, marker: 4, clip_edge: 3, beat: 2, timeline_start: 1 };

  const addTarget = (frame, kind) => {
    if (!Number.isFinite(frame)) return;
    const f = Math.round(frame);
    const existing = byFrame.get(f);
    if (!existing || priority[kind] > priority[existing.kind]) {
      byFrame.set(f, { frame: f, kind });
    }
  };

  addTarget(doc.start_frame || 0, "timeline_start");

  for (const trk of doc.tracks || []) {
    const clips = trk.clips || [];
    for (let i = 0; i < clips.length; i++) {
      if (
        excludeClip &&
        excludeClip.trackKind === trk.kind &&
        excludeClip.trackIndex === trk.index &&
        excludeClip.clipIndex === i
      ) {
        continue;
      }
      const c = clips[i];
      addTarget(c.start_frame, "clip_edge");
      addTarget(c.start_frame + c.duration_frames, "clip_edge");
    }
  }

  for (const mk of doc.markers || []) {
    addTarget(mk.frame, "marker");
    if ((mk.duration_frames || 0) > 1) {
      addTarget(mk.frame + mk.duration_frames, "marker");
    }
  }

  if (bpmGrid && bpmGrid.enabled) {
    const minFrame = doc.start_frame || 0;
    const maxFrame = Number.isFinite(Number(opts.maxFrame))
      ? Math.max(computeTimelineMaxFrame(doc), Number(opts.maxFrame))
      : computeTimelineMaxFrame(doc);
    const beats = computeBpmBeatFrames(doc, bpmGrid, minFrame, maxFrame);
    for (const b of beats) {
      addTarget(b.frame, "beat");
    }
  }

  if (includePlayhead && Number.isFinite(playheadFrame)) {
    addTarget(playheadFrame, "playhead");
  }

  return Array.from(byFrame.values()).sort((a, b) => a.frame - b.frame);
}

export function findMagneticSnap(
  rawFrame,
  targets,
  pxPerFrame,
  thresholdPx = SNAP_THRESHOLD_PX,
  minFrame = 0,
  maxFrame = Number.POSITIVE_INFINITY
) {
  const clampedRounded = Math.max(minFrame, Math.min(maxFrame, Math.round(rawFrame)));
  if (!Array.isArray(targets) || targets.length === 0 || !Number.isFinite(pxPerFrame) || pxPerFrame <= 0) {
    return { frame: clampedRounded, snapped: false, kind: null };
  }

  const maxFrameDelta = thresholdPx / pxPerFrame;
  let best = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const tgt of targets) {
    if (tgt.frame < minFrame || tgt.frame > maxFrame) continue;
    const dist = Math.abs(tgt.frame - rawFrame);
    if (dist <= maxFrameDelta + 1e-6 && dist < bestDist - 1e-6) {
      bestDist = dist;
      best = tgt;
    }
  }

  if (!best) {
    return { frame: clampedRounded, snapped: false, kind: null };
  }
  return { frame: best.frame, snapped: true, kind: best.kind };
}

export function computeSourceFrameDelta(timelineDeltaFrames, sourceFps, timelineFps) {
  if (!sourceFps || !timelineFps) return timelineDeltaFrames;
  const srcRate = sourceFps.num / Math.max(1, sourceFps.den);
  const tlRate = timelineFps.num / Math.max(1, timelineFps.den);
  if (Math.abs(srcRate - tlRate) < 1e-6) return timelineDeltaFrames;
  return Math.round(timelineDeltaFrames * (srcRate / tlRate));
}

export function findTrackAndClip(doc, trackKind, trackIndex, clipIndex) {
  if (!doc || !Array.isArray(doc.tracks)) return null;
  const trk = doc.tracks.find((t) => t.kind === trackKind && t.index === trackIndex);
  if (!trk || !Array.isArray(trk.clips)) return null;
  const clip = trk.clips[clipIndex];
  if (!clip) return null;
  return { trk, clip };
}

export function findClipIndex(doc, clipObj) {
  if (!doc || !clipObj || !Array.isArray(doc.tracks)) return null;
  for (const trk of doc.tracks) {
    if (trk.kind !== clipObj.media_type || trk.index !== clipObj.track_index) continue;
    const clips = trk.clips || [];
    const directIdx = clips.indexOf(clipObj);
    if (directIdx !== -1) {
      return { trackKind: trk.kind, trackIndex: trk.index, clipIndex: directIdx };
    }
    const matchIdx = clips.findIndex(
      (c) =>
        c.name === clipObj.name &&
        c.start_frame === clipObj.start_frame &&
        c.duration_frames === clipObj.duration_frames
    );
    if (matchIdx !== -1) {
      return { trackKind: trk.kind, trackIndex: trk.index, clipIndex: matchIdx };
    }
  }
  return null;
}

export function getClipTrimBounds(doc, trackKind, trackIndex, clipIndex) {
  const found = findTrackAndClip(doc, trackKind, trackIndex, clipIndex);
  if (!found) return null;
  const { trk, clip } = found;
  const docStart = doc.start_frame || 0;
  const clipEnd = clip.start_frame + clip.duration_frames;

  let prevEnd = null;
  let nextStart = null;
  for (let i = 0; i < trk.clips.length; i++) {
    if (i === clipIndex) continue;
    const other = trk.clips[i];
    const otherEnd = other.start_frame + other.duration_frames;
    if (otherEnd <= clip.start_frame) {
      if (prevEnd === null || otherEnd > prevEnd) prevEnd = otherEnd;
    }
    if (other.start_frame >= clipEnd) {
      if (nextStart === null || other.start_frame < nextStart) nextStart = other.start_frame;
    }
  }

  return {
    minStart: prevEnd !== null ? Math.max(docStart, prevEnd) : docStart,
    maxStart: clipEnd - 1,
    minEnd: clip.start_frame + 1,
    maxEnd: nextStart !== null ? nextStart : Number.POSITIVE_INFINITY
  };
}

export function trimClipInDocument(doc, trackKind, trackIndex, clipIndex, edge, targetFrame) {
  const bounds = getClipTrimBounds(doc, trackKind, trackIndex, clipIndex);
  if (!bounds) return { doc, clip: null, changed: false };

  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, trackKind, trackIndex, clipIndex);
  if (!found) return { doc, clip: null, changed: false };

  const { clip } = found;
  const origStart = clip.start_frame;
  const origDur = clip.duration_frames;
  const origEnd = origStart + origDur;

  if (edge === "left") {
    const newStart = Math.max(bounds.minStart, Math.min(bounds.maxStart, Math.round(targetFrame)));
    const delta = newStart - origStart;
    if (delta === 0) return { doc, clip: null, changed: false };
    const newDur = origEnd - newStart;
    const srcDelta = computeSourceFrameDelta(delta, clip.source_fps, nextDoc.fps);
    clip.start_frame = newStart;
    clip.duration_frames = newDur;
    clip.source_in_frame = Math.max(0, (clip.source_in_frame || 0) + srcDelta);
    return { doc: nextDoc, clip, changed: true };
  }

  if (edge === "right") {
    const newEnd = Math.max(bounds.minEnd, Math.min(bounds.maxEnd, Math.round(targetFrame)));
    const newDur = newEnd - origStart;
    if (newDur === origDur) return { doc, clip: null, changed: false };
    clip.duration_frames = newDur;
    return { doc: nextDoc, clip, changed: true };
  }

  return { doc, clip: null, changed: false };
}

function _buildSplitClipPair(clip, cut, fps, fpsRate) {
  const origEnd = clip.start_frame + clip.duration_frames;
  const leftDur = cut - clip.start_frame;
  const rightDur = origEnd - cut;
  const audioNorm = normalizeClipAudio(clip);
  const retimeNorm = normalizeClipRetime(clip);
  const baseSrcDelta = computeSourceFrameDelta(leftDur, clip.source_fps, fps);
  const srcDelta = Math.round(baseSrcDelta * retimeNorm.speedRate);

  const leftClip = {
    ...clip,
    duration_frames: leftDur,
    audio_gain_db: audioNorm.gainDb,
    fade_in_s: Number(Math.min(audioNorm.fadeInS, leftDur / fpsRate).toFixed(2)),
    fade_out_s: 0,
    speed_rate: retimeNorm.speedRate,
    reverse: retimeNorm.reverse,
    transition_out: null,
    transform: clip.transform ? { ...clip.transform } : null
  };
  const rightClip = {
    ...clip,
    start_frame: cut,
    duration_frames: rightDur,
    source_in_frame: Math.max(0, (clip.source_in_frame || 0) + srcDelta),
    audio_gain_db: audioNorm.gainDb,
    fade_in_s: 0,
    fade_out_s: Number(Math.min(audioNorm.fadeOutS, rightDur / fpsRate).toFixed(2)),
    speed_rate: retimeNorm.speedRate,
    reverse: retimeNorm.reverse,
    transition_out: clip.transition_out ? { ...clip.transition_out } : null,
    transform: clip.transform ? { ...clip.transform } : null
  };
  return { leftClip, rightClip };
}

export function splitClipInDocument(doc, trackKind, trackIndex, clipIndex, splitFrame) {
  const foundOrig = findTrackAndClip(doc, trackKind, trackIndex, clipIndex);
  if (!foundOrig) return { doc, leftClip: null, rightClip: null, split: false };

  const origClip = foundOrig.clip;
  const cut = Math.round(splitFrame);
  const origEnd = origClip.start_frame + origClip.duration_frames;
  if (cut <= origClip.start_frame || cut >= origEnd) {
    return { doc, leftClip: null, rightClip: null, split: false };
  }

  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, trackKind, trackIndex, clipIndex);
  if (!found) return { doc, leftClip: null, rightClip: null, split: false };

  const { trk, clip } = found;
  const fpsRate = nextDoc.fps ? Math.max(1, nextDoc.fps.num / Math.max(1, nextDoc.fps.den)) : 25;
  const { leftClip, rightClip } = _buildSplitClipPair(clip, cut, nextDoc.fps, fpsRate);

  trk.clips.splice(clipIndex, 1, leftClip, rightClip);
  return { doc: nextDoc, leftClip, rightClip, split: true };
}

export function splitClipsAtPlayhead(doc, playheadFrame, selectedClip = null) {
  if (!doc || !Array.isArray(doc.tracks)) {
    return { doc, splitCount: 0, focusClip: null };
  }
  const cut = Math.round(playheadFrame);

  if (selectedClip) {
    const ref = findClipIndex(doc, selectedClip);
    if (ref) {
      const target = findTrackAndClip(doc, ref.trackKind, ref.trackIndex, ref.clipIndex);
      if (
        target &&
        cut > target.clip.start_frame &&
        cut < target.clip.start_frame + target.clip.duration_frames
      ) {
        const res = splitClipInDocument(doc, ref.trackKind, ref.trackIndex, ref.clipIndex, cut);
        return {
          doc: res.doc,
          splitCount: res.split ? 1 : 0,
          focusClip: res.rightClip
        };
      }
    }
  }

  const nextDoc = cloneTimelineDoc(doc);
  let splitCount = 0;
  let focusClip = null;
  const fpsRate = nextDoc.fps ? Math.max(1, nextDoc.fps.num / Math.max(1, nextDoc.fps.den)) : 25;

  for (const trk of nextDoc.tracks) {
    const newClips = [];
    for (const clip of trk.clips || []) {
      const endF = clip.start_frame + clip.duration_frames;
      if (cut > clip.start_frame && cut < endF) {
        const { leftClip, rightClip } = _buildSplitClipPair(clip, cut, nextDoc.fps, fpsRate);
        newClips.push(leftClip, rightClip);
        splitCount += 1;
        if (!focusClip) focusClip = rightClip;
      } else {
        newClips.push(clip);
      }
    }
    trk.clips = newClips;
  }

  return {
    doc: splitCount > 0 ? nextDoc : doc,
    splitCount,
    focusClip
  };
}

export function rippleDeleteClipInDocument(doc, trackKind, trackIndex, clipIndex) {
  const foundOrig = findTrackAndClip(doc, trackKind, trackIndex, clipIndex);
  if (!foundOrig) {
    return { doc, deletedClip: null, shiftedCount: 0, focusClip: null, changed: false };
  }

  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, trackKind, trackIndex, clipIndex);
  if (!found) {
    return { doc, deletedClip: null, shiftedCount: 0, focusClip: null, changed: false };
  }

  const { trk, clip: deletedClip } = found;
  const docStart = nextDoc.start_frame || 0;
  const delStart = deletedClip.start_frame;
  const delDur = Math.max(0, deletedClip.duration_frames || 0);
  const delEnd = delStart + delDur;

  trk.clips.splice(clipIndex, 1);

  let shiftedCount = 0;
  let nextFocusClip = null;
  let nextFocusStart = Number.POSITIVE_INFINITY;
  let prevFocusClip = null;
  let prevFocusEnd = Number.NEGATIVE_INFINITY;

  for (const other of trk.clips) {
    const otherEnd = other.start_frame + (other.duration_frames || 0);
    if (other.start_frame <= delStart && otherEnd === delStart && other.transition_out) {
      other.transition_out = null;
    }
    if (other.start_frame >= delEnd || (delDur === 0 && other.start_frame > delStart)) {
      other.start_frame = Math.max(docStart, other.start_frame - delDur);
      shiftedCount += 1;
      if (other.start_frame < nextFocusStart) {
        nextFocusStart = other.start_frame;
        nextFocusClip = other;
      }
    } else if (other.start_frame <= delStart && otherEnd > prevFocusEnd) {
      prevFocusEnd = otherEnd;
      prevFocusClip = other;
    }
  }

  trk.clips.sort((a, b) => a.start_frame - b.start_frame || a.duration_frames - b.duration_frames);
  const focusClip = nextFocusClip || prevFocusClip || trk.clips[0] || null;
  return {
    doc: nextDoc,
    deletedClip,
    shiftedCount,
    focusClip,
    changed: true
  };
}

export function updateClipAudioInDocument(doc, trackKind, trackIndex, clipIndex, patch) {
  const foundOrig = findTrackAndClip(doc, trackKind, trackIndex, clipIndex);
  if (!foundOrig) return { doc, clip: null, changed: false };
  const origNorm = normalizeClipAudio(foundOrig.clip);
  const nextGain =
    patch.audio_gain_db !== undefined
      ? clampNum(Number(patch.audio_gain_db), AUDIO_GAIN_DB_MIN, AUDIO_GAIN_DB_MAX)
      : origNorm.gainDb;
  const nextIn =
    patch.fade_in_s !== undefined
      ? clampNum(Number(patch.fade_in_s), AUDIO_FADE_S_MIN, AUDIO_FADE_S_MAX)
      : origNorm.fadeInS;
  const nextOut =
    patch.fade_out_s !== undefined
      ? clampNum(Number(patch.fade_out_s), AUDIO_FADE_S_MIN, AUDIO_FADE_S_MAX)
      : origNorm.fadeOutS;

  if (
    !Number.isFinite(nextGain) ||
    !Number.isFinite(nextIn) ||
    !Number.isFinite(nextOut)
  ) {
    return { doc, clip: null, changed: false };
  }

  const unchanged =
    Math.abs(nextGain - origNorm.gainDb) < 1e-6 &&
    Math.abs(nextIn - origNorm.fadeInS) < 1e-6 &&
    Math.abs(nextOut - origNorm.fadeOutS) < 1e-6;
  if (unchanged) {
    return { doc, clip: foundOrig.clip, changed: false };
  }

  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, trackKind, trackIndex, clipIndex);
  if (!found) return { doc, clip: null, changed: false };
  found.clip.audio_gain_db = Number(nextGain.toFixed(2));
  found.clip.fade_in_s = Number(nextIn.toFixed(2));
  found.clip.fade_out_s = Number(nextOut.toFixed(2));
  return { doc: nextDoc, clip: found.clip, changed: true };
}

export function updateClipRetimeInDocument(doc, trackKind, trackIndex, clipIndex, patch) {
  const foundOrig = findTrackAndClip(doc, trackKind, trackIndex, clipIndex);
  if (!foundOrig) return { doc, clip: null, changed: false };
  const origNorm = normalizeClipRetime(foundOrig.clip);
  const rawNextSpeed =
    patch.speed_rate !== undefined ? Number(patch.speed_rate) : origNorm.speedRate;
  if (!Number.isFinite(rawNextSpeed)) {
    return { doc, clip: null, changed: false };
  }
  const nextSpeed = Number(clampNum(rawNextSpeed, RETIME_SPEED_MIN, RETIME_SPEED_MAX).toFixed(2));
  const nextReverse =
    patch.reverse !== undefined ? Boolean(patch.reverse) : origNorm.reverse;

  const unchanged =
    Math.abs(nextSpeed - origNorm.speedRate) < 1e-6 &&
    nextReverse === origNorm.reverse;
  if (unchanged) {
    return { doc, clip: foundOrig.clip, changed: false };
  }

  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, trackKind, trackIndex, clipIndex);
  if (!found) return { doc, clip: null, changed: false };
  found.clip.speed_rate = nextSpeed;
  found.clip.reverse = nextReverse;
  return { doc: nextDoc, clip: found.clip, changed: true };
}

export function updateClipTransformInDocument(doc, trackKind, trackIndex, clipIndex, patch) {
  const foundOrig = findTrackAndClip(doc, trackKind, trackIndex, clipIndex);
  if (!foundOrig) return { doc, clip: null, changed: false };
  const origNorm = normalizeClipTransform(foundOrig.clip);
  const p = patch || {};
  const nextRaw = {
    zoom_pct: p.zoom_pct !== undefined ? Number(p.zoom_pct) : origNorm.zoom_pct,
    pos_x_pct: p.pos_x_pct !== undefined ? Number(p.pos_x_pct) : origNorm.pos_x_pct,
    pos_y_pct: p.pos_y_pct !== undefined ? Number(p.pos_y_pct) : origNorm.pos_y_pct,
    rotation_deg: p.rotation_deg !== undefined ? Number(p.rotation_deg) : origNorm.rotation_deg,
    opacity_pct: p.opacity_pct !== undefined ? Number(p.opacity_pct) : origNorm.opacity_pct,
    dynamic_zoom: p.dynamic_zoom !== undefined ? p.dynamic_zoom : origNorm.dynamic_zoom
  };
  if (
    !Number.isFinite(nextRaw.zoom_pct) ||
    !Number.isFinite(nextRaw.pos_x_pct) ||
    !Number.isFinite(nextRaw.pos_y_pct) ||
    !Number.isFinite(nextRaw.rotation_deg) ||
    !Number.isFinite(nextRaw.opacity_pct) ||
    typeof nextRaw.dynamic_zoom !== "string" ||
    !ALLOWED_DYNAMIC_ZOOM_PRESETS.includes(nextRaw.dynamic_zoom.trim().toLowerCase())
  ) {
    return { doc, clip: null, changed: false };
  }
  const nextNorm = normalizeClipTransform(nextRaw);
  const unchanged =
    Math.abs(nextNorm.zoom_pct - origNorm.zoom_pct) < 1e-4 &&
    Math.abs(nextNorm.pos_x_pct - origNorm.pos_x_pct) < 1e-4 &&
    Math.abs(nextNorm.pos_y_pct - origNorm.pos_y_pct) < 1e-4 &&
    Math.abs(nextNorm.rotation_deg - origNorm.rotation_deg) < 1e-4 &&
    Math.abs(nextNorm.opacity_pct - origNorm.opacity_pct) < 1e-4 &&
    nextNorm.dynamic_zoom === origNorm.dynamic_zoom;
  if (unchanged) {
    return { doc, clip: foundOrig.clip, changed: false };
  }

  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, trackKind, trackIndex, clipIndex);
  if (!found) return { doc, clip: null, changed: false };
  found.clip.transform = isClipTransformIdentity(nextNorm) ? null : nextNorm;
  return { doc: nextDoc, clip: found.clip, changed: true };
}

export function isValidClipLabelColor(colorId) {
  return (
    typeof colorId === "string" &&
    Object.prototype.hasOwnProperty.call(CLIP_LABEL_COLORS, colorId)
  );
}

export function normalizeClipLabelColor(raw) {
  if (typeof raw !== "string") return "default";
  const clean = raw.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(CLIP_LABEL_COLORS, clean) ? clean : "default";
}

function _resolveClipLocationById(doc, clipId) {
  if (!doc || !Array.isArray(doc.tracks) || clipId == null) return null;
  if (typeof clipId === "object") {
    if (
      typeof clipId.trackKind === "string" &&
      Number.isInteger(clipId.trackIndex) &&
      Number.isInteger(clipId.clipIndex)
    ) {
      return findTrackAndClip(doc, clipId.trackKind, clipId.trackIndex, clipId.clipIndex)
        ? {
            trackKind: clipId.trackKind,
            trackIndex: clipId.trackIndex,
            clipIndex: clipId.clipIndex
          }
        : null;
    }
    return findClipIndex(doc, clipId);
  }
  if (typeof clipId !== "string" && typeof clipId !== "number") return null;
  const needle = String(clipId);
  if (!needle) return null;
  for (const trk of doc.tracks) {
    const clips = trk && Array.isArray(trk.clips) ? trk.clips : [];
    for (let i = 0; i < clips.length; i++) {
      const c = clips[i];
      if (c && c.id != null && String(c.id) === needle) {
        return { trackKind: trk.kind, trackIndex: trk.index, clipIndex: i };
      }
    }
  }
  const compositeMatch = /^(video|audio):(\d+):(\d+)$/.exec(needle);
  if (compositeMatch) {
    const trackKind = compositeMatch[1];
    const trackIndex = Number(compositeMatch[2]);
    const clipIndex = Number(compositeMatch[3]);
    if (findTrackAndClip(doc, trackKind, trackIndex, clipIndex)) {
      return { trackKind, trackIndex, clipIndex };
    }
  }
  return null;
}

export function setClipLabelColor(doc, clipId, colorId) {
  if (!doc || !Array.isArray(doc.tracks)) {
    return { doc, clip: null, changed: false };
  }
  if (!isValidClipLabelColor(colorId)) {
    return { doc, clip: null, changed: false };
  }
  const loc = _resolveClipLocationById(doc, clipId);
  if (!loc) {
    return { doc, clip: null, changed: false };
  }
  const foundOrig = findTrackAndClip(doc, loc.trackKind, loc.trackIndex, loc.clipIndex);
  if (!foundOrig) {
    return { doc, clip: null, changed: false };
  }
  const origColor = normalizeClipLabelColor(foundOrig.clip.label_color);
  if (colorId === origColor) {
    return { doc, clip: foundOrig.clip, changed: false };
  }
  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, loc.trackKind, loc.trackIndex, loc.clipIndex);
  if (!found) {
    return { doc, clip: null, changed: false };
  }
  found.clip.label_color = colorId;
  return { doc: nextDoc, clip: found.clip, changed: true };
}

function _resolveClipLabelColorFilter(rawColor) {
  if (typeof rawColor !== "string") {
    return { active: false, colorId: null };
  }
  const clean = rawColor.trim().toLowerCase();
  if (!clean || clean === "all") {
    return { active: false, colorId: null };
  }
  if (isValidClipLabelColor(clean)) {
    return { active: true, colorId: clean };
  }
  for (const id of CLIP_LABEL_COLOR_IDS) {
    const meta = CLIP_LABEL_COLORS[id];
    if (
      meta &&
      (meta.label.toLowerCase() === clean || meta.label_fr.toLowerCase() === clean)
    ) {
      return { active: true, colorId: id };
    }
  }
  return { active: true, colorId: null };
}

export function filterTimelineClips(doc, options = {}) {
  if (!doc || !Array.isArray(doc.tracks)) return [];
  const opts = options && typeof options === "object" ? options : {};
  const queryNeedle =
    typeof opts.query === "string" ? opts.query.trim().toLowerCase() : "";
  const colorFilter = _resolveClipLabelColorFilter(opts.labelColor);
  if (colorFilter.active && colorFilter.colorId === null) {
    return [];
  }

  const fps = doc.fps !== undefined ? doc.fps : 25;
  const results = [];

  for (const trk of doc.tracks) {
    if (!trk || !Array.isArray(trk.clips)) continue;
    const trackKind = trk.kind === "audio" ? "audio" : "video";
    const trackIndex = Number.isFinite(Number(trk.index)) ? Number(trk.index) : 1;
    const trackId = `${trackKind === "audio" ? "A" : "V"}${trackIndex}`;

    for (let clipIndex = 0; clipIndex < trk.clips.length; clipIndex++) {
      const clip = trk.clips[clipIndex];
      if (!clip || typeof clip !== "object") continue;

      const label = typeof clip.name === "string" ? clip.name : String(clip.name ?? "");
      const labelColor = normalizeClipLabelColor(clip.label_color);

      if (colorFilter.active && labelColor !== colorFilter.colorId) {
        continue;
      }
      if (queryNeedle && !label.toLowerCase().includes(queryNeedle)) {
        continue;
      }

      const rawStart = Number(clip.start_frame);
      const startFrames = Number.isFinite(rawStart) ? Math.max(0, Math.round(rawStart)) : 0;
      const rawDur = Number(clip.duration_frames);
      const durationFrames = Number.isFinite(rawDur) ? Math.max(0, Math.round(rawDur)) : 0;
      const id =
        clip.id != null && String(clip.id) !== ""
          ? String(clip.id)
          : `${trackKind}:${trackIndex}:${clipIndex}`;
      const startTimecode = framesToSmpteTimecode(startFrames, fps);

      results.push({
        id,
        trackId,
        trackKind,
        trackIndex,
        clipIndex,
        label,
        labelColor,
        startFrames,
        durationFrames,
        startTimecode
      });
    }
  }

  results.sort((a, b) => {
    if (a.startFrames !== b.startFrames) return a.startFrames - b.startFrames;
    const kindOrderA = a.trackKind === "audio" ? 1 : 0;
    const kindOrderB = b.trackKind === "audio" ? 1 : 0;
    if (kindOrderA !== kindOrderB) return kindOrderA - kindOrderB;
    if (a.trackIndex !== b.trackIndex) return a.trackIndex - b.trackIndex;
    return a.clipIndex - b.clipIndex;
  });

  return results;
}

export function toggleTrackMuteInDocument(doc, trackKind, trackIndex) {
  if (!doc || !Array.isArray(doc.tracks)) return { doc, track: null, changed: false };
  const nextDoc = cloneTimelineDoc(doc);
  const trk = nextDoc.tracks.find((t) => t.kind === trackKind && t.index === trackIndex);
  if (!trk) return { doc, track: null, changed: false };
  trk.muted = !Boolean(trk.muted);
  return { doc: nextDoc, track: trk, changed: true };
}

export function toggleTrackSoloInDocument(doc, trackKind, trackIndex) {
  if (!doc || !Array.isArray(doc.tracks)) return { doc, track: null, changed: false };
  const nextDoc = cloneTimelineDoc(doc);
  const trk = nextDoc.tracks.find((t) => t.kind === trackKind && t.index === trackIndex);
  if (!trk) return { doc, track: null, changed: false };
  trk.solo = !Boolean(trk.solo);
  return { doc: nextDoc, track: trk, changed: true };
}

export function hasSplittableClipAtFrame(doc, frame, selectedClip = null) {
  if (!doc || !Array.isArray(doc.tracks)) return false;
  const f = Math.round(frame);
  if (selectedClip) {
    const ref = findClipIndex(doc, selectedClip);
    if (ref) {
      const target = findTrackAndClip(doc, ref.trackKind, ref.trackIndex, ref.clipIndex);
      if (target && f > target.clip.start_frame && f < target.clip.start_frame + target.clip.duration_frames) {
        return true;
      }
    }
  }
  for (const trk of doc.tracks) {
    for (const c of trk.clips || []) {
      if (f > c.start_frame && f < c.start_frame + c.duration_frames) {
        return true;
      }
    }
  }
  return false;
}

export function normalizeClipTransition(clip) {
  if (!clip || !clip.transition_out || typeof clip.transition_out !== "object") return null;
  const rawPreset = String(clip.transition_out.preset || "").trim().toLowerCase();
  if (!rawPreset || rawPreset === "none" || !ALLOWED_TRANSITION_IDS.has(rawPreset)) return null;
  const rawDur = Number(clip.transition_out.duration_s);
  const durationS = Number.isFinite(rawDur)
    ? Number(clampNum(rawDur, TRANSITION_DURATION_MIN_S, TRANSITION_DURATION_MAX_S).toFixed(2))
    : TRANSITION_DURATION_DEFAULT_S;
  return {
    preset: rawPreset,
    duration_s: durationS,
    include_audio: clip.transition_out.include_audio !== false,
    audio_curve: String(clip.transition_out.audio_curve || "tri").trim().toLowerCase() || "tri"
  };
}

export function getTransitionShortTag(preset) {
  const found = TRANSITION_PRESETS.find((p) => p.id === preset);
  return found ? found.shortTag : "TRANS";
}

export function getTransitionPresetName(preset) {
  const found = TRANSITION_PRESETS.find((p) => p.id === preset);
  return found ? found.name : "Cut";
}

export function compileTransitionFilterClient(params, clipADurationS = 5.0, clipBDurationS = null) {
  const p = params || {};
  const rawPreset = String(p.preset || "fade").trim().toLowerCase();
  const preset = ALLOWED_TRANSITION_IDS.has(rawPreset) ? rawPreset : "fade";
  const rawDur = Number(p.duration_s);
  const dur = Number.isFinite(rawDur)
    ? Number(clampNum(rawDur, TRANSITION_DURATION_MIN_S, TRANSITION_DURATION_MAX_S).toFixed(3))
    : TRANSITION_DURATION_DEFAULT_S;
  const durA = Number.isFinite(Number(clipADurationS)) && Number(clipADurationS) > 0
    ? Number(clipADurationS)
    : 5.0;
  const effectiveDur = Math.min(dur, durA, clipBDurationS && clipBDurationS > 0 ? clipBDurationS : dur);
  const offset = Math.max(0, Number((durA - effectiveDur).toFixed(6)));
  const includeAudio = p.include_audio !== false;
  const c1 = String(p.audio_curve1 || p.audio_curve || "tri").trim().toLowerCase() || "tri";
  const c2 = String(p.audio_curve2 || p.audio_curve || "tri").trim().toLowerCase() || "tri";

  const vf = `[0:v][1:v]xfade=transition=${preset}:duration=${effectiveDur.toFixed(3)}:offset=${offset.toFixed(3)}[vout]`;
  const af = includeAudio
    ? `[0:a][1:a]acrossfade=d=${effectiveDur.toFixed(3)}:c1=${c1}:c2=${c2}[aout]`
    : "";
  const filterComplex = af ? `${vf};${af}` : vf;
  const args = ["-filter_complex", filterComplex, "-map", "[vout]"];
  if (af) args.push("-map", "[aout]");

  return {
    preset,
    preset_name: getTransitionPresetName(preset),
    duration_s: Number(effectiveDur.toFixed(3)),
    offset_s: offset,
    include_audio: includeAudio,
    audio_curve1: c1,
    audio_curve2: c2,
    video_filtergraph: vf,
    audio_filtergraph: af,
    filter_complex: filterComplex,
    ffmpeg_args: args
  };
}

export function findAllCutJunctions(doc) {
  if (!doc || !Array.isArray(doc.tracks)) return [];
  const fps = doc.fps ? Math.max(1, doc.fps.num / Math.max(1, doc.fps.den)) : 25;
  const junctions = [];
  for (const trk of doc.tracks) {
    const ordered = (trk.clips || [])
      .map((clip, idx) => ({ clip, idx }))
      .sort((a, b) => a.clip.start_frame - b.clip.start_frame || a.clip.duration_frames - b.clip.duration_frames);
    for (let i = 0; i < ordered.length - 1; i++) {
      const a = ordered[i];
      const b = ordered[i + 1];
      if (a.clip.duration_frames <= 0 || b.clip.duration_frames <= 0) continue;
      const cutFrame = a.clip.start_frame + a.clip.duration_frames;
      if (cutFrame !== b.clip.start_frame) continue;
      const durAS = a.clip.duration_frames / fps;
      const durBS = b.clip.duration_frames / fps;
      junctions.push({
        trackKind: trk.kind,
        trackIndex: trk.index,
        track: trk,
        cutFrame,
        clipAIndex: a.idx,
        clipBIndex: b.idx,
        clipA: a.clip,
        clipB: b.clip,
        clipADurationS: durAS,
        clipBDurationS: durBS,
        maxDurationS: Number(Math.min(TRANSITION_DURATION_MAX_S, durAS, durBS).toFixed(2)),
        transition: normalizeClipTransition(a.clip)
      });
    }
  }
  return junctions;
}

export function findAdjacentCutForClip(doc, trackKind, trackIndex, clipIndex) {
  const junctions = findAllCutJunctions(doc);
  const outgoing = junctions.find(
    (j) => j.trackKind === trackKind && j.trackIndex === trackIndex && j.clipAIndex === clipIndex
  );
  if (outgoing) return outgoing;
  const incoming = junctions.find(
    (j) => j.trackKind === trackKind && j.trackIndex === trackIndex && j.clipBIndex === clipIndex
  );
  return incoming || null;
}

export function findActiveTransitionAtFrame(doc, frame) {
  if (!doc || !Array.isArray(doc.tracks)) return null;
  const fps = doc.fps ? Math.max(1, doc.fps.num / Math.max(1, doc.fps.den)) : 25;
  const junctions = findAllCutJunctions(doc).filter(
    (j) => j.trackKind === "video" && j.transition !== null
  );
  let best = null;
  for (const j of junctions) {
    const trans = j.transition;
    const rawFrames = Math.round(trans.duration_s * fps);
    const maxAvail = Math.max(2, Math.min(j.clipA.duration_frames, j.clipB.duration_frames));
    const transFrames = Math.max(2, Math.min(maxAvail, rawFrames));
    const halfPre = Math.floor(transFrames / 2);
    const transStart = j.cutFrame - halfPre;
    const transEnd = transStart + transFrames;
    if (frame >= transStart && frame <= transEnd) {
      const progress = clampNum((frame - transStart) / Math.max(1, transEnd - transStart), 0, 1);
      best = {
        ...j,
        transFrames,
        transStart,
        transEnd,
        progress
      };
    }
  }
  return best;
}

export function updateClipTransitionInDocument(doc, trackKind, trackIndex, clipIndex, patch) {
  const foundOrig = findTrackAndClip(doc, trackKind, trackIndex, clipIndex);
  if (!foundOrig) return { doc, clip: null, changed: false };
  const origTrans = normalizeClipTransition(foundOrig.clip);

  let nextTrans = null;
  if (patch !== null && patch !== undefined) {
    const rawPreset = patch.preset !== undefined
      ? String(patch.preset).trim().toLowerCase()
      : origTrans
        ? origTrans.preset
        : "fade";
    if (rawPreset && rawPreset !== "none" && ALLOWED_TRANSITION_IDS.has(rawPreset)) {
      const rawDur = patch.duration_s !== undefined
        ? Number(patch.duration_s)
        : origTrans
          ? origTrans.duration_s
          : TRANSITION_DURATION_DEFAULT_S;
      if (!Number.isFinite(rawDur)) {
        return { doc, clip: null, changed: false };
      }
      const nextDur = Number(
        clampNum(rawDur, TRANSITION_DURATION_MIN_S, TRANSITION_DURATION_MAX_S).toFixed(2)
      );
      const nextAudio = patch.include_audio !== undefined
        ? Boolean(patch.include_audio)
        : origTrans
          ? origTrans.include_audio
          : true;
      nextTrans = {
        preset: rawPreset,
        duration_s: nextDur,
        include_audio: nextAudio,
        audio_curve: origTrans ? origTrans.audio_curve : "tri"
      };
    }
  }

  const unchanged =
    (!origTrans && !nextTrans) ||
    (origTrans &&
      nextTrans &&
      origTrans.preset === nextTrans.preset &&
      Math.abs(origTrans.duration_s - nextTrans.duration_s) < 1e-6 &&
      origTrans.include_audio === nextTrans.include_audio);
  if (unchanged) {
    return { doc, clip: foundOrig.clip, changed: false };
  }

  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, trackKind, trackIndex, clipIndex);
  if (!found) return { doc, clip: null, changed: false };
  found.clip.transition_out = nextTrans;
  return { doc: nextDoc, clip: found.clip, changed: true };
}

export const SHUTTLE_SPEEDS = [-4, -2, -1, 0, 1, 2, 4];
export const SHUTTLE_MAX_SPEED = 4;

export function stepShuttleSpeed(currentSpeed, action) {
  const cur = Number.isFinite(Number(currentSpeed)) ? Math.trunc(Number(currentSpeed)) : 0;
  const act = typeof action === "string" ? action.trim().toLowerCase() : "";
  if (act === "stop" || act === "k") {
    return 0;
  }
  if (act === "toggle" || act === "space") {
    return cur !== 0 ? 0 : 1;
  }
  if (act === "forward" || act === "l") {
    if (cur <= 0) return 1;
    return Math.min(SHUTTLE_MAX_SPEED, cur * 2);
  }
  if (act === "reverse" || act === "j") {
    if (cur >= 0) return -1;
    return -Math.min(SHUTTLE_MAX_SPEED, Math.abs(cur) * 2);
  }
  return cur;
}

export function formatShuttleSpeedLabel(speed) {
  const s = Number.isFinite(Number(speed)) ? Math.trunc(Number(speed)) : 0;
  if (s === 0) return "0x";
  return `${s}x`;
}

export function normalizeInOutRange(range, minFrame = 0, maxFrame = Number.POSITIVE_INFINITY) {
  const r = range && typeof range === "object" ? range : {};
  const lo = Number.isFinite(Number(minFrame)) ? Math.round(Number(minFrame)) : 0;
  const hi = Number.isFinite(Number(maxFrame))
    ? Math.max(lo, Math.round(Number(maxFrame)))
    : Number.POSITIVE_INFINITY;

  const rawIn = r.in_frame !== undefined ? r.in_frame : r.inFrame;
  const rawOut = r.out_frame !== undefined ? r.out_frame : r.outFrame;

  const inFrame =
    rawIn !== null && rawIn !== undefined && Number.isFinite(Number(rawIn))
      ? Math.max(lo, Math.min(hi, Math.round(Number(rawIn))))
      : null;
  let outFrame =
    rawOut !== null && rawOut !== undefined && Number.isFinite(Number(rawOut))
      ? Math.max(lo, Math.min(hi, Math.round(Number(rawOut))))
      : null;

  if (inFrame !== null && outFrame !== null && inFrame > outFrame) {
    outFrame = null;
  }
  return { in_frame: inFrame, out_frame: outFrame };
}

export function setInOutRange(
  currentRange,
  action,
  frame = 0,
  minFrame = 0,
  maxFrame = Number.POSITIVE_INFINITY
) {
  const act = typeof action === "string" ? action.trim().toLowerCase() : "";
  if (act === "clear" || act === "reset") {
    return { in_frame: null, out_frame: null };
  }
  const lo = Number.isFinite(Number(minFrame)) ? Math.round(Number(minFrame)) : 0;
  const hi = Number.isFinite(Number(maxFrame))
    ? Math.max(lo, Math.round(Number(maxFrame)))
    : Number.POSITIVE_INFINITY;
  const norm = normalizeInOutRange(currentRange, lo, hi);
  const rawF = Number(frame);
  const target = Number.isFinite(rawF) ? Math.max(lo, Math.min(hi, Math.round(rawF))) : lo;

  if (act === "in" || act === "i") {
    const nextOut = norm.out_frame !== null && target > norm.out_frame ? null : norm.out_frame;
    return { in_frame: target, out_frame: nextOut };
  }
  if (act === "out" || act === "o") {
    const nextIn = norm.in_frame !== null && target < norm.in_frame ? null : norm.in_frame;
    return { in_frame: nextIn, out_frame: target };
  }
  return norm;
}

export function computeInOutRangeMetrics(range, fps = 25, minFrame = 0, maxFrame = 0) {
  const lo = Number.isFinite(Number(minFrame)) ? Math.round(Number(minFrame)) : 0;
  const hi = Number.isFinite(Number(maxFrame)) ? Math.max(lo, Math.round(Number(maxFrame))) : lo;
  const norm = normalizeInOutRange(range, lo, hi > lo ? hi : Number.POSITIVE_INFINITY);
  const fpsRate =
    fps && typeof fps === "object"
      ? Math.max(1, Number(fps.num || 25) / Math.max(1, Number(fps.den || 1)))
      : Math.max(1, Number.isFinite(Number(fps)) ? Number(fps) : 25);

  const hasIn = norm.in_frame !== null;
  const hasOut = norm.out_frame !== null;
  const isActive = hasIn || hasOut;
  const isComplete = hasIn && hasOut && norm.out_frame >= norm.in_frame;

  const durationFrames = isComplete ? norm.out_frame - norm.in_frame : null;
  const durationSeconds =
    durationFrames !== null ? Number((durationFrames / fpsRate).toFixed(3)) : null;

  const effectiveStart = hasIn ? norm.in_frame : lo;
  const effectiveEnd = hasOut ? norm.out_frame : hi;
  const effectiveDurationFrames = isActive ? Math.max(0, effectiveEnd - effectiveStart) : 0;
  const effectiveDurationSeconds = Number((effectiveDurationFrames / fpsRate).toFixed(3));

  return {
    in_frame: norm.in_frame,
    out_frame: norm.out_frame,
    hasIn,
    hasOut,
    isActive,
    isComplete,
    durationFrames,
    durationSeconds,
    effectiveStart,
    effectiveEnd,
    effectiveDurationFrames,
    effectiveDurationSeconds
  };
}

export function stepPlayheadInRange(
  currentFrame,
  deltaFrames,
  minFrame,
  maxFrame,
  ioRange = null,
  loopIo = false
) {
  const lo = Math.round(minFrame);
  const hi = Math.max(lo, Math.round(maxFrame));
  const metrics = computeInOutRangeMetrics(ioRange, 25, lo, hi);
  const useLoop = Boolean(loopIo && metrics.isComplete && metrics.durationFrames > 0);
  const boundLo = useLoop ? metrics.in_frame : lo;
  const boundHi = useLoop ? metrics.out_frame : hi;
  const next = Math.round(currentFrame) + Math.round(deltaFrames);

  if (useLoop) {
    const span = boundHi - boundLo;
    if (next > boundHi) {
      const wrapped = boundLo + ((next - boundLo) % (span + 1));
      return { frame: wrapped, stop: false };
    }
    if (next < boundLo) {
      const offset = (boundLo - next) % (span + 1);
      const wrapped = offset === 0 ? boundLo : boundHi - offset + 1;
      return { frame: wrapped, stop: false };
    }
    return { frame: next, stop: false };
  }

  if (next >= boundHi) return { frame: boundHi, stop: true };
  if (next <= boundLo) return { frame: boundLo, stop: true };
  return { frame: next, stop: false };
}

export function clampSplitWipePercent(value, fallback = SPLIT_WIPE_POS_DEFAULT) {
  const fbNum = Number(fallback);
  const safeFallback = Number.isFinite(fbNum)
    ? Math.min(SPLIT_WIPE_POS_MAX, Math.max(SPLIT_WIPE_POS_MIN, fbNum))
    : SPLIT_WIPE_POS_DEFAULT;
  if (value === null || value === undefined || value === "") {
    return safeFallback;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return safeFallback;
  }
  return Math.min(SPLIT_WIPE_POS_MAX, Math.max(SPLIT_WIPE_POS_MIN, num));
}

export function normalizeSplitWipeState(raw = null, defaultEnabled = false) {
  const src = raw && typeof raw === "object" ? raw : {};
  const enabled =
    typeof src.enabled === "boolean" ? src.enabled : Boolean(defaultEnabled);
  let rawPct = src.positionPct;
  if (rawPct === undefined && src.wipe_ratio !== undefined) {
    rawPct = Number(src.wipe_ratio) * 100;
  }
  const positionPct = clampSplitWipePercent(rawPct, SPLIT_WIPE_POS_DEFAULT);
  return {
    enabled,
    positionPct,
    ratio: positionPct / 100
  };
}

export function computeSplitWipeGeometry(frameX, frameY, frameW, frameH, positionPct) {
  const fx = Number.isFinite(Number(frameX)) ? Number(frameX) : 0;
  const fy = Number.isFinite(Number(frameY)) ? Number(frameY) : 0;
  const safeW = Math.max(0, Number.isFinite(Number(frameW)) ? Number(frameW) : 0);
  const safeH = Math.max(0, Number.isFinite(Number(frameH)) ? Number(frameH) : 0);
  const clampedPct = clampSplitWipePercent(positionPct, SPLIT_WIPE_POS_DEFAULT);
  const ratio = clampedPct / 100;
  const dividerX = Math.min(fx + safeW, Math.max(fx, fx + Math.round(safeW * ratio)));
  const leftW = Math.max(0, dividerX - fx);
  const rightW = Math.max(0, fx + safeW - dividerX);
  return {
    positionPct: clampedPct,
    ratio,
    dividerX,
    handleX: dividerX,
    handleY: fy + safeH * 0.5,
    frameRect: { x: fx, y: fy, width: safeW, height: safeH },
    leftRect: { x: fx, y: fy, width: leftW, height: safeH },
    rightRect: { x: dividerX, y: fy, width: rightW, height: safeH }
  };
}

export function computeSplitWipePercentFromPointer(pointerX, frameX, frameW) {
  const px = Number(pointerX);
  const fx = Number.isFinite(Number(frameX)) ? Number(frameX) : 0;
  const fw = Number(frameW);
  if (!Number.isFinite(px) || !Number.isFinite(fw) || fw <= 0) {
    return SPLIT_WIPE_POS_DEFAULT;
  }
  return clampSplitWipePercent(((px - fx) / fw) * 100, SPLIT_WIPE_POS_DEFAULT);
}

export function isPointerOnSplitWipeDivider(
  pointerX,
  pointerY,
  geometry,
  hitRadiusPx = SPLIT_WIPE_HIT_RADIUS_PX
) {
  if (!geometry || !geometry.frameRect) return false;
  const px = Number(pointerX);
  const py = Number(pointerY);
  const r = Number(hitRadiusPx);
  if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(r) || r < 0) {
    return false;
  }
  const { x, y, width, height } = geometry.frameRect;
  if (width <= 0 || height <= 0) return false;
  const inVertical = py >= y && py <= y + height;
  const inBoundsX = px >= x - r && px <= x + width + r;
  return inVertical && inBoundsX && Math.abs(px - geometry.dividerX) <= r;
}

export const STILLS_GALLERY_MAX = 8;

const SAFE_STILL_DATA_URL_RE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

function normalizeStillDate(dateInput) {
  if (dateInput instanceof Date && !Number.isNaN(dateInput.getTime())) {
    return dateInput;
  }
  if (dateInput !== undefined && dateInput !== null && dateInput !== "") {
    const parsed = new Date(dateInput);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

export function buildStillFilename(dateInput = new Date()) {
  const d = normalizeStillDate(dateInput);
  const pad2 = (n) => String(n).padStart(2, "0");
  const ymd = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
  const hms = `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
  return `taktcut-still-${ymd}-${hms}.png`;
}

export function sanitizeStillDataUrl(rawUrl) {
  if (typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  return SAFE_STILL_DATA_URL_RE.test(trimmed) ? trimmed : "";
}

export function createStillRecord(input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const source = src.source === "fx" ? "fx" : "color";
  const createdDate = normalizeStillDate(src.createdAt);
  const pad2 = (n) => String(n).padStart(2, "0");
  const timestampLabel = `${pad2(createdDate.getHours())}:${pad2(createdDate.getMinutes())}:${pad2(createdDate.getSeconds())}`;
  const filename =
    typeof src.filename === "string" && /^taktcut-still-\d{8}-\d{6}\.png$/.test(src.filename.trim())
      ? src.filename.trim()
      : buildStillFilename(createdDate);
  const idRaw = typeof src.id === "string" ? src.id.trim() : "";
  const id = idRaw || `still-${source}-${createdDate.getTime()}`;
  const labelRaw = typeof src.label === "string" ? src.label.trim() : "";
  const presetRaw = typeof src.preset === "string" ? src.preset.trim() : "";
  const timecodeRaw = typeof src.timecode === "string" ? src.timecode.trim() : "";
  const width = Math.max(0, Math.round(Number(src.width) || 0));
  const height = Math.max(0, Math.round(Number(src.height) || 0));

  return {
    id,
    source,
    dataUrl: sanitizeStillDataUrl(src.dataUrl),
    filename,
    label: labelRaw || (source === "fx" ? "FX" : "COLOR"),
    preset: presetRaw,
    timecode: timecodeRaw,
    createdAt: createdDate.toISOString(),
    timestampLabel,
    width,
    height
  };
}

export function appendStillBounded(stills, newStill, maxItems = STILLS_GALLERY_MAX) {
  const list = Array.isArray(stills)
    ? stills.filter((s) => s && typeof s === "object" && s.id)
    : [];
  const limitNum = Number(maxItems);
  const limit = Number.isFinite(limitNum)
    ? Math.max(1, Math.min(32, Math.floor(limitNum)))
    : STILLS_GALLERY_MAX;
  if (!newStill || typeof newStill !== "object" || !newStill.id) {
    return list.slice(0, limit);
  }
  const deduped = list.filter((item) => item.id !== newStill.id);
  return [newStill, ...deduped].slice(0, limit);
}

export function removeStillById(stills, stillId) {
  const list = Array.isArray(stills) ? stills : [];
  const targetId = typeof stillId === "string" ? stillId : String(stillId || "");
  if (!targetId) return [...list];
  return list.filter((item) => item && item.id !== targetId);
}

function normalizeChapterMarkers(markers) {
  if (!Array.isArray(markers)) return [];
  const valid = [];
  markers.forEach((m, idx) => {
    if (!m || typeof m !== "object") return;
    if (m.time_s === undefined || m.time_s === null || m.time_s === "") return;
    const rawTime = Number(m.time_s);
    if (!Number.isFinite(rawTime)) return;
    const rawLabel =
      typeof m.label === "string"
        ? m.label
        : typeof m.name === "string"
          ? m.name
          : "";
    valid.push({
      time_s: Math.max(0, rawTime),
      rawLabel,
      idx
    });
  });
  valid.sort((a, b) => a.time_s - b.time_s || a.idx - b.idx);
  return valid;
}

function formatChapterTimestamp(timeS) {
  const totalSec = Math.max(0, Math.floor(Number(timeS) + 1e-6));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad2 = (n) => String(n).padStart(2, "0");
  if (hours > 0) {
    return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  }
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

export function formatYoutubeChaptersFromMarkers(markers) {
  const sorted = normalizeChapterMarkers(markers);
  if (sorted.length === 0) return "";
  const entries = sorted.map((item) => ({
    time_s: item.time_s,
    label: item.rawLabel.replace(/[\r\n]+/g, " ").trim() || "Chapter"
  }));
  if (Math.floor(entries[0].time_s + 1e-6) > 0) {
    entries.unshift({ time_s: 0, label: "Intro" });
  }
  return entries
    .map((entry) => `${formatChapterTimestamp(entry.time_s)} ${entry.label}`)
    .join("\n");
}

export function escapeFfmetadataValue(raw) {
  return String(raw ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\/g, "\\\\")
    .replace(/=/g, "\\=")
    .replace(/;/g, "\\;")
    .replace(/#/g, "\\#")
    .replace(/\n/g, "\\\n");
}

export function formatFfmetadataFromMarkers(markers, totalDurationS) {
  const sorted = normalizeChapterMarkers(markers);
  const lines = [";FFMETADATA1"];
  if (sorted.length === 0) {
    return `${lines[0]}\n`;
  }
  const durS = Number(totalDurationS);
  const totalMs = Number.isFinite(durS) && durS > 0 ? Math.round(durS * 1000) : 0;
  for (let i = 0; i < sorted.length; i += 1) {
    const startMs = Math.round(sorted[i].time_s * 1000);
    const rawEndMs =
      i < sorted.length - 1 ? Math.round(sorted[i + 1].time_s * 1000) : totalMs;
    const endMs = Math.max(startMs, rawEndMs);
    const titleRaw = sorted[i].rawLabel.trim() || "Chapter";
    lines.push("[CHAPTER]");
    lines.push("TIMEBASE=1/1000");
    lines.push(`START=${startMs}`);
    lines.push(`END=${endMs}`);
    lines.push(`title=${escapeFfmetadataValue(titleRaw)}`);
  }
  return `${lines.join("\n")}\n`;
}

export function timelineDocToChapterInputs(doc) {
  if (!doc || !Array.isArray(doc.markers)) {
    return { markers: [], totalDurationS: 0 };
  }
  const fpsObj = doc.fps && typeof doc.fps === "object" ? doc.fps : { num: 25, den: 1 };
  const fpsRate = Math.max(1, Number(fpsObj.num || 25) / Math.max(1, Number(fpsObj.den || 1)));
  const startFrame = Number.isFinite(Number(doc.start_frame)) ? Number(doc.start_frame) : 0;
  const maxFrame = computeTimelineMaxFrame(doc);
  const totalDurationS = Math.max(0, (maxFrame - startFrame) / fpsRate);
  const markers = doc.markers.map((mk) => ({
    time_s: Math.max(0, (Number(mk && mk.frame ? mk.frame : 0) - startFrame) / fpsRate),
    label:
      mk && typeof mk.name === "string" && mk.name.trim()
        ? mk.name.trim()
        : mk && typeof mk.label === "string"
          ? mk.label.trim()
          : ""
  }));
  return { markers, totalDurationS };
}

function parseRenderFpsValue(rawFps, fallback = 25) {
  if (rawFps && typeof rawFps === "object") {
    const num = Number(rawFps.num);
    const den = Number(rawFps.den || 1);
    if (Number.isFinite(num) && num > 0 && Number.isFinite(den) && den > 0) {
      return clampNum(num / den, 1, 240);
    }
    return fallback;
  }
  if (typeof rawFps === "string") {
    const trimmed = rawFps.trim();
    if (!trimmed || trimmed.toLowerCase() === "source") return fallback;
    if (trimmed.includes("/")) {
      const [numStr, denStr] = trimmed.split("/");
      const num = Number(numStr);
      const den = Number(denStr);
      if (Number.isFinite(num) && num > 0 && Number.isFinite(den) && den > 0) {
        return clampNum(num / den, 1, 240);
      }
      return fallback;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? clampNum(parsed, 1, 240) : fallback;
  }
  const numVal = Number(rawFps);
  return Number.isFinite(numVal) && numVal > 0 ? clampNum(numVal, 1, 240) : fallback;
}

function formatEstimatedByteSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  if (bytes < 1_000_000) {
    return `~${Math.max(1, Math.round(bytes / 1000))} KB`;
  }
  const mb = bytes / 1_000_000;
  if (mb >= 1000) {
    return `~${(bytes / 1_000_000_000).toFixed(2)} GB`;
  }
  if (mb >= 100) {
    return `~${Math.round(mb)} MB`;
  }
  return `~${mb.toFixed(1)} MB`;
}

export function estimateRenderFileSize(params = {}) {
  const src = params && typeof params === "object" ? params : {};
  const rawDuration = src.durationS;
  const dur =
    rawDuration !== null && rawDuration !== undefined && rawDuration !== ""
      ? Number(rawDuration)
      : NaN;

  if (!Number.isFinite(dur) || dur <= 0) {
    return {
      estimatedBytes: 0,
      estimatedMb: 0,
      formattedSize: "0 MB",
      videoBitrateKbps: 0,
      audioBitrateKbps: 0,
      warning: "invalid_duration"
    };
  }

  const rawAudioOnly =
    typeof src.audioOnlyFormat === "string" ? src.audioOnlyFormat.trim().toLowerCase() : "off";
  if (rawAudioOnly === "wav24" || rawAudioOnly === "mp3_320" || rawAudioOnly === "aac_256") {
    const audioOnlyKbps = rawAudioOnly === "wav24" ? 2304 : rawAudioOnly === "mp3_320" ? 320 : 256;
    const estimatedBytes = Math.round(((audioOnlyKbps * 1000) / 8) * dur);
    const estimatedMb = Number((estimatedBytes / 1_000_000).toFixed(2));
    return {
      estimatedBytes,
      estimatedMb,
      formattedSize: formatEstimatedByteSize(estimatedBytes),
      videoBitrateKbps: 0,
      audioBitrateKbps: audioOnlyKbps,
      warning: estimatedMb >= 4000 ? "large_file" : null
    };
  }

  const rawCodec = typeof src.codec === "string" ? src.codec.trim().toLowerCase() : "h264";
  let codecKind = "h264";
  if (/prores/.test(rawCodec)) {
    codecKind = "prores";
  } else if (/hevc|h\.?265|x265/.test(rawCodec)) {
    codecKind = "hevc";
  }

  const rawWidth = Number(src.width);
  const rawHeight = Number(src.height);
  const width = Number.isFinite(rawWidth) && rawWidth > 0 ? clampNum(Math.round(rawWidth), 64, 15360) : 1920;
  const height = Number.isFinite(rawHeight) && rawHeight > 0 ? clampNum(Math.round(rawHeight), 64, 15360) : 1080;
  const resScale = Math.max(0.05, (width * height) / (1920 * 1080));
  const fpsVal = parseRenderFpsValue(src.fps, 25);

  const rawAudio = src.audioBitrateKbps;
  const parsedAudio =
    rawAudio !== null && rawAudio !== undefined && rawAudio !== "" ? Number(rawAudio) : NaN;
  const hasExplicitAudio = Number.isFinite(parsedAudio) && parsedAudio >= 0;

  let videoBitrateKbps = 0;
  let audioBitrateKbps = 0;

  if (codecKind === "prores") {
    const isHq = /hq/.test(rawCodec);
    const baseProresKbps = isHq ? 184000 : 113696;
    videoBitrateKbps = Math.max(1000, Math.round(baseProresKbps * resScale * (fpsVal / 25)));
    audioBitrateKbps = hasExplicitAudio ? Math.round(parsedAudio) : 2304;
  } else {
    const rawCrf = src.crf;
    const parsedCrf =
      rawCrf !== null && rawCrf !== undefined && rawCrf !== "" ? Number(rawCrf) : NaN;
    const fpsFactor = Math.pow(fpsVal / 25, 0.65);

    if (codecKind === "hevc") {
      const crf = Number.isFinite(parsedCrf) ? clampNum(parsedCrf, 0, 51) : 20;
      const crfFactor = Math.pow(2, (20 - crf) / 6);
      videoBitrateKbps = Math.max(120, Math.round(4800 * resScale * fpsFactor * crfFactor));
    } else {
      const crf = Number.isFinite(parsedCrf) ? clampNum(parsedCrf, 0, 51) : 18;
      const crfFactor = Math.pow(2, (18 - crf) / 6);
      videoBitrateKbps = Math.max(150, Math.round(7168 * resScale * fpsFactor * crfFactor));
    }
    audioBitrateKbps = hasExplicitAudio ? Math.round(parsedAudio) : 192;
  }

  const totalBitrateKbps = videoBitrateKbps + audioBitrateKbps;
  const estimatedBytes = Math.round(((totalBitrateKbps * 1000) / 8) * dur);
  const estimatedMb = Number((estimatedBytes / 1_000_000).toFixed(2));
  const formattedSize = formatEstimatedByteSize(estimatedBytes);

  let warning = null;
  if (estimatedMb >= 4000) {
    warning = "large_file";
  }

  return {
    estimatedBytes,
    estimatedMb,
    formattedSize,
    videoBitrateKbps,
    audioBitrateKbps,
    warning
  };
}

export function framesToSmpteTimecode(frames, fps = 25) {
  const rawFps = parseRenderFpsValue(fps, 25);
  const fpsInt = Math.max(1, Math.round(rawFps));
  const numFrames = Number(frames);
  const safeFrames = Number.isFinite(numFrames) ? Math.max(0, Math.round(numFrames)) : 0;
  const ff = safeFrames % fpsInt;
  const totalSeconds = Math.floor(safeFrames / fpsInt);
  const ss = totalSeconds % 60;
  const mm = Math.floor(totalSeconds / 60) % 60;
  const hh = Math.floor(totalSeconds / 3600);
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}:${pad2(ff)}`;
}

export function formatCmx3600Edl(timelineDoc, title = "TAKTCUT_TIMELINE") {
  const rawTitle = typeof title === "string" ? title.replace(/[\r\n]+/g, " ").trim() : "";
  const edlTitle = rawTitle || "TAKTCUT_TIMELINE";
  const lines = [`TITLE: ${edlTitle}`, "FCM: NON-DROP FRAME"];

  if (!timelineDoc || !Array.isArray(timelineDoc.tracks)) {
    return `${lines.join("\n")}\n`;
  }

  const fps = timelineDoc.fps !== undefined ? timelineDoc.fps : 25;
  const videoClips = [];
  for (const trk of timelineDoc.tracks) {
    if (!trk || trk.kind !== "video" || !Array.isArray(trk.clips)) continue;
    const trackIndex = Number.isFinite(Number(trk.index)) ? Number(trk.index) : 1;
    trk.clips.forEach((clip, clipIdx) => {
      if (!clip || clip.enabled === false) return;
      const durFrames = Math.round(Number(clip.duration_frames) || 0);
      if (!Number.isFinite(durFrames) || durFrames <= 0) return;
      const recInFrame = Math.max(0, Math.round(Number(clip.start_frame) || 0));
      const rawSrcIn =
        clip.source_in_frame !== undefined
          ? clip.source_in_frame
          : clip.source_start_frame !== undefined
            ? clip.source_start_frame
            : 0;
      const srcInFrame = Math.max(0, Math.round(Number(rawSrcIn) || 0));
      videoClips.push({
        clip,
        trackIndex,
        clipIdx,
        recInFrame,
        recOutFrame: recInFrame + durFrames,
        srcInFrame,
        srcOutFrame: srcInFrame + durFrames
      });
    });
  }

  videoClips.sort(
    (a, b) =>
      a.recInFrame - b.recInFrame ||
      a.trackIndex - b.trackIndex ||
      a.clipIdx - b.clipIdx
  );

  if (videoClips.length === 0) {
    return `${lines.join("\n")}\n`;
  }

  lines.push("");
  videoClips.forEach((item, idx) => {
    const eventNum = String(idx + 1).padStart(3, "0");
    const srcIn = framesToSmpteTimecode(item.srcInFrame, fps);
    const srcOut = framesToSmpteTimecode(item.srcOutFrame, fps);
    const recIn = framesToSmpteTimecode(item.recInFrame, fps);
    const recOut = framesToSmpteTimecode(item.recOutFrame, fps);
    const { clip } = item;
    const fallbackPath =
      typeof clip.source_path === "string" && clip.source_path.trim()
        ? clip.source_path.trim().split(/[\\/]/).pop()
        : typeof clip.media_ref === "string" && clip.media_ref.trim()
          ? clip.media_ref.trim().split(/[\\/]/).pop()
          : "";
    const rawClipName =
      typeof clip.name === "string" && clip.name.trim() ? clip.name : fallbackPath;
    const clipName =
      String(rawClipName || "").replace(/[\r\n]+/g, " ").trim() || `CLIP_${eventNum}`;
    lines.push(`${eventNum}  AX       V     C        ${srcIn} ${srcOut} ${recIn} ${recOut}`);
    lines.push(`* FROM CLIP NAME: ${clipName}`);
    lines.push("");
  });

  return lines.join("\n");
}

export function escapeXmlAttr(raw) {
  if (raw === null || raw === undefined) return "";
  return String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function gcdInt(a, b) {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

function resolveFcpxmlRationalFps(rawFps) {
  if (rawFps && typeof rawFps === "object") {
    const num = Math.round(Number(rawFps.num));
    const den = Math.round(Number(rawFps.den || 1));
    if (Number.isFinite(num) && num > 0 && Number.isFinite(den) && den > 0) {
      return { num, den };
    }
    return { num: 25, den: 1 };
  }
  if (typeof rawFps === "string") {
    const trimmed = rawFps.trim();
    if (trimmed.includes("/")) {
      const [nStr, dStr] = trimmed.split("/");
      const num = Math.round(Number(nStr));
      const den = Math.round(Number(dStr));
      if (Number.isFinite(num) && num > 0 && Number.isFinite(den) && den > 0) {
        return { num, den };
      }
      return { num: 25, den: 1 };
    }
  }
  const val = Number(rawFps);
  if (!Number.isFinite(val) || val <= 0) {
    return { num: 25, den: 1 };
  }
  if (Math.abs(val - 24000 / 1001) < 0.01) return { num: 24000, den: 1001 };
  if (Math.abs(val - 30000 / 1001) < 0.01) return { num: 30000, den: 1001 };
  if (Math.abs(val - 60000 / 1001) < 0.01) return { num: 60000, den: 1001 };
  if (Number.isInteger(val)) return { num: val, den: 1 };
  const scaledNum = Math.round(val * 1000);
  const g = gcdInt(scaledNum, 1000);
  return { num: scaledNum / g, den: 1000 / g };
}

function formatFcpxmlRationalTime(frames, fpsRat) {
  const safeFrames = Number.isFinite(Number(frames)) ? Math.max(0, Math.round(Number(frames))) : 0;
  if (safeFrames === 0) return "0s";
  return `${safeFrames * fpsRat.den}/${fpsRat.num}s`;
}

function toFcpxmlFileUri(rawPath, fallbackName) {
  const trimmed = typeof rawPath === "string" ? rawPath.replace(/[\r\n]+/g, " ").trim() : "";
  if (!trimmed) {
    const safeName = String(fallbackName || "clip").replace(/[^A-Za-z0-9._-]/g, "_") || "clip";
    return `file:///media/${safeName}`;
  }
  if (/^file:\/\//i.test(trimmed)) {
    return trimmed.replace(/ /g, "%20");
  }
  const normalized = trimmed.replace(/\\/g, "/");
  const encoded = normalized
    .split("/")
    .map((seg, idx) => (idx === 0 && /^[A-Za-z]:$/.test(seg) ? seg : encodeURIComponent(seg)))
    .join("/");
  if (/^[A-Za-z]:\//.test(encoded)) return `file:///${encoded}`;
  if (encoded.startsWith("/")) return `file://${encoded}`;
  return `file:///${encoded}`;
}

export function formatFcpxmlTimeline(timelineDoc, projectName = "TaktCut_Timeline") {
  const rawProj = typeof projectName === "string" ? projectName.replace(/[\r\n]+/g, " ").trim() : "";
  const safeProjectName = rawProj || "TaktCut_Timeline";
  const fpsRat = resolveFcpxmlRationalFps(timelineDoc && timelineDoc.fps !== undefined ? timelineDoc.fps : 25);
  const frameDuration = `${fpsRat.den}/${fpsRat.num}s`;
  const width =
    timelineDoc && Number.isFinite(Number(timelineDoc.width)) && Number(timelineDoc.width) > 0
      ? Math.round(Number(timelineDoc.width))
      : 1920;
  const height =
    timelineDoc && Number.isFinite(Number(timelineDoc.height)) && Number(timelineDoc.height) > 0
      ? Math.round(Number(timelineDoc.height))
      : 1080;

  const videoClips = [];
  const audioClips = [];
  if (timelineDoc && Array.isArray(timelineDoc.tracks)) {
    for (const trk of timelineDoc.tracks) {
      if (!trk || !Array.isArray(trk.clips)) continue;
      const kind = trk.kind === "audio" ? "audio" : trk.kind === "video" ? "video" : "";
      if (!kind) continue;
      const trackIndex = Number.isFinite(Number(trk.index)) ? Number(trk.index) : 1;
      trk.clips.forEach((clip, clipIdx) => {
        if (!clip || clip.enabled === false) return;
        const durFrames = Math.round(Number(clip.duration_frames) || 0);
        if (!Number.isFinite(durFrames) || durFrames <= 0) return;
        const recInFrame = Math.max(0, Math.round(Number(clip.start_frame) || 0));
        const rawSrcIn =
          clip.source_in_frame !== undefined
            ? clip.source_in_frame
            : clip.source_start_frame !== undefined
              ? clip.source_start_frame
              : 0;
        const srcInFrame = Math.max(0, Math.round(Number(rawSrcIn) || 0));
        const entry = {
          clip,
          kind,
          trackIndex,
          clipIdx,
          recInFrame,
          durFrames,
          recOutFrame: recInFrame + durFrames,
          srcInFrame,
          srcOutFrame: srcInFrame + durFrames
        };
        if (kind === "video") {
          videoClips.push(entry);
        } else {
          audioClips.push(entry);
        }
      });
    }
  }

  const assetMap = new Map();
  const assetList = [];
  let nextAssetNum = 2;

  const registerAsset = (item, fallbackIndex) => {
    const { clip } = item;
    const rawSource =
      typeof clip.source_path === "string" && clip.source_path.trim()
        ? clip.source_path.trim()
        : typeof clip.media_ref === "string" && clip.media_ref.trim()
          ? clip.media_ref.trim()
          : "";
    const leafName = rawSource ? rawSource.split(/[\\/]/).pop() : "";
    const rawClipName =
      typeof clip.name === "string" && clip.name.trim() ? clip.name : leafName;
    const clipName =
      String(rawClipName || "").replace(/[\r\n]+/g, " ").trim() || `CLIP_${String(fallbackIndex).padStart(3, "0")}`;
    const srcUri = toFcpxmlFileUri(rawSource, clipName);
    let asset = assetMap.get(srcUri);
    const minDurationFrames = Math.max(
      item.srcOutFrame,
      Number.isFinite(Number(clip.source_duration_frames)) ? Math.round(Number(clip.source_duration_frames)) : 0
    );
    if (!asset) {
      asset = {
        id: `r${nextAssetNum}`,
        name: leafName || clipName,
        srcUri,
        durationFrames: minDurationFrames,
        hasVideo: item.kind === "video",
        hasAudio: item.kind === "audio"
      };
      nextAssetNum += 1;
      assetMap.set(srcUri, asset);
      assetList.push(asset);
    } else {
      asset.durationFrames = Math.max(asset.durationFrames, minDurationFrames);
      if (item.kind === "video") asset.hasVideo = true;
      if (item.kind === "audio") asset.hasAudio = true;
    }
    return { asset, clipName };
  };

  videoClips.sort(
    (a, b) => a.recInFrame - b.recInFrame || a.trackIndex - b.trackIndex || a.clipIdx - b.clipIdx
  );
  audioClips.sort(
    (a, b) => a.recInFrame - b.recInFrame || a.trackIndex - b.trackIndex || a.clipIdx - b.clipIdx
  );

  const minVideoTrack =
    videoClips.length > 0 ? Math.min(...videoClips.map((item) => item.trackIndex)) : 1;
  const primaryClips = [];
  const connectedClips = [];
  let primaryCursor = 0;

  videoClips.forEach((item, idx) => {
    const resolved = registerAsset(item, idx + 1);
    const enriched = { ...item, ...resolved };
    if (item.trackIndex === minVideoTrack && item.recInFrame >= primaryCursor) {
      primaryClips.push(enriched);
      primaryCursor = item.recOutFrame;
    } else {
      const lane = item.trackIndex > minVideoTrack ? item.trackIndex - minVideoTrack : 1;
      connectedClips.push({ ...enriched, lane });
    }
  });

  audioClips.forEach((item, idx) => {
    const resolved = registerAsset(item, videoClips.length + idx + 1);
    const lane = -Math.max(1, item.trackIndex);
    connectedClips.push({ ...item, ...resolved, lane });
  });

  const allTimelineClips = [...primaryClips, ...connectedClips];
  const totalFrames = allTimelineClips.reduce(
    (acc, item) => Math.max(acc, item.recOutFrame),
    0
  );

  const spineItems = [];
  let cursor = 0;
  for (const item of primaryClips) {
    if (item.recInFrame > cursor) {
      spineItems.push({
        type: "gap",
        recInFrame: cursor,
        durFrames: item.recInFrame - cursor,
        recOutFrame: item.recInFrame,
        srcInFrame: 0,
        children: []
      });
    }
    spineItems.push({
      type: "clip",
      ...item,
      children: []
    });
    cursor = item.recOutFrame;
  }

  if (spineItems.length === 0 && totalFrames > 0) {
    spineItems.push({
      type: "gap",
      recInFrame: 0,
      durFrames: totalFrames,
      recOutFrame: totalFrames,
      srcInFrame: 0,
      children: []
    });
  } else if (totalFrames > cursor && spineItems.length > 0) {
    spineItems.push({
      type: "gap",
      recInFrame: cursor,
      durFrames: totalFrames - cursor,
      recOutFrame: totalFrames,
      srcInFrame: 0,
      children: []
    });
  }

  for (const conn of connectedClips) {
    const host =
      spineItems.find((s) => conn.recInFrame >= s.recInFrame && conn.recInFrame < s.recOutFrame) ||
      spineItems[spineItems.length - 1];
    if (host) {
      const localOffsetFrames = host.srcInFrame + (conn.recInFrame - host.recInFrame);
      host.children.push({
        kind: "connected",
        conn,
        localOffsetFrames: Math.max(0, localOffsetFrames)
      });
    }
  }

  if (timelineDoc && Array.isArray(timelineDoc.markers) && spineItems.length > 0) {
    const startFrame = Number.isFinite(Number(timelineDoc.start_frame)) ? Number(timelineDoc.start_frame) : 0;
    for (const mk of timelineDoc.markers) {
      if (!mk) continue;
      const mkFrame = Math.max(0, Math.round(Number(mk.frame || 0) - startFrame));
      const mkDur = Math.max(1, Math.round(Number(mk.duration_frames || 1)));
      const mkValue = String(mk.name || mk.label || "Marker").replace(/[\r\n]+/g, " ").trim() || "Marker";
      const mkNote = typeof mk.note === "string" ? mk.note.replace(/[\r\n]+/g, " ").trim() : "";
      const host =
        spineItems.find((s) => mkFrame >= s.recInFrame && mkFrame < s.recOutFrame) ||
        spineItems[spineItems.length - 1];
      if (host) {
        const localStart = host.srcInFrame + Math.max(0, mkFrame - host.recInFrame);
        host.children.push({
          kind: "marker",
          localStart,
          durFrames: mkDur,
          value: mkValue,
          note: mkNote
        });
      }
    }
  }

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<!DOCTYPE fcpxml>",
    '<fcpxml version="1.10">',
    "  <resources>",
    `    <format id="r1" frameDuration="${frameDuration}" width="${width}" height="${height}" />`
  ];

  for (const asset of assetList) {
    const mediaFlags = [
      asset.hasVideo ? 'hasVideo="1"' : "",
      asset.hasAudio ? 'hasAudio="1"' : ""
    ]
      .filter(Boolean)
      .join(" ");
    const formatAttr = asset.hasVideo ? ' format="r1"' : "";
    const flagAttr = mediaFlags ? ` ${mediaFlags}` : "";
    lines.push(
      `    <asset id="${asset.id}" name="${escapeXmlAttr(asset.name)}" start="0s" duration="${formatFcpxmlRationalTime(asset.durationFrames, fpsRat)}"${flagAttr}${formatAttr}>`
    );
    lines.push(`      <media-rep kind="original-media" src="${escapeXmlAttr(asset.srcUri)}" />`);
    lines.push("    </asset>");
  }

  lines.push("  </resources>");
  lines.push("  <library>");
  lines.push(`    <event name="${escapeXmlAttr(safeProjectName)}">`);
  lines.push(`      <project name="${escapeXmlAttr(safeProjectName)}">`);
  lines.push(
    `        <sequence format="r1" duration="${formatFcpxmlRationalTime(totalFrames, fpsRat)}" tcStart="0s" tcFormat="NDF">`
  );

  if (spineItems.length === 0) {
    lines.push("          <spine />");
  } else {
    lines.push("          <spine>");
    for (const item of spineItems) {
      const offsetStr = formatFcpxmlRationalTime(item.recInFrame, fpsRat);
      const durStr = formatFcpxmlRationalTime(item.durFrames, fpsRat);
      const startStr = formatFcpxmlRationalTime(item.srcInFrame, fpsRat);
      const openTag =
        item.type === "gap"
          ? `<gap name="Gap" offset="${offsetStr}" duration="${durStr}" start="0s"`
          : `<asset-clip ref="${item.asset.id}" offset="${offsetStr}" name="${escapeXmlAttr(item.clipName)}" start="${startStr}" duration="${durStr}"`;
      if (item.children.length === 0) {
        lines.push(`            ${openTag} />`);
      } else {
        lines.push(`            ${openTag}>`);
        for (const ch of item.children) {
          if (ch.kind === "connected") {
            const c = ch.conn;
            const cOff = formatFcpxmlRationalTime(ch.localOffsetFrames, fpsRat);
            const cStart = formatFcpxmlRationalTime(c.srcInFrame, fpsRat);
            const cDur = formatFcpxmlRationalTime(c.durFrames, fpsRat);
            lines.push(
              `              <asset-clip ref="${c.asset.id}" lane="${c.lane}" offset="${cOff}" name="${escapeXmlAttr(c.clipName)}" start="${cStart}" duration="${cDur}" />`
            );
          } else if (ch.kind === "marker") {
            const mStart = formatFcpxmlRationalTime(ch.localStart, fpsRat);
            const mDur = formatFcpxmlRationalTime(ch.durFrames, fpsRat);
            const noteAttr = ch.note ? ` note="${escapeXmlAttr(ch.note)}"` : "";
            lines.push(
              `              <marker start="${mStart}" duration="${mDur}" value="${escapeXmlAttr(ch.value)}"${noteAttr} />`
            );
          }
        }
        lines.push(item.type === "gap" ? "            </gap>" : "            </asset-clip>");
      }
    }
    lines.push("          </spine>");
  }

  lines.push("        </sequence>");
  lines.push("      </project>");
  lines.push("    </event>");
  lines.push("  </library>");
  lines.push("</fcpxml>");

  return `${lines.join("\n")}\n`;
}
