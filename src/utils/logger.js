/**
 * =============================================
 * SISTEMA DE LOGGING CONDICIONAL - SIAV
 * =============================================
 * Logs apenas em desenvolvimento, silencioso em produção
 */

const isDev = () => {
    // Verifica se está em modo desenvolvimento
    return window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname.includes('192.168') ||
           localStorage.getItem('VITE_DEV_MODE') === 'true';
};

export const logger = {
    log: (...args) => {
        if (isDev()) console.log(...args);
    },

    warn: (...args) => {
        if (isDev()) console.warn(...args);
    },

    error: (...args) => {
        // Erros sempre são exibidos
        console.error(...args);
    },

    info: (...args) => {
        if (isDev()) console.info(...args);
    },

    debug: (...args) => {
        if (isDev()) console.debug(...args);
    }
};

// Exportar também para uso global (código legado)
window.logger = logger;
