import { beforeEach, describe, it, expect, vi } from 'vitest';
import { state, resetPCRState } from '../src/config/state.js';
import { generateEvolution } from '../src/pcr/log.js';

// Never connect to the backend in report rendering tests.
vi.mock('../src/config/supabase.js', () => ({ supabase: {} }));
vi.mock('../src/ui/dom.js', () => ({ openModal: vi.fn(), closeModal: vi.fn(), showScreen: vi.fn(), showTransientAlert: vi.fn() }));

beforeEach(() => { resetPCRState(); state.patientLog = []; });
describe('Relatório e horário efetivo', () => {
    it('preserva quantidade exata, via, horário efetivo e registro retrospectivo no texto existente', () => {
        const effective = 1_800_000_000_000;
        const recorded = effective + 60000;
        state.medications = [{ name: 'Lidocaína', amount: 90.5, dose: '90.5 mg', route: 'IO', timestamp: effective, recordedAt: recorded, isRetrospective: true }];
        const report = generateEvolution(false);
        expect(report).toContain('90.5 mg via IO');
        expect(report).toContain(`horário efetivo: ${new Date(effective).toLocaleString('pt-BR')}`);
        expect(report).toContain(`registrado em: ${new Date(recorded).toLocaleString('pt-BR')}`);
        expect(report).toContain('retrospectivo');
    });
    it('primeira adrenalina usa o menor horário efetivo e não o último clique da timeline', () => {
        const first = 1_800_000_000_000;
        state.medications = [
            { name: 'Adrenalina', timestamp: first + 180000, recordedAt: first + 180000, isRetrospective: false },
            { name: 'Adrenalina', timestamp: first, recordedAt: first + 180000, isRetrospective: true }
        ];
        state.events = [{ time: '99:99', text: 'Adrenalina' }];
        expect(generateEvolution(false)).toContain(`<strong>Primeira Adrenalina:</strong> ${new Date(first).toLocaleString('pt-BR')}`);
        state.medications.push({ name: 'Adrenalina', timestamp: first - 180000 });
        expect(generateEvolution(false)).toContain('<strong>Primeira Adrenalina:</strong> N/I');
    });
});
