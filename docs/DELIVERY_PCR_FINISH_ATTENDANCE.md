# SIAV — Ordem das ações e encerramento do atendimento

Data: 20/11/2026 (America/Sao_Paulo). Base: `995b21bf31688d06f69b2312fc023f28ea243a41`.
Branch: `fix/pcr-finish-attendance-modal`.

## Resultado solicitado

- Ordem do painel: cronômetros → instruções → **Iniciar/Pausar/Retomar compressões** → **Checar ritmo**. As métricas de compressões e o metrônomo continuam disponíveis abaixo dessas ações.
- A seção termina com um único botão **FINALIZAR ATENDIMENTO**, que abre um modal com **RCE OBTIDO**, **ÓBITO** e **CANCELAR ATENDIMENTO**.
- Cada escolha exige uma confirmação nativa explícita antes de encerrar. Recusar mantém o atendimento e o modal. Fechar pelo X, pelo fundo ou por Escape apenas volta à PCR.
- Abrir o modal não pausa compressões, não muda o prazo do ciclo nem registra desfecho. Atalhos de ações clínicas ficam bloqueados enquanto o modal está aberto; o foco permanece nele.
- Cancelar atendimento encerra administrativamente o registro e preserva notas, medicamentos, choques e eventos. Não apaga histórico nem declara óbito ou RCE.
- Óbito só é registrado após escolha e confirmação do operador; não é inferido de ritmo, duração, ausência de RCE ou cancelamento.
- RCE utiliza a mesma transição clínica já existente. O novo caminho fecha o atendimento após a confirmação escolhida, sem uma segunda confirmação administrativa redundante.
- O relatório distingue **RCE OBTIDO (ROSC)**, **ÓBITO INFORMADO PELO OPERADOR** e **ATENDIMENTO CANCELADO**. Inclui o horário do registro do desfecho e o identificador da operação. Esse horário descreve a confirmação no app; não é uma declaração automática do horário fisiológico do evento.

## Diagnóstico e plano técnico executado

O botão de compressões estava acima das instruções. RCE tinha um botão independente e chamava uma confirmação clínica seguida de outra confirmação administrativa. A finalização comum não distinguia óbito de cancelamento, e o relatório inferia apenas “ROSC alcançado” ou “PCR não revertida”.

O primeiro ensaio mobile do novo modal também revelou duas animações genéricas herdadas do CSS de Configurações. Durante a abertura, encolhiam o alvo de 44 px do X para aproximadamente 40 px. Foram desativadas somente no modal de encerramento, deixando seus alvos estáveis desde a abertura; a regressão verifica ausência dessas animações e tamanho real dos alvos.

A correção mantém o motor de temporização: usa o fechamento de episódios e a finalização existentes. O corpo da transição de RCE foi extraído para `recordROSC()` e reutilizado, sem mudar suas operações de tempo/estado. O caminho anterior `roscObtido()` mantém seu comportamento para consumidores existentes e para a possibilidade já existente de recusar o encerramento administrativo e confirmar recorrência no mesmo atendimento.

Um novo registro de desfecho em memória contém tipo, episódio, operação e timestamp de confirmação. A escolha é aceita somente para o atendimento/episódio em que o modal foi aberto. Repetições depois de finalizar não executam novamente fechamento, emissão de evento ou geração do relatório. Novo atendimento reinicia apenas seu próprio desfecho; registros históricos não são reclassificados.

## Arquivos

- `index.html`: ordem dos controles, remoção do RCE independente e modal com três motivos.
- `pcr-interface.css`: modal compacto, temas, contraste, alvos de toque e rolagem.
- `src/ui/finish-attendance.js`: abertura, confirmação, fechamento e teclado/foco.
- `src/ui/events.js`: ligação das ações e bloqueio de atalhos no novo modal.
- `src/pcr/outcomes.js`: escolhas explícitas, validação do atendimento/episódio e finalização única.
- `src/config/state.js`: desfecho temporário do atendimento.
- `src/pcr/core.js`: reset do desfecho somente no novo atendimento e guarda contra finalização repetida. As funções temporais e de compressão não foram alteradas.
- `src/pcr/rhythm.js`: extração da transição existente de RCE, sem alteração de seu conteúdo clínico.
- `src/pcr/log.js`: apresentação do desfecho explícito no HTML do relatório. Contrato de salvamento, SDK e funções de acesso ao banco permanecem inalterados.
- `tests/pcr-finish-attendance.test.js`: 17 regressões novas.
- `tests/distribution/pcr-finish-attendance.mjs`, `check.mjs`, `pcr-alerts-compressions.mjs`: interação real no artefato e atualização das expectativas de posição/encerramento.
- `tests/mobile-care-interactions.mjs`: adaptação do script opcional à escolha de cancelamento; não executado separadamente nesta entrega.
- `.github/workflows/ci.yml`: inclusão exclusiva desta branch na lista do CI.
- Este documento e capturas em `docs/screenshots/pcr-finish-attendance/`.

Sem alterações em doses, algoritmos de elegibilidade, cálculos de energia, FCT, intervalos, cronômetros, Supabase/schema/RLS/credenciais, serviços, pagamentos, planos, simulação, fluxogramas, dependências, service worker ou workflow de produção. Main, PR #2 e Preview anterior preservados.

## Validação

- `npm run test:run -- --maxWorkers=2 --minWorkers=1`: **335/335 testes**, em 26 arquivos: 318 anteriores e 17 regressões novas. Os 14 casos iniciais reproduziram os comportamentos ausentes antes da correção.
- Casos novos: ordem dos controles, três escolhas, abertura sem efeitos clínicos, confirmação recusada/aceita em cada opção, preservação de notas/medicamentos/choques, relatório distinto, idempotência, fechamento sem ação, atalhos/foco, episódio anterior, novo atendimento e finalização de RCE previamente registrado. Testes anteriores de notas, medicamentos, ROSC/recorrência e FCT continuam aprovados.
- `npm run build`: verificação com configuração pública sintética local; nenhum artefato sintético é publicado.
- `SIAV_CHROMIUM_PATH=/usr/bin/chromium npm run test:distribution`: **15/15**; artefato servido exclusivamente de `dist/`, SDK remoto substituído por fixture sem sessão, pagamentos/backend bloqueados. O ensaio novo também passou isoladamente em 320 × 568 após corrigir as animações herdadas.
- Avisos preexistentes do Vite sobre scripts clássicos continuam. A distribuição verifica os assets incorporados pela estratégia explícita já existente; não houve alteração de empacotamento nesta entrega.
- O novo ensaio percorre as três opções pela interface, recusa e aceita as confirmações e confere relatório e preservação dos dados. Layout em 320, 360, 375, 390, 414, 430 e 768 px, retrato, claro/escuro; inclui 320 × 568, alvos mínimos de 44 px, ausência de cortes e contraste mínimo 4,5:1 nos textos avaliados.
- `git diff --check`: sem erros. CI e Preview são conferidos após o push e informados na entrega.

## Capturas e teste no Safari

- [Instruções → RCP → checar ritmo](screenshots/pcr-finish-attendance/pcr-instructions-rcp-rhythm.png).
- [Modal em 320 px, claro](screenshots/pcr-finish-attendance/finish-320-light.png).
- [Modal em 390 px, escuro](screenshots/pcr-finish-attendance/finish-390-dark.png).

Abrir o novo Preview no Safari → Visit → iniciar atendimento fictício. Conferir a ordem dos controles. Abrir Finalizar atendimento, fechar pelo X e confirmar que a PCR segue. Testar cada escolha em um atendimento fictício separado: primeiro recusar a confirmação e depois aceitar. Conferir o retorno à tela inicial e a distinção do desfecho no relatório disponível pelo mecanismo existente. Não usar pacientes reais.

## Limitações e achados fora do escopo

Chromium emulado não homologa Safari físico nem todos os aparelhos. Não foram executados pagamentos, autenticação fictícia, operações em banco ou registros reais. A preservação testada cobre memória, conteúdo do relatório e o caminho de histórico já protegido por regressões com transporte simulado; não certifica durabilidade remota ou segurança de RLS.

O tipo estruturado novo fica na sessão e no texto do relatório encaminhado pelo contrato existente. A coluna remota `outcome` e seus valores aceitos não foram auditados nem alterados. O salvamento remoto continua sujeito a login, plano, rede e limitações anteriores; a UI não promete salvamento online. O caminho antigo de salvamento pode abrir avisos próprios de limite/upgrade e oferecer substituição de log, mediante outra confirmação; essa política existente não foi alterada nem exercitada com dados reais.

O relatório preexistente contém a expressão “VALIDADE JURÍDICA”; esta entrega não valida essa afirmação. Declaração de óbito, documentação clínica oficial e eventual necessidade de assinatura profissional exigem revisão específica. O app registra a escolha humana e não estabelece critérios de óbito ou de interrupção da reanimação.

Para reverter: com árvore limpa, `git revert <SHA-da-entrega>` nesta branch e repetir testes/build/distribuição. Não apagar dados ou históricos, não reescrever Git, não fazer merge nem deploy de produção.
