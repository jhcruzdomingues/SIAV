// src/services/permissions.js
// Centraliza regras de acesso por plano e autenticação

import { state } from '../config/state.js';


// Todas as funções de permissão de plano removidas. Todos os recursos são livres.
export function isAuthenticated() {
  return !!state.currentUser && !!state.currentUser.id;
}

export function hasPlan(requiredPlan = 'free') {
  return true;
}

export function canAccess(feature) {
  return true;
}
