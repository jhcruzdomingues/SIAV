/**
 * Calcula dose pediátrica baseada no protocolo de medicação
 * @param {string} medicationId - ID da medicação
 * @param {number} weightKg - Peso em kg
 * @returns {object|null} { value, unit } ou null se não encontrada
 */
export function calculatePediatricDose(medicationId, weightKg) {
  if (!MEDICATIONS || !MEDICATIONS[medicationId] || typeof weightKg !== 'number' || weightKg <= 0) return null;
  const med = MEDICATIONS[medicationId];
  let value = weightKg * (med.pediatricDose || 0);
  if (med.pediatricMin && value < med.pediatricMin) value = med.pediatricMin;
  if (med.pediatricMax && value > med.pediatricMax) value = med.pediatricMax;
  return {
    value,
    unit: med.unit
  };
}
/**
 * =============================================
 * DADOS DE MEDICAÇÕES
 * =============================================
 * Constantes e cálculos de dosagens conforme AHA 2025
 */

/**
 * Medicações disponíveis no protocolo ACLS
 */
export const MEDICATIONS = {
  adrenalina: {
    name: 'Adrenalina (Epinefrina)',
    adultDose: '1 mg EV/IO',
    adultDoseValue: 1,
    unit: 'mg',
    pediatricDose: 0.01, // mg/kg
    pediatricMax: 1, // mg
    route: ['EV', 'IO', 'ET'],
    etDose: '2-3 mg diluído em 10 mL de SF 0,9%',
    interval: '3-5 minutos',
    notes: 'Droga vasopressora de primeira linha em PCR'
  },
  amiodarona: {
    name: 'Amiodarona',
    adultDose: '300 mg EV/IO (1ª dose), 150 mg (2ª dose)',
    adultDoseValue: 300,
    adultSecondDose: 150,
    unit: 'mg',
    pediatricDose: 5, // mg/kg
    pediatricMax: 300, // mg
    route: ['EV', 'IO'],
    interval: 'Após 3º e 5º choque',
    notes: 'Antiarrítmico para FV/TVSP refratária'
  },
  atropina: {
    name: 'Atropina',
    adultDose: '1 mg EV/IO',
    adultDoseValue: 1,
    unit: 'mg',
    pediatricDose: 0.02, // mg/kg
    pediatricMin: 0.1, // mg
    pediatricMax: 1, // mg
    route: ['EV', 'IO'],
    interval: '3-5 minutos',
    maxDoses: 3,
    notes: 'NÃO é mais recomendada rotineiramente em PCR (AHA 2020+)'
  },
  lidocaina: {
    name: 'Lidocaína',
    adultDose: '1-1.5 mg/kg EV/IO',
    adultDoseValue: 100, // dose típica para 70kg
    unit: 'mg',
    pediatricDose: 1, // mg/kg
    route: ['EV', 'IO'],
    interval: 'Alternativa à Amiodarona',
    notes: 'Antiarrítmico de segunda linha'
  },
  bicarbonato: {
    name: 'Bicarbonato de Sódio',
    adultDose: '1 mEq/kg EV/IO',
    adultDoseValue: 50, // mEq (dose típica)
    unit: 'mEq',
    pediatricDose: 1, // mEq/kg
    route: ['EV', 'IO'],
    interval: 'Conforme gasometria',
    notes: 'Apenas em: hipercalemia, acidose metabólica grave, overdose de tricíclicos'
  },
  sulfato: {
    name: 'Sulfato de Magnésio',
    adultDose: '1-2 g EV/IO',
    adultDoseValue: 2,
    unit: 'g',
    pediatricDose: 25, // mg/kg
    pediatricMax: 2000, // mg = 2g
    route: ['EV', 'IO'],
    interval: 'Dose única',
    notes: 'Para Torsades de Pointes ou hipomagnesemia conhecida'
  }
};

/**
 * Calcula dose de medicação
 * @param {string} medicationId - ID da medicação
 * @param {number} weightKg - Peso do paciente (null para adulto padrão)
 * @param {boolean} isSecondDose - Se é segunda dose (para amiodarona)
 * @returns {string}
 */
export function calculateDose(medicationId, weightKg = null, isSecondDose = false) {
  const med = MEDICATIONS[medicationId];

  if (!med) {
    return 'Medicação não encontrada';
  }

  // Adulto (sem peso ou peso >= 50kg considerado adulto)
  if (!weightKg || weightKg >= 50) {
    if (isSecondDose && med.adultSecondDose) {
      return `${med.adultSecondDose} ${med.unit}`;
    }
    return med.adultDose;
  }

  // Pediátrico
  let dose = weightKg * med.pediatricDose;

  // Aplica dose mínima se existir
  if (med.pediatricMin && dose < med.pediatricMin) {
    dose = med.pediatricMin;
  }

  // Aplica dose máxima se existir
  if (med.pediatricMax && dose > med.pediatricMax) {
    dose = med.pediatricMax;
  }

  return `${dose.toFixed(2)} ${med.unit} (${med.pediatricDose} ${med.unit}/kg)`;
}

/**
 * Obtém intervalo de administração
 * @param {string} medicationId - ID da medicação
 * @returns {string}
 */
export function getMedicationInterval(medicationId) {
  const med = MEDICATIONS[medicationId];
  return med ? med.interval : '';
}

/**
 * Obtém vias de administração
 * @param {string} medicationId - ID da medicação
 * @returns {Array<string>}
 */
export function getMedicationRoutes(medicationId) {
  const med = MEDICATIONS[medicationId];
  return med ? med.route : [];
}

/**
 * Obtém notas/indicações da medicação
 * @param {string} medicationId - ID da medicação
 * @returns {string}
 */
export function getMedicationNotes(medicationId) {
  const med = MEDICATIONS[medicationId];
  return med ? med.notes : '';
}
