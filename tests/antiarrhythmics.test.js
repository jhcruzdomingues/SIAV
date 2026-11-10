import { describe, it, expect } from 'vitest';
import { evaluateMedicationGuidance, getProtocolNextStep, getAntiarrhythmicHistory } from '../src/protocols/medical.js';
import { NOW, snapshot, atStep, medication } from './helpers/clinical.js';
const evaluate = data => evaluateMedicationGuidance(data, NOW);

describe('Percurso AHA adulto e medicamentos', () => {
    it.each([4, 6])('não recomenda antiarrítmico no passo %i mesmo com muitos choques totais', step => {
        expect(evaluate(atStep(step, { shockCount: 20 })).amiodarona.status).toBe('not_due');
    });
    it.each([2, 3, 7])('oferece alternativas no passo 8 com total %i, sem inferir percurso pelo total', shockCount => {
        const result = evaluate(snapshot({ shockCount }));
        expect(result.amiodarona).toMatchObject({ status: 'due', dose: '300 mg EV/IO' });
        expect(result.lidocaina).toMatchObject({ status: 'due', dose: '1-1.5 mg/kg EV/IO' });
    });
    it.each([6, 8, 10, 11])('adrenalina indicada no passo %i independentemente do total de choques', step => {
        expect(evaluate(atStep(step, { shockCount: 0 })).adrenalina.status).toBe('due');
    });
    it('não oculta antiarrítmico quando há adrenalina pendente', () => {
        const panel = getProtocolNextStep(snapshot(), NOW);
        expect(panel.message).toContain('ADRENALINA');
        expect(panel.message).toContain('AMIODARONA OU LIDOCAÍNA');
        expect(panel.medicationGuidance.amiodarona.status).toBe('due');
    });
    it('adrenalina repete por horário efetivo e não pelo horário de registro', () => {
        expect(evaluate(atStep(10, { medications: [medication('Adrenalina')] })).adrenalina.status).toBe('not_due');
        expect(evaluate(atStep(10, { medications: [medication('Adrenalina', { timestamp: NOW - 180_000, recordedAt: NOW })] })).adrenalina.status).toBe('due');
    });
    it.each(['Amiodarona', 'Lidocaina', 'Lidocaína'])('mantém o fármaco %s no retorno ao passo 8', name => {
        const id = name === 'Amiodarona' ? 'amiodarona' : 'lidocaina';
        const first = medication(name);
        const sameOpportunity = snapshot({ medications: [first], clinical: { ...snapshot().clinical, compressionId: 'previous-opportunity' } });
        expect(evaluate(sameOpportunity)[id].status).toBe('not_due');
        const next = evaluate(snapshot({ medications: [first] }));
        expect(next[id]).toMatchObject({ status: 'due', number: 2 });
        expect(next[id].dose).toBe(id === 'amiodarona' ? '150 mg EV/IO' : '0.5-0.75 mg/kg EV/IO');
        expect(next[id === 'amiodarona' ? 'lidocaina' : 'amiodarona'].status).toBe('not_due');
    });
    it.each([
        { clinicalContext: null }, { isRetrospective: true }, { clinicalContext: { step: 6, compressionId: 'late' } },
        { episodeId: 'older-episode' }, { timestamp: undefined }, { amount: undefined }, { route: 'ET' }, { amount: 600 }
    ])('reavalia histórico incompleto ou administração fora do contexto: %j', overrides => {
        expect(evaluate(snapshot({ medications: [medication('Amiodarona', overrides)] })).amiodarona.status).toBe('review');
    });
    it('não inventa atraso fixo para uma primeira dose dada no choque 6 fora do passo 8', () => {
        const first = medication('Amiodarona', { shockCount: 6, clinicalContext: { step: 6, compressionId: 'late' } });
        for (const shockCount of [6, 7, 8, 20]) expect(evaluate(snapshot({ shockCount, medications: [first] })).amiodarona.status).toBe('review');
    });
    it('não associa fármacos nem recomenda terceira dose', () => {
        expect(evaluate(snapshot({ medications: [medication('Amiodarona'), medication('Lidocaina')] })).amiodarona.status).toBe('review');
        expect(evaluate(snapshot({ medications: [medication('Amiodarona'), medication('Amiodarona', { amount: 150 })] })).amiodarona.status).toBe('review');
    });
    it.each([
        { clinical: undefined }, { medications: undefined }, { isShockable: undefined }, { patient: { age: '' } }
    ])('dados ausentes exigem reavaliação: %j', overrides => {
        expect(evaluate(snapshot(overrides)).amiodarona.status).toBe('review');
    });
    it('não recomenda medicação em ROSC nem atendimento inativo', () => {
        expect(evaluate(snapshot({ roscAchieved: true })).amiodarona.status).toBe('blocked');
        expect(evaluate(snapshot({ pcrActive: false })).amiodarona.status).toBe('blocked');
    });
    it('mantém revisão quando o histórico foi perdido, mesmo após novos registros', () => {
        expect(evaluate(snapshot({ clinical: { ...snapshot().clinical, historyIncomplete: true } })).adrenalina.status).toBe('review');
        expect(evaluate(snapshot({ medications: [null] })).amiodarona.status).toBe('review');
    });
    it('adrenalina de outro episódio não autoriza intervalo presumido na nova PCR', () => {
        expect(evaluate(atStep(10, { medications: [medication('Adrenalina', { episodeId: 'older' })] })).adrenalina.status).toBe('review');
    });
    it('preserva contagem separada e grafias históricas', () => {
        const result = getAntiarrhythmicHistory([{ name: 'Amiodarona' }, { name: 'Lidocaína' }, { name: 'LIDOCAINA' }]);
        expect(result.amiodarona).toHaveLength(1);
        expect(result.lidocaina).toHaveLength(2);
    });
    it('a seleção adulta é explícita e não deduzida de idade ou peso', () => {
        expect(evaluate(snapshot({ patient: { age: 45, weight: 70 } })).amiodarona.status).toBe('review');
        expect(evaluate(snapshot({ patient: { algorithm: 'adult', age: 'N/I', weight: 'N/I' } })).amiodarona.status).toBe('due');
        expect(evaluate(snapshot({ patient: { algorithm: 'adult', age: 45, weight: 25 } })).amiodarona.dose).toBe('300 mg EV/IO');
    });
});
