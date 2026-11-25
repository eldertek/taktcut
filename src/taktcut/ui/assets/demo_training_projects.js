// Clean-room MIT Training Demo Projects Catalog for taktcut (Blackmagic Training Curriculum Style).
// Zero proprietary assets or private user projects: procedural SVG thumbnails & clean-room timelines.

function makeTrainingThumbSvg(opts) {
  const { bgA, bgB, accent, kind } = opts;
  let artwork = "";
  if (kind === "ocean") {
    artwork =
      `<path d="M0 118 Q65 92 140 112 T320 105 L320 180 L0 180 Z" fill="${accent}" opacity="0.34"/>` +
      `<path d="M0 138 Q90 118 185 136 T320 128 L320 180 L0 180 Z" fill="#38bdf8" opacity="0.22"/>` +
      `<circle cx="248" cy="48" r="18" fill="#fbbf24" opacity="0.72"/>`;
  } else if (kind === "action") {
    artwork =
      `<path d="M18 148 L128 96 L210 106 L306 58" fill="none" stroke="${accent}" stroke-width="3.5" stroke-linecap="round"/>` +
      `<path d="M0 132 L320 74" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="8 6" opacity="0.65"/>` +
      `<circle cx="212" cy="105" r="24" fill="${accent}" opacity="0.22"/>`;
  } else if (kind === "multicam") {
    artwork =
      `<rect x="18" y="24" width="134" height="62" rx="3" fill="#182230" stroke="#475569" stroke-width="1.5"/>` +
      `<rect x="168" y="24" width="134" height="62" rx="3" fill="#231c28" stroke="${accent}" stroke-width="2"/>` +
      `<rect x="18" y="96" width="134" height="62" rx="3" fill="#1b2622" stroke="#475569" stroke-width="1.5"/>` +
      `<rect x="168" y="96" width="134" height="62" rx="3" fill="#26201a" stroke="#475569" stroke-width="1.5"/>` +
      `<circle cx="235" cy="55" r="13" fill="${accent}" opacity="0.65"/>`;
  } else if (kind === "color_film") {
    artwork =
      `<path d="M0 140 L92 78 L168 122 L236 66 L320 134 L320 180 L0 180 Z" fill="${accent}" opacity="0.42"/>` +
      `<circle cx="76" cy="52" r="18" fill="none" stroke="#f59e0b" stroke-width="2.5"/>` +
      `<circle cx="122" cy="52" r="18" fill="none" stroke="#22c55e" stroke-width="2.5"/>` +
      `<circle cx="168" cy="52" r="18" fill="none" stroke="#3b82f6" stroke-width="2.5"/>`;
  } else if (kind === "neon_noir") {
    artwork =
      `<rect x="0" y="28" width="320" height="124" fill="none" stroke="#0f172a" stroke-width="24"/>` +
      `<circle cx="110" cy="90" r="36" fill="#06b6d4" opacity="0.32"/>` +
      `<circle cx="212" cy="90" r="36" fill="${accent}" opacity="0.36"/>` +
      `<path d="M56 126 L264 126" stroke="#f97316" stroke-width="2" opacity="0.75"/>`;
  } else if (kind === "fusion") {
    artwork =
      `<rect x="34" y="42" width="110" height="96" rx="4" fill="#0b3b24" stroke="#22c55e" stroke-width="1.8"/>` +
      `<circle cx="89" cy="84" r="18" fill="#86efac" opacity="0.45"/>` +
      `<path d="M168 62 H214 M192 94 H276" stroke="#eab308" stroke-width="2"/>` +
      `<rect x="176" y="48" width="52" height="26" rx="3" fill="#232329" stroke="${accent}" stroke-width="1.5"/>` +
      `<rect x="234" y="82" width="56" height="26" rx="3" fill="#232329" stroke="#38bdf8" stroke-width="1.5"/>`;
  } else if (kind === "fairlight") {
    artwork =
      `<path d="M20 96 Q45 44 70 96 T120 96 T170 96 T220 96 T270 96 T304 96" fill="none" stroke="${accent}" stroke-width="3"/>` +
      `<rect x="36" y="128" width="18" height="28" fill="#22c55e" opacity="0.7"/>` +
      `<rect x="64" y="114" width="18" height="42" fill="#22c55e" opacity="0.8"/>` +
      `<rect x="92" y="102" width="18" height="54" fill="#eab308" opacity="0.8"/>` +
      `<rect x="120" y="120" width="18" height="36" fill="#22c55e" opacity="0.75"/>`;
  } else {
    artwork =
      `<rect x="116" y="16" width="88" height="148" rx="6" fill="#12141c" stroke="${accent}" stroke-width="2"/>` +
      `<rect x="124" y="28" width="72" height="100" rx="2" fill="#1e293b"/>` +
      `<rect x="130" y="110" width="60" height="10" rx="2" fill="${accent}" opacity="0.85"/>`;
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bgA}"/><stop offset="100%" stop-color="${bgB}"/></linearGradient></defs>` +
    `<rect width="320" height="180" fill="url(#g)"/>` +
    artwork +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const FPS_24 = { num: 24, den: 1 };
const FPS_25 = { num: 25, den: 1 };
const FPS_50 = { num: 50, den: 1 };

export const DEMO_TRAINING_PROJECTS = [
  {
    id: "bm_01_ocean_expedition",
    name: "01_Cut_Ocean_Expedition_24p",
    category: "CUT & EDIT",
    description: "Multi-track coastal documentary edit with Drone 2.0x speed ramp, lower thirds and chapter markers.",
    specs: "24p 16:9 4T 8C",
    recommendedTab: "edit",
    aspectPreset: "16:9",
    colorPreset: "rec709_clean",
    nodeLabels: ["01 Log Normalize", "02 Contrast S-Curve"],
    thumbnailUrl: makeTrainingThumbSvg({ bgA: "#0b1e2d", bgB: "#102a38", accent: "#0ea5e9", tag: "CUT & EDIT", kind: "ocean" }),
    document: {
      name: "01_Cut_Ocean_Expedition_24p",
      source_format: "drt",
      fps: FPS_24,
      width: 1920,
      height: 1080,
      start_frame: 0,
      color_space_tags: ["Rec.709 / Gamma 2.4"],
      lut_refs: ["luts/ocean_neutral_d65.cube"],
      tracks: [
        {
          index: 1,
          kind: "video",
          name: "V1 Expedition A-Roll",
          sync_locked: true,
          clips: [
            { name: "OCN_01_Harbor_Dawn", track_index: 1, media_type: "video", start_frame: 0, duration_frames: 96, source_in_frame: 12, source_path: "media/ocean/OCN_01_Harbor_Dawn.mov", source_fps: FPS_24, enabled: true, link_group_id: "av-01", transition_out: { preset: "fade", duration_s: 0.5, include_audio: true, audio_curve: "tri" } },
            { name: "OCN_02_Drone_Reef", track_index: 1, media_type: "video", start_frame: 96, duration_frames: 120, source_in_frame: 0, source_path: "media/ocean/OCN_02_Drone_Reef.mov", source_fps: FPS_24, enabled: true, speed_rate: 2.0 },
            { name: "OCN_03_Diver_Entry", track_index: 1, media_type: "video", start_frame: 216, duration_frames: 120, source_in_frame: 24, source_path: "media/ocean/OCN_03_Diver_Entry.mov", source_fps: FPS_24, enabled: true, transition_out: { preset: "fade", duration_s: 0.4, include_audio: false, audio_curve: "tri" } },
            { name: "OCN_04_Coral_Macro", track_index: 1, media_type: "video", start_frame: 336, duration_frames: 144, source_in_frame: 0, source_path: "media/ocean/OCN_04_Coral_Macro.mov", source_fps: FPS_24, enabled: true }
          ]
        },
        {
          index: 2,
          kind: "video",
          name: "V2 Titles & Maps",
          clips: [
            { name: "GFX_Title_Atlantic_Shelf", track_index: 2, media_type: "video", start_frame: 24, duration_frames: 144, source_in_frame: 0, source_path: "gfx/title_atlantic.mov", source_fps: FPS_24, enabled: true }
          ]
        },
        {
          index: 1,
          kind: "audio",
          name: "A1 Narration",
          sync_locked: true,
          clips: [
            { name: "VO_Expedition_Intro", track_index: 1, media_type: "audio", start_frame: 0, duration_frames: 240, source_in_frame: 0, source_path: "audio/vo_expedition_01.wav", enabled: true, link_group_id: "av-01", audio_gain_db: 1.0, fade_in_s: 0.3 },
            { name: "VO_Expedition_Reef", track_index: 1, media_type: "audio", start_frame: 240, duration_frames: 240, source_in_frame: 0, source_path: "audio/vo_expedition_02.wav", enabled: true, fade_out_s: 0.6 }
          ]
        },
        {
          index: 2,
          kind: "audio",
          name: "A2 Ocean Score & Surf",
          clips: [
            { name: "MX_Waves_Ambient_Stem", track_index: 2, media_type: "audio", start_frame: 0, duration_frames: 480, source_in_frame: 0, source_path: "audio/mx_waves.wav", enabled: true, audio_gain_db: -8.0, fade_in_s: 1.0, fade_out_s: 2.0 }
          ]
        }
      ],
      markers: [
        { name: "Title Cue", frame: 24, duration_frames: 1, color: "Cyan", note: "Superimpose location card" },
        { name: "Drone Ramp", frame: 96, duration_frames: 1, color: "Gold", note: "2.0x aerial push" },
        { name: "Reef Dissolve", frame: 336, duration_frames: 1, color: "Green", note: "Color balance check" }
      ]
    }
  },
  {
    id: "bm_02_night_drift_retime",
    name: "02_Action_Night_Drift_50p",
    category: "RETIME 50P",
    description: "High-frame-rate 50p action edit with Optical Flow 0.4x..2.5x speed ramps, DVE zoom punch-in and SFX.",
    specs: "50p 16:9 4T 8C",
    recommendedTab: "cut",
    aspectPreset: "16:9",
    colorPreset: "teal_orange",
    nodeLabels: ["01 Primaries Cool", "02 Neon Highlight Roll"],
    thumbnailUrl: makeTrainingThumbSvg({ bgA: "#161124", bgB: "#1e1b33", accent: "#f97316", tag: "SPEED 50P", kind: "action" }),
    document: {
      name: "02_Action_Night_Drift_50p",
      source_format: "drt",
      fps: FPS_50,
      width: 1920,
      height: 1080,
      start_frame: 0,
      color_space_tags: ["Rec.709 / High Frame Rate 50p"],
      lut_refs: ["luts/night_urban_print.cube"],
      tracks: [
        {
          index: 1,
          kind: "video",
          name: "V1 Track Action",
          sync_locked: true,
          clips: [
            { name: "DRF_01_Pit_Rev_50p", track_index: 1, media_type: "video", start_frame: 0, duration_frames: 150, source_in_frame: 0, source_path: "media/drift/DRF_01_Pit.mov", source_fps: FPS_50, enabled: true, transform: { zoom_pct: 108.0 } },
            { name: "DRF_02_Apex_Whip_50p", track_index: 1, media_type: "video", start_frame: 150, duration_frames: 200, source_in_frame: 20, source_path: "media/drift/DRF_02_Apex.mov", source_fps: FPS_50, enabled: true, speed_rate: 0.4, retime_process: "optical_flow", retime_ramp_preset: "hero_slowmo", transform: { zoom_pct: 112.0 }, transition_out: { preset: "wipeleft", duration_s: 0.35, include_audio: true, audio_curve: "tri" } },
            { name: "DRF_03_Straight_250pct", track_index: 1, media_type: "video", start_frame: 350, duration_frames: 150, source_in_frame: 0, source_path: "media/drift/DRF_03_Straight.mov", source_fps: FPS_50, enabled: true, speed_rate: 2.5 }
          ]
        },
        {
          index: 2,
          kind: "video",
          name: "V2 Telemetry Overlay",
          clips: [
            { name: "HUD_RPM_BurnIn", track_index: 2, media_type: "video", start_frame: 150, duration_frames: 200, source_in_frame: 0, source_path: "gfx/hud_rpm.mov", source_fps: FPS_50, enabled: true }
          ]
        },
        {
          index: 1,
          kind: "audio",
          name: "A1 Engine & Tires",
          clips: [
            { name: "SFX_Exhaust_Pass", track_index: 1, media_type: "audio", start_frame: 0, duration_frames: 500, source_in_frame: 0, source_path: "audio/sfx_exhaust.wav", enabled: true, audio_gain_db: -2.0 }
          ]
        },
        {
          index: 2,
          kind: "audio",
          name: "A2 Synth Drive",
          clips: [
            { name: "MX_Synth_128BPM", track_index: 2, media_type: "audio", start_frame: 0, duration_frames: 500, source_in_frame: 0, source_path: "audio/mx_synth.wav", enabled: true, audio_gain_db: -5.5 }
          ]
        }
      ],
      markers: [
        { name: "Apex Slowmo", frame: 150, duration_frames: 25, color: "Red", note: "40% Optical Flow ramp" },
        { name: "Beat Drop", frame: 350, duration_frames: 1, color: "Gold", note: "250% speed transition" }
      ]
    }
  },
  {
    id: "bm_03_multicam_studio",
    name: "03_Edit_MultiCam_Session_25p",
    category: "MULTICAM 4x",
    description: "4-camera live studio session synced for live Quad switching (Angle 1-4) with isolated vocal & master stems.",
    specs: "25p 16:9 5T 10C",
    recommendedTab: "edit",
    aspectPreset: "16:9",
    colorPreset: "rec709_clean",
    nodeLabels: ["01 Studio Balance", "02 Skin Hue Align"],
    thumbnailUrl: makeTrainingThumbSvg({ bgA: "#161a24", bgB: "#1e222e", accent: "#e64b38", tag: "MULTICAM 4X", kind: "multicam" }),
    document: {
      name: "03_Edit_MultiCam_Session_25p",
      source_format: "drt",
      fps: FPS_25,
      width: 1920,
      height: 1080,
      start_frame: 0,
      color_space_tags: ["Rec.709 / Multi-Cam Sync"],
      lut_refs: [],
      tracks: [
        {
          index: 1,
          kind: "video",
          name: "V1 MultiCam Master",
          sync_locked: true,
          clips: [
            { name: "CAM_A_Wide_Stage", track_index: 1, media_type: "video", start_frame: 0, duration_frames: 125, source_in_frame: 0, source_path: "media/mc/cam_a.mov", source_fps: FPS_25, enabled: true, link_group_id: "mc-01" },
            { name: "CAM_B_Host_Close", track_index: 1, media_type: "video", start_frame: 125, duration_frames: 125, source_in_frame: 125, source_path: "media/mc/cam_b.mov", source_fps: FPS_25, enabled: true, transform: { zoom_pct: 105.0 } },
            { name: "CAM_C_Hands_Overhead", track_index: 1, media_type: "video", start_frame: 250, duration_frames: 100, source_in_frame: 250, source_path: "media/mc/cam_c.mov", source_fps: FPS_25, enabled: true },
            { name: "CAM_D_Reverse_Crowd", track_index: 1, media_type: "video", start_frame: 350, duration_frames: 150, source_in_frame: 350, source_path: "media/mc/cam_d.mov", source_fps: FPS_25, enabled: true }
          ]
        },
        {
          index: 2,
          kind: "video",
          name: "V2 Guest Lower Thirds",
          clips: [
            { name: "L3_Guest_Colorist", track_index: 2, media_type: "video", start_frame: 125, duration_frames: 125, source_in_frame: 0, source_path: "gfx/l3_guest.mov", source_fps: FPS_25, enabled: true }
          ]
        },
        {
          index: 1,
          kind: "audio",
          name: "A1 Host Lav Mic",
          clips: [
            { name: "STEM_Host_Lav_01", track_index: 1, media_type: "audio", start_frame: 0, duration_frames: 500, source_in_frame: 0, source_path: "audio/mc_host.wav", enabled: true, link_group_id: "mc-01", audio_gain_db: 0.0 }
          ]
        },
        {
          index: 2,
          kind: "audio",
          name: "A2 Studio Boom",
          clips: [
            { name: "STEM_Boom_Room", track_index: 2, media_type: "audio", start_frame: 0, duration_frames: 500, source_in_frame: 0, source_path: "audio/mc_boom.wav", enabled: true, audio_gain_db: -6.0 }
          ]
        }
      ],
      markers: [
        { name: "Cam B Cut", frame: 125, duration_frames: 1, color: "Cyan", note: "Switch to Close-Up" },
        { name: "Cam C Insert", frame: 250, duration_frames: 1, color: "Gold", note: "Overhead rig shot" }
      ]
    }
  },
  {
    id: "bm_04_color_nature_doc",
    name: "04_Color_Alpine_Film2383_24p",
    category: "COLOR 2383",
    description: "4K UHD Color Training timeline with LogC normalization, 4-node serial tree, S-Curve and 35mm Print Look.",
    specs: "24p 4K UHD 3T 6C",
    recommendedTab: "color",
    aspectPreset: "16:9",
    colorPreset: "film_warm",
    nodeLabels: ["01 CST LogC -> 709", "02 Primary Exposure", "03 PW Sky Grad", "04 Print 2383"],
    thumbnailUrl: makeTrainingThumbSvg({ bgA: "#241911", bgB: "#1a222b", accent: "#f59e0b", tag: "COLOR 2383", kind: "color_film" }),
    document: {
      name: "04_Color_Alpine_Film2383_24p",
      source_format: "drp",
      fps: FPS_24,
      width: 3840,
      height: 2160,
      start_frame: 0,
      color_space_tags: ["ARRI LogC3 -> DaVinci Wide Gamut -> Rec.709"],
      lut_refs: ["luts/kodak_2383_d65.cube"],
      tracks: [
        {
          index: 1,
          kind: "video",
          name: "V1 Alpine LogC Master",
          clips: [
            { name: "A010_C001_Ridge_LogC", track_index: 1, media_type: "video", start_frame: 0, duration_frames: 120, source_in_frame: 0, source_path: "media/alpine/A010_C001.mov", source_fps: FPS_24, enabled: true },
            { name: "A010_C002_Glacier_Sun", track_index: 1, media_type: "video", start_frame: 120, duration_frames: 120, source_in_frame: 12, source_path: "media/alpine/A010_C002.mov", source_fps: FPS_24, enabled: true },
            { name: "A010_C003_Portrait_Hiker", track_index: 1, media_type: "video", start_frame: 240, duration_frames: 144, source_in_frame: 0, source_path: "media/alpine/A010_C003.mov", source_fps: FPS_24, enabled: true },
            { name: "A010_C004_Dusk_Pan", track_index: 1, media_type: "video", start_frame: 384, duration_frames: 96, source_in_frame: 0, source_path: "media/alpine/A010_C004.mov", source_fps: FPS_24, enabled: true }
          ]
        },
        {
          index: 1,
          kind: "audio",
          name: "A1 Nature Wind Bed",
          clips: [
            { name: "AMB_Ridge_Wind_24bit", track_index: 1, media_type: "audio", start_frame: 0, duration_frames: 480, source_in_frame: 0, source_path: "audio/amb_ridge.wav", enabled: true, audio_gain_db: -4.0 }
          ]
        }
      ],
      markers: [
        { name: "Skin Tone Ref", frame: 240, duration_frames: 1, color: "Gold", note: "Vectorscope skin line check" }
      ]
    }
  },
  {
    id: "bm_05_color_neon_noir",
    name: "05_Color_NeonNoir_Qual_25p",
    category: "SHOT MATCH",
    description: "2.39:1 Anamorphic grading drill: Teal & Orange split tone, HSL skin qualifier isolation & Color Warper.",
    specs: "25p 2.39:1 3T 5C",
    recommendedTab: "color",
    aspectPreset: "21:9",
    colorPreset: "teal_orange",
    nodeLabels: ["01 Noise Reduction", "02 Skin Qualifier", "03 Teal Shadow Warp", "04 Halation Bloom"],
    thumbnailUrl: makeTrainingThumbSvg({ bgA: "#0a1c24", bgB: "#1c1218", accent: "#f97316", tag: "ANAMORPHIC", kind: "neon_noir" }),
    document: {
      name: "05_Color_NeonNoir_Qual_25p",
      source_format: "drp",
      fps: FPS_25,
      width: 2560,
      height: 1080,
      start_frame: 0,
      color_space_tags: ["Sony S-Log3 -> Rec.709 2.4 Scope"],
      lut_refs: ["luts/teal_orange_cinema.cube"],
      tracks: [
        {
          index: 1,
          kind: "video",
          name: "V1 Scope Feature",
          clips: [
            { name: "NOIR_01_Rain_Alley", track_index: 1, media_type: "video", start_frame: 0, duration_frames: 150, source_in_frame: 0, source_path: "media/noir/NOIR_01.mov", source_fps: FPS_25, enabled: true },
            { name: "NOIR_02_Cafe_Neon_Skin", track_index: 1, media_type: "video", start_frame: 150, duration_frames: 175, source_in_frame: 0, source_path: "media/noir/NOIR_02.mov", source_fps: FPS_25, enabled: true },
            { name: "NOIR_03_Car_Backlit", track_index: 1, media_type: "video", start_frame: 325, duration_frames: 175, source_in_frame: 0, source_path: "media/noir/NOIR_03.mov", source_fps: FPS_25, enabled: true }
          ]
        },
        {
          index: 1,
          kind: "audio",
          name: "A1 Foley & Rain",
          clips: [
            { name: "AMB_Night_Rain_51", track_index: 1, media_type: "audio", start_frame: 0, duration_frames: 500, source_in_frame: 0, source_path: "audio/amb_rain.wav", enabled: true }
          ]
        }
      ],
      markers: [
        { name: "HSL Skin Check", frame: 150, duration_frames: 1, color: "Cyan", note: "Keep tungsten skin natural vs cyan neon" }
      ]
    }
  },
  {
    id: "bm_06_fusion_greenscreen",
    name: "06_Fusion_GreenScreen_Track_24p",
    category: "FUSION VFX",
    description: "VFX compositing training: Delta Keyer matte extraction, 4-pin Planar Tracker screen insert & Optical Glow.",
    specs: "24p 16:9 4T 6C",
    recommendedTab: "fx",
    aspectPreset: "16:9",
    colorPreset: "rec709_clean",
    nodeLabels: ["01 Despill Balanced", "02 Comp Blend"],
    thumbnailUrl: makeTrainingThumbSvg({ bgA: "#0c1b14", bgB: "#151922", accent: "#22c55e", tag: "FUSION VFX", kind: "fusion" }),
    document: {
      name: "06_Fusion_GreenScreen_Track_24p",
      source_format: "drt",
      fps: FPS_24,
      width: 1920,
      height: 1080,
      start_frame: 0,
      color_space_tags: ["Linear Compositing / Rec.709 View"],
      lut_refs: [],
      tracks: [
        {
          index: 1,
          kind: "video",
          name: "V1 Virtual Set Plate",
          clips: [
            { name: "BG_Studio_ServerRoom_4K", track_index: 1, media_type: "video", start_frame: 0, duration_frames: 240, source_in_frame: 0, source_path: "media/vfx/bg_server.mov", source_fps: FPS_24, enabled: true },
            { name: "BG_Corridor_TrackerPlate", track_index: 1, media_type: "video", start_frame: 240, duration_frames: 240, source_in_frame: 0, source_path: "media/vfx/bg_corridor.mov", source_fps: FPS_24, enabled: true }
          ]
        },
        {
          index: 2,
          kind: "video",
          name: "V2 Chroma Key Talent",
          clips: [
            { name: "GS_Presenter_DeltaKey", track_index: 2, media_type: "video", start_frame: 0, duration_frames: 240, source_in_frame: 10, source_path: "media/vfx/gs_presenter.mov", source_fps: FPS_24, enabled: true, transform: { zoom_pct: 96.0 } }
          ]
        },
        {
          index: 3,
          kind: "video",
          name: "V3 Planar Insert & Glow",
          clips: [
            { name: "GFX_Screen_CornerPin", track_index: 3, media_type: "video", start_frame: 240, duration_frames: 240, source_in_frame: 0, source_path: "gfx/screen_insert.mov", source_fps: FPS_24, enabled: true }
          ]
        },
        {
          index: 1,
          kind: "audio",
          name: "A1 Studio Lav Clean",
          clips: [
            { name: "VO_VFX_Session", track_index: 1, media_type: "audio", start_frame: 0, duration_frames: 480, source_in_frame: 0, source_path: "audio/vo_vfx.wav", enabled: true }
          ]
        }
      ],
      markers: [
        { name: "Key Matte Edge", frame: 48, duration_frames: 1, color: "Green", note: "Inspect Alpha Matte spill suppression" },
        { name: "Planar Track Start", frame: 240, duration_frames: 1, color: "Cyan", note: "Corner-pin tablet monitor" }
      ]
    }
  },
  {
    id: "bm_07_fairlight_broadcast",
    name: "07_Fairlight_FilmMix_R128_25p",
    category: "FAIRLIGHT -23 LUFS",
    description: "Broadcast audio post training: 4 discrete dialogue/foley/score/ambience stems, 6-band EQ, Compressor & EBU R128.",
    specs: "25p 16:9 5T 8C",
    recommendedTab: "fairlight",
    aspectPreset: "16:9",
    colorPreset: "film_warm",
    nodeLabels: ["01 Film Master Grade"],
    thumbnailUrl: makeTrainingThumbSvg({ bgA: "#0b1a17", bgB: "#151920", accent: "#2dd4bf", tag: "EBU R128", kind: "fairlight" }),
    document: {
      name: "07_Fairlight_FilmMix_R128_25p",
      source_format: "drt",
      fps: FPS_25,
      width: 1920,
      height: 1080,
      start_frame: 0,
      color_space_tags: ["EBU R128 -23.0 LUFS / -1.0 dBTP"],
      lut_refs: [],
      tracks: [
        {
          index: 1,
          kind: "video",
          name: "V1 Picture Lock Ref",
          clips: [
            { name: "PIC_Scene12_BroadcastLock", track_index: 1, media_type: "video", start_frame: 0, duration_frames: 500, source_in_frame: 0, source_path: "media/mix/pic_lock.mov", source_fps: FPS_25, enabled: true }
          ]
        },
        {
          index: 1,
          kind: "audio",
          name: "A1 Dialogue ADR",
          sync_locked: true,
          clips: [
            { name: "ADR_Line01_Close", track_index: 1, media_type: "audio", start_frame: 15, duration_frames: 160, source_in_frame: 0, source_path: "audio/adr_01.wav", enabled: true, audio_gain_db: 1.5, fade_in_s: 0.15 },
            { name: "ADR_Line02_Reply", track_index: 1, media_type: "audio", start_frame: 210, duration_frames: 190, source_in_frame: 0, source_path: "audio/adr_02.wav", enabled: true, audio_gain_db: 0.5, fade_out_s: 0.25 }
          ]
        },
        {
          index: 2,
          kind: "audio",
          name: "A2 Foley & Steps",
          clips: [
            { name: "FOL_Gravel_Footsteps", track_index: 2, media_type: "audio", start_frame: 0, duration_frames: 250, source_in_frame: 0, source_path: "audio/fol_steps.wav", enabled: true, audio_gain_db: -4.5 },
            { name: "FOL_Door_Latch_Hit", track_index: 2, media_type: "audio", start_frame: 260, duration_frames: 140, source_in_frame: 0, source_path: "audio/fol_door.wav", enabled: true, audio_gain_db: -3.0 }
          ]
        },
        {
          index: 3,
          kind: "audio",
          name: "A3 Cello Score",
          clips: [
            { name: "MX_Chamber_Strings_24b", track_index: 3, media_type: "audio", start_frame: 0, duration_frames: 500, source_in_frame: 0, source_path: "audio/mx_cello.wav", enabled: true, audio_gain_db: -9.0, fade_in_s: 1.5, fade_out_s: 2.0 }
          ]
        },
        {
          index: 4,
          kind: "audio",
          name: "A4 City Ambience",
          clips: [
            { name: "AMB_Distant_Traffic_St", track_index: 4, media_type: "audio", start_frame: 0, duration_frames: 500, source_in_frame: 0, source_path: "audio/amb_city.wav", enabled: true, audio_gain_db: -14.0 }
          ]
        }
      ],
      markers: [
        { name: "Ducking Threshold", frame: 15, duration_frames: 1, color: "Green", note: "Music duck -6 dB under ADR" },
        { name: "Peak Ceiling", frame: 260, duration_frames: 1, color: "Yellow", note: "Limiter -1.0 dBTP True Peak" }
      ]
    }
  },
  {
    id: "bm_08_reels_social_qa",
    name: "08_Social_Reels_ConformQA_9x16",
    category: "REELS 9:16 + QA",
    description: "Vertical 1080x1920 social delivery timeline with intentional conform gap + mixed FPS for Broadcast QA audit practice.",
    specs: "25p 9:16 3T 6C",
    recommendedTab: "qa",
    aspectPreset: "9:16",
    colorPreset: "noir_bw",
    nodeLabels: ["01 High Contrast B&W"],
    thumbnailUrl: makeTrainingThumbSvg({ bgA: "#1b1426", bgB: "#111622", accent: "#e64b38", tag: "REELS 9:16", kind: "reels" }),
    document: {
      name: "08_Social_Reels_ConformQA_9x16",
      source_format: "drt",
      fps: FPS_25,
      width: 1080,
      height: 1920,
      start_frame: 0,
      color_space_tags: ["Rec.709 / Vertical 9:16 Social Safe"],
      lut_refs: [],
      tracks: [
        {
          index: 1,
          kind: "video",
          name: "V1 Vertical Reels",
          clips: [
            { name: "REEL_01_Hook_Wide", track_index: 1, media_type: "video", start_frame: 0, duration_frames: 100, source_in_frame: 0, source_path: "media/reels/hook.mov", source_fps: FPS_25, enabled: true },
            { name: "REEL_02_Mixed24p_Flag", track_index: 1, media_type: "video", start_frame: 120, duration_frames: 130, source_in_frame: 0, source_path: "media/reels/broll_24p.mov", source_fps: FPS_24, enabled: true, transform: { zoom_pct: 124.0 } },
            { name: "REEL_03_Outro_CTA", track_index: 1, media_type: "video", start_frame: 250, duration_frames: 125, source_in_frame: 0, source_path: "media/reels/cta.mov", source_fps: FPS_25, enabled: true }
          ]
        },
        {
          index: 2,
          kind: "video",
          name: "V2 Dynamic Captions",
          clips: [
            { name: "SUB_Bold_Kinetic_SRT", track_index: 2, media_type: "video", start_frame: 0, duration_frames: 375, source_in_frame: 0, source_path: "gfx/captions.srt", source_fps: FPS_25, enabled: true }
          ]
        },
        {
          index: 1,
          kind: "audio",
          name: "A1 Reel Voice + Beat",
          clips: [
            { name: "VO_Hook_Punch", track_index: 1, media_type: "audio", start_frame: 0, duration_frames: 375, source_in_frame: 0, source_path: "audio/vo_hook.wav", enabled: true }
          ]
        }
      ],
      markers: [
        { name: "Conform Gap (20f)", frame: 100, duration_frames: 20, color: "Red", note: "20-frame black slug + 24p clip on 25p sequence" }
      ]
    }
  }
];

export function getDemoTrainingProject(id) {
  return DEMO_TRAINING_PROJECTS.find((p) => p.id === id) || DEMO_TRAINING_PROJECTS[0];
}
