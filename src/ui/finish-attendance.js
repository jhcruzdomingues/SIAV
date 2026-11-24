import { state } from '../config/state.js';
import { openModal, closeModal, showScreen } from './dom.js';
import { ENCOUNTER_OUTCOMES, isEncounterOutcome, matchesEncounter, completeEncounter } from '../pcr/outcomes.js';
import { recordROSC } from '../pcr/rhythm.js';
import { finishPCR } from '../pcr/core.js';
import { beginPostRceVitals } from '../pcr/vitals.js';

let choosing = false;
let pendingRce = null;
const modalId = 'finish-attendance-modal';

function postRce(expected, confirmedAt) {
    if (!matchesEncounter(expected) || state.encounterOutcome) return false;
    if (!state.roscAchieved && !recordROSC()) return false;
    if (state.clinical?.status !== 'rosc') return false;
    const same = pendingRce?.expected.startTime === expected.startTime && pendingRce?.expected.episodeId === expected.episodeId;
    if (!same) pendingRce = { expected: { ...expected }, confirmedAt };
    const originalTime = pendingRce.confirmedAt;
    closeModal(modalId);
    showScreen('pcr');
    return beginPostRceVitals(expected, () => completeEncounter('rosc', expected, originalTime));
}

// The existing rhythm/perfusion flow confirms RCE and calls window.finishPCR.
// Route that UI entry through the same post-RCE form, without a second confirmation.
export function finishPCRWithPostRceVitals() {
    if (state.pcrActive && state.roscAchieved && state.clinical?.status === 'rosc') {
        const expected = { startTime: state.pcrStartTime, episodeId: state.clinical.episodeId };
        return postRce(expected, Date.now());
    }
    return finishPCR();
}
export function closeFinishAttendance() {
    closeModal(modalId);
    document.getElementById('finish-pcr-btn')?.focus();
}
export function showFinishAttendance() {
    const modal = document.getElementById(modalId);
    if (!modal || !state.pcrActive || state.encounterOutcome) return;
    modal.dataset.encounterStart = String(state.pcrStartTime);
    modal.dataset.episodeId = state.clinical?.episodeId || '';
    openModal(modalId);
    setTimeout(() => { if (modal.classList.contains('show')) document.getElementById('finish-attendance-close')?.focus(); }, 15);
}

export function chooseFinishOutcome(type) {
    const modal = document.getElementById(modalId);
    const expected = { startTime: Number(modal?.dataset.encounterStart), episodeId: modal?.dataset.episodeId };
    if (choosing || !modal?.classList.contains('show') || !isEncounterOutcome(type) || !matchesEncounter(expected)) return;
    choosing = true;
    try {
        if (!confirm(ENCOUNTER_OUTCOMES[type].confirm)) return;
        if (type === 'rosc') postRce(expected, Date.now());
        else if (completeEncounter(type, expected)) closeModal(modalId);
    } finally {
        choosing = false;
        if (!state.pcrActive) closeModal(modalId);
    }
}

export function handleFinishAttendanceKey(event) {
    const modal = document.getElementById(modalId);
    if (!modal?.classList.contains('show')) return false;
    if (event.code === 'Escape') { event.preventDefault(); closeFinishAttendance(); }
    if (event.code === 'Tab') {
        const buttons = [...modal.querySelectorAll('button:not(:disabled)')];
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    return true;
}
