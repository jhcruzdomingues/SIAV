# 🚀 Simulador Avançado - Guia de Implementação

## ✅ Implementação Concluída

Todas as 4 tarefas foram implementadas com sucesso:

### ✅ TAREFA 1: SQL para Supabase
- ✔️ Arquivo criado: `supabase-clinical-cases.sql`
- ✔️ Tabela `clinical_cases` com estrutura completa
- ✔️ 3 casos clínicos de exemplo (seed data)
- ✔️ Row Level Security (RLS) configurado para leitura pública

### ✅ TAREFA 2: Lógica de Banco de Dados
- ✔️ Função `fetchRandomClinicalCase()` implementada em `src/services/database.js`
- ✔️ Tratamento de erros robusto
- ✔️ Logs de depuração incluídos

### ✅ TAREFA 3: Interface e Lógica de Seleção
- ✔️ Dois cards de seleção adicionados no `index.html`
- ✔️ Verificação de conexão online implementada
- ✔️ Event listeners configurados em `script.js`
- ✔️ Função `startAdvancedSimulator()` criada
- ✔️ Modal bonito e responsivo para apresentar casos clínicos

### ✅ TAREFA 4: Estilização
- ✔️ Classe `.quiz-mode-card` criada em `style.css`
- ✔️ Indicador visual (badge "Online" com ícone Wi-Fi)
- ✔️ Animações e efeitos hover
- ✔️ Dark mode suportado
- ✔️ Responsivo para mobile

---

## 📋 PRÓXIMO PASSO: Executar o SQL no Supabase

### Passo 1: Acessar o Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Faça login no seu projeto SIAV
3. No menu lateral, clique em **"SQL Editor"**

### Passo 2: Executar o SQL

1. Abra o arquivo `supabase-clinical-cases.sql` (está na raiz do projeto)
2. Copie **TODO** o conteúdo do arquivo
3. No SQL Editor do Supabase, cole o código completo
4. Clique em **"Run"** (ou pressione `Ctrl + Enter`)

### Passo 3: Verificar a Criação

Após executar, você deve ver a mensagem de sucesso. Para confirmar:

1. No menu lateral, clique em **"Table Editor"**
2. Você deve ver a nova tabela `clinical_cases`
3. Clique nela para ver os 3 casos clínicos de exemplo

---

## 🧪 Testando o Recurso

### Teste 1: Verificar os Cards

1. Execute o aplicativo SIAV
2. Navegue até **"Simulado de Quiz"**
3. Você deve ver 2 cards:
   - **📚 Banco de Questões** (funciona offline)
   - **⚡ Simulador Avançado** (com badge "Online")

### Teste 2: Modo Offline

1. **Desconecte** sua internet (ou use o DevTools para simular offline)
2. Clique no card **"Simulador Avançado"**
3. Você deve ver o alerta:
   ```
   ⚠️ Conexão com a internet necessária para o Simulador Avançado

   Este modo requer acesso online ao banco de casos clínicos.
   ```

### Teste 3: Modo Online

1. **Conecte** sua internet
2. Clique no card **"Simulador Avançado"**
3. Deve aparecer "🔄 Carregando caso clínico..."
4. Um modal bonito deve abrir com:
   - Título do caso (ex: "Paciente com Taquicardia Instável")
   - Nível de dificuldade (🟢 Fácil / 🟡 Médio / 🔴 Difícil)
   - Cenário clínico completo
   - Sinais vitais iniciais (FC, PA, SpO₂, etc.)
   - Instruções para o usuário

### Teste 4: Banco de Questões (Modo Tradicional)

1. Clique no card **"📚 Banco de Questões"**
2. O formulário de configuração tradicional deve aparecer
3. Configure o simulado e clique em "Iniciar Simulado"
4. O quiz tradicional deve funcionar normalmente

---

## 📊 Estrutura da Tabela `clinical_cases`

```sql
- id (UUID) - Chave primária
- title (VARCHAR) - Título do caso
- description (TEXT) - Cenário completo
- initial_vitals (JSONB) - Sinais vitais em JSON
- difficulty (VARCHAR) - facil, medio, dificil
- correct_sequence (JSONB) - Sequência de ações esperadas
- expected_interventions (JSONB) - Intervenções-chave
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

## 🎯 Casos Clínicos Incluídos

### Caso 1: Taquicardia Instável (Médio)
- Paciente: Mulher, 62 anos, hipertensa
- Cenário: Palpitações e tontura há 30 minutos
- FC: 180 bpm | PA: 85/60 | SpO₂: 92%
- Ritmo: Taquicardia Supraventricular

### Caso 2: PCR em Fibrilação Ventricular (Difícil)
- Paciente: Homem, 58 anos, diabético
- Cenário: Colapso súbito durante refeição
- FC: 0 | PA: Ausente | SpO₂: Indetectável
- Ritmo: Fibrilação Ventricular

### Caso 3: Bradicardia Sintomática (Fácil)
- Paciente: Mulher, 78 anos, com marca-passo
- Cenário: Fraqueza progressiva e tontura
- FC: 38 bpm | PA: 90/60 | SpO₂: 94%
- Ritmo: Bradicardia Sinusal

---

## 🔐 Segurança (RLS)

A política RLS está configurada para:
- ✅ **Leitura pública** - Qualquer usuário pode LER os casos clínicos
- ❌ **Escrita restrita** - Apenas admins podem INSERIR/ATUALIZAR/DELETAR

Isso garante que os usuários possam acessar os casos, mas não podem modificá-los.

---

## 🚀 Próximos Passos (Opcional)

### Adicionar Mais Casos Clínicos

Para adicionar novos casos, execute SQL no Supabase:

```sql
INSERT INTO clinical_cases (title, description, initial_vitals, difficulty, correct_sequence) VALUES
(
    'Seu Novo Caso Aqui',
    'Descrição completa do cenário...',
    '{"fc": 120, "pa": "100/70", "spo2": 95, "fr": 20, "consciencia": "Alerta", "ritmo_inicial": "Taquicardia Sinusal"}'::jsonb,
    'medio',
    '["Ação 1", "Ação 2", "Ação 3"]'::jsonb
);
```

### Implementar Interatividade Completa

Atualmente, o modal exibe o caso clínico mas mostra um alerta de "Funcionalidade em desenvolvimento".

Para implementar a interatividade completa, você precisará:
1. Criar um sistema de quiz interativo baseado no `correct_sequence`
2. Permitir que o usuário selecione ações em ordem
3. Validar as ações contra a sequência correta
4. Fornecer feedback em tempo real

---

## 📞 Suporte

Se encontrar algum problema:

1. Verifique o console do navegador (F12) para erros
2. Confirme que a tabela foi criada no Supabase
3. Verifique se o RLS está habilitado
4. Teste a conexão com a internet

---

## 🎉 Conclusão

O **Simulador Avançado** está implementado e pronto para uso!

Execute o SQL no Supabase e comece a testar os casos clínicos online.

**Desenvolvido com ❤️ para o SIAV**
