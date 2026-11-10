let scheduled = false;

/** Register once, including when asynchronous initialization finishes after window.load. */
export function registerServiceWorker() {
    if (scheduled || !('serviceWorker' in navigator)) return;
    scheduled = true;
    const register = () => navigator.serviceWorker.register('/service-worker.js')
        .then(registration => console.log('Service Worker registrado:', registration.scope))
        .catch(error => console.warn('Falha ao registrar Service Worker:', error));
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
}
