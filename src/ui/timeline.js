import { state } from '../config/state.js';

export function addEvent(text, type = 'normal') {
    if (!text || typeof text !== 'string') {
        console.error('addEvent: texto inválido', text);
        return;
    }
    
    const validTypes = ['normal', 'critical', 'warning', 'success'];
    const safeType = validTypes.includes(type) ? type : 'normal';
    
    const pcrTimer = document.getElementById('pcr-timer');
    const pcrElapsed = pcrTimer?.textContent || '00:00';
    
    const sanitizedText = text.replace(/[\uD800-\uDBFF\uDC00-\uDFFF]/g, '').trim();

    const event = {
        time: pcrElapsed,
        text: sanitizedText,
        type: safeType,
        timestamp: Date.now()
    };    
    state.events.unshift(event);
    updateTimeline();
}

export function getIconForEvent(text) {
    if (text.includes('INÍCIO DE RCP')) return 'fas fa-hand-rock';
    if (text.includes('CHOQUE')) return 'fas fa-bolt';
    if (text.includes('MEDICAÇÃO')) return 'fas fa-syringe';
    if (text.includes('Ritmo de Perfusão')) return 'fas fa-heart-circle-check';
    if (text.includes('Fibrilação Ventricular') || text.includes('TVSP')) return 'fas fa-chart-line';
    if (text.includes('SINAIS VITAIS')) return 'fas fa-stethoscope';
    if (text.includes('ANOTAÇÃO CLÍNICA')) return 'fas fa-comment-dots';
    if (text.includes('PAUSA DE RCP') || text.includes('Ritmo/Pulso')) return 'fas fa-pause';
    if (text.includes('FINALIZAÇÃO')) return 'fas fa-flag-checkered';
    return 'fas fa-circle-info';
}

export function updateTimeline() {
    const container = document.getElementById('timeline-events');
    if (!container) return;
    
    const fragment = document.createDocumentFragment();
    
    state.events.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.className = `event-item event-${event.type}`;
        const iconClass = getIconForEvent(event.text);
        eventElement.innerHTML = `<div class="event-time">${event.time}</div><div class="event-text"><i class="${iconClass}" style="margin-right: 8px;"></i>${event.text}</div>`;
        fragment.appendChild(eventElement);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}