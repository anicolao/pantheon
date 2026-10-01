import type { CardInstance, SetupState } from '$lib/game/setup';

/** Purchases stay visible on the table until cleanup, without becoming played Actions. */
export function tablePurchases(game: SetupState, uid: string): CardInstance[] {
  const purchases: CardInstance[] = [];
  const undone = new Set(game.publicActivity.map(entry => entry.undoneSequence).filter(sequence => sequence !== undefined));
  const discard = game.decks[uid]?.discard ?? [];
  for (const entry of [...game.publicActivity].reverse()) {
    if (entry.actor.uid !== uid) continue;
    if (entry.command === 'turn/ended') break;
    if (entry.command !== 'card/bought' || undone.has(entry.sequence)) continue;
    for (const step of entry.steps) {
      if (step.kind === 'gain' && step.card && discard.some(card => card.id === step.card!.id)) purchases.unshift(step.card);
    }
  }
  return purchases;
}
