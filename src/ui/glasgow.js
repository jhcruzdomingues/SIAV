import { state } from '../config/state.js';
import { closeModal, openModal } from './dom.js';

export function showGlasgowModal() {
    const ocular = document.getElementById('glasgow-ocular');
    const verbal = document.getElementById('glasgow-verbal');
    const motora = document.getElementById('glasgow-motora');
    
    if (ocular) ocular.value = '0';
    if (verbal) verbal.value = '0';
    if (motora) motora.value = '0';
    
    updateGlasgowScore();
    openModal('glasgow-modal');
}

export function updateGlasgowScore() {
    const ocular = parseInt(document.getElementById('glasgow-ocular')?.value) || 0;
    const verbal = parseInt(document.getElementById('glasgow-verbal')?.value) || 0;
    const motora = parseInt(document.getElementById('glasgow-motora')?.value) || 0;
    const result = window.MedicalBrain.calculateGlasgow(ocular, verbal, motora);
    
    const scoreDisplay = document.getElementById('glasgow-score-display');
    const severityDisplay = document.getElementById('glasgow-severity');
    
    if (scoreDisplay) {
        const box = scoreDisplay.closest('.recommendation-box');
        scoreDisplay.textContent = result.score !== null ? result.score : 'N/A';
        if (severityDisplay) severityDisplay.textContent = result.severity;
        if (box) box.style.backgroundColor = `var(--${result.color})`;
    }
    return result.score;
}

export function saveGlasgow() {
    const score = updateGlasgowScore();
    if (score === null) { alert("Por favor, selecione os três critérios da Escala de Glasgow."); return; }
    
    if (state.pcrActive) {
        const severity = document.getElementById('glasgow-severity')?.textContent || '';
        if (typeof window.addEvent === 'function') window.addEvent(`AVALIAÇÃO NEURO: Glasgow ${score} (${severity})`, score <= 8 ? 'critical' : 'normal');
        alert(`Glasgow ${score} salvo na Linha do Tempo!`);
    } else {
        alert(`Glasgow ${score} calculado. Inicie um atendimento de PCR para salvar no log.`);
    }
    closeModal('glasgow-modal');
}