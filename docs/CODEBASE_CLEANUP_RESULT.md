# SIAV — Resultado da auditoria e limpeza estrutural

Data: 10/11/2026 (America/Sao_Paulo). Branch exclusiva: `audit/repository-cleanup-2026-11`.

Base funcional: `581dd7f76830b9cc794729a435a8c9be3177d49f`. A branch remota já continha `fde38d1b698d0a970a37d758f37f757e3dfa5ac2`, que adicionou [a auditoria inicial](CODEBASE_CLEANUP_AUDIT_2026-11.md); esse histórico foi preservado. `main` e `fix/adult-pcr-antiarrhythmics` não foram modificadas.

## 1. Resultado executivo e limites

Foram examinados todos os **123 arquivos** da entrada da auditoria (122 na base funcional, mais o relatório inicial). Apenas **três itens de categoria A** foram excluídos: um pacote de extensão de IDE, um arquivo TypeScript vazio fora do formato de workflows e um backup CSS sem consumidor. Nenhum arquivo funcional, dado, mídia, dependência, lockfile, protocolo, preço ou configuração de produção foi alterado. Documentos históricos continuam disponíveis, inclusive os que mencionam caminhos removidos.

Economia bruta na árvore de trabalho: **15.144.518 bytes** (14,44 MiB; **88,99%** dos bytes iniciais). Isso **não** representa redução do histórico Git, do clone ou do download mobile. Os três itens já estavam fora do bundle do aplicativo. A adição de testes e deste relatório é discriminada abaixo.

A limpeza é conservadora: ausência de import convencional, cobertura baixa, nome antigo, comentário TODO ou duplicação não bastaram para excluir código. Módulos clínicos alternativos e integrações comerciais permanecem para investigação específica. Há defeitos preexistentes importantes, especialmente na distribuição de assets e no offline; testes verdes não os resolvem nem homologam segurança clínica ou Safari físico.

## 2. Método e abrangência

1. Inventário por `git ls-files -z`, tamanho exato e SHA-256 de cada blob; identificação dos binários e inspeção do manifesto VSIX como ZIP, sem executar a extensão.
2. Parsing AST (Acorn já instalado transitivamente) dos **70 arquivos `.js`** da entrada: **189 arestas** de imports, reexports, `import()` e `new URL(..., import.meta.url)`; **305 nomes de exports nomeados** (contagem inclui reexports); **61 atribuições/exposições globais**; **659 ocorrências** de eventos e seleção de DOM. Esses números são métricas de sintaxe, não número de funcionalidades, funções mortas ou consumidores exclusivos. Exports default, TypeScript, CJS, `.mjs` e handlers HTML foram complementados por inspeção textual. Nenhum parser foi adicionado às dependências do projeto.
3. Grafo alcançável a partir dos sete scripts da entrada: **42 arquivos JS**, incluindo quiz e simulação carregados sob demanda. Não foram detectados componentes fortemente conexos no grafo de módulos locais; o acoplamento de estado, globals e eventos continua expressivo.
4. Inspeção de todos os HTML, CSS, testes, JSON, configurações, documentação, workflows e backend versionado; buscas por caminho completo, basename e nomes das funções, separando referências de documentação de consumidores executáveis. Foram resolvidas **26 referências HTML locais**; seis ocorrências apontam para arquivos já ausentes (seção 9). URLs externas, caminhos de atributos/data, concatenações e seletores dinâmicos receberam revisão própria. Foram encontradas **103 operações sintáticas** de alteração de classes/tema no JS inicial, motivo para não executar PurgeCSS automaticamente.
5. Conferência de `window.SIAV`, `Object.assign(window, ...)`, handlers inline, event bus, callbacks DOM, SDKs CDN, rotas de retorno, seleção de áudio, Worker, SW, precache, manifest e globs de configuração. Métodos de módulos ativos podem ser acessados por namespaces ou globais mesmo sem chamada nominal no mesmo arquivo.
6. Verificação por instalação limpa, suíte repetida, cobertura, build, sintaxe JS, interações Chromium com viewport/toque mobile e comparação byte a byte das saídas de build. Todos os testes usam dados sintéticos e contextos de navegador novos. Nenhum acesso real a Supabase, pagamento ou dados clínicos foi necessário.

A análise é completa quanto à árvore versionada fornecida; não há inventário de consumidores externos, configurações reais do provedor de hospedagem, páginas abertas por usuários antigos ou estado do banco de produção. Uma busca sem resultado foi tratada como evidência parcial quando existia contrato público/dinâmico plausível.

### Mapa operacional e indireto

| Origem | Destino/contrato | Consequência para a limpeza |
|---|---|---|
| `index.html` | `src/main.js`, `settings-integration.js`, `sound-settings.js`, quatro scripts clássicos comerciais/toggle, seis CSS locais | Preservados; links com query string também foram normalizados |
| `src/main.js` | Inicialização, estado, serviços, PCR, UI, protocolos, i18n, analytics, acessibilidade | Composição ativa preservada integralmente |
| `window.SIAV` | Estado, sessão, serviços de dados, storage, formatação, protocolos, analytics e cliente | Exports sem import convencional podem ter consumidores indiretos |
| `Object.assign(window, ...)` em `src/main.js` | PCR, ritmo, medicamentos, sinais, notas, relatórios, perfil, planos e modais | Não eliminar funções por análise de imports apenas |
| `src/main.js:getQuizEngine()` | `import('../engine.js')`; globals `startQuiz`, `nextQuizQuestion` | Quiz ativo; novo teste usa JSON offline e respostas reais do engine |
| `src/ui/events.js` | `import('../../simulator.js')`; `window.simulatorInstance` e handlers HTML gerados | Simulação ativa; novo teste percorre dois passos sintéticos |
| `settings-integration.js` | `openModal`/`closeModal` reais de `src/ui/dom.js`; globals de configurações | Engrenagens, temas e perfil preservados |
| `sound-settings.js`, HTML e storage | 15 caminhos de biblioteca, preferências persistidas e blobs IndexedDB | Conteúdo idêntico não torna nomes de áudio intercambiáveis |
| `src/pcr/timer.js` | `new Worker(new URL('../workers/pcr-worker.js', import.meta.url))` | Timer fora da composição atual, mas Worker tem consumidor; ambos B |
| `src/main.js` | `navigator.serviceWorker.register('/service-worker.js')` | SW necessário à intenção PWA, mesmo fora do grafo ES |
| `service-worker.js` | precache, fetch/cache, quiz JSON e sons; ícone de push | Preservado; lacunas offline existentes registradas, sem mexer em caches reais |
| `test-plans-modal.html` | `plans-modal-optimized.js` | Script idêntico ao v5 continua ativo nesta página |
| `index.html` | `plans-modal-optimized-v5.js`, `toggle-fix.js`, Mercado Pago | Não deduplicar sem resolver ordem de carga, preços e globals em entrega comercial própria |
| `purgecss.config.cjs` | globs HTML/JS/CSS e safelist para classes dinâmicas | Configuração mantida; não aplicada à UI nesta auditoria |
| `.github/workflows/ci.yml` | lockfile, testes/cobertura, `dist/`, `script.js` na inspeção de tamanho | `script.js` é placeholder mas tem consumidor de CI; permanece C |
| `.github/workflows/deploy.yml` | empacotamento da raiz `--dir=.` | Workflow preservado e não executado; defeito de destino deve ter entrega própria |
| `pages/pagamento-*.html`, Edge Function | URLs de retorno, SDK e checkout | Preservados; integração validada apenas com mocks/cancelamento |

## 3. Classificação dos candidatos

**A**: removível comprovado na árvore e entradas auditadas. **B**: suspeito, investigação adicional necessária. **C**: ativo ou necessário (inclui ferramentas e documentação). **D**: reservado conservadoramente para função futura; não significa implementação em uso.

| Candidato | Classe / decisão | Evidência e risco |
|---|---|---|
| `Microsoft.VisualStudio.Services (1).VSIXPackage` | **A — removido** | ZIP com 90 entradas, manifesto `GitHub / copilot-chat / 0.36.2`, DisplayName `GitHub Copilot Chat`; 15.123.556 bytes. Só citado em documentação histórica; não é app, dependency, asset, template, entrada ou executável do SIAV. Risco funcional baixo; recuperação integral pelo Git |
| `.github/workflows/index.ts` | **A — removido** | Zero bytes; GitHub Actions lê workflows `.yml`/`.yaml`, não este `.ts`; sem import, chamada de shell, glob consumidor ou configuração que o exija. Não confundir com o `index.ts` funcional de checkout. Risco baixo |
| `plans-modal.css.backup` | **A — removido** | 20.962 bytes de backup antigo; nenhuma referência executável em HTML, imports, CSS URL, JS, testes, SW, manifest ou globs de CSS. Os globs/links de estilos apontam para `*.css` e `plans-modal.css`, não para `.css.backup`. Só citado em inventários históricos. CSS ativo inalterado; risco baixo |
| `purgecss.config.js` | **B — mantido** | Vazio e fora dos scripts atuais, mas a implementação instalada de PurgeCSS tem esse nome como configuração implícita. Remover mudaria uma execução manual sem `--config`; preservar até definir tooling |
| `plans-modal-optimized.js` / `plans-modal-optimized-v5.js` | **C — ambos mantidos** | Mesmo blob, mas páginas distintas os carregam explicitamente; novo teste de cada entrada verifica modal e cancelamento, sem checkout |
| `sounds/library/metronome/metronome-4.mp3` / `sounds/library/shocks/shock-3.mp3` | **C — ambos mantidos** | Mesmo blob, papéis e valores de `<option>` distintos; caminhos podem estar salvos nas preferências; regressão protege todos os 15 caminhos |
| `src/pcr/start.js` | **B — mantido** | Sem consumidor no grafo operacional; exporta início/finalização e simulação alternativos, compartilha singleton/eventos/limites. TODO e chamada de limite sem `await` exigem revisão específica; restrição de preservar PCR e simulação prevalece |
| `src/pcr/timer.js`, `src/workers/pcr-worker.js` | **B — mantidos** | Timer não conectado ao core atual, mas cria Worker por URL; temporização diferente, Wake Lock e contagem incremental. Não substituir nem remover nesta limpeza |
| `src/pcr/cycle.js` | **B — mantido** | Outro `compressionCycle`; API e semântica temporal divergem do estado/core ativos. Não deduplicar por nome |
| `src/ui/navigation.js` | **B — mantido** | Navegação/modal alternativos; contratos de classe diferentes da implementação ativa. Não há consumidor atual provado, nem confirmação de retirada de todos os usos externos |
| `src/index.js` | **B — mantido** | Barrel fora da entrada; reexporta `config` inexistente em `src/config/supabase.js`. Contrato de import documentado; corrigir ou retirar deliberadamente em tarefa própria |
| `src/utils/logger.js` | **B — mantido** | Não importado na entrada; atribui `window.logger`. Remover requer decisão sobre logging/compatibilidade e privacidade, não apenas tree shaking |
| `tests/setup.js` | **B — mantido** | Sem `setupFiles` e sem import nos testes; não é setup efetivamente ativo. Contém mocks e é material de apoio, preservado conforme regra de não apagar testes |
| `accessibility.css` | **D — mantido** | Sem link atual; módulo ativo injeta seus próprios estilos. Reserva conservadora para revisão de acessibilidade, sem afirmar uso atual ou plano aprovado; não aplicar automaticamente |
| `script.js` | **C — mantido** | Comentário de migração de 167 bytes, mas CI executa `ls -lh script.js` e PurgeCSS o lista; apagar quebraria um contrato existente de tooling |
| `force-reload.js`, `limpar-cache.html` | **B / C — mantidos** | Ferramentas manuais de manutenção, sem ligação automática na entrada. O primeiro limpa cache/SW e recarrega; não foi executado. Página acessível diretamente tem função própria. Exigir avaliação de operação offline antes de retirar |
| `test-plans-modal.html`, `test-usage-limit.html` | **C — mantidos** | Ferramentas manuais; planos carrega script legado real. Página de limite tem comportamento de apoio independente e não comprova o limite remoto |
| `README.md`, `TESTE_V4.1_CHECKLIST.md`, `_backup_excluidos_2026-04-05.txt`, `docs/` | **C — mantidos** | Histórico/decisões; várias descrições estão antigas ou não demonstradas no código. Registrar divergências sem apagar evidência |
| SQL, backend checkout, manifest, SW, quiz JSON e lockfile | **C — mantidos** | Infraestrutura, dados educacionais, persistência e distribuição; não são descartáveis porque não entram no bundle ES |
| `.claude/settings.local.json`, `.env.example` | **C — mantidos** | Tooling e instruções de configuração. Nenhum valor de ambiente ou permissão foi modificado |
| `index.html`, `style.css`, CSS de telas, protocolos e utilitários de dose | **C — mantidos** | Código funcional com estados/globais; tamanho e repetição não provam que regras são desnecessárias |

A listagem completa de todos os arquivos, classe e hash está no apêndice A. A classe C nesse inventário também cobre artefatos de documentação e ferramentas necessárias, não apenas código executado no navegador.

## 4. Duplicação preservada e dependências

### Duplicação exata

- Dois scripts de planos: **15.611 bytes cada**, um par idêntico; possível redundância de armazenamento **15.611 bytes**, deliberadamente preservada pelos dois consumidores HTML. Comparação AST dos corpos com pelo menos 180 caracteres encontrou **14 grupos de funções/callbacks idênticos entre esses arquivos**; callbacks aninhados se sobrepõem, portanto seus tamanhos não foram somados.
- Dois sons: **46.811 bytes cada**, um par idêntico; redundância física **46.811 bytes**, preservada pelos caminhos e preferências. Esses são os únicos dois pares não vazios com SHA-256 idêntico na entrada, somando **62.422 bytes de redundância mantida**. Os dois arquivos vazios também tinham o mesmo hash, mas não economizam bytes.
- `getIconForEvent` em `src/ui/dom.js` devolve HTML; em `src/ui/timeline.js` devolve classes. São implementações semelhantes com contratos diferentes, não clones substituíveis.
- `calculatePediatricDose` em `formatters.js` recebe peso/dose e retorna número; em `medications.js` recebe medicamento/peso e retorna objeto com unidade. Ambas têm testes; não unificadas e nenhuma regra clínica foi alterada.
- `tests/formatters.test.js` e `src/utils/formatters.test.js` se sobrepõem em tema, mas exercitam contratos diferentes, inclusive cálculos pediátricos; ambos preservados.
- Estado/ciclo/timers, serviços de dados e UI de autenticação possuem responsabilidades paralelas. Nomes coincidentes não demonstram equivalência; a migração deve ser evolutiva e testada.

### CSS

PostCSS analisou seis folhas auxiliares: **526 regras** e **50 identidades de seletores repetidas dentro da respectiva folha** (inclui media queries/temas; não é contagem de código morto). Não encontrou grupos de regras entre essas folhas com seletor e declarações integralmente iguais no recorte de serialização de pelo menos 90 caracteres. A análise estrita de `style.css` parou na chave inesperada da linha 1282, também avisada pelo build; não se declara ausência de duplicação no arquivo principal. Cascata, especificidade, dark mode e estados clínicos impedem uma remoção automática segura. Nenhuma regra CSS ativa foi removida.

### Dependências declaradas: todas preservadas

| Pacote(s) | Classificação | Uso/evidência |
|---|---|---|
| `vite`, `terser` | C | `dev/build/preview` e `build.minify: 'terser'` |
| `vitest`, `jsdom` | C | Scripts de teste, imports da suíte e `test.environment` |
| `@vitest/coverage-v8`, `@vitest/ui` | C | Carregamento implícito pelos comandos de cobertura e UI, mesmo sem import no app |
| `postcss` | C | Pipeline CSS do Vite/dependências; sua declaração direta não deve ser retirada só por ausência de import do app |
| `purgecss`, `@fullhuman/postcss-purgecss` | B | Tooling/config presente, sem chamada nos scripts CI/build atuais; não provado dispensável em todos os fluxos manuais |
| `cssnano`, `cssnano-cli`, `postcss-cli` | B | Comandos de otimização descritos no README e ferramentas históricas; não executados pelo Vite atual. Avaliar retirada conjunta e impacto do lock em entrega de tooling |

A busca literal isolada teria classificado incorretamente plugins Vitest e pacotes de CLI como sem uso. Nenhuma dependência foi adicionada, atualizada ou retirada; `package.json` e `package-lock.json` são idênticos à base. SDKs externos Supabase/Font Awesome/Mercado Pago/Plausible e o import Deno do backend são dependências fora do lock, preservadas e reportadas como limitação de reprodutibilidade/controle de terceiros.

## 5. Inventário antes/depois e armazenamento

| Medida | Antes (`fde38d1`) | Depois |
|---|---:|---:|
| Arquivos versionados | 123 | 122 |
| Arquivos removidos | — | 3 |
| Arquivos adicionados | — | 2 (teste e relatório) |
| Bytes brutos da árvore | 17.017.550 | 1.935.149 |
| Bytes removidos, sem compensar documentação/testes | — | 15.144.518 |
| Bytes adicionados de testes/documentação | — | 62.117 |
| Economia líquida da árvore | — | 15.082.401 |
| Arquivos de build | 13 | 13 |
| Soma dos arquivos de `dist/` | 486.957 | 486.957 |
| Soma gzip determinística dos 13 arquivos | 113.900 | 113.900 |
| Economia no bundle | — | **0 bytes** |

Os 13 arquivos de saída têm os mesmos caminhos, tamanhos e SHA-256 antes/depois. A soma gzip foi calculada com `gzip.compress(..., mtime=0)` por arquivo; não equivale a um HAR nem garante a política de compressão do servidor. Os três itens removidos não apareciam nos recursos funcionais declarados/carregados pelo app; **não foi observada redução de payload do aplicativo**. O ZIP VSIX pode ter sido exposto por um deploy antigo da raiz, mas não era requisitado pela aplicação auditada.

Na entrada, `.git` ocupava aproximadamente **17 MiB** (`git count-objects -v`: 117 loose objects, 442 objetos empacotados, pacote de 15.562 KiB). Novos commits mantêm o VSIX recuperável: o tamanho do histórico não foi reduzido e pode crescer com a documentação. Não houve `filter-repo`, rebase, force push, prune ou coleta destrutiva de objetos. Nenhuma promessa de economia no clone é feita.

Distribuição inicial: raiz 37; `.claude` 1; `.github` 3; `data` 1; `docs` 5; `pages` 3; `sounds` 15; `src` 42; `supabase` 1; `tests` 15. Depois: raiz 35; `.github` 2; `docs` 6; `tests` 16; demais grupos iguais. As pastas `src` e `sounds` foram integralmente preservadas.

## 6. Validação reproduzível

Ambiente: Linux, Node **22.23.4**, npm **10.9.9**, lockfile v3. Primeiro `npm ci` com cache padrão falhou por `ENOENT ... /home/agent/.npm/_cacache` (diretório fora da área gravável); a execução válida usou `npm_config_cache` em `/workspace`, sem editar dependências ou lockfile. Avisos de dependências antigas foram preservados, sem upgrade fora de escopo.

Comandos, antes e depois:

```sh
npm ci
CI=1 npm run test
CI=1 npm run test
npm run build
git diff --check
```

`CI=1` faz o `vitest` de `npm run test` executar uma vez e sair, sem mudar o script do projeto. Adicionalmente, após a limpeza: `npm run test:coverage`, verificação de `coverage/coverage-final.json`, sintaxe de todo JS em `src` via `node --check`, e comparação SHA-256 do build.

| Verificação | Antes | Depois |
|---|---|---|
| Instalação limpa | 420 pacotes; sucesso após ajustar cache local | 420 pacotes; sucesso; lockfile inalterado |
| `npm run test`, execução 1 | 168/168, 13 arquivos | **174/174**, 14 arquivos, 97,91 s |
| `npm run test`, execução 2 | 168/168, 13 arquivos | **174/174**, 14 arquivos, 32,77 s |
| Regressões novas antes das exclusões | 6/6 | incluídas na suíte completa |
| Cobertura | não refeita no baseline desta entrega | 174/174; JSON válido; 38,61% linhas/statements, 73,24% branches, 54,23% funções (39,11 s) |
| Build | sucesso; 13 arquivos | sucesso (2,04 s); mesmos 13 arquivos, todos idênticos por SHA-256 |
| Sintaxe JS / whitespace | baseline limpo | `node --check` em todo `src` e `git diff --check`: aprovados |
| Hash dos arquivos funcionais preservados | inventariado | 120/120 arquivos preexistentes mantidos com SHA-256 idêntico |

Os seis novos casos em `tests/repository-cleanup.test.js` verificam: scripts/CSS locais da entrada; os 15 sons de seleção; carregamento, resposta e finalização de quiz via JSON offline sem chamar backend; ramo de simulação em dois passos e gravação pelo mock exclusivo de simulação; entrada de planos do index; entrada da página manual de planos. Nos casos educacionais, registros assistenciais sintéticos são comparados antes/depois. Nos casos comerciais, confirmação é cancelada, rede bloqueada por stub e o mock de checkout não recebe chamada. Não se valida conclusão de compra.

A suíte existente continua protegendo PCR/ROSC/recorrência, isolamento de notas, registros e edição de doses, operações repetidas, pausas/retomada/ciclos, FCT inválida em suspensão, encerramento, relatórios, navegação, modais, i18n e storage. Regressões são evidência dos casos exercitados, não prova de correção clínica de todo o produto.

### Interação mobile e offline

| Cenário em Chromium mobile | Baseline | Após exclusões |
|---|---|---|
| iPhone 13: cadastro, algoritmo explícito, pausa/retomada, medicamento devido e edição, novo atendimento | 19 verificações aprovadas | 19 aprovadas |
| iPhone SE: mesmo roteiro, ação principal visível e sem corte horizontal | não executado no baseline desta auditoria | 19 aprovadas |
| iPhone 13: navegação, engrenagens em seis contextos, perfil/login, som, temas, planos, confirmação de ritmo | não executado no baseline desta auditoria | 31 aprovadas |
| iPhone SE: mesmo roteiro de navegação/temas | não executado no baseline desta auditoria | 31 aprovadas |

Nos quatro roteiros finais não houve erro JavaScript não tratado; usuário permaneceu visitante e não houve overflow horizontal nas verificações realizadas. Não se extrapola isso para todos os componentes ou posições de rolagem.

**Probe negativo de distribuição/PWA, antes e depois:** `dist/` foi servido em dois servidores HTTP estáticos locais estritos (sem fallback SPA), em contextos descartáveis, com rede externa bloqueada. O navegador recebeu 404 para os quatro scripts clássicos comerciais/toggle em ambas as versões. Requisições locais verificaram os mesmos 404 para `/service-worker.js`, `/data/quiz-fallback.json`, os três sons de precache e os dois ícones; a tentativa explícita de registrar SW falhou nas duas versões com `A bad HTTP response code (404) was received when fetching the script.` Isso demonstra defeito preexistente do artefato, não uma regressão das exclusões. Este probe não é teste funcional de sessão autenticada, não permite declarar offline funcional e não foi feito contra produção.

O navegador usado foi **Chromium com viewport e toque emulados de iPhone**, não WebKit/Safari nem iPhone físico. SDK público foi obtido pelo CDN com verificação TLS preservada; chamadas de auth, banco, analytics e pagamento foram bloqueadas. Não foram fornecidas credenciais nem simulada autenticação bem-sucedida. Login/dashboard: abertura de formulários e barreira de visitante, não sessão autenticada ou indicadores remotos.

Quiz/simulação foram também exercitados por mocks nos testes novos. Isso não homologa persistência remota nem modo PWA instalado. Os testes interativos bloquearam service workers para não mascarar carregamento por cache; inspeção dos arquivos e comparação de assets detectaram as lacunas descritas na seção 9. Não houve limpeza de armazenamento de usuários, migração ou chamada a produção.

A configuração CI atual não inclui push de `audit/repository-cleanup-2026-11` nem foi alterada; esta entrega registra validação local. A execução verde anterior de CI em `581dd7f` não é apresentada como CI da limpeza. Não foi aberto/alterado PR #2 ou disparado deploy.

## 7. Commits e registro de remoções

| Commit | Categoria | Conteúdo |
|---|---|---|
| `fde38d1` (preexistente) | documentação | relatório inicial, preservado |
| `7257008d7aed69c7a77d3736e70d78443065f3c5` | regressões | seis casos para entradas indiretas e recursos educacionais/comerciais isolados |
| `9e1f08fc74fa7ee6d46697dff06d1d350d0938b1` | artefato IDE | exclui somente o VSIX |
| `1d3ed926ac625bcc8b96722f255cdf113c19c37c` | resíduos de apoio | exclui somente o `.ts` vazio e backup CSS |
| commit que contém este relatório | documentação | inventário, evidências, resultados, limitações e reversão; SHA informado na entrega |

Não houve regressão detectada que exigisse reverter remoções. Uma asserção nova foi ajustada para a API do Vitest 2.1.9 instalado (método de asserção indisponível), antes do commit do teste; nenhuma funcionalidade foi modificada para fazer testes passarem.

## 8. Reversão sem reescrever histórico

Na branch de auditoria e com árvore limpa, reverter as duas remoções em ordem inversa:

```sh
git switch audit/repository-cleanup-2026-11
git revert 1d3ed926ac625bcc8b96722f255cdf113c19c37c
git revert 9e1f08fc74fa7ee6d46697dff06d1d350d0938b1
npm ci
CI=1 npm run test
CI=1 npm run test
npm run build
git diff --check
```

Isso restaura exatamente os três blobs e preserva testes/documentação. Para inspecionar um arquivo sem alterar a árvore: `git show fde38d1:caminho`. O relatório do apêndice mantém o SHA-256 original de cada item. Se só uma categoria apresentar regressão, reverter somente seu commit. Não usar reset destrutivo ou force push. Nenhuma reversão foi executada nesta entrega.

## 9. Problemas importantes fora do escopo, sem correção funcional

| Prioridade | Evidência verificada no repositório | Impacto / encaminhamento |
|---|---|---|
| P0 — distribuição/offline | O build avisa que quatro scripts clássicos não podem ser empacotados; `dist/` não contém `mercadopago-config.js`, `mercadopago-integration.js`, `plans-modal-optimized-v5.js` e `toggle-fix.js`. Também faltam SW, `data/quiz-fallback.json` e a biblioteca de sons | O build concluir não garante aplicativo completo servido só de `dist/`. Definir estratégia `public/`/cópia ou entradas e adicionar teste de produção/offline em tarefa própria, antes de deploy |
| P0 — PWA | Precache aponta três sons ausentes (`/sounds/shock.mp3`, `/sounds/alert-sound.mp3`, `/sounds/drug-sound.mp3`); manifest e push apontam `icon-192.png`/`icon-512.png` ausentes; precache depende de CSS remoto | Instalação/fallback offline podem falhar. Necessária validação real de SW e recuperação; não apagar SW para ocultar problema |
| P0 — deploy | Workflow gera `dist/`, mas publica raiz com `netlify-cli deploy --prod --dir=.` | Conteúdo diferente do artefato testado, possível exposição de fontes/apoio; workflow não executado nem editado |
| P0 — integridade por usuário | Fila IndexedDB usa chave única `offline_logs`, com fallback localStorage; sincronização usa usuário corrente; `savePCRLog` monta `user_id` antes de espalhar `pcrData` | Exigir dono imutável, revisão de troca de sessão e idempotência sem apagar filas; o código por si só não comprova isolamento real das políticas de produção |
| P0 — persistência de históricos | Caminhos em `pcr/log.js` e `services/database.js` usam modelos e estados de usuário diferentes. SQL versionado tem `duration`, enquanto log envia `duration_seconds` e vários campos adicionais; `attempts` de simulação é array no cliente e integer no SQL | Não presumir SQL como schema implantado; reconciliar contratos em tarefa própria, sem executar migração nesta entrega |
| P1 — fallback/sync | `markLogSynced` usa ID em IndexedDB e índice numérico para fallback; timestamps são usados como IDs locais | Avaliar duplicidade, confirmação de transação e retries. Nenhum registro foi sincronizado ou apagado nesta tarefa |
| P1 — relatório/DOM | Relatório, feedback de questões e simulador interpolam dados em `innerHTML`; há caminhos de sanitização distintos | Revisão de XSS/renderização segura com testes e dados sintéticos; não alterar conteúdo ou validade jurídica afirmada pelo relatório nesta limpeza |
| P1 — CSS | `style.css:1282` possui `}` inesperado, confirmado por PostCSS e aviso Vite | Renderização pode depender da tolerância do parser; corrigir em tarefa com testes visuais, sem deduplicar CSS às cegas |
| P1 — pagamentos | Seis referências HTML locais já quebradas: quatro `pages/index.html`, mais `pages/mercadopago-config.js` e `pages/mercadopago-integration.js`; preços/configuração do modal, toggle e backend divergem; função de checkout do modal exibe mensagem simulada | Auditoria comercial separada com mocks e contrato único de preços/rotas; sem transações ou alteração de preço nesta entrega |
| P1 — backend versionado | Edge Function aceita dados de `user`/plano no body; o arquivo não verifica identidade por si só e permite CORS amplo | A configuração do gateway não foi consultada. Revisar autenticação/autorização e validação de entrada em etapa própria, sem presumir vulnerabilidade implantada ou mudar RLS |
| P1 — temporização/legado | Caminhos alternativos start/timer/cycle não equivalem ao ledger ativo. `startSimulation` alternativo consulta verificação async sem `await`; barrel reexporta `config` inexistente | Não restaurar módulos antigos nem remover por nome. Definir API e cobertura de migração com revisão clínica |
| P1 — privacidade/terceiros | SDKs Supabase via CDN sem versão exata; analytics habilitado por padrão; logging disperso; filas e estado compartilhados | Revisar consentimento, minimização e supply chain separadamente. Nenhum segredo ou valor de usuário é copiado neste relatório |
| P2 — documentação/tooling | README referencia vários documentos/pastas ausentes, `build-optimized/` e afirma isolamento/segurança não demonstrados; lista histórica de exclusões inclui arquivos que ainda existem | Atualizar guias sem apagar histórico, distinguir comprovado/proposto e produzir política de retenção para ferramentas manuais |

Prioridades são encaminhamentos de engenharia baseados na revisão local, sem laudo clínico ou validação de políticas remotas. O módulo `timing.js` ativo, correções de notas e regras adultas foram preservados byte a byte; qualquer auditoria de doses/regras exige escopo e revisão clínica próprios.

## 10. Recomendações de arquitetura e próximos passos

1. Corrigir a distribuição de recursos e criar teste de smoke de `dist/` com login visitante, quiz JSON, áudio e SW em servidor estático real; só depois considerar publicação em entrega autorizada.
2. Tratar integridade de logs/filas por usuário e atendimento, com identificador de operação e confirmação de persistência, sem descartar dados antigos. Separar armazenamento assistencial, simulação e Academy conforme [Arquitetura 1.0](SIAV_ARCHITECTURE_V1.md).
3. Inventariar e definir explicitamente a API global/legada antes de retirar barrel, timer, ciclo e navegação alternativos. Migrar consumidores por categoria, preservando contratos com testes de regressão; não reescrever o app.
4. Planejar revisão de preços, SDKs e retornos com mocks; consolidar os dois scripts de planos apenas depois de migrar/testar as duas páginas e controlar ordem de carga do toggle.
5. Estabelecer contrato CSS de temas/estados e corrigir o erro sintático antes de qualquer PurgeCSS; conservar seletores clínicos, acessibilidade e variantes de toque.
6. Consolidar scripts de tooling documentados, decidir sobre CLIs de otimização não usados no CI e só então reduzir dependências com instalação limpa e lockfile revisado.
7. Validar Safari no iPhone físico, retorno da suspensão, áudio, armazenamento persistente e PWA instalado em etapa própria. Esta entrega não os declara homologados.

## Apêndice A — Inventário completo da entrada

Tamanhos em bytes e SHA-256 abreviado a 12 caracteres; recuperação pelo commit `fde38d1`. A lista abrange **cada um dos 123 arquivos** iniciais. A = removido; B/D = preservado pelos motivos da seção 3; C = preservado como recurso ativo, ferramenta, teste ou documentação.

| Arquivo | Bytes | SHA-256 (12) | Classe / resultado |
|---|---:|---|---|
| `.claude/settings.local.json` | 586 | `2820e8c805d4` | C — mantido |
| `.env.example` | 979 | `dbdb700435d6` | C — mantido |
| `.github/workflows/ci.yml` | 2579 | `8c21a946bf4f` | C — mantido |
| `.github/workflows/deploy.yml` | 1281 | `516e5c93332d` | C — mantido |
| `.github/workflows/index.ts` | 0 | `e3b0c44298fc` | A — removido |
| `.gitignore` | 504 | `34d7db9235c9` | C — mantido |
| `Microsoft.VisualStudio.Services (1).VSIXPackage` | 15123556 | `3b899b71ea2b` | A — removido |
| `README.md` | 6791 | `ff8a976fd52f` | C — mantido |
| `TESTE_V4.1_CHECKLIST.md` | 6730 | `77e430ac4fa0` | C — mantido |
| `_backup_excluidos_2026-04-05.txt` | 763 | `e6ba65e37fb9` | C — mantido |
| `accessibility.css` | 7902 | `71f453603407` | D — mantido |
| `data/quiz-fallback.json` | 9747 | `73e6e62f331e` | C — mantido |
| `docs/CODEBASE_CLEANUP_AUDIT_2026-11.md` | 9820 | `1a5f46f5b724` | C — mantido |
| `docs/DELIVERY_2A_NOTES_ISOLATION.md` | 6289 | `d18c42dbb69b` | C — mantido |
| `docs/DELIVERY_3A_TECHNICAL_PLAN.md` | 13772 | `7f58baa03d9c` | C — mantido |
| `docs/REVIEW_ADULT_PCR_STAGE2.md` | 7601 | `f9f7a16a3eb6` | C — mantido |
| `docs/SIAV_ARCHITECTURE_V1.md` | 74328 | `449746e59f9a` | C — mantido |
| `engine.js` | 10885 | `23615fc521e9` | C — mantido |
| `force-reload.js` | 701 | `2ee96545af2b` | B — mantido |
| `index.html` | 110557 | `8c34aeecafe5` | C — mantido |
| `limpar-cache.html` | 3861 | `0331ac583c48` | C — mantido |
| `manifest.json` | 771 | `df67a0eb6c1e` | C — mantido |
| `mercadopago-config.js` | 7795 | `072ace291c88` | C — mantido |
| `mercadopago-integration.js` | 12437 | `bf3e2a80a42b` | C — mantido |
| `package-lock.json` | 222244 | `f23bb03b410e` | C — mantido |
| `package.json` | 1101 | `0afbf9d2beb2` | C — mantido |
| `pages/pagamento-falha.html` | 4078 | `7658498e728b` | C — mantido |
| `pages/pagamento-pendente.html` | 3747 | `106662816e67` | C — mantido |
| `pages/pagamento-sucesso.html` | 8754 | `f32115a655b5` | C — mantido |
| `plans-modal-optimized-v5.js` | 15611 | `72abfaabbe5e` | C — mantido |
| `plans-modal-optimized.js` | 15611 | `72abfaabbe5e` | C — mantido |
| `plans-modal.css` | 19604 | `be89e97601fb` | C — mantido |
| `plans-modal.css.backup` | 20962 | `2dc4dc38ccb6` | A — removido |
| `profile-plan-styles.css` | 5160 | `b6dfec25ab3b` | C — mantido |
| `purgecss.config.cjs` | 2515 | `bc3908213aab` | C — mantido |
| `purgecss.config.js` | 0 | `e3b0c44298fc` | B — mantido |
| `script.js` | 167 | `55b449bb6899` | C — mantido |
| `service-worker.js` | 2759 | `a95c5843f1d8` | C — mantido |
| `settings-integration.js` | 8861 | `fac1c485fe42` | C — mantido |
| `settings-menu-styles.css` | 28424 | `948043a15ac5` | C — mantido |
| `shock-styles.css` | 11061 | `c62b13f8a48f` | C — mantido |
| `siav_supabase_schema.sql` | 2677 | `42ec5701ea32` | C — mantido |
| `simulator.js` | 20857 | `db621c15c260` | C — mantido |
| `sound-settings-styles.css` | 10075 | `5347772ac574` | C — mantido |
| `sound-settings.js` | 17604 | `dfb5bae7eb8b` | C — mantido |
| `sounds/library/alerts/alert-1.mp3` | 14210 | `3eb14f60c4d6` | C — mantido |
| `sounds/library/alerts/alert-2.mp3` | 79872 | `550e8594875b` | C — mantido |
| `sounds/library/alerts/alert-3.mp3` | 71424 | `a615e8099518` | C — mantido |
| `sounds/library/alerts/alert-4.mp3` | 40704 | `5be19a030c39` | C — mantido |
| `sounds/library/alerts/alert-5.mp3` | 11376 | `2cf9cb09206f` | C — mantido |
| `sounds/library/drugs/drug-1.mp3` | 55170 | `482b9d90b6f5` | C — mantido |
| `sounds/library/drugs/drug-2.mp3` | 58514 | `6ad2124c91f1` | C — mantido |
| `sounds/library/drugs/drug-3.mp3` | 36864 | `d6a99e9d0721` | C — mantido |
| `sounds/library/metronome/metronome-1.mp3` | 16320 | `6b186e46aee2` | C — mantido |
| `sounds/library/metronome/metronome-2.wav` | 42336 | `94c0683a5633` | C — mantido |
| `sounds/library/metronome/metronome-3.wav` | 32092 | `41948f2abeb0` | C — mantido |
| `sounds/library/metronome/metronome-4.mp3` | 46811 | `f0f633a5cbb8` | C — mantido |
| `sounds/library/shocks/shock-1.mp3` | 20448 | `2a869bd8228d` | C — mantido |
| `sounds/library/shocks/shock-2.mp3` | 50155 | `dfc6f4e8f204` | C — mantido |
| `sounds/library/shocks/shock-3.mp3` | 46811 | `f0f633a5cbb8` | C — mantido |
| `src/accessibility/index.js` | 9234 | `99eac1832051` | C — mantido |
| `src/analytics/index.js` | 5684 | `222f107209ad` | C — mantido |
| `src/config/constants.js` | 3656 | `70c05838632e` | C — mantido |
| `src/config/state.js` | 4846 | `63df4b33c58a` | C — mantido |
| `src/config/supabase.js` | 511 | `efb226143645` | C — mantido |
| `src/i18n/index.js` | 3590 | `4ca78f1417b8` | C — mantido |
| `src/i18n/translations.js` | 11128 | `56f110e27249` | C — mantido |
| `src/index.js` | 1664 | `fcab0f73832c` | B — mantido |
| `src/main.js` | 11437 | `53ab1aa6f2d3` | C — mantido |
| `src/pcr/clinical.js` | 2621 | `108a2cbbd3be` | C — mantido |
| `src/pcr/core.js` | 12489 | `acdc6c792e82` | C — mantido |
| `src/pcr/cycle.js` | 1596 | `00ffaec5f0a6` | B — mantido |
| `src/pcr/events.js` | 1669 | `55ebdba3cc85` | C — mantido |
| `src/pcr/log.js` | 18808 | `51c9cb518061` | C — mantido |
| `src/pcr/medications.js` | 13619 | `8375297474df` | C — mantido |
| `src/pcr/rhythm.js` | 10839 | `11e7110f004a` | C — mantido |
| `src/pcr/start.js` | 4955 | `b30cf8889754` | B — mantido |
| `src/pcr/timer.js` | 3978 | `05edf5ab99f4` | B — mantido |
| `src/pcr/timing.js` | 4833 | `b3f8289fdbb5` | C — mantido |
| `src/pcr/vitals.js` | 4934 | `e81340f35e05` | C — mantido |
| `src/protocols/guidelines.js` | 23872 | `2be1b84008ca` | C — mantido |
| `src/protocols/medical.js` | 12113 | `08bd32b92f0e` | C — mantido |
| `src/services/auth.js` | 5357 | `7ad63ee4eac9` | C — mantido |
| `src/services/database.js` | 16362 | `21652a4690da` | C — mantido |
| `src/services/permissions.js` | 2719 | `3f4e098ae9b2` | C — mantido |
| `src/services/storage.js` | 13152 | `b4f09d2b93bd` | C — mantido |
| `src/ui/audio.js` | 5231 | `eb7dd105e370` | C — mantido |
| `src/ui/auth-profile.js` | 21348 | `16987f05045e` | C — mantido |
| `src/ui/dom.js` | 7382 | `4d797f2151e5` | C — mantido |
| `src/ui/events.js` | 15521 | `3919a1cccc7b` | C — mantido |
| `src/ui/glasgow.js` | 2045 | `ac3e4c962e9f` | C — mantido |
| `src/ui/navigation.js` | 1142 | `32fa15780cad` | B — mantido |
| `src/ui/patient.js` | 5077 | `1ecde7f11aee` | C — mantido |
| `src/ui/pcr-guidance.js` | 5461 | `3d4f72737cd1` | C — mantido |
| `src/ui/timeline.js` | 2243 | `e409c7062e68` | C — mantido |
| `src/ui/toast.js` | 5610 | `be4ce2e7160e` | C — mantido |
| `src/utils/events.js` | 583 | `bdf714e7abfe` | C — mantido |
| `src/utils/formatters.js` | 4034 | `5802279776cc` | C — mantido |
| `src/utils/formatters.test.js` | 1961 | `145416f66baf` | C — mantido |
| `src/utils/logger.js` | 1028 | `2b92acf19f8d` | B — mantido |
| `src/utils/medications.js` | 4783 | `932283562a35` | C — mantido |
| `src/workers/pcr-worker.js` | 1037 | `8dd10b70219c` | B — mantido |
| `style.css` | 140836 | `71529e81ba13` | C — mantido |
| `supabase/functions/mercadopago-checkout/index.ts` | 2300 | `08b10e02dfb9` | C — mantido |
| `test-plans-modal.html` | 21700 | `353787efab7b` | C — mantido |
| `test-usage-limit.html` | 12657 | `ccfb109d002a` | C — mantido |
| `tests/adult-guidelines.test.js` | 1129 | `ed51dc081693` | C — mantido |
| `tests/antiarrhythmics.test.js` | 5764 | `45ca86d7d67b` | C — mantido |
| `tests/formatters.test.js` | 2799 | `0f2dac9600ef` | C — mantido |
| `tests/helpers/clinical.js` | 1133 | `c08541d855cb` | C — mantido |
| `tests/i18n.test.js` | 4790 | `2c0e1622262e` | C — mantido |
| `tests/medical.test.js` | 3865 | `eb7314097e50` | C — mantido |
| `tests/mobile-care-interactions.mjs` | 5479 | `b21b2e54b756` | C — mantido |
| `tests/mobile-navigation.test.js` | 7059 | `31211f20fd80` | C — mantido |
| `tests/pcr-efficiency.test.js` | 17024 | `ba45c72bdde9` | C — mantido |
| `tests/pcr-medications.test.js` | 14494 | `75acaeaec9b9` | C — mantido |
| `tests/pcr-notes-isolation.test.js` | 9728 | `5a6976e56edb` | C — mantido |
| `tests/pcr-report.test.js` | 2072 | `fd21f515d409` | C — mantido |
| `tests/setup.js` | 1116 | `19e3d82c2b07` | B — mantido |
| `tests/storage.test.js` | 4427 | `1c2abd978955` | C — mantido |
| `tests/toast.test.js` | 746 | `3f18837af9b0` | C — mantido |
| `toggle-fix.js` | 2772 | `7c46a736e2b4` | C — mantido |
| `vite.config.js` | 294 | `281386cd7e7e` | C — mantido |

Adições: `tests/repository-cleanup.test.js` (seis regressões) e `docs/CODEBASE_CLEANUP_RESULT.md` (este documento). Nenhum arquivo preexistente preservado teve seu SHA-256 alterado.

## Apêndice B — Módulos JS: dependências e exports

Este inventário AST documenta imports/reexports, lazy imports e Worker. `—` indica ausência de dependência ES local; globals, entradas HTML, scripts clássicos, SW e ferramentas são explicados acima e não são classificados como mortos por essa coluna. URLs externas são identificadas por serviço, sem reproduzir configuração de cliente. Exports são nomes declarados/reexportados, não uma afirmação de uso individual.

| Módulo | Dependências / entradas AST | Exports nomeados |
|---|---|---|
| `engine.js` | — | `shuffleArray`, `QuizEngine` |
| `force-reload.js` | — | — (pode ter export default/global) |
| `mercadopago-config.js` | — | — (pode ter export default/global) |
| `mercadopago-integration.js` | — | — (pode ter export default/global) |
| `plans-modal-optimized-v5.js` | — | — (pode ter export default/global) |
| `plans-modal-optimized.js` | — | — (pode ter export default/global) |
| `purgecss.config.js` | — | — (pode ter export default/global) |
| `script.js` | — | — (pode ter export default/global) |
| `service-worker.js` | — | — (pode ter export default/global) |
| `settings-integration.js` | `src/ui/dom.js` | — (pode ter export default/global) |
| `simulator.js` | — | `AdvancedSimulator` |
| `sound-settings.js` | — | — (pode ter export default/global) |
| `src/accessibility/index.js` | — | `initAccessibility`, `announce` |
| `src/analytics/index.js` | `src/services/storage.js` | `initAnalytics`, `trackEvent`, `trackPageView`, `SIAVAnalytics`, `setAnalyticsConsent`, `getAnalyticsConsent` |
| `src/config/constants.js` | — | `PLANS`, `TIMINGS`, `BPM`, `SHOCK_ENERGY`, `RHYTHMS`, `APP_VERSION`, `APP_NAME` |
| `src/config/state.js` | `src/config/constants.js` | `state`, `compressionCycle`, `intervals`, `metronomeState`, `resetPCRState`, `resetPatientData`, `addTimelineEvent`, `getStateSnapshot` |
| `src/config/supabase.js` | SDK Supabase CDN | `supabase` |
| `src/i18n/index.js` | `src/i18n/translations.js`, `src/services/storage.js` | `initI18n`, `t`, `setLocale`, `getLocale`, `applyTranslations`, `getAvailableLocales`, `formatNumber`, `formatDate`, `currentLocale` |
| `src/i18n/translations.js` | — | — (pode ter export default/global) |
| `src/index.js` | `src/config/supabase.js`, `src/config/constants.js`, `src/config/state.js`, `src/services/auth.js`, `src/services/database.js`, `src/services/storage.js`, `src/utils/formatters.js`, `src/utils/events.js`, `src/utils/medications.js`, `src/protocols/medical.js` | `supabase`, `config`, `PLANS`, `TIMINGS`, `BPM`, `RHYTHMS`, `SHOCK_ENERGY`, `APP_VERSION`, `APP_NAME`, `state`, `compressionCycle`, `metronomeState`, `resetPCRState`, `resetPatientData`, `addTimelineEvent`, `getStateSnapshot`, `handleLogin`, `logout`, `checkSession`, `updatePassword`, `onAuthStateChange`, `loadUserProfile`, `saveUserProfile`, `savePCRLog`, `loadPCRLogs`, `deletePCRLog`, `loadUserStats`, `setItem`, `getItem`, `removeItem`, `clear`, `saveSettings`, `loadSettings`, `saveOfflineLog`, `getOfflineLogs`, `markLogSynced`, `getStorageSize`, `getStorageSizeFormatted`, `formatTime`, `formatTimestamp`, `formatDate`, `formatDateTime`, `calculatePediatricDose`, `calculatePediatricShock`, `isPediatric`, `calculateAge`, `formatDuration`, `formatPercentage`, `truncate`, `events`, `MEDICATIONS`, `calculateDose`, `getMedicationInterval`, `getMedicationRoutes`, `getMedicationNotes`, `getProtocolNextStep`, `getShockRecommendation`, `calculateGlasgow` |
| `src/main.js` | `src/config/supabase.js`, `src/config/state.js`, `src/config/constants.js`, `src/services/auth.js`, `src/services/database.js`, `src/services/storage.js`, `src/utils/formatters.js`, `src/utils/medications.js`, `src/protocols/medical.js`, `src/pcr/core.js`, `src/pcr/rhythm.js`, `src/pcr/medications.js`, `src/ui/timeline.js`, `src/pcr/vitals.js`, `src/ui/auth-profile.js`, `src/pcr/log.js`, `src/services/permissions.js`, `src/protocols/guidelines.js`, `src/ui/patient.js`, `src/ui/glasgow.js`, `src/ui/pcr-guidance.js`, `src/i18n/index.js`, `src/utils/events.js`, `src/analytics/index.js`, `src/accessibility/index.js`, `src/ui/toast.js`, `src/ui/dom.js`, `src/ui/audio.js`, `src/ui/events.js`, `engine.js` | `initApp` |
| `src/pcr/clinical.js` | `src/config/state.js` | `newOperationId`, `initializeClinicalArrest`, `isClinicalArrestActive`, `assessClinicalRhythm`, `commitClinicalShock`, `getClinicalSnapshot` |
| `src/pcr/core.js` | `src/config/state.js`, `src/config/constants.js`, `src/utils/formatters.js`, `src/utils/events.js`, `src/pcr/clinical.js`, `src/pcr/timing.js` | `clearAllIntervals`, `refreshPCRTime`, `startTimer`, `startCycleProgress`, `pauseCompressions`, `handleTimingVisibility`, `handleTimingPageHide`, `startCompressions`, `promptRhythmCheck`, `startPCR`, `finishPCR`, `executePCRFinish`, `restartPCRAfterROSC` |
| `src/pcr/cycle.js` | — | `compressionCycle`, `startCompressionCycle`, `stopCompressionCycle`, `resetCompressionCycle`, `isCompressionActive` |
| `src/pcr/events.js` | `src/config/state.js` | `addEventToTimeline`, `addNote`, `addMedication`, `getTimeline`, `getNotes`, `getMedications` |
| `src/pcr/log.js` | `src/config/state.js`, `src/config/supabase.js`, `src/utils/formatters.js`, `src/pcr/timing.js`, `src/ui/dom.js` | `showNotesModal`, `saveNotes`, `savePcrLogToSupabase`, `fetchPcrLogs`, `deleteLogEntry`, `generateEvolution`, `renderPatientLog`, `viewLogDetail` |
| `src/pcr/medications.js` | `src/config/state.js`, `src/ui/dom.js`, `src/pcr/events.js`, `src/protocols/medical.js`, `src/pcr/clinical.js` | `cancelMedicationRecord`, `selectMedication`, `showMedModal`, `updateMedicationDose`, `recordMedication`, `getOrCreateDrugTimerBox`, `startDrugTimer`, `stopDrugTimer`, `updateDrugStatusDisplay` |
| `src/pcr/rhythm.js` | `src/config/state.js`, `src/ui/dom.js`, `src/pcr/clinical.js`, `src/pcr/core.js`, `src/pcr/timing.js` | `showRhythmSelectorScreen`, `selectRhythmOption`, `processRhythmSelection`, `setupShockActionScreen`, `applyShockAndResume`, `roscObtido` |
| `src/pcr/start.js` | `src/config/state.js`, `src/accessibility/index.js`, `src/services/storage.js`, `src/ui/toast.js`, `src/utils/events.js` | `startPCR`, `finishPCR`, `startSimulation` |
| `src/pcr/timer.js` | `src/ui/dom.js`, `src/utils/formatters.js`, `src/ui/audio.js`, `src/workers/pcr-worker.js` | `startPCRTimer`, `stopPCRTimer`, `resetPCRTimer`, `getPCRSeconds`, `isPCRTimerActive` |
| `src/pcr/timing.js` | `src/config/state.js` | `OBSERVATION_GAP_MS`, `resetTiming`, `startTimingEpisode`, `observeTiming`, `recordTimingMode`, `suspendTiming`, `closeTimingEpisode`, `getTimingSummary`, `syncTimingTotals` |
| `src/pcr/vitals.js` | `src/config/state.js`, `src/ui/dom.js` | `showVitalsModal`, `getVitalsStatus`, `recordVitals` |
| `src/protocols/guidelines.js` | `src/config/state.js`, `src/services/permissions.js`, `src/ui/dom.js` | `HTS_INSTRUCTIONS`, `PROTOCOLS`, `STUDY_GUIDES`, `showStudyDetail`, `downloadProtocolPDF`, `showProtocolDetail`, `getTreatmentRecommendation`, `toggleCause`, `toggleStudyHSTs`, `createStudyHSTsList`, `closeTreatmentFullscreen` |
| `src/protocols/medical.js` | — | `getCalculatedPediatricValues`, `getShockRecommendation`, `getLastMedicationTime`, `getMedicationDueStatus`, `getAntiarrhythmicHistory`, `getAdultAntiarrhythmicDose`, `evaluateMedicationGuidance`, `getProtocolNextStep`, `calculateGlasgow` |
| `src/services/auth.js` | `src/config/supabase.js`, `src/config/state.js` | `handleLogin`, `logout`, `checkSession`, `updatePassword`, `onAuthStateChange` |
| `src/services/database.js` | `src/config/supabase.js`, `src/config/state.js` | `loadUserProfile`, `saveUserProfile`, `savePCRLog`, `loadPCRLogs`, `deletePCRLog`, `loadUserStats`, `saveSimulationLog`, `loadSimulationLogs`, `fetchRandomClinicalCase`, `preloadClinicalCases` |
| `src/services/permissions.js` | `src/config/state.js` | `PLAN_PRIORITY`, `ACCESS_LEVELS`, `showUpgradeModal`, `checkAccess`, `startSubscriptionFlow` |
| `src/services/storage.js` | `src/config/supabase.js`, `src/config/state.js` | `appDB`, `setItem`, `getItem`, `removeItem`, `clear`, `saveSettings`, `loadSettings`, `saveOfflineLog`, `getOfflineLogs`, `markLogSynced`, `getStorageSize`, `getStorageSizeFormatted`, `checkAndIncrementSimulationUse`, `resetDailyUsage`, `getUsageStats`, `checkPatientSaveLimit`, `FREE_DAILY_LIMIT`, `STUDENT_DAILY_LIMIT` |
| `src/ui/audio.js` | `src/services/storage.js`, `src/config/state.js` | `initAudio`, `playNotification`, `createMetronomeSound`, `toggleMetronome`, `startMetronome`, `stopMetronome`, `isMetronomeActive`, `adjustBPM`, `AUDIO_ELEMENTS`, `audioContext` |
| `src/ui/auth-profile.js` | `src/config/state.js`, `src/config/supabase.js`, `src/ui/dom.js`, `src/pcr/log.js` | `manageProVisibility`, `fetchUserProfile`, `loadUserFromSession`, `checkAuthStatus`, `resetUserState`, `initUIAuthListener`, `saveState`, `loadState`, `handleLogin`, `handleRegistration`, `handleRegistrationFromForm`, `handleProfileUpdate`, `logout`, `showProfileModal`, `updateGreetingsAndHeader`, `updateSidebarPlan`, `updateDashboard` |
| `src/ui/dom.js` | — | `initDOMCache`, `getElement`, `showScreen`, `closeModal`, `openModal`, `showTransientAlert`, `getIconForEvent`, `DOM_CACHE` |
| `src/ui/events.js` | `src/pcr/core.js`, `src/config/state.js`, `src/ui/dom.js`, `src/ui/patient.js`, `src/ui/audio.js`, `src/pcr/rhythm.js`, `src/pcr/medications.js`, `src/pcr/log.js`, `src/pcr/vitals.js`, `src/ui/glasgow.js`, `src/ui/auth-profile.js`, `src/services/permissions.js`, `src/protocols/guidelines.js`, `src/services/storage.js`, `simulator.js` | `registerAllEvents` |
| `src/ui/glasgow.js` | `src/config/state.js`, `src/ui/dom.js` | `showGlasgowModal`, `updateGlasgowScore`, `saveGlasgow` |
| `src/ui/navigation.js` | `src/ui/toast.js` | `showScreen`, `openModal`, `closeModal`, `showFeedback` |
| `src/ui/patient.js` | `src/config/state.js`, `src/ui/dom.js` | `showPatientModal`, `cancelPatientSetup`, `savePatientData`, `startPCRWithUninformedData` |
| `src/ui/pcr-guidance.js` | `src/config/state.js`, `src/pcr/clinical.js`, `src/protocols/medical.js` | `feedbackCritico`, `updatePcrGuidance` |
| `src/ui/timeline.js` | `src/config/state.js` | `addEvent`, `getIconForEvent`, `updateTimeline` |
| `src/ui/toast.js` | — | `showToast`, `clearToasts`, `toast` |
| `src/utils/events.js` | — | `events` |
| `src/utils/formatters.js` | — | `formatTime`, `formatTimestamp`, `formatDate`, `formatDateTime`, `calculatePediatricDose`, `calculatePediatricShock`, `isPediatric`, `calculateAge`, `formatDuration`, `formatPercentage`, `truncate` |
| `src/utils/formatters.test.js` | `vitest`, `src/utils/formatters.js` | — (pode ter export default/global) |
| `src/utils/logger.js` | — | `logger` |
| `src/utils/medications.js` | — | `calculatePediatricDose`, `MEDICATIONS`, `calculateDose`, `getMedicationInterval`, `getMedicationRoutes`, `getMedicationNotes` |
| `src/workers/pcr-worker.js` | — | — (pode ter export default/global) |
| `tests/adult-guidelines.test.js` | `vitest`, `src/protocols/guidelines.js` | — (pode ter export default/global) |
| `tests/antiarrhythmics.test.js` | `vitest`, `src/protocols/medical.js`, `tests/helpers/clinical.js` | — (pode ter export default/global) |
| `tests/formatters.test.js` | `vitest`, `src/utils/formatters.js`, `src/utils/medications.js` | — (pode ter export default/global) |
| `tests/helpers/clinical.js` | — | `NOW`, `episodeId`, `medication`, `snapshot`, `atStep` |
| `tests/i18n.test.js` | `vitest`, `src/i18n/index.js` | — (pode ter export default/global) |
| `tests/medical.test.js` | `vitest`, `src/protocols/medical.js` | — (pode ter export default/global) |
| `tests/mobile-navigation.test.js` | `node:fs`, `vitest`, `src/config/state.js`, `src/ui/events.js`, `src/ui/auth-profile.js`, `src/ui/dom.js`, `src/pcr/rhythm.js`, `src/pcr/core.js`, `src/protocols/medical.js`, `settings-integration.js` | — (pode ter export default/global) |
| `tests/pcr-efficiency.test.js` | `node:fs`, `vitest`, `src/config/state.js`, `src/pcr/core.js`, `src/pcr/rhythm.js`, `src/pcr/medications.js`, `src/pcr/timing.js`, `src/pcr/log.js`, `src/ui/patient.js`, `src/ui/pcr-guidance.js`, `src/protocols/medical.js` | — (pode ter export default/global) |
| `tests/pcr-medications.test.js` | `node:fs`, `vitest`, `src/config/state.js`, `src/pcr/core.js`, `src/pcr/rhythm.js`, `src/pcr/medications.js`, `src/protocols/medical.js`, `src/pcr/clinical.js`, `src/ui/pcr-guidance.js`, `src/pcr/events.js`, `tests/helpers/clinical.js`, `src/ui/patient.js` | — (pode ter export default/global) |
| `tests/pcr-notes-isolation.test.js` | `node:fs`, `vitest`, `src/config/state.js`, `src/pcr/core.js`, `src/pcr/rhythm.js`, `src/pcr/log.js`, `src/ui/patient.js`, `src/ui/dom.js`, `src/ui/timeline.js`, `src/config/supabase.js` | — (pode ter export default/global) |
| `tests/pcr-report.test.js` | `vitest`, `src/config/state.js`, `src/pcr/log.js` | — (pode ter export default/global) |
| `tests/setup.js` | `vitest` | — (pode ter export default/global) |
| `tests/storage.test.js` | `vitest`, `src/services/storage.js` | — (pode ter export default/global) |
| `tests/toast.test.js` | `vitest`, `src/ui/toast.js` | — (pode ter export default/global) |
| `toggle-fix.js` | — | — (pode ter export default/global) |
| `vite.config.js` | `vite` | — (pode ter export default/global) |
