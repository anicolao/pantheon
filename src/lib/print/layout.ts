import { cardFormat, copyCount, type CardFormat, type PlayerCount } from '$lib/game/presentation';
import type { CardDefinition } from '$lib/game/types';

export type Paper = 'a4' | 'letter';
export type PrintStyle = 'colour' | 'mono';
export type PrintQuantity = 'setup' | 'catalog';
export const paperSizes = {
  a4: { width: 210, height: 297, label: 'A4' },
  letter: { width: 215.9, height: 279.4, label: 'US Letter' }
} as const;

// Millimetres throughout. Adjacent black borders share a cut: no gutter to trim.
export const trimBorder = 2;
export const bleed = 1;
export const formats = {
  deck: { width: 63, height: 88, columns: 3, rows: 3, label: 'Player deck', ratio: 5 / 7 },
  event: { width: 86, height: 120, columns: 2, rows: 2, label: 'God event', ratio: 7 / 5 },
  leader: { width: 75, height: 120, columns: 2, rows: 2, label: 'Bloodline leader', ratio: 8 / 5 }
} as const;

export interface PrintCard {
  card: CardDefinition;
  copy: number;
  x: number;
  y: number;
}
export interface PrintSheet {
  format: CardFormat;
  side: 'front' | 'back';
  sheet: number;
  cards: PrintCard[];
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Preserve the artwork's aspect ratio inside a solid black trim border. */
export function artworkSize(format: CardFormat) {
  const size = formats[format];
  const rotated = format !== 'deck';
  const availableWidth = (rotated ? size.height : size.width) - 2 * trimBorder;
  const availableHeight = (rotated ? size.width : size.height) - 2 * trimBorder;
  const width = Math.min(availableWidth, availableHeight * size.ratio);
  return { width, height: width / size.ratio, rotation: rotated ? 90 : 0 };
}

/** Alternate fronts and backs, reflecting each slot around the paper's long edge.
 * Use the full grid even on partial sheets, so empty slots are mirrored too.
 */
export function printSheets(cards: CardDefinition[], players: PlayerCount, quantity: PrintQuantity, paper: Paper): PrintSheet[] {
  const result: PrintSheet[] = [];
  for (const format of ['deck', 'event', 'leader'] as const) {
    const size = formats[format];
    const copies = cards.filter(card => cardFormat(card) === format).flatMap(card =>
      Array.from({ length: quantity === 'setup' ? copyCount(card, players) : 1 }, (_, index) => ({ card, copy: index + 1 }))
    );
    const width = size.columns * size.width, height = size.rows * size.height;
    const x = (paperSizes[paper].width - width) / 2, y = (paperSizes[paper].height - height) / 2;
    const capacity = size.columns * size.rows;
    for (let offset = 0; offset < copies.length; offset += capacity) {
      const sheet = result.length / 2 + 1;
      const front = copies.slice(offset, offset + capacity).map((copy, index) => ({
        ...copy, x: x + index % size.columns * size.width, y: y + Math.floor(index / size.columns) * size.height
      }));
      result.push({ format, side: 'front', sheet, cards: front, x, y, width, height });
      result.push({ format, side: 'back', sheet, cards: front.map(copy => ({ ...copy, x: paperSizes[paper].width - copy.x - size.width })), x, y, width, height });
    }
  }
  return result;
}

/** Marks stay outside the cards and bleed, suitable for straight guillotine cuts. */
export function cropMarks(sheet: PrintSheet) {
  const size = formats[sheet.format];
  const marks: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const gap = bleed + 0.5, length = 2;
  for (let col = 0; col <= size.columns; col++) {
    const x = sheet.x + col * size.width;
    marks.push({ x1: x, x2: x, y1: sheet.y - gap - length, y2: sheet.y - gap });
    marks.push({ x1: x, x2: x, y1: sheet.y + sheet.height + gap, y2: sheet.y + sheet.height + gap + length });
  }
  for (let row = 0; row <= size.rows; row++) {
    const y = sheet.y + row * size.height;
    marks.push({ y1: y, y2: y, x1: sheet.x - gap - length, x2: sheet.x - gap });
    marks.push({ y1: y, y2: y, x1: sheet.x + sheet.width + gap, x2: sheet.x + sheet.width + gap + length });
  }
  return marks;
}
