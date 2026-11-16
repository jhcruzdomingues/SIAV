import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkProfileAuth(page) {
  const directory = process.env.SIAV_PROFILE_SCREENSHOTS_DIR;
  if (directory) await mkdir(directory, { recursive: true });
  const capture = async (width, theme, view) => {
    if (directory && [320, 390].includes(width)) await page.screenshot({
      path: join(directory, `profile-${width}-${theme}-${view}.png`), animations: 'disabled' });
  };
  const oneModal = async id => {
    await page.locator(`#${id}.show`).waitFor();
    assert.deepEqual(await page.locator('.modal.show').evaluateAll(xs => xs.map(x => x.id)), [id]);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${id}: horizontal overflow`);
    const close = page.locator(`#${id} .close-btn`);
    if (await close.count()) {
      const invalid = await close.evaluateAll(xs => xs.filter(x => x.scrollHeight > x.clientHeight + 1 || x.scrollWidth > x.clientWidth + 1).map(x => x.textContent));
      assert.deepEqual(invalid, [], 'Close controls must remain legible');
    }
  };
  const noClip = async selector => {
    const clipped = await page.locator(selector).evaluateAll(xs => xs.filter(x => x.getClientRects().length && x.clientWidth &&
      (x.scrollWidth > x.clientWidth + 1 || x.scrollHeight > x.clientHeight + 1)).map(x => x.id));
    assert.deepEqual(clipped, [], `Clipped controls: ${selector}`);
  };
  const readableButtons = async selector => {
    const colors = await page.locator(selector).evaluateAll(xs => xs.filter(x => x.getClientRects().length).map(x => {
      const s = getComputedStyle(x); return [s.color, s.backgroundColor];
    }));
    const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(x => Number(x) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((v, x, i) => v + x * [.2126, .7152, .0722][i], 0);
    for (const pair of colors) {
      const [a, b] = pair.map(luminance);
      assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, `Unreadable button ${selector}: ${pair}`);
    }
  };
  const remoteRequests = [];
  page.on('request', request => { if (new URL(request.url()).hostname.endsWith('.supabase.co')) remoteRequests.push(request.url()); });
  for (const width of [320, 360, 375, 390, 414, 430, 768]) {
    await page.setViewportSize({ width, height: width === 768 ? 1024 : Math.max(568, width * 2) });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => window.setTheme(t), theme);
      const gear = await page.locator('#settings-btn').evaluate(el => {
        const svg = el.querySelector('svg'); const b = el.getBoundingClientRect(); const s = svg?.getBoundingClientRect();
        return { accessibleName: el.getAttribute('aria-label'), buttonWidth: b.width, buttonHeight: b.height, iconWidth: s?.width, iconHeight: s?.height };
      });
      assert.equal(gear.accessibleName, 'Configurações');
      assert.ok(gear.buttonWidth >= 44 && gear.buttonHeight >= 44 && gear.iconWidth === 22 && gear.iconHeight === 22);
      await readableButtons('#settings-btn');
      if (directory && [320, 390].includes(width)) await page.locator('.app-container > header').screenshot({ path: join(directory, `settings-${width}-${theme}.png`) });
      await page.locator('#settings-btn').tap();
      await oneModal('settings-menu-modal');
      await page.locator('[onclick="openProfileSettings()"]').tap();
      await oneModal('profile-modal');
      assert.equal(await page.locator('#profile-login-btn').textContent().then(x => x.trim()), 'FAZER LOGIN');
      assert.equal(await page.locator('#profile-register-btn').isVisible(), true);
      await readableButtons('#profile-login-btn, #profile-register-btn');
      const header = await page.locator('#profile-modal .profile-header').evaluate(el => {
        const text = el.querySelector('.profile-header-content').getBoundingClientRect();
        const close = el.querySelector('.close-btn').getBoundingClientRect();
        return { textRight: text.right, closeLeft: close.left };
      });
      assert.ok(header.textRight <= header.closeLeft - 4, 'Header must reserve space for closing the profile');
      await noClip('#profile-login-btn, #profile-register-btn, #profile-modal .profile-hint');
      await capture(width, theme, 'login');
      await page.locator('#profile-register-btn').tap();
      await oneModal('register-modal');
      assert.equal((await page.locator('#register-intro').textContent()).trim(), 'CRIE UMA CONTA É RÁPIDO E GRÁTIS! 😉');
      const invitationStyle = await page.locator('#auth-notice').evaluate(el => {
        const s = getComputedStyle(el); return { background: s.backgroundColor, border: s.borderTopColor, color: s.color, visible: !el.hidden };
      });
      assert.deepEqual(invitationStyle, { background: 'rgb(236, 253, 245)', border: 'rgb(22, 101, 52)', color: 'rgb(20, 83, 45)', visible: true });
      if (directory && width === 390 && theme === 'light') await page.locator('#auth-notice').screenshot({ path: join(directory, 'registration-invite-green.png'), timeout: 5000 });
      await page.locator('#register-profession').selectOption('Médico(a)');
      assert.equal(await page.locator('#register-council').isEnabled(), true);
      assert.match(await page.locator('#register-council-label').textContent(), /CRM/);
      if (directory && width === 390 && theme === 'dark') await page.screenshot({ path: join(directory, 'registration-390-dark-crm.png'), animations: 'disabled' });
      await page.locator('#register-council').fill('CRM-SINTETICO');
      await page.locator('#register-profession').selectOption('Estudante');
      assert.equal(await page.locator('#register-council').isDisabled(), true);
      assert.equal(await page.locator('#register-council').inputValue(), '');
      await noClip('#register-intro, #register-back-login-btn');
      await readableButtons('#register-form-full button[type=submit], #register-back-login-btn');
      if (width <= 430) {
        const fields = await page.locator('#register-form-full .form-row input').evaluateAll(xs => xs.map(x => ({ x: x.getBoundingClientRect().x, width: x.getBoundingClientRect().width })));
        assert.ok(Math.abs(fields[0].x - fields[1].x) < 1 && Math.abs(fields[0].width - fields[1].width) < 1, 'Narrow registration fields must remain readable in full-width rows');
      }
      await capture(width, theme, 'register');
      await page.locator('#register-back-login-btn').tap();
      await oneModal('login-modal');
      await page.locator('#login-open-register-btn').tap();
      await oneModal('register-modal');
      await page.locator('#register-modal [data-close-modal]').tap();
      await page.waitForFunction(() => !document.querySelector('.modal.show'));
    }
  }
  // The existing distribution SDK deliberately rejects auth calls. Exercise only
  // controlled error UX; no remote account is created and no session is fabricated.
  await page.locator('#settings-btn').tap(); await oneModal('settings-menu-modal');
  await page.locator('[onclick="openProfileSettings()"]').tap(); await oneModal('profile-modal');
  await page.locator('#login-email').fill('sintetico@example.invalid');
  await page.locator('#login-password').fill('SENHA_SINTETICA');
  await page.locator('#profile-login-btn').tap();
  await page.locator('#login-feedback:not([hidden])').waitFor();
  assert.equal(await page.locator('#profile-login-btn').isEnabled(), true);
  assert.equal(await page.evaluate(() => window.SIAV.state.currentUser.isLoggedIn), false);
  await page.locator('#profile-register-btn').tap(); await oneModal('register-modal');
  await page.locator('#register-name').fill('Pessoa Sintética');
  await page.locator('#register-profession').selectOption('Estudante');
  await page.locator('#register-email').fill('sintetico@example.invalid');
  await page.locator('#register-password').fill('SENHA_SINTETICA');
  await page.evaluate(() => {
    const original = window.SIAV.supabase.auth.signUp;
    window.__registrationTestCalls = 0;
    window.SIAV.supabase.auth.signUp = (...args) => { window.__registrationTestCalls++; return original(...args); };
  });
  await page.locator('#register-password-confirm').fill('SENHA_DIFERENTE');
  await page.locator('#register-form-full button[type=submit]').tap();
  assert.equal(await page.evaluate(() => window.__registrationTestCalls), 0);
  assert.match(await page.locator('#register-password-confirm').evaluate(el => el.validationMessage), /As senhas não coincidem/);
  await page.locator('#register-password-confirm').fill('SENHA_SINTETICA');
  await page.locator('#register-form-full button[type=submit]').tap();
  await page.locator('#register-feedback:not([hidden])').waitFor();
  assert.equal(await page.locator('#register-form-full button[type=submit]').isEnabled(), true);
  assert.equal(await page.evaluate(() => window.__registrationTestCalls), 1);
  if (directory) await page.screenshot({ path: join(directory, 'registration-password-confirm.png'), animations: 'disabled' });
  assert.equal(await page.evaluate(() => window.SIAV.state.currentUser.isLoggedIn), false);
  await page.locator('#register-back-login-btn').tap(); await oneModal('login-modal');
  // An ambiguous server error keeps the login open and offers explicit registration.
  await page.evaluate(() => {
    window.SIAV.supabase.auth.signInWithPassword = async () => ({ data: { session: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' } });
  });
  await page.locator('#login-email-modal').fill('sintetico@example.invalid');
  await page.locator('#login-password-modal').fill('SENHA_SINTETICA');
  await page.locator('#login-form-simple button[type=submit]').tap();
  await oneModal('login-modal');
  await page.locator('#auth-notice:not([hidden])').waitFor();
  assert.match(await page.locator('#auth-notice').textContent(), /Confira seu e-mail e sua senha/);
  const noticeStyle = await page.locator('#auth-notice').evaluate(el => {
    const s = getComputedStyle(el); return { background: s.backgroundColor, border: s.borderTopColor, color: s.color };
  });
  assert.deepEqual(noticeStyle, { background: 'rgb(254, 242, 242)', border: 'rgb(153, 27, 27)', color: 'rgb(127, 29, 29)' });
  await page.setViewportSize({ width: 390, height: 844 });
  if (directory) await page.locator('#auth-notice').screenshot({
    path: join(directory, 'profile-390-dark-notice.png'), animations: 'disabled', timeout: 5000 });
  await page.locator('#auth-notice').waitFor({ state: 'hidden', timeout: 8000 });
  assert.deepEqual(remoteRequests, []);
}
