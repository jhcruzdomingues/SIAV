# SIAV — Comandos diretos e descrição sempre visível

Data: 24/11/2026 (America/Sao_Paulo). Base: `3d90b788cbf506c6a4e38682499620f66b7c0678`.
Branch: `fix/pcr-direct-command-panel`.

## Solicitação e diagnóstico

O cartão repetia a indicação no título, o nome/dose em outro bloco e o texto integral no controle “Ver orientação completa”. Na situação do print, os detalhes ainda exibiam a ressalva de amiodarona/lidocaína mesmo quando só havia adrenalina indicada, porque essa frase genérica está no retorno do protocolo.

A mudança é de apresentação: não modifica o avaliador de elegibilidade ou suas regras. A descrição necessária passa a ficar visível, em comandos, sem exigir expansão ou navegação entre blocos repetidos.

## Resultado

No caso adulto do print, com adrenalina marcada como devida pelo avaliador existente:

> **AGORA**
>
> Administre adrenalina 1 mg EV/IO.
>
> Mantenha a RCP de alta qualidade.
> Respeite o intervalo de 3–5 min entre as doses.
>
> **PRÓXIMO PASSO**
>
> Reavalie o ritmo ao fim do ciclo.

- O nome, a dose e a via aparecem uma vez no comando principal. Foram removidos o título redundante “Adrenalina indicada”, a caixa “Dose indicada” e os detalhes recolhíveis.
- Não se exibem antiarrítmicos em uma instrução exclusiva de adrenalina. Quando o protocolo indica antiarrítmico, seu comando contém nomes/doses/vias e **OU** quando há alternativas. A proibição de associação e a orientação de manter o fármaco escolhido ficam visíveis.
- Intervalo, frequência, minimização das interrupções e causas reversíveis vêm da orientação existente e são apresentados conforme o contexto, sem repetir a frase principal.
- A indicação não registra administração. Depois do registro efetivo, o comando acompanha a mesma elegibilidade anterior e não mantém uma dose ainda não devida como ordem atual.
- Histórico incerto gera comando de revisão, não de administração. A revisão fica vinculada à medicação afetada; duas doses de antiarrítmico não são apresentadas como bloqueio genérico da adrenalina que o avaliador ainda considera devida.
- Pausa mantém o aviso explícito de retomada e o botão único existente. O complemento não manda “manter” compressões enquanto seu registro está pausado.
- Atendimento encerrado mostra encerramento, sem manter comandos ativos de cuidados/reinício. ROSC ainda em atendimento ativo mostra cuidados pós-parada e a transição explícita em caso de recorrência.
- Condições clinicamente necessárias, como **“se indicado”**, não foram retiradas. Elas dependem da avaliação clínica; o que deixou de ser opcional foi o acesso à descrição na interface.
- Mensagens futuras/desconhecidas permanecem integrais e visíveis, para não reinterpretar conteúdo novo sem revisão. Falha de renderização retira o comando anterior e manda conferir o protocolo e revisar os dados.

## Implementação

- `src/ui/pcr-guidance.js`: comandos a partir das mesmas indicações `due`, redação de revisão por contexto, complementos sem duplicação e próximo passo no imperativo. Sem cálculos ou registros clínicos novos.
- `index.html`: remoção da caixa de dose duplicada e de `details/summary`. Cabeçalho, cronômetros, aviso de pausa, feedback e ordem instruções → RCP → checar ritmo preservados.
- `pcr-interface.css`: remoção dos estilos do conteúdo recolhível/caixa retirada e apresentação dos comandos em linhas, mantendo os tokens de contraste e gravidade existentes.
- `tests/pcr-guidance-panel.test.js`: 14 verificações anteriores adaptadas à nova apresentação e 9 regressões novas. Expectativas antigas de texto repetido/recolhível foram substituídas por verificação de dose/via completas, avisos visíveis, comando único, ausência de fármacos irrelevantes, revisão específica, mensagem desconhecida mesmo com sinalizador `DRUG` e retirada de comando após encerramento.
- `tests/pcr-medications.test.js`, `tests/pcr-shock-feedback.test.js` e helpers de distribuição `pcr-alerts-compressions.mjs`, `pcr-adrenaline-guidance.mjs`, `pcr-shock-feedback.mjs`: leitura da dose no comando integrado e preservação das verificações de elegibilidade, valores exatos, alternativas, registro e comportamento.
- `tests/distribution/pcr-direct-commands.mjs` e `check.mjs`: novo ensaio real de interação no artefato estático, sem backend.
- `.github/workflows/ci.yml`: inclusão desta branch na lista do CI; workflow de produção inalterado.
- Este relatório e capturas em `docs/screenshots/pcr-direct-commands/`.

Nenhuma alteração em `src/pcr/`, `src/protocols/`, estado clínico, doses, cálculos, choques, FCT, intervalos, cronômetros, medicamentos, relatórios, finalização, autenticação, Supabase/schema/RLS/credenciais, serviços, pagamentos, simulados, fluxogramas, dependências, lockfile ou service worker. A guarda de encerramento é somente visual; não muda a transição ou o histórico do atendimento.

## Verificação

- `npm run test:run -- --maxWorkers=2 --minWorkers=1`: **352/352**, em 27 arquivos; 343 testes anteriores e 9 novos. Os seis primeiros casos novos falharam na base antes da correção.
- Ensaio novo isolado: aprovado. Executa dois choques pela interface com dados sintéticos, confere o comando de adrenalina, ausência de repetição/expansão e a visibilidade dos complementos. Depois registra uma única administração pela interface e verifica a retirada da ordem; histórico incerto exige revisão.
- Layout: **320, 360, 375, 390, 414, 430, 450 e 768 px**, retrato, claro/escuro, incluindo **320 × 568**; sem texto cortado ou overflow horizontal e contraste mínimo 4,5:1 nos textos avaliados. O cartão cabe no viewport testado após rolar até ele; não se promete que toda a tela PCR caiba sem rolagem.
- `SIAV_CHROMIUM_PATH=/usr/bin/chromium npm run test:distribution`: **17/17**. A suíte constrói e serve exclusivamente `dist/`, com SDK remoto substituído por fixture sem sessão e sem pagamentos ou chamadas reais ao backend.
- `npm run build`: configuração pública sintética de verificação local; o artefato sintético não é publicado. Avisos preexistentes dos scripts clássicos continuam cobertos pela estratégia explícita de distribuição.
- `git diff --check`: sem erros. CI e Preview são conferidos após o push e informados na entrega.

## Capturas e reteste

- [Comando em 320 px, claro](screenshots/pcr-direct-commands/commands-320-light.png).
- [Comando em 390 px, escuro](screenshots/pcr-direct-commands/commands-390-dark.png).
- [Comando no limite de largura do app, claro](screenshots/pcr-direct-commands/commands-450-light.png).

No novo Preview, abrir Visit no Safari, iniciar um atendimento fictício e percorrer a avaliação/registro de choques existentes. Conferir comando com nome/dose/via em uma única frase, complementos visíveis e próximo passo, sem botão de expansão. Após registrar a administração sintética, verificar que a ordem não continua indevidamente. Não usar pacientes reais.

## Limitações e reversão

Chromium emulado não homologa Safari físico, VoiceOver, todos os aparelhos ou texto ampliado. Esta entrega verifica regressões de software e não revalida clinicamente as doses/protocolos existentes. Não se promete continuidade de PCR após recarga/suspensão ou persistência remota. Dados usados exclusivamente sintéticos; nenhuma operação real no Supabase, pagamento, merge ou deploy de produção.

Main, PR #2 e Preview anterior preservados. Para reverter, usar `git revert <SHA-da-entrega>` nesta branch, com árvore limpa, e repetir testes/build/distribuição. Não apagar históricos nem reescrever Git.
