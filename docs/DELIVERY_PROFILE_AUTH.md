# SIAV — Perfil: login e cadastro separados

Data: 16/11/2026 (America/Sao_Paulo). Base: `fdd4ea472e36f4cbdb2e2b552045d8eefba9cb9e`.
Branch dedicada: `fix/profile-auth-separation`.

## Comportamento entregue

- O Perfil preserva sua estrutura visual e oferece **FAZER LOGIN** e **CRIAR LOGIN** como ações distintas.
- Criar login abre o formulário de cadastro existente, sem criar conta nessa abertura. A mensagem solicitada aparece em um aviso com fundo vermelho claro, borda vermelha escura e texto escuro: **VOCÊ AINDA NÃO TEM UMA CONTA, CRIE UMA CONTA AGORA, NÃO CUSTA NADA!**
- O aviso desaparece após seis segundos; não recebe foco nem impede toques. A conta só é solicitada após o envio explícito do formulário de cadastro.
- Erro genérico de credenciais mantém o login aberto, mostra aviso vermelho temporário e mensagem persistente para conferir e-mail/senha ou escolher Criar login. Não afirma que o usuário não possui conta, não o redireciona compulsoriamente e não faz signup após um login recusado.
- O cadastro permite voltar ao login, sem modais sobrepostos. Senhas não são copiadas da tentativa de login para o cadastro.
- Repetições enquanto há uma solicitação de autenticação pendente são ignoradas, e os controles ficam desabilitados até sua conclusão. Erros liberam a nova tentativa.
- Cadastro sem sessão autenticada mostra orientação de confirmação por e-mail e mantém o usuário deslogado; não há sucesso de autenticação fabricado.
- Os campos existentes do cadastro são encaminhados como metadados descritivos permitidos: nome, profissão, registro profissional, telefone e nascimento quando preenchidos. Não há envio de plano, papel ou permissão. Isso não garante que todos esses campos estejam espelhados em `profiles`; o contrato remoto dessa tabela permanece uma pendência própria.

## Limite do pedido de distinguir conta inexistente de senha errada

A documentação do `signInWithPassword` informa que o erro pode não distinguir conta inexistente, combinação incorreta de credenciais ou acesso exclusivo por provedor social. Portanto, o frontend atual não dispõe de uma indicação confiável para redirecionar **somente** quem não tem conta.

O usuário pediu a distinção explícita e perguntou pela melhor solução. A recomendação comunicada foi preservar a proteção atual, separar as ações e orientar a correção das credenciais/cadastro. Não foi implementada consulta pública de e-mails, uso de chave administrativa no navegador ou tentativa de signup para descobrir se a conta existe.

Recuperação de senha por e-mail é a evolução recomendada em entrega própria, incluindo revisão do retorno entre Preview/produção. Se a distinção explícita for requisito obrigatório, será preciso definir uma política de privacidade e um fluxo no servidor, preferencialmente após comprovar controle do e-mail, com proteção contra abuso. Nenhum desses serviços, configuração de Auth ou mecanismo de recuperação foi criado nesta entrega.

## Causas identificadas

1. O botão antigo se apresentava como login/cadastro, e o handler UI oferecia registrar ao receber `Invalid login credentials`. O serviço legado de login também tentava `signUp` automaticamente. Isso confundia intenção de entrada e criação de conta e interpretava um erro ambíguo como ausência de cadastro.
2. `profile-update-form` era um DIV dentro de `login-form`. A sonda DOM confirmou que Atualizar perfil pertencia ao formulário de login. Os formulários agora são independentes, com listeners próprios.
3. O cadastro ignorava os campos descritivos coletados pelo formulário. Eles agora acompanham a solicitação explícita como metadados; não são usados para autorização.
4. A inspeção visual revelou falta de espaço reservado ao fechamento do Perfil, contraste insuficiente no botão secundário e campos comprimidos em colunas estreitas. As correções são restritas aos três modais de conta e preservam o restante da interface.

## Arquivos

| Arquivo | Alteração |
|---|---|
| `index.html` | Ações distintas, formulários independentes, feedback acessível, autocomplete e aviso temporário |
| `src/ui/auth-profile.js` | Navegação entre login/cadastro, erro sem enumeração, proteção contra repetição, sessão exigida e metadados descritivos |
| `src/services/auth.js` | Remoção do signup automático do serviço legado de login |
| `src/ui/events.js` | Listeners explícitos das entradas de autenticação |
| `pcr-interface.css` | Apresentação dos controles de conta, aviso vermelho, contraste e campos responsivos |
| `tests/profile-auth.test.js` | Regressões de fluxo, chamadas SDK, repetição, sessão, mensagens e submit do perfil |
| `tests/distribution/profile-auth.mjs` | Interação real em Chromium em retrato, temas, geometria, contraste, aviso e erros com transporte simulado |
| `tests/distribution/check.mjs` | Integração do novo roteiro à suíte existente |
| `.github/workflows/ci.yml` | Inclusão apenas da branch no disparo de CI; workflow de publicação preservado |
| `docs/screenshots/profile-auth/*.png` | Capturas sintéticas para revisão; não entram no pacote do aplicativo |
| `docs/DELIVERY_PROFILE_AUTH.md` | Este relatório |

## Validação e limites

- Os primeiros 13 testes de regressão falharam antes da correção. A matriz foi ampliada durante a definição do aviso e da política de erro.
- **244 testes unitários aprovados**, em 19 arquivos: 227 anteriores e 17 novos.
- **9 testes de distribuição aprovados**, sem falhas ou skips, incluindo os 8 anteriores e o novo roteiro de conta. Logs finais de trabalho: `verified-tests.log`, `verified-distribution.log` e `verified-build.log` em `/workspace/work/profile-auth`.
- Build local e build temporário da distribuição; sintaxe JS/MJS e `git diff --check`.
- Novo roteiro: larguras CSS **320, 360, 375, 390, 414, 430 e 768**, em retrato, claro e escuro, com interação por toque em Chromium. Testa abertura de formulário, retorno, erros controlados, contraste dos botões, espaço do fechamento, ausência de overflow e duração real do aviso.
- Uma asserção visual nova falhou na versão intermediária antes da correção do cabeçalho; esse cenário fica protegido no roteiro de distribuição.
- Nenhuma conta foi criada, nenhum e-mail foi enviado e nenhum registro remoto foi consultado/alterado pelos testes. Sessões de testes unitários são fixtures; os roteiros de distribuição permanecem visitantes e simulam apenas erros do SDK, bloqueando a rede externa.
- Não houve alteração de SDK/dependências/lockfile, configuração Supabase, schema, RLS, credenciais, produção, protocolos, medicamentos, registros clínicos ou cálculos/temporizadores. Comparação com a base confirmou preservação dos módulos clínicos e do workflow de publicação.
- Safari e Android físicos ainda precisam de reteste do novo Preview. Teclado real, preenchimento automático e VoiceOver/TalkBack não são homologados por esta execução. Os ícones externos podem não aparecer nas capturas isoladas porque o CDN é bloqueado no ensaio; o frontend não recebeu substituição de fontes.
- O CI remoto e a implantação automática de Preview precisam ser conferidos após o push; este relatório não usa testes locais como prova de implantação.

## Capturas

| Condição | Login | Cadastro com aviso temporário |
|---|---|---|
| 320 px, claro | [Abrir](screenshots/profile-auth/profile-320-light-login.png) | [Abrir](screenshots/profile-auth/profile-320-light-register.png) |
| 320 px, escuro | [Abrir](screenshots/profile-auth/profile-320-dark-login.png) | [Abrir](screenshots/profile-auth/profile-320-dark-register.png) |
| 390 px, claro | [Abrir](screenshots/profile-auth/profile-390-light-login.png) | [Abrir](screenshots/profile-auth/profile-390-light-register.png) |
| 390 px, escuro | [Abrir](screenshots/profile-auth/profile-390-dark-login.png) | [Abrir](screenshots/profile-auth/profile-390-dark-register.png) |

[Aviso vermelho temporário, 390 px](screenshots/profile-auth/profile-390-dark-notice.png).

## Reteste no aparelho e reversão

No projeto Vercel remanescente `siav`, selecionar em Deployments o Preview desta branch e o SHA informado na entrega. Abrir Visit no Safari/Chrome mobile, em retrato, e testar Perfil -> Fazer login / Criar login -> formulário -> Voltar. Não usar o Preview antigo `fdd4ea4` para verificar esta mudança. O nome histórico `siav-zlca` em URLs de deployments existentes não altera a referência de código.

Contas e autenticação reais dependem do backend/configuração existente. Não criar dados reais de pacientes durante o ensaio. Não promover à produção nem modificar Supabase para validar a interface.

Reversão: com árvore limpa, aplicar `git revert <SHA-da-entrega>` na branch dedicada, executar suíte/build/distribuição e revisar. Não reescrever histórico nem modificar main ou PR #2. O revert restaura também os defeitos corrigidos; não é recomendação de publicação.

Referências consultadas: [changelog](https://supabase.com/changelog.md), [signInWithPassword](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [signUp](https://supabase.com/docs/reference/javascript/auth-signup). Nenhuma atualização relevante de SDK foi aplicada.
