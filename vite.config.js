import { defineConfig } from 'vite';
import { distributionAssets } from './scripts/distribution-assets.mjs';

export default defineConfig({
  publicDir: false,
  plugins: [distributionAssets()],
  build: {
    outDir: 'dist',
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
