// ================================================
// SERVIÇO DE ARMAZENAMENTO LOCAL - SIAV V4.1
// Sistema de controle de uso e limites diários otimizados
// ================================================

const STORAGE_PREFIX = 'siav_';

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
 * Salva logs offline (fallback quando sem internet)
 * @param {object} pcrLog - Log do atendimento
 */
export function saveOfflineLog(pcrLog) {
  const logs = getItem('offline_logs', []);
  logs.push({
    ...pcrLog,
    saved_at: new Date().toISOString(),
    synced: false
  });
  setItem('offline_logs', logs);
}

/**
 * Recupera logs offline pendentes de sync
 * @returns {Array}
 */
export function getOfflineLogs() {
  return getItem('offline_logs', []).filter(log => !log.synced);
}

/**
 * Marca log como sincronizado
 * @param {number} index - Índice do log
 */
export function markLogSynced(index) {
  const logs = getItem('offline_logs', []);
  if (logs[index]) {
    logs[index].synced = true;
    setItem('offline_logs', logs);
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
export function checkAndIncrementSimulationUse(userPlan) {
  console.log('🔍 Verificando uso do simulador para plano:', userPlan);

  // Planos ilimitados (profissional e vitalício)
  if (userPlan === 'profissional' || userPlan === 'vitalicio') {
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
  const dailyLimit = userPlan === 'free' ? FREE_DAILY_LIMIT : STUDENT_DAILY_LIMIT;
  console.log(`📋 Limite diário para plano ${userPlan}:`, dailyLimit);

  // Planos com limite (free e estudante)
  const today = new Date().toDateString(); // Ex: "Sat Nov 23 2025"
  const usageData = getItem('daily_usage', {
    date: today,
    count: 0
  });

  // Resetar contador se for um novo dia
  if (usageData.date !== today) {
    console.log('🔄 Novo dia detectado - resetando contador');
    usageData.date = today;
    usageData.count = 0;
  }

  // Verificar limite
  const currentCount = usageData.count;
  const remaining = dailyLimit - currentCount;

  console.log(`📊 Uso atual: ${currentCount}/${dailyLimit} (restam ${remaining})`);

  // Bloquear se atingiu o limite
  if (currentCount >= dailyLimit) {
    console.warn('🚫 LIMITE DIÁRIO ATINGIDO!');
    return {
      allowed: false,
      remaining: 0,
      isWarning: false,
      message: userPlan === 'free'
        ? `Você atingiu o limite de ${dailyLimit} caso clínico diário do plano Gratuito. Pratique mais intensamente com upgrade!`
        : `Você atingiu o limite de ${dailyLimit} casos clínicos diários do plano Estudante.`,
      upgradeRequired: true,
      limit: dailyLimit
    };
  }

  // Incrementar contador
  usageData.count++;
  setItem('daily_usage', usageData);

  // Alertar no penúltimo uso
  const newRemaining = dailyLimit - usageData.count;
  const isWarning = newRemaining === 1;

  if (isWarning) {
    console.warn('⚠️ ALERTA: Resta apenas 1 simulação de cortesia!');
  }

  console.log(`✅ Uso permitido - Nova contagem: ${usageData.count}/${dailyLimit}`);

  // Mensagens personalizadas por plano
  let warningMessage;
  if (userPlan === 'free' && usageData.count === dailyLimit) {
    warningMessage = `⚠️ Você está usando seu único caso clínico diário. Pratique mais intensamente com upgrade!`;
  } else if (isWarning) {
    warningMessage = `⚠️ Atenção: Resta apenas ${newRemaining} caso clínico hoje. Não pare de treinar, faça upgrade!`;
  } else {
    warningMessage = `Você tem ${newRemaining} casos clínicos restantes hoje.`;
  }

  return {
    allowed: true,
    remaining: newRemaining,
    isWarning: isWarning || (userPlan === 'free' && usageData.count === dailyLimit),
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
