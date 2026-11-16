import { state } from '../config/state.js';
import { closeModal, openModal, showScreen } from './dom.js';

export function updatePatientStartAction() {
    const modal = document.getElementById('patient-modal');
    if (modal) modal.dataset.patientMode = state.pcrActive ? 'edit' : 'new';
    const submit = document.querySelector('#patient-form button[type="submit"]');
    if (submit) submit.textContent = state.pcrActive ? 'SALVAR ALTERAÇÕES'
        : document.getElementById('patient-adult-protocol')?.checked ? 'INICIAR ATENDIMENTO ADULTO' : 'INICIAR ATENDIMENTO';
}

export function showPatientModal() {
    if (!state.pcrActive) {
        document.getElementById('patient-form')?.reset();
    } else {
        const adult = document.getElementById('patient-adult-protocol');
        const other = document.getElementById('patient-other-protocol');
        if (adult) adult.checked = state.patient.algorithm === 'adult';
        if (other) other.checked = state.patient.algorithm !== 'adult';
    }
    const submit = document.querySelector('#patient-form button[type="submit"]');
    if (submit) submit.disabled = false;
    const title = document.getElementById('patient-modal-title');
    if (title) title.textContent = state.pcrActive ? 'Dados do atendimento' : 'Novo atendimento';
    updatePatientStartAction();
    openModal('patient-modal');
}

export function cancelPatientSetup() {
    closeModal('patient-modal');
    if (!state.pcrActive) {
        showScreen('home');
    }
}

export function savePatientData(e) {
    e.preventDefault();
    const submit = document.querySelector('#patient-form button[type="submit"]');
    if (submit?.disabled) return;
    const previousPatient = state.patient;
    try {
        const weightValue = document.getElementById('patient-weight')?.value;
        const ageValue = document.getElementById('patient-age')?.value;
        const sexChecked = document.querySelector('input[name="sex"]:checked');
        const patientName = document.getElementById('patient-name');
        const patientAllergies = document.getElementById('patient-allergies');
        const patientComorbidities = document.getElementById('patient-comorbidities');

        if (weightValue && (isNaN(weightValue) || parseFloat(weightValue) <= 0 || parseFloat(weightValue) > 500)) {
            alert('Peso invalido! Deve ser um numero entre 0 e 500 kg.'); return;
        }
        if (ageValue && (isNaN(ageValue) || parseInt(ageValue) < 0 || parseInt(ageValue) > 150)) {
            alert('Idade invalida! Deve ser um numero entre 0 e 150 anos.'); return;
        }

        const sanitizedName = patientName ? patientName.value.trim().replace(/[<>]/g, '') : '';
        if (sanitizedName && sanitizedName.length > 100) {
            alert('Nome muito longo! Maximo de 100 caracteres.'); return;
        }

        state.patient = {
            algorithm: document.getElementById('patient-adult-protocol')?.checked ? 'adult' : null,
            name: sanitizedName || 'N/I',
            age: ageValue || 'N/I',
            sex: sexChecked ? sexChecked.value : 'N/I',
            weight: weightValue || 'N/I',
            allergies: (patientAllergies ? patientAllergies.value.trim().replace(/[<>]/g, '') : '') || 'Nenhuma informada',
            comorbidities: (patientComorbidities ? patientComorbidities.value.trim().replace(/[<>]/g, '') : '') || 'N/I'
        };
    } catch (error) {
        console.error('Erro ao salvar dados do paciente:', error);
        alert('Erro ao salvar dados do paciente. Por favor, tente novamente.');
        return;
    }
    // Keep repeated submits in the closing modal from becoming another save/start.
    // Opening the form again restores the action, including after a cancelled start.
    if (submit) submit.disabled = true;
    updatePatientDisplay();
    closeModal('patient-modal');
    
    if (!state.pcrActive && typeof window.startPCR === 'function') {
        window.startPCR();
        if (!state.pcrActive) { state.patient = previousPatient; updatePatientDisplay(); }
    }
}

export function startPCRWithUninformedData() {
    const previousPatient = state.patient;
    state.patient = { algorithm: document.getElementById('patient-adult-protocol')?.checked ? 'adult' : null, name: 'N/I', age: 'N/I', sex: 'N/I', weight: 'N/I', allergies: 'Nenhuma informada', comorbidities: 'N/I' };
    updatePatientDisplay();
    closeModal('patient-modal');
    if (!state.pcrActive && typeof window.startPCR === 'function') {
        window.startPCR();
        if (!state.pcrActive) { state.patient = previousPatient; updatePatientDisplay(); }
    }
}

function updatePatientDisplay() {
    const displayName = document.getElementById('display-name');
    const displayAge = document.getElementById('display-age');
    const displaySex = document.getElementById('display-sex');
    const displayAllergies = document.getElementById('display-allergies');
    const allergiesRow = document.getElementById('allergies-row');
    const patientInfoDisplay = document.getElementById('patient-info-display');

    if(displayName) displayName.textContent = state.patient.name;
    if(displayAge) displayAge.textContent = (state.patient.age !== 'N/I' ? state.patient.age + ' anos' : 'N/I');
    if(displaySex) displaySex.textContent = state.patient.sex;
    
    if (allergiesRow) {
        const hasAllergies = state.patient.allergies && state.patient.allergies !== 'Nenhuma informada' && state.patient.allergies !== 'N/I';
        if (hasAllergies && displayAllergies) displayAllergies.textContent = state.patient.allergies;
        allergiesRow.style.display = hasAllergies ? 'flex' : 'none';
    }
    if(patientInfoDisplay) patientInfoDisplay.style.display = 'flex';
}
