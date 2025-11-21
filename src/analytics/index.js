/**
 * =============================================
 * SISTEMA DE ANALYTICS
 * =============================================
 * Suporta Google Analytics 4 e Plausible (privacy-focused)
 */

import { getItem, setItem } from '../services/storage.js';

let analyticsEnabled = true;
let analyticsProvider = 'plausible'; // 'google' ou 'plausible'

/**
 * Inicializa o sistema de analytics
 * @param {Object} config - Configuração
 * @param {string} config.provider - 'google' ou 'plausible'
 * @param {string} config.trackingId - ID de rastreamento
 */
export function initAnalytics(config = {}) {
    const userConsent = getItem('analytics_consent', true);

    if (!userConsent) {
        console.log('📊 Analytics desabilitado (sem consentimento)');
        analyticsEnabled = false;
        return;
    }

    analyticsProvider = config.provider || 'plausible';

    if (analyticsProvider === 'google') {
        initGoogleAnalytics(config.trackingId);
    } else {
        initPlausible(config.domain);
    }

    console.log(`📊 Analytics inicializado: ${analyticsProvider}`);
}

/**
 * Inicializa Google Analytics 4
 * @param {string} measurementId - ID de medição GA4 (ex: G-XXXXXXXXXX)
 */
function initGoogleAnalytics(measurementId) {
    if (!measurementId) {
        console.warn('⚠️ Google Analytics: measurementId não fornecido');
        return;
    }

    // Carrega script do Google Analytics
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    // Inicializa gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
        anonymize_ip: true, // Anonimiza IP para LGPD/GDPR
        cookie_flags: 'SameSite=None;Secure'
    });

    console.log('✅ Google Analytics inicializado');
}

/**
 * Inicializa Plausible Analytics (privacy-focused)
 * @param {string} domain - Domínio do site (ex: siav.app)
 */
function initPlausible(domain = window.location.hostname) {
    const script = document.createElement('script');
    script.defer = true;
    script.setAttribute('data-domain', domain);
    script.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(script);

    console.log('✅ Plausible Analytics inicializado');
}

/**
 * Rastreia um evento
 * @param {string} eventName - Nome do evento
 * @param {Object} params - Parâmetros do evento
 */
export function trackEvent(eventName, params = {}) {
    if (!analyticsEnabled) return;

    if (analyticsProvider === 'google' && window.gtag) {
        window.gtag('event', eventName, params);
    } else if (analyticsProvider === 'plausible' && window.plausible) {
        window.plausible(eventName, { props: params });
    }

    console.log(`📊 Evento rastreado: ${eventName}`, params);
}

/**
 * Rastreia visualização de página
 * @param {string} pagePath - Caminho da página
 * @param {string} pageTitle - Título da página
 */
export function trackPageView(pagePath, pageTitle) {
    if (!analyticsEnabled) return;

    if (analyticsProvider === 'google' && window.gtag) {
        window.gtag('config', window.GA_MEASUREMENT_ID, {
            page_path: pagePath,
            page_title: pageTitle
        });
    } else if (analyticsProvider === 'plausible' && window.plausible) {
        window.plausible('pageview', {
            url: pagePath,
            title: pageTitle
        });
    }

    console.log(`📊 Página rastreada: ${pagePath}`);
}

/**
 * Rastreia eventos específicos do SIAV
 */
export const SIAVAnalytics = {
    // PCR
    pcrStarted: () => trackEvent('pcr_started'),
    pcrFinished: (duration) => trackEvent('pcr_finished', { duration }),
    rhythmChecked: (rhythm) => trackEvent('rhythm_checked', { rhythm }),
    shockApplied: (energy) => trackEvent('shock_applied', { energy }),
    drugAdministered: (drug) => trackEvent('drug_administered', { drug }),
    roscAchieved: (time) => trackEvent('rosc_achieved', { time }),

    // Navegação
    screenViewed: (screenName) => trackEvent('screen_viewed', { screen: screenName }),

    // Protocolos e Estudos
    protocolViewed: (protocol) => trackEvent('protocol_viewed', { protocol }),
    studyGuideViewed: (guide) => trackEvent('study_guide_viewed', { guide }),

    // Quiz
    quizStarted: (config) => trackEvent('quiz_started', config),
    quizCompleted: (score) => trackEvent('quiz_completed', { score }),

    // Assinatura
    planViewed: (plan) => trackEvent('plan_viewed', { plan }),
    subscriptionStarted: (plan) => trackEvent('subscription_started', { plan }),
    subscriptionCompleted: (plan) => trackEvent('subscription_completed', { plan }),

    // Configurações
    settingsChanged: (setting) => trackEvent('settings_changed', { setting }),
    languageChanged: (language) => trackEvent('language_changed', { language }),

    // Erros
    error: (errorType, message) => trackEvent('error', { type: errorType, message })
};

/**
 * Define o consentimento de analytics
 * @param {boolean} consent - Se o usuário consentiu
 */
export function setAnalyticsConsent(consent) {
    setItem('analytics_consent', consent);
    analyticsEnabled = consent;

    if (consent) {
        console.log('✅ Consentimento de analytics concedido');
    } else {
        console.log('⛔ Consentimento de analytics revogado');
    }
}

/**
 * Obtém status do consentimento
 * @returns {boolean}
 */
export function getAnalyticsConsent() {
    return getItem('analytics_consent', true);
}
