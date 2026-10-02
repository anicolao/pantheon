import { activePlayer, applyPlayCommand, definition, type ActionCommand } from './actions';
import type { SetupState } from './setup';

export type UndoTarget = { sequence: number; actorUid: string; label: string };
type Position = Pick<SetupState, 'turn' | 'decks' | 'supply' | 'trash' | 'resources'>;
const position = (game: SetupState): Position => structuredClone({ turn: game.turn, decks: game.decks, supply: game.supply, trash: game.trash, resources: game.resources });
export function canUndo(game: SetupState, uid: string) {
  return game.phase === 'playing' && game.turn.phase !== 'finished' && activePlayer(game) === uid && game.undo?.actorUid === uid;
}

/** Replay-local checkpoints. Only the public undo target is exposed in game state. */
export class UndoHistory {
  private checkpoints: { target: UndoTarget; before: Position }[] = [];
  apply(game: SetupState, uid: string, command: ActionCommand, sequence: number): string {
    // Public view changes are replayable, but are not gameplay undo checkpoints.
    if (command.type === 'choice/browsed') return applyPlayCommand(game, uid, command, sequence);
    if (command.type === 'action/undone') {
      const checkpoint = this.checkpoints.at(-1);
      if (!canUndo(game, uid) || !checkpoint || checkpoint.target.sequence !== command.targetSequence) throw new Error('That action can no longer be undone.');
      Object.assign(game, structuredClone(checkpoint.before));
      this.checkpoints.pop();
      game.undo = this.checkpoints.at(-1)?.target ?? null;
      return `${game.players.find(player => player.uid === uid)!.name} undid ${checkpoint.target.label}.`;
    }
    const before = position(game), movementIndex = game.movements.length;
    const message = applyPlayCommand(game, uid, command, sequence);
    // A draw is a barrier even when the top card was previously known. Reveals
    // also count when the revealed card is returned to exactly the same place.
    const disclosed = game.movements.slice(movementIndex).some(move => ['draw', 'reveal', 'shuffle'].includes(move.kind));
    if (disclosed || command.type === 'turn/ended') this.checkpoints = [];
    else if (!(command.type === 'phase/advanced' && command.automatic)) {
      this.checkpoints.push({ target: { sequence, actorUid: uid, label: undoLabel(before, uid, command) }, before });
    }
    // Automatic phase bookkeeping belongs to the preceding user action.
    game.undo = this.checkpoints.at(-1)?.target ?? null;
    return message;
  }
}
function undoLabel(before: Position, uid: string, command: Exclude<ActionCommand, { type: 'action/undone' }>) {
  switch (command.type) {
    case 'action/played': case 'treasure/played': return `playing ${definition(before.decks[uid].hand.find(card => card.id === command.instanceId)!.cardId).name}`;
    case 'treasures/played': return 'playing all Treasures';
    case 'card/bought': return `buying ${definition(command.cardId).name}`;
    case 'god/worshipped': return `worshipping ${definition(command.cardId).god}`;
    case 'choice/resolved': return `the ${definition(before.turn.choice!.source).name} choice`;
    case 'choice/browsed': return 'browsing the market';
    case 'phase/advanced': return 'advancing the phase';
    case 'turn/ended': return 'ending the turn';
  }
}
