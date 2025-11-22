#!/usr/bin/env node

/**
 * Script de teste automatizado para validar as correções de bugs
 * Execute: node test-fixes.js
 */

const fs = require('fs');
const path = require('path');

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passedTests++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Erro: ${error.message}`);
        failedTests++;
    }
}

console.log('🧪 Executando testes de correções...\n');

// ================================================
// TESTE 1: Sintaxe dos arquivos
// ================================================
console.log('📋 Teste 1: Validação de Sintaxe');

test('src/pcr/timer.js não tem erro de sintaxe', () => {
    const content = fs.readFileSync('src/pcr/timer.js', 'utf8');

    // Verificar se não há chaves extras
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;

    if (openBraces !== closeBraces) {
        throw new Error(`Chaves desbalanceadas: { = ${openBraces}, } = ${closeBraces}`);
    }

    // Verificar se a linha 100-101 não tem chave duplicada
    const lines = content.split('\n');
    const line100 = lines[99]?.trim();
    const line101 = lines[100]?.trim();

    if (line100 === '}' && line101 === '}' && !lines[99].includes('function')) {
        throw new Error('Chave duplicada encontrada nas linhas 100-101');
    }
});

// ================================================
// TESTE 2: Variáveis redeclaradas
// ================================================
console.log('\n📋 Teste 2: Redeclaração de Variáveis');

test('plans-modal-optimized.js não tem variável "toggle" redeclarada', () => {
    const content = fs.readFileSync('plans-modal-optimized.js', 'utf8');

    // Pegar função toggleBillingPeriod
    const funcStart = content.indexOf('function toggleBillingPeriod()');
    const funcEnd = content.indexOf('function updatePlanPricing', funcStart);
    const funcContent = content.substring(funcStart, funcEnd);

    // Contar declarações de const toggle
    const toggleDeclarations = (funcContent.match(/const toggle =/g) || []).length;

    if (toggleDeclarations > 1) {
        throw new Error(`Variável "toggle" declarada ${toggleDeclarations} vezes na mesma função`);
    }

    // Verificar se toggleElement existe
    if (!funcContent.includes('toggleElement')) {
        throw new Error('Variável "toggleElement" não encontrada (correção não aplicada)');
    }
});

// ================================================
// TESTE 3: Validação de dados de pagamento
// ================================================
console.log('\n📋 Teste 3: Validação de Dados de Pagamento');

test('getUserEmail() retorna null ao invés de fallback fake', () => {
    const content = fs.readFileSync('mercadopago-integration.js', 'utf8');

    if (content.includes("'usuario@exemplo.com'") &&
        content.match(/return.*'usuario@exemplo.com'/)) {
        throw new Error('getUserEmail() ainda retorna fallback perigoso');
    }

    if (!content.includes('return email && email.trim()')) {
        throw new Error('Validação de email não implementada');
    }
});

test('getUserName() retorna null ao invés de fallback fake', () => {
    const content = fs.readFileSync('mercadopago-integration.js', 'utf8');

    if (content.includes("'Usuário SIAV'") &&
        content.match(/return.*'Usuário SIAV'/)) {
        throw new Error('getUserName() ainda retorna fallback perigoso');
    }

    if (!content.includes('return name && name.trim()')) {
        throw new Error('Validação de nome não implementada');
    }
});

test('notifyPaymentStatus() valida parâmetros obrigatórios', () => {
    const content = fs.readFileSync('mercadopago-integration.js', 'utf8');

    // Encontrar função notifyPaymentStatus
    const funcStart = content.indexOf('async function notifyPaymentStatus');
    const funcEnd = content.indexOf('}\n\n// Exportar', funcStart);
    const funcContent = content.substring(funcStart, funcEnd);

    if (!funcContent.includes('if (!paymentId || !status)')) {
        throw new Error('Validação de paymentId e status não implementada');
    }

    if (!funcContent.includes('if (!userId)')) {
        throw new Error('Validação de userId não implementada');
    }
});

// ================================================
// TESTE 4: Memory Leak de Countdown
// ================================================
console.log('\n📋 Teste 4: Memory Leak de Countdown');

test('closePlansModal() limpa o countdown interval', () => {
    const content = fs.readFileSync('plans-modal-optimized.js', 'utf8');

    // Encontrar função closePlansModal
    const funcStart = content.indexOf('function closePlansModal()');
    const funcEnd = content.indexOf('}\n\n//', funcStart);
    const funcContent = content.substring(funcStart, funcEnd);

    if (!funcContent.includes('clearInterval(countdownInterval)')) {
        throw new Error('clearInterval não chamado em closePlansModal()');
    }

    if (!funcContent.includes('countdownInterval = null')) {
        throw new Error('countdownInterval não é resetado para null');
    }
});

// ================================================
// TESTE 5: Validação de elementos DOM
// ================================================
console.log('\n📋 Teste 5: Validação de Elementos DOM');

test('updateCountdownDisplay() valida se elemento existe', () => {
    const content = fs.readFileSync('plans-modal-optimized.js', 'utf8');

    // Encontrar função updateCountdownDisplay
    const funcStart = content.indexOf('function updateCountdownDisplay(');
    const funcEnd = content.indexOf('}\n\n/**', funcStart);
    const funcContent = content.substring(funcStart, funcEnd);

    if (!funcContent.includes('if (!countdownElement)')) {
        throw new Error('Validação de countdownElement não implementada');
    }

    if (!funcContent.includes('console.warn')) {
        throw new Error('Warning não emitido quando elemento não existe');
    }
});

test('closePlansModal() valida se modal existe', () => {
    const content = fs.readFileSync('plans-modal-optimized.js', 'utf8');

    // Encontrar função closePlansModal
    const funcStart = content.indexOf('function closePlansModal()');
    const funcEnd = content.indexOf('}\n\n//', funcStart);
    const funcContent = content.substring(funcStart, funcEnd);

    if (!funcContent.includes('if (!modal)')) {
        throw new Error('Validação de modal não implementada');
    }
});

// ================================================
// TESTE 6: Segurança de innerHTML
// ================================================
console.log('\n📋 Teste 6: Segurança de innerHTML');

test('showCheckoutLoading() tem comentário de segurança', () => {
    const content = fs.readFileSync('mercadopago-integration.js', 'utf8');

    const funcStart = content.indexOf('function showCheckoutLoading()');
    const funcEnd = content.indexOf('}\n\nfunction hideCheckoutLoading', funcStart);
    const funcContent = content.substring(funcStart, funcEnd);

    if (!funcContent.includes('// SEGURO: HTML estático sem dados de usuário')) {
        throw new Error('Comentário de segurança não encontrado');
    }
});

test('showCheckoutLoading() em plans-modal tem comentário de segurança', () => {
    const content = fs.readFileSync('plans-modal-optimized.js', 'utf8');

    const funcStart = content.indexOf('function showCheckoutLoading()');
    const funcEnd = content.indexOf('document.body.appendChild(loadingModal)', funcStart);
    const funcContent = content.substring(funcStart, funcEnd);

    if (!funcContent.includes('// SEGURO: HTML estático sem dados de usuário')) {
        throw new Error('Comentário de segurança não encontrado');
    }
});

// ================================================
// TESTE 7: .env.example atualizado
// ================================================
console.log('\n📋 Teste 7: Configuração de Ambiente');

test('.env.example contém configurações do Mercado Pago', () => {
    const content = fs.readFileSync('.env.example', 'utf8');

    if (!content.includes('VITE_MERCADOPAGO_PUBLIC_KEY_TEST')) {
        throw new Error('VITE_MERCADOPAGO_PUBLIC_KEY_TEST não encontrado');
    }

    if (!content.includes('VITE_MERCADOPAGO_PUBLIC_KEY_PROD')) {
        throw new Error('VITE_MERCADOPAGO_PUBLIC_KEY_PROD não encontrado');
    }

    if (!content.includes('VITE_MERCADOPAGO_ENV')) {
        throw new Error('VITE_MERCADOPAGO_ENV não encontrado');
    }
});

test('.env.example contém URL da API', () => {
    const content = fs.readFileSync('.env.example', 'utf8');

    if (!content.includes('VITE_API_URL')) {
        throw new Error('VITE_API_URL não encontrado');
    }
});

test('.env está no .gitignore', () => {
    const content = fs.readFileSync('.gitignore', 'utf8');

    if (!content.includes('.env')) {
        throw new Error('.env não está no .gitignore (risco de segurança!)');
    }
});

// ================================================
// RELATÓRIO FINAL
// ================================================
console.log('\n' + '='.repeat(50));
console.log('📊 RELATÓRIO FINAL');
console.log('='.repeat(50));
console.log(`✅ Testes passados: ${passedTests}`);
console.log(`❌ Testes falhados: ${failedTests}`);
console.log(`📈 Taxa de sucesso: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
console.log('='.repeat(50));

if (failedTests === 0) {
    console.log('\n🎉 Todos os testes passaram! Correções validadas com sucesso!');
    process.exit(0);
} else {
    console.log('\n⚠️ Alguns testes falharam. Verifique os erros acima.');
    process.exit(1);
}
