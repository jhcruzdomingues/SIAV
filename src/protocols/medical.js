// ==========================================
// CÉREBRO MÉDICO - PROTOCOLOS AHA 2025
// ==========================================

export function getCalculatedPediatricValues(weight) {
    // Trava de segurança: Peso mínimo de 1kg para cálculos
    const safeWeight = Math.max(1, weight);
    return {
        adrenalina: (safeWeight * 0.01).toFixed(2),
        amiodarona: (safeWeight * 5).toFixed(0),
        lidocaina: (safeWeight * 1).toFixed(1),
        shock1: (safeWeight * 2).toFixed(0),
        shock2: (safeWeight * 4).toFixed(0)
    };
}

export function getShockRecommendation(patientData, shockCount, rhythmType) {
    const age = parseInt(patientData.age) || 30;
    const weight = parseInt(patientData.weight) || 70;
    
    // Regra AHA: Considerar pediátrico se < 8 anos ou < 30kg
    const isPediatric = age < 8 || weight < 30;

    const norm = ('' + (rhythmType || '')).toLowerCase();
    const isShockable = /fibril|fv|taquicardia|tvsp|tv\s?(sem|s\/)/i.test(norm);

    if (isShockable) {
        if (isPediatric) {
            const values = getCalculatedPediatricValues(weight);
            const isFirstShock = shockCount === 0;

            const recommendedEnergy = isFirstShock ? values.shock1 : values.shock2;
            const doseDetails = isFirstShock ? '2 J/kg (1ª Dose)' : '4 J/kg (2ª Dose ou superior)';

            const energies = [`${values.shock1} J`, `${values.shock2} J`];
            if (parseInt(values.shock2) < 100) energies.push('100 J');

            return { recommendedEnergy, energies, doseDetails, isShockable: true };
        }

        // Regra Adulto - AHA 2025
        return {
            recommendedEnergy: '200',
            energies: ['120 J', '150 J', '200 J', '360 J'],
            doseDetails: 'Dose padrão adulto bifásico (AHA 2025)',
            isShockable: true
        };
    }

    // Ritmos Não-Chocáveis (Assistolia / AESP)
    return { recommendedEnergy: 'N/A', energies: [], doseDetails: 'Ritmo Não Chocável', isShockable: false };
}

export function getLastMedicationTime(medicationName, medications, currentTime = Date.now()) {
    const lastMeds = medications.filter(m => m.name.includes(medicationName));
    if (lastMeds.length === 0) return null;
    const lastMed = lastMeds[lastMeds.length - 1];
    if (!lastMed.timestamp) return null;
    return (currentTime - lastMed.timestamp) / 1000;
}

export function getMedicationDueStatus(medicationName, intervalSeconds, medications, currentTime = Date.now()) {
    const timeSinceLast = getLastMedicationTime(medicationName, medications, currentTime);
    
    if (timeSinceLast === null) {
        return {
            isDue: true,
            secondsUntilDue: 0,
            message: `${medicationName} nunca foi administrada. ADMINISTRE AGORA!`
        };
    }
    
    const secondsUntilDue = intervalSeconds - timeSinceLast;
    
    if (secondsUntilDue <= 0) {
        return {
            isDue: true,
            secondsUntilDue: 0,
            message: `${medicationName} está DEVIDA agora!`
        };
    } else {
        const minutesUntilDue = Math.ceil(secondsUntilDue / 60);
        return {
            isDue: false,
            secondsUntilDue,
            message: `Próxima ${medicationName} em ${minutesUntilDue} min (${Math.floor(timeSinceLast / 60)} min da última dose)`
        };
    }
}

export function getProtocolNextStep(pcrState, currentTime = Date.now()) {
    const { currentPhase, isShockable, medications, currentCycle, shockCount, elapsedSeconds } = pcrState;
    
    const medAdrenalineCount = medications.filter(m => m.name.includes('Adrenalina')).length;
    const medAntiarrhythmicCount = medications.filter(m => m.name.includes('Amiodarona') || m.name.includes('Lidocaína')).length;

    let nextStep = { message: 'Continuar RCP de Alta Qualidade', style: 'success', icon: 'fas fa-heartbeat', criticalAction: null, details: '', dose: '', route: 'EV/IO' };

    if (currentPhase === 'preparation') {
        nextStep.message = 'Iniciar Atendimento de PCR'; nextStep.style = 'primary'; nextStep.icon = 'fas fa-hand-rock'; nextStep.details = '<div class="protocol-checklist"><div class="protocol-step"><i class="fas fa-shield-alt"></i> Segurança da cena</div><div class="protocol-step"><i class="fas fa-user-injured"></i> Verificar responsividade</div><div class="protocol-step"><i class="fas fa-phone-alt"></i> Ativar emergência (192)</div><div class="protocol-step"><i class="fas fa-hand-holding-medical"></i> Verificar pulso (≤10s)</div><div class="protocol-step"><i class="fas fa-heartbeat"></i> Iniciar RCP imediatamente</div></div>';
        return nextStep;
    }

    if (currentPhase === 'rhythm_check' || currentPhase === 'shock_advised') {
        nextStep.message = 'Pausa: avaliar ritmo e pulso (≤10s)'; nextStep.style = 'danger'; nextStep.icon = 'fas fa-exclamation-triangle'; nextStep.details = isShockable ? 'Chocável — preparar desfibrilador.' : 'Não-chocável — retomar compressões.'; nextStep.criticalAction = isShockable ? 'SHOCK' : null;
        return nextStep;
    }

    if (isShockable === undefined) {
        nextStep.message = 'Aguardando checagem de ritmo'; nextStep.style = 'warning'; nextStep.icon = 'fas fa-hourglass'; return nextStep;
    }

    // 1️⃣ ADRENALINA
    if (medAdrenalineCount === 0) {
        let shouldGiveAdrenaline = false, adrenalineReason = '';
        if (!isShockable && currentCycle >= 1) { shouldGiveAdrenaline = true; adrenalineReason = '<div class="alert-box alert-danger"><div class="alert-content"><div class="alert-title"><i class="fas fa-exclamation-triangle"></i> AESP/Assistolia</div><div class="alert-text">RCP contínua + Identificar 5 H\'s e 5 T\'s</div></div></div>'; }
        else if (isShockable && currentCycle >= 3) { shouldGiveAdrenaline = true; adrenalineReason = '<div class="alert-box alert-danger"><div class="alert-content"><div class="alert-title"><i class="fas fa-heartbeat"></i> FV/TVSP Persistente</div><div class="alert-text">Após 2º choque • Considerar Amiodarona</div></div></div>'; }
        else if (isShockable && currentCycle >= 1 && shockCount < 2) { adrenalineReason = `<div class="alert-box alert-danger"><div class="alert-content"><div class="alert-title"><i class="fas fa-clock"></i> FV/TVSP Detectada</div><div class="alert-text">Aguardar 2 choques (${shockCount}/2)</div></div></div>`; }
        
        if (shouldGiveAdrenaline) {
            nextStep.message = !isShockable ? '🚨 Adrenalina — URGENTE (1º CICLO)' : 'Adrenalina — ADMINISTRAR AGORA'; nextStep.style = 'danger'; nextStep.icon = 'fas fa-syringe'; nextStep.criticalAction = 'DRUG'; nextStep.dose = !isShockable ? '1 mg EV/IO - IMEDIATO no 1º ciclo. Repetir a cada 3-5 min.' : '1 mg EV/IO - administrar agora (após 2º choque). Repetir a cada 3-5 min.'; nextStep.details = adrenalineReason;
        } else if (adrenalineReason) {
            nextStep.message = 'Adrenalina: aguardar indicação'; nextStep.style = 'warning'; nextStep.icon = 'fas fa-hourglass-half'; nextStep.details = adrenalineReason;
        }
    } else {
        const adrenalineStatus = getMedicationDueStatus('Adrenalina', 180, medications, currentTime);
        if (adrenalineStatus.isDue) { nextStep.message = 'Adrenalina — DOSE DEVIDA'; nextStep.style = 'danger'; nextStep.icon = 'fas fa-syringe'; nextStep.criticalAction = 'DRUG'; nextStep.dose = '1 mg EV/IO - administrar agora. Repetir a cada 3-5 min.'; }
        else { nextStep.message = `⏰ ${adrenalineStatus.message}`; nextStep.style = 'warning'; nextStep.icon = 'fas fa-hourglass-half'; nextStep.details = `Próxima dose em ~${Math.ceil(adrenalineStatus.secondsUntilDue / 60)} minuto(s)`; }
    }

    // 2️⃣ AMIODARONA (Correção do bug do singular/plural aqui)
    if (isShockable && (currentPhase === 'compressions' || currentPhase === 'compression') && nextStep.criticalAction !== 'DRUG') {
        if (shockCount >= 2 && medAntiarrhythmicCount === 0) { nextStep.message = 'Amiodarona 300 mg — CONSIDERAR/ADMINISTRAR'; nextStep.style = 'primary'; nextStep.icon = 'fas fa-syringe'; nextStep.criticalAction = 'DRUG'; nextStep.dose = '300 mg IV/IO'; nextStep.details = 'FV/TVSP persistente após 2 choques. Administrar durante compressões.'; }
        else if (shockCount >= 3 && medAntiarrhythmicCount === 1) { nextStep.message = 'Amiodarona 150 mg — CONSIDERAR'; nextStep.style = 'warning'; nextStep.icon = 'fas fa-syringe'; nextStep.criticalAction = 'DRUG'; nextStep.dose = '150 mg IV/IO'; nextStep.details = 'Se FV/TVSP persistir após choques adicionais.'; }
    }

    if (nextStep.message === 'Continuar RCP de Alta Qualidade') {
        if (!isShockable && (currentPhase === 'compressions' || currentPhase === 'compression')) { nextStep.message = 'Não-chocável: investigar causas (5H/5T)'; nextStep.style = 'warning'; nextStep.icon = 'fas fa-list-check'; nextStep.details = '5H: Hipovolemia, Hipóxia, Acidose, Hipo/HiperK, Hipotermia. 5T: Tamponamento, Tensão, Toxinas, Trombose, Trauma.'; }
        else if (currentPhase === 'compressions' || currentPhase === 'compression') { nextStep.message = '✓ MANTENHA RCP de Alta Qualidade'; nextStep.style = 'success'; nextStep.icon = 'fas fa-heartbeat'; nextStep.details = `Ciclo ${currentCycle} (${currentCycle * 2}min): Próxima verificação de ritmo em ~2 minutos`; }
    }

    return nextStep;
}

export function calculateGlasgow(ocular, verbal, motora) {
    const isValid = ocular > 0 && verbal > 0 && motora > 0;
    if (!isValid) {
        return { score: null, severity: 'Selecione os três critérios', color: 'primary' };
    }

    const score = ocular + verbal + motora;
    let severity = '';
    let color = 'primary';

    if (score >= 13) {
        severity = 'Traumatismo Cranioencefálico (TCE) Leve';
        color = 'success';
    } else if (score >= 9) {
        severity = 'TCE Moderado';
        color = 'warning';
    } else {
        severity = 'TCE Grave (Intubação Considerada)';
        color = 'danger';
    }

    return { score, severity, color };
}