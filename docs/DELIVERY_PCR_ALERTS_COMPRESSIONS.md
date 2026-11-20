# SIAV — Avisos de PCR e botão único de compressões

Data: 20/11/2026 (America/Sao_Paulo). Base: `e4c86578172fc1b9379f41e888334e99d79095a5`.
Branch: `fix/pcr-alerts-compression-toggle`.

## Resultado

O usuário esclareceu que os cronômetros funcionam e solicitou destaque para retomar compressões após a pausa, **somente no painel principal da PCR**. Pediu também que o próprio botão de início tenha função de pausa. O painel de avisos deve continuar mais organizado e direto.

- Um único botão alterna **INICIAR COMPRESSÕES → PAUSAR COMPRESSÕES → RETOMAR COMPRESSÕES**. O controle de pausa separado foi removido da interface. O dispatcher chama as funções existentes de iniciar/pausar; não cria outro relógio.
- Na pausa registrada, botão vermelho, texto branco, pulso lento de sombra e aviso **“Compressões interrompidas. Retome a RCP quando seguro.”** Em RCP ativa, o botão oferece pausa e fica sem pulso. ROSC/encerramento desabilitam o controle e retiram o destaque de retomada.
- O controle fica logo abaixo da faixa de cronômetros e antes das orientações, visível na primeira área de tela nas larguras testadas. Fonte/tamanho/ícones seguem os componentes já ajustados. O alvo não se desloca nem muda de escala com a animação. `prefers-reduced-motion` mantém o destaque vermelho, desativando o pulso.
- O atalho C usa a mesma ação, apenas no painel principal visível, sem modal, modificadores ou repetição de tecla. Ctrl+C e tecla mantida pressionada não alternam RCP.
- Avisos organizados em título, doses em linhas, ressalvas essenciais visíveis e contexto completo acessível em **Ver orientação completa**. Intervalo de adrenalina, orientação de manter o antiarrítmico registrado, alternativas/não associação e motivos de revisão continuam visíveis quando aplicáveis, derivados da orientação existente. Textos completos do protocolo permanecem acessíveis.
- Feedback transitório passa a ficar depois da faixa de tempos. Sua abertura não desloca os cronômetros. Título, ícone e rótulos só são recriados quando mudam, reduzindo mutações/reanúncios por tick.
- Falha de renderização retira a dose visual anterior e mostra revisão necessária; não mantém uma recomendação antiga como atual.

## Causa e distinção clínica

O botão anterior de início chamava apenas `startCompressions` e ficava desabilitado durante as compressões; a pausa dependia de outro botão. Não existia um controle único com os três estados pedidos.

O fluxo registra a pausa na **avaliação do ritmo**: tanto a abertura manual do seletor quanto o fim de ciclo usam os caminhos de pausa já existentes. Após FV/TVSP, a tela de choque é aberta com essa pausa registrada. **`setupShockActionScreen` não pausa compressões por si só**; isso foi protegido por regressão. O aviso descreve o registro do aplicativo, sem detecção física de compressões.

Esta entrega não remove a pausa de análise, não cria retomada automática ao apenas abrir/cancelar a tela de choque e não adiciona botão de RCP à tela de choque. A ação combinada já existente de registrar choque e retomar RCP permanece com a mesma lógica e exigência de afastamento seguro. Isso preserva o fluxo clínico enquanto torna o estado e o caminho de retomada claros no painel solicitado.

## Arquivos

- `index.html`: reorganização do painel de orientações, banner após os tempos e controle único com aviso de retomada.
- `src/ui/compressions.js`: dispatcher de início/pausa usando as funções do núcleo existente.
- `src/ui/events.js`: ligação do botão e adequação do atalho C.
- `src/ui/pcr-guidance.js`: estado/texto/ARIA do controle e apresentação da orientação; doses e elegibilidade vêm do mesmo módulo clínico.
- `pcr-interface.css`: estilos específicos dos avisos/controle e pulso de retomada, sem mudar os estilos dos relógios existentes.
- `tests/pcr-compressions-control.test.js`: nove regressões de controle, pausa/retomada, tempo/episódio/registros, fluxo de choque, suspensão, ROSC e teclado.
- `tests/pcr-guidance-panel.test.js`: cinco regressões de informações clínicas, ressalvas visíveis, falha sem dose antiga, estabilidade de nós e ausência de alteração de registros.
- `tests/distribution/pcr-alerts-compressions.mjs` e `tests/distribution/check.mjs`: ensaio do artefato servido exclusivamente a partir de `dist/`.
- `tests/mobile-care-interactions.mjs`: adaptação do script opcional para usar o mesmo botão na pausa.
- `.github/workflows/ci.yml`: somente inclusão desta branch no CI existente.
- Este relatório e capturas em `docs/screenshots/pcr-alerts-compressions/`.

Comparações confirmaram HTML idêntico na faixa dos três cronômetros e nenhuma alteração em `src/pcr/`, `src/protocols/`, `src/config/`, serviços, Supabase, paciente, áudio, Sons, Aparência, dependências/lockfile, service worker ou workflow de produção. O ledger, timestamps, prazo do ciclo, FCT, doses, desfibrilação e critérios de elegibilidade permanecem no núcleo original.

## Verificação

Node 22.23.4 / npm 10.9.9, Chromium e Playwright existentes. Sem novas dependências.

- `npm run test:run -- --maxWorkers=2 --minWorkers=1`: **297/297**, em 24 arquivos; 283 testes anteriores e 14 regressões novas.
- Testes novos do controle reproduziram o problema de botão desabilitado/ação única antes da correção; os nove casos passaram depois. Demais regressões de medicamentos, notas, FCT e ROSC foram preservadas.
- `npm run build`: concluído com configuração sintética de verificação local. O artefato sintético não é publicado; variáveis remotas não foram alteradas.
- Ensaio novo isolado de distribuição: aprovado.
- Suíte completa `SIAV_CHROMIUM_PATH=/usr/bin/chromium npm run test:distribution`: **13/13**, incluindo o novo ensaio mobile do artefato de produção.
- `git diff --check`: sem erros.

O ensaio mobile usa **320, 360, 375, 390, 414, 430 e 768 px**, em retrato, claro/escuro: contraste de pelo menos 4,5:1 nos textos avaliados, ausência de corte, controle compacto na primeira área visível, pulso apenas na pausa, movimento reduzido, manutenção do prazo do ciclo e posição estável dos cronômetros com feedback. Também exerce tempo global durante pausa, avaliação de FV, retorno da tela de choque, ação combinada de choque/retomada e ROSC desabilitando o botão.

Fixtures de apresentação colocam um caso sintético no passo 8 para cobrir todas as doses/alternativas, usando o módulo de elegibilidade real. A sequência clínica completa continua sob os testes anteriores; a fixture não representa três choques reais ocorridos no horário exibido. O encerramento/export de relatório é suprimido apenas no ensaio sintético de ROSC para manter o painel aberto, sem alterações no produto. Não se usam pacientes reais, autenticação fabricada, chamadas reais ao backend ou pagamentos. O script opcional Vite foi adaptado, mas a validação desta entrega usa a suíte de distribuição.

## Capturas e reteste

- [Pausa e retomada: 320 px, claro](screenshots/pcr-alerts-compressions/pcr-320-light-paused.png).
- [Pausa e retomada: 390 px, escuro](screenshots/pcr-alerts-compressions/pcr-390-dark-paused.png).
- [Orientação e ressalvas: 390 px, escuro](screenshots/pcr-alerts-compressions/pcr-390-dark-guidance.png).

Capturas do artefato real do ensaio, sem injeção de estilos para ocultar defeitos. Não são capturas do Safari físico. Fontes externas de ícones podem ser bloqueadas no ensaio; o controle novo usa SVG local.

No Preview desta branch, conferir o SHA informado na entrega e tocar **Visit → Iniciar PCR**. Usar um caso fictício: iniciar compressões, pausar pelo mesmo botão, verificar aviso/pulso e retomar. Confirmar que o tempo global segue na pausa e o prazo do ciclo não reinicia na retomada. Avaliar a legibilidade dos avisos e abrir o contexto completo. Na avaliação do ritmo/choque, seguir o fluxo de registro e afastamento já existente, sem pacientes reais.

## Limitações e itens separados

Chromium emulado não homologa Safari físico, todos os modelos, texto ampliado ou interação real de desfibrilação. O registro de compressões depende da ação do operador; a UI não detecta compressões físicas. Não se declara segurança clínica homologada nem continuidade clínica após recarga/suspensão.

A auditoria inicial levantou pontos de compatibilidade/reassociação dos relógios e apresentação de segundos fracionários. Foram investigados com falhas sintéticas, sem estabelecer que sejam o defeito observado no aparelho. Após o esclarecimento de que os cronômetros funcionam, essas alterações foram separadas e **não integram esta branch**. O indicador de medicação já é iniciado na confirmação do ritmo e depois do registro de administração, conforme o código atual. Uma revisão adicional dos relógios deve ser tratada separadamente.

## Reversão e preservação

Com árvore limpa, `git revert <SHA-da-entrega>` nesta branch e repetir testes/build/distribuição. Não apagar dados, históricos ou preferências nem reescrever histórico. Main, PR #2 e a branch anterior de Preview preservados. Nenhum merge, alteração no Supabase ou deploy de produção. CI e Preview são conferidos após o push e informados na entrega.
