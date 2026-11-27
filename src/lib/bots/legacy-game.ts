import type {SetupState} from '../game/setup';
import type {SetupState as LegacyState} from '../../../balance-checkpoint/equal-turns/source/src/lib/game/setup';
import {cards} from '../../../balance-checkpoint/equal-turns/source/src/lib/game/cards';
const known = new Set(cards.map(card=>card.id));
/** Frozen policies are only valid for their trained card set. Never silently
 * project expansion effects into an observation the model cannot represent. */
export function legacyGame(game:SetupState):LegacyState {
  if ([...Object.values(game.leaders),...Object.keys(game.supply),...game.sharedEvents].some(id=>!known.has(id)) ||
      game.turn.deploy || game.turn.revealed?.length ||
      (game.turn.choice && !['gain','trash','discard'].includes(game.turn.choice.kind)) ||
      game.turn.queue.some(effect=>!['resource','draw','trash','discard','gain','reveal'].includes(effect.kind)))
    throw new Error('These bot models do not support expansion houses yet.');
  return game as unknown as LegacyState;
}
