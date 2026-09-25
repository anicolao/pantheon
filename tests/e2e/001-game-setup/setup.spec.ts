import { expect, test } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

test('anonymous players create, join and restore an event-backed setup', async ({ page, browser }, info) => {
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  const steps = new TestStepHelper(page, info, 'Anonymous sign-in and shared game setup');
  await page.goto('./play/');
  await steps.step('signed-in', 'Sign in without an account', [
    { spec: 'Anonymous authentication is ready before creating a table.', check: async () => expect(page.getByRole('status')).toHaveText('Signed in anonymously · Connected') },
    { spec: 'A name is required.', check: async () => expect(page.getByRole('button', { name: 'Create table' })).toBeDisabled() }
  ]);
  await page.getByLabel('Your name').fill('Ariadne');
  await page.getByRole('button', { name: 'Create table' }).click();
  await steps.step('created', 'Create a two-player table', [
    { spec: 'The creator occupies one seat with another available.', check: async () => { await expect(page.getByTestId('player-seat')).toHaveCount(1); await expect(page.getByText('Waiting for a player')).toBeVisible(); } },
    { spec: 'The initial supply and ten-card starting deck are explained.', check: async () => { await expect(page.getByRole('heading', { name: 'Supply for 2 players' })).toBeVisible(); await expect(page.locator('.supply dd')).toHaveText(['6', '8', '40 / 30 / 20']); await expect(page.locator('figcaption')).toHaveText(['6 Obols', '3 Hamlets', '1 matching Temple']); } }
  ]);
  const guest = await browser.newContext({ viewport: info.project.use.viewport, reducedMotion: 'no-preference' });
  try {
    const other = await guest.newPage();
    await other.goto(page.url());
    await other.getByLabel('Your name').fill('Theseus');
    await other.getByRole('button', { name: 'Join table' }).click();
    await expect(other.getByTestId('player-seat')).toHaveCount(2);
    await steps.step('joined', 'See another player arrive', [
      { spec: 'The remote join appears without reloading.', check: async () => expect(page.getByTestId('player-seat')).toHaveCount(2) },
      { spec: 'Activity names the player and action.', check: async () => expect(page.getByTestId('latest-activity')).toHaveText('Theseus joined the table.') }
    ]);
    await page.reload();
    await steps.step('restored', 'Restore the same table after reload', [
      { spec: 'The anonymous identity retains its seat without appending another join.', check: async () => { await expect(page.getByTestId('player-seat')).toHaveCount(2); await expect(page.getByTestId('player-seat').first()).toContainText('You'); await expect(page.getByTestId('latest-activity')).toHaveText('Theseus joined the table.'); } }
    ]);
    expect(failures).toEqual([]);
    steps.generateDocs();
  } finally { await guest.close(); }
});

test('four-seat setup animates remote arrivals and respects reduced motion', async ({ page, browser }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    (window as unknown as { motions: number[] }).motions = [];
    Element.prototype.animate = function (frames, options) {
      if (this.matches('[data-testid="player-seat"], [data-testid="latest-activity"]')) {
        (window as unknown as { motions: number[] }).motions.push(typeof options === 'number' ? options : Number(options?.duration ?? 0));
      }
      return animate.call(this, frames, options);
    };
  });
  await page.goto('./play/');
  await page.getByLabel('Your name').fill('Ariadne');
  await page.getByLabel('Players', { exact: true }).selectOption('4');
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page.getByTestId('player-seat')).toHaveCount(1);
  await page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished)); (window as unknown as { motions: number[] }).motions = []; });
  const guest = await browser.newContext();
  try {
    const other = await guest.newPage();
    await other.goto(page.url());
    await other.getByLabel('Your name').fill('Theseus');
    await other.getByRole('button', { name: 'Join table' }).click();
    await expect(page.getByTestId('player-seat')).toHaveCount(2);
    await expect.poll(() => page.evaluate(() => (window as unknown as { motions: number[] }).motions.some(duration => duration === 450))).toBe(true);
    const steps = new TestStepHelper(page, info, 'Four-player setup and motion');
    await steps.step('four-player', 'Prepare a four-player table', [
      { spec: 'Territories and Actions scale to four players.', check: async () => expect(page.locator('.supply dd')).toHaveText(['12', '16', '40 / 30 / 20']) },
      { spec: 'Two seats remain after a remote player joins.', check: async () => expect(page.getByText('Waiting for a player')).toHaveCount(2) }
    ]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await expect(page.getByTestId('player-seat')).toHaveCount(2);
    expect(await page.evaluate(() => (window as unknown as { motions: number[] }).motions.every(duration => duration === 0))).toBe(true);
  } finally { await guest.close(); }
});
