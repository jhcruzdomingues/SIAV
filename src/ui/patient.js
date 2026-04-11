import { state } from '../config/state.js';
import { closeModal, showScreen } from './dom.js';

export function showPatientModal() {
    const patientModal = document.getElementById('patient-modal');
    if (patientModal) patientModal.classList.add('show');
}

export function cancelPatientSetup() {
    closeModal('patient-modal');
    showScreen('home');
}

export function savePatientData(e) {
    e.preventDefault();
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
    updatePatientDisplay();
    closeModal('patient-modal');
    if (typeof window.startPCR === 'function') window.startPCR();
}

export function startPCRWithUninformedData() {
    state.patient = { name: 'N/I', age: 'N/I', sex: 'N/I', weight: 'N/I', allergies: 'Nenhuma informada', comorbidities: 'N/I' };
    updatePatientDisplay();
    closeModal('patient-modal');
    if (typeof window.startPCR === 'function') window.startPCR();
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