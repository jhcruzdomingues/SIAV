// SCRIPT TEMPORÁRIO PARA FORÇAR RELOAD DOS PREÇOS
console.log('🔄 Force Reload V4.1 - Limpando cache...');

// Limpar Service Workers
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
    });
}

// Limpar cache do navegador via Cache API
if ('caches' in window) {
    caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
    });
}

// Recarregar após 1 segundo
setTimeout(() => {
    console.log('✅ Cache limpo - Recarregando...');
    window.location.href = window.location.href.split('?')[0] + '?nocache=' + Date.now();
}, 1000);
