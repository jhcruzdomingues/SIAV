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
import { loadUserProfile, saveUserProfile, savePCRLog, loadPCRLogs, loadUserStats, fetchRandomClinicalCase, saveSimulationLog, loadSimulationLogs, preloadClinicalCases } from './services/database.js';
import { setItem, getItem, saveSettings, loadSettings, saveOfflineLog, getOfflineLogs, markLogSynced } from './services/storage.js';

import { formatTime, formatDate, formatDateTime, calculatePediatricDose } from './utils/formatters.js';
import { MEDICATIONS, calculateDose } from './utils/medications.js';

import { getProtocolNextStep, shouldAdministerDrug, getRecommendedShockEnergy, getProtocolGuidance } from './protocols/medical.js';
import * as MedicalBrain from './protocols/medical.js';

import { startPCR, finishPCR, executePCRFinish, startTimer, startCycleProgress, startCompressions, promptRhythmCheck, clearAllIntervals } from './pcr/core.js';
import { showRhythmSelectorScreen, selectRhythmOption, processRhythmSelection, setupShockActionScreen, applyShockAndResume, roscObtido } from './pcr/rhythm.js';
import { showMedModal, updateMedicationDose, recordMedication, startDrugTimer, stopDrugTimer } from './pcr/medications.js';
import { addEvent, getIconForEvent, updateTimeline } from './ui/timeline.js';
import { showVitalsModal, getVitalsStatus, recordVitals } from './pcr/vitals.js';
import { showNotesModal, saveNotes, generateEvolution, savePcrLogToSupabase, fetchPcrLogs, deleteLogEntry, renderPatientLog, viewLogDetail } from './pcr/log.js';

// Novos módulos
import { initI18n, t, setLocale, getLocale } from './i18n/index.js';
import { events } from './utils/events.js';
import { initAnalytics, SIAVAnalytics, trackEvent, trackPageView } from './analytics/index.js';
import { initAccessibility, announce } from './accessibility/index.js';
import { showToast } from './ui/toast.js';
import { initDOMCache, showScreen, closeModal, openModal, showTransientAlert } from './ui/dom.js';
import { initAudio, playNotification, toggleMetronome, startMetronome, stopMetronome, adjustBPM } from './ui/audio.js';


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
    // Só faz preload de casos clínicos se usuário estiver autenticado
    preloadClinicalCases();
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
        // Carregar/preload casos clínicos APÓS login
        preloadClinicalCases();
      }
    } else if (event === 'SIGNED_OUT') {
      console.log('👋 Logout realizado');
      trackEvent('user_logout');
    }
  });

  console.log('✅ SIAV inicializado com sucesso!');
  announce('Aplicativo SIAV carregado e pronto para uso');

  // 8. Não faz mais preload automático de casos clínicos sem autenticação

  // Sincronização de logs pendentes quando voltar online
  window.addEventListener('online', async () => {
    try {
      const pending = await getOfflineLogs();
      if (!pending || pending.length === 0) return;

      showToast(`Sincronizando ${pending.length} registros offline...`, { type: 'info', timeout: 4000 });

      for (let i = 0; i < pending.length; i++) {
        const log = pending[i];
        try {
          const saved = await savePCRLog(log);
          if (saved && saved.success) {
            await markLogSynced(log.id || i);
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

  // ==========================================
  // REGISTRO DE EVENTOS GLOBAIS (Event Bus)
  // ==========================================
  
  events.on('PCR_STARTED', (payload) => {
    showScreen('pcr');
  });

  events.on('PCR_FINISHED', () => {
    showScreen('home');
  });

  events.on('SIMULATION_BLOCKED', (context) => {
    setTimeout(() => {
      if (typeof window.showUpgradeModal === 'function') {
        window.showUpgradeModal(context);
      } else if (typeof window.openPlansModal === 'function') {
        window.openPlansModal();
      } else {
        alert(context.message + '\n\nFaça upgrade para continuar treinando sem limites!');
      }
    }, 500);
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
  preloadClinicalCases,
  saveSimulationLog,
  loadSimulationLogs,

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

// Vincula as funções extraídas da PCR para garantir compatibilidade perfeita com onclicks do HTML
Object.assign(window, {
  startPCR, finishPCR, executePCRFinish, 
  startTimer, startCycleProgress, startCompressions, 
  promptRhythmCheck, clearAllIntervals
});
Object.assign(window, { showRhythmSelectorScreen, selectRhythmOption, processRhythmSelection, setupShockActionScreen, applyShockAndResume, roscObtido });
Object.assign(window, { showMedModal, updateMedicationDose, recordMedication, startDrugTimer, stopDrugTimer });
Object.assign(window, { addEvent, getIconForEvent, updateTimeline });
Object.assign(window, { showVitalsModal, getVitalsStatus, recordVitals });
Object.assign(window, { toggleMetronome, startMetronome, stopMetronome, adjustBPM, showTransientAlert });
Object.assign(window, { showNotesModal, saveNotes, generateEvolution, savePcrLogToSupabase, fetchPcrLogs, deleteLogEntry, renderPatientLog, viewLogDetail });

window.MedicalBrain = MedicalBrain;

// ===== INICIALIZAÇÃO AUTOMÁTICA =====

// Inicializa quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Exporta para uso em outros módulos
export { initApp };
