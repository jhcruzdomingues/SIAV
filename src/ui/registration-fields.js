// Descriptive registration data only. These choices never grant clinical permissions.
const professions = [
    { name: 'Médico(a)', council: 'CRM', example: 'CRM-SP 000000' },
    { name: 'Enfermeiro(a)', council: 'COREN', example: 'COREN-SP 000000-ENF' },
    { name: 'Técnico(a) de Enfermagem', council: 'COREN', example: 'COREN-SP 000000-TE' },
    { name: 'Auxiliar de Enfermagem', council: 'COREN', example: 'COREN-SP 000000-AE' },
    { name: 'Fisioterapeuta', council: 'CREFITO', example: 'CREFITO-1 000000-F' },
    { name: 'Cirurgião-dentista', council: 'CRO', example: 'CRO-SP 000000' },
    { name: 'Estudante', council: null },
];

export function updateRegistrationProfession({ clear = true } = {}) {
    const select = document.getElementById('register-profession');
    const input = document.getElementById('register-council');
    if (!select || !input) return;
    select.setCustomValidity('');
    const profession = professions.find(item => item.name === select.value);
    if (clear || !profession?.council) input.value = '';
    input.setCustomValidity('');
    input.disabled = !profession?.council;
    input.required = Boolean(profession?.council);
    const label = document.getElementById('register-council-label');
    if (label) label.textContent = profession?.council ? `Registro no ${profession.council}` : 'Registro profissional';
    input.placeholder = profession?.council ? `Ex.: ${profession.example}` : profession ? 'Não se aplica a estudantes' : 'Selecione a profissão';
    const hint = document.getElementById('register-council-hint');
    if (hint) hint.textContent = profession?.council ? `Informe seu registro no ${profession.council}, incluindo a UF ou região.` : profession ? 'Estudante: registro profissional não exigido.' : 'Selecione sua profissão para informar o conselho.';
}

export function validateRegistrationPasswords() {
    const password = document.getElementById('register-password');
    const confirmation = document.getElementById('register-password-confirm');
    if (!password || !confirmation) return '';
    const message = !confirmation.value ? 'Confirme a senha.' : confirmation.value !== password.value ? 'As senhas não coincidem. Digite a mesma senha nos dois campos.' : '';
    confirmation.setCustomValidity(message);
    return message;
}

export function validateRegistrationFields() {
    updateRegistrationProfession({ clear: false });
    const select = document.getElementById('register-profession');
    const input = document.getElementById('register-council');
    const profession = professions.find(item => item.name === select?.value);
    const professionError = profession ? '' : 'Selecione sua profissão ou Estudante.';
    select?.setCustomValidity(professionError);
    const councilError = profession?.council && !input.value.trim() ? `Informe seu registro no ${profession.council}.` : '';
    input?.setCustomValidity(councilError);
    return professionError || councilError || validateRegistrationPasswords();
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
    updateRegistrationProfession({ clear: false });
}
