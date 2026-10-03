import { expect, test } from '@playwright/test';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { cards } from '../../src/lib/game/cards';
import { cardSerial, copyCount } from '../../src/lib/game/presentation';

test('gallery print selection produces readable low-ink cards and matching duplex backs', async ({ page }) => {
  await page.goto('./gallery/');
  await page.getByLabel('Players', { exact: true }).selectOption('4');
  await page.getByRole('button', { name: 'Events 4', exact: true }).click();
  await page.getByRole('button', { name: 'Print cards ↗', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Print & play', exact: true })).toBeVisible();
  await expect(page.getByLabel('Players', { exact: true })).toHaveValue('4');
  await expect(page.getByLabel('Cards', { exact: true })).toHaveValue('filtered');
  await expect(page.locator('.print-sheet')).toHaveCount(2);
  await expect(page.locator('.print-sheet img')).toHaveCount(0);
  for (const card of cards.filter(card => card.type === 'Event')) {
    const face = page.locator(`.print-sheet[data-side="front"] [data-card-id="${card.id}"]`);
    await expect(face).toContainText(card.effect);
    await expect(face).toContainText(card.favored!);
    await expect(face).toContainText(`${card.cost} Coins + 1 Worship`);
  }
  await page.getByRole('button', { name: 'Next →', exact: true }).click();
  await expect(page.locator('.current')).toHaveAttribute('data-side', 'back');
  await expect(page.locator('.current .simple-back')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const { paper, style } of [{ paper: 'a4', style: 'mono' }, { paper: 'letter', style: 'mono' }, { paper: 'a4', style: 'colour' }] as const) {
  test(`${paper} ${style} PDF has physical card sizes, paired pages and complete fronts`, async ({ page }, testInfo) => {
    await page.goto('./gallery/print/');
    await page.getByLabel('Copies', { exact: true }).selectOption('catalog');
    await page.getByLabel('Paper', { exact: true }).selectOption(paper);
    await page.getByLabel('Artwork', { exact: true }).selectOption(style);
    await page.emulateMedia({ media: 'print' });
    await test.step('Print fonts and images are ready within 2,000 ms', async () => {
      await page.evaluate(async () => {
        await document.fonts.ready;
        const images = new Map([...document.images].map(image => [image.src, image]));
        await Promise.all([...images.values()].map(image => image.decode()));
      });
    }, { timeout: 2000 });
    await expect(page.locator('.print-sheet')).toHaveCount(10);
    await expect(page.locator('.controls')).not.toBeVisible();
    const geometry = await page.locator('.print-sheet').evaluateAll(sheets => sheets.map(sheet => {
      const bounds = sheet.getBoundingClientRect();
      return {
        width: bounds.width, height: bounds.height,
        cards: [...sheet.querySelectorAll<HTMLElement>('.print-card')].map(card => {
          const box = card.getBoundingClientRect();
          const serial = card.querySelector('.serial, .simple-front footer span');
          return { id: card.dataset.cardId, copy: card.dataset.copy, x: box.x - bounds.x, y: box.y - bounds.y, width: box.width, height: box.height, serialX: serial ? serial.getBoundingClientRect().x - bounds.x : null };
        })
      };
    }));
    const cssMm = 96 / 25.4;
    for (let i = 0; i < geometry.length; i += 2) {
      const front = geometry[i], back = geometry[i + 1];
      expect(front.width).toBeCloseTo((paper === 'a4' ? 210 : 215.9) * cssMm, 1);
      expect(front.height).toBeCloseTo((paper === 'a4' ? 297 : 279.4) * cssMm, 1);
      for (let c = 0; c < front.cards.length; c++) {
        const a = front.cards[c], b = back.cards[c];
        expect(b.id).toBe(a.id);
        expect(b.copy).toBe(a.copy);
        expect(b.y).toBe(a.y);
        expect(b.x + a.x + a.width).toBeCloseTo(front.width, 1);
        const card = cards.find(card => card.id === a.id)!;
        const size = card.type === 'Leader' ? [75, 120] : card.type === 'Event' ? [86, 120] : [63, 88];
        expect(a.width).toBeCloseTo(size[0] * cssMm, 1);
        expect(a.height).toBeCloseTo(size[1] * cssMm, 1);
      }
    }
    const overflow = await page.locator('.simple-front').evaluateAll(faces => faces.filter(face => {
      // Layout dimensions are unaffected by the deliberate 90-degree print rotation.
      return face.scrollHeight > face.clientHeight || face.scrollWidth > face.clientWidth;
    }).map(face => face.getAttribute('aria-label')));
    expect(overflow).toEqual([]);
    if (testInfo.project.name === 'desktop') {
      const pdf = await page.pdf({ path: testInfo.outputPath(`pantheon-${paper}-${style}.pdf`), printBackground: true, preferCSSPageSize: true });
      const document = await test.step('Open the generated PDF within 2,000 ms', async () =>
        getDocument({ data: new Uint8Array(pdf), useSystemFonts: false }).promise, { timeout: 2000 });
      expect(document.numPages).toBe(10);
      try {
        for (let index = 0; index < document.numPages; index++) {
          await test.step(`PDF page ${index + 1} keeps every serial on its own front within 2,000 ms`, async () => {
            const pdfPage = await document.getPage(index + 1);
            const textItems = (await pdfPage.getTextContent()).items.filter(item => 'str' in item);
            const text = textItems.map(item => item.str).join('').replace(/\s/g, '');
            const serials = text.match(/PB-\d{3}-\d{2}/g) ?? [];
            expect(serials.sort()).toEqual(index % 2 === 0 ? geometry[index].cards.map(item => cardSerial(cards.find(card => card.id === item.id)!, Number(item.copy))).sort() : []);
            if (index % 2 === 0) for (const item of geometry[index].cards) {
              const card = cards.find(card => card.id === item.id)!;
              if (card.type === 'Leader' || card.type === 'Event') continue;
              const serial = cardSerial(card, Number(item.copy));
              const printed = textItems.find(text => text.str.replace(/\s/g, '').startsWith(serial));
              expect(printed, `${serial} is selectable text`).toBeDefined();
              // Check physical positions in the PDF itself: rotated image overflow
              // can trigger silent whole-document shrinkage despite correct DOM sizes.
              expect(printed!.transform[4]).toBeCloseTo(item.serialX! * 72 / 96, 0);
            }
            const viewport = pdfPage.getViewport({ scale: 1 });
            // PDF paper boxes are quantized to printer points, not CSS pixels.
            expect(viewport.width).toBeCloseTo((paper === 'a4' ? 210 : 215.9) * 72 / 25.4, 0);
            expect(viewport.height).toBeCloseTo((paper === 'a4' ? 297 : 279.4) * 72 / 25.4, 0);
          }, { timeout: 2000 });
        }
      } finally { await document.destroy(); }
      await testInfo.attach(`${paper} ${style} print-and-play PDF`, { body: pdf, contentType: 'application/pdf' });
    }
  });
}

test('complete quantities include starting decks and colour printing waits for artwork', async ({ page }) => {
  await page.goto('./gallery/print/');
  const total = cards.reduce((sum, card) => sum + copyCount(card, 2), 0);
  await expect(page.locator('.print-sheet[data-side="front"] .print-card')).toHaveCount(total);
  await page.getByLabel('Players', { exact: true }).selectOption('3');
  await expect(page.locator('.print-sheet[data-side="front"] [data-card-id="obol"]')).toHaveCount(58);
  await page.getByLabel('Copies', { exact: true }).selectOption('catalog');
  await page.getByLabel('Artwork', { exact: true }).selectOption('colour');
  await expect(page.locator('.print-sheet .card')).toHaveCount(30);
  await expect(page.locator('.print-sheet .card-back')).toHaveCount(30);
  await page.evaluate(() => {
    window.print = () => {
      const images = [...document.querySelectorAll<HTMLImageElement>('.sheets img')];
      document.body.dataset.printed = String(images.every(image => image.complete && image.naturalWidth > 0));
    };
  });
  await page.getByRole('button', { name: 'Print / save PDF', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-printed', 'true');
  await expect(page.getByRole('button', { name: 'Print / save PDF', exact: true })).toBeEnabled();
});
