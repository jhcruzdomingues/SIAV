import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkAdrenalineGuidance(page) {
  const directory = process.env.SIAV_ADRENALINE_SCREENSHOTS_DIR;
  if (directory) await mkdir(directory, { recursive: true });
  const clock = page.locator('#ac-drug-countdown');
  const box = page.locator('#ac-drug-timer-container');
  const panel = page.locator('#pcr-screen .ac-main-display');
  await page.locator('#start-pcr-card').tap(); await page.locator('#patient-start-btn').tap();
  assert.equal(await page.locator('#ac-drug-timer-label').textContent(), 'ADRENALINA');
  assert.equal(await clock.textContent(), '--:--');
  await page.locator('#compressions-btn').tap();
  if (await page.locator('#metro-btn').getAttribute('aria-pressed') === 'true') await page.locator('#metro-btn').tap();
  await page.locator('#rhythm-conduta-btn').tap();
  await page.locator('[data-rhythm="AESP"]').tap(); await page.locator('#submit-rhythm-selection-btn').tap();
  await page.locator('#pcr-screen.active').waitFor();
  assert.match(await panel.locator('#ac-primary-text').textContent(), /ADRENALINA/);
  assert.match(await panel.locator('#ac-next-text').textContent(), /fim do ciclo/);
  assert.equal(await clock.textContent(), '--:--', 'An indication is not an administration');
  if (directory) await panel.screenshot({ path: join(directory, 'before-adrenaline.png'), scale: 'css' });
  await page.locator('#med-btn').tap(); await page.locator('[data-med="adrenalina"]').tap();
  await page.locator('#record-med-btn').tap();
  await page.locator('#med-modal.show').waitFor({ state: 'hidden' });
  assert.equal(await box.getAttribute('data-clock-state'), 'running');
  const first = await page.evaluate(() => ({ ...window.SIAV.state.medications[0] }));
  const deadline = await page.evaluate(() => window.compressionCycle.deadline);
  assert.equal(first.amount, 1); assert.equal(first.requiresReview, false);
  await page.waitForFunction(() => document.getElementById('ac-drug-countdown').textContent !== '00:00');
  await page.locator('#pcr-feedback-banner.show').waitFor({ state: 'hidden' });
  for (const width of [320, 360, 375, 390, 414, 430, 768]) {
    await page.setViewportSize({ width, height: width === 768 ? 1024 : Math.max(568, width * 2) });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => window.setTheme(t), theme);
      assert.equal(await panel.count(), 1);
      assert.equal(await panel.evaluate(el => getComputedStyle(el.querySelector('.ac-instruction-panel')).textAlign), 'center');
      assert.equal(await panel.locator('#ac-next-step').isVisible(), true);
      assert.equal(await page.locator('.ac-timers-dashboard').textContent().then(t => /VER CONDUTAS|ORIENTAÇÃO CLÍNICA|AGUARDAR/.test(t)), false);
      assert.match(await clock.textContent(), /^\d{2,}:\d{2}$/);
      const clipped = await page.locator('.ac-timer-label, .ac-timer-value, .ac-timer-caption, #ac-primary-text, #ac-next-text, .ac-step-label')
        .evaluateAll(xs => xs.filter(x => x.getClientRects().length && x.clientWidth && (x.scrollWidth > x.clientWidth + 1 || x.scrollHeight > x.clientHeight + 1)).map(x => x.id || x.className));
      assert.deepEqual(clipped, [], `${width}/${theme}: clipped text`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const colors = await page.locator('#ac-next-text, .ac-step-label, #ac-drug-timer-context').evaluateAll(xs => xs.map(el => {
        let background = el;
        while (background && getComputedStyle(background).backgroundColor === 'rgba(0, 0, 0, 0)') background = background.parentElement;
        return { ink: getComputedStyle(el).color, surface: getComputedStyle(background).backgroundColor };
      }));
      const lum = color => color.match(/[\d.]+/g).slice(0, 3).map(x => Number(x) / 255)
        .map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((a, b, i) => a + b * [.2126, .7152, .0722][i], 0);
      for (const { ink, surface } of colors) {
        const [a, b] = [lum(ink), lum(surface)];
        assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, `${width}/${theme}: next action/clock contrast`);
      }
      await page.evaluate(() => scrollTo(0, 0));
      if (directory && [320, 390].includes(width)) {
        await page.screenshot({ path: join(directory, `adrenaline-${width}-${theme}.png`), scale: 'css', animations: 'disabled' });
        await panel.evaluate(el => el.scrollIntoView({ block: 'start' }));
        await panel.screenshot({ path: join(directory, `guidance-${width}-${theme}.png`), scale: 'css', animations: 'disabled' });
      }
    }
  }
  await page.locator('#compressions-btn').tap();
  assert.equal(await panel.locator('#compression-resume-alert').isVisible(), true);
  const before = await clock.textContent();
  await page.waitForFunction(value => document.getElementById('ac-drug-countdown').textContent !== value, before);
  await page.locator('#compressions-btn').tap();
  assert.equal(await page.evaluate(() => window.compressionCycle.deadline), deadline);
  assert.deepEqual(await page.evaluate(() => ({ ...window.SIAV.state.medications[0] })), first);
  assert.equal(await page.evaluate(() => window.SIAV.state.medications.length), 1);
  // Explicit synthetic uncertainty: no backend, no private history, no inferred clock.
  await page.evaluate(() => { window.SIAV.state.clinical.historyIncomplete = true; window.updatePcrGuidance(); });
  assert.equal(await clock.textContent(), '--:--'); assert.equal(await box.getAttribute('data-clock-state'), 'review');
  assert.match(await panel.locator('#ac-next-text').textContent(), /Confirme os dados/);
  assert.equal(await panel.locator('#ac-dose-container').isVisible(), false);
  await page.evaluate(() => { delete window.SIAV.state.clinical.historyIncomplete; window.updatePcrGuidance(); });
  assert.equal(await box.getAttribute('data-clock-state'), 'running');
}
