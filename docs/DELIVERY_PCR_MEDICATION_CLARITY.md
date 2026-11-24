# SIAV — Clareza e alertas no registro de medicações

Data: 24/11/2026 (America/Sao_Paulo). Base conferida: `ed6eb7146d8371809a735d8f28388b6fffe6d751`.
Branch: `fix/pcr-medication-clarity-alerts`. Main, PR #2 e branch anterior de Preview preservados.

## Plano e diagnóstico antes da implementação

- O formulário abre automaticamente todos os controles avançados quando a dose não é elegível ou ainda está vazia. Isso mistura seleção, aviso clínico, unidade, horário e revisão manual, aumentando a rolagem e a carga de leitura.
- Dose e via usam estruturas diferentes (`label` e `fieldset/legend`) sem uma linha de controles uniformemente alinhada. Os testes anteriores verificavam corte individual e largura total, mas não alinhamento entre controles nem o estado de revisão manual mostrado no print.
- A unidade começa sempre em mg, inclusive ao escolher bicarbonato ou magnésio. A seleção deve usar somente a unidade já existente no catálogo, sem criar novas doses.
- Amiodarona já possui 300 mg na primeira dose e 150 mg na segunda. O preenchimento automático depende do avaliador adulto, do passo clínico e do histórico confiável. Falta de dados não autoriza inferir indicação nem primeira dose.
- A mensagem de falta de indicação é apresentada como texto comum e extenso. Deve se tornar um aviso visível, curto e persistente enquanto a situação existir, distinguindo dose não indicada, informação insuficiente e indicação específica não avaliada pelo aplicativo.

## Escopo autorizado

1. Reorganizar o modal em seleção, dose/via, revisão manual quando necessária e confirmação única. Manter controles avançados recolhidos até abertura explícita pelo usuário, sem esconder a revisão obrigatória.
2. Destacar a primeira/segunda dose da amiodarona somente quando o avaliador existente a autorizar. Não mudar doses, sequência, intervalos, associação de antiarrítmicos, critérios clínicos ou pediatria.
3. Transformar a mensagem da seleção em aviso acessível quando não houver indicação automática. Dados desconhecidos devem aparecer como indicação não verificável, nunca como certeza de ausência de indicação ou dose autorizada.
4. Conservar registro manual da administração efetiva com revisão explícita, rastreabilidade e deduplicação. Selecionar não administra nem registra. Não impedir a documentação de um fato ocorrido confundindo-a com recomendação terapêutica.
5. Identificar medicamentos ausentes com o usuário antes de criar novos esquemas. Não promover medicamentos de situações especiais a rotina de PCR. A lista inicial permanece com seis opções até essa definição.
6. Cobrir primeira e segunda dose, ausência de terceira sugestão, mistura de antiarrítmicos, histórico incerto, pediatria, alertas, unidade e layout em retrato nos temas claro/escuro; executar suíte, build e distribuição.

## Fontes da conferência

- [AHA 2025 — algoritmo de PCR adulto](https://cpr.heart.org/-/media/CPR-Files/CPR-Guidelines-Files/2025-Algorithms/Algorithm-ACLS-CA-250527.pdf): doses de amiodarona de 300 mg e 150 mg, no percurso FV/TV sem pulso refratária. A oportunidade continua sendo determinada pelo avaliador existente, não por contagem isolada de choques.
- [AHA 2025 — suporte avançado adulto, medicamentos não vasopressores](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-advanced-life-support): cálcio, bicarbonato e magnésio não são recomendados de rotina; circunstâncias especiais exigem avaliação própria. Essa conferência não acrescenta doses ou protocolos ao aplicativo.

## Limites

Não alterar Supabase, autenticação, dados persistidos, cronômetros, FCT, choques, algoritmos, pagamentos, produção ou branches preservadas. Somente dados sintéticos nos testes. Chromium emulado não homologa Safari físico nem segurança clínica. O problema das demais tabelas ausentes no Supabase continua separado desta entrega.

## Implementação

O plano foi registrado em `ba55c8d` antes das mudanças funcionais. O avaliador em `src/protocols/medical.js`, seus critérios e suas doses permaneceram inalterados.

| Causa verificada | Comportamento corrigido |
| --- | --- |
| Campos avançados abertos automaticamente em contexto incerto ou dose vazia | Unidade, horário anterior e via fora do algoritmo ficam recolhidos até abertura explícita. A revisão manual obrigatória foi movida para junto da dose, sempre acessível quando necessária. |
| Alturas e estruturas diferentes para dose e via | Rótulos e controles alinhados; EV/IO com alvos de toque de pelo menos 44 px. Dose e unidade não invadem a coluna da via. |
| Rodapé fixo deixa parte dos controles fora da área visível em tela baixa | Após seleção deliberada, revelar o painel completo de dose/revisão pela rolagem interna. Atualizações dos cronômetros e digitação não movimentam a tela. Cabeçalho e confirmação continuam acessíveis. |
| Texto clínico longo apresentado como descrição comum | Um único aviso curto, com fundo e borda de alerta, `role="alert"` e anúncio acessível, persistente enquanto o contexto existir. Não repetir o mesmo texto em cada atualização do relógio. |
| Dose e esquema repetidos em vários pontos | Amiodarona elegível mostra “1ª dose” ou “2ª dose”, quantidade no campo e unidade ao lado. A confirmação resume nome, dose e via. Adrenalina elegível não repete uma descrição numérica acima do campo. |
| Unidade mg reaproveitada para todas as opções | A seleção aplica a unidade já existente no catálogo: mg para adrenalina/amiodarona/lidocaína/atropina, mEq para bicarbonato e g para sulfato de magnésio. Isso não cria quantidade nem indicação para as opções manuais; edição explícita continua disponível. |
| Realce nativo temporário de toque interfere na aparência selecionada | Desativar o realce de toque apenas nos botões destes formulários; preservar o foco visível e a seleção explícita. |

### Segurança e fluxo

- Amiodarona adulta: preencher **300 mg** somente na primeira oportunidade autorizada pelo avaliador; **150 mg** somente na segunda oportunidade válida e com histórico consistente. Não usar contagem isolada de choques, não repetir no mesmo passo de RCP, não preencher uma terceira dose e não associar automaticamente a lidocaína.
- Seleção sem indicação no passo atual gera aviso imediato. Histórico incompleto, protocolo não adulto e outras incertezas geram indicação **não verificada**, sem converter ausência de informação em contraindicação ou dose autorizada.
- Atropina continua identificada como não rotineira na PCR. Bicarbonato e magnésio permanecem com aviso de uso específico e indicação não verificada pelo app. Não foram criados avaliadores para essas situações.
- Uma escolha nunca grava administração. Fora do padrão, o operador informa a quantidade real e revisa explicitamente o registro. A gravação conserva ID, dose, unidade, via, horário efetivo, horário do registro, episódio e contexto; toques repetidos na mesma operação não duplicam o fato.
- Trocar a seleção limpa revisão e dose anteriores. Edição manual de unidade não é sobrescrita pelo relógio. Contexto alterado invalida a confirmação anterior e atualiza o aviso; não converte silenciosamente a dose antiga em registro rápido autorizado.
- A lista permanece com os seis medicamentos existentes. Foi solicitada ao usuário a relação dos itens ausentes para auditoria individual. Cálcio, trombolíticos e outras drogas de circunstâncias específicas não foram acrescentados como rotina nem receberam doses inventadas.

### Arquivos alterados

- `index.html`, `pcr-interface.css`: disposição, alinhamento, revisão manual fora dos campos avançados, estados de aviso e toque/rolagem.
- `src/pcr/medications.js`: apresentação curta do resultado do avaliador existente, unidades do catálogo e revelação do painel após seleção.
- `tests/pcr-medications-post-rce.test.js`: 22 novas regressões para primeira/segunda dose, nenhuma terceira sugestão, intervalo/ciclo, ausência de indicação, revisão manual, troca de seleção, unidades, pediatria, histórico e mudanças de contexto.
- `tests/pcr-medications.test.js`, `tests/pcr-efficiency.test.js`: atualizar expectativas de apresentação preservando verificações de dose, faixa por peso, ausência de seleção automática da quantidade e consistência com o avaliador.
- `tests/distribution/pcr-medication-clarity.mjs`, `tests/distribution/check.mjs`: cenário novo contra build real servido exclusivamente de `dist/`, sem backend real; doses percorridas pelo fluxo de ritmo/choque e verificação de geometria, aviso, contraste e toque.
- `.github/workflows/ci.yml`: somente inclusão da nova branch no CI. O workflow de produção não foi alterado.
- Este documento e capturas sintéticas em `docs/screenshots/pcr-medication-clarity/`.

## Validação

| Verificação | Resultado |
| --- | --- |
| `npm run test:run -- --maxWorkers=2 --minWorkers=1` | **427/427**, 28 arquivos; 405 casos anteriores preservados e 22 adicionados. |
| `npm run test:database` | **11/11**, em PostgreSQL descartável, sem conexão com Supabase. |
| `npm run build` | Concluído com chave publicável sintética; artefato local não publicado. |
| Cenário novo de interação Chromium | Aprovado em 320, 360, 375, 390, 414, 430 e 768 px, retrato, claro/escuro. Avisos com contraste de pelo menos 4,5:1; controles sem sobreposição; painel revelado sem corte pelo rodapé. |
| `SIAV_CHROMIUM_PATH=/usr/bin/chromium npm run test:distribution` | **19/19**, sem falhas ou cenários ignorados; 18 anteriores preservados e um novo cenário completo. Servidor HTTP estático exclusivo de `dist/`, SW real e dependências externas de serviço isoladas por mocks. |
| `git diff --check` | Sem erros. |

O cenário novo percorre AESP → ramo chocável → passo 8; registra amiodarona 300 mg, verifica bloqueio de repetição no mesmo passo, alcança nova oportunidade e registra 150 mg. Confere duas operações distintas, metadados preservados e ausência de terceira sugestão. Nenhuma chamada de autenticação, envio de e-mail, operação Supabase ou pagamento real é executado nessa validação.

O build conserva os avisos conhecidos de scripts clássicos sem `type="module"`. A distribuição verifica seus arquivos finais pela lista explícita de assets; não houve reempacotamento desses scripts nesta correção.

Capturas com dados exclusivamente sintéticos:

- [Aviso e revisão manual — 320 px, claro](screenshots/pcr-medication-clarity/uncertain-320-light.png).
- [Primeira dose — 320 px, claro](screenshots/pcr-medication-clarity/amiodarone-first-320-light.png).
- [Primeira dose — 390 px, escuro](screenshots/pcr-medication-clarity/amiodarone-first-390-dark.png).
- [Segunda dose — 390 px, escuro](screenshots/pcr-medication-clarity/amiodarone-second-390-dark.png).

## Como testar no celular

1. Vercel → projeto **siav** → **Deployments** → Preview da branch **fix/pcr-medication-clarity-alerts** → **Visit**. Conferir o commit informado na entrega; a URL de um Preview antigo não se atualiza para outra branch.
2. Em atendimento sintético ainda sem ritmo, abrir Medicações e tocar Amiodarona: verificar aviso, dose vazia, revisão acessível e ausência de registro automático. Trocar a opção e conferir que a seleção anterior não foi gravada.
3. Percorrer uma oportunidade adulta válida e confirmar 300 mg. No mesmo passo, reabrir: não deve oferecer repetição. Na oportunidade seguinte autorizada pelo percurso, oferecer 150 mg. Após duas doses, exigir reavaliação, sem sugerir terceira.
4. Testar claro/escuro, rolagem e teclado numérico em retrato. Em telas baixas, o painel da seleção deve ficar inteiro visível; os outros medicamentos continuam acessíveis ao rolar para cima.

## Pendências e reversão

Safari/iPhone e Android físicos, teclado virtual, zoom do sistema, leitor de tela e comportamento da área visível quando o teclado abre ainda exigem teste real. Emulação Chromium não homologa Safari nem o uso clínico.

Novas medicações e seus critérios/doses requerem definição explícita e auditoria específica. Persistência assistencial, tabelas ausentes no Supabase, isolamento offline e segurança clínica geral continuam nas etapas próprias; esta entrega não os corrige nem declara homologados.

Para voltar à versão anterior, continuar usando o Preview preservado em `ed6eb7146d8371809a735d8f28388b6fffe6d751`. Uma reversão de código deve usar `git revert` do commit funcional desta branch em uma branch de trabalho, sem reescrever histórico. Não há migração nem dados a reverter nesta entrega.
