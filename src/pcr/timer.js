/**
 * =============================================
 * MÓDULO DE TIMER PCR
 * =============================================
 * Gerencia o cronômetro de parada cardiorrespiratória
 */

import { getElement } from '../ui/dom.js';
import { formatTime } from '../utils/formatters.js';

let pcrInterval = null;
let pcrStartTime = null;
let pcrSeconds = 0;

/**
 * Inicia o timer de PCR
 */
export function startPCRTimer() {
    if (pcrInterval) {
        console.warn('⚠️ Timer já está rodando');
        return;
    }

    pcrStartTime = Date.now();
    pcrSeconds = 0;

    pcrInterval = setInterval(() => {
        pcrSeconds = Math.floor((Date.now() - pcrStartTime) / 1000);
        updateTimerDisplay();
    }, 1000);

    console.log('⏱️ Timer PCR iniciado');
}

/**
 * Para o timer de PCR
 */
export function stopPCRTimer() {
    if (pcrInterval) {
        clearInterval(pcrInterval);
        pcrInterval = null;
        console.log('⏱️ Timer PCR parado');
    }
}

/**
 * Reseta o timer de PCR
 */
export function resetPCRTimer() {
    stopPCRTimer();
    pcrSeconds = 0;
    pcrStartTime = null;
    updateTimerDisplay();
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

/**
 * Verifica se o timer está ativo
 * @returns {boolean}
 */
export function isPCRTimerActive() {
    return pcrInterval !== null;
}
