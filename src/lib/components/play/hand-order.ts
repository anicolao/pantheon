import { actionEffects, definition } from '$lib/game/actions';
import type { CardInstance } from '$lib/game/setup';

/** Display order only: never reorder the engine's hand or deck. Stronger cards go right. */
export function sortHand(hand: readonly CardInstance[]): CardInstance[] {
  const rank = (instance: CardInstance) => {
    const card = definition(instance.cardId);
    if (card.type === 'Territory') return [0, card.vp ?? 0, card.cost ?? 0];
    if (card.type === 'Treasure') {
      const coins = { obol: 1, drachma: 2, talent: 3 }[card.id] ?? 0;
      return [1, coins, card.cost ?? 0];
    }
    if (card.type === 'Action') {
      const actions = actionEffects(card.id).reduce((sum, effect) => sum + (effect.kind === 'resource' && effect.resource === 'actions' ? effect.amount : 0), 0);
      return [actions > 0 ? 3 : 2, actions, card.cost ?? 0];
    }
    return [4, 0, card.cost ?? 0];
  };
  return [...hand].sort((a, b) => {
    const left = rank(a), right = rank(b);
    for (let index = 0; index < left.length; index++) if (left[index] !== right[index]) return left[index] - right[index];
    return definition(a.cardId).number - definition(b.cardId).number || a.copy - b.copy || a.id.localeCompare(b.id);
  });
}
