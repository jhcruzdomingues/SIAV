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

const directMessages = new Map([
    ['SUPORTE BÁSICO — AVALIAR RITMO E INICIAR RCP', 'Avalie o ritmo e inicie a RCP.'],
    ['AVALIAR RITMO — MINIMIZAR PAUSA', 'Avalie o ritmo e minimize a pausa.'],
    ['RCP DE ALTA QUALIDADE — 100 A 120 BPM', 'Mantenha RCP de alta qualidade — 100 a 120/min.'],
    ['RCP CONTÍNUA — BUSCAR CAUSAS (5H/5T)', 'Mantenha a RCP e busque as causas reversíveis (5H/5T).'],
    ['ROSC CONFIRMADO — CUIDADOS PÓS-PARADA', 'ROSC confirmado. Inicie os cuidados pós-parada.'],
    ['ATENDIMENTO SEM PCR ATIVA', 'Atendimento encerrado.']
]);
const reviewCommands = new Map([
    ['Reavaliar: percurso clínico incompleto; registrar avaliação de ritmo.', 'Reavalie o percurso clínico e registre a avaliação do ritmo antes de medicar.'],
    ['Confirmar seleção do algoritmo adulto no preparo do paciente. Não inferir o protocolo pela idade ou pelo peso.', 'Confirme o algoritmo selecionado para o paciente. Não infira o protocolo pela idade ou pelo peso.'],
    ['Reavaliar adrenalina: dados de administração incompletos ou via fora do algoritmo.', 'Reavalie a adrenalina: confira os dados da administração e a via registrada antes de nova dose.'],
    ['Reavaliar antiarrítmicos: dose tardia, histórico incompleto, outro episódio ou fármacos associados. O PDF não fundamenta uma nova dose automática.', 'Reavalie os antiarrítmicos: confira dose, horário, histórico, episódio e associações antes de nova administração.'],
    ['Duas doses já documentadas: reavaliar antes de novas doses.', 'Reavalie o antiarrítmico antes de nova dose: duas administrações já estão registradas.']
]);
const knownMedicationMessages = new Set([
    'ADRENALINA', 'AMIODARONA', 'LIDOCAÍNA', 'AMIODARONA OU LIDOCAÍNA',
    'ADRENALINA / AMIODARONA', 'ADRENALINA / LIDOCAÍNA', 'ADRENALINA / AMIODARONA OU LIDOCAÍNA'
].map(names => `${names} — CONDUTAS DO PASSO ATUAL`));

function medicationCommands(step) {
    if (step.criticalAction !== 'DRUG' || !knownMedicationMessages.has(step.message)) return [];
    const guidance = step.medicationGuidance || {};
    const due = id => guidance[id]?.status === 'due' && guidance[id].dose;
    const commands = [];
    if (due('adrenalina')) commands.push(`Administre adrenalina ${guidance.adrenalina.dose}.`);
    const alternatives = ['amiodarona', 'lidocaina'].filter(due).map(id => `${id === 'lidocaina' ? 'lidocaína' : id} ${guidance[id].dose}`);
    if (alternatives.length) commands.push(`Administre ${alternatives.join(' OU ')}.`);
    return commands;
}

// Presentation of the existing sequence only. Never predict the next rhythm,
// shock, medication or dose: those require their real recorded assessment.
function nextAction(snapshot, step) {
    if (!snapshot.pcrActive) return '';
    if (snapshot.roscAchieved || snapshot.clinical?.status === 'rosc') return 'Se a PCR recorrer, confirme a recorrência no aplicativo.';
    if (['rhythm_check', 'shock_advised'].includes(snapshot.currentPhase)) return 'Desfibrile se indicado e retome as compressões.';
    if (snapshot.currentPhase === 'preparation') return 'Siga a conduta do ritmo confirmado.';
    if (snapshot.currentPhase === 'compressions') return 'Reavalie o ritmo ao fim do ciclo.';
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
    setText(document.getElementById('ac-primary-text'), 'Confira o protocolo antes de prosseguir.');
    setText(document.getElementById('ac-safety-note'), 'Orientação indisponível. Revise os dados registrados.');
    show(document.getElementById('ac-safety-note'), true);
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
        // Only doses already marked due by the unchanged evaluator become
        // administration commands. There is no new clinical eligibility here.
        const commands = snapshot.pcrActive ? medicationCommands(step) : [];
        const reviews = [...new Set(Object.values(step.medicationGuidance || {})
            .filter(entry => entry.status === 'review' && entry.reason)
            .map(entry => reviewCommands.get(entry.reason) || entry.reason))];
        const isReview = step.message === 'REAVALIAR CONDUTA — SEM DOSE AUTOMÁTICA';
        const primary = !snapshot.pcrActive ? 'Atendimento encerrado.' : commands.length ? commands.join('\n') : isReview && reviews.length
            ? reviews[0] : directMessages.get(step.message) || step.message;
        setText(document.getElementById('ac-primary-text'), primary);
        const next = nextAction(snapshot, step);
        setText(document.getElementById('ac-next-text'), next);
        const nextPanel = document.getElementById('ac-next-step');
        if (nextPanel) nextPanel.hidden = !next;
        const warnings = (step.style === 'warning' || step.criticalAction === 'DRUG')
            ? reviews.filter(command => command !== primary) : [];
        if (commands.length && snapshot.currentPhase === 'compressions' && !compressionCycle.paused) warnings.unshift('Mantenha a RCP de alta qualidade.');
        if (step.message === 'RCP DE ALTA QUALIDADE — 100 A 120 BPM') warnings.push('Minimize as interrupções e trate as causas reversíveis.');
        if (step.message === 'RCP CONTÍNUA — BUSCAR CAUSAS (5H/5T)' || snapshot.currentPhase === 'preparation') warnings.push('Minimize as interrupções.');
        const adrenaline = step.medicationGuidance?.adrenalina;
        if (adrenaline?.status === 'due' && adrenaline.reason) {
            const interval = adrenaline.reason.match(/a cada ([^.,]+ min)/);
            const antiDue = ['amiodarona', 'lidocaina'].some(id => step.medicationGuidance?.[id]?.status === 'due');
            warnings.push(interval ? `Respeite o intervalo de ${interval[1]} entre as doses${antiDue ? ' de adrenalina' : ''}.` : adrenaline.reason);
        }
        const antiDue = ['amiodarona', 'lidocaina'].some(id => step.medicationGuidance?.[id]?.status === 'due');
        if (antiDue) warnings.push('Não associe amiodarona e lidocaína. Mantenha o fármaco escolhido.');
        // Unknown/new protocol messages remain fully visible, not reinterpreted.
        if (!commands.length && !isReview && !directMessages.has(step.message)) {
            if (step.dose) warnings.push(step.dose);
            if (step.details) warnings.push(step.details);
        }
        if (!snapshot.pcrActive) warnings.length = 0;
        const safety = document.getElementById('ac-safety-note');
        setText(safety, [...new Set(warnings)].join('\n'));
        show(safety, warnings.length > 0);

        setText(document.getElementById('ac-cycle-counter'), `CICLO ${compressionCycle.cycleCount}`);
        guidanceFailureReported = false;
        return true;
    } catch {
        renderUnavailable();
        return false;
    }
}
