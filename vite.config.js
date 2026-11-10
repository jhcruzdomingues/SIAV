import { defineConfig, loadEnv } from 'vite';
import { distributionAssets } from './scripts/distribution-assets.mjs';
import { resolvePublicSupabaseConfig } from './src/config/public-supabase.js';

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    resolvePublicSupabaseConfig({
      url: env.VITE_SUPABASE_URL,
      publishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
      projectRef: env.VITE_SUPABASE_PROJECT_REF || undefined
    });
  }
  return {
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
  };
});
