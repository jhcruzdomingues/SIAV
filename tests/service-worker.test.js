import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect, vi } from 'vitest';

const source = readFileSync('service-worker.js', 'utf8');
const origin = 'http://localhost';
const assets = ['/index.html', '/data/quiz-fallback.json', '/sounds/library/alerts/alert-1.mp3'];
class RequestStub {
    constructor(url, options = {}) {
        this.url = String(url); this.method = options.method || 'GET';
        this.credentials = options.credentials; this.cache = options.cache;
        const headers = new Map(Object.entries(options.headers || {}).map(([key, value]) => [key.toLowerCase(), value]));
        this.headers = { has: key => headers.has(key.toLowerCase()) };
    }
}
function worker(response = {}) {
    const handlers = {};
    const entries = new Map();
    const cache = { put: vi.fn(async (key, value) => entries.set(key, value)), match: vi.fn(async key => entries.get(key)) };
    const caches = { open: vi.fn(async () => cache), keys: vi.fn(async () => ['siav-v13', 'other-app', 'siav-static-old', 'siav-static-test']), delete: vi.fn(async () => true) };
    const fetch = vi.fn(async () => ({ ok: true, type: 'basic', headers: { get: () => null }, ...response }));
    const self = { __SIAV_STATIC_CONFIG__: { version: 'test', assets }, location: { origin }, clients: { claim: vi.fn() }, skipWaiting: vi.fn(), addEventListener: (name, handler) => { handlers[name] = handler; } };
    runInNewContext(source, { self, caches, fetch, URL, Request: RequestStub });
    const lifecycle = name => { let completion; handlers[name]({ waitUntil: promise => { completion = promise; } }); return completion; };
    return { handlers, lifecycle, entries, cache, caches, fetch, self };
}

describe('Cache público e restrito do Service Worker', () => {
    it('instala somente assets declarados com credenciais omitidas, sem forçar troca durante atendimento', async () => {
        const w = worker();
        await w.lifecycle('install');
        expect([...w.entries.keys()]).toEqual(assets);
        for (const [request] of w.fetch.mock.calls) {
            expect(request.credentials).toBe('omit');
            expect(request.cache).toBe('no-store');
            expect(new URL(request.url).origin).toBe(origin);
        }
        expect(w.self.skipWaiting).not.toHaveBeenCalled();
    });
    it.each([
        { ok: false }, { type: 'opaque' }, { redirected: true },
        { headers: { get: header => header === 'Cache-Control' ? 'private, max-age=60' : null } },
        { headers: { get: header => header === 'Cache-Control' ? 'no-store' : null } },
        { headers: { get: header => header === 'Vary' ? 'Cookie, Authorization' : null } }
    ])('rejeita recurso ausente ou resposta não pública: %o', async response => {
        const w = worker(response);
        await expect(w.lifecycle('install')).rejects.toThrow('Recurso estático indisponível ou não público');
        expect(w.cache.put).not.toHaveBeenCalled();
    });
    it.each([
        ['https://example.supabase.co/rest/v1/pcr_logs'],
        ['https://cdn.example/sdk.js'],
        [`${origin}/api/patients`],
        [`${origin}/index.html?status=success`],
        [`${origin}/pagamento-sucesso.html`],
        [`${origin}/index.html`, { method: 'POST' }],
        [`${origin}/index.html`, { headers: { Authorization: 'Bearer SYNTHETIC_TOKEN' } }]
    ])('não intercepta ou grava requisição privada/fora da lista: %s', (url, options) => {
        const w = worker(); const respondWith = vi.fn();
        w.handlers.fetch({ request: new RequestStub(url, options), respondWith });
        expect(respondWith).not.toHaveBeenCalled();
        expect(w.caches.open).not.toHaveBeenCalled();
        expect(w.cache.put).not.toHaveBeenCalled();
        expect(w.fetch).not.toHaveBeenCalled();
    });
    it('offline usa apenas o cache público da versão atual e trata / como /index.html', async () => {
        const w = worker(); const response = { synthetic: 'public shell' };
        w.entries.set('/index.html', response);
        let result;
        w.handlers.fetch({ request: new RequestStub(origin + '/'), respondWith: promise => { result = promise; } });
        expect(await result).toBe(response);
        expect(w.caches.open).toHaveBeenCalledWith('siav-static-test');
        expect(w.fetch).not.toHaveBeenCalled();
        expect(w.cache.put).not.toHaveBeenCalled();
    });
    it('não grava respostas obtidas da rede em caso de cache miss', async () => {
        const w = worker(); let result;
        w.handlers.fetch({ request: new RequestStub(origin + '/index.html'), respondWith: promise => { result = promise; } });
        await result;
        expect(w.fetch).toHaveBeenCalledOnce();
        expect(w.cache.put).not.toHaveBeenCalled();
    });
    it('limpa apenas versões estáticas anteriores, preservando caches legados e de outros aplicativos', async () => {
        const w = worker();
        await w.lifecycle('activate');
        expect(w.caches.delete.mock.calls).toEqual([['siav-static-old']]);
        expect(w.self.clients.claim).toHaveBeenCalledOnce();
    });
});
