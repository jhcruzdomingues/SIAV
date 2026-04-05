import { describe, it, expect } from 'vitest';
import {
  isPediatric,
  calculatePediatricDose,
  calculatePediatricShock
} from './formatters.js';

describe('Cálculos Médicos Pediátricos (formatters.js)', () => {
  
  describe('1. isPediatric()', () => {
    it('deve considerar como pediátrico pacientes com menos de 18 anos', () => {
      // expect(função(valor)).toBe(resultado_esperado)
      expect(isPediatric(17)).toBe(true);
      expect(isPediatric(5)).toBe(true);
      expect(isPediatric(0)).toBe(true);
    });

    it('deve considerar como adulto pacientes com 18 anos ou mais', () => {
      expect(isPediatric(18)).toBe(false);
      expect(isPediatric(45)).toBe(false);
    });
  });

  describe('2. calculatePediatricDose()', () => {
    it('deve calcular a dose exata multiplicando peso pela dosagem recomendada', () => {
      // Exemplo: Adrenalina é 0.01 mg/kg. Criança de 10kg = 0.1 mg.
      // NOTA: Usamos `toBeCloseTo` em vez de `toBe` para ignorar bugs de arredondamento decimal do JavaScript!
      expect(calculatePediatricDose(10, 0.01)).toBeCloseTo(0.1);
    });

    it('NÃO deve ultrapassar a dose máxima permitida para adultos', () => {
      // Exemplo: Adrenalina max é 1mg. Adolescente de 120kg * 0.01 = 1.2mg.
      // O sistema DEVE travar (clamp) o valor no máximo de 1mg.
      expect(calculatePediatricDose(120, 0.01, 1)).toBe(1);
    });
  });

  describe('3. calculatePediatricShock()', () => {
    it('deve calcular corretamente a energia do 1º choque (2 J/kg)', () => {
      // Criança de 15kg * 2 J/kg = 30 Joules
      expect(calculatePediatricShock(15, 2)).toBe(30);
    });

    it('NÃO deve ultrapassar a energia máxima permitida do desfibrilador (200J)', () => {
      // Adolescente de 60kg no 2º choque (4 J/kg) daria 240 Joules.
      // Como configuramos maxEnergy para 200J, o sistema deve limitar a 200.
      expect(calculatePediatricShock(60, 4, 200)).toBe(200);
    });
  });
});