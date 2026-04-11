/**
 * Gerencia a visibilidade de elementos de venda com base no plano
 */
function manageProVisibility() {
    // Verifica o plano com segurança (default para 'free' se nulo)
    const userPlan = (state.currentUser?.plan || 'free').toLowerCase();
    const isPro = (userPlan === 'professional' || userPlan === 'pro');

    console.log('🎨 Ajustando visibilidade PRO. Plano:', userPlan);

    // LISTA DE IDs DE ELEMENTOS QUE DEVEM SUMIR PARA PROS
    const salesElements = [
        'upgrade-plan-btn',       // Botão grande do Dashboard
        'login-to-dashboard-btn', // Card de Login/Venda no topo
        'upgrade-modal-trigger',  // Gatilhos extras
        'premium-banner'          // Banners promocionais (se houver)
    ];

    salesElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (isPro) {
                // Se for PRO, esconde o elemento de venda
                el.style.display = 'none'; 
            } else {
                // Se NÃO for PRO, restaura (remove o inline style para assumir o CSS)
                el.style.display = ''; 
            }
        }
    });

    // AJUSTE DE LAYOUT:
    // Se o botão de upgrade sumir, o botão de "Histórico Completo" deve ocupar 100% da largura
    const historyBtn = document.getElementById('view-full-log-btn');
    if (historyBtn) {
        if (isPro) {
            historyBtn.style.width = '100%';
            historyBtn.classList.remove('secondary'); // Opcional: torna-o primário
            historyBtn.classList.add('primary-btn'); 
        } else {
            historyBtn.style.width = ''; // Volta ao normal
        }
    }
}
// =============================================
// SISTEMA DE DEA INTELIGENTE E PROTOCOLOS
// =============================================

// --- CONFIGURAÇÃO DO SUPABASE ---
// ⚠️ O cliente Supabase é inicializado em src/main.js (módulo ES6)
// Acessível via: window.SIAV.supabase
// Esta abordagem elimina duplicação e usa variáveis de ambiente
console.log('Diagnóstico Supabase:', {
    SIAV_supabase: window.SIAV?.supabase,
    supabaseClient: window.supabaseClient,
    window_supabase: window.supabase
});

// Use sempre o cliente global Supabase já inicializado
// window.supabaseClient é a referência correta

// Estrutura para o Plano padrão
const DEFAULT_USER_DATA = {
    name: 'Convidado',
    profession: 'Profissional de Saúde',
    plan: 'free'
};
// --- FIM DA CONFIGURAÇÃO SUPABASE ---
let audioContext;

// Cache de elementos DOM para performance
const DOM_CACHE = {
    pcrTimer: null,
    hintBox: null,
    hintMessage: null,
    hintIcon: null,
    currentStep: null,
    cycleInfo: null,
    progressBar: null,
    compBtn: null,
    metroBtn: null,
    metroStatus: null,
    bpmValue: null,
    timelineEvents: null
};

// Função para inicializar cache de elementos DOM
function initDOMCache() {
    DOM_CACHE.pcrTimer = document.getElementById('pcr-timer');
    DOM_CACHE.hintBox = document.getElementById('protocol-hint-box');
    DOM_CACHE.hintMessage = document.getElementById('hint-message');
    DOM_CACHE.hintIcon = document.getElementById('hint-icon');
    DOM_CACHE.currentStep = document.getElementById('current-step');
    DOM_CACHE.cycleInfo = document.getElementById('cycle-info');
    DOM_CACHE.progressBar = document.getElementById('cycle-progress');
    DOM_CACHE.compBtn = document.getElementById('compressions-btn');
    DOM_CACHE.metroBtn = document.getElementById('metro-btn');
    DOM_CACHE.metroStatus = document.getElementById('metro-status');
    DOM_CACHE.bpmValue = document.getElementById('bpm-value');
    DOM_CACHE.timelineEvents = document.getElementById('timeline-events');
}

// Mapeamento dos níveis de acesso e prioridade de planos
const PLAN_PRIORITY = {
    'free': 0,
    'student': 1,
    'professional': 2
};

const ACCESS_LEVELS = {
    'log_history': 'free', // Todos podem ver logs, mas com limites de salvamento
    'quiz_simulations': 'free', // Todos podem acessar, mas com limites de uso (Free=1, Student=10, Pro=ilimitado)
    'study_review': 'student',
    'advanced_dashboard': 'professional',
    'notes_logging': 'professional',
    'med_logging': 'professional',
    'pdf_download': 'student'
};

/**
 * Objeto que gerencia o ciclo de compressões torácicas.
 * 
 * Cada ciclo dura 2 minutos (120.000ms) conforme protocolo ACLS.
 * 
 * @property {boolean} active - Se as compressões estão em andamento
 * @property {number|null} startTime - Timestamp do início do ciclo atual
 * @property {number} cycleCount - Número do ciclo atual (incrementa a cada 2 min)
 * @property {string} currentPhase - Fase atual: 'preparation'|'compressions'|'rhythm_check'|'shock_advised'
 * @property {number|null} cycleTimer - Timeout do ciclo de 2 minutos
 * @property {number} cycleProgress - Progresso do ciclo (0-100%)
 * @property {number} compressionTime - Tempo total de compressões em segundos
 * @property {number|null} pauseStartTime - Timestamp do início da pausa
 * @property {boolean|undefined} lastRhythmWasShockable - Se o último ritmo foi chocável
 * @property {boolean} rhythmCheckTriggered - Flag para prevenir múltiplos prompts
 */
let compressionCycle = {
    active: false,
    startTime: null,
    cycleCount: 0,
    currentPhase: 'preparation', 
    cycleTimer: null, 
    cycleProgress: 0,
    compressionTime: 0, 
    pauseStartTime: null,
    lastRhythmWasShockable: undefined,
    rhythmCheckTriggered: false // Previne múltiplos prompts
};

/**
 * ESTADO GLOBAL DA APLICAÇÃO SIAV
 * Este objeto centraliza todo o estado do aplicativo para facilitar persistência e debugging.
 * 
 * @property {boolean} pcrActive - Indica se há um atendimento de PCR ativo
 * @property {number|null} pcrStartTime - Timestamp do início da PCR
 * @property {number} pcrSeconds - Tempo total decorrido em segundos
 * @property {boolean} metronomeActive - Estado do metrônomo
 * @property {number} bpm - Batimentos por minuto do metrônomo (100-120)
 * @property {Array} events - Histórico de eventos da PCR
 * @property {Object} patient - Dados do paciente
 * @property {Array} notes - Anotações clínicas
 * @property {number} shockCount - Número de choques aplicados
 * @property {Array} medications - Medicações administradas
 * @property {Array} rhythms - Ritmos cardíacos avaliados
 * @property {number} totalCompressionSeconds - Tempo total de compressões
 * @property {boolean} roscAchieved - Se houve retorno à circulação espontânea
 * @property {Array} causesChecked - Causas 5H/5T verificadas
 * @property {string} currentScreen - Tela atual da aplicação
 * @property {Object} currentUser - Dados do usuário logado
 * @property {Object} quiz - Estado do quiz/simulado
 * @property {Array} quizResults - Resultados históricos de quizzes
 * @property {Array} patientLog - Histórico de atendimentos (profissional)
 * @property {Object} tempRhythmData - Dados temporários de seleção de ritmo
 */

// =======================================================
// ESTADO GLOBAL INTEGRADO COM MÓDULOS ES6
// =======================================================
// Inicializamos o objeto global window.state unindo com qualquer dado que
// já tenha sido injetado pelo src/config/state.js, impedindo que o script legado perca estado.
window.state = Object.assign({
    pcrActive: false,
    pcrStartTime: null,
    pcrSeconds: 0,
    metronomeActive: false,
    bpm: 110,
    events: [],
    patient: { weight: 70, age: 30, name: '', sex: '', allergies: '', comorbidities: '' },
    notes: [],
    shockCount: 0,
    medications: [], 
    rhythms: [], 
    totalCompressionSeconds: 0, 
    roscAchieved: false, 
    causesChecked: [], 
    currentScreen: 'home',
    currentUser: {
        isLoggedIn: false, name: DEFAULT_USER_DATA.name, email: null,
        profession: DEFAULT_USER_DATA.profession, councilRegister: null,
        plan: DEFAULT_USER_DATA.plan, token: null, id: null, phone: null, birthDate: null
    },
    quiz: { active: false, questions: [], currentQuestionIndex: 0, score: 0, config: {} },
    quizResults: [], 
    patientLog: [], 
    tempRhythmData: { rhythm: null, notes: null }
}, window.state || {});

let state = window.state;

let intervals = {
    timer: null,
    metronome: null,
    progress: null,
    drugTimer: null,
};

// Feedback visual/tátil para ações críticas
function feedbackCritico(btnId) {
    // Vibração
    if ('vibrate' in navigator) {
        navigator.vibrate([120, 60, 120]);
    }
    // Animação visual
    if (btnId) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.classList.remove('feedback-critico-anim');
            // Força reflow para reiniciar animação
            void btn.offsetWidth;
            btn.classList.add('feedback-critico-anim');
        }
    }
}


// ===============================================
// FUNÇÕES DE MONETIZAÇÃO E ACESSO
// ===============================================

function showUpgradeModal(requiredPlan) {
    // Redireciona direto para a página de vendas (modal de planos)
    if (typeof openPlansModal === 'function') {
        openPlansModal();
    } else if (window.openPlansModal) {
        window.openPlansModal();
    } else {
        const modal = document.getElementById('upgrade-modal');
        const title = document.getElementById('upgrade-plan-title');
        const requiredLevelText = document.getElementById('required-level');
        const restrictionText = document.getElementById('restriction-text');
        
        if (!modal || !title) return;

        let planInfo = {};

        switch (requiredPlan) {
            case 'student':
                planInfo = { 
                    title: "ESTUDANTE (R$ 9,90/mês)", 
                    level: "Estudante",
                    restriction: "Esta funcionalidade (Revisão, Simulado e PDFs) é exclusiva para assinantes dos planos Estudante e Profissional.",
                    color: 'var(--success)'
                };
                break;
            case 'professional':
                planInfo = { 
                    title: "PROFISSIONAL (R$ 19,90/mês)", 
                    level: "Profissional",
                    restriction: "Esta funcionalidade (Log de Atendimento/Salvar Dados) é exclusiva para o Plano Profissional.",
                    color: 'var(--danger)'
                };
                break;
            default:
                return;
        }

        title.textContent = `🚨 Upgrade Necessário: ${planInfo.title}`;
        if (requiredLevelText) requiredLevelText.textContent = planInfo.level;
        if (restrictionText) restrictionText.textContent = planInfo.restriction;
        title.style.color = planInfo.color;

        modal.classList.add('show');
    }
}

function checkAccess(featureKey, requireUpgradeModal = true) {
    
    if (!state.currentUser.isLoggedIn && ACCESS_LEVELS[featureKey] !== 'free') {
        if (requireUpgradeModal) {
            alert("Acesso restrito. Por favor, faça Login para continuar."); 
            showProfileModal();
        }
        return false;
    }
    
    const requiredPlan = ACCESS_LEVELS[featureKey] || 'free'; 
    const userPlan = state.currentUser.plan; 

    const userPriority = PLAN_PRIORITY[userPlan];
    const requiredPriority = PLAN_PRIORITY[requiredPlan];

    if (userPriority >= requiredPriority) {
        return true;
    } else {
        if (requireUpgradeModal) {
            showUpgradeModal(requiredPlan); 
        }
        return false;
    }
}

function startSubscriptionFlow() {
    // Redireciona para a página de vendas (modal de planos)
    if (typeof openPlansModal === 'function') {
        openPlansModal();
    } else if (window.openPlansModal) {
        window.openPlansModal();
    } else {
        console.error('Função openPlansModal não encontrada');
        alert('Não foi possível abrir a página de planos. Tente novamente.');
    }
}


// ===============================================
// FUNÇÕES DE PERSISTÊNCIA E SUPABASE
// ===============================================

async function fetchUserProfile(userId, userEmail) {
    try {
        const { data, error, status } = await supabase
            .from('profiles')
            .select('plan, full_name, profession, council_register, phone_number, birth_date')
            .eq('id', userId)
            .single();

        if (error && status !== 406) {
            throw error;
        }

        if (data) {
            console.log('Perfil carregado do Banco de Dados:', data);
            
            state.currentUser.name = data.full_name || userEmail.split('@')[0]; 
            state.currentUser.profession = data.profession || DEFAULT_USER_DATA.profession;
            state.currentUser.plan = data.plan || 'free'; 
                        console.log('[DEBUG] Plano atualizado do perfil:', state.currentUser.plan);
            state.currentUser.councilRegister = data.council_register || null;
            state.currentUser.phone = data.phone_number || null;
            state.currentUser.birthDate = data.birth_date || null;

            // Chama a função de limpeza visual após atualizar o perfil
            manageProVisibility();
            
        } else {
            state.currentUser.name = userEmail ? userEmail.split('@')[0] : DEFAULT_USER_DATA.name;
            state.currentUser.profession = DEFAULT_USER_DATA.profession;
            state.currentUser.plan = 'free'; 
                        console.log('[DEBUG] Plano setado como free (perfil não encontrado)');
                console.log('[DEBUG] Plano setado como free (erro ao buscar perfil)');
            console.warn('Não foi possível encontrar um perfil, usando plano "free" padrão.');
        }
        
    } catch (error) {
        console.error("Erro ao buscar perfil do usuário:", error.message);
        state.currentUser.name = userEmail ? userEmail.split('@')[0] : DEFAULT_USER_DATA.name;
        state.currentUser.profession = DEFAULT_USER_DATA.profession;
        state.currentUser.plan = 'free';
    }
    
    saveState();
}

async function loadUserFromSession(session) {
    if (session && session.user) {
        const user = session.user;
        
        state.currentUser.isLoggedIn = true;
        state.currentUser.id = user.id;
        state.currentUser.email = user.email;
        state.currentUser.token = session.access_token;
        
        await fetchUserProfile(user.id, user.email);

        console.log(`✅ Supabase Session Loaded for: ${user.email} (${state.currentUser.plan.toUpperCase()})`);

    } else {
        state.currentUser.isLoggedIn = false;
        state.currentUser.id = null;
        state.currentUser.email = null;
        state.currentUser.token = null;
        state.currentUser.name = DEFAULT_USER_DATA.name;
        state.currentUser.profession = DEFAULT_USER_DATA.profession;
        state.currentUser.plan = DEFAULT_USER_DATA.plan;
            console.log('[DEBUG] Plano resetado para default:', state.currentUser.plan);
            console.log('[DEBUG] Plano alterado manualmente:', state.currentUser.plan);
            console.log('[DEBUG] Plano setado como free (usuário sem perfil)');
            console.log('[DEBUG] Plano setado como free (usuário sem perfil 2)');
            console.log('[DEBUG] Plano setado como free (usuário sem perfil 3)');
            console.log('[DEBUG] Plano resetado para default (logout):', state.currentUser.plan);
        state.currentUser.councilRegister = null;
        state.currentUser.phone = null;
        state.currentUser.birthDate = null;
    }
}

// =============================================
// VERIFICAÇÃO E MONITORAMENTO DE AUTENTICAÇÃO
// =============================================

/**
 * Verifica o estado atual de autenticação e atualiza state.currentUser
 * Garante que isLoggedIn seja definido corretamente
 */
async function checkAuthStatus() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.error('Erro ao verificar sessão:', error);
            resetUserState();
            return;
        }

        if (session && session.user) {
            const user = session.user;

            // Define explicitamente o estado de login
            state.currentUser.isLoggedIn = true;
            state.currentUser.id = user.id;
            state.currentUser.email = user.email;
            state.currentUser.token = session.access_token;

            // Busca perfil do banco de dados
            await fetchUserProfile(user.id, user.email);

            console.log(`✅ Sessão verificada: ${user.email} | Plano: ${state.currentUser.plan.toUpperCase()} | isLoggedIn: ${state.currentUser.isLoggedIn}`);

            // Atualiza interface
            updateGreetingsAndHeader();
            updateDashboard();

        } else {
            // Sem sessão - reseta estado do usuário
            resetUserState();
            console.log('ℹ️ Nenhuma sessão ativa encontrada');
        }

    } catch (error) {
        console.error('Erro em checkAuthStatus:', error);
        resetUserState();
    }
}

/**
 * Reseta o estado do usuário para valores padrão
 */
function resetUserState() {
    state.currentUser.isLoggedIn = false;
    state.currentUser.id = null;
    state.currentUser.email = null;
    state.currentUser.token = null;
    state.currentUser.name = DEFAULT_USER_DATA.name;
    state.currentUser.profession = DEFAULT_USER_DATA.profession;
    state.currentUser.plan = DEFAULT_USER_DATA.plan;
    state.currentUser.councilRegister = null;
    state.currentUser.phone = null;
    state.currentUser.birthDate = null;

    console.log('[DEBUG] Estado do usuário resetado');
}

// =============================================
// LISTENER DE MUDANÇAS DE AUTENTICAÇÃO
// =============================================

/**
 * Configura o listener para detectar mudanças no estado de autenticação
 */
const supabaseInstance = window.SIAV?.supabase || window.supabase;
if (supabaseInstance && supabaseInstance.auth) {
    supabaseInstance.auth.onAuthStateChange(async (event, session) => {
        console.log(`🔐 Auth Event: ${event}`, session ? `User: ${session.user.email}` : 'No session');

        switch (event) {
            case 'SIGNED_IN':
                // Usuário fez login
                if (session && session.user) {
                    const user = session.user;

                    state.currentUser.isLoggedIn = true;
                    state.currentUser.id = user.id;
                    state.currentUser.email = user.email;
                    state.currentUser.token = session.access_token;

                    await fetchUserProfile(user.id, user.email);

                    console.log(`✅ Login detectado: ${user.email} (${state.currentUser.plan.toUpperCase()})`);

                    updateGreetingsAndHeader();
                    updateDashboard();
                }
                break;

            case 'SIGNED_OUT':
                // Usuário fez logout
                resetUserState();
                console.log('👋 Logout detectado');

                updateGreetingsAndHeader();
                updateDashboard();
                break;

            case 'TOKEN_REFRESHED':
                // Token foi atualizado
                if (session) {
                    state.currentUser.token = session.access_token;
                    console.log('🔄 Token renovado');
                }
                break;

            case 'USER_UPDATED':
                // Dados do usuário foram atualizados
                if (session && session.user) {
                    await fetchUserProfile(session.user.id, session.user.email);
                    console.log('📝 Perfil atualizado');
                }
                break;
        }
    });
} else {
    console.warn('⚠️ Cliente Supabase não encontrado para onAuthStateChange. A autenticação não funcionará corretamente.');
}

function saveState() {
    const stateToSave = {
        quizResults: state.quizResults,
    };
    try {
        localStorage.setItem('siavState', JSON.stringify(stateToSave));
        console.log('✅ Dados de Quiz salvos localmente.');
    } catch (e) {
        console.error('Erro ao salvar estado no Local Storage', e);
    }
}

async function loadState() {
    try {
        const savedState = localStorage.getItem('siavState');
        if (savedState) {
            const parsedState = JSON.parse(savedState);

            state.quizResults = parsedState.quizResults || [];
        }

        // Não faz mais verificação automática de autenticação ao carregar o app
        // Apenas carrega estado local
        console.log('✅ Estado do App carregado (apenas localStorage, sem Supabase).');

    } catch (e) {
        console.error('Erro ao carregar estado do Local Storage ou Supabase', e);
    }
}

async function savePcrLogToSupabase(logEntry) {
    try {
        // Validacao de autenticacao
        if (!state.currentUser.isLoggedIn) {
            console.warn("Tentativa de salvar log sem usuario logado.");
            return { success: false, message: "Usuario nao logado." };
        }

        // ================================================
        // VERIFICAÇÃO DE LIMITES DE LOGS SALVOS
        // ================================================
        const userPlan = (state.currentUser?.plan || 'free').toLowerCase();

        // Definir limites por plano
        let logLimit;
        if (userPlan === 'free') {
            logLimit = 1;
        } else if (userPlan === 'student' || userPlan === 'estudante') {
            logLimit = 5;
        } else if (userPlan === 'professional' || userPlan === 'profissional' ||
                   userPlan === 'lifetime' || userPlan === 'vitalicio') {
            logLimit = null; // Ilimitado
        } else {
            logLimit = 1; // Fallback para free
        }

        console.log(`📊 Limite de logs para plano ${userPlan}:`, logLimit || 'Ilimitado');

        // Se houver limite, verificar quantidade atual
        if (logLimit !== null) {
            const { count, error: countError } = await supabase
                .from('pcr_logs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', state.currentUser.id);

            if (countError) {
                console.error('Erro ao contar logs:', countError);
            } else {
                console.log(`📈 Logs atuais: ${count}/${logLimit}`);

                // Se atingiu o limite
                if (count >= logLimit) {
                    console.warn(`🚫 Limite de ${logLimit} log(s) atingido!`);

                    // Buscar o log mais antigo
                    const { data: oldestLog, error: fetchError } = await supabase
                        .from('pcr_logs')
                        .select('id, created_at, patient_name')
                        .eq('user_id', state.currentUser.id)
                        .order('created_at', { ascending: true })
                        .limit(1)
                        .single();

                    if (fetchError || !oldestLog) {
                        console.error('Erro ao buscar log mais antigo:', fetchError);
                        return { success: false, message: 'Erro ao verificar logs existentes.' };
                    }

                    // Confirmar exclusão do log mais antigo
                    const confirmMsg = `Você atingiu o limite de ${logLimit} log(s) salvos do plano ${userPlan === 'free' ? 'Gratuito' : 'Estudante'}.\n\n` +
                        `Para salvar este novo atendimento, deseja excluir o log mais antigo?\n\n` +
                        `Log mais antigo:\n` +
                        `- Paciente: ${oldestLog.patient_name || 'N/I'}\n` +
                        `- Data: ${new Date(oldestLog.created_at).toLocaleString('pt-BR')}\n\n` +
                        `Confirmar exclusão e salvar novo log?`;

                    if (!confirm(confirmMsg)) {
                        console.log('❌ Usuário cancelou a exclusão');

                        // Oferecer upgrade
                        if (confirm('Deseja fazer upgrade para salvar mais logs sem limites?')) {
                            if (typeof openPlansModal === 'function') {
                                openPlansModal();
                            } else if (window.openPlansModal) {
                                window.openPlansModal();
                            }
                        }

                        return { success: false, message: 'Salvamento cancelado pelo usuário.' };
                    }

                    // Excluir log mais antigo
                    const { error: deleteError } = await supabase
                        .from('pcr_logs')
                        .delete()
                        .eq('id', oldestLog.id);

                    if (deleteError) {
                        console.error('Erro ao excluir log antigo:', deleteError);
                        alert('Erro ao excluir log antigo. Tente novamente.');
                        return { success: false, message: 'Erro ao excluir log antigo.' };
                    }

                    console.log('✅ Log mais antigo excluído com sucesso');
                }
            }
        }

        // Validacao de entrada
        if (!logEntry || typeof logEntry !== 'object') {
            console.error("Log entry invalido");
            return { success: false, message: "Dados do atendimento invalidos." };
        }

        // Validar campos obrigatorios
        if (!logEntry.startTime) {
            return { success: false, message: "Hora de inicio e obrigatoria." };
        }

        // Validar campos numericos
        if (logEntry.durationSeconds && (typeof logEntry.durationSeconds !== 'number' || logEntry.durationSeconds < 0)) {
            return { success: false, message: "Duracao invalida." };
        }

        if (logEntry.shocks && (typeof logEntry.shocks !== 'number' || logEntry.shocks < 0)) {
            return { success: false, message: "Numero de choques invalido." };
        }

        if (logEntry.meds && (typeof logEntry.meds !== 'number' || logEntry.meds < 0)) {
            return { success: false, message: "Numero de medicacoes invalido." };
        }

        const logData = {
            user_id: state.currentUser.id,
            patient_name: logEntry.patientName || 'N/I',
            patient_age: logEntry.patientAge || null,
            patient_weight: logEntry.patientWeight || null,
            patient_sex: logEntry.patientSex || '',
            patient_allergies: logEntry.patientAllergies || '',
            patient_comorbidities: logEntry.patientComorbidities || '',
            rhythm: logEntry.rhythm || '',
            duration_seconds: logEntry.durationSeconds || 0,
            shock_count: logEntry.shocks || 0,
            rosc_achieved: logEntry.roscAchieved || false,
            time_to_first_shock: logEntry.timeToFirstShock || null,
            timeline: logEntry.timeline || null,
            notes: logEntry.notes || '',
            created_at: new Date().toISOString(),
            compression_duration_seconds: logEntry.compressionTime || 0,
            meds_count: logEntry.meds || 0,
            report_html: logEntry.evolutionText || '',
            cycle_count: logEntry.cycleCount || null,
            drugs_administered: logEntry.drugsAdministered || null,
            events: logEntry.events || null,
            evolution_text: logEntry.evolutionText || '',
            patient_id: logEntry.patientId || '',
            outcome: logEntry.outcome || '',
            end_time: logEntry.endTime || null,
            start_time: logEntry.startTime ? new Date(logEntry.startTime).toISOString() : null,
            updated_at: new Date().toISOString(),
            created_by: state.currentUser.id || null,
            device_id: logEntry.deviceId || '',
            location: logEntry.location || '',
            custom_fields: logEntry.customFields || null
        };

        const { data, error } = await supabase
            .from('pcr_logs')
            .insert([logData])
            .select();
        if (error) {
            // Se estiver offline, salvar localmente e avisar o usuário
            if (!navigator.onLine && window.SIAV && typeof window.SIAV.saveOfflineLog === 'function') {
                window.SIAV.saveOfflineLog(logData);
                showTransientAlert('Offline: atendimento salvo localmente e será sincronizado quando houver internet.', 'warning', 7000);
                return { success: true, offline: true };
            }
            throw error;
        }

        console.log('Log de PCR salvo no Supabase:', data);
        alert('Atendimento salvo com sucesso no seu Historico Online!');
        return { success: true };

    } catch (error) {
        console.error("Erro ao salvar log no Supabase:", error);
        alert(`Erro ao salvar log online: ${error.message}`);
        return { success: false, message: error.message };
    }
}

async function fetchPcrLogs() {
    // Qualquer usuário logado pode buscar seus logs
    if (!state.currentUser.isLoggedIn) {
        state.patientLog = [];
        return;
    }

    try {
        const { data, error } = await supabase
            .from('pcr_logs')
            .select('*')
            .eq('user_id', state.currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        state.patientLog = data.map(log => ({
            id: log.id, 
            time: new Date(log.created_at),
            startTime: new Date(log.start_time).getTime(),
            patientName: log.patient_name,
            duration: formatTime(log.duration_seconds),
            evolutionText: log.report_html, 
            shocks: log.shocks_count,
            meds: log.meds_count,
            compressionTime: log.compression_duration_seconds,
            roscAchieved: log.rosc_achieved,
            durationSeconds: log.duration_seconds
        }));

        console.log(`Logs de PCR carregados do Supabase: ${state.patientLog.length}`);
        
    } catch (error) {
        console.error("Erro ao carregar logs do Supabase:", error.message);
        state.patientLog = [];
    }
}

async function deleteLogEntry(logId) {
    // Verificar apenas se está logado
    if (!state.currentUser.isLoggedIn) {
        alert("Você precisa estar logado para excluir registros.");
        showProfileModal();
        return;
    }

    if (!confirm(`Tem certeza que deseja EXCLUIR este registro? Esta ação é irreversível.`)) return;

    try {
        // Garantir que só pode excluir seus próprios logs
        const { error } = await supabase
            .from('pcr_logs')
            .delete()
            .eq('id', logId)
            .eq('user_id', state.currentUser.id);

        if (error) throw error;

        alert(`✅ Registro excluído com sucesso do seu histórico online.`);
        
        await renderPatientLog(); 
        updateDashboard();
        
    } catch (error) {
        alert(`❌ Erro ao excluir log: ${error.message}`);
        console.error("Erro DELETE Supabase:", error);
    }
}


// ===============================================
// FUNÇÕES DE ORIENTAÇÃO DE PROTOCOLO 
// ===============================================

/**
 * Determina o próximo passo do protocolo ACLS baseado no estado atual da PCR.
 * 
 * Esta função complexa analisa:
 * - Ritmo cardíaco (chocável vs não-chocável)
 * - Número de choques aplicados
 * - Medicações já administradas
 * - Tempo decorrido desde última medicação
 * - Fase atual do ciclo de compressões
 * 
 * @returns {Object} Objeto contendo:
 *   - message: Mensagem principal de orientação
 *   - style: Estilo visual (success/danger/warning/primary)
 *   - icon: Ícone FontAwesome a exibir
 *   - criticalAction: Ação crítica a realizar ('SHOCK' ou 'DRUG' ou null)
 *   - details: Detalhes adicionais da orientação
 *   - dose: Dose específica de medicação (se aplicável)
 *   - route: Via de administração (geralmente 'EV/IO')
 * 
 * @example
 * const nextStep = getProtocolNextStep();
 * // { message: 'Adrenalina — ADMINISTRAR AGORA', criticalAction: 'DRUG', ... }
 */
function getProtocolNextStep() {
    const isShockable = compressionCycle.lastRhythmWasShockable;
    const medAdrenalineCount = state.medications.filter(m => m.name.includes('Adrenalina')).length;
    const medAntiarrhythmicCount = state.medications.filter(m => m.name.includes('Amiodarona') || m.name.includes('Lidocaína')).length;
    const currentCycle = compressionCycle.cycleCount;
    const elapsedSeconds = state.pcrSeconds;

    let nextStep = {
        message: 'Continuar RCP de Alta Qualidade',
        style: 'success',
        icon: 'fas fa-heartbeat',
        criticalAction: null, // 'SHOCK' ou 'DRUG'
        details: '', // Detalhes adicionais
        dose: '', // Dose específica
        route: 'EV/IO' // Via de administração
    };

    // === FASE: PREPARAÇÃO ===
    if (compressionCycle.currentPhase === 'preparation') {
        nextStep.message = 'Iniciar Atendimento de PCR';
        nextStep.style = 'primary';
        nextStep.icon = 'fas fa-hand-rock';
        nextStep.details = '<div class="protocol-checklist"><div class="protocol-step"><i class="fas fa-shield-alt"></i> Segurança da cena</div><div class="protocol-step"><i class="fas fa-user-injured"></i> Verificar responsividade</div><div class="protocol-step"><i class="fas fa-phone-alt"></i> Ativar emergência (192)</div><div class="protocol-step"><i class="fas fa-hand-holding-medical"></i> Verificar pulso (≤10s)</div><div class="protocol-step"><i class="fas fa-heartbeat"></i> Iniciar RCP imediatamente</div></div>';
        return nextStep;
    }

    // === FASE: VERIFICAÇÃO DE RITMO ===
    if (compressionCycle.currentPhase === 'rhythm_check' || compressionCycle.currentPhase === 'shock_advised') {
        nextStep.message = 'Pausa: avaliar ritmo e pulso (≤10s)';
        nextStep.style = 'danger';
        nextStep.icon = 'fas fa-exclamation-triangle';
        nextStep.details = isShockable ? 'Chocável — preparar desfibrilador.' : 'Não-chocável — retomar compressões.';
        nextStep.criticalAction = isShockable ? 'SHOCK' : null;
        return nextStep;
    }

    // === LÓGICA DE MEDICAÇÃO DURANTE COMPRESSÕES ===

    // Se o ritmo ainda não foi determinado, NÃO sugerir medicamentos
    if (compressionCycle.lastRhythmWasShockable === undefined) {
        nextStep.message = 'Aguardando checagem de ritmo';
        nextStep.style = 'warning';
        nextStep.icon = 'fas fa-hourglass';
        nextStep.details = '';
        return nextStep;
    }

    // 1️⃣ ADRENALINA - Timing crítico conforme ritmo
    // RITMO NÃO CHOCÁVEL (AESP/Assistolia): Imediatamente após checagem de ritmo (Ciclo 1)
    // RITMO CHOCÁVEL (FV/TVSP): Após o 2º choque (Ciclo 3 = início do 3º ciclo)
    
    if (medAdrenalineCount === 0) {
        // PRIMEIRA DOSE DE ADRENALINA - Timing depende do ritmo
        let shouldGiveAdrenaline = false;
        let adrenalineReason = '';
        
        if (!isShockable && currentCycle >= 1) {
            // Ritmo não-chocável: URGENTE - dar IMEDIATAMENTE no 1º ciclo
            shouldGiveAdrenaline = true;
            adrenalineReason = '<div class="alert-box alert-danger"><div class="alert-content"><div class="alert-title"><i class="fas fa-exclamation-triangle"></i> AESP/Assistolia</div><div class="alert-text">RCP contínua + Identificar 5 H\'s e 5 T\'s</div></div></div>';
        } else if (isShockable && currentCycle >= 3) {
            // Ritmo chocável: dar após 2 choques (ciclo 3 em diante)
            shouldGiveAdrenaline = true;
            adrenalineReason = '<div class="alert-box alert-danger"><div class="alert-content"><div class="alert-title"><i class="fas fa-heartbeat"></i> FV/TVSP Persistente</div><div class="alert-text">Após 2º choque • Considerar Amiodarona</div></div></div>';
        } else if (isShockable && currentCycle >= 1 && state.shockCount === 0) {
            // Ritmo chocável detectado no ciclo 1 mas antes de qualquer choque: aguardar
            adrenalineReason = `<div class="alert-box alert-danger"><div class="alert-content"><div class="alert-title"><i class="fas fa-clock"></i> FV/TVSP Detectada</div><div class="alert-text">Aguardar 2 choques (${state.shockCount}/2)</div></div></div>`;
        }
        
        if (shouldGiveAdrenaline) {
            nextStep.message = !isShockable ? '🚨 Adrenalina — URGENTE (1º CICLO)' : 'Adrenalina — ADMINISTRAR AGORA';
            nextStep.style = 'danger';
            nextStep.icon = 'fas fa-syringe';
            nextStep.criticalAction = 'DRUG';
            nextStep.dose = !isShockable 
                ? '1 mg EV/IO - IMEDIATO no 1º ciclo. Repetir a cada 3-5 min.' 
                : '1 mg EV/IO - administrar agora (após 2º choque). Repetir a cada 3-5 min.';
            nextStep.route = 'EV/IO';
            nextStep.details = adrenalineReason;
        } else if (adrenalineReason) {
            nextStep.message = 'Adrenalina: aguardar indicação';
            nextStep.style = 'warning';
            nextStep.icon = 'fas fa-hourglass-half';
            nextStep.details = `${adrenalineReason}`;
        }
    } 
    else if (medAdrenalineCount > 0) {
        // DOSES SUBSEQUENTES - Monitorar intervalo de 3-5 minutos
        const adrenalineStatus = getMedicationDueStatus('Adrenalina', 180); // mínimo 3 minutos
        
        if (adrenalineStatus.isDue) {
            nextStep.message = 'Adrenalina — DOSE DEVIDA';
            nextStep.style = 'danger';
            nextStep.icon = 'fas fa-syringe';
            nextStep.criticalAction = 'DRUG';
            nextStep.dose = '1 mg EV/IO - administrar agora. Repetir a cada 3-5 min.';
            nextStep.route = 'EV/IO';
            nextStep.details = '';
        } else {
            nextStep.message = `⏰ ${adrenalineStatus.message}`;
            nextStep.style = 'warning';
            nextStep.icon = 'fas fa-hourglass-half';
            nextStep.details = `Próxima dose em ~${Math.ceil(adrenalineStatus.secondsUntilDue / 60)} minuto(s)`;
        }
    }

    // 2️⃣ AMIODARONA - SOMENTE em ritmos chocáveis após 2 choques
    if (isShockable && compressionCycle.currentPhase === 'compression') {
        // Primeira dose: após 2 choques (durante ciclo 3)
        if (state.shockCount >= 2 && medAntiarrhythmicCount === 0) {
            nextStep.message = 'Amiodarona 300 mg — CONSIDERAR/ADMINISTRAR';
            nextStep.style = 'primary';
            nextStep.icon = 'fas fa-syringe';
            nextStep.criticalAction = 'DRUG';
            nextStep.dose = '300 mg IV/IO';
            nextStep.route = 'EV/IO';
            nextStep.details = 'FV/TVSP persistente após 2 choques. Administrar durante compressões.';
        }
        // Segunda dose: após 3 choques (durante ciclo 5)
        else if (state.shockCount >= 3 && medAntiarrhythmicCount === 1) {
            nextStep.message = 'Amiodarona 150 mg — CONSIDERAR';
            nextStep.style = 'warning';
            nextStep.icon = 'fas fa-syringe';
            nextStep.criticalAction = 'DRUG';
            nextStep.dose = '150 mg IV/IO';
            nextStep.route = 'EV/IO';
            nextStep.details = 'Se FV/TVSP persistir após choques adicionais.';
        }
    }

    // 3️⃣ OUTRAS CONSIDERAÇÕES
    // Se há ritmo não-choqueável (AESP/Assistolia), investigue causas (5H e 5T)
    if (!isShockable && compressionCycle.currentPhase === 'compression') {
        nextStep.message = 'Não-chocável: investigar causas (5H/5T)';
        nextStep.style = 'warning';
        nextStep.icon = 'fas fa-list-check';
        nextStep.details = '5H: Hipovolemia, Hipóxia, Acidose, Hipo/HiperK, Hipotermia. 5T: Tamponamento, Tensão, Toxinas, Trombose, Trauma.';
    }

    // 4️⃣ SE NÃO HÁ AÇÃO CRÍTICA, MANTENHA RCP
    if (!nextStep.criticalAction && compressionCycle.currentPhase === 'compression') {
        nextStep.message = '✓ MANTENHA RCP de Alta Qualidade';
        nextStep.style = 'success';
        nextStep.icon = 'fas fa-heartbeat';
        const minutosCiclo = currentCycle * 2;
        nextStep.details = `Ciclo ${currentCycle} (${minutosCiclo}min): Próxima verificação de ritmo em ~2 minutos`;
    }

    return nextStep;
}

function updatePcrGuidance() {
        // --- CHECKLIST VISUAL DOS PASSOS DO PROTOCOLO ---
        // Remover checklist visual para evitar redundância se já há instrução clara
        const checklistEl = document.getElementById('protocol-checklist');
        if (checklistEl) checklistEl.innerHTML = '';
    // Usa cache DOM para performance
    const { hintBox, hintMessage, hintIcon, currentStep, cycleInfo, progressBar, compBtn } = DOM_CACHE;
    
    // Early return se elementos não existirem
    if (!hintBox || !hintMessage || !hintIcon || !currentStep || !cycleInfo || !progressBar || !compBtn) return;

    const protocolStep = getProtocolNextStep();
    
    // Atualiza painel único estilo mobile
    // Ícone e cor dinâmicos por etapa
        let iconClass = 'fas fa-heartbeat';
        let iconColor = '#e74c3c';
        let highlightClass = 'highlight-message';
        let stepClass = 'step-highlight';
        let tipText = '';
        let progressColor = '#27ae60';
        let progressPercent = 0;
    switch(compressionCycle.currentPhase) {
        case 'preparation':
            iconClass = 'fas fa-heartbeat'; iconColor = '#e74c3c';
            highlightClass = 'highlight-message';
            stepClass = 'step-highlight';
            tipText = 'Lembre-se: registre o tempo de início!';
            break;
        case 'compressions':
            iconClass = 'fas fa-hands-helping'; iconColor = '#27ae60';
            highlightClass = 'highlight-message';
            stepClass = 'step-highlight';
            tipText = 'Mantenha o ritmo de 100-120 bpm.';
            break;
        case 'rhythm_check':
            iconClass = 'fas fa-wave-square'; iconColor = '#2980b9';
            highlightClass = 'highlight-message';
            stepClass = 'step-highlight';
            tipText = 'Checagem rápida: ≤10s!';
            break;
        case 'shock_advised':
            iconClass = 'fas fa-bolt'; iconColor = '#f1c40f';
            highlightClass = 'highlight-message';
            stepClass = 'step-highlight';
            tipText = 'Afastar todos e aplicar o choque!';
            break;
        default:
            iconClass = 'fas fa-heartbeat'; iconColor = '#e74c3c';
            tipText = '';
    }
    hintBox.className = `protocol-hint-box improved-panel protocol-panel-mobile improved-panel-mobile ${protocolStep.style || ''}`;
    hintMessage.textContent = protocolStep.message;
    hintMessage.className = `protocol-panel-message ${highlightClass}`;
    hintIcon.innerHTML = `<i class="${iconClass}" style="color:${iconColor}"></i>`;
    // Não repetir o passo atual se já está claro na mensagem principal
    currentStep.textContent = '';
    currentStep.className = `protocol-panel-step ${stepClass}`;
    // Remove dica rápida/alerta para evitar redundância
    const alertTip = document.getElementById('alert-tip');
    if (alertTip) alertTip.style.display = 'none';

    // Remove detalhes extras para evitar redundância
    let hintDetails = document.getElementById('hint-details');
    if (hintDetails) {
        hintDetails.innerHTML = '';
    }

    // 2. Atualiza o status do ciclo e a barra de progresso
    let currentStepMessage = '';
    let cycleInfoText = '';
    let progressBarColor = 'var(--primary)';
    let compBtnText = '';
    let compBtnStyle = '';

    switch(compressionCycle.currentPhase) {
        case 'preparation':
            currentStepMessage = 'Aguardando início';
            cycleInfoText = 'Ciclo 0';
            progressBar.style.width = '0%';
            progressBarColor = 'var(--primary)';
            compBtnText = 'INICIAR COMPRESSÕES';
            compBtnStyle = 'linear-gradient(135deg, var(--success), #219a52)';
            compBtn.disabled = false;
            break;

        case 'compressions':
            currentStepMessage = `Compressões contínuas • ${state.bpm} BPM`;
            cycleInfoText = `Ciclo ${compressionCycle.cycleCount}`;
            progressBar.style.width = `${compressionCycle.cycleProgress}%`;
            progressBarColor = 'var(--primary)';
            compBtnText = 'RCP EM ANDAMENTO';
            compBtnStyle = 'linear-gradient(135deg, var(--warning), #e67e22)';
            compBtn.disabled = true;
            hintBox.classList.add('compressions');
            break;

        case 'rhythm_check':
            currentStepMessage = 'Avaliar ritmo e pulso (≤10s)';
            cycleInfoText = `Ciclo ${compressionCycle.cycleCount}`;
            progressBar.style.width = '0%';
            progressBarColor = 'var(--danger)';
            compBtnText = 'RETOMAR COMPRESSÕES';
            compBtnStyle = 'linear-gradient(135deg, var(--success), #219a52)';
            compBtn.disabled = false;
            hintBox.classList.add('rhythm-check');
            break;

        case 'shock_advised':
            currentStepMessage = 'Afastar e desfibrilar';
            cycleInfoText = `Ciclo ${compressionCycle.cycleCount}`;
            progressBar.style.width = '0%';
            progressBarColor = 'var(--danger)';
            compBtnText = 'RETOMAR COMPRESSÕES';
            compBtnStyle = 'linear-gradient(135deg, var(--success), #219a52)';
            compBtn.disabled = false;
            hintBox.classList.add('shock-advised');
            break;
    }
    
    currentStep.textContent = currentStepMessage;
    cycleInfo.textContent = cycleInfoText;
    progressBar.style.backgroundColor = progressBarColor;
    compBtn.innerHTML = `<span>💪</span><span>${compBtnText}</span>`;
    compBtn.style.background = compBtnStyle;

    // Remove classes de estado antigo
    if (compressionCycle.currentPhase !== 'compressions') hintBox.classList.remove('compressions');
    if (compressionCycle.currentPhase !== 'rhythm_check') hintBox.classList.remove('rhythm-check');
    if (compressionCycle.currentPhase !== 'shock_advised') hintBox.classList.remove('shock-advised');
}


// ===============================================
// FUNÇÕES GERAIS E DADOS ESTATICOS
// ===============================================

// Cache de elementos de áudio
const AUDIO_ELEMENTS = {
    shock: null,
    alert: null,
    drug: null
};

function playNotification(type) {
    let soundElement;
    
    // Usa cache de elementos de áudio
    if (!AUDIO_ELEMENTS.shock) {
        AUDIO_ELEMENTS.shock = document.getElementById('shock-sound');
        AUDIO_ELEMENTS.alert = document.getElementById('alert-sound');
        AUDIO_ELEMENTS.drug = document.getElementById('drug-sound');
    }
    
    switch(type) {
        case 'SHOCK':
            soundElement = AUDIO_ELEMENTS.shock;
            break;
        case 'CHECK_RHYTHM':
            soundElement = AUDIO_ELEMENTS.alert;
            break;
        case 'DRUG':
            soundElement = AUDIO_ELEMENTS.drug;
            break;
        default:
            console.warn('Tipo de notificação desconhecido:', type);
            return;
    }
    
    if (soundElement) {
        soundElement.pause();
        soundElement.currentTime = 0;
        soundElement.play().catch(e => {
            console.warn('Erro ao tocar áudio:', e.message);
        });
    }
}

// Mostra uma notificação não-bloqueante e transitória na interface
function showTransientAlert(message, style = 'warning', timeout = 4000) {
    // Tempo maior para alertas (12 segundos padrão)
    if (typeof timeout !== 'number' || timeout < 9000) timeout = 12000;
    // Em vez de alerta transitório, exibe no painel único
    const alertsPanel = document.getElementById('protocol-alerts-panel');
    // Prioriza sistema de toast acessível se disponível
    if (window.SIAV && typeof window.SIAV.showToast === 'function') {
        window.SIAV.showToast(message, { type: style, timeout });
        return;
    }

    if (alertsPanel) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert-box alert-danger';
        alertDiv.innerHTML = `<div class="alert-content"><div class="alert-title"><i class="fas fa-exclamation-triangle"></i> Alerta</div><div class="alert-text">${message}</div></div>`;
        alertsPanel.appendChild(alertDiv);
        // Remove após timeout para não poluir a tela
        setTimeout(() => { alertDiv.remove(); }, timeout > 0 ? timeout : 12000);
        return;
    }
    // Fallback: console
    console.info('ALERT:', message);
}

function formatTime(totalSeconds) {
    // Validação robusta de entrada
    if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds < 0) {
        return '00:00:00';
    }
    
    // Limita valor máximo para evitar overflow (24 horas)
    const safeSeconds = Math.min(totalSeconds, 86400);
    
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = Math.floor(safeSeconds % 60);
    
    // Formatação com padding de zeros
    const pad = (num) => num.toString().padStart(2, '0');
    
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

const MEDICATION_DOSES = {
    adrenalina: { adult: '1 mg EV/IO a cada 3-5 minutos', pediatric: '0.01 mg/kg EV/IO' },
    amiodarona: { adult: '1ª dose: 300 mg EV/IO. 2ª dose: 150 mg EV/IO', pediatric: '5 mg/kg EV/IO em bolus' },
    atropina: { adult: '1 mg EV/IO a cada 3-5 minutos (máx. 3 mg)', pediatric: '0.02 mg/kg EV/IO (mín. 0.1 mg / máx. 0.5 mg)' },
    bicarbonato: { adult: '1 mEq/kg', pediatric: '1 mEq/kg (raramente usado)' },
    lidocaina: { adult: '1-1.5 mg/kg', pediatric: '1 mg/kg' },
    sulfato: { adult: '1-2 g IV/IO (Torçada de Pontas)', pediatric: '25-50 mg/kg (máx. 2g)' }
};

// ---------- Contador dedicado para medicamentos (exibe tempo desde última dose / próxima dose) ----------
function getOrCreateDrugTimerBox() {
    let box = document.getElementById('drug-timer-box');
    if (box) return box;
    const hintBox = document.getElementById('protocol-hint-box');
    if (!hintBox) return null;
    box = document.createElement('div');
    box.id = 'drug-timer-box';
    box.className = 'drug-timer-box';
    box.style.display = 'block';
    box.innerHTML = `
        <div class="drug-timer-content">
            <div class="drug-timer-info">
                <div id="drug-timer-value" class="drug-timer-value"></div>
                <div id="drug-status-message" class="drug-status-message"></div>
            </div>
        </div>`;
    hintBox.appendChild(box);
    return box;
}

function startDrugTimer() {
    // Limpa qualquer timer existente
    if (intervals.drugTimer) clearInterval(intervals.drugTimer);

    // Garante que o box exista (pode ter sido removido do DOM) e mostra
    const drugTimerBox = getOrCreateDrugTimerBox();
    if (drugTimerBox) drugTimerBox.style.display = 'block';

    // Atualiza imediatamente e depois a cada 1s
    updateDrugStatusDisplay();
    intervals.drugTimer = setInterval(updateDrugStatusDisplay, 1000);
}

function stopDrugTimer() {
    if (intervals.drugTimer) {
        clearInterval(intervals.drugTimer);
        intervals.drugTimer = null;
    }
    // Remove o box de timer de medicamentos do DOM (limpeza completa)
    const drugTimerBox = document.getElementById('drug-timer-box');
    if (drugTimerBox && drugTimerBox.parentNode) drugTimerBox.parentNode.removeChild(drugTimerBox);
}

function updateDrugStatusDisplay() {
    // Se não existir PCR ativa ou ritmo não foi determinado ainda, não atualiza
    if (!state.pcrActive || compressionCycle.lastRhythmWasShockable === undefined) return;

    // Elementos na UI (agora localizados dentro do drug-timer-box)
    const drugTimerBox = document.getElementById('drug-timer-box');
    const drugTimerValue = document.getElementById('drug-timer-value');
    const drugStatusMessage = document.getElementById('drug-status-message');

    if (!drugTimerBox || !drugTimerValue || !drugStatusMessage) {
        console.warn('⚠️ Elementos do drug timer não encontrados no DOM');
        return;
    }

    // Obter protocolo (baseado no ritmo)
    const nextStep = window.MedicalBrain.getProtocolNextStep(getPCRStateSnapshot());
    
    const isDrugStep = nextStep && (nextStep.criticalAction === 'DRUG' || nextStep.message.includes('Adrenalina') || nextStep.message.includes('Amiodarona'));

    if (isDrugStep) {
        const medName = nextStep.message.split('—')[0].trim() || 'Medicação';

        drugTimerValue.textContent = medName;
        
        // Exibe status devida/aguardar
        if ((nextStep.criticalAction === 'DRUG' && nextStep.message.includes('AGORA')) || nextStep.message.includes('DEVIDA') || nextStep.message.includes('URGENTE')) {
            drugStatusMessage.textContent = `🔴 ${nextStep.message}`;
            drugStatusMessage.classList.remove('ok');
            drugStatusMessage.classList.add('due');
        } else {
            drugStatusMessage.textContent = `✓ ${nextStep.message}`;
            drugStatusMessage.classList.remove('due');
            drugStatusMessage.classList.add('ok');
        }
    } else {
        // Se não há próximo medicamento: remover o box do DOM (não mostrar mensagem neutra)
        if (drugTimerBox && drugTimerBox.parentNode) {
            drugTimerBox.parentNode.removeChild(drugTimerBox);
        }
        return;
    }
}

const HTS_INSTRUCTIONS = {
    "Hipovolemia": { instruction: "Reconhecimento: Pulso fraco/ausente, colapso de veias, histórico de hemorragia. Ação: Reposição rápida de volume com cristaloides ou sangue. Controlar foco de sangramento.", action_short: "Reposição rápida de fluidos IV/IO e controle de sangramento.", icon: '🩸' },
    "Hipóxia": { instruction: "Reconhecimento: Cianose, SpO2 baixa, via aérea inadequada. Ação: Garantir via aérea, ventilar com 100% O₂, confirmar posição de tubo e ventilação adequada.", action_short: "Ventilação com 100% O₂ e garantia da via aérea.", icon: '🌬️' },
    "Hidrogênio": { instruction: "Reconhecimento: Acidose Metabólica (pH baixo). Ação: Melhorar ventilação e oxigenação. Considerar Bicarbonato de Sódio apenas se PCR prolongada, refratária ou hipercalemia.", action_short: "Otimizar ventilação e considerar Bicarbonato de Sódio.", icon: '🧪' },
    "Hipo/Hiper": { instruction: "Hipocalemia: Ondas U, T achadas. Ação: Administração cautelosa de KCl. Hipercalemia: Ondas T apiculadas. Ação: Proteger o coração (CaCl/Gluconato de Ca), Bicarbonato, Insulina/Glicose.", action_short: "Administrar Cálcio para HiperK ou KCl para HipoK.", icon: '⚖️' },
    "Hipotermia": { instruction: "Reconhecimento: Temperatura central < 30°C. Ação: Aquecimento ativo do paciente com fluidos aquecidos, cobertores. Paciente não está morto até estar quente e morto.", action_short: "Aquecimento ativo imediato (fluidos e cobertores).", icon: '🧊' },
    "Tamponamento": { instruction: "Reconhecimento: Tríade de Beck (Hipotensão, turgência jugular, abafamento de bulhas). Ação: Realizar Pericardiocentese de emergência.", action_short: "Pericardiocentese de emergência.", icon: '🫀' },
    "Tensão": { instruction: "Reconhecimento: Desvio de traqueia, turgência jugular, ausência de murmúrio. Ação: Descompressão com agulha (toracocentese de alívio) ou drenagem torácica.", action_short: "Descompressão com agulha (toracocentese de alívio).", icon: '🎈' },
    "Trombose": { instruction: "Coronária (IAM): Ação: Fibrinolítico (se indicado) ou Angioplastia Coronária (PCI). Pulmonar (TEP): Ação: Trombólise ou Embolectomia.", action_short: "Fibrinolíticos ou intervenção percutânea (PCI/Embolectomia).", icon: ' clots' },
    "Tóxicos": { instruction: "Reconhecimento: Sinais toxicológicos específicos, histórico de ingestão. Ação: Administração de antídotos (se conhecidos) e suporte hemodinâmico prolongado.", action_short: "Administrar antídotos específicos e suporte.", icon: '🍄' },
    "Trauma": { instruction: "Reconhecimento: Evidência de lesão externa ou interna grave. Ação: Identificar e tratar o foco (ex: cirurgia, infusão de sangue, controle de via aérea).", action_short: "Identificar e corrigir lesões traumáticas (ex: cirurgia, infusão de sangue).", icon: '🩹' }
};

const PROTOCOLS = {
    'pcr-adulto': {
        title: "Fluxograma PCR Adulto (Ritmos Chocáveis vs. Não Chocáveis)",
        content: `
            <div class="flow-step-critical">1. INICIAR SBV / RCP de Alta Qualidade</div>
            <div class="flow-connector">ACLS - Conecte o Monitor/Desfibrilador</div>

            <div class="flow-step decision">2. RITMO NO MONITOR? (FV ou TVSP)</div>

            <div class="flow-split">
                <div>
                    <div class="flow-step shockable">SIM (FV ou TVSP)</div>
                    <div class="flow-connector">CHOQUE! (energia bifásica recomendada — ex.: 120–200 J; usar 200 J se desconhecido)</div>
                    <div class="flow-step">3. RCP por 2 min</div>
                    <div class="flow-step medication">Dose: 1 mg EV/IO - administrar agora. Repetir a cada 3-5 min.</div>
                    <div class="flow-connector">Reavaliar Ritmo após 2 min</div>
                    
                    <div class="flow-step decision">4. CHOQUE 2 INDICADO?</div>
                    <div class="flow-connector">SIM</div>

                    <div class="flow-step shockable">CHOQUE 2</div>
                    <div class="flow-step">5. RCP por 2 min</div>
                    <div class="flow-step medication-critical">Se FV/TVSP persistente após 2 choques: Amiodarona 300 mg IV/IO (bolus). Alternativa: Lidocaína</div>
                    <div class="flow-connector">Reavaliar Ritmo após 2 min</div>
                </div>

                <div>
                    <div class="flow-step non-shockable">NÃO (AESP ou Assistolia)</div>
                    <div class="flow-connector">IMEDIATO: Adrenalina + RCP</div>
                    <div class="flow-step">3. RCP por 2 min</div>
                    <div class="flow-step medication-critical">Dose: 1 mg EV/IO - administrar agora. Repetir a cada 3-5 min.</div>
                    <div class="flow-connector">Considere Via Aérea Avançada e ETCO2</div>
                    <div class="flow-step non-shockable">4. Reavaliar Ritmo a cada 2 min</div>
                    <div class="flow-step decision">Identificar e Tratar 5 H's e 5 T's</div>
                    <div class="flow-connector">Se FV/TVSP no ciclo, ir para o lado esquerdo</div>
                </div>
            </div>

            <div class="flow-step rosc">5. ROSC OBTIDO? (Retorno à Circulação)</div>
            <div class="flow-step-critical">6. CUIDADOS PÓS-PCR: Suporte hemodinâmico, TTM, ICP</div>
        `
    },
    'pcr-pediatrica': {
        title: "Fluxograma PCR Pediátrica (PALS)",
        content: `
            <div class="flow-step-critical">1. SBV/RCP Pediátrica (C:V 15:2 com 2 socorristas)</div>
            <div class="flow-connector">PALS - Conecte o Monitor/Desfibrilador</div>

            <div class="flow-step decision">2. RITMO CHOCÁVEL? (FV ou TVSP)</div>

            <div class="flow-split">
                <div>
                    <div class="flow-step shockable">SIM (FV ou TVSP)</div>
                    <div class="flow-connector">CHOQUE! 1ª Dose: 2 J/kg</div>
                    <div class="flow-step">3. RCP por 2 min</div>
                    <div class="flow-step medication">Adrenalina 0.01mg/kg (a cada 3-5 min)</div>
                    <div class="flow-connector">Reavaliar Ritmo</div>
                    <div class="flow-step shockable">4. CHOQUE 2: 4 J/kg</div>
                    <div class="flow-step">RCP por 2 min</div>
                    <div class="flow-step medication-critical">Amiodarona 5mg/kg ou Lidocaína</div>
                </div>

                <div>
                    <div class="flow-step non-shockable">NÃO (AESP ou Assistolia)</div>
                    <div class="flow-connector">IMEDIATO: Adrenalina + RCP</div>
                    <div class="flow-step">3. RCP por 2 min</div>
                    <div class="flow-step medication-critical">Adrenalina 0.01mg/kg (a cada 3-5 min)</div>
                    <div class="flow-connector">Acesso EV/IO e Via Aérea Avançada</div>
                    <div class="flow-step decision">Tratar Causas Reversíveis Pediátricas</div>
                    <div class="flow-step non-shockable">4. Reavaliar Ritmo a cada 2 min</div>
                </div>
            </div>
            <div class="flow-step rosc">5. ROSC OBTIDO?</div>
        `
    },
    'avc': {
        title: "Protocolo para AVC Agudo (Acidente Vascular Cerebral)",
        content: `
            <div class="flow-step-critical">1. PRÉ-HOSPITALAR: **Escala de Cincinnati**. Ativação de Alerta.</div>
            <div class="flow-connector">ESCALA DE CINCINNATI: Queda Facial (face), Queda do Braço (braços), Fala Anormal (fala). UM ponto indica alta chance de AVC.</div>

            <div class="flow-step">2. AVALIAÇÃO HOSPITALAR: ABCs, Glicemia, NIHSS, TC/RM de Crânio. (Meta: TC em 25 min)</div>
            <div class="flow-connector">Resultado da Imagem</div>

            <div class="flow-step decision">3. HEMORRAGIA EXCLUÍDA E TEMPO < 4,5 horas?</div>
            
            <div class="flow-split">
                <div>
                    <div class="flow-step rosc">SIM - AVC ISQUÊMICO (ELEGÍVEL)</div>
                    <div class="flow-connector">Meta: Porta-Agulha (Trombólise) em 60 min</div>
                    <div class="flow-step medication-critical">4. TROMBÓLISE/ALTEPLASE</div>
                    <div class="flow-step">5. Monitoramento intensivo de Pressão Arterial. Considerar Trombectomia Mecânica (até 24h).</div>
                </div>

                <div>
                    <div class="flow-step non-shockable">NÃO (Hemorragia Confirmada ou Tempo > 4,5h)</div>
                    <div class="flow-connector">SUPORTE CLÍNICO</div>
                    <div class="flow-step medication">4. Controle Rigoroso de PA. Suporte hemodinâmico.</div>
                    <div class="flow-step">Manutenção da Glicemia, Temperatura. Prevenção de Complicações.</div>
                </div>
            </div>
        `
    },
    'iam': {
        title: "Protocolo para Síndrome Coronariana Aguda (SCA)",
        content: `
            <div class="flow-step-critical">1. SUSPEITA DE SCA: Dor torácica. (Meta: ECG em 10 min)</div>
            <div class="flow-connector">AVALIAÇÃO: Sinais Vitais, Linha Venosa, Troponinas</div>

            <div class="flow-step decision">2. ECG MOSTRA SUPRADESNIVELAMENTO ST?</div>

            <div class="flow-split">
                <div>
                    <div class="flow-step shockable">SIM (Infarto com Supra de ST)</div>
                    <div class="flow-connector">REPERFUSÃO URGENTE!</div>
                    <div class="flow-step medication-critical">Meta: Porta-Balão (Intervenção Coronariana Percutânea) < 90 min ou Fibrinolítico < 30 min.</div>
                    <div class="flow-step medication">3. Fármacos: AAS, P2Y12, Anticoagulação. Nitratos e Morfina (se dor).</div>
                </div>

                <div>
                    <div class="flow-step non-shockable">NÃO (Infarto Sem Supra de ST / Angina Instável)</div>
                    <div class="flow-connector">ESTRATIFICAÇÃO DE RISCO</div>
                    <div class="flow-step decision">3. Risco Alto?</div>
                    <div class="flow-step medication">Fármacos (AAS, P2Y12, Heparina). Tratar clinicamente e considerar Cateterismo (24-72h).</div>
                </div>
            </div>
            <div class="flow-step-secondary">4. Continuação: Manejo da dor, reabilitação cardíaca.</div>
        `
    }
};

const STUDY_GUIDES = {
    'ecg-ritmos-pcr': {
        title: "Interpretação de ECG: Ritmos de Parada Cardíaca",
        sections: [
            {
                heading: "Fibrilação Ventricular (FV)",
                content: "Ritmo caótico e irregular, sem ondas P, QRS ou T identificáveis. É um ritmo chocável. A ação imediata é **Desfibrilação**."
            },
            {
                heading: "Taquicardia Ventricular sem Pulso (TVSP)",
                content: "Ondas QRS largas e rápidas, ritmo regular, mas sem pulso detectável. É um ritmo chocável. Ação imediata é **Desfibrilação**."
            },
            {
                heading: "Atividade Elétrica Sem Pulso (AESP)",
                content: "Qualquer ritmo organizado (como sinusal, bradicardia ou taquicardia) no monitor de ECG, mas sem pulso detectável no paciente. Não é chocável. Ação: **RCP de alta qualidade + Adrenalina + Identificar 5 H's e 5 T's**."
            },
            {
                heading: "Assistolia",
                content: "Linha reta ou com mínimas ondulações. Ação: **Confirmar em mais de uma derivação**. Não é chocável. A ação é **RCP de alta qualidade + Adrenalina + Identificar 5 H's e 5 T's**."
            }
        ]
    },
    'ecg-interpretacao': {
        title: "Interpretação Básica e Avançada do ECG",
        sections: [
            {
                heading: "Guia dos 5 Passos (Ritmo Sinusal)",
                content: "1. Frequência (60-100 bpm). 2. Ritmo (Regular). 3. Onda P (Presente, seguida por QRS). 4. Intervalo PR (Normal, 0.12-0.20s). 5. Complexo QRS (Estreito, < 0.12s)."
            },
            {
                heading: "Análise de Isquemia e Infarto",
                content: "O achado mais crítico na emergência é o **Supradesnivelamento do Segmento ST** (Infarto Agudo com Supra de ST - IAMCSST), que exige a ativação imediata do protocolo de reperfusão (Angioplastia ou Trombólise)."
            },
            {
                heading: "Eixo Cardíaco",
                content: "Determinar o Eixo (Normal, Desvio para Esquerda ou Direita) é importante para identificar bloqueios ou hipertrofias. <br>Regra Rápida: QRS positivo em D1 e aVF = Eixo Normal."
            }
        ]
    },
    'farmacologia': {
        title: "Farmacologia Emergencial Chave (Adulto)",
        sections: [
            {
                heading: "Adrenalina (Epinefrina)",
                content: "<strong>Indicação:</strong> Todos os ritmos de PCR (chocáveis e não-chocáveis). <strong>Dose:</strong> 1 mg EV/IO a cada 3-5 minutos. <strong>Mecanismo:</strong> Vasoconstrição (alfa-agonista) para aumentar a pressão de perfusão coronariana e cerebral."
            },
            {
                heading: "Amiodarona",
                content: "<strong>Indicação:</strong> FV/TVSP refratários ao choque após o 2º choque. <strong>Dose:</strong> 1ª dose: 300 mg EV/IO em bolus. 2ª dose: 150 mg EV/IO em bolus. <strong>Mecanismo:</strong> Antiarrítmico de classe III, prolonga a repolarização."
            },
            {
                heading: "Atropina",
                content: "<strong>Indicação:</strong> Bradicardia sintomática. Não indicada rotineiramente para AESP/Assistolia. <strong>Dose:</strong> 1 mg EV/IO a cada 3-5 minutos (máx. 3 mg). <strong>Mecanismo:</strong> Bloqueia o efeito do nervo vago, acelerando o ritmo sinusal."
            }
        ]
    }
};

function showStudyDetail(studyKey) {
    if (!checkAccess('study_review')) return;
    
    const study = STUDY_GUIDES[studyKey];
    if (!study) {
        alert("Guia de estudo não encontrado!");
        return;
    }

    const titleDisplay = document.getElementById('study-title-display');
    const contentContainer = document.getElementById('study-content');
    const modal = document.getElementById('study-detail-modal');

    if (titleDisplay) titleDisplay.textContent = study.title;
    if (contentContainer) {
        contentContainer.innerHTML = '';
        study.sections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.innerHTML = `<h4>${section.heading}</h4>${section.content}`;
            contentContainer.appendChild(sectionDiv);
        });
    }

    if (modal) modal.classList.add('show');
}


// =============================================
// FUNÇÕES DO SISTEMA PRINCIPAL (Ajustadas)
// =============================================

function showScreen(screenName) {
    // Validação de entrada
    if (!screenName || typeof screenName !== 'string') {
        console.error('Nome de tela inválido:', screenName);
        return;
    }
    
    // Se a tela alvo não for 'pcr' e a PCR estiver ativa, garante que o timer continue rodando.
    if (state.pcrActive && screenName !== 'pcr' && intervals.timer) {
        // Timer continua em background
    } else if (screenName === 'home' && state.pcrActive) {
        console.warn("Retornando à Home com PCR ativa. O atendimento continua em segundo plano.");
    } 
    
    // Lógica para finalizar timer quando for para home APÓS PCR ATIVA TER SIDO ENCERRADA
    if (screenName === 'home' && !state.pcrActive) {
        clearAllIntervals();
        if (state.metronomeActive) stopMetronome();
    }
    
    // Verifica permissões de acesso
    if (screenName === 'log' && !checkAccess('log_history')) return;
    if ((screenName === 'quiz-config' || screenName === 'studies') && !checkAccess('quiz_simulations')) return;
    
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const targetScreen = document.getElementById(screenName + '-screen');
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const navName = screenName === 'dashboard' ? 'dashboard' : screenName;
    const navItem = document.getElementById(`nav-${navName}`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    state.currentScreen = screenName;

    if (screenName === 'log') {
        renderPatientLog(); 
    }
    
    if (screenName === 'home') {
        updateGreetingsAndHeader(); 
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.remove('show');
        // Limpa seleções de formulários ao fechar para evitar persistência indesejada
        const forms = modal.querySelectorAll('form');
        forms.forEach(form => {
            if (form.id !== 'login-form' && form.id !== 'profile-update-form') {
                // Não limpa formulários de login/perfil
                const inputs = form.querySelectorAll('input:not([type="radio"]), textarea, select');
                inputs.forEach(input => {
                    if (input.type === 'checkbox') {
                        input.checked = false;
                    } else {
                        input.value = '';
                    }
                });
            }
        });
    }
}

function cancelPatientSetup() {
    closeModal('patient-modal');
    showScreen('home');
}

// ================================================
// SISTEMA DE CONTROLE DE USO - V5.0
// Reset após 24h do último uso (não à meia-noite)
// Limites: FREE = 1, STUDENT = 10, PRO = Ilimitado
// ================================================

const FREE_DAILY_LIMIT = 1;      // Plano gratuito: 1 caso a cada 24h
const STUDENT_DAILY_LIMIT = 10;  // Plano estudante: 10 casos a cada 24h
const RESET_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas em milissegundos

/**
 * Formata tempo restante em formato legível
 * @param {number} ms - Milissegundos
 * @returns {string} - Tempo formatado
 */
function formatTimeRemaining(ms) {
    // Garantir que ms seja positivo
    if (ms <= 0) {
        return 'disponível agora';
    }

    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours}h ${minutes}min`;
    } else if (minutes > 0) {
        return `${minutes} minutos`;
    } else {
        return 'menos de 1 minuto';
    }
}

/**
 * Verifica e incrementa o contador de uso do simulador
 * @param {string} userPlan - Plano do usuário ('free', 'student', 'professional', 'lifetime')
 * @returns {object} - {allowed: boolean, remaining: number, isWarning: boolean, timeUntilReset: string}
 */
async function checkAndIncrementSimulationUse(userPlan) {
    console.log('🔍 Verificando uso do simulador para plano:', userPlan);

    // Normalizar nome do plano
    const normalizedPlan = userPlan.toLowerCase();

    // Planos ilimitados (professional, profissional, lifetime, vitalicio)
    if (normalizedPlan === 'professional' || normalizedPlan === 'profissional' ||
        normalizedPlan === 'lifetime' || normalizedPlan === 'vitalicio') {
        console.log('✅ Plano ilimitado - uso permitido');
        return {
            allowed: true,
            remaining: null,
            isWarning: false,
            message: 'Acesso ilimitado',
            timeUntilReset: null
        };
    }

    // Determinar limite baseado no plano
    let dailyLimit;
    if (normalizedPlan === 'free') {
        dailyLimit = FREE_DAILY_LIMIT;
    } else if (normalizedPlan === 'student' || normalizedPlan === 'estudante') {
        dailyLimit = STUDENT_DAILY_LIMIT;
    } else {
        // Fallback para planos desconhecidos
        dailyLimit = FREE_DAILY_LIMIT;
        console.warn(`⚠️ Plano desconhecido '${userPlan}', usando limite FREE`);
    }
    console.log(`📋 Limite para plano ${userPlan}:`, dailyLimit);

    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // Início do dia atual

    let currentCount = 0;

    // Conta os logs de simulação no Supabase do usuário no dia atual
    if (state.currentUser && state.currentUser.isLoggedIn && state.currentUser.id) {
        try {
            const { count, error } = await supabase
                .from('simulation_logs') // Tabela onde salvam-se os logs de simulação
                .select('*', { count: 'exact', head: true })
                .eq('user_id', state.currentUser.id)
                .gte('created_at', todayStart.toISOString());
                
            if (!error) {
                currentCount = count || 0;
            } else {
                console.error('Erro ao contar uso no Supabase:', error);
            }
        } catch (err) {
            console.error('Falha ao consultar limite no Supabase:', err);
        }
    } else {
        console.warn('⚠️ Usuário não logado, o uso do simulador pode falhar na validação do limite.');
    }

    const timeUntilReset = RESET_INTERVAL_MS - (now - todayStart.getTime());
    const remaining = dailyLimit - currentCount;

    console.log(`📊 Uso atual: ${currentCount}/${dailyLimit} (restam ${remaining})`);

    // Bloquear se atingiu o limite
    if (currentCount >= dailyLimit) {
        console.warn('🚫 LIMITE ATINGIDO!');

        const timeRemainingFormatted = formatTimeRemaining(timeUntilReset);

        let message;
        if (normalizedPlan === 'free') {
            message = `Você atingiu o limite de ${dailyLimit} uso do Simulador Avançado.\n\n` +
                     `⏰ Tempo até reset: ${timeRemainingFormatted}\n\n` +
                     `Upgrade para treinar sem limites!`;
        } else if (normalizedPlan === 'student' || normalizedPlan === 'estudante') {
            message = `Você atingiu o limite de ${dailyLimit} usos do Simulador Avançado.\n\n` +
                     `⏰ Tempo até reset: ${timeRemainingFormatted}\n\n` +
                     `Upgrade para Profissional e treine ilimitado!`;
        } else {
            message = `Você atingiu o limite de ${dailyLimit} usos.\n\n` +
                     `⏰ Tempo até reset: ${timeRemainingFormatted}\n\n` +
                     `Faça upgrade para treinar sem limites!`;
        }

        return {
            allowed: false,
            remaining: 0,
            isWarning: false,
            message: message,
            upgradeRequired: true,
            limit: dailyLimit,
            timeUntilReset: timeRemainingFormatted
        };
    }

    // O incremento real agora acontece *apenas* quando a simulação finaliza 
    // (na função saveSimulationLog que insere na tabela simulation_logs do Supabase).
    // Isso é mais justo: se o usuário fechar a página no meio, não perde o limite de uso diário.

    // Alertar no penúltimo uso (quando restar apenas 1)
    const newRemaining = dailyLimit - (currentCount + 1);
    const isWarning = newRemaining === 0;

    if (isWarning) {
        console.warn('⚠️ ALERTA: Resta apenas 1 simulação de cortesia!');
    }

    console.log(`✅ Uso permitido. Ao concluir a simulação, a nova contagem será ${currentCount + 1}/${dailyLimit}`);

    const timeRemainingFormatted = formatTimeRemaining(timeUntilReset);

    // Mensagens personalizadas por plano
    let warningMessage;
    if (normalizedPlan === 'free' && currentCount === 0) {
        warningMessage = `⚠️ Este é seu único caso gratuito do dia.\n\n` +
                        `⏰ Próximo uso disponível em: ${timeRemainingFormatted}\n\n` +
                        `Pratique mais intensamente com upgrade!`;
    } else if (isWarning && (normalizedPlan === 'student' || normalizedPlan === 'estudante')) {
        warningMessage = `⚠️ Atenção: Resta apenas 1 uso do Simulador hoje.\n\n` +
                        `⏰ Reset em: ${timeRemainingFormatted}\n\n` +
                        `Upgrade para Profissional e treine ilimitado!`;
    } else if (isWarning) {
        warningMessage = `⚠️ Atenção: Resta apenas 1 uso.\n\n` +
                        `⏰ Reset em: ${timeRemainingFormatted}`;
    } else {
        warningMessage = `Você tem ${newRemaining + 1} usos restantes.\n\n` +
                        `⏰ Reset em: ${timeRemainingFormatted}`;
    }

    return {
        allowed: true,
        remaining: newRemaining + 1,
        isWarning: isWarning || (normalizedPlan === 'free'),
        message: warningMessage,
        upgradeRequired: false,
        limit: dailyLimit,
        timeUntilReset: timeRemainingFormatted
    };
}

/**
 * Função helper para resetar o contador de uso (DEBUG)
 * Chamar no console: resetSimulationUsage()
 */
function resetSimulationUsage() {
    const storageKey = 'siav_simulator_usage';
    localStorage.removeItem(storageKey);
    console.log('✅ Contador de uso resetado!');
    return 'Contador resetado com sucesso. Você pode usar o simulador novamente.';
}

/**
 * Função helper para verificar uso atual sem incrementar (DEBUG)
 * Chamar no console: checkCurrentUsage()
 */
function checkCurrentUsage() {
    const storageKey = 'siav_simulator_usage';
    const userPlan = state.currentUser?.plan || 'free';
    const stored = localStorage.getItem(storageKey);
    const now = Date.now();
    const usageData = stored ? JSON.parse(stored) : { firstUseTimestamp: now, count: 0 };

    const normalizedPlan = userPlan.toLowerCase();
    let limit;
    if (normalizedPlan === 'free') {
        limit = FREE_DAILY_LIMIT;
    } else if (normalizedPlan === 'student' || normalizedPlan === 'estudante') {
        limit = STUDENT_DAILY_LIMIT;
    } else if (normalizedPlan === 'professional' || normalizedPlan === 'profissional' ||
               normalizedPlan === 'lifetime' || normalizedPlan === 'vitalicio') {
        limit = 'Ilimitado';
    } else {
        limit = FREE_DAILY_LIMIT;
    }

    const timeSinceFirstUse = now - usageData.firstUseTimestamp;
    const timeUntilReset = RESET_INTERVAL_MS - timeSinceFirstUse;
    const timeRemainingFormatted = timeUntilReset > 0 ? formatTimeRemaining(timeUntilReset) : 'Disponível agora';

    console.log('📊 Status de Uso do Simulador:');
    console.log('   Plano:', userPlan);
    console.log('   Limite:', limit);
    console.log('   Usado neste período:', usageData.count);
    console.log('   Primeiro uso:', new Date(usageData.firstUseTimestamp).toLocaleString('pt-BR'));
    console.log('   ⏰ Tempo até reset:', timeRemainingFormatted);
    console.log('   Restante:', typeof limit === 'number' ? limit - usageData.count : 'Ilimitado');

    return {
        plan: userPlan,
        limit: limit,
        used: usageData.count,
        firstUse: new Date(usageData.firstUseTimestamp).toLocaleString('pt-BR'),
        timeUntilReset: timeRemainingFormatted,
        remaining: typeof limit === 'number' ? limit - usageData.count : 'Ilimitado'
    };
}

// Tornar funções disponíveis globalmente para debug
window.resetSimulationUsage = resetSimulationUsage;
window.checkCurrentUsage = checkCurrentUsage;

/**
 * Exibe uma notificação toast
 * @param {string} message - Mensagem
 * @param {string} type - Tipo: 'info', 'success', 'warning', 'danger'
 * @param {number} timeout - Tempo em ms
 */
function showToastNotification(message, type = 'info', timeout = 4000) {
    // Criar container se não existir
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    // Cores por tipo
    const colors = {
        info: '#3498db',
        success: '#27ae60',
        warning: '#f39c12',
        danger: '#e74c3c'
    };

    const icons = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        danger: '🚫'
    };

    // Criar toast
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${colors[type] || colors.info};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-size: 14px;
        font-weight: 500;
        pointer-events: auto;
        cursor: pointer;
        animation: slideInRight 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 10px;
    `;

    toast.innerHTML = `
        <span style="font-size: 20px;">${icons[type] || icons.info}</span>
        <span style="flex: 1;">${message}</span>
        <button style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; padding: 0; margin-left: 10px; opacity: 0.7;" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);

    // Auto-remover
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, timeout);

    // Adicionar CSS de animação se necessário
    if (!document.getElementById('toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
            @keyframes slideInRight {
                from { opacity: 0; transform: translateX(100%); }
                to { opacity: 1; transform: translateX(0); }
            }
            @keyframes slideOutRight {
                from { opacity: 1; transform: translateX(0); }
                to { opacity: 0; transform: translateX(100%); }
            }
        `;
        document.head.appendChild(style);
    }
}

function showPatientModal() {
    const patientModal = document.getElementById('patient-modal');
    if(patientModal) patientModal.classList.add('show');
}

function savePatientData(e) {
    e.preventDefault();

    try {
        const weightValue = document.getElementById('patient-weight').value;
        const ageValue = document.getElementById('patient-age').value;
        const sexChecked = document.querySelector('input[name="sex"]:checked');

        // Sanitizar inputs de paciente
        const patientName = document.getElementById('patient-name');
        const patientAllergies = document.getElementById('patient-allergies');
        const patientComorbidities = document.getElementById('patient-comorbidities');

        // Validacao de entrada
        if (weightValue && (isNaN(weightValue) || parseFloat(weightValue) <= 0 || parseFloat(weightValue) > 500)) {
            alert('Peso invalido! Deve ser um numero entre 0 e 500 kg.');
            return;
        }

        if (ageValue && (isNaN(ageValue) || parseInt(ageValue) < 0 || parseInt(ageValue) > 150)) {
            alert('Idade invalida! Deve ser um numero entre 0 e 150 anos.');
            return;
        }

        // Sanitizar e validar nome
        const sanitizedName = patientName ? patientName.value.trim().replace(/[<>]/g, '') : '';
        if (sanitizedName && sanitizedName.length > 100) {
            alert('Nome muito longo! Maximo de 100 caracteres.');
            return;
        }

        state.patient = {
            name: sanitizedName || 'N/I',
            age: ageValue || 'N/I',
            sex: sexChecked ? sexChecked.value : 'N/I',
            weight: weightValue || 'N/I',
            allergies: (patientAllergies ? patientAllergies.value.trim().replace(/[<>]/g, '') : '') || 'Nenhuma informada',
            comorbidities: (patientComorbidities ? patientComorbidities.value.trim().replace(/[<>]/g, '') : '') || 'N/I'
        };
    } catch (error) {
        console.error('Erro ao salvar dados do paciente:', error);
        alert('Erro ao salvar dados do paciente. Por favor, tente novamente.');
        return;
    }

    const displayName = document.getElementById('display-name');
    const displayAge = document.getElementById('display-age');
    const displaySex = document.getElementById('display-sex');
    const displayAllergies = document.getElementById('display-allergies');
    const allergiesRow = document.getElementById('allergies-row');
    const patientInfoDisplay = document.getElementById('patient-info-display');

    if(displayName) displayName.textContent = state.patient.name;
    if(displayAge) displayAge.textContent = (state.patient.age !== 'N/I' ? state.patient.age + ' anos' : 'N/I');
    if(displaySex) displaySex.textContent = state.patient.sex;
    
    if (allergiesRow) {
        if (state.patient.allergies && state.patient.allergies !== 'Nenhuma informada' && state.patient.allergies !== 'N/I') {
            if(displayAllergies) displayAllergies.textContent = state.patient.allergies;
            allergiesRow.style.display = 'flex';
        } else {
            allergiesRow.style.display = 'none';
        }
    }

    if(patientInfoDisplay) patientInfoDisplay.style.display = 'flex';
    
    closeModal('patient-modal');
    startPCR();
}

function startPCRWithUninformedData() {
    state.patient = {
        name: 'N/I',
        age: 'N/I', 
        sex: 'N/I',
        weight: 'N/I',
        allergies: 'Nenhuma informada',
        comorbidities: 'N/I'
    };
    
    const displayName = document.getElementById('display-name');
    const displayAge = document.getElementById('display-age');
    const displaySex = document.getElementById('display-sex');
    const allergiesRow = document.getElementById('allergies-row');
    const patientInfoDisplay = document.getElementById('patient-info-display');

    if(displayName) displayName.textContent = 'N/I';
    if(displayAge) displayAge.textContent = 'N/I';
    if(displaySex) displaySex.textContent = 'N/I';
    if(allergiesRow) allergiesRow.style.display = 'none';
    if(patientInfoDisplay) patientInfoDisplay.style.display = 'flex';

    closeModal('patient-modal');
    startPCR();
}

function toggleMetronome() {
    if (state.metronomeActive) {
        stopMetronome();
    } else {
        startMetronome();
    }
}

/**
 * Inicia o metrônomo para auxiliar nas compressões torácicas.
 * 
 * O metrônomo usa Web Audio API para gerar sons com baixa latência.
 * - Frequencia: 800Hz (tom agudo)
 * - Duração: 0.03s (beep curto)
 * - Volume: 0.3 (30%)
 * 
 * O primeiro som é tocado imediatamente para evitar lag perceptual.
 */
function startMetronome() {
    // Previne múltiplas ativações
    if (state.metronomeActive) {
        console.warn('Metrônomo já está ativo');
        return;
    }
    
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Resume AudioContext se estiver suspenso
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    state.metronomeActive = true;
    const metroBtn = document.getElementById('metro-btn');
    const metroStatus = document.getElementById('metro-status');

    if (metroBtn) {
        metroBtn.classList.add('active');
    }
    if (metroStatus) {
        metroStatus.textContent = 'METRÔNOMO ATIVO';
    }
    
    const interval = 60000 / state.bpm;
    
    // Toca o primeiro som imediatamente
    createMetronomeSound();
    
    if (intervals.metronome) clearInterval(intervals.metronome);
    
    intervals.metronome = setInterval(() => {
        createMetronomeSound();
    }, interval);
}

function stopMetronome() {
    state.metronomeActive = false;
    const metroBtn = DOM_CACHE.metroBtn || document.getElementById('metro-btn');
    const metroStatus = DOM_CACHE.metroStatus || document.getElementById('metro-status');
    
    if(metroBtn) {
        metroBtn.classList.remove('active');
    }
    if(metroStatus) {
        metroStatus.textContent = 'INICIAR METRÔNOMO';
    }
    
    // Garantir limpeza completa do interval
    if (intervals.metronome) {
        clearInterval(intervals.metronome);
        intervals.metronome = null;
    }
}

function adjustBPM(change) {
    state.bpm += change;
    
    // Limitar valores com Math.min/max (mais eficiente)
    state.bpm = Math.max(100, Math.min(120, state.bpm));
    
    const bpmValue = DOM_CACHE.bpmValue || document.getElementById('bpm-value');
    if(bpmValue) bpmValue.textContent = state.bpm + ' BPM';
    
    if (state.metronomeActive) {
        // Reinicia o metrônomo sem tocar som imediato
        if (intervals.metronome) clearInterval(intervals.metronome);
        
        const interval = 60000 / state.bpm;
        intervals.metronome = setInterval(() => {
            createMetronomeSound();
        }, interval);
    }
}

function showMedModal() {
    const medDose = document.getElementById('medication-dose');
    const medSelect = document.getElementById('medication-select');
    const medModal = document.getElementById('med-modal');

    if(medDose) medDose.value = '';
    if(medSelect) medSelect.value = '';
    if(medModal) medModal.classList.add('show');
    
    updateMedicationDose();
}

function updateMedicationDose() {
    const medication = document.getElementById('medication-select').value;
    const weight = parseInt(state.patient.weight) || 70;
    const age = parseInt(state.patient.age) || 30;
    const isPediatric = age < 8 || weight < 30;
    
    let doseText = 'Selecione uma medicação';
    
    if (medication && MEDICATION_DOSES[medication]) {
        if (isPediatric) {
            const calculatedDoses = getCalculatedPediatricValues(weight); 
            
            doseText = MEDICATION_DOSES[medication].pediatric; 
            
            if (medication === 'adrenalina') {
                doseText = `${calculatedDoses.adrenalina} mg EV/IO (0.01 mg/kg)`;
            } else if (medication === 'amiodarona') {
                doseText = `${calculatedDoses.amiodarona} mg EV/IO (5 mg/kg)`;
            } else if (medication === 'lidocaina') {
                 doseText = `${calculatedDoses.lidocaina} mg EV/IO (1 mg/kg)`;
            }
            
        } else {
            doseText = MEDICATION_DOSES[medication].adult;
             if (medication === 'lidocaina') {
                const attackDose = (weight * 1.5).toFixed(0);
                doseText = `1-1.5 mg/kg (Ataque: ${attackDose} mg)`;
            }
        }
    }
    
    const medDose = document.getElementById('medication-dose');
    if(medDose) medDose.value = doseText;
}

// ===============================================
// FUNÇÕES DE MONITORAMENTO DE MEDICAÇÃO
// ===============================================

function getLastMedicationTime(medicationName) {
    /**
     * Retorna o tempo em segundos desde a última administração de um medicamento
     * @param {string} medicationName - Nome do medicamento (ex: 'Adrenalina', 'Amiodarona')
     * @returns {number|null} Tempo em segundos ou null se nunca foi administrado
     */
    const lastMed = state.medications.findLast(m => m.name.includes(medicationName));
    if (!lastMed || !lastMed.timestamp) return null;
    
    return (Date.now() - lastMed.timestamp) / 1000;
}

/**
 * Verifica se um medicamento deve ser administrado com base no intervalo recomendado.
 * 
 * @param {string} medicationName - Nome do medicamento (ex: 'Adrenalina', 'Amiodarona')
 * @param {number} intervalSeconds - Intervalo mínimo recomendado em segundos
 * @returns {Object} Status da medicação:
 *   - isDue {boolean}: Se deve ser administrado agora
 *   - secondsUntilDue {number}: Segundos restantes até próxima dose
 *   - message {string}: Mensagem descritiva do status
 * 
 * @example
 * const status = getMedicationDueStatus('Adrenalina', 180); // 3 minutos
 * if (status.isDue) {
 *   console.log('Administrar Adrenalina agora!');
 * }
 */
function getMedicationDueStatus(medicationName, intervalSeconds) {
    /**
     * Verifica se um medicamento deve ser administrado
     * @param {string} medicationName - Nome do medicamento
     * @param {number} intervalSeconds - Intervalo recomendado em segundos
     * @returns {object} { isDue: bool, secondsUntilDue: number, message: string }
     */
    const timeSinceLast = getLastMedicationTime(medicationName);
    
    if (timeSinceLast === null) {
        return {
            isDue: true,
            secondsUntilDue: 0,
            message: `${medicationName} nunca foi administrada. ADMINISTRE AGORA!`
        };
    }
    
    const secondsUntilDue = intervalSeconds - timeSinceLast;
    
    if (secondsUntilDue <= 0) {
        return {
            isDue: true,
            secondsUntilDue: 0,
            message: `${medicationName} está DEVIDA agora!`
        };
    } else {
        const minutesUntilDue = Math.ceil(secondsUntilDue / 60);
        return {
            isDue: false,
            secondsUntilDue,
            message: `Próxima ${medicationName} em ${minutesUntilDue} min (${Math.floor(timeSinceLast / 60)} min da última dose)`
        };
    }
}

function recordMedication() {
    try {
        const medicationSelect = document.getElementById('medication-select');
        const doseInput = document.getElementById('medication-dose');
        const routeElement = document.querySelector('input[name="administration-route"]:checked');

        // Validacao de elementos
        if (!medicationSelect || !doseInput) {
            alert('Erro: Campos de medicacao nao encontrados.');
            return;
        }

        const medication = medicationSelect.value;
        const dose = doseInput.value.trim();
        const route = routeElement ? routeElement.value : 'N/I';

        // Validacao de entrada
        if (!medication) {
            alert('Selecione uma medicacao!');
            return;
        }

        if (!dose) {
            alert('Digite a dose da medicacao!');
            return;
        }

        if (dose.length > 50) {
            alert('Dose muito longa! Maximo de 50 caracteres.');
            return;
        }

        // Vibracao media para feedback tatil de medicacao
        if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]); // Padrao medio
        }

        // Tocar som de medicação
        if (typeof playSystemSound === 'function') {
            playSystemSound('drug');
        }

        const medNames = {
            'adrenalina': 'Adrenalina',
            'amiodarona': 'Amiodarona',
            'atropina': 'Atropina',
            'bicarbonato': 'Bicarbonato de Sodio',
            'lidocaina': 'Lidocaina',
            'sulfato': 'Sulfato de Magnesio'
        };

        const medicationName = medNames[medication] || medication;

        // Adiciona o timestamp para calculo do proximo Adrenalina
        state.medications.push({
            name: medicationName,
            dose: dose,
            route: route,
            time: new Date(),
            timestamp: Date.now()
        });

        playNotification('DRUG');
        addEvent(`MEDICACAO: ${medicationName} - ${dose} via ${route}`, 'critical');
        closeModal('med-modal');

        updatePcrGuidance();
        // Atualiza o contador de medicacao imediatamente
        startDrugTimer();

        showTransientAlert(`${medicationName} administrado com sucesso!`, 'success', 3000);
    } catch (error) {
        console.error('Erro ao registrar medicacao:', error);
        alert('Erro ao registrar medicacao. Por favor, tente novamente.');
    }
}

function showNotesModal() {
    const notesModal = document.getElementById('notes-modal');
    if(notesModal) notesModal.classList.add('show');
}

function saveNotes() {
    try {
        const notesInput = document.getElementById('clinical-notes');

        if (!notesInput) {
            console.error('Campo de anotacoes nao encontrado');
            alert('Erro: Campo de anotacoes nao encontrado.');
            return;
        }

        const notes = notesInput.value || '';

        // Sanitizar input para prevenir XSS
        const sanitizedNotes = notes.trim().replace(/[<>]/g, '');

        // Validacao de entrada
        if (!sanitizedNotes) {
            alert('Digite alguma anotacao antes de salvar.');
            return;
        }

        if (sanitizedNotes.length > 5000) {
            alert('Anotacao muito longa! Maximo de 5000 caracteres.');
            return;
        }

        if (!checkAccess('notes_logging', false)) {
            if (confirm("Anotacoes salvas temporariamente na sessao. Faca upgrade para o Plano Profissional para salvar no log permanente.\n\nDeseja ver os planos disponíveis?")) {
                if (typeof openPlansModal === 'function') {
                    openPlansModal();
                } else if (window.openPlansModal) {
                    window.openPlansModal();
                }
            }
            closeModal('notes-modal');
            notesInput.value = '';
            return;
        }

        state.notes.push({
            text: sanitizedNotes,
            time: new Date()
        });

        addEvent(`ANOTACAO CLINICA: ${sanitizedNotes}`, 'normal');
        closeModal('notes-modal');
        notesInput.value = '';

        alert('Anotacoes salvas com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar anotacoes:', error);
        alert('Erro ao salvar anotacoes. Por favor, tente novamente.');
    }
}

function generateEvolution(saveLog) {
    const totalDurationSeconds = state.pcrSeconds;
    const now = new Date();
    
    const patientName = state.patient.name;
    const shocksCount = state.shockCount;
    const medsList = state.medications.map(m => `${m.name} (${m.dose} via ${m.route})`).join('; ');
    const compressionDuration = state.totalCompressionSeconds;
    const compressionRatio = totalDurationSeconds > 0 
        ? ((compressionDuration / totalDurationSeconds) * 100).toFixed(1)
        : 0;
    
    const firstShockEvent = state.events.find(e => e.text.includes('CHOQUE'));
    const firstShockTime = firstShockEvent ? firstShockEvent.time : 'N/A';
    const firstShockEnergy = firstShockEvent ? firstShockEvent.text.match(/(\d+)J/)?.[1] || 'N/A' : 'N/A';

    const firstAdrenalineTime = state.events.find(e => e.text.includes('Adrenalina'))?.time || 'N/A';
    const finalRhythm = state.rhythms[state.rhythms.length - 1]?.name || 'Não Registrado';
    
    const chronologicalEvents = state.events.slice().reverse().map(event => {
        return {
            time: event.time,
            action: event.text.trim(),
        };
    });
    
    const logEvents = chronologicalEvents.map(e => 
        `<li>[${e.time}] ${e.action}</li>`
    ).join('');

    const patientNameClean = patientName;

    const reportHTML = `
        <div class="report-container">
            <button onclick="closeModal('log-detail-modal'); showScreen('home')" class="back-button">← Retornar ao Menu Principal</button>
            <h2 style="text-align: center; border-bottom: 2px solid var(--secondary);">RELATÓRIO DE ATENDIMENTO SIAV - VALIDADE JURÍDICA</h2>
            
            <p><strong>Número do Atendimento:</strong> ${state.patientLog.length + 1} (Registro provisório)</p>
            <p><strong>Data/Hora de Início:</strong> ${new Date(state.pcrStartTime).toLocaleString('pt-BR')}</p>
            <p><strong>Profissional Responsável:</strong> ${state.currentUser.name} (${state.currentUser.profession || 'N/I'})</p>
            
            <h3 style="margin-top: 20px;">DADOS DO PACIENTE</h3>
            <ul>
                <li>Nome/ID: ${patientNameClean}</li>
                <li>Idade: ${state.patient.age} anos | Peso: ${state.patient.weight} kg</li>
                <li>Comorbidades: ${state.patient.comorbidities}</li>
                <li>Alergias: <span style="font-weight: 700; color: ${state.patient.allergies !== 'Nenhuma informada' && state.patient.allergies !== 'N/I' ? 'var(--danger)' : 'inherit'};">${state.patient.allergies}</span></li>
            </ul>

            <h3 style="margin-top: 20px;">RESUMO ANALÍTICO DE PERFORMANCE (AHA)</h3>
            <ul>
                <li><strong>Desfecho Final:</strong> ${state.roscAchieved ? 'ROSC ALCANÇADO' : 'PCR NÃO REVERTIDA'}</li>
                <li><strong>Duração Total do Atendimento:</strong> ${formatTime(totalDurationSeconds)}</li>
                <li><strong>Tempo de Compressão Ativa (Hands-on Time):</strong> ${formatTime(compressionDuration)} (${compressionRatio}% do Tempo Total)</li>
                <li><strong>Choques Administrados:</strong> ${shocksCount} (1º Choque em: ${firstShockTime}, ${firstShockEnergy}J)</li>
                <li><strong>Primeira Adrenalina:</strong> ${firstAdrenalineTime}</li>
                <li><strong>Ritmo Final Registrado:</strong> ${finalRhythm}</li>
            </ul>

            <h3 style="margin-top: 20px;">DETALHES CRONOLÓGICOS DO EVENTO (Log)</h3>
            <ol class="log-list">${logEvents}</ol>

            <h3 style="margin-top: 20px;">ANOTAÇÕES E MEDICAMENTOS</h3>
            <ul>
                <li>Medicamentos Aplicados: ${medsList || 'Nenhum'}</li>
                <li>Anotações Clínicas Extras: ${state.notes.map(n => n.text).join('; ') || 'Nenhuma'}</li>
            </ul>
            
            <p style="margin-top: 30px; font-style: italic; border-top: 1px solid #ccc; padding-top: 10px; font-size: 0.85em;">
                Este documento é uma transcrição técnica das ações registradas no Sistema SIAV, em conformidade com as diretrizes ACLS/AHA.
            </p>
        </div>
    `;

    if (saveLog) {
        const logEntry = {
            patientName: patientName,
            startTime: state.pcrStartTime,
            durationSeconds: totalDurationSeconds,
            roscAchieved: state.roscAchieved,
            shocks: shocksCount,
            meds: state.medications.length,
            compressionTime: compressionDuration,
            evolutionText: reportHTML,
            report_html: reportHTML,
            evolution_text: reportHTML,
            notes: reportHTML
        };
        savePcrLogToSupabase(logEntry).then(result => {
            if (result.success) {
                updateDashboard();
            }
        });
    }

    showScreen('home');
    return;
}

function renderPatientLog() {
    // Aguarda perfil carregado antes de checar permissões
    if (!state.currentUser || !state.currentUser.plan) {
        setTimeout(renderPatientLog, 200);
        return;
    }
    console.log('[DEBUG] Plano do usuário no momento da checagem:', state.currentUser?.plan);
    const logList = document.getElementById('patient-log-list');
    if (!logList) return;
    logList.innerHTML = '<p style="text-align: center;">Carregando Histórico Online...</p>';

    // Verificação local de autenticação
    if (!state.currentUser.isLoggedIn) {
        logList.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <p style="color: var(--danger); font-weight: 700; margin-bottom: 15px;">Faça login para acessar o histórico.</p>
                <button onclick="showProfileModal()" class="primary-btn">
                    Fazer Login
                </button>
            </div>
        `;
        return;
    }

    // TODOS os usuários logados podem ver seus logs
    // Limites são aplicados no salvamento, não na visualização

    // Permissão OK, renderiza normalmente
    fetchPcrLogs().then(() => {
        if (state.patientLog.length === 0) {
            logList.innerHTML = '<p style="text-align: center; color: #666;">Nenhum atendimento salvo no seu histórico online.</p>';
            return;
        }
        logList.innerHTML = '';
        state.patientLog.forEach(logItem => {
            const itemElement = document.createElement('div');
            itemElement.className = 'log-item';
            itemElement.setAttribute('data-log-id', logItem.id);
            const patientName = logItem.patientName && logItem.patientName !== 'N/I'
                ? logItem.patientName
                : `Paciente N/I`;
            const dateString = logItem.time instanceof Date ? logItem.time.toLocaleDateString('pt-BR') : 'N/A';
            const timeString = logItem.time instanceof Date ? logItem.time.toLocaleTimeString('pt-BR') : 'N/A';
            const shockCount = logItem.shocks || 0;
            itemElement.innerHTML = `
                <div class="log-summary">
                    <span>${patientName}</span>
                    <span style="color: var(--primary);">${logItem.duration}</span>
                </div>
                <div class="log-details">
                    <span class="log-date">Data: ${dateString} ${timeString}</span>
                    <span class="log-duration">Choques: ${shockCount}</span>
                    <button class="delete-log-btn" data-id="${logItem.id}">🗑️ Excluir</button>
                </div>
            `;
            logList.appendChild(itemElement);
        });
        document.querySelectorAll('.delete-log-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const logId = this.getAttribute('data-id');
                deleteLogEntry(logId);
            });
        });
        document.querySelectorAll('.log-item').forEach(item => {
            item.addEventListener('click', function() {
                const logId = this.getAttribute('data-log-id');
                viewLogDetail(logId);
            });
        });
    }).catch(() => {
        logList.innerHTML = '<p style="text-align: center; color: var(--danger); font-weight: 700;">Erro ao carregar histórico.</p>';
    });
}

function viewLogDetail(logId) {
    const logItem = state.patientLog.find(item => String(item.id) === String(logId));

    if (!logItem) {
        alert('Registro não encontrado!');
        return;
    }

    const detailId = document.getElementById('log-detail-id');
    const detailContent = document.getElementById('log-detail-content');
    const modal = document.getElementById('log-detail-modal');

    if (detailId) detailId.textContent = logId.substring(0, 8);
    // Mostra o relatório a partir do primeiro campo preenchido
    const report = logItem.evolutionText || logItem.report_html || logItem.evolution_text || logItem.notes || '<em>Sem relatório detalhado.</em>';
    if (detailContent) detailContent.innerHTML = report;
    
    if (modal) modal.classList.add('show');
}

function downloadProtocolPDF(protocolKey) {
    import('./src/services/permissions.js').then(({ canAccess }) => {
        if (!canAccess('pdf_download')) {
            alert('Recurso disponível apenas para assinantes Estudante ou Profissional.');
            return;
        }
        // ...restante da função
    });

    const protocol = PROTOCOLS[protocolKey];
    if (!protocol) return alert("Protocolo não encontrado para download.");

    const contentElement = document.getElementById('protocol-content'); 
    const watermarkOverlay = document.getElementById('pdf-watermark-overlay');

    if (!contentElement) return alert("Erro: Conteúdo do protocolo não encontrado na tela.");

    if (watermarkOverlay) {
        const watermarkClone = watermarkOverlay.cloneNode(true);
        watermarkClone.style.display = 'block';
        watermarkClone.style.position = 'absolute';
        watermarkClone.style.zIndex = '9999';
        watermarkClone.style.opacity = '0.2';
        watermarkClone.style.transform = 'rotate(-30deg)';
        watermarkClone.style.width = '100%';
        watermarkClone.style.height = '100%';
        watermarkClone.style.top = '0';
        watermarkClone.style.left = '0';
        watermarkClone.style.textAlign = 'center';
        watermarkClone.style.color = '#333';
        watermarkClone.innerHTML = `<h1 style="font-size: 60px; margin-top: 30%;">S.I.A.V.</h1>`;
        
        contentElement.appendChild(watermarkClone);
    }
    
    alert("Iniciando o download do PDF. Por favor, use a função 'Salvar como PDF' na janela de impressão para obter o arquivo com a marca d'água.");

    const modalContent = document.getElementById('protocol-detail-modal').querySelector('.modal-content').innerHTML;
    
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>' + protocol.title + '</title>');
    printWindow.document.write('<link rel="stylesheet" href="style.css" type="text/css" />');
    printWindow.document.write('</head><body><div id="print-area">');
    printWindow.document.write(protocol.content);
    printWindow.document.write('<div style="position: fixed; top: 30%; left: 0; width: 100%; text-align: center; opacity: 0.15; transform: rotate(-30deg); font-size: 60px; color: #333;">S.I.A.V.</div>');
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(function(){
        printWindow.print();
        printWindow.close();
    }, 500);
    
    const tempWatermark = contentElement.querySelector('#pdf-watermark-overlay');
    if (tempWatermark) tempWatermark.remove();
}

function showProtocolDetail(protocolKey) {
    const protocol = PROTOCOLS[protocolKey];
    if (!protocol) {
        alert("Protocolo não encontrado!");
        return;
    }

    const titleDisplay = document.getElementById('protocol-title-display');
    const content = document.getElementById('protocol-content');
    const modal = document.getElementById('protocol-detail-modal');
    
    const downloadBtn = document.getElementById('protocol-download-btn');
    if(downloadBtn) {
        downloadBtn.onclick = () => downloadProtocolPDF(protocolKey);
        
        if (!checkAccess('pdf_download', false)) {
            downloadBtn.disabled = true;
            downloadBtn.textContent = '🔒 Download (Upgrade)';
        } else {
            downloadBtn.disabled = false;
            downloadBtn.textContent = '📥 Baixar PDF';
        }
    }


    if(titleDisplay) titleDisplay.textContent = protocol.title;
    if(content) content.innerHTML = protocol.content;
    
    if(modal) modal.classList.add('show');
}

// =============================================
// PERSONALIZAÇÃO DE TRATAMENTO (AHA 2025)
// =============================================

function getTreatmentRecommendation(cause, patientData) {
    const weight = patientData.weight || 70;
    const age = patientData.age || 30;
    const isPediatric = age < 18;
    const isElderly = age >= 65;
    
    const treatments = {
        'Hipovolemia': () => {
            const bolusVolume = isPediatric 
                ? Math.round(weight * 20)
                : Math.round(weight * 10);
            
            let instructions = isPediatric
                ? `1️⃣ INFUNDIR: Soro Fisiológico 0,9% ${bolusVolume}ml (20ml/kg) em 5-10 minutos.\n2️⃣ REAVALIAR perfusão após cada bolus (pulso, enchimento capilar, PA).\n3️⃣ REPETIR até melhora clínica (máximo 60ml/kg no total).\n4️⃣ SANGRAMENTO ativo? Considerar concentrado de hemácias.`
                : `1️⃣ INFUNDIR: Cristaloide 500-1000ml em acesso calibroso (jelco 14 ou 16).\n2️⃣ REAVALIAR a cada bolus (PA, pulso, diurese).\n3️⃣ SANGRAMENTO? Protocolo de transfusão maciça (meta Hb >7g/dL).\n4️⃣ ${isElderly ? 'CUIDADO: Avaliar sobrecarga em cardiopatas.' : 'Considerar expansão até 30ml/kg se necessário.'}`;
            
            return instructions;
        },
        
        'Hipóxia': () => {
            let instructions = isPediatric
                ? `1️⃣ VERIFICAR: Via aérea pérvia? Tubo orotraqueal (TOT) bem posicionado? Ausculta bilateral.\n2️⃣ OXIGENAR: Oferecer O2 a 100% (meta SpO2 94-99%).\n3️⃣ VENTILAR: 12-20 rpm, volume 6-8ml/kg (${Math.round(weight * 6)}-${Math.round(weight * 8)}ml).\n4️⃣ MONITORAR: Capnografia contínua (EtCO2 35-45 mmHg).\n5️⃣ DESCARTAR: Pneumotórax, intubação esofágica, obstrução do tubo.`
                : `1️⃣ CHECAR: Tubo orotraqueal (TOT) bem fixado? Ausculta pulmonar bilateral e simétrica.\n2️⃣ OXIGENAR: Oferecer O2 a 100% (meta SpO2 ≥94%).\n3️⃣ VENTILAR: 10 rpm (1 ventilação a cada 6 segundos). Evitar hiperventilação!\n4️⃣ MONITORAR: EtCO2 entre 35-40 mmHg (confirma posição correta e ventilação adequada).\n5️⃣ INVESTIGAR: Pneumotórax, broncoespasmo, edema agudo de pulmão.`;
            
            return instructions;
        },
        
        'Hidrogênio (Acidose)': () => {
            const bicarbonateDose = Math.round(weight * 1);
            
            let instructions = `1️⃣ VENTILAR adequadamente (melhor tratamento para acidose respiratória).\n2️⃣ BICARBONATO DE SÓDIO ${bicarbonateDose} mEq EV SOMENTE SE:\n   • pH <7,1 documentado OU\n   • Hipercalemia grave (K+ >6,5) OU\n   • Intoxicação por antidepressivos tricíclicos.\n3️⃣ ${isPediatric ? 'DILUIR em SF 0,9% e infundir em 5-10 minutos.' : 'INFUNDIR lentamente (risco de hipernatremia e alcalose paradoxal).'}\n4️⃣ CORRIGIR causa de base da acidose (hipóxia, choque, parada prolongada).`;
            
            return instructions;
        },
        
        'Hipo/Hipercalemia': () => {
            const insulinDose = isPediatric ? `0,1 UI/kg (${(weight * 0.1).toFixed(1)} UI)` : '10 UI';
            
            let instructions = `🔴 GASOMETRIA ARTERIAL URGENTE!\n\n📈 HIPERCALEMIA (K+ >5,5):\n1️⃣ GLUCONATO DE CÁLCIO 10%: 10-20ml EV em 2-5 min (estabiliza membrana cardíaca).\n2️⃣ INSULINA Regular ${insulinDose} + Glicose 50% 25g EV (desloca K+ para dentro da célula).\n3️⃣ BICARBONATO DE SÓDIO: ${Math.round(weight * 1)} mEq se acidose associada.\n${isPediatric ? '4️⃣ SALBUTAMOL (aerolin) nebulização 2,5-5mg.\n' : ''}4️⃣ HEMODIÁLISE se K+ >6,5 e refratário ao tratamento.\n\n📉 HIPOCALEMIA (K+ <3,5):\n1️⃣ Cloreto de Potássio (KCl) 10-20 mEq EV diluído (máximo 10 mEq/h em acesso periférico).\n2️⃣ MONITORAR ECG continuamente (risco de arritmias).`;
            
            return instructions;
        },
        
        'Hipotermia': () => {
            let instructions = `⚠️ TEMPERATURA <30°C = RCP PROLONGADA obrigatória!\n\n1️⃣ REAQUECER:\n   • Soros EV aquecidos 40-42°C\n   • Mantas térmicas ativas\n   • ${isElderly ? 'CUIDADO: Arritmias durante reaquecimento em idosos.\n   • ' : ''}ECMO/circulação extracorpórea (método MAIS EFICAZ se disponível).\n\n2️⃣ NÃO DECLARAR ÓBITO até temperatura >32°C.\n\n3️⃣ MEDICAÇÕES e CARDIOVERSÃO podem ser ineficazes com temperatura <30°C:\n   • Manter RCP até reaquecer\n   • Considerar espaçar medicações até temperatura >30°C.`;
            
            return instructions;
        },
        
        'Tamponamento Cardíaco': () => {
            const fluidBolus = isPediatric ? Math.round(weight * 20) : 1000;
            
            let instructions = `🚨 EMERGÊNCIA CIRÚRGICA!\n\n1️⃣ PERICARDIOCENTESE imediata (guiada por ecocardiograma se possível):\n   • Via subxifóidea ou paraesternal\n   • Ouvir escape de ar = sucesso do procedimento.\n\n2️⃣ EXPANSÃO VOLÊMICA enquanto prepara o procedimento:\n   • Cristaloide ${fluidBolus}ml em bolus rápido\n   • Objetivo: manter pré-carga.\n\n3️⃣ SINAIS CLÍNICOS (Tríade de Beck):\n   • Turgência jugular + Abafamento de bulhas + Pressão baixa.\n\n4️⃣ FALHOU? Toracotomia de emergência.`;
            
            return instructions;
        },
        
        'Pneumotórax Hipertensivo': () => {
            const needleSize = isPediatric ? 'jelco 18 ou 20' : 'jelco 14 ou 16';
            
            let instructions = `⚠️ NÃO AGUARDAR RAIO-X DE TÓRAX!\n\n1️⃣ DESCOMPRESSÃO IMEDIATA:\n   • Agulha (${needleSize}) no 2° espaço intercostal linha hemiclavicular\n   • OU 4°-5° espaço intercostal linha axilar anterior\n   • Ouvir escape de ar = sucesso do procedimento.\n\n2️⃣ SINAIS CLÍNICOS:\n   • Desvio de traqueia\n   • Ausência UNILATERAL de murmúrio vesicular (MV)\n   • Estase jugular (turgência de veias do pescoço)\n   • Hipotensão + queda de saturação.\n\n3️⃣ SEGUIR com drenagem torácica em selo d'água (dreno de tórax).`;
            
            return instructions;
        },
        
        'Trombose (TEP/IAM)': () => {
            const rtpaDose = isPediatric ? 'CONSULTAR especialista' : `${weight}mg (1mg/kg, máximo 100mg)`;
            
            let instructions = `🩸 TROMBOEMBOLISMO PULMONAR (TEP):\n1️⃣ RCP de ALTA QUALIDADE por 60-90 minutos.\n2️⃣ TROMBOLÍTICO: rtPA ${rtpaDose} OU Alteplase 50mg em bolus.\n3️⃣ ${isElderly ? 'RISCO DE SANGRAMENTO aumentado (idade >75 anos).\n3️⃣ ' : ''}Anticoagulação plena após retorno à circulação espontânea (RCE).\n\n❤️ INFARTO AGUDO DO MIOCÁRDIO (IAM):\n1️⃣ CATETERISMO/ANGIOPLASTIA de emergência (se disponível em <120 min).\n2️⃣ Manter RCP enquanto prepara hemodinâmica.\n3️⃣ Trombolítico se hemodinâmica indisponível.`;
            
            return instructions;
        },
        
        'Tóxicos': () => {
            const charcoalDose = isPediatric ? Math.round(weight * 1) : 50;
            
            let instructions = `🧪 IDENTIFICAR A INTOXICAÇÃO:\n\n💊 ANTÍDOTOS PRINCIPAIS:\n• Naloxona (narcan) 0,4-2mg EV (opioides)\n• Atropina 1-2mg EV (organofosforados)\n• Glucagon 5-10mg EV (bloqueadores beta, bloqueadores de canal de cálcio)\n• Flumazenil (lanexat) - benzodiazepínicos (RISCO em dependentes!)\n\n🥄 DESCONTAMINAÇÃO:\n• Carvão ativado ${charcoalDose}g por via oral (se ingestão há menos de 1h e paciente consciente)\n\n💉 TRATAMENTOS ESPECÍFICOS:\n• Bicarbonato: antidepressivos tricíclicos\n• Emulsão lipídica EV 20%: anestésicos locais\n• Hemodiálise: lítio, metanol, etilenoglicol, salicilatos (AAS)`;
            
            return instructions;
        },
        
        'Trauma': () => {
            let instructions = `🩹 CONTROLE DE HEMORRAGIA:\n1️⃣ Compressão direta em sangramentos externos.\n2️⃣ Garrote (torniquete) em hemorragias de membros.\n${isPediatric ? '3️⃣ ATENÇÃO: Crianças compensam PA até perder 25-30% do volume sanguíneo, depois descompensam rápido!\n' : ''}\n🔪 TORACOTOMIA DE RESSUSCITAÇÃO:\n• Indicada se trauma penetrante de tórax + PCR há menos de 10 minutos.\n\n🫁 AVALIAR:\n• Pneumotórax bilateral? (descompressão dos dois lados)\n• Tamponamento cardíaco?\n• Hemorragia interna maciça?\n\n🚑 TRANSPORTE RÁPIDO para hospital de referência em trauma.${isElderly ? '\n⚠️ Idosos: menor reserva funcional, mas RCP não é fútil!' : ''}`;
            
            return instructions;
        }
    };
    
    const generator = treatments[cause];
    return generator ? generator() : 'Tratamento não disponível para esta causa.';
}

function toggleCause(element) {
    const cause = element.getAttribute('data-cause');
    
    const isChecked = element.classList.contains('checked');
    
    const causesHeader = document.querySelector('.causes-header');
    const treatmentBox = document.getElementById('causes-treatment-box');
    const causeName = document.getElementById('selected-cause-name');
    const causeTreatment = document.getElementById('selected-cause-treatment');
    
    // Remove seleção de outros itens
    document.querySelectorAll('#causes-screen .cause-item.checked').forEach(item => {
        const itemCause = item.getAttribute('data-cause');
        if (item !== element) {
            item.classList.remove('checked');
            state.causesChecked = state.causesChecked.filter(c => c !== itemCause);
        }
    });

    if (!isChecked) {
        // Marcar como selecionado
        element.classList.add('checked');
        
        // Gerar tratamento personalizado
        const personalizedTreatment = getTreatmentRecommendation(cause, state.patient);
        
        // Substituir todo o header pela caixa de tratamento
        if (causesHeader) causesHeader.classList.add('treatment-active');
        if (treatmentBox) {
            treatmentBox.style.display = 'block';
            if (causeName) causeName.textContent = `${cause} - Protocolo Personalizado`;
            if (causeTreatment) causeTreatment.textContent = personalizedTreatment;
        }
        
        if (!state.causesChecked.includes(cause)) {
            state.causesChecked.push(cause);
        }

    } else {
        // Desmarcar
        element.classList.remove('checked');
        
        // Voltar ao header normal
        if (causesHeader) causesHeader.classList.remove('treatment-active');
        if (treatmentBox) treatmentBox.style.display = 'none';
        
        state.causesChecked = state.causesChecked.filter(c => c !== cause);
    }
}

function closeTreatmentFullscreen() {
    // Não mais necessária
}

function toggleStudyHSTs(element) {
    const cause = element.getAttribute('data-study-cause');
    const instructionData = HTS_INSTRUCTIONS[cause];
    const instruction = instructionData.instruction;

    const isExpanded = element.classList.contains('expanded');
    let contentBox = element.querySelector('.protocol-content-box');

    document.querySelectorAll('#hs-ts-study-list .protocol-item.expanded').forEach(item => {
        if (item !== element) {
            item.classList.remove('expanded');
            item.querySelector('.protocol-content-box')?.remove();
            item.querySelector('.protocol-title').textContent = item.querySelector('.protocol-title').textContent.replace(' (DETALHE)', '');
        }
    });

    if (isExpanded) {
        if (contentBox) contentBox.remove();
        element.classList.remove('expanded');
        element.querySelector('.protocol-title').textContent = element.querySelector('.protocol-title').textContent.replace(' (DETALHE)', '');
    } else {
        if (!contentBox) {
            contentBox = document.createElement('div');
            contentBox.className = 'protocol-content-box';
            contentBox.style.transition = 'max-height 0.3s ease-out';
            
            contentBox.innerHTML = `
                <p style="font-weight: 700; color: var(--dark);">Análise da Causa:</p>
                <p style="font-size: 0.9rem; margin-top: 5px; margin-bottom: 10px;">${instruction}</p>
            `;
            element.appendChild(contentBox);
        }
        element.classList.add('expanded');
        element.querySelector('.protocol-title').textContent += ' (DETALHE)';
    }
}

function createStudyHSTsList() {
    const listContainer = document.getElementById('hs-ts-study-list');
    if (!listContainer) return;

    Object.keys(HTS_INSTRUCTIONS).forEach(cause => {
        const item = document.createElement('div');
        item.className = 'protocol-item';
        item.setAttribute('data-study-cause', cause);
        item.onclick = function() { toggleStudyHSTs(this); };

        item.innerHTML = `
            <div class="protocol-title">
                ${cause}
            </div>
            <div class="protocol-desc">Clique para ver o **detalhe** e a **ação** imediata.</div>
        `;
        listContainer.appendChild(item);
    });
}

function showGlasgowModal() {
    document.getElementById('glasgow-ocular').value = '0';
    document.getElementById('glasgow-verbal').value = '0';
    document.getElementById('glasgow-motora').value = '0';
    updateGlasgowScore();
    document.getElementById('glasgow-modal').classList.add('show');
}

function updateGlasgowScore() {
    const ocular = parseInt(document.getElementById('glasgow-ocular').value) || 0;
    const verbal = parseInt(document.getElementById('glasgow-verbal').value) || 0;
    const motora = parseInt(document.getElementById('glasgow-motora').value) || 0;

    // DELEGA PARA O MÓDULO MÉDICO TESTADO:
    const result = window.MedicalBrain.calculateGlasgow(ocular, verbal, motora);
    
    const scoreDisplay = document.getElementById('glasgow-score-display');
    const severityDisplay = document.getElementById('glasgow-severity');
    const box = scoreDisplay.closest('.recommendation-box');
    
    scoreDisplay.textContent = result.score !== null ? result.score : 'N/A';
    severityDisplay.textContent = result.severity;
    box.style.backgroundColor = `var(--${result.color})`;

    return result.score;
}

function saveGlasgow() {
    const score = updateGlasgowScore();
    
    if (score === null) {
        alert("Por favor, selecione os três critérios da Escala de Glasgow.");
        return;
    }

    if (state.pcrActive) {
        const severity = document.getElementById('glasgow-severity').textContent;
        addEvent(`AVALIAÇÃO NEURO: Glasgow ${score} (${severity})`, score <= 8 ? 'critical' : 'normal');
        alert(`Glasgow ${score} salvo na Linha do Tempo!`);
    } else {
        alert(`Glasgow ${score} calculado. Inicie um atendimento de PCR para salvar no log.`);
    }

    closeModal('glasgow-modal');
}

async function handleLogin(e) {
    e.preventDefault();

    const form = e.target;
    const loginBtn = form.querySelector('button[type="submit"]');

    try {
        // Suporta tanto o formulário principal quanto o modal simples
        const emailInput = form.querySelector('input[type="email"]') ||
                          document.getElementById('login-email');
        const passwordInput = form.querySelector('input[type="password"]') ||
                             document.getElementById('login-password');

        if (!emailInput || !passwordInput) {
            alert('Erro: Campos de login nao encontrados.');
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Validacao de entrada
        if (!email || !password) {
            alert('Por favor, preencha email e senha.');
            return;
        }

        // Validacao de formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Por favor, insira um email valido.');
            return;
        }

        if (password.length < 6) {
            alert('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (loginBtn) {
            if (!loginBtn.getAttribute('data-original-text')) {
                loginBtn.setAttribute('data-original-text', loginBtn.textContent);
            }
            loginBtn.textContent = 'LOGANDO...';
            loginBtn.disabled = true;
        }

        if (!supabase || !supabase.auth) {
            alert('Erro de autenticação: serviço indisponível.');
            return;
        }
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        await loadUserFromSession(data.session);

        alert(`Login REAL bem-sucedido! Bem-vindo(a), ${state.currentUser.name} (${state.currentUser.plan.toUpperCase()}).`);

        updateGreetingsAndHeader();
        closeModal('profile-modal');
        // Fecha o modal simples também, se estiver aberto
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.classList.remove('show');
            setTimeout(() => loginModal.style.display = 'none', 300);
        }
        updateDashboard();

    } catch (error) {
        console.error('Erro no login:', error);
        if (error.message.includes('not found') || error.message.includes('Invalid login credentials')) {
             if (confirm("Usuario nao encontrado. Deseja cadastrar esta conta agora?")) {
                 await handleRegistration(email, password);
             }
        } else {
             alert(`Falha no Login: ${error.message}`);
        }

    } finally {
        if (loginBtn) {
            // Restaura o texto correto do botão
            const originalText = loginBtn.getAttribute('data-original-text') || 'ENTRAR';
            loginBtn.innerHTML = loginBtn.innerHTML.replace('LOGANDO...', originalText);
            loginBtn.disabled = false;
        }
    }
}

async function handleRegistration(email, password) {
    try {
        // Validacao de entrada
        if (!email || !password) {
            alert('Email e senha sao obrigatorios para o cadastro.');
            return false;
        }

        // Validacao de formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Por favor, insira um email valido.');
            return false;
        }

        if (password.length < 6) {
            alert('A senha deve ter pelo menos 6 caracteres.');
            return false;
        }

        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) throw error;

        if (data.user && !data.session) {
            alert(`Cadastro REAL realizado com sucesso!\n\N Um e-mail de confirmacao foi enviado para ${email}. Por favor, confirme seu e-mail para poder logar.`);
            return true;
        }

        await loadUserFromSession(data.session);

        alert(`Cadastro REAL realizado com sucesso! Bem-vindo(a), ${state.currentUser.name} (FREE).`);

        updateGreetingsAndHeader();
        updateDashboard();
        showProfileModal();
        alert("Por favor, complete seu perfil com seus dados.");
        return true;

    } catch (error) {
        console.error('Erro no cadastro:', error);
        alert(`Falha no Cadastro: ${error.message}`);
        return false;
    }
}

async function handleRegistrationFromForm(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    try {
        const emailInput = form.querySelector('input[type="email"]');
        const passwordInput = form.querySelector('input[type="password"]');
        const nameInput = form.querySelector('input[id*="name"]');

        if (!emailInput || !passwordInput) {
            alert('Erro: Campos de cadastro nao encontrados.');
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (submitBtn) {
            submitBtn.disabled = true;
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'CADASTRANDO...';

            const success = await handleRegistration(email, password);

            if (success) {
                // Fecha o modal de registro
                const registerModal = document.getElementById('register-modal');
                if (registerModal) {
                    registerModal.classList.remove('show');
                    setTimeout(() => registerModal.style.display = 'none', 300);
                }

                // Limpa o formulário
                form.reset();
            }

            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        } else {
            await handleRegistration(email, password);
        }

    } catch (error) {
        console.error('Erro no formulário de registro:', error);
        alert(`Erro ao processar cadastro: ${error.message}`);
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    }
}

async function handleProfileUpdate(e) {
        // Salvar preferência de lembrar login
        const rememberLoginCheckbox = document.getElementById('remember-login');
        if (rememberLoginCheckbox) {
            localStorage.setItem('siavRememberLogin', rememberLoginCheckbox.checked ? 'true' : 'false');
        }
    e.preventDefault();

    const updateBtn = document.querySelector('#profile-update-form button[type="submit"]');

    try {
        if (!state.currentUser.isLoggedIn) {
            alert('Você precisa estar logado para atualizar o perfil.');
            return;
        }

        const currentPasswordInput = document.getElementById('profile-current-password');
        const newPasswordInput = document.getElementById('profile-new-password');
        const newEmailInput = document.getElementById('profile-email');
        const nameInput = document.getElementById('profile-name');
        const professionInput = document.getElementById('profile-profession');
        const councilInput = document.getElementById('profile-council');
        const phoneInput = document.getElementById('profile-phone');
        const birthDateInput = document.getElementById('profile-birth-date');

        if (!newEmailInput || !nameInput) {
            alert('Erro interno: campos obrigatórios não encontrados no formulário.');
            return;
        }

        const currentPassword = currentPasswordInput ? currentPasswordInput.value : '';
        const newPassword = newPasswordInput ? newPasswordInput.value : '';
        const newEmail = newEmailInput.value ? newEmailInput.value.trim() : '';
        const currentEmail = state.currentUser.email;

        // Validar campos obrigatórios
        if (!newEmail) {
            alert('Por favor, preencha o campo de e-mail.');
            return;
        }
        if (!nameInput.value || !nameInput.value.trim()) {
            alert('Por favor, preencha o nome completo.');
            return;
        }

        // Validação de formato de e-mail
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            alert('Por favor, insira um e-mail válido.');
            return;
        }

        // Validação de nome
        const fullName = nameInput.value.trim();
        if (fullName.length < 3 || fullName.length > 100) {
            alert('Nome deve ter entre 3 e 100 caracteres.');
            return;
        }

        // Validação de telefone (se fornecido)
        const phone = phoneInput ? phoneInput.value.trim() : '';
        if (phone && phone.length > 20) {
            alert('Telefone muito longo! Máximo de 20 caracteres.');
            return;
        }

        // Só exige senha atual se for mudar e-mail ou senha
        if ((newPassword || newEmail !== currentEmail) && !currentPassword) {
            alert('Para alterar e-mail ou senha, preencha a senha atual.');
            return;
        }

        // Validação de nova senha
        if (newPassword && newPassword.length < 6) {
            alert('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (updateBtn) {
            updateBtn.textContent = 'ATUALIZANDO...';
            updateBtn.disabled = true;
        }

        // Se forneceu senha atual, validar antes de atualizar
        if (currentPassword) {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: currentEmail,
                password: currentPassword
            });
            if (signInError) {
                alert('Senha atual incorreta! Verifique e tente novamente.');
                if (updateBtn) {
                    updateBtn.textContent = 'ATUALIZAR PERFIL';
                    updateBtn.disabled = false;
                }
                return;
            }
        }

        const updates = {
            id: state.currentUser.id,
            full_name: fullName,
            profession: professionInput ? professionInput.value.trim() : '',
            council_register: councilInput ? councilInput.value.trim() : '',
            phone_number: phone,
            birth_date: birthDateInput ? birthDateInput.value : '',
        };

        const { error } = await supabase
            .from('profiles')
            .upsert(updates);

        if (error) throw error;

        // Atualizar email se foi alterado
        if (newEmail !== currentEmail) {
            const { error: emailError } = await supabase.auth.updateUser({ email: newEmail });
            if (emailError) {
                alert('Dados salvos, mas houve erro ao alterar email: ' + emailError.message);
            } else {
                state.currentUser.email = newEmail;
                alert('Email atualizado! Verifique seu novo email para confirmar a alteracao.');
            }
        }

        // Atualizar senha apenas se foi fornecida
        if (newPassword) {
            const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
            if (passwordError) throw passwordError;
            if (newPasswordInput) newPasswordInput.value = '';
            if (currentPasswordInput) currentPasswordInput.value = '';
        }

        state.currentUser.name = updates.full_name;
        state.currentUser.profession = updates.profession;
        state.currentUser.councilRegister = updates.council_register;
        state.currentUser.phone = updates.phone_number;
        state.currentUser.birthDate = updates.birth_date;

        if (newEmail === currentEmail && !newPassword) {
            alert('Perfil atualizado com sucesso!');
        }

        updateGreetingsAndHeader();
        closeModal('profile-modal');
        updateDashboard();

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        alert(`Erro ao atualizar perfil: ${error.message}`);
    } finally {
        if (updateBtn) {
            updateBtn.textContent = 'ATUALIZAR PERFIL';
            updateBtn.disabled = false;
        }
    }
}

async function logout() {
    if (confirm('Deseja realmente sair da sua conta?')) {
        // Só tenta deslogar se houver sessão ativa
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.warn("Erro ao fazer logout no Supabase (ignorado, logout local forçado):", error);
            }
        }
        // Limpa estado local sempre
        state.currentUser = {
            isLoggedIn: false,
            name: DEFAULT_USER_DATA.name,
            email: null,
            profession: DEFAULT_USER_DATA.profession,
            councilRegister: null,
            plan: DEFAULT_USER_DATA.plan,
            token: null,
            phone: null,
            birthDate: null
        };
        saveState(); 
        alert('Logout realizado.');
        updateGreetingsAndHeader();
        closeModal('profile-modal');
        showScreen('home');
    }
}

function showProfileModal() {
    // Força verificação do estado atual
    console.log('=== showProfileModal CHAMADO ===');
    console.log('state.currentUser completo:', JSON.stringify(state.currentUser, null, 2));
    
    const isLogged = state.currentUser.isLoggedIn;
    const profileModal = document.getElementById('profile-modal');
    const loginFields = document.getElementById('login-form-fields');
    const profileUpdateForm = document.getElementById('profile-update-form');
    const profileActions = document.getElementById('profile-actions');
    const logoutBtn = document.getElementById('logout-btn');
    const profileHeaderTitle = document.getElementById('profile-header-title');
    const profileLoggedStatus = document.getElementById('profile-logged-status');
    const sidebarPlanCard = document.getElementById('sidebar-plan-card');

    console.log('isLogged:', isLogged);
    console.log('plan:', state.currentUser.plan);
    console.log('name:', state.currentUser.name);
    console.log('email:', state.currentUser.email);

    if (!profileModal) {
        console.error('❌ profileModal não encontrado!');
        return;
    }

    // FORÇAR EXIBIÇÃO SE TIVER EMAIL (usuário está logado)
    const forceLogged = state.currentUser.email !== null && state.currentUser.email !== undefined;
    const shouldShowAsLogged = isLogged || forceLogged;
    
    console.log('forceLogged:', forceLogged);
    console.log('shouldShowAsLogged:', shouldShowAsLogged);

    if (shouldShowAsLogged) {
        console.log('✅ Mostrando como LOGADO');
        
        // Atualizar header
        if (profileHeaderTitle) {
            profileHeaderTitle.textContent = `Perfil - ${state.currentUser.name || 'Usuário'}`;
        }
        
        // Mostrar status de login
        if (profileLoggedStatus) {
            console.log('✅ Mostrando status de login');
            profileLoggedStatus.style.display = 'flex';
            const statusNameEl = document.getElementById('status-user-name');
            const statusEmailEl = document.getElementById('status-user-email');
            if (statusNameEl) {
                statusNameEl.textContent = state.currentUser.name || 'Usuário';
            }
            if (statusEmailEl) {
                statusEmailEl.textContent = state.currentUser.email || 'Email não disponível';
            }
        } else {
            console.error('❌ profileLoggedStatus NÃO encontrado!');
        }

        // Mostrar card unificado de plano
        if (sidebarPlanCard) {
            console.log('✅ Mostrando card unificado de plano');
            sidebarPlanCard.style.display = 'flex';
        }

        if (loginFields) loginFields.style.display = 'none';
        if (profileUpdateForm) profileUpdateForm.style.display = 'block';
        if (profileActions) profileActions.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        
        // Preenche campos do perfil
        const nameField = document.getElementById('profile-name');
        const professionField = document.getElementById('profile-profession');
        const councilField = document.getElementById('profile-council');
        const phoneField = document.getElementById('profile-phone');
        const birthDateField = document.getElementById('profile-birth-date');
        const emailField = document.getElementById('profile-email');

        if (nameField) nameField.value = state.currentUser.name || '';
        if (professionField) professionField.value = state.currentUser.profession || '';
        if (councilField) councilField.value = state.currentUser.councilRegister || '';
        if (phoneField) phoneField.value = state.currentUser.phone || '';
        if (birthDateField) birthDateField.value = state.currentUser.birthDate || '';
        if (emailField) emailField.value = state.currentUser.email || '';
        
    } else {
        console.log('❌ Mostrando como NÃO LOGADO');
        if (profileHeaderTitle) profileHeaderTitle.textContent = 'Login / Cadastro';
        if (profileLoggedStatus) profileLoggedStatus.style.display = 'none';
        if (sidebarPlanCard) sidebarPlanCard.style.display = 'none';
        if (loginFields) loginFields.style.display = 'block';
        if (profileUpdateForm) profileUpdateForm.style.display = 'none';
        if (profileActions) profileActions.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }

    profileModal.classList.add('show');
    console.log('=== FIM showProfileModal ===');
}

function updatePlanDisplay(plan) {
    const planIcon = document.getElementById('plan-icon');
    const planName = document.getElementById('plan-name');
    const planDescription = document.getElementById('plan-description');
    const planFeatures = document.getElementById('plan-features');
    const upgradeStudent = document.getElementById('upgrade-student');
    const upgradeProfessional = document.getElementById('upgrade-professional');
    const maxPlanMessage = document.getElementById('max-plan-message');

    if (!planIcon || !planName || !planDescription || !planFeatures) {
        console.error('Elementos de plano não encontrados');
        return;
    }

    // Reset icon classes
    planIcon.className = 'plan-icon';

    if (plan === 'free') {
        planIcon.classList.add('plan-free');
        planIcon.innerHTML = '<i class="fas fa-user"></i>';
        planName.textContent = 'Plano Gratuito';
        planDescription.textContent = 'Funcionalidades básicas';
        planFeatures.innerHTML = `
            <div class="plan-feature"><i class="fas fa-check"></i><span>Até 5 atendimentos salvos</span></div>
            <div class="plan-feature"><i class="fas fa-check"></i><span>Estatísticas básicas</span></div>
        `;
        if (upgradeStudent) upgradeStudent.style.display = 'block';
        if (upgradeProfessional) upgradeProfessional.style.display = 'block';
        if (maxPlanMessage) maxPlanMessage.style.display = 'none';

    } else if (plan === 'student') {
        planIcon.classList.add('plan-student');
        planIcon.innerHTML = '<i class="fas fa-graduation-cap"></i>';
        planName.textContent = 'Plano Estudante';
        planDescription.textContent = 'R$ 9,90/mês';
        planFeatures.innerHTML = `
            <div class="plan-feature"><i class="fas fa-check"></i><span>Até 50 atendimentos salvos</span></div>
            <div class="plan-feature"><i class="fas fa-check"></i><span>Relatórios detalhados</span></div>
            <div class="plan-feature"><i class="fas fa-check"></i><span>Backup em nuvem</span></div>
        `;
        if (upgradeStudent) upgradeStudent.style.display = 'none';
        if (upgradeProfessional) upgradeProfessional.style.display = 'block';
        if (maxPlanMessage) maxPlanMessage.style.display = 'none';

    } else if (plan === 'professional') {
        planIcon.classList.add('plan-professional');
        planIcon.innerHTML = '<i class="fas fa-crown"></i>';
        planName.textContent = 'Plano Profissional';
        planDescription.textContent = 'R$ 29,90/mês';
        planFeatures.innerHTML = `
            <div class="plan-feature"><i class="fas fa-check"></i><span>Atendimentos ilimitados</span></div>
            <div class="plan-feature"><i class="fas fa-check"></i><span>Relatórios avançados em PDF</span></div>
            <div class="plan-feature"><i class="fas fa-check"></i><span>Backup automático</span></div>
            <div class="plan-feature"><i class="fas fa-check"></i><span>Suporte prioritário</span></div>
        `;
        if (upgradeStudent) upgradeStudent.style.display = 'none';
        if (upgradeProfessional) upgradeProfessional.style.display = 'none';
        if (maxPlanMessage) maxPlanMessage.style.display = 'block';
    }
}

function upgradePlan(newPlan) {
    // Abrir modal otimizado de planos
    openPlansModal();
}

// Função para abrir modal de planos
// NOTA: Esta função foi substituída pela do plans-modal-optimized.js
// Mantemos aqui apenas como fallback, mas a principal está no arquivo dedicado
function openPlansModal() {
    const modal = document.getElementById('plans-modal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        console.log('✅ Modal de planos aberto');
    } else {
        console.error('❌ Elemento #plans-modal não encontrado no DOM');
    }
}

// Tornar a função global para acesso via onclick inline
window.openPlansModal = openPlansModal;

// Função para fechar modal de planos
function closePlansModal() {
    const modal = document.getElementById('plans-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function openPlanSettings() {
    if (typeof openPlansModal === 'function') {
        openPlansModal();
    } else if (window.openPlansModal) {
        window.openPlansModal();
    } else {
        alert('Não foi possível abrir o modal de planos.');
    }
}

function updateGreetingsAndHeader() {
    const logoSubtitle = document.querySelector('.logo-subtitle');
    const homeGreeting = document.getElementById('home-greeting');

    const prof = state.currentUser.profession || 'Profissional de Saúde';

    if (logoSubtitle) {
        logoSubtitle.textContent = state.currentUser.isLoggedIn
            ? `${state.currentUser.name} (${state.currentUser.plan.toUpperCase()})`
            : 'Sistema Inteligente de Assistência à Vida';
    }

    if (homeGreeting) {
        if (state.currentUser.isLoggedIn) {
            homeGreeting.textContent = `Olá, ${prof}!`;
        } else {
            homeGreeting.textContent = `Olá, Profissional de Saúde!`;
        }
    }

    // Atualiza o card unificado de plano na sidebar (modal de perfil)
    updateSidebarPlan();
}

// Função para atualizar o card unificado de plano na sidebar (modal de perfil)
// Atualiza o card unificado de plano na sidebar (modal de perfil)
function updateSidebarPlan() {
    const cardContainer = document.getElementById('sidebar-plan-card');
    if (!cardContainer) return;

    const plan = (state.currentUser?.plan || 'free').toLowerCase();
    let cardClass = 'plan-card-unified ';
    let icon = '', title = '', subtitle = '';

    if (plan === 'professional') {
        cardClass += 'plan-card-pro';
        icon = '🏆';
        title = 'Profissional';
        subtitle = 'Membro VIP';
    } else if (plan === 'student') {
        cardClass += 'plan-card-student';
        icon = '🎓';
        title = 'Estudante';
        subtitle = 'Acesso Acadêmico';
    } else {
        cardClass += 'plan-card-free';
        icon = '💎';
        title = 'Seja PRO';
        subtitle = 'Desbloqueie recursos avançados';
    }

    cardContainer.className = cardClass;
    cardContainer.innerHTML = `
        <div class="card-content">
            <span class="card-icon">${icon}</span>
            <div class="card-info">
                <span class="card-title">${title}</span>
                <span class="card-subtitle">${subtitle}</span>
            </div>
        </div>
    `;
    cardContainer.onclick = () => {
        if (typeof openPlansModal === 'function') {
            openPlansModal();
        } else if (window.openPlansModal) {
            window.openPlansModal();
        } else {
            alert('Não foi possível abrir o modal de planos.');
        }
    };
}

async function updateDashboard() {
    const isLogged = state.currentUser.isLoggedIn;
    const statsContent = document.getElementById('dashboard-stats-content');
    const loginBtn = document.getElementById('login-to-dashboard-btn');
    const userNameDisplay = document.getElementById('dashboard-user-name');
    const welcomeMessage = document.getElementById('dashboard-welcome-message');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const dashboardDate = document.getElementById('dashboard-current-date');
    
    if (!dashboardScreen) return; 
    updateSidebarPlan();
    manageProVisibility();
// Se existir uma função updateUI, integre a chamada ao final dela:
// function updateUI() {
//   ...
//   manageProVisibility();
// }

    // Atualiza data atual
    if (dashboardDate) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dashboardDate.textContent = now.toLocaleDateString('pt-BR', options);
    }

    if (userNameDisplay) userNameDisplay.innerHTML = `${state.currentUser.name} <span style="font-size: 0.7em; font-weight: 400; color: #868e96;">(${state.currentUser.plan.toUpperCase()})</span>`;
    
    if (isLogged) {
        if (statsContent) statsContent.style.display = 'block';
        if (loginBtn) loginBtn.style.display = 'none';
        if (welcomeMessage) welcomeMessage.textContent = `Bem-vindo de volta!`;
        
        await fetchPcrLogs(); 

        const totalPcr = state.patientLog.length;
        const totalShocks = state.patientLog.reduce((sum, log) => sum + log.shocks, 0); 
        const totalMeds = state.patientLog.reduce((sum, log) => sum + log.meds, 0);
        const avgShocks = totalPcr > 0 ? (totalShocks / totalPcr).toFixed(1) : 0;
        
        const totalPcrEl = document.getElementById('total-pcr-count');
        const avgShockEl = document.getElementById('avg-shock-count');
        const totalMedEl = document.getElementById('total-med-count');
        const quizAvgEl = document.getElementById('quiz-avg-score');

        if (totalPcrEl) totalPcrEl.textContent = totalPcr;
        if (avgShockEl) avgShockEl.textContent = totalPcr > 0 ? avgShocks : 'N/A';
        if (totalMedEl) totalMedEl.textContent = totalMeds;

        const totalQuizes = state.quizResults.length;
        let avgQuizPercent = 0;
        if (totalQuizes > 0) {
            const totalPercent = state.quizResults.reduce((sum, result) => sum + result.percent, 0);
            avgQuizPercent = Math.round(totalPercent / totalQuizes);
        }
        
        if (quizAvgEl) quizAvgEl.textContent = `${avgQuizPercent}%`;
        
    } else {
        if (statsContent) statsContent.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'block';
        if (welcomeMessage) welcomeMessage.textContent = `Faça login para salvar seu progresso`;
        
        const totalPcrEl = document.getElementById('total-pcr-count');
        const avgShockEl = document.getElementById('avg-shock-count');
        const totalMedEl = document.getElementById('total-med-count');
        const quizAvgEl = document.getElementById('quiz-avg-score');

        if (totalPcrEl) totalPcrEl.textContent = 0;
        if (avgShockEl) avgShockEl.textContent = 'N/A';
        if (totalMedEl) totalMedEl.textContent = 0;
        if (quizAvgEl) quizAvgEl.textContent = '0%';
    }
    
    const viewLogBtn = document.getElementById('view-full-log-btn');
    if (viewLogBtn) {
        if (state.currentUser.plan === 'professional') {
            viewLogBtn.innerHTML = '<i class="fas fa-file-medical"></i> Ver Histórico Completo';
            viewLogBtn.classList.remove('danger-btn');
            viewLogBtn.classList.add('secondary-btn');
        } else {
            viewLogBtn.innerHTML = '<i class="fas fa-file-medical"></i> Upgrade para Log Completo';
            viewLogBtn.classList.remove('secondary-btn');
            viewLogBtn.classList.add('danger-btn');
        }
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// ===============================================
// MÓDULO DE QUIZ
// (Lógica extraída para engine.js)
// ===============================================

// =====================================================
// GAME ENGINE: Simulador Avançado Interativo
// (Lógica extraída para simulator.js)
// =====================================================

function createMetronomeSound() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.03);

        const stopTime = audioContext.currentTime + 0.03;
        oscillator.start(audioContext.currentTime);
        oscillator.stop(stopTime);
        
        // Libera memória após uso
        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
        };
    } catch (error) {
        console.warn('Erro ao criar som do metrônomo:', error);
    }
}

function closeStudyModal() {
    closeModal('study-detail-modal');
}


// ===============================================
// INICIALIZAÇÃO - VINCULAÇÃO DE TODOS OS BOTÕES
// ===============================================

async function initApp() { 
    console.log('🩺 SIAV - Sistema Inteligente de Assistência à Vida iniciado e botões vinculados!');
    
    // Inicializa cache de elementos DOM para performance
    initDOMCache();
    
    await loadState();
    // Não checa mais sessão Supabase automaticamente
    // A verificação de sessão/autenticação deve ser feita APENAS após ação do usuário (login/continuar)
    const rememberLogin = localStorage.getItem('siavRememberLogin');
    if (rememberLogin === 'false') {
        // Só tenta deslogar se houver sessão
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            try {
                await supabase.auth.signOut();
            } catch (e) {
                console.warn('Logout automático: sessão já estava ausente.');
            }
        }
        // Limpa dados do usuário local
        if (state.currentUser) {
            state.currentUser.isLoggedIn = false;
            state.currentUser.id = null;
            state.currentUser.email = null;
            state.currentUser.token = null;
            state.currentUser.name = DEFAULT_USER_DATA.name;
            state.currentUser.profession = DEFAULT_USER_DATA.profession;
            state.currentUser.plan = DEFAULT_USER_DATA.plan;
            state.currentUser.councilRegister = null;
            state.currentUser.phone = null;
            state.currentUser.birthDate = null;
        }
    }
    
    document.addEventListener('click', function() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }, { once: true }); 
    
    showScreen('home'); 
    updateGreetingsAndHeader(); 
    updateDashboard(); 
    
    createStudyHSTsList();

    // 1. Navegação de telas (Bottom Nav e Acesso Rápido)
    document.getElementById('nav-home')?.addEventListener('click', () => showScreen('home'));
    document.getElementById('nav-pcr')?.addEventListener('click', () => {
        if (state.pcrActive) {
            showScreen('pcr');
        } else {
            showPatientModal();
        }
    });
    document.getElementById('nav-dashboard')?.addEventListener('click', () => {
        updateDashboard();
            import('./src/services/permissions.js').then(({ canAccess }) => {
                if (canAccess('dashboard')) {
                    showScreen('dashboard');
                } else {
                    if (confirm('Acesso ao dashboard restrito ao seu plano.\n\nDeseja ver os planos disponíveis?')) {
                        if (typeof openPlansModal === 'function') {
                            openPlansModal();
                        } else if (window.openPlansModal) {
                            window.openPlansModal();
                        }
                    }
                }
            });
    });

    document.getElementById('start-pcr-card')?.addEventListener('click', showPatientModal);
    document.getElementById('studies-tool')?.addEventListener('click', () => showScreen('studies'));
    document.getElementById('protocols-tool')?.addEventListener('click', () => showScreen('protocols'));
    document.getElementById('quiz-config-tool')?.addEventListener('click', () => showScreen('quiz-config'));
    // DESABILITADO: Agora usa o novo menu de configurações
    document.getElementById('glasgow-tool')?.addEventListener('click', showGlasgowModal); 

// Event Listeners de Autenticação
const loginForm = document.getElementById('login-form');
const submitBtn = document.querySelector('#login-form button[type="submit"]');

if (loginForm) {
    // Adicionar no form
    loginForm.removeEventListener('submit', handleLogin);
    loginForm.addEventListener('submit', handleLogin);
    console.log('✅ Listener no form adicionado!');
}

if (submitBtn) {
    // Adicionar também no botão
    submitBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        loginForm.dispatchEvent(submitEvent);
    };
    console.log('✅ Listener no botão adicionado!');
}
  
    // 3. Modais e Fluxo de PCR
    const patientForm = document.getElementById('patient-form');
    if(patientForm) patientForm.addEventListener('submit', savePatientData);
    document.getElementById('start-pcr-no-data-btn')?.addEventListener('click', startPCRWithUninformedData);
    document.getElementById('cancel-patient-btn')?.addEventListener('click', () => closeModal('patient-modal')); 

    // Metrônomo/Compressões
    document.getElementById('compressions-btn')?.addEventListener('click', startCompressions);
    document.getElementById('metro-btn')?.addEventListener('click', toggleMetronome);
    document.getElementById('bpm-minus')?.addEventListener('click', () => adjustBPM(-5));
    document.getElementById('bpm-plus')?.addEventListener('click', () => adjustBPM(5));

    // Ações de PCR - NOVO FLUXO RITMO
    
    // Botão Centralizador de Ritmo
    document.getElementById('rhythm-conduta-btn')?.addEventListener('click', () => {
        if (!state.pcrActive) {
             showTransientAlert('Inicie um atendimento de PCR para realizar a avaliação de ritmo.', 'warning', 3000);
             return;
        }
        showRhythmSelectorScreen(false);
    });
    
    // Novo Botão RCE
    document.getElementById('rosc-btn')?.addEventListener('click', roscObtido);

    // Vínculos da Tela de Seleção de Ritmo
    document.querySelectorAll('#rhythm-selector-screen .rhythm-option-btn').forEach(btn => {
        btn.addEventListener('click', function() { selectRhythmOption(this); });
    });
    document.getElementById('submit-rhythm-selection-btn')?.addEventListener('click', processRhythmSelection);
    
    // Vínculos da Tela de Ação de Choque
    document.getElementById('apply-shock-btn')?.addEventListener('click', applyShockAndResume);

    // Medicação, Notas, Vitals
    document.getElementById('med-btn')?.addEventListener('click', showMedModal);
    document.getElementById('medication-select')?.addEventListener('change', updateMedicationDose); 
    document.getElementById('record-med-btn')?.addEventListener('click', recordMedication);
    document.getElementById('cancel-med-btn')?.addEventListener('click', () => closeModal('med-modal'));
    
    document.getElementById('notes-btn')?.addEventListener('click', showNotesModal);
    document.getElementById('save-notes-btn')?.addEventListener('click', saveNotes);
    document.getElementById('cancel-notes-btn')?.addEventListener('click', () => closeModal('notes-modal'));
    
    document.getElementById('vitals-btn')?.addEventListener('click', showVitalsModal);
    document.getElementById('record-vitals-btn')?.addEventListener('click', recordVitals);
    document.getElementById('cancel-vitals-btn')?.addEventListener('click', () => closeModal('vitals-modal'));
    
    document.getElementById('finish-pcr-btn')?.addEventListener('click', finishPCR);
    
    // Vínculos do Modal de Glasgow
    document.getElementById('save-glasgow-btn')?.addEventListener('click', saveGlasgow);
    document.getElementById('close-glasgow-btn')?.addEventListener('click', () => closeModal('glasgow-modal'));


    // Vínculos do Módulo de Perfil/Login/Dashboard
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('login-form-simple')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form-full')?.addEventListener('submit', handleRegistrationFromForm);
    document.getElementById('profile-update-form')?.addEventListener('submit', handleProfileUpdate);
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    document.getElementById('cancel-profile-btn')?.addEventListener('click', () => closeModal('profile-modal'));
    document.getElementById('login-to-dashboard-btn')?.addEventListener('click', showProfileModal);
    document.getElementById('dashboard-user-info')?.addEventListener('click', showProfileModal);
    document.getElementById('view-full-log-btn')?.addEventListener('click', async () => {
        // Aguarda perfil carregado antes de checar permissão
        if (!state.currentUser || !state.currentUser.plan) {
            alert('Aguarde o carregamento do perfil do usuário.');
            return;
        }
        const { canAccess } = await import('./src/services/permissions.js');
        if (canAccess('log_history')) {
            showScreen('log');
        } else {
            if (confirm('Acesso ao log restrito ao Plano Profissional.\n\nDeseja ver os planos disponíveis?')) {
                if (typeof openPlansModal === 'function') {
                    openPlansModal();
                } else if (window.openPlansModal) {
                    window.openPlansModal();
                }
            }
        }
    });
    document.getElementById('upgrade-plan-btn')?.addEventListener('click', startSubscriptionFlow);
    document.getElementById('btn-manage-plan')?.addEventListener('click', openPlanSettings);

    // Engine do Quiz - Lazy Loading Dinâmico
    let quizEngineInstance = null;
    async function getQuizEngine() {
        if (!quizEngineInstance) {
            try {
                const { QuizEngine } = await import('./engine.js');
                quizEngineInstance = new QuizEngine({
                    state: state,
                    supabase: window.supabaseClient || window.SIAV?.supabase || window.supabase,
                    checkAccess: checkAccess,
                    closeModal: closeModal,
                    saveState: saveState,
                    updateDashboard: updateDashboard
                });
            } catch (error) {
                console.error("SIAV: Erro crítico ao carregar Quiz Engine:", error);
                alert("Erro ao carregar o simulado. Verifique a conexão com a internet.");
            }
        }
        return quizEngineInstance;
    }

    // Exportar para escopo global caso o index.html esteja usando onclick=""
    window.startQuiz = async () => {
        const engine = await getQuizEngine();
        if (engine) engine.startQuiz();
    };

    // Vínculos do Simulado (Inicia e Baixa a Engine On-Demand)
    document.getElementById('start-quiz-btn')?.addEventListener('click', async () => {
        const engine = await getQuizEngine();
        engine.startQuiz();
    }); 
    document.getElementById('start-quiz-btn')?.addEventListener('click', window.startQuiz); 

    document.getElementById('next-q-btn')?.addEventListener('click', async () => {
        const engine = await getQuizEngine();
        if (!engine) return;
        if (state.quiz.currentQuestionIndex < state.quiz.questions.length - 1) {
            engine.displayQuestion(state.quiz.currentQuestionIndex + 1);
        } else {
            engine.finishQuiz();
        }
    });
    document.getElementById('finish-quiz-early-btn')?.addEventListener('click', () => {
        if (confirm("Você tem certeza que deseja sair? O seu progresso será perdido.")) {
            closeModal('quiz-running-modal');
            state.quiz.active = false;
            showScreen('quiz-config');
        }
    });
    document.getElementById('close-result-btn')?.addEventListener('click', () => {
        closeModal('quiz-result-modal');
        showScreen('quiz-config');
    });

    // Event Listeners para os Cards de Modo de Quiz
    document.getElementById('quiz-mode-questions')?.addEventListener('click', () => {
        // Esconder os cards de seleção e mostrar o formulário de configuração
        document.getElementById('quiz-mode-selection').style.display = 'none';
        document.querySelector('.quiz-config-form').style.display = 'block';
    });

    document.getElementById('quiz-mode-simulator')?.addEventListener('click', async () => {
        console.log('🎮 [SIAV] Card do Simulador Avançado clicado');

        // Verificar se está online
        if (!navigator.onLine) {
            console.warn('⚠️ [SIAV] Usuário está OFFLINE');
            alert('⚠️ Conexão com a internet necessária para o Simulador Avançado\n\nEste modo requer acesso online ao banco de casos clínicos.');
            return;
        }

        console.log('✅ [SIAV] Usuário está ONLINE');

        // Verificar permissão (se necessário)
        if (!checkAccess('quiz_simulations')) {
            console.warn('⚠️ [SIAV] Acesso negado para quiz_simulations');
            return;
        }

        console.log('✅ [SIAV] Permissão concedida');

        // Mostrar loading
        const simulatorCard = document.getElementById('quiz-mode-simulator');
        const originalHTML = simulatorCard.innerHTML;
        simulatorCard.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Carregando caso clínico...</div>';
        simulatorCard.style.pointerEvents = 'none';

        console.log('⏳ [SIAV] Loading exibido no card');

        try {
            console.log('🔄 [SIAV] Chamando window.SIAV.fetchRandomClinicalCase()...');

            // Buscar caso clínico do Supabase
            const clinicalCase = await window.SIAV.fetchRandomClinicalCase();

            console.log('✅ [SIAV] Caso clínico retornado com sucesso:', clinicalCase);
            console.log('📋 [SIAV] Título:', clinicalCase.title);
            console.log('🎮 [SIAV] Game Flow Steps:', clinicalCase.game_flow?.length || 0);

            // IMPORTANTE: Restaurar o card ANTES de abrir o modal
            simulatorCard.innerHTML = originalHTML;
            simulatorCard.style.pointerEvents = 'auto';

            console.log('✅ [SIAV] Card restaurado');

            // Iniciar o simulador avançado com o caso
            console.log('🚀 [SIAV] Iniciando start()...');
            const { AdvancedSimulator } = await import('./simulator.js');
            if (!window.simulatorInstance) {
                new AdvancedSimulator({
                    state: state,
                    checkAndIncrementSimulationUse: checkAndIncrementSimulationUse,
                    showToastNotification: showToastNotification,
                    openPlansModal: window.openPlansModal || openPlansModal
                });
            }
            await window.simulatorInstance.start(clinicalCase);

            console.log('✅ [SIAV] Simulador iniciado com sucesso!');

        } catch (error) {
            console.error('💥 [SIAV] ERRO ao carregar caso clínico:', error);
            console.error('📍 [SIAV] Stack:', error.stack);

            // Mensagem de erro amigável
            let errorMessage = '❌ Erro ao carregar o caso clínico\n\n';
            errorMessage += error.message || 'Erro desconhecido';
            errorMessage += '\n\n';

            // Adicionar dicas baseadas no erro
            if (error.message.includes('RLS') || error.message.includes('policy')) {
                errorMessage += '💡 DICA: Execute o SQL de configuração RLS comentado em database.js';
            } else if (error.message.includes('Nenhum caso')) {
                errorMessage += '💡 DICA: Verifique se há dados na tabela clinical_cases no Supabase';
            } else {
                errorMessage += '💡 DICA: Verifique sua conexão com a internet e as credenciais do Supabase';
            }

            alert(errorMessage);

            // Restaurar o card
            simulatorCard.innerHTML = originalHTML;
            simulatorCard.style.pointerEvents = 'auto';

            console.log('🔄 [SIAV] Card restaurado após erro');
        }
    });

    // Botão Voltar aos Modos
    document.getElementById('back-to-mode-selection')?.addEventListener('click', () => {
        document.getElementById('quiz-mode-selection').style.display = 'flex';
        document.querySelector('.quiz-config-form').style.display = 'none';
    });

    document.getElementById('close-protocol-btn')?.addEventListener('click', () => closeModal('protocol-detail-modal'));
    document.getElementById('close-log-detail-btn')?.addEventListener('click', () => closeModal('log-detail-modal')); 

    // 4. Detalhes de Telas e Protocolos
    document.getElementById('protocol-adulto')?.addEventListener('click', () => showProtocolDetail('pcr-adulto'));
    document.getElementById('protocol-pediatrica')?.addEventListener('click', () => showProtocolDetail('pcr-pediatrica'));
    document.getElementById('protocol-avc')?.addEventListener('click', () => showProtocolDetail('avc'));
    document.getElementById('protocol-iam')?.addEventListener('click', () => showProtocolDetail('iam'));
    
    // Vínculos da Tela de Estudos
    document.getElementById('study-ecg-ritmos')?.addEventListener('click', () => showStudyDetail('ecg-ritmos-pcr'));
    document.getElementById('study-ecg-interpretacao')?.addEventListener('click', () => showStudyDetail('ecg-interpretacao'));
    document.getElementById('study-farmaco')?.addEventListener('click', () => showStudyDetail('farmacologia'));
    
    document.getElementById('hs-ts-study-container')?.addEventListener('click', function() {
        if (!checkAccess('study_review')) return;

        const listContainer = document.getElementById('hs-ts-study-list');
        if (listContainer) {
            const isVisible = listContainer.style.display !== 'none';
            listContainer.style.display = isVisible ? 'none' : 'flex';
        }
    });

    // 5. Hs & Ts (Atendimento PCR) - Mapeia para a tela de causas
    document.getElementById('hs-ts-btn')?.addEventListener('click', () => showScreen('causes'));

    document.querySelectorAll('#causes-screen .cause-item').forEach(item => {
        item.addEventListener('click', function() {
            toggleCause(this);
        });
    });
    
    document.getElementById('close-treatment-btn')?.addEventListener('click', closeTreatmentFullscreen);

    // =============================================
    // ANIMAÇÃO ECG DA LOGO (clique para ativar/desativar)
    // =============================================
    const logoIcon = document.querySelector('.logo-icon');
    if (logoIcon) {
        logoIcon.addEventListener('click', function() {
            this.classList.toggle('ecg-animating');
        });
    }
}


// =============================================
// PWA - SERVICE WORKER REGISTRATION
// =============================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('Service Worker registrado com sucesso:', registration.scope);
            })
            .catch((error) => {
                console.log('Falha ao registrar Service Worker:', error);
            });
    });
}

// Inicia o aplicativo diretamente
// ===============================
// MODAL DE PLANOS: LÓGICA DE TOGGLE E SELEÇÃO
// ===============================

// Preços dos planos
const PLAN_PRICES = {
    student: {
        monthly: { price: '9,90', old: '29,90', period: '/mês' },
        annual: { price: '8,25', old: '29,90', period: '/mês (anual)' } // 25% de desconto
    },
    pro: {
        monthly: { price: '19,90', old: '49,90', period: '/mês' },
        annual: { price: '14,90', old: '49,90', period: '/mês (anual)' } // 25% de desconto
    }
};

let currentBillingPeriod = 'monthly';

function toggleBillingPeriod() {
    const toggle = document.getElementById('billing-period');
    currentBillingPeriod = toggle && toggle.checked ? 'annual' : 'monthly';
    updatePlanPrices();
}

function updatePlanPrices() {
    // Student
    const studentCard = document.querySelector('.plan-card.plan-student');
    if (studentCard) {
        const priceValue = studentCard.querySelector('.price-value');
        const oldPrice = studentCard.querySelector('.old-price');
        const period = studentCard.querySelector('.period');
        if (priceValue && oldPrice && period) {
            priceValue.textContent = PLAN_PRICES.student[currentBillingPeriod].price;
            oldPrice.textContent = 'R$ ' + PLAN_PRICES.student[currentBillingPeriod].old;
            period.textContent = PLAN_PRICES.student[currentBillingPeriod].period;
        }
    }
    const proCard = document.querySelector('.plan-card.plan-pro');
    if (proCard) {
        const priceValue = proCard.querySelector('.price-value');
        const oldPrice = proCard.querySelector('.old-price');
        const period = proCard.querySelector('.period');
        if (priceValue && oldPrice && period) {
            priceValue.textContent = PLAN_PRICES.pro[currentBillingPeriod].price;
            oldPrice.textContent = 'R$ ' + PLAN_PRICES.pro[currentBillingPeriod].old;
            period.textContent = PLAN_PRICES.pro[currentBillingPeriod].period;
        }
    }
}

function selectPlan(plan, billing) {
    // Aqui você pode implementar o fluxo de compra real
    alert(`Plano selecionado: ${plan === 'student' ? 'Estudante' : 'Profissional'} | ${billing === 'annual' ? 'Anual' : 'Mensal'}\n(Checkout simulado)`);
}

// Vincular eventos ao abrir o modal de planos
function setupPlansModalEvents() {
    const toggle = document.getElementById('billing-period');
    if (toggle) {
        toggle.removeEventListener('change', toggleBillingPeriod);
        toggle.addEventListener('change', toggleBillingPeriod);
    }
    // Atualizar botões de CTA para passar o billing correto
    const studentBtn = document.querySelector('.plan-card.plan-student .plan-cta');
    if (studentBtn) {
        studentBtn.onclick = function() { selectPlan('student', currentBillingPeriod); };
    }
    const proBtn = document.querySelector('.plan-card.plan-pro .plan-cta');
    if (proBtn) {
        proBtn.onclick = function() { selectPlan('pro', currentBillingPeriod); };
    }
}

// Hook para garantir atualização IMEDIATA dos preços e eventos ao abrir o modal
const originalOpenPlansModal = window.openPlansModal;
window.openPlansModal = function() {
    if (typeof originalOpenPlansModal === 'function') originalOpenPlansModal();
    setTimeout(() => {
        // Sempre buscar o toggle e forçar update
        const toggle = document.getElementById('billing-period');
        if (toggle) {
            currentBillingPeriod = toggle.checked ? 'annual' : 'monthly';
        }
        updatePlanPrices();
        setupPlansModalEvents();
    }, 0);
};

// Garante atualização ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const toggle = document.getElementById('billing-period');
        if (toggle) {
            currentBillingPeriod = toggle.checked ? 'annual' : 'monthly';
        }
        updatePlanPrices();
        setupPlansModalEvents();
    }, 0);
});

initApp(); 