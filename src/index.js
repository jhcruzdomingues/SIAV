/**
 * =============================================
 * SIAV - ARQUIVO DE ÍNDICE DE EXPORTS
 * =============================================
 * Facilita importação de múltiplos módulos
 *
 * Uso:
 * import { handleLogin, formatTime, MEDICATIONS } from './src/index.js';
 */

// Config
export { supabase, config } from './config/supabase.js';
export { PLANS, TIMINGS, BPM, RHYTHMS, SHOCK_ENERGY, APP_VERSION, APP_NAME } from './config/constants.js';
export {
  state,
  compressionCycle,
  metronomeState,
  resetPCRState,
  resetPatientData,
  addTimelineEvent,
  getStateSnapshot
} from './config/state.js';

// Services
export {
  handleLogin,
  logout,
  checkSession,
  updatePassword,
  onAuthStateChange
} from './services/auth.js';

export {
  loadUserProfile,
  saveUserProfile,
  savePCRLog,
  loadPCRLogs,
  deletePCRLog,
  loadUserStats
} from './services/database.js';

export {
  setItem,
  getItem,
  removeItem,
  clear,
  saveSettings,
  loadSettings,
  saveOfflineLog,
  getOfflineLogs,
  markLogSynced,
  getStorageSize,
  getStorageSizeFormatted
} from './services/storage.js';

// Utils
export {
  formatTime,
  formatTimestamp,
  formatDate,
  formatDateTime,
  calculatePediatricDose,
  calculatePediatricShock,
  isPediatric,
  calculateAge,
  formatDuration,
  formatPercentage,
  truncate
} from './utils/formatters.js';

export {
  MEDICATIONS,
  calculateDose,
  getMedicationInterval,
  getMedicationRoutes,
  getMedicationNotes
} from './utils/medications.js';

// Protocols
export {
  getProtocolNextStep,
  shouldAdministerDrug,
  shouldAdministerAntiarrhythmic,
  getRecommendedShockEnergy,
  validateCPRQuality,
  getProtocolGuidance
} from './protocols/medical.js';
