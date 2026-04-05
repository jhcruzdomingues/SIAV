import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Diz pro Vitest que nosso ambiente simula um navegador
    environment: 'jsdom',
    globals: true,
  },
});