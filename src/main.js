/**
 * =============================================
 * SIAV - PONTO DE ENTRADA PRINCIPAL (MODULAR)
 * =============================================
 * Este é o arquivo principal que inicializa o app
 * usando a nova estrutura modular.
 *
 * INSTRUÇÕES DE MIGRAÇÃO:
 * 1. Gradualmente migrar funções do script.js para este arquivo
 * 2. Importar apenas o necessário de cada módulo
 * 3. Manter compatibilidade com código legado durante transição
 */

// ===== IMPORTS =====
import { supabase } from './config/supabase.js';
import { state, resetPCRState, addTimelineEvent } from './config/state.js';
import { PLANS, TIMINGS, BPM } from './config/constants.js';

import { handleLogin, logout, checkSession, onAuthStateChange } from './services/auth.js';
import { loadUserProfile, saveUserProfile, savePCRLog, loadPCRLogs, loadUserStats, fetchRandomClinicalCase } from './services/database.js';
import { setItem, getItem, saveSettings, loadSettings, saveOfflineLog, getOfflineLogs, markLogSynced } from './services/storage.js';

import { formatTime, formatDate, formatDateTime, calculatePediatricDose } from './utils/formatters.js';
import { MEDICATIONS, calculateDose } from './utils/medications.js';

import { getProtocolNextStep, shouldAdministerDrug, getRecommendedShockEnergy, getProtocolGuidance } from './protocols/medical.js';

// Novos módulos
import { initI18n, t, setLocale, getLocale } from './i18n/index.js';
import { initAnalytics, SIAVAnalytics, trackEvent, trackPageView } from './analytics/index.js';
import { initAccessibility, announce } from './accessibility/index.js';
import { showToast } from './ui/toast.js';
import { initDOMCache, showScreen, closeModal, openModal } from './ui/dom.js';
import { initAudio, playNotification } from './ui/audio.js';


// Importa eventos dos botões principais
import { registerHomeButtonEvents } from './ui/events.js';
// ===== INICIALIZAÇÃO =====

console.log('%c🏥 SIAV v2.0 - Sistema Modular Inicializado', 'color: #e74c3c; font-size: 16px; font-weight: bold;');

/**
 * Inicializa o aplicativo
 */
async function initApp() {
  console.log('🚀 Inicializando SIAV...');

  // 1. Inicializar DOM e UI
  initDOMCache();
  initAudio();

  // 2. Internacionalização
  initI18n();

  // 3. Analytics (Plausible - privacy-focused)
  initAnalytics({
    provider: 'plausible',
    domain: window.location.hostname
  });

  // 4. Acessibilidade
  initAccessibility();

  // 5. Carregar configurações do localStorage
  const settings = loadSettings();
  state.theme = settings.theme;
  state.soundsEnabled = settings.soundsEnabled;
  state.soundVolume = settings.soundVolume;

  // 6. Verificar sessão ativa
  const user = await checkSession();
  if (user) {
    console.log('✅ Usuário logado:', user.email);
    await loadUserProfile(user.id);
    SIAVAnalytics.screenViewed('home');
  } else {
    console.log('ℹ️ Usuário não autenticado');
  }

  // 7. Configurar listeners de autenticação
  onAuthStateChange((event, session) => {
    console.log('🔐 Auth event:', event);
    if (event === 'SIGNED_IN') {
      console.log('✅ Login realizado');
      if (session?.user) {
        loadUserProfile(session.user.id);
        trackEvent('user_login');
      }
    } else if (event === 'SIGNED_OUT') {
      console.log('👋 Logout realizado');
      trackEvent('user_logout');
    }
  });

  console.log('✅ SIAV inicializado com sucesso!');
  announce('Aplicativo SIAV carregado e pronto para uso');

  // Sincronização de logs pendentes quando voltar online
  window.addEventListener('online', async () => {
    try {
      const pending = getOfflineLogs();
      if (!pending || pending.length === 0) return;

      showToast(`Sincronizando ${pending.length} registros offline...`, { type: 'info', timeout: 4000 });

      for (let i = 0; i < pending.length; i++) {
        const log = pending[i];
        try {
          const saved = await savePCRLog(log);
          if (saved && saved.success) {
            markLogSynced(i);
            showToast('Registro sincronizado com sucesso', { type: 'success' });
          }
        } catch (err) {
          console.error('Erro ao sincronizar log offline:', err);
        }
      }
    } catch (err) {
      console.error('Erro no processo de sincronizacao offline:', err);
    }
  });

  // Listeners dos botões principais da home
  registerHomeButtonEvents();
}

// ===== EXPORTS GLOBAIS (Para compatibilidade com código legado) =====

// Disponibilizar funções globalmente para uso no HTML (onclick, etc)
window.SIAV = {
  // Estado
  state,
  resetPCRState,
  addTimelineEvent,

  // Autenticação
  handleLogin,
  logout,
  checkSession,

  // Database
  loadUserProfile,
  saveUserProfile,
  savePCRLog,
  saveOfflineLog,
  getOfflineLogs,
  markLogSynced,
  loadPCRLogs,
  loadUserStats,
  fetchRandomClinicalCase,

  // Storage
  setItem,
  getItem,
  saveSettings,
  loadSettings,

  // Formatters
  formatTime,
  formatDate,
  formatDateTime,
  calculatePediatricDose,

  // Medications
  MEDICATIONS,
  calculateDose,

  // Protocolos
  getProtocolNextStep,
  shouldAdministerDrug,
  getRecommendedShockEnergy,
  getProtocolGuidance,

  // Constantes
  PLANS,
  TIMINGS,
  BPM,

  // i18n
  t,
  setLocale,
  getLocale,

  // Analytics
  analytics: SIAVAnalytics,
  trackEvent,
  trackPageView,

  // Acessibilidade
  announce,

  // UI
  showScreen,
  closeModal,
  openModal,
  playNotification,
  showToast,

  // Supabase (para uso direto se necessário)
  supabase
};

// ===== INICIALIZAÇÃO AUTOMÁTICA =====

// Inicializa quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Exporta para uso em outros módulos
export { initApp };
