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

A preencher após implementação e validação. O diagnóstico e o plano foram registrados antes das alterações funcionais.
