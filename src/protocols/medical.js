/**
 * =============================================
 * PROTOCOLOS MÉDICOS ACLS/PALS
 * =============================================
 * Lógica de protocolos de RCP seguindo AHA 2025
 */

import { RHYTHMS, TIMINGS, SHOCK_ENERGY } from '../config/constants.js';
import { compressionCycle } from '../config/state.js';

/**
 * Determina o próximo passo do protocolo
 * @param {string} rhythm - Ritmo atual (FV, TVSP, AESP, Assistolia)
 * @param {number} cycleNumber - Número do ciclo atual
 * @param {number} shockCount - Número de choques aplicados
 * @returns {object}
 */
export function getProtocolNextStep(rhythm, cycleNumber, shockCount) {
  const rhythmData = RHYTHMS[rhythm];

  if (!rhythmData) {
    return {
      action: 'Ritmo não identificado. Checar monitor.',
      icon: 'fas fa-exclamation-triangle',
      type: 'error'
    };
  }

  // Ritmos chocáveis (FV/TVSP)
  if (rhythmData.shockable) {
    if (cycleNumber === 0) {
      return {
        action: 'Iniciar RCP imediatamente',
        detail: 'Começar compressões torácicas de alta qualidade',
        icon: 'fas fa-heartbeat',
        type: 'compression'
      };
    }

    if (cycleNumber % 1 === 0) { // A cada ciclo (2 min)
      return {
        action: 'Checar ritmo e preparar desfibrilação',
        detail: `${shockCount === 0 ? 'Primeiro' : 'Próximo'} choque indicado`,
        icon: 'fas fa-bolt',
        type: 'shock'
      };
    }
  }

  // Ritmos não-chocáveis (AESP/Assistolia)
  if (!rhythmData.shockable) {
    if (cycleNumber === 0) {
      return {
        action: 'Iniciar RCP + Adrenalina',
        detail: 'Compressões de alta qualidade. Adrenalina 1 mg a cada 3-5 min',
        icon: 'fas fa-syringe',
        type: 'drug'
      };
    }

    return {
      action: 'Continuar RCP + Avaliar causas reversíveis',
      detail: 'Checar 5 H\'s e 5 T\'s. Adrenalina a cada 3-5 min',
      icon: 'fas fa-search-plus',
      type: 'causes'
    };
  }

  return {
    action: 'Continuar RCP',
    detail: 'Manter compressões de alta qualidade',
    icon: 'fas fa-heartbeat',
    type: 'compression'
  };
}

/**
 * Determina quando administrar medicação
 * @param {string} rhythm - Ritmo atual
 * @param {number} elapsedSeconds - Tempo desde início
 * @param {number} lastDrugTime - Último tempo de droga (segundos)
 * @param {number} shockCount - Número de choques
 * @returns {boolean}
 */
export function shouldAdministerDrug(rhythm, elapsedSeconds, lastDrugTime, shockCount) {
  const rhythmData = RHYTHMS[rhythm];

  if (!rhythmData) return false;

  // Ritmos não-chocáveis: Adrenalina a cada 3-5 min
  if (!rhythmData.shockable) {
    if (!lastDrugTime) return true; // Primeira dose imediata
    const timeSinceLastDrug = elapsedSeconds - lastDrugTime;
    return timeSinceLastDrug >= (TIMINGS.DRUG_INTERVAL / 1000);
  }

  // Ritmos chocáveis: Adrenalina após 2º choque falho
  if (rhythmData.shockable) {
    if (shockCount >= 2) {
      if (!lastDrugTime) return true;
      const timeSinceLastDrug = elapsedSeconds - lastDrugTime;
      return timeSinceLastDrug >= (TIMINGS.DRUG_INTERVAL / 1000);
    }
  }

  return false;
}

/**
 * Determina quando administrar antiarrítmico (Amiodarona)
 * @param {string} rhythm - Ritmo atual
 * @param {number} shockCount - Número de choques
 * @returns {boolean}
 */
export function shouldAdministerAntiarrhythmic(rhythm, shockCount) {
  const rhythmData = RHYTHMS[rhythm];

  if (!rhythmData || !rhythmData.shockable) return false;

  // Amiodarona após 3º choque (primeiro) e 5º choque (segundo)
  return shockCount === 3 || shockCount === 5;
}

/**
 * Calcula energia recomendada para choque
 * @param {number} shockCount - Número de choques já dados
 * @param {number} weightKg - Peso do paciente (null = adulto)
 * @param {boolean} isBifasic - Se desfibrilador é bifásico
 * @returns {number}
 */
export function getRecommendedShockEnergy(shockCount, weightKg = null, isBifasic = true) {
  // Pediátrico
  if (weightKg && weightKg < 50) {
    const jPerKg = shockCount === 0 ? SHOCK_ENERGY.PEDIATRIC_INITIAL : SHOCK_ENERGY.PEDIATRIC_SUBSEQUENT;
    return Math.min(weightKg * jPerKg, 200);
  }

  // Adulto
  if (isBifasic) {
    return SHOCK_ENERGY.BIFASIC_INITIAL; // 200 J constante
  } else {
    return SHOCK_ENERGY.MONOFASIC_INITIAL; // 360 J
  }
}

/**
 * Valida qualidade da RCP
 * @param {number} compressionRate - Taxa de compressões (bpm)
 * @param {number} compressionDepth - Profundidade (cm)
 * @returns {object}
 */
export function validateCPRQuality(compressionRate, compressionDepth = null) {
  const feedback = {
    quality: 'good',
    messages: []
  };

  // Validar taxa (100-120 bpm)
  if (compressionRate < 100) {
    feedback.quality = 'low';
    feedback.messages.push('⚠️ Compressões muito lentas. Aumentar para 100-120 bpm.');
  } else if (compressionRate > 120) {
    feedback.quality = 'low';
    feedback.messages.push('⚠️ Compressões muito rápidas. Reduzir para 100-120 bpm.');
  } else {
    feedback.messages.push('✅ Taxa de compressões adequada.');
  }

  // Validar profundidade se fornecida (5-6 cm adulto)
  if (compressionDepth !== null) {
    if (compressionDepth < 5) {
      feedback.quality = 'low';
      feedback.messages.push('⚠️ Compressões muito rasas. Aprofundar para 5-6 cm.');
    } else if (compressionDepth > 6) {
      feedback.quality = 'moderate';
      feedback.messages.push('⚠️ Compressões muito profundas. Manter 5-6 cm.');
    } else {
      feedback.messages.push('✅ Profundidade adequada.');
    }
  }

  return feedback;
}

/**
 * Gera mensagem de guia do protocolo
 * @param {string} rhythm - Ritmo atual
 * @param {number} cycleNumber - Número do ciclo
 * @returns {string}
 */
export function getProtocolGuidance(rhythm, cycleNumber) {
  const rhythmData = RHYTHMS[rhythm];

  if (!rhythmData) {
    return 'Identifique o ritmo no monitor antes de prosseguir.';
  }

  if (rhythmData.shockable) {
    if (cycleNumber === 0) {
      return '🔴 RCP imediata → Checar ritmo a cada 2 min → Desfibrilar se FV/TVSP';
    }
    return `⚡ Ritmo chocável detectado. Aplicar choque e retomar RCP por 2 minutos.`;
  }

  return `💊 Ritmo não-chocável. RCP contínua + Adrenalina 1mg a cada 3-5 min. Avaliar causas reversíveis.`;
}
