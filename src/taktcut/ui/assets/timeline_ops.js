export const SNAP_THRESHOLD_PX = 10;
export const AUDIO_GAIN_DB_MIN = -24;
export const AUDIO_GAIN_DB_MAX = 12;
export const AUDIO_FADE_S_MIN = 0;
export const AUDIO_FADE_S_MAX = 5;
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
export const TRANSITION_DURATION_MIN_S = 0.1;
export const TRANSITION_DURATION_MAX_S = 2.0;
export const TRANSITION_DURATION_DEFAULT_S = 0.5;
export const BPM_MIN = 60;
export const BPM_MAX = 200;
export const BPM_DEFAULT = 128;
export const BPM_OFFSET_MIN_S = -10.0;
export const BPM_OFFSET_MAX_S = 10.0;
export const BPM_OFFSET_DEFAULT_S = 0.0;

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
    opacity_pct: 100.0
  },
  {
    id: "pip_bottom_right",
    label: "PiP Bottom-Right",
    label_fr: "PiP Bas-Droite",
    zoom_pct: 28.0,
    pos_x_pct: 32.0,
    pos_y_pct: 32.0,
    rotation_deg: 0.0,
    opacity_pct: 100.0
  },
  {
    id: "zoom_punch_115",
    label: "Zoom Punch 115%",
    label_fr: "Zoom Punch 115%",
    zoom_pct: 115.0,
    pos_x_pct: 0.0,
    pos_y_pct: 0.0,
    rotation_deg: 0.0,
    opacity_pct: 100.0
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

export function normalizeClipTransform(clipOrTransform) {
  const src =
    clipOrTransform && clipOrTransform.transform && typeof clipOrTransform.transform === "object"
      ? clipOrTransform.transform
      : clipOrTransform &&
          (clipOrTransform.zoom_pct !== undefined ||
            clipOrTransform.pos_x_pct !== undefined ||
            clipOrTransform.pos_y_pct !== undefined ||
            clipOrTransform.rotation_deg !== undefined ||
            clipOrTransform.opacity_pct !== undefined)
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
  return {
    zoom_pct: Number(zoom.toFixed(1)),
    pos_x_pct: Number(posX.toFixed(1)),
    pos_y_pct: Number(posY.toFixed(1)),
    rotation_deg: Number(rot.toFixed(1)),
    opacity_pct: Number(opacity.toFixed(1))
  };
}

export function isClipTransformIdentity(transformOrClip) {
  const norm = normalizeClipTransform(transformOrClip);
  return (
    Math.abs(norm.zoom_pct - 100.0) <= 1e-4 &&
    Math.abs(norm.pos_x_pct) <= 1e-4 &&
    Math.abs(norm.pos_y_pct) <= 1e-4 &&
    Math.abs(norm.rotation_deg) <= 1e-4 &&
    Math.abs(norm.opacity_pct - 100.0) <= 1e-4
  );
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
  return parts.join(" ");
}

export function compileTransformFilterClient(params, pixFmt = null) {
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

export function compileAudioFilterClient(params, clipDurationS = null, targetLufs = null) {
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
    if (targetLufs !== null && targetLufs !== undefined && Number.isFinite(Number(targetLufs))) {
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
    params: { gain_db: gainDb, fade_in_s: fadeInS, fade_out_s: fadeOutS, muted }
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
    opacity_pct: p.opacity_pct !== undefined ? Number(p.opacity_pct) : origNorm.opacity_pct
  };
  if (
    !Number.isFinite(nextRaw.zoom_pct) ||
    !Number.isFinite(nextRaw.pos_x_pct) ||
    !Number.isFinite(nextRaw.pos_y_pct) ||
    !Number.isFinite(nextRaw.rotation_deg) ||
    !Number.isFinite(nextRaw.opacity_pct)
  ) {
    return { doc, clip: null, changed: false };
  }
  const nextNorm = normalizeClipTransform(nextRaw);
  const unchanged =
    Math.abs(nextNorm.zoom_pct - origNorm.zoom_pct) < 1e-4 &&
    Math.abs(nextNorm.pos_x_pct - origNorm.pos_x_pct) < 1e-4 &&
    Math.abs(nextNorm.pos_y_pct - origNorm.pos_y_pct) < 1e-4 &&
    Math.abs(nextNorm.rotation_deg - origNorm.rotation_deg) < 1e-4 &&
    Math.abs(nextNorm.opacity_pct - origNorm.opacity_pct) < 1e-4;
  if (unchanged) {
    return { doc, clip: foundOrig.clip, changed: false };
  }

  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, trackKind, trackIndex, clipIndex);
  if (!found) return { doc, clip: null, changed: false };
  found.clip.transform = isClipTransformIdentity(nextNorm) ? null : nextNorm;
  return { doc: nextDoc, clip: found.clip, changed: true };
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
