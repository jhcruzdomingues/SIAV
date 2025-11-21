// src/ui/toast.js
// Sistema simples de Toasts acessíveis para feedback não-bloqueante

const TOAST_CONTAINER_ID = 'toast-container';

function createContainer() {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, { type = 'info', timeout = 4000 } = {}) {
  const container = createContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.role = 'status';
  toast.setAttribute('aria-live', type === 'danger' || type === 'critical' ? 'assertive' : 'polite');
  toast.textContent = message;

  container.appendChild(toast);

  // Auto-remover após timeout
  setTimeout(() => {
    toast.classList.add('toast-hidden');
    setTimeout(() => toast.remove(), 300);
  }, timeout);
}

export function clearToasts() {
  const container = document.getElementById(TOAST_CONTAINER_ID);
  if (container) container.innerHTML = '';
}

// Export também para testes
export default { showToast, clearToasts };
