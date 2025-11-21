
const STORAGE_PREFIX = 'siav_';

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
