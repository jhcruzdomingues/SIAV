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

const normalizeName = name => String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function getLastMedicationTime(medicationName, medications, currentTime = Date.now()) {
    const history = medications.filter(m => normalizeName(m.name).includes(normalizeName(medicationName)));
    if (!history.length) return null;
    const times = history.map(m => m.timestamp);
    if (times.some(t => !Number.isFinite(t) || t > currentTime)) return null;
    return (currentTime - Math.max(...times)) / 1000;
}

export function getMedicationDueStatus(medicationName, intervalSeconds, medications, currentTime = Date.now()) {
    const exists = medications.some(m => normalizeName(m.name).includes(normalizeName(medicationName)));
    const elapsed = getLastMedicationTime(medicationName, medications, currentTime);
    if (exists && elapsed === null) return { isDue: false, requiresReview: true, secondsUntilDue: null, message: 'Reavaliar: horário efetivo desconhecido.' };
    const remaining = exists ? Math.max(0, intervalSeconds - elapsed) : 0;
    return { isDue: remaining === 0, requiresReview: false, secondsUntilDue: remaining, message: remaining ? 'Aguardar intervalo de administração.' : 'Dose devida no percurso indicado.' };
}

export function getAntiarrhythmicHistory(medications) {
    return Object.fromEntries(['amiodarona', 'lidocaina'].map(id => [id,
        (Array.isArray(medications) ? medications : []).filter(m => m && normalizeName(m.name).includes(id))]));
}

export function getAdultAntiarrhythmicDose(medication, doseNumber) {
    return {
        amiodarona: ['300 mg EV/IO', '150 mg EV/IO'],
        lidocaina: ['1-1.5 mg/kg EV/IO', '0.5-0.75 mg/kg EV/IO']
    }[medication]?.[doseNumber - 1] || null;
}

// One evaluator for panel and modal. Documentation of actual administrations is separate.
export function evaluateMedicationGuidance(snapshot, now = Date.now()) {
    const result = {};
    const setAll = (status, reason) => {
        for (const id of ['adrenalina', 'amiodarona', 'lidocaina']) result[id] = { status, reason };
        return result;
    };
    const { clinical, patient, medications = [], currentPhase, pcrActive, roscAchieved } = snapshot;
    if (roscAchieved || clinical?.status === 'rosc') return setAll('blocked', 'ROSC: seguir cuidados pós-parada; não recomendar medicação de PCR.');
    if (!pcrActive || clinical?.status === 'inactive') return setAll('blocked', 'Sem PCR clínica ativa.');
    if (clinical?.pendingShock) return setAll('blocked', 'Decisão de choque pendente; manter RCP enquanto prepara a desfibrilação.');
    if (clinical?.status !== 'arrest' || !Array.isArray(snapshot.medications) || clinical.historyIncomplete
        || medications.some(m => !m || typeof m.name !== 'string') || !clinical?.episodeId
        || ![4, 6, 8, 10, 11].includes(clinical.step) || !clinical.compressionId
        || snapshot.isShockable !== [4, 6, 8].includes(clinical.step)) {
        return setAll('review', 'Reavaliar: percurso clínico incompleto; registrar avaliação de ritmo.');
    }
    if (patient?.algorithm !== 'adult') {
        return setAll('review', 'Confirmar seleção do algoritmo adulto no preparo do paciente. Não inferir o protocolo pela idade ou pelo peso.');
    }
    if (!['compressions', 'compression'].includes(currentPhase)) return setAll('blocked', 'Priorizar avaliação de ritmo e desfibrilação indicada.');
    setAll('not_due', 'Sem dose automática neste passo do algoritmo.');
    const adrenaline = medications.filter(m => normalizeName(m.name).includes('adrenalina'));
    const epiEligible = [6, 8, 10, 11].includes(clinical.step);
    if (adrenaline.some(m => !Number.isFinite(m.timestamp) || m.timestamp > now || m.requiresReview
        || m.episodeId !== clinical.episodeId || m.isRetrospective !== false || m.amount !== 1 || m.unit !== 'mg' || !Number.isFinite(m.recordedAt)
        || !['EV', 'IO'].includes(m.route))) {
        result.adrenalina = { status: 'review', reason: 'Reavaliar adrenalina: dados de administração incompletos ou via fora do algoritmo.' };
    } else if (epiEligible) {
        const status = getMedicationDueStatus('Adrenalina', 180, medications, now);
        result.adrenalina = { status: status.isDue ? 'due' : 'not_due', dose: '1 mg EV/IO', amount: 1, reason: 'Adrenalina 1 mg EV/IO a cada 3–5 min, conforme o percurso.', secondsUntilDue: status.secondsUntilDue };
    }
    const history = getAntiarrhythmicHistory(medications);
    const all = [...history.amiodarona, ...history.lidocaina];
    const uncertain = all.some(m => m.episodeId !== clinical.episodeId || m.isRetrospective !== false || m.requiresReview
        || !Number.isFinite(m.timestamp) || m.timestamp > now || m.clinicalContext?.step !== 8
        || !m.clinicalContext?.compressionId || !Number.isFinite(m.recordedAt)
        || !Number.isFinite(m.amount) || m.amount <= 0 || m.unit !== 'mg' || !['EV', 'IO'].includes(m.route));
    const badAmounts = history.amiodarona.some((m, index) => m.amount !== (index === 0 ? 300 : 150))
        || history.lidocaina.some((m, index) => !Number.isFinite(m.weightAtAdministration) || m.weightAtAdministration <= 0
            || m.amount < m.weightAtAdministration * (index === 0 ? 1 : 0.5)
            || m.amount > m.weightAtAdministration * (index === 0 ? 1.5 : 0.75));
    const mixed = history.amiodarona.length && history.lidocaina.length;
    if (uncertain || mixed || badAmounts) {
        for (const id of ['amiodarona', 'lidocaina']) result[id] = { status: 'review', reason: 'Reavaliar antiarrítmicos: dose tardia, histórico incompleto, outro episódio ou fármacos associados. O PDF não fundamenta uma nova dose automática.' };
        return result;
    }
    if (clinical.step !== 8) return result;
    for (const id of ['amiodarona', 'lidocaina']) {
        const own = history[id];
        const other = history[id === 'amiodarona' ? 'lidocaina' : 'amiodarona'];
        if (other.length) {
            result[id] = { status: 'not_due', reason: 'Outro antiarrítmico já registrado: reavaliar antes de mudar o fármaco.' };
        } else if (own.length >= 2) {
            result[id] = { status: 'review', reason: 'Duas doses já documentadas: reavaliar antes de novas doses.' };
        } else if (own.some(m => m.clinicalContext.compressionId === clinical.compressionId)) {
            result[id] = { status: 'not_due', reason: 'Dose já registrada neste passo de RCP; não repetir automaticamente.' };
        } else {
            const number = own.length + 1;
            result[id] = { status: 'due', dose: getAdultAntiarrhythmicDose(id, number), number, reason: 'Passo 8 do algoritmo adulto: amiodarona OU lidocaína, mantendo o fármaco registrado.' };
        }
    }
    return result;
}

export function getProtocolNextStep(snapshot, now = Date.now()) {
    const guidance = evaluateMedicationGuidance(snapshot, now);
    const base = { message: 'RCP DE ALTA QUALIDADE — 100 A 120 BPM', style: 'success', icon: 'fas fa-heartbeat', criticalAction: null, dose: '', route: 'EV/IO', details: 'Minimizar interrupções e tratar causas reversíveis.', medicationGuidance: guidance };
    if (snapshot.roscAchieved || snapshot.clinical?.status === 'rosc') return { ...base, message: 'ROSC CONFIRMADO — CUIDADOS PÓS-PARADA', details: 'PCR interrompida. Nova PCR requer confirmação explícita.', style: 'primary' };
    if (!snapshot.pcrActive) return { ...base, message: 'ATENDIMENTO SEM PCR ATIVA', details: '', style: 'primary' };
    if (snapshot.currentPhase === 'preparation') return { ...base, message: 'SUPORTE BÁSICO — AVALIAR RITMO E INICIAR RCP' };
    if (['rhythm_check', 'shock_advised'].includes(snapshot.currentPhase)) return { ...base, message: 'AVALIAR RITMO — MINIMIZAR PAUSA', criticalAction: snapshot.currentPhase === 'shock_advised' ? 'SHOCK' : null, details: 'Desfibrilar se indicado e retomar compressões.' };
    const due = Object.entries(guidance).filter(([, entry]) => entry.status === 'due');
    const reviewDetails = [...new Set(Object.values(guidance).filter(entry => entry.status === 'review').map(entry => entry.reason))].join(' ');
    if (due.length) {
        const names = { adrenalina: 'ADRENALINA', amiodarona: 'AMIODARONA', lidocaina: 'LIDOCAÍNA' };
        const anti = due.filter(([id]) => id !== 'adrenalina');
        const epi = due.find(([id]) => id === 'adrenalina');
        return { ...base, message: [epi && 'ADRENALINA', anti.map(([id]) => names[id]).join(' OU ')].filter(Boolean).join(' / ') + ' — CONDUTAS DO PASSO ATUAL', criticalAction: 'DRUG', style: 'danger', icon: 'fas fa-syringe',
            dose: [epi && `ADRENALINA: ${epi[1].dose}`, anti.map(([id, entry]) => `${names[id]}: ${entry.dose}`).join(' OU ')].filter(Boolean).join('; '),
            details: 'Amiodarona e lidocaína são alternativas, não uma associação. ' + due.map(([, entry]) => entry.reason).filter((v, i, a) => a.indexOf(v) === i).join(' ') + ' ' + reviewDetails };
    }
    const review = Object.values(guidance).find(entry => entry.status === 'review');
    if (review) return { ...base, message: 'REAVALIAR CONDUTA — SEM DOSE AUTOMÁTICA', style: 'warning', details: review.reason };
    if (snapshot.isShockable === false) return { ...base, message: 'RCP CONTÍNUA — BUSCAR CAUSAS (5H/5T)', style: 'warning' };
    return base;
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
