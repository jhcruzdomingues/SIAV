# SIAV — Recuperação do cadastro e perfis

Data: 24/11/2026. Base de código: `c9c9770f9c11db216abc67295d1cb49cd7bbcfbd`.
Branch de trabalho: `fix/signup-profile-recovery`.

## Diagnóstico confirmado antes da correção

- O Preview informado enviou `POST /auth/v1/signup` ao projeto SIAV correto (`lfcvjrshlybmurnvulvh`).
- Logs entre 11h20 e 11h34 (America/Sao_Paulo) registram HTTP 500, código `unexpected_failure` e `relation "public.profiles" does not exist` (SQLSTATE `42P01`). O `25P02` posterior é consequência da transação abortada.
- O gatilho `on_auth_user_created` continua em `auth.users`, chamando `public.handle_new_user()`. A função tenta inserir um perfil em uma tabela ausente, abortando também a criação da conta.
- A consulta atual do catálogo não encontrou tabelas em `public`; `to_regclass('public.profiles')` retornou `NULL`. Havia quatro tabelas na leitura anterior desta sessão. Não há evidência suficiente para atribuir a alguém a mudança de estrutura.
- A contagem agregada atual de contas em `auth.users` é zero. Nenhum registro clínico ou senha foi consultado.
- O frontend transforma todos os erros de cadastro em uma mensagem genérica que manda conferir os dados. O formulário ainda informa mínimo de 6 caracteres, enquanto o mínimo configurado pelo usuário no Supabase é 8.

## Plano restrito

1. Recuperar somente `public.profiles`, com os campos já usados no formulário, carregamento e edição do perfil. Não recriar tabelas assistenciais, de simulações ou de casos nesta correção.
2. Preservar o gatilho de Auth, corrigir sua função com referências qualificadas e `search_path` restrito. Criar o perfil com os metadados descritivos fornecidos; ignorar qualquer plano/permissão enviado em metadados.
3. Ativar RLS com acesso apenas ao próprio perfil para usuários autenticados. Revogar permissões genéricas de visitantes; permitir edição apenas dos dados pessoais. O campo `plan` começa em `free` e não pode ser inserido ou editado pelo cliente.
4. Manter compatibilidade com o `upsert` atual do formulário. O e-mail informativo do perfil é preenchido pela rotina de Auth; sua coluna é anulável para que o `INSERT ... ON CONFLICT` do cliente, que não envia e-mail, possa atualizar o perfil existente sem violar um `NOT NULL` antes do conflito. O e-mail usado na autenticação continua sendo o de `auth.users`.
5. Abortar a migração se a tabela já existir ou o gatilho não corresponder ao estado inspecionado. Não sobrescrever uma estrutura que tenha sido restaurada por outra operação.
6. Alinhar o cadastro a 8 caracteres e traduzir erros por códigos conhecidos, sem exibir mensagens SQL, credenciais, dados pessoais ou inferir existência de conta.
7. Reproduzir a falha e testar a migração em PostgreSQL descartável, isolado, com dados sintéticos e sem portas públicas. Executar regressões, suíte completa, build e distribuição antes da verificação final no projeto.

## Limites

- Não executar o script consolidado antigo: ele inclui outras tabelas e políticas amplas, fora da correção do cadastro.
- Não alterar algoritmos clínicos, dados de PCR, preços, pagamentos, credenciais, confirmação por e-mail, SMTP ou URLs salvas pelo usuário.
- A criação da tabela não recupera registros históricos. As outras tabelas ausentes exigem investigação e plano de recuperação próprios.
- A migração não cria contas, não envia e-mails, não autentica pessoas e não faz backfill de usuários. A confirmação real pelo formulário precisará ser repetida pelo usuário depois da aplicação.
- O envio integrado de e-mails mantém as restrições de destinatários e limites do Supabase.

## Resultados

O diagnóstico e o plano foram registrados no commit `552e9b8`, antes das alterações funcionais.

| Verificação | Resultado |
| --- | --- |
| `npm run test:run -- --maxWorkers=2 --minWorkers=1` | **405/405**, 28 arquivos; preservados os 389 anteriores e adicionados 16 casos do cadastro. |
| `npm run test:database` | **11/11** em PostgreSQL 17 descartável; erro original reproduzido e reparo validado. |
| `npm run build` | Aprovado com configuração publicável sintética local, sem publicação do artefato de teste. |
| `SIAV_CHROMIUM_PATH=/usr/bin/chromium npm run test:distribution` | **18/18**, incluindo mensagens de erro e limite de 8 caracteres em Chromium mobile; sem backend, conta, sessão ou e-mail reais nos testes. |
| `git diff --check` | Sem erros. |

### Estado da aplicação no Supabase

**Aplicada em 24/11/2026, às 16h21 (America/Sao_Paulo), após autorização explícita do usuário.** A aplicação anterior havia sido bloqueada pela revisão automática por exigir aprovação do SQL e de seu escopo. Depois da autorização, o catálogo foi novamente conferido: a tabela ainda estava ausente, o gatilho correspondia ao esperado e não havia contas em Auth. Somente a migração revisada foi aplicada, pelo mecanismo de migrações do Supabase, com retorno de sucesso.

A migração está em `supabase/migrations/20261124192132_repair_missing_signup_profiles.sql`. Ela foi inicialmente criada com `supabase migration new` da CLI 3.3.0 sob a versão `20261124144808`; após a aplicação via MCP, seu nome local foi alinhado à versão efetivamente registrada no histórico remoto, `20261124192132`. O conteúdo SQL aprovado permaneceu idêntico (SHA-256 `428ceead395b88a3a4cf898c319aed4b8bab31a72a310ed43918ddc99986b8e6`). A CLI foi usada apenas localmente, sem vínculo ao projeto remoto. Seu diretório próprio de configuração foi colocado no workspace com `SUPABASE_HOME`; a configuração `HOME` do ambiente não foi alterada.

### Verificação no projeto ativo após a aplicação

- Confirmados `profiles`, RLS habilitada, três políticas vinculadas a `auth.uid()`, permissões de escrita limitadas às colunas pessoais e gatilho de atualização de `updated_at`.
- O gatilho de Auth foi preservado. Sua função continua `SECURITY DEFINER`, com proprietário `postgres`, `search_path=pg_catalog` e sem execução direta por `anon` ou `authenticated`. `supabase_auth_admin` mantém permissão de inserir em `auth.users`.
- Dois usuários exclusivamente sintéticos, com IDs aleatórios e e-mails `.invalid`, foram inseridos em uma transação revertida. Verificados criação de perfis, plano inicial `free` mesmo com metadado forjado, normalização de UF/data opcional, leitura apenas do próprio perfil, bloqueio de escrita no perfil alheio, compatibilidade do upsert parcial e bloqueio de mudanças de plano, e-mail e proprietário. Visitantes não conseguem ler perfis.
- A tentativa inicial de executar essa verificação como `supabase_auth_admin` foi recusada pelo próprio PostgreSQL (`42501`: a conexão de diagnóstico não pode assumir esse papel), antes de inserir registros. Não foram concedidas permissões adicionais. A verificação foi então executada pelo papel de diagnóstico, assumindo apenas `authenticated` e `anon` nos trechos de RLS. Isso valida o gatilho e as permissões, mas não substitui uma chamada real ao serviço de Auth.
- Depois do `ROLLBACK`, as contagens de contas em Auth e perfis continuaram **zero**. Nenhum e-mail, senha real, sessão ou conta persistente foi criado pelos testes.
- Os três avisos anteriores da função (search path mutável e execução por visitantes/autenticados) deixaram de aparecer. O advisor de desempenho retornou lista vazia. Permanece um [aviso de descoberta da tabela no esquema GraphQL por usuários autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0027_pg_graphql_authenticated_table_exposed), decorrente do `SELECT` necessário ao perfil. Descobrir a estrutura não comprova acesso às linhas de outros usuários; RLS foi verificada como descrito acima. A superfície GraphQL merece revisão própria, sem revogar o acesso necessário ao frontend nesta correção.
- `profiles` é a única tabela presente em `public`. As outras tabelas anteriormente observadas permanecem ausentes e não foram recriadas nesta entrega.

### Proteções verificadas no banco isolado

- O erro `42P01` aborta a inserção de Auth no estado anterior; a contagem de contas permanece zero.
- A recuperação cria um único perfil por inserção de Auth e conserva o gatilho existente.
- Nome, profissão, conselho/UF, telefone e data de nascimento são tratados como dados descritivos. Um `plan` forjado em metadados é ignorado e o perfil começa em `free`.
- Datas opcionais ausentes/inválidas não interrompem o cadastro; uma data bissexta válida é preservada.
- O usuário A não lê nem atualiza o perfil de B. RLS também rejeita mudança de proprietário e upsert em outro perfil.
- O upsert parcial já usado pela interface funciona e conserva e-mail e plano do perfil.
- O cliente não altera plano, e-mail informativo, datas de auditoria ou permissões; não recebe DELETE/TRUNCATE. Visitantes não leem perfis.
- As funções de gatilho têm `search_path` restrito e não ficam executáveis por `anon` ou `authenticated`.
- A migração aborta se o estado do gatilho não for o esperado ou se a tabela já existir, preservando dados e objetos não relacionados.

### Arquivos e execução dos testes

- `src/ui/auth-errors.js`, `src/ui/auth-profile.js`: tradução segura de códigos de erro de serviço, senha fraca, endereço inválido, destinatário não autorizado e limites de envio. Erros desconhecidos permanecem neutros quanto à existência de conta; mensagens SQL, tokens, senhas e detalhes brutos não são exibidos.
- `src/ui/registration-fields.js`, `index.html`: mínimo de 8 caracteres no cadastro, incluindo validação antes de chamar o SDK. Login de contas existentes não recebe essa nova restrição local.
- `tests/profile-auth.test.js`, `tests/distribution/profile-auth.mjs`: regressões do mínimo de senha, erros úteis, ausência de exposição de detalhes, preservação de campos e desbloqueio do botão sem autenticação simulada.
- `supabase/migrations/20261124192132_repair_missing_signup_profiles.sql`: recuperação restrita de perfis; aplicada após autorização explícita e conferida no projeto ativo.
- `tests/database/signup-profiles.mjs`, `package.json`: teste real de SQL em container PostgreSQL 17, com imagem oficial fixada por digest; sem portas, volumes ou rede externa durante a execução, usando apenas dados sintéticos e removendo o container no final.
- `.github/workflows/ci.yml`: inclusão desta branch e execução dos testes isolados de banco. O CI **não** acessa Supabase, não aplica migrações e não usa credenciais de produção. O workflow de deploy de produção não foi modificado.
- Este documento registra diagnóstico, escopo, resultados e pendências.

Nenhuma dependência npm nova foi adicionada. Para executar o teste SQL, são necessários Docker e acesso à imagem oficial na primeira execução; o download da imagem não recebe credenciais do Supabase.

Foi corrigida uma condição de corrida na inicialização do teste Docker: a checagem passou a aguardar o servidor PostgreSQL definitivo por TCP no loopback, em vez de aceitar o servidor temporário usado pela imagem na inicialização. O container continua sem portas publicadas e sem rede externa. Essa correção afeta somente a infraestrutura dos testes.

## Próximas verificações

1. Repetir o cadastro real pelo usuário, uma vez, com o e-mail autorizado da equipe e senha de pelo menos 8 caracteres; verificar entrega, confirmação e retorno ao app. Nenhum sucesso de autenticação ou entrega foi declarado sem essa observação. A URL de retorno salva pelo usuário permanece inalterada.
2. Investigar a recuperação das outras tabelas em etapa própria. O script consolidado antigo não representa integralmente os campos assistenciais atualmente usados pelo frontend e não deve ser executado indiscriminadamente.

## Reversão e limitações

O frontend pode voltar à branch anterior, preservada em `c9c9770f9c11db216abc67295d1cb49cd7bbcfbd`, ou receber `git revert` do commit de implementação desta correção. Isso não desfaz a migração já aplicada no Supabase.

Não apagar `profiles` para desfazer a mudança se contas já tiverem sido criadas. Preferir uma correção adicional revisada que preserve perfis e dados de Auth. A remoção da tabela voltaria a quebrar o gatilho de cadastro.

Os testes de permissões em PostgreSQL isolado e em transação revertida no projeto ativo não homologam todas as rotas/serviços. Safari físico, SMTP real, segurança clínica, persistência assistencial e isolamento offline não foram homologados nesta entrega. Previews que continuam no commit anterior manterão o aviso antigo de 6 caracteres e a mensagem genérica até o frontend atualizado ser adotado; o reparo de banco aplicado atende os consumidores desse mesmo projeto.
