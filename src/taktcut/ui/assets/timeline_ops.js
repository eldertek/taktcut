export const SNAP_THRESHOLD_PX = 10;
export const AUDIO_GAIN_DB_MIN = -24;
export const AUDIO_GAIN_DB_MAX = 12;
export const AUDIO_FADE_S_MIN = 0;
export const AUDIO_FADE_S_MAX = 5;

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

export function collectSnapTargets(doc, opts = {}) {
  if (!doc) return [];
  const excludeClip = opts.excludeClip || null;
  const includePlayhead = Boolean(opts.includePlayhead);
  const playheadFrame = opts.playheadFrame;

  const byFrame = new Map();
  const priority = { playhead: 4, marker: 3, clip_edge: 2, timeline_start: 1 };

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
  const leftDur = cut - clip.start_frame;
  const rightDur = origEnd - cut;
  const srcDelta = computeSourceFrameDelta(leftDur, clip.source_fps, nextDoc.fps);
  const fpsRate = nextDoc.fps ? Math.max(1, nextDoc.fps.num / Math.max(1, nextDoc.fps.den)) : 25;
  const audioNorm = normalizeClipAudio(clip);

  const leftClip = {
    ...clip,
    duration_frames: leftDur,
    audio_gain_db: audioNorm.gainDb,
    fade_in_s: Number(Math.min(audioNorm.fadeInS, leftDur / fpsRate).toFixed(2)),
    fade_out_s: 0
  };
  const rightClip = {
    ...clip,
    start_frame: cut,
    duration_frames: rightDur,
    source_in_frame: Math.max(0, (clip.source_in_frame || 0) + srcDelta),
    audio_gain_db: audioNorm.gainDb,
    fade_in_s: 0,
    fade_out_s: Number(Math.min(audioNorm.fadeOutS, rightDur / fpsRate).toFixed(2))
  };

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
        const leftDur = cut - clip.start_frame;
        const rightDur = endF - cut;
        const srcDelta = computeSourceFrameDelta(leftDur, clip.source_fps, nextDoc.fps);
        const audioNorm = normalizeClipAudio(clip);
        const leftClip = {
          ...clip,
          duration_frames: leftDur,
          audio_gain_db: audioNorm.gainDb,
          fade_in_s: Number(Math.min(audioNorm.fadeInS, leftDur / fpsRate).toFixed(2)),
          fade_out_s: 0
        };
        const rightClip = {
          ...clip,
          start_frame: cut,
          duration_frames: rightDur,
          source_in_frame: Math.max(0, (clip.source_in_frame || 0) + srcDelta),
          audio_gain_db: audioNorm.gainDb,
          fade_in_s: 0,
          fade_out_s: Number(Math.min(audioNorm.fadeOutS, rightDur / fpsRate).toFixed(2))
        };
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
