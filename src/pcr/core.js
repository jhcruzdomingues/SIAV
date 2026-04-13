import { state, compressionCycle, intervals } from '../config/state.js';
import { TIMINGS } from '../config/constants.js';
import { formatTime } from '../utils/formatters.js';
import { events } from '../utils/events.js';

export function clearAllIntervals() {
    const intervalKeys = Object.keys(intervals);
    intervalKeys.forEach(key => {
        if (intervals[key]) {
            if (key === 'cycleTimer') {
                clearTimeout(intervals[key]);
            } else {
                clearInterval(intervals[key]);
            }
            intervals[key] = null;
        }
    });
    
    if (compressionCycle.cycleTimer) {
        clearTimeout(compressionCycle.cycleTimer);
        compressionCycle.cycleTimer = null;
    }
}

export function startTimer() {
    if (intervals.timer) clearInterval(intervals.timer);
    
    intervals.timer = setInterval(() => {
        const pcrTimer = document.getElementById('pcr-timer');
        state.pcrSeconds++;
        const hours = Math.floor(state.pcrSeconds / 3600);
        const minutes = Math.floor((state.pcrSeconds % 3600) / 60);
        const seconds = state.pcrSeconds % 60;
        
        if (hours > 0) {
            if(pcrTimer) pcrTimer.textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            if(pcrTimer) pcrTimer.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
            
        if (typeof window.updatePcrGuidance === 'function') window.updatePcrGuidance();
    }, 1000);
}

export function startCycleProgress() {
    if (!compressionCycle.active) return;
    
    const progressBar = document.getElementById('ac-cycle-progress');
    const timerDisplay = document.getElementById('ac-cycle-timer-display');
    
    if (intervals.progress) {
        clearInterval(intervals.progress);
        intervals.progress = null;
    }
    
    if (progressBar) progressBar.style.width = '0%';
    if (timerDisplay) timerDisplay.textContent = '02:00';
    
    compressionCycle.cycleProgress = 0;
    compressionCycle.startTime = Date.now();
    
    intervals.progress = setInterval(() => {
        if (!compressionCycle.active || compressionCycle.currentPhase !== 'compressions') {
            clearInterval(intervals.progress);
            intervals.progress = null;
            if (progressBar) progressBar.style.width = '0%';
            if (timerDisplay) timerDisplay.textContent = '--:--';
            return;
        }
        
        const elapsed = Date.now() - compressionCycle.startTime;
        let progress = (elapsed / TIMINGS.CYCLE_DURATION) * 100;
        
        let remainingMs = TIMINGS.CYCLE_DURATION - elapsed;
        if (remainingMs < 0) remainingMs = 0;
        let remainingSecs = Math.ceil(remainingMs / 1000);
        let mins = Math.floor(remainingSecs / 60);
        let secs = remainingSecs % 60;
        
        if (timerDisplay) timerDisplay.textContent = `0${mins}:${secs.toString().padStart(2, '0')}`;
        
        if (progress >= 100) {
            progress = 100;
            clearInterval(intervals.progress);
            intervals.progress = null;
            if (timerDisplay) timerDisplay.textContent = '00:00';
        }
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        compressionCycle.cycleProgress = progress;
        
    }, 100);
}

export function startCompressions() {
    if (typeof window.feedbackCritico === 'function') window.feedbackCritico('compressions-btn');
    if (compressionCycle.currentPhase === 'compressions') return;
    if (compressionCycle.cycleTimer) clearTimeout(compressionCycle.cycleTimer);

    compressionCycle.active = true;
    compressionCycle.rhythmCheckTriggered = false;
    compressionCycle.startTime = Date.now();
    
    if (compressionCycle.currentPhase === 'preparation') {
        compressionCycle.cycleCount = 1; 
    } else if (compressionCycle.currentPhase === 'rhythm_check' || compressionCycle.currentPhase === 'shock_advised') {
        compressionCycle.cycleCount++; 
    }

    compressionCycle.currentPhase = 'compressions';
    compressionCycle.cycleProgress = 0;
    
    if (typeof window.updatePcrGuidance === 'function') window.updatePcrGuidance(); 
    
    if (!state.metronomeActive && !state.metronomeUserDisabled) {
        if (typeof window.toggleMetronome === 'function') window.toggleMetronome();
    }

    if (typeof window.addEvent === 'function') window.addEvent(`INÍCIO DE RCP - Ciclo ${compressionCycle.cycleCount} iniciado (2 min)`, 'critical');
    startCycleProgress();
    
    compressionCycle.cycleTimer = setTimeout(() => {
        if (compressionCycle.active && !compressionCycle.rhythmCheckTriggered) {
            promptRhythmCheck();
        }
    }, TIMINGS.CYCLE_DURATION);
}

export function promptRhythmCheck() {
    if (compressionCycle.rhythmCheckTriggered) return;
    compressionCycle.rhythmCheckTriggered = true;

    compressionCycle.currentPhase = 'rhythm_check';
    compressionCycle.active = false;
    if (typeof window.updatePcrGuidance === 'function') window.updatePcrGuidance(); 

    const cycleDuration = Date.now() - compressionCycle.startTime;
    state.totalCompressionSeconds += Math.floor(cycleDuration / 1000);
    
    if ('vibrate' in navigator) {
        navigator.vibrate([50, 100, 50]);
    }

    if (typeof window.playSystemSound === 'function') {
        window.playSystemSound('alert');
    }

    if (typeof window.playNotification === 'function') window.playNotification('CHECK_RHYTHM');
    if (typeof window.addEvent === 'function') window.addEvent('PAUSA DE RCP: Fim do ciclo de 2 min. Analisar Ritmo e Pulso.', 'critical');
    
    setTimeout(() => {
        if (compressionCycle.currentPhase === 'rhythm_check' && compressionCycle.rhythmCheckTriggered) {
            if (typeof window.showRhythmSelectorScreen === 'function') window.showRhythmSelectorScreen(true);
        }
    }, 1500);
}

export function startPCR() {
    if (state.pcrActive) {
        console.warn('PCR já está ativa. Finalize o atendimento atual antes de iniciar outro.');
        return;
    }

    state.pcrActive = true;
    state.pcrStartTime = Date.now();
    state.pcrSeconds = 0;

    state.events = [];
    state.shockCount = 0;
    state.medications = [];
    state.rhythms = [];
    state.causesChecked = [];
    state.totalCompressionSeconds = 0; 
    state.roscAchieved = false; 
    state.metronomeUserDisabled = false;
    
    compressionCycle.active = false;
    compressionCycle.startTime = null;
    compressionCycle.cycleCount = 0;
    compressionCycle.currentPhase = 'preparation';
    compressionCycle.cycleTimer = null;
    compressionCycle.cycleProgress = 0;
    compressionCycle.compressionTime = 0;
    compressionCycle.pauseStartTime = null;
    compressionCycle.lastRhythmWasShockable = undefined;
    compressionCycle.rhythmCheckTriggered = false;

    if (intervals.progress) clearInterval(intervals.progress);
    const progressBar = document.getElementById('ac-cycle-progress');
    if(progressBar) progressBar.style.width = '0%';

    const cycleTimerDisplay = document.getElementById('ac-cycle-timer-display');
    if(cycleTimerDisplay) cycleTimerDisplay.textContent = '--:--';

    const pcrTimerDisplay = document.getElementById('pcr-timer');
    if(pcrTimerDisplay) pcrTimerDisplay.textContent = '00:00';

    if (typeof window.updateTimeline === 'function') window.updateTimeline();

    const compBtn = document.getElementById('compressions-btn');
    if(compBtn){
        compBtn.innerHTML = '<span>💪</span><span>INICIAR COMPRESSÕES</span>';
        compBtn.style.background = 'linear-gradient(135deg, var(--success), #219a52)';
        compBtn.disabled = false;
    }

    if (typeof window.addEvent === 'function') window.addEvent('INÍCIO: PCR iniciada', 'critical');
    if (typeof window.showScreen === 'function') window.showScreen('pcr');
    startTimer();
    if (typeof window.updatePcrGuidance === 'function') window.updatePcrGuidance();
}

export function finishPCR() {
    if (typeof window.feedbackCritico === 'function') window.feedbackCritico('finish-pcr-btn');
    if (!state.pcrActive) {
        if (typeof window.showScreen === 'function') window.showScreen('home');
        return;
    }
    
    const confirmMsg = '⚠️ CONFIRMAR FINALIZAÇÃO DO ATENDIMENTO?\n\n';
    const details = `Total de PCR: ${formatTime(state.pcrSeconds)}\n`;
    const detailsShocks = `Choques: ${state.shockCount}\n`;
    const detailsMeds = `Medicações: ${state.medications.length}\n\n`;
    const warning = 'Esta ação não pode ser desfeita.';
    
    if (confirm(confirmMsg + details + detailsShocks + detailsMeds + warning)) {
        executePCRFinish();
    }
}

export function executePCRFinish() {
    const lastDuration = Date.now() - compressionCycle.startTime;
    if (compressionCycle.currentPhase === 'compressions') {
        state.totalCompressionSeconds += Math.floor(lastDuration / 1000);
    }
    
    state.pcrActive = false;
    compressionCycle.active = false;
    compressionCycle.rhythmCheckTriggered = false;

    clearAllIntervals();
    if (typeof window.stopDrugTimer === 'function') window.stopDrugTimer();
    if (state.metronomeActive) {
        if (typeof window.stopMetronome === 'function') window.stopMetronome();
    }
    
    if (typeof window.addEvent === 'function') window.addEvent('FINALIZAÇÃO: Atendimento de PCR finalizado', state.roscAchieved ? 'success' : 'critical');
    
    events.emit('PCR_FINISHED');
    
    if (typeof window.generateEvolution === 'function') window.generateEvolution(true);
}