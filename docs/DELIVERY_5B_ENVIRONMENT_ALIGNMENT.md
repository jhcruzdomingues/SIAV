# SIAV — Entrega 5B: GitHub, Vercel e configuração Supabase

Data: 10/11/2026 (America/Sao_Paulo). Branch de desenvolvimento: `fix/distribution-assets-pwa`.
Base: `0a9ed8c98eee710fd1e5043bb04fea6e30904316`.
Commit funcional: `0d245b0f9660834c4ec4b4d61112bb4881cf5edb`.

## 1. Resultado e evidências

A configuração do frontend foi corrigida e retirada do código fixo, com variáveis públicas explícitas e validação antes do build. O projeto pretendido e a pertença da chave publicável foram verificados pelo conector Supabase, sem consultar registros ou modificar o projeto.

| Verificação | Resultado observado |
|---|---|
| Projeto conectado | `SIAV`, referência `lfcvjrshlybmurnvulvh`, região `us-west-2`, estado `ACTIVE_HEALTHY` |
| URL informada pelo conector | `https://lfcvjrshlybmurnvulvh.supabase.co` |
| URL anterior do frontend | `https://lfcjrjshlybmurnvulvh.supabase.co` — referência diferente |
| Chave anteriormente fixa | Comparação exata confirmou que corresponde a uma chave publicável moderna, habilitada, do projeto SIAV ativo. Valor não reproduzido |
| Credenciais consultadas | Somente chaves públicas pelo endpoint próprio do conector; nenhuma `service_role`, secret key ou credencial de servidor foi buscada |
| Configuração local | URL e chave publicável verificadas em `.env.local` ignorado, permissões `0600`; não versionado nem copiado como arquivo ao artefato |
| Integração externa real via HTTP | Não confirmada: GET somente de `/auth/v1/settings` foi impedido pelo proxy do ambiente (`CONNECT tunnel failed, response 403`, HTTP final `000`). Nenhuma requisição a dados clínicos foi feita |
| Inicialização com SDK real | Aprovada em Chromium/iPhone 13 e SE emulados, cliente apontando ao projeto correto, visitante sem sessão, interface de login acessível; backend bloqueado |
| Produção existente | Não modificada. `main` e a branch do PR #2 não receberam commits |

A lista de projetos e a chave validada são evidência de destino e configuração, **não de segurança de RLS, schema, permissões, isolamento de proprietário ou persistência**. Não foram executados SQL, migrações, escrita/leitura de registros, login real, cadastro de usuário ou pagamento.

## 2. Auditoria das referências

- `src/config/supabase.js` continha a única URL de projeto operacional do frontend e uma chave moderna em variável chamada `SUPABASE_ANON_KEY`. O nome e o endereço estavam inconsistentes; o valor público pertencia ao projeto ativo.
- `.env.example` declarava variáveis que o cliente fixo não lia. Misturava exemplos de credenciais de pagamento/backend e fixava `NODE_ENV=development`; foi substituído por exemplo exclusivamente público do frontend, sem chave preenchida.
- Serviços e UI importam o cliente compartilhado de `src/config/supabase.js`. Não foram identificados outros destinos independentes de Supabase no código versionado.
- `mercadopago-integration.js` e UI de sessão usam `window.SIAV.supabase` preferencialmente, com fallbacks legados. Seus comportamentos e credenciais não foram alterados.
- O HTML carrega SDK Supabase global e o módulo usa import CDN ES; essa coexistência permanece, sem criação de outro cliente de aplicação. O teste de distribuição verifica uma única chamada à fábrica do cliente compartilhado.
- SQL e Edge Function continuam intactos. A Edge Function e configurações de checkout ainda contêm retornos Netlify; são decisões comerciais/hospedagem pendentes, não destinos a reescrever automaticamente.
- A busca incluiu arquivos versionados, exemplos de ambiente, scripts legados, testes, workflows e documentação. Antes desta entrega havia somente `.env.example` local; nenhum ambiente real de outro provedor foi sobrescrito.

## 3. Configuração implementada

O frontend lê individualmente, sem serializar o objeto completo `import.meta.env`:

| Variável | Uso |
|---|---|
| `VITE_SUPABASE_URL` | Obrigatória, URL HTTPS do projeto |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Obrigatória, chave moderna com prefixo `sb_publishable_` |
| `VITE_SUPABASE_PROJECT_REF` | Referência esperada, opcional; padrão é o SIAV verificado `lfcvjrshlybmurnvulvh` |

`src/config/public-supabase.js` valida protocolo, host correspondente à referência declarada, ausência de porta, credenciais na URL, parâmetros, fragmento e subcaminho. Rejeita chave ausente, chave secret, JWT/anon legado e valores que não sejam chave publicável moderna. Mensagens de erro nunca incluem os valores recebidos.

O build falha antes de gerar o artefato quando essas entradas são inválidas. Isso impede publicar acidentalmente um frontend com configuração vazia ou de tipo privilegiado. O cliente mantém as opções padrão de sessão/auth do SDK; nenhum fluxo de autenticação bem-sucedida foi simulado no produto.

**Limite dessa validação:** formato de chave opaca e correspondência URL/referência não provam que a chave pertence ao projeto. Essa pertença foi confirmada separadamente, pelo registro de chaves do projeto conectado. Para qualquer novo destino, repetir a verificação antes de configurar suas variáveis. Declarar outro `VITE_SUPABASE_PROJECT_REF` é uma decisão explícita de ambiente, não uma descoberta automática de backend.

Todos os arquivos `.env.*` reais e `.vercel/` passam a ser ignorados, mantendo somente exemplos sem valores. O `.env.local` preparado aqui não configura a Vercel: cada provedor tem seu próprio ambiente seguro.

Variáveis `VITE_*` são públicas no JavaScript compilado, mesmo quando mascaradas no painel. Usar somente a chave **publicável**. Nunca colocar `service_role`, `sb_secret_`, token de pagamento ou chave de servidor em qualquer variável consumida pelo frontend.

## 4. Separação proposta de ambientes

| Contexto | Configuração recomendada | Situação nesta entrega |
|---|---|---|
| Desenvolvimento local | `.env.development.local` ou `.env.local`, ignorado; preferir backend exclusivo de teste quando disponível | Configuração pública do SIAV validado foi preparada localmente; testes não acessaram seus dados |
| Vercel Preview | Variáveis de escopo **Preview**, restritas à branch `fix/distribution-assets-pwa`; sem alterar Production | Código e `vercel.json` prontos. Configuração no painel ainda deve ser confirmada/aplicada pelo responsável |
| Vercel Production | Manter `main`, domínio, variáveis e deployment atuais; futura promoção exige entrega autorizada e revisão própria | Nenhuma alteração realizada |
| GitHub CI | Valores explicitamente sintéticos, sem credencial real; artefato identificado como teste | Workflow CI habilitado para esta branch; build usa `sb_publishable_SYNTHETIC_CI_ONLY` e artefato `dist-ci-synthetic` |
| Supabase dedicado a desenvolvimento/preview | Projeto ou branch de dados separados, com URL/chave correspondentes, dados sintéticos e validação própria | Somente recomendação. Não foi criado, clonado ou modificado banco/branch de Supabase |

Vercel Preview usa normalmente um **build Vite em modo production**. Isso não o transforma em deployment Vercel Production: o escopo das variáveis e a branch selecionada definem o ambiente de hospedagem. Não substituir esse conceito por `NODE_ENV=development`.

Preview em domínio separado isola a origem de browser e o deployment frontend; **não isola os dados se apontar para o mesmo projeto Supabase**. O SIAV ativo não foi declarado backend descartável. Nesta etapa, validar como visitante e usar somente cenários sintéticos; não testar persistência de pacientes ou autenticar contas com históricos reais. A segurança/políticas do backend precisam de revisão específica.

## 5. GitHub/Vercel/Netlify: o que foi verificado

### Vercel

Nas capturas fornecidas, `siav-zlca` pertence ao escopo `siav2`, produção acompanha `main` e o domínio de produção é `siav-zlca.vercel.app`. O painel atual não pôde ser inspecionado: não há conector Vercel nesta sessão e a tentativa pelo desktop cloud falhou com `Browser Use could not read requirements`.

O GitHub registra, para o commit-base `0a9ed8c`, dois status de deployment concluído:

- `Vercel – siav`: <https://vercel.com/siav2/siav/A1qUDTPX6R2QvytihMzj8T9vXAfL>
- `Vercel – siav-zlca`: <https://vercel.com/siav2/siav-zlca/B1yTn5EscSS5tBCATEx9WrjYeJGf>

São links de detalhes no painel, **não URLs públicas do aplicativo**. Eles demonstram que ambos os projetos recebem essa branch, mas não comprovam URL de preview, conteúdo publicado, variáveis ou destino de produção. Nenhuma URL de app foi inventada. Após o push de `85f3577ae1b4861898598bf09151ddbd66b4d625`, o GitHub registrou **failure nos dois previews**:

- `siav`: <https://vercel.com/siav2/siav/EBmDTiSSXLEkai7wdW1bzzQX3SyS>
- `siav-zlca`: <https://vercel.com/siav2/siav-zlca/EbWXTexfZA4MW17pqHszME9wLkRj>

Mensagem observada: `Deployment has failed`. O status fornece link/identificador do deployment, mas não a causa do erro de build. Sem logs autenticados Vercel, **não se atribui causa exata**: configurar/conferir as variáveis Preview e abrir o log do deployment são ações pendentes. Não foi declarada prévia pronta nem URL pública validada. O commit final de documentação não muda a implementação validada.

O `vercel.json` da branch define:

```json
{
  "framework": "vite",
  "installCommand": "npm ci",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

Node `22.x` está declarado no `package.json` e lockfile. Não há aliases/domínios, rewrites gerais, secrets ou valores de chave no arquivo. O Vercel deve publicar somente `dist/`, não a raiz. A mudança existe apenas na branch de desenvolvimento e não altera o deployment atual de `main`.

### Netlify e hospedagem duplicada

`.github/workflows/deploy.yml` ainda publica em Netlify a raiz com `--dir=.` e usa outro conjunto de segredos de hospedagem. Permaneceu byte a byte intacto e não foi disparado. O backend e a configuração de checkout também mantêm URLs Netlify.

Estratégia recomendada: escolher um provedor/projeto canônico em entrega própria; usar agora **Vercel Preview de `siav-zlca`** como alvo de validação, conforme a indicação do usuário; preservar Netlify, o projeto Vercel `siav` e a produção existente até mapear domínios, callbacks, autenticação e pagamentos. Não desconectar provedores nem reescrever URLs comerciais nesta tarefa.

Não promover esta branch à produção sem resolver o pipeline Netlify, fornecer variáveis apropriadas e revisar callbacks. A nova validação de build também exigirá configuração explícita nesse pipeline quando uma futura entrega autorizada o utilizar.

## 6. Ações manuais no painel Vercel

Não é necessário enviar chave pelo chat. Realizar no painel autenticado de `siav2/siav-zlca`:

1. Em **Environment Variables**, verificar/configurar `VITE_SUPABASE_URL` com `https://lfcvjrshlybmurnvulvh.supabase.co` e `VITE_SUPABASE_PUBLISHABLE_KEY` com a chave **Publishable** habilitada do projeto SIAV, obtida de seu painel API Keys. Não usar secret/service_role. Se já existirem valores, conferir seu projeto antes de substituí-los.
2. Selecionar somente **Preview**, restringindo à branch **`fix/distribution-assets-pwa`** quando a interface oferecer filtro de branch. Não selecionar Production nem copiar valores para todos os ambientes. Opcionalmente declarar `VITE_SUPABASE_PROJECT_REF=lfcvjrshlybmurnvulvh`.
3. Confirmar que o projeto está ligado a `jhcruzdomingues/SIAV`, que a produção continua em `main` e que Root Directory é a raiz do repositório. Não mudar configurações globais que possam afetar produção. Se Root Directory estiver incorreto e não houver solução isolada, parar e planejar projeto de preview próprio antes de alterá-lo.
4. Em **Deployments**, selecionar a branch e o SHA desta entrega, com ambiente **Preview**. O push pode gerar uma tentativa automática; se faltar configuração, o build é bloqueado em vez de publicar configuração incorreta.
5. Depois de configurar as variáveis, fazer **Redeploy somente desse Preview**, reconstruindo com as variáveis novas. Não usar Promote to Production, domínio de produção, `main`, nem CLI com `--prod`.
6. Conferir log com Node 22, `npm ci`, `npm run build`, output `dist/` e status Ready. Se falhar, preservar a mensagem exata; não concluir que uma variável foi aplicada só porque foi salva no painel.
7. Usar **Visit** desse Preview e guardar sua URL. O domínio `siav-zlca.vercel.app` mostrado na captura é produção, não a nova prévia.

Proteção por login Vercel pode existir nos previews. Entrar com a conta autorizada no Safari, sem desabilitar globalmente a proteção ou publicar tokens de bypass. Esta sessão não alterou variáveis, domínio, Production Branch, permissões, site URL ou redirect allowlist do Supabase.

## 7. Testes executados e seus limites

| Verificação | Resultado local |
|---|---|
| `npm ci` com Node 22.23.4/npm 10.9.9 | Aprovado; 422 pacotes; sem dependências novas ou upgrades |
| `npm run test:run` | **219/219**, 17 arquivos: 195 anteriores e 24 regressões novas |
| `npm run build` com configuração pública verificada em ambiente ignorado | Aprovado; 41 arquivos, 1.191.202 bytes; referência antiga ausente do JS |
| `npm run test:distribution` | **6/6**, sem skips; build real e HTTP estático exclusivo de `dist/` temporário |
| SDK real, carregamento visitante e interface de login em Chromium mobile 13/SE | Aprovados; cliente aponta ao host correto, sem sessão e com backend bloqueado |
| Sintaxe JS/MJS e `git diff --check` | Aprovados |
| Políticas RLS, schema e dados de produção | Não consultados, modificados ou homologados |
| Teste HTTP real de Supabase | Bloqueado pelo proxy; não declarado aprovado |
| Painel Vercel/URL pública do novo preview | Previews do commit enviado falharam nos dois projetos; logs e variáveis exigem conferência manual acima |

As 24 novas regressões cobrem referência padrão, URLs incorretas/ambíguas, configuração ausente, rejeição de tipos de chave privilegiados/legados, mensagens sem valores, fábrica de cliente com opções padrão, referência explicitamente declarada, ausência de chave fixa, configuração Vercel e proteção dos arquivos locais.

O teste de distribuição foi ampliado para bloquear builds com chave ausente ou de servidor e conferir a criação única do cliente com destino esperado no carregamento visitante. Ele usa uma chave **sintética** e fixtures de SDK, sem sucesso de autenticação e sem chamadas de banco/pagamento. Seu build fica num `dist/` temporário, removido ao final; não sobrescreve o `dist/` local com a configuração real validada.

O CI da branch executa suíte, cobertura, lint e build com configuração sintética. `dist-ci-synthetic` **não é artefato para publicar ou configurar no preview**. O Vercel precisa do build próprio com suas variáveis Preview. Após envio, os três jobs de CI de `85f3577ae1b4861898598bf09151ddbd66b4d625` concluíram com sucesso: **Testes, Build e Lint**. Execução: <https://github.com/jhcruzdomingues/SIAV/actions/runs/42887043805>. O build é sintético e não é deploy. Essa execução verde de GitHub Actions não invalida a falha observada em Vercel nem confirma suas variáveis.

Permanecem os avisos de scripts clássicos fora do bundler (emitidos por allowlist explícita) e a chave CSS inesperada preexistente. CDN Supabase não foi fixado/vendorizado nesta entrega. Nenhuma dose, algoritmo, timer, FCT, regra de plano, pagamento, fila ou histórico foi modificado.

## 8. Testar no Safari do iPhone

Quando o Preview estiver **Ready** no SHA informado:

1. No Safari, abrir o painel Vercel autenticado, projeto `siav-zlca`, **Deployments**, filtrar esta branch e abrir **Visit** do deployment Preview correspondente. Não usar o endereço de produção da captura. Tudo pode ser feito no iPhone.
2. Confirmar a tela inicial como visitante; abrir engrenagem, tema claro/escuro e entrada de login, sem autenticar uma conta com registros reais.
3. Exercitar somente cenário sintético e o banco de questões. O offline básico continua limitado à página já aberta com assets carregados; não presumir inicialização a frio ou login offline.
4. Não executar checkout, salvar dados de paciente real ou interpretar acesso ao projeto como homologação de RLS.
5. Se a tela, asset ou build falhar, registrar a URL do Preview, o SHA, a etapa e a mensagem de erro, sem copiar chave, senha, token ou dados clínicos.

Foi usado Chromium com viewport/toque de iPhone, não Safari/WebKit nem aparelho físico. SDKs externos, expiração de sessão, instalação PWA, suspensão, áudio e armazenamento do Safari ainda precisam de validação específica. Não se promete continuidade de PCR após suspensão ou recarga.

## 9. Arquivos alterados e reversão

- `src/config/supabase.js`, `src/config/public-supabase.js`: configuração pública validada, sem chave fixa.
- `.env.example`, `.gitignore`: exemplo exclusivamente frontend e isolamento de arquivos locais/metadados Vercel.
- `vercel.json`, `vite.config.js`: comandos/output e bloqueio de configuração inválida.
- `package.json`, `package-lock.json`: Node 22.x; nenhuma versão de pacote alterada.
- `.github/workflows/ci.yml`: trigger desta branch e artefato sintético claramente identificado; workflow de produção intocado.
- `tests/public-supabase-config.test.js`, `tests/distribution/check.mjs`: regressões de configuração, inicialização e build/visitante.
- `docs/DELIVERY_5B_ENVIRONMENT_ALIGNMENT.md`: este documento. Nenhuma chave foi inserida aqui.

A configuração local ignorada não faz parte dos commits. Para reverter somente a implementação na branch, com árvore limpa:

```sh
git switch fix/distribution-assets-pwa
git revert 0d245b0f9660834c4ec4b4d61112bb4881cf5edb
npm ci
npm run test:run
npm run build
git diff --check
```

A reversão restaura a URL antiga incorreta e a chave fixa anterior, portanto não é recomendação de publicação. Não apaga arquivos de ambiente, dados, cache ou configurações de provedores. O documento pode ser preservado como histórico. Alterações manuais futuras em variáveis Preview devem ter rollback próprio no mesmo escopo; esta sessão não fez alterações no painel. Não executar reset destrutivo, force push, merge ou deploy de produção.
