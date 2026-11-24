import { applyAscCdlRgb, applyColorGradeRgb } from "./canvas.js";
import {
  ASPECT_RATIO_PRESETS,
  COLOR_CURVE_PRESETS,
  COLOR_WARPER_BOUNDS,
  COLOR_WARPER_HUE_COUNT,
  COLOR_WARPER_PRESETS_CLIENT,
  COLOR_WARPER_SAT_RINGS,
  DELIVERY_PRESETS,
  HSL_CURVE_PRESETS,
  LOUDNESS_PRESET_LUFS,
  PLANAR_TRACKER_PRESETS_CLIENT,
  QUALIFIER_PRESETS,
  STABILIZER_PRESETS_CLIENT,
  TRANSFORM_BORDER_FEATHER_MAX,
  TRANSFORM_BORDER_FEATHER_MIN,
  TRANSFORM_BORDER_WIDTH_MAX,
  TRANSFORM_BORDER_WIDTH_MIN,
  TRANSFORM_CROP_MAX,
  TRANSFORM_CROP_MIN,
  TRANSFORM_CROP_SUM_MAX,
  TRANSFORM_PRESETS,
  TRANSFORM_SHADOW_BLUR_MAX,
  TRANSFORM_SHADOW_BLUR_MIN,
  TRANSFORM_SHADOW_OFFSET_MAX,
  TRANSFORM_SHADOW_OFFSET_MIN,
  TRANSFORM_SHADOW_OPACITY_MAX,
  TRANSFORM_SHADOW_OPACITY_MIN,
  TRANSITION_PRESETS,
  bakeColorNodeChainToCubeTextClient,
  buildAtempoStagesClient,
  alignAvSplitInDocument,
  analyzeAudioSpectrumClient,
  applySplitEditJlInDocument,
  compileAudioFilterClient,
  compileAutoDuckFilterClient,
  compileColorNodeChainClient,
  compileCompoundFiltergraphClient,
  compileFairlightAudioFilterClient,
  compileFairlightAudioRackClient,
  compileFairlightMixerClient,
  compileFramingFilterClient,
  compileMinterpolateFilterClient,
  compileMulticamFiltergraphClient,
  compilePlanarTrackerFilterClient,
  compileRetimeFilterClient,
  compileRetimeRampSetptsClient,
  compileSplitEditFiltergraphClient,
  compileStabilizerFilterClient,
  compileTransformFilterClient,
  compileTransitionFilterClient,
  compileVideoFadeFilterClient,
  computeAvSplitEditInfo,
  computeRetimeRampSummary,
  countMulticamClipsInDocument,
  countSyncLockedTracks,
  createColorNode,
  createCompoundClipInDocument,
  createMulticamClipInDocument,
  decomposeCompoundClipInDocument,
  deleteMulticamCutInDocument,
  deserializeColorNodeFromApi,
  detectAudioTransientsClient,
  estimateRenderFileSize,
  flattenAllCompoundsInDocument,
  flattenMulticamClipInDocument,
  getDeliveryPresetClient,
  linkAvClipsInDocument,
  normalizeFairlightAudioParams,
  normalizeRetimeProcess,
  normalizeRetimeRampPreset,
  parseCubeLutTextClient,
  resolveRetimeRampPointsForPreset,
  rippleDeleteClipInDocument,
  rippleTrimClipInDocument,
  rollEditCutInDocument,
  setAllTracksSyncLockInDocument,
  slideClipInDocument,
  slipClipInDocument,
  switchMulticamAngleInDocument,
  syncMulticamClipInDocument,
  toggleTrackSyncLockInDocument,
  unlinkAvClipsInDocument,
  updateCompoundSubsequenceInDocument,
  updateMulticamAngleInDocument,
  validateTimelineClient
} from "./timeline_ops.js";

function buildDemoTimeline(preset) {
  const fps25 = { num: 25, den: 1 };
  const fpsNtsc = { num: 24000, den: 1001 };
  if (preset === "issues") {
    return {
      name: "Diagnostic_Master_Cut_25p",
      source_format: "drt",
      fps: fps25,
      width: 1920,
      height: 1080,
      start_frame: 0,
      color_space_tags: ["Rec.709 / Gamma 2.4"],
      lut_refs: ["luts/warm_editorial_v1.cube"],
      tracks: [
        {
          index: 1,
          kind: "video",
          name: "V1 Main Picture",
          clips: [
            { name: "A001_Opening_Wide", track_index: 1, media_type: "video", start_frame: 0, duration_frames: 100, source_in_frame: 24, source_path: "media/A001_Opening_Wide.mov", source_fps: fps25, enabled: true },
            { name: "A002_Studio_Detail", track_index: 1, media_type: "video", start_frame: 125, duration_frames: 100, source_in_frame: 0, source_path: "media/A002_Studio_Detail.mov", source_fps: fpsNtsc, enabled: true },
            { name: "A003_Talent_Close", track_index: 1, media_type: "video", start_frame: 210, duration_frames: 140, source_in_frame: 12, source_path: "media/A003_Talent_Close.mov", source_fps: fps25, enabled: true },
            { name: "A004_Empty_MarkerClip", track_index: 1, media_type: "video", start_frame: 350, duration_frames: 0, source_in_frame: 0, source_path: "media/A004_Empty.mov", source_fps: fps25, enabled: true }
          ]
        },
        {
          index: 1,
          kind: "audio",
          name: "A1 Dialogue",
          clips: [
            { name: "VO_Intro_Clean", track_index: 1, media_type: "audio", start_frame: 0, duration_frames: 350, source_in_frame: 0, source_path: "audio/vo_intro.wav", enabled: true }
          ]
        }
      ],
      markers: [
        { name: "Gap Alert", frame: 100, duration_frames: 25, color: "Red", note: "25-frame gap before A002" },
        { name: "Overlap Check", frame: 210, duration_frames: 15, color: "Yellow", note: "15-frame overlap on V1" }
      ]
    };
  }
  return {
    name: "Eclipse_Showreel_Master_25p",
    source_format: "drt",
    fps: fps25,
    width: 1920,
    height: 1080,
    start_frame: 0,
    color_space_tags: ["Rec.709 / Gamma 2.4"],
    lut_refs: ["luts/warm_editorial_v1.cube"],
    tracks: [
      {
        index: 1,
        kind: "video",
        name: "V1 Main Picture",
        sync_locked: true,
        clips: [
          { name: "A001_Opening_Wide", track_index: 1, media_type: "video", start_frame: 0, duration_frames: 125, source_in_frame: 24, source_path: "media/A001_Opening_Wide.mov", source_fps: fps25, enabled: true, link_group_id: "av-01", transition_out: { preset: "fade", duration_s: 0.5, include_audio: true, audio_curve: "tri" } },
          { name: "A002_Studio_Detail", track_index: 1, media_type: "video", start_frame: 125, duration_frames: 100, source_in_frame: 10, source_path: "media/A002_Studio_Detail.mov", source_fps: fps25, enabled: true, speed_rate: 0.5 },
          { name: "A003_Talent_Close", track_index: 1, media_type: "video", start_frame: 225, duration_frames: 150, source_in_frame: 48, source_path: "media/A003_Talent_Close.mov", source_fps: fps25, enabled: true, transition_out: { preset: "wipeleft", duration_s: 0.8, include_audio: true, audio_curve: "tri" } },
          { name: "A004_End_Packshot", track_index: 1, media_type: "video", start_frame: 375, duration_frames: 125, source_in_frame: 0, source_path: "media/A004_End_Packshot.mov", source_fps: fps25, enabled: true, link_group_id: "av-03", speed_rate: 2.0, reverse: true }
        ]
      },
      {
        index: 2,
        kind: "video",
        name: "V2 Titles & GFX",
        clips: [
          { name: "GFX_LowerThird_Main", track_index: 2, media_type: "video", start_frame: 25, duration_frames: 150, source_in_frame: 0, source_path: "gfx/lower_third_main.mov", source_fps: fps25, enabled: true }
        ]
      },
      {
        index: 1,
        kind: "audio",
        name: "A1 Dialogue / VO",
        sync_locked: true,
        clips: [
          { name: "VO_Intro_Clean", track_index: 1, media_type: "audio", start_frame: 0, duration_frames: 125, source_in_frame: 0, source_path: "audio/vo_intro.wav", enabled: true, link_group_id: "av-01", audio_gain_db: 1.5, fade_in_s: 0.4, fade_out_s: 0.0 },
          { name: "VO_Feature_Main", track_index: 1, media_type: "audio", start_frame: 125, duration_frames: 250, source_in_frame: 0, source_path: "audio/vo_feature.wav", enabled: true },
          { name: "VO_Tagline_End", track_index: 1, media_type: "audio", start_frame: 375, duration_frames: 125, source_in_frame: 0, source_path: "audio/vo_tagline.wav", enabled: true, link_group_id: "av-03", fade_out_s: 0.6 }
        ]
      },
      {
        index: 2,
        kind: "audio",
        name: "A2 Music Stem",
        clips: [
          { name: "MX_Bed_Full_20s", track_index: 2, media_type: "audio", start_frame: 0, duration_frames: 500, source_in_frame: 0, source_path: "audio/mx_bed_20s.wav", enabled: true, audio_gain_db: -6.0, fade_in_s: 1.2, fade_out_s: 2.0 }
        ]
      }
    ],
    markers: [
      { name: "Intro Title Cue", frame: 25, duration_frames: 1, color: "Blue", note: "Lower third fade-in" },
      { name: "Grade Reference", frame: 225, duration_frames: 1, color: "Yellow", note: "Rec.709 skin tone check" },
      { name: "Loudness Gate", frame: 375, duration_frames: 1, color: "Green", note: "-14.0 LUFS web target" }
    ]
  };
}

function buildOtioJsonString(doc) {
  const rate = doc.fps.num / Math.max(1, doc.fps.den);
  const otio = {
    OTIO_SCHEMA: "Timeline.1",
    name: doc.name,
    global_start_time: { OTIO_SCHEMA: "RationalTime.1", value: doc.start_frame || 0, rate },
    metadata: { taktcut: { fps_num: doc.fps.num, fps_den: doc.fps.den, width: doc.width, height: doc.height } },
    tracks: {
      OTIO_SCHEMA: "Stack.1",
      name: "tracks",
      children: (doc.tracks || []).map((trk) => ({
        OTIO_SCHEMA: "Track.1",
        name: trk.name,
        kind: trk.kind === "audio" ? "Audio" : "Video",
        children: (trk.clips || []).map((c) => ({
          OTIO_SCHEMA: "Clip.1",
          name: c.name,
          source_range: {
            OTIO_SCHEMA: "TimeRange.1",
            start_time: { OTIO_SCHEMA: "RationalTime.1", value: c.source_in_frame || 0, rate },
            duration: { OTIO_SCHEMA: "RationalTime.1", value: c.duration_frames, rate }
          },
          media_reference: c.source_path
            ? { OTIO_SCHEMA: "ExternalReference.1", target_url: c.source_path }
            : { OTIO_SCHEMA: "MissingReference.1" }
        }))
      }))
    }
  };
  return JSON.stringify(otio, null, 2);
}

function compileColorClient(payload, opts = {}) {
  if (payload && Array.isArray(payload.nodes) && payload.nodes.length > 0) {
    const clientNodes = payload.nodes.map((n, idx) => deserializeColorNodeFromApi(n, idx));
    return compileColorNodeChainClient(clientNodes, opts.pix_fmt || null);
  }
  if (
    payload &&
    ((payload.curves && typeof payload.curves === "object") ||
      (payload.hsl_curves && typeof payload.hsl_curves === "object") ||
      (payload.color_warper && typeof payload.color_warper === "object") ||
      (payload.qualifier && typeof payload.qualifier === "object"))
  ) {
    const singleNode = createColorNode(1, {
      grade: payload.grade || payload,
      curves: payload.curves,
      hsl_curves: payload.hsl_curves,
      color_warper: payload.color_warper,
      qualifier: payload.qualifier
    });
    return compileColorNodeChainClient([singleNode], opts.pix_fmt || null);
  }
  const g = payload && payload.grade ? payload.grade : payload || {};
  const lift = Array.isArray(g.lift) && g.lift.length === 3 ? g.lift.map(Number) : [0, 0, 0];
  const gamma = Array.isArray(g.gamma) && g.gamma.length === 3 ? g.gamma.map(Number) : [0, 0, 0];
  const gain = Array.isArray(g.gain) && g.gain.length === 3 ? g.gain.map(Number) : [0, 0, 0];
  const contrast = Number.isFinite(Number(g.contrast)) ? Number(g.contrast) : 1.0;
  const saturation = Number.isFinite(Number(g.saturation)) ? Number(g.saturation) : 1.0;
  const temperature = Number.isFinite(Number(g.temperature)) ? Number(g.temperature) : 0.0;

  const clampB = (v) => Math.max(-1, Math.min(1, v));
  const tempR = temperature * 0.25;
  const tempG = temperature * 0.03;
  const tempB = -temperature * 0.28;
  const s = [clampB(lift[0]), clampB(lift[1]), clampB(lift[2])];
  const m = [clampB(gamma[0] + tempR), clampB(gamma[1] + tempG), clampB(gamma[2] + tempB)];
  const h = [clampB(gain[0] + tempR * 0.8), clampB(gain[1] + tempG * 0.8), clampB(gain[2] + tempB * 0.8)];
  const cb = `colorbalance=rs=${s[0].toFixed(4)}:gs=${s[1].toFixed(4)}:bs=${s[2].toFixed(4)}:rm=${m[0].toFixed(4)}:gm=${m[1].toFixed(4)}:bm=${m[2].toFixed(4)}:rh=${h[0].toFixed(4)}:gh=${h[1].toFixed(4)}:bh=${h[2].toFixed(4)}:pl=0`;
  const eq = `eq=contrast=${contrast.toFixed(4)}:saturation=${saturation.toFixed(4)}`;
  const fg = opts.pix_fmt ? `${cb},${eq},format=${opts.pix_fmt}` : `${cb},${eq}`;
  const isIdentity =
    lift.every((v) => v === 0) &&
    gamma.every((v) => v === 0) &&
    gain.every((v) => v === 0) &&
    Math.abs(contrast - 1) < 1e-6 &&
    Math.abs(saturation - 1) < 1e-6 &&
    Math.abs(temperature) < 1e-6;
  return {
    filtergraph: fg,
    ffmpeg_vf_args: ["-vf", fg],
    is_identity: isIdentity,
    params: { lift, gamma, gain, contrast, saturation, temperature, preserve_lightness: false }
  };
}

function bakeCubeTextClient(payload, size, title) {
  if (size < 2 || size > 65) throw new Error("3D LUT size must be between 2 and 65");
  if (payload && Array.isArray(payload.nodes) && payload.nodes.length > 0) {
    const clientNodes = payload.nodes.map((n, idx) => deserializeColorNodeFromApi(n, idx));
    return bakeColorNodeChainToCubeTextClient(clientNodes, size, title);
  }
  const isGrade = Boolean(payload.grade || Array.isArray(payload.lift) || Array.isArray(payload.gamma) || Array.isArray(payload.gain));
  const grade = payload.grade || payload;
  if (!isGrade) {
    for (const ch of payload.power || [1, 1, 1]) {
      if (ch <= 0) throw new Error("ASC CDL power channels must be strictly positive");
    }
  }
  const lines = [
    `TITLE "${title}"`,
    `LUT_3D_SIZE ${size}`,
    "DOMAIN_MIN 0.0 0.0 0.0",
    "DOMAIN_MAX 1.0 1.0 1.0",
    ""
  ];
  const denom = size - 1;
  for (let b = 0; b < size; b++) {
    const bIn = b / denom;
    for (let g = 0; g < size; g++) {
      const gIn = g / denom;
      for (let r = 0; r < size; r++) {
        const rIn = r / denom;
        const [ro, go, bo] = isGrade
          ? applyColorGradeRgb(rIn, gIn, bIn, grade)
          : applyAscCdlRgb(rIn, gIn, bIn, payload);
        lines.push(`${ro.toFixed(6)} ${go.toFixed(6)} ${bo.toFixed(6)}`);
      }
    }
  }
  return lines.join("\n") + "\n";
}

const CHROMA_KEY_PRESETS_DEMO = [
  {
    id: "studio_green",
    name: "Studio Green",
    key_color: "#00b140",
    similarity: 0.18,
    blend: 0.08,
    despill: true,
    despill_type: "green",
    description: "Broadcast studio green screen (#00B140) with green spill suppression."
  },
  {
    id: "chroma_blue",
    name: "Chroma Blue",
    key_color: "#0047bb",
    similarity: 0.20,
    blend: 0.08,
    despill: true,
    despill_type: "blue",
    description: "Broadcast chroma blue screen (#0047BB) with blue spill suppression."
  },
  {
    id: "custom",
    name: "Custom Hex",
    key_color: "#00b140",
    similarity: 0.18,
    blend: 0.08,
    despill: true,
    despill_type: "green",
    description: "Custom #RRGGBB key color with selectable green or blue spill suppression."
  }
];

function compileChromaKeyClient(payload, opts = {}) {
  const src = payload && payload.chroma_key ? payload.chroma_key : payload || {};
  const enabled = src.enabled !== false;
  const preset = ["studio_green", "chroma_blue", "custom"].includes(src.preset) ? src.preset : "studio_green";
  const rawHex = String(src.key_color || "#00b140").trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(rawHex)) {
    throw new Error(`Invalid hex color ${rawHex}; expected '#RRGGBB'`);
  }
  const keyColor = rawHex.toLowerCase();
  const sim = Number(src.similarity ?? 0.18);
  const blend = Number(src.blend ?? 0.08);
  if (!Number.isFinite(sim) || sim < 0.01 || sim > 0.8) {
    throw new Error(`similarity must be within [0.01, 0.80], got ${sim}`);
  }
  if (!Number.isFinite(blend) || blend < 0.0 || blend > 0.5) {
    throw new Error(`blend must be within [0.0, 0.50], got ${blend}`);
  }
  const despill = Boolean(src.despill !== undefined ? src.despill : true);
  const despillType = src.despill_type === "blue" ? "blue" : "green";
  const pixFmt = opts.pix_fmt || null;
  if (!enabled) {
    return {
      filtergraph: "",
      ffmpeg_vf_args: [],
      is_active: false,
      params: { preset, key_color: keyColor, similarity: sim, blend, despill, despill_type: despillType, enabled: false }
    };
  }
  const parts = [
    "format=rgba",
    `colorkey=color=0x${keyColor.slice(1)}:similarity=${sim.toFixed(4)}:blend=${blend.toFixed(4)}`
  ];
  if (despill) parts.push(`despill=type=${despillType}`);
  if (pixFmt && pixFmt !== "rgba") parts.push(`format=${pixFmt}`);
  const fg = parts.join(",");
  return {
    filtergraph: fg,
    ffmpeg_vf_args: ["-vf", fg],
    is_active: true,
    params: { preset, key_color: keyColor, similarity: sim, blend, despill, despill_type: despillType, enabled: true }
  };
}

function compileEffectMaskExprClient(mask) {
  const cx = Math.min(0.95, Math.max(0.05, Number(mask.center_x ?? 0.5)));
  const cy = Math.min(0.95, Math.max(0.05, Number(mask.center_y ?? 0.5)));
  const rx = Math.min(0.95, Math.max(0.05, Number(mask.radius_x ?? 0.35)));
  const ry = Math.min(0.95, Math.max(0.05, Number(mask.radius_y ?? 0.35)));
  const f = Math.min(0.5, Math.max(0.01, Number(mask.feather ?? 0.12)));
  const twoF = 2.0 * f;
  const distExpr =
    mask.shape === "ellipse"
      ? `hypot((X/W-${cx.toFixed(4)})/${rx.toFixed(4)},(Y/H-${cy.toFixed(4)})/${ry.toFixed(4)})`
      : `max(abs(X/W-${cx.toFixed(4)})/${rx.toFixed(4)},abs(Y/H-${cy.toFixed(4)})/${ry.toFixed(4)})`;
  const weightExpr = `clip((1+${f.toFixed(4)}-(${distExpr}))/${twoF.toFixed(4)},0,1)`;
  return mask.invert ? `255*(1-${weightExpr})` : `255*${weightExpr}`;
}

function wrapEffectMaskSegmentClient(idx, segment, mask, needsRgb) {
  if (!segment || segment === "null" || !mask || mask.shape === "off" || !mask.shape) {
    return segment;
  }
  const maskExpr = compileEffectMaskExprClient(mask);
  const tail = needsRgb ? ",format=rgb24" : "";
  return (
    `split=3[fxm${idx}_b][fxm${idx}_w][fxm${idx}_m];` +
    `[fxm${idx}_b]format=gbrp[fxm${idx}_bg];` +
    `[fxm${idx}_w]${segment},format=gbrp[fxm${idx}_fg];` +
    `[fxm${idx}_m]format=gray,geq=lum='${maskExpr}',` +
    `split=3[fxm${idx}_mr][fxm${idx}_mg][fxm${idx}_mb];` +
    `[fxm${idx}_mr][fxm${idx}_mg][fxm${idx}_mb]mergeplanes=0x001020:gbrp[fxm${idx}_msk];` +
    `[fxm${idx}_bg][fxm${idx}_fg][fxm${idx}_msk]maskedmerge${tail}`
  );
}

function compileFxClient(nodes, opts = {}) {
  const active = (nodes || []).filter((n) => n && n.enabled !== false);
  const ckRaw = opts.chroma_key || null;
  const ckCompiled = ckRaw ? compileChromaKeyClient(ckRaw, { pix_fmt: null }) : null;
  const ckActive = Boolean(ckCompiled && ckCompiled.is_active);
  const stabCompiled = opts.stabilizer ? compileStabilizerFilterClient(opts.stabilizer, opts) : null;
  const stabActive = Boolean(stabCompiled && stabCompiled.is_active);
  const trkCompiled = opts.planar_tracker ? compilePlanarTrackerFilterClient(opts.planar_tracker) : null;
  const trkActive = Boolean(trkCompiled && trkCompiled.is_active);
  if (active.length === 0 && !ckActive && !stabActive && !trkActive) {
    return {
      filtergraph: "",
      ffmpeg_vf_args: [],
      active_effects: [],
      keyframed_effects: [],
      masked_effects: [],
      chroma_key_active: false,
      stabilizer_active: false,
      planar_tracker_active: false,
      bypassed_count: (nodes || []).length,
      normalized_nodes: nodes || [],
      estimated_render_seconds: 0,
      realtime_factor: 0,
      complexity_tier: "idle",
      warnings: []
    };
  }
  const pixFmt = opts.pix_fmt || "yuv420p";
  const dur = Math.max(0.1, Number(opts.duration_seconds || 10));
  const needsRgb = active.some((n) =>
    ["glow", "lens_flare", "chroma_aberration", "optical_glow", "rgb_split", "halation", "pro_mist", "tilt_shift", "prism_leak"].includes(n.effect)
  );
  const segs = [];
  let totalWeight = 0;
  if (stabActive && stabCompiled) {
    segs.push(stabCompiled.filtergraph);
    totalWeight += 0.90;
  }
  if (trkActive && trkCompiled) {
    segs.push(trkCompiled.filtergraph);
    totalWeight += 0.85;
  }
  if (ckActive && ckCompiled) {
    segs.push(ckCompiled.filtergraph);
    totalWeight += 0.75;
  }
  if (needsRgb) segs.push("format=rgb24");
  const weights = {
    glow: 1.45,
    shake: 0.7,
    flicker: 0.25,
    lens_flare: 1.25,
    film_damage: 1.1,
    chroma_aberration: 0.65,
    vignette: 0.35,
    film_grain: 0.45,
    optical_glow: 1.2,
    rgb_split: 0.55,
    halation: 1.25,
    letterbox: 0.2,
    camera_shake: 0.65,
    lens_distortion: 0.55,
    scanlines: 0.25,
    unsharp_mask: 0.45,
    hue_shift: 0.3,
    mirror_flip: 0.2,
    mosaic_pixelate: 0.3,
    invert_negative: 0.2,
    pro_mist: 1.15,
    directional_blur: 0.95,
    tilt_shift: 1.2,
    prism_leak: 0.9
  };
  const keyframedEffects = [];
  const maskedEffects = [];
  active.forEach((n, idx) => {
    const p = n.params || {};
    const hasKf = Array.isArray(n.keyframes) && n.keyframes.length > 0;
    if (hasKf) keyframedEffects.push(n.effect);
    const mask = n.effect_mask || null;
    const hasMask = Boolean(mask && (mask.shape === "ellipse" || mask.shape === "rect"));
    if (hasMask) {
      maskedEffects.push(n.effect);
      totalWeight += 0.25;
    }
    totalWeight += weights[n.effect] || 0.8;
    let nodeSeg = "";
    if (n.effect === "glow") {
      const thr = Math.round(Number(p.threshold ?? 0.45) * 255);
      const op = Math.min(1, Math.max(0, Number(p.brightness ?? 0.85) / 1.5)).toFixed(4);
      nodeSeg = `split[glow${idx}_base][glow${idx}_src];[glow${idx}_src]lutrgb=r='if(gte(val,${thr}),min(255,val-${thr}),0)',gblur=sigma=${Number(p.width ?? 18).toFixed(2)}:steps=2[glow${idx}_blur];[glow${idx}_base][glow${idx}_blur]blend=all_mode=screen:all_opacity=${op}`;
    } else if (n.effect === "shake") {
      const amp = Math.round(Number(p.amplitude ?? 14));
      nodeSeg = amp > 0 ? `pad=iw+${2 * amp}:ih+${2 * amp}:${amp}:${amp}:color=black,crop=iw-${2 * amp}:ih-${2 * amp}:x='${amp}+${amp}*sin(t*${(2 * Math.PI * Number(p.frequency ?? 6)).toFixed(2)})':y='${amp}+${amp}*cos(t*${(2.74 * Math.PI * Number(p.frequency ?? 6)).toFixed(2)})'` : "null";
    } else if (n.effect === "flicker") {
      nodeSeg = `eq=brightness='${Number(p.amplitude ?? 0.18).toFixed(4)}*sin(t*${(2 * Math.PI * Number(p.frequency ?? 8)).toFixed(2)})':eval=frame`;
    } else if (n.effect === "lens_flare") {
      const op = Math.min(1, Number(p.brightness ?? 0.95) * 0.65).toFixed(4);
      nodeSeg = `split[lf${idx}_base][lf${idx}_tmp];[lf${idx}_tmp]drawbox=x=0:y=0:w=iw:h=ih:color=black@1:t=fill,gblur=sigma=16:steps=2[lf${idx}_flare];[lf${idx}_base][lf${idx}_flare]blend=all_mode=screen:all_opacity=${op}`;
    } else if (n.effect === "film_damage") {
      const mix = Number(p.mix ?? 0.75);
      nodeSeg = `noise=alls=${(Number(p.grain ?? 28) * mix * 0.65).toFixed(2)}:allf=t+u,vignette=angle=${(0.15 + Number(p.vignette ?? 0.55) * mix * 0.72).toFixed(3)},eq=brightness='${(0.035 * mix).toFixed(4)}*sin(t*19.3)':eval=frame`;
    } else if (n.effect === "chroma_aberration") {
      const rad = (Number(p.angle ?? 15) * Math.PI) / 180;
      const rh = Math.round(Number(p.spread ?? 8) * Math.cos(rad));
      const rv = Math.round(Number(p.spread ?? 8) * Math.sin(rad));
      nodeSeg = `rgbashift=rh=${rh}:rv=${rv}:bh=${-rh}:bv=${-rv}:edge=smear`;
    } else if (n.effect === "vignette") {
      const angle = Math.min(1.2, Math.max(0.1, Number(p.angle_rad ?? 0.52)));
      nodeSeg = `vignette=angle=${angle.toFixed(3)}`;
    } else if (n.effect === "film_grain") {
      const alls = Math.round(Math.min(40, Math.max(0, Number(p.strength ?? 14))));
      nodeSeg = `noise=alls=${alls}:allf=t+u`;
    } else if (n.effect === "optical_glow") {
      const intensity = Math.min(1, Math.max(0, Number(p.glow_intensity ?? 0.45))).toFixed(4);
      const radius = Math.min(24, Math.max(2, Number(p.glow_radius ?? 10))).toFixed(2);
      const g0 = idx === 0 ? "g0" : `g${idx}a`;
      const g1 = idx === 0 ? "g1" : `g${idx}b`;
      const gb = idx === 0 ? "gb" : `gb${idx}`;
      nodeSeg = `split[${g0}][${g1}];[${g1}]gblur=sigma=${radius}[${gb}];[${g0}][${gb}]blend=all_mode=screen:all_opacity=${intensity}`;
    } else if (n.effect === "rgb_split") {
      const px = Math.round(Math.min(12, Math.max(0, Number(p.chroma_shift_px ?? 4))));
      nodeSeg = `rgbashift=rh=${px}:bh=${-px}`;
    } else if (n.effect === "halation") {
      const strength = Math.min(1, Math.max(0, Number(p.halation_strength ?? 0.55))).toFixed(4);
      const radius = Math.min(20, Math.max(2, Number(p.halation_radius ?? 10))).toFixed(2);
      nodeSeg = `split[hal${idx}_base][hal${idx}_src];[hal${idx}_src]lutrgb=r='if(gte(val,155),min(255,(val-155)*2.4000),0)':g='if(gte(val,155),min(255,(val-155)*0.8200),0)':b='if(gte(val,155),min(255,(val-155)*0.1800),0)',gblur=sigma=${radius}:steps=2[hal${idx}_blur];[hal${idx}_base][hal${idx}_blur]blend=all_mode=screen:all_opacity=${strength}`;
    } else if (n.effect === "letterbox") {
      const allowedRatios = new Set(["2.39", "2.35", "1.85", "2.00"]);
      const rawRatio = Number.parseFloat(String(p.ratio ?? "2.39"));
      const ratioKey = Number.isFinite(rawRatio) && allowedRatios.has(rawRatio.toFixed(2))
        ? rawRatio.toFixed(2)
        : "2.39";
      const ratioVal = Number.parseFloat(ratioKey);
      const barFrac = Math.max(0, (1 - (16 / 9) / ratioVal) / 2).toFixed(4);
      nodeSeg = `drawbox=x=0:y=0:w=iw:h='round(ih*${barFrac})':color=black@1:t=fill,drawbox=x=0:y='ih-round(ih*${barFrac})':w=iw:h='round(ih*${barFrac})':color=black@1:t=fill`;
    } else if (n.effect === "camera_shake") {
      const amp = Math.min(24, Math.max(1, Number(p.amplitude_px ?? 8)));
      const freq = Math.min(12, Math.max(0.5, Number(p.frequency_hz ?? 4.5)));
      const padAmp = Math.max(1, Math.ceil(amp));
      const margin = 2 * padAmp;
      const omegaX = (2 * Math.PI * freq).toFixed(4);
      const omegaY = (2 * Math.PI * freq * 1.37).toFixed(4);
      nodeSeg = `scale=w=iw+${margin}:h=ih+${margin}:flags=bilinear,crop=w=iw-${margin}:h=ih-${margin}:x='${padAmp}+${amp.toFixed(4)}*sin(t*${omegaX})':y='${padAmp}+${amp.toFixed(4)}*cos(t*${omegaY}+0.7)'`;
    } else if (n.effect === "lens_distortion") {
      const k1 = Math.min(0.5, Math.max(-0.5, Number(p.k1 ?? -0.22)));
      nodeSeg = `lenscorrection=cx=0.5:cy=0.5:k1=${k1.toFixed(4)}:k2=0`;
    } else if (n.effect === "scanlines") {
      const spacing = Math.round(Math.min(12, Math.max(2, Number(p.line_spacing_px ?? 4))));
      const opacity = Math.min(0.9, Math.max(0.1, Number(p.opacity ?? 0.45)));
      nodeSeg = `drawgrid=w=0:h=${spacing}:t=1:c=black@${opacity.toFixed(4)}`;
    } else if (n.effect === "unsharp_mask") {
      const amount = Math.min(3.0, Math.max(0.2, Number(p.sharpen_amount ?? 1.2)));
      nodeSeg = `unsharp=5:5:${amount.toFixed(4)}:5:5:0.0`;
    } else if (n.effect === "hue_shift") {
      const hueDeg = Math.min(180, Math.max(-180, Number(p.hue_deg ?? 30)));
      const sat = Math.min(2.5, Math.max(0, Number(p.saturation ?? 1.25)));
      nodeSeg = `hue=h=${hueDeg.toFixed(2)}:s=${sat.toFixed(4)}`;
    } else if (n.effect === "mirror_flip") {
      const axis = String(p.axis ?? "horizontal").trim().toLowerCase();
      if (axis === "vertical") nodeSeg = "vflip";
      else if (axis === "both") nodeSeg = "hflip,vflip";
      else nodeSeg = "hflip";
    } else if (n.effect === "mosaic_pixelate") {
      const bsize = Math.round(Math.min(48, Math.max(4, Number(p.block_size_px ?? 12))));
      nodeSeg = `pixelize=w=${bsize}:h=${bsize}`;
    } else if (n.effect === "invert_negative") {
      const mode = String(p.mode ?? "rgb").trim().toLowerCase();
      if (mode === "luma") {
        nodeSeg = needsRgb
          ? "format=yuv444p,negate=components=y:negate_alpha=0,format=rgb24"
          : "format=yuv444p,negate=components=y:negate_alpha=0";
      } else {
        nodeSeg = "negate=negate_alpha=0";
      }
    } else if (n.effect === "pro_mist") {
      const strength = Math.min(1, Math.max(0, Number(p.diffusion_strength ?? 0.45)));
      const thr = Math.min(0.9, Math.max(0.3, Number(p.highlight_threshold ?? 0.55)));
      const radius = Math.min(24, Math.max(2, Number(p.bloom_radius ?? 8)));
      const warmth = Math.min(1, Math.max(-1, Number(p.warmth ?? 0.2)));
      const thr255 = (thr * 255).toFixed(1);
      const gain = 1.35 + strength * 1.15;
      const wp = Math.max(0, warmth);
      const cp = Math.max(0, -warmth);
      const rw = (gain * (1 + wp * 0.28 - cp * 0.22)).toFixed(4);
      const gw = (gain * (1 + wp * 0.08 - cp * 0.04)).toFixed(4);
      const bw = (gain * (1 - wp * 0.28 + cp * 0.26)).toFixed(4);
      const cLift = (1 - strength * 0.1).toFixed(4);
      const bLift = (strength * 0.035).toFixed(4);
      nodeSeg = `split[pm${idx}_b][pm${idx}_s];[pm${idx}_s]lutrgb=r='if(gte(val,${thr255}),min(255,(val-${thr255})*${rw}),0)':g='if(gte(val,${thr255}),min(255,(val-${thr255})*${gw}),0)':b='if(gte(val,${thr255}),min(255,(val-${thr255})*${bw}),0)',gblur=sigma=${radius.toFixed(2)}:steps=2[pm${idx}_g];[pm${idx}_b][pm${idx}_g]blend=all_mode=screen:all_opacity=${strength.toFixed(4)},eq=contrast=${cLift}:brightness=${bLift},format=rgb24`;
    } else if (n.effect === "directional_blur") {
      const blurPx = Math.round(Math.min(24, Math.max(1, Number(p.blur_amount ?? 8))));
      const angleDeg = Math.min(180, Math.max(-180, Number(p.angle_deg ?? 0)));
      nodeSeg =
        Math.abs(angleDeg) < 0.1
          ? `avgblur=sizeX=${blurPx}:sizeY=1`
          : `rotate='${angleDeg.toFixed(2)}*PI/180':fillcolor=black@0,avgblur=sizeX=${blurPx}:sizeY=1,rotate='-${angleDeg.toFixed(2)}*PI/180':fillcolor=black@0`;
    } else if (n.effect === "tilt_shift") {
      const fy = Math.min(0.85, Math.max(0.15, Number(p.focus_y ?? 0.52)));
      const bh = Math.min(0.55, Math.max(0.08, Number(p.band_height ?? 0.24)));
      const blurS = Math.min(20, Math.max(2, Number(p.blur_strength ?? 7)));
      const sat = Math.min(1.8, Math.max(1, Number(p.sat_boost ?? 1.3)));
      const halfBand = (bh * 0.5).toFixed(4);
      const feather = Math.max(0.08, bh * 0.65).toFixed(4);
      nodeSeg = `split=3[ts${idx}_b][ts${idx}_w][ts${idx}_m];[ts${idx}_b]format=gbrp[ts${idx}_bg];[ts${idx}_w]gblur=sigma=${blurS.toFixed(2)}:steps=2,format=gbrp[ts${idx}_fg];[ts${idx}_m]format=gray,geq=lum='255*clip((abs(Y/H-${fy.toFixed(4)})-${halfBand})/${feather},0,1)',split=3[ts${idx}_mr][ts${idx}_mg][ts${idx}_mb];[ts${idx}_mr][ts${idx}_mg][ts${idx}_mb]mergeplanes=0x001020:gbrp[ts${idx}_msk];[ts${idx}_bg][ts${idx}_fg][ts${idx}_msk]maskedmerge,eq=saturation=${sat.toFixed(4)},format=rgb24`;
    } else if (n.effect === "prism_leak") {
      const intensity = Math.min(1, Math.max(0, Number(p.leak_intensity ?? 0.55)));
      const corner = String(p.leak_corner ?? "top_left");
      const shiftPx = Math.round(Math.min(12, Math.max(0, Number(p.prism_shift_px ?? 4))));
      const coords = {
        top_left: [0.06, 0.06],
        top_right: [0.94, 0.06],
        bottom_left: [0.06, 0.94],
        bottom_right: [0.94, 0.94]
      };
      const [cx, cy] = coords[corner] || coords.top_left;
      const prefix = shiftPx > 0 ? `rgbashift=rh=${shiftPx}:bh=${-shiftPx}:edge=smear,` : "";
      const distExpr = `hypot(X/W-${cx.toFixed(2)},Y/H-${cy.toFixed(2)})`;
      nodeSeg = `${prefix}split[pl${idx}_b][pl${idx}_l];[pl${idx}_l]format=rgb24,geq=r='clip(255*(1-${distExpr}/0.65),0,255)':g='clip(165*(1-${distExpr}/0.55),0,255)':b='clip(85*(1-${distExpr}/0.45),0,255)'[pl${idx}_g];[pl${idx}_b][pl${idx}_g]blend=all_mode=screen:all_opacity=${intensity.toFixed(4)}`;
    }
    if (hasMask) {
      nodeSeg = wrapEffectMaskSegmentClient(idx, nodeSeg, mask, needsRgb);
    }
    segs.push(nodeSeg);
  });
  if (needsRgb || ckActive || maskedEffects.length > 0) segs.push(`format=${pixFmt}`);
  const fg = segs.join(",");
  const est = Number(Math.max(0.05, dur * (0.12 + totalWeight * 0.14) * (opts.use_gpu ? 0.38 : 1)).toFixed(2));
  return {
    filtergraph: fg,
    ffmpeg_vf_args: ["-vf", fg],
    active_effects: active.map((n) => n.effect),
    keyframed_effects: keyframedEffects,
    masked_effects: maskedEffects,
    chroma_key_active: ckActive,
    stabilizer_active: stabActive,
    planar_tracker_active: trkActive,
    bypassed_count: (nodes || []).length - active.length,
    normalized_nodes: nodes || [],
    estimated_render_seconds: est,
    realtime_factor: Number((dur / est).toFixed(2)),
    complexity_tier: totalWeight <= 1.2 ? "light" : totalWeight <= 2.5 ? "medium" : "heavy",
    warnings: []
  };
}

function escapeDrawtextClient(raw) {
  const cleaned = String(raw || "")
    .replace(/\r\n|\r|\n|\t/g, " ")
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .trim();
  let out = "";
  for (const ch of cleaned) {
    if (ch === "\\") out += "\\\\";
    else if (ch === "'") out += "'\\\\\\''";
    else if (ch === ":") out += "\\:";
    else out += ch;
  }
  return out;
}

function compileTitleClient(payload, opts = {}) {
  const src = payload && payload.title_overlay ? payload.title_overlay : payload || {};
  const enabled = src.enabled !== false;
  const title = String(src.title ?? "ALEXANDRE MOREAU").slice(0, 200);
  const subtitle = String(src.subtitle ?? "").slice(0, 200);
  const position = ["bottom-left", "center", "bottom-center"].includes(src.position)
    ? src.position
    : "bottom-left";
  const accentColor = /^#[0-9a-fA-F]{6}$/.test(String(src.accent_color || "").trim())
    ? String(src.accent_color).trim().toLowerCase()
    : "#e68442";
  const startS = Number.isFinite(Number(src.start_s)) ? Math.max(0, Number(src.start_s)) : 0.5;
  const endS = Number.isFinite(Number(src.end_s)) ? Math.max(startS + 0.1, Number(src.end_s)) : startS + 5.0;
  const fontSize = Math.min(96, Math.max(14, Math.round(Number(src.font_size ?? 34))));
  const boxOpacity = Math.min(1, Math.max(0, Number(src.box_opacity ?? 0.8)));

  const escTitle = escapeDrawtextClient(title);
  const escSub = escapeDrawtextClient(subtitle);
  const active = enabled && Boolean(escTitle || escSub);
  if (!active) {
    return {
      filtergraph: "",
      ffmpeg_vf_args: [],
      is_active: false,
      escaped_title: escTitle,
      escaped_subtitle: escSub,
      params: { preset_id: src.preset_id || "broadcast_lower_third", title, subtitle, position, accent_color: accentColor, start_s: startS, end_s: endS, font_size: fontSize, box_opacity: boxOpacity, enabled }
    };
  }
  const accent = `0x${accentColor.slice(1)}`;
  const en = `enable='between(t,${startS.toFixed(3)},${endS.toFixed(3)})'`;
  const segs = [];
  if (position === "bottom-left") {
    if (boxOpacity > 0) segs.push(`drawbox=x=round(iw*0.05):y=round(ih*0.76):w=round(iw*0.46):h=round(ih*0.14):color=0x141416@${boxOpacity.toFixed(2)}:t=fill:${en}`);
    segs.push(`drawbox=x=round(iw*0.05):y=round(ih*0.76):w='max(4,round(iw*0.004))':h=round(ih*0.14):color=${accent}@1.00:t=fill:${en}`);
    if (escTitle) segs.push(`drawtext=expansion=none:text='${escTitle}':x=round(w*0.068):y=round(h*0.782):fontsize='max(14,round(h*${(fontSize / 1080).toFixed(5)}))':fontcolor=0xd8d8de:${en}`);
    if (escSub) segs.push(`drawtext=expansion=none:text='${escSub}':x=round(w*0.068):y=round(h*0.838):fontsize='max(11,round(h*${(Math.max(12, fontSize * 0.64) / 1080).toFixed(5)}))':fontcolor=${accent}:${en}`);
  } else if (position === "center") {
    if (boxOpacity > 0) segs.push(`drawbox=x=round(iw*0.14):y=round(ih*0.34):w=round(iw*0.72):h=round(ih*0.32):color=0x141416@${boxOpacity.toFixed(2)}:t=fill:${en}`);
    segs.push(`drawbox=x=round(iw*0.42):y=round(ih*0.34):w=round(iw*0.16):h='max(3,round(ih*0.004))':color=${accent}@1.00:t=fill:${en}`);
    if (escTitle) segs.push(`drawtext=expansion=none:text='${escTitle}':x=(w-tw)/2:y=round(h*0.455-th/2):fontsize='max(14,round(h*${(fontSize / 1080).toFixed(5)}))':fontcolor=0xd8d8de:${en}`);
    if (escSub) segs.push(`drawtext=expansion=none:text='${escSub}':x=(w-tw)/2:y=round(h*0.560-th/2):fontsize='max(11,round(h*${(Math.max(12, fontSize * 0.64) / 1080).toFixed(5)}))':fontcolor=${accent}:${en}`);
  } else {
    if (boxOpacity > 0) segs.push(`drawbox=x=round(iw*0.16):y=round(ih*0.81):w=round(iw*0.68):h=round(ih*0.11):color=0x141416@${boxOpacity.toFixed(2)}:t=fill:${en}`);
    segs.push(`drawbox=x=round(iw*0.44):y=round(ih*0.916):w=round(iw*0.12):h='max(2,round(ih*0.003))':color=${accent}@1.00:t=fill:${en}`);
    if (escTitle) segs.push(`drawtext=expansion=none:text='${escTitle}':x=(w-tw)/2:y=round(h*0.842-th/2):fontsize='max(14,round(h*${(fontSize / 1080).toFixed(5)}))':fontcolor=0xd8d8de:${en}`);
    if (escSub) segs.push(`drawtext=expansion=none:text='${escSub}':x=(w-tw)/2:y=round(h*0.885-th/2):fontsize='max(11,round(h*${(Math.max(12, fontSize * 0.64) / 1080).toFixed(5)}))':fontcolor=${accent}:${en}`);
  }
  if (opts.pix_fmt) segs.push(`format=${opts.pix_fmt}`);
  const fg = segs.join(",");
  return {
    filtergraph: fg,
    ffmpeg_vf_args: ["-vf", fg],
    is_active: true,
    escaped_title: escTitle,
    escaped_subtitle: escSub,
    params: { preset_id: src.preset_id || "broadcast_lower_third", title, subtitle, position, accent_color: accentColor, start_s: startS, end_s: endS, font_size: fontSize, box_opacity: boxOpacity, enabled }
  };
}

function compileLowerThirdClient(payload) {
  const src = payload && payload.lower_third ? payload.lower_third : payload || {};
  const enabled = Boolean(src.enabled);
  const title = typeof src.title === "string" ? src.title : "";
  const subtitle = typeof src.subtitle === "string" ? src.subtitle : "";
  if (title.length > 120) {
    throw new Error("title exceeds maximum length of 120 characters");
  }
  if (subtitle.length > 120) {
    throw new Error("subtitle exceeds maximum length of 120 characters");
  }
  const rawPos = typeof src.position === "string" ? src.position.trim().toLowerCase() : "bottom_left";
  if (!["bottom_left", "bottom_center", "top_left"].includes(rawPos)) {
    throw new Error(`Unsupported lower_third position '${src.position}'`);
  }
  const fontSize = src.font_size !== undefined && src.font_size !== null ? Number(src.font_size) : 36;
  if (!Number.isInteger(fontSize) || fontSize < 16 || fontSize > 96) {
    throw new Error("font_size must be an integer within [16, 96]");
  }
  const boxOpacity = src.box_opacity !== undefined && src.box_opacity !== null ? Number(src.box_opacity) : 0.65;
  if (!Number.isFinite(boxOpacity) || boxOpacity < 0 || boxOpacity > 1) {
    throw new Error("box_opacity must be within [0, 1]");
  }
  const startS = src.start_s !== undefined && src.start_s !== null ? Number(src.start_s) : 0.0;
  if (!Number.isFinite(startS) || startS < 0 || startS > 86400) {
    throw new Error("start_s must be within [0, 86400]");
  }
  const durationS = src.duration_s !== undefined && src.duration_s !== null ? Number(src.duration_s) : 5.0;
  if (!Number.isFinite(durationS) || durationS < 0.1 || durationS > 86400) {
    throw new Error("duration_s must be within [0.1, 86400]");
  }

  const escTitle = escapeDrawtextClient(title);
  const escSub = escapeDrawtextClient(subtitle);
  const cleanTitle = title.replace(/[\r\n\t]+/g, " ").replace(/[\x00-\x1f\x7f]/g, " ").trim();
  const cleanSub = subtitle.replace(/[\r\n\t]+/g, " ").replace(/[\x00-\x1f\x7f]/g, " ").trim();
  const params = {
    enabled,
    title,
    subtitle,
    position: rawPos,
    font_size: fontSize,
    box_opacity: boxOpacity,
    start_s: startS,
    duration_s: durationS
  };
  if (!enabled || (!cleanTitle && !cleanSub)) {
    return {
      filtergraph: "",
      ffmpeg_vf_args: [],
      is_active: false,
      escaped_title: escTitle,
      escaped_subtitle: escSub,
      params
    };
  }

  const endS = startS + durationS;
  const en = `enable='between(t,${startS.toFixed(2)},${endS.toFixed(2)})'`;
  const boxOpts = `box=1:boxcolor=black@${boxOpacity.toFixed(2)}:boxborderw=10`;
  const subFs = Math.max(14, Math.round(fontSize * 0.65));
  const xExpr = rawPos === "bottom_center" ? "x=(w-tw)/2" : "x=round(w*0.05)";

  let titleCoords = "";
  let subCoords = "";
  if (rawPos === "top_left") {
    titleCoords = `${xExpr}:y=round(h*0.06)`;
    subCoords = escTitle && escSub ? `${xExpr}:y=round(h*0.06)+${fontSize + 18}` : titleCoords;
  } else if (escTitle && escSub) {
    titleCoords = `${xExpr}:y=h-round(h*0.08)-th-${subFs + 16}`;
    subCoords = `${xExpr}:y=h-round(h*0.08)-th`;
  } else {
    titleCoords = `${xExpr}:y=h-round(h*0.08)-th`;
    subCoords = titleCoords;
  }

  const segs = [];
  if (escTitle) {
    segs.push(
      `drawtext=expansion=none:text='${escTitle}':fontsize=${fontSize}:fontcolor=white:${boxOpts}:${titleCoords}:${en}`
    );
  }
  if (escSub) {
    segs.push(
      `drawtext=expansion=none:text='${escSub}':fontsize=${subFs}:fontcolor=0xd8d8de:${boxOpts}:${subCoords}:${en}`
    );
  }
  const fg = segs.join(",");
  return {
    filtergraph: fg,
    ffmpeg_vf_args: fg ? ["-vf", fg] : [],
    is_active: Boolean(fg),
    escaped_title: escTitle,
    escaped_subtitle: escSub,
    params
  };
}

function compileDeliverRetimeClient(payload) {
  const src = payload && payload.retime ? payload.retime : payload || {};
  const enabled = src.enabled !== undefined ? Boolean(src.enabled) : false;
  if (src.enabled !== undefined && typeof src.enabled !== "boolean") {
    throw new Error("enabled must be a boolean");
  }
  const reverse = src.reverse !== undefined ? Boolean(src.reverse) : false;
  if (src.reverse !== undefined && typeof src.reverse !== "boolean") {
    throw new Error("reverse must be a boolean");
  }
  const rawSpeed = src.speed !== undefined && src.speed !== null ? Number(src.speed) : 1.0;
  if (
    typeof src.speed === "boolean" ||
    !Number.isFinite(rawSpeed) ||
    rawSpeed < 0.25 ||
    rawSpeed > 4.0
  ) {
    throw new Error("speed must be within [0.25, 4.0]");
  }
  const retimeProcess = normalizeRetimeProcess(src.retime_process);
  const rampPreset = normalizeRetimeRampPreset(src.ramp_preset);
  const rampPoints = resolveRetimeRampPointsForPreset(rampPreset, src.ramp_points);
  const hasRamp = rampPoints.length >= 2;
  const summary = computeRetimeRampSummary(
    { speed_rate: rawSpeed, retime_ramp_preset: rampPreset, retime_ramp_points: rampPoints },
    src.clip_duration_s || 10.0
  );
  const isActive = Boolean(
    enabled &&
      (reverse ||
        retimeProcess !== "nearest" ||
        hasRamp ||
        Math.abs(rawSpeed - 1.0) > 1e-6)
  );
  const isIdentity = !isActive;
  const vfParts = [];
  const afParts = [];
  if (isActive) {
    if (hasRamp) {
      vfParts.push(compileRetimeRampSetptsClient(rampPoints, src.clip_duration_s || 10.0));
      for (const stage of buildAtempoStagesClient(summary.avgSpeed)) {
        afParts.push(`atempo=${stage.toFixed(4)}`);
      }
    } else if (Math.abs(rawSpeed - 1.0) > 1e-6) {
      vfParts.push(`setpts=PTS/${rawSpeed.toFixed(4)}`);
      for (const stage of buildAtempoStagesClient(rawSpeed)) {
        afParts.push(`atempo=${stage.toFixed(4)}`);
      }
    }
    const interpVf = compileMinterpolateFilterClient(retimeProcess, src.fps || "25");
    if (interpVf) vfParts.push(interpVf);
    if (reverse) {
      vfParts.push("reverse");
      afParts.push("areverse");
    }
  }
  const vf = vfParts.join(",");
  const af = afParts.join(",");
  return {
    video_filtergraph: vf,
    audio_filtergraph: af,
    ffmpeg_vf_args: vf ? ["-vf", vf] : [],
    ffmpeg_af_args: af ? ["-af", af] : [],
    is_identity: isIdentity,
    is_active: isActive,
    avg_speed: summary.avgSpeed,
    retime_process: retimeProcess,
    ramp_preset: rampPreset,
    params: {
      enabled,
      speed: rawSpeed,
      reverse,
      retime_process: retimeProcess,
      ramp_preset: rampPreset,
      ramp_points: rampPoints
    }
  };
}

const REFRAME_RATIO_MAP_DEMO = {
  "16:9": [16, 9],
  "9:16": [9, 16],
  "4:5": [4, 5],
  "1:1": [1, 1],
  "2.39:1": [239, 100]
};

function compileReframeClient(payload) {
  const src = payload && payload.reframe ? payload.reframe : payload || {};
  const enabled = src.enabled !== undefined ? Boolean(src.enabled) : false;
  if (src.enabled !== undefined && typeof src.enabled !== "boolean") {
    throw new Error("enabled must be a boolean");
  }
  const rawRatio = src.aspect_ratio !== undefined && src.aspect_ratio !== null ? String(src.aspect_ratio).trim().toLowerCase() : "source";
  if (rawRatio !== "source" && !Object.prototype.hasOwnProperty.call(REFRAME_RATIO_MAP_DEMO, rawRatio)) {
    throw new Error(`Unsupported reframe aspect_ratio ${src.aspect_ratio}`);
  }
  const panX = src.pan_x !== undefined && src.pan_x !== null ? Number(src.pan_x) : 0.0;
  if (typeof src.pan_x === "boolean" || !Number.isFinite(panX) || panX < -1.0 || panX > 1.0) {
    throw new Error("pan_x must be within [-1.0, 1.0]");
  }
  const panY = src.pan_y !== undefined && src.pan_y !== null ? Number(src.pan_y) : 0.0;
  if (typeof src.pan_y === "boolean" || !Number.isFinite(panY) || panY < -1.0 || panY > 1.0) {
    throw new Error("pan_y must be within [-1.0, 1.0]");
  }
  const isActive = Boolean(enabled && rawRatio !== "source");
  let fg = "";
  if (isActive) {
    const [num, den] = REFRAME_RATIO_MAP_DEMO[rawRatio];
    const wExpr = `min(iw,if(gt(iw*${den},ih*${num}),trunc(ih*${num}/${den}/2)*2,trunc(iw/2)*2))`;
    const hExpr = `min(ih,if(gt(iw*${den},ih*${num}),trunc(ih/2)*2,trunc(iw*${den}/${num}/2)*2))`;
    const xExpr = Math.abs(panX) <= 1e-6
      ? "(iw-ow)/2"
      : `max(0,min(iw-ow,(iw-ow)/2*(1+(${panX.toFixed(4)}))))`;
    const yExpr = Math.abs(panY) <= 1e-6
      ? "(ih-oh)/2"
      : `max(0,min(ih-oh,(ih-oh)/2*(1+(${panY.toFixed(4)}))))`;
    fg = `crop=w='${wExpr}':h='${hExpr}':x='${xExpr}':y='${yExpr}'`;
  }
  return {
    filtergraph: fg,
    ffmpeg_vf_args: fg ? ["-vf", fg] : [],
    is_identity: !isActive,
    is_active: isActive,
    params: {
      enabled,
      aspect_ratio: rawRatio,
      pan_x: panX,
      pan_y: panY
    }
  };
}

const FILM_GRAIN_ALLOWED_PRESETS_DEMO = new Set(["35mm_fine", "16mm_organic", "super8_heavy", "custom"]);

function compileFilmGrainClient(payload) {
  const src = payload && payload.film_grain ? payload.film_grain : payload || {};
  const enabled = src.enabled !== undefined ? src.enabled : false;
  if (typeof enabled !== "boolean") {
    throw new Error("enabled must be a boolean");
  }
  const rawPreset = src.preset !== undefined && src.preset !== null ? String(src.preset).trim().toLowerCase() : "35mm_fine";
  if (!FILM_GRAIN_ALLOWED_PRESETS_DEMO.has(rawPreset)) {
    throw new Error(`Unsupported film grain preset ${src.preset}`);
  }
  const rawStrength = src.strength !== undefined && src.strength !== null ? src.strength : 12;
  if (typeof rawStrength === "boolean" || !Number.isInteger(rawStrength) || rawStrength < 0 || rawStrength > 60) {
    throw new Error("strength must be an integer within [0, 60]");
  }
  const temporal = src.temporal !== undefined ? src.temporal : true;
  if (typeof temporal !== "boolean") {
    throw new Error("temporal must be a boolean");
  }
  const isActive = Boolean(enabled && rawStrength > 0);
  const fg = isActive ? `noise=alls=${rawStrength}:allf=${temporal ? "t+u" : "u"}` : "";
  return {
    filtergraph: fg,
    ffmpeg_vf_args: fg ? ["-vf", fg] : [],
    is_identity: !isActive,
    is_active: isActive,
    params: {
      enabled,
      preset: rawPreset,
      strength: rawStrength,
      temporal
    }
  };
}

const VIGNETTE_ALLOWED_PRESETS_DEMO = new Set(["subtle_cinema", "moody_portrait", "heavy_noir", "custom"]);
const VIGNETTE_ALLOWED_MODES_DEMO = new Set(["forward", "backward"]);

function compileVignetteClient(payload) {
  const src = payload && payload.vignette ? payload.vignette : payload || {};
  const enabled = src.enabled !== undefined ? src.enabled : false;
  if (typeof enabled !== "boolean") {
    throw new Error("enabled must be a boolean");
  }
  const rawPreset = src.preset !== undefined && src.preset !== null ? String(src.preset).trim().toLowerCase() : "subtle_cinema";
  if (!VIGNETTE_ALLOWED_PRESETS_DEMO.has(rawPreset)) {
    throw new Error(`Unsupported vignette preset ${src.preset}`);
  }
  const rawAngle = src.angle_deg !== undefined && src.angle_deg !== null ? src.angle_deg : 24.0;
  if (typeof rawAngle === "boolean" || typeof rawAngle !== "number" || !Number.isFinite(rawAngle) || rawAngle < 5.0 || rawAngle > 75.0) {
    throw new Error("angle_deg must be within [5.0, 75.0]");
  }
  const rawMode = src.mode !== undefined && src.mode !== null ? String(src.mode).trim().toLowerCase() : "forward";
  if (!VIGNETTE_ALLOWED_MODES_DEMO.has(rawMode)) {
    throw new Error(`Unsupported vignette mode ${src.mode}`);
  }
  const rad = (rawAngle * Math.PI) / 180.0;
  const fg = enabled ? `vignette=angle=${rad.toFixed(4)}:mode=${rawMode}` : "";
  return {
    filtergraph: fg,
    ffmpeg_vf_args: fg ? ["-vf", fg] : [],
    is_identity: !enabled,
    is_active: Boolean(enabled),
    angle_rad: Number(rad.toFixed(4)),
    params: {
      enabled,
      preset: rawPreset,
      angle_deg: rawAngle,
      mode: rawMode
    }
  };
}

const VOICE_CLEANUP_ALLOWED_PRESETS_DEMO = new Set([
  "youtube_voice",
  "podcast_warm",
  "broadcast_crisp",
  "custom"
]);

function compileVoiceCleanupClient(payload) {
  const src = payload && payload.voice_cleanup ? payload.voice_cleanup : payload || {};
  const enabled = src.enabled !== undefined ? src.enabled : false;
  if (typeof enabled !== "boolean") {
    throw new Error("enabled must be a boolean");
  }
  const rawPreset =
    src.preset !== undefined && src.preset !== null
      ? String(src.preset).trim().toLowerCase()
      : "youtube_voice";
  if (!VOICE_CLEANUP_ALLOWED_PRESETS_DEMO.has(rawPreset)) {
    throw new Error(`Unsupported voice cleanup preset ${src.preset}`);
  }
  const rawHp = src.highpass_hz !== undefined && src.highpass_hz !== null ? src.highpass_hz : 85;
  if (typeof rawHp === "boolean" || typeof rawHp !== "number" || !Number.isInteger(rawHp) || rawHp < 40 || rawHp > 200) {
    throw new Error("highpass_hz must be an integer within [40, 200]");
  }
  const rawPresence =
    src.presence_db !== undefined && src.presence_db !== null ? src.presence_db : 2.5;
  if (
    typeof rawPresence === "boolean" ||
    typeof rawPresence !== "number" ||
    !Number.isFinite(rawPresence) ||
    rawPresence < -6.0 ||
    rawPresence > 6.0
  ) {
    throw new Error("presence_db must be within [-6.0, 6.0]");
  }
  const rawDeEss = src.de_ess !== undefined && src.de_ess !== null ? src.de_ess : 0.35;
  if (
    typeof rawDeEss === "boolean" ||
    typeof rawDeEss !== "number" ||
    !Number.isFinite(rawDeEss) ||
    rawDeEss < 0.0 ||
    rawDeEss > 1.0
  ) {
    throw new Error("de_ess must be within [0.0, 1.0]");
  }
  let fg = "";
  if (enabled) {
    const parts = [`highpass=f=${rawHp}`];
    if (Math.abs(rawPresence) > 1e-6) {
      parts.push(`equalizer=f=3200:t=q:w=1.2:g=${rawPresence.toFixed(1)}`);
    }
    if (rawDeEss > 1e-6) {
      parts.push(`deesser=i=${rawDeEss.toFixed(2)}:m=0.50:f=0.50:s=o`);
    }
    fg = parts.join(",");
  }
  return {
    filtergraph: fg,
    ffmpeg_af_args: fg ? ["-af", fg] : [],
    is_identity: !enabled,
    is_active: Boolean(enabled),
    params: {
      enabled,
      preset: rawPreset,
      highpass_hz: rawHp,
      presence_db: rawPresence,
      de_ess: rawDeEss
    }
  };
}

const CAPTION_STYLE_SPECS = [
  {
    id: "clean_white",
    name: "Clean White",
    description: "Crisp white captions with black edge outline and drop shadow.",
    font_color: "#ffffff",
    box_color: "#000000",
    box_opacity: 0.0,
    border_w: 2,
    default_font_size: 34,
    bold: false,
    highlight_color: "#ffe047",
    default_margin_bottom_pct: 0.08,
    default_karaoke_mode: "off",
    default_uppercase: false
  },
  {
    id: "yellow_broadcast",
    name: "Yellow Broadcast",
    description: "Traditional broadcast yellow captions with subtle dark plate and shadow.",
    font_color: "#ffe047",
    box_color: "#0c0c0e",
    box_opacity: 0.55,
    border_w: 2,
    default_font_size: 34,
    bold: true,
    highlight_color: "#00e5ff",
    default_margin_bottom_pct: 0.08,
    default_karaoke_mode: "off",
    default_uppercase: false
  },
  {
    id: "boxed_social",
    name: "Boxed Social",
    description: "High-contrast bold white captions on a solid dark social pill box.",
    font_color: "#ffffff",
    box_color: "#141416",
    box_opacity: 0.86,
    border_w: 0,
    default_font_size: 38,
    bold: true,
    highlight_color: "#ffe047",
    default_margin_bottom_pct: 0.08,
    default_karaoke_mode: "off",
    default_uppercase: false
  }
];

const PRO_CAPTION_STYLE_SPECS = [
  {
    id: "netflix_clean",
    name: "Netflix Clean",
    description: "Cinema streaming subtitle style with crisp outline, soft shadow, and 10% safe margin.",
    font_color: "#ffffff",
    box_color: "#000000",
    box_opacity: 0.0,
    border_w: 1,
    default_font_size: 32,
    bold: false,
    highlight_color: "#ffe047",
    default_margin_bottom_pct: 0.1,
    default_karaoke_mode: "off",
    default_uppercase: false
  },
  {
    id: "social_karaoke",
    name: "Social Karaoke Pop",
    description: "High-retention Reels/Shorts word-pop karaoke style inside the 24% social safe zone.",
    font_color: "#ffffff",
    box_color: "#141416",
    box_opacity: 0.86,
    border_w: 2,
    default_font_size: 42,
    bold: true,
    highlight_color: "#ffe047",
    default_margin_bottom_pct: 0.24,
    default_karaoke_mode: "color_pop",
    default_uppercase: true
  },
  {
    id: "broadcast_gold",
    name: "Broadcast Gold Safe",
    description: "EBU/SMPTE title-safe gold caption plate with cyan karaoke accent.",
    font_color: "#ffd54f",
    box_color: "#0c0c0e",
    box_opacity: 0.72,
    border_w: 2,
    default_font_size: 34,
    bold: true,
    highlight_color: "#00e5ff",
    default_margin_bottom_pct: 0.1,
    default_karaoke_mode: "off",
    default_uppercase: false
  }
];

const ALL_CAPTION_STYLE_SPECS = [...CAPTION_STYLE_SPECS, ...PRO_CAPTION_STYLE_SPECS];
const SAFE_MARGIN_PRESETS_CLIENT = [
  { id: "standard", label: "Standard 8%", margin_bottom_pct: 0.08 },
  { id: "broadcast_action", label: "Action Safe 5%", margin_bottom_pct: 0.05 },
  { id: "broadcast_title", label: "Title Safe 10%", margin_bottom_pct: 0.1 },
  { id: "reels_tiktok", label: "Reels / TikTok Safe 24%", margin_bottom_pct: 0.24 },
  { id: "upper_third", label: "Upper Center 42%", margin_bottom_pct: 0.42 },
  { id: "custom", label: "Custom Margin", margin_bottom_pct: 0.08 }
];

function sanitizeCaptionTextClient(raw) {
  let cur = String(raw || "").replace(/\r\n|\r/g, "\n").replace(/\t/g, " ");
  for (let i = 0; i < 8; i += 1) {
    const nxt = cur
      .replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
      .replace(/<[^>]{0,512}>/g, "");
    if (nxt === cur) break;
    cur = nxt;
  }
  cur = cur.replace(/[<>]/g, "").replace(/[\x00-\x09\x0b-\x1f\x7f-\x9f]/g, " ");
  return cur
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function parseSrtTsClient(raw) {
  const m = /^(\d{2,3}):([0-5]\d):([0-5]\d),(\d{3})$/.exec(String(raw || "").trim());
  if (!m) throw new Error(`Invalid SRT timestamp: ${raw}`);
  return Number((Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000).toFixed(3));
}

function parseVttTsClient(raw) {
  const m = /^(?:(\d{2,3}):)?([0-5]\d):([0-5]\d)\.(\d{3})$/.exec(String(raw || "").trim());
  if (!m) throw new Error(`Invalid VTT timestamp: ${raw}`);
  const hh = m[1] !== undefined ? Number(m[1]) : 0;
  return Number((hh * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000).toFixed(3));
}

function formatTsClient(seconds, sep) {
  const totalMs = Math.max(0, Math.round(Number(seconds) * 1000));
  const hh = Math.floor(totalMs / 3600000);
  const mm = Math.floor((totalMs % 3600000) / 60000);
  const ss = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}${sep}${String(ms).padStart(3, "0")}`;
}

function parseSrtClient(raw) {
  const cleaned = String(raw || "").replace(/^\ufeff/, "").replace(/\r\n|\r/g, "\n").trim();
  if (!cleaned) throw new Error("SRT input is empty");
  const blocks = cleaned.split(/\n[ \t]*\n+/);
  const cues = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const lines = blocks[i].split("\n").map((l) => l.trimEnd()).filter((l) => l.trim() !== "");
    if (lines.length < 3 || !/^\d+$/.test(lines[0].trim())) {
      throw new Error(`Invalid SRT cue block #${i + 1}`);
    }
    const parts = lines[1].split("-->");
    if (parts.length !== 2) throw new Error(`Invalid SRT timing line in block #${i + 1}`);
    const start_s = parseSrtTsClient(parts[0]);
    const end_s = parseSrtTsClient(parts[1]);
    if (end_s <= start_s) throw new Error(`Cue #${i + 1} end must exceed start`);
    const text = sanitizeCaptionTextClient(lines.slice(2).join("\n"));
    if (!text) throw new Error(`Cue #${i + 1} text is empty after sanitization`);
    cues.push({ index: cues.length + 1, start_s, end_s, text });
  }
  return cues;
}

function parseVttClient(raw) {
  const cleaned = String(raw || "").replace(/^\ufeff/, "").replace(/\r\n|\r/g, "\n").trim();
  if (!cleaned) throw new Error("WebVTT input is empty");
  const blocks = cleaned.split(/\n[ \t]*\n+/);
  const head = (blocks[0].split("\n")[0] || "").trim();
  if (head !== "WEBVTT" && !head.startsWith("WEBVTT ") && !head.startsWith("WEBVTT\t")) {
    throw new Error("Invalid WebVTT header: must start with WEBVTT");
  }
  const cues = [];
  for (let i = 1; i < blocks.length; i += 1) {
    const lines = blocks[i].split("\n").map((l) => l.trimEnd()).filter((l) => l.trim() !== "");
    if (lines.length === 0) continue;
    const h = lines[0].trim();
    if (h === "NOTE" || h.startsWith("NOTE ") || h.startsWith("STYLE") || h.startsWith("REGION")) continue;
    const tIdx = lines[0].includes("-->") ? 0 : lines[1] && lines[1].includes("-->") ? 1 : -1;
    if (tIdx < 0) throw new Error(`WebVTT cue #${i} missing timing line`);
    const parts = lines[tIdx].split("-->");
    if (parts.length !== 2) throw new Error(`Invalid WebVTT timing in cue #${i}`);
    const start_s = parseVttTsClient(parts[0]);
    const end_s = parseVttTsClient((parts[1].trim().split(/\s+/)[0]) || "");
    if (end_s <= start_s) throw new Error(`Cue #${i} end must exceed start`);
    const text = sanitizeCaptionTextClient(lines.slice(tIdx + 1).join("\n"));
    if (!text) throw new Error(`Cue #${i} text is empty after sanitization`);
    cues.push({ index: cues.length + 1, start_s, end_s, text });
  }
  return cues;
}

function computeCueWordTimingsClient(cue, uppercase = false) {
  if (Array.isArray(cue.words) && cue.words.length > 0) {
    return cue.words.map((w) => ({
      text: uppercase ? String(w.text || "").toUpperCase() : String(w.text || ""),
      start_s: Number(w.start_s ?? cue.start_s ?? 0),
      end_s: Number(w.end_s ?? cue.end_s ?? 1)
    }));
  }
  const clean = sanitizeCaptionTextClient(cue.text || "").replace(/\n/g, " ");
  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const startS = Math.max(0, Number(cue.start_s ?? 0));
  const endS = Math.max(startS + 0.01, Number(cue.end_s ?? startS + 2));
  const totalSpan = endS - startS;
  const weights = tokens.map((tok) => Math.max(1, tok.replace(/[^\w]/g, "").length || tok.length));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  let cursor = startS;
  return tokens.map((tok, idx) => {
    const label = uppercase ? tok.toUpperCase() : tok;
    let endT;
    if (idx === tokens.length - 1) {
      endT = Math.max(cursor + 0.005, endS);
    } else {
      const share = totalSpan * (weights[idx] / weightSum);
      endT = Math.min(endS - 0.005 * (tokens.length - 1 - idx), cursor + share);
      endT = Math.max(cursor + 0.005, Number(endT.toFixed(3)));
    }
    const item = { text: label, start_s: Number(cursor.toFixed(3)), end_s: Number(endT.toFixed(3)) };
    cursor = endT;
    return item;
  });
}

function autoChunkCuesClient(cues, maxWords = 4, uppercase = false) {
  const limit = Math.max(1, Math.min(12, Math.round(Number(maxWords) || 4)));
  const out = [];
  for (const cue of Array.isArray(cues) ? cues : []) {
    const words = computeCueWordTimingsClient(cue, uppercase);
    for (let i = 0; i < words.length; i += limit) {
      const group = words.slice(i, i + limit);
      const start_s = group[0].start_s;
      const end_s = Math.max(start_s + 0.01, group[group.length - 1].end_s);
      out.push({
        index: out.length + 1,
        start_s: Number(start_s.toFixed(3)),
        end_s: Number(end_s.toFixed(3)),
        text: group.map((w) => w.text).join(" "),
        words: group
      });
    }
  }
  return out;
}

function parseAssTsClient(raw) {
  const m = /^(\d{1,2}):([0-5]\d):([0-5]\d)\.(\d{2})$/.exec(String(raw || "").trim());
  if (!m) throw new Error(`Invalid ASS timestamp: ${raw}`);
  return Number((Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 100).toFixed(3));
}

function formatAssTsClient(seconds) {
  const totalCs = Math.max(0, Math.round(Number(seconds) * 100));
  const hh = Math.floor(totalCs / 360000);
  const mm = Math.floor((totalCs % 360000) / 6000);
  const ss = Math.floor((totalCs % 6000) / 100);
  const cs = totalCs % 100;
  return `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function parseAssClient(raw) {
  const cleaned = String(raw || "").replace(/^\ufeff/, "").replace(/\r\n|\r/g, "\n").trim();
  if (!cleaned || (!cleaned.includes("[Events]") && !cleaned.includes("Dialogue:"))) {
    throw new Error("Invalid ASS input: missing [Events] / Dialogue lines");
  }
  const cues = [];
  for (const line of cleaned.split("\n")) {
    const row = line.trim();
    if (!row.startsWith("Dialogue:")) continue;
    const parts = row.slice("Dialogue:".length).trim().split(",");
    if (parts.length < 10) continue;
    const start_s = parseAssTsClient(parts[1]);
    const end_s = parseAssTsClient(parts[2]);
    if (end_s <= start_s) continue;
    const rawTxt = parts.slice(9).join(",").replace(/\\N|\\n/g, "\n").replace(/\{[^{}]{0,256}\}/g, "");
    const text = sanitizeCaptionTextClient(rawTxt);
    if (!text) continue;
    const cue = { index: cues.length + 1, start_s, end_s, text };
    cue.words = computeCueWordTimingsClient(cue);
    cues.push(cue);
  }
  if (cues.length === 0) throw new Error("ASS input contains no valid Dialogue cues");
  return cues;
}

function hexToAssColorClient(hex, opacity = 1) {
  const clean = /^#[0-9a-fA-F]{6}$/.test(String(hex || "")) ? hex : "#ffffff";
  const r = clean.slice(1, 3).toUpperCase();
  const g = clean.slice(3, 5).toUpperCase();
  const b = clean.slice(5, 7).toUpperCase();
  const alpha = Math.round((1 - Math.max(0, Math.min(1, opacity))) * 255);
  return `&H${alpha.toString(16).toUpperCase().padStart(2, "0")}${b}${g}${r}`;
}

function exportAssClient(track) {
  const src = track && track.subtitle_track ? track.subtitle_track : track || {};
  const styleId = ALL_CAPTION_STYLE_SPECS.some((s) => s.id === src.style) ? src.style : "clean_white";
  const spec = ALL_CAPTION_STYLE_SPECS.find((s) => s.id === styleId) || ALL_CAPTION_STYLE_SPECS[0];
  const fontSize = Math.min(72, Math.max(14, Math.round(Number(src.font_size ?? 34))));
  const marginBottomPct = Math.min(0.45, Math.max(0.02, Number(src.margin_bottom_pct ?? 0.08)));
  const karaokeMode = ["off", "color_pop", "pill_box", "progressive_fill"].includes(src.karaoke_mode) ? src.karaoke_mode : "off";
  const hlColor = /^#[0-9a-fA-F]{6}$/.test(String(src.highlight_color || "")) ? src.highlight_color : "#ffe047";
  const uppercase = Boolean(src.uppercase);
  const cues = Array.isArray(src.cues) ? src.cues : [];

  const primaryAss = hexToAssColorClient(karaokeMode !== "off" ? hlColor : spec.font_color, 1.0);
  const secondaryAss = hexToAssColorClient(spec.font_color, 1.0);
  const outlineAss = hexToAssColorClient("#000000", 0.85);
  const backAss = hexToAssColorClient(spec.box_opacity > 0 ? spec.box_color : "#000000", spec.box_opacity > 0 ? spec.box_opacity : 0.55);
  const borderStyle = spec.box_opacity > 0 ? 3 : 1;
  const marginV = Math.max(12, Math.round(1080 * marginBottomPct));
  const lines = [
    "[Script Info]",
    "Title: taktcut Studio Dynamic Captions",
    "ScriptType: v4.00+",
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "PlayResX: 1920",
    "PlayResY: 1080",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: TaktCutCaption,Arial,${fontSize},${primaryAss},${secondaryAss},${outlineAss},${backAss},${spec.bold ? -1 : 0},0,0,0,100,100,0,0,${borderStyle},${borderStyle === 1 ? Math.max(1, spec.border_w) : 6},${borderStyle === 1 ? 1 : 0},2,64,64,${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"
  ];
  const kTag = karaokeMode === "progressive_fill" ? "kf" : karaokeMode === "pill_box" ? "ko" : "k";
  for (const cue of cues) {
    const startTs = formatAssTsClient(cue.start_s);
    const endTs = formatAssTsClient(cue.end_s);
    let txt;
    if (karaokeMode !== "off") {
      const words = computeCueWordTimingsClient(cue, uppercase);
      txt = words
        .map((w, idx) => {
          const cs = Math.max(1, Math.round((w.end_s - w.start_s) * 100));
          const safe = sanitizeCaptionTextClient(w.text).replace(/\\/g, "/").replace(/\{/g, "(").replace(/\}/g, ")");
          return `{\\${kTag}${cs}}${safe}${idx < words.length - 1 ? " " : ""}`;
        })
        .join("");
    } else {
      const raw = uppercase ? String(cue.text || "").toUpperCase() : String(cue.text || "");
      txt = sanitizeCaptionTextClient(raw).replace(/\\/g, "/").replace(/\{/g, "(").replace(/\}/g, ")").replace(/\n/g, "\\N");
    }
    lines.push(`Dialogue: 0,${startTs},${endTs},TaktCutCaption,,0,0,0,,${txt}`);
  }
  return `${lines.join("\n")}\n`;
}

function compileSubtitlesClient(payload, opts = {}) {
  const src = payload && payload.subtitle_track ? payload.subtitle_track : payload || {};
  const enabled = src.enabled !== false;
  const styleId = ALL_CAPTION_STYLE_SPECS.some((s) => s.id === src.style) ? src.style : "clean_white";
  const spec = ALL_CAPTION_STYLE_SPECS.find((s) => s.id === styleId) || ALL_CAPTION_STYLE_SPECS[0];
  const fontSize = Math.min(72, Math.max(14, Math.round(Number(src.font_size ?? 34))));
  const marginBottomPct = Math.min(0.45, Math.max(0.02, Number(src.margin_bottom_pct ?? 0.08)));
  const karaokeMode = ["off", "color_pop", "pill_box", "progressive_fill"].includes(src.karaoke_mode) ? src.karaoke_mode : "off";
  const hlHex = /^#[0-9a-fA-F]{6}$/.test(String(src.highlight_color || "")) ? src.highlight_color.toLowerCase() : "#ffe047";
  const uppercase = Boolean(src.uppercase);
  const cues = Array.isArray(src.cues) ? src.cues : [];

  if (!enabled || cues.length === 0) {
    return {
      filtergraph: "",
      ffmpeg_vf_args: [],
      is_active: false,
      cue_count: cues.length,
      style: styleId,
      escaped_cues: [],
      karaoke_mode: karaokeMode,
      highlight_color: hlHex,
      uppercase,
      margin_bottom_pct: marginBottomPct,
      word_count: 0,
      ass_preview: ""
    };
  }

  const fontColor = `0x${spec.font_color.slice(1)}`;
  const boxColor = `0x${spec.box_color.slice(1)}`;
  const hlColor = `0x${hlHex.slice(1)}`;
  const fsExpr = `max(14,round(h*${(fontSize / 1080).toFixed(5)}))`;
  const popFsExpr = `max(16,round(h*${((fontSize * 1.12) / 1080).toFixed(5)}))`;
  const lineStepRatio = (fontSize * 1.38) / 1080;
  const bottomYRatio = 1 - marginBottomPct;
  const styleOpts = [`fontcolor=${fontColor}`];
  if (spec.border_w > 0) styleOpts.push(`borderw=${spec.border_w}:bordercolor=0x000000@0.80`);
  if (spec.box_opacity > 0) {
    const bw = spec.id === "boxed_social" || spec.id === "social_karaoke" ? 12 : 8;
    styleOpts.push(`box=1:boxcolor=${boxColor}@${spec.box_opacity.toFixed(2)}:boxborderw=${bw}`);
  }
  styleOpts.push("shadowcolor=0x000000@0.85:shadowx=1:shadowy=1");
  const styleStr = styleOpts.join(":");

  const hlStyleOpts = [`fontcolor=${hlColor}`];
  if (spec.border_w > 0) hlStyleOpts.push(`borderw=${spec.border_w}:bordercolor=0x000000@0.85`);
  if (spec.box_opacity > 0) {
    const bw = spec.id === "boxed_social" || spec.id === "social_karaoke" ? 12 : 8;
    hlStyleOpts.push(`box=1:boxcolor=${boxColor}@${spec.box_opacity.toFixed(2)}:boxborderw=${bw}`);
  }
  hlStyleOpts.push("shadowcolor=0x000000@0.85:shadowx=1:shadowy=1");
  const hlStyleStr = hlStyleOpts.join(":");

  const segs = [];
  const escapedCues = [];
  let wordCount = 0;
  for (const cue of cues) {
    const clean = sanitizeCaptionTextClient(cue.text || "");
    if (!clean) continue;
    const rawLines = clean.split("\n").filter(Boolean);
    const lines = uppercase ? rawLines.map((l) => l.toUpperCase()) : rawLines;
    const startS = Math.max(0, Number(cue.start_s ?? 0));
    const endS = Math.max(startS + 0.1, Number(cue.end_s ?? startS + 2));
    const en = `enable='between(t,${startS.toFixed(3)},${endS.toFixed(3)})'`;
    escapedCues.push(escapeDrawtextClient(lines.join(" ")));
    const words = computeCueWordTimingsClient(cue, uppercase);
    wordCount += words.length;

    if (karaokeMode === "progressive_fill") {
      for (let i = 0; i < words.length; i += 1) {
        const w = words[i];
        const phrase = words.slice(Math.max(0, i - 5), i + 1).map((x) => x.text).join(" ");
        const escPhrase = escapeDrawtextClient(phrase);
        const wEn = `enable='between(t,${w.start_s.toFixed(3)},${w.end_s.toFixed(3)})'`;
        segs.push(
          `drawtext=expansion=none:text='${escPhrase}':x=(w-tw)/2:y=round(h*${bottomYRatio.toFixed(4)}-th):fontsize='${fsExpr}':${hlStyleStr}:${wEn}`
        );
      }
      continue;
    }

    for (let idx = 0; idx < lines.length; idx += 1) {
      const escLine = escapeDrawtextClient(lines[idx]);
      const yRatio = Math.max(0.05, bottomYRatio - (lines.length - 1 - idx) * lineStepRatio);
      segs.push(
        `drawtext=expansion=none:text='${escLine}':x=(w-tw)/2:y=round(h*${yRatio.toFixed(4)}-th):fontsize='${fsExpr}':${styleStr}:${en}`
      );
    }

    if (karaokeMode === "color_pop" || karaokeMode === "pill_box") {
      const topLineY = Math.max(0.06, bottomYRatio - lines.length * lineStepRatio - 0.015);
      for (const w of words) {
        const escW = escapeDrawtextClient(w.text);
        const wEn = `enable='between(t,${w.start_s.toFixed(3)},${w.end_s.toFixed(3)})'`;
        const wStyle = karaokeMode === "pill_box"
          ? `fontcolor=0x141416:box=1:boxcolor=${hlColor}@0.94:boxborderw=12`
          : `fontcolor=${hlColor}:borderw=2:bordercolor=0x000000@0.88:box=1:boxcolor=0x141416@0.88:boxborderw=10:shadowcolor=0x000000@0.85:shadowx=1:shadowy=1`;
        segs.push(
          `drawtext=expansion=none:text='${escW}':x=(w-tw)/2:y=round(h*${topLineY.toFixed(4)}-th):fontsize='${popFsExpr}':${wStyle}:${wEn}`
        );
      }
    }
  }
  if (opts.pix_fmt && segs.length > 0) segs.push(`format=${opts.pix_fmt}`);
  const fg = segs.join(",");
  return {
    filtergraph: fg,
    ffmpeg_vf_args: fg ? ["-vf", fg] : [],
    is_active: segs.length > 0,
    cue_count: cues.length,
    style: styleId,
    escaped_cues: escapedCues,
    karaoke_mode: karaokeMode,
    highlight_color: hlHex,
    uppercase,
    margin_bottom_pct: marginBottomPct,
    word_count: wordCount,
    ass_preview: exportAssClient({ ...src, style: styleId, font_size: fontSize, margin_bottom_pct: marginBottomPct, karaoke_mode: karaokeMode, highlight_color: hlHex, uppercase })
  };
}

export function createApiClient() {
  const cfg = typeof window !== "undefined" && window.__TAKTCUT_CONFIG__ ? window.__TAKTCUT_CONFIG__ : {};
  const apiBase = typeof cfg.apiBase === "string" ? cfg.apiBase.replace(/\/+$/, "") : "";
  const configuredMode = cfg.mode || "auto";
  const customAdapter = cfg.adapter || null;
  let resolvedMode = configuredMode === "static-demo" ? "static-demo" : "server";

  async function requestJson(route, options = {}) {
    const init = {
      method: options.method || "GET",
      headers: { Accept: "application/json" }
    };
    if (options.body !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const resp = await fetch(`${apiBase}${route}`, init);
    let data = null;
    try {
      data = await resp.json();
    } catch {
      data = null;
    }
    if (!resp.ok) {
      throw new Error((data && data.error) || `HTTP ${resp.status}`);
    }
    return data;
  }

  async function initHealth() {
    if (customAdapter && typeof customAdapter.health === "function") {
      return customAdapter.health();
    }
    if (configuredMode === "static-demo") {
      resolvedMode = "static-demo";
    } else {
      try {
        const data = await requestJson("/api/health");
        if (data && data.status === "ok") {
          resolvedMode = "server";
          return { ...data, runtime_mode: "server" };
        }
      } catch (err) {
        if (configuredMode === "server") throw err;
        resolvedMode = "static-demo";
      }
    }
    return {
      status: "ok",
      version: "0.1.27",
      workspace_dir: "browser-static-demo",
      ffmpeg_available: false,
      capabilities: {
        ffmpeg_path: "static-demo",
        h264_nvenc: false,
        hevc_nvenc: false,
        libx264: true,
        libx265: true,
        prores_ks: true
      },
      ffmpeg_error: null,
      runtime_mode: "static-demo"
    };
  }

  const demoRenderQueue = [];
  let demoQueueCounter = 0;
  function getDemoQueueSummary() {
    let queued = 0;
    let rendering = 0;
    let completed = 0;
    let failed = 0;
    let skipped = 0;
    let estBytes = 0;
    let writtenBytes = 0;
    for (const j of demoRenderQueue) {
      if (j.status === "queued") queued += 1;
      else if (j.status === "rendering") rendering += 1;
      else if (j.status === "completed") completed += 1;
      else if (j.status === "failed") failed += 1;
      else if (j.status === "skipped") skipped += 1;
      if (j.enabled) estBytes += Math.max(0, Number(j.estimated_bytes || 0));
      writtenBytes += Math.max(0, Number(j.bytes_written || 0));
    }
    return {
      total_jobs: demoRenderQueue.length,
      queued_count: queued,
      rendering_count: rendering,
      completed_count: completed,
      failed_count: failed,
      skipped_count: skipped,
      total_estimated_bytes: estBytes,
      total_bytes_written: writtenBytes,
      is_running: false
    };
  }

  return {
    isStaticDemo: () => resolvedMode === "static-demo",
    initHealth,
    async getWorkspaceFiles() {
      if (resolvedMode === "static-demo") {
        return {
          workspace_dir: "browser-static-demo",
          files: {
            timelines: ["demo/Eclipse_Showreel_Master_25p.drt"],
            luts: ["demo/warm_editorial_v1.cube"],
            cdls: [],
            media: [".taktcut-samples/sample_rec709.mp4"]
          }
        };
      }
      return requestJson("/api/workspace/files");
    },
    async getSampleTimeline(preset) {
      if (resolvedMode === "static-demo") {
        const doc = buildDemoTimeline(preset);
        return { document: doc, validation: validateTimelineClient(doc) };
      }
      return requestJson(`/api/sample?preset=${encodeURIComponent(preset)}`);
    },
    async inspectTimeline(payload) {
      if (resolvedMode === "static-demo") {
        if (payload.content_base64 && payload.filename && payload.filename.toLowerCase().endsWith(".otio")) {
          const text = atob(payload.content_base64);
          const raw = JSON.parse(text);
          const rate = raw.global_start_time?.rate || 25;
          const doc = {
            name: raw.name || payload.filename,
            source_format: "otio",
            fps: { num: Math.round(rate), den: 1 },
            width: 1920,
            height: 1080,
            start_frame: 0,
            tracks: (raw.tracks?.children || []).map((t, i) => ({
              index: i + 1,
              kind: t.kind === "Audio" ? "audio" : "video",
              name: t.name || `T${i + 1}`,
              clips: (t.children || []).filter((c) => c.OTIO_SCHEMA?.startsWith("Clip")).map((c, ci) => ({
                name: c.name || `clip_${ci}`,
                track_index: i + 1,
                media_type: t.kind === "Audio" ? "audio" : "video",
                start_frame: ci * 50,
                duration_frames: Math.round(c.source_range?.duration?.value || 50),
                source_in_frame: Math.round(c.source_range?.start_time?.value || 0),
                source_path: c.media_reference?.target_url || "",
                enabled: true
              }))
            })),
            markers: [],
            lut_refs: []
          };
          return { document: doc, validation: validateTimelineClient(doc) };
        }
        const doc = buildDemoTimeline("clean");
        return { document: doc, validation: validateTimelineClient(doc) };
      }
      return requestJson("/api/timeline/inspect", { method: "POST", body: payload });
    },
    async validateTimeline(payload) {
      if (resolvedMode === "static-demo" && payload.document) {
        return {
          document: payload.document,
          validation: validateTimelineClient(payload.document)
        };
      }
      return requestJson("/api/timeline/validate", { method: "POST", body: payload });
    },
    async saveOtioToWorkspace(payload) {
      if (resolvedMode === "static-demo") {
        const text = buildOtioJsonString(payload.document);
        return {
          timeline_name: payload.document.name,
          output_path: payload.out_path,
          bytes_written: text.length
        };
      }
      return requestJson("/api/timeline/convert", { method: "POST", body: payload });
    },
    async downloadOtioBlob(doc, fmt) {
      if (resolvedMode === "static-demo") {
        if (fmt !== "otio") {
          throw new Error(".otioz ZIP archive packaging requires local `taktcut ui` server.");
        }
        return new Blob([buildOtioJsonString(doc)], { type: "application/json; charset=utf-8" });
      }
      const resp = await fetch(`${apiBase}/api/timeline/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: doc, format: fmt })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      return resp.blob();
    },
    async parseCdlXml(xmlContent) {
      if (resolvedMode === "static-demo") {
        const parsed = new DOMParser().parseFromString(xmlContent, "application/xml");
        const triplet = (tag, def) => {
          const el = parsed.querySelector(tag);
          if (!el || !el.textContent) return def;
          const nums = el.textContent.trim().split(/\s+/).map(Number);
          return nums.length === 3 ? nums : def;
        };
        const satEl = parsed.querySelector("Saturation");
        return {
          cdl: {
            slope: triplet("Slope", [1, 1, 1]),
            offset: triplet("Offset", [0, 0, 0]),
            power: triplet("Power", [1, 1, 1]),
            saturation: satEl && satEl.textContent ? Number(satEl.textContent.trim()) : 1.0
          }
        };
      }
      return requestJson("/api/color/parse-cdl", { method: "POST", body: { xml_content: xmlContent } });
    },
    async parseCubeLut(cubeContent, filename = "uploaded.cube") {
      if (resolvedMode === "static-demo") {
        const parsed = parseCubeLutTextClient(cubeContent, filename.replace(/\.cube$/i, ""));
        return {
          info: {
            path: filename,
            title: parsed.title,
            dimension: parsed.dimension,
            size: parsed.size,
            domain_min: parsed.domainMin,
            domain_max: parsed.domainMax,
            entry_count: parsed.entryCount
          },
          lut: parsed
        };
      }
      return requestJson("/api/color/parse-cube", {
        method: "POST",
        body: { cube_content: cubeContent, filename }
      });
    },
    async bakeCube(payload) {
      if (resolvedMode === "static-demo") {
        const size = Number(payload.size || 33);
        const title = payload.title || "taktcut_cdl";
        const cubeText = bakeCubeTextClient(payload, size, title);
        return {
          info: {
            path: payload.out_path || "browser.cube",
            title,
            dimension: "3D",
            size,
            domain_min: [0, 0, 0],
            domain_max: [1, 1, 1],
            entry_count: size ** 3
          },
          saved_path: payload.out_path || null,
          cube_text: cubeText
        };
      }
      return requestJson("/api/color/bake", { method: "POST", body: payload });
    },
    async downloadCubeBlob(payload) {
      if (resolvedMode === "static-demo") {
        const text = bakeCubeTextClient(payload, Number(payload.size || 33), payload.title || "taktcut_cdl");
        return new Blob([text], { type: "text/plain; charset=utf-8" });
      }
      const resp = await fetch(`${apiBase}/api/color/download-cube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      return resp.blob();
    },
    async verifyRenderCapabilities() {
      if (resolvedMode === "static-demo") {
        return {
          ffmpeg_available: false,
          capabilities: {
            ffmpeg_path: "static-demo (run `taktcut ui` locally for live GPU probe)",
            h264_nvenc: false,
            hevc_nvenc: false,
            libx264: true,
            libx265: true,
            prores_ks: true
          },
          error: null
        };
      }
      return requestJson("/api/render/capabilities?verify_nvenc=true&refresh=true");
    },
    async getRenderPresets() {
      if (resolvedMode === "static-demo") {
        return {
          presets: DELIVERY_PRESETS,
          audio_bitrates_kbps: [96, 128, 160, 192, 256, 320],
          bounds: {
            crf: { min: 0, max: 51 },
            audio_bitrate_kbps: { min: 64, max: 512 }
          }
        };
      }
      return requestJson("/api/render/presets");
    },
    async buildOrExecuteRender(body) {
      if (resolvedMode === "static-demo") {
        if (body.execute) {
          throw new Error("FFmpeg execution requires running `taktcut ui` locally on your machine.");
        }
        const presetObj = body.delivery_preset ? getDeliveryPresetClient(body.delivery_preset) : null;
        const resolvedProfile = body.profile || (presetObj ? presetObj.profile : "web_h264");
        const rawExportFps =
          typeof body.export_fps === "string" && body.export_fps.trim() !== ""
            ? body.export_fps.trim().toLowerCase()
            : body.export_fps === undefined || body.export_fps === null
              ? "source"
              : null;
        if (rawExportFps === null || !["source", "24", "25", "30", "60"].includes(rawExportFps)) {
          throw new Error(`Unsupported export_fps '${body.export_fps}'`);
        }
        if (body.deinterlace !== undefined && typeof body.deinterlace !== "boolean") {
          throw new Error("deinterlace must be a boolean");
        }
        const deinterlace = Boolean(body.deinterlace);
        const rawAudioOnly =
          typeof body.audio_only_format === "string" && body.audio_only_format.trim() !== ""
            ? body.audio_only_format.trim().toLowerCase()
            : body.audio_only_format === undefined || body.audio_only_format === null
              ? "off"
              : null;
        if (rawAudioOnly === null || !["off", "wav24", "mp3_320", "aac_256"].includes(rawAudioOnly)) {
          throw new Error(`Unsupported audio_only_format '${body.audio_only_format}'`);
        }
        const audioOnlySpecs = {
          wav24: { codec: "pcm_s24le", ext: ".wav", bitrateKbps: null },
          mp3_320: { codec: "libmp3lame", ext: ".mp3", bitrateKbps: 320 },
          aac_256: { codec: "aac", ext: ".aac", bitrateKbps: 256 }
        };
        const isAudioOnly = rawAudioOnly !== "off";
        const resolvedOutputPath = isAudioOnly
          ? String(body.output_path || "renders/master_audio").replace(
              /\.(mp4|mov|m4v|mkv|mxf|webm|wav|aac|mp3)$/i,
              ""
            ) + audioOnlySpecs[rawAudioOnly].ext
          : body.output_path;
        const fpsParts = String(body.fps || "25").split("/");
        const baseFpsNum = Number.parseInt(fpsParts[0], 10) || 25;
        const baseFpsDen = Number.parseInt(fpsParts[1] || "1", 10) || 1;
        const fpsNum = rawExportFps !== "source" ? Number.parseInt(rawExportFps, 10) : baseFpsNum;
        const fpsDen = rawExportFps !== "source" ? 1 : baseFpsDen;
        const isProres = resolvedProfile === "prores_hq";
        const isDnxhr = resolvedProfile === "dnxhr_hq";
        const isMezzanine = isProres || isDnxhr;
        const encoder = isProres
          ? "prores_ks"
          : isDnxhr
            ? "dnxhd"
            : resolvedProfile === "master_hevc"
              ? "libx265"
              : "libx264";
        const pixFmt = isProres ? "yuv422p10le" : isDnxhr ? "yuv422p" : "yuv420p";
        const gop = Math.max(2, Math.round((2 * fpsNum) / fpsDen));
        const effectiveCrf = isMezzanine
          ? null
          : Number.isInteger(body.video_crf)
            ? body.video_crf
            : presetObj && presetObj.crf !== null
              ? presetObj.crf
              : resolvedProfile === "master_hevc"
                ? 20
                : 18;
        const effectiveAudioKbps = isMezzanine
          ? null
          : Number.isInteger(body.audio_bitrate_kbps)
            ? body.audio_bitrate_kbps
            : presetObj && presetObj.audio_bitrate_kbps !== null
              ? presetObj.audio_bitrate_kbps
              : 192;
        const effectiveEncPreset = isMezzanine
          ? null
          : body.encoder_preset || (presetObj && presetObj.encoder_preset) || "medium";
        const x26xPreset = effectiveEncPreset === "fast" ? "veryfast" : effectiveEncPreset === "slow" ? "slow" : "medium";
        const vfParts = [];
        const afParts = [];
        let targetWidth = null;
        let targetHeight = null;
        let framingMode = null;
        if (deinterlace) {
          vfParts.push("yadif=mode=0:parity=-1:deint=0");
        }
        let retimeEnabled = false;
        let retimeSpeed = 1.0;
        let retimeReverse = false;
        let retimeProcess = "nearest";
        let retimeRampPreset = "constant";
        if (body.retime) {
          const compiledRetime = compileDeliverRetimeClient({
            ...body.retime,
            fps: rawFps || "25"
          });
          if (!compiledRetime.is_identity) {
            if (compiledRetime.video_filtergraph) vfParts.push(compiledRetime.video_filtergraph);
            if (compiledRetime.audio_filtergraph) afParts.push(compiledRetime.audio_filtergraph);
            retimeEnabled = true;
            retimeSpeed = compiledRetime.avg_speed;
            retimeReverse = compiledRetime.params.reverse;
            retimeProcess = compiledRetime.retime_process;
            retimeRampPreset = compiledRetime.ramp_preset;
          }
        } else if (body.retime_params) {
          const compiledRetime = compileRetimeFilterClient({
            ...body.retime_params,
            fps: rawFps || "25"
          });
          if (!compiledRetime.is_identity) {
            if (compiledRetime.video_filtergraph) vfParts.push(compiledRetime.video_filtergraph);
            if (compiledRetime.audio_filtergraph) afParts.push(compiledRetime.audio_filtergraph);
            retimeEnabled = true;
            retimeSpeed = compiledRetime.avg_speed;
            retimeReverse = compiledRetime.params.reverse;
            retimeProcess = compiledRetime.retime_process;
            retimeRampPreset = compiledRetime.ramp_preset;
          }
        }
        if (rawExportFps !== "source") {
          vfParts.push(`fps=${rawExportFps}`);
        }
        let reframeEnabled = false;
        let reframeAspectRatio = "source";
        let reframePanX = 0.0;
        let reframePanY = 0.0;
        if (body.reframe) {
          const compiledReframe = compileReframeClient(body.reframe);
          if (compiledReframe.is_active && compiledReframe.filtergraph) {
            vfParts.push(compiledReframe.filtergraph);
            reframeEnabled = true;
            reframeAspectRatio = compiledReframe.params.aspect_ratio;
            reframePanX = compiledReframe.params.pan_x;
            reframePanY = compiledReframe.params.pan_y;
          }
        }
        const effectiveFraming =
          body.framing ||
          (presetObj
            ? {
                preset: presetObj.aspect_ratio,
                mode: presetObj.framing_mode,
                target_width: presetObj.width,
                target_height: presetObj.height,
                enabled: true
              }
            : null);
        if (effectiveFraming) {
          const compiledFraming = compileFramingFilterClient(effectiveFraming);
          if (!compiledFraming.is_identity && compiledFraming.filtergraph) {
            vfParts.push(compiledFraming.filtergraph);
            targetWidth = compiledFraming.target_width;
            targetHeight = compiledFraming.target_height;
            framingMode = compiledFraming.params.mode;
          }
        }
        let stabilizerEnabled = false;
        if (body.stabilizer) {
          const compiledStab = compileStabilizerFilterClient(body.stabilizer, {
            width: targetWidth,
            height: targetHeight,
            pix_fmt: pixFmt
          });
          if (compiledStab.is_active && compiledStab.filtergraph) {
            vfParts.push(compiledStab.filtergraph);
            stabilizerEnabled = true;
          }
        }
        if (body.transform_params) {
          const compiledTransform = compileTransformFilterClient(
            body.transform_params,
            pixFmt,
            body.clip_duration_s || null
          );
          if (!compiledTransform.is_identity && compiledTransform.filtergraph) {
            vfParts.push(compiledTransform.filtergraph);
          }
        }
        let planarTrackerEnabled = false;
        if (body.planar_tracker) {
          const compiledTrk = compilePlanarTrackerFilterClient(body.planar_tracker, {
            pix_fmt: pixFmt
          });
          if (compiledTrk.is_active && compiledTrk.filtergraph) {
            vfParts.push(compiledTrk.filtergraph);
            planarTrackerEnabled = true;
          }
        }
        if (body.chroma_key) {
          const compiledCk = compileChromaKeyClient(body.chroma_key, { pix_fmt: pixFmt });
          if (compiledCk.is_active && compiledCk.filtergraph) {
            vfParts.push(compiledCk.filtergraph);
          }
        }
        if (Array.isArray(body.fx_stack) && body.fx_stack.length > 0) {
          const compiledFx = compileFxClient(body.fx_stack, { pix_fmt: pixFmt, use_gpu: Boolean(body.prefer_hw) });
          if (compiledFx.filtergraph) vfParts.push(compiledFx.filtergraph);
        }
        if (Array.isArray(body.color_nodes) && body.color_nodes.length > 0) {
          const clientNodes = body.color_nodes.map((n, idx) => deserializeColorNodeFromApi(n, idx));
          const compiledChain = compileColorNodeChainClient(clientNodes, pixFmt);
          if (!compiledChain.is_identity) {
            if (compiledChain.has_lut_nodes) {
              vfParts.push(`lut3d=file='studio_node_tree.cube':interp=tetrahedral,format=${pixFmt}`);
            } else {
              vfParts.push(compiledChain.filtergraph);
            }
          }
        } else if (body.color_grade) {
          const compiledColor = compileColorClient(body.color_grade, { pix_fmt: pixFmt });
          if (!compiledColor.is_identity) vfParts.push(compiledColor.filtergraph);
        }
        if (body.lut_path || body.cdl) {
          vfParts.push(`lut3d=file='${body.lut_path || "studio_grade.cube"}':interp=tetrahedral,format=${pixFmt}`);
        }
        const effectiveVideoFade = body.video_fade
          ? body.video_fade
          : body.audio_params
            ? {
                fade_in_s: body.audio_params.fade_in_s || 0,
                fade_out_s: body.audio_params.fade_out_s || 0
              }
            : body.fade_in_s !== undefined || body.fade_out_s !== undefined || body.fade_in_sec !== undefined || body.fade_out_sec !== undefined
              ? {
                  fade_in_s: body.fade_in_s ?? body.fade_in_sec ?? 0,
                  fade_out_s: body.fade_out_s ?? body.fade_out_sec ?? 0
                }
              : null;
        if (!isAudioOnly && effectiveVideoFade) {
          const compiledVideoFade = compileVideoFadeFilterClient(
            effectiveVideoFade,
            body.clip_duration_s ?? null
          );
          if (!compiledVideoFade.is_identity && compiledVideoFade.filtergraph) {
            vfParts.push(compiledVideoFade.filtergraph);
          }
        }
        let vignetteEnabled = false;
        let vignettePreset = "subtle_cinema";
        let vignetteAngleDeg = 24.0;
        let vignetteMode = "forward";
        if (body.vignette) {
          const compiledVignette = compileVignetteClient(body.vignette);
          if (compiledVignette.is_active && compiledVignette.filtergraph) {
            vfParts.push(compiledVignette.filtergraph);
            vignetteEnabled = true;
            vignettePreset = compiledVignette.params.preset;
            vignetteAngleDeg = compiledVignette.params.angle_deg;
            vignetteMode = compiledVignette.params.mode;
          }
        }
        let filmGrainEnabled = false;
        let filmGrainPreset = "35mm_fine";
        let filmGrainStrength = 12;
        let filmGrainTemporal = true;
        if (body.film_grain) {
          const compiledFilmGrain = compileFilmGrainClient(body.film_grain);
          if (compiledFilmGrain.is_active && compiledFilmGrain.filtergraph) {
            vfParts.push(compiledFilmGrain.filtergraph);
            filmGrainEnabled = true;
            filmGrainPreset = compiledFilmGrain.params.preset;
            filmGrainStrength = compiledFilmGrain.params.strength;
            filmGrainTemporal = compiledFilmGrain.params.temporal;
          }
        }
        if (body.title_overlay) {
          const compiledTitle = compileTitleClient(body.title_overlay, { pix_fmt: pixFmt });
          if (compiledTitle.is_active && compiledTitle.filtergraph) {
            vfParts.push(compiledTitle.filtergraph);
          }
        }
        if (body.subtitle_track) {
          const compiledSubs = compileSubtitlesClient(body.subtitle_track, { pix_fmt: pixFmt });
          if (compiledSubs.is_active && compiledSubs.filtergraph) {
            vfParts.push(compiledSubs.filtergraph);
          }
        }
        let compiledLowerThird = null;
        if (body.lower_third) {
          compiledLowerThird = compileLowerThirdClient(body.lower_third);
          if (compiledLowerThird.is_active && compiledLowerThird.filtergraph) {
            vfParts.push(compiledLowerThird.filtergraph);
          }
        }
        const tcModeRaw = typeof body.timecode_burnin === "string" ? body.timecode_burnin.trim().toLowerCase() : "off";
        const tcCoords = {
          top_left: "x=24:y=24",
          bottom_center: "x=(w-tw)/2:y=h-th-24",
          bottom_right: "x=w-tw-24:y=h-th-24"
        };
        if (tcModeRaw !== "off" && !Object.prototype.hasOwnProperty.call(tcCoords, tcModeRaw)) {
          throw new Error(`Unsupported timecode_burnin '${body.timecode_burnin}'`);
        }
        const tcPos = tcModeRaw !== "off" ? tcCoords[tcModeRaw] : null;
        if (tcPos) {
          const rateStr = fpsDen === 1 ? String(fpsNum) : `${fpsNum}/${fpsDen}`;
          vfParts.push(
            `drawtext=timecode='00\\:00\\:00\\:00':rate=${rateStr}:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.65:${tcPos}`
          );
        }
        const rawSlatePos =
          typeof body.reel_slate_position === "string" && body.reel_slate_position.trim() !== ""
            ? body.reel_slate_position.trim().toLowerCase()
            : "off";
        const slateCoords = {
          top_right: "x=w-tw-24:y=24",
          bottom_left: "x=24:y=h-th-24"
        };
        if (rawSlatePos !== "off" && !Object.prototype.hasOwnProperty.call(slateCoords, rawSlatePos)) {
          throw new Error(`Unsupported reel_slate_position '${body.reel_slate_position}'`);
        }
        const rawSlateText = typeof body.reel_slate_text === "string" ? body.reel_slate_text.trim() : "";
        if (rawSlateText.length > 48) {
          throw new Error("reel_slate_text exceeds maximum length of 48 characters");
        }
        if (rawSlateText && !/^[A-Za-z0-9 _.,:/|#()-]+$/.test(rawSlateText)) {
          throw new Error("reel_slate_text contains unsupported characters");
        }
        if (rawSlatePos !== "off" && rawSlateText) {
          const escSlate = escapeDrawtextClient(rawSlateText);
          vfParts.push(
            `drawtext=text='${escSlate}':fontsize=24:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=6:${slateCoords[rawSlatePos]}`
          );
        }
        const rawWmText = typeof body.review_watermark_text === "string" ? body.review_watermark_text.trim() : "";
        if (rawWmText.length > 40) {
          throw new Error("review_watermark_text exceeds maximum length of 40 characters");
        }
        if (rawWmText && !/^[A-Za-z0-9 _.,-]+$/.test(rawWmText)) {
          throw new Error("review_watermark_text contains unsupported characters");
        }
        const rawWmOpacity =
          body.review_watermark_opacity !== null && body.review_watermark_opacity !== undefined
            ? Number(body.review_watermark_opacity)
            : 0.35;
        if (!Number.isFinite(rawWmOpacity) || rawWmOpacity < 0.15 || rawWmOpacity > 0.80) {
          throw new Error("review_watermark_opacity must be within [0.15, 0.80]");
        }
        if (rawWmText) {
          const escWm = escapeDrawtextClient(rawWmText);
          vfParts.push(
            `drawtext=text='${escWm}':fontsize=42:fontcolor=white@${rawWmOpacity.toFixed(2)}:x=(w-text_w)/2:y=(h-text_h)/2`
          );
        }
        const vf = vfParts.length > 0 ? vfParts.join(",") : null;
        const hasLoudnessPreset =
          body.loudness_preset !== null && body.loudness_preset !== undefined;
        const fairlight = normalizeFairlightAudioParams({
          loudness_preset: body.loudness_preset || "off",
          dialogue_eq: body.dialogue_eq || "off"
        });
        let effectiveLufs = null;
        if (fairlight.loudness_preset !== "off") {
          effectiveLufs = LOUDNESS_PRESET_LUFS[fairlight.loudness_preset];
        } else if (hasLoudnessPreset) {
          effectiveLufs =
            body.target_lufs !== null && body.target_lufs !== undefined ? body.target_lufs : null;
        } else {
          effectiveLufs =
            body.target_lufs !== null && body.target_lufs !== undefined
              ? body.target_lufs
              : presetObj
                ? presetObj.target_lufs
                : null;
        }
        let voiceCleanupEnabled = false;
        let voiceCleanupPreset = "youtube_voice";
        let voiceCleanupHighpassHz = 85;
        let voiceCleanupPresenceDb = 2.5;
        let voiceCleanupDeEss = 0.35;
        let voiceCleanupAf = "";
        if (body.voice_cleanup) {
          const compiledVc = compileVoiceCleanupClient(body.voice_cleanup);
          if (compiledVc.is_active && compiledVc.filtergraph) {
            voiceCleanupEnabled = true;
            voiceCleanupPreset = compiledVc.params.preset;
            voiceCleanupHighpassHz = compiledVc.params.highpass_hz;
            voiceCleanupPresenceDb = compiledVc.params.presence_db;
            voiceCleanupDeEss = compiledVc.params.de_ess;
            voiceCleanupAf = compiledVc.filtergraph;
          }
        }
        const isMutedDemo = Boolean(body.audio_params && body.audio_params.muted);
        if (body.audio_params) {
          const clipOnlyAudio = compileAudioFilterClient(
            body.audio_params,
            body.clip_duration_s ?? null,
            null,
            null
          );
          if (clipOnlyAudio.filtergraph) afParts.push(clipOnlyAudio.filtergraph);
        }
        if (!isMutedDemo) {
          if (voiceCleanupAf) {
            afParts.push(voiceCleanupAf);
          }
          const compiledFairlight = compileFairlightAudioFilterClient(fairlight);
          if (compiledFairlight.filtergraph) {
            afParts.push(compiledFairlight.filtergraph);
          }
          if (body.fairlight_rack) {
            const compiledRack = compileFairlightAudioRackClient(body.fairlight_rack);
            if (!compiledRack.is_identity && compiledRack.filtergraph) {
              afParts.push(compiledRack.filtergraph);
            }
          }
          if (
            fairlight.loudness_preset === "off" &&
            effectiveLufs !== null &&
            effectiveLufs !== undefined
          ) {
            const lufs = Number(effectiveLufs);
            const lra = lufs >= -16.0 ? 11.0 : 7.0;
            afParts.push(`loudnorm=I=${lufs.toFixed(1)}:TP=-1.0:LRA=${lra.toFixed(1)}`);
          }
        }
        const af = afParts.length > 0 ? afParts.join(",") : null;
        if (isAudioOnly) {
          const spec = audioOnlySpecs[rawAudioOnly];
          const audioArgv = [
            "ffmpeg",
            "-hide_banner",
            "-y",
            "-i",
            body.input_path,
            "-map",
            "0:a:0",
            "-vn"
          ];
          if (af) audioArgv.push("-af", af);
          audioArgv.push("-c:a", spec.codec);
          if (spec.bitrateKbps !== null) audioArgv.push("-b:a", `${spec.bitrateKbps}k`);
          audioArgv.push("-ar", "48000", "-ac", "2", resolvedOutputPath);
          return {
            plan: {
              input_path: body.input_path,
              output_path: resolvedOutputPath,
              profile: resolvedProfile,
              encoder: spec.codec,
              fps: { num: fpsNum, den: fpsDen },
              gop_frames: 0,
              pix_fmt: "none",
              faststart: false,
              delivery_preset: presetObj ? presetObj.id : null,
              video_crf: null,
              audio_bitrate_kbps: spec.bitrateKbps,
              encoder_preset: null,
              target_lufs: effectiveLufs,
              loudness_preset: fairlight.loudness_preset,
              dialogue_eq: fairlight.dialogue_eq,
              timecode_burnin: tcModeRaw,
              reel_slate_text: rawSlateText,
              reel_slate_position: rawSlatePos,
              review_watermark_text: rawWmText,
              review_watermark_opacity: rawWmOpacity,
              lower_third_enabled: false,
              lower_third_title: "",
              lower_third_subtitle: "",
              lower_third_position: "bottom_left",
              retime_enabled: retimeEnabled,
              retime_speed: retimeSpeed,
              retime_reverse: retimeReverse,
              retime_process: retimeProcess,
              retime_ramp_preset: retimeRampPreset,
              reframe_enabled: false,
              reframe_aspect_ratio: "source",
              reframe_pan_x: 0.0,
              reframe_pan_y: 0.0,
              film_grain_enabled: false,
              film_grain_preset: "35mm_fine",
              film_grain_strength: 12,
              film_grain_temporal: true,
              vignette_enabled: false,
              vignette_preset: "subtle_cinema",
              vignette_angle_deg: 24.0,
              vignette_mode: "forward",
              voice_cleanup_enabled: voiceCleanupEnabled && !isMutedDemo,
              voice_cleanup_preset: voiceCleanupPreset,
              voice_cleanup_highpass_hz: voiceCleanupHighpassHz,
              voice_cleanup_presence_db: voiceCleanupPresenceDb,
              voice_cleanup_de_ess: voiceCleanupDeEss,
              export_fps: rawExportFps,
              deinterlace,
              audio_only_format: rawAudioOnly,
              target_width: null,
              target_height: null,
              framing_mode: null,
              lut_path: null,
              video_filter: null,
              audio_filter: af,
              argv: audioArgv
            },
            shell_command: audioArgv.join(" "),
            result: null
          };
        }
        const fpsArg = fpsDen === 1 ? String(fpsNum) : `${fpsNum}/${fpsDen}`;
        const argv = [
          "ffmpeg",
          "-hide_banner",
          "-y",
          "-i",
          body.input_path,
          "-fps_mode",
          "cfr",
          "-r",
          fpsArg,
          "-c:v",
          encoder
        ];
        if (isProres) {
          argv.push("-profile:v", "3");
        } else if (isDnxhr) {
          argv.push("-profile:v", "dnxhr_hq");
        } else {
          argv.push("-preset", x26xPreset, "-crf", String(effectiveCrf));
        }
        argv.push("-pix_fmt", pixFmt, "-g", String(gop));
        if (vf) argv.push("-vf", vf);
        if (af) argv.push("-af", af);
        if (isMezzanine) {
          argv.push("-c:a", "pcm_s24le", "-ar", "48000");
        } else {
          argv.push("-c:a", "aac", "-b:a", `${effectiveAudioKbps}k`, "-ar", "48000", "-ac", "2");
        }
        if (!isMezzanine) argv.push("-movflags", "+faststart");
        argv.push(body.output_path);
        return {
          plan: {
            input_path: body.input_path,
            output_path: body.output_path,
            profile: resolvedProfile,
            encoder,
            fps: { num: fpsNum, den: fpsDen },
            gop_frames: gop,
            pix_fmt: pixFmt,
            faststart: !isMezzanine,
            delivery_preset: presetObj ? presetObj.id : null,
            video_crf: effectiveCrf,
            audio_bitrate_kbps: effectiveAudioKbps,
            encoder_preset: effectiveEncPreset,
            target_lufs: effectiveLufs,
            loudness_preset: fairlight.loudness_preset,
            dialogue_eq: fairlight.dialogue_eq,
            timecode_burnin: tcModeRaw,
            reel_slate_text: rawSlateText,
            reel_slate_position: rawSlatePos,
            review_watermark_text: rawWmText,
            review_watermark_opacity: rawWmOpacity,
            lower_third_enabled: Boolean(compiledLowerThird && compiledLowerThird.is_active),
            lower_third_title: compiledLowerThird ? compiledLowerThird.params.title.trim() : "",
            lower_third_subtitle: compiledLowerThird ? compiledLowerThird.params.subtitle.trim() : "",
            lower_third_position: compiledLowerThird ? compiledLowerThird.params.position : "bottom_left",
            retime_enabled: retimeEnabled,
            retime_speed: retimeSpeed,
            retime_reverse: retimeReverse,
            retime_process: retimeProcess,
            retime_ramp_preset: retimeRampPreset,
            reframe_enabled: reframeEnabled,
            reframe_aspect_ratio: reframeAspectRatio,
            reframe_pan_x: reframePanX,
            reframe_pan_y: reframePanY,
            film_grain_enabled: filmGrainEnabled,
            film_grain_preset: filmGrainPreset,
            film_grain_strength: filmGrainStrength,
            film_grain_temporal: filmGrainTemporal,
            vignette_enabled: vignetteEnabled,
            vignette_preset: vignettePreset,
            vignette_angle_deg: vignetteAngleDeg,
            vignette_mode: vignetteMode,
            voice_cleanup_enabled: voiceCleanupEnabled && !isMutedDemo,
            voice_cleanup_preset: voiceCleanupPreset,
            voice_cleanup_highpass_hz: voiceCleanupHighpassHz,
            voice_cleanup_presence_db: voiceCleanupPresenceDb,
            voice_cleanup_de_ess: voiceCleanupDeEss,
            export_fps: rawExportFps,
            deinterlace,
            audio_only_format: "off",
            target_width: targetWidth,
            target_height: targetHeight,
            framing_mode: framingMode,
            stabilizer_enabled: stabilizerEnabled,
            planar_tracker_enabled: planarTrackerEnabled,
            lut_path: body.lut_path || null,
            video_filter: vf,
            audio_filter: af,
            argv
          },
          shell_command: argv.join(" "),
          result: null
        };
      }
      return requestJson("/api/render/plan", { method: "POST", body });
    },
    async getRenderQueue() {
      if (resolvedMode === "static-demo") {
        return {
          jobs: demoRenderQueue.map((j) => structuredClone(j)),
          summary: getDemoQueueSummary()
        };
      }
      return requestJson("/api/render/queue");
    },
    async addRenderQueueJob(body) {
      if (resolvedMode === "static-demo") {
        if (demoRenderQueue.length >= 64) {
          throw new Error("Render queue limit reached (64 jobs max)");
        }
        const jobPayload =
          body && typeof body.job_payload === "object" && body.job_payload !== null
            ? body.job_payload
            : body || {};
        const compiled = await this.buildOrExecuteRender({ ...jobPayload, execute: false });
        const plan = compiled.plan;
        demoQueueCounter += 1;
        const jobId = `rq-${String(demoQueueCounter).padStart(3, "0")}`;
        const rawLabel = typeof body?.label === "string" ? body.label.trim() : "";
        const outBase = String(plan.output_path || "").split("/").pop() || jobId;
        const durS = Number.isFinite(Number(body?.duration_s)) && Number(body.duration_s) > 0 ? Number(body.duration_s) : 10.0;
        const est = estimateRenderFileSize({
          durationS: durS,
          codec: plan.profile,
          width: plan.target_width || 1920,
          height: plan.target_height || 1080,
          fps: plan.fps ? plan.fps.num / Math.max(1, plan.fps.den) : 25,
          crf: plan.video_crf,
          audioBitrateKbps: plan.audio_bitrate_kbps,
          audioOnlyFormat: plan.audio_only_format || "off"
        });
        const job = {
          job_id: jobId,
          label: rawLabel || outBase,
          status: "queued",
          enabled: true,
          payload: structuredClone(jobPayload),
          plan,
          estimated_bytes: Number.isInteger(body?.estimated_bytes) ? body.estimated_bytes : est.estimatedBytes,
          bytes_written: 0,
          elapsed_ms: 0,
          error: "",
          created_at_iso: new Date().toISOString().slice(0, 19) + "Z"
        };
        demoRenderQueue.push(job);
        return {
          job: structuredClone(job),
          jobs: demoRenderQueue.map((j) => structuredClone(j)),
          summary: getDemoQueueSummary()
        };
      }
      return requestJson("/api/render/queue/add", { method: "POST", body });
    },
    async renderQueueAction(body) {
      if (resolvedMode === "static-demo") {
        const action = String(body?.action || "").trim().toLowerCase();
        const jobId = String(body?.job_id || "").trim();
        const idx = jobId ? demoRenderQueue.findIndex((j) => j.job_id === jobId) : -1;
        let affected = null;
        if (action === "clear_completed") {
          for (let i = demoRenderQueue.length - 1; i >= 0; i -= 1) {
            if (demoRenderQueue[i].status === "completed") demoRenderQueue.splice(i, 1);
          }
        } else if (action === "clear_all") {
          demoRenderQueue.length = 0;
        } else {
          if (idx < 0) throw new Error(`Unknown render queue job_id '${jobId}'`);
          if (action === "move_up" && idx > 0) {
            const tmp = demoRenderQueue[idx - 1];
            demoRenderQueue[idx - 1] = demoRenderQueue[idx];
            demoRenderQueue[idx] = tmp;
          } else if (action === "move_down" && idx < demoRenderQueue.length - 1) {
            const tmp = demoRenderQueue[idx + 1];
            demoRenderQueue[idx + 1] = demoRenderQueue[idx];
            demoRenderQueue[idx] = tmp;
          } else if (action === "remove") {
            affected = demoRenderQueue.splice(idx, 1)[0];
          } else if (action === "enable") {
            demoRenderQueue[idx].enabled = true;
            if (demoRenderQueue[idx].status === "skipped") demoRenderQueue[idx].status = "queued";
            affected = demoRenderQueue[idx];
          } else if (action === "disable") {
            demoRenderQueue[idx].enabled = false;
            if (demoRenderQueue[idx].status === "queued") demoRenderQueue[idx].status = "skipped";
            affected = demoRenderQueue[idx];
          } else if (action === "requeue") {
            demoRenderQueue[idx].enabled = true;
            demoRenderQueue[idx].status = "queued";
            demoRenderQueue[idx].bytes_written = 0;
            demoRenderQueue[idx].elapsed_ms = 0;
            demoRenderQueue[idx].error = "";
            affected = demoRenderQueue[idx];
          } else if (action === "duplicate") {
            const src = demoRenderQueue[idx];
            const copyIdx = demoRenderQueue.filter((j) => j.label.startsWith(src.label)).length + 1;
            const newPayload = structuredClone(src.payload);
            const origOut = String(newPayload.output_path || src.plan.output_path || "renders/output.mp4");
            const dot = origOut.lastIndexOf(".");
            const newOut = dot > 0
              ? `${origOut.slice(0, dot)}_copy${copyIdx}${origOut.slice(dot)}`
              : `${origOut}_copy${copyIdx}.mp4`;
            newPayload.output_path = newOut;
            const res = await this.addRenderQueueJob({
              label: `${src.label} (Copy)`,
              job_payload: newPayload,
              estimated_bytes: src.estimated_bytes
            });
            affected = res.job;
          } else if (action !== "move_up" && action !== "move_down") {
            throw new Error(`Unsupported render queue action '${action}'`);
          }
        }
        return {
          job: affected ? structuredClone(affected) : null,
          jobs: demoRenderQueue.map((j) => structuredClone(j)),
          summary: getDemoQueueSummary()
        };
      }
      return requestJson("/api/render/queue/action", { method: "POST", body });
    },
    async runRenderQueue(body) {
      if (resolvedMode === "static-demo") {
        const dryRun = Boolean(body?.dry_run);
        if (!dryRun) {
          throw new Error("FFmpeg execution requires running `taktcut ui` locally on your machine.");
        }
        for (const j of demoRenderQueue) {
          if (j.enabled && j.status === "queued") {
            j.status = "completed";
            j.elapsed_ms = 12;
            j.bytes_written = 0;
            j.error = "";
          }
        }
        return {
          dry_run: true,
          jobs: demoRenderQueue.map((j) => structuredClone(j)),
          summary: getDemoQueueSummary()
        };
      }
      return requestJson("/api/render/queue/run", { method: "POST", body });
    },
    async generateSampleClip() {
      if (resolvedMode === "static-demo") {
        return { path: ".taktcut-samples/sample_rec709.mp4", bytes_written: 306966 };
      }
      return requestJson("/api/sample/generate-clip", { method: "POST", body: {} });
    },
    async verifyQa(body) {
      if (resolvedMode === "static-demo") {
        const tgt = Number(body.target_lufs ?? -14.0);
        const tol = Number(body.tolerance_lu ?? 1.5);
        const maxTp = Number(body.max_true_peak_dbtp ?? -1.0);
        return {
          report: {
            path: body.path,
            passed: true,
            failures: [],
            probe: {
              format_name: "mov,mp4,m4a,3gp,3g2,mj2",
              video_codec: "h264",
              width: 640,
              height: 360,
              pix_fmt: "yuv420p",
              r_frame_rate: "25/1",
              avg_frame_rate: "25/1",
              is_cfr: true,
              video_duration_s: 2.0,
              duration_delta_s: 0.004,
              color_space: "bt709",
              color_primaries: "bt709",
              color_transfer: "bt709",
              audio_codec: "aac",
              audio_sample_rate: 48000,
              audio_channels: 2,
              has_faststart: true
            },
            loudness: {
              integrated_lufs: tgt,
              target_lufs: tgt,
              tolerance_lu: tol,
              lra_lu: 0.0,
              true_peak_dbtp: -13.7,
              max_true_peak_dbtp: maxTp,
              passed: true
            },
            frame_samples: [
              { timestamp_s: 0.0, y_avg: 125.6, y_min: 16, y_max: 226 },
              { timestamp_s: 1.0, y_avg: 126.0, y_min: 21, y_max: 221 },
              { timestamp_s: 1.9, y_avg: 125.8, y_min: 15, y_max: 228 }
            ]
          }
        };
      }
      return requestJson("/api/qa/verify", { method: "POST", body });
    },
    async checkForUpdate() {
      if (resolvedMode === "static-demo") {
        return {
          current_version: "0.1.27",
          latest_version: "0.1.27",
          update_available: false,
          can_apply_ota: false,
          error: null
        };
      }
      return requestJson("/api/update/check");
    },
    async compileAudioFilter(payload) {
      if (resolvedMode === "static-demo") {
        return compileAudioFilterClient(
          payload.audio_params || payload,
          payload.clip_duration_s ?? null,
          payload.target_lufs ?? null,
          payload.fairlight || {
            loudness_preset: payload.loudness_preset || "off",
            dialogue_eq: payload.dialogue_eq || "off"
          }
        );
      }
      return requestJson("/api/audio/compile", { method: "POST", body: payload });
    },
    async compileFadeFilter(payload) {
      if (resolvedMode === "static-demo") {
        const src = payload.video_fade || payload;
        const vf = compileVideoFadeFilterClient(src, payload.clip_duration_s ?? null);
        const af = compileAudioFilterClient(
          {
            gain_db: 0,
            fade_in_s: vf.params.fade_in_s,
            fade_out_s: vf.params.fade_out_s,
            muted: Boolean(payload.muted)
          },
          payload.clip_duration_s ?? null,
          null
        );
        return {
          video_filtergraph: vf.filtergraph,
          audio_filtergraph: payload.muted ? "" : af.filtergraph,
          ffmpeg_vf_args: vf.ffmpeg_vf_args,
          ffmpeg_af_args: payload.muted ? [] : af.ffmpeg_af_args,
          is_identity: vf.is_identity && (Boolean(payload.muted) || af.is_identity),
          params: vf.params
        };
      }
      return requestJson("/api/fade/compile", { method: "POST", body: payload });
    },
    async compileAutoDuckFilter(payload) {
      if (resolvedMode === "static-demo") {
        return compileAutoDuckFilterClient(payload.auto_duck || payload, payload);
      }
      return requestJson("/api/audio/duck/compile", { method: "POST", body: payload });
    },
    async compileFairlightMixer(payload) {
      if (resolvedMode === "static-demo") {
        return compileFairlightMixerClient(
          payload.channel || payload,
          payload.master || null,
          payload.voice_cleanup || null
        );
      }
      return requestJson("/api/fairlight/mixer/compile", { method: "POST", body: payload });
    },
    async compileFairlightAudioRack(payload) {
      if (resolvedMode === "static-demo") {
        return compileFairlightAudioRackClient(
          payload && payload.fairlight_rack ? payload.fairlight_rack : payload
        );
      }
      return requestJson("/api/fairlight/rack/compile", { method: "POST", body: payload });
    },
    async analyzeFairlightSpectrum(payload) {
      if (resolvedMode === "static-demo") {
        const doc = (payload && payload.document) || buildDemoTimeline("clean");
        return analyzeAudioSpectrumClient(
          doc,
          payload && Number.isFinite(Number(payload.playhead_frame)) ? Number(payload.playhead_frame) : 0,
          {
            fairlight_rack: payload && payload.fairlight_rack ? payload.fairlight_rack : null,
            master_gain_db: payload && payload.master_gain_db !== undefined ? payload.master_gain_db : 0,
            peak_hold_prev: payload && payload.peak_hold_prev ? payload.peak_hold_prev : null
          }
        );
      }
      return requestJson("/api/fairlight/analyzer/spectrum", { method: "POST", body: payload });
    },
    async detectFairlightTransients(payload) {
      if (resolvedMode === "static-demo") {
        const doc = (payload && payload.document) || buildDemoTimeline("clean");
        const cfg = (payload && payload.config) || payload || {};
        return detectAudioTransientsClient(doc, cfg, {
          fairlight_rack: payload && payload.fairlight_rack ? payload.fairlight_rack : null
        });
      }
      return requestJson("/api/fairlight/transients/detect", { method: "POST", body: payload });
    },
    async compileRetimeFilter(payload) {
      if (resolvedMode === "static-demo") {
        if (
          payload &&
          (payload.retime ||
            Object.prototype.hasOwnProperty.call(payload, "enabled") ||
            Object.prototype.hasOwnProperty.call(payload, "speed"))
        ) {
          return compileDeliverRetimeClient(payload.retime || payload);
        }
        return compileRetimeFilterClient(payload.retime_params || payload);
      }
      return requestJson("/api/retime/compile", { method: "POST", body: payload });
    },
    async getTransformPresets() {
      if (resolvedMode === "static-demo") {
        return {
          presets: TRANSFORM_PRESETS,
          bounds: {
            crop_pct: { min: TRANSFORM_CROP_MIN, max: TRANSFORM_CROP_MAX, sum_max: TRANSFORM_CROP_SUM_MAX },
            border_width_px: { min: TRANSFORM_BORDER_WIDTH_MIN, max: TRANSFORM_BORDER_WIDTH_MAX },
            border_feather_px: { min: TRANSFORM_BORDER_FEATHER_MIN, max: TRANSFORM_BORDER_FEATHER_MAX },
            shadow_opacity_pct: { min: TRANSFORM_SHADOW_OPACITY_MIN, max: TRANSFORM_SHADOW_OPACITY_MAX },
            shadow_blur_px: { min: TRANSFORM_SHADOW_BLUR_MIN, max: TRANSFORM_SHADOW_BLUR_MAX },
            shadow_offset_px: { min: TRANSFORM_SHADOW_OFFSET_MIN, max: TRANSFORM_SHADOW_OFFSET_MAX }
          }
        };
      }
      return requestJson("/api/transform/presets");
    },
    async compileTransformFilter(payload) {
      if (resolvedMode === "static-demo") {
        return compileTransformFilterClient(
          payload.transform_params || payload,
          payload.pix_fmt || null,
          payload.clip_duration_s || null
        );
      }
      return requestJson("/api/transform/compile", { method: "POST", body: payload });
    },
    async getFramingPresets() {
      if (resolvedMode === "static-demo") {
        return {
          presets: ASPECT_RATIO_PRESETS,
          modes: ["fill", "fit"],
          bounds: { pan_x: { min: -1, max: 1 }, pan_y: { min: -1, max: 1 } }
        };
      }
      return requestJson("/api/framing/presets");
    },
    async compileFramingFilter(payload) {
      if (resolvedMode === "static-demo") {
        return compileFramingFilterClient(payload.framing || payload);
      }
      return requestJson("/api/framing/compile", { method: "POST", body: payload });
    },
    async compileReframeFilter(payload) {
      if (resolvedMode === "static-demo") {
        return compileReframeClient(payload);
      }
      return requestJson("/api/reframe/compile", { method: "POST", body: payload });
    },
    async compileFilmGrainFilter(payload) {
      if (resolvedMode === "static-demo") {
        return compileFilmGrainClient(payload);
      }
      return requestJson("/api/film-grain/compile", { method: "POST", body: payload });
    },
    async compileVignetteFilter(payload) {
      if (resolvedMode === "static-demo") {
        return compileVignetteClient(payload);
      }
      return requestJson("/api/vignette/compile", { method: "POST", body: payload });
    },
    async compileVoiceCleanupFilter(payload) {
      if (resolvedMode === "static-demo") {
        return compileVoiceCleanupClient(payload);
      }
      return requestJson("/api/voice-cleanup/compile", { method: "POST", body: payload });
    },
    async getColorPresets() {
      if (resolvedMode === "static-demo") {
        return {
          presets: [],
          curve_presets: Object.values(COLOR_CURVE_PRESETS),
          hsl_curve_presets: Object.values(HSL_CURVE_PRESETS),
          warper_presets: COLOR_WARPER_PRESETS_CLIENT,
          qualifier_presets: Object.values(QUALIFIER_PRESETS),
          bounds: {
            color_warper: {
              hue_count: COLOR_WARPER_HUE_COUNT,
              sat_rings: COLOR_WARPER_SAT_RINGS,
              hue_offset_min: COLOR_WARPER_BOUNDS.hue_offset.min,
              hue_offset_max: COLOR_WARPER_BOUNDS.hue_offset.max,
              sat_offset_min: COLOR_WARPER_BOUNDS.sat_offset.min,
              sat_offset_max: COLOR_WARPER_BOUNDS.sat_offset.max
            }
          }
        };
      }
      return requestJson("/api/color/presets");
    },
    async compileColorGrade(payload) {
      if (resolvedMode === "static-demo") {
        return compileColorClient(payload, payload);
      }
      return requestJson("/api/color/compile", { method: "POST", body: payload });
    },
    async getFxPresets() {
      if (resolvedMode === "static-demo") {
        return {
          presets: [],
          specs: {},
          chroma_key_presets: CHROMA_KEY_PRESETS_DEMO,
          stabilizer_presets: Object.values(STABILIZER_PRESETS_CLIENT),
          planar_tracker_presets: Object.values(PLANAR_TRACKER_PRESETS_CLIENT)
        };
      }
      return requestJson("/api/fx/presets");
    },
    async compileFx(payload) {
      if (resolvedMode === "static-demo") {
        return compileFxClient(payload.nodes || [], payload);
      }
      return requestJson("/api/fx/compile", { method: "POST", body: payload });
    },
    async compileStabilizer(payload) {
      if (resolvedMode === "static-demo") {
        return compileStabilizerFilterClient(payload.stabilizer || payload, payload);
      }
      return requestJson("/api/fx/stabilize/compile", { method: "POST", body: payload });
    },
    async compilePlanarTracker(payload) {
      if (resolvedMode === "static-demo") {
        return compilePlanarTrackerFilterClient(payload.planar_tracker || payload, payload);
      }
      return requestJson("/api/fx/tracker/compile", { method: "POST", body: payload });
    },
    async getChromaKeyPresets() {
      if (resolvedMode === "static-demo") {
        return {
          presets: CHROMA_KEY_PRESETS_DEMO,
          despill_types: ["green", "blue"],
          bounds: {
            similarity: { min: 0.01, max: 0.8, default: 0.18 },
            blend: { min: 0.0, max: 0.5, default: 0.08 }
          }
        };
      }
      return requestJson("/api/fx/chroma-key/presets");
    },
    async compileChromaKey(payload) {
      if (resolvedMode === "static-demo") {
        return compileChromaKeyClient(payload, payload);
      }
      return requestJson("/api/fx/chroma-key/compile", { method: "POST", body: payload });
    },
    async getTitlePresets() {
      if (resolvedMode === "static-demo") {
        return { presets: [], positions: ["bottom-left", "center", "bottom-center"], bounds: {} };
      }
      return requestJson("/api/titles/presets");
    },
    async compileTitle(payload) {
      if (resolvedMode === "static-demo") {
        return compileTitleClient(payload, payload);
      }
      return requestJson("/api/titles/compile", { method: "POST", body: payload });
    },
    async compileLowerThird(payload) {
      if (resolvedMode === "static-demo") {
        return compileLowerThirdClient(payload);
      }
      return requestJson("/api/lower-third/compile", { method: "POST", body: payload });
    },
    async getSubtitleStyles() {
      if (resolvedMode === "static-demo") {
        return {
          styles: CAPTION_STYLE_SPECS,
          pro_styles: ALL_CAPTION_STYLE_SPECS,
          style_ids: CAPTION_STYLE_SPECS.map((s) => s.id),
          all_style_ids: ALL_CAPTION_STYLE_SPECS.map((s) => s.id),
          karaoke_modes: ["off", "color_pop", "pill_box", "progressive_fill"],
          safe_margin_presets: SAFE_MARGIN_PRESETS_CLIENT,
          bounds: { max_cues: 500, max_text_len: 300, font_size: { min: 14, max: 72, default: 34 } }
        };
      }
      return requestJson("/api/subtitles/styles");
    },
    async parseSubtitles(payload) {
      if (resolvedMode === "static-demo") {
        const content = String(payload.content || "");
        const rawFmt = payload.format || "auto";
        let fmt = rawFmt;
        if (fmt === "auto") {
          const head = content.trimStart();
          if (head.startsWith("WEBVTT")) fmt = "vtt";
          else if (head.includes("[Script Info]") || head.includes("[Events]") || head.startsWith("Dialogue:")) fmt = "ass";
          else fmt = "srt";
        }
        let cues = fmt === "vtt" ? parseVttClient(content) : fmt === "ass" ? parseAssClient(content) : parseSrtClient(content);
        if (payload.auto_chunk_words && Number(payload.auto_chunk_words) > 0) {
          cues = autoChunkCuesClient(cues, Number(payload.auto_chunk_words));
        } else {
          cues = cues.map((c) => ({ ...c, words: c.words && c.words.length ? c.words : computeCueWordTimingsClient(c) }));
        }
        return { format: fmt, cue_count: cues.length, cues };
      }
      return requestJson("/api/subtitles/parse", { method: "POST", body: payload });
    },
    async chunkSubtitles(payload) {
      if (resolvedMode === "static-demo") {
        const cues = autoChunkCuesClient(payload.cues || [], payload.max_words_per_cue || 4, Boolean(payload.uppercase));
        const word_count = cues.reduce((acc, c) => acc + (c.words ? c.words.length : 0), 0);
        return { cue_count: cues.length, word_count, cues };
      }
      return requestJson("/api/subtitles/chunk", { method: "POST", body: payload });
    },
    async exportSubtitles(payload) {
      if (resolvedMode === "static-demo") {
        const fmt = payload.format === "vtt" ? "vtt" : payload.format === "ass" ? "ass" : "srt";
        const cues = Array.isArray(payload.cues) ? payload.cues : [];
        let content;
        if (fmt === "ass") {
          content = exportAssClient(payload.subtitle_track ? payload.subtitle_track : payload);
        } else {
          const sep = fmt === "vtt" ? "." : ",";
          const blocks = cues.map((c, idx) => `${idx + 1}\n${formatTsClient(c.start_s, sep)} --> ${formatTsClient(c.end_s, sep)}\n${sanitizeCaptionTextClient(c.text)}`);
          content = fmt === "vtt" ? `WEBVTT\n\n${blocks.join("\n\n")}\n` : (blocks.length ? `${blocks.join("\n\n")}\n` : "");
        }
        return { format: fmt, filename: `captions.${fmt}`, content, cue_count: cues.length, saved_path: null };
      }
      return requestJson("/api/subtitles/export", { method: "POST", body: payload });
    },
    async compileSubtitles(payload) {
      if (resolvedMode === "static-demo") {
        return compileSubtitlesClient(payload, payload);
      }
      return requestJson("/api/subtitles/compile", { method: "POST", body: payload });
    },
    async getTransitionPresets() {
      if (resolvedMode === "static-demo") {
        return {
          presets: TRANSITION_PRESETS.map((p) => ({
            id: p.id,
            name: p.name,
            ffmpeg_xfade: p.id,
            default_duration_s: 0.5
          })),
          bounds: { duration_s: { min: 0.1, max: 2.0, default: 0.5 } }
        };
      }
      return requestJson("/api/transitions/presets");
    },
    async compileTransitionFilter(payload) {
      if (resolvedMode === "static-demo") {
        return compileTransitionFilterClient(
          payload.transition || payload,
          payload.clip_a_duration_s ?? 5.0,
          payload.clip_b_duration_s ?? null
        );
      }
      return requestJson("/api/transitions/compile", { method: "POST", body: payload });
    },
    async probeRemoteNode(payload) {
      if (resolvedMode === "static-demo") {
        throw new Error("Remote Render Node requires the local studio server.");
      }
      return requestJson("/api/remote/probe", { method: "POST", body: payload });
    },
    async submitRemoteJob(payload) {
      if (resolvedMode === "static-demo") {
        throw new Error("Remote Render Node requires the local studio server.");
      }
      return requestJson("/api/remote/jobs", { method: "POST", body: payload });
    },
    async getRemoteJob(jobId) {
      if (resolvedMode === "static-demo") {
        throw new Error("Remote Render Node requires the local studio server.");
      }
      return requestJson(`/api/remote/jobs/${encodeURIComponent(jobId)}`);
    },
    async exportProject(payload) {
      if (resolvedMode === "static-demo") {
        const rawProj = payload && payload.project ? payload.project : payload || {};
        if (!rawProj || typeof rawProj !== "object" || rawProj.schema_version !== "taktcut.project.v1") {
          throw new Error("Unsupported or missing project schema_version; expected 'taktcut.project.v1'");
        }
        if (!rawProj.timeline || typeof rawProj.timeline !== "object") {
          throw new Error("Project timeline is required");
        }
        const project = {
          ...rawProj,
          app_version: rawProj.app_version || "0.1.27",
          saved_at: rawProj.saved_at || new Date().toISOString().replace(/\.\d{3}Z$/, "Z")
        };
        const projectJson = JSON.stringify(project, null, 2) + "\n";
        const stem = String(project.project_name || "project").replace(/[^A-Za-z0-9._-]/g, "_").replace(/^[._-]+|[._-]+$/g, "") || "project";
        return {
          schema_version: "taktcut.project.v1",
          filename: `${stem}.taktcut.json`,
          project,
          project_json: projectJson,
          bytes_written: projectJson.length,
          saved_path: null
        };
      }
      return requestJson("/api/project/export", { method: "POST", body: payload });
    },
    async importProject(payload) {
      if (resolvedMode === "static-demo") {
        let proj = null;
        if (payload && typeof payload.project_json === "string") {
          try {
            proj = JSON.parse(payload.project_json);
          } catch (err) {
            throw new Error(`Malformed project JSON: ${err.message}`);
          }
        } else if (payload && payload.project && typeof payload.project === "object") {
          proj = payload.project;
        } else {
          throw new Error("Provide 'project_json' or 'project' payload");
        }
        if (!proj || typeof proj !== "object" || Array.isArray(proj)) {
          throw new Error("Project JSON root must be an object");
        }
        if (proj.schema_version !== "taktcut.project.v1") {
          throw new Error(`Unsupported or missing project schema_version: ${proj.schema_version}`);
        }
        if (!proj.timeline || typeof proj.timeline !== "object") {
          throw new Error("Project timeline is required");
        }
        return {
          schema_version: "taktcut.project.v1",
          project: proj,
          validation: validateTimelineClient(proj.timeline)
        };
      }
      return requestJson("/api/project/import", { method: "POST", body: payload });
    },
    async applyUpdate() {
      if (resolvedMode === "static-demo") {
        return {
          applied: false,
          restarting: false,
          message: "OTA updates are available in desktop binary builds.",
          error: "static_demo"
        };
      }
      return requestJson("/api/update/apply", { method: "POST", body: {} });
    },
    async editTimeline(payload) {
      if (resolvedMode === "static-demo") {
        const doc = payload && payload.document ? payload.document : null;
        if (!doc) throw new Error("Timeline document is required.");
        const op = String((payload && payload.op) || "").trim().toLowerCase();
        const tkKind = payload && payload.track_kind === "audio" ? "audio" : "video";
        const tkIdx = Number.isInteger(payload && payload.track_index) ? payload.track_index : 1;
        const cIdx = Number.isInteger(payload && payload.clip_index) ? payload.clip_index : 0;
        const edge = payload && payload.edge === "left" ? "left" : "right";
        const delta = Math.round(Number((payload && payload.delta_frames) || 0));
        const respectAvLink = Boolean(payload && payload.respect_av_link);
        const targetKind = payload && payload.target_kind === "video" ? "video" : "audio";
        let res;
        if (op === "ripple_trim") {
          res = rippleTrimClipInDocument(doc, tkKind, tkIdx, cIdx, edge, delta, { respectAvLink });
        } else if (op === "roll") {
          res = rollEditCutInDocument(doc, tkKind, tkIdx, cIdx, delta);
        } else if (op === "slip") {
          res = slipClipInDocument(doc, tkKind, tkIdx, cIdx, delta);
        } else if (op === "slide") {
          res = slideClipInDocument(doc, tkKind, tkIdx, cIdx, delta);
        } else if (op === "ripple_delete") {
          res = rippleDeleteClipInDocument(doc, tkKind, tkIdx, cIdx, { respectAvLink });
        } else if (op === "toggle_sync_lock") {
          res = toggleTrackSyncLockInDocument(doc, tkKind, tkIdx);
        } else if (op === "set_all_sync_lock") {
          res = setAllTracksSyncLockInDocument(doc, Boolean(payload && payload.enabled));
        } else if (op === "link_av") {
          res = linkAvClipsInDocument(doc, tkKind, tkIdx, cIdx, payload || {});
        } else if (op === "unlink_av") {
          res = unlinkAvClipsInDocument(doc, tkKind, tkIdx, cIdx);
        } else if (op === "split_edit_jl") {
          res = applySplitEditJlInDocument(doc, tkKind, tkIdx, cIdx, {
            edge,
            delta_frames: delta,
            target_kind: targetKind
          });
        } else if (op === "align_av_split") {
          res = alignAvSplitInDocument(doc, tkKind, tkIdx, cIdx);
        } else {
          throw new Error(`Unsupported timeline edit op: ${op}`);
        }
        const nextDoc = res.doc || doc;
        return {
          changed: Boolean(res.changed),
          op,
          delta_applied: res.deltaApplied !== undefined ? res.deltaApplied : 0,
          shifted_count: res.shiftedCount !== undefined ? res.shiftedCount : 0,
          sync_locked_tracks: countSyncLockedTracks(nextDoc),
          detail: res.detail || "",
          split_info: computeAvSplitEditInfo(nextDoc, tkKind, tkIdx, cIdx),
          split_compile: compileSplitEditFiltergraphClient(nextDoc, tkKind, tkIdx, cIdx),
          document: nextDoc,
          validation: validateTimelineClient(nextDoc)
        };
      }
      return requestJson("/api/timeline/edit", { method: "POST", body: payload });
    },
    async compileSplitEdit(payload) {
      if (resolvedMode === "static-demo") {
        const doc = payload && payload.document ? payload.document : null;
        if (!doc) throw new Error("Timeline document is required.");
        const tkKind = payload && payload.track_kind === "audio" ? "audio" : "video";
        const tkIdx = Number.isInteger(payload && payload.track_index) ? payload.track_index : 1;
        const cIdx = Number.isInteger(payload && payload.clip_index) ? payload.clip_index : 0;
        return {
          split_info: computeAvSplitEditInfo(doc, tkKind, tkIdx, cIdx),
          compile: compileSplitEditFiltergraphClient(doc, tkKind, tkIdx, cIdx)
        };
      }
      return requestJson("/api/timeline/split-edit/compile", { method: "POST", body: payload });
    },
    async compoundTimeline(payload) {
      if (resolvedMode === "static-demo") {
        const doc = payload && payload.document ? payload.document : null;
        if (!doc) throw new Error("Timeline document is required.");
        const op = String((payload && payload.op) || "").trim().toLowerCase();
        const tkKind = payload && payload.track_kind === "audio" ? "audio" : "video";
        const tkIdx = Number.isInteger(payload && payload.track_index) ? payload.track_index : 1;
        const cIdx = Number.isInteger(payload && payload.clip_index) ? payload.clip_index : 0;

        if (op === "compile") {
          const trk = (doc.tracks || []).find((t) => t.kind === tkKind && t.index === tkIdx);
          const clip = trk && Array.isArray(trk.clips) ? trk.clips[cIdx] : null;
          if (!clip || !clip.compound_subsequence) {
            throw new Error("Selected clip is not a Compound Clip");
          }
          return {
            op: "compile",
            compile: compileCompoundFiltergraphClient(clip.compound_subsequence, {
              speed_rate: clip.speed_rate,
              master_gain_db: clip.audio_gain_db
            })
          };
        }

        let res;
        if (op === "create") {
          res = createCompoundClipInDocument(doc, {
            target_clips: payload && payload.target_clips,
            in_frame: payload && payload.in_frame,
            out_frame: payload && payload.out_frame,
            name: payload && payload.name,
            include_audio: payload && payload.include_audio,
            precomp_blend_mode: payload && payload.precomp_blend_mode,
            collapse_transforms: payload && payload.collapse_transforms,
            color_tag: payload && payload.color_tag
          });
        } else if (op === "decompose") {
          res = decomposeCompoundClipInDocument(doc, tkKind, tkIdx, cIdx);
        } else if (op === "update") {
          res = updateCompoundSubsequenceInDocument(
            doc,
            tkKind,
            tkIdx,
            cIdx,
            payload && payload.sub_document,
            {
              precomp_blend_mode: payload && payload.precomp_blend_mode,
              collapse_transforms: payload && payload.collapse_transforms,
              color_tag: payload && payload.color_tag,
              name: payload && payload.name
            }
          );
        } else if (op === "flatten_all") {
          res = flattenAllCompoundsInDocument(doc);
        } else {
          throw new Error(`Unsupported compound op: ${op}`);
        }
        const nextDoc = res.doc || doc;
        return {
          changed: Boolean(res.changed),
          op: res.op,
          compound_id: res.compound_id || "",
          track_kind: res.track_kind || tkKind,
          track_index: res.track_index || tkIdx,
          clip_index: res.clip_index !== undefined ? res.clip_index : cIdx,
          nested_clip_count: res.nested_clip_count || 0,
          nested_track_count: res.nested_track_count || 0,
          max_depth: res.max_depth || 0,
          detail: res.detail || "",
          document: nextDoc,
          validation: validateTimelineClient(nextDoc)
        };
      }
      return requestJson("/api/timeline/compound", { method: "POST", body: payload });
    },
    async multicamTimeline(payload) {
      if (resolvedMode === "static-demo") {
        const doc = payload && payload.document ? payload.document : null;
        if (!doc) throw new Error("Timeline document is required.");
        const op = String((payload && payload.op) || "").trim().toLowerCase();
        const tkKind = payload && payload.track_kind === "audio" ? "audio" : "video";
        const tkIdx = Number.isInteger(payload && payload.track_index) ? payload.track_index : 1;
        const cIdx = Number.isInteger(payload && payload.clip_index) ? payload.clip_index : 0;

        if (op === "compile") {
          const trk = (doc.tracks || []).find((t) => t.kind === tkKind && t.index === tkIdx);
          const clip = trk && Array.isArray(trk.clips) ? trk.clips[cIdx] : null;
          if (!clip || !clip.multicam_bank) {
            throw new Error("Selected clip is not a Multi-Cam Sync Bank");
          }
          return {
            op: "compile",
            compile: compileMulticamFiltergraphClient(clip.multicam_bank, {
              mode: payload && payload.mode === "quad_view" ? "quad_view" : "active_cuts"
            })
          };
        }

        let res;
        if (op === "create") {
          res = createMulticamClipInDocument(doc, {
            track_kind: tkKind,
            track_index: tkIdx,
            clip_index: cIdx,
            name: payload && payload.name,
            sync_mode: payload && payload.sync_mode,
            angles: payload && payload.angles
          });
        } else if (op === "sync") {
          res = syncMulticamClipInDocument(doc, tkKind, tkIdx, cIdx, payload && payload.sync_mode);
        } else if (op === "switch_angle") {
          res = switchMulticamAngleInDocument(
            doc,
            tkKind,
            tkIdx,
            cIdx,
            payload && payload.frame !== undefined ? payload.frame : 0,
            payload && payload.angle_index !== undefined ? payload.angle_index : 1,
            payload && payload.cut_mode ? payload.cut_mode : "video_only"
          );
        } else if (op === "delete_cut") {
          res = deleteMulticamCutInDocument(
            doc,
            tkKind,
            tkIdx,
            cIdx,
            payload && payload.local_frame !== undefined ? payload.local_frame : 0
          );
        } else if (op === "update_angle") {
          res = updateMulticamAngleInDocument(doc, tkKind, tkIdx, cIdx, payload || {});
        } else if (op === "flatten") {
          res = flattenMulticamClipInDocument(doc, tkKind, tkIdx, cIdx);
        } else {
          throw new Error(`Unsupported multicam op: ${op}`);
        }
        const nextDoc = res.doc || doc;
        return {
          changed: Boolean(res.changed),
          op: res.op,
          multicam_id: res.multicam_id || "",
          track_kind: res.track_kind || tkKind,
          track_index: res.track_index || tkIdx,
          clip_index: res.clip_index !== undefined ? res.clip_index : cIdx,
          angle_count: res.angle_count || 0,
          cut_count: res.cut_count || 0,
          active_angle: res.active_angle || 1,
          detail: res.detail || "",
          multicam_count: countMulticamClipsInDocument(nextDoc),
          document: nextDoc,
          validation: validateTimelineClient(nextDoc)
        };
      }
      return requestJson("/api/timeline/multicam", { method: "POST", body: payload });
    }
  };
}
