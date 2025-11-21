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
  if (!state.medications) state.medications = [];
  state.medications.push({ ...medication, timestamp: Date.now() });
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
