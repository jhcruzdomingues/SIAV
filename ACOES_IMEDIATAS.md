# ⚡ AÇÕES IMEDIATAS - CHECKLIST

## 🚨 ANTES DE USAR O APP

### 1️⃣ Instalar Dependências (OBRIGATÓRIO)
```bash
npm install
```
**Por quê:** Novas dependências foram adicionadas (terser, cssnano, etc.)

---

### 2️⃣ Verificar Arquivo .env (CRÍTICO)
✅ O arquivo `.env` já existe e contém suas credenciais
❌ **NUNCA** commite este arquivo no git

**Verificar se contém:**
```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
MERCADOPAGO_ACCESS_TOKEN=...
```

---

### 3️⃣ Testar o App Localmente

**Opção A - Servidor HTTP simples:**
```bash
npm run serve
```

**Opção B - Live Server (VS Code):**
- Clique direito em `index.html`
- "Open with Live Server"

**Verificar:**
- ✅ Página abre sem erros
- ✅ Console não mostra erros críticos
- ✅ Timer funciona
- ✅ Modais abrem

---

### 4️⃣ Testar Backend (se usar Mercado Pago)

**Terminal 1 - Iniciar backend:**
```bash
node backend-mercadopago.js
```

**Deve mostrar:**
```
Servidor rodando na porta 3000
```

**Verificar:**
- ✅ Inicia sem erros
- ✅ Não mostra "MERCADOPAGO_ACCESS_TOKEN não configurado"

---

### 5️⃣ Verificar Git (IMPORTANTE)

**Verificar se .env está protegido:**
```bash
git status
```

**O arquivo .env NÃO deve aparecer!**

Se aparecer:
```bash
git rm --cached .env
git add .gitignore
git commit -m "Proteger credenciais"
```

---

## 🎯 TESTES RÁPIDOS (5 MINUTOS)

### Teste 1 - Interface
- [ ] Abrir app no navegador
- [ ] Apertar F12 (abrir console)
- [ ] Não deve ter erros vermelhos

### Teste 2 - Timer
- [ ] Clicar em "Iniciar PCR"
- [ ] Timer deve começar a contar
- [ ] Pausar e retomar deve funcionar

### Teste 3 - Validações
- [ ] Abrir modal de paciente
- [ ] Tentar salvar sem nome → deve dar erro
- [ ] Preencher e salvar → deve funcionar

### Teste 4 - Login (se configurado)
- [ ] Tentar login com email inválido → deve dar erro
- [ ] Login correto → deve funcionar

---

## 🚀 BUILD PARA PRODUÇÃO

### Quando estiver tudo OK:
```bash
npm run build
```

**Deve criar arquivos .min.js e .min.css**

---

## ⚠️ PROBLEMAS COMUNS

### "Cannot find module 'terser'"
**Solução:** Execute `npm install`

### "supabase is not defined"
**Solução:** Recarregue a página (Ctrl+R)

### Mercado Pago não abre
**Solução:**
1. Backend rodando? `node backend-mercadopago.js`
2. CORS configurado? Verifique allowedOrigins em backend-mercadopago.js

### Login não funciona
**Solução:**
1. Credenciais corretas no .env?
2. Supabase configurado com RLS?

---

## ✅ PRONTO PARA USAR QUANDO:

- [x] `npm install` executado sem erros
- [x] App abre no navegador
- [x] Console sem erros críticos
- [x] Timer funciona
- [x] Validações funcionam
- [x] .env protegido (.gitignore)
- [x] Backend inicia (se usar pagamentos)

---

## 📞 EM CASO DE DÚVIDA

**Consulte:**
1. [RESUMO_OTIMIZACOES.md](RESUMO_OTIMIZACOES.md) - Visão geral
2. [OTIMIZACOES.md](OTIMIZACOES.md) - Detalhes técnicos
3. [TESTE_POS_OTIMIZACAO.md](TESTE_POS_OTIMIZACAO.md) - Guia completo de testes

---

**Tempo estimado:** ⏱️ 10-15 minutos para tudo

**Dificuldade:** 🟢 Fácil

**Status atual:** ✅ Código otimizado e pronto para uso
