// ================================================
// src/pcr/start.js - V4.0
// Controle de início de simulação com verificação de limites
// ================================================

import { state, resetPCRState } from '../config/state.js';
import { announce } from '../accessibility/index.js';
import { checkAndIncrementSimulationUse } from '../services/storage.js';
import { showToast } from '../ui/toast.js';

/**
 * Obtém o plano atual do usuário
 * @returns {string} - 'free', 'estudante', 'profissional', ou 'vitalicio'
 */
function getCurrentUserPlan() {
  // Verificar se há plano salvo no state
  if (state.userPlan) {
    return state.userPlan;
  }

  // Verificar localStorage como fallback
  try {
    const userProfile = JSON.parse(localStorage.getItem('siav_user_profile') || '{}');
    return userProfile.plan || 'free';
  } catch (err) {
    console.warn('Erro ao obter plano do usuário:', err);
    return 'free'; // Padrão: plano gratuito
  }
}

/**
 * Inicia uma simulação de PCR
 * @param {object} patientData - Dados do paciente (opcional)
 * @returns {boolean} - true se iniciou com sucesso, false caso contrário
 */
export function startPCR(patientData = null) {
  console.log('🚀 Tentando iniciar PCR...');

  // ================================================
  // VERIFICAÇÃO DE LIMITES DIÁRIOS - V4.0
  // ================================================

  // Obter plano atual do usuário
  const userPlan = getCurrentUserPlan();
  console.log('👤 Plano do usuário:', userPlan);

  // Verificar limites de uso
  const usageCheck = checkAndIncrementSimulationUse(userPlan);
  console.log('📊 Resultado da verificação:', usageCheck);

  // CASO 1: Bloqueio total - 5º uso atingido
  if (!usageCheck.allowed) {
    console.warn('🚫 BLOQUEIO ATIVADO - Limite diário atingido');

    // Anunciar para acessibilidade
    announce('Limite diário de simulações atingido. Faça upgrade para continuar treinando.');

    // Mostrar toast de bloqueio
    showToast(
      '🚫 Limite atingido! Faça upgrade para treinar sem limites.',
      { type: 'danger', timeout: 6000 }
    );

    // Abrir modal de upgrade com contexto de bloqueio
    setTimeout(() => {
      if (typeof window.showUpgradeModal === 'function') {
        window.showUpgradeModal({
          reason: 'daily_limit_reached',
          currentPlan: userPlan,
          message: usageCheck.message,
          upgradeRequired: true
        });
      } else {
        // Fallback: abrir modal normal de planos
        if (typeof window.openPlansModal === 'function') {
          window.openPlansModal();
        } else {
          console.error('❌ Função openPlansModal não encontrada!');
          alert(usageCheck.message + '\n\nFaça upgrade para continuar treinando sem limites!');
        }
      }
    }, 500);

    return false;
  }

  // CASO 2: Alerta de penúltimo uso (resta apenas 1 simulação)
  if (usageCheck.isWarning) {
    console.warn('⚠️ ALERTA - Penúltimo uso detectado');

    // Mostrar toast de aviso
    showToast(
      usageCheck.message,
      { type: 'warning', timeout: 8000 }
    );

    // Anunciar para acessibilidade
    announce(usageCheck.message);
  }

  // CASO 3: Uso normal
  if (usageCheck.remaining !== null && usageCheck.remaining > 1) {
    console.log(`✅ Uso permitido - Restam ${usageCheck.remaining} simulações hoje`);
  }

  // ================================================
  // INICIALIZAÇÃO DA PCR (LÓGICA ORIGINAL)
  // ================================================

  if (state.pcrActive) {
    announce('PCR já está ativa. Finalize o atendimento atual antes de iniciar outro.');
    console.warn('PCR já está ativa. Finalize o atendimento atual antes de iniciar outro.');
    showToast('PCR já está em andamento', { type: 'info', timeout: 3000 });
    return false;
  }

  // Se vier dados do paciente, salva no estado
  if (patientData) {
    state.patient = { ...patientData };
  }

  state.pcrActive = true;
  state.pcrStartTime = Date.now();
  state.pcrElapsedSeconds = 0;
  state.timeline = [];
  state.currentRhythm = null;

  // TODO: Inicializar outros estados necessários (compressão, timers, etc)

  announce('Atendimento de PCR iniciado!');
  console.log('✅ PCR iniciada com sucesso');

  // Troca para tela de PCR
  const pcrScreen = document.getElementById('pcr-screen');
  if (pcrScreen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    pcrScreen.classList.add('active');
  }

  return true;
}

/**
 * Finaliza a simulação de PCR
 */
export function finishPCR() {
  console.log('🏁 Finalizando PCR...');

  state.pcrActive = false;
  state.pcrStartTime = null;
  state.pcrElapsedSeconds = 0;
  state.timeline = [];

  announce('Atendimento de PCR finalizado.');

  // Volta para tela inicial
  const homeScreen = document.getElementById('home-screen');
  if (homeScreen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    homeScreen.classList.add('active');
  }

  console.log('✅ PCR finalizada');
}

/**
 * Inicia uma simulação de caso clínico
 * @param {string} caseId - ID do caso clínico
 * @returns {boolean} - true se iniciou com sucesso
 */
export function startSimulation(caseId) {
  console.log('🎮 Tentando iniciar simulação do caso:', caseId);

  // ================================================
  // VERIFICAÇÃO DE LIMITES DIÁRIOS - V4.0
  // ================================================

  // Obter plano atual do usuário
  const userPlan = getCurrentUserPlan();
  console.log('👤 Plano do usuário:', userPlan);

  // Verificar limites de uso
  const usageCheck = checkAndIncrementSimulationUse(userPlan);
  console.log('📊 Resultado da verificação:', usageCheck);

  // CASO 1: Bloqueio total - 5º uso atingido
  if (!usageCheck.allowed) {
    console.warn('🚫 BLOQUEIO ATIVADO - Limite diário atingido');

    // Anunciar para acessibilidade
    announce('Limite diário de simulações atingido. Faça upgrade para continuar treinando.');

    // Mostrar toast de bloqueio
    showToast(
      '🚫 Limite atingido! Faça upgrade para treinar sem limites.',
      { type: 'danger', timeout: 6000 }
    );

    // Abrir modal de upgrade com contexto de bloqueio
    setTimeout(() => {
      if (typeof window.showUpgradeModal === 'function') {
        window.showUpgradeModal({
          reason: 'daily_limit_reached',
          currentPlan: userPlan,
          message: usageCheck.message,
          upgradeRequired: true
        });
      } else {
        // Fallback: abrir modal normal de planos
        if (typeof window.openPlansModal === 'function') {
          window.openPlansModal();
        } else {
          console.error('❌ Função openPlansModal não encontrada!');
          alert(usageCheck.message + '\n\nFaça upgrade para continuar treinando sem limites!');
        }
      }
    }, 500);

    return false;
  }

  // CASO 2: Alerta de penúltimo uso (resta apenas 1 simulação)
  if (usageCheck.isWarning) {
    console.warn('⚠️ ALERTA - Penúltimo uso detectado');

    // Mostrar toast de aviso
    showToast(
      usageCheck.message,
      { type: 'warning', timeout: 8000 }
    );

    // Anunciar para acessibilidade
    announce(usageCheck.message);
  }

  // CASO 3: Uso normal
  if (usageCheck.remaining !== null && usageCheck.remaining > 1) {
    console.log(`✅ Uso permitido - Restam ${usageCheck.remaining} simulações hoje`);
  }

  // ================================================
  // INICIALIZAÇÃO DA SIMULAÇÃO
  // ================================================

  // TODO: Implementar lógica de carregamento do caso clínico
  console.log(`✅ Simulação do caso ${caseId} iniciada com sucesso`);

  return true;
}
