import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkFinishAttendance(page) {
  const directory = process.env.SIAV_FINISH_SCREENSHOTS_DIR;
  if (directory) await mkdir(directory, { recursive: true });
  const modal = page.locator('#finish-attendance-modal');
  const dialogs = []; let accept = true;
  const handleDialog = async dialog => { dialogs.push(dialog.message()); await (accept ? dialog.accept() : dialog.dismiss()); };
  page.on('dialog', handleDialog);
  const labels = { rosc: 'RCE OBTIDO (ROSC)', death: 'ÓBITO INFORMADO PELO OPERADOR', cancelled: 'ATENDIMENTO CANCELADO' };
  try {
    for (const type of ['rosc', 'death', 'cancelled']) {
      accept = true;
      await page.locator('#start-pcr-card').tap(); await page.locator('#patient-start-btn').tap();
      await page.locator('#compressions-btn').tap();
      if (await page.locator('#metro-btn').getAttribute('aria-pressed') === 'true') await page.locator('#metro-btn').tap();
      await page.evaluate(() => { window.SIAV.state.notes.push({ text: 'NOTA SINTETICA DO ENCERRAMENTO' }); });
      const deadline = await page.evaluate(() => window.compressionCycle.deadline);
      const layout = await page.evaluate(() => ({
        panel: document.querySelector('#pcr-screen .ac-main-display').getBoundingClientRect().bottom,
        rcpTop: document.getElementById('compressions-btn').getBoundingClientRect().top,
        rcpBottom: document.getElementById('compressions-btn').getBoundingClientRect().bottom,
        rhythm: document.getElementById('rhythm-conduta-btn').getBoundingClientRect().top
      }));
      assert.ok(layout.panel <= layout.rcpTop && layout.rcpBottom <= layout.rhythm, 'Instructions → RCP → rhythm');
      assert.equal(await page.locator('#pcr-screen #rosc-btn').count(), 0);
      if (directory && type === 'rosc') {
        await page.setViewportSize({ width: 390, height: 780 });
        await page.locator('.ac-main-display').evaluate(el => el.scrollIntoView({ block: 'start' }));
        await page.screenshot({ path: join(directory, 'pcr-instructions-rcp-rhythm.png'), scale: 'css', animations: 'disabled' });
      }
      const count = dialogs.length;
      await page.locator('#finish-pcr-btn').tap(); await modal.waitFor({ state: 'visible' });
      assert.equal(await modal.evaluate(el => getComputedStyle(el).animationName), 'none');
      assert.equal(await modal.locator('.finish-attendance-panel').evaluate(el => getComputedStyle(el).animationName), 'none');
      assert.equal(dialogs.length, count, 'Opening is not an outcome confirmation');
      if (type === 'rosc') {
        for (const width of [320, 360, 375, 390, 414, 430, 768]) {
          await page.setViewportSize({ width, height: innerHeightFor(width) });
          for (const theme of ['light', 'dark']) {
            await page.evaluate(t => window.setTheme(t), theme);
            const geometry = await modal.locator('button').evaluateAll(xs => xs.map(el => {
              const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom };
            }));
            if (directory && width === 320 && theme === 'light') await page.screenshot({ path: join(directory, 'finish-320-light.png'), scale: 'css', animations: 'disabled' });
            assert.ok(geometry.every(r => r.width >= 44 && r.height >= 44 && r.y >= 0 && r.bottom <= innerHeightFor(width)), `${width}/${theme}: targets visible ${JSON.stringify(geometry)}`);
            const clipped = await modal.locator('h3, p, span, small').evaluateAll(xs => xs.filter(el => el.clientWidth &&
              (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)).map(el => el.id || el.tagName));
            assert.deepEqual(clipped, [], `${width}/${theme}: no clipped text`);
            const colors = await modal.locator('h3, p, button, button span, button small').evaluateAll(xs => xs.map(el => {
              let parent = el;
              while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)') parent = parent.parentElement;
              return { ink: getComputedStyle(el).color, surface: getComputedStyle(parent).backgroundColor };
            }));
            const lum = color => color.match(/[\d.]+/g).slice(0, 3).map(x => Number(x) / 255)
              .map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((v, x, i) => v + x * [.2126, .7152, .0722][i], 0);
            for (const { ink, surface } of colors) {
              const [a, b] = [lum(ink), lum(surface)]; assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, `${width}/${theme}: contrast`);
            }
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            if (directory && (width === 320 && theme === 'light' || width === 390 && theme === 'dark')) await page.screenshot({ path: join(directory, `finish-${width}-${theme}.png`), scale: 'css', animations: 'disabled' });
          }
        }
        await page.locator('#finish-attendance-close').tap(); await modal.waitFor({ state: 'hidden' });
        assert.equal(await page.evaluate(() => window.compressionCycle.paused), false);
        await page.locator('#finish-pcr-btn').tap();
      }
      accept = false; const beforeDecline = dialogs.length;
      await modal.locator(`[data-finish-outcome="${type}"]`).tap();
      assert.equal(dialogs.length, beforeDecline + 1); assert.equal(await modal.isVisible(), true);
      assert.equal(await page.evaluate(() => window.SIAV.state.pcrActive), true);
      assert.equal(await page.evaluate(() => window.compressionCycle.deadline), deadline);
      accept = true; const beforeAccept = dialogs.length;
      await modal.locator(`[data-finish-outcome="${type}"]`).tap(); await modal.waitFor({ state: 'hidden' });
      assert.equal(dialogs.length, beforeAccept + 1, 'Exactly one confirmation for the chosen end action');
      if (type === 'rosc') {
        await page.locator('#vitals-modal').waitFor({ state: 'visible' });
        assert.equal(await page.evaluate(() => window.SIAV.state.roscAchieved), true);
        assert.equal(await page.evaluate(() => window.SIAV.state.pcrActive), true);
        await page.locator('#vital-pa-sistolica').fill('120');
        await page.locator('#vital-pa-diastolica').fill('80');
        await page.locator('#vital-fc').fill('85');
        await page.locator('#record-vitals-btn').tap();
      }
      const result = await page.evaluate(() => ({ active: window.SIAV.state.pcrActive, outcome: window.SIAV.state.encounterOutcome,
        rosc: window.SIAV.state.roscAchieved, notes: window.SIAV.state.notes, report: window.generateEvolution(false) }));
      assert.equal(result.active, false); assert.equal(result.outcome.type, type); assert.equal(result.rosc, type === 'rosc');
      assert.equal(result.notes[0].text, 'NOTA SINTETICA DO ENCERRAMENTO'); assert.ok(result.report.includes(labels[type]));
      if (type === 'rosc') assert.ok(result.report.includes('SINAIS VITAIS PÓS-RCE: PA: 120x80 mmHg; FC: 85 bpm'));
    }
  } finally { page.off('dialog', handleDialog); }
}

const innerHeightFor = width => width === 320 ? 568 : width === 768 ? 1024 : Math.max(568, width * 2);
