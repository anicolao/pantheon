import { expect, test } from '@playwright/test';

test('gallery groups and sticky filters follow the reading order', async ({ page }) => {
  await page.goto('./gallery/');
  const nav = page.getByRole('group', { name: 'Filter by card type' });
  await expect(nav.getByRole('button')).toHaveText(['Leaders4', 'Events4', 'Treasures3', 'Territories3', 'Actions16', 'All cards30']);
  expect(await page.locator('.card-grid .type-label').allTextContents()).toEqual([
    ...Array(4).fill('Leader'), ...Array(4).fill('Event'), ...Array(3).fill('Treasure'), ...Array(3).fill('Territory'), ...Array(16).fill('Action')
  ]);
  await nav.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY + 250));
  await expect.poll(async () => (await nav.boundingBox())!.y).toBeCloseTo(0, 0);
  for (const [name, count] of [['Actions 16', 16], ['Leaders 4', 4], ['Events 4', 4], ['Treasures 3', 3], ['Territories 3', 3], ['All cards 30', 30]] as const) {
    const button = nav.getByRole('button', { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.card-grid .card')).toHaveCount(count);
    // Short filtered collections may fit entirely on a 4K display.
    await expect(nav).toBeInViewport();
    expect(await nav.evaluate(element => getComputedStyle(element).position)).toBe('sticky');
  }
});

test('rules navigation remains visible and anchors expose each section, including the last', async ({ page }) => {
  await page.goto('./gallery/');
  await page.getByRole('link', { name: 'How to play', exact: true }).click();
  await expect(page).toHaveURL(/\/rules\/$/);
  await page.evaluate(() => document.fonts.ready);
  const nav = page.getByRole('navigation', { name: 'On this page' });
  await expect(nav.locator('[aria-current="location"]')).toHaveText('Setup');
  for (const [name, id] of [['Setup', 'setup'], ['Cards', 'cards'], ['Leaders', 'leaders'], ['Your turn', 'turn'], ['Worship', 'gods'], ['Scoring', 'winning'], ['Reference', 'reminders']]) {
    await nav.getByRole('link', { name, exact: true }).click();
    await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'location');
    const bounds = (await nav.boundingBox())!;
    expect(bounds.y).toBeCloseTo(0, 0);
    expect((await page.locator(`#${id} h2`).boundingBox())!.y).toBeGreaterThanOrEqual(bounds.height);
  }
  await page.reload();
  await expect(page.locator('#reminders h2')).toBeInViewport();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Card gallery' }).click();
  await expect(page.locator('.card-grid .card')).toHaveCount(30);
});

test('setup inventory and unique Temples match the selected player count', async ({ page }) => {
  await page.goto('./gallery/');
  for (const players of [2, 3, 4]) {
    await page.getByLabel('Players', { exact: true }).selectOption(String(players));
    for (const [id, total] of [['hamlet', 6 * players], ['polis', 3 * players], ['acropolis', 3 * players], ['obol', 40 + 6 * players], ['drachma', 30], ['talent', 20]] as const) {
      await expect(page.locator(`[data-card-id="${id}"] .copy-count`)).toHaveText(`1/${total}`);
    }
    const actions = page.locator('.card-grid .card[data-type="Action"]');
    await expect(actions).toHaveCount(16);
    for (const face of await actions.all()) {
      const temple = (await face.getAttribute('data-card-id'))!.startsWith('temple-of-');
      await expect(face.locator('.copy-count')).toHaveText(`1/${temple ? 1 : 4 * players}`);
    }
  }
  for (const god of ['athena', 'poseidon', 'demeter', 'ares']) {
    const temple = page.locator(`[data-card-id="temple-of-${god}"]`);
    await expect(temple.locator('.rules [data-resource="worship"]')).toHaveAttribute('data-value', '+1');
    await expect(temple.locator('.rules [data-resource="actions"]')).toHaveAttribute('data-value', '+1');
    await expect(temple).toHaveAttribute('data-god', god[0].toUpperCase() + god.slice(1));
  }
});

test('illustrated rules explain leaders, Worship, and the compact operation notation', async ({ page }) => {
  await page.goto('./rules/');
  await expect(page.locator('#setup')).toContainText('6 Obols, 3 Hamlets, and the unique Temple');
  await expect(page.locator('#setup tbody tr').nth(0)).toHaveText('Each Territory6912');
  await expect(page.locator('#setup tbody tr').nth(1)).toHaveText('Each regular Action81216');
  await expect(page.locator('.leader-abilities dt')).toHaveCount(4);
  await expect(page.locator('#leaders')).toContainText('Leaders do not provide Devotion');
  await expect(page.locator('#leaders .card')).toHaveAttribute('data-format', 'leader');
  await expect(page.locator('#turn')).toContainText('1 Action, 1 Buy, 1 Worship, and 0 Coins');
  await expect(page.locator('#gods')).toContainText('1 Worship plus its Coin cost');
  await expect(page.locator('#gods')).toContainText('This does not use a Buy');
  await expect(page.locator('#gods')).toContainText('You may use the same event more than once');
  await expect(page.locator('#gods')).toContainText('Favored effect instead of its Standard effect');
  await expect(page.locator('#cards')).toContainText('Gains go to your discard pile by default');
  await expect(page.locator('#cards')).toContainText('Σ means up to the combined cost');
  await expect(page.locator('#winning')).toContainText('any three supply piles are empty');
  await expect(page.locator('figure .card')).toHaveCount(10);
});
