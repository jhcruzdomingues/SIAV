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

    // ESTADO PADRÃO: RCP de Alta Qualidade
    let nextStep = { message: 'RCP DE ALTA QUALIDADE — 100 A 120 BPM', style: 'success', icon: 'fas fa-heartbeat', criticalAction: null, details: 'Profundidade de 5cm e retorno total do tórax. Revezar compressor a cada ciclo.', dose: '', route: 'EV/IO' };

    if (currentPhase === 'preparation') {
        nextStep.message = 'SUPORTE BÁSICO — INICIAR ATENDIMENTO'; nextStep.style = 'primary'; nextStep.icon = 'fas fa-hand-rock'; nextStep.details = 'Segurança da cena, checar responsividade, chamar ajuda, checar pulso/respiração e iniciar RCP 30:2.';
        return nextStep;
    }

    if (currentPhase === 'rhythm_check' || currentPhase === 'shock_advised') {
        nextStep.message = 'PAUSA DE RCP — AVALIAR RITMO E PULSO'; nextStep.style = 'danger'; nextStep.icon = 'fas fa-exclamation-triangle'; nextStep.details = isShockable ? 'Ritmo CHOCÁVEL: Preparar desfibrilador, afastar todos e chocar.' : 'Ritmo NÃO-CHOCÁVEL: Retomar compressões imediatamente.'; nextStep.criticalAction = isShockable ? 'SHOCK' : null;
        return nextStep;
    }

    if (isShockable === undefined) {
        nextStep.message = 'AVALIAÇÃO INICIAL — AGUARDANDO RITMO'; nextStep.style = 'warning'; nextStep.icon = 'fas fa-hourglass'; nextStep.details = ''; return nextStep;
    }

    // 1️⃣ AVALIAÇÃO DE DROGAS (Substitui o estado de RCP se for urgente)
    let drugAction = null;

    // A. ADRENALINA
    if (medAdrenalineCount === 0) {
        if (!isShockable && currentCycle >= 1) {
            drugAction = { message: 'ADRENALINA — ADMINISTRAR IMEDIATAMENTE', dose: '1 mg EV/IO', details: 'Na AESP/Assistolia, administre o mais rápido possível.' };
        } else if (isShockable && currentCycle >= 3) {
            drugAction = { message: 'ADRENALINA — ADMINISTRAR AGORA', dose: '1 mg EV/IO', details: 'Em FV/TVSP, a primeira dose é feita após o 2º choque.' };
        }
    } else {
        const adrenalineStatus = getMedicationDueStatus('Adrenalina', 180, medications, currentTime);
        if (adrenalineStatus.isDue) {
            drugAction = { message: 'ADRENALINA — DOSE DEVIDA', dose: '1 mg EV/IO', details: 'Repetir a cada 3 a 5 minutos durante a PCR.' };
        }
    }

    // B. AMIODARONA / LIDOCAÍNA (Só avalia se não houver Adrenalina pendente)
    if (!drugAction && isShockable && (currentPhase === 'compressions' || currentPhase === 'compression')) {
        if (shockCount >= 2 && medAntiarrhythmicCount === 0) {
            drugAction = { message: 'AMIODARONA — PREPARAR E ADMINISTRAR', dose: '300 mg EV/IO', details: 'Indicada para FV/TVSP refratária após o 2º choque.' };
        } else if (shockCount >= 3 && medAntiarrhythmicCount === 1) {
            drugAction = { message: 'AMIODARONA — 2ª DOSE DEVIDA', dose: '150 mg EV/IO', details: 'Dose adicional se a FV/TVSP persistir após novos choques.' };
        }
    }

    if (drugAction) {
        nextStep.message = drugAction.message;
        nextStep.style = 'danger';
        nextStep.icon = 'fas fa-syringe';
        nextStep.criticalAction = 'DRUG';
        nextStep.dose = drugAction.dose;
        nextStep.details = drugAction.details;
        return nextStep;
    }

    // 2️⃣ MENSAGENS ESPECÍFICAS DE RCP (Se não há droga pendente)
    if (!isShockable && (currentPhase === 'compressions' || currentPhase === 'compression')) {
        nextStep.message = 'RCP CONTÍNUA — BUSCAR CAUSAS (5H/5T)';
        nextStep.style = 'warning';
        nextStep.icon = 'fas fa-list-check';
        nextStep.details = 'Considere Via Aérea Avançada e Capnografia. Identifique e trate causas reversíveis.';
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