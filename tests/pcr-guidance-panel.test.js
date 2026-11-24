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

describe('Comandos diretos sem repetição ou conteúdo opcional', () => {
    it('uma mensagem nova com sinalizador DRUG não é convertida em ordem presumida', () => {
        const source = brain.getProtocolNextStep(getClinicalSnapshot());
        vi.spyOn(brain, 'getProtocolNextStep').mockReturnValueOnce({ ...source, message: 'NOVA ORIENTAÇÃO CLÍNICA', details: 'Descrição clínica nova que exige revisão.' });
        updatePcrGuidance();
        expect(el('ac-primary-text').textContent).toBe('NOVA ORIENTAÇÃO CLÍNICA');
        expect(el('ac-safety-note').textContent).toContain('Descrição clínica nova que exige revisão.');
        expect(el('ac-safety-note').textContent).toContain(source.dose);
        expect(document.querySelector('.ac-main-display').textContent).not.toContain('Administre');
    });
    it('atendimento encerrado após ROSC não mantém comandos de cuidado ou reinício ativos', () => {
        state.pcrActive = false; state.roscAchieved = true; state.clinical.status = 'rosc'; updatePcrGuidance();
        expect(el('ac-primary-text').textContent).toBe('Atendimento encerrado.');
        expect(el('ac-next-step').hidden).toBe(true); expect(el('ac-next-text').textContent).toBe('');
        expect(el('ac-safety-note').style.display).toBe('none');
    });
    it('duas doses de antiarrítmico não bloqueiam genericamente a adrenalina devida', () => {
        state.medications = [300, 150].map((amount, index) => ({ id: `SYNTHETIC-ANTI-${index}`, name: 'Amiodarona', amount, unit: 'mg', route: 'EV', timestamp: Date.now() - 120000, recordedAt: Date.now() - 120000, episodeId: state.clinical.episodeId, isRetrospective: false, requiresReview: false, clinicalContext: { step: 8, compressionId: `SYNTHETIC-PAST-${index}` } }));
        updatePcrGuidance();
        expect(el('ac-primary-text').textContent).toBe('Administre adrenalina 1 mg EV/IO.');
        expect(el('ac-safety-note').textContent).toContain('Reavalie o antiarrítmico antes de nova dose: duas administrações já estão registradas.');
    });
    it('adrenalina aparece uma vez como comando com dose, sem detalhes recolhíveis ou outros fármacos', () => {
        state.clinical.step = 6; updatePcrGuidance();
        const panel = document.querySelector('.ac-main-display');
        expect(el('ac-primary-text').textContent).toBe('Administre adrenalina 1 mg EV/IO.');
        expect(panel.querySelector('details, summary')).toBeNull();
        expect(panel.textContent.match(/1 mg EV\/IO/g)).toHaveLength(1);
        expect(panel.textContent).not.toMatch(/amiodarona|lidocaína|DOSE INDICADA|Ver orientação completa/i);
    });
    it('as instruções de RCP e intervalo ficam visíveis e em forma de comando', () => {
        state.clinical.step = 6; updatePcrGuidance();
        expect(el('ac-safety-note').textContent).toContain('Mantenha a RCP de alta qualidade.');
        expect(el('ac-safety-note').textContent).toContain('Respeite o intervalo de 3–5 min entre as doses.');
        expect(el('ac-safety-note').style.display).not.toBe('none');
        expect(el('ac-next-text').textContent).toBe('Reavalie o ritmo ao fim do ciclo.');
    });
    it('adrenalina devida e antiarrítmico incerto geram comando permitido e revisão específica', () => {
        state.medications.push({ name: 'Amiodarona', amount: 300, unit: 'mg', route: 'EV', timestamp: NaN });
        const source = brain.getProtocolNextStep(getClinicalSnapshot());
        expect(source.medicationGuidance.adrenalina.status).toBe('due');
        expect(source.medicationGuidance.amiodarona.status).toBe('review');
        updatePcrGuidance();
        expect(el('ac-primary-text').textContent).toBe('Administre adrenalina 1 mg EV/IO.');
        expect(el('ac-safety-note').textContent).toContain('Reavalie os antiarrítmicos');
        expect(el('ac-primary-text').textContent).not.toMatch(/Administre amiodarona|Administre lidocaína/);
    });
    it('pausa mantém a retomada explícita e não manda manter compressões que estão pausadas', () => {
        state.clinical.step = 6; compressionCycle.paused = true; updatePcrGuidance();
        expect(el('compression-resume-alert').hidden).toBe(false);
        expect(el('compression-resume-alert').textContent).toContain('Retome');
        expect(el('ac-primary-text').textContent).toBe('Administre adrenalina 1 mg EV/IO.');
        expect(el('ac-safety-note').textContent).not.toContain('Mantenha a RCP');
    });
    it('dose já registrada e ainda não devida não vira comando de nova administração', () => {
        state.clinical.step = 6;
        state.medications.push({ id: 'SYNTHETIC-EPI', name: 'Adrenalina', amount: 1, unit: 'mg', route: 'EV', timestamp: Date.now(), recordedAt: Date.now(), episodeId: state.clinical.episodeId, isRetrospective: false, requiresReview: false });
        updatePcrGuidance();
        expect(el('ac-primary-text').textContent).toBe('Mantenha RCP de alta qualidade — 100 a 120/min.');
        expect(document.querySelector('.ac-main-display').textContent).not.toMatch(/Administre|1 mg EV\/IO/);
    });
    it('mensagem clínica desconhecida conserva a descrição visível, sem opção para escondê-la', () => {
        const source = brain.getProtocolNextStep(getClinicalSnapshot());
        vi.spyOn(brain, 'getProtocolNextStep').mockReturnValueOnce({ ...source, message: 'MENSAGEM FUTURA', details: 'PROTOCOLO FUTURO: valide a orientação.', criticalAction: null });
        updatePcrGuidance();
        expect(el('ac-primary-text').textContent).toBe('MENSAGEM FUTURA');
        expect(el('ac-safety-note').textContent).toContain('PROTOCOLO FUTURO: valide a orientação.');
        expect(document.querySelector('.ac-main-display details')).toBeNull();
    });
});
afterEach(() => vi.restoreAllMocks());

describe('Avisos de PCR: comandos completos sem alterar o protocolo', () => {
    it('preserva doses, vias e ressalvas em comandos sempre visíveis', () => {
        const source = brain.getProtocolNextStep(getClinicalSnapshot()); updatePcrGuidance();
        expect(el('ac-primary-text').textContent).toContain('Administre adrenalina');
        for (const entry of Object.values(source.medicationGuidance).filter(x => x.status === 'due')) expect(el('ac-primary-text').textContent).toContain(entry.dose);
        expect(el('ac-safety-note').textContent).toContain('Não associe amiodarona e lidocaína.');
        expect(el('ac-safety-note').textContent).toContain('3–5 min entre as doses de adrenalina');
        expect(el('ac-safety-note').textContent).toContain('Mantenha o fármaco escolhido.');
        expect(el('ac-safety-note').style.display).not.toBe('none');
        expect(document.querySelector('.ac-main-display details')).toBeNull();
    });
    it('revisão do percurso fica explícita, sem recomendar uma administração', () => {
        state.clinical.historyIncomplete = true; updatePcrGuidance();
        expect(el('ac-primary-text').textContent).toBe('Reavalie o percurso clínico e registre a avaliação do ritmo antes de medicar.');
        expect(document.querySelector('.ac-main-display').textContent).not.toContain('Administre');
    });
    it('erro retira o comando de dose anterior e exige revisão sem lançar erro', () => {
        updatePcrGuidance(); expect(el('ac-primary-text').textContent).toContain('Administre');
        vi.spyOn(brain, 'getProtocolNextStep').mockImplementationOnce(() => { throw new Error('SYNTHETIC renderer error'); });
        expect(() => updatePcrGuidance()).not.toThrow();
        expect(el('ac-primary-text').textContent).toBe('Confira o protocolo antes de prosseguir.');
        expect(el('ac-next-text').textContent).toBe(''); expect(el('ac-next-step').hidden).toBe(true);
        expect(document.querySelector('.ac-main-display').textContent).not.toMatch(/Administre|mg EV\/IO/);
        expect(el('ac-safety-note').style.display).not.toBe('none');
        updatePcrGuidance(); expect(el('ac-primary-text').textContent).toContain('Administre');
    });
    it('atualização sem mudança mantém nós e comandos visíveis', () => {
        updatePcrGuidance();
        const title = el('ac-primary-text').firstChild, icon = el('ac-icon').firstChild;
        const text = el('ac-safety-note').textContent; updatePcrGuidance();
        expect(el('ac-primary-text').firstChild).toBe(title); expect(el('ac-icon').firstChild).toBe(icon);
        expect(el('ac-safety-note').textContent).toBe(text);
    });
    it('renderizar não altera registros, choque, episódio ou temporização', () => {
        const snapshot = () => JSON.stringify({ clinical: state.clinical, medications: state.medications, shocks: state.shocks, timing: state.resuscitationTiming, start: state.pcrStartTime, seconds: state.pcrSeconds });
        const before = snapshot(); updatePcrGuidance(); updatePcrGuidance(); expect(snapshot()).toBe(before);
    });
    it('mantém orientação, pausa, ressalvas e próximo passo em um único painel', () => {
        updatePcrGuidance(); const panel = document.querySelector('#pcr-screen .ac-main-display');
        expect(document.querySelectorAll('#pcr-screen .ac-main-display')).toHaveLength(1);
        for (const id of ['ac-primary-text', 'compression-resume-alert', 'ac-safety-note', 'ac-next-step', 'pcr-feedback-banner']) expect(panel.contains(el(id))).toBe(true);
        expect(panel.contains(el('ac-drug-countdown'))).toBe(false);
        expect(panel.textContent).toContain('AGORA'); expect(panel.textContent).toContain('PRÓXIMO PASSO');
    });
    it('RCP anuncia reavaliação ao fim do ciclo sem antecipar dose ou choque', () => {
        state.clinical.step = 4; state.shockCount = 1; updatePcrGuidance();
        expect(el('ac-primary-text').textContent).toBe('Mantenha RCP de alta qualidade — 100 a 120/min.');
        expect(el('ac-safety-note').textContent).toBe('Minimize as interrupções e trate as causas reversíveis.');
        expect(el('ac-next-text').textContent).toBe('Reavalie o ritmo ao fim do ciclo.');
        expect(el('ac-primary-text').textContent).not.toContain('Administre');
        expect(el('ac-next-text').textContent).not.toMatch(/adrenalina|amiodarona|lidocaína|choque/i);
    });
    it('avaliação mantém a condição de desfibrilar somente se indicado', () => {
        compressionCycle.currentPhase = 'rhythm_check'; updatePcrGuidance();
        expect(el('ac-next-text').textContent).toBe('Desfibrile se indicado e retome as compressões.');
        expect(el('ac-primary-text').textContent).not.toContain('Administre');
    });
    it('ROSC orienta cuidados pós-parada e confirmação da recorrência, sem dose de PCR', () => {
        state.roscAchieved = true; state.clinical.status = 'rosc'; updatePcrGuidance();
        expect(el('ac-primary-text').textContent).toBe('ROSC confirmado. Inicie os cuidados pós-parada.');
        expect(el('ac-next-text').textContent).toBe('Se a PCR recorrer, confirme a recorrência no aplicativo.');
        expect(el('ac-safety-note').style.display).toBe('none');
        expect(el('ac-primary-text').textContent).not.toContain('Administre');
    });
    it('pediatria exige confirmar o algoritmo sem anunciar dose adulta', () => {
        state.patient.algorithm = 'pediatric'; updatePcrGuidance();
        expect(el('ac-primary-text').textContent).toBe('Confirme o algoritmo selecionado para o paciente. Não infira o protocolo pela idade ou pelo peso.');
        expect(document.querySelector('.ac-main-display').textContent).not.toContain('Administre');
    });
    it('encerramento retira comandos de dose e próximo passo anteriores', () => {
        updatePcrGuidance(); expect(el('ac-next-step').hidden).toBe(false);
        state.pcrActive = false; state.clinical.status = 'inactive'; updatePcrGuidance();
        expect(el('ac-next-step').hidden).toBe(true); expect(el('ac-next-text').textContent).toBe('');
        expect(el('ac-primary-text').textContent).toBe('Atendimento encerrado.');
    });
    it('adrenalina isolada reúne dose e intervalo sem um segundo bloco repetido', () => {
        state.clinical.step = 6; const source = brain.getProtocolNextStep(getClinicalSnapshot()); updatePcrGuidance();
        expect(el('ac-primary-text').textContent).toBe('Administre adrenalina ' + source.medicationGuidance.adrenalina.dose + '.');
        expect(el('ac-safety-note').textContent).toContain('Respeite o intervalo de 3–5 min entre as doses.');
        expect(el('ac-dose-container')).toBeNull();
        expect(document.querySelector('.ac-guidance-header').hidden).toBe(true);
        expect(el('ac-primary-text').getAttribute('aria-describedby')).toBe('ac-status-badge');
    });
    it('antiarrítmico isolado mantém nomes, alternativas e doses no comando', () => {
        state.medications.push({ id: 'SYNTHETIC-EPI', name: 'Adrenalina', amount: 1, unit: 'mg', route: 'EV', timestamp: Date.now(), recordedAt: Date.now(), episodeId: state.clinical.episodeId, isRetrospective: false, requiresReview: false });
        updatePcrGuidance();
        expect(el('ac-primary-text').textContent).toBe('Administre amiodarona 300 mg EV/IO OU lidocaína 1-1.5 mg/kg EV/IO.');
        expect(el('ac-primary-text').textContent).not.toContain('adrenalina');
        expect(el('ac-safety-note').textContent).toContain('Não associe amiodarona e lidocaína.');
    });
    it('mensagem futura do protocolo permanece integral, sem síntese presumida', () => {
        const source = brain.getProtocolNextStep(getClinicalSnapshot());
        vi.spyOn(brain, 'getProtocolNextStep').mockReturnValueOnce({ ...source, message: 'MENSAGEM FUTURA DO PROTOCOLO', criticalAction: null });
        updatePcrGuidance(); expect(el('ac-primary-text').textContent).toBe('MENSAGEM FUTURA DO PROTOCOLO');
    });
});
