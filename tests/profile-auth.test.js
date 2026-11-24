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
const invitation = 'CRIE UMA CONTA É RÁPIDO E GRÁTIS! 😉';
const settle = () => vi.advanceTimersByTime(350);
const eventFor = id => ({ preventDefault: vi.fn(), target: el(id), currentTarget: el(id) });
const fillRegistration = (profession = 'Estudante') => {
    el('register-name').value = 'Pessoa Sintética';
    el('register-email').value = email;
    el('register-password').value = password;
    el('register-profession').value = profession;
    el('register-profession').dispatchEvent(new Event('change'));
    if (el('register-password-confirm')) el('register-password-confirm').value = password;
};

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
        fillRegistration();
        await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(api.signUp).toHaveBeenCalledTimes(1);
        expect(api.signInWithPassword).not.toHaveBeenCalled();
        expect(state.currentUser.isLoggedIn).toBe(false);
        expect(el('register-feedback').textContent).toContain('e-mail');
        expect(el('register-modal').classList.contains('show')).toBe(true);
        expect(el('register-password').value).toBe('');
        expect(api.signUp.mock.calls[0][0].options.data).toEqual({ full_name: 'Pessoa Sintética', profession: 'Estudante' });
    });
    it('erro de cadastro preserva campos, libera botão e permite nova tentativa', async () => {
        api.signUp.mockRejectedValueOnce(new Error('Synthetic offline'));
        el('register-name').value = 'Pessoa Sintética';
        el('register-email').value = email; el('register-password').value = password;
        fillRegistration();
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
        fillRegistration();
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

describe('Cadastro: confirmação de senha e registro por profissão', () => {
    it('alinha os campos e bloqueia sete caracteres antes de chamar o serviço', async () => {
        fillRegistration();
        expect(el('register-password').minLength).toBe(8);
        expect(el('register-password-confirm').minLength).toBe(8);
        expect(el('register-password').placeholder).toContain('8');
        el('register-password').value = 'TESTE12'; el('register-password-confirm').value = 'TESTE12';
        await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(api.signUp).not.toHaveBeenCalled();
        expect(el('register-feedback').textContent).toContain('pelo menos 8 caracteres');
        expect(el('register-password').validity.valid).toBe(false);
    });
    it('corrigir para oito caracteres libera envio sem alterar a senha digitada', async () => {
        fillRegistration(); el('register-password').value = 'TESTE12'; el('register-password-confirm').value = 'TESTE12';
        await handleRegistrationFromForm(eventFor('register-form-full'));
        el('register-password').value = ' TESTE12'; el('register-password-confirm').value = ' TESTE12';
        el('register-password').dispatchEvent(new Event('input'));
        await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(api.signUp).toHaveBeenCalledTimes(1);
        expect(api.signUp.mock.calls[0][0].password).toBe(' TESTE12');
    });
    it('não aplica a nova regra de cadastro às senhas de contas existentes no login', async () => {
        el('login-email').value = email; el('login-password').value = 'ANTIGA';
        await handleLogin(eventFor('login-form'));
        expect(api.signInWithPassword).toHaveBeenCalledWith({ email, password: 'ANTIGA' });
        expect(api.signUp).not.toHaveBeenCalled();
    });
    it.each([
        [{ code: 'unexpected_failure', status: 500 }, 'falha interna'],
        [{ status: 503 }, 'falha interna'],
        [{ code: 'weak_password', status: 422 }, 'pelo menos 8 caracteres'],
        [{ code: 'email_address_invalid' }, 'formato do e-mail'],
        [{ code: 'email_address_not_authorized', status: 403 }, 'e-mails autorizados da equipe'],
        [{ code: 'over_email_send_rate_limit', status: 429 }, 'limite'],
        [{ code: 'over_request_rate_limit' }, 'limite'],
        [{ code: 'signup_disabled' }, 'indisponível'],
        [{ code: 'email_provider_disabled' }, 'indisponível'],
        [{ name: 'AuthRetryableFetchError' }, 'conectar ao serviço'],
    ])('traduz o erro %j sem expor mensagens brutas ou autenticar', async (error, expected) => {
        const sensitive = 'SYNTHETIC_PRIVATE server SQL public.profiles token password pessoa@example.invalid';
        api.signUp.mockResolvedValueOnce({ data: { user: null, session: null }, error: { ...error, message: sensitive } });
        fillRegistration(); await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(el('register-feedback').textContent).toContain(expected);
        expect(el('register-feedback').textContent).not.toContain(sensitive);
        expect(el('register-feedback').textContent).not.toContain('public.profiles');
        expect(state.currentUser.isLoggedIn).toBe(false);
        expect(el('register-password').value).toBe(password);
        expect(el('register-form-full').querySelector('button[type=submit]').disabled).toBe(false);
        expect(api.signUp).toHaveBeenCalledTimes(1);
    });
    it.each(['user_already_exists', 'user_not_found', 'unknown'])('erro %s não revela existência de conta', async code => {
        api.signUp.mockResolvedValueOnce({ data: null, error: { code, message: 'SYNTHETIC account exists' } });
        fillRegistration(); await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(el('register-feedback').textContent).toBe('Não foi possível concluir o cadastro agora. Tente novamente mais tarde.');
        expect(state.currentUser.isLoggedIn).toBe(false);
    });
    it('exige confirmação e bloqueia senhas diferentes antes de chamar o SDK', async () => {
        fillRegistration();
        expect(el('register-password-confirm').required).toBe(true);
        el('register-password-confirm').value = password + 'DIFERENTE';
        await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(api.signUp).not.toHaveBeenCalled();
        expect(el('register-feedback').textContent).toContain('As senhas não coincidem');
        expect(el('register-form-full').querySelector('button[type=submit]').disabled).toBe(false);
    });
    it('bloqueia confirmação vazia e compara sem remover espaços da senha', async () => {
        fillRegistration();
        el('register-password-confirm').value = '';
        await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(api.signUp).not.toHaveBeenCalled();
        el('register-password-confirm').value = password + ' ';
        await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(api.signUp).not.toHaveBeenCalled();
    });
    it('corrigir a confirmação libera o envio, sem incluir a confirmação em metadados', async () => {
        fillRegistration();
        el('register-password-confirm').value = 'OUTRA_SENHA';
        el('register-password-confirm').dispatchEvent(new Event('input'));
        expect(el('register-password-confirm').validity.valid).toBe(false);
        el('register-password-confirm').value = password;
        el('register-password-confirm').dispatchEvent(new Event('input'));
        await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(api.signUp).toHaveBeenCalledTimes(1);
        const payload = api.signUp.mock.calls[0][0];
        expect(payload.password).toBe(password);
        expect(payload).not.toHaveProperty('password_confirmation');
        expect(JSON.stringify(payload.options.data)).not.toContain(password);
    });
    it('oferece uma lista fechada de profissões e exige a escolha explícita', async () => {
        expect(el('register-profession').tagName).toBe('SELECT');
        const choices = [...el('register-profession').options].map(x => x.value).filter(Boolean);
        expect(choices).toEqual(['Médico(a)', 'Enfermeiro(a)', 'Técnico(a) de Enfermagem', 'Auxiliar de Enfermagem', 'Fisioterapeuta', 'Cirurgião-dentista', 'Estudante']);
        fillRegistration('');
        await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(api.signUp).not.toHaveBeenCalled();
    });
    it.each([
        ['Médico(a)', 'CRM'], ['Enfermeiro(a)', 'COREN'], ['Técnico(a) de Enfermagem', 'COREN'],
        ['Auxiliar de Enfermagem', 'COREN'], ['Fisioterapeuta', 'CREFITO'], ['Cirurgião-dentista', 'CRO'],
    ])('%s solicita %s e descarta o registro de outra seleção', (profession, council) => {
        el('register-council').value = 'REGISTRO_SINTETICO_ANTERIOR';
        fillRegistration(profession);
        expect(el('register-council').disabled).toBe(false);
        expect(el('register-council').required).toBe(true);
        expect(el('register-council-label').textContent).toContain(council);
        expect(el('register-council').placeholder).toContain('Ex.:');
        expect(el('register-council-state').required).toBe(true);
        expect(el('register-council').value).toBe('');
        expect(api.signUp).not.toHaveBeenCalled();
    });
    it('Estudante desabilita e limpa o registro, que não é enviado no cadastro', async () => {
        fillRegistration('Médico(a)'); el('register-council').value = 'CRM-SINTETICO';
        fillRegistration('Estudante');
        expect(el('register-council').disabled).toBe(true);
        expect(el('register-council').required).toBe(false);
        expect(el('register-council').value).toBe('');
        await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(api.signUp).toHaveBeenCalledTimes(1);
        expect(api.signUp.mock.calls[0][0].options.data).not.toHaveProperty('council_register');
    });
    it('voltar de Estudante para profissional reativa o conselho e exige seu preenchimento', async () => {
        fillRegistration('Estudante'); fillRegistration('Enfermeiro(a)');
        await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(el('register-council').disabled).toBe(false);
        expect(api.signUp).not.toHaveBeenCalled();
        el('register-council').value = 'COREN-UF 000000';
        el('register-council-state').value = 'SP';
        el('register-council-state').dispatchEvent(new Event('change'));
        await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(api.signUp).toHaveBeenCalledTimes(1);
        expect(api.signUp.mock.calls[0][0].options.data.council_register).toBe('COREN-UF 000000');
    });
    it('trocar profissão não muda plano, algoritmo ou autenticação', () => {
        const before = JSON.stringify({ patient: state.patient, clinical: state.clinical, currentUser: state.currentUser });
        fillRegistration('Médico(a)');
        expect(JSON.stringify({ patient: state.patient, clinical: state.clinical, currentUser: state.currentUser })).toBe(before);
        expect(api.signInWithPassword).not.toHaveBeenCalled();
    });
    it('a engrenagem usa SVG local com nome acessível e preserva a abertura do menu', () => {
        expect(el('settings-btn').getAttribute('aria-label')).toBe('Configurações');
        expect(el('settings-btn').querySelector('svg[aria-hidden="true"]')).not.toBeNull();
        expect(el('settings-btn').textContent).not.toContain('⚙');
    });
    it('selecionar profissão e preencher o conselho limpa erros anteriores', async () => {
        fillRegistration('');
        await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(el('register-profession').validity.customError).toBe(true);
        fillRegistration('Médico(a)');
        expect(el('register-profession').validity.valid).toBe(true);
        await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(el('register-council').validity.customError).toBe(true);
        el('register-council').value = 'CRM-SP 000000';
        el('register-council').dispatchEvent(new Event('input'));
        expect(el('register-council').validity.valid).toBe(true);
    });
    it('reset do cadastro restaura seleção e campo desabilitado e limpa o erro de confirmação', async () => {
        fillRegistration('Médico(a)');
        el('register-password-confirm').value = 'DIFERENTE';
        el('register-password-confirm').dispatchEvent(new Event('input'));
        el('register-form-full').reset();
        await Promise.resolve();
        expect(el('register-profession').value).toBe('');
        expect(el('register-council').disabled).toBe(true);
        expect(el('register-council').required).toBe(false);
        expect(el('register-password-confirm').validity.customError).toBe(false);
    });
});

describe('Cadastro: UF do registro e rodapé', () => {
    it('oferece as 27 UFs sem depender de uma consulta remota', () => {
        const select = el('register-council-state');
        expect(select.tagName).toBe('SELECT');
        expect([...select.options].map(x => x.value).filter(Boolean)).toEqual(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']);
        expect(api.signUp).not.toHaveBeenCalled();
    });
    it('exige uma UF válida de profissional e a envia separada, sem alterar o número', async () => {
        fillRegistration('Médico(a)');
        el('register-council').value = '000000';
        await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(api.signUp).not.toHaveBeenCalled();
        expect(el('register-feedback').textContent).toContain('UF');
        el('register-council-state').value = 'SP';
        el('register-council-state').dispatchEvent(new Event('change'));
        await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(api.signUp).toHaveBeenCalledTimes(1);
        expect(api.signUp.mock.calls[0][0].options.data).toMatchObject({ council_register: '000000', council_state: 'SP' });
    });
    it('Estudante desabilita e limpa os dois campos e não envia UF nem conselho', async () => {
        fillRegistration('Médico(a)');
        el('register-council-state').value = 'SP';
        el('register-council').value = '000000';
        fillRegistration('Estudante');
        expect(el('register-council-state').disabled).toBe(true);
        expect(el('register-council-state').required).toBe(false);
        expect(el('register-council-state').value).toBe('');
        await handleRegistrationFromForm(eventFor('register-form-full'));
        const data = api.signUp.mock.calls[0][0].options.data;
        expect(data).not.toHaveProperty('council_state');
        expect(data).not.toHaveProperty('council_register');
    });
    it('troca de profissão limpa a UF e reset restaura o campo desabilitado', async () => {
        fillRegistration('Médico(a)'); el('register-council-state').value = 'SP';
        fillRegistration('Enfermeiro(a)');
        expect(el('register-council-state').value).toBe('');
        expect(el('register-council-state').disabled).toBe(false);
        el('register-form-full').reset(); await Promise.resolve();
        expect(el('register-council-state').disabled).toBe(true);
    });
    it('não deduz região de CREFITO a partir da UF escolhida', async () => {
        fillRegistration('Fisioterapeuta');
        el('register-council').value = '1/000000-F';
        el('register-council-state').value = 'PE';
        el('register-council-state').dispatchEvent(new Event('change'));
        await handleRegistrationFromForm(eventFor('register-form-full'));
        expect(api.signUp.mock.calls[0][0].options.data).toMatchObject({ council_register: '1/000000-F', council_state: 'PE' });
    });
    it('tem conteúdo centralizável no botão e aviso com cadeado, sem promessa absoluta', () => {
        expect(el('register-submit-btn').querySelector('.registration-submit-content').textContent).toContain('Cadastrar');
        expect(el('register-security-note').querySelector('svg[aria-hidden="true"]')).not.toBeNull();
        expect(el('register-security-note').textContent).toContain('HTTPS');
        expect(el('register-security-note').textContent).not.toMatch(/100%|totalmente|garantid/i);
    });
});
