import { state, compressionCycle } from '../config/state.js';

export const newOperationId = () => crypto.randomUUID();

export function initializeClinicalArrest() {
    state.clinical = {
        status: 'arrest', episodeId: newOperationId(), startedAt: Date.now(),
        step: null, pendingShock: null, compressionId: null
    };
    state.roscAchieved = false;
    state.currentRhythm = null;
}

export function isClinicalArrestActive() {
    return state.pcrActive && !state.roscAchieved && state.clinical?.status === 'arrest';
}

// AHA 2025 adult algorithm, page 1. A nonshockable branch re-enters at box 5.
export function assessClinicalRhythm(rhythm) {
    if (!isClinicalArrestActive() || state.clinical.pendingShock) return false;
    if (!['FV', 'TVSP', 'AESP', 'Assistolia'].includes(rhythm)) return false;
    const clinical = state.clinical;
    const previous = clinical.step;
    const shockable = rhythm === 'FV' || rhythm === 'TVSP';
    if (shockable) {
        const shockStep = previous === null ? 3
            : previous === 6 ? 7
                : [4, 8, 10, 11].includes(previous) ? 5 : null;
        if (shockStep === null) return false;
        clinical.pendingShock = { id: newOperationId(), step: shockStep, rhythm };
    } else {
        clinical.step = previous === 10 ? 11 : 10;
        clinical.compressionId = newOperationId();
    }
    state.currentRhythm = rhythm;
    compressionCycle.lastRhythmWasShockable = shockable;
    return true;
}

export function commitClinicalShock(energy) {
    const clinical = state.clinical;
    const pending = clinical?.pendingShock;
    if (!isClinicalArrestActive() || !pending || !['shock_advised', 'compressions'].includes(compressionCycle.currentPhase)) return null;
    if (!Number.isFinite(energy) || energy <= 0) return null;
    const shock = { ...pending, episodeId: clinical.episodeId, energy, timestamp: Date.now() };
    clinical.pendingShock = null; // Consume the operation before any UI callbacks.
    clinical.step = pending.step + 1;
    clinical.compressionId = newOperationId();
    state.shocks.push(shock);
    state.shockCount++;
    return shock;
}

export function getClinicalSnapshot() {
    return {
        pcrActive: state.pcrActive, roscAchieved: state.roscAchieved,
        clinical: { ...state.clinical }, patient: { ...state.patient },
        currentPhase: compressionCycle.currentPhase,
        isShockable: compressionCycle.lastRhythmWasShockable,
        medications: state.medications, shockCount: state.shockCount,
        currentCycle: compressionCycle.cycleCount, elapsedSeconds: state.pcrSeconds
    };
}
