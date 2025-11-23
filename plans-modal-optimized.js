// ================================================
// SIAV - MODAL DE PLANOS OTIMIZADO V4.0
// Estratégia de Conversão - Meta: R$ 2.000.000
// ================================================

console.log('🚀 SCRIPT plans-modal-optimized.js V4.0 CARREGADO!');

// ================================================
// CONFIGURAÇÃO DE PREÇOS V4.0
// ================================================

const PRICING_CONFIG = {
    estudante: {
        monthly: {
            price: 24.90,
            priceInCents: 2490,
            display: '24,90',
            period: '/mês',
            detail: 'cobrado mensalmente'
        },
        annual: {
            price: 239.04,
            priceInCents: 23904,
            display: '19,92',
            period: '/mês',
            detail: 'cobrado anualmente (R$ 239,04/ano)',
            savings: 'R$ 59,76',
            totalAnnual: 'R$ 239,04'
        }
    },
    profissional: {
        monthly: {
            price: 49.90,
            priceInCents: 4990,
            display: '49,90',
            period: '/mês',
            detail: 'cobrado mensalmente'
        },
        annual: {
            price: 479.04,
            priceInCents: 47904,
            display: '39,92',
            period: '/mês',
            detail: 'cobrado anualmente (R$ 479,04/ano)',
            savings: 'R$ 119,76',
            totalAnnual: 'R$ 479,04'
        }
    },
    vitalicio: {
        lifetime: {
            price: 1199.90,
            priceInCents: 119990,
            display: '1.199',
            period: ',90',
            detail: 'Pagamento único • Sem mensalidades'
        }
    }
};

// ================================================
// ESTADO GLOBAL
// ================================================

let isAnnualBilling = true; // Padrão: Anual (para mostrar economia)

// ================================================
// FUNÇÕES DE TOGGLE DE PERÍODO
// ================================================

/**
 * Alterna entre período mensal e anual
 */
function toggleBillingPeriod(period) {
    console.log(`🔄 toggleBillingPeriod chamado com período: "${period}"`);
    console.log(`   Estado anterior: ${isAnnualBilling ? 'Anual' : 'Mensal'}`);

    if (!period) {
        isAnnualBilling = !isAnnualBilling;
    } else {
        isAnnualBilling = period === 'annual';
    }

    console.log(`   Novo estado: ${isAnnualBilling ? 'Anual' : 'Mensal'}`);

    // Atualizar estado visual dos botões
    const buttons = document.querySelectorAll('.billing-label');
    buttons.forEach(btn => {
        const btnPeriod = btn.getAttribute('data-period');
        if (btnPeriod === 'annual' && isAnnualBilling) {
            btn.classList.add('active');
        } else if (btnPeriod === 'monthly' && !isAnnualBilling) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Atualizar preços
    updatePlanPricing('estudante');
    updatePlanPricing('profissional');

    // Analytics
    trackEvent('toggle_billing', {
        billing_type: isAnnualBilling ? 'yearly' : 'monthly'
    });
}

/**
 * Atualiza os preços de um plano específico
 */
function updatePlanPricing(planId) {
    console.log(`💰 Atualizando preço do plano: "${planId}"`);

    const config = PRICING_CONFIG[planId];
    if (!config) return;

    const billingType = isAnnualBilling ? 'annual' : 'monthly';
    const pricingData = config[billingType];

    const card = document.querySelector(`.plan-card[data-plan="${planId}"]`);
    if (!card) return;

    // Atualizar preço
    const priceValueElement = card.querySelector('.price-value');
    if (priceValueElement) {
        priceValueElement.textContent = pricingData.display;
    }

    // Atualizar período
    const periodElement = card.querySelector('.period');
    if (periodElement) {
        periodElement.textContent = pricingData.period;
    }

    // Atualizar detalhes
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

    // Atualizar badge de economia
    const annualSavings = card.querySelector('.annual-savings');
    const monthlySavings = card.querySelector('.monthly-savings');

    if (isAnnualBilling) {
        if (annualSavings && pricingData.savings) {
            annualSavings.style.display = 'inline';
            annualSavings.textContent = `💰 Economize ${pricingData.savings}/ano`;
        }
        if (monthlySavings) monthlySavings.style.display = 'none';
    } else {
        if (annualSavings) annualSavings.style.display = 'none';
        if (monthlySavings) {
            monthlySavings.style.display = 'inline';
            monthlySavings.textContent = 'ou economize 20% no plano anual';
        }
    }

    // Atualizar botão CTA
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
 */
function selectPlan(planId) {
    if (planId === 'free') {
        showAlert('Você já está no plano gratuito!', 'info');
        return;
    }

    // Determinar preço
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

    // Dados do plano
    const planNames = {
        estudante: 'Plano Estudante',
        profissional: 'Plano Profissional',
        vitalicio: 'Plano Vitalício'
    };

    const benefits = {
        estudante: [
            'Acesso ao Simulador: 5 casos/dia',
            'Quiz completo com explicações',
            'Estudo aprofundado de casos',
            'Log de desempenho: 1 paciente',
            'Certificado digital'
        ],
        profissional: [
            'Simulador ILIMITADO',
            'Logs ilimitados de pacientes',
            'Dashboard avançado',
            'Exportação de relatórios PDF',
            'Suporte prioritário'
        ],
        vitalicio: [
            'Todos os recursos Profissional',
            'Acesso vitalício garantido',
            'Todas as atualizações futuras',
            'Acesso Beta Prioritário',
            'Badge exclusivo de membro fundador'
        ]
    };

    // Mensagem de confirmação
    let confirmMsg = `✨ ${planNames[planId]}\n\n`;

    if (planId === 'vitalicio') {
        confirmMsg += `💰 Investimento: R$ ${pricingData.price.toFixed(2)}\n`;
        confirmMsg += `🎁 Pagamento único - Sem mensalidade!\n`;
    } else {
        if (isAnnualBilling) {
            confirmMsg += `💰 Investimento: R$ ${pricingData.display}/mês\n`;
            confirmMsg += `📅 Cobrança anual: ${pricingData.totalAnnual}\n`;
            confirmMsg += `🎁 Economia: ${pricingData.savings} por ano!\n`;
        } else {
            confirmMsg += `💰 Investimento: R$ ${pricingData.display}/mês\n`;
            confirmMsg += `📅 Cobrança mensal\n`;
        }
    }

    confirmMsg += `\n✅ Benefícios:\n- ${benefits[planId].join('\n- ')}`;
    confirmMsg += `\n\n🛡️ Garantia de 7 dias\n🔒 Pagamento 100% seguro`;

    if (confirm(confirmMsg)) {
        trackEvent('select_plan', {
            plan: planId,
            period: planId === 'vitalicio' ? 'lifetime' : (isAnnualBilling ? 'yearly' : 'monthly'),
            price: priceInCents / 100
        });

        initMercadoPagoCheckout(planId, isAnnualBilling, priceInCents);
    }
}

// ================================================
// INTEGRAÇÃO COM MERCADO PAGO
// ================================================

function initMercadoPagoCheckout(planId, isAnnual, priceInCents) {
    const userEmail = localStorage.getItem('userEmail') || 'usuario@exemplo.com';
    const userName = localStorage.getItem('userName') || 'Usuário';

    console.log('=== CHECKOUT MERCADO PAGO ===');
    console.log('Plano:', planId);
    console.log('Período:', isAnnual ? 'Anual' : 'Mensal');
    console.log('Preço (R$):', (priceInCents / 100).toFixed(2));

    closePlansModal();
    showCheckoutLoading();

    setTimeout(() => {
        hideCheckoutLoading();
        showAlert(
            `✅ CHECKOUT SIMULADO\n\n` +
            `Plano: ${planId.toUpperCase()}\n` +
            `Valor: R$ ${(priceInCents / 100).toFixed(2)}\n\n` +
            `Em produção, você seria redirecionado para o pagamento seguro do Mercado Pago.`,
            'success'
        );
    }, 2000);
}

// ================================================
// FUNÇÕES DE UI
// ================================================

function showCheckoutLoading() {
    const loadingModal = document.createElement('div');
    loadingModal.id = 'checkout-loading-modal';
    loadingModal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.95); display: flex;
        align-items: center; justify-content: center; z-index: 99999;
    `;
    loadingModal.innerHTML = `
        <div style="text-align: center; color: white;">
            <div style="font-size: 64px; margin-bottom: 24px;">⏳</div>
            <h2 style="margin-bottom: 12px; font-size: 2rem;">Preparando seu checkout...</h2>
            <p style="font-size: 1.1rem;">Redirecionando para pagamento seguro</p>
        </div>
    `;
    document.body.appendChild(loadingModal);
}

function hideCheckoutLoading() {
    const loadingModal = document.getElementById('checkout-loading-modal');
    if (loadingModal) loadingModal.remove();
}

function showAlert(message, type = 'info') {
    alert(message);
}

// ================================================
// FUNÇÕES DE MODAL
// ================================================

function openPlansModal() {
    const modal = document.getElementById('plans-modal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        trackEvent('open_plans_modal');
    }
}

function closePlansModal() {
    const modal = document.getElementById('plans-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        trackEvent('close_plans_modal');
    }
}

/**
 * NOVA FUNÇÃO V4.0: Exibe modal de upgrade com contexto de bloqueio
 */
function showUpgradeModal(context = {}) {
    console.log('💡 Abrindo modal de upgrade com contexto:', context);

    const modal = document.getElementById('plans-modal');
    if (!modal) {
        console.error('❌ Modal de planos não encontrada!');
        return;
    }

    // Exibir modal
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    // Se houver contexto de bloqueio, adicionar mensagem de urgência
    if (context.upgradeRequired) {
        const header = modal.querySelector('.plans-header');
        if (header) {
            // Remover mensagem anterior se existir
            const existingMsg = header.querySelector('.upgrade-urgency-message');
            if (existingMsg) existingMsg.remove();

            // Adicionar nova mensagem
            const urgencyMsg = document.createElement('div');
            urgencyMsg.className = 'upgrade-urgency-message';
            urgencyMsg.style.cssText = `
                background: #e74c3c; color: white; padding: 16px;
                border-radius: 12px; margin: 16px 0; text-align: center;
                font-weight: 600; font-size: 1.1rem; line-height: 1.5;
                box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
            `;
            urgencyMsg.innerHTML = `
                🚫 ${context.message || 'Limite atingido!'}<br>
                <span style="font-size: 0.95rem; font-weight: 500; opacity: 0.95;">
                    Faça upgrade agora e continue treinando sem limites!
                </span>
            `;
            header.appendChild(urgencyMsg);
        }
    }

    // Analytics
    trackEvent('open_upgrade_modal', {
        reason: context.reason || 'unknown',
        current_plan: context.currentPlan || 'unknown'
    });
}

// ================================================
// ANALYTICS
// ================================================

function trackEvent(eventName, eventParams = {}) {
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, eventParams);
    }
    console.log('Analytics Event:', eventName, eventParams);
}

// ================================================
// INICIALIZAÇÃO
// ================================================

function initPlansModal() {
    console.log('🔄 Inicializando modal de planos V4.0...');

    // Event listeners para toggle
    const billingButtons = document.querySelectorAll('.billing-label');
    billingButtons.forEach((button) => {
        const period = button.getAttribute('data-period');

        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const clickedPeriod = this.getAttribute('data-period');
            toggleBillingPeriod(clickedPeriod);
        }, true);

        button.addEventListener('touchstart', function(e) {
            e.preventDefault();
            const clickedPeriod = this.getAttribute('data-period');
            toggleBillingPeriod(clickedPeriod);
        }, { passive: false });

        button.style.pointerEvents = 'auto';
        button.style.cursor = 'pointer';
    });

    // Fechar ao clicar fora
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('plans-modal');
        if (e.target === modal) {
            closePlansModal();
        }
    });

    // Fechar com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('plans-modal');
            if (modal && modal.classList.contains('show')) {
                closePlansModal();
            }
        }
    });

    // Inicializar preços
    setTimeout(() => {
        updatePlanPricing('estudante');
        updatePlanPricing('profissional');
    }, 100);

    console.log('✅ Modal de planos V4.0 inicializado');
}

// Aguardar DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlansModal);
} else {
    initPlansModal();
}

// ================================================
// EXPORTAR FUNÇÕES GLOBALMENTE
// ================================================

window.openPlansModal = openPlansModal;
window.closePlansModal = closePlansModal;
window.toggleBillingPeriod = toggleBillingPeriod;
window.selectPlan = selectPlan;
window.showUpgradeModal = showUpgradeModal; // ⭐ NOVA FUNÇÃO V4.0
window.initMercadoPagoCheckout = initMercadoPagoCheckout;

console.log('💰 SIAV Plans Modal V4.0 - Meta: R$ 2.000.000');
