# SIAV — Medicações rápidas e sinais vitais pós-RCE

Data: 24/11/2026 (America/Sao_Paulo). Base: `4d16b8924e684f70337b79868ee2cee6e0d469e2`.
Branch: `fix/pcr-medications-post-rce`.

## Plano técnico registrado antes da implementação

### Diagnóstico verificado

- O cartão inicial usa texto longo para pedir uma avaliação de ritmo ainda não registrada.
- O modal de medicamentos não tem largura limitada à interface mobile, repete informações, trata todas as opções com o mesmo destaque e mantém os dados principais depois de controles de edição.
- As doses fixas já são preenchidas apenas em oportunidades adultas válidas. Lidocaína tem faixa por kg e não possui quantidade exata automática. Atropina, bicarbonato e magnésio não têm indicação automática de PCR neste avaliador e permanecem como registro manual.
- O modal de sinais vitais abre durante PCR sem guarda, embora seu próprio texto informe que não se deve preenchê-lo durante RCP ativa.
- A finalização atual grava o relatório imediatamente após RCE. Abrir o formulário depois disso deixaria os sinais vitais fora daquele relatório.

### Decisões de implementação

1. Trocar a mensagem inicial por **“Informe o ritmo.”** quando esse for o dado ausente, sem sugerir medicamento antes da avaliação. Histórico realmente incompleto continua exigindo revisão.
2. Retirar o botão de sinais vitais da PCR. Após RCE confirmado, executar imediatamente a transição clínica existente, que interrompe RCP/tempos; abrir o formulário e só depois finalizar administrativamente. Permitir salvar medidas reais ou finalizar sem informar, sem criar valores padrão. Fechar o formulário não desfaz o RCE.
3. Levar os sinais vitais ao evento/relatório do mesmo atendimento antes de encerrar. Preservar o horário da confirmação de RCE e bloquear uso de formulário antigo em outro atendimento/episódio. As regras de classificação de pressão/FC existentes permanecem.
4. Destacar adrenalina e amiodarona, listar as demais abaixo e manter um único botão de confirmação de registro. Dose fixa já validada: selecionar → confirmar. Informação real diferente, administração anterior, via fora do algoritmo ou contexto incerto: revisão manual explícita.
5. Para lidocaína adulta elegível, calcular a faixa em mg a partir da faixa mg/kg já existente. Pedir peso somente quando necessário e ausente, com confirmação explícita do valor. Não inferir peso, não escolher automaticamente um ponto da faixa. Informar a quantidade real antes de confirmar o registro. Não aplicar doses adultas à pediatria.
6. Usar o mesmo cálculo numérico de peso/faixa na apresentação e na validação para evitar divergência de ponto flutuante nos limites. Manter coeficientes, doses e critérios clínicos existentes; não introduzir arredondamento clínico para mg inteiros.
7. Não adicionar alteplase como rotina de PCR. Sua indicação e seu esquema precisam de auditoria clínica específica; o exemplo não autoriza inventar uma nova dose/protocolo.

### Riscos e critérios de aceitação

- RCE é confirmado antes do formulário; o formulário não estabelece RCE por conta própria. Não registrar compressões fictícias durante o preenchimento pós-RCE nem somar esse período ao tempo de PCR/FCT.
- Sem confirmação de RCE, não abrir nem salvar sinais vitais nesse fluxo. Não inferir medidas ausentes, nem declarar estabilidade a partir de campos vazios. Conservar os limiares existentes de PA/FC e apresentar alertas já previstos.
- Uma escolha/peso/cálculo não registra medicação. Confirmar a dose efetivamente administrada uma única vez, preservando ID, quantidade, unidade, via, horários, episódio e peso informado.
- Faixas exigem uma quantidade real; ausência de peso ou falta de indicação não cria sugestão automática. A guarda/revisão de registros manuais continua disponível.
- Formulários antigos não modificam paciente ou episódio novos. Notas, choques e históricos permanecem preservados.
- Testes de regressão, suíte completa, build, distribuição e interação Chromium em retrato, claro/escuro. Safari físico e segurança clínica não serão declarados homologados.
- Sem alteração de Supabase/schema/RLS/credenciais, produção, pagamentos, main ou PR #2. Branch anterior de Preview preservada; sem merge.

## Implementação e resultados

A preencher após implementação e validação. Este plano foi registrado antes das mudanças funcionais.
