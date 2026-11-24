import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkSpecificMedications(page) {
  const directory = process.env.SIAV_SPECIFIC_MEDICATION_SCREENSHOTS_DIR;
  if (directory) await mkdir(directory, { recursive: true });
  const med = page.locator('#med-modal');
  const capture = async name => { if (directory) await page.screenshot({ path: join(directory, name + '.png'), scale: 'css', animations: 'disabled' }); };
  const choose = async id => {
    const option = med.locator(`[data-med="${id}"]`);
    const details = option.locator('xpath=ancestor::details');
    if (await details.count() && await details.getAttribute('open') === null) await details.locator(':scope > summary').tap();
    await option.tap();
  };
  const inspect = async (width, theme, routes) => {
    const geometry = await med.evaluate(el => {
      const rect = selector => {
        const r = el.querySelector(selector).getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
      };
      const clipped = [...el.querySelectorAll('h3, p, label, legend, summary, .med-pro-title, .main-text, .sub-text')]
        .filter(n => n.getClientRects().length && n.clientWidth && (n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1))
        .map(n => n.id || n.textContent);
      const warning = el.querySelector('#med-preview-value');
      return { body: rect('.med-form-body'), preview: rect('#med-preview-panel'), footer: rect('#record-med-btn'), panel: rect('.modal-content'), clipped,
        routes: [...el.querySelectorAll('.med-route-options label')].filter(n => n.getClientRects().length).map(n => {
          const r = n.getBoundingClientRect(); return { route: n.querySelector('input').value, width: r.width, height: r.height };
        }), ink: getComputedStyle(warning).color, surface: getComputedStyle(warning).backgroundColor };
    });
    const tag = `${width}/${theme}/${routes.join(',')}`;
    assert.deepEqual(geometry.clipped, [], tag + ': no clipped labels');
    assert.ok(geometry.panel.width <= width - 20, tag + ': bounded modal');
    assert.ok(geometry.preview.y >= geometry.body.y - 1 && geometry.preview.bottom <= geometry.body.bottom + 1, tag + ': full selected panel visible');
    assert.ok(geometry.footer.y >= 0 && geometry.footer.bottom <= page.viewportSize().height, tag + ': confirmation accessible');
    assert.deepEqual(geometry.routes.map(r => r.route), routes, tag + ': routes bound to medication');
    assert.ok(geometry.routes.every(r => r.width >= 44 && r.height >= 44), tag + ': 44px route targets');
    const lum = color => color.match(/[\d.]+/g).slice(0, 3).map(x => Number(x) / 255)
      .map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((s, x, i) => s + x * [.2126, .7152, .0722][i], 0);
    const a = lum(geometry.ink), b = lum(geometry.surface);
    assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, tag + ': warning contrast');
  };
  await page.locator('#start-pcr-card').tap(); await page.locator('#patient-start-btn').tap(); await page.locator('#compressions-btn').tap();
  if (await page.locator('#metro-btn').getAttribute('aria-pressed') === 'true') await page.locator('#metro-btn').tap();
  await page.locator('#med-btn').tap();
  assert.equal(await med.locator('#medication-special-options').getAttribute('open'), null);
  assert.equal(await med.locator('#medication-other-options').getAttribute('open'), null);
  assert.equal(await med.locator('[data-med]').count(), 12);
  await page.setViewportSize({ width: 320, height: 568 }); await page.evaluate(() => window.setTheme('light'));
  await capture('catalog-320-light');
  for (const id of ['gluconato_calcio', 'naloxona']) {
    await choose(id);
    assert.equal(await med.locator('#medication-dose').inputValue(), '');
    assert.equal(await med.locator('#record-med-btn').isDisabled(), true);
    for (const width of [320, 360, 375, 390, 414, 430, 768]) {
      await page.setViewportSize({ width, height: width === 320 ? 568 : width === 768 ? 1024 : width * 2 });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(t => window.setTheme(t), theme); await choose(id);
        await inspect(width, theme, id === 'naloxona' ? ['EV', 'IO', 'IM', 'IN'] : ['EV', 'IO']);
        if (width === 320 && theme === 'light' || width === 390 && theme === 'dark') await capture(`${id}-${width}-${theme}`);
      }
    }
  }
  const entries = [
    ['gluconato_calcio', 'mL', 'EV', '3.7'], ['cloreto_calcio', 'mL', 'IO', '2.3'],
    ['naloxona', 'mg', 'IN', '0.73'], ['alteplase', 'mg', 'EV', '7.25'],
    ['tenecteplase', 'mg', 'EV', '6.75'], ['glicose50', 'mL', 'IO', '3.9']
  ];
  for (let i = 0; i < entries.length; i++) {
    const [id, unit, route, amount] = entries[i];
    if (i) await page.locator('#med-btn').tap();
    await choose(id);
    assert.equal(await med.locator('#medication-dose').inputValue(), '');
    assert.equal(await med.locator('#medication-unit').inputValue(), unit);
    assert.equal(await med.locator('#med-preview-value').getAttribute('role'), 'alert');
    await med.locator('#route-' + route.toLowerCase()).check(); await med.locator('#medication-dose').fill(amount);
    assert.equal(await med.locator('#record-med-btn').isDisabled(), true, 'Dose alone never confirms manual administration');
    await med.locator('#medication-confirmed').check(); assert.equal(await med.locator('#record-med-btn').isDisabled(), false);
    await med.locator('#record-med-btn').tap(); await page.evaluate(() => window.recordMedication());
    const current = await page.evaluate(() => window.SIAV.state.medications);
    assert.equal(current.length, i + 1);
    assert.equal(current.at(-1).medicationId, id); assert.equal(current.at(-1).amount, Number(amount));
    assert.equal(current.at(-1).unit, unit); assert.equal(current.at(-1).route, route); assert.equal(current.at(-1).requiresReview, true);
    assert.ok(current.at(-1).id && current.at(-1).episodeId && Number.isFinite(current.at(-1).timestamp) && Number.isFinite(current.at(-1).recordedAt));
  }
  await page.locator('#med-btn').tap(); await choose('adrenalina');
  assert.equal(await med.locator('#route-in').isDisabled(), true); assert.equal(await med.locator('#route-in').isVisible(), false);
  assert.equal(await med.locator('#route-ev').isChecked(), true);
  assert.equal(await med.locator('#medication-confirmed').isChecked(), false);
  await med.locator('#cancel-med-btn').tap();
  const report = await page.evaluate(() => window.generateEvolution(false));
  for (const text of ['Gluconato de Cálcio 10%', 'Cloreto de Cálcio 10%', 'Naloxona', 'Alteplase', 'Tenecteplase', 'Glicose 50%', '3.7 mL via EV', '0.73 mg via IN']) assert.ok(report.includes(text), text);
}
