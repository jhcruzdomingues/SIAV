// =============================================
// SISTEMA DE CONFIGURAÇÃO DE SONS - SIAV
// =============================================

/**
 * Estado global das configurações de som
 */
const soundSettings = {
    enabled: true,
    volume: 70,
    sounds: {
        shock: 'sounds/library/shocks/shock-1.mp3',
        alert: 'sounds/library/alerts/alert-1.mp3',
        drug: 'sounds/library/drugs/drug-1.mp3',
        metronome: 'sounds/library/metronome/metronome-1.mp3'
    },
    customSounds: {
        shock: [],
        alert: [],
        drug: [],
        metronome: []
    }
};

/**
 * Áudio em reprodução atualmente
 */
let currentPreviewAudio = null;

/**
 * Inicializa o sistema de sons quando o modal é aberto
 */
function initSoundSettings() {
    loadSoundSettings();
    setupVolumeControl();
    setupSoundToggle();
    setupSoundSelectors();
    setupUploadHandlers();
}

/**
 * Carrega configurações salvas do localStorage
 */
function loadSoundSettings() {
    try {
        const saved = localStorage.getItem('siav_sound_settings');
        if (saved) {
            const savedSettings = JSON.parse(saved);
            Object.assign(soundSettings, savedSettings);
        }

        // Aplicar configurações na interface
        document.getElementById('sounds-enabled-toggle').checked = soundSettings.enabled;
        document.getElementById('volume-slider').value = soundSettings.volume;
        document.getElementById('volume-value').textContent = soundSettings.volume + '%';

        // Selecionar sons nos dropdowns
        document.getElementById('shock-sound-select').value = soundSettings.sounds.shock;
        document.getElementById('alert-sound-select').value = soundSettings.sounds.alert;
        document.getElementById('drug-sound-select').value = soundSettings.sounds.drug;
        document.getElementById('metronome-sound-select').value = soundSettings.sounds.metronome;

        // Carregar sons personalizados
        loadCustomSounds();

        console.log('✅ Configurações de som carregadas');
    } catch (error) {
        console.error('❌ Erro ao carregar configurações de som:', error);
    }
}

/**
 * Configura o controle de volume
 */
function setupVolumeControl() {
    const slider = document.getElementById('volume-slider');
    const display = document.getElementById('volume-value');

    slider.addEventListener('input', function() {
        const value = this.value;
        display.textContent = value + '%';
        soundSettings.volume = parseInt(value);

        // Atualizar volume do preview atual se estiver tocando
        if (currentPreviewAudio) {
            currentPreviewAudio.volume = value / 100;
        }
    });
}

/**
 * Configura o toggle de ativar/desativar sons
 */
function setupSoundToggle() {
    const toggle = document.getElementById('sounds-enabled-toggle');

    toggle.addEventListener('change', function() {
        soundSettings.enabled = this.checked;

        // Desabilitar/habilitar visualmente os grupos de som
        const groups = document.querySelectorAll('.sound-setting-group');
        groups.forEach((group, index) => {
            if (index > 0) { // Não desabilitar o primeiro grupo (toggle)
                if (this.checked) {
                    group.classList.remove('disabled');
                } else {
                    group.classList.add('disabled');
                }
            }
        });
    });
}

/**
 * Configura os seletores de som
 */
function setupSoundSelectors() {
    const selectors = ['shock', 'alert', 'drug', 'metronome'];

    selectors.forEach(type => {
        const select = document.getElementById(`${type}-sound-select`);
        select.addEventListener('change', function() {
            soundSettings.sounds[type] = this.value;
            console.log(`Som ${type} alterado para:`, this.value);
        });
    });
}

/**
 * Carrega sons personalizados do localStorage
 */
function loadCustomSounds() {
    try {
        const customSounds = localStorage.getItem('siav_custom_sounds');
        if (customSounds) {
            soundSettings.customSounds = JSON.parse(customSounds);

            // Adicionar aos dropdowns
            Object.keys(soundSettings.customSounds).forEach(type => {
                const group = document.getElementById(`${type}-custom-group`);
                if (group) {
                    group.innerHTML = ''; // Limpar
                    soundSettings.customSounds[type].forEach((sound, index) => {
                        const option = document.createElement('option');
                        option.value = sound.data;
                        option.textContent = sound.name;
                        option.setAttribute('data-custom', 'true');
                        group.appendChild(option);
                    });
                }
            });
        }
    } catch (error) {
        console.error('❌ Erro ao carregar sons personalizados:', error);
    }
}

/**
 * Configura handlers de upload de sons personalizados
 */
function setupUploadHandlers() {
    const uploadInputs = [
        'upload-shock-sound',
        'upload-alert-sound',
        'upload-drug-sound',
        'upload-metronome-sound'
    ];

    uploadInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        const type = inputId.replace('upload-', '').replace('-sound', '');

        input.addEventListener('change', function(e) {
            handleSoundUpload(e, type);
        });
    });
}

/**
 * Processa upload de som personalizado
 */
function handleSoundUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('audio/')) {
        alert('❌ Por favor, selecione um arquivo de áudio válido.');
        return;
    }

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('❌ O arquivo é muito grande. Tamanho máximo: 5MB');
        return;
    }

    const uploadBtn = event.target.previousElementSibling;
    uploadBtn.classList.add('loading');
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando';

    // Ler arquivo como Data URL
    const reader = new FileReader();
    reader.onload = function(e) {
        const soundData = {
            name: file.name.replace(/\.[^/.]+$/, ''), // Remove extensão
            data: e.target.result
        };

        // Adicionar ao estado
        if (!soundSettings.customSounds[type]) {
            soundSettings.customSounds[type] = [];
        }
        soundSettings.customSounds[type].push(soundData);

        // Adicionar ao dropdown
        const select = document.getElementById(`${type}-sound-select`);
        const customGroup = document.getElementById(`${type}-custom-group`);

        const option = document.createElement('option');
        option.value = soundData.data;
        option.textContent = soundData.name;
        option.setAttribute('data-custom', 'true');
        customGroup.appendChild(option);

        // Selecionar o novo som
        select.value = soundData.data;
        soundSettings.sounds[type] = soundData.data;

        // Restaurar botão
        uploadBtn.classList.remove('loading');
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Adicionar Som Personalizado';

        // Salvar automaticamente
        saveCustomSounds();

        alert(`✅ Som "${soundData.name}" adicionado com sucesso!`);
    };

    reader.onerror = function() {
        uploadBtn.classList.remove('loading');
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Adicionar Som Personalizado';
        alert('❌ Erro ao carregar arquivo de áudio.');
    };

    reader.readAsDataURL(file);

    // Limpar input
    event.target.value = '';
}

/**
 * Salva sons personalizados no localStorage
 */
function saveCustomSounds() {
    try {
        localStorage.setItem('siav_custom_sounds', JSON.stringify(soundSettings.customSounds));
        console.log('✅ Sons personalizados salvos');
    } catch (error) {
        console.error('❌ Erro ao salvar sons personalizados:', error);
        if (error.name === 'QuotaExceededError') {
            alert('⚠️ Armazenamento cheio. Remova alguns sons personalizados.');
        }
    }
}

/**
 * Testa/Preview de um som
 * @param {string} type - Tipo do som: 'shock', 'alert', 'drug', 'metronome'
 */
function previewSound(type) {
    // Parar som atual se estiver tocando
    if (currentPreviewAudio) {
        currentPreviewAudio.pause();
        currentPreviewAudio = null;

        // Remover estado "playing" de todos os botões
        document.querySelectorAll('.preview-btn').forEach(btn => {
            btn.classList.remove('playing');
            btn.innerHTML = '<i class="fas fa-play"></i> Testar';
        });
    }

    // Obter som selecionado
    const select = document.getElementById(`${type}-sound-select`);
    const soundPath = select.value;

    if (!soundPath) {
        alert('⚠️ Por favor, selecione um som primeiro.');
        return;
    }

    // Criar e tocar áudio
    const audio = new Audio(soundPath);
    audio.volume = soundSettings.volume / 100;

    // Obter botão que foi clicado
    const button = event.target.closest('.preview-btn');
    button.classList.add('playing');
    button.innerHTML = '<i class="fas fa-stop"></i> Parar';

    audio.onended = function() {
        button.classList.remove('playing');
        button.innerHTML = '<i class="fas fa-play"></i> Testar';
        currentPreviewAudio = null;
    };

    audio.onerror = function() {
        button.classList.remove('playing');
        button.innerHTML = '<i class="fas fa-play"></i> Testar';
        currentPreviewAudio = null;
        alert('❌ Erro ao reproduzir som. Verifique se o arquivo existe.');
    };

    audio.play().catch(error => {
        console.error('Erro ao tocar som:', error);
        button.classList.remove('playing');
        button.innerHTML = '<i class="fas fa-play"></i> Testar';
        alert('❌ Erro ao reproduzir som.');
    });

    currentPreviewAudio = audio;
}

/**
 * Salva todas as configurações de som
 */
function saveSoundSettings() {
    try {
        // Salvar configurações principais
        localStorage.setItem('siav_sound_settings', JSON.stringify(soundSettings));

        // Atualizar áudios globais se existirem
        updateGlobalAudios();

        console.log('✅ Configurações de som salvas:', soundSettings);

        // Feedback visual
        const saveBtn = document.querySelector('.btn-save-sounds');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
        saveBtn.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';

        setTimeout(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.style.background = '';
        }, 2000);

        // Fechar modal automaticamente após 1 segundo
        setTimeout(() => {
            closeModal('sound-settings-modal');
            openModal('settings-menu-modal');
        }, 1000);

    } catch (error) {
        console.error('❌ Erro ao salvar configurações:', error);
        alert('❌ Erro ao salvar configurações de som.');
    }
}

/**
 * Atualiza elementos de áudio globais com novas configurações
 */
function updateGlobalAudios() {
    const audioElements = {
        'shock-sound': soundSettings.sounds.shock,
        'alert-sound': soundSettings.sounds.alert,
        'drug-sound': soundSettings.sounds.drug,
        'metronome-sound': soundSettings.sounds.metronome
    };

    Object.keys(audioElements).forEach(id => {
        const audio = document.getElementById(id);
        if (audio) {
            audio.src = audioElements[id];
            audio.volume = soundSettings.volume / 100;
        }
    });
}

/**
 * Restaura configurações padrão
 */
function resetSoundSettings() {
    const confirm = window.confirm(
        '⚠️ Tem certeza que deseja restaurar as configurações padrão?\n\n' +
        'Isso irá:\n' +
        '• Remover todos os sons personalizados\n' +
        '• Restaurar sons da biblioteca padrão\n' +
        '• Redefinir volume para 70%'
    );

    if (!confirm) return;

    // Restaurar valores padrão
    soundSettings.enabled = true;
    soundSettings.volume = 70;
    soundSettings.sounds = {
        shock: 'sounds/library/shocks/shock-1.mp3',
        alert: 'sounds/library/alerts/alert-1.mp3',
        drug: 'sounds/library/drugs/drug-1.mp3',
        metronome: 'sounds/library/metronome/metronome-1.mp3'
    };
    soundSettings.customSounds = {
        shock: [],
        alert: [],
        drug: [],
        metronome: []
    };

    // Limpar localStorage
    localStorage.removeItem('siav_sound_settings');
    localStorage.removeItem('siav_custom_sounds');

    // Recarregar interface
    loadSoundSettings();

    // Limpar grupos de sons personalizados
    ['shock', 'alert', 'drug', 'metronome'].forEach(type => {
        const group = document.getElementById(`${type}-custom-group`);
        if (group) group.innerHTML = '';
    });

    alert('✅ Configurações restauradas para o padrão!');
}

/**
 * Obtém configurações atuais (para uso externo)
 */
function getSoundSettings() {
    return soundSettings;
}

/**
 * Toca um som do sistema (para uso no app principal)
 * @param {string} type - Tipo do som
 */
function playSystemSound(type) {
    if (!soundSettings.enabled) return;

    const soundPath = soundSettings.sounds[type];
    if (!soundPath) return;

    const audio = new Audio(soundPath);
    audio.volume = soundSettings.volume / 100;
    audio.play().catch(error => {
        console.error(`Erro ao tocar som ${type}:`, error);
    });
}

// =============================================
// INICIALIZAÇÃO
// =============================================

// Inicializar quando o modal de sons for aberto
document.addEventListener('DOMContentLoaded', function() {
    // Observer para detectar abertura do modal
    const soundModal = document.getElementById('sound-settings-modal');
    if (soundModal) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    if (soundModal.classList.contains('show')) {
                        initSoundSettings();
                    }
                }
            });
        });

        observer.observe(soundModal, { attributes: true });
    }

    // Carregar configurações salvas na inicialização
    loadSoundSettings();
});

// Exportar funções globalmente
window.previewSound = previewSound;
window.saveSoundSettings = saveSoundSettings;
window.resetSoundSettings = resetSoundSettings;
window.playSystemSound = playSystemSound;
window.getSoundSettings = getSoundSettings;

console.log('🔊 Sistema de configuração de sons carregado');
