// src/ui/events.js
// Centraliza os listeners dos botões principais da home

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`${screenId}-screen`).classList.add('active');
}

function showPatientModal() {
  // Implemente aqui a lógica do modal de paciente, ou importe de outro módulo se já existir
  // Exemplo:
  const modal = document.getElementById('patient-modal');
  if (modal) modal.style.display = 'block';
}

function showGlasgowModal() {
  // Implemente aqui a lógica do modal de Glasgow, ou importe de outro módulo se já existir
  const modal = document.getElementById('glasgow-modal');
  if (modal) modal.style.display = 'block';
}

import { startPCR } from '../pcr/start.js';

export function registerHomeButtonEvents() {
  document.getElementById('start-pcr-card')?.addEventListener('click', showPatientModal);
  document.getElementById('studies-tool')?.addEventListener('click', () => showScreen('studies'));
  document.getElementById('protocols-tool')?.addEventListener('click', () => showScreen('protocols'));
  document.getElementById('quiz-config-tool')?.addEventListener('click', () => showScreen('quiz-config'));
  document.getElementById('glasgow-tool')?.addEventListener('click', showGlasgowModal);

  // Evento do formulário de paciente
  const patientForm = document.getElementById('patient-form');
  if (patientForm) {
    patientForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // Coleta dados do formulário
      const patientData = {
        name: document.getElementById('patient-name').value || '',
        age: document.getElementById('patient-age').value || null,
        weight: document.getElementById('patient-weight').value || null,
        sex: document.querySelector('input[name="sex"]:checked')?.value || '',
        allergies: document.getElementById('patient-allergies').value || '',
        comorbidities: document.getElementById('patient-comorbidities').value || ''
      };
      startPCR(patientData);
      // Fecha o modal
      const modal = document.getElementById('patient-modal');
      if (modal) modal.style.display = 'none';
    });
  }

  // Registro de atalhos globais (teclado) para ações críticas
  document.addEventListener('keydown', (e) => {
    // Ignore quando em campos de input/textarea
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;

    // Teclas úteis: C = compressões, M = metrônomo, S = choque (abrir modal de choque)
    switch (e.code) {
      case 'KeyC':
        // Tenta iniciar compressões (ou retomar)
        if (typeof window.startCompressions === 'function') {
          window.startCompressions();
          if (window.SIAV && typeof window.SIAV.announce === 'function') {
            window.SIAV.announce('Compressões iniciadas', 'assertive');
          }
        }
        break;
      case 'KeyM':
        if (typeof window.toggleMetronome === 'function') {
          window.toggleMetronome();
          if (window.SIAV && typeof window.SIAV.announce === 'function') {
            window.SIAV.announce('Metrônomo alternado', 'polite');
          }
        }
        break;
      case 'KeyS':
        // Abre modal de choque / aplica choque se já informado
        const shockBtn = document.getElementById('apply-shock-btn');
        if (shockBtn) {
          shockBtn.focus();
          shockBtn.click();
          if (window.SIAV && typeof window.SIAV.announce === 'function') {
            window.SIAV.announce('Aplicar choque', 'assertive');
          }
        }
        break;
      case 'Digit1':
      case 'Numpad1':
        // Atalho: 1 = inserir Adrenalina (a funcao recordMedication é chamada pelo modal normalmente)
        const medBtn = document.getElementById('open-med-modal');
        if (medBtn) medBtn.click();
        break;
      default:
        break;
    }
  });
}
