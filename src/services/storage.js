// ================================================
// SERVIÇO DE ARMAZENAMENTO LOCAL - SIAV V4.1
// Sistema de controle de uso e limites diários otimizados
// ================================================

const STORAGE_PREFIX = 'siav_';

// Importações necessárias para validação online
import { supabase } from '../config/supabase.js';
import { state } from '../config/state.js';

/**
 * ================================================
 * BANCO DE DADOS ASSÍNCRONO (IndexedDB)
 * Usado para armazenar logs pesados sem travar a UI (cronômetro)
 * ================================================
 */
export const appDB = {
  db: null,
  async init() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SiavAppDB', 1);
      request.onupgradeneeded = event => {
        event.target.result.createObjectStore('appStore');
      };
      request.onsuccess = event => {
        this.db = event.target.result;
        resolve(this.db);
      };
      request.onerror = event => reject(event.target.error);
    });
  },
  async setItem(key, value) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('appStore', 'readwrite');
      const store = tx.objectStore('appStore');
      const request = store.put(value, key);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },
  async getItem(key, defaultValue = null) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('appStore', 'readonly');
      const store = tx.objectStore('appStore');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result !== undefined ? request.result : defaultValue);
      request.onerror = () => reject(request.error);
    });
  }
};

// ⭐ NOVOS LIMITES OTIMIZADOS - V4.1
const FREE_DAILY_LIMIT = 1;      // Plano gratuito: 1 caso/dia
const STUDENT_DAILY_LIMIT = 10;  // Plano estudante: 10 casos/dia

/**
 * Salva dado no localStorage
 * @param {string} key - Chave
 * @param {any} value - Valor (será convertido para JSON)
 */
export function setItem(key, value) {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(STORAGE_PREFIX + key, serialized);
    return true;
  } catch (err) {
    console.error('Erro crítico ao salvar no localStorage:', err);
    return false;
  }
}

/**
 * Recupera dado do localStorage
 * @param {string} key - Chave
 * @param {any} defaultValue - Valor padrão se não encontrado
 * @returns {any}
 */
export function getItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (err) {
    console.error('Erro crítico ao ler do localStorage:', err);
    return defaultValue;
  }
}

/**
 * Remove dado do localStorage
 * @param {string} key - Chave
 */
export function removeItem(key) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
    return true;
  } catch (err) {
    console.error('Erro crítico ao remover do localStorage:', err);
    return false;
  }
}

/**
 * Limpa todo o armazenamento do SIAV
 */
export function clear() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (err) {
    console.error('Erro crítico ao limpar localStorage:', err);
  }
}

/**
 * Salva configurações do usuário
 * @param {object} settings - Configurações
 */
const DEFAULT_SETTINGS = {
  theme: 'auto',
  soundsEnabled: true,
  soundVolume: 0.7,
  locale: 'en-US',
  customSounds: {}
};

export function saveSettings(settings) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  setItem('settings', merged);
}

/**
 * Carrega configurações do usuário
 * @returns {object}
 */
export function loadSettings() {
  const loaded = getItem('settings');
  if (!loaded) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...loaded };
}

/**
 * Salva logs offline (usando IndexedDB para não bloquear a thread principal)
 * @param {object} pcrLog - Log do atendimento
 */
export async function saveOfflineLog(pcrLog) {
  try {
    const logs = await appDB.getItem('offline_logs', []);
    logs.push({
      ...pcrLog,
      id: Date.now().toString(), // Garante um ID único
      saved_at: new Date().toISOString(),
      synced: false
    });
    await appDB.setItem('offline_logs', logs);
    console.log('✅ Log offline salvo no IndexedDB com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao salvar log no IndexedDB, usando fallback:', err);
    // Fallback síncrono para o antigo localStorage
    const localLogs = getItem('offline_logs', []);
    localLogs.push({ ...pcrLog, id: Date.now().toString(), saved_at: new Date().toISOString(), synced: false });
    setItem('offline_logs', localLogs);
  }
}

/**
 * Recupera logs offline pendentes de sync
 * @returns {Promise<Array>}
 */
export async function getOfflineLogs() {
  try {
    const logs = await appDB.getItem('offline_logs', []);
    const localLogs = getItem('offline_logs', []); // Busca do legado também
    const allLogs = [...logs, ...localLogs];
    return allLogs.filter(log => !log.synced);
  } catch (err) {
    return getItem('offline_logs', []).filter(log => !log.synced);
  }
}

/**
 * Marca log como sincronizado
 * @param {string|number} identifier - ID único ou Índice do log
 */
export async function markLogSynced(identifier) {
  try {
    const logs = await appDB.getItem('offline_logs', []);
    const logIndex = logs.findIndex(l => l.id === identifier || l.id === String(identifier));
    if (logIndex !== -1) logs[logIndex].synced = true;
    await appDB.setItem('offline_logs', logs);

    // Limpa o fallback também
    const localLogs = getItem('offline_logs', []);
    if (typeof identifier === 'number' && localLogs[identifier]) {
        localLogs[identifier].synced = true;
        setItem('offline_logs', localLogs);
    }
  } catch (err) {
    console.error('❌ Erro ao marcar log como sincronizado:', err);
  }
}

/**
 * Obtém tamanho usado no localStorage (em bytes)
 * @returns {number}
 */
export function getStorageSize() {
  let total = 0;
  for (let key in localStorage) {
    if (key.startsWith(STORAGE_PREFIX)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total;
}

/**
 * Obtém tamanho usado formatado
 * @returns {string}
 */
export function getStorageSizeFormatted() {
  const bytes = getStorageSize();
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ================================================
// SISTEMA DE CONTROLE DE USO DIÁRIO - V4.1
// Limites Otimizados: FREE = 1, ESTUDANTE = 10
// ================================================

/**
 * Verifica e incrementa o contador de uso do simulador
 * @param {string} userPlan - Plano do usuário ('free', 'estudante', 'profissional', 'vitalicio')
 * @returns {object} - {allowed: boolean, remaining: number, isWarning: boolean, limit: number}
 */
export async function checkAndIncrementSimulationUse(userPlan) {
  console.log('🔍 Verificando uso do simulador para plano:', userPlan);
  const normalizedPlan = userPlan.toLowerCase();

  // Planos ilimitados (profissional e vitalício)
  if (normalizedPlan === 'profissional' || normalizedPlan === 'vitalicio' || normalizedPlan === 'professional' || normalizedPlan === 'lifetime') {
    console.log('✅ Plano ilimitado - uso permitido');
    return {
      allowed: true,
      remaining: null, // null = ilimitado
      isWarning: false,
      message: 'Acesso ilimitado',
      limit: null
    };
  }

  // Determinar limite baseado no plano
  const dailyLimit = normalizedPlan === 'free' ? FREE_DAILY_LIMIT : STUDENT_DAILY_LIMIT;
  console.log(`📋 Limite diário para plano ${userPlan}:`, dailyLimit);

  // Sincronizando com a regra de backend do Supabase
  let currentCount = 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0); // Início do dia

  if (state.currentUser && state.currentUser.isLoggedIn && state.currentUser.id) {
    try {
      const { count, error } = await supabase
        .from('simulation_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', state.currentUser.id)
        .gte('created_at', todayStart.toISOString());
      
      if (!error) currentCount = count || 0;
    } catch (err) {
      console.error('Falha ao consultar limite no Supabase:', err);
    }
  }

  const remaining = dailyLimit - currentCount;

  console.log(`📊 Uso atual: ${currentCount}/${dailyLimit} (restam ${remaining})`);

  // Bloquear se atingiu o limite
  if (currentCount >= dailyLimit) {
    console.warn('🚫 LIMITE DIÁRIO ATINGIDO!');
    return {
      allowed: false,
      remaining: 0,
      isWarning: false,
      message: normalizedPlan === 'free'
        ? `Você atingiu o limite de ${dailyLimit} caso clínico diário do plano Gratuito. Pratique mais intensamente com upgrade!`
        : `Você atingiu o limite de ${dailyLimit} casos clínicos diários do plano Estudante.`,
      upgradeRequired: true,
      limit: dailyLimit
    };
  }

  // Alertar no penúltimo uso
  const newRemaining = dailyLimit - (currentCount + 1);
  const isWarning = newRemaining === 0;

  if (isWarning) {
    console.warn('⚠️ ALERTA: Resta apenas 1 simulação de cortesia!');
  }

  console.log(`✅ Uso permitido. Ao concluir a simulação a contagem será: ${currentCount + 1}/${dailyLimit}`);

  // Mensagens personalizadas por plano
  let warningMessage;
  if (normalizedPlan === 'free' && currentCount === 0) {
    warningMessage = `⚠️ Este é seu único caso gratuito do dia.\n\nPratique mais intensamente com upgrade!`;
  } else if (isWarning) {
    warningMessage = `⚠️ Atenção: Resta apenas 1 caso clínico hoje. Não pare de treinar, faça upgrade!`;
  } else {
    warningMessage = `Você tem ${newRemaining + 1} casos clínicos restantes hoje.`;
  }

  return {
    allowed: true,
    remaining: newRemaining + 1,
    isWarning: isWarning || (normalizedPlan === 'free'),
    message: warningMessage,
    upgradeRequired: false,
    limit: dailyLimit
  };
}

/**
 * Reseta o contador de uso diário (apenas para testes/admin)
 */
export function resetDailyUsage() {
  const today = new Date().toDateString();
  setItem('daily_usage', {
    date: today,
    count: 0
  });
  console.log('🔄 Contador de uso diário resetado');
}

/**
 * Obtém estatísticas de uso atual
 * @param {string} userPlan - Plano do usuário
 * @returns {object}
 */
export function getUsageStats(userPlan = 'free') {
  const today = new Date().toDateString();
  const usageData = getItem('daily_usage', {
    date: today,
    count: 0
  });

  // Verificar se é do dia atual
  const isToday = usageData.date === today;
  const count = isToday ? usageData.count : 0;

  // Determinar limite baseado no plano
  const limit = userPlan === 'free' ? FREE_DAILY_LIMIT :
                userPlan === 'estudante' ? STUDENT_DAILY_LIMIT :
                null; // null = ilimitado

  return {
    date: today,
    count: count,
    limit: limit,
    remaining: limit ? limit - count : null,
    percentage: limit ? (count / limit) * 100 : 0
  };
}

/**
 * Verifica se o usuário pode salvar mais pacientes
 * @param {string} userPlan - Plano do usuário
 * @returns {object} - {allowed: boolean, current: number, max: number}
 */
export function checkPatientSaveLimit(userPlan) {
  // Definir limites por plano
  const limits = {
    free: 0, // Plano gratuito não salva
    estudante: 1, // Plano estudante salva 1 paciente
    profissional: null, // Ilimitado
    vitalicio: null // Ilimitado
  };

  const maxPatients = limits[userPlan];

  // Planos ilimitados
  if (maxPatients === null) {
    return {
      allowed: true,
      current: null,
      max: null,
      message: 'Salvamento ilimitado de pacientes'
    };
  }

  // Plano gratuito
  if (maxPatients === 0) {
    return {
      allowed: false,
      current: 0,
      max: 0,
      message: 'Faça upgrade para salvar o histórico de pacientes',
      upgradeRequired: true
    };
  }

  // Verificar quantidade atual salva
  const savedPatients = getItem('saved_patients', []);
  const currentCount = savedPatients.length;

  if (currentCount >= maxPatients) {
    return {
      allowed: false,
      current: currentCount,
      max: maxPatients,
      message: `Você atingiu o limite de ${maxPatients} paciente${maxPatients > 1 ? 's' : ''} salvos. Faça upgrade para salvar ilimitados!`,
      upgradeRequired: true
    };
  }

  return {
    allowed: true,
    current: currentCount,
    max: maxPatients,
    message: `Você pode salvar mais ${maxPatients - currentCount} paciente${maxPatients - currentCount > 1 ? 's' : ''}.`
  };
}

// Exportar constantes para uso externo
export { FREE_DAILY_LIMIT, STUDENT_DAILY_LIMIT };
