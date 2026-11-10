# Revisão da segunda etapa — PCR adulta

Base: `5eb1036`, branch `fix/adult-pcr-antiarrhythmics`. A segunda etapa foi reconstruída com autorização explícita do usuário depois que a restauração do ambiente não preservou o objeto Git do commit anterior `e7844da`. Esta reconstrução gera um novo commit; não é uma recuperação binária daquele objeto. Não houve merge, publicação, migração ou alteração de credenciais/configurações de produção.

## Referência examinada

PDF fornecido pelo usuário: `Algorithm-ACLS-CA-250527.pdf`, página 1, ©2025 AHA. Texto e setas examinados na auditoria/adendo. SHA-256: `b3ff73cf22a8ff98c6c7b39a2b42d8bf36d89d3e53eefd40afb1b21826bb8862`.

O PALS anexado não fundamenta doses adultas. Não foi implementada uma nova máquina clínica pediátrica. A seleção do algoritmo adulto é explícita no preparo do paciente; não se cria um novo corte de idade/peso para escolhê-lo.

## Decisões implementadas

- `clinical.status` distingue PCR clínica, ROSC e inatividade do estado administrativo `pcrActive`. Confirmar ROSC interrompe temporizadores, compressões e recomendações antes da pergunta de finalização. Cancelar a finalização não desfaz ROSC. A recorrência requer confirmação explícita, cria outro episódio e preserva registros/choques do atendimento.
- `clinical.step` representa os passos do PDF. Inicial chocável: choque 3 → RCP 4 → choque 5 → RCP 6 → choque 7 → RCP 8. Retorno do passo 8 segue para choque 5. AESP/assistolia entra em 10, segue por 11 se persistir e retorna a 10; evolução para chocável entra em 5. Os números dos passos não são contadores de choques.
- A RCP pode continuar durante o preparo de choque. Uma nova avaliação pode substituir a decisão pendente, inclusive para ritmo não chocável. O ciclo de dois minutos reinicia após o choque registrado.
- Cada decisão de choque fornece uma operação consumível uma vez. O total é mantido separadamente, com registros estruturados e episódio. Um novo choque legítimo exige nova avaliação; não se deduplicam eventos apenas por energia ou intervalo arbitrário de tempo.
- Painel, modal e temporizador consultam `evaluateMedicationGuidance`. Adrenalina e antiarrítmico elegíveis aparecem sem uma precedência exclusiva inventada; amiodarona e lidocaína são alternativas.
- Antiarrítmicos são considerados no passo 8, e não por `shockCount >= 3/5`. Uma primeira dose registrada corretamente nessa oportunidade não gera outra na mesma oportunidade. O retorno posterior ao passo 8 pode apresentar a segunda dose do mesmo fármaco, com histórico completo. Associação, terceira dose ou histórico divergente exige reavaliação.
- O PDF não resolve o ajuste após administração tardia. Administração fora da oportunidade, histórico retrospectivo/incompleto, episódio anterior ou ausência de metadados suspende a sugestão automática correspondente e pede reavaliação. Não há fallback “presumir choque 3”, nem regra universal “dois choques depois da administração”.

## Registrar um fato não é prescrever uma dose

O modal não confirma administração pelo segundo clique no nome da droga. A ação é “REGISTRAR ADMINISTRAÇÃO”. Quantidade numérica efetiva, unidade, via, horário e confirmação do usuário são explícitos. A faixa de lidocaína é orientação; nunca é copiada como quantidade administrada.

Cada abertura cria um ID de operação no formulário. O primeiro registro consome esse ID antes de callbacks; repetir a mesma operação não cria outra entrada. Reabrir cria uma operação distinta, permitindo registrar administrações legítimas com dose e horário iguais. Cancelar invalida a operação. O helper também verifica IDs duplicados.

Os registros contêm `amount`, `unit`, `route`, `timestamp` (horário efetivo), `recordedAt` (horário do registro), `isRetrospective`, `requiresReview`, `episodeId`, contexto clínico quando conhecido e peso informado no momento. `dose` mantém representação textual exata para compatibilidade com os relatórios.

Registros retrospectivos exigem data/hora local válida e não futura. Não recebem choque/etapa presumidos a partir do clique. Fatos anteriores ao episódio podem ser documentados sem associação automática. Dados fora da orientação, inclusive ET ou administrações adicionais, podem ser documentados como fatos, mas não recebem recomendação por essa via/dose. Novas sugestões automáticas ficam suspensas quando esses fatos tornam a sequência incerta.

O relatório inclui horários efetivo/de registro e tipo retrospectivo/tempo real. A primeira adrenalina usa o menor horário efetivo conhecido, não a posição na timeline. Registros legados sem proveniência não são convertidos silenciosamente em horários efetivos confirmados. Nenhuma estrutura de banco ou função de escrita do Supabase foi modificada.

## Verificação desta reconstrução

- `npm run test:run -- --maxWorkers=2 --minWorkers=1`: 109 testes em 10 arquivos, passando.
- `npm run build`: concluído. Permanecem avisos preexistentes de scripts legados sem `type=module` e chave de fechamento inesperada no CSS.
- Regressões: FV persistente, AESP → FV, FV → AESP → FV; fases e oportunidades; ROSC com finalização cancelada/aceita; recorrência explícita; doses tardias; históricos ausentes; relógio por horário efetivo; registros retrospectivos; quantidade exata e via; duplicação da mesma operação e administrações distintas; relatório.
- O teste isolado Chromium/Playwright da sessão usa HTML, módulos locais e `registerAllEvents` reais, fuso America/Sao_Paulo e substituto inerte do backend apenas no roteamento do navegador. O resultado fica em `/workspace/siav-stage2-browser.json`. Esse teste não valida autenticação, persistência remota ou pagamentos.

## Riscos e limites para revisão humana

1. Testes demonstram comportamento de software, não segurança clínica. Conferir passos, alternativas e exceções com revisor clínico antes de integrar ou usar em atendimento.
2. Casos ambíguos continuam deliberadamente sem dose automática. Não existe botão que valida retrospectivamente um histórico incerto. O profissional pode documentar condutas adotadas após reavaliação.
3. Operações explícitas distintas não são suprimidas por conteúdo igual. O sistema não determina se o profissional descreveu duas administrações reais ou repetiu um fato deliberadamente em outro formulário.
4. A persistência estruturada dos campos no backend não foi migrada nem validada. O texto gerado utiliza o caminho de relatório existente. Estado em memória não substitui armazenamento clínico durável.
5. PALS, motor de energia de desfibrilação preexistente, seleção de energia por idade/peso, métricas legadas de performance e alegações de conformidade do relatório precisam de revisão própria. Este diff não aprova clinicamente todo o SIAV.
6. A inicialização completa da aplicação depende dos recursos externos de CDN/SDK disponíveis no ambiente. Não é demonstrada pelo fluxo isolado de navegador. O CI remoto usa `npm ci`, enquanto o lockfile é ignorado pelo repositório; o sucesso local não comprova sucesso do CI remoto. Workflows e dependências não foram alterados nesta tarefa.
7. Foram necessárias mudanças funcionais nos campos e rolagem/tamanho do texto do modal. Não houve redesign geral.

O usuário autorizou o envio desta branch ao GitHub para análise. Isso não autoriza merge na main, deploy ou publicação do ambiente.
