/**
 * =============================================
 * MÓDULO DE MANIPULAÇÃO DO DOM
 * =============================================
 * Gerencia elementos DOM, cache e atualizações de UI
 */

// Cache de elementos DOM para performance
const DOM_CACHE = {
    pcrTimer: null,
    hintBox: null,
    hintMessage: null,
    hintIcon: null,
    currentStep: null,
    cycleInfo: null,
    progressBar: null,
    compBtn: null,
    metroBtn: null,
    metroStatus: null,
    bpmValue: null,
    timelineEvents: null
};

/**
 * Inicializa o cache de elementos DOM
 * Deve ser chamado após o DOM estar carregado
 */
export function initDOMCache() {
    DOM_CACHE.pcrTimer = document.getElementById('pcr-timer');
    DOM_CACHE.hintBox = document.getElementById('protocol-hint-box');
    DOM_CACHE.hintMessage = document.getElementById('hint-message');
    DOM_CACHE.hintIcon = document.getElementById('hint-icon');
    DOM_CACHE.currentStep = document.getElementById('current-step');
    DOM_CACHE.cycleInfo = document.getElementById('cycle-info');
    DOM_CACHE.progressBar = document.getElementById('cycle-progress');
    DOM_CACHE.compBtn = document.getElementById('compressions-btn');
    DOM_CACHE.metroBtn = document.getElementById('metro-btn');
    DOM_CACHE.metroStatus = document.getElementById('metro-status');
    DOM_CACHE.bpmValue = document.getElementById('bpm-value');
    DOM_CACHE.timelineEvents = document.getElementById('timeline-events');

    console.log('✅ Cache DOM inicializado');
}

/**
 * Obtém um elemento do cache
 * @param {string} key - Chave do elemento no cache
 * @returns {HTMLElement|null}
 */
export function getElement(key) {
    return DOM_CACHE[key];
}

/**
 * Mostra uma tela específica
 * @param {string} screenName - Nome da tela ('home', 'pcr', 'dashboard', etc)
 */
export function showScreen(screenName) {
    // Esconde todas as telas
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));

    // Mostra a tela solicitada
    const targetScreen = document.getElementById(`${screenName}-screen`);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }

    // Atualiza navegação
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    const activeNav = document.getElementById(`nav-${screenName}`);
    if (activeNav) {
        activeNav.classList.add('active');
    }

    // Atualiza estado global
    if (window.SIAV?.state) {
        window.SIAV.state.currentScreen = screenName;
    }

    console.log(`📱 Tela ativa: ${screenName}`);
}

/**
 * Fecha um modal específico
 * @param {string} modalId - ID do modal a ser fechado
 */
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        
        // Aguarda a transição CSS de opacidade terminar
        setTimeout(() => {
            if (!modal.classList.contains('show')) {
                modal.style.display = 'none';
            }
        }, 300);
        
        // Limpa inputs e textareas esquecidos no modal para evitar dados fantasmas
        const forms = modal.querySelectorAll('form');
        forms.forEach(form => {
            if (form.id !== 'login-form' && form.id !== 'profile-update-form' && form.id !== 'login-form-simple' && form.id !== 'register-form-full') {
                const inputs = form.querySelectorAll('input:not([type="radio"]), textarea, select');
                inputs.forEach(input => {
                    if (input.type === 'checkbox') input.checked = false;
                    else input.value = '';
                });
            }
        });
    }
}

/**
 * Abre um modal específico
 * @param {string} modalId - ID do modal a ser aberto
 */
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }
}

/**
 * Mostra um alerta transitório na tela
 * @param {string} message - Mensagem a ser exibida
 * @param {string} style - Estilo: 'warning', 'success', 'danger'
 * @param {number} timeout - Tempo em ms até o alerta desaparecer
 */
export function showTransientAlert(message, style = 'warning', timeout = 4000) {
    // Sequestra alertas durante a PCR para manter a UX limpa
    if (window.SIAV?.state?.pcrActive && document.getElementById('pcr-screen')?.classList.contains('active')) {
        const banner = document.getElementById('pcr-feedback-banner');
        const icon = banner?.querySelector('.pcr-feedback-icon i');
        const text = banner?.querySelector('.pcr-feedback-text');
        
        if (banner && text && icon) {
            banner.className = `pcr-feedback-banner show ${style}`;
            text.innerHTML = message;
            
            if(style === 'success') icon.className = 'fas fa-check-circle';
            else if(style === 'danger') icon.className = 'fas fa-exclamation-triangle';
            else if(style === 'warning') icon.className = 'fas fa-exclamation-circle';
            else icon.className = 'fas fa-info-circle';
            
            if (window.pcrFeedbackTimeout) clearTimeout(window.pcrFeedbackTimeout);
            window.pcrFeedbackTimeout = setTimeout(() => { banner.classList.remove('show'); }, timeout);
            return;
        }
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `transient-alert alert-${style}`;
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(alertDiv);

    // Anima entrada
    setTimeout(() => alertDiv.classList.add('show'), 10);

    // Remove após timeout
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 300);
    }, timeout);
}

/**
 * Atualiza o ícone de um evento baseado no texto
 * @param {string} text - Texto do evento
 * @returns {string} HTML do ícone
 */
export function getIconForEvent(text) {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('choque') || lowerText.includes('shock')) {
        return '<i class="fas fa-bolt" style="color: #f39c12;"></i>';
    }
    if (lowerText.includes('adrenalina') || lowerText.includes('amiodarona') || lowerText.includes('medicação')) {
        return '<i class="fas fa-syringe" style="color: #3498db;"></i>';
    }
    if (lowerText.includes('ritmo') || lowerText.includes('fv') || lowerText.includes('tvsp')) {
        return '<i class="fas fa-heart-pulse" style="color: #e74c3c;"></i>';
    }
    if (lowerText.includes('rce') || lowerText.includes('pulso')) {
        return '<i class="fas fa-heart-circle-check" style="color: #27ae60;"></i>';
    }
    if (lowerText.includes('compressões') || lowerText.includes('rcp')) {
        return '<i class="fas fa-compress-arrows-alt" style="color: #9b59b6;"></i>';
    }

    return '<i class="fas fa-circle" style="color: #95a5a6;"></i>';
}

export { DOM_CACHE };
