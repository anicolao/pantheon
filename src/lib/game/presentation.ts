import type { CardDefinition } from './types';

export type PlayerCount = 2 | 3 | 4;
export type CardFormat = 'deck' | 'event' | 'leader';
export type Resource = 'victory' | 'cards' | 'buys' | 'actions' | 'coins';
export const resourceNames: Record<Resource, string> = {
  victory: 'victory points', cards: 'cards', buys: 'buys', actions: 'actions', coins: 'coins'
};

export function cardFormat(card: CardDefinition): CardFormat {
  return card.type === 'Leader' ? 'leader' : card.type === 'Event' ? 'event' : 'deck';
}

/** Total physical copies, including starting decks, for the selected setup. */
export function copyCount(card: CardDefinition, players: PlayerCount): number {
  return card.supply[players] + card.startingCopiesPerPlayer * players;
}

export function cardSerial(card: CardDefinition, copy: number): string {
  return `PB-${String(card.number).padStart(3, '0')}-${String(copy).padStart(2, '0')}`;
}

export type RulePart = { kind: 'text'; text: string } | { kind: 'icon'; resource: Resource; value: string };

/** Preserve order and conditional scope; never lift a conditional bonus into a summary. */
export function ruleParts(text: string): RulePart[] {
  const expression = /(\+?\d+) (Cards?|Buys?|Actions?|Coins?|VP)\b/gi;
  const parts: RulePart[] = [];
  let cursor = 0;
  for (const match of text.matchAll(expression)) {
    if (match.index! > cursor) parts.push({ kind: 'text', text: text.slice(cursor, match.index) });
    const word = match[2].toLowerCase();
    const resource: Resource = word === 'vp' ? 'victory' : word.startsWith('card') ? 'cards' : word.startsWith('buy') ? 'buys' : word.startsWith('action') ? 'actions' : 'coins';
    parts.push({ kind: 'icon', resource, value: match[1] });
    cursor = match.index! + match[0].length;
  }
  if (cursor < text.length) parts.push({ kind: 'text', text: text.slice(cursor) });
  return parts;
}
