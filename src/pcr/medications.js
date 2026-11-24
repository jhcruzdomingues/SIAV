import { state, intervals } from '../config/state.js';
import { closeModal, openModal, showTransientAlert } from '../ui/dom.js';
import { addMedication } from './events.js';
import { getAntiarrhythmicHistory, evaluateMedicationGuidance } from '../protocols/medical.js';
import { getClinicalSnapshot, isClinicalArrestActive, newOperationId } from './clinical.js';
import { updateAdrenalineTimerDisplay } from '../ui/pcr-adrenaline-timer.js';
import { weightDoseMg } from '../utils/dose-math.js';
import { MEDICATION_REGISTRATION, registrationUnitRouteAllowed } from '../utils/medication-registration.js';

const medNames = Object.fromEntries(Object.entries(MEDICATION_REGISTRATION).map(([id, entry]) => [id, entry.name]));
const reviewText = new Map([
    ['Reavaliar: percurso clínico incompleto; registrar avaliação de ritmo.', 'Reavaliar: confirme o ritmo e o histórico. Indicação não verificada.'],
    ['Reavaliar antiarrítmicos: dose tardia, histórico incompleto, outro episódio ou fármacos associados. O PDF não fundamenta uma nova dose automática.', 'Reavaliar: histórico de antiarrítmicos incerto. Sem dose automática.'],
    ['Reavaliar adrenalina: dados de administração incompletos ou via fora do algoritmo.', 'Reavaliar: histórico da adrenalina incerto. Sem dose automática.'],
    ['ROSC: seguir cuidados pós-parada; não recomendar medicação de PCR.', 'RCE registrado. Sem indicação automática de medicação de PCR.'],
    ['Sem PCR clínica ativa.', 'Sem PCR ativa. Apenas registro manual.'],
    ['Decisão de choque pendente; manter RCP enquanto prepara a desfibrilação.', 'Choque pendente. Sem dose automática neste momento.'],
    ['Confirmar seleção do algoritmo adulto no preparo do paciente. Não inferir o protocolo pela idade ou pelo peso.', 'Protocolo não adulto. Sem dose adulta automática.'],
    ['Priorizar avaliação de ritmo e desfibrilação indicada.', 'Avaliação de ritmo em andamento. Sem dose automática.'],
    ['Outro antiarrítmico já registrado: reavaliar antes de mudar o fármaco.', 'Outro antiarrítmico já registrado. Não associe automaticamente.'],
    ['Duas doses já documentadas: reavaliar antes de novas doses.', 'Duas doses já registradas. Reavalie antes de nova dose.'],
    ['Dose já registrada neste passo de RCP; não repetir automaticamente.', 'Dose já registrada neste ciclo. Não repetir automaticamente.']
]);

// Presentation only: eligibility and numeric presets remain in the shared evaluator.
function selectionWarning(id, entry) {
    if (MEDICATION_REGISTRATION[id]?.warning) return MEDICATION_REGISTRATION[id].warning;
    if (!entry) return id === 'atropina' ? 'Atropina não é medicação de rotina na PCR.'
        : 'Uso em situações específicas. O app não verifica esta indicação.';
    if (entry.status === 'not_due' && entry.secondsUntilDue > 0) return 'Aguarde o intervalo. A próxima dose ainda não está indicada.';
    if (entry.reason === 'Sem dose automática neste passo do algoritmo.') return `${medNames[id]} não indicada neste passo.`;
    return reviewText.get(entry.reason) || 'Indicação não verificada. Reavalie antes de medicar.';
}

function updateRegistrationOptions(id) {
    const config = MEDICATION_REGISTRATION[id] || MEDICATION_REGISTRATION.adrenalina;
    document.querySelectorAll('#medication-unit option').forEach(option => {
        option.hidden = option.disabled = !config.units.includes(option.value);
    });
    document.querySelectorAll('input[name="administration-route"]').forEach(input => {
        input.closest('label').hidden = input.disabled = !config.routes.includes(input.value);
    });
}
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
        document.getElementById('medication-unit').value = MEDICATION_REGISTRATION[id].unit;
        const route = document.querySelector('input[name="administration-route"]:checked')?.value;
        if (!MEDICATION_REGISTRATION[id].routes.includes(route)) document.getElementById('route-ev').checked = true;
        document.getElementById('medication-confirmed').checked = false;
        document.getElementById('medication-edit-details').open = false;
        delete document.getElementById('med-modal').dataset.selection;
        const feedback = document.getElementById('medication-form-feedback');
        if (feedback) feedback.hidden = true;
    }
    document.querySelectorAll('.med-btn-pro').forEach(button => {
        button.classList.toggle('selected', button.dataset.med === id);
        button.setAttribute('aria-pressed', String(button.dataset.med === id));
    });
    updateMedicationDose();
    // On short portrait screens, reveal the complete dose/review panel instead of
    // leaving its inputs half hidden under the fixed confirmation button.
    // Run only after a deliberate selection, never on a clock tick or while typing.
    const body = document.querySelector('#med-modal .med-form-body');
    const panel = document.getElementById('med-preview-panel');
    if (body?.clientHeight && panel?.offsetHeight <= body.clientHeight) {
        const overflow = panel.getBoundingClientRect().bottom - body.getBoundingClientRect().bottom;
        if (overflow > 0) body.scrollTop += overflow + 2;
    }
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
    for (const id of ['medication-special-options', 'medication-other-options']) {
        const group = document.getElementById(id);
        if (group) group.open = false;
    }
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
    updateRegistrationOptions(id);
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
    const warning = !!id && (retrospective || !['EV', 'IO'].includes(route) || entry?.status !== 'due');
    const text = !id ? '' : retrospective ? 'Registro anterior. Informe o horário real; não é indicação de nova dose.'
        : route && !['EV', 'IO'].includes(route) && !MEDICATION_REGISTRATION[id]?.manualOnly ? 'Via fora do algoritmo. Apenas registro manual, sem sugestão de dose.'
            : range ? (range.hasWeight ? `Faixa: ${range.min}–${range.max} mg (${snapshot.patient.weight} kg).` : 'Informe o peso. Não estime a dose.')
            : entry?.status === 'due' ? (entry.number ? `${entry.number}ª dose` : '')
                : selectionWarning(id, entry);
    const preview = document.getElementById('med-preview-value');
    if (preview) {
        preview.hidden = !text;
        preview.classList.toggle('is-warning', warning);
        preview.setAttribute('role', warning ? 'alert' : 'status');
        preview.setAttribute('aria-live', warning ? 'assertive' : 'polite');
        if (preview.textContent !== text) preview.textContent = text;
    }
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
    }
    const effectiveField = document.getElementById('medication-effective-field');
    if (effectiveField) effectiveField.hidden = !retrospective;
    const amount = Number(document.getElementById('medication-dose')?.value);
    const doseUnit = document.getElementById('medication-dose-unit');
    if (doseUnit) doseUnit.textContent = document.getElementById('medication-unit')?.value || 'mg';
    const button = document.getElementById('record-med-btn');
    if (button) {
        button.disabled = !medNames[id] || !formOperation() || !Number.isFinite(amount) || amount <= 0
            || !registrationUnitRouteAllowed(id, document.getElementById('medication-unit')?.value, route)
            || (!quick && !document.getElementById('medication-confirmed')?.checked);
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
        if (!registrationUnitRouteAllowed(id, unit, route)) throw new Error('Confira a unidade e a via da apresentação selecionada.');
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
