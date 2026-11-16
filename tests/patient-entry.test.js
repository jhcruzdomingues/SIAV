import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { state, resetPCRState } from '../src/config/state.js';
import { showPatientModal, savePatientData, updatePatientStartAction } from '../src/ui/patient.js';

const body = readFileSync('index.html', 'utf8').match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const el = id => document.getElementById(id);
let originalStart;
beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = body;
    resetPCRState();
    state.patient = { algorithm: null, name: 'ANTERIOR SINTETICO', age: 'N/I', weight: 'N/I' };
    originalStart = window.startPCR;
    // Controller fixture only. The existing PCR suites exercise the real engine.
    window.startPCR = vi.fn(() => { state.pcrActive = true; });
    vi.spyOn(window, 'alert').mockImplementation(() => {});
});
afterEach(() => {
    window.startPCR = originalStart;
    vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
});

describe('Entrada de PCR: formulário único e opcional', () => {
    it('mantém todos os campos abertos, opcionais e uma única ação de início', () => {
        expect(el('patient-form').querySelector('details')).toBeNull();
        expect(el('patient-form').querySelectorAll('[required]')).toHaveLength(0);
        expect(el('patient-form').querySelectorAll('button[type=submit]')).toHaveLength(1);
        expect(el('start-pcr-no-data-btn')).toBeNull();
        for (const id of ['patient-name', 'patient-age', 'patient-weight', 'patient-allergies', 'patient-comorbidities']) expect(el(id)).not.toBeNull();
    });
    it('novo preparo mostra adulto como padrão e remove dados/seleções do preparo anterior', () => {
        el('patient-name').value = 'RASCUNHO SINTETICO';
        el('patient-age').value = '45'; el('patient-weight').value = '70';
        el('patient-other-protocol').checked = true;
        showPatientModal();
        expect(el('patient-adult-protocol').checked).toBe(true);
        expect(el('patient-start-btn').textContent).toBe('INICIAR ATENDIMENTO ADULTO');
        expect(el('patient-modal').dataset.patientMode).toBe('new');
        for (const id of ['patient-name', 'patient-age', 'patient-weight']) expect(el(id).value).toBe('');
    });
    it('inicia com os campos vazios sem inventar idade, peso ou sexo', () => {
        showPatientModal(); savePatientData({ preventDefault() {} });
        expect(window.startPCR).toHaveBeenCalledOnce();
        expect(state.patient).toEqual({ algorithm: 'adult', name: 'N/I', age: 'N/I', sex: 'N/I', weight: 'N/I', allergies: 'Nenhuma informada', comorbidities: 'N/I' });
    });
    it.each(['', '5'])('respeita outro/não definido com idade %s, sem fallback adulto', age => {
        showPatientModal();
        el('patient-other-protocol').checked = true; el('patient-age').value = age;
        updatePatientStartAction();
        expect(el('patient-start-btn').textContent).toBe('INICIAR ATENDIMENTO');
        savePatientData({ preventDefault() {} });
        expect(state.patient.algorithm).toBeNull();
        expect(state.patient.age).toBe(age || 'N/I');
    });
    it('edição de atendimento preserva a seleção existente e não reinicia o núcleo', () => {
        state.pcrActive = true; state.pcrStartTime = 123456;
        const notes = state.notes, medications = state.medications;
        showPatientModal();
        expect(el('patient-other-protocol').checked).toBe(true);
        expect(el('patient-modal').dataset.patientMode).toBe('edit');
        expect(el('patient-start-btn').textContent).toBe('SALVAR ALTERAÇÕES');
        el('patient-name').value = 'EDITADO SINTETICO';
        savePatientData({ preventDefault() {} });
        expect(state.patient.algorithm).toBeNull();
        expect(state.pcrStartTime).toBe(123456);
        expect(state.notes).toBe(notes); expect(state.medications).toBe(medications);
        expect(window.startPCR).not.toHaveBeenCalled();
    });
    it('submits repetidos durante o fechamento iniciam uma única vez', () => {
        showPatientModal(); savePatientData({ preventDefault() {} });
        const patient = state.patient;
        el('patient-name').value = 'TOQUE REPETIDO';
        savePatientData({ preventDefault() {} });
        expect(window.startPCR).toHaveBeenCalledOnce();
        expect(state.patient).toBe(patient); expect(state.patient.name).toBe('N/I');
        showPatientModal(); expect(el('patient-start-btn').disabled).toBe(false);
    });
    it('início recusado mantém o paciente anterior e permite reabrir o formulário', () => {
        window.startPCR.mockImplementation(() => {});
        const previous = state.patient;
        showPatientModal(); savePatientData({ preventDefault() {} });
        expect(state.patient).toBe(previous); expect(state.pcrActive).toBe(false);
        showPatientModal(); expect(el('patient-start-btn').disabled).toBe(false);
    });
    it.each([['patient-age', '-1'], ['patient-weight', '0']])('valida %s quando informado, sem tornar o preenchimento obrigatório', (id, value) => {
        showPatientModal(); el(id).value = value;
        savePatientData({ preventDefault() {} });
        expect(window.startPCR).not.toHaveBeenCalled();
        expect(window.alert).toHaveBeenCalled();
        expect(el('patient-start-btn').disabled).toBe(false);
    });
});
