// ================================================
// CONFIGURAÇÃO DO MERCADO PAGO - SIAV
// VERSÃO 4.0 - ESTRATÉGIA DE CONVERSÃO OTIMIZADA
// Meta: R$ 2.000.000
// ================================================

/**
 * IMPORTANTE:
 * 1. Obtenha suas credenciais em: https://www.mercadopago.com.br/developers/panel
 * 2. Use credenciais de TESTE primeiro para validar
 * 3. Depois troque para PRODUÇÃO
 * 4. ⚠️ NOVOS PREÇOS: Você precisa criar NOVOS planos de assinatura no Mercado Pago
 */

const MERCADOPAGO_CONFIG = {
    // ===== CREDENCIAIS =====
    publicKey: {
        test: 'APP_USR-e02aeb49-9e62-43f6-91d7-3e5a7c2dce55', // Sua Public Key de TESTE
        production: 'APP_USR-5dac771c-e261-4d24-8bfa-bcad41677ee4' // Sua Public Key de PRODUÇÃO ✅
    },

    // ⚠️ IMPORTANTE: Access Token NUNCA deve estar no frontend!
    // Use apenas no backend (backend-mercadopago.js)

    // ===== AMBIENTE =====
    environment: 'production', // 'test' ou 'production' - ⚠️ MODO PRODUÇÃO ATIVO!

    // ===== NOVOS PREÇOS - ESTRATÉGIA DE CONVERSÃO 4.0 =====
    plans: {
        estudante: {
            monthly: {
                id: 'STUDENT_MONTHLY_V4', // ⚠️ CRIAR NOVO PLANO NO MERCADO PAGO
                title: 'SIAV - Plano Estudante Mensal',
                price: 24.90,
                priceInCents: 2490,
                frequency: 1,
                frequency_type: 'months',
                repetitions: null,
                description: 'Acesso ao SIAV com 5 casos/dia - Cobrança Mensal',
                features: {
                    dailyLimit: 5,
                    maxSavedPatients: 1,
                    certificateEnabled: true,
                    quizEnabled: true,
                    fullSimulator: false
                }
            },
            annual: {
                id: 'STUDENT_YEARLY_V4', // ⚠️ CRIAR NOVO PLANO NO MERCADO PAGO
                title: 'SIAV - Plano Estudante Anual',
                price: 239.04,
                priceInCents: 23904,
                monthlyEquivalent: 19.92, // R$ 239.04 / 12 = R$ 19.92/mês
                frequency: 12,
                frequency_type: 'months',
                repetitions: null,
                description: 'Acesso ao SIAV com 5 casos/dia - Cobrança Anual (Economize 20%)',
                savings: 59.76, // (24.90 * 12) - 239.04 = R$ 59.76
                savingsPercent: 20,
                features: {
                    dailyLimit: 5,
                    maxSavedPatients: 1,
                    certificateEnabled: true,
                    quizEnabled: true,
                    fullSimulator: false
                }
            }
        },
        profissional: {
            monthly: {
                id: 'PROFESSIONAL_MONTHLY_V4', // ⚠️ CRIAR NOVO PLANO NO MERCADO PAGO
                title: 'SIAV - Plano Profissional Mensal',
                price: 49.90,
                priceInCents: 4990,
                frequency: 1,
                frequency_type: 'months',
                repetitions: null,
                description: 'Acesso PRO ilimitado ao SIAV - Cobrança Mensal',
                features: {
                    dailyLimit: null, // ILIMITADO
                    maxSavedPatients: null, // ILIMITADO
                    certificateEnabled: true,
                    quizEnabled: true,
                    fullSimulator: true,
                    advancedDashboard: true,
                    pdfExport: true,
                    prioritySupport: true
                }
            },
            annual: {
                id: 'PROFESSIONAL_YEARLY_V4', // ⚠️ CRIAR NOVO PLANO NO MERCADO PAGO
                title: 'SIAV - Plano Profissional Anual',
                price: 479.04,
                priceInCents: 47904,
                monthlyEquivalent: 39.92, // R$ 479.04 / 12 = R$ 39.92/mês
                frequency: 12,
                frequency_type: 'months',
                repetitions: null,
                description: 'Acesso PRO ilimitado ao SIAV - Cobrança Anual (Economize 20%)',
                savings: 119.76, // (49.90 * 12) - 479.04 = R$ 119.76
                savingsPercent: 20,
                features: {
                    dailyLimit: null, // ILIMITADO
                    maxSavedPatients: null, // ILIMITADO
                    certificateEnabled: true,
                    quizEnabled: true,
                    fullSimulator: true,
                    advancedDashboard: true,
                    pdfExport: true,
                    prioritySupport: true
                }
            }
        },
        vitalicio: {
            lifetime: {
                id: 'LIFETIME_V4', // ⚠️ CRIAR NOVO PRODUTO NO MERCADO PAGO
                title: 'SIAV - Plano Vitalício',
                price: 1199.90,
                priceInCents: 119990,
                oldPrice: 2499.90, // Preço âncora
                oldPriceInCents: 249990,
                discountPercent: 52, // ((2499.90 - 1199.90) / 2499.90) * 100 ≈ 52%
                description: 'Acesso vitalício completo ao SIAV - Pagamento único',
                roiMonths: 24, // Se paga em 2 anos do plano profissional
                features: {
                    dailyLimit: null, // ILIMITADO
                    maxSavedPatients: null, // ILIMITADO
                    certificateEnabled: true,
                    quizEnabled: true,
                    fullSimulator: true,
                    advancedDashboard: true,
                    pdfExport: true,
                    prioritySupport: true,
                    lifetimeAccess: true,
                    futureUpdates: true,
                    betaAccess: true, // ⭐ NOVO BENEFÍCIO
                    founderBadge: true
                }
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
    webhookUrl: 'https://seu-backend.com/api/mercadopago/webhook',

    // ===== GARANTIA =====
    guarantee: {
        days: 7,
        description: '7 Dias de Garantia Incondicional ou Seu Dinheiro de Volta'
    }
};

/**
 * Retorna a chave pública baseada no ambiente
 */
function getMercadoPagoPublicKey() {
    return MERCADOPAGO_CONFIG.publicKey[MERCADOPAGO_CONFIG.environment];
}

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

/**
 * Retorna os limites de uso de um plano
 */
function getPlanLimits(planLevel, period = 'monthly') {
    const planConfig = getPlanConfig(planLevel, period);
    return planConfig?.features || null;
}

// Exportar para uso global
window.MERCADOPAGO_CONFIG = MERCADOPAGO_CONFIG;
window.getMercadoPagoPublicKey = getMercadoPagoPublicKey;
window.getPlanConfig = getPlanConfig;
window.isTestMode = isTestMode;
window.getPlanLimits = getPlanLimits;

console.log('💰 MERCADO PAGO CONFIG V4.0 CARREGADO - Meta: R$ 2MM');
