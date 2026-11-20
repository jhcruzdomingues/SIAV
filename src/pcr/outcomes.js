import { state } from '../config/state.js';
import { newOperationId } from './clinical.js';
import { recordROSC } from './rhythm.js';
import { executePCRFinish } from './core.js';

export const ENCOUNTER_OUTCOMES = Object.freeze({
    rosc: { label: 'RCE OBTIDO (ROSC)', confirm: 'Confirmar RCE OBTIDO (retorno da circulação espontânea) e finalizar este atendimento? Os registros serão preservados.' },
    death: { label: 'ÓBITO INFORMADO PELO OPERADOR', confirm: 'Tem certeza de que deseja registrar ÓBITO informado pela equipe e finalizar este atendimento? Esta escolha não é feita automaticamente pelo aplicativo. Os registros serão preservados.' },
    cancelled: { label: 'ATENDIMENTO CANCELADO', confirm: 'Tem certeza de que deseja CANCELAR ATENDIMENTO e encerrar este registro? As anotações e os registros existentes não serão apagados. Nenhum desfecho clínico será presumido.' }
});

export const isEncounterOutcome = type => typeof type === 'string' && Object.prototype.hasOwnProperty.call(ENCOUNTER_OUTCOMES, type);

export function matchesEncounter(expected) {
    return state.pcrActive && ['arrest', 'rosc'].includes(state.clinical?.status)
        && expected?.startTime === state.pcrStartTime && expected?.episodeId === state.clinical?.episodeId;
}

export function completeEncounter(type, expected) {
    if (!isEncounterOutcome(type) || !matchesEncounter(expected) || state.encounterOutcome) return false;
    if (type === 'rosc' && !state.roscAchieved && !recordROSC()) return false;
    const outcome = { type, id: newOperationId(), episodeId: state.clinical.episodeId, timestamp: Date.now() };
    state.encounterOutcome = outcome;
    if (typeof window.addEvent === 'function') window.addEvent(`DESFECHO REGISTRADO: ${ENCOUNTER_OUTCOMES[type].label}`, type === 'rosc' ? 'success' : 'normal');
    executePCRFinish();
    return true;
}
