-- =============================================
-- SCRIPT DE CORREÇÃO: Limpar dados antigos e reinserir corretos
-- Execute este SQL no Supabase > SQL Editor
-- =============================================

-- 1. DELETAR TODOS OS DADOS ANTIGOS
DELETE FROM clinical_cases;

-- 2. REINSERIR DADOS COM ESTRUTURA CORRETA
INSERT INTO clinical_cases (title, description, difficulty, initial_vitals, game_flow, estimated_duration_minutes, learning_objectives, tags)
VALUES
(
    'PCR em Fibrilação Ventricular',
    'Paciente de 55 anos encontrado caído. Ausência de pulso e respiração. Monitor mostra Fibrilação Ventricular.',
    'medio',
    '{"fc": 0, "pa": "0/0", "spo2": 0, "ritmo": "FV"}'::jsonb,
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
            "title": "Pós-Desfibrilação",
            "monitor": {
                "fc": 0,
                "pa": "0/0",
                "spo2": 0,
                "ritmo": "Fibrilação Ventricular",
                "ritmo_visual": "fv"
            },
            "message": "Choque de 200J aplicado. Paciente permanece em FV. Qual a próxima conduta?",
            "options": [
                {
                    "id": "a",
                    "text": "Aplicar outro choque imediatamente",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Após o primeiro choque, deve-se iniciar RCP de alta qualidade por 2 minutos ANTES do próximo choque.",
                    "points": -10
                },
                {
                    "id": "b",
                    "text": "Iniciar RCP de alta qualidade (100-120 compressões/min)",
                    "correct": true,
                    "feedback": "✅ CORRETO! Após a desfibrilação, iniciar RCP imediatamente. Não verificar pulso ou ritmo. RCP por 2 minutos.",
                    "points": 50,
                    "next_step": 3
                },
                {
                    "id": "c",
                    "text": "Verificar pulso carotídeo",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Não perca tempo verificando pulso. Após o choque, inicie RCP imediatamente por 2 minutos.",
                    "points": -10
                },
                {
                    "id": "d",
                    "text": "Administrar Amiodarona 300mg IV",
                    "correct": false,
                    "feedback": "❌ INCORRETO! A Amiodarona é administrada após o 3º choque, não após o primeiro. Agora o foco é RCP de qualidade.",
                    "points": -10
                }
            ]
        },
        {
            "step_id": 3,
            "title": "Retorno da Circulação",
            "monitor": {
                "fc": 78,
                "pa": "110/70",
                "spo2": 94,
                "ritmo": "Sinusal",
                "ritmo_visual": "sinusal"
            },
            "message": "Após 2 minutos de RCP, monitor mostra ritmo sinusal. Paciente com pulso palpável e respiração espontânea. RCE (Retorno da Circulação Espontânea) obtido! Próxima conduta?",
            "options": [
                {
                    "id": "a",
                    "text": "Interromper todo suporte, paciente recuperado",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Mesmo com RCE, o paciente precisa de cuidados pós-PCR intensivos (suporte ventilatório, monitorização, hipotermia terapêutica).",
                    "points": -10
                },
                {
                    "id": "b",
                    "text": "Transferir para UTI e iniciar cuidados pós-PCR",
                    "correct": true,
                    "feedback": "✅ CORRETO! RCE obtido! Agora iniciar cuidados pós-PCR: manter saturação 94-98%, evitar hiper/hipotensão, considerar hipotermia terapêutica.",
                    "points": 100,
                    "next_step": null
                },
                {
                    "id": "c",
                    "text": "Aplicar mais um choque preventivo",
                    "correct": false,
                    "feedback": "❌ INCORRETO! O paciente tem pulso e ritmo organizado. Não há indicação de choque. Foco nos cuidados pós-PCR.",
                    "points": -10
                },
                {
                    "id": "d",
                    "text": "Administrar Adrenalina 1mg",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Com RCE estabelecido, não há indicação de adrenalina. Foco na estabilização hemodinâmica.",
                    "points": -10
                }
            ]
        }
    ]'::jsonb,
    10,
    ARRAY['Reconhecer PCR em FV', 'Protocolo de desfibrilação', 'RCP de alta qualidade', 'Cuidados pós-RCE'],
    ARRAY['PCR', 'FV', 'Desfibrilação', 'ACLS', 'RCP']
),
(
    'ACLS: Bradicardia Sintomática',
    'Paciente de 70 anos, tontura e dor no peito. ECG mostra Bloqueio AV de 3º grau.',
    'medio',
    '{"fc": 35, "pa": "80/50", "spo2": 88, "ritmo": "BAV Total"}'::jsonb,
    '[
        {
            "step_id": 1,
            "title": "Abordagem Inicial",
            "monitor": {
                "fc": 35,
                "pa": "80/50",
                "spo2": 88,
                "ritmo": "Bloqueio AV Total"
            },
            "message": "Paciente com tontura intensa, dispneia e dor torácica. Monitor mostra FC de 35 bpm. PA 80/50 mmHg. Qual a conduta imediata?",
            "options": [
                {
                    "id": "a",
                    "text": "Observar evolução, bradicardia leve",
                    "correct": false,
                    "feedback": "❌ INCORRETO! O paciente está SINTOMÁTICO (tontura, hipotensão, dor torácica). Bradicardia sintomática requer tratamento imediato!",
                    "points": -10
                },
                {
                    "id": "b",
                    "text": "Administrar Atropina 1mg IV",
                    "correct": true,
                    "feedback": "✅ CORRETO! Atropina é a primeira linha em bradicardia sintomática. Dose: 1mg IV, pode repetir a cada 3-5 min até 3mg total.",
                    "points": 50,
                    "next_step": 2
                },
                {
                    "id": "c",
                    "text": "Aplicar desfibrilação",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Bradicardia não é ritmo chocável. O tratamento é com medicações (atropina) ou marcapasso.",
                    "points": -10
                },
                {
                    "id": "d",
                    "text": "Administrar Adenosina 6mg",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Adenosina é para TAQUICARDIA supraventricular, não bradicardia. Pode piorar o quadro!",
                    "points": -15
                }
            ]
        },
        {
            "step_id": 2,
            "title": "Marcapasso Transcutâneo",
            "monitor": {
                "fc": 38,
                "pa": "85/55",
                "spo2": 90,
                "ritmo": "Bloqueio AV Total"
            },
            "message": "Atropina administrada, porém FC permanece em 38 bpm e paciente ainda sintomático. Próxima conduta?",
            "options": [
                {
                    "id": "a",
                    "text": "Repetir Atropina 1mg",
                    "correct": false,
                    "feedback": "⚠️ PARCIALMENTE CORRETO. Pode repetir atropina, mas em BAV total a resposta é limitada. Melhor opção é o marcapasso transcutâneo.",
                    "points": 10
                },
                {
                    "id": "b",
                    "text": "Iniciar Marcapasso Transcutâneo",
                    "correct": true,
                    "feedback": "✅ CORRETO! Bradicardia sintomática refratária à atropina: indicação de marcapasso transcutâneo imediato enquanto prepara o transvenoso.",
                    "points": 100,
                    "next_step": null
                },
                {
                    "id": "c",
                    "text": "Aguardar transporte para hemodinâmica",
                    "correct": false,
                    "feedback": "❌ INCORRETO! Não aguarde! Paciente instável precisa de intervenção imediata (marcapasso). Não pode esperar procedimento eletivo.",
                    "points": -10
                },
                {
                    "id": "d",
                    "text": "Iniciar dopamina em infusão contínua",
                    "correct": false,
                    "feedback": "⚠️ Dopamina/Epinefrina são alternativas quando marcapasso não está disponível. Mas se disponível, marcapasso é superior.",
                    "points": 15
                }
            ]
        }
    ]'::jsonb,
    8,
    ARRAY['Reconhecer bradicardia sintomática', 'Uso de Atropina', 'Indicações de marcapasso', 'Manejo de BAV total'],
    ARRAY['Bradicardia', 'ACLS', 'BAV', 'Atropina', 'Marcapasso']
);

-- 3. VERIFICAR INSERÇÃO
SELECT
    id,
    title,
    difficulty,
    jsonb_array_length(game_flow) as total_steps,
    (game_flow->0->'options'->0->>'id') as first_option_id_check
FROM clinical_cases;
