import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/config/supabase.js', () => ({ supabase: {} }));
import { state, compressionCycle, resetPCRState } from '../src/config/state.js';
import * as core from '../src/pcr/core.js';
import * as rhythm from '../src/pcr/rhythm.js';
import { getTimingSummary } from '../src/pcr/timing.js';
import { registerAllEvents } from '../src/ui/events.js';
import { updatePcrGuidance } from '../src/ui/pcr-guidance.js';
import * as brain from '../src/protocols/medical.js';
import { showScreen } from '../src/ui/dom.js';

const body = readFileSync('index.html', 'utf8').match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const NOW = 1_800_000_000_000;
const el = id => document.getElementById(id);
const globals = ['startCompressions', 'updatePcrGuidance', 'stopMetronome', 'finishPCR', 'generateEvolution', 'MedicalBrain', 'showScreen'];
let originals, documentListeners, windowListeners;
beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(NOW);
    document.body.innerHTML = body; resetPCRState();
    state.patient = { algorithm: 'adult', age: 'N/I', weight: 'N/I', name: 'SINTETICO' };
    originals = new Map(globals.map(key => [key, Object.getOwnPropertyDescriptor(window, key)]));
    Object.assign(window, { startCompressions: core.startCompressions, updatePcrGuidance, stopMetronome: vi.fn(), finishPCR: vi.fn(), generateEvolution: vi.fn(), MedicalBrain: brain, showScreen });
    documentListeners = []; windowListeners = [];
    const addDocument = document.addEventListener.bind(document), addWindow = window.addEventListener.bind(window);
    vi.spyOn(document, 'addEventListener').mockImplementation((...args) => { documentListeners.push(args); addDocument(...args); });
    vi.spyOn(window, 'addEventListener').mockImplementation((...args) => { windowListeners.push(args); addWindow(...args); });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    registerAllEvents(); core.startPCR();
});
afterEach(() => {
    core.clearAllIntervals(); vi.clearAllTimers(); vi.useRealTimers();
    documentListeners.forEach(args => document.removeEventListener(...args));
    windowListeners.forEach(args => window.removeEventListener(...args));
    vi.restoreAllMocks();
    for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(window, key, descriptor); else delete window[key];
    }
});

describe('Um botão para iniciar, pausar e retomar compressões', () => {
    it('inicia no clique e passa a oferecer pausa no mesmo botão habilitado', () => {
        expect(el('compressions-btn').textContent).toContain('INICIAR COMPRESSÕES');
        el('compressions-btn').click();
        expect(compressionCycle.currentPhase).toBe('compressions');
        expect(compressionCycle.paused).toBe(false);
        expect(el('compressions-btn').disabled).toBe(false);
        expect(el('compressions-btn').textContent).toContain('PAUSAR COMPRESSÕES');
        expect(el('compressions-btn').getAttribute('aria-pressed')).toBe('true');
    });
    it('pausa no segundo clique, sem parar tempo global ou mudar prazo do ciclo', () => {
        el('compressions-btn').click(); const deadline = compressionCycle.deadline;
        vi.advanceTimersByTime(3000); el('compressions-btn').click();
        vi.advanceTimersByTime(2000);
        expect(compressionCycle.paused).toBe(true);
        expect(el('compressions-btn').textContent).toContain('RETOMAR COMPRESSÕES');
        expect(el('compressions-btn').dataset.compressionState).toBe('paused');
        expect(el('compression-resume-alert').hidden).toBe(false);
        expect(el('compression-resume-alert').textContent).toContain('Compressões interrompidas');
        expect(compressionCycle.deadline).toBe(deadline);
        expect(getTimingSummary()).toMatchObject({ totalMs: 5000, compressionMs: 3000, pauseMs: 2000 });
    });
    it('retoma no terceiro clique, preservando ciclo, episódio, notas e prazos', () => {
        el('compressions-btn').click(); const deadline = compressionCycle.deadline, episode = state.clinical.episodeId;
        state.notes.push({ text: 'NOTA SINTETICA' });
        vi.advanceTimersByTime(3000); el('compressions-btn').click();
        vi.advanceTimersByTime(2000); el('compressions-btn').click();
        vi.advanceTimersByTime(3000);
        expect(compressionCycle.paused).toBe(false); expect(compressionCycle.cycleCount).toBe(1);
        expect(compressionCycle.deadline).toBe(deadline); expect(state.clinical.episodeId).toBe(episode);
        expect(state.notes).toHaveLength(1); expect(el('compression-resume-alert').hidden).toBe(true);
        expect(el('compressions-btn').dataset.compressionState).toBe('running');
        expect(getTimingSummary()).toMatchObject({ compressionMs: 6000, pauseMs: 2000, fct: 75 });
    });
    it('mantém um único controle no painel principal, sem criar botão de RCP na tela de choque', () => {
        expect(document.querySelectorAll('#compressions-btn')).toHaveLength(1);
        expect(el('pause-compressions-btn')).toBeNull();
        expect(el('compressions-btn').closest('.screen').id).toBe('pcr-screen');
        expect(el('shock-action-screen').querySelector('#compressions-btn')).toBeNull();
    });
    it('avisa a pausa após avaliar FV e voltar ao painel, sem registrar choque ou retomada automática', () => {
        el('compressions-btn').click(); vi.advanceTimersByTime(1000);
        rhythm.showRhythmSelectorScreen();
        rhythm.selectRhythmOption(document.querySelector('[data-rhythm="FV"]'));
        rhythm.processRhythmSelection();
        updatePcrGuidance();
        expect(compressionCycle.paused).toBe(true); expect(state.shocks).toEqual([]);
        expect(el('compressions-btn').dataset.compressionState).toBe('paused');
        expect(el('compression-resume-alert').hidden).toBe(false);
    });
    it('preparar a interface de choque, isoladamente, não pausa compressões em andamento', () => {
        el('compressions-btn').click();
        rhythm.setupShockActionScreen('Fibrilação Ventricular');
        expect(compressionCycle.paused).toBe(false);
        expect(el('compressions-btn').dataset.compressionState).toBe('running');
    });
    it('ao retornar de suspensão mantém pausa e medição incompleta até uma ação de retomada', () => {
        const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
        el('compressions-btn').click(); vi.advanceTimersByTime(2000);
        hidden.mockReturnValue(true); core.handleTimingVisibility(); vi.advanceTimersByTime(5000);
        hidden.mockReturnValue(false); core.handleTimingVisibility();
        expect(el('compressions-btn').dataset.compressionState).toBe('paused');
        expect(getTimingSummary()).toMatchObject({ compressionMs: 2000, unknownMs: 5000, fct: null });
        el('compressions-btn').click(); vi.advanceTimersByTime(1000);
        expect(getTimingSummary()).toMatchObject({ compressionMs: 3000, unknownMs: 5000, fct: null });
    });
    it('ROSC desabilita o controle e remove o destaque de retomada', () => {
        el('compressions-btn').click(); rhythm.roscObtido();
        expect(el('compressions-btn').disabled).toBe(true);
        expect(el('compressions-btn').dataset.compressionState).not.toBe('paused');
        expect(el('compression-resume-alert').hidden).toBe(true);
        const episode = state.clinical.episodeId; el('compressions-btn').click();
        expect(state.clinical.episodeId).toBe(episode); expect(state.roscAchieved).toBe(true);
    });
    it('atalho C acompanha o botão, mas repetição, Ctrl+C e telas ocultas não pausam RCP', () => {
        const key = options => document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC', bubbles: true, cancelable: true, ...options }));
        key(); expect(compressionCycle.paused).toBe(false);
        expect(compressionCycle.currentPhase).toBe('compressions');
        key({ repeat: true }); key({ ctrlKey: true });
        expect(compressionCycle.paused).toBe(false);
        showScreen('shock-action'); key(); expect(compressionCycle.paused).toBe(false);
        showScreen('pcr'); key(); expect(compressionCycle.paused).toBe(true);
    });
});
