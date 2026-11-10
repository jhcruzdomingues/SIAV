import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const SOUND_ASSETS = [
  'sounds/library/alerts/alert-1.mp3', 'sounds/library/alerts/alert-2.mp3',
  'sounds/library/alerts/alert-3.mp3', 'sounds/library/alerts/alert-4.mp3',
  'sounds/library/alerts/alert-5.mp3', 'sounds/library/drugs/drug-1.mp3',
  'sounds/library/drugs/drug-2.mp3', 'sounds/library/drugs/drug-3.mp3',
  'sounds/library/metronome/metronome-1.mp3', 'sounds/library/metronome/metronome-2.wav',
  'sounds/library/metronome/metronome-3.wav', 'sounds/library/metronome/metronome-4.mp3',
  'sounds/library/shocks/shock-1.mp3', 'sounds/library/shocks/shock-2.mp3',
  'sounds/library/shocks/shock-3.mp3'
];

// Only public runtime files belong here. Never copy the repository root or source tree.
export const STATIC_ASSETS = [
  'mercadopago-config.js', 'mercadopago-integration.js',
  'plans-modal-optimized-v5.js', 'toggle-fix.js',
  'data/quiz-fallback.json', 'manifest.json', 'icon-192.png', 'icon-512.png',
  ...SOUND_ASSETS
].map(path => ({ source: path, fileName: path }));

// Both URLs are existing contracts: sources live under pages/; checkout declares root URLs.
for (const page of ['pagamento-sucesso.html', 'pagamento-falha.html', 'pagamento-pendente.html']) {
  STATIC_ASSETS.push({ source: `pages/${page}`, fileName: `pages/${page}` });
  STATIC_ASSETS.push({ source: `pages/${page}`, fileName: page });
}

export function distributionAssets() {
  return {
    name: 'siav-explicit-distribution-assets',
    apply: 'build',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const read = path => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)));
        const publicFiles = STATIC_ASSETS.map(asset => ({ ...asset, content: read(asset.source) }));
        const workerSource = read('service-worker.js');
        const digest = createHash('sha256').update(workerSource);
        for (const [name, entry] of Object.entries(bundle).sort(([a], [b]) => a.localeCompare(b))) {
          digest.update(name).update(entry.type === 'chunk' ? entry.code : entry.source);
        }
        for (const asset of publicFiles) {
          digest.update(asset.fileName).update(asset.content);
          this.emitFile({ type: 'asset', fileName: asset.fileName, source: asset.content });
        }
        // Cache only this build's public application files. Payment returns remain network-only.
        const assets = [...new Set([
          ...Object.keys(bundle),
          ...publicFiles.filter(asset => !asset.fileName.endsWith('.html')).map(asset => asset.fileName)
        ])].filter(path => !path.endsWith('.html') || path === 'index.html')
          .sort().map(path => `/${path}`);
        const config = { version: digest.digest('hex').slice(0, 16), assets };
        this.emitFile({
          type: 'asset', fileName: 'service-worker.js',
          source: `self.__SIAV_STATIC_CONFIG__ = ${JSON.stringify(config)};\n${workerSource}`
        });
      }
    }
  };
}
