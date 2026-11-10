# SIAV — Entrega 6A: interface mobile da PCR

Data: 10/11/2026 (America/Sao_Paulo). Base: `35b1e5520971bee25261bc90d52bde02bdaaf804`.
Branch dedicada: `fix/pcr-mobile-interface-6a`.
Implementação, regressões e capturas: `2858277c797c8cd9e0302bd39db9d49a53f5a180`.

A branch `fix/distribution-assets-pwa`, usada pelo Preview existente, foi preservada na base. Não houve alteração em `main`, na branch do PR #2, em Supabase, dados, pagamentos ou workflow de produção. Não houve merge nem comando de deploy de produção.

## Diagnóstico e correções

| Problema verificado | Correção |
|---|---|
| `}` excedente próximo à antiga linha 1282 de `style.css`, após os estilos escuros do modal de medicamentos | Remoção somente da chave sem abertura correspondente; parser PostCSS valida todas as folhas locais referenciadas, e o aviso CSS desapareceu do build |
| Metrônomo empilhado no mobile; estilos de dark mode usavam `.metro-btn`/`.bpm-btn`, enquanto o HTML usa `.btn-metronome`/`.btn-bpm` | Grid simétrico `48px minmax(0, 1fr) 48px`: diminuir à esquerda, botão principal no centro, aumentar à direita; IDs/listeners preservados |
| Texto claro sobre fundo branco no metrônomo e botão dos 5Hs/5Ts em dark mode | Folha `pcr-interface.css`, carregada após as folhas legadas, com tokens de apresentação compartilhados e seletores dos componentes reais |
| Definições concorrentes de fundos/textos nas folhas de tema | Aliases consistentes para canvas, superfície, borda e texto em claro/escuro; aplicação às telas de navegação e aos modais clínicos/autenticação |
| Transição do metrônomo criava por instantes texto branco sobre azul claro de baixo contraste | Troca de cor imediata; transições de borda/sombra preservadas onde apropriado. Não há fade de cor entre combinações ilegíveis |
| Seleção dos 5Hs/5Ts com fundo claro e texto de pouco contraste; destaque nativo de toque mudava momentaneamente a cor percebida | Seleção continua vermelha e orientação âmbar, com pares de texto/fundo próprios por tema. Overlay nativo de toque foi retirado desses controles; seleção/foco explícitos continuam disponíveis |
| Valores do timer e rótulos como MEDICAÇÃO cortados no SE | Redução de espaçamentos internos, colunas `minmax(0, 1fr)`, tamanho tipográfico responsivo e rótulos com quebra; conteúdos e cálculos inalterados |
| Feedback longo podia ultrapassar o `max-height: 100px` | Banner aberto sem corte de altura; texto quebra normalmente, preservando informação e categoria de alerta |
| Textos secundários, navegação e alguns controles com contraste insuficiente | Paleta consistente, cores legíveis de navegação e ações secundárias, inputs/placeholders e estados selecionados; verde/âmbar/vermelho/azul continuam com o significado anterior |

Os fundos inline verde/âmbar do botão de compressões continuam sob controle da lógica existente; seu texto recebe tinta escura para legibilidade em ambos. Não foram reclassificados estados clínicos nem alterados textos de protocolo. Rolagem continua necessária em telas curtas: conteúdo abaixo do viewport não foi confundido com texto cortado dentro do componente.

## Metrônomo: invariantes preservados

- Faixa de **100–120 BPM** e passos de **5 BPM** já existentes foram preservados. Os botões agora ficam desabilitados nos respectivos limites e possuem nomes acessíveis.
- O botão principal informa `aria-pressed`; BPM possui anúncio `aria-live="polite"`. O indicador de batida é decorativo e `aria-hidden`.
- Permanecem as mesmas expressões `60000 / state.bpm`, o intervalo existente, o som imediato ao iniciar, a regra de reagendamento ao editar BPM, frequência do oscilador e duração de **30 ms** do tom.
- O pulso visual nasce no `onended` do próprio oscilador, após liberar seus recursos. É um breve eco visual de cada tom concluído, com defasagem nominal de 30 ms em relação ao início do tom mais a latência de despacho/renderização. Não é um relógio CSS independente, sensor de compressão ou confirmação de som audível no aparelho.
- Não há novo `setInterval`, timeout, RAF ou mudança nos relógios de PCR, ciclos, pausas ou FCT para produzir a animação. Web Animations atua somente num indicador de 7 px, por 150 ms.
- `prefers-reduced-motion: reduce` impede novas animações e força indicador estático, inclusive sobre animação já iniciada. O áudio e sua cadência continuam funcionando.
- Parar o metrônomo cancela a animação; término de tom depois da parada não cria pulso. Ausência/falha da API de animação não interrompe áudio ou liberação de recursos.

Não se declara precisão física de áudio/tela homologada: callbacks de browser e saída de áudio têm latência, especialmente no iOS e em segundo plano. Não houve alteração do algoritmo de temporização existente.

## Arquivos alterados

| Arquivo(s) | Finalidade |
|---|---|
| `style.css` | Correção sintática de uma chave excedente |
| `pcr-interface.css` | Paleta compartilhada, controles, contraste, quebra de texto e ajustes responsivos |
| `index.html` | Inclusão da folha e semântica acessível do grupo/controles/indicador; IDs e dados clínicos preservados |
| `src/ui/audio.js` | Estado acessível, atualização visual dos limites e chamada da animação no término do tom |
| `src/ui/metronome-feedback.js` | Animação visual isolada, movimento reduzido e cancelamento |
| `tests/pcr-interface.test.js` | Oito regressões de áudio/visual, limites, cancelamento, acessibilidade e CSS |
| `tests/distribution/check.mjs` | Integração dos dois roteiros UI, manutenção da allowlist de artefato |
| `tests/distribution/pcr-interface.mjs` | Interações reais em Chromium, contraste amostrado, limites, ausência de corte, navegação/modais e capturas opcionais |
| `.github/workflows/ci.yml` | Somente inclusão desta branch no trigger de CI; configuração sintética existente e workflow de produção preservados |
| `docs/screenshots/delivery-6a/*.png` | 12 capturas com dados sintéticos, dois tamanhos e dois temas |
| `docs/DELIVERY_6A_PCR_INTERFACE.md` | Este relatório |

Comparação de conteúdo com a base confirmou **48 arquivos protegidos idênticos**, incluindo núcleo de PCR, protocolos, serviços/configuração, Worker, Supabase, scripts de planos/pagamento, configuração Vercel, workflow de produção e os testes `.test.js` preexistentes. Nenhuma dose, cálculo, ritmo, registro de paciente ou regra de elegibilidade foi alterado.

A alteração de tema modifica apresentação compartilhada; código e valores comerciais não foram modificados e checkout não foi exercitado. Os modais comerciais não fazem parte da revisão visual clínica desta entrega.

## Validação executada

Ambiente: Node **22.23.4**, npm **10.9.9**, Playwright **1.57.0**, Chromium de sistema. Larguras CSS: **320 px (iPhone SE)** e **390 px (iPhone 13)**. Foram usados contextos descartáveis, visitante sem sessão e dados sintéticos; backend, autenticação real e pagamentos bloqueados.

| Verificação | Resultado |
|---|---|
| Baseline `npm ci`, suíte e build | 219/219 testes; build reproduziu aviso CSS antigo |
| `npm ci` após alterações | Aprovado, sem alteração de dependências/lockfile |
| `npm run test:run` | **227/227**, 18 arquivos; 219 anteriores preservados e 8 regressões novas |
| `npm run build` | Aprovado; aviso `Unexpected }` removido; permanecem os avisos conhecidos de scripts clássicos emitidos explicitamente |
| `npm run test:distribution` | **8/8**, sem skips; inclui os 6 casos anteriores e 2 roteiros novos de PCR |
| Parser PostCSS das folhas locais | Aprovado |
| Sintaxe JS/MJS e `git diff --check` | Aprovados |
| Capturas geradas e inspecionadas | 12, listadas abaixo |

Os testes de unidade verificam um único intervalo ativo, parâmetros/duração do som, ausência de som extra ao mudar BPM, limites/estado dos botões, pulso por término de tom, cancelamento tardio, movimento reduzido, fallback sem animação e preservação de campos assistenciais.

Os novos roteiros de distribuição exercitam ambos os temas e tamanhos, centro geométrico do botão, alvos de toque de pelo menos 44 px, limites 100/120, animação real pelo Web Audio/Web Animations do Chromium, supressão com movimento reduzido, textos de timers sem overflow, banners longos e as causas reversíveis selecionadas. Também percorrem home, estudos, protocolos, dashboard visitante, quiz, ritmo, choque e PCR; abrem modais de paciente, medicação, notas, sinais, Glasgow e autenticação sem submeter formulários ou gravar registros.

O contraste foi verificado em amostras de texto dos componentes afetados: limiar **4,5:1** para texto comum e **3:1** para texto grande, conforme tamanho/peso. Isso não é certificação WCAG integral, análise de todos os gradientes/ícones/estados ou homologação clínica. Conteúdo fora do viewport continua acessível por rolagem; os testes distinguem isso de overflow/corte interno e horizontal.

O artefato permanece em **41 arquivos**, **1.200.840 bytes**, contra 1.191.202 bytes da base. As capturas adicionam 1.746.812 bytes de documentação ao repositório e não entram no pacote do aplicativo. O build e os testes servem somente `dist/`, sem publicar docs, fontes avulsas, arquivos de ambiente ou testes.

O CI desta branch é disparado por push; a execução remota é conferida após o envio e informada na entrega. O build de CI usa a configuração sintética já existente; seu artefato não é um deploy.

## Capturas

As imagens mostram o viewport real em posições de rolagem escolhidas; nenhuma alteração de layout foi injetada para ocultar problemas. Animações são desabilitadas no instante da captura para evitar artefatos. O pulso é verificado por interação, não por imagem estática. O relógio pode exibir valores diferentes entre imagens, pois não foi congelado nem reescrito para a foto.

Para renderizar os ícones nos testes, a opção de captura carrega uma cópia pública equivalente do Font Awesome 6.0.0-beta3 via CDN jsDelivr, com TLS verificado; não altera o frontend, não introduz chamadas ao backend e não inclui as fontes no pacote. Sem essa opção, os testes continuam usando os rótulos acessíveis sem depender do CDN de ícones.

| Dispositivo / tema | Cabeçalho e cronômetros | Metrônomo e ações | Causas e orientação |
|---|---|---|---|
| SE claro | [Abrir](screenshots/delivery-6a/iPhone-SE-light-pcr-header.png) | [Abrir](screenshots/delivery-6a/iPhone-SE-light-pcr-controls.png) | [Abrir](screenshots/delivery-6a/iPhone-SE-light-causes.png) |
| SE escuro | [Abrir](screenshots/delivery-6a/iPhone-SE-dark-pcr-header.png) | [Abrir](screenshots/delivery-6a/iPhone-SE-dark-pcr-controls.png) | [Abrir](screenshots/delivery-6a/iPhone-SE-dark-causes.png) |
| iPhone 13 claro | [Abrir](screenshots/delivery-6a/iPhone-13-light-pcr-header.png) | [Abrir](screenshots/delivery-6a/iPhone-13-light-pcr-controls.png) | [Abrir](screenshots/delivery-6a/iPhone-13-light-causes.png) |
| iPhone 13 escuro | [Abrir](screenshots/delivery-6a/iPhone-13-dark-pcr-header.png) | [Abrir](screenshots/delivery-6a/iPhone-13-dark-pcr-controls.png) | [Abrir](screenshots/delivery-6a/iPhone-13-dark-causes.png) |

Reprodução dos testes/capturas, sem deploy:

```sh
npm ci
npm run test:run
npm run build
SIAV_CHROMIUM_PATH=/caminho/para/chromium npm run test:distribution
# Capturas opcionais, com fontes públicas e TLS verificado:
SIAV_CHROMIUM_PATH=/caminho/para/chromium SIAV_VISUAL_ICONS=1 \
SIAV_UI_SCREENSHOTS_DIR=/diretorio/de/capturas npm run test:distribution
```

O Chromium pode ser instalado pelo procedimento Playwright já documentado na Entrega 5B. A suíte de distribuição constrói um `dist/` temporário com configuração sintética e servidor somente em loopback; não altera o artefato real preparado com ambiente local.

## Safari físico: pendências explícitas

1. Confirmar alinhamento, texto ampliado/Dynamic Type, rolagem, barras do Safari, área segura e teclado em SE/13 reais, incluindo a parte inferior dos modais.
2. Verificar início do AudioContext mediante toque, volume/silencioso, saída real de som e sincronismo perceptivo do indicador. Headless não homologa latência ou precisão física.
3. Ativar/desativar Reduzir Movimento no iOS, inclusive com metrônomo ligado; o botão e BPM devem continuar claros sem pulsos.
4. Verificar pausa, bloqueio da tela, troca de aba e retorno. Não presumir continuidade de PCR, metrônomo ou contagem durante suspensão; o ledger clínico existente não foi alterado.
5. Testar estado parado/ativo, ajustes de BPM, parada/retomada, alertas longos e orientação de causas sem dados reais de pacientes.
6. Verificar ícones com CDN indisponível, zoom e contraste em condições de brilho do aparelho. Emulação Chromium não é WebKit/Safari.

O reload inicial legado do HTML continua fora desta entrega e exige avaliação própria. A função legada `isMetronomeActive()` consulta uma variável diferente da usada pelo intervalo; não é usada pela interface atual, que lê `state.metronomeActive`, e não foi ampliado o escopo para alterar essa API. Nenhuma dessas pendências foi declarada homologada.

## Reversão

Na branch dedicada e com árvore limpa:

```sh
git switch fix/pcr-mobile-interface-6a
git revert 2858277c797c8cd9e0302bd39db9d49a53f5a180
npm run test:run
npm run build
git diff --check
```

Isso reverte a interface, seus testes/capturas e o trigger adicional, preservando o histórico. Também restaura os problemas de contraste/corte e a chave CSS excedente da base; não é recomendação de publicação. A documentação pode permanecer como registro. Não reescrever histórico, alterar a branch de Preview ou executar deploy como parte da reversão.
