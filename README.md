# 🏥 SIAV - Sistema Integrado de Atendimento de Vida

> Progressive Web App para assistência em Parada Cardiorrespiratória (PCR) seguindo protocolos ACLS/PALS AHA 2025

---

## 🚀 Início Rápido

### Teste Local (Automático)
```powershell
.\scripts\teste-rapido.ps1
```

### Build de Produção
```powershell
.\scripts\optimize.ps1
```

### Deploy Manual
```bash
# Arraste a pasta build-optimized/ para netlify.com/drop
```

---

## 📊 Performance Otimizada

- ⚡ **263 KB** total (88.8% menor após otimização completa)
- 🚀 **1.8s** First Contentful Paint (35% mais rápido)
- ⏱️ **3.2s** Time to Interactive (37% mais rápido)
- 📱 PWA instalável offline-first
- 🔒 Integração segura com Mercado Pago

---

## 🏗️ Estrutura do Projeto

```
SIAV/
├── build-optimized/    # 🚀 Versão de produção (otimizada)
├── src/                # 📦 Módulos ES6 (config, services, utils)
├── docs/               # 📚 Documentação completa
├── scripts/            # 🛠️ Scripts de build e teste
├── pages/              # 📄 Páginas de pagamento
├── sounds/             # 🔊 Biblioteca de áudios
├── index.html          # Página principal
├── script.js           # App principal
└── plans-modal-optimized.js  # Modal com neuromarketing
```

---

## 🎯 Funcionalidades

### ⏱️ Timer de PCR
- Cronômetro preciso com ciclos de 2 minutos
- Alertas visuais e sonoros automáticos
- Registro completo de eventos
- Timeline de procedimentos

### 💊 Protocolos Médicos
- **ACLS** adulto (AHA 2025)
- **PALS** pediátrico
- **Adrenalina** automática (doses corretas)
- **Amiodarona** (3 doses)
- Causas reversíveis (5H/5T)
- Cálculo automático de dosagens

### 🔊 Sistema de Áudio
- Metrônomo configurável (100-120 BPM)
- Alertas personalizáveis
- Sons de medicações
- Biblioteca completa de áudios

### 📊 Dashboard
- Histórico de atendimentos
- Estatísticas de PCR
- Relatórios exportáveis
- Gráficos de desempenho

### 💳 Sistema de Pagamentos
- Integração Mercado Pago
- Planos Estudante (R$ 9,90/mês)
- Planos Profissional (R$ 19,90/mês)
- Checkout otimizado com 24 técnicas de neuromarketing

---

## 🔐 Segurança

- ✅ Row Level Security (RLS) habilitado
- ✅ Dados isolados por usuário
- ✅ Autenticação via Supabase
- ✅ Testes de segurança passando (100%)

**Veja:** [docs/SECURITY_TEST.md](docs/SECURITY_TEST.md)

---

## 📦 Stack Tecnológica

- **Frontend:** HTML5, CSS3, JavaScript ES6+
- **Backend:** Supabase (PostgreSQL + Auth)
- **PWA:** Service Worker + Manifest
- **Build:** Terser + cssnano
- **Deploy:** Netlify / Vercel / GitHub Pages

---

## 📚 Documentação

- **[LEIA_PRIMEIRO.md](docs/LEIA_PRIMEIRO.md)** - Guia de início rápido
- **[RELATORIO_OTIMIZACAO_FINAL.md](docs/RELATORIO_OTIMIZACAO_FINAL.md)** - Relatório completo (88.8% redução)
- **[GUIA_TESTES_OTIMIZACAO.md](docs/GUIA_TESTES_OTIMIZACAO.md)** - Checklist de testes
- **[GUIA_MERCADOPAGO.md](docs/GUIA_MERCADOPAGO.md)** - Configuração de pagamentos
- **[OTIMIZACOES_APLICADAS.md](docs/OTIMIZACOES_APLICADAS.md)** - Detalhes técnicos das otimizações

---

## 💻 Desenvolvimento

### Comandos

```bash
# Instalar dependências globais
npm install -g terser cssnano-cli

# Build de produção
build.bat

# Servir localmente
npx http-server . -p 8000

# Servir build
npx http-server build -p 8000
```

### Scripts npm

```bash
npm run build       # Build completo
npm run build:js    # Minificar apenas JS
npm run build:css   # Minificar apenas CSS
npm run serve       # Servidor local (dev)
npm run serve:build # Servidor local (build)
```

---

## 🎯 Arquitetura Modular

### Módulos ES6 (`src/`)

```
src/
├── config/
│   ├── supabase.js      # Configuração Supabase
│   ├── constants.js     # Constantes (PLANS, TIMINGS, BPM)
│   └── state.js         # Estado global
├── services/
│   ├── auth.js          # Autenticação
│   ├── database.js      # CRUD operations
│   └── storage.js       # LocalStorage
├── protocols/
│   └── medical.js       # Lógica de protocolos ACLS/PALS
└── utils/
    ├── formatters.js    # Formatação de dados
    └── medications.js   # Dosagens e cálculos
```

**Sistema dual:** Módulos ES6 convivem com código legado (script.js) para compatibilidade.

---

## 🧪 Testes

```bash
# Teste de segurança (RLS)
# Abra: tests/teste-seguranca.html

# Checklist funcional
# Veja: docs/CHECKLIST_TESTES.md
```

**Status:** ✅ Todos os testes de segurança passando (User2 NÃO vê dados do User1)

---

## 📱 PWA

### Instalação

1. Gerar ícones: Abra `generate-icons.html`
2. Baixar `icon-192.png` e `icon-512.png`
3. Colocar na raiz do projeto

### Cache

- **Service Worker:** v6 (minified)
- **Estratégia:** Network-first (HTML/CSS), Cache-first (JS/assets)
- **Offline:** 100% funcional

---

## 🚀 Deploy

### Netlify (Recomendado)

```bash
# 1. Build
build.bat

# 2. Deploy
# Arraste pasta build/ para netlify.com/drop

# 3. Configurar domínio (opcional)
```

### Vercel

```bash
vercel --prod
```

### GitHub Pages

```bash
# 1. Criar repo
# 2. Push do código
# 3. Settings > Pages > Deploy from branch
```

---

## 📈 Otimizações Aplicadas

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **Tamanho Total** | 2350 KB | 263.7 KB | **-88.8%** |
| **First Contentful Paint** | 2.8s | 1.8s | **-35%** |
| **Time to Interactive** | 5.1s | 3.2s | **-37%** |
| **Requisições Iniciais** | 28 | 18 | **-35%** |

### Técnicas Aplicadas
- ✅ Lazy loading de modal e áudios
- ✅ Scripts com atributo defer
- ✅ Cache busting automático (?v=3)
- ✅ Minificação CSS/JS (88.8% economia)
- ✅ Remoção de código duplicado (220+ linhas)
- ✅ 24 técnicas de neuromarketing no checkout

**Detalhes:** [docs/RELATORIO_OTIMIZACAO_FINAL.md](docs/RELATORIO_OTIMIZACAO_FINAL.md)

---

## 🔧 Ferramentas

- **Terser** - JS minifier (42% economia)
- **cssnano** - CSS minifier (32% economia)
- **Supabase** - Backend as a Service
- **Service Worker** - Cache offline

---

## 📄 Licença

*A definir*

---

## 👨‍💻 Desenvolvido para

Profissionais de saúde (médicos, enfermeiros, socorristas) que precisam de assistência rápida e confiável em situações de Parada Cardiorrespiratória.

**Baseado em:** Diretrizes AHA 2025 (ACLS/PALS)

---

---

**Versão:** 3.0 (Otimizada)  
**Status:** ✅ Produção Ready  
**Última atualização:** Novembro 2025

- **Documentação:** [docs/](docs/)
- **Issues:** GitHub Issues
- **Testes:** [tests/teste-seguranca.html](tests/teste-seguranca.html)

---

**Status:** ✅ Produção Ready | v1.1.0 | Build v6 (Minified)
