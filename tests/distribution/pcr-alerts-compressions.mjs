import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkAlertsAndCompressions(page) {
  const directory = process.env.SIAV_PCR_ALERTS_SCREENSHOTS_DIR;
  if (directory) await mkdir(directory, { recursive: true });
  const capture = async name => {
    if (directory) await page.screenshot({ path: join(directory, `${name}.png`), scale: 'css', animations: 'disabled' });
  };
  const button = page.locator('#compressions-btn');
  const notice = page.locator('#compression-resume-alert');
  const contrast = async selector => {
    const colors = await page.locator(selector).evaluateAll(xs => xs.filter(x => x.getClientRects().length).map(el => {
      const s = getComputedStyle(el); let parent = el;
      while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)') parent = parent.parentElement;
      return { text: el.textContent.trim().slice(0, 35), ink: s.color, surface: getComputedStyle(parent).backgroundColor };
    }));
    const lum = c => c.match(/[\d.]+/g).slice(0, 3).map(x => Number(x) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((v, x, i) => v + x * [.2126, .7152, .0722][i], 0);
    for (const item of colors) {
      const [a, b] = [item.ink, item.surface].map(lum);
      assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, `PCR contrast ${JSON.stringify(item)}`);
    }
  };
  const noClip = async selector => {
    const clipped = await page.locator(selector).evaluateAll(xs => xs.filter(x => x.getClientRects().length && x.clientWidth &&
      (x.scrollWidth > x.clientWidth + 1 || x.scrollHeight > x.clientHeight + 1)).map(x => x.id || x.className));
    assert.deepEqual(clipped, [], `Clipped PCR controls: ${selector}`);
  };
  const timerBox = () => page.locator('.ac-timers-dashboard').evaluate(el => {
    const r = el.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#start-pcr-card').tap(); await page.locator('#patient-start-btn').tap();
  await page.waitForFunction(() => window.SIAV.state.pcrActive);
  assert.equal(await button.getAttribute('data-compression-state'), 'ready');
  await button.tap();
  await page.waitForFunction(() => document.getElementById('compressions-btn').dataset.compressionState === 'running');
  if (await page.locator('#metro-btn').getAttribute('aria-pressed') === 'true') await page.locator('#metro-btn').tap();
  const deadline = await page.evaluate(() => window.compressionCycle.deadline);
  // Synthetic presentation fixture. Clinical eligibility remains calculated by the
  // unchanged protocol module; actual rhythm/shock actions are exercised below.
  await page.evaluate(() => {
    const s = window.SIAV.state;
    s.clinical.step = 8; s.clinical.compressionId = 'SYNTHETIC-UI-STEP'; s.shockCount = 3;
    window.compressionCycle.lastRhythmWasShockable = true;
    window.updatePcrGuidance();
  });
  for (const width of [320, 360, 375, 390, 414, 430, 768]) {
    await page.setViewportSize({ width, height: width === 768 ? 1024 : Math.max(568, width * 2) });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => window.setTheme(t), theme);
      await page.evaluate(() => scrollTo(0, 0));
      assert.match(await button.textContent(), /PAUSAR COMPRESSÕES/);
      assert.equal(await button.isEnabled(), true);
      assert.equal(await button.evaluate(el => getComputedStyle(el).animationName), 'none');
      await contrast('#compressions-btn, .ac-badge, #ac-primary-text, #ac-safety-note');
      await noClip('#compressions-btn, #ac-primary-text, #ac-safety-note');
      const before = await timerBox();
      await page.evaluate(() => window.showTransientAlert('Registro SINTÉTICO confirmado. '.repeat(6), 'success', 5000));
      await page.locator('#pcr-feedback-banner.show').waitFor();
      assert.deepEqual(await timerBox(), before, 'Transient feedback must not move the approved timer strip');
      await page.evaluate(() => document.getElementById('pcr-feedback-banner').classList.remove('show'));
      assert.equal(await page.locator('.ac-main-display details, .ac-main-display summary').count(), 0);
      assert.match(await page.locator('#ac-safety-note').textContent(), /Não associe amiodarona e lidocaína/);
      await noClip('#ac-safety-note');
      await button.tap();
      assert.equal(await button.getAttribute('data-compression-state'), 'paused');
      assert.equal(await notice.isVisible(), true);
      assert.match(await notice.textContent(), /Compressões interrompidas/);
      assert.equal(await button.evaluate(el => getComputedStyle(el).animationName), 'compression-resume-attention');
      assert.equal(await button.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(185, 28, 28)');
      await contrast('#compressions-btn, #compression-resume-alert');
      await noClip('#compressions-btn, #compression-resume-alert');
      await page.evaluate(() => scrollTo(0, 0));
      const actionBox = await button.boundingBox();
      assert.ok(actionBox.height >= 44 && actionBox.height <= 72, 'Paused action must remain compact');
      const order = await page.evaluate(() => {
        const bottom = selector => document.querySelector(selector).getBoundingClientRect().bottom;
        const top = selector => document.querySelector(selector).getBoundingClientRect().top;
        return bottom('.ac-main-display') <= top('#compressions-btn') && bottom('#compressions-btn') <= top('#rhythm-conduta-btn');
      });
      assert.equal(order, true, 'User requested instructions → RCP → check rhythm');
      if ([320, 390].includes(width)) await capture(`pcr-${width}-${theme}-paused`);
      await button.tap();
      assert.equal(await button.getAttribute('data-compression-state'), 'running');
      assert.equal(await notice.isVisible(), false);
      assert.equal(await page.evaluate(() => window.compressionCycle.deadline), deadline);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (directory && width === 390 && theme === 'dark') await page.locator('.ac-main-display').screenshot({
        path: join(directory, 'pcr-390-dark-guidance.png'), scale: 'css', animations: 'disabled' });
    }
  }
  const total = await page.locator('#pcr-timer').textContent();
  await button.tap();
  await page.waitForFunction(previous => document.getElementById('pcr-timer').textContent !== previous, total);
  assert.equal(await button.getAttribute('data-compression-state'), 'paused', 'Global time must keep advancing during a recorded pause');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await button.evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await button.tap();
  await page.locator('#rhythm-conduta-btn').tap();
  await page.locator('[data-rhythm="FV"]').tap(); await page.locator('#submit-rhythm-selection-btn').tap();
  await page.locator('#shock-action-screen.active').waitFor();
  assert.equal(await button.isVisible(), false, 'User requested this control only in the main panel');
  assert.equal(await page.evaluate(() => window.compressionCycle.paused), true);
  await page.locator('#shock-action-screen .back-btn-screen').tap();
  await page.locator('#pcr-screen.active').waitFor();
  assert.equal(await notice.isVisible(), true); assert.match(await button.textContent(), /RETOMAR/);
  // Existing combined shock-and-resume action: no automatic resume merely on opening.
  await page.evaluate(() => window.showScreen('shock-action'));
  await page.locator('#apply-shock-btn').tap();
  await page.locator('#pcr-screen.active').waitFor();
  assert.equal(await button.getAttribute('data-compression-state'), 'running');
  assert.equal(await notice.isVisible(), false);
  await page.locator('#finish-pcr-btn').tap();
  page.once('dialog', dialog => dialog.accept()); await page.locator('#rosc-btn').tap();
  await page.locator('#cancel-vitals-btn').tap();
  assert.equal(await page.evaluate(() => window.SIAV.state.pcrActive), false);
  assert.equal(await button.isDisabled(), true); assert.equal(await notice.isVisible(), false);
  assert.equal(await button.evaluate(el => getComputedStyle(el).animationName), 'none');
}
