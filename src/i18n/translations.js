/**
 * =============================================
 * SISTEMA DE INTERNACIONALIZAÇÃO (i18n)
 * =============================================
 * Suporta múltiplos idiomas: pt-BR, en-US, es-ES
 */

const translations = {
    'pt-BR': {
        // Navegação
        'nav.home': 'Home',
        'nav.pcr': 'PCR',
        'nav.dashboard': 'Dashboard',

        // Home
        'home.greeting': 'Olá, Profissional de Saúde!',
        'home.description': 'Selecione uma ferramenta ou inicie um novo atendimento.',
        'home.startPCR': 'INICIAR PCR AGORA',
        'home.startPCR.description': 'Registro completo de atendimento de parada cardiorrespiratória.',
        'home.protocols': 'Protocolos ACLS',
        'home.studies': 'Guias de Estudo',
        'home.quiz': 'Simulado de Quiz',
        'home.glasgow': 'Escala de Glasgow',

        // PCR
        'pcr.timer': 'Tempo Total',
        'pcr.cycle': 'Ciclo',
        'pcr.compressions': 'COMPRESSÕES TORÁCICAS',
        'pcr.compressions.info': 'Ciclo 30:2 • 100-120 bpm',
        'pcr.checkRhythm': 'CHECAR RITMO',
        'pcr.metronome': 'METRÔNOMO',
        'pcr.drug': 'Droga',
        'pcr.vitals': 'Sinais Vitais',
        'pcr.notes': 'Anotar',
        'pcr.causes': '5H\'s & 5T\'s',
        'pcr.rosc': 'RCE OBTIDO (PULSO +)',
        'pcr.timeline': 'Linha do Tempo',
        'pcr.finish': 'FINALIZAR ATENDIMENTO',

        // Ritmos
        'rhythm.title': 'Qual o Ritmo Cardíaco Atual?',
        'rhythm.subtitle': 'A identificação correta define a conduta: Choque imediato ou RCP + Medicação',
        'rhythm.shockable': 'Ritmos Chocáveis',
        'rhythm.nonShockable': 'Ritmos Não-Chocáveis',
        'rhythm.vf': 'Fibrilação Ventricular',
        'rhythm.vf.description': 'Ondas caóticas sem QRS definido',
        'rhythm.vt': 'TV sem Pulso',
        'rhythm.vt.description': 'QRS alargado rápido, sem pulso',
        'rhythm.pea': 'Atividade Elétrica sem Pulso',
        'rhythm.pea.description': 'Ritmo organizado, pulso ausente',
        'rhythm.asystole': 'Linha Isoelétrica',
        'rhythm.asystole.description': 'Ausência completa de atividade',
        'rhythm.back': 'Voltar ao Atendimento',

        // Choque
        'shock.title': 'DESFIBRILAÇÃO',
        'shock.detected': 'Ritmo detectado:',
        'shock.required': '⚡ Choque necessário imediatamente',
        'shock.recommended': 'ENERGIA RECOMENDADA',
        'shock.joules': 'Joules',
        'shock.select': 'Selecione a Energia',
        'shock.custom': 'Energia Personalizada (opcional)',
        'shock.apply': 'APLICAR CHOQUE E RETOMAR RCP',
        'shock.apply.subtitle': 'Pressione após afastamento seguro',
        'shock.protocol': '* Padrão adulto bifásico conforme AHA 2025',
        'shock.cancel': 'Cancelar',

        // Dashboard
        'dashboard.title': 'Painel de Performance',
        'dashboard.description': 'Acompanhe suas estatísticas e evolução profissional.',
        'dashboard.totalPCR': 'Paradas Cardiorrespiratórias',
        'dashboard.successRate': 'Taxa de Sucesso (RCE)',
        'dashboard.avgTimeToShock': 'Tempo até 1º Choque',
        'dashboard.protocolAdherence': 'Adesão ao Protocolo',
        'dashboard.viewHistory': 'Histórico Completo',
        'dashboard.upgrade': 'Upgrade para PRO',

        // Autenticação
        'auth.login': 'Login',
        'auth.register': 'Cadastro',
        'auth.email': 'E-mail',
        'auth.password': 'Senha',
        'auth.name': 'Nome Completo',
        'auth.profession': 'Profissão/Especialidade',
        'auth.logout': 'SAIR (LOGOUT)',

        // Comum
        'common.save': 'SALVAR',
        'common.cancel': 'Cancelar',
        'common.close': 'Fechar',
        'common.back': 'Voltar',
        'common.loading': 'Carregando...',
        'common.error': 'Erro',
        'common.success': 'Sucesso',
    },

    'en-US': {
        // Navigation
        'nav.home': 'Home',
        'nav.pcr': 'CPR',
        'nav.dashboard': 'Dashboard',

        // Home
        'home.greeting': 'Hello, Healthcare Professional!',
        'home.description': 'Select a tool or start a new care.',
        'home.startPCR': 'START CPR NOW',
        'home.startPCR.description': 'Complete cardiopulmonary arrest care record.',
        'home.protocols': 'ACLS Protocols',
        'home.studies': 'Study Guides',
        'home.quiz': 'Quiz Simulation',
        'home.glasgow': 'Glasgow Scale',

        // CPR
        'pcr.timer': 'Total Time',
        'pcr.cycle': 'Cycle',
        'pcr.compressions': 'CHEST COMPRESSIONS',
        'pcr.compressions.info': '30:2 Cycle • 100-120 bpm',
        'pcr.checkRhythm': 'CHECK RHYTHM',
        'pcr.metronome': 'METRONOME',
        'pcr.drug': 'Drug',
        'pcr.vitals': 'Vital Signs',
        'pcr.notes': 'Notes',
        'pcr.causes': '5H\'s & 5T\'s',
        'pcr.rosc': 'ROSC ACHIEVED (PULSE +)',
        'pcr.timeline': 'Timeline',
        'pcr.finish': 'FINISH CARE',

        // Rhythms
        'rhythm.title': 'What is the Current Cardiac Rhythm?',
        'rhythm.subtitle': 'Correct identification defines the approach: Immediate shock or CPR + Medication',
        'rhythm.shockable': 'Shockable Rhythms',
        'rhythm.nonShockable': 'Non-Shockable Rhythms',
        'rhythm.vf': 'Ventricular Fibrillation',
        'rhythm.vf.description': 'Chaotic waves without defined QRS',
        'rhythm.vt': 'Pulseless VT',
        'rhythm.vt.description': 'Rapid wide QRS, no pulse',
        'rhythm.pea': 'Pulseless Electrical Activity',
        'rhythm.pea.description': 'Organized rhythm, absent pulse',
        'rhythm.asystole': 'Isoelectric Line',
        'rhythm.asystole.description': 'Complete absence of activity',
        'rhythm.back': 'Back to Care',

        // Shock
        'shock.title': 'DEFIBRILLATION',
        'shock.detected': 'Rhythm detected:',
        'shock.required': '⚡ Shock needed immediately',
        'shock.recommended': 'RECOMMENDED ENERGY',
        'shock.joules': 'Joules',
        'shock.select': 'Select Energy',
        'shock.custom': 'Custom Energy (optional)',
        'shock.apply': 'APPLY SHOCK AND RESUME CPR',
        'shock.apply.subtitle': 'Press after safe clearance',
        'shock.protocol': '* Adult biphasic standard per AHA 2025',
        'shock.cancel': 'Cancel',

        // Dashboard
        'dashboard.title': 'Performance Dashboard',
        'dashboard.description': 'Track your statistics and professional evolution.',
        'dashboard.totalPCR': 'Cardiopulmonary Arrests',
        'dashboard.successRate': 'Success Rate (ROSC)',
        'dashboard.avgTimeToShock': 'Time to 1st Shock',
        'dashboard.protocolAdherence': 'Protocol Adherence',
        'dashboard.viewHistory': 'Full History',
        'dashboard.upgrade': 'Upgrade to PRO',

        // Authentication
        'auth.login': 'Login',
        'auth.register': 'Register',
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.name': 'Full Name',
        'auth.profession': 'Profession/Specialty',
        'auth.logout': 'LOGOUT',

        // Common
        'common.save': 'SAVE',
        'common.cancel': 'Cancel',
        'common.close': 'Close',
        'common.back': 'Back',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.success': 'Success',
    },

    'es-ES': {
        // Navegación
        'nav.home': 'Inicio',
        'nav.pcr': 'PCR',
        'nav.dashboard': 'Panel',

        // Inicio
        'home.greeting': '¡Hola, Profesional de Salud!',
        'home.description': 'Seleccione una herramienta o inicie una nueva atención.',
        'home.startPCR': 'INICIAR PCR AHORA',
        'home.startPCR.description': 'Registro completo de atención de paro cardiorrespiratorio.',
        'home.protocols': 'Protocolos ACLS',
        'home.studies': 'Guías de Estudio',
        'home.quiz': 'Simulación de Quiz',
        'home.glasgow': 'Escala de Glasgow',

        // PCR
        'pcr.timer': 'Tiempo Total',
        'pcr.cycle': 'Ciclo',
        'pcr.compressions': 'COMPRESIONES TORÁCICAS',
        'pcr.compressions.info': 'Ciclo 30:2 • 100-120 lpm',
        'pcr.checkRhythm': 'VERIFICAR RITMO',
        'pcr.metronome': 'METRÓNOMO',
        'pcr.drug': 'Droga',
        'pcr.vitals': 'Signos Vitales',
        'pcr.notes': 'Anotar',
        'pcr.causes': '5H\'s y 5T\'s',
        'pcr.rosc': 'RCE LOGRADO (PULSO +)',
        'pcr.timeline': 'Línea de Tiempo',
        'pcr.finish': 'FINALIZAR ATENCIÓN',

        // Ritmos
        'rhythm.title': '¿Cuál es el Ritmo Cardíaco Actual?',
        'rhythm.subtitle': 'La identificación correcta define la conducta: Choque inmediato o RCP + Medicación',
        'rhythm.shockable': 'Ritmos Desfibrilables',
        'rhythm.nonShockable': 'Ritmos No Desfibrilables',
        'rhythm.vf': 'Fibrilación Ventricular',
        'rhythm.vf.description': 'Ondas caóticas sin QRS definido',
        'rhythm.vt': 'TV sin Pulso',
        'rhythm.vt.description': 'QRS ancho rápido, sin pulso',
        'rhythm.pea': 'Actividad Eléctrica sin Pulso',
        'rhythm.pea.description': 'Ritmo organizado, pulso ausente',
        'rhythm.asystole': 'Línea Isoeléctrica',
        'rhythm.asystole.description': 'Ausencia completa de actividad',
        'rhythm.back': 'Volver a la Atención',

        // Choque
        'shock.title': 'DESFIBRILACIÓN',
        'shock.detected': 'Ritmo detectado:',
        'shock.required': '⚡ Choque necesario inmediatamente',
        'shock.recommended': 'ENERGÍA RECOMENDADA',
        'shock.joules': 'Julios',
        'shock.select': 'Seleccione la Energía',
        'shock.custom': 'Energía Personalizada (opcional)',
        'shock.apply': 'APLICAR CHOQUE Y REANUDAR RCP',
        'shock.apply.subtitle': 'Presione después del alejamiento seguro',
        'shock.protocol': '* Estándar adulto bifásico según AHA 2025',
        'shock.cancel': 'Cancelar',

        // Dashboard
        'dashboard.title': 'Panel de Rendimiento',
        'dashboard.description': 'Siga sus estadísticas y evolución profesional.',
        'dashboard.totalPCR': 'Paros Cardiorrespiratorios',
        'dashboard.successRate': 'Tasa de Éxito (RCE)',
        'dashboard.avgTimeToShock': 'Tiempo hasta 1º Choque',
        'dashboard.protocolAdherence': 'Adhesión al Protocolo',
        'dashboard.viewHistory': 'Historial Completo',
        'dashboard.upgrade': 'Actualizar a PRO',

        // Autenticación
        'auth.login': 'Iniciar sesión',
        'auth.register': 'Registro',
        'auth.email': 'Correo electrónico',
        'auth.password': 'Contraseña',
        'auth.name': 'Nombre Completo',
        'auth.profession': 'Profesión/Especialidad',
        'auth.logout': 'CERRAR SESIÓN',

        // Común
        'common.save': 'GUARDAR',
        'common.cancel': 'Cancelar',
        'common.close': 'Cerrar',
        'common.back': 'Volver',
        'common.loading': 'Cargando...',
        'common.error': 'Error',
        'common.success': 'Éxito',
    }
};

export default translations;
