# SIAV — Catálogo de registros de medicações específicas

Data: 24/11/2026 (America/Sao_Paulo). Base conferida: `ba4103a8d0fa3e1c2d61db49eaed7698bbe2a281`.
Branch: `fix/pcr-specific-medication-catalog`.

## Auditoria antes da implementação

A lista fornecida pelo usuário define os medicamentos desejados. Não constitui, por si só, protocolo validado para preenchimento automático em todas as situações.

| Item | Conclusão para esta entrega |
| --- | --- |
| Adrenalina, amiodarona e lidocaína | Manter doses e oportunidades do avaliador adulto existente. Adrenalina é usada nos dois ramos, mas seu momento inicial depende do percurso; não liberá-la indiscriminadamente antes da avaliação/desfibrilação. Amiodarona e lidocaína continuam alternativas. |
| Magnésio e bicarbonato | Preservar registro manual. Não transformar acidose genérica, qualquer TV polimórfica ou um rótulo de 5H/5T em indicação automática. |
| Gluconato e cloreto de cálcio 10% | Cadastrar separadamente. Mesmo percentual não significa mesmo cálcio elementar por mL. Não converter nem preencher automaticamente os volumes propostos. |
| Naloxona | Registrar dose e via reais, com IM/IN disponíveis apenas nessa seleção. A dose intranasal depende da apresentação; não transpor a faixa injetável para todas as vias. |
| Alteplase e tenecteplase | Opções distintas de registro manual. Não criar dose de PCR/TEP a partir de esquemas de AVC/IAM nem assumir indicação pela presença de AESP. |
| Glicose 50% | Registrar volume real e concentração explicitada no nome. Não inferir hipoglicemia. “Apenas hipoglicemia” não é uma regra universal: glicose também participa de esquemas com insulina para hipercalemia. |

### Fontes conferidas

- [AHA 2025 — algoritmo adulto de PCR](https://cpr.heart.org/-/media/CPR-Files/CPR-Guidelines-Files/2025-Algorithms/Algorithm-ACLS-CA-250527.pdf): percurso e doses de rotina. Não alterar o avaliador compartilhado.
- [AHA 2025 — suporte avançado adulto](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-advanced-life-support): cálcio, bicarbonato e magnésio não são medicações de rotina da PCR.
- [AHA 2025 — circunstâncias especiais](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-and-pediatric-special-circumstances-of-resuscitation/): cardiotoxicidade por tricíclicos, incerteza de benefício em hipercalemia, insulina/glicose, opioides e TEP têm contextos próprios. Naloxona não deve atrasar RCP/ventilação; trombólise exige avaliação específica.
- [Bula de gluconato de cálcio](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=787603c6-3f50-473a-8e3b-71dcf6d86964) e [bula de cloreto de cálcio](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=d5d9c301-599e-47bb-ba9b-c0065c08dfb4): apresentações 100 mg/mL contêm, respectivamente, 9,3 e 27 mg/mL de cálcio elementar; não são intercambiáveis por volume.
- [Bula de naloxona intranasal](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=68723486-8f21-4299-b380-7d5e3f9657b6): produtos nasais possuem apresentações próprias. Não estabelecer uma dose única para todas as vias.

## Plano técnico restrito

1. Preservar o avaliador, doses de rotina, cálculos de peso, choques e temporização.
2. Criar catálogo de **registro**, separado do catálogo de cálculos clínicos. Acrescentar gluconato de cálcio 10%, cloreto de cálcio 10%, naloxona, alteplase, tenecteplase e glicose 50%, sem números de dose sugerida.
3. Manter adrenalina/amiodarona em destaque e lidocaína acessível como alternativa. Reunir causas específicas em seção recolhível; conservar atropina em outros registros, sem apresentá-la como rotina.
4. Dose dos novos itens começa vazia. Aviso de indicação não validada, quantidade real, unidade/via compatíveis e revisão explícita são necessários antes do registro. Uma seleção não constitui recomendação nem administração.
5. Ampliar o registro de fatos para mL e para IM/IN com guardas por medicamento. Não liberar essas opções indiscriminadamente para amiodarona, adrenalina ou registros desconhecidos.
6. Conservar nomes com concentração, horários, episódio, ID da operação e revisão; testar relatório e deduplicação. Não executar conversões entre mL, massa, cálcio elementar ou doses por peso para novos itens.
7. Criar regressões com HTML/módulos reais; testar seleção e campos em retrato, claro/escuro, suíte completa, SQL isolado, build e distribuição. Confirmar CI e Preview da nova branch.

## Limites

Não alterar Supabase, banco, RLS, credenciais, produção, main, PR #2 ou a branch de Preview anterior. Não realizar pagamentos, merge ou deploy de produção. Não usar pacientes reais. O registro manual não comprova diagnóstico, indicação, preparo, acesso vascular ou segurança da administração. Novos protocolos automáticos dependem de revisão clínica específica; esta entrega não os implementa.

## Implementação

Plano registrado em `7fe3067` antes da implementação. O avaliador `src/protocols/medical.js`, o estado clínico, os cálculos de dose, o ledger temporal e o gerador de relatório permaneceram inalterados.

- O catálogo de registro passa de **6 para 12 opções**. Os seis novos itens são gluconato de cálcio 10%, cloreto de cálcio 10%, naloxona, alteplase, tenecteplase e glicose 50%.
- Adrenalina e amiodarona continuam em destaque; lidocaína aparece logo abaixo. Oito opções de causas específicas ficam em uma seção recolhível. Atropina é preservada em “Outros registros”, sem indicação de rotina.
- O novo catálogo é de documentação de fatos. Não fornece `adultDose`, `pediatricDose`, `adultDoseValue`, intervalos ou elegibilidade aos cálculos existentes. Selecionar os novos itens não preenche dose, não pede peso para inventar esquema e não grava administração.
- Os volumes de cálcio/glicose são registrados em **mL**, com a concentração no nome. Não há conversão automática para massa, cálcio elementar, equivalência entre sais ou dose por peso. Bicarbonato no novo formulário identifica a apresentação de 8,4%; registros antigos não são reescritos.
- Naloxona admite EV/IO/IM/IN como vias de registro, com aviso de conferir a apresentação e de não atrasar RCP/ventilação. As outras novas opções oferecem EV/IO para documentar o fato. Essas opções de registro não constituem recomendação de via, acesso ou preparo para uma condição clínica.
- Unidade e via são verificadas por medicamento no formulário e no helper de gravação. Novos itens exigem nome/apresentação correspondentes ao ID e `requiresReview: true`. Registros legados/desconhecidos não passam a aceitar mL ou IM/IN indiscriminadamente. Doses de rotina preservam suas guardas anteriores.
- Quantidade numérica exata e revisão explícita são obrigatórias nos novos registros. Alterar dose, unidade, horário ou via limpa a revisão anterior. Trocar medicamento limpa dose e confirmação; uma via incompatível com a nova seleção volta à opção EV visível.
- Uma operação só pode ser registrada uma vez. Nova administração exige reabrir o formulário. São preservados ID, dose, unidade, via, horários efetivo/registro, episódio, peso já informado e contexto já disponível.
- O relatório existente inclui os nomes com concentração, a unidade mL e as vias IM/IN sem conversão ou alteração de seu gerador. Os testes conferem o texto resultante. Os avisos indicam revisão necessária; não certificam a indicação clínica ou a segurança da administração registrada.

### Arquivos alterados

- `src/utils/medication-registration.js`: catálogo separado para registro e guardas de unidade/via/identidade dos novos itens; não amplia os calculadores de dose.
- `src/pcr/medications.js`: seleção dos 12 itens, avisos, unidades/vias visíveis e validação antes de registrar.
- `src/pcr/events.js`: validação compartilhada na gravação; mantém ID, horários e deduplicação.
- `src/ui/events.js`: invalidar revisão anterior quando os dados da administração forem editados.
- `index.html`, `pcr-interface.css`: grupos recolhíveis, apresentações, campo mL e controles IM/IN restritos à seleção de naloxona.
- `tests/pcr-medications-post-rce.test.js`: **41 casos novos**; atualizar a expectativa de inventário para os grupos solicitados. Não remover os testes das entregas anteriores.
- `tests/distribution/pcr-specific-medications.mjs`, `tests/distribution/check.mjs`: cenário novo contra build real e servidor estático exclusivo de `dist/`.
- `tests/distribution/pcr-medication-clarity.mjs`: abrir o grupo específico antes de selecionar seus itens; selecionar a via IO explicitamente na verificação geométrica para não confundir o último controle oculto com IO.
- `.github/workflows/ci.yml`: somente gatilho para a nova branch; workflow de produção preservado.
- Este documento e capturas sintéticas em `docs/screenshots/pcr-specific-medications/`.

## Testes

| Verificação | Resultado |
| --- | --- |
| Suíte direcionada de medicações/eficiência/pós-RCE | **151/151**. |
| `npm run test:run -- --maxWorkers=2 --minWorkers=1` | **468/468**, 28 arquivos; 427 casos anteriores preservados e 41 novos. |
| `npm run test:database` | **11/11**, PostgreSQL descartável sem conexão com Supabase. |
| `npm run build` | Aprovado com chave publicável sintética; artefato local não publicado. |
| Cenário mobile novo | Aprovado em 320, 360, 375, 390, 414, 430 e 768 px, retrato, claro/escuro. Campos/revisão revelados sem corte pelo rodapé, alvos de via de pelo menos 44 px e contraste do aviso de pelo menos 4,5:1. |
| `SIAV_CHROMIUM_PATH=/usr/bin/chromium npm run test:distribution` | **20/20**, sem falhas ou cenários ignorados; 19 anteriores preservados e um cenário completo adicionado. Build próprio servido exclusivamente de `dist/`, com SW real e serviços externos isolados por mocks. |
| `git diff --check` | Sem erros. |

As regressões cobrem dose vazia/ausência de novo cálculo, revisão obrigatória também no helper, mL sem conversão, IM/IN somente para naloxona, rejeição de ID/nome incompatíveis, preservação de nomes e horários no relatório, dose única por operação, troca entre sais sem herança, pediatria/algoritmo desconhecido, perda de validade da revisão após edição e recusa de formulário de outro atendimento.

O cenário browser usa quantidades exclusivamente sintéticas para conferir documentação; esses números não são doses sugeridas pelo aplicativo nem exemplos de prescrição. Serviços externos são isolados por mocks. Não foram criados pacientes, contas, sessões, dados Supabase ou pagamentos reais. O build mantém os avisos já conhecidos de scripts clássicos empacotados pela lista explícita de assets.

Capturas com dados sintéticos:

- [Catálogo inicial — 320 px, claro](screenshots/pcr-specific-medications/catalog-320-light.png).
- [Naloxona e vias de registro — 320 px, claro](screenshots/pcr-specific-medications/naloxona-320-light.png).
- [Gluconato de cálcio e volume em mL — 390 px, escuro](screenshots/pcr-specific-medications/gluconato_calcio-390-dark.png).
- [Naloxona e revisão manual — 390 px, escuro](screenshots/pcr-specific-medications/naloxona-390-dark.png).

## Teste manual no celular e limitações

1. Abrir na Vercel o Preview da branch **fix/pcr-specific-medication-catalog**, conferir o commit da entrega e tocar **Visit**. A URL de um Preview antigo permanece vinculada àquela versão.
2. Em atendimento sintético, conferir as três opções de rotina, abrir **Causas específicas** e selecionar cada nova opção. Dose deve permanecer vazia e o aviso visível. Conferir concentração, unidade e via antes da revisão.
3. Selecionar naloxona e alternar EV/IO/IM/IN: dose não deve ser inferida pela via. Trocar para adrenalina/amiodarona: IM/IN deixam de ficar disponíveis.
4. Digitar uma quantidade sintética, revisar e confirmar uma vez. Verificar relatório e ausência de duplicação por toque repetido. Repetir a troca de gluconato para cloreto: não deve transportar o volume anterior.
5. Conferir temas, rolagem e teclado numérico em retrato, sem dados reais.

Safari e Android físicos, teclado virtual, zoom do sistema e leitor de tela ainda precisam de validação real. Não há homologação de segurança clínica, novas indicações ou novos esquemas de dose. O app não mede glicemia, cálcio, potássio, pH ou QT, não confirma TEP/intoxicação e não verifica contraindicações ou o preparo dos fármacos.

Protocolos automáticos de causas específicas, a persistência assistencial e as tabelas ausentes no Supabase permanecem em etapas próprias. Para reverter o frontend, preservar o Preview anterior em `ba4103a8d0fa3e1c2d61db49eaed7698bbe2a281` ou usar `git revert` do commit de implementação em uma branch de trabalho, sem reescrever histórico. Não há migração nem dados persistidos a reverter nesta entrega.
