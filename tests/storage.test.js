/**
 * Testes para o sistema de armazenamento local
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setItem, getItem, removeItem, saveSettings, loadSettings } from '../src/services/storage.js';

describe('Storage Service', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    describe('setItem() e getItem()', () => {
        it('deve salvar e recuperar string', () => {
            setItem('test-key', 'test-value');
            expect(getItem('test-key')).toBe('test-value');
        });

        it('deve salvar e recuperar número', () => {
            setItem('number-key', 42);
            expect(getItem('number-key')).toBe(42);
        });

        it('deve salvar e recuperar objeto', () => {
            const obj = { name: 'SIAV', version: 2.0 };
            setItem('object-key', obj);
            expect(getItem('object-key')).toEqual(obj);
        });

        it('deve salvar e recuperar array', () => {
            const arr = [1, 2, 3, 'test'];
            setItem('array-key', arr);
            expect(getItem('array-key')).toEqual(arr);
        });

        it('deve retornar valor padrão se chave não existir', () => {
            expect(getItem('nonexistent', 'default')).toBe('default');
        });

        it('deve retornar null se chave não existir e sem default', () => {
            expect(getItem('nonexistent')).toBeNull();
        });
    });

    describe('removeItem()', () => {
        it('deve remover item do localStorage', () => {
            setItem('to-remove', 'value');
            expect(getItem('to-remove')).toBe('value');

            removeItem('to-remove');
            expect(getItem('to-remove')).toBeNull();
        });
    });

    describe('saveSettings() e loadSettings()', () => {
        it('deve salvar configurações completas', () => {
            const settings = {
                theme: 'dark',
                soundsEnabled: true,
                soundVolume: 0.8,
                locale: 'en-US'
            };

            saveSettings(settings);
            const loaded = loadSettings();

            expect(loaded).toEqual(settings);
        });

        it('deve carregar configurações padrão se não existirem', () => {
            const settings = loadSettings();

            expect(settings).toHaveProperty('theme');
            expect(settings).toHaveProperty('soundsEnabled');
            expect(settings).toHaveProperty('soundVolume');
            expect(settings).toHaveProperty('locale');
        });

        it('deve mesclar configurações parciais com padrões', () => {
            const partialSettings = {
                theme: 'dark'
            };

            saveSettings(partialSettings);
            const loaded = loadSettings();

            expect(loaded.theme).toBe('dark');
            expect(loaded).toHaveProperty('soundsEnabled'); // Mantém padrão
        });
    });

    describe('Casos de erro', () => {
        it('deve lidar com JSON inválido no localStorage', () => {
            localStorage.setItem('invalid-json', '{invalid json}');

            expect(() => getItem('invalid-json')).not.toThrow();
            expect(getItem('invalid-json', 'default')).toBe('default');
        });

        it('deve lidar com localStorage cheio', () => {
            // Mock de erro de quota
            vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('QuotaExceededError');
            });

            expect(() => setItem('key', 'value')).not.toThrow();
        });
    });
});
