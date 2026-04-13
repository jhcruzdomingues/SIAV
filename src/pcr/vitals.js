import { state } from '../config/state.js';
import { closeModal, openModal, showTransientAlert } from '../ui/dom.js';

export function showVitalsModal() {
    openModal('vitals-modal');

    const statusBox = document.querySelector('.vitals-modal .vitals-status');
    if (statusBox) statusBox.remove();
}

export function getVitalsStatus(paS, paD, fc) {
    const paMedia = (paS + 2 * paD) / 3;
    let status = 'stable';
    let message = 'Sinais Vitais Estáveis.';

    if (paS < 90 || paMedia < 65) {
        status = 'hypotension';
        message = 'HIPOTENSÃO CRÍTICA (PAM baixa) - Requer intervenção imediata!';
    } else if (paS < 100) {
        status = 'warning';
        message = 'Pressão Arterial em ALERTA.';
    }
    
    if (fc > 120) {
        if (status === 'stable') status = 'warning';
        message += ' Taquicardia.';
    } else if (fc < 50) {
        if (status === 'stable') status = 'warning';
        message += ' Bradicardia.';
    }
    
    return { status, message };
}

export function recordVitals() {
    const paSistolicaInput = document.getElementById('vital-pa-sistolica');
    const paDiastolicaInput = document.getElementById('vital-pa-diastolica');
    const fcInput = document.getElementById('vital-fc');
    const frInput = document.getElementById('vital-fr');
    const spo2Input = document.getElementById('vital-spo2');
    const tempInput = document.getElementById('vital-temp');
    const notesInput = document.getElementById('vital-notes');
    
    const paSistolica = paSistolicaInput ? parseInt(paSistolicaInput.value) : null;
    const paDiastolica = paDiastolicaInput ? parseInt(paDiastolicaInput.value) : null;
    const fc = fcInput ? parseInt(fcInput.value) : null;
    const fr = frInput ? frInput.value : '';
    const spo2 = spo2Input ? spo2Input.value : '';
    const temp = tempInput ? tempInput.value : '';
    const notes = notesInput ? notesInput.value.replace(/[<>]/g, '') : '';
    
    const modalContent = document.querySelector('#vitals-modal .modal-content');
    const statusBox = document.querySelector('#vitals-modal .vitals-status');
    if (statusBox) statusBox.remove();

    if (paSistolica && (paSistolica < 30 || paSistolica > 300)) { showTransientAlert("PA Sistólica inválida. Valores válidos: 30-300 mmHg", "warning"); return; }
    if (paDiastolica && (paDiastolica < 20 || paDiastolica > 200)) { showTransientAlert("PA Diastólica inválida. Valores válidos: 20-200 mmHg", "warning"); return; }
    if (fc && (fc < 0 || fc > 300)) { showTransientAlert("FC inválida. Valores válidos: 0-300 bpm", "warning"); return; }
    if (!paSistolica && !fc && !fr && !spo2 && !temp) { showTransientAlert("Preencha pelo menos um sinal vital para registrar.", "warning"); return; }
    
    let vitalText = `SINAIS VITAIS: `;
    let type = 'normal';
    
    if (paSistolica && paDiastolica && fc) {
        const statusData = getVitalsStatus(paSistolica, paDiastolica, fc);
        vitalText += `PA: ${paSistolica}x${paDiastolica} mmHg; FC: ${fc} bpm; `;
        if (statusData.status === 'hypotension') {
            type = 'critical';
            const hypoMsg = '🚨 HIPOTENSÃO GRAVE detectada! Reavalie o paciente e trate a causa!';
            if (typeof window.addEvent === 'function') window.addEvent(hypoMsg, 'critical');
            if (typeof window.showTransientAlert === 'function') window.showTransientAlert(hypoMsg, 'danger', 5000);
        } else if (statusData.status === 'warning') { type = 'warning'; }
        const newStatusBox = document.createElement('div');
        newStatusBox.className = `vitals-status ${statusData.status}`;
        newStatusBox.textContent = statusData.message;
        if (modalContent) modalContent.insertBefore(newStatusBox, document.getElementById('record-vitals-btn'));
    } else {
        if (paSistolica || paDiastolica) vitalText += `PA: ${paSistolica || 'N/I'}x${paDiastolica || 'N/I'} mmHg; `;
        if (fc) vitalText += `FC: ${fc} bpm; `;
    }
    if (fr) vitalText += `FR: ${fr} ipm; `;
    if (spo2) vitalText += `SpO₂: ${spo2}%; `;
    if (temp) vitalText += `Temp: ${temp}°C; `;
    if (notes) vitalText += `(Obs: ${notes})`;

    vitalText = vitalText.trim();
    if (vitalText.endsWith(';')) vitalText = vitalText.slice(0, -1);
    
    if (state.pcrActive && type === 'critical') {
        if (typeof window.addEvent === 'function') window.addEvent(vitalText, 'critical');
    } else if (state.pcrActive) {
        if (typeof window.addEvent === 'function') window.addEvent(vitalText, 'normal');
    } else { showTransientAlert("Sinais vitais registrados. Inicie um atendimento de PCR para salvá-los no log.", "info"); }
    
    if (!state.pcrActive || state.roscAchieved) { closeModal('vitals-modal'); return; }
    
    setTimeout(() => { 
        closeModal('vitals-modal'); 
        showTransientAlert('Sinais Vitais registrados com sucesso!', 'success');
    }, 500);
}