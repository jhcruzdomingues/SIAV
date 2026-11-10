import { state, intervals } from '../config/state.js';
import { closeModal, openModal, showTransientAlert } from '../ui/dom.js';
import { addMedication } from './events.js';
import { getAntiarrhythmicHistory, evaluateMedicationGuidance, getProtocolNextStep } from '../protocols/medical.js';
import { getClinicalSnapshot, isClinicalArrestActive, newOperationId } from './clinical.js';

const medNames = { adrenalina: 'Adrenalina', amiodarona: 'Amiodarona', lidocaina: 'Lidocaína', atropina: 'Atropina', bicarbonato: 'Bicarbonato de Sódio', sulfato: 'Sulfato de Magnésio' };
const formOperation = () => document.getElementById('med-modal')?.dataset.operationId;
const clearOperation = () => {
    const form = document.getElementById('med-modal');
    if (form) delete form.dataset.operationId;
};

export function cancelMedicationRecord() {
    clearOperation();
    closeModal('med-modal');
}

export function showMedModal() {
    const form = document.getElementById('med-modal');
    if (!form) return;
    form.dataset.operationId = newOperationId();
    for (const id of ['medication-dose', 'medication-select', 'medication-effective-at']) {
        const input = document.getElementById(id);
        if (input) input.value = '';
    }
    const confirmed = document.getElementById('medication-confirmed');
    if (confirmed) confirmed.checked = false;
    const timing = document.getElementById('medication-timing');
    if (timing) timing.value = 'realtime';
    const unit = document.getElementById('medication-unit');
    if (unit) unit.value = 'mg';
    const preview = document.getElementById('med-preview-panel');
    if (preview) preview.style.display = 'none';
    const button = document.getElementById('record-med-btn');
    if (button) button.disabled = true;
    document.querySelectorAll('.med-btn-pro').forEach(btn => btn.classList.remove('selected'));
    openModal('med-modal');
}

export function updateMedicationDose() {
    const id = document.getElementById('medication-select')?.value;
    const entry = evaluateMedicationGuidance(getClinicalSnapshot())[id];
    const retrospective = document.getElementById('medication-timing')?.value === 'retrospective';
    const route = document.querySelector('input[name="administration-route"]:checked')?.value;
    const text = retrospective ? 'Registro retrospectivo: informar o fato ocorrido; sem recomendação de nova dose.'
        : route && !['EV', 'IO'].includes(route) ? 'Via fora do algoritmo IV/IO. Apenas documentar o fato e reavaliar; sem recomendação por esta via.'
            : entry?.status === 'due' ? `Orientação do passo atual: ${entry.dose}. ${entry.reason}`
                : entry?.reason || 'Sem recomendação automática para este medicamento; documentar apenas o que foi efetivamente administrado.';
    const preview = document.getElementById('med-preview-value');
    if (preview) preview.textContent = text;
    const name = document.getElementById('med-preview-name');
    if (name) name.textContent = medNames[id] || '';
    const panel = document.getElementById('med-preview-panel');
    if (panel) panel.style.display = id ? 'block' : 'none';
    const button = document.getElementById('record-med-btn');
    if (button) {
        button.disabled = !id || !formOperation();
        const label = button.querySelector('.sub-text');
        if (label) label.textContent = 'Confirmar quantidade, via e horário efetivos';
    }
}

export function recordMedication() {
    const operationId = formOperation();
    if (!operationId) return;
    try {
        const id = document.getElementById('medication-select')?.value;
        const raw = document.getElementById('medication-dose')?.value.trim();
        const amount = Number(raw);
        const unit = document.getElementById('medication-unit')?.value;
        const route = document.querySelector('input[name="administration-route"]:checked')?.value;
        const isRetrospective = document.getElementById('medication-timing')?.value === 'retrospective';
        const timeValue = document.getElementById('medication-effective-at')?.value;
        const recordedAt = Date.now();
        const timestamp = isRetrospective ? (timeValue ? new Date(timeValue).getTime() : NaN) : recordedAt;
        if (!medNames[id] || !raw || !Number.isFinite(amount) || amount <= 0) throw new Error('Informe a quantidade exata efetivamente administrada.');
        if (!document.getElementById('medication-confirmed')?.checked) throw new Error('Confirme os dados efetivamente administrados.');
        if (!Number.isFinite(timestamp) || timestamp > recordedAt) throw new Error('Informe um horário efetivo válido, sem data futura.');
        const snapshot = getClinicalSnapshot();
        const guidance = evaluateMedicationGuidance(snapshot, recordedAt)[id];
        const history = getAntiarrhythmicHistory(state.medications);
        const count = history[id]?.length || 0;
        const weight = Number(state.patient.weight);
        const expected = id === 'adrenalina' ? amount === 1
            : id === 'amiodarona' ? amount === (count === 0 ? 300 : 150)
                : id === 'lidocaina' ? Number.isFinite(weight) && weight > 0
                    && amount >= weight * (count === 0 ? 1 : 0.5) && amount <= weight * (count === 0 ? 1.5 : 0.75) : false;
        const requiresReview = isRetrospective || guidance?.status !== 'due' || !expected || unit !== 'mg' || !['EV', 'IO'].includes(route);
        const realTimeContext = !isRetrospective && isClinicalArrestActive();
        const entry = addMedication({
            id: operationId, name: medNames[id], medicationId: id, amount, unit, route,
            timestamp, isRetrospective, requiresReview,
            weightAtAdministration: Number.isFinite(weight) && weight > 0 ? weight : null,
            episodeId: !isRetrospective || timestamp >= state.clinical?.startedAt ? state.clinical?.episodeId : null,
            shockCount: realTimeContext ? state.shockCount : null,
            clinicalContext: realTimeContext ? { step: state.clinical.step, compressionId: state.clinical.compressionId } : null
        });
        if (!entry) return;
        clearOperation(); // Only reopening the form creates another legitimate administration.
        const button = document.getElementById('record-med-btn');
        if (button) button.disabled = true;
        closeModal('med-modal');
        if (typeof window.addEvent === 'function') window.addEvent(`MEDICAÇÃO: ${entry.name} - ${entry.dose} via ${route}; horário efetivo ${new Date(timestamp).toLocaleString()}; ${isRetrospective ? 'registro retrospectivo' : 'tempo real'}`, 'critical');
        if (typeof window.updatePcrGuidance === 'function') window.updatePcrGuidance();
        if (isClinicalArrestActive()) startDrugTimer();
        showTransientAlert('Administração registrada. Este registro não é uma recomendação de nova dose.', 'success', 4000);
    } catch (error) {
        showTransientAlert(error.message, 'warning');
    }
}

export function getOrCreateDrugTimerBox() {
    return document.getElementById('ac-drug-timer-container');
}

export function startDrugTimer() {
    if (intervals.drugTimer) clearInterval(intervals.drugTimer);
    updateDrugStatusDisplay();
    intervals.drugTimer = setInterval(updateDrugStatusDisplay, 1000);
}

export function stopDrugTimer() {
    if (intervals.drugTimer) { clearInterval(intervals.drugTimer); intervals.drugTimer = null; }
    const labelEl = document.getElementById('ac-drug-timer-label');
    const countdownEl = document.getElementById('ac-drug-countdown');
    if (labelEl) labelEl.textContent = 'MEDICAÇÃO';
    if (countdownEl) {
        countdownEl.textContent = '--:--';
        countdownEl.className = 'ac-timer-value';
    }
}

export function updateDrugStatusDisplay() {
    const label = document.getElementById('ac-drug-timer-label');
    const value = document.getElementById('ac-drug-countdown');
    if (!label || !value) return;
    const snapshot = getClinicalSnapshot();
    const step = getProtocolNextStep(snapshot);
    const guidance = step.medicationGuidance;
    label.textContent = 'ORIENTAÇÃO CLÍNICA';
    if (!isClinicalArrestActive()) value.textContent = state.roscAchieved ? 'ROSC' : 'INATIVA';
    else if (step.criticalAction === 'DRUG') value.textContent = 'VER CONDUTAS';
    else if (Object.values(guidance).some(entry => entry.status === 'review')) value.textContent = 'REAVALIAR';
    else {
        const seconds = guidance.adrenalina?.secondsUntilDue;
        value.textContent = seconds > 0 ? `${Math.floor(seconds / 60)}:${String(Math.ceil(seconds % 60)).padStart(2, '0')}` : 'AGUARDAR';
    }
    value.className = 'ac-timer-value';
    if (document.getElementById('med-modal')?.classList.contains('show')) updateMedicationDose();
}
