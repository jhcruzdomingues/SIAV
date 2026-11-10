import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const iconFiles = new Map();
export async function enableVisualIcons(context) {
  if (process.env.SIAV_VISUAL_ICONS !== '1') return;
  await context.route('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/**', async route => {
    const path = new URL(route.request().url()).pathname.split('/6.0.0-beta3/')[1];
    if (!/^(?:css\/all\.min\.css|webfonts\/[a-zA-Z0-9.-]+)$/.test(path)) return route.abort();
    if (!iconFiles.has(path)) iconFiles.set(path, execFileSync('curl', ['-fsSL', '--max-time', '20', `https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/${path}`]));
    await route.fulfill({ body: iconFiles.get(path), contentType: path.endsWith('.css') ? 'text/css' : 'font/woff2' });
  });
}

export async function checkPCRInterface(page, device) {
  const captureDirectory = process.env.SIAV_UI_SCREENSHOTS_DIR;
  if (captureDirectory) await mkdir(captureDirectory, { recursive: true });
  const capture = async (theme, area) => {
    if (captureDirectory) await page.screenshot({ path: join(captureDirectory, `${device.replaceAll(' ', '-')}-${theme}-${area}.png`), animations: 'disabled' });
  };
  const contrast = async selector => {
    const values = await page.locator(selector).evaluateAll(elements => elements.filter(e => e.getClientRects().length).map(e => {
      const style = getComputedStyle(e); let parent = e; let background = 'rgb(255, 255, 255)';
      while (parent) { const b = getComputedStyle(parent).backgroundColor; if (b !== 'rgba(0, 0, 0, 0)') { background = b; break; } parent = parent.parentElement; }
      return { text: e.textContent.trim().slice(0, 36), foreground: style.color, background,
        minimum: parseFloat(style.fontSize) >= 24 || parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700 ? 3 : 4.5 };
    }));
    const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(x => Number(x) / 255).map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4).reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
    for (const item of values) {
      const a = luminance(item.foreground); const b = luminance(item.background); const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      assert.ok(ratio >= item.minimum, `${selector} ${JSON.stringify(item)} contrast ${ratio.toFixed(2)} < ${item.minimum}`);
    }
    return values.length;
  };
  const noClip = async selector => {
    const bad = await page.locator(selector).evaluateAll(elements => elements.filter(e => e.getClientRects().length && e.clientWidth && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)).map(e => ({ text: e.textContent.trim().slice(0, 32), width: e.clientWidth, scrollWidth: e.scrollWidth, height: e.clientHeight, scrollHeight: e.scrollHeight })));
    assert.deepEqual(bad, [], `${selector}: clipped text`);
  };
  await page.locator('#start-pcr-card').tap();
  await page.locator('#patient-adult-protocol').check();
  await page.locator('#start-pcr-no-data-btn').tap();
  await page.waitForFunction(() => window.SIAV.state.pcrActive);
  await page.evaluate(() => {
    const beat = document.getElementById('metro-beat'); const animate = beat.animate.bind(beat);
    window.__visualBeats = 0; beat.animate = (...args) => { window.__visualBeats++; return animate(...args); };
  });
  for (const theme of ['light', 'dark']) {
    await page.evaluate(t => window.setTheme(t), theme);
    await page.evaluate(() => window.showScreen('pcr'));
    await contrast('#metro-status, #bpm-value');
    await noClip('#metro-status, #bpm-value, .ac-timer-label, .ac-timer-value');
    await page.evaluate(() => scrollTo(0, 0));
    await capture(theme, 'pcr-header');
    await page.locator('#metro-btn').tap();
    await page.waitForFunction(() => document.getElementById('metro-btn').getAttribute('aria-pressed') === 'true');
    const previousBeats = await page.evaluate(() => window.__visualBeats);
    await page.waitForFunction(n => window.__visualBeats > n, previousBeats);
    const boxes = await page.locator('.metronome-section').evaluate(e => {
      const rect = el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
      return { group: rect(e), buttons: [...e.querySelectorAll('button')].map(rect) };
    });
    const [minus, main, plus] = boxes.buttons;
    assert.ok(minus.x < main.x && main.x < plus.x);
    assert.ok(Math.abs(main.x + main.width / 2 - (boxes.group.x + boxes.group.width / 2)) < 1, 'Main metronome must be centered');
    assert.ok(boxes.buttons.every(box => box.width >= 44 && box.height >= 44), 'Touch controls >=44px');
    await contrast('#metro-status, #bpm-value');
    await noClip('#metro-status, #bpm-value, .ac-timer-label, .ac-timer-value');
    await page.locator('#bpm-minus').tap(); await page.locator('#bpm-minus').tap();
    assert.equal(await page.locator('#bpm-minus').isDisabled(), true); assert.equal(await page.locator('#bpm-value').textContent(), '100 BPM');
    for (let i = 0; i < 4; i++) await page.locator('#bpm-plus').tap();
    assert.equal(await page.locator('#bpm-plus').isDisabled(), true); assert.equal(await page.locator('#bpm-value').textContent(), '120 BPM');
    await contrast('.pcr-actions-grid .btn-action span, footer .nav-item, .logo-subtitle');
    await page.locator('.metronome-section').evaluate(e => e.scrollIntoView({ block: 'center' }));
    await page.evaluate(() => document.fonts.ready);
    await capture(theme, 'pcr-controls');
    await page.locator('#metro-btn').tap();
    await page.locator('#bpm-minus').tap(); await page.locator('#bpm-minus').tap();
    for (const severity of ['success', 'warning', 'danger']) {
      await page.evaluate(style => window.showTransientAlert('Mensagem SINTÉTICA para verificar legibilidade sem corte. '.repeat(6), style), severity);
      await page.locator('#pcr-feedback-banner.show').waitFor();
      await contrast('#pcr-feedback-text'); await noClip('#pcr-feedback-text');
    }
    await page.evaluate(() => document.getElementById('pcr-feedback-banner').classList.remove('show'));
    await page.locator('#hs-ts-btn').tap();
    await contrast('.causes-header h2, .causes-subtitle, .cause-item'); await noClip('.cause-item');
    await page.locator('[data-cause="Hipóxia"]').tap();
    await contrast('.cause-item.checked, #selected-cause-name, #selected-cause-treatment');
    await noClip('#selected-cause-name, #selected-cause-treatment');
    await page.evaluate(() => scrollTo(0, 0));
    await capture(theme, 'causes');
    await page.locator('[data-cause="Hipóxia"]').tap();
    for (const screen of ['home', 'studies', 'protocols', 'dashboard', 'quiz-config', 'rhythm-selector', 'shock-action', 'pcr']) {
      await page.evaluate(s => window.showScreen(s), screen);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${screen}/${theme}: horizontal overflow`);
      await contrast('.screen.active h2, .screen.active .section-description, .screen.active .protocol-title, .screen.active .protocol-desc');
    }
    for (const id of ['patient-modal', 'med-modal', 'notes-modal', 'vitals-modal', 'glasgow-modal', 'login-modal', 'profile-modal']) {
      await page.evaluate(id => window.openModal(id), id);
      await page.locator('#' + id + '.show').waitFor();
      await contrast(`#${id} h3, #${id} label`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${id}/${theme}: overflow`);
      await page.evaluate(id => window.closeModal(id), id);
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const before = await page.evaluate(() => window.__visualBeats);
  await page.locator('#metro-btn').tap(); await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => window.__visualBeats), before, 'Reduced motion suppresses beat animations');
  assert.equal(await page.locator('#metro-beat').evaluate(e => getComputedStyle(e).opacity), '1');
  assert.equal(await page.evaluate(() => window.SIAV.state.metronomeActive), true);
  await page.locator('#metro-btn').tap();
  assert.equal(await page.evaluate(() => window.SIAV.state.currentUser.isLoggedIn), false);
}
