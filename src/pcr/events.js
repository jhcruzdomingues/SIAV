// src/pcr/events.js
// Módulo para gerenciar eventos clínicos, anotações e medicamentos do PCR

import { state } from '../config/state.js';

export function addEventToTimeline(type, description, data = {}) {
  const event = {
    timestamp: Date.now(),
    elapsedSeconds: state.pcrSeconds || 0,
    type,
    description,
    ...data
  };
  if (!state.timeline) state.timeline = [];
  state.timeline.push(event);
}

export function addNote(text) {
  if (!state.notes) state.notes = [];
  state.notes.push({ text, timestamp: Date.now() });
}

export function addMedication(medication) {
  if (!Array.isArray(state.medications)) {
    state.medications = [];
    if (state.clinical) state.clinical.historyIncomplete = true;
  }
  if (!medication.id) throw new Error('Identificador de registro obrigatório.');
  if (state.medications.some(entry => entry?.id === medication.id)) return null;
  const recordedAt = Date.now();
  if (!Number.isFinite(medication.amount) || medication.amount <= 0
      || !['mg', 'g', 'mEq'].includes(medication.unit)
      || !['EV', 'IO', 'ET'].includes(medication.route)
      || !Number.isFinite(medication.timestamp) || medication.timestamp > recordedAt) {
    throw new Error('Informe quantidade, unidade, via e horário efetivos válidos.');
  }
  const entry = { ...medication, recordedAt, time: new Date(medication.timestamp), dose: `${medication.amount} ${medication.unit}` };
  state.medications.push(entry);
  return entry;
}

export function getTimeline() {
  return state.timeline || [];
}

export function getNotes() {
  return state.notes || [];
}

export function getMedications() {
  return state.medications || [];
}
