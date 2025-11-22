# 🧪 Checklist de Testes - Correções de Bugs

## ✅ Preparação

1. Abra o arquivo `index.html` no navegador
2. Abra o Console do DevTools (F12 → Console)
3. Verifique se não há erros de sintaxe JavaScript

---

## 🧪 Testes das Correções

### 1️⃣ Timer PCR (src/pcr/timer.js)

**Bug corrigido:** Erro de sintaxe (chave `}` extra na linha 100)

**Como testar:**
1. Navegue até a funcionalidade de Timer PCR
2. Clique em "Iniciar Timer"
3. Verifique se o timer começa a contar (00:01, 00:02, etc.)
4. Clique em "Parar Timer"
5. Verifique se o timer para corretamente

**✅ Resultado esperado:**
- Timer inicia, conta e para sem erros no console
- Nenhum erro de sintaxe aparece

---

### 2️⃣ Modal de Planos (plans-modal-optimized.js)

**Bug corrigido:** Redeclaração da variável `toggle`

**Como testar:**
1. Abra o modal de planos (botão "Assinar" ou similar)
2. Alterne entre "Mensal" e "Anual" usando o toggle
3. Verifique se os preços mudam corretamente
4. No mobile, verifique se a animação do toggle funciona
5. Feche o modal (X ou ESC)

**✅ Resultado esperado:**
- Toggle funciona sem erros no console
- Preços alternam entre mensal/anual
- Modal fecha corretamente
- Nenhum erro "Uncaught ReferenceError: toggle is not defined"

---

### 3️⃣ Validação de Dados de Pagamento (mercadopago-integration.js)

**Bug corrigido:** Fallbacks perigosos removidos (`usuario@exemplo.com`, `Usuário SIAV`)

**Como testar SEM login:**
1. Abra o navegador em modo anônimo (Ctrl+Shift+N)
2. Limpe o localStorage:
   ```javascript
   localStorage.clear()
   ```
3. Tente selecionar um plano
4. Verifique a mensagem de erro

**✅ Resultado esperado:**
```
Erro: Dados do usuario nao encontrados. Por favor, faca login novamente.
```

**Como testar COM login:**
1. Faça login no sistema
2. Verifique o localStorage:
   ```javascript
   console.log('Email:', localStorage.getItem('userEmail'))
   console.log('Nome:', localStorage.getItem('userName'))
   ```
3. Selecione um plano
4. Verifique se o checkout inicia com seus dados reais

**✅ Resultado esperado:**
- Com dados válidos: checkout inicia normalmente
- Sem dados: erro claro e checkpoint não inicia com dados fake

---

### 4️⃣ Memory Leak de Countdown

**Bug corrigido:** Interval do countdown não era limpo

**Como testar:**
1. Abra o modal de planos
2. Observe o countdown iniciando (00:23:45:12...)
3. Feche o modal (X ou ESC)
4. Reabra o modal
5. No console, digite:
   ```javascript
   // Verificar se há múltiplos countdowns rodando
   console.log('Countdown atual:', document.getElementById('final-countdown')?.textContent)
   ```

**✅ Resultado esperado:**
- Ao fechar modal: countdown para
- Ao reabrir modal: countdown reinicia do zero
- Nenhum erro de múltiplos timers rodando

---

### 5️⃣ Validação de Elementos DOM

**Bug corrigido:** Warnings adicionados quando elementos não existem

**Como testar:**
1. Abra o Console (F12)
2. Execute o modal de planos
3. Verifique se há warnings úteis (não erros):
   ```
   ⚠️ Elemento countdown não encontrado no DOM
   ⚠️ Modal de planos não encontrado
   ```

**✅ Resultado esperado:**
- Warnings informativos (não erros que quebram o app)
- App continua funcionando mesmo se elemento não existir

---

### 6️⃣ Segurança de innerHTML

**Bug corrigido:** Comentários de segurança adicionados

**Como testar:**
1. Abra os arquivos:
   - `mercadopago-integration.js:284`
   - `plans-modal-optimized.js:333`
2. Verifique se há comentário:
   ```javascript
   // SEGURO: HTML estático sem dados de usuário
   ```

**✅ Resultado esperado:**
- Comentários de segurança presentes
- HTML renderizado é estático (sem XSS)

---

## 📊 Relatório de Testes

Após executar todos os testes, preencha:

- [ ] Timer PCR funciona
- [ ] Toggle de planos funciona
- [ ] Validação de pagamento bloqueia dados inválidos
- [ ] Countdown não vaza memória
- [ ] Warnings úteis aparecem no console
- [ ] Sem erros de sintaxe

---

## 🐛 Se Encontrar Problemas

Se algum teste falhar:

1. Anote o erro exato do console
2. Anote os passos para reproduzir
3. Tire um screenshot se necessário
4. Reporte o bug

---

## ✅ Verificar Mudanças no Git

```bash
# Ver arquivos modificados
git diff HEAD~1 --stat

# Ver detalhes das mudanças
git show HEAD
```
