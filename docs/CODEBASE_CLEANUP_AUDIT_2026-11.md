# SIAV — Auditoria conservadora de limpeza estrutural (10/11/2026)

Base: `581dd7f76830b9cc794729a435a8c9be3177d49f`, PR #2 (`fix/adult-pcr-antiarrhythmics`). Este relatório foi preparado **sem remover arquivos ou alterar código funcional**. É uma revisão estática inicial e não substitui a auditoria de dependências dinâmicas, o teste em Safari nem a homologação clínica.

## Escopo e inventário verificado

- Inventário via API de árvore recursiva do GitHub: **122 arquivos versionados**, **17.007.730 bytes** somados. O arquivo VSIX isolado tem **15.123.556 bytes**, aproximadamente 89% do total versionado em bytes. O tamanho versionado não corresponde ao tamanho de download do aplicativo no navegador nem equivale ao tamanho do histórico Git.
- Diretórios: raiz (37 arquivos), `src` (42), `tests` (15), `sounds` (15), `docs` (4), `pages` (3), `.github` (3), `data` (1), `supabase` (1), `.claude` (1).
- Entrada de build: `index.html`, `src/main.js` e imports dinâmicos. `vite.config.js` gera `dist/`. `src/main.js` expõe muitas funções em `window` e `window.SIAV`; isso impede concluir ausência de uso só com grafo estático de imports.

## Achados com evidência direta

| Item | Evidência | Classificação e encaminhamento |
|---|---|---|
| `Microsoft.VisualStudio.Services (1).VSIXPackage` | Binário de 15.123.556 bytes, identificado em auditoria anterior como pacote de extensão Copilot Chat; nenhuma função de app identificada | **Candidato de alta confiança à remoção do versionamento** após busca total de referências em scripts, docs, build e deploy. Preservar rastreabilidade pelo Git; não reescrever histórico sem procedimento separado |
| `.github/workflows/index.ts`, `purgecss.config.js` | Ambos tamanho zero, mesmo objeto Git | **Candidatos** à exclusão após conferir se nenhum processo os espera |
| `plans-modal-optimized.js` / `plans-modal-optimized-v5.js` | SHA de blob idêntico (`ad9c86c4...`), 15.611 bytes cada | Duplicação real. **Manter o arquivo usado pela página**; investigar referências de ambos e eventual tooling antes de eliminar o redundante. Não alterar preço, monetização ou fluxo de checkout |
| `sounds/library/metronome/metronome-4.mp3` / `sounds/library/shocks/shock-3.mp3` | Blob idêntico (SHA `c734804f...`) | Conteúdo binário idêntico, mas nomes representam papéis distintos. **Não apagar ou renomear automaticamente**; referências por caminho e preferências do usuário podem exigir ambos |
| `src/pcr/start.js` | Exporta `startPCR` e `finishPCR` alternativos, além de simulador com TODO | **Legado de alto risco**: não remover sem provar ausência de imports, acesso global, testes e vínculos comerciais; o núcleo operacional vem de `src/pcr/core.js` |
| `src/pcr/timer.js` e `src/workers/pcr-worker.js` | Timer/worker alternativos; o core operacional utiliza `src/pcr/timing.js` e `src/pcr/core.js` | **Legado candidato**, mas NÃO presumir que Worker garante contagem em suspensão de iOS, nem eliminar sem análise completa |
| `src/pcr/cycle.js` | Implementação adicional de ciclos, diferente do `compressionCycle` utilizado por `src/pcr/core.js` | **Legado candidato**, verificar importações, testes, documentação |
| `src/ui/navigation.js` | Funções `showScreen`, `openModal`, `closeModal` paralelas às de `src/ui/dom.js` | **Legado candidato**, avaliar referências e efeitos de UI antes de excluir |
| `src/index.js` | Exporta `config` a partir de `src/config/supabase.js`, que não exporta `config` | Barrel incompatível (se importado). Primeiro verificar consumidores; não corrigir exportação inventando objeto |
| `tests/setup.js` | Arquivo existe; `vite.config.js` não declara `setupFiles` | Possível setup inativo; confirmar importações de testes antes de excluir |
| `script.js` | Arquivo de 167 bytes, lembrete de migração modular | Pode ainda ser referenciado em docs/scripts/precaching; candidato após prova de não uso |
| `index.html`, `style.css` | 110.557 e 140.836 bytes, respectivamente | O tamanho indica oportunidade de modularização, **não** lixo. Não aplicar PurgeCSS de forma automática: seletores são ativados dinamicamente |
| `service-worker.js` | Precache referencia `/sounds/shock.mp3`, `/sounds/alert-sound.mp3` e `/sounds/drug-sound.mp3`, ausentes da árvore, além de CSS remoto | Defeito potencial de instalação offline; **corrigir em entrega separada**, sem simplesmente apagar o SW |
| `manifest.json` | Aponta `icon-192.png` e `icon-512.png`, ausentes da árvore | Lacuna PWA; preservar manifest e corrigir assets em fase própria |
| `.github/workflows/deploy.yml` | `npm run build` gera `dist/` mas deploy executa `netlify-cli deploy --prod --dir=.`; também cria `build-optimized/` | **Risco de deploy de conteúdo incorreto**. Não disparar workflow nem fazer deploy; requer correção e homologação separadas |
| `src/services/storage.js` | Fila IndexedDB, fallback e lógica de limites; dependência de Supabase | Não limpar registros de usuário nem migrar chaves offline em refactor. Arquitetura aponta ausência de isolamento de proprietário |
| `data/quiz-fallback.json` | Recurso offline educacional existente | **Preservar**, pois Academy offline é objetivo prioritário; não classificar como sobra |
| `package-lock.json` | Adicionado para CI que usa `npm ci` | **Preservar**: artefato fundamental de build reproduzível |
| `docs/` e `tests/` | Evidência de decisões e regressões; 168 testes verdes no CI indicado | **Preservar**. Arquivos históricos podem ser movidos/reclassificados posteriormente, sem perda de rastreabilidade |
| `supabase/functions/mercadopago-checkout/index.ts`, `pages/pagamento-*.html` | Pontos de integração comercial existentes | **Preservar** até auditoria funcional e comercial. Não alterar backend ou checkout nesta limpeza |

## Pontos de entrada e armadilhas da análise

Para cada candidato, investigar referências em imports/exportações ES, `import()`, HTML (script/link/inline handlers), `window.SIAV`, `window.*`, eventos, DOM, CSS com classes dinâmicas, service worker, manifest, roteamento/redirects, testes, GitHub Actions, Netlify, Supabase Edge Functions e URLs de retorno de pagamento. Referências a assets podem ser montadas por concatenação: ausência de string literal não é prova isolada. Verificar código executado em condições offline, login, usuário Free/Premium, PCR/ROSC, simulação e quiz. Não executar pagamentos nem usar dados reais de pacientes.

## Critérios para exclusão ou refatoração

**A — removível comprovado:** não há consumidor em runtime, build, testes, PWA, configurações nem integração externa conhecida; a remoção passa CI e verificações específicas.  
**B — provável legado:** não há referências óbvias, mas há carregamento indireto ou dependência externa não descartados. Documentar e deixar intacto até confirmação.  
**C — ativo/importante:** preservar; corrigir duplicidade somente com equivalência comportamental e teste.  
**D — futuro/estratégico:** preservar até decisão de produto, mesmo sem execução atual.

Aprovação de testes existentes não prova ausência de consumo externo, integridade de dados ou homologação Safari. Não inferir de testes verdes que a remoção foi segura.

## Procedimento recomendado para execução profunda

1. Confirmar HEAD e salvar baseline: inventário completo com SHA, tamanho, imports, rotas/HTML/DOM, CSS, assets, testes, build e CI.
2. Gerar grafo de dependências estáticas e dinâmica auditável com ocorrências, apontando falsos positivos/negativos. Verificar lazy loads e caminhos legados que ainda podem ser chamados.
3. Inventariar JS/CSS/HTML duplicados, seletores mortos, funções nunca utilizadas, arquivos temporários, nomes inconsistentes, artefatos IDE, fontes de dose duplicadas, CDN e assets PWA, serviços paralelos e scripts de planos.
4. Separar claramente resíduos provados de código apenas suspeito; calcular **economia real de arquivos e de bytes enviados**, sem equiparar tamanho do repositório a payload mobile.
5. Fazer mudanças mínimas e reversíveis apenas na branch de auditoria, idealmente um commit por categoria; nunca remover `docs`, testes, SQL, configs, lockfile, credenciais, dados de usuário, mídias referenciadas ou documentação de decisão por estética.
6. Após cada categoria: `npm ci`, `npm run test:run`, `npm run test:coverage`, `npm run build`, `git diff --check`; testar navegação, PCR/ROSC/notas/medicamentos/timers/FCT, login, quiz, simulação, planos, offline, PWA e dark mode em dispositivos emulados e Safari físico quando disponível.
7. Registrar para cada exclusão: arquivo, prova de não uso, resultado de verificação, impacto em build/transferência, SHA de recuperação e instrução de rollback.
8. Não alterar algoritmos/doses/ritmos ou semântica de eventos clínicos em uma limpeza. Vulnerabilidades funcionais e diferenças entre código e banco devem virar issues ou futuras entregas, não correções silenciosas.
9. Antes de compartilhar qualquer lista de segredos ou valores de autenticação, fazer redaction. Não inserir URLs de cliente, tokens, registros reais ou dumps nos relatórios.
10. Só incorporar ao PR #2 após revisão de diffs e testes; manter `main` e produção intocadas. Checar CI da branch antes de pedir autorização de integração.

## Limites desta revisão

A inspeção baseada no GitHub confirmou a árvore, os blobs duplicados, os caminhos e os principais pontos de entrada, além do CI verde. **Não foi executada auditoria completa de referências, testes pós-limpeza ou navegador físico**, e **nenhum arquivo foi excluído neste relatório**. Candidatos enumerados não são declaração de código morto provado.
