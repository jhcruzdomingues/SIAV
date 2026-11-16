import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkPatientEntry(page) {
  const modal = page.locator('#patient-modal');
  const directory = process.env.SIAV_PATIENT_SCREENSHOTS_DIR;
  if (directory) await mkdir(directory, { recursive: true });
  const capture = async name => {
    if (directory) await page.screenshot({ path: join(directory, `${name}.png`), scale: 'css', animations: 'disabled' });
  };
  const open = async () => {
    await page.locator('#start-pcr-card').tap();
    await page.locator('#patient-modal.show').waitFor();
    await modal.evaluate(async el => {
      await Promise.all([...el.getAnimations(), ...el.querySelector('.modal-content').getAnimations()]
        .map(a => a.finished.catch(() => {})));
    });
  };
  for (const width of [320, 360, 375, 390, 414, 430, 768]) {
    await page.setViewportSize({ width, height: width === 768 ? 1024 : Math.max(568, width * 2) });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => window.setTheme(value), theme);
      await open();
      if ([320, 390].includes(width)) await capture(`patient-${width}-${theme}`);
      const columns = await page.locator('#patient-age, #patient-weight').evaluateAll(xs => xs.map(x => {
        const b = x.getBoundingClientRect(); return { x: b.x, right: b.right, width: b.width };
      }));
      console.log(`Patient ${width}/${theme}: age.right=${columns[0].right}, weight.left=${columns[1].x}`);
      assert.equal(await modal.locator('details').count(), 0, 'All patient fields must be open in one form');
      assert.equal(await page.locator('#patient-adult-protocol').isChecked(), true, 'Adult must be the visible default');
      assert.equal(await modal.locator('[required]').count(), 0);
      assert.equal(await modal.locator('#start-pcr-no-data-btn').count(), 0, 'Only one start action is needed');
      assert.ok(columns[0].right < columns[1].x && columns.every(c => c.width >= 90), 'Age and weight must not overlap');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      for (const id of ['patient-name', 'patient-age', 'patient-weight', 'patient-allergies', 'patient-comorbidities']) assert.equal(await page.locator(`#${id}`).isVisible(), true);
      const action = page.locator('#patient-start-btn');
      assert.match(await action.textContent(), /INICIAR ATENDIMENTO ADULTO/);
      const style = await action.evaluate(el => {
        const s = getComputedStyle(el), b = el.getBoundingClientRect();
        return { background: s.backgroundColor, ink: s.color, animation: s.animationName, x: b.x, right: b.right, y: b.y, bottom: b.bottom, height: b.height };
      });
      assert.equal(style.background, 'rgb(185, 28, 28)');
      assert.equal(style.ink, 'rgb(255, 255, 255)');
      assert.equal(style.animation, 'patient-start-attention');
      assert.ok(style.y >= 0 && style.bottom <= page.viewportSize().height && style.height >= 48 && style.x >= 0 && style.right <= width);
      const clipped = await modal.locator('button, label, legend').evaluateAll(xs => xs.filter(x => x.scrollWidth > x.clientWidth + 1 || x.scrollHeight > x.clientHeight + 1).map(x => x.textContent.trim()));
      assert.deepEqual(clipped, [], 'Patient controls must not clip text');
      await page.locator('#patient-comorbidities').scrollIntoViewIfNeeded();
      const finalAction = await action.boundingBox();
      assert.ok(finalAction.y + finalAction.height <= page.viewportSize().height, 'Start action must stay reachable after scrolling');
      if (width === 390 && theme === 'dark') await capture('patient-390-dark-fields');
      await page.locator('#cancel-patient-btn').tap();
      await page.waitForFunction(() => !document.querySelector('.modal.show'));
    }
  }
  await page.setViewportSize({ width: 390, height: 780 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open();
  assert.equal(await page.locator('#patient-start-btn').evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.locator('#patient-start-btn').tap();
  await page.waitForFunction(() => window.SIAV.state.pcrActive);
  const initial = await page.evaluate(() => ({ patient: window.SIAV.state.patient, start: window.SIAV.state.pcrStartTime, episode: window.SIAV.state.clinical.episodeId }));
  assert.deepEqual(initial.patient, { algorithm: 'adult', name: 'N/I', age: 'N/I', sex: 'N/I', weight: 'N/I', allergies: 'Nenhuma informada', comorbidities: 'N/I' });
  await page.locator('#patient-info-display').tap();
  await page.locator('#patient-modal.show').waitFor();
  assert.equal(await page.locator('#patient-start-btn').textContent(), 'SALVAR ALTERAÇÕES');
  assert.equal(await page.locator('#patient-start-btn').evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.locator('#patient-name').fill('PACIENTE SINTETICO');
  await page.locator('#patient-other-protocol').check();
  await page.locator('#patient-start-btn').tap();
  assert.deepEqual(await page.evaluate(() => ({ algorithm: window.SIAV.state.patient.algorithm, start: window.SIAV.state.pcrStartTime, episode: window.SIAV.state.clinical.episodeId })), { algorithm: null, start: initial.start, episode: initial.episode });
  await page.locator('#patient-info-display').tap();
  await page.locator('#patient-modal.show').waitFor();
  assert.equal(await page.locator('#patient-other-protocol').isChecked(), true, 'Editing must not apply a new adult default');
  assert.equal(await page.locator('#patient-name').inputValue(), 'PACIENTE SINTETICO');
  await page.locator('#cancel-patient-btn').tap();
  // End only this disposable synthetic case. Report/history persistence is covered
  // by the existing regressions; suppress export UI here, without changing app code.
  await page.evaluate(() => {
    const report = window.generateEvolution;
    try { window.generateEvolution = () => {}; window.executePCRFinish(); window.showScreen('home'); }
    finally { window.generateEvolution = report; }
  });
  await open();
  assert.equal(await page.locator('#patient-name').inputValue(), '');
  assert.equal(await page.locator('#patient-adult-protocol').isChecked(), true);
  await page.locator('#patient-other-protocol').check();
  assert.equal(await page.locator('#patient-start-btn').textContent(), 'INICIAR ATENDIMENTO');
  await page.locator('#patient-start-btn').tap();
  await page.waitForFunction(() => window.SIAV.state.pcrActive);
  assert.equal(await page.evaluate(() => window.SIAV.state.patient.algorithm), null, 'A manual nonadult/unknown choice must never fall back to adult');
}
