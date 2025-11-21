# 🌳 SISTEMA DE BRANCHING - Árvore de Decisões

## 🎯 O Que Mudou?

### **ANTES (Sistema Linear):**
```
Erro → Tenta novamente (mesma questão)
Acerto → Próxima questão
```

### **AGORA (Sistema de Branching):**
```
Erro → Mostra CONSEQUÊNCIAS do erro → Próximo passo diferente
Acerto → Caminho correto → Próximo passo normal
```

---

## 🌳 Estrutura da Árvore

### **Exemplo: PCR em FV**

```
┌─────────────────────────────────────────┐
│ Step 1: PCR - Qual conduta?             │
└─────────────────────────────────────────┘
           │
           ├─ [A] Intubar primeiro (ERRO)
           │     ↓
           │  Step 10: "Paciente sem RCP por 2min"
           │     ↓
           │  Step 13: "RCE com sequelas neurológicas"
           │     ↓
           │  FIM: SOBREVIVEU (sequelas)
           │
           ├─ [B] Desfibrilar (CORRETO) ✅
           │     ↓
           │  Step 2: "Após choque, ainda em FV"
           │     ↓
           │  Step 3: "RCE obtido!"
           │     ↓
           │  FIM: EXCELENTE (sem sequelas)
           │
           ├─ [C] Adrenalina primeiro (ERRO)
           │     ↓
           │  Step 11: "Atraso de 90s"
           │     ↓
           │  Step 14: "RCE com sequela leve"
           │     ↓
           │  FIM: BOM (sequela leve)
           │
           └─ [D] Acesso venoso primeiro (ERRO)
                 ↓
              Step 11: "Atraso de 60s"
                 ↓
              Step 14: "RCE com sequela leve"
                 ↓
              FIM: BOM (sequela leve)
```

---

## 📊 Múltiplos Desfechos Possíveis

### **1. Desfecho EXCELENTE (180-200 pts)**
- Todas decisões corretas
- Sem erros
- Paciente recupera 100% sem sequelas
- **Feedback:** "EXCELENTE! Paciente sobreviveu com ótima qualidade neurológica!"

### **2. Desfecho BOM (100-150 pts)**
- 1-2 erros leves
- Recuperação com sequelas mínimas
- **Feedback:** "BOM TRABALHO! Paciente sobreviveu com sequela leve (déficit de memória)."

### **3. Desfecho REGULAR (50-100 pts)**
- Vários erros ou 1 erro grave
- Recuperação com sequelas moderadas
- **Feedback:** "PODE MELHORAR. Paciente sobreviveu mas com sequelas devido aos erros."

### **4. Desfecho RUIM (0-50 pts)**
- Erros graves múltiplos
- Sobrevida com sequelas graves
- **Feedback:** "PRECISA REVISAR. Paciente sobreviveu com encefalopatia hipóxica grave."

### **5. Desfecho ÓBITO (-100 a 0 pts)**
- Erros críticos ou sequenciais
- Morte do paciente
- **Feedback:** "ÓBITO. Revise urgentemente os protocolos ACLS/BLS."

---

## 🔧 Estrutura JSON do Branching

### **Opção CORRETA:**
```json
{
  "id": "b",
  "text": "Aplicar choque (Desfibrilação)",
  "correct": true,
  "feedback": "✅ CORRETO! FV é ritmo chocável...",
  "points": 50,
  "next_step": 2  // → Próximo passo normal
}
```

### **Opção INCORRETA (com consequência):**
```json
{
  "id": "a",
  "text": "Intubar imediatamente",
  "correct": false,
  "feedback": "❌ ERRO! Você perdeu 2min intubando. Cérebro sofrendo hipóxia!",
  "points": -20,
  "next_step": 10  // → Step de CONSEQUÊNCIA do erro
}
```

### **Opção Final (sem next_step):**
```json
{
  "id": "a",
  "text": "Internar para UTI + TTM",
  "correct": true,
  "feedback": "✅ EXCELENTE! Paciente recuperou totalmente!",
  "points": 100,
  "next_step": null  // → FIM DO JOGO
}
```

---

## 🎮 Fluxo do Usuário

### **Cenário 1: Caminho Perfeito**
```
1. Step 1: Escolhe "Desfibrilar" ✅
   → Feedback: "CORRETO! FV é chocável"
   → +50 pontos
   → Avança para Step 2

2. Step 2: Escolhe "RCP de qualidade" ✅
   → Feedback: "CORRETO! RCP por 2min"
   → +50 pontos
   → Avança para Step 3

3. Step 3: Escolhe "UTI + TTM" ✅
   → Feedback: "EXCELENTE! Sobreviveu sem sequelas!"
   → +100 pontos
   → FIM: 200 pontos (100%)
```

**Resultado:** ⭐ EXCELENTE! Paciente 100% recuperado

---

### **Cenário 2: Caminho com Erro**
```
1. Step 1: Escolhe "Intubar primeiro" ❌
   → Feedback: "ERRO! Perdeu 2min sem RCP"
   → -20 pontos
   → Avança para Step 10 (CONSEQUÊNCIA)

2. Step 10: "Paciente em FV há 2min, hipóxia severa"
   Escolhe "Desfibrilar agora + RCP" ✅
   → Feedback: "Correto, mas atrasado"
   → +20 pontos
   → Avança para Step 13

3. Step 13: "RCE obtido mas em coma"
   Escolhe "UTI + TTM" ✅
   → Feedback: "Sobreviveu com sequelas graves"
   → +50 pontos
   → FIM: 50 pontos (25%)
```

**Resultado:** ⚠️ RUIM. Paciente sobreviveu com encefalopatia

---

### **Cenário 3: Múltiplos Erros → Óbito**
```
1. Step 1: Escolhe "Intubar" ❌
   → -20 pontos
   → Step 10

2. Step 10: Escolhe "Continuar ventilando" ❌
   → Feedback: "ERRO FATAL! Assistolia"
   → -50 pontos
   → Step 99 (Óbito)

3. Step 99: "Assistolia irreversível"
   Única opção: "Declarar óbito"
   → Feedback: "ÓBITO. Desempenho RUIM"
   → -100 pontos
   → FIM: -170 pontos
```

**Resultado:** ❌ ÓBITO. Revise protocolos urgentemente

---

## 📚 Casos Implementados

### **1. PCR em Fibrilação Ventricular**
- **Steps:** 12 (com branching)
- **Desfechos possíveis:** 6
  1. Excelente (sem sequelas)
  2. Bom (sequela leve)
  3. Regular (sequela moderada)
  4. Ruim (sequela grave)
  5. Óbito por atraso
  6. Óbito por erro crítico

### **2. Bradicardia Sintomática**
- **Steps:** 10 (com branching)
- **Desfechos possíveis:** 5
  1. Excelente (marcapasso no timing certo)
  2. Bom (dopamina funcionou)
  3. Regular (TCE por síncope)
  4. Ruim (choque cardiogênico)
  5. Óbito (erro medicamentoso + atraso)

---

## 🎓 Objetivos Pedagógicos

### **O que o estudante aprende:**

1. **Consequências Reais**
   - Cada erro mostra o que acontece na vida real
   - Ex: "Atraso de 2min → Hipóxia cerebral"

2. **Timing é Crítico**
   - Mesma conduta em momentos diferentes = resultados diferentes
   - Ex: Atropina boa, mas marcapasso melhor

3. **Priorização**
   - O QUE fazer E QUANDO fazer
   - Ex: Choque ANTES de intubar em FV

4. **Recuperação de Erros**
   - Errou? Ainda pode salvar (com sequelas)
   - Erro em cima de erro = óbito

5. **Pensamento Crítico**
   - Não é decoreba, é entender o PORQUÊ
   - Feedback educativo em cada escolha

---

## 🔍 Logs de Debug

### **Console mostrará:**

```javascript
// Ao clicar em opção correta
✅ [CLICK] Resposta CORRETA. Pontos: 50
➡️ [CLICK] Avançando para step 2 (índice 1)
🎬 [RENDER] Renderizando step 1...

// Ao clicar em opção incorreta
❌ [CLICK] Resposta INCORRETA. Pontos: -20 | Mostrando consequências...
➡️ [CLICK] Avançando para step 10 (índice 9)
🎬 [RENDER] Renderizando step 9...

// Ao finalizar
🏁 [CLICK] Fim da simulação (next_step = null)
🏁 [GAMEOVER] Finalizando simulação...
💾 [GAMEOVER] Salvando resultado: {...}
```

---

## 🚀 Como Usar

### **1. Execute SQL no Supabase**

```bash
1. Abra Supabase Dashboard
2. SQL Editor
3. Cole: supabase-clinical-cases-branching.sql
4. Execute (Run)
5. Verifique: SELECT * FROM clinical_cases;
```

### **2. Teste no App**

```
1. Recarregue (Ctrl + Shift + R)
2. Quiz → Simulador Avançado
3. Escolha uma opção ERRADA de propósito
4. Veja as CONSEQUÊNCIAS aparecerem
5. Continue até o fim
6. Veja seu desfecho (Excelente/Bom/Ruim/Óbito)
```

---

## ✅ Checklist de Implementação

- ✅ SQL com casos de branching completos
- ✅ Script.js modificado (sempre avança, nunca repete)
- ✅ Logs detalhados de debug
- ✅ Múltiplos desfechos possíveis
- ✅ Feedback educativo em cada escolha
- ✅ Sistema de pontuação com valores negativos
- ✅ Documentação completa

---

## 📈 Próximos Casos (Futuro)

1. **Taquicardia Supraventricular**
   - Estável vs Instável
   - Adenosina vs Cardioversão
   - Consequências de errar via aérea

2. **Anafilaxia**
   - Adrenalina timing
   - Via de administração
   - Consequências de atrasos

3. **AVC Isquêmico**
   - Janela terapêutica
   - Critérios para trombólise
   - Consequências de erros

---

**O simulador agora é um JOGO DE DECISÕES REAIS com consequências educativas!** 🎮🏥
