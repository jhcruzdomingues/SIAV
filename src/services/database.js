/**
 * =============================================
 * SERVIÇO DE DATABASE
 * =============================================
 * Operações CRUD no Supabase
 */

import { supabase } from '../config/supabase.js';
import { state } from '../config/state.js';

// Cache para casos clínicos (10 minutos de validade)
let casesCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos
const CASES_LIMIT = 30; // Reduzido de 50 para 30 para mais velocidade
let preloadingPromise = null; // Promise de pré-carregamento

/**
 * Carrega perfil do usuário
 * @param {string} userId - ID do usuário
 * @returns {Promise<object|null>}
 */
export async function loadUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // Ignora "not found"
      console.error('Erro ao carregar perfil:', error);
      return null;
    }

    if (data) {
      state.userProfile = data;
      state.userPlan = data.plan || 'free';
      // Sincroniza também com state.currentUser (compatibilidade com script.js)
      if (typeof state.currentUser !== 'undefined') {
        state.currentUser.plan = data.plan || 'free';
        state.currentUser.name = data.full_name || data.name || 'Profissional';
        state.currentUser.email = data.email || null;
        state.currentUser.profession = data.profession || '';
        state.currentUser.councilRegister = data.council_register || null;
        state.currentUser.id = data.id || null;
        state.currentUser.isLoggedIn = true;
      }
    }

    return data;
  } catch (err) {
    console.error('Erro no loadUserProfile:', err);
    return null;
  }
}

/**
 * Salva/atualiza perfil do usuário
 * @param {string} userId - ID do usuário
 * @param {object} profileData - Dados do perfil
 * @returns {Promise<{success: boolean, error: string}>}
 */
export async function saveUserProfile(userId, profileData) {
  try {
    // Validacao de entrada
    if (!userId) {
      return {
        success: false,
        error: 'ID do usuario e obrigatorio'
      };
    }

    if (!profileData || typeof profileData !== 'object') {
      return {
        success: false,
        error: 'Dados do perfil sao obrigatorios'
      };
    }

    // Validar campos obrigatorios
    if (profileData.full_name) {
      const name = profileData.full_name.trim();
      if (name.length < 3 || name.length > 100) {
        return {
          success: false,
          error: 'Nome deve ter entre 3 e 100 caracteres'
        };
      }
    }

    // Validar email se fornecido
    if (profileData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profileData.email)) {
        return {
          success: false,
          error: 'Formato de email invalido'
        };
      }
    }

    // Validar telefone se fornecido
    if (profileData.phone_number && profileData.phone_number.length > 20) {
      return {
        success: false,
        error: 'Telefone muito longo (max 20 caracteres)'
      };
    }

    // Validar plano se fornecido
    if (profileData.plan) {
      const validPlans = ['free', 'student', 'professional'];
      if (!validPlans.includes(profileData.plan)) {
        return {
          success: false,
          error: 'Plano invalido'
        };
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    state.userProfile = data;
    state.userPlan = data.plan || 'free';

    return {
      success: true,
      error: null
    };
  } catch (err) {
    console.error('Erro ao salvar perfil:', err);
    return {
      success: false,
      error: err.message || 'Erro desconhecido ao salvar perfil'
    };
  }
}

/**
 * Salva log de atendimento PCR
 * @param {object} pcrData - Dados do atendimento
 * @returns {Promise<{success: boolean, id: number, error: string}>}
 */
export async function savePCRLog(pcrData) {
  try {
    // Verificar autenticacao
    if (!state.user) {
      return {
        success: false,
        id: null,
        error: 'Usuario nao autenticado'
      };
    }

    // Validacao de entrada
    if (!pcrData || typeof pcrData !== 'object') {
      return {
        success: false,
        id: null,
        error: 'Dados do atendimento sao obrigatorios'
      };
    }

    // Validar campos numericos
    if (pcrData.duration && (typeof pcrData.duration !== 'number' || pcrData.duration < 0)) {
      return {
        success: false,
        id: null,
        error: 'Duracao deve ser um numero positivo'
      };
    }

    if (pcrData.shock_count && (typeof pcrData.shock_count !== 'number' || pcrData.shock_count < 0)) {
      return {
        success: false,
        id: null,
        error: 'Numero de choques deve ser um numero positivo'
      };
    }

    if (pcrData.time_to_first_shock && (typeof pcrData.time_to_first_shock !== 'number' || pcrData.time_to_first_shock < 0)) {
      return {
        success: false,
        id: null,
        error: 'Tempo ate primeiro choque deve ser um numero positivo'
      };
    }

    // Validar campos booleanos
    if (pcrData.rosc_achieved !== undefined && typeof pcrData.rosc_achieved !== 'boolean') {
      return {
        success: false,
        id: null,
        error: 'ROSC deve ser verdadeiro ou falso'
      };
    }

    // Validar strings se fornecidas
    if (pcrData.patient_name && pcrData.patient_name.length > 100) {
      return {
        success: false,
        id: null,
        error: 'Nome do paciente muito longo (max 100 caracteres)'
      };
    }

    if (pcrData.initial_rhythm && pcrData.initial_rhythm.length > 50) {
      return {
        success: false,
        id: null,
        error: 'Ritmo inicial muito longo (max 50 caracteres)'
      };
    }

    const { data, error } = await supabase
      .from('pcr_logs')
      .insert({
        user_id: state.user.id,
        ...pcrData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        id: null,
        error: error.message
      };
    }

    return {
      success: true,
      id: data.id,
      error: null
    };
  } catch (err) {
    console.error('Erro ao salvar log PCR:', err);
    return {
      success: false,
      id: null,
      error: err.message || 'Erro desconhecido ao salvar log'
    };
  }
}

/**
 * Carrega histórico de atendimentos do usuário
 * @param {number} limit - Número máximo de registros
 * @returns {Promise<Array>}
 */
export async function loadPCRLogs(limit = 50) {
  try {
    if (!state.user) {
      return [];
    }

    const { data, error } = await supabase
      .from('pcr_logs')
      .select('*')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao carregar logs:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Erro no loadPCRLogs:', err);
    return [];
  }
}

/**
 * Deleta log de atendimento
 * @param {number} logId - ID do log
 * @returns {Promise<boolean>}
 */
export async function deletePCRLog(logId) {
  try {
    const { error } = await supabase
      .from('pcr_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', state.user.id); // Segurança: só deleta se for do usuário

    if (error) {
      console.error('Erro ao deletar log:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Erro no deletePCRLog:', err);
    return false;
  }
}

/**
 * Carrega estatísticas do usuário
 * @returns {Promise<object>}
 */
export async function loadUserStats() {
  try {
    if (!state.user) {
      return {
        totalPCR: 0,
        roscRate: 0,
        avgShocks: 0,
        avgTimeToShock: 0
      };
    }

    const logs = await loadPCRLogs(999);

    const totalPCR = logs.length;
    const roscCount = logs.filter(log => log.rosc_achieved).length;
    const roscRate = totalPCR > 0 ? (roscCount / totalPCR * 100).toFixed(1) : 0;

    const totalShocks = logs.reduce((sum, log) => sum + (log.shock_count || 0), 0);
    const avgShocks = totalPCR > 0 ? (totalShocks / totalPCR).toFixed(1) : 0;

    const shockableLogs = logs.filter(log => log.time_to_first_shock);
    const avgTimeToShock = shockableLogs.length > 0
      ? Math.round(shockableLogs.reduce((sum, log) => sum + log.time_to_first_shock, 0) / shockableLogs.length)
      : null;

    return {
      totalPCR,
      roscRate,
      avgShocks,
      avgTimeToShock
    };
  } catch (err) {
    console.error('Erro no loadUserStats:', err);
    return {
      totalPCR: 0,
      roscRate: 0,
      avgShocks: 0,
      avgTimeToShock: 0
    };
  }
}

/**
 * Salva log de simulação clínica
 * @param {object} simulationData - Dados da simulação
 * @returns {Promise<{success: boolean, id: string, error: string}>}
 */
export async function saveSimulationLog(simulationData) {
  try {
    console.log('💾 [DB] Salvando log de simulação...');

    // Verificar autenticacao (opcional para simulador)
    if (!state.user) {
      console.warn('⚠️ [DB] Usuário não autenticado - log não será salvo');
      // Retornar sucesso mesmo sem salvar (modo offline/anônimo)
      return {
        success: true,
        id: null,
        error: null
      };
    }

    // Validacao de entrada
    if (!simulationData || typeof simulationData !== 'object') {
      return {
        success: false,
        id: null,
        error: 'Dados da simulação são obrigatórios'
      };
    }

    const { data, error } = await supabase
      .from('simulation_logs')
      .insert({
        user_id: state.user.id,
        case_id: simulationData.case_id,
        case_title: simulationData.case_title,
        difficulty: simulationData.difficulty,
        total_score: simulationData.total_score,
        total_steps: simulationData.total_steps,
        attempts: simulationData.attempts,
        duration_seconds: simulationData.duration_seconds,
        completed: simulationData.completed !== undefined ? simulationData.completed : true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [DB] Erro ao salvar log:', error);
      return {
        success: false,
        id: null,
        error: error.message
      };
    }

    console.log('✅ [DB] Log salvo com sucesso! ID:', data.id);

    return {
      success: true,
      id: data.id,
      error: null
    };
  } catch (err) {
    console.error('💥 [DB] Erro crítico ao salvar log:', err);
    return {
      success: false,
      id: null,
      error: err.message || 'Erro desconhecido ao salvar log'
    };
  }
}

/**
 * Carrega histórico de simulações do usuário
 * @param {number} limit - Número máximo de registros
 * @returns {Promise<Array>}
 */
export async function loadSimulationLogs(limit = 50) {
  try {
    if (!state.user) {
      return [];
    }

    const { data, error } = await supabase
      .from('simulation_logs')
      .select('*')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao carregar logs de simulação:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Erro no loadSimulationLogs:', err);
    return [];
  }
}

/**
 * =============================================
 * IMPORTANTE: DEBUG RLS (Row Level Security)
 * =============================================
 * Se você está recebendo erro "Nenhum caso encontrado" mesmo tendo dados no banco,
 * execute este SQL no Supabase > SQL Editor:
 *
 * alter table clinical_cases enable row level security;
 * create policy "Public Read" on clinical_cases for select using (true);
 * =============================================
 */

/**
 * Busca um caso clínico aleatório do Supabase (Simulador Avançado)
 * @param {string} excludeCaseId - ID do caso a ser excluído (opcional)
 * @returns {Promise<Object>} Caso clínico com todos os dados e game_flow válido
 * @throws {Error} Se houver erro de conexão, RLS ou nenhum caso encontrado
 */
export async function fetchRandomClinicalCase(excludeCaseId = null) {
  try {
    console.log('🔍 [SIAV] Iniciando busca de casos clínicos...');

    let data;
    const now = Date.now();

    // Verificar se o cache é válido
    if (casesCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('⚡ [SIAV] Usando cache de casos clínicos');
      data = casesCache;
    } else {
      console.log('🌐 [SIAV] Buscando casos do Supabase...');

      // Buscar casos clínicos com game_flow válido (não vazio) - otimizado
      const { data: fetchedData, error } = await supabase
        .from('clinical_cases')
        .select('id, title, difficulty, game_flow') // Buscar apenas campos necessários
        .not('game_flow', 'is', null)
        .limit(CASES_LIMIT);

      // Verificar erros do Supabase (incluindo RLS)
      if (error) {
        console.error('❌ [SIAV] Erro do Supabase:', error);
        if (error.code === 'PGRST301' || error.message.includes('policy')) {
          throw new Error('⚠️ Erro de Permissão RLS. Execute o SQL de configuração comentado em database.js');
        }
        throw new Error('Erro ao buscar caso clínico: ' + error.message);
      }

      // Verificar se há dados
      if (!fetchedData || fetchedData.length === 0) {
        throw new Error('Nenhum caso clínico encontrado. Verifique as Políticas RLS no Supabase.');
      }

      // Filtrar casos válidos
      const validCases = fetchedData.filter(c =>
        c.game_flow && Array.isArray(c.game_flow) && c.game_flow.length > 0
      );

      if (validCases.length === 0) {
        throw new Error('Nenhum caso com game_flow válido encontrado. Verifique os dados no Supabase.');
      }

      // Atualizar cache
      casesCache = validCases;
      cacheTimestamp = now;
      data = validCases;

      console.log(`✅ [SIAV] ${validCases.length} casos carregados e em cache`);
    }

    // Filtrar caso excluído se fornecido
    let availableCases = data;
    if (excludeCaseId) {
      availableCases = data.filter(c => c.id !== excludeCaseId);
      console.log(`🚫 [SIAV] Excluindo caso ${excludeCaseId}. Casos disponíveis: ${availableCases.length}`);
    }

    if (availableCases.length === 0) {
      throw new Error('Nenhum caso disponível após exclusão.');
    }

    // Selecionar um caso aleatório - otimizado
    const randomIndex = Math.floor(Math.random() * availableCases.length);
    const selectedCase = availableCases[randomIndex];

    console.log(`🎯 [SIAV] Caso selecionado: ${selectedCase.title} (${selectedCase.difficulty}) - ${selectedCase.game_flow.length} steps`);

    return selectedCase;

  } catch (err) {
    console.error('💥 [SIAV] ERRO CRÍTICO no fetchRandomClinicalCase:', err);
    console.error('📍 [SIAV] Stack trace:', err.stack);
    throw err; // Propagar erro para ser tratado na UI
  }
}

/**
 * Pré-carrega casos clínicos em background para performance instantânea
 * Deve ser chamado assim que a página carregar
 */
export function preloadClinicalCases() {
  // Evitar múltiplos carregamentos simultâneos
  if (preloadingPromise) return preloadingPromise;

  // Verificar se o cache já está válido
  if (casesCache && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    console.log('⚡ Cache já válido, pré-carregamento desnecessário');
    return Promise.resolve(casesCache);
  }

  console.log('🔄 Pré-carregando casos clínicos em background...');

  preloadingPromise = fetchRandomClinicalCase()
    .then(() => {
      console.log('✅ Casos pré-carregados com sucesso');
      preloadingPromise = null;
    })
    .catch(err => {
      console.warn('⚠️ Erro ao pré-carregar casos:', err.message);
      preloadingPromise = null;
    });

  return preloadingPromise;
}
