import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { chromium, devices } from 'playwright';
import { STATIC_ASSETS, SOUND_ASSETS } from '../../scripts/distribution-assets.mjs';
import { serveDist } from './server.mjs';
import { checkPCRInterface, enableVisualIcons } from './pcr-interface.mjs';
import { SIAV_PROJECT_REF, SIAV_PROJECT_URL } from '../../src/config/public-supabase.js';

let root, temporaryDirectory, server, browser, workerConfig;
const buildEnvironment = { ...process.env, VITE_SUPABASE_URL: SIAV_PROJECT_URL,
  VITE_SUPABASE_PROJECT_REF: SIAV_PROJECT_REF,
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_SYNTHETIC_DISTRIBUTION_TEST' };
const bytes = async path => Buffer.from(await (await fetch(server.url + path)).arrayBuffer());
const hash = body => createHash('sha256').update(body).digest('hex');
async function filesIn(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    result.push(...entry.isDirectory() ? await filesIn(path) : [relative(root, path)]);
  }
  return result.sort();
}
async function checkResource(url) {
  if (url.origin !== server.url) return;
  const response = await fetch(url);
  assert.equal(response.status, 200, `Missing resource ${url.pathname}`);
  assert.ok(Number(response.headers.get('content-length')) > 0 || (await response.arrayBuffer()).byteLength > 0, url.pathname);
}

before(async () => {
  // Build into a disposable dist/ with synthetic public configuration; never overwrite
  // the real artifact or require a backend credential to run the regression suite.
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'siav-distribution-'));
  root = join(temporaryDirectory, 'dist');
  const build = await promisify(execFile)('npm', ['run', 'build', '--', '--outDir', root, '--emptyOutDir'], {
    cwd: process.cwd(), env: buildEnvironment, timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  console.log(build.stdout);
  // Warnings are visible; a successful build alone is not the acceptance criterion.
  if (build.stderr) console.log(build.stderr);
  const source = await readFile(resolve(root, 'service-worker.js'), 'utf8');
  workerConfig = JSON.parse(source.match(/^self\.__SIAV_STATIC_CONFIG__ = (.+);/)[1]);
  server = await serveDist(root);
  browser = await chromium.launch({ headless: true, ...(process.env.SIAV_CHROMIUM_PATH ? { executablePath: process.env.SIAV_CHROMIUM_PATH } : {}) });
}, { timeout: 150000 });
after(async () => {
  await browser?.close(); await server?.close();
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
});

test('build bloqueia chave ausente ou de servidor antes de gerar artefato', async () => {
  for (const key of ['', 'sb_secret_SYNTHETIC_DO_NOT_USE']) {
    await assert.rejects(promisify(execFile)('npm', ['run', 'build', '--', '--outDir', join(temporaryDirectory, 'invalid-dist')], {
      env: { ...buildEnvironment, VITE_SUPABASE_PUBLISHABLE_KEY: key }, timeout: 30000, maxBuffer: 1024 * 1024
    }), error => {
      assert.match(error.stderr, /chave publicável moderna/);
      if (key) assert.ok(!error.stderr.includes(key), 'Errors must never print credential values');
      return true;
    });
  }
});

test('build contém somente entradas públicas explícitas e bundles, sem recursos internos', async () => {
  const files = await filesIn(root);
  const explicit = new Set(['index.html', 'service-worker.js', ...STATIC_ASSETS.map(asset => asset.fileName)]);
  for (const file of files) {
    assert.ok(explicit.has(file) || /^assets\/(?:index|engine|simulator|profile-plan-styles|sound-settings-styles|shock-styles|plans-modal|settings-menu-styles|pcr-interface|manifest)-[\w-]+\.(?:js|css|json)$/.test(file), `Unexpected distribution file: ${file}`);
    assert.ok(!/(?:^|\/)(?:src|docs|tests|scripts|supabase|node_modules|\.git|\.github|\.env)(?:[/.]|$)|\.map$/.test(file), file);
  }
  for (const asset of STATIC_ASSETS) assert.equal(hash(await bytes('/' + asset.fileName)), hash(await readFile(asset.source)), asset.fileName);
  // Version must include the final HTML as well as every emitted bundle/static file.
  const digest = createHash('sha256').update(await readFile('service-worker.js'));
  for (const file of files.filter(file => !explicit.has(file) || file === 'index.html').sort((a, b) => a.localeCompare(b))) {
    digest.update(file).update(await readFile(resolve(root, file)));
  }
  for (const asset of STATIC_ASSETS) digest.update(asset.fileName).update(await readFile(asset.source));
  assert.equal(workerConfig.version, digest.digest('hex').slice(0, 16), 'Cache revision must cover the final HTML and resources');
  for (const path of ['/package.json', '/package-lock.json', '/.env', '/.env.preview.local', '/vercel.json', '/.vercel/project.json', '/.git/config', '/src/main.js', '/docs/CODEBASE_CLEANUP_RESULT.md', '/tests/setup.js', '/supabase/functions/mercadopago-checkout/index.ts', '/force-reload.js', '/limpar-cache.html', '/test-plans-modal.html']) {
    assert.equal((await fetch(server.url + path)).status, 404, path);
  }
  console.log(`Verified public artifact: ${files.length} files.`);
});

test('HTML, CSS, lazy chunks, manifest e precache possuem destinos locais reais', async () => {
  const files = await filesIn(root);
  for (const file of files.filter(file => file.endsWith('.html'))) {
    const page = new JSDOM(await readFile(resolve(root, file), 'utf8'), { url: server.url + '/' + file });
    const nodes = page.window.document.querySelectorAll('script[src], link[href], audio[src], source[src], img[src], a[href], option[value^="sounds/"]');
    for (const node of nodes) {
      const value = node.getAttribute('src') || node.getAttribute('href') || node.getAttribute('value');
      if (!value || value.startsWith('#')) continue;
      await checkResource(new URL(value, page.window.location.href));
    }
    page.window.close();
  }
  for (const file of files.filter(file => file.endsWith('.css') || file.startsWith('assets/') && file.endsWith('.js'))) {
    const source = await readFile(resolve(root, file), 'utf8');
    const references = file.endsWith('.css') ? [...source.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/g)] : [...source.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)];
    for (const match of references) await checkResource(new URL(match[1], server.url + '/' + file));
  }
  const manifestURL = new JSDOM(await readFile(resolve(root, 'index.html'), 'utf8'), { url: server.url }).window.document.querySelector('link[rel="manifest"]').href;
  const manifest = await (await fetch(manifestURL)).json();
  await checkResource(new URL(manifest.start_url, manifestURL));
  for (const icon of manifest.icons) {
    const url = new URL(icon.src, manifestURL); await checkResource(url);
    const png = await bytes(url.pathname); assert.equal(png.subarray(1, 4).toString(), 'PNG');
    const size = Number(icon.sizes.split('x')[0]); assert.equal(png.readUInt32BE(16), size); assert.equal(png.readUInt32BE(20), size);
  }
  assert.ok(workerConfig.assets.length > 25);
  assert.ok(workerConfig.assets.includes('/index.html'), 'Application HTML must be precached');
  assert.equal(new Set(workerConfig.assets).size, workerConfig.assets.length);
  for (const path of workerConfig.assets) {
    assert.ok(path.startsWith('/') && !path.startsWith('//') && !path.includes('?'), path);
    assert.ok(!path.includes('pagamento-'), 'Payment returns must remain network-only');
    await checkResource(new URL(path, server.url));
  }
});

test('quiz fallback e todos os áudios mantêm conteúdo e formato reais', async () => {
  const fallback = await (await fetch(server.url + '/data/quiz-fallback.json')).json();
  assert.ok(fallback.questions.length > 0);
  assert.equal(SOUND_ASSETS.length, 15);
  for (const path of SOUND_ASSETS) {
    const body = await bytes('/' + path);
    assert.equal(hash(body), hash(await readFile(path)), path);
    assert.ok(body.length > 1000, path);
    if (path.endsWith('.wav')) assert.equal(body.subarray(0, 4).toString(), 'RIFF');
    else assert.ok(body.subarray(0, 3).toString() === 'ID3' || body[0] === 0xff, path);
  }
});

// Only test SDK interfaces are replaced. Session is always null; any backend/payment call fails.
// This makes packaging/offline tests reproducible without production or CDN availability.
const sdkFactory = `function createClient(url, publishableKey) {
  (window.__SIAV_TEST_CLIENTS__ ||= []).push({ url, modernPublicKey: publishableKey.startsWith('sb_publishable_') });
  const denied = () => { throw new Error('Unexpected backend/payment call in distribution test'); };
  return { auth: { getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithPassword: denied, signUp: denied, signOut: denied }, from: denied, functions: { invoke: denied } };
}`;
async function contextFor(device) {
  const context = await browser.newContext({ ...devices[device], serviceWorkers: 'allow' });
  let offline = false;
  await context.route('https://**/*', async route => {
    if (offline) return route.abort();
    const url = new URL(route.request().url());
    if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('@supabase/supabase-js')) {
      const body = url.pathname.endsWith('/+esm') ? `${sdkFactory}\nexport { createClient };` : `${sdkFactory}\nwindow.supabase = { createClient };`;
      return route.fulfill({ contentType: 'application/javascript', body });
    }
    return route.abort();
  });
  return { context, goOffline: async () => { offline = true; await context.setOffline(true); } };
}
async function readyPage(context) {
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  await page.goto(server.url);
  // The existing HTML forces an initial reload. Wait for that navigation to finish
  // before disabling network; otherwise the test can race the page being replaced.
  await page.waitForFunction(() => performance.navigation.type === 1 && document.readyState === 'complete' &&
    window.SIAV && typeof window.openSettingsMenu === 'function');
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  return page;
}

for (const device of ['iPhone 13', 'iPhone SE']) {
  test(`Chromium ${device}: SW real, modais/temas e quiz offline sem sessão autenticada`, async () => {
    const { context, goOffline } = await contextFor(device);
    try {
      const errors = []; context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
      const page = await readyPage(context);
      const registration = await page.evaluate(async () => ({ scope: (await navigator.serviceWorker.ready).scope, script: navigator.serviceWorker.controller.scriptURL }));
      assert.equal(registration.script, server.url + '/service-worker.js');
      assert.equal(registration.scope, server.url + '/');
      assert.deepEqual(await page.evaluate(() => window.__SIAV_TEST_CLIENTS__), [{ url: SIAV_PROJECT_URL, modernPublicKey: true }]);
      assert.equal(await page.evaluate(() => window.SIAV.state.currentUser.isLoggedIn), false);
      assert.equal(await page.evaluate(() => typeof window.createMercadoPagoCheckout), 'function');
      assert.equal(await page.evaluate(() => typeof window.toggleBillingPeriod), 'function');
      await page.locator('#settings-btn').tap();
      await page.locator('[onclick="openThemeSettings()"]').tap();
      for (const theme of ['dark', 'light']) {
        await page.locator('#theme-' + theme).tap();
        assert.equal(await page.locator('body').getAttribute('data-theme'), theme);
      }
      await page.locator('#theme-settings-modal .close-btn').tap();
      await page.locator('#nav-dashboard').tap();
      await page.locator('#profile-modal').waitFor({ state: 'visible' });
      assert.equal(await page.locator('.modal.show').count(), 1);
      await page.locator('#profile-modal .close-btn').tap();
      await page.locator('#nav-home').tap();
      // Seed only disposable synthetic legacy caches; verify they are never served or deleted.
      await page.evaluate(async () => {
        await (await caches.open('siav-v13')).put('/synthetic-private', new Response('SYNTHETIC_PRIVATE_RECORD'));
        await (await caches.open('unrelated-app')).put('/synthetic-other', new Response('SYNTHETIC_OTHER'));
        await fetch('/index.html', { headers: { Authorization: 'Bearer SYNTHETIC_TOKEN' } });
        await fetch('/data/quiz-fallback.json?patient=SYNTHETIC');
        await fetch('/api/private');
      });
      await goOffline();
      const offlineAssets = await page.evaluate(async () => {
        const json = await (await fetch('/data/quiz-fallback.json')).json();
        const audio = await (await fetch('/sounds/library/alerts/alert-1.mp3')).arrayBuffer();
        let privateUnavailable = false;
        try { await fetch('/synthetic-private'); } catch { privateUnavailable = true; }
        return { questions: json.questions.length, audioBytes: audio.byteLength, privateUnavailable };
      });
      assert.ok(offlineAssets.questions > 0 && offlineAssets.audioBytes > 1000);
      assert.equal(offlineAssets.privateUnavailable, true);
      await page.locator('#quiz-config-tool').tap();
      await page.locator('#quiz-mode-questions').tap();
      await page.locator('#difficulty').selectOption('todos');
      await page.locator('#start-quiz-btn').tap();
      await page.locator('#quiz-running-modal').waitFor({ state: 'visible' });
      assert.equal(await page.evaluate(() => window.SIAV.state.quiz.config.offline), true);
      await page.locator('.quiz-option-btn').first().tap();
      assert.equal(await page.locator('#next-q-btn').isDisabled(), false);
      const keys = await page.evaluate(async () => {
        const names = await caches.keys();
        const current = names.filter(name => name.startsWith('siav-static-'));
        const paths = await Promise.all(current.map(async name => (await (await caches.open(name)).keys()).map(request => request.url)));
        return { names, paths: paths.flat() };
      });
      assert.ok(keys.names.includes('siav-v13') && keys.names.includes('unrelated-app'));
      assert.deepEqual(keys.paths.map(url => new URL(url).pathname).sort(), [...workerConfig.assets].sort());
      assert.ok(keys.paths.every(url => !/[?]|supabase|api\/private|synthetic-private|SYNTHETIC_TOKEN/.test(url)));
      assert.equal(await page.evaluate(() => window.SIAV.state.currentUser.isLoggedIn), false);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }, { timeout: 45000 });
}

for (const device of ['iPhone 13', 'iPhone SE']) {
  test(`PCR mobile ${device}: contraste, toque, BPM, movimento reduzido e telas`, async () => {
    const { context } = await contextFor(device);
    try {
      await enableVisualIcons(context);
      const page = await readyPage(context);
      await checkPCRInterface(page, device);
    } finally { await context.close(); }
  }, { timeout: 120000 });
}
