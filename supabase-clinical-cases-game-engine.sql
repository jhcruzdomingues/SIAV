-- =====================================================
-- GAME ENGINE: Simulador Avançado Interativo
-- =====================================================
-- Este script RECRIA a tabela clinical_cases com a estrutura de State Machine
-- ATENÇÃO: Isso VAI APAGAR a tabela existente e todos os dados!

-- =====================================================
-- PASSO 1: DROPAR TABELA EXISTENTE (SE HOUVER)
-- =====================================================

-- Primeiro, dropar as políticas RLS
DROP POLICY IF EXISTS "Permitir leitura pública de casos clínicos" ON clinical_cases;

-- Depois, dropar os índices
DROP INDEX IF EXISTS idx_clinical_cases_difficulty;
DROP INDEX IF EXISTS idx_clinical_cases_created_at;

-- Finalmente, dropar a tabela
DROP TABLE IF EXISTS clinical_cases CASCADE;

-- =====================================================
-- PASSO 2: CRIAR NOVA ESTRUTURA COM GAME ENGINE
-- =====================================================

CREATE TABLE clinical_cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('facil', 'medio', 'dificil')),

    -- Sinais vitais iniciais (antes do jogo começar)
    initial_vitals JSONB NOT NULL,

    -- GAME FLOW: Array de etapas (State Machine)
    game_flow JSONB NOT NULL,

    -- Metadados
    estimated_duration_minutes INTEGER DEFAULT 5,
    learning_objectives TEXT[],
    tags TEXT[],

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PASSO 3: INSERIR CASO CLÍNICO COMPLETO DE EXEMPLO
-- =====================================================
-- Caso: PCR em Fibrilação Ventricular com Evolução Completa

INSERT INTO clinical_cases (
    title,
    description,
    difficulty,
    initial_vitals,
    game_flow,
    estimated_duration_minutes,
    learning_objectives,
    tags
) VALUES (
    'PCR Testemunhada - Fibrilação Ventricular',

    'Homem de 58 anos colapsa subitamente durante refeição. Testemunhas relatam que ele levou a mão ao peito antes de cair. Não responde a estímulos. DEA conectado.',

    'dificil',

    -- Sinais Vitais Iniciais (JSON)
    '{
        "fc": 0,
        "pa": "Indetectável",
        "spo2": "Sem leitura",
        "fr": 0,
        "consciencia": "Inconsciente",
        "ritmo_inicial": "Fibrilação Ventricular"
    }'::jsonb,

    -- GAME FLOW: Array de 5 Etapas (JSON)
    '[
        {
            "step_id": 1,
            "title": "Reconhecimento da PCR",
            "monitor": {
                "fc": 0,
                "pa": "0/0",
                "spo2": 0,
                "ritmo": "Fibrilação Ventricular",
                "ritmo_visual": "fv"
            },
            "message": "Paciente colapsado. Monitor conectado mostra o traçado ao lado. Sem pulso carotídeo. Qual a conduta IMEDIATA?",
            "options": [
                {
                    "id": "a",
                    "text": "Intubar imediatamente",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Na PCR, a prioridade é C-A-B (Compressões-Via Aérea-Respiração). A intubação não é a primeira ação em FV/TV sem pulso.",
                    "points": -10
                },
                {
                    "id": "b",
                    "text": "Aplicar choque (Desfibrilação)",
                    "correct": true,
                    "feedback": "✅ CORRETO! FV é ritmo CHOCÁVEL. Desfibrilação imediata é a conduta correta em PCR testemunhada com ritmo chocável.",
                    "points": 50,
                    "next_step": 2
                },
                {
                    "id": "c",
                    "text": "Administrar Adrenalina 1mg IV",
                    "correct": false,
                    "feedback": "❌ INCORRETO! A adrenalina é importante, mas o PRIMEIRO passo em FV é a desfibrilação. Adrenalina vem depois do choque e RCP.",
                    "points": -10
                },
                {
                    "id": "d",
                    "text": "Obter acesso venoso primeiro",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Não atrase a desfibrilação! Em FV/TV sem pulso, o choque deve ser aplicado o mais rápido possível.",
                    "points": -10
                }
            ]
        },
        {
            "step_id": 2,
            "title": "Pós-Choque Imediato",
            "monitor": {
                "fc": 0,
                "pa": "0/0",
                "spo2": 0,
                "ritmo": "Assistolia",
                "ritmo_visual": "assistolia"
            },
            "message": "Choque de 200J aplicado. Ritmo mudou para Assistolia. Sem pulso. Qual o próximo passo?",
            "options": [
                {
                    "id": "a",
                    "text": "Checar pulso imediatamente",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Após o choque, NÃO cheque pulso imediatamente. Retome RCP por 2 minutos antes de avaliar ritmo/pulso.",
                    "points": -10
                },
                {
                    "id": "b",
                    "text": "Retomar RCP por 2 minutos",
                    "correct": true,
                    "feedback": "✅ CORRETO! Após desfibrilação, retome RCP imediatamente por 2 minutos (5 ciclos de 30:2). Não interrompa para checar pulso.",
                    "points": 50,
                    "next_step": 3
                },
                {
                    "id": "c",
                    "text": "Aplicar outro choque imediatamente",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Assistolia NÃO é ritmo chocável. O correto é RCP de alta qualidade + medicações (Adrenalina).",
                    "points": -10
                },
                {
                    "id": "d",
                    "text": "Cessar esforços (óbito)",
                    "correct": false,
                    "feedback": "❌ MUITO INCORRETO! PCR testemunhada com apenas 1 choque aplicado. Continue a RCP! Nunca desista tão cedo.",
                    "points": -20
                }
            ]
        },
        {
            "step_id": 3,
            "title": "Manejo de Assistolia",
            "monitor": {
                "fc": 0,
                "pa": "0/0",
                "spo2": 0,
                "ritmo": "Assistolia",
                "ritmo_visual": "assistolia"
            },
            "message": "2 minutos de RCP realizados. Ritmo continua Assistolia. Acesso venoso obtido. Qual a medicação indicada?",
            "options": [
                {
                    "id": "a",
                    "text": "Amiodarona 300mg IV",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Amiodarona é para ritmos CHOCÁVEIS (FV/TV). Em Assistolia/AESP, a droga correta é Adrenalina.",
                    "points": -10
                },
                {
                    "id": "b",
                    "text": "Adrenalina 1mg IV",
                    "correct": true,
                    "feedback": "✅ CORRETO! Adrenalina 1mg IV é a droga de escolha para ritmos NÃO-CHOCÁVEIS (Assistolia/AESP). Repetir a cada 3-5 min.",
                    "points": 50,
                    "next_step": 4
                },
                {
                    "id": "c",
                    "text": "Atropina 1mg IV",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Atropina foi REMOVIDA do protocolo de PCR em 2020. Não tem benefício comprovado em Assistolia.",
                    "points": -15
                },
                {
                    "id": "d",
                    "text": "Lidocaína 1mg/kg IV",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Lidocaína é alternativa à Amiodarona em FV/TV refratária. Não é indicada em Assistolia.",
                    "points": -10
                }
            ]
        },
        {
            "step_id": 4,
            "title": "Reversão de Ritmo",
            "monitor": {
                "fc": 45,
                "pa": "60/40",
                "spo2": 82,
                "ritmo": "Bradicardia Sinusal",
                "ritmo_visual": "bradicardia"
            },
            "message": "Após 4 minutos de RCP + Adrenalina, o monitor mostra ritmo organizado. Pulso carotídeo presente, mas fraco. O que fazer?",
            "options": [
                {
                    "id": "a",
                    "text": "Continuar compressões torácicas",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Há pulso palpável = RCE (Retorno da Circulação Espontânea). Pare as compressões e foque em suporte pós-PCR.",
                    "points": -10
                },
                {
                    "id": "b",
                    "text": "Cessar RCP e otimizar suporte",
                    "correct": true,
                    "feedback": "✅ CORRETO! RCE alcançado! Agora foque em: ventilar adequadamente, monitorizar, tratar hipotensão e preparar UTI.",
                    "points": 50,
                    "next_step": 5
                },
                {
                    "id": "c",
                    "text": "Aplicar choque profilático",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Bradicardia Sinusal com pulso NÃO é ritmo chocável. Choque só em FV/TV sem pulso.",
                    "points": -15
                },
                {
                    "id": "d",
                    "text": "Administrar mais Adrenalina",
                    "correct": false,
                    "feedback": "❌ INCORRETO! RCE foi alcançado. Adrenalina em excesso pode causar hipertensão grave e arritmias. Ajuste conforme necessário.",
                    "points": -10
                }
            ]
        },
        {
            "step_id": 5,
            "title": "Cuidados Pós-RCE",
            "monitor": {
                "fc": 88,
                "pa": "110/70",
                "spo2": 95,
                "ritmo": "Ritmo Sinusal",
                "ritmo_visual": "sinusal"
            },
            "message": "Paciente com RCE sustentado. PA 110/70, SpO₂ 95%, FC 88bpm. Qual a PRIORIDADE no pós-PCR?",
            "options": [
                {
                    "id": "a",
                    "text": "Transferir para enfermaria imediatamente",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Pós-PCR requer UTI, não enfermaria. Paciente crítico precisa monitorização avançada e suporte intensivo.",
                    "points": -10
                },
                {
                    "id": "b",
                    "text": "Otimizar ventilação, sedação e hipotermia terapêutica",
                    "correct": true,
                    "feedback": "✅ PERFEITO! Cuidados pós-PCR: 1) Ventilar adequadamente (evitar hiper/hipoventilação), 2) Considerar hipotermia terapêutica (32-36°C), 3) Tratar causas reversíveis.",
                    "points": 100,
                    "next_step": null
                },
                {
                    "id": "c",
                    "text": "Aplicar novas doses de Adrenalina",
                    "correct": false,
                    "feedback": "❌ INCORRETO! RCE estável não requer mais Adrenalina. Evite vasopressores desnecessários (risco de arritmias).",
                    "points": -10
                },
                {
                    "id": "d",
                    "text": "Aguardar despertar espontâneo",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Pós-PCR requer INTERVENÇÃO ATIVA: sedação, hipotermia, ventilação otimizada. Não é manejo passivo.",
                    "points": -10
                }
            ]
        }
    ]'::jsonb,

    5,  -- estimated_duration_minutes

    ARRAY[
        'Reconhecer ritmos de PCR (FV/TV, Assistolia/AESP)',
        'Aplicar protocolo ACLS de forma sequencial',
        'Tomar decisões rápidas sob pressão',
        'Compreender farmacologia da PCR'
    ],  -- learning_objectives

    ARRAY['PCR', 'ACLS', 'FV', 'Desfibrilação', 'Adrenalina', 'RCE']  -- tags
);

-- =====================================================
-- PASSO 4: ADICIONAR MAIS CASOS (OPCIONAL)
-- =====================================================

-- Caso 2: Taquicardia Instável (Mais Simples)
INSERT INTO clinical_cases (
    title,
    description,
    difficulty,
    initial_vitals,
    game_flow,
    estimated_duration_minutes,
    learning_objectives,
    tags
) VALUES (
    'Taquicardia Supraventricular Instável',

    'Mulher de 62 anos com palpitações intensas há 30 minutos. Confusa, tontura, PA baixa.',

    'medio',

    '{
        "fc": 180,
        "pa": "85/60",
        "spo2": 92,
        "fr": 24,
        "consciencia": "Confusa",
        "ritmo_inicial": "Taquicardia Supraventricular"
    }'::jsonb,

    '[
        {
            "step_id": 1,
            "title": "Taquicardia com Instabilidade",
            "monitor": {
                "fc": 180,
                "pa": "85/60",
                "spo2": 92,
                "ritmo": "Taquicardia Supraventricular",
                "ritmo_visual": "taquicardia"
            },
            "message": "FC: 180bpm. PA: 85/60. Paciente confusa. Qual a conduta?",
            "options": [
                {
                    "id": "a",
                    "text": "Administrar Adenosina 6mg IV",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Adenosina é para paciente ESTÁVEL. Esta paciente está INSTÁVEL (hipotensa + alterada). Cardioversão sincronizada!",
                    "points": -10
                },
                {
                    "id": "b",
                    "text": "Cardioversão sincronizada 100J",
                    "correct": true,
                    "feedback": "✅ CORRETO! Taquicardia com sinais de instabilidade (PA baixa + confusão) = Cardioversão SINCRONIZADA urgente.",
                    "points": 100,
                    "next_step": 2
                },
                {
                    "id": "c",
                    "text": "Manobra de Valsalva",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Manobras vagais são para pacientes ESTÁVEIS. Esta paciente precisa de cardioversão imediata.",
                    "points": -10
                },
                {
                    "id": "d",
                    "text": "Desfibrilação assíncrona 200J",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Desfibrilação assíncrona é para FV/TV SEM pulso. Aqui temos pulso = Cardioversão SINCRONIZADA.",
                    "points": -15
                }
            ]
        },
        {
            "step_id": 2,
            "title": "Pós-Cardioversão",
            "monitor": {
                "fc": 75,
                "pa": "120/75",
                "spo2": 98,
                "ritmo": "Ritmo Sinusal",
                "ritmo_visual": "sinusal"
            },
            "message": "Cardioversão bem-sucedida! FC: 75bpm, PA: 120/75. Paciente alerta. Próximo passo?",
            "options": [
                {
                    "id": "a",
                    "text": "Liberar para casa imediatamente",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Pós-cardioversão requer observação hospitalar por 6-24h. Risco de recorrência e complicações.",
                    "points": -10
                },
                {
                    "id": "b",
                    "text": "Monitorizar e avaliar causa (ECG, enzimas, eletrólitos)",
                    "correct": true,
                    "feedback": "✅ CORRETO! Investigar causa da taquicardia (isquemia? distúrbio eletrolítico? tireotoxicose?) e monitorar.",
                    "points": 100,
                    "next_step": null
                },
                {
                    "id": "c",
                    "text": "Aplicar nova cardioversão profilática",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Ritmo sinusal estável. Cardioversão adicional é desnecessária e prejudicial.",
                    "points": -15
                },
                {
                    "id": "d",
                    "text": "Administrar beta-bloqueador IV imediato",
                    "correct": false,
                    "feedback": "⚠️ PARCIALMENTE CORRETO. Pode ser indicado, mas PRIMEIRO investigue a causa e estabilize completamente.",
                    "points": 10
                }
            ]
        }
    ]'::jsonb,

    3,

    ARRAY['Reconhecer taquicardia instável', 'Aplicar cardioversão sincronizada', 'Diferenciar cardioversão de desfibrilação'],

    ARRAY['Taquicardia', 'Cardioversão', 'ACLS', 'Arritmia']
);

-- =====================================================
-- PASSO 5: RECRIAR ÍNDICES E RLS
-- =====================================================

-- Índices
CREATE INDEX idx_clinical_cases_difficulty ON clinical_cases(difficulty);
CREATE INDEX idx_clinical_cases_created_at ON clinical_cases(created_at DESC);

-- Row Level Security
ALTER TABLE clinical_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública de casos clínicos"
ON clinical_cases
FOR SELECT
TO public
USING (true);

-- =====================================================
-- PASSO 6: COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE clinical_cases IS 'Game Engine para Simulador Avançado - State Machine com etapas interativas';
COMMENT ON COLUMN clinical_cases.game_flow IS 'Array JSON de etapas do jogo (step_id, monitor, message, options)';
COMMENT ON COLUMN clinical_cases.learning_objectives IS 'Array de objetivos de aprendizado do caso';
COMMENT ON COLUMN clinical_cases.tags IS 'Tags para busca e categorização';

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Contar casos inseridos
SELECT
    COUNT(*) as total_casos,
    difficulty,
    COUNT(*) FILTER (WHERE jsonb_array_length(game_flow) > 0) as casos_com_game_flow
FROM clinical_cases
GROUP BY difficulty;

-- Mostrar estrutura do primeiro caso
SELECT
    title,
    difficulty,
    jsonb_array_length(game_flow) as total_steps,
    estimated_duration_minutes
FROM clinical_cases
LIMIT 5;
