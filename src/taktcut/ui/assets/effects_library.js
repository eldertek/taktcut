// DaVinci Resolve 21 Effects Library Tree (UiEditToolboxContainerImp)
// + Live Hover Scrub (LivePreview::UiEffectLivePreviewManager / UiTitleLivePreviewManager)
// + Timeline Drag & Drop Payloads (UiEditTimelineWidgetImp).
// Exact structure verified from Templates.drfx (3,924 templates), Resolve.exe (119 PluginFactory classes),
// and BMDAudioPlugins.dll (Fairlight FX). Clean-room MIT implementation, zero proprietary assets.

const T = (name, transition, transStyle, duration_s = 1.0) => ({
  name,
  dropKind: "transition",
  transition,
  transStyle: transStyle || transition,
  duration_s
});

const AT = (name, fadeCurve, duration_s = 1.0) => ({
  name,
  dropKind: "audio-transition",
  fadeCurve,
  duration_s
});

const TI = (name, titleStyle, defaultText = "", defaultSub = "") => ({
  name,
  dropKind: "title",
  titleStyle,
  defaultFrames: 125,
  defaultText: defaultText || name,
  defaultSub: defaultSub || "DaVinci Resolve Title"
});

const GN = (name, genStyle, defaultColor = "#204a6e") => ({
  name,
  dropKind: "generator",
  genStyle,
  defaultFrames: 125,
  defaultColor
});

const FX = (name, fx, fxStyle = "", defaultParams = null) => ({
  name,
  dropKind: "clip-fx",
  fx: fx || "",
  fxStyle: fxStyle || fx || "custom",
  defaultParams: defaultParams || {}
});

const ST = (name, studio, fx, fxStyle = "", defaultParams = null) => ({
  name,
  dropKind: "clip-fx",
  studio,
  fx: fx || "",
  fxStyle: fxStyle || studio,
  defaultParams: defaultParams || {}
});

const AFX = (name, audioFxId, defaultParams = null) => ({
  name,
  dropKind: "audio-fx",
  audioFxId,
  defaultParams: defaultParams || { mix: 0.65, gain_db: 0 }
});

const SPECIAL = (name, dropKind, defaultFrames = 125) => ({
  name,
  dropKind,
  defaultFrames
});

const VIDEO_TRANSITIONS = [
  {
    label: "Dissolve",
    items: [
      T("Additive Dissolve", "fade", "additive"),
      T("Blur Dissolve", "fade", "blur"),
      T("Cross Dissolve", "fade", "cross"),
      T("Dip To Color Dissolve", "fadeblack", "dip_color"),
      T("Non-Additive Dissolve", "fade", "non_additive"),
      T("Smooth Cut", "fade", "smooth")
    ]
  },
  {
    label: "Iris",
    items: [
      T("Arrow Iris", "zoomin", "iris_arrow"),
      T("Cross Iris", "zoomin", "iris_cross"),
      T("Diamond Iris", "zoomin", "iris_diamond"),
      T("Eye Iris", "zoomin", "iris_eye"),
      T("Hexagon Iris", "zoomin", "iris_hex"),
      T("Oval Iris", "zoomin", "iris_oval"),
      T("Pentagon Iris", "zoomin", "iris_pentagon"),
      T("Square Iris", "zoomin", "iris_square"),
      T("Triangle Iris", "zoomin", "iris_triangle")
    ]
  },
  {
    label: "Wipe",
    items: [
      T("Band Wipe", "wipeleft", "wipe_band"),
      T("Barn Door", "wipeleft", "wipe_barn"),
      T("Box Wipe", "wipeleft", "wipe_box"),
      T("Center Wipe", "wipeleft", "wipe_center"),
      T("Checkerboard", "wipeleft", "wipe_checker"),
      T("Clock Wipe", "wipeleft", "wipe_clock"),
      T("Diagonal Wipe", "wipeleft", "wipe_diag"),
      T("Edge Wipe", "wipeleft", "wipe_edge"),
      T("Spiral Wipe", "wipeleft", "wipe_spiral")
    ]
  },
  {
    label: "Fusion Transitions",
    items: [
      T("Block Glitch", "fade", "block_glitch"),
      T("Box Twist", "wipeleft", "box_twist"),
      T("Brightness Flash", "fade", "brightness_flash"),
      T("Camera Shake", "fade", "trans_shake"),
      T("Crash Zoom", "zoomin", "crash_zoom"),
      T("Flip Over", "wipeleft", "flip_over"),
      T("Glow", "fade", "trans_glow"),
      T("Logo Wipe", "wipeleft", "wipe_diag"),
      T("Luma Wipe", "wipeleft", "luma_wipe"),
      T("Page Curl", "wipeleft", "page_curl"),
      T("RGB Splitter", "fade", "rgb_split"),
      T("Slide Down", "slideright", "slide_down"),
      T("Slide Left", "slideright", "slide_left"),
      T("Slide Right", "slideright", "slide_right"),
      T("Slide Up", "slideright", "slide_up")
    ]
  }
];

const AUDIO_TRANSITIONS = [
  {
    label: "Crossfade",
    items: [
      AT("Cross Fade 0 dB", "0db"),
      AT("Cross Fade +3 dB", "+3db"),
      AT("Cross Fade -3 dB", "-3db")
    ]
  }
];

const TITLES = [
  {
    label: "Titles",
    items: [
      TI("Text", "text", "Basic Title", ""),
      TI("Text+", "text_plus", "CUSTOM TITLE", "Fusion 2D/3D Text"),
      TI("Scroll", "scroll", "END CREDITS\nDirected by Studio\nEdited in taktcut Studio 21", ""),
      TI("Left Lower Third", "l3_left", "ALEXANDRE MOREAU", "Lead Colorist | Studio Paris"),
      TI("Middle Lower Third", "l3_mid", "SCENE TITLE", "Location & Timecode"),
      TI("Right Lower Third", "l3_right", "INTERVIEW GUEST", "Director of Photography")
    ]
  },
  {
    label: "Fusion Titles",
    items: [
      TI("Background Reveal", "bg_reveal", "BACKGROUND REVEAL", "Motion Graphic Title"),
      TI("Background Reveal Lower Third", "bg_reveal_l3", "REVEAL LOWER THIRD", "Production Subtitle"),
      TI("Call Out", "callout", "POINT OF INTEREST", "Tracked Target Detail"),
      TI("Callout Modern Lines", "callout_lines", "SPECIFICATION 01", "4K 25fps Rec.709"),
      TI("Center Reveal", "center_reveal", "CENTER REVEAL", "Split Mask Animation"),
      TI("Clean and Simple", "clean", "CLEAN & SIMPLE", "Minimalist Typography"),
      TI("Clean and Simple Lower Third", "clean_l3", "CLEAN LOWER THIRD", "Editorial Credit"),
      TI("Dark Box Text", "dark_box", "DARK BOX TITLE", "High-Contrast Plate"),
      TI("Digital Glitch", "glitch", "DIGITAL GLITCH", "RGB Offset Reveal"),
      TI("Drop In", "drop_in", "DROP IN TITLE", "Kinetic Bounce"),
      TI("Fade On", "fade_on", "FADE ON TITLE", "Smooth Opacity Ramp"),
      TI("Fade On Lower Third", "fade_on_l3", "FADE LOWER THIRD", "Soft Broadcast Bar"),
      TI("Headline", "headline", "BREAKING HEADLINE", "Broadcast Banner"),
      TI("Horizontal Line Reveal", "line_reveal", "LINE REVEAL", "Precision Rule Wipe"),
      TI("Jitter Lower Third", "jitter_l3", "JITTER GRAPHIC", "Kinetic Lower Third"),
      TI("Letterbox Text", "letterbox", "CINEMA TITLE", "2.39:1 Anamorphic Frame"),
      TI("Neon Flicker", "neon", "NEON FLICKER", "Glow Tube Title"),
      TI("Scroll Lower Third", "scroll_l3", "TICKER LOWER THIRD", "Scrolling Broadcast Band"),
      TI("Spin Twist Drift", "spin", "SPIN TWIST", "Dynamic Rotation Title"),
      TI("Stretch Zoom", "stretch", "STRETCH ZOOM", "Anamorphic Scale Reveal")
    ]
  },
  {
    label: "Subtitles",
    items: [
      TI("Simple White", "sub_white", "Subtitle caption text on screen.", ""),
      TI("Simple Yellow", "sub_yellow", "Broadcast yellow subtitle line.", ""),
      TI("White on Black", "sub_black", "High-contrast closed caption text.", ""),
      TI("White on Blue Shear", "sub_blue", "Stylized blue ribbon caption.", ""),
      TI("White on Red Shear", "sub_red", "Accent red ribbon caption.", "")
    ]
  }
];

const GENERATORS = [
  {
    label: "Generators",
    items: [
      GN("10 Step", "10_step"),
      GN("BT.2111 Color Bar HLG Narrow", "bt2111"),
      GN("EBU Color Bar", "ebu_bar"),
      GN("Four Color Gradient", "four_color", "#1f4e79"),
      GN("Grey Scale", "grey_scale"),
      GN("SMPTE Color Bar", "smpte"),
      GN("Solid Color", "solid", "#1e3a5f"),
      GN("Window", "window", "#ffffff")
    ]
  },
  {
    label: "Fusion Generators",
    items: [
      GN("Abstract Mesh", "abstract_mesh", "#2e4f7a"),
      GN("Checkerboard", "checkerboard", "#383842"),
      GN("Contours", "contours", "#39c5cf"),
      GN("Dreamy Shapes", "dreamy", "#d97757"),
      GN("Gradient Lines", "grad_lines", "#e64b3d"),
      GN("Hexagon Glow", "hex_glow", "#528bff"),
      GN("Noise Gradient", "noise_grad", "#3b5998"),
      GN("Starfield", "starfield", "#0b0e18"),
      GN("Vintage Texture", "vintage", "#8b6f4e")
    ]
  }
];

const TOOLBOX_EFFECTS = [
  {
    label: "Effects",
    items: [
      SPECIAL("Adjustment Clip", "adjustment", 125),
      SPECIAL("Fusion Composition", "fusion_comp", 125),
      FX("Binoculars", "", "binoculars", { strength: 1.0 }),
      FX("CCTV", "", "cctv", { strength: 1.0 }),
      FX("Colored Border", "", "colored_border", { border_px: 14, color: "#e64b3d" }),
      FX("DSLR", "", "dslr", { strength: 1.0 }),
      FX("DVE", "", "dve", { scale: 0.78, tilt: 0.14 }),
      FX("Digital Glitch", "", "digital_glitch", { strength: 0.75 }),
      FX("Drone Overlay", "", "drone_overlay", { strength: 1.0 }),
      FX("Night Vision", "", "night_vision", { strength: 1.0 }),
      FX("Paper Edge", "", "paper_edge", { strength: 0.85 }),
      FX("Repeat", "", "repeat", { cols: 2, rows: 2 }),
      FX("Video Call", "", "video_call", { strength: 1.0 })
    ]
  }
];

const RESOLVE_FX = [
  {
    label: "Resolve FX Blur",
    items: [
      FX("Box Blur", "directional_blur", "box_blur", { blur_amount: 9 }),
      FX("Directional Blur", "directional_blur", "directional_blur", { blur_amount: 11, angle_deg: 0 }),
      FX("Gaussian Blur", "tilt_shift", "gaussian_blur", { blur_strength: 10 }),
      FX("Lens Blur", "tilt_shift", "lens_blur", { blur_strength: 9 }),
      FX("Mosaic Blur", "mosaic_pixelate", "mosaic_pixelate", { block_size_px: 14 }),
      FX("Prism Blur", "chroma_aberration", "prism_blur", { shift_px: 6 }),
      FX("Radial Blur", "directional_blur", "radial_blur", { blur_amount: 10 }),
      FX("Tilt-Shift Blur", "tilt_shift", "tilt_shift", { focus_y: 0.5, band_height: 0.24, blur_strength: 8 }),
      FX("Zoom Blur", "directional_blur", "zoom_blur", { blur_amount: 12 })
    ]
  },
  {
    label: "Resolve FX Color",
    items: [
      ST("ACES Transform", "cst", "", "aces_transform", { intensity: 0.85 }),
      FX("Chromatic Adaptation", "", "chromatic_adaptation", { warmth: 0.45 }),
      FX("Color Compressor", "", "color_compressor", { strength: 0.65 }),
      FX("Color Palette", "", "color_palette", { strength: 1.0 }),
      ST("Color Space Transform", "cst", "", "cst_look", { intensity: 0.9 }),
      FX("Color Stabilizer", "", "color_stabilizer", { strength: 0.55 }),
      FX("Contrast Pop", "", "contrast_pop", { detail: 0.75 }),
      FX("DCTL", "", "dctl_look", { strength: 0.8 }),
      FX("False Color", "", "false_color", { opacity: 0.9 }),
      FX("Gamut Limiter", "", "gamut_limiter", { strength: 0.7 }),
      FX("Gamut Mapping", "", "gamut_mapping", { strength: 0.65 }),
      FX("Invert Color", "invert_negative", "invert_negative", { intensity: 1.0 }),
      FX("Hue Shift", "hue_shift", "hue_shift", { hue_deg: 55, saturation: 1.3 })
    ]
  },
  {
    label: "Resolve FX Film Emulation",
    items: [
      ST("Film Look Creator", "film_look", "halation", "film_look_creator", { strength: 0.85 }),
      FX("Halation", "halation", "halation", { intensity: 0.75, spread: 14 })
    ]
  },
  {
    label: "Resolve FX Generate",
    items: [
      GN("Color Generator", "color_gen", "#2a557c"),
      GN("Fast Noise", "fast_noise", "#222632"),
      GN("Grid", "grid", "#39c5cf")
    ]
  },
  {
    label: "Resolve FX Key",
    items: [
      FX("3D Keyer", "", "keyer_3d", { tolerance: 0.32 }),
      FX("Alpha Matte Shrink and Grow", "", "matte_shrink", { radius: 4 }),
      FX("Despill", "", "despill", { strength: 0.8 }),
      FX("HSL Keyer", "", "keyer_hsl", { tolerance: 0.3 }),
      FX("Luma Keyer", "", "keyer_luma", { threshold: 0.35 })
    ]
  },
  {
    label: "Resolve FX Light",
    items: [
      FX("Aperture Diffraction", "optical_glow", "aperture_diffraction", { glow_intensity: 0.65, glow_radius: 12 }),
      FX("Glow", "glow", "glow", { brightness: 0.95, width: 18, threshold: 0.42 }),
      FX("Lens Flare", "lens_flare", "lens_flare", { brightness: 1.0, scale: 1.0 }),
      FX("Lens Reflections", "prism_leak", "lens_reflections", { intensity: 0.75 }),
      FX("Light Rays", "pro_mist", "light_rays", { intensity: 0.8 })
    ]
  },
  {
    label: "Resolve FX OpenColorIO",
    items: [
      FX("OCIO CDL Transform", "", "ocio_cdl", { strength: 0.75 }),
      FX("OCIO Color Space", "", "ocio_cs", { strength: 0.75 }),
      FX("OCIO Display", "", "ocio_display", { strength: 0.75 }),
      FX("OCIO File Transform", "", "ocio_file", { strength: 0.75 })
    ]
  },
  {
    label: "Resolve FX Refine",
    items: [
      FX("Beauty", "", "beauty", { smooth: 0.65 }),
      FX("Blanking Fill", "", "blanking_fill", { scale: 1.15 }),
      FX("Chromatic Aberration Removal", "", "ca_removal", { strength: 0.6 }),
      FX("Depth Map", "", "depth_map", { contrast: 1.0 }),
      FX("Dehaze", "", "dehaze", { strength: 0.75 }),
      FX("Detail Recovery", "unsharp_mask", "detail_recovery", { sharpen_amount: 1.3 }),
      FX("Face Refinement", "", "face_refinement", { glow: 0.55 }),
      FX("Object Removal", "", "object_removal", { strength: 0.7 }),
      FX("Relight", "", "relight", { intensity: 0.8 }),
      FX("Sky Replacement", "", "sky_replacement", { blend: 0.75 }),
      FX("Soften & Sharpen", "unsharp_mask", "soften_sharpen", { sharpen_amount: 1.1 }),
      FX("Texture Pop", "", "texture_pop", { detail: 0.75 })
    ]
  },
  {
    label: "Resolve FX Revival",
    items: [
      FX("Automatic Dirt Removal", "", "revival_clean", { strength: 0.6 }),
      FX("Dead Pixel Fixer", "", "revival_clean", { strength: 0.5 }),
      FX("Deband", "", "deband", { strength: 0.65 }),
      FX("Deflicker", "", "deflicker", { strength: 0.65 }),
      FX("Dust Buster", "", "revival_clean", { strength: 0.6 }),
      FX("Frame Replacer", "", "revival_clean", { strength: 0.5 }),
      FX("Noise Reduction", "", "noise_reduction", { strength: 0.7 }),
      FX("Patch Replacer", "", "revival_clean", { strength: 0.6 })
    ]
  },
  {
    label: "Resolve FX Sharpen",
    items: [
      FX("Sharpen", "unsharp_mask", "unsharp_mask", { sharpen_amount: 1.4 }),
      FX("Sharpen Edges", "unsharp_mask", "sharpen_edges", { sharpen_amount: 1.7 }),
      FX("Ultra Sharpen", "unsharp_mask", "ultra_sharpen", { sharpen_amount: 2.1 })
    ]
  },
  {
    label: "Resolve FX Stylize",
    items: [
      FX("Abstraction", "", "abstraction", { strength: 0.85 }),
      FX("Burn Away", "", "burn_away", { progress: 0.48 }),
      FX("Defocus Background", "tilt_shift", "defocus_bg", { blur_strength: 10 }),
      FX("Drop Shadow", "", "drop_shadow", { offset: 14, blur: 18 }),
      FX("Edge Detect", "", "edge_detect", { threshold: 0.45 }),
      FX("Emboss", "", "emboss", { strength: 0.85 }),
      FX("Vignette", "vignette", "vignette", { angle_rad: 0.62 }),
      FX("Watercolor", "", "watercolor", { strength: 0.85 })
    ]
  },
  {
    label: "Resolve FX Temporal",
    items: [
      FX("Flicker Addition", "flicker", "flicker", { amplitude: 0.24, frequency: 8 }),
      FX("Motion Blur", "directional_blur", "motion_blur", { blur_amount: 9 }),
      FX("Motion Trails", "", "motion_trails", { decay: 0.72 }),
      FX("Smear", "directional_blur", "smear", { blur_amount: 14 }),
      FX("Stop Motion", "", "stop_motion", { repeat_frames: 4 })
    ]
  },
  {
    label: "Resolve FX Texture",
    items: [
      FX("Analog Damage", "scanlines", "analog_damage", { strength: 0.85 }),
      FX("Film Damage", "film_damage", "film_damage", { mix: 0.8, grain: 30, scratches: 0.55 }),
      FX("Film Grain", "film_grain", "film_grain", { strength: 22 }),
      FX("JPEG Damage", "mosaic_pixelate", "jpeg_damage", { block_size_px: 10 }),
      FX("Scanline", "scanlines", "scanlines", { opacity: 0.45 })
    ]
  },
  {
    label: "Resolve FX Transform",
    items: [
      FX("Camera Shake", "camera_shake", "camera_shake", { amplitude_px: 10, frequency_hz: 5 }),
      FX("Lens Distortion", "lens_distortion", "lens_distortion", { k1: -0.26 }),
      FX("Match Move", "", "match_move", { scale: 0.92 }),
      FX("Mirror", "mirror_flip", "mirror_flip", { axis: "horizontal" }),
      FX("Picture in Picture", "", "pip", { scale: 0.42 }),
      FX("Surface Tracker", "", "surface_tracker", { strength: 0.8 }),
      FX("Transform", "", "fx_transform", { zoom: 1.12, angle: -4 }),
      FX("Video Collage", "", "video_collage", { cols: 2, rows: 2 })
    ]
  },
  {
    label: "Resolve FX Warp",
    items: [
      FX("Dent", "", "dent", { strength: 0.45 }),
      FX("Interactive Warper", "", "waviness", { amplitude: 12 }),
      FX("Pano Map", "lens_distortion", "pano_map", { k1: 0.34 }),
      FX("Ripple", "", "ripple", { amplitude: 10, freq: 14 }),
      FX("Vortex", "", "vortex", { twist: 1.3 }),
      FX("Waviness", "", "waviness", { amplitude: 10, freq: 8 })
    ]
  }
];

const OPENFX_GENERATORS = [
  {
    label: "Open FX Generators",
    items: [
      GN("Color Generator", "color_gen", "#2a557c"),
      GN("Fast Noise", "fast_noise", "#222632"),
      GN("Grid", "grid", "#39c5cf")
    ]
  }
];

const OPENFX_TRANSITIONS = [
  {
    label: "Resolve FX Transitions",
    items: [
      T("Burn Away", "fade", "burn_away"),
      T("DCTL Transition", "fade", "rgb_split")
    ]
  }
];

const FAIRLIGHT_FX = [
  {
    label: "Fairlight FX",
    items: [
      AFX("AI Dialogue Leveler", "dialogue_leveler", { target_lufs: -16, mix: 0.85 }),
      AFX("AI Dialogue Separator", "dialogue_separator", { voice: 1.0, ambience: 0.2 }),
      AFX("Ambisonics Meter", "ambisonics_meter", { order: 1 }),
      AFX("Chorus", "chorus", { depth: 0.55, rate_hz: 1.4 }),
      AFX("Compressor", "compressor", { threshold_db: -18, ratio: 4.0, makeup_db: 3 }),
      AFX("Convolution Reverb", "conv_reverb", { mix: 0.35, decay_s: 2.2 }),
      AFX("De-Esser", "deesser", { freq_hz: 6500, amount_db: -6 }),
      AFX("De-Hummer", "dehummer", { freq_hz: 50, depth_db: -18 }),
      AFX("Delay", "delay", { time_ms: 280, feedback: 0.35, mix: 0.3 }),
      AFX("Distortion", "distortion", { drive: 0.5, tone: 0.6 }),
      AFX("Ducker", "ducker", { threshold_db: -22, range_db: -10 }),
      AFX("Dynamics", "dynamics", { threshold_db: -16, ratio: 3.5 }),
      AFX("Echo", "echo", { time_ms: 360, mix: 0.32 }),
      AFX("Equalizer", "equalizer", { low_db: 1.5, mid_db: 0, high_db: 2.0 }),
      AFX("Foley Sampler", "foley_sampler", { level_db: -6 }),
      AFX("Frequency Analyzer", "freq_analyzer", { bands: 31 }),
      AFX("LFE Filter", "lfe_filter", { cutoff_hz: 120 }),
      AFX("Limiter", "limiter", { ceiling_db: -1.0, gain_db: 4.0 }),
      AFX("Modulation", "modulation", { rate_hz: 2.0, depth: 0.4 }),
      AFX("Multiband Compressor", "multiband_comp", { bands: 4, ratio: 3.0 }),
      AFX("Noise Reduction", "noise_reduction", { reduction_db: 12, sensitivity: 0.5 }),
      AFX("Pitch", "pitch", { semitones: 0, cents: 0 }),
      AFX("Reverb", "reverb", { mix: 0.28, room_size: 0.6 }),
      AFX("Stereo Fixer", "stereo_fixer", { width: 1.0 }),
      AFX("Stereo Width", "stereo_width", { width: 1.35 }),
      AFX("Vocal Channel", "vocal_channel", { presence_db: 2.5, comp: 0.6 })
    ]
  }
];

export const EFFECTS_LIBRARY_TREE = [
  {
    id: "toolbox",
    label: "Toolbox",
    children: [
      { id: "video-transitions", label: "Video Transitions", groups: VIDEO_TRANSITIONS, kind: "transition" },
      { id: "audio-transitions", label: "Audio Transitions", groups: AUDIO_TRANSITIONS, kind: "audio-transition" },
      { id: "titles", label: "Titles", groups: TITLES, kind: "title" },
      { id: "generators", label: "Generators", groups: GENERATORS, kind: "generator" },
      { id: "effects", label: "Effects", groups: TOOLBOX_EFFECTS, kind: "effect" },
      { id: "filters", label: "Filters", groups: RESOLVE_FX, kind: "filter" },
      { id: "audio-fx", label: "Audio FX", groups: FAIRLIGHT_FX, kind: "audio-fx" }
    ]
  },
  {
    id: "openfx",
    label: "OpenFX",
    children: [
      { id: "ofx-filters", label: "Filters", groups: RESOLVE_FX, kind: "filter" },
      { id: "ofx-generators", label: "Generators", groups: OPENFX_GENERATORS, kind: "generator" },
      { id: "ofx-transitions", label: "Transitions", groups: OPENFX_TRANSITIONS, kind: "transition" }
    ]
  },
  {
    id: "audiofx",
    label: "Audio FX",
    children: [
      { id: "fairlight-fx", label: "Fairlight FX", groups: FAIRLIGHT_FX, kind: "audio-fx" },
      { id: "vst", label: "VST", groups: [], kind: "audio-fx" }
    ]
  }
];

export const CUT_PAGE_LIBRARY = {
  transitions: ["video-transitions"],
  titles: ["titles"],
  effects: ["effects", "filters"]
};

export function findLibraryNode(id) {
  for (const root of EFFECTS_LIBRARY_TREE) {
    for (const child of root.children) {
      if (child.id === id) return child;
    }
  }
  return null;
}

export function resolveDragPayloadForItem(item, node, group) {
  const dropKind = item.dropKind || (node && node.kind) || "clip-fx";
  return {
    source: "effects_library",
    dropKind,
    name: item.name,
    nodeId: node ? node.id : "",
    nodeLabel: node ? node.label : "",
    groupLabel: group ? group.label : "",
    transition: item.transition || "",
    transStyle: item.transStyle || item.transition || "",
    fadeCurve: item.fadeCurve || "0db",
    duration_s: item.duration_s || 1.0,
    titleStyle: item.titleStyle || "",
    defaultText: item.defaultText || item.name,
    defaultSub: item.defaultSub || "",
    genStyle: item.genStyle || "",
    defaultColor: item.defaultColor || "#204a6e",
    defaultFrames: item.defaultFrames || 125,
    fx: item.fx || "",
    fxStyle: item.fxStyle || item.fx || "",
    studio: item.studio || "",
    audioFxId: item.audioFxId || "",
    defaultParams: item.defaultParams ? { ...item.defaultParams } : {}
  };
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function svgEl(tag, attrs = {}) {
  const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}

function glyph(kind, item = null) {
  const svg = svgEl("svg", { class: "fxlib-glyph", viewBox: "0 0 28 18", "aria-hidden": "true" });
  const effKind = (item && item.dropKind) || kind;
  if (effKind === "transition" || effKind === "audio-transition") {
    svg.appendChild(svgEl("polygon", { points: "3,3 14,9 3,15", fill: "#5a5f66" }));
    svg.appendChild(svgEl("polygon", { points: "25,3 14,9 25,15", fill: effKind === "audio-transition" ? "#2ea461" : "#85d5f7" }));
  } else if (effKind === "title") {
    svg.appendChild(svgEl("text", { x: "14", y: "14", "text-anchor": "middle", class: "fxlib-glyph-t" })).textContent = "T";
  } else if (effKind === "generator") {
    svg.appendChild(svgEl("rect", { x: "3", y: "3", width: "11", height: "12", fill: "#255572" }));
    svg.appendChild(svgEl("rect", { x: "14", y: "3", width: "11", height: "12", fill: "#5869a8" }));
  } else if (effKind === "adjustment") {
    svg.appendChild(svgEl("rect", { x: "3", y: "3", width: "22", height: "12", rx: "2", fill: "#38466e", stroke: "#85d5f7", "stroke-width": "1.2" }));
    svg.appendChild(svgEl("path", { d: "M7 9h14M14 5.5v7", stroke: "#ececf2", "stroke-width": "1.2" }));
  } else if (effKind === "fusion_comp") {
    svg.appendChild(svgEl("circle", { cx: "9", cy: "9", r: "3.2", fill: "#7a5ca8" }));
    svg.appendChild(svgEl("circle", { cx: "19", cy: "9", r: "3.2", fill: "#e68442" }));
    svg.appendChild(svgEl("line", { x1: "12.2", y1: "9", x2: "15.8", y2: "9", stroke: "#d4d4dc", "stroke-width": "1.3" }));
  } else if (effKind === "audio-fx") {
    svg.appendChild(svgEl("path", { d: "M4 11h3v4H4zM10 6h3v9h-3zM16 3h3v12h-3zM22 8h3v7h-3z", fill: "#2ea461" }));
  } else {
    svg.appendChild(svgEl("circle", { cx: "14", cy: "9", r: "5.2", fill: "none", stroke: "#ababab", "stroke-width": "1.35" }));
    svg.appendChild(svgEl("path", { d: "M14 2.5v2M14 13.5v2M7.5 9h2M18.5 9h2", stroke: "#e64b3d", "stroke-width": "1.25" }));
  }
  return svg;
}

function normalize(q) {
  return String(q || "").trim().toLowerCase();
}

export function countLibraryItems(node) {
  return node.groups.reduce((n, g) => n + g.items.length, 0);
}

function pickItem(item, node, group, ctx) {
  const payload = resolveDragPayloadForItem(item, node, group);
  if (ctx && typeof ctx.onApplyItem === "function") {
    ctx.onApplyItem(payload);
    return;
  }
  const { addFxNode, applyTransition, openStudio, showBanner, onItemApplied } = ctx || {};
  if (item.transition && typeof applyTransition === "function") {
    applyTransition(item);
    return;
  }
  if (item.fx && typeof addFxNode === "function") {
    addFxNode(item.fx);
    if (typeof onItemApplied === "function") onItemApplied(item);
    if (typeof showBanner === "function") {
      showBanner(`${item.name} added to Inspector > Effects.`, "success");
    }
    return;
  }
  if (item.studio && typeof openStudio === "function") {
    openStudio(item.studio);
    return;
  }
  if (typeof showBanner === "function") {
    showBanner(`${item.name} (${node.label}) selected.`, "info");
  }
}

function createDragGhostEl(payload) {
  const ghost = document.createElement("div");
  ghost.className = "fxlib-drag-ghost";
  ghost.textContent = `${payload.name}`;
  ghost.style.cssText =
    "position:fixed;top:-200px;left:-200px;padding:4px 10px;border-radius:3px;" +
    "background:#212126;border:1px solid #e64b3d;color:#f0f0f5;font:600 11px 'Open Sans',sans-serif;" +
    "box-shadow:0 4px 14px rgba(0,0,0,0.65);pointer-events:none;white-space:nowrap;z-index:99999;";
  document.body.appendChild(ghost);
  return ghost;
}

// Render library groups as Resolve-style thumbnail tiles (Cut page bin) or compact rows (Edit page).
// Supports Live Hover Scrub preview (UiEffectLivePreviewManager) & Timeline Drag-and-Drop.
export function renderLibraryGroups(host, nodes, ctx, opts = {}) {
  const { layout = "tiles", query = "" } = opts;
  const q = normalize(query);
  host.replaceChildren();
  let total = 0;
  let hoverRafId = 0;
  let pendingHover = null;

  const flushHover = () => {
    hoverRafId = 0;
    if (ctx && typeof ctx.onHoverPreview === "function") {
      ctx.onHoverPreview(pendingHover);
    }
  };

  for (const node of nodes) {
    for (const group of node.groups) {
      const items = group.items.filter((it) => !q || normalize(it.name).includes(q));
      if (items.length === 0) continue;
      total += items.length;
      const section = el("section", "fxlib-group");
      const head = el("div", "fxlib-group-head");
      head.appendChild(el("span", "fxlib-group-title", group.label));
      head.appendChild(el("span", "fxlib-group-count tabular", String(items.length)));
      section.appendChild(head);
      const body = el("div", layout === "tiles" ? "fxlib-tiles" : "fxlib-rows");
      for (const item of items) {
        const payload = resolveDragPayloadForItem(item, node, group);
        const btn = el("button", layout === "tiles" ? "fxlib-tile" : "fxlib-row");
        btn.type = "button";
        btn.draggable = true;
        btn.title = `${item.name} (hover to scrub preview, drag onto Timeline, or double-click to apply)`;
        btn.dataset.libItem = item.name;
        btn.dataset.dropKind = payload.dropKind;
        btn.dataset.fxStyle = payload.fxStyle || payload.transStyle || payload.titleStyle || payload.genStyle || payload.audioFxId || "";

        const frame = el("span", "fxlib-frame");
        frame.appendChild(glyph(node.kind, item));
        btn.appendChild(frame);
        btn.appendChild(el("span", "fxlib-name", item.name));

        const addBadge = el("span", "fxlib-apply-dot", "+");
        btn.appendChild(addBadge);

        // Resolve Hover Scrub Bar (coral progress bar along bottom edge of row/tile)
        const scrubTrack = el("span", "fxlib-scrub-track");
        scrubTrack.setAttribute("aria-hidden", "true");
        const scrubFill = el("span", "fxlib-scrub-fill");
        const scrubNeedle = el("span", "fxlib-scrub-needle");
        scrubTrack.append(scrubFill, scrubNeedle);
        btn.appendChild(scrubTrack);

        const emitHover = (ev, immediate = false) => {
          const rect = btn.getBoundingClientRect();
          const progress = rect.width > 2
            ? Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
            : 0.5;
          const pct = `${(progress * 100).toFixed(1)}%`;
          scrubFill.style.width = pct;
          scrubNeedle.style.left = pct;
          btn.classList.add("is-hover-scrub");
          if (ctx && typeof ctx.onHoverPreview === "function") {
            pendingHover = { ...payload, progress };
            if (immediate) {
              if (hoverRafId) {
                window.cancelAnimationFrame(hoverRafId);
                hoverRafId = 0;
              }
              ctx.onHoverPreview(pendingHover);
            } else if (!hoverRafId) {
              hoverRafId = window.requestAnimationFrame(flushHover);
            }
          }
        };

        const clearHover = () => {
          btn.classList.remove("is-hover-scrub");
          if (hoverRafId) {
            window.cancelAnimationFrame(hoverRafId);
            hoverRafId = 0;
          }
          pendingHover = null;
          if (ctx && typeof ctx.onHoverPreview === "function") {
            ctx.onHoverPreview(null);
          }
        };

        btn.addEventListener("mouseenter", (ev) => emitHover(ev, true));
        btn.addEventListener("mousemove", (ev) => emitHover(ev, false));
        btn.addEventListener("mouseleave", clearHover);

        btn.addEventListener("dragstart", (ev) => {
          clearHover();
          btn.classList.add("is-dragging");
          if (ev.dataTransfer) {
            ev.dataTransfer.effectAllowed = "copy";
            try {
              ev.dataTransfer.setData("application/x-taktcut-drag", JSON.stringify(payload));
              ev.dataTransfer.setData("text/plain", payload.name);
            } catch {
              // Ignore synthetic DragEvent without mutable dataTransfer
            }
            if (typeof ev.dataTransfer.setDragImage === "function") {
              const ghost = createDragGhostEl(payload);
              ev.dataTransfer.setDragImage(ghost, 14, 12);
              window.setTimeout(() => ghost.remove(), 0);
            }
          }
          if (ctx && typeof ctx.onDragStart === "function") {
            ctx.onDragStart(payload);
          }
        });

        btn.addEventListener("dragend", () => {
          btn.classList.remove("is-dragging");
          if (ctx && typeof ctx.onDragEnd === "function") {
            ctx.onDragEnd();
          }
        });

        btn.addEventListener("click", () => {
          for (const other of host.querySelectorAll(".is-selected")) other.classList.remove("is-selected");
          btn.classList.add("is-selected");
        });
        btn.addEventListener("dblclick", () => pickItem(item, node, group, ctx));
        body.appendChild(btn);
      }
      section.appendChild(body);
      host.appendChild(section);
    }
  }
  if (total === 0) {
    host.appendChild(el("div", "fxlib-empty", q ? "No matching Resolve items" : "No items"));
  }
  return total;
}

// Edit page "Effects" panel: Search field, section tree (Toolbox / OpenFX / Audio FX) and item list.
export function mountEditEffectsLibrary(root, ctx) {
  if (!root) return;
  root.replaceChildren();
  const state = { nodeId: "filters", query: "", collapsed: new Set() };

  const header = el("div", "fxlib-header");
  header.appendChild(el("span", "fxlib-header-title", "Effects"));
  const search = el("input", "fxlib-search");
  search.type = "search";
  search.placeholder = "Search";
  search.setAttribute("aria-label", "Search effects");
  header.appendChild(search);
  root.appendChild(header);

  const body = el("div", "fxlib-body");
  const tree = el("nav", "fxlib-tree");
  tree.setAttribute("aria-label", "Effects Library sections");
  const list = el("div", "fxlib-list");
  body.append(tree, list);
  root.appendChild(body);

  const renderTree = () => {
    tree.replaceChildren();
    for (const rootNode of EFFECTS_LIBRARY_TREE) {
      const collapsed = state.collapsed.has(rootNode.id);
      const head = el("button", "fxlib-tree-root");
      head.type = "button";
      head.setAttribute("aria-expanded", collapsed ? "false" : "true");
      head.appendChild(el("span", "fxlib-chevron", collapsed ? "\u25b8" : "\u25be"));
      head.appendChild(el("span", "", rootNode.label));
      head.addEventListener("click", () => {
        if (state.collapsed.has(rootNode.id)) state.collapsed.delete(rootNode.id);
        else state.collapsed.add(rootNode.id);
        renderTree();
      });
      tree.appendChild(head);
      if (collapsed) continue;
      for (const child of rootNode.children) {
        const row = el("button", `fxlib-tree-leaf${child.id === state.nodeId ? " is-active" : ""}`, child.label);
        row.type = "button";
        row.addEventListener("click", () => {
          state.nodeId = child.id;
          renderTree();
          renderList();
        });
        tree.appendChild(row);
      }
    }
  };

  const renderList = () => {
    const nodes = state.query
      ? EFFECTS_LIBRARY_TREE[0].children
      : [findLibraryNode(state.nodeId)].filter(Boolean);
    renderLibraryGroups(list, nodes, ctx, { layout: "rows", query: state.query });
  };

  search.addEventListener("input", () => {
    state.query = search.value;
    renderList();
  });
  renderTree();
  renderList();
}
