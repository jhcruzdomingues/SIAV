import { state, intervals, compressionCycle } from '../config/state.js';
import { closeModal, openModal, showTransientAlert } from '../ui/dom.js';

const MEDICATION_DOSES = {
    adrenalina: { adult: '1 mg EV/IO a cada 3-5 minutos', pediatric: '0.01 mg/kg EV/IO' },
    amiodarona: { adult: '1ª dose: 300 mg EV/IO. 2ª dose: 150 mg EV/IO', pediatric: '5 mg/kg EV/IO em bolus' },
    atropina: { adult: '1 mg EV/IO a cada 3-5 minutos (máx. 3 mg)', pediatric: '0.02 mg/kg EV/IO (mín. 0.1 mg / máx. 0.5 mg)' },
    bicarbonato: { adult: '1 mEq/kg', pediatric: '1 mEq/kg (raramente usado)' },
    lidocaina: { adult: '1-1.5 mg/kg', pediatric: '1 mg/kg' },
    sulfato: { adult: '1-2 g IV/IO (Torçada de Pontas)', pediatric: '25-50 mg/kg (máx. 2g)' }
};

export function showMedModal() {
    const medDose = document.getElementById('medication-dose');
    const medSelect = document.getElementById('medication-select');
    const recordBtn = document.getElementById('record-med-btn');
    const previewPanel = document.getElementById('med-preview-panel');

    if(medDose) medDose.value = '';
    if(medSelect) medSelect.value = '';
    if(previewPanel) previewPanel.style.display = 'none';
    
    if(recordBtn) {
        recordBtn.disabled = true;
        const subText = recordBtn.querySelector('.sub-text');
        if(subText) subText.textContent = 'Selecione uma droga primeiro';
    }
     
    document.querySelectorAll('.med-btn-pro').forEach(btn => {
        btn.classList.remove('selected');
    });

    openModal('med-modal');
}

export function updateMedicationDose() {
    const medication = document.getElementById('medication-select')?.value;
    const weight = parseInt(state.patient.weight) || 70;
    const age = parseInt(state.patient.age) || 30;
    const isPediatric = age < 8 || weight < 30;
    
    let doseText = '--';
    
    if (medication && MEDICATION_DOSES[medication]) {
        if (isPediatric) {
            const calculatedDoses = window.MedicalBrain.getCalculatedPediatricValues(weight); 
            doseText = MEDICATION_DOSES[medication].pediatric; 
            
            if (medication === 'adrenalina') {
                doseText = `${calculatedDoses.adrenalina} mg (0.01 mg/kg)`;
            } else if (medication === 'amiodarona') {
                doseText = `${calculatedDoses.amiodarona} mg (5 mg/kg)`;
            } else if (medication === 'lidocaina') {
                 doseText = `${calculatedDoses.lidocaina} mg (1 mg/kg)`;
            }
        } else {
            doseText = MEDICATION_DOSES[medication].adult;
             if (medication === 'lidocaina') {
                const attackDose = (weight * 1.5).toFixed(0);
                doseText = `Ataque: ${attackDose} mg (1-1.5 mg/kg)`;
            }
        }
    }
    
    const medDose = document.getElementById('medication-dose');
    const previewValue = document.getElementById('med-preview-value');
    const previewName = document.getElementById('med-preview-name');
    const previewPanel = document.getElementById('med-preview-panel');
    const recordBtn = document.getElementById('record-med-btn');
    
    if(medDose) medDose.value = doseText;
    if(previewValue) previewValue.textContent = doseText;
    
    if(medication) {
        if(previewName) {
            const medNames = { 'adrenalina': 'Adrenalina', 'amiodarona': 'Amiodarona', 'lidocaina': 'Lidocaína', 'atropina': 'Atropina', 'bicarbonato': 'Bicarbonato', 'sulfato': 'Sulfato de Mg' };
            previewName.textContent = medNames[medication] || medication;
        }
        if(previewPanel) previewPanel.style.display = 'block';
        if(recordBtn) {
            recordBtn.disabled = false;
            const subText = recordBtn.querySelector('.sub-text');
            if(subText) subText.textContent = 'Clique para confirmar';
        }
    }
}

export function recordMedication() {
    try {
        const medicationSelect = document.getElementById('medication-select');
        const doseInput = document.getElementById('medication-dose');
        const routeElement = document.querySelector('input[name="administration-route"]:checked');

        if (!medicationSelect || !doseInput) {
            showTransientAlert('Erro: Campos de medicação não encontrados.', 'danger');
            return;
        }

        const medication = medicationSelect.value;
        const dose = doseInput.value.trim();
        const route = routeElement ? routeElement.value : 'N/I';

        if (!medication) { showTransientAlert('Selecione uma medicação!', 'warning'); return; }
        if (!dose || dose === '--') { showTransientAlert('Dose da medicação inválida.', 'warning'); return; }
        if (dose.length > 100) { showTransientAlert('Dose muito longa! Máximo de 100 caracteres.', 'warning'); return; }

        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
        if (typeof window.playSystemSound === 'function') window.playSystemSound('drug');

        const medNames = {
            'adrenalina': 'Adrenalina', 'amiodarona': 'Amiodarona', 'atropina': 'Atropina',
            'bicarbonato': 'Bicarbonato de Sodio', 'lidocaina': 'Lidocaina', 'sulfato': 'Sulfato de Magnesio'
        };

        const medicationName = medNames[medication] || medication;

        state.medications.push({
            name: medicationName, dose: dose, route: route,
            time: new Date(), timestamp: Date.now()
        });

        if (typeof window.playNotification === 'function') window.playNotification('DRUG');
        if (typeof window.addEvent === 'function') window.addEvent(`MEDICACAO: ${medicationName} - ${dose} via ${route}`, 'critical');
        
        closeModal('med-modal');

        if (typeof window.updatePcrGuidance === 'function') window.updatePcrGuidance();
        startDrugTimer();

        showTransientAlert(`${medicationName} administrado com sucesso!`, 'success', 4000);
    } catch (error) {
        console.error('Erro ao registrar medicacao:', error);
        showTransientAlert('Erro ao registrar medicação. Por favor, tente novamente.', 'danger');
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
    if (!state.pcrActive || compressionCycle.lastRhythmWasShockable === undefined) return;
    const labelEl = document.getElementById('ac-drug-timer-label');
    const countdownEl = document.getElementById('ac-drug-countdown');
    if (!labelEl || !countdownEl) return;

    const pcrStateSnapshot = { currentPhase: compressionCycle.currentPhase, isShockable: compressionCycle.lastRhythmWasShockable, medications: state.medications || [], currentCycle: compressionCycle.cycleCount, shockCount: state.shockCount, elapsedSeconds: state.pcrSeconds };
    const nextStep = window.MedicalBrain.getProtocolNextStep(pcrStateSnapshot);
    const isDrugStep = nextStep && (nextStep.criticalAction === 'DRUG' || nextStep.message.includes('Adrenalina') || nextStep.message.includes('Amiodarona'));

    if (isDrugStep) {
        const medName = nextStep.message.split('—')[0].trim() || 'MEDICAÇÃO';
        labelEl.textContent = medName.toUpperCase();
        countdownEl.textContent = 'DEVIDA';
        countdownEl.className = 'ac-timer-value due';
    } else {
        // Conta adrenalina em background mesmo durante a RCP
        const adrenalineStatus = window.MedicalBrain.getMedicationDueStatus('Adrenalina', 180, state.medications);
        const hasAdrenaline = state.medications.some(m => m.name.includes('Adrenalina'));
        
        labelEl.textContent = 'ADRENALINA';
        
        if (hasAdrenaline && adrenalineStatus && adrenalineStatus.secondsUntilDue > 0) {
            const mins = Math.floor(adrenalineStatus.secondsUntilDue / 60);
            const secs = Math.floor(adrenalineStatus.secondsUntilDue % 60);
            countdownEl.textContent = `0${mins}:${secs.toString().padStart(2, '0')}`;
            countdownEl.className = 'ac-timer-value';
        } else if (!hasAdrenaline) {
            countdownEl.textContent = 'PREPARAR';
            countdownEl.className = 'ac-timer-value ok';
        } else {
            countdownEl.textContent = 'DEVIDA';
            countdownEl.className = 'ac-timer-value due';
        }
    }
}