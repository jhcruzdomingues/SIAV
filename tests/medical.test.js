import { describe, it, expect } from 'vitest';
import { getShockRecommendation, getCalculatedPediatricValues, getProtocolNextStep, calculateGlasgow } from '../src/protocols/medical.js';

describe('🧠 Módulo Médico - Protocolos AHA 2025', () => {

  describe('Cálculos de Dosagem Pediátrica', () => {
    it('Deve calcular corretamente as doses para uma criança de 20kg', () => {
      const doses = getCalculatedPediatricValues(20);
      expect(doses.adrenalina).toBe('0.20'); // 20kg * 0.01
      expect(doses.amiodarona).toBe('100');  // 20kg * 5
      expect(doses.shock1).toBe('40');       // 20kg * 2
      expect(doses.shock2).toBe('80');       // 20kg * 4
    });

    it('Deve respeitar o peso mínimo de 1kg para recém-nascidos (trava de segurança)', () => {
      const doses = getCalculatedPediatricValues(0.5); // Peso digitado 0.5kg
      expect(doses.adrenalina).toBe('0.01'); // Assume 1kg mínimo para evitar dose 0
    });
  });

  describe('Recomendações de Desfibrilação - Adulto', () => {
    it('Deve recomendar 200J para o primeiro choque em Fibrilação Ventricular', () => {
      const patient = { age: 45, weight: 80 };
      const result = getShockRecommendation(patient, 0, 'FV');

      expect(result.isShockable).toBe(true);
      expect(result.recommendedEnergy).toBe('200');
      expect(result.doseDetails).toContain('padrão adulto');
    });

    it('Não deve recomendar choque para Assistolia', () => {
      const patient = { age: 45, weight: 80 };
      const result = getShockRecommendation(patient, 0, 'Assistolia');

      expect(result.isShockable).toBe(false);
      expect(result.recommendedEnergy).toBe('N/A');
    });
  });

  describe('Recomendações de Desfibrilação - Pediátrica', () => {
    it('Deve recomendar 2 J/kg no 1º choque (Ex: Criança 15kg = 30J)', () => {
      const patient = { age: 4, weight: 15 };
      const result = getShockRecommendation(patient, 0, 'TVSP');
      expect(result.recommendedEnergy).toBe('30');
    });

    it('Deve recomendar 4 J/kg a partir do 2º choque (Ex: Criança 15kg = 60J)', () => {
      const patient = { age: 4, weight: 15 };
      const result = getShockRecommendation(patient, 1, 'FV');
      expect(result.recommendedEnergy).toBe('60');
    });
  });

  describe('Relógio de Medicações (Adrenalina e Amiodarona)', () => {
    it('Deve pedir Adrenalina IMEDIATAMENTE no 1º ciclo de ritmo não chocável (AESP/Assistolia)', () => {
      const state = { currentPhase: 'compressions', isShockable: false, medications: [], currentCycle: 1, shockCount: 0, elapsedSeconds: 10 };
      const step = getProtocolNextStep(state);
      expect(step.criticalAction).toBe('DRUG');
      expect(step.message).toContain('ADRENALINA');
    });

    it('Deve AGUARDAR 2 choques antes de pedir Adrenalina em ritmo chocável (FV/TVSP)', () => {
      const state = { currentPhase: 'compressions', isShockable: true, medications: [], currentCycle: 1, shockCount: 1, elapsedSeconds: 120 };
      const step = getProtocolNextStep(state);
      expect(step.criticalAction).toBeNull();
      expect(step.message).toContain('RCP DE ALTA QUALIDADE');
    });

    it('Deve pedir Adrenalina APÓS 2 choques em ritmo chocável', () => {
      const state = { currentPhase: 'compressions', isShockable: true, medications: [], currentCycle: 3, shockCount: 2, elapsedSeconds: 240 };
      const step = getProtocolNextStep(state);
      expect(step.criticalAction).toBe('DRUG');
      expect(step.message).toContain('ADMINISTRAR AGORA');
    });

    it('Deve recomendar Amiodarona 300mg após o 2º choque em FV/TVSP', () => {
      const state = { currentPhase: 'compressions', isShockable: true, medications: [{ name: 'Adrenalina', timestamp: Date.now() }], currentCycle: 3, shockCount: 2, elapsedSeconds: 250 };
      const step = getProtocolNextStep(state);
      expect(step.criticalAction).toBe('DRUG');
      expect(step.message).toContain('AMIODARONA');
      expect(step.dose).toContain('300 mg');
    });

    it('Deve calcular corretamente o intervalo de 3-5 minutos para a próxima Adrenalina', () => {
      const now = Date.now();
      const past2Minutes = now - (2 * 60 * 1000);
      
      const step1 = getProtocolNextStep({ currentPhase: 'compressions', isShockable: false, medications: [{ name: 'Adrenalina', timestamp: past2Minutes }], currentCycle: 2, shockCount: 0 }, now);
      expect(step1.criticalAction).toBeNull();
      expect(step1.message).toContain('RCP CONTÍNUA');
      
      const past4Minutes = now - (4 * 60 * 1000);
      const step2 = getProtocolNextStep({ currentPhase: 'compressions', isShockable: false, medications: [{ name: 'Adrenalina', timestamp: past4Minutes }], currentCycle: 3, shockCount: 0 }, now);
      expect(step2.criticalAction).toBe('DRUG');
      expect(step2.message).toContain('DOSE DEVIDA');
    });
  });

  describe('Escala de Coma de Glasgow (GCS)', () => {
    it('Deve calcular corretamente um TCE Leve (Score 15)', () => {
      const result = calculateGlasgow(4, 5, 6);
      expect(result.score).toBe(15);
      expect(result.severity).toContain('Leve');
      expect(result.color).toBe('success');
    });

    it('Deve calcular corretamente um TCE Grave com indicação de intubação (Score 3)', () => {
      const result = calculateGlasgow(1, 1, 1);
      expect(result.score).toBe(3);
      expect(result.severity).toContain('Grave');
      expect(result.severity).toContain('Intubação');
      expect(result.color).toBe('danger');
    });

    it('Deve retornar dados nulos se faltar algum critério', () => {
      const result = calculateGlasgow(4, 0, 6);
      expect(result.score).toBeNull();
      expect(result.severity).toContain('Selecione');
    });
  });
});