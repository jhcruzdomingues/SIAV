// src/ui/navigation.js
// Centraliza navegação entre telas e feedbacks ao usuário

/**
 * Mostra uma tela pelo id, ocultando as demais
 * @param {string} screenId
 */
export function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`${screenId}-screen`);
  if (el) el.classList.add('active');
}

/**
 * Mostra um modal pelo id
 * @param {string} modalId
 */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('show');
}

/**
 * Fecha um modal pelo id
 * @param {string} modalId
 */
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('show');
}

/**
 * Mostra um feedback/alerta customizado
 * @param {string} msg
 * @param {string} type
 */
import { showToast } from './toast.js';

export function showFeedback(msg, type = 'info') {
  // Usa toasts acessíveis ao invés de alert() que bloqueia a tela
  try {
    showToast(msg, { type });
  } catch (e) {
    // Fallback simples
    alert(msg);
  }
}
