import { compressionCycle } from '../config/state.js';
import { isClinicalArrestActive } from '../pcr/clinical.js';
import { startCompressions, pauseCompressions } from '../pcr/core.js';

// One deliberate action per native click; the timing engine remains the owner
// of interval registration, cycle deadlines and pause/resume transitions.
export function handleCompressionAction() {
    if (!isClinicalArrestActive()) return;
    if (compressionCycle.currentPhase === 'compressions' && !compressionCycle.paused) pauseCompressions();
    else startCompressions();
}
