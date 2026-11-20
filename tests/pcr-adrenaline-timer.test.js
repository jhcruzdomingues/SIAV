import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/config/supabase.js', () => ({ supabase: {} }));
import { state, compressionCycle, resetPCRState } from '../src/config/state.js';
import * as core from '../src/pcr/core.js';
import * as meds from '../src/pcr/medications.js';
import { updatePcrGuidance } from '../src/ui/pcr-guidance.js';
import { addMedication } from '../src/pcr/events.js';

const body = readFileSync('index.html', 'utf8').match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const NOW = 1_800_000_000_000;
const el = id => document.getElementById(id);
const clock = () => el('ac-drug-countdown').textContent;
const globals = ['updatePcrGuidance', 'stopDrugTimer', 'stopMetronome', 'generateEvolution'];
let originals;
function recordAdrenaline() {
    meds.showMedModal(); meds.selectMedication('adrenalina'); meds.recordMedication();
    expect(state.medications.at(-1)?.name).toBe('Adrenalina');
}
beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(NOW); document.body.innerHTML = body; resetPCRState();
    originals = new Map(globals.map(key => [key, Object.getOwnPropertyDescriptor(window, key)]));
    Object.assign(window, { updatePcrGuidance, stopDrugTimer: meds.stopDrugTimer, stopMetronome: vi.fn(), generateEvolution: vi.fn() });
    state.patient = { algorithm: 'adult', age: 'N/I', weight: 'N/I' };
    core.startPCR(); core.startCompressions();
    state.clinical.step = 10; state.clinical.compressionId = 'SYNTHETIC-COMPRESSION';
    compressionCycle.lastRhythmWasShockable = false;
});
afterEach(() => {
    core.clearAllIntervals(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
    for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(window, key, descriptor); else delete window[key];
    }
});

describe('Adrenalina: tempo desde administração registrada, sem nova recomendação', () => {
    it('começa sem contagem, mesmo quando a primeira dose está indicada', () => {
        meds.updateDrugStatusDisplay();
        expect(el('ac-drug-timer-label').textContent).toBe('ADRENALINA');
        expect(clock()).toBe('--:--');
        expect(el('ac-drug-timer-context').textContent).toBe('sem registro');
        expect(state.medications).toEqual([]);
    });
    it('conta desde a dose efetiva e passa de 00:59 para 01:00 sem segundos 60', () => {
        recordAdrenaline(); expect(clock()).toBe('00:00');
        vi.advanceTimersByTime(59_000); expect(clock()).toBe('00:59');
        vi.advanceTimersByTime(1000); expect(clock()).toBe('01:00');
        expect(el('ac-drug-timer-context').textContent).toBe('desde a dose');
        expect(state.medications).toHaveLength(1);
    });
    it('calcula por timestamp real mesmo sem ticks e não vira ordem automática aos 3 minutos', () => {
        recordAdrenaline(); vi.setSystemTime(NOW + 180_900); meds.updateDrugStatusDisplay();
        expect(clock()).toBe('03:00');
        expect(el('ac-drug-timer-container').textContent).not.toMatch(/administrar|ver condutas|aguardar/i);
        expect(state.medications).toHaveLength(1);
    });
    it('apenas uma nova administração de adrenalina reinicia sua referência', () => {
        recordAdrenaline(); vi.advanceTimersByTime(20_000);
        addMedication({ id: 'SYNTHETIC-OTHER', name: 'Outro medicamento sintético', amount: 1, unit: 'mg', route: 'EV', timestamp: Date.now() });
        meds.startDrugTimer(); expect(clock()).toBe('00:20');
        vi.setSystemTime(NOW + 180_000); recordAdrenaline(); expect(clock()).toBe('00:00');
        expect(state.medications.filter(m => m.name === 'Adrenalina')).toHaveLength(2);
    });
    it('pausar e retomar compressões não reinicia o tempo da adrenalina nem o ciclo', () => {
        recordAdrenaline(); const deadline = compressionCycle.deadline;
        vi.advanceTimersByTime(10_000); core.pauseCompressions();
        vi.advanceTimersByTime(5000); expect(clock()).toBe('00:15');
        core.startCompressions(); vi.advanceTimersByTime(5000);
        expect(clock()).toBe('00:20'); expect(compressionCycle.deadline).toBe(deadline);
    });
    it('a avaliação de ritmo/choque não troca o relógio por instruções', () => {
        recordAdrenaline(); vi.setSystemTime(NOW + 21_000);
        compressionCycle.currentPhase = 'shock_advised'; state.clinical.pendingShock = { id: 'SYNTHETIC-SHOCK' };
        meds.updateDrugStatusDisplay(); expect(clock()).toBe('00:21');
        expect(el('ac-drug-timer-label').textContent).toBe('ADRENALINA');
    });
    it.each([
        ['horário ausente', { timestamp: undefined }],
        ['horário futuro', { timestamp: NOW + 1000 }],
        ['registro incompleto', { recordedAt: undefined }],
        ['revisão pendente', { requiresReview: true }],
        ['registro retrospectivo', { isRetrospective: true }],
        ['episódio anterior', { episodeId: 'SYNTHETIC-PREVIOUS' }]
    ])('não exibe contagem com %s e preserva o registro para revisão', (_, changes) => {
        recordAdrenaline(); Object.assign(state.medications[0], changes);
        const before = JSON.stringify(state.medications);
        updatePcrGuidance(); meds.updateDrugStatusDisplay();
        expect(clock()).toBe('--:--'); expect(el('ac-drug-timer-context').textContent).toBe('revisar registro');
        expect(JSON.stringify(state.medications)).toBe(before);
    });
    it('ROSC/encerramento retiram contagem ativa, e um novo atendimento não herda a dose', () => {
        recordAdrenaline(); state.roscAchieved = true; state.clinical.status = 'rosc'; meds.stopDrugTimer();
        expect(clock()).toBe('--:--'); expect(el('ac-drug-timer-context').textContent).toBe('ROSC');
        core.executePCRFinish();
        vi.spyOn(window, 'confirm').mockReturnValue(true); core.startPCR();
        expect(clock()).toBe('--:--'); expect(el('ac-drug-timer-context').textContent).toBe('sem registro');
        expect(state.medications).toEqual([]);
    });
    it('recorrência após ROSC preserva a dose anterior sem usá-la como relógio do novo episódio', () => {
        recordAdrenaline(); const entry = { ...state.medications[0] };
        state.roscAchieved = true; state.clinical.status = 'rosc';
        vi.spyOn(window, 'confirm').mockReturnValue(true); core.restartPCRAfterROSC();
        expect(state.medications[0]).toEqual(entry); expect(clock()).toBe('--:--');
        expect(el('ac-drug-timer-context').textContent).toBe('revisar registro');
    });
    it('nova renderização não altera doses, registros, cronômetros ou episódio', () => {
        recordAdrenaline(); const before = JSON.stringify({ medications: state.medications, clinical: state.clinical, compressionCycle, timing: state.resuscitationTiming });
        vi.setSystemTime(NOW + 9000); updatePcrGuidance(); meds.updateDrugStatusDisplay();
        expect(clock()).toBe('00:09');
        expect(JSON.stringify({ medications: state.medications, clinical: state.clinical, compressionCycle, timing: state.resuscitationTiming })).toBe(before);
    });
});
