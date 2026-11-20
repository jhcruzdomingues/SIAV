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
        expect(el('ac-next-text').textContent).toBe(''); expect(el('ac-next-step').hidden).toBe(true);
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
    it('reúne orientação, pausa, ressalvas e próximo passo em um só painel, fora dos relógios', () => {
        updatePcrGuidance();
        const panel = document.querySelector('#pcr-screen .ac-main-display');
        expect(document.querySelectorAll('#pcr-screen .ac-main-display')).toHaveLength(1);
        for (const id of ['ac-primary-text', 'compression-resume-alert', 'ac-safety-note', 'ac-next-step', 'pcr-feedback-banner']) expect(panel.contains(el(id))).toBe(true);
        expect(panel.contains(el('ac-drug-countdown'))).toBe(false);
        expect(panel.textContent).toContain('AGORA'); expect(panel.textContent).toContain('PRÓXIMO PASSO');
    });
    it('RCP em curso anuncia reavaliação ao fim do ciclo sem antecipar dose ou choque', () => {
        state.clinical.step = 4; state.shockCount = 1;
        updatePcrGuidance();
        expect(el('ac-primary-text').textContent).toBe(brain.getProtocolNextStep(getClinicalSnapshot()).message);
        expect(el('ac-next-text').textContent).toBe('Ao fim do ciclo, reavalie o ritmo.');
        expect(el('ac-dose-container').style.display).toBe('none');
        expect(el('ac-next-text').textContent).not.toMatch(/adrenalina|amiodarona|lidocaína|choque/i);
    });
    it('na avaliação, o próximo passo mantém a condição de desfibrilar somente se indicado', () => {
        compressionCycle.currentPhase = 'rhythm_check'; updatePcrGuidance();
        expect(el('ac-next-text').textContent).toBe(brain.getProtocolNextStep(getClinicalSnapshot()).details);
        expect(el('ac-next-text').textContent).toContain('se indicado');
        expect(el('ac-dose-container').style.display).toBe('none');
    });
    it('ROSC mostra cuidados pós-parada e confirmação de nova PCR, sem dose de PCR', () => {
        state.roscAchieved = true; state.clinical.status = 'rosc'; updatePcrGuidance();
        expect(el('ac-primary-text').textContent).toContain('CUIDADOS PÓS-PARADA');
        expect(el('ac-next-text').textContent).toContain('confirmação explícita');
        expect(el('ac-safety-note').style.display).toBe('none');
        expect(el('ac-dose-container').style.display).toBe('none');
    });
    it('histórico incerto e pediatria mantêm revisão, sem anunciar dose adulta futura', () => {
        state.patient.algorithm = 'pediatric'; updatePcrGuidance();
        expect(el('ac-next-text').textContent).toContain('Confirme os dados e o percurso');
        expect(el('ac-dose-container').style.display).toBe('none');
        expect(el('ac-safety-note').textContent).toContain('Não inferir o protocolo');
    });
    it('encerramento retira o próximo passo para não manter orientação antiga', () => {
        updatePcrGuidance(); expect(el('ac-next-step').hidden).toBe(false);
        state.pcrActive = false; state.clinical.status = 'inactive'; updatePcrGuidance();
        expect(el('ac-next-step').hidden).toBe(true); expect(el('ac-next-text').textContent).toBe('');
        expect(el('ac-dose-container').style.display).toBe('none');
    });
});
