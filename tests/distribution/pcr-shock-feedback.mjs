import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkShockFeedback(page) {
  const directory = process.env.SIAV_SHOCK_SCREENSHOTS_DIR;
  if (directory) await mkdir(directory, { recursive: true });
  const capture = async name => { if (directory) await page.screenshot({ path: join(directory, name + '.png'), scale: 'css', animations: 'disabled' }); };
  const geometry = () => page.evaluate(() => ({ app: document.querySelector('.app-container').getBoundingClientRect().width,
    body: document.body.getBoundingClientRect().width, viewport: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth }));
  const prepare = async () => {
    await page.locator('#rhythm-conduta-btn').tap(); await page.locator('[data-rhythm="FV"]').tap();
    await page.locator('#submit-rhythm-selection-btn').tap(); await page.locator('#shock-action-screen.active').waitFor();
    await page.locator('#shock-applied-energy').fill('200');
  };
  const apply = async () => {
    await page.locator('#apply-shock-btn').tap(); await page.locator('#pcr-screen.active').waitFor();
    await page.evaluate(() => scrollTo(0, 0));
  };
  await page.setViewportSize({ width: 390, height: 780 });
  await page.locator('#start-pcr-card').tap(); await page.locator('#patient-start-btn').tap();
  await page.locator('#compressions-btn').tap();
  if (await page.locator('#metro-btn').getAttribute('aria-pressed') === 'true') await page.locator('#metro-btn').tap();
  const before = await geometry(); await prepare(); await apply();
  await capture('first-shock');
  assert.equal((await geometry()).app, before.app, 'Shock feedback must not shrink the app');
  assert.equal(await page.locator('body > .transient-alert').count(), 0, 'Successful shock belongs in the PCR panel');
  await prepare(); await apply();
  assert.match(await page.locator('#pcr-feedback-text').textContent(), /200 J registrado/);
  assert.equal(await page.locator('#ac-primary-text').textContent(), 'Administre adrenalina 1 mg EV/IO.');
  assert.equal(await page.evaluate(() => window.SIAV.state.medications.length), 0);
  const deadline = await page.evaluate(() => window.compressionCycle.deadline);
  for (const width of [320, 360, 375, 390, 414, 430, 768]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : width === 768 ? 1024 : width * 2 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => window.setTheme(t), theme); await page.evaluate(() => scrollTo(0, 0));
      const current = await geometry();
      assert.equal(current.app, Math.min(width, 450)); assert.equal(current.overflow, false);
      const clipped = await page.locator('.ac-timer-label, .ac-timer-value, #ac-primary-text, #ac-next-text')
        .evaluateAll(xs => xs.filter(el => el.clientWidth && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)).map(el => el.id || el.className));
      assert.deepEqual(clipped, [], `${width}/${theme}: no clipped timers or instructions`);
      assert.equal(await page.locator('#ac-status-badge').isVisible(), false, 'Do not repeat the urgency badge above Agora');
      assert.equal(await page.locator('.ac-main-display details, .ac-main-display summary').count(), 0);
      if (width === 320 && theme === 'light' || width === 390 && theme === 'dark') {
        await capture(`after-shock-${width}-${theme}`);
        if (directory) {
          await page.locator('.ac-main-display').evaluate(el => el.scrollIntoView({ block: 'start' }));
          await page.locator('.ac-main-display').screenshot({ path: join(directory, `instruction-${width}-${theme}.png`), scale: 'css', animations: 'disabled' });
        }
      }
    }
  }
  assert.equal(await page.evaluate(() => window.compressionCycle.deadline), deadline);
  // An invalid energy must still alert on the shock screen, without a record.
  await page.setViewportSize({ width: 320, height: 568 }); await page.evaluate(() => window.setTheme('light'));
  await prepare(); await page.locator('#shock-applied-energy').fill('');
  assert.equal(await page.locator('#apply-shock-btn').isDisabled(), true);
  const beforeError = await geometry();
  // Exercise the defensive public handler without bypassing/enabling the
  // disabled control; invalid energy must never create a clinical record.
  await page.evaluate(() => window.applyShockAndResume());
  const error = page.locator('body > .transient-alert.show'); await error.waitFor();
  assert.equal(await error.evaluate(el => getComputedStyle(el).position), 'fixed');
  const errorBounds = await error.boundingBox();
  assert.ok(errorBounds.x >= 0 && errorBounds.x + errorBounds.width <= 320);
  assert.equal((await geometry()).app, beforeError.app); assert.equal((await geometry()).overflow, false);
  assert.equal(await page.evaluate(() => window.SIAV.state.shocks.length), 2);
  assert.equal(await page.evaluate(() => window.compressionCycle.paused), true);
  await page.locator('#shock-applied-energy').fill('200'); await apply();
  assert.equal((await geometry()).app, Math.min(page.viewportSize().width, 450));
  assert.equal(await page.evaluate(() => window.SIAV.state.shocks.length), 3);
  assert.match(await page.locator('#ac-primary-text').textContent(), /Administre adrenalina/);
  assert.match(await page.locator('#ac-primary-text').textContent(), /amiodarona.* OU lidocaína/);
  assert.match(await page.locator('#ac-safety-note').textContent(), /Não associe amiodarona e lidocaína/);
}
