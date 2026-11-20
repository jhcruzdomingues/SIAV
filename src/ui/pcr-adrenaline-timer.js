import { formatTime } from '../utils/formatters.js';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// This is elapsed time since a documented fact, never a dosing countdown or
// eligibility evaluator. No scheduler, administration or clinical state is created.
export function getAdrenalineClock(snapshot, now = Date.now()) {
    const empty = (status, caption) => ({ status, caption, value: '--:--' });
    if (snapshot.roscAchieved || snapshot.clinical?.status === 'rosc') return empty('rosc', 'ROSC');
    if (!snapshot.pcrActive || snapshot.clinical?.status !== 'arrest') return empty('inactive', 'inativa');
    const { clinical, medications } = snapshot;
    if (!Array.isArray(medications) || clinical.historyIncomplete || !clinical.episodeId
        || medications.some(entry => !entry || typeof entry.name !== 'string')) return empty('review', 'revisar registro');
    const records = medications.filter(entry => entry.medicationId === 'adrenalina' || normalize(entry.name).includes('adrenalina'));
    if (!records.length) return empty('empty', 'sem registro');
    if (!Number.isFinite(now) || records.some(entry => !entry.id || !Number.isFinite(entry.timestamp)
        || entry.timestamp > now || !Number.isFinite(entry.recordedAt) || entry.recordedAt > now
        || entry.timestamp > entry.recordedAt || entry.episodeId !== clinical.episodeId
        || entry.requiresReview !== false || entry.isRetrospective !== false
        || !Number.isFinite(entry.amount) || entry.amount <= 0 || !entry.unit || !entry.route
        || Number.isFinite(clinical.startedAt) && entry.timestamp < clinical.startedAt)) return empty('review', 'revisar registro');
    const lastEffectiveTime = Math.max(...records.map(entry => entry.timestamp));
    return { status: 'running', caption: 'desde a dose', value: formatTime(Math.floor((now - lastEffectiveTime) / 1000)) };
}

export function updateAdrenalineTimerDisplay(snapshot, now = Date.now()) {
    const clock = getAdrenalineClock(snapshot, now);
    const setText = (id, text) => {
        const element = document.getElementById(id);
        if (element && element.textContent !== text) element.textContent = text;
    };
    setText('ac-drug-timer-label', 'ADRENALINA');
    setText('ac-drug-countdown', clock.value);
    setText('ac-drug-timer-context', clock.caption);
    const box = document.getElementById('ac-drug-timer-container');
    if (box) {
        box.dataset.clockState = clock.status;
        box.setAttribute('aria-label', `Adrenalina: ${clock.value}, ${clock.caption}`);
    }
}
