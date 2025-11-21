// ================================================
// CONFIGURAÇÃO DO MERCADO PAGO - SIAV
// ================================================

/**
 * IMPORTANTE: 
 * 1. Obtenha suas credenciais em: https://www.mercadopago.com.br/developers/panel
 * 2. Use credenciais de TESTE primeiro para validar
 * 3. Depois troque para PRODUÇÃO
 */

const MERCADOPAGO_CONFIG = {
    // ===== CREDENCIAIS =====
    // Credenciais configuradas do Mercado Pago
    publicKey: {
        test: 'APP_USR-e02aeb49-9e62-43f6-91d7-3e5a7c2dce55', // Sua Public Key de TESTE
        production: 'APP_USR-5dac771c-e261-4d24-8bfa-bcad41677ee4' // Sua Public Key de PRODUÇÃO ✅
    },

    // ⚠️ IMPORTANTE: Access Token NUNCA deve estar no frontend!
    // Use apenas no backend (backend-mercadopago.js)
    // accessToken removido por segurança

    // ===== AMBIENTE =====
    // Troque para 'production' quando estiver pronto
    environment: 'production', // 'test' ou 'production' - ⚠️ MODO PRODUÇÃO ATIVO!

    // ===== IDS DOS PRODUTOS =====
    // Você vai criar estes planos no painel do Mercado Pago
    plans: {
        student: {
            monthly: {
                id: 'STUDENT_MONTHLY',
                title: 'SIAV - Plano Estudante Mensal',
                price: 9.90,
                frequency: 1,
                frequency_type: 'months',
                repetitions: null, // null = recorrente até cancelar
                description: 'Acesso completo ao SIAV para estudantes - Cobrança Mensal'
            },
            yearly: {
                id: 'STUDENT_YEARLY',
                title: 'SIAV - Plano Estudante Anual',
                price: 99.00,
                frequency: 12,
                frequency_type: 'months',
                repetitions: null,
                description: 'Acesso completo ao SIAV para estudantes - Cobrança Anual (Economize 17%)'
            }
        },
        professional: {
            monthly: {
                id: 'PROFESSIONAL_MONTHLY',
                title: 'SIAV - Plano Profissional Mensal',
                price: 19.90,
                frequency: 1,
                frequency_type: 'months',
                repetitions: null,
                description: 'Acesso PRO ilimitado ao SIAV - Cobrança Mensal'
            },
            yearly: {
                id: 'PROFESSIONAL_YEARLY',
                title: 'SIAV - Plano Profissional Anual',
                price: 178.80,
                frequency: 12,
                frequency_type: 'months',
                repetitions: null,
                description: 'Acesso PRO ilimitado ao SIAV - Cobrança Anual (Economize 25%)'
            }
        }
    },

    // ===== CONFIGURAÇÕES DE CHECKOUT =====
    checkout: {
        // URL de retorno após pagamento aprovado
        back_urls: {
            success: window.location.origin + '/pagamento-sucesso.html',
            failure: window.location.origin + '/pagamento-falha.html',
            pending: window.location.origin + '/pagamento-pendente.html'
        },
        
        // Redirecionar automaticamente
        auto_return: 'approved',
        
        // Métodos de pagamento permitidos
        payment_methods: {
            excluded_payment_types: [],
            installments: 12, // Permitir parcelamento até 12x
        },
        
        // Informações do vendedor
        statement_descriptor: 'SIAV', // Aparece na fatura do cartão
    },

    // ===== WEBHOOKS =====
    // URL que receberá notificações de pagamento
    // Você vai precisar de um servidor backend para isso
    webhookUrl: 'https://seu-backend.com/api/mercadopago/webhook',
};

/**
 * Retorna a chave pública baseada no ambiente
 */
function getMercadoPagoPublicKey() {
    return MERCADOPAGO_CONFIG.publicKey[MERCADOPAGO_CONFIG.environment];
}

/**
 * REMOVIDO: Access Token não deve estar no frontend!
 * Use apenas no backend via variáveis de ambiente
 */

/**
 * Retorna configuração de um plano específico
 */
function getPlanConfig(planLevel, period) {
    return MERCADOPAGO_CONFIG.plans[planLevel]?.[period] || null;
}

/**
 * Verifica se está em modo de teste
 */
function isTestMode() {
    return MERCADOPAGO_CONFIG.environment === 'test';
}

// Exportar para uso global
window.MERCADOPAGO_CONFIG = MERCADOPAGO_CONFIG;
window.getMercadoPagoPublicKey = getMercadoPagoPublicKey;
window.getPlanConfig = getPlanConfig;
window.isTestMode = isTestMode;
