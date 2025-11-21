-- =============================================
-- CASOS CLÍNICOS COM SISTEMA DE BRANCHING
-- (Árvore de Decisões - Cada escolha tem consequências)
-- =============================================

-- 1. DELETAR TODOS OS DADOS ANTIGOS
DELETE FROM clinical_cases;

-- 2. INSERIR CASOS COM BRANCHING COMPLETO
INSERT INTO clinical_cases (title, description, difficulty, initial_vitals, game_flow, estimated_duration_minutes, learning_objectives, tags)
VALUES
(
    'PCR em Fibrilação Ventricular - Branching',
    'Paciente de 55 anos encontrado caído. Ausência de pulso e respiração. Monitor mostra Fibrilação Ventricular. Suas decisões afetarão o desfecho!',
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
                "ritmo": "Fibrilação Ventricular"
            },
            "message": "Paciente colapsado. Monitor conectado mostra FV. Sem pulso carotídeo. Qual a conduta IMEDIATA?",
            "options": [
                {
                    "id": "a",
                    "text": "Intubar imediatamente antes de tudo",
                    "correct": false,
                    "feedback": "❌ ERRO CRÍTICO! Você perdeu tempo precioso intubando. O paciente permaneceu em FV sem RCP por 2 minutos. Cérebro sofrendo hipóxia!",
                    "points": -20,
                    "next_step": 10
                },
                {
                    "id": "b",
                    "text": "Aplicar choque (Desfibrilação) IMEDIATAMENTE",
                    "correct": true,
                    "feedback": "✅ CORRETO! FV é ritmo CHOCÁVEL. Desfibrilação imediata é a conduta correta em PCR testemunhada com ritmo chocável.",
                    "points": 50,
                    "next_step": 2
                },
                {
                    "id": "c",
                    "text": "Administrar Adrenalina 1mg IV primeiro",
                    "correct": false,
                    "feedback": "❌ ERRO! Você atrasou a desfibrilação procurando acesso venoso e preparando adrenalina. 90 segundos perdidos!",
                    "points": -15,
                    "next_step": 11
                },
                {
                    "id": "d",
                    "text": "Obter acesso venoso primeiro",
                    "correct": false,
                    "feedback": "❌ ERRO! Você atrasou a desfibrilação em 60 segundos. A cada minuto sem choque, sobrevida cai 7-10%!",
                    "points": -15,
                    "next_step": 11
                }
            ]
        },
        {
            "step_id": 2,
            "title": "Pós-Desfibrilação (Caminho Correto)",
            "monitor": {
                "fc": 0,
                "pa": "0/0",
                "spo2": 0,
                "ritmo": "Fibrilação Ventricular"
            },
            "message": "Choque de 200J aplicado. Paciente permanece em FV. Qual a próxima conduta?",
            "options": [
                {
                    "id": "a",
                    "text": "Aplicar outro choque imediatamente",
                    "correct": false,
                    "feedback": "❌ ERRO! Choques repetidos sem RCP reduzem eficácia. Miocárdio precisa de perfusão!",
                    "points": -10,
                    "next_step": 12
                },
                {
                    "id": "b",
                    "text": "Iniciar RCP de alta qualidade (30:2)",
                    "correct": true,
                    "feedback": "✅ CORRETO! RCP de alta qualidade por 2 minutos. Compressões 100-120/min, profundidade 5-6cm.",
                    "points": 50,
                    "next_step": 3
                },
                {
                    "id": "c",
                    "text": "Verificar pulso carotídeo",
                    "correct": false,
                    "feedback": "❌ ERRO! Você perdeu 15 segundos checando pulso. Não atrase RCP!",
                    "points": -5,
                    "next_step": 12
                },
                {
                    "id": "d",
                    "text": "Administrar Amiodarona 300mg IV",
                    "correct": false,
                    "feedback": "❌ ERRO! Amiodarona é após 3º choque. Agora precisa de RCP urgente!",
                    "points": -10,
                    "next_step": 12
                }
            ]
        },
        {
            "step_id": 3,
            "title": "Após 2min de RCP (Caminho Ótimo)",
            "monitor": {
                "fc": 78,
                "pa": "110/70",
                "spo2": 94,
                "ritmo": "Sinusal"
            },
            "message": "Após RCP de alta qualidade, monitor mostra ritmo sinusal! Pulso palpável, respiração espontânea. RCE obtido! Próxima conduta?",
            "options": [
                {
                    "id": "a",
                    "text": "Interromper todo suporte",
                    "correct": false,
                    "feedback": "❌ ERRO GRAVE! Paciente re-entrou em PCR por falta de cuidados pós-RCE!",
                    "points": -30,
                    "next_step": 20
                },
                {
                    "id": "b",
                    "text": "Transferir para UTI e iniciar cuidados pós-PCR",
                    "correct": true,
                    "feedback": "✅ EXCELENTE! Cuidados pós-RCE: TTM (hipotermia terapêutica), manter SpO2 94-98%, PA adequada. SOBREVIVEU COM BOA QUALIDADE NEUROLÓGICA!",
                    "points": 100,
                    "next_step": null
                },
                {
                    "id": "c",
                    "text": "Aplicar mais um choque preventivo",
                    "correct": false,
                    "feedback": "❌ ERRO! Choque sem indicação causou fibrilação recorrente!",
                    "points": -20,
                    "next_step": 21
                }
            ]
        },
        {
            "step_id": 10,
            "title": "Consequência: Intubação Precipitada",
            "monitor": {
                "fc": 0,
                "pa": "0/0",
                "spo2": 0,
                "ritmo": "Fibrilação Ventricular"
            },
            "message": "Após 2 minutos intubando, paciente ainda em FV. Sem RCP nesse tempo. Cérebro sofreu hipóxia severa. Agora qual conduta?",
            "options": [
                {
                    "id": "a",
                    "text": "Desfibrilar AGORA e iniciar RCP",
                    "correct": true,
                    "feedback": "✅ Conduta correta, mas atrasada. Choque aplicado + RCP iniciado. Chance de recuperação neurológica comprometida pelo atraso.",
                    "points": 20,
                    "next_step": 13
                },
                {
                    "id": "b",
                    "text": "Continuar ventilando antes de chocar",
                    "correct": false,
                    "feedback": "❌ ERRO FATAL! Mais atraso. Paciente evoluiu para assistolia. Óbito.",
                    "points": -50,
                    "next_step": 99
                }
            ]
        },
        {
            "step_id": 11,
            "title": "Consequência: Atraso na Desfibrilação",
            "monitor": {
                "fc": 0,
                "pa": "0/0",
                "spo2": 0,
                "ritmo": "Fibrilação Ventricular"
            },
            "message": "Após atraso de 60-90s, você finalmente vai desfibrilar. FV ainda presente, mas amplitude menor. Qual a conduta?",
            "options": [
                {
                    "id": "a",
                    "text": "Choque 200J + RCP imediato",
                    "correct": true,
                    "feedback": "✅ Conduta correta. Apesar do atraso, você seguiu protocolo correto agora.",
                    "points": 30,
                    "next_step": 14
                },
                {
                    "id": "b",
                    "text": "Administrar adrenalina antes",
                    "correct": false,
                    "feedback": "❌ Mais atraso! FV se deteriorando...",
                    "points": -20,
                    "next_step": 99
                }
            ]
        },
        {
            "step_id": 12,
            "title": "Consequência: RCP Atrasada",
            "monitor": {
                "fc": 0,
                "pa": "0/0",
                "spo2": 0,
                "ritmo": "Fibrilação Ventricular"
            },
            "message": "Após erro inicial, você perdeu 10-15s. Agora iniciando RCP. Fazer 2 minutos de RCP de qualidade ainda pode salvar!",
            "options": [
                {
                    "id": "a",
                    "text": "RCP 2min + reavaliar ritmo",
                    "correct": true,
                    "feedback": "✅ Correto! Apesar do erro inicial, RCP de qualidade ainda pode reverter.",
                    "points": 30,
                    "next_step": 15
                },
                {
                    "id": "b",
                    "text": "Pausar para intubar",
                    "correct": false,
                    "feedback": "❌ ERRO! Não interrompa RCP! Assistolia irreversível.",
                    "points": -30,
                    "next_step": 99
                }
            ]
        },
        {
            "step_id": 13,
            "title": "RCE Tardio (Sequela Neurológica)",
            "monitor": {
                "fc": 65,
                "pa": "90/60",
                "spo2": 88,
                "ritmo": "Sinusal"
            },
            "message": "RCE obtido após 4 minutos de PCR total. Paciente em coma. Prognóstico neurológico reservado devido ao tempo de hipóxia.",
            "options": [
                {
                    "id": "a",
                    "text": "UTI + Cuidados pós-PCR + TTM",
                    "correct": true,
                    "feedback": "✅ Cuidados corretos. Paciente SOBREVIVEU mas com sequelas neurológicas graves (encefalopatia hipóxica). O atraso inicial custou qualidade de vida.",
                    "points": 50,
                    "next_step": null
                }
            ]
        },
        {
            "step_id": 14,
            "title": "RCE com Atraso Moderado",
            "monitor": {
                "fc": 72,
                "pa": "100/65",
                "spo2": 91,
                "ritmo": "Sinusal"
            },
            "message": "RCE obtido. Paciente acordou após 6h. Sequela leve (déficit de memória). Poderia ter sido perfeito sem o atraso inicial.",
            "options": [
                {
                    "id": "a",
                    "text": "UTI + Cuidados pós-PCR",
                    "correct": true,
                    "feedback": "✅ Paciente SOBREVIVEU com sequela leve. Performance: BOM (não excelente devido ao erro inicial).",
                    "points": 70,
                    "next_step": null
                }
            ]
        },
        {
            "step_id": 15,
            "title": "RCE Após Recuperação",
            "monitor": {
                "fc": 68,
                "pa": "95/60",
                "spo2": 90,
                "ritmo": "Sinusal"
            },
            "message": "Após 3 ciclos de RCP, RCE obtido. Recuperação boa, mas poderia ter sido mais rápida.",
            "options": [
                {
                    "id": "a",
                    "text": "UTI + Cuidados pós-PCR",
                    "correct": true,
                    "feedback": "✅ Paciente sobreviveu com boa recuperação. Desempenho: REGULAR (erros iniciais atrasaram RCE).",
                    "points": 60,
                    "next_step": null
                }
            ]
        },
        {
            "step_id": 20,
            "title": "Re-PCR por Abandono",
            "monitor": {
                "fc": 0,
                "pa": "0/0",
                "spo2": 0,
                "ritmo": "Assistolia"
            },
            "message": "Paciente voltou a PCR em assistolia por falta de cuidados pós-RCE. Tentativas de ressuscitação falharam.",
            "options": [
                {
                    "id": "a",
                    "text": "Declarar óbito",
                    "correct": true,
                    "feedback": "❌ ÓBITO. Paciente poderia ter sobrevivido com cuidados adequados pós-RCE. DESEMPENHO RUIM.",
                    "points": -50,
                    "next_step": null
                }
            ]
        },
        {
            "step_id": 21,
            "title": "Fibrilação Recorrente",
            "monitor": {
                "fc": 0,
                "pa": "0/0",
                "spo2": 0,
                "ritmo": "Fibrilação Ventricular"
            },
            "message": "Choque desnecessário induziu nova FV. Paciente deteriorou.",
            "options": [
                {
                    "id": "a",
                    "text": "Desfibrilar + RCP",
                    "correct": true,
                    "feedback": "⚠️ Recuperação parcial. SOBREVIVEU mas com sequelas devido à FV recorrente. DESEMPENHO REGULAR.",
                    "points": 30,
                    "next_step": null
                }
            ]
        },
        {
            "step_id": 99,
            "title": "Assistolia Irreversível",
            "monitor": {
                "fc": 0,
                "pa": "0/0",
                "spo2": 0,
                "ritmo": "Assistolia"
            },
            "message": "Paciente evoluiu para assistolia. 30 minutos de RCP sem retorno. Pupilas fixas e dilatadas.",
            "options": [
                {
                    "id": "a",
                    "text": "Declarar óbito",
                    "correct": true,
                    "feedback": "❌ ÓBITO. Erros sequenciais levaram a desfecho fatal. DESEMPENHO RUIM. Revise os protocolos ACLS.",
                    "points": -100,
                    "next_step": null
                }
            ]
        }
    ]'::jsonb,
    15,
    ARRAY['Reconhecer PCR em FV', 'Protocolo de desfibrilação', 'Consequências de atrasos', 'Cuidados pós-RCE', 'Tomada de decisão sob pressão'],
    ARRAY['PCR', 'FV', 'Desfibrilação', 'ACLS', 'Branching', 'Consequências']
),
(
    'ACLS: Bradicardia Sintomática - Branching',
    'Paciente de 70 anos, tontura e dor no peito. ECG mostra Bloqueio AV de 3º grau. Suas escolhas determinarão o desfecho!',
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
            "message": "Paciente com tontura intensa, dispneia e dor torácica. FC de 35 bpm. PA 80/50 mmHg. Qual a conduta imediata?",
            "options": [
                {
                    "id": "a",
                    "text": "Observar evolução (bradicardia leve)",
                    "correct": false,
                    "feedback": "❌ ERRO GRAVE! Paciente SINTOMÁTICO ignorado. Evoluiu para síncope e queda!",
                    "points": -30,
                    "next_step": 10
                },
                {
                    "id": "b",
                    "text": "Administrar Atropina 1mg IV",
                    "correct": true,
                    "feedback": "✅ CORRETO! Atropina é primeira linha em bradicardia sintomática. Dose: 1mg IV.",
                    "points": 50,
                    "next_step": 2
                },
                {
                    "id": "c",
                    "text": "Aplicar desfibrilação",
                    "correct": false,
                    "feedback": "❌ ERRO! Choque causou FV iatrogênica! Bradicardia não é chocável!",
                    "points": -50,
                    "next_step": 99
                },
                {
                    "id": "d",
                    "text": "Administrar Adenosina 6mg",
                    "correct": false,
                    "feedback": "❌ ERRO CRÍTICO! Adenosina PIORA bradicardia! FC caiu para 20 bpm!",
                    "points": -40,
                    "next_step": 11
                }
            ]
        },
        {
            "step_id": 2,
            "title": "Após Atropina (Caminho Correto)",
            "monitor": {
                "fc": 38,
                "pa": "85/55",
                "spo2": 90,
                "ritmo": "Bloqueio AV Total"
            },
            "message": "Atropina administrada. FC permanece em 38 bpm (resposta limitada em BAV total). Paciente ainda sintomático. Próxima conduta?",
            "options": [
                {
                    "id": "a",
                    "text": "Repetir Atropina 1mg",
                    "correct": false,
                    "feedback": "⚠️ Resposta parcial. FC subiu para 42, mas insuficiente. Perdeu tempo.",
                    "points": 10,
                    "next_step": 12
                },
                {
                    "id": "b",
                    "text": "Iniciar Marcapasso Transcutâneo AGORA",
                    "correct": true,
                    "feedback": "✅ EXCELENTE! Bradicardia sintomática refratária à atropina = marcapasso transcutâneo imediato!",
                    "points": 100,
                    "next_step": 3
                },
                {
                    "id": "c",
                    "text": "Aguardar hemodinâmica",
                    "correct": false,
                    "feedback": "❌ ERRO! Paciente entrou em choque cardiogênico aguardando!",
                    "points": -30,
                    "next_step": 13
                },
                {
                    "id": "d",
                    "text": "Iniciar dopamina em infusão",
                    "correct": false,
                    "feedback": "⚠️ Alternativa subótima. Dopamina funciona, mas marcapasso é superior e mais rápido.",
                    "points": 20,
                    "next_step": 14
                }
            ]
        },
        {
            "step_id": 3,
            "title": "Marcapasso Efetivo (Desfecho Ótimo)",
            "monitor": {
                "fc": 70,
                "pa": "110/70",
                "spo2": 96,
                "ritmo": "Marcapasso"
            },
            "message": "Marcapasso transcutâneo instalado. Captura efetiva! FC 70 bpm, PA normalizou, sintomas resolvidos. Paciente estável!",
            "options": [
                {
                    "id": "a",
                    "text": "Internar para marcapasso definitivo",
                    "correct": true,
                    "feedback": "✅ PERFEITO! BAV total requer marcapasso definitivo. DESFECHO EXCELENTE! Paciente recuperou totalmente sem sequelas.",
                    "points": 100,
                    "next_step": null
                }
            ]
        },
        {
            "step_id": 10,
            "title": "Síncope e Queda",
            "monitor": {
                "fc": 28,
                "pa": "60/40",
                "spo2": 82,
                "ritmo": "Bloqueio AV Total"
            },
            "message": "Paciente teve síncope! Queda com TCE leve. FC caiu para 28 bpm. PA 60/40. Choque distributivo instalando. URGENTE!",
            "options": [
                {
                    "id": "a",
                    "text": "Atropina 1mg + Marcapasso transcutâneo",
                    "correct": true,
                    "feedback": "✅ Conduta correta, mas TARDIA. Paciente sofreu trauma por queda que poderia ser evitado.",
                    "points": 30,
                    "next_step": 15
                },
                {
                    "id": "b",
                    "text": "Continuar observando",
                    "correct": false,
                    "feedback": "❌ ERRO FATAL! PCR em assistolia. Óbito.",
                    "points": -100,
                    "next_step": 99
                }
            ]
        },
        {
            "step_id": 11,
            "title": "Bradicardia Severa por Adenosina",
            "monitor": {
                "fc": 20,
                "pa": "50/30",
                "spo2": 75,
                "ritmo": "Bloqueio AV Total"
            },
            "message": "ERRO CRÍTICO! Adenosina piorou bloqueio. FC 20 bpm! Paciente em pré-síncope. Conduta URGENTE?",
            "options": [
                {
                    "id": "a",
                    "text": "Marcapasso transcutâneo AGORA",
                    "correct": true,
                    "feedback": "✅ Conduta correta. Marcapasso salvou, mas dano já feito. Hipóxia cerebral transitória.",
                    "points": 20,
                    "next_step": 16
                },
                {
                    "id": "b",
                    "text": "Atropina",
                    "correct": false,
                    "feedback": "❌ Muito lenta! Paciente evoluiu para PCR.",
                    "points": -50,
                    "next_step": 99
                }
            ]
        },
        {
            "step_id": 12,
            "title": "Após 2ª Atropina",
            "monitor": {
                "fc": 42,
                "pa": "90/60",
                "spo2": 92,
                "ritmo": "Bloqueio AV Total"
            },
            "message": "FC 42 bpm. Melhora discreta. Ainda sintomático. Próxima ação?",
            "options": [
                {
                    "id": "a",
                    "text": "Marcapasso transcutâneo",
                    "correct": true,
                    "feedback": "✅ Correto. Atrasou mas funcionou. SOBREVIVEU sem sequelas.",
                    "points": 70,
                    "next_step": 3
                }
            ]
        },
        {
            "step_id": 13,
            "title": "Choque Cardiogênico",
            "monitor": {
                "fc": 32,
                "pa": "55/35",
                "spo2": 80,
                "ritmo": "Bloqueio AV Total"
            },
            "message": "Choque cardiogênico! Extremidades frias, oligúria. Lactato 6. Conduta?",
            "options": [
                {
                    "id": "a",
                    "text": "Marcapasso transcutâneo + drogas vasoativas",
                    "correct": true,
                    "feedback": "✅ Recuperação difícil. SOBREVIVEU mas com lesão renal aguda por hipoperfusão. Poderia ter sido evitado.",
                    "points": 40,
                    "next_step": null
                }
            ]
        },
        {
            "step_id": 14,
            "title": "Dopamina Iniciada",
            "monitor": {
                "fc": 55,
                "pa": "95/60",
                "spo2": 93,
                "ritmo": "Bloqueio AV Total"
            },
            "message": "Dopamina 5mcg/kg/min. FC subiu para 55. PA melhorou. Estável mas dependente de droga.",
            "options": [
                {
                    "id": "a",
                    "text": "Internar para marcapasso definitivo",
                    "correct": true,
                    "feedback": "✅ Desfecho BOM. Poderia ter sido excelente com marcapasso desde início.",
                    "points": 80,
                    "next_step": null
                }
            ]
        },
        {
            "step_id": 15,
            "title": "Recuperação Pós-Síncope",
            "monitor": {
                "fc": 68,
                "pa": "105/65",
                "spo2": 95,
                "ritmo": "Marcapasso"
            },
            "message": "Marcapasso efetivo. Paciente recuperou mas com TCE leve (hematoma). Internação prolongada.",
            "options": [
                {
                    "id": "a",
                    "text": "Internar para marcapasso definitivo + tratar TCE",
                    "correct": true,
                    "feedback": "✅ SOBREVIVEU. Desempenho REGULAR. Síncope e TCE poderiam ter sido evitados com ação mais rápida.",
                    "points": 50,
                    "next_step": null
                }
            ]
        },
        {
            "step_id": 16,
            "title": "Recuperação Pós-Adenosina",
            "monitor": {
                "fc": 70,
                "pa": "100/65",
                "spo2": 94,
                "ritmo": "Marcapasso"
            },
            "message": "Marcapasso salvou. Paciente teve episódio confusional transitório (hipóxia cerebral). Recuperou após 2h.",
            "options": [
                {
                    "id": "a",
                    "text": "Internar para marcapasso definitivo",
                    "correct": true,
                    "feedback": "✅ SOBREVIVEU. Desempenho RUIM. Erro medicamentoso grave causou complicação evitável.",
                    "points": 30,
                    "next_step": null
                }
            ]
        },
        {
            "step_id": 99,
            "title": "Óbito",
            "monitor": {
                "fc": 0,
                "pa": "0/0",
                "spo2": 0,
                "ritmo": "Assistolia"
            },
            "message": "Paciente evoluiu para PCR em assistolia. Manobras de ressuscitação falharam. Óbito declarado.",
            "options": [
                {
                    "id": "a",
                    "text": "Declarar óbito",
                    "correct": true,
                    "feedback": "❌ ÓBITO. Erros críticos levaram a desfecho fatal. DESEMPENHO MUITO RUIM. Revise urgentemente protocolos de bradicardia.",
                    "points": -100,
                    "next_step": null
                }
            ]
        }
    ]'::jsonb,
    12,
    ARRAY['Reconhecer bradicardia sintomática', 'Uso de Atropina', 'Indicações de marcapasso', 'Manejo de BAV total', 'Consequências de erros', 'Tomada de decisão'],
    ARRAY['Bradicardia', 'ACLS', 'BAV', 'Atropina', 'Marcapasso', 'Branching', 'Consequências']
);

-- 3. VERIFICAR INSERÇÃO
SELECT
    id,
    title,
    difficulty,
    jsonb_array_length(game_flow) as total_steps,
    (game_flow->0->'options'->0->>'next_step') as first_wrong_option_next_step,
    (game_flow->0->'options'->1->>'next_step') as first_correct_option_next_step
FROM clinical_cases;
