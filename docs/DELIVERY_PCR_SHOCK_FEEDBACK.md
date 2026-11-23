# SIAV — Layout após choque e instruções objetivas

Data: 23/11/2026 (America/Sao_Paulo). Base: `8f458b6c00e653f5223d1af1eefc65be88448fd4`.
Branch: `fix/pcr-shock-feedback-mobile`.

## Problema reproduzido

A captura enviada mostrava a confirmação de choque na lateral, comprimindo cabeçalho, cronômetros e instruções. O problema foi reproduzido no artefato da base com dados sintéticos e interação real: em viewport de 390 px, o aplicativo caiu de **390 para 217,375 px** logo após o choque. O novo teste de distribuição falhou nessa comparação antes da correção.

Causa verificada:

1. `applyShockAndResume()` emitia a notificação enquanto a tela de choque ainda estava ativa.
2. `showTransientAlert()` só encaminha avisos ao painel integrado quando a tela principal da PCR está ativa.
3. O fallback criava `.transient-alert` diretamente no `body`, sem regra de posicionamento correspondente.
4. O `body` usa flex em linha. O aviso virava outro item da linha e disputava a largura com `.app-container`.

Os testes anteriores protegiam o registro/navegação do choque, mas não comparavam a largura imediatamente após o retorno com a confirmação ainda visível.

## Correção

- A confirmação visual é emitida **depois** de retornar à PCR e entra no painel integrado: **“Choque de 200 J registrado.”**, com a energia realmente registrada.
- A linha do tempo mantém seus textos anteriores; registro do choque, energia, episódio, contagem, afastamento seguro e retomada existente permanecem com a mesma lógica.
- O fallback ganha posicionamento fixo e largura limitada ao viewport, para nunca formar uma coluna lateral, inclusive em mensagens de validação. As cores seguem os tokens de tema e a transição respeita movimento reduzido.
- Não foi escondido overflow para mascarar o defeito. O teste mede a largura real do aplicativo e dos cronômetros.

## Instruções mais curtas

O cartão mostra apenas o rótulo **Agora**, a indicação atual, sua dose quando aplicável e **Próximo passo**. A repetição visual do badge “Ação crítica/RCP ativa” foi retirada; seu estado continua associado ao título por `aria-describedby`, sem ocupar espaço.

| Situação já determinada pelo protocolo | Apresentação |
| --- | --- |
| Apenas adrenalina devida | “Adrenalina indicada”, nome/dose/via e intervalo |
| Apenas antiarrítmico devido | “Antiarrítmico indicado”, alternativas e doses completas |
| Adrenalina e antiarrítmico devidos | “Medicações indicadas”, com todos os nomes/doses/vias |
| RCP sem medicação devida | Orientação curta de RCP, preservando a frequência quando presente na mensagem original |
| Histórico ou contexto incerto | “Reavaliar conduta”, mantendo os motivos de revisão visíveis |
| Próxima avaliação ao fim do ciclo | “Reavaliar ritmo ao fim do ciclo.” |

O texto original do protocolo permanece integral em **Ver orientação completa**, junto dos detalhes. Doses, vias, alternativas, intervalo da adrenalina, orientação de manter o antiarrítmico registrado e motivos de revisão continuam visíveis quando aplicáveis. Mensagens futuras/desconhecidas não são resumidas por presunção: são apresentadas integralmente. A indicação nunca registra uma administração automaticamente.

## Arquivos

- `src/pcr/rhythm.js`: somente posição e texto da confirmação visual, depois de `showScreen('pcr')`.
- `src/ui/pcr-guidance.js`: síntese de apresentação, próximo passo curto e contexto original preservado.
- `index.html`: badge redundante sem espaço visual, descrição acessível do título e “Dose indicada”.
- `pcr-interface.css`: fallback fora do fluxo e apresentação do contexto completo.
- `tests/pcr-shock-feedback.test.js`: cinco regressões do retorno/feedback, dois choques, ausência de administração automática, repetição, energia inválida e expiração.
- `tests/pcr-guidance-panel.test.js`: três casos novos de síntese/nomes/doses/mensagem futura e adequação das expectativas de texto.
- `tests/pcr-medications.test.js`: nomes e doses passaram a ser verificados no bloco de dose indicado; a verificação de esconder uma recomendação já atendida foi preservada e tornada explícita.
- `tests/distribution/pcr-shock-feedback.mjs` e `check.mjs`: novo ensaio de regressão do artefato servido exclusivamente de `dist/`.
- `tests/distribution/pcr-adrenaline-guidance.mjs`: expectativas da redação curta.
- `.github/workflows/ci.yml`: inclusão exclusivamente desta branch no CI.
- Este relatório e capturas em `docs/screenshots/pcr-shock-feedback/`.

Não houve alteração em protocolos, elegibilidade, doses, energia recomendada, algoritmos, registros clínicos, intervalos, FCT, cronômetros, encerramento, Supabase, serviços, credenciais, pagamentos, simulação, fluxogramas, dependências, lockfile, service worker ou workflow de produção. Main, PR #2 e Preview anterior preservados.

## Validação

- `npm run test:run -- --maxWorkers=2 --minWorkers=1`: **343/343**, em 27 arquivos; 335 testes anteriores e 8 novos.
- O novo ensaio de distribuição passou isoladamente após a correção. Percorre dois choques pela interface, mede largura imediatamente após o primeiro, confere a indicação após o segundo e testa um terceiro registro válido. Verifica 320, 360, 375, 390, 414, 430 e 768 px, claro/escuro, retrato, incluindo 320 × 568, sem corte nos cronômetros, doses e instruções.
- O botão de choque permanece desabilitado sem energia válida. O ensaio invoca separadamente o callback público defensivo, com energia vazia, para verificar alerta visível/fixo e ausência de registro ou retomada indevida; não habilita artificialmente o botão.
- `SIAV_CHROMIUM_PATH=/usr/bin/chromium npm run test:distribution`: **16/16**, incluindo os 15 ensaios anteriores e a nova regressão pós-choque.
- `npm run build`: configuração pública sintética de verificação; esse artefato não é publicado. Avisos preexistentes de scripts clássicos permanecem, com distribuição coberta pelo empacotamento explícito existente.
- `git diff --check`: sem erros. CI e Preview conferidos após o push e informados na entrega.

## Capturas e reteste

- [Antes: confirmação como coluna lateral](screenshots/pcr-shock-feedback/before-shock-layout.png).
- [Depois: 320 px, claro](screenshots/pcr-shock-feedback/after-shock-320-light.png).
- [Depois: 390 px, escuro](screenshots/pcr-shock-feedback/after-shock-390-dark.png).
- [Instrução curta: 390 px, escuro](screenshots/pcr-shock-feedback/instruction-390-dark.png).

Capturas do artefato real com dados sintéticos, sem injeção de estilos para ocultar o defeito. No novo Preview, abrir Visit no Safari, iniciar atendimento fictício, avaliar FV/TVSP e registrar os choques pelo fluxo existente. Conferir que a confirmação fica no painel, sem coluna lateral, e que o cartão apresenta indicação/dose/próximo passo. Não usar pacientes reais.

## Limitações e reversão

Chromium emulado não homologa Safari físico nem todos os aparelhos. Não se declara segurança clínica homologada ou continuidade após recarga/suspensão. Não foram executados pagamentos ou operações reais no backend. Alertas gerais mantêm o prazo de expiração anterior; esta entrega não muda a política de persistência ou de prioridade das notificações. Em telas curtas pode ser necessário rolar para os controles abaixo das instruções, conforme a ordem solicitada anteriormente.

Reversão: com árvore limpa, `git revert <SHA-da-entrega>` nesta branch e repetir testes/build/distribuição. Sem apagar históricos, reescrever Git, fazer merge ou deploy de produção.
