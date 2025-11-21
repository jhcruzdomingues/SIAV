/**
 * =============================================
 * MÓDULO DE ÁUDIO
 * =============================================
 * Gerencia sons, alertas e metrônomo
 */

import { getItem } from '../services/storage.js';

// Elementos de áudio
const AUDIO_ELEMENTS = {
    shock: null,
    alert: null,
    drug: null,
    metronome: null
};

// Contexto de áudio para metrônomo
let audioContext = null;
let metronomeInterval = null;

/**
 * Inicializa os elementos de áudio
 */
export function initAudio() {
    AUDIO_ELEMENTS.shock = document.getElementById('shock-sound');
    AUDIO_ELEMENTS.alert = document.getElementById('alert-sound');
    AUDIO_ELEMENTS.drug = document.getElementById('drug-sound');
    AUDIO_ELEMENTS.metronome = document.getElementById('metronome-sound');

    console.log('🔊 Sistema de áudio inicializado');
}

/**
 * Toca uma notificação de áudio
 * @param {string} type - Tipo: 'shock', 'alert', 'drug', 'metronome'
 */
export function playNotification(type) {
    const soundsEnabled = getItem('soundsEnabled', true);
    const volume = getItem('soundVolume', 0.7);

    if (!soundsEnabled) {
        console.log('🔇 Sons desabilitados');
        return;
    }

    const audio = AUDIO_ELEMENTS[type];
    if (!audio) {
        console.warn(`⚠️ Áudio '${type}' não encontrado`);
        return;
    }

    // Configurar volume
    audio.volume = volume;

    // Tocar som
    audio.currentTime = 0; // Reinicia se já estiver tocando
    audio.play().catch(err => {
        console.warn(`⚠️ Erro ao tocar som '${type}':`, err);
    });
}

/**
 * Inicia o metrônomo
 * @param {number} bpm - Batimentos por minuto (100-120)
 */
export function startMetronome(bpm = 110) {
    if (metronomeInterval) {
        console.log('⏱️ Metrônomo já está rodando');
        return;
    }

    const soundsEnabled = getItem('soundsEnabled', true);
    if (!soundsEnabled) {
        console.log('🔇 Metrônomo não iniciado - sons desabilitados');
        return;
    }

    const interval = (60 / bpm) * 1000; // Converte BPM para ms

    metronomeInterval = setInterval(() => {
        playNotification('metronome');
    }, interval);

    console.log(`⏱️ Metrônomo iniciado: ${bpm} BPM`);
}

/**
 * Para o metrônomo
 */
export function stopMetronome() {
    if (metronomeInterval) {
        clearInterval(metronomeInterval);
        metronomeInterval = null;
        console.log('⏱️ Metrônomo parado');
    }
}

/**
 * Verifica se o metrônomo está ativo
 * @returns {boolean}
 */
export function isMetronomeActive() {
    return metronomeInterval !== null;
}

/**
 * Ajusta o BPM do metrônomo (se estiver rodando, reinicia com novo BPM)
 * @param {number} newBpm - Novo valor de BPM
 */
export function adjustMetronomeBPM(newBpm) {
    if (metronomeInterval) {
        stopMetronome();
        startMetronome(newBpm);
        console.log(`⏱️ BPM ajustado para: ${newBpm}`);
    }
}

export { AUDIO_ELEMENTS, audioContext };
