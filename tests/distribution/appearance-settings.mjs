import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkAppearanceSettings(page) {
  const modal = page.locator('#theme-settings-modal');
  const directory = process.env.SIAV_APPEARANCE_SCREENSHOTS_DIR;
  if (directory) await mkdir(directory, { recursive: true });
  const capture = async name => {
    if (directory) await page.screenshot({ path: join(directory, `${name}.png`), scale: 'css', animations: 'disabled' });
  };
  const settled = async selector => {
    await page.locator(selector).waitFor();
    await page.locator(selector).evaluate(async el => {
      await Promise.all([...el.getAnimations(), ...el.querySelector('.modal-content').getAnimations()]
        .map(animation => animation.finished.catch(() => {})));
    });
  };
  const open = async () => {
    await page.locator('#settings-btn').tap();
    await settled('#settings-menu-modal.show');
    await page.locator('[onclick="openThemeSettings()"]').tap();
    await settled('#theme-settings-modal.show');
    assert.deepEqual(await page.locator('.modal.show').evaluateAll(xs => xs.map(x => x.id)), ['theme-settings-modal']);
  };
  const contrast = async () => {
    const colors = await modal.locator('h3, p, .appearance-option-name, .appearance-option-description, .appearance-done-btn, .close-btn').evaluateAll(xs => xs.map(el => {
      const s = getComputedStyle(el); let parent = el;
      while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)') parent = parent.parentElement;
      return { text: el.textContent.trim(), ink: s.color, surface: getComputedStyle(parent).backgroundColor };
    }));
    const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(x => Number(x) / 255)
      .map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4)
      .reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0);
    for (const item of colors) {
      const [a, b] = [item.ink, item.surface].map(luminance);
      assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, `Appearance contrast: ${JSON.stringify(item)}`);
    }
  };
  for (const width of [320, 360, 375, 390, 414, 430, 768]) {
    await page.setViewportSize({ width, height: width === 768 ? 1024 : Math.max(568, width * 2) });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => window.setTheme(value), theme);
      await open();
      if ([320, 390].includes(width)) await capture(`appearance-${width}-${theme}`);
      const heights = await modal.locator('.theme-option').evaluateAll(xs => xs.map(x => x.getBoundingClientRect().height));
      console.log(`Appearance ${width}/${theme}: option heights ${heights.join(', ')}`);
      assert.ok(heights.every(height => height >= 44 && height <= 88), 'Appearance options must be compact touch rows');
      assert.equal(await modal.locator('button.theme-option').count(), 3, 'All themes need native keyboard/touch buttons');
      const layout = await modal.evaluate(el => {
        const box = selector => { const r = el.querySelector(selector).getBoundingClientRect(); return { x: r.x, right: r.right, y: r.y, bottom: r.bottom, height: r.height }; };
        return { header: box('.appearance-header'), title: box('h3'), close: box('.close-btn'), footer: box('.appearance-footer'),
          panelWidth: el.querySelector('.modal-content').getBoundingClientRect().width, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.ok(layout.header.height <= 120 && layout.panelWidth <= 440);
      assert.ok(layout.title.right <= layout.close.x - 8);
      assert.ok(layout.close.height >= 44 && layout.footer.bottom <= page.viewportSize().height);
      assert.equal(layout.overflow, false);
      const clipped = await modal.locator('button, .appearance-option-name, .appearance-option-description').evaluateAll(xs => xs.filter(x => x.scrollHeight > x.clientHeight + 1 || x.scrollWidth > x.clientWidth + 1).map(x => x.textContent.trim()));
      assert.deepEqual(clipped, [], 'Appearance labels and actions must not be clipped');
      const selected = modal.locator('.theme-option.active');
      assert.equal(await selected.count(), 1);
      assert.equal(await selected.getAttribute('id'), `theme-${theme}`);
      assert.equal(await selected.getAttribute('aria-pressed'), 'true');
      assert.equal(await selected.evaluate(el => getComputedStyle(el).backgroundImage), 'none');
      await contrast();
      await modal.locator('.close-btn').tap();
      await page.waitForFunction(() => !document.querySelector('.modal.show'));
    }
  }
  await page.setViewportSize({ width: 390, height: 780 });
  await open();
  await page.locator('#theme-light').tap();
  await page.locator('#theme-dark').focus(); await page.locator('#theme-dark').press('Space');
  assert.equal(await page.locator('body').getAttribute('data-theme'), 'dark');
  assert.equal(await page.evaluate(() => localStorage.getItem('siav_theme')), 'dark');
  assert.equal(await page.locator('#theme-dark').getAttribute('aria-pressed'), 'true');
  await modal.locator('.appearance-done-btn').tap();
  await page.waitForFunction(() => !document.querySelector('.modal.show'));
  await open();
  assert.equal(await page.locator('#theme-dark').getAttribute('aria-pressed'), 'true');
  await modal.locator('.close-btn').tap();
  await page.reload();
  await page.waitForFunction(() => document.readyState === 'complete' && window.SIAV && typeof window.openSettingsMenu === 'function');
  assert.equal(await page.locator('body').getAttribute('data-theme'), 'dark');
  await open();
  assert.equal(await page.locator('#theme-dark').getAttribute('aria-pressed'), 'true');
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.locator('#theme-auto').tap();
  assert.equal(await page.evaluate(() => localStorage.getItem('siav_theme')), 'auto');
  assert.equal(await page.locator('#theme-auto').getAttribute('aria-pressed'), 'true');
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.waitForFunction(value => document.body.getAttribute('data-theme') === value, scheme);
    await contrast();
    assert.equal(await page.locator('#theme-auto').getAttribute('aria-pressed'), 'true');
    await capture(`appearance-auto-${scheme}`);
  }
  await page.locator('#theme-dark').tap();
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  assert.equal(await page.locator('body').getAttribute('data-theme'), 'dark', 'A manual theme must remain explicit');
  const animations = await modal.locator('*').evaluateAll(xs => xs.flatMap(x => [getComputedStyle(x).animationName, getComputedStyle(x, '::before').animationName, getComputedStyle(x, '::after').animationName]));
  assert.ok(animations.every(value => value === 'none'));
  await modal.locator('.appearance-done-btn').tap();
  await page.waitForFunction(() => !document.querySelector('.modal.show'));
}
