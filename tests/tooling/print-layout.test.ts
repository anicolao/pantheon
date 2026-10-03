import { expect, test } from 'bun:test';
import { cards } from '../../src/lib/game/cards';
import { cardFormat, copyCount } from '../../src/lib/game/presentation';
import { artworkSize, bleed, cropMarks, formats, paperSizes, printSheets, trimBorder } from '../../src/lib/print/layout';

test('every setup copy gets exactly one front and its matching mirrored back', () => {
  for (const paper of ['a4', 'letter'] as const) for (const players of [2, 3, 4] as const) {
    const pages = printSheets(cards, players, 'setup', paper);
    const fronts = pages.filter(page => page.side === 'front').flatMap(page => page.cards);
    for (const card of cards) {
      expect(fronts.filter(item => item.card.id === card.id).map(item => item.copy)).toEqual(
        Array.from({ length: copyCount(card, players) }, (_, index) => index + 1)
      );
    }
    for (let index = 0; index < pages.length; index += 2) {
      const front = pages[index], back = pages[index + 1];
      expect(back.side).toBe('back');
      expect(back.sheet).toBe(front.sheet);
      expect(back.format).toBe(front.format);
      expect(back.cards.length).toBe(front.cards.length);
      for (let i = 0; i < front.cards.length; i++) {
        expect(back.cards[i].card.id).toBe(front.cards[i].card.id);
        expect(back.cards[i].copy).toBe(front.cards[i].copy);
        expect(back.cards[i].y).toBe(front.cards[i].y);
        expect(back.cards[i].x).toBe(paperSizes[paper].width - front.cards[i].x - formats[front.format].width);
      }
    }
  }
});

test('partial sheets mirror empty positions instead of centering the remaining cards', () => {
  const deck = cards.filter(card => cardFormat(card) === 'deck').slice(0, 4);
  const [front, back] = printSheets(deck, 2, 'catalog', 'a4');
  expect(front.cards.map(item => [item.x, item.y])).toEqual([[10.5, 16.5], [73.5, 16.5], [136.5, 16.5], [10.5, 104.5]]);
  expect(back.cards.map(item => [item.x, item.y])).toEqual([[136.5, 16.5], [73.5, 16.5], [10.5, 16.5], [136.5, 104.5]]);
});

test('physical sizes, artwork proportions, bleed and crop marks fit both papers', () => {
  expect([formats.deck.width, formats.deck.height]).toEqual([63, 88]);
  expect([formats.event.height, formats.event.width]).toEqual([120, 86]);
  expect([formats.leader.height, formats.leader.width]).toEqual([120, 75]);
  for (const paper of ['a4', 'letter'] as const) {
    for (const sheet of printSheets(cards, 2, 'catalog', paper)) for (const style of ['mono', 'colour'] as const) {
      const size = formats[sheet.format], art = artworkSize(sheet.format, style);
      expect(art.width / art.height).toBe(size.ratio);
      const [w, h] = art.rotation ? [art.height, art.width] : [art.width, art.height];
      expect(w).toBeLessThanOrEqual(size.width - 2 * trimBorder[style]);
      expect(h).toBeLessThanOrEqual(size.height - 2 * trimBorder[style]);
      for (const mark of cropMarks(sheet)) for (const [x, y] of [[mark.x1, mark.y1], [mark.x2, mark.y2]]) {
        expect(x).toBeGreaterThanOrEqual(4);
        expect(y).toBeGreaterThanOrEqual(4);
        expect(x).toBeLessThanOrEqual(paperSizes[paper].width - 4);
        expect(y).toBeLessThanOrEqual(paperSizes[paper].height - 4);
        expect(x < sheet.x - bleed || x > sheet.x + sheet.width + bleed || y < sheet.y - bleed || y > sheet.y + sheet.height + bleed).toBe(true);
      }
    }
  }
});

test('catalog and filtered selections never silently add other cards', () => {
  const selected = cards.filter(card => card.type === 'Event');
  const pages = printSheets(selected, 4, 'catalog', 'letter');
  expect(pages).toHaveLength(2);
  expect(pages[0].cards.map(item => item.card.id)).toEqual(selected.map(card => card.id));
  expect(pages[0].cards.every(item => item.copy === 1)).toBe(true);
  expect(printSheets([], 2, 'setup', 'a4')).toEqual([]);
});

test('duplex calibration translates only backs and their crop marks in both axes', () => {
  for (const paper of ['a4', 'letter'] as const) {
    const original = printSheets(cards, 2, 'catalog', paper);
    const adjusted = printSheets(cards, 2, 'catalog', paper, { x: -2, y: 1 });
    for (let i = 0; i < original.length; i++) {
      const before = original[i], after = adjusted[i];
      if (before.side === 'front') { expect(after).toEqual(before); continue; }
      expect(after.cards).toEqual(before.cards.map(card => ({ ...card, x: card.x - 2, y: card.y + 1 })));
      expect(cropMarks(after)).toEqual(cropMarks(before).map(mark => ({
        x1: mark.x1 - 2, x2: mark.x2 - 2, y1: mark.y1 + 1, y2: mark.y2 + 1
      })));
    }
  }
});
