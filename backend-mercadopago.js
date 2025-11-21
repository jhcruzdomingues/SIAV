// ================================================
// BACKEND PARA WEBHOOKS DO MERCADO PAGO - SIAV
// Exemplo usando Node.js + Express
// ================================================

const express = require('express');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());

// ===== CONFIGURAÇÃO CORS SEGURA =====
const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://192.168.1.9:5500',
    'https://seu-dominio.com' // Adicione seu domínio de produção aqui
];

app.use(cors({
    origin: function(origin, callback) {
        // Permitir requests sem origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'A política de CORS não permite acesso de ' + origin;
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));

// ===== CONFIGURAÇÃO MERCADO PAGO =====
if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    console.error('❌ ERRO: MERCADOPAGO_ACCESS_TOKEN não configurado no arquivo .env');
    process.exit(1);
}

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
});

// ===== CRIAR PREFERÊNCIA DE PAGAMENTO =====
app.post('/api/mercadopago/create-preference', async (req, res) => {
    try {
        const { plan, period, user } = req.body;

        console.log('📥 Recebido:', { plan, period, user });

        // Configuração dos planos (deve ser igual ao frontend)
        const plans = {
            student: {
                monthly: { title: 'SIAV - Plano Estudante Mensal', price: 9.90 },
                yearly: { title: 'SIAV - Plano Estudante Anual', price: 99.00 }
            },
            professional: {
                monthly: { title: 'SIAV - Plano Profissional Mensal', price: 19.90 },
                yearly: { title: 'SIAV - Plano Profissional Anual', price: 178.80 }
            }
        };

        const planConfig = plans[plan][period];

        const frontendUrl = 'http://192.168.1.9:5500';

        // Criar preferência de pagamento usando SDK v2
        const preference = new Preference(client);
        
        const preferenceData = {
            items: [
                {
                    title: planConfig.title,
                    unit_price: Number(planConfig.price),
                    quantity: 1,
                }
            ],
            back_urls: {
                success: `${frontendUrl}/index.html`,
                failure: `${frontendUrl}/index.html`,
                pending: `${frontendUrl}/index.html`
            },
            external_reference: `${plan}_${period}_${Date.now()}`,
        };

        console.log('📤 Enviando para Mercado Pago:', JSON.stringify(preferenceData, null, 2));

        const response = await preference.create({ body: preferenceData });
        
        console.log('✅ Preferência criada:', response.id);
        
        res.json({
            id: response.id,
            init_point: response.init_point,
            sandbox_init_point: response.sandbox_init_point
        });

    } catch (error) {
        console.error('❌ Erro ao criar preferência:', error);
        res.status(500).json({ error: 'Erro ao criar preferência de pagamento', details: error.message });
    }
});

// ===== CRIAR ASSINATURA RECORRENTE =====
app.post('/api/mercadopago/create-subscription', async (req, res) => {
    try {
        const { plan, period, planConfig, user } = req.body;

        // Criar plano de assinatura
        const subscriptionPlan = {
            reason: planConfig.title,
            auto_recurring: {
                frequency: planConfig.frequency,
                frequency_type: planConfig.frequency_type,
                transaction_amount: planConfig.price,
                currency_id: 'BRL'
            },
            back_url: `${process.env.FRONTEND_URL || 'http://localhost:8000'}/pagamento-sucesso.html`,
            payer_email: user.email
        };

        const response = await mercadopago.preapproval.create(subscriptionPlan);
        
        console.log('✅ Assinatura criada:', response.body.id);
        
        res.json({
            id: response.body.id,
            init_point: response.body.init_point,
            sandbox_init_point: response.body.sandbox_init_point
        });

    } catch (error) {
        console.error('❌ Erro ao criar assinatura:', error);
        res.status(500).json({ error: 'Erro ao criar assinatura' });
    }
});

// ===== WEBHOOK (NOTIFICAÇÕES DE PAGAMENTO) =====
app.post('/api/mercadopago/webhook', async (req, res) => {
    try {
        console.log('📩 Webhook recebido:', req.body);

        const { type, data } = req.body;

        // Responder imediatamente
        res.status(200).send('OK');

        // Processar notificação
        if (type === 'payment') {
            const paymentId = data.id;
            
            // Buscar informações do pagamento
            const payment = await mercadopago.payment.get(paymentId);
            
            console.log('💳 Pagamento:', payment.body);

            const status = payment.body.status;
            const externalReference = payment.body.external_reference;
            const payerEmail = payment.body.payer.email;

            // Processar baseado no status
            if (status === 'approved') {
                console.log('✅ Pagamento aprovado!');
                
                // Ativar plano do usuário no seu banco de dados
                await activateUserPlan(payerEmail, externalReference, paymentId);
                
                // Enviar email de confirmação
                await sendConfirmationEmail(payerEmail, externalReference);
            } 
            else if (status === 'rejected') {
                console.log('❌ Pagamento rejeitado');
                // Notificar usuário
            }
            else if (status === 'pending') {
                console.log('⏳ Pagamento pendente');
                // Aguardar confirmação
            }
        }

    } catch (error) {
        console.error('❌ Erro no webhook:', error);
    }
});

// ===== VERIFICAR STATUS DE PAGAMENTO =====
app.post('/api/mercadopago/payment-status', async (req, res) => {
    try {
        const { paymentId, userId } = req.body;

        const payment = await mercadopago.payment.get(paymentId);
        
        res.json({
            status: payment.body.status,
            statusDetail: payment.body.status_detail,
            approved: payment.body.status === 'approved'
        });

    } catch (error) {
        console.error('❌ Erro ao verificar status:', error);
        res.status(500).json({ error: 'Erro ao verificar status do pagamento' });
    }
});

// ===== FUNÇÕES AUXILIARES =====

/**
 * Ativa o plano do usuário no banco de dados
 */
async function activateUserPlan(email, externalReference, paymentId) {
    try {
        // Exemplo: atualizar no Supabase
        // const { data, error } = await supabase
        //     .from('users')
        //     .update({ 
        //         plan: 'professional', 
        //         plan_active: true,
        //         payment_id: paymentId,
        //         activated_at: new Date()
        //     })
        //     .eq('email', email);

        console.log('✅ Plano ativado para:', email);
        
        // Salvar no localStorage via API
        // Ou enviar push notification
        
    } catch (error) {
        console.error('❌ Erro ao ativar plano:', error);
    }
}

/**
 * Envia email de confirmação
 */
async function sendConfirmationEmail(email, reference) {
    try {
        // Exemplo usando SendGrid, Nodemailer, etc.
        console.log('📧 Enviando email para:', email);
        
        // await sendEmail({
        //     to: email,
        //     subject: 'Bem-vindo ao SIAV Premium!',
        //     template: 'subscription-activated',
        //     data: { reference }
        // });

    } catch (error) {
        console.error('❌ Erro ao enviar email:', error);
    }
}

// ===== CANCELAR ASSINATURA =====
app.post('/api/mercadopago/cancel-subscription', async (req, res) => {
    try {
        const { subscriptionId } = req.body;

        await mercadopago.preapproval.update({
            id: subscriptionId,
            status: 'cancelled'
        });

        console.log('✅ Assinatura cancelada:', subscriptionId);
        
        res.json({ success: true });

    } catch (error) {
        console.error('❌ Erro ao cancelar assinatura:', error);
        res.status(500).json({ error: 'Erro ao cancelar assinatura' });
    }
});

// ===== INICIAR SERVIDOR =====
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📡 Webhook URL: http://localhost:${PORT}/api/mercadopago/webhook`);
});

// Manter servidor ativo
server.on('error', (error) => {
    console.error('❌ Erro no servidor:', error);
});

process.on('SIGINT', () => {
    console.log('\n👋 Encerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor encerrado');
        process.exit(0);
    });
});

module.exports = app;
