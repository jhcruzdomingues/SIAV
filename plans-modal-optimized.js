// ================================================
// SIAV - MODAL DE PLANOS OTIMIZADO
// Versão: 3.0 - Alta Conversão
// ================================================

console.log('🚀 SCRIPT plans-modal-optimized.js CARREGADO!');

// ================================================
// CONFIGURAÇÃO DE PREÇOS
// ================================================

const PRICING_CONFIG = {
    estudante: {
        monthly: {
            price: 9.90,
            priceInCents: 990,
            display: '9,90',
            period: '/mês',
            detail: 'R$ 9,90 cobrado mensalmente'
        },
        annual: {
            price: 95.04,
            priceInCents: 9504,
            display: '7,92',
            period: '/mês',
            detail: 'R$ 95,04 cobrado anualmente',
            savings: 'R$ 23,76',
            totalAnnual: 'R$ 95,04'
        }
    },
    profissional: {
        monthly: {
            price: 19.90,
            priceInCents: 1990,
            display: '19,90',
            period: '/mês',
            detail: 'R$ 19,90 cobrado mensalmente'
        },
        annual: {
            price: 191.04,
            priceInCents: 19104,
            display: '15,92',
            period: '/mês',
            detail: 'R$ 191,04 cobrado anualmente',
            savings: 'R$ 47,76',
            totalAnnual: 'R$ 191,04'
        }
    },
    vitalicio: {
        lifetime: {
            price: 499.90,
            priceInCents: 49990,
            display: '499',
            period: ',90',
            detail: 'Pagamento único • Sem mensalidades'
        }
    }
};

// ================================================
// ESTADO GLOBAL
// ================================================

let isAnnualBilling = false; // Padrão: Mensal (para mostrar preços mensais primeiro)

// ================================================
// FUNÇÕES DE TOGGLE DE PERÍODO
// ================================================

/**
 * Alterna entre período mensal e anual
 */
function toggleBillingPeriod(period) {
    console.log(`🔄 toggleBillingPeriod chamado com período: "${period}"`);
    console.log(`   Estado anterior: ${isAnnualBilling ? 'Anual' : 'Mensal'}`);

    // Se period não for fornecido, toggle entre os dois
    if (!period) {
        isAnnualBilling = !isAnnualBilling;
    } else {
        isAnnualBilling = period === 'annual';
    }

    console.log(`   Novo estado: ${isAnnualBilling ? 'Anual' : 'Mensal'}`);

    // Atualizar estado visual dos botões IMEDIATAMENTE
    const buttons = document.querySelectorAll('.billing-label');
    console.log(`   Atualizando ${buttons.length} botões...`);
    buttons.forEach(btn => {
        const btnPeriod = btn.getAttribute('data-period');
        if (btnPeriod === 'annual' && isAnnualBilling) {
            btn.classList.add('active');
            console.log(`     ✓ Botão "annual" ativado`);
        } else if (btnPeriod === 'monthly' && !isAnnualBilling) {
            btn.classList.add('active');
            console.log(`     ✓ Botão "monthly" ativado`);
        } else {
            btn.classList.remove('active');
            console.log(`     ○ Botão "${btnPeriod}" desativado`);
        }
    });

    // Atualizar preços de todos os planos recorrentes
    updatePlanPricing('estudante');
    updatePlanPricing('profissional');

    // Analytics tracking
    trackEvent('toggle_billing', {
        billing_type: isAnnualBilling ? 'yearly' : 'monthly'
    });
}

/**
 * Atualiza os preços de um plano específico
 * @param {string} planId - ID do plano (estudante ou profissional)
 */
function updatePlanPricing(planId) {
    console.log(`💰 Atualizando preço do plano: "${planId}"`);

    const config = PRICING_CONFIG[planId];
    if (!config) {
        console.warn(`   ⚠️  Configuração não encontrada para plano: "${planId}"`);
        return;
    }

    const billingType = isAnnualBilling ? 'annual' : 'monthly';
    const pricingData = config[billingType];
    console.log(`   Tipo de cobrança: ${billingType}`);
    console.log(`   Preço a exibir: R$ ${pricingData.display}`);

    // Selecionar o card do plano
    const card = document.querySelector(`.plan-card[data-plan="${planId}"]`);
    if (!card) {
        console.warn(`   ⚠️  Card não encontrado para plano: "${planId}"`);
        return;
    }
    console.log(`   ✓ Card encontrado`);

    // Atualizar o valor do preço
    const priceValueElement = card.querySelector('.price-value');
    if (priceValueElement) {
        console.log(`   ✓ Atualizando preço: "${priceValueElement.textContent}" → "${pricingData.display}"`);
        priceValueElement.textContent = pricingData.display;
    } else {
        console.warn(`   ⚠️  Elemento .price-value não encontrado`);
    }

    // Atualizar o período
    const periodElement = card.querySelector('.period');
    if (periodElement) {
        console.log(`   ✓ Atualizando período: "${periodElement.textContent}" → "${pricingData.period}"`);
        periodElement.textContent = pricingData.period;
    } else {
        console.warn(`   ⚠️  Elemento .period não encontrado`);
    }

    // Atualizar os detalhes (cobrado mensalmente/anualmente)
    const annualInfo = card.querySelector('.annual-info');
    const monthlyInfo = card.querySelector('.monthly-info');

    if (isAnnualBilling) {
        if (annualInfo) {
            annualInfo.style.display = 'inline';
            annualInfo.textContent = pricingData.detail;
        }
        if (monthlyInfo) monthlyInfo.style.display = 'none';
    } else {
        if (annualInfo) annualInfo.style.display = 'none';
        if (monthlyInfo) {
            monthlyInfo.style.display = 'inline';
            monthlyInfo.textContent = pricingData.detail;
        }
    }

    // Atualizar badge de economia (apenas para plano anual)
    const annualSavings = card.querySelector('.annual-savings');
    const monthlySavings = card.querySelector('.monthly-savings');

    if (isAnnualBilling) {
        if (annualSavings && pricingData.savings) {
            annualSavings.style.display = 'inline';
            annualSavings.textContent = `Economize ${pricingData.savings}/ano`;
        }
        if (monthlySavings) monthlySavings.style.display = 'none';
    } else {
        if (annualSavings) annualSavings.style.display = 'none';
        if (monthlySavings) {
            monthlySavings.style.display = 'inline';
            monthlySavings.textContent = 'Economize 20% no plano anual';
        }
    }

    // Atualizar atributos data do botão CTA
    const ctaButton = card.querySelector('.plan-cta');
    if (ctaButton) {
        const priceAttr = isAnnualBilling ? 'data-price-anual' : 'data-price-mensal';
        ctaButton.setAttribute('data-current-price', ctaButton.getAttribute(priceAttr));
    }
}

// ================================================
// FUNÇÕES DE SELEÇÃO DE PLANO
// ================================================

/**
 * Processa a seleção de um plano
 * @param {string} planId - ID do plano selecionado
 */
function selectPlan(planId) {
    if (planId === 'free') {
        showAlert('Você já está no plano gratuito!', 'info');
        return;
    }

    // Determinar preço baseado no plano e período
    let pricingData;
    let priceInCents;

    if (planId === 'vitalicio') {
        pricingData = PRICING_CONFIG.vitalicio.lifetime;
        priceInCents = pricingData.priceInCents;
    } else {
        const billingType = isAnnualBilling ? 'annual' : 'monthly';
        pricingData = PRICING_CONFIG[planId][billingType];
        priceInCents = pricingData.priceInCents;
    }

    // Dados do plano para exibição
    const planNames = {
        estudante: 'Plano Estudante',
        profissional: 'Plano Profissional',
        vitalicio: 'Plano Vitalício'
    };

    const benefits = {
        estudante: [
            'Quiz completo com explicações',
            'Estudo aprofundado de casos',
            'Histórico limitado (1 paciente)',
            'Certificado digital de conclusão'
        ],
        profissional: [
            'Simulador Game Engine completo',
            'Logs ilimitados de pacientes',
            'Dashboard avançado com métricas',
            'Exportação de relatórios em PDF',
            'Suporte prioritário'
        ],
        vitalicio: [
            'Todos os recursos Profissional',
            'Acesso vitalício garantido',
            'Todas as atualizações futuras',
            'Novos módulos sem custo adicional',
            'Badge exclusivo de membro fundador'
        ]
    };

    // Construir mensagem de confirmação
    let confirmMsg = `✨ ${planNames[planId]}\n\n`;

    if (planId === 'vitalicio') {
        confirmMsg += `💰 Investimento: R$ ${pricingData.price.toFixed(2)}\n`;
        confirmMsg += `🎁 Pagamento único - Sem mensalidade!\n`;
    } else {
        if (isAnnualBilling) {
            const monthlyPrice = pricingData.display;
            const totalAnnual = pricingData.totalAnnual;
            confirmMsg += `💰 Investimento: R$ ${monthlyPrice}/mês\n`;
            confirmMsg += `📅 Cobrança anual: ${totalAnnual}\n`;
            confirmMsg += `🎁 Economia: ${pricingData.savings} por ano!\n`;
        } else {
            confirmMsg += `💰 Investimento: R$ ${pricingData.display}/mês\n`;
            confirmMsg += `📅 Cobrança mensal\n`;
        }
    }

    confirmMsg += `\n✅ Benefícios:\n- ${benefits[planId].join('\n- ')}`;
    confirmMsg += `\n\n🛡️ Garantia de 30 dias\n🔒 Pagamento 100% seguro`;

    // Confirmar com o usuário
    if (confirm(confirmMsg)) {
        // Track analytics
        trackEvent('select_plan', {
            plan: planId,
            period: planId === 'vitalicio' ? 'lifetime' : (isAnnualBilling ? 'yearly' : 'monthly'),
            price: priceInCents / 100
        });

        // Iniciar checkout
        initMercadoPagoCheckout(planId, isAnnualBilling, priceInCents);
    }
}

// ================================================
// INTEGRAÇÃO COM MERCADO PAGO (MOCK)
// ================================================

/**
 * Inicializa o checkout do Mercado Pago
 * @param {string} planId - ID do plano
 * @param {boolean} isAnnual - Se é cobrança anual
 * @param {number} priceInCents - Preço em centavos
 */
function initMercadoPagoCheckout(planId, isAnnual, priceInCents) {
    // Obter informações do usuário
    const userEmail = localStorage.getItem('userEmail') || 'usuario@exemplo.com';
    const userName = localStorage.getItem('userName') || 'Usuário';

    console.log('=== MOCK CHECKOUT MERCADO PAGO ===');
    console.log('Plano:', planId);
    console.log('Período:', isAnnual ? 'Anual' : 'Mensal');
    console.log('Preço (centavos):', priceInCents);
    console.log('Preço (R$):', (priceInCents / 100).toFixed(2));
    console.log('Usuário:', userName);
    console.log('Email:', userEmail);
    console.log('==================================');

    // Fechar modal de planos
    closePlansModal();

    // Mostrar loading
    showCheckoutLoading();

    // Simular processamento
    setTimeout(() => {
        hideCheckoutLoading();

        // MOCK: Em produção, aqui você integraria com a API do Mercado Pago
        // Exemplo: window.location.href = checkoutUrl;

        showAlert(
            `✅ CHECKOUT SIMULADO\n\n` +
            `Plano: ${planId.toUpperCase()}\n` +
            `Valor: R$ ${(priceInCents / 100).toFixed(2)}\n\n` +
            `Em produção, você seria redirecionado para o pagamento seguro do Mercado Pago.\n\n` +
            `Integração de pagamento removida para demonstração.`,
            'success'
        );
    }, 2000);
}

// ================================================
// FUNÇÕES DE UI (LOADING, ALERTS, ETC)
// ================================================

/**
 * Exibe modal de loading durante o checkout
 */
function showCheckoutLoading() {
    const loadingModal = document.createElement('div');
    loadingModal.id = 'checkout-loading-modal';
    loadingModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        animation: fadeIn 0.3s ease;
    `;

    loadingModal.innerHTML = `
        <div style="text-align: center; color: white;">
            <div style="font-size: 64px; margin-bottom: 24px; animation: pulse 1.5s infinite;">⏳</div>
            <h2 style="margin-bottom: 12px; font-size: 2rem; font-weight: 700;">Preparando seu checkout...</h2>
            <p style="font-size: 1.1rem; opacity: 0.9;">Redirecionando para pagamento seguro via Mercado Pago</p>
            <div style="margin-top: 24px; display: flex; align-items: center; justify-content: center; gap: 12px;">
                <div style="width: 12px; height: 12px; background: #27ae60; border-radius: 50%; animation: pulse 1s infinite;"></div>
                <div style="width: 12px; height: 12px; background: #3498db; border-radius: 50%; animation: pulse 1s infinite 0.2s;"></div>
                <div style="width: 12px; height: 12px; background: #f39c12; border-radius: 50%; animation: pulse 1s infinite 0.4s;"></div>
            </div>
        </div>
    `;

    document.body.appendChild(loadingModal);
}

/**
 * Remove modal de loading
 */
function hideCheckoutLoading() {
    const loadingModal = document.getElementById('checkout-loading-modal');
    if (loadingModal) {
        loadingModal.remove();
    }
}

/**
 * Exibe um alerta customizado
 * @param {string} message - Mensagem a exibir
 * @param {string} type - Tipo do alerta (info, success, error)
 */
function showAlert(message, type = 'info') {
    // Por enquanto, usar alert nativo
    // Em produção, você pode criar um modal customizado
    alert(message);
}

// ================================================
// FUNÇÕES DE MODAL
// ================================================

/**
 * Abre o modal de planos
 */
function openPlansModal() {
    const modal = document.getElementById('plans-modal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Track analytics
        trackEvent('open_plans_modal');

        // Iniciar countdown
        startCountdown();
    }
}

/**
 * Fecha o modal de planos
 */
function closePlansModal() {
    const modal = document.getElementById('plans-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';

        // Track analytics
        trackEvent('close_plans_modal');
    }
}

// ================================================
// COUNTDOWN TIMER
// ================================================

let countdownInterval = null;

/**
 * Inicia o countdown de urgência
 */
function startCountdown() {
    // Definir tempo final (23 horas, 45 minutos, 12 segundos a partir de agora)
    const endTime = new Date().getTime() + (23 * 60 * 60 + 45 * 60 + 12) * 1000;

    // Limpar interval anterior se existir
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    // Atualizar a cada segundo
    countdownInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = endTime - now;

        if (distance < 0) {
            clearInterval(countdownInterval);
            updateCountdownDisplay('00:00:00');
            return;
        }

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const timeString = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        updateCountdownDisplay(timeString);
    }, 1000);
}

/**
 * Atualiza o display do countdown
 * @param {string} timeString - String formatada do tempo
 */
function updateCountdownDisplay(timeString) {
    const countdownElement = document.getElementById('final-countdown');
    if (countdownElement) {
        countdownElement.textContent = timeString;
    }
}

/**
 * Adiciona zero à esquerda se necessário
 * @param {number} num - Número a formatar
 * @returns {string} - Número formatado
 */
function pad(num) {
    return num < 10 ? '0' + num : num;
}

// ================================================
// ANALYTICS TRACKING
// ================================================

/**
 * Envia evento para Google Analytics
 * @param {string} eventName - Nome do evento
 * @param {Object} eventParams - Parâmetros do evento
 */
function trackEvent(eventName, eventParams = {}) {
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, eventParams);
    }

    // Log para debugging
    console.log('Analytics Event:', eventName, eventParams);
}

// ================================================
// FUNÇÕES UTILITÁRIAS
// ================================================

// NOTA: As funções upgradePlan() e startSubscriptionFlow()
// já existem no script.js principal, então não redefinimos aqui
// para evitar conflitos

// ================================================
// INICIALIZAÇÃO
// ================================================

/**
 * Inicializa o modal de planos
 */
function initPlansModal() {
    console.log('🔄 Inicializando modal de planos...');

    // Event listeners para os botões de toggle
    const billingButtons = document.querySelectorAll('.billing-label');
    console.log(`📌 Encontrados ${billingButtons.length} botões de toggle`);

    billingButtons.forEach((button, index) => {
        const period = button.getAttribute('data-period');
        console.log(`  - Botão ${index + 1}: período="${period}"`);

        // Adicionar múltiplos event listeners para garantir que funciona
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log(`🔘 CLICK EVENT DISPARADO! Botão: ${period}`);
            const clickedPeriod = this.getAttribute('data-period');
            toggleBillingPeriod(clickedPeriod);
        }, true);

        // Adicionar também touchstart para mobile
        button.addEventListener('touchstart', function(e) {
            e.preventDefault();
            console.log(`👆 TOUCH EVENT DISPARADO! Botão: ${period}`);
            const clickedPeriod = this.getAttribute('data-period');
            toggleBillingPeriod(clickedPeriod);
        }, { passive: false });

        // Testar se o botão está clicável
        button.style.pointerEvents = 'auto';
        button.style.cursor = 'pointer';
        console.log(`  - Botão configurado com cursor e pointer-events`);
    });

    // Event listener para fechar modal ao clicar fora
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('plans-modal');
        if (e.target === modal) {
            closePlansModal();
        }
    });

    // Event listener para fechar modal com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('plans-modal');
            if (modal && modal.classList.contains('show')) {
                closePlansModal();
            }
        }
    });

    // Inicializar preços (garantir que estão corretos no carregamento)
    console.log(`💰 Estado inicial: ${isAnnualBilling ? 'Anual' : 'Mensal'}`);

    // Aguardar um pouco para garantir que o DOM está pronto
    setTimeout(() => {
        updatePlanPricing('estudante');
        updatePlanPricing('profissional');
    }, 100);

    console.log('✅ Modal de planos inicializado com sucesso');
}

// Aguardar DOM estar pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlansModal);
} else {
    initPlansModal();
}

// ================================================
// EXPORTAR FUNÇÕES GLOBALMENTE
// ================================================

// Exportar funções globalmente (exceto as que já existem no script.js)
window.openPlansModal = openPlansModal;
window.closePlansModal = closePlansModal;
window.toggleBillingPeriod = toggleBillingPeriod;
window.selectPlan = selectPlan;
window.initMercadoPagoCheckout = initMercadoPagoCheckout;
// NOTA: upgradePlan e startSubscriptionFlow já estão no script.js

// Função de teste para debug
window.testToggle = function() {
    console.log('🧪 TESTE MANUAL DO TOGGLE');
    console.log('Estado atual:', isAnnualBilling ? 'Anual' : 'Mensal');
    toggleBillingPeriod();
    console.log('Novo estado:', isAnnualBilling ? 'Anual' : 'Mensal');
};

console.log('💡 Para testar manualmente, digite no console: testToggle()');

// ================================================
// FIM DO ARQUIVO
// ================================================
