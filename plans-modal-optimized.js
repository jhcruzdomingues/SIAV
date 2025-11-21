// Modal de planos otimizado - SIAV

function toggleBillingPeriod() {
    const proPrice = document.getElementById('pro-price');
    const proOldPrice = document.getElementById('pro-old-price');
    const proCard = document.getElementById('pro-plan-card');
    const isYearly = document.getElementById('billing-period')?.checked || false;
    if (isYearly) {
        proPrice.textContent = '14,90';
        proCard.querySelector('.period').textContent = '/mês (anual)';
        if (proOldPrice) proOldPrice.textContent = 'R$ 49,90';
    } else {
        proPrice.textContent = '19,90';
        proCard.querySelector('.period').textContent = '/mês';
        if (proOldPrice) proOldPrice.textContent = 'R$ 49,90';
    }
    // Analytics tracking
    if (typeof gtag !== 'undefined') {
        gtag('event', 'toggle_billing', {
            'billing_type': isYearly ? 'yearly' : 'monthly'
        });
    }
}

function selectPlan(planLevel, period = 'monthly') {
    if (planLevel === 'free') {
        alert('Você já está no plano gratuito!');
        return;
    }
    const isYearly = document.getElementById('billing-period')?.checked || false;
    const actualPeriod = isYearly ? 'yearly' : 'monthly';
    const prices = {
        student: {
            monthly: 9.90,
            yearly: 99.00
        },
        professional: {
            monthly: 19.90,
            yearly: 178.80
        }
    };
    const planNames = {
        free: 'Plano Gratuito',
        student: 'Plano Estudante',
        professional: 'Plano Profissional'
    };
    const benefits = {
        free: ['Acesso básico'],
        student: ['Simulados ilimitados', 'Certificado digital'],
        professional: ['Histórico online', 'Dashboard avançado', 'Exportação PDF']
    };
    const price = prices[planLevel][actualPeriod];
    const savings = actualPeriod === 'yearly' ? `R$ ${(prices[planLevel].monthly * 12 - price).toFixed(2)}` : null;
    const priceDisplay = actualPeriod === 'yearly'
        ? `12x de R$ ${(price/12).toFixed(2)} (Total: R$ ${price.toFixed(2)})`
        : `R$ ${price.toFixed(2)}/mês`;
    let confirmMsg = `${planNames[planLevel]}\n\n`;
    confirmMsg += `💰 Investimento: ${priceDisplay}\n`;
    if (savings) {
        confirmMsg += `🎁 VOCÊ ECONOMIZA: ${savings}\n`;
    }
    confirmMsg += `\nBenefícios:\n- ${benefits[planLevel].join('\n- ')}`;
    if (confirm(confirmMsg)) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'select_plan', {
                'plan': planLevel,
                'period': actualPeriod
            });
        }
        alert('Checkout simulado. Integração de pagamento removida.');
    }
}

function openPlansModal() {
    const modal = document.getElementById('plans-modal');
    if (modal) modal.classList.add('show');
}

function closePlansModal() {
    const modal = document.getElementById('plans-modal');
    if (modal) modal.classList.remove('show');
}

// Event listeners para o modal
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlansModal);
} else {
    initPlansModal();
}

function initPlansModal() {
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('plans-modal');
        if (e.target === modal) {
            closePlansModal();
        }
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('plans-modal');
            if (modal && modal.classList.contains('show')) {
                closePlansModal();
            }
        }
    });
}


window.openPlansModal = openPlansModal;
window.closePlansModal = closePlansModal;
window.toggleBillingPeriod = toggleBillingPeriod;
window.selectPlan = selectPlan;

/**
 * Processa o checkout do plano selecionado
 */
function processCheckout(plan, period, price, coupon = null) {
    // Obter informações do usuário (simulado)
    const userEmail = localStorage.getItem('userEmail') || 'usuario@exemplo.com';
    const userName = localStorage.getItem('userName') || 'Usuário';

    // Mostrar loading
    closePlansModal();
    
    // Criar modal de loading
    const loadingModal = document.createElement('div');
    loadingModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
    `;
    loadingModal.innerHTML = `
        <div style="text-align: center; color: white;">
            <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
            <h2 style="margin-bottom: 10px;">Preparando seu checkout...</h2>
            <p>Redirecionando para pagamento seguro</p>
        </div>
    `;
    document.body.appendChild(loadingModal);

    // Integrar com Mercado Pago
    setTimeout(() => {
        document.body.removeChild(loadingModal);
        
        // Chamar função de criação de checkout do Mercado Pago
        if (typeof createMercadoPagoCheckout === 'function') {
            createMercadoPagoCheckout(plan, period, { 
                email: userEmail, 
                name: userName 
            }, coupon);
        } else {
            alert('❌ Erro ao carregar sistema de pagamento.\n\nPor favor, recarregue a página e tente novamente.\n\nSe o problema persistir, entre em contato com suporte@siav.com.br');
        }
    }, 2000);
}

/**
 * Função para ser chamada quando o botão "Fazer Upgrade" for clicado
 */
function upgradePlan(targetPlan) {
    openPlansModal();
    
    // Opcional: Pré-selecionar o plano específico
    if (targetPlan === 'student' || targetPlan === 'professional') {
        // Destacar o card do plano
        setTimeout(() => {
            const card = document.querySelector(`.plan-card[data-plan="${targetPlan}"]`);
            if (card) {
                card.style.animation = 'pulse 1s ease-in-out 3';
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 300);
    }
}

/**
 * Função para iniciar o fluxo de assinatura
 */
function startSubscriptionFlow() {
    openPlansModal();
}

// ================================================
// EVENT LISTENERS
// ================================================

// Aguarda DOM estar pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlansModal);
} else {
    initPlansModal();
}

function initPlansModal() {
    // Fechar modal ao clicar fora
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('plans-modal');
        if (e.target === modal) {
            closePlansModal();
        }
    });

    // Fechar modal com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('plans-modal');
            if (modal && modal.classList.contains('show')) {
                closePlansModal();
            }
        }
    });
}

// Exportar funções globalmente
window.openPlansModal = openPlansModal;
window.closePlansModal = closePlansModal;
window.toggleBillingPeriod = toggleBillingPeriod;
window.selectPlan = selectPlan;
window.upgradePlan = upgradePlan;
window.startSubscriptionFlow = startSubscriptionFlow;
window.processCheckout = processCheckout;
