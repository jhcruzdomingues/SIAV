import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkMedicationClarity(page) {
  const directory = process.env.SIAV_MEDICATION_CLARITY_SCREENSHOTS_DIR;
  if (directory) await mkdir(directory, { recursive: true });
  const med = page.locator('#med-modal');
  const capture = async name => {
    if (directory) await page.screenshot({ path: join(directory, name + '.png'), scale: 'css', animations: 'disabled' });
  };
  const layout = async (width, theme, manual) => {
    const positions = await med.evaluate(el => {
      const rect = selector => {
        const r = el.querySelector(selector).getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
      };
      const clipped = [...el.querySelectorAll('h3, p, label, legend, summary, .med-pro-title, .main-text, .sub-text')]
        .filter(n => n.getClientRects().length && n.clientWidth && (n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1))
        .map(n => n.id || n.textContent);
      const warning = el.querySelector('#med-preview-value');
      return { panel: rect('.modal-content'), body: rect('.med-form-body'), preview: rect('#med-preview-panel'), dose: rect('#medication-dose'), ev: rect('.med-route-options label:has(#route-ev)'),
        io: rect('.med-route-options label:has(#route-io)'), unit: rect('#medication-dose-unit'), footer: rect('#record-med-btn'), clipped,
        warningInk: getComputedStyle(warning).color, warningSurface: getComputedStyle(warning).backgroundColor };
    });
    const tag = `${width}/${theme}/${manual ? 'manual' : 'preset'}`;
    assert.ok(positions.panel.width <= width - 20, tag + ': modal bounded');
    assert.deepEqual(positions.clipped, [], tag + ': no clipped text');
    assert.ok(Math.abs(positions.dose.y - positions.ev.y) <= 1 && Math.abs(positions.ev.y - positions.io.y) <= 1,
      tag + ': dose and routes aligned ' + JSON.stringify(positions));
    assert.ok(positions.dose.right <= positions.unit.x + 1 && positions.unit.right < positions.ev.x,
      tag + ': dose, unit and routes never overlap');
    assert.ok(positions.ev.width >= 44 && positions.io.width >= 44 && positions.ev.height >= 44 && positions.io.height >= 44,
      tag + ': route tap targets');
    assert.ok(positions.footer.y >= 0 && positions.footer.bottom <= page.viewportSize().height, tag + ': confirmation accessible');
    assert.ok(positions.preview.y >= positions.body.y - 1 && positions.preview.bottom <= positions.body.bottom + 1,
      tag + ': dose panel and manual review fully revealed, not cut by the footer');
    assert.equal(await med.locator('#medication-edit-details').getAttribute('open'), null, tag + ': advanced fields stay collapsed');
    assert.equal(await med.locator('#medication-review-confirmation').isVisible(), manual, tag + ': manual review remains accessible');
    if (manual) {
      assert.equal(await med.locator('#med-preview-value').getAttribute('role'), 'alert');
      const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(x => Number(x) / 255)
        .map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0);
      const a = luminance(positions.warningInk), b = luminance(positions.warningSurface);
      assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, tag + ': warning contrast');
    }
  };
  const layouts = async (manual, label) => {
    for (const width of [320, 360, 375, 390, 414, 430, 768]) {
      await page.setViewportSize({ width, height: width === 320 ? 568 : width === 768 ? 1024 : width * 2 });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(t => window.setTheme(t), theme);
        await med.locator('.med-btn-pro.selected').tap(); // Deliberate selection reveals the dose on short screens.
        await layout(width, theme, manual);
        if (width === 320 && theme === 'light' || width === 390 && theme === 'dark') await capture(`${label}-${width}-${theme}`);
      }
    }
  };
  const assess = async value => {
    await page.locator('#rhythm-conduta-btn').tap(); await page.locator(`[data-rhythm="${value}"]`).tap();
    await page.locator('#submit-rhythm-selection-btn').tap();
  };
  const shock = async () => {
    await assess('FV'); await page.locator('#shock-action-screen.active').waitFor();
    await page.locator('#shock-applied-energy').fill('200'); await page.locator('#apply-shock-btn').tap();
    await page.locator('#pcr-screen.active').waitFor();
  };
  const open = async id => { await page.locator('#med-btn').tap(); await med.locator(`[data-med="${id}"]`).tap(); };
  const close = async () => { await med.locator('#cancel-med-btn').tap(); await med.waitFor({ state: 'hidden' }); };
  await page.locator('#start-pcr-card').tap(); await page.locator('#patient-start-btn').tap(); await page.locator('#compressions-btn').tap();
  if (await page.locator('#metro-btn').getAttribute('aria-pressed') === 'true') await page.locator('#metro-btn').tap();
  await open('amiodarona');
  assert.match(await med.locator('#med-preview-value').textContent(), /Indicação não verificada/);
  assert.equal(await med.locator('#medication-dose').inputValue(), '');
  assert.equal(await med.locator('#record-med-btn').isDisabled(), true);
  await layouts(true, 'uncertain');
  // The review is outside advanced controls; checking it never creates an administration.
  await med.locator('#medication-confirmed').check();
  assert.equal(await med.locator('#record-med-btn').isDisabled(), true, 'Exact amount still required');
  assert.equal(await page.evaluate(() => window.SIAV.state.medications.length), 0);
  await med.locator('#medication-special-options > summary').tap();
  await med.locator('[data-med="bicarbonato"]').tap();
  assert.equal(await med.locator('#medication-unit').inputValue(), 'mEq');
  assert.equal(await med.locator('#medication-confirmed').isChecked(), false);
  await med.locator('[data-med="sulfato"]').tap(); assert.equal(await med.locator('#medication-dose-unit').textContent(), 'g');
  await close();
  await assess('AESP'); await page.locator('#pcr-screen.active').waitFor();
  await open('amiodarona'); assert.match(await med.locator('#med-preview-value').textContent(), /não indicada neste passo/);
  await med.locator('[data-med="adrenalina"]').tap(); assert.equal(await med.locator('#med-preview-value').isVisible(), false);
  await med.locator('#record-med-btn').tap();
  await shock(); await shock(); // AESP → step 6 → step 8, not a total-shock shortcut.
  await open('amiodarona');
  assert.equal(await med.locator('#medication-dose').inputValue(), '300');
  assert.equal(await med.locator('#med-preview-value').textContent(), '1ª dose');
  await layouts(false, 'amiodarone-first');
  await med.locator('#record-med-btn').tap(); await page.evaluate(() => window.recordMedication());
  assert.deepEqual(await page.evaluate(() => window.SIAV.state.medications.filter(m => m.medicationId === 'amiodarona').map(m => m.amount)), [300]);
  await open('amiodarona'); assert.match(await med.locator('#med-preview-value').textContent(), /Não repetir/);
  assert.equal(await med.locator('#medication-dose').inputValue(), ''); await close();
  await shock(); await shock(); await open('amiodarona');
  assert.equal(await med.locator('#medication-dose').inputValue(), '150');
  assert.equal(await med.locator('#med-preview-value').textContent(), '2ª dose');
  await page.setViewportSize({ width: 390, height: 780 }); await capture('amiodarone-second-390-dark');
  await med.locator('#record-med-btn').tap(); await page.evaluate(() => window.recordMedication());
  const administrations = await page.evaluate(() => window.SIAV.state.medications.filter(m => m.medicationId === 'amiodarona'));
  assert.deepEqual(administrations.map(m => m.amount), [300, 150]);
  assert.ok(administrations.every(m => m.unit === 'mg' && m.route === 'EV' && !m.requiresReview && m.id && Number.isFinite(m.timestamp) && Number.isFinite(m.recordedAt) && m.episodeId));
  assert.notEqual(administrations[0].id, administrations[1].id);
  await shock(); await shock(); await open('amiodarona');
  assert.match(await med.locator('#med-preview-value').textContent(), /Duas doses/);
  assert.equal(await med.locator('#medication-dose').inputValue(), ''); assert.equal(await med.locator('#record-med-btn').isDisabled(), true);
}
