/**
 * Testes para utilitários de formatação
 */

import { describe, it, expect } from 'vitest';
import { formatTime, formatDate, formatDateTime } from '../src/utils/formatters.js';
import { calculatePediatricDose } from '../src/utils/medications.js';

describe('Formatters', () => {
    describe('formatTime()', () => {
        it('deve formatar segundos em mm:ss', () => {
            expect(formatTime(0)).toBe('00:00');
            expect(formatTime(59)).toBe('00:59');
            expect(formatTime(60)).toBe('01:00');
            expect(formatTime(119)).toBe('01:59');
            expect(formatTime(120)).toBe('02:00');
        });

        it('deve formatar minutos longos corretamente', () => {
            expect(formatTime(600)).toBe('10:00'); // 10 minutos
            expect(formatTime(3599)).toBe('59:59'); // 59min 59s
            expect(formatTime(3600)).toBe('60:00'); // 1 hora
        });

        it('deve lidar com valores negativos (zero)', () => {
            expect(formatTime(-10)).toBe('00:00');
        });
    });

    describe('formatDate()', () => {
        it('deve formatar data no padrão brasileiro', () => {
            const date = new Date('2025-11-19T10:30:00');
            const formatted = formatDate(date);

            expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/); // dd/mm/yyyy
        });
    });

    describe('formatDateTime()', () => {
        it('deve formatar data e hora', () => {
            const date = new Date('2025-11-19T10:30:00');
            const formatted = formatDateTime(date);

            expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/); // Contém data
            expect(formatted).toMatch(/\d{2}:\d{2}/); // Contém hora
        });
    });

    describe('calculatePediatricDose()', () => {
        it('deve calcular dose de adrenalina pediátrica', () => {
            const dose = calculatePediatricDose('adrenalina', 20); // 20kg
            expect(dose).toBeDefined();
            expect(dose.value).toBeGreaterThan(0);
            expect(dose.unit).toBe('mg');
        });

        it('deve calcular dose de amiodarona pediátrica', () => {
            const dose = calculatePediatricDose('amiodarona', 15); // 15kg
            expect(dose).toBeDefined();
            expect(dose.value).toBeGreaterThan(0);
        });

        it('deve retornar null para medicação desconhecida', () => {
            const dose = calculatePediatricDose('medicacao_inexistente', 20);
            expect(dose).toBeNull();
        });

        it('deve calcular doses proporcionais ao peso', () => {
            const dose10kg = calculatePediatricDose('adrenalina', 10);
            const dose20kg = calculatePediatricDose('adrenalina', 20);

            expect(dose20kg.value).toBeGreaterThan(dose10kg.value);
        });
    });
});
