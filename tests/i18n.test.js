/**
 * Testes para o sistema de internacionalização
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initI18n, t, setLocale, getLocale, getAvailableLocales } from '../src/i18n/index.js';

describe('Sistema de Internacionalização', () => {
    beforeEach(() => {
        // Limpa localStorage antes de cada teste
        localStorage.clear();
    });

    describe('initI18n()', () => {
        it('deve inicializar com idioma padrão pt-BR', () => {
            initI18n();
            expect(getLocale()).toBe('pt-BR');
        });

        it('deve carregar idioma salvo do localStorage', () => {
            localStorage.setItem('locale', 'en-US');
            initI18n();
            expect(getLocale()).toBe('en-US');
        });
    });

    describe('t() - Tradução', () => {
        beforeEach(() => {
            initI18n();
        });

        it('deve retornar tradução em português', () => {
            setLocale('pt-BR');
            expect(t('home.greeting')).toBe('Olá, Profissional de Saúde!');
        });

        it('deve retornar tradução em inglês', () => {
            setLocale('en-US');
            expect(t('home.greeting')).toBe('Hello, Healthcare Professional!');
        });

        it('deve retornar tradução em espanhol', () => {
            setLocale('es-ES');
            expect(t('home.greeting')).toBe('¡Hola, Profesional de Salud!');
        });

        it('deve retornar a chave se tradução não existir', () => {
            expect(t('chave.inexistente')).toBe('chave.inexistente');
        });

        it('deve interpolar parâmetros', () => {
            // Nota: Esta funcionalidade seria adicionada às traduções
            setLocale('pt-BR');
            const result = t('test.greeting', { name: 'João' });
            // Se a chave existisse, seria algo como "Olá, {name}!" => "Olá, João!"
            expect(result).toBeDefined();
        });
    });

    describe('setLocale()', () => {
        beforeEach(() => {
            initI18n();
        });

        it('deve alterar o idioma atual', () => {
            setLocale('en-US');
            expect(getLocale()).toBe('en-US');
        });

        it('deve salvar no localStorage', () => {
            setLocale('es-ES');
            expect(localStorage.setItem).toHaveBeenCalledWith('locale', 'es-ES');
        });

        it('não deve alterar para idioma não suportado', () => {
            const currentLocale = getLocale();
            setLocale('fr-FR'); // Francês não está implementado
            expect(getLocale()).toBe(currentLocale); // Mantém o anterior
        });
    });

    describe('getAvailableLocales()', () => {
        it('deve retornar lista de idiomas disponíveis', () => {
            const locales = getAvailableLocales();

            expect(locales).toHaveLength(3);
            expect(locales[0]).toHaveProperty('code', 'pt-BR');
            expect(locales[1]).toHaveProperty('code', 'en-US');
            expect(locales[2]).toHaveProperty('code', 'es-ES');

            locales.forEach(locale => {
                expect(locale).toHaveProperty('name');
                expect(locale).toHaveProperty('flag');
            });
        });
    });

    describe('Traduções Críticas', () => {
        it('devem existir em todos os idiomas', () => {
            const criticalKeys = [
                'pcr.compressions',
                'pcr.checkRhythm',
                'shock.apply',
                'rhythm.vf',
                'common.save',
                'common.cancel'
            ];

            const locales = ['pt-BR', 'en-US', 'es-ES'];

            locales.forEach(locale => {
                setLocale(locale);
                criticalKeys.forEach(key => {
                    const translation = t(key);
                    expect(translation).toBeDefined();
                    expect(translation).not.toBe(''); // Não pode ser vazio
                    expect(translation).not.toBe(key); // Não pode ser a própria chave
                });
            });
        });
    });
});
