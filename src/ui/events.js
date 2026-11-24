import { restartPCRAfterROSC } from '../pcr/core.js';
import { state } from '../config/state.js';
import { showScreen, openModal, closeModal, showTransientAlert } from './dom.js';
import { showPatientModal, savePatientData, updatePatientStartAction, cancelPatientSetup } from './patient.js';
import { handleTimingVisibility, handleTimingPageHide } from '../pcr/core.js';
import { handleCompressionAction } from './compressions.js';
import { showFinishAttendance, closeFinishAttendance, chooseFinishOutcome, handleFinishAttendanceKey } from './finish-attendance.js';
import { toggleMetronome, adjustBPM } from './audio.js';
import { showRhythmSelectorScreen, selectRhythmOption, processRhythmSelection, applyShockAndResume } from '../pcr/rhythm.js';
import { showMedModal, updateMedicationDose, recordMedication, cancelMedicationRecord, selectMedication, confirmMedicationWeight } from '../pcr/medications.js';
import { showNotesModal, saveNotes } from '../pcr/log.js';
import { recordVitals, skipPostRceVitals, closeVitalsModal, handleVitalsKey } from '../pcr/vitals.js';
import { showGlasgowModal, saveGlasgow } from './glasgow.js';
import { handleLogin, handleRegistrationFromForm, handleProfileUpdate, logout, showProfileModal, showRegistrationModal, showLoginModal, updateDashboard } from './auth-profile.js';
import { checkAccess, startSubscriptionFlow } from '../services/permissions.js';
import { showProtocolDetail, showStudyDetail, toggleCause, closeTreatmentFullscreen, createStudyHSTsList } from '../protocols/guidelines.js';
import { checkAndIncrementSimulationUse } from '../services/storage.js';
import { initializeRegistrationFields, updateRegistrationProfession, validateRegistrationPasswords } from './registration-fields.js';

function clearCareFeedback(id) {
    const feedback = document.getElementById(id);
    if (feedback) { feedback.textContent = ''; feedback.hidden = true; }
}

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
        if (!state.currentUser.isLoggedIn) {
            showProfileModal();
        } else if (checkAccess('advanced_dashboard', false)) {
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
        
        showPatientModal();
    });

    const patientForm = document.getElementById('patient-form');
    if(patientForm) patientForm.addEventListener('submit', savePatientData);
    document.querySelectorAll('input[name="patient-protocol"]').forEach(input => input.addEventListener('change', updatePatientStartAction));
    document.getElementById('cancel-patient-btn')?.addEventListener('click', cancelPatientSetup);

    document.getElementById('compressions-btn')?.addEventListener('click', handleCompressionAction);
    document.addEventListener('visibilitychange', handleTimingVisibility);
    window.addEventListener('pagehide', handleTimingPageHide);
    window.addEventListener('pageshow', handleTimingVisibility);
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
    document.querySelectorAll('[data-finish-outcome]').forEach(button => button.addEventListener('click', () => chooseFinishOutcome(button.dataset.finishOutcome)));
    document.getElementById('restart-pcr-btn')?.addEventListener('click', restartPCRAfterROSC);

    document.querySelectorAll('#rhythm-selector-screen .rhythm-option-btn').forEach(btn => {
        btn.addEventListener('click', function() { selectRhythmOption(this); });
    });
    document.getElementById('submit-rhythm-selection-btn')?.addEventListener('click', processRhythmSelection);
    document.getElementById('apply-shock-btn')?.addEventListener('click', applyShockAndResume);

    document.getElementById('med-btn')?.addEventListener('click', showMedModal);
    
    document.querySelectorAll('.med-btn-pro').forEach(button => {
        button.addEventListener('click', () => selectMedication(button.dataset.med));
    });
    for (const id of ['medication-dose', 'medication-unit', 'medication-confirmed', 'medication-effective-at']) {
        for (const event of ['input', 'change']) document.getElementById(id)?.addEventListener(event, () => {
            if (id !== 'medication-confirmed') document.getElementById('medication-confirmed').checked = false;
            clearCareFeedback('medication-form-feedback'); updateMedicationDose();
        });
    }
    document.getElementById('medication-weight')?.addEventListener('input', () => clearCareFeedback('medication-form-feedback'));

    document.getElementById('record-med-btn')?.addEventListener('click', recordMedication);
    document.getElementById('confirm-medication-weight')?.addEventListener('click', confirmMedicationWeight);
    const reviewChangedAdministration = () => {
        document.getElementById('medication-confirmed').checked = false;
        clearCareFeedback('medication-form-feedback'); updateMedicationDose();
    };
    document.getElementById('medication-timing')?.addEventListener('change', reviewChangedAdministration);
    document.querySelectorAll('input[name="administration-route"]').forEach(input => input.addEventListener('change', reviewChangedAdministration));
    document.getElementById('cancel-med-btn')?.addEventListener('click', cancelMedicationRecord);

    document.getElementById('notes-btn')?.addEventListener('click', showNotesModal);
    document.getElementById('save-notes-btn')?.addEventListener('click', saveNotes);
    document.getElementById('cancel-notes-btn')?.addEventListener('click', () => closeModal('notes-modal'));

    document.getElementById('record-vitals-btn')?.addEventListener('click', recordVitals);
    document.getElementById('cancel-vitals-btn')?.addEventListener('click', skipPostRceVitals);
    document.getElementById('close-vitals-btn')?.addEventListener('click', closeVitalsModal);
    document.querySelectorAll('#vitals-modal input, #vitals-modal textarea').forEach(input => {
        input.addEventListener('input', () => clearCareFeedback('vitals-form-feedback'));
    });

    document.getElementById('finish-pcr-btn')?.addEventListener('click', showFinishAttendance);
    document.getElementById('finish-attendance-close')?.addEventListener('click', closeFinishAttendance);
    document.getElementById('save-glasgow-btn')?.addEventListener('click', saveGlasgow);
    document.getElementById('close-glasgow-btn')?.addEventListener('click', () => closeModal('glasgow-modal'));

    // 4. Autenticação e Perfil
    initializeRegistrationFields();
    document.getElementById('register-profession')?.addEventListener('change', updateRegistrationProfession);
    document.getElementById('register-council')?.addEventListener('input', event => event.target.setCustomValidity(''));
    document.getElementById('register-council-state')?.addEventListener('change', event => event.target.setCustomValidity(''));
    for (const id of ['register-password', 'register-password-confirm']) document.getElementById(id)?.addEventListener('input', validateRegistrationPasswords);
    document.getElementById('register-form-full')?.addEventListener('reset', () => queueMicrotask(() => {
        updateRegistrationProfession();
        document.getElementById('register-password-confirm')?.setCustomValidity('');
    }));
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('login-form-simple')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form-full')?.addEventListener('submit', handleRegistrationFromForm);
    document.getElementById('profile-update-form')?.addEventListener('submit', handleProfileUpdate);
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    document.getElementById('cancel-profile-btn')?.addEventListener('click', () => closeModal('profile-modal'));
    document.getElementById('open-login-btn')?.addEventListener('click', showLoginModal);
    document.getElementById('open-register-btn')?.addEventListener('click', showRegistrationModal);
    document.querySelectorAll('[data-auth-view="register"]').forEach(button => button.addEventListener('click', showRegistrationModal));
    document.querySelectorAll('[data-auth-view="login"]').forEach(button => button.addEventListener('click', showLoginModal));
    document.querySelectorAll('[data-close-modal]').forEach(button => {
        button.addEventListener('click', () => closeModal(button.closest('.modal').id));
    });
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', event => {
            if (event.target === modal) {
                if (modal.id === 'finish-attendance-modal') closeFinishAttendance();
                else if (modal.id === 'vitals-modal') closeVitalsModal();
                else closeModal(modal.id);
            }
        });
    });
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
        if (handleFinishAttendanceKey(e)) return;
        if (handleVitalsKey(e)) return;
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable)) return;

        switch (e.code) {
            case 'KeyC': {
                // The shortcut follows the same visible control, never a hidden
                // screen/modal, copy shortcut, or held key that could toggle RCP.
                if (e.repeat || e.ctrlKey || e.metaKey || e.altKey
                    || !document.getElementById('pcr-screen')?.classList.contains('active')
                    || document.querySelector('.modal.show')) break;
                const compBtn = document.getElementById('compressions-btn');
                if (compBtn && !compBtn.disabled) { e.preventDefault(); handleCompressionAction(); }
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
