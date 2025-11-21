// src/workers/pcr-worker.js
// Web Worker para controle robusto do timer de PCR

let intervalId = null;
let elapsed = 0;

function startTimer() {
    if (intervalId) return; // já rodando
    intervalId = setInterval(() => {
        elapsed++;
        postMessage({ type: 'tick', elapsed });
    }, 1000);
}

function stopTimer() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

function resetTimer() {
    stopTimer();
    elapsed = 0;
    postMessage({ type: 'reset' });
}

onmessage = function (e) {
    const { data } = e;
    switch (data && data.type) {
        case 'start':
            if (typeof data.elapsed === 'number') elapsed = data.elapsed;
            startTimer();
            break;
        case 'stop':
            stopTimer();
            break;
        case 'reset':
            resetTimer();
            break;
        default:
            // ignorar
    }
};

// Reinicialização robusta
self.addEventListener('error', () => {
    stopTimer();
    elapsed = 0;
});
