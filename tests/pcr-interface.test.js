import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
vi.mock('../src/config/supabase.js', () => ({ supabase: {} }));
import { state, intervals } from '../src/config/state.js';
import { initAudio, startMetronome, stopMetronome, adjustBPM } from '../src/ui/audio.js';
import { pulseMetronomeBeat } from '../src/ui/metronome-feedback.js';

const html = readFileSync('index.html', 'utf8');
let oscillators, animations;
beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
    state.bpm = 110; state.metronomeActive = false;
    oscillators = []; animations = [];
    const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
    class AudioContext {
        state = 'running'; currentTime = 10; destination = {};
        createOscillator() { const oscillator = { frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() }; oscillators.push(oscillator); return oscillator; }
        createGain() { return gain; }
        resume() { return Promise.resolve(); }
    }
    vi.stubGlobal('AudioContext', AudioContext);
    window.matchMedia = vi.fn(() => ({ matches: false }));
    document.getElementById('metro-beat').animate = vi.fn(() => { const animation = { cancel: vi.fn() }; animations.push(animation); return animation; });
    initAudio();
});
afterEach(() => { stopMetronome(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Metrônomo: apresentação sem relógio adicional', () => {
    it('preserva agendamento sonoro, duração do tom e um único intervalo, com pulso no fim de cada batida', () => {
        const set = vi.spyOn(globalThis, 'setInterval');
        startMetronome();
        expect(set).toHaveBeenCalledWith(expect.any(Function), 60000 / 110);
        expect(vi.getTimerCount()).toBe(1);
        expect(oscillators).toHaveLength(1);
        expect(oscillators[0].start).toHaveBeenCalledWith(10);
        expect(oscillators[0].stop).toHaveBeenCalledWith(10.03);
        expect(animations).toHaveLength(0);
        oscillators[0].onended();
        expect(animations).toHaveLength(1);
        vi.advanceTimersByTime(600);
        expect(oscillators).toHaveLength(2);
        oscillators[1].onended();
        expect(animations).toHaveLength(2);
        expect(animations[0].cancel).toHaveBeenCalledOnce();
        expect(vi.getTimerCount()).toBe(1);
    });
    it('atualiza limites e controles de 100 a 120 BPM sem duplicar o intervalo ativo', () => {
        const set = vi.spyOn(globalThis, 'setInterval');
        startMetronome();
        adjustBPM(-100);
        expect(state.bpm).toBe(100);
        expect(document.getElementById('bpm-minus').disabled).toBe(true);
        expect(document.getElementById('bpm-plus').disabled).toBe(false);
        expect(set).toHaveBeenLastCalledWith(expect.any(Function), 600);
        expect(vi.getTimerCount()).toBe(1);
        adjustBPM(100);
        expect(state.bpm).toBe(120);
        expect(document.getElementById('bpm-value').textContent).toBe('120 BPM');
        expect(document.getElementById('bpm-plus').disabled).toBe(true);
        expect(document.getElementById('bpm-minus').disabled).toBe(false);
        expect(set).toHaveBeenLastCalledWith(expect.any(Function), 500);
        expect(vi.getTimerCount()).toBe(1);
        expect(oscillators).toHaveLength(1); // BPM change does not insert an extra sound.
    });
    it('informa estado pressionado e cancela pulso ao parar, inclusive batida concluída depois da parada', () => {
        startMetronome(); oscillators[0].onended();
        expect(document.getElementById('metro-btn').getAttribute('aria-pressed')).toBe('true');
        stopMetronome();
        expect(animations[0].cancel).toHaveBeenCalledOnce();
        oscillators[0].onended();
        expect(animations).toHaveLength(1);
        expect(intervals.metronome).toBeNull();
        expect(vi.getTimerCount()).toBe(0);
        expect(document.getElementById('metro-btn').getAttribute('aria-pressed')).toBe('false');
    });
    it('respeita movimento reduzido sem suprimir o áudio nem alterar sua cadência', () => {
        window.matchMedia = vi.fn(() => ({ matches: true }));
        startMetronome(); oscillators[0].onended(); vi.advanceTimersByTime(600); oscillators[1].onended();
        expect(oscillators).toHaveLength(2);
        expect(animations).toHaveLength(0);
        expect(vi.getTimerCount()).toBe(1);
    });
    it('não depende de Web Animations para tocar ou liberar os recursos de áudio', () => {
        document.getElementById('metro-beat').animate = undefined;
        startMetronome();
        expect(() => oscillators[0].onended()).not.toThrow();
        expect(oscillators[0].disconnect).toHaveBeenCalledOnce();
        expect(vi.getTimerCount()).toBe(1);
    });
    it('isola erro da animação e não muda registros/tempos assistenciais', () => {
        const before = { seconds: state.pcrSeconds, notes: state.notes, medications: state.medications, timing: state.resuscitationTiming };
        document.getElementById('metro-beat').animate = () => { throw new Error('SYNTHETIC visual error'); };
        startMetronome();
        expect(() => oscillators[0].onended()).not.toThrow();
        expect(oscillators[0].disconnect).toHaveBeenCalledOnce();
        expect({ seconds: state.pcrSeconds, notes: state.notes, medications: state.medications, timing: state.resuscitationTiming }).toEqual(before);
    });
});

describe('CSS e estrutura acessível', () => {
    it('todas as folhas locais referenciadas são CSS sintaticamente válido', () => {
        const document = new DOMParser().parseFromString(html, 'text/html');
        const files = [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => link.getAttribute('href')).filter(href => !href.startsWith('http')).map(href => href.split('?')[0]);
        expect(files).toContain('pcr-interface.css');
        for (const file of files) expect(() => postcss.parse(readFileSync(file, 'utf8'), { from: file }), file).not.toThrow();
    });
    it('mantém ordem de toque, nomes dos controles e indicador puramente decorativo', () => {
        expect([...document.querySelector('.metronome-section').querySelectorAll('button')].map(button => button.id)).toEqual(['bpm-minus', 'metro-btn', 'bpm-plus']);
        expect(document.getElementById('bpm-minus').getAttribute('aria-label')).toBe('Diminuir BPM');
        expect(document.getElementById('bpm-plus').getAttribute('aria-label')).toBe('Aumentar BPM');
        expect(document.getElementById('metro-beat').getAttribute('aria-hidden')).toBe('true');
        expect(document.getElementById('bpm-value').getAttribute('aria-live')).toBe('polite');
        expect(() => pulseMetronomeBeat()).not.toThrow();
    });
});
