import { expect, test, type Page } from '@playwright/test';
import { cards } from '../../src/lib/game/cards';
import { copyCount, cardSerial, ruleParts } from '../../src/lib/game/presentation';

async function expectArtworkAndLayout(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.locator('.card img').evaluateAll(images =>
    images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth >= 128)
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
    await expect(face.locator('.serial')).toHaveText(cardSerial(card, 1));
    await expect(face.locator('.copy-count')).toHaveText(`1/${copyCount(card, 2)}`);
    if (card.type === 'Territory') {
      await expect(face.locator('[data-resource="victory"]')).toHaveAttribute('data-value', String(card.vp));
    } else {
      await expect(face.locator('.rules')).toContainText(card.effect);
    }
    if (card.favored) await expect(face.locator('.favored')).toContainText(card.favored);
    if (card.cost !== null) await expect(face.locator('.cost')).toContainText(String(card.cost));
    const expected = [card.effect, card.favored ?? ''].flatMap(ruleParts).filter(part => part.kind === 'icon');
    for (const part of expected) {
      if (part.kind === 'icon') await expect(face.locator(`.rules [data-resource="${part.resource}"][data-value="${part.value}"]`).first()).toBeVisible();
    }
  }
  await expectArtworkAndLayout(page);
  expect(await page.locator('[data-card-id="merchant-fleet"] .rules [data-resource]').evaluateAll(icons => icons.map(icon => [icon.getAttribute('data-resource'), icon.getAttribute('data-value')]))).toEqual([
    ['cards', '+1'], ['actions', '+1'], ['coins', '+1'], ['buys', '+1']
  ]);
  expect(await page.locator('[data-card-id="merchant-fleet"] .visual-rule').innerText()).not.toMatch(/[a-z]/i);
  expect(failures).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('gallery.png'), fullPage: true });
  await testInfo.attach('Rendered card gallery', { path: testInfo.outputPath('gallery.png'), contentType: 'image/png' });
});

test('frames expose real windows with artwork below and live metadata above', async ({ page }) => {
  await page.goto('./gallery/');
  await expectArtworkAndLayout(page);
  for (const format of ['deck', 'event', 'leader']) {
    const card = page.locator(`.card[data-format="${format}"]`).first();
    const evidence = await card.evaluate((element, format) => {
      const frame = element.querySelector<HTMLImageElement>('.frame')!;
      const canvas = document.createElement('canvas');
      canvas.width = frame.naturalWidth; canvas.height = frame.naturalHeight;
      const context = canvas.getContext('2d')!;
      context.drawImage(frame, 0, 0);
      const alpha = (x: number, y: number) => context.getImageData(Math.floor(x * canvas.width), Math.floor(y * canvas.height), 1, 1).data[3];
      const tagY = format === 'deck' ? 0.58 : 0.86;
      return {
        art: alpha(0.25, 0.4), god: alpha(format === 'deck' ? 0.25 : 0.18, tagY), type: alpha(format === 'deck' ? 0.72 : 0.37, tagY),
        rules: alpha(0.7, 0.7),
        z: ['.illustration', '.frame', '.rules'].map(selector => Number(getComputedStyle(element.querySelector(selector)!).zIndex)),
        colors: ['.god-substrate', '.type-substrate'].map(selector => getComputedStyle(element.querySelector(selector)!).backgroundColor)
      };
    }, format);
    expect([evidence.art, evidence.god, evidence.type]).toEqual([0, 0, 0]);
    expect(evidence.rules).toBeGreaterThan(240);
    expect(evidence.z).toEqual([0, 2, 4]);
    expect(evidence.colors[0]).not.toBe(evidence.colors[1]);
  }
});

test('copy totals follow setup and three back families keep deck identity hidden', async ({ page }, testInfo) => {
  await page.goto('./gallery/');
  await page.getByLabel('Players', { exact: true }).selectOption('4');
  await expect(page.locator('[data-card-id="obol"] .copy-count')).toHaveText('1/68');
  await expect(page.locator('[data-card-id="hamlet"] .copy-count')).toHaveText('1/24');
  await page.getByLabel('Players', { exact: true }).selectOption('3');
  await expect(page.locator('[data-card-id="hamlet"] .copy-count')).toHaveText('1/21');
  await page.getByRole('button', { name: 'Inspect Obol', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Copy', { exact: true }).selectOption('61');
  await expect(dialog.locator('.serial')).toHaveText('PB-001-61');
  await expect(dialog.locator('.copy-count')).toHaveText('61/61');
  await dialog.getByRole('button', { name: 'Show back', exact: true }).click();
  await expect(dialog.getByRole('img', { name: 'Player deck card back', exact: true })).toBeVisible();
  await expect(dialog.locator('.serial')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Show front', exact: true }).click();
  await expect(dialog.locator('.serial')).toHaveText('PB-001-61');
  await page.keyboard.press('Escape');
  await page.getByRole('checkbox', { name: 'Show backs', exact: true }).check();
  const backs = page.locator('[data-testid="card-grid"] .card-back');
  await expect(backs).toHaveCount(26);
  await expect(page.locator('.card-back[data-format="deck"]')).toHaveCount(18);
  const sources = await backs.locator('img').evaluateAll(images => [...new Set(images.map(img => (img as HTMLImageElement).src))]);
  expect(sources).toHaveLength(3);
  await expect.poll(() => backs.locator('img').evaluateAll(images => images.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('three-back-families.png'), fullPage: true });
  await page.getByRole('checkbox', { name: 'Show backs', exact: true }).uncheck();
  await expect(page.locator('[data-testid="card-grid"] .card')).toHaveCount(26);
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
  const card = page.locator('[data-testid="card-grid"] .card[data-format="deck"]').first();
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
  for (const [format, width, ratio] of [['deck', 63, 5 / 7], ['event', 88.2, 7 / 5], ['leader', 120, 8 / 5]] as const) {
    const box = (await page.locator(`[data-testid="card-grid"] .card[data-format="${format}"]`).first().boundingBox())!;
    expect(box.width).toBeCloseTo(width * 96 / 25.4, 0);
    expect(box.width / box.height).toBeCloseTo(ratio, 2);
  }
});
