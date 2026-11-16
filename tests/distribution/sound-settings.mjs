import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(x => Number(x) / 255)
  .map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4)
  .reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0);
const ratio = (a, b) => {
  const [x, y] = [a, b].map(luminance);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
};

// Disposable browser preferences and observed audio calls, without backend access.
export async function checkSoundSettings(page) {
  const modal = page.locator('#sound-settings-modal');
  const directory = process.env.SIAV_SOUND_SCREENSHOTS_DIR;
  if (directory) await mkdir(directory, { recursive: true });
  const capture = async name => {
    if (directory) await page.screenshot({ path: join(directory, `${name}.png`), animations: 'disabled', scale: 'css' });
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
    const loaded = page.waitForEvent('console', { predicate: message => message.text().includes('Configurações de som carregadas') });
    await page.locator('[onclick="openSoundSettings()"]').tap();
    await loaded;
    await settled('#sound-settings-modal.show');
    await modal.locator('.sound-settings-content').evaluate(el => { el.scrollTop = 0; });
    assert.deepEqual(await page.locator('.modal.show').evaluateAll(xs => xs.map(x => x.id)), ['sound-settings-modal']);
  };
  const contrast = async () => {
    const colors = await modal.locator('h3, h4, p, .setting-label, button, select, #volume-value').evaluateAll(xs => xs.map(el => {
      const s = getComputedStyle(el); let parent = el;
      while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)') parent = parent.parentElement;
      return { text: el.textContent.trim().slice(0, 32), ink: s.color, surface: getComputedStyle(parent).backgroundColor };
    }));
    for (const { text, ink, surface } of colors) assert.ok(ratio(ink, surface) >= 4.5, `Sound contrast: ${text} / ${ink} / ${surface}`);
  };
  for (const width of [320, 360, 375, 390, 414, 430, 768]) {
    await page.setViewportSize({ width, height: width === 768 ? 1024 : Math.max(568, width * 2) });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => window.setTheme(t), theme);
      await open();
      if ([320, 390].includes(width)) await capture(`sounds-${width}-${theme}-top`);
      const layout = await modal.evaluate(el => {
        const box = selector => { const r = el.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
        const s = getComputedStyle(el.querySelector('.sound-settings-header'));
        return { header: box('.sound-settings-header'), title: box('h3'), close: box('.close-btn'),
          toggle: box('.switch'), track: box('.slider'), row: box('.setting-row'),
          footer: box('.sound-settings-footer'), scroll: box('.sound-settings-content'),
          background: s.backgroundColor, gradient: s.backgroundImage, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      console.log(`Sound layout ${width}/${theme}: header=${layout.header.height}, toggle=${layout.toggle.width}x${layout.toggle.height}, track=${layout.track.width}x${layout.track.height}`);
      assert.ok(layout.header.height <= 120, 'Sound header must remain compact on a narrow phone');
      assert.equal(layout.gradient, 'none', 'Sound header must use the shared palette');
      assert.equal(layout.background, theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(30, 41, 59)');
      assert.ok(layout.title.right <= layout.close.x - 8, 'Title must reserve room for closing');
      assert.ok(layout.toggle.width >= 44 && layout.toggle.width <= 60 && layout.toggle.height >= 44 && layout.toggle.height <= 48, 'Compact toggle must retain a touch target');
      assert.ok(layout.track.width <= 52 && layout.track.height <= 30, 'Visual switch must not stretch');
      assert.ok(layout.row.height <= 64, 'Activation row must stay on one line');
      assert.equal(layout.overflow, false);
      assert.ok(layout.footer.bottom <= page.viewportSize().height && layout.footer.y >= layout.scroll.bottom - 1, 'Actions must stay visible outside the scrolling body');
      assert.ok(layout.close.width >= 44 && layout.close.height >= 44);
      const invalid = await modal.locator('button, select').evaluateAll(xs => xs.filter(x => {
        const b = x.getBoundingClientRect(); return b.height < 44 || x.scrollWidth > x.clientWidth + 1 || x.scrollHeight > x.clientHeight + 1;
      }).map(x => x.textContent.trim().slice(0, 32)));
      assert.deepEqual(invalid, [], 'All sound actions must fit and remain usable by touch');
      const shadows = await modal.locator('#volume-slider, .sound-select').evaluateAll(xs => xs.map(x => getComputedStyle(x).boxShadow));
      assert.ok(shadows.every(value => value === 'none'), 'Sound fields must not inherit unrelated modal shadows');
      await contrast();
      await modal.locator('#metronome-sound-select').scrollIntoViewIfNeeded();
      if ([320, 390].includes(width)) await capture(`sounds-${width}-${theme}-bottom`);
      await modal.locator('.btn-back').tap();
      await settled('#settings-menu-modal.show');
      await page.locator('#settings-menu-modal .close-btn').tap();
      await page.waitForFunction(() => !document.querySelector('.modal.show'));
    }
  }
  await page.setViewportSize({ width: 390, height: 780 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open();
  const animations = await modal.locator('*').evaluateAll(xs => xs.flatMap(x => [getComputedStyle(x).animationName, getComputedStyle(x, '::before').animationName]));
  assert.ok(animations.every(value => value === 'none'), 'Sound panel must respect reduced motion');
  const toggle = page.locator('#sounds-enabled-toggle');
  await toggle.uncheck();
  assert.equal(await page.evaluate(() => window.getSoundSettings().enabled), false);
  assert.equal(await modal.locator('.sound-setting-group.disabled').count(), 5);
  const off = await modal.locator('.slider').evaluate(el => ({ track: getComputedStyle(el).backgroundColor, thumb: getComputedStyle(el, '::before').backgroundColor }));
  assert.ok(ratio(off.track, off.thumb) >= 3, 'Off switch needs a distinguishable thumb');
  await toggle.check();
  assert.equal(await page.evaluate(() => window.getSoundSettings().enabled), true);
  assert.equal(await modal.locator('.sound-setting-group.disabled').count(), 0);
  const range = page.locator('#volume-slider');
  await range.focus(); await range.press('Home');
  for (let i = 0; i < 4; i++) await range.press('ArrowRight');
  assert.equal(await page.locator('#volume-value').textContent(), '4%');
  assert.equal(await page.evaluate(() => window.getSoundSettings().volume), 4);
  await page.evaluate(() => {
    window.__soundPreviews = [];
    window.Audio = class {
      constructor(path) { this.path = path; window.__soundPreviews.push(this); }
      play() { this.played = true; return Promise.resolve(); }
      pause() { this.paused = true; }
    };
  });
  const selection = { shock: 'shocks/shock-2.mp3', alert: 'alerts/alert-3.mp3', drug: 'drugs/drug-2.mp3', metronome: 'metronome/metronome-2.wav' };
  for (const [type, path] of Object.entries(selection)) {
    const value = `sounds/library/${path}`;
    await page.locator(`#${type}-sound-select`).selectOption(value);
    await page.locator(`[onclick="previewSound('${type}')"]`).tap();
    assert.deepEqual(await page.evaluate(() => {
      const audio = window.__soundPreviews.at(-1); return { path: audio.path, played: audio.played, volume: audio.volume };
    }), { path: value, played: true, volume: .04 });
    await contrast();
    await page.evaluate(() => window.__soundPreviews.at(-1).onended());
    assert.equal(await modal.locator('.preview-btn.playing').count(), 0);
  }
  const upload = page.waitForEvent('filechooser');
  await page.locator('#upload-shock-sound + .upload-btn').tap();
  assert.equal(await (await upload).element().getAttribute('id'), 'upload-shock-sound');
  const cancelledRestore = page.waitForEvent('dialog').then(dialog => dialog.dismiss());
  await modal.locator('.btn-reset').tap(); await cancelledRestore;
  assert.equal(await page.evaluate(() => window.getSoundSettings().volume), 4);
  await modal.locator('.btn-save-sounds').tap();
  await page.waitForFunction(() => document.querySelector('.btn-save-sounds').textContent.includes('Salvo!'));
  await contrast();
  await settled('#settings-menu-modal.show');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('siav_sound_settings')).volume), 4);
  await page.locator('#settings-menu-modal .close-btn').tap();
  await page.waitForFunction(() => !document.querySelector('.modal.show'));
  await open();
  for (const [type, path] of Object.entries(selection)) assert.equal(await page.locator(`#${type}-sound-select`).inputValue(), `sounds/library/${path}`);
  assert.equal(await range.inputValue(), '4');
  await modal.locator('.close-btn').tap();
  await page.waitForFunction(() => !document.querySelector('.modal.show'));
}
