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
    const checklistEl = document.getElementById('protocol-checklist');
    if (checklistEl) checklistEl.innerHTML = '';

    const hintBox = document.getElementById('protocol-hint-box');
    const hintMessage = document.getElementById('hint-message');
    const hintIcon = document.getElementById('hint-icon');
    const currentStep = document.getElementById('current-step');
    const cycleInfo = document.getElementById('cycle-info');
    const progressBar = document.getElementById('cycle-progress');
    const compBtn = document.getElementById('compressions-btn');
    
    if (!hintBox || !hintMessage || !hintIcon || !currentStep || !cycleInfo || !progressBar || !compBtn) return;

    const pcrStateSnapshot = {
        currentPhase: compressionCycle.currentPhase,
        isShockable: compressionCycle.lastRhythmWasShockable,
        medications: state.medications || [],
        currentCycle: compressionCycle.cycleCount,
        shockCount: state.shockCount,
        elapsedSeconds: state.pcrSeconds
    };

    const protocolStep = window.MedicalBrain.getProtocolNextStep(pcrStateSnapshot);
    
    let iconClass = 'fas fa-heartbeat', iconColor = '#e74c3c';
    switch(compressionCycle.currentPhase) {
        case 'preparation': iconClass = 'fas fa-heartbeat'; iconColor = '#e74c3c'; break;
        case 'compressions': iconClass = 'fas fa-hands-helping'; iconColor = '#27ae60'; break;
        case 'rhythm_check': iconClass = 'fas fa-wave-square'; iconColor = '#2980b9'; break;
        case 'shock_advised': iconClass = 'fas fa-bolt'; iconColor = '#f1c40f'; break;
    }

    hintBox.className = `protocol-hint-box improved-panel protocol-panel-mobile improved-panel-mobile ${protocolStep.style || ''}`;
    hintMessage.textContent = protocolStep.message;
    hintMessage.className = `protocol-panel-message highlight-message`;
    hintIcon.innerHTML = `<i class="${iconClass}" style="color:${iconColor}"></i>`;
    currentStep.textContent = '';
    currentStep.className = `protocol-panel-step step-highlight`;
    
    const alertTip = document.getElementById('alert-tip');
    if (alertTip) alertTip.style.display = 'none';
    const hintDetails = document.getElementById('hint-details');
    if (hintDetails) hintDetails.innerHTML = '';

    let currentStepMessage = '', cycleInfoText = '', progressBarColor = 'var(--primary)', compBtnText = '', compBtnStyle = '';

    switch(compressionCycle.currentPhase) {
        case 'preparation':
            currentStepMessage = 'Aguardando início'; cycleInfoText = 'Ciclo 0'; progressBar.style.width = '0%';
            progressBarColor = 'var(--primary)'; compBtnText = 'INICIAR COMPRESSÕES'; compBtnStyle = 'linear-gradient(135deg, var(--success), #219a52)';
            compBtn.disabled = false; break;
        case 'compressions':
            currentStepMessage = `Compressões contínuas • ${state.bpm} BPM`; cycleInfoText = `Ciclo ${compressionCycle.cycleCount}`;
            progressBar.style.width = `${compressionCycle.cycleProgress}%`; progressBarColor = 'var(--primary)';
            compBtnText = 'RCP EM ANDAMENTO'; compBtnStyle = 'linear-gradient(135deg, var(--warning), #e67e22)';
            compBtn.disabled = true; hintBox.classList.add('compressions'); break;
        case 'rhythm_check':
            currentStepMessage = 'Avaliar ritmo e pulso (≤10s)'; cycleInfoText = `Ciclo ${compressionCycle.cycleCount}`;
            progressBar.style.width = '0%'; progressBarColor = 'var(--danger)'; compBtnText = 'RETOMAR COMPRESSÕES';
            compBtnStyle = 'linear-gradient(135deg, var(--success), #219a52)'; compBtn.disabled = false;
            hintBox.classList.add('rhythm-check'); break;
        case 'shock_advised':
            currentStepMessage = 'Afastar e desfibrilar'; cycleInfoText = `Ciclo ${compressionCycle.cycleCount}`;
            progressBar.style.width = '0%'; progressBarColor = 'var(--danger)'; compBtnText = 'RETOMAR COMPRESSÕES';
            compBtnStyle = 'linear-gradient(135deg, var(--success), #219a52)'; compBtn.disabled = false;
            hintBox.classList.add('shock-advised'); break;
    }
    
    currentStep.textContent = currentStepMessage;
    cycleInfo.textContent = cycleInfoText;
    progressBar.style.backgroundColor = progressBarColor;
    compBtn.innerHTML = `<span>💪</span><span>${compBtnText}</span>`;
    compBtn.style.background = compBtnStyle;

    if (compressionCycle.currentPhase !== 'compressions') hintBox.classList.remove('compressions');
    if (compressionCycle.currentPhase !== 'rhythm_check') hintBox.classList.remove('rhythm-check');
    if (compressionCycle.currentPhase !== 'shock_advised') hintBox.classList.remove('shock-advised');
}