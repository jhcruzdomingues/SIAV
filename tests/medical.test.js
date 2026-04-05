import { describe, it, expect } from 'vitest';
import { getShockRecommendation, getCalculatedPediatricValues } from '../src/protocols/medical.js';

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
});