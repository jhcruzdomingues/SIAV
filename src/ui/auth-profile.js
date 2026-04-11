import { state } from '../config/state.js';
import { supabase } from '../config/supabase.js';
import { closeModal, showScreen } from './dom.js';
import { fetchPcrLogs } from '../pcr/log.js';

const DEFAULT_USER_DATA = {
    name: 'Convidado',
    profession: 'Profissional de Saúde',
    plan: 'free'
};

export function manageProVisibility() {
    const userPlan = (state.currentUser?.plan || 'free').toLowerCase();
    const isPro = (userPlan === 'professional' || userPlan === 'pro');

    const salesElements = [
        'upgrade-plan-btn',       
        'login-to-dashboard-btn', 
        'upgrade-modal-trigger',  
        'premium-banner'          
    ];

    salesElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = isPro ? 'none' : '';
    });

    const historyBtn = document.getElementById('view-full-log-btn');
    if (historyBtn) {
        if (isPro) {
            historyBtn.style.width = '100%';
            historyBtn.classList.remove('secondary');
            historyBtn.classList.add('primary-btn'); 
        } else {
            historyBtn.style.width = ''; 
        }
    }
}

export async function fetchUserProfile(userId, userEmail) {
    try {
        const { data, error, status } = await supabase.from('profiles').select('plan, full_name, profession, council_register, phone_number, birth_date').eq('id', userId).single();
        if (error && status !== 406) throw error;

        if (data) {
            state.currentUser.name = data.full_name || userEmail.split('@')[0]; 
            state.currentUser.profession = data.profession || DEFAULT_USER_DATA.profession;
            state.currentUser.plan = data.plan || 'free'; 
            state.currentUser.councilRegister = data.council_register || null;
            state.currentUser.phone = data.phone_number || null;
            state.currentUser.birthDate = data.birth_date || null;
            manageProVisibility();
        } else {
            state.currentUser.name = userEmail ? userEmail.split('@')[0] : DEFAULT_USER_DATA.name;
            state.currentUser.profession = DEFAULT_USER_DATA.profession;
            state.currentUser.plan = 'free'; 
        }
    } catch (error) {
        console.error("Erro ao buscar perfil do usuário:", error.message);
        state.currentUser.name = userEmail ? userEmail.split('@')[0] : DEFAULT_USER_DATA.name;
        state.currentUser.profession = DEFAULT_USER_DATA.profession;
        state.currentUser.plan = 'free';
    }
    saveState();
}

export async function loadUserFromSession(session) {
    if (session && session.user) {
        const user = session.user;
        state.currentUser.isLoggedIn = true;
        state.currentUser.id = user.id;
        state.currentUser.email = user.email;
        state.currentUser.token = session.access_token;
        await fetchUserProfile(user.id, user.email);
    } else {
        resetUserState();
    }
}

export async function checkAuthStatus() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) { resetUserState(); return; }
        if (session && session.user) {
            const user = session.user;
            state.currentUser.isLoggedIn = true;
            state.currentUser.id = user.id;
            state.currentUser.email = user.email;
            state.currentUser.token = session.access_token;
            await fetchUserProfile(user.id, user.email);
            updateGreetingsAndHeader();
            updateDashboard();
        } else {
            resetUserState();
        }
    } catch (error) {
        resetUserState();
    }
}

export function resetUserState() {
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

export function initUIAuthListener() {
    const supabaseInstance = window.SIAV?.supabase || window.supabaseClient || window.supabase;
    if (supabaseInstance && supabaseInstance.auth) {
        supabaseInstance.auth.onAuthStateChange(async (event, session) => {
            switch (event) {
                case 'SIGNED_IN':
                    if (session && session.user) {
                        state.currentUser.isLoggedIn = true;
                        state.currentUser.id = session.user.id;
                        state.currentUser.email = session.user.email;
                        state.currentUser.token = session.access_token;
                        await fetchUserProfile(session.user.id, session.user.email);
                        updateGreetingsAndHeader();
                        updateDashboard();
                    }
                    break;
                case 'SIGNED_OUT':
                    resetUserState();
                    updateGreetingsAndHeader();
                    updateDashboard();
                    break;
                case 'TOKEN_REFRESHED':
                    if (session) state.currentUser.token = session.access_token;
                    break;
                case 'USER_UPDATED':
                    if (session && session.user) await fetchUserProfile(session.user.id, session.user.email);
                    break;
            }
        });
    }
}

export function saveState() {
    try {
        localStorage.setItem('siavState', JSON.stringify({ quizResults: state.quizResults }));
    } catch (e) { }
}

export async function loadState() {
    try {
        const savedState = localStorage.getItem('siavState');
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            state.quizResults = parsedState.quizResults || [];
        }
    } catch (e) { }
}

export async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const loginBtn = form.querySelector('button[type="submit"]');
    try {
        const emailInput = form.querySelector('input[type="email"]') || document.getElementById('login-email');
        const passwordInput = form.querySelector('input[type="password"]') || document.getElementById('login-password');
        if (!emailInput || !passwordInput) return;
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!email || !password) { alert('Por favor, preencha email e senha.'); return; }
        if (loginBtn) {
            if (!loginBtn.getAttribute('data-original-text')) loginBtn.setAttribute('data-original-text', loginBtn.textContent);
            loginBtn.textContent = 'LOGANDO...';
            loginBtn.disabled = true;
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await loadUserFromSession(data.session);
        alert(`Login REAL bem-sucedido! Bem-vindo(a), ${state.currentUser.name}.`);
        updateGreetingsAndHeader();
        closeModal('profile-modal');
        const loginModal = document.getElementById('login-modal');
        if (loginModal) { loginModal.classList.remove('show'); setTimeout(() => loginModal.style.display = 'none', 300); }
        updateDashboard();
    } catch (error) {
        if (error.message.includes('not found') || error.message.includes('Invalid login credentials')) {
             if (confirm("Usuario nao encontrado. Deseja cadastrar esta conta agora?")) await handleRegistration(emailInput.value.trim(), passwordInput.value);
        } else {
             alert(`Falha no Login: ${error.message}`);
        }
    } finally {
        if (loginBtn) {
            const originalText = loginBtn.getAttribute('data-original-text') || 'ENTRAR';
            loginBtn.innerHTML = loginBtn.innerHTML.replace('LOGANDO...', originalText);
            loginBtn.disabled = false;
        }
    }
}

export async function handleRegistration(email, password) {
    try {
        if (!email || !password) return false;
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user && !data.session) { alert(`Cadastro REAL realizado com sucesso!\n\nUm e-mail de confirmacao foi enviado.`); return true; }
        await loadUserFromSession(data.session);
        updateGreetingsAndHeader();
        updateDashboard();
        showProfileModal();
        alert("Por favor, complete seu perfil com seus dados.");
        return true;
    } catch (error) {
        alert(`Falha no Cadastro: ${error.message}`);
        return false;
    }
}

export async function handleRegistrationFromForm(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    try {
        const email = form.querySelector('input[type="email"]').value.trim();
        const password = form.querySelector('input[type="password"]').value;
        if (submitBtn) {
            submitBtn.disabled = true;
            const original = submitBtn.textContent;
            submitBtn.textContent = 'CADASTRANDO...';
            const success = await handleRegistration(email, password);
            if (success) {
                const registerModal = document.getElementById('register-modal');
                if (registerModal) { registerModal.classList.remove('show'); setTimeout(() => registerModal.style.display = 'none', 300); }
                form.reset();
            }
            submitBtn.textContent = original;
            submitBtn.disabled = false;
        }
    } catch (error) {}
}

export async function handleProfileUpdate(e) {
    e.preventDefault();
    const rememberLoginCheckbox = document.getElementById('remember-login');
    if (rememberLoginCheckbox) localStorage.setItem('siavRememberLogin', rememberLoginCheckbox.checked ? 'true' : 'false');
    
    const updateBtn = document.querySelector('#profile-update-form button[type="submit"]');
    try {
        if (!state.currentUser.isLoggedIn) return;
        const currentPasswordInput = document.getElementById('profile-current-password');
        const newPasswordInput = document.getElementById('profile-new-password');
        const newEmailInput = document.getElementById('profile-email');
        const nameInput = document.getElementById('profile-name');
        
        const currentPassword = currentPasswordInput ? currentPasswordInput.value : '';
        const newPassword = newPasswordInput ? newPasswordInput.value : '';
        const newEmail = newEmailInput.value ? newEmailInput.value.trim() : '';
        const currentEmail = state.currentUser.email;
        const fullName = nameInput.value.trim();
        
        if (!fullName) return;
        if ((newPassword || newEmail !== currentEmail) && !currentPassword) { alert('Para alterar e-mail ou senha, preencha a senha atual.'); return; }
        if (updateBtn) { updateBtn.textContent = 'ATUALIZANDO...'; updateBtn.disabled = true; }
        
        if (currentPassword) {
            const { error: signInError } = await supabase.auth.signInWithPassword({ email: currentEmail, password: currentPassword });
            if (signInError) { alert('Senha atual incorreta!'); if (updateBtn) { updateBtn.textContent = 'ATUALIZAR PERFIL'; updateBtn.disabled = false; } return; }
        }
        
        const updates = {
            id: state.currentUser.id,
            full_name: fullName,
            profession: document.getElementById('profile-profession') ? document.getElementById('profile-profession').value.trim() : '',
            council_register: document.getElementById('profile-council') ? document.getElementById('profile-council').value.trim() : '',
            phone_number: document.getElementById('profile-phone') ? document.getElementById('profile-phone').value.trim() : '',
            birth_date: document.getElementById('profile-birth-date') ? document.getElementById('profile-birth-date').value : '',
        };
        
        const { error } = await supabase.from('profiles').upsert(updates);
        if (error) throw error;
        
        if (newEmail !== currentEmail) await supabase.auth.updateUser({ email: newEmail });
        if (newPassword) await supabase.auth.updateUser({ password: newPassword });
        
        state.currentUser.name = updates.full_name;
        state.currentUser.profession = updates.profession;
        state.currentUser.councilRegister = updates.council_register;
        state.currentUser.phone = updates.phone_number;
        state.currentUser.birthDate = updates.birth_date;
        
        if (newEmail === currentEmail && !newPassword) alert('Perfil atualizado com sucesso!');
        updateGreetingsAndHeader();
        closeModal('profile-modal');
        updateDashboard();
    } catch (error) {
        alert(`Erro ao atualizar perfil: ${error.message}`);
    } finally {
        if (updateBtn) { updateBtn.textContent = 'ATUALIZAR PERFIL'; updateBtn.disabled = false; }
    }
}

export async function logout() {
    if (confirm('Deseja realmente sair da sua conta?')) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await supabase.auth.signOut();
        resetUserState();
        saveState(); 
        alert('Logout realizado.');
        updateGreetingsAndHeader();
        closeModal('profile-modal');
        showScreen('home');
    }
}

export function showProfileModal() {
    const isLogged = state.currentUser.isLoggedIn || (state.currentUser.email !== null && state.currentUser.email !== undefined);
    const profileModal = document.getElementById('profile-modal');
    
    if (!profileModal) return;
    
    if (isLogged) {
        if (document.getElementById('profile-header-title')) document.getElementById('profile-header-title').textContent = `Perfil - ${state.currentUser.name || 'Usuário'}`;
        if (document.getElementById('profile-logged-status')) {
            document.getElementById('profile-logged-status').style.display = 'flex';
            if (document.getElementById('status-user-name')) document.getElementById('status-user-name').textContent = state.currentUser.name || 'Usuário';
            if (document.getElementById('status-user-email')) document.getElementById('status-user-email').textContent = state.currentUser.email || 'Email não disponível';
        }
        if (document.getElementById('sidebar-plan-card')) document.getElementById('sidebar-plan-card').style.display = 'flex';
        if (document.getElementById('login-form-fields')) document.getElementById('login-form-fields').style.display = 'none';
        if (document.getElementById('profile-update-form')) document.getElementById('profile-update-form').style.display = 'block';
        if (document.getElementById('profile-actions')) document.getElementById('profile-actions').style.display = 'none';
        if (document.getElementById('logout-btn')) document.getElementById('logout-btn').style.display = 'block';
        
        if (document.getElementById('profile-name')) document.getElementById('profile-name').value = state.currentUser.name || '';
        if (document.getElementById('profile-profession')) document.getElementById('profile-profession').value = state.currentUser.profession || '';
        if (document.getElementById('profile-council')) document.getElementById('profile-council').value = state.currentUser.councilRegister || '';
        if (document.getElementById('profile-phone')) document.getElementById('profile-phone').value = state.currentUser.phone || '';
        if (document.getElementById('profile-birth-date')) document.getElementById('profile-birth-date').value = state.currentUser.birthDate || '';
        if (document.getElementById('profile-email')) document.getElementById('profile-email').value = state.currentUser.email || '';
    } else {
        if (document.getElementById('profile-header-title')) document.getElementById('profile-header-title').textContent = 'Login / Cadastro';
        if (document.getElementById('profile-logged-status')) document.getElementById('profile-logged-status').style.display = 'none';
        if (document.getElementById('sidebar-plan-card')) document.getElementById('sidebar-plan-card').style.display = 'none';
        if (document.getElementById('login-form-fields')) document.getElementById('login-form-fields').style.display = 'block';
        if (document.getElementById('profile-update-form')) document.getElementById('profile-update-form').style.display = 'none';
        if (document.getElementById('profile-actions')) document.getElementById('profile-actions').style.display = 'block';
        if (document.getElementById('logout-btn')) document.getElementById('logout-btn').style.display = 'none';
    }
    profileModal.classList.add('show');
}

export function updateGreetingsAndHeader() {
    const logoSubtitle = document.querySelector('.logo-subtitle');
    const homeGreeting = document.getElementById('home-greeting');
    const prof = state.currentUser.profession || 'Profissional de Saúde';
    
    if (logoSubtitle) logoSubtitle.textContent = state.currentUser.isLoggedIn ? `${state.currentUser.name} (${state.currentUser.plan.toUpperCase()})` : 'Sistema Inteligente de Assistência à Vida';
    if (homeGreeting) homeGreeting.textContent = state.currentUser.isLoggedIn ? `Olá, ${prof}!` : `Olá, Profissional de Saúde!`;
    updateSidebarPlan();
}

export function updateSidebarPlan() {
    const cardContainer = document.getElementById('sidebar-plan-card');
    if (!cardContainer) return;
    const plan = (state.currentUser?.plan || 'free').toLowerCase();
    let cardClass = 'plan-card-unified ', icon = '💎', title = 'Seja PRO', subtitle = 'Desbloqueie recursos avançados';
    if (plan === 'professional') { cardClass += 'plan-card-pro'; icon = '🏆'; title = 'Profissional'; subtitle = 'Membro VIP'; }
    else if (plan === 'student') { cardClass += 'plan-card-student'; icon = '🎓'; title = 'Estudante'; subtitle = 'Acesso Acadêmico'; }
    else { cardClass += 'plan-card-free'; }
    cardContainer.className = cardClass;
    cardContainer.innerHTML = `<div class="card-content"><span class="card-icon">${icon}</span><div class="card-info"><span class="card-title">${title}</span><span class="card-subtitle">${subtitle}</span></div></div>`;
    cardContainer.onclick = () => { if (typeof window.openPlansModal === 'function') window.openPlansModal(); };
}

export async function updateDashboard() {
    const isLogged = state.currentUser.isLoggedIn;
    updateSidebarPlan();
    manageProVisibility();
    
    if (document.getElementById('dashboard-current-date')) document.getElementById('dashboard-current-date').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (document.getElementById('dashboard-user-name')) document.getElementById('dashboard-user-name').innerHTML = `${state.currentUser.name} <span style="font-size: 0.7em; font-weight: 400; color: #868e96;">(${state.currentUser.plan.toUpperCase()})</span>`;
    
    if (isLogged) {
        if (document.getElementById('dashboard-stats-content')) document.getElementById('dashboard-stats-content').style.display = 'block';
        if (document.getElementById('login-to-dashboard-btn')) document.getElementById('login-to-dashboard-btn').style.display = 'none';
        if (document.getElementById('dashboard-welcome-message')) document.getElementById('dashboard-welcome-message').textContent = `Bem-vindo de volta!`;
        
        await fetchPcrLogs(); 
        const totalPcr = state.patientLog.length;
        const avgShocks = totalPcr > 0 ? (state.patientLog.reduce((sum, log) => sum + log.shocks, 0) / totalPcr).toFixed(1) : 0;
        
        if (document.getElementById('total-pcr-count')) document.getElementById('total-pcr-count').textContent = totalPcr;
        if (document.getElementById('avg-shock-count')) document.getElementById('avg-shock-count').textContent = totalPcr > 0 ? avgShocks : 'N/A';
        if (document.getElementById('total-med-count')) document.getElementById('total-med-count').textContent = state.patientLog.reduce((sum, log) => sum + log.meds, 0);
        if (document.getElementById('quiz-avg-score')) document.getElementById('quiz-avg-score').textContent = state.quizResults.length > 0 ? `${Math.round(state.quizResults.reduce((sum, r) => sum + r.percent, 0) / state.quizResults.length)}%` : '0%';
    } else {
        if (document.getElementById('dashboard-stats-content')) document.getElementById('dashboard-stats-content').style.display = 'none';
        if (document.getElementById('login-to-dashboard-btn')) document.getElementById('login-to-dashboard-btn').style.display = 'block';
    }
    
    const viewLogBtn = document.getElementById('view-full-log-btn');
    if (viewLogBtn) {
        viewLogBtn.innerHTML = state.currentUser.plan === 'professional' ? '<i class="fas fa-file-medical"></i> Ver Histórico Completo' : '<i class="fas fa-file-medical"></i> Upgrade para Log Completo';
        viewLogBtn.className = state.currentUser.plan === 'professional' ? 'secondary-btn' : 'danger-btn';
    }
}