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