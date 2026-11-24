import { state, intervals } from '../config/state.js';
import { closeModal, openModal, showTransientAlert } from '../ui/dom.js';
import { addMedication } from './events.js';
import { getAntiarrhythmicHistory, evaluateMedicationGuidance } from '../protocols/medical.js';
import { getClinicalSnapshot, isClinicalArrestActive, newOperationId } from './clinical.js';
import { updateAdrenalineTimerDisplay } from '../ui/pcr-adrenaline-timer.js';
import { weightDoseMg } from '../utils/dose-math.js';

const medNames = { adrenalina: 'Adrenalina', amiodarona: 'Amiodarona', lidocaina: 'Lidocaína', atropina: 'Atropina', bicarbonato: 'Bicarbonato de Sódio', sulfato: 'Sulfato de Magnésio' };
const reviewText = new Map([
    ['Reavaliar: percurso clínico incompleto; registrar avaliação de ritmo.', 'Reavaliar: confira o histórico e registre o ritmo antes de medicar.'],
    ['Reavaliar antiarrítmicos: dose tardia, histórico incompleto, outro episódio ou fármacos associados. O PDF não fundamenta uma nova dose automática.', 'Reavaliar: confira doses, horários, episódio e associações antes de nova dose.']
]);
const formOperation = () => document.getElementById('med-modal')?.dataset.operationId;
function formFeedback(message) {
    const node = document.getElementById('medication-form-feedback');
    if (node) { node.textContent = message; node.hidden = false; }
    else showTransientAlert(message, 'warning');
}
const clearOperation = () => {
    const form = document.getElementById('med-modal');
    if (form) delete form.dataset.operationId;
};

export function cancelMedicationRecord() {
    clearOperation();
    closeModal('med-modal');
}

function presetContext(snapshot) {
    return JSON.stringify([snapshot.patient, snapshot.clinical?.episodeId, snapshot.clinical?.step,
        snapshot.clinical?.compressionId, snapshot.clinical?.pendingShock, snapshot.medications]);
}

function exactPreset(id, snapshot) {
    const entry = evaluateMedicationGuidance(snapshot)[id];
    if (snapshot.patient.algorithm !== 'adult' || entry?.status !== 'due') return null;
    // A range is not an actual administered amount. Never choose a lidocaine dose here.
    const match = entry.dose?.match(/^(\d+(?:\.\d+)?) mg EV\/IO$/);
    return match ? { amount: Number(match[1]), context: presetContext(snapshot) } : null;
}

function weightRange(id, snapshot) {
    const entry = evaluateMedicationGuidance(snapshot)[id];
    if (id !== 'lidocaina' || snapshot.patient.algorithm !== 'adult' || entry?.status !== 'due') return null;
    const match = entry.dose?.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?) mg\/kg EV\/IO$/);
    if (!match) return null;
    const weight = Number(snapshot.patient.weight);
    return { min: weightDoseMg(weight, Number(match[1])), max: weightDoseMg(weight, Number(match[2])),
        hasWeight: Number.isFinite(weight) && weight > 0, dose: entry.dose };
}

function quickRegistration(id, snapshot) {
    const modal = document.getElementById('med-modal');
    const preset = modal?.dataset.preset ? JSON.parse(modal.dataset.preset) : null;
    const current = exactPreset(id, snapshot);
    const amount = Number(document.getElementById('medication-dose')?.value);
    const range = weightRange(id, snapshot);
    const fixedDose = !!preset && current?.context === preset.context && current.amount === preset.amount && amount === preset.amount;
    const rangeDose = range?.hasWeight && modal?.dataset.rangeContext === presetContext(snapshot) && amount >= range.min && amount <= range.max;
    return (fixedDose || rangeDose)
        && document.getElementById('medication-unit')?.value === 'mg'
        && document.getElementById('medication-timing')?.value === 'realtime'
        && ['EV', 'IO'].includes(document.querySelector('input[name="administration-route"]:checked')?.value);
}

export function selectMedication(id) {
    const select = document.getElementById('medication-select');
    if (!select || !medNames[id]) return;
    if (select.value !== id) {
        select.value = id;
        document.getElementById('medication-dose').value = '';
        document.getElementById('medication-confirmed').checked = false;
        delete document.getElementById('med-modal').dataset.selection;
        const feedback = document.getElementById('medication-form-feedback');
        if (feedback) feedback.hidden = true;
    }
    document.querySelectorAll('.med-btn-pro').forEach(button => {
        button.classList.toggle('selected', button.dataset.med === id);
        button.setAttribute('aria-pressed', String(button.dataset.med === id));
    });
    updateMedicationDose();
}

export function showMedModal() {
    const form = document.getElementById('med-modal');
    if (!form) return;
    form.dataset.operationId = newOperationId();
    delete form.dataset.selection;
    delete form.dataset.preset;
    delete form.dataset.rangeContext;
    delete form.dataset.selectionContext;
    form.dataset.encounterStart = String(state.pcrStartTime);
    form.dataset.episodeId = state.clinical?.episodeId || '';
    form.dataset.reviewedContext = presetContext(getClinicalSnapshot());
    const feedback = document.getElementById('medication-form-feedback');
    if (feedback) { feedback.textContent = ''; feedback.hidden = true; }
    for (const id of ['medication-dose', 'medication-select', 'medication-effective-at', 'medication-weight']) {
        const input = document.getElementById(id);
        if (input) input.value = '';
    }
    const confirmed = document.getElementById('medication-confirmed');
    if (confirmed) confirmed.checked = false;
    const timing = document.getElementById('medication-timing');
    if (timing) timing.value = 'realtime';
    const unit = document.getElementById('medication-unit');
    if (unit) unit.value = 'mg';
    const route = document.getElementById('route-ev');
    if (route) route.checked = true;
    const editor = document.getElementById('medication-edit-details');
    if (editor) editor.open = false;
    const preview = document.getElementById('med-preview-panel');
    if (preview) preview.style.display = 'none';
    const button = document.getElementById('record-med-btn');
    if (button) button.disabled = true;
    document.querySelectorAll('.med-btn-pro').forEach(btn => { btn.classList.remove('selected'); btn.setAttribute('aria-pressed', 'false'); });
    updateMedicationDose();
    openModal('med-modal');
}

export function updateMedicationDose() {
    const id = document.getElementById('medication-select')?.value;
    const snapshot = getClinicalSnapshot();
    const entry = evaluateMedicationGuidance(snapshot)[id];
    const modal = document.getElementById('med-modal');
    if (modal && modal.dataset.reviewedContext !== presetContext(snapshot)) {
        document.getElementById('medication-confirmed').checked = false;
        modal.dataset.reviewedContext = presetContext(snapshot);
    }
    if (id && modal && modal.dataset.selection !== id) {
        modal.dataset.selection = id;
        modal.dataset.selectionContext = presetContext(snapshot);
        delete modal.dataset.rangeContext;
        if (weightRange(id, snapshot)) modal.dataset.rangeContext = presetContext(snapshot);
        document.getElementById('medication-weight').value = '';
        const preset = document.getElementById('medication-timing')?.value === 'realtime' ? exactPreset(id, snapshot) : null;
        if (preset) {
            modal.dataset.preset = JSON.stringify(preset);
            if (!document.getElementById('medication-dose').value) document.getElementById('medication-dose').value = String(preset.amount);
        } else delete modal.dataset.preset;
    }
    const retrospective = document.getElementById('medication-timing')?.value === 'retrospective';
    const route = document.querySelector('input[name="administration-route"]:checked')?.value;
    const range = !retrospective && ['EV', 'IO'].includes(route) ? weightRange(id, snapshot) : null;
    const weightField = document.getElementById('medication-weight-field');
    if (weightField) weightField.hidden = !range || range.hasWeight;
    const text = retrospective ? 'Registro retrospectivo: informar o fato ocorrido; sem recomendação de nova dose.'
        : route && !['EV', 'IO'].includes(route) ? 'Via fora do algoritmo IV/IO. Apenas documentar o fato e reavaliar; sem recomendação por esta via.'
            : range ? (range.hasWeight ? `Faixa: ${range.min}–${range.max} mg (${range.dose}). Informe a dose administrada.` : 'Informe o peso para calcular a faixa. Não estime a dose.')
            : entry?.status === 'due' ? `Dose padrão: ${entry.dose}.`
                : entry?.status === 'not_due' && entry.secondsUntilDue > 0 ? 'Aguarde o intervalo. A próxima dose ainda não está indicada.'
                    : reviewText.get(entry?.reason) || entry?.reason || 'Sem dose automática. Informe apenas o que foi administrado.';
    const preview = document.getElementById('med-preview-value');
    if (preview) preview.textContent = text;
    const name = document.getElementById('med-preview-name');
    if (name) name.textContent = medNames[id] || '';
    const panel = document.getElementById('med-preview-panel');
    if (panel) panel.style.display = id ? 'block' : 'none';
    const quick = quickRegistration(id, snapshot);
    const confirmation = document.getElementById('medication-review-confirmation');
    const rangeEntry = !!range && modal?.dataset.rangeContext === presetContext(snapshot)
        && !document.getElementById('medication-dose')?.value;
    if (confirmation) confirmation.hidden = !id || quick || rangeEntry;
    const editor = document.getElementById('medication-edit-details');
    if (editor) {
        editor.hidden = !id;
        if (id && !quick && !rangeEntry) editor.open = true;
    }
    const effectiveField = document.getElementById('medication-effective-field');
    if (effectiveField) effectiveField.hidden = !retrospective;
    const amount = Number(document.getElementById('medication-dose')?.value);
    const doseUnit = document.getElementById('medication-dose-unit');
    if (doseUnit) doseUnit.textContent = document.getElementById('medication-unit')?.value || 'mg';
    const button = document.getElementById('record-med-btn');
    if (button) {
        button.disabled = !id || !formOperation() || !Number.isFinite(amount) || amount <= 0 || (!quick && !document.getElementById('medication-confirmed')?.checked);
        const label = button.querySelector('.sub-text');
        if (label) label.textContent = !id ? 'Selecione a medicação' : quick ? `${medNames[id]} · ${amount} ${doseUnit?.textContent} · ${route}`
            : rangeEntry ? 'Informe a dose administrada' : 'Confira os dados do registro manual';
    }

}

export function confirmMedicationWeight() {
    const modal = document.getElementById('med-modal');
    const snapshot = getClinicalSnapshot();
    const range = weightRange(document.getElementById('medication-select')?.value, snapshot);
    if (!formOperation() || !range || range.hasWeight || modal.dataset.selectionContext !== presetContext(snapshot)
        || modal.dataset.encounterStart !== String(state.pcrStartTime) || modal.dataset.episodeId !== state.clinical?.episodeId) {
        formFeedback('O atendimento mudou. Feche e reabra o registro de medicação.'); return;
    }
    const weight = Number(document.getElementById('medication-weight')?.value);
    if (!Number.isFinite(weight) || weight < 0.1 || weight > 500) {
        formFeedback('Informe um peso confirmado entre 0,1 e 500 kg.'); return;
    }
    state.patient.weight = weight;
    document.getElementById('medication-form-feedback').hidden = true;
    modal.dataset.rangeContext = presetContext(getClinicalSnapshot());
    modal.dataset.selectionContext = modal.dataset.rangeContext;
    modal.dataset.reviewedContext = modal.dataset.rangeContext;
    if (typeof window.addEvent === 'function') window.addEvent(`PESO INFORMADO: ${weight} kg para registro de medicação`, 'normal');
    updateMedicationDose();
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
        const snapshot = getClinicalSnapshot();
        const modal = document.getElementById('med-modal');
        if (modal.dataset.encounterStart !== String(state.pcrStartTime) || modal.dataset.episodeId !== state.clinical?.episodeId) {
            throw new Error('O atendimento mudou. Feche e reabra o registro de medicação.');
        }
        if (modal.dataset.reviewedContext !== presetContext(snapshot)) {
            updateMedicationDose();
            throw new Error('O contexto mudou. Revise a administração antes de registrar.');
        }
        const quick = quickRegistration(id, snapshot);
        if (!quick && !document.getElementById('medication-confirmed')?.checked) throw new Error('Revise os dados e o contexto clínico antes do registro manual.');
        if (!Number.isFinite(timestamp) || timestamp > recordedAt) throw new Error('Informe um horário efetivo válido, sem data futura.');
        const guidance = evaluateMedicationGuidance(snapshot, recordedAt)[id];
        const history = getAntiarrhythmicHistory(state.medications);
        const count = history[id]?.length || 0;
        const weight = Number(state.patient.weight);
        const expected = id === 'adrenalina' ? amount === 1
            : id === 'amiodarona' ? amount === (count === 0 ? 300 : 150)
                : id === 'lidocaina' ? Number.isFinite(weight) && weight > 0
                    && amount >= weightDoseMg(weight, count === 0 ? 1 : 0.5) && amount <= weightDoseMg(weight, count === 0 ? 1.5 : 0.75) : false;
        const stalePreset = !!document.getElementById('med-modal')?.dataset.preset && JSON.parse(document.getElementById('med-modal').dataset.preset).context !== presetContext(snapshot);
        const staleRange = !!modal.dataset.rangeContext && modal.dataset.rangeContext !== presetContext(snapshot);
        const requiresReview = stalePreset || staleRange || isRetrospective || guidance?.status !== 'due' || !expected || unit !== 'mg' || !['EV', 'IO'].includes(route);
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
        formFeedback(error.message);
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
    updateAdrenalineTimerDisplay(getClinicalSnapshot());
}

export function updateDrugStatusDisplay() {
    updateAdrenalineTimerDisplay(getClinicalSnapshot());
    if (document.getElementById('med-modal')?.classList.contains('show')) updateMedicationDose();
}
