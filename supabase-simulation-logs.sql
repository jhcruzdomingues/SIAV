-- =============================================
-- TABELA DE LOGS DE SIMULAÇÕES CLÍNICAS
-- Execute este SQL no Supabase > SQL Editor
-- =============================================

-- 1. CRIAR TABELA
CREATE TABLE IF NOT EXISTS simulation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    case_id UUID REFERENCES clinical_cases(id) ON DELETE SET NULL,
    case_title VARCHAR(200) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    total_score INTEGER NOT NULL DEFAULT 0,
    total_steps INTEGER NOT NULL,
    attempts JSONB NOT NULL, -- Array de tentativas: [{step, option, correct, points}]
    duration_seconds INTEGER NOT NULL, -- Tempo total em segundos
    completed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_simulation_logs_user_id ON simulation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_simulation_logs_created_at ON simulation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_simulation_logs_case_id ON simulation_logs(case_id);

-- 3. HABILITAR RLS (Row Level Security)
ALTER TABLE simulation_logs ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS

-- Usuários podem ler apenas seus próprios logs
CREATE POLICY "Users can read own simulation logs"
ON simulation_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Usuários podem inserir seus próprios logs
CREATE POLICY "Users can insert own simulation logs"
ON simulation_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Usuários podem deletar seus próprios logs
CREATE POLICY "Users can delete own simulation logs"
ON simulation_logs
FOR DELETE
USING (auth.uid() = user_id);

-- 5. VERIFICAR CRIAÇÃO
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'simulation_logs'
ORDER BY ordinal_position;
