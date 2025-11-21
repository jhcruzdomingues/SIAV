/**
 * =============================================
 * MÓDULO DE ACESSIBILIDADE
 * =============================================
 * Melhora a navegação por teclado, leitores de tela e ARIA labels
 */

/**
 * Inicializa recursos de acessibilidade
 */
export function initAccessibility() {
    setupKeyboardNavigation();
    setupFocusManagement();
    improveARIALabels();
    setupSkipLinks();
    setupAnnouncementRegion();

    console.log('♿ Acessibilidade inicializada');
}

/**
 * Configura navegação por teclado
 */
function setupKeyboardNavigation() {
    // Navegação por Tab aprimorada
    document.addEventListener('keydown', (e) => {
        // ESC fecha modais
        if (e.key === 'Escape') {
            closeTopModal();
        }

        // Ctrl+/ ou Alt+/ mostra atalhos
        if ((e.ctrlKey || e.altKey) && e.key === '/') {
            e.preventDefault();
            showKeyboardShortcuts();
        }
    });

    // Atalhos de teclado para ações principais
    const shortcuts = {
        // PCR
        'Alt+P': () => document.getElementById('start-pcr-card')?.click(),
        'Alt+C': () => document.getElementById('compressions-btn')?.click(),
        'Alt+R': () => document.getElementById('rhythm-conduta-btn')?.click(),
        'Alt+M': () => document.getElementById('metro-btn')?.click(),

        // Navegação
        'Alt+H': () => showScreen('home'),
        'Alt+D': () => showScreen('dashboard'),

        // Funções
        'Alt+S': () => document.getElementById('settings-btn')?.click()
    };

    document.addEventListener('keydown', (e) => {
        const key = `${e.altKey ? 'Alt+' : ''}${e.ctrlKey ? 'Ctrl+' : ''}${e.key.toUpperCase()}`;
        const action = shortcuts[key];

        if (action) {
            e.preventDefault();
            action();
        }
    });
}

/**
 * Gerenciamento de foco
 */
function setupFocusManagement() {
    // Retém foco dentro de modais abertos
    document.addEventListener('focusin', (e) => {
        const openModals = document.querySelectorAll('.modal[style*="display: block"]');

        if (openModals.length > 0) {
            const topModal = openModals[openModals.length - 1];
            const focusableElements = topModal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            if (!topModal.contains(e.target)) {
                // Retorna foco para o primeiro elemento focável do modal
                focusableElements[0]?.focus();
            }
        }
    });

    // Destaca elemento focado visualmente
    document.addEventListener('focusin', (e) => {
        if (e.target.matches('button, a, input, select, textarea')) {
            e.target.classList.add('keyboard-focus');
        }
    });

    document.addEventListener('focusout', (e) => {
        e.target.classList.remove('keyboard-focus');
    });
}

/**
 * Melhora ARIA labels em elementos importantes
 */
function improveARIALabels() {
    // PCR Timer
    const pcrTimer = document.getElementById('pcr-timer');
    if (pcrTimer) {
        pcrTimer.setAttribute('role', 'timer');
        pcrTimer.setAttribute('aria-live', 'polite');
        pcrTimer.setAttribute('aria-atomic', 'true');
        pcrTimer.setAttribute('aria-label', 'Tempo total de PCR');
    }

    // Botão de compressões
    const compBtn = document.getElementById('compressions-btn');
    if (compBtn) {
        compBtn.setAttribute('aria-label', 'Iniciar compressões torácicas - Ciclo 30:2, 100-120 BPM');
        compBtn.setAttribute('aria-describedby', 'compressions-info');
    }

    // Timeline
    const timeline = document.getElementById('timeline-events');
    if (timeline) {
        timeline.setAttribute('role', 'log');
        timeline.setAttribute('aria-live', 'polite');
        timeline.setAttribute('aria-label', 'Linha do tempo de eventos da PCR');
    }

    // Navegação
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const text = item.textContent.trim();
        item.setAttribute('role', 'tab');
        item.setAttribute('aria-label', `Navegar para ${text}`);
    });

    // Cards clicáveis
    const cards = document.querySelectorAll('.card[role="button"]');
    cards.forEach(card => {
        if (!card.hasAttribute('tabindex')) {
            card.setAttribute('tabindex', '0');
        }

        // Permite ativar com Enter ou Space
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });
}

/**
 * Configura links de pular navegação
 */
function setupSkipLinks() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Pular para o conteúdo principal';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 0;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        z-index: 100;
    `;

    skipLink.addEventListener('focus', () => {
        skipLink.style.top = '0';
    });

    skipLink.addEventListener('blur', () => {
        skipLink.style.top = '-40px';
    });

    document.body.insertBefore(skipLink, document.body.firstChild);

    // Adiciona ID ao conteúdo principal
    const mainContent = document.querySelector('main');
    if (mainContent && !mainContent.id) {
        mainContent.id = 'main-content';
        mainContent.setAttribute('role', 'main');
    }
}

/**
 * Configura região de anúncios para leitores de tela
 */
function setupAnnouncementRegion() {
    const announcer = document.createElement('div');
    announcer.id = 'aria-announcer';
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
    `;

    document.body.appendChild(announcer);
}

/**
 * Anuncia mensagem para leitores de tela
 * @param {string} message - Mensagem a ser anunciada
 * @param {string} priority - 'polite' ou 'assertive'
 */
export function announce(message, priority = 'polite') {
    const announcer = document.getElementById('aria-announcer');
    if (!announcer) return;

    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;

    // Limpa após 1 segundo
    setTimeout(() => {
        announcer.textContent = '';
    }, 1000);
}

/**
 * Fecha o modal mais superior
 */
function closeTopModal() {
    const openModals = document.querySelectorAll('.modal[style*="display: block"]');
    if (openModals.length > 0) {
        const topModal = openModals[openModals.length - 1];
        topModal.style.display = 'none';
        announce('Modal fechado');
    }
}

/**
 * Mostra lista de atalhos de teclado
 */
function showKeyboardShortcuts() {
    const shortcuts = [
        { keys: 'Alt + P', description: 'Iniciar PCR' },
        { keys: 'Alt + C', description: 'Compressões torácicas' },
        { keys: 'Alt + R', description: 'Checar ritmo' },
        { keys: 'Alt + M', description: 'Ativar/desativar metrônomo' },
        { keys: 'Alt + H', description: 'Ir para Home' },
        { keys: 'Alt + D', description: 'Ir para Dashboard' },
        { keys: 'Alt + S', description: 'Abrir configurações' },
        { keys: 'ESC', description: 'Fechar modal' },
        { keys: 'Tab', description: 'Navegar entre elementos' }
    ];

    const html = `
        <div style="background: white; padding: 20px; border-radius: 8px; max-width: 500px;">
            <h3>⌨️ Atalhos de Teclado</h3>
            <ul style="list-style: none; padding: 0;">
                ${shortcuts.map(s => `
                    <li style="margin: 10px 0; display: flex; justify-content: space-between;">
                        <kbd style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${s.keys}</kbd>
                        <span>${s.description}</span>
                    </li>
                `).join('')}
            </ul>
            <button onclick="this.parentElement.parentElement.remove()" style="margin-top: 20px; padding: 10px 20px;">Fechar</button>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };

    document.body.appendChild(overlay);
    announce('Atalhos de teclado exibidos');
}

/**
 * Importa função showScreen (deve ser definida externamente)
 */
function showScreen(screenName) {
    if (window.SIAV?.showScreen) {
        window.SIAV.showScreen(screenName);
    }
}
