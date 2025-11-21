// =============================================
// INTEGRAÇÃO DO MENU DE CONFIGURAÇÕES COM CÓDIGO LEGADO
// =============================================
// Este arquivo conecta o novo sistema de configurações
// com o código legado em script.js

// =============================================
// FUNÇÕES UTILITÁRIAS
// =============================================

/**
 * Abre um modal (se não existir no script.js)
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    } else {
        console.error(`Modal não encontrado: ${modalId}`);
    }
}

/**
 * Fecha um modal (fallback se não existir no script.js)
 * A função closeModal já existe no script.js, mas garantimos aqui
 */
if (typeof closeModal === 'undefined') {
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    }
}

// =============================================
// FUNÇÕES GLOBAIS (Compatibilidade)
// =============================================

/**
 * Abre o menu principal de configurações
 */
function openSettingsMenu() {
    openModal('settings-menu-modal');
}

/**
 * Abre configurações de perfil
 */
function openProfileSettings() {
    closeModal('settings-menu-modal');
    // Usar a função showProfileModal do script.js que já tem toda a lógica de login
    if (typeof showProfileModal === 'function') {
        showProfileModal();
    } else {
        openModal('profile-modal');
    }
}

/**
 * Abre configurações de sons
 */
function openSoundSettings() {
    closeModal('settings-menu-modal');
    openModal('sound-settings-modal');
}

/**
 * Volta do modal de sons para o menu principal de configurações
 */
function backToSettingsMenu() {
    closeModal('sound-settings-modal');
    openModal('settings-menu-modal');
}

/**
 * Abre configurações de tema
 */
function openThemeSettings() {
    closeModal('settings-menu-modal');
    openModal('theme-settings-modal');
    loadCurrentTheme();
}

/**
 * Abre configurações de plano
 */
function openPlanSettings() {
    closeModal('settings-menu-modal');
    showPlanInfo();
}

/**
 * Abre configurações de dados
 */
function openDataSettings() {
    closeModal('settings-menu-modal');
    showDataSettings();
}

/**
 * Abre sobre o SIAV
 */
function openAboutSettings() {
    closeModal('settings-menu-modal');
    showAboutInfo();
}

// =============================================
// SISTEMA DE TEMAS
// =============================================

/**
 * Define o tema da aplicação
 */
function setTheme(theme) {
    try {
        if (!theme) {
            console.error('Tema nao especificado');
            return;
        }

        const validThemes = ['light', 'dark', 'auto'];
        if (!validThemes.includes(theme)) {
            console.error('Tema invalido:', theme);
            return;
        }

        localStorage.setItem('siav_theme', theme);
        applyTheme(theme);
        updateThemeSelector(theme);
    } catch (error) {
        console.error('Erro ao definir tema:', error);
        alert('Erro ao alterar tema. Tente novamente.');
    }
}

/**
 * Aplica o tema na interface
 */
function applyTheme(theme) {
    try {
        const body = document.body;

        if (!body) {
            console.error('Elemento body nao encontrado');
            return;
        }

        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            body.setAttribute('data-theme', theme);
        }
    } catch (error) {
        console.error('Erro ao aplicar tema:', error);
    }
}

/**
 * Atualiza o seletor visual de tema
 */
function updateThemeSelector(theme) {
    try {
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
        });

        const selectedOption = document.getElementById(`theme-${theme}`);
        if (selectedOption) {
            selectedOption.classList.add('active');
        }
    } catch (error) {
        console.error('Erro ao atualizar seletor de tema:', error);
    }
}

/**
 * Carrega o tema atual
 */
function loadCurrentTheme() {
    try {
        const savedTheme = localStorage.getItem('siav_theme') || 'light';
        updateThemeSelector(savedTheme);
        applyTheme(savedTheme);
    } catch (error) {
        console.error('Erro ao carregar tema:', error);
        // Aplicar tema padrao em caso de erro
        applyTheme('light');
    }
}

// =============================================
// INFORMAÇÕES DE PLANO
// =============================================

function showPlanInfo() {
    try {
        const userPlan = localStorage.getItem('user_plan') || 'free';
        const planNames = {
            free: 'Gratuito',
            student: 'Estudante',
            professional: 'Profissional'
        };

        const planName = planNames[userPlan] || 'Desconhecido';

        const message = `Plano Atual: ${planName}\n\n${
            userPlan === 'free' ? 'Faca upgrade para desbloquear recursos premium!' :
            'Voce tem acesso completo aos recursos!'
        }`;

        alert(message);

        if (userPlan === 'free') {
            setTimeout(() => {
                openModal('upgrade-modal');
            }, 500);
        }
    } catch (error) {
        console.error('Erro ao exibir informacoes do plano:', error);
        alert('Erro ao carregar informacoes do plano.');
    }
}

// =============================================
// CONFIGURAÇÕES DE DADOS
// =============================================

function showDataSettings() {
    const choice = confirm(
        'Configurações de Dados:\n\n' +
        '1. Exportar histórico de atendimentos\n' +
        '2. Fazer backup local\n' +
        '3. Limpar cache do navegador\n' +
        '4. Apagar todos os dados salvos\n\n' +
        'Deseja exportar seus dados?'
    );

    if (choice) {
        exportUserData();
    }
}

function exportUserData() {
    try {
        const data = {
            theme: localStorage.getItem('siav_theme'),
            soundConfig: localStorage.getItem('siav_sound_config'),
            userPlan: localStorage.getItem('user_plan'),
            pcrHistory: localStorage.getItem('pcr_history'),
            quizResults: localStorage.getItem('quiz_results'),
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `siav-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        URL.revokeObjectURL(url);

        alert('✅ Dados exportados com sucesso!');
    } catch (error) {
        console.error('Erro ao exportar dados:', error);
        alert('❌ Erro ao exportar dados.');
    }
}

// =============================================
// SOBRE O SIAV
// =============================================

function showAboutInfo() {
    const version = '1.1.0';
    const buildDate = '2025-11-15';

    alert(
        '🏥 SIAV - Sistema Inteligente de Assistência à Vida\n\n' +
        `Versão: ${version}\n` +
        `Build: ${buildDate}\n\n` +
        'Sistema desenvolvido para auxiliar profissionais de saúde em atendimentos de emergência (RCP/ACLS).\n\n' +
        '📚 Baseado nas diretrizes AHA 2025\n' +
        '🔊 Sistema de sons customizáveis\n' +
        '📊 Dashboard e relatórios completos\n' +
        '🎓 Módulo educacional integrado\n\n' +
        'Desenvolvido com ❤️ para salvar vidas.'
    );
}

// =============================================
// INICIALIZAÇÃO
// =============================================

// Executar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar tema
    loadCurrentTheme();

    // Escutar mudanças no tema do sistema
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const currentTheme = localStorage.getItem('siav_theme');
        if (currentTheme === 'auto') {
            applyTheme('auto');
        }
    });

    // Botão já configurado via onclick no HTML
    // Não precisa de addEventListener aqui
});

// Função para abrir modal de planos/assinatura
function openPlanSettings() {
    closeModal('settings-menu-modal');
    closeModal('profile-modal');
    // Chamar função do modal de planos (carregado dinamicamente)
    if (typeof openPlansModal === 'function') {
        openPlansModal();
    } else {
        // Fallback: mostrar modal de planos padrão
        const plansModal = document.getElementById('plans-modal');
        if (plansModal) {
            plansModal.classList.add('show');
        } else {
            alert('Modal de planos em carregamento. Tente novamente em instantes.');
            // Forçar carregamento
            if (typeof loadPlansModal === 'function') {
                loadPlansModal().then(() => {
                    setTimeout(() => openPlanSettings(), 500);
                });
            }
        }
    }
}

