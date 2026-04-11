/**
 * =============================================
 * MÓDULO DE ÁUDIO
 * =============================================
 * Gerencia sons, alertas e metrônomo
 */

import { getItem } from '../services/storage.js';
import { state, intervals } from '../config/state.js';

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

export function createMetronomeSound() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.03);

        const stopTime = audioContext.currentTime + 0.03;
        oscillator.start(audioContext.currentTime);
        oscillator.stop(stopTime);
        
        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
        };
    } catch (error) {
        console.warn('Erro ao criar som do metrônomo:', error);
    }
}

export function toggleMetronome() {
    if (state.metronomeActive) {
        stopMetronome();
    } else {
        startMetronome();
    }
}

/**
 * Inicia o metrônomo
 */
export function startMetronome() {
    if (state.metronomeActive) {
        console.log('⏱️ Metrônomo já está rodando');
        return;
    }

    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') audioContext.resume();

    state.metronomeActive = true;
    const metroBtn = document.getElementById('metro-btn');
    const metroStatus = document.getElementById('metro-status');

    if (metroBtn) metroBtn.classList.add('active');
    if (metroStatus) metroStatus.textContent = 'METRÔNOMO ATIVO';
    
    const interval = 60000 / state.bpm;
    createMetronomeSound();
    
    if (intervals.metronome) clearInterval(intervals.metronome);
    intervals.metronome = setInterval(() => {
        createMetronomeSound();
    }, interval);

}

/**
 * Para o metrônomo
 */
export function stopMetronome() {
    state.metronomeActive = false;
    const metroBtn = document.getElementById('metro-btn');
    const metroStatus = document.getElementById('metro-status');
    
    if (metroBtn) metroBtn.classList.remove('active');
    if (metroStatus) metroStatus.textContent = 'INICIAR METRÔNOMO';
    
    if (intervals.metronome) {
        clearInterval(intervals.metronome);
        intervals.metronome = null;
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
 * @param {number} change - Valor a incrementar/decrementar
 */
export function adjustBPM(change) {
    state.bpm += change;
    state.bpm = Math.max(100, Math.min(120, state.bpm));
    
    const bpmValue = document.getElementById('bpm-value');
    if(bpmValue) bpmValue.textContent = state.bpm + ' BPM';
    
    if (state.metronomeActive) {
        if (intervals.metronome) clearInterval(intervals.metronome);
        const interval = 60000 / state.bpm;
        intervals.metronome = setInterval(() => {
            createMetronomeSound();
        }, interval);
    }
}

export { AUDIO_ELEMENTS, audioContext };
