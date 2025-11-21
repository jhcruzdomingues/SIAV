// ================================================
// INTEGRAÇÃO DO MERCADO PAGO - SIAV
// ================================================

/**
 * Inicializa o SDK do Mercado Pago
 */
let mercadopago = null;

function initMercadoPago() {
    if (typeof MercadoPago === 'undefined') {
        console.error('SDK do Mercado Pago não carregado!');
        return false;
    }

    const publicKey = getMercadoPagoPublicKey();
    mercadopago = new MercadoPago(publicKey, {
        locale: 'pt-BR'
    });

    console.log('✅ Mercado Pago SDK inicializado');
    return true;
}

/**
 * Cria uma preferência de pagamento e redireciona para checkout
 * @param {string} planLevel - 'student' ou 'professional'
 * @param {string} period - 'monthly' ou 'yearly'
 */
async function createMercadoPagoCheckout(planLevel, period) {
    try {
        // Validacao de entrada
        if (!planLevel || !period) {
            alert('Erro: Plano e periodo sao obrigatorios.');
            return;
        }

        const validPlans = ['student', 'professional'];
        const validPeriods = ['monthly', 'yearly'];

        if (!validPlans.includes(planLevel)) {
            alert('Erro: Plano invalido. Escolha "student" ou "professional".');
            return;
        }

        if (!validPeriods.includes(period)) {
            alert('Erro: Periodo invalido. Escolha "monthly" ou "yearly".');
            return;
        }

        const planConfig = getPlanConfig(planLevel, period);

        if (!planConfig) {
            console.error('Configuracao do plano nao encontrada');
            alert('Erro: Plano nao configurado. Entre em contato com o suporte.');
            return;
        }

        // Validar dados do usuario
        const userEmail = getUserEmail();
        const userName = getUserName();

        if (!userEmail || !userName) {
            alert('Erro: Dados do usuario nao encontrados. Por favor, faca login novamente.');
            return;
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userEmail)) {
            alert('Erro: Email do usuario invalido. Por favor, atualize seu perfil.');
            return;
        }

        // Mostrar loading
        showCheckoutLoading();

        // Chamar backend para criar preferencia
        const response = await fetch('http://localhost:3000/api/mercadopago/create-preference', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                plan: planLevel,
                period: period,
                user: {
                    email: userEmail,
                    name: userName
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Erro ao criar preferencia de pagamento');
        }

        const data = await response.json();

        if (!data) {
            throw new Error('Resposta invalida do servidor');
        }

        console.log('Preferencia criada:', data);

        // Redirecionar para o checkout do Mercado Pago
        // Usar sandbox_init_point para testes, init_point para producao
        const checkoutUrl = data.sandbox_init_point || data.init_point;

        if (!checkoutUrl) {
            throw new Error('URL de checkout nao encontrada na resposta do servidor');
        }

        window.location.href = checkoutUrl;

    } catch (error) {
        console.error('Erro ao criar checkout:', error);
        hideCheckoutLoading();

        const errorMessage = error.message || 'Erro desconhecido';
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
            alert('Erro de conexao. Certifique-se de que o servidor backend esta rodando e acessivel.');
        } else {
            alert(`Erro ao processar pagamento: ${errorMessage}`);
        }
    }
}

/**
 * Cria preferência de pagamento no backend
 */
async function createPaymentPreference(planConfig, planLevel, period) {
    // IMPORTANTE: Esta chamada deve ir para seu BACKEND
    // O backend deve criar a preferência usando o Access Token (nunca exponha no frontend!)
    
    const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            plan: planLevel,
            period: period,
            user: {
                email: getUserEmail(), // Pegar email do usuário logado
                name: getUserName(),
            }
        })
    });

    if (!response.ok) {
        throw new Error('Falha na criação da preferência');
    }

    return await response.json();
}

/**
 * Redireciona para o checkout do Mercado Pago
 */
function redirectToCheckout(preferenceId) {
    // Opção 1: Redirecionar para página do Mercado Pago
    const checkoutUrl = isTestMode()
        ? `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${preferenceId}`
        : `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${preferenceId}`;
    
    window.location.href = checkoutUrl;

    // Opção 2: Abrir modal do Mercado Pago (requer SDK)
    // if (mercadopago) {
    //     mercadopago.checkout({
    //         preference: {
    //             id: preferenceId
    //         },
    //         autoOpen: true
    //     });
    // }
}

/**
 * Processa assinatura recorrente
 */
async function createRecurringSubscription(planLevel, period) {
    try {
        // Validacao de entrada
        if (!planLevel || !period) {
            alert('Erro: Plano e periodo sao obrigatorios.');
            return;
        }

        const validPlans = ['student', 'professional'];
        const validPeriods = ['monthly', 'yearly'];

        if (!validPlans.includes(planLevel)) {
            alert('Erro: Plano invalido.');
            return;
        }

        if (!validPeriods.includes(period)) {
            alert('Erro: Periodo invalido.');
            return;
        }

        const planConfig = getPlanConfig(planLevel, period);

        if (!planConfig) {
            alert('Erro: Configuracao do plano nao encontrada.');
            return;
        }

        // Validar dados do usuario
        const userEmail = getUserEmail();
        const userName = getUserName();

        if (!userEmail || !userName) {
            alert('Erro: Dados do usuario nao encontrados. Faca login novamente.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userEmail)) {
            alert('Erro: Email invalido. Atualize seu perfil.');
            return;
        }

        showCheckoutLoading();

        const response = await fetch('/api/mercadopago/create-subscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                plan: planLevel,
                period: period,
                planConfig: planConfig,
                user: {
                    email: userEmail,
                    name: userName,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Falha ao criar assinatura');
        }

        const subscription = await response.json();

        if (!subscription) {
            throw new Error('Resposta invalida do servidor');
        }

        // Redirecionar para link de pagamento
        if (subscription.init_point) {
            window.location.href = subscription.init_point;
        } else {
            throw new Error('Link de pagamento nao encontrado');
        }

    } catch (error) {
        console.error('Erro ao criar assinatura:', error);
        hideCheckoutLoading();

        const errorMessage = error.message || 'Erro desconhecido';
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
            alert('Erro de conexao. Verifique se o servidor esta rodando.');
        } else {
            alert(`Erro ao processar assinatura: ${errorMessage}`);
        }
    }
}

/**
 * Funções auxiliares
 */
function showCheckoutLoading() {
    const modal = document.getElementById('plans-modal');
    if (modal) {
        const loading = document.createElement('div');
        loading.id = 'checkout-loading';
        loading.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.8); z-index: 99999; 
                        display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 40px; border-radius: 15px; text-align: center;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #009EE3; margin-bottom: 20px;"></i>
                    <h3>Processando pagamento...</h3>
                    <p>Aguarde, você será redirecionado para o checkout seguro do Mercado Pago</p>
                </div>
            </div>
        `;
        document.body.appendChild(loading);
    }
}

function hideCheckoutLoading() {
    const loading = document.getElementById('checkout-loading');
    if (loading) {
        loading.remove();
    }
}

function getUserEmail() {
    // Implementar: pegar email do usuário logado
    // Pode vir do localStorage, Supabase, etc.
    return localStorage.getItem('userEmail') || 'usuario@exemplo.com';
}

function getUserName() {
    // Implementar: pegar nome do usuário logado
    return localStorage.getItem('userName') || 'Usuário SIAV';
}

/**
 * Verifica status de pagamento via query params
 * Usar nas páginas de retorno
 */
function checkPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const paymentId = urlParams.get('payment_id');
    const preferenceId = urlParams.get('preference_id');

    if (status) {
        console.log('Status do pagamento:', status);
        console.log('Payment ID:', paymentId);
        console.log('Preference ID:', preferenceId);

        // Notificar backend para validar pagamento
        notifyPaymentStatus(paymentId, status);

        return {
            status,
            paymentId,
            preferenceId
        };
    }

    return null;
}

/**
 * Notifica backend sobre status do pagamento
 */
async function notifyPaymentStatus(paymentId, status) {
    try {
        await fetch('/api/mercadopago/payment-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                paymentId,
                status,
                userId: localStorage.getItem('userId')
            })
        });
    } catch (error) {
        console.error('Erro ao notificar status:', error);
    }
}

// Exportar funções globalmente
window.initMercadoPago = initMercadoPago;
window.createMercadoPagoCheckout = createMercadoPagoCheckout;
window.createRecurringSubscription = createRecurringSubscription;
window.checkPaymentStatus = checkPaymentStatus;

// Auto-inicializar quando SDK estiver disponível
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initMercadoPago, 1000);
    });
} else {
    setTimeout(initMercadoPago, 1000);
}
