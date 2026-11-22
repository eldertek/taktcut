import { applyAscCdlRgb } from "./canvas.js";

function validateTimelineClient(doc) {
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
        clips: [
          { name: "A001_Opening_Wide", track_index: 1, media_type: "video", start_frame: 0, duration_frames: 125, source_in_frame: 24, source_path: "media/A001_Opening_Wide.mov", source_fps: fps25, enabled: true },
          { name: "A002_Studio_Detail", track_index: 1, media_type: "video", start_frame: 125, duration_frames: 100, source_in_frame: 10, source_path: "media/A002_Studio_Detail.mov", source_fps: fps25, enabled: true },
          { name: "A003_Talent_Close", track_index: 1, media_type: "video", start_frame: 225, duration_frames: 150, source_in_frame: 48, source_path: "media/A003_Talent_Close.mov", source_fps: fps25, enabled: true },
          { name: "A004_End_Packshot", track_index: 1, media_type: "video", start_frame: 375, duration_frames: 125, source_in_frame: 0, source_path: "media/A004_End_Packshot.mov", source_fps: fps25, enabled: true }
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
        clips: [
          { name: "VO_Intro_Clean", track_index: 1, media_type: "audio", start_frame: 0, duration_frames: 125, source_in_frame: 0, source_path: "audio/vo_intro.wav", enabled: true },
          { name: "VO_Feature_Main", track_index: 1, media_type: "audio", start_frame: 125, duration_frames: 250, source_in_frame: 0, source_path: "audio/vo_feature.wav", enabled: true },
          { name: "VO_Tagline_End", track_index: 1, media_type: "audio", start_frame: 375, duration_frames: 125, source_in_frame: 0, source_path: "audio/vo_tagline.wav", enabled: true }
        ]
      },
      {
        index: 2,
        kind: "audio",
        name: "A2 Music Stem",
        clips: [
          { name: "MX_Bed_Full_20s", track_index: 2, media_type: "audio", start_frame: 0, duration_frames: 500, source_in_frame: 0, source_path: "audio/mx_bed_20s.wav", enabled: true }
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

function bakeCubeTextClient(cdl, size, title) {
  if (size < 2 || size > 65) throw new Error("3D LUT size must be between 2 and 65");
  for (const ch of cdl.power) {
    if (ch <= 0) throw new Error("ASC CDL power channels must be strictly positive");
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
        const [ro, go, bo] = applyAscCdlRgb(rIn, gIn, bIn, cdl);
        lines.push(`${ro.toFixed(6)} ${go.toFixed(6)} ${bo.toFixed(6)}`);
      }
    }
  }
  return lines.join("\n") + "\n";
}

function compileFxClient(nodes, opts = {}) {
  const active = (nodes || []).filter((n) => n && n.enabled !== false);
  if (active.length === 0) {
    return {
      filtergraph: "",
      ffmpeg_vf_args: [],
      active_effects: [],
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
  const needsRgb = active.some((n) => ["glow", "lens_flare", "chroma_aberration"].includes(n.effect));
  const segs = [];
  if (needsRgb) segs.push("format=rgb24");
  const weights = { glow: 1.45, shake: 0.7, flicker: 0.25, lens_flare: 1.25, film_damage: 1.1, chroma_aberration: 0.65 };
  let totalWeight = 0;
  active.forEach((n, idx) => {
    const p = n.params || {};
    totalWeight += weights[n.effect] || 0.8;
    if (n.effect === "glow") {
      const thr = Math.round(Number(p.threshold ?? 0.45) * 255);
      const op = Math.min(1, Math.max(0, Number(p.brightness ?? 0.85) / 1.5)).toFixed(4);
      segs.push(`split[glow${idx}_base][glow${idx}_src];[glow${idx}_src]lutrgb=r='if(gte(val,${thr}),min(255,val-${thr}),0)',gblur=sigma=${Number(p.width ?? 18).toFixed(2)}:steps=2[glow${idx}_blur];[glow${idx}_base][glow${idx}_blur]blend=all_mode=screen:all_opacity=${op}`);
    } else if (n.effect === "shake") {
      const amp = Math.round(Number(p.amplitude ?? 14));
      segs.push(amp > 0 ? `pad=iw+${2 * amp}:ih+${2 * amp}:${amp}:${amp}:color=black,crop=iw-${2 * amp}:ih-${2 * amp}:x='${amp}+${amp}*sin(t*${(2 * Math.PI * Number(p.frequency ?? 6)).toFixed(2)})':y='${amp}+${amp}*cos(t*${(2.74 * Math.PI * Number(p.frequency ?? 6)).toFixed(2)})'` : "null");
    } else if (n.effect === "flicker") {
      segs.push(`eq=brightness='${Number(p.amplitude ?? 0.18).toFixed(4)}*sin(t*${(2 * Math.PI * Number(p.frequency ?? 8)).toFixed(2)})':eval=frame`);
    } else if (n.effect === "lens_flare") {
      const op = Math.min(1, Number(p.brightness ?? 0.95) * 0.65).toFixed(4);
      segs.push(`split[lf${idx}_base][lf${idx}_tmp];[lf${idx}_tmp]drawbox=x=0:y=0:w=iw:h=ih:color=black@1:t=fill,gblur=sigma=16:steps=2[lf${idx}_flare];[lf${idx}_base][lf${idx}_flare]blend=all_mode=screen:all_opacity=${op}`);
    } else if (n.effect === "film_damage") {
      const mix = Number(p.mix ?? 0.75);
      segs.push(`noise=alls=${(Number(p.grain ?? 28) * mix * 0.65).toFixed(2)}:allf=t+u,vignette=angle=${(0.15 + Number(p.vignette ?? 0.55) * mix * 0.72).toFixed(3)},eq=brightness='${(0.035 * mix).toFixed(4)}*sin(t*19.3)':eval=frame`);
    } else if (n.effect === "chroma_aberration") {
      const rad = (Number(p.angle ?? 15) * Math.PI) / 180;
      const rh = Math.round(Number(p.spread ?? 8) * Math.cos(rad));
      const rv = Math.round(Number(p.spread ?? 8) * Math.sin(rad));
      segs.push(`rgbashift=rh=${rh}:rv=${rv}:bh=${-rh}:bv=${-rv}:edge=smear`);
    }
  });
  if (needsRgb) segs.push(`format=${pixFmt}`);
  const fg = segs.join(",");
  const est = Number(Math.max(0.05, dur * (0.12 + totalWeight * 0.14) * (opts.use_gpu ? 0.38 : 1)).toFixed(2));
  return {
    filtergraph: fg,
    ffmpeg_vf_args: ["-vf", fg],
    active_effects: active.map((n) => n.effect),
    bypassed_count: (nodes || []).length - active.length,
    normalized_nodes: nodes || [],
    estimated_render_seconds: est,
    realtime_factor: Number((dur / est).toFixed(2)),
    complexity_tier: totalWeight <= 1.2 ? "light" : totalWeight <= 2.5 ? "medium" : "heavy",
    warnings: []
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
      version: "0.1.0",
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
    async buildOrExecuteRender(body) {
      if (resolvedMode === "static-demo") {
        if (body.execute) {
          throw new Error("FFmpeg execution requires running `taktcut ui` locally on your machine.");
        }
        const fpsParts = String(body.fps || "25").split("/");
        const fpsNum = Number.parseInt(fpsParts[0], 10) || 25;
        const fpsDen = Number.parseInt(fpsParts[1] || "1", 10) || 1;
        const isProres = body.profile === "prores_hq";
        const encoder = isProres ? "prores_ks" : body.profile === "master_hevc" ? "libx265" : "libx264";
        const pixFmt = isProres ? "yuv422p10le" : "yuv420p";
        const gop = Math.max(2, Math.round((2 * fpsNum) / fpsDen));
        const vfParts = [];
        if (Array.isArray(body.fx_stack) && body.fx_stack.length > 0) {
          const compiledFx = compileFxClient(body.fx_stack, { pix_fmt: pixFmt, use_gpu: Boolean(body.prefer_hw) });
          if (compiledFx.filtergraph) vfParts.push(compiledFx.filtergraph);
        }
        if (body.lut_path || body.cdl) {
          vfParts.push(`lut3d=file='${body.lut_path || "studio_grade.cube"}':interp=tetrahedral,format=${pixFmt}`);
        }
        const vf = vfParts.length > 0 ? vfParts.join(",") : null;
        const af = body.target_lufs !== null && body.target_lufs !== undefined ? `loudnorm=I=${Number(body.target_lufs).toFixed(1)}:TP=-1.0:LRA=11.0` : null;
        const argv = ["ffmpeg", "-hide_banner", "-y", "-i", body.input_path, "-fps_mode", "cfr", "-r", body.fps || "25", "-c:v", encoder, "-pix_fmt", pixFmt, "-g", String(gop)];
        if (vf) argv.push("-vf", vf);
        if (af) argv.push("-af", af);
        if (!isProres) argv.push("-movflags", "+faststart");
        argv.push(body.output_path);
        return {
          plan: {
            input_path: body.input_path,
            output_path: body.output_path,
            profile: body.profile,
            encoder,
            fps: { num: fpsNum, den: fpsDen },
            gop_frames: gop,
            pix_fmt: pixFmt,
            faststart: !isProres,
            target_lufs: body.target_lufs,
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
          current_version: "0.1.0",
          latest_version: "0.1.0",
          update_available: false,
          can_apply_ota: false,
          error: null
        };
      }
      return requestJson("/api/update/check");
    },
    async getFxPresets() {
      if (resolvedMode === "static-demo") {
        return { presets: [], specs: {} };
      }
      return requestJson("/api/fx/presets");
    },
    async compileFx(payload) {
      if (resolvedMode === "static-demo") {
        return compileFxClient(payload.nodes || [], payload);
      }
      return requestJson("/api/fx/compile", { method: "POST", body: payload });
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
    }
  };
}
