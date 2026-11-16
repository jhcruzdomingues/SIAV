# SIAV — Entrada mobile de atendimento

Data: 16/11/2026 (America/Sao_Paulo). Base: `53697b4e0f924f3c6cb3e1e2610ea855aa3e1049`.
Branch: `fix/patient-entry-mobile`.

## Solicitação e resultado

O usuário solicitou início mais rápido, campos opcionais em formulário único, remoção de “Dados adicionais”, padrão adulto quando a idade não é definida e botão vermelho pulsante. **O padrão adulto é uma alteração de seleção de entrada autorizada nesta solicitação, e não apenas uma mudança estética.**

- Adulto fica pré-selecionado e identificado como **Padrão**. O botão informa **INICIAR ATENDIMENTO ADULTO**. A seleção não é silenciosa: o operador pode trocar para **Outro / não definido**, e a ação passa a **INICIAR ATENDIMENTO**. Essa escolha manual é respeitada mesmo com idade vazia.
- A seleção de algoritmo continua independente da idade/peso digitados. Não se criam limiares pediátricos, classificação por puberdade nem um fluxo PALS. Idade/peso vazios permanecem **N/I**, sem gravar idade 30 ou peso 70 no paciente.
- Todos os campos do paciente são opcionais. Nome/identificação, idade, peso, sexo, alergias e comorbidades estão no mesmo formulário, sem `<details>` ou ramificação adicional. Valores inválidos, quando informados, continuam sujeitos à validação.
- Há uma única ação de início, que funciona com todos os campos vazios. O botão secundário redundante “Iniciar sem dados” foi removido da interface. Seu export global legado foi preservado para compatibilidade e regressões existentes.
- Botão vermelho com pulso de sombra lento, sem deslocamento ou escala do alvo. `prefers-reduced-motion` desativa a animação. O pulso também cessa quando a ação está desabilitada. Não modifica metrônomo, sons ou temporizadores clínicos.
- Cabeçalho compacto, cancelamento acessível, corpo rolável e ação de início fixa no rodapé do modal. Idade/peso usam grade `minmax(0, 1fr)`, campos com `min-width: 0` e espaçamento explícito.
- Na edição de atendimento ativo, o algoritmo existente é restaurado, a ação é **SALVAR ALTERAÇÕES**, azul e sem pulso. O controller não inicia outra PCR nessa edição. Submits repetidos durante o fechamento são ignorados, e reabrir restaura a ação.

## Diagnóstico verificado e limites

A complexidade anterior era verificável no HTML: seção recolhida de dados, duas ações de início e seleção inicial Outro/não definido. O teste novo reproduziu a divergência do formulário único antes da correção.

O relato de sobreposição no Safari **não foi reproduzido no Chromium** nas condições de base medidas: idade/peso tinham 10 px de intervalo em 320 px. A causa exata no aparelho permanece não confirmada. O layout foi reorganizado para remover dependência do tamanho intrínseco dos inputs, e o teste agora exige separação, ausência de corte e alcance do botão nas sete larguras. Não se declara correção física homologada sem reteste.

## Arquivos

- `index.html`: somente `patient-modal`; formulário inteiro, dados opcionais, seleção padrão visível, ação única e fechamento.
- `pcr-interface.css`: regras adicionais restritas ao modal, grade responsiva, cores e animação própria.
- `src/ui/patient.js`: estado visual novo/edição, texto da ação conforme seleção, restauração do botão e bloqueio de submissão repetida.
- `src/ui/events.js`: atualização do texto ao trocar algoritmo, substituindo o listener do botão redundante removido.
- `tests/patient-entry.test.js`: dez regressões novas do controller e do contrato HTML.
- `tests/distribution/patient-entry.mjs` e `tests/distribution/check.mjs`: ensaio mobile do artefato real em servidor HTTP que serve somente `dist/`.
- `tests/pcr-efficiency.test.js`, `tests/pcr-medications.test.js`, `tests/distribution/pcr-interface.mjs` e `tests/mobile-care-interactions.mjs`: adaptação das expectativas antigas ao padrão adulto e à ação única. A regressão de medicamentos mantém a verificação negativa de Outro/não definido, sem fallback adulto.
- `.github/workflows/ci.yml`: inclusão da branch no CI; workflow de produção preservado.
- Este documento e capturas em `docs/screenshots/patient-entry/`.

Comparação com a base confirmou HTML idêntico fora de `patient-modal`, preservação do CSS anterior e ausência de mudanças em `src/pcr/`, `src/protocols/`, configuração, serviços, Supabase, dependências/lockfile, service worker, Sons, Aparência e workflow de produção. Não houve merge, deploy de produção ou alteração de banco/credenciais.

## Verificação

Node 22.23.4 / npm 10.9.9, Chromium e Playwright já existentes. Sem dependências adicionais.

- `npm run test:run -- --maxWorkers=2 --minWorkers=1`: **283/283**, em 22 arquivos. Os 273 anteriores permanecem, com dez regressões adicionais.
- `npm run build`: concluído, usando configuração sintética local de verificação; esse artefato não é publicado. Variáveis remotas não foram alteradas.
- Ensaio novo isolado de distribuição: aprovado.
- Suíte completa `SIAV_CHROMIUM_PATH=/usr/bin/chromium npm run test:distribution`: **12/12 aprovados**, incluindo as onze verificações anteriores e o ensaio novo de entrada.
- `git diff --check`: sem erros.

O teste mobile cobre **320, 360, 375, 390, 414, 430 e 768 px**, em retrato e nos dois temas: todos os campos abertos, ausência de campos obrigatórios, grade sem sobreposição, rótulos sem corte, ação visível antes/depois de rolar, cor vermelha, pulso e movimento reduzido. Exercita início totalmente vazio, preservação de N/I, edição sem reinício de horário/episódio, seleção manual não adulta, encerramento sintético e novo formulário sem herdar dados anteriores.

Os testes unitários também verificam submissão duplicada, restauração da ação após início recusado, valores inválidos opcionais e escolha Outro com idade vazia ou sintética de 5 anos. As suítes existentes continuam cobrindo medicamentos, notas/histórico, ROSC/recorrência, temporização e FCT. O núcleo não foi modificado para satisfazer a nova interface.

Os contextos de navegador são descartáveis, sem sessão autenticada ou chamadas reais ao backend. O export de relatório é suprimido apenas na fixture do ensaio novo para encerrar seu atendimento sintético; a persistência/histórico continua sob as regressões existentes. Não se usam pacientes reais, pagamentos ou autenticação simulada na interface do produto. O script opcional de servidor Vite foi atualizado, mas a validação de navegador desta entrega usa a suíte de distribuição.

Os avisos conhecidos de scripts clássicos no build permanecem; os destinos públicos são verificados pela suíte. Logs locais em `/workspace/work/patient-entry-mobile/`.

## Capturas, riscos e reteste

- [Antes: 320 px, claro](screenshots/patient-entry/before-320-light.png).
- [Depois: 320 px, claro](screenshots/patient-entry/patient-320-light.png).
- [Formulário inteiro: 390 px, escuro](screenshots/patient-entry/patient-390-dark-fields.png).

As capturas vêm do artefato real do ensaio, sem injetar CSS para ocultar defeitos. Em alturas menores, o corpo rola; os campos não são recolhidos e o início permanece acessível.

**Limite clínico:** pré-selecionar Adulto não comprova que o paciente seja adulto nem valida elegibilidade pediátrica. O formulário passa a enviar Adulto por padrão, o que habilita as orientações adultas existentes. O operador precisa verificar/trocar o algoritmo apresentado. Revisão clínica dos critérios de seleção e dos percursos pediátricos permanece separada; não foram alteradas doses, protocolos ou funções de elegibilidade. Há interpretações legadas de idade/peso nos módulos clínicos, inclusive fallbacks, que não foram uniformizadas nesta entrega.

No Preview desta branch, conferir o SHA informado na entrega e tocar **Visit → Iniciar PCR** no Safari/Chrome mobile. Usar exclusivamente um cenário fictício: testar início vazio, troca de algoritmo, campos preenchidos, rolagem, pulso, movimento reduzido e edição de um caso sintético. O link do deployment anterior não recebe esta versão.

Emulação Chromium não homologa Safari físico, todos os modelos, texto ampliado ou teclado/barra dinâmica no aparelho. O pulso pode estar desativado pela preferência de movimento reduzido. A confirmação de Preview concluído é de implantação, sem alegar interação remota validada ou segurança clínica homologada.

## Reversão

Com árvore limpa, `git revert <SHA-da-entrega>` na branch dedicada e repetir testes, build e distribuição. Não apagar históricos/preferências, modificar banco ou reescrever histórico. CI e Preview após o push são conferidos e informados na entrega. Main, PR #2 e a branch anterior permanecem preservados.
