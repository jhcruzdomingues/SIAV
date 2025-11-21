// =============================================
// CONFIGURAÇÃO DO PURGECSS
// =============================================
// Remove CSS não utilizado para otimizar tamanho

module.exports = {
  content: [
    './index.html',
    './script.js',
    './settings-integration.js',
    './mercadopago-integration.js',
    './plans-modal-optimized.js',
    './pages/**/*.html',
    './plans-modal.html',
    './src/**/*.js'
  ],

  css: [
    './style.css',
    './shock-styles.css',
    './sound-settings-styles.css',
    './settings-menu-styles.css',
    './plans-modal.css'
  ],

  // Classes que devem ser mantidas mesmo se não aparecerem no HTML
  safelist: {
    standard: [
      // Classes dinâmicas adicionadas via JavaScript
      'show',
      'active',
      'hidden',
      'disabled',
      'error',
      'success',
      'warning',
      'modal-open',

      // Estados de formulário
      'invalid',
      'valid',
      'touched',
      'pristine',

      // Animações
      'fade-in',
      'fade-out',
      'slide-in',
      'slide-out',

      // Estados do timer
      'running',
      'paused',
      'stopped',

      // Estados do quiz
      'correct',
      'incorrect',
      'selected',

      // Temas
      'dark-mode',
      'light-mode',
      'auto-mode',

      // Loading states
      'loading',
      'skeleton',

      // Planos
      'plan-free',
      'plan-student',
      'plan-professional',
      'best-value',
      'popular',

      // Notificações
      'notification',
      'toast',
      'alert'
    ],

    // Manter todas as classes que começam com esses prefixos
    greedy: [
      /^fa-/,        // FontAwesome icons
      /^fas-/,       // FontAwesome solid
      /^far-/,       // FontAwesome regular
      /^fab-/,       // FontAwesome brands
      /^pcr-/,       // Classes relacionadas a PCR
      /^quiz-/,      // Classes relacionadas a quiz
      /^modal-/,     // Classes de modais
      /^btn-/,       // Classes de botões
      /^protocol-/,  // Classes de protocolos
      /^drug-/,      // Classes de medicamentos
      /^shock-/,     // Classes de choque
      /^timeline-/,  // Classes de timeline
      /^hint-/,      // Classes de dicas
      /^cycle-/,     // Classes de ciclos
      /^theme-/      // Classes de tema
    ]
  },

  // Opções de otimização
  defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],

  // Não remover comentários importantes
  fontFace: true,
  keyframes: true,
  variables: true
};
