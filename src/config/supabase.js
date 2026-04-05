// =============================================
// SUPABASE - CONEXÃO ÚNICA E SIMPLES
// =============================================
// Edite apenas as duas linhas abaixo com as credenciais do seu projeto
const SUPABASE_URL = 'https://lfcjrjshlybmurnvulvh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Y6tEzLt7PPf0aRqqB_7bqA_9lHu6OQZ';

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
