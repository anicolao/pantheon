import type { CardInstance, SetupState } from '$lib/game/setup';
import { treasuresRightToLeft } from './hand-order';

/** Match each Play all batch's landing slots to its departures from the fan.
 * Keep separate commands in order and leave the replayable engine zones untouched.
 */
export function tablePlayed(game: SetupState, uid: string): CardInstance[] {
  const played = [...(game.decks[uid]?.play ?? [])];
  const undone = new Set(game.publicActivity.map(entry => entry.undoneSequence));
  for (const entry of [...game.publicActivity].reverse()) {
    if (entry.actor.uid !== uid) continue;
    if (entry.command === 'turn/ended') break;
    if (entry.command !== 'treasures/played' || undone.has(entry.sequence)) continue;
    const ids = new Set(entry.steps.filter(step => step.kind === 'play').map(step => step.card?.id));
    const slots = played.flatMap((card, index) => ids.has(card.id) ? [index] : []);
    const ordered = treasuresRightToLeft(slots.map(index => played[index]));
    slots.forEach((slot, index) => { played[slot] = ordered[index]; });
  }
  return played;
}
