import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/config/supabase.js', () => ({ supabase: {} }));
import { state, compressionCycle, resetPCRState, intervals } from '../src/config/state.js';
import * as core from '../src/pcr/core.js';
import * as rhythm from '../src/pcr/rhythm.js';
import * as meds from '../src/pcr/medications.js';
import { registerAllEvents } from '../src/ui/events.js';
import { updatePcrGuidance } from '../src/ui/pcr-guidance.js';
import { addEvent } from '../src/ui/timeline.js';
import { generateEvolution } from '../src/pcr/log.js';
import { events } from '../src/utils/events.js';
import { getTimingSummary } from '../src/pcr/timing.js';

const body = readFileSync('index.html', 'utf8').match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const NOW = 1_800_000_000_000;
const el = id => document.getElementById(id);
const globals = ['startCompressions', 'updatePcrGuidance', 'stopMetronome', 'finishPCR', 'generateEvolution', 'addEvent', 'stopDrugTimer'];
let originals, listeners;
function openFinish() { el('finish-pcr-btn').click(); vi.advanceTimersByTime(20); }
beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(NOW); document.body.innerHTML = body; resetPCRState();
    state.patient = { algorithm: 'adult', name: 'SINTETICO', age: 'N/I', weight: 'N/I' };
    state.currentUser.isLoggedIn = false;
    originals = new Map(globals.map(key => [key, Object.getOwnPropertyDescriptor(window, key)]));
    Object.assign(window, { startCompressions: core.startCompressions, updatePcrGuidance, stopMetronome: vi.fn(),
        finishPCR: core.finishPCR, generateEvolution: vi.fn(() => generateEvolution(false)), addEvent, stopDrugTimer: meds.stopDrugTimer });
    listeners = [];
    for (const target of [document, window]) {
        const add = target.addEventListener.bind(target);
        vi.spyOn(target, 'addEventListener').mockImplementation((...args) => { listeners.push([target, args]); add(...args); });
    }
    vi.spyOn(window, 'confirm').mockReturnValue(true); vi.spyOn(events, 'emit');
    registerAllEvents(); core.startPCR(); core.startCompressions();
    state.notes.push({ text: 'NOTA SINTETICA PRESERVADA' });
});
afterEach(() => {
    core.clearAllIntervals(); vi.clearAllTimers(); vi.useRealTimers();
    listeners.forEach(([target, args]) => target.removeEventListener(...args)); vi.restoreAllMocks();
    for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(window, key, descriptor); else delete window[key];
    }
});

describe('Finalizar atendimento: escolha explícita e uma confirmação', () => {
    it('ordena instruções → RCP → checar ritmo e remove RCE independente do painel', () => {
        const panel = document.querySelector('#pcr-screen .ac-main-display');
        expect(panel.compareDocumentPosition(el('compressions-btn')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(el('compressions-btn').compareDocumentPosition(el('rhythm-conduta-btn')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(el('pcr-screen').querySelector('#rosc-btn')).toBeNull();
        expect(el('pcr-screen').querySelectorAll('#finish-pcr-btn')).toHaveLength(1);
    });
    it('abrir o modal não pausa RCP, não encerra e oferece exatamente os três motivos', () => {
        const deadline = compressionCycle.deadline; openFinish();
        expect(el('finish-attendance-modal').classList.contains('show')).toBe(true);
        expect([...el('finish-attendance-modal').querySelectorAll('[data-finish-outcome]')].map(b => b.dataset.finishOutcome)).toEqual(['rosc', 'death', 'cancelled']);
        expect(window.confirm).not.toHaveBeenCalled(); expect(state.pcrActive).toBe(true);
        expect(compressionCycle.paused).toBe(false); expect(compressionCycle.deadline).toBe(deadline);
        expect(state.encounterOutcome).toBeNull();
    });
    it.each(['rosc', 'death', 'cancelled'])('recusar %s mantém atendimento, notas, ciclo e modal', type => {
        openFinish(); const before = JSON.stringify({ clinical: state.clinical, notes: state.notes, medications: state.medications, deadline: compressionCycle.deadline });
        window.confirm.mockReturnValue(false); document.querySelector(`[data-finish-outcome="${type}"]`).click();
        expect(window.confirm).toHaveBeenCalledTimes(1); expect(state.pcrActive).toBe(true);
        expect(state.encounterOutcome).toBeNull(); expect(el('finish-attendance-modal').classList.contains('show')).toBe(true);
        expect(JSON.stringify({ clinical: state.clinical, notes: state.notes, medications: state.medications, deadline: compressionCycle.deadline })).toBe(before);
        expect(window.generateEvolution).not.toHaveBeenCalled();
    });
    it.each([
        ['rosc', 'RCE OBTIDO (ROSC)'], ['death', 'ÓBITO INFORMADO PELO OPERADOR'], ['cancelled', 'ATENDIMENTO CANCELADO']
    ])('confirmar %s encerra uma vez, mantém dados e identifica o desfecho no relatório', (type, label) => {
        state.medications.push({ id: 'SYNTHETIC-DOSE', name: 'Adrenalina', dose: '1 mg', amount: 1, unit: 'mg', route: 'EV', timestamp: NOW, recordedAt: NOW, isRetrospective: false, requiresReview: false, episodeId: state.clinical.episodeId });
        state.shocks.push({ id: 'SYNTHETIC-SHOCK', energy: 200, timestamp: NOW }); state.shockCount = 1;
        const administrations = JSON.stringify(state.medications), shocks = JSON.stringify(state.shocks);
        vi.advanceTimersByTime(5000); const notes = state.notes; openFinish();
        const selected = document.querySelector(`[data-finish-outcome="${type}"]`);
        selected.click(); selected.click();
        if (type === 'rosc') {
            expect(state.clinical.status).toBe('rosc'); expect(state.pcrActive).toBe(true);
            expect(window.generateEvolution).not.toHaveBeenCalled();
            vi.advanceTimersByTime(10000); el('cancel-vitals-btn').click();
        }
        core.executePCRFinish();
        expect(window.confirm).toHaveBeenCalledTimes(1); expect(state.pcrActive).toBe(false);
        expect(state.encounterOutcome).toMatchObject({ type, timestamp: NOW + 5020 });
        expect(state.encounterOutcome.id).toBeTruthy(); expect(state.encounterOutcome.episodeId).toBe(state.clinical.episodeId);
        expect(state.roscAchieved).toBe(type === 'rosc'); expect(state.notes).toBe(notes);
        expect(state.notes[0].text).toBe('NOTA SINTETICA PRESERVADA');
        expect(JSON.stringify(state.medications)).toBe(administrations); expect(JSON.stringify(state.shocks)).toBe(shocks);
        expect(Object.values(intervals).every(value => !value)).toBe(true);
        expect(el('finish-attendance-modal').classList.contains('show')).toBe(false);
        expect(window.generateEvolution).toHaveBeenCalledTimes(1);
        const report = window.generateEvolution.mock.results[0].value;
        expect(report).toContain(label); expect(report).toContain('NOTA SINTETICA PRESERVADA'); expect(report).toContain('1 mg via EV');
        expect(events.emit.mock.calls.filter(([name]) => name === 'PCR_FINISHED')).toHaveLength(1);
        expect(getTimingSummary().totalMs).toBe(5020);
    });
    it.each(['close', 'backdrop', 'escape'])('fechar por %s apenas volta à PCR', method => {
        openFinish();
        if (method === 'close') el('finish-attendance-close').click();
        if (method === 'backdrop') el('finish-attendance-modal').click();
        if (method === 'escape') document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
        expect(el('finish-attendance-modal').classList.contains('show')).toBe(false);
        expect(state.pcrActive).toBe(true); expect(compressionCycle.paused).toBe(false);
        expect(window.confirm).not.toHaveBeenCalled(); expect(state.encounterOutcome).toBeNull();
    });
    it('modal aberto bloqueia atalhos de ações clínicas ocultas', () => {
        openFinish();
        for (const code of ['KeyC', 'KeyM', 'KeyS', 'Digit1']) document.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
        expect(compressionCycle.paused).toBe(false); expect(el('med-modal').classList.contains('show')).toBe(false);
        expect(state.shocks).toEqual([]); expect(state.encounterOutcome).toBeNull();
    });
    it('um modal do episódio anterior não encerra o episódio recorrente', () => {
        openFinish(); window.confirm.mockReturnValueOnce(true).mockReturnValueOnce(false); rhythm.roscObtido();
        core.restartPCRAfterROSC(); const episode = state.clinical.episodeId;
        window.confirm.mockClear(); document.querySelector('[data-finish-outcome="death"]').click();
        expect(window.confirm).not.toHaveBeenCalled(); expect(state.pcrActive).toBe(true);
        expect(state.clinical.episodeId).toBe(episode); expect(state.encounterOutcome).toBeNull();
    });
    it('um novo atendimento reinicia só seu desfecho, preservando a cópia do relatório anterior', () => {
        openFinish(); document.querySelector('[data-finish-outcome="cancelled"]').click();
        const report = window.generateEvolution.mock.results[0].value;
        core.startPCR(); expect(state.encounterOutcome).toBeNull(); expect(state.notes).toEqual([]);
        expect(report).toContain('ATENDIMENTO CANCELADO'); expect(report).toContain('NOTA SINTETICA PRESERVADA');
    });
    it('RCE já registrado pode ser finalizado sem repetir transição clínica ou confirmação administrativa', () => {
        window.confirm.mockReturnValueOnce(true).mockReturnValueOnce(false); rhythm.roscObtido();
        expect(state.pcrActive).toBe(true); expect(state.clinical.status).toBe('rosc');
        const count = state.events.filter(event => event.text.startsWith('ROSC OBTIDO')).length;
        openFinish(); window.confirm.mockClear(); el('rosc-btn').click();
        el('cancel-vitals-btn').click();
        expect(window.confirm).toHaveBeenCalledTimes(1); expect(state.pcrActive).toBe(false);
        expect(state.events.filter(event => event.text.startsWith('ROSC OBTIDO'))).toHaveLength(count);
        expect(state.encounterOutcome.type).toBe('rosc');
    });
    it('sem atendimento ativo não abre nem confirma um novo encerramento', () => {
        core.executePCRFinish(); window.confirm.mockClear(); openFinish();
        expect(el('finish-attendance-modal').classList.contains('show')).toBe(false);
        expect(window.confirm).not.toHaveBeenCalled();
    });
    it('foco começa no fechamento e Tab permanece dentro do modal', () => {
        openFinish(); expect(document.activeElement).toBe(el('finish-attendance-close'));
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
        expect(document.activeElement).toBe(el('finish-cancelled-btn'));
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab', bubbles: true, cancelable: true }));
        expect(document.activeElement).toBe(el('finish-attendance-close'));
    });
});
