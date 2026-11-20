import { state } from '../config/state.js';
import { openModal, closeModal } from './dom.js';
import { ENCOUNTER_OUTCOMES, isEncounterOutcome, matchesEncounter, completeEncounter } from '../pcr/outcomes.js';

let choosing = false;
const modalId = 'finish-attendance-modal';
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
        if (completeEncounter(type, expected)) closeModal(modalId);
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
