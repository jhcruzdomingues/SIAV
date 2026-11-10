export const NOW = 1_800_000_000_000;
export const episodeId = 'episode-1';
export function medication(name, overrides = {}) {
    return {
        id: `dose-${name}`, name, amount: name === 'Amiodarona' ? 300 : name.startsWith('Lido') ? 100 : 1,
        unit: 'mg', route: 'EV', timestamp: NOW - 120_000, recordedAt: NOW - 120_000,
        episodeId, isRetrospective: false, requiresReview: false, weightAtAdministration: 70,
        clinicalContext: { step: 8, compressionId: 'previous-opportunity' }, ...overrides
    };
}
export function snapshot(overrides = {}) {
    return {
        pcrActive: true, roscAchieved: false, patient: { algorithm: 'adult', age: 45, weight: 70 },
        currentPhase: 'compressions', isShockable: true, medications: [], shockCount: 3,
        clinical: { status: 'arrest', episodeId, startedAt: NOW - 600_000, step: 8, compressionId: 'current-opportunity', pendingShock: null },
        ...overrides
    };
}
export function atStep(step, overrides = {}) {
    const data = snapshot(overrides);
    return { ...data, isShockable: [4, 6, 8].includes(step), clinical: { ...data.clinical, step } };
}
