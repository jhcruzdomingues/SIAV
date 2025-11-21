/**
 * =============================================
 * MÓDULO i18n - INTERNACIONALIZAÇÃO
 * =============================================
 * Sistema de tradução multi-idioma
 */

import translations from './translations.js';
import { getItem, setItem } from '../services/storage.js';

let currentLocale = 'pt-BR';

/**
 * Inicializa o sistema de i18n
 */
export function initI18n() {
    // Carrega idioma salvo ou detecta do navegador
    const savedLocale = getItem('locale');

    if (savedLocale) {
        currentLocale = savedLocale;
    } else {
        // Detecta idioma do navegador
        const browserLang = navigator.language || navigator.userLanguage;

        if (browserLang.startsWith('en')) {
            currentLocale = 'en-US';
        } else if (browserLang.startsWith('es')) {
            currentLocale = 'es-ES';
        } else {
            currentLocale = 'pt-BR'; // Padrão
        }

        setItem('locale', currentLocale);
    }

    console.log(`🌍 i18n inicializado: ${currentLocale}`);
    applyTranslations();
}

/**
 * Obtém uma tradução
 * @param {string} key - Chave da tradução (ex: 'home.greeting')
 * @param {Object} params - Parâmetros para interpolação
 * @returns {string}
 */
export function t(key, params = {}) {
    const locale = translations[currentLocale] || translations['pt-BR'];
    let text = locale[key] || key;

    // Interpolação de parâmetros
    Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
    });

    return text;
}

/**
 * Altera o idioma atual
 * @param {string} locale - Código do idioma ('pt-BR', 'en-US', 'es-ES')
 */
export function setLocale(locale) {
    if (!translations[locale]) {
        console.warn(`⚠️ Idioma '${locale}' não suportado`);
        return;
    }

    currentLocale = locale;
    setItem('locale', locale);
    applyTranslations();

    console.log(`🌍 Idioma alterado para: ${locale}`);

    // Dispara evento customizado
    window.dispatchEvent(new CustomEvent('localeChanged', { detail: { locale } }));
}

/**
 * Obtém o idioma atual
 * @returns {string}
 */
export function getLocale() {
    return currentLocale;
}

/**
 * Aplica traduções a todos os elementos com atributo data-i18n
 */
export function applyTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');

    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = t(key);

        // Aplica ao conteúdo ou placeholder
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.placeholder = translation;
        } else {
            element.textContent = translation;
        }
    });
}

/**
 * Lista os idiomas disponíveis
 * @returns {Array<{code: string, name: string}>}
 */
export function getAvailableLocales() {
    return [
        { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
        { code: 'en-US', name: 'English (United States)', flag: '🇺🇸' },
        { code: 'es-ES', name: 'Español (España)', flag: '🇪🇸' }
    ];
}

/**
 * Formata número baseado no locale atual
 * @param {number} number - Número a formatar
 * @returns {string}
 */
export function formatNumber(number) {
    return new Intl.NumberFormat(currentLocale).format(number);
}

/**
 * Formata data baseado no locale atual
 * @param {Date} date - Data a formatar
 * @returns {string}
 */
export function formatDate(date) {
    return new Intl.DateTimeFormat(currentLocale).format(date);
}

export { currentLocale };
