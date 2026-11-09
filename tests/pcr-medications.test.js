import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { state, compressionCycle, resetPCRState } from '../src/config/state.js';
import * as MedicalBrain from '../src/protocols/medical.js';
import { updateMedicationDose, recordMedication, stopDrugTimer } from '../src/pcr/medications.js';
import { addMedication } from '../src/pcr/events.js';
import { applyShockAndResume } from '../src/pcr/rhythm.js';
import { updatePcrGuidance } from '../src/ui/pcr-guidance.js';

vi.mock('../src/ui/dom.js', () => ({
  closeModal: vi.fn(), openModal: vi.fn(), showTransientAlert: vi.fn(), showScreen: vi.fn()
}));

beforeEach(() => {
  vi.useFakeTimers();
  resetPCRState();
  state.patient = { age: 45, weight: 70 };
  state.pcrActive = true;
  compressionCycle.currentPhase = 'compressions';
  compressionCycle.lastRhythmWasShockable = true;
  document.body.innerHTML = `
    <input id="medication-select"><input id="medication-dose">
    <input name="administration-route" type="radio" value="EV" checked>
    <button id="record-med-btn"><span class="sub-text"></span></button>
    <div id="med-preview-value"></div><div id="med-preview-name"></div><div id="med-preview-panel"></div>
    <input id="shock-applied-energy" value="200"><div id="final-shock-rhythm">FV</div>
    <div id="pcr-action-center"></div><button id="compressions-btn"></button>
    <div id="ac-status-badge"></div><div id="ac-cycle-counter"></div><div id="ac-icon"></div>
    <div id="ac-primary-text"></div><div id="ac-dose-container"></div><div id="ac-dose-text"></div>
    <div id="ac-details-container"></div><div id="ac-details-text"></div>`;
  window.MedicalBrain = MedicalBrain;
  window.updatePcrGuidance = updatePcrGuidance;
});

afterEach(() => {
  stopDrugTimer();
  vi.useRealTimers();
  delete window.MedicalBrain;
  delete window.updatePcrGuidance;
});

function record(id) {
  document.getElementById('medication-select').value = id;
  updateMedicationDose();
  recordMedication();
}

describe('Integração de choques, registro e orientação de antiarrítmicos', () => {
  it.each([
    ['amiodarona', 'Amiodarona', '300 mg EV/IO', '150 mg EV/IO'],
    ['lidocaina', 'Lidocaína', '70-105 mg (1-1.5 mg/kg EV/IO)', '35-52.5 mg (0.5-0.75 mg/kg EV/IO)']
  ])('registra e orienta %s sem misturar as doses', (id, name, firstDose, secondDose) => {
    applyShockAndResume();
    applyShockAndResume();
    expect(state.shockCount).toBe(2);
    record('adrenalina');
    expect(document.getElementById('ac-primary-text').textContent).not.toMatch(/AMIODARONA|LIDOCAÍNA/);

    applyShockAndResume();
    expect(state.shockCount).toBe(3);
    expect(document.getElementById('ac-primary-text').textContent).toContain('AMIODARONA OU LIDOCAÍNA');
    record(id);
    expect(state.medications[1]).toMatchObject({ name, dose: firstDose, route: 'EV', shockCount: 3 });
    expect(state.medications[1].timestamp).toBe(Date.now());
    expect(document.getElementById('ac-primary-text').textContent).not.toContain('2ª DOSE');

    applyShockAndResume();
    expect(document.getElementById('ac-primary-text').textContent).not.toContain('2ª DOSE');
    applyShockAndResume();
    expect(document.getElementById('ac-dose-text').textContent).toBe(MedicalBrain.getAdultAntiarrhythmicDose(id, 2));
    record(id);
    expect(state.medications[2]).toMatchObject({ name, dose: secondDose, shockCount: 5 });
    expect(document.getElementById('ac-primary-text').textContent).not.toContain('2ª DOSE');

    updateMedicationDose();
    expect(document.getElementById('record-med-btn').disabled).toBe(true);
    recordMedication();
    expect(state.medications).toHaveLength(3);
  });

  it('não conta energia inválida como um choque', () => {
    document.getElementById('shock-applied-energy').value = '0';
    applyShockAndResume();
    expect(state.shockCount).toBe(0);
  });

  it('preserva contagem separada no modal inclusive para registros antigos', () => {
    state.medications = [{ name: 'Lidocaina' }];
    document.getElementById('medication-select').value = 'amiodarona';
    updateMedicationDose();
    expect(document.getElementById('medication-dose').value).toBe('300 mg EV/IO');
    document.getElementById('medication-select').value = 'lidocaina';
    updateMedicationDose();
    expect(document.getElementById('medication-dose').value).toBe('35-52.5 mg (0.5-0.75 mg/kg EV/IO)');
  });

  it('preserva os cálculos pediátricos do modal', () => {
    state.patient = { age: 4, weight: 20 };
    for (const [id, dose] of [['amiodarona', '100 mg (5 mg/kg)'], ['lidocaina', '20.0 mg (1 mg/kg)']]) {
      document.getElementById('medication-select').value = id;
      updateMedicationDose();
      expect(document.getElementById('medication-dose').value).toBe(dose);
    }
  });

  it('o helper de registro também preserva o choque da administração', () => {
    state.shockCount = 6;
    addMedication({ name: 'Amiodarona', dose: '300 mg' });
    expect(state.medications[0]).toMatchObject({ name: 'Amiodarona', shockCount: 6, timestamp: Date.now() });
    resetPCRState();
    expect(state.medications).toEqual([]);
    expect(state.shockCount).toBe(0);
  });
});
