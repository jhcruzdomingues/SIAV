import { state } from '../config/state.js';
import { closeModal, openModal, showTransientAlert } from '../ui/dom.js';
import { matchesEncounter } from './outcomes.js';

let pending = null;
const modalId = 'vitals-modal';
const valid = () => !!pending && matchesEncounter(pending.expected) && state.roscAchieved && state.clinical?.status === 'rosc' && !state.encounterOutcome;

export function beginPostRceVitals(expected, onFinish) {
    if (!matchesEncounter(expected) || !state.roscAchieved || state.clinical?.status !== 'rosc' || state.encounterOutcome) return false;
    const same = pending && pending.expected.startTime === expected.startTime && pending.expected.episodeId === expected.episodeId;
    if (!same) {
        document.querySelectorAll('#vitals-modal input, #vitals-modal textarea').forEach(input => { input.value = ''; });
        document.querySelector('#vitals-modal .vitals-status')?.remove();
        const feedback = document.getElementById('vitals-form-feedback');
        if (feedback) { feedback.textContent = ''; feedback.hidden = true; }
    }
    pending = { expected: { ...expected }, onFinish };
    showVitalsModal();
    return true;
}

export function showVitalsModal() {
    if (!valid()) return false;
    openModal(modalId);
    setTimeout(() => { if (valid() && document.getElementById(modalId)?.classList.contains('show')) document.getElementById('vital-pa-sistolica')?.focus(); }, 15);
    return true;
}

export function closeVitalsModal() {
    closeModal(modalId);
    document.getElementById('finish-pcr-btn')?.focus();
}

function finishPostRce() {
    if (!valid()) return false;
    const finish = pending.onFinish;
    pending = null; // Consume this form before report callbacks or repeated taps.
    closeVitalsModal();
    return finish();
}

export function skipPostRceVitals() {
    if (!valid()) return;
    if (typeof window.addEvent === 'function') window.addEvent('PÓS-RCE: sinais vitais não informados.', 'normal');
    finishPostRce();
}

export function handleVitalsKey(event) {
    if (!document.getElementById(modalId)?.classList.contains('show')) return false;
    if (event.code === 'Escape') { event.preventDefault(); closeVitalsModal(); }
    if (event.code === 'Tab') {
        const fields = [...document.querySelectorAll('#vitals-modal button:not(:disabled), #vitals-modal input, #vitals-modal textarea')];
        const first = fields[0], last = fields[fields.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    return true; // No clinical shortcuts behind a post-RCE form.
}

function feedback(message) {
    const node = document.getElementById('vitals-form-feedback');
    if (node) { node.textContent = message; node.hidden = false; }
}

export function getVitalsStatus(paS, paD, fc) {
    const paMedia = (paS + 2 * paD) / 3;
    let status = 'stable';
    let message = 'Sinais Vitais Estáveis.';

    if (paS < 90 || paMedia < 65) {
        status = 'hypotension';
        message = 'HIPOTENSÃO CRÍTICA (PAM baixa) - Requer intervenção imediata!';
    } else if (paS < 100) {
        status = 'warning';
        message = 'Pressão Arterial em ALERTA.';
    }
    
    if (fc > 120) {
        if (status === 'stable') status = 'warning';
        message += ' Taquicardia.';
    } else if (fc < 50) {
        if (status === 'stable') status = 'warning';
        message += ' Bradicardia.';
    }
    
    return { status, message };
}

export function recordVitals() {
    if (!valid()) { feedback('Este formulário não pertence ao atendimento atual. Feche e retome o atendimento.'); return; }
    const values = {};
    for (const key of ['pa-sistolica', 'pa-diastolica', 'fc', 'fr', 'spo2', 'temp']) {
        const raw = document.getElementById(`vital-${key}`)?.value.trim() || '';
        values[key] = raw === '' ? null : Number(raw.replace(',', '.'));
        if (values[key] !== null && (!Number.isFinite(values[key]) || values[key] < 0)) {
            feedback('Informe medidas numéricas válidas ou deixe o campo vazio.'); return;
        }
    }
    const { 'pa-sistolica': paS, 'pa-diastolica': paD, fc, fr, spo2, temp } = values;
    if (paS !== null && (paS < 30 || paS > 300)) { feedback('PA sistólica: informe entre 30 e 300 mmHg.'); return; }
    if (paD !== null && (paD < 20 || paD > 200)) { feedback('PA diastólica: informe entre 20 e 200 mmHg.'); return; }
    if (fc !== null && fc > 300) { feedback('FC: informe entre 0 e 300 bpm.'); return; }
    if (spo2 !== null && spo2 > 100) { feedback('SpO₂: informe entre 0 e 100%.'); return; }
    if (Object.values(values).every(value => value === null)) { feedback('Informe ao menos uma medida ou finalize sem informar.'); return; }
    const notes = document.getElementById('vital-notes')?.value.replace(/[<>]/g, '').trim();
    const status = paS !== null && paD !== null && fc !== null ? getVitalsStatus(paS, paD, fc) : null;
    const parts = [];
    if (paS !== null || paD !== null) parts.push(`PA: ${paS ?? 'N/I'}x${paD ?? 'N/I'} mmHg`);
    if (fc !== null) parts.push(`FC: ${fc} bpm`);
    if (fr !== null) parts.push(`FR: ${fr} ipm`);
    if (spo2 !== null) parts.push(`SpO₂: ${spo2}%`);
    if (temp !== null) parts.push(`Temp: ${temp}°C`);
    if (notes) parts.push(`(Obs: ${notes})`);
    const hypoMsg = 'HIPOTENSÃO GRAVE detectada! Reavalie o paciente e trate a causa!';
    if (typeof window.addEvent === 'function') {
        if (status?.status === 'hypotension') window.addEvent(hypoMsg, 'critical');
        window.addEvent(`SINAIS VITAIS PÓS-RCE: ${parts.join('; ')}`, status?.status === 'hypotension' ? 'critical' : status?.status === 'warning' ? 'warning' : 'normal');
    }
    finishPostRce();
    // Display after administrative finish so the alert is not hidden behind the form.
    if (status?.status === 'hypotension') showTransientAlert(hypoMsg, 'danger', 5000);
}
