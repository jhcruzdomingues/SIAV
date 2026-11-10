import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
vi.mock('../src/config/supabase.js', () => ({ supabase: {} }));
import { state, compressionCycle, resetPCRState } from '../src/config/state.js';
import * as core from '../src/pcr/core.js';
import * as rhythm from '../src/pcr/rhythm.js';
import * as meds from '../src/pcr/medications.js';
import { getTimingSummary } from '../src/pcr/timing.js';
import { generateEvolution } from '../src/pcr/log.js';
import { showPatientModal, savePatientData, startPCRWithUninformedData } from '../src/ui/patient.js';
import { updatePcrGuidance } from '../src/ui/pcr-guidance.js';
import * as brain from '../src/protocols/medical.js';

const body = readFileSync('index.html', 'utf8').match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const NOW = 1_800_000_000_000;
const el = id => document.getElementById(id);
const wait = seconds => vi.advanceTimersByTime(seconds * 1000);
const globals = ['startPCR', 'startCompressions', 'finishPCR', 'showRhythmSelectorScreen', 'updatePcrGuidance', 'stopMetronome', 'MedicalBrain'];
let oldGlobals;
function opportunity(step = 10) {
    state.clinical.step = step;
    state.clinical.compressionId = crypto.randomUUID();
    compressionCycle.currentPhase = 'compressions';
    compressionCycle.lastRhythmWasShockable = [4, 6, 8].includes(step);
}
function assess(value) {
    rhythm.showRhythmSelectorScreen();
    rhythm.selectRhythmOption(document.querySelector(`[data-rhythm="${value}"]`));
    rhythm.processRhythmSelection();
}

beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(NOW);
    document.body.innerHTML = body;
    resetPCRState(); state.patientLog = [];
    state.patient = { algorithm: 'adult', age: 40, weight: 70, name: 'SINTETICO' };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    oldGlobals = new Map(globals.map(key => [key, Object.getOwnPropertyDescriptor(window, key)]));
    Object.assign(window, {
        startPCR: core.startPCR, startCompressions: core.startCompressions, finishPCR: core.finishPCR,
        showRhythmSelectorScreen: rhythm.showRhythmSelectorScreen, updatePcrGuidance,
        stopMetronome: vi.fn(), MedicalBrain: brain
    });
    core.startPCR();
});
afterEach(() => {
    core.clearAllIntervals(); meds.stopDrugTimer(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
    for (const [key, descriptor] of oldGlobals) {
        if (descriptor) Object.defineProperty(window, key, descriptor); else delete window[key];
    }
});

describe('Tempos registrados e FCT', () => {
    it('conserva ciclo na pausa/retomada e soma todos os trechos sem duplicar', () => {
        wait(10); core.startCompressions();
        const deadline = compressionCycle.deadline;
        wait(30); core.pauseCompressions(); core.pauseCompressions();
        expect(el('ac-status-badge').textContent).toContain('PAUSADO');
        wait(10); core.startCompressions(); core.startCompressions();
        expect(compressionCycle.deadline).toBe(deadline);
        expect(compressionCycle.cycleCount).toBe(1);
        expect(el('ac-cycle-timer-display').textContent).toBe('01:20');
        wait(20); core.executePCRFinish();
        const summary = getTimingSummary();
        expect(summary).toMatchObject({ totalMs: 70000, compressionMs: 50000, pauseMs: 20000, unknownMs: 0, valid: true });
        expect(summary.fct).toBeCloseTo(50 / 70 * 100);
        expect(summary.segments).toHaveLength(4);
        expect(summary.segments.every(segment => Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.episodeId)).toBe(true);
        const report = generateEvolution(false);
        expect(report).toContain('71.4%'); expect(report).toContain('00:50'); expect(report).toContain('00:20');
        expect(report).toContain(new Date(NOW + 10000).toISOString());
    });
    it('preserva intervalos de ciclos consecutivos incluindo a pausa para ritmo', () => {
        core.startCompressions(); wait(121.5);
        assess('AESP');
        expect(compressionCycle.cycleCount).toBe(2);
        wait(120);
        const summary = getTimingSummary();
        expect(summary.compressionMs).toBe(240000);
        expect(summary.pauseMs).toBe(1500);
        expect(summary.totalMs).toBe(241500);
    });
    it('mantém ciclo completo após choque sem apagar compressões do preparo', () => {
        core.startCompressions(); wait(30);
        assess('FV'); core.startCompressions(); wait(10);
        el('shock-applied-energy').value = '200';
        rhythm.applyShockAndResume();
        expect(compressionCycle.deadline).toBe(Date.now() + 120000);
        expect(getTimingSummary().compressionMs).toBe(40000);
        wait(120);
        expect(getTimingSummary().compressionMs).toBe(160000);
    });
    it('fecha episódio no ROSC e exclui espera pós-ROSC da FCT e do tempo de PCR', () => {
        state.notes = [{ text: 'NOTA SINTETICA' }];
        core.startCompressions(); wait(20);
        window.confirm.mockReturnValueOnce(true).mockReturnValueOnce(false);
        rhythm.roscObtido();
        wait(30); core.restartPCRAfterROSC(); core.startCompressions(); wait(10); core.executePCRFinish();
        expect(state.notes).toHaveLength(1);
        expect(state.resuscitationTiming.episodes).toHaveLength(2);
        expect(getTimingSummary()).toMatchObject({ totalMs: 30000, compressionMs: 30000, pauseMs: 0, fct: 100 });
        expect(state.pcrSeconds).toBe(30);
        expect(generateEvolution(false)).toContain('01:00');
    });
    it('encerra durante pausa sem contar a pausa como compressões e sem fechar duas vezes', () => {
        core.startCompressions(); wait(8); core.pauseCompressions(); wait(7); core.executePCRFinish();
        const summary = getTimingSummary(); wait(30);
        expect(getTimingSummary()).toEqual(summary);
        expect(summary).toMatchObject({ totalMs: 15000, compressionMs: 8000, pauseMs: 7000 });
    });
    it('ocultar/retornar não presume compressões; retomar exige ação e FCT fica incompleta', () => {
        const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
        core.startCompressions(); wait(10);
        hidden.mockReturnValue(true); core.handleTimingVisibility(); wait(60);
        hidden.mockReturnValue(false); core.handleTimingVisibility();
        expect(getTimingSummary().compressionMs).toBe(10000);
        expect(compressionCycle.paused).toBe(true);
        wait(5); expect(getTimingSummary().compressionMs).toBe(10000);
        core.startCompressions(); wait(10); core.executePCRFinish();
        expect(getTimingSummary()).toMatchObject({ compressionMs: 20000, unknownMs: 60000, fct: null, valid: false });
        expect(generateEvolution(false)).toContain('N/I — medição incompleta');
    });
    it('recupera tempo por timestamps e não inventa compressões após uma lacuna de callbacks', () => {
        core.startCompressions();
        vi.setSystemTime(NOW + 60000); core.refreshPCRTime();
        expect(state.pcrSeconds).toBe(60);
        expect(getTimingSummary()).toMatchObject({ compressionMs: 0, unknownMs: 60000, fct: null });
        expect(compressionCycle.paused).toBe(true);
    });
    it('não extrapola compressões quando o ciclo vence durante suspensão', () => {
        core.startCompressions();
        core.handleTimingPageHide();
        vi.setSystemTime(NOW + 180000); core.handleTimingVisibility();
        expect(getTimingSummary().compressionMs).toBe(0);
        expect(getTimingSummary().fct).toBeNull();
        expect(compressionCycle.rhythmCheckTriggered).toBe(true);
        expect(compressionCycle.cycleCount).toBe(1);
    });
    it('não apresenta FCT com relógio regressivo, cobertura adulterada ou sem ledger', () => {
        wait(10); vi.setSystemTime(NOW + 5000); core.refreshPCRTime();
        expect(getTimingSummary().fct).toBeNull();
        state.resuscitationTiming.segments[0].start += 1000;
        expect(getTimingSummary().valid).toBe(false);
        state.resuscitationTiming = null;
        expect(generateEvolution(false)).toContain('Medição incompleta: intervalos não disponíveis');
    });
    it('não inicia medição de compressões com a página oculta', () => {
        vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
        core.startCompressions(); wait(10);
        expect(getTimingSummary()).toMatchObject({ compressionMs: 0, unknownMs: 10000, fct: null });
    });
    it('o relatório ativo também detecta ausência de observação e denominador zero', () => {
        expect(getTimingSummary().fct).toBeNull();
        core.startCompressions(); vi.setSystemTime(NOW + 30000);
        expect(generateEvolution(false)).toContain('N/I — medição incompleta');
        expect(getTimingSummary().compressionMs).toBe(0);
        state.resuscitationTiming.segments[0].start = NaN;
        expect(() => generateEvolution(false)).not.toThrow();
        expect(generateEvolution(false)).not.toContain('NaN');
    });
    it('um novo atendimento recebe ledger novo, preservando a referência histórica anterior', () => {
        core.startCompressions(); wait(5); core.executePCRFinish();
        const previous = state.resuscitationTiming;
        core.startPCR();
        expect(state.resuscitationTiming).not.toBe(previous);
        expect(previous.episodes[0].end).toBe(NOW + 5000);
        expect(getTimingSummary().compressionMs).toBe(0);
    });
});

describe('Registro rápido sem mudar elegibilidade', () => {
    it.each([['adrenalina', 10, 1], ['amiodarona', 8, 300]])('preenche %s devida e só registra no toque deliberado, uma vez', (medication, step, amount) => {
        opportunity(step); meds.showMedModal(); meds.selectMedication(medication);
        const operation = el('med-modal').dataset.operationId;
        expect(el('medication-dose').value).toBe(String(amount));
        expect(el('medication-confirmed').checked).toBe(false);
        expect(el('medication-review-confirmation').hidden).toBe(true);
        expect(el('record-med-btn').disabled).toBe(false);
        expect(state.medications).toHaveLength(0);
        meds.recordMedication(); meds.recordMedication();
        expect(state.medications).toHaveLength(1);
        expect(state.medications[0]).toMatchObject({ id: operation, amount, unit: 'mg', route: 'EV', timestamp: NOW, recordedAt: NOW, episodeId: state.clinical.episodeId, requiresReview: false });
    });
    it('preenche segunda amiodarona somente na próxima oportunidade elegível', () => {
        opportunity(8); meds.showMedModal(); meds.selectMedication('amiodarona'); meds.recordMedication();
        meds.showMedModal(); meds.selectMedication('amiodarona');
        expect(el('medication-dose').value).toBe('');
        opportunity(8); meds.showMedModal(); meds.selectMedication('amiodarona');
        expect(el('medication-dose').value).toBe('150');
    });
    it('não escolhe quantidade de uma faixa de lidocaína', () => {
        opportunity(8); meds.showMedModal(); meds.selectMedication('lidocaina');
        expect(el('medication-dose').value).toBe('');
        expect(el('record-med-btn').disabled).toBe(true);
        expect(el('med-preview-value').textContent).toContain('1-1.5 mg/kg');
    });
    it.each([null, 'pediatric'])('não preenche dose adulta no algoritmo %s', algorithm => {
        opportunity(); state.patient.algorithm = algorithm;
        meds.showMedModal(); meds.selectMedication('adrenalina');
        expect(el('medication-dose').value).toBe('');
        meds.recordMedication(); expect(state.medications).toHaveLength(0);
    });
    it('não preenche histórico incerto nem medicamento fora da oportunidade', () => {
        opportunity(4); meds.showMedModal(); meds.selectMedication('amiodarona');
        expect(el('medication-dose').value).toBe('');
        opportunity(8); state.clinical.historyIncomplete = true;
        meds.showMedModal(); meds.selectMedication('amiodarona');
        expect(el('medication-dose').value).toBe('');
    });
    it('não preenche quantidade ao selecionar no registro retrospectivo', () => {
        opportunity(); meds.showMedModal(); el('medication-timing').value = 'retrospective';
        meds.selectMedication('adrenalina');
        expect(el('medication-dose').value).toBe('');
    });
    it('um registro padronizado pela via IO mantém a via escolhida', () => {
        opportunity(); meds.showMedModal(); meds.selectMedication('adrenalina');
        el('route-io').checked = true; meds.updateMedicationDose(); meds.recordMedication();
        expect(state.medications[0]).toMatchObject({ amount: 1, unit: 'mg', route: 'IO', requiresReview: false });
    });
    it('uma mudança de oportunidade ou paciente exige revisão mesmo com a mesma dose devida', () => {
        opportunity(); meds.showMedModal(); meds.selectMedication('adrenalina');
        opportunity(); meds.recordMedication(); expect(state.medications).toHaveLength(0);
        el('medication-confirmed').checked = true; meds.recordMedication();
        expect(state.medications[0].requiresReview).toBe(true);
    });
    it('preserva edição manual, sem sobrescrever pelo refresh, e marca revisão', () => {
        opportunity(); meds.showMedModal(); meds.selectMedication('adrenalina');
        el('medication-dose').value = '2'; meds.updateMedicationDose(); meds.updateDrugStatusDisplay();
        expect(el('medication-dose').value).toBe('2');
        meds.recordMedication(); expect(state.medications).toHaveLength(0);
        el('medication-confirmed').checked = true; meds.recordMedication();
        expect(state.medications[0]).toMatchObject({ amount: 2, requiresReview: true });
    });
    it('revalida o contexto no commit mesmo sem refresh do modal após ROSC', () => {
        opportunity(); meds.showMedModal(); meds.selectMedication('adrenalina');
        state.roscAchieved = true; state.clinical.status = 'rosc';
        meds.recordMedication(); expect(state.medications).toHaveLength(0);
    });
    it('registra via editada e horário anterior exato, exigindo revisão manual', () => {
        opportunity(); meds.showMedModal(); meds.selectMedication('adrenalina');
        el('route-io').checked = true; el('medication-timing').value = 'retrospective';
        const effective = NOW - 60000;
        const date = new Date(effective);
        el('medication-effective-at').value = new Date(effective - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
        el('medication-confirmed').checked = true;
        meds.recordMedication();
        expect(state.medications[0]).toMatchObject({ route: 'IO', timestamp: effective, recordedAt: NOW, clinicalContext: null, shockCount: null, requiresReview: true, isRetrospective: true });
    });
});

describe('Preparo do paciente por toque', () => {
    it('novo preparo não herda protocolo, nome ou peso; ausentes ficam N/I', () => {
        core.executePCRFinish();
        el('patient-name').value = 'ANTERIOR SINTETICO'; el('patient-weight').value = '70'; el('patient-adult-protocol').checked = true;
        showPatientModal();
        expect(el('patient-name').value).toBe(''); expect(el('patient-weight').value).toBe('');
        expect(el('patient-adult-protocol').checked).toBe(false);
        window.confirm.mockClear(); startPCRWithUninformedData();
        expect(state.patient).toMatchObject({ algorithm: null, name: 'N/I', age: 'N/I', weight: 'N/I' });
        expect(window.confirm).not.toHaveBeenCalled();
    });
    it('seleção explícita adulta é preservada ao editar paciente ativo', () => {
        showPatientModal();
        expect(el('patient-adult-protocol').checked).toBe(true);
        el('patient-name').value = 'SINTETICO EDITADO';
        savePatientData({ preventDefault() {} });
        expect(state.patient.algorithm).toBe('adult'); expect(state.pcrActive).toBe(true);
    });
    it('reabre o preparo com ações de início após editar e encerrar o atendimento anterior', () => {
        showPatientModal();
        expect(el('start-pcr-no-data-btn').style.display).toBe('none');
        expect(document.querySelector('#patient-form button[type="submit"]').textContent).toBe('SALVAR ALTERAÇÕES');
        core.executePCRFinish(); showPatientModal();
        expect(el('start-pcr-no-data-btn').style.display).not.toBe('none');
        expect(document.querySelector('#patient-form button[type="submit"]').textContent).toBe('INICIAR ATENDIMENTO');
    });
    it.each(['sem dados', 'formulário'])('cancelar atendimento novo após ROSC via %s não troca o paciente anterior', entry => {
        rhythm.roscObtido(); const previous = state.patient;
        window.confirm.mockReturnValueOnce(false);
        if (entry === 'sem dados') startPCRWithUninformedData();
        else { el('patient-name').value = 'OUTRO SINTETICO'; savePatientData({ preventDefault() {} }); }
        expect(state.patient).toBe(previous); expect(state.pcrActive).toBe(false);
    });
});
