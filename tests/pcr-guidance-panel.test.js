import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { state, compressionCycle, resetPCRState } from '../src/config/state.js';
import { updatePcrGuidance } from '../src/ui/pcr-guidance.js';
import { getClinicalSnapshot } from '../src/pcr/clinical.js';
import * as brain from '../src/protocols/medical.js';

const body = readFileSync('index.html', 'utf8').match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const el = id => document.getElementById(id);
beforeEach(() => {
    document.body.innerHTML = body; resetPCRState();
    state.pcrActive = true; state.pcrStartTime = 12345;
    state.patient = { algorithm: 'adult', age: 'N/I', weight: 'N/I' };
    state.clinical = { status: 'arrest', episodeId: 'SYNTHETIC-EPISODE', step: 8, compressionId: 'SYNTHETIC-STEP', pendingShock: null };
    state.shockCount = 3;
    compressionCycle.currentPhase = 'compressions'; compressionCycle.lastRhythmWasShockable = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('Avisos de PCR: síntese sem perder informações clínicas', () => {
    it('preserva mensagem, doses e ressalva de alternativas, deixando o contexto completo acessível', () => {
        const source = brain.getProtocolNextStep(getClinicalSnapshot());
        updatePcrGuidance();
        expect(el('ac-primary-text').textContent).toBe(source.message);
        for (const entry of Object.values(source.medicationGuidance).filter(x => x.status === 'due')) expect(el('ac-dose-text').textContent).toContain(entry.dose);
        expect(el('ac-safety-note').textContent).toContain('alternativas, não uma associação');
        expect(el('ac-safety-note').textContent).toContain('Intervalo: 3–5 min');
        expect(el('ac-safety-note').textContent).toContain('Manter o fármaco registrado.');
        expect(el('ac-safety-note').style.display).not.toBe('none');
        expect(el('ac-details-text').textContent).toBe(source.details);
        expect(el('ac-context-details').open).toBe(false);
    });
    it('ressalvas de revisão ficam visíveis, sem depender de abrir os detalhes', () => {
        state.clinical.historyIncomplete = true;
        const source = brain.getProtocolNextStep(getClinicalSnapshot());
        updatePcrGuidance();
        for (const entry of Object.values(source.medicationGuidance).filter(x => x.status === 'review')) expect(el('ac-safety-note').textContent).toContain(entry.reason);
        expect(el('ac-safety-note').style.display).not.toBe('none');
        expect(el('ac-dose-container').style.display).toBe('none');
    });
    it('erro de renderização retira dose antiga e pede revisão sem lançar erro ao chamador', () => {
        updatePcrGuidance(); expect(el('ac-dose-text').textContent).not.toBe('');
        vi.spyOn(brain, 'getProtocolNextStep').mockImplementationOnce(() => { throw new Error('SYNTHETIC renderer error'); });
        expect(() => updatePcrGuidance()).not.toThrow();
        expect(el('ac-primary-text').textContent).toBe('Orientação indisponível');
        expect(el('ac-dose-text').textContent).toBe(''); expect(el('ac-dose-container').style.display).toBe('none');
        expect(el('ac-safety-note').style.display).not.toBe('none');
        updatePcrGuidance(); expect(el('ac-dose-text').textContent).not.toBe('');
    });
    it('atualização sem mudança mantém os nós e a expansão escolhida pelo usuário', () => {
        updatePcrGuidance();
        const title = el('ac-primary-text').firstChild, icon = el('ac-icon').firstChild;
        el('ac-context-details').open = true;
        updatePcrGuidance();
        expect(el('ac-primary-text').firstChild).toBe(title); expect(el('ac-icon').firstChild).toBe(icon);
        expect(el('ac-context-details').open).toBe(true);
    });
    it('pintar orientações não altera registros, choque, episódio ou temporização', () => {
        const before = JSON.stringify({ clinical: state.clinical, medications: state.medications, shocks: state.shocks, timing: state.resuscitationTiming, start: state.pcrStartTime, seconds: state.pcrSeconds });
        updatePcrGuidance(); updatePcrGuidance();
        expect(JSON.stringify({ clinical: state.clinical, medications: state.medications, shocks: state.shocks, timing: state.resuscitationTiming, start: state.pcrStartTime, seconds: state.pcrSeconds })).toBe(before);
    });
});
