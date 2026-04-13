import { state, compressionCycle } from '../config/state.js';
import { showScreen } from '../ui/dom.js';

export function showRhythmSelectorScreen(isCycleCheck = false) {
    if (isCycleCheck) {
        const notesInput = document.getElementById('selector-rhythm-notes');
        if (notesInput) notesInput.value = '';
    }
    
    document.querySelectorAll('#rhythm-selector-screen .rhythm-option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    state.tempRhythmData.rhythm = null;
    state.tempRhythmData.notes = null;

    showScreen('rhythm-selector');
}

export function selectRhythmOption(element) {
    const rhythm = element.getAttribute('data-rhythm');
    const isAlreadySelected = element.classList.contains('selected');
    
    if (isAlreadySelected) {
        processRhythmSelection();
    } else {
        document.querySelectorAll('#rhythm-selector-screen .rhythm-option-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        element.classList.add('selected');
        state.tempRhythmData.rhythm = rhythm;
    }
}

export function processRhythmSelection() {
    const rhythm = state.tempRhythmData.rhythm;
    const notesInput = document.getElementById('selector-rhythm-notes');
    const notes = notesInput ? notesInput.value : '';

    if (!rhythm) {
        if (typeof window.showTransientAlert === 'function') window.showTransientAlert('Por favor, selecione um ritmo cardíaco.', 'warning', 3000);
        return;
    }
    
    const rhythmNames = {
        'FV': 'Fibrilação Ventricular',
        'TVSP': 'Taquicardia Ventricular s/ Pulso',
        'AESP': 'Atividade Elétrica sem Pulso (AESP)',
        'Assistolia': 'Assistolia',
        'Ritmo': 'Ritmo de Perfusão (ROSC)' 
    };
    
    state.rhythms.push({
        type: rhythm,
        name: rhythmNames[rhythm],
        notes: notes,
        time: new Date()
    });
    
    let eventText = `Ritmo: ${rhythmNames[rhythm]}`;
    if (notes) {
        eventText += ` | Notas: ${notes}`;
    }
    if (typeof window.addEvent === 'function') window.addEvent(eventText, 'critical');

    const isShockableRhythm = rhythm === 'FV' || rhythm === 'TVSP';
    compressionCycle.lastRhythmWasShockable = isShockableRhythm;
    
    if (typeof window.startDrugTimer === 'function') window.startDrugTimer();
    
    if (isShockableRhythm) {
        compressionCycle.currentPhase = 'shock_advised';
        if (typeof window.playNotification === 'function') window.playNotification('SHOCK');
        
        setupShockActionScreen(rhythmNames[rhythm]);
        showScreen('shock-action');
        
    } else {
        if (typeof window.playNotification === 'function') window.playNotification('DRUG'); 
        const msg = `Ritmo Não-Chocável Detectado (${rhythmNames[rhythm]}). 1. Retomar compressões IMEDIATAMENTE. 2. Foco nos 5 H's e 5 T's.`;
        if (typeof window.addEvent === 'function') window.addEvent(msg, 'critical');
        if (typeof window.startCompressions === 'function') window.startCompressions();
        showScreen('pcr');
    }
}

export function setupShockActionScreen(rhythmType) {
    const rhythmDisplay = document.getElementById('final-shock-rhythm');
    const energyRecommendation = document.getElementById('shock-rec-display');
    const energyDetails = document.getElementById('shock-rec-details');
    const energyButtonsContainer = document.getElementById('shock-buttons-grid');
    const appliedEnergyInput = document.getElementById('shock-applied-energy');
    const applyBtn = document.getElementById('apply-shock-btn');
    
    const { recommendedEnergy, energies, doseDetails } = window.MedicalBrain.getShockRecommendation(state.patient, state.shockCount, rhythmType);
    
    if (rhythmDisplay) rhythmDisplay.textContent = rhythmType;
    if (energyRecommendation) energyRecommendation.textContent = recommendedEnergy;
    if (energyDetails) energyDetails.textContent = doseDetails;
    
    const initialDose = parseInt(recommendedEnergy.replace(/[^0-9]/g, '')) || '';
    if (appliedEnergyInput) appliedEnergyInput.value = initialDose;
    
    if (energyButtonsContainer) {
        energyButtonsContainer.innerHTML = '';
        energies.forEach((energy) => {
            const btn = document.createElement('button');
            btn.className = 'energy-btn';
            btn.type = 'button';
            btn.textContent = energy;

            btn.addEventListener('click', () => {
                document.querySelectorAll('#shock-buttons-grid .energy-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                if (appliedEnergyInput) appliedEnergyInput.value = parseInt(energy.replace(/[^0-9]/g, ''));
                if (applyBtn) applyBtn.disabled = false;
            });

            energyButtonsContainer.appendChild(btn);

            const energyValue = parseInt(energy.replace(/[^0-9]/g, ''));
            const recommendedValue = parseInt(recommendedEnergy.replace(/[^0-9]/g, ''));
            if (energyValue === recommendedValue) {
                setTimeout(() => {
                    btn.classList.add('selected');
                    if (appliedEnergyInput) appliedEnergyInput.value = energyValue;
                    if (applyBtn) applyBtn.disabled = false;
                }, 0);
            }
        });
    }

    if ((!energies || energies.length === 0) && appliedEnergyInput) {
        appliedEnergyInput.value = '';
        if (applyBtn) applyBtn.disabled = true;
    }

    if (appliedEnergyInput) {
        appliedEnergyInput.removeEventListener && appliedEnergyInput.removeEventListener('input', null);
        appliedEnergyInput.addEventListener('input', () => {
            const val = parseInt(appliedEnergyInput.value);
            if (applyBtn) applyBtn.disabled = !(val && val > 0);
        });
    }
}

export function applyShockAndResume() {
    if (typeof window.feedbackCritico === 'function') window.feedbackCritico('apply-shock-btn');
    try {
        const rhythmTypeDisplay = document.getElementById('final-shock-rhythm');
        const energyInput = document.getElementById('shock-applied-energy');

        if (!energyInput) {
            alert('Erro: Campo de energia nao encontrado.');
            return;
        }

        const rhythmType = rhythmTypeDisplay ? rhythmTypeDisplay.textContent : 'N/I';
        const appliedEnergy = energyInput.value.trim();

        if (!appliedEnergy) {
            if (typeof window.showTransientAlert === 'function') window.showTransientAlert('Informe a energia aplicada em Joule para registrar!', 'warning', 3000);
            return;
        }

        const energyValue = parseInt(appliedEnergy);
        if (isNaN(energyValue) || energyValue <= 0) {
            if (typeof window.showTransientAlert === 'function') window.showTransientAlert('Energia deve ser um numero positivo!', 'warning', 3000);
            return;
        }

        if (energyValue > 360) {
            if (!confirm('Energia acima de 360J. Confirmar este valor?')) return;
        }

        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
        if (typeof window.playSystemSound === 'function') window.playSystemSound('shock');

        state.shockCount++;
        let shockText = `CHOQUE #${state.shockCount} - ${rhythmType} - ${energyValue}J`;
        if (typeof window.addEvent === 'function') window.addEvent(shockText, 'critical');

        const shockMsg = `CHOQUE APLICADO (${energyValue}J) - Retomar RCP!`;
        if (typeof window.addEvent === 'function') window.addEvent(shockMsg, 'critical');
        if (typeof window.showTransientAlert === 'function') window.showTransientAlert(shockMsg, 'success', 4000);

        if (typeof window.updatePcrGuidance === 'function') window.updatePcrGuidance();
        if (typeof window.startCompressions === 'function') window.startCompressions(); 
        showScreen('pcr');
    } catch (error) {
        console.error('Erro ao aplicar choque:', error);
        alert('Erro ao registrar choque. Por favor, tente novamente.');
    }
}

export function roscObtido() {
    if (typeof window.feedbackCritico === 'function') window.feedbackCritico('rosc-btn');
    if (!state.pcrActive) {
        if (typeof window.showTransientAlert === 'function') window.showTransientAlert("Inicie um atendimento de PCR para registrar o ROSC.", 'warning', 3000);
        return;
    }
    
    if (!confirm("CONFIRMAR: O paciente obteve Retorno da Circulação Espontânea (RCE/ROSC)?")) return;
    
    state.roscAchieved = true;
    if (typeof window.addEvent === 'function') window.addEvent('ROSC OBTIDO - Pulso presente, Circulação Espontânea', 'success');
    
    if (typeof window.showTransientAlert === 'function') window.showTransientAlert('✅ ROSC OBTIDO! Finalizando RCP e iniciando Cuidados Pós-PCR.', 'success', 4000);
    if (typeof window.finishPCR === 'function') window.finishPCR();
}