import { state } from '../config/state.js';

export const PLAN_PRIORITY = {
    'free': 0,
    'student': 1,
    'professional': 2
};

export const ACCESS_LEVELS = {
    'log_history': 'free',
    'quiz_simulations': 'free',
    'study_review': 'student',
    'advanced_dashboard': 'professional',
    'notes_logging': 'professional',
    'med_logging': 'professional',
    'pdf_download': 'student'
};

export function showUpgradeModal(requiredPlan) {
    if (typeof window.openPlansModal === 'function') {
        window.openPlansModal();
    } else {
        const modal = document.getElementById('upgrade-modal');
        const title = document.getElementById('upgrade-plan-title');
        const requiredLevelText = document.getElementById('required-level');
        const restrictionText = document.getElementById('restriction-text');
        
        if (!modal || !title) return;

        let planInfo = {};

        switch (requiredPlan) {
            case 'student':
                planInfo = { title: "ESTUDANTE (R$ 9,90/mês)", level: "Estudante", restriction: "Esta funcionalidade (Revisão, Simulado e PDFs) é exclusiva para assinantes dos planos Estudante e Profissional.", color: 'var(--success)' };
                break;
            case 'professional':
                planInfo = { title: "PROFISSIONAL (R$ 19,90/mês)", level: "Profissional", restriction: "Esta funcionalidade (Log de Atendimento/Salvar Dados) é exclusiva para o Plano Profissional.", color: 'var(--danger)' };
                break;
            default:
                return;
        }

        title.textContent = `🚨 Upgrade Necessário: ${planInfo.title}`;
        if (requiredLevelText) requiredLevelText.textContent = planInfo.level;
        if (restrictionText) restrictionText.textContent = planInfo.restriction;
        title.style.color = planInfo.color;

        modal.classList.add('show');
    }
}

export function checkAccess(featureKey, requireUpgradeModal = true) {
    if (!state.currentUser.isLoggedIn && ACCESS_LEVELS[featureKey] !== 'free') {
        if (requireUpgradeModal) {
            alert("Acesso restrito. Por favor, faça Login para continuar."); 
            if (typeof window.showProfileModal === 'function') window.showProfileModal();
        }
        return false;
    }
    
    const requiredPlan = ACCESS_LEVELS[featureKey] || 'free'; 
    const userPlan = state.currentUser.plan || 'free'; 

    if ((PLAN_PRIORITY[userPlan] || 0) >= (PLAN_PRIORITY[requiredPlan] || 0)) return true;
    if (requireUpgradeModal) showUpgradeModal(requiredPlan); 
    return false;
}

export function startSubscriptionFlow() {
    if (typeof window.openPlansModal === 'function') window.openPlansModal();
}