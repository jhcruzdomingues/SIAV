import { state } from '../config/state.js';
import { showScreen, closeModal, showTransientAlert } from './dom.js';
import { showPatientModal, savePatientData, startPCRWithUninformedData, cancelPatientSetup } from './patient.js';
import { startCompressions, finishPCR } from '../pcr/core.js';
import { toggleMetronome, adjustBPM } from './audio.js';
import { showRhythmSelectorScreen, selectRhythmOption, processRhythmSelection, applyShockAndResume, roscObtido } from '../pcr/rhythm.js';
import { showMedModal, updateMedicationDose, recordMedication } from '../pcr/medications.js';
import { showNotesModal, saveNotes } from '../pcr/log.js';
import { showVitalsModal, recordVitals } from '../pcr/vitals.js';
import { showGlasgowModal, saveGlasgow } from './glasgow.js';
import { handleLogin, handleRegistrationFromForm, handleProfileUpdate, logout, showProfileModal, updateDashboard } from './auth-profile.js';
import { checkAccess, startSubscriptionFlow } from '../services/permissions.js';
import { showProtocolDetail, showStudyDetail, toggleCause, closeTreatmentFullscreen, createStudyHSTsList } from '../protocols/guidelines.js';
import { checkAndIncrementSimulationUse } from '../services/storage.js';

export function registerAllEvents() {
    createStudyHSTsList();

    // 1. Navegação
    document.getElementById('nav-home')?.addEventListener('click', () => showScreen('home'));
    document.getElementById('nav-pcr')?.addEventListener('click', () => {
        if (state.pcrActive) showScreen('pcr');
        else showPatientModal();
    });
    document.getElementById('nav-dashboard')?.addEventListener('click', () => {
        updateDashboard();
        if (checkAccess('advanced_dashboard', false)) {
            showScreen('dashboard');
        } else {
            if (confirm('Acesso ao dashboard restrito ao seu plano.\n\nDeseja ver os planos disponíveis?')) {
                if (typeof window.openPlansModal === 'function') window.openPlansModal();
            }
        }
    });

    // 2. Home Tools
    document.getElementById('start-pcr-card')?.addEventListener('click', showPatientModal);
    document.getElementById('studies-tool')?.addEventListener('click', () => showScreen('studies'));
    document.getElementById('protocols-tool')?.addEventListener('click', () => showScreen('protocols'));
    document.getElementById('quiz-config-tool')?.addEventListener('click', () => showScreen('quiz-config'));
    document.getElementById('glasgow-tool')?.addEventListener('click', showGlasgowModal);

    // 3. Modais e Fluxo de PCR
    document.getElementById('patient-info-display')?.addEventListener('click', () => {
        const patientNameInput = document.getElementById('patient-name');
        if(patientNameInput) patientNameInput.value = state.patient.name !== 'N/I' ? state.patient.name : '';
        
        const patientAgeInput = document.getElementById('patient-age');
        if(patientAgeInput) patientAgeInput.value = state.patient.age !== 'N/I' ? state.patient.age : '';
        
        const patientWeightInput = document.getElementById('patient-weight');
        if(patientWeightInput) patientWeightInput.value = state.patient.weight !== 'N/I' ? state.patient.weight : '';
        
        const sexRadios = document.querySelectorAll('input[name="sex"]');
        sexRadios.forEach(radio => {
            radio.checked = (radio.value === state.patient.sex);
        });
        
        const patientAllergiesInput = document.getElementById('patient-allergies');
        if(patientAllergiesInput) patientAllergiesInput.value = (state.patient.allergies !== 'Nenhuma informada' && state.patient.allergies !== 'N/I') ? state.patient.allergies : '';
        
        const patientComorbiditiesInput = document.getElementById('patient-comorbidities');
        if(patientComorbiditiesInput) patientComorbiditiesInput.value = state.patient.comorbidities !== 'N/I' ? state.patient.comorbidities : '';
        
        const noDataBtn = document.getElementById('start-pcr-no-data-btn');
        const submitBtn = document.querySelector('#patient-form .primary-btn');
        if (state.pcrActive) {
            if (noDataBtn) noDataBtn.style.display = 'none';
            if (submitBtn) submitBtn.textContent = 'SALVAR ALTERAÇÕES';
        } else {
            if (noDataBtn) noDataBtn.style.display = 'inline-block';
            if (submitBtn) submitBtn.textContent = 'INICIAR ATENDIMENTO';
        }
        
        showPatientModal();
    });

    const patientForm = document.getElementById('patient-form');
    if(patientForm) patientForm.addEventListener('submit', savePatientData);
    document.getElementById('start-pcr-no-data-btn')?.addEventListener('click', startPCRWithUninformedData);
    document.getElementById('cancel-patient-btn')?.addEventListener('click', cancelPatientSetup);

    document.getElementById('compressions-btn')?.addEventListener('click', startCompressions);
    document.getElementById('metro-btn')?.addEventListener('click', toggleMetronome);
    document.getElementById('bpm-minus')?.addEventListener('click', () => adjustBPM(-5));
    document.getElementById('bpm-plus')?.addEventListener('click', () => adjustBPM(5));

    document.getElementById('rhythm-conduta-btn')?.addEventListener('click', () => {
        if (!state.pcrActive) {
            showTransientAlert('Inicie um atendimento de PCR para realizar a avaliação de ritmo.', 'warning', 3000);
            return;
        }
        showRhythmSelectorScreen(false);
    });
    document.getElementById('rosc-btn')?.addEventListener('click', roscObtido);

    document.querySelectorAll('#rhythm-selector-screen .rhythm-option-btn').forEach(btn => {
        btn.addEventListener('click', function() { selectRhythmOption(this); });
    });
    document.getElementById('submit-rhythm-selection-btn')?.addEventListener('click', processRhythmSelection);
    document.getElementById('apply-shock-btn')?.addEventListener('click', applyShockAndResume);

    document.getElementById('med-btn')?.addEventListener('click', showMedModal);
    
    document.querySelectorAll('.med-btn-pro').forEach(btn => {
        btn.addEventListener('click', function() {
            const medId = this.getAttribute('data-med');
            if (this.classList.contains('selected')) {
                recordMedication();
            } else {
                document.querySelectorAll('.med-btn-pro').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
                const medSelect = document.getElementById('medication-select');
                if (medSelect) medSelect.value = medId;
                updateMedicationDose();
            }
        });
    });

    document.getElementById('record-med-btn')?.addEventListener('click', recordMedication);
    document.getElementById('cancel-med-btn')?.addEventListener('click', () => closeModal('med-modal'));

    document.getElementById('notes-btn')?.addEventListener('click', showNotesModal);
    document.getElementById('save-notes-btn')?.addEventListener('click', saveNotes);
    document.getElementById('cancel-notes-btn')?.addEventListener('click', () => closeModal('notes-modal'));

    document.getElementById('vitals-btn')?.addEventListener('click', showVitalsModal);
    document.getElementById('record-vitals-btn')?.addEventListener('click', recordVitals);
    document.getElementById('cancel-vitals-btn')?.addEventListener('click', () => closeModal('vitals-modal'));

    document.getElementById('finish-pcr-btn')?.addEventListener('click', finishPCR);
    document.getElementById('save-glasgow-btn')?.addEventListener('click', saveGlasgow);
    document.getElementById('close-glasgow-btn')?.addEventListener('click', () => closeModal('glasgow-modal'));

    // 4. Autenticação e Perfil
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('login-form-simple')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form-full')?.addEventListener('submit', handleRegistrationFromForm);
    document.getElementById('profile-update-form')?.addEventListener('submit', handleProfileUpdate);
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    document.getElementById('cancel-profile-btn')?.addEventListener('click', () => closeModal('profile-modal'));
    document.getElementById('login-to-dashboard-btn')?.addEventListener('click', showProfileModal);
    document.getElementById('dashboard-user-info')?.addEventListener('click', showProfileModal);
    
    document.getElementById('view-full-log-btn')?.addEventListener('click', () => {
        if (typeof window.openPlansModal === 'function') window.openPlansModal();
    });

    // 5. Quiz & Simulador
    document.getElementById('start-quiz-btn')?.addEventListener('click', window.startQuiz);
    document.getElementById('next-q-btn')?.addEventListener('click', window.nextQuizQuestion);
    document.getElementById('finish-quiz-early-btn')?.addEventListener('click', () => {
        if (confirm("Você tem certeza que deseja sair? O seu progresso será perdido.")) {
            closeModal('quiz-running-modal');
            state.quiz.active = false;
            showScreen('quiz-config');
        }
    });
    document.getElementById('close-result-btn')?.addEventListener('click', () => {
        closeModal('quiz-result-modal');
        showScreen('quiz-config');
    });

    document.getElementById('quiz-mode-questions')?.addEventListener('click', () => {
        const selection = document.getElementById('quiz-mode-selection');
        const form = document.querySelector('.quiz-config-form');
        if (selection) selection.style.display = 'none';
        if (form) form.style.display = 'block';
    });

    document.getElementById('back-to-mode-selection')?.addEventListener('click', () => {
        const selection = document.getElementById('quiz-mode-selection');
        const form = document.querySelector('.quiz-config-form');
        if (selection) selection.style.display = 'flex';
        if (form) form.style.display = 'none';
    });

    document.getElementById('quiz-mode-simulator')?.addEventListener('click', async () => {
        if (!navigator.onLine) {
            alert('⚠️ Conexão com a internet necessária para o Simulador Avançado.');
            return;
        }
        if (!checkAccess('quiz_simulations')) return;
        
        const simulatorCard = document.getElementById('quiz-mode-simulator');
        const originalHTML = simulatorCard.innerHTML;
        simulatorCard.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Carregando caso clínico...</div>';
        simulatorCard.style.pointerEvents = 'none';

        try {
            const clinicalCase = await window.SIAV.fetchRandomClinicalCase();
            simulatorCard.innerHTML = originalHTML;
            simulatorCard.style.pointerEvents = 'auto';

            const { AdvancedSimulator } = await import('../../simulator.js');
            if (!window.simulatorInstance) {
                window.simulatorInstance = new AdvancedSimulator({
                    state: state,
                    checkAndIncrementSimulationUse: checkAndIncrementSimulationUse,
                    showToastNotification: showTransientAlert,
                    openPlansModal: window.openPlansModal
                });
            }
            await window.simulatorInstance.start(clinicalCase);
        } catch (error) {
            alert('❌ Erro ao carregar o caso clínico\n\n' + error.message);
            simulatorCard.innerHTML = originalHTML;
            simulatorCard.style.pointerEvents = 'auto';
        }
    });

    // 6. Protocolos e Guias
    document.getElementById('close-protocol-btn')?.addEventListener('click', () => closeModal('protocol-detail-modal'));
    document.getElementById('close-log-detail-btn')?.addEventListener('click', () => closeModal('log-detail-modal')); 

    document.getElementById('protocol-adulto')?.addEventListener('click', () => showProtocolDetail('pcr-adulto'));
    document.getElementById('protocol-pediatrica')?.addEventListener('click', () => showProtocolDetail('pcr-pediatrica'));
    document.getElementById('protocol-avc')?.addEventListener('click', () => showProtocolDetail('avc'));
    document.getElementById('protocol-iam')?.addEventListener('click', () => showProtocolDetail('iam'));
    
    document.getElementById('study-ecg-ritmos')?.addEventListener('click', () => showStudyDetail('ecg-ritmos-pcr'));
    document.getElementById('study-ecg-interpretacao')?.addEventListener('click', () => showStudyDetail('ecg-interpretacao'));
    document.getElementById('study-farmaco')?.addEventListener('click', () => showStudyDetail('farmacologia'));
    
    document.getElementById('hs-ts-study-container')?.addEventListener('click', function() {
        if (!checkAccess('study_review')) return;
        const listContainer = document.getElementById('hs-ts-study-list');
        if (listContainer) listContainer.style.display = listContainer.style.display !== 'none' ? 'none' : 'flex';
    });

    document.getElementById('hs-ts-btn')?.addEventListener('click', () => showScreen('causes'));

    document.querySelectorAll('#causes-screen .cause-item').forEach(item => {
        item.addEventListener('click', function() { toggleCause(this); });
    });
    
    document.getElementById('close-treatment-btn')?.addEventListener('click', closeTreatmentFullscreen);

    const logoIcon = document.querySelector('.logo-icon');
    if (logoIcon) {
        logoIcon.addEventListener('click', function() { this.classList.toggle('ecg-animating'); });
    }

    // Configura atalhos de teclado globais
    document.addEventListener('keydown', (e) => {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;

        switch (e.code) {
            case 'KeyC': {
                const compBtn = document.getElementById('compressions-btn');
                if (compBtn && !compBtn.disabled) startCompressions();
                break;
            }
            case 'KeyM': {
                toggleMetronome();
                break;
            }
            case 'KeyS': {
                const shockBtn = document.getElementById('apply-shock-btn');
                if (shockBtn && !shockBtn.disabled) shockBtn.click();
                break;
            }
            case 'Digit1':
            case 'Numpad1': {
                const medBtn = document.getElementById('med-btn');
                if (medBtn) showMedModal();
                break;
            }
            default:
                break;
        }
    });
}
