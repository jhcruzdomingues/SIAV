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
const defaultState = {
  // Sessão do usuário
  user: null,
  userProfile: null,
  currentUser: {
    isLoggedIn: false,
    name: 'Convidado',
    email: null,
    profession: 'Profissional de Saúde',
    councilRegister: null,
    plan: 'free',
    token: null,
    id: null,
    phone: null,
    birthDate: null
  },
  userPlan: 'free',

  // Atendimento PCR ativo
  pcrActive: false,
  pcrStartTime: null,
  pcrElapsedSeconds: 0,
  pcrSeconds: 0,

  // Dados do paciente
  patient: {
    name: '',
    age: 30,
    weight: 70,
    sex: '',
    allergies: '',
    comorbidities: ''
  },

  // Timeline de eventos
  timeline: [],
  events: [],

  // Ritmo atual
  currentRhythm: null,
  rhythms: [],
  tempRhythmData: { rhythm: null, notes: null },

  // Contadores e métricas PCR
  shockCount: 0,
  medications: [],
  notes: [],
  causesChecked: [],
  totalCompressionSeconds: 0,
  roscAchieved: false,

  // Metrônomo
  metronomeActive: false,
  bpm: 110,

  // UI
  currentScreen: 'home',

  // Quiz e Simulador
  quiz: {
    active: false,
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    config: {}
  },
  quizResults: [],
  patientLog: [],

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
};

// Inicializa unificando o estado do window (script.js) com os valores default
export const state = (window.state = Object.assign(defaultState, window.state || {}));

/**
 * Estado do ciclo de compressão
 */
const defaultCompressionCycle = {
  active: false,
  startTime: null,
  cycleCount: 0,
  currentPhase: 'preparation',
  cycleTimer: null,
  cycleProgress: 0,
  compressionTime: 0,
  pauseStartTime: null,
  lastRhythmWasShockable: undefined,
  rhythmCheckTriggered: false
};

export const compressionCycle = (window.compressionCycle = Object.assign(defaultCompressionCycle, window.compressionCycle || {}));

export const intervals = (window.intervals = window.intervals || {
  timer: null, metronome: null, progress: null, drugTimer: null
});

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
  state.pcrSeconds = 0;
  state.timeline = [];
  state.events = [];
  state.currentRhythm = null;
  state.rhythms = [];
  state.shockCount = 0;
  state.medications = [];
  state.notes = [];
  state.causesChecked = [];
  state.totalCompressionSeconds = 0;
  state.roscAchieved = false;
  state.tempRhythmData = { rhythm: null, notes: null };

  compressionCycle.active = false;
  compressionCycle.startTime = null;
  compressionCycle.cycleCount = 0;
  compressionCycle.currentPhase = 'preparation';
  compressionCycle.cycleTimer = null;
  compressionCycle.cycleProgress = 0;
  compressionCycle.compressionTime = 0;
  compressionCycle.pauseStartTime = null;
  compressionCycle.lastRhythmWasShockable = undefined;
  compressionCycle.rhythmCheckTriggered = false;
}

/**
 * Reseta dados do paciente
 */
export function resetPatientData() {
  state.patient = {
    name: '',
    age: 30,
    weight: 70,
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
