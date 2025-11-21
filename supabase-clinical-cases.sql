-- =====================================================
-- TABELA: clinical_cases (Simulador Avançado)
-- =====================================================
-- Casos clínicos complexos para treinamento avançado
-- Requer conexão online para acesso

CREATE TABLE IF NOT EXISTS clinical_cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    initial_vitals JSONB NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('facil', 'medio', 'dificil')),
    correct_sequence JSONB NOT NULL,
    expected_interventions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SEED DATA: 3 Casos Clínicos de Exemplo
-- =====================================================

INSERT INTO clinical_cases (title, description, initial_vitals, difficulty, correct_sequence, expected_interventions) VALUES

-- CASO 1: Taquicardia Instável (Médio)
(
    'Paciente com Taquicardia Instável',
    'Mulher de 62 anos, hipertensa, chega ao pronto-socorro com palpitações e tontura há 30 minutos. Relata "coração acelerado" e sensação de desmaio. Nega dor torácica. Não estava em atividade física.',
    '{
        "fc": 180,
        "pa": "85/60",
        "spo2": 92,
        "fr": 24,
        "consciencia": "Confusa",
        "ritmo_inicial": "Taquicardia Supraventricular"
    }'::jsonb,
    'medio',
    '["Monitorizar ECG e sinais vitais", "Obter acesso venoso", "Administrar oxigênio", "Cardioversão sincronizada 100J", "Reavaliar ritmo"]'::jsonb,
    '["Oxigênio", "Monitorização", "Cardioversão Sincronizada"]'::jsonb
),

-- CASO 2: PCR em Fibrilação Ventricular (Difícil)
(
    'Paciente em Parada Cardiorrespiratória - FV',
    'Homem de 58 anos, diabético e obeso, colapsa subitamente durante refeição em restaurante. Testemunhas relatam que ele levou a mão ao peito antes de cair. Não responde a estímulos. DEA conectado identifica ritmo chocável.',
    '{
        "fc": 0,
        "pa": "Ausente",
        "spo2": "Indetectável",
        "fr": 0,
        "consciencia": "Inconsciente",
        "ritmo_inicial": "Fibrilação Ventricular"
    }'::jsonb,
    'dificil',
    '["Iniciar RCP imediatamente", "Aplicar choque bifásico 200J", "Retomar RCP por 2 minutos", "Administrar Adrenalina 1mg IV", "Checar ritmo", "Aplicar 2º choque se FV persistir", "Administrar Amiodarona 300mg IV"]'::jsonb,
    '["RCP de Alta Qualidade", "Desfibrilação", "Adrenalina", "Amiodarona", "Via aérea avançada"]'::jsonb
),

-- CASO 3: Bradicardia Sintomática (Fácil)
(
    'Idosa com Bradicardia Sintomática',
    'Paciente de 78 anos, portadora de marca-passo antigo, apresenta fraqueza progressiva, tontura e sudorese. Familiares relatam que ela está "mais lenta" há algumas horas. Nega dor torácica ou dispneia.',
    '{
        "fc": 38,
        "pa": "90/60",
        "spo2": 94,
        "fr": 18,
        "consciencia": "Alerta, mas sonolenta",
        "ritmo_inicial": "Bradicardia Sinusal"
    }'::jsonb,
    'facil',
    '["Monitorizar sinais vitais", "Administrar Oxigênio", "Obter acesso venoso", "Administrar Atropina 0.5mg IV", "Preparar marca-passo transcutâneo se não responder"]'::jsonb,
    '["Oxigênio", "Atropina", "Marca-passo transcutâneo (se necessário)"]'::jsonb
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Permite leitura pública dos casos clínicos
-- (Apenas leitura, sem inserção/edição por usuários)

ALTER TABLE clinical_cases ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem LER os casos clínicos
CREATE POLICY "Permitir leitura pública de casos clínicos"
ON clinical_cases
FOR SELECT
TO public
USING (true);

-- Política: Apenas admins podem INSERIR/ATUALIZAR/DELETAR
-- (Opcional - descomente se quiser restringir escrita)
-- CREATE POLICY "Apenas admins podem modificar casos"
-- ON clinical_cases
-- FOR ALL
-- TO authenticated
-- USING (auth.role() = 'admin');

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_clinical_cases_difficulty
ON clinical_cases(difficulty);

CREATE INDEX IF NOT EXISTS idx_clinical_cases_created_at
ON clinical_cases(created_at DESC);

-- =====================================================
-- COMENTÁRIOS NA TABELA
-- =====================================================

COMMENT ON TABLE clinical_cases IS 'Casos clínicos avançados para simulador online do SIAV';
COMMENT ON COLUMN clinical_cases.title IS 'Título resumido do caso clínico';
COMMENT ON COLUMN clinical_cases.description IS 'Cenário completo apresentado ao usuário';
COMMENT ON COLUMN clinical_cases.initial_vitals IS 'Sinais vitais iniciais (JSON)';
COMMENT ON COLUMN clinical_cases.difficulty IS 'Nível: facil, medio, dificil';
COMMENT ON COLUMN clinical_cases.correct_sequence IS 'Sequência correta de ações esperadas (array JSON)';
COMMENT ON COLUMN clinical_cases.expected_interventions IS 'Intervenções-chave do protocolo (array JSON)';
