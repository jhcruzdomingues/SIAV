import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
vi.mock('../src/config/supabase.js', () => ({ supabase: {} }));
import { state, resetPCRState } from '../src/config/state.js';
import { registerAllEvents } from '../src/ui/events.js';
import { showProfileModal } from '../src/ui/auth-profile.js';
import { openModal, closeModal, showScreen } from '../src/ui/dom.js';
import { showRhythmSelectorScreen } from '../src/pcr/rhythm.js';
import { startPCR, clearAllIntervals } from '../src/pcr/core.js';
import * as brain from '../src/protocols/medical.js';

const html = readFileSync('index.html', 'utf8');
const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const el = id => document.getElementById(id);
const visibleModals = () => [...document.querySelectorAll('.modal.show')].map(x => x.id);
const settle = () => vi.advanceTimersByTime(350);

beforeEach(async () => {
    vi.useFakeTimers();
    document.body.innerHTML = body;
    resetPCRState();
    state.currentUser = { isLoggedIn: false, email: null, plan: 'free' };
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn() }));
    Object.assign(window, { showProfileModal, openModal, closeModal, MedicalBrain: brain, addEvent: vi.fn() });
    await import('../settings-integration.js');
    registerAllEvents();
});
afterEach(() => {
    clearAllIntervals();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('Configurações e entrada de autenticação', () => {
    it('mantém IDs únicos e modais de autenticação fora de telas e cartões ocultáveis', () => {
        const ids = [...document.querySelectorAll('[id]')].map(x => x.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ['login-modal', 'register-modal', 'profile-modal']) {
            expect(el(id).closest('.screen, .dashboard-action-area')).toBeNull();
        }
        expect(html).toContain('type="module" src="settings-integration.js"');
    });
    it.each(['home', 'pcr', 'studies', 'protocols', 'dashboard', 'rhythm-selector', 'shock-action'])('abre a engrenagem em %s sem trocar a tela', screen => {
        showScreen(screen);
        window.openSettingsMenu(); settle();
        expect(visibleModals()).toEqual(['settings-menu-modal']);
        expect(el(`${screen}-screen`).classList.contains('active')).toBe(true);
    });
    it('abre perfil/login a partir de configurações sem deixar outro modal sobreposto', () => {
        window.openSettingsMenu(); settle();
        window.openProfileSettings(); settle();
        expect(visibleModals()).toEqual(['profile-modal']);
        expect(el('login-form-fields').style.display).toBe('block');
    });
    it('abre som, volta às configurações e abre tema', () => {
        window.openSettingsMenu(); settle();
        window.openSoundSettings(); settle();
        expect(visibleModals()).toEqual(['sound-settings-modal']);
        window.backToSettingsMenu(); settle();
        expect(visibleModals()).toEqual(['settings-menu-modal']);
        window.openThemeSettings(); settle();
        expect(visibleModals()).toEqual(['theme-settings-modal']);
    });
    it('direciona visitante do dashboard à autenticação sem oferecer plano antes do login', () => {
        const confirm = vi.spyOn(window, 'confirm');
        el('nav-dashboard').click(); settle();
        expect(visibleModals()).toEqual(['profile-modal']);
        expect(confirm).not.toHaveBeenCalled();
        expect(state.currentUser.isLoggedIn).toBe(false);
    });
    it.each([['open-login-btn', 'login-modal'], ['open-register-btn', 'register-modal']])('abre %s e não abre perfil ao interagir com o formulário', (button, modal) => {
        showScreen('dashboard');
        el(button).click(); settle();
        el(modal).querySelector('input').click(); settle();
        expect(visibleModals()).toEqual([modal]);
        el(modal).querySelector('[data-close-modal]').click(); settle();
        expect(visibleModals()).toEqual([]);
        expect(el(modal).style.display).toBe('none');
    });
    it('fecha por backdrop sem fechar ao tocar no conteúdo', () => {
        openModal('login-modal'); settle();
        el('login-modal').querySelector('input').click(); settle();
        expect(visibleModals()).toEqual(['login-modal']);
        el('login-modal').click(); settle();
        expect(visibleModals()).toEqual([]);
    });
    it('cancela abertura pendente ao fechar imediatamente e permite reabertura', () => {
        openModal('settings-menu-modal'); closeModal('settings-menu-modal'); settle();
        expect(el('settings-menu-modal').style.display).toBe('none');
        expect(visibleModals()).toEqual([]);
        openModal('settings-menu-modal'); settle();
        closeModal('settings-menu-modal'); openModal('settings-menu-modal'); settle();
        expect(visibleModals()).toEqual(['settings-menu-modal']);
        expect(el('settings-menu-modal').style.display).toBe('flex');
    });
});

describe('Confirmação explícita de ritmo', () => {
    beforeEach(() => {
        state.patient = { algorithm: 'adult', age: 45, weight: 70 };
        startPCR();
        showRhythmSelectorScreen();
    });
    it('inicia desabilitado e tocar repetidamente no cartão apenas seleciona', () => {
        const confirm = el('submit-rhythm-selection-btn');
        expect(confirm.disabled).toBe(true);
        const fv = document.querySelector('[data-rhythm="FV"]');
        fv.click(); fv.click();
        expect(state.rhythms).toHaveLength(0);
        expect(fv.classList.contains('selected')).toBe(true);
        expect(fv.getAttribute('aria-pressed')).toBe('true');
        expect(confirm.disabled).toBe(false);
        expect(confirm.textContent).toBe('CONFIRMAR: FV');
    });
    it('permite trocar a seleção, confirma uma vez e reinicia sem seleção na próxima avaliação', () => {
        const fv = document.querySelector('[data-rhythm="FV"]');
        const aesp = document.querySelector('[data-rhythm="AESP"]');
        fv.click(); aesp.click();
        expect(fv.getAttribute('aria-pressed')).toBe('false');
        expect(aesp.getAttribute('aria-pressed')).toBe('true');
        const confirm = el('submit-rhythm-selection-btn');
        expect(confirm.textContent).toBe('CONFIRMAR: AESP');
        confirm.click(); confirm.click();
        expect(state.rhythms).toHaveLength(1);
        expect(state.rhythms[0].type).toBe('AESP');
        expect(confirm.disabled).toBe(true);
        showRhythmSelectorScreen();
        expect(confirm.disabled).toBe(true);
        expect(document.querySelectorAll('.rhythm-option-btn.selected')).toHaveLength(0);
    });
    it.each(['FV', 'TVSP', 'AESP', 'Assistolia'])('mostra o ritmo %s na confirmação sem efetivar no cartão', rhythm => {
        document.querySelector(`[data-rhythm="${rhythm}"]`).click();
        expect(el('submit-rhythm-selection-btn').textContent).toBe(`CONFIRMAR: ${rhythm}`);
        expect(state.rhythms).toHaveLength(0);
    });
});
