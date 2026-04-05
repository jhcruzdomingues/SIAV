import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { showToast, clearToasts } from '../src/ui/toast.js';

beforeEach(() => {
  // limpeza
  clearToasts();
});

afterEach(() => {
  clearToasts();
});

describe('Toast UI', () => {
  it('should create a toast element when showToast is called', () => {
    showToast('Teste de toast', { type: 'info', timeout: 200 });

    const container = document.getElementById('toast-container');
    expect(container).toBeTruthy();
    const toasts = container.querySelectorAll('.toast');
    expect(toasts.length).toBeGreaterThan(0);
    // O toast inclui ícone e botão, então verifica se contém a mensagem
    expect(toasts[0].textContent).toContain('Teste de toast');
  });
});