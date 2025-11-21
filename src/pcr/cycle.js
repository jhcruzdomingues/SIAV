// src/pcr/cycle.js
// Módulo para gerenciar o ciclo de compressões torácicas

export const compressionCycle = {
  active: false,
  startTime: null,
  cycleCount: 0,
  currentPhase: 'preparation',
  cycleTimer: null,
  cycleProgress: 0,
  compressionTime: 0,
  pauseStartTime: null,
  lastRhythmWasShockable: undefined,
  rhythmCheckTriggered: false
};

export function startCompressionCycle(durationSec, onCycleEnd) {
  compressionCycle.active = true;
  compressionCycle.startTime = Date.now();
  compressionCycle.currentPhase = 'compressions';
  compressionCycle.cycleProgress = 0;
  let remaining = durationSec;
  compressionCycle.cycleTimer = setInterval(() => {
    remaining--;
    compressionCycle.cycleProgress = 100 * (1 - remaining / durationSec);
    if (remaining <= 0) {
      stopCompressionCycle();
      if (typeof onCycleEnd === 'function') onCycleEnd();
    }
  }, 1000);
}

export function stopCompressionCycle() {
  if (compressionCycle.cycleTimer) {
    clearInterval(compressionCycle.cycleTimer);
    compressionCycle.cycleTimer = null;
  }
  compressionCycle.active = false;
  compressionCycle.currentPhase = 'preparation';
  compressionCycle.cycleProgress = 0;
}

export function resetCompressionCycle() {
  stopCompressionCycle();
  compressionCycle.startTime = null;
  compressionCycle.cycleCount = 0;
  compressionCycle.compressionTime = 0;
  compressionCycle.pauseStartTime = null;
  compressionCycle.lastRhythmWasShockable = undefined;
  compressionCycle.rhythmCheckTriggered = false;
}

export function isCompressionActive() {
  return compressionCycle.active;
}
