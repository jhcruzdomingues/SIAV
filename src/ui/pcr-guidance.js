import { state, compressionCycle } from '../config/state.js';
import { getClinicalSnapshot, isClinicalArrestActive } from '../pcr/clinical.js';
import { getProtocolNextStep } from '../protocols/medical.js';
import { updateAdrenalineTimerDisplay } from './pcr-adrenaline-timer.js';

export function feedbackCritico(btnId) {
    if ('vibrate' in navigator) navigator.vibrate([120, 60, 120]);
    if (btnId) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.classList.remove('feedback-critico-anim');
            void btn.offsetWidth; // force reflow
            btn.classList.add('feedback-critico-anim');
        }
    }
}

const setText = (node, value = '') => {
    if (node && node.textContent !== value) node.textContent = value;
};
const show = (node, visible, display = 'block') => {
    if (node) node.style.display = visible ? display : 'none';
};
let guidanceFailureReported = false;

function conciseInstruction(step) {
    if (step.criticalAction === 'DRUG') {
        const due = Object.entries(step.medicationGuidance || {}).filter(([, entry]) => entry.status === 'due').map(([id]) => id);
        const epi = due.includes('adrenalina'), anti = due.some(id => ['amiodarona', 'lidocaina'].includes(id));
        if (epi && anti) return 'Medicações indicadas';
        if (epi) return 'Adrenalina indicada';
        if (anti) return 'Antiarrítmico indicado';
    }
    // Copy changes only when the existing protocol emits this exact message.
    // An unknown/new clinical message is displayed in full, never guessed.
    const messages = new Map([
        ['SUPORTE BÁSICO — AVALIAR RITMO E INICIAR RCP', 'Iniciar RCP e avaliar ritmo'],
        ['AVALIAR RITMO — MINIMIZAR PAUSA', 'Avaliar ritmo. Minimizar pausa.'],
        ['RCP DE ALTA QUALIDADE — 100 A 120 BPM', 'RCP de alta qualidade — 100 a 120/min'],
        ['RCP CONTÍNUA — BUSCAR CAUSAS (5H/5T)', 'Manter RCP e buscar causas (5H/5T)'],
        ['REAVALIAR CONDUTA — SEM DOSE AUTOMÁTICA', 'Reavaliar conduta']
    ]);
    return messages.get(step.message) || step.message;
}

// Presentation of the existing sequence only. Never predict the next rhythm,
// shock, medication or dose: those require their real recorded assessment.
function nextAction(snapshot, step) {
    if (snapshot.roscAchieved || snapshot.clinical?.status === 'rosc') return step.details;
    if (!snapshot.pcrActive) return '';
    if (['rhythm_check', 'shock_advised'].includes(snapshot.currentPhase)) return step.details;
    if (snapshot.currentPhase === 'preparation') return 'Seguir a conduta do ritmo confirmado.';
    if (Object.values(step.medicationGuidance || {}).some(entry => entry.status === 'review')) return 'Conferir dados antes de novas doses.';
    if (snapshot.currentPhase === 'compressions') return 'Reavaliar ritmo ao fim do ciclo.';
    return '';
}

function updateCompressionControls() {
    let phaseClass = 'status-preparation', badge = 'PREPARAÇÃO', icon = 'fas fa-heartbeat';
    let action = 'INICIAR COMPRESSÕES', disabled = false;
    switch (compressionCycle.currentPhase) {
        case 'rosc': badge = 'ROSC'; action = 'ROSC — PCR INTERROMPIDA'; disabled = true; break;
        case 'compressions':
            phaseClass = 'status-compressions'; badge = compressionCycle.paused ? 'PAUSADO' : 'RCP ATIVA'; icon = 'fas fa-hands-helping';
            action = compressionCycle.paused ? 'RETOMAR COMPRESSÕES' : 'PAUSAR COMPRESSÕES';
            disabled = false; break;
        case 'rhythm_check': phaseClass = 'status-rhythm'; badge = 'AVALIAÇÃO'; icon = 'fas fa-wave-square'; action = 'RETOMAR COMPRESSÕES'; break;
        case 'shock_advised': phaseClass = 'status-shock'; badge = 'AFASTAR!'; icon = 'fas fa-bolt'; action = 'RETOMAR COMPRESSÕES'; break;
    }
    if (!isClinicalArrestActive()) {
        disabled = true;
        if (!state.roscAchieved) { badge = 'ENCERRADO'; action = 'ATENDIMENTO ENCERRADO'; phaseClass = 'status-preparation'; }
    }
    const button = document.getElementById('compressions-btn');
    const paused = isClinicalArrestActive() && compressionCycle.paused && compressionCycle.currentPhase !== 'preparation';
    const running = isClinicalArrestActive() && compressionCycle.currentPhase === 'compressions' && !compressionCycle.paused;
    if (button) {
        if (button.dataset.actionText !== action || !button.querySelector('.compression-action-icon')) {
            const ns = 'http://www.w3.org/2000/svg';
            const symbol = document.createElementNS(ns, 'svg'); symbol.setAttribute('viewBox', '0 0 24 24');
            symbol.setAttribute('aria-hidden', 'true'); symbol.setAttribute('focusable', 'false'); symbol.classList.add('compression-action-icon');
            const shape = document.createElementNS(ns, 'path');
            shape.setAttribute('d', running ? 'M6 5h4v14H6zM14 5h4v14h-4z' : 'M8 5v14l11-7z');
            symbol.appendChild(shape);
            const label = document.createElement('span'); label.className = 'compression-action-text'; label.textContent = action;
            button.textContent = ''; button.append(symbol, label); button.dataset.actionText = action;
        }
        button.disabled = disabled; button.style.removeProperty('background'); button.setAttribute('aria-label', action);
        button.dataset.compressionState = paused ? 'paused' : running ? 'running' : disabled ? 'inactive' : 'ready';
        button.setAttribute('aria-pressed', String(running));
        if (paused) button.setAttribute('aria-describedby', 'compression-resume-alert');
        else button.removeAttribute('aria-describedby');
    }
    const resumeAlert = document.getElementById('compression-resume-alert');
    if (resumeAlert) resumeAlert.hidden = !paused;
    const restart = document.getElementById('restart-pcr-btn');
    if (restart) restart.hidden = !(state.pcrActive && state.roscAchieved);
    return { phaseClass, badge, icon };
}

function renderUnavailable() {
    updateCompressionControls();
    const center = document.getElementById('pcr-action-center');
    if (center) center.className = 'pcr-action-center status-warning';
    setText(document.getElementById('ac-status-badge'), 'REVISÃO NECESSÁRIA');
    setText(document.getElementById('ac-primary-text'), 'Orientação indisponível');
    setText(document.getElementById('ac-dose-text'), '');
    show(document.getElementById('ac-dose-container'), false);
    setText(document.getElementById('ac-safety-note'), 'Confira o protocolo e os dados registrados antes de seguir a orientação.');
    show(document.getElementById('ac-safety-note'), true);
    setText(document.getElementById('ac-details-text'), '');
    const context = document.getElementById('ac-context-details');
    if (context) context.hidden = true;
    const next = document.getElementById('ac-next-step');
    if (next) next.hidden = true;
    setText(document.getElementById('ac-next-text'), '');
    if (!guidanceFailureReported) console.error('Falha ao atualizar a orientação da PCR.');
    guidanceFailureReported = true;
}

export function updatePcrGuidance() {
    try {
        const center = document.getElementById('pcr-action-center');
        const visual = updateCompressionControls();
        if (!center) return true;
        const snapshot = getClinicalSnapshot();
        updateAdrenalineTimerDisplay(snapshot);
        const step = getProtocolNextStep(snapshot);
        if (step.criticalAction === 'DRUG') {
            visual.phaseClass = 'status-danger'; visual.badge = 'AÇÃO CRÍTICA'; visual.icon = 'fas fa-syringe';
        } else if (step.style === 'warning') visual.phaseClass = 'status-warning';
        const className = `pcr-action-center ${visual.phaseClass}`;
        if (center.className !== className) center.className = className;
        setText(document.getElementById('ac-status-badge'), visual.badge);
        const icon = document.getElementById('ac-icon');
        if (icon && icon.dataset.icon !== visual.icon) {
            const glyph = document.createElement('i'); glyph.className = visual.icon; glyph.setAttribute('aria-hidden', 'true');
            icon.textContent = ''; icon.appendChild(glyph); icon.dataset.icon = visual.icon;
        }
        // Eligibility, drug names, doses and routes still come from the protocol.
        setText(document.getElementById('ac-primary-text'), conciseInstruction(step));
        const next = nextAction(snapshot, step);
        setText(document.getElementById('ac-next-text'), next);
        const nextPanel = document.getElementById('ac-next-step');
        if (nextPanel) nextPanel.hidden = !next;
        const dose = document.getElementById('ac-dose-container');
        setText(document.getElementById('ac-dose-text'), (step.dose || '').replace(/; /g, '\n').replace(/ OU /g, '\nOU '));
        show(dose, !!step.dose, 'flex');

        const guidance = Object.values(step.medicationGuidance || {});
        const warnings = (step.style === 'warning' || step.criticalAction === 'DRUG')
            ? guidance.filter(entry => entry.status === 'review').map(entry => entry.reason).filter(Boolean) : [];
        const adrenaline = step.medicationGuidance?.adrenalina;
        if (adrenaline?.status === 'due' && adrenaline.reason) {
            const interval = adrenaline.reason.match(/a cada ([^.,]+ min)/);
            warnings.push(interval ? `Intervalo: ${interval[1]}.` : adrenaline.reason);
        }
        const antiDue = ['amiodarona', 'lidocaina'].some(id => step.medicationGuidance?.[id]?.status === 'due');
        if (antiDue && step.details) {
            const firstSentence = step.details.split('. ')[0];
            warnings.unshift(firstSentence.endsWith('.') ? firstSentence : firstSentence + '.');
            const reasons = ['amiodarona', 'lidocaina'].map(id => step.medicationGuidance?.[id])
                .filter(entry => entry?.status === 'due' && entry.reason).map(entry => entry.reason);
            for (const reason of new Set(reasons)) warnings.push(reason.includes('mantendo o fármaco registrado') ? 'Manter o fármaco registrado.' : reason);
        }
        const safety = document.getElementById('ac-safety-note');
        setText(safety, [...new Set(warnings)].join('\n'));
        show(safety, warnings.length > 0);

        const context = document.getElementById('ac-context-details');
        if (context) {
            const encounter = String(state.pcrStartTime);
            if (context.dataset.encounter !== encounter) { context.open = false; context.dataset.encounter = encounter; }
            context.hidden = !step.details;
        }
        const fullContext = [step.message, step.details].filter(Boolean).join('\n');
        setText(document.getElementById('ac-details-text'), fullContext);
        show(document.getElementById('ac-details-container'), !!fullContext, 'flex');
        setText(document.getElementById('ac-cycle-counter'), `CICLO ${compressionCycle.cycleCount}`);
        guidanceFailureReported = false;
        return true;
    } catch {
        renderUnavailable();
        return false;
    }
}
