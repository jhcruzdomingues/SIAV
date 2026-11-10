# Entrega 3A — auditoria e plano técnico anterior à implementação

Base confirmada: `d6b54aa9137c37b0643f3b1784a465c9311f3a00`, branch `fix/adult-pcr-antiarrhythmics`, PR #2. Escopo: eficiência de registro, medição temporal e preparo do paciente. Nenhuma regra de elegibilidade, dose ou transição clínica será redefinida. Correções 1 e 2A devem continuar cobertas.

## Auditoria Git

- Comparados `e4604da`, `5eb1036`, `ab12599`, `02b83be` e `d6b54aa`, além do log dos arquivos. Antes de `ab12599`, medicações copiavam textos de doses/faixas para o campo e o registro tinha menos etapas, mas não distinguia adequadamente recomendação e quantidade efetiva. `ab12599` introduziu registro exato, retrospectividade, IDs e revisão manual: preservaremos essas garantias e retiraremos atrito apenas onde a dose é inequívoca.
- O reset do ciclo em `startCompressions`/`startCycleProgress` já existia em `e4604da`; não foi introduzido pela seleção de ritmo da Entrega 1 nem pelo isolamento de notas da 2A. O mesmo timestamp é reiniciado em cada retomada e também usado na soma das compressões. O cronômetro global soma callbacks de um segundo; não há ledger completo de pausas nem tratamento de suspensão no caminho ativo.
- A confirmação de algoritmo adulto foi acrescentada na revisão clínica. O preparo já não contém confirmação modal adicional no início normal; a confirmação de atendimento novo após ROSC protege outro atendimento e será mantida. Campos secundários ocupam espaço antes da ação principal. A seleção explícita pode ser apresentada como opção de protocolo, sem mais uma caixa de confirmação.

## Fluxo de medicação proposto

Selecionar medicamento continua sendo uma ação distinta de registrar o fato. Na oportunidade adulta validada por `evaluateMedicationGuidance`, adrenalina e amiodarona têm quantidade numérica exata: preencher essa quantidade, mg e a via exibida, mostrar resumo e botão “REGISTRAR DOSE ADMINISTRADA”. O toque nesse botão declara administração efetiva; selecionar cartão ou abrir modal nunca grava.

Faixas de lidocaína não serão convertidas em um ponto arbitrário da faixa. Sem quantidade única, usar edição manual explícita. Histórico incerto, oportunidade ausente, protocolo não adulto, administração retrospectiva, via não indicada ou contexto que mudou exigem revisão manual; não recebem preenchimento automático adulto. Mantêm-se os dados e os critérios existentes de `requiresReview`. Uma confirmação manual única é aceitável fora do caminho padronizado; não será exigida no caminho padronizado. O commit revalida contexto e consome operação uma vez. Atualizações do painel não podem sobrescrever edição do usuário.

## Plano temporal e riscos (registrado antes de alterar o modelo)

Será necessário um modelo de **medição**, separado da máquina clínica. Não alterar os passos de `clinical.js` nem o avaliador `medical.js`.

1. Ledger com episódios ativos de PCR e segmentos de compressões registradas, pausa registrada ou período desconhecido; cada segmento tem ID, episódio e timestamps reais de início/fim e motivo. Um segmento aberto é fechado na mudança de estado; retomada nunca apaga segmentos.
2. Denominador da FCT: soma das durações dos episódios de PCR, do início confirmado até ROSC/encerramento. Inclui preparo e pausas; exclui o intervalo pós-ROSC antes da recorrência. Cronômetro global representa esse tempo acumulado de PCR. Tempo administrativo do atendimento é distinto e identificado no relatório.
3. Ciclo tem início/deadline próprios. Pausa manual conserva a deadline e o contador; retomada dentro do mesmo ciclo não zera. Avaliação concluída e choque continuam determinando novo ciclo, como no fluxo existente; o ciclo completo após choque será preservado.
4. Medição não é sensor: compressões são informadas pelo operador. A aplicação nunca sabe se ocorreram fisicamente. Exibir “registradas”, sem alegação de FCT fisiológica medida.
5. `visibilitychange`/`pagehide` e lacuna de callbacks interrompem a extrapolação. Ausência superior a 2,5 s no heartbeat de 1 s marca o trecho desde a última observação como desconhecido (limiar de integridade da medição, não regra clínica). Ao retornar, não presumir compressões: exigir retomada explícita; se ciclo venceu, exibir avaliação pendente. Não criar ciclos ou choques fictícios para recuperar tempo.
6. Tempo vem de timestamps, não de quantidade de callbacks. Relógio regressivo/inconsistência de intervalos invalida a FCT. Suspensão/clock jump gera medição incompleta, jamais soma fictícia de compressões. Uma FCT numérica exige cobertura integral, sem desconhecidos, denominador positivo e segmentos válidos sem sobreposição.
7. ROSC fecha o episódio temporal antes da pergunta administrativa. Recorrência acrescenta episódio e preserva registros/notas; novo atendimento cria outro ledger. Finalização fecha segmentos antes de gerar relatório.
8. Relatório inclui duração de PCR, tempo administrativo, compressões/pausas conhecidas, desconhecido e FCT ou “medição incompleta/N/I”, definição de denominador e lista temporal. Utiliza o caminho HTML existente sem novos campos de schema remoto. Rastreabilidade estruturada fica no estado local; durabilidade remota completa continua limitação arquitetural.

Riscos: sincronização entre callbacks e transições, reentrada, atraso de modal, perda de foco e suspensão não detectável a tempo; o ledger deve ser conservador. A retomada marca observação declarada pelo operador. Alteração manual do relógio e recarga total não podem ser resolvidas silenciosamente. Não ativar o timer/Worker alternativo, não alterar frequência/duração clínica do ciclo, não afirmar que Worker mantém observação real de compressões.

## Paciente

Seleção explícita por toque (adulto / outro ou não definido), sem inferência por idade/peso. ID, idade e peso opcionais ficam próximos do início; demais campos em detalhes. Manter N/I para ausentes, sem inventar peso ou idade. Edição de paciente ativo preserva protocolo; abrir novo preparo não herda seleção/dados antigos. Rejeição de atendimento novo após ROSC não deve trocar dados do atendimento anterior.

## Verificação planejada

Testes de prefill/edição, oportunidade/contexto alterado, faixas, pediatria, retrospectivo e deduplicação; ledger, pausas/retomadas, ciclos consecutivos, choque após preparo, ROSC/recorrência/fim, suspensão e relógio; relatório incompleto; preparo por toque e dados ausentes. Executar suíte inteira, build e interação mobile emulada. Registrar limites do ambiente e do Safari físico sem confundir emulação com homologação. Não alterar planos, pagamentos, simulados, fluxogramas ou backend.

## Resultado da implementação

O plano acima foi registrado antes das alterações funcionais. Implementado o ledger `state.resuscitationTiming`, independente dos passos clínicos. O início realmente novo reinicializa esse ledger; recorrência acrescenta episódio. `clinical.js`, `medical.js`, doses catalogadas, constantes de duração clínica e critérios de elegibilidade permanecem sem alterações.

A pausa informada e a retomada mantêm o prazo do ciclo. Uma avaliação concluída ou choque continua iniciando o ciclo do fluxo existente. A pausa não zera nem estende silenciosamente os dois minutos. O cronômetro global acumula os episódios clínicos, excluindo espera pós-ROSC; o relatório também mostra tempo administrativo desde a abertura. Os totais de compressões/pausas não são mais derivados de um único `startTime` reutilizado.

Registro de medicamentos: cartão seleciona; botão “REGISTRAR DOSE ADMINISTRADA” registra o fato. Prefill só para a quantidade exata emitida pelo avaliador adulto na oportunidade atual. Não foi criado valor automático para a faixa de lidocaína. Edição, retrospectivo e história incerta seguem revisão manual. O commit compara contexto com o que foi exibido/revisado, rejeita contexto alterado, mantém IDs e consome a operação uma vez. Atualização de orientação não reescreve quantidade editada. O checkbox manual fica oculto no caminho padronizado.

Preparo: opções de algoritmo por toque mantêm a escolha explícita, sem inferir por peso/idade. Dados essenciais opcionais ficam visíveis; sexo, alergias e comorbidades ficam em detalhes. Edição conserva algoritmo; preparo novo limpa dados/seleção; cancelar novo atendimento após ROSC restaura paciente anterior. A abertura centraliza a ação “iniciar” versus “salvar alterações”, corrigindo o estado visual herdado da edição anterior.

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/pcr/timing.js` | Episódios, segmentos, heartbeat, desconhecidos, validação da cobertura e FCT |
| `src/config/state.js` | Campos/reset do modelo de medição e deadline/pausa do ciclo |
| `src/pcr/core.js` | Integração temporal, pausa/retomada, deadline preservada e lifecycle do atendimento |
| `src/pcr/rhythm.js` | Registro de pausa na avaliação manual e fechamento temporal no ROSC |
| `src/pcr/log.js` | Tempos, denominador, indicação de incompletude e intervalos com IDs no relatório existente |
| `src/pcr/medications.js` | Prefill inequívoco, edição, revalidação contextual e confirmação única do fato |
| `src/ui/events.js` | Conexões de pausa/visibilidade/edição e seleção do medicamento |
| `src/ui/patient.js` | Preparo/edição sem herança de estado e rollback após recusa de novo atendimento |
| `src/ui/pcr-guidance.js` | Controles e estado de registro pausado, sem mudar a regra clínica |
| `index.html`, `style.css` | Ação rápida visível, formulário compacto, protocolo por toque e controles temporais |
| `tests/mobile-care-interactions.mjs` | Regressão de interação reproduzível em Chromium mobile; exige Playwright separado e servidor loopback |
| `tests/pcr-efficiency.test.js` | 30 regressões novas de temporização, medicamentos e paciente |
| `docs/DELIVERY_3A_TECHNICAL_PLAN.md` | Auditoria Git, plano anterior à execução e resultado |

### Testes e limitações

- A suíte anterior de 138 testes foi preservada. Nova suíte: **168 testes em 13 arquivos**, aprovados; cobre também as entregas 1 e 2A. O build conclui com os avisos preexistentes de CSS e scripts legados de planos/pagamentos, não alterados.
- Novas regressões: pausa/retomada e prazo, ciclos consecutivos, preparo/choque com ciclo completo, ROSC/recorrência/encerramento, episódio novo, página oculta, lacuna de callbacks, leitura de relatório durante lacuna, relógio regressivo, cobertura inválida/ausente/sem duração; doses inequívocas, segunda oportunidade, lidocaína, não adulto, histórico incerto, edição/via/retrospectivo/contexto alterado e duplicação; dados ausentes, edição, reabertura e cancelamento após ROSC pelas duas entradas.
- Interação Chromium emulada nos tamanhos iPhone 13 e iPhone SE: seleção de algoritmo, idade ausente, peso decimal, pausa/retomada, dose devida, ausência de gravação pela seleção, toque de registro, edição manual, layout sem overflow horizontal e ação padronizada visível no SE. Isso não é homologação de Safari físico.
- O teste de navegador obtém bytes reais do SDK de CDN via curl com o CA confiável do ambiente, devido à limitação TLS já identificada no Chromium. Chamadas externas não necessárias são bloqueadas. Não há sessão autenticada fabricada nem escrita remota; os registros de teste ficam em memória e são sintéticos.
- A medição informa ações declaradas pelo operador; não detecta compressões físicas. FCT numérica só é apresentada com cobertura válida e denominador positivo; qualquer trecho desconhecido ou inconsistência elimina a fração. O limiar de 2,5 s é conservador e deve ser avaliado em aparelhos reais.
- Relógio regressivo, suspensão e retorno não podem reconstruir fatos não observados. Não há garantia de continuidade após recarga/encerramento do processo. Os intervalos estruturados ficam no estado da sessão; o relatório inclui sua transcrição pelo caminho HTML existente. Não foi adicionada coluna nem migrada persistência estruturada. Outbox, identificação de usuário e durabilidade remota continuam riscos da arquitetura.
- Requer revisão clínica/humana de aceitação: definição operacional do denominador, uso/clareza da pausa e retomada, distinção entre dose sugerida e fato administrado, via padrão EV visível/editável e procedimentos quando a medição estiver incompleta. Nenhuma nova validação de PALS/energia ou alteração das regras adultas é alegada.
- Nenhum arquivo de planos, pagamentos, simulados, fluxogramas, SDK/configuração de Supabase ou credenciais foi modificado. Sem merge, deploy ou dados reais de pacientes.


### Reexecutar a regressão mobile

Com Vite em loopback (`npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`) e Playwright instalado no ambiente de testes, executar `MOBILE_DEVICE="iPhone SE" node tests/mobile-care-interactions.mjs` e repetir com `MOBILE_DEVICE="iPhone 13"`. Não foi adicionada dependência à aplicação nem alterado o lockfile. O teste recusa hosts externos.

Neste ambiente gerenciado, a execução usa `SIAV_PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright/index.mjs`, `SIAV_CHROMIUM_PATH=/usr/bin/chromium` e `SIAV_CDN_VIA_CURL=1`. Essa última opção faz transporte verificado dos bytes públicos do CDN; não desabilita TLS. O teste bloqueia o backend e valida registros locais sintéticos, sem afirmar persistência, autenticação ou Safari nativo.
