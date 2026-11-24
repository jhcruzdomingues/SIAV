import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkDirectCommands(page) {
  const directory = process.env.SIAV_COMMAND_SCREENSHOTS_DIR;
  if (directory) await mkdir(directory, { recursive: true });
  const panel = page.locator('#pcr-screen .ac-main-display');
  const primary = panel.locator('#ac-primary-text'), context = panel.locator('#ac-safety-note');
  await page.locator('#start-pcr-card').tap(); await page.locator('#patient-start-btn').tap();
  await page.locator('#compressions-btn').tap();
  if (await page.locator('#metro-btn').getAttribute('aria-pressed') === 'true') await page.locator('#metro-btn').tap();
  for (let n = 0; n < 2; n++) {
    await page.locator('#rhythm-conduta-btn').tap(); await page.locator('[data-rhythm="FV"]').tap();
    await page.locator('#submit-rhythm-selection-btn').tap(); await page.locator('#shock-action-screen.active').waitFor();
    await page.locator('#shock-applied-energy').fill('200'); await page.locator('#apply-shock-btn').tap();
    await page.locator('#pcr-screen.active').waitFor();
  }
  const deadline = await page.evaluate(() => window.compressionCycle.deadline);
  assert.equal(await primary.textContent(), 'Administre adrenalina 1 mg EV/IO.');
  assert.equal(await page.evaluate(() => window.SIAV.state.medications.length), 0, 'Instruction is not an administration record');
  await page.locator('#pcr-feedback-banner.show').waitFor({ state: 'hidden' });
  for (const width of [320, 360, 375, 390, 414, 430, 450, 768]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : width === 768 ? 1024 : width * 2 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => window.setTheme(t), theme);
      assert.equal(await panel.locator('details, summary, #ac-dose-container').count(), 0);
      const text = await panel.textContent();
      assert.equal((text.match(/1 mg EV\/IO/g) || []).length, 1, 'One administration instruction, not repeated across blocks');
      assert.doesNotMatch(text, /amiodarona|lidocaína|Ver orientação completa|DOSE INDICADA|condutas do passo atual/i);
      assert.equal(await context.isVisible(), true); assert.match(await context.textContent(), /Mantenha a RCP/);
      assert.equal(await panel.locator('#ac-next-text').textContent(), 'Reavalie o ritmo ao fim do ciclo.');
      const clipped = await panel.locator('#ac-primary-text, #ac-safety-note, #ac-next-text').evaluateAll(xs => xs.filter(el =>
        el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1).map(el => el.id));
      assert.deepEqual(clipped, [], `${width}/${theme}: all instructions fit`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const colors = await panel.locator('#ac-primary-text, #ac-safety-note, #ac-next-text').evaluateAll(xs => xs.map(el => {
        let parent = el;
        while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)') parent = parent.parentElement;
        return { ink: getComputedStyle(el).color, surface: getComputedStyle(parent).backgroundColor };
      }));
      const lum = color => color.match(/[\d.]+/g).slice(0, 3).map(x => Number(x) / 255)
        .map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0);
      for (const { ink, surface } of colors) {
        const [a, b] = [lum(ink), lum(surface)]; assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, `${width}/${theme}: contrast`);
      }
      await panel.evaluate(el => el.scrollIntoView({ block: 'start' }));
      const box = await panel.boundingBox();
      assert.ok(box.height <= page.viewportSize().height - 70, 'The instruction card fits without expanding another control');
      if (directory && (width === 320 && theme === 'light' || width === 390 && theme === 'dark' || width === 450 && theme === 'light')) {
        await panel.screenshot({ path: join(directory, `commands-${width}-${theme}.png`), scale: 'css', animations: 'disabled' });
      }
    }
  }
  await page.locator('#compressions-btn').tap();
  assert.equal(await panel.locator('#compression-resume-alert').isVisible(), true);
  assert.doesNotMatch(await context.textContent(), /Mantenha a RCP/);
  await page.locator('#compressions-btn').tap();
  assert.equal(await page.evaluate(() => window.compressionCycle.deadline), deadline);
  await page.locator('#med-btn').tap(); await page.locator('[data-med="adrenalina"]').tap();
  await page.locator('#record-med-btn').tap(); await page.locator('#med-modal.show').waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => window.SIAV.state.medications.length), 1);
  assert.doesNotMatch(await primary.textContent(), /Administre adrenalina/);
  await page.evaluate(() => { window.SIAV.state.clinical.historyIncomplete = true; window.updatePcrGuidance(); });
  assert.match(await primary.textContent(), /Reavalie o percurso/);
  assert.doesNotMatch(await primary.textContent(), /Administre|mg EV\/IO/);
  assert.equal(await panel.locator('details, summary').count(), 0);
}
