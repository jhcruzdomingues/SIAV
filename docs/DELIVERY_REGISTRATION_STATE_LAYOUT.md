# SIAV — UF do registro, botão e rodapé do cadastro

Data: 16/11/2026 (America/Sao_Paulo). Base: `fa3ab65831c5ddc4b624e2c998ba7f5957f70a18`.
Branch: `fix/registration-state-layout`.

## Resultado

- **UF ao lado do registro:** seletor local com as 27 UFs (26 estados e Distrito Federal), sem inferir o estado e sem consultar uma API. Número e UF permanecem lado a lado nas larguras testadas, com área de toque de pelo menos 44 px no seletor. Data de nascimento passa à linha seguinte.
- A escolha é obrigatória para as opções profissionais que exigem conselho. Estudante desabilita, limpa e deixa de exigir ambos os campos; mudar profissão ou resetar o formulário remove a seleção anterior.
- O usuário informa o número sem precisar escrever a UF. A solicitação de cadastro mantém `council_register` sem reformatá-lo e inclui a UF separadamente em `council_state`, nos metadados descritivos de Auth. Não foi criada coluna, migração ou escrita na tabela `profiles`.
- **CREFITO:** o campo mantém a identificação de número/região, com UF selecionada separadamente. Região não é deduzida da UF, pois um CREFITO pode abranger mais de um estado. A informação segue autodeclarada, sem consulta de regularidade ou mudança de permissões.
- **Cadastrar centralizado:** ícone e texto formam um grupo centralizado horizontal e verticalmente. O alinhamento também funciona durante o estado de envio.
- **Rodapé:** cadeado SVG local e texto discreto: “Seus dados de acesso são enviados por conexão segura (HTTPS).” A afirmação é limitada ao transporte HTTPS usado pela configuração existente; não promete segurança absoluta, certificação, conformidade LGPD ou proteção de armazenamento/RLS ainda não auditada. O ícone não depende de CDN.

## Causas e implementação

O registro tinha um campo único, cujo exemplo pedia UF/região no próprio texto. A configuração de profissão agora também habilita e valida o seletor de UF, e os exemplos deixam de pedir um estado digitado. O registro e a UF são armazenados como informações distintas, sem atribuir um valor geográfico a partir da profissão.

O botão herdava o alinhamento de estilos genéricos. Um grupo interno e seletores específicos centralizam o conteúdo sem modificar os outros botões do aplicativo. O rodapé usa cores do tema e não executa ações ou consultas.

## Arquivos alterados

| Arquivo | Finalidade |
|---|---|
| `index.html` | Campo UF, organização das linhas, conteúdo do botão e aviso com cadeado |
| `src/ui/registration-fields.js` | Lista de UFs, validação e limpeza/desabilitação |
| `src/ui/auth-profile.js` | Inclusão da UF nos metadados descritivos, somente quando habilitada |
| `src/ui/events.js` | Limpeza do erro quando a UF é corrigida |
| `pcr-interface.css` | Layout lado a lado, centralização e rodapé responsivo |
| `tests/profile-auth.test.js` | Seis regressões novas e ajustes dos cenários de cadastro profissional |
| `tests/distribution/profile-auth.mjs` | Geometria, toque, centralização e rodapé nos dois temas |
| `.github/workflows/ci.yml` | Inclusão da branch no CI; workflow de publicação preservado |
| `docs/screenshots/registration-state/*.png` | Duas capturas sintéticas, fora do artefato do aplicativo |
| `docs/DELIVERY_REGISTRATION_STATE_LAYOUT.md` | Este relatório |

## Verificação

- **266 testes em 19 arquivos aprovados**, preservando os 260 anteriores e acrescentando seis regressões. Antes da implementação, o arquivo de autenticação teve 13 falhas e 26 aprovações, incluindo os cenários afetados pela ausência de UF.
- **9 testes de distribuição aprovados**, sem falhas ou skips, incluindo os percursos anteriores de PCR/PWA/offline básico. O roteiro de conta verifica as sete larguras CSS 320, 360, 375, 390, 414, 430 e 768, em retrato e nos dois temas, com Chromium mobile emulado.
- `npm run build`, sintaxe JS/MJS e `git diff --check`: aprovados.
- Testes de UF ausente, envio separado de número/UF, Estudante, troca/reset, preservação da região CREFITO e presença do cadeado/texto sem promessa absoluta.
- No navegador, as caixas de número e UF têm alinhamento verificado por coordenadas; o grupo do botão é comparado ao centro do botão, e não somente à declaração CSS.
- Nenhuma conta real, e-mail ou registro remoto foi criado/consultado/alterado nos ensaios. As respostas SDK são simuladas e o tráfego externo é bloqueado.
- Nenhuma alteração em protocolos, cálculos, medicamentos, tempos, registros clínicos, SDK/configuração Supabase, schema/RLS, pagamentos ou dependências. Main, PR #2 e branches de Preview anteriores não são alterados.
- Teclado e seletor nativo em Safari/Android físicos continuam pendentes de reteste. Configuração HTTPS não comprova por si só segurança das políticas do banco. O espelhamento de metadados na tabela `profiles` permanece fora deste escopo.

Logs locais: `/workspace/work/registration-state/{before,targeted,tests,distribution,build}.log`. O CI e a implantação automática são conferidos após o push e informados na entrega; este relatório não toma build local como prova de publicação.

## Capturas

- [Registro e UF, 390 px, escuro](screenshots/registration-state/registration-390-dark-crm.png).
- [Botão centralizado e rodapé com cadeado, 390 px, claro](screenshots/registration-state/registration-submit-security.png).

São imagens do ensaio real em posições de rolagem selecionadas, sem injeção de layout para esconder problemas. O convite temporário pode estar visível. Dados são vazios ou sintéticos; ícones externos podem não renderizar no ambiente isolado, enquanto o cadeado SVG permanece disponível.

## Reteste e reversão

No projeto Vercel `siav`, abrir o deployment Preview da branch desta entrega e conferir o SHA informado na resposta. Usar Visit em Safari/Chrome mobile, em retrato. Testar UF ao lado do registro, seleção e troca de profissão/Estudante, botão e rodapé. Não usar o deployment antigo para procurar esta mudança.

Com árvore limpa, `git revert <SHA-da-entrega>` na branch dedicada reverte a alteração de forma rastreável. Executar testes/build/distribuição antes de qualquer integração futura. Não reescrever histórico, promover produção ou modificar banco para validar o layout.
