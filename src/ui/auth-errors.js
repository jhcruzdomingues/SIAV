export const MIN_REGISTRATION_PASSWORD_LENGTH = 8;

// Translate known provider codes, never raw server messages or account existence.
export function registrationErrorMessage(error) {
    const code = error?.code;
    if (code === 'weak_password') return `Use uma senha mais forte, com pelo menos ${MIN_REGISTRATION_PASSWORD_LENGTH} caracteres.`;
    if (code === 'email_address_invalid') return 'Confira o formato do e-mail informado.';
    if (code === 'email_address_not_authorized') return 'Neste ambiente de testes, o envio de confirmação está restrito aos e-mails autorizados da equipe.';
    if (['over_email_send_rate_limit', 'over_request_rate_limit'].includes(code) || error?.status === 429) {
        return 'O limite de tentativas ou de envio de e-mails foi atingido. Aguarde antes de tentar novamente.';
    }
    if (['signup_disabled', 'email_provider_disabled'].includes(code)) return 'O cadastro por e-mail está indisponível neste momento. Entre em contato com o suporte.';
    if (code === 'unexpected_failure' || Number.isInteger(error?.status) && error.status >= 500) {
        return 'O serviço de cadastro apresentou uma falha interna. Tente novamente mais tarde ou entre em contato com o suporte.';
    }
    if (error?.name === 'AuthRetryableFetchError') return 'Não foi possível conectar ao serviço de cadastro. Verifique a conexão e tente novamente.';
    return 'Não foi possível concluir o cadastro agora. Tente novamente mais tarde.';
}
