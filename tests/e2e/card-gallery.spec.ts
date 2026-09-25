import { expect, test, type Page } from '@playwright/test';
import { cards } from '../../src/lib/game/cards';
import { copyCount, cardSerial, ruleParts } from '../../src/lib/game/presentation';

async function expectArtworkAndLayout(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.locator('.card img').evaluateAll(images =>
    images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth >= 128)
  )).toBe(true);

  await expect.poll(() => page.locator('.card').evaluateAll(faces => faces.flatMap(face => {
    const state = face.getAttribute('data-layout-state');
    return state === 'fit' ? [] : [{ card: face.getAttribute('data-card-id'), state, issues: face.getAttribute('data-layout-issues') }];
  })), { message: 'All nested text, icons, tags, costs and footers must fit their panels without overlaps' }).toEqual([]);
  if (!await page.evaluate(() => matchMedia('print').matches)) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
}

test('all 30 v0.1 cards render complete rules and generated artwork', async ({ page }, testInfo) => {
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  await page.goto('./gallery/');
  await expect(page.getByRole('heading', { name: 'Card gallery 30' })).toBeVisible();
  await expect(page.locator('[data-testid="card-grid"] .card')).toHaveCount(30);
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
      if (part.kind === 'icon') await expect(face.locator(`.rules [data-resource="${part.resource}"]${part.value === undefined ? '' : `[data-value="${part.value}"]`}`).first()).toBeVisible();
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

test('frames expose real windows fully covered by colored fills, with artwork below metadata', async ({ page }) => {
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
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const faceBounds = element.getBoundingClientRect();
      // Flood-fill each alpha window, including its translucent edge. A center sample
      // alone misses the strips of background that can show above the colored fills.
      const uncoveredWindowPixels = (selector: string, x: number) => {
        const fill = element.querySelector(selector)!.getBoundingClientRect();
        const visited = new Uint8Array(canvas.width * canvas.height);
        const start = Math.floor(tagY * canvas.height) * canvas.width + Math.floor(x * canvas.width);
        const queue = [start];
        visited[start] = 1;
        let uncovered = 0, minY = canvas.height, maxY = 0;
        for (let i = 0; i < queue.length; i++) {
          const index = queue[i], px = index % canvas.width, py = Math.floor(index / canvas.width);
          minY = Math.min(minY, py); maxY = Math.max(maxY, py);
          const screenX = faceBounds.left + (px + 0.5) / canvas.width * faceBounds.width;
          const screenY = faceBounds.top + (py + 0.5) / canvas.height * faceBounds.height;
          if (screenX < fill.left || screenX > fill.right || screenY < fill.top || screenY > fill.bottom) uncovered++;
          for (const [nx, ny] of [[px - 1, py], [px + 1, py], [px, py - 1], [px, py + 1]]) {
            if (nx < 0 || nx >= canvas.width || ny < 0 || ny >= canvas.height) continue;
            const next = ny * canvas.width + nx;
            if (!visited[next] && pixels[next * 4 + 3] < 245) { visited[next] = 1; queue.push(next); }
          }
        }
        const label = element.querySelector(selector.replace('substrate', 'label'))!.getBoundingClientRect();
        const center = faceBounds.top + (minY + maxY + 1) / 2 / canvas.height * faceBounds.height;
        return { uncovered, centerDelta: Math.abs((label.top + label.bottom) / 2 - center) };
      };
      return {
        uncovered: [uncoveredWindowPixels('.god-substrate', format === 'deck' ? 0.25 : 0.18), uncoveredWindowPixels('.type-substrate', format === 'deck' ? 0.72 : 0.37)],
        art: alpha(0.25, 0.4), god: alpha(format === 'deck' ? 0.25 : 0.18, tagY), type: alpha(format === 'deck' ? 0.72 : 0.37, tagY),
        rules: alpha(0.7, 0.7),
        z: ['.illustration', '.frame', '.rules'].map(selector => Number(getComputedStyle(element.querySelector(selector)!).zIndex)),
        colors: ['.god-substrate', '.type-substrate'].map(selector => getComputedStyle(element.querySelector(selector)!).backgroundColor)
      };
    }, format);
    expect(evidence.uncovered.map(window => window.uncovered)).toEqual([0, 0]);
    for (const window of evidence.uncovered) expect(window.centerDelta).toBeLessThan(1);
    expect([evidence.art, evidence.god, evidence.type]).toEqual([0, 0, 0]);
    expect(evidence.rules).toBeGreaterThan(240);
    expect(evidence.z).toEqual([0, 2, 4]);
    expect(evidence.colors[0]).not.toBe(evidence.colors[1]);
  }
});

test('copy totals follow setup and three back families keep deck identity hidden', async ({ page }, testInfo) => {
  await page.goto('./gallery/');
  await page.getByLabel('Players', { exact: true }).selectOption('4');
  await expect(page.locator('[data-card-id="obol"] .copy-count')).toHaveText('1/64');
  await expect(page.locator('[data-card-id="hamlet"] .copy-count')).toHaveText('1/24');
  await page.getByLabel('Players', { exact: true }).selectOption('3');
  await expect(page.locator('[data-card-id="hamlet"] .copy-count')).toHaveText('1/18');
  await page.getByRole('button', { name: 'Inspect Obol', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Copy', { exact: true }).selectOption('58');
  await expect(dialog.locator('.serial')).toHaveText('PB-001-58');
  await expect(dialog.locator('.copy-count')).toHaveText('58/58');
  await dialog.getByRole('button', { name: 'Show back', exact: true }).click();
  await expect(dialog.getByRole('img', { name: 'Player deck card back', exact: true })).toBeVisible();
  await expect(dialog.locator('.serial')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Show front', exact: true }).click();
  await expect(dialog.locator('.serial')).toHaveText('PB-001-58');
  await page.keyboard.press('Escape');
  await page.getByRole('checkbox', { name: 'Show backs', exact: true }).check();
  const backs = page.locator('[data-testid="card-grid"] .card-back');
  await expect(backs).toHaveCount(30);
  await expect(page.locator('.card-back[data-format="deck"]')).toHaveCount(22);
  const sources = await backs.locator('img').evaluateAll(images => [...new Set(images.map(img => (img as HTMLImageElement).src))]);
  expect(sources).toHaveLength(3);
  await expect.poll(() => backs.locator('img').evaluateAll(images => images.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('three-back-families.png'), fullPage: true });
  await page.getByRole('checkbox', { name: 'Show backs', exact: true }).uncheck();
  await expect(page.locator('[data-testid="card-grid"] .card')).toHaveCount(30);
});

test('filters combine, empty results recover, and inspector supports keyboard dismissal', async ({ page }) => {
  await page.goto('./gallery/');
  await page.getByRole('button', { name: 'Actions 16', exact: true }).click();
  await page.getByLabel('God affiliation').selectOption('Athena');
  await expect(page.locator('[data-testid="card-grid"] .card')).toHaveCount(4);
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
  await expect(page.locator('[data-testid="card-grid"] .card')).toHaveCount(30);
});

test('tabletop view preserves every card and print uses physical card dimensions', async ({ page }, testInfo) => {
  await page.goto('./gallery/');
  const card = page.locator('[data-testid="card-grid"] .card[data-format="deck"]').first();
  const initial = (await card.boundingBox())!.width;
  await page.getByRole('checkbox', { name: 'Tabletop view' }).check();
  await expect(page.locator('.hero')).not.toBeVisible();
  await expect(page.locator('[data-testid="card-grid"] .card')).toHaveCount(30);
  if (testInfo.project.name !== 'phone') expect((await card.boundingBox())!.width).toBeGreaterThan(initial);
  await expectArtworkAndLayout(page);
  await page.screenshot({ path: testInfo.outputPath('tabletop.png'), fullPage: true });
  await testInfo.attach('Tabletop cards', { path: testInfo.outputPath('tabletop.png'), contentType: 'image/png' });
  await page.emulateMedia({ media: 'print' });
  await expectArtworkAndLayout(page);
  await expect(page.locator('.toolbar')).not.toBeVisible();
  for (const [format, width, ratio] of [['deck', 63, 5 / 7], ['event', 88.2, 7 / 5], ['leader', 120, 8 / 5]] as const) {
    const box = (await page.locator(`[data-testid="card-grid"] .card[data-format="${format}"]`).first().boundingBox())!;
    expect(box.width).toBeCloseTo(width * 96 / 25.4, 0);
    expect(box.width / box.height).toBeCloseTo(ratio, 2);
  }
});


test('overflow detection catches nested icons in every direction, clipped text, and title-cost collisions', async ({ page }) => {
  await page.goto('./gallery/');
  await expectArtworkAndLayout(page);
  const face = page.locator('[data-card-id="merchant-fleet"]');
  const icon = face.locator('.rules .resource-icon').first();
  for (const transform of ['translateX(-500%)', 'translateX(500%)', 'translateY(-500%)', 'translateY(500%)']) {
    await icon.evaluate((element, transform) => { element.style.transform = transform; }, transform);
    await expect(face).toHaveAttribute('data-layout-state', 'overflow');
    await expect(face).toHaveAttribute('data-layout-issues', /content outside panel/);
    await icon.evaluate(element => { element.style.removeProperty('transform'); });
    await expect(face).toHaveAttribute('data-layout-state', 'fit');
  }
  const title = face.locator('.card-title');
  const heading = title.locator('h3');
  const original = await heading.textContent();
  await title.evaluate(element => { element.style.overflow = 'hidden'; });
  await heading.evaluate(element => { element.textContent = 'A title that is far too long to fit in its frame window '.repeat(5); });
  await expect(face).toHaveAttribute('data-layout-state', 'overflow');
  await expect(face).toHaveAttribute('data-layout-issues', /text outside panel/);
  await heading.evaluate((element, original) => { element.textContent = original; }, original);
  await title.evaluate(element => { element.style.removeProperty('overflow'); });
  await expect(face).toHaveAttribute('data-layout-state', 'fit');
  const cost = face.locator('.cost');
  await cost.evaluate(element => { element.style.left = '12%'; element.style.right = 'auto'; });
  await expect(face).toHaveAttribute('data-layout-state', 'overflow');
  await expect(face).toHaveAttribute('data-layout-issues', /overlaps cost/);
  await cost.evaluate(element => { element.style.removeProperty('left'); element.style.removeProperty('right'); });
  await expect(face).toHaveAttribute('data-layout-state', 'fit');
});

test('all enlarged inspector cards and illustrated rules cards fit their frame panels', async ({ page }) => {
  await page.goto('./gallery/');
  for (const card of cards) {
    await page.getByRole('button', { name: `Inspect ${card.name}`, exact: true }).click();
    await expect(page.getByRole('dialog').locator('.card')).toHaveAttribute('data-layout-state', 'fit');
    await page.keyboard.press('Escape');
  }
  await page.goto('./rules/');
  await expectArtworkAndLayout(page);
});


test('operation icons and arrows preserve conditional costs, optional choices, and destinations', async ({ page }) => {
  await page.goto('./gallery/');
  await expectArtworkAndLayout(page);
  const notation = (id: string, area = '.rules') => page.locator(`[data-card-id="${id}"] ${area} .visual-rule`).evaluateAll(rules => rules.flatMap(rule =>
    [...rule.querySelectorAll('.resource-icon, .effect-arrow')].map(element => element.classList.contains('effect-arrow') ? '→' : `${element.getAttribute('data-resource')}:${element.getAttribute('data-value') ?? ''}`)
  ));
  expect(await notation('forge-of-heroes')).toEqual(['trash:1', '→', 'gain:+2']);
  expect(await notation('trial-of-the-spear')).toEqual(['trash:1', '→', 'gain:+1', 'trash:1', '→', 'gain:+3']);
  expect(await notation('harvest-feast')).toEqual(['cards:+2', 'actions:+1', 'discard:1']);
  expect(await notation('blessing-of-the-fields', '.favored')).toEqual(['trash:2', 'gain:Σ', 'buys:+1']);
  expect(await notation('victorious-procession')).toEqual(['coins:+2', 'buys:+1', '→', 'discard:', 'coins:+2', 'topdeck:']);
  expect(await notation('sacred-grove')).toEqual(['actions:+1', 'gain:4']);
  expect(await notation('counsel-of-olympus')).toEqual(['gain:3', 'topdeck:', 'gain:5', 'topdeck:']);
  expect((await page.locator('.visual-rule').allTextContents()).join('')).not.toContain('≤');
  expect(await notation('doreios')).toEqual(['→', 'trash:1']);
  await expect(page.locator('[data-card-id="forge-of-heroes"] .visual-rule')).not.toContainText('You may');
  await expect(page.locator('[data-card-id="seed-keeper"] .rules [data-resource="trash"]')).toHaveAttribute('data-value', '2');
  await expect(page.locator('[data-card-id="seed-keeper"] .rules [data-resource="trash"]')).toHaveAttribute('aria-label', 'Trash up to 2 cards from your hand');
  expect(await notation('tribute-of-the-tides')).toEqual(['gain:', 'gain:', 'topdeck:', 'buys:+1']);
  const destinations = page.locator('[data-card-id="harvest-feast"] .rules [data-resource="discard"] img, [data-card-id="tribute-of-the-tides"] .rules [data-resource="topdeck"] img');
  expect(await destinations.evaluateAll(images => new Set(images.map(image => (image as HTMLImageElement).src)).size)).toBe(2);
  await expect(page.locator('[data-card-id="blessing-of-the-fields"] .favored .visual-rule')).toContainText('you may');
  await expect(page.locator('[data-card-id="victorious-procession"] .visual-rule')).toContainText('Otherwise');
  await page.getByRole('button', { name: 'Inspect Forge of Heroes', exact: true }).click();
  await expect(page.getByRole('dialog').locator('.accessible-rules')).toContainText('If you do, gain a card costing up to 2 Coins more');
});
