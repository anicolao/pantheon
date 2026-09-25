import { expect, test } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

const ready = async (page: import('@playwright/test').Page) => expect(page.locator('[data-status]')).toHaveAttribute('data-status', 'synced');

test('gather two players, share an invitation and return to the same seats', async ({ page, browser }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const steps = new TestStepHelper(page, info, 'Gather at the Table');
  await page.goto('./play/');
  await ready(page);
  await steps.step('choose-gathering', 'Choose your gathering', [
    { spec: 'Two seats are selected, and the name plate is ready.', check: async () => { await expect(page.getByRole('radio', { name: '2 players', exact: true })).toBeChecked(); await expect(page.getByLabel('Your name', { exact: true })).toBeEnabled(); } },
    { spec: 'The screen speaks to the player and shows no undealt cards.', check: async () => { await expect(page.locator('main')).not.toContainText(/firestore|browser|reload|anonymously|milestone|coming soon/i); await expect(page.locator('main [data-card-id]')).toHaveCount(0); } }
  ]);
  await page.getByLabel('Your name', { exact: true }).fill('   ');
  await page.getByRole('button', { name: 'Create table', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Choose a name.');
  await expect(page.getByLabel('Your name', { exact: true })).toBeFocused();
  await page.getByLabel('Your name', { exact: true }).fill('Ariadne');
  await page.keyboard.press('Enter');
  await steps.step('created', 'Take your seat at a two-player table', [
    { spec: 'The creator occupies the host seat and one seat remains.', check: async () => { await expect(page.getByTestId('player-seat')).toHaveCount(1); await expect(page.getByTestId('player-seat')).toContainText('You · Host'); await expect(page.getByText('Waiting for a player')).toHaveCount(1); } }
  ]);
  const invitation = page.url();
  await page.getByRole('button', { name: 'Table details' }).click();
  await steps.step('details', 'Inspect the gathering’s supply', [
    { spec: 'Two-player supply and the ten-card starting inventory match the rules.', check: async () => { await expect(page.locator('.supply dd')).toHaveText(['6', '8', '40 / 30 / 20']); await expect(page.locator('figcaption')).toHaveText(['6 Obols', '3 Hamlets']); await expect(page.getByRole('dialog')).toContainText('1 matching Temple'); } }
  ]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Table details' })).toBeFocused();
  await page.getByRole('button', { name: 'Invite friends', exact: true }).click();
  await steps.step('invitation', 'Invite friends with the wax seal', [
    { spec: 'The invitation opens a focused, dismissible sharing control.', check: async () => expect(page.getByRole('dialog', { name: 'Invite friends' })).toBeVisible() }
  ]);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy invitation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Invitation copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(invitation);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Invite friends', exact: true })).toBeFocused();
  const guest = await browser.newContext({ viewport: info.project.use.viewport, reducedMotion: 'reduce' });
  try {
    const other = await guest.newPage();
    await other.goto(invitation);
    await other.getByLabel('Your name', { exact: true }).fill('Theseus');
    await other.getByRole('button', { name: 'Join table', exact: true }).click();
    await expect(other.getByTestId('player-seat')).toHaveCount(2);
    await steps.step('joined', 'Welcome another player to the table', [
      { spec: 'The remote arrival fills the second seat and names the action once.', check: async () => { await expect(page.getByTestId('player-seat')).toHaveCount(2); await expect(page.getByTestId('latest-activity')).toHaveText('Theseus joined the table.'); await expect(page.getByText('2 players · Everyone is here')).toBeVisible(); } }
    ]);
    await page.reload();
    await ready(page);
    await expect(page.getByTestId('player-seat')).toHaveCount(2);
    await expect(page.getByTestId('latest-activity')).toHaveText('Theseus joined the table.');
    await expect(page.getByTestId('player-seat').first()).toContainText('You · Host');
    // Identity, rather than a remembered display name, restores membership.
    await other.evaluate(() => localStorage.removeItem('pantheon:name'));
    await other.reload();
    await ready(other);
    await expect(other.getByTestId('player-seat')).toHaveCount(2);
    await expect(other.getByTestId('player-seat').last()).toContainText('You');
    expect(errors).toEqual([]);
    steps.generateDocs();
  } finally { await guest.close(); }
});

test('four seats fill through ordered remote arrivals and respect reduced motion', async ({ page, browser }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    (window as unknown as { motions: number[] }).motions = [];
    Element.prototype.animate = function (frames, options) {
      if (this.matches('[data-testid="seat-arrival"], [data-testid="latest-activity"]')) (window as unknown as { motions: number[] }).motions.push(typeof options === 'number' ? options : Number(options?.duration ?? 0));
      return animate.call(this, frames, options);
    };
  });
  await page.goto('./play/');
  await page.getByLabel('Your name', { exact: true }).fill('Ariadne');
  await page.getByRole('radio', { name: '4 players', exact: true }).check();
  await page.getByRole('button', { name: 'Create table', exact: true }).click();
  await expect(page.getByTestId('player-seat')).toHaveCount(1);
  await page.evaluate(async () => { await Promise.all(document.getAnimations().map(a => a.finished)); (window as unknown as { motions: number[] }).motions = []; });
  const guests = [];
  try {
    for (const name of ['Theseus', 'Iris', 'Leon']) {
      const context = await browser.newContext(); guests.push(context);
      const other = await context.newPage();
      await other.goto(page.url());
      await other.getByLabel('Your name', { exact: true }).fill(name);
      await other.getByRole('button', { name: 'Join table', exact: true }).click();
      await expect(page.getByTestId('player-seat')).toHaveCount(guests.length + 1);
      await expect(page.getByTestId('latest-activity')).toHaveText(`${name} joined the table.`);
    }
    await expect.poll(() => page.evaluate(() => (window as unknown as { motions: number[] }).motions.filter(n => n === 450).length)).toBe(6);
    const steps = new TestStepHelper(page, info, 'Four-player gathering');
    await steps.step('four-player', 'Gather all four players', [
      { spec: 'Every player has a named medallion, and all seats are filled.', check: async () => { await expect(page.getByTestId('player-seat')).toHaveCount(4); await expect(page.getByText('Waiting for a player')).toHaveCount(0); } }
    ]);
    await page.getByRole('button', { name: 'Table details' }).click();
    await expect(page.locator('.supply dd')).toHaveText(['12', '16', '40 / 30 / 20']);
    await page.keyboard.press('Escape');
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.reload(); await ready(page);
    expect(await page.evaluate(() => (window as unknown as { motions: number[] }).motions.every(n => n === 0))).toBe(true);
  } finally { await Promise.all(guests.map(context => context.close())); }
});

test('three-player gathering provides a selectable invitation when copying is unavailable', async ({ page }, info) => {
  await page.goto('./play/');
  await page.getByLabel('Your name', { exact: true }).fill('Alexandros of Samothrace');
  await page.getByRole('radio', { name: '3 players', exact: true }).check();
  await page.getByRole('button', { name: 'Create table', exact: true }).click(); await ready(page);
  await expect(page.getByTestId('player-seat')).toHaveCount(1);
  await expect(page.getByText('Waiting for a player')).toHaveCount(2);
  const steps = new TestStepHelper(page, info, 'Three-player gathering and long names');
  await steps.step('three-player', 'Keep a long player name inside its nameplate', [
    { spec: 'The complete name fits the plate without clipping or truncation.', check: async () => {
      const fits = await page.locator('.plate h2').evaluate(element => {
        const text = document.createRange(); text.selectNodeContents(element);
        const outer = element.parentElement!.getBoundingClientRect();
        return [...text.getClientRects()].every(rect => rect.left >= outer.left && rect.right <= outer.right && rect.top >= outer.top && rect.bottom <= outer.bottom);
      });
      expect(fits).toBe(true);
    } }
  ]);
  await page.getByRole('button', { name: 'Table details' }).click();
  await expect(page.locator('.supply dd')).toHaveText(['9', '12', '40 / 30 / 20']);
  await page.keyboard.press('Escape');
  await page.evaluate(() => { Object.defineProperty(navigator.clipboard, 'writeText', { value: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) }); });
  await page.getByRole('button', { name: 'Invite friends', exact: true }).click();
  await page.getByRole('button', { name: 'Copy invitation', exact: true }).click();
  const input = page.getByLabel('Your invitation', { exact: true });
  await expect(input).toHaveValue(page.url()); await expect(input).toBeFocused();
  expect(await input.evaluate((element: HTMLInputElement) => element.selectionEnd! - element.selectionStart!)).toBe(page.url().length);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Invite friends', exact: true })).toBeFocused();
});

test('full and missing invitations offer working recovery paths', async ({ page, browser }, info) => {
  await page.goto('./play/'); await page.getByLabel('Your name', { exact: true }).fill('Ariadne');
  await page.getByRole('button', { name: 'Create table', exact: true }).click(); await expect(page.getByTestId('player-seat')).toHaveCount(1);
  const url = page.url(); const contexts = [];
  try {
    const guest = await browser.newContext(); contexts.push(guest); const other = await guest.newPage(); await other.goto(url);
    await other.getByLabel('Your name', { exact: true }).fill('Theseus'); await other.getByRole('button', { name: 'Join table', exact: true }).click(); await expect(other.getByTestId('player-seat')).toHaveCount(2);
    const outsider = await browser.newContext({ viewport: info.project.use.viewport, reducedMotion: 'reduce' }); contexts.push(outsider);
    const rejected = await outsider.newPage(); await rejected.goto(url);
    const steps = new TestStepHelper(rejected, info, 'Invitation recovery');
    await steps.step('full', 'Find a new gathering when every seat is taken', [
      { spec: 'The full invitation is explained without exposing service details.', check: async () => { await expect(rejected.getByRole('heading', { name: 'This table is full.' })).toBeVisible(); await expect(rejected.getByRole('button', { name: 'Join table' })).toHaveCount(0); } }
    ]);
    await rejected.getByRole('link', { name: 'Find another table' }).click();
    await expect(rejected.getByLabel('Your name', { exact: true })).toBeEnabled();
    for (const id of ['missing-gathering', '../bad/invitation']) {
      await rejected.goto(new URL(`./play/?room=${encodeURIComponent(id)}`, info.project.use.baseURL).href);
      await expect(rejected.getByRole('heading', { name: 'This invitation was not found.' })).toBeVisible();
    }
    await steps.step('missing', 'Recover from a missing invitation', [
      { spec: 'The player can request a new invitation or return to the sanctuary.', check: async () => expect(rejected.getByText('Ask your friend for a new invitation.')).toBeVisible() }
    ]);
    await rejected.getByRole('link', { name: 'Back', exact: true }).click(); await expect(rejected.getByRole('link', { name: 'Play', exact: true })).toBeVisible();
  } finally { await Promise.all(contexts.map(context => context.close())); }
});

test('a gathering retains its seats across an interruption', async ({ page, context }, info) => {
  await page.goto('./play/'); await page.getByLabel('Your name', { exact: true }).fill('Ariadne');
  await page.getByRole('button', { name: 'Create table', exact: true }).click(); await expect(page.getByTestId('player-seat')).toHaveCount(1); await ready(page);
  await page.evaluate(async () => { await Promise.all([...document.images].map(image => image.decode())); const skin = new Image(); skin.src = document.querySelector<HTMLLinkElement>('link[rel=preload][as=image]')!.href; await skin.decode(); });
  await context.setOffline(true);
  const steps = new TestStepHelper(page, info, 'Gathering connection recovery', 'disconnected');
  await steps.step('interrupted', 'Keep your seat while the connection returns', [
    { spec: 'The table stays recognizable and a real retry is available.', check: async () => { await expect(page.getByRole('status')).toContainText('Your place is kept.'); await expect(page.getByTestId('player-seat')).toHaveCount(1); } }
  ]);
  await context.setOffline(false); await ready(page);
  await expect(page.getByTestId('player-seat')).toHaveCount(1);
  await expect(page.getByTestId('latest-activity')).toHaveText('Ariadne created the table.');
});

test('two guests competing for the last seat cannot overfill the table', async ({ page, browser }) => {
  await page.goto('./play/'); await page.getByLabel('Your name', { exact: true }).fill('Ariadne');
  await page.getByRole('button', { name: 'Create table', exact: true }).click(); await expect(page.getByTestId('player-seat')).toHaveCount(1);
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  try {
    const guests = await Promise.all(contexts.map(context => context.newPage()));
    await Promise.all(guests.map(async (guest, i) => { await guest.goto(page.url()); await guest.getByLabel('Your name', { exact: true }).fill(['Theseus', 'Iris'][i]); }));
    await Promise.all(guests.map(guest => guest.getByRole('button', { name: 'Join table', exact: true }).click()));
    await expect(page.getByTestId('player-seat')).toHaveCount(2);
    await expect.poll(async () => (await Promise.all(guests.map(guest => guest.getByRole('heading', { name: 'This table is full.' }).count()))).reduce((sum, count) => sum + count, 0)).toBe(1);
    await page.reload(); await ready(page); await expect(page.getByTestId('player-seat')).toHaveCount(2);
  } finally { await Promise.all(contexts.map(context => context.close())); }
});

test('a failed initial sign-in can be retried without losing the gathering', async ({ page, context }) => {
  await context.route('http://127.0.0.1:9293/**', route => route.abort());
  await page.goto('./play/');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/firebase|firestore|auth\/|network-request|browser/i);
  await context.unroute('http://127.0.0.1:9293/**');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByLabel('Your name', { exact: true })).toBeEnabled();
  await page.getByLabel('Your name', { exact: true }).fill('Ariadne');
  await page.getByRole('button', { name: 'Create table', exact: true }).click();
  await expect(page.getByTestId('player-seat')).toHaveCount(1);
});
