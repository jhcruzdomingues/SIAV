// src/pcr/start.js
import { state, resetPCRState } from '../config/state.js';
import { announce } from '../accessibility/index.js';

export function startPCR(patientData = null) {
  if (state.pcrActive) {
    announce('PCR já está ativa. Finalize o atendimento atual antes de iniciar outro.');
    console.warn('PCR já está ativa. Finalize o atendimento atual antes de iniciar outro.');
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
  // Troca para tela de PCR
  const pcrScreen = document.getElementById('pcr-screen');
  if (pcrScreen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    pcrScreen.classList.add('active');
  }
  return true;
}

export function finishPCR() {
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
}
