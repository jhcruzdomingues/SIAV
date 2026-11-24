import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkMedicationsPostRce(page) {
  const directory = process.env.SIAV_MEDICATIONS_SCREENSHOTS_DIR;
  if (directory) await mkdir(directory, { recursive: true });
  const med = page.locator('#med-modal'), vitals = page.locator('#vitals-modal');
  const capture = async name => { if (directory) await page.screenshot({ path: join(directory, name + '.png'), scale: 'css', animations: 'disabled' }); };
  const inspect = async (modal, width, theme) => {
    const panel = modal.locator('.modal-content');
    const size = await panel.boundingBox(); assert.ok(size.width <= 420 && size.width <= width - 20, `${width}/${theme}: bounded modal`);
    const heading = await modal.locator('h3').evaluate(el => ({ text: el.textContent, width: el.clientWidth, height: el.clientHeight,
      visibility: getComputedStyle(el).visibility, opacity: getComputedStyle(el).opacity, parentWidth: el.parentElement.clientWidth }));
    assert.ok(heading.width >= 100 && heading.height >= 20 && heading.visibility === 'visible' && heading.opacity === '1', `Visible heading: ${JSON.stringify(heading)}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const clipped = await modal.locator('h3, p, label, summary, .med-pro-title, .main-text, .sub-text').evaluateAll(xs => xs.filter(el =>
      el.getClientRects().length && el.clientWidth && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)).map(el => el.id || el.textContent));
    assert.deepEqual(clipped, [], `${width}/${theme}: no clipped text`);
    const controls = await modal.locator('button, input:not([type="hidden"]), select, textarea').evaluateAll(xs => xs.filter(el => el.getClientRects().length && getComputedStyle(el).display !== 'none')
      .map(el => ({ id: el.id, type: el.type, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })));
    assert.ok(controls.every(r => ['radio', 'checkbox'].includes(r.type) || r.width >= 44 && r.height >= 44), JSON.stringify(controls));
    const colors = await modal.locator('h3, p, label, legend, summary, button, .med-pro-title, .main-text, .sub-text').evaluateAll(xs => xs.filter(el => el.getClientRects().length && el.clientWidth).map(el => {
      let parent = el;
      while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)') parent = parent.parentElement;
      return { text: el.textContent.trim(), ink: getComputedStyle(el).color, surface: getComputedStyle(parent).backgroundColor };
    }));
    const lum = color => color.match(/[\d.]+/g).slice(0, 3).map(x => Number(x) / 255)
      .map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0);
    for (const { text, ink, surface } of colors) {
      const [a, b] = [lum(ink), lum(surface)]; assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, `${width}/${theme}: contrast ${text.slice(0, 45)} ${ink}/${surface}`);
    }
  };
  const assess = async value => {
    await page.locator('#rhythm-conduta-btn').tap(); await page.locator(`[data-rhythm="${value}"]`).tap(); await page.locator('#submit-rhythm-selection-btn').tap();
  };
  const shock = async () => {
    await assess('FV'); await page.locator('#shock-action-screen.active').waitFor();
    await page.locator('#shock-applied-energy').fill('200'); await page.locator('#apply-shock-btn').tap(); await page.locator('#pcr-screen.active').waitFor();
  };
  await page.locator('#start-pcr-card').tap(); await page.locator('#patient-start-btn').tap(); await page.locator('#compressions-btn').tap();
  if (await page.locator('#metro-btn').getAttribute('aria-pressed') === 'true') await page.locator('#metro-btn').tap();
  assert.equal(await page.locator('#ac-primary-text').textContent(), 'Informe o ritmo.');
  assert.equal(await page.locator('#vitals-btn').count(), 0);
  assert.equal(await page.evaluate(() => window.showVitalsModal()), false);
  assert.equal(await vitals.isVisible(), false);
  await assess('AESP'); await page.locator('#pcr-screen.active').waitFor();
  await page.locator('#med-btn').tap();
  assert.equal(await med.locator('#record-med-btn').isDisabled(), true);
  await med.locator('[data-med="adrenalina"]').tap();
  assert.equal(await med.locator('#medication-dose').inputValue(), '1');
  assert.equal(await med.locator('#medication-weight-field').isVisible(), false);
  assert.equal(await med.locator('#medication-edit-details').getAttribute('open'), null);
  assert.equal(await page.evaluate(() => window.SIAV.state.medications.length), 0);
  for (const width of [320, 360, 375, 390, 414, 430, 768]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : width === 768 ? 1024 : width * 2 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => window.setTheme(t), theme); await inspect(med, width, theme);
      const confirm = await med.locator('#record-med-btn').boundingBox();
      assert.ok(confirm.y >= 0 && confirm.y + confirm.height <= page.viewportSize().height, 'Confirm stays visible on a short portrait screen');
      const first = await med.locator('.med-primary-options').boundingBox(), rest = await med.locator('.med-other-options').boundingBox();
      assert.ok(first.y + first.height <= rest.y, 'Primary drugs above the others');
      if (width === 320 && theme === 'light' || width === 390 && theme === 'dark') await capture(`medication-${width}-${theme}`);
    }
  }
  await med.locator('#record-med-btn').tap();
  await page.evaluate(() => window.recordMedication()); // Repeated operation cannot create another administration.
  assert.equal(await page.evaluate(() => window.SIAV.state.medications.length), 1);
  await shock(); await shock(); // AESP → 6 → 8: existing clinical route.
  await page.locator('#med-btn').tap(); await med.locator('[data-med="lidocaina"]').tap();
  assert.equal(await med.locator('#medication-weight-field').isVisible(), true);
  await med.locator('#medication-weight').fill('70');
  assert.equal(await page.evaluate(() => window.SIAV.state.patient.weight), 'N/I');
  await med.locator('#confirm-medication-weight').tap();
  assert.match(await med.locator('#med-preview-value').textContent(), /70–105 mg/);
  assert.equal(await med.locator('#medication-dose').inputValue(), '');
  assert.equal(await med.locator('#record-med-btn').isDisabled(), true);
  await med.locator('#medication-dose').fill('90');
  assert.equal(await med.locator('#record-med-btn').isDisabled(), false);
  await page.setViewportSize({ width: 320, height: 568 }); await page.evaluate(() => window.setTheme('light'));
  await inspect(med, 320, 'light'); await capture('lidocaine-320-light');
  await med.locator('#record-med-btn').tap();
  assert.equal(await page.evaluate(() => window.SIAV.state.medications.at(-1).weightAtAdministration), 70);
  assert.equal(await page.evaluate(() => window.SIAV.state.medications.at(-1).requiresReview), false);
  await page.locator('#finish-pcr-btn').tap(); page.once('dialog', dialog => dialog.accept()); await page.locator('#rosc-btn').tap();
  await vitals.waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => window.SIAV.state.clinical.status), 'rosc');
  assert.equal(await page.evaluate(() => window.SIAV.state.pcrActive), true);
  const stopped = await page.evaluate(() => JSON.stringify(window.SIAV.state.resuscitationTiming));
  await vitals.locator('#record-vitals-btn').tap(); assert.equal(await vitals.locator('#vitals-form-feedback').isVisible(), true);
  await vitals.locator('#vital-fc').fill('85');
  assert.equal(await vitals.locator('#vitals-form-feedback').isVisible(), false, 'Editing clears an outdated validation message');
  await vitals.locator('#close-vitals-btn').tap(); await vitals.waitFor({ state: 'hidden' });
  await page.locator('#finish-pcr-btn').tap(); page.once('dialog', dialog => dialog.accept()); await page.locator('#rosc-btn').tap();
  await vitals.waitFor({ state: 'visible' }); assert.equal(await vitals.locator('#vital-fc').inputValue(), '85');
  for (const width of [320, 360, 375, 390, 414, 430, 768]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : width === 768 ? 1024 : width * 2 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => window.setTheme(t), theme); await inspect(vitals, width, theme);
      if (width === 320 && theme === 'light' || width === 390 && theme === 'dark') await capture(`post-rce-${width}-${theme}`);
    }
  }
  await vitals.locator('#vital-pa-sistolica').fill('120'); await vitals.locator('#vital-pa-diastolica').fill('80');
  await vitals.locator('#record-vitals-btn').tap();
  assert.equal(await page.evaluate(() => window.SIAV.state.pcrActive), false);
  assert.equal(await page.evaluate(() => JSON.stringify(window.SIAV.state.resuscitationTiming)), stopped, 'No time added while entering post-RCE values');
  const report = await page.evaluate(() => window.generateEvolution(false));
  assert.match(report, /SINAIS VITAIS PÓS-RCE: PA: 120x80 mmHg; FC: 85 bpm/);
  assert.match(report, /90 mg via EV/);
}
