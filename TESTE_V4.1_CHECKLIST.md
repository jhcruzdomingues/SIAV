# ✅ CHECKLIST DE TESTES - SIAV V4.1

## 🎯 Limites Implementados
- **FREE:** 1 caso/dia
- **ESTUDANTE:** 10 casos/dia
- **PROFISSIONAL:** Ilimitado
- **VITALÍCIO:** Ilimitado

---

## 📋 TESTES OBRIGATÓRIOS

### **TESTE 1: Plano GRATUITO (1 uso/dia)**

**Arquivo de teste:** `test-usage-limit.html` ✅ FUNCIONANDO

1. ✅ Abrir test-usage-limit.html
2. ✅ Clicar em "🔍 Testar Plano FREE (1 uso)"
3. ✅ Verificar que contador resetou para 0/1
4. ✅ Clicar em "▶️ Simular Uso" (1º uso)
   - **Esperado:** ⚠️ Alerta "Você está usando seu único caso clínico diário"
5. ✅ Clicar novamente em "▶️ Simular Uso" (2º tentativa)
   - **Esperado:** 🚫 BLOQUEIO "Você atingiu o limite de 1 caso clínico diário"

**Arquivo principal:** `index.html`

1. [ ] Abrir index.html no navegador
2. [ ] Abrir Console (F12)
3. [ ] Executar no console:
   ```javascript
   localStorage.clear(); // Limpar dados
   localStorage.setItem('userPlan', 'free'); // Definir plano FREE
   location.reload(); // Recarregar página
   ```
4. [ ] Iniciar uma simulação PCR
   - **Esperado:** ⚠️ Toast de alerta aparece
5. [ ] Tentar iniciar segunda simulação
   - **Esperado:** 🚫 BLOQUEIO + Modal de upgrade abre automaticamente

---

### **TESTE 2: Plano ESTUDANTE (10 usos/dia)**

**Arquivo de teste:** `test-usage-limit.html` ✅ FUNCIONANDO

1. ✅ Clicar em "🔍 Testar Plano ESTUDANTE (10 usos)"
2. ✅ Verificar contador ajustado para 9/10
3. ✅ Clicar em "▶️ Simular Uso" (10º uso)
   - **Esperado:** ⚠️ Alerta "Resta apenas 1 caso clínico hoje"
4. ✅ Clicar novamente (11º tentativa)
   - **Esperado:** 🚫 BLOQUEIO "Você atingiu o limite de 10 casos clínicos diários"

**Arquivo principal:** `index.html`

1. [ ] No console do navegador:
   ```javascript
   localStorage.setItem('userPlan', 'estudante');
   localStorage.setItem('siav_daily_usage', JSON.stringify({
     date: new Date().toDateString(),
     count: 9
   }));
   location.reload();
   ```
2. [ ] Iniciar simulação PCR
   - **Esperado:** ⚠️ Toast "Resta apenas 1 caso clínico hoje"
3. [ ] Tentar iniciar segunda simulação
   - **Esperado:** 🚫 BLOQUEIO + Modal de upgrade

---

### **TESTE 3: Planos ILIMITADOS**

**Plano PROFISSIONAL:**
```javascript
localStorage.setItem('userPlan', 'profissional');
location.reload();
```
- [ ] Iniciar 15+ simulações consecutivas
- **Esperado:** ✅ Todas permitidas, sem bloqueio

**Plano VITALÍCIO:**
```javascript
localStorage.setItem('userPlan', 'vitalicio');
location.reload();
```
- [ ] Iniciar 15+ simulações consecutivas
- **Esperado:** ✅ Todas permitidas, sem bloqueio

---

## 🔍 VERIFICAÇÕES DE CONSOLE

Durante os testes, verificar no Console (F12) as mensagens:

**1º uso (FREE):**
```
🔍 Verificando uso do simulador para plano: free
📋 Limite diário para plano free: 1
📊 Uso atual: 0/1 (restam 1)
✅ Uso permitido - Nova contagem: 1/1
```

**2º tentativa (FREE):**
```
🔍 Verificando uso do simulador para plano: free
📋 Limite diário para plano free: 1
📊 Uso atual: 1/1 (restam 0)
🚫 LIMITE DIÁRIO ATINGIDO!
```

**9º uso (ESTUDANTE):**
```
🔍 Verificando uso do simulador para plano: estudante
📋 Limite diário para plano estudante: 10
📊 Uso atual: 9/10 (restam 1)
⚠️ ALERTA: Resta apenas 1 simulação de cortesia!
```

---

## 🎨 VERIFICAÇÕES VISUAIS

### Toast de Alerta (⚠️ Warning)
- [ ] Cor de fundo: Laranja (#f39c12)
- [ ] Ícone: ⚠️
- [ ] Mensagem: "Resta apenas X caso(s) clínico(s) hoje"
- [ ] Auto-fecha em 4 segundos
- [ ] Aparece no canto superior direito

### Toast de Bloqueio (🚫 Danger)
- [ ] Cor de fundo: Vermelho (#e74c3c)
- [ ] Ícone: 🚫
- [ ] Mensagem: "Limite atingido!"
- [ ] Permanece por 6 segundos
- [ ] Aparece no canto superior direito

### Modal de Upgrade
- [ ] Abre automaticamente após bloqueio
- [ ] Exibe mensagem de urgência vermelha no topo
- [ ] Mostra os 4 planos (FREE, ESTUDANTE, PROFISSIONAL, VITALÍCIO)
- [ ] Toggle Mensal/Anual funciona corretamente
- [ ] Preços atualizam ao alternar período

---

## 📊 TESTES DE RESET DIÁRIO

**Simular novo dia:**
```javascript
// Definir data de ontem no contador
const ontem = new Date();
ontem.setDate(ontem.getDate() - 1);
localStorage.setItem('siav_daily_usage', JSON.stringify({
  date: ontem.toDateString(),
  count: 10 // Contador cheio
}));
location.reload();
```

- [ ] Iniciar simulação
- **Esperado:** ✅ Contador resetou para 0 (novo dia detectado)

---

## ✅ CRITÉRIOS DE SUCESSO

- [ ] Plano FREE bloqueia no 2º uso
- [ ] Plano ESTUDANTE bloqueia no 11º uso
- [ ] Alerta de "último uso" aparece corretamente
- [ ] Modal de upgrade abre após bloqueio
- [ ] Planos ilimitados nunca bloqueiam
- [ ] Reset diário funciona (00:00)
- [ ] Mensagens corretas no console
- [ ] Toast notifications aparecem e fecham
- [ ] localStorage persiste entre recargas

---

## 🐛 POSSÍVEIS PROBLEMAS

### Problema: Bloqueio não funciona
**Solução:**
1. Limpar cache do navegador (Ctrl+Shift+Delete)
2. Verificar console por erros JavaScript
3. Confirmar que script.js foi recarregado (verificar timestamp)

### Problema: Modal não abre
**Solução:**
1. Verificar se `plans-modal.html` está incluído no index.html
2. Verificar se `plans-modal-optimized.js` está carregado
3. No console: `typeof window.showUpgradeModal` deve retornar "function"

### Problema: Contador não reseta
**Solução:**
1. Verificar timezone do sistema
2. Limpar localStorage: `localStorage.clear()`
3. Verificar função `getUsageData()` no console

---

## 📝 COMANDOS ÚTEIS (Console do navegador)

```javascript
// Ver dados de uso atual
JSON.parse(localStorage.getItem('siav_daily_usage'))

// Ver plano atual
localStorage.getItem('userPlan')

// Resetar tudo
localStorage.clear()

// Definir plano específico
localStorage.setItem('userPlan', 'estudante')

// Ajustar contador manualmente
localStorage.setItem('siav_daily_usage', JSON.stringify({
  date: new Date().toDateString(),
  count: 9
}))

// Forçar modal de upgrade
window.showUpgradeModal({
  upgradeRequired: true,
  message: 'Teste manual'
})
```

---

## 🎯 META DE CONVERSÃO

**Funil esperado (FREE → PAGO):**
1. Dia 1: Usuário testa 1 vez, quer continuar → **BLOQUEIO**
2. Modal de upgrade aparece com urgência
3. Conversão para ESTUDANTE (R$ 19,92/mês anual)
4. **Taxa de conversão alvo: 15-25%**

**Funil esperado (ESTUDANTE → PROFISSIONAL):**
1. Usuário usa 10 casos/dia consistentemente
2. Atinge limite regularmente
3. Vê valor no produto
4. Upgrade para PROFISSIONAL (ilimitado + features)
5. **Taxa de upgrade alvo: 10-15%**

---

**SIAV V4.1 - Sistema de Limites Otimizado**
**Última atualização:** $(date)
