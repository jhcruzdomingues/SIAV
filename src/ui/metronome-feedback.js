let animation = null;

/** A visual echo of the completed audio beat, never a clock or a source of audio ticks. */
export function pulseMetronomeBeat() {
    const button = document.getElementById('metro-btn');
    const indicator = document.getElementById('metro-beat');
    if (button?.getAttribute('aria-pressed') !== 'true' || !indicator ||
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || typeof indicator.animate !== 'function') return;
    try {
        animation?.cancel();
        animation = indicator.animate([
            { opacity: 0.45, transform: 'scale(1)' },
            { opacity: 1, transform: 'scale(1.18)', offset: 0.25 },
            { opacity: 0.45, transform: 'scale(1)' }
        ], { duration: 150, easing: 'ease-out' });
    } catch {
        // A missing visual capability must never interrupt audio or its cleanup.
        animation = null;
    }
}

export function clearMetronomeBeat() {
    animation?.cancel();
    animation = null;
}
