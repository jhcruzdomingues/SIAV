import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { QuizEngine } from '../engine.js';
import { AdvancedSimulator } from '../simulator.js';

const html = readFileSync('index.html', 'utf8');
const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const localPath = value => resolve(decodeURIComponent(new URL(value, 'http://localhost/').pathname).slice(1));

beforeEach(() => {
    document.body.innerHTML = body;
    vi.useFakeTimers();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    // These tests never contact authentication, payment or database services.
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected network request'); }));
});
afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    for (const key of ['openModal', 'simulatorInstance', 'SIAV', 'openPlansModal', 'closePlansModal', 'toggleBillingPeriod', 'selectPlan', 'showUpgradeModal', 'initMercadoPagoCheckout']) delete window[key];
});

describe('Pontos de entrada indiretos preservados na limpeza', () => {
    it('mantém scripts e folhas locais da entrada HTML disponíveis', () => {
        const entry = new DOMParser().parseFromString(html, 'text/html');
        const nodes = [...entry.querySelectorAll('script[src], link[rel="stylesheet"][href], link[rel="modulepreload"][href]')];
        const paths = nodes.map(node => node.getAttribute('src') || node.getAttribute('href')).filter(value => !/^https?:/.test(value));
        expect(paths.length).toBeGreaterThan(10);
        for (const path of paths) expect(existsSync(localPath(path)), path).toBe(true);
    });

    it('mantém todos os sons selecionáveis, inclusive nomes com conteúdo duplicado', () => {
        const paths = [...document.querySelectorAll('#sound-settings-modal select option[value]')]
            .map(option => option.value).filter(value => value.startsWith('sounds/'));
        expect(paths).toHaveLength(15);
        for (const path of paths) expect(existsSync(localPath(path)), path).toBe(true);
    });
});

describe('Recursos educacionais carregados dinamicamente', () => {
    it('executa quiz com JSON offline, avalia resposta e preserva dados assistenciais sintéticos', async () => {
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
        const fallback = JSON.parse(readFileSync('data/quiz-fallback.json', 'utf8'));
        fetch.mockResolvedValue({ ok: true, json: async () => fallback });
        document.getElementById('difficulty').value = 'todos';
        const clinical = { patient: { name: 'SINTETICO' }, notes: [{ text: 'NOTA SINTETICA' }], medications: [], events: [] };
        const state = { ...structuredClone(clinical), quiz: {}, quizResults: [] };
        const backend = { from: vi.fn(() => { throw new Error('Unexpected database access'); }) };
        const saveState = vi.fn();
        window.openModal = vi.fn();
        const quiz = new QuizEngine({ state, supabase: backend, checkAccess: () => true, closeModal: vi.fn(), saveState, updateDashboard: vi.fn() });
        await quiz.startQuiz();
        expect(fetch).toHaveBeenCalledOnce();
        expect(fetch).toHaveBeenCalledWith('data/quiz-fallback.json');
        expect(backend.from).not.toHaveBeenCalled();
        expect(state.quiz.config.offline).toBe(true);
        expect(state.quiz.questions.length).toBeGreaterThan(0);
        const correct = state.quiz.questions[0].answer;
        const button = [...document.querySelectorAll('.quiz-option-btn')].find(button => button.textContent === correct);
        expect(button).toBeDefined();
        button.click();
        expect(state.quiz.score).toBe(1);
        expect(button.classList.contains('correct')).toBe(true);
        quiz.finishQuiz();
        expect(state.quizResults).toHaveLength(1);
        expect(saveState).toHaveBeenCalledOnce();
        for (const key of Object.keys(clinical)) expect(state[key]).toEqual(clinical[key]);
    });

    it('executa ramo de simulação e salva somente pelo mock de simulação', async () => {
        const clinical = { notes: [{ text: 'ASSISTENCIA SINTETICA' }], medications: [], events: [], currentUser: { plan: 'free' } };
        const state = structuredClone(clinical);
        const saveSimulationLog = vi.fn().mockResolvedValue({ success: true, id: 'synthetic-simulation' });
        window.SIAV = { saveSimulationLog };
        const simulator = new AdvancedSimulator({ state, checkAndIncrementSimulationUse: vi.fn().mockResolvedValue({ allowed: true }), showToastNotification: vi.fn(), openPlansModal: vi.fn() });
        const step = (id, next) => ({ step_id: id, title: `ETAPA SINTETICA ${id}`, message: 'Caso fictício para teste', monitor: { fc: 80, pa: '120/80', spo2: 98, ritmo: 'Sinusal' }, options: [{ id: 'a', text: 'OPCAO SINTETICA', correct: true, points: 10, feedback: 'FEEDBACK SINTETICO', next_step: next }] });
        await simulator.start({ id: 'synthetic-case', title: 'CASO SINTETICO', difficulty: 'facil', game_flow: [step(1, 2), step(2, null)] });
        expect(window.simulatorInstance).toBe(simulator);
        simulator.handleOptionClick('a', 0);
        await vi.advanceTimersByTimeAsync(3500);
        expect(simulator.simulationState.currentStepIndex).toBe(1);
        simulator.handleOptionClick('a', 1);
        await vi.advanceTimersByTimeAsync(3500);
        expect(saveSimulationLog).toHaveBeenCalledOnce();
        expect(saveSimulationLog.mock.calls[0][0]).toMatchObject({ case_id: 'synthetic-case', total_score: 20, completed: true });
        expect(state).toEqual(clinical);
        expect(fetch).not.toHaveBeenCalled();
        simulator.closeSimulation();
        expect(document.getElementById('simulation-game-modal')).toBeNull();
    });
});

describe('Páginas de planos com integração isolada', () => {
    it.each([['index.html', 'plans-modal-optimized-v5.js'], ['test-plans-modal.html', 'plans-modal-optimized.js']])('preserva globais e cancelamento em %s sem iniciar checkout', (page, script) => {
        const pageHTML = readFileSync(page, 'utf8');
        expect(pageHTML).toContain(`src="${script}"`);
        document.body.innerHTML = new DOMParser().parseFromString(pageHTML, 'text/html').body.innerHTML;
        const listener = vi.spyOn(document, 'addEventListener').mockImplementation(() => {});
        const invoke = vi.fn();
        window.SIAV = { supabase: { functions: { invoke } } };
        new Function('window', 'document', readFileSync(script, 'utf8'))(window, document);
        listener.mockRestore();
        expect(window.openPlansModal).toBeTypeOf('function');
        expect(window.toggleBillingPeriod).toBeTypeOf('function');
        window.openPlansModal();
        expect(document.getElementById('plans-modal').classList.contains('show')).toBe(true);
        window.selectPlan('estudante');
        expect(window.confirm).toHaveBeenCalledOnce();
        expect(invoke).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
        expect(document.getElementById('checkout-loading-modal')).toBeNull();
        window.closePlansModal();
        expect(document.getElementById('plans-modal').classList.contains('show')).toBe(false);
    });
});
