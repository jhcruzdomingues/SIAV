# SIAV — Painel de Aparência compacto

Data: 16/11/2026 (America/Sao_Paulo).
Base: `7e8c5760f41a23a5fcf63760575f842acbe96757`, incluindo a tela de Sons aprovada pelo usuário.
Branch: `fix/appearance-settings-presentation`.

## Resultado e causa

O usuário pediu opções menores e apresentação simples, alinhada às cores, fontes e layout do aplicativo. O painel anterior usava cartões com miniaturas de tela, padding/margens grandes, emojis e efeitos de brilho, escala e animação. Na base, cada opção media aproximadamente **260 px de altura em 320 px**. O teste de regressão novo reproduziu o excesso e falhou antes da correção.

Os três cartões foram substituídos por linhas de seleção para **Claro, Escuro e Automático**, com ícones SVG locais de 20 px, descrição curta e marca discreta na opção ativa. As opções medem **68 px** nas condições normais testadas; em 320 px, a descrição de Automático ocupa duas linhas, elevando essa opção a aproximadamente **86 px**, sem cortar o texto. Os alvos de toque permanecem maiores que 44 px.

O cabeçalho compacto, superfícies neutras, tipografia herdada e ação azul usam os mesmos tokens `--ui-*` de Sons e do restante do aplicativo. O painel tem largura máxima de 440 px, corpo com rolagem para alturas reduzidas e ações acessíveis no rodapé. As regras novas são restritas a `#theme-settings-modal`; incluem foco visível, área segura inferior e respeito a `prefers-reduced-motion`.

As escolhas viraram botões nativos, operáveis por toque, Enter e Espaço. A seleção mantém `.active` e agora sincroniza `aria-pressed` para tecnologias assistivas. Não foram alterados os valores `light`, `dark`, `auto`, a chave `siav_theme`, sua persistência ou a lógica que acompanha o sistema operacional.

O tema já era aplicado e salvo imediatamente ao selecionar. O antigo botão “Aplicar Tema” apenas fechava o modal. Ele passa a se chamar **Concluir**, com o mesmo callback de fechamento, e uma frase curta esclarece que a escolha é salva ao selecionar. Fechar não introduz confirmação extra nem mudança de preferência.

## Arquivos alterados

- `index.html`: exclusivamente o bloco de Aparência; cabeçalho, linhas nativas, textos e rodapé. IDs e callbacks existentes preservados.
- `settings-menu-styles.css`: regras adicionais restritas ao painel, mantendo o CSS anterior e as outras telas.
- `settings-integration.js`: duas atribuições de `aria-pressed` no atualizador visual; lógica de tema, armazenamento e eventos do sistema preservados.
- `tests/appearance-settings.test.js`: quatro regressões de semântica/callbacks, seleção acessível, preferência automática e reabertura.
- `tests/distribution/appearance-settings.mjs` e `tests/distribution/check.mjs`: teste de apresentação/interação sobre o artefato real servido exclusivamente a partir de `dist/`.
- `.github/workflows/ci.yml`: somente inclusão da branch no gatilho do CI existente.
- Este relatório e três capturas em `docs/screenshots/appearance-settings/`.

Comparações confirmaram HTML idêntico antes/depois do bloco de Aparência; o JavaScript anterior permanece idêntico ao remover as duas atribuições acessíveis, e o CSS anterior é preservado integralmente. Nenhuma alteração em `src/`, Sons, algoritmos, doses, ritmos, temporizadores, registros, dependências/lockfile, Supabase, pagamentos, service worker ou workflow de produção. Main, PR #2 e branch anterior de Preview preservados.

## Validação

Ambiente: Node 22.23.4 / npm 10.9.9, Chromium instalado e Playwright existente. Sem dependências novas.

- `npm run test:run -- --maxWorkers=2 --minWorkers=1`: **273/273**, em 21 arquivos; os 269 anteriores preservados e quatro regressões adicionadas.
- `npm run build`: concluído com configuração sintética de verificação local. Esse artefato não é publicado; variáveis remotas de Preview não foram modificadas.
- Teste novo isolado de distribuição: aprovado após reproduzir o tamanho excessivo na base.
- Suíte completa `SIAV_CHROMIUM_PATH=/usr/bin/chromium npm run test:distribution`: **11/11 aprovados**, incluindo as dez verificações anteriores e o ensaio novo de Aparência.
- `git diff --check`: sem erros.

O ensaio cobre **320, 360, 375, 390, 414, 430 e 768 px**, em retrato, claro/escuro: altura compacta, ausência de corte/rolagem horizontal, espaço de fechamento, ações acessíveis, uma seleção ativa e contraste de texto de pelo menos 4,5:1 nos elementos avaliados. Também verifica toque, teclado, preferência mantida ao reabrir e recarregar, automático acompanhando mudança do sistema, escolha manual preservada apesar do sistema e movimento reduzido.

Os contextos são descartáveis, com fixtures externas já existentes. Nenhuma conta, sessão autenticada, informação de paciente ou transação real é usada. As dez verificações anteriores de distribuição continuam protegendo PCR, perfil, Sons, arquivos públicos, SW e quiz offline. Os avisos conhecidos do Vite sobre scripts clássicos permanecem; sua distribuição é conferida pela suíte existente.

Logs locais: `/workspace/work/appearance-settings-presentation/`.

## Capturas, Preview e reteste

- [Antes: 320 px, claro](screenshots/appearance-settings/before-320-light.png).
- [Depois: 320 px, claro](screenshots/appearance-settings/appearance-320-light.png).
- [Depois: 390 px, escuro](screenshots/appearance-settings/appearance-390-dark.png).

Capturas do artefato real, sem injeção de estilos para ocultar defeitos. Os ícones novos são SVG locais e aparecem sem a CDN externa de fontes.

No Safari/Chrome mobile, abrir o deployment **Preview desta branch**, conferir o SHA informado na entrega e tocar em **Visit → Configurações → Aparência**. Alternar as três opções, fechar e reabrir, conferir a seleção após recarga e mudar o tema do dispositivo quando Automático estiver selecionado. No caso de Claro/Escuro, uma mudança do sistema deve preservar a escolha explícita. O link do deployment anterior continua referente à sua própria versão.

Emulação Chromium não equivale a homologação em Safari físico ou em todos os modelos. Permanecem pendentes o reteste no aparelho, texto ampliado pelo sistema e alturas disponíveis com barras/teclado do navegador. Status remoto de Preview bem-sucedido não representa teste de interação no site hospedado.

## Reversão

Com árvore limpa, `git revert <SHA-da-entrega>` na branch dedicada e repetir testes, build e distribuição. Não reescrever histórico, apagar preferências nem modificar banco. O resultado do CI e do Preview após o push é informado na entrega. Nenhum merge ou deploy de produção.
