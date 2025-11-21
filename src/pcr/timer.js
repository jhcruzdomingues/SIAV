/**
 * =============================================
 * MÓDULO DE TIMER PCR
 * =============================================
 * Gerencia o cronômetro de parada cardiorrespiratória
 */


import { getElement } from '../ui/dom.js';
import { formatTime } from '../utils/formatters.js';
import * as audioManager from '../ui/audio.js';

let pcrWorker = null;
let pcrSeconds = 0;
let wakeLock = null;
let isActive = false;

function supportsWorker() {
    return typeof Worker !== 'undefined';
}

function requestWakeLock() {
    if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen').then(lock => {
            wakeLock = lock;
            wakeLock.addEventListener('release', () => {
                console.log('🔒 Wake Lock liberado');
            });
            console.log('🔒 Wake Lock ativo');
        }).catch(err => {
            console.warn('⚠️ Wake Lock falhou:', err);
        });
    } else {
        console.warn('⚠️ Wake Lock API não suportada');
    }
}

function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
    }
}

/**
 * Inicia o timer de PCR
 */
export function startPCRTimer() {
    if (isActive) {
        console.warn('⚠️ Timer já está rodando');
        return;
    }
    pcrSeconds = 0;
    isActive = true;

    if (supportsWorker()) {
        if (!pcrWorker) {
            pcrWorker = new Worker(new URL('../workers/pcr-worker.js', import.meta.url), { type: 'module' });
            pcrWorker.onmessage = function (e) {
                const { type, elapsed } = e.data;
                if (type === 'tick') {
                    pcrSeconds = elapsed;
                    updateTimerDisplay();
                    checkCycleEvents();
                    audioManager.playMetronome && audioManager.playMetronome();
                } else if (type === 'reset') {
                    pcrSeconds = 0;
                    updateTimerDisplay();
                }
            };
        }
        pcrWorker.postMessage({ type: 'start', elapsed: pcrSeconds });
    } else {
        // Fallback para setInterval (não recomendado)
        window._pcrInterval = setInterval(() => {
            pcrSeconds++;
            updateTimerDisplay();
            checkCycleEvents();
            audioManager.playMetronome && audioManager.playMetronome();
        }, 1000);
    }
    requestWakeLock();
    console.log('⏱️ Timer PCR iniciado');
}

/**
 * Para o timer de PCR
 */
export function stopPCRTimer() {
    if (!isActive) return;
    isActive = false;
    if (supportsWorker() && pcrWorker) {
        pcrWorker.postMessage({ type: 'stop' });
    } else if (window._pcrInterval) {
        clearInterval(window._pcrInterval);
        window._pcrInterval = null;
    }
    releaseWakeLock();
    console.log('⏱️ Timer PCR parado');
}
}

/**
 * Reseta o timer de PCR
 */
export function resetPCRTimer() {
    stopPCRTimer();
    pcrSeconds = 0;
    if (supportsWorker() && pcrWorker) {
        pcrWorker.postMessage({ type: 'reset' });
    } else {
        updateTimerDisplay();
    }
    console.log('🔄 Timer PCR resetado');
}

/**
 * Obtém o tempo atual do timer em segundos
 * @returns {number}
 */
export function getPCRSeconds() {
    return pcrSeconds;
}

/**
 * Atualiza a exibição do timer na tela
 */
function updateTimerDisplay() {
    const timerElement = getElement('pcrTimer');
    if (timerElement) {
        timerElement.textContent = formatTime(pcrSeconds);
    }
}

function checkCycleEvents() {
    // Exemplo: evento a cada 2 minutos
    if (pcrSeconds > 0 && pcrSeconds % 120 === 0) {
        // Aqui pode disparar eventos de ciclo, ex: alertar usuário
        // Exemplo: audioManager.playNotification('alert');
        // window.dispatchEvent(new CustomEvent('pcrCycle', { detail: { elapsed: pcrSeconds } }));
    }
}

/**
 * Verifica se o timer está ativo
 * @returns {boolean}
 */
export function isPCRTimerActive() {
    return isActive;
}
