import { beforeEach, afterEach, it, expect, vi } from 'vitest';

beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('registra quando load já ocorreu, mesmo com inicialização assíncrona', async () => {
    const register = vi.fn().mockResolvedValue({ scope: '/' });
    vi.stubGlobal('navigator', { serviceWorker: { register } });
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
    const { registerServiceWorker } = await import('../src/pwa/register.js');
    registerServiceWorker(); registerServiceWorker();
    expect(register).toHaveBeenCalledOnce();
    expect(register).toHaveBeenCalledWith('/service-worker.js');
});
it('aguarda load uma vez e não depende de autenticação ou rede de sessão', async () => {
    const register = vi.fn().mockResolvedValue({ scope: '/' });
    vi.stubGlobal('navigator', { serviceWorker: { register } });
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('interactive');
    const { registerServiceWorker } = await import('../src/pwa/register.js');
    registerServiceWorker(); registerServiceWorker();
    expect(register).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('load')); window.dispatchEvent(new Event('load'));
    expect(register).toHaveBeenCalledOnce();
});
it('trata falha de registro sem rejeição não tratada ou recarregar a página', async () => {
    const error = new Error('SYNTHETIC registration failure');
    vi.stubGlobal('navigator', { serviceWorker: { register: vi.fn().mockRejectedValue(error) } });
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { registerServiceWorker } = await import('../src/pwa/register.js');
    registerServiceWorker();
    await Promise.resolve(); await Promise.resolve();
    expect(warn).toHaveBeenCalledWith('Falha ao registrar Service Worker:', error);
});
it('preserva compatibilidade com navegador sem suporte a Service Worker', async () => {
    vi.stubGlobal('navigator', {});
    const { registerServiceWorker } = await import('../src/pwa/register.js');
    expect(() => registerServiceWorker()).not.toThrow();
});
