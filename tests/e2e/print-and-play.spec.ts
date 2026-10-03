import { expect, test } from '@playwright/test';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { cards } from '../../src/lib/game/cards';
import { cardSerial, copyCount } from '../../src/lib/game/presentation';

test('one-sided jobs preserve matching sheet order and back calibration', async ({ page }) => {
  await page.goto('./gallery/print/');
  await page.getByLabel('Copies', { exact: true }).selectOption('catalog');
  const fronts = page.getByLabel('One-sided — fronts only');
  const backs = page.getByLabel('One-sided — backs only');
  await expect(fronts).not.toBeChecked();
  await expect(backs).not.toBeChecked();
  await expect(page.locator('.print-sheet')).toHaveCount(10);
  await fronts.check();
  await expect(page.locator('.print-sheet')).toHaveCount(5);
  await expect(page.locator('.print-sheet[data-side="back"]')).toHaveCount(0);
  const frontCopies = await page.locator('.print-sheet').evaluateAll(sheets => sheets.map(sheet => ({
    sheet: sheet.getAttribute('data-sheet'),
    copies: [...sheet.querySelectorAll<HTMLElement>('.print-card')].map(card => `${card.dataset.cardId}:${card.dataset.copy}`)
  })));
  await page.getByText('Adjust double-sided alignment', { exact: true }).click();
  await page.getByLabel('Back horizontal offset (mm)', { exact: true }).fill('-1');
  await backs.check();
  await expect(fronts).not.toBeChecked();
  await expect(page.locator('.print-sheet')).toHaveCount(5);
  await expect(page.locator('.print-sheet[data-side="front"]')).toHaveCount(0);
  expect(await page.locator('.print-sheet').evaluateAll(sheets => sheets.map(sheet => ({
    sheet: sheet.getAttribute('data-sheet'),
    copies: [...sheet.querySelectorAll<HTMLElement>('.print-card')].map(card => `${card.dataset.cardId}:${card.dataset.copy}`)
  })))).toEqual(frontCopies);
  expect(await page.locator('.print-card').first().evaluate(card => (card as HTMLElement).style.left)).toBe('135.5mm');
  await expect(page.getByRole('status')).toHaveText('30 cards · 5 sheets · 5 PDF pages');
  await expect(page.getByRole('button', { name: 'Print / save PDF', exact: true })).toBeEnabled();
  await backs.uncheck();
  await expect(page.locator('.print-sheet')).toHaveCount(10);
});

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
    await expect(face).toContainText(`Cost: ${card.cost} + 1 Worship`);
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
      const loading = getDocument({ data: new Uint8Array(pdf), useSystemFonts: false });
      const document = await test.step('Open the generated PDF within 2,000 ms', async () => loading.promise, { timeout: 2000 });
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
      } finally { await loading.destroy(); }
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

test('print options preserve rules and provide a labelled, single-sheet lamination ramp', async ({ page }) => {
  await page.goto('./gallery/print/?cards=oracles-acolyte');
  await page.getByLabel('Copies', { exact: true }).selectOption('catalog');
  await page.getByLabel('Low-ink rules', { exact: true }).selectOption({ label: 'Black & white icons' });
  const acolyte = cards.find(card => card.id === 'oracles-acolyte')!;
  await expect(page.locator('.simple-front .rules > p > span')).toHaveAttribute('aria-label', acolyte.effect);
  await expect(page.locator('.simple-front .rules svg')).toHaveCount(2);
  await page.getByLabel('Artwork', { exact: true }).selectOption('colour');
  await page.getByLabel('Colour profile', { exact: true }).selectOption('lamination');
  await expect(page.getByLabel('Lightening strength', { exact: true })).toHaveValue('20');
  await expect(page.locator('.current .sheet-label')).toContainText('Gloss curve v2 · Midtone lift 20%');
  await page.getByLabel('One-sided — backs only').check();
  const calibration = page.getByLabel('Oracle’s Acolyte · lamination calibration sheet', { exact: true });
  await calibration.check();
  await expect(page.locator('.print-sheet')).toHaveCount(1);
  await expect(page.locator('.print-sheet')).toHaveAttribute('data-side', 'front');
  await expect(page.locator('.print-card[data-card-id="oracles-acolyte"]')).toHaveCount(9);
  await expect(page.locator('.sample-label')).toHaveText([
    'Standard · 0%', ...[5, 10, 15, 20, 25, 30, 40, 50].map(strength => `Gloss v2 · Midtone lift ${strength}%`)
  ]);
  await expect(page.getByRole('status')).toHaveText('9 cards · 1 sheets · 1 PDF pages');
  await expect(page.locator('.artwork.laminated')).toHaveCount(8);
  await calibration.uncheck();
  await expect(page.getByLabel('One-sided — backs only')).toBeChecked();
  await expect(page.locator('.print-sheet')).toHaveAttribute('data-side', 'back');
  await expect(page.locator('.current .sheet-label')).toContainText('Gloss curve v2 · Midtone lift 20%');
});
