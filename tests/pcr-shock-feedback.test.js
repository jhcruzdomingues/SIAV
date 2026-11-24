import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { state, compressionCycle, resetPCRState } from '../src/config/state.js';
import * as core from '../src/pcr/core.js';
import * as rhythm from '../src/pcr/rhythm.js';
import { showScreen, showTransientAlert } from '../src/ui/dom.js';
import { updatePcrGuidance } from '../src/ui/pcr-guidance.js';
import { addEvent } from '../src/ui/timeline.js';
import * as brain from '../src/protocols/medical.js';

const body = readFileSync('index.html', 'utf8').match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const el = id => document.getElementById(id);
const globals = ['SIAV', 'showScreen', 'showTransientAlert', 'updatePcrGuidance', 'startCompressions', 'addEvent', 'stopMetronome', 'MedicalBrain'];
let originals;
function prepareShock() {
    rhythm.showRhythmSelectorScreen();
    rhythm.selectRhythmOption(document.querySelector('[data-rhythm="FV"]'));
    rhythm.processRhythmSelection();
    el('shock-applied-energy').value = '200';
}
beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(1_800_000_000_000); document.body.innerHTML = body; resetPCRState();
    originals = new Map(globals.map(key => [key, Object.getOwnPropertyDescriptor(window, key)]));
    Object.assign(window, { SIAV: { state }, showScreen, showTransientAlert, updatePcrGuidance, startCompressions: core.startCompressions, addEvent, stopMetronome: vi.fn(), MedicalBrain: brain });
    state.patient = { algorithm: 'adult', name: 'SINTETICO', age: 'N/I', weight: 'N/I' };
    core.startPCR(); core.startCompressions();
});
afterEach(() => {
    core.clearAllIntervals(); clearTimeout(window.pcrFeedbackTimeout); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
    for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(window, key, descriptor); else delete window[key];
    }
});

describe('Feedback após choque, sem alertas na lateral do aplicativo', () => {
    it('registra e retorna à PCR antes de mostrar a confirmação no painel', () => {
        prepareShock(); rhythm.applyShockAndResume();
        expect(el('pcr-screen').classList.contains('active')).toBe(true);
        expect(document.querySelector('body > .transient-alert')).toBeNull();
        expect(el('pcr-feedback-banner').classList.contains('show')).toBe(true);
        expect(el('pcr-feedback-banner').classList.contains('success')).toBe(true);
        expect(el('pcr-feedback-text').textContent).toBe('Choque de 200 J registrado.');
        expect(state.shocks).toHaveLength(1); expect(state.clinical.step).toBe(4);
        expect(compressionCycle.currentPhase).toBe('compressions'); expect(compressionCycle.paused).toBe(false);
    });
    it('segundo choque mostra adrenalina indicada, sem gerar administração automática', () => {
        prepareShock(); rhythm.applyShockAndResume(); prepareShock(); rhythm.applyShockAndResume();
        expect(state.clinical.step).toBe(6); expect(state.shockCount).toBe(2);
        expect(el('ac-primary-text').textContent).toBe('Administre adrenalina 1 mg EV/IO.');
        expect(el('ac-next-text').textContent).toBe('Reavalie o ritmo ao fim do ciclo.');
        expect(state.medications).toEqual([]); expect(document.querySelector('body > .transient-alert')).toBeNull();
    });
    it('reprocessar o mesmo choque não duplica registro, feedback ou prazo do ciclo', () => {
        prepareShock(); rhythm.applyShockAndResume();
        const before = JSON.stringify({ shocks: state.shocks, events: state.events, deadline: compressionCycle.deadline });
        rhythm.applyShockAndResume();
        expect(JSON.stringify({ shocks: state.shocks, events: state.events, deadline: compressionCycle.deadline })).toBe(before);
        expect(document.querySelectorAll('#pcr-feedback-banner.show')).toHaveLength(1);
    });
    it('erro de energia continua visível na tela de choque, sem registrar ou retomar', () => {
        prepareShock(); el('shock-applied-energy').value = ''; rhythm.applyShockAndResume();
        expect(el('shock-action-screen').classList.contains('active')).toBe(true);
        expect(document.querySelector('body > .transient-alert').textContent).toContain('Informe a energia');
        expect(state.shocks).toEqual([]); expect(state.clinical.pendingShock).not.toBeNull();
        expect(compressionCycle.paused).toBe(true);
    });
    it('a confirmação expira sem mudar o registro do choque ou reiniciar o ciclo', () => {
        prepareShock(); rhythm.applyShockAndResume(); const deadline = compressionCycle.deadline;
        vi.advanceTimersByTime(4100);
        expect(el('pcr-feedback-banner').classList.contains('show')).toBe(false);
        expect(state.shocks).toHaveLength(1); expect(compressionCycle.deadline).toBe(deadline);
    });
});
