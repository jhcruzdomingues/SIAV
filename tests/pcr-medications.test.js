import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { state, compressionCycle, resetPCRState, intervals } from '../src/config/state.js';
import * as core from '../src/pcr/core.js';
import * as rhythm from '../src/pcr/rhythm.js';
import * as meds from '../src/pcr/medications.js';
import * as brain from '../src/protocols/medical.js';
import { getClinicalSnapshot } from '../src/pcr/clinical.js';
import { updatePcrGuidance } from '../src/ui/pcr-guidance.js';
import { addMedication } from '../src/pcr/events.js';
import { NOW } from './helpers/clinical.js';
import { startPCRWithUninformedData } from '../src/ui/patient.js';

const html = readFileSync('index.html', 'utf8');
const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const input = id => document.getElementById(id);
const text = () => input('ac-primary-text').textContent;
function assess(value) {
    rhythm.showRhythmSelectorScreen();
    state.tempRhythmData.rhythm = value;
    rhythm.processRhythmSelection();
}
function shock(value = 'FV') {
    assess(value);
    input('shock-applied-energy').value = '200';
    rhythm.applyShockAndResume();
}
function prepare(id, amount, options = {}) {
    meds.showMedModal();
    input('medication-select').value = id;
    input('medication-dose').value = String(amount);
    input('medication-unit').value = options.unit || 'mg';
    document.querySelector(`input[name="administration-route"][value="${options.route || 'EV'}"]`).checked = true;
    input('medication-confirmed').checked = true;
    if (options.timestamp) {
        input('medication-timing').value = 'retrospective';
        const date = new Date(options.timestamp);
        input('medication-effective-at').value = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
    }
    meds.updateMedicationDose();
}
function record(id, amount, options) { prepare(id, amount, options); meds.recordMedication(); }
function stage8() { shock(); shock(); record('adrenalina', 1); shock(); }

beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(NOW);
    resetPCRState();
    document.body.innerHTML = body;
    state.patient = { algorithm: 'adult', age: 45, weight: 70 };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    Object.assign(window, {
        MedicalBrain: brain, startCompressions: core.startCompressions, finishPCR: core.finishPCR,
        updatePcrGuidance, stopDrugTimer: meds.stopDrugTimer, startDrugTimer: meds.startDrugTimer,
        stopMetronome: vi.fn(), addEvent: vi.fn()
    });
    core.startPCR();
});
afterEach(() => {
    core.clearAllIntervals(); meds.stopDrugTimer(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
    for (const key of ['MedicalBrain', 'startCompressions', 'finishPCR', 'updatePcrGuidance', 'stopDrugTimer', 'startDrugTimer', 'stopMetronome', 'addEvent']) delete window[key];
});

describe('Regressões com módulos e HTML reais', () => {
    it('FV persistente percorre 3/4, 5/6, 7/8 e retorna sem confundir choques totais', () => {
        shock(); expect(state.clinical.step).toBe(4);
        shock(); expect(state.clinical.step).toBe(6);
        record('adrenalina', 1);
        shock(); expect(state.clinical.step).toBe(8);
        expect(text()).toContain('AMIODARONA OU LIDOCAÍNA');
        record('amiodarona', 300);
        const first = state.medications.at(-1);
        expect(first).toMatchObject({ amount: 300, dose: '300 mg', route: 'EV', timestamp: NOW, recordedAt: NOW, requiresReview: false });
        expect(text()).not.toContain('CONDUTAS');
        prepare('amiodarona', 150);
        expect(input('med-preview-value').textContent).not.toContain('Orientação do passo atual');
        shock(); expect(state.clinical.step).toBe(6);
        expect(brain.evaluateMedicationGuidance(getClinicalSnapshot()).amiodarona.status).toBe('not_due');
        shock(); expect(state.shockCount).toBe(5);
        expect(brain.evaluateMedicationGuidance(getClinicalSnapshot()).amiodarona.dose).toBe('150 mg EV/IO');
    });
    it('AESP → FV entra no passo 5 e alcança antiarrítmico com dois choques totais', () => {
        assess('AESP'); expect(state.clinical.step).toBe(10);
        record('adrenalina', 1);
        shock(); expect(state.clinical.step).toBe(6);
        shock(); expect(state.shockCount).toBe(2);
        expect(state.clinical.step).toBe(8);
        expect(text()).toContain('AMIODARONA OU LIDOCAÍNA');
    });
    it('FV → AESP → FV volta ao passo 6 após terceiro choque total sem antecipar antiarrítmico', () => {
        shock(); shock(); record('adrenalina', 1);
        assess('AESP'); expect(state.clinical.step).toBe(10);
        expect(brain.evaluateMedicationGuidance(getClinicalSnapshot()).amiodarona.status).toBe('not_due');
        shock('TVSP'); expect(state.shockCount).toBe(3);
        expect(state.clinical.step).toBe(6);
        expect(brain.evaluateMedicationGuidance(getClinicalSnapshot()).amiodarona.status).toBe('not_due');
    });
    it.each(['amiodarona', 'lidocaina'])('painel e modal compartilham a mesma elegibilidade de %s', id => {
        shock(); prepare(id, id === 'amiodarona' ? 300 : 100);
        expect(input('med-preview-value').textContent).not.toContain('Orientação do passo atual');
        shock(); record('adrenalina', 1); shock();
        prepare(id, id === 'amiodarona' ? 300 : 100);
        const result = brain.evaluateMedicationGuidance(getClinicalSnapshot())[id];
        expect(input('med-preview-value').textContent).toContain(result.dose);
        expect(input('ac-dose-text').textContent).toContain(result.dose);
    });
    it('permite documentar dose fora do passo indicado, mas exige reavaliação posterior', () => {
        shock(); record('amiodarona', 300);
        expect(state.medications.at(-1).requiresReview).toBe(true);
        shock(); shock();
        expect(brain.evaluateMedicationGuidance(getClinicalSnapshot()).amiodarona.status).toBe('review');
    });
    it('ROSC interrompe imediatamente mesmo se a finalização administrativa for cancelada', () => {
        stage8();
        window.confirm.mockReturnValueOnce(true).mockReturnValueOnce(false);
        rhythm.roscObtido();
        expect(state.roscAchieved).toBe(true); expect(state.pcrActive).toBe(true);
        expect(state.clinical.status).toBe('rosc'); expect(compressionCycle.active).toBe(false);
        expect(text()).toContain('ROSC CONFIRMADO'); expect(input('compressions-btn').disabled).toBe(true);
        expect(input('restart-pcr-btn').hidden).toBe(false);
        expect(Object.values(intervals).every(value => !value)).toBe(true);
        expect(window.stopMetronome).toHaveBeenCalled();
        core.startCompressions(); rhythm.applyShockAndResume();
        expect(compressionCycle.currentPhase).toBe('rosc'); expect(state.shockCount).toBe(3);
        prepare('amiodarona', 300);
        expect(input('med-preview-value').textContent).toContain('ROSC');
        expect(input('med-preview-value').textContent).not.toContain('Orientação do passo atual');
    });
    it('nova PCR após ROSC exige transição explícita e preserva registros e contagem total', () => {
        stage8(); const oldEpisode = state.clinical.episodeId;
        window.confirm.mockReturnValueOnce(true).mockReturnValueOnce(false);
        rhythm.roscObtido();
        core.startPCR(); expect(state.clinical.episodeId).toBe(oldEpisode);
        window.confirm.mockReturnValueOnce(false); core.restartPCRAfterROSC();
        expect(state.clinical.status).toBe('rosc');
        core.restartPCRAfterROSC();
        expect(state.clinical.episodeId).not.toBe(oldEpisode); expect(state.roscAchieved).toBe(false);
        expect(state.medications).toHaveLength(1); expect(state.shockCount).toBe(3);
        shock(); expect(state.clinical.step).toBe(4); expect(state.shockCount).toBe(4);
    });
    it('ROSC com finalização aceita também bloqueia recomendações e exige confirmação para novo atendimento', () => {
        stage8(); rhythm.roscObtido();
        expect(state.pcrActive).toBe(false);
        expect(brain.getProtocolNextStep(getClinicalSnapshot()).message).toContain('ROSC');
        window.confirm.mockReturnValueOnce(false); core.startPCR();
        expect(state.pcrActive).toBe(false);
        core.startPCR(); expect(state.pcrActive).toBe(true); expect(state.clinical.status).toBe('arrest');
    });
    it('não duplica choque reprocessado, mas permite o próximo choque após nova avaliação', () => {
        shock(); const id = state.shocks[0].id;
        rhythm.applyShockAndResume(); expect(state.shockCount).toBe(1);
        shock(); expect(state.shockCount).toBe(2); expect(state.shocks[1].id).not.toBe(id);
    });
    it('permite RCP durante preparo e cancela a decisão anterior se o ritmo mudar antes do choque', () => {
        assess('FV'); core.startCompressions();
        expect(compressionCycle.active).toBe(true);
        expect(brain.evaluateMedicationGuidance(getClinicalSnapshot()).amiodarona.status).toBe('blocked');
        assess('AESP');
        rhythm.applyShockAndResume();
        expect(state.shockCount).toBe(0); expect(state.clinical.step).toBe(10);
        expect(compressionCycle.currentPhase).toBe('compressions');
    });
    it('inicia um ciclo completo após choque mesmo quando RCP já estava em andamento durante o preparo', () => {
        assess('FV'); core.startCompressions(); vi.advanceTimersByTime(10000);
        input('shock-applied-energy').value = '200'; rhythm.applyShockAndResume();
        expect(state.clinical.step).toBe(4); expect(compressionCycle.startTime).toBe(NOW + 10000);
    });
    it('não duplica registro reprocessado, mas permite duas administrações distintas com mesmos dados e horário', () => {
        stage8(); prepare('amiodarona', 300); meds.recordMedication(); meds.recordMedication();
        expect(state.medications).toHaveLength(2);
        record('amiodarona', 300);
        expect(state.medications).toHaveLength(3);
        expect(state.medications[1].id).not.toBe(state.medications[2].id);
        expect(state.medications[1].timestamp).toBe(state.medications[2].timestamp);
        expect(brain.evaluateMedicationGuidance(getClinicalSnapshot()).amiodarona.status).toBe('review');
    });
    it('o helper também rejeita a mesma operação sem deduplicar por dose/horário', () => {
        const data = { id: 'same', name: 'Lidocaína', amount: 100, unit: 'mg', route: 'IO', timestamp: NOW };
        expect(addMedication(data)).not.toBeNull(); expect(addMedication(data)).toBeNull();
        expect(addMedication({ ...data, id: 'different' })).not.toBeNull();
        expect(state.medications).toHaveLength(2);
    });
    it('cancelar formulário invalida a operação e selecionar droga nunca confirma administração', () => {
        prepare('amiodarona', 300); meds.updateMedicationDose(); meds.updateMedicationDose();
        expect(state.medications).toHaveLength(0);
        meds.cancelMedicationRecord(); meds.recordMedication();
        expect(state.medications).toHaveLength(0);
    });
    it('lidocaína exige quantidade numérica exata e registra unidade e via sem texto contraditório', () => {
        stage8(); prepare('lidocaina', '70-105'); meds.recordMedication();
        expect(state.medications).toHaveLength(1);
        input('medication-dose').value = '90.5'; meds.recordMedication();
        expect(state.medications.at(-1)).toMatchObject({ amount: 90.5, unit: 'mg', dose: '90.5 mg', route: 'EV', requiresReview: false });
    });
    it('via fora do PDF pode ser documentada sem recomendação por ET e passa a exigir revisão', () => {
        stage8(); prepare('amiodarona', 300, { route: 'ET' });
        expect(input('med-preview-value').textContent).toContain('Via fora');
        expect(input('med-preview-value').textContent).not.toContain('Orientação do passo atual');
        meds.recordMedication();
        expect(state.medications.at(-1)).toMatchObject({ dose: '300 mg', route: 'ET', requiresReview: true });
        expect(brain.evaluateMedicationGuidance(getClinicalSnapshot()).amiodarona.status).toBe('review');
    });
    it('retrospectivo preserva horário efetivo, registra horário do clique e não inventa choque ou etapa', () => {
        stage8(); vi.setSystemTime(NOW + 120000);
        record('lidocaina', 100, { timestamp: NOW + 60000 });
        const actual = state.medications.at(-1);
        expect(actual).toMatchObject({ timestamp: NOW + 60000, recordedAt: NOW + 120000, isRetrospective: true, requiresReview: true, shockCount: null, clinicalContext: null });
        expect(brain.evaluateMedicationGuidance(getClinicalSnapshot()).lidocaina.status).toBe('review');
    });
    it('não aceita horário retrospectivo ausente ou futuro; fatos anteriores ficam sem episódio presumido', () => {
        prepare('lidocaina', 100);
        input('medication-timing').value = 'retrospective'; meds.recordMedication(); expect(state.medications).toHaveLength(0);
        prepare('lidocaina', 100, { timestamp: NOW + 60000 }); meds.recordMedication(); expect(state.medications).toHaveLength(0);
        prepare('lidocaina', 100, { timestamp: NOW - 60000 }); meds.recordMedication();
        expect(state.medications.at(-1)).toMatchObject({ episodeId: null, clinicalContext: null, isRetrospective: true, requiresReview: true });
    });
    it('permite documentar administrações adicionais sem sugerir automaticamente uma terceira dose', () => {
        stage8(); record('amiodarona', 300); shock(); shock(); record('amiodarona', 150);
        record('amiodarona', 75);
        expect(state.medications.at(-1).amount).toBe(75);
        expect(state.medications.at(-1).requiresReview).toBe(true);
        expect(brain.evaluateMedicationGuidance(getClinicalSnapshot()).amiodarona.status).toBe('review');
    });
    it('preparo sem dados só habilita orientação adulta com confirmação explícita do protocolo', () => {
        startPCRWithUninformedData();
        expect(state.patient.algorithm).toBeNull();
        shock(); shock(); shock();
        expect(brain.evaluateMedicationGuidance(getClinicalSnapshot()).amiodarona.status).toBe('review');
        input('patient-adult-protocol').checked = true;
        startPCRWithUninformedData();
        expect(state.patient.algorithm).toBe('adult');
        expect(brain.evaluateMedicationGuidance(getClinicalSnapshot()).amiodarona.status).toBe('due');
    });
});
