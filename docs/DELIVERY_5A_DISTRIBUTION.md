# SIAV — Entrega 5A: distribuição de assets e PWA

Data: 10/11/2026 (America/Sao_Paulo). Base obrigatória: `656a732d660e1acd574de19874c07f420910de33`. Branch exclusiva: `fix/distribution-assets-pwa`.

Referência: [CODEBASE_CLEANUP_RESULT.md, seção 9](CODEBASE_CLEANUP_RESULT.md#9-problemas-importantes-fora-do-escopo-sem-correção-funcional).

Implementação e regressões: `63a6c136d7be96cbdd938d8f864b6c2bc2ef55a1`. O commit deste documento é informado na entrega. Nenhum merge, deploy, alteração de Supabase/banco ou modificação de workflow foi executado. `main`, a branch do PR #2 e a branch da auditoria foram preservadas.

## 1. Diagnóstico: causa dos 404 e decisões verificadas

O build anterior gerava um bundle ES, mas não uma cópia completa dos recursos públicos usados pelo aplicativo. O servidor Vite de desenvolvimento e um servidor com fallback SPA podem esconder esse problema; a validação desta entrega usa HTTP estático estrito, servido **somente de `dist/`**, sem acesso à raiz e sem fallback para index em URLs ausentes.

| Recurso / falha | Causa verificada | Correção |
|---|---|---|
| `mercadopago-config.js`, `mercadopago-integration.js`, `plans-modal-optimized-v5.js`, `toggle-fix.js` | Scripts clássicos do HTML não são incorporados pelo Vite como módulos; permaneciam referências a arquivos ausentes | Emissão explícita dos quatro arquivos, byte a byte, com os mesmos caminhos. Não convertidos para `type="module"`, preservando ordem, globals, preços e lógica existente |
| `data/quiz-fallback.json` | Caminho montado pelo engine em `fetch()`, fora das entradas estáticas do bundler | Inclusão explícita do JSON educacional, sem alterar questões ou respostas |
| `sounds/library/**` | Recursos selecionados por valores HTML, preferências e JS; a biblioteca fora de `public/` não era copiada | Inclusão explícita dos 15 MP3/WAV, sem renomear nem deduplicar caminhos |
| `/service-worker.js` | Worker registrado por URL, mas fora do grafo ES e ausente do artefato | Worker gerado no build e entregue na raiz, com lista de recursos e revisão por conteúdo |
| Registro do SW | Registro era agendado dentro da inicialização assíncrona, após consulta de sessão; `load` podia já ter ocorrido | Registro independente da sessão, uma vez, antes da espera por autenticação, com tratamento de documento já carregado |
| Sons antigos do precache | `/sounds/shock.mp3`, `/sounds/alert-sound.mp3` e `/sounds/drug-sound.mp3` não existem | Lista gerada a partir dos arquivos reais publicados; fonte de desenvolvimento usa caminhos reais da biblioteca. Não foram criadas cópias fictícias nos nomes antigos |
| Manifest/ícones | PNGs 192/512 ausentes; manifest é transformado pelo Vite em `/assets/manifest-*.json`, mudando a base de seus caminhos relativos | PNGs reais de 192 e 512 adicionados; `src` dos ícones aponta para URLs absolutas da raiz. Manifest original também é emitido em `/manifest.json` para compatibilidade |
| Páginas de pagamento | Fontes estavam em `pages/`, não eram entradas do build, enquanto `mercadopago-config.js` declara retornos na raiz | Três páginas emitidas tanto em `/pages/pagamento-*.html` quanto em `/pagamento-*.html`; conteúdo de negócio preservado |
| Links/scripts em páginas de pagamento | `index.html` e scripts sem `/` eram resolvidos sob `/pages/`, onde não existem | Apenas esses destinos comprovados foram corrigidos para `/index.html` e scripts da raiz; os links funcionam nos dois conjuntos de URLs |
| Preloads manuais de `src/main.js`, `src/config/state.js` e `src/config/supabase.js` | Contornavam o grafo de módulos; o Vite emitia cópias avulsas de main/state com imports relativos inadequados | Três hints redundantes removidos. A entrada ES permanece e o Vite gerencia seus bundles e lazy imports. Nenhuma função clínica foi retirada |

As três páginas de retorno têm consumidores comprovados em `mercadopago-config.js`. Isso não confirma que o provedor de pagamento em produção usa essas URLs: o backend versionado contém outra convenção baseada em query string. Nenhuma convenção de checkout, decisão comercial ou validação de pagamento foi alterada.

`test-plans-modal.html`, `test-usage-limit.html`, `limpar-cache.html`, `force-reload.js`, o segundo script de planos usado só pela página manual, módulos alternativos e arquivos históricos não são entradas do aplicativo distribuído. Continuam no repositório e não foram copiados para `dist/`.

## 2. Estratégia explícita de empacotamento

`scripts/distribution-assets.mjs` implementa um plugin local do Vite, ativo apenas no build. A lista `STATIC_ASSETS` declara cada fonte e URL de destino. `publicDir: false` evita cópia automática de uma pasta pública que eventualmente contenha arquivos indevidos. Não há cópia da raiz, `src/`, globs abrangentes ou execução de ferramentas de limpeza de CSS.

O hook de emissão roda depois da produção do HTML pelo Vite. A revisão do cache considera o HTML final, bundles, arquivos estáticos e código do SW. Um teste recompõe essa revisão; o HTML também precisa estar na lista de precache. Alterações em recursos publicados invalidam a revisão de forma consistente.

| Assets incorporados explicitamente | Quantidade de arquivos no artefato |
|---|---:|
| Scripts clássicos existentes, com conteúdo preservado | 4 |
| JSON de questões offline | 1 |
| Manifest da raiz | 1 |
| Ícones PNG, opacos, com motivo ECG decorativo e cor do manifest | 2 |
| Biblioteca de sons, MP3/WAV | 15 |
| Três páginas de retorno em duas localizações | 6 |
| SW com configuração estática embutida | 1 |
| HTML e recursos produzidos pelo Vite | 11 |
| **Total** | **41** |

Os ícones têm dimensões verificadas no PNG e não adicionam animação ou indicação clínica à interface. SDKs externos continuam externos. O manifest transformado e o da raiz apontam para os mesmos PNGs. A raiz do domínio continua sendo o caminho suportado, conforme `scope`, `start_url`, registro do SW e URLs existentes; hospedagem sob subdiretório não foi adicionada.

O pacote não inclui documentação, testes, scripts de build/teste, arquivos `.env`, SQL, backend, `package.json`, lockfile, `node_modules`, repositório Git, sourcemaps ou árvore fonte avulsa. Código frontend necessário permanece nos bundles e scripts públicos, inclusive as configurações públicas que já pertenciam ao cliente; isto não é publicação de segredo de servidor.

## 3. Política do Service Worker

A revisão validada é `siav-static-0e95353a61973305` (muda com o conteúdo do build). O precache contém **34 arquivos públicos**, somando **1.153.209 bytes** de corpos estáticos, antes de overhead de armazenamento.

- Precache: somente a lista do próprio build, do mesmo origin, por GET, sem parâmetros e com `credentials: 'omit'`. Respostas de erro, opacas, redirecionadas, com `private`/`no-store` ou `Vary` por Cookie/Authorization fazem a instalação falhar, em vez de serem armazenadas.
- Atendimento de requests: somente GET de URL pública declarada, sem query string e sem header Authorization. `/` usa o shell estático `/index.html`. O lookup usa **somente o cache da revisão atual**; não usa `caches.match()` global.
- APIs, Supabase, SDK/CDN, outros origins, URLs com parâmetros, retornos de pagamento e demais caminhos ficam fora da interceptação/cache. Não há resposta fictícia de Supabase quando a rede falha.
- Não existe gravação oportunista de respostas de runtime. Em caso de ausência no cache, a requisição vai à rede, sem `cache.put` dessa resposta.
- Não são serializados estado da PCR, pacientes, notas, tokens, sessão, relatórios, respostas de APIs ou conteúdo personalizado. O cache guarda o HTML público original e recursos estáticos, não o DOM após interação.
- Atualizações não chamam `skipWaiting()` nem forçam reload. Uma versão nova aguarda o ciclo normal de fechamento das páginas controladas; a instalação inicial pode controlar a página após ativação. O SW não é mecanismo de continuidade ou recuperação de atendimento.
- Ativação remove somente revisões anteriores do namespace `siav-static-`. Caches legados, inclusive `siav-v13`, e caches de outros aplicativos são preservados e nunca usados como fallback pelo novo worker. IndexedDB e localStorage não são migrados nem apagados.

**Decisão pendente de retenção:** a política antiga podia armazenar respostas indevidas e apagava caches de outros nomes. A nova política não reutiliza esses dados, mas não elimina resíduos já existentes em caches legados. Sua inspeção/expurgo exige uma etapa específica de privacidade e persistência, sem apagar históricos por inferência. Enquanto um SW antigo continuar ativo em uma aba antiga, seu comportamento anterior também pode continuar; não se força atualização durante atendimento.

## 4. Arquivos alterados

| Arquivo(s) | Alteração |
|---|---|
| `scripts/distribution-assets.mjs`, `vite.config.js` | Lista explícita, emissão de assets/aliases e geração de revisão/precache |
| `index.html` | Retirada apenas dos três preloads manuais de fontes |
| `manifest.json`, `icon-192.png`, `icon-512.png` | Caminhos de ícones válidos e arquivos nas dimensões declaradas |
| `pages/pagamento-sucesso.html`, `pages/pagamento-falha.html`, `pages/pagamento-pendente.html` | Correção dos links e scripts relativos comprovadamente quebrados |
| `service-worker.js` | Cache restrito a assets públicos, isolamento de namespace e atualização sem tomada forçada de controle |
| `src/pwa/register.js`, `src/main.js` | Registro único do SW sem depender da consulta de sessão ou da ordem de `load` |
| `package.json`, `package-lock.json` | Comando `test:distribution`; Playwright **1.57.0** fixado, exclusivamente como dependência de desenvolvimento para testes reais de navegador |
| `tests/service-worker.test.js` | 17 regressões de instalação, privacidade, requests, fallback e ativação |
| `tests/pwa-registration.test.js` | 4 regressões de registro antecipado/tardio, falha e ausência de suporte |
| `tests/distribution/check.mjs`, `tests/distribution/server.mjs` | Build real, HTTP estático estrito, inspeção de artefato, SW real e cenários mobile/offline |
| `docs/DELIVERY_5A_DISTRIBUTION.md` | Este diagnóstico, resultados, limites e reversão |

Não houve upgrade de dependências previamente bloqueadas no lockfile. Foram adicionados somente Playwright, playwright-core e sua dependência opcional fsevents. Os **174 testes anteriores não foram editados**. Comparação com a base confirmou 54 arquivos protegidos idênticos, abrangendo núcleo clínico, serviços, configuração, workflows, testes antigos e lógica de pagamentos/UI selecionada. A única mudança em composição (`src/main.js`) é relativa ao registro do SW.

## 5. Tamanho antes/depois

| Medida | Base `656a732` | Entrega 5A |
|---|---:|---:|
| Arquivos de `dist/` | 13 | 41 |
| Soma dos corpos dos arquivos | 486.957 bytes | 1.190.265 bytes |
| Soma gzip determinística por arquivo | 113.900 bytes | 719.121 bytes |
| Diferença bruta | — | +703.308 bytes |
| Arquivos de precache efetivo da nova política | — | 34 |

O aumento corrige omissões; não é ganho de performance prometido. Áudios já comprimidos e seis URLs de páginas explicam parte relevante do acréscimo. Duas cópias avulsas de módulos desapareceram; recursos clínicos e mídias foram preservados. A soma gzip usa `gzip.compress(..., mtime=0)` por arquivo: não é tamanho do histórico Git, ZIP de entrega, total de um HAR ou garantia de compressão do servidor. `dist/` continua ignorado pelo Git e é regenerado pelo build.

## 6. Testes e resultados

Ambiente de execução: Linux, Node **22.23.4**, npm **10.9.9**, Chromium de sistema via Playwright **1.57.0**. `npm ci` usou cache em diretório gravável do workspace. Nenhuma desativação de TLS foi utilizada.

| Verificação executada | Resultado |
|---|---|
| Baseline: instalação limpa, suíte e build | 174/174 testes, 14 arquivos; build reproduziu artefato incompleto anterior |
| Instalação limpa após mudança do lock | 422 pacotes instalados; sucesso |
| `npm run test:run` | **195/195**, 16 arquivos; os 174 anteriores e 21 novos aprovados |
| `npm run test:distribution` | **5/5**, sem skips; executa `npm run build` e sobe servidor exclusivamente de `dist/` |
| Sintaxe JS/MJS e `git diff --check` | Aprovados |
| Roteiro existente `tests/mobile-care-interactions.mjs`, servido de `dist/`, iPhone 13 emulado | 19 verificações aprovadas |
| Mesmo roteiro em iPhone SE emulado | 19 verificações aprovadas |

As cinco verificações de distribuição cobrem:

1. Lista de arquivos publicados, igualdade byte a byte dos assets copiados, revisão completa do cache e 404 para caminhos internos indevidos.
2. Todos os destinos locais encontrados em HTML, CSS, lazy imports, manifest, ícones, opções de áudio e precache. Os PNGs têm dimensões reais; o servidor não mascara ausência com HTML.
3. JSON de fallback e conteúdo/assinaturas dos 15 áudios, comparados às fontes originais.
4. Chromium com viewport/toque de iPhone 13: registro/ativação real do SW, configuração de temas claro/escuro, modais de visitante, scripts de planos/checkout disponíveis, fetch offline de JSON/áudio e execução do quiz offline após carregar a aplicação.
5. O mesmo cenário em iPhone SE, incluindo ausência de overflow horizontal nas verificações realizadas.

Os testes mobile de distribuição usam **fixtures apenas para as interfaces externas do SDK**, com sessão sempre nula e erro em qualquer operação de banco/auth/pagamento. A aplicação e o SW são os arquivos reais servidos pelo servidor estático. Nenhuma autenticação bem-sucedida é simulada. Os caches de teste têm apenas marcadores sintéticos e são descartados com o contexto. Os testes confirmam que entradas privadas/URLs com parâmetros não entram no cache novo e que caches sintéticos legados/de terceiros não são consultados ou apagados.

Como verificação adicional, o roteiro de medicamentos/cadastro existente foi executado contra o artefato com SDK público real obtido do CDN, TLS verificado e todas as chamadas de backend/pagamento bloqueadas. Exercitou seleção explícita do algoritmo, pausa/retomada sem reiniciar prazo, sugestão/edição de dose e um novo preparo sem herdar dados.

O HTML preexistente força reload inicial. Uma execução do teste de distribuição no SE encontrou uma corrida entre esse reload e a ativação de offline; o teste foi sincronizado com o término dessa navegação, sem alterar o comportamento do aplicativo. A execução final de cinco casos passou. O reload permanece entre os riscos abaixo.

### Como reproduzir sem deploy

```sh
npm ci
npm run test:run
npx playwright install chromium
npm run test:distribution
```

Se o sistema precisar de bibliotecas de navegador, a preparação usual de Playwright é `npx playwright install --with-deps chromium`. Em ambiente que já fornece Chromium, usar `SIAV_CHROMIUM_PATH=/caminho/para/chromium npm run test:distribution`; nesta validação o caminho foi `/usr/bin/chromium`. Não é necessário iniciar Vite, usar a raiz como diretório público ou executar pagamentos. O servidor de teste escuta somente em loopback, usa porta dinâmica e é encerrado ao fim.

Os workflows não foram editados e o CI atual não dispara por push desta nova branch. Portanto esta entrega **não afirma uma execução remota de CI verde**; os comandos acima foram efetivamente executados no ambiente local. O workflow de produção continua com o problema de publicar a raiz e **não foi acionado**.

## 7. Limitações, riscos e decisões pendentes

- **Safari:** viewport/toque de iPhone no Chromium não é WebKit nem Safari físico. WebKit não estava instalado; não houve homologação de instalação PWA, quotas, persistência, áudio, expurgo de cache ou suspensão no iPhone real.
- **Offline básico:** foi validado após abertura inicial online, na mesma página, com assets públicos precacheados. SDKs Supabase, fontes/ícones externos e SDK Mercado Pago continuam dependendo de terceiros. Não se promete inicialização completa a frio sem rede, login offline ou transação offline. Empacotar/fixar SDKs externos requer entrega específica de dependências e integração.
- **PCR e recarga/suspensão:** esta entrega não persiste nem recupera estado assistencial. O inline de reload inicial continua no HTML; trocar versão, recarregar, encerrar aba ou suspender o navegador não garante continuidade de PCR. Qualquer mudança desse fluxo deve ter auditoria própria; nenhuma dose, regra, cálculo ou temporização foi alterada.
- **Cache legado:** pode conter dados anteriores à nova política. Foi isolado, não reutilizado nem apagado. Retenção/expurgo, troca de usuário e filas IndexedDB/localStorage continuam exigindo decisão específica de privacidade/persistência.
- **Pagamentos:** preços/configurações divergentes, checkout simulado no modal e atualização local de plano em página de retorno continuam como estavam. Publicar uma página de retorno não valida pagamento; autenticação, autorização e confirmação precisam de revisão separada. Os testes não processam URLs reais de pagamento e não executam transações.
- **Hospedagem:** servidor real deve servir os arquivos em raiz, com MIME correto e HTTPS (loopback foi o contexto seguro dos testes). Redirecionamentos/headers privados nos assets impedem precache por decisão de segurança. Quota de armazenamento ou falha de um recurso obrigatório pode impedir instalação; nenhum erro é transformado em falso sucesso.
- **Avisos de build:** permanecem o aviso de scripts clássicos fora do bundler (agora emitidos e verificados explicitamente) e o `}` inesperado em `style.css:1282`, preexistente e fora do escopo. Build sozinho não é evidência de completude; o teste HTTP é obrigatório para esta entrega.
- **Produção e dados:** não foram consultados schema, políticas, credenciais, logs ou dados reais; não houve migração, limpeza de históricos ou alteração do provedor de hospedagem. O workflow que ainda publica a raiz precisa de correção autorizada em outra entrega antes de uma publicação real.

## 8. Reversão

O commit funcional é único e reversível. Na branch desta entrega, com árvore limpa:

```sh
git switch fix/distribution-assets-pwa
git revert 63a6c136d7be96cbdd938d8f864b6c2bc2ef55a1
npm ci
npm run test:run
npm run build
git diff --check
```

Isso restaura a base funcional de distribuição, inclusive seus 404 e sua política antiga de SW; não é recomendação de publicá-la. O comando de teste de distribuição deixa de existir após a reversão funcional; os 174 testes da base continuam disponíveis. O documento pode ser preservado como histórico. Não usar reset destrutivo, reescrever histórico ou alterar outras branches.

Rollback de código não apaga caches, filas ou dados de usuários nem força troca de SW em páginas abertas. Qualquer decisão de publicar ou expurgar armazenamento requer etapa própria. Nenhuma reversão ou publicação foi executada nesta entrega.
