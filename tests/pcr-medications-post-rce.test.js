import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
vi.mock('../src/config/supabase.js', () => ({ supabase: {} }));
import { state, compressionCycle, resetPCRState } from '../src/config/state.js';
import * as core from '../src/pcr/core.js';
import * as rhythm from '../src/pcr/rhythm.js';
import * as meds from '../src/pcr/medications.js';
import * as vitals from '../src/pcr/vitals.js';
import { registerAllEvents } from '../src/ui/events.js';
import { finishPCRWithPostRceVitals } from '../src/ui/finish-attendance.js';
import { updatePcrGuidance } from '../src/ui/pcr-guidance.js';
import { addEvent } from '../src/ui/timeline.js';
import { generateEvolution } from '../src/pcr/log.js';
import { getClinicalSnapshot } from '../src/pcr/clinical.js';
import { evaluateMedicationGuidance } from '../src/protocols/medical.js';
import { getTimingSummary } from '../src/pcr/timing.js';
import { weightDoseMg } from '../src/utils/dose-math.js';
import { addMedication } from '../src/pcr/events.js';
import { MEDICATION_REGISTRATION } from '../src/utils/medication-registration.js';
import { MEDICATIONS, calculateDose } from '../src/utils/medications.js';

const body = readFileSync('index.html', 'utf8').match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const NOW = 1_800_000_000_000;
const el = id => document.getElementById(id);
const globals = ['startCompressions', 'updatePcrGuidance', 'stopMetronome', 'finishPCR', 'generateEvolution', 'addEvent', 'stopDrugTimer'];
let originals, listeners;
function opportunity(step = 10) {
    state.clinical.step = step; state.clinical.compressionId = crypto.randomUUID();
    compressionCycle.currentPhase = 'compressions'; compressionCycle.lastRhythmWasShockable = [4, 6, 8].includes(step);
}
function chooseRce() {
    el('finish-pcr-btn').click(); vi.advanceTimersByTime(20); el('rosc-btn').click(); vi.advanceTimersByTime(20);
}
function change(id, value) { el(id).value = value; el(id).dispatchEvent(new Event('input', { bubbles: true })); }
function openMed(id) { el('med-btn').click(); document.querySelector(`[data-med="${id}"]`).click(); }

beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(NOW); document.body.innerHTML = body; resetPCRState();
    state.patient = { algorithm: 'adult', name: 'SINTETICO', age: 'N/I', weight: 'N/I' };
    state.currentUser.isLoggedIn = false;
    originals = new Map(globals.map(key => [key, Object.getOwnPropertyDescriptor(window, key)]));
    Object.assign(window, { startCompressions: core.startCompressions, updatePcrGuidance, stopMetronome: vi.fn(),
        finishPCR: finishPCRWithPostRceVitals, generateEvolution: vi.fn(() => generateEvolution(false)), addEvent, stopDrugTimer: meds.stopDrugTimer });
    listeners = [];
    for (const target of [document, window]) {
        const add = target.addEventListener.bind(target);
        vi.spyOn(target, 'addEventListener').mockImplementation((...args) => { listeners.push([target, args]); add(...args); });
    }
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    registerAllEvents(); core.startPCR(); core.startCompressions();
});
afterEach(() => {
    core.clearAllIntervals(); meds.stopDrugTimer(); vi.clearAllTimers(); vi.useRealTimers();
    listeners.forEach(([target, args]) => target.removeEventListener(...args)); vi.restoreAllMocks();
    for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(window, key, descriptor); else delete window[key];
    }
});

describe('Sinais vitais somente após RCE confirmado, antes do relatório', () => {
    it('sem ritmo informa uma única ação curta, sem liberar medicação ou sinais vitais', () => {
        updatePcrGuidance();
        expect(el('ac-primary-text').textContent).toBe('Informe o ritmo.');
        expect(el('ac-next-step').hidden).toBe(true); expect(el('ac-safety-note').style.display).toBe('none');
        expect(el('vitals-btn')).toBeNull();
        expect(vitals.showVitalsModal()).toBe(false); vitals.recordVitals(); vitals.skipPostRceVitals();
        expect(state.events.some(event => /SINAIS VITAIS|PÓS-RCE/.test(event.text))).toBe(false);
        expect(state.pcrActive).toBe(true); expect(state.encounterOutcome).toBeNull();
        expect(evaluateMedicationGuidance(getClinicalSnapshot()).adrenalina.status).toBe('review');
    });
    it('histórico incompleto mantém a revisão e não é mascarado como apenas ritmo ausente', () => {
        state.clinical.historyIncomplete = true; updatePcrGuidance();
        expect(el('ac-primary-text').textContent).toContain('Reavalie');
        expect(el('ac-primary-text').textContent).not.toBe('Informe o ritmo.');
        expect(evaluateMedicationGuidance(getClinicalSnapshot()).adrenalina.status).toBe('review');
    });
    it('dados de medicação inválidos não são ocultados como apenas ritmo inicial ausente', () => {
        state.medications = [null]; updatePcrGuidance();
        expect(el('ac-primary-text').textContent).toContain('Reavalie');
        expect(evaluateMedicationGuidance(getClinicalSnapshot()).adrenalina.status).toBe('review');
    });
    it('RCE para o tempo imediatamente e inclui medidas do mesmo atendimento antes do único relatório', () => {
        vi.advanceTimersByTime(5000); chooseRce(); const confirmedAt = NOW + 5020;
        const summary = getTimingSummary();
        expect(state.roscAchieved).toBe(true); expect(state.clinical.status).toBe('rosc');
        expect(state.pcrActive).toBe(true); expect(window.generateEvolution).not.toHaveBeenCalled();
        expect(compressionCycle.active).toBe(false); expect(summary.totalMs).toBe(5020);
        vi.advanceTimersByTime(30000); expect(getTimingSummary()).toEqual(summary);
        change('vital-pa-sistolica', '120'); change('vital-pa-diastolica', '80'); change('vital-fc', '85');
        change('vital-spo2', '97'); change('vital-temp', '36,5');
        el('record-vitals-btn').click(); el('record-vitals-btn').click(); el('cancel-vitals-btn').click();
        expect(state.pcrActive).toBe(false); expect(window.generateEvolution).toHaveBeenCalledTimes(1);
        expect(state.encounterOutcome).toMatchObject({ type: 'rosc', timestamp: confirmedAt });
        const report = window.generateEvolution.mock.results[0].value;
        expect(report).toContain('SINAIS VITAIS PÓS-RCE: PA: 120x80 mmHg; FC: 85 bpm');
        expect(report).toContain('Temp: 36.5°C'); expect(report).toContain('RCE OBTIDO (ROSC)');
        expect(state.events.filter(event => event.text.startsWith('SINAIS VITAIS'))).toHaveLength(1);
        expect(getTimingSummary()).toEqual(summary);
    });
    it('o caminho de ritmo de perfusão usa o mesmo formulário sem segunda confirmação', () => {
        rhythm.roscObtido(); vi.advanceTimersByTime(20);
        expect(window.confirm).toHaveBeenCalledTimes(1); expect(state.roscAchieved).toBe(true);
        expect(el('pcr-screen').classList.contains('active')).toBe(true);
        expect(el('vitals-modal').classList.contains('show')).toBe(true);
        el('cancel-vitals-btn').click(); expect(state.encounterOutcome.type).toBe('rosc');
    });
    it('finalizar sem medidas não inventa valores ou estabilidade', () => {
        chooseRce(); el('cancel-vitals-btn').click(); el('cancel-vitals-btn').click();
        expect(window.generateEvolution).toHaveBeenCalledTimes(1);
        const report = window.generateEvolution.mock.results[0].value;
        expect(report).toContain('PÓS-RCE: sinais vitais não informados.');
        expect(report).not.toMatch(/SINAIS VITAIS PÓS-RCE:|Estáveis|PA: 0/);
    });
    it('ajuste do relógio após RCE não impede finalizar nem substitui a hora já confirmada', () => {
        vi.advanceTimersByTime(5000); chooseRce(); const summary = getTimingSummary();
        vi.setSystemTime(NOW + 1000); el('cancel-vitals-btn').click();
        expect(state.pcrActive).toBe(false); expect(state.encounterOutcome.timestamp).toBe(NOW + 5020);
        expect(window.generateEvolution).toHaveBeenCalledTimes(1); expect(getTimingSummary()).toEqual(summary);
    });
    it.each(['close', 'backdrop', 'escape'])('fechar por %s preserva RCE, rascunho e horário ao retomar', method => {
        chooseRce(); change('vital-fc', '85'); const summary = getTimingSummary();
        if (method === 'close') el('close-vitals-btn').click();
        if (method === 'backdrop') el('vitals-modal').click();
        if (method === 'escape') document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
        expect(state.roscAchieved).toBe(true); expect(state.pcrActive).toBe(true);
        expect(el('vitals-modal').classList.contains('show')).toBe(false);
        expect(window.generateEvolution).not.toHaveBeenCalled();
        vi.advanceTimersByTime(10000); chooseRce();
        expect(el('vital-fc').value).toBe('85');
        expect(state.events.filter(event => event.text.startsWith('ROSC OBTIDO'))).toHaveLength(1);
        el('record-vitals-btn').click();
        expect(state.encounterOutcome.timestamp).toBe(NOW + 20); expect(getTimingSummary()).toEqual(summary);
    });
    it('recorrência invalida formulário anterior e não aceita nem transporta suas medidas', () => {
        chooseRce(); change('vital-fc', '85'); const oldEpisode = state.clinical.episodeId;
        core.restartPCRAfterROSC();
        expect(state.clinical.episodeId).not.toBe(oldEpisode); vitals.recordVitals(); vitals.skipPostRceVitals();
        expect(state.encounterOutcome).toBeNull(); expect(state.pcrActive).toBe(true);
        expect(state.events.some(event => /SINAIS VITAIS PÓS-RCE/.test(event.text))).toBe(false);
        vitals.closeVitalsModal(); chooseRce();
        expect(el('vital-fc').value).toBe(''); el('cancel-vitals-btn').click();
        expect(state.encounterOutcome.episodeId).not.toBe(oldEpisode);
    });
    it('atendimento B não recebe valores nem finalização do formulário de A', () => {
        chooseRce(); change('vital-fc', '85'); core.executePCRFinish(); core.startPCR();
        const episode = state.clinical.episodeId;
        vitals.recordVitals(); vitals.skipPostRceVitals(); expect(state.pcrActive).toBe(true);
        expect(state.encounterOutcome).toBeNull(); expect(state.clinical.episodeId).toBe(episode);
        vitals.closeVitalsModal(); chooseRce(); expect(el('vital-fc').value).toBe('');
    });
    it('campos vazios e valores inválidos não encerram nem geram registros', () => {
        chooseRce(); el('record-vitals-btn').click(); expect(el('vitals-form-feedback').textContent).toContain('ao menos uma');
        change('vital-pa-sistolica', '0'); expect(el('vitals-form-feedback').hidden).toBe(true);
        el('record-vitals-btn').click(); expect(el('vitals-form-feedback').textContent).toContain('30 e 300');
        change('vital-pa-sistolica', ''); change('vital-temp', 'texto'); el('record-vitals-btn').click();
        expect(el('vitals-form-feedback').textContent).toContain('numéricas');
        expect(state.pcrActive).toBe(true); expect(window.generateEvolution).not.toHaveBeenCalled();
    });
    it('medição parcial e valor zero real não são substituídos por campos ausentes ou estabilidade', () => {
        chooseRce(); change('vital-pa-diastolica', '70'); change('vital-fc', '0'); el('record-vitals-btn').click();
        const report = window.generateEvolution.mock.results[0].value;
        expect(report).toContain('PA: N/Ix70 mmHg; FC: 0 bpm'); expect(report).not.toContain('Estáveis');
    });
    it('preserva os limiares de hipotensão e registra o alerta antes de finalizar', () => {
        expect(vitals.getVitalsStatus(80, 40, 100).status).toBe('hypotension');
        expect(vitals.getVitalsStatus(95, 70, 80).status).toBe('warning');
        expect(vitals.getVitalsStatus(120, 80, 85).status).toBe('stable');
        chooseRce(); change('vital-pa-sistolica', '80'); change('vital-pa-diastolica', '40'); change('vital-fc', '100');
        el('record-vitals-btn').click(); const report = window.generateEvolution.mock.results[0].value;
        expect(report).toContain('HIPOTENSÃO GRAVE'); expect(document.querySelector('.transient-alert.alert-danger').textContent).toContain('HIPOTENSÃO GRAVE');
    });
    it('formulário pós-RCE bloqueia atalhos ocultos e mantém navegação de foco', () => {
        chooseRce(); el('close-vitals-btn').focus();
        for (const code of ['KeyC', 'KeyM', 'KeyS', 'Digit1']) document.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
        expect(el('med-modal').classList.contains('show')).toBe(false); expect(state.shocks).toEqual([]);
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
        expect(document.activeElement).toBe(el('cancel-vitals-btn'));
    });
});

describe('Seleção de medicamento, dose fixa e cálculo somente quando indicado', () => {
    it('destaca rotina e mantém causas específicas e atropina separadas, sem sugestões novas', () => {
        expect([...document.querySelectorAll('.med-primary-options [data-med]')].map(el => el.dataset.med)).toEqual(['adrenalina', 'amiodarona']);
        expect([...document.querySelectorAll('.med-other-options [data-med]')].map(el => el.dataset.med)).toEqual(['lidocaina']);
        expect(document.querySelectorAll('.med-specific-options [data-med]')).toHaveLength(8);
        expect(document.querySelector('[data-med="alteplase"]').closest('details').id).toBe('medication-special-options');
        expect(document.querySelector('[data-med="atropina"]').closest('details').id).toBe('medication-other-options');
    });
    it('selecionar e trocar não registra; confirmar dose padrão registra uma operação rastreável', () => {
        opportunity(); openMed('amiodarona'); document.querySelector('[data-med="adrenalina"]').click();
        expect(state.medications).toEqual([]); expect(el('medication-dose').value).toBe('1');
        expect(el('medication-weight-field').hidden).toBe(true); expect(el('record-med-btn').disabled).toBe(false);
        expect(document.querySelector('[data-med="adrenalina"]').getAttribute('aria-pressed')).toBe('true');
        expect(document.querySelector('[data-med="amiodarona"]').getAttribute('aria-pressed')).toBe('false');
        el('record-med-btn').click(); el('record-med-btn').click();
        expect(state.medications).toHaveLength(1);
        expect(state.medications[0]).toMatchObject({ amount: 1, unit: 'mg', route: 'EV', timestamp: NOW, recordedAt: NOW,
            episodeId: state.clinical.episodeId, requiresReview: false, weightAtAdministration: null });
        expect(state.medications[0].id).toBeTruthy();
    });
    it('pede peso apenas ao selecionar lidocaína elegível e só o altera após confirmação', () => {
        opportunity(8); openMed('lidocaina');
        expect(el('medication-weight-field').hidden).toBe(false); expect(el('medication-dose').value).toBe('');
        change('medication-weight', '77.3'); expect(state.patient.weight).toBe('N/I');
        el('confirm-medication-weight').click();
        expect(state.patient.weight).toBe(77.3); expect(el('medication-weight-field').hidden).toBe(true);
        expect(el('med-preview-value').textContent).toContain('77.3–115.95 mg');
        expect(el('medication-dose').value).toBe(''); expect(el('record-med-btn').disabled).toBe(true);
        change('medication-dose', '100'); expect(el('record-med-btn').disabled).toBe(false);
        el('record-med-btn').click(); expect(state.medications[0]).toMatchObject({ amount: 100, weightAtAdministration: 77.3, requiresReview: false });
    });
    it.each(['', '0', '-1', '501'])('peso inválido %s não cria dose nem altera paciente', weight => {
        opportunity(8); openMed('lidocaina'); change('medication-weight', weight); el('confirm-medication-weight').click();
        expect(state.patient.weight).toBe('N/I'); expect(el('medication-dose').value).toBe(''); expect(state.medications).toEqual([]);
    });
    it.each([['adult', 4], ['pediatric', 8], [null, 8]])('não pede peso nem aplica faixa automática a %s no passo %s', (algorithm, step) => {
        opportunity(step); state.patient.algorithm = algorithm; openMed('lidocaina');
        expect(el('medication-weight-field').hidden).toBe(true); expect(el('medication-dose').value).toBe(''); expect(el('record-med-btn').disabled).toBe(true);
    });
    it('histórico incerto não libera sugestão por peso', () => {
        opportunity(8); state.clinical.historyIncomplete = true; openMed('lidocaina');
        expect(el('medication-weight-field').hidden).toBe(true); expect(el('medication-dose').value).toBe('');
        expect(el('med-preview-value').textContent).toContain('Reavaliar');
    });
    it('adrenalina já registrada e fora do intervalo não reapresenta dose como indicação atual', () => {
        opportunity(); openMed('adrenalina'); el('record-med-btn').click(); openMed('adrenalina');
        expect(el('med-preview-value').textContent).toBe('Aguarde o intervalo. A próxima dose ainda não está indicada.');
        expect(el('medication-dose').value).toBe(''); expect(el('record-med-btn').disabled).toBe(true);
    });
    it.each([[0, 77.3], [0, 115.95], [1, 38.65], [1, 57.975]])('preserva o limite válido da dose %s: %s mg sem erro binário', (previous, amount) => {
        state.patient.weight = 77.3; opportunity(8);
        if (previous) {
            openMed('lidocaina'); change('medication-dose', '77.3'); el('record-med-btn').click(); opportunity(8);
        }
        openMed('lidocaina'); expect(el('medication-weight-field').hidden).toBe(true);
        expect(el('medication-dose').value).toBe(''); change('medication-dose', String(amount));
        expect(el('record-med-btn').disabled).toBe(false); el('record-med-btn').click();
        expect(state.medications.at(-1)).toMatchObject({ amount, requiresReview: false, weightAtAdministration: 77.3 });
        opportunity(8); const guidance = evaluateMedicationGuidance(getClinicalSnapshot()).lidocaina;
        expect(guidance.reason).not.toContain('dose tardia');
        expect(guidance.status).toBe(previous ? 'review' : 'due');
    });
    it.each([77.299, 115.951])('valor fora da faixa %s exige revisão manual, sem tolerância clínica adicional', amount => {
        state.patient.weight = 77.3; opportunity(8); openMed('lidocaina'); change('medication-dose', String(amount));
        expect(el('record-med-btn').disabled).toBe(true); meds.recordMedication(); expect(state.medications).toEqual([]);
        el('medication-confirmed').checked = true; meds.updateMedicationDose(); el('record-med-btn').click();
        expect(state.medications[0].requiresReview).toBe(true);
    });
    it('normalização numérica conserva coeficientes e rejeita peso desconhecido', () => {
        expect(weightDoseMg(77.3, .75)).toBe(57.975); expect(weightDoseMg(70, 1.5)).toBe(105);
        expect(weightDoseMg(NaN, 1)).toBeNaN(); expect(weightDoseMg(0, 1)).toBeNaN();
    });
    it('um formulário antigo não confirma peso nem dose em outro atendimento', () => {
        opportunity(8); openMed('lidocaina'); change('medication-weight', '70');
        core.executePCRFinish(); core.startPCR(); opportunity(8); const episode = state.clinical.episodeId;
        el('confirm-medication-weight').click(); change('medication-dose', '100'); el('medication-confirmed').checked = true; meds.recordMedication();
        expect(state.patient.weight).toBe('N/I'); expect(state.medications).toEqual([]); expect(state.clinical.episodeId).toBe(episode);
    });
    it('troca de contexto não renova silenciosamente a autorização de faixa', () => {
        state.patient.weight = 70; opportunity(8); openMed('lidocaina'); change('medication-dose', '90');
        opportunity(8); meds.updateMedicationDose(); expect(el('record-med-btn').disabled).toBe(true);
        meds.recordMedication(); expect(state.medications).toEqual([]);
        el('medication-confirmed').checked = true; meds.recordMedication(); expect(state.medications[0].requiresReview).toBe(true);
    });
});

const specificEntries = ['gluconato_calcio', 'cloreto_calcio', 'naloxona', 'alteplase', 'tenecteplase', 'glicose50'];
describe('Catálogo de registro de causas específicas, sem prescrição automática', () => {
    it.each(specificEntries)('%s está disponível, mas não recebe dose de rotina nem dose calculada', id => {
        opportunity(8); openMed(id);
        expect(el('medication-dose').value).toBe(''); expect(el('record-med-btn').disabled).toBe(true);
        expect(el('med-preview-name').textContent).toBe(MEDICATION_REGISTRATION[id].name);
        expect(el('med-preview-value').getAttribute('role')).toBe('alert');
        expect(el('medication-unit').value).toBe(MEDICATION_REGISTRATION[id].unit);
        expect(el('medication-review-confirmation').hidden).toBe(false);
        expect(el('medication-weight-field').hidden).toBe(true);
        expect(evaluateMedicationGuidance(getClinicalSnapshot())[id]).toBeUndefined();
        expect(MEDICATIONS[id]).toBeUndefined(); expect(calculateDose(id, 70)).toBe('Medicação não encontrada');
        meds.recordMedication(); expect(state.medications).toEqual([]);
    });
    it.each(specificEntries)('%s exige dose exata e revisão; registra uma operação e conserva o nome/apresentação', id => {
        opportunity(8); openMed(id); change('medication-dose', '7.25');
        meds.recordMedication(); expect(state.medications).toEqual([]);
        el('medication-confirmed').click(); el('record-med-btn').click(); meds.recordMedication();
        expect(state.medications).toHaveLength(1);
        expect(state.medications[0]).toMatchObject({ medicationId: id, name: MEDICATION_REGISTRATION[id].name,
            amount: 7.25, unit: MEDICATION_REGISTRATION[id].unit, route: 'EV', requiresReview: true,
            timestamp: NOW, recordedAt: NOW, episodeId: state.clinical.episodeId });
        expect(state.medications[0].id).toBeTruthy();
        const report = generateEvolution(false);
        expect(report).toContain(MEDICATION_REGISTRATION[id].name);
        expect(report).toContain(`7.25 ${MEDICATION_REGISTRATION[id].unit} via EV`);
    });
    it.each(['IM', 'IN'])('naloxona permite documentar via %s sem extrapolar a faixa IV', route => {
        opportunity(10); openMed('naloxona');
        expect(el('route-' + route.toLowerCase()).closest('label').hidden).toBe(false);
        el('route-' + route.toLowerCase()).click(); change('medication-dose', '0.73');
        expect(el('med-preview-value').textContent).toContain('RCP/ventilação');
        expect(el('record-med-btn').disabled).toBe(true); el('medication-confirmed').click(); el('record-med-btn').click();
        expect(state.medications[0]).toMatchObject({ name: 'Naloxona', route, amount: 0.73, unit: 'mg', requiresReview: true });
        document.querySelector('[data-med="amiodarona"]').click();
        expect(el('route-ev').checked).toBe(true); expect(el('route-' + route.toLowerCase()).disabled).toBe(true);
        expect(el('medication-confirmed').checked).toBe(false);
    });
    it.each(['gluconato_calcio', 'cloreto_calcio', 'glicose50'])('%s registra mL sem converter automaticamente para massa ou outra apresentação', id => {
        opportunity(10); openMed(id); change('medication-dose', '3.7'); el('medication-confirmed').click(); el('record-med-btn').click();
        expect(state.medications[0].dose).toBe('3.7 mL'); expect(state.medications[0].amount).toBe(3.7);
        expect(el('medication-unit').querySelector('[value="mg"]').disabled).toBe(true);
    });
    it.each(specificEntries)('%s exige marcação de revisão também na função de gravação direta', id => {
        const entry = { id: crypto.randomUUID(), medicationId: id, name: MEDICATION_REGISTRATION[id].name,
            amount: 5, unit: MEDICATION_REGISTRATION[id].unit, route: 'EV', timestamp: NOW, requiresReview: false };
        expect(() => addMedication(entry)).toThrow(); expect(state.medications).toEqual([]);
        expect(addMedication({ ...entry, requiresReview: true })).not.toBeNull();
    });
    it.each([['adrenalina', 'mg', 'IN'], ['amiodarona', 'mg', 'IM'], ['adrenalina', 'mL', 'EV'],
        ['naloxona', 'mL', 'IN'], ['gluconato_calcio', 'mL', 'IM'], ['glicose50', 'g', 'EV'],
        ['alteplase', 'mg', 'ET'], ['tenecteplase', 'mg', 'IM']])('unidade/via não permitidas não gravam %s (%s/%s)', (id, unit, route) => {
        opportunity(10); openMed(id); change('medication-dose', '5'); el('medication-unit').value = unit;
        el('route-' + route.toLowerCase()).checked = true; el('medication-confirmed').checked = true; meds.updateMedicationDose();
        expect(el('record-med-btn').disabled).toBe(true); meds.recordMedication(); expect(state.medications).toEqual([]);
        expect(() => addMedication({ id: crypto.randomUUID(), medicationId: id, name: MEDICATION_REGISTRATION[id].name,
            amount: 5, unit, route, timestamp: NOW, requiresReview: true })).toThrow();
    });
    it('ID de naloxona não autoriza nome forjado nem libera unidades novas para registros legados desconhecidos', () => {
        expect(() => addMedication({ id: 'FORGED', medicationId: 'naloxona', name: 'Amiodarona', amount: 1,
            unit: 'mg', route: 'IN', timestamp: NOW, requiresReview: true })).toThrow();
        expect(() => addMedication({ id: 'UNKNOWN', name: 'SINTETICO', amount: 1, unit: 'mL', route: 'EV', timestamp: NOW })).toThrow();
        expect(state.medications).toEqual([]);
    });
    it.each(['medication-dose', 'medication-effective-at', 'medication-timing', 'route-in'])('alterar %s invalida revisão manual anterior', id => {
        opportunity(10); openMed('naloxona'); change('medication-dose', '0.73'); el('medication-confirmed').click();
        expect(el('record-med-btn').disabled).toBe(false);
        if (id === 'route-in') el(id).click();
        else if (id === 'medication-timing') { el(id).value = 'retrospective'; el(id).dispatchEvent(new Event('change', { bubbles: true })); }
        else change(id, id === 'medication-dose' ? '0.81' : '2026-01-01T00:00');
        expect(el('medication-confirmed').checked).toBe(false); expect(el('record-med-btn').disabled).toBe(true);
    });
    it('trocar uma apresentação de cálcio apaga dose e revisão, sem equivalência de volume entre sais', () => {
        opportunity(10); openMed('gluconato_calcio'); change('medication-dose', '3.7'); el('medication-confirmed').click();
        document.querySelector('[data-med="cloreto_calcio"]').click();
        expect(el('medication-dose').value).toBe(''); expect(el('medication-confirmed').checked).toBe(false);
        expect(el('medication-unit').value).toBe('mL'); expect(state.medications).toEqual([]);
    });
    it.each(['pediatric', null])('novas opções em protocolo %s permanecem registros manuais sem doses adultas', algorithm => {
        opportunity(8); state.patient.algorithm = algorithm; openMed('gluconato_calcio');
        expect(el('medication-dose').value).toBe(''); expect(el('medication-weight-field').hidden).toBe(true);
        expect(el('medication-review-confirmation').hidden).toBe(false); expect(el('record-med-btn').disabled).toBe(true);
    });
    it('um modal novo recolhe causas específicas, outros registros e não herda dose, via IN ou revisão', () => {
        openMed('naloxona'); el('medication-special-options').open = true; el('medication-other-options').open = true;
        el('route-in').click(); change('medication-dose', '0.73'); el('medication-confirmed').click();
        meds.cancelMedicationRecord(); meds.showMedModal();
        expect(el('medication-special-options').open).toBe(false); expect(el('medication-other-options').open).toBe(false);
        expect(el('medication-dose').value).toBe(''); expect(el('medication-confirmed').checked).toBe(false);
        expect(el('route-ev').checked).toBe(true); expect(el('route-in').disabled).toBe(true);
    });
    it('contexto ou atendimento alterado não registra medicamento específico no paciente seguinte', () => {
        opportunity(10); openMed('glicose50'); change('medication-dose', '3.7'); el('medication-confirmed').click();
        core.executePCRFinish(); core.startPCR(); opportunity(10); meds.recordMedication();
        expect(state.medications).toEqual([]); expect(el('medication-form-feedback').textContent).toContain('atendimento mudou');
    });
});

describe('Clareza, doses de amiodarona e aviso de seleção sem indicação', () => {
    it('preenche primeira dose de 300 mg e segunda de 150 mg somente em oportunidades distintas válidas', () => {
        opportunity(8); openMed('amiodarona');
        expect(el('medication-dose').value).toBe('300'); expect(el('med-preview-value').textContent).toBe('1ª dose');
        expect(el('med-preview-value').getAttribute('role')).toBe('status');
        expect(el('medication-edit-details').open).toBe(false); expect(el('medication-review-confirmation').hidden).toBe(true);
        expect(el('record-med-btn').disabled).toBe(false); expect(state.medications).toEqual([]);
        el('record-med-btn').click(); el('record-med-btn').click(); expect(state.medications).toHaveLength(1);
        opportunity(8); openMed('amiodarona');
        expect(el('medication-dose').value).toBe('150'); expect(el('med-preview-value').textContent).toBe('2ª dose');
        el('record-med-btn').click(); el('record-med-btn').click();
        expect(state.medications.map(m => m.amount)).toEqual([300, 150]);
        expect(state.medications.every(m => m.unit === 'mg' && m.route === 'EV' && !m.requiresReview)).toBe(true);
        opportunity(8); openMed('amiodarona');
        expect(el('medication-dose').value).toBe(''); expect(el('record-med-btn').disabled).toBe(true);
        expect(el('med-preview-value').textContent).toContain('Duas doses');
        expect(el('med-preview-value').getAttribute('role')).toBe('alert');
    });
    it('dose no mesmo ciclo gera alerta e não volta a preencher nem registrar automaticamente', () => {
        opportunity(8); openMed('amiodarona'); el('record-med-btn').click(); openMed('amiodarona');
        expect(el('med-preview-value').textContent).toContain('Não repetir');
        expect(el('med-preview-value').classList.contains('is-warning')).toBe(true);
        expect(el('medication-dose').value).toBe(''); expect(el('record-med-btn').disabled).toBe(true);
        expect(state.medications).toHaveLength(1);
    });
    it('droga não indicada no passo atual avisa imediatamente, sem abrir campos avançados', () => {
        opportunity(4); openMed('amiodarona');
        expect(el('med-preview-value').textContent).toBe('Amiodarona não indicada neste passo.');
        expect(el('med-preview-value').getAttribute('role')).toBe('alert');
        expect(el('med-preview-value').getAttribute('aria-live')).toBe('assertive');
        expect(el('medication-edit-details').open).toBe(false);
        expect(el('medication-review-confirmation').hidden).toBe(false);
        expect(el('medication-confirmed').closest('details')).toBeNull();
        expect(el('medication-dose').value).toBe(''); expect(state.medications).toEqual([]);
    });
    it('sem ritmo diferencia indicação não verificada de uma proibição clínica', () => {
        openMed('amiodarona');
        expect(el('med-preview-value').textContent).toContain('Indicação não verificada');
        expect(el('med-preview-value').textContent).not.toContain('não indicada neste passo');
        expect(el('medication-dose').value).toBe(''); expect(el('record-med-btn').disabled).toBe(true);
    });
    it('administração manual sem indicação automática exige revisão e preserva a rastreabilidade do fato', () => {
        opportunity(4); openMed('amiodarona'); change('medication-dose', '250');
        el('record-med-btn').click(); meds.recordMedication(); expect(state.medications).toEqual([]);
        el('medication-confirmed').click(); expect(el('record-med-btn').disabled).toBe(false);
        el('record-med-btn').click(); el('record-med-btn').click();
        expect(state.medications).toHaveLength(1);
        expect(state.medications[0]).toMatchObject({ amount: 250, unit: 'mg', route: 'EV', requiresReview: true,
            timestamp: NOW, recordedAt: NOW, episodeId: state.clinical.episodeId, isRetrospective: false });
    });
    it('edição da dose padrão exige revisão visível sem expandir os controles secundários', () => {
        opportunity(8); openMed('amiodarona'); change('medication-dose', '280');
        expect(el('medication-review-confirmation').hidden).toBe(false);
        expect(el('medication-edit-details').open).toBe(false); expect(el('record-med-btn').disabled).toBe(true);
        el('medication-confirmed').click(); el('record-med-btn').click();
        expect(state.medications[0]).toMatchObject({ amount: 280, requiresReview: true });
    });
    it('trocar a seleção limpa a revisão anterior e remove o aviso quando a indicação é válida', () => {
        opportunity(10); openMed('amiodarona'); change('medication-dose', '300'); el('medication-confirmed').click();
        el('medication-edit-details').open = true;
        document.querySelector('[data-med="adrenalina"]').click();
        expect(el('med-preview-value').classList.contains('is-warning')).toBe(false);
        expect(el('med-preview-value').hidden).toBe(true); expect(el('med-preview-value').textContent).toBe('');
        expect(el('medication-confirmed').checked).toBe(false); expect(el('medication-edit-details').open).toBe(false);
        expect(el('medication-dose').value).toBe('1'); expect(state.medications).toEqual([]);
    });
    it.each(['pediatric', null])('protocolo %s nunca recebe preset adulto de amiodarona', algorithm => {
        opportunity(8); state.patient.algorithm = algorithm; openMed('amiodarona');
        expect(el('medication-dose').value).toBe(''); expect(el('med-preview-value').getAttribute('role')).toBe('alert');
        expect(el('med-preview-value').textContent).toContain('Sem dose adulta');
        expect(el('record-med-btn').disabled).toBe(true);
    });
    it('histórico incompleto não sugere primeira ou segunda dose por simples contagem', () => {
        opportunity(8); state.clinical.historyIncomplete = true; openMed('amiodarona');
        expect(el('medication-dose').value).toBe(''); expect(el('med-preview-value').getAttribute('role')).toBe('alert');
        expect(el('med-preview-value').textContent).toContain('Indicação não verificada');
    });
    it('não associa amiodarona automaticamente depois de lidocaína registrada', () => {
        opportunity(8); state.patient.weight = 70; openMed('lidocaina'); change('medication-dose', '90'); el('record-med-btn').click();
        opportunity(8); openMed('amiodarona');
        expect(el('med-preview-value').textContent).toContain('Não associe');
        expect(el('medication-dose').value).toBe(''); expect(el('record-med-btn').disabled).toBe(true);
    });
    it.each([['adrenalina', 'mg'], ['amiodarona', 'mg'], ['lidocaina', 'mg'], ['atropina', 'mg'], ['bicarbonato', 'mEq'], ['sulfato', 'g']])('seleção de %s usa unidade existente %s sem inferir nova dose', (id, unit) => {
        opportunity(8); openMed(id);
        expect(el('medication-unit').value).toBe(unit); expect(el('medication-dose-unit').textContent).toBe(unit);
        if (!['adrenalina', 'amiodarona'].includes(id)) expect(el('medication-dose').value).toBe('');
        expect(state.medications).toEqual([]);
    });
    it.each(['atropina', 'bicarbonato', 'sulfato'])('%s sem avaliador específico recebe aviso, não indicação inventada', id => {
        opportunity(10); openMed(id);
        expect(el('med-preview-value').getAttribute('role')).toBe('alert');
        expect(el('med-preview-value').classList.contains('is-warning')).toBe(true);
        expect(el('medication-edit-details').open).toBe(false); expect(el('medication-dose').value).toBe('');
        expect(el('record-med-btn').disabled).toBe(true);
    });
    it('unidade manual pode ser editada explicitamente sem ser sobrescrita pelo relógio', () => {
        opportunity(10); openMed('bicarbonato'); el('medication-edit-details').open = true;
        vi.advanceTimersByTime(20);
        change('medication-unit', 'mg'); change('medication-dose', '25'); meds.updateDrugStatusDisplay();
        expect(el('medication-unit').value).toBe('mg'); expect(el('medication-edit-details').open).toBe(true);
        expect(el('record-med-btn').disabled).toBe(true);
        el('medication-confirmed').click(); el('record-med-btn').click();
        expect(state.medications[0]).toMatchObject({ unit: 'mg', amount: 25, requiresReview: true });
    });
    it('aviso muda quando o contexto muda, sem validar a dose anterior silenciosamente', () => {
        opportunity(8); openMed('amiodarona'); vi.advanceTimersByTime(20);
        state.clinical.pendingShock = { id: 'SYNTHETIC' };
        meds.updateDrugStatusDisplay();
        expect(el('med-preview-value').textContent).toContain('Choque pendente');
        expect(el('med-preview-value').getAttribute('role')).toBe('alert');
        expect(el('medication-review-confirmation').hidden).toBe(false); expect(el('record-med-btn').disabled).toBe(true);
        expect(state.medications).toEqual([]);
    });
});
