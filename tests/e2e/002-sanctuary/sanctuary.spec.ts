import { expect, test } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

const pointer = 'pantheon:return-table';

test('enter the sanctuary, learn, create and continue a real table', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const steps = new TestStepHelper(page, info, 'Enter the sanctuary and return to your table', 'ready');
  await page.goto('./');
  await steps.step('sanctuary', 'Enter the moonlit sanctuary', [
    { spec: 'Play and Learn are available; Continue requires an existing seat.', check: async () => {
      await expect(page.getByRole('heading', { name: 'Pantheon: Bloodlines', exact: true })).toBeAttached();
      await expect(page.getByRole('navigation').getByRole('link')).toHaveText(['Play', 'Learn']);
      await expect(page.locator('.menu a')).toHaveCount(2);
      for (const control of await page.locator('.menu a').all()) {
        const bounds = await control.boundingBox();
        expect(bounds!.width).toBeGreaterThanOrEqual(44);
        expect(bounds!.height).toBeGreaterThanOrEqual(44);
      }
    } },
    { spec: 'The approved cards retain live metadata, illustrations, frames and icons.', check: async () => {
      await expect(page.locator('[data-card-id]')).toHaveCount(3);
      await expect(page.locator('[data-layer="frame"]')).toHaveCount(3);
      await expect(page.locator('[data-card-id][data-layout-state="fit"]')).toHaveCount(3);
      await expect(page.locator('[data-card-id="acropolis"] .victory-value')).toContainText('6');
      await expect(page.locator('.display-back img')).toHaveAttribute('src', /back-deck.webp$/);
      await expect(page.locator('main')).not.toContainText(/firestore|browser|reloading|placeholder|coming soon/i);
    } }
  ]);
  await page.keyboard.press('Tab');
  await steps.step('keyboard', 'Choose Play with the keyboard', [
    { spec: 'The primary control has a visible keyboard focus indicator.', check: async () => expect(page.getByRole('link', { name: 'Play', exact: true })).toBeFocused() }
  ]);
  await page.getByRole('link', { name: 'Learn', exact: true }).click();
  await expect(page).toHaveURL(/\/rules\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.goBack();
  await page.getByRole('link', { name: 'Play', exact: true }).click();
  await page.getByLabel('Your name').fill('Ariadne');
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page.getByTestId('player-seat')).toHaveCount(1);
  await expect(page.locator('[data-status]')).toHaveAttribute('data-status', 'synced');
  const table = page.url();
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), pointer)).not.toBeNull();
  await page.locator('header > a').click();
  await steps.step('returning', 'Return to the sanctuary with a table waiting', [
    { spec: 'Continue appears only after the server confirms membership.', check: async () => expect(page.getByRole('link', { name: 'Continue', exact: true })).toBeVisible() },
    { spec: 'Play, Continue and Learn retain their visual hierarchy.', check: async () => expect(page.getByRole('navigation').getByRole('link')).toHaveText(['Play', 'Continue', 'Learn']) }
  ]);
  await page.getByRole('link', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL(table);
  await expect(page.getByTestId('player-seat')).toHaveCount(1);
  await expect(page.getByTestId('player-seat')).toContainText('Ariadne');
  await expect(page.getByTestId('latest-activity')).toHaveText('Ariadne created the table.');
  await page.reload();
  await expect(page.getByTestId('player-seat')).toHaveCount(1);
  await page.locator('header > a').click();
  await expect(page.getByRole('link', { name: 'Continue', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  steps.generateDocs();
});

test('unavailable and unrelated table pointers cannot offer Continue', async ({ page, browser }) => {
  await page.goto('./play/');
  await page.getByLabel('Your name').fill('Ariadne');
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), pointer)).not.toBeNull();
  const remembered = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), pointer);
  const guest = await browser.newContext();
  try {
    const other = await guest.newPage();
    await other.goto(new URL('./play/', test.info().project.use.baseURL).href);
    await other.getByLabel('Your name').fill('Theseus');
    await other.getByRole('button', { name: 'Create table' }).click();
    await expect(other.getByTestId('player-seat')).toHaveCount(1);
    const foreignRoom = new URL(other.url()).searchParams.get('room');
    for (const value of [
      { ...remembered, roomId: foreignRoom },
      { ...remembered, roomId: 'missing-sanctuary-table' },
      { ...remembered, uid: 'another-identity' },
      { ...remembered, roomId: '../invalid' }
    ]) {
      await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: pointer, value });
      await page.goto('./');
      await expect(page.locator('[data-status]')).toHaveAttribute('data-status', 'ready');
      await expect(page.getByRole('link', { name: 'Continue', exact: true })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Play', exact: true })).toBeVisible();
    }
    await expect(other.getByTestId('player-seat')).toHaveCount(1);
  } finally { await guest.close(); }
});

test('arrival has a finite animation and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./');
  await expect(page.locator('.arrival')).toHaveCSS('animation-duration', '0.45s');
  await page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished)); });
  await expect(page.locator('.arrival')).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.arrival')).toHaveCSS('animation-name', 'none');
});

test('a connection interruption retains the return target and offers a real retry', async ({ page, context }, info) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Play', exact: true }).click();
  await page.getByLabel('Your name').fill('Ariadne');
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), pointer)).not.toBeNull();
  const saved = await page.evaluate(key => localStorage.getItem(key), pointer);
  await context.setOffline(true);
  await page.locator('header > a').click();
  const steps = new TestStepHelper(page, info, 'Reconnect to a waiting table', 'ready');
  await steps.step('unreachable', 'Keep your place when the table cannot be reached', [
    { spec: 'A friendly message offers a retry without inventing a new table.', check: async () => {
      await expect(page.getByRole('status')).toHaveText('We couldn’t reach your table.Try again');
      await expect(page.getByRole('link', { name: 'Continue', exact: true })).toHaveCount(0);
      expect(await page.evaluate(key => localStorage.getItem(key), pointer)).toBe(saved);
    } }
  ]);
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('link', { name: 'Continue', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
});
