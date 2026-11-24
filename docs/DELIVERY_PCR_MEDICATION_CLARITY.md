# SIAV — Clareza e alertas no registro de medicações

Data: 24/11/2026 (America/Sao_Paulo). Base conferida: `ed6eb7146d8371809a735d8f28388b6fffe6d751`.
Branch: `fix/pcr-medication-clarity-alerts`. Main, PR #2 e branch anterior de Preview preservados.

## Plano e diagnóstico antes da implementação

- O formulário abre automaticamente todos os controles avançados quando a dose não é elegível ou ainda está vazia. Isso mistura seleção, aviso clínico, unidade, horário e revisão manual, aumentando a rolagem e a carga de leitura.
- Dose e via usam estruturas diferentes (`label` e `fieldset/legend`) sem uma linha de controles uniformemente alinhada. Os testes anteriores verificavam corte individual e largura total, mas não alinhamento entre controles nem o estado de revisão manual mostrado no print.
- A unidade começa sempre em mg, inclusive ao escolher bicarbonato ou magnésio. A seleção deve usar somente a unidade já existente no catálogo, sem criar novas doses.
- Amiodarona já possui 300 mg na primeira dose e 150 mg na segunda. O preenchimento automático depende do avaliador adulto, do passo clínico e do histórico confiável. Falta de dados não autoriza inferir indicação nem primeira dose.
- A mensagem de falta de indicação é apresentada como texto comum e extenso. Deve se tornar um aviso visível, curto e persistente enquanto a situação existir, distinguindo dose não indicada, informação insuficiente e indicação específica não avaliada pelo aplicativo.

## Escopo autorizado

1. Reorganizar o modal em seleção, dose/via, revisão manual quando necessária e confirmação única. Manter controles avançados recolhidos até abertura explícita pelo usuário, sem esconder a revisão obrigatória.
2. Destacar a primeira/segunda dose da amiodarona somente quando o avaliador existente a autorizar. Não mudar doses, sequência, intervalos, associação de antiarrítmicos, critérios clínicos ou pediatria.
3. Transformar a mensagem da seleção em aviso acessível quando não houver indicação automática. Dados desconhecidos devem aparecer como indicação não verificável, nunca como certeza de ausência de indicação ou dose autorizada.
4. Conservar registro manual da administração efetiva com revisão explícita, rastreabilidade e deduplicação. Selecionar não administra nem registra. Não impedir a documentação de um fato ocorrido confundindo-a com recomendação terapêutica.
5. Identificar medicamentos ausentes com o usuário antes de criar novos esquemas. Não promover medicamentos de situações especiais a rotina de PCR. A lista inicial permanece com seis opções até essa definição.
6. Cobrir primeira e segunda dose, ausência de terceira sugestão, mistura de antiarrítmicos, histórico incerto, pediatria, alertas, unidade e layout em retrato nos temas claro/escuro; executar suíte, build e distribuição.

## Fontes da conferência

- [AHA 2025 — algoritmo de PCR adulto](https://cpr.heart.org/-/media/CPR-Files/CPR-Guidelines-Files/2025-Algorithms/Algorithm-ACLS-CA-250527.pdf): doses de amiodarona de 300 mg e 150 mg, no percurso FV/TV sem pulso refratária. A oportunidade continua sendo determinada pelo avaliador existente, não por contagem isolada de choques.
- [AHA 2025 — suporte avançado adulto, medicamentos não vasopressores](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-advanced-life-support): cálcio, bicarbonato e magnésio não são recomendados de rotina; circunstâncias especiais exigem avaliação própria. Essa conferência não acrescenta doses ou protocolos ao aplicativo.

## Limites

Não alterar Supabase, autenticação, dados persistidos, cronômetros, FCT, choques, algoritmos, pagamentos, produção ou branches preservadas. Somente dados sintéticos nos testes. Chromium emulado não homologa Safari físico nem segurança clínica. O problema das demais tabelas ausentes no Supabase continua separado desta entrega.
