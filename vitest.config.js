/**
 * Configuração do Vitest
 * Framework de testes rápido e compatível com Vite
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom', // Simula ambiente de navegador
        setupFiles: './tests/setup.js',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'tests/',
                'build-optimized/',
                '*.config.js'
            ]
        },
        include: ['tests/**/*.test.js', 'src/**/*.test.js'],
        exclude: ['node_modules', 'build-optimized']
    }
});
