import { MIN_REGISTRATION_PASSWORD_LENGTH } from './auth-errors.js';

// Descriptive registration data only. These choices never grant clinical permissions.
const professions = [
    { name: 'Médico(a)', council: 'CRM', example: '000000' },
    { name: 'Enfermeiro(a)', council: 'COREN', example: '000000-ENF' },
    { name: 'Técnico(a) de Enfermagem', council: 'COREN', example: '000000-TE' },
    { name: 'Auxiliar de Enfermagem', council: 'COREN', example: '000000-AE' },
    { name: 'Fisioterapeuta', council: 'CREFITO', example: '1/000000-F' },
    { name: 'Cirurgião-dentista', council: 'CRO', example: '000000' },
    { name: 'Estudante', council: null },
];
const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export function updateRegistrationProfession({ clear = true } = {}) {
    const select = document.getElementById('register-profession');
    const input = document.getElementById('register-council');
    const state = document.getElementById('register-council-state');
    if (!select || !input) return;
    select.setCustomValidity('');
    const profession = professions.find(item => item.name === select.value);
    if (clear || !profession?.council) input.value = '';
    input.setCustomValidity('');
    input.disabled = !profession?.council;
    input.required = Boolean(profession?.council);
    if (state) {
        if (clear || !profession?.council) state.value = '';
        state.setCustomValidity('');
        state.disabled = !profession?.council;
        state.required = Boolean(profession?.council);
    }
    const label = document.getElementById('register-council-label');
    if (label) label.textContent = profession?.council ? `Registro no ${profession.council}` : 'Registro profissional';
    input.placeholder = profession?.council ? `Ex.: ${profession.example}` : profession ? 'Não se aplica a estudantes' : 'Selecione a profissão';
    const hint = document.getElementById('register-council-hint');
    if (hint) hint.textContent = profession?.council === 'CREFITO' ? 'Informe número e região do CREFITO. Selecione a UF ao lado.' : profession?.council ? `Informe o número do ${profession.council} e selecione a UF ao lado.` : profession ? 'Estudante: registro profissional e UF não exigidos.' : 'Selecione sua profissão para informar o conselho.';
}

export function validateRegistrationPasswords() {
    const password = document.getElementById('register-password');
    const confirmation = document.getElementById('register-password-confirm');
    if (!password || !confirmation) return '';
    const lengthMessage = password.value.length < MIN_REGISTRATION_PASSWORD_LENGTH
        ? `Use uma senha com pelo menos ${MIN_REGISTRATION_PASSWORD_LENGTH} caracteres.` : '';
    password.setCustomValidity(lengthMessage);
    const message = !confirmation.value ? 'Confirme a senha.' : confirmation.value !== password.value ? 'As senhas não coincidem. Digite a mesma senha nos dois campos.' : '';
    confirmation.setCustomValidity(message);
    return lengthMessage || message;
}

export function validateRegistrationFields() {
    updateRegistrationProfession({ clear: false });
    const select = document.getElementById('register-profession');
    const input = document.getElementById('register-council');
    const state = document.getElementById('register-council-state');
    const profession = professions.find(item => item.name === select?.value);
    const professionError = profession ? '' : 'Selecione sua profissão ou Estudante.';
    select?.setCustomValidity(professionError);
    const councilError = profession?.council && !input.value.trim() ? `Informe seu registro no ${profession.council}.` : '';
    input?.setCustomValidity(councilError);
    const stateError = profession?.council && !states.includes(state?.value) ? 'Selecione a UF do seu registro.' : '';
    state?.setCustomValidity(stateError);
    return professionError || councilError || stateError || validateRegistrationPasswords();
}

export function initializeRegistrationFields() {
    const select = document.getElementById('register-profession');
    if (!select) return;
    if (select.options.length === 1) {
        for (const profession of professions) {
            const option = document.createElement('option');
            option.value = profession.name;
            option.textContent = profession.name;
            select.append(option);
        }
    }
    const state = document.getElementById('register-council-state');
    if (state?.options.length === 1) {
        for (const uf of states) {
            const option = document.createElement('option');
            option.value = uf;
            option.textContent = uf;
            state.append(option);
        }
    }
    updateRegistrationProfession({ clear: false });
}
