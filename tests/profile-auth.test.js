import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
    signInWithPassword: vi.fn(), signUp: vi.fn(), updateUser: vi.fn(), upsert: vi.fn(),
}));
vi.mock('../src/config/supabase.js', () => ({ supabase: {
    auth: api,
    from: () => ({ upsert: api.upsert, select: () => ({ eq: () => ({ single: async () => ({
        data: { full_name: 'Pessoa Sintética', plan: 'free' }, error: null,
    }) }) }) }),
} }));
vi.mock('../src/pcr/log.js', async importOriginal => ({
    ...await importOriginal(), fetchPcrLogs: vi.fn().mockResolvedValue([]),
}));
import { state } from '../src/config/state.js';
import { registerAllEvents } from '../src/ui/events.js';
import { handleLogin, handleRegistrationFromForm, showProfileModal } from '../src/ui/auth-profile.js';
import { handleLogin as serviceLogin } from '../src/services/auth.js';

const html = readFileSync('index.html', 'utf8');
const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const el = id => document.getElementById(id);
const email = 'pessoa-sintetica@example.invalid';
const password = 'SENHA_SINTETICA_APENAS_TESTE';
const invitation = 'VOCÊ AINDA NÃO TEM UMA CONTA, CRIE UMA CONTA AGORA, NÃO CUSTA NADA!';
const settle = () => vi.advanceTimersByTime(350);
const eventFor = id => ({ preventDefault: vi.fn(), target: el(id), currentTarget: el(id) });

beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    document.body.innerHTML = body;
    state.currentUser = { isLoggedIn: false, email: null, name: 'Convidado', plan: 'free' };
    state.user = null; state.patientLog = []; state.quizResults = [];
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.signInWithPassword.mockResolvedValue({ data: { session: null }, error: { code: 'invalid_credentials', message: 'Invalid login credentials' } });
    api.signUp.mockResolvedValue({ data: { user: { id: 'synthetic-user' }, session: null }, error: null });
    api.upsert.mockResolvedValue({ error: null });
    registerAllEvents();
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Perfil: login e cadastro explícitos', () => {
    it('oferece login e criar conta como ações separadas, sem formulários aninhados', () => {
        expect(el('profile-login-btn').textContent).toContain('FAZER LOGIN');
        expect(el('profile-register-btn').type).toBe('button');
        expect(el('profile-register-btn').textContent).toContain('CRIAR LOGIN');
        expect(el('profile-update-form').tagName).toBe('FORM');
        expect(el('profile-update-form').closest('#login-form')).toBeNull();
        expect(el('profile-update-form').querySelector('button[type="submit"]').form).toBe(el('profile-update-form'));
    });
    it.each(['profile-register-btn', 'login-open-register-btn', 'open-register-btn'])('%s abre cadastro com a mensagem pedida e sem chamada remota', id => {
        showProfileModal(); settle();
        el(id).click(); settle();
        expect([...document.querySelectorAll('.modal.show')].map(x => x.id)).toEqual(['register-modal']);
        expect(el('register-intro').textContent.trim()).toBe(invitation);
        expect(el('auth-notice').textContent).toBe(invitation);
        expect(el('auth-notice').hidden).toBe(false);
        expect(api.signUp).not.toHaveBeenCalled();
        expect(api.signInWithPassword).not.toHaveBeenCalled();
        expect(state.currentUser.isLoggedIn).toBe(false);
    });
    it('permite voltar do cadastro ao login sem sobreposição ou criação de conta', () => {
        el('open-register-btn').click(); settle();
        el('register-back-login-btn').click(); settle();
        expect([...document.querySelectorAll('.modal.show')].map(x => x.id)).toEqual(['login-modal']);
        expect(api.signUp).not.toHaveBeenCalled();
    });
    it.each(['login-form', 'login-form-simple'])('login inválido em %s não registra nem afirma que a conta não existe', async formId => {
        const form = el(formId);
        form.querySelector('input[type=email]').value = email;
        form.querySelector('input[type=password]').value = password;
        await handleLogin(eventFor(formId));
        expect(api.signInWithPassword).toHaveBeenCalledTimes(1);
        expect(api.signUp).not.toHaveBeenCalled();
        expect(window.confirm).not.toHaveBeenCalled();
        expect(state.currentUser.isLoggedIn).toBe(false);
        expect(form.querySelector('[data-auth-feedback]').textContent).toContain('Confira seu e-mail e sua senha');
        expect(form.querySelector('button[type=submit]').disabled).toBe(false);
    });
    it('o serviço legado de login também não cria uma conta após credenciais inválidas', async () => {
        api.signInWithPassword.mockResolvedValueOnce({ data: { user: null, session: null }, error: { message: 'Invalid login credentials' } });
        expect((await serviceLogin(email, password)).success).toBe(false);
        expect(api.signUp).not.toHaveBeenCalled();
        expect(state.user).toBeNull();
    });
    it('ignora submits repetidos durante login e não aceita resposta sem sessão', async () => {
        let resolve;
        api.signInWithPassword.mockReturnValueOnce(new Promise(r => { resolve = r; }));
        el('login-email').value = email; el('login-password').value = password;
        const first = handleLogin(eventFor('login-form'));
        await handleLogin(eventFor('login-form'));
        expect(api.signInWithPassword).toHaveBeenCalledTimes(1);
        resolve({ data: { session: null }, error: null }); await first;
        expect(state.currentUser.isLoggedIn).toBe(false);
        expect(el('login-feedback').textContent).toContain('sessão');
        expect(el('profile-login-btn').disabled).toBe(false);
    });
    it('cadastrar exige envio explícito e não autentica sem confirmação/sessão do servidor', async () => {
        el('open-register-btn').click(); settle();
        el('register-name').value = 'Pessoa Sintética';
        el('register-email').value = email; el('register-password').value = password;
        await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(api.signUp).toHaveBeenCalledTimes(1);
        expect(api.signInWithPassword).not.toHaveBeenCalled();
        expect(state.currentUser.isLoggedIn).toBe(false);
        expect(el('register-feedback').textContent).toContain('e-mail');
        expect(el('register-modal').classList.contains('show')).toBe(true);
        expect(el('register-password').value).toBe('');
        expect(api.signUp.mock.calls[0][0].options.data).toEqual({ full_name: 'Pessoa Sintética' });
    });
    it('erro de cadastro preserva campos, libera botão e permite nova tentativa', async () => {
        api.signUp.mockRejectedValueOnce(new Error('Synthetic offline'));
        el('register-name').value = 'Pessoa Sintética';
        el('register-email').value = email; el('register-password').value = password;
        await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(el('register-email').value).toBe(email);
        expect(el('register-form-full').querySelector('button[type=submit]').disabled).toBe(false);
        expect(el('register-feedback').textContent).toContain('Não foi possível');
    });
    it('não duplica a solicitação de cadastro enquanto a primeira está pendente', async () => {
        let resolve;
        api.signUp.mockReturnValueOnce(new Promise(r => { resolve = r; }));
        el('register-name').value = 'Pessoa Sintética';
        el('register-email').value = email; el('register-password').value = password;
        const first = handleRegistrationFromForm(eventFor('register-form-full'));
        await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(api.signUp).toHaveBeenCalledTimes(1);
        resolve({ data: { user: { id: 'synthetic-user' }, session: null }, error: null }); await first;
    });
    it('atualização de perfil usa seu próprio submit e não faz login nem cadastro', async () => {
        state.currentUser = { isLoggedIn: true, id: 'synthetic-user', email, name: 'Pessoa Sintética', plan: 'free' };
        showProfileModal(); settle();
        el('profile-name').value = 'Pessoa Sintética Atualizada';
        el('profile-update-form').querySelector('button[type=submit]').click();
        await vi.advanceTimersByTimeAsync(0);
        expect(api.upsert).toHaveBeenCalledTimes(1);
        expect(api.signInWithPassword).not.toHaveBeenCalled();
        expect(api.signUp).not.toHaveBeenCalled();
    });
    it('trocar para cadastro não reaproveita a senha de uma tentativa de login', () => {
        el('login-password').value = password;
        el('register-password').value = 'RASCUNHO_SINTETICO';
        el('profile-register-btn').click(); settle();
        expect(el('login-password').value).toBe('');
        expect(el('register-password').value).toBe('');
        expect(api.signUp).not.toHaveBeenCalled();
    });
    it.each(['invalid_credentials', 'user_not_found'])('falha %s mantém login, sem cadastro automático, com aviso por seis segundos', async code => {
        api.signInWithPassword.mockResolvedValueOnce({ data: { session: null }, error: { code, message: 'Invalid login credentials' } });
        showProfileModal(); settle();
        el('login-email').value = email; el('login-password').value = password;
        await handleLogin(eventFor('login-form')); settle();
        expect([...document.querySelectorAll('.modal.show')].map(x => x.id)).toEqual(['profile-modal']);
        expect(el('auth-notice').hidden).toBe(false);
        expect(el('auth-notice').textContent).toContain('Confira seu e-mail e sua senha');
        vi.advanceTimersByTime(6000);
        expect(el('auth-notice').hidden).toBe(true);
        expect(api.signUp).not.toHaveBeenCalled();
        expect(state.currentUser.isLoggedIn).toBe(false);
    });
    it('uma sessão retornada pelo transporte de teste é exigida para concluir login', async () => {
        const user = { id: 'synthetic-user', email };
        api.signInWithPassword.mockResolvedValueOnce({ data: { user, session: { user, access_token: 'SYNTHETIC_TEST_TOKEN' } }, error: null });
        el('login-email').value = email; el('login-password').value = password;
        await handleLogin(eventFor('login-form'));
        expect(state.currentUser.isLoggedIn).toBe(true);
        expect(state.currentUser.id).toBe(user.id);
        expect(api.signUp).not.toHaveBeenCalled();
        expect(el('login-password').value).toBe('');
    });
});
