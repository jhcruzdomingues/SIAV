/**
 * =============================================
 * UTILITÁRIOS DE FORMATAÇÃO
 * =============================================
 * Funções para formatar dados e calcular valores
 */

/**
 * Formata segundos para MM:SS
 * @param {number} seconds - Segundos
 * @returns {string}
 */
export function formatTime(seconds) {
  // Garante que valores negativos retornem 00:00
  if (typeof seconds !== 'number' || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Formata timestamp para HH:MM:SS
 * @param {number} timestamp - Timestamp em milissegundos
 * @returns {string}
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('pt-BR');
}

/**
 * Formata data completa
 * @param {number|Date} date - Data
 * @returns {string}
 */
export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  // Retorna no formato dd/mm/yyyy
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formata data e hora completa
 * @param {number|Date} date - Data
 * @returns {string}
 */
export function formatDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  // dd/mm/yyyy, HH:MM
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year}, ${hour}:${min}`;
}

// Função calculatePediatricDose deve ser exportada apenas de um local (medications.js)

/**
 * Calcula dose pediátrica baseada no peso
 * @param {number} weightKg - Peso em kg
 * @param {number} dosePerKg - Dose por kg
 * @param {number} maxDose - Dose máxima (opcional)
 * @returns {number}
 */
export function calculatePediatricDose(weightKg, dosePerKg, maxDose = Infinity) {
  const dose = weightKg * dosePerKg;
  return Math.min(dose, maxDose);
}

/**
 * Calcula energia de choque pediátrico
 * @param {number} weightKg - Peso em kg
 * @param {number} jPerKg - Joules por kg (2 ou 4)
 * @param {number} maxEnergy - Energia máxima (opcional)
 * @returns {number}
 */
export function calculatePediatricShock(weightKg, jPerKg, maxEnergy = 200) {
  const energy = weightKg * jPerKg;
  return Math.min(energy, maxEnergy);
}

/**
 * Verifica se paciente é pediátrico
 * @param {number} age - Idade em anos
 * @returns {boolean}
 */
export function isPediatric(age) {
  return age < 18;
}

/**
 * Calcula idade a partir da data de nascimento
 * @param {string|Date} birthDate - Data de nascimento
 * @returns {number}
 */
export function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * Formata duração em minutos e segundos
 * @param {number} seconds - Segundos
 * @returns {string}
 */
export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins === 0) {
    return `${secs}s`;
  }

  return `${mins}min ${secs}s`;
}

/**
 * Formata percentual
 * @param {number} value - Valor
 * @param {number} decimals - Casas decimais
 * @returns {string}
 */
export function formatPercentage(value, decimals = 1) {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Trunca texto
 * @param {string} text - Texto
 * @param {number} maxLength - Tamanho máximo
 * @returns {string}
 */
export function truncate(text, maxLength = 50) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
