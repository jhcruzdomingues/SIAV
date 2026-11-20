# SIAV — Cronômetro de adrenalina e orientação unificada

Data: 20/11/2026 (America/Sao_Paulo). Base: `9d6c48eebce5fd02e16f27b2aaf8434c52e069e9`.
Branch isolada: `fix/pcr-adrenaline-unified-guidance`.

## Solicitação e resultado

Substituir “Orientação clínica” na faixa de tempos por um cronômetro de adrenalina e reunir as orientações da PCR em um local objetivo, centralizado, com ação atual e próximo passo.

- O terceiro mostrador passa a ser **ADRENALINA**, com tempo **decorrido desde a última dose efetivamente registrada** e legenda “desde a dose”. Não é uma contagem regressiva nem uma ordem de administração.
- Sem administração registrada, mostra `--:-- / sem registro`. Dados temporais ou contexto de administração incertos mostram `--:-- / revisar registro`, sem reconstruir horários ou apagar registros.
- A contagem usa o timestamp efetivo mais recente, não o horário de abertura do formulário ou de registro de outra medicação. Pausas de compressões, avaliação de ritmo e preparação de choque não reiniciam a referência.
- ROSC/encerramento retiram a contagem ativa. Um novo atendimento começa sem dose anterior. Na recorrência após ROSC, o histórico anterior é preservado e não é usado como referência válida do novo episódio; permanece para revisão, conforme as salvaguardas existentes.
- O painel central **Agora / Próximo passo** reúne a orientação atual, doses já produzidas pelo protocolo, ressalvas essenciais, aviso de compressões interrompidas, contexto completo recolhível e feedback transitório. O botão único de iniciar/pausar/retomar permanece acima do painel.
- O próximo passo descreve apenas a sequência já existente: avaliar ritmo antes de seguir sua conduta, reavaliar ao fim do ciclo, desfibrilar **se indicado** e retomar compressões, ou seguir cuidados pós-parada/confirmar nova PCR. Um histórico que exige revisão mantém essa condição explícita. Nenhum ritmo futuro, choque ou dose futura é presumido.

## Causas

`updateDrugStatusDisplay()` era responsável por instruções e por uma contagem regressiva no mesmo campo: escrevia “ORIENTAÇÃO CLÍNICA”, “VER CONDUTAS”, “REAVALIAR” ou “AGUARDAR”, substituindo o número conforme o estado do protocolo. Isso misturava orientação com tempo, e o mostrador não era dedicado à adrenalina.

O aviso de pausa ficava separado do painel de orientação. O painel já preservava doses, ressalvas e contexto completo, mas não distinguia a ação atual da próxima avaliação. A mudança reúne esses elementos e centraliza sua apresentação.

## Implementação e preservação

- `src/ui/pcr-adrenaline-timer.js`: apresentação do tempo decorrido, validação da confiabilidade temporal/contextual dos registros e formatação inteira `MM:SS`. Não agenda intervalos nem altera registros.
- `src/pcr/medications.js`: apenas os adaptadores de exibição `stopDrugTimer()` / `updateDrugStatusDisplay()` delegam ao novo apresentador. Registro, presets, doses, confirmação, elegibilidade, IDs, timestamps e atualização do formulário aberto permanecem intactos.
- `src/ui/pcr-guidance.js`: atualização do mostrador também pelo tick de apresentação já existente, para limpar dados ao iniciar outro atendimento; apresentação condicional do próximo passo e retirada de texto antigo em caso de erro/encerramento.
- `index.html` e `pcr-interface.css`: terceiro mostrador identificado como adrenalina; painel único centralizado; aviso de pausa dentro dele; ação atual e próximo passo visualmente separados.
- `.github/workflows/ci.yml`: inclusão exclusivamente desta branch na lista de CI.
- Testes novos/atualizados e este relatório com capturas.

Sem alterações em `src/pcr/core.js`, `src/pcr/clinical.js`, `src/pcr/timing.js`, `src/pcr/rhythm.js`, módulos de protocolo, FCT, desfibrilação, sons, dados do paciente, serviços, Supabase, pagamentos, dependências, lockfile, service worker ou workflow de produção. Não foi alterado o intervalo de elegibilidade já usado pelo protocolo.

## Verificação

- Node 22.23.4 / npm 10.9.9; Chromium/Playwright já existentes; nenhuma dependência nova.
- **318/318 testes unitários/regressões**, em 25 arquivos: os 297 anteriores mais 15 casos do relógio e 6 do painel. Os 15 casos do relógio falharam na base antes da correção.
- Cobertura funcional nova: ausência de dose, registro pela interface real com dados sintéticos, passagem `00:59 → 01:00`, tempo real sem ticks, outra medicação sem reset, segunda dose, pausa/retomada, avaliação/choque, dados incompletos/futuros/retrospectivos/outro episódio, ROSC, novo atendimento e recorrência preservando histórico. O painel verifica localização única, orientação atual, próximo passo condicional, pediatria sem dose adulta, revisão, encerramento, falha sem informação antiga e ausência de mutação clínica.
- Build: verificação local com configuração pública sintética; o artefato sintético não é publicado e nenhuma variável remota é alterada.
- Distribuição: **14/14**. O novo ensaio percorre AESP → registro sintético de adrenalina pela interface e valida artefato servido exclusivamente de `dist/`, contagem durante pausa, preservação do ciclo e registro, revisão e layout em **320, 360, 375, 390, 414, 430 e 768 px**, retrato, claro/escuro, sem corte/overflow e contraste mínimo 4,5:1 nos novos textos avaliados.
- `git diff --check`: sem erros.
- CI e Preview isolado: resultados e links informados na entrega após o push.

## Capturas e teste manual

Capturas do Chromium com dados exclusivamente sintéticos, sem injeção de estilos:

- [320 px, claro: relógio e painel](screenshots/pcr-adrenaline-guidance/adrenaline-320-light.png).
- [390 px, escuro: relógio e painel](screenshots/pcr-adrenaline-guidance/adrenaline-390-dark.png).
- [Orientação centralizada em 390 px, escuro](screenshots/pcr-adrenaline-guidance/guidance-390-dark.png).
- [Orientação antes do registro da primeira dose](screenshots/pcr-adrenaline-guidance/before-adrenaline.png).

No Safari, abrir o Preview do commit informado na entrega, tocar **Visit**, iniciar PCR fictícia e confirmar que o relógio de adrenalina começa sem registro. Confirmar um ritmo não chocável para disponibilizar a oportunidade já prevista pelo protocolo, abrir Medicação, selecionar adrenalina e registrar a administração sintética. Conferir contagem, pausar/retomar pelo mesmo botão e verificar que o tempo da dose continua. Conferir Agora/Próximo passo e o acesso à orientação completa. Não usar pacientes reais.

## Limitações e reversão

Emulação Chromium não homologa Safari físico nem todos os aparelhos. A passagem do tempo depende do relógio do dispositivo; não se garante continuidade de um atendimento após recarga/suspensão. O relógio só representa administração registrada, não detecta administração real, e não autoriza nova dose. Fluxos com histórico incerto ou outro episódio continuam sujeitos à revisão existente. A validação é de regressão de software, sem homologação clínica.

Para reverter, usar `git revert <SHA-da-entrega>` nesta branch, com árvore limpa, e repetir testes/build/distribuição. Não apagar históricos nem reescrever Git. As branches anteriores, main e PR #2 permanecem preservados. Nenhum merge, alteração de Supabase ou deploy de produção.
