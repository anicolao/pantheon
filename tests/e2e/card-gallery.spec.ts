import { expect, test, type Page } from '@playwright/test';
import { cards } from '../../src/lib/game/cards';

async function expectArtworkAndLayout(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.locator('.card img').evaluateAll(images =>
    images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth >= 960)
  )).toBe(true);

  const clipping = await page.locator('.card [data-fit]').evaluateAll(panels => panels.flatMap(panel => {
    const outer = panel.getBoundingClientRect();
    const overflow = panel.scrollHeight > panel.clientHeight + 1 || panel.scrollWidth > panel.clientWidth + 1;
    const escapedChild = [...panel.children].some(child => {
      const inner = child.getBoundingClientRect();
      return inner.top < outer.top - 1 || inner.bottom > outer.bottom + 1 || inner.right > outer.right + 1;
    });
    return overflow || escapedChild ? [`${panel.closest('[data-card-id]')?.getAttribute('data-card-id')}: ${panel.className}`] : [];
  }));
  expect(clipping, 'Every title and rules panel must fit without clipping').toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test('all 26 v0.1 cards render complete rules and generated artwork', async ({ page }, testInfo) => {
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  await page.goto('./gallery/');
  await expect(page.getByRole('heading', { name: 'Card gallery 26' })).toBeVisible();
  await expect(page.locator('[data-testid="card-grid"] .card')).toHaveCount(26);
  for (const card of cards) {
    const face = page.locator(`[data-testid="card-grid"] [data-card-id="${card.id}"]`);
    await expect(face.getByRole('heading', { name: card.name, exact: true })).toBeVisible();
    await expect(face).toHaveAttribute('data-god', card.god);
    if (card.type === 'Territory') {
      await expect(face.locator('.value')).toContainText(`${card.vp}`);
    } else {
      await expect(face.locator('.rules')).toContainText(card.effect);
    }
    if (card.favored) await expect(face.locator('.favored')).toContainText(card.favored);
    if (card.cost !== null) await expect(face.locator('.cost')).toContainText(String(card.cost));
  }
  await expectArtworkAndLayout(page);
  expect(failures).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('gallery.png'), fullPage: true });
  await testInfo.attach('Rendered card gallery', { path: testInfo.outputPath('gallery.png'), contentType: 'image/png' });
});

test('filters combine, empty results recover, and inspector supports keyboard dismissal', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Actions 12', exact: true }).click();
  await page.getByLabel('God affiliation').selectOption('Athena');
  await expect(page.locator('[data-testid="card-grid"] .card')).toHaveCount(3);
  await page.getByRole('searchbox', { name: 'Search cards' }).fill('academy');
  await expect(page.locator('[data-testid="card-grid"] .card')).toHaveCount(1);
  const opener = page.getByRole('button', { name: 'Inspect Sacred Academy', exact: true });
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Sacred Academy details' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.rules')).toContainText('+2 Cards; +1 Action.');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  await page.getByRole('searchbox').fill('nonexistent-card');
  await expect(page.getByRole('heading', { name: 'No cards found' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page.locator('[data-testid="card-grid"] .card')).toHaveCount(26);
});

test('tabletop view preserves every card and print uses physical card dimensions', async ({ page }, testInfo) => {
  await page.goto('./gallery/');
  const card = page.locator('[data-testid="card-grid"] .card').first();
  const initial = (await card.boundingBox())!.width;
  await page.getByRole('checkbox', { name: 'Tabletop view' }).check();
  await expect(page.locator('.hero')).not.toBeVisible();
  await expect(page.locator('[data-testid="card-grid"] .card')).toHaveCount(26);
  if (testInfo.project.name !== 'phone') expect((await card.boundingBox())!.width).toBeGreaterThan(initial);
  await expectArtworkAndLayout(page);
  await page.screenshot({ path: testInfo.outputPath('tabletop.png'), fullPage: true });
  await testInfo.attach('Tabletop cards', { path: testInfo.outputPath('tabletop.png'), contentType: 'image/png' });
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.toolbar')).not.toBeVisible();
  expect((await card.boundingBox())!.width).toBeCloseTo(63 * 96 / 25.4, 0);
});
