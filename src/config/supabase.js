/**
 * =============================================
 * CONFIGURAÇÃO SEGURA DO SUPABASE
 * =============================================
 * Este arquivo configura o cliente Supabase de forma segura.
 *
 * IMPORTANTE:
 * - Em produção, use variáveis de ambiente
 * - Nunca commite credenciais no código
 * - Implemente RLS (Row Level Security) no Supabase
 */

/**
 * Obtém configurações do Supabase de forma segura
 * Prioridade: 1) Variáveis de ambiente, 2) Arquivo .env, 3) Configuração local
 */
function getSupabaseConfig() {
  // Tenta obter do processo (Node.js/Vite)
  if (typeof process !== 'undefined' && process.env) {
    return {
      url: process.env.VITE_SUPABASE_URL,
      anonKey: process.env.VITE_SUPABASE_ANON_KEY
    };
  }

  // Fallback: Tenta obter de window (injetado por build tool)
  if (typeof window !== 'undefined' && window.__SUPABASE_CONFIG__) {
    return window.__SUPABASE_CONFIG__;
  }

  // AVISO: Modo desenvolvimento - NÃO use em produção!
  // TODO: Remover estas credenciais antes do deploy em produção
  return {
    url: 'https://hrdvtcvzmwdxpabwxbyj.supabase.co',
    anonKey: 'sb_publishable_un-kcAMbu_2qtai0SCpkog_Zb_ksOvz'
  };
}

// Configuração
const config = getSupabaseConfig();

// Validação
if (!config.url || !config.anonKey) {
  throw new Error('❌ Credenciais do Supabase não configuradas! Verifique as variáveis de ambiente.');
}

// Inicializa o cliente Supabase

// Inicializa o cliente Supabase e expõe globalmente para scripts legados
let supabase = null;
if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
  supabase = window.supabase.createClient(config.url, config.anonKey);
  window.supabaseClient = supabase;
  console.log('✅ Supabase client criado com sucesso:', supabase);
} else {
  console.error('❌ Biblioteca Supabase não encontrada no window.supabase. Verifique o CDN.');
}

if (!supabase) {
  throw new Error('❌ Biblioteca Supabase não carregada! Certifique-se de incluir o CDN no HTML.');
}

// Exporta o cliente
export { supabase, config };
