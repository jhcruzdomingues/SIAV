/**
 * =============================================
 * CONSTANTES DA APLICAÇÃO
 * =============================================
 * Valores fixos usados em todo o sistema
 */

/**
 * Planos de assinatura disponíveis
 */
export const PLANS = {
  FREE: {
    name: 'Gratuito',
    level: 'free',
    maxRecords: 5,
    priceMonthly: 0,
    priceYearly: 0,
    features: {
      basicProtocols: true,
      pcrTimer: true,
      metronome: true,
      saveLogs: true,
      advancedStats: false,
      pdfExport: false,
      cloudBackup: false,
      prioritySupport: false
    },
    description: 'Acesso aos recursos básicos do SIAV'
  },
  STUDENT: {
    name: 'Estudante',
    level: 'student',
    maxRecords: 50,
    priceMonthly: 9.90,
    priceYearly: 99.00,  // ~8.25/mês (17% economia)
    savings: 19.80,      // Economia anual
    features: {
      basicProtocols: true,
      pcrTimer: true,
      metronome: true,
      saveLogs: true,
      advancedStats: true,
      pdfExport: true,
      cloudBackup: true,
      quiz: true,
      studyMaterials: true,
      prioritySupport: false
    },
    description: 'Perfeito para estudantes de medicina e enfermagem',
    badge: 'Mais Popular'
  },
  PROFESSIONAL: {
    name: 'Profissional',
    level: 'professional',
    maxRecords: Infinity,
    priceMonthly: 19.90,
    priceYearly: 178.80,   // R$ 14.90/mês (25% economia) ⭐ PROMOÇÃO
    priceYearlyOriginal: 238.80,  // Preço original sem desconto
    savings: 60.00,        // Economia anual EXTRA
    features: {
      basicProtocols: true,
      pcrTimer: true,
      metronome: true,
      saveLogs: true,
      advancedStats: true,
      pdfExport: true,
      cloudBackup: true,
      quiz: true,
      studyMaterials: true,
      prioritySupport: true,
      unlimitedLogs: true,
      exportData: true,
      advancedReports: true
    },
    description: 'Completo para profissionais de saúde',
    badge: 'Melhor Valor',
    promotion: {
      active: true,
      text: 'PROMOÇÃO: R$ 14,90/mês no plano anual!',
      discount: '25% OFF'
    }
  }
};

/**
 * Timings do protocolo de RCP (em milissegundos)
 */
export const TIMINGS = {
  CYCLE_DURATION: 120000,        // 2 minutos por ciclo
  COMPRESSION_RATIO: 30,          // 30 compressões
  VENTILATION_RATIO: 2,           // 2 ventilações
  DRUG_INTERVAL: 180000,          // 3-5 minutos entre drogas (3 min padrão)
  RHYTHM_CHECK_INTERVAL: 120000   // 2 minutos entre checagens
};

/**
 * BPM padrão para compressões
 */
export const BPM = {
  MIN: 100,
  MAX: 120,
  DEFAULT: 110,
  STEP: 5
};

/**
 * Energias de desfibrilação (Joules)
 */
export const SHOCK_ENERGY = {
  BIFASIC_INITIAL: 200,
  BIFASIC_SUBSEQUENT: 200,
  MONOFASIC_INITIAL: 360,
  MONOFASIC_SUBSEQUENT: 360,
  PEDIATRIC_INITIAL: 2,      // J/kg
  PEDIATRIC_SUBSEQUENT: 4    // J/kg
};

/**
 * Ritmos cardíacos
 */
export const RHYTHMS = {
  FV: {
    name: 'Fibrilação Ventricular',
    abbr: 'FV',
    shockable: true,
    description: 'Ondas caóticas sem QRS definido'
  },
  TVSP: {
    name: 'TV sem Pulso',
    abbr: 'TVSP',
    shockable: true,
    description: 'QRS alargado rápido, sem pulso'
  },
  AESP: {
    name: 'Atividade Elétrica sem Pulso',
    abbr: 'AESP',
    shockable: false,
    description: 'Ritmo organizado, pulso ausente'
  },
  ASSISTOLIA: {
    name: 'Assistolia',
    abbr: 'Assistolia',
    shockable: false,
    description: 'Ausência completa de atividade'
  }
};

/**
 * Versão do aplicativo
 */
export const APP_VERSION = '2.0.0';

/**
 * Nome da aplicação
 */
export const APP_NAME = 'SIAV - Sistema Inteligente de Assistência à Vida';
