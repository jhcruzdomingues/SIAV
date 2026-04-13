import { state, compressionCycle } from '../config/state.js';

export function feedbackCritico(btnId) {
    if ('vibrate' in navigator) navigator.vibrate([120, 60, 120]);
    if (btnId) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.classList.remove('feedback-critico-anim');
            void btn.offsetWidth; // force reflow
            btn.classList.add('feedback-critico-anim');
        }
    }
}

export function updatePcrGuidance() {
    const actionCenter = document.getElementById('pcr-action-center');
    const badge = document.getElementById('ac-status-badge');
    const cycleCounter = document.getElementById('ac-cycle-counter');
    const iconContainer = document.getElementById('ac-icon');
    const primaryText = document.getElementById('ac-primary-text');
    
    const compBtn = document.getElementById('compressions-btn');
    
    if (!actionCenter || !compBtn) return;

    const pcrStateSnapshot = {
        currentPhase: compressionCycle.currentPhase,
        isShockable: compressionCycle.lastRhythmWasShockable,
        medications: state.medications || [],
        currentCycle: compressionCycle.cycleCount,
        shockCount: state.shockCount,
        elapsedSeconds: state.pcrSeconds
    };

    const protocolStep = window.MedicalBrain.getProtocolNextStep(pcrStateSnapshot);
    
    let phaseClass = 'status-preparation';
    let badgeText = 'PREPARAÇÃO';
    let iconClass = 'fas fa-heartbeat';
    let compBtnText = 'INICIAR COMPRESSÕES';
    let compBtnStyle = 'linear-gradient(135deg, var(--success), #219a52)';

    switch(compressionCycle.currentPhase) {
        case 'preparation':
            phaseClass = 'status-preparation'; badgeText = 'PREPARAÇÃO'; iconClass = 'fas fa-heartbeat';
            compBtnText = 'INICIAR COMPRESSÕES'; compBtnStyle = 'linear-gradient(135deg, var(--success), #219a52)';
            compBtn.disabled = false; break;
        case 'compressions':
            phaseClass = 'status-compressions'; badgeText = 'RCP ATIVA'; iconClass = 'fas fa-hands-helping';
            compBtnText = 'RCP EM ANDAMENTO'; compBtnStyle = 'linear-gradient(135deg, var(--warning), #e67e22)';
            compBtn.disabled = true; break;
        case 'rhythm_check':
            phaseClass = 'status-rhythm'; badgeText = 'AVALIAÇÃO'; iconClass = 'fas fa-wave-square';
            compBtnText = 'RETOMAR COMPRESSÕES'; compBtnStyle = 'linear-gradient(135deg, var(--success), #219a52)'; 
            compBtn.disabled = false; break;
        case 'shock_advised':
            phaseClass = 'status-shock'; badgeText = 'AFASTAR!'; iconClass = 'fas fa-bolt';
            compBtnText = 'RETOMAR COMPRESSÕES'; compBtnStyle = 'linear-gradient(135deg, var(--success), #219a52)'; 
            compBtn.disabled = false; break;
    }
    
    // Override visual se for ação crítica de protocolo (Ex: Adrenalina Imediata)
    if (protocolStep.criticalAction === 'DRUG') {
        phaseClass = 'status-danger';
        badgeText = 'AÇÃO CRÍTICA';
        iconClass = 'fas fa-syringe';
    }

    // Aplica no DOM
    actionCenter.className = `pcr-action-center ${phaseClass}`;
    badge.textContent = badgeText;
    iconContainer.innerHTML = `<i class="${iconClass}"></i>`;
    
    // Formata o texto principal (HUD style)
    let mainTitle = protocolStep.message;
    if (mainTitle.includes('—')) {
        const parts = mainTitle.split('—');
        primaryText.innerHTML = `<span class="ac-title-main">${parts[0].trim()}</span> <span class="ac-title-sub">${parts[1].trim()}</span>`;
    } else if (mainTitle.includes(':')) {
        const parts = mainTitle.split(':');
        primaryText.innerHTML = `<span class="ac-title-main">${parts[0].trim()}</span> <span class="ac-title-sub">${parts[1].trim()}</span>`;
    } else {
        primaryText.textContent = mainTitle;
    }

    // Pega os containers fixos
    const doseContainer = document.getElementById('ac-dose-container');
    const doseText = document.getElementById('ac-dose-text');
    const detailsContainer = document.getElementById('ac-details-container');
    const detailsText = document.getElementById('ac-details-text');
    
    if (doseContainer && doseText) {
        if (protocolStep.dose) {
            doseText.textContent = protocolStep.dose;
            doseContainer.style.display = 'flex';
        } else {
            doseContainer.style.display = 'none';
        }
    }
    
    if (detailsContainer && detailsText) {
        if (protocolStep.details) {
            detailsText.textContent = protocolStep.details;
            detailsContainer.style.display = 'flex';
        } else {
            detailsContainer.style.display = 'none';
        }
    }

    cycleCounter.textContent = `CICLO ${compressionCycle.cycleCount}`;

    compBtn.innerHTML = `<span>💪</span><span>${compBtnText}</span>`;
    compBtn.style.background = compBtnStyle;
}