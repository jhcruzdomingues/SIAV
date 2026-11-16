import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const html = new DOMParser().parseFromString(readFileSync('index.html', 'utf8'), 'text/html');
const panel = html.getElementById('theme-settings-modal').outerHTML;
const selected = () => [...document.querySelectorAll('.theme-option[aria-pressed="true"]')].map(x => x.id);

beforeEach(async () => {
    vi.useFakeTimers();
    document.body.innerHTML = panel;
    localStorage.clear();
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn() }));
    await import('../settings-integration.js');
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Aparência: interface compacta preserva a seleção existente', () => {
    it('oferece três botões nativos nomeados, mantendo os IDs e callbacks de tema', () => {
        const modal = document.getElementById('theme-settings-modal');
        expect(modal.getAttribute('role')).toBe('dialog');
        expect(document.getElementById(modal.getAttribute('aria-labelledby')).textContent).toBe('Aparência');
        expect(modal.querySelectorAll('.theme-option')).toHaveLength(3);
        for (const theme of ['light', 'dark', 'auto']) {
            const option = document.getElementById(`theme-${theme}`);
            expect(option.tagName).toBe('BUTTON');
            expect(option.type).toBe('button');
            expect(option.getAttribute('onclick')).toBe(`setTheme('${theme}')`);
            expect(option.querySelector('.appearance-option-name').textContent.trim()).not.toBe('');
        }
        expect(modal.querySelector('.appearance-done-btn').getAttribute('onclick')).toBe("closeModal('theme-settings-modal')");
    });
    it('sincroniza destaque, estado acessível e preferência ao trocar o tema', () => {
        window.setTheme('dark');
        expect(document.body.dataset.theme).toBe('dark');
        expect(localStorage.getItem('siav_theme')).toBe('dark');
        expect(selected()).toEqual(['theme-dark']);
        window.setTheme('light');
        expect(selected()).toEqual(['theme-light']);
        expect(document.getElementById('theme-dark').classList.contains('active')).toBe(false);
        expect(document.body.dataset.theme).toBe('light');
    });
    it('mantém auto como preferência explícita ao aplicar o tema do sistema', () => {
        window.matchMedia.mockReturnValue({ matches: true, addEventListener: vi.fn() });
        window.setTheme('auto');
        expect(localStorage.getItem('siav_theme')).toBe('auto');
        expect(document.body.dataset.theme).toBe('dark');
        expect(selected()).toEqual(['theme-auto']);
    });
    it('restaura o tema salvo ao reabrir, sem confirmação extra ou mudança de preferência', () => {
        localStorage.setItem('siav_theme', 'dark');
        window.openThemeSettings(); vi.advanceTimersByTime(350);
        expect(selected()).toEqual(['theme-dark']);
        window.closeModal('theme-settings-modal'); vi.advanceTimersByTime(350);
        window.openThemeSettings(); vi.advanceTimersByTime(350);
        expect(selected()).toEqual(['theme-dark']);
        expect(localStorage.getItem('siav_theme')).toBe('dark');
    });
});
