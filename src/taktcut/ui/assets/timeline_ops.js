export const SNAP_THRESHOLD_PX = 10;
export const AUDIO_GAIN_DB_MIN = -24;
export const AUDIO_GAIN_DB_MAX = 12;
export const TRACK_VOLUME_DB_MIN = -48.0;
export const TRACK_VOLUME_DB_MAX = 12.0;
export const TRACK_PAN_MIN = -1.0;
export const TRACK_PAN_MAX = 1.0;
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
export const MAX_RETIME_RAMP_POINTS = 12;
export const ALLOWED_RETIME_PROCESS_MODES = ["nearest", "frame_blend", "optical_flow"];
export const ALLOWED_RETIME_RAMP_PRESETS = [
  "constant",
  "hero_slowmo",
  "ramp_up",
  "ramp_down",
  "bullet_pulse",
  "custom"
];
export const RETIME_RAMP_PRESET_POINTS = Object.freeze({
  constant: [],
  hero_slowmo: [
    { pos_norm: 0.0, speed_rate: 1.5 },
    { pos_norm: 0.3, speed_rate: 0.35 },
    { pos_norm: 0.7, speed_rate: 0.35 },
    { pos_norm: 1.0, speed_rate: 1.5 }
  ],
  ramp_up: [
    { pos_norm: 0.0, speed_rate: 0.5 },
    { pos_norm: 0.65, speed_rate: 1.0 },
    { pos_norm: 1.0, speed_rate: 3.0 }
  ],
  ramp_down: [
    { pos_norm: 0.0, speed_rate: 3.0 },
    { pos_norm: 0.35, speed_rate: 1.0 },
    { pos_norm: 1.0, speed_rate: 0.4 }
  ],
  bullet_pulse: [
    { pos_norm: 0.0, speed_rate: 1.0 },
    { pos_norm: 0.25, speed_rate: 3.5 },
    { pos_norm: 0.55, speed_rate: 0.4 },
    { pos_norm: 0.8, speed_rate: 3.0 },
    { pos_norm: 1.0, speed_rate: 1.0 }
  ],
  custom: []
});
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
export const TRANSFORM_CROP_MIN = 0.0;
export const TRANSFORM_CROP_MAX = 45.0;
export const TRANSFORM_CROP_SUM_MAX = 85.0;
export const TRANSFORM_CROP_DEFAULT = 0.0;
export const TRANSFORM_BORDER_WIDTH_MIN = 0.0;
export const TRANSFORM_BORDER_WIDTH_MAX = 32.0;
export const TRANSFORM_BORDER_WIDTH_DEFAULT = 0.0;
export const TRANSFORM_BORDER_COLOR_DEFAULT = "#ffffff";
export const TRANSFORM_BORDER_FEATHER_MIN = 0.0;
export const TRANSFORM_BORDER_FEATHER_MAX = 40.0;
export const TRANSFORM_BORDER_FEATHER_DEFAULT = 0.0;
export const TRANSFORM_SHADOW_OPACITY_MIN = 0.0;
export const TRANSFORM_SHADOW_OPACITY_MAX = 100.0;
export const TRANSFORM_SHADOW_OPACITY_DEFAULT = 0.0;
export const TRANSFORM_SHADOW_BLUR_MIN = 0.0;
export const TRANSFORM_SHADOW_BLUR_MAX = 40.0;
export const TRANSFORM_SHADOW_BLUR_DEFAULT = 12.0;
export const TRANSFORM_SHADOW_OFFSET_MIN = -48.0;
export const TRANSFORM_SHADOW_OFFSET_MAX = 48.0;
export const TRANSFORM_SHADOW_OFFSET_X_DEFAULT = 10.0;
export const TRANSFORM_SHADOW_OFFSET_Y_DEFAULT = 12.0;
export const TRANSFORM_SHADOW_COLOR_DEFAULT = "#000000";
const TRANSFORM_HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function normalizeTransformHexColor(raw, fallback = "#ffffff") {
  if (typeof raw !== "string") return fallback;
  const cleaned = raw.trim().toLowerCase();
  return TRANSFORM_HEX_COLOR_RE.test(cleaned) ? cleaned : fallback;
}
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

export const TRANSFORM_KEYFRAME_PARAMS = Object.freeze([
  "zoom_pct",
  "pos_x_pct",
  "pos_y_pct",
  "rotation_deg",
  "opacity_pct"
]);

export const TRANSFORM_PARAM_BOUNDS = Object.freeze({
  zoom_pct: Object.freeze({ min: 10, max: 300, def: 100, label: "Zoom", unit: "%" }),
  pos_x_pct: Object.freeze({ min: -100, max: 100, def: 0, label: "Pos X", unit: "%" }),
  pos_y_pct: Object.freeze({ min: -100, max: 100, def: 0, label: "Pos Y", unit: "%" }),
  rotation_deg: Object.freeze({ min: -180, max: 180, def: 0, label: "Rot", unit: "deg" }),
  opacity_pct: Object.freeze({ min: 0, max: 100, def: 100, label: "Opacity", unit: "%" })
});

export const TRANSFORM_EASINGS = Object.freeze([
  "linear",
  "ease_in",
  "ease_out",
  "ease_in_out",
  "bezier"
]);

export const TRANSFORM_BEZIER_PRESETS = Object.freeze({
  linear: Object.freeze([0.0, 0.0, 1.0, 1.0]),
  ease_in: Object.freeze([0.42, 0.0, 1.0, 1.0]),
  ease_out: Object.freeze([0.0, 0.0, 0.58, 1.0]),
  ease_in_out: Object.freeze([0.42, 0.0, 0.58, 1.0]),
  snap_pop: Object.freeze([0.16, 1.0, 0.3, 1.0])
});

export const MAX_TRANSFORM_KEYFRAMES_PER_PARAM = 64;

export const TRANSFORM_PRESETS = [
  {
    id: "full_frame",
    label: "Full Frame",
    label_fr: "Plein Cadre",
    category: "motion",
    zoom_pct: 100.0,
    pos_x_pct: 0.0,
    pos_y_pct: 0.0,
    rotation_deg: 0.0,
    opacity_pct: 100.0,
    crop_left_pct: 0.0,
    crop_right_pct: 0.0,
    crop_top_pct: 0.0,
    crop_bottom_pct: 0.0,
    border_width_px: 0.0,
    border_color: "#ffffff",
    border_feather_px: 0.0,
    shadow_opacity_pct: 0.0,
    shadow_blur_px: 12.0,
    shadow_offset_x_px: 10.0,
    shadow_offset_y_px: 12.0,
    shadow_color: "#000000",
    dynamic_zoom: "off"
  },
  {
    id: "pip_bottom_right",
    label: "PiP Bottom-Right",
    label_fr: "PiP Bas-Droite",
    category: "pip",
    zoom_pct: 28.0,
    pos_x_pct: 32.0,
    pos_y_pct: 32.0,
    rotation_deg: 0.0,
    opacity_pct: 100.0,
    crop_left_pct: 0.0,
    crop_right_pct: 0.0,
    crop_top_pct: 0.0,
    crop_bottom_pct: 0.0,
    border_width_px: 3.0,
    border_color: "#e68442",
    border_feather_px: 0.0,
    shadow_opacity_pct: 55.0,
    shadow_blur_px: 14.0,
    shadow_offset_x_px: 8.0,
    shadow_offset_y_px: 10.0,
    shadow_color: "#000000",
    dynamic_zoom: "off"
  },
  {
    id: "pip_top_left",
    label: "PiP Top-Left",
    label_fr: "PiP Haut-Gauche",
    category: "pip",
    zoom_pct: 28.0,
    pos_x_pct: -32.0,
    pos_y_pct: -32.0,
    rotation_deg: 0.0,
    opacity_pct: 100.0,
    crop_left_pct: 0.0,
    crop_right_pct: 0.0,
    crop_top_pct: 0.0,
    crop_bottom_pct: 0.0,
    border_width_px: 3.0,
    border_color: "#689cff",
    border_feather_px: 0.0,
    shadow_opacity_pct: 55.0,
    shadow_blur_px: 14.0,
    shadow_offset_x_px: 8.0,
    shadow_offset_y_px: 10.0,
    shadow_color: "#000000",
    dynamic_zoom: "off"
  },
  {
    id: "pip_soft_callout",
    label: "Soft Feather PiP",
    label_fr: "PiP Contour Doux",
    category: "pip",
    zoom_pct: 30.0,
    pos_x_pct: 30.0,
    pos_y_pct: -28.0,
    rotation_deg: 0.0,
    opacity_pct: 100.0,
    crop_left_pct: 0.0,
    crop_right_pct: 0.0,
    crop_top_pct: 0.0,
    crop_bottom_pct: 0.0,
    border_width_px: 0.0,
    border_color: "#ffffff",
    border_feather_px: 18.0,
    shadow_opacity_pct: 45.0,
    shadow_blur_px: 16.0,
    shadow_offset_x_px: 6.0,
    shadow_offset_y_px: 8.0,
    shadow_color: "#000000",
    dynamic_zoom: "off"
  },
  {
    id: "split_2x1_left",
    label: "Split 2x1 Left",
    label_fr: "Split 2x1 Gauche",
    category: "split",
    zoom_pct: 100.0,
    pos_x_pct: -25.0,
    pos_y_pct: 0.0,
    rotation_deg: 0.0,
    opacity_pct: 100.0,
    crop_left_pct: 25.0,
    crop_right_pct: 25.0,
    crop_top_pct: 0.0,
    crop_bottom_pct: 0.0,
    border_width_px: 2.0,
    border_color: "#141416",
    border_feather_px: 0.0,
    shadow_opacity_pct: 0.0,
    shadow_blur_px: 12.0,
    shadow_offset_x_px: 10.0,
    shadow_offset_y_px: 12.0,
    shadow_color: "#000000",
    dynamic_zoom: "off"
  },
  {
    id: "split_2x1_right",
    label: "Split 2x1 Right",
    label_fr: "Split 2x1 Droite",
    category: "split",
    zoom_pct: 100.0,
    pos_x_pct: 25.0,
    pos_y_pct: 0.0,
    rotation_deg: 0.0,
    opacity_pct: 100.0,
    crop_left_pct: 25.0,
    crop_right_pct: 25.0,
    crop_top_pct: 0.0,
    crop_bottom_pct: 0.0,
    border_width_px: 2.0,
    border_color: "#141416",
    border_feather_px: 0.0,
    shadow_opacity_pct: 0.0,
    shadow_blur_px: 12.0,
    shadow_offset_x_px: 10.0,
    shadow_offset_y_px: 12.0,
    shadow_color: "#000000",
    dynamic_zoom: "off"
  },
  {
    id: "split_1x2_top",
    label: "Split 1x2 Top",
    label_fr: "Split 1x2 Haut",
    category: "split",
    zoom_pct: 100.0,
    pos_x_pct: 0.0,
    pos_y_pct: -25.0,
    rotation_deg: 0.0,
    opacity_pct: 100.0,
    crop_left_pct: 0.0,
    crop_right_pct: 0.0,
    crop_top_pct: 25.0,
    crop_bottom_pct: 25.0,
    border_width_px: 2.0,
    border_color: "#141416",
    border_feather_px: 0.0,
    shadow_opacity_pct: 0.0,
    shadow_blur_px: 12.0,
    shadow_offset_x_px: 10.0,
    shadow_offset_y_px: 12.0,
    shadow_color: "#000000",
    dynamic_zoom: "off"
  },
  {
    id: "split_1x2_bottom",
    label: "Split 1x2 Bottom",
    label_fr: "Split 1x2 Bas",
    category: "split",
    zoom_pct: 100.0,
    pos_x_pct: 0.0,
    pos_y_pct: 25.0,
    rotation_deg: 0.0,
    opacity_pct: 100.0,
    crop_left_pct: 0.0,
    crop_right_pct: 0.0,
    crop_top_pct: 25.0,
    crop_bottom_pct: 25.0,
    border_width_px: 2.0,
    border_color: "#141416",
    border_feather_px: 0.0,
    shadow_opacity_pct: 0.0,
    shadow_blur_px: 12.0,
    shadow_offset_x_px: 10.0,
    shadow_offset_y_px: 12.0,
    shadow_color: "#000000",
    dynamic_zoom: "off"
  },
  {
    id: "split_2x2_tl",
    label: "Quad 2x2 TL",
    label_fr: "Quad 2x2 HG",
    category: "split",
    zoom_pct: 50.0,
    pos_x_pct: -25.0,
    pos_y_pct: -25.0,
    rotation_deg: 0.0,
    opacity_pct: 100.0,
    crop_left_pct: 0.0,
    crop_right_pct: 0.0,
    crop_top_pct: 0.0,
    crop_bottom_pct: 0.0,
    border_width_px: 2.0,
    border_color: "#141416",
    border_feather_px: 0.0,
    shadow_opacity_pct: 0.0,
    shadow_blur_px: 12.0,
    shadow_offset_x_px: 10.0,
    shadow_offset_y_px: 12.0,
    shadow_color: "#000000",
    dynamic_zoom: "off"
  },
  {
    id: "split_2x2_tr",
    label: "Quad 2x2 TR",
    label_fr: "Quad 2x2 HD",
    category: "split",
    zoom_pct: 50.0,
    pos_x_pct: 25.0,
    pos_y_pct: -25.0,
    rotation_deg: 0.0,
    opacity_pct: 100.0,
    crop_left_pct: 0.0,
    crop_right_pct: 0.0,
    crop_top_pct: 0.0,
    crop_bottom_pct: 0.0,
    border_width_px: 2.0,
    border_color: "#141416",
    border_feather_px: 0.0,
    shadow_opacity_pct: 0.0,
    shadow_blur_px: 12.0,
    shadow_offset_x_px: 10.0,
    shadow_offset_y_px: 12.0,
    shadow_color: "#000000",
    dynamic_zoom: "off"
  },
  {
    id: "split_2x2_bl",
    label: "Quad 2x2 BL",
    label_fr: "Quad 2x2 BG",
    category: "split",
    zoom_pct: 50.0,
    pos_x_pct: -25.0,
    pos_y_pct: 25.0,
    rotation_deg: 0.0,
    opacity_pct: 100.0,
    crop_left_pct: 0.0,
    crop_right_pct: 0.0,
    crop_top_pct: 0.0,
    crop_bottom_pct: 0.0,
    border_width_px: 2.0,
    border_color: "#141416",
    border_feather_px: 0.0,
    shadow_opacity_pct: 0.0,
    shadow_blur_px: 12.0,
    shadow_offset_x_px: 10.0,
    shadow_offset_y_px: 12.0,
    shadow_color: "#000000",
    dynamic_zoom: "off"
  },
  {
    id: "split_2x2_br",
    label: "Quad 2x2 BR",
    label_fr: "Quad 2x2 BD",
    category: "split",
    zoom_pct: 50.0,
    pos_x_pct: 25.0,
    pos_y_pct: 25.0,
    rotation_deg: 0.0,
    opacity_pct: 100.0,
    crop_left_pct: 0.0,
    crop_right_pct: 0.0,
    crop_top_pct: 0.0,
    crop_bottom_pct: 0.0,
    border_width_px: 2.0,
    border_color: "#141416",
    border_feather_px: 0.0,
    shadow_opacity_pct: 0.0,
    shadow_blur_px: 12.0,
    shadow_offset_x_px: 10.0,
    shadow_offset_y_px: 12.0,
    shadow_color: "#000000",
    dynamic_zoom: "off"
  },
  {
    id: "zoom_punch_115",
    label: "Zoom Punch 115%",
    label_fr: "Zoom Punch 115%",
    category: "motion",
    zoom_pct: 115.0,
    pos_x_pct: 0.0,
    pos_y_pct: 0.0,
    rotation_deg: 0.0,
    opacity_pct: 100.0,
    crop_left_pct: 0.0,
    crop_right_pct: 0.0,
    crop_top_pct: 0.0,
    crop_bottom_pct: 0.0,
    border_width_px: 0.0,
    border_color: "#ffffff",
    border_feather_px: 0.0,
    shadow_opacity_pct: 0.0,
    shadow_blur_px: 12.0,
    shadow_offset_x_px: 10.0,
    shadow_offset_y_px: 12.0,
    shadow_color: "#000000",
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

export function normalizeRetimeProcess(raw) {
  const cleaned = typeof raw === "string" ? raw.trim().toLowerCase() : "nearest";
  return ALLOWED_RETIME_PROCESS_MODES.includes(cleaned) ? cleaned : "nearest";
}

export function normalizeRetimeRampPreset(raw) {
  const cleaned = typeof raw === "string" ? raw.trim().toLowerCase() : "constant";
  return ALLOWED_RETIME_RAMP_PRESETS.includes(cleaned) ? cleaned : "constant";
}

export function normalizeRetimeRampPoints(rawPoints) {
  if (!Array.isArray(rawPoints) || rawPoints.length === 0) return [];
  const valid = [];
  for (const item of rawPoints) {
    if (!item || typeof item !== "object") continue;
    const p = Number(item.pos_norm);
    const s = Number(item.speed_rate);
    if (!Number.isFinite(p) || !Number.isFinite(s)) continue;
    valid.push({
      pos_norm: Number(clampNum(p, 0.0, 1.0).toFixed(4)),
      speed_rate: Number(clampNum(s, RETIME_SPEED_MIN, RETIME_SPEED_MAX).toFixed(4))
    });
  }
  valid.sort((a, b) => a.pos_norm - b.pos_norm);
  const deduped = [];
  for (const pt of valid.slice(0, MAX_RETIME_RAMP_POINTS)) {
    if (deduped.length > 0 && Math.abs(deduped[deduped.length - 1].pos_norm - pt.pos_norm) <= 1e-3) {
      deduped[deduped.length - 1] = pt;
    } else {
      deduped.push(pt);
    }
  }
  return deduped;
}

export function resolveRetimeRampPointsForPreset(presetId, rawPoints) {
  const normPoints = normalizeRetimeRampPoints(rawPoints);
  if (normPoints.length > 0) return normPoints;
  const preset = normalizeRetimeRampPreset(presetId);
  const tpl = RETIME_RAMP_PRESET_POINTS[preset];
  if (!tpl || tpl.length === 0) return [];
  return tpl.map((pt) => ({ pos_norm: pt.pos_norm, speed_rate: pt.speed_rate }));
}

export function normalizeClipRetime(clip) {
  const rawSpeed =
    clip && clip.speed_rate !== undefined && clip.speed_rate !== null && Number.isFinite(Number(clip.speed_rate))
      ? Number(clip.speed_rate)
      : 1.0;
  const retimeProcess = normalizeRetimeProcess(clip && (clip.retime_process ?? clip.retimeProcess));
  const rampPreset = normalizeRetimeRampPreset(
    clip && (clip.retime_ramp_preset ?? clip.ramp_preset ?? clip.rampPreset)
  );
  const rawPts = clip && (clip.retime_ramp_points ?? clip.ramp_points ?? clip.rampPoints);
  const rampPoints = resolveRetimeRampPointsForPreset(rampPreset, rawPts);
  return {
    speedRate: Number(clampNum(rawSpeed, RETIME_SPEED_MIN, RETIME_SPEED_MAX).toFixed(2)),
    reverse: Boolean(clip && clip.reverse),
    retimeProcess,
    rampPreset,
    rampPoints
  };
}

export function evaluateRetimeSpeedAt(points, posNorm, fallbackSpeed = 1.0) {
  const u = clampNum(Number.isFinite(Number(posNorm)) ? Number(posNorm) : 0, 0, 1);
  if (!Array.isArray(points) || points.length < 2) {
    return clampNum(
      Number.isFinite(Number(fallbackSpeed)) ? Number(fallbackSpeed) : 1.0,
      RETIME_SPEED_MIN,
      RETIME_SPEED_MAX
    );
  }
  const ordered = normalizeRetimeRampPoints(points);
  if (ordered.length < 2) {
    return clampNum(fallbackSpeed, RETIME_SPEED_MIN, RETIME_SPEED_MAX);
  }
  if (u <= ordered[0].pos_norm) return ordered[0].speed_rate;
  if (u >= ordered[ordered.length - 1].pos_norm) return ordered[ordered.length - 1].speed_rate;
  for (let i = 0; i < ordered.length - 1; i++) {
    const p0 = ordered[i];
    const p1 = ordered[i + 1];
    if (u <= p1.pos_norm) {
      const span = p1.pos_norm - p0.pos_norm;
      if (span <= 1e-6) return p1.speed_rate;
      const t = clampNum((u - p0.pos_norm) / span, 0, 1);
      const smooth = t * t * (3 - 2 * t);
      return p0.speed_rate + (p1.speed_rate - p0.speed_rate) * smooth;
    }
  }
  return ordered[ordered.length - 1].speed_rate;
}

export function computeRetimeRampSummary(params, clipDurationS = 10.0) {
  const norm = normalizeClipRetime(params);
  const pts = norm.rampPoints;
  const dur = Number.isFinite(Number(clipDurationS)) && Number(clipDurationS) > 0 ? Number(clipDurationS) : 0;
  if (pts.length < 2) {
    const spd = norm.speedRate;
    return {
      avgSpeed: Number(spd.toFixed(4)),
      minSpeed: Number(spd.toFixed(4)),
      maxSpeed: Number(spd.toFixed(4)),
      effectiveDurationS: dur > 0 ? Number((dur / spd).toFixed(4)) : 0
    };
  }
  const steps = 64;
  let invIntegral = 0;
  let minSpd = RETIME_SPEED_MAX;
  let maxSpd = RETIME_SPEED_MIN;
  let prevInv = 1.0 / evaluateRetimeSpeedAt(pts, 0, norm.speedRate);
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const s = evaluateRetimeSpeedAt(pts, u, norm.speedRate);
    if (s < minSpd) minSpd = s;
    if (s > maxSpd) maxSpd = s;
    if (i > 0) {
      const curInv = 1.0 / s;
      invIntegral += (0.5 * (prevInv + curInv)) / steps;
      prevInv = curInv;
    }
  }
  const avgSpeed = clampNum(1.0 / Math.max(1e-6, invIntegral), RETIME_SPEED_MIN, RETIME_SPEED_MAX);
  return {
    avgSpeed: Number(avgSpeed.toFixed(4)),
    minSpeed: Number(minSpd.toFixed(4)),
    maxSpeed: Number(maxSpd.toFixed(4)),
    effectiveDurationS: dur > 0 ? Number((dur * invIntegral).toFixed(4)) : 0
  };
}

export function evaluateRetimeSourceOffset(clip, localFrame) {
  const norm = normalizeClipRetime(clip);
  const durFrames = Math.max(1, Number(clip && clip.duration_frames ? clip.duration_frames : 1));
  const clampedLocal = clampNum(Number.isFinite(Number(localFrame)) ? Number(localFrame) : 0, 0, durFrames);
  const effectiveLocal = norm.reverse ? Math.max(0, durFrames - 1 - clampedLocal) : clampedLocal;
  if (norm.rampPoints.length < 2) {
    return {
      sourceDeltaFrames: effectiveLocal * norm.speedRate,
      instantSpeed: norm.speedRate,
      isRamp: false,
      retimeNorm: norm
    };
  }
  const uEnd = clampNum(effectiveLocal / durFrames, 0, 1);
  const slices = 24;
  let integral = 0;
  let prevS = evaluateRetimeSpeedAt(norm.rampPoints, 0, norm.speedRate);
  for (let i = 1; i <= slices; i++) {
    const u = (uEnd * i) / slices;
    const curS = evaluateRetimeSpeedAt(norm.rampPoints, u, norm.speedRate);
    integral += 0.5 * (prevS + curS) * (uEnd / slices);
    prevS = curS;
  }
  const instantSpeed = evaluateRetimeSpeedAt(
    norm.rampPoints,
    clampNum(clampedLocal / durFrames, 0, 1),
    norm.speedRate
  );
  return {
    sourceDeltaFrames: integral * durFrames,
    instantSpeed,
    isRamp: true,
    retimeNorm: norm
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

export function formatRetimeBadgeText(speedRate, reverse, retimeProcess = "nearest", rampPoints = []) {
  const pts = Array.isArray(rampPoints) ? rampPoints : [];
  let baseText;
  if (pts.length >= 2) {
    const speeds = pts.map((pt) => Number(pt.speed_rate)).filter((v) => Number.isFinite(v));
    const minS = speeds.length > 0 ? Math.min(...speeds) : speedRate;
    const maxS = speeds.length > 0 ? Math.max(...speeds) : speedRate;
    baseText = `RAMP ${formatRetimeSpeedValue(minS)}-${formatRetimeSpeedValue(maxS)}`;
  } else {
    baseText = formatRetimeSpeedValue(speedRate);
  }
  const tags = [baseText];
  if (retimeProcess === "optical_flow") tags.push("OF");
  else if (retimeProcess === "frame_blend") tags.push("FB");
  if (reverse) tags.push("REV");
  return tags.join(" ");
}

export function compileRetimeRampSetptsClient(points, clipDurationS = 10.0) {
  const dur = clampNum(
    Number.isFinite(Number(clipDurationS)) && Number(clipDurationS) > 0 ? Number(clipDurationS) : 10.0,
    0.5,
    86400
  );
  const ordered = normalizeRetimeRampPoints(points);
  if (ordered.length < 2) {
    const spd = ordered.length === 1 ? ordered[0].speed_rate : 1.0;
    return `setpts=PTS/${spd.toFixed(4)}`;
  }
  const knots = ordered.map((pt) => ({ ...pt }));
  if (knots[0].pos_norm > 0) {
    knots.unshift({ pos_norm: 0.0, speed_rate: knots[0].speed_rate });
  }
  if (knots[knots.length - 1].pos_norm < 1) {
    knots.push({ pos_norm: 1.0, speed_rate: knots[knots.length - 1].speed_rate });
  }
  const segments = [];
  let cumOutS = 0;
  for (let i = 0; i < knots.length - 1; i++) {
    const p0 = knots[i];
    const p1 = knots[i + 1];
    if (p1.pos_norm - p0.pos_norm <= 1e-4) continue;
    const t0 = p0.pos_norm * dur;
    const t1 = p1.pos_norm * dur;
    const segSpeed = clampNum(0.5 * (p0.speed_rate + p1.speed_rate), RETIME_SPEED_MIN, RETIME_SPEED_MAX);
    segments.push({ t0, t1, segSpeed, offS: cumOutS });
    cumOutS += (t1 - t0) / segSpeed;
  }
  if (segments.length === 0) {
    return `setpts=PTS/${knots[0].speed_rate.toFixed(4)}`;
  }
  const last = segments[segments.length - 1];
  let expr =
    last.t0 <= 1e-6
      ? `PTS/${last.segSpeed.toFixed(4)}`
      : `${last.offS.toFixed(6)}/TB+(PTS-${last.t0.toFixed(4)}/TB)/${last.segSpeed.toFixed(4)}`;
  for (let i = segments.length - 2; i >= 0; i--) {
    const seg = segments[i];
    const branch =
      seg.t0 <= 1e-6
        ? `PTS/${seg.segSpeed.toFixed(4)}`
        : `${seg.offS.toFixed(6)}/TB+(PTS-${seg.t0.toFixed(4)}/TB)/${seg.segSpeed.toFixed(4)}`;
    expr = `if(lt(T,${seg.t1.toFixed(4)}),${branch},${expr})`;
  }
  return `setpts='${expr}'`;
}

export function compileMinterpolateFilterClient(retimeProcess, targetFps = "25") {
  const proc = normalizeRetimeProcess(retimeProcess);
  const fpsStr = targetFps || "25";
  if (proc === "frame_blend") return `minterpolate=fps=${fpsStr}:mi_mode=blend`;
  if (proc === "optical_flow") {
    return `minterpolate=fps=${fpsStr}:mi_mode=mci:mc_mode=aobmc:me_mode=bilat:vsbmc=1`;
  }
  return "";
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
  const retimeProcess = norm.retimeProcess;
  const rampPreset = norm.rampPreset;
  const rampPoints = norm.rampPoints;
  const hasRamp = rampPoints.length >= 2;
  const isIdentity =
    !reverse &&
    retimeProcess === "nearest" &&
    !hasRamp &&
    Math.abs(speedRate - 1.0) <= 1e-6;

  const summary = computeRetimeRampSummary(
    { speed_rate: speedRate, retime_ramp_preset: rampPreset, retime_ramp_points: rampPoints },
    p.clip_duration_s || 10.0
  );
  const vfParts = [];
  const afParts = [];
  if (!isIdentity) {
    if (hasRamp) {
      vfParts.push(compileRetimeRampSetptsClient(rampPoints, p.clip_duration_s || 10.0));
      for (const stage of buildAtempoStagesClient(summary.avgSpeed)) {
        afParts.push(`atempo=${stage.toFixed(4)}`);
      }
    } else if (Math.abs(speedRate - 1.0) > 1e-6) {
      const ptsScale = 1.0 / speedRate;
      vfParts.push(`setpts=${ptsScale.toFixed(6)}*PTS`);
      for (const stage of buildAtempoStagesClient(speedRate)) {
        afParts.push(`atempo=${stage.toFixed(4)}`);
      }
    }
    const interpVf = compileMinterpolateFilterClient(retimeProcess, p.fps || "25");
    if (interpVf) vfParts.push(interpVf);
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
    is_active: !isIdentity,
    avg_speed: summary.avgSpeed,
    retime_process: retimeProcess,
    ramp_preset: rampPreset,
    params: {
      speed_rate: speedRate,
      reverse,
      retime_process: retimeProcess,
      ramp_preset: rampPreset,
      ramp_points: rampPoints
    }
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

function _cubicBezierCoord(s, p1, p2) {
  const inv = 1.0 - s;
  return 3.0 * inv * inv * s * p1 + 3.0 * inv * s * s * p2 + s * s * s;
}

function _cubicBezierSlope(s, p1, p2) {
  const inv = 1.0 - s;
  return 3.0 * inv * inv * p1 + 6.0 * inv * s * (p2 - p1) + 3.0 * s * s * (1.0 - p2);
}

export function solveCubicBezierS(u, x1, x2) {
  const uc = Math.max(0.0, Math.min(1.0, Number.isFinite(u) ? u : 0));
  if (uc <= 0.0) return 0.0;
  if (uc >= 1.0) return 1.0;
  let lo = 0.0;
  let hi = 1.0;
  let s = uc;
  for (let i = 0; i < 8; i += 1) {
    const err = _cubicBezierCoord(s, x1, x2) - uc;
    if (Math.abs(err) < 1e-6) return s;
    if (err < 0.0) lo = s;
    else hi = s;
    const dx = _cubicBezierSlope(s, x1, x2);
    if (Math.abs(dx) > 1e-6) {
      const cand = s - err / dx;
      if (cand > lo && cand < hi) {
        s = cand;
        continue;
      }
    }
    s = 0.5 * (lo + hi);
  }
  for (let i = 0; i < 16; i += 1) {
    const err = _cubicBezierCoord(s, x1, x2) - uc;
    if (Math.abs(err) < 1e-6) return s;
    if (err < 0.0) lo = s;
    else hi = s;
    s = 0.5 * (lo + hi);
  }
  return s;
}

export function evaluateCubicBezier(u, x1, y1, x2, y2) {
  const uc = Math.max(0.0, Math.min(1.0, Number.isFinite(u) ? u : 0));
  if (uc <= 0.0) return 0.0;
  if (uc >= 1.0) return 1.0;
  if (Math.abs(x1 - y1) <= 1e-7 && Math.abs(x2 - y2) <= 1e-7) return uc;
  const s = solveCubicBezierS(uc, x1, x2);
  return _cubicBezierCoord(s, y1, y2);
}

export function evaluateCubicBezierDerivative(u, x1, y1, x2, y2) {
  const uc = Math.max(0.0, Math.min(1.0, Number.isFinite(u) ? u : 0));
  if (Math.abs(x1 - y1) <= 1e-7 && Math.abs(x2 - y2) <= 1e-7) return 1.0;
  const s = solveCubicBezierS(uc, x1, x2);
  const dx = _cubicBezierSlope(s, x1, x2);
  const dy = _cubicBezierSlope(s, y1, y2);
  if (Math.abs(dx) <= 1e-5) {
    if (Math.abs(dy) <= 1e-5) return 0.0;
    return dy >= 0 ? 12.0 : -12.0;
  }
  return dy / dx;
}

export function createEmptyTransformKeyframes() {
  return {
    zoom_pct: [],
    pos_x_pct: [],
    pos_y_pct: [],
    rotation_deg: [],
    opacity_pct: []
  };
}

export function resolveTransformKeyframeBezier(kf) {
  const easing = kf && typeof kf.easing === "string" ? kf.easing.trim().toLowerCase() : "ease_in_out";
  if (easing === "bezier" && kf && Array.isArray(kf.bezier) && kf.bezier.length === 4) {
    const x1 = clampNum(Number(kf.bezier[0]), 0.0, 1.0);
    const y1 = clampNum(Number(kf.bezier[1]), -1.5, 2.5);
    const x2 = clampNum(Number(kf.bezier[2]), 0.0, 1.0);
    const y2 = clampNum(Number(kf.bezier[3]), -1.5, 2.5);
    if ([x1, y1, x2, y2].every((v) => Number.isFinite(v))) {
      return [
        Number(x1.toFixed(4)),
        Number(y1.toFixed(4)),
        Number(x2.toFixed(4)),
        Number(y2.toFixed(4))
      ];
    }
  }
  const preset = TRANSFORM_BEZIER_PRESETS[easing] || TRANSFORM_BEZIER_PRESETS.ease_in_out;
  return [...preset];
}

export function normalizeTransformKeyframe(rawKf, paramName) {
  const bounds = TRANSFORM_PARAM_BOUNDS[paramName] || TRANSFORM_PARAM_BOUNDS.zoom_pct;
  const src = rawKf && typeof rawKf === "object" ? rawKf : {};
  const rawTime = Number(src.time_s);
  const rawVal = Number(src.value);
  const timeS = Number.isFinite(rawTime) ? clampNum(rawTime, 0, 3600) : 0;
  const val = Number.isFinite(rawVal) ? clampNum(rawVal, bounds.min, bounds.max) : bounds.def;
  const rawEasing = typeof src.easing === "string" ? src.easing.trim().toLowerCase() : "ease_in_out";
  const easing = TRANSFORM_EASINGS.includes(rawEasing) ? rawEasing : "ease_in_out";
  const bezier =
    Array.isArray(src.bezier) && src.bezier.length === 4 && src.bezier.every((v) => Number.isFinite(Number(v)))
      ? [
          Number(clampNum(Number(src.bezier[0]), 0, 1).toFixed(4)),
          Number(clampNum(Number(src.bezier[1]), -1.5, 2.5).toFixed(4)),
          Number(clampNum(Number(src.bezier[2]), 0, 1).toFixed(4)),
          Number(clampNum(Number(src.bezier[3]), -1.5, 2.5).toFixed(4))
        ]
      : [...(TRANSFORM_BEZIER_PRESETS[easing] || TRANSFORM_BEZIER_PRESETS.ease_in_out)];
  return {
    time_s: Number(timeS.toFixed(4)),
    value: Number(val.toFixed(4)),
    easing,
    bezier
  };
}

export function normalizeTransformKeyframes(rawKeyframes) {
  const out = createEmptyTransformKeyframes();
  const src = rawKeyframes && typeof rawKeyframes === "object" ? rawKeyframes : {};
  for (const param of TRANSFORM_KEYFRAME_PARAMS) {
    const rawLane = Array.isArray(src[param]) ? src[param] : [];
    const normalized = rawLane
      .slice(0, MAX_TRANSFORM_KEYFRAMES_PER_PARAM)
      .map((kf) => normalizeTransformKeyframe(kf, param))
      .sort((a, b) => a.time_s - b.time_s);
    const deduped = [];
    for (const kf of normalized) {
      if (deduped.length > 0 && Math.abs(deduped[deduped.length - 1].time_s - kf.time_s) <= 1e-4) {
        deduped[deduped.length - 1] = kf;
      } else {
        deduped.push(kf);
      }
    }
    out[param] = deduped;
  }
  return out;
}

export function hasTransformKeyframes(transformOrClip) {
  const tf =
    transformOrClip && transformOrClip.transform && typeof transformOrClip.transform === "object"
      ? transformOrClip.transform
      : transformOrClip;
  if (!tf || !tf.keyframes || typeof tf.keyframes !== "object") return false;
  return TRANSFORM_KEYFRAME_PARAMS.some(
    (p) => Array.isArray(tf.keyframes[p]) && tf.keyframes[p].length > 0
  );
}

export function getTransformKeyframeCount(transformOrClip) {
  const norm = normalizeClipTransform(transformOrClip);
  return TRANSFORM_KEYFRAME_PARAMS.reduce(
    (acc, p) => acc + (Array.isArray(norm.keyframes[p]) ? norm.keyframes[p].length : 0),
    0
  );
}

export function getTransformKeyframedParams(transformOrClip) {
  const norm = normalizeClipTransform(transformOrClip);
  return TRANSFORM_KEYFRAME_PARAMS.filter(
    (p) => Array.isArray(norm.keyframes[p]) && norm.keyframes[p].length > 0
  );
}

export function getAllTransformKeyframeTimes(transformOrClip) {
  const norm = normalizeClipTransform(transformOrClip);
  const times = [];
  for (const p of TRANSFORM_KEYFRAME_PARAMS) {
    for (const kf of norm.keyframes[p] || []) {
      const t = Number(kf.time_s);
      if (Number.isFinite(t) && !times.some((ex) => Math.abs(ex - t) < 0.005)) {
        times.push(t);
      }
    }
  }
  return times.sort((a, b) => a - b);
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
            clipOrTransform.crop_left_pct !== undefined ||
            clipOrTransform.crop_right_pct !== undefined ||
            clipOrTransform.crop_top_pct !== undefined ||
            clipOrTransform.crop_bottom_pct !== undefined ||
            clipOrTransform.border_width_px !== undefined ||
            clipOrTransform.border_feather_px !== undefined ||
            clipOrTransform.shadow_opacity_pct !== undefined ||
            clipOrTransform.dynamic_zoom !== undefined ||
            clipOrTransform.keyframes !== undefined)
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
  let cropLeft = clampNum(numOr(src.crop_left_pct, TRANSFORM_CROP_DEFAULT), TRANSFORM_CROP_MIN, TRANSFORM_CROP_MAX);
  let cropRight = clampNum(numOr(src.crop_right_pct, TRANSFORM_CROP_DEFAULT), TRANSFORM_CROP_MIN, TRANSFORM_CROP_MAX);
  if (cropLeft + cropRight > TRANSFORM_CROP_SUM_MAX) {
    const excess = cropLeft + cropRight - TRANSFORM_CROP_SUM_MAX;
    cropRight = Math.max(0, cropRight - excess);
  }
  let cropTop = clampNum(numOr(src.crop_top_pct, TRANSFORM_CROP_DEFAULT), TRANSFORM_CROP_MIN, TRANSFORM_CROP_MAX);
  let cropBottom = clampNum(numOr(src.crop_bottom_pct, TRANSFORM_CROP_DEFAULT), TRANSFORM_CROP_MIN, TRANSFORM_CROP_MAX);
  if (cropTop + cropBottom > TRANSFORM_CROP_SUM_MAX) {
    const excess = cropTop + cropBottom - TRANSFORM_CROP_SUM_MAX;
    cropBottom = Math.max(0, cropBottom - excess);
  }
  const borderWidth = clampNum(
    numOr(src.border_width_px, TRANSFORM_BORDER_WIDTH_DEFAULT),
    TRANSFORM_BORDER_WIDTH_MIN,
    TRANSFORM_BORDER_WIDTH_MAX
  );
  const borderColor = normalizeTransformHexColor(src.border_color, TRANSFORM_BORDER_COLOR_DEFAULT);
  const borderFeather = clampNum(
    numOr(src.border_feather_px, TRANSFORM_BORDER_FEATHER_DEFAULT),
    TRANSFORM_BORDER_FEATHER_MIN,
    TRANSFORM_BORDER_FEATHER_MAX
  );
  const shadowOpacity = clampNum(
    numOr(src.shadow_opacity_pct, TRANSFORM_SHADOW_OPACITY_DEFAULT),
    TRANSFORM_SHADOW_OPACITY_MIN,
    TRANSFORM_SHADOW_OPACITY_MAX
  );
  const shadowBlur = clampNum(
    numOr(src.shadow_blur_px, TRANSFORM_SHADOW_BLUR_DEFAULT),
    TRANSFORM_SHADOW_BLUR_MIN,
    TRANSFORM_SHADOW_BLUR_MAX
  );
  const shadowOffX = clampNum(
    numOr(src.shadow_offset_x_px, TRANSFORM_SHADOW_OFFSET_X_DEFAULT),
    TRANSFORM_SHADOW_OFFSET_MIN,
    TRANSFORM_SHADOW_OFFSET_MAX
  );
  const shadowOffY = clampNum(
    numOr(src.shadow_offset_y_px, TRANSFORM_SHADOW_OFFSET_Y_DEFAULT),
    TRANSFORM_SHADOW_OFFSET_MIN,
    TRANSFORM_SHADOW_OFFSET_MAX
  );
  const shadowColor = normalizeTransformHexColor(src.shadow_color, TRANSFORM_SHADOW_COLOR_DEFAULT);
  const dynamicZoom = normalizeDynamicZoomPreset(src.dynamic_zoom);
  const keyframes = normalizeTransformKeyframes(src.keyframes);
  return {
    zoom_pct: Number(zoom.toFixed(1)),
    pos_x_pct: Number(posX.toFixed(1)),
    pos_y_pct: Number(posY.toFixed(1)),
    rotation_deg: Number(rot.toFixed(1)),
    opacity_pct: Number(opacity.toFixed(1)),
    crop_left_pct: Number(cropLeft.toFixed(1)),
    crop_right_pct: Number(cropRight.toFixed(1)),
    crop_top_pct: Number(cropTop.toFixed(1)),
    crop_bottom_pct: Number(cropBottom.toFixed(1)),
    border_width_px: Number(borderWidth.toFixed(1)),
    border_color: borderColor,
    border_feather_px: Number(borderFeather.toFixed(1)),
    shadow_opacity_pct: Number(shadowOpacity.toFixed(1)),
    shadow_blur_px: Number(shadowBlur.toFixed(1)),
    shadow_offset_x_px: Number(shadowOffX.toFixed(1)),
    shadow_offset_y_px: Number(shadowOffY.toFixed(1)),
    shadow_color: shadowColor,
    dynamic_zoom: dynamicZoom,
    keyframes
  };
}

export function hasClipDveCrop(transformOrClip) {
  const norm = normalizeClipTransform(transformOrClip);
  return (
    norm.crop_left_pct > 1e-4 ||
    norm.crop_right_pct > 1e-4 ||
    norm.crop_top_pct > 1e-4 ||
    norm.crop_bottom_pct > 1e-4
  );
}

export function hasClipDveBorderOrFeather(transformOrClip) {
  const norm = normalizeClipTransform(transformOrClip);
  return norm.border_width_px >= 0.5 || norm.border_feather_px >= 1.0;
}

export function hasClipDveDropShadow(transformOrClip) {
  const norm = normalizeClipTransform(transformOrClip);
  return norm.shadow_opacity_pct > 1e-4;
}

export function hasClipDveStyling(transformOrClip) {
  const norm = normalizeClipTransform(transformOrClip);
  return hasClipDveCrop(norm) || hasClipDveBorderOrFeather(norm) || hasClipDveDropShadow(norm);
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
  return (
    !hasStaticClipTransform(norm) &&
    !hasClipDveStyling(norm) &&
    norm.dynamic_zoom === DYNAMIC_ZOOM_DEFAULT &&
    !hasTransformKeyframes(norm)
  );
}

export function evaluateTransformParamAtTime(transformOrClip, paramName, timeSec) {
  const norm = normalizeClipTransform(transformOrClip);
  const bounds = TRANSFORM_PARAM_BOUNDS[paramName] || TRANSFORM_PARAM_BOUNDS.zoom_pct;
  const fallback = Number.isFinite(Number(norm[paramName])) ? Number(norm[paramName]) : bounds.def;
  const lane = norm.keyframes && Array.isArray(norm.keyframes[paramName]) ? norm.keyframes[paramName] : [];
  if (lane.length === 0) return fallback;
  const t = Math.max(0, Number.isFinite(Number(timeSec)) ? Number(timeSec) : 0);
  if (t <= lane[0].time_s) return lane[0].value;
  const last = lane[lane.length - 1];
  if (t >= last.time_s) return last.value;
  for (let i = 0; i < lane.length - 1; i += 1) {
    const k0 = lane[i];
    const k1 = lane[i + 1];
    if (t <= k1.time_s) {
      const dt = k1.time_s - k0.time_s;
      if (dt <= 1e-6) return k1.value;
      const u = (t - k0.time_s) / dt;
      const [x1, y1, x2, y2] = resolveTransformKeyframeBezier(k0);
      const w = evaluateCubicBezier(u, x1, y1, x2, y2);
      return clampNum(k0.value + (k1.value - k0.value) * w, bounds.min, bounds.max);
    }
  }
  return last.value;
}

export function evaluateTransformParamSpeedAtTime(transformOrClip, paramName, timeSec) {
  const norm = normalizeClipTransform(transformOrClip);
  const lane = norm.keyframes && Array.isArray(norm.keyframes[paramName]) ? norm.keyframes[paramName] : [];
  if (lane.length < 2) return 0;
  const t = Math.max(0, Number.isFinite(Number(timeSec)) ? Number(timeSec) : 0);
  if (t < lane[0].time_s || t > lane[lane.length - 1].time_s) return 0;
  for (let i = 0; i < lane.length - 1; i += 1) {
    const k0 = lane[i];
    const k1 = lane[i + 1];
    if (t <= k1.time_s) {
      const dt = k1.time_s - k0.time_s;
      if (dt <= 1e-6) return 0;
      const u = (t - k0.time_s) / dt;
      const [x1, y1, x2, y2] = resolveTransformKeyframeBezier(k0);
      const dyDu = evaluateCubicBezierDerivative(u, x1, y1, x2, y2);
      return ((k1.value - k0.value) / dt) * dyDu;
    }
  }
  return 0;
}

export function evaluateClipTransformAtTime(transformOrClip, timeSec) {
  const norm = normalizeClipTransform(transformOrClip);
  return {
    ...norm,
    zoom_pct: evaluateTransformParamAtTime(norm, "zoom_pct", timeSec),
    pos_x_pct: evaluateTransformParamAtTime(norm, "pos_x_pct", timeSec),
    pos_y_pct: evaluateTransformParamAtTime(norm, "pos_y_pct", timeSec),
    rotation_deg: evaluateTransformParamAtTime(norm, "rotation_deg", timeSec),
    opacity_pct: evaluateTransformParamAtTime(norm, "opacity_pct", timeSec)
  };
}

export function sampleTransformCurve(transformOrClip, paramName, durationSec, count = 64) {
  const dur = Math.max(0.2, Number.isFinite(Number(durationSec)) ? Number(durationSec) : 5.0);
  const n = Math.max(8, Math.min(256, Math.round(count)));
  const out = [];
  for (let i = 0; i <= n; i += 1) {
    const t = (dur * i) / n;
    out.push({
      time_s: Number(t.toFixed(4)),
      value: evaluateTransformParamAtTime(transformOrClip, paramName, t),
      speed: evaluateTransformParamSpeedAtTime(transformOrClip, paramName, t)
    });
  }
  return out;
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
  if (hasClipDveCrop(norm)) {
    parts.push("CROP");
  }
  if (norm.border_width_px >= 0.5) {
    parts.push(`BDR ${Math.round(norm.border_width_px)}`);
  }
  if (norm.border_feather_px >= 1.0) {
    parts.push(`FTH ${Math.round(norm.border_feather_px)}`);
  }
  if (hasClipDveDropShadow(norm)) {
    parts.push("SHAD");
  }
  if (norm.dynamic_zoom && norm.dynamic_zoom !== DYNAMIC_ZOOM_DEFAULT) {
    parts.push(getDynamicZoomShortTag(norm.dynamic_zoom));
  }
  const kfCount = getTransformKeyframeCount(norm);
  if (kfCount > 0) {
    parts.push(`${kfCount}KF`);
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

function _buildBezierSegmentFfmpegExprClient(uExpr, v0, v1, bezier) {
  const dv = v1 - v0;
  if (Math.abs(dv) <= 1e-7) return v0.toFixed(6);
  const [x1, y1, x2, y2] = bezier;
  if (Math.abs(x1 - y1) <= 1e-5 && Math.abs(x2 - y2) <= 1e-5) {
    return `(${v0.toFixed(6)}+(${dv.toFixed(6)})*${uExpr})`;
  }
  const knots = [0.0, 0.25, 0.5, 0.75, 1.0];
  const vals = knots.map((k) => v0 + dv * evaluateCubicBezier(k, x1, y1, x2, y2));
  let expr = `(${vals[3].toFixed(6)}+(${((vals[4] - vals[3]) / 0.25).toFixed(6)})*(${uExpr}-0.75))`;
  for (const idx of [2, 1, 0]) {
    const kLo = knots[idx];
    const kHi = knots[idx + 1];
    const slope = (vals[idx + 1] - vals[idx]) / 0.25;
    const seg = `(${vals[idx].toFixed(6)}+(${slope.toFixed(6)})*(${uExpr}-${kLo.toFixed(2)}))`;
    expr = `if(lt(${uExpr},${kHi.toFixed(2)}),${seg},${expr})`;
  }
  return expr;
}

function _buildTransformKeyframeFfmpegExprClient(keyframes, staticVal, scale = 1.0, lo = null, hi = null, timeVar = "t") {
  if (!Array.isArray(keyframes) || keyframes.length === 0) {
    return (staticVal * scale).toFixed(6);
  }
  const ordered = [...keyframes].sort((a, b) => a.time_s - b.time_s);
  if (ordered.length === 1) {
    return (ordered[0].value * scale).toFixed(6);
  }
  let expr = (ordered[ordered.length - 1].value * scale).toFixed(6);
  for (let idx = ordered.length - 2; idx >= 0; idx -= 1) {
    const k0 = ordered[idx];
    const k1 = ordered[idx + 1];
    const v0 = k0.value * scale;
    const v1 = k1.value * scale;
    const dt = k1.time_s - k0.time_s;
    let segExpr;
    if (dt <= 1e-6) {
      segExpr = v1.toFixed(6);
    } else {
      const u = `clip((${timeVar}-${k0.time_s.toFixed(4)})/${dt.toFixed(4)},0,1)`;
      segExpr = _buildBezierSegmentFfmpegExprClient(u, v0, v1, resolveTransformKeyframeBezier(k0));
    }
    expr = `if(lt(${timeVar},${k1.time_s.toFixed(4)}),${segExpr},${expr})`;
  }
  const firstV = (ordered[0].value * scale).toFixed(6);
  const fullExpr = `if(lte(${timeVar},${ordered[0].time_s.toFixed(4)}),${firstV},${expr})`;
  if (lo !== null && hi !== null) {
    return `clip(${fullExpr},${lo.toFixed(4)},${hi.toFixed(4)})`;
  }
  return fullExpr;
}

export function compileTransformFilterClient(params, pixFmt = null, clipDurationS = null) {
  const norm = normalizeClipTransform(params);
  const isIdentity = isClipTransformIdentity(norm);
  const hasKfs = hasTransformKeyframes(norm);
  const hasDve = hasClipDveStyling(norm);
  const kfCount = getTransformKeyframeCount(norm);
  const kfParams = getTransformKeyframedParams(norm);
  if (isIdentity) {
    return {
      filtergraph: "",
      ffmpeg_vf_args: [],
      is_identity: true,
      has_keyframes: false,
      keyframe_count: 0,
      keyframed_params: [],
      params: norm
    };
  }
  if (!hasKfs && !hasDve && norm.opacity_pct <= 1e-6) {
    const parts = ["drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill", "setsar=1"];
    if (pixFmt) parts.push(`format=${pixFmt}`);
    const fg = parts.join(",");
    return {
      filtergraph: fg,
      ffmpeg_vf_args: ["-vf", fg],
      is_identity: false,
      has_keyframes: false,
      keyframe_count: 0,
      keyframed_params: [],
      params: norm
    };
  }
  const dzGraph = compileDynamicZoomFilterClient(norm.dynamic_zoom, clipDurationS);
  if (!hasKfs && !hasStaticClipTransform(norm) && !hasDve && dzGraph) {
    const fg = pixFmt ? `${dzGraph},format=${pixFmt}` : dzGraph;
    return {
      filtergraph: fg,
      ffmpeg_vf_args: ["-vf", fg],
      is_identity: false,
      has_keyframes: false,
      keyframe_count: 0,
      keyframed_params: [],
      params: norm
    };
  }
  const kfZoom = norm.keyframes.zoom_pct.length > 0;
  const kfPosX = norm.keyframes.pos_x_pct.length > 0;
  const kfPosY = norm.keyframes.pos_y_pct.length > 0;
  const kfRot = norm.keyframes.rotation_deg.length > 0;
  const kfOpacity = norm.keyframes.opacity_pct.length > 0;

  const preFeatherSteps = [];
  if (hasClipDveCrop(norm)) {
    const cl = norm.crop_left_pct / 100.0;
    const cr = norm.crop_right_pct / 100.0;
    const ct = norm.crop_top_pct / 100.0;
    const cb = norm.crop_bottom_pct / 100.0;
    const cw = Math.max(0.15, 1.0 - cl - cr);
    const ch = Math.max(0.15, 1.0 - ct - cb);
    preFeatherSteps.push(
      `crop=w='max(2,trunc(iw*${cw.toFixed(6)}/2)*2)':h='max(2,trunc(ih*${ch.toFixed(6)}/2)*2)':x='trunc(iw*${cl.toFixed(6)}/2)*2':y='trunc(ih*${ct.toFixed(6)}/2)*2'`
    );
  }
  if (kfZoom) {
    const zExpr = _buildTransformKeyframeFfmpegExprClient(
      norm.keyframes.zoom_pct,
      norm.zoom_pct,
      0.01,
      0.1,
      3.0,
      "t"
    );
    preFeatherSteps.push(
      `scale=w='trunc(iw*(${zExpr})/2)*2':h='trunc(ih*(${zExpr})/2)*2':eval=frame:flags=lanczos`
    );
  } else if (Math.abs(norm.zoom_pct - 100.0) > 1e-4) {
    const zScale = norm.zoom_pct / 100.0;
    preFeatherSteps.push(
      `scale=w=ceil(iw*${zScale.toFixed(6)}/2)*2:h=ceil(ih*${zScale.toFixed(6)}/2)*2:flags=lanczos`
    );
  }
  if (norm.border_width_px >= 0.5) {
    const bw = Math.max(1, Math.round(norm.border_width_px));
    const ffBorder = `0x${norm.border_color.slice(1).toLowerCase()}`;
    if (!hasClipDveCrop(norm) && !kfZoom && norm.zoom_pct >= 99.9) {
      preFeatherSteps.push(`drawbox=x=0:y=0:w=iw:h=ih:color=${ffBorder}:t=${bw}`);
    } else {
      preFeatherSteps.push(`pad=w=iw+${2 * bw}:h=ih+${2 * bw}:x=${bw}:y=${bw}:color=${ffBorder}`);
    }
  }

  const hasFeather = norm.border_feather_px >= 1.0;
  const postFeatherSteps = [];
  const hasStaticRot = !kfRot && Math.abs(norm.rotation_deg) > 1e-4;
  const hasStaticOpacity = !kfOpacity && Math.abs(norm.opacity_pct - 100.0) > 1e-4;
  if ((kfRot || hasStaticRot || hasStaticOpacity) && !hasFeather) {
    postFeatherSteps.push("format=yuva420p");
  }
  if (kfRot) {
    const radExpr = _buildTransformKeyframeFfmpegExprClient(
      norm.keyframes.rotation_deg,
      norm.rotation_deg,
      Math.PI / 180.0,
      null,
      null,
      "t"
    );
    postFeatherSteps.push(`rotate='${radExpr}':ow=iw:oh=ih:c=black@0`);
  } else if (hasStaticRot) {
    const rad = (norm.rotation_deg * Math.PI) / 180.0;
    postFeatherSteps.push(
      `rotate=${rad.toFixed(6)}:ow=rotw(${rad.toFixed(6)}):oh=roth(${rad.toFixed(6)}):c=black@0`
    );
  }
  if (hasStaticOpacity) {
    const alpha = norm.opacity_pct / 100.0;
    postFeatherSteps.push(`colorchannelmixer=aa=${alpha.toFixed(4)}`);
  }

  let xExpr;
  if (kfPosX) {
    const dxExpr = _buildTransformKeyframeFfmpegExprClient(
      norm.keyframes.pos_x_pct,
      norm.pos_x_pct,
      0.01,
      -1.0,
      1.0,
      "t"
    );
    xExpr = `'(W-w)/2+W*(${dxExpr})'`;
  } else {
    const dx = norm.pos_x_pct / 100.0;
    xExpr = Math.abs(dx) <= 1e-6 ? "(W-w)/2" : `(W-w)/2+W*(${dx.toFixed(4)})`;
  }
  let yExpr;
  if (kfPosY) {
    const dyExpr = _buildTransformKeyframeFfmpegExprClient(
      norm.keyframes.pos_y_pct,
      norm.pos_y_pct,
      0.01,
      -1.0,
      1.0,
      "t"
    );
    yExpr = `'(H-h)/2+H*(${dyExpr})'`;
  } else {
    const dy = norm.pos_y_pct / 100.0;
    yExpr = Math.abs(dy) <= 1e-6 ? "(H-h)/2" : `(H-h)/2+H*(${dy.toFixed(4)})`;
  }

  const preChain = preFeatherSteps.join(",");
  const postChain = postFeatherSteps.join(",");
  const hasShadow = hasClipDveDropShadow(norm);
  const needsOverlay =
    Boolean(preChain) ||
    Boolean(postChain) ||
    hasFeather ||
    hasShadow ||
    kfPosX ||
    kfPosY ||
    hasStaticClipTransform(norm);

  let graph = "";
  if (needsOverlay) {
    const fgSegments = [];
    if (hasFeather) {
      const fPx = Math.max(2, Math.round(norm.border_feather_px));
      const sigma = Math.max(1.0, fPx * 0.45).toFixed(2);
      const lead = preChain ? `${preChain},` : "";
      let fGraph =
        `[xf_fg]${lead}format=yuva420p,split[xf_fc][xf_fm];` +
        `[xf_fm]format=gray,` +
        `drawbox=x=0:y=0:w=iw:h=ih:color=white:t=fill,` +
        `drawbox=x=0:y=0:w=iw:h='min(ih/4,${fPx})':color=black:t=fill,` +
        `drawbox=x=0:y='ih-min(ih/4,${fPx})':w=iw:h='min(ih/4,${fPx})':color=black:t=fill,` +
        `drawbox=x=0:y=0:w='min(iw/4,${fPx})':h=ih:color=black:t=fill,` +
        `drawbox=x='iw-min(iw/4,${fPx})':y=0:w='min(iw/4,${fPx})':h=ih:color=black:t=fill,` +
        `gblur=sigma=${sigma}:steps=2[xf_fa];[xf_fc][xf_fa]alphamerge`;
      if (postChain) fGraph += `,${postChain}`;
      fgSegments.push(fGraph);
    } else {
      const linearChain = [preChain, postChain].filter(Boolean).join(",");
      fgSegments.push(linearChain ? `[xf_fg]${linearChain}` : "[xf_fg]null");
    }
    const fgBuilt = fgSegments.join(";");
    if (hasShadow) {
      const shAlpha = (norm.shadow_opacity_pct / 100.0).toFixed(4);
      const shBlur = norm.shadow_blur_px;
      let shPad = Math.max(2, Math.ceil(shBlur * 2.0));
      if (shPad % 2 !== 0) shPad += 1;
      const sr = Number.parseInt(norm.shadow_color.slice(1, 3), 16);
      const sg = Number.parseInt(norm.shadow_color.slice(3, 5), 16);
      const sb = Number.parseInt(norm.shadow_color.slice(5, 7), 16);
      const dxSh = Math.round(norm.shadow_offset_x_px);
      const dySh = Math.round(norm.shadow_offset_y_px);
      const rawXInner = xExpr.replace(/^'+|'+$/g, "");
      const rawYInner = yExpr.replace(/^'+|'+$/g, "");
      const fmtSigned = (n) => (n >= 0 ? `+${n}` : `${n}`);
      const shXExpr = dxSh !== 0 ? `'${rawXInner}${fmtSigned(dxSh)}'` : xExpr;
      const shYExpr = dySh !== 0 ? `'${rawYInner}${fmtSigned(dySh)}'` : yExpr;
      const shBlurPart = shBlur >= 0.5 ? `,gblur=sigma=${shBlur.toFixed(2)}:steps=2` : "";
      graph =
        "split[xf_bg][xf_fg];" +
        "[xf_bg]drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill[xf_blk];" +
        `${fgBuilt},split[xf_fgm][xf_shsrc];` +
        `[xf_shsrc]format=rgba,lutrgb=r=${sr}:g=${sg}:b=${sb},` +
        `colorchannelmixer=aa=${shAlpha},` +
        `pad=w=iw+${2 * shPad}:h=ih+${2 * shPad}:x=${shPad}:y=${shPad}:color=black@0` +
        `${shBlurPart}[xf_sh];` +
        `[xf_blk][xf_sh]overlay=x=${shXExpr}:y=${shYExpr}:shortest=1[xf_wsh];` +
        `[xf_wsh][xf_fgm]overlay=x=${xExpr}:y=${yExpr}:shortest=1,setsar=1`;
    } else {
      const linearOnly = [preChain, postChain].filter(Boolean).join(",");
      if (hasFeather) {
        graph =
          "split[xf_bg][xf_fg];" +
          "[xf_bg]drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill[xf_blk];" +
          `${fgBuilt}[xf_ov];` +
          `[xf_blk][xf_ov]overlay=x=${xExpr}:y=${yExpr}:shortest=1,setsar=1`;
      } else if (linearOnly) {
        graph =
          "split[xf_bg][xf_fg];" +
          "[xf_bg]drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill[xf_blk];" +
          `[xf_fg]${linearOnly}[xf_ov];` +
          `[xf_blk][xf_ov]overlay=x=${xExpr}:y=${yExpr}:shortest=1,setsar=1`;
      } else {
        graph =
          "split[xf_bg][xf_fg];" +
          "[xf_bg]drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill[xf_blk];" +
          `[xf_blk][xf_fg]overlay=x=${xExpr}:y=${yExpr}:shortest=1,setsar=1`;
      }
    }
  }
  if (kfOpacity) {
    const opExpr = _buildTransformKeyframeFfmpegExprClient(
      norm.keyframes.opacity_pct,
      norm.opacity_pct,
      0.01,
      0.0,
      1.0,
      "T"
    );
    const opStage = `split[xf_op_bg][xf_op_fg];[xf_op_bg]drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill[xf_op_blk];[xf_op_blk][xf_op_fg]blend=all_expr='A*(1-(${opExpr}))+B*(${opExpr})'`;
    graph = graph ? `${graph},${opStage}` : opStage;
  }
  if (dzGraph) graph = graph ? `${dzGraph},${graph}` : dzGraph;
  if (pixFmt) graph = graph ? `${graph},format=${pixFmt}` : `format=${pixFmt}`;
  return {
    filtergraph: graph,
    ffmpeg_vf_args: graph ? ["-vf", graph] : [],
    is_identity: graph === "",
    has_keyframes: hasKfs,
    keyframe_count: kfCount,
    keyframed_params: kfParams,
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

export function normalizeTrackMixerState(track) {
  const src = track && typeof track === "object" ? track : {};
  const rawVol = Number(src.volume_db);
  const volumeDb = Number.isFinite(rawVol)
    ? clampNum(rawVol, TRACK_VOLUME_DB_MIN, TRACK_VOLUME_DB_MAX)
    : 0.0;
  const rawPan = Number(src.pan);
  const pan = Number.isFinite(rawPan) ? clampNum(rawPan, TRACK_PAN_MIN, TRACK_PAN_MAX) : 0.0;
  return {
    volume_db: Number(volumeDb.toFixed(1)),
    pan: Number(pan.toFixed(2)),
    muted: Boolean(src.muted),
    solo: Boolean(src.solo),
    rec_armed: Boolean(src.rec_armed)
  };
}

export function normalizeMasterBusState(master) {
  const src = master && typeof master === "object" ? master : {};
  const rawVol = Number(src.volume_db);
  const volumeDb = Number.isFinite(rawVol)
    ? clampNum(rawVol, TRACK_VOLUME_DB_MIN, TRACK_VOLUME_DB_MAX)
    : 0.0;
  return {
    volume_db: Number(volumeDb.toFixed(1)),
    muted: Boolean(src.muted),
    dim_enabled: Boolean(src.dim_enabled),
    voice_isolation: Boolean(src.voice_isolation)
  };
}

export function formatTrackPanLabel(pan) {
  const p = Number.isFinite(Number(pan)) ? clampNum(Number(pan), TRACK_PAN_MIN, TRACK_PAN_MAX) : 0.0;
  if (Math.abs(p) <= 0.02) return "C";
  const pct = Math.round(Math.abs(p) * 100);
  return p < 0 ? `L${pct}` : `R${pct}`;
}

export function compileTrackPanClient(pan) {
  const p = Number.isFinite(Number(pan)) ? clampNum(Number(pan), TRACK_PAN_MIN, TRACK_PAN_MAX) : 0.0;
  if (Math.abs(p) <= 1e-6) return "";
  const leftGain = Math.min(1.0, 1.0 - p);
  const rightGain = Math.min(1.0, 1.0 + p);
  return `pan=stereo|c0=${leftGain.toFixed(3)}*c0|c1=${rightGain.toFixed(3)}*c1`;
}

export function compileFairlightMixerClient(channel, master = null, voiceCleanup = null) {
  const ch = normalizeTrackMixerState(channel);
  const trackCode =
    channel && typeof channel.track_code === "string" && channel.track_code.trim()
      ? channel.track_code.trim().toUpperCase()
      : "A1";
  const m = normalizeMasterBusState(master);
  const leftGain = Number(Math.min(1.0, 1.0 - ch.pan).toFixed(3));
  const rightGain = Number(Math.min(1.0, 1.0 + ch.pan).toFixed(3));
  const dimDb = m.dim_enabled ? -20.0 : 0.0;
  const effectiveGainDb = Number((ch.volume_db + m.volume_db + dimDb).toFixed(2));

  if (ch.muted || m.muted) {
    return {
      filtergraph: "volume=0",
      ffmpeg_af_args: ["-af", "volume=0"],
      is_identity: false,
      channel: { track_code: trackCode, ...ch },
      master: m,
      effective_gain_db: -96.0,
      pan_law_left: leftGain,
      pan_law_right: rightGain
    };
  }

  const parts = [];
  if (Math.abs(effectiveGainDb) > 1e-6) {
    parts.push(`volume=${effectiveGainDb.toFixed(2)}dB`);
  }
  const panAf = compileTrackPanClient(ch.pan);
  if (panAf) {
    parts.push(panAf);
  }
  if (m.voice_isolation) {
    const vc = voiceCleanup && typeof voiceCleanup === "object" ? voiceCleanup : {};
    const hp = Number.isFinite(Number(vc.highpass_hz)) ? clampNum(Math.round(Number(vc.highpass_hz)), 40, 200) : 85;
    const pres = Number.isFinite(Number(vc.presence_db)) ? clampNum(Number(vc.presence_db), -6, 6) : 2.5;
    const deEss = Number.isFinite(Number(vc.de_ess)) ? clampNum(Number(vc.de_ess), 0, 1) : 0.35;
    parts.push(`highpass=f=${hp}`);
    if (Math.abs(pres) > 1e-6) {
      parts.push(`equalizer=f=3200:t=q:w=1.2:g=${pres.toFixed(1)}`);
    }
    if (deEss > 1e-6) {
      parts.push(`deesser=i=${deEss.toFixed(2)}:m=0.50:f=0.50:s=o`);
    }
  }
  const filtergraph = parts.join(",");
  return {
    filtergraph,
    ffmpeg_af_args: filtergraph ? ["-af", filtergraph] : [],
    is_identity: filtergraph === "",
    channel: { track_code: trackCode, ...ch },
    master: m,
    effective_gain_db: effectiveGainDb,
    pan_law_left: leftGain,
    pan_law_right: rightGain
  };
}

export function evaluateTimelineAudioLevels(doc, frame, opts = {}) {
  const isPlaying = Boolean(opts.isPlaying);
  const phaseSec = Number.isFinite(Number(opts.phaseSec)) ? Number(opts.phaseSec) : 0;
  const autoDuck = normalizeAutoDuckParams(opts.autoDuck);
  const masterBus = normalizeMasterBusState(opts.masterBus);
  const tracks = doc && Array.isArray(doc.tracks) ? doc.tracks : [];
  const audioTracks = tracks.filter((trk) => trk && trk.kind === "audio");
  const fpsRate =
    doc && doc.fps ? Math.max(1, Number(doc.fps.num || 25) / Math.max(1, Number(doc.fps.den || 1))) : 25;

  const audibleAudioTracks = audioTracks.filter((trk) => !isTrackAudiblyMuted(trk, tracks));
  const allAudioMuted = masterBus.muted || (audioTracks.length > 0 && audibleAudioTracks.length === 0);
  const trackLevels = {};
  for (const trk of tracks) {
    const code = `${trk.kind === "audio" ? "A" : "V"}${trk.index}`;
    trackLevels[code] = -60;
  }

  if (!doc || !isPlaying || allAudioMuted || audibleAudioTracks.length === 0) {
    return {
      leftDb: -60,
      rightDb: -60,
      peakDb: -60,
      truePeakDbtp: -60,
      momentaryLufs: -70,
      leftLin: 0,
      rightLin: 0,
      duckReductionDb: 0,
      rackGrDb: 0,
      activeClipCount: 0,
      allAudioMuted,
      trackLevels
    };
  }

  let fgLeft = 0;
  let fgRight = 0;
  let bgLeft = 0;
  let bgRight = 0;
  let activeClipCount = 0;
  const tBase = frame / fpsRate + phaseSec * 0.15;

  for (const trk of audibleAudioTracks) {
    const code = `A${trk.index}`;
    const trkMix = normalizeTrackMixerState(trk);
    const trkGainLin = Math.pow(10, trkMix.volume_db / 20);
    const panLeft = Math.min(1.0, 1.0 - trkMix.pan);
    const panRight = Math.min(1.0, 1.0 + trkMix.pan);
    const isBed = isMusicBedTrack(trk, audioTracks);
    const isoScale = masterBus.voice_isolation ? (isBed ? 0.25 : 1.18) : 1.0;

    let trkPeakLin = 0;
    for (const clip of trk.clips || []) {
      if (clip.enabled === false) continue;
      if (frame < clip.start_frame || frame >= clip.start_frame + clip.duration_frames) continue;
      const env = evaluateClipFadeEnvelope(clip, frame, fpsRate);
      if (env <= 1e-6) continue;
      activeClipCount += 1;
      const norm = normalizeClipAudio(clip);
      const gainLin = Math.pow(10, norm.gainDb / 20) * trkGainLin * isoScale;
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

      const clipL = modL * gainLin * env * panLeft;
      const clipR = modR * gainLin * env * panRight;
      trkPeakLin = Math.max(trkPeakLin, clipL, clipR);
      if (isBed) {
        bgLeft += clipL;
        bgRight += clipR;
      } else {
        fgLeft += clipL;
        fgRight += clipR;
      }
    }
    trackLevels[code] = trkPeakLin > 1e-3 ? clampNum(20 * Math.log10(trkPeakLin), -60, 0) : -60;
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

  const masterDb = masterBus.volume_db + (masterBus.dim_enabled ? -20.0 : 0.0);
  const masterLin = Math.pow(10, masterDb / 20);
  let rawTotalL = (fgLeft + bgLeft) * masterLin;
  let rawTotalR = (fgRight + bgRight) * masterLin;
  let rackGrDb = 0;
  if (opts.fairlightRack && typeof opts.fairlightRack === "object") {
    const rack = normalizeFairlightAudioRackParams(opts.fairlightRack);
    if (rack.compressor.enabled) {
      const prePeak = Math.max(rawTotalL, rawTotalR);
      const preDb = prePeak > 1e-4 ? 20 * Math.log10(prePeak) : -60;
      const gr = estimateFairlightCompressorGrClient(rack.compressor, preDb);
      rackGrDb = gr;
      const compScale = Math.pow(10, (gr + rack.compressor.makeup_db) / 20);
      rawTotalL *= compScale;
      rawTotalR *= compScale;
    }
    if (rack.limiter.enabled) {
      const limLin = Math.pow(10, rack.limiter.ceiling_db / 20);
      const postPeak = Math.max(rawTotalL, rawTotalR);
      if (postPeak > limLin && postPeak > 1e-6) {
        const limScale = limLin / postPeak;
        rawTotalL *= limScale;
        rawTotalR *= limScale;
      }
    }
  }
  const totalL = clampNum(rawTotalL, 0, 1.0);
  const totalR = clampNum(rawTotalR, 0, 1.0);
  const leftDb = totalL > 1e-3 ? clampNum(20 * Math.log10(totalL), -60, 0) : -60;
  const rightDb = totalR > 1e-3 ? clampNum(20 * Math.log10(totalR), -60, 0) : -60;
  const peakDb = Math.max(leftDb, rightDb);
  const rawPeak = Math.max(rawTotalL, rawTotalR);
  const truePeakDbtp =
    rawPeak > 1e-3 ? clampNum(20 * Math.log10(rawPeak) + 0.4, -60, 3.0) : -60;
  const rmsEnergy = Math.sqrt(0.5 * (totalL * totalL + totalR * totalR));
  const momentaryLufs =
    rmsEnergy > 1e-3 ? clampNum(20 * Math.log10(rmsEnergy) - 3.2, -70, -1.0) : -70;

  return {
    leftDb,
    rightDb,
    peakDb,
    truePeakDbtp: Number(truePeakDbtp.toFixed(1)),
    momentaryLufs: Number(momentaryLufs.toFixed(1)),
    leftLin: totalL,
    rightLin: totalR,
    duckReductionDb,
    rackGrDb,
    activeClipCount,
    allAudioMuted,
    trackLevels
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
  const priority = { playhead: 5, marker: 4, clip_edge: 3, transient: 2.5, beat: 2, timeline_start: 1 };

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

  if (Array.isArray(opts.transientPeaks)) {
    for (const pk of opts.transientPeaks) {
      if (pk && Number.isFinite(Number(pk.frame))) {
        addTarget(Number(pk.frame), "transient");
      }
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
    retime_process: retimeNorm.retimeProcess,
    retime_ramp_preset: retimeNorm.rampPreset,
    retime_ramp_points: retimeNorm.rampPoints.map((pt) => ({ ...pt })),
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
    retime_process: retimeNorm.retimeProcess,
    retime_ramp_preset: retimeNorm.rampPreset,
    retime_ramp_points: retimeNorm.rampPoints.map((pt) => ({ ...pt })),
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

export function rippleDeleteClipInDocument(doc, trackKind, trackIndex, clipIndex, opts = {}) {
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
  const respectAvLink = Boolean(opts && opts.respectAvLink);
  const partnerInfo = respectAvLink ? _findLinkedPartnerInDoc(nextDoc, deletedClip) : null;
  const docStart = nextDoc.start_frame || 0;
  const delStart = deletedClip.start_frame;
  const delDur = Math.max(0, deletedClip.duration_frames || 0);
  const delEnd = delStart + delDur;

  trk.clips.splice(clipIndex, 1);
  if (partnerInfo && partnerInfo.trk !== trk && partnerInfo.clipIndex >= 0 && partnerInfo.clipIndex < partnerInfo.trk.clips.length) {
    partnerInfo.trk.clips.splice(partnerInfo.clipIndex, 1);
  }

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

  if (Boolean(trk.sync_locked) && delDur > 0 && Array.isArray(nextDoc.tracks)) {
    for (const otherTrk of nextDoc.tracks) {
      if (otherTrk === trk || !Boolean(otherTrk.sync_locked)) continue;
      otherTrk.clips = (otherTrk.clips || []).slice().sort(
        (a, b) => a.start_frame - b.start_frame || a.duration_frames - b.duration_frames
      );
      let prevEnd = docStart;
      for (const otherClip of otherTrk.clips) {
        if (otherClip.start_frame >= delEnd) {
          const targetStart = Math.max(docStart, prevEnd, otherClip.start_frame - delDur);
          if (targetStart !== otherClip.start_frame) {
            otherClip.start_frame = targetStart;
            shiftedCount += 1;
          }
        }
        prevEnd = Math.max(prevEnd, otherClip.start_frame + (otherClip.duration_frames || 0));
      }
    }
  }

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
  const nextProcess =
    patch.retime_process !== undefined
      ? normalizeRetimeProcess(patch.retime_process)
      : origNorm.retimeProcess;

  let nextPreset = origNorm.rampPreset;
  let nextPoints = origNorm.rampPoints;
  if (patch.retime_ramp_preset !== undefined && patch.retime_ramp_points === undefined) {
    nextPreset = normalizeRetimeRampPreset(patch.retime_ramp_preset);
    nextPoints = resolveRetimeRampPointsForPreset(nextPreset, []);
  } else if (patch.retime_ramp_points !== undefined) {
    nextPoints = normalizeRetimeRampPoints(patch.retime_ramp_points);
    nextPreset =
      patch.retime_ramp_preset !== undefined
        ? normalizeRetimeRampPreset(patch.retime_ramp_preset)
        : nextPoints.length >= 2
          ? "custom"
          : "constant";
  }

  const unchanged =
    Math.abs(nextSpeed - origNorm.speedRate) < 1e-6 &&
    nextReverse === origNorm.reverse &&
    nextProcess === origNorm.retimeProcess &&
    nextPreset === origNorm.rampPreset &&
    JSON.stringify(nextPoints) === JSON.stringify(origNorm.rampPoints);
  if (unchanged) {
    return { doc, clip: foundOrig.clip, changed: false };
  }

  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, trackKind, trackIndex, clipIndex);
  if (!found) return { doc, clip: null, changed: false };
  found.clip.speed_rate = nextSpeed;
  found.clip.reverse = nextReverse;
  found.clip.retime_process = nextProcess;
  found.clip.retime_ramp_preset = nextPreset;
  found.clip.retime_ramp_points = nextPoints;
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
    crop_left_pct: p.crop_left_pct !== undefined ? Number(p.crop_left_pct) : origNorm.crop_left_pct,
    crop_right_pct: p.crop_right_pct !== undefined ? Number(p.crop_right_pct) : origNorm.crop_right_pct,
    crop_top_pct: p.crop_top_pct !== undefined ? Number(p.crop_top_pct) : origNorm.crop_top_pct,
    crop_bottom_pct: p.crop_bottom_pct !== undefined ? Number(p.crop_bottom_pct) : origNorm.crop_bottom_pct,
    border_width_px: p.border_width_px !== undefined ? Number(p.border_width_px) : origNorm.border_width_px,
    border_color: p.border_color !== undefined ? p.border_color : origNorm.border_color,
    border_feather_px:
      p.border_feather_px !== undefined ? Number(p.border_feather_px) : origNorm.border_feather_px,
    shadow_opacity_pct:
      p.shadow_opacity_pct !== undefined ? Number(p.shadow_opacity_pct) : origNorm.shadow_opacity_pct,
    shadow_blur_px: p.shadow_blur_px !== undefined ? Number(p.shadow_blur_px) : origNorm.shadow_blur_px,
    shadow_offset_x_px:
      p.shadow_offset_x_px !== undefined ? Number(p.shadow_offset_x_px) : origNorm.shadow_offset_x_px,
    shadow_offset_y_px:
      p.shadow_offset_y_px !== undefined ? Number(p.shadow_offset_y_px) : origNorm.shadow_offset_y_px,
    shadow_color: p.shadow_color !== undefined ? p.shadow_color : origNorm.shadow_color,
    dynamic_zoom: p.dynamic_zoom !== undefined ? p.dynamic_zoom : origNorm.dynamic_zoom,
    keyframes: p.keyframes !== undefined ? p.keyframes : origNorm.keyframes
  };
  for (const numField of [
    "zoom_pct",
    "pos_x_pct",
    "pos_y_pct",
    "rotation_deg",
    "opacity_pct",
    "crop_left_pct",
    "crop_right_pct",
    "crop_top_pct",
    "crop_bottom_pct",
    "border_width_px",
    "border_feather_px",
    "shadow_opacity_pct",
    "shadow_blur_px",
    "shadow_offset_x_px",
    "shadow_offset_y_px"
  ]) {
    if (!Number.isFinite(nextRaw[numField])) {
      return { doc, clip: null, changed: false };
    }
  }
  if (
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
    Math.abs(nextNorm.crop_left_pct - origNorm.crop_left_pct) < 1e-4 &&
    Math.abs(nextNorm.crop_right_pct - origNorm.crop_right_pct) < 1e-4 &&
    Math.abs(nextNorm.crop_top_pct - origNorm.crop_top_pct) < 1e-4 &&
    Math.abs(nextNorm.crop_bottom_pct - origNorm.crop_bottom_pct) < 1e-4 &&
    Math.abs(nextNorm.border_width_px - origNorm.border_width_px) < 1e-4 &&
    nextNorm.border_color === origNorm.border_color &&
    Math.abs(nextNorm.border_feather_px - origNorm.border_feather_px) < 1e-4 &&
    Math.abs(nextNorm.shadow_opacity_pct - origNorm.shadow_opacity_pct) < 1e-4 &&
    Math.abs(nextNorm.shadow_blur_px - origNorm.shadow_blur_px) < 1e-4 &&
    Math.abs(nextNorm.shadow_offset_x_px - origNorm.shadow_offset_x_px) < 1e-4 &&
    Math.abs(nextNorm.shadow_offset_y_px - origNorm.shadow_offset_y_px) < 1e-4 &&
    nextNorm.shadow_color === origNorm.shadow_color &&
    nextNorm.dynamic_zoom === origNorm.dynamic_zoom &&
    JSON.stringify(nextNorm.keyframes) === JSON.stringify(origNorm.keyframes);
  if (unchanged) {
    return { doc, clip: foundOrig.clip, changed: false };
  }

  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, trackKind, trackIndex, clipIndex);
  if (!found) return { doc, clip: null, changed: false };
  found.clip.transform = isClipTransformIdentity(nextNorm) ? null : nextNorm;
  return { doc: nextDoc, clip: found.clip, changed: true };
}

export function upsertTransformKeyframeInDocument(
  doc,
  trackKind,
  trackIndex,
  clipIndex,
  paramName,
  keyframe,
  toleranceS = 0.02
) {
  if (!TRANSFORM_KEYFRAME_PARAMS.includes(paramName)) {
    return { doc, clip: null, changed: false };
  }
  const foundOrig = findTrackAndClip(doc, trackKind, trackIndex, clipIndex);
  if (!foundOrig) return { doc, clip: null, changed: false };
  const origNorm = normalizeClipTransform(foundOrig.clip);
  const lane = [...(origNorm.keyframes[paramName] || [])];
  const kf = normalizeTransformKeyframe(keyframe, paramName);
  const existingIdx = lane.findIndex((item) => Math.abs(item.time_s - kf.time_s) <= toleranceS);
  if (existingIdx >= 0) {
    lane[existingIdx] = kf;
  } else {
    if (lane.length >= MAX_TRANSFORM_KEYFRAMES_PER_PARAM) {
      return { doc, clip: foundOrig.clip, changed: false };
    }
    lane.push(kf);
  }
  const nextKeyframes = {
    ...origNorm.keyframes,
    [paramName]: lane
  };
  return updateClipTransformInDocument(doc, trackKind, trackIndex, clipIndex, {
    keyframes: nextKeyframes
  });
}

export function removeTransformKeyframeInDocument(
  doc,
  trackKind,
  trackIndex,
  clipIndex,
  paramName,
  timeS,
  toleranceS = 0.02
) {
  if (!TRANSFORM_KEYFRAME_PARAMS.includes(paramName)) {
    return { doc, clip: null, changed: false };
  }
  const foundOrig = findTrackAndClip(doc, trackKind, trackIndex, clipIndex);
  if (!foundOrig) return { doc, clip: null, changed: false };
  const origNorm = normalizeClipTransform(foundOrig.clip);
  const lane = (origNorm.keyframes[paramName] || []).filter(
    (item) => Math.abs(item.time_s - Number(timeS)) > toleranceS
  );
  if (lane.length === (origNorm.keyframes[paramName] || []).length) {
    return { doc, clip: foundOrig.clip, changed: false };
  }
  return updateClipTransformInDocument(doc, trackKind, trackIndex, clipIndex, {
    keyframes: {
      ...origNorm.keyframes,
      [paramName]: lane
    }
  });
}

export function clearTransformParamKeyframesInDocument(
  doc,
  trackKind,
  trackIndex,
  clipIndex,
  paramName
) {
  if (!TRANSFORM_KEYFRAME_PARAMS.includes(paramName)) {
    return { doc, clip: null, changed: false };
  }
  const foundOrig = findTrackAndClip(doc, trackKind, trackIndex, clipIndex);
  if (!foundOrig) return { doc, clip: null, changed: false };
  const origNorm = normalizeClipTransform(foundOrig.clip);
  if ((origNorm.keyframes[paramName] || []).length === 0) {
    return { doc, clip: foundOrig.clip, changed: false };
  }
  return updateClipTransformInDocument(doc, trackKind, trackIndex, clipIndex, {
    keyframes: {
      ...origNorm.keyframes,
      [paramName]: []
    }
  });
}

export function updateTransformKeyframeBezierInDocument(
  doc,
  trackKind,
  trackIndex,
  clipIndex,
  paramName,
  kfIndex,
  easing,
  bezier
) {
  if (!TRANSFORM_KEYFRAME_PARAMS.includes(paramName)) {
    return { doc, clip: null, changed: false };
  }
  const foundOrig = findTrackAndClip(doc, trackKind, trackIndex, clipIndex);
  if (!foundOrig) return { doc, clip: null, changed: false };
  const origNorm = normalizeClipTransform(foundOrig.clip);
  const lane = [...(origNorm.keyframes[paramName] || [])];
  if (kfIndex < 0 || kfIndex >= lane.length) {
    return { doc, clip: foundOrig.clip, changed: false };
  }
  const current = lane[kfIndex];
  lane[kfIndex] = normalizeTransformKeyframe(
    {
      time_s: current.time_s,
      value: current.value,
      easing: easing || current.easing,
      bezier: bezier || current.bezier
    },
    paramName
  );
  return updateClipTransformInDocument(doc, trackKind, trackIndex, clipIndex, {
    keyframes: {
      ...origNorm.keyframes,
      [paramName]: lane
    }
  });
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

export const MEDIA_POOL_TYPES = Object.freeze(["all", "video", "audio", "title", "stills"]);

export function classifyMediaPoolEntry(entry) {
  if (!entry || typeof entry !== "object") return "video";
  const trackKind = entry.trackKind === "audio" || entry.media_type === "audio" ? "audio" : "video";
  if (trackKind === "audio") return "audio";
  const trackIndex = Number.isFinite(Number(entry.trackIndex ?? entry.track_index))
    ? Number(entry.trackIndex ?? entry.track_index)
    : 1;
  const label = String(entry.label ?? entry.name ?? "");
  const sourcePath = String(entry.sourcePath ?? entry.source_path ?? "");
  if (
    trackIndex >= 2 ||
    /\b(gfx|title|lower[_-]?third|subtitle|caption)\b/i.test(label) ||
    /^gfx\//i.test(sourcePath)
  ) {
    return "title";
  }
  return "video";
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
  const rawType = typeof opts.mediaType === "string" ? opts.mediaType.trim().toLowerCase() : "all";
  const typeFilter = rawType === "titles" ? "title" : rawType || "all";

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
      const sourcePath = typeof clip.source_path === "string" ? clip.source_path : "";
      const mediaCategory = classifyMediaPoolEntry({
        trackKind,
        trackIndex,
        label,
        sourcePath
      });

      if (colorFilter.active && labelColor !== colorFilter.colorId) {
        continue;
      }
      if (typeFilter !== "all" && mediaCategory !== typeFilter) {
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

export function filterMediaPoolEntries(doc, options = {}) {
  const opts = options && typeof options === "object" ? options : {};
  const rawType = typeof opts.mediaType === "string" ? opts.mediaType.trim().toLowerCase() : "all";
  const activeType = rawType === "titles" ? "title" : MEDIA_POOL_TYPES.includes(rawType) ? rawType : "all";
  const queryNeedle = typeof opts.query === "string" ? opts.query.trim().toLowerCase() : "";
  const stills = Array.isArray(opts.stills) ? opts.stills : [];

  const allClips = filterTimelineClips(doc, { labelColor: opts.labelColor });
  const counts = {
    all: allClips.length,
    video: 0,
    audio: 0,
    title: 0,
    stills: stills.length
  };
  for (const entry of allClips) {
    const cat = classifyMediaPoolEntry(entry);
    if (cat === "audio") counts.audio += 1;
    else if (cat === "title") counts.title += 1;
    else counts.video += 1;
  }

  if (activeType === "stills") {
    const filteredStills = stills.filter((s) => {
      if (!s || typeof s !== "object") return false;
      if (!queryNeedle) return true;
      const hay = `${s.label || ""} ${s.preset || ""} ${s.filename || ""}`.toLowerCase();
      return hay.includes(queryNeedle);
    });
    return {
      activeType,
      items: filteredStills,
      clipItems: [],
      stillItems: filteredStills,
      totalClipCount: allClips.length,
      counts
    };
  }

  const clipItems = filterTimelineClips(doc, {
    query: opts.query,
    labelColor: opts.labelColor,
    mediaType: activeType
  }).map((entry) => ({
    ...entry,
    mediaCategory: classifyMediaPoolEntry(entry)
  }));
  return {
    activeType,
    items: clipItems,
    clipItems,
    stillItems: [],
    totalClipCount: allClips.length,
    counts
  };
}

export function findNearestEditPointForTrack(doc, trackKind, trackIndex, playheadFrame) {
  if (!doc || !Array.isArray(doc.tracks)) {
    return Math.max(0, Math.round(Number(playheadFrame) || 0));
  }
  const docStart = Number.isFinite(Number(doc.start_frame)) ? Math.round(Number(doc.start_frame)) : 0;
  const ph = Math.max(docStart, Math.round(Number(playheadFrame) || 0));
  const kind = trackKind === "audio" ? "audio" : "video";
  const idx = Number.isFinite(Number(trackIndex)) ? Number(trackIndex) : 1;
  const trk =
    doc.tracks.find((t) => t && t.kind === kind && Number(t.index) === idx) ||
    doc.tracks.find((t) => t && t.kind === kind);

  const boundaries = new Set([docStart]);
  if (trk && Array.isArray(trk.clips)) {
    for (const c of trk.clips) {
      if (!c) continue;
      const s = Number.isFinite(Number(c.start_frame)) ? Math.round(Number(c.start_frame)) : docStart;
      const d = Number.isFinite(Number(c.duration_frames)) ? Math.max(0, Math.round(Number(c.duration_frames))) : 0;
      boundaries.add(Math.max(docStart, s));
      boundaries.add(Math.max(docStart, s + d));
    }
  }
  let best = docStart;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const b of boundaries) {
    const dist = Math.abs(b - ph);
    if (dist < bestDist || (dist === bestDist && b < best)) {
      bestDist = dist;
      best = b;
    }
  }
  return best;
}

function _resolveBinSourceClip(doc, sourceClipOrEntry) {
  if (!doc || !Array.isArray(doc.tracks) || !sourceClipOrEntry) return null;
  if (
    sourceClipOrEntry.trackKind !== undefined &&
    sourceClipOrEntry.trackIndex !== undefined &&
    sourceClipOrEntry.clipIndex !== undefined
  ) {
    const found = findTrackAndClip(
      doc,
      sourceClipOrEntry.trackKind,
      sourceClipOrEntry.trackIndex,
      sourceClipOrEntry.clipIndex
    );
    if (found) {
      return {
        trackKind: sourceClipOrEntry.trackKind === "audio" ? "audio" : "video",
        trackIndex: Number(found.trk.index) || 1,
        clip: found.clip
      };
    }
  }
  const kind =
    sourceClipOrEntry.trackKind === "audio" || sourceClipOrEntry.media_type === "audio"
      ? "audio"
      : "video";
  const tIdx = Number.isFinite(Number(sourceClipOrEntry.trackIndex ?? sourceClipOrEntry.track_index))
    ? Number(sourceClipOrEntry.trackIndex ?? sourceClipOrEntry.track_index)
    : 1;
  return {
    trackKind: kind,
    trackIndex: tIdx,
    clip: {
      name: String(sourceClipOrEntry.label ?? sourceClipOrEntry.name ?? "Clip"),
      track_index: tIdx,
      media_type: kind,
      start_frame: Number(sourceClipOrEntry.startFrames ?? sourceClipOrEntry.start_frame ?? 0),
      duration_frames: Math.max(
        1,
        Math.round(Number(sourceClipOrEntry.durationFrames ?? sourceClipOrEntry.duration_frames ?? 75))
      ),
      source_in_frame: Number(sourceClipOrEntry.source_in_frame ?? 0),
      source_path: sourceClipOrEntry.sourcePath ?? sourceClipOrEntry.source_path ?? null,
      media_ref: sourceClipOrEntry.media_ref ?? null,
      source_fps: sourceClipOrEntry.source_fps ?? null,
      label_color: sourceClipOrEntry.labelColor ?? sourceClipOrEntry.label_color ?? "default"
    }
  };
}

function _buildInsertedClipClone(nextDoc, srcClip, trackKind, trackIndex, insertFrame) {
  const usedIds = new Set();
  for (const trk of nextDoc.tracks || []) {
    for (const c of trk.clips || []) {
      if (c && c.id != null && String(c.id) !== "") usedIds.add(String(c.id));
    }
  }
  const baseSlug = String(srcClip.name || "Clip")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "Clip";
  let seq = 1;
  let nextId = `${baseSlug}_cut_${seq}`;
  while (usedIds.has(nextId)) {
    seq += 1;
    nextId = `${baseSlug}_cut_${seq}`;
  }
  const cloned = cloneTimelineDoc(srcClip);
  cloned.id = nextId;
  cloned.track_index = trackIndex;
  cloned.media_type = trackKind;
  cloned.start_frame = insertFrame;
  cloned.duration_frames = Math.max(1, Math.round(Number(srcClip.duration_frames) || 75));
  cloned.enabled = srcClip.enabled !== false;
  cloned.transition_out = null;
  return cloned;
}

export function insertClipAtFrameInDocument(doc, sourceClipOrEntry, targetFrame, opts = {}) {
  if (!doc || !Array.isArray(doc.tracks) || !sourceClipOrEntry) {
    return { doc, insertedClip: null, insertFrame: 0, shiftedCount: 0, changed: false };
  }
  const resolved = _resolveBinSourceClip(doc, sourceClipOrEntry);
  if (!resolved) {
    return { doc, insertedClip: null, insertFrame: 0, shiftedCount: 0, changed: false };
  }

  const nextDoc = cloneTimelineDoc(doc);
  const trk =
    nextDoc.tracks.find(
      (t) => t && t.kind === resolved.trackKind && Number(t.index) === resolved.trackIndex
    ) || nextDoc.tracks.find((t) => t && t.kind === resolved.trackKind);
  if (!trk) {
    return { doc, insertedClip: null, insertFrame: 0, shiftedCount: 0, changed: false };
  }
  if (!Array.isArray(trk.clips)) trk.clips = [];

  const docStart = Number.isFinite(Number(nextDoc.start_frame)) ? Math.round(Number(nextDoc.start_frame)) : 0;
  const insertFrame = Math.max(docStart, Math.round(Number(targetFrame) || docStart));
  const fpsRate = nextDoc.fps ? Math.max(1, nextDoc.fps.num / Math.max(1, nextDoc.fps.den)) : 25;
  const newClip = _buildInsertedClipClone(
    nextDoc,
    resolved.clip,
    trk.kind === "audio" ? "audio" : "video",
    Number(trk.index) || 1,
    insertFrame
  );
  const insertDur = newClip.duration_frames;
  const ripple = opts.ripple !== false;

  if (ripple) {
    const nextClips = [];
    const splitRightClips = new Set();
    for (const c of trk.clips) {
      if (!c) continue;
      const cStart = Math.round(Number(c.start_frame) || 0);
      const cDur = Math.max(0, Math.round(Number(c.duration_frames) || 0));
      const cEnd = cStart + cDur;
      if (insertFrame > cStart && insertFrame < cEnd) {
        const { leftClip, rightClip } = _buildSplitClipPair(c, insertFrame, nextDoc.fps, fpsRate);
        rightClip.start_frame = insertFrame + insertDur;
        splitRightClips.add(rightClip);
        nextClips.push(leftClip, rightClip);
      } else {
        nextClips.push(c);
      }
    }
    let shiftedCount = 0;
    for (const c of nextClips) {
      if (splitRightClips.has(c)) {
        shiftedCount += 1;
        continue;
      }
      if (c.start_frame >= insertFrame) {
        c.start_frame += insertDur;
        shiftedCount += 1;
      }
    }
    nextClips.push(newClip);
    nextClips.sort((a, b) => a.start_frame - b.start_frame || a.duration_frames - b.duration_frames);
    trk.clips = nextClips;
    return {
      doc: nextDoc,
      insertedClip: newClip,
      insertFrame,
      shiftedCount,
      trackKind: trk.kind,
      trackIndex: Number(trk.index) || 1,
      changed: true
    };
  }

  trk.clips.push(newClip);
  trk.clips.sort((a, b) => a.start_frame - b.start_frame || a.duration_frames - b.duration_frames);
  return {
    doc: nextDoc,
    insertedClip: newClip,
    insertFrame,
    shiftedCount: 0,
    trackKind: trk.kind,
    trackIndex: Number(trk.index) || 1,
    changed: true
  };
}

export function smartInsertClipInDocument(doc, sourceClipOrEntry, playheadFrame) {
  if (!doc || !Array.isArray(doc.tracks) || !sourceClipOrEntry) {
    return { doc, insertedClip: null, insertFrame: 0, nearestEditFrame: 0, shiftedCount: 0, changed: false };
  }
  const resolved = _resolveBinSourceClip(doc, sourceClipOrEntry);
  if (!resolved) {
    return { doc, insertedClip: null, insertFrame: 0, nearestEditFrame: 0, shiftedCount: 0, changed: false };
  }
  const nearestEditFrame = findNearestEditPointForTrack(
    doc,
    resolved.trackKind,
    resolved.trackIndex,
    playheadFrame
  );
  const res = insertClipAtFrameInDocument(doc, sourceClipOrEntry, nearestEditFrame, { ripple: true });
  return { ...res, nearestEditFrame };
}

export function appendClipToTrackInDocument(doc, sourceClipOrEntry) {
  if (!doc || !Array.isArray(doc.tracks) || !sourceClipOrEntry) {
    return { doc, insertedClip: null, insertFrame: 0, shiftedCount: 0, changed: false };
  }
  const resolved = _resolveBinSourceClip(doc, sourceClipOrEntry);
  if (!resolved) {
    return { doc, insertedClip: null, insertFrame: 0, shiftedCount: 0, changed: false };
  }
  const docStart = Number.isFinite(Number(doc.start_frame)) ? Math.round(Number(doc.start_frame)) : 0;
  const trk =
    doc.tracks.find(
      (t) => t && t.kind === resolved.trackKind && Number(t.index) === resolved.trackIndex
    ) || doc.tracks.find((t) => t && t.kind === resolved.trackKind);
  let trackEnd = docStart;
  if (trk && Array.isArray(trk.clips)) {
    for (const c of trk.clips) {
      if (!c) continue;
      const endF = (Number(c.start_frame) || docStart) + Math.max(0, Number(c.duration_frames) || 0);
      if (endF > trackEnd) trackEnd = endF;
    }
  }
  return insertClipAtFrameInDocument(doc, sourceClipOrEntry, trackEnd, { ripple: false });
}

export function buildSourceTapeSegments(entries, fps = 25) {
  const list = Array.isArray(entries) ? entries : [];
  let cursor = 0;
  const segments = [];
  for (const entry of list) {
    if (!entry) continue;
    const dur = Math.max(1, Math.round(Number(entry.durationFrames) || 0));
    const tapeStartFrame = cursor;
    const tapeEndFrame = cursor + dur;
    segments.push({
      entry,
      tapeStartFrame,
      tapeEndFrame,
      durationFrames: dur,
      tapeStartTc: framesToSmpteTimecode(tapeStartFrame, fps),
      tapeEndTc: framesToSmpteTimecode(tapeEndFrame, fps)
    });
    cursor = tapeEndFrame;
  }
  return {
    totalFrames: cursor,
    totalTimecode: framesToSmpteTimecode(cursor, fps),
    segments
  };
}

export function resolveSourceTapeFrame(tape, tapeFrame) {
  if (!tape || !Array.isArray(tape.segments) || tape.segments.length === 0) {
    return null;
  }
  const clamped = Math.max(0, Math.min(Math.max(0, tape.totalFrames - 1), Math.round(Number(tapeFrame) || 0)));
  let activeSeg = tape.segments[tape.segments.length - 1];
  for (const seg of tape.segments) {
    if (clamped >= seg.tapeStartFrame && clamped < seg.tapeEndFrame) {
      activeSeg = seg;
      break;
    }
  }
  const localOffset = Math.max(0, clamped - activeSeg.tapeStartFrame);
  const timelineFrame = activeSeg.entry.startFrames + Math.min(activeSeg.durationFrames, localOffset);
  return {
    tapeFrame: clamped,
    segment: activeSeg,
    timelineFrame
  };
}

export function computeTimelineZoomViewport(
  startFrame,
  maxFrame,
  zoom = 1,
  anchorFrame = null,
  currentViewStart = null
) {
  const s = Number.isFinite(Number(startFrame)) ? Number(startFrame) : 0;
  const m = Number.isFinite(Number(maxFrame)) ? Math.max(s + 25, Number(maxFrame)) : s + 25;
  const spanFrames = Math.max(25, m - s);
  const z = Math.max(1, Math.min(6, Number(zoom) || 1));
  const visibleSpan = spanFrames / z;
  const maxViewStart = Math.max(s, s + spanFrames - visibleSpan);

  let viewStart =
    currentViewStart !== null && Number.isFinite(Number(currentViewStart))
      ? Number(currentViewStart)
      : s;

  if (anchorFrame !== null && Number.isFinite(Number(anchorFrame))) {
    const anchor = Math.max(s, Math.min(s + spanFrames, Number(anchorFrame)));
    if (currentViewStart === null || anchor < viewStart || anchor > viewStart + visibleSpan) {
      viewStart = anchor - visibleSpan * 0.5;
    }
  }

  viewStart = Math.max(s, Math.min(maxViewStart, viewStart));
  return {
    startFrame: s,
    maxFrame: s + spanFrames,
    spanFrames,
    visibleSpan,
    zoom: z,
    viewStartFrame: viewStart,
    viewEndFrame: viewStart + visibleSpan
  };
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

export function toggleTrackArmInDocument(doc, trackKind, trackIndex) {
  if (!doc || !Array.isArray(doc.tracks)) return { doc, track: null, changed: false };
  const nextDoc = cloneTimelineDoc(doc);
  const trk = nextDoc.tracks.find((t) => t.kind === trackKind && t.index === trackIndex);
  if (!trk) return { doc, track: null, changed: false };
  trk.rec_armed = !Boolean(trk.rec_armed);
  return { doc: nextDoc, track: trk, changed: true };
}

export function updateTrackMixerInDocument(doc, trackKind, trackIndex, patch = {}) {
  if (!doc || !Array.isArray(doc.tracks)) return { doc, track: null, changed: false };
  const nextDoc = cloneTimelineDoc(doc);
  const trk = nextDoc.tracks.find((t) => t.kind === trackKind && t.index === trackIndex);
  if (!trk) return { doc, track: null, changed: false };
  const cur = normalizeTrackMixerState(trk);
  const next = normalizeTrackMixerState({ ...cur, ...patch });
  const changed =
    Math.abs(next.volume_db - cur.volume_db) > 1e-6 ||
    Math.abs(next.pan - cur.pan) > 1e-6 ||
    next.muted !== cur.muted ||
    next.solo !== cur.solo ||
    next.rec_armed !== cur.rec_armed;
  if (!changed) return { doc, track: trk, changed: false };
  trk.volume_db = next.volume_db;
  trk.pan = next.pan;
  trk.muted = next.muted;
  trk.solo = next.solo;
  trk.rec_armed = next.rec_armed;
  return { doc: nextDoc, track: trk, changed: true };
}

export function resetAllTracksMixerInDocument(doc) {
  if (!doc || !Array.isArray(doc.tracks)) return { doc, changed: false };
  const nextDoc = cloneTimelineDoc(doc);
  let changed = false;
  for (const trk of nextDoc.tracks) {
    const cur = normalizeTrackMixerState(trk);
    if (
      Math.abs(cur.volume_db) > 1e-6 ||
      Math.abs(cur.pan) > 1e-6 ||
      cur.muted ||
      cur.solo ||
      cur.rec_armed
    ) {
      trk.volume_db = 0.0;
      trk.pan = 0.0;
      trk.muted = false;
      trk.solo = false;
      trk.rec_armed = false;
      changed = true;
    }
  }
  return { doc: changed ? nextDoc : doc, changed };
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
  } else if (/dnxhr|dnxhd/.test(rawCodec)) {
    codecKind = "dnxhr";
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

  if (codecKind === "prores" || codecKind === "dnxhr") {
    const isHq = /hq/.test(rawCodec);
    const baseMezzanineKbps = codecKind === "dnxhr" ? 145000 : isHq ? 184000 : 113696;
    videoBitrateKbps = Math.max(1000, Math.round(baseMezzanineKbps * resScale * (fpsVal / 25)));
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
// ---------------------------------------------------------------------------
// DaVinci Resolve Serial Color Node Tree & 3D .cube LUT Pipeline
// ---------------------------------------------------------------------------

export const MAX_COLOR_NODES = 8;

function clampUnitColor(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function clampBalanceColor(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return n < -1 ? -1 : n > 1 ? 1 : n;
}

export function createNeutralColorGrade() {
  return {
    lift: [0.0, 0.0, 0.0],
    gamma: [0.0, 0.0, 0.0],
    gain: [0.0, 0.0, 0.0],
    contrast: 1.0,
    saturation: 1.0,
    temperature: 0.0,
    preserve_lightness: false
  };
}

export function normalizeColorGrade(raw) {
  const g = raw && typeof raw === "object" ? raw : {};
  const normTriplet = (arr) =>
    Array.isArray(arr) && arr.length === 3
      ? [clampBalanceColor(arr[0]), clampBalanceColor(arr[1]), clampBalanceColor(arr[2])]
      : [0.0, 0.0, 0.0];
  const rawContrast = Number(g.contrast);
  const rawSat = Number(g.saturation);
  const rawTemp = Number(g.temperature);
  return {
    lift: normTriplet(g.lift),
    gamma: normTriplet(g.gamma),
    gain: normTriplet(g.gain),
    contrast: Number.isFinite(rawContrast) ? clampNum(rawContrast, 0.0, 2.0) : 1.0,
    saturation: Number.isFinite(rawSat) ? clampNum(rawSat, 0.0, 3.0) : 1.0,
    temperature: Number.isFinite(rawTemp) ? clampNum(rawTemp, -1.0, 1.0) : 0.0,
    preserve_lightness: Boolean(g.preserve_lightness)
  };
}

export function isColorGradeIdentity(grade) {
  const g = normalizeColorGrade(grade);
  return (
    g.lift.every((v) => Math.abs(v) < 1e-6) &&
    g.gamma.every((v) => Math.abs(v) < 1e-6) &&
    g.gain.every((v) => Math.abs(v) < 1e-6) &&
    Math.abs(g.contrast - 1.0) < 1e-6 &&
    Math.abs(g.saturation - 1.0) < 1e-6 &&
    Math.abs(g.temperature) < 1e-6
  );
}

export function applyColorGradeRgbPure(r, g, b, grade) {
  const norm = normalizeColorGrade(grade);
  const tempR = norm.temperature * 0.25;
  const tempG = norm.temperature * 0.03;
  const tempB = -norm.temperature * 0.28;

  const shadows = [
    clampBalanceColor(norm.lift[0]),
    clampBalanceColor(norm.lift[1]),
    clampBalanceColor(norm.lift[2])
  ];
  const midtones = [
    clampBalanceColor(norm.gamma[0] + tempR),
    clampBalanceColor(norm.gamma[1] + tempG),
    clampBalanceColor(norm.gamma[2] + tempB)
  ];
  const highlights = [
    clampBalanceColor(norm.gain[0] + tempR * 0.8),
    clampBalanceColor(norm.gain[1] + tempG * 0.8),
    clampBalanceColor(norm.gain[2] + tempB * 0.8)
  ];

  const chs = [r, g, b];
  const out = [0, 0, 0];
  for (let idx = 0; idx < 3; idx++) {
    const v = clampUnitColor(chs[idx]);
    const wS = clampUnitColor(1.0 - v / 0.55);
    const wM = clampUnitColor(1.0 - Math.abs(v - 0.5) / 0.5);
    const wH = clampUnitColor((v - 0.45) / 0.55);
    const balanced =
      v +
      (shadows[idx] * wS * 0.45 +
        midtones[idx] * wM * 0.40 +
        highlights[idx] * wH * 0.45);
    out[idx] = clampUnitColor((balanced - 0.5) * norm.contrast + 0.5);
  }

  let sr = out[0];
  let sg = out[1];
  let sb = out[2];
  if (Math.abs(norm.saturation - 1.0) > 1e-6) {
    const luma = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
    sr = luma + norm.saturation * (sr - luma);
    sg = luma + norm.saturation * (sg - luma);
    sb = luma + norm.saturation * (sb - luma);
  }
  return [clampUnitColor(sr), clampUnitColor(sg), clampUnitColor(sb)];
}

export function parseCubeLutTextClient(rawText, fallbackTitle = "Imported LUT") {
  if (typeof rawText !== "string" || !rawText.trim()) {
    throw new Error("Empty .cube LUT content");
  }
  let title = "";
  let size1d = null;
  let size3d = null;
  let domainMin = [0.0, 0.0, 0.0];
  let domainMax = [1.0, 1.0, 1.0];
  const table = [];

  const lines = rawText.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;
    const upper = line.toUpperCase();
    if (upper.startsWith("TITLE")) {
      title = line.slice(5).trim().replace(/^"+|"+$/g, "");
    } else if (upper.startsWith("LUT_1D_SIZE")) {
      size1d = Number.parseInt(line.split(/\s+/)[1], 10);
    } else if (upper.startsWith("LUT_3D_SIZE")) {
      size3d = Number.parseInt(line.split(/\s+/)[1], 10);
    } else if (upper.startsWith("DOMAIN_MIN")) {
      const parts = line.split(/\s+/).slice(1, 4).map(Number);
      if (parts.length !== 3 || parts.some((v) => !Number.isFinite(v))) {
        throw new Error(`Invalid DOMAIN_MIN at line ${i + 1}`);
      }
      domainMin = parts;
    } else if (upper.startsWith("DOMAIN_MAX")) {
      const parts = line.split(/\s+/).slice(1, 4).map(Number);
      if (parts.length !== 3 || parts.some((v) => !Number.isFinite(v))) {
        throw new Error(`Invalid DOMAIN_MAX at line ${i + 1}`);
      }
      domainMax = parts;
    } else if (upper.startsWith("LUT_1D_INPUT_RANGE") || upper.startsWith("LUT_3D_INPUT_RANGE")) {
      continue;
    } else {
      const parts = line.split(/\s+/);
      if (parts.length !== 3) {
        throw new Error(`Expected RGB triplet at line ${i + 1}`);
      }
      const r = Number(parts[0]);
      const g = Number(parts[1]);
      const b = Number(parts[2]);
      if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
        throw new Error(`Non-finite LUT value at line ${i + 1}`);
      }
      table.push([r, g, b]);
    }
  }

  if ((size1d === null) === (size3d === null)) {
    throw new Error("LUT must declare exactly one of LUT_1D_SIZE or LUT_3D_SIZE");
  }
  const dimension = size3d !== null ? "3D" : "1D";
  const size = size3d !== null ? size3d : size1d;
  if (!Number.isInteger(size) || size < 2 || (dimension === "3D" ? size > 65 : size > 4096)) {
    throw new Error(`Unsupported ${dimension} LUT size: ${size}`);
  }
  const expected = dimension === "3D" ? size * size * size : size;
  if (table.length !== expected) {
    throw new Error(`Expected ${expected} entries for ${dimension} size ${size}, found ${table.length}`);
  }
  for (let ch = 0; ch < 3; ch++) {
    if (domainMin[ch] >= domainMax[ch]) {
      throw new Error("Invalid LUT domain bounds");
    }
  }
  return {
    title: title || fallbackTitle,
    dimension,
    size,
    domainMin,
    domainMax,
    entryCount: table.length,
    mix: 1.0,
    table
  };
}

export function applyCubeLutRgbClient(r, g, b, lut, mixOverride = null) {
  const inR = clampUnitColor(r);
  const inG = clampUnitColor(g);
  const inB = clampUnitColor(b);
  if (!lut || !Array.isArray(lut.table) || lut.table.length === 0 || !lut.size) {
    return [inR, inG, inB];
  }
  const mixRaw = mixOverride !== null && mixOverride !== undefined ? mixOverride : lut.mix;
  const mix = clampUnitColor(mixRaw !== undefined ? mixRaw : 1.0);
  if (mix <= 1e-6 || lut.size < 2) {
    return [inR, inG, inB];
  }

  const dMin = Array.isArray(lut.domainMin) && lut.domainMin.length === 3 ? lut.domainMin : [0, 0, 0];
  const dMax = Array.isArray(lut.domainMax) && lut.domainMax.length === 3 ? lut.domainMax : [1, 1, 1];
  const nr = clampUnitColor((inR - dMin[0]) / Math.max(1e-8, dMax[0] - dMin[0]));
  const ng = clampUnitColor((inG - dMin[1]) / Math.max(1e-8, dMax[1] - dMin[1]));
  const nb = clampUnitColor((inB - dMin[2]) / Math.max(1e-8, dMax[2] - dMin[2]));

  let lr;
  let lg;
  let lb;
  const size = lut.size;
  const maxIdx = size - 1;
  const table = lut.table;

  if (lut.dimension === "1D") {
    const interp1d = (normV, chIdx) => {
      const pos = normV * maxIdx;
      const i0 = Math.min(maxIdx, Math.max(0, Math.floor(pos)));
      const i1 = Math.min(maxIdx, i0 + 1);
      const f = pos - i0;
      const v0 = table[i0][chIdx];
      const v1 = table[i1][chIdx];
      return v0 + (v1 - v0) * f;
    };
    lr = interp1d(nr, 0);
    lg = interp1d(ng, 1);
    lb = interp1d(nb, 2);
  } else {
    const fr = nr * maxIdx;
    const fg = ng * maxIdx;
    const fb = nb * maxIdx;
    const r0 = Math.min(maxIdx, Math.max(0, Math.floor(fr)));
    const g0 = Math.min(maxIdx, Math.max(0, Math.floor(fg)));
    const b0 = Math.min(maxIdx, Math.max(0, Math.floor(fb)));
    const r1 = Math.min(maxIdx, r0 + 1);
    const g1 = Math.min(maxIdx, g0 + 1);
    const b1 = Math.min(maxIdx, b0 + 1);
    const dr = fr - r0;
    const dg = fg - g0;
    const db = fb - b0;

    const c000 = table[r0 + size * (g0 + size * b0)];
    const c100 = table[r1 + size * (g0 + size * b0)];
    const c010 = table[r0 + size * (g1 + size * b0)];
    const c110 = table[r1 + size * (g1 + size * b0)];
    const c001 = table[r0 + size * (g0 + size * b1)];
    const c101 = table[r1 + size * (g0 + size * b1)];
    const c011 = table[r0 + size * (g1 + size * b1)];
    const c111 = table[r1 + size * (g1 + size * b1)];

    const mixCh = (ch) => {
      const c00 = c000[ch] * (1 - dr) + c100[ch] * dr;
      const c10 = c010[ch] * (1 - dr) + c110[ch] * dr;
      const c01 = c001[ch] * (1 - dr) + c101[ch] * dr;
      const c11 = c011[ch] * (1 - dr) + c111[ch] * dr;
      const c0 = c00 * (1 - dg) + c10 * dg;
      const c1 = c01 * (1 - dg) + c11 * dg;
      return c0 * (1 - db) + c1 * db;
    };
    lr = mixCh(0);
    lg = mixCh(1);
    lb = mixCh(2);
  }

  return [
    clampUnitColor(inR + (lr - inR) * mix),
    clampUnitColor(inG + (lg - inG) * mix),
    clampUnitColor(inB + (lb - inB) * mix)
  ];
}

function normalizeNodeLut(rawLut) {
  if (!rawLut || typeof rawLut !== "object") return null;
  if (!Array.isArray(rawLut.table) || rawLut.table.length === 0 || !rawLut.size) return null;
  const dimension = rawLut.dimension === "1D" ? "1D" : "3D";
  const size = Number(rawLut.size);
  const expected = dimension === "3D" ? size * size * size : size;
  if (!Number.isInteger(size) || rawLut.table.length !== expected) return null;
  return {
    title: String(rawLut.title || "Imported LUT").slice(0, 64),
    dimension,
    size,
    domainMin:
      Array.isArray(rawLut.domainMin) && rawLut.domainMin.length === 3
        ? rawLut.domainMin.map(Number)
        : [0.0, 0.0, 0.0],
    domainMax:
      Array.isArray(rawLut.domainMax) && rawLut.domainMax.length === 3
        ? rawLut.domainMax.map(Number)
        : [1.0, 1.0, 1.0],
    entryCount: rawLut.table.length,
    mix: clampUnitColor(rawLut.mix !== undefined ? rawLut.mix : 1.0),
    table: rawLut.table
  };
}

export const POWER_WINDOW_SHAPES = ["off", "circle", "linear", "gradient"];

export const POWER_WINDOW_DEFAULTS = {
  shape: "off",
  center_x: 0.5,
  center_y: 0.5,
  width: 0.45,
  height: 0.45,
  rotation_deg: 0.0,
  softness: 0.12,
  invert: false
};

function clampPwNum(raw, min, max, fallback) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function smoothstepUnit(edge0, edge1, x) {
  if (edge1 <= edge0) return x >= edge1 ? 1.0 : 0.0;
  const t = clampUnitColor((x - edge0) / (edge1 - edge0));
  return t * t * (3.0 - 2.0 * t);
}

export function createDefaultPowerWindow(overrides = {}) {
  return normalizePowerWindow({ ...POWER_WINDOW_DEFAULTS, ...overrides });
}

export function normalizePowerWindow(raw) {
  const pw = raw && typeof raw === "object" ? raw : {};
  const shapeRaw = typeof pw.shape === "string" ? pw.shape.trim().toLowerCase() : "off";
  const shape = POWER_WINDOW_SHAPES.includes(shapeRaw) ? shapeRaw : "off";
  return {
    shape,
    center_x: clampPwNum(pw.center_x, 0.0, 1.0, POWER_WINDOW_DEFAULTS.center_x),
    center_y: clampPwNum(pw.center_y, 0.0, 1.0, POWER_WINDOW_DEFAULTS.center_y),
    width: clampPwNum(pw.width, 0.05, 1.0, POWER_WINDOW_DEFAULTS.width),
    height: clampPwNum(pw.height, 0.05, 1.0, POWER_WINDOW_DEFAULTS.height),
    rotation_deg: clampPwNum(pw.rotation_deg, -180.0, 180.0, POWER_WINDOW_DEFAULTS.rotation_deg),
    softness: clampPwNum(pw.softness, 0.0, 0.5, POWER_WINDOW_DEFAULTS.softness),
    invert: Boolean(pw.invert)
  };
}

export function isPowerWindowActive(pw) {
  return Boolean(pw && pw.shape && pw.shape !== "off");
}

export function evaluatePowerWindowMask(pwRaw, u, v) {
  const pw = normalizePowerWindow(pwRaw);
  if (pw.shape === "off") return 1.0;
  const rad = -(pw.rotation_deg * Math.PI) / 180.0;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const ux = u - pw.center_x;
  const vy = v - pw.center_y;
  const dx = ux * cosA - vy * sinA;
  const dy = ux * sinA + vy * cosA;

  let raw = 1.0;
  if (pw.shape === "circle") {
    const rx = Math.max(0.025, pw.width * 0.5);
    const ry = Math.max(0.025, pw.height * 0.5);
    const d = Math.hypot(dx / rx, dy / ry);
    const s = pw.softness * 2.0;
    const inner = Math.max(0.0, 1.0 - s * 0.5);
    const outer = Math.max(inner + 1e-4, 1.0 + s * 0.5);
    raw = 1.0 - smoothstepUnit(inner, outer, d);
  } else if (pw.shape === "linear") {
    const hx = Math.max(0.025, pw.width * 0.5);
    const hy = Math.max(0.025, pw.height * 0.5);
    const qx = Math.abs(dx) - hx;
    const qy = Math.abs(dy) - hy;
    const sd = Math.hypot(Math.max(qx, 0.0), Math.max(qy, 0.0)) + Math.min(Math.max(qx, qy), 0.0);
    const halfSoft = Math.max(0.0005, pw.softness * 0.5);
    raw = 1.0 - smoothstepUnit(-halfSoft, halfSoft, sd);
  } else {
    const span = Math.max(0.04, pw.height * 0.5 + pw.softness * 0.5);
    raw = 1.0 - smoothstepUnit(-span, span, dy);
  }

  return pw.invert ? 1.0 - raw : raw;
}

export function compilePowerWindowMaskExprClient(pwRaw) {
  const pw = normalizePowerWindow(pwRaw);
  if (pw.shape === "off") return "255";
  const rad = -(pw.rotation_deg * Math.PI) / 180.0;
  const ca = Math.cos(rad).toFixed(6);
  const sa = Math.sin(rad).toFixed(6);
  const cx = pw.center_x.toFixed(4);
  const cy = pw.center_y.toFixed(4);
  const dx = `((X/W-${cx})*(${ca})-(Y/H-${cy})*(${sa}))`;
  const dy = `((X/W-${cx})*(${sa})+(Y/H-${cy})*(${ca}))`;
  let setup = "";
  if (pw.shape === "circle") {
    const rx = Math.max(0.025, pw.width * 0.5);
    const ry = Math.max(0.025, pw.height * 0.5);
    const s = pw.softness * 2.0;
    const inner = Math.max(0.0, 1.0 - s * 0.5);
    const outer = Math.max(inner + 1e-4, 1.0 + s * 0.5);
    const denom = Math.max(1e-4, outer - inner);
    setup =
      `st(0,${dx});st(1,${dy});` +
      `st(2,hypot(ld(0)/${rx.toFixed(6)},ld(1)/${ry.toFixed(6)}));` +
      `st(3,clip((ld(2)-${inner.toFixed(6)})/${denom.toFixed(6)},0,1));`;
  } else if (pw.shape === "linear") {
    const hx = Math.max(0.025, pw.width * 0.5);
    const hy = Math.max(0.025, pw.height * 0.5);
    const lo = -Math.max(0.0005, pw.softness * 0.5);
    const denom = Math.max(0.001, pw.softness);
    setup =
      `st(0,abs(${dx})-${hx.toFixed(6)});st(1,abs(${dy})-${hy.toFixed(6)});` +
      `st(2,hypot(max(ld(0),0),max(ld(1),0))+min(max(ld(0),ld(1)),0));` +
      `st(3,clip((ld(2)-(${lo.toFixed(6)}))/${denom.toFixed(6)},0,1));`;
  } else {
    const span = Math.max(0.04, pw.height * 0.5 + pw.softness * 0.5);
    setup = `st(0,${dy});st(3,clip((ld(0)+${span.toFixed(6)})/${(2.0 * span).toFixed(6)},0,1));`;
  }
  const tExpr = "ld(3)*ld(3)*(3-2*ld(3))";
  return pw.invert ? `${setup}255*(${tExpr})` : `${setup}255*(1-(${tExpr}))`;
}

export const QUALIFIER_PRESET_IDS = [
  "off",
  "skin_tones",
  "sky_blue",
  "foliage_green",
  "teal_accents",
  "highlights",
  "shadows",
  "custom"
];

const QUALIFIER_DEFAULTS = {
  enabled: false,
  preset: "off",
  hue_center: 22.0,
  hue_width: 44.0,
  hue_softness: 18.0,
  sat_low: 0.12,
  sat_high: 0.75,
  sat_softness: 0.08,
  lum_low: 0.18,
  lum_high: 0.88,
  lum_softness: 0.10,
  blur_radius: 0.0,
  invert: false
};

export const QUALIFIER_PRESETS = {
  off: {
    id: "off",
    label: "Off",
    qualifier: { ...QUALIFIER_DEFAULTS }
  },
  skin_tones: {
    id: "skin_tones",
    label: "Skin Tones",
    qualifier: {
      ...QUALIFIER_DEFAULTS,
      enabled: true,
      preset: "skin_tones",
      hue_center: 22.0,
      hue_width: 44.0,
      hue_softness: 18.0,
      sat_low: 0.12,
      sat_high: 0.75,
      sat_softness: 0.08,
      lum_low: 0.18,
      lum_high: 0.88,
      lum_softness: 0.10,
      blur_radius: 1.0
    }
  },
  sky_blue: {
    id: "sky_blue",
    label: "Sky Blue",
    qualifier: {
      ...QUALIFIER_DEFAULTS,
      enabled: true,
      preset: "sky_blue",
      hue_center: 210.0,
      hue_width: 52.0,
      hue_softness: 18.0,
      sat_low: 0.20,
      sat_high: 1.00,
      sat_softness: 0.10,
      lum_low: 0.25,
      lum_high: 0.95,
      lum_softness: 0.10,
      blur_radius: 1.0
    }
  },
  foliage_green: {
    id: "foliage_green",
    label: "Foliage Green",
    qualifier: {
      ...QUALIFIER_DEFAULTS,
      enabled: true,
      preset: "foliage_green",
      hue_center: 115.0,
      hue_width: 64.0,
      hue_softness: 20.0,
      sat_low: 0.18,
      sat_high: 0.95,
      sat_softness: 0.10,
      lum_low: 0.12,
      lum_high: 0.82,
      lum_softness: 0.10,
      blur_radius: 1.0
    }
  },
  teal_accents: {
    id: "teal_accents",
    label: "Teal Accents",
    qualifier: {
      ...QUALIFIER_DEFAULTS,
      enabled: true,
      preset: "teal_accents",
      hue_center: 180.0,
      hue_width: 46.0,
      hue_softness: 16.0,
      sat_low: 0.20,
      sat_high: 1.00,
      sat_softness: 0.10,
      lum_low: 0.15,
      lum_high: 0.85,
      lum_softness: 0.10,
      blur_radius: 0.5
    }
  },
  highlights: {
    id: "highlights",
    label: "Highlights",
    qualifier: {
      ...QUALIFIER_DEFAULTS,
      enabled: true,
      preset: "highlights",
      hue_center: 0.0,
      hue_width: 360.0,
      hue_softness: 0.0,
      sat_low: 0.0,
      sat_high: 1.0,
      sat_softness: 0.0,
      lum_low: 0.65,
      lum_high: 1.0,
      lum_softness: 0.15,
      blur_radius: 1.0
    }
  },
  shadows: {
    id: "shadows",
    label: "Shadows",
    qualifier: {
      ...QUALIFIER_DEFAULTS,
      enabled: true,
      preset: "shadows",
      hue_center: 0.0,
      hue_width: 360.0,
      hue_softness: 0.0,
      sat_low: 0.0,
      sat_high: 1.0,
      sat_softness: 0.0,
      lum_low: 0.0,
      lum_high: 0.32,
      lum_softness: 0.15,
      blur_radius: 1.0
    }
  }
};

export function rgbToHslClient(r, g, b) {
  const rc = clampUnitColor(r);
  const gc = clampUnitColor(g);
  const bc = clampUnitColor(b);
  const cmax = Math.max(rc, gc, bc);
  const cmin = Math.min(rc, gc, bc);
  const delta = cmax - cmin;
  const lum = 0.5 * (cmax + cmin);
  if (delta <= 1e-6) {
    return [0.0, 0.0, lum];
  }
  const denom = Math.max(1e-6, 1.0 - Math.abs(2.0 * lum - 1.0));
  const sat = clampUnitColor(delta / denom);
  let hue = 0.0;
  if (cmax === rc) {
    hue = 60.0 * (((gc - bc) / delta + 6.0) % 6.0);
  } else if (cmax === gc) {
    hue = 60.0 * ((bc - rc) / delta + 2.0);
  } else {
    hue = 60.0 * ((rc - gc) / delta + 4.0);
  }
  hue = ((hue % 360.0) + 360.0) % 360.0;
  return [hue, sat, lum];
}

export function hslToRgbClient(hueDeg, sat, lum) {
  const h = ((Number(hueDeg) % 360.0) + 360.0) % 360.0;
  const s = clampUnitColor(sat);
  const l = clampUnitColor(lum);
  if (s <= 1e-6) {
    return [l, l, l];
  }
  const c = (1.0 - Math.abs(2.0 * l - 1.0)) * s;
  const hp = h / 60.0;
  const x = c * (1.0 - Math.abs((hp % 2.0) - 1.0));
  const m = l - 0.5 * c;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp < 1.0) {
    r1 = c;
    g1 = x;
  } else if (hp < 2.0) {
    r1 = x;
    g1 = c;
  } else if (hp < 3.0) {
    g1 = c;
    b1 = x;
  } else if (hp < 4.0) {
    g1 = x;
    b1 = c;
  } else if (hp < 5.0) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }
  return [clampUnitColor(r1 + m), clampUnitColor(g1 + m), clampUnitColor(b1 + m)];
}

export function createDefaultQualifier(overrides = {}) {
  return normalizeQualifier({ ...QUALIFIER_DEFAULTS, ...overrides });
}

export function normalizeQualifier(raw) {
  const q = raw && typeof raw === "object" ? raw : {};
  const presetRaw = typeof q.preset === "string" ? q.preset.trim().toLowerCase() : "off";
  const preset = QUALIFIER_PRESET_IDS.includes(presetRaw) ? presetRaw : "off";
  const satLow = clampPwNum(q.sat_low, 0.0, 1.0, QUALIFIER_DEFAULTS.sat_low);
  const satHigh = Math.max(satLow, clampPwNum(q.sat_high, 0.0, 1.0, QUALIFIER_DEFAULTS.sat_high));
  const lumLow = clampPwNum(q.lum_low, 0.0, 1.0, QUALIFIER_DEFAULTS.lum_low);
  const lumHigh = Math.max(lumLow, clampPwNum(q.lum_high, 0.0, 1.0, QUALIFIER_DEFAULTS.lum_high));
  return {
    enabled: Boolean(q.enabled),
    preset,
    hue_center: clampPwNum(q.hue_center, 0.0, 360.0, QUALIFIER_DEFAULTS.hue_center),
    hue_width: clampPwNum(q.hue_width, 2.0, 360.0, QUALIFIER_DEFAULTS.hue_width),
    hue_softness: clampPwNum(q.hue_softness, 0.0, 60.0, QUALIFIER_DEFAULTS.hue_softness),
    sat_low: satLow,
    sat_high: satHigh,
    sat_softness: clampPwNum(q.sat_softness, 0.0, 0.4, QUALIFIER_DEFAULTS.sat_softness),
    lum_low: lumLow,
    lum_high: lumHigh,
    lum_softness: clampPwNum(q.lum_softness, 0.0, 0.4, QUALIFIER_DEFAULTS.lum_softness),
    blur_radius: clampPwNum(q.blur_radius, 0.0, 8.0, QUALIFIER_DEFAULTS.blur_radius),
    invert: Boolean(q.invert)
  };
}

export function isQualifierActive(q) {
  return Boolean(q && q.enabled);
}

function evalQualifierBandWeight(val, lo, hi, soft) {
  let w = 1.0;
  if (lo > 0.0) {
    if (soft <= 1e-6) {
      w *= val >= lo ? 1.0 : 0.0;
    } else {
      w *= smoothstepUnit(lo - soft, lo, val);
    }
  }
  if (hi < 1.0) {
    if (soft <= 1e-6) {
      w *= val <= hi ? 1.0 : 0.0;
    } else {
      w *= 1.0 - smoothstepUnit(hi, hi + soft, val);
    }
  }
  return w;
}

export function evaluateQualifierMask(qRaw, r, g, b) {
  const q = normalizeQualifier(qRaw);
  if (!q.enabled) return 1.0;
  const [hue, sat, lum] = rgbToHslClient(r, g, b);
  let hWeight = 1.0;
  if (q.hue_width < 359.9) {
    const diff = Math.abs(hue - (q.hue_center % 360.0));
    const dh = Math.min(diff, 360.0 - diff);
    const hw = q.hue_width * 0.5;
    if (dh <= hw) {
      hWeight = 1.0;
    } else if (q.hue_softness <= 1e-6) {
      hWeight = 0.0;
    } else {
      hWeight = 1.0 - smoothstepUnit(hw, hw + q.hue_softness, dh);
    }
  }
  const sWeight = evalQualifierBandWeight(sat, q.sat_low, q.sat_high, q.sat_softness);
  const lWeight = evalQualifierBandWeight(lum, q.lum_low, q.lum_high, q.lum_softness);
  const weight = clampUnitColor(hWeight * sWeight * lWeight);
  return q.invert ? 1.0 - weight : weight;
}

export function pickQualifierFromRgb(r, g, b, baseOverrides = {}) {
  const [hue, sat, lum] = rgbToHslClient(r, g, b);
  if (sat < 0.08) {
    return normalizeQualifier({
      ...QUALIFIER_DEFAULTS,
      ...baseOverrides,
      enabled: true,
      preset: "custom",
      hue_center: 0.0,
      hue_width: 360.0,
      hue_softness: 0.0,
      sat_low: 0.0,
      sat_high: 0.35,
      sat_softness: 0.1,
      lum_low: Math.max(0.0, Number((lum - 0.18).toFixed(2))),
      lum_high: Math.min(1.0, Number((lum + 0.18).toFixed(2))),
      lum_softness: 0.1,
      blur_radius: 1.0
    });
  }
  return normalizeQualifier({
    ...QUALIFIER_DEFAULTS,
    ...baseOverrides,
    enabled: true,
    preset: "custom",
    hue_center: Math.round(hue),
    hue_width: 38.0,
    hue_softness: 16.0,
    sat_low: Math.max(0.05, Number((sat - 0.22).toFixed(2))),
    sat_high: Math.min(1.0, Number((sat + 0.25).toFixed(2))),
    sat_softness: 0.1,
    lum_low: Math.max(0.05, Number((lum - 0.25).toFixed(2))),
    lum_high: Math.min(1.0, Number((lum + 0.25).toFixed(2))),
    lum_softness: 0.1,
    blur_radius: 1.0
  });
}

function compileGeqBandClient(regIdx, lo, hi, soft) {
  let expr = "";
  if (lo > 0.0) {
    if (soft <= 1e-4) {
      expr += `st(8,ld(8)*gte(ld(${regIdx}),${lo.toFixed(4)}));`;
    } else {
      const e0 = lo - soft;
      expr +=
        `st(9,clip((ld(${regIdx})-(${e0.toFixed(4)}))/${soft.toFixed(4)},0,1));` +
        "st(8,ld(8)*(ld(9)*ld(9)*(3-2*ld(9))));";
    }
  }
  if (hi < 1.0) {
    if (soft <= 1e-4) {
      expr += `st(8,ld(8)*lte(ld(${regIdx}),${hi.toFixed(4)}));`;
    } else {
      expr +=
        `st(9,clip((ld(${regIdx})-${hi.toFixed(4)})/${soft.toFixed(4)},0,1));` +
        "st(8,ld(8)*(1-ld(9)*ld(9)*(3-2*ld(9))));";
    }
  }
  return expr;
}

export function compileQualifierMaskExprClient(qRaw) {
  const q = normalizeQualifier(qRaw);
  if (!q.enabled) return "255";
  const base =
    "st(0,r(X,Y)/255);st(1,g(X,Y)/255);st(2,b(X,Y)/255);" +
    "st(3,max(max(ld(0),ld(1)),ld(2)));" +
    "st(4,min(min(ld(0),ld(1)),ld(2)));" +
    "st(5,ld(3)-ld(4));" +
    "st(6,0.5*(ld(3)+ld(4)));" +
    "st(7,if(gt(ld(5),1e-5),clip(ld(5)/max(1e-5,1-abs(2*ld(6)-1)),0,1),0));" +
    "st(8,if(lte(ld(5),1e-5),0,60*if(eq(ld(3),ld(0)),mod((ld(1)-ld(2))/max(1e-5,ld(5))+6,6),if(eq(ld(3),ld(1)),(ld(2)-ld(0))/max(1e-5,ld(5))+2,(ld(0)-ld(1))/max(1e-5,ld(5))+4))));";
  let hPart = "";
  if (q.hue_width >= 359.9) {
    hPart = "st(8,1);";
  } else {
    const hc = (q.hue_center % 360.0).toFixed(4);
    const hw = (q.hue_width * 0.5).toFixed(4);
    if (q.hue_softness <= 1e-4) {
      hPart = `st(9,min(abs(ld(8)-${hc}),360-abs(ld(8)-${hc})));st(8,lte(ld(9),${hw}));`;
    } else {
      const hs = q.hue_softness.toFixed(4);
      hPart =
        `st(9,min(abs(ld(8)-${hc}),360-abs(ld(8)-${hc})));` +
        `st(9,clip((ld(9)-${hw})/${hs},0,1));` +
        "st(8,1-ld(9)*ld(9)*(3-2*ld(9)));";
    }
  }
  const sPart = compileGeqBandClient(7, q.sat_low, q.sat_high, q.sat_softness);
  const lPart = compileGeqBandClient(6, q.lum_low, q.lum_high, q.lum_softness);
  const outExpr = q.invert ? "255*(1-ld(8))" : "255*ld(8)";
  return `${base}${hPart}${sPart}${lPart}${outExpr}`;
}

export const CURVE_CHANNELS = ["master", "red", "green", "blue"];
export const MAX_CURVE_POINTS = 16;

export const COLOR_CURVE_PRESETS = {
  linear: {
    id: "linear",
    label: "Linear",
    curves: {
      master: [[0, 0], [1, 1]],
      red: [[0, 0], [1, 1]],
      green: [[0, 0], [1, 1]],
      blue: [[0, 0], [1, 1]]
    }
  },
  film_s_curve: {
    id: "film_s_curve",
    label: "Film S-Curve",
    curves: {
      master: [[0, 0], [0.25, 0.19], [0.5, 0.5], [0.75, 0.82], [1, 1]],
      red: [[0, 0], [1, 1]],
      green: [[0, 0], [1, 1]],
      blue: [[0, 0], [1, 1]]
    }
  },
  matte_lift: {
    id: "matte_lift",
    label: "Matte Lift",
    curves: {
      master: [[0, 0.08], [0.25, 0.24], [0.75, 0.78], [1, 0.94]],
      red: [[0, 0], [1, 1]],
      green: [[0, 0], [1, 1]],
      blue: [[0, 0], [1, 1]]
    }
  },
  crisp_contrast: {
    id: "crisp_contrast",
    label: "Crisp Contrast",
    curves: {
      master: [[0, 0], [0.22, 0.14], [0.5, 0.52], [0.78, 0.88], [1, 1]],
      red: [[0, 0], [1, 1]],
      green: [[0, 0], [1, 1]],
      blue: [[0, 0], [1, 1]]
    }
  },
  warm_gold: {
    id: "warm_gold",
    label: "Warm Gold",
    curves: {
      master: [[0, 0], [1, 1]],
      red: [[0, 0], [0.5, 0.56], [1, 1]],
      green: [[0, 0], [1, 1]],
      blue: [[0, 0], [0.5, 0.43], [1, 0.95]]
    }
  },
  cool_shadows: {
    id: "cool_shadows",
    label: "Cool Shadows",
    curves: {
      master: [[0, 0], [1, 1]],
      red: [[0, 0], [0.25, 0.2], [0.75, 0.76], [1, 1]],
      green: [[0, 0], [1, 1]],
      blue: [[0, 0.04], [0.25, 0.32], [0.75, 0.74], [1, 1]]
    }
  }
};

export function normalizeCurvePoints(rawPoints) {
  if (!Array.isArray(rawPoints) || rawPoints.length === 0) {
    return [[0, 0], [1, 1]];
  }
  const parsed = [];
  for (const pt of rawPoints) {
    if (!Array.isArray(pt) || pt.length !== 2) continue;
    const x = Number(pt[0]);
    const y = Number(pt[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    parsed.push([
      Math.round(clampUnitColor(x) * 10000) / 10000,
      Math.round(clampUnitColor(y) * 10000) / 10000
    ]);
  }
  if (parsed.length === 0) {
    return [[0, 0], [1, 1]];
  }
  parsed.sort((a, b) => a[0] - b[0]);
  const deduped = [];
  for (const [px, py] of parsed) {
    if (deduped.length > 0 && Math.abs(px - deduped[deduped.length - 1][0]) < 1e-3) {
      deduped[deduped.length - 1] = [deduped[deduped.length - 1][0], py];
    } else {
      deduped.push([px, py]);
    }
  }
  if (deduped[0][0] > 1e-3) {
    deduped.unshift([0, 0]);
  } else {
    deduped[0] = [0, deduped[0][1]];
  }
  if (deduped[deduped.length - 1][0] < 1 - 1e-3) {
    deduped.push([1, 1]);
  } else {
    deduped[deduped.length - 1] = [1, deduped[deduped.length - 1][1]];
  }
  if (deduped.length > MAX_CURVE_POINTS) {
    return [deduped[0], ...deduped.slice(1, MAX_CURVE_POINTS - 1), deduped[deduped.length - 1]];
  }
  return deduped;
}

export function createDefaultColorCurves(overrides = {}) {
  const src = overrides && typeof overrides === "object" ? overrides : {};
  return {
    master: normalizeCurvePoints(src.master),
    red: normalizeCurvePoints(src.red),
    green: normalizeCurvePoints(src.green),
    blue: normalizeCurvePoints(src.blue)
  };
}

export function normalizeColorCurves(raw) {
  return createDefaultColorCurves(raw);
}

export function isCurveChannelIdentity(points) {
  if (!Array.isArray(points) || points.length === 0) return true;
  return points.every(([px, py]) => Math.abs(py - px) < 1e-4);
}

export function isColorCurvesIdentity(curves) {
  const c = normalizeColorCurves(curves);
  return (
    isCurveChannelIdentity(c.master) &&
    isCurveChannelIdentity(c.red) &&
    isCurveChannelIdentity(c.green) &&
    isCurveChannelIdentity(c.blue)
  );
}

function computePchipTangentsClient(pts) {
  const n = pts.length;
  if (n < 2) return new Array(n).fill(0);
  const h = [];
  const d = [];
  for (let i = 0; i < n - 1; i++) {
    const hi = Math.max(1e-6, pts[i + 1][0] - pts[i][0]);
    h.push(hi);
    d.push((pts[i + 1][1] - pts[i][1]) / hi);
  }
  if (n === 2) return [d[0], d[0]];
  const m = new Array(n).fill(0);
  for (let k = 1; k < n - 1; k++) {
    if (d[k - 1] * d[k] <= 0) {
      m[k] = 0;
    } else {
      const w1 = 2 * h[k] + h[k - 1];
      const w2 = h[k] + 2 * h[k - 1];
      m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k]);
    }
  }
  const endSlope = (h0, h1, d0, d1) => {
    const slope = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
    if (slope * d0 <= 0) return 0;
    if (d0 * d1 <= 0 && Math.abs(slope) > 3 * Math.abs(d0)) return 3 * d0;
    return slope;
  };
  m[0] = endSlope(h[0], h[1], d[0], d[1]);
  m[n - 1] = endSlope(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
  return m;
}

export function evaluateCurvePchipClient(points, x) {
  const pts = Array.isArray(points) && points.length > 0 ? points : [[0, 0], [1, 1]];
  const xc = clampUnitColor(x);
  if (pts.length === 1) return clampUnitColor(pts[0][1]);
  if (xc <= pts[0][0]) return clampUnitColor(pts[0][1]);
  if (xc >= pts[pts.length - 1][0]) return clampUnitColor(pts[pts.length - 1][1]);
  const m = computePchipTangentsClient(pts);
  let idx = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    if (xc <= pts[i + 1][0]) {
      idx = i;
      break;
    }
  }
  const [x0, y0] = pts[idx];
  const [x1, y1] = pts[idx + 1];
  const h = Math.max(1e-6, x1 - x0);
  const t = (xc - x0) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return clampUnitColor(h00 * y0 + h10 * h * m[idx] + h01 * y1 + h11 * h * m[idx + 1]);
}

export function buildCurveLut256Client(points) {
  const lut = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = evaluateCurvePchipClient(points, i / 255);
  }
  return lut;
}

export function applyColorCurvesRgbClient(r, g, b, curves) {
  const c = normalizeColorCurves(curves);
  let rc = clampUnitColor(r);
  let gc = clampUnitColor(g);
  let bc = clampUnitColor(b);
  if (!isCurveChannelIdentity(c.red)) rc = evaluateCurvePchipClient(c.red, rc);
  if (!isCurveChannelIdentity(c.green)) gc = evaluateCurvePchipClient(c.green, gc);
  if (!isCurveChannelIdentity(c.blue)) bc = evaluateCurvePchipClient(c.blue, bc);
  if (!isCurveChannelIdentity(c.master)) {
    rc = evaluateCurvePchipClient(c.master, rc);
    gc = evaluateCurvePchipClient(c.master, gc);
    bc = evaluateCurvePchipClient(c.master, bc);
  }
  return [rc, gc, bc];
}

export function compileColorCurvesFilterClient(curves) {
  const c = normalizeColorCurves(curves);
  if (isColorCurvesIdentity(c)) return "";
  const opts = ["interp=pchip"];
  for (const ch of CURVE_CHANNELS) {
    const pts = c[ch];
    if (isCurveChannelIdentity(pts)) continue;
    const encoded = pts.map(([px, py]) => `${px.toFixed(4)}/${py.toFixed(4)}`).join(" ");
    opts.push(`${ch}='${encoded}'`);
  }
  return `curves=${opts.join(":")}`;
}

export const HSL_CURVE_MODES = ["hue_vs_hue", "hue_vs_sat", "hue_vs_lum"];
export const HSL_HUE_VECTORS = ["reds", "yellows", "greens", "cyans", "blues", "magentas"];
export const HSL_HUE_FFMPEG_FLAGS = {
  reds: "r",
  yellows: "y",
  greens: "g",
  cyans: "c",
  blues: "b",
  magentas: "m"
};
export const HSL_HUE_ANCHOR_DEGREES = {
  reds: 0,
  yellows: 60,
  greens: 120,
  cyans: 180,
  blues: 240,
  magentas: 300
};
export const HSL_HUE_BOUNDS = {
  hue_vs_hue: { min: -45.0, max: 45.0, step: 1.0, unit: "deg" },
  hue_vs_sat: { min: -1.0, max: 1.0, step: 0.02, unit: "pct" },
  hue_vs_lum: { min: -0.5, max: 0.5, step: 0.01, unit: "lum" }
};

export const HSL_CURVE_PRESETS = {
  neutral: {
    id: "neutral",
    label: "Neutral",
    hsl_curves: {}
  },
  teal_orange_push: {
    id: "teal_orange_push",
    label: "Teal & Orange",
    hsl_curves: {
      hue_vs_hue: { reds: 8.0, yellows: -10.0, cyans: -8.0 },
      hue_vs_sat: { reds: 0.25, yellows: 0.15, greens: -0.45, cyans: 0.4, blues: 0.25, magentas: -0.5 },
      hue_vs_lum: { cyans: -0.15, blues: -0.18 }
    }
  },
  skin_polish: {
    id: "skin_polish",
    label: "Skin Polish",
    hsl_curves: {
      hue_vs_hue: { reds: 5.0, yellows: -6.0 },
      hue_vs_sat: { reds: -0.1, yellows: -0.12 },
      hue_vs_lum: { reds: 0.08, yellows: 0.1 }
    }
  },
  foliage_emerald: {
    id: "foliage_emerald",
    label: "Emerald Foliage",
    hsl_curves: {
      hue_vs_hue: { yellows: 16.0, greens: 12.0 },
      hue_vs_sat: { yellows: -0.15, greens: 0.2 },
      hue_vs_lum: { greens: -0.16 }
    }
  },
  sky_deepen: {
    id: "sky_deepen",
    label: "Sky Polarizer",
    hsl_curves: {
      hue_vs_sat: { cyans: 0.3, blues: 0.4 },
      hue_vs_lum: { cyans: -0.2, blues: -0.24 }
    }
  },
  muted_greens: {
    id: "muted_greens",
    label: "Muted Greens",
    hsl_curves: {
      hue_vs_sat: { yellows: -0.25, greens: -0.55, cyans: -0.3, magentas: -0.35 },
      hue_vs_lum: { greens: -0.1 }
    }
  }
};

function normalizeHslVectorChannel(raw, minVal, maxVal) {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const vec of HSL_HUE_VECTORS) {
    const num = Number(src[vec]);
    const clamped = Number.isFinite(num) ? Math.min(maxVal, Math.max(minVal, num)) : 0.0;
    out[vec] = Math.round(clamped * 10000) / 10000;
  }
  return out;
}

export function createDefaultHslCurves(overrides = {}) {
  const src = overrides && typeof overrides === "object" ? overrides : {};
  return {
    hue_vs_hue: normalizeHslVectorChannel(
      src.hue_vs_hue,
      HSL_HUE_BOUNDS.hue_vs_hue.min,
      HSL_HUE_BOUNDS.hue_vs_hue.max
    ),
    hue_vs_sat: normalizeHslVectorChannel(
      src.hue_vs_sat,
      HSL_HUE_BOUNDS.hue_vs_sat.min,
      HSL_HUE_BOUNDS.hue_vs_sat.max
    ),
    hue_vs_lum: normalizeHslVectorChannel(
      src.hue_vs_lum,
      HSL_HUE_BOUNDS.hue_vs_lum.min,
      HSL_HUE_BOUNDS.hue_vs_lum.max
    )
  };
}

export function normalizeHslCurves(raw) {
  return createDefaultHslCurves(raw);
}

export function isHslCurveChannelIdentity(channel) {
  if (!channel || typeof channel !== "object") return true;
  return HSL_HUE_VECTORS.every((vec) => Math.abs(Number(channel[vec]) || 0) <= 1e-4);
}

export function isHslCurvesIdentity(hslCurves) {
  const h = normalizeHslCurves(hslCurves);
  return (
    isHslCurveChannelIdentity(h.hue_vs_hue) &&
    isHslCurveChannelIdentity(h.hue_vs_sat) &&
    isHslCurveChannelIdentity(h.hue_vs_lum)
  );
}

export function evaluatePeriodicHueCurveClient(values6, hueDeg) {
  const h = ((Number(hueDeg) % 360.0) + 360.0) % 360.0;
  const sector = h / 60.0;
  const i1 = Math.floor(sector) % 6;
  const t = sector - Math.floor(sector);
  const p0 = Number(values6[(i1 + 5) % 6]) || 0;
  const p1 = Number(values6[i1]) || 0;
  const p2 = Number(values6[(i1 + 1) % 6]) || 0;
  const p3 = Number(values6[(i1 + 2) % 6]) || 0;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2.0 * p1 +
      (-p0 + p2) * t +
      (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2 +
      (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3)
  );
}

function smoothstepClient(edge0, edge1, x) {
  const span = edge1 - edge0;
  if (Math.abs(span) <= 1e-6) return x >= edge1 ? 1.0 : 0.0;
  const t = clampUnitColor((x - edge0) / span);
  return t * t * (3.0 - 2.0 * t);
}

export function applyHslCurvesRgbClient(r, g, b, hslCurves) {
  const h = normalizeHslCurves(hslCurves);
  const rc = clampUnitColor(r);
  const gc = clampUnitColor(g);
  const bc = clampUnitColor(b);
  if (isHslCurvesIdentity(h)) return [rc, gc, bc];
  const [hue, sat, lum] = rgbToHslClient(rc, gc, bc);
  if (sat <= 1e-4) return [rc, gc, bc];
  const chromaWeight = smoothstepClient(0.0, 0.08, sat);
  let dh = 0.0;
  if (!isHslCurveChannelIdentity(h.hue_vs_hue)) {
    const vals = HSL_HUE_VECTORS.map((v) => h.hue_vs_hue[v]);
    const raw = evaluatePeriodicHueCurveClient(vals, hue);
    dh =
      Math.min(HSL_HUE_BOUNDS.hue_vs_hue.max, Math.max(HSL_HUE_BOUNDS.hue_vs_hue.min, raw)) *
      chromaWeight;
  }
  let ds = 0.0;
  if (!isHslCurveChannelIdentity(h.hue_vs_sat)) {
    const vals = HSL_HUE_VECTORS.map((v) => h.hue_vs_sat[v]);
    const raw = evaluatePeriodicHueCurveClient(vals, hue);
    ds = Math.min(HSL_HUE_BOUNDS.hue_vs_sat.max, Math.max(HSL_HUE_BOUNDS.hue_vs_sat.min, raw));
  }
  let dl = 0.0;
  if (!isHslCurveChannelIdentity(h.hue_vs_lum)) {
    const vals = HSL_HUE_VECTORS.map((v) => h.hue_vs_lum[v]);
    const raw = evaluatePeriodicHueCurveClient(vals, hue);
    dl =
      Math.min(HSL_HUE_BOUNDS.hue_vs_lum.max, Math.max(HSL_HUE_BOUNDS.hue_vs_lum.min, raw)) *
      chromaWeight;
  }
  const nextHue = (((hue + dh) % 360.0) + 360.0) % 360.0;
  const nextSat = clampUnitColor(sat * (1.0 + ds));
  const nextLum = clampUnitColor(lum + dl * 0.35);
  return hslToRgbClient(nextHue, nextSat, nextLum);
}

export function compileHslCurvesFilterClient(hslCurves) {
  const h = normalizeHslCurves(hslCurves);
  if (isHslCurvesIdentity(h)) return "";
  const stages = [];
  for (const vec of HSL_HUE_VECTORS) {
    const dh = Number(h.hue_vs_hue[vec]) || 0;
    const ds = Number(h.hue_vs_sat[vec]) || 0;
    const dl = Number(h.hue_vs_lum[vec]) || 0;
    if (Math.abs(dh) <= 1e-4 && Math.abs(ds) <= 1e-4 && Math.abs(dl) <= 1e-4) {
      continue;
    }
    const flag = HSL_HUE_FFMPEG_FLAGS[vec];
    stages.push(
      `huesaturation=colors=${flag}:hue=${dh.toFixed(2)}:saturation=${ds.toFixed(4)}:intensity=${dl.toFixed(4)}`
    );
  }
  return stages.join(",");
}

export const COLOR_WARPER_HUE_COUNT = 6;
export const COLOR_WARPER_SAT_RINGS = 3;
export const COLOR_WARPER_RING_RADII = [1.0 / 3.0, 2.0 / 3.0, 1.0];
export const COLOR_WARPER_HUE_LABELS = ["R", "Y", "G", "C", "B", "M"];
export const COLOR_WARPER_BOUNDS = {
  hue_offset: { min: -60.0, max: 60.0 },
  sat_offset: { min: -0.6, max: 0.6 }
};

function buildWarperFromSparse(entries) {
  const pts = [];
  const byKey = new Map();
  for (const [h, r, dh, ds] of entries) {
    byKey.set(`${r}:${h}`, { hue_idx: h, ring_idx: r, hue_offset: dh, sat_offset: ds });
  }
  for (let r = 0; r < COLOR_WARPER_SAT_RINGS; r += 1) {
    for (let h = 0; h < COLOR_WARPER_HUE_COUNT; h += 1) {
      pts.push(byKey.get(`${r}:${h}`) || { hue_idx: h, ring_idx: r, hue_offset: 0.0, sat_offset: 0.0 });
    }
  }
  return { points: pts };
}

export const COLOR_WARPER_PRESETS_CLIENT = [
  {
    id: "neutral",
    name: "Neutral",
    description: "Flat 6x3 Color Warper spider grid with zero hue or saturation displacement.",
    color_warper: buildWarperFromSparse([])
  },
  {
    id: "kodak_warm_skin",
    name: "Kodak Warm Skin",
    description: "Pulls reds and yellows toward golden Kodak skin tones while enriching blues.",
    color_warper: buildWarperFromSparse([
      [0, 0, 6.0, 0.05],
      [0, 1, 8.0, 0.08],
      [0, 2, 5.0, 0.06],
      [1, 0, -6.0, 0.04],
      [1, 1, -8.0, 0.06],
      [4, 1, -4.0, 0.12],
      [4, 2, -6.0, 0.16]
    ])
  },
  {
    id: "teal_orange_warp",
    name: "Teal & Orange",
    description: "Warps greens/cyans toward cinema teal, warms skin axes, and tames magenta.",
    color_warper: buildWarperFromSparse([
      [0, 1, 10.0, 0.14],
      [0, 2, 12.0, 0.18],
      [1, 1, -12.0, 0.12],
      [1, 2, -14.0, 0.14],
      [2, 1, 20.0, -0.14],
      [2, 2, 24.0, -0.22],
      [3, 1, 10.0, 0.18],
      [3, 2, 12.0, 0.24],
      [4, 1, -10.0, 0.12],
      [5, 1, 6.0, -0.24],
      [5, 2, 8.0, -0.3]
    ])
  },
  {
    id: "emerald_cinema",
    name: "Emerald Cinema",
    description: "Shifts yellow-green foliage toward rich emerald while keeping skin balanced.",
    color_warper: buildWarperFromSparse([
      [1, 1, 14.0, -0.06],
      [1, 2, 18.0, -0.1],
      [2, 1, 16.0, 0.16],
      [2, 2, 18.0, 0.22],
      [3, 1, -6.0, 0.08],
      [4, 2, 4.0, 0.1]
    ])
  },
  {
    id: "pastel_editorial",
    name: "Pastel Editorial",
    description: "Pulls outer high-saturation rings inward for soft editorial film pastel.",
    color_warper: buildWarperFromSparse([
      [0, 1, 4.0, -0.14],
      [0, 2, 6.0, -0.28],
      [1, 1, -4.0, -0.14],
      [1, 2, -6.0, -0.26],
      [2, 1, 4.0, -0.16],
      [2, 2, 6.0, -0.3],
      [3, 1, -4.0, -0.14],
      [3, 2, -6.0, -0.26],
      [4, 1, -4.0, -0.14],
      [4, 2, -6.0, -0.28],
      [5, 1, 4.0, -0.16],
      [5, 2, 6.0, -0.3]
    ])
  },
  {
    id: "cyber_neon",
    name: "Cyber Neon",
    description: "Expands outer rings outward and swings blues/magentas toward electric cyan-violet.",
    color_warper: buildWarperFromSparse([
      [0, 1, -6.0, 0.18],
      [0, 2, -8.0, 0.28],
      [2, 1, 18.0, 0.12],
      [3, 1, 8.0, 0.26],
      [3, 2, 10.0, 0.36],
      [4, 1, -14.0, 0.24],
      [4, 2, -16.0, 0.34],
      [5, 1, -12.0, 0.26],
      [5, 2, -14.0, 0.38]
    ])
  }
];

export function createDefaultColorWarper() {
  return buildWarperFromSparse([]);
}

export function normalizeColorWarper(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const list = Array.isArray(src.points) ? src.points : [];
  const byKey = new Map();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const h = Math.round(Number(item.hue_idx));
    const r = Math.round(Number(item.ring_idx));
    if (!Number.isInteger(h) || h < 0 || h >= COLOR_WARPER_HUE_COUNT) continue;
    if (!Number.isInteger(r) || r < 0 || r >= COLOR_WARPER_SAT_RINGS) continue;
    const dhRaw = Number(item.hue_offset ?? 0.0);
    const dsRaw = Number(item.sat_offset ?? 0.0);
    const dh = Number.isFinite(dhRaw)
      ? Math.min(COLOR_WARPER_BOUNDS.hue_offset.max, Math.max(COLOR_WARPER_BOUNDS.hue_offset.min, dhRaw))
      : 0.0;
    const ds = Number.isFinite(dsRaw)
      ? Math.min(COLOR_WARPER_BOUNDS.sat_offset.max, Math.max(COLOR_WARPER_BOUNDS.sat_offset.min, dsRaw))
      : 0.0;
    byKey.set(`${r}:${h}`, {
      hue_idx: h,
      ring_idx: r,
      hue_offset: Math.round(dh * 1000) / 1000,
      sat_offset: Math.round(ds * 10000) / 10000
    });
  }
  const points = [];
  for (let r = 0; r < COLOR_WARPER_SAT_RINGS; r += 1) {
    for (let h = 0; h < COLOR_WARPER_HUE_COUNT; h += 1) {
      points.push(byKey.get(`${r}:${h}`) || { hue_idx: h, ring_idx: r, hue_offset: 0.0, sat_offset: 0.0 });
    }
  }
  return { points };
}

export function isColorWarperIdentity(warper) {
  const w = normalizeColorWarper(warper);
  return w.points.every((pt) => Math.abs(pt.hue_offset) <= 1e-4 && Math.abs(pt.sat_offset) <= 1e-4);
}

export function getColorWarperPoint(warper, hueIdx, ringIdx) {
  const w = normalizeColorWarper(warper);
  const h = Math.max(0, Math.min(COLOR_WARPER_HUE_COUNT - 1, Math.round(Number(hueIdx) || 0)));
  const r = Math.max(0, Math.min(COLOR_WARPER_SAT_RINGS - 1, Math.round(Number(ringIdx) || 0)));
  return w.points[r * COLOR_WARPER_HUE_COUNT + h];
}

export function setColorWarperPointOffset(warper, hueIdx, ringIdx, hueOffset, satOffset) {
  const w = normalizeColorWarper(warper);
  const h = Math.max(0, Math.min(COLOR_WARPER_HUE_COUNT - 1, Math.round(Number(hueIdx) || 0)));
  const r = Math.max(0, Math.min(COLOR_WARPER_SAT_RINGS - 1, Math.round(Number(ringIdx) || 0)));
  const dh = Number.isFinite(Number(hueOffset))
    ? Math.min(COLOR_WARPER_BOUNDS.hue_offset.max, Math.max(COLOR_WARPER_BOUNDS.hue_offset.min, Number(hueOffset)))
    : 0.0;
  const ds = Number.isFinite(Number(satOffset))
    ? Math.min(COLOR_WARPER_BOUNDS.sat_offset.max, Math.max(COLOR_WARPER_BOUNDS.sat_offset.min, Number(satOffset)))
    : 0.0;
  w.points[r * COLOR_WARPER_HUE_COUNT + h] = {
    hue_idx: h,
    ring_idx: r,
    hue_offset: Math.round(dh * 100) / 100,
    sat_offset: Math.round(ds * 1000) / 1000
  };
  return w;
}

export function evaluateColorWarperShiftClient(hueDeg, sat, warper) {
  const w = normalizeColorWarper(warper);
  const sc = clampUnitColor(sat);
  if (sc <= 1e-6) return [0.0, 0.0];
  const hNorm = ((((Number(hueDeg) || 0) % 360.0) + 360.0) % 360.0) / 60.0;
  const h0 = Math.floor(hNorm) % COLOR_WARPER_HUE_COUNT;
  const h1 = (h0 + 1) % COLOR_WARPER_HUE_COUNT;
  const hf = hNorm - Math.floor(hNorm);
  const ht = hf * hf * (3.0 - 2.0 * hf);

  const sScaled = sc * COLOR_WARPER_SAT_RINGS;
  let rLo;
  let rHi;
  let rf;
  if (sScaled <= 1.0) {
    rLo = -1;
    rHi = 0;
    rf = sScaled;
  } else if (sScaled <= 2.0) {
    rLo = 0;
    rHi = 1;
    rf = sScaled - 1.0;
  } else {
    rLo = 1;
    rHi = 2;
    rf = Math.min(1.0, sScaled - 2.0);
  }
  const rt = rf * rf * (3.0 - 2.0 * rf);

  const ptVal = (hIdx, rIdx) => {
    if (rIdx < 0) return [0.0, 0.0];
    const pt = w.points[rIdx * COLOR_WARPER_HUE_COUNT + hIdx];
    return [pt.hue_offset, pt.sat_offset];
  };
  const [dh00, ds00] = ptVal(h0, rLo);
  const [dh10, ds10] = ptVal(h1, rLo);
  const [dh01, ds01] = ptVal(h0, rHi);
  const [dh11, ds11] = ptVal(h1, rHi);

  const dh0 = dh00 + (dh10 - dh00) * ht;
  const dh1 = dh01 + (dh11 - dh01) * ht;
  const ds0 = ds00 + (ds10 - ds00) * ht;
  const ds1 = ds01 + (ds11 - ds01) * ht;
  return [dh0 + (dh1 - dh0) * rt, ds0 + (ds1 - ds0) * rt];
}

export function applyColorWarperRgbClient(r, g, b, warper) {
  const rc = clampUnitColor(r);
  const gc = clampUnitColor(g);
  const bc = clampUnitColor(b);
  if (isColorWarperIdentity(warper)) return [rc, gc, bc];
  const [hue, sat, lum] = rgbToHslClient(rc, gc, bc);
  if (sat <= 1e-4) return [rc, gc, bc];
  const [dh, ds] = evaluateColorWarperShiftClient(hue, sat, warper);
  const chromaWeight = smoothstepClient(0.0, 0.06, sat);
  const nextHue = (((hue + dh * chromaWeight) % 360.0) + 360.0) % 360.0;
  const nextSat = clampUnitColor(sat + ds * chromaWeight);
  return hslToRgbClient(nextHue, nextSat, lum);
}

export function compileColorWarperFilterClient(warper) {
  const w = normalizeColorWarper(warper);
  if (isColorWarperIdentity(w)) return "";
  const ringWeights = [0.2, 0.35, 0.45];
  const stages = [];
  for (let hIdx = 0; hIdx < HSL_HUE_VECTORS.length; hIdx += 1) {
    const vec = HSL_HUE_VECTORS[hIdx];
    let dh = 0;
    let ds = 0;
    for (let rIdx = 0; rIdx < COLOR_WARPER_SAT_RINGS; rIdx += 1) {
      const pt = w.points[rIdx * COLOR_WARPER_HUE_COUNT + hIdx];
      dh += pt.hue_offset * ringWeights[rIdx];
      ds += pt.sat_offset * ringWeights[rIdx];
    }
    if (Math.abs(dh) <= 1e-4 && Math.abs(ds) <= 1e-4) continue;
    const flag = HSL_HUE_FFMPEG_FLAGS[vec];
    stages.push(`huesaturation=colors=${flag}:hue=${dh.toFixed(2)}:saturation=${ds.toFixed(4)}`);
  }
  return stages.join(",");
}

export function createColorNode(index = 1, overrides = {}) {
  const safeIdx = Math.max(1, Math.round(Number(index) || 1));
  return {
    id:
      typeof overrides.id === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(overrides.id)
        ? overrides.id
        : `node-${safeIdx}`,
    label:
      typeof overrides.label === "string" && overrides.label.trim()
        ? overrides.label.trim().slice(0, 48)
        : safeIdx === 1
          ? "Primary"
          : `Serial ${safeIdx}`,
    enabled: overrides.enabled !== false,
    grade: normalizeColorGrade(overrides.grade),
    curves: normalizeColorCurves(overrides.curves),
    hsl_curves: normalizeHslCurves(overrides.hsl_curves),
    color_warper: normalizeColorWarper(overrides.color_warper),
    power_window: normalizePowerWindow(overrides.power_window),
    qualifier: normalizeQualifier(overrides.qualifier),
    lut: normalizeNodeLut(overrides.lut)
  };
}

export function normalizeColorNode(raw, index = 0) {
  const n = raw && typeof raw === "object" ? raw : {};
  return createColorNode(index + 1, {
    id: n.id,
    label: n.label,
    enabled: n.enabled,
    grade: n.grade,
    curves: n.curves,
    hsl_curves: n.hsl_curves,
    color_warper: n.color_warper,
    power_window: n.power_window,
    qualifier: n.qualifier,
    lut: n.lut
  });
}

export function createDefaultColorNodeTree() {
  const first = createColorNode(1, { id: "node-1", label: "Primary" });
  return {
    nodes: [first],
    selectedNodeId: first.id
  };
}

export function normalizeColorNodeTree(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.nodes) || raw.nodes.length === 0) {
    return createDefaultColorNodeTree();
  }
  const usedIds = new Set();
  const nodes = raw.nodes.slice(0, MAX_COLOR_NODES).map((n, idx) => {
    const norm = normalizeColorNode(n, idx);
    if (usedIds.has(norm.id)) {
      let suffix = idx + 1;
      while (usedIds.has(`node-${suffix}`)) suffix += 1;
      norm.id = `node-${suffix}`;
    }
    usedIds.add(norm.id);
    return norm;
  });
  const selectedExists = nodes.some((n) => n.id === raw.selectedNodeId);
  return {
    nodes,
    selectedNodeId: selectedExists ? raw.selectedNodeId : nodes[0].id
  };
}

export function getSelectedColorNode(tree) {
  const norm = normalizeColorNodeTree(tree);
  return norm.nodes.find((n) => n.id === norm.selectedNodeId) || norm.nodes[0];
}

export function isColorNodeIdentity(node) {
  if (!node || node.enabled === false) return true;
  if (!isColorGradeIdentity(node.grade)) return false;
  if (!isColorCurvesIdentity(node.curves)) return false;
  if (!isHslCurvesIdentity(node.hsl_curves)) return false;
  if (!isColorWarperIdentity(node.color_warper)) return false;
  if (node.lut && Number(node.lut.mix ?? 1.0) > 1e-6) return false;
  return true;
}

export function addColorNodeToTree(tree, opts = {}) {
  const norm = normalizeColorNodeTree(tree);
  if (norm.nodes.length >= MAX_COLOR_NODES) {
    return norm;
  }
  const usedIds = new Set(norm.nodes.map((n) => n.id));
  let seq = norm.nodes.length + 1;
  while (usedIds.has(`node-${seq}`)) seq += 1;
  const defaultLabel =
    typeof opts.label === "string" && opts.label.trim()
      ? opts.label.trim()
      : norm.nodes.length === 1
        ? "Look"
        : `Serial ${seq}`;
  const created = createColorNode(seq, {
    id: `node-${seq}`,
    label: defaultLabel,
    grade: opts.grade,
    curves: opts.curves,
    hsl_curves: opts.hsl_curves,
    power_window: opts.power_window,
    qualifier: opts.qualifier,
    lut: opts.lut
  });
  const selIdx = norm.nodes.findIndex((n) => n.id === norm.selectedNodeId);
  const insertAt = selIdx >= 0 ? selIdx + 1 : norm.nodes.length;
  const nextNodes = [...norm.nodes];
  nextNodes.splice(insertAt, 0, created);
  return {
    nodes: nextNodes,
    selectedNodeId: created.id
  };
}

export function addOutsideColorNodeInTree(tree, sourceNodeId = null) {
  const norm = normalizeColorNodeTree(tree);
  if (norm.nodes.length >= MAX_COLOR_NODES) {
    return norm;
  }
  const targetId = sourceNodeId || norm.selectedNodeId;
  const parent = norm.nodes.find((n) => n.id === targetId);
  if (!parent) {
    return norm;
  }
  const hasPw = isPowerWindowActive(parent.power_window);
  const hasQual = isQualifierActive(parent.qualifier);
  if (!hasPw && !hasQual) {
    return norm;
  }
  const nextPw = hasPw
    ? {
        ...normalizePowerWindow(parent.power_window),
        invert: !parent.power_window.invert
      }
    : createDefaultPowerWindow();
  const nextQual =
    !hasPw && hasQual
      ? {
          ...normalizeQualifier(parent.qualifier),
          invert: !parent.qualifier.invert
        }
      : hasQual
        ? normalizeQualifier(parent.qualifier)
        : createDefaultQualifier();
  const isOutside = hasPw ? nextPw.invert : nextQual.invert;
  return addColorNodeToTree(
    { ...norm, selectedNodeId: parent.id },
    {
      label: isOutside ? "Outside" : "Inside",
      power_window: nextPw,
      qualifier: nextQual
    }
  );
}

export function removeColorNodeFromTree(tree, nodeId) {
  const norm = normalizeColorNodeTree(tree);
  if (norm.nodes.length <= 1) return norm;
  const idx = norm.nodes.findIndex((n) => n.id === nodeId);
  if (idx < 0) return norm;
  const nextNodes = norm.nodes.filter((n) => n.id !== nodeId);
  const nextSel =
    norm.selectedNodeId === nodeId
      ? nextNodes[Math.max(0, Math.min(idx, nextNodes.length - 1))].id
      : norm.selectedNodeId;
  return {
    nodes: nextNodes,
    selectedNodeId: nextSel
  };
}

export function toggleColorNodeBypassInTree(tree, nodeId) {
  const norm = normalizeColorNodeTree(tree);
  return {
    ...norm,
    nodes: norm.nodes.map((n) => (n.id === nodeId ? { ...n, enabled: !n.enabled } : n))
  };
}

export function selectColorNodeInTree(tree, nodeId) {
  const norm = normalizeColorNodeTree(tree);
  if (!norm.nodes.some((n) => n.id === nodeId)) return norm;
  return { ...norm, selectedNodeId: nodeId };
}

export function moveColorNodeInTree(tree, nodeId, direction) {
  const norm = normalizeColorNodeTree(tree);
  const idx = norm.nodes.findIndex((n) => n.id === nodeId);
  const target = idx + (direction < 0 ? -1 : 1);
  if (idx < 0 || target < 0 || target >= norm.nodes.length) return norm;
  const nextNodes = [...norm.nodes];
  const [moved] = nextNodes.splice(idx, 1);
  nextNodes.splice(target, 0, moved);
  return { ...norm, nodes: nextNodes };
}

export function updateColorNodeInTree(tree, nodeId, patch = {}) {
  const norm = normalizeColorNodeTree(tree);
  return {
    ...norm,
    nodes: norm.nodes.map((n) => {
      if (n.id !== nodeId) return n;
      return {
        ...n,
        label:
          typeof patch.label === "string" && patch.label.trim()
            ? patch.label.trim().slice(0, 48)
            : n.label,
        enabled: patch.enabled !== undefined ? Boolean(patch.enabled) : n.enabled,
        grade: patch.grade !== undefined ? normalizeColorGrade(patch.grade) : n.grade,
        curves:
          patch.curves !== undefined
            ? normalizeColorCurves(patch.curves)
            : normalizeColorCurves(n.curves),
        hsl_curves:
          patch.hsl_curves !== undefined
            ? normalizeHslCurves(patch.hsl_curves)
            : normalizeHslCurves(n.hsl_curves),
        color_warper:
          patch.color_warper !== undefined
            ? normalizeColorWarper(patch.color_warper)
            : normalizeColorWarper(n.color_warper),
        power_window:
          patch.power_window !== undefined
            ? normalizePowerWindow(patch.power_window)
            : normalizePowerWindow(n.power_window),
        qualifier:
          patch.qualifier !== undefined
            ? normalizeQualifier(patch.qualifier)
            : normalizeQualifier(n.qualifier),
        lut: patch.lut !== undefined ? normalizeNodeLut(patch.lut) : n.lut
      };
    })
  };
}

function applySingleColorNodeCoreClient(curR, curG, curB, node) {
  let [outR, outG, outB] = applyColorGradeRgbPure(curR, curG, curB, node.grade);
  if (!isColorCurvesIdentity(node.curves)) {
    [outR, outG, outB] = applyColorCurvesRgbClient(outR, outG, outB, node.curves);
  }
  if (!isHslCurvesIdentity(node.hsl_curves)) {
    [outR, outG, outB] = applyHslCurvesRgbClient(outR, outG, outB, node.hsl_curves);
  }
  if (!isColorWarperIdentity(node.color_warper)) {
    [outR, outG, outB] = applyColorWarperRgbClient(outR, outG, outB, node.color_warper);
  }
  if (node.lut && Array.isArray(node.lut.table) && Number(node.lut.mix ?? 1.0) > 1e-6) {
    [outR, outG, outB] = applyCubeLutRgbClient(outR, outG, outB, node.lut, node.lut.mix);
  }
  return [outR, outG, outB];
}

export function applyColorNodeChainRgbClient(r, g, b, treeOrNodes) {
  const nodes = Array.isArray(treeOrNodes)
    ? treeOrNodes
    : treeOrNodes && Array.isArray(treeOrNodes.nodes)
      ? treeOrNodes.nodes
      : [];
  let curR = clampUnitColor(r);
  let curG = clampUnitColor(g);
  let curB = clampUnitColor(b);
  for (const node of nodes) {
    if (!node || node.enabled === false) continue;
    const [outR, outG, outB] = applySingleColorNodeCoreClient(curR, curG, curB, node);
    if (isQualifierActive(node.qualifier)) {
      const qMask = evaluateQualifierMask(node.qualifier, curR, curG, curB);
      curR = clampUnitColor(curR + (outR - curR) * qMask);
      curG = clampUnitColor(curG + (outG - curG) * qMask);
      curB = clampUnitColor(curB + (outB - curB) * qMask);
    } else {
      curR = outR;
      curG = outG;
      curB = outB;
    }
  }
  return [curR, curG, curB];
}

export function applyColorNodeChainRgbAtClient(r, g, b, u, v, treeOrNodes) {
  const nodes = Array.isArray(treeOrNodes)
    ? treeOrNodes
    : treeOrNodes && Array.isArray(treeOrNodes.nodes)
      ? treeOrNodes.nodes
      : [];
  let curR = clampUnitColor(r);
  let curG = clampUnitColor(g);
  let curB = clampUnitColor(b);
  for (const node of nodes) {
    if (!node || node.enabled === false) continue;
    const [outR, outG, outB] = applySingleColorNodeCoreClient(curR, curG, curB, node);
    const hasPw = isPowerWindowActive(node.power_window);
    const hasQual = isQualifierActive(node.qualifier);
    if (hasPw || hasQual) {
      let m = 1.0;
      if (hasPw) m *= evaluatePowerWindowMask(node.power_window, u, v);
      if (hasQual) m *= evaluateQualifierMask(node.qualifier, curR, curG, curB);
      curR = clampUnitColor(curR + (outR - curR) * m);
      curG = clampUnitColor(curG + (outG - curG) * m);
      curB = clampUnitColor(curB + (outB - curB) * m);
    } else {
      curR = outR;
      curG = outG;
      curB = outB;
    }
  }
  return [curR, curG, curB];
}

export function evaluateActiveNodeMaskAtClient(r, g, b, u, v, treeOrNodes, activeNodeId = null) {
  const nodes = Array.isArray(treeOrNodes)
    ? treeOrNodes
    : treeOrNodes && Array.isArray(treeOrNodes.nodes)
      ? treeOrNodes.nodes
      : [];
  const targetId =
    activeNodeId ||
    (treeOrNodes && !Array.isArray(treeOrNodes) ? treeOrNodes.selectedNodeId : null);
  let curR = clampUnitColor(r);
  let curG = clampUnitColor(g);
  let curB = clampUnitColor(b);
  for (const node of nodes) {
    if (!node) continue;
    if (node.id === targetId || (!targetId && node === nodes[nodes.length - 1])) {
      const hasPw = isPowerWindowActive(node.power_window);
      const hasQual = isQualifierActive(node.qualifier);
      if (!hasPw && !hasQual) return 1.0;
      let m = 1.0;
      if (hasPw) m *= evaluatePowerWindowMask(node.power_window, u, v);
      if (hasQual) m *= evaluateQualifierMask(node.qualifier, curR, curG, curB);
      return clampUnitColor(m);
    }
    if (node.enabled === false) continue;
    const [outR, outG, outB] = applySingleColorNodeCoreClient(curR, curG, curB, node);
    const hasPw = isPowerWindowActive(node.power_window);
    const hasQual = isQualifierActive(node.qualifier);
    if (hasPw || hasQual) {
      let m = 1.0;
      if (hasPw) m *= evaluatePowerWindowMask(node.power_window, u, v);
      if (hasQual) m *= evaluateQualifierMask(node.qualifier, curR, curG, curB);
      curR = clampUnitColor(curR + (outR - curR) * m);
      curG = clampUnitColor(curG + (outG - curG) * m);
      curB = clampUnitColor(curB + (outB - curB) * m);
    } else {
      curR = outR;
      curG = outG;
      curB = outB;
    }
  }
  return 1.0;
}

export function applyColorNodesBeforeTargetClient(r, g, b, u, v, treeOrNodes, targetNodeId = null) {
  const nodes = Array.isArray(treeOrNodes)
    ? treeOrNodes
    : treeOrNodes && Array.isArray(treeOrNodes.nodes)
      ? treeOrNodes.nodes
      : [];
  const targetId =
    targetNodeId ||
    (treeOrNodes && !Array.isArray(treeOrNodes) ? treeOrNodes.selectedNodeId : null);
  let curR = clampUnitColor(r);
  let curG = clampUnitColor(g);
  let curB = clampUnitColor(b);
  for (const node of nodes) {
    if (!node) continue;
    if (node.id === targetId) break;
    if (node.enabled === false) continue;
    const [outR, outG, outB] = applySingleColorNodeCoreClient(curR, curG, curB, node);
    const hasPw = isPowerWindowActive(node.power_window);
    const hasQual = isQualifierActive(node.qualifier);
    if (hasPw || hasQual) {
      let m = 1.0;
      if (hasPw) m *= evaluatePowerWindowMask(node.power_window, u, v);
      if (hasQual) m *= evaluateQualifierMask(node.qualifier, curR, curG, curB);
      curR = clampUnitColor(curR + (outR - curR) * m);
      curG = clampUnitColor(curG + (outG - curG) * m);
      curB = clampUnitColor(curB + (outB - curB) * m);
    } else {
      curR = outR;
      curG = outG;
      curB = outB;
    }
  }
  return [curR, curG, curB];
}

function compileSingleGradeFilterStr(grade) {
  const g = normalizeColorGrade(grade);
  const tempR = g.temperature * 0.25;
  const tempG = g.temperature * 0.03;
  const tempB = -g.temperature * 0.28;
  const s = [
    clampBalanceColor(g.lift[0]),
    clampBalanceColor(g.lift[1]),
    clampBalanceColor(g.lift[2])
  ];
  const m = [
    clampBalanceColor(g.gamma[0] + tempR),
    clampBalanceColor(g.gamma[1] + tempG),
    clampBalanceColor(g.gamma[2] + tempB)
  ];
  const h = [
    clampBalanceColor(g.gain[0] + tempR * 0.8),
    clampBalanceColor(g.gain[1] + tempG * 0.8),
    clampBalanceColor(g.gain[2] + tempB * 0.8)
  ];
  const cb = `colorbalance=rs=${s[0].toFixed(4)}:gs=${s[1].toFixed(4)}:bs=${s[2].toFixed(4)}:rm=${m[0].toFixed(4)}:gm=${m[1].toFixed(4)}:bm=${m[2].toFixed(4)}:rh=${h[0].toFixed(4)}:gh=${h[1].toFixed(4)}:bh=${h[2].toFixed(4)}:pl=${g.preserve_lightness ? 1 : 0}`;
  const eq = `eq=contrast=${g.contrast.toFixed(4)}:saturation=${g.saturation.toFixed(4)}`;
  return `${cb},${eq}`;
}

export function compileColorNodeChainClient(treeOrNodes, pixFmt = null) {
  const rawNodes = Array.isArray(treeOrNodes)
    ? treeOrNodes
    : treeOrNodes && Array.isArray(treeOrNodes.nodes)
      ? treeOrNodes.nodes
      : [createColorNode(1)];
  const nodes = rawNodes.length > 0 ? rawNodes : [createColorNode(1)];
  const parts = [];
  let activeCount = 0;
  let hasLutNodes = false;
  let hasPowerWindows = false;
  let hasCurves = false;
  let hasHslCurves = false;
  let hasColorWarper = false;
  let hasQualifiers = false;
  let pwIdx = 0;

  for (const node of nodes) {
    if (!node || node.enabled === false) continue;
    const hasLut = Boolean(node.lut && Array.isArray(node.lut.table) && Number(node.lut.mix ?? 1.0) > 1e-6);
    if (hasLut) hasLutNodes = true;
    const hasPw = isPowerWindowActive(node.power_window);
    const hasQual = isQualifierActive(node.qualifier);
    if (hasPw) hasPowerWindows = true;
    if (hasQual) hasQualifiers = true;
    const nodeStages = [];
    if (!isColorGradeIdentity(node.grade)) {
      nodeStages.push(compileSingleGradeFilterStr(node.grade));
    }
    if (!isColorCurvesIdentity(node.curves)) {
      hasCurves = true;
      const curvesFg = compileColorCurvesFilterClient(node.curves);
      if (curvesFg) nodeStages.push(curvesFg);
    }
    if (!isHslCurvesIdentity(node.hsl_curves)) {
      hasHslCurves = true;
      const hslFg = compileHslCurvesFilterClient(node.hsl_curves);
      if (hslFg) nodeStages.push(hslFg);
    }
    if (!isColorWarperIdentity(node.color_warper)) {
      hasColorWarper = true;
      const warperFg = compileColorWarperFilterClient(node.color_warper);
      if (warperFg) nodeStages.push(warperFg);
    }
    if (nodeStages.length > 0) {
      const nodeFg = nodeStages.join(",");
      if (!hasPw && !hasQual) {
        parts.push(nodeFg);
      } else {
        const tag = `pw${pwIdx}`;
        pwIdx += 1;
        if (hasPw && !hasQual) {
          const maskExpr = compilePowerWindowMaskExprClient(node.power_window);
          parts.push(
            `split=3[${tag}b][${tag}g][${tag}m];` +
              `[${tag}b]format=gbrp[${tag}bg];` +
              `[${tag}g]${nodeFg},format=gbrp[${tag}fg];` +
              `[${tag}m]format=gray,geq=lum='${maskExpr}',split=3[${tag}mr][${tag}mg][${tag}mb];` +
              `[${tag}mr][${tag}mg][${tag}mb]mergeplanes=0x001020:gbrp[${tag}msk];` +
              `[${tag}bg][${tag}fg][${tag}msk]maskedmerge`
          );
        } else {
          const qualNorm = normalizeQualifier(node.qualifier);
          const qualExpr = compileQualifierMaskExprClient(qualNorm);
          const blurPart =
            qualNorm.blur_radius > 1e-3 ? `,gblur=sigma=${qualNorm.blur_radius.toFixed(2)}` : "";
          if (!hasPw) {
            parts.push(
              `split=3[${tag}b][${tag}g][${tag}m];` +
                `[${tag}b]format=gbrp[${tag}bg];` +
                `[${tag}g]${nodeFg},format=gbrp[${tag}fg];` +
                `[${tag}m]format=gbrp,geq=r='${qualExpr}':g='0':b='0',extractplanes=r${blurPart},` +
                `split=3[${tag}mr][${tag}mg][${tag}mb];` +
                `[${tag}mr][${tag}mg][${tag}mb]mergeplanes=0x001020:gbrp[${tag}msk];` +
                `[${tag}bg][${tag}fg][${tag}msk]maskedmerge`
            );
          } else {
            const pwExpr = compilePowerWindowMaskExprClient(node.power_window);
            parts.push(
              `split=4[${tag}b][${tag}g][${tag}mq][${tag}mp];` +
                `[${tag}b]format=gbrp[${tag}bg];` +
                `[${tag}g]${nodeFg},format=gbrp[${tag}fg];` +
                `[${tag}mq]format=gbrp,geq=r='${qualExpr}':g='0':b='0',extractplanes=r${blurPart}[${tag}qm];` +
                `[${tag}mp]format=gray,geq=lum='${pwExpr}'[${tag}pm];` +
                `[${tag}qm][${tag}pm]blend=all_mode=multiply,split=3[${tag}mr][${tag}mg][${tag}mb];` +
                `[${tag}mr][${tag}mg][${tag}mb]mergeplanes=0x001020:gbrp[${tag}msk];` +
                `[${tag}bg][${tag}fg][${tag}msk]maskedmerge`
            );
          }
        }
      }
    }
    if (!isColorNodeIdentity(node)) {
      activeCount += 1;
    }
  }

  if (parts.length === 0) {
    parts.push(compileSingleGradeFilterStr(createNeutralColorGrade()));
  }
  if (pixFmt) {
    parts.push(`format=${pixFmt}`);
  }
  const fg = parts.join(",");
  return {
    filtergraph: fg,
    ffmpeg_vf_args: ["-vf", fg],
    is_identity: activeCount === 0,
    active_node_count: activeCount,
    total_node_count: nodes.length,
    has_lut_nodes: hasLutNodes,
    has_power_windows: hasPowerWindows,
    has_curves: hasCurves,
    has_hsl_curves: hasHslCurves,
    has_color_warper: hasColorWarper,
    has_qualifiers: hasQualifiers
  };
}

export function serializeColorNodeForApi(node) {
  const norm = normalizeColorNode(node);
  const lut = norm.lut;
  return {
    id: norm.id,
    label: norm.label,
    enabled: norm.enabled,
    grade: norm.grade,
    curves: normalizeColorCurves(norm.curves),
    hsl_curves: normalizeHslCurves(norm.hsl_curves),
    color_warper: normalizeColorWarper(norm.color_warper),
    power_window: normalizePowerWindow(norm.power_window),
    qualifier: normalizeQualifier(norm.qualifier),
    lut_title: lut ? lut.title : "",
    lut_dimension: lut ? lut.dimension : null,
    lut_size: lut ? lut.size : null,
    lut_mix: lut ? clampUnitColor(lut.mix) : 1.0,
    lut_domain_min: lut ? lut.domainMin : [0.0, 0.0, 0.0],
    lut_domain_max: lut ? lut.domainMax : [1.0, 1.0, 1.0],
    lut_table: lut ? lut.table : null,
    lut_path: ""
  };
}

export function deserializeColorNodeFromApi(rawNode, index = 0) {
  const n = rawNode && typeof rawNode === "object" ? rawNode : {};
  let lut = null;
  if (Array.isArray(n.lut_table) && n.lut_table.length > 0 && n.lut_size) {
    lut = normalizeNodeLut({
      title: n.lut_title || "Imported LUT",
      dimension: n.lut_dimension || "3D",
      size: n.lut_size,
      domainMin: n.lut_domain_min || [0, 0, 0],
      domainMax: n.lut_domain_max || [1, 1, 1],
      mix: n.lut_mix !== undefined ? n.lut_mix : 1.0,
      table: n.lut_table
    });
  } else if (n.lut) {
    lut = normalizeNodeLut(n.lut);
  }
  return createColorNode(index + 1, {
    id: n.id,
    label: n.label,
    enabled: n.enabled,
    grade: n.grade,
    curves: n.curves,
    hsl_curves: n.hsl_curves,
    color_warper: n.color_warper,
    power_window: n.power_window,
    qualifier: n.qualifier,
    lut
  });
}

export function bakeColorNodeChainToCubeTextClient(treeOrNodes, size = 33, title = "taktcut_node_tree") {
  if (!Number.isInteger(size) || size < 2 || size > 65) {
    throw new Error("3D LUT size must be between 2 and 65");
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
        const [ro, go, bo] = applyColorNodeChainRgbClient(rIn, gIn, bIn, treeOrNodes);
        lines.push(`${ro.toFixed(6)} ${go.toFixed(6)} ${bo.toFixed(6)}`);
      }
    }
  }
  return `${lines.join("\n")}\n`;
}

export const STABILIZER_PRESETS_CLIENT = {
  smooth_gimbal: {
    id: "smooth_gimbal",
    name: "Smooth Gimbal",
    rx: 16,
    ry: 16,
    edge: "mirror",
    blocksize: 8,
    contrast: 125,
    search: "exhaustive",
    auto_zoom_pct: 106.0
  },
  locked_tripod: {
    id: "locked_tripod",
    name: "Locked Tripod",
    rx: 32,
    ry: 32,
    edge: "clamp",
    blocksize: 16,
    contrast: 100,
    search: "exhaustive",
    auto_zoom_pct: 112.0
  },
  handheld_rescue: {
    id: "handheld_rescue",
    name: "Handheld Rescue",
    rx: 48,
    ry: 48,
    edge: "mirror",
    blocksize: 12,
    contrast: 90,
    search: "exhaustive",
    auto_zoom_pct: 118.0
  }
};

export const PLANAR_TRACKER_PRESETS_CLIENT = {
  screen_insert: {
    id: "screen_insert",
    name: "Screen Insert",
    mode: "corner_pin",
    interpolation: "cubic",
    tl_x: 0.14,
    tl_y: 0.14,
    tr_x: 0.84,
    tr_y: 0.18,
    bl_x: 0.10,
    bl_y: 0.84,
    br_x: 0.86,
    br_y: 0.88
  },
  anamorphic_skew: {
    id: "anamorphic_skew",
    name: "Anamorphic Skew",
    mode: "corner_pin",
    interpolation: "cubic",
    tl_x: 0.05,
    tl_y: 0.06,
    tr_x: 0.95,
    tr_y: 0.14,
    bl_x: 0.12,
    bl_y: 0.94,
    br_x: 0.90,
    br_y: 0.86
  },
  deskew_rectify: {
    id: "deskew_rectify",
    name: "Deskew / Rectify",
    mode: "rectify_perspective",
    interpolation: "cubic",
    tl_x: 0.12,
    tl_y: 0.10,
    tr_x: 0.88,
    tr_y: 0.14,
    bl_x: 0.08,
    bl_y: 0.90,
    br_x: 0.92,
    br_y: 0.88
  },
  point_follow: {
    id: "point_follow",
    name: "2D Point Follow",
    mode: "point_track_only",
    interpolation: "cubic",
    tl_x: 0.0,
    tl_y: 0.0,
    tr_x: 1.0,
    tr_y: 0.0,
    bl_x: 0.0,
    bl_y: 1.0,
    br_x: 1.0,
    br_y: 1.0
  }
};

export function normalizeStabilizerClient(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const presetId = typeof src.preset === "string" && STABILIZER_PRESETS_CLIENT[src.preset]
    ? src.preset
    : src.preset === "custom"
      ? "custom"
      : "smooth_gimbal";
  const base = STABILIZER_PRESETS_CLIENT[presetId] || STABILIZER_PRESETS_CLIENT.smooth_gimbal;
  const clampInt = (v, lo, hi, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : fallback;
  };
  const clampNum = (v, lo, hi, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
  };
  const validEdges = new Set(["mirror", "clamp", "original", "blank"]);
  const edge = validEdges.has(String(src.edge || "").toLowerCase())
    ? String(src.edge).toLowerCase()
    : base.edge;
  const search = String(src.search || "").toLowerCase() === "less" ? "less" : "exhaustive";
  return {
    enabled: Boolean(src.enabled),
    preset: presetId,
    rx: clampInt(src.rx, 0, 64, base.rx),
    ry: clampInt(src.ry, 0, 64, base.ry),
    edge,
    blocksize: clampInt(src.blocksize, 4, 64, base.blocksize),
    contrast: clampInt(src.contrast, 1, 255, base.contrast),
    search,
    auto_zoom_pct: clampNum(src.auto_zoom_pct, 100, 135, base.auto_zoom_pct)
  };
}

export function compileStabilizerFilterClient(raw, opts = {}) {
  const params = normalizeStabilizerClient(raw);
  if (!params.enabled) {
    return { filtergraph: "", ffmpeg_vf_args: [], is_active: false, params };
  }
  const effRx = Math.max(0, Math.min(64, Math.round(params.rx / 16) * 16));
  const parts = [
    `deshake=x=-1:y=-1:w=-1:h=-1:rx=${effRx}:ry=${params.ry}:edge=${params.edge}:blocksize=${params.blocksize}:contrast=${params.contrast}:search=${params.search}`
  ];
  if (params.auto_zoom_pct > 100.05) {
    const z = (params.auto_zoom_pct / 100.0).toFixed(4);
    parts.push(`scale=w=ceil(iw*${z}/2)*2:h=ceil(ih*${z}/2)*2:flags=bicubic`);
    if (opts.width && opts.height) {
      const wEven = Math.max(2, Math.floor(Number(opts.width) / 2) * 2);
      const hEven = Math.max(2, Math.floor(Number(opts.height) / 2) * 2);
      parts.push(`crop=w=${wEven}:h=${hEven}:x=(iw-${wEven})/2:y=(ih-${hEven})/2`);
    } else {
      parts.push(`crop=w=floor(iw/${z}/2)*2:h=floor(ih/${z}/2)*2`);
    }
    parts.push("setsar=1");
  }
  if (opts.pix_fmt) parts.push(`format=${opts.pix_fmt}`);
  const fg = parts.join(",");
  return { filtergraph: fg, ffmpeg_vf_args: ["-vf", fg], is_active: true, params };
}

export function normalizePlanarTrackerClient(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const clampCoord = (v, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(-0.25, Math.min(1.25, n)) : fallback;
  };
  const clampAnchor = (v, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0.02, Math.min(0.98, n)) : fallback;
  };
  const mode = ["corner_pin", "rectify_perspective", "point_track_only"].includes(String(src.mode))
    ? String(src.mode)
    : "corner_pin";
  const interpolation = String(src.interpolation) === "linear" ? "linear" : "cubic";
  const rawKfs = Array.isArray(src.track_keyframes) ? src.track_keyframes : [];
  const kfMap = new Map();
  for (const kf of rawKfs) {
    if (!kf || typeof kf !== "object") continue;
    const f = Math.max(0, Math.round(Number(kf.frame) || 0));
    const x = Number(kf.x);
    const y = Number(kf.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const conf = Number.isFinite(Number(kf.confidence))
      ? Math.max(0, Math.min(1, Number(kf.confidence)))
      : 1.0;
    kfMap.set(f, { frame: f, x, y, confidence: conf });
  }
  const track_keyframes = Array.from(kfMap.values()).sort((a, b) => a.frame - b.frame);
  return {
    enabled: Boolean(src.enabled),
    preset: typeof src.preset === "string" && src.preset ? src.preset : "screen_insert",
    mode,
    interpolation,
    tl_x: clampCoord(src.tl_x, 0.08),
    tl_y: clampCoord(src.tl_y, 0.10),
    tr_x: clampCoord(src.tr_x, 0.92),
    tr_y: clampCoord(src.tr_y, 0.08),
    bl_x: clampCoord(src.bl_x, 0.06),
    bl_y: clampCoord(src.bl_y, 0.90),
    br_x: clampCoord(src.br_x, 0.94),
    br_y: clampCoord(src.br_y, 0.92),
    track_anchor_x: clampAnchor(src.track_anchor_x, 0.50),
    track_anchor_y: clampAnchor(src.track_anchor_y, 0.45),
    track_box_pct: Number.isFinite(Number(src.track_box_pct))
      ? Math.max(0.04, Math.min(0.35, Number(src.track_box_pct)))
      : 0.12,
    follow_track: src.follow_track !== undefined ? Boolean(src.follow_track) : true,
    track_keyframes
  };
}

export function evaluateTrackPointClient(rawTracker, frame) {
  const params = normalizePlanarTrackerClient(rawTracker);
  const kfs = params.track_keyframes;
  if (!kfs.length) {
    return { x: params.track_anchor_x, y: params.track_anchor_y, confidence: 1.0 };
  }
  if (frame <= kfs[0].frame) return { ...kfs[0] };
  if (frame >= kfs[kfs.length - 1].frame) return { ...kfs[kfs.length - 1] };
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (a.frame <= frame && frame <= b.frame) {
      const span = Math.max(1, b.frame - a.frame);
      const u = (frame - a.frame) / span;
      return {
        x: a.x + (b.x - a.x) * u,
        y: a.y + (b.y - a.y) * u,
        confidence: a.confidence + (b.confidence - a.confidence) * u
      };
    }
  }
  return { ...kfs[kfs.length - 1] };
}

export function evaluateCornerPinsClient(rawTracker, frame) {
  const params = normalizePlanarTrackerClient(rawTracker);
  let dx = 0;
  let dy = 0;
  if (params.follow_track && params.track_keyframes.length >= 1) {
    const ref = params.track_keyframes[0];
    const cur = evaluateTrackPointClient(params, frame);
    dx = cur.x - ref.x;
    dy = cur.y - ref.y;
  }
  return {
    tl: { x: params.tl_x + dx, y: params.tl_y + dy },
    tr: { x: params.tr_x + dx, y: params.tr_y + dy },
    bl: { x: params.bl_x + dx, y: params.bl_y + dy },
    br: { x: params.br_x + dx, y: params.br_y + dy }
  };
}

export function compilePlanarTrackerFilterClient(raw, opts = {}) {
  const params = normalizePlanarTrackerClient(raw);
  const isIdentity =
    Math.abs(params.tl_x) <= 1e-4 &&
    Math.abs(params.tl_y) <= 1e-4 &&
    Math.abs(params.tr_x - 1) <= 1e-4 &&
    Math.abs(params.tr_y) <= 1e-4 &&
    Math.abs(params.bl_x) <= 1e-4 &&
    Math.abs(params.bl_y - 1) <= 1e-4 &&
    Math.abs(params.br_x - 1) <= 1e-4 &&
    Math.abs(params.br_y - 1) <= 1e-4;
  const hasDynamic = params.follow_track && params.track_keyframes.length >= 2;
  if (!params.enabled || params.mode === "point_track_only" || (isIdentity && !hasDynamic)) {
    return {
      filtergraph: "",
      ffmpeg_vf_args: [],
      is_active: false,
      mode: params.mode,
      uses_per_frame_eval: false,
      keyframe_count: params.track_keyframes.length,
      params
    };
  }
  const sense = params.mode === "corner_pin" ? "destination" : "source";
  const fg = `perspective=x0=${params.tl_x.toFixed(4)}*W:y0=${params.tl_y.toFixed(4)}*H:x1=${params.tr_x.toFixed(4)}*W:y1=${params.tr_y.toFixed(4)}*H:x2=${params.bl_x.toFixed(4)}*W:y2=${params.bl_y.toFixed(4)}*H:x3=${params.br_x.toFixed(4)}*W:y3=${params.br_y.toFixed(4)}*H:interpolation=${params.interpolation}:sense=${sense}${hasDynamic ? ":eval=frame" : ""}`;
  const fullFg = opts.pix_fmt ? `${fg},format=${opts.pix_fmt}` : fg;
  return {
    filtergraph: fullFg,
    ffmpeg_vf_args: ["-vf", fullFg],
    is_active: true,
    mode: params.mode,
    uses_per_frame_eval: hasDynamic,
    keyframe_count: params.track_keyframes.length,
    params
  };
}

export const ALLOWED_TIMELINE_TOOLS = ["select", "trim", "roll", "slip", "slide", "blade"];

export function normalizeTimelineTool(raw) {
  const cleaned = String(raw || "").trim().toLowerCase();
  return ALLOWED_TIMELINE_TOOLS.includes(cleaned) ? cleaned : "select";
}

export function countSyncLockedTracks(doc) {
  if (!doc || !Array.isArray(doc.tracks)) return 0;
  return doc.tracks.reduce((acc, trk) => acc + (Boolean(trk && trk.sync_locked) ? 1 : 0), 0);
}

export function toggleTrackSyncLockInDocument(doc, trackKind, trackIndex) {
  if (!doc || !Array.isArray(doc.tracks)) {
    return { doc, track: null, changed: false, syncLockedTracks: 0 };
  }
  const nextDoc = cloneTimelineDoc(doc);
  const trk = nextDoc.tracks.find((t) => t.kind === trackKind && t.index === trackIndex);
  if (!trk) {
    return { doc, track: null, changed: false, syncLockedTracks: countSyncLockedTracks(doc) };
  }
  trk.sync_locked = !Boolean(trk.sync_locked);
  return {
    doc: nextDoc,
    track: trk,
    changed: true,
    syncLockedTracks: countSyncLockedTracks(nextDoc)
  };
}

export function setAllTracksSyncLockInDocument(doc, enabled) {
  if (!doc || !Array.isArray(doc.tracks)) {
    return { doc, changed: false, syncLockedTracks: 0 };
  }
  const targetFlag = Boolean(enabled);
  const nextDoc = cloneTimelineDoc(doc);
  let changed = false;
  for (const trk of nextDoc.tracks) {
    if (Boolean(trk.sync_locked) !== targetFlag) {
      trk.sync_locked = targetFlag;
      changed = true;
    }
  }
  if (!changed) {
    return { doc, changed: false, syncLockedTracks: countSyncLockedTracks(doc) };
  }
  return {
    doc: nextDoc,
    changed: true,
    syncLockedTracks: countSyncLockedTracks(nextDoc)
  };
}

function _minTlDeltaForSourceIn(currentSourceIn, sourceFps, timelineFps, candidateMinTlDelta) {
  const minCand = Math.round(candidateMinTlDelta);
  if (minCand >= 0) return minCand;
  const srcRate = sourceFps ? sourceFps.num / Math.max(1, sourceFps.den) : 1;
  const tlRate = timelineFps ? timelineFps.num / Math.max(1, timelineFps.den) : 1;
  if (!sourceFps || Math.abs(srcRate - tlRate) < 1e-6) {
    return Math.max(minCand, -Math.max(0, currentSourceIn || 0));
  }
  let lo = minCand;
  let hi = 0;
  let best = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const srcDelta = computeSourceFrameDelta(mid, sourceFps, timelineFps);
    if ((currentSourceIn || 0) + srcDelta >= 0) {
      best = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return best;
}

function _syncLockNegativeFloor(doc, sourceTrack, anchorFrame, proposedShift, excludeClips = []) {
  if (proposedShift >= 0 || !Boolean(sourceTrack && sourceTrack.sync_locked)) {
    return proposedShift;
  }
  let clamped = proposedShift;
  const docStart = doc.start_frame || 0;
  for (const trk of doc.tracks || []) {
    if (trk === sourceTrack || !Boolean(trk.sync_locked)) continue;
    let upstreamEnd = docStart;
    let earliestDown = null;
    for (const c of trk.clips || []) {
      if (excludeClips.includes(c)) {
        upstreamEnd = Math.max(upstreamEnd, c.start_frame + (c.duration_frames || 0));
        continue;
      }
      if (c.start_frame >= anchorFrame) {
        if (earliestDown === null || c.start_frame < earliestDown) {
          earliestDown = c.start_frame;
        }
      } else {
        upstreamEnd = Math.max(upstreamEnd, c.start_frame + (c.duration_frames || 0));
      }
    }
    if (earliestDown !== null) {
      const maxNeg = upstreamEnd - earliestDown;
      if (maxNeg > clamped) clamped = maxNeg;
    }
  }
  return Math.min(0, clamped);
}

function _applySyncLockedRipple(doc, sourceTrack, anchorFrame, shiftFrames, excludeClipOrList = null) {
  if (shiftFrames === 0) return 0;
  const excludeList = Array.isArray(excludeClipOrList)
    ? excludeClipOrList
    : excludeClipOrList
      ? [excludeClipOrList]
      : [];
  let shifted = 0;
  const docStart = doc.start_frame || 0;
  const srcLocked = Boolean(sourceTrack && sourceTrack.sync_locked);
  for (const trk of doc.tracks || []) {
    if (trk !== sourceTrack && !(srcLocked && Boolean(trk.sync_locked))) continue;
    for (const c of trk.clips || []) {
      if (excludeList.includes(c)) continue;
      if (c.start_frame >= anchorFrame) {
        c.start_frame = Math.max(docStart, c.start_frame + shiftFrames);
        shifted += 1;
      }
    }
    if (Array.isArray(trk.clips)) {
      trk.clips.sort((a, b) => a.start_frame - b.start_frame || a.duration_frames - b.duration_frames);
    }
  }
  return shifted;
}

export function rippleTrimClipInDocument(doc, trackKind, trackIndex, clipIndex, edge, deltaFrames, opts = {}) {
  const delta = Math.round(Number(deltaFrames) || 0);
  if (delta === 0) {
    return {
      doc,
      clip: null,
      changed: false,
      deltaApplied: 0,
      shiftedCount: 0,
      syncLockedTracks: countSyncLockedTracks(doc),
      detail: "Zero delta."
    };
  }
  const foundOrig = findTrackAndClip(doc, trackKind, trackIndex, clipIndex);
  if (!foundOrig) {
    return {
      doc,
      clip: null,
      changed: false,
      deltaApplied: 0,
      shiftedCount: 0,
      syncLockedTracks: countSyncLockedTracks(doc),
      detail: "Target clip not found."
    };
  }
  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, trackKind, trackIndex, clipIndex);
  if (!found) {
    return {
      doc,
      clip: null,
      changed: false,
      deltaApplied: 0,
      shiftedCount: 0,
      syncLockedTracks: countSyncLockedTracks(doc),
      detail: "Target clip not found."
    };
  }
  const { trk, clip } = found;
  const respectAvLink = Boolean(opts && opts.respectAvLink);
  const partnerInfo = respectAvLink ? _findLinkedPartnerInDoc(nextDoc, clip) : null;
  const partnerClip = partnerInfo ? partnerInfo.clip : null;
  const excludeList = partnerClip ? [clip, partnerClip] : [clip];
  const origDur = clip.duration_frames;
  const origEnd = clip.start_frame + origDur;

  if (edge === "right") {
    let minDelta = 1 - origDur;
    if (partnerClip) {
      minDelta = Math.max(minDelta, 1 - partnerClip.duration_frames);
    }
    let effDelta = Math.max(minDelta, delta);
    if (effDelta < 0) {
      effDelta = _syncLockNegativeFloor(nextDoc, trk, origEnd, effDelta, excludeList);
    }
    if (effDelta === 0) {
      return {
        doc,
        clip: foundOrig.clip,
        changed: false,
        deltaApplied: 0,
        shiftedCount: 0,
        syncLockedTracks: countSyncLockedTracks(doc),
        detail: "Ripple trim clamped at boundary."
      };
    }
    clip.duration_frames = origDur + effDelta;
    if (partnerClip) {
      partnerClip.duration_frames += effDelta;
    }
    const shiftedCount = _applySyncLockedRipple(nextDoc, trk, origEnd, effDelta, excludeList);
    return {
      doc: nextDoc,
      clip,
      changed: true,
      deltaApplied: effDelta,
      shiftedCount,
      syncLockedTracks: countSyncLockedTracks(nextDoc),
      detail: `Ripple Out ${effDelta > 0 ? `+${effDelta}` : effDelta}f (dur=${clip.duration_frames}f)`
    };
  }

  if (edge === "left") {
    let maxPosDelta = origDur - 1;
    if (partnerClip) {
      maxPosDelta = Math.min(maxPosDelta, partnerClip.duration_frames - 1);
    }
    let minNegDelta = _minTlDeltaForSourceIn(
      clip.source_in_frame || 0,
      clip.source_fps,
      nextDoc.fps,
      delta
    );
    if (partnerClip) {
      const pMinNeg = _minTlDeltaForSourceIn(
        partnerClip.source_in_frame || 0,
        partnerClip.source_fps,
        nextDoc.fps,
        delta
      );
      minNegDelta = Math.max(minNegDelta, pMinNeg);
    }
    let effDelta = Math.max(minNegDelta, Math.min(maxPosDelta, delta));
    let rippleShift = -effDelta;
    if (rippleShift < 0) {
      rippleShift = _syncLockNegativeFloor(nextDoc, trk, origEnd, rippleShift, excludeList);
      effDelta = -rippleShift;
    }
    if (effDelta === 0) {
      return {
        doc,
        clip: foundOrig.clip,
        changed: false,
        deltaApplied: 0,
        shiftedCount: 0,
        syncLockedTracks: countSyncLockedTracks(doc),
        detail: "Ripple trim left clamped at source start or sync boundary."
      };
    }
    const srcDelta = computeSourceFrameDelta(effDelta, clip.source_fps, nextDoc.fps);
    clip.source_in_frame = Math.max(0, (clip.source_in_frame || 0) + srcDelta);
    clip.duration_frames = origDur - effDelta;
    if (partnerClip) {
      const pSrcDelta = computeSourceFrameDelta(effDelta, partnerClip.source_fps, nextDoc.fps);
      partnerClip.source_in_frame = Math.max(0, (partnerClip.source_in_frame || 0) + pSrcDelta);
      partnerClip.duration_frames -= effDelta;
    }
    const shiftedCount = _applySyncLockedRipple(nextDoc, trk, origEnd, rippleShift, excludeList);
    return {
      doc: nextDoc,
      clip,
      changed: true,
      deltaApplied: effDelta,
      shiftedCount,
      syncLockedTracks: countSyncLockedTracks(nextDoc),
      detail: `Ripple In ${effDelta > 0 ? `+${effDelta}` : effDelta}f (srcIn=${clip.source_in_frame}f, dur=${clip.duration_frames}f)`
    };
  }

  return {
    doc,
    clip: null,
    changed: false,
    deltaApplied: 0,
    shiftedCount: 0,
    syncLockedTracks: countSyncLockedTracks(doc),
    detail: "Invalid trim edge."
  };
}

export function rollEditCutInDocument(doc, trackKind, trackIndex, leftClipIndex, deltaFrames) {
  const delta = Math.round(Number(deltaFrames) || 0);
  if (delta === 0) {
    return { doc, leftClip: null, rightClip: null, changed: false, deltaApplied: 0, detail: "Zero delta." };
  }
  const foundOrig = findTrackAndClip(doc, trackKind, trackIndex, leftClipIndex);
  if (!foundOrig) {
    return { doc, leftClip: null, rightClip: null, changed: false, deltaApplied: 0, detail: "Left clip not found." };
  }
  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, trackKind, trackIndex, leftClipIndex);
  if (!found) {
    return { doc, leftClip: null, rightClip: null, changed: false, deltaApplied: 0, detail: "Left clip not found." };
  }
  const { trk, clip: leftClip } = found;
  if (leftClipIndex + 1 >= trk.clips.length) {
    return { doc, leftClip: null, rightClip: null, changed: false, deltaApplied: 0, detail: "No adjacent incoming clip for roll edit." };
  }
  const rightClip = trk.clips[leftClipIndex + 1];
  if (leftClip.start_frame + leftClip.duration_frames !== rightClip.start_frame) {
    return { doc, leftClip: null, rightClip: null, changed: false, deltaApplied: 0, detail: "Clips are not adjacent." };
  }

  let minDelta = 1 - leftClip.duration_frames;
  if (delta < 0) {
    minDelta = _minTlDeltaForSourceIn(
      rightClip.source_in_frame || 0,
      rightClip.source_fps,
      nextDoc.fps,
      minDelta
    );
  }
  const maxDelta = rightClip.duration_frames - 1;
  const effDelta = Math.max(minDelta, Math.min(maxDelta, delta));
  if (effDelta === 0) {
    return { doc, leftClip: foundOrig.clip, rightClip: null, changed: false, deltaApplied: 0, detail: "Roll edit clamped at bounds." };
  }
  const srcDelta = computeSourceFrameDelta(effDelta, rightClip.source_fps, nextDoc.fps);
  leftClip.duration_frames += effDelta;
  rightClip.start_frame += effDelta;
  rightClip.duration_frames -= effDelta;
  rightClip.source_in_frame = Math.max(0, (rightClip.source_in_frame || 0) + srcDelta);
  return {
    doc: nextDoc,
    leftClip,
    rightClip,
    changed: true,
    deltaApplied: effDelta,
    detail: `Roll ${effDelta > 0 ? `+${effDelta}` : effDelta}f (out=${leftClip.duration_frames}f | in=${rightClip.duration_frames}f)`
  };
}

export function slipClipInDocument(doc, trackKind, trackIndex, clipIndex, deltaSourceFrames) {
  const delta = Math.round(Number(deltaSourceFrames) || 0);
  if (delta === 0) {
    return { doc, clip: null, changed: false, deltaApplied: 0, detail: "Zero delta." };
  }
  const foundOrig = findTrackAndClip(doc, trackKind, trackIndex, clipIndex);
  if (!foundOrig) {
    return { doc, clip: null, changed: false, deltaApplied: 0, detail: "Target clip not found." };
  }
  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, trackKind, trackIndex, clipIndex);
  if (!found) {
    return { doc, clip: null, changed: false, deltaApplied: 0, detail: "Target clip not found." };
  }
  const { clip } = found;
  const curSrcIn = clip.source_in_frame || 0;
  const newSrcIn = Math.max(0, curSrcIn + delta);
  const effDelta = newSrcIn - curSrcIn;
  if (effDelta === 0) {
    return { doc, clip: foundOrig.clip, changed: false, deltaApplied: 0, detail: "Slip clamped at source frame 0." };
  }
  clip.source_in_frame = newSrcIn;
  return {
    doc: nextDoc,
    clip,
    changed: true,
    deltaApplied: effDelta,
    detail: `Slip ${effDelta > 0 ? `+${effDelta}` : effDelta}f (srcIn=${clip.source_in_frame}f)`
  };
}

export function slideClipInDocument(doc, trackKind, trackIndex, clipIndex, deltaFrames) {
  const delta = Math.round(Number(deltaFrames) || 0);
  if (delta === 0) {
    return { doc, clip: null, changed: false, deltaApplied: 0, detail: "Zero delta." };
  }
  const foundOrig = findTrackAndClip(doc, trackKind, trackIndex, clipIndex);
  if (!foundOrig) {
    return { doc, clip: null, changed: false, deltaApplied: 0, detail: "Target clip not found." };
  }
  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, trackKind, trackIndex, clipIndex);
  if (!found) {
    return { doc, clip: null, changed: false, deltaApplied: 0, detail: "Target clip not found." };
  }
  const { trk, clip } = found;
  const prevClip = clipIndex > 0 ? trk.clips[clipIndex - 1] : null;
  const nextClip = clipIndex + 1 < trk.clips.length ? trk.clips[clipIndex + 1] : null;
  const clipEnd = clip.start_frame + clip.duration_frames;
  const leftAdj = Boolean(prevClip && prevClip.start_frame + prevClip.duration_frames === clip.start_frame);
  const rightAdj = Boolean(nextClip && clipEnd === nextClip.start_frame);

  let minDelta = (nextDoc.start_frame || 0) - clip.start_frame;
  if (prevClip) {
    if (leftAdj) {
      minDelta = Math.max(minDelta, 1 - prevClip.duration_frames);
    } else {
      minDelta = Math.max(minDelta, prevClip.start_frame + prevClip.duration_frames - clip.start_frame);
    }
  }
  if (nextClip && rightAdj && delta < 0) {
    minDelta = _minTlDeltaForSourceIn(
      nextClip.source_in_frame || 0,
      nextClip.source_fps,
      nextDoc.fps,
      minDelta
    );
  }

  let maxDelta = delta > 0 ? delta : 0;
  if (nextClip) {
    maxDelta = rightAdj ? nextClip.duration_frames - 1 : nextClip.start_frame - clipEnd;
  }

  const effDelta = Math.max(minDelta, Math.min(maxDelta, delta));
  if (effDelta === 0) {
    return { doc, clip: foundOrig.clip, changed: false, deltaApplied: 0, detail: "Slide clamped at neighbor or start boundary." };
  }

  if (prevClip && leftAdj) {
    prevClip.duration_frames += effDelta;
  }
  clip.start_frame += effDelta;
  if (nextClip && rightAdj) {
    const srcDelta = computeSourceFrameDelta(effDelta, nextClip.source_fps, nextDoc.fps);
    nextClip.start_frame += effDelta;
    nextClip.duration_frames -= effDelta;
    nextClip.source_in_frame = Math.max(0, (nextClip.source_in_frame || 0) + srcDelta);
  }

  return {
    doc: nextDoc,
    clip,
    changed: true,
    deltaApplied: effDelta,
    detail: `Slide ${effDelta > 0 ? `+${effDelta}` : effDelta}f (start=${clip.start_frame}f)`
  };
}

export function moveClipInDocument(doc, trackKind, trackIndex, clipIndex, deltaFrames) {
  const delta = Math.round(Number(deltaFrames) || 0);
  if (delta === 0) {
    return { doc, clip: null, changed: false, deltaApplied: 0, detail: "Zero delta." };
  }
  const foundOrig = findTrackAndClip(doc, trackKind, trackIndex, clipIndex);
  if (!foundOrig) {
    return { doc, clip: null, changed: false, deltaApplied: 0, detail: "Target clip not found." };
  }
  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, trackKind, trackIndex, clipIndex);
  if (!found) {
    return { doc, clip: null, changed: false, deltaApplied: 0, detail: "Target clip not found." };
  }
  const { trk, clip } = found;
  const docStart = nextDoc.start_frame || 0;
  const clipEnd = clip.start_frame + clip.duration_frames;
  let prevEnd = docStart;
  let nextStart = Number.POSITIVE_INFINITY;
  for (let i = 0; i < trk.clips.length; i++) {
    if (i === clipIndex) continue;
    const other = trk.clips[i];
    const otherEnd = other.start_frame + other.duration_frames;
    if (otherEnd <= clip.start_frame && otherEnd > prevEnd) prevEnd = otherEnd;
    if (other.start_frame >= clipEnd && other.start_frame < nextStart) nextStart = other.start_frame;
  }
  const minDelta = prevEnd - clip.start_frame;
  const maxDelta = Number.isFinite(nextStart) ? nextStart - clipEnd : delta;
  const effDelta = Math.max(minDelta, Math.min(maxDelta, delta));
  if (effDelta === 0) {
    return { doc, clip: foundOrig.clip, changed: false, deltaApplied: 0, detail: "Move clamped at neighbor or start boundary." };
  }
  clip.start_frame += effDelta;
  return {
    doc: nextDoc,
    clip,
    changed: true,
    deltaApplied: effDelta,
    detail: `Move ${effDelta > 0 ? `+${effDelta}` : effDelta}f (start=${clip.start_frame}f)`
  };
}

export function findAdjacentRollTarget(doc, trackKind, trackIndex, clipIndex, edge = "right") {
  const found = findTrackAndClip(doc, trackKind, trackIndex, clipIndex);
  if (!found) return null;
  const { trk, clip } = found;
  if (edge === "left") {
    if (clipIndex <= 0) return null;
    const prevClip = trk.clips[clipIndex - 1];
    if (prevClip.start_frame + prevClip.duration_frames !== clip.start_frame) return null;
    return {
      trackKind,
      trackIndex,
      leftClipIndex: clipIndex - 1,
      rightClipIndex: clipIndex,
      cutFrame: clip.start_frame,
      leftClip: prevClip,
      rightClip: clip
    };
  }
  if (clipIndex + 1 >= trk.clips.length) return null;
  const nextClip = trk.clips[clipIndex + 1];
  const cutFrame = clip.start_frame + clip.duration_frames;
  if (cutFrame !== nextClip.start_frame) return null;
  return {
    trackKind,
    trackIndex,
    leftClipIndex: clipIndex,
    rightClipIndex: clipIndex + 1,
    cutFrame,
    leftClip: clip,
    rightClip: nextClip
  };
}

// ============================================================================
// Fairlight Broadcast Audio Rack: 4-Band Parametric EQ, Compressor & Limiter
// ============================================================================

export const FAIRLIGHT_EQ_BAND_ORDER = ["low", "low_mid", "high_mid", "high"];

export const FAIRLIGHT_EQ_BAND_SPECS = {
  low: { filter_type: "lowshelf", defaultFreq: 100.0, minFreq: 20.0, maxFreq: 500.0, defaultQ: 0.7, color: "#ffb648", shortLabel: "L" },
  low_mid: { filter_type: "peaking", defaultFreq: 400.0, minFreq: 80.0, maxFreq: 2500.0, defaultQ: 1.2, color: "#39c5cf", shortLabel: "LM" },
  high_mid: { filter_type: "peaking", defaultFreq: 3200.0, minFreq: 500.0, maxFreq: 10000.0, defaultQ: 1.4, color: "#a78bfa", shortLabel: "HM" },
  high: { filter_type: "highshelf", defaultFreq: 10000.0, minFreq: 2000.0, maxFreq: 20000.0, defaultQ: 0.7, color: "#34d399", shortLabel: "H" }
};

export const FAIRLIGHT_RACK_PRESETS = {
  flat: {
    preset_id: "flat",
    eq_enabled: false,
    hpf_enabled: false,
    hpf_hz: 80.0,
    bands: [
      { band_id: "low", enabled: true, filter_type: "lowshelf", freq_hz: 100.0, gain_db: 0.0, q: 0.7 },
      { band_id: "low_mid", enabled: true, filter_type: "peaking", freq_hz: 400.0, gain_db: 0.0, q: 1.2 },
      { band_id: "high_mid", enabled: true, filter_type: "peaking", freq_hz: 3200.0, gain_db: 0.0, q: 1.4 },
      { band_id: "high", enabled: true, filter_type: "highshelf", freq_hz: 10000.0, gain_db: 0.0, q: 0.7 }
    ],
    compressor: { enabled: false, threshold_db: -18.0, ratio: 3.5, attack_ms: 10.0, release_ms: 120.0, makeup_db: 2.0, knee_db: 2.8 },
    limiter: { enabled: false, ceiling_db: -1.0, attack_ms: 5.0, release_ms: 80.0 }
  },
  broadcast_voice: {
    preset_id: "broadcast_voice",
    eq_enabled: true,
    hpf_enabled: true,
    hpf_hz: 85.0,
    bands: [
      { band_id: "low", enabled: true, filter_type: "lowshelf", freq_hz: 110.0, gain_db: -2.5, q: 0.7 },
      { band_id: "low_mid", enabled: true, filter_type: "peaking", freq_hz: 340.0, gain_db: -3.0, q: 1.6 },
      { band_id: "high_mid", enabled: true, filter_type: "peaking", freq_hz: 3200.0, gain_db: 3.5, q: 1.3 },
      { band_id: "high", enabled: true, filter_type: "highshelf", freq_hz: 9500.0, gain_db: 2.0, q: 0.7 }
    ],
    compressor: { enabled: true, threshold_db: -18.0, ratio: 3.5, attack_ms: 8.0, release_ms: 110.0, makeup_db: 2.5, knee_db: 2.8 },
    limiter: { enabled: true, ceiling_db: -1.0, attack_ms: 3.0, release_ms: 70.0 }
  },
  podcast_warm: {
    preset_id: "podcast_warm",
    eq_enabled: true,
    hpf_enabled: true,
    hpf_hz: 70.0,
    bands: [
      { band_id: "low", enabled: true, filter_type: "lowshelf", freq_hz: 120.0, gain_db: 2.0, q: 0.7 },
      { band_id: "low_mid", enabled: true, filter_type: "peaking", freq_hz: 420.0, gain_db: -2.0, q: 1.4 },
      { band_id: "high_mid", enabled: true, filter_type: "peaking", freq_hz: 3800.0, gain_db: 2.5, q: 1.2 },
      { band_id: "high", enabled: true, filter_type: "highshelf", freq_hz: 10500.0, gain_db: 1.5, q: 0.7 }
    ],
    compressor: { enabled: true, threshold_db: -20.0, ratio: 3.0, attack_ms: 12.0, release_ms: 150.0, makeup_db: 3.0, knee_db: 3.2 },
    limiter: { enabled: true, ceiling_db: -1.5, attack_ms: 4.0, release_ms: 90.0 }
  },
  cinema_punch: {
    preset_id: "cinema_punch",
    eq_enabled: true,
    hpf_enabled: true,
    hpf_hz: 40.0,
    bands: [
      { band_id: "low", enabled: true, filter_type: "lowshelf", freq_hz: 85.0, gain_db: 3.0, q: 0.7 },
      { band_id: "low_mid", enabled: true, filter_type: "peaking", freq_hz: 300.0, gain_db: -1.5, q: 1.1 },
      { band_id: "high_mid", enabled: true, filter_type: "peaking", freq_hz: 2800.0, gain_db: 2.0, q: 1.2 },
      { band_id: "high", enabled: true, filter_type: "highshelf", freq_hz: 11000.0, gain_db: 2.5, q: 0.7 }
    ],
    compressor: { enabled: true, threshold_db: -14.0, ratio: 4.0, attack_ms: 6.0, release_ms: 95.0, makeup_db: 2.0, knee_db: 2.5 },
    limiter: { enabled: true, ceiling_db: -0.5, attack_ms: 2.0, release_ms: 60.0 }
  },
  music_master: {
    preset_id: "music_master",
    eq_enabled: true,
    hpf_enabled: true,
    hpf_hz: 30.0,
    bands: [
      { band_id: "low", enabled: true, filter_type: "lowshelf", freq_hz: 90.0, gain_db: 1.5, q: 0.7 },
      { band_id: "low_mid", enabled: true, filter_type: "peaking", freq_hz: 380.0, gain_db: -1.0, q: 1.2 },
      { band_id: "high_mid", enabled: true, filter_type: "peaking", freq_hz: 4500.0, gain_db: 1.5, q: 1.1 },
      { band_id: "high", enabled: true, filter_type: "highshelf", freq_hz: 12000.0, gain_db: 2.0, q: 0.7 }
    ],
    compressor: { enabled: true, threshold_db: -16.0, ratio: 2.5, attack_ms: 15.0, release_ms: 180.0, makeup_db: 1.5, knee_db: 3.5 },
    limiter: { enabled: true, ceiling_db: -1.0, attack_ms: 5.0, release_ms: 100.0 }
  }
};

export function normalizeFairlightAudioRackParams(raw = null) {
  const src = raw && typeof raw === "object" ? raw : {};
  const presetKey =
    typeof src.preset_id === "string" &&
    Object.prototype.hasOwnProperty.call(FAIRLIGHT_RACK_PRESETS, src.preset_id.trim().toLowerCase())
      ? src.preset_id.trim().toLowerCase()
      : "flat";
  const base = FAIRLIGHT_RACK_PRESETS.flat;
  const rawBands = Array.isArray(src.bands) ? src.bands : [];
  const bandById = {};
  for (const b of rawBands) {
    if (b && typeof b === "object" && typeof b.band_id === "string") {
      bandById[b.band_id.trim().toLowerCase()] = b;
    }
  }
  const bands = FAIRLIGHT_EQ_BAND_ORDER.map((bandId) => {
    const spec = FAIRLIGHT_EQ_BAND_SPECS[bandId];
    const inp = bandById[bandId] || {};
    const ftype =
      inp.filter_type === "lowshelf" || inp.filter_type === "peaking" || inp.filter_type === "highshelf"
        ? inp.filter_type
        : spec.filter_type;
    return {
      band_id: bandId,
      enabled: typeof inp.enabled === "boolean" ? inp.enabled : true,
      filter_type: ftype,
      freq_hz: Number.isFinite(Number(inp.freq_hz))
        ? clampNum(Number(inp.freq_hz), spec.minFreq, spec.maxFreq)
        : spec.defaultFreq,
      gain_db: Number.isFinite(Number(inp.gain_db))
        ? clampNum(Number(inp.gain_db), -18.0, 18.0)
        : 0.0,
      q: Number.isFinite(Number(inp.q)) ? clampNum(Number(inp.q), 0.3, 10.0) : spec.defaultQ
    };
  });
  const rawComp = src.compressor && typeof src.compressor === "object" ? src.compressor : {};
  const rawLim = src.limiter && typeof src.limiter === "object" ? src.limiter : {};
  return {
    preset_id: presetKey,
    eq_enabled: typeof src.eq_enabled === "boolean" ? src.eq_enabled : base.eq_enabled,
    hpf_enabled: typeof src.hpf_enabled === "boolean" ? src.hpf_enabled : base.hpf_enabled,
    hpf_hz: Number.isFinite(Number(src.hpf_hz)) ? clampNum(Number(src.hpf_hz), 20.0, 250.0) : 80.0,
    bands,
    compressor: {
      enabled: typeof rawComp.enabled === "boolean" ? rawComp.enabled : false,
      threshold_db: Number.isFinite(Number(rawComp.threshold_db))
        ? clampNum(Number(rawComp.threshold_db), -60.0, 0.0)
        : -18.0,
      ratio: Number.isFinite(Number(rawComp.ratio)) ? clampNum(Number(rawComp.ratio), 1.0, 20.0) : 3.5,
      attack_ms: Number.isFinite(Number(rawComp.attack_ms))
        ? clampNum(Number(rawComp.attack_ms), 0.5, 250.0)
        : 10.0,
      release_ms: Number.isFinite(Number(rawComp.release_ms))
        ? clampNum(Number(rawComp.release_ms), 10.0, 1500.0)
        : 120.0,
      makeup_db: Number.isFinite(Number(rawComp.makeup_db))
        ? clampNum(Number(rawComp.makeup_db), 0.0, 24.0)
        : 2.0,
      knee_db: Number.isFinite(Number(rawComp.knee_db))
        ? clampNum(Number(rawComp.knee_db), 1.0, 8.0)
        : 2.8
    },
    limiter: {
      enabled: typeof rawLim.enabled === "boolean" ? rawLim.enabled : false,
      ceiling_db: Number.isFinite(Number(rawLim.ceiling_db))
        ? clampNum(Number(rawLim.ceiling_db), -12.0, -0.1)
        : -1.0,
      attack_ms: Number.isFinite(Number(rawLim.attack_ms))
        ? clampNum(Number(rawLim.attack_ms), 0.1, 50.0)
        : 5.0,
      release_ms: Number.isFinite(Number(rawLim.release_ms))
        ? clampNum(Number(rawLim.release_ms), 10.0, 500.0)
        : 80.0
    }
  };
}

export function applyFairlightRackPresetClient(presetId) {
  const key =
    typeof presetId === "string" &&
    Object.prototype.hasOwnProperty.call(FAIRLIGHT_RACK_PRESETS, presetId.trim().toLowerCase())
      ? presetId.trim().toLowerCase()
      : "flat";
  return normalizeFairlightAudioRackParams(JSON.parse(JSON.stringify(FAIRLIGHT_RACK_PRESETS[key])));
}

export function estimateFairlightCompressorGrClient(comp, inputPeakDb = -12.0) {
  if (!comp || !comp.enabled || comp.ratio <= 1.001) return 0.0;
  const overDb = inputPeakDb - comp.threshold_db;
  if (overDb <= 0.0) return 0.0;
  const grDb = overDb * (1.0 - 1.0 / comp.ratio);
  return Number((-Math.min(24.0, Math.max(0.0, grDb))).toFixed(2));
}

export function compileFairlightAudioRackClient(raw = null) {
  const params = normalizeFairlightAudioRackParams(raw);
  const parts = [];
  if (params.eq_enabled) {
    if (params.hpf_enabled) {
      parts.push(`highpass=f=${params.hpf_hz.toFixed(1)}`);
    }
    for (const band of params.bands) {
      if (!band.enabled || Math.abs(band.gain_db) <= 1e-6) continue;
      if (band.filter_type === "lowshelf") {
        parts.push(`lowshelf=f=${band.freq_hz.toFixed(1)}:t=q:w=${band.q.toFixed(2)}:g=${band.gain_db.toFixed(2)}`);
      } else if (band.filter_type === "highshelf") {
        parts.push(`highshelf=f=${band.freq_hz.toFixed(1)}:t=q:w=${band.q.toFixed(2)}:g=${band.gain_db.toFixed(2)}`);
      } else {
        parts.push(`equalizer=f=${band.freq_hz.toFixed(1)}:t=q:w=${band.q.toFixed(2)}:g=${band.gain_db.toFixed(2)}`);
      }
    }
  }
  if (params.compressor.enabled) {
    const c = params.compressor;
    const threshLin = Math.max(0.000977, Math.min(1.0, Math.pow(10.0, c.threshold_db / 20.0)));
    const makeupLin = Math.max(1.0, Math.min(64.0, Math.pow(10.0, c.makeup_db / 20.0)));
    parts.push(
      `acompressor=threshold=${threshLin.toFixed(5)}:ratio=${c.ratio.toFixed(2)}` +
        `:attack=${c.attack_ms.toFixed(1)}:release=${c.release_ms.toFixed(1)}` +
        `:makeup=${makeupLin.toFixed(4)}:knee=${c.knee_db.toFixed(2)}`
    );
  }
  if (params.limiter.enabled) {
    const l = params.limiter;
    const limitLin = Math.max(0.0625, Math.min(1.0, Math.pow(10.0, l.ceiling_db / 20.0)));
    parts.push(
      `alimiter=limit=${limitLin.toFixed(5)}:attack=${l.attack_ms.toFixed(1)}` +
        `:release=${l.release_ms.toFixed(1)}:level=false`
    );
  }
  const filtergraph = parts.join(",");
  const activeEqCount = params.eq_enabled
    ? params.bands.filter((b) => b.enabled && Math.abs(b.gain_db) > 1e-6).length
    : 0;
  let eqBandSummary = "BYPASS";
  if (params.eq_enabled && params.hpf_enabled) {
    eqBandSummary = `HP ${Math.round(params.hpf_hz)}Hz + ${activeEqCount}B`;
  } else if (params.eq_enabled) {
    eqBandSummary = `${activeEqCount}B`;
  }
  return {
    filtergraph,
    ffmpeg_af_args: filtergraph ? ["-af", filtergraph] : [],
    is_identity: filtergraph === "",
    params,
    estimated_gr_db: estimateFairlightCompressorGrClient(params.compressor),
    ceiling_dbtp: params.limiter.enabled ? Number(params.limiter.ceiling_db.toFixed(2)) : 0.0,
    eq_band_summary: eqBandSummary
  };
}

function biquadMagnitudeDb(b0, b1, b2, a0, a1, a2, w) {
  const cosW = Math.cos(w);
  const cos2W = Math.cos(2 * w);
  const sinW = Math.sin(w);
  const sin2W = Math.sin(2 * w);
  const numRe = b0 + b1 * cosW + b2 * cos2W;
  const numIm = -b1 * sinW - b2 * sin2W;
  const denRe = a0 + a1 * cosW + a2 * cos2W;
  const denIm = -a1 * sinW - a2 * sin2W;
  const numSq = numRe * numRe + numIm * numIm;
  const denSq = Math.max(1e-18, denRe * denRe + denIm * denIm);
  return 10 * Math.log10(Math.max(1e-12, numSq / denSq));
}

export function evaluateFairlightEqBandDb(band, freqHz, sampleRate = 48000) {
  if (!band || !band.enabled || Math.abs(band.gain_db) <= 1e-6) return 0;
  const f0 = clampNum(Number(band.freq_hz) || 1000, 20, sampleRate * 0.45);
  const w0 = (2 * Math.PI * f0) / sampleRate;
  const w = (2 * Math.PI * clampNum(freqHz, 15, sampleRate * 0.48)) / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const A = Math.pow(10, band.gain_db / 40);
  const qVal = clampNum(Number(band.q) || 1.0, 0.3, 10.0);
  const alpha = sinW0 / (2 * qVal);

  if (band.filter_type === "lowshelf") {
    const sqA = Math.sqrt(A);
    const b0 = A * (A + 1 - (A - 1) * cosW0 + 2 * sqA * alpha);
    const b1 = 2 * A * (A - 1 - (A + 1) * cosW0);
    const b2 = A * (A + 1 - (A - 1) * cosW0 - 2 * sqA * alpha);
    const a0 = A + 1 + (A - 1) * cosW0 + 2 * sqA * alpha;
    const a1 = -2 * (A - 1 + (A + 1) * cosW0);
    const a2 = A + 1 + (A - 1) * cosW0 - 2 * sqA * alpha;
    return biquadMagnitudeDb(b0, b1, b2, a0, a1, a2, w);
  }
  if (band.filter_type === "highshelf") {
    const sqA = Math.sqrt(A);
    const b0 = A * (A + 1 + (A - 1) * cosW0 + 2 * sqA * alpha);
    const b1 = -2 * A * (A - 1 + (A + 1) * cosW0);
    const b2 = A * (A + 1 + (A - 1) * cosW0 - 2 * sqA * alpha);
    const a0 = A + 1 - (A - 1) * cosW0 + 2 * sqA * alpha;
    const a1 = 2 * (A - 1 - (A + 1) * cosW0);
    const a2 = A + 1 - (A - 1) * cosW0 - 2 * sqA * alpha;
    return biquadMagnitudeDb(b0, b1, b2, a0, a1, a2, w);
  }
  const b0 = 1 + alpha * A;
  const b1 = -2 * cosW0;
  const b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A;
  const a1 = -2 * cosW0;
  const a2 = 1 - alpha / A;
  return biquadMagnitudeDb(b0, b1, b2, a0, a1, a2, w);
}

export function evaluateFairlightEqCurveDb(rackParams, freqHz, sampleRate = 48000) {
  const params = normalizeFairlightAudioRackParams(rackParams);
  if (!params.eq_enabled) return 0;
  let totalDb = 0;
  if (params.hpf_enabled) {
    const w0 = (2 * Math.PI * clampNum(params.hpf_hz, 20, 250)) / sampleRate;
    const w = (2 * Math.PI * clampNum(freqHz, 15, sampleRate * 0.48)) / sampleRate;
    const cosW0 = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * 0.7071);
    const b0 = (1 + cosW0) / 2;
    const b1 = -(1 + cosW0);
    const b2 = (1 + cosW0) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cosW0;
    const a2 = 1 - alpha;
    totalDb += biquadMagnitudeDb(b0, b1, b2, a0, a1, a2, w);
  }
  for (const band of params.bands) {
    totalDb += evaluateFairlightEqBandDb(band, freqHz, sampleRate);
  }
  return clampNum(totalDb, -24.0, 24.0);
}

export function evaluateFairlightDynamicsTransferDb(rackParams, inputDb) {
  const params = normalizeFairlightAudioRackParams(rackParams);
  let outDb = clampNum(Number(inputDb) || -60, -60, 0);
  if (params.compressor.enabled) {
    const c = params.compressor;
    const halfKnee = c.knee_db * 0.5;
    if (2 * (outDb - c.threshold_db) < -c.knee_db) {
      // Below knee: 1:1
    } else if (2 * Math.abs(outDb - c.threshold_db) <= c.knee_db && c.knee_db > 0.05) {
      const diff = outDb - c.threshold_db + halfKnee;
      outDb = outDb + ((1 / c.ratio - 1) * diff * diff) / (2 * c.knee_db);
    } else {
      outDb = c.threshold_db + (outDb - c.threshold_db) / c.ratio;
    }
    outDb += c.makeup_db;
  }
  if (params.limiter.enabled) {
    outDb = Math.min(outDb, params.limiter.ceiling_db);
  }
  return clampNum(outDb, -60, 0);
}

export const FFT_BAND_COUNT = 32;
export const FFT_BAND_FREQS_HZ = Array.from({ length: FFT_BAND_COUNT }, (_, idx) =>
  Number((20 * Math.pow(1000, idx / (FFT_BAND_COUNT - 1))).toFixed(1))
);
export const TRANSIENT_FOCUS_BANDS = ["full", "kick_low", "snare_mid", "hihat_high"];
export const TRANSIENT_FOCUS_FREQ_RANGES = {
  full: [20, 20000],
  kick_low: [28, 180],
  snare_mid: [180, 3200],
  hihat_high: [3200, 18000]
};
const ALLOWED_TRANSIENT_MARKER_COLORS = ["Cyan", "Gold", "Red", "Green"];

function formatFftFreqLabel(freqHz) {
  if (freqHz >= 1000) {
    const khz = freqHz / 1000;
    if (Math.abs(khz - Math.round(khz)) < 0.08) {
      return `${Math.round(khz)}k`;
    }
    return `${khz.toFixed(1)}k`;
  }
  return String(Math.round(freqHz));
}

function evaluateFairlightDynamicsSpectrumDb(rackParams, inputDb) {
  const params = normalizeFairlightAudioRackParams(rackParams);
  let outDb = clampNum(Number(inputDb), -90, 0);
  if (params.compressor.enabled) {
    const c = params.compressor;
    const halfKnee = c.knee_db * 0.5;
    if (2 * (outDb - c.threshold_db) < -c.knee_db) {
      // 1:1 below knee
    } else if (2 * Math.abs(outDb - c.threshold_db) <= c.knee_db && c.knee_db > 0.05) {
      const diff = outDb - c.threshold_db + halfKnee;
      outDb = outDb + ((1 / c.ratio - 1) * diff * diff) / (2 * c.knee_db);
    } else {
      outDb = c.threshold_db + (outDb - c.threshold_db) / c.ratio;
    }
    outDb += c.makeup_db;
  }
  if (params.limiter.enabled) {
    outDb = Math.min(outDb, params.limiter.ceiling_db);
  }
  return clampNum(outDb, -90, 0);
}

export function normalizeTransientDetectConfig(raw = {}) {
  const src = raw && typeof raw === "object" ? raw : {};
  const sensRaw = Number(src.sensitivity);
  const minIntRaw = Number(src.min_interval_ms);
  const maxMkRaw = Number(src.max_markers);
  const bpmRaw = Number(src.bpm);
  const focusRaw = String(src.freq_focus || "full").trim().toLowerCase();
  const focus = TRANSIENT_FOCUS_BANDS.includes(focusRaw) ? focusRaw : "full";
  const colorRaw = String(src.marker_color || "Cyan").trim();
  const colorTitle = colorRaw ? colorRaw.charAt(0).toUpperCase() + colorRaw.slice(1).toLowerCase() : "Cyan";
  const markerColor = ALLOWED_TRANSIENT_MARKER_COLORS.includes(colorTitle) ? colorTitle : "Cyan";
  return {
    sensitivity: clampNum(Number.isFinite(sensRaw) ? sensRaw : 0.55, 0.1, 0.95),
    min_interval_ms: Math.round(clampNum(Number.isFinite(minIntRaw) ? minIntRaw : 220, 80, 1000)),
    freq_focus: focus,
    marker_color: markerColor,
    max_markers: Math.round(clampNum(Number.isFinite(maxMkRaw) ? maxMkRaw : 32, 1, 64)),
    snap_to_bpm: Boolean(src.snap_to_bpm),
    bpm: clampNum(Number.isFinite(bpmRaw) ? bpmRaw : 128, 60, 200)
  };
}

function classifyAudioClipProfileClient(clip) {
  const hay = `${clip && clip.name ? clip.name : ""} ${clip && clip.source_path ? clip.source_path : ""}`.toLowerCase();
  if (/(vo|dialog|speech|voice|narr|interview)/.test(hay)) return "dialogue";
  if (/(sfx|riser|hit|whoosh|fx|amb)/.test(hay)) return "sfx";
  return "music";
}

function deterministicClipSpectrumBandDbClient(profile, freqHz, timeS, clipSeed) {
  const logF = Math.log10(Math.max(20, freqHz));
  const phaseMod = Math.sin(timeS * 5.2 + clipSeed * 0.7 + logF * 2.1);
  const beatPulse = Math.pow(Math.max(0, Math.sin(timeS * Math.PI * (128 / 60) * 2)), 3);

  if (profile === "dialogue") {
    const fund = -12 * Math.pow(logF - Math.log10(210), 2);
    const formant = 7.5 * Math.exp(-Math.pow(logF - Math.log10(1900), 2) / 0.14);
    const airRoll = -14 * Math.max(0, logF - Math.log10(5500));
    const subRoll = -22 * Math.max(0, Math.log10(95) - logF);
    return clampNum(-21 + fund + formant + airRoll + subRoll + phaseMod * 3.4, -82, -3);
  }
  if (profile === "sfx") {
    const sweepHz = 320 + 1800 * (0.5 + 0.5 * Math.sin(timeS * 2.7 + clipSeed));
    const peak = 13 * Math.exp(-Math.pow(logF - Math.log10(sweepHz), 2) / 0.12);
    return clampNum(-28 + peak - 5 * Math.abs(logF - Math.log10(1200)) + phaseMod * 4, -82, -4);
  }
  const kickBump = 11 * beatPulse * Math.exp(-Math.pow(logF - Math.log10(62), 2) / 0.08);
  const snareBump = 7.5 * (1 - 0.4 * beatPulse) * Math.exp(-Math.pow(logF - Math.log10(2400), 2) / 0.16);
  const hatBump = 6 * (0.5 + 0.5 * Math.sin(timeS * 16 + clipSeed)) * Math.exp(-Math.pow(logF - Math.log10(9500), 2) / 0.11);
  const pinkTilt = -3.8 * (logF - Math.log10(120));
  return clampNum(-18.5 + pinkTilt + kickBump + snareBump + hatBump + phaseMod * 2.6, -82, -2.5);
}

function clipFadeEnvelopeDbClient(clip, timeInClipS, clipDurS) {
  let env = 1;
  const fi = Number(clip.fade_in_s || 0);
  const fo = Number(clip.fade_out_s || 0);
  if (fi > 1e-4 && timeInClipS < fi) env *= clampNum(timeInClipS / fi, 0.02, 1);
  if (fo > 1e-4 && clipDurS - timeInClipS < fo) env *= clampNum((clipDurS - timeInClipS) / fo, 0.02, 1);
  return 20 * Math.log10(Math.max(0.02, env));
}

export function analyzeAudioSpectrumClient(doc, playheadFrame = 0, options = {}) {
  const fps = doc && doc.fps ? Math.max(1, Number(doc.fps.num || 25) / Math.max(1, Number(doc.fps.den || 1))) : 25;
  const frame = Math.max(0, Math.round(Number(playheadFrame) || 0));
  const timeS = Number((frame / fps).toFixed(4));
  const rack = normalizeFairlightAudioRackParams(options.fairlight_rack || options.fairlightRack);
  const masterGain = clampNum(Number(options.master_gain_db ?? options.masterGainDb ?? 0) || 0, -48, 12);
  const peakHoldPrev = Array.isArray(options.peak_hold_prev) ? options.peak_hold_prev : null;

  const tracks = (doc && doc.tracks) || [];
  const anySolo = tracks.some((t) => t && t.kind === "audio" && Boolean(t.solo));
  const activeClips = [];
  for (const trk of tracks) {
    if (!trk || trk.kind !== "audio") continue;
    if (trk.muted || (anySolo && !trk.solo)) continue;
    for (const clip of trk.clips || []) {
      if (clip && clip.enabled !== false && clip.duration_frames > 0) {
        if (clip.start_frame <= frame && frame < clip.start_frame + clip.duration_frames) {
          activeClips.push({ trk, clip });
        }
      }
    }
  }

  let preDbs;
  let correlation = 1.0;
  if (activeClips.length === 0) {
    preDbs = new Array(FFT_BAND_COUNT).fill(-90);
  } else {
    preDbs = FFT_BAND_FREQS_HZ.map((freqHz) => {
      let energyLin = 0;
      for (const { trk, clip } of activeClips) {
        const clipRelS = (frame - clip.start_frame) / fps;
        const clipDurS = clip.duration_frames / fps;
        const gainDb =
          Number(clip.audio_gain_db || 0) +
          Number(trk.volume_db || 0) +
          masterGain +
          clipFadeEnvelopeDbClient(clip, clipRelS, clipDurS);
        const profile = classifyAudioClipProfileClient(clip);
        let seed = (Number(trk.index) || 1) * 17;
        const cname = String(clip.name || "");
        for (let k = 0; k < cname.length; k++) seed += cname.charCodeAt(k);
        const binDb = deterministicClipSpectrumBandDbClient(profile, freqHz, timeS, seed);
        const totalBinDb = clampNum(binDb + gainDb, -90, 0);
        energyLin += Math.pow(10, totalBinDb / 10);
      }
      return Number(clampNum(10 * Math.log10(Math.max(1e-9, energyLin)), -90, 0).toFixed(2));
    });
    const panSpread = activeClips.reduce((acc, { trk }) => acc + Math.abs(Number(trk.pan || 0)), 0) / activeClips.length;
    correlation = Number(clampNum(0.94 - panSpread * 0.35 + 0.04 * Math.sin(timeS * 3.1), -1, 1).toFixed(3));
  }

  const postDbs = [];
  const bands = [];
  let weightedLogF = 0;
  let totalWeight = 0;
  let bestIdx = 0;
  let bestDb = -91;
  let sumLin = 0;

  for (let i = 0; i < FFT_BAND_COUNT; i++) {
    const freqHz = FFT_BAND_FREQS_HZ[i];
    const preVal = preDbs[i];
    let postVal = -90;
    if (preVal > -89.5) {
      const eqDelta = evaluateFairlightEqCurveDb(rack, freqHz, 48000);
      const shaped = clampNum(preVal + eqDelta, -90, 0);
      postVal = evaluateFairlightDynamicsSpectrumDb(rack, shaped);
    }
    const prevHold = peakHoldPrev && i < peakHoldPrev.length && Number.isFinite(Number(peakHoldPrev[i]))
      ? Number(peakHoldPrev[i])
      : postVal;
    const peakHold = clampNum(Math.max(postVal, prevHold - 0.6), -90, 0);
    const postRound = Number(postVal.toFixed(2));
    postDbs.push(postRound);
    bands.push({
      index: i,
      freq_hz: freqHz,
      label: formatFftFreqLabel(freqHz),
      pre_db: preVal,
      post_db: postRound,
      peak_hold_db: Number(peakHold.toFixed(2))
    });
    if (postVal > bestDb) {
      bestDb = postVal;
      bestIdx = i;
    }
    const wLin = postVal > -89.5 ? Math.pow(10, postVal / 20) : 0;
    sumLin += wLin * wLin;
    weightedLogF += wLin * Math.log10(freqHz);
    totalWeight += wLin;
  }

  let rmsDb = -90;
  let peakDb = -90;
  if (activeClips.length > 0) {
    const avgLin = Math.sqrt(Math.max(1e-10, sumLin / FFT_BAND_COUNT));
    rmsDb = Number(clampNum(20 * Math.log10(Math.max(1e-5, avgLin)) + 6, -90, 0).toFixed(2));
    peakDb = Number(clampNum(Math.max(...postDbs), -90, 0).toFixed(2));
  }
  const centroidHz = totalWeight > 1e-6
    ? Number(clampNum(Math.pow(10, weightedLogF / totalWeight), 20, 20000).toFixed(1))
    : 1000;
  const compiledRack = compileFairlightAudioRackClient(rack);
  const prefix = compiledRack.filtergraph ? `${compiledRack.filtergraph},` : "";
  return {
    playhead_frame: frame,
    time_s: timeS,
    bands,
    correlation,
    rms_db: rmsDb,
    peak_db: peakDb,
    dominant_hz: FFT_BAND_FREQS_HZ[bestIdx],
    centroid_hz: centroidHz,
    active_audio_clips: activeClips.length,
    ffmpeg_filter:
      `${prefix}asplit=2[sp_a][sp_b];` +
      "[sp_a]showspectrumpic=s=640x240:mode=combined:scale=log:color=intensity[v_spec];" +
      "[sp_b]aphasemeter=s=320x48[v_phase]"
  };
}

export function detectAudioTransientsClient(doc, rawConfig = {}, options = {}) {
  const cfg = normalizeTransientDetectConfig(rawConfig);
  const rack = normalizeFairlightAudioRackParams(options.fairlight_rack || options.fairlightRack);
  const fps = doc && doc.fps ? Math.max(1, Number(doc.fps.num || 25) / Math.max(1, Number(doc.fps.den || 1))) : 25;
  const startFrame = Math.max(0, (doc && doc.start_frame) || 0);
  const maxFrame = Math.max(startFrame + 1, computeTimelineMaxFrame(doc || { tracks: [] }));
  const totalFrames = Math.min(15000, maxFrame - startFrame);

  const tracks = (doc && doc.tracks) || [];
  const anySolo = tracks.some((t) => t && t.kind === "audio" && Boolean(t.solo));
  const activeClips = [];
  for (const trk of tracks) {
    if (!trk || trk.kind !== "audio") continue;
    if (trk.muted || (anySolo && !trk.solo)) continue;
    for (const clip of trk.clips || []) {
      if (clip && clip.enabled !== false && clip.duration_frames > 0) {
        activeClips.push({ trk, clip });
      }
    }
  }

  const envelope = new Array(totalFrames).fill(0);
  if (activeClips.length > 0) {
    const beatPeriodS = 60 / cfg.bpm;
    for (let relF = 0; relF < totalFrames; relF++) {
      const absF = startFrame + relF;
      const tS = absF / fps;
      let frameEnergy = 0;
      for (const { trk, clip } of activeClips) {
        if (absF < clip.start_frame || absF >= clip.start_frame + clip.duration_frames) continue;
        const profile = classifyAudioClipProfileClient(clip);
        const gainDb = clampNum(Number(clip.audio_gain_db || 0) + Number(trk.volume_db || 0), -36, 12);
        const gainLin = clampNum(Math.pow(10, gainDb / 20), 0.05, 2.5);
        const beatPhase = (((tS / beatPeriodS) % 1) + 1) % 1;
        const halfBeatPhase = (((tS / (beatPeriodS * 0.5)) % 1) + 1) % 1;
        const kickHit = Math.exp(-Math.pow(beatPhase * 9, 2));
        const snarePhase = ((((tS - beatPeriodS * 0.5) / (beatPeriodS * 2)) % 1) + 1) % 1;
        const snareHit = Math.exp(-Math.pow(snarePhase * 14, 2)) * 0.92;
        const hatHit = Math.exp(-Math.pow(halfBeatPhase * 16, 2)) * 0.68;
        const clipEdge = absF === clip.start_frame ? 1 : 0;

        let onset;
        if (profile === "dialogue") {
          const sylPhase = (((tS * 3.1 + 0.17 * (trk.index || 1)) % 1) + 1) % 1;
          onset = Math.exp(-Math.pow(sylPhase * 10, 2)) * 0.72;
        } else if (profile === "sfx") {
          const sfxPhase = (((tS * 1.8) % 1) + 1) % 1;
          onset = Math.max(clipEdge, Math.exp(-Math.pow(sfxPhase * 11, 2)) * 0.85);
        } else if (cfg.freq_focus === "kick_low") {
          onset = kickHit;
        } else if (cfg.freq_focus === "snare_mid") {
          onset = Math.max(snareHit, kickHit * 0.45);
        } else if (cfg.freq_focus === "hihat_high") {
          onset = Math.max(hatHit, snareHit * 0.55);
        } else {
          onset = Math.max(kickHit, snareHit * 0.9, hatHit * 0.75);
        }
        frameEnergy = Math.max(frameEnergy, clampNum(onset * gainLin, 0, 1));
      }
      envelope[relF] = frameEnergy;
    }
  }

  const threshold = clampNum(1.02 - cfg.sensitivity * 0.85, 0.12, 0.92);
  const minGapFrames = Math.max(1, Math.round((cfg.min_interval_ms / 1000) * fps));
  const candidatePeaks = [];
  let lastPeakF = -minGapFrames * 2;

  for (let relF = 0; relF < totalFrames; relF++) {
    const val = envelope[relF];
    if (val < threshold) continue;
    const prevV = relF > 0 ? envelope[relF - 1] : 0;
    const nextV = relF + 1 < totalFrames ? envelope[relF + 1] : 0;
    if (val >= prevV && val >= nextV) {
      const absF = startFrame + relF;
      if (absF - lastPeakF >= minGapFrames) {
        candidatePeaks.push([absF, val]);
        lastPeakF = absF;
      } else if (candidatePeaks.length > 0 && val > candidatePeaks[candidatePeaks.length - 1][1]) {
        candidatePeaks[candidatePeaks.length - 1] = [absF, val];
        lastPeakF = absF;
      }
    }
  }

  const beatTicks = cfg.snap_to_bpm
    ? computeBpmBeatFrames(doc, { enabled: true, bpm: cfg.bpm, offset_s: 0 }, startFrame, startFrame + totalFrames)
    : [];
  const beatFrames = beatTicks.map((b) => b.frame);

  const peaks = [];
  const markers = [];
  const seenFrames = new Set();
  for (const [rawFrame, strength] of candidatePeaks) {
    let finalFrame = rawFrame;
    if (beatFrames.length > 0) {
      let nearest = beatFrames[0];
      let bestDist = Math.abs(nearest - rawFrame);
      for (const bf of beatFrames) {
        const d = Math.abs(bf - rawFrame);
        if (d < bestDist) {
          bestDist = d;
          nearest = bf;
        }
      }
      if (bestDist <= Math.max(2, Math.round(fps * 0.08))) {
        finalFrame = nearest;
      }
    }
    if (seenFrames.has(finalFrame)) continue;
    seenFrames.add(finalFrame);
    const tS = Number((finalFrame / fps).toFixed(3));
    const fluxDb = Number(clampNum(strength * 36, 0, 60).toFixed(2));
    peaks.push({
      frame: finalFrame,
      time_s: tS,
      strength: Number(strength.toFixed(3)),
      flux_db: fluxDb,
      band: cfg.freq_focus
    });
    const idx = peaks.length;
    markers.push({
      name: cfg.snap_to_bpm ? `Beat ${idx}` : `Transient ${idx}`,
      frame: finalFrame,
      duration_frames: 1,
      color: cfg.marker_color,
      note: `${cfg.freq_focus} | +${fluxDb.toFixed(1)} dB @ ${tS.toFixed(2)}s`
    });
    if (peaks.length >= cfg.max_markers) break;
  }

  // IOI BPM estimation
  let estimatedBpm = 128;
  if (peaks.length >= 2) {
    const buckets = new Map();
    for (let i = 0; i < peaks.length - 1; i++) {
      const dt = (peaks[i + 1].frame - peaks[i].frame) / fps;
      if (dt <= 0.05) continue;
      let rawBpm = 60 / dt;
      while (rawBpm < 60) rawBpm *= 2;
      while (rawBpm > 200) rawBpm *= 0.5;
      if (rawBpm >= 60 && rawBpm <= 200) {
        const key = Math.round(rawBpm);
        buckets.set(key, (buckets.get(key) || 0) + 1);
      }
    }
    if (buckets.size > 0) {
      let bestBpm = 128;
      let bestScore = -1;
      for (const [k, cnt] of buckets.entries()) {
        if (cnt > bestScore || (cnt === bestScore && Math.abs(k - 128) < Math.abs(bestBpm - 128))) {
          bestScore = cnt;
          bestBpm = k;
        }
      }
      estimatedBpm = clampNum(bestBpm, 60, 200);
    }
  }

  const [loHz, hiHz] = TRANSIENT_FOCUS_FREQ_RANGES[cfg.freq_focus];
  let centroidHz = Number(Math.sqrt(loHz * hiHz).toFixed(1));
  const spec = analyzeAudioSpectrumClient(doc, peaks.length > 0 ? peaks[0].frame : startFrame, {
    fairlight_rack: rack
  });
  if (spec.active_audio_clips > 0) centroidHz = spec.centroid_hz;
  const compiledRack = compileFairlightAudioRackClient(rack);
  const prefix = compiledRack.filtergraph ? `${compiledRack.filtergraph},` : "";

  return {
    peaks,
    markers,
    estimated_bpm: estimatedBpm,
    spectral_centroid_hz: centroidHz,
    peak_count: peaks.length,
    config: cfg,
    ffmpeg_filter: `${prefix}highpass=f=${loHz.toFixed(1)},lowpass=f=${hiHz.toFixed(1)},astats=metadata=1:reset=1,ebur128=metadata=1`
  };
}

// =========================================================================
// CYCLE #92: MULTI-TRACK COMPOUND CLIP / NESTED SUB-SEQUENCE & PRE-COMP
// =========================================================================

export const MAX_COMPOUND_NESTING_DEPTH = 4;
export const PRECOMP_BLEND_MODES = ["normal", "screen", "multiply", "overlay"];
export const COMPOUND_COLOR_TAGS = ["amber", "violet", "teal", "blue"];

function cloneCompoundJson(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function slugifyCompoundIdClient(raw) {
  const cleaned = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned ? cleaned.slice(0, 48) : "compound_clip";
}

function normalizePrecompBlendModeClient(raw) {
  const cleaned = String(raw || "normal").trim().toLowerCase();
  return PRECOMP_BLEND_MODES.includes(cleaned) ? cleaned : "normal";
}

function normalizeCompoundColorTagClient(raw) {
  const cleaned = String(raw || "amber").trim().toLowerCase();
  return COMPOUND_COLOR_TAGS.includes(cleaned) ? cleaned : "amber";
}

function conformSourceFramesClient(tlFrames, sourceFps, timelineFps) {
  if (!sourceFps || !timelineFps) return tlFrames;
  const sNum = Number(sourceFps.num || 0);
  const sDen = Number(sourceFps.den || 1);
  const tNum = Number(timelineFps.num || 0);
  const tDen = Number(timelineFps.den || 1);
  if (sNum <= 0 || sDen <= 0 || tNum <= 0 || tDen <= 0) return tlFrames;
  if (sNum * tDen === tNum * sDen) return tlFrames;
  return Math.round(tlFrames * ((sNum / sDen) / (tNum / tDen)));
}

export function computeCompoundDepthClient(clip) {
  if (!clip || !clip.compound_subsequence || !Array.isArray(clip.compound_subsequence.tracks)) {
    return 0;
  }
  let maxChild = 0;
  for (const trk of clip.compound_subsequence.tracks) {
    for (const child of trk.clips || []) {
      const d = computeCompoundDepthClient(child);
      if (d > maxChild) maxChild = d;
    }
  }
  return 1 + maxChild;
}

export function computeDocumentCompoundDepthClient(doc) {
  if (!doc || !Array.isArray(doc.tracks)) return 0;
  let maxDepth = 0;
  for (const trk of doc.tracks) {
    for (const clip of trk.clips || []) {
      const d = computeCompoundDepthClient(clip);
      if (d > maxDepth) maxDepth = d;
    }
  }
  return maxDepth;
}

export function countCompoundClipsInDocument(doc) {
  if (!doc || !Array.isArray(doc.tracks)) return 0;
  let count = 0;
  for (const trk of doc.tracks) {
    for (const clip of trk.clips || []) {
      if (clip && clip.compound_subsequence) count += 1;
    }
  }
  return count;
}

function nextCompoundNameAndIdClient(doc, requestedName) {
  const existingIds = new Set();
  let existingCount = 0;
  for (const trk of doc.tracks || []) {
    for (const clip of trk.clips || []) {
      if (clip && clip.compound_subsequence) {
        existingCount += 1;
        if (clip.compound_subsequence.id) existingIds.add(clip.compound_subsequence.id);
      }
    }
  }
  const baseName =
    typeof requestedName === "string" && requestedName.trim()
      ? requestedName.trim().slice(0, 120)
      : `Compound Clip ${existingCount + 1}`;
  const baseId = slugifyCompoundIdClient(baseName);
  let candId = baseId;
  let suffix = 2;
  while (existingIds.has(candId)) {
    candId = `${baseId}_${suffix}`;
    suffix += 1;
  }
  return { name: baseName, id: candId };
}

function clipsOverlapRangeClient(clips, startFrame, endFrame) {
  for (const c of clips || []) {
    if (!c || (c.duration_frames || 0) <= 0) continue;
    const cEnd = c.start_frame + c.duration_frames;
    if (c.start_frame < endFrame && cEnd > startFrame) return true;
  }
  return false;
}

function findOrCreateFreeTrackClient(doc, kind, preferredIndex, startFrame, endFrame) {
  const sameKind = (doc.tracks || [])
    .filter((t) => t.kind === kind)
    .sort((a, b) => a.index - b.index);
  for (const trk of sameKind) {
    if (trk.index === preferredIndex && !clipsOverlapRangeClient(trk.clips, startFrame, endFrame)) {
      return trk;
    }
  }
  for (const trk of sameKind) {
    if (trk.index >= preferredIndex && !clipsOverlapRangeClient(trk.clips, startFrame, endFrame)) {
      return trk;
    }
  }
  for (const trk of sameKind) {
    if (!clipsOverlapRangeClient(trk.clips, startFrame, endFrame)) {
      return trk;
    }
  }
  const nextIndex = sameKind.reduce((mx, t) => Math.max(mx, t.index), 0) + 1;
  const prefix = kind === "video" ? "V" : "A";
  const newTrack = {
    index: nextIndex,
    kind,
    name: `${prefix}${nextIndex}`,
    muted: false,
    solo: false,
    rec_armed: false,
    sync_locked: false,
    volume_db: 0.0,
    pan: 0.0,
    clips: []
  };
  doc.tracks.push(newTrack);
  return newTrack;
}

function sortTracksCanonicalClient(doc) {
  for (const trk of doc.tracks || []) {
    trk.clips.sort(
      (a, b) =>
        a.start_frame - b.start_frame ||
        a.duration_frames - b.duration_frames ||
        String(a.name || "").localeCompare(String(b.name || ""))
    );
  }
  doc.tracks.sort((a, b) => {
    const ka = a.kind === "video" ? 0 : 1;
    const kb = b.kind === "video" ? 0 : 1;
    return ka - kb || a.index - b.index;
  });
}

function sliceClipToWindowClient(clip, winStart, winEnd, timelineFps) {
  const cStart = clip.start_frame;
  const cEnd = cStart + clip.duration_frames;
  const ovStart = Math.max(cStart, winStart);
  const ovEnd = Math.min(cEnd, winEnd);
  if (ovEnd <= ovStart) {
    return { left: cloneCompoundJson(clip), mid: null, right: null };
  }
  let left = null;
  if (ovStart > cStart) {
    left = cloneCompoundJson(clip);
    left.duration_frames = ovStart - cStart;
  }
  const midOff = ovStart - cStart;
  const midSrcDelta = conformSourceFramesClient(midOff, clip.source_fps, timelineFps);
  const mid = cloneCompoundJson(clip);
  mid.start_frame = ovStart;
  mid.duration_frames = ovEnd - ovStart;
  mid.source_in_frame = Math.max(0, (clip.source_in_frame || 0) + midSrcDelta);

  let right = null;
  if (cEnd > ovEnd) {
    const rOff = ovEnd - cStart;
    const rSrcDelta = conformSourceFramesClient(rOff, clip.source_fps, timelineFps);
    right = cloneCompoundJson(clip);
    right.start_frame = ovEnd;
    right.duration_frames = cEnd - ovEnd;
    right.source_in_frame = Math.max(0, (clip.source_in_frame || 0) + rSrcDelta);
  }
  return { left, mid, right };
}

function buildSubsequenceFromCollectedClient({
  compId,
  compName,
  fps,
  width,
  height,
  rangeStart,
  rangeEnd,
  collectedTracks,
  markers,
  precompBlendMode,
  collapseTransforms,
  colorTag
}) {
  const ordered = [...collectedTracks].sort((a, b) => {
    const ka = a.kind === "video" ? 0 : 1;
    const kb = b.kind === "video" ? 0 : 1;
    return ka - kb || a.origIndex - b.origIndex;
  });
  const nestedTracks = [];
  let vIdx = 0;
  let aIdx = 0;
  for (const item of ordered) {
    if (!item.clips || item.clips.length === 0) continue;
    let newIdx;
    if (item.kind === "video") {
      vIdx += 1;
      newIdx = vIdx;
    } else {
      aIdx += 1;
      newIdx = aIdx;
    }
    const shifted = item.clips.map((c) => {
      const copy = cloneCompoundJson(c);
      copy.start_frame = Math.max(0, copy.start_frame - rangeStart);
      copy.track_index = newIdx;
      return copy;
    });
    shifted.sort((a, b) => a.start_frame - b.start_frame || a.duration_frames - b.duration_frames);
    const prefix = item.kind === "video" ? "V" : "A";
    nestedTracks.push({
      index: newIdx,
      kind: item.kind,
      name: item.origName || `${prefix}${newIdx}`,
      muted: false,
      solo: false,
      rec_armed: false,
      sync_locked: false,
      volume_db: 0.0,
      pan: 0.0,
      clips: shifted
    });
  }
  const nestedMarkers = (markers || []).map((mk) => {
    const copy = cloneCompoundJson(mk);
    copy.frame = Math.max(0, (copy.frame || 0) - rangeStart);
    return copy;
  });
  return {
    id: compId,
    name: compName,
    fps: cloneCompoundJson(fps || { num: 25, den: 1 }),
    width: Number.isFinite(Number(width)) ? Number(width) : 1920,
    height: Number.isFinite(Number(height)) ? Number(height) : 1080,
    duration_frames: Math.max(1, rangeEnd - rangeStart),
    tracks: nestedTracks,
    markers: nestedMarkers,
    precomp_blend_mode: precompBlendMode,
    collapse_transforms: Boolean(collapseTransforms),
    color_tag: colorTag
  };
}

export function createCompoundClipInDocument(doc, opts = {}) {
  if (!doc) {
    return { changed: false, op: "create_compound", detail: "No timeline loaded.", doc };
  }
  const nextDoc = cloneCompoundJson(doc);
  const blendMode = normalizePrecompBlendModeClient(opts.precomp_blend_mode);
  const collapseTransforms = opts.collapse_transforms !== undefined ? Boolean(opts.collapse_transforms) : true;
  const colorTag = normalizeCompoundColorTagClient(opts.color_tag);
  const includeAudio = opts.include_audio !== undefined ? Boolean(opts.include_audio) : true;
  const { name: compName, id: compId } = nextCompoundNameAndIdClient(nextDoc, opts.name);

  const hasRange =
    opts.in_frame !== undefined &&
    opts.in_frame !== null &&
    opts.out_frame !== undefined &&
    opts.out_frame !== null;

  let sub;
  let rangeStart = 0;
  let rangeEnd = 1;
  let anchorKind = "video";
  let preferredIdx = 1;
  let totalNested = 0;

  if (hasRange) {
    const inF = Math.round(Number(opts.in_frame));
    const outF = Math.round(Number(opts.out_frame));
    if (inF < 0 || outF <= inF) {
      throw new Error(`Invalid compound range [${inF}, ${outF})`);
    }
    const collected = [];
    let maxChildDepth = 0;
    let foundAnchorIdx = null;
    for (const trk of nextDoc.tracks || []) {
      if (!includeAudio && trk.kind === "audio") continue;
      const remaining = [];
      const extracted = [];
      for (const clip of trk.clips || []) {
        if ((clip.duration_frames || 0) <= 0) {
          remaining.push(clip);
          continue;
        }
        const cEnd = clip.start_frame + clip.duration_frames;
        if (clip.start_frame < outF && cEnd > inF) {
          const cd = computeCompoundDepthClient(clip);
          if (cd > maxChildDepth) maxChildDepth = cd;
          const sliced = sliceClipToWindowClient(clip, inF, outF, nextDoc.fps);
          if (sliced.left) remaining.push(sliced.left);
          if (sliced.mid) {
            extracted.push(sliced.mid);
            totalNested += 1;
          }
          if (sliced.right) remaining.push(sliced.right);
        } else {
          remaining.push(clip);
        }
      }
      trk.clips = remaining;
      if (extracted.length > 0) {
        collected.push({ kind: trk.kind, origIndex: trk.index, origName: trk.name, clips: extracted });
        if (trk.kind === "video" && (foundAnchorIdx === null || trk.index < foundAnchorIdx)) {
          anchorKind = "video";
          foundAnchorIdx = trk.index;
        } else if (trk.kind === "audio" && foundAnchorIdx === null) {
          anchorKind = "audio";
          foundAnchorIdx = trk.index;
        }
      }
    }
    if (totalNested === 0) {
      return {
        changed: false,
        op: "create_compound",
        detail: "No clips overlap the selected In/Out range.",
        doc: cloneCompoundJson(doc)
      };
    }
    if (1 + maxChildDepth > MAX_COMPOUND_NESTING_DEPTH) {
      throw new Error(`Compound nesting depth exceeds maximum (${MAX_COMPOUND_NESTING_DEPTH})`);
    }
    const extractedMarkers = [];
    const keptMarkers = [];
    for (const mk of nextDoc.markers || []) {
      if (mk.frame >= inF && mk.frame < outF) {
        extractedMarkers.push(mk);
      } else {
        keptMarkers.push(mk);
      }
    }
    nextDoc.markers = keptMarkers;
    sub = buildSubsequenceFromCollectedClient({
      compId,
      compName,
      fps: nextDoc.fps,
      width: nextDoc.width,
      height: nextDoc.height,
      rangeStart: inF,
      rangeEnd: outF,
      collectedTracks: collected,
      markers: extractedMarkers,
      precompBlendMode: blendMode,
      collapseTransforms,
      colorTag
    });
    rangeStart = inF;
    rangeEnd = outF;
    preferredIdx = foundAnchorIdx !== null ? foundAnchorIdx : 1;
  } else {
    const refs = Array.isArray(opts.target_clips) ? opts.target_clips : [];
    if (refs.length === 0) {
      return {
        changed: false,
        op: "create_compound",
        detail: "Select at least one clip or set an In/Out range.",
        doc: cloneCompoundJson(doc)
      };
    }
    const selMap = new Map();
    for (const ref of refs) {
      if (!ref) continue;
      const k = ref.track_kind === "audio" ? "audio" : "video";
      const ti = Number(ref.track_index || 1);
      const ci = Number(ref.clip_index);
      const key = `${k}:${ti}`;
      if (!selMap.has(key)) selMap.set(key, new Set());
      selMap.get(key).add(ci);
    }
    const picked = [];
    let maxChildDepth = 0;
    for (const trk of nextDoc.tracks || []) {
      const idxs = selMap.get(`${trk.kind}:${trk.index}`);
      if (!idxs) continue;
      for (const ci of idxs) {
        if (ci >= 0 && ci < (trk.clips || []).length) {
          const clip = trk.clips[ci];
          if ((clip.duration_frames || 0) > 0) {
            picked.push({ trk, clip });
            const cd = computeCompoundDepthClient(clip);
            if (cd > maxChildDepth) maxChildDepth = cd;
          }
        }
      }
    }
    if (picked.length === 0) {
      return {
        changed: false,
        op: "create_compound",
        detail: "No valid clips matched selection.",
        doc: cloneCompoundJson(doc)
      };
    }
    if (1 + maxChildDepth > MAX_COMPOUND_NESTING_DEPTH) {
      throw new Error(`Compound nesting depth exceeds maximum (${MAX_COMPOUND_NESTING_DEPTH})`);
    }
    rangeStart = Math.min(...picked.map((p) => p.clip.start_frame));
    rangeEnd = Math.max(...picked.map((p) => p.clip.start_frame + p.clip.duration_frames));
    const hasVideo = picked.some((p) => p.trk.kind === "video");
    anchorKind = hasVideo ? "video" : "audio";
    preferredIdx = Math.min(...picked.filter((p) => p.trk.kind === anchorKind).map((p) => p.trk.index));

    const collected = [];
    for (const trk of nextDoc.tracks || []) {
      const idxs = selMap.get(`${trk.kind}:${trk.index}`);
      if (!idxs) continue;
      const extracted = [];
      const remaining = [];
      (trk.clips || []).forEach((clip, idx) => {
        if (idxs.has(idx) && (clip.duration_frames || 0) > 0) {
          extracted.push(clip);
          totalNested += 1;
        } else {
          remaining.push(clip);
        }
      });
      trk.clips = remaining;
      if (extracted.length > 0) {
        collected.push({ kind: trk.kind, origIndex: trk.index, origName: trk.name, clips: extracted });
      }
    }
    sub = buildSubsequenceFromCollectedClient({
      compId,
      compName,
      fps: nextDoc.fps,
      width: nextDoc.width,
      height: nextDoc.height,
      rangeStart,
      rangeEnd,
      collectedTracks: collected,
      markers: [],
      precompBlendMode: blendMode,
      collapseTransforms,
      colorTag
    });
  }

  const targetTrack = findOrCreateFreeTrackClient(
    nextDoc,
    anchorKind,
    preferredIdx,
    rangeStart,
    rangeEnd
  );
  const compClip = {
    name: compName,
    track_index: targetTrack.index,
    media_type: anchorKind,
    start_frame: rangeStart,
    duration_frames: sub.duration_frames,
    source_in_frame: 0,
    source_path: `compound://${compId}`,
    media_ref: compId,
    source_fps: cloneCompoundJson(nextDoc.fps || { num: 25, den: 1 }),
    enabled: true,
    audio_gain_db: 0.0,
    fade_in_s: 0.0,
    fade_out_s: 0.0,
    speed_rate: 1.0,
    reverse: false,
    compound_subsequence: sub
  };
  targetTrack.clips.push(compClip);
  sortTracksCanonicalClient(nextDoc);
  const newClipIdx = targetTrack.clips.indexOf(compClip);

  return {
    changed: true,
    op: "create_compound",
    compound_id: compId,
    track_kind: anchorKind,
    track_index: targetTrack.index,
    clip_index: newClipIdx,
    nested_clip_count: totalNested,
    nested_track_count: sub.tracks.length,
    max_depth: computeDocumentCompoundDepthClient(nextDoc),
    detail: `Created Compound Clip '${compName}' (${sub.tracks.length}T / ${totalNested}C).`,
    doc: nextDoc,
    clip: compClip
  };
}

export function decomposeCompoundClipInDocument(
  doc,
  trackKind = "video",
  trackIndex = 1,
  clipIndex = 0
) {
  if (!doc) {
    return { changed: false, op: "decompose_compound", detail: "No timeline loaded.", doc };
  }
  const nextDoc = cloneCompoundJson(doc);
  const targetTrack = (nextDoc.tracks || []).find(
    (t) => t.kind === trackKind && t.index === trackIndex
  );
  if (!targetTrack || clipIndex < 0 || clipIndex >= (targetTrack.clips || []).length) {
    return {
      changed: false,
      op: "decompose_compound",
      detail: "Selected clip slot was not found.",
      doc: cloneCompoundJson(doc)
    };
  }
  const compClip = targetTrack.clips[clipIndex];
  const sub = compClip ? compClip.compound_subsequence : null;
  if (!sub) {
    return {
      changed: false,
      op: "decompose_compound",
      detail: "Selected clip is not a Compound Clip.",
      doc: cloneCompoundJson(doc)
    };
  }

  targetTrack.clips.splice(clipIndex, 1);
  const compSpeed = Math.max(0.1, Number(compClip.speed_rate || 1.0));
  const compGain = Number(compClip.audio_gain_db || 0.0);
  const compEnabled = compClip.enabled !== false;
  const visStart = Math.max(0, Number(compClip.source_in_frame || 0));
  const visSpan = Math.max(1, Math.round(Number(compClip.duration_frames || 1) * compSpeed));
  const visEnd = visStart + visSpan;

  let unpackedCount = 0;
  let focusClip = null;
  let focusKind = trackKind;
  let focusTidx = trackIndex;

  const sortedNestedTracks = [...(sub.tracks || [])].sort((a, b) => {
    const ka = a.kind === "video" ? 0 : 1;
    const kb = b.kind === "video" ? 0 : 1;
    return ka - kb || a.index - b.index;
  });

  for (const nTrk of sortedNestedTracks) {
    for (const nClip of nTrk.clips || []) {
      if ((nClip.duration_frames || 0) <= 0) continue;
      const nEnd = nClip.start_frame + nClip.duration_frames;
      const ovStart = Math.max(nClip.start_frame, visStart);
      const ovEnd = Math.min(nEnd, visEnd);
      if (ovEnd <= ovStart) continue;

      const leftTrim = ovStart - nClip.start_frame;
      const srcDelta = conformSourceFramesClient(leftTrim, nClip.source_fps, sub.fps);
      const parentStart = compClip.start_frame + Math.round((ovStart - visStart) / compSpeed);
      const parentDur = Math.max(1, Math.round((ovEnd - ovStart) / compSpeed));
      const parentEnd = parentStart + parentDur;

      const prefIdx =
        nTrk.kind === targetTrack.kind && nTrk.index === 1 ? targetTrack.index : nTrk.index;
      const destTrack = findOrCreateFreeTrackClient(
        nextDoc,
        nTrk.kind,
        prefIdx,
        parentStart,
        parentEnd
      );
      const placed = cloneCompoundJson(nClip);
      placed.track_index = destTrack.index;
      placed.start_frame = parentStart;
      placed.duration_frames = parentDur;
      placed.source_in_frame = Math.max(0, (nClip.source_in_frame || 0) + srcDelta);
      placed.enabled = nClip.enabled !== false && compEnabled;
      placed.audio_gain_db = clampNum((Number(nClip.audio_gain_db || 0) + compGain), -24, 12);
      if (compSpeed !== 1.0) {
        placed.speed_rate = clampNum(
          Number((Number(nClip.speed_rate || 1.0) * compSpeed).toFixed(4)),
          0.1,
          16.0
        );
      }
      destTrack.clips.push(placed);
      unpackedCount += 1;
      if (!focusClip) {
        focusClip = placed;
        focusKind = destTrack.kind;
        focusTidx = destTrack.index;
      }
    }
  }

  for (const mk of sub.markers || []) {
    if (mk.frame >= visStart && mk.frame < visEnd) {
      const mkCopy = cloneCompoundJson(mk);
      mkCopy.frame = compClip.start_frame + Math.round((mk.frame - visStart) / compSpeed);
      nextDoc.markers = nextDoc.markers || [];
      nextDoc.markers.push(mkCopy);
    }
  }
  sortTracksCanonicalClient(nextDoc);
  if (Array.isArray(nextDoc.markers)) {
    nextDoc.markers.sort((a, b) => a.frame - b.frame || String(a.name).localeCompare(String(b.name)));
  }

  let focusCidx = 0;
  if (focusClip) {
    const fTrk = nextDoc.tracks.find((t) => t.kind === focusKind && t.index === focusTidx);
    if (fTrk) focusCidx = Math.max(0, fTrk.clips.indexOf(focusClip));
  }

  return {
    changed: true,
    op: "decompose_compound",
    compound_id: sub.id,
    track_kind: focusKind,
    track_index: focusTidx,
    clip_index: focusCidx,
    nested_clip_count: unpackedCount,
    nested_track_count: (sub.tracks || []).length,
    max_depth: computeDocumentCompoundDepthClient(nextDoc),
    detail: `Decomposed '${sub.name}' into ${unpackedCount} clip(s).`,
    doc: nextDoc,
    clip: focusClip
  };
}

export function compoundClipToTimelineDoc(clip, fallbackFps) {
  const sub = clip ? clip.compound_subsequence : null;
  if (!sub) {
    throw new Error("Clip does not contain a CompoundSubSequence.");
  }
  return {
    name: sub.name || clip.name || "Pre-Comp",
    source_format: "drt",
    fps: cloneCompoundJson(sub.fps || fallbackFps || { num: 25, den: 1 }),
    width: sub.width || 1920,
    height: sub.height || 1080,
    start_frame: 0,
    tracks: cloneCompoundJson(sub.tracks || []),
    markers: cloneCompoundJson(sub.markers || []),
    color_space_tags: [],
    lut_refs: [],
    warnings: []
  };
}

export function updateCompoundSubsequenceInDocument(
  doc,
  trackKind = "video",
  trackIndex = 1,
  clipIndex = 0,
  subDoc = null,
  opts = {}
) {
  if (!doc) {
    return { changed: false, op: "update_compound", detail: "No timeline loaded.", doc };
  }
  const nextDoc = cloneCompoundJson(doc);
  const targetTrack = (nextDoc.tracks || []).find(
    (t) => t.kind === trackKind && t.index === trackIndex
  );
  if (!targetTrack || clipIndex < 0 || clipIndex >= (targetTrack.clips || []).length) {
    return {
      changed: false,
      op: "update_compound",
      detail: "Target Compound Clip slot not found.",
      doc: cloneCompoundJson(doc)
    };
  }
  const compClip = targetTrack.clips[clipIndex];
  if (!compClip || !compClip.compound_subsequence) {
    return {
      changed: false,
      op: "update_compound",
      detail: "Target clip is not a Compound Clip.",
      doc: cloneCompoundJson(doc)
    };
  }
  const sub = cloneCompoundJson(compClip.compound_subsequence);
  if (subDoc && typeof subDoc === "object") {
    if (Array.isArray(subDoc.tracks)) {
      let maxEnd = 1;
      for (const trk of subDoc.tracks) {
        for (const c of trk.clips || []) {
          const endF = (c.start_frame || 0) + (c.duration_frames || 0);
          if (endF > maxEnd) maxEnd = endF;
        }
      }
      sub.tracks = cloneCompoundJson(subDoc.tracks);
      sub.markers = cloneCompoundJson(subDoc.markers || []);
      sub.duration_frames = Math.max(1, maxEnd);
      if (typeof subDoc.name === "string" && subDoc.name.trim()) {
        sub.name = subDoc.name.trim().slice(0, 120);
      }
    }
  }
  if (opts.precomp_blend_mode !== undefined && opts.precomp_blend_mode !== null) {
    sub.precomp_blend_mode = normalizePrecompBlendModeClient(opts.precomp_blend_mode);
  }
  if (opts.collapse_transforms !== undefined && opts.collapse_transforms !== null) {
    sub.collapse_transforms = Boolean(opts.collapse_transforms);
  }
  if (opts.color_tag !== undefined && opts.color_tag !== null) {
    sub.color_tag = normalizeCompoundColorTagClient(opts.color_tag);
  }
  if (typeof opts.name === "string" && opts.name.trim()) {
    sub.name = opts.name.trim().slice(0, 120);
  }

  compClip.compound_subsequence = sub;
  compClip.name = sub.name;
  const depth = computeDocumentCompoundDepthClient(nextDoc);
  if (depth > MAX_COMPOUND_NESTING_DEPTH) {
    throw new Error(`Compound nesting depth (${depth}) exceeds maximum (${MAX_COMPOUND_NESTING_DEPTH})`);
  }
  const nestedCount = (sub.tracks || []).reduce((acc, t) => acc + (t.clips || []).length, 0);
  return {
    changed: true,
    op: "update_compound",
    compound_id: sub.id,
    track_kind: trackKind,
    track_index: trackIndex,
    clip_index: clipIndex,
    nested_clip_count: nestedCount,
    nested_track_count: (sub.tracks || []).length,
    max_depth: depth,
    detail: `Updated Pre-Comp '${sub.name}' (${(sub.tracks || []).length}T / ${nestedCount}C).`,
    doc: nextDoc,
    clip: compClip
  };
}

export function flattenAllCompoundsInDocument(doc) {
  if (!doc) {
    return { changed: false, op: "flatten_all", detail: "No timeline loaded.", doc };
  }
  let working = cloneCompoundJson(doc);
  let flattened = 0;
  let guard = 0;
  while (guard < 128) {
    guard += 1;
    let found = null;
    for (const trk of working.tracks || []) {
      const clips = trk.clips || [];
      for (let idx = 0; idx < clips.length; idx += 1) {
        if (clips[idx] && clips[idx].compound_subsequence) {
          found = { kind: trk.kind, index: trk.index, clipIndex: idx };
          break;
        }
      }
      if (found) break;
    }
    if (!found) break;
    const res = decomposeCompoundClipInDocument(
      working,
      found.kind,
      found.index,
      found.clipIndex
    );
    if (!res.changed) break;
    working = res.doc;
    flattened += 1;
  }
  const totalClips = (working.tracks || []).reduce((acc, t) => acc + (t.clips || []).length, 0);
  return {
    changed: flattened > 0,
    op: "flatten_all",
    compound_id: "",
    track_kind: "video",
    track_index: 1,
    clip_index: 0,
    nested_clip_count: totalClips,
    nested_track_count: (working.tracks || []).length,
    max_depth: computeDocumentCompoundDepthClient(working),
    detail:
      flattened > 0
        ? `Flattened ${flattened} Compound Clip(s) into ${(working.tracks || []).length} track(s).`
        : "No Compound Clips present in timeline.",
    doc: working
  };
}

export function compileCompoundFiltergraphClient(sub, opts = {}) {
  if (!sub) {
    throw new Error("CompoundSubSequence is required.");
  }
  const speedRate = Number(opts.speed_rate || 1.0);
  if (!Number.isFinite(speedRate) || speedRate <= 0) {
    throw new Error("speed_rate must be positive");
  }
  const masterGainDb = Number(opts.master_gain_db || 0.0);
  const fpsNum = Number((sub.fps && sub.fps.num) || 25);
  const fpsDen = Number((sub.fps && sub.fps.den) || 1);
  const fpsVal = fpsNum / Math.max(1, fpsDen);
  const fpsStr = fpsDen === 1 ? String(fpsNum) : `${fpsNum}/${fpsDen}`;
  const durS = ((Number(sub.duration_frames || 1) / fpsVal) / speedRate).toFixed(3);
  const width = sub.width > 0 ? sub.width : 1920;
  const height = sub.height > 0 ? sub.height : 1080;
  const blendMode = normalizePrecompBlendModeClient(sub.precomp_blend_mode);
  const collapseTransforms = sub.collapse_transforms !== false;

  const videoTracks = (sub.tracks || [])
    .filter((t) => t.kind === "video" && !t.muted)
    .sort((a, b) => a.index - b.index);
  const audioTracks = (sub.tracks || [])
    .filter((t) => t.kind === "audio" && !t.muted)
    .sort((a, b) => a.index - b.index);

  const stages = [];
  const warnings = [];
  const totalNestedClips = (sub.tracks || []).reduce((acc, t) => acc + (t.clips || []).length, 0);

  let videoLabel = null;
  if (videoTracks.length > 0) {
    const baseTag = "cmp_base";
    stages.push(`color=c=black:s=${width}x${height}:r=${fpsStr}:d=${durS}[${baseTag}]`);
    let currentV = baseTag;
    let vIdx = 0;
    let layerIdx = 0;
    for (const trk of videoTracks) {
      for (const clip of trk.clips || []) {
        if (clip.enabled === false || (clip.duration_frames || 0) <= 0) continue;
        const t0 = ((clip.start_frame / fpsVal) / speedRate).toFixed(3);
        const t1 = (((clip.start_frame + clip.duration_frames) / fpsVal) / speedRate).toFixed(3);
        const inS = ((clip.source_in_frame || 0) / fpsVal).toFixed(3);
        const srcDur = ((clip.duration_frames / fpsVal) / speedRate).toFixed(3);
        const prepTag = `cmp_v${layerIdx}`;
        if (clip.compound_subsequence) {
          warnings.push(`Nested sub-comp '${clip.name}' flattened at compositing stage ${layerIdx}`);
        }
        stages.push(
          `[${vIdx}:v]trim=start=${inS}:duration=${srcDur},setpts=PTS-STARTPTS+${t0}/TB,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2[${prepTag}]`
        );
        const outTag = `cmp_comp${layerIdx}`;
        if (blendMode === "normal" || layerIdx === 0) {
          stages.push(
            `[${currentV}][${prepTag}]overlay=x=0:y=0:eof_action=pass:enable='between(t,${t0},${t1})'[${outTag}]`
          );
        } else {
          stages.push(
            `[${currentV}][${prepTag}]blend=all_mode=${blendMode}:all_opacity=1.0:enable='between(t,${t0},${t1})'[${outTag}]`
          );
        }
        currentV = outTag;
        vIdx += 1;
        layerIdx += 1;
      }
    }
    if (layerIdx > 0 && !collapseTransforms) {
      const rasterTag = "cmp_raster";
      stages.push(`[${currentV}]format=yuv420p[${rasterTag}]`);
      currentV = rasterTag;
    }
    videoLabel = `[${currentV}]`;
  }

  let audioLabel = null;
  const audioBuses = [];
  let aIdx = 0;
  for (const trk of audioTracks) {
    for (const clip of trk.clips || []) {
      if (clip.enabled === false || (clip.duration_frames || 0) <= 0) continue;
      const inS = ((clip.source_in_frame || 0) / fpsVal).toFixed(3);
      const srcDur = ((clip.duration_frames / fpsVal) / speedRate).toFixed(3);
      const delayMs = Math.max(0, Math.round(((clip.start_frame / fpsVal) / speedRate) * 1000));
      const effGain = clampNum(
        Number(clip.audio_gain_db || 0) + Number(trk.volume_db || 0) + masterGainDb,
        -24,
        12
      );
      const busTag = `cmp_a${aIdx}`;
      stages.push(
        `[${aIdx}:a]atrim=start=${inS}:duration=${srcDur},asetpts=PTS-STARTPTS,volume=${effGain.toFixed(2)}dB,adelay=${delayMs}|${delayMs}[${busTag}]`
      );
      audioBuses.push(`[${busTag}]`);
      aIdx += 1;
    }
  }
  if (audioBuses.length === 1) {
    audioLabel = audioBuses[0];
  } else if (audioBuses.length > 1) {
    stages.push(`${audioBuses.join("")}amix=inputs=${audioBuses.length}:normalize=0[cmp_amix]`);
    audioLabel = "[cmp_amix]";
  }

  return {
    compound_id: sub.id,
    name: sub.name,
    duration_s: Number(durS),
    video_track_count: videoTracks.length,
    audio_track_count: audioTracks.length,
    total_nested_clips: totalNestedClips,
    precomp_blend_mode: blendMode,
    collapse_transforms: collapseTransforms,
    filter_complex: stages.join(";"),
    video_map_label: videoLabel,
    audio_map_label: audioLabel,
    warnings
  };
}

export const MULTICAM_SYNC_MODES = ["audio_waveform", "timecode", "in_point", "marker"];
export const MULTICAM_CUT_MODES = ["video_only", "audio_video", "audio_only"];
export const MULTICAM_ANGLE_COLORS = ["blue", "teal", "amber", "violet"];
export const MAX_MULTICAM_ANGLES = 8;

const MULTICAM_ANGLE_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const MULTICAM_DEFAULT_LABELS = [
  "CAM A - Wide Master",
  "CAM B - Medium Talent",
  "CAM C - Tight Close",
  "CAM D - Overhead Stage"
];
const MULTICAM_DEFAULT_SLATE_PEAKS = [12, 26, 5, 34];

function smpteToFramesClient(tc, fpsInt) {
  const parts = String(tc || "").trim().split(":");
  if (parts.length !== 4) return 0;
  const hh = Number.parseInt(parts[0], 10) || 0;
  const mm = Number.parseInt(parts[1], 10) || 0;
  const ss = Number.parseInt(parts[2], 10) || 0;
  const ff = Number.parseInt(parts[3], 10) || 0;
  const rate = Math.max(1, fpsInt);
  return (hh * 3600 + mm * 60 + ss) * rate + Math.min(rate - 1, Math.max(0, ff));
}

function framesToSmpteClient(frames, fpsInt) {
  const rate = Math.max(1, fpsInt);
  const total = Math.max(0, Math.round(frames || 0));
  const ff = total % rate;
  const totalS = Math.floor(total / rate);
  const ss = totalS % 60;
  const mm = Math.floor(totalS / 60) % 60;
  const hh = Math.floor(totalS / 3600);
  const pad = (v) => String(v).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

function slugifyMulticamIdClient(raw) {
  const cleaned = String(raw || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned ? cleaned.slice(0, 48) : "multicam_bank";
}

function nextMulticamNameAndIdClient(doc, requestedName) {
  const existingIds = new Set();
  let existingCount = 0;
  for (const trk of doc.tracks || []) {
    for (const c of trk.clips || []) {
      if (c && c.multicam_bank) {
        existingCount += 1;
        existingIds.add(c.multicam_bank.id);
      }
    }
  }
  const cleanReq = typeof requestedName === "string" ? requestedName.trim() : "";
  const baseName = (cleanReq || `Multi-Cam Bank ${existingCount + 1}`).slice(0, 120);
  const baseId = slugifyMulticamIdClient(baseName);
  let candId = baseId;
  let suffix = 2;
  while (existingIds.has(candId)) {
    candId = `${baseId}_${suffix}`;
    suffix += 1;
  }
  return { name: baseName, id: candId };
}

export function countMulticamClipsInDocument(doc) {
  if (!doc || !Array.isArray(doc.tracks)) return 0;
  let total = 0;
  for (const trk of doc.tracks) {
    for (const c of trk.clips || []) {
      if (c && c.multicam_bank) total += 1;
    }
  }
  return total;
}

export function resolveMulticamActiveAngleAtFrame(bank, localFrame) {
  if (!bank || !Array.isArray(bank.cuts) || !bank.cuts.length) {
    return { frame: 0, angle_index: 1, cut_mode: "video_only" };
  }
  const dur = Math.max(1, Number(bank.duration_frames || 1));
  const target = Math.max(0, Math.min(dur - 1, Math.round(localFrame || 0)));
  const ordered = [...bank.cuts].sort((a, b) => a.frame - b.frame);
  let active = ordered[0];
  for (const cut of ordered) {
    if (cut.frame <= target) {
      active = cut;
    } else {
      break;
    }
  }
  return active;
}

export function computeMulticamSegmentsClient(bank) {
  if (!bank || !Array.isArray(bank.angles) || !bank.angles.length) return [];
  const dur = Math.max(1, Number(bank.duration_frames || 1));
  const angleMap = new Map(bank.angles.map((a) => [a.angle_index, a]));
  const cuts = Array.isArray(bank.cuts) && bank.cuts.length
    ? [...bank.cuts].sort((a, b) => a.frame - b.frame)
    : [{ frame: 0, angle_index: bank.angles[0].angle_index, cut_mode: "video_only" }];
  const segments = [];
  for (let idx = 0; idx < cuts.length; idx += 1) {
    const cut = cuts[idx];
    const startF = Math.max(0, Math.min(dur - 1, Math.round(cut.frame)));
    const nextF = idx + 1 < cuts.length ? cuts[idx + 1].frame : dur;
    const endF = Math.max(startF + 1, Math.min(dur, Math.round(nextF)));
    const angle = angleMap.get(cut.angle_index) || bank.angles[0];
    const srcIn = Math.max(0, Number(angle.source_in_frame || 0) + Number(angle.sync_offset_frames || 0) + startF);
    segments.push({
      start_frame: startF,
      end_frame: endF,
      duration_frames: endF - startF,
      angle_index: angle.angle_index,
      angle_name: angle.name,
      cut_mode: cut.cut_mode || "video_only",
      source_in_frame: srcIn,
      source_path: angle.source_path || ""
    });
  }
  return segments;
}

export function syncMulticamBankClient(bank, syncMode = "audio_waveform") {
  const mode = MULTICAM_SYNC_MODES.includes(syncMode) ? syncMode : "audio_waveform";
  const fpsVal = bank && bank.fps ? Math.max(1, Math.round(bank.fps.num / Math.max(1, bank.fps.den))) : 25;
  const angles = (bank.angles || []).map((a) => ({ ...a }));
  if (!angles.length) return { ...bank, sync_mode: mode };

  if (mode === "in_point") {
    for (const a of angles) {
      a.sync_offset_frames = 0;
    }
  } else if (mode === "timecode") {
    const tcs = angles.map((a) => smpteToFramesClient(a.timecode_start, fpsVal));
    const minTc = Math.min(...tcs);
    angles.forEach((a, i) => {
      a.sync_offset_frames = Math.max(-100000, Math.min(100000, tcs[i] - minTc));
    });
  } else if (mode === "audio_waveform") {
    const refPeak = angles[0].audio_peak_frame !== null && angles[0].audio_peak_frame !== undefined
      ? Number(angles[0].audio_peak_frame)
      : 12;
    angles.forEach((a, i) => {
      let peak = a.audio_peak_frame;
      if (peak === null || peak === undefined) {
        peak = MULTICAM_DEFAULT_SLATE_PEAKS[i % MULTICAM_DEFAULT_SLATE_PEAKS.length];
        a.audio_peak_frame = peak;
      }
      a.sync_offset_frames = Math.max(-100000, Math.min(100000, refPeak - Number(peak)));
    });
  } else {
    const refIn = Number(angles[0].source_in_frame || 0);
    for (const a of angles) {
      a.sync_offset_frames = Math.max(-100000, Math.min(100000, Number(a.source_in_frame || 0) - refIn));
    }
  }
  return { ...bank, sync_mode: mode, angles };
}

export function createMulticamClipInDocument(doc, opts = {}) {
  const nextDoc = cloneTimelineDoc(doc);
  const tkKind = opts.track_kind === "audio" ? "audio" : "video";
  const tkIdx = Number.isInteger(opts.track_index) ? opts.track_index : 1;
  const cIdx = Number.isInteger(opts.clip_index) ? opts.clip_index : 0;
  if (tkKind !== "video") {
    throw new Error("Multi-Cam Sync Bank requires a video track clip");
  }
  const trk = (nextDoc.tracks || []).find((t) => t.kind === tkKind && t.index === tkIdx);
  if (!trk || cIdx < 0 || cIdx >= (trk.clips || []).length) {
    throw new Error("Target clip not found for Multi-Cam");
  }
  const target = trk.clips[cIdx];
  if (target.multicam_bank) {
    return {
      changed: false,
      op: "create_multicam",
      multicam_id: target.multicam_bank.id,
      track_kind: "video",
      track_index: tkIdx,
      clip_index: cIdx,
      angle_count: target.multicam_bank.angles.length,
      cut_count: target.multicam_bank.cuts.length,
      active_angle: target.multicam_bank.cuts[0]?.angle_index || 1,
      detail: "Selected clip is already a Multi-Cam Sync Bank",
      doc
    };
  }
  if ((target.duration_frames || 0) < 1) {
    throw new Error("Multi-Cam clip requires positive duration_frames (>= 1)");
  }

  const syncMode = MULTICAM_SYNC_MODES.includes(opts.sync_mode) ? opts.sync_mode : "audio_waveform";
  const { name: bankName, id: bankId } = nextMulticamNameAndIdClient(nextDoc, opts.name);
  const fpsVal = nextDoc.fps ? Math.max(1, Math.round(nextDoc.fps.num / Math.max(1, nextDoc.fps.den))) : 25;
  const spanStart = target.start_frame;
  const spanEnd = target.start_frame + target.duration_frames;

  let builtAngles = [];
  if (Array.isArray(opts.angles) && opts.angles.length >= 2) {
    builtAngles = opts.angles.slice(0, MAX_MULTICAM_ANGLES).map((a) => ({ ...a }));
  } else {
    const stacked = [target];
    const sortedTracks = [...(nextDoc.tracks || [])].sort((a, b) => a.index - b.index);
    for (const otherTrk of sortedTracks) {
      if (otherTrk.kind !== "video" || otherTrk.index === tkIdx) continue;
      const match = (otherTrk.clips || []).find(
        (c) => c.duration_frames > 0 && c.start_frame < spanEnd && c.start_frame + c.duration_frames > spanStart
      );
      if (match) stacked.push(match);
    }
    const baseTcFrames = smpteToFramesClient("01:00:00:00", fpsVal) + (target.source_in_frame || 0);
    if (stacked.length >= 2) {
      builtAngles = stacked.slice(0, MAX_MULTICAM_ANGLES).map((sc, idx) => ({
        angle_index: idx + 1,
        name: sc.name || `CAM ${MULTICAM_ANGLE_LETTERS[idx]}`,
        source_path: sc.source_path || "",
        media_ref: sc.media_ref || "",
        source_in_frame: sc.source_in_frame || 0,
        duration_frames: Math.max(target.duration_frames, sc.duration_frames),
        sync_offset_frames: 0,
        timecode_start: framesToSmpteClient(smpteToFramesClient("01:00:00:00", fpsVal) + (sc.source_in_frame || 0), fpsVal),
        audio_peak_frame: MULTICAM_DEFAULT_SLATE_PEAKS[idx % MULTICAM_DEFAULT_SLATE_PEAKS.length],
        color_tag: MULTICAM_ANGLE_COLORS[idx % MULTICAM_ANGLE_COLORS.length],
        audio_follow: idx === 0,
        enabled: true
      }));
    } else {
      const baseStem = String(target.source_path || target.name || "cam").replace(/\.[A-Za-z0-9]+$/, "").trim() || "cam";
      for (let idx = 0; idx < 4; idx += 1) {
        builtAngles.push({
          angle_index: idx + 1,
          name: MULTICAM_DEFAULT_LABELS[idx],
          source_path: idx === 0 && target.source_path ? target.source_path : `${baseStem}_cam${MULTICAM_ANGLE_LETTERS[idx]}.mov`,
          media_ref: idx === 0 ? target.media_ref || "" : "",
          source_in_frame: target.source_in_frame || 0,
          duration_frames: Math.max(target.duration_frames, 1),
          sync_offset_frames: 0,
          timecode_start: framesToSmpteClient(baseTcFrames + idx * 8, fpsVal),
          audio_peak_frame: MULTICAM_DEFAULT_SLATE_PEAKS[idx],
          color_tag: MULTICAM_ANGLE_COLORS[idx % MULTICAM_ANGLE_COLORS.length],
          audio_follow: idx === 0,
          enabled: true
        });
      }
    }
  }

  const rawBank = {
    id: bankId,
    name: bankName,
    fps: { ...nextDoc.fps },
    width: nextDoc.width || 1920,
    height: nextDoc.height || 1080,
    duration_frames: target.duration_frames,
    sync_mode: syncMode,
    audio_follow_angle: builtAngles[0].angle_index,
    angles: builtAngles,
    cuts: [{ frame: 0, angle_index: builtAngles[0].angle_index, cut_mode: "video_only" }]
  };
  const syncedBank = syncMulticamBankClient(rawBank, syncMode);
  trk.clips[cIdx] = { ...target, name: bankName, multicam_bank: syncedBank };

  return {
    changed: true,
    op: "create_multicam",
    multicam_id: syncedBank.id,
    track_kind: "video",
    track_index: tkIdx,
    clip_index: cIdx,
    angle_count: syncedBank.angles.length,
    cut_count: syncedBank.cuts.length,
    active_angle: syncedBank.cuts[0].angle_index,
    detail: `Created Multi-Cam Bank '${bankName}' (${syncedBank.angles.length} angles, sync=${syncMode})`,
    doc: nextDoc
  };
}

export function syncMulticamClipInDocument(doc, tkKind, tkIdx, cIdx, syncMode) {
  const nextDoc = cloneTimelineDoc(doc);
  const trk = (nextDoc.tracks || []).find((t) => t.kind === tkKind && t.index === tkIdx);
  const target = trk && trk.clips ? trk.clips[cIdx] : null;
  if (!target || !target.multicam_bank) {
    throw new Error("Selected clip is not a Multi-Cam Sync Bank");
  }
  const syncedBank = syncMulticamBankClient(target.multicam_bank, syncMode);
  trk.clips[cIdx] = { ...target, multicam_bank: syncedBank };
  return {
    changed: true,
    op: "sync_multicam",
    multicam_id: syncedBank.id,
    track_kind: tkKind,
    track_index: tkIdx,
    clip_index: cIdx,
    angle_count: syncedBank.angles.length,
    cut_count: syncedBank.cuts.length,
    active_angle: syncedBank.cuts[0]?.angle_index || 1,
    detail: `Synchronized ${syncedBank.angles.length} angles via ${syncedBank.sync_mode}`,
    doc: nextDoc
  };
}

export function switchMulticamAngleInDocument(doc, tkKind, tkIdx, cIdx, frame, angleIndex, cutMode = "video_only") {
  const nextDoc = cloneTimelineDoc(doc);
  const trk = (nextDoc.tracks || []).find((t) => t.kind === tkKind && t.index === tkIdx);
  const target = trk && trk.clips ? trk.clips[cIdx] : null;
  if (!target || !target.multicam_bank) {
    throw new Error("Selected clip is not a Multi-Cam Sync Bank");
  }
  const bank = target.multicam_bank;
  const validAngle = (bank.angles || []).some((a) => a.angle_index === angleIndex);
  if (!validAngle) {
    throw new Error(`Angle ${angleIndex} does not exist in Multi-Cam Bank`);
  }
  const mode = MULTICAM_CUT_MODES.includes(cutMode) ? cutMode : "video_only";
  const localFrame = Math.max(0, Math.min(bank.duration_frames - 1, Math.round(frame) - target.start_frame));
  const cutsMap = new Map((bank.cuts || []).map((c) => [c.frame, { ...c }]));
  cutsMap.set(localFrame, { frame: localFrame, angle_index: angleIndex, cut_mode: mode });
  const ordered = [];
  for (const f of [...cutsMap.keys()].sort((a, b) => a - b)) {
    const ev = cutsMap.get(f);
    if (ordered.length && ordered[ordered.length - 1].angle_index === ev.angle_index && ev.frame !== 0) {
      continue;
    }
    ordered.push(ev);
  }
  const audioFollow = (mode === "audio_video" || mode === "audio_only") && localFrame === 0
    ? angleIndex
    : bank.audio_follow_angle;
  const updatedBank = { ...bank, cuts: ordered, audio_follow_angle: audioFollow };
  trk.clips[cIdx] = { ...target, multicam_bank: updatedBank };
  return {
    changed: true,
    op: "switch_angle",
    multicam_id: updatedBank.id,
    track_kind: tkKind,
    track_index: tkIdx,
    clip_index: cIdx,
    angle_count: updatedBank.angles.length,
    cut_count: updatedBank.cuts.length,
    active_angle: angleIndex,
    detail: `Switched to Angle ${angleIndex} at +${localFrame}f (${mode})`,
    doc: nextDoc
  };
}

export function deleteMulticamCutInDocument(doc, tkKind, tkIdx, cIdx, localFrame) {
  const nextDoc = cloneTimelineDoc(doc);
  const trk = (nextDoc.tracks || []).find((t) => t.kind === tkKind && t.index === tkIdx);
  const target = trk && trk.clips ? trk.clips[cIdx] : null;
  if (!target || !target.multicam_bank) {
    throw new Error("Selected clip is not a Multi-Cam Sync Bank");
  }
  const bank = target.multicam_bank;
  if (localFrame <= 0) {
    return {
      changed: false,
      op: "delete_cut",
      multicam_id: bank.id,
      track_kind: tkKind,
      track_index: tkIdx,
      clip_index: cIdx,
      angle_count: bank.angles.length,
      cut_count: bank.cuts.length,
      active_angle: bank.cuts[0]?.angle_index || 1,
      detail: "Base angle cut at frame 0 cannot be deleted",
      doc
    };
  }
  const kept = (bank.cuts || []).filter((c) => c.frame !== localFrame);
  if (kept.length === bank.cuts.length) {
    return {
      changed: false,
      op: "delete_cut",
      multicam_id: bank.id,
      track_kind: tkKind,
      track_index: tkIdx,
      clip_index: cIdx,
      angle_count: bank.angles.length,
      cut_count: bank.cuts.length,
      active_angle: bank.cuts[0]?.angle_index || 1,
      detail: `No Multi-Cam cut found at +${localFrame}f`,
      doc
    };
  }
  const updatedBank = { ...bank, cuts: kept };
  trk.clips[cIdx] = { ...target, multicam_bank: updatedBank };
  return {
    changed: true,
    op: "delete_cut",
    multicam_id: updatedBank.id,
    track_kind: tkKind,
    track_index: tkIdx,
    clip_index: cIdx,
    angle_count: updatedBank.angles.length,
    cut_count: updatedBank.cuts.length,
    active_angle: updatedBank.cuts[0]?.angle_index || 1,
    detail: `Removed Multi-Cam cut at +${localFrame}f`,
    doc: nextDoc
  };
}

export function updateMulticamAngleInDocument(doc, tkKind, tkIdx, cIdx, opts = {}) {
  const nextDoc = cloneTimelineDoc(doc);
  const trk = (nextDoc.tracks || []).find((t) => t.kind === tkKind && t.index === tkIdx);
  const target = trk && trk.clips ? trk.clips[cIdx] : null;
  if (!target || !target.multicam_bank) {
    throw new Error("Selected clip is not a Multi-Cam Sync Bank");
  }
  const bank = target.multicam_bank;
  const angleIndex = Number(opts.angle_index);
  let found = false;
  const nextAngles = (bank.angles || []).map((a) => {
    if (a.angle_index !== angleIndex) return a;
    found = true;
    return {
      ...a,
      name: typeof opts.name === "string" && opts.name.trim() ? opts.name.trim().slice(0, 80) : a.name,
      sync_offset_frames:
        opts.sync_offset_frames !== undefined && opts.sync_offset_frames !== null
          ? Math.max(-100000, Math.min(100000, Math.round(Number(opts.sync_offset_frames))))
          : a.sync_offset_frames,
      timecode_start: typeof opts.timecode_start === "string" ? opts.timecode_start : a.timecode_start,
      audio_follow: typeof opts.audio_follow === "boolean" ? opts.audio_follow : a.audio_follow,
      audio_peak_frame:
        opts.audio_peak_frame !== undefined && opts.audio_peak_frame !== null
          ? Math.max(0, Math.round(Number(opts.audio_peak_frame)))
          : a.audio_peak_frame
    };
  });
  if (!found) {
    throw new Error(`Angle ${angleIndex} does not exist in Multi-Cam Bank`);
  }
  const updatedBank = { ...bank, angles: nextAngles };
  trk.clips[cIdx] = { ...target, multicam_bank: updatedBank };
  return {
    changed: true,
    op: "update_angle",
    multicam_id: updatedBank.id,
    track_kind: tkKind,
    track_index: tkIdx,
    clip_index: cIdx,
    angle_count: updatedBank.angles.length,
    cut_count: updatedBank.cuts.length,
    active_angle: angleIndex,
    detail: `Updated Angle ${angleIndex} in '${updatedBank.name}'`,
    doc: nextDoc
  };
}

export function flattenMulticamClipInDocument(doc, tkKind, tkIdx, cIdx) {
  const nextDoc = cloneTimelineDoc(doc);
  const trk = (nextDoc.tracks || []).find((t) => t.kind === tkKind && t.index === tkIdx);
  const target = trk && trk.clips ? trk.clips[cIdx] : null;
  if (!target || !target.multicam_bank) {
    throw new Error("Selected clip is not a Multi-Cam Sync Bank");
  }
  const bank = target.multicam_bank;
  const segments = computeMulticamSegmentsClient(bank);
  const angleMap = new Map((bank.angles || []).map((a) => [a.angle_index, a]));
  const flatClips = segments.map((seg) => {
    const angle = angleMap.get(seg.angle_index) || bank.angles[0];
    return {
      ...target,
      name: angle.name,
      start_frame: target.start_frame + seg.start_frame,
      duration_frames: seg.duration_frames,
      source_in_frame: seg.source_in_frame,
      source_path: angle.source_path || target.source_path,
      media_ref: angle.media_ref || target.media_ref,
      fade_in_s: seg.start_frame === 0 ? target.fade_in_s || 0 : 0,
      fade_out_s: seg.end_frame === bank.duration_frames ? target.fade_out_s || 0 : 0,
      multicam_bank: null
    };
  });
  trk.clips = [...trk.clips.slice(0, cIdx), ...flatClips, ...trk.clips.slice(cIdx + 1)];
  return {
    changed: true,
    op: "flatten_multicam",
    multicam_id: bank.id,
    track_kind: tkKind,
    track_index: tkIdx,
    clip_index: cIdx,
    angle_count: bank.angles.length,
    cut_count: flatClips.length,
    active_angle: segments[0]?.angle_index || 1,
    detail: `Flattened Multi-Cam '${bank.name}' into ${flatClips.length} timeline clip(s)`,
    doc: nextDoc
  };
}

export function compileMulticamFiltergraphClient(bank, opts = {}) {
  const mode = opts.mode === "quad_view" ? "quad_view" : "active_cuts";
  const fpsVal = bank && bank.fps ? Math.max(1e-6, bank.fps.num / Math.max(1, bank.fps.den)) : 25;
  const durationS = Number((bank.duration_frames / fpsVal).toFixed(4));
  const segments = computeMulticamSegmentsClient(bank);
  const angleToInput = new Map((bank.angles || []).map((a, idx) => [a.angle_index, idx]));

  if (mode === "quad_view") {
    const quadAngles = (bank.angles || []).slice(0, 4);
    const cellW = Math.max(320, Math.floor((bank.width || 1920) / 2));
    const cellH = Math.max(180, Math.floor((bank.height || 1080) / 2));
    const stages = [];
    const labels = [];
    quadAngles.forEach((angle, idx) => {
      const inIdx = angleToInput.get(angle.angle_index) ?? idx;
      const lbl = `[mc_q${idx}]`;
      const offF = Math.max(0, Number(angle.source_in_frame || 0) + Number(angle.sync_offset_frames || 0));
      const endF = offF + bank.duration_frames;
      stages.push(
        `[${inIdx}:v]trim=start_frame=${offF}:end_frame=${endF},setpts=PTS-STARTPTS,scale=${cellW}:${cellH}:force_original_aspect_ratio=decrease,pad=${cellW}:${cellH}:(ow-iw)/2:(oh-ih)/2:color=#101116${lbl}`
      );
      labels.push(lbl);
    });
    while (labels.length < 4) {
      const padLbl = `[mc_q${labels.length}]`;
      stages.push(`color=c=#101116:s=${cellW}x${cellH}:d=${durationS.toFixed(4)}${padLbl}`);
      labels.push(padLbl);
    }
    stages.push(`${labels.join("")}xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0[v_mc_quad]`);
    return {
      multicam_id: bank.id,
      name: bank.name,
      mode: "quad_view",
      duration_s: durationS,
      angle_count: bank.angles.length,
      segment_count: segments.length,
      segments,
      filter_complex: stages.join(";"),
      video_map_label: "[v_mc_quad]",
      audio_map_label: null,
      warnings: []
    };
  }

  const stages = [];
  const vLabels = [];
  const aLabels = [];
  const w = bank.width || 1920;
  const h = bank.height || 1080;
  segments.forEach((seg, idx) => {
    const inIdx = angleToInput.get(seg.angle_index) ?? 0;
    const vLbl = `[mc_v${idx}]`;
    const vEnd = seg.source_in_frame + seg.duration_frames;
    stages.push(
      `[${inIdx}:v]trim=start_frame=${seg.source_in_frame}:end_frame=${vEnd},setpts=PTS-STARTPTS,scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2${vLbl}`
    );
    vLabels.push(vLbl);
    const audioInIdx = seg.cut_mode === "audio_video" || seg.cut_mode === "audio_only"
      ? inIdx
      : angleToInput.get(bank.audio_follow_angle || 1) ?? 0;
    const t0 = (seg.source_in_frame / fpsVal).toFixed(4);
    const t1 = (vEnd / fpsVal).toFixed(4);
    const aLbl = `[mc_a${idx}]`;
    stages.push(`[${audioInIdx}:a]atrim=start=${t0}:end=${t1},asetpts=PTS-STARTPTS${aLbl}`);
    aLabels.push(aLbl);
  });
  if (vLabels.length === 1) {
    stages.push(`${vLabels[0]}copy[v_mc]`);
    stages.push(`${aLabels[0]}acopy[a_mc]`);
  } else {
    stages.push(`${vLabels.join("")}concat=n=${vLabels.length}:v=1:a=0[v_mc]`);
    stages.push(`${aLabels.join("")}concat=n=${aLabels.length}:v=0:a=1[a_mc]`);
  }
  return {
    multicam_id: bank.id,
    name: bank.name,
    mode: "active_cuts",
    duration_s: durationS,
    angle_count: bank.angles.length,
    segment_count: segments.length,
    segments,
    filter_complex: stages.join(";"),
    video_map_label: "[v_mc]",
    audio_map_label: "[a_mc]",
    warnings: []
  };
}

// ============================================================================
// Dynamic Trim Pro: A/V Link / Unlink, J/L-Cut Split-Edit & 4-Up Trim Monitor
// ============================================================================

export function normalizeClipLinkGroupId(raw) {
  if (raw === null || raw === undefined) return "";
  return String(raw).trim().slice(0, 64);
}

function _findLinkedPartnerInDoc(doc, sourceClip) {
  const gid = normalizeClipLinkGroupId(sourceClip && sourceClip.link_group_id);
  if (!gid || !doc || !Array.isArray(doc.tracks)) return null;
  let fallback = null;
  for (const trk of doc.tracks) {
    const clips = trk.clips || [];
    for (let idx = 0; idx < clips.length; idx++) {
      const cand = clips[idx];
      if (cand === sourceClip) continue;
      if (normalizeClipLinkGroupId(cand.link_group_id) !== gid) continue;
      if (cand.media_type !== sourceClip.media_type) {
        return { trk, clipIndex: idx, clip: cand };
      }
      if (!fallback) {
        fallback = { trk, clipIndex: idx, clip: cand };
      }
    }
  }
  return fallback;
}

export function findLinkedPartnerClip(doc, trackKind, trackIndex, clipIndex) {
  const found = findTrackAndClip(doc, trackKind, trackIndex, clipIndex);
  if (!found) return null;
  return _findLinkedPartnerInDoc(doc, found.clip);
}

export function computeAvSplitEditInfo(doc, trackKind, trackIndex, clipIndex) {
  const found = findTrackAndClip(doc, trackKind, trackIndex, clipIndex);
  if (!found) {
    return { linked: false, link_group_id: "", cut_type: "unlinked", in_offset_frames: 0, out_offset_frames: 0 };
  }
  const { trk, clip } = found;
  const gid = normalizeClipLinkGroupId(clip.link_group_id);
  const partner = _findLinkedPartnerInDoc(doc, clip);
  if (!gid || !partner) {
    return { linked: false, link_group_id: gid, cut_type: "unlinked", in_offset_frames: 0, out_offset_frames: 0 };
  }

  let vTrk, vIdx, vClip, aTrk, aIdx, aClip;
  if (trk.kind === "video" && partner.trk.kind === "audio") {
    vTrk = trk;
    vIdx = clipIndex;
    vClip = clip;
    aTrk = partner.trk;
    aIdx = partner.clipIndex;
    aClip = partner.clip;
  } else if (trk.kind === "audio" && partner.trk.kind === "video") {
    vTrk = partner.trk;
    vIdx = partner.clipIndex;
    vClip = partner.clip;
    aTrk = trk;
    aIdx = clipIndex;
    aClip = clip;
  } else {
    return { linked: true, link_group_id: gid, cut_type: "aligned", in_offset_frames: 0, out_offset_frames: 0 };
  }

  const inOff = (aClip.start_frame || 0) - (vClip.start_frame || 0);
  const outOff =
    (aClip.start_frame + (aClip.duration_frames || 0)) -
    (vClip.start_frame + (vClip.duration_frames || 0));
  let cutType = "aligned";
  if (inOff !== 0 && outOff !== 0) cutType = "jl_cut";
  else if (inOff !== 0) cutType = "j_cut";
  else if (outOff !== 0) cutType = "l_cut";

  return {
    linked: true,
    link_group_id: gid,
    cut_type: cutType,
    in_offset_frames: inOff,
    out_offset_frames: outOff,
    video_track_index: vTrk.index,
    video_clip_index: vIdx,
    video_name: vClip.name,
    audio_track_index: aTrk.index,
    audio_clip_index: aIdx,
    audio_name: aClip.name
  };
}

export function compileSplitEditFiltergraphClient(doc, trackKind, trackIndex, clipIndex) {
  const info = computeAvSplitEditInfo(doc, trackKind, trackIndex, clipIndex);
  if (
    !info.linked ||
    info.video_track_index == null ||
    info.video_clip_index == null ||
    info.audio_track_index == null ||
    info.audio_clip_index == null
  ) {
    return {
      linked: false,
      link_group_id: "",
      cut_type: "unlinked",
      in_offset_frames: 0,
      out_offset_frames: 0,
      video_filter: "",
      audio_filter: "",
      filter_complex: "",
      is_identity: true
    };
  }
  const vFound = findTrackAndClip(doc, "video", info.video_track_index, info.video_clip_index);
  const aFound = findTrackAndClip(doc, "audio", info.audio_track_index, info.audio_clip_index);
  if (!vFound || !aFound) {
    return {
      linked: false,
      link_group_id: "",
      cut_type: "unlinked",
      in_offset_frames: 0,
      out_offset_frames: 0,
      video_filter: "",
      audio_filter: "",
      filter_complex: "",
      is_identity: true
    };
  }
  const vClip = vFound.clip;
  const aClip = aFound.clip;
  const fps = doc && doc.fps ? Math.max(1.0, doc.fps.num / Math.max(1, doc.fps.den)) : 25.0;

  const vSrcIn = Math.max(0, vClip.source_in_frame || 0);
  const vSrcEnd = vSrcIn + Math.max(1, vClip.duration_frames || 1);
  const aSrcInS = Math.max(0, aClip.source_in_frame || 0) / fps;
  const aSrcEndS = (Math.max(0, aClip.source_in_frame || 0) + Math.max(1, aClip.duration_frames || 1)) / fps;

  const vParts = [`trim=start_frame=${vSrcIn}:end_frame=${vSrcEnd}`, "setpts=PTS-STARTPTS"];
  const aParts = [`atrim=start=${aSrcInS.toFixed(3)}:end=${aSrcEndS.toFixed(3)}`, "asetpts=PTS-STARTPTS"];

  const inOff = info.in_offset_frames;
  const outOff = info.out_offset_frames;
  if (inOff < 0) {
    const preLapS = Math.abs(inOff) / fps;
    vParts.push(`tpad=start_duration=${preLapS.toFixed(3)}:start_mode=clone`);
  } else if (inOff > 0) {
    const delayMs = Math.round((inOff / fps) * 1000);
    aParts.push(`adelay=${delayMs}|${delayMs}`);
  }
  if (outOff > 0) {
    const postLapS = outOff / fps;
    vParts.push(`tpad=stop_duration=${postLapS.toFixed(3)}:stop_mode=clone`);
  } else if (outOff < 0) {
    const padS = Math.abs(outOff) / fps;
    aParts.push(`apad=pad_dur=${padS.toFixed(3)}`);
  }

  const vFilter = `[0:v]${vParts.join(",")}[v_split]`;
  const aFilter = `[1:a]${aParts.join(",")}[a_split]`;
  return {
    linked: true,
    link_group_id: info.link_group_id,
    cut_type: info.cut_type,
    in_offset_frames: inOff,
    out_offset_frames: outOff,
    video_filter: vFilter,
    audio_filter: aFilter,
    filter_complex: `${vFilter};${aFilter}`,
    is_identity: inOff === 0 && outOff === 0
  };
}

function _nextAvLinkGroupIdClient(doc) {
  const used = new Set();
  for (const trk of doc.tracks || []) {
    for (const c of trk.clips || []) {
      const gid = normalizeClipLinkGroupId(c.link_group_id);
      if (gid) used.add(gid);
    }
  }
  let idx = 1;
  while (true) {
    const cand = `av-${String(idx).padStart(2, "0")}`;
    if (!used.has(cand)) return cand;
    idx += 1;
  }
}

export function linkAvClipsInDocument(doc, trackKind, trackIndex, clipIndex, opts = {}) {
  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, trackKind, trackIndex, clipIndex);
  if (!found) {
    return { doc, clip: null, changed: false, detail: "Target clip not found." };
  }
  const { trk, clip } = found;
  const existingGid = normalizeClipLinkGroupId(clip.link_group_id);
  if (existingGid && _findLinkedPartnerInDoc(nextDoc, clip)) {
    return { doc, clip, changed: false, detail: `Clip already linked (${existingGid}).` };
  }

  let partnerClip = null;
  if (
    opts &&
    opts.partner_track_kind &&
    opts.partner_track_index != null &&
    opts.partner_clip_index != null
  ) {
    const pFound = findTrackAndClip(
      nextDoc,
      opts.partner_track_kind,
      opts.partner_track_index,
      opts.partner_clip_index
    );
    if (pFound && pFound.clip !== clip) {
      partnerClip = pFound.clip;
    }
  } else {
    const wantKind = trk.kind === "video" ? "audio" : "video";
    const cStart = clip.start_frame || 0;
    const cEnd = cStart + (clip.duration_frames || 0);
    let bestScore = null;
    for (const candTrk of nextDoc.tracks || []) {
      if (candTrk.kind !== wantKind) continue;
      const candClips = candTrk.clips || [];
      for (let idx = 0; idx < candClips.length; idx++) {
        const cand = candClips[idx];
        if (cand === clip || normalizeClipLinkGroupId(cand.link_group_id)) continue;
        const ov = Math.min(cEnd, cand.start_frame + (cand.duration_frames || 0)) - Math.max(cStart, cand.start_frame);
        const dist = Math.abs(cand.start_frame - cStart);
        const score = [-Math.max(0, ov), dist, candTrk.index, idx];
        if (
          !bestScore ||
          score[0] < bestScore[0] ||
          (score[0] === bestScore[0] &&
            (score[1] < bestScore[1] ||
              (score[1] === bestScore[1] &&
                (score[2] < bestScore[2] || (score[2] === bestScore[2] && score[3] < bestScore[3])))))
        ) {
          bestScore = score;
          partnerClip = cand;
        }
      }
    }
  }

  if (!partnerClip) {
    return { doc, clip, changed: false, detail: "No unlinked opposite-media clip found to link." };
  }

  const gid = _nextAvLinkGroupIdClient(nextDoc);
  clip.link_group_id = gid;
  partnerClip.link_group_id = gid;
  return {
    doc: nextDoc,
    clip,
    changed: true,
    detail: `Linked ${clip.name} + ${partnerClip.name} (${gid})`
  };
}

export function unlinkAvClipsInDocument(doc, trackKind, trackIndex, clipIndex) {
  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, trackKind, trackIndex, clipIndex);
  if (!found) {
    return { doc, clip: null, changed: false, detail: "Target clip not found." };
  }
  const { clip } = found;
  const gid = normalizeClipLinkGroupId(clip.link_group_id);
  if (!gid) {
    return { doc, clip, changed: false, detail: "Clip is already unlinked." };
  }
  clip.link_group_id = "";
  const remaining = [];
  for (const t of nextDoc.tracks || []) {
    for (const c of t.clips || []) {
      if (normalizeClipLinkGroupId(c.link_group_id) === gid) remaining.push(c);
    }
  }
  if (remaining.length <= 1) {
    for (const rem of remaining) rem.link_group_id = "";
  }
  return {
    doc: nextDoc,
    clip,
    changed: true,
    detail: `Unlinked ${clip.name} (${gid})`
  };
}

export function applySplitEditJlInDocument(doc, trackKind, trackIndex, clipIndex, opts = {}) {
  const delta = Math.round(Number(opts.delta_frames ?? opts.deltaFrames) || 0);
  if (delta === 0) {
    return { doc, clip: null, changed: false, deltaApplied: 0, detail: "Zero split-edit delta." };
  }
  const edge = opts.edge === "right" ? "right" : "left";
  const targetKind = opts.target_kind === "video" || opts.targetKind === "video" ? "video" : "audio";
  const nextDoc = cloneTimelineDoc(doc);
  const info = computeAvSplitEditInfo(nextDoc, trackKind, trackIndex, clipIndex);
  if (
    !info.linked ||
    info.video_track_index == null ||
    info.video_clip_index == null ||
    info.audio_track_index == null ||
    info.audio_clip_index == null
  ) {
    return {
      doc,
      clip: null,
      changed: false,
      deltaApplied: 0,
      detail: "Select an A/V linked clip pair for J/L-Cut split edit."
    };
  }
  const tIdx = targetKind === "audio" ? info.audio_track_index : info.video_track_index;
  const cIdx = targetKind === "audio" ? info.audio_clip_index : info.video_clip_index;
  const found = findTrackAndClip(nextDoc, targetKind, tIdx, cIdx);
  if (!found) {
    return { doc, clip: null, changed: false, deltaApplied: 0, detail: "Split-edit target clip not found." };
  }
  const { trk, clip: target } = found;
  const prevClip = cIdx > 0 ? trk.clips[cIdx - 1] : null;
  const nextClip = cIdx + 1 < trk.clips.length ? trk.clips[cIdx + 1] : null;
  const origEnd = target.start_frame + target.duration_frames;
  let effDelta = 0;

  if (edge === "left") {
    let minDelta = (nextDoc.start_frame || 0) - target.start_frame;
    if (prevClip) {
      minDelta = Math.max(minDelta, prevClip.start_frame + prevClip.duration_frames - target.start_frame);
    }
    minDelta = _minTlDeltaForSourceIn(target.source_in_frame || 0, target.source_fps, nextDoc.fps, minDelta);
    const maxDelta = target.duration_frames - 1;
    effDelta = Math.max(minDelta, Math.min(maxDelta, delta));
    if (effDelta === 0) {
      return {
        doc,
        clip: null,
        changed: false,
        deltaApplied: 0,
        detail: "Split-edit In edge clamped at neighbor or source start."
      };
    }
    const srcDelta = computeSourceFrameDelta(effDelta, target.source_fps, nextDoc.fps);
    target.start_frame += effDelta;
    target.duration_frames -= effDelta;
    target.source_in_frame = Math.max(0, (target.source_in_frame || 0) + srcDelta);
  } else {
    const minDelta = 1 - target.duration_frames;
    const maxDelta = nextClip ? nextClip.start_frame - origEnd : Math.max(0, delta);
    effDelta = Math.max(minDelta, Math.min(maxDelta, delta));
    if (effDelta === 0) {
      return {
        doc,
        clip: null,
        changed: false,
        deltaApplied: 0,
        detail: "Split-edit Out edge clamped at neighbor or min duration."
      };
    }
    target.duration_frames += effDelta;
  }

  const selFound = findTrackAndClip(nextDoc, trackKind, trackIndex, clipIndex);
  const updatedInfo = computeAvSplitEditInfo(nextDoc, trackKind, trackIndex, clipIndex);
  const tag =
    updatedInfo.in_offset_frames !== 0 && updatedInfo.out_offset_frames === 0
      ? `J-Cut ${updatedInfo.in_offset_frames > 0 ? `+${updatedInfo.in_offset_frames}` : updatedInfo.in_offset_frames}f`
      : updatedInfo.out_offset_frames !== 0 && updatedInfo.in_offset_frames === 0
        ? `L-Cut ${updatedInfo.out_offset_frames > 0 ? `+${updatedInfo.out_offset_frames}` : updatedInfo.out_offset_frames}f`
        : `Split J:${updatedInfo.in_offset_frames}f L:${updatedInfo.out_offset_frames}f`;

  return {
    doc: nextDoc,
    clip: selFound ? selFound.clip : target,
    changed: true,
    deltaApplied: effDelta,
    detail: `${tag} (${targetKind.toUpperCase()} ${edge} ${effDelta > 0 ? `+${effDelta}` : effDelta}f)`
  };
}

export function alignAvSplitInDocument(doc, trackKind, trackIndex, clipIndex) {
  const nextDoc = cloneTimelineDoc(doc);
  const info = computeAvSplitEditInfo(nextDoc, trackKind, trackIndex, clipIndex);
  if (
    !info.linked ||
    info.video_track_index == null ||
    info.video_clip_index == null ||
    info.audio_track_index == null ||
    info.audio_clip_index == null
  ) {
    return { doc, clip: null, changed: false, detail: "Clip is not A/V linked." };
  }
  if (info.in_offset_frames === 0 && info.out_offset_frames === 0) {
    return { doc, clip: null, changed: false, detail: "A/V pair is already aligned." };
  }
  const vFound = findTrackAndClip(nextDoc, "video", info.video_track_index, info.video_clip_index);
  const aFound = findTrackAndClip(nextDoc, "audio", info.audio_track_index, info.audio_clip_index);
  if (!vFound || !aFound) {
    return { doc, clip: null, changed: false, detail: "Linked clips not found." };
  }
  const vClip = vFound.clip;
  const aTrk = aFound.trk;
  const aClip = aFound.clip;
  const aIdx = info.audio_clip_index;
  const prevA = aIdx > 0 ? aTrk.clips[aIdx - 1] : null;
  const nextA = aIdx + 1 < aTrk.clips.length ? aTrk.clips[aIdx + 1] : null;

  let targetStart = vClip.start_frame;
  let targetEnd = vClip.start_frame + vClip.duration_frames;
  if (prevA) targetStart = Math.max(targetStart, prevA.start_frame + prevA.duration_frames);
  targetStart = Math.max(nextDoc.start_frame || 0, targetStart);
  if (nextA) targetEnd = Math.min(targetEnd, nextA.start_frame);
  if (targetEnd <= targetStart) {
    return { doc, clip: null, changed: false, detail: "Cannot align A/V pair without overlapping adjacent audio clip." };
  }
  const startShift = targetStart - aClip.start_frame;
  const srcShift = computeSourceFrameDelta(startShift, aClip.source_fps, nextDoc.fps);
  aClip.source_in_frame = Math.max(0, (aClip.source_in_frame || 0) + srcShift);
  aClip.start_frame = targetStart;
  aClip.duration_frames = targetEnd - targetStart;

  const selFound = findTrackAndClip(nextDoc, trackKind, trackIndex, clipIndex);
  return {
    doc: nextDoc,
    clip: selFound ? selFound.clip : vClip,
    changed: true,
    detail: `Aligned ${aClip.name} to ${vClip.name} (${aClip.start_frame}f..${targetEnd}f)`
  };
}

export function buildFourUpTrimMonitorState(doc, mode, target, deltaFrames = 0) {
  if (!doc || !target) return null;
  const trkKind = target.trackKind === "audio" ? "audio" : "video";
  const trkIdx = Number(target.trackIndex || 1);
  const cIdx = Number(target.clipIndex ?? target.leftClipIndex ?? 0);
  const found = findTrackAndClip(doc, trkKind, trkIdx, cIdx);
  if (!found) return null;
  const { trk, clip } = found;
  const prevClip = cIdx > 0 ? trk.clips[cIdx - 1] : null;
  const nextClip = cIdx + 1 < trk.clips.length ? trk.clips[cIdx + 1] : null;
  const splitInfo = computeAvSplitEditInfo(doc, trkKind, trkIdx, cIdx);
  const edge = target.edge === "left" ? "left" : "right";
  const normMode = normalizeTimelineTool(mode === "ripple_trim" ? "trim" : mode);
  const isTwoUp = normMode === "trim" || normMode === "roll";

  const makeTile = (role, tileClip, tlFrame, accent) => {
    if (!tileClip) {
      return { role, clip: null, track: `${trkKind === "audio" ? "A" : "V"}${trkIdx}`, frame: 0, sourceFrame: 0, accent };
    }
    const localF = Math.max(0, Math.min(Math.max(0, tileClip.duration_frames - 1), tlFrame - tileClip.start_frame));
    return {
      role,
      clip: tileClip,
      track: `${trkKind === "audio" ? "A" : "V"}${trkIdx}`,
      frame: tlFrame,
      sourceFrame: (tileClip.source_in_frame || 0) + localF,
      accent
    };
  };

  let tiles;
  if (normMode === "roll") {
    const leftC = target.leftClipIndex != null ? trk.clips[target.leftClipIndex] : clip;
    const rightC =
      target.rightClipIndex != null
        ? trk.clips[target.rightClipIndex]
        : nextClip || (edge === "left" ? clip : null);
    const leftOutF = leftC ? leftC.start_frame + Math.max(0, leftC.duration_frames - 1) : 0;
    const rightInF = rightC ? rightC.start_frame : 0;
    tiles = [
      makeTile("OUTGOING", leftC, leftOutF, "#39c5cf"),
      makeTile("INCOMING", rightC, rightInF, "#f59e0b")
    ];
  } else if (normMode === "trim") {
    if (edge === "left") {
      const prevOutF = prevClip ? prevClip.start_frame + Math.max(0, prevClip.duration_frames - 1) : 0;
      tiles = [
        makeTile("PREV OUT", prevClip, prevOutF, "#8e8e98"),
        makeTile("CLIP IN", clip, clip.start_frame, "#f59e0b")
      ];
    } else {
      const clipOutF = clip.start_frame + Math.max(0, clip.duration_frames - 1);
      tiles = [
        makeTile("CLIP OUT", clip, clipOutF, "#f59e0b"),
        makeTile("NEXT IN", nextClip, nextClip ? nextClip.start_frame : 0, "#8e8e98")
      ];
    }
  } else {
    const prevOutF = prevClip ? prevClip.start_frame + Math.max(0, prevClip.duration_frames - 1) : 0;
    const clipOutF = clip.start_frame + Math.max(0, clip.duration_frames - 1);
    tiles = [
      makeTile("PREV OUT", prevClip, prevOutF, "#8e8e98"),
      makeTile("CLIP IN", clip, clip.start_frame, "#ffd166"),
      makeTile("CLIP OUT", clip, clipOutF, "#5eead4"),
      makeTile("NEXT IN", nextClip, nextClip ? nextClip.start_frame : 0, "#8e8e98")
    ];
  }

  return {
    layout: isTwoUp ? "2up" : "4up",
    mode: normMode,
    edge,
    deltaFrames: Math.round(Number(deltaFrames) || 0),
    clipName: clip.name,
    splitInfo,
    tiles
  };
}

export const ALLOWED_THREE_POINT_MODES = ["insert", "overwrite", "replace"];

export function resolveThreePointRange(opts = {}) {
  const total = Math.max(1, Math.round(Number(opts.sourceTotalFrames ?? opts.source_total_frames) || 75));
  const baseIn = Math.max(0, Math.round(Number(opts.sourceBaseIn ?? opts.source_base_in) || 0));
  const docStart = Number.isFinite(Number(opts.docStart ?? opts.doc_start))
    ? Math.round(Number(opts.docStart ?? opts.doc_start))
    : 0;
  const srcPh = Math.max(
    0,
    Math.min(total - 1, Math.round(Number(opts.sourcePlayhead ?? opts.source_playhead) || 0))
  );
  const tlPh = Math.max(docStart, Math.round(Number(opts.tlPlayhead ?? opts.tl_playhead) || docStart));

  const rawSIn = opts.sourceIn ?? opts.source_in;
  const rawSOut = opts.sourceOut ?? opts.source_out;
  const sIn = rawSIn != null && Number.isFinite(Number(rawSIn))
    ? Math.max(0, Math.min(total - 1, Math.round(Number(rawSIn))))
    : null;
  const sOut = rawSOut != null && Number.isFinite(Number(rawSOut))
    ? Math.max(1, Math.min(total, Math.round(Number(rawSOut))))
    : null;
  if (sIn !== null && sOut !== null && sOut <= sIn) {
    throw new Error(`source_out (${sOut}) must be greater than source_in (${sIn})`);
  }

  const rawPIn = opts.tlIn ?? opts.tl_in;
  const rawPOut = opts.tlOut ?? opts.tl_out;
  const pIn = rawPIn != null && Number.isFinite(Number(rawPIn))
    ? Math.max(docStart, Math.round(Number(rawPIn)))
    : null;
  const pOut = rawPOut != null && Number.isFinite(Number(rawPOut))
    ? Math.max(docStart + 1, Math.round(Number(rawPOut)))
    : null;
  if (pIn !== null && pOut !== null && pOut <= pIn) {
    throw new Error(`tl_out (${pOut}) must be greater than tl_in (${pIn})`);
  }

  const hasSrcIo = sIn !== null && sOut !== null;
  const hasTlIo = pIn !== null && pOut !== null;

  let tlStart;
  let dur;
  let effSrcIn;
  let rule;
  let detail;

  if (hasSrcIo && hasTlIo) {
    dur = Math.max(1, sOut - sIn);
    effSrcIn = baseIn + sIn;
    tlStart = pIn;
    rule = "all_four_src_io";
    detail = `4-PT (Src I/O ${dur}f -> TL In ${tlStart}f)`;
  } else if (hasSrcIo && pOut !== null && pIn === null) {
    dur = Math.max(1, sOut - sIn);
    tlStart = Math.max(docStart, pOut - dur);
    effSrcIn = baseIn + sIn;
    rule = "backtime_src_io_tl_out";
    detail = `3-PT Backtime (Src I/O ${dur}f -> TL Out ${pOut}f)`;
  } else if (hasSrcIo) {
    dur = Math.max(1, sOut - sIn);
    tlStart = pIn !== null ? pIn : tlPh;
    effSrcIn = baseIn + sIn;
    rule = "src_io_tl_in";
    detail = `3-PT (Src I/O ${dur}f -> TL ${tlStart}f)`;
  } else if (hasTlIo && sOut !== null && sIn === null) {
    const tlDur = Math.max(1, pOut - pIn);
    dur = Math.min(tlDur, Math.max(1, sOut));
    tlStart = pIn;
    effSrcIn = Math.max(0, baseIn + sOut - dur);
    rule = "backtime_src_out_tl_io";
    detail = `3-PT Backtime (Src Out ${sOut}f -> TL I/O ${dur}f)`;
  } else if (hasTlIo) {
    const anchorIn = sIn !== null ? sIn : srcPh;
    const available = Math.max(1, total - anchorIn);
    dur = Math.min(Math.max(1, pOut - pIn), available);
    tlStart = pIn;
    effSrcIn = baseIn + anchorIn;
    rule = "src_in_tl_io";
    detail = `3-PT (Src In ${anchorIn}f -> TL I/O ${dur}f)`;
  } else {
    const anchorIn = sIn !== null ? sIn : 0;
    const anchorOut = sOut !== null ? sOut : total;
    dur = Math.max(1, anchorOut - anchorIn);
    tlStart = pIn !== null ? pIn : tlPh;
    effSrcIn = baseIn + anchorIn;
    rule = "playhead_default";
    detail = `Playhead (${dur}f @ TL ${tlStart}f)`;
  }

  return {
    tl_start: tlStart,
    tl_end: tlStart + dur,
    duration_frames: dur,
    effective_source_in: effSrcIn,
    rule,
    detail
  };
}

export function threePointEditInDocument(doc, opts = {}) {
  const mode = String(opts.mode || "insert").trim().toLowerCase();
  if (!ALLOWED_THREE_POINT_MODES.includes(mode)) {
    throw new Error(`Unsupported three-point edit mode: ${mode}`);
  }
  const sourceClipOrEntry = opts.sourceClip || opts.source_clip;
  if (!doc || !Array.isArray(doc.tracks) || !sourceClipOrEntry) {
    return {
      doc,
      changed: false,
      op: mode,
      resolution: resolveThreePointRange({ sourceTotalFrames: 75 }),
      insertedClip: null,
      shiftedCount: 0,
      overwrittenCount: 0,
      detail: "Missing timeline or source clip"
    };
  }
  const resolvedSrc = _resolveBinSourceClip(doc, sourceClipOrEntry);
  if (!resolvedSrc) {
    return {
      doc,
      changed: false,
      op: mode,
      resolution: resolveThreePointRange({ sourceTotalFrames: 75 }),
      insertedClip: null,
      shiftedCount: 0,
      overwrittenCount: 0,
      detail: "Invalid source clip"
    };
  }

  const targetKind =
    opts.targetTrackKind === "audio" || opts.target_track_kind === "audio" ? "audio" : "video";
  const targetIndex = Math.max(
    1,
    Math.round(Number(opts.targetTrackIndex ?? opts.target_track_index) || 1)
  );
  const docStart = Number.isFinite(Number(doc.start_frame)) ? Math.round(Number(doc.start_frame)) : 0;
  const totalSrc = Math.max(
    1,
    Math.round(
      Number(opts.sourceTotalFrames ?? opts.source_total_frames ?? resolvedSrc.clip.duration_frames) || 75
    )
  );
  const srcPlayhead = Math.max(
    0,
    Math.min(totalSrc - 1, Math.round(Number(opts.sourcePlayhead ?? opts.source_playhead) || 0))
  );
  const tlPlayhead = Math.max(
    docStart,
    Math.round(Number(opts.tlPlayhead ?? opts.tl_playhead) || docStart)
  );
  const rawSIn = opts.sourceIn ?? opts.source_in;
  const rawSOut = opts.sourceOut ?? opts.source_out;
  const rawPIn = opts.tlIn ?? opts.tl_in;
  const rawPOut = opts.tlOut ?? opts.tl_out;

  const resolution = resolveThreePointRange({
    sourceTotalFrames: totalSrc,
    sourceBaseIn: Math.max(0, Number(resolvedSrc.clip.source_in_frame) || 0),
    sourcePlayhead: srcPlayhead,
    sourceIn: rawSIn,
    sourceOut: rawSOut,
    tlPlayhead,
    tlIn: rawPIn,
    tlOut: rawPOut,
    docStart
  });

  const nextDoc = cloneTimelineDoc(doc);
  const targetTrk = nextDoc.tracks.find(
    (t) => t && t.kind === targetKind && Number(t.index) === targetIndex
  );
  if (!targetTrk) {
    return {
      doc,
      changed: false,
      op: mode,
      resolution,
      insertedClip: null,
      shiftedCount: 0,
      overwrittenCount: 0,
      detail: `Target track ${targetKind.toUpperCase()}${targetIndex} not found`
    };
  }
  if (!Array.isArray(targetTrk.clips)) targetTrk.clips = [];
  const fpsRate = nextDoc.fps ? Math.max(1, nextDoc.fps.num / Math.max(1, nextDoc.fps.den)) : 25;

  if (mode === "replace") {
    let refPh = tlPlayhead;
    let targetIdx = targetTrk.clips.findIndex(
      (c) => c && refPh >= c.start_frame && refPh < c.start_frame + c.duration_frames
    );
    if (targetIdx < 0 && rawPIn != null && Number.isFinite(Number(rawPIn))) {
      refPh = Math.max(docStart, Math.round(Number(rawPIn)));
      targetIdx = targetTrk.clips.findIndex(
        (c) => c && refPh >= c.start_frame && refPh < c.start_frame + c.duration_frames
      );
    }
    if (targetIdx < 0) {
      return {
        doc,
        changed: false,
        op: "replace",
        resolution,
        insertedClip: null,
        shiftedCount: 0,
        overwrittenCount: 0,
        detail: `No clip under playhead on ${targetKind.toUpperCase()}${targetIndex} to replace`
      };
    }

    const orig = targetTrk.clips[targetIdx];
    const playheadOffset = Math.max(0, refPh - orig.start_frame);
    const baseSrc = Math.max(0, Math.round(Number(resolvedSrc.clip.source_in_frame) || 0));
    const newSrcIn =
      rawSIn != null && Number.isFinite(Number(rawSIn))
        ? Math.max(0, baseSrc + Math.round(Number(rawSIn)))
        : Math.max(0, baseSrc + srcPlayhead - playheadOffset);

    const replaced = _buildInsertedClipClone(
      nextDoc,
      resolvedSrc.clip,
      targetKind,
      targetIndex,
      orig.start_frame
    );
    replaced.id = orig.id || replaced.id;
    replaced.duration_frames = orig.duration_frames;
    replaced.source_in_frame = newSrcIn;
    replaced.transition_out = orig.transition_out || null;
    replaced.link_group_id = orig.link_group_id || "";
    targetTrk.clips[targetIdx] = replaced;

    const repRes = {
      ...resolution,
      tl_start: orig.start_frame,
      tl_end: orig.start_frame + orig.duration_frames,
      duration_frames: orig.duration_frames,
      effective_source_in: newSrcIn,
      rule: "replace_sync",
      detail: `Replace ${orig.name} (${orig.duration_frames}f @ ${orig.start_frame}f)`
    };
    return {
      doc: nextDoc,
      changed: true,
      op: "replace",
      resolution: repRes,
      insertedClip: replaced,
      shiftedCount: 0,
      overwrittenCount: 1,
      detail: `Replaced ${orig.name} with ${replaced.name} (${replaced.duration_frames}f @ ${replaced.start_frame}f)`
    };
  }

  const newClip = _buildInsertedClipClone(
    nextDoc,
    resolvedSrc.clip,
    targetKind,
    targetIndex,
    resolution.tl_start
  );
  newClip.duration_frames = resolution.duration_frames;
  newClip.source_in_frame = resolution.effective_source_in;
  newClip.link_group_id = "";

  if (mode === "insert") {
    const tlStart = resolution.tl_start;
    const dur = resolution.duration_frames;
    const updatedClips = [];
    const splitRights = new Set();
    for (const c of targetTrk.clips) {
      if (!c) continue;
      const cStart = Math.round(Number(c.start_frame) || 0);
      const cEnd = cStart + Math.max(0, Math.round(Number(c.duration_frames) || 0));
      if (tlStart > cStart && tlStart < cEnd) {
        const { leftClip, rightClip } = _buildSplitClipPair(c, tlStart, nextDoc.fps, fpsRate);
        leftClip.link_group_id = "";
        rightClip.link_group_id = "";
        rightClip.start_frame = tlStart + dur;
        splitRights.add(rightClip);
        updatedClips.push(leftClip, rightClip);
      } else {
        updatedClips.push(c);
      }
    }
    targetTrk.clips = updatedClips;

    let shifted = splitRights.size;
    for (const trk of nextDoc.tracks) {
      if (!trk) continue;
      if (trk !== targetTrk && !(targetTrk.sync_locked && trk.sync_locked)) continue;
      if (trk !== targetTrk && trk.sync_locked) {
        const splitOther = [];
        for (const c of trk.clips || []) {
          if (!c) continue;
          const cStart = Math.round(Number(c.start_frame) || 0);
          const cEnd = cStart + Math.max(0, Math.round(Number(c.duration_frames) || 0));
          if (tlStart > cStart && tlStart < cEnd) {
            const { leftClip, rightClip } = _buildSplitClipPair(c, tlStart, nextDoc.fps, fpsRate);
            leftClip.link_group_id = "";
            rightClip.link_group_id = "";
            splitOther.push(leftClip, rightClip);
          } else {
            splitOther.push(c);
          }
        }
        trk.clips = splitOther;
      }
      for (const c of trk.clips || []) {
        if (!c || splitRights.has(c)) continue;
        if (c.start_frame >= tlStart) {
          c.start_frame += dur;
          shifted += 1;
        }
      }
      trk.clips.sort((a, b) => a.start_frame - b.start_frame || a.duration_frames - b.duration_frames);
    }

    targetTrk.clips.push(newClip);
    targetTrk.clips.sort((a, b) => a.start_frame - b.start_frame || a.duration_frames - b.duration_frames);
    return {
      doc: nextDoc,
      changed: true,
      op: "insert",
      resolution,
      insertedClip: newClip,
      shiftedCount: shifted,
      overwrittenCount: 0,
      detail: `Inserted ${newClip.name} (${dur}f) on ${targetKind.toUpperCase()}${targetIndex} @ ${tlStart}f (shifted ${shifted} clip(s))`
    };
  }

  // mode === "overwrite"
  const tlStart = resolution.tl_start;
  const tlEnd = resolution.tl_end;
  const keptClips = [];
  let overwritten = 0;
  for (const c of targetTrk.clips) {
    if (!c) continue;
    const cStart = Math.round(Number(c.start_frame) || 0);
    const cEnd = cStart + Math.max(0, Math.round(Number(c.duration_frames) || 0));
    if (cEnd <= tlStart || cStart >= tlEnd) {
      keptClips.push(c);
      continue;
    }
    overwritten += 1;
    if (cStart < tlStart && cEnd > tlEnd) {
      const { leftClip } = _buildSplitClipPair(c, tlStart, nextDoc.fps, fpsRate);
      const { rightClip } = _buildSplitClipPair(c, tlEnd, nextDoc.fps, fpsRate);
      leftClip.link_group_id = "";
      rightClip.link_group_id = "";
      keptClips.push(leftClip, rightClip);
    } else if (cStart < tlStart && cEnd > tlStart) {
      const { leftClip } = _buildSplitClipPair(c, tlStart, nextDoc.fps, fpsRate);
      leftClip.link_group_id = "";
      keptClips.push(leftClip);
    } else if (cStart < tlEnd && cEnd > tlEnd) {
      const { rightClip } = _buildSplitClipPair(c, tlEnd, nextDoc.fps, fpsRate);
      rightClip.link_group_id = "";
      keptClips.push(rightClip);
    }
  }
  keptClips.push(newClip);
  keptClips.sort((a, b) => a.start_frame - b.start_frame || a.duration_frames - b.duration_frames);
  targetTrk.clips = keptClips;
  return {
    doc: nextDoc,
    changed: true,
    op: "overwrite",
    resolution,
    insertedClip: newClip,
    shiftedCount: 0,
    overwrittenCount: overwritten,
    detail: `Overwrote ${targetKind.toUpperCase()}${targetIndex} [${tlStart}f..${tlEnd}f) with ${newClip.name} (${overwritten} clip(s) affected)`
  };
}

export function findAdjacentMarkerIndex(doc, playheadFrame, direction = 1) {
  const markers = doc && Array.isArray(doc.markers) ? doc.markers : [];
  if (markers.length === 0) return -1;
  const ph = Math.round(Number(playheadFrame) || 0);
  const indexed = markers
    .map((m, idx) => ({ idx, frame: Math.round(Number(m && m.frame) || 0) }))
    .sort((a, b) => a.frame - b.frame || a.idx - b.idx);
  if (direction >= 0) {
    const next = indexed.find((m) => m.frame > ph);
    return next ? next.idx : indexed[0].idx;
  }
  for (let i = indexed.length - 1; i >= 0; i--) {
    if (indexed[i].frame < ph) return indexed[i].idx;
  }
  return indexed[indexed.length - 1].idx;
}

// ---------------------------------------------------------------------------
// Studio 3D .cube LUT Library & ColorChecker Shot-Match Auto-Balance (Client Parity)
// ---------------------------------------------------------------------------

export const STUDIO_LUT_CATEGORIES_CLIENT = [
  "film_print",
  "camera_log",
  "creative_cinema",
  "monochrome"
];

export const STUDIO_LUT_METADATA_CLIENT = [
  {
    id: "kodak_2383_d65",
    title: "Kodak 2383 Print D65",
    category: "film_print",
    description: "Classic cinema print film contrast with rich blacks and warm highlight roll-off."
  },
  {
    id: "fuji_3513_print",
    title: "Fujifilm 3513D Print",
    category: "film_print",
    description: "Crisp emerald foliage, cool shadow separation, and balanced skin rendition."
  },
  {
    id: "rec709_slog3_conv",
    title: "Sony S-Log3 -> Rec.709",
    category: "camera_log",
    description: "Log-to-Rec.709 technical S-curve expansion with gamut saturation recovery."
  },
  {
    id: "rec709_logc_conv",
    title: "ARRI LogC3 -> Rec.709",
    category: "camera_log",
    description: "Smooth photographic highlight roll-off and neutral Rec.709 tonal mapping."
  },
  {
    id: "teal_orange_cinema",
    title: "Blockbuster Teal & Orange",
    category: "creative_cinema",
    description: "Split-toned cyan-teal shadows paired with warm amber skin and highlights."
  },
  {
    id: "bleach_bypass",
    title: "Silver Bleach Bypass",
    category: "creative_cinema",
    description: "High-contrast silver-retained look with sculpted midtones and muted chroma."
  },
  {
    id: "golden_hour_warm",
    title: "Golden Hour Amber",
    category: "creative_cinema",
    description: "Lifted warm midtones, sunset highlight glow, and gentle shadow softness."
  },
  {
    id: "silver_gelatin_bw",
    title: "Ilford Silver B&W",
    category: "monochrome",
    description: "Red-filtered panchromatic black-and-white curve with deep silver contrast."
  }
];

const _STUDIO_LUT_SWATCH_PROBES = [
  [0.18, 0.24, 0.34],
  [0.76, 0.58, 0.48],
  [0.38, 0.54, 0.72],
  [0.34, 0.48, 0.26],
  [0.84, 0.50, 0.18],
  [0.90, 0.90, 0.88]
];

function _rgbUnitToHex(r, g, b) {
  const toHex = (v) =>
    Math.max(0, Math.min(255, Math.round(clampUnitColor(v) * 255)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function _scurveClient(x, strength) {
  const xc = clampUnitColor(x);
  const sc = xc * xc * (3.0 - 2.0 * xc);
  return clampUnitColor(xc + (sc - xc) * strength);
}

export function evaluateStudioLutRgbClient(presetId, r, g, b) {
  const ri = clampUnitColor(r);
  const gi = clampUnitColor(g);
  const bi = clampUnitColor(b);
  const luma = 0.2126 * ri + 0.7152 * gi + 0.0722 * bi;

  if (presetId === "kodak_2383_d65") {
    const rc = _scurveClient(ri, 0.52) * 1.02;
    const gc = _scurveClient(gi, 0.50) * 0.99;
    const bc = _scurveClient(bi, 0.54) * 0.95;
    const warmHi = Math.max(0.0, luma - 0.5) * 0.10;
    const coolSh = Math.max(0.0, 0.38 - luma) * 0.08;
    return [
      clampUnitColor(rc + warmHi - coolSh * 0.4),
      clampUnitColor(gc + warmHi * 0.3),
      clampUnitColor(bc - warmHi * 0.6 + coolSh)
    ];
  }
  if (presetId === "fuji_3513_print") {
    const rc = _scurveClient(ri, 0.42) * 0.97;
    const gc = _scurveClient(gi, 0.46) * 1.03;
    const bc = _scurveClient(bi, 0.44) * 1.01;
    const shTeal = Math.max(0.0, 0.42 - luma) * 0.10;
    return [
      clampUnitColor(rc - shTeal * 0.6 + 0.015),
      clampUnitColor(gc + shTeal * 0.35),
      clampUnitColor(bc + shTeal * 0.55)
    ];
  }
  if (presetId === "rec709_slog3_conv") {
    const expandLog = (v) => _scurveClient((v - 0.42) * 1.62 + 0.48, 0.48);
    const rl = expandLog(ri);
    const gl = expandLog(gi);
    const bl = expandLog(bi);
    const lm = 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
    return [
      clampUnitColor(lm + (rl - lm) * 1.28),
      clampUnitColor(lm + (gl - lm) * 1.28),
      clampUnitColor(lm + (bl - lm) * 1.28)
    ];
  }
  if (presetId === "rec709_logc_conv") {
    const expandLogc = (v) => {
      const c = _scurveClient((v - 0.39) * 1.54 + 0.47, 0.38);
      return clampUnitColor(c > 0.78 ? 0.78 + (c - 0.78) * 0.72 : c);
    };
    const rl = expandLogc(ri);
    const gl = expandLogc(gi);
    const bl = expandLogc(bi);
    const lm = 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
    return [
      clampUnitColor(lm + (rl - lm) * 1.22),
      clampUnitColor(lm + (gl - lm) * 1.22),
      clampUnitColor(lm + (bl - lm) * 1.22)
    ];
  }
  if (presetId === "teal_orange_cinema") {
    const sh = Math.max(0.0, 0.48 - luma) / 0.48;
    const hi = Math.max(0.0, luma - 0.42) / 0.58;
    return [
      clampUnitColor(_scurveClient(ri, 0.35) - 0.11 * sh + 0.12 * hi),
      clampUnitColor(_scurveClient(gi, 0.35) + 0.04 * sh + 0.02 * hi),
      clampUnitColor(_scurveClient(bi, 0.35) + 0.14 * sh - 0.13 * hi)
    ];
  }
  if (presetId === "bleach_bypass") {
    const sl = _scurveClient(luma, 0.75);
    return [
      clampUnitColor(_scurveClient(ri, 0.60) * 0.46 + sl * 0.54),
      clampUnitColor(_scurveClient(gi, 0.60) * 0.46 + sl * 0.54),
      clampUnitColor(_scurveClient(bi, 0.60) * 0.46 + sl * 0.54)
    ];
  }
  if (presetId === "golden_hour_warm") {
    return [
      clampUnitColor(_scurveClient(ri * 1.06 + 0.03, 0.25)),
      clampUnitColor(_scurveClient(gi * 1.00 + 0.015, 0.25)),
      clampUnitColor(_scurveClient(bi * 0.86 + 0.01, 0.25))
    ];
  }
  if (presetId === "silver_gelatin_bw") {
    const mono = _scurveClient(0.36 * ri + 0.52 * gi + 0.12 * bi, 0.62);
    return [mono, mono, mono];
  }
  throw new Error(`Unknown studio LUT preset '${presetId}'`);
}

export function listStudioLutPresetsClient() {
  return STUDIO_LUT_METADATA_CLIENT.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    description: item.description,
    default_size: 17,
    swatches: _STUDIO_LUT_SWATCH_PROBES.map(([pr, pg, pb]) => {
      const [ro, go, bo] = evaluateStudioLutRgbClient(item.id, pr, pg, pb);
      return _rgbUnitToHex(ro, go, bo);
    })
  }));
}

export function generateStudioLutPresetClient(presetId, size = 17) {
  const meta = STUDIO_LUT_METADATA_CLIENT.find((item) => item.id === presetId);
  if (!meta) {
    throw new Error(`Unknown studio LUT preset '${presetId}'`);
  }
  const nSize = Math.max(2, Math.min(65, Math.round(Number(size) || 17)));
  const denom = nSize - 1;
  const table = [];
  for (let bIdx = 0; bIdx < nSize; bIdx++) {
    const bIn = bIdx / denom;
    for (let gIdx = 0; gIdx < nSize; gIdx++) {
      const gIn = gIdx / denom;
      for (let rIdx = 0; rIdx < nSize; rIdx++) {
        table.push(evaluateStudioLutRgbClient(presetId, rIdx / denom, gIn, bIn));
      }
    }
  }
  return {
    preset_id: presetId,
    info: {
      path: `${presetId}.cube`,
      title: meta.title,
      dimension: "3D",
      size: nSize,
      domain_min: [0.0, 0.0, 0.0],
      domain_max: [1.0, 1.0, 1.0],
      entry_count: table.length
    },
    lut: {
      title: meta.title,
      dimension: "3D",
      size: nSize,
      domain_min: [0.0, 0.0, 0.0],
      domain_max: [1.0, 1.0, 1.0],
      entry_count: table.length,
      table
    }
  };
}

export const COLORCHECKER_24_PATCHES_CLIENT = [
  ["Dark Skin", [0.451, 0.322, 0.267]],
  ["Light Skin", [0.761, 0.588, 0.510]],
  ["Blue Sky", [0.384, 0.478, 0.616]],
  ["Foliage", [0.341, 0.424, 0.263]],
  ["Blue Flower", [0.522, 0.502, 0.694]],
  ["Bluish Green", [0.404, 0.741, 0.667]],
  ["Orange", [0.839, 0.494, 0.173]],
  ["Purplish Blue", [0.314, 0.357, 0.651]],
  ["Moderate Red", [0.757, 0.353, 0.388]],
  ["Purple", [0.369, 0.235, 0.424]],
  ["Yellow Green", [0.616, 0.737, 0.251]],
  ["Orange Yellow", [0.878, 0.639, 0.180]],
  ["Blue", [0.220, 0.239, 0.588]],
  ["Green", [0.275, 0.580, 0.286]],
  ["Red", [0.686, 0.212, 0.235]],
  ["Yellow", [0.906, 0.780, 0.122]],
  ["Magenta", [0.733, 0.337, 0.584]],
  ["Cyan", [0.031, 0.522, 0.631]],
  ["White", [0.953, 0.953, 0.949]],
  ["Neutral 8", [0.784, 0.784, 0.784]],
  ["Neutral 6.5", [0.627, 0.627, 0.627]],
  ["Neutral 5", [0.478, 0.478, 0.478]],
  ["Neutral 3.5", [0.333, 0.333, 0.337]],
  ["Black", [0.204, 0.204, 0.208]]
];

const _SMPTE_MATCH_PATCHES_CLIENT = [
  ["75% Gray", [0.75, 0.75, 0.75]],
  ["Yellow Bar", [0.75, 0.75, 0.05]],
  ["Cyan Bar", [0.05, 0.75, 0.75]],
  ["Green Bar", [0.05, 0.75, 0.05]],
  ["Magenta Bar", [0.75, 0.05, 0.75]],
  ["Red Bar", [0.75, 0.05, 0.05]],
  ["Blue Bar", [0.05, 0.05, 0.75]],
  ["Light Skin", [0.761, 0.588, 0.510]],
  ["Dark Skin", [0.451, 0.322, 0.267]],
  ["Sky Blue", [0.384, 0.478, 0.616]],
  ["Foliage", [0.341, 0.424, 0.263]],
  ["White 95%", [0.95, 0.95, 0.95]],
  ["Mid Gray 50%", [0.50, 0.50, 0.50]],
  ["Black 10%", [0.10, 0.10, 0.10]]
];

function _srgbToLinearClient(c) {
  const cc = clampUnitColor(c);
  return cc <= 0.04045 ? cc / 12.92 : Math.pow((cc + 0.055) / 1.055, 2.4);
}

export function rgbToLabClient(r, g, b) {
  const rl = _srgbToLinearClient(r);
  const gl = _srgbToLinearClient(g);
  const bl = _srgbToLinearClient(b);
  const x = (0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl) / 0.95047;
  const y = 0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl;
  const z = (0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16.0 / 116.0);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return [116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz)];
}

export function deltaE76Client(rgbA, rgbB) {
  const [la, aa, ba] = rgbToLabClient(rgbA[0], rgbA[1], rgbA[2]);
  const [lb, ab, bb] = rgbToLabClient(rgbB[0], rgbB[1], rgbB[2]);
  return Math.hypot(la - lb, aa - ab, ba - bb);
}

export function computeRgbMomentsClient(samples) {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error("At least one RGB sample is required");
  }
  const n = samples.length;
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let sl = 0;
  const lumas = [];
  for (const s of samples) {
    const r = clampUnitColor(s[0]);
    const g = clampUnitColor(s[1]);
    const b = clampUnitColor(s[2]);
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sr += r;
    sg += g;
    sb += b;
    sl += l;
    lumas.push(l);
  }
  const mr = sr / n;
  const mg = sg / n;
  const mb = sb / n;
  const ml = sl / n;
  let vr = 0;
  let vg = 0;
  let vb = 0;
  let vl = 0;
  for (let i = 0; i < n; i++) {
    const r = clampUnitColor(samples[i][0]);
    const g = clampUnitColor(samples[i][1]);
    const b = clampUnitColor(samples[i][2]);
    vr += (r - mr) ** 2;
    vg += (g - mg) ** 2;
    vb += (b - mb) ** 2;
    vl += (lumas[i] - ml) ** 2;
  }
  const round4 = (v) => Number(v.toFixed(4));
  return {
    mean_rgb: [round4(mr), round4(mg), round4(mb)],
    std_rgb: [round4(Math.sqrt(vr / n)), round4(Math.sqrt(vg / n)), round4(Math.sqrt(vb / n))],
    luma_mean: round4(ml),
    luma_std: round4(Math.sqrt(vl / n))
  };
}

function _applySourceSimClient(rgb, sourceProfile) {
  const [r, g, b] = rgb;
  if (sourceProfile === "current_chart") return [r, g, b];
  if (sourceProfile === "sony_slog3") {
    return [clampUnitColor(0.24 + r * 0.46), clampUnitColor(0.25 + g * 0.47), clampUnitColor(0.24 + b * 0.45)];
  }
  if (sourceProfile === "arri_logc3") {
    return [clampUnitColor(0.21 + r * 0.52), clampUnitColor(0.22 + g * 0.52), clampUnitColor(0.21 + b * 0.51)];
  }
  if (sourceProfile === "canon_clog2") {
    return [clampUnitColor(0.22 + r * 0.50 + 0.015), clampUnitColor(0.21 + g * 0.49), clampUnitColor(0.20 + b * 0.48)];
  }
  if (sourceProfile === "underexposed_cool") {
    return [clampUnitColor(r * 0.72 - 0.03), clampUnitColor(g * 0.78), clampUnitColor(b * 0.90 + 0.05)];
  }
  return [clampUnitColor(r * 0.98 + 0.08), clampUnitColor(g * 0.90 + 0.02), clampUnitColor(b * 0.72 - 0.04)];
}

function _applyTargetProfileClient(rgb, targetProfile) {
  const [r, g, b] = rgb;
  if (targetProfile === "rec709_d65" || targetProfile === "custom_reference") return [r, g, b];
  if (targetProfile === "teal_orange_ref") {
    return applyColorGradeRgbPure(r, g, b, {
      lift: [-0.08, 0.0, 0.14],
      gamma: [0.05, 0.01, -0.04],
      gain: [0.16, 0.04, -0.14],
      contrast: 1.15,
      saturation: 1.2,
      temperature: 0.1
    });
  }
  if (targetProfile === "film_warm_ref") {
    return applyColorGradeRgbPure(r, g, b, {
      lift: [0.02, 0.0, -0.03],
      gamma: [0.06, 0.02, -0.05],
      gain: [0.1, 0.03, -0.08],
      contrast: 1.08,
      saturation: 1.1,
      temperature: 0.25
    });
  }
  return evaluateStudioLutRgbClient("kodak_2383_d65", r, g, b);
}

export function solveShotMatchClient(payload = {}) {
  const chartProfile = String(payload.chart_profile || "xrite_classic_24");
  const sourceProfile = String(payload.source_profile || "current_chart");
  const targetProfile = String(payload.target_profile || "rec709_d65");
  const rawStrength = payload.strength !== undefined ? Number(payload.strength) : 1.0;
  const blend = Math.max(0.0, Math.min(1.0, Number.isFinite(rawStrength) ? rawStrength : 1.0));

  let basePatches = COLORCHECKER_24_PATCHES_CLIENT;
  if (chartProfile === "rec709_smpte") {
    basePatches = _SMPTE_MATCH_PATCHES_CLIENT;
  } else if (chartProfile === "datacolor_spyder_24") {
    basePatches = COLORCHECKER_24_PATCHES_CLIENT.map(([name, rgb]) => [
      name,
      [clampUnitColor(rgb[0] * 0.99 + 0.005), clampUnitColor(rgb[1]), clampUnitColor(rgb[2] * 0.99 + 0.004)]
    ]);
  }
  const patchNames = basePatches.map((p) => p[0]);

  const srcList =
    Array.isArray(payload.source_samples) && payload.source_samples.length > 0
      ? payload.source_samples.map((s) => [clampUnitColor(s[0]), clampUnitColor(s[1]), clampUnitColor(s[2])])
      : basePatches.map((p) => _applySourceSimClient(p[1], sourceProfile));

  const tgtList =
    Array.isArray(payload.target_samples) && payload.target_samples.length > 0
      ? payload.target_samples.map((s) => [clampUnitColor(s[0]), clampUnitColor(s[1]), clampUnitColor(s[2])])
      : basePatches.map((p) => _applyTargetProfileClient(p[1], targetProfile));

  const pairCount = Math.min(srcList.length, tgtList.length);
  const srcAligned = srcList.slice(0, pairCount);
  const tgtAligned = tgtList.slice(0, pairCount);
  const namesAligned = Array.from({ length: pairCount }, (_, i) => patchNames[i] || `Zone ${i + 1}`);

  const srcMoments = computeRgbMomentsClient(srcAligned);
  const tgtMoments = computeRgbMomentsClient(tgtAligned);

  const clampBound = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const contrastEst = clampBound(tgtMoments.luma_std / Math.max(0.03, srcMoments.luma_std), 0.45, 1.85);
  const meanChroma = (samples) =>
    samples.reduce((acc, s) => acc + (Math.max(s[0], s[1], s[2]) - Math.min(s[0], s[1], s[2])), 0) /
    samples.length;
  const satEst = clampBound(
    (meanChroma(tgtAligned) / Math.max(0.03, meanChroma(srcAligned))) /
      Math.max(0.55, contrastEst * 0.88),
    0.25,
    2.0
  );
  const srcRb = srcMoments.mean_rgb[0] - srcMoments.mean_rgb[2];
  const tgtRb = tgtMoments.mean_rgb[0] - tgtMoments.mean_rgb[2];
  const tempEst = clampBound((tgtRb - srcRb) * 1.15, -0.75, 0.75);

  const lift = [0, 0, 0];
  const gamma = [0, 0, 0];
  const gain = [0, 0, 0];
  const order = Array.from({ length: pairCount }, (_, i) => i).sort((a, b) => {
    const la = 0.2126 * srcAligned[a][0] + 0.7152 * srcAligned[a][1] + 0.0722 * srcAligned[a][2];
    const lb = 0.2126 * srcAligned[b][0] + 0.7152 * srcAligned[b][1] + 0.0722 * srcAligned[b][2];
    return la - lb;
  });
  const band = Math.max(1, Math.floor(pairCount / 3));
  const shIdx = order.slice(0, band);
  const hiIdx = order.slice(-band);
  const midIdx = pairCount >= 3 ? order.slice(band, pairCount - band) : order;

  for (let pass = 0; pass < 4; pass++) {
    const probe = {
      lift: [...lift],
      gamma: [...gamma],
      gain: [...gain],
      contrast: contrastEst,
      saturation: satEst,
      temperature: tempEst
    };
    const curOut = srcAligned.map((s) => applyColorGradeRgbPure(s[0], s[1], s[2], probe));
    for (let ch = 0; ch < 3; ch++) {
      const shErr = shIdx.reduce((a, i) => a + (tgtAligned[i][ch] - curOut[i][ch]), 0) / shIdx.length;
      const midErr = midIdx.reduce((a, i) => a + (tgtAligned[i][ch] - curOut[i][ch]), 0) / midIdx.length;
      const hiErr = hiIdx.reduce((a, i) => a + (tgtAligned[i][ch] - curOut[i][ch]), 0) / hiIdx.length;
      lift[ch] = clampBound(lift[ch] + shErr * 0.85, -0.75, 0.75);
      gamma[ch] = clampBound(gamma[ch] + midErr * 0.90, -0.75, 0.75);
      gain[ch] = clampBound(gain[ch] + hiErr * 0.90, -0.75, 0.75);
    }
  }

  const r4 = (v) => Number(v.toFixed(4));
  const finalGrade = {
    lift: [r4(lift[0] * blend), r4(lift[1] * blend), r4(lift[2] * blend)],
    gamma: [r4(gamma[0] * blend), r4(gamma[1] * blend), r4(gamma[2] * blend)],
    gain: [r4(gain[0] * blend), r4(gain[1] * blend), r4(gain[2] * blend)],
    contrast: r4(1.0 + (contrastEst - 1.0) * blend),
    saturation: r4(1.0 + (satEst - 1.0) * blend),
    temperature: r4(tempEst * blend),
    preserve_lightness: false
  };

  const matchedList = [];
  const patches = [];
  let deBeforeSum = 0;
  let deAfterSum = 0;
  for (let i = 0; i < pairCount; i++) {
    const sRgb = srcAligned[i];
    const tRgb = tgtAligned[i];
    const mRgb = applyColorGradeRgbPure(sRgb[0], sRgb[1], sRgb[2], finalGrade);
    matchedList.push(mRgb);
    const deB = deltaE76Client(sRgb, tRgb);
    const deA = deltaE76Client(mRgb, tRgb);
    deBeforeSum += deB;
    deAfterSum += deA;
    patches.push({
      name: namesAligned[i],
      source_rgb: sRgb.map(r4),
      target_rgb: tRgb.map(r4),
      matched_rgb: mRgb.map(r4),
      delta_e_before: Number(deB.toFixed(2)),
      delta_e_after: Number(deA.toFixed(2))
    });
  }
  const avgBefore = deBeforeSum / pairCount;
  const avgAfter = deAfterSum / pairCount;
  const improvement = avgBefore > 1e-4 ? ((avgBefore - avgAfter) / avgBefore) * 100.0 : 0.0;

  const tempR = finalGrade.temperature * 0.25;
  const tempG = finalGrade.temperature * 0.03;
  const tempB = -finalGrade.temperature * 0.28;
  const clampB = (v) => Math.max(-1, Math.min(1, v));
  const sC = finalGrade.lift.map(clampB);
  const mC = [
    clampB(finalGrade.gamma[0] + tempR),
    clampB(finalGrade.gamma[1] + tempG),
    clampB(finalGrade.gamma[2] + tempB)
  ];
  const hC = [
    clampB(finalGrade.gain[0] + tempR * 0.8),
    clampB(finalGrade.gain[1] + tempG * 0.8),
    clampB(finalGrade.gain[2] + tempB * 0.8)
  ];
  const ffmpegFilter =
    `colorbalance=rs=${sC[0].toFixed(4)}:gs=${sC[1].toFixed(4)}:bs=${sC[2].toFixed(4)}:` +
    `rm=${mC[0].toFixed(4)}:gm=${mC[1].toFixed(4)}:bm=${mC[2].toFixed(4)}:` +
    `rh=${hC[0].toFixed(4)}:gh=${hC[1].toFixed(4)}:bh=${hC[2].toFixed(4)}:pl=0,` +
    `eq=contrast=${finalGrade.contrast.toFixed(4)}:saturation=${finalGrade.saturation.toFixed(4)}`;

  return {
    grade: finalGrade,
    delta_e_before: Number(avgBefore.toFixed(2)),
    delta_e_after: Number(avgAfter.toFixed(2)),
    improvement_pct: Number(improvement.toFixed(1)),
    strength: r4(blend),
    chart_profile: chartProfile,
    source_profile: sourceProfile,
    target_profile: targetProfile,
    patch_count: pairCount,
    patches,
    source_moments: srcMoments,
    target_moments: tgtMoments,
    matched_moments: computeRgbMomentsClient(matchedList),
    ffmpeg_filter: ffmpegFilter
  };
}

// =========================================================================
// CYCLE #98: MOTION GRAPHICS STUDIO (TEXT+, BROADCAST BUGS & SPRING PHYSICS)
// =========================================================================

export const TITLE_ANIMATION_CURVES = [
  "none",
  "spring_overshoot",
  "ease_out_expo",
  "typewriter",
  "slide_wipe",
  "kinetic_bounce"
];

export const TITLE_PLATE_STYLES = ["solid_bar", "glass_pill", "outline_frame", "none"];

export const TITLE_MOTION_TEMPLATES = [
  {
    id: "lower_third_editorial",
    name: "Editorial Lower-Third",
    category: "lower_third",
    description: "Slide-wipe lower-third with damped rail and live role badge.",
    params: {
      preset_id: "broadcast_lower_third",
      motion_template: "lower_third_editorial",
      title: "ALEXANDRE MOREAU",
      subtitle: "Lead Colorist | Studio Paris",
      position: "bottom-left",
      custom_position_enabled: true,
      pos_x: 0.28,
      pos_y: 0.82,
      accent_color: "#e68442",
      start_s: 0.4,
      end_s: 5.4,
      font_size: 34,
      box_opacity: 0.84,
      animation_curve: "slide_wipe",
      anim_in_s: 0.45,
      anim_out_s: 0.30,
      spring_stiffness: 190.0,
      spring_damping: 15.0,
      tracking: 1,
      stroke_width: 0,
      stroke_color: "#090a0d",
      shadow_depth: 2,
      plate_style: "solid_bar",
      bug_badge: "STUDIO A",
      enabled: true
    }
  },
  {
    id: "kinetic_spring_pop",
    name: "Kinetic Spring Pop",
    category: "kinetic",
    description: "Spring-overshoot Text+ title with bold stroke and floating punch.",
    params: {
      preset_id: "center_title_card",
      motion_template: "kinetic_spring_pop",
      title: "NEXT CHAPTER",
      subtitle: "COLOR SCIENCE WORKFLOW",
      position: "center",
      custom_position_enabled: true,
      pos_x: 0.50,
      pos_y: 0.48,
      accent_color: "#ff9d42",
      start_s: 0.2,
      end_s: 4.5,
      font_size: 54,
      box_opacity: 0.0,
      animation_curve: "spring_overshoot",
      anim_in_s: 0.55,
      anim_out_s: 0.28,
      spring_stiffness: 240.0,
      spring_damping: 11.0,
      tracking: 4,
      stroke_width: 3,
      stroke_color: "#090a0d",
      shadow_depth: 4,
      plate_style: "none",
      bug_badge: "HDR",
      enabled: true
    }
  },
  {
    id: "typewriter_terminal",
    name: "Typewriter Callout",
    category: "typewriter",
    description: "Progressive character reveal with terminal cursor and crisp glass pill.",
    params: {
      preset_id: "broadcast_lower_third",
      motion_template: "typewriter_terminal",
      title: "SCENE 04 // EXTERIOR NIGHT",
      subtitle: "CAM A | 25FPS | 800 ASA",
      position: "bottom-left",
      custom_position_enabled: true,
      pos_x: 0.31,
      pos_y: 0.78,
      accent_color: "#38e08d",
      start_s: 0.3,
      end_s: 5.5,
      font_size: 30,
      box_opacity: 0.80,
      animation_curve: "typewriter",
      anim_in_s: 1.10,
      anim_out_s: 0.25,
      spring_stiffness: 180.0,
      spring_damping: 16.0,
      tracking: 2,
      stroke_width: 1,
      stroke_color: "#090a0d",
      shadow_depth: 2,
      plate_style: "glass_pill",
      bug_badge: "TC LOCK",
      enabled: true
    }
  },
  {
    id: "broadcast_corner_bug",
    name: "Broadcast Corner Bug",
    category: "bug",
    description: "Top-right network bug with live status tag and exponential ease-out.",
    params: {
      preset_id: "minimal_subtitle",
      motion_template: "broadcast_corner_bug",
      title: "TAKTCUT LIVE",
      subtitle: "4K REC.709 FEED",
      position: "bottom-center",
      custom_position_enabled: true,
      pos_x: 0.84,
      pos_y: 0.11,
      accent_color: "#ef5350",
      start_s: 0.0,
      end_s: 8.0,
      font_size: 22,
      box_opacity: 0.86,
      animation_curve: "ease_out_expo",
      anim_in_s: 0.35,
      anim_out_s: 0.25,
      spring_stiffness: 200.0,
      spring_damping: 18.0,
      tracking: 2,
      stroke_width: 0,
      stroke_color: "#090a0d",
      shadow_depth: 1,
      plate_style: "outline_frame",
      bug_badge: "LIVE",
      enabled: true
    }
  },
  {
    id: "chapter_slate_card",
    name: "Fusion Title Slate",
    category: "slate",
    description: "Cinematic wide-tracked opener with glass frame and exponential settle.",
    params: {
      preset_id: "center_title_card",
      motion_template: "chapter_slate_card",
      title: "ECLIPSE SHOWREEL 2026",
      subtitle: "MASTER GRADE | PARIS",
      position: "center",
      custom_position_enabled: true,
      pos_x: 0.50,
      pos_y: 0.50,
      accent_color: "#689cff",
      start_s: 0.2,
      end_s: 5.0,
      font_size: 46,
      box_opacity: 0.76,
      animation_curve: "ease_out_expo",
      anim_in_s: 0.50,
      anim_out_s: 0.35,
      spring_stiffness: 170.0,
      spring_damping: 16.0,
      tracking: 6,
      stroke_width: 1,
      stroke_color: "#090a0d",
      shadow_depth: 3,
      plate_style: "outline_frame",
      bug_badge: "MASTER",
      enabled: true
    }
  },
  {
    id: "breaking_ticker_bar",
    name: "News Chyron Bar",
    category: "chyron",
    description: "Full-width broadcast chyron with kinetic bounce headline and alert bug.",
    params: {
      preset_id: "minimal_subtitle",
      motion_template: "breaking_ticker_bar",
      title: "BROADCAST DELIVERY PIPELINE ACTIVE",
      subtitle: "EBU R128 -23.0 LUFS VERIFIED | FASTSTART OK",
      position: "bottom-center",
      custom_position_enabled: true,
      pos_x: 0.50,
      pos_y: 0.87,
      accent_color: "#ffd54f",
      start_s: 0.3,
      end_s: 6.5,
      font_size: 28,
      box_opacity: 0.88,
      animation_curve: "kinetic_bounce",
      anim_in_s: 0.50,
      anim_out_s: 0.30,
      spring_stiffness: 220.0,
      spring_damping: 12.0,
      tracking: 1,
      stroke_width: 1,
      stroke_color: "#090a0d",
      shadow_depth: 2,
      plate_style: "solid_bar",
      bug_badge: "FLASH",
      enabled: true
    }
  }
];

export function computeTitleOverlayAnchorBox(titleState) {
  const src = titleState || {};
  const tpl = typeof src.motion_template === "string" ? src.motion_template : "";
  const pos = src.position || "bottom-left";
  let boxW = 0.46;
  let boxH = 0.14;
  let align = "left";
  if (tpl === "broadcast_corner_bug") {
    boxW = 0.25;
    boxH = 0.11;
    align = "left";
  } else if (tpl === "breaking_ticker_bar") {
    boxW = 0.84;
    boxH = 0.12;
    align = "center";
  } else if (pos === "center") {
    boxW = 0.68;
    boxH = 0.28;
    align = "center";
  } else if (pos === "bottom-center") {
    boxW = 0.66;
    boxH = 0.12;
    align = "center";
  }

  let cx = 0.28;
  let cy = 0.83;
  if (src.custom_position_enabled) {
    cx = clampNum(Number.isFinite(Number(src.pos_x)) ? Number(src.pos_x) : 0.28, 0.04, 0.96);
    cy = clampNum(Number.isFinite(Number(src.pos_y)) ? Number(src.pos_y) : 0.83, 0.04, 0.96);
  } else if (pos === "center") {
    cx = 0.50;
    cy = 0.50;
  } else if (pos === "bottom-center") {
    cx = 0.50;
    cy = 0.865;
  }

  const boxX = clampNum(cx - boxW / 2, 0.02, 0.98 - boxW);
  const boxY = clampNum(cy - boxH / 2, 0.02, 0.98 - boxH);
  return { boxX, boxY, boxW, boxH, cx, cy, align };
}

function springOvershootClient(u, stiffness, damping) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const omega = Math.sqrt(Math.max(40, stiffness));
  const zeta = Math.min(0.95, Math.max(0.12, damping / (2 * omega)));
  const omegaD = omega * Math.sqrt(Math.max(0.01, 1 - zeta * zeta));
  const tPhys = u * 0.85;
  const env = Math.exp(-zeta * omega * tPhys);
  const dampTerm = zeta / Math.sqrt(Math.max(0.01, 1 - zeta * zeta));
  return 1 - env * (Math.cos(omegaD * tPhys) + dampTerm * Math.sin(omegaD * tPhys));
}

export function evaluateTitleMotionState(titleState, tSec = 0) {
  const src = titleState || {};
  const enabled = src.enabled !== false;
  const cleanTitle = typeof src.title === "string" ? src.title.replace(/[\r\n\t]+/g, " ").trim() : "";
  const cleanSub = typeof src.subtitle === "string" ? src.subtitle.replace(/[\r\n\t]+/g, " ").trim() : "";
  const startS = Number.isFinite(Number(src.start_s)) ? Math.max(0, Number(src.start_s)) : 0.5;
  const endS = Number.isFinite(Number(src.end_s)) ? Math.max(startS + 0.1, Number(src.end_s)) : startS + 5.0;
  const t = Number.isFinite(Number(tSec)) ? Number(tSec) : 0;

  if (!enabled || (!cleanTitle && !cleanSub) || t < startS || t > endS) {
    return {
      t_s: t,
      visible: false,
      phase: "outside",
      progress_in: 0,
      progress_out: 0,
      eased_in: 0,
      offset_x_norm: 0,
      offset_y_norm: 0,
      scale: 1,
      alpha: 0,
      reveal_chars_title: 0,
      reveal_chars_sub: 0,
      cursor_visible: false,
      wipe_ratio: 0
    };
  }

  const curve = TITLE_ANIMATION_CURVES.includes(src.animation_curve) ? src.animation_curve : "none";
  if (curve === "none") {
    return {
      t_s: t,
      visible: true,
      phase: "hold",
      progress_in: 1,
      progress_out: 1,
      eased_in: 1,
      offset_x_norm: 0,
      offset_y_norm: 0,
      scale: 1,
      alpha: 1,
      reveal_chars_title: cleanTitle.length,
      reveal_chars_sub: cleanSub.length,
      cursor_visible: false,
      wipe_ratio: 1
    };
  }

  const animIn = clampNum(Number(src.anim_in_s ?? 0.45), 0.05, 5.0);
  const animOut = clampNum(Number(src.anim_out_s ?? 0.30), 0.0, 5.0);
  const stiffness = clampNum(Number(src.spring_stiffness ?? 180.0), 40, 600);
  const damping = clampNum(Number(src.spring_damping ?? 14.0), 4, 40);

  const elapsed = Math.max(0, t - startS);
  const remaining = Math.max(0, endS - t);
  const progressIn = Math.min(1, elapsed / animIn);
  const progressOut = animOut > 0 ? Math.min(1, remaining / animOut) : 1;

  let phase = "hold";
  if (elapsed < animIn) phase = "in";
  else if (animOut > 0 && remaining < animOut) phase = "out";

  let easedIn = progressIn;
  let offsetX = 0;
  let offsetY = 0;
  let scale = 1;
  let wipeRatio = 1;
  let revealTitle = cleanTitle.length;
  let revealSub = cleanSub.length;
  let cursorVisible = false;

  if (curve === "spring_overshoot") {
    easedIn = springOvershootClient(progressIn, stiffness, damping);
    offsetX = -(1 - easedIn) * 0.075;
    scale = 0.88 + 0.12 * easedIn;
    wipeRatio = clampNum(easedIn, 0, 1.25);
  } else if (curve === "kinetic_bounce") {
    const omega = Math.sqrt(Math.max(40, stiffness));
    const decay = clampNum(damping * 0.42, 2.5, 9.0);
    const bounce = Math.abs(Math.cos(omega * 0.55 * progressIn)) * Math.exp(-decay * progressIn);
    easedIn = progressIn < 1 ? 1 - bounce : 1;
    offsetY = -bounce * 0.075;
    scale = 1 + bounce * 0.10;
    wipeRatio = Math.min(1, progressIn * 1.4);
  } else if (curve === "ease_out_expo") {
    easedIn = progressIn >= 1 ? 1 : 1 - Math.pow(2, -10 * progressIn);
    offsetY = (1 - easedIn) * 0.045;
    scale = 0.96 + 0.04 * easedIn;
    wipeRatio = easedIn;
  } else if (curve === "slide_wipe") {
    const inv = 1 - progressIn;
    easedIn = 1 - inv * inv * inv;
    offsetX = -(1 - easedIn) * 0.11;
    wipeRatio = easedIn;
  } else if (curve === "typewriter") {
    easedIn = progressIn;
    revealTitle = Math.min(cleanTitle.length, Math.max(0, Math.floor(progressIn * (cleanTitle.length + 0.99))));
    const subProg = clampNum((progressIn - 0.35) / 0.65, 0, 1);
    revealSub = Math.min(cleanSub.length, Math.max(0, Math.floor(subProg * (cleanSub.length + 0.99))));
    cursorVisible = progressIn < 1 || Math.floor(elapsed * 4) % 2 === 0;
    wipeRatio = Math.min(1, progressIn * 1.6);
  }

  const fadeIn = Math.min(1, elapsed / Math.min(0.16, animIn));
  const alpha = clampNum(fadeIn * progressOut, 0, 1);

  return {
    t_s: t,
    visible: true,
    phase,
    progress_in: Number(progressIn.toFixed(4)),
    progress_out: Number(progressOut.toFixed(4)),
    eased_in: Number(easedIn.toFixed(4)),
    offset_x_norm: Number(offsetX.toFixed(5)),
    offset_y_norm: Number(offsetY.toFixed(5)),
    scale: Number(scale.toFixed(4)),
    alpha: Number(alpha.toFixed(4)),
    reveal_chars_title: revealTitle,
    reveal_chars_sub: revealSub,
    cursor_visible: cursorVisible,
    wipe_ratio: Number(wipeRatio.toFixed(4))
  };
}

export function snapTitleAnchor(posX, posY, snapEnabled = true) {
  let x = clampNum(Number(posX) || 0.5, 0.04, 0.96);
  let y = clampNum(Number(posY) || 0.5, 0.04, 0.96);
  const snapGuides = { x: null, y: null };
  if (!snapEnabled) {
    return { pos_x: Number(x.toFixed(3)), pos_y: Number(y.toFixed(3)), snapGuides };
  }
  const threshold = 0.024;
  const xTargets = [0.50, 0.10, 0.90, 0.05, 0.95, 0.28, 0.84];
  const yTargets = [0.50, 0.10, 0.90, 0.05, 0.95, 0.82, 0.11];
  for (const tx of xTargets) {
    if (Math.abs(x - tx) <= threshold) {
      x = tx;
      snapGuides.x = tx;
      break;
    }
  }
  for (const ty of yTargets) {
    if (Math.abs(y - ty) <= threshold) {
      y = ty;
      snapGuides.y = ty;
      break;
    }
  }
  return { pos_x: Number(x.toFixed(3)), pos_y: Number(y.toFixed(3)), snapGuides };
}


export const PROXY_CODEC_SPECS_CLIENT = Object.freeze({
  prores_proxy: {
    codec_id: "prores_proxy",
    label: "Apple ProRes 422 Proxy",
    container_ext: ".mov",
    video_encoder: "prores_ks",
    video_args: ["-c:v", "prores_ks", "-profile:v", "0", "-vendor", "apl0", "-pix_fmt", "yuv422p10le"],
    audio_args: ["-c:a", "pcm_s16le"],
    estimated_size_ratio: 0.36
  },
  dnxhr_lb: {
    codec_id: "dnxhr_lb",
    label: "Avid DNxHR LB",
    container_ext: ".mov",
    video_encoder: "dnxhd",
    video_args: ["-c:v", "dnxhd", "-profile:v", "dnxhr_lb", "-pix_fmt", "yuv422p"],
    audio_args: ["-c:a", "pcm_s16le"],
    estimated_size_ratio: 0.32
  },
  h264_proxy: {
    codec_id: "h264_proxy",
    label: "H.264 Fast Proxy",
    container_ext: ".mp4",
    video_encoder: "libx264",
    video_args: ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart"],
    audio_args: ["-c:a", "aac", "-b:a", "128k"],
    estimated_size_ratio: 0.14
  }
});

export function normalizeProxyScaleClient(raw) {
  const cleaned = String(raw || "half").trim().toLowerCase();
  if (cleaned === "1/4" || cleaned === "quarter" || cleaned === "0.25") return "quarter";
  return "half";
}

export function normalizeProxyCodecClient(raw) {
  const cleaned = String(raw || "prores_proxy").trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(PROXY_CODEC_SPECS_CLIENT, cleaned)) return cleaned;
  return "prores_proxy";
}

export function sanitizeProxyDirClient(rawDir) {
  const text = String(rawDir || ".taktcut-proxies").trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!text) return ".taktcut-proxies";
  const parts = text.split("/").filter((p) => p && p !== ".");
  if (parts.some((p) => p === ".." || p.includes(":")) || parts.length === 0) {
    return ".taktcut-proxies";
  }
  return parts.join("/");
}

export function computeProxyDimensionsClient(width, height, scale) {
  const srcW = Math.max(16, Math.round(Number(width) || 1920));
  const srcH = Math.max(16, Math.round(Number(height) || 1080));
  const div = normalizeProxyScaleClient(scale) === "quarter" ? 4 : 2;
  const pw = Math.max(2, Math.floor(Math.floor(srcW / div) / 2) * 2);
  const ph = Math.max(2, Math.floor(Math.floor(srcH / div) / 2) * 2);
  return { width: pw, height: ph };
}

function safeMediaStemClient(rawPathOrName) {
  const base = String(rawPathOrName || "").split(/[\\/]/).pop() || "";
  const stem = base.replace(/\.[A-Za-z0-9]+$/, "");
  const clean = stem.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^[._-]+|[._-]+$/g, "");
  return clean || "clip";
}

export function compileProxyPlanClient(opts = {}) {
  const scale = normalizeProxyScaleClient(opts.scale);
  const codec = normalizeProxyCodecClient(opts.codec);
  const spec = PROXY_CODEC_SPECS_CLIENT[codec];
  const dir = sanitizeProxyDirClient(opts.proxy_dir);
  const clipName = String(opts.clip_name || "clip");
  const srcPath = String(opts.source_path || "").trim() || `media/${safeMediaStemClient(clipName)}.mov`;
  const stem = safeMediaStemClient(srcPath || clipName);
  const scaleTag = scale === "quarter" ? "qtr" : "half";
  const proxyPath = `${dir}/${stem}_${scaleTag}_${codec}${spec.container_ext}`;
  const dims = computeProxyDimensionsClient(opts.source_width || 1920, opts.source_height || 1080, scale);
  const vf =
    scale === "half"
      ? "scale=trunc(iw/4)*2:trunc(ih/4)*2:flags=bicubic"
      : "scale=trunc(iw/8)*2:trunc(ih/8)*2:flags=bicubic";
  const argv = ["ffmpeg", "-y", "-i", srcPath, "-vf", vf, ...spec.video_args, ...spec.audio_args, proxyPath];
  const areaRatio = scale === "half" ? 0.25 : 0.0625;
  const estRatio = Math.min(0.95, Math.max(0.03, spec.estimated_size_ratio * (0.45 + 0.55 * areaRatio)));
  const savingsPct = Math.max(10, Math.min(97, Math.round((1 - estRatio) * 100)));

  return {
    track_kind: opts.track_kind === "audio" ? "audio" : "video",
    track_index: Number.isInteger(opts.track_index) ? opts.track_index : 1,
    clip_index: Number.isInteger(opts.clip_index) ? opts.clip_index : 0,
    clip_name: clipName,
    source_path: srcPath,
    proxy_path: proxyPath,
    scale,
    codec,
    source_width: Math.max(16, Math.round(Number(opts.source_width) || 1920)),
    source_height: Math.max(16, Math.round(Number(opts.source_height) || 1080)),
    proxy_width: dims.width,
    proxy_height: dims.height,
    video_filter: vf,
    estimated_savings_pct: savingsPct,
    argv,
    command_preview: argv.join(" "),
    executed: false,
    status: "ready",
    detail: `${spec.label} (${dims.width}x${dims.height})`
  };
}

function isSyntheticGfxClipClient(clip, track) {
  if (!track || track.kind === "audio") return false;
  const src = String((clip && clip.source_path) || "").trim().toLowerCase();
  return src.startsWith("gfx/");
}

export function generateProxiesInDocument(doc, opts = {}) {
  if (!doc || !Array.isArray(doc.tracks)) {
    return { changed: false, generated_count: 0, plans: [], document: doc, detail: "No timeline loaded." };
  }
  const nextDoc = JSON.parse(JSON.stringify(doc));
  const scale = normalizeProxyScaleClient(opts.scale);
  const codec = normalizeProxyCodecClient(opts.codec);
  const scope = opts.scope === "selected" ? "selected" : "all_video";
  const tkKind = opts.track_kind === "audio" ? "audio" : "video";
  const tkIdx = Number.isInteger(opts.track_index) ? opts.track_index : 1;
  const cIdx = Number.isInteger(opts.clip_index) ? opts.clip_index : 0;
  const proxyDir = sanitizeProxyDirClient(opts.proxy_dir);

  const plans = [];
  let generatedCount = 0;

  for (const trk of nextDoc.tracks) {
    if (!trk || trk.kind !== "video" || !Array.isArray(trk.clips)) continue;
    for (let i = 0; i < trk.clips.length; i++) {
      const clip = trk.clips[i];
      if (!clip) continue;
      if (scope === "selected" && (tkKind !== "video" || Number(trk.index) !== tkIdx || i !== cIdx)) {
        continue;
      }
      if (scope !== "selected" && isSyntheticGfxClipClient(clip, trk)) {
        continue;
      }
      const plan = compileProxyPlanClient({
        track_kind: "video",
        track_index: Number(trk.index),
        clip_index: i,
        clip_name: clip.name,
        source_path: clip.source_path,
        scale,
        codec,
        source_width: nextDoc.width || 1920,
        source_height: nextDoc.height || 1080,
        proxy_dir: proxyDir
      });
      clip.proxy_path = plan.proxy_path;
      clip.proxy_scale = scale;
      clip.proxy_codec = codec;
      generatedCount += 1;
      plans.push(plan);
    }
  }

  return {
    changed: generatedCount > 0,
    generated_count: generatedCount,
    proxy_dir: proxyDir,
    scale,
    codec,
    plans,
    detail:
      generatedCount > 0
        ? `Generated ${generatedCount} proxy asset(s) (${scale}, ${PROXY_CODEC_SPECS_CLIENT[codec].label}).`
        : "No eligible video clips matched proxy generation scope.",
    document: nextDoc
  };
}

export function clearProxiesInDocument(doc, opts = {}) {
  if (!doc || !Array.isArray(doc.tracks)) {
    return { changed: false, cleared_count: 0, document: doc, detail: "No timeline loaded." };
  }
  const nextDoc = JSON.parse(JSON.stringify(doc));
  const scope = opts.scope === "selected" ? "selected" : "all_video";
  const tkKind = opts.track_kind === "audio" ? "audio" : "video";
  const tkIdx = Number.isInteger(opts.track_index) ? opts.track_index : 1;
  const cIdx = Number.isInteger(opts.clip_index) ? opts.clip_index : 0;
  let clearedCount = 0;

  for (const trk of nextDoc.tracks) {
    if (!trk || trk.kind !== "video" || !Array.isArray(trk.clips)) continue;
    for (let i = 0; i < trk.clips.length; i++) {
      const clip = trk.clips[i];
      if (!clip) continue;
      if (scope === "selected" && (tkKind !== "video" || Number(trk.index) !== tkIdx || i !== cIdx)) {
        continue;
      }
      if (clip.proxy_path || clip.proxy_scale || clip.proxy_codec) {
        clip.proxy_path = "";
        clip.proxy_scale = null;
        clip.proxy_codec = null;
        clearedCount += 1;
      }
    }
  }
  return {
    changed: clearedCount > 0,
    cleared_count: clearedCount,
    detail: `Cleared proxy metadata from ${clearedCount} clip(s).`,
    document: nextDoc
  };
}

function normPosixPathClient(raw) {
  return String(raw || "").trim().replace(/\\/g, "/").replace(/^\.\//, "");
}

function tokenizeStemClient(text) {
  const base = String(text || "").split(/[\\/]/).pop() || "";
  const stem = base.replace(/\.[A-Za-z0-9]+$/, "").toLowerCase();
  return new Set(stem.split(/[^a-z0-9]+/).filter((t) => t.length >= 2));
}

export function suggestRelinkCandidatesClient(sourcePath, clipName, workspaceFiles = [], limit = 5) {
  const targetPath = normPosixPathClient(sourcePath || clipName);
  const targetName = (targetPath.split("/").pop() || "").toLowerCase();
  const targetStem = targetName.replace(/\.[A-Za-z0-9]+$/, "") || safeMediaStemClient(clipName).toLowerCase();
  const targetTokens = tokenizeStemClient(targetPath || clipName);
  const seen = new Set();
  const scored = [];

  for (const raw of workspaceFiles) {
    const norm = normPosixPathClient(raw);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    const candName = (norm.split("/").pop() || "").toLowerCase();
    const candStem = candName.replace(/\.[A-Za-z0-9]+$/, "");
    const candTokens = tokenizeStemClient(norm);

    if (targetName && candName === targetName) {
      scored.push({ path: norm, confidence: 100, match_reason: "exact_filename" });
    } else if (targetStem && candStem === targetStem) {
      scored.push({ path: norm, confidence: 88, match_reason: "stem_match" });
    } else if (targetTokens.size > 0 && candTokens.size > 0) {
      let overlap = 0;
      for (const tok of targetTokens) {
        if (candTokens.has(tok)) overlap += 1;
      }
      const union = new Set([...targetTokens, ...candTokens]).size;
      if (overlap > 0 && union > 0) {
        const pct = Math.max(45, Math.min(82, Math.round(40 + 45 * (overlap / union))));
        scored.push({ path: norm, confidence: pct, match_reason: "token_match" });
      } else {
        scored.push({ path: norm, confidence: 20, match_reason: "workspace_media" });
      }
    } else {
      scored.push({ path: norm, confidence: 15, match_reason: "workspace_media" });
    }
  }

  scored.sort((a, b) => (b.confidence !== a.confidence ? b.confidence - a.confidence : a.path.localeCompare(b.path)));
  return scored.slice(0, Math.max(1, limit));
}

export function auditMediaPoolLinksClient(doc, opts = {}) {
  const wsFiles = Array.isArray(opts.workspace_files) ? opts.workspace_files.map(normPosixPathClient).filter(Boolean) : [];
  const strictCheck = Boolean(opts.strict_workspace_check);
  const mediaSet = new Set(wsFiles.map((p) => p.toLowerCase()));
  const entries = [];
  let onlineCount = 0;
  let proxyOnlyCount = 0;
  let offlineCount = 0;

  if (doc && Array.isArray(doc.tracks)) {
    for (const trk of doc.tracks) {
      if (!trk || !Array.isArray(trk.clips)) continue;
      for (let i = 0; i < trk.clips.length; i++) {
        const clip = trk.clips[i];
        if (!clip) continue;
        const srcNorm = normPosixPathClient(clip.source_path);
        const pxyNorm = normPosixPathClient(clip.proxy_path);
        let status = "online";
        if (clip.media_offline) {
          status = "offline";
        } else if (isSyntheticGfxClipClient(clip, trk)) {
          status = "online";
        } else if (strictCheck || (Array.isArray(opts.workspace_files) && opts.workspace_files.length > 0 && strictCheck)) {
          if (srcNorm && mediaSet.has(srcNorm.toLowerCase())) {
            status = "online";
          } else if (pxyNorm && mediaSet.has(pxyNorm.toLowerCase())) {
            status = "proxy_only";
          } else {
            status = "offline";
          }
        }

        if (status === "online") onlineCount += 1;
        else if (status === "proxy_only") proxyOnlyCount += 1;
        else offlineCount += 1;

        const cands =
          status === "online"
            ? []
            : suggestRelinkCandidatesClient(clip.source_path, clip.name, wsFiles);
        entries.push({
          track_kind: trk.kind === "audio" ? "audio" : "video",
          track_index: Number(trk.index) || 1,
          clip_index: i,
          clip_name: clip.name || "",
          source_path: clip.source_path || "",
          proxy_path: clip.proxy_path || "",
          status,
          candidates: cands
        });
      }
    }
  }

  return {
    total_clips: entries.length,
    online_count: onlineCount,
    proxy_only_count: proxyOnlyCount,
    offline_count: offlineCount,
    entries,
    workspace_media: wsFiles
  };
}

export function toggleClipOfflineInDocumentClient(doc, trackKind, trackIndex, clipIndex, offline = null) {
  if (!doc || !Array.isArray(doc.tracks)) {
    return { changed: false, document: doc, detail: "No timeline loaded." };
  }
  const nextDoc = JSON.parse(JSON.stringify(doc));
  const trk = nextDoc.tracks.find((t) => t && t.kind === trackKind && Number(t.index) === Number(trackIndex));
  const clip = trk && Array.isArray(trk.clips) ? trk.clips[clipIndex] : null;
  if (!clip) throw new Error(`Clip not found at ${trackKind}:${trackIndex}:${clipIndex}`);
  const target = offline === null ? !Boolean(clip.media_offline) : Boolean(offline);
  const changed = Boolean(clip.media_offline) !== target;
  clip.media_offline = target;
  return {
    changed,
    document: nextDoc,
    detail: `Marked '${clip.name}' as ${target ? "OFFLINE" : "ONLINE"}.`
  };
}

export function relinkClipInDocumentClient(doc, trackKind, trackIndex, clipIndex, newSourcePath) {
  const cleaned = normPosixPathClient(newSourcePath);
  if (!cleaned || cleaned.includes("..")) {
    throw new Error("Invalid workspace source path for relink.");
  }
  const nextDoc = JSON.parse(JSON.stringify(doc));
  const trk = nextDoc.tracks.find((t) => t && t.kind === trackKind && Number(t.index) === Number(trackIndex));
  const clip = trk && Array.isArray(trk.clips) ? trk.clips[clipIndex] : null;
  if (!clip) throw new Error(`Clip not found at ${trackKind}:${trackIndex}:${clipIndex}`);
  clip.source_path = cleaned;
  clip.media_ref = cleaned;
  clip.media_offline = false;
  return {
    changed: true,
    document: nextDoc,
    detail: `Relinked '${clip.name}' -> ${cleaned}`
  };
}

export function autoRelinkAllInDocumentClient(doc, workspaceFiles = [], minConfidence = 60) {
  const audit = auditMediaPoolLinksClient(doc, { workspace_files: workspaceFiles, strict_workspace_check: false });
  const nextDoc = JSON.parse(JSON.stringify(doc));
  let relinked = 0;
  const msgs = [];
  for (const entry of audit.entries) {
    if (entry.status === "online" || !entry.candidates || entry.candidates.length === 0) continue;
    const best = entry.candidates[0];
    if (best.confidence < minConfidence) continue;
    const trk = nextDoc.tracks.find((t) => t && t.kind === entry.track_kind && Number(t.index) === entry.track_index);
    const clip = trk && Array.isArray(trk.clips) ? trk.clips[entry.clip_index] : null;
    if (!clip) continue;
    clip.source_path = best.path;
    clip.media_ref = best.path;
    clip.media_offline = false;
    relinked += 1;
    msgs.push(`${clip.name} -> ${best.path} (${best.confidence}%)`);
  }
  return {
    changed: relinked > 0,
    relinked_count: relinked,
    document: nextDoc,
    detail:
      relinked > 0
        ? `Auto-relinked ${relinked} clip(s): ${msgs.join("; ")}`
        : "No offline clips matched workspace media candidates."
  };
}

function resolvePoolFpsFloat(fps) {
  if (fps && typeof fps === "object" && Number(fps.num) > 0) {
    return Math.max(1, Number(fps.num) / Math.max(1, Number(fps.den || 1)));
  }
  const n = Number(fps);
  return Number.isFinite(n) && n > 0 ? Math.max(1, n) : 25;
}

export function compileAvSyncFiltergraphClient(offsetFrames, fps, opts = {}) {
  const fpsVal = resolvePoolFpsFloat(fps);
  const off = Math.max(-100000, Math.min(100000, Math.round(Number(offsetFrames) || 0)));
  const aPad = String(opts.audio_pad || "1:a").trim();
  const oPad = String(opts.out_pad || "a_sync").trim();
  if (off > 0) {
    const delayMs = ((off / fpsVal) * 1000).toFixed(2);
    return `[${aPad}]adelay=${delayMs}|${delayMs},asetpts=PTS-STARTPTS[${oPad}]`;
  }
  if (off < 0) {
    const trimS = (Math.abs(off) / fpsVal).toFixed(4);
    return `[${aPad}]atrim=start=${trimS},asetpts=PTS-STARTPTS[${oPad}]`;
  }
  return `[${aPad}]anull,asetpts=PTS-STARTPTS[${oPad}]`;
}

export function analyzeAvSyncClient(doc, opts = {}) {
  if (!doc || !Array.isArray(doc.tracks)) {
    throw new Error("Timeline document is required.");
  }
  const mode = opts.mode === "timecode" ? "timecode" : "waveform";
  const vTrkIdx = Number.isInteger(opts.video_track_index) ? opts.video_track_index : 1;
  const vClipIdx = Number.isInteger(opts.video_clip_index) ? opts.video_clip_index : 0;
  const aTrkIdx = Number.isInteger(opts.audio_track_index) ? opts.audio_track_index : 1;
  const aClipIdx = Number.isInteger(opts.audio_clip_index) ? opts.audio_clip_index : 0;
  const maxLag = Math.max(4, Math.min(240, Math.round(Number(opts.max_lag_frames) || 48)));

  const vTrk = doc.tracks.find((t) => t && t.kind === "video" && Number(t.index) === vTrkIdx);
  const aTrk = doc.tracks.find((t) => t && t.kind === "audio" && Number(t.index) === aTrkIdx);
  const vClip = vTrk && Array.isArray(vTrk.clips) ? vTrk.clips[vClipIdx] : null;
  const aClip = aTrk && Array.isArray(aTrk.clips) ? aTrk.clips[aClipIdx] : null;
  if (!vClip || !aClip) {
    throw new Error("Video and Audio clips are required for A/V Auto-Sync.");
  }

  const fpsFloat = resolvePoolFpsFloat(doc.fps);
  const fpsInt = Math.max(1, Math.round(fpsFloat));
  const vTc =
    String(opts.video_tc || "").trim() ||
    String(vClip.timecode_start || "").trim() ||
    framesToSmpteTimecode(3600 * fpsInt + (Number(vClip.start_frame) || 0), doc.fps);
  const aTc =
    String(opts.audio_tc || "").trim() ||
    String(aClip.timecode_start || "").trim() ||
    framesToSmpteTimecode(3600 * fpsInt + (Number(aClip.start_frame) || 0), doc.fps);

  let vEnv = Array.isArray(opts.video_envelope) ? opts.video_envelope.map((v) => clampNum(Number(v) || 0, 0, 1)) : null;
  let aEnv = Array.isArray(opts.audio_envelope) ? opts.audio_envelope.map((v) => clampNum(Number(v) || 0, 0, 1)) : null;

  if (!vEnv || !aEnv || vEnv.length < 4 || aEnv.length < 4) {
    const seedStr = `${vClip.name || ""}:${aClip.name || ""}`;
    let seedSrc = 0;
    for (let i = 0; i < seedStr.length; i++) seedSrc += seedStr.charCodeAt(i);
    const clapPos = 24 + (seedSrc % 16);
    const trueLagRaw = (Number(vClip.source_in_frame) || 0) - (Number(aClip.source_in_frame) || 0) + (seedSrc % 13) - 6;
    let clampedLag = Math.max(-Math.floor(maxLag / 2), Math.min(Math.floor(maxLag / 2), trueLagRaw));
    if (clampedLag === 0 && Number(aClip.start_frame) !== Number(vClip.start_frame)) {
      clampedLag = Math.max(
        -Math.floor(maxLag / 2),
        Math.min(Math.floor(maxLag / 2), (Number(vClip.start_frame) || 0) - (Number(aClip.start_frame) || 0))
      );
    }
    if (clampedLag === 0) clampedLag = 6;
    vEnv = [];
    aEnv = [];
    for (let i = 0; i < 96; i++) {
      const base = 0.08 + 0.06 * Math.abs(Math.sin(i * 0.37 + seedSrc * 0.11));
      const clapV = 0.88 * Math.exp(-((i - clapPos) ** 2) / 3.2);
      const speechV = 0.35 * Math.exp(-((i - (clapPos + 22)) ** 2) / 22.0) * (0.6 + 0.4 * Math.sin(i * 0.9));
      vEnv.push(Number(Math.min(1, base + clapV + Math.max(0, speechV)).toFixed(4)));
      const j = i + clampedLag;
      const baseA = 0.07 + 0.05 * Math.abs(Math.sin(j * 0.37 + seedSrc * 0.11));
      const clapA = 0.92 * Math.exp(-((j - clapPos) ** 2) / 3.0);
      const speechA = 0.38 * Math.exp(-((j - (clapPos + 22)) ** 2) / 22.0) * (0.6 + 0.4 * Math.sin(j * 0.9));
      aEnv.push(Number(Math.min(1, baseA + clapA + Math.max(0, speechA)).toFixed(4)));
    }
  }

  const bound = Math.max(1, Math.min(maxLag, Math.max(vEnv.length, aEnv.length) - 2));
  const curve = [];
  let bestLag = 0;
  let bestScore = -2;
  for (let lag = -bound; lag <= bound; lag++) {
    const pA = [];
    const pB = [];
    for (let i = 0; i < vEnv.length; i++) {
      const j = i + lag;
      if (j >= 0 && j < aEnv.length) {
        pA.push(vEnv[i]);
        pB.push(aEnv[j]);
      }
    }
    let score = 0;
    if (pA.length >= 4) {
      const mA = pA.reduce((s, x) => s + x, 0) / pA.length;
      const mB = pB.reduce((s, x) => s + x, 0) / pB.length;
      let num = 0;
      let dA = 0;
      let dB = 0;
      for (let k = 0; k < pA.length; k++) {
        const da = pA[k] - mA;
        const db = pB[k] - mB;
        num += da * db;
        dA += da * da;
        dB += db * db;
      }
      const den = Math.sqrt(dA) * Math.sqrt(dB);
      score = den > 1e-9 ? num / den : 0;
    }
    const sc = Math.max(-1, Math.min(1, Number(score.toFixed(4))));
    curve.push({ lag, score: sc });
    if (sc > bestScore) {
      bestScore = sc;
      bestLag = lag;
    }
  }

  let offsetFrames = bestLag;
  let confidence = Number(Math.max(0, Math.min(1, bestScore)).toFixed(4));
  let detail = `Waveform cross-correlation peak at ${offsetFrames >= 0 ? "+" : ""}${offsetFrames}f (${Math.round(confidence * 100)}% confidence)`;

  if (mode === "timecode") {
    const parseTc = (tcText) => {
      const m = /^(\d{2}):(\d{2}):(\d{2})[:;](\d{2})$/.exec(String(tcText || "").trim());
      if (!m) throw new Error(`Invalid SMPTE timecode '${tcText}'; expected HH:MM:SS:FF`);
      const hh = Number.parseInt(m[1], 10);
      const mm = Number.parseInt(m[2], 10);
      const ss = Number.parseInt(m[3], 10);
      const ff = Number.parseInt(m[4], 10);
      return (hh * 3600 + mm * 60 + ss) * fpsInt + (ff % fpsInt);
    };
    const vF = parseTc(vTc);
    const aF = parseTc(aTc);
    offsetFrames = Math.max(-100000, Math.min(100000, aF - vF));
    confidence = 1;
    detail = `SMPTE TC Jam-Sync: ${offsetFrames >= 0 ? "+" : ""}${offsetFrames}f (${vTc} vs ${aTc})`;
  }

  const offsetMs = Number(((offsetFrames / fpsFloat) * 1000).toFixed(2));
  const af = compileAvSyncFiltergraphClient(offsetFrames, doc.fps);
  const vSrc = vClip.source_path || `${vClip.name}.mov`;
  const aSrc = aClip.source_path || `${aClip.name}.wav`;
  const ffmpegArgv = [
    "ffmpeg", "-y", "-i", vSrc, "-i", aSrc,
    "-filter_complex", af, "-map", "0:v", "-map", "[a_sync]",
    "-c:v", "copy", "-c:a", "aac", "synced_clip.mp4"
  ];

  return {
    mode,
    video_track_index: vTrkIdx,
    video_clip_index: vClipIdx,
    video_clip_name: vClip.name || "",
    audio_track_index: aTrkIdx,
    audio_clip_index: aClipIdx,
    audio_clip_name: aClip.name || "",
    offset_frames: offsetFrames,
    offset_ms: offsetMs,
    confidence,
    fps_float: fpsFloat,
    video_tc: vTc,
    audio_tc: aTc,
    video_envelope: vEnv,
    audio_envelope: aEnv,
    correlation_curve: curve,
    audio_filter: af,
    ffmpeg_argv: ffmpegArgv,
    detail
  };
}

export function applyAvSyncInDocumentClient(doc, opts = {}) {
  const nextDoc = JSON.parse(JSON.stringify(doc));
  const vTrkIdx = Number.isInteger(opts.video_track_index) ? opts.video_track_index : 1;
  const vClipIdx = Number.isInteger(opts.video_clip_index) ? opts.video_clip_index : 0;
  const aTrkIdx = Number.isInteger(opts.audio_track_index) ? opts.audio_track_index : 1;
  const aClipIdx = Number.isInteger(opts.audio_clip_index) ? opts.audio_clip_index : 0;
  const off = Math.max(-100000, Math.min(100000, Math.round(Number(opts.offset_frames) || 0)));
  const linkPair = opts.link_pair !== false;

  const vTrk = nextDoc.tracks.find((t) => t && t.kind === "video" && Number(t.index) === vTrkIdx);
  const aTrk = nextDoc.tracks.find((t) => t && t.kind === "audio" && Number(t.index) === aTrkIdx);
  const vClip = vTrk && Array.isArray(vTrk.clips) ? vTrk.clips[vClipIdx] : null;
  const aClip = aTrk && Array.isArray(aTrk.clips) ? aTrk.clips[aClipIdx] : null;
  if (!vClip || !aClip) {
    throw new Error("Video and Audio clips are required to apply A/V Auto-Sync.");
  }

  aClip.start_frame = Math.max(0, (Number(vClip.start_frame) || 0) + off);
  aClip.av_sync_offset_frames = off;
  vClip.av_sync_offset_frames = off;
  if (linkPair) {
    const linkId = (
      vClip.link_group_id ||
      aClip.link_group_id ||
      `avsync_v${vTrkIdx}_${vClipIdx}_a${aTrkIdx}_${aClipIdx}`
    ).slice(0, 64);
    vClip.link_group_id = linkId;
    aClip.link_group_id = linkId;
  }
  const sign = off >= 0 ? "+" : "";
  return {
    changed: true,
    offset_frames: off,
    detail: `Synced '${aClip.name}' to '${vClip.name}' (${sign}${off}f)${linkPair ? " & linked A/V" : ""}.`,
    document: nextDoc
  };
}

export const SCENE_CUT_METHODS = ["hybrid", "ffmpeg_scdet", "luma_histogram"];
export const SCENE_CUT_SPLIT_MODES = ["split_and_markers", "split_clips", "markers_only"];
export const SCENE_CUT_THRESHOLD_MIN = 0.05;
export const SCENE_CUT_THRESHOLD_MAX = 0.95;
export const SCENE_CUT_THRESHOLD_DEFAULT = 0.35;
export const SCENE_CUT_MIN_SHOT_FRAMES_DEFAULT = 6;
export const SCENE_CUT_MARKER_COLORS = ["Cyan", "Gold", "Green", "Blue", "Red"];

export function normalizeSceneCutMethodClient(raw) {
  const cleaned = String(raw || "hybrid").trim().toLowerCase();
  if (SCENE_CUT_METHODS.includes(cleaned)) return cleaned;
  throw new Error(`Unsupported scene cut method '${raw}'`);
}

export function normalizeSceneCutSplitModeClient(raw) {
  const cleaned = String(raw || "split_and_markers").trim().toLowerCase();
  if (SCENE_CUT_SPLIT_MODES.includes(cleaned)) return cleaned;
  throw new Error(`Unsupported scene cut split_mode '${raw}'`);
}

export function compileSceneCutFiltergraphClient(
  threshold = SCENE_CUT_THRESHOLD_DEFAULT,
  scPass = false,
  includeMetadataPrint = true
) {
  const rawT = Number(threshold);
  if (!Number.isFinite(rawT) || rawT < SCENE_CUT_THRESHOLD_MIN || rawT > SCENE_CUT_THRESHOLD_MAX) {
    throw new Error(`threshold must be between ${SCENE_CUT_THRESHOLD_MIN} and ${SCENE_CUT_THRESHOLD_MAX}`);
  }
  const normT = Number(rawT.toFixed(4));
  const scdetThresh = Number((2.0 + normT * 48.0).toFixed(2));
  const passFlag = scPass ? 1 : 0;
  const base = `scdet=threshold=${scdetThresh.toFixed(2)}:sc_pass=${passFlag}`;
  return includeMetadataPrint ? `${base},metadata=mode=print:key=lavfi.scd.score` : base;
}

function buildDeterministicClipLumaSeriesClient(clip) {
  const dur = Math.max(0, Math.round(Number(clip && clip.duration_frames) || 0));
  if (dur <= 0) return [];
  const seedStr = `${clip.name || ""}|${clip.source_path || ""}|${clip.media_ref || ""}|${dur}`;
  const bytes = new Uint8Array(32);
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i += 1) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  for (let i = 0; i < 32; i += 1) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    bytes[i] = (h >>> 0) & 0xff;
  }

  let shotCount = 1;
  if (dur >= 16 && dur < 45) shotCount = 2 + (bytes[0] % 2);
  else if (dur >= 45 && dur < 120) shotCount = 3 + (bytes[0] % 3);
  else if (dur >= 120) shotCount = 4 + (bytes[0] % 3);

  if (shotCount <= 1) {
    const baseL = 0.25 + (bytes[1] / 255.0) * 0.5;
    const out = [];
    for (let i = 0; i < dur; i += 1) {
      out.push(Number(clampNum(baseL + 0.015 * Math.sin(i * 0.35), 0.02, 0.98).toFixed(4)));
    }
    return out;
  }

  const minSeg = Math.max(4, Math.floor(dur / (shotCount * 2)));
  const boundaries = [0];
  for (let s = 1; s < shotCount; s += 1) {
    const nominal = Math.round((s * dur) / shotCount);
    const jitter = (bytes[(s + 2) % 32] % 9) - 4;
    const cand = Math.max(
      boundaries[boundaries.length - 1] + minSeg,
      Math.min(dur - minSeg, nominal + jitter)
    );
    if (cand > boundaries[boundaries.length - 1] && cand < dur - 2) {
      boundaries.push(cand);
    }
  }
  boundaries.push(dur);

  const plateaus = [];
  for (let s = 0; s < boundaries.length - 1; s += 1) {
    let rawVal = 0.14 + (bytes[(s * 3 + 5) % 32] / 255.0) * 0.72;
    if (s > 0 && Math.abs(rawVal - plateaus[s - 1]) < 0.34) {
      rawVal = 0.85 - plateaus[s - 1] * 0.7;
    }
    plateaus.push(clampNum(rawVal, 0.08, 0.92));
  }

  const series = [];
  for (let s = 0; s < boundaries.length - 1; s += 1) {
    const startF = boundaries[s];
    const endF = boundaries[s + 1];
    const baseL = plateaus[s];
    const phase = (bytes[(s + 11) % 32] / 255.0) * Math.PI * 2;
    for (let f = startF; f < endF; f += 1) {
      const motion = 0.018 * Math.sin(f * 0.42 + phase);
      series.push(Number(clampNum(baseL + motion, 0.02, 0.98).toFixed(4)));
    }
  }
  return series;
}

export function detectSceneCutsFromLumaSeriesClient(lumaFrames, opts = {}) {
  const threshold = Number.isFinite(Number(opts.threshold))
    ? clampNum(Number(opts.threshold), SCENE_CUT_THRESHOLD_MIN, SCENE_CUT_THRESHOLD_MAX)
    : SCENE_CUT_THRESHOLD_DEFAULT;
  const minGap = Number.isFinite(Number(opts.min_shot_frames))
    ? Math.max(2, Math.min(240, Math.round(Number(opts.min_shot_frames))))
    : SCENE_CUT_MIN_SHOT_FRAMES_DEFAULT;
  const method = normalizeSceneCutMethodClient(opts.method || "hybrid");
  const maxCuts = Number.isFinite(Number(opts.max_cuts))
    ? Math.max(1, Math.min(256, Math.round(Number(opts.max_cuts))))
    : 128;

  const frames = Array.isArray(lumaFrames) ? lumaFrames : [];
  const n = frames.length;
  if (n === 0) return { frame_scores: [], cuts: [] };
  if (n === 1) {
    return {
      frame_scores: [{ frame_offset: 0, score: 0, luma_delta: 0, is_cut: false }],
      cuts: []
    };
  }

  const rawMetrics = [{ score: 0, lumaDelta: 0, histDelta: 0 }];
  for (let i = 1; i < n; i += 1) {
    const prevL = clampNum(Number(frames[i - 1]) || 0, 0, 1);
    const currL = clampNum(Number(frames[i]) || 0, 0, 1);
    const lumaDelta = Math.abs(currL - prevL);
    const preStart = Math.max(0, i - 3);
    const postEnd = Math.min(n, i + 3);
    let preSum = 0;
    for (let k = preStart; k < i; k += 1) preSum += clampNum(Number(frames[k]) || 0, 0, 1);
    let postSum = 0;
    for (let k = i; k < postEnd; k += 1) postSum += clampNum(Number(frames[k]) || 0, 0, 1);
    const preMean = preSum / Math.max(1, i - preStart);
    const postMean = postSum / Math.max(1, postEnd - i);
    const histDelta = Math.min(1, Math.abs(postMean - preMean) * 1.15 + lumaDelta * 0.35);

    let score = 0;
    if (method === "ffmpeg_scdet") score = Math.min(1, lumaDelta * 1.35);
    else if (method === "luma_histogram") score = Math.min(1, histDelta * 1.25);
    else score = Math.min(1, lumaDelta * 0.85 + histDelta * 0.55);

    rawMetrics.push({
      score: Number(score.toFixed(4)),
      lumaDelta: Number(lumaDelta.toFixed(4)),
      histDelta: Number(histDelta.toFixed(4))
    });
  }

  const candidates = [];
  for (let i = 1; i < n - 1; i += 1) {
    if (rawMetrics[i].score >= threshold) candidates.push(i);
  }
  candidates.sort((a, b) => rawMetrics[b].score - rawMetrics[a].score || a - b);

  const accepted = [];
  for (const idx of candidates) {
    if (accepted.some((kept) => Math.abs(idx - kept) < minGap)) continue;
    accepted.push(idx);
    if (accepted.length >= maxCuts) break;
  }
  accepted.sort((a, b) => a - b);
  const acceptedSet = new Set(accepted);

  const frameScores = [];
  for (let i = 0; i < n; i += 1) {
    frameScores.push({
      frame_offset: i,
      score: rawMetrics[i].score,
      luma_delta: rawMetrics[i].lumaDelta,
      is_cut: acceptedSet.has(i)
    });
  }
  const cuts = accepted.map((idx) => ({
    frame_offset: idx,
    score: rawMetrics[idx].score,
    luma_delta: rawMetrics[idx].lumaDelta,
    histogram_delta: rawMetrics[idx].histDelta
  }));
  return { frame_scores: frameScores, cuts };
}

export function analyzeClipSceneCutsClient(doc, opts = {}) {
  if (!doc || !Array.isArray(doc.tracks)) {
    throw new Error("Timeline document is required.");
  }
  const trkIdx = Number.isInteger(opts.track_index) ? opts.track_index : 1;
  const clpIdx = Number.isInteger(opts.clip_index) ? opts.clip_index : 0;
  const track = doc.tracks.find((t) => t && t.kind === "video" && Number(t.index) === trkIdx);
  if (!track || !Array.isArray(track.clips) || clpIdx < 0 || clpIdx >= track.clips.length) {
    throw new Error(`Video clip not found on V${trkIdx} [${clpIdx}]`);
  }
  const clip = track.clips[clpIdx];
  const threshold = Number.isFinite(Number(opts.threshold))
    ? clampNum(Number(opts.threshold), SCENE_CUT_THRESHOLD_MIN, SCENE_CUT_THRESHOLD_MAX)
    : SCENE_CUT_THRESHOLD_DEFAULT;
  const minGap = Number.isFinite(Number(opts.min_shot_frames))
    ? Math.max(2, Math.min(240, Math.round(Number(opts.min_shot_frames))))
    : SCENE_CUT_MIN_SHOT_FRAMES_DEFAULT;
  const method = normalizeSceneCutMethodClient(opts.method || "hybrid");
  const fpsNum = Number(doc.fps && (doc.fps.num || doc.fps.numerator)) || 25;
  const fpsDen = Number(doc.fps && (doc.fps.den || doc.fps.denominator)) || 1;
  const fpsFloat = Math.max(1, fpsNum / Math.max(1, fpsDen));
  const dur = Math.max(0, Math.round(Number(clip.duration_frames) || 0));

  const series = Array.isArray(opts.luma_frames)
    ? opts.luma_frames
    : buildDeterministicClipLumaSeriesClient(clip);
  const detected = detectSceneCutsFromLumaSeriesClient(series, {
    threshold,
    min_shot_frames: minGap,
    method
  });
  const filtergraph = compileSceneCutFiltergraphClient(threshold, false, true);

  const candidates = detected.cuts.map((c, idx) => {
    const tlFrame = (Number(clip.start_frame) || 0) + c.frame_offset;
    const srcIn = Number(clip.source_in_frame) || 0;
    const srcFrame = clip.reverse
      ? srcIn + Math.max(0, dur - c.frame_offset)
      : srcIn + c.frame_offset;
    return {
      frame_offset: c.frame_offset,
      timeline_frame: tlFrame,
      source_frame: srcFrame,
      timecode: framesToSmpteTimecode(tlFrame, Math.round(fpsFloat)),
      score: c.score,
      luma_delta: c.luma_delta,
      histogram_delta: c.histogram_delta,
      enabled: true,
      manual: false,
      shot_label: `Shot ${String(idx + 1).padStart(2, "0")}`
    };
  });

  const shotCount = candidates.length + 1;
  const avgShot = dur > 0 ? Number((dur / Math.max(1, shotCount)).toFixed(2)) : 0;
  return {
    clip_name: clip.name || "",
    track_index: trkIdx,
    clip_index: clpIdx,
    clip_start_frame: Number(clip.start_frame) || 0,
    clip_duration_frames: dur,
    fps_num: fpsNum,
    fps_den: fpsDen,
    method,
    source_mode: "deterministic_synthetic",
    threshold: Number(threshold.toFixed(4)),
    min_shot_frames: minGap,
    filtergraph,
    frame_scores: detected.frame_scores,
    candidates,
    active_cut_count: candidates.length,
    avg_shot_frames: avgShot
  };
}

function splitClipSegmentsClient(clip, sortedOffsets, shotPrefix = "", newLinkGroups = null) {
  const dur = Math.max(0, Math.round(Number(clip.duration_frames) || 0));
  const boundaries = [0, ...sortedOffsets, dur];
  const baseName = String(shotPrefix || clip.name || "Shot").trim() || "Shot";
  const segments = [];
  const totalSegs = boundaries.length - 1;

  for (let i = 0; i < totalSegs; i += 1) {
    const segStart = boundaries[i];
    const segEnd = boundaries[i + 1];
    const segDur = segEnd - segStart;
    if (segDur <= 0) continue;

    const seg = JSON.parse(JSON.stringify(clip));
    seg.name = `${baseName}_S${String(i + 1).padStart(2, "0")}`;
    seg.start_frame = (Number(clip.start_frame) || 0) + segStart;
    seg.duration_frames = segDur;
    const origSrcIn = Number(clip.source_in_frame) || 0;
    seg.source_in_frame = clip.reverse
      ? origSrcIn + Math.max(0, dur - segEnd)
      : origSrcIn + segStart;
    if (i > 0) seg.fade_in_s = 0;
    if (i < totalSegs - 1) {
      seg.fade_out_s = 0;
      seg.transition_out = null;
    }
    if (Array.isArray(newLinkGroups) && i < newLinkGroups.length) {
      seg.link_group_id = newLinkGroups[i];
    }
    segments.push(seg);
  }
  return segments;
}

export function splitClipAtSceneCutsClient(doc, opts = {}) {
  const nextDoc = JSON.parse(JSON.stringify(doc));
  const trkIdx = Number.isInteger(opts.track_index) ? opts.track_index : 1;
  const clpIdx = Number.isInteger(opts.clip_index) ? opts.clip_index : 0;
  const splitMode = normalizeSceneCutSplitModeClient(opts.split_mode || "split_and_markers");
  const splitLinkedAudio = opts.split_linked_audio !== false;
  const colorRaw = String(opts.marker_color || "Cyan").trim();
  const markerColor = SCENE_CUT_MARKER_COLORS.includes(colorRaw) ? colorRaw : "Cyan";
  const shotPrefix = String(opts.shot_prefix || "").trim().slice(0, 64);

  const track = nextDoc.tracks.find((t) => t && t.kind === "video" && Number(t.index) === trkIdx);
  if (!track || !Array.isArray(track.clips) || clpIdx < 0 || clpIdx >= track.clips.length) {
    throw new Error(`Video clip not found on V${trkIdx} [${clpIdx}]`);
  }
  const clip = track.clips[clpIdx];
  const dur = Math.max(0, Math.round(Number(clip.duration_frames) || 0));
  if (dur < 2) {
    throw new Error(`Clip '${clip.name}' is too short to split.`);
  }

  const rawOffsets = Array.isArray(opts.cut_offsets) ? opts.cut_offsets : [];
  const cleanSet = new Set();
  for (const off of rawOffsets) {
    const val = Math.round(Number(off));
    if (Number.isInteger(val) && val > 0 && val < dur) cleanSet.add(val);
  }
  const sortedOffsets = [...cleanSet].sort((a, b) => a - b);
  if (sortedOffsets.length === 0) {
    throw new Error("No valid cut offsets within clip duration bounds.");
  }

  const fpsNum = Number(nextDoc.fps && (nextDoc.fps.num || nextDoc.fps.numerator)) || 25;
  const fpsDen = Number(nextDoc.fps && (nextDoc.fps.den || nextDoc.fps.denominator)) || 1;
  const fpsInt = Math.max(1, Math.round(fpsNum / Math.max(1, fpsDen)));
  const createdNames = [];
  const createdMarkerFrames = [];
  let linkedAudioSplit = false;

  if (splitMode === "markers_only" || splitMode === "split_and_markers") {
    if (!Array.isArray(nextDoc.markers)) nextDoc.markers = [];
    const existing = new Set(nextDoc.markers.map((m) => Number(m.frame)));
    sortedOffsets.forEach((off, idx) => {
      const absFrame = (Number(clip.start_frame) || 0) + off;
      if (!existing.has(absFrame)) {
        const tc = framesToSmpteTimecode(absFrame, fpsInt);
        nextDoc.markers.push({
          name: `Cut ${String(idx + 1).padStart(2, "0")} (${clip.name})`,
          frame: absFrame,
          duration_frames: 1,
          color: markerColor,
          note: `Scene Cut @ ${tc}`
        });
        existing.add(absFrame);
        createdMarkerFrames.push(absFrame);
      }
    });
    nextDoc.markers.sort((a, b) => Number(a.frame) - Number(b.frame));
  }

  if (splitMode === "split_clips" || splitMode === "split_and_markers") {
    const origLink = clip.link_group_id || "";
    const segCount = sortedOffsets.length + 1;
    let newLinkGroups = null;
    if (origLink && splitLinkedAudio) {
      newLinkGroups = Array.from({ length: segCount }, (_, i) =>
        `${origLink}_sc${String(i + 1).padStart(2, "0")}`.slice(0, 64)
      );
    }
    const videoSegments = splitClipSegmentsClient(clip, sortedOffsets, shotPrefix, newLinkGroups);
    for (const seg of videoSegments) createdNames.push(seg.name);
    track.clips.splice(clpIdx, 1, ...videoSegments);

    if (origLink && splitLinkedAudio) {
      for (const aTrack of nextDoc.tracks) {
        if (!aTrack || aTrack.kind !== "audio" || !Array.isArray(aTrack.clips)) continue;
        const aIdx = aTrack.clips.findIndex(
          (ac) =>
            ac &&
            ac.link_group_id === origLink &&
            Number(ac.start_frame) === Number(clip.start_frame) &&
            Number(ac.duration_frames) === dur
        );
        if (aIdx >= 0) {
          const aClip = aTrack.clips[aIdx];
          const audioSegments = splitClipSegmentsClient(aClip, sortedOffsets, "", newLinkGroups);
          aTrack.clips.splice(aIdx, 1, ...audioSegments);
          linkedAudioSplit = true;
          break;
        }
      }
    }
  }

  let summary = "";
  if (splitMode === "markers_only") {
    summary = `Added ${createdMarkerFrames.length} scene-cut marker(s) on '${clip.name}'.`;
  } else if (linkedAudioSplit) {
    summary = `Split '${clip.name}' + linked audio into ${createdNames.length} shot(s) (${sortedOffsets.length} cut(s)).`;
  } else {
    summary = `Split '${clip.name}' into ${createdNames.length} shot(s) (${sortedOffsets.length} cut(s)).`;
  }

  return {
    changed: true,
    track_index: trkIdx,
    clip_index: clpIdx,
    split_mode: splitMode,
    created_clip_names: createdNames,
    created_marker_frames: createdMarkerFrames,
    cut_count: sortedOffsets.length,
    linked_audio_split: linkedAudioSplit,
    summary,
    document: nextDoc
  };
}

// ---------------------------------------------------------------------------
// Text-Based Dialogue Rough-Cut & Auto-Silence Studio (Cycle #101)
// ---------------------------------------------------------------------------

export const TEXT_EDIT_NOISE_DB_MIN = -60.0;
export const TEXT_EDIT_NOISE_DB_MAX = -12.0;
export const TEXT_EDIT_NOISE_DB_DEFAULT = -32.0;
export const TEXT_EDIT_MIN_SILENCE_MIN = 0.15;
export const TEXT_EDIT_MIN_SILENCE_MAX = 5.0;
export const TEXT_EDIT_MIN_SILENCE_DEFAULT = 0.45;
export const TEXT_EDIT_PADDING_MIN = 0.0;
export const TEXT_EDIT_PADDING_MAX = 0.5;
export const TEXT_EDIT_PADDING_DEFAULT = 0.08;
export const TEXT_EDIT_GAP_MODES = ["ripple_delete", "extract_gaps", "markers_only"];
export const DEFAULT_TEXT_EDIT_FILLERS = ["um", "uh", "erm", "like", "you know", "euh", "ben", "voila"];

const _SYNTHETIC_TEXT_SENTENCES = [
  ["Host", "Welcome back to the studio breakdown for today's master cut."],
  ["Guest", "Every camera roll was synced against our production timecode."],
  ["Host", "Let's tighten the intro pacing before we send this to color."],
  ["Guest", "The wide establishing shot carries clean ambient room tone."],
  ["Host", "Notice how the key light holds skin tones across the pivot."],
  ["Guest", "We can trim the pause here and jump straight into the demo."],
  ["Host", "That transition lands right on the downbeat of the cue."],
  ["Guest", "Final QC checks passed with zero true-peak overshoots."]
];

function _hashStringU32(text) {
  let h = 2166136261;
  const str = String(text || "");
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function _seededUnitSequenceClient(seedKey, count) {
  let state = _hashStringU32(seedKey) || 0x9e3779b9;
  const out = [];
  for (let i = 0; i < count; i += 1) {
    state = (Math.imul(state ^ (state >>> 15), 0x85ebca6b) + 0xc2b2ae35) >>> 0;
    out.push((state % 10000) / 10000);
  }
  return out;
}

export function normalizeTextEditGapModeClient(raw) {
  const cleaned = String(raw || "ripple_delete").trim().toLowerCase();
  return TEXT_EDIT_GAP_MODES.includes(cleaned) ? cleaned : "ripple_delete";
}

export function compileSilencedetectFiltergraphClient(
  noiseDb = TEXT_EDIT_NOISE_DB_DEFAULT,
  minSilenceS = TEXT_EDIT_MIN_SILENCE_DEFAULT
) {
  const db = clampNum(
    Number.isFinite(Number(noiseDb)) ? Number(noiseDb) : TEXT_EDIT_NOISE_DB_DEFAULT,
    TEXT_EDIT_NOISE_DB_MIN,
    TEXT_EDIT_NOISE_DB_MAX
  );
  const dur = clampNum(
    Number.isFinite(Number(minSilenceS)) ? Number(minSilenceS) : TEXT_EDIT_MIN_SILENCE_DEFAULT,
    TEXT_EDIT_MIN_SILENCE_MIN,
    TEXT_EDIT_MIN_SILENCE_MAX
  );
  return `silencedetect=noise=${db.toFixed(1)}dB:d=${dur.toFixed(2)}`;
}

export function compileRoughcutSelectFiltergraphClient(keepRanges, includeAudio = true) {
  if (!Array.isArray(keepRanges) || keepRanges.length === 0) return "null";
  const terms = keepRanges
    .filter((r) => r && Number(r.end_s) > Number(r.start_s))
    .map((r) => `between(t,${Number(r.start_s).toFixed(3)},${Number(r.end_s).toFixed(3)})`);
  if (terms.length === 0) return "null";
  const expr = terms.join("+");
  const vf = `select='${expr}',setpts=N/FRAME_RATE/TB`;
  if (!includeAudio) return vf;
  const af = `aselect='${expr}',asetpts=N/SR/TB`;
  return `${vf} ; ${af}`;
}

export function formatSrtTimestampClient(seconds) {
  const clamped = Math.max(0, Number(seconds) || 0);
  const totalMs = Math.round(clamped * 1000);
  const ms = totalMs % 1000;
  const totalS = Math.floor(totalMs / 1000);
  const ss = totalS % 60;
  const mm = Math.floor(totalS / 60) % 60;
  const hh = Math.floor(totalS / 3600);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

export function exportTranscriptSrtClient(segments, includeDeleted = false) {
  if (!Array.isArray(segments) || segments.length === 0) return "";
  const lines = [];
  let cueNum = 1;
  let cursorS = 0;
  for (const seg of segments) {
    if (!seg || seg.kind === "silence") continue;
    if (seg.deleted && !includeDeleted) continue;
    const dur = Math.max(0.05, Number(seg.duration_s) || 0.05);
    const t0 = includeDeleted ? Number(seg.start_s) || 0 : cursorS;
    const t1 = t0 + dur;
    cursorS = t1;
    lines.push(String(cueNum));
    lines.push(`${formatSrtTimestampClient(t0)} --> ${formatSrtTimestampClient(t1)}`);
    lines.push(`${seg.speaker || "Speaker 1"}: ${seg.text || ""}`);
    lines.push("");
    cueNum += 1;
  }
  return lines.length > 0 ? `${lines.join("\n").trim()}\n` : "";
}

export function computeKeepRangesFromSegmentsClient(
  segments,
  clipDurationFrames,
  fpsNum = 25,
  fpsDen = 1,
  paddingS = TEXT_EDIT_PADDING_DEFAULT
) {
  const fpsFloat = Math.max(1, Number(fpsNum) / Math.max(1, Number(fpsDen)));
  const padVal = clampNum(
    Number.isFinite(Number(paddingS)) ? Number(paddingS) : TEXT_EDIT_PADDING_DEFAULT,
    TEXT_EDIT_PADDING_MIN,
    TEXT_EDIT_PADDING_MAX
  );
  const padFrames = Math.max(0, Math.round(padVal * fpsFloat));
  const kept = (Array.isArray(segments) ? segments : [])
    .filter((s) => s && !s.deleted && Number(s.end_frame) > Number(s.start_frame))
    .slice()
    .sort((a, b) => Number(a.start_frame) - Number(b.start_frame) || Number(a.end_frame) - Number(b.end_frame));
  if (kept.length === 0) return [];

  const merged = [];
  for (const seg of kept) {
    const sf = Math.max(0, Math.round(Number(seg.start_frame)) - padFrames);
    const ef = Math.min(clipDurationFrames, Math.round(Number(seg.end_frame)) + padFrames);
    if (merged.length === 0 || sf > merged[merged.length - 1][1]) {
      merged.push([sf, ef]);
    } else {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], ef);
    }
  }
  return merged
    .filter((rng) => rng[1] > rng[0])
    .map((rng) => ({
      start_frame: rng[0],
      end_frame: rng[1],
      start_s: Number((rng[0] / fpsFloat).toFixed(3)),
      end_s: Number((rng[1] / fpsFloat).toFixed(3))
    }));
}

export function analyzeClipTranscriptClient(doc, opts = {}) {
  if (!doc || !Array.isArray(doc.tracks)) {
    throw new Error("Timeline document is required.");
  }
  const trackKind = String(opts.track_kind || "video").toLowerCase() === "audio" ? "audio" : "video";
  const trkIdx = Number.isInteger(opts.track_index) ? opts.track_index : 1;
  const clpIdx = Number.isInteger(opts.clip_index) ? opts.clip_index : 0;
  const tracksOfKind = doc.tracks.filter((t) => t && t.kind === trackKind);
  const track = tracksOfKind[trkIdx - 1];
  if (!track || !Array.isArray(track.clips) || clpIdx < 0 || clpIdx >= track.clips.length) {
    throw new Error(`${trackKind} clip not found on track ${trkIdx} [${clpIdx}]`);
  }
  const clip = track.clips[clpIdx];
  const noiseDb = clampNum(
    Number.isFinite(Number(opts.noise_db)) ? Number(opts.noise_db) : TEXT_EDIT_NOISE_DB_DEFAULT,
    TEXT_EDIT_NOISE_DB_MIN,
    TEXT_EDIT_NOISE_DB_MAX
  );
  const minSilenceS = clampNum(
    Number.isFinite(Number(opts.min_silence_s)) ? Number(opts.min_silence_s) : TEXT_EDIT_MIN_SILENCE_DEFAULT,
    TEXT_EDIT_MIN_SILENCE_MIN,
    TEXT_EDIT_MIN_SILENCE_MAX
  );
  const paddingS = clampNum(
    Number.isFinite(Number(opts.padding_s)) ? Number(opts.padding_s) : TEXT_EDIT_PADDING_DEFAULT,
    TEXT_EDIT_PADDING_MIN,
    TEXT_EDIT_PADDING_MAX
  );
  const detectFillers = opts.detect_fillers !== false;
  const fpsNum = Number(doc.fps && (doc.fps.num || doc.fps.numerator)) || 25;
  const fpsDen = Number(doc.fps && (doc.fps.den || doc.fps.denominator)) || 1;
  const fpsFloat = Math.max(1, fpsNum / Math.max(1, fpsDen));
  const fpsInt = Math.max(1, Math.round(fpsFloat));
  const durFrames = Math.max(1, Math.round(Number(clip.duration_frames) || 1));
  const durationS = Number((durFrames / fpsFloat).toFixed(3));
  const bins = 64;
  const randVals = _seededUnitSequenceClient(`${clip.name}:${durFrames}`, bins + 8);
  const pauseCenters = [0.22, 0.54, 0.81];
  const peaks = [];
  for (let i = 0; i < bins; i += 1) {
    const pos = i / Math.max(1, bins - 1);
    const inValley = pauseCenters.some((c) => Math.abs(pos - c) < 0.065);
    const amp = inValley ? 0.03 + randVals[i] * 0.06 : 0.36 + randVals[i] * 0.56;
    peaks.push(Number(Math.min(1, amp).toFixed(4)));
  }

  const normDb = (noiseDb - TEXT_EDIT_NOISE_DB_MIN) / (TEXT_EDIT_NOISE_DB_MAX - TEXT_EDIT_NOISE_DB_MIN);
  const ampThreshold = 0.04 + normDb * 0.38;
  const binDur = durationS / bins;
  const silences = [];
  let runStart = null;
  for (let i = 0; i < bins; i += 1) {
    if (peaks[i] <= ampThreshold) {
      if (runStart === null) runStart = i;
    } else if (runStart !== null) {
      const s0 = runStart * binDur;
      const s1 = i * binDur;
      if (s1 - s0 >= minSilenceS) silences.push({ start_s: s0, end_s: s1 });
      runStart = null;
    }
  }
  if (runStart !== null) {
    const s0 = runStart * binDur;
    if (durationS - s0 >= minSilenceS) silences.push({ start_s: s0, end_s: durationS });
  }

  const spans = [];
  let cursorS = 0;
  for (const iv of silences) {
    if (iv.start_s > cursorS + 0.05) spans.push(["speech", cursorS, iv.start_s]);
    if (iv.end_s > Math.max(cursorS, iv.start_s) + 0.04) {
      spans.push(["silence", Math.max(cursorS, iv.start_s), iv.end_s]);
      cursorS = iv.end_s;
    }
  }
  if (durationS > cursorS + 0.05) spans.push(["speech", cursorS, durationS]);
  if (spans.length === 0) spans.push(["speech", 0, durationS]);

  const expanded = [];
  let fillerToggle = 0;
  for (const [kind, s0, s1] of spans) {
    const spanLen = s1 - s0;
    if (kind === "speech" && detectFillers && spanLen >= 1.4) {
      const fillerDur = Math.min(0.38, Math.max(0.22, spanLen * 0.14));
      if (fillerToggle % 2 === 0) {
        expanded.push(["speech", s0, s1 - fillerDur]);
        expanded.push(["filler", s1 - fillerDur, s1]);
      } else {
        expanded.push(["filler", s0, s0 + fillerDur]);
        expanded.push(["speech", s0 + fillerDur, s1]);
      }
      fillerToggle += 1;
    } else {
      expanded.push([kind, s0, s1]);
    }
  }

  const seedHash = _hashStringU32(clip.name);
  const fillerVocab = Array.isArray(opts.custom_fillers) && opts.custom_fillers.length
    ? opts.custom_fillers
    : DEFAULT_TEXT_EDIT_FILLERS;
  const segments = [];
  let speechIdx = 0;
  let fillerIdx = 0;
  let prevEndF = 0;

  for (let idx = 0; idx < expanded.length; idx += 1) {
    const [kind, s0, s1] = expanded[idx];
    const startF = Math.max(prevEndF, Math.min(durFrames - 1, Math.round(s0 * fpsFloat)));
    const endF =
      idx === expanded.length - 1
        ? durFrames
        : Math.max(startF + 1, Math.min(durFrames, Math.round(s1 * fpsFloat)));
    if (endF <= startF) continue;
    prevEndF = endF;
    const realS0 = Number((startF / fpsFloat).toFixed(3));
    const realS1 = Number((endF / fpsFloat).toFixed(3));
    const durSec = Number(Math.max(0, realS1 - realS0).toFixed(3));
    const segId = `seg_${String(idx + 1).padStart(3, "0")}`;

    let speaker = "Speaker 1";
    let text = "";
    let deleted = false;
    if (kind === "silence") {
      speaker = "Pause";
      text = `[Silence ${durSec.toFixed(2)}s]`;
      deleted = true;
    } else if (kind === "filler") {
      speaker = "Speaker 1";
      text = fillerVocab[(seedHash + fillerIdx) % fillerVocab.length];
      fillerIdx += 1;
    } else {
      const pair = _SYNTHETIC_TEXT_SENTENCES[(seedHash + speechIdx) % _SYNTHETIC_TEXT_SENTENCES.length];
      speaker = pair[0];
      text = pair[1];
      speechIdx += 1;
    }

    const tlStart = (Number(clip.start_frame) || 0) + startF;
    const tlEnd = (Number(clip.start_frame) || 0) + endF;
    const tokens = text.split(/\s+/).filter(Boolean);
    const stepS = Math.max(0.04, realS1 - realS0) / Math.max(1, tokens.length);
    const words = tokens.map((tok, wIdx) => {
      const ws0 = Number((realS0 + wIdx * stepS).toFixed(3));
      const ws1 = Number((realS0 + (wIdx + 1) * stepS).toFixed(3));
      const wf0 = Math.max(0, Math.min(durFrames - 1, Math.round(ws0 * fpsFloat)));
      const wf1 = Math.max(wf0 + 1, Math.min(durFrames, Math.round(ws1 * fpsFloat)));
      return {
        word_id: `${segId}_w${wIdx + 1}`,
        text: tok,
        start_s: ws0,
        end_s: ws1,
        start_frame: wf0,
        end_frame: wf1,
        is_filler: kind === "filler",
        is_silence: kind === "silence",
        deleted,
        confidence: kind === "filler" ? 0.91 : 0.98
      };
    });

    segments.push({
      segment_id: segId,
      speaker,
      kind,
      start_s: realS0,
      end_s: realS1,
      start_frame: startF,
      end_frame: endF,
      timeline_start_frame: tlStart,
      timeline_end_frame: tlEnd,
      duration_s: durSec,
      text,
      timecode: framesToSmpteTimecode(tlStart, fpsInt),
      deleted,
      words
    });
  }

  const keepRanges = computeKeepRangesFromSegmentsClient(segments, durFrames, fpsNum, fpsDen, paddingS);
  const hasAudioTrack = trackKind === "audio" || doc.tracks.some((t) => t && t.kind === "audio");
  const roughcutFg = compileRoughcutSelectFiltergraphClient(keepRanges, hasAudioTrack);
  const silencedetectFg = compileSilencedetectFiltergraphClient(noiseDb, minSilenceS);
  const silenceCount = segments.filter((s) => s.kind === "silence").length;
  const fillerCount = segments.filter((s) => s.kind === "filler").length;
  const speechCount = segments.filter((s) => s.kind === "speech").length;
  const totalSilenceS = Number(
    segments.filter((s) => s.kind === "silence").reduce((acc, s) => acc + s.duration_s, 0).toFixed(3)
  );
  const keptS = Number(
    keepRanges.reduce((acc, r) => acc + (r.end_s - r.start_s), 0).toFixed(3)
  );
  const savedS = Number(Math.max(0, durationS - keptS).toFixed(3));

  return {
    clip_name: clip.name,
    track_kind: trackKind,
    track_index: trkIdx,
    clip_index: clpIdx,
    clip_start_frame: Number(clip.start_frame) || 0,
    clip_duration_frames: durFrames,
    fps_num: fpsNum,
    fps_den: fpsDen,
    duration_s: durationS,
    noise_db: noiseDb,
    min_silence_s: minSilenceS,
    padding_s: paddingS,
    engine: "deterministic_synthetic",
    silencedetect_filtergraph: silencedetectFg,
    roughcut_filtergraph: roughcutFg,
    waveform_peaks: peaks,
    segments,
    silence_count: silenceCount,
    filler_count: fillerCount,
    speech_count: speechCount,
    total_silence_s: totalSilenceS,
    kept_duration_s: keptS,
    saved_duration_s: savedS
  };
}

function _sliceClipByKeepRangesClient(clip, keepRanges, rippleDelete, linkGroups) {
  const slices = [];
  let cursor = Number(clip.start_frame) || 0;
  const total = keepRanges.length;
  for (let i = 0; i < total; i += 1) {
    const rng = keepRanges[i];
    const segDur = rng.end_frame - rng.start_frame;
    if (segDur <= 0) continue;
    const srcBase = Number(clip.source_in_frame) || 0;
    const srcIn = clip.reverse
      ? srcBase + Math.max(0, Number(clip.duration_frames) - rng.end_frame)
      : srcBase + rng.start_frame;
    const segStart = rippleDelete ? cursor : (Number(clip.start_frame) || 0) + rng.start_frame;
    const seg = JSON.parse(JSON.stringify(clip));
    seg.name = `${clip.name}_RC${String(i + 1).padStart(2, "0")}`;
    seg.start_frame = segStart;
    seg.duration_frames = segDur;
    seg.source_in_frame = srcIn;
    if (i > 0) seg.fade_in_s = 0;
    if (i < total - 1) {
      seg.fade_out_s = 0;
      seg.transition_out = null;
    }
    if (Array.isArray(linkGroups) && i < linkGroups.length) {
      seg.link_group_id = linkGroups[i];
    }
    slices.push(seg);
    cursor += segDur;
  }
  return slices;
}

export function applyTextEditRoughCutClient(doc, opts = {}) {
  if (!doc || !Array.isArray(doc.tracks)) {
    throw new Error("Timeline document is required.");
  }
  const nextDoc = JSON.parse(JSON.stringify(doc));
  const trackKind = String(opts.track_kind || "video").toLowerCase() === "audio" ? "audio" : "video";
  const trkIdx = Number.isInteger(opts.track_index) ? opts.track_index : 1;
  const clpIdx = Number.isInteger(opts.clip_index) ? opts.clip_index : 0;
  const gapMode = normalizeTextEditGapModeClient(opts.gap_mode || "ripple_delete");
  const syncLinked = opts.sync_linked_track !== false;
  const markerColor = String(opts.marker_color || "Red");
  const paddingS = Number.isFinite(Number(opts.padding_s)) ? Number(opts.padding_s) : TEXT_EDIT_PADDING_DEFAULT;

  const tracksOfKind = nextDoc.tracks.filter((t) => t && t.kind === trackKind);
  const track = tracksOfKind[trkIdx - 1];
  if (!track || !Array.isArray(track.clips) || clpIdx < 0 || clpIdx >= track.clips.length) {
    throw new Error(`${trackKind} clip not found on track ${trkIdx} [${clpIdx}]`);
  }
  const clip = track.clips[clpIdx];
  const dur = Math.max(0, Math.round(Number(clip.duration_frames) || 0));
  if (dur < 2) {
    throw new Error(`Clip '${clip.name}' is too short for text rough-cut.`);
  }

  let segments = Array.isArray(opts.segments)
    ? opts.segments.map((s) => ({ ...s }))
    : analyzeClipTranscriptClient(nextDoc, opts).segments;

  if (Array.isArray(opts.delete_segment_ids)) {
    const delSet = new Set(opts.delete_segment_ids.map(String));
    segments = segments.map((s) => (delSet.has(s.segment_id) ? { ...s, deleted: true } : s));
  }

  const fpsNum = Number(nextDoc.fps && (nextDoc.fps.num || nextDoc.fps.numerator)) || 25;
  const fpsDen = Number(nextDoc.fps && (nextDoc.fps.den || nextDoc.fps.denominator)) || 1;
  const keepRanges = computeKeepRangesFromSegmentsClient(segments, dur, fpsNum, fpsDen, paddingS);
  if (keepRanges.length === 0) {
    throw new Error("Cannot delete every transcript segment; at least one speech segment must remain.");
  }

  const hasAudio = trackKind === "audio" || nextDoc.tracks.some((t) => t && t.kind === "audio");
  const ffmpegFg = compileRoughcutSelectFiltergraphClient(keepRanges, hasAudio);
  const transcriptSrt = exportTranscriptSrtClient(segments, false);
  const removedIds = segments.filter((s) => s.deleted).map((s) => s.segment_id);
  const keptDur = keepRanges.reduce((acc, r) => acc + (r.end_frame - r.start_frame), 0);
  const savedFrames = Math.max(0, dur - keptDur);

  if (gapMode === "markers_only") {
    if (!Array.isArray(nextDoc.markers)) nextDoc.markers = [];
    const existing = new Set(nextDoc.markers.map((m) => Number(m.frame)));
    const createdMarkerFrames = [];
    for (const seg of segments) {
      if (!seg.deleted) continue;
      const tlFrame = (Number(clip.start_frame) || 0) + Number(seg.start_frame);
      if (!existing.has(tlFrame)) {
        nextDoc.markers.push({
          frame: tlFrame,
          name: `Cut: ${String(seg.text || "").slice(0, 24)}`,
          color: markerColor,
          note: `Text Edit (${seg.kind}) ${Number(seg.duration_s || 0).toFixed(2)}s`
        });
        existing.add(tlFrame);
        createdMarkerFrames.push(tlFrame);
      }
    }
    nextDoc.markers.sort((a, b) => Number(a.frame) - Number(b.frame));
    return {
      changed: true,
      track_kind: trackKind,
      track_index: trkIdx,
      clip_index: clpIdx,
      gap_mode: gapMode,
      kept_ranges: keepRanges,
      removed_segment_ids: removedIds,
      created_clip_names: [],
      created_marker_frames: createdMarkerFrames,
      original_duration_frames: dur,
      roughcut_duration_frames: dur,
      saved_frames: savedFrames,
      linked_track_synced: false,
      ffmpeg_filtergraph: ffmpegFg,
      transcript_srt: transcriptSrt,
      summary: `Marked ${createdMarkerFrames.length} cut point(s) on '${clip.name}'`,
      document: nextDoc
    };
  }

  const rippleDelete = gapMode === "ripple_delete";
  const partnerKind = trackKind === "video" ? "audio" : "video";
  let partnerTrack = null;
  let partnerIdx = -1;
  let partnerClip = null;
  if (syncLinked) {
    for (const pt of nextDoc.tracks) {
      if (!pt || pt.kind !== partnerKind || !Array.isArray(pt.clips)) continue;
      let idx = -1;
      if (clip.link_group_id) {
        idx = pt.clips.findIndex((c) => c && c.link_group_id === clip.link_group_id);
      }
      if (idx < 0) {
        idx = pt.clips.findIndex(
          (c) =>
            c &&
            Number(c.start_frame) === Number(clip.start_frame) &&
            Number(c.duration_frames) === dur
        );
      }
      if (idx >= 0) {
        partnerTrack = pt;
        partnerIdx = idx;
        partnerClip = pt.clips[idx];
        break;
      }
    }
  }

  const linkGroups = keepRanges.map((_, i) => `te_${clip.name}_${String(i + 1).padStart(2, "0")}`.slice(0, 64));
  const newSlices = _sliceClipByKeepRangesClient(
    clip,
    keepRanges,
    rippleDelete,
    partnerClip ? linkGroups : null
  );
  const deltaShift = keptDur - dur;
  const origEnd = (Number(clip.start_frame) || 0) + dur;
  const downstream = track.clips.slice(clpIdx + 1).map((c) => {
    if (rippleDelete && deltaShift !== 0 && Number(c.start_frame) >= origEnd) {
      return { ...c, start_frame: Math.max(0, Number(c.start_frame) + deltaShift) };
    }
    return c;
  });
  track.clips = [...track.clips.slice(0, clpIdx), ...newSlices, ...downstream];

  let linkedSynced = false;
  if (partnerTrack && partnerClip && partnerIdx >= 0) {
    const pSlices = _sliceClipByKeepRangesClient(partnerClip, keepRanges, rippleDelete, linkGroups);
    const pEnd = (Number(partnerClip.start_frame) || 0) + Number(partnerClip.duration_frames);
    const pDownstream = partnerTrack.clips.slice(partnerIdx + 1).map((c) => {
      if (rippleDelete && deltaShift !== 0 && Number(c.start_frame) >= pEnd) {
        return { ...c, start_frame: Math.max(0, Number(c.start_frame) + deltaShift) };
      }
      return c;
    });
    partnerTrack.clips = [...partnerTrack.clips.slice(0, partnerIdx), ...pSlices, ...pDownstream];
    linkedSynced = true;
  }

  return {
    changed: true,
    track_kind: trackKind,
    track_index: trkIdx,
    clip_index: clpIdx,
    gap_mode: gapMode,
    kept_ranges: keepRanges,
    removed_segment_ids: removedIds,
    created_clip_names: newSlices.map((s) => s.name),
    created_marker_frames: [],
    original_duration_frames: dur,
    roughcut_duration_frames: keptDur,
    saved_frames: savedFrames,
    linked_track_synced: linkedSynced,
    ffmpeg_filtergraph: ffmpegFg,
    transcript_srt: transcriptSrt,
    summary: `Rough-cut '${clip.name}' into ${newSlices.length} segment(s) (-${savedFrames}f removed)`,
    document: nextDoc
  };
}

export const FALSE_COLOR_PALETTES_CLIENT = {
  arri_ire: [
    { min_ire: -10.0, max_ire: 3.0, color_hex: "#5b21b6", label: "Crush", stop_note: "< 3 IRE" },
    { min_ire: 3.0, max_ire: 12.0, color_hex: "#2563eb", label: "Deep Shadow", stop_note: "3-12 IRE" },
    { min_ire: 12.0, max_ire: 25.0, color_hex: "#0891b2", label: "Shadow", stop_note: "12-25 IRE" },
    { min_ire: 25.0, max_ire: 38.0, color_hex: "#0d9488", label: "Low Mid", stop_note: "25-38 IRE" },
    { min_ire: 38.0, max_ire: 45.0, color_hex: "#16a34a", label: "18% Grey", stop_note: "38-45 IRE" },
    { min_ire: 45.0, max_ire: 55.0, color_hex: "#65a30d", label: "Neutral Mid", stop_note: "45-55 IRE" },
    { min_ire: 55.0, max_ire: 68.0, color_hex: "#f472b6", label: "Skin Key", stop_note: "55-68 IRE" },
    { min_ire: 68.0, max_ire: 82.0, color_hex: "#cbd5e1", label: "Highlight", stop_note: "68-82 IRE" },
    { min_ire: 82.0, max_ire: 94.0, color_hex: "#eab308", label: "Caution", stop_note: "82-94 IRE" },
    { min_ire: 94.0, max_ire: 100.0, color_hex: "#f97316", label: "Hot White", stop_note: "94-100 IRE" },
    { min_ire: 100.0, max_ire: 120.0, color_hex: "#ef4444", label: "Clipped", stop_note: ">= 100 IRE" }
  ],
  atomos_ire: [
    { min_ire: -10.0, max_ire: 5.0, color_hex: "#4338ca", label: "Black Clip", stop_note: "< 5 IRE" },
    { min_ire: 5.0, max_ire: 20.0, color_hex: "#0284c7", label: "Shadows", stop_note: "5-20 IRE" },
    { min_ire: 20.0, max_ire: 40.0, color_hex: "#0f766e", label: "Dark Mid", stop_note: "20-40 IRE" },
    { min_ire: 40.0, max_ire: 50.0, color_hex: "#22c55e", label: "Mid Grey", stop_note: "40-50 IRE" },
    { min_ire: 50.0, max_ire: 65.0, color_hex: "#ec4899", label: "Skin Tone", stop_note: "50-65 IRE" },
    { min_ire: 65.0, max_ire: 85.0, color_hex: "#94a3b8", label: "Upper Mid", stop_note: "65-85 IRE" },
    { min_ire: 85.0, max_ire: 98.0, color_hex: "#facc15", label: "Over Warn", stop_note: "85-98 IRE" },
    { min_ire: 98.0, max_ire: 120.0, color_hex: "#dc2626", label: "White Clip", stop_note: ">= 98 IRE" }
  ],
  davinci_exposure: [
    { min_ire: -10.0, max_ire: 4.0, color_hex: "#6d28d9", label: "Sub-Black", stop_note: "< 4 IRE" },
    { min_ire: 4.0, max_ire: 18.0, color_hex: "#1d4ed8", label: "Toe", stop_note: "4-18 IRE" },
    { min_ire: 18.0, max_ire: 36.0, color_hex: "#06b6d4", label: "Lower Key", stop_note: "18-36 IRE" },
    { min_ire: 36.0, max_ire: 46.0, color_hex: "#10b981", label: "Middle Grey", stop_note: "36-46 IRE" },
    { min_ire: 46.0, max_ire: 62.0, color_hex: "#f472b6", label: "Skin Zone", stop_note: "46-62 IRE" },
    { min_ire: 62.0, max_ire: 80.0, color_hex: "#e2e8f0", label: "Shoulder", stop_note: "62-80 IRE" },
    { min_ire: 80.0, max_ire: 95.0, color_hex: "#f59e0b", label: "Peak Warn", stop_note: "80-95 IRE" },
    { min_ire: 95.0, max_ire: 120.0, color_hex: "#ef4444", label: "Legal Over", stop_note: ">= 95 IRE" }
  ]
};

export const BROADCAST_STANDARDS_CLIENT = {
  bypass: {
    standard: "bypass",
    label: "Full Range Bypass (0-255)",
    luma_min_8bit: 0,
    luma_max_8bit: 255,
    chroma_min_8bit: 0,
    chroma_max_8bit: 255,
    excursion_warn_pct: 100.0,
    excursion_fail_pct: 100.0,
    summary: "Full-range 0-255 monitoring only; no broadcast legal clamping applied."
  },
  ebu_r103: {
    standard: "ebu_r103",
    label: "EBU R103 Broadcast Safe (16-235)",
    luma_min_8bit: 16,
    luma_max_8bit: 235,
    chroma_min_8bit: 16,
    chroma_max_8bit: 240,
    excursion_warn_pct: 0.25,
    excursion_fail_pct: 1.0,
    summary: "EBU R103 studio range Y 16-235, C 16-240, max 1.0% transient excursion."
  },
  itu_rec709: {
    standard: "itu_rec709",
    label: "ITU-R BT.709 Legal (16-235)",
    luma_min_8bit: 16,
    luma_max_8bit: 235,
    chroma_min_8bit: 16,
    chroma_max_8bit: 240,
    excursion_warn_pct: 0.5,
    excursion_fail_pct: 2.0,
    summary: "ITU-R BT.709 8-bit studio swing Y 16-235 and Cb/Cr 16-240."
  },
  smpte_rp2077: {
    standard: "smpte_rp2077",
    label: "SMPTE RP 2077 Soft Limiter (16-235)",
    luma_min_8bit: 16,
    luma_max_8bit: 235,
    chroma_min_8bit: 16,
    chroma_max_8bit: 240,
    excursion_warn_pct: 0.5,
    excursion_fail_pct: 1.5,
    summary: "SMPTE RP 2077 broadcast television safe gamut with soft-knee rolloff."
  }
};

export function createDefaultBroadcastMonitorConfig() {
  return {
    false_color_enabled: false,
    false_color_palette: "arri_ire",
    false_color_opacity: 0.92,
    zebra: {
      enabled: false,
      high_enabled: true,
      high_ire: 95,
      low_enabled: false,
      low_ire: 5,
      skin_enabled: false,
      skin_min_ire: 48,
      skin_max_ire: 62
    },
    broadcast_standard: "ebu_r103",
    limiter_enabled: false,
    limiter_mode: "soft_knee",
    soft_knee: 0.15,
    luma_min_8bit: 16,
    luma_max_8bit: 235,
    chroma_max_8bit: 240,
    gamut_desaturate_illegal: true
  };
}

export function normalizeBroadcastConfigClient(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const stdRaw = String(src.broadcast_standard || "ebu_r103").trim().toLowerCase();
  const std = Object.prototype.hasOwnProperty.call(BROADCAST_STANDARDS_CLIENT, stdRaw) ? stdRaw : "ebu_r103";
  const spec = BROADCAST_STANDARDS_CLIENT[std];
  const paletteRaw = String(src.false_color_palette || "arri_ire").trim().toLowerCase();
  const palette = Object.prototype.hasOwnProperty.call(FALSE_COLOR_PALETTES_CLIENT, paletteRaw) ? paletteRaw : "arri_ire";
  const zSrc = src.zebra && typeof src.zebra === "object" ? src.zebra : {};
  const skinMin = Math.min(75, Math.max(35, Number(zSrc.skin_min_ire ?? 48)));
  const skinMax = Math.min(80, Math.max(skinMin + 1, Number(zSrc.skin_max_ire ?? 62)));
  const lumaMin = std === "bypass" && src.luma_min_8bit === undefined
    ? 0
    : Math.min(64, Math.max(0, Math.round(Number(src.luma_min_8bit ?? spec.luma_min_8bit))));
  const lumaMax = std === "bypass" && src.luma_max_8bit === undefined
    ? 255
    : Math.min(255, Math.max(Math.max(180, lumaMin + 1), Math.round(Number(src.luma_max_8bit ?? spec.luma_max_8bit))));
  const chromaMax = std === "bypass" && src.chroma_max_8bit === undefined
    ? 255
    : Math.min(255, Math.max(192, Math.round(Number(src.chroma_max_8bit ?? spec.chroma_max_8bit))));
  return {
    false_color_enabled: Boolean(src.false_color_enabled),
    false_color_palette: palette,
    false_color_opacity: Math.min(1.0, Math.max(0.25, Number(src.false_color_opacity ?? 0.92))),
    zebra: {
      enabled: Boolean(zSrc.enabled),
      high_enabled: zSrc.high_enabled !== false,
      high_ire: Math.min(109, Math.max(70, Number(zSrc.high_ire ?? 95))),
      low_enabled: Boolean(zSrc.low_enabled),
      low_ire: Math.min(30, Math.max(0, Number(zSrc.low_ire ?? 5))),
      skin_enabled: Boolean(zSrc.skin_enabled),
      skin_min_ire: skinMin,
      skin_max_ire: skinMax
    },
    broadcast_standard: std,
    limiter_enabled: Boolean(src.limiter_enabled),
    limiter_mode: src.limiter_mode === "hard_clip" ? "hard_clip" : "soft_knee",
    soft_knee: Math.min(1.0, Math.max(0.0, Number(src.soft_knee ?? 0.15))),
    luma_min_8bit: lumaMin,
    luma_max_8bit: lumaMax,
    chroma_max_8bit: chromaMax,
    gamut_desaturate_illegal: src.gamut_desaturate_illegal !== false
  };
}

export function applyBroadcastLegalClampClient(r, g, b, rawConfig) {
  const cfg = normalizeBroadcastConfigClient(rawConfig);
  if (!cfg.limiter_enabled || cfg.broadcast_standard === "bypass") {
    return [
      Math.max(0, Math.min(255, Number(r))),
      Math.max(0, Math.min(255, Number(g))),
      Math.max(0, Math.min(255, Number(b)))
    ];
  }
  const lo = cfg.luma_min_8bit;
  const hi = cfg.luma_max_8bit;
  const kneeRatio = cfg.limiter_mode === "soft_knee" ? cfg.soft_knee : 0.0;
  const clampCh = (val) => {
    if (kneeRatio <= 0.001) return Math.max(lo, Math.min(hi, val));
    const span = Math.max(1, hi - lo);
    const knee = Math.max(2, span * Math.min(0.35, kneeRatio * 0.25));
    const hiStart = hi - knee;
    const loEnd = lo + knee;
    if (val > hiStart) {
      const over = Math.max(0, val - hiStart);
      return Math.min(hi, hiStart + knee * Math.tanh(over / Math.max(1, knee * 1.35)));
    }
    if (val < loEnd) {
      const under = Math.max(0, loEnd - val);
      return Math.max(lo, loEnd - knee * Math.tanh(under / Math.max(1, knee * 1.35)));
    }
    return val;
  };
  let rr = clampCh(Number(r));
  let gg = clampCh(Number(g));
  let bb = clampCh(Number(b));
  if (cfg.gamut_desaturate_illegal) {
    const y = 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
    const maxRadius = Math.max(12, (cfg.chroma_max_8bit - 128) * 1.1);
    const peakDiff = Math.max(Math.abs(rr - y), Math.abs(gg - y), Math.abs(bb - y));
    if (peakDiff > maxRadius && peakDiff > 0.001) {
      const scale = maxRadius / peakDiff;
      rr = Math.max(lo, Math.min(hi, y + (rr - y) * scale));
      gg = Math.max(lo, Math.min(hi, y + (gg - y) * scale));
      bb = Math.max(lo, Math.min(hi, y + (bb - y) * scale));
    }
  }
  return [Number(rr.toFixed(3)), Number(gg.toFixed(3)), Number(bb.toFixed(3))];
}

export function compileBroadcastFilterClient(rawPayload) {
  const cfg = normalizeBroadcastConfigClient(rawPayload && rawPayload.config ? rawPayload.config : rawPayload);
  const spec = BROADCAST_STANDARDS_CLIENT[cfg.broadcast_standard];
  const lo = cfg.luma_min_8bit;
  const hi = cfg.luma_max_8bit;
  const chromaHi = cfg.chroma_max_8bit;
  const chromaLo = chromaHi < 255 ? Math.max(0, 256 - chromaHi) : 0;
  const signalstats_probe_vf = "signalstats=stat=tout+vrep+brng,metadata=print:file=-";
  const warnings = [];
  if (!cfg.limiter_enabled || cfg.broadcast_standard === "bypass") {
    if (cfg.broadcast_standard !== "bypass" && !cfg.limiter_enabled) {
      warnings.push("Broadcast legal limiter is bypassed; output may exceed legal 16-235 range.");
    }
    return {
      filtergraph: "null",
      vf_args: [],
      standard: cfg.broadcast_standard,
      limiter_enabled: false,
      limiter_mode: cfg.limiter_mode,
      legal_min_8bit: spec.luma_min_8bit,
      legal_max_8bit: spec.luma_max_8bit,
      chroma_max_8bit: spec.chroma_max_8bit,
      signalstats_probe_vf,
      warnings
    };
  }
  const filters = [];
  if (cfg.limiter_mode === "soft_knee" && cfg.soft_knee > 0) {
    const span = Math.max(1, hi - lo);
    const kneePx = Math.max(2, Math.round(span * Math.min(0.35, cfg.soft_knee * 0.25)));
    const hiStart = hi - kneePx;
    const loEnd = lo + kneePx;
    const yHi = `${hiStart}+${kneePx}*((val-${hiStart})/(${kneePx}+(val-${hiStart})))`;
    const yLo = `${loEnd}-${kneePx}*((${loEnd}-val)/(${kneePx}+(${loEnd}-val)))`;
    const yExpr = `if(gt(val,${hiStart}),${yHi},if(lt(val,${loEnd}),${yLo},val))`;
    const cClamp = `clip(val,${chromaLo},${chromaHi})`;
    filters.push(`lutyuv=y='${yExpr}':u='${cClamp}':v='${cClamp}'`);
  }
  if (cfg.gamut_desaturate_illegal) {
    const rgbClamp = `clip(val,${lo},${hi})`;
    filters.push(`lutrgb=r='${rgbClamp}':g='${rgbClamp}':b='${rgbClamp}'`);
  }
  filters.push(`limiter=min=${lo}:max=${hi}:planes=7`);
  const fg = filters.join(",");
  return {
    filtergraph: fg,
    vf_args: ["-vf", fg],
    standard: cfg.broadcast_standard,
    limiter_enabled: true,
    limiter_mode: cfg.limiter_mode,
    legal_min_8bit: lo,
    legal_max_8bit: hi,
    chroma_max_8bit: chromaHi,
    signalstats_probe_vf,
    warnings
  };
}

export function analyzeBroadcastComplianceClient(rawPayload) {
  const payload = rawPayload && typeof rawPayload === "object" ? rawPayload : {};
  const cfg = normalizeBroadcastConfigClient(payload.config || payload);
  const spec = BROADCAST_STANDARDS_CLIENT[cfg.broadcast_standard];
  const compiled = compileBroadcastFilterClient(cfg);
  let probeSource = "procedural_preview";
  const workingRgb = [];
  if (Array.isArray(payload.rgb_samples) && payload.rgb_samples.length > 0) {
    probeSource = "samples";
    for (const item of payload.rgb_samples) {
      if (Array.isArray(item) && item.length === 3) {
        workingRgb.push([Number(item[0]), Number(item[1]), Number(item[2])]);
      }
    }
  } else if (Array.isArray(payload.luma_samples) && payload.luma_samples.length > 0) {
    probeSource = "samples";
    for (const val of payload.luma_samples) {
      const v = Math.max(0, Math.min(255, Number(val)));
      workingRgb.push([v, v, v]);
    }
  }
  if (workingRgb.length === 0) {
    const nProc = 128;
    for (let idx = 0; idx < nProc; idx += 1) {
      const t = idx / Math.max(1, nProc - 1);
      if (idx % 16 === 0) {
        workingRgb.push(Math.floor(idx / 16) % 2 === 0 ? [248, 246, 242] : [8, 10, 12]);
      } else if (idx % 7 === 0) {
        workingRgb.push([182, 134, 112]);
      } else {
        const luma = 14 + t * 228;
        workingRgb.push([Math.min(255, luma * 1.03), luma, Math.max(0, luma * 0.96)]);
      }
    }
  }
  const n = workingRgb.length;
  const bins = new Array(32).fill(0);
  const ireMin = -5.0;
  const ireSpan = 114.0;
  const loLegal = cfg.broadcast_standard === "bypass" ? spec.luma_min_8bit : cfg.luma_min_8bit;
  const hiLegal = cfg.broadcast_standard === "bypass" ? spec.luma_max_8bit : cfg.luma_max_8bit;
  const chromaMaxDev = Math.max(12, (cfg.chroma_max_8bit - 128) * 1.1);
  let minIre = Infinity;
  let maxIre = -Infinity;
  let sumIre = 0;
  let minLuma = 255;
  let peakLuma = 0;
  let subBlack = 0;
  let superWhite = 0;
  let skinCount = 0;
  let zHigh = 0;
  let zLow = 0;
  let gamutIllegal = 0;
  for (const [rawR, rawG, rawB] of workingRgb) {
    const [r, g, b] = applyBroadcastLegalClampClient(rawR, rawG, rawB, cfg);
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const ire = ((y - 16) / 219) * 100;
    minIre = Math.min(minIre, ire);
    maxIre = Math.max(maxIre, ire);
    sumIre += ire;
    minLuma = Math.min(minLuma, y);
    peakLuma = Math.max(peakLuma, y);
    const bIdx = Math.max(0, Math.min(31, Math.floor(((ire - ireMin) / ireSpan) * 32)));
    bins[bIdx] += 1;
    if (y < loLegal - 0.05) subBlack += 1;
    if (y > hiLegal + 0.05) superWhite += 1;
    if (ire >= cfg.zebra.skin_min_ire && ire <= cfg.zebra.skin_max_ire) skinCount += 1;
    if (ire >= cfg.zebra.high_ire) zHigh += 1;
    if (ire <= cfg.zebra.low_ire) zLow += 1;
    if (cfg.broadcast_standard !== "bypass") {
      const peakDev = Math.max(Math.abs(r - y), Math.abs(g - y), Math.abs(b - y));
      if (Math.min(r, g, b) < loLegal - 0.05 || Math.max(r, g, b) > hiLegal + 0.05 || peakDev > chromaMaxDev + 0.05) {
        gamutIllegal += 1;
      }
    }
  }
  const maxBin = Math.max(1, ...bins);
  const subBlackPct = Number(((subBlack / n) * 100).toFixed(2));
  const superWhitePct = Number(((superWhite / n) * 100).toFixed(2));
  const gamutIllegalPct = Number(((gamutIllegal / n) * 100).toFixed(2));
  const violations = [];
  if (cfg.broadcast_standard !== "bypass") {
    if (subBlackPct > 0) violations.push(`Sub-black excursion below ${loLegal} (${subBlackPct.toFixed(2)}%)`);
    if (superWhitePct > 0) violations.push(`Super-white excursion above ${hiLegal} (${superWhitePct.toFixed(2)}%)`);
    if (gamutIllegalPct > Math.max(subBlackPct, superWhitePct)) {
      violations.push(`Rec.709 RGB/chroma gamut excursion (${gamutIllegalPct.toFixed(2)}%)`);
    }
  }
  const totalExcursion = Math.max(gamutIllegalPct, subBlackPct + superWhitePct);
  let complianceStatus = "PASS";
  if (cfg.broadcast_standard !== "bypass") {
    if (totalExcursion >= spec.excursion_fail_pct) complianceStatus = "FAIL";
    else if (totalExcursion > spec.excursion_warn_pct) complianceStatus = "WARN";
  }
  return {
    standard: cfg.broadcast_standard,
    limiter_applied: compiled.limiter_enabled,
    sample_count: n,
    min_ire: Number(minIre.toFixed(2)),
    max_ire: Number(maxIre.toFixed(2)),
    avg_ire: Number((sumIre / n).toFixed(2)),
    min_luma_8bit: Math.round(minLuma),
    peak_luma_8bit: Math.round(peakLuma),
    sub_black_pct: subBlackPct,
    super_white_pct: superWhitePct,
    skin_zone_pct: Number(((skinCount / n) * 100).toFixed(2)),
    zebra_high_pct: Number(((zHigh / n) * 100).toFixed(2)),
    zebra_low_pct: Number(((zLow / n) * 100).toFixed(2)),
    gamut_illegal_pct: gamutIllegalPct,
    histogram_bins: bins.map((v) => Number((v / maxBin).toFixed(4))),
    compliance_status: complianceStatus,
    violations,
    probe_source: probeSource,
    filtergraph: compiled.filtergraph
  };
}

// ---------------------------------------------------------------------------
// Auto Reframe & Multi-Aspect Subject Tracking Studio (Client Parity Engine)
// ---------------------------------------------------------------------------

export const AUTO_REFRAME_ASPECT_SPECS_CLIENT = Object.freeze({
  "9:16": Object.freeze({
    aspect_ratio: "9:16",
    ratio_num: 9,
    ratio_den: 16,
    target_width: 1080,
    target_height: 1920,
    label: "9:16 Vertical",
    platform_hint: "Reels / Shorts / TikTok"
  }),
  "4:5": Object.freeze({
    aspect_ratio: "4:5",
    ratio_num: 4,
    ratio_den: 5,
    target_width: 1080,
    target_height: 1350,
    label: "4:5 Portrait Feed",
    platform_hint: "Instagram / LinkedIn Feed"
  }),
  "1:1": Object.freeze({
    aspect_ratio: "1:1",
    ratio_num: 1,
    ratio_den: 1,
    target_width: 1080,
    target_height: 1080,
    label: "1:1 Square",
    platform_hint: "Square Social / Carousel"
  }),
  "21:9": Object.freeze({
    aspect_ratio: "21:9",
    ratio_num: 21,
    ratio_den: 9,
    target_width: 2560,
    target_height: 1080,
    label: "21:9 Cinemascope",
    platform_hint: "Widescreen / Anamorphic"
  }),
  "16:9": Object.freeze({
    aspect_ratio: "16:9",
    ratio_num: 16,
    ratio_den: 9,
    target_width: 1920,
    target_height: 1080,
    label: "16:9 Landscape",
    platform_hint: "YouTube / Broadcast HD"
  })
});

export const AUTO_REFRAME_MOTION_PRESETS_CLIENT = Object.freeze({
  slower: Object.freeze({
    preset: "slower",
    label: "Slower Motion",
    smoothing_window: 1.65,
    deadband_threshold: 0.12,
    max_pan_velocity: 0.28,
    rdp_epsilon: 0.045,
    description: "Tripod and dialogue stabilization with minimal camera drift."
  }),
  default: Object.freeze({
    preset: "default",
    label: "Default Motion",
    smoothing_window: 0.85,
    deadband_threshold: 0.06,
    max_pan_velocity: 0.62,
    rdp_epsilon: 0.028,
    description: "Balanced natural subject follow for interviews and vlogs."
  }),
  faster: Object.freeze({
    preset: "faster",
    label: "Faster Motion",
    smoothing_window: 0.32,
    deadband_threshold: 0.025,
    max_pan_velocity: 1.45,
    rdp_epsilon: 0.016,
    description: "High-agility tracking for sports, dance, and rapid action."
  })
});

const _AR_ASPECT_ALIASES = {
  "9:16": "9:16",
  "4:5": "4:5",
  "1:1": "1:1",
  "21:9": "21:9",
  "2.39:1": "21:9",
  "16:9": "16:9"
};

export function normalizeAutoReframeConfigClient(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const rawAspect = String(src.aspect_ratio || "9:16").trim().toLowerCase();
  const aspect_ratio = _AR_ASPECT_ALIASES[rawAspect] || "9:16";
  const rawPreset = String(src.motion_preset || "default").trim().toLowerCase();
  const motion_preset = Object.hasOwn(AUTO_REFRAME_MOTION_PRESETS_CLIENT, rawPreset)
    ? rawPreset
    : "default";
  const presetSpec = AUTO_REFRAME_MOTION_PRESETS_CLIENT[motion_preset];
  const rawPriority = String(src.subject_priority || "auto_saliency").trim().toLowerCase();
  const subject_priority = ["auto_saliency", "face_headroom", "action_center", "manual_override"].includes(rawPriority)
    ? rawPriority
    : "auto_saliency";
  const defaultHeadroom =
    subject_priority === "face_headroom" ? -0.18 : subject_priority === "action_center" ? 0.0 : -0.12;
  return {
    enabled: src.enabled !== false,
    aspect_ratio,
    motion_preset,
    subject_priority,
    source_width: Math.max(128, Math.min(7680, Math.round(Number(src.source_width ?? 1920) || 1920))),
    source_height: Math.max(128, Math.min(4320, Math.round(Number(src.source_height ?? 1080) || 1080))),
    fps: Math.max(1, Math.min(120, Number(src.fps ?? 25) || 25)),
    duration_s: Math.max(0.2, Math.min(86400, Number(src.duration_s ?? 10) || 10)),
    headroom_bias: clampNum(Number(src.headroom_bias ?? defaultHeadroom), -0.5, 0.5),
    smoothing_window: clampNum(Number(src.smoothing_window ?? presetSpec.smoothing_window), 0.05, 4.0),
    deadband_threshold: clampNum(Number(src.deadband_threshold ?? presetSpec.deadband_threshold), 0.0, 0.4),
    max_pan_velocity: clampNum(Number(src.max_pan_velocity ?? presetSpec.max_pan_velocity), 0.05, 3.0),
    rdp_epsilon: clampNum(Number(src.rdp_epsilon ?? presetSpec.rdp_epsilon), 0.002, 0.2),
    sample_interval_s: clampNum(Number(src.sample_interval_s ?? 0.4), 0.1, 5.0),
    include_scale: src.include_scale !== false
  };
}

function _evenIntClient(val, minV = 2, maxV = 8192) {
  const even = Math.max(minV, Math.min(maxV, Math.floor(Math.round(val) / 2) * 2));
  return Math.max(minV, even);
}

export function computeAutoReframeCropGeometryClient(sourceW, sourceH, aspectRatio) {
  const spec = AUTO_REFRAME_ASPECT_SPECS_CLIENT[aspectRatio] || AUTO_REFRAME_ASPECT_SPECS_CLIENT["9:16"];
  const sw = Math.max(64, Math.round(Number(sourceW) || 1920));
  const sh = Math.max(64, Math.round(Number(sourceH) || 1080));
  const srcAspect = sw / sh;
  const tgtAspect = spec.ratio_num / spec.ratio_den;
  let cropW = sw;
  let cropH = sh;
  if (srcAspect > tgtAspect + 1e-6) {
    cropH = _evenIntClient(sh, 2, sh);
    cropW = _evenIntClient(cropH * tgtAspect, 2, sw);
  } else if (srcAspect < tgtAspect - 1e-6) {
    cropW = _evenIntClient(sw, 2, sw);
    cropH = _evenIntClient(cropW / tgtAspect, 2, sh);
  } else {
    cropW = _evenIntClient(sw, 2, sw);
    cropH = _evenIntClient(sh, 2, sh);
  }
  return {
    crop_width: cropW,
    crop_height: cropH,
    slack_x: Math.max(0, sw - cropW),
    slack_y: Math.max(0, sh - cropH)
  };
}

export function subjectToAutoReframePanClient(
  subjectX,
  subjectY,
  sourceW,
  sourceH,
  aspectRatio,
  headroomBias = -0.12
) {
  const geom = computeAutoReframeCropGeometryClient(sourceW, sourceH, aspectRatio);
  const sx = clampNum(Number(subjectX), 0, 1);
  const sy = clampNum(Number(subjectY), 0, 1);
  let panX = 0;
  let panY = 0;
  if (geom.slack_x > 0) {
    const desiredX = sx * sourceW - geom.crop_width * 0.5;
    const clampedX = clampNum(desiredX, 0, geom.slack_x);
    panX = (clampedX / geom.slack_x) * 2 - 1;
  }
  if (geom.slack_y > 0) {
    const desiredY = sy * sourceH - geom.crop_height * (0.5 + headroomBias * 0.35);
    const clampedY = clampNum(desiredY, 0, geom.slack_y);
    panY = (clampedY / geom.slack_y) * 2 - 1;
  }
  return {
    pan_x: Number(clampNum(panX, -1, 1).toFixed(4)),
    pan_y: Number(clampNum(panY, -1, 1).toFixed(4))
  };
}

export function panToAutoReframeSubjectClient(panX, panY, sourceW, sourceH, aspectRatio) {
  const geom = computeAutoReframeCropGeometryClient(sourceW, sourceH, aspectRatio);
  const px = clampNum(Number(panX), -1, 1);
  const py = clampNum(Number(panY), -1, 1);
  const cropX = geom.slack_x * 0.5 * (1 + px);
  const cropY = geom.slack_y * 0.5 * (1 + py);
  const sx = (cropX + geom.crop_width * 0.5) / Math.max(1, sourceW);
  const sy = (cropY + geom.crop_height * 0.5) / Math.max(1, sourceH);
  return {
    subject_x: Number(clampNum(sx, 0, 1).toFixed(4)),
    subject_y: Number(clampNum(sy, 0, 1).toFixed(4))
  };
}

function _hashSeedBytesClient(seedKey) {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  const txt = String(seedKey || "taktcut_clip");
  for (let i = 0; i < txt.length; i += 1) {
    const ch = txt.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (ch + i), 0x85ebca6b) >>> 0;
  }
  return [
    h1 & 255,
    (h1 >>> 8) & 255,
    (h2 >>> 8) & 255,
    (h2 >>> 16) & 255
  ];
}

export function synthesizeAutoReframeTrajectoryClient(cfg, seedKey = "taktcut_clip") {
  const b = _hashSeedBytesClient(seedKey);
  const phase = (b[0] / 255) * Math.PI * 2;
  let ampX = 0.22 + (b[1] / 255) * 0.18;
  const ampY = 0.08 + (b[2] / 255) * 0.09;
  const cutNorm = 0.48 + (b[3] / 255) * 0.16;
  const dur = Math.max(0.2, Number(cfg.duration_s) || 10);
  const step = Math.max(0.1, Math.min(cfg.sample_interval_s || 0.4, dur / 4));
  const count = Math.max(3, Math.min(180, Math.floor(dur / step) + 1));
  const baseY = cfg.subject_priority === "face_headroom" ? 0.38 : 0.48;
  if (cfg.subject_priority === "action_center") {
    ampX = Math.min(0.42, ampX * 1.32);
  }
  const samples = [];
  for (let idx = 0; idx < count; idx += 1) {
    const u = idx / Math.max(1, count - 1);
    const tS = Number((u * dur).toFixed(3));
    const frame = Math.max(0, Math.round(tS * cfg.fps));
    let sx;
    let sy;
    if (cfg.subject_priority === "manual_override") {
      sx = 0.5 + Math.sin(u * Math.PI * 1.2 + phase) * 0.12;
      sy = baseY;
    } else if (u < cutNorm) {
      sx = 0.5 + Math.sin(u * Math.PI * 2.1 + phase) * ampX;
      sy = baseY + Math.cos(u * Math.PI * 1.5 + phase) * ampY;
    } else {
      sx = 0.5 - Math.cos((u - cutNorm) * Math.PI * 2.4 + phase) * (ampX * 0.92);
      sy = baseY + Math.sin((u - cutNorm) * Math.PI * 1.8) * ampY;
    }
    const energy = clampNum(0.68 + 0.24 * Math.abs(Math.cos(u * Math.PI * 3 + phase)), 0.35, 0.99);
    const conf = clampNum(0.84 + 0.13 * Math.sin(u * Math.PI + 0.4), 0.62, 0.99);
    samples.push({
      time_s: tS,
      frame,
      subject_x: Number(clampNum(sx, 0.08, 0.92).toFixed(4)),
      subject_y: Number(clampNum(sy, 0.12, 0.88).toFixed(4)),
      saliency_energy: Number(energy.toFixed(4)),
      confidence: Number(conf.toFixed(4))
    });
  }
  return samples;
}

function _rdpSimplifyIndicesClient(points, epsilon) {
  const n = points.length;
  if (n <= 2) return points.map((_, i) => i);
  const keep = new Array(n).fill(false);
  keep[0] = true;
  keep[n - 1] = true;
  const stack = [[0, n - 1]];
  while (stack.length > 0) {
    const [startIdx, endIdx] = stack.pop();
    if (endIdx - startIdx <= 1) continue;
    const [t0, x0, y0] = points[startIdx];
    const [t1, x1, y1] = points[endIdx];
    const dt = Math.max(1e-6, t1 - t0);
    let maxDist = -1;
    let splitIdx = -1;
    for (let i = startIdx + 1; i < endIdx; i += 1) {
      const [ti, xi, yi] = points[i];
      const alpha = (ti - t0) / dt;
      const projX = x0 + (x1 - x0) * alpha;
      const projY = y0 + (y1 - y0) * alpha;
      const dist = Math.hypot(xi - projX, yi - projY);
      if (dist > maxDist) {
        maxDist = dist;
        splitIdx = i;
      }
    }
    if (maxDist > epsilon && splitIdx !== -1) {
      keep[splitIdx] = true;
      stack.push([startIdx, splitIdx]);
      stack.push([splitIdx, endIdx]);
    }
  }
  const out = [];
  for (let i = 0; i < n; i += 1) {
    if (keep[i]) out.push(i);
  }
  return out;
}

export function solveAutoReframeKeyframesClient(rawSamples, cfg) {
  const ordered = (Array.isArray(rawSamples) ? rawSamples : [])
    .slice()
    .sort((a, b) => a.time_s - b.time_s || a.frame - b.frame);
  if (ordered.length === 0) {
    return [
      {
        time_s: 0,
        frame: 0,
        pan_x: 0,
        pan_y: 0,
        subject_x: 0.5,
        subject_y: 0.44,
        confidence: 1.0,
        is_manual: false
      }
    ];
  }
  const rawPans = ordered.map((s) =>
    subjectToAutoReframePanClient(
      s.subject_x,
      s.subject_y,
      cfg.source_width,
      cfg.source_height,
      cfg.aspect_ratio,
      cfg.headroom_bias
    )
  );
  const smoothed = [];
  let curX = rawPans[0].pan_x;
  let curY = rawPans[0].pan_y;
  smoothed.push({ pan_x: curX, pan_y: curY });
  for (let i = 1; i < ordered.length; i += 1) {
    const dt = Math.max(0.02, ordered[i].time_s - ordered[i - 1].time_s);
    const tgtX = rawPans[i].pan_x;
    const tgtY = rawPans[i].pan_y;
    const rawJump = Math.hypot(
      ordered[i].subject_x - ordered[i - 1].subject_x,
      ordered[i].subject_y - ordered[i - 1].subject_y
    );
    if (rawJump > 0.42) {
      curX = tgtX;
      curY = tgtY;
      smoothed.push({ pan_x: Number(curX.toFixed(4)), pan_y: Number(curY.toFixed(4)) });
      continue;
    }
    const errX = tgtX - curX;
    const errY = tgtY - curY;
    if (Math.hypot(errX, errY) <= cfg.deadband_threshold) {
      smoothed.push({ pan_x: Number(curX.toFixed(4)), pan_y: Number(curY.toFixed(4)) });
      continue;
    }
    const alpha = 1 - Math.exp(-dt / Math.max(0.05, cfg.smoothing_window * 0.42));
    let stepX = errX * alpha;
    let stepY = errY * alpha;
    const maxStep = cfg.max_pan_velocity * dt;
    const stepMag = Math.hypot(stepX, stepY);
    if (stepMag > maxStep && stepMag > 1e-6) {
      const s = maxStep / stepMag;
      stepX *= s;
      stepY *= s;
    }
    curX = clampNum(curX + stepX, -1, 1);
    curY = clampNum(curY + stepY, -1, 1);
    smoothed.push({ pan_x: Number(curX.toFixed(4)), pan_y: Number(curY.toFixed(4)) });
  }
  const dur = Math.max(0.2, ordered[ordered.length - 1].time_s - ordered[0].time_s);
  const rdpInput = ordered.map((s, i) => [
    (s.time_s - ordered[0].time_s) / dur,
    smoothed[i].pan_x,
    smoothed[i].pan_y
  ]);
  const kept = _rdpSimplifyIndicesClient(rdpInput, cfg.rdp_epsilon);
  return kept.map((i) => {
    const smp = ordered[i];
    const p = smoothed[i];
    const subj = panToAutoReframeSubjectClient(
      p.pan_x,
      p.pan_y,
      cfg.source_width,
      cfg.source_height,
      cfg.aspect_ratio
    );
    return {
      time_s: Number(smp.time_s.toFixed(3)),
      frame: smp.frame,
      pan_x: p.pan_x,
      pan_y: p.pan_y,
      subject_x: subj.subject_x,
      subject_y: subj.subject_y,
      confidence: smp.confidence,
      is_manual: false
    };
  });
}

export function evaluateAutoReframeAtTimeClient(keyframes, timeS) {
  const ordered = (Array.isArray(keyframes) ? keyframes : [])
    .slice()
    .sort((a, b) => a.time_s - b.time_s || (a.frame || 0) - (b.frame || 0));
  const tVal = Math.max(0, Number(timeS) || 0);
  if (ordered.length === 0) {
    return {
      time_s: Number(tVal.toFixed(3)),
      frame: 0,
      pan_x: 0,
      pan_y: 0,
      subject_x: 0.5,
      subject_y: 0.44,
      confidence: 1.0,
      is_manual: false
    };
  }
  if (tVal <= ordered[0].time_s || ordered.length === 1) {
    return { ...ordered[0], time_s: Number(tVal.toFixed(3)) };
  }
  const last = ordered[ordered.length - 1];
  if (tVal >= last.time_s) {
    return { ...last, time_s: Number(tVal.toFixed(3)) };
  }
  for (let i = 0; i < ordered.length - 1; i += 1) {
    const a = ordered[i];
    const b = ordered[i + 1];
    if (tVal <= b.time_s) {
      const span = b.time_s - a.time_s;
      if (span <= 1e-6) return { ...b, time_s: Number(tVal.toFixed(3)) };
      const u = clampNum((tVal - a.time_s) / span, 0, 1);
      const eased = u * u * (3 - 2 * u);
      return {
        time_s: Number(tVal.toFixed(3)),
        frame: Math.round((a.frame || 0) + ((b.frame || 0) - (a.frame || 0)) * u),
        pan_x: Number((a.pan_x + (b.pan_x - a.pan_x) * eased).toFixed(4)),
        pan_y: Number((a.pan_y + (b.pan_y - a.pan_y) * eased).toFixed(4)),
        subject_x: Number(((a.subject_x ?? 0.5) + ((b.subject_x ?? 0.5) - (a.subject_x ?? 0.5)) * eased).toFixed(4)),
        subject_y: Number(((a.subject_y ?? 0.44) + ((b.subject_y ?? 0.44) - (a.subject_y ?? 0.44)) * eased).toFixed(4)),
        confidence: Number(((a.confidence ?? 0.9) + ((b.confidence ?? 0.9) - (a.confidence ?? 0.9)) * u).toFixed(4)),
        is_manual: Boolean(a.is_manual || b.is_manual)
      };
    }
  }
  return last;
}

function _buildPiecewisePanExprClient(keyframes, axis) {
  if (!Array.isArray(keyframes) || keyframes.length === 0) return "0";
  const ordered = keyframes.slice().sort((a, b) => a.time_s - b.time_s || (a.frame || 0) - (b.frame || 0));
  const vals = ordered.map((kf) => Number(axis === "x" ? kf.pan_x : kf.pan_y) || 0);
  if (ordered.length === 1 || vals.every((v) => Math.abs(v - vals[0]) < 1e-4)) {
    return vals[0].toFixed(4);
  }
  let expr = vals[vals.length - 1].toFixed(4);
  for (let i = ordered.length - 2; i >= 0; i -= 1) {
    const t0 = Number(ordered[i].time_s) || 0;
    const t1 = Number(ordered[i + 1].time_s) || 0;
    const v0 = vals[i];
    const v1 = vals[i + 1];
    const dt = t1 - t0;
    const segExpr =
      dt <= 1e-4 || Math.abs(v0 - v1) < 1e-4
        ? v0.toFixed(4)
        : `(${v0.toFixed(4)}+(${((v1 - v0) / dt).toFixed(5)})*(t-${t0.toFixed(3)}))`;
    expr = `if(lt(t,${t1.toFixed(3)}),${segExpr},${expr})`;
  }
  return expr;
}

export function compileAutoReframeFiltergraphClient(cfgRaw, keyframes, includeScaleOverride = null) {
  const cfg = normalizeAutoReframeConfigClient(cfgRaw);
  const spec = AUTO_REFRAME_ASPECT_SPECS_CLIENT[cfg.aspect_ratio] || AUTO_REFRAME_ASPECT_SPECS_CLIENT["9:16"];
  const geom = computeAutoReframeCropGeometryClient(cfg.source_width, cfg.source_height, cfg.aspect_ratio);
  const useScale = includeScaleOverride === null ? cfg.include_scale : Boolean(includeScaleOverride);
  if (!cfg.enabled) {
    return {
      filtergraph: "null",
      ffmpeg_vf_args: [],
      crop_width: geom.crop_width,
      crop_height: geom.crop_height,
      output_width: spec.target_width,
      output_height: spec.target_height,
      aspect_ratio: cfg.aspect_ratio,
      keyframe_count: Array.isArray(keyframes) ? keyframes.length : 0,
      is_active: false,
      x_expr: "0",
      y_expr: "0",
      warnings: ["Auto Reframe is disabled; returning pass-through filtergraph."]
    };
  }
  const ordered = (Array.isArray(keyframes) ? keyframes : [])
    .slice()
    .sort((a, b) => a.time_s - b.time_s || (a.frame || 0) - (b.frame || 0));
  const xExpr =
    geom.slack_x <= 0
      ? "0"
      : `max(0,min(iw-ow,(iw-ow)/2*(1+(${_buildPiecewisePanExprClient(ordered, "x")}))))`;
  const yExpr =
    geom.slack_y <= 0
      ? "0"
      : `max(0,min(ih-oh,(ih-oh)/2*(1+(${_buildPiecewisePanExprClient(ordered, "y")}))))`;
  const cropStage = `crop=w=${geom.crop_width}:h=${geom.crop_height}:x='${xExpr}':y='${yExpr}'`;
  const fg = useScale
    ? `${cropStage},scale=${spec.target_width}:${spec.target_height}:flags=lanczos,setsar=1`
    : `${cropStage},setsar=1`;
  return {
    filtergraph: fg,
    ffmpeg_vf_args: ["-vf", fg],
    crop_width: geom.crop_width,
    crop_height: geom.crop_height,
    output_width: useScale ? spec.target_width : geom.crop_width,
    output_height: useScale ? spec.target_height : geom.crop_height,
    aspect_ratio: cfg.aspect_ratio,
    keyframe_count: ordered.length,
    is_active: true,
    x_expr: xExpr,
    y_expr: yExpr,
    warnings: []
  };
}

export function analyzeAutoReframeClient(payload = {}) {
  const rawCfg = payload && payload.config ? { ...payload.config } : {};
  let clipName = String((payload && payload.clip_name) || "").trim() || "Sequence Clip";
  let mediaPath = String((payload && payload.media_path) || "").trim();
  if (payload && payload.document) {
    const trkIdx = Number.isInteger(payload.track_index) ? payload.track_index : 1;
    const clpIdx = Number.isInteger(payload.clip_index) ? payload.clip_index : 0;
    const found = findTrackAndClip(payload.document, "video", trkIdx, clpIdx);
    const fpsVal = payload.document.fps
      ? Math.max(1, payload.document.fps.num / Math.max(1, payload.document.fps.den))
      : 25;
    if (found && found.clip) {
      clipName = found.clip.name || clipName;
      if (!mediaPath && found.clip.source_path) mediaPath = found.clip.source_path;
      if (rawCfg.fps === undefined) rawCfg.fps = fpsVal;
      if (rawCfg.duration_s === undefined) {
        rawCfg.duration_s = Math.max(0.2, (found.clip.duration_frames || 125) / fpsVal);
      }
    }
  }
  const cfg = normalizeAutoReframeConfigClient(rawCfg);
  const hasCustom = Array.isArray(payload.custom_samples) && payload.custom_samples.length > 0;
  const rawSamples = hasCustom
    ? payload.custom_samples
    : synthesizeAutoReframeTrajectoryClient(
        cfg,
        `${clipName}|${mediaPath}|${cfg.subject_priority}|${cfg.duration_s.toFixed(2)}`
      );
  const keyframes = solveAutoReframeKeyframesClient(rawSamples, cfg);
  const compiled = compileAutoReframeFiltergraphClient(cfg, keyframes);
  let travelX = 0;
  let travelY = 0;
  let peakVel = 0;
  for (let i = 1; i < keyframes.length; i += 1) {
    const dx = Math.abs(keyframes[i].pan_x - keyframes[i - 1].pan_x);
    const dy = Math.abs(keyframes[i].pan_y - keyframes[i - 1].pan_y);
    const dt = Math.max(0.05, keyframes[i].time_s - keyframes[i - 1].time_s);
    travelX += dx;
    travelY += dy;
    peakVel = Math.max(peakVel, Math.hypot(dx, dy) / dt);
  }
  const avgConf =
    keyframes.reduce((acc, k) => acc + (Number(k.confidence) || 0.9), 0) / Math.max(1, keyframes.length);
  let rawJitter = 0;
  for (let i = 1; i < rawSamples.length; i += 1) {
    rawJitter += Math.abs(rawSamples[i].subject_x - rawSamples[i - 1].subject_x);
  }
  const smoothness =
    rawJitter > 1e-4
      ? clampNum(100 * (1 - Math.min(1, (travelX * 0.5) / (rawJitter * 1.4 + 0.1))), 45, 99.5)
      : 98.5;
  return {
    config: cfg,
    raw_samples: rawSamples,
    keyframes,
    stats: {
      raw_sample_count: rawSamples.length,
      keyframe_count: keyframes.length,
      pan_travel_x: Number(travelX.toFixed(3)),
      pan_travel_y: Number(travelY.toFixed(3)),
      avg_confidence: Number(avgConf.toFixed(4)),
      peak_velocity: Number(peakVel.toFixed(3)),
      smoothness_score: Number(smoothness.toFixed(1)),
      crop_width: compiled.crop_width,
      crop_height: compiled.crop_height,
      output_width: compiled.output_width,
      output_height: compiled.output_height
    },
    compiled,
    probe_source: hasCustom ? "custom_samples" : "procedural_saliency",
    clip_name: clipName,
    warnings: []
  };
}

export function applyAutoReframeToDocumentClient(doc, payload = {}) {
  const trkKind = payload && payload.track_kind === "audio" ? "audio" : "video";
  if (trkKind !== "video") throw new Error("Auto Reframe can only be applied to video tracks");
  const trkIdx = Number.isInteger(payload.track_index) ? payload.track_index : 1;
  const clpIdx = Number.isInteger(payload.clip_index) ? payload.clip_index : 0;
  const foundOrig = findTrackAndClip(doc, trkKind, trkIdx, clpIdx);
  if (!foundOrig) throw new Error(`Track ${trkKind} #${trkIdx} clip ${clpIdx} not found`);
  const cfg = normalizeAutoReframeConfigClient(payload.config);
  let kfs = Array.isArray(payload.keyframes) && payload.keyframes.length > 0 ? payload.keyframes : null;
  if (!kfs) {
    const analyzed = analyzeAutoReframeClient({
      document: doc,
      track_index: trkIdx,
      clip_index: clpIdx,
      config: cfg
    });
    kfs = analyzed.keyframes;
  }
  const trackModel = {
    enabled: cfg.enabled,
    aspect_ratio: cfg.aspect_ratio,
    motion_preset: cfg.motion_preset,
    subject_priority: cfg.subject_priority,
    headroom_bias: cfg.headroom_bias,
    keyframes: kfs.slice().sort((a, b) => a.time_s - b.time_s || (a.frame || 0) - (b.frame || 0))
  };
  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, trkKind, trkIdx, clpIdx);
  if (found && found.clip) {
    found.clip.auto_reframe = trackModel;
  }
  return {
    changed: true,
    track_kind: trkKind,
    track_index: trkIdx,
    clip_index: clpIdx,
    clip_name: foundOrig.clip.name,
    auto_reframe: trackModel,
    compiled: compileAutoReframeFiltergraphClient(cfg, trackModel.keyframes),
    document: nextDoc
  };
}

export function clearAutoReframeFromDocumentClient(doc, payload = {}) {
  const trkKind = payload && payload.track_kind === "audio" ? "audio" : "video";
  const trkIdx = Number.isInteger(payload.track_index) ? payload.track_index : 1;
  const clpIdx = Number.isInteger(payload.clip_index) ? payload.clip_index : 0;
  const foundOrig = findTrackAndClip(doc, trkKind, trkIdx, clpIdx);
  if (!foundOrig) throw new Error(`Track ${trkKind} #${trkIdx} clip ${clpIdx} not found`);
  const hadReframe = Boolean(foundOrig.clip && foundOrig.clip.auto_reframe);
  const nextDoc = cloneTimelineDoc(doc);
  const found = findTrackAndClip(nextDoc, trkKind, trkIdx, clpIdx);
  if (found && found.clip) {
    found.clip.auto_reframe = null;
  }
  return {
    changed: hadReframe,
    track_kind: trkKind,
    track_index: trkIdx,
    clip_index: clpIdx,
    clip_name: foundOrig.clip.name,
    auto_reframe: null,
    document: nextDoc
  };
}


// =============================================================================
// CAMERA LOG COLOR-SPACE TRANSFORM (CST / IDT -> ODT), BRADFORD 3x3 & FILMIC
// =============================================================================

export const ALLOWED_CST_INPUT_SPACES = [
  "arri_logc3",
  "arri_logc4",
  "sony_slog3",
  "red_log3g10",
  "canon_clog2",
  "panasonic_vlog",
  "acescct",
  "rec709_gamma24",
  "linear_srgb"
];

export const ALLOWED_CST_OUTPUT_SPACES = [
  "rec709_gamma24",
  "srgb_piecewise",
  "display_p3",
  "rec2020_pq",
  "rec2020_hlg",
  "acescct_ap1"
];

export const ALLOWED_CST_TONE_MAPPING_MODES = [
  "none",
  "simple_reinhard",
  "filmic_aces",
  "luminance_bt2390"
];

export const ALLOWED_CST_GAMUT_MAPPING_MODES = [
  "none",
  "clip",
  "saturation_compress",
  "luminance_preserve"
];

const CST_BRADFORD_M = [
  [0.8951, 0.2664, -0.1614],
  [-0.7502, 1.7135, 0.0367],
  [0.0389, -0.0685, 1.0296]
];

const CST_BRADFORD_M_INV = [
  [0.9869929, -0.1470543, 0.1599627],
  [0.4323053, 0.5183603, 0.0492912],
  [-0.0085287, 0.0400428, 0.9684867]
];

const CST_PRIMARIES = {
  rec709: { rx: 0.64, ry: 0.33, gx: 0.3, gy: 0.6, bx: 0.15, by: 0.06, wx: 0.3127, wy: 0.329, white_name: "D65" },
  display_p3: { rx: 0.68, ry: 0.32, gx: 0.265, gy: 0.69, bx: 0.15, by: 0.06, wx: 0.3127, wy: 0.329, white_name: "D65" },
  rec2020: { rx: 0.708, ry: 0.292, gx: 0.17, gy: 0.797, bx: 0.131, by: 0.046, wx: 0.3127, wy: 0.329, white_name: "D65" },
  awg3: { rx: 0.684, ry: 0.313, gx: 0.221, gy: 0.848, bx: 0.0861, by: -0.102, wx: 0.3127, wy: 0.329, white_name: "D65" },
  awg4: { rx: 0.7347, ry: 0.2653, gx: 0.1424, gy: 0.8576, bx: 0.0991, by: -0.0308, wx: 0.3127, wy: 0.329, white_name: "D65" },
  sgamut3_cine: { rx: 0.766, ry: 0.275, gx: 0.225, gy: 0.8, bx: 0.089, by: -0.087, wx: 0.3127, wy: 0.329, white_name: "D65" },
  red_rwg: { rx: 0.780308, ry: 0.304253, gx: 0.121595, gy: 1.493994, bx: 0.095612, by: -0.084589, wx: 0.3127, wy: 0.329, white_name: "D65" },
  canon_cinema: { rx: 0.74, ry: 0.27, gx: 0.17, gy: 1.14, bx: 0.08, by: -0.1, wx: 0.3127, wy: 0.329, white_name: "D65" },
  panasonic_vgamut: { rx: 0.73, ry: 0.28, gx: 0.165, gy: 0.84, bx: 0.1, by: -0.03, wx: 0.3127, wy: 0.329, white_name: "D65" },
  aces_ap1: { rx: 0.713, ry: 0.293, gx: 0.165, gy: 0.83, bx: 0.128, by: 0.044, wx: 0.32168, wy: 0.33767, white_name: "D60" }
};

export const CST_INPUT_SPACES_CLIENT = {
  arri_logc4: { space_id: "arri_logc4", label: "ARRI LogC4 (AWG4)", vendor: "ARRI", transfer_label: "LogC4 (REVEAL)", gamut_label: "ARRI Wide Gamut 4", white_point: "D65", is_log: true, is_hdr: false, primaries: CST_PRIMARIES.awg4, dynamic_range_stops: 17.0, middle_grey_signal: 0.2784 },
  arri_logc3: { space_id: "arri_logc3", label: "ARRI LogC3 EI 800 (AWG3)", vendor: "ARRI", transfer_label: "LogC3 EI 800", gamut_label: "ARRI Wide Gamut 3", white_point: "D65", is_log: true, is_hdr: false, primaries: CST_PRIMARIES.awg3, dynamic_range_stops: 14.5, middle_grey_signal: 0.391 },
  sony_slog3: { space_id: "sony_slog3", label: "Sony S-Log3 (S-Gamut3.Cine)", vendor: "Sony", transfer_label: "S-Log3", gamut_label: "S-Gamut3.Cine", white_point: "D65", is_log: true, is_hdr: false, primaries: CST_PRIMARIES.sgamut3_cine, dynamic_range_stops: 15.0, middle_grey_signal: 0.4106 },
  red_log3g10: { space_id: "red_log3g10", label: "RED Log3G10 (REDWideGamutRGB)", vendor: "RED", transfer_label: "Log3G10", gamut_label: "REDWideGamutRGB", white_point: "D65", is_log: true, is_hdr: false, primaries: CST_PRIMARIES.red_rwg, dynamic_range_stops: 16.5, middle_grey_signal: 0.3333 },
  canon_clog2: { space_id: "canon_clog2", label: "Canon C-Log2 (Cinema Gamut)", vendor: "Canon", transfer_label: "Canon Log 2", gamut_label: "Cinema Gamut", white_point: "D65", is_log: true, is_hdr: false, primaries: CST_PRIMARIES.canon_cinema, dynamic_range_stops: 15.0, middle_grey_signal: 0.3982 },
  panasonic_vlog: { space_id: "panasonic_vlog", label: "Panasonic V-Log (V-Gamut)", vendor: "Panasonic", transfer_label: "V-Log", gamut_label: "V-Gamut", white_point: "D65", is_log: true, is_hdr: false, primaries: CST_PRIMARIES.panasonic_vgamut, dynamic_range_stops: 14.5, middle_grey_signal: 0.4233 },
  acescct: { space_id: "acescct", label: "ACEScct (AP1 D60)", vendor: "ACES", transfer_label: "ACEScct", gamut_label: "ACES AP1", white_point: "D60", is_log: true, is_hdr: false, primaries: CST_PRIMARIES.aces_ap1, dynamic_range_stops: 16.5, middle_grey_signal: 0.4135 },
  rec709_gamma24: { space_id: "rec709_gamma24", label: "Rec.709 / Gamma 2.4", vendor: "ITU-R", transfer_label: "BT.1886 Gamma 2.4", gamut_label: "Rec.709", white_point: "D65", is_log: false, is_hdr: false, primaries: CST_PRIMARIES.rec709, dynamic_range_stops: 9.5, middle_grey_signal: 0.489 },
  linear_srgb: { space_id: "linear_srgb", label: "Linear Scene-Referred (Rec.709)", vendor: "Generic", transfer_label: "Linear 1.0", gamut_label: "Rec.709 / sRGB", white_point: "D65", is_log: false, is_hdr: false, primaries: CST_PRIMARIES.rec709, dynamic_range_stops: 14.0, middle_grey_signal: 0.18 }
};

export const CST_OUTPUT_SPACES_CLIENT = {
  rec709_gamma24: { space_id: "rec709_gamma24", label: "Rec.709 (Gamma 2.4 / BT.1886)", vendor: "ITU-R", transfer_label: "Gamma 2.4", gamut_label: "Rec.709", white_point: "D65", is_log: false, is_hdr: false, primaries: CST_PRIMARIES.rec709, dynamic_range_stops: 9.5, middle_grey_signal: 0.489 },
  srgb_piecewise: { space_id: "srgb_piecewise", label: "sRGB (IEC 61966-2-1 Web)", vendor: "IEC", transfer_label: "sRGB Piecewise", gamut_label: "sRGB / Rec.709", white_point: "D65", is_log: false, is_hdr: false, primaries: CST_PRIMARIES.rec709, dynamic_range_stops: 9.0, middle_grey_signal: 0.4614 },
  display_p3: { space_id: "display_p3", label: "Display P3 (Cinema / Apple D65)", vendor: "DCI / Apple", transfer_label: "sRGB / Gamma 2.2", gamut_label: "Display P3", white_point: "D65", is_log: false, is_hdr: false, primaries: CST_PRIMARIES.display_p3, dynamic_range_stops: 10.5, middle_grey_signal: 0.4614 },
  rec2020_pq: { space_id: "rec2020_pq", label: "Rec.2020 PQ (ST 2084 HDR 1000 nits)", vendor: "SMPTE", transfer_label: "ST 2084 PQ", gamut_label: "Rec.2020", white_point: "D65", is_log: false, is_hdr: true, primaries: CST_PRIMARIES.rec2020, dynamic_range_stops: 14.0, middle_grey_signal: 0.382 },
  rec2020_hlg: { space_id: "rec2020_hlg", label: "Rec.2020 HLG (ARIB STD-B67 HDR)", vendor: "ARIB / BBC", transfer_label: "Hybrid Log-Gamma", gamut_label: "Rec.2020", white_point: "D65", is_log: false, is_hdr: true, primaries: CST_PRIMARIES.rec2020, dynamic_range_stops: 12.5, middle_grey_signal: 0.45 },
  acescct_ap1: { space_id: "acescct_ap1", label: "ACEScct (AP1 D60 Working Space)", vendor: "ACES", transfer_label: "ACEScct", gamut_label: "ACES AP1", white_point: "D60", is_log: true, is_hdr: false, primaries: CST_PRIMARIES.aces_ap1, dynamic_range_stops: 16.5, middle_grey_signal: 0.4135 }
};

export const CST_PRESETS_CLIENT = [
  {
    preset_id: "arri_logc4_to_rec709",
    label: "ARRI LogC4 -> Rec.709",
    description: "ARRI Alexa 35 LogC4 / AWG4 to Rec.709 BT.1886 with REVEAL-inspired filmic shoulder.",
    category: "cinema_log_sdr",
    config: { enabled: true, preset_id: "arri_logc4_to_rec709", input_space: "arri_logc4", output_space: "rec709_gamma24", bradford_adaptation: true, white_point_shift_k: 0, gamut_mapping_mode: "saturation_compress", gamut_compression: 0.35, tone_mapping_mode: "filmic_aces", exposure_ev: 0, contrast: 1.02, shoulder_strength: 0.6, toe_strength: 0.35, white_point_nits: 100, black_point_offset: 0, saturation: 1.02 }
  },
  {
    preset_id: "arri_logc3_to_rec709",
    label: "ARRI LogC3 -> Rec.709",
    description: "ARRI Alexa Mini LogC3 EI 800 / AWG3 to Rec.709 Gamma 2.4 broadcast curve.",
    category: "cinema_log_sdr",
    config: { enabled: true, preset_id: "arri_logc3_to_rec709", input_space: "arri_logc3", output_space: "rec709_gamma24", bradford_adaptation: true, white_point_shift_k: 0, gamut_mapping_mode: "saturation_compress", gamut_compression: 0.3, tone_mapping_mode: "filmic_aces", exposure_ev: 0, contrast: 1.0, shoulder_strength: 0.55, toe_strength: 0.3, white_point_nits: 100, black_point_offset: 0, saturation: 1.0 }
  },
  {
    preset_id: "sony_slog3_to_rec709",
    label: "Sony S-Log3 -> Rec.709",
    description: "Sony Venice / FX6 S-Log3 S-Gamut3.Cine to Rec.709 with clean highlight roll-off.",
    category: "cinema_log_sdr",
    config: { enabled: true, preset_id: "sony_slog3_to_rec709", input_space: "sony_slog3", output_space: "rec709_gamma24", bradford_adaptation: true, white_point_shift_k: 0, gamut_mapping_mode: "saturation_compress", gamut_compression: 0.38, tone_mapping_mode: "filmic_aces", exposure_ev: 0.1, contrast: 1.04, shoulder_strength: 0.58, toe_strength: 0.38, white_point_nits: 100, black_point_offset: 0, saturation: 1.03 }
  },
  {
    preset_id: "red_rwg_to_rec709",
    label: "RED Log3G10 -> Rec.709",
    description: "RED V-Raptor Log3G10 / REDWideGamutRGB with aggressive cyan-magenta gamut compression.",
    category: "cinema_log_sdr",
    config: { enabled: true, preset_id: "red_rwg_to_rec709", input_space: "red_log3g10", output_space: "rec709_gamma24", bradford_adaptation: true, white_point_shift_k: 0, gamut_mapping_mode: "saturation_compress", gamut_compression: 0.5, tone_mapping_mode: "filmic_aces", exposure_ev: 0, contrast: 1.05, shoulder_strength: 0.62, toe_strength: 0.32, white_point_nits: 100, black_point_offset: 0, saturation: 1.0 }
  },
  {
    preset_id: "canon_clog2_to_rec709",
    label: "Canon C-Log2 -> Rec.709",
    description: "Canon C70 / C300 Mk III C-Log2 Cinema Gamut to natural Rec.709 skin tones.",
    category: "cinema_log_sdr",
    config: { enabled: true, preset_id: "canon_clog2_to_rec709", input_space: "canon_clog2", output_space: "rec709_gamma24", bradford_adaptation: true, white_point_shift_k: 0, gamut_mapping_mode: "saturation_compress", gamut_compression: 0.4, tone_mapping_mode: "filmic_aces", exposure_ev: 0, contrast: 1.0, shoulder_strength: 0.52, toe_strength: 0.36, white_point_nits: 100, black_point_offset: 0, saturation: 1.02 }
  },
  {
    preset_id: "panasonic_vlog_to_p3",
    label: "Panasonic V-Log -> Display P3",
    description: "Panasonic V-Log / V-Gamut mastered to wide-gamut Display P3 for cinema/Apple OLED.",
    category: "cinema_log_sdr",
    config: { enabled: true, preset_id: "panasonic_vlog_to_p3", input_space: "panasonic_vlog", output_space: "display_p3", bradford_adaptation: true, white_point_shift_k: 0, gamut_mapping_mode: "saturation_compress", gamut_compression: 0.28, tone_mapping_mode: "filmic_aces", exposure_ev: 0, contrast: 1.02, shoulder_strength: 0.5, toe_strength: 0.3, white_point_nits: 100, black_point_offset: 0, saturation: 1.04 }
  },
  {
    preset_id: "acescct_to_rec2020_pq",
    label: "ACEScct D60 -> Rec.2020 PQ",
    description: "ACEScct AP1 (D60) to Rec.2020 ST.2084 PQ 1000-nit HDR with Bradford D60->D65.",
    category: "aces_pipeline",
    config: { enabled: true, preset_id: "acescct_to_rec2020_pq", input_space: "acescct", output_space: "rec2020_pq", bradford_adaptation: true, white_point_shift_k: 0, gamut_mapping_mode: "luminance_preserve", gamut_compression: 0.22, tone_mapping_mode: "luminance_bt2390", exposure_ev: 0, contrast: 1.0, shoulder_strength: 0.45, toe_strength: 0.2, white_point_nits: 1000, black_point_offset: 0, saturation: 1.0 }
  },
  {
    preset_id: "slog3_to_hlg_hdr",
    label: "Sony S-Log3 -> Rec.2020 HLG",
    description: "Sony S-Log3 broadcast HDR delivery to Rec.2020 Hybrid Log-Gamma (ARIB STD-B67).",
    category: "cinema_log_hdr",
    config: { enabled: true, preset_id: "slog3_to_hlg_hdr", input_space: "sony_slog3", output_space: "rec2020_hlg", bradford_adaptation: true, white_point_shift_k: 0, gamut_mapping_mode: "saturation_compress", gamut_compression: 0.25, tone_mapping_mode: "luminance_bt2390", exposure_ev: 0, contrast: 1.0, shoulder_strength: 0.4, toe_strength: 0.22, white_point_nits: 1000, black_point_offset: 0, saturation: 1.0 }
  }
];

export function createDefaultCstConfigClient() {
  return {
    enabled: false,
    preset_id: "arri_logc4_to_rec709",
    input_space: "arri_logc4",
    output_space: "rec709_gamma24",
    bradford_adaptation: true,
    white_point_shift_k: 0.0,
    gamut_mapping_mode: "saturation_compress",
    gamut_compression: 0.35,
    tone_mapping_mode: "filmic_aces",
    exposure_ev: 0.0,
    contrast: 1.0,
    shoulder_strength: 0.55,
    toe_strength: 0.35,
    white_point_nits: 100.0,
    black_point_offset: 0.0,
    saturation: 1.0
  };
}

export function normalizeCstConfigClient(raw) {
  const def = createDefaultCstConfigClient();
  const src = raw && typeof raw === "object" ? raw : {};
  const inputSpace = ALLOWED_CST_INPUT_SPACES.includes(src.input_space) ? src.input_space : def.input_space;
  const outputSpace = ALLOWED_CST_OUTPUT_SPACES.includes(src.output_space) ? src.output_space : def.output_space;
  const toneMode = ALLOWED_CST_TONE_MAPPING_MODES.includes(src.tone_mapping_mode) ? src.tone_mapping_mode : def.tone_mapping_mode;
  const gamutMode = ALLOWED_CST_GAMUT_MAPPING_MODES.includes(src.gamut_mapping_mode) ? src.gamut_mapping_mode : def.gamut_mapping_mode;
  const num = (v, fb, lo, hi) => {
    const n = Number(v);
    return Number.isFinite(n) ? clampNum(n, lo, hi) : fb;
  };
  return {
    enabled: typeof src.enabled === "boolean" ? src.enabled : def.enabled,
    preset_id: typeof src.preset_id === "string" && src.preset_id.trim() ? src.preset_id.trim().slice(0, 64) : def.preset_id,
    input_space: inputSpace,
    output_space: outputSpace,
    bradford_adaptation: typeof src.bradford_adaptation === "boolean" ? src.bradford_adaptation : def.bradford_adaptation,
    white_point_shift_k: num(src.white_point_shift_k, def.white_point_shift_k, -2500, 2500),
    gamut_mapping_mode: gamutMode,
    gamut_compression: num(src.gamut_compression, def.gamut_compression, 0, 1),
    tone_mapping_mode: toneMode,
    exposure_ev: num(src.exposure_ev, def.exposure_ev, -6, 6),
    contrast: num(src.contrast, def.contrast, 0.5, 2.0),
    shoulder_strength: num(src.shoulder_strength, def.shoulder_strength, 0, 1),
    toe_strength: num(src.toe_strength, def.toe_strength, 0, 1),
    white_point_nits: num(src.white_point_nits, def.white_point_nits, 100, 4000),
    black_point_offset: num(src.black_point_offset, def.black_point_offset, -0.05, 0.05),
    saturation: num(src.saturation, def.saturation, 0, 2.0)
  };
}

function cstMatmul3x3(a, b) {
  const out = [];
  for (let i = 0; i < 3; i += 1) {
    out.push([
      a[i][0] * b[0][0] + a[i][1] * b[1][0] + a[i][2] * b[2][0],
      a[i][0] * b[0][1] + a[i][1] * b[1][1] + a[i][2] * b[2][1],
      a[i][0] * b[0][2] + a[i][1] * b[1][2] + a[i][2] * b[2][2]
    ]);
  }
  return out;
}

function cstMatvec3x3(m, v) {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
  ];
}

function cstInvert3x3(m) {
  const [a, b, c] = m[0];
  const [d, e, f] = m[1];
  const [g, h, i] = m[2];
  const c00 = e * i - f * h;
  const c01 = -(d * i - f * g);
  const c02 = d * h - e * g;
  const c10 = -(b * i - c * h);
  const c11 = a * i - c * g;
  const c12 = -(a * h - b * g);
  const c20 = b * f - c * e;
  const c21 = -(a * f - c * d);
  const c22 = a * e - b * d;
  const det = a * c00 + b * c01 + c * c02;
  const invDet = Math.abs(det) < 1e-12 ? 1.0 : 1.0 / det;
  return [
    [c00 * invDet, c10 * invDet, c20 * invDet],
    [c01 * invDet, c11 * invDet, c21 * invDet],
    [c02 * invDet, c12 * invDet, c22 * invDet]
  ];
}

function cstXyToXyz(x, y) {
  const safeY = Math.max(1e-6, y);
  return [x / safeY, 1.0, (1.0 - x - y) / safeY];
}

function cstKelvinToCieXy(kelvin) {
  const t = clampNum(kelvin, 2500, 15000);
  const x =
    t <= 7000
      ? -4.607e9 / (t * t * t) + 2.9678e6 / (t * t) + 0.09911e3 / t + 0.244063
      : -2.0064e9 / (t * t * t) + 1.9018e6 / (t * t) + 0.24748e3 / t + 0.23704;
  const y = -3.0 * x * x + 2.87 * x - 0.275;
  return [x, Math.max(0.15, y)];
}

export function computeRgbToXyz3x3Client(primaries) {
  const xr = primaries.rx;
  const yr = primaries.ry;
  const xg = primaries.gx;
  const yg = primaries.gy;
  const xb = primaries.bx;
  const yb = Math.abs(primaries.by) > 1e-6 ? primaries.by : 1e-6;
  const xrXyz = xr / yr;
  const zrXyz = (1 - xr - yr) / yr;
  const xgXyz = xg / yg;
  const zgXyz = (1 - xg - yg) / yg;
  const xbXyz = xb / yb;
  const zbXyz = (1 - xb - primaries.by) / yb;
  const mPrim = [
    [xrXyz, xgXyz, xbXyz],
    [1.0, 1.0, 1.0],
    [zrXyz, zgXyz, zbXyz]
  ];
  const mPrimInv = cstInvert3x3(mPrim);
  const [sr, sg, sb] = cstMatvec3x3(mPrimInv, cstXyToXyz(primaries.wx, primaries.wy));
  return [
    [sr * xrXyz, sg * xgXyz, sb * xbXyz],
    [sr, sg, sb],
    [sr * zrXyz, sg * zgXyz, sb * zbXyz]
  ];
}

export function computeBradfordAdaptation3x3Client(srcWhiteXy, dstWhiteXy) {
  if (Math.abs(srcWhiteXy[0] - dstWhiteXy[0]) < 1e-6 && Math.abs(srcWhiteXy[1] - dstWhiteXy[1]) < 1e-6) {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];
  }
  const srcCone = cstMatvec3x3(CST_BRADFORD_M, cstXyToXyz(srcWhiteXy[0], srcWhiteXy[1]));
  const dstCone = cstMatvec3x3(CST_BRADFORD_M, cstXyToXyz(dstWhiteXy[0], dstWhiteXy[1]));
  const diag = [
    [dstCone[0] / Math.max(1e-6, srcCone[0]), 0, 0],
    [0, dstCone[1] / Math.max(1e-6, srcCone[1]), 0],
    [0, 0, dstCone[2] / Math.max(1e-6, srcCone[2])]
  ];
  return cstMatmul3x3(CST_BRADFORD_M_INV, cstMatmul3x3(diag, CST_BRADFORD_M));
}

export function computeCstGamutMatrixClient(rawConfig) {
  const cfg = normalizeCstConfigClient(rawConfig);
  const srcSpec = CST_INPUT_SPACES_CLIENT[cfg.input_space];
  const dstSpec = CST_OUTPUT_SPACES_CLIENT[cfg.output_space];
  const srcP = srcSpec.primaries;
  const dstP = dstSpec.primaries;
  const mSrc = computeRgbToXyz3x3Client(srcP);
  const mDstInv = cstInvert3x3(computeRgbToXyz3x3Client(dstP));
  let srcWhite = [srcP.wx, srcP.wy];
  const dstWhite = [dstP.wx, dstP.wy];
  if (Math.abs(cfg.white_point_shift_k) >= 1.0) {
    const baseK = srcP.white_name === "D60" ? 6000.0 : 6504.0;
    srcWhite = cstKelvinToCieXy(baseK - cfg.white_point_shift_k);
  }
  const whiteDiff = Math.abs(srcWhite[0] - dstWhite[0]) > 1e-5 || Math.abs(srcWhite[1] - dstWhite[1]) > 1e-5;
  const bradfordActive = Boolean(cfg.bradford_adaptation && whiteDiff);
  const mAdapt = bradfordActive
    ? computeBradfordAdaptation3x3Client(srcWhite, dstWhite)
    : [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ];
  const mCombined = cstMatmul3x3(mDstInv, cstMatmul3x3(mAdapt, mSrc));
  return { mCombined, mAdapt, srcP, dstP, bradfordActive };
}

export function eotfDecodeCstChannelClient(v, space) {
  if (space === "arri_logc3") {
    const cut = 0.010591;
    const a = 5.555556;
    const b = 0.052272;
    const c = 0.24719;
    const d = 0.385537;
    const e = 5.367655;
    const f = 0.092809;
    return v > e * cut + f ? (Math.pow(10, (v - d) / c) - b) / a : (v - f) / e;
  }
  if (space === "arri_logc4") {
    const a = (262144.0 - 16.0) / 117.45;
    const b = (1023.0 - 95.0) / 1023.0;
    const c = 95.0 / 1023.0;
    const s = (7.0 * Math.LN2 * Math.pow(2.0, 7.0 - (14.0 * c) / b)) / (a * b);
    const t = (Math.pow(2.0, 14.0 * (-c / b) + 6.0) - 64.0) / a;
    return v >= 0.0 ? (Math.pow(2.0, 14.0 * ((v - c) / b) + 6.0) - 64.0) / a : v * s + t;
  }
  if (space === "sony_slog3") {
    const cut = 171.2102946929 / 1023.0;
    return v >= cut
      ? Math.pow(10.0, (v * 1023.0 - 420.0) / 261.5) * 0.19 - 0.01
      : ((v * 1023.0 - 95.0) * 0.01125) / (171.2102946929 - 95.0);
  }
  if (space === "red_log3g10") {
    const a = 0.224282;
    const b = 155.975327;
    const c = 0.01;
    const g = 15.1927;
    return v < 0.0 ? v / g - c : (Math.pow(10.0, v / a) - 1.0) / b - c;
  }
  if (space === "canon_clog2") {
    const c0 = 0.092864125;
    return v >= c0
      ? (Math.pow(10.0, (v - c0) / 0.24136077) - 1.0) / 87.099375
      : -(Math.pow(10.0, (c0 - v) / 0.24136077) - 1.0) / 87.099375;
  }
  if (space === "panasonic_vlog") {
    return v < 0.181 ? (v - 0.125) / 5.6 : Math.pow(10.0, (v - 0.598206) / 0.241514) - 0.00873;
  }
  if (space === "acescct") {
    return v <= 0.155251141552511
      ? (v - 0.0729055341958355) / 10.5402377416545
      : Math.pow(2.0, v * 17.52 - 9.72);
  }
  if (space === "rec709_gamma24") {
    return Math.pow(Math.max(0.0, v), 2.4);
  }
  return v;
}

export function encodeInputLogChannelClient(xLinear, space) {
  if (space === "arri_logc3") {
    const cut = 0.010591;
    return clampNum(
      xLinear > cut ? 0.24719 * Math.log10(Math.max(1e-9, 5.555556 * xLinear + 0.052272)) + 0.385537 : 5.367655 * xLinear + 0.092809,
      0,
      1
    );
  }
  if (space === "arri_logc4") {
    const a = (262144.0 - 16.0) / 117.45;
    const b = (1023.0 - 95.0) / 1023.0;
    const c = 95.0 / 1023.0;
    const s = (7.0 * Math.LN2 * Math.pow(2.0, 7.0 - (14.0 * c) / b)) / (a * b);
    const t = (Math.pow(2.0, 14.0 * (-c / b) + 6.0) - 64.0) / a;
    return clampNum(xLinear >= t ? ((Math.log2(Math.max(1e-9, a * xLinear + 64.0)) - 6.0) / 14.0) * b + c : (xLinear - t) / s, 0, 1);
  }
  if (space === "sony_slog3") {
    return clampNum(
      xLinear >= 0.01125
        ? (420.0 + Math.log10((xLinear + 0.01) / 0.19) * 261.5) / 1023.0
        : ((xLinear * (171.2102946929 - 95.0)) / 0.01125 + 95.0) / 1023.0,
      0,
      1
    );
  }
  if (space === "red_log3g10") {
    const xc = xLinear + 0.01;
    return clampNum(xc < 0 ? xc * 15.1927 : 0.224282 * Math.log10(xc * 155.975327 + 1.0), 0, 1);
  }
  if (space === "canon_clog2") {
    const c0 = 0.092864125;
    return clampNum(
      xLinear >= 0
        ? 0.24136077 * Math.log10(87.099375 * xLinear + 1.0) + c0
        : -0.24136077 * Math.log10(-87.099375 * xLinear + 1.0) + c0,
      0,
      1
    );
  }
  if (space === "panasonic_vlog") {
    return clampNum(xLinear < 0.01 ? 5.6 * xLinear + 0.125 : 0.241514 * Math.log10(Math.max(1e-9, xLinear + 0.00873)) + 0.598206, 0, 1);
  }
  if (space === "acescct") {
    const x = Math.max(0, xLinear);
    return clampNum(x <= 0.0078125 ? 10.5402377416545 * x + 0.0729055341958355 : (Math.log2(Math.max(1e-9, x)) + 9.72) / 17.52, 0, 1);
  }
  if (space === "rec709_gamma24") {
    return Math.pow(clampNum(xLinear, 0, 1), 1.0 / 2.4);
  }
  return clampNum(xLinear, 0, 1);
}

export function oetfEncodeCstChannelClient(x, space, whitePointNits = 100.0) {
  if (space === "rec709_gamma24") {
    return Math.pow(clampNum(x, 0, 1), 1.0 / 2.4);
  }
  if (space === "srgb_piecewise" || space === "display_p3") {
    const xc = clampNum(x, 0, 1);
    return xc <= 0.0031308 ? 12.92 * xc : 1.055 * Math.pow(xc, 1.0 / 2.4) - 0.055;
  }
  if (space === "rec2020_pq") {
    const m1 = 2610.0 / 16384.0;
    const m2 = (2523.0 / 4096.0) * 128.0;
    const c1 = 3424.0 / 4096.0;
    const c2 = (2413.0 / 4096.0) * 32.0;
    const c3 = (2392.0 / 4096.0) * 32.0;
    const y = clampNum((Math.max(0, x) * Math.max(100, whitePointNits)) / 10000.0, 0, 1);
    const ym1 = Math.pow(y, m1);
    return clampNum(Math.pow((c1 + c2 * ym1) / (1.0 + c3 * ym1), m2), 0, 1);
  }
  if (space === "rec2020_hlg") {
    const a = 0.17883277;
    const b = 1.0 - 4.0 * a;
    const c = 0.5 - a * Math.log(4.0 * a);
    const e = clampNum(x, 0, 1);
    return e <= 1.0 / 12.0 ? Math.sqrt(3.0 * e) : clampNum(a * Math.log(12.0 * e - b) + c, 0, 1);
  }
  const xc = Math.max(0, x);
  return clampNum(xc <= 0.0078125 ? 10.5402377416545 * xc + 0.0729055341958355 : (Math.log2(Math.max(1e-9, xc)) + 9.72) / 17.52, 0, 1);
}

function applyCstToneMapScalarClient(x, cfg) {
  const evGain = Math.pow(2.0, cfg.exposure_ev);
  let v = Math.max(0.0, x * evGain + cfg.black_point_offset);
  if (Math.abs(cfg.contrast - 1.0) > 1e-4 && v > 0.0) {
    v = 0.18 * Math.pow(v / 0.18, cfg.contrast);
  }
  if (cfg.toe_strength > 1e-4 && v < 0.18) {
    v = 0.18 * Math.pow(v / 0.18, 1.0 + cfg.toe_strength * 0.85);
  }
  if (cfg.tone_mapping_mode === "none") return Math.max(0, v);
  if (cfg.tone_mapping_mode === "simple_reinhard") {
    const wp = Math.max(1.0, cfg.white_point_nits / 100.0);
    return Math.max(0, (v * (1.0 + v / (wp * wp))) / (1.0 + v));
  }
  if (cfg.tone_mapping_mode === "luminance_bt2390") {
    const wpScale = Math.max(1.0, cfg.white_point_nits / 100.0);
    const knee = 0.45 + 0.35 * (1.0 - cfg.shoulder_strength);
    if (v <= knee) return v;
    const excess = v - knee;
    const span = Math.max(0.15, (1.0 + 0.8 * cfg.shoulder_strength) * wpScale);
    const rolled = knee + (span - knee) * (excess / (excess + span - knee));
    return Math.max(0, rolled / Math.max(1.0, wpScale * 0.45));
  }
  const shoulder = 0.8 + 1.8 * cfg.shoulder_strength;
  const a = 2.51 * (0.95 - 0.25 * cfg.shoulder_strength);
  const b = 0.03 + 0.03 * cfg.toe_strength;
  const c = 2.43 * (0.75 + 0.55 * cfg.shoulder_strength);
  const d = 0.59;
  const e = 0.14 + 0.08 * shoulder;
  return clampNum((v * (a * v + b)) / Math.max(1e-6, v * (c * v + d) + e), 0, 1);
}

export function evaluateCstRgbClient(r, g, b, rawConfig, precomputedMatrix = null) {
  const cfg = normalizeCstConfigClient(rawConfig);
  if (!cfg.enabled) {
    return [clampNum(r, 0, 1), clampNum(g, 0, 1), clampNum(b, 0, 1), false];
  }
  const lr = eotfDecodeCstChannelClient(r, cfg.input_space);
  const lg = eotfDecodeCstChannelClient(g, cfg.input_space);
  const lb = eotfDecodeCstChannelClient(b, cfg.input_space);
  const m = precomputedMatrix || computeCstGamutMatrixClient(cfg).mCombined;
  let [dr, dg, db] = cstMatvec3x3(m, [lr, lg, lb]);
  const outOfGamut = Math.min(dr, dg, db) < -1e-4 || Math.max(dr, dg, db) > 1.0001;
  if (cfg.gamut_mapping_mode === "clip") {
    dr = clampNum(dr, 0, 1);
    dg = clampNum(dg, 0, 1);
    db = clampNum(db, 0, 1);
  } else if (cfg.gamut_mapping_mode === "saturation_compress") {
    const luma = 0.2126 * dr + 0.7152 * dg + 0.0722 * db;
    const minC = Math.min(dr, dg, db);
    if (minC < 0 && luma > 1e-6) {
      const pull = clampNum(-minC / Math.max(1e-6, luma - minC), 0, 1) * (0.35 + 0.65 * cfg.gamut_compression);
      dr += (luma - dr) * pull;
      dg += (luma - dg) * pull;
      db += (luma - db) * pull;
    }
    if (cfg.gamut_compression > 0) {
      const cMax = Math.max(Math.abs(dr - luma), Math.abs(dg - luma), Math.abs(db - luma));
      if (cMax > 0.35) {
        const soft = 1.0 - cfg.gamut_compression * 0.32 * clampNum((cMax - 0.35) / 1.2, 0, 1);
        dr = luma + (dr - luma) * soft;
        dg = luma + (dg - luma) * soft;
        db = luma + (db - luma) * soft;
      }
    }
    dr = Math.max(0, dr);
    dg = Math.max(0, dg);
    db = Math.max(0, db);
  } else if (cfg.gamut_mapping_mode === "luminance_preserve") {
    const luma = 0.2126 * dr + 0.7152 * dg + 0.0722 * db;
    const minC = Math.min(dr, dg, db);
    if (minC < 0 && luma > 1e-6) {
      const t = clampNum(luma / (luma - minC), 0, 1);
      const blend = 1.0 - (1.0 - t) * (0.5 + 0.5 * cfg.gamut_compression);
      dr = luma + (dr - luma) * blend;
      dg = luma + (dg - luma) * blend;
      db = luma + (db - luma) * blend;
    }
    dr = Math.max(0, dr);
    dg = Math.max(0, dg);
    db = Math.max(0, db);
  }
  let tr = applyCstToneMapScalarClient(dr, cfg);
  let tg = applyCstToneMapScalarClient(dg, cfg);
  let tb = applyCstToneMapScalarClient(db, cfg);
  if (Math.abs(cfg.saturation - 1.0) > 1e-4) {
    const luma = 0.2126 * tr + 0.7152 * tg + 0.0722 * tb;
    tr = Math.max(0, luma + (tr - luma) * cfg.saturation);
    tg = Math.max(0, luma + (tg - luma) * cfg.saturation);
    tb = Math.max(0, luma + (tb - luma) * cfg.saturation);
  }
  return [
    clampNum(oetfEncodeCstChannelClient(tr, cfg.output_space, cfg.white_point_nits), 0, 1),
    clampNum(oetfEncodeCstChannelClient(tg, cfg.output_space, cfg.white_point_nits), 0, 1),
    clampNum(oetfEncodeCstChannelClient(tb, cfg.output_space, cfg.white_point_nits), 0, 1),
    outOfGamut
  ];
}

export function compileCstFiltergraphClient(rawConfig) {
  const cfg = normalizeCstConfigClient(rawConfig);
  const { mCombined, mAdapt, srcP, dstP, bradfordActive } = computeCstGamutMatrixClient(cfg);
  const samples = [];
  const nPts = 33;
  for (let i = 0; i < nPts; i += 1) {
    const inNorm = i / (nPts - 1);
    const lin = eotfDecodeCstChannelClient(inNorm, cfg.input_space);
    const evStop = Math.log2(Math.max(1e-5, lin) / 0.18);
    const outNorm = cfg.enabled
      ? oetfEncodeCstChannelClient(applyCstToneMapScalarClient(Math.max(0, lin), cfg), cfg.output_space, cfg.white_point_nits)
      : inNorm;
    samples.push({
      input_norm: Number(inNorm.toFixed(5)),
      ev_stop: Number(clampNum(evStop, -8, 8).toFixed(3)),
      output_norm: Number(clampNum(outNorm, 0, 1).toFixed(5)),
      identity_norm: Number(inNorm.toFixed(5))
    });
  }
  const mgOut = cfg.enabled
    ? oetfEncodeCstChannelClient(applyCstToneMapScalarClient(0.18, cfg), cfg.output_space, cfg.white_point_nits)
    : CST_INPUT_SPACES_CLIENT[cfg.input_space].middle_grey_signal;
  const hiIn = 0.18 * 16.0;
  const hiOut = applyCstToneMapScalarClient(hiIn, cfg);
  const highlightRolloffDb = Number((20.0 * Math.log10(Math.max(1e-4, hiOut) / hiIn)).toFixed(2));
  let oog = 0;
  let total = 0;
  for (let ir = 0; ir < 5; ir += 1) {
    for (let ig = 0; ig < 5; ig += 1) {
      for (let ib = 0; ib < 5; ib += 1) {
        const res = evaluateCstRgbClient(ir / 4, ig / 4, ib / 4, cfg, mCombined);
        if (res[3]) oog += 1;
        total += 1;
      }
    }
  }
  const triArea = (p) => 0.5 * Math.abs(p.rx * (p.gy - p.by) + p.gx * (p.by - p.ry) + p.bx * (p.ry - p.gy));
  const srcArea = Math.max(1e-6, triArea(srcP));
  const dstArea = Math.max(1e-6, triArea(dstP));
  let ffmpegFilterExpr = "null";
  let ffmpegHint = "colorspace=all=bt709:trc=bt709:range=tv";
  if (cfg.enabled) {
    const mx = (v) => clampNum(v, -2, 2).toFixed(4);
    const mixer =
      `colorchannelmixer=rr=${mx(mCombined[0][0])}:rg=${mx(mCombined[0][1])}:rb=${mx(mCombined[0][2])}:ra=0:` +
      `gr=${mx(mCombined[1][0])}:gg=${mx(mCombined[1][1])}:gb=${mx(mCombined[1][2])}:ga=0:` +
      `br=${mx(mCombined[2][0])}:bg=${mx(mCombined[2][1])}:bb=${mx(mCombined[2][2])}:ba=0`;
    const pts = [];
    let prevX = -1;
    for (const idx of [0, 4, 8, 12, 16, 20, 24, 28, 32]) {
      if (idx < samples.length) {
        let xv = clampNum(samples[idx].input_norm, 0, 1);
        if (xv <= prevX) xv = Math.min(1, prevX + 0.01);
        prevX = xv;
        pts.push(`${xv.toFixed(3)}/${clampNum(samples[idx].output_norm, 0, 1).toFixed(3)}`);
      }
    }
    const satSeg = Math.abs(cfg.saturation - 1.0) > 1e-3 ? `,eq=saturation=${cfg.saturation.toFixed(3)}` : "";
    let tag = "setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709";
    if (cfg.output_space === "rec2020_pq") {
      tag = "setparams=color_primaries=bt2020:color_trc=smpte2084:colorspace=bt2020nc";
      ffmpegHint = "zscale=primaries=bt2020:transfer=smpte2084:matrix=bt2020nc";
    } else if (cfg.output_space === "rec2020_hlg") {
      tag = "setparams=color_primaries=bt2020:color_trc=arib-std-b67:colorspace=bt2020nc";
      ffmpegHint = "zscale=primaries=bt2020:transfer=arib-std-b67:matrix=bt2020nc";
    } else if (cfg.output_space === "display_p3") {
      tag = "setparams=color_primaries=smpte432:color_trc=iec61966-2-1:colorspace=bt709";
      ffmpegHint = "colorspace=all=bt709:primaries=smpte432:trc=srgb";
    } else if (cfg.output_space === "srgb_piecewise") {
      tag = "setparams=color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709";
      ffmpegHint = "colorspace=all=bt709:trc=srgb";
    }
    ffmpegFilterExpr = `${mixer},curves=master='${pts.join(" ")}'${satSeg},${tag}`;
  }
  return {
    config: cfg,
    bradford_matrix_3x3: mCombined.map((r) => r.map((v) => Number(v.toFixed(5)))),
    adaptation_matrix_3x3: mAdapt.map((r) => r.map((v) => Number(v.toFixed(5)))),
    src_primaries: srcP,
    dst_primaries: dstP,
    ffmpeg_filter_expr: ffmpegFilterExpr,
    ffmpeg_colorspace_hint: ffmpegHint,
    tone_curve_samples: samples,
    middle_grey_out: Number(clampNum(mgOut, 0, 1).toFixed(4)),
    highlight_rolloff_db: highlightRolloffDb,
    out_of_gamut_pct: Number(((oog / Math.max(1, total)) * 100.0).toFixed(1)),
    gamut_coverage_pct: Number(clampNum((dstArea / srcArea) * 100.0, 5, 100).toFixed(1)),
    bradford_active: bradfordActive
  };
}

export function analyzeCstPipelineClient(rawConfig) {
  const compiled = compileCstFiltergraphClient(rawConfig);
  const cfg = compiled.config;
  const srcSpec = CST_INPUT_SPACES_CLIENT[cfg.input_space];
  const dstSpec = CST_OUTPUT_SPACES_CLIENT[cfg.output_space];
  const preserved = Number(
    Math.min(srcSpec.dynamic_range_stops, dstSpec.dynamic_range_stops + 3.5 * cfg.shoulder_strength).toFixed(1)
  );
  return {
    compiled,
    patches: [],
    dynamic_range_preserved_stops: preserved,
    mean_luma_in: 0.34,
    mean_luma_out: Number(compiled.middle_grey_out.toFixed(4)),
    summary: `${srcSpec.label} -> ${dstSpec.label} | Bradford=${compiled.bradford_active ? "ON" : "UNITY"} | Tone=${cfg.tone_mapping_mode} | DR=${preserved} stops`
  };
}

export function generateCstCubeTextClient(rawConfig, size = 33, title = "taktcut_cst_transform") {
  const gridSize = [17, 33, 65].includes(Number(size)) ? Number(size) : 33;
  const cfg = normalizeCstConfigClient(rawConfig);
  const { mCombined } = computeCstGamutMatrixClient(cfg);
  const cleanTitle = String(title || "taktcut_cst_transform").replace(/[^a-zA-Z0-9_\- ]+/g, "_").trim() || "taktcut_cst_transform";
  const lines = [
    `TITLE "${cleanTitle}"`,
    "# Generated by TaktCut Camera Log CST Studio",
    `LUT_3D_SIZE ${gridSize}`,
    "DOMAIN_MIN 0.000000 0.000000 0.000000",
    "DOMAIN_MAX 1.000000 1.000000 1.000000",
    ""
  ];
  const denom = gridSize - 1;
  for (let bIdx = 0; bIdx < gridSize; bIdx += 1) {
    const bIn = bIdx / denom;
    for (let gIdx = 0; gIdx < gridSize; gIdx += 1) {
      const gIn = gIdx / denom;
      for (let rIdx = 0; rIdx < gridSize; rIdx += 1) {
        const rIn = rIdx / denom;
        const [rOut, gOut, bOut] = evaluateCstRgbClient(rIn, gIn, bIn, cfg, mCombined);
        lines.push(`${rOut.toFixed(6)} ${gOut.toFixed(6)} ${bOut.toFixed(6)}`);
      }
    }
  }
  return `${lines.join("\n")}\n`;
}

// =========================================================================
// CYCLE #105: DAVINCI RESOLVE QUALIFIER KEYER & BORIS FX LIGHT-WRAP STUDIO
// =========================================================================

export const ALLOWED_QUALIFIER_KEYER_PRESETS = [
  "green_screen_pro",
  "blue_screen_cinema",
  "skin_tone_isolator",
  "sky_cyan_qualifier",
  "sodium_street_despill",
  "studio_luma_key",
  "custom"
];

export const ALLOWED_QUALIFIER_KEY_MODES = ["hybrid", "chroma_3d", "hsl", "luma_key"];

export const ALLOWED_QUALIFIER_DESPILL_MODES = [
  "none",
  "luma_preserving",
  "complement_mix",
  "avg_gb"
];

export const ALLOWED_QUALIFIER_HIGHLIGHT_MODES = [
  "final_composite",
  "bw_alpha_matte",
  "red_rubylith",
  "isolated_foreground"
];

export const ALLOWED_QUALIFIER_CUBE_MODES = ["isolation", "matte", "despill"];

export const QUALIFIER_KEYER_DEFAULT_CONFIG = {
  enabled: false,
  preset_id: "green_screen_pro",
  key_mode: "hybrid",
  highlight_mode: "final_composite",
  hue_center: 120.0,
  hue_width: 76.0,
  hue_softness: 18.0,
  sat_low: 0.22,
  sat_high: 1.0,
  sat_softness: 0.1,
  luma_low: 0.08,
  luma_high: 0.95,
  luma_softness: 0.08,
  invert_matte: true,
  target_rgb: [0.12, 0.75, 0.22],
  chroma_distance: 0.28,
  chroma_softness: 0.14,
  pre_blur_radius: 0.5,
  clean_black: 0.06,
  clean_white: 0.94,
  choke_px: 0.0,
  post_feather_px: 1.0,
  despill_mode: "luma_preserving",
  despill_strength: 0.8,
  light_wrap_intensity: 0.35,
  light_wrap_radius: 14.0,
  light_wrap_bg_rgb: [0.14, 0.2, 0.34]
};

export const QUALIFIER_KEYER_PRESETS_CLIENT = [
  {
    preset_id: "green_screen_pro",
    label: "Green Screen Pro",
    category: "Chroma Keyer",
    description: "3D Chroma + HSL studio green screen key with luma-preserving despill and edge light-wrap.",
    config: {
      ...QUALIFIER_KEYER_DEFAULT_CONFIG,
      enabled: true,
      preset_id: "green_screen_pro"
    }
  },
  {
    preset_id: "blue_screen_cinema",
    label: "Blue Screen Cinema",
    category: "Chroma Keyer",
    description: "Tungsten/cinema blue screen keyer tuned for shadow retention and complement-mix despill.",
    config: {
      ...QUALIFIER_KEYER_DEFAULT_CONFIG,
      enabled: true,
      preset_id: "blue_screen_cinema",
      hue_center: 228.0,
      hue_width: 68.0,
      sat_low: 0.24,
      luma_low: 0.06,
      luma_high: 0.92,
      target_rgb: [0.12, 0.24, 0.78],
      chroma_distance: 0.26,
      clean_white: 0.93,
      choke_px: -0.5,
      post_feather_px: 1.2,
      despill_mode: "complement_mix",
      despill_strength: 0.78,
      light_wrap_intensity: 0.3,
      light_wrap_radius: 12.0,
      light_wrap_bg_rgb: [0.24, 0.18, 0.14]
    }
  },
  {
    preset_id: "skin_tone_isolator",
    label: "Skin Tone Isolator",
    category: "HSL Qualifier",
    description: "DaVinci HSL secondary skin-line isolator (I-line ~24 deg) with soft matte feathering.",
    config: {
      ...QUALIFIER_KEYER_DEFAULT_CONFIG,
      enabled: true,
      preset_id: "skin_tone_isolator",
      key_mode: "hsl",
      highlight_mode: "isolated_foreground",
      hue_center: 24.0,
      hue_width: 40.0,
      hue_softness: 16.0,
      sat_low: 0.14,
      sat_high: 0.72,
      luma_low: 0.18,
      luma_high: 0.88,
      luma_softness: 0.1,
      invert_matte: false,
      target_rgb: [0.76, 0.52, 0.4],
      chroma_distance: 0.24,
      pre_blur_radius: 1.0,
      clean_black: 0.04,
      clean_white: 0.95,
      post_feather_px: 2.0,
      despill_mode: "none",
      despill_strength: 0.0,
      light_wrap_intensity: 0.0,
      light_wrap_radius: 0.0,
      light_wrap_bg_rgb: [0.1, 0.11, 0.14]
    }
  },
  {
    preset_id: "sky_cyan_qualifier",
    label: "Sky / Cyan Qualifier",
    category: "HSL Qualifier",
    description: "Isolates daylight cyan/blue skies for sky replacement or secondary grading.",
    config: {
      ...QUALIFIER_KEYER_DEFAULT_CONFIG,
      enabled: true,
      preset_id: "sky_cyan_qualifier",
      key_mode: "hsl",
      highlight_mode: "red_rubylith",
      hue_center: 205.0,
      hue_width: 56.0,
      hue_softness: 20.0,
      sat_low: 0.2,
      sat_high: 0.95,
      sat_softness: 0.12,
      luma_low: 0.35,
      luma_high: 0.98,
      luma_softness: 0.1,
      invert_matte: false,
      target_rgb: [0.24, 0.58, 0.88],
      chroma_distance: 0.28,
      chroma_softness: 0.16,
      pre_blur_radius: 0.8,
      clean_black: 0.05,
      clean_white: 0.92,
      post_feather_px: 1.5,
      despill_mode: "none",
      despill_strength: 0.0,
      light_wrap_intensity: 0.18,
      light_wrap_radius: 10.0,
      light_wrap_bg_rgb: [0.82, 0.58, 0.36]
    }
  },
  {
    preset_id: "sodium_street_despill",
    label: "Sodium Street Despill",
    category: "Spill / Cleanup",
    description: "Suppresses harsh amber/sodium-vapor streetlight contamination while preserving foreground highlights.",
    config: {
      ...QUALIFIER_KEYER_DEFAULT_CONFIG,
      enabled: true,
      preset_id: "sodium_street_despill",
      key_mode: "hybrid",
      highlight_mode: "final_composite",
      hue_center: 42.0,
      hue_width: 54.0,
      sat_low: 0.3,
      sat_softness: 0.12,
      luma_low: 0.12,
      luma_high: 0.96,
      luma_softness: 0.1,
      invert_matte: true,
      target_rgb: [0.86, 0.62, 0.14],
      chroma_distance: 0.25,
      clean_black: 0.05,
      despill_mode: "luma_preserving",
      despill_strength: 0.72,
      light_wrap_intensity: 0.22,
      light_wrap_radius: 8.0,
      light_wrap_bg_rgb: [0.12, 0.16, 0.24]
    }
  },
  {
    preset_id: "studio_luma_key",
    label: "Studio Luma Key",
    category: "Luma Keyer",
    description: "Clean luminance keyer separating illuminated foreground talent from crushed dark studio cyclorama.",
    config: {
      ...QUALIFIER_KEYER_DEFAULT_CONFIG,
      enabled: true,
      preset_id: "studio_luma_key",
      key_mode: "luma_key",
      highlight_mode: "bw_alpha_matte",
      hue_width: 360.0,
      hue_softness: 0.0,
      sat_low: 0.0,
      sat_softness: 0.0,
      luma_low: 0.18,
      luma_high: 1.0,
      luma_softness: 0.08,
      invert_matte: false,
      target_rgb: [0.04, 0.04, 0.05],
      chroma_distance: 0.3,
      chroma_softness: 0.15,
      clean_black: 0.08,
      clean_white: 0.92,
      post_feather_px: 1.5,
      despill_mode: "none",
      despill_strength: 0.0,
      light_wrap_intensity: 0.28,
      light_wrap_radius: 12.0,
      light_wrap_bg_rgb: [0.18, 0.22, 0.3]
    }
  },
  {
    preset_id: "custom",
    label: "Custom Keyer",
    category: "Custom",
    description: "User-defined HSL / 3D Chroma Keyer, Matte Finesse & Boris FX Light-Wrap configuration.",
    config: {
      ...QUALIFIER_KEYER_DEFAULT_CONFIG,
      enabled: false,
      preset_id: "custom"
    }
  }
];

export function createDefaultQualifierKeyerConfigClient(overrides = {}) {
  return normalizeQualifierKeyerConfigClient({
    ...QUALIFIER_KEYER_DEFAULT_CONFIG,
    ...(overrides || {})
  });
}

function normalizeRgbTupleClient(raw, fallback) {
  if (!Array.isArray(raw) || raw.length !== 3) return [...fallback];
  return raw.map((v, i) => {
    const n = Number(v);
    return Number.isFinite(n) ? clampNum(n, 0, 1) : fallback[i];
  });
}

export function normalizeQualifierKeyerConfigClient(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const d = QUALIFIER_KEYER_DEFAULT_CONFIG;
  const presetId = ALLOWED_QUALIFIER_KEYER_PRESETS.includes(src.preset_id)
    ? src.preset_id
    : d.preset_id;
  const keyMode = ALLOWED_QUALIFIER_KEY_MODES.includes(src.key_mode) ? src.key_mode : d.key_mode;
  const highlightMode = ALLOWED_QUALIFIER_HIGHLIGHT_MODES.includes(src.highlight_mode)
    ? src.highlight_mode
    : d.highlight_mode;
  const despillMode = ALLOWED_QUALIFIER_DESPILL_MODES.includes(src.despill_mode)
    ? src.despill_mode
    : d.despill_mode;

  const numOr = (val, fb, lo, hi) => {
    const n = Number(val);
    return Number.isFinite(n) ? clampNum(n, lo, hi) : fb;
  };
  let satLow = numOr(src.sat_low, d.sat_low, 0, 1);
  let satHigh = numOr(src.sat_high, d.sat_high, 0, 1);
  if (satLow > satHigh) [satLow, satHigh] = [satHigh, satLow];
  let lumaLow = numOr(src.luma_low, d.luma_low, 0, 1);
  let lumaHigh = numOr(src.luma_high, d.luma_high, 0, 1);
  if (lumaLow > lumaHigh) [lumaLow, lumaHigh] = [lumaHigh, lumaLow];
  const cleanBlack = numOr(src.clean_black, d.clean_black, 0, 0.9);
  const cleanWhite = Math.max(cleanBlack + 0.02, numOr(src.clean_white, d.clean_white, 0.1, 1.0));

  return {
    enabled: typeof src.enabled === "boolean" ? src.enabled : d.enabled,
    preset_id: presetId,
    key_mode: keyMode,
    highlight_mode: highlightMode,
    hue_center: numOr(src.hue_center, d.hue_center, 0, 360),
    hue_width: numOr(src.hue_width, d.hue_width, 1, 360),
    hue_softness: numOr(src.hue_softness, d.hue_softness, 0, 90),
    sat_low: satLow,
    sat_high: satHigh,
    sat_softness: numOr(src.sat_softness, d.sat_softness, 0, 0.5),
    luma_low: lumaLow,
    luma_high: lumaHigh,
    luma_softness: numOr(src.luma_softness, d.luma_softness, 0, 0.5),
    invert_matte: typeof src.invert_matte === "boolean" ? src.invert_matte : d.invert_matte,
    target_rgb: normalizeRgbTupleClient(src.target_rgb, d.target_rgb),
    chroma_distance: numOr(src.chroma_distance, d.chroma_distance, 0.01, 1.0),
    chroma_softness: numOr(src.chroma_softness, d.chroma_softness, 0, 0.6),
    pre_blur_radius: numOr(src.pre_blur_radius, d.pre_blur_radius, 0, 12),
    clean_black: cleanBlack,
    clean_white: clampNum(cleanWhite, 0.1, 1.0),
    choke_px: numOr(src.choke_px, d.choke_px, -12, 12),
    post_feather_px: numOr(src.post_feather_px, d.post_feather_px, 0, 16),
    despill_mode: despillMode,
    despill_strength: numOr(src.despill_strength, d.despill_strength, 0, 1),
    light_wrap_intensity: numOr(src.light_wrap_intensity, d.light_wrap_intensity, 0, 1),
    light_wrap_radius: numOr(src.light_wrap_radius, d.light_wrap_radius, 0, 64),
    light_wrap_bg_rgb: normalizeRgbTupleClient(src.light_wrap_bg_rgb, d.light_wrap_bg_rgb)
  };
}

function qkRgbToHslClient(r, g, b) {
  const cr = clampNum(r, 0, 1);
  const cg = clampNum(g, 0, 1);
  const cb = clampNum(b, 0, 1);
  const maxC = Math.max(cr, cg, cb);
  const minC = Math.min(cr, cg, cb);
  const delta = maxC - minC;
  const luma = 0.5 * (maxC + minC);
  if (delta <= 1e-7) return [0, 0, luma];
  const sat = delta / Math.max(1e-7, 1 - Math.abs(2 * luma - 1));
  let hue = 0;
  if (maxC === cr) hue = 60 * (((cg - cb) / delta) % 6);
  else if (maxC === cg) hue = 60 * ((cb - cr) / delta + 2);
  else hue = 60 * ((cr - cg) / delta + 4);
  if (hue < 0) hue += 360;
  return [(hue + 360) % 360, clampNum(sat, 0, 1), clampNum(luma, 0, 1)];
}

function qkBandWeightClient(val, lo, hi, soft) {
  if (val >= lo && val <= hi) return 1;
  if (soft <= 1e-6) return 0;
  if (val < lo) return clampNum(1 - (lo - val) / soft, 0, 1);
  return clampNum(1 - (val - hi) / soft, 0, 1);
}

function qkHueWeightClient(hue, center, width, soft) {
  if (width >= 359.5) return 1;
  const halfW = 0.5 * width;
  const diff = Math.abs((((hue - center + 180) % 360) + 360) % 360 - 180);
  if (diff <= halfW) return 1;
  if (soft <= 1e-6) return 0;
  return clampNum(1 - (diff - halfW) / soft, 0, 1);
}

function qkDetectSpillChannelClient(cfg) {
  const [tr, tg, tb] = cfg.target_rgb;
  const hue = ((cfg.hue_center % 360) + 360) % 360;
  if ((hue >= 65 && hue <= 175) || (tg >= tr && tg >= tb && tg - Math.max(tr, tb) > 0.08)) {
    return "g";
  }
  if ((hue > 175 && hue <= 290) || (tb >= tr && tb >= tg && tb - Math.max(tr, tg) > 0.08)) {
    return "b";
  }
  return "r";
}

export function applyQualifierSpillSuppressionClient(cfg, r, g, b) {
  const cr = clampNum(r, 0, 1);
  const cg = clampNum(g, 0, 1);
  const cb = clampNum(b, 0, 1);
  const strength = cfg.despill_strength;
  if (cfg.despill_mode === "none" || strength <= 1e-6) return [cr, cg, cb];

  const ch = qkDetectSpillChannelClient(cfg);
  const channels = [cr, cg, cb];
  const [sIdx, o1Idx, o2Idx] = ch === "r" ? [0, 1, 2] : ch === "g" ? [1, 0, 2] : [2, 0, 1];
  const sVal = channels[sIdx];
  const o1Val = channels[o1Idx];
  const o2Val = channels[o2Idx];
  const limit =
    cfg.despill_mode === "complement_mix"
      ? 0.35 * Math.min(o1Val, o2Val) + 0.65 * Math.max(o1Val, o2Val)
      : 0.5 * (o1Val + o2Val);
  if (sVal <= limit) return [cr, cg, cb];

  const sNew = sVal - (sVal - limit) * strength;
  if (cfg.despill_mode === "luma_preserving") {
    const lw = [0.2126, 0.7152, 0.0722];
    const origY = cr * lw[0] + cg * lw[1] + cb * lw[2];
    channels[sIdx] = sNew;
    const newY = channels[0] * lw[0] + channels[1] * lw[1] + channels[2] * lw[2];
    const deltaY = Math.max(0, origY - newY);
    const compW = lw[o1Idx] + lw[o2Idx];
    if (compW > 1e-6 && deltaY > 0) {
      const boost = deltaY / compW;
      channels[o1Idx] = clampNum(o1Val + boost, 0, 1);
      channels[o2Idx] = clampNum(o2Val + boost, 0, 1);
    }
  } else {
    channels[sIdx] = sNew;
  }
  return [
    clampNum(channels[0], 0, 1),
    clampNum(channels[1], 0, 1),
    clampNum(channels[2], 0, 1)
  ];
}

export function evaluateRawKeyMatchClient(cfg, r, g, b) {
  const cr = clampNum(r, 0, 1);
  const cg = clampNum(g, 0, 1);
  const cb = clampNum(b, 0, 1);
  const [hue, sat, luma] = qkRgbToHslClient(cr, cg, cb);
  const rec709Y = 0.2126 * cr + 0.7152 * cg + 0.0722 * cb;
  if (cfg.key_mode === "luma_key") {
    return qkBandWeightClient(rec709Y, cfg.luma_low, cfg.luma_high, cfg.luma_softness);
  }
  const hW = qkHueWeightClient(hue, cfg.hue_center, cfg.hue_width, cfg.hue_softness);
  const sW = qkBandWeightClient(sat, cfg.sat_low, cfg.sat_high, cfg.sat_softness);
  const lW = qkBandWeightClient(luma, cfg.luma_low, cfg.luma_high, cfg.luma_softness);
  const hslW = hW * sW * lW;
  if (cfg.key_mode === "hsl") return clampNum(hslW, 0, 1);

  const [tr, tg, tb] = cfg.target_rgb;
  const pCb = -0.1146 * cr - 0.3854 * cg + 0.5 * cb;
  const pCr = 0.5 * cr - 0.4542 * cg - 0.0458 * cb;
  const tCb = -0.1146 * tr - 0.3854 * tg + 0.5 * tb;
  const tCr = 0.5 * tr - 0.4542 * tg - 0.0458 * tb;
  const chromaDist = Math.hypot(pCb - tCb, pCr - tCr) * 1.41421356;
  const rgbDist = Math.sqrt(((cr - tr) ** 2 + (cg - tg) ** 2 + (cb - tb) ** 2) / 3);
  const dist3d = 0.72 * chromaDist + 0.28 * rgbDist;
  let chromaW = 0;
  if (dist3d <= cfg.chroma_distance) chromaW = 1;
  else if (cfg.chroma_softness > 1e-6) {
    chromaW = clampNum(1 - (dist3d - cfg.chroma_distance) / cfg.chroma_softness, 0, 1);
  }
  if (cfg.key_mode === "chroma_3d") return clampNum(chromaW * lW, 0, 1);
  return clampNum(0.55 * chromaW * lW + 0.45 * hslW, 0, 1);
}

export function evaluateQualifierKeyerPixelClient(rawCfg, r, g, b) {
  const cfg = normalizeQualifierKeyerConfigClient(rawCfg);
  const rawMatch = evaluateRawKeyMatchClient(cfg, r, g, b);
  const matte = cfg.invert_matte ? 1 - rawMatch : rawMatch;
  const span = Math.max(1e-4, cfg.clean_white - cfg.clean_black);
  const alpha = clampNum((matte - cfg.clean_black) / span, 0, 1);
  const [dr, dg, db] = applyQualifierSpillSuppressionClient(cfg, r, g, b);
  return [alpha, dr, dg, db];
}

function qkBoxBlur2dClient(grid, width, height, radius) {
  if (radius <= 0 || width <= 1 || height <= 1) return grid.slice();
  const temp = new Float32Array(width * height);
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const rowOff = y * width;
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      let acc = 0;
      for (let sx = x0; sx <= x1; sx += 1) acc += grid[rowOff + sx];
      temp[rowOff + x] = acc / (x1 - x0 + 1);
    }
  }
  for (let y = 0; y < height; y += 1) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    const count = y1 - y0 + 1;
    for (let x = 0; x < width; x += 1) {
      let acc = 0;
      for (let sy = y0; sy <= y1; sy += 1) acc += temp[sy * width + x];
      out[y * width + x] = acc / count;
    }
  }
  return Array.from(out);
}

function qkMorphChoke2dClient(grid, width, height, chokePx) {
  const radius = Math.min(4, Math.round(Math.abs(chokePx)));
  if (radius <= 0 || width <= 1 || height <= 1) return grid.slice();
  const erode = chokePx < 0;
  const out = new Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      let best = erode ? 1 : 0;
      for (let sy = y0; sy <= y1; sy += 1) {
        const rowOff = sy * width;
        for (let sx = x0; sx <= x1; sx += 1) {
          const v = grid[rowOff + sx];
          if (erode ? v < best : v > best) best = v;
        }
      }
      out[y * width + x] = best;
    }
  }
  return out;
}

export function synthesizeQualifierTestFrameClient(cfg, width = 24, height = 16) {
  const pixels = [];
  const [tr, tg, tb] = cfg.target_rgb;
  const isLuma = cfg.key_mode === "luma_key";
  const [bgR, bgG, bgB] = isLuma ? [0.04, 0.04, 0.05] : [tr, tg, tb];
  const fgSkin = [0.76, 0.54, 0.42];
  const fgJacket = [0.22, 0.24, 0.3];
  const cx = (width - 1) * 0.5;
  const cy = (height - 1) * 0.54;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = (x - cx) / Math.max(1, width * 0.28);
      const dy = (y - cy) / Math.max(1, height * 0.38);
      const dist = Math.hypot(dx, dy);
      if (dist <= 0.85) {
        pixels.push(y < height * 0.5 ? fgSkin : fgJacket);
      } else if (dist <= 1.15) {
        const blend = clampNum((1.15 - dist) / 0.3, 0, 1);
        const base = y < height * 0.5 ? fgSkin : fgJacket;
        pixels.push([
          clampNum(base[0] * blend + bgR * (1 - blend), 0, 1),
          clampNum(base[1] * blend + bgG * (1 - blend), 0, 1),
          clampNum(base[2] * blend + bgB * (1 - blend), 0, 1)
        ]);
      } else {
        const shade = 0.92 + 0.08 * Math.sin((x / Math.max(1, width)) * Math.PI);
        pixels.push([
          clampNum(bgR * shade, 0, 1),
          clampNum(bgG * shade, 0, 1),
          clampNum(bgB * shade, 0, 1)
        ]);
      }
    }
  }
  return pixels;
}

export function analyzeQualifierKeyerSamplesClient(rawCfg, opts = {}) {
  const cfg = normalizeQualifierKeyerConfigClient(rawCfg);
  let w = Number(opts.width || 0);
  let h = Number(opts.height || 0);
  let rgbList = [];
  if (Array.isArray(opts.pixels) && opts.pixels.length > 0) {
    const stride = w > 0 && h > 0 && opts.pixels.length === w * h * 4 ? 4 : 3;
    const count = w > 0 && h > 0 ? Math.min(w * h, Math.floor(opts.pixels.length / stride)) : Math.floor(opts.pixels.length / stride);
    if (w <= 0 || h <= 0) {
      w = Math.max(1, count);
      h = 1;
    }
    let maxV = 1;
    for (let i = 0; i < count * stride; i += 1) {
      if (Number(opts.pixels[i]) > maxV) maxV = Number(opts.pixels[i]);
    }
    const scale = maxV > 1.001 ? 1 / 255 : 1;
    for (let idx = 0; idx < count; idx += 1) {
      const b = idx * stride;
      rgbList.push([
        clampNum(Number(opts.pixels[b]) * scale, 0, 1),
        clampNum(Number(opts.pixels[b + 1]) * scale, 0, 1),
        clampNum(Number(opts.pixels[b + 2]) * scale, 0, 1)
      ]);
    }
  } else if (Array.isArray(opts.samples) && opts.samples.length > 0) {
    let maxV = 1;
    for (const row of opts.samples) {
      for (let c = 0; c < 3; c += 1) {
        if (Number(row[c]) > maxV) maxV = Number(row[c]);
      }
    }
    const scale = maxV > 1.001 ? 1 / 255 : 1;
    rgbList = opts.samples.map((row) => [
      clampNum(Number(row[0]) * scale, 0, 1),
      clampNum(Number(row[1]) * scale, 0, 1),
      clampNum(Number(row[2]) * scale, 0, 1)
    ]);
    if (!(w > 0 && h > 0 && w * h === rgbList.length)) {
      w = rgbList.length;
      h = 1;
    }
  } else {
    w = 24;
    h = 16;
    rgbList = synthesizeQualifierTestFrameClient(cfg, w, h);
  }

  const total = rgbList.length;
  const rawMattes = rgbList.map(([r, g, b]) => {
    const m = evaluateRawKeyMatchClient(cfg, r, g, b);
    return cfg.invert_matte ? 1 - m : m;
  });
  const span = Math.max(1e-4, cfg.clean_white - cfg.clean_black);
  let alphas;
  let blurredInv;
  if (w > 1 && h > 1 && rawMattes.length === w * h) {
    const preR = Math.min(3, Math.round(cfg.pre_blur_radius));
    let grid = qkBoxBlur2dClient(rawMattes, w, h, preR);
    grid = grid.map((v) => clampNum((v - cfg.clean_black) / span, 0, 1));
    grid = qkMorphChoke2dClient(grid, w, h, cfg.choke_px);
    const postR = Math.min(4, Math.round(cfg.post_feather_px));
    alphas = qkBoxBlur2dClient(grid, w, h, postR);
    const invA = alphas.map((a) => 1 - a);
    const wrapR = cfg.light_wrap_radius > 0 ? Math.max(1, Math.min(5, Math.round(cfg.light_wrap_radius / 4))) : 0;
    blurredInv = wrapR > 0 ? qkBoxBlur2dClient(invA, w, h, wrapR) : invA;
  } else {
    alphas = rawMattes.map((v) => clampNum((v - cfg.clean_black) / span, 0, 1));
    blurredInv = alphas.map((a) => 1 - a);
  }

  const hist = new Array(16).fill(0);
  const spillCh = qkDetectSpillChannelClient(cfg);
  const sIdx = spillCh === "r" ? 0 : spillCh === "g" ? 1 : 2;
  const oIdxs = [0, 1, 2].filter((i) => i !== sIdx);
  let bgCount = 0;
  let bgLeakCount = 0;
  let coreSolidCount = 0;
  let semiTransCount = 0;
  let edgeSpillSum = 0;
  let edgeCount = 0;
  let origSpillSum = 0;
  let newSpillSum = 0;
  let wrapEnergySum = 0;
  let alphaSum = 0;

  for (let i = 0; i < total; i += 1) {
    const [r, g, b] = rgbList[i];
    const a = clampNum(alphas[i], 0, 1);
    alphaSum += a;
    hist[Math.min(15, Math.max(0, Math.floor(a * 15.9999)))] += 1;
    if (a >= 0.95) coreSolidCount += 1;
    else if (a > 0.02) semiTransCount += 1;
    if (rawMattes[i] < 0.2) {
      bgCount += 1;
      if (a > 0.08) bgLeakCount += 1;
    }
    const [dr, dg, db] = applyQualifierSpillSuppressionClient(cfg, r, g, b);
    const origVec = [r, g, b];
    const newVec = [dr, dg, db];
    const origEx = Math.max(0, origVec[sIdx] - 0.5 * (origVec[oIdxs[0]] + origVec[oIdxs[1]]));
    const newEx = Math.max(0, newVec[sIdx] - 0.5 * (newVec[oIdxs[0]] + newVec[oIdxs[1]]));
    origSpillSum += origEx;
    newSpillSum += newEx;
    if (a > 0.02 && a < 0.98) {
      edgeCount += 1;
      edgeSpillSum += newEx;
    }
    wrapEnergySum += clampNum(a * blurredInv[i] * 2.2 * cfg.light_wrap_intensity, 0, 1);
  }

  const bgLeakRatio = clampNum(bgLeakCount / Math.max(1, bgCount), 0, 1);
  const coreSolidRatio = clampNum(coreSolidCount / Math.max(1, total), 0, 1);
  const semiTransRatio = clampNum(semiTransCount / Math.max(1, total), 0, 1);
  const edgeContamRatio = clampNum(edgeSpillSum / Math.max(1, edgeCount), 0, 1);
  const despillReduction = origSpillSum > 1e-6 ? clampNum((origSpillSum - newSpillSum) / origSpillSum, 0, 1) : 0;
  const lightWrapEnergy = clampNum(wrapEnergySum / Math.max(1, total), 0, 1);
  let grade = "NEEDS_FINESSE";
  if (bgLeakRatio <= 0.08 && edgeContamRatio <= 0.08) grade = "EXCELLENT";
  else if (bgLeakRatio <= 0.22 && edgeContamRatio <= 0.2) grade = "GOOD";

  return {
    sample_count: total,
    width: w,
    height: h,
    mean_alpha: Number((alphaSum / Math.max(1, total)).toFixed(4)),
    bg_leak_ratio: Number(bgLeakRatio.toFixed(4)),
    core_solid_ratio: Number(coreSolidRatio.toFixed(4)),
    edge_contamination_ratio: Number(edgeContamRatio.toFixed(4)),
    semi_transparent_ratio: Number(semiTransRatio.toFixed(4)),
    despill_reduction_ratio: Number(despillReduction.toFixed(4)),
    light_wrap_energy: Number(lightWrapEnergy.toFixed(4)),
    alpha_histogram: hist,
    alpha_map: alphas.slice(0, 2048).map((v) => Number(v.toFixed(4))),
    quality_grade: grade
  };
}

function qkRgbToHexClient(rgb) {
  const hex = (v) => Math.round(clampNum(v, 0, 1) * 255).toString(16).toUpperCase().padStart(2, "0");
  return `0x${hex(rgb[0])}${hex(rgb[1])}${hex(rgb[2])}`;
}

export function compileQualifierFiltergraphClient(rawCfg) {
  const cfg = normalizeQualifierKeyerConfigClient(rawCfg);
  const targetHex = qkRgbToHexClient(cfg.target_rgb);
  const warnings = [];
  if (!cfg.enabled) {
    return {
      enabled: false,
      preset_id: cfg.preset_id,
      key_mode: cfg.key_mode,
      highlight_mode: cfg.highlight_mode,
      ffmpeg_key_filter: "null",
      ffmpeg_despill_filter: "null",
      ffmpeg_matte_finesse_filter: "null",
      ffmpeg_light_wrap_filter: "null",
      ffmpeg_filter_expr: "null",
      target_hex: targetHex,
      warnings: ["Qualifier Keyer bypass active (enabled=false)."]
    };
  }
  let keyFilter;
  if (cfg.key_mode === "luma_key") {
    const threshold = clampNum(0.5 * (cfg.luma_low + cfg.luma_high), 0, 1);
    const tol = clampNum(0.5 * (cfg.luma_high - cfg.luma_low), 0.01, 1);
    const soft = clampNum(cfg.luma_softness, 0, 1);
    keyFilter = `format=rgba,lumakey=threshold=${threshold.toFixed(4)}:tolerance=${tol.toFixed(4)}:softness=${soft.toFixed(4)}`;
  } else if (cfg.key_mode === "chroma_3d") {
    const sim = clampNum(cfg.chroma_distance, 0.01, 1);
    const blend = clampNum(cfg.chroma_softness, 0, 0.6);
    keyFilter = `format=rgba,colorkey=color=${targetHex}:similarity=${sim.toFixed(4)}:blend=${blend.toFixed(4)}`;
  } else if (cfg.key_mode === "hsl") {
    const sim = clampNum(cfg.hue_width / 360, 0.02, 0.85);
    const blend = clampNum(cfg.hue_softness / 180, 0, 0.5);
    keyFilter = `format=rgba,chromakey=color=${targetHex}:similarity=${sim.toFixed(4)}:blend=${blend.toFixed(4)}`;
  } else {
    const sim = clampNum(cfg.chroma_distance, 0.01, 1);
    const blend = clampNum(cfg.chroma_softness, 0, 0.6);
    keyFilter = `format=rgba,chromakey=color=${targetHex}:similarity=${sim.toFixed(4)}:blend=${blend.toFixed(4)}`;
  }

  const spillCh = qkDetectSpillChannelClient(cfg);
  let despillFilter = "null";
  if (cfg.despill_mode !== "none" && cfg.despill_strength > 1e-6) {
    if (spillCh === "r") {
      warnings.push("Red/sodium despill mapped to FFmpeg colorbalance warm-spill trim.");
      const shift = (-0.35 * cfg.despill_strength).toFixed(3);
      despillFilter = `colorbalance=rm=${shift}:rh=${shift}`;
    } else {
      const despillType = spillCh === "b" ? "blue" : "green";
      const mix = clampNum(0.5 * cfg.despill_strength, 0, 1).toFixed(3);
      const expand = clampNum(0.25 * cfg.despill_strength, 0, 1).toFixed(3);
      const bright = cfg.despill_mode === "luma_preserving" ? "0.120" : "0.000";
      despillFilter = `despill=type=${despillType}:mix=${mix}:expand=${expand}:brightness=${bright}`;
    }
  }

  const matteOps = [];
  if (cfg.pre_blur_radius >= 0.5) {
    matteOps.push(`boxblur=lr=${Math.max(1, Math.round(cfg.pre_blur_radius))}:lp=1`);
  }
  if (cfg.clean_black > 0.001 || cfg.clean_white < 0.999) {
    const span = Math.max(0.01, cfg.clean_white - cfg.clean_black);
    matteOps.push(`lut=y='clip((val/255-${cfg.clean_black.toFixed(4)})/${span.toFixed(4)}\\,0\\,1)*255'`);
  }
  if (cfg.choke_px <= -0.5) {
    const steps = Math.min(4, Math.max(1, Math.round(Math.abs(cfg.choke_px))));
    for (let i = 0; i < steps; i += 1) matteOps.push("erosion");
  } else if (cfg.choke_px >= 0.5) {
    const steps = Math.min(4, Math.max(1, Math.round(cfg.choke_px)));
    for (let i = 0; i < steps; i += 1) matteOps.push("dilation");
  }
  if (cfg.post_feather_px >= 0.5) {
    matteOps.push(`boxblur=lr=${Math.max(1, Math.round(cfg.post_feather_px))}:lp=1`);
  }
  const matteFinesseFilter = matteOps.length > 0
    ? `split[qkfg][qkalp];[qkalp]alphaextract,${matteOps.join(",")}[qkmatte];[qkfg][qkmatte]alphamerge`
    : "null";

  const bgHex = qkRgbToHexClient(cfg.light_wrap_bg_rgb);
  let lightWrapFilter = "null";
  if (cfg.highlight_mode === "bw_alpha_matte") lightWrapFilter = "alphaextract,format=rgb24";
  else if (cfg.highlight_mode === "red_rubylith") lightWrapFilter = "format=rgba";
  else if (cfg.light_wrap_intensity > 0.01 && cfg.light_wrap_radius > 0.5) {
    const lwAlpha = clampNum(cfg.light_wrap_intensity * 0.45, 0, 1).toFixed(3);
    const lwBlur = Math.min(4, Math.max(1, Math.round(cfg.light_wrap_radius)));
    lightWrapFilter = `drawbox=color=${bgHex}@${lwAlpha}:t=2:box_source=0,boxblur=lr=${lwBlur}:lp=1`;
  }

  const ordered = [keyFilter];
  if (despillFilter !== "null") ordered.push(despillFilter);
  const prefix = ordered.join(",");
  const suffix = cfg.highlight_mode === "bw_alpha_matte" ? ",alphaextract,format=rgb24" : "";
  const fullExpr = matteFinesseFilter !== "null"
    ? `${prefix},${matteFinesseFilter}${suffix}`
    : `${prefix}${suffix}`;

  return {
    enabled: true,
    preset_id: cfg.preset_id,
    key_mode: cfg.key_mode,
    highlight_mode: cfg.highlight_mode,
    ffmpeg_key_filter: keyFilter,
    ffmpeg_despill_filter: despillFilter,
    ffmpeg_matte_finesse_filter: matteFinesseFilter,
    ffmpeg_light_wrap_filter: lightWrapFilter,
    ffmpeg_filter_expr: fullExpr,
    target_hex: targetHex,
    warnings
  };
}

export function generateQualifierCubeTextClient(
  rawCfg,
  size = 17,
  mode = "isolation",
  title = "taktcut_qualifier_keyer"
) {
  const gridSize = Number.isInteger(Number(size)) && Number(size) >= 2 && Number(size) <= 65 ? Number(size) : 17;
  const cubeMode = ALLOWED_QUALIFIER_CUBE_MODES.includes(mode) ? mode : "isolation";
  const cfg = normalizeQualifierKeyerConfigClient(rawCfg);
  const cleanTitle = String(title || "taktcut_qualifier_keyer").replace(/"/g, "").trim() || "taktcut_qualifier_keyer";
  const lines = [
    `TITLE "${cleanTitle}"`,
    `LUT_3D_SIZE ${gridSize}`,
    "DOMAIN_MIN 0.0 0.0 0.0",
    "DOMAIN_MAX 1.0 1.0 1.0"
  ];
  const denom = gridSize - 1;
  for (let bIdx = 0; bIdx < gridSize; bIdx += 1) {
    const b = bIdx / denom;
    for (let gIdx = 0; gIdx < gridSize; gIdx += 1) {
      const g = gIdx / denom;
      for (let rIdx = 0; rIdx < gridSize; rIdx += 1) {
        const r = rIdx / denom;
        const [alpha, dr, dg, db] = evaluateQualifierKeyerPixelClient(cfg, r, g, b);
        let outR = dr * alpha;
        let outG = dg * alpha;
        let outB = db * alpha;
        if (cubeMode === "matte") {
          outR = alpha;
          outG = alpha;
          outB = alpha;
        } else if (cubeMode === "despill") {
          outR = dr;
          outG = dg;
          outB = db;
        }
        lines.push(`${outR.toFixed(6)} ${outG.toFixed(6)} ${outB.toFixed(6)}`);
      }
    }
  }
  return `${lines.join("\n")}\n`;
}

// =============================================================================
// MULTI-CAM ANGLE SYNC & LIVE QUAD-VIEW SWITCHER STUDIO (CYCLE #106)
// =============================================================================

export const ALLOWED_MULTICAM_STUDIO_PRESET_IDS = Object.freeze([
  "podcast_4cam_interview",
  "concert_3cam_audio_lock",
  "tutorial_2cam_pip_switch",
  "custom"
]);

export const ALLOWED_MULTICAM_STUDIO_SYNC_MODES = Object.freeze([
  "audio_waveform",
  "timecode",
  "slate_marker"
]);

export const ALLOWED_MULTICAM_STUDIO_CUT_MODES = Object.freeze([
  "video_only",
  "video_and_audio"
]);

export const ALLOWED_MULTICAM_STUDIO_COMPILE_MODES = Object.freeze([
  "program_stitch",
  "quad_view"
]);

const MC_STUDIO_SAMPLE_RATE_HZ = 20;
const MC_STUDIO_ANGLE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899"];
const MC_STUDIO_BANK_COLORS = ["amber", "violet", "teal", "blue"];

function mcAmpToDbClient(amp) {
  return Number((20 * Math.log10(Math.max(1e-4, Math.min(1, Number(amp) || 0.0001)))).toFixed(2));
}

function mcSmpteToFramesClient(tc, fpsInt) {
  const parts = String(tc || "00:00:00:00").trim().split(":");
  if (parts.length !== 4) return 0;
  const hh = Number.parseInt(parts[0], 10) || 0;
  const mm = Number.parseInt(parts[1], 10) || 0;
  const ss = Number.parseInt(parts[2], 10) || 0;
  const ff = Number.parseInt(parts[3], 10) || 0;
  const rate = Math.max(1, fpsInt);
  return ((hh * 3600 + mm * 60 + ss) * rate) + Math.min(rate - 1, Math.max(0, ff));
}

function mcFramesToSmpteClient(frames, fpsInt) {
  const rate = Math.max(1, fpsInt);
  const total = Math.max(0, Math.round(frames));
  const ff = total % rate;
  const totalS = Math.floor(total / rate);
  const ss = totalS % 60;
  const mm = Math.floor(totalS / 60) % 60;
  const hh = Math.floor(totalS / 3600);
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}:${pad2(ff)}`;
}

export function synthesizeAngleWaveformClient(
  angleIndex,
  durationS = 24,
  opts = {}
) {
  const sampleRateHz = Number(opts.sampleRateHz || MC_STUDIO_SAMPLE_RATE_HZ);
  const shiftFrames = Number(opts.shiftFrames || 0);
  const fps = Math.max(1, Number(opts.fps || 25));
  const presetId = String(opts.presetId || "podcast_4cam_interview");
  const slateFrame = Number(opts.slateFrame ?? 12);
  const totalSamples = Math.max(20, Math.min(4096, Math.round(durationS * sampleRateHz)));
  const shiftS = shiftFrames / fps;
  const slateT = slateFrame / fps;
  const out = [];

  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRateHz;
    const tRef = t + shiftS;
    const noise = 0.045 + 0.015 * Math.sin(tRef * 13.7 + angleIndex * 1.1);
    const clapDist = Math.abs(t - slateT);
    const clap = 0.94 * Math.exp(-((clapDist / 0.055) ** 2));

    let speech = 0;
    if (presetId === "concert_3cam_audio_lock") {
      const beat = 0.38 + 0.28 * Math.max(0, Math.sin(tRef * 1.45));
      const solo = 0.28 * Math.max(0, Math.sin(tRef * 0.43 + 0.5));
      const bridge = 0.16 * Math.max(0, Math.cos(tRef * 2.17));
      const prox = angleIndex === 1 ? 1.0 : angleIndex === 2 ? 0.88 : 0.80;
      speech = (beat + solo + bridge) * prox;
    } else if (presetId === "tutorial_2cam_pip_switch") {
      const cycle = ((tRef % 8) + 8) % 8;
      const active =
        angleIndex === 1
          ? cycle < 4.5 || cycle > 6.8
            ? 1.0
            : 0.18
          : cycle >= 4.2 && cycle <= 7.1
            ? 0.88
            : 0.16;
      const cadence = 0.55 + 0.35 * Math.abs(Math.sin(tRef * 4.3 + angleIndex * 0.4));
      speech = active * cadence * 0.82;
    } else {
      const slot = Math.floor(Math.max(0, tRef) / 3) % 4;
      const dominant = slot + 1 === angleIndex;
      const baseEnergy = dominant ? 0.82 : 0.14;
      const syllable = 0.58 + 0.36 * Math.abs(Math.sin(tRef * 5.2 + angleIndex * 0.7));
      speech = baseEnergy * syllable;
    }

    const val = Math.max(0.01, Math.min(1, noise + clap + speech * 0.72));
    out.push(Number(val.toFixed(4)));
  }
  return out;
}

export function correlateAudioEnvelopesClient(refEnv, candEnv, opts = {}) {
  const sampleRateHz = Number(opts.sampleRateHz || MC_STUDIO_SAMPLE_RATE_HZ);
  const fps = Math.max(1, Number(opts.fps || 25));
  const maxLagFrames = Number(opts.maxLagFrames || 75);
  const nRef = Array.isArray(refEnv) ? refEnv.length : 0;
  const nCand = Array.isArray(candEnv) ? candEnv.length : 0;
  if (nRef < 4 || nCand < 4) {
    return { offset_frames: 0, micro_trim_ms: 0, confidence: 0.5 };
  }

  const maxSampleLag = Math.max(
    1,
    Math.min(Math.floor(nRef / 2), Math.round((maxLagFrames / fps) * sampleRateHz))
  );
  let sumRef = 0;
  let sumCand = 0;
  for (let i = 0; i < nRef; i += 1) sumRef += Number(refEnv[i] || 0);
  for (let j = 0; j < nCand; j += 1) sumCand += Number(candEnv[j] || 0);
  const meanRef = sumRef / nRef;
  const meanCand = sumCand / nCand;

  const scores = [];
  for (let lag = -maxSampleLag; lag <= maxSampleLag; lag += 1) {
    let num = 0;
    let denA = 0;
    let denB = 0;
    let overlap = 0;
    for (let i = 0; i < nRef; i += 1) {
      const j = i - lag;
      if (j >= 0 && j < nCand) {
        const a = Number(refEnv[i] || 0) - meanRef;
        const b = Number(candEnv[j] || 0) - meanCand;
        num += a * b;
        denA += a * a;
        denB += b * b;
        overlap += 1;
      }
    }
    const corr = overlap >= 4 && denA > 1e-9 && denB > 1e-9 ? num / Math.sqrt(denA * denB) : 0;
    scores.push([lag, Math.max(0, Math.min(1, corr))]);
  }

  let bestIdx = 0;
  for (let idx = 1; idx < scores.length; idx += 1) {
    if (scores[idx][1] > scores[bestIdx][1]) bestIdx = idx;
  }
  const [bestLagSamples, bestCorr] = scores[bestIdx];
  let fracSamples = 0;
  if (bestIdx > 0 && bestIdx < scores.length - 1) {
    const yL = scores[bestIdx - 1][1];
    const yC = scores[bestIdx][1];
    const yR = scores[bestIdx + 1][1];
    const denom = 2 * (yL - 2 * yC + yR);
    if (Math.abs(denom) > 1e-9) {
      fracSamples = Math.max(-0.5, Math.min(0.5, (yL - yR) / denom));
    }
  }
  const exactShiftS = (bestLagSamples + fracSamples) / sampleRateHz;
  const offsetFrames = Math.round(exactShiftS * fps);
  const residualS = exactShiftS - offsetFrames / fps;
  return {
    offset_frames: offsetFrames,
    micro_trim_ms: Number((residualS * 1000).toFixed(2)),
    confidence: Number(Math.max(0.15, Math.min(0.99, bestCorr)).toFixed(3))
  };
}

function buildDefaultMulticamStudioAnglesClient(presetId, fps = 25, durationS = 24) {
  const fpsInt = Math.max(1, Math.round(fps));
  const baseTc = mcSmpteToFramesClient("01:00:00:00", fpsInt);
  let specs;
  if (presetId === "tutorial_2cam_pip_switch") {
    specs = [
      ["CAM 1 - Presenter A-Cam", "media/cam1_presenter.mov", "#3b82f6", 0, 12],
      ["CAM 2 - Desk / Screen PiP", "media/cam2_overhead_desk.mov", "#10b981", 10, 22]
    ];
  } else if (presetId === "concert_3cam_audio_lock") {
    specs = [
      ["CAM 1 - Stage Wide FOH", "media/concert_foh_wide.mov", "#3b82f6", 0, 14],
      ["CAM 2 - Lead Vocal Close", "media/concert_vocal_close.mov", "#10b981", 18, 32],
      ["CAM 3 - Guitar / Drum Pit", "media/concert_stage_pit.mov", "#f59e0b", -9, 5]
    ];
  } else {
    specs = [
      ["CAM 1 - Host Wide", "media/podcast_cam1_host.mov", "#3b82f6", 0, 12],
      ["CAM 2 - Guest A Medium", "media/podcast_cam2_guest_a.mov", "#10b981", 14, 26],
      ["CAM 3 - Guest B Close", "media/podcast_cam3_guest_b.mov", "#f59e0b", -7, 5],
      ["CAM 4 - Table Two-Shot", "media/podcast_cam4_twoshot.mov", "#ec4899", 21, 33]
    ];
  }

  return specs.map(([name, sourcePath, colorTag, tcOff, slateFrame], idx) => {
    const angleIndex = idx + 1;
    return {
      angle_index: angleIndex,
      name,
      source_path: sourcePath,
      color_tag: colorTag,
      timecode_start: mcFramesToSmpteClient(Math.max(0, baseTc + tcOff), fpsInt),
      slate_marker_frame: slateFrame,
      manual_offset_frames: 0,
      audio_gain_db: 0,
      waveform_envelope: synthesizeAngleWaveformClient(angleIndex, durationS, {
        shiftFrames: 12 - slateFrame,
        fps,
        presetId,
        slateFrame
      }),
      enabled: true
    };
  });
}

export const MULTICAM_STUDIO_PRESETS_CLIENT = Object.freeze([
  {
    preset_id: "podcast_4cam_interview",
    label: "Podcast 4-Cam Interview",
    description: "4-angle studio interview with waveform cross-correlation and Audio-Follow-Video switching.",
    angle_count: 4,
    default_sync_mode: "audio_waveform",
    default_cut_mode: "video_and_audio",
    default_audio_follow_video: true,
    min_hold_ms: 650,
    default_config: {
      preset_id: "podcast_4cam_interview",
      sync_mode: "audio_waveform",
      cut_mode: "video_and_audio",
      audio_follow_video: true,
      master_audio_angle: 1,
      compile_mode: "program_stitch",
      fps: 25,
      duration_s: 24,
      width: 1920,
      height: 1080,
      min_hold_ms: 650,
      speaker_threshold_db: -26,
      speaker_hysteresis_db: 3,
      angles: buildDefaultMulticamStudioAnglesClient("podcast_4cam_interview", 25, 24),
      cuts: [
        { time_s: 0.0, angle_index: 1, cut_mode: "video_and_audio", source: "initial", confidence: 1 },
        { time_s: 3.0, angle_index: 2, cut_mode: "video_and_audio", source: "auto_speaker", confidence: 0.94 },
        { time_s: 6.0, angle_index: 3, cut_mode: "video_and_audio", source: "auto_speaker", confidence: 0.92 },
        { time_s: 9.0, angle_index: 4, cut_mode: "video_and_audio", source: "auto_speaker", confidence: 0.91 },
        { time_s: 12.0, angle_index: 1, cut_mode: "video_and_audio", source: "auto_speaker", confidence: 0.95 },
        { time_s: 16.5, angle_index: 2, cut_mode: "video_and_audio", source: "auto_speaker", confidence: 0.93 }
      ]
    }
  },
  {
    preset_id: "concert_3cam_audio_lock",
    label: "Concert 3-Cam Audio Lock",
    description: "3-angle live stage switching locked to Master FOH audio via SMPTE timecode.",
    angle_count: 3,
    default_sync_mode: "timecode",
    default_cut_mode: "video_only",
    default_audio_follow_video: false,
    min_hold_ms: 500,
    default_config: {
      preset_id: "concert_3cam_audio_lock",
      sync_mode: "timecode",
      cut_mode: "video_only",
      audio_follow_video: false,
      master_audio_angle: 1,
      compile_mode: "quad_view",
      fps: 25,
      duration_s: 24,
      width: 1920,
      height: 1080,
      min_hold_ms: 500,
      speaker_threshold_db: -30,
      speaker_hysteresis_db: 4,
      angles: buildDefaultMulticamStudioAnglesClient("concert_3cam_audio_lock", 25, 24),
      cuts: [
        { time_s: 0.0, angle_index: 1, cut_mode: "video_only", source: "initial", confidence: 1 },
        { time_s: 4.0, angle_index: 2, cut_mode: "video_only", source: "manual", confidence: 1 },
        { time_s: 8.5, angle_index: 3, cut_mode: "video_only", source: "manual", confidence: 1 },
        { time_s: 14.0, angle_index: 1, cut_mode: "video_only", source: "manual", confidence: 1 }
      ]
    }
  },
  {
    preset_id: "tutorial_2cam_pip_switch",
    label: "Tutorial 2-Cam Desk Switch",
    description: "2-angle presenter and overhead desk switching synced on clap/slate marker.",
    angle_count: 2,
    default_sync_mode: "slate_marker",
    default_cut_mode: "video_only",
    default_audio_follow_video: false,
    min_hold_ms: 550,
    default_config: {
      preset_id: "tutorial_2cam_pip_switch",
      sync_mode: "slate_marker",
      cut_mode: "video_only",
      audio_follow_video: false,
      master_audio_angle: 1,
      compile_mode: "program_stitch",
      fps: 25,
      duration_s: 24,
      width: 1920,
      height: 1080,
      min_hold_ms: 550,
      speaker_threshold_db: -27,
      speaker_hysteresis_db: 3.5,
      angles: buildDefaultMulticamStudioAnglesClient("tutorial_2cam_pip_switch", 25, 24),
      cuts: [
        { time_s: 0.0, angle_index: 1, cut_mode: "video_only", source: "initial", confidence: 1 },
        { time_s: 4.5, angle_index: 2, cut_mode: "video_only", source: "manual", confidence: 1 },
        { time_s: 11.0, angle_index: 1, cut_mode: "video_only", source: "manual", confidence: 1 },
        { time_s: 17.0, angle_index: 2, cut_mode: "video_only", source: "manual", confidence: 1 }
      ]
    }
  },
  {
    preset_id: "custom",
    label: "Custom Multi-Cam Bank",
    description: "Custom 2 to 4 camera configuration with manual offsets and custom hold thresholds.",
    angle_count: 4,
    default_sync_mode: "audio_waveform",
    default_cut_mode: "video_only",
    default_audio_follow_video: false,
    min_hold_ms: 450,
    default_config: {
      preset_id: "custom",
      sync_mode: "audio_waveform",
      cut_mode: "video_only",
      audio_follow_video: false,
      master_audio_angle: 1,
      compile_mode: "program_stitch",
      fps: 25,
      duration_s: 24,
      width: 1920,
      height: 1080,
      min_hold_ms: 450,
      speaker_threshold_db: -26,
      speaker_hysteresis_db: 3,
      angles: buildDefaultMulticamStudioAnglesClient("podcast_4cam_interview", 25, 24),
      cuts: [
        { time_s: 0.0, angle_index: 1, cut_mode: "video_only", source: "initial", confidence: 1 },
        { time_s: 4.0, angle_index: 2, cut_mode: "video_only", source: "manual", confidence: 1 },
        { time_s: 9.0, angle_index: 3, cut_mode: "video_only", source: "manual", confidence: 1 }
      ]
    }
  }
]);

export function createDefaultMulticamStudioConfigClient(presetId = "podcast_4cam_interview") {
  const found =
    MULTICAM_STUDIO_PRESETS_CLIENT.find((p) => p.preset_id === presetId) ||
    MULTICAM_STUDIO_PRESETS_CLIENT[0];
  return JSON.parse(JSON.stringify(found.default_config));
}

export function normalizeMulticamStudioConfigClient(raw) {
  if (!raw || typeof raw !== "object") {
    return createDefaultMulticamStudioConfigClient("podcast_4cam_interview");
  }
  const presetId = ALLOWED_MULTICAM_STUDIO_PRESET_IDS.includes(raw.preset_id)
    ? raw.preset_id
    : "podcast_4cam_interview";
  const base = createDefaultMulticamStudioConfigClient(presetId);
  const fps = clampNum(raw.fps ?? base.fps, 1, 120);
  const durationS = clampNum(raw.duration_s ?? base.duration_s, 1, 86400);
  const width = Math.max(320, Math.min(7680, Math.round(Number(raw.width ?? base.width) || 1920)));
  const height = Math.max(180, Math.min(4320, Math.round(Number(raw.height ?? base.height) || 1080)));
  const syncMode = ALLOWED_MULTICAM_STUDIO_SYNC_MODES.includes(raw.sync_mode)
    ? raw.sync_mode
    : base.sync_mode;
  const cutMode = ALLOWED_MULTICAM_STUDIO_CUT_MODES.includes(raw.cut_mode)
    ? raw.cut_mode
    : base.cut_mode;
  const compileMode = ALLOWED_MULTICAM_STUDIO_COMPILE_MODES.includes(raw.compile_mode)
    ? raw.compile_mode
    : base.compile_mode;
  const audioFollowVideo = cutMode === "video_only" ? false : Boolean(raw.audio_follow_video ?? base.audio_follow_video);
  const minHoldMs = Math.max(100, Math.min(5000, Math.round(Number(raw.min_hold_ms ?? base.min_hold_ms) || 450)));
  const speakerThresholdDb = clampNum(raw.speaker_threshold_db ?? base.speaker_threshold_db, -60, 0);
  const speakerHysteresisDb = clampNum(raw.speaker_hysteresis_db ?? base.speaker_hysteresis_db, 0, 24);

  const rawAngles = Array.isArray(raw.angles) && raw.angles.length >= 2 ? raw.angles : base.angles;
  const angles = rawAngles.slice(0, 4).map((a, idx) => {
    const fallback = base.angles[idx] || base.angles[0];
    const angleIdx = Math.max(1, Math.min(4, Math.round(Number(a.angle_index ?? idx + 1) || idx + 1)));
    return {
      angle_index: angleIdx,
      name: String(a.name || fallback.name).slice(0, 64),
      source_path: String(a.source_path ?? fallback.source_path ?? ""),
      color_tag: String(a.color_tag || MC_STUDIO_ANGLE_COLORS[(angleIdx - 1) % 4]),
      timecode_start: String(a.timecode_start || fallback.timecode_start || "01:00:00:00"),
      slate_marker_frame: Math.max(0, Math.round(Number(a.slate_marker_frame ?? fallback.slate_marker_frame ?? 12))),
      manual_offset_frames: Math.max(-100000, Math.min(100000, Math.round(Number(a.manual_offset_frames ?? 0) || 0))),
      audio_gain_db: clampNum(a.audio_gain_db ?? 0, -24, 24),
      waveform_envelope: Array.isArray(a.waveform_envelope) && a.waveform_envelope.length >= 8
        ? a.waveform_envelope.map((v) => clampNum(v, 0, 1))
        : synthesizeAngleWaveformClient(angleIdx, durationS, {
            shiftFrames: 12 - Number(a.slate_marker_frame ?? fallback.slate_marker_frame ?? 12),
            fps,
            presetId,
            slateFrame: Number(a.slate_marker_frame ?? fallback.slate_marker_frame ?? 12)
          }),
      enabled: a.enabled !== false
    };
  });
  angles.sort((a, b) => a.angle_index - b.angle_index);
  const validIndices = new Set(angles.map((a) => a.angle_index));
  const masterAudioAngle = validIndices.has(Number(raw.master_audio_angle))
    ? Number(raw.master_audio_angle)
    : angles[0].angle_index;

  const byTime = new Map();
  const rawCuts = Array.isArray(raw.cuts) && raw.cuts.length > 0 ? raw.cuts : base.cuts;
  for (const c of rawCuts) {
    if (!c || !validIndices.has(Number(c.angle_index))) continue;
    const tClamped = Number(clampNum(c.time_s ?? 0, 0, Math.max(0, durationS - 0.04)).toFixed(3));
    byTime.set(tClamped, {
      time_s: tClamped,
      angle_index: Number(c.angle_index),
      cut_mode: ALLOWED_MULTICAM_STUDIO_CUT_MODES.includes(c.cut_mode) ? c.cut_mode : cutMode,
      source: ["initial", "manual", "auto_speaker"].includes(c.source) ? c.source : "manual",
      confidence: clampNum(c.confidence ?? 1, 0, 1)
    });
  }
  if (!byTime.has(0)) {
    byTime.set(0, {
      time_s: 0,
      angle_index: angles[0].angle_index,
      cut_mode: cutMode,
      source: "initial",
      confidence: 1
    });
  }
  const cuts = [];
  for (const tKey of Array.from(byTime.keys()).sort((a, b) => a - b)) {
    const ev = byTime.get(tKey);
    if (cuts.length > 0 && cuts[cuts.length - 1].angle_index === ev.angle_index && ev.time_s > 0) {
      continue;
    }
    cuts.push(ev);
  }

  return {
    preset_id: presetId,
    sync_mode: syncMode,
    cut_mode: cutMode,
    audio_follow_video: audioFollowVideo,
    master_audio_angle: masterAudioAngle,
    compile_mode: compileMode,
    fps,
    duration_s: durationS,
    width,
    height,
    min_hold_ms: minHoldMs,
    speaker_threshold_db: speakerThresholdDb,
    speaker_hysteresis_db: speakerHysteresisDb,
    angles,
    cuts
  };
}

export function syncMulticamStudioAnglesClient(rawConfig) {
  const cfg = normalizeMulticamStudioConfigClient(rawConfig);
  const fps = cfg.fps;
  const fpsInt = Math.max(1, Math.round(fps));
  const refAngle = cfg.angles[0];
  const refEnv = refAngle.waveform_envelope;
  const refTc = mcSmpteToFramesClient(refAngle.timecode_start, fpsInt);
  const refSlate = refAngle.slate_marker_frame;

  const angles = cfg.angles.map((angle) => {
    const env = angle.waveform_envelope;
    let peakIdx = 0;
    let sumSq = 0;
    for (let i = 0; i < env.length; i += 1) {
      if (env[i] > env[peakIdx]) peakIdx = i;
      sumSq += env[i] * env[i];
    }
    const peakAmp = env[peakIdx] || 0.1;
    const rmsAmp = Math.sqrt(sumSq / Math.max(1, env.length));
    const peakFrame = Math.round((peakIdx / MC_STUDIO_SAMPLE_RATE_HZ) * fps);

    let offsetFrames = 0;
    let microTrimMs = 0;
    let confidence = 0.99;

    if (cfg.sync_mode === "audio_waveform") {
      if (angle.angle_index === refAngle.angle_index) {
        offsetFrames = angle.manual_offset_frames;
      } else {
        const corr = correlateAudioEnvelopesClient(refEnv, env, {
          sampleRateHz: MC_STUDIO_SAMPLE_RATE_HZ,
          fps
        });
        offsetFrames = corr.offset_frames + angle.manual_offset_frames;
        microTrimMs = corr.micro_trim_ms;
        confidence = corr.confidence;
      }
    } else if (cfg.sync_mode === "timecode") {
      offsetFrames = (mcSmpteToFramesClient(angle.timecode_start, fpsInt) - refTc) + angle.manual_offset_frames;
      confidence = 1.0;
    } else {
      offsetFrames = (refSlate - angle.slate_marker_frame) + angle.manual_offset_frames;
      confidence = 0.97;
    }

    return {
      angle_index: angle.angle_index,
      name: angle.name,
      color_tag: angle.color_tag,
      offset_frames: offsetFrames,
      offset_s: Number((offsetFrames / fps).toFixed(4)),
      micro_trim_ms: microTrimMs,
      confidence,
      peak_frame: peakFrame,
      peak_db: mcAmpToDbClient(peakAmp),
      rms_db: mcAmpToDbClient(rmsAmp),
      waveform_envelope: env
    };
  });

  const meanConf = Number(
    (angles.reduce((acc, r) => acc + r.confidence, 0) / Math.max(1, angles.length)).toFixed(3)
  );
  return {
    preset_id: cfg.preset_id,
    sync_mode: cfg.sync_mode,
    fps,
    duration_s: cfg.duration_s,
    duration_frames: Math.max(1, Math.round(cfg.duration_s * fps)),
    reference_angle: refAngle.angle_index,
    mean_confidence: meanConf,
    angles,
    notes: [
      `Synchronized ${angles.length} camera angles using ${cfg.sync_mode} (mean confidence ${(meanConf * 100).toFixed(1)}%).`
    ]
  };
}

export function resolveMulticamStudioSegmentsClient(rawConfig) {
  const cfg = normalizeMulticamStudioConfigClient(rawConfig);
  const angleMap = new Map(cfg.angles.map((a) => [a.angle_index, a]));
  const ordered = [...cfg.cuts].sort((a, b) => a.time_s - b.time_s);
  const fps = cfg.fps;
  const totalFrames = Math.max(1, Math.round(cfg.duration_s * fps));
  const segments = [];
  const warnings = [];

  for (let idx = 0; idx < ordered.length; idx += 1) {
    const cut = ordered[idx];
    const startS = Number(Math.max(0, Math.min(cfg.duration_s - 0.04, cut.time_s)).toFixed(3));
    const endS = idx + 1 < ordered.length
      ? Number(Math.max(startS + 0.04, Math.min(cfg.duration_s, ordered[idx + 1].time_s)).toFixed(3))
      : Number(cfg.duration_s.toFixed(3));
    const durS = Number(Math.max(0.04, endS - startS).toFixed(3));
    const durMs = Math.max(1, Math.round(durS * 1000));
    const startF = Math.max(0, Math.min(totalFrames - 1, Math.round(startS * fps)));
    const endF = Math.max(startF + 1, Math.min(totalFrames, Math.round(endS * fps)));
    const angle = angleMap.get(cut.angle_index) || cfg.angles[0];
    const effCutMode =
      cfg.cut_mode === "video_only" && !cfg.audio_follow_video
        ? "video_only"
        : cfg.cut_mode === "video_and_audio" || cfg.audio_follow_video
          ? "video_and_audio"
          : cut.cut_mode;
    const audioAngle =
      effCutMode === "video_and_audio" && cfg.audio_follow_video
        ? angle.angle_index
        : cfg.master_audio_angle;
    const isShort = durMs < cfg.min_hold_ms;
    if (isShort) {
      warnings.push(
        `Segment #${idx + 1} (${angle.name}) at ${startS.toFixed(2)}s is ${durMs}ms (< min hold ${cfg.min_hold_ms}ms).`
      );
    }
    segments.push({
      segment_index: idx,
      start_s: startS,
      end_s: endS,
      duration_s: durS,
      duration_ms: durMs,
      start_frame: startF,
      end_frame: endF,
      duration_frames: Math.max(1, endF - startF),
      angle_index: angle.angle_index,
      angle_name: angle.name,
      color_tag: angle.color_tag,
      cut_mode: effCutMode,
      audio_angle_index: audioAngle,
      is_short_cut: isShort,
      source: cut.source || "manual"
    });
  }
  return { segments, short_cut_warnings: warnings };
}

export function autoSwitchMulticamSpeakersClient(rawConfig) {
  const cfg = normalizeMulticamStudioConfigClient(rawConfig);
  const syncReport = syncMulticamStudioAnglesClient(cfg);
  const envelopes = new Map(syncReport.angles.map((r) => [r.angle_index, r.waveform_envelope]));
  const offsetsS = new Map(syncReport.angles.map((r) => [r.angle_index, r.offset_s]));
  const gainsDb = new Map(cfg.angles.map((a) => [a.angle_index, a.audio_gain_db]));

  const stepS = 0.1;
  const minHoldS = Math.max(0.1, cfg.min_hold_ms / 1000);
  const totalSteps = Math.max(1, Math.round(cfg.duration_s / stepS));
  let currentAngle = cfg.angles[0].angle_index;
  let lastSwitchS = 0;
  const generatedCuts = [
    { time_s: 0, angle_index: currentAngle, cut_mode: cfg.cut_mode, source: "initial", confidence: 1 }
  ];
  const counts = {};
  for (const a of cfg.angles) counts[a.angle_index] = 0;

  for (let step = 0; step < totalSteps; step += 1) {
    const t = Number((step * stepS).toFixed(3));
    if (t < 0.8) {
      counts[currentAngle] += 1;
      continue;
    }
    let bestAngle = currentAngle;
    let bestDb = -999;
    let curDb = -999;

    for (const angle of cfg.angles) {
      if (!angle.enabled) continue;
      const env = envelopes.get(angle.angle_index) || [];
      const alignedT = Math.max(0, t - (offsetsS.get(angle.angle_index) || 0));
      const idx = Math.max(0, Math.min(env.length - 1, Math.round(alignedT * MC_STUDIO_SAMPLE_RATE_HZ)));
      const db = mcAmpToDbClient(env[idx] || 0.01) + (gainsDb.get(angle.angle_index) || 0);
      if (angle.angle_index === currentAngle) curDb = db;
      if (db > bestDb) {
        bestDb = db;
        bestAngle = angle.angle_index;
      }
    }

    if (
      bestAngle !== currentAngle &&
      bestDb >= cfg.speaker_threshold_db &&
      bestDb - curDb >= cfg.speaker_hysteresis_db &&
      t - lastSwitchS >= minHoldS &&
      cfg.duration_s - t >= minHoldS
    ) {
      currentAngle = bestAngle;
      lastSwitchS = t;
      generatedCuts.push({
        time_s: t,
        angle_index: bestAngle,
        cut_mode: cfg.cut_mode,
        source: "auto_speaker",
        confidence: Number(Math.max(0.55, Math.min(0.99, (bestDb + 60) / 60)).toFixed(3))
      });
    }
    counts[currentAngle] = (counts[currentAngle] || 0) + 1;
  }

  const nextCfg = normalizeMulticamStudioConfigClient({ ...cfg, cuts: generatedCuts });
  const { segments, short_cut_warnings } = resolveMulticamStudioSegmentsClient(nextCfg);
  const ratio = {};
  for (const [k, v] of Object.entries(counts)) {
    ratio[k] = Number((v / totalSteps).toFixed(3));
  }
  return {
    config: nextCfg,
    sync_report: syncReport,
    segments,
    short_cut_count: short_cut_warnings.length,
    short_cut_warnings,
    speaker_activity_ratio: ratio
  };
}

export function compileMulticamStudioFiltergraphClient(rawConfig, modeOverride = null) {
  const cfg = normalizeMulticamStudioConfigClient(rawConfig);
  const mode = ALLOWED_MULTICAM_STUDIO_COMPILE_MODES.includes(modeOverride)
    ? modeOverride
    : cfg.compile_mode;
  const syncReport = syncMulticamStudioAnglesClient(cfg);
  const offsetsS = new Map(syncReport.angles.map((r) => [r.angle_index, Math.max(0, r.offset_s)]));
  const angleToIn = new Map(cfg.angles.map((a, idx) => [a.angle_index, idx]));
  const { segments, short_cut_warnings } = resolveMulticamStudioSegmentsClient(cfg);

  const w = cfg.width;
  const h = cfg.height;
  const stages = [];
  const ffmpegArgs = [];
  for (const angle of cfg.angles) {
    ffmpegArgs.push("-i", angle.source_path || `cam${angle.angle_index}.mov`);
  }

  if (mode === "quad_view") {
    const cellW = Math.max(160, Math.floor(w / 2));
    const cellH = Math.max(90, Math.floor(h / 2));
    const cellLabels = [];
    const quadCoords = [
      [0, 0],
      [cellW, 0],
      [0, cellH],
      [cellW, cellH]
    ];
    for (let slot = 0; slot < 4; slot += 1) {
      const lbl = `[mc_q${slot}]`;
      if (slot < cfg.angles.length) {
        const angle = cfg.angles[slot];
        const inIdx = angleToIn.get(angle.angle_index) || 0;
        const offS = offsetsS.get(angle.angle_index) || 0;
        const endS = offS + cfg.duration_s;
        const safeTitle = String(angle.name || "").replace(/[:'\\]/g, "").slice(0, 24);
        stages.push(
          `[${inIdx}:v]trim=start=${offS.toFixed(3)}:end=${endS.toFixed(3)},` +
            `setpts=PTS-STARTPTS,scale=${cellW}:${cellH}:force_original_aspect_ratio=decrease,` +
            `pad=${cellW}:${cellH}:(ow-iw)/2:(oh-ih)/2:color=#101116,` +
            `drawtext=text='CAM ${angle.angle_index} ${safeTitle}':x=12:y=12:` +
            `fontsize=18:fontcolor=white:box=1:boxcolor=#0b0d12@0.75${lbl}`
        );
      } else {
        stages.push(`color=c=#101116:s=${cellW}x${cellH}:d=${cfg.duration_s.toFixed(3)}${lbl}`);
      }
      cellLabels.push(lbl);
    }
    stages.push(`${cellLabels.join("")}xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0[mc_stack]`);
    let curLbl = "[mc_stack]";
    for (let sIdx = 0; sIdx < segments.length; sIdx += 1) {
      const seg = segments[sIdx];
      const slotIdx = Math.max(0, Math.min(3, seg.angle_index - 1));
      const [qx, qy] = quadCoords[slotIdx];
      const nextLbl = sIdx === segments.length - 1 ? "[v_mc_quad]" : `[mc_tally_${sIdx}]`;
      stages.push(
        `${curLbl}drawbox=x=${qx}:y=${qy}:w=${cellW}:h=${cellH}:` +
          `color=#e53935@0.95:t=6:enable='between(t,${seg.start_s.toFixed(3)},${seg.end_s.toFixed(3)})'${nextLbl}`
      );
      curLbl = nextLbl;
    }
    const masterIn = angleToIn.get(cfg.master_audio_angle) || 0;
    const masterOff = offsetsS.get(cfg.master_audio_angle) || 0;
    stages.push(
      `[${masterIn}:a]atrim=start=${masterOff.toFixed(3)}:end=${(masterOff + cfg.duration_s).toFixed(3)},asetpts=PTS-STARTPTS[a_mc_quad]`
    );
    const filterComplex = stages.join(";");
    ffmpegArgs.push("-filter_complex", filterComplex, "-map", "[v_mc_quad]", "-map", "[a_mc_quad]");
    return {
      preset_id: cfg.preset_id,
      mode: "quad_view",
      duration_s: Number(cfg.duration_s.toFixed(3)),
      fps: cfg.fps,
      width: w,
      height: h,
      angle_count: cfg.angles.length,
      segment_count: segments.length,
      short_cut_count: short_cut_warnings.length,
      segments,
      short_cut_warnings,
      filter_complex: filterComplex,
      ffmpeg_args: ffmpegArgs,
      video_map_label: "[v_mc_quad]",
      audio_map_label: "[a_mc_quad]"
    };
  }

  const vLabels = [];
  const aLabels = [];
  for (let idx = 0; idx < segments.length; idx += 1) {
    const seg = segments[idx];
    const vIn = angleToIn.get(seg.angle_index) || 0;
    const vOff = offsetsS.get(seg.angle_index) || 0;
    const vLbl = `[mc_v${idx}]`;
    stages.push(
      `[${vIn}:v]trim=start=${(vOff + seg.start_s).toFixed(3)}:end=${(vOff + seg.end_s).toFixed(3)},` +
        `setpts=PTS-STARTPTS,scale=${w}:${h}:force_original_aspect_ratio=decrease,` +
        `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2${vLbl}`
    );
    vLabels.push(vLbl);

    const aIn = angleToIn.get(seg.audio_angle_index) || 0;
    const aOff = offsetsS.get(seg.audio_angle_index) || 0;
    const aLbl = `[mc_a${idx}]`;
    stages.push(
      `[${aIn}:a]atrim=start=${(aOff + seg.start_s).toFixed(3)}:end=${(aOff + seg.end_s).toFixed(3)},asetpts=PTS-STARTPTS${aLbl}`
    );
    aLabels.push(aLbl);
  }
  if (vLabels.length === 1) {
    stages.push(`${vLabels[0]}copy[v_mc]`);
    stages.push(`${aLabels[0]}acopy[a_mc]`);
  } else {
    stages.push(`${vLabels.join("")}concat=n=${vLabels.length}:v=1:a=0[v_mc]`);
    stages.push(`${aLabels.join("")}concat=n=${aLabels.length}:v=0:a=1[a_mc]`);
  }
  const filterComplex = stages.join(";");
  ffmpegArgs.push("-filter_complex", filterComplex, "-map", "[v_mc]", "-map", "[a_mc]");
  return {
    preset_id: cfg.preset_id,
    mode: "program_stitch",
    duration_s: Number(cfg.duration_s.toFixed(3)),
    fps: cfg.fps,
    width: w,
    height: h,
    angle_count: cfg.angles.length,
    segment_count: segments.length,
    short_cut_count: short_cut_warnings.length,
    segments,
    short_cut_warnings,
    filter_complex: filterComplex,
    ffmpeg_args: ffmpegArgs,
    video_map_label: "[v_mc]",
    audio_map_label: "[a_mc]"
  };
}

export function exportMulticamEdlClient(rawConfig, opts = {}) {
  const cfg = normalizeMulticamStudioConfigClient(rawConfig);
  const format = opts.format === "timeline_json" ? "timeline_json" : "edl";
  const cleanTitle =
    String(opts.title || "TAKTCUT_MULTICAM").trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "") ||
    "TAKTCUT_MULTICAM";
  const fpsInt = Math.max(1, Math.round(cfg.fps));
  const { segments, short_cut_warnings } = resolveMulticamStudioSegmentsClient(cfg);
  const syncReport = syncMulticamStudioAnglesClient(cfg);
  const offsetsF = new Map(syncReport.angles.map((r) => [r.angle_index, Math.max(0, r.offset_frames)]));
  const angleMap = new Map(cfg.angles.map((a) => [a.angle_index, a]));
  const baseSrcTc = mcSmpteToFramesClient("01:00:00:00", fpsInt);

  const lines = [`TITLE: ${cleanTitle}`, "FCM: NON-DROP FRAME", ""];
  const vClips = [];
  const aClips = [];
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    const angle = angleMap.get(seg.angle_index) || cfg.angles[0];
    const off = offsetsF.get(angle.angle_index) || 0;
    const reel = `CAM_${angle.angle_index}`.padEnd(8, " ").slice(0, 8);
    const trackCode = seg.cut_mode === "video_and_audio" ? "AA/V" : "V   ";
    lines.push(
      `${String(i + 1).padStart(3, "0")}  ${reel} ${trackCode}  C        ` +
        `${mcFramesToSmpteClient(baseSrcTc + off + seg.start_frame, fpsInt)} ` +
        `${mcFramesToSmpteClient(baseSrcTc + off + seg.end_frame, fpsInt)} ` +
        `${mcFramesToSmpteClient(seg.start_frame, fpsInt)} ` +
        `${mcFramesToSmpteClient(seg.end_frame, fpsInt)}`
    );
    lines.push(`* FROM CLIP NAME: ${angle.name}`);
    if (angle.source_path) lines.push(`* SOURCE FILE: ${angle.source_path}`);
    lines.push("");

    vClips.push({
      name: angle.name,
      track_index: 1,
      media_type: "video",
      start_frame: seg.start_frame,
      duration_frames: seg.duration_frames,
      source_in_frame: off + seg.start_frame,
      source_path: angle.source_path || `cam${angle.angle_index}.mov`
    });
    const aAngle = angleMap.get(seg.audio_angle_index) || cfg.angles[0];
    const aOff = offsetsF.get(aAngle.angle_index) || 0;
    aClips.push({
      name: `${aAngle.name} Audio`,
      track_index: 1,
      media_type: "audio",
      start_frame: seg.start_frame,
      duration_frames: seg.duration_frames,
      source_in_frame: aOff + seg.start_frame,
      source_path: aAngle.source_path || `cam${aAngle.angle_index}.mov`,
      audio_gain_db: aAngle.audio_gain_db
    });
  }

  const timelineDoc = {
    name: cleanTitle,
    source_format: "otio",
    fps: { num: fpsInt, den: 1 },
    width: cfg.width,
    height: cfg.height,
    start_frame: 0,
    tracks: [
      { index: 1, kind: "video", name: "V1 Multi-Cam Program", clips: vClips },
      { index: 1, kind: "audio", name: "A1 Multi-Cam Mix", clips: aClips }
    ]
  };
  return {
    format,
    title: cleanTitle,
    fps: cfg.fps,
    segment_count: segments.length,
    short_cut_count: short_cut_warnings.length,
    edl_text: `${lines.join("\n").trimEnd()}\n`,
    timeline_json: `${JSON.stringify(timelineDoc, null, 2)}\n`,
    saved_path: null,
    filename: `${cleanTitle.toLowerCase()}${format === "timeline_json" ? ".json" : ".edl"}`
  };
}

export function applyMulticamStudioToDocumentClient(doc, rawConfig, opts = {}) {
  const nextDoc = cloneTimelineDoc(doc);
  const cfg = normalizeMulticamStudioConfigClient(rawConfig);
  const syncReport = syncMulticamStudioAnglesClient(cfg);
  const offsetsMap = new Map(syncReport.angles.map((r) => [r.angle_index, r.offset_frames]));
  const trackIndex = Number(opts.track_index || 1);
  const trk = (nextDoc.tracks || []).find((t) => t.kind === "video" && t.index === trackIndex);
  if (!trk || !Array.isArray(trk.clips) || trk.clips.length === 0) {
    throw new Error(`Video track V${trackIndex} has no clips`);
  }
  const safeIdx = Math.max(0, Math.min(trk.clips.length - 1, Number(opts.clip_index || 0)));
  const targetClip = trk.clips[safeIdx];
  const bankDur = Math.max(1, Number(targetClip.duration_frames || 100));
  const fpsNum = nextDoc.fps && nextDoc.fps.num ? nextDoc.fps.num : Math.round(cfg.fps);
  const fpsDen = nextDoc.fps && nextDoc.fps.den ? nextDoc.fps.den : 1;

  const bank = {
    id: `mc_studio_${cfg.preset_id}`,
    name: `Multi-Cam (${cfg.preset_id})`,
    fps: { num: fpsNum, den: fpsDen },
    width: cfg.width,
    height: cfg.height,
    duration_frames: bankDur,
    sync_mode: cfg.sync_mode === "slate_marker" ? "marker" : cfg.sync_mode,
    audio_follow_angle: cfg.master_audio_angle,
    angles: cfg.angles.map((a) => ({
      angle_index: a.angle_index,
      name: a.name,
      source_path: a.source_path,
      source_in_frame: 0,
      duration_frames: bankDur,
      sync_offset_frames: offsetsMap.get(a.angle_index) || 0,
      timecode_start: a.timecode_start,
      audio_peak_frame: a.slate_marker_frame,
      color_tag: MC_STUDIO_BANK_COLORS[(a.angle_index - 1) % MC_STUDIO_BANK_COLORS.length],
      audio_follow: a.angle_index === cfg.master_audio_angle,
      enabled: a.enabled
    })),
    cuts: cfg.cuts.map((c) => ({
      frame: Math.max(0, Math.min(bankDur - 1, Math.round((c.time_s / Math.max(0.001, cfg.duration_s)) * bankDur))),
      angle_index: c.angle_index,
      cut_mode: c.cut_mode === "video_and_audio" || cfg.audio_follow_video ? "audio_video" : "video_only"
    }))
  };
  trk.clips[safeIdx] = {
    ...targetClip,
    name: bank.name,
    multicam_bank: bank
  };
  return nextDoc;
}

// =============================================================================
// AFTER EFFECTS / FUSION KEYFRAME SPLINE, SPEED GRAPH & MOTION BLUR (CYCLE #107)
// =============================================================================

export const ALLOWED_MOTION_SPLINE_PRESET_IDS = [
  "whip_zoom_punch",
  "smooth_dolly_push",
  "hero_title_overshoot",
  "cinematic_pan_hold",
  "custom"
];

export const ALLOWED_MOTION_SPLINE_CHANNELS = [
  "scale_pct",
  "position_x_px",
  "position_y_px",
  "rotation_deg",
  "opacity_pct"
];

export const ALLOWED_MOTION_SPLINE_HANDLE_MODES = [
  "linear",
  "easy_ease",
  "bezier",
  "hold",
  "overshoot"
];

export const MOTION_SPLINE_CHANNEL_SPECS_CLIENT = [
  { channel: "scale_pct", label: "Scale (%)", unit: "%", default_value: 100, min_value: 10, max_value: 400, color_hex: "#38bdf8" },
  { channel: "position_x_px", label: "Position X (px)", unit: "px", default_value: 0, min_value: -1920, max_value: 1920, color_hex: "#f87171" },
  { channel: "position_y_px", label: "Position Y (px)", unit: "px", default_value: 0, min_value: -1080, max_value: 1080, color_hex: "#4ade80" },
  { channel: "rotation_deg", label: "Rotation (deg)", unit: "deg", default_value: 0, min_value: -360, max_value: 360, color_hex: "#f59e0b" },
  { channel: "opacity_pct", label: "Opacity (%)", unit: "%", default_value: 100, min_value: 0, max_value: 100, color_hex: "#c084fc" }
];

const MS_SPEC_BY_ID = Object.fromEntries(
  MOTION_SPLINE_CHANNEL_SPECS_CLIENT.map((s) => [s.channel, s])
);

function msClamp(val, lo, hi) {
  return Math.max(lo, Math.min(hi, val));
}

function makeMsKeyframe(raw) {
  const mode = ALLOWED_MOTION_SPLINE_HANDLE_MODES.includes(raw.mode) ? raw.mode : "easy_ease";
  return {
    time_s: Number(msClamp(Number(raw.time_s ?? 0), 0, 3600).toFixed(4)),
    value: Number(msClamp(Number(raw.value ?? 0), -10000, 10000).toFixed(4)),
    mode,
    in_handle_x: Number(msClamp(Number(raw.in_handle_x ?? 0.67), 0.01, 0.99).toFixed(4)),
    in_handle_y: Number(msClamp(Number(raw.in_handle_y ?? 1.0), -1.5, 2.5).toFixed(4)),
    out_handle_x: Number(msClamp(Number(raw.out_handle_x ?? 0.33), 0.01, 0.99).toFixed(4)),
    out_handle_y: Number(msClamp(Number(raw.out_handle_y ?? 0.0), -1.5, 2.5).toFixed(4))
  };
}

function buildDefaultMotionSplineChannelsClient(presetId, durationS = 4.0) {
  const d = Math.max(0.5, Number(durationS || 4.0));
  const r3 = (x) => Number(x.toFixed(3));
  if (presetId === "whip_zoom_punch") {
    return {
      scale_pct: {
        channel: "scale_pct",
        enabled: true,
        keyframes: [
          makeMsKeyframe({ time_s: 0, value: 100, mode: "bezier", out_handle_x: 0.82, out_handle_y: 0.02 }),
          makeMsKeyframe({ time_s: r3(d * 0.22), value: 154, mode: "bezier", in_handle_x: 0.2, in_handle_y: 0.98, out_handle_x: 0.18, out_handle_y: 0 }),
          makeMsKeyframe({ time_s: r3(d * 0.58), value: 100, mode: "easy_ease", in_handle_x: 0.82, in_handle_y: 1.0 }),
          makeMsKeyframe({ time_s: r3(d), value: 104, mode: "easy_ease" })
        ]
      },
      position_x_px: {
        channel: "position_x_px",
        enabled: true,
        keyframes: [
          makeMsKeyframe({ time_s: 0, value: 0, mode: "bezier", out_handle_x: 0.75, out_handle_y: 0 }),
          makeMsKeyframe({ time_s: r3(d * 0.22), value: -48, mode: "bezier", in_handle_x: 0.25, in_handle_y: 1.0, out_handle_x: 0.25, out_handle_y: 0 }),
          makeMsKeyframe({ time_s: r3(d * 0.58), value: 0, mode: "easy_ease", in_handle_x: 0.75, in_handle_y: 1.0 })
        ]
      },
      position_y_px: {
        channel: "position_y_px",
        enabled: true,
        keyframes: [
          makeMsKeyframe({ time_s: 0, value: 0, mode: "easy_ease" }),
          makeMsKeyframe({ time_s: r3(d * 0.22), value: 18, mode: "easy_ease" }),
          makeMsKeyframe({ time_s: r3(d * 0.58), value: 0, mode: "easy_ease" })
        ]
      },
      rotation_deg: {
        channel: "rotation_deg",
        enabled: true,
        keyframes: [
          makeMsKeyframe({ time_s: 0, value: 0, mode: "bezier", out_handle_x: 0.78, out_handle_y: 0 }),
          makeMsKeyframe({ time_s: r3(d * 0.22), value: -5.5, mode: "bezier", in_handle_x: 0.22, in_handle_y: 1.0, out_handle_x: 0.22, out_handle_y: 0 }),
          makeMsKeyframe({ time_s: r3(d * 0.58), value: 0, mode: "easy_ease", in_handle_x: 0.78, in_handle_y: 1.0 })
        ]
      },
      opacity_pct: {
        channel: "opacity_pct",
        enabled: true,
        keyframes: [
          makeMsKeyframe({ time_s: 0, value: 100, mode: "linear" }),
          makeMsKeyframe({ time_s: r3(d), value: 100, mode: "linear" })
        ]
      }
    };
  }
  if (presetId === "smooth_dolly_push") {
    return {
      scale_pct: {
        channel: "scale_pct",
        enabled: true,
        keyframes: [
          makeMsKeyframe({ time_s: 0, value: 100, mode: "easy_ease", out_handle_x: 0.42, out_handle_y: 0 }),
          makeMsKeyframe({ time_s: r3(d), value: 122, mode: "easy_ease", in_handle_x: 0.58, in_handle_y: 1.0 })
        ]
      },
      position_x_px: {
        channel: "position_x_px",
        enabled: true,
        keyframes: [
          makeMsKeyframe({ time_s: 0, value: 0, mode: "easy_ease" }),
          makeMsKeyframe({ time_s: r3(d), value: 0, mode: "easy_ease" })
        ]
      },
      position_y_px: {
        channel: "position_y_px",
        enabled: true,
        keyframes: [
          makeMsKeyframe({ time_s: 0, value: 14, mode: "easy_ease" }),
          makeMsKeyframe({ time_s: r3(d), value: -14, mode: "easy_ease" })
        ]
      },
      rotation_deg: {
        channel: "rotation_deg",
        enabled: true,
        keyframes: [
          makeMsKeyframe({ time_s: 0, value: 0, mode: "linear" }),
          makeMsKeyframe({ time_s: r3(d), value: 0, mode: "linear" })
        ]
      },
      opacity_pct: {
        channel: "opacity_pct",
        enabled: true,
        keyframes: [
          makeMsKeyframe({ time_s: 0, value: 0, mode: "easy_ease" }),
          makeMsKeyframe({ time_s: r3(d * 0.18), value: 100, mode: "easy_ease" }),
          makeMsKeyframe({ time_s: r3(d), value: 100, mode: "linear" })
        ]
      }
    };
  }
  if (presetId === "hero_title_overshoot") {
    return {
      scale_pct: {
        channel: "scale_pct",
        enabled: true,
        keyframes: [
          makeMsKeyframe({ time_s: 0, value: 62, mode: "overshoot", out_handle_x: 0.22, out_handle_y: 0 }),
          makeMsKeyframe({ time_s: r3(d * 0.35), value: 100, mode: "overshoot", in_handle_x: 0.58, in_handle_y: 1.34 }),
          makeMsKeyframe({ time_s: r3(d), value: 103, mode: "linear" })
        ]
      },
      position_x_px: {
        channel: "position_x_px",
        enabled: true,
        keyframes: [
          makeMsKeyframe({ time_s: 0, value: 0, mode: "easy_ease" }),
          makeMsKeyframe({ time_s: r3(d), value: 0, mode: "easy_ease" })
        ]
      },
      position_y_px: {
        channel: "position_y_px",
        enabled: true,
        keyframes: [
          makeMsKeyframe({ time_s: 0, value: 140, mode: "overshoot", out_handle_x: 0.2, out_handle_y: 0 }),
          makeMsKeyframe({ time_s: r3(d * 0.35), value: 0, mode: "overshoot", in_handle_x: 0.58, in_handle_y: 1.28 })
        ]
      },
      rotation_deg: {
        channel: "rotation_deg",
        enabled: true,
        keyframes: [
          makeMsKeyframe({ time_s: 0, value: -3, mode: "overshoot" }),
          makeMsKeyframe({ time_s: r3(d * 0.35), value: 0, mode: "overshoot", in_handle_x: 0.58, in_handle_y: 1.25 })
        ]
      },
      opacity_pct: {
        channel: "opacity_pct",
        enabled: true,
        keyframes: [
          makeMsKeyframe({ time_s: 0, value: 0, mode: "easy_ease" }),
          makeMsKeyframe({ time_s: r3(d * 0.2), value: 100, mode: "easy_ease" }),
          makeMsKeyframe({ time_s: r3(d), value: 100, mode: "linear" })
        ]
      }
    };
  }
  return {
    scale_pct: {
      channel: "scale_pct",
      enabled: true,
      keyframes: [
        makeMsKeyframe({ time_s: 0, value: 115, mode: "linear" }),
        makeMsKeyframe({ time_s: r3(d), value: 115, mode: "linear" })
      ]
    },
    position_x_px: {
      channel: "position_x_px",
      enabled: true,
      keyframes: [
        makeMsKeyframe({ time_s: 0, value: -240, mode: "easy_ease", out_handle_x: 0.36, out_handle_y: 0 }),
        makeMsKeyframe({ time_s: r3(d * 0.35), value: 0, mode: "hold", in_handle_x: 0.64, in_handle_y: 1.0 }),
        makeMsKeyframe({ time_s: r3(d * 0.65), value: 0, mode: "easy_ease", out_handle_x: 0.36, out_handle_y: 0 }),
        makeMsKeyframe({ time_s: r3(d), value: 220, mode: "easy_ease", in_handle_x: 0.64, in_handle_y: 1.0 })
      ]
    },
    position_y_px: {
      channel: "position_y_px",
      enabled: true,
      keyframes: [
        makeMsKeyframe({ time_s: 0, value: 0, mode: "linear" }),
        makeMsKeyframe({ time_s: r3(d), value: 0, mode: "linear" })
      ]
    },
    rotation_deg: {
      channel: "rotation_deg",
      enabled: true,
      keyframes: [
        makeMsKeyframe({ time_s: 0, value: 0, mode: "linear" }),
        makeMsKeyframe({ time_s: r3(d), value: 0, mode: "linear" })
      ]
    },
    opacity_pct: {
      channel: "opacity_pct",
      enabled: true,
      keyframes: [
        makeMsKeyframe({ time_s: 0, value: 100, mode: "linear" }),
        makeMsKeyframe({ time_s: r3(d), value: 100, mode: "linear" })
      ]
    }
  };
}

export function createDefaultMotionSplineConfigClient(presetId = "whip_zoom_punch") {
  const pid = ALLOWED_MOTION_SPLINE_PRESET_IDS.includes(presetId) ? presetId : "whip_zoom_punch";
  const presetsMeta = {
    whip_zoom_punch: { active_channel: "scale_pct", graph_mode: "speed", shutter: 220, phase: -110, samples: 16 },
    smooth_dolly_push: { active_channel: "scale_pct", graph_mode: "value", shutter: 180, phase: -90, samples: 12 },
    hero_title_overshoot: { active_channel: "position_y_px", graph_mode: "value", shutter: 180, phase: -90, samples: 16 },
    cinematic_pan_hold: { active_channel: "position_x_px", graph_mode: "speed", shutter: 180, phase: -90, samples: 16 },
    custom: { active_channel: "scale_pct", graph_mode: "value", shutter: 180, phase: -90, samples: 16 }
  };
  const m = presetsMeta[pid];
  return {
    preset_id: pid,
    active_channel: m.active_channel,
    graph_mode: m.graph_mode,
    fps: 25,
    duration_s: 4.0,
    width: 1920,
    height: 1080,
    sample_count: 96,
    motion_blur: {
      enabled: true,
      shutter_angle_deg: m.shutter,
      shutter_phase_deg: m.phase,
      samples: m.samples
    },
    channels: buildDefaultMotionSplineChannelsClient(pid, 4.0)
  };
}

export const MOTION_SPLINE_PRESETS_CLIENT = [
  {
    preset_id: "whip_zoom_punch",
    label: "Whip Zoom Punch",
    description: "High-velocity Bezier whip zoom with rotational kick and 220 deg shutter.",
    default_shutter_angle_deg: 220,
    default_config: createDefaultMotionSplineConfigClient("whip_zoom_punch")
  },
  {
    preset_id: "smooth_dolly_push",
    label: "Smooth Dolly Push",
    description: "Subtle Easy Ease camera push with soft 180 deg cinematic motion blur.",
    default_shutter_angle_deg: 180,
    default_config: createDefaultMotionSplineConfigClient("smooth_dolly_push")
  },
  {
    preset_id: "hero_title_overshoot",
    label: "Hero Title Overshoot",
    description: "Elastic Bezier overshoot settling on scale and Y axis.",
    default_shutter_angle_deg: 180,
    default_config: createDefaultMotionSplineConfigClient("hero_title_overshoot")
  },
  {
    preset_id: "cinematic_pan_hold",
    label: "Cinematic Pan & Hold",
    description: "Smooth pan with mid-shot Hold plateau and twin bell speed curves.",
    default_shutter_angle_deg: 180,
    default_config: createDefaultMotionSplineConfigClient("cinematic_pan_hold")
  },
  {
    preset_id: "custom",
    label: "Custom",
    description: "Custom multi-channel cubic Bezier curves and shutter settings.",
    default_shutter_angle_deg: 180,
    default_config: createDefaultMotionSplineConfigClient("custom")
  }
];

export function normalizeMotionSplineConfigClient(raw) {
  if (!raw || typeof raw !== "object") {
    return createDefaultMotionSplineConfigClient("whip_zoom_punch");
  }
  const pid = ALLOWED_MOTION_SPLINE_PRESET_IDS.includes(String(raw.preset_id || "").trim().toLowerCase())
    ? String(raw.preset_id).trim().toLowerCase()
    : "whip_zoom_punch";
  const base = createDefaultMotionSplineConfigClient(pid);
  const durationS = msClamp(Number(raw.duration_s ?? base.duration_s), 0.5, 120);
  const fps = msClamp(Number(raw.fps ?? base.fps), 1, 120);
  const width = Math.round(msClamp(Number(raw.width ?? base.width), 320, 7680));
  const height = Math.round(msClamp(Number(raw.height ?? base.height), 180, 4320));
  const sampleCount = Math.round(msClamp(Number(raw.sample_count ?? base.sample_count), 16, 480));
  const activeChannel = ALLOWED_MOTION_SPLINE_CHANNELS.includes(raw.active_channel)
    ? raw.active_channel
    : base.active_channel;
  const graphMode = raw.graph_mode === "speed" ? "speed" : "value";

  const rawBlur = raw.motion_blur && typeof raw.motion_blur === "object" ? raw.motion_blur : {};
  const motionBlur = {
    enabled: rawBlur.enabled === undefined ? base.motion_blur.enabled : Boolean(rawBlur.enabled),
    shutter_angle_deg: Number(msClamp(Number(rawBlur.shutter_angle_deg ?? base.motion_blur.shutter_angle_deg), 0, 360).toFixed(2)),
    shutter_phase_deg: Number(msClamp(Number(rawBlur.shutter_phase_deg ?? base.motion_blur.shutter_phase_deg), -360, 360).toFixed(2)),
    samples: Math.round(msClamp(Number(rawBlur.samples ?? base.motion_blur.samples), 4, 32))
  };

  const defaultChannels = buildDefaultMotionSplineChannelsClient(pid, durationS);
  const rawChannels = raw.channels && typeof raw.channels === "object" ? raw.channels : {};
  const channels = {};
  for (const chId of ALLOWED_MOTION_SPLINE_CHANNELS) {
    const spec = MS_SPEC_BY_ID[chId];
    const srcTrack = rawChannels[chId];
    const kfsRaw = srcTrack && Array.isArray(srcTrack.keyframes) && srcTrack.keyframes.length > 0
      ? srcTrack.keyframes
      : defaultChannels[chId].keyframes;
    const sorted = kfsRaw
      .map((k) => makeMsKeyframe({
        ...k,
        value: msClamp(Number(k.value ?? spec.default_value), spec.min_value, spec.max_value)
      }))
      .sort((a, b) => a.time_s - b.time_s);
    const deduped = [];
    for (const kf of sorted) {
      if (deduped.length > 0 && Math.abs(kf.time_s - deduped[deduped.length - 1].time_s) < 1e-4) {
        deduped[deduped.length - 1] = kf;
      } else {
        deduped.push(kf);
      }
    }
    channels[chId] = {
      channel: chId,
      enabled: srcTrack && srcTrack.enabled !== undefined ? Boolean(srcTrack.enabled) : true,
      keyframes: deduped
    };
  }

  return {
    preset_id: pid,
    active_channel: activeChannel,
    graph_mode: graphMode,
    fps,
    duration_s: durationS,
    width,
    height,
    sample_count: sampleCount,
    motion_blur: motionBlur,
    channels
  };
}

function resolveSegmentBezierPointsClient(k0, k1) {
  if (k0.mode === "hold") return [0.33, 0.0, 0.67, 0.0];
  if (k0.mode === "linear" && k1.mode === "linear") return [0.33, 0.33, 0.67, 0.67];
  let p1x = 0.33;
  let p1y = 0.0;
  if (k0.mode === "linear") {
    p1x = 0.33;
    p1y = 0.33;
  } else if (k0.mode !== "easy_ease") {
    p1x = msClamp(Number(k0.out_handle_x ?? 0.33), 0.01, 0.99);
    p1y = msClamp(Number(k0.out_handle_y ?? 0.0), -1.5, 2.5);
  }
  let p2x = 0.67;
  let p2y = 1.0;
  if (k1.mode === "linear") {
    p2x = 0.67;
    p2y = 0.67;
  } else if (k1.mode === "overshoot") {
    p2x = msClamp(Number(k1.in_handle_x ?? 0.58), 0.01, 0.99);
    p2y = msClamp(Number(k1.in_handle_y !== 1.0 ? k1.in_handle_y : 1.32), -1.5, 2.5);
  } else if (k1.mode !== "easy_ease") {
    p2x = msClamp(Number(k1.in_handle_x ?? 0.67), 0.01, 0.99);
    p2y = msClamp(Number(k1.in_handle_y ?? 1.0), -1.5, 2.5);
  }
  return [p1x, p1y, p2x, p2y];
}

export function solveCubicBezierXClient(xTarget, p1x, p2x) {
  if (xTarget <= 0) return 0;
  if (xTarget >= 1) return 1;
  const c1x = msClamp(p1x, 0.001, 0.999);
  const c2x = msClamp(p2x, 0.001, 0.999);
  let lo = 0;
  let hi = 1;
  let u = xTarget;
  for (let i = 0; i < 12; i += 1) {
    const inv = 1 - u;
    const bx = 3 * inv * inv * u * c1x + 3 * inv * u * u * c2x + u * u * u;
    const err = bx - xTarget;
    if (Math.abs(err) < 1e-7) return msClamp(u, 0, 1);
    if (err < 0) lo = u;
    else hi = u;
    const dxDu = 3 * inv * inv * c1x + 6 * inv * u * (c2x - c1x) + 3 * u * u * (1 - c2x);
    if (Math.abs(dxDu) > 1e-6) {
      const cand = u - err / dxDu;
      if (cand > lo && cand < hi) {
        u = cand;
        continue;
      }
    }
    u = 0.5 * (lo + hi);
  }
  return msClamp(u, 0, 1);
}

export function evaluateSplineAtTClient(keyframes, timeS) {
  if (!Array.isArray(keyframes) || keyframes.length === 0) {
    return { time_s: Number(Math.max(0, timeS).toFixed(4)), value: 0, velocity_unit_s: 0, speed_abs_unit_s: 0, progress: 0 };
  }
  const ordered = [...keyframes].sort((a, b) => a.time_s - b.time_s);
  const t = Math.max(0, Number(timeS || 0));
  if (ordered.length === 1 || t <= ordered[0].time_s) {
    return {
      time_s: Number(t.toFixed(4)),
      value: Number(ordered[0].value.toFixed(4)),
      velocity_unit_s: 0,
      speed_abs_unit_s: 0,
      progress: 0
    };
  }
  if (t >= ordered[ordered.length - 1].time_s) {
    return {
      time_s: Number(t.toFixed(4)),
      value: Number(ordered[ordered.length - 1].value.toFixed(4)),
      velocity_unit_s: 0,
      speed_abs_unit_s: 0,
      progress: 1
    };
  }
  let segIdx = 0;
  for (let i = 0; i < ordered.length - 1; i += 1) {
    if (t >= ordered[i].time_s && t <= ordered[i + 1].time_s) {
      segIdx = i;
      break;
    }
  }
  const k0 = ordered[segIdx];
  const k1 = ordered[segIdx + 1];
  const dt = Math.max(1e-6, k1.time_s - k0.time_s);
  const dv = k1.value - k0.value;
  if (k0.mode === "hold") {
    return {
      time_s: Number(t.toFixed(4)),
      value: Number(k0.value.toFixed(4)),
      velocity_unit_s: 0,
      speed_abs_unit_s: 0,
      progress: 0
    };
  }
  const xTarget = msClamp((t - k0.time_s) / dt, 0, 1);
  const [p1x, p1y, p2x, p2y] = resolveSegmentBezierPointsClient(k0, k1);
  const u = solveCubicBezierXClient(xTarget, p1x, p2x);
  const inv = 1 - u;
  const by = 3 * inv * inv * u * p1y + 3 * inv * u * u * p2y + u * u * u;
  const c1x = msClamp(p1x, 0.001, 0.999);
  const c2x = msClamp(p2x, 0.001, 0.999);
  const dxDu = 3 * inv * inv * c1x + 6 * inv * u * (c2x - c1x) + 3 * u * u * (1 - c2x);
  const dyDu = 3 * inv * inv * p1y + 6 * inv * u * (p2y - p1y) + 3 * u * u * (1 - p2y);
  const slope = dxDu <= 1e-6 ? (Math.abs(dyDu) <= 1e-6 ? 0 : Math.sign(dyDu) * 12) : dyDu / dxDu;
  const val = k0.value + dv * by;
  const vel = (dv / dt) * slope;
  return {
    time_s: Number(t.toFixed(4)),
    value: Number(val.toFixed(4)),
    velocity_unit_s: Number(vel.toFixed(4)),
    speed_abs_unit_s: Number(Math.abs(vel).toFixed(4)),
    progress: Number(by.toFixed(4))
  };
}

export function evaluateMotionBlurAtTClient(rawConfig, timeS) {
  const cfg = normalizeMotionSplineConfigClient(rawConfig);
  const frameDur = 1 / Math.max(1, cfg.fps);
  const shutterFrac = cfg.motion_blur.enabled ? cfg.motion_blur.shutter_angle_deg / 360 : 0;
  const phaseFrac = cfg.motion_blur.shutter_phase_deg / 360;
  const tStart = Math.max(0, timeS + phaseFrac * frameDur);
  const tEnd = Math.max(tStart, Math.min(cfg.duration_s, tStart + shutterFrac * frameDur));
  const nSamples = cfg.motion_blur.samples;
  if (!cfg.motion_blur.enabled || cfg.motion_blur.shutter_angle_deg <= 0 || tEnd <= tStart) {
    return {
      time_s: Number(timeS.toFixed(4)),
      shutter_start_s: Number(timeS.toFixed(4)),
      shutter_end_s: Number(timeS.toFixed(4)),
      blur_streak_px: 0,
      blur_rotation_deg: 0,
      blur_scale_pct: 0,
      sample_count: nSamples
    };
  }
  const xs = [];
  const ys = [];
  const scales = [];
  const rots = [];
  for (let i = 0; i < nSamples; i += 1) {
    const frac = i / Math.max(1, nSamples - 1);
    const ts = tStart + frac * (tEnd - tStart);
    xs.push(evaluateSplineAtTClient(cfg.channels.position_x_px.keyframes, ts).value);
    ys.push(evaluateSplineAtTClient(cfg.channels.position_y_px.keyframes, ts).value);
    scales.push(evaluateSplineAtTClient(cfg.channels.scale_pct.keyframes, ts).value);
    rots.push(evaluateSplineAtTClient(cfg.channels.rotation_deg.keyframes, ts).value);
  }
  const dx = Math.max(...xs) - Math.min(...xs);
  const dy = Math.max(...ys) - Math.min(...ys);
  const dScale = Math.max(...scales) - Math.min(...scales);
  const dRot = Math.max(...rots) - Math.min(...rots);
  const refRadiusPx = 0.35 * Math.min(cfg.width, cfg.height);
  const transStreak = Math.hypot(dx, dy);
  const rotStreak = refRadiusPx * ((dRot * Math.PI) / 180);
  const scaleStreak = refRadiusPx * (dScale / 100);
  return {
    time_s: Number(timeS.toFixed(4)),
    shutter_start_s: Number(tStart.toFixed(4)),
    shutter_end_s: Number(tEnd.toFixed(4)),
    blur_streak_px: Number((transStreak + rotStreak + scaleStreak).toFixed(3)),
    blur_rotation_deg: Number(dRot.toFixed(3)),
    blur_scale_pct: Number(dScale.toFixed(3)),
    sample_count: nSamples
  };
}

export function evaluateMotionSplineStudioClient(rawConfig, activeTimeS = 0) {
  const cfg = normalizeMotionSplineConfigClient(rawConfig);
  const nPts = cfg.sample_count;
  const times = [];
  for (let i = 0; i < nPts; i += 1) {
    times.push(Number(((i / Math.max(1, nPts - 1)) * cfg.duration_s).toFixed(4)));
  }
  const curves = {};
  let peakVel = 0;
  for (const chId of ALLOWED_MOTION_SPLINE_CHANNELS) {
    const spec = MS_SPEC_BY_ID[chId];
    const track = cfg.channels[chId];
    const pts = times.map((t) => evaluateSplineAtTClient(track.keyframes, t));
    const vals = pts.map((p) => p.value);
    const chPeak = pts.reduce((acc, p) => Math.max(acc, p.speed_abs_unit_s), 0);
    if (track.enabled && chPeak > peakVel) peakVel = chPeak;
    curves[chId] = {
      channel: chId,
      label: spec.label,
      unit: spec.unit,
      color_hex: spec.color_hex,
      min_value: Number(Math.min(...vals).toFixed(4)),
      max_value: Number(Math.max(...vals).toFixed(4)),
      peak_velocity_unit_s: Number(chPeak.toFixed(4)),
      samples: pts
    };
  }
  const blurEnvelope = times.map((t) => evaluateMotionBlurAtTClient(cfg, t));
  const peakBlurPx = blurEnvelope.reduce((acc, b) => Math.max(acc, b.blur_streak_px), 0);
  const tAct = msClamp(Number(activeTimeS || 0), 0, cfg.duration_s);
  const activeValues = {};
  const activeVelocities = {};
  for (const chId of ALLOWED_MOTION_SPLINE_CHANNELS) {
    const ev = evaluateSplineAtTClient(cfg.channels[chId].keyframes, tAct);
    activeValues[chId] = ev.value;
    activeVelocities[chId] = ev.velocity_unit_s;
  }
  return {
    config: cfg,
    active_time_s: Number(tAct.toFixed(4)),
    active_values: activeValues,
    active_velocities: activeVelocities,
    active_blur: evaluateMotionBlurAtTClient(cfg, tAct),
    peak_velocity_unit_s: Number(peakVel.toFixed(4)),
    peak_blur_streak_px: Number(peakBlurPx.toFixed(3)),
    curves,
    blur_envelope: blurEnvelope
  };
}

function buildPiecewiseFfmpegExprClient(keyframes, defaultVal, scaleFactor = 1) {
  const ordered = [...(keyframes || [])].sort((a, b) => a.time_s - b.time_s);
  if (ordered.length === 0) return (defaultVal * scaleFactor).toFixed(4);
  if (ordered.length === 1) return (ordered[0].value * scaleFactor).toFixed(4);
  const terms = [`lt(t,${ordered[0].time_s.toFixed(3)})*${(ordered[0].value * scaleFactor).toFixed(4)}`];
  for (let i = 0; i < ordered.length - 1; i += 1) {
    const k0 = ordered[i];
    const k1 = ordered[i + 1];
    const v0 = k0.value * scaleFactor;
    const v1 = k1.value * scaleFactor;
    const dv = v1 - v0;
    const dt = Math.max(1e-4, k1.time_s - k0.time_s);
    const uExpr = `((t-${k0.time_s.toFixed(3)})/${dt.toFixed(4)})`;
    let segVal = `${v0.toFixed(4)}`;
    if (k0.mode === "linear" && k1.mode === "linear") {
      segVal = `(${v0.toFixed(4)}+(${dv.toFixed(4)})*${uExpr})`;
    } else if (k0.mode === "overshoot" || k1.mode === "overshoot") {
      segVal = `(${v0.toFixed(4)}+(${dv.toFixed(4)})*(3*pow(${uExpr},2)-2*pow(${uExpr},3)+0.22*sin(PI*${uExpr})))`;
    } else if (k0.mode !== "hold") {
      const [p1x, p1y, p2x, p2y] = resolveSegmentBezierPointsClient(k0, k1);
      segVal = `(${v0.toFixed(4)}+(${dv.toFixed(4)})*(3*pow(1-${uExpr},2)*${uExpr}*${p1y.toFixed(3)}+3*(1-${uExpr})*pow(${uExpr},2)*${p2y.toFixed(3)}+pow(${uExpr},3)+0.08*(${(0.5 - (p1x + p2x) * 0.5).toFixed(3)})*sin(PI*${uExpr})))`;
    }
    terms.push(`between(t,${k0.time_s.toFixed(3)},${k1.time_s.toFixed(3)})*${segVal}`);
  }
  const last = ordered[ordered.length - 1];
  terms.push(`gt(t,${last.time_s.toFixed(3)})*${(last.value * scaleFactor).toFixed(4)}`);
  return terms.join("+");
}

export function compileMotionSplineFiltergraphClient(rawConfig) {
  const cfg = normalizeMotionSplineConfigClient(rawConfig);
  const evalRes = evaluateMotionSplineStudioClient(cfg);
  const w = cfg.width;
  const h = cfg.height;
  const activeChannels = [];
  for (const chId of ALLOWED_MOTION_SPLINE_CHANNELS) {
    const spec = MS_SPEC_BY_ID[chId];
    const track = cfg.channels[chId];
    if (!track.enabled || !track.keyframes.length) continue;
    const first = track.keyframes[0].value;
    const anim = track.keyframes.some((k) => Math.abs(k.value - first) > 1e-4) || Math.abs(first - spec.default_value) > 1e-4;
    if (anim) activeChannels.push(chId);
  }
  const scaleExpr = buildPiecewiseFfmpegExprClient(cfg.channels.scale_pct.keyframes, 100, 0.01);
  const pxExpr = buildPiecewiseFfmpegExprClient(cfg.channels.position_x_px.keyframes, 0, 1);
  const pyExpr = buildPiecewiseFfmpegExprClient(cfg.channels.position_y_px.keyframes, 0, 1);
  const rotExpr = buildPiecewiseFfmpegExprClient(cfg.channels.rotation_deg.keyframes, 0, 1);
  const opExpr = buildPiecewiseFfmpegExprClient(cfg.channels.opacity_pct.keyframes, 100, 0.01);
  const filters = [];
  const shutterFrac = cfg.motion_blur.enabled ? Number((cfg.motion_blur.shutter_angle_deg / 360).toFixed(4)) : 0;
  let tmixFrames = 1;
  let weightsStr = "1";
  if (cfg.motion_blur.enabled && cfg.motion_blur.shutter_angle_deg > 0) {
    const subMult = Math.max(2, Math.min(8, Math.round(cfg.motion_blur.samples / 2)));
    const subFps = Number((cfg.fps * subMult).toFixed(2));
    tmixFrames = Math.max(2, Math.min(16, Math.round(cfg.motion_blur.samples * shutterFrac)));
    const center = (tmixFrames - 1) * (0.5 + msClamp(cfg.motion_blur.shutter_phase_deg / 360, -0.5, 0.5));
    const weights = [];
    for (let i = 0; i < tmixFrames; i += 1) {
      const wt = Math.exp(-0.5 * ((i - center) / Math.max(0.85, tmixFrames * 0.35)) ** 2);
      weights.push(wt.toFixed(3));
    }
    weightsStr = weights.join(" ");
    filters.push(`minterpolate=fps=${subFps}:mi_mode=blend`);
  }
  filters.push(`zoompan=z='max(0.1,${scaleExpr})':x='iw/2-(iw/zoom/2)+(${pxExpr})':y='ih/2-(ih/zoom/2)+(${pyExpr})':d=1:s=${w}x${h}:fps=${cfg.fps.toFixed(3)}`);
  if (activeChannels.includes("rotation_deg")) {
    filters.push(`rotate=a='(${rotExpr})*PI/180':ow=${w}:oh=${h}:fillcolor=black@0`);
  }
  filters.push(`crop=w=${w}:h=${h}:x='max(0,(iw-ow)/2)':y='max(0,(ih-oh)/2)'`);
  if (activeChannels.includes("opacity_pct")) {
    filters.push(`format=rgba,colorchannelmixer=aa='min(1,max(0,${opExpr}))'`);
  }
  if (cfg.motion_blur.enabled && cfg.motion_blur.shutter_angle_deg > 0) {
    filters.push(`tmix=frames=${tmixFrames}:weights='${weightsStr}'`);
    filters.push(`fps=${cfg.fps.toFixed(3)}`);
  }
  const vfChain = filters.join(",");
  const filterComplex = `[0:v]${vfChain}[v_spline]`;
  return {
    config: cfg,
    vf_chain: vfChain,
    filter_complex: filterComplex,
    ffmpeg_command: `ffmpeg -i input.mp4 -filter_complex "${filterComplex}" -map "[v_spline]" -map 0:a? -c:v libx264 -pix_fmt yuv420p output_motion_spline.mp4`,
    shutter_fraction: shutterFrac,
    tmix_frames: tmixFrames,
    tmix_weights: weightsStr,
    active_channels: activeChannels,
    peak_velocity_unit_s: evalRes.peak_velocity_unit_s,
    peak_blur_streak_px: evalRes.peak_blur_streak_px,
    summary: `${activeChannels.length} active channels | Shutter ${cfg.motion_blur.shutter_angle_deg.toFixed(0)} deg (${tmixFrames}f tmix) | Peak Vel ${evalRes.peak_velocity_unit_s.toFixed(1)} u/s | Blur ${evalRes.peak_blur_streak_px.toFixed(1)} px`
  };
}

export function exportMotionSplineJsonClient(rawConfig, opts = {}) {
  const cfg = normalizeMotionSplineConfigClient(rawConfig);
  const evalRes = evaluateMotionSplineStudioClient(cfg);
  const compiled = compileMotionSplineFiltergraphClient(cfg);
  const cleanTitle = String(opts.title || "TAKTCUT_SPLINE").trim().replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "TAKTCUT_SPLINE";
  const filename = opts.filename || `${cleanTitle.toLowerCase()}_motion_spline.json`;
  const channelsPayload = {};
  let totalKfs = 0;
  for (const chId of ALLOWED_MOTION_SPLINE_CHANNELS) {
    const track = cfg.channels[chId];
    totalKfs += track.keyframes.length;
    channelsPayload[chId] = {
      enabled: track.enabled,
      unit: MS_SPEC_BY_ID[chId].unit,
      peak_velocity_unit_s: evalRes.curves[chId].peak_velocity_unit_s,
      keyframes: track.keyframes.map((kf, idx) => {
        const dtPrev = idx > 0 ? Math.max(1e-4, kf.time_s - track.keyframes[idx - 1].time_s) : 0;
        const dtNext = idx + 1 < track.keyframes.length ? Math.max(1e-4, track.keyframes[idx + 1].time_s - kf.time_s) : 0;
        return {
          time_s: kf.time_s,
          frame: Math.round(kf.time_s * cfg.fps),
          value: kf.value,
          mode: kf.mode,
          bezier: {
            in_handle_x: kf.in_handle_x,
            in_handle_y: kf.in_handle_y,
            out_handle_x: kf.out_handle_x,
            out_handle_y: kf.out_handle_y
          },
          after_effects_temporal_ease: {
            in_influence_pct: Number(((1 - kf.in_handle_x) * 100).toFixed(2)),
            out_influence_pct: Number((kf.out_handle_x * 100).toFixed(2))
          },
          fusion_spline_handles: {
            LH: [-Number((dtPrev * (1 - kf.in_handle_x)).toFixed(4)), 0],
            RH: [Number((dtNext * kf.out_handle_x).toFixed(4)), 0]
          }
        };
      })
    };
  }
  const docPayload = {
    schema: "taktcut.motion_spline.v1",
    title: cleanTitle,
    compatible_hosts: ["After Effects CC", "DaVinci Resolve Fusion"],
    preset_id: cfg.preset_id,
    composition: {
      width: cfg.width,
      height: cfg.height,
      fps: cfg.fps,
      duration_s: cfg.duration_s
    },
    motion_blur: cfg.motion_blur,
    peak_metrics: {
      peak_velocity_unit_s: evalRes.peak_velocity_unit_s,
      peak_blur_streak_px: evalRes.peak_blur_streak_px
    },
    channels: channelsPayload,
    ffmpeg_vf: compiled.vf_chain
  };
  return {
    schema_version: "taktcut.motion_spline.v1",
    filename,
    title: cleanTitle,
    json_text: JSON.stringify(docPayload, null, 2),
    keyframe_count: totalKfs,
    peak_velocity_unit_s: evalRes.peak_velocity_unit_s,
    peak_blur_streak_px: evalRes.peak_blur_streak_px,
    saved_path: null
  };
}

export function applyMotionSplineToDocumentClient(doc, rawConfig, opts = {}) {
  const nextDoc = cloneTimelineDoc(doc);
  const cfg = normalizeMotionSplineConfigClient(rawConfig);
  const compiled = compileMotionSplineFiltergraphClient(cfg);
  const trackIndex = Number(opts.track_index || 1);
  const trk = (nextDoc.tracks || []).find((t) => t.kind === "video" && t.index === trackIndex)
    || (nextDoc.tracks || []).find((t) => t.kind === "video");
  if (!trk || !Array.isArray(trk.clips) || trk.clips.length === 0) {
    throw new Error(`Video track V${trackIndex} has no clips`);
  }
  const safeIdx = Math.max(0, Math.min(trk.clips.length - 1, Number(opts.clip_index || 0)));
  const serializedChannels = {};
  for (const chId of ALLOWED_MOTION_SPLINE_CHANNELS) {
    serializedChannels[chId] = cfg.channels[chId].keyframes.map((k) => ({ ...k }));
  }
  trk.clips[safeIdx] = {
    ...trk.clips[safeIdx],
    motion_spline: {
      enabled: true,
      preset_id: cfg.preset_id,
      shutter_angle_deg: cfg.motion_blur.shutter_angle_deg,
      shutter_phase_deg: cfg.motion_blur.shutter_phase_deg,
      samples: cfg.motion_blur.samples,
      fps: cfg.fps,
      duration_s: cfg.duration_s,
      peak_velocity_unit_s: compiled.peak_velocity_unit_s,
      peak_blur_streak_px: compiled.peak_blur_streak_px,
      ffmpeg_vf: compiled.vf_chain,
      channels: serializedChannels
    }
  };
  return nextDoc;
}

// =============================================================================
// BORIS FX SAPPHIRE S_GLOW / 35MM OPTICAL HALATION & ANAMORPHIC STREAK (CYCLE #108)
// =============================================================================

export const ALLOWED_OPTICAL_GLOW_PRESET_IDS = [
  "kodak_2383_halation",
  "sapphire_dream_bloom",
  "anamorphic_blue_streak",
  "neon_night_club",
  "subtle_cinema_aura",
  "custom"
];

export const ALLOWED_OPTICAL_GLOW_BLEND_MODES = [
  "screen",
  "add_clamp",
  "soft_light",
  "filmic_rolloff"
];

export const ALLOWED_OPTICAL_GLOW_VIEW_MODES = [
  "final_composite",
  "highlight_matte",
  "halation_only",
  "split_compare"
];

export const OPTICAL_GLOW_PRESETS_CLIENT = [
  {
    preset_id: "kodak_2383_halation",
    label: "Kodak 2383 35mm Halation",
    category: "Film Emulsion",
    description: "Authentic 35mm silver-halide red-amber back-scatter halation paired with filmic highlight rolloff.",
    default_config: {
      enabled: true,
      preset_id: "kodak_2383_halation",
      highlight_threshold: 0.70,
      threshold_softness: 0.14,
      halation_strength: 0.68,
      halation_spread_px: 16.0,
      halation_spectrum_rgb: [1.0, 0.28, 0.06],
      glow_intensity: 0.45,
      glow_radius_px: 20.0,
      glow_warmth_shift: 0.22,
      bloom_saturation: 1.12,
      octaves: 4,
      streak_intensity: 0.10,
      streak_length_px: 48.0,
      streak_angle_deg: 0.0,
      streak_tint_rgb: [1.0, 0.56, 0.28],
      blend_mode: "filmic_rolloff",
      view_mode: "final_composite",
      split_position: 0.5,
      width: 1920,
      height: 1080
    }
  },
  {
    preset_id: "sapphire_dream_bloom",
    label: "Sapphire S_Glow Dream Bloom",
    category: "Boris FX S_Glow",
    description: "Multi-octave exponential inverse-square glow inspired by Boris FX Sapphire S_Glow.",
    default_config: {
      enabled: true,
      preset_id: "sapphire_dream_bloom",
      highlight_threshold: 0.56,
      threshold_softness: 0.22,
      halation_strength: 0.28,
      halation_spread_px: 12.0,
      halation_spectrum_rgb: [1.0, 0.36, 0.14],
      glow_intensity: 1.05,
      glow_radius_px: 42.0,
      glow_warmth_shift: 0.10,
      bloom_saturation: 1.28,
      octaves: 5,
      streak_intensity: 0.18,
      streak_length_px: 56.0,
      streak_angle_deg: 15.0,
      streak_tint_rgb: [1.0, 0.88, 0.76],
      blend_mode: "screen",
      view_mode: "final_composite",
      split_position: 0.5,
      width: 1920,
      height: 1080
    }
  },
  {
    preset_id: "anamorphic_blue_streak",
    label: "Anamorphic Blue Streak",
    category: "Anamorphic Optics",
    description: "Panavision-style horizontal cobalt-cyan optical streak triggered by specular highlights.",
    default_config: {
      enabled: true,
      preset_id: "anamorphic_blue_streak",
      highlight_threshold: 0.66,
      threshold_softness: 0.12,
      halation_strength: 0.18,
      halation_spread_px: 10.0,
      halation_spectrum_rgb: [0.95, 0.28, 0.08],
      glow_intensity: 0.52,
      glow_radius_px: 22.0,
      glow_warmth_shift: -0.28,
      bloom_saturation: 1.25,
      octaves: 4,
      streak_intensity: 1.25,
      streak_length_px: 148.0,
      streak_angle_deg: 0.0,
      streak_tint_rgb: [0.18, 0.62, 1.0],
      blend_mode: "screen",
      view_mode: "final_composite",
      split_position: 0.5,
      width: 1920,
      height: 1080
    }
  },
  {
    preset_id: "neon_night_club",
    label: "Neon Night Club",
    category: "Stylized VFX",
    description: "High-saturation night bloom with diagonal magenta-cyan star glints.",
    default_config: {
      enabled: true,
      preset_id: "neon_night_club",
      highlight_threshold: 0.48,
      threshold_softness: 0.18,
      halation_strength: 0.42,
      halation_spread_px: 14.0,
      halation_spectrum_rgb: [1.0, 0.24, 0.10],
      glow_intensity: 1.18,
      glow_radius_px: 34.0,
      glow_warmth_shift: -0.12,
      bloom_saturation: 1.55,
      octaves: 5,
      streak_intensity: 0.68,
      streak_length_px: 96.0,
      streak_angle_deg: 22.0,
      streak_tint_rgb: [0.94, 0.34, 0.98],
      blend_mode: "add_clamp",
      view_mode: "final_composite",
      split_position: 0.5,
      width: 1920,
      height: 1080
    }
  },
  {
    preset_id: "subtle_cinema_aura",
    label: "Subtle Cinema Aura",
    category: "Narrative Drama",
    description: "Restrained highlight rolloff and gentle warmth aura protecting narrative skin tones.",
    default_config: {
      enabled: true,
      preset_id: "subtle_cinema_aura",
      highlight_threshold: 0.78,
      threshold_softness: 0.16,
      halation_strength: 0.32,
      halation_spread_px: 10.0,
      halation_spectrum_rgb: [1.0, 0.30, 0.08],
      glow_intensity: 0.34,
      glow_radius_px: 18.0,
      glow_warmth_shift: 0.14,
      bloom_saturation: 1.05,
      octaves: 3,
      streak_intensity: 0.06,
      streak_length_px: 36.0,
      streak_angle_deg: 0.0,
      streak_tint_rgb: [1.0, 0.85, 0.68],
      blend_mode: "soft_light",
      view_mode: "final_composite",
      split_position: 0.5,
      width: 1920,
      height: 1080
    }
  },
  {
    preset_id: "custom",
    label: "Custom Optical Studio",
    category: "User Custom",
    description: "User-defined highlight threshold, 35mm halation, bloom, and streak settings.",
    default_config: {
      enabled: true,
      preset_id: "custom",
      highlight_threshold: 0.70,
      threshold_softness: 0.14,
      halation_strength: 0.68,
      halation_spread_px: 16.0,
      halation_spectrum_rgb: [1.0, 0.28, 0.06],
      glow_intensity: 0.45,
      glow_radius_px: 20.0,
      glow_warmth_shift: 0.22,
      bloom_saturation: 1.12,
      octaves: 4,
      streak_intensity: 0.10,
      streak_length_px: 48.0,
      streak_angle_deg: 0.0,
      streak_tint_rgb: [1.0, 0.56, 0.28],
      blend_mode: "filmic_rolloff",
      view_mode: "final_composite",
      split_position: 0.5,
      width: 1920,
      height: 1080
    }
  }
];

function ogClamp(val, lo, hi) {
  return Math.min(hi, Math.max(lo, val));
}

function ogClamp01(val) {
  return Math.min(1, Math.max(0, val));
}

function ogRec709Luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ogNum(val, fallback, lo, hi) {
  if (typeof val === "boolean" || val === null || val === undefined || val === "") {
    return fallback;
  }
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return ogClamp(n, lo, hi);
}

function ogRgbTuple(raw, fallback) {
  if (!Array.isArray(raw) || raw.length !== 3) return [...fallback];
  return [
    ogNum(raw[0], fallback[0], 0, 1),
    ogNum(raw[1], fallback[1], 0, 1),
    ogNum(raw[2], fallback[2], 0, 1)
  ];
}

export function createDefaultOpticalGlowConfigClient(presetId = "kodak_2383_halation") {
  const found = OPTICAL_GLOW_PRESETS_CLIENT.find((p) => p.preset_id === presetId)
    || OPTICAL_GLOW_PRESETS_CLIENT[0];
  return {
    ...found.default_config,
    halation_spectrum_rgb: [...found.default_config.halation_spectrum_rgb],
    streak_tint_rgb: [...found.default_config.streak_tint_rgb]
  };
}

export function normalizeOpticalGlowConfigClient(raw) {
  if (!raw || typeof raw !== "object") {
    return createDefaultOpticalGlowConfigClient("kodak_2383_halation");
  }
  const pid = ALLOWED_OPTICAL_GLOW_PRESET_IDS.includes(raw.preset_id)
    ? raw.preset_id
    : "kodak_2383_halation";
  const base = createDefaultOpticalGlowConfigClient(pid);
  const blend = ALLOWED_OPTICAL_GLOW_BLEND_MODES.includes(raw.blend_mode)
    ? raw.blend_mode
    : base.blend_mode;
  const view = ALLOWED_OPTICAL_GLOW_VIEW_MODES.includes(raw.view_mode)
    ? raw.view_mode
    : base.view_mode;
  let width = Math.round(ogNum(raw.width, base.width, 64, 7680));
  let height = Math.round(ogNum(raw.height, base.height, 64, 4320));
  if (width % 2 !== 0) width -= 1;
  if (height % 2 !== 0) height -= 1;
  return {
    enabled: raw.enabled === undefined ? base.enabled : Boolean(raw.enabled),
    preset_id: pid,
    highlight_threshold: ogNum(raw.highlight_threshold, base.highlight_threshold, 0, 1),
    threshold_softness: ogNum(raw.threshold_softness, base.threshold_softness, 0, 0.5),
    halation_strength: ogNum(raw.halation_strength, base.halation_strength, 0, 1),
    halation_spread_px: ogNum(raw.halation_spread_px, base.halation_spread_px, 1, 64),
    halation_spectrum_rgb: ogRgbTuple(raw.halation_spectrum_rgb, base.halation_spectrum_rgb),
    glow_intensity: ogNum(raw.glow_intensity, base.glow_intensity, 0, 2),
    glow_radius_px: ogNum(raw.glow_radius_px, base.glow_radius_px, 2, 128),
    glow_warmth_shift: ogNum(raw.glow_warmth_shift, base.glow_warmth_shift, -1, 1),
    bloom_saturation: ogNum(raw.bloom_saturation, base.bloom_saturation, 0, 2),
    octaves: Math.round(ogNum(raw.octaves, base.octaves, 2, 6)),
    streak_intensity: ogNum(raw.streak_intensity, base.streak_intensity, 0, 2),
    streak_length_px: ogNum(raw.streak_length_px, base.streak_length_px, 4, 240),
    streak_angle_deg: ogNum(raw.streak_angle_deg, base.streak_angle_deg, -180, 180),
    streak_tint_rgb: ogRgbTuple(raw.streak_tint_rgb, base.streak_tint_rgb),
    blend_mode: blend,
    view_mode: view,
    split_position: ogNum(raw.split_position, base.split_position, 0, 1),
    width,
    height
  };
}

export function computeHighlightMatteAndEnergyClient(luma, threshold, softness) {
  const lum = ogClamp01(luma);
  const lo = ogClamp01(threshold - softness);
  const hi = ogClamp01(threshold + softness);
  let matte = 0;
  if (hi <= lo + 1e-6) {
    matte = lum >= threshold ? 1 : 0;
  } else {
    const t = ogClamp01((lum - lo) / (hi - lo));
    matte = t * t * (3 - 2 * t);
  }
  const energy = ogClamp01(matte * Math.max(0, lum - lo * 0.65));
  return [matte, energy];
}

export function evaluateExponentialFalloffAtDistanceClient(distancePx, radiusPx, octaves = 4) {
  const d = Math.max(0, Number(distancePx || 0));
  const baseR = Math.max(1, Number(radiusPx || 20));
  let total = 0;
  let wSum = 0;
  const octCount = Math.max(1, Math.round(octaves));
  for (let i = 0; i < octCount; i += 1) {
    const scale = 0.25 * (2 ** i);
    const rk = Math.max(0.75, (baseR * scale) / (2 ** Math.max(0, octCount - 2)));
    const wk = 1 / (1.45 ** i);
    const invSq = 1 / (1 + (d * d) / (rk * rk));
    total += wk * invSq;
    wSum += wk;
  }
  return ogClamp01(total / Math.max(1e-6, wSum));
}

export function evaluateOpticalGlowResponseClient(rawConfig) {
  const cfg = normalizeOpticalGlowConfigClient(rawConfig);
  const thresholdCurve = [];
  for (let i = 0; i <= 32; i += 1) {
    const lum = i / 32;
    const [matte, energy] = computeHighlightMatteAndEnergyClient(
      lum,
      cfg.highlight_threshold,
      cfg.threshold_softness
    );
    thresholdCurve.push({
      input_luma: Number(lum.toFixed(4)),
      matte_weight: Number(matte.toFixed(4)),
      extracted_energy: Number(energy.toFixed(4))
    });
  }
  const maxDist = Math.max(24, cfg.glow_radius_px * 1.6, cfg.halation_spread_px * 2.0);
  const falloffCurve = [];
  for (let i = 0; i <= 32; i += 1) {
    const dist = (i / 32) * maxDist;
    const bloomResp = cfg.enabled
      ? cfg.glow_intensity * evaluateExponentialFalloffAtDistanceClient(dist, cfg.glow_radius_px, cfg.octaves)
      : 0;
    const halSigma = Math.max(1, cfg.halation_spread_px * 0.45);
    const halResp = cfg.enabled
      ? cfg.halation_strength * Math.exp(-0.5 * ((dist / halSigma) ** 2))
      : 0;
    const stkScale = Math.max(2, cfg.streak_length_px * 0.35);
    const stkResp = cfg.enabled
      ? cfg.streak_intensity * Math.exp(-dist / stkScale)
      : 0;
    falloffCurve.push({
      distance_px: Number(dist.toFixed(2)),
      bloom_response: Number(Math.min(2, bloomResp).toFixed(4)),
      halation_response: Number(Math.min(1, halResp).toFixed(4)),
      streak_response: Number(Math.min(2, stkResp).toFixed(4))
    });
  }
  return {
    threshold_curve: thresholdCurve,
    falloff_curve: falloffCurve
  };
}

function synthesizeOpticalTestFrameClient(width = 24, height = 16) {
  const pixels = [];
  for (let y = 0; y < height; y += 1) {
    const ny = y / Math.max(1, height - 1);
    for (let x = 0; x < width; x += 1) {
      const nx = x / Math.max(1, width - 1);
      let r = 0.05 + 0.04 * (1 - ny);
      let g = 0.06 + 0.05 * (1 - ny);
      let b = 0.11 + 0.07 * (1 - ny);

      const dLamp = Math.hypot((nx - 0.28) * 1.45, ny - 0.28);
      if (dLamp < 0.24) {
        const k = ogClamp01((0.24 - dLamp) / 0.24);
        const k2 = k * k;
        r = Math.max(r, 0.98 * k2 + 0.35 * k);
        g = Math.max(g, 0.88 * k2 + 0.24 * k);
        b = Math.max(b, 0.70 * k2 + 0.12 * k);
      }

      const dNeon = Math.hypot((nx - 0.74) * 1.35, ny - 0.34);
      if (dNeon < 0.20) {
        const k = ogClamp01((0.20 - dNeon) / 0.20);
        const k2 = k * k;
        r = Math.max(r, 0.62 * k2 + 0.12 * k);
        g = Math.max(g, 0.92 * k2 + 0.36 * k);
        b = Math.max(b, 1.00 * k2 + 0.48 * k);
      }

      const dSubj = Math.hypot((nx - 0.50) * 1.25, (ny - 0.62) * 1.1);
      if (dSubj < 0.22) {
        r = Math.max(r, 0.54);
        g = Math.max(g, 0.38);
        b = Math.max(b, 0.30);
        if (nx > 0.54) {
          r = Math.max(r, 0.82);
          g = Math.max(g, 0.72);
          b = Math.max(b, 0.64);
        }
      }

      if (ny > 0.76 && (Math.abs(nx - 0.28) < 0.06 || Math.abs(nx - 0.74) < 0.06)) {
        r = Math.max(r, 0.76);
        g = Math.max(g, 0.74);
        b = Math.max(b, 0.78);
      }

      pixels.push([ogClamp01(r), ogClamp01(g), ogClamp01(b)]);
    }
  }
  return pixels;
}

function ogSeparableGaussian2d(grid, width, height, sigmaPx) {
  if (width <= 1 || height <= 1 || sigmaPx <= 0.15) return grid.map((p) => [...p]);
  const radius = Math.max(1, Math.min(6, Math.ceil(sigmaPx * 1.5)));
  const sigmaSq = Math.max(0.04, sigmaPx * sigmaPx);
  const weights = [];
  let wSum = 0;
  for (let dx = -radius; dx <= radius; dx += 1) {
    const w = Math.exp((-0.5 * dx * dx) / sigmaSq);
    weights.push(w);
    wSum += w;
  }
  const normW = weights.map((w) => w / wSum);
  const horiz = new Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const rowOff = y * width;
    for (let x = 0; x < width; x += 1) {
      let ar = 0;
      let ag = 0;
      let ab = 0;
      for (let k = 0; k < normW.length; k += 1) {
        const dx = k - radius;
        const sx = Math.min(width - 1, Math.max(0, x + dx));
        const p = grid[rowOff + sx];
        ar += p[0] * normW[k];
        ag += p[1] * normW[k];
        ab += p[2] * normW[k];
      }
      horiz[rowOff + x] = [ar, ag, ab];
    }
  }
  const out = new Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let ar = 0;
      let ag = 0;
      let ab = 0;
      for (let k = 0; k < normW.length; k += 1) {
        const dy = k - radius;
        const sy = Math.min(height - 1, Math.max(0, y + dy));
        const p = horiz[sy * width + x];
        ar += p[0] * normW[k];
        ag += p[1] * normW[k];
        ab += p[2] * normW[k];
      }
      out[y * width + x] = [ar, ag, ab];
    }
  }
  return out;
}

function ogDirectionalStreak2d(grid, width, height, lengthPx, angleDeg) {
  if (width <= 1 || height <= 1 || lengthPx < 1) return grid.map((p) => [...p]);
  const rad = (angleDeg * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);
  const steps = Math.max(2, Math.min(8, Math.round(lengthPx / 18)));
  const out = new Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let ar = 0;
      let ag = 0;
      let ab = 0;
      let wSum = 0;
      for (let s = -steps; s <= steps; s += 1) {
        const w = Math.exp(-Math.abs(s) / Math.max(1, steps * 0.55));
        const sx = Math.min(width - 1, Math.max(0, Math.round(x + ux * s)));
        const sy = Math.min(height - 1, Math.max(0, Math.round(y + uy * s)));
        const p = grid[sy * width + sx];
        ar += p[0] * w;
        ag += p[1] * w;
        ab += p[2] * w;
        wSum += w;
      }
      out[y * width + x] = [ar / wSum, ag / wSum, ab / wSum];
    }
  }
  return out;
}

function ogApplyHdrBlend(base, effect, blendMode) {
  const b = ogClamp01(base);
  const e = Math.max(0, effect);
  if (blendMode === "add_clamp") return ogClamp01(b + e);
  if (blendMode === "screen") {
    const ec = ogClamp01(e);
    return ogClamp01(1 - (1 - b) * (1 - ec));
  }
  if (blendMode === "soft_light") {
    const ec = ogClamp01(e * 0.85);
    return ogClamp01(b + 2 * ec * (1 - b) * (0.5 + 0.5 * b));
  }
  const combined = b + e;
  if (combined <= 0.72) return ogClamp01(combined);
  const excess = combined - 0.72;
  return ogClamp01(0.72 + 0.28 * (excess / (excess + 0.35)));
}

export function analyzeOpticalGlowSamplesClient(rawConfig, opts = {}) {
  const cfg = normalizeOpticalGlowConfigClient(rawConfig);
  const responseCurve = evaluateOpticalGlowResponseClient(cfg);
  let rgbList = [];
  let w = Number(opts.width || 0);
  let h = Number(opts.height || 0);

  if (Array.isArray(opts.pixels) && opts.pixels.length > 0) {
    const stride = w > 0 && h > 0 && opts.pixels.length === w * h * 4 ? 4 : 3;
    if (w <= 0 || h <= 0) {
      w = Math.max(1, Math.floor(opts.pixels.length / stride));
      h = 1;
    }
    const count = Math.min(w * h, Math.floor(opts.pixels.length / stride));
    let maxVal = 1;
    for (let i = 0; i < count * stride; i += 1) {
      if (Number(opts.pixels[i]) > maxVal) maxVal = Number(opts.pixels[i]);
    }
    const scale = maxVal > 1.001 ? 1 / 255 : 1;
    for (let i = 0; i < count; i += 1) {
      const b = i * stride;
      rgbList.push([
        ogClamp01(Number(opts.pixels[b]) * scale),
        ogClamp01(Number(opts.pixels[b + 1]) * scale),
        ogClamp01(Number(opts.pixels[b + 2]) * scale)
      ]);
    }
  } else if (Array.isArray(opts.samples) && opts.samples.length > 0) {
    let maxVal = 1;
    for (const row of opts.samples) {
      for (let c = 0; c < 3; c += 1) {
        if (Number(row[c]) > maxVal) maxVal = Number(row[c]);
      }
    }
    const scale = maxVal > 1.001 ? 1 / 255 : 1;
    rgbList = opts.samples.map((row) => [
      ogClamp01(Number(row[0]) * scale),
      ogClamp01(Number(row[1]) * scale),
      ogClamp01(Number(row[2]) * scale)
    ]);
    if (!(w > 0 && h > 0 && w * h === rgbList.length)) {
      w = rgbList.length;
      h = 1;
    }
  } else {
    w = 24;
    h = 16;
    rgbList = synthesizeOpticalTestFrameClient(w, h);
  }

  const total = rgbList.length;
  const mattes = [];
  const hiRgb = [];
  const histBefore = new Array(16).fill(0);
  let triggeredCount = 0;
  let lumaBeforeSum = 0;
  let peakBefore = 0;

  const warm = cfg.glow_warmth_shift;
  const warmR = 1 + Math.max(0, warm) * 0.45 - Math.max(0, -warm) * 0.35;
  const warmG = 1 + warm * 0.08;
  const warmB = 1 + Math.max(0, -warm) * 0.50 - Math.max(0, warm) * 0.40;

  for (const [r, g, b] of rgbList) {
    const lum = ogRec709Luma(r, g, b);
    lumaBeforeSum += lum;
    if (lum > peakBefore) peakBefore = lum;
    const binIdx = Math.min(15, Math.max(0, Math.floor(ogClamp01(lum) * 15.9999)));
    histBefore[binIdx] += 1;

    const [matte, energy] = computeHighlightMatteAndEnergyClient(
      lum,
      cfg.highlight_threshold,
      cfg.threshold_softness
    );
    mattes.push(matte);
    if (matte > 0.05) triggeredCount += 1;

    const satR = lum + (r - lum) * cfg.bloom_saturation;
    const satG = lum + (g - lum) * cfg.bloom_saturation;
    const satB = lum + (b - lum) * cfg.bloom_saturation;
    hiRgb.push([
      Math.max(0, satR) * energy,
      Math.max(0, satG) * energy,
      Math.max(0, satB) * energy
    ]);
  }

  let bloomPass;
  let halBlur;
  let stkBlur;
  if (w > 1 && h > 1 && hiRgb.length === w * h) {
    const sigmaBloom = Math.max(0.5, cfg.glow_radius_px / 12);
    const octTight = ogSeparableGaussian2d(hiRgb, w, h, Math.max(0.45, sigmaBloom * 0.55));
    const octWide = ogSeparableGaussian2d(hiRgb, w, h, Math.max(0.8, sigmaBloom * 1.45));
    bloomPass = hiRgb.map((_, idx) => [
      (0.58 * octTight[idx][0] + 0.42 * octWide[idx][0]) * warmR * cfg.glow_intensity,
      (0.58 * octTight[idx][1] + 0.42 * octWide[idx][1]) * warmG * cfg.glow_intensity,
      (0.58 * octTight[idx][2] + 0.42 * octWide[idx][2]) * warmB * cfg.glow_intensity
    ]);
    halBlur = ogSeparableGaussian2d(hiRgb, w, h, Math.max(0.5, cfg.halation_spread_px / 10));
    stkBlur = ogDirectionalStreak2d(hiRgb, w, h, cfg.streak_length_px, cfg.streak_angle_deg);
  } else {
    bloomPass = hiRgb.map((p) => [
      p[0] * warmR * cfg.glow_intensity,
      p[1] * warmG * cfg.glow_intensity,
      p[2] * warmB * cfg.glow_intensity
    ]);
    halBlur = hiRgb;
    stkBlur = hiRgb;
  }

  const [hrSpec, hgSpec, hbSpec] = cfg.halation_spectrum_rgb;
  const [srTint, sgTint, sbTint] = cfg.streak_tint_rgb;
  const histAfter = new Array(16).fill(0);
  let lumaAfterSum = 0;
  let peakAfter = 0;
  let haloEnergySum = 0;
  const previewRgb = [];

  for (let i = 0; i < total; i += 1) {
    const [br, bg, bb] = rgbList[i];
    let outR = br;
    let outG = bg;
    let outB = bb;
    let addedEnergy = 0;
    if (cfg.enabled) {
      const [blR, blG, blB] = bloomPass[i];
      const haR = halBlur[i][0] * hrSpec * cfg.halation_strength * 1.35;
      const haG = halBlur[i][1] * hgSpec * cfg.halation_strength * 1.35;
      const haB = halBlur[i][2] * hbSpec * cfg.halation_strength * 1.35;
      const stLum = ogRec709Luma(stkBlur[i][0], stkBlur[i][1], stkBlur[i][2]);
      const stR = stLum * srTint * cfg.streak_intensity * 1.15;
      const stG = stLum * sgTint * cfg.streak_intensity * 1.15;
      const stB = stLum * sbTint * cfg.streak_intensity * 1.15;

      const fxR = blR + haR + stR;
      const fxG = blG + haG + stG;
      const fxB = blB + haB + stB;
      addedEnergy = ogRec709Luma(fxR, fxG, fxB);

      if (cfg.view_mode === "highlight_matte") {
        const m = ogClamp01(mattes[i]);
        outR = m;
        outG = m;
        outB = m;
      } else if (cfg.view_mode === "halation_only") {
        outR = ogClamp01(haR + blR * 0.25 + stR * 0.25);
        outG = ogClamp01(haG + blG * 0.25 + stG * 0.25);
        outB = ogClamp01(haB + blB * 0.25 + stB * 0.25);
      } else {
        outR = ogApplyHdrBlend(br, fxR, cfg.blend_mode);
        outG = ogApplyHdrBlend(bg, fxG, cfg.blend_mode);
        outB = ogApplyHdrBlend(bb, fxB, cfg.blend_mode);
      }
    }
    haloEnergySum += addedEnergy;
    const lumAfter = ogRec709Luma(outR, outG, outB);
    lumaAfterSum += lumAfter;
    if (lumAfter > peakAfter) peakAfter = lumAfter;
    const aIdx = Math.min(15, Math.max(0, Math.floor(ogClamp01(lumAfter) * 15.9999)));
    histAfter[aIdx] += 1;
    if (i < 384) {
      previewRgb.push([Number(outR.toFixed(4)), Number(outG.toFixed(4)), Number(outB.toFixed(4))]);
    }
  }

  return {
    preset_id: cfg.preset_id,
    view_mode: cfg.view_mode,
    blend_mode: cfg.blend_mode,
    sample_count: total,
    width: w,
    height: h,
    triggered_highlight_pct: Number(((100 * triggeredCount) / Math.max(1, total)).toFixed(2)),
    halo_energy_added: Number((haloEnergySum / Math.max(1, total)).toFixed(4)),
    mean_luma_before: Number((lumaBeforeSum / Math.max(1, total)).toFixed(4)),
    mean_luma_after: Number((lumaAfterSum / Math.max(1, total)).toFixed(4)),
    peak_luma_before: Number(peakBefore.toFixed(4)),
    peak_luma_after: Number(peakAfter.toFixed(4)),
    peak_headroom: Number(ogClamp01(1 - peakAfter).toFixed(4)),
    luma_histogram_before: histBefore,
    luma_histogram_after: histAfter,
    highlight_matte_map: mattes.slice(0, 2048).map((m) => Number(m.toFixed(4))),
    preview_rgb_map: previewRgb,
    response_curve: responseCurve
  };
}

function ogFormatLutrgbExpr(threshold, softness, gain) {
  const lo255 = Number((ogClamp01(threshold - softness) * 255).toFixed(2));
  const hi255 = Number(Math.max(lo255 + 1, ogClamp01(threshold + softness) * 255).toFixed(2));
  const span = Number(Math.max(1, hi255 - lo255).toFixed(2));
  const g = Number(Math.max(0, gain).toFixed(4));
  return `clip(val*clip((val-${lo255})/${span},0,1)*${g},0,255)`;
}

export function compileOpticalGlowFiltergraphClient(rawConfig) {
  const cfg = normalizeOpticalGlowConfigClient(rawConfig);
  const effRadius = Number(
    Math.max(cfg.glow_radius_px, cfg.halation_spread_px, cfg.streak_length_px * 0.5).toFixed(2)
  );
  if (!cfg.enabled) {
    return {
      enabled: false,
      preset_id: cfg.preset_id,
      blend_mode: cfg.blend_mode,
      view_mode: cfg.view_mode,
      tap_count: 1,
      effective_radius_px: 0,
      vf_chain: "null",
      filter_complex: "[0:v]null[vout]",
      ffmpeg_command: 'ffmpeg -i input.mp4 -vf "null" output.mp4',
      warnings: ["Optical Glow & Halation bypass active (enabled=false)."]
    };
  }
  if (cfg.view_mode === "highlight_matte") {
    const expr = ogFormatLutrgbExpr(cfg.highlight_threshold, cfg.threshold_softness, 1.0);
    const chain = `format=rgb24,lutrgb=r='${expr}':g='${expr}':b='${expr}',format=yuv420p`;
    return {
      enabled: true,
      preset_id: cfg.preset_id,
      blend_mode: cfg.blend_mode,
      view_mode: cfg.view_mode,
      tap_count: 1,
      effective_radius_px: effRadius,
      vf_chain: chain,
      filter_complex: `[0:v]${chain}[vout]`,
      ffmpeg_command: `ffmpeg -i input.mp4 -filter_complex "[0:v]${chain}[vout]" -map "[vout]" output.mp4`,
      warnings: []
    };
  }

  const warm = cfg.glow_warmth_shift;
  const wr = ogClamp(1 + Math.max(0, warm) * 0.40 - Math.max(0, -warm) * 0.30, 0.2, 2.0);
  const wg = ogClamp(1 + warm * 0.06, 0.2, 2.0);
  const wb = ogClamp(1 + Math.max(0, -warm) * 0.45 - Math.max(0, warm) * 0.35, 0.2, 2.0);
  const rBloomExpr = ogFormatLutrgbExpr(cfg.highlight_threshold, cfg.threshold_softness, cfg.glow_intensity * wr);
  const gBloomExpr = ogFormatLutrgbExpr(cfg.highlight_threshold, cfg.threshold_softness, cfg.glow_intensity * wg);
  const bBloomExpr = ogFormatLutrgbExpr(cfg.highlight_threshold, cfg.threshold_softness, cfg.glow_intensity * wb);
  const sigma1 = Number(Math.max(0.8, cfg.glow_radius_px * 0.32).toFixed(2));
  const sigma2 = Number(Math.max(1.4, cfg.glow_radius_px * 0.85).toFixed(2));

  const [hr, hg, hb] = cfg.halation_spectrum_rgb;
  const rHalExpr = ogFormatLutrgbExpr(cfg.highlight_threshold, cfg.threshold_softness, cfg.halation_strength * hr * 1.4);
  const gHalExpr = ogFormatLutrgbExpr(cfg.highlight_threshold, cfg.threshold_softness, cfg.halation_strength * hg * 1.4);
  const bHalExpr = ogFormatLutrgbExpr(cfg.highlight_threshold, cfg.threshold_softness, cfg.halation_strength * hb * 1.4);
  const halSigma = Number(Math.max(1.0, cfg.halation_spread_px * 0.65).toFixed(2));

  if (cfg.view_mode === "halation_only") {
    const halChain = `format=rgb24,lutrgb=r='${rHalExpr}':g='${gHalExpr}':b='${bHalExpr}',gblur=sigma=${halSigma}:steps=2,format=yuv420p`;
    return {
      enabled: true,
      preset_id: cfg.preset_id,
      blend_mode: cfg.blend_mode,
      view_mode: cfg.view_mode,
      tap_count: 1,
      effective_radius_px: Number(cfg.halation_spread_px.toFixed(2)),
      vf_chain: halChain,
      filter_complex: `[0:v]${halChain}[vout]`,
      ffmpeg_command: `ffmpeg -i input.mp4 -filter_complex "[0:v]${halChain}[vout]" -map "[vout]" output.mp4`,
      warnings: []
    };
  }

  const [sr, sg, sb] = cfg.streak_tint_rgb;
  const rStkExpr = ogFormatLutrgbExpr(cfg.highlight_threshold, cfg.threshold_softness, cfg.streak_intensity * sr * 1.2);
  const gStkExpr = ogFormatLutrgbExpr(cfg.highlight_threshold, cfg.threshold_softness, cfg.streak_intensity * sg * 1.2);
  const bStkExpr = ogFormatLutrgbExpr(cfg.highlight_threshold, cfg.threshold_softness, cfg.streak_intensity * sb * 1.2);
  const stkSizeX = Math.max(2, Math.min(160, Math.round(cfg.streak_length_px * 0.5)));
  const rotRad = Number(((cfg.streak_angle_deg * Math.PI) / 180).toFixed(4));
  const streakFilter = Math.abs(cfg.streak_angle_deg) > 0.5
    ? `lutrgb=r='${rStkExpr}':g='${gStkExpr}':b='${bStkExpr}',rotate=a=${rotRad}:fillcolor=black,avgblur=sizeX=${stkSizeX}:sizeY=1,rotate=a=${-rotRad}:fillcolor=black`
    : `lutrgb=r='${rStkExpr}':g='${gStkExpr}':b='${bStkExpr}',avgblur=sizeX=${stkSizeX}:sizeY=1`;

  const ffBlendMode = {
    screen: "screen",
    add_clamp: "addition",
    soft_light: "softlight",
    filmic_rolloff: "screen"
  }[cfg.blend_mode];

  const parts = [
    "[0:v]format=rgb24,split=5[og_orig][og_base][og_bl1][og_bl2][og_hal_stk]",
    "[og_hal_stk]split=2[og_hal][og_stk]",
    `[og_bl1]lutrgb=r='${rBloomExpr}':g='${gBloomExpr}':b='${bBloomExpr}',gblur=sigma=${sigma1}:steps=2[og_bl1_out]`,
    `[og_bl2]lutrgb=r='${rBloomExpr}':g='${gBloomExpr}':b='${bBloomExpr}',gblur=sigma=${sigma2}:steps=3[og_bl2_out]`,
    "[og_bl1_out][og_bl2_out]blend=all_mode=addition:all_opacity=0.65[og_bloom_mix]",
    `[og_hal]lutrgb=r='${rHalExpr}':g='${gHalExpr}':b='${bHalExpr}',gblur=sigma=${halSigma}:steps=2[og_hal_out]`,
    `[og_stk]${streakFilter}[og_stk_out]`,
    "[og_bloom_mix][og_hal_out]blend=all_mode=addition:all_opacity=1.0[og_fx_bh]",
    "[og_fx_bh][og_stk_out]blend=all_mode=addition:all_opacity=1.0[og_fx_all]"
  ];

  if (cfg.blend_mode === "filmic_rolloff") {
    parts.push(
      "[og_base][og_fx_all]blend=all_mode=screen:all_opacity=0.92,"
      + "lutrgb=r='clip(val-0.08*max(val-190,0),0,255)':"
      + "g='clip(val-0.08*max(val-190,0),0,255)':"
      + "b='clip(val-0.08*max(val-190,0),0,255)'[og_graded]"
    );
  } else {
    parts.push(`[og_base][og_fx_all]blend=all_mode=${ffBlendMode}:all_opacity=1.0[og_graded]`);
  }

  if (cfg.view_mode === "split_compare") {
    let splitW = Math.max(2, Math.min(cfg.width - 2, Math.round(cfg.width * cfg.split_position)));
    splitW -= splitW % 2;
    const rightW = Math.max(2, cfg.width - splitW);
    parts.push(`[og_orig]crop=w=${splitW}:h=${cfg.height}:x=0:y=0[og_left]`);
    parts.push(`[og_graded]crop=w=${rightW}:h=${cfg.height}:x=${splitW}:y=0[og_right]`);
    parts.push("[og_left][og_right]hstack=inputs=2,format=yuv420p[vout]");
  } else {
    parts.push("[og_orig]nullsink;[og_graded]format=yuv420p[vout]");
  }

  const filterComplex = parts.join(";");
  return {
    enabled: true,
    preset_id: cfg.preset_id,
    blend_mode: cfg.blend_mode,
    view_mode: cfg.view_mode,
    tap_count: 4,
    effective_radius_px: effRadius,
    vf_chain: filterComplex,
    filter_complex: filterComplex,
    ffmpeg_command: `ffmpeg -i input.mp4 -filter_complex "${filterComplex}" -map "[vout]" output.mp4`,
    warnings: []
  };
}

export function exportOpticalGlowJsonClient(rawConfig, opts = {}) {
  const cfg = normalizeOpticalGlowConfigClient(rawConfig);
  const compiled = compileOpticalGlowFiltergraphClient(cfg);
  const cleanTitle = String(opts.title || "TAKTCUT_OPTICAL_GLOW")
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "TAKTCUT_OPTICAL_GLOW";
  const payload = {
    schema_version: "taktcut.optical_glow.v1",
    title: cleanTitle,
    preset_id: cfg.preset_id,
    compatible_hosts: [
      "DaVinci Resolve Studio OFX",
      "Boris FX Sapphire S_Glow",
      "FFmpeg Multi-Tap Graph"
    ],
    highlight_extraction: {
      highlight_threshold: cfg.highlight_threshold,
      threshold_softness: cfg.threshold_softness
    },
    halation_35mm: {
      halation_strength: cfg.halation_strength,
      halation_spread_px: cfg.halation_spread_px,
      halation_spectrum_rgb: [...cfg.halation_spectrum_rgb]
    },
    exponential_bloom: {
      glow_intensity: cfg.glow_intensity,
      glow_radius_px: cfg.glow_radius_px,
      glow_warmth_shift: cfg.glow_warmth_shift,
      bloom_saturation: cfg.bloom_saturation,
      octaves: cfg.octaves
    },
    anamorphic_streak: {
      streak_intensity: cfg.streak_intensity,
      streak_length_px: cfg.streak_length_px,
      streak_angle_deg: cfg.streak_angle_deg,
      streak_tint_rgb: [...cfg.streak_tint_rgb]
    },
    composite: {
      enabled: cfg.enabled,
      blend_mode: cfg.blend_mode,
      view_mode: cfg.view_mode,
      split_position: cfg.split_position
    },
    ffmpeg_filter_complex: compiled.filter_complex
  };
  const filename = `${cleanTitle.toLowerCase()}_${cfg.preset_id}_optical_glow.json`;
  return {
    schema_version: "taktcut.optical_glow.v1",
    title: cleanTitle,
    preset_id: cfg.preset_id,
    compatible_hosts: payload.compatible_hosts,
    json_text: JSON.stringify(payload, null, 2),
    filename: String(opts.filename || filename),
    saved_path: null
  };
}

export function applyOpticalGlowToDocumentClient(doc, rawConfig, opts = {}) {
  const nextDoc = cloneTimelineDoc(doc);
  const cfg = normalizeOpticalGlowConfigClient(rawConfig);
  const analysis = analyzeOpticalGlowSamplesClient(cfg);
  const compiled = compileOpticalGlowFiltergraphClient(cfg);
  const trackIndex = Number(opts.track_index || 1);
  const trk = (nextDoc.tracks || []).find((t) => t.kind === "video" && t.index === trackIndex)
    || (nextDoc.tracks || []).find((t) => t.kind === "video");
  if (!trk || !Array.isArray(trk.clips) || trk.clips.length === 0) {
    throw new Error(`Video track V${trackIndex} has no clips`);
  }
  const safeIdx = Math.max(0, Math.min(trk.clips.length - 1, Number(opts.clip_index || 0)));
  trk.clips[safeIdx] = {
    ...trk.clips[safeIdx],
    optical_glow: {
      enabled: cfg.enabled,
      preset_id: cfg.preset_id,
      highlight_threshold: cfg.highlight_threshold,
      threshold_softness: cfg.threshold_softness,
      halation_strength: cfg.halation_strength,
      halation_spread_px: cfg.halation_spread_px,
      halation_spectrum_rgb: [...cfg.halation_spectrum_rgb],
      glow_intensity: cfg.glow_intensity,
      glow_radius_px: cfg.glow_radius_px,
      glow_warmth_shift: cfg.glow_warmth_shift,
      bloom_saturation: cfg.bloom_saturation,
      octaves: cfg.octaves,
      streak_intensity: cfg.streak_intensity,
      streak_length_px: cfg.streak_length_px,
      streak_angle_deg: cfg.streak_angle_deg,
      streak_tint_rgb: [...cfg.streak_tint_rgb],
      blend_mode: cfg.blend_mode,
      view_mode: cfg.view_mode,
      split_position: cfg.split_position,
      triggered_highlight_pct: analysis.triggered_highlight_pct,
      halo_energy_added: analysis.halo_energy_added,
      ffmpeg_vf: compiled.vf_chain.slice(0, 16384)
    }
  };
  return nextDoc;
}

// =============================================================================
// DAVINCI RESOLVE POWER WINDOWS & 4-POINT PLANAR TRACKER STUDIO (CYCLE #109)
// =============================================================================

export const ALLOWED_POWER_WINDOW_PRESET_IDS = [
  "portrait_spotlight_oval",
  "privacy_plate_pixelate",
  "cinema_horizon_grad",
  "billboard_corner_pin",
  "custom"
];

export const ALLOWED_POWER_WINDOW_SHAPE_TYPES = [
  "ellipse",
  "rounded_box",
  "linear_gradient",
  "planar_quad"
];

export const ALLOWED_POWER_WINDOW_VIEW_MODES = [
  "final_composite",
  "matte_bw",
  "red_overlay",
  "wireframe_handles"
];

export const DEFAULT_PW_QUAD_CORNERS_CLIENT = [
  [0.28, 0.22],
  [0.72, 0.18],
  [0.76, 0.68],
  [0.24, 0.72]
];

function pwStudioClamp(val, lo, hi, fallback = lo) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

function pwStudioClamp01(val) {
  return pwStudioClamp(val, 0, 1, 0);
}

function pwStudioSmoothstep(edge0, edge1, x) {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = pwStudioClamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function pwStudioLerp(a, b, t) {
  return a + (b - a) * t;
}

function pwStudioRec709Luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function pwStudioNormalizeQuad(raw, fallback = DEFAULT_PW_QUAD_CORNERS_CLIENT) {
  if (!Array.isArray(raw) || raw.length !== 4) {
    return fallback.map((pt) => [pt[0], pt[1]]);
  }
  return raw.map((pt, idx) => {
    const fb = fallback[idx] || [0.5, 0.5];
    if (!Array.isArray(pt) || pt.length < 2) return [fb[0], fb[1]];
    return [pwStudioClamp(pt[0], 0, 1, fb[0]), pwStudioClamp(pt[1], 0, 1, fb[1])];
  });
}

export const POWER_WINDOW_PRESETS_CLIENT = [
  {
    preset_id: "portrait_spotlight_oval",
    label: "Portrait Spotlight Oval",
    category: "Beauty & Key Light",
    description:
      "Soft elliptical subject key lift (+0.55 EV) with outside background falloff (-0.65 EV, 10px lens blur, 35% radial vignette).",
    default_config: {
      enabled: true,
      preset_id: "portrait_spotlight_oval",
      shape_type: "ellipse",
      cx: 0.48,
      cy: 0.43,
      rx: 0.20,
      ry: 0.30,
      rotation_deg: -4.0,
      corner_radius: 0.22,
      softness_px: 38.0,
      invert_matte: false,
      quad_corners: [[0.28, 0.20], [0.68, 0.20], [0.68, 0.68], [0.28, 0.68]],
      inside_exposure_ev: 0.55,
      outside_exposure_ev: -0.65,
      inside_blur_px: 0.0,
      outside_blur_px: 10.0,
      inside_pixelate_size: 1,
      vignette_opacity: 0.35,
      view_mode: "final_composite",
      playhead_norm: 0.0,
      track_drift_x: 0.05,
      track_drift_y: -0.02,
      track_jitter: 0.005,
      track_keyframes: [],
      width: 1920,
      height: 1080
    }
  },
  {
    preset_id: "privacy_plate_pixelate",
    label: "Privacy Plate Pixelate",
    category: "Broadcast Compliance",
    description:
      "Tracked rounded-box anonymizer applying an 18px mosaic + 6px pre-blur strictly inside the mask for license plates or faces.",
    default_config: {
      enabled: true,
      preset_id: "privacy_plate_pixelate",
      shape_type: "rounded_box",
      cx: 0.34,
      cy: 0.66,
      rx: 0.14,
      ry: 0.09,
      rotation_deg: 2.0,
      corner_radius: 0.28,
      softness_px: 12.0,
      invert_matte: false,
      quad_corners: [[0.20, 0.56], [0.48, 0.56], [0.48, 0.76], [0.20, 0.76]],
      inside_exposure_ev: -0.10,
      outside_exposure_ev: 0.0,
      inside_blur_px: 6.0,
      outside_blur_px: 0.0,
      inside_pixelate_size: 18,
      vignette_opacity: 0.0,
      view_mode: "final_composite",
      playhead_norm: 0.0,
      track_drift_x: 0.16,
      track_drift_y: 0.03,
      track_jitter: 0.006,
      track_keyframes: [],
      width: 1920,
      height: 1080
    }
  },
  {
    preset_id: "cinema_horizon_grad",
    label: "Cinema Horizon Grad",
    category: "Sky & Landscape ND",
    description:
      "Wide feathered linear ND gradient (-0.90 EV upper sky pull-down) with subtle cinema vignette.",
    default_config: {
      enabled: true,
      preset_id: "cinema_horizon_grad",
      shape_type: "linear_gradient",
      cx: 0.50,
      cy: 0.36,
      rx: 0.45,
      ry: 0.26,
      rotation_deg: -3.0,
      corner_radius: 0.10,
      softness_px: 72.0,
      invert_matte: false,
      quad_corners: [[0.10, 0.08], [0.90, 0.08], [0.90, 0.42], [0.10, 0.42]],
      inside_exposure_ev: -0.90,
      outside_exposure_ev: 0.10,
      inside_blur_px: 0.0,
      outside_blur_px: 0.0,
      inside_pixelate_size: 1,
      vignette_opacity: 0.22,
      view_mode: "final_composite",
      playhead_norm: 0.0,
      track_drift_x: 0.02,
      track_drift_y: 0.01,
      track_jitter: 0.002,
      track_keyframes: [],
      width: 1920,
      height: 1080
    }
  },
  {
    preset_id: "billboard_corner_pin",
    label: "Billboard 4-Pt Planar Pin",
    category: "Planar Tracker & Screen Insert",
    description:
      "4-point DLT homography planar screen-pin mask isolating an angled billboard with inside lift and outside falloff.",
    default_config: {
      enabled: true,
      preset_id: "billboard_corner_pin",
      shape_type: "planar_quad",
      cx: 0.68,
      cy: 0.38,
      rx: 0.18,
      ry: 0.18,
      rotation_deg: 0.0,
      corner_radius: 0.05,
      softness_px: 14.0,
      invert_matte: false,
      quad_corners: [[0.53, 0.16], [0.88, 0.23], [0.84, 0.56], [0.50, 0.48]],
      inside_exposure_ev: 0.45,
      outside_exposure_ev: -0.45,
      inside_blur_px: 0.0,
      outside_blur_px: 5.0,
      inside_pixelate_size: 1,
      vignette_opacity: 0.18,
      view_mode: "final_composite",
      playhead_norm: 0.0,
      track_drift_x: -0.09,
      track_drift_y: 0.04,
      track_jitter: 0.007,
      track_keyframes: [],
      width: 1920,
      height: 1080
    }
  },
  {
    preset_id: "custom",
    label: "Custom Power Window",
    category: "User Defined",
    description: "Clean custom elliptical Power Window ready for manual handle sculpting.",
    default_config: {
      enabled: true,
      preset_id: "custom",
      shape_type: "ellipse",
      cx: 0.50,
      cy: 0.50,
      rx: 0.24,
      ry: 0.24,
      rotation_deg: 0.0,
      corner_radius: 0.20,
      softness_px: 28.0,
      invert_matte: false,
      quad_corners: [[0.28, 0.25], [0.72, 0.25], [0.72, 0.75], [0.28, 0.75]],
      inside_exposure_ev: 0.25,
      outside_exposure_ev: -0.25,
      inside_blur_px: 0.0,
      outside_blur_px: 4.0,
      inside_pixelate_size: 1,
      vignette_opacity: 0.15,
      view_mode: "final_composite",
      playhead_norm: 0.0,
      track_drift_x: 0.06,
      track_drift_y: 0.0,
      track_jitter: 0.004,
      track_keyframes: [],
      width: 1920,
      height: 1080
    }
  }
];

export function createDefaultPowerWindowConfigClient(presetId = "portrait_spotlight_oval") {
  const found =
    POWER_WINDOW_PRESETS_CLIENT.find((p) => p.preset_id === presetId) ||
    POWER_WINDOW_PRESETS_CLIENT[0];
  return {
    ...found.default_config,
    quad_corners: pwStudioNormalizeQuad(found.default_config.quad_corners),
    track_keyframes: []
  };
}

export function normalizePowerWindowConfigClient(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const presetId = ALLOWED_POWER_WINDOW_PRESET_IDS.includes(src.preset_id)
    ? src.preset_id
    : "portrait_spotlight_oval";
  const base = createDefaultPowerWindowConfigClient(presetId);
  const shapeType = ALLOWED_POWER_WINDOW_SHAPE_TYPES.includes(src.shape_type)
    ? src.shape_type
    : base.shape_type;
  const viewMode = ALLOWED_POWER_WINDOW_VIEW_MODES.includes(src.view_mode)
    ? src.view_mode
    : base.view_mode;

  const widthRaw = Math.round(pwStudioClamp(src.width ?? base.width, 64, 7680, 1920));
  const heightRaw = Math.round(pwStudioClamp(src.height ?? base.height, 64, 4320, 1080));
  const width = widthRaw - (widthRaw % 2);
  const height = heightRaw - (heightRaw % 2);

  const rawKfs = Array.isArray(src.track_keyframes) ? src.track_keyframes : base.track_keyframes;
  const kfs = rawKfs
    .filter((k) => k && typeof k === "object")
    .map((k) => ({
      t_norm: Number(pwStudioClamp(k.t_norm, 0, 1, 0).toFixed(4)),
      cx: Number(pwStudioClamp(k.cx, 0, 1, base.cx).toFixed(5)),
      cy: Number(pwStudioClamp(k.cy, 0, 1, base.cy).toFixed(5)),
      rx: Number(pwStudioClamp(k.rx, 0.02, 0.95, base.rx).toFixed(5)),
      ry: Number(pwStudioClamp(k.ry, 0.02, 0.95, base.ry).toFixed(5)),
      rotation_deg: Number(pwStudioClamp(k.rotation_deg, -180, 180, base.rotation_deg).toFixed(3)),
      softness_px: Number(pwStudioClamp(k.softness_px, 0, 180, base.softness_px).toFixed(2)),
      quad_corners: pwStudioNormalizeQuad(k.quad_corners, base.quad_corners)
    }))
    .sort((a, b) => a.t_norm - b.t_norm);

  return {
    enabled: src.enabled !== undefined ? Boolean(src.enabled) : base.enabled,
    preset_id: presetId,
    shape_type: shapeType,
    cx: pwStudioClamp(src.cx ?? base.cx, 0, 1, base.cx),
    cy: pwStudioClamp(src.cy ?? base.cy, 0, 1, base.cy),
    rx: pwStudioClamp(src.rx ?? base.rx, 0.02, 0.95, base.rx),
    ry: pwStudioClamp(src.ry ?? base.ry, 0.02, 0.95, base.ry),
    rotation_deg: pwStudioClamp(src.rotation_deg ?? base.rotation_deg, -180, 180, base.rotation_deg),
    corner_radius: pwStudioClamp(src.corner_radius ?? base.corner_radius, 0, 1, base.corner_radius),
    softness_px: pwStudioClamp(src.softness_px ?? base.softness_px, 0, 180, base.softness_px),
    invert_matte: src.invert_matte !== undefined ? Boolean(src.invert_matte) : base.invert_matte,
    quad_corners: pwStudioNormalizeQuad(src.quad_corners, base.quad_corners),
    inside_exposure_ev: pwStudioClamp(
      src.inside_exposure_ev ?? base.inside_exposure_ev,
      -3,
      3,
      base.inside_exposure_ev
    ),
    outside_exposure_ev: pwStudioClamp(
      src.outside_exposure_ev ?? base.outside_exposure_ev,
      -3,
      3,
      base.outside_exposure_ev
    ),
    inside_blur_px: pwStudioClamp(src.inside_blur_px ?? base.inside_blur_px, 0, 48, base.inside_blur_px),
    outside_blur_px: pwStudioClamp(src.outside_blur_px ?? base.outside_blur_px, 0, 48, base.outside_blur_px),
    inside_pixelate_size: Math.round(
      pwStudioClamp(src.inside_pixelate_size ?? base.inside_pixelate_size, 1, 64, base.inside_pixelate_size)
    ),
    vignette_opacity: pwStudioClamp(
      src.vignette_opacity ?? base.vignette_opacity,
      0,
      1,
      base.vignette_opacity
    ),
    view_mode: viewMode,
    playhead_norm: pwStudioClamp(src.playhead_norm ?? base.playhead_norm, 0, 1, 0),
    track_drift_x: pwStudioClamp(src.track_drift_x ?? base.track_drift_x, -0.5, 0.5, base.track_drift_x),
    track_drift_y: pwStudioClamp(src.track_drift_y ?? base.track_drift_y, -0.5, 0.5, base.track_drift_y),
    track_jitter: pwStudioClamp(src.track_jitter ?? base.track_jitter, 0, 0.1, base.track_jitter),
    track_keyframes: kfs,
    width,
    height
  };
}

function pwSolveLinear8x8(matrix, rhs) {
  const n = 8;
  const a = matrix.map((row, idx) => [...row, rhs[idx]]);
  for (let col = 0; col < n; col += 1) {
    let pivotRow = col;
    let pivotVal = Math.abs(a[col][col]);
    for (let row = col + 1; row < n; row += 1) {
      const cand = Math.abs(a[row][col]);
      if (cand > pivotVal) {
        pivotVal = cand;
        pivotRow = row;
      }
    }
    if (pivotVal < 1e-11) return null;
    if (pivotRow !== col) {
      const tmp = a[col];
      a[col] = a[pivotRow];
      a[pivotRow] = tmp;
    }
    const diag = a[col][col];
    for (let j = col; j <= n; j += 1) a[col][j] /= diag;
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = a[row][col];
      if (Math.abs(factor) < 1e-14) continue;
      for (let j = col; j <= n; j += 1) a[row][j] -= factor * a[col][j];
    }
  }
  return a.map((row) => row[n]);
}

export function computePlanarHomographyDltClient(srcQuad, dstQuad) {
  const rows = [];
  const rhs = [];
  for (let i = 0; i < 4; i += 1) {
    const [x, y] = srcQuad[i];
    const [u, v] = dstQuad[i];
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    rhs.push(u);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    rhs.push(v);
  }
  const sol = pwSolveLinear8x8(rows, rhs);
  if (!sol) {
    return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  }
  return [
    [Number(sol[0].toFixed(6)), Number(sol[1].toFixed(6)), Number(sol[2].toFixed(6))],
    [Number(sol[3].toFixed(6)), Number(sol[4].toFixed(6)), Number(sol[5].toFixed(6))],
    [Number(sol[6].toFixed(6)), Number(sol[7].toFixed(6)), 1]
  ];
}

export function interpolatePowerWindowAtTimeClient(rawConfig, tNorm = null) {
  const cfg = normalizePowerWindowConfigClient(rawConfig);
  const tVal = pwStudioClamp01(tNorm === null || tNorm === undefined ? cfg.playhead_norm : tNorm);
  const kfs = [...cfg.track_keyframes].sort((a, b) => a.t_norm - b.t_norm);

  let cx = cfg.cx;
  let cy = cfg.cy;
  let rx = cfg.rx;
  let ry = cfg.ry;
  let rot = cfg.rotation_deg;
  let soft = cfg.softness_px;
  let quad = cfg.quad_corners;

  if (kfs.length === 1 || (kfs.length > 1 && tVal <= kfs[0].t_norm)) {
    const k0 = kfs[0];
    cx = k0.cx;
    cy = k0.cy;
    rx = k0.rx;
    ry = k0.ry;
    rot = k0.rotation_deg;
    soft = k0.softness_px;
    quad = k0.quad_corners;
  } else if (kfs.length > 1 && tVal >= kfs[kfs.length - 1].t_norm) {
    const kn = kfs[kfs.length - 1];
    cx = kn.cx;
    cy = kn.cy;
    rx = kn.rx;
    ry = kn.ry;
    rot = kn.rotation_deg;
    soft = kn.softness_px;
    quad = kn.quad_corners;
  } else if (kfs.length > 1) {
    let lo = kfs[0];
    let hi = kfs[kfs.length - 1];
    for (let i = 0; i < kfs.length - 1; i += 1) {
      if (kfs[i].t_norm <= tVal && tVal <= kfs[i + 1].t_norm) {
        lo = kfs[i];
        hi = kfs[i + 1];
        break;
      }
    }
    const span = hi.t_norm - lo.t_norm;
    const alpha = span <= 1e-9 ? 0 : pwStudioClamp01((tVal - lo.t_norm) / span);
    cx = pwStudioLerp(lo.cx, hi.cx, alpha);
    cy = pwStudioLerp(lo.cy, hi.cy, alpha);
    rx = pwStudioLerp(lo.rx, hi.rx, alpha);
    ry = pwStudioLerp(lo.ry, hi.ry, alpha);
    rot = pwStudioLerp(lo.rotation_deg, hi.rotation_deg, alpha);
    soft = pwStudioLerp(lo.softness_px, hi.softness_px, alpha);
    quad = [0, 1, 2, 3].map((idx) => [
      Number(pwStudioClamp01(pwStudioLerp(lo.quad_corners[idx][0], hi.quad_corners[idx][0], alpha)).toFixed(5)),
      Number(pwStudioClamp01(pwStudioLerp(lo.quad_corners[idx][1], hi.quad_corners[idx][1], alpha)).toFixed(5))
    ]);
  }

  const hMat = computePlanarHomographyDltClient([[0, 0], [1, 0], [1, 1], [0, 1]], quad);
  return {
    t_norm: Number(tVal.toFixed(4)),
    shape_type: cfg.shape_type,
    cx: Number(cx.toFixed(5)),
    cy: Number(cy.toFixed(5)),
    rx: Number(rx.toFixed(5)),
    ry: Number(ry.toFixed(5)),
    rotation_deg: Number(rot.toFixed(3)),
    corner_radius: cfg.corner_radius,
    softness_px: Number(soft.toFixed(2)),
    invert_matte: cfg.invert_matte,
    quad_corners: quad,
    homography_3x3: hMat
  };
}

export function simulatePowerWindowTrackClient(rawConfig, opts = {}) {
  const cfg = normalizePowerWindowConfigClient(rawConfig);
  const count = Math.max(2, Math.min(33, Math.round(Number(opts.num_keyframes ?? 9))));
  const dx = opts.drift_x !== undefined ? pwStudioClamp(opts.drift_x, -0.5, 0.5, cfg.track_drift_x) : cfg.track_drift_x;
  const dy = opts.drift_y !== undefined ? pwStudioClamp(opts.drift_y, -0.5, 0.5, cfg.track_drift_y) : cfg.track_drift_y;
  const jit = opts.jitter !== undefined ? pwStudioClamp(opts.jitter, 0, 0.1, cfg.track_jitter) : cfg.track_jitter;
  const rotDrift = Number(opts.rotation_drift_deg ?? 4.0);

  const keyframes = [];
  const residuals = [];
  const confs = [];

  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const easeT = t * t * (3 - 2 * t);
    const jx = i > 0 ? jit * Math.sin(t * Math.PI * 5 + 0.4) : 0;
    const jy = i > 0 ? jit * Math.cos(t * Math.PI * 4 + 1.1) : 0;

    const offX = dx * easeT + jx;
    const offY = dy * easeT + jy;
    const curCx = pwStudioClamp01(cfg.cx + offX);
    const curCy = pwStudioClamp01(cfg.cy + offY);
    const scaleMod = 1 + 0.06 * Math.sin(t * Math.PI);
    const curRx = pwStudioClamp(cfg.rx * scaleMod, 0.02, 0.95, cfg.rx);
    const curRy = pwStudioClamp(cfg.ry * scaleMod, 0.02, 0.95, cfg.ry);
    const curRot = pwStudioClamp(cfg.rotation_deg + rotDrift * easeT, -180, 180, cfg.rotation_deg);

    const quad = cfg.quad_corners.map(([qx, qy], qIdx) => {
      const perspSkew = 0.014 * easeT * (qIdx === 1 || qIdx === 2 ? 1 : -0.5);
      const nx = pwStudioClamp01(qx + offX + perspSkew);
      const ny = pwStudioClamp01(qy + offY + 0.008 * easeT * (qIdx === 2 || qIdx === 3 ? 1 : -0.4));
      return [Number(nx.toFixed(5)), Number(ny.toFixed(5))];
    });

    residuals.push(Math.hypot(jx * cfg.width, jy * cfg.height));
    confs.push(pwStudioClamp(0.99 - jit * 2.2 - 0.04 * Math.abs(t - 0.5), 0.72, 0.995, 0.96));

    keyframes.push({
      t_norm: Number(t.toFixed(4)),
      cx: Number(curCx.toFixed(5)),
      cy: Number(curCy.toFixed(5)),
      rx: Number(curRx.toFixed(5)),
      ry: Number(curRy.toFixed(5)),
      rotation_deg: Number(curRot.toFixed(3)),
      softness_px: Number(cfg.softness_px.toFixed(2)),
      quad_corners: quad
    });
  }

  const totalDispPx = Math.hypot(dx * cfg.width, dy * cfg.height);
  const meanConf = confs.reduce((a, b) => a + b, 0) / confs.length;
  const maxRes = residuals.length ? Math.max(...residuals) : 0;
  const geomNow = interpolatePowerWindowAtTimeClient({ ...cfg, track_keyframes: keyframes }, cfg.playhead_norm);

  return {
    preset_id: cfg.preset_id,
    shape_type: cfg.shape_type,
    frame_count: count,
    total_displacement_px: Number(totalDispPx.toFixed(2)),
    mean_confidence: Number(meanConf.toFixed(4)),
    max_residual_px: Number(maxRes.toFixed(3)),
    homography_3x3: geomNow.homography_3x3,
    keyframes
  };
}

function pwPointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pwDistPointToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c1 = wx * vx + wy * vy;
  if (c1 <= 0) return Math.hypot(px - ax, py - ay);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(px - bx, py - by);
  const t = c1 / c2;
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

export function evaluatePowerWindowMaskAtUvClient(geom, u, v, width = 1920, height = 1080) {
  const refDim = Math.max(64, Math.min(width, height));
  const softNorm = Math.max(0.002, Number(geom.softness_px || 0) / refDim);
  const rad = -(Number(geom.rotation_deg || 0) * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);
  const du = u - geom.cx;
  const dv = v - geom.cy;
  const lx = du * cosR - dv * sinR;
  const ly = du * sinR + dv * cosR;

  let matte = 0;
  if (geom.shape_type === "ellipse") {
    const rx = Math.max(0.015, geom.rx);
    const ry = Math.max(0.015, geom.ry);
    const dist = Math.hypot(lx / rx, ly / ry);
    const featherRel = softNorm / Math.max(0.02, Math.min(rx, ry));
    matte = 1 - pwStudioSmoothstep(1 - featherRel * 0.5, 1 + featherRel * 0.5, dist);
  } else if (geom.shape_type === "rounded_box") {
    const rx = Math.max(0.015, geom.rx);
    const ry = Math.max(0.015, geom.ry);
    const cr = pwStudioClamp(geom.corner_radius, 0, 0.95, 0.22) * Math.min(rx, ry);
    const qx = Math.abs(lx) - (rx - cr);
    const qy = Math.abs(ly) - (ry - cr);
    const sdf = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - cr;
    matte = 1 - pwStudioSmoothstep(-softNorm * 0.5, softNorm * 0.5, sdf);
  } else if (geom.shape_type === "linear_gradient") {
    const halfSpan = Math.max(0.02, softNorm * 1.45);
    matte = 1 - pwStudioSmoothstep(-halfSpan, halfSpan, ly);
  } else {
    const quad = geom.quad_corners || DEFAULT_PW_QUAD_CORNERS_CLIENT;
    const inside = pwPointInPolygon(u, v, quad);
    let minEdge = Infinity;
    for (let i = 0; i < 4; i += 1) {
      const a = quad[i];
      const b = quad[(i + 1) % 4];
      const d = pwDistPointToSegment(u, v, a[0], a[1], b[0], b[1]);
      if (d < minEdge) minEdge = d;
    }
    const sdf = inside ? -minEdge : minEdge;
    matte = 1 - pwStudioSmoothstep(-softNorm * 0.5, softNorm * 0.5, sdf);
  }

  matte = pwStudioClamp01(matte);
  if (geom.invert_matte) matte = 1 - matte;
  return matte;
}

function buildPwSyntheticSceneClient(w = 24, h = 16) {
  const out = [];
  for (let y = 0; y < h; y += 1) {
    const ny = y / Math.max(1, h - 1);
    for (let x = 0; x < w; x += 1) {
      const nx = x / Math.max(1, w - 1);
      let r = 0.14 + 0.06 * nx;
      let g = 0.16 + 0.06 * (1 - ny);
      let b = 0.20 + 0.05 * ny;
      if (ny < 0.45) {
        r = 0.24 + 0.16 * (1 - ny);
        g = 0.34 + 0.18 * (1 - ny);
        b = 0.58 + 0.22 * (1 - ny);
      }
      if (nx >= 0.52 && nx <= 0.88 && ny >= 0.18 && ny <= 0.54) {
        r = 0.78;
        g = 0.72;
        b = 0.62;
        if (nx >= 0.58 && nx <= 0.82 && ny >= 0.26 && ny <= 0.46) {
          r = 0.22;
          g = 0.56;
          b = 0.88;
        }
      }
      const dHead = Math.hypot((nx - 0.48) * 1.5, ny - 0.40);
      if (dHead < 0.18) {
        r = 0.68 - 0.18 * dHead;
        g = 0.48 - 0.12 * dHead;
        b = 0.38 - 0.10 * dHead;
      }
      if (nx >= 0.24 && nx <= 0.44 && ny >= 0.60 && ny <= 0.74) {
        r = 0.86;
        g = 0.88;
        b = 0.90;
        if (Math.abs(nx - 0.34) < 0.05 && Math.abs(ny - 0.67) < 0.03) {
          r = 0.18;
          g = 0.20;
          b = 0.28;
        }
      }
      out.push([pwStudioClamp01(r), pwStudioClamp01(g), pwStudioClamp01(b)]);
    }
  }
  return out;
}

export function evaluatePowerWindowSamplesClient(rawConfig, opts = {}) {
  const cfg = normalizePowerWindowConfigClient(rawConfig);
  const geom = interpolatePowerWindowAtTimeClient(cfg, opts.t_norm ?? null);
  const rgbList = buildPwSyntheticSceneClient(24, 16);
  const w = 24;
  const h = 16;
  const total = rgbList.length;

  const inGain = Math.pow(2, cfg.inside_exposure_ev * 0.65);
  const outGain = Math.pow(2, cfg.outside_exposure_ev * 0.65);

  const mattes = [];
  const histBefore = new Array(16).fill(0);
  const histAfter = new Array(16).fill(0);
  let lumaBeforeSum = 0;
  let lumaAfterSum = 0;
  let inLumaSum = 0;
  let inWeightSum = 0;
  let outLumaSum = 0;
  let outWeightSum = 0;
  let coveredCount = 0;
  const previewRgb = [];

  for (let idx = 0; idx < total; idx += 1) {
    const [br, bg, bb] = rgbList[idx];
    const px = idx % w;
    const py = Math.floor(idx / w);
    const u = px / Math.max(1, w - 1);
    const v = py / Math.max(1, h - 1);

    const lumBefore = pwStudioRec709Luma(br, bg, bb);
    lumaBeforeSum += lumBefore;
    histBefore[Math.min(15, Math.max(0, Math.floor(pwStudioClamp01(lumBefore) * 15.9999)))] += 1;

    const m = evaluatePowerWindowMaskAtUvClient(geom, u, v, cfg.width, cfg.height);
    mattes.push(Number(m.toFixed(4)));
    if (m >= 0.5) coveredCount += 1;

    let outR = br;
    let outG = bg;
    let outB = bb;
    if (cfg.enabled) {
      const inR = pwStudioClamp01(br * inGain);
      const inG = pwStudioClamp01(bg * inGain);
      const inB = pwStudioClamp01(bb * inGain);
      const radDist = Math.hypot((u - 0.5) * 1.4, (v - 0.5) * 1.4);
      const vigFactor = 1 - cfg.vignette_opacity * pwStudioSmoothstep(0.35, 1.05, radDist);
      const outRBase = pwStudioClamp01(br * outGain * vigFactor);
      const outGBase = pwStudioClamp01(bg * outGain * vigFactor);
      const outBBase = pwStudioClamp01(bb * outGain * vigFactor);

      const compR = pwStudioLerp(outRBase, inR, m);
      const compG = pwStudioLerp(outGBase, inG, m);
      const compB = pwStudioLerp(outBBase, inB, m);

      if (cfg.view_mode === "matte_bw") {
        outR = m;
        outG = m;
        outB = m;
      } else if (cfg.view_mode === "red_overlay") {
        const inv = 1 - m;
        outR = pwStudioClamp01(compR * (1 - 0.55 * inv) + 0.92 * 0.55 * inv);
        outG = pwStudioClamp01(compG * (1 - 0.55 * inv) + 0.14 * 0.55 * inv);
        outB = pwStudioClamp01(compB * (1 - 0.55 * inv) + 0.18 * 0.55 * inv);
      } else {
        outR = compR;
        outG = compG;
        outB = compB;
      }
    }

    const lumAfter = pwStudioRec709Luma(outR, outG, outB);
    lumaAfterSum += lumAfter;
    histAfter[Math.min(15, Math.max(0, Math.floor(pwStudioClamp01(lumAfter) * 15.9999)))] += 1;
    inLumaSum += lumAfter * m;
    inWeightSum += m;
    outLumaSum += lumAfter * (1 - m);
    outWeightSum += 1 - m;
    previewRgb.push([Number(outR.toFixed(4)), Number(outG.toFixed(4)), Number(outB.toFixed(4))]);
  }

  return {
    preset_id: cfg.preset_id,
    shape_type: cfg.shape_type,
    view_mode: cfg.view_mode,
    t_norm: geom.t_norm,
    sample_count: total,
    width: w,
    height: h,
    inside_coverage_pct: Number(((100 * coveredCount) / total).toFixed(2)),
    mean_luma_inside: Number((inWeightSum > 1e-6 ? inLumaSum / inWeightSum : 0).toFixed(4)),
    mean_luma_outside: Number((outWeightSum > 1e-6 ? outLumaSum / outWeightSum : 0).toFixed(4)),
    mean_luma_before: Number((lumaBeforeSum / total).toFixed(4)),
    mean_luma_after: Number((lumaAfterSum / total).toFixed(4)),
    luma_histogram_before: histBefore,
    luma_histogram_after: histAfter,
    matte_map: mattes,
    preview_rgb_map: previewRgb,
    interpolated_geometry: geom
  };
}

function compilePwGeqExprClient(geom, width, height) {
  const rad = -(geom.rotation_deg * Math.PI) / 180;
  const cosR = Number(Math.cos(rad).toFixed(5));
  const sinR = Number(Math.sin(rad).toFixed(5));
  const softNorm = Number(Math.max(0.004, geom.softness_px / Math.max(64, Math.min(width, height))).toFixed(5));
  const du = `((X/W)-${Number(geom.cx.toFixed(4))})`;
  const dv = `((Y/H)-${Number(geom.cy.toFixed(4))})`;
  const lx = `(${du}*${cosR}-${dv}*${sinR})`;
  const ly = `(${du}*${sinR}+${dv}*${cosR})`;

  let core = "";
  if (geom.shape_type === "ellipse") {
    const rx = Number(Math.max(0.015, geom.rx).toFixed(4));
    const ry = Number(Math.max(0.015, geom.ry).toFixed(4));
    const fRel = Number(Math.max(0.01, softNorm / Math.max(0.02, Math.min(rx, ry))).toFixed(4));
    core = `clip(1-((hypot(${lx}/${rx},${ly}/${ry})-(1-${fRel}*0.5))/${fRel}),0,1)`;
  } else if (geom.shape_type === "rounded_box") {
    const rx = Number(Math.max(0.015, geom.rx).toFixed(4));
    const ry = Number(Math.max(0.015, geom.ry).toFixed(4));
    const cr = Number((pwStudioClamp(geom.corner_radius, 0, 0.95, 0.22) * Math.min(rx, ry)).toFixed(4));
    const qx = `(abs(${lx})-${Number(Math.max(0.001, rx - cr).toFixed(4))})`;
    const qy = `(abs(${ly})-${Number(Math.max(0.001, ry - cr).toFixed(4))})`;
    const sdf = `(hypot(max(${qx},0),max(${qy},0))+min(max(${qx},${qy}),0)-${cr})`;
    core = `clip(0.5-(${sdf}/${softNorm}),0,1)`;
  } else if (geom.shape_type === "linear_gradient") {
    const span = Number(Math.max(0.02, softNorm * 2.2).toFixed(4));
    core = `clip(0.5-(${ly}/${span}),0,1)`;
  } else {
    const xs = geom.quad_corners.map((p) => p[0]);
    const ys = geom.quad_corners.map((p) => p[1]);
    const qcx = Number((xs.reduce((a, b) => a + b, 0) / 4).toFixed(4));
    const qcy = Number((ys.reduce((a, b) => a + b, 0) / 4).toFixed(4));
    const qrx = Number(Math.max(0.02, (Math.max(...xs) - Math.min(...xs)) * 0.5).toFixed(4));
    const qry = Number(Math.max(0.02, (Math.max(...ys) - Math.min(...ys)) * 0.5).toFixed(4));
    const qDist = `max(abs((X/W)-${qcx})/${qrx},abs((Y/H)-${qcy})/${qry})`;
    core = `clip(1-((${qDist}-(1-${softNorm}))/${Math.max(0.02, softNorm)}),0,1)`;
  }
  return geom.invert_matte ? `(1-(${core}))` : core;
}

export function compilePowerWindowFiltergraphClient(rawConfig) {
  const cfg = normalizePowerWindowConfigClient(rawConfig);
  const geom = interpolatePowerWindowAtTimeClient(cfg, cfg.playhead_norm);
  const warnings = [];

  if (!cfg.enabled) {
    return {
      enabled: false,
      preset_id: cfg.preset_id,
      shape_type: cfg.shape_type,
      view_mode: cfg.view_mode,
      has_planar_pin: false,
      has_pixelate: false,
      vf_chain: "null",
      filter_complex: "[0:v]null[vout]",
      ffmpeg_command: 'ffmpeg -i input.mp4 -vf "null" output.mp4',
      warnings: ["Power Window bypass active (enabled=false)."]
    };
  }

  const maskExpr = compilePwGeqExprClient(geom, cfg.width, cfg.height);
  if (cfg.view_mode === "matte_bw") {
    const chain = `format=gray,geq=lum='255*${maskExpr}',format=yuv420p`;
    return {
      enabled: true,
      preset_id: cfg.preset_id,
      shape_type: cfg.shape_type,
      view_mode: cfg.view_mode,
      has_planar_pin: cfg.shape_type === "planar_quad",
      has_pixelate: cfg.inside_pixelate_size > 1,
      vf_chain: chain,
      filter_complex: `[0:v]${chain}[vout]`,
      ffmpeg_command: `ffmpeg -i input.mp4 -filter_complex "[0:v]${chain}[vout]" -map "[vout]" output.mp4`,
      warnings
    };
  }

  const evToEq = (ev) => {
    const bright = Number(pwStudioClamp(ev * 0.18, -0.8, 0.8, 0).toFixed(4));
    const contrast = Number(pwStudioClamp(1 + ev * 0.12, 0.4, 2.0, 1).toFixed(4));
    return `eq=brightness=${bright}:contrast=${contrast}`;
  };

  const inFilters = [];
  if (Math.abs(cfg.inside_exposure_ev) > 0.01) inFilters.push(evToEq(cfg.inside_exposure_ev));
  if (cfg.inside_blur_px >= 0.5) {
    inFilters.push(`gblur=sigma=${Number(Math.max(0.5, cfg.inside_blur_px * 0.55).toFixed(2))}:steps=2`);
  }
  const hasPixelate = cfg.inside_pixelate_size > 1;
  if (hasPixelate) {
    const pixW = Math.max(16, Math.floor(cfg.width / Math.max(2, cfg.inside_pixelate_size)));
    const pixH = Math.max(16, Math.floor(cfg.height / Math.max(2, cfg.inside_pixelate_size)));
    inFilters.push(
      `crop=w=${cfg.width}:h=${cfg.height}:x=0:y=0,` +
      `scale=${pixW}:${pixH}:flags=neighbor,` +
      `scale=${cfg.width}:${cfg.height}:flags=neighbor`
    );
  }
  const hasPlanarPin = cfg.shape_type === "planar_quad";
  if (hasPlanarPin) {
    const q = geom.quad_corners;
    const x0 = Number((q[0][0] * cfg.width).toFixed(1));
    const y0 = Number((q[0][1] * cfg.height).toFixed(1));
    const x1 = Number((q[1][0] * cfg.width).toFixed(1));
    const y1 = Number((q[1][1] * cfg.height).toFixed(1));
    const x2 = Number((q[3][0] * cfg.width).toFixed(1));
    const y2 = Number((q[3][1] * cfg.height).toFixed(1));
    const x3 = Number((q[2][0] * cfg.width).toFixed(1));
    const y3 = Number((q[2][1] * cfg.height).toFixed(1));
    inFilters.push(
      `perspective=x0=${x0}:y0=${y0}:x1=${x1}:y1=${y1}:x2=${x2}:y2=${y2}:x3=${x3}:y3=${y3}:interpolation=linear:sense=destination`
    );
  }
  const inChain = inFilters.length ? inFilters.join(",") : "null";

  const outFilters = [];
  if (Math.abs(cfg.outside_exposure_ev) > 0.01) outFilters.push(evToEq(cfg.outside_exposure_ev));
  if (cfg.outside_blur_px >= 0.5) {
    const lumaR = Math.max(1, Math.min(32, Math.round(cfg.outside_blur_px * 0.45)));
    outFilters.push(`boxblur=luma_radius=${lumaR}:luma_power=2`);
  }
  if (cfg.vignette_opacity > 0.01) {
    const vigAngle = Number(pwStudioClamp(0.35 + cfg.vignette_opacity * 0.85, 0.2, 1.4, 0.5).toFixed(3));
    outFilters.push(`vignette=angle=${vigAngle}:mode=forward`);
  }
  const outChain = outFilters.length ? outFilters.join(",") : "null";

  const parts = [
    "[0:v]format=yuv420p,split=3[pw_in_src][pw_out_src][pw_mask_src]",
    `[pw_in_src]${inChain}[pw_inside]`,
    `[pw_out_src]${outChain}[pw_outside]`,
    `[pw_mask_src]format=gray,geq=lum='255*${maskExpr}'[pw_matte]`,
    "[pw_outside][pw_inside][pw_matte]maskedmerge[pw_comp]"
  ];
  if (cfg.view_mode === "red_overlay") {
    parts.push(
      "[pw_comp]format=rgb24," +
      `geq=r='clip(r(X,Y)+120*(1-${maskExpr}),0,255)':` +
      `g='clip(g(X,Y)*(0.55+0.45*${maskExpr}),0,255)':` +
      `b='clip(b(X,Y)*(0.55+0.45*${maskExpr}),0,255)',format=yuv420p[vout]`
    );
  } else {
    parts.push("[pw_comp]format=yuv420p[vout]");
  }
  const filterComplex = parts.join(";");
  return {
    enabled: true,
    preset_id: cfg.preset_id,
    shape_type: cfg.shape_type,
    view_mode: cfg.view_mode,
    has_planar_pin: hasPlanarPin,
    has_pixelate: hasPixelate,
    vf_chain: filterComplex,
    filter_complex: filterComplex,
    ffmpeg_command: `ffmpeg -i input.mp4 -filter_complex "${filterComplex}" -map "[vout]" output.mp4`,
    warnings
  };
}

export function exportPowerWindowJsonClient(rawConfig, opts = {}) {
  const cfg = normalizePowerWindowConfigClient(rawConfig);
  const geom = interpolatePowerWindowAtTimeClient(cfg, cfg.playhead_norm);
  const compiled = compilePowerWindowFiltergraphClient(cfg);
  const rawTitle = String(opts.title || "TAKTCUT_POWER_WINDOW").trim();
  const cleanTitle = rawTitle.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "TAKTCUT_POWER_WINDOW";
  const hosts = [
    "DaVinci Resolve Studio Color",
    "Adobe Premiere Lumetri Mask",
    "FFmpeg MaskedMerge / Perspective"
  ];
  const payload = {
    schema_version: "taktcut.power_window.v1",
    title: cleanTitle,
    preset_id: cfg.preset_id,
    compatible_hosts: hosts,
    geometry: {
      enabled: cfg.enabled,
      shape_type: cfg.shape_type,
      cx: geom.cx,
      cy: geom.cy,
      rx: geom.rx,
      ry: geom.ry,
      rotation_deg: geom.rotation_deg,
      corner_radius: cfg.corner_radius,
      softness_px: geom.softness_px,
      invert_matte: cfg.invert_matte,
      quad_corners: geom.quad_corners.map((p) => [...p])
    },
    homography_3x3: geom.homography_3x3,
    effects: {
      inside_exposure_ev: cfg.inside_exposure_ev,
      outside_exposure_ev: cfg.outside_exposure_ev,
      inside_blur_px: cfg.inside_blur_px,
      outside_blur_px: cfg.outside_blur_px,
      inside_pixelate_size: cfg.inside_pixelate_size,
      vignette_opacity: cfg.vignette_opacity
    },
    view_mode: cfg.view_mode,
    track_keyframes: cfg.track_keyframes.map((k) => ({ ...k, quad_corners: k.quad_corners.map((p) => [...p]) })),
    ffmpeg_filter_complex: compiled.filter_complex
  };
  return {
    schema_version: "taktcut.power_window.v1",
    title: cleanTitle,
    preset_id: cfg.preset_id,
    compatible_hosts: hosts,
    json_text: JSON.stringify(payload, null, 2),
    filename: `${cleanTitle.toLowerCase()}_${cfg.preset_id}_power_window.json`,
    saved_path: null
  };
}

export function applyPowerWindowToDocumentClient(doc, rawConfig, opts = {}) {
  const nextDoc = cloneTimelineDoc(doc);
  const cfg = normalizePowerWindowConfigClient(rawConfig);
  const evalRes = evaluatePowerWindowSamplesClient(cfg);
  const compiled = compilePowerWindowFiltergraphClient(cfg);
  const geom = evalRes.interpolated_geometry;
  const trackIndex = Number(opts.track_index || 1);
  const trk = (nextDoc.tracks || []).find((t) => t.kind === "video" && t.index === trackIndex)
    || (nextDoc.tracks || []).find((t) => t.kind === "video");
  if (!trk || !Array.isArray(trk.clips) || trk.clips.length === 0) {
    throw new Error(`Video track V${trackIndex} has no clips`);
  }
  const safeIdx = Math.max(0, Math.min(trk.clips.length - 1, Number(opts.clip_index || 0)));
  trk.clips[safeIdx] = {
    ...trk.clips[safeIdx],
    power_window: {
      enabled: cfg.enabled,
      preset_id: cfg.preset_id,
      shape_type: cfg.shape_type,
      cx: geom.cx,
      cy: geom.cy,
      rx: geom.rx,
      ry: geom.ry,
      rotation_deg: geom.rotation_deg,
      corner_radius: cfg.corner_radius,
      softness_px: geom.softness_px,
      invert_matte: cfg.invert_matte,
      quad_corners: geom.quad_corners.map((p) => [...p]),
      inside_exposure_ev: cfg.inside_exposure_ev,
      outside_exposure_ev: cfg.outside_exposure_ev,
      inside_blur_px: cfg.inside_blur_px,
      outside_blur_px: cfg.outside_blur_px,
      inside_pixelate_size: cfg.inside_pixelate_size,
      vignette_opacity: cfg.vignette_opacity,
      view_mode: cfg.view_mode,
      inside_coverage_pct: evalRes.inside_coverage_pct,
      homography_3x3: geom.homography_3x3,
      ffmpeg_vf: compiled.vf_chain.slice(0, 16384),
      track_keyframes: cfg.track_keyframes.map((k) => ({ ...k, quad_corners: k.quad_corners.map((p) => [...p]) }))
    }
  };
  return nextDoc;
}
