# SIAV — refinamento do cadastro e engrenagem

Data: 16/11/2026 (America/Sao_Paulo). Base: `abaa4eb35899b12606c9e6e13a09c69a513ad7f7`.
Branch: `fix/registration-validation-professions`.

## Mudanças

1. **Confirmar senha:** campo obrigatório, comparado exatamente com Senha antes de chamar o SDK. Senhas diferentes ou confirmação vazia impedem a solicitação. Corrigir o campo libera nova tentativa. A confirmação não é enviada ao Supabase, salva em metadados ou registrada em logs.
2. **Convite de cadastro:** texto **CRIE UMA CONTA É RÁPIDO E GRÁTIS! 😉**, fundo verde claro, borda verde escura e texto escuro. Mantém os seis segundos e não recebe foco nem intercepta toques. O emoji é uma expressão de piscadela estática; não foi criada animação. Avisos de erro de login mantêm seu tratamento vermelho.
3. **Engrenagem do cabeçalho:** emoji substituído por SVG local de 22 px, em botão neutro de 44 × 44 px, com borda discreta e contraste nos dois temas. Nome acessível, ID, posição e abertura do menu preservados, sem dependência de fonte/CDN para esse ícone.
4. **Profissão:** lista predefinida no cadastro, com escolha explícita obrigatória. O registro adapta rótulo, exemplo e instrução ao conselho. A troca de profissão limpa o registro anterior. Estudante desabilita o campo, retira sua obrigatoriedade e omite o registro da solicitação.

| Profissão/status | Campo solicitado |
|---|---|
| Médico(a) | CRM |
| Enfermeiro(a) | COREN |
| Técnico(a) de Enfermagem | COREN, categoria TE no exemplo |
| Auxiliar de Enfermagem | COREN, categoria AE no exemplo |
| Fisioterapeuta | CREFITO |
| Cirurgião-dentista | CRO |
| Estudante | Desabilitado; registro não exigido |

A lista é uma classificação cadastral inicial brasileira. Não valida habilitação, regularidade no conselho, competência para procedimento ou atuação independente de estudante; não altera permissões, planos, algoritmos ou doses. Registro profissional é texto autodeclarado obrigatório para as opções reguladas, sem consulta externa ou validação oficial de formato/regularidade. Inclusão de outras categorias exige revisar o cadastro, sem tratar profissão como autorização clínica.

O campo de profissão de perfis já existentes e a configuração remota de `profiles` não foram migrados. Os dados continuam seguindo o contrato de metadados descritivos implementado na entrega anterior. O espelhamento completo desses metadados na tabela de perfis não foi alterado nem homologado nesta entrega.

## Causas e correções

- Havia apenas um campo de senha no cadastro: inclusão de confirmação e validação nos eventos de entrada e no submit, com teste de bloqueio antes da chamada remota.
- A engrenagem era um caractere Unicode, cuja aparência depende da fonte/plataforma. SVG e dimensões fixas removem essa variação sem depender do modelo de aparelho.
- Na revisão da primeira implementação, a classe genérica `settings-icon` colidia com os cartões legados e aplicava fundo azul, tinta branca, margem e sombra ao SVG. O ícone do cabeçalho usa agora `settings-gear-icon`, isolado desses cartões. Uma regressão de navegador falhou antes dessa correção e passou a verificar tinta herdada, fundo transparente e ausência de sombra no SVG.
- O convite compartilhava a cor dos erros: identificação de tom `invite` separa a apresentação verde do erro vermelho, preservando os alertas existentes.
- Profissão era texto livre e o registro tinha exemplo fixo de CRM: configuração única no módulo UI popula a lista e adapta o conselho, incluindo a condição de Estudante.
- Erros de validação são limpos quando a entrada é corrigida. Reset do formulário restaura seleção vazia, registro desabilitado e confirmação sem erro antigo.

## Arquivos

| Arquivo | Finalidade |
|---|---|
| `index.html` | SVG, texto do convite, select e confirmação de senha |
| `src/ui/registration-fields.js` | Lista descritiva, associação de conselho e validações de campos |
| `src/ui/auth-profile.js` | Bloqueio do envio inválido, limpeza das senhas e tom do aviso |
| `src/ui/events.js` | Inicialização e listeners de profissão, senha e reset |
| `pcr-interface.css` | Ícone, select, campo desabilitado e convite verde |
| `tests/profile-auth.test.js` | Regressões de confirmação, conselho, Estudante e preservação do estado clínico/plano |
| `tests/distribution/profile-auth.mjs` | Roteiro em retrato ampliado para os novos controles |
| `.github/workflows/ci.yml` | Inclusão desta branch no disparo de CI; workflow de publicação preservado |
| `docs/screenshots/registration-refinement/*.png` | Cinco capturas sintéticas selecionadas, fora do pacote do aplicativo |
| `docs/DELIVERY_REGISTRATION_REFINEMENT.md` | Este relatório |

## Validação

- **260 testes em 19 arquivos**, aprovados: preservados os 244 anteriores e adicionadas 16 regressões. Na verificação anterior à implementação, 16 casos falharam e 15 passaram no arquivo de autenticação, reproduzindo os requisitos ausentes.
- **9 testes de distribuição**, aprovados, sem falhas ou skips: inclui confirmação diferente sem chamada ao SDK, correção liberando uma única tentativa, conselho/Estudante, SVG e tom verde, além dos percursos anteriores de PWA, offline básico e PCR.
- Roteiro de conta: Chromium com toque e perfil mobile, larguras CSS 320, 360, 375, 390, 414, 430 e 768 em retrato, claro e escuro. Verifica controles, geometria, contraste, ausência de overflow horizontal e operação dos formulários. Não equivale a teste físico de Safari/Android.
- `npm run build`, sintaxe dos módulos e `git diff --check` aprovados.
- Comparação com a base confirmou preservação de núcleo PCR, protocolos, cálculos, temporizadores, armazenamento clínico, SDK/configuração, schema/RLS, pagamentos, dependências/lockfile e workflow de publicação.
- Nenhuma conta real foi criada, nenhum e-mail enviado e nenhum dado remoto consultado/escrito pelos testes. SDKs usam fixtures e a rede externa é bloqueada nos ensaios de distribuição.
- A primeira execução de distribuição falhou por seletor de captura ambíguo (`header` também encontrava o cabeçalho do modal de planos); o seletor passou a apontar ao cabeçalho direto do aplicativo. Não era falha do fluxo do app.

Logs locais em `/workspace/work/registration-refinement`: `tests.log`, `release-distribution.log`, `release-build.log`, `before.log` e `gear-collision-before.log`. CI e implantação automática devem ser conferidos após o push; os resultados remotos são informados na entrega.

## Capturas selecionadas

- [Engrenagem, 320 px, claro](screenshots/registration-refinement/settings-320-light.png).
- [Convite verde, detalhe](screenshots/registration-refinement/registration-invite-green.png).
- [Cadastro de médico com CRM, 390 px, escuro](screenshots/registration-refinement/registration-390-dark-crm.png).
- [Estudante com registro desabilitado, 390 px, escuro](screenshots/registration-refinement/profile-390-dark-register.png).
- [Senha e confirmação, exemplo sintético em 768 px](screenshots/registration-refinement/registration-password-confirm.png).

As capturas mostram estados reais dos ensaios, inclusive o convite temporário quando presente. O erro no último exemplo é a resposta controlada do SDK bloqueado do teste, e não uma tentativa de criar conta real. Conteúdo abaixo do viewport exige rolagem vertical; não se declara que o formulário inteiro caiba numa tela curta. Fontes/ícones externos podem não aparecer no ensaio isolado; a nova engrenagem SVG independe deles.

## Reteste e reversão

No projeto Vercel `siav`, localizar o deployment Preview desta branch e o SHA da entrega; abrir Visit no Safari/Chrome mobile em retrato. Conferir a engrenagem, o convite, cada profissão, Estudante e erro/correção da confirmação. A abertura do seletor e o teclado/autofill de aparelhos reais continuam pendentes de reteste. Usar dados sintéticos e ambiente apropriado para qualquer envio de cadastro.

O Preview anterior continua em sua referência: não procurar esta mudança no deployment antigo. Não alterar Production Branch, main, PR #2, Supabase ou planos para validar a interface.

Para reverter, com árvore limpa, aplicar `git revert <SHA-da-entrega>` na branch dedicada e executar testes/build/distribuição. Isso restaura o comportamento anterior, inclusive os campos sem confirmação/adaptação; não reescrever histórico nem promover uma reversão automaticamente à produção.

## Referências dos conselhos

Consultadas apenas para associação cadastral, sem consulta de usuários/inscrições:

- [CFM — normas sobre registro CRM](https://portal.cfm.org.br/buscar-normas-cfm-e-crm/).
- [Cofen — normas administrativas de inscrição e categorias](https://www.cofen.gov.br/resolucao-cofen-no-769-de-26-de-novembro-de-2024/).
- [COFFITO — registro profissional no CREFITO](https://www.coffito.gov.br/nsite/?p=2765).
- [CFO — inscrição no CRO](https://website.cfo.org.br/etica-para-cirurgioes-dentistas-recem-formados-principais-pontos-de-atencao/).
