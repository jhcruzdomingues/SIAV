import { state } from '../config/state.js';

// Integrity threshold for observation callbacks, not a clinical timing rule.
export const OBSERVATION_GAP_MS = 2500;
const id = () => crypto.randomUUID();
const timing = () => state.resuscitationTiming;
const episode = () => timing()?.episodes.findLast(entry => entry.end === null);
const segment = () => timing()?.segments.findLast(entry => entry.end === null);

export function resetTiming(episodeId, now = Date.now()) {
    state.resuscitationTiming = { episodes: [], segments: [], lastObservedAt: now, incompleteReasons: [] };
    startTimingEpisode(episodeId, now);
}

export function startTimingEpisode(episodeId, now = Date.now()) {
    if (!timing() || episode()) return;
    timing().episodes.push({ id: episodeId, start: now, end: null });
    timing().lastObservedAt = now;
    setKind('pause', 'preparation', now);
}

function setKind(kind, reason, now) {
    const active = episode();
    if (!active) return;
    const previous = segment();
    if (previous?.kind === kind) return;
    if (previous) previous.end = now;
    timing().segments.push({ id: id(), episodeId: active.id, kind, start: now, end: null, reason });
}

export function observeTiming(now = Date.now()) {
    if (!episode()) return false;
    const data = timing();
    if (!Number.isFinite(now) || now < data.lastObservedAt) {
        if (!data.incompleteReasons.includes('clock')) data.incompleteReasons.push('clock');
        return false;
    }
    if (now - data.lastObservedAt > OBSERVATION_GAP_MS) {
        setKind('unknown', 'observation-gap', data.lastObservedAt);
        if (!data.incompleteReasons.includes('observation-gap')) data.incompleteReasons.push('observation-gap');
    }
    data.lastObservedAt = now;
    return segment()?.kind !== 'unknown';
}

export function recordTimingMode(kind, reason, now = Date.now()) {
    observeTiming(now);
    setKind(kind, reason, now);
}

export function suspendTiming(reason = 'hidden', now = Date.now()) {
    if (!episode()) return;
    observeTiming(now);
    setKind('unknown', reason, now);
    if (!timing().incompleteReasons.includes(reason)) timing().incompleteReasons.push(reason);
}

export function closeTimingEpisode(reason, now = Date.now()) {
    if (!episode()) return;
    observeTiming(now);
    const active = episode();
    active.end = now;
    active.endReason = reason;
    const current = segment();
    if (current) current.end = now;
    syncTimingTotals(now);
}

export function getTimingSummary(now = Date.now()) {
    if (episode()) observeTiming(now);
    const data = timing();
    const summary = { totalMs: 0, compressionMs: 0, pauseMs: 0, unknownMs: 0, valid: true, fct: null, segments: [] };
    if (!data?.episodes.length) return { ...summary, valid: false };
    summary.valid = !data.incompleteReasons.length;
    const episodeIds = new Set();
    let previousEnd = -Infinity;
    for (const active of data.episodes) {
        if (!active.id || episodeIds.has(active.id) || active.start < previousEnd) summary.valid = false;
        episodeIds.add(active.id);
        const end = active.end ?? now;
        if (!Number.isFinite(active.start) || !Number.isFinite(end) || end < active.start) { summary.valid = false; continue; }
        previousEnd = end;
        summary.totalMs += end - active.start;
        let cursor = active.start;
        for (const item of data.segments.filter(entry => entry.episodeId === active.id)) {
            const until = item.end ?? end;
            if (!Number.isFinite(item.start) || !Number.isFinite(until) || until < item.start || until > end || item.start < active.start) { summary.valid = false; continue; }
            if (item.start !== cursor) summary.valid = false;
            const duration = Math.max(0, until - item.start);
            if (item.kind === 'compressions') summary.compressionMs += duration;
            else if (item.kind === 'pause') summary.pauseMs += duration;
            else { summary.unknownMs += duration; summary.valid = false; }
            summary.segments.push({ ...item, end: until });
            cursor = until;
        }
        if (cursor !== end) summary.valid = false;
    }
    if (data.segments.some(item => !episodeIds.has(item.episodeId))) summary.valid = false;
    if (summary.compressionMs + summary.pauseMs + summary.unknownMs !== summary.totalMs) summary.valid = false;
    if (summary.valid && summary.totalMs > 0) summary.fct = summary.compressionMs / summary.totalMs * 100;
    return summary;
}

export function syncTimingTotals(now = Date.now()) {
    const summary = getTimingSummary(now);
    state.pcrSeconds = Math.floor(summary.totalMs / 1000);
    state.totalCompressionSeconds = Math.floor(summary.compressionMs / 1000);
    state.totalPauseSeconds = Math.floor(summary.pauseMs / 1000);
    return summary;
}
