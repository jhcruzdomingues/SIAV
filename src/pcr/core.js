import { state, compressionCycle, intervals } from '../config/state.js';
import { TIMINGS } from '../config/constants.js';
import { formatTime } from '../utils/formatters.js';
import { events } from '../utils/events.js';
import { initializeClinicalArrest, isClinicalArrestActive } from './clinical.js';
import { resetTiming, startTimingEpisode, recordTimingMode, observeTiming, suspendTiming, closeTimingEpisode, syncTimingTotals } from './timing.js';

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

export function refreshPCRTime() {
    const observed = observeTiming();
    if (!observed && isClinicalArrestActive() && !compressionCycle.paused) {
        compressionCycle.paused = true;
        if (typeof window.stopMetronome === 'function') window.stopMetronome();
    }
    const summary = syncTimingTotals();
    const display = document.getElementById('pcr-timer');
    if (display) display.textContent = formatTime(state.pcrSeconds);
    const measurement = document.getElementById('compression-measurement');
    if (measurement) measurement.textContent = `Compressões registradas: ${formatTime(state.totalCompressionSeconds)} • Pausas registradas: ${formatTime(state.totalPauseSeconds)} • FCT: ${summary.fct === null ? 'N/I — medição incompleta ou sem duração' : summary.fct.toFixed(1) + '%'}`;
    if (typeof window.updatePcrGuidance === 'function') window.updatePcrGuidance();
}

export function startTimer() {
    if (intervals.timer) clearInterval(intervals.timer);
    refreshPCRTime();
    intervals.timer = setInterval(refreshPCRTime, 1000);
}

function updateCycleDisplay() {
    if (!compressionCycle.active) return;
    const remaining = Math.max(0, compressionCycle.deadline - Date.now());
    const display = document.getElementById('ac-cycle-timer-display');
    if (display) display.textContent = formatTime(Math.ceil(remaining / 1000));
    compressionCycle.cycleProgress = Math.min(100, (1 - remaining / TIMINGS.CYCLE_DURATION) * 100);
    const progress = document.getElementById('ac-cycle-progress');
    if (progress) progress.style.width = `${compressionCycle.cycleProgress}%`;
    if (!remaining && !document.hidden) promptRhythmCheck();
}

export function startCycleProgress() {
    if (intervals.progress) clearInterval(intervals.progress);
    updateCycleDisplay();
    if (compressionCycle.active) intervals.progress = setInterval(updateCycleDisplay, 100);
}

export function pauseCompressions() {
    if (!isClinicalArrestActive() || compressionCycle.currentPhase !== 'compressions' || compressionCycle.paused) return;
    recordTimingMode('pause', 'operator-pause');
    compressionCycle.paused = true;
    if (typeof window.stopMetronome === 'function') window.stopMetronome();
    if (typeof window.addEvent === 'function') window.addEvent('PAUSA DE COMPRESSÕES registrada pelo operador', 'normal');
    refreshPCRTime();
}

export function handleTimingVisibility() {
    if (!isClinicalArrestActive()) return;
    if (document.hidden) {
        suspendTiming();
        compressionCycle.paused = true;
        if (typeof window.stopMetronome === 'function') window.stopMetronome();
    } else {
        observeTiming();
        recordTimingMode('pause', 'return-to-tab');
        compressionCycle.paused = true;
        updateCycleDisplay();
    }
    refreshPCRTime();
}

export function handleTimingPageHide() {
    if (!isClinicalArrestActive()) return;
    suspendTiming('pagehide');
    compressionCycle.paused = true;
    if (typeof window.stopMetronome === 'function') window.stopMetronome();
}

export function startCompressions() {
    if (!isClinicalArrestActive()) return;
    if (document.hidden) { suspendTiming(); compressionCycle.paused = true; refreshPCRTime(); return; }
    if (typeof window.feedbackCritico === 'function') window.feedbackCritico('compressions-btn');
    const resume = compressionCycle.currentPhase === 'compressions';
    if (resume && !compressionCycle.paused) return;
    if (resume && Date.now() >= compressionCycle.deadline) { promptRhythmCheck(); return; }
    if (compressionCycle.cycleTimer) clearTimeout(compressionCycle.cycleTimer);

    compressionCycle.active = true;
    compressionCycle.paused = false;
    compressionCycle.rhythmCheckTriggered = false;
    if (!resume) {
        compressionCycle.startTime = Date.now();
        compressionCycle.deadline = compressionCycle.startTime + TIMINGS.CYCLE_DURATION;
        compressionCycle.cycleCount = compressionCycle.currentPhase === 'preparation' ? 1 : compressionCycle.cycleCount + 1;
    }
    recordTimingMode('compressions', resume ? 'operator-resume' : 'cycle-start');
    compressionCycle.currentPhase = 'compressions';
    compressionCycle.cycleProgress = 0;
    
    if (typeof window.updatePcrGuidance === 'function') window.updatePcrGuidance(); 
    
    if (!state.metronomeActive && !state.metronomeUserDisabled) {
        if (typeof window.toggleMetronome === 'function') window.toggleMetronome();
    }

    if (typeof window.addEvent === 'function') window.addEvent(resume ? `RETOMADA DE RCP - Ciclo ${compressionCycle.cycleCount}, prazo preservado` : `INÍCIO DE RCP - Ciclo ${compressionCycle.cycleCount} iniciado (2 min)`, 'critical');
    startCycleProgress();
    
    compressionCycle.cycleTimer = setTimeout(() => {
        if (compressionCycle.active && !compressionCycle.rhythmCheckTriggered) {
            promptRhythmCheck();
        }
    }, Math.max(0, compressionCycle.deadline - Date.now()));
}

export function promptRhythmCheck() {
    if (!isClinicalArrestActive()) return;
    if (compressionCycle.rhythmCheckTriggered) return;
    compressionCycle.rhythmCheckTriggered = true;

    compressionCycle.currentPhase = 'rhythm_check';
    compressionCycle.active = false;
    if (typeof window.updatePcrGuidance === 'function') window.updatePcrGuidance(); 

    recordTimingMode('pause', 'rhythm-check');
    compressionCycle.paused = true;
    if (intervals.progress) { clearInterval(intervals.progress); intervals.progress = null; }
    if (typeof window.stopMetronome === 'function') window.stopMetronome();
    refreshPCRTime();
    
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

    if ((state.roscAchieved || state.clinical?.status === 'rosc') && !confirm('Confirmar uma NOVA PCR em um novo atendimento após ROSC?')) return;

    state.pcrActive = true;
    state.pcrStartTime = Date.now();
    state.pcrSeconds = 0;

    state.events = [];
    state.shockCount = 0;
    state.shocks = [];
    state.medications = [];
    // Only a new encounter resets notes; ROSC recurrence preserves this collection.
    state.notes = [];
    const notesInput = document.getElementById('clinical-notes');
    if (notesInput) notesInput.value = '';
    state.rhythms = [];
    state.causesChecked = [];
    state.totalCompressionSeconds = 0; 
    state.roscAchieved = false; 
    initializeClinicalArrest();
    resetTiming(state.clinical.episodeId);
    state.metronomeUserDisabled = false;
    
    compressionCycle.active = false;
    compressionCycle.startTime = null;
    compressionCycle.deadline = null;
    compressionCycle.paused = false;
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
    closeTimingEpisode('encounter-end');
    syncTimingTotals();

    state.pcrActive = false;
    if (!state.clinical) state.clinical = { status: 'inactive' };
    if (state.clinical?.status !== 'rosc') state.clinical.status = 'inactive';
    state.clinical.pendingShock = null;
    compressionCycle.active = false;
    compressionCycle.rhythmCheckTriggered = false;

    clearAllIntervals();
    if (typeof window.stopDrugTimer === 'function') window.stopDrugTimer();
    if (state.metronomeActive) {
        if (typeof window.stopMetronome === 'function') window.stopMetronome();
    }
    
    if (typeof window.addEvent === 'function') window.addEvent('FINALIZAÇÃO: Atendimento de PCR finalizado', state.roscAchieved ? 'success' : 'critical');
    if (typeof window.updatePcrGuidance === 'function') window.updatePcrGuidance();
    
    events.emit('PCR_FINISHED');
    
    if (typeof window.generateEvolution === 'function') window.generateEvolution(true);
}

export function restartPCRAfterROSC() {
    if (!state.pcrActive || !state.roscAchieved || state.clinical?.status !== 'rosc') return;
    if (!confirm('Confirmar NOVA PCR após ROSC? Os registros anteriores serão preservados.')) return;
    initializeClinicalArrest();
    startTimingEpisode(state.clinical.episodeId);
    compressionCycle.deadline = null;
    compressionCycle.paused = false;
    compressionCycle.currentPhase = 'preparation';
    compressionCycle.lastRhythmWasShockable = undefined;
    compressionCycle.cycleCount = 0;
    compressionCycle.active = false;
    compressionCycle.rhythmCheckTriggered = false;
    if (typeof window.addEvent === 'function') window.addEvent('NOVA PCR APÓS ROSC — transição confirmada', 'critical');
    startTimer();
    if (typeof window.updatePcrGuidance === 'function') window.updatePcrGuidance();
}
