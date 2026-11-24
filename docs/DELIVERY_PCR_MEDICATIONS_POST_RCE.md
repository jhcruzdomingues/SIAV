# SIAV — Medicações rápidas e sinais vitais pós-RCE

Data: 24/11/2026 (America/Sao_Paulo). Base: `4d16b8924e684f70337b79868ee2cee6e0d469e2`.
Branch: `fix/pcr-medications-post-rce`.

## Plano técnico registrado antes da implementação

### Diagnóstico verificado

- O cartão inicial usa texto longo para pedir uma avaliação de ritmo ainda não registrada.
- O modal de medicamentos não tem largura limitada à interface mobile, repete informações, trata todas as opções com o mesmo destaque e mantém os dados principais depois de controles de edição.
- As doses fixas já são preenchidas apenas em oportunidades adultas válidas. Lidocaína tem faixa por kg e não possui quantidade exata automática. Atropina, bicarbonato e magnésio não têm indicação automática de PCR neste avaliador e permanecem como registro manual.
- O modal de sinais vitais abre durante PCR sem guarda, embora seu próprio texto informe que não se deve preenchê-lo durante RCP ativa.
- A finalização atual grava o relatório imediatamente após RCE. Abrir o formulário depois disso deixaria os sinais vitais fora daquele relatório.

### Decisões de implementação

1. Trocar a mensagem inicial por **“Informe o ritmo.”** quando esse for o dado ausente, sem sugerir medicamento antes da avaliação. Histórico realmente incompleto continua exigindo revisão.
2. Retirar o botão de sinais vitais da PCR. Após RCE confirmado, executar imediatamente a transição clínica existente, que interrompe RCP/tempos; abrir o formulário e só depois finalizar administrativamente. Permitir salvar medidas reais ou finalizar sem informar, sem criar valores padrão. Fechar o formulário não desfaz o RCE.
3. Levar os sinais vitais ao evento/relatório do mesmo atendimento antes de encerrar. Preservar o horário da confirmação de RCE e bloquear uso de formulário antigo em outro atendimento/episódio. As regras de classificação de pressão/FC existentes permanecem.
4. Destacar adrenalina e amiodarona, listar as demais abaixo e manter um único botão de confirmação de registro. Dose fixa já validada: selecionar → confirmar. Informação real diferente, administração anterior, via fora do algoritmo ou contexto incerto: revisão manual explícita.
5. Para lidocaína adulta elegível, calcular a faixa em mg a partir da faixa mg/kg já existente. Pedir peso somente quando necessário e ausente, com confirmação explícita do valor. Não inferir peso, não escolher automaticamente um ponto da faixa. Informar a quantidade real antes de confirmar o registro. Não aplicar doses adultas à pediatria.
6. Usar o mesmo cálculo numérico de peso/faixa na apresentação e na validação para evitar divergência de ponto flutuante nos limites. Manter coeficientes, doses e critérios clínicos existentes; não introduzir arredondamento clínico para mg inteiros.
7. Não adicionar alteplase como rotina de PCR. Sua indicação e seu esquema precisam de auditoria clínica específica; o exemplo não autoriza inventar uma nova dose/protocolo.

### Riscos e critérios de aceitação

- RCE é confirmado antes do formulário; o formulário não estabelece RCE por conta própria. Não registrar compressões fictícias durante o preenchimento pós-RCE nem somar esse período ao tempo de PCR/FCT.
- Sem confirmação de RCE, não abrir nem salvar sinais vitais nesse fluxo. Não inferir medidas ausentes, nem declarar estabilidade a partir de campos vazios. Conservar os limiares existentes de PA/FC e apresentar alertas já previstos.
- Uma escolha/peso/cálculo não registra medicação. Confirmar a dose efetivamente administrada uma única vez, preservando ID, quantidade, unidade, via, horários, episódio e peso informado.
- Faixas exigem uma quantidade real; ausência de peso ou falta de indicação não cria sugestão automática. A guarda/revisão de registros manuais continua disponível.
- Formulários antigos não modificam paciente ou episódio novos. Notas, choques e históricos permanecem preservados.
- Testes de regressão, suíte completa, build, distribuição e interação Chromium em retrato, claro/escuro. Safari físico e segurança clínica não serão declarados homologados.
- Sem alteração de Supabase/schema/RLS/credenciais, produção, pagamentos, main ou PR #2. Branch anterior de Preview preservada; sem merge.

## Implementação e resultados

Plano registrado no commit `4f2de1f`, antes das mudanças funcionais. A implementação reutiliza `recordROSC()` e o ledger de tempos existentes. Não altera intervalos, relógios de PCR/ciclo, FCT, doses ou critérios de oportunidade clínica. A única mudança no avaliador médico é usar a mesma normalização numérica de multiplicação empregada no formulário para comparar os limites em mg da lidocaína. Exemplo: `77,3 × 0,75 = 57,975 mg`, sem rejeitar esse limite pelo ruído binário `57.974999999999994`.

### Comportamento entregue e causas corrigidas

| Problema verificado | Correção |
| --- | --- |
| Mensagem extensa para a primeira avaliação de ritmo | **“Informe o ritmo.”**, somente quando a avaliação inicial é o dado ausente e não há registros de medicação/histórico incerto. Mantida a revisão nos demais casos. |
| Modal de medicação alargado, informações repetidas e mesmo destaque para todas as drogas | Largura máxima de 420 px, adrenalina/amiodarona acima, demais opções abaixo, dose e via visíveis, um botão **CONFIRMAR REGISTRO** sempre acessível, corpo com rolagem em telas baixas. |
| Mudança de cor herdada produzia contraste intermediário baixo ao selecionar/trocar tema | Transições desativadas apenas nos dois formulários alterados; paleta compartilhada de claro/escuro. |
| Texto da adrenalina repetia o esquema mesmo antes do próximo intervalo | Aviso explícito de que a próxima dose ainda não está indicada; nenhum preenchimento automático nesse contexto. |
| Dose em mg/kg sem cálculo a partir do peso | Para lidocaína adulta elegível, mostrar faixa calculada com o peso confirmado. Se ausente, pedir e confirmar peso; quantidade real continua sendo informada pelo operador, sem escolha automática de um ponto da faixa. |
| Botão de sinais vitais disponível durante PCR | Botão retirado. O formulário só abre após RCE explicitamente confirmado, antes de salvar o relatório. Guarda também na função de abertura e no registro. |
| Finalização anterior salvaria relatório antes das medidas pós-RCE | Parar a fase clínica com a transição existente; incluir medidas no log do mesmo atendimento e então finalizar administrativamente. Permitir finalizar sem medidas, registrando sua ausência. |
| Formulário antigo poderia atingir outro atendimento/episódio | Contexto vinculado a início do atendimento e ID do episódio; peso também vinculado à seleção clínica. Guardas e testes contra herança/registro em outro contexto. |

Adrenalina e amiodarona mantêm os valores e oportunidades do algoritmo adulto já implementado. Selecionar não grava; confirmar registra o fato uma vez com seu ID, dose, unidade, via, horário efetivo, horário de registro, episódio e peso confirmado quando disponível. Edição fora do padrão, histórico incerto, via ET ou registro retrospectivo continuam exigindo revisão manual. Atropina, bicarbonato e magnésio permanecem sem sugestão automática nesse avaliador. Não foi adicionada alteplase.

Após RCE, fechar o formulário volta ao painel e **não** desfaz o RCE. É possível retomar pelo fluxo de finalização; o rascunho do mesmo episódio e o horário originalmente confirmado são preservados. Recorrência ou novo atendimento invalidam o formulário anterior. A hora confirmada não é substituída nem impede finalizar se o relógio do dispositivo mudar durante o preenchimento. Isso não corrige a precisão do relógio do dispositivo.

### Arquivos alterados

- `index.html`, `pcr-interface.css`: seleção de medicação, dose/via, peso explícito e formulário pós-RCE; retirada do botão de sinais vitais da PCR; ajuste das três ações secundárias.
- `src/pcr/medications.js`: seleção, faixa por peso, confirmação de peso, revisão manual, mensagens e guardas de operação/contexto.
- `src/utils/dose-math.js`, `src/protocols/medical.js`: normalização numérica compartilhada dos limites por peso, sem novos coeficientes ou arredondamento clínico.
- `src/pcr/vitals.js`: abertura/salvamento exclusivos pós-RCE, campos ausentes distintos de zero, validação e inclusão de medidas/alertas existentes no log antes da finalização.
- `src/ui/finish-attendance.js`, `src/pcr/outcomes.js`, `src/main.js`: etapa pós-RCE antes do encerramento administrativo, horário da confirmação preservado, entrada legada encaminhada ao mesmo fluxo.
- `src/ui/events.js`: listeners dos formulários, peso, salvar/omitir medidas, fechar e teclado pós-RCE.
- `src/ui/pcr-guidance.js`: comando inicial curto, mantendo revisão quando há incerteza.
- `.github/workflows/ci.yml`: somente inclusão desta branch no gatilho de CI; sem alteração de workflow de produção.
- `tests/pcr-medications-post-rce.test.js`: **37 novos casos**. `tests/pcr-finish-attendance.test.js`: adaptar finalização por RCE à etapa de medidas, preservando as verificações anteriores de dados, relatório único e tempo.
- `tests/distribution/pcr-medications-post-rce.mjs`, `tests/distribution/check.mjs`: novo cenário completo com build e servidor estático exclusivo de `dist/`.
- `tests/distribution/pcr-alerts-compressions.mjs`, `tests/distribution/pcr-finish-attendance.mjs`, `tests/distribution/pcr-interface.mjs`: validar sinais vitais no contexto real pós-RCE em vez de abrir o modal artificialmente durante PCR.
- Este documento e cinco capturas em `docs/screenshots/pcr-medications-post-rce/` (não distribuídos ao navegador).

### Testes e evidências

| Verificação | Resultado |
| --- | --- |
| Suíte completa, Node 22, `npm run test:run -- --maxWorkers=2 --minWorkers=1` | **389/389**, 28 arquivos; preservados os 352 anteriores e adicionados 37 casos. |
| Build, `npm run build` | Concluído com configuração publicável sintética local; artefato somente para validação, não publicado. |
| Novo fluxo em Chromium mobile contra build real | Aprovado: seleção → confirmação, peso explícito, faixa exata, deduplicação, RCE, rascunho, relatório e tempos preservados. |
| Distribuição completa, `SIAV_CHROMIUM_PATH=/usr/bin/chromium npm run test:distribution` | **18/18**, sem falhas ou cenários ignorados; preservados os 17 anteriores. |
| Sintaxe JavaScript e `git diff --check` | Sem erros na conferência local. |

Os testes de regressão cobrem RCE imediato e finalização posterior sem aumentar o tempo/FCT, recusa de RCE, omissão de medidas sem inventar valores, relatório único, fechamento/retomada, recorrência, atendimento B, limites de validação, alerta de hipotensão existente, atalhos/foco, dose fixa rápida, nenhum registro na seleção, peso confirmado, peso inválido, pediatria, histórico incerto, faixa sem dose escolhida automaticamente, limites decimais das duas doses, valores fora da faixa, contexto obsoleto e horários preservados.

Chromium em retrato: larguras **320, 360, 375, 390, 414, 430 e 768 px**, temas claro/escuro, contraste mínimo 4,5:1 nos textos verificados, ausência de corte lateral e alvos principais de pelo menos 44 px. A suíte também mantém os cenários existentes de iPhone SE/iPhone 13 emulados, metrônomo, compressões, choques, cadastro, sons, aparência, assets e quiz offline.

Capturas com dados exclusivamente sintéticos:

- [Medicação — 320 px, claro](screenshots/pcr-medications-post-rce/medication-320-light.png)
- [Medicação — 390 px, escuro](screenshots/pcr-medications-post-rce/medication-390-dark.png)
- [Lidocaína — faixa por peso e quantidade real](screenshots/pcr-medications-post-rce/lidocaine-320-light.png)
- [Pós-RCE — 320 px, claro](screenshots/pcr-medications-post-rce/post-rce-320-light.png)
- [Pós-RCE — 390 px, escuro](screenshots/pcr-medications-post-rce/post-rce-390-dark.png)

### Limitações e pontos que exigem revisão própria

- Chromium emulado não homologa Safari físico, WebKit/iOS, teclado virtual, áudio ou suspensão do dispositivo. Confirmar em Safari e Chrome mobile físicos, sempre com dados sintéticos.
- O formulário pós-RCE não determina presença de circulação, não mede sinais vitais e não substitui monitorização durante PCR (por exemplo, capnografia). O RCE é confirmado pelo operador.
- A classificação existente de PA/FC continua exigindo os três valores: PA sistólica, diastólica e FC. Medidas parciais são documentadas sem declarar estabilidade. A abrangência/adequação clínica dessa classificação exige auditoria própria; não foram criados novos limiares terapêuticos.
- Não foram adicionados protocolos pediátricos, trombólise/alteplase, doses de outros medicamentos, novas indicações ou garantias clínicas. Medicações sem dose validada ficam em registro manual.
- Persistência offline, isolamento por usuário, backend, RLS e segurança de dados mantêm as limitações da auditoria arquitetural. Não houve consultas ou alterações no Supabase nem mudanças de contrato de persistência.
- Não há promessa de recuperar uma PCR após recarga/suspensão. O rascunho pós-RCE permanece apenas na sessão atual. Fechá-lo não reabre a fase de PCR.
- Vite mantém os avisos conhecidos para scripts clássicos empacotados pela lista explícita de assets. A suíte de distribuição verifica os destinos reais, sem pagamentos/backend reais.

### Como testar no Safari

1. Abrir no Safari do iPhone o Preview correspondente à branch **`fix/pcr-medications-post-rce`** e ao commit de implementação desta entrega. Usar o botão **Visit** da execução Vercel; o Preview anterior permanece na branch anterior.
2. Iniciar atendimento sintético. Antes da primeira avaliação, conferir o comando curto e a ausência do botão de sinais vitais.
3. Percorrer uma oportunidade clínica válida; abrir Medicações, selecionar uma opção e conferir a dose/via antes de **CONFIRMAR REGISTRO**. Seleção isolada não deve criar registro. Editar dose diferente ou horário anterior exige revisão manual.
4. Quando a lidocaína estiver indicada pelo percurso existente, testar com e sem peso. Confirmar peso não registra medicação. Informar a quantidade real dentro da faixa ou revisar manualmente um registro fora do padrão.
5. Em **Finalizar atendimento → RCE obtido → confirmar**, conferir o formulário pós-RCE. Informar medidas sintéticas e salvar; verificar o relatório. Repetir com **Finalizar sem informar**, e com fechar/retomar, sem perder RCE nem acrescentar tempo de PCR.
6. Repetir claro/escuro e com teclado aberto. Não usar dados reais nem iniciar pagamentos.

### Reversão

Para descartar o Preview, continuar acessando a branch anterior, preservada em `4d16b8924e684f70337b79868ee2cee6e0d469e2`. Para reverter código, criar outra branch a partir desta e usar `git revert` no commit de implementação; o commit `4f2de1f` contém apenas o plano. Não reescrever histórico, não apagar dados e não alterar main/PR #2. Nenhuma migração precisa ser revertida.
