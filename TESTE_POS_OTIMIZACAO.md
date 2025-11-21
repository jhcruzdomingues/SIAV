# GUIA DE TESTE PÓS-OTIMIZAÇÃO

## ✅ Checklist de Testes

### 1. CONFIGURAÇÃO INICIAL

#### a) Verificar arquivo .env
```bash
# Verifique se o arquivo .env existe e contém:
VITE_SUPABASE_URL=sua-url
VITE_SUPABASE_ANON_KEY=sua-chave
MERCADOPAGO_ACCESS_TOKEN=seu-token
```

#### b) Instalar dependências
```bash
npm install
```

**Esperado:** Todas as dependências instaladas sem erros

---

### 2. TESTES DE FUNCIONALIDADE

#### A. Interface Principal
- [ ] Abrir [index.html](index.html) no navegador
- [ ] Verificar se a página carrega sem erros no console
- [ ] Timer de PCR aparece e funciona
- [ ] Botões principais estão visíveis

#### B. Modais
- [ ] **Modal de Paciente:** Abrir e fechar corretamente
- [ ] **Modal de Medicação:** Abrir e fechar corretamente
- [ ] **Modal de Configurações:** Abrir e fechar corretamente
- [ ] **Modal de Planos:** Carrega dinamicamente após 3 segundos

#### C. Validações de Formulário

**Teste do Modal de Paciente:**
1. Tentar salvar sem preencher nome → Deve mostrar erro
2. Tentar salvar peso negativo → Deve mostrar erro
3. Tentar salvar idade > 150 → Deve mostrar erro
4. Preencher corretamente → Deve salvar com sucesso

**Teste de Login/Cadastro:**
1. Tentar login sem email → Deve mostrar erro
2. Tentar login com email inválido → Deve mostrar erro
3. Tentar login com senha < 6 caracteres → Deve mostrar erro
4. Login válido → Deve funcionar

#### D. Timer de PCR
- [ ] Iniciar timer → Deve começar contagem
- [ ] Pausar timer → Deve pausar
- [ ] Reiniciar timer → Deve zerar
- [ ] Ciclo de 2 minutos → Deve alertar

#### E. Medicações
- [ ] Selecionar medicação → Dropdown funciona
- [ ] Calcular dose → Valor correto baseado no peso
- [ ] Registrar medicação → Aparece no histórico

#### F. Choque
- [ ] Botão de choque habilitado
- [ ] Selecionar energia → Validação de valor
- [ ] Aplicar choque → Registra no histórico
- [ ] Energia > 360J → Deve pedir confirmação

---

### 3. TESTES DE INTEGRAÇÃO

#### A. Supabase
```javascript
// Abra o console do navegador (F12) e execute:
window.SIAV.supabase
```
**Esperado:** Objeto do cliente Supabase aparece (não undefined)

#### B. Autenticação
1. Fazer login com conta válida
2. Verificar se dados do perfil carregam
3. Fazer logout
4. Verificar se estado limpa corretamente

#### C. Mercado Pago (se configurado)
1. Abrir modal de planos
2. Selecionar um plano
3. Clicar em "Assinar"
4. Verificar se abre checkout do Mercado Pago

---

### 4. TESTES DE SEGURANÇA

#### A. Credenciais Protegidas
```bash
# Verificar se .env está no .gitignore
cat .gitignore | grep ".env"
```
**Esperado:** Deve retornar ".env"

#### B. Console do Navegador
1. Abrir console (F12)
2. Verificar se não há warnings sobre credenciais hardcoded
3. Verificar se console.logs informativos não aparecem

#### C. Validação de Inputs
1. Tentar injetar HTML em campos de texto: `<script>alert('xss')</script>`
2. Verificar se é sanitizado
3. Tentar valores extremos em campos numéricos

---

### 5. TESTES DE PERFORMANCE

#### A. Carregamento Inicial
1. Abrir DevTools → Network
2. Recarregar página (Ctrl+R)
3. Verificar tempo de carregamento

**Esperado:** < 3 segundos

#### B. Uso de Memória
1. Abrir DevTools → Performance Monitor
2. Usar app por 5 minutos
3. Verificar se memória não aumenta continuamente

**Esperado:** Memória estável (sem memory leak)

---

### 6. TESTES DE COMPATIBILIDADE

#### Navegadores
- [ ] Chrome/Edge (último)
- [ ] Firefox (último)
- [ ] Safari (se disponível)
- [ ] Mobile (Chrome Android / Safari iOS)

#### Responsividade
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

---

### 7. TESTES DO BACKEND

#### A. Iniciar Backend
```bash
node backend-mercadopago.js
```

**Esperado:**
- Servidor inicia na porta 3000
- Mensagem de confirmação aparece
- Sem erros de variável não definida

#### B. Testar Endpoints
```bash
# Teste de criação de preferência (use Postman ou curl)
curl -X POST http://localhost:3000/api/mercadopago/create-preference \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "student",
    "period": "monthly",
    "user": {
      "email": "teste@example.com",
      "name": "Teste"
    }
  }'
```

**Esperado:** Retorna preferência criada com sucesso

---

### 8. TESTES DE BUILD

#### A. Build JavaScript
```bash
npm run build:js
```

**Esperado:** Arquivos .min.js criados sem erros

#### B. Build CSS
```bash
npm run build:css
```

**Esperado:** Arquivos .min.css criados sem erros

#### C. Build Completo
```bash
npm run build
```

**Esperado:** Pasta build/ criada com todos os arquivos

---

## 🐛 PROBLEMAS COMUNS E SOLUÇÕES

### Problema: "supabase is not defined"
**Solução:** Verifique se src/main.js está carregando antes do script.js no index.html

### Problema: "Cannot read property 'supabase' of undefined"
**Solução:** Aguarde o DOM carregar completamente antes de usar window.SIAV

### Problema: Mercado Pago não abre checkout
**Solução:**
1. Verifique se backend está rodando
2. Verifique CORS no backend
3. Verifique public key no mercadopago-config.js

### Problema: Login/Cadastro não funciona
**Solução:**
1. Verifique credenciais do Supabase no .env
2. Verifique RLS (Row Level Security) no Supabase
3. Abra console para ver erro específico

---

## ✅ CRITÉRIOS DE SUCESSO

### Todos os testes passaram se:
- [x] Página carrega sem erros no console
- [x] Todos os modais abrem e fecham
- [x] Validações funcionam corretamente
- [x] Timer de PCR funciona
- [x] Autenticação funciona (se configurada)
- [x] Backend inicia sem erros
- [x] Build gera arquivos minificados
- [x] Nenhuma credencial aparece no console
- [x] App responde em < 3 segundos

---

## 📊 RELATÓRIO DE TESTE

Preencha após executar os testes:

**Data:** ___/___/______

**Testado por:** _________________

**Navegador:** _________________

**Resultados:**
- Funcionalidade: ⬜ OK ⬜ Problemas
- Segurança: ⬜ OK ⬜ Problemas
- Performance: ⬜ OK ⬜ Problemas
- Build: ⬜ OK ⬜ Problemas

**Observações:**
_________________________________
_________________________________
_________________________________

---

**Status Final:** ⬜ APROVADO ⬜ REQUER CORREÇÕES
