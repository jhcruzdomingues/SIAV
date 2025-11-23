// ================================================
// src/ui/toast.js - V4.0
// Sistema de Toasts acessíveis para feedback não-bloqueante
// ================================================

const TOAST_CONTAINER_ID = 'toast-container';

/**
 * Cria o container de toasts se não existir
 */
function createContainer() {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    container.className = 'toast-container';

    // Estilos inline para garantir que funciona mesmo sem CSS externo
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
      pointer-events: none;
    `;

    document.body.appendChild(container);
  }
  return container;
}

/**
 * Exibe um toast na tela
 * @param {string} message - Mensagem a exibir
 * @param {object} options - Opções do toast
 * @param {string} options.type - Tipo: 'info', 'success', 'warning', 'danger', 'critical'
 * @param {number} options.timeout - Tempo em ms antes de fechar automaticamente
 */
export function showToast(message, { type = 'info', timeout = 4000 } = {}) {
  const container = createContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.role = 'status';
  toast.setAttribute('aria-live', type === 'danger' || type === 'critical' ? 'assertive' : 'polite');

  // Definir cores e ícones baseados no tipo
  const styles = {
    info: {
      bg: '#3498db',
      icon: 'ℹ️'
    },
    success: {
      bg: '#27ae60',
      icon: '✅'
    },
    warning: {
      bg: '#f39c12',
      icon: '⚠️'
    },
    danger: {
      bg: '#e74c3c',
      icon: '🚫'
    },
    critical: {
      bg: '#c0392b',
      icon: '⛔'
    }
  };

  const style = styles[type] || styles.info;

  // Aplicar estilos inline
  toast.style.cssText = `
    background: ${style.bg};
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.4;
    pointer-events: auto;
    cursor: pointer;
    animation: slideInRight 0.3s ease-out;
    max-width: 100%;
    word-wrap: break-word;
    display: flex;
    align-items: center;
    gap: 10px;
  `;

  // Adicionar conteúdo
  toast.innerHTML = `
    <span style="font-size: 20px; flex-shrink: 0;">${style.icon}</span>
    <span style="flex: 1;">${message}</span>
    <button
      style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; padding: 0; margin-left: 10px; opacity: 0.7; flex-shrink: 0;"
      aria-label="Fechar"
      onclick="this.parentElement.remove()">
      ×
    </button>
  `;

  container.appendChild(toast);

  // Auto-remover após timeout
  if (timeout > 0) {
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
      }, 300);
    }, timeout);
  }

  // Permitir fechar clicando no toast
  toast.addEventListener('click', (e) => {
    // Não fechar se clicar no botão X (ele já tem seu próprio handler)
    if (e.target.tagName !== 'BUTTON') {
      toast.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
      }, 300);
    }
  });

  // Adicionar animações CSS se ainda não existirem
  if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @keyframes slideOutRight {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }
      .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
        pointer-events: none;
      }
      @media (max-width: 768px) {
        .toast-container {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Remove todos os toasts da tela
 */
export function clearToasts() {
  const container = document.getElementById(TOAST_CONTAINER_ID);
  if (container) {
    container.innerHTML = '';
  }
}

/**
 * Atalhos para tipos específicos de toast
 */
export const toast = {
  info: (message, timeout) => showToast(message, { type: 'info', timeout }),
  success: (message, timeout) => showToast(message, { type: 'success', timeout }),
  warning: (message, timeout) => showToast(message, { type: 'warning', timeout }),
  danger: (message, timeout) => showToast(message, { type: 'danger', timeout }),
  critical: (message, timeout) => showToast(message, { type: 'critical', timeout })
};

// Export padrão
export default { showToast, clearToasts, toast };
