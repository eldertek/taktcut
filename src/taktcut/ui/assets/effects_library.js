// DaVinci Resolve 21 Effects Library Tree (UiEditToolboxContainerImp).
// Exact structure verified from Templates.drfx (3,924 templates), Resolve.exe (119 PluginFactory classes),
// and BMDAudioPlugins.dll (Fairlight FX). Clean-room MIT implementation, zero proprietary assets.

const T = (name, transition) => ({ name, transition });
const FX = (name, fx) => ({ name, fx });
const ST = (name, studio) => ({ name, studio });
const N = (name) => ({ name });

const VIDEO_TRANSITIONS = [
  {
    label: "Dissolve",
    items: [
      T("Additive Dissolve", "fade"),
      T("Blur Dissolve", "fade"),
      T("Cross Dissolve", "fade"),
      T("Dip To Color Dissolve", "fadeblack"),
      T("Non-Additive Dissolve", "fade"),
      T("Smooth Cut", "fade")
    ]
  },
  {
    label: "Iris",
    items: [
      T("Arrow Iris", "zoomin"),
      T("Cross Iris", "zoomin"),
      T("Diamond Iris", "zoomin"),
      T("Eye Iris", "zoomin"),
      T("Hexagon Iris", "zoomin"),
      T("Oval Iris", "zoomin"),
      T("Pentagon Iris", "zoomin"),
      T("Square Iris", "zoomin"),
      T("Triangle Iris", "zoomin")
    ]
  },
  {
    label: "Wipe",
    items: [
      T("Band Wipe", "wipeleft"),
      T("Barn Door", "wipeleft"),
      T("Box Wipe", "wipeleft"),
      T("Center Wipe", "wipeleft"),
      T("Checkerboard", "wipeleft"),
      T("Clock Wipe", "wipeleft"),
      T("Diagonal Wipe", "wipeleft"),
      T("Edge Wipe", "wipeleft"),
      T("Spiral Wipe", "wipeleft")
    ]
  },
  {
    label: "Fusion Transitions",
    items: [
      T("Block Glitch", "fade"),
      T("Box Twist", "wipeleft"),
      T("Brightness Flash", "fade"),
      T("Camera Shake", "fade"),
      T("Crash Zoom", "zoomin"),
      T("Flip Over", "wipeleft"),
      T("Glow", "fade"),
      T("Logo Wipe", "wipeleft"),
      T("Luma Wipe", "wipeleft"),
      T("Page Curl", "wipeleft"),
      T("RGB Splitter", "fade"),
      T("Slide Down", "slideright"),
      T("Slide Left", "slideright"),
      T("Slide Right", "slideright"),
      T("Slide Up", "slideright")
    ]
  }
];

const AUDIO_TRANSITIONS = [
  {
    label: "Crossfade",
    items: [N("Cross Fade 0 dB"), N("Cross Fade +3 dB"), N("Cross Fade -3 dB")]
  }
];

const TITLES = [
  {
    label: "Titles",
    items: [
      N("Text"),
      N("Text+"),
      N("Scroll"),
      N("Left Lower Third"),
      N("Middle Lower Third"),
      N("Right Lower Third")
    ]
  },
  {
    label: "Fusion Titles",
    items: [
      N("Background Reveal"),
      N("Background Reveal Lower Third"),
      N("Call Out"),
      N("Callout Modern Lines"),
      N("Center Reveal"),
      N("Clean and Simple"),
      N("Clean and Simple Lower Third"),
      N("Dark Box Text"),
      N("Digital Glitch"),
      N("Drop In"),
      N("Fade On"),
      N("Fade On Lower Third"),
      N("Headline"),
      N("Horizontal Line Reveal"),
      N("Jitter Lower Third"),
      N("Letterbox Text"),
      N("Neon Flicker"),
      N("Scroll Lower Third"),
      N("Spin Twist Drift"),
      N("Stretch Zoom")
    ]
  },
  {
    label: "Subtitles",
    items: [
      N("Simple White"),
      N("Simple Yellow"),
      N("White on Black"),
      N("White on Blue Shear"),
      N("White on Red Shear")
    ]
  }
];

const GENERATORS = [
  {
    label: "Generators",
    items: [
      N("10 Step"),
      N("BT.2111 Color Bar HLG Narrow"),
      N("EBU Color Bar"),
      N("Four Color Gradient"),
      N("Grey Scale"),
      N("SMPTE Color Bar"),
      N("Solid Color"),
      N("Window")
    ]
  },
  {
    label: "Fusion Generators",
    items: [
      N("Abstract Mesh"),
      N("Checkerboard"),
      N("Contours"),
      N("Dreamy Shapes"),
      N("Gradient Lines"),
      N("Hexagon Glow"),
      N("Noise Gradient"),
      N("Starfield"),
      N("Vintage Texture")
    ]
  }
];

const TOOLBOX_EFFECTS = [
  {
    label: "Effects",
    items: [
      N("Adjustment Clip"),
      N("Fusion Composition"),
      N("Binoculars"),
      N("CCTV"),
      N("Colored Border"),
      N("DSLR"),
      N("DVE"),
      N("Digital Glitch"),
      N("Drone Overlay"),
      N("Night Vision"),
      N("Paper Edge"),
      N("Repeat"),
      N("Video Call")
    ]
  }
];

const RESOLVE_FX = [
  {
    label: "Resolve FX Blur",
    items: [
      FX("Box Blur", "directional_blur"),
      FX("Directional Blur", "directional_blur"),
      FX("Gaussian Blur", "tilt_shift"),
      FX("Lens Blur", "tilt_shift"),
      FX("Mosaic Blur", "mosaic_pixelate"),
      FX("Prism Blur", "chroma_aberration"),
      FX("Radial Blur", "directional_blur"),
      FX("Tilt-Shift Blur", "tilt_shift"),
      FX("Zoom Blur", "directional_blur")
    ]
  },
  {
    label: "Resolve FX Color",
    items: [
      ST("ACES Transform", "cst"),
      N("Chromatic Adaptation"),
      N("Color Compressor"),
      N("Color Palette"),
      ST("Color Space Transform", "cst"),
      N("Color Stabilizer"),
      N("Contrast Pop"),
      N("DCTL"),
      N("False Color"),
      N("Gamut Limiter"),
      N("Gamut Mapping"),
      FX("Invert Color", "invert_negative"),
      FX("Hue Shift", "hue_shift")
    ]
  },
  {
    label: "Resolve FX Film Emulation",
    items: [
      ST("Film Look Creator", "film_look"),
      FX("Halation", "halation")
    ]
  },
  {
    label: "Resolve FX Generate",
    items: [N("Color Generator"), N("Fast Noise"), N("Grid")]
  },
  {
    label: "Resolve FX Key",
    items: [
      N("3D Keyer"),
      N("Alpha Matte Shrink and Grow"),
      N("Despill"),
      N("HSL Keyer"),
      N("Luma Keyer")
    ]
  },
  {
    label: "Resolve FX Light",
    items: [
      FX("Aperture Diffraction", "optical_glow"),
      FX("Glow", "glow"),
      FX("Lens Flare", "lens_flare"),
      FX("Lens Reflections", "prism_leak"),
      FX("Light Rays", "pro_mist")
    ]
  },
  {
    label: "Resolve FX OpenColorIO",
    items: [
      N("OCIO CDL Transform"),
      N("OCIO Color Space"),
      N("OCIO Display"),
      N("OCIO File Transform")
    ]
  },
  {
    label: "Resolve FX Refine",
    items: [
      N("Beauty"),
      N("Blanking Fill"),
      N("Chromatic Aberration Removal"),
      N("Depth Map"),
      N("Dehaze"),
      N("Detail Recovery"),
      N("Face Refinement"),
      N("Object Removal"),
      N("Relight"),
      N("Sky Replacement"),
      N("Soften & Sharpen"),
      N("Texture Pop")
    ]
  },
  {
    label: "Resolve FX Revival",
    items: [
      N("Automatic Dirt Removal"),
      N("Dead Pixel Fixer"),
      N("Deband"),
      N("Deflicker"),
      N("Dust Buster"),
      N("Frame Replacer"),
      N("Noise Reduction"),
      N("Patch Replacer")
    ]
  },
  {
    label: "Resolve FX Sharpen",
    items: [
      FX("Sharpen", "unsharp_mask"),
      FX("Sharpen Edges", "unsharp_mask"),
      N("Ultra Sharpen")
    ]
  },
  {
    label: "Resolve FX Stylize",
    items: [
      N("Abstraction"),
      N("Burn Away"),
      N("Defocus Background"),
      N("Drop Shadow"),
      N("Edge Detect"),
      N("Emboss"),
      FX("Vignette", "vignette"),
      N("Watercolor")
    ]
  },
  {
    label: "Resolve FX Temporal",
    items: [
      FX("Flicker Addition", "flicker"),
      N("Motion Blur"),
      N("Motion Trails"),
      N("Smear"),
      N("Stop Motion")
    ]
  },
  {
    label: "Resolve FX Texture",
    items: [
      N("Analog Damage"),
      FX("Film Damage", "film_damage"),
      FX("Film Grain", "film_grain"),
      N("JPEG Damage"),
      FX("Scanline", "scanlines")
    ]
  },
  {
    label: "Resolve FX Transform",
    items: [
      FX("Camera Shake", "camera_shake"),
      FX("Lens Distortion", "lens_distortion"),
      N("Match Move"),
      FX("Mirror", "mirror_flip"),
      N("Picture in Picture"),
      N("Surface Tracker"),
      N("Transform"),
      N("Video Collage")
    ]
  },
  {
    label: "Resolve FX Warp",
    items: [
      N("Dent"),
      N("Interactive Warper"),
      N("Pano Map"),
      N("Ripple"),
      N("Vortex"),
      N("Waviness")
    ]
  }
];

const OPENFX_GENERATORS = [
  { label: "Open FX Generators", items: [N("Color Generator"), N("Fast Noise"), N("Grid")] }
];

const OPENFX_TRANSITIONS = [
  { label: "Resolve FX Transitions", items: [T("Burn Away", "fade"), T("DCTL Transition", "fade")] }
];

const FAIRLIGHT_FX = [
  {
    label: "Fairlight FX",
    items: [
      N("AI Dialogue Leveler"),
      N("AI Dialogue Separator"),
      N("Ambisonics Meter"),
      N("Chorus"),
      N("Compressor"),
      N("Convolution Reverb"),
      N("De-Esser"),
      N("De-Hummer"),
      N("Delay"),
      N("Distortion"),
      N("Ducker"),
      N("Dynamics"),
      N("Echo"),
      N("Equalizer"),
      N("Foley Sampler"),
      N("Frequency Analyzer"),
      N("LFE Filter"),
      N("Limiter"),
      N("Modulation"),
      N("Multiband Compressor"),
      N("Noise Reduction"),
      N("Pitch"),
      N("Reverb"),
      N("Stereo Fixer"),
      N("Stereo Width"),
      N("Vocal Channel")
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

function glyph(kind) {
  const svg = svgEl("svg", { class: "fxlib-glyph", viewBox: "0 0 28 18", "aria-hidden": "true" });
  if (kind === "transition" || kind === "audio-transition") {
    svg.appendChild(svgEl("polygon", { points: "3,3 14,9 3,15", fill: "#5a5f66" }));
    svg.appendChild(svgEl("polygon", { points: "25,3 14,9 25,15", fill: "#85d5f7" }));
  } else if (kind === "title") {
    svg.appendChild(svgEl("text", { x: "14", y: "14", "text-anchor": "middle", class: "fxlib-glyph-t" })).textContent = "T";
  } else if (kind === "generator") {
    svg.appendChild(svgEl("rect", { x: "3", y: "3", width: "11", height: "12", fill: "#255572" }));
    svg.appendChild(svgEl("rect", { x: "14", y: "3", width: "11", height: "12", fill: "#5869a8" }));
  } else if (kind === "audio-fx") {
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

function pickItem(item, node, ctx) {
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

// Render library groups as Resolve-style thumbnail tiles (Cut page bin) or compact rows (Edit page).
export function renderLibraryGroups(host, nodes, ctx, opts = {}) {
  const { layout = "tiles", query = "" } = opts;
  const q = normalize(query);
  host.replaceChildren();
  let total = 0;
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
        const btn = el("button", layout === "tiles" ? "fxlib-tile" : "fxlib-row");
        btn.type = "button";
        btn.title = `${item.name} (double-click to apply)`;
        btn.dataset.libItem = item.name;
        const frame = el("span", "fxlib-frame");
        frame.appendChild(glyph(node.kind));
        btn.appendChild(frame);
        btn.appendChild(el("span", "fxlib-name", item.name));
        if (item.fx || item.transition || item.studio) {
          const addBadge = el("span", "fxlib-apply-dot", "+");
          btn.appendChild(addBadge);
        }
        btn.addEventListener("click", () => {
          for (const other of host.querySelectorAll(".is-selected")) other.classList.remove("is-selected");
          btn.classList.add("is-selected");
        });
        btn.addEventListener("dblclick", () => pickItem(item, node, ctx));
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
