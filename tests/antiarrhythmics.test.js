import { describe, it, expect } from 'vitest';
import { getAntiarrhythmicHistory, getProtocolNextStep } from '../src/protocols/medical.js';

const now = 1_800_000_000_000;
const adrenaline = { name: 'Adrenalina', timestamp: now };
const step = (overrides = {}) => getProtocolNextStep({
  currentPhase: 'compressions', isShockable: true, currentCycle: 10,
  shockCount: 3, medications: [adrenaline], ...overrides
}, now);

describe('Antiarrítmicos na PCR adulta FV/TVSP', () => {
  it.each([0, 1, 2])('não antecipa antiarrítmico com %i choques, mesmo com muitos ciclos', shockCount => {
    expect(step({ shockCount }).criticalAction).toBeNull();
  });

  it('oferece amiodarona OU lidocaína após o terceiro choque', () => {
    expect(step()).toMatchObject({ criticalAction: 'DRUG' });
    expect(step().message).toContain('AMIODARONA OU LIDOCAÍNA');
    expect(step().dose).toBe('Amiodarona: 300 mg EV/IO OU Lidocaína: 1-1.5 mg/kg EV/IO');
    expect(step().details).toContain('3º choque');
  });

  it.each(['preparation', 'rhythm_check', 'shock_advised'])('prioriza a fase %s', currentPhase => {
    expect(step({ currentPhase }).criticalAction).not.toBe('DRUG');
  });

  it('não recomenda antiarrítmico em AESP/assistolia após choques prévios', () => {
    expect(step({ isShockable: false, shockCount: 8 }).criticalAction).toBeNull();
  });

  it('não recomenda drogas enquanto o ritmo é desconhecido', () => {
    expect(step({ isShockable: undefined }).criticalAction).toBeNull();
  });

  it('usa choques efetivamente registrados para a adrenalina, preservando sua prioridade', () => {
    expect(step({ medications: [], shockCount: 1 }).criticalAction).toBeNull();
    expect(step({ medications: [], shockCount: 2, currentCycle: 1 }).message).toContain('ADRENALINA');
    expect(step({ medications: [] }).message).toContain('ADRENALINA');
    expect(step({ medications: [{ name: 'Adrenalina', timestamp: now - 180_000 }] }).message).toContain('ADRENALINA');
  });

  it('conta os medicamentos separadamente, aceitando grafias históricas', () => {
    const history = getAntiarrhythmicHistory([
      { name: 'Amiodarona' }, { name: 'Lidocaina' }, { name: 'LIDOCAÍNA' }, adrenaline
    ]);
    expect(history.amiodarona).toHaveLength(1);
    expect(history.lidocaina).toHaveLength(2);
  });

  it.each([
    ['Amiodarona', 'AMIODARONA', '150 mg EV/IO'],
    ['Lidocaina', 'LIDOCAÍNA', '0.5-0.75 mg/kg EV/IO'],
    ['Lidocaína', 'LIDOCAÍNA', '0.5-0.75 mg/kg EV/IO']
  ])('mantém %s e recomenda sua própria segunda dose', (name, label, dose) => {
    const medications = [adrenaline, { name, shockCount: 3 }];
    for (const shockCount of [3, 4]) {
      expect(step({ medications, shockCount }).criticalAction).toBeNull();
    }
    expect(step({ medications, shockCount: 5 })).toMatchObject({
      message: `${label} — 2ª DOSE DEVIDA`, dose, criticalAction: 'DRUG'
    });
    expect(step({ medications: [...medications, { name, shockCount: 5 }], shockCount: 7 }).criticalAction).toBeNull();
  });

  it('não repete imediatamente uma primeira dose registrada tardiamente', () => {
    const medications = [adrenaline, { name: 'Amiodarona', shockCount: 6 }];
    expect(step({ medications, shockCount: 6 }).criticalAction).toBeNull();
    expect(step({ medications, shockCount: 7 }).criticalAction).toBeNull();
    expect(step({ medications, shockCount: 8 }).dose).toBe('150 mg EV/IO');
  });

  it('aceita histórico antigo sem metadados de choque', () => {
    expect(step({ medications: [adrenaline, { name: 'Lidocaina' }], shockCount: 5 }).dose).toBe('0.5-0.75 mg/kg EV/IO');
  });

  it('não sugere troca ou associação automática quando os dois fármacos já foram registrados', () => {
    const result = step({ medications: [adrenaline, { name: 'Amiodarona' }, { name: 'Lidocaina' }], shockCount: 7 });
    expect(result.criticalAction).toBeNull();
    expect(result.details).toContain('Reavaliar a conduta clínica');
  });
});
