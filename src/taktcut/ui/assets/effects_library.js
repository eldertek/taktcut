// Resolve-structured Effects Library for taktcut (clean-room, names and taxonomy only, zero assets).
//
// Section tree mirrors the DaVinci Resolve 21 Effects Library:
//   Toolbox  > Video Transitions | Audio Transitions | Titles | Generators | Effects
//   OpenFX   > Filters (Resolve FX <category>) | Generators | Transitions
//   Audio FX > Fairlight FX | VST
// Item names, Resolve FX category labels and plugin identifiers were verified against the strings
// of the installed Resolve binary (Resolve FX Blur, Color, Film Emulation, Generate, Key, Light,
// OpenColorIO, Refine, Revival, Sharpen, Stylize, Temporal, Texture, Transform, Warp).
//
// `fx` binds an item to a taktcut FX engine node, `studio` to a taktcut studio dialog,
// `transition` to a taktcut clip transition preset. Items with no binding stay listed and report
// that the engine does not process them yet instead of pretending to.

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
      T("Center Wipe", "wipeleft"),
      T("Clock Wipe", "wipeleft"),
      T("Edge Wipe", "wipeleft"),
      T("Inset Wipe", "wipeleft"),
      T("Radial Wipe", "wipeleft"),
      T("Spiral Wipe", "wipeleft"),
      T("Venetian Blind Wipe", "wipeleft"),
      T("X Wipe", "wipeleft")
    ]
  },
  {
    label: "Fusion Transitions",
    items: [
      T("Logo Wipe", "wipeleft"),
      T("Luma Wipe", "wipeleft"),
      T("Slice Push", "slideright"),
      T("Slide Down", "slideright"),
      T("Slide Left", "slideright"),
      T("Slide Right", "slideright"),
      T("Slide Up", "slideright"),
      T("Tile Wipe", "wipeleft")
    ]
  }
];

const AUDIO_TRANSITIONS = [
  {
    label: "Crossfade",
    items: [N("Cross Fade +3 dB"), N("Cross Fade 0 dB"), N("Cross Fade -3 dB")]
  }
];

const TITLES = [
  {
    label: "Titles",
    items: [
      N("Left Lower Third"),
      N("Middle Lower Third"),
      N("Right Lower Third"),
      N("Scroll"),
      N("Text"),
      N("Text+")
    ]
  },
  {
    label: "Fusion Titles",
    items: [
      N("3D Lower 3rd Plane Behind Slide In"),
      N("3D Lower 3rd Plane Slide In"),
      N("Background Reveal"),
      N("Background Reveal Lower Third"),
      N("Fade On Lower Third"),
      N("Lower 3rd Corporate Corners 1 Line"),
      N("Lower 3rd Corporate Corners 2 Lines"),
      N("Lower 3rd Draw On Two Line"),
      N("Lower 3rd Flipping 2Line"),
      N("Lower 3rd Multiplane Background"),
      N("Lower 3rd Plane Behind Slide In"),
      N("Lower 3rd Plane Slide In"),
      N("Lower 3rd Planes Rotating In"),
      N("Lower 3rd Rotating Plane 2 Line"),
      N("Lower 3rd Shelf"),
      N("Lower 3rd Simple Box 1 Line"),
      N("Lower 3rd Simple Box 2 Line"),
      N("Lower 3rd Simple Box Thin 1 Line"),
      N("Lower 3rd Simple Underline"),
      N("Lower 3rd Simple Vertical 1 Line"),
      N("Lower 3rd Simple Vertical 2 Lines"),
      N("Lower 3rd Sliding Block"),
      N("Lower 3rd Text In Tube"),
      N("Outline Offset"),
      N("Scroll Lower Third"),
      N("Slide In and Scroll Lower Third"),
      N("Spin Twist Drift"),
      N("Stretch Zoom"),
      N("Superhero Movie"),
      N("Title Dramatic Mood")
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
      N("Solid Color"),
      N("Window")
    ]
  },
  { label: "Fusion Generators", items: [N("Checkerboard"), N("Noise Gradient")] }
];

const TOOLBOX_EFFECTS = [
  {
    label: "Effects",
    items: [N("Adjustment Clip"), N("Fusion Composition"), N("Noise Distortion")]
  }
];

// Resolve FX (Open FX > Filters), grouped by the category labels found in the Resolve binary.
const RESOLVE_FX = [
  {
    label: "Resolve FX Blur",
    items: [
      N("Box Blur"),
      FX("Directional Blur", "directional_blur"),
      N("Gaussian Blur"),
      N("Lens Blur"),
      FX("Mosaic Blur", "mosaic_pixelate"),
      N("Prism Blur"),
      N("Radial Blur"),
      FX("Tilt-Shift Blur", "tilt_shift"),
      N("Zoom Blur")
    ]
  },
  {
    label: "Resolve FX Color",
    items: [
      N("ACES Transform"),
      N("Chromatic Adaptation"),
      N("Color Compressor"),
      N("Color Space Transform"),
      N("Color Stabilizer"),
      N("Contrast Pop"),
      N("DCTL"),
      N("False Color"),
      N("Gamut Limiter"),
      N("Gamut Mapping"),
      FX("Invert Color", "invert_negative")
    ]
  },
  {
    label: "Resolve FX Film Emulation",
    items: [ST("Film Look Creator", "film_look"), FX("Halation", "halation")]
  },
  {
    label: "Resolve FX Generate",
    items: [N("Color Generator"), N("Color Palette"), N("Fast Noise"), N("Grid")]
  },
  {
    label: "Resolve FX Key",
    items: [N("3D Keyer"), N("Alpha Matte Shrink and Grow"), N("HSL Keyer"), N("Luma Keyer")]
  },
  {
    label: "Resolve FX Light",
    items: [
      N("Aperture Diffraction"),
      FX("Glow", "glow"),
      FX("Lens Flare", "lens_flare"),
      N("Lens Reflections"),
      N("Light Rays")
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
      N("Deband"),
      N("Dehaze"),
      N("Detail Recovery"),
      N("Face Refinement"),
      N("Noise Reduction"),
      N("Texture Pop")
    ]
  },
  {
    label: "Resolve FX Revival",
    items: [
      N("Dead Pixel Fixer"),
      N("Deflicker"),
      N("Dust Buster"),
      N("Frame Replacer"),
      N("Object Removal"),
      N("Patch Replacer")
    ]
  },
  {
    label: "Resolve FX Sharpen",
    items: [FX("Sharpen", "unsharp_mask"), N("Sharpen Edges"), N("Soften & Sharpen")]
  },
  {
    label: "Resolve FX Stylize",
    items: [
      N("Abstraction"),
      N("Drop Shadow"),
      N("Edge Detect"),
      N("Emboss"),
      N("Pencil Sketch"),
      FX("Vignette", "vignette"),
      N("Video Collage"),
      N("Watercolor")
    ]
  },
  {
    label: "Resolve FX Temporal",
    items: [FX("Flicker Addition", "flicker"), N("Motion Blur"), N("Motion Trails"), N("Smear"), N("Stop Motion")]
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
      FX("Mirror", "mirror_flip"),
      N("Transform")
    ]
  },
  {
    label: "Resolve FX Warp",
    items: [N("Dent"), N("Ripple"), N("Vortex"), N("Warper"), N("Waviness")]
  }
];

const OPENFX_GENERATORS = [
  { label: "Open FX Generators", items: [N("Color Generator")] }
];

const FAIRLIGHT_FX = [
  {
    label: "Fairlight FX",
    items: [
      N("Chorus"),
      N("De-Esser"),
      N("Delay"),
      N("Dialogue Leveler"),
      N("Distortion"),
      N("Echo"),
      N("Flanger"),
      N("Limiter"),
      N("Multiband Compressor"),
      N("Noise Reduction"),
      N("Pitch"),
      N("Reverb"),
      N("Stereo Fixer"),
      N("Vocal Channel"),
      N("Voice Isolation")
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
      { id: "effects", label: "Effects", groups: TOOLBOX_EFFECTS, kind: "effect" }
    ]
  },
  {
    id: "openfx",
    label: "OpenFX",
    children: [
      { id: "filters", label: "Filters", groups: RESOLVE_FX, kind: "filter" },
      { id: "ofx-generators", label: "Generators", groups: OPENFX_GENERATORS, kind: "generator" },
      { id: "ofx-transitions", label: "Transitions", groups: [], kind: "transition" }
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
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function glyph(kind) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 32 20");
  svg.setAttribute("class", "fxlib-glyph");
  svg.setAttribute("aria-hidden", "true");
  const add = (tag, attrs) => {
    const n = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    svg.appendChild(n);
  };
  const stroke = { fill: "none", stroke: "currentColor", "stroke-width": 1.2 };
  if (kind === "transition" || kind === "audio-transition") {
    add("rect", { x: 3, y: 4, width: 15, height: 12, rx: 1, ...stroke });
    add("rect", { x: 14, y: 4, width: 15, height: 12, rx: 1, ...stroke, opacity: 0.6 });
  } else if (kind === "title") {
    add("rect", { x: 3, y: 3, width: 26, height: 14, rx: 1, ...stroke });
    add("path", { d: "M10 8h12M16 8v6", ...stroke });
  } else if (kind === "generator") {
    add("rect", { x: 3, y: 3, width: 26, height: 14, rx: 1, ...stroke });
    add("path", { d: "M9 3v14M15 3v14M21 3v14", ...stroke, opacity: 0.55 });
  } else if (kind === "audio-fx") {
    add("path", { d: "M3 10h3l2-6 3 12 3-9 2 5 2-3h8", ...stroke });
  } else {
    add("circle", { cx: 16, cy: 10, r: 5.5, ...stroke });
    add("path", { d: "M16 2v3M16 15v3M6 10h3M23 10h3", ...stroke, opacity: 0.6 });
  }
  return svg;
}

function normalize(q) {
  return String(q || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function countLibraryItems(node) {
  return node.groups.reduce((n, g) => n + g.items.length, 0);
}

function pickItem(item, node, ctx) {
  const { showBanner, applyTransition, addFxNode, openStudio } = ctx;
  if (item.transition && typeof applyTransition === "function") {
    applyTransition(item);
    return;
  }
  if (item.fx && typeof addFxNode === "function") {
    addFxNode(item.fx);
    showBanner(`${item.name} added to the FX stack`, "success");
    return;
  }
  if (item.studio && typeof openStudio === "function") {
    openStudio(item.studio);
    return;
  }
  showBanner(`${item.name} (${node.label}) is listed from the Resolve library, no taktcut engine processes it yet.`, "info");
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
      head.appendChild(el("span", "fxlib-group-count mono", String(items.length)));
      section.appendChild(head);
      const body = el("div", layout === "tiles" ? "fxlib-tiles" : "fxlib-rows");
      for (const item of items) {
        const btn = el("button", layout === "tiles" ? "fxlib-tile" : "fxlib-row");
        btn.type = "button";
        btn.title = item.name;
        btn.dataset.libItem = item.name;
        const frame = el("span", "fxlib-frame");
        frame.appendChild(glyph(node.kind));
        btn.appendChild(frame);
        btn.appendChild(el("span", "fxlib-name", item.name));
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
    host.appendChild(el("div", "fxlib-empty mono", q ? "No match" : "No items"));
  }
  return total;
}

// Edit page "Effects" panel: Search field, section tree (Toolbox / OpenFX / Audio FX) and item list.
export function mountEditEffectsLibrary(root, ctx) {
  if (!root) return;
  root.replaceChildren();
  const state = { nodeId: "video-transitions", query: "", collapsed: new Set() };

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
      ? EFFECTS_LIBRARY_TREE.flatMap((r) => r.children)
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
