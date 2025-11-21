/**
 * =============================================
 * GERENCIAMENTO DE ESTADO GLOBAL
 * =============================================
 * Mantém o estado da aplicação durante a sessão
 */

import { TIMINGS, BPM } from './constants.js';

/**
 * Estado global da aplicação
 */
export const state = (window.state = window.state || {
  // Sessão do usuário
  user: null,
  userProfile: null,
  userPlan: 'free',

  // Atendimento PCR ativo
  pcrActive: false,
  pcrStartTime: null,
  pcrElapsedSeconds: 0,

  // Dados do paciente
  patient: {
    name: '',
    age: null,
    weight: null,
    sex: '',
    allergies: '',
    comorbidities: ''
  },

  // Timeline de eventos
  timeline: [],

  // Ritmo atual
  currentRhythm: null,

  // Sons
  soundsEnabled: true,
  soundVolume: 0.7,
  customSounds: {
    shock: null,
    alert: null,
    drug: null,
    metronome: null
  },

  // Tema
  theme: 'auto' // 'light', 'dark', 'auto'
});

/**
 * Estado do ciclo de compressão
 */
export const compressionCycle = {
  cycleNumber: 0,
  inProgress: false,
  startTime: null,
  shockCount: 0,
  drugTimes: [],
  lastDrugTime: null,
  lastRhythmCheck: null
};

/**
 * Estado do metrônomo
 */
export const metronomeState = {
  active: false,
  bpm: BPM.DEFAULT,
  audioContext: null,
  intervalId: null
};

/**
 * Reseta o estado do PCR
 */
export function resetPCRState() {
  state.pcrActive = false;
  state.pcrStartTime = null;
  state.pcrElapsedSeconds = 0;
  state.timeline = [];
  state.currentRhythm = null;

  compressionCycle.cycleNumber = 0;
  compressionCycle.inProgress = false;
  compressionCycle.startTime = null;
  compressionCycle.shockCount = 0;
  compressionCycle.drugTimes = [];
  compressionCycle.lastDrugTime = null;
  compressionCycle.lastRhythmCheck = null;
}

/**
 * Reseta dados do paciente
 */
export function resetPatientData() {
  state.patient = {
    name: '',
    age: null,
    weight: null,
    sex: '',
    allergies: '',
    comorbidities: ''
  };
}

/**
 * Adiciona evento à timeline
 * @param {string} eventType - Tipo do evento
 * @param {string} description - Descrição do evento
 * @param {object} data - Dados adicionais
 */
export function addTimelineEvent(eventType, description, data = {}) {
  const event = {
    timestamp: Date.now(),
    elapsedSeconds: state.pcrElapsedSeconds,
    type: eventType,
    description,
    data
  };

  state.timeline.push(event);
  return event;
}

/**
 * Obtém o estado completo para exportação
 */
export function getStateSnapshot() {
  return {
    timestamp: Date.now(),
    state: { ...state },
    compressionCycle: { ...compressionCycle },
    metronomeState: { ...metronomeState }
  };
}
