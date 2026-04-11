import { state, intervals, compressionCycle } from '../config/state.js';
import { closeModal, showTransientAlert } from '../ui/dom.js';

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
    const medModal = document.getElementById('med-modal');

    if(medDose) medDose.value = '';
    if(medSelect) medSelect.value = '';
    if(medModal) medModal.classList.add('show');
    
    updateMedicationDose();
}

export function updateMedicationDose() {
    const medication = document.getElementById('medication-select')?.value;
    const weight = parseInt(state.patient.weight) || 70;
    const age = parseInt(state.patient.age) || 30;
    const isPediatric = age < 8 || weight < 30;
    
    let doseText = 'Selecione uma medicação';
    
    if (medication && MEDICATION_DOSES[medication]) {
        if (isPediatric) {
            const calculatedDoses = window.MedicalBrain.getCalculatedPediatricValues(weight); 
            doseText = MEDICATION_DOSES[medication].pediatric; 
            
            if (medication === 'adrenalina') {
                doseText = `${calculatedDoses.adrenalina} mg EV/IO (0.01 mg/kg)`;
            } else if (medication === 'amiodarona') {
                doseText = `${calculatedDoses.amiodarona} mg EV/IO (5 mg/kg)`;
            } else if (medication === 'lidocaina') {
                 doseText = `${calculatedDoses.lidocaina} mg EV/IO (1 mg/kg)`;
            }
        } else {
            doseText = MEDICATION_DOSES[medication].adult;
             if (medication === 'lidocaina') {
                const attackDose = (weight * 1.5).toFixed(0);
                doseText = `1-1.5 mg/kg (Ataque: ${attackDose} mg)`;
            }
        }
    }
    
    const medDose = document.getElementById('medication-dose');
    if(medDose) medDose.value = doseText;
}

export function recordMedication() {
    try {
        const medicationSelect = document.getElementById('medication-select');
        const doseInput = document.getElementById('medication-dose');
        const routeElement = document.querySelector('input[name="administration-route"]:checked');

        if (!medicationSelect || !doseInput) {
            alert('Erro: Campos de medicacao nao encontrados.');
            return;
        }

        const medication = medicationSelect.value;
        const dose = doseInput.value.trim();
        const route = routeElement ? routeElement.value : 'N/I';

        if (!medication) { alert('Selecione uma medicacao!'); return; }
        if (!dose) { alert('Digite a dose da medicacao!'); return; }
        if (dose.length > 50) { alert('Dose muito longa! Maximo de 50 caracteres.'); return; }

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

        showTransientAlert(`${medicationName} administrado com sucesso!`, 'success', 3000);
    } catch (error) {
        console.error('Erro ao registrar medicacao:', error);
        alert('Erro ao registrar medicacao. Por favor, tente novamente.');
    }
}

export function getOrCreateDrugTimerBox() {
    let box = document.getElementById('drug-timer-box');
    if (box) return box;
    const hintBox = document.getElementById('protocol-hint-box');
    if (!hintBox) return null;
    box = document.createElement('div');
    box.id = 'drug-timer-box';
    box.className = 'drug-timer-box';
    box.style.display = 'block';
    box.innerHTML = `<div class="drug-timer-content"><div class="drug-timer-info"><div id="drug-timer-value" class="drug-timer-value"></div><div id="drug-status-message" class="drug-status-message"></div></div></div>`;
    hintBox.appendChild(box);
    return box;
}

export function startDrugTimer() {
    if (intervals.drugTimer) clearInterval(intervals.drugTimer);
    const drugTimerBox = getOrCreateDrugTimerBox();
    if (drugTimerBox) drugTimerBox.style.display = 'block';
    updateDrugStatusDisplay();
    intervals.drugTimer = setInterval(updateDrugStatusDisplay, 1000);
}

export function stopDrugTimer() {
    if (intervals.drugTimer) { clearInterval(intervals.drugTimer); intervals.drugTimer = null; }
    const drugTimerBox = document.getElementById('drug-timer-box');
    if (drugTimerBox && drugTimerBox.parentNode) drugTimerBox.parentNode.removeChild(drugTimerBox);
}

export function updateDrugStatusDisplay() {
    if (!state.pcrActive || compressionCycle.lastRhythmWasShockable === undefined) return;
    const drugTimerBox = document.getElementById('drug-timer-box');
    const drugTimerValue = document.getElementById('drug-timer-value');
    const drugStatusMessage = document.getElementById('drug-status-message');
    if (!drugTimerBox || !drugTimerValue || !drugStatusMessage) return;

    const pcrStateSnapshot = { currentPhase: compressionCycle.currentPhase, isShockable: compressionCycle.lastRhythmWasShockable, medications: state.medications || [], currentCycle: compressionCycle.cycleCount, shockCount: state.shockCount, elapsedSeconds: state.pcrSeconds };
    const nextStep = window.MedicalBrain.getProtocolNextStep(pcrStateSnapshot);
    const isDrugStep = nextStep && (nextStep.criticalAction === 'DRUG' || nextStep.message.includes('Adrenalina') || nextStep.message.includes('Amiodarona'));

    if (isDrugStep) {
        const medName = nextStep.message.split('—')[0].trim() || 'Medicação';
        drugTimerValue.textContent = medName;
        const isDue = (nextStep.criticalAction === 'DRUG' && nextStep.message.includes('AGORA')) || nextStep.message.includes('DEVIDA') || nextStep.message.includes('URGENTE');
        drugStatusMessage.textContent = `${isDue ? '🔴' : '✓'} ${nextStep.message}`;
        drugStatusMessage.className = `drug-status-message ${isDue ? 'due' : 'ok'}`;
    } else if (drugTimerBox.parentNode) { drugTimerBox.parentNode.removeChild(drugTimerBox); }
}