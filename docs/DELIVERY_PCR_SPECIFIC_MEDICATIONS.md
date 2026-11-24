# SIAV — Catálogo de registros de medicações específicas

Data: 24/11/2026 (America/Sao_Paulo). Base conferida: `ba4103a8d0fa3e1c2d61db49eaed7698bbe2a281`.
Branch: `fix/pcr-specific-medication-catalog`.

## Auditoria antes da implementação

A lista fornecida pelo usuário define os medicamentos desejados. Não constitui, por si só, protocolo validado para preenchimento automático em todas as situações.

| Item | Conclusão para esta entrega |
| --- | --- |
| Adrenalina, amiodarona e lidocaína | Manter doses e oportunidades do avaliador adulto existente. Adrenalina é usada nos dois ramos, mas seu momento inicial depende do percurso; não liberá-la indiscriminadamente antes da avaliação/desfibrilação. Amiodarona e lidocaína continuam alternativas. |
| Magnésio e bicarbonato | Preservar registro manual. Não transformar acidose genérica, qualquer TV polimórfica ou um rótulo de 5H/5T em indicação automática. |
| Gluconato e cloreto de cálcio 10% | Cadastrar separadamente. Mesmo percentual não significa mesmo cálcio elementar por mL. Não converter nem preencher automaticamente os volumes propostos. |
| Naloxona | Registrar dose e via reais, com IM/IN disponíveis apenas nessa seleção. A dose intranasal depende da apresentação; não transpor a faixa injetável para todas as vias. |
| Alteplase e tenecteplase | Opções distintas de registro manual. Não criar dose de PCR/TEP a partir de esquemas de AVC/IAM nem assumir indicação pela presença de AESP. |
| Glicose 50% | Registrar volume real e concentração explicitada no nome. Não inferir hipoglicemia. “Apenas hipoglicemia” não é uma regra universal: glicose também participa de esquemas com insulina para hipercalemia. |

### Fontes conferidas

- [AHA 2025 — algoritmo adulto de PCR](https://cpr.heart.org/-/media/CPR-Files/CPR-Guidelines-Files/2025-Algorithms/Algorithm-ACLS-CA-250527.pdf): percurso e doses de rotina. Não alterar o avaliador compartilhado.
- [AHA 2025 — suporte avançado adulto](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-advanced-life-support): cálcio, bicarbonato e magnésio não são medicações de rotina da PCR.
- [AHA 2025 — circunstâncias especiais](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-and-pediatric-special-circumstances-of-resuscitation/): cardiotoxicidade por tricíclicos, incerteza de benefício em hipercalemia, insulina/glicose, opioides e TEP têm contextos próprios. Naloxona não deve atrasar RCP/ventilação; trombólise exige avaliação específica.
- [Bula de gluconato de cálcio](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=787603c6-3f50-473a-8e3b-71dcf6d86964) e [bula de cloreto de cálcio](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=d5d9c301-599e-47bb-ba9b-c0065c08dfb4): apresentações 100 mg/mL contêm, respectivamente, 9,3 e 27 mg/mL de cálcio elementar; não são intercambiáveis por volume.
- [Bula de naloxona intranasal](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=68723486-8f21-4299-b380-7d5e3f9657b6): produtos nasais possuem apresentações próprias. Não estabelecer uma dose única para todas as vias.

## Plano técnico restrito

1. Preservar o avaliador, doses de rotina, cálculos de peso, choques e temporização.
2. Criar catálogo de **registro**, separado do catálogo de cálculos clínicos. Acrescentar gluconato de cálcio 10%, cloreto de cálcio 10%, naloxona, alteplase, tenecteplase e glicose 50%, sem números de dose sugerida.
3. Manter adrenalina/amiodarona em destaque e lidocaína acessível como alternativa. Reunir causas específicas em seção recolhível; conservar atropina em outros registros, sem apresentá-la como rotina.
4. Dose dos novos itens começa vazia. Aviso de indicação não validada, quantidade real, unidade/via compatíveis e revisão explícita são necessários antes do registro. Uma seleção não constitui recomendação nem administração.
5. Ampliar o registro de fatos para mL e para IM/IN com guardas por medicamento. Não liberar essas opções indiscriminadamente para amiodarona, adrenalina ou registros desconhecidos.
6. Conservar nomes com concentração, horários, episódio, ID da operação e revisão; testar relatório e deduplicação. Não executar conversões entre mL, massa, cálcio elementar ou doses por peso para novos itens.
7. Criar regressões com HTML/módulos reais; testar seleção e campos em retrato, claro/escuro, suíte completa, SQL isolado, build e distribuição. Confirmar CI e Preview da nova branch.

## Limites

Não alterar Supabase, banco, RLS, credenciais, produção, main, PR #2 ou a branch de Preview anterior. Não realizar pagamentos, merge ou deploy de produção. Não usar pacientes reais. O registro manual não comprova diagnóstico, indicação, preparo, acesso vascular ou segurança da administração. Novos protocolos automáticos dependem de revisão clínica específica; esta entrega não os implementa.
