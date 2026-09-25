import type { CardDefinition } from './types';

export type PlayerCount = 2 | 3 | 4;
export type CardFormat = 'deck' | 'event' | 'leader';
export type Resource = 'victory' | 'cards' | 'buys' | 'actions' | 'coins' | 'worship';
export const resourceNames: Record<Resource, string> = {
  victory: 'victory points', cards: 'cards', buys: 'buys', actions: 'actions', coins: 'coins', worship: 'Worship'
};

export type CardOperation = 'trash' | 'discard' | 'gain' | 'topdeck';
export type IconKind = Resource | CardOperation;
export const operationNames: Record<CardOperation, string> = { trash: 'trash', discard: 'discard', gain: 'gain', topdeck: 'topdeck' };
export const iconNames: Record<IconKind, string> = { ...resourceNames, ...operationNames };

export function cardFormat(card: CardDefinition): CardFormat {
  return card.type === 'Leader' ? 'leader' : card.type === 'Event' ? 'event' : 'deck';
}

/** Total physical copies, including starting decks, for the selected setup. */
export function copyCount(card: CardDefinition, players: PlayerCount): number {
  return card.uniqueStartingCard ? 1 : card.supply[players] + card.startingCopiesPerPlayer * players;
}

export function cardSerial(card: CardDefinition, copy: number): string {
  return `PB-${String(card.number).padStart(3, '0')}-${String(copy).padStart(2, '0')}`;
}

export type RulePart =
  | { kind: 'text'; text: string }
  | { kind: 'icon'; resource: IconKind; value?: string }
  | { kind: 'arrow' };

/** Presentation only: preserve optional choices, destinations and conditional scope.
 * The original effect stays authoritative and is rendered as accessible text.
 */
export function ruleParts(text: string): RulePart[] {
  const display = text
    .replace(/\. If you do, /g, ' → ')
    .replace(/After you resolve the first (\w+) Action you play this turn, /g, '1st $1 Action → ')
    .replace(/reveal the top card of your deck\. If it is a Territory, put it into your discard pile and gain /g, 'Reveal top card. Territory → discard ')
    .replace(/Otherwise, put it back on top of your deck\./g, 'Otherwise topdeck.')
    .replace(/\b(?:You may |you may )?trash (?:up to )?(\d+) cards? from your hand/gi, 'trash $1 cards')
    .replace(/\bdiscard (\d+) cards? from your hand/gi, 'discard $1 cards')
    .replace(/gain a card costing up to (\d+) Coins? more than the trashed card/gi, 'gain(+$1)')
    .replace(/gain a card costing up to their combined cost/gi, 'gain(Σ)')
    .replace(/gain an Action costing up to (\d+) Coins?/gi, 'gain($1) Action')
    .replace(/gain a card costing up to (\d+) Coins?/gi, 'gain($1)')
    .replace(/gain a Drachma/gi, 'gain Drachma')
    .replace(/(\bgain\b[^.;]*?) to your discard pile/gi, '$1')
    .replace(/ onto your deck/g, ' topdeck');
  const expression = /\b(?<operation>trash|discard) (?<count>\d+) cards?\b|\bgain\((?<gainLimit>\+?\d+|Σ)\)|(?<amount>\+?\d+) (?<resource>Cards?|Buys?|Actions?|Coins?|Worship|VP)\b|\b(?<verb>trash|discard|gain|topdeck)\b(?: pile)?|→/gi;
  const parts: RulePart[] = [];
  let cursor = 0;
  for (const match of display.matchAll(expression)) {
    if (match.index! > cursor) parts.push({ kind: 'text', text: display.slice(cursor, match.index) });
    const groups = match.groups!;
    if (groups.operation) {
      parts.push({ kind: 'icon', resource: groups.operation.toLowerCase() as CardOperation, value: groups.count });
    } else if (groups.gainLimit) {
      parts.push({ kind: 'icon', resource: 'gain', value: groups.gainLimit });
    } else if (groups.amount) {
      const word = groups.resource.toLowerCase();
      const resource: Resource = word === 'vp' ? 'victory' : word === 'worship' ? 'worship' : word.startsWith('card') ? 'cards' : word.startsWith('buy') ? 'buys' : word.startsWith('action') ? 'actions' : 'coins';
      parts.push({ kind: 'icon', resource, value: groups.amount });
    } else if (groups.verb) {
      parts.push({ kind: 'icon', resource: groups.verb.toLowerCase() as CardOperation });
    } else {
      parts.push({ kind: 'arrow' });
    }
    cursor = match.index! + match[0].length;
  }
  if (cursor < display.length) parts.push({ kind: 'text', text: display.slice(cursor) });
  return parts;
}
