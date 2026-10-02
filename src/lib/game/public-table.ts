import { activePlayer, definition, type Movement } from './actions';
import type { CardInstance, SetupEvent, SetupState } from './setup';

export type PublicZone = 'hand' | 'deck' | 'play' | 'discard' | 'supply' | 'trash' | 'reveal' | 'altar' | 'leader';
export type PublicAnchor = { zone: PublicZone; uid?: string; cardId?: string };
export type PublicStep = {
  id: string;
  kind: Movement['kind'] | 'cleanup';
  from: PublicAnchor;
  to: PublicAnchor;
  count: number;
  /** Absent for hidden draws and shuffles, even when viewing one's own Chronicle. */
  card?: CardInstance;
  effect: string;
  backs: boolean;
  devotion?: number;
};
export type PublicActivity = {
  sequence: number;
  choiceId?: string;
  undoneSequence?: number;
  actor: { uid: string; name: string };
  command: SetupEvent['type'];
  steps: PublicStep[];
  /** Net cost/reward for this command, never the next player's reset. */
  change: SetupState['resources'] | null;
  resources: { uid: string; values: SetupState['resources'] };
};

/** Capture before applying a command; no private card identities are retained. */
export function publicCommandContext(game: SetupState, uid: string) {
  const zones = game.decks[uid];
  if (!zones) throw new Error('Unknown player.');
  return {
    uid,
    movementIndex: game.movements.length,
    resources: { ...game.resources },
    handCount: zones.hand.length,
    playCount: zones.play.length
  };
}

/** Presentation derived from a committed command; it never changes game rules or state. */
export function describePublicCommand(
  before: ReturnType<typeof publicCommandContext>, game: SetupState, event: SetupEvent
): PublicActivity {
  const actor = game.players.find(player => player.uid === event.actorUid);
  if (!actor || before.uid !== actor.uid) throw new Error('Command actor does not match.');
  const owned = (zone: PublicZone): PublicAnchor => ({ zone, uid: actor.uid });
  const steps: PublicStep[] = [];
  if (event.type === 'turn/ended') {
    for (const [zone, count] of [['hand', before.handCount], ['play', before.playCount]] as const) {
      if (count) steps.push({ id: `${event.sequence}:cleanup:${zone}`, kind: 'cleanup', from: owned(zone), to: owned('discard'), count, backs: true, effect: 'Cleanup' });
    }
  }
  const revealed = new Set<string>();
  for (const movement of game.movements.slice(before.movementIndex)) {
    if (movement.sequence !== event.sequence || movement.uid !== actor.uid) throw new Error('Movement does not belong to this command.');
    const { kind, card } = movement;
    const source = definition(movement.source);
    let from: PublicAnchor, to: PublicAnchor;
    switch (kind) {
      case 'play': from = owned('hand'); to = owned('play'); break;
      case 'draw': from = owned('deck'); to = owned('hand'); break;
      case 'shuffle': from = owned('discard'); to = owned('deck'); break;
      case 'trash': from = owned('hand'); to = { zone: 'trash' }; break;
      case 'discard': from = owned(card && revealed.has(card.id) ? 'reveal' : 'hand'); to = owned('discard'); break;
      case 'gain': from = { zone: 'supply', cardId: card!.cardId }; to = owned('discard'); break;
      case 'topdeck': from = card && revealed.has(card.id) ? owned('reveal') : { zone: 'supply', cardId: card!.cardId }; to = owned('deck'); break;
      case 'reveal': from = owned('deck'); to = owned('reveal'); revealed.add(card!.id); break;
      case 'leader': from = { ...owned('leader'), cardId: source.id }; to = owned('play'); break;
      case 'worship': from = { zone: 'altar', cardId: source.id }; to = owned('play'); break;
    }
    const backs = kind === 'draw' || kind === 'shuffle';
    steps.push({
      id: `${event.sequence}:${movement.index}`, kind, from, to,
      count: kind === 'shuffle' ? movement.amount! : 1,
      effect: event.type === 'turn/ended' ? 'Cleanup' : source.name,
      backs,
      ...(kind === 'worship' ? { devotion: movement.amount } : {}),
      ...(!backs && card ? { card: { ...card } } : {})
    });
  }
  const values = { ...game.resources };
  return {
    ...(event.type === 'choice/resolved' ? { choiceId: event.choiceId } : {}),
    sequence: event.sequence, ...(event.type === 'action/undone' ? { undoneSequence: event.targetSequence } : {}), actor: { ...actor }, command: event.type, steps,
    change: event.type === 'turn/ended' ? null : {
      actions: values.actions - before.resources.actions,
      coins: values.coins - before.resources.coins,
      buys: values.buys - before.resources.buys,
      worship: values.worship - before.resources.worship
    },
    resources: { uid: activePlayer(game), values }
  };
}

/** A stable read-only tray. Incoming state cannot reorder the cards being inspected. */
export function publicPile(game: SetupState, uid: string, kind: 'play' | 'discard' | 'trash') {
  if (!game.decks[uid]) throw new Error('Unknown player.');
  if (!['play', 'discard', 'trash'].includes(kind)) throw new Error('Only public piles can be inspected.');
  return (kind === 'trash' ? game.trash : game.decks[uid][kind]).map(card => ({ ...card }));
}

/** Hidden decks offer a count, never an ordered list or a top-card identity. */
export function publicDeckCount(game: SetupState, uid: string) {
  if (!game.decks[uid]) throw new Error('Unknown player.');
  return game.decks[uid].deck.length;
}

/** Live animation delivery is separate from retained Chronicle entries. */
export class PublicMotionCursor {
  private sequence: number;
  private reconnecting = false;
  constructor(initialSequence: number) { this.sequence = initialSequence; }
  take(entries: readonly PublicActivity[], synchronized: boolean, visible = true): PublicActivity[] {
    if (!synchronized) { this.reconnecting = true; return []; }
    const fresh = entries.filter(entry => entry.sequence > this.sequence).sort((a, b) => a.sequence - b.sequence);
    const unique = fresh.filter((entry, index) => !index || entry.sequence !== fresh[index - 1].sequence);
    this.sequence = Math.max(this.sequence, unique.at(-1)?.sequence ?? 0);
    const deliver = !this.reconnecting && visible;
    this.reconnecting = false;
    return deliver ? unique : [];
  }
}

/** Reading position is explicit: new commits never advance the reader automatically. */
export class PublicReadingCursor {
  constructor(public through: number) {}
  unseen(entries: readonly PublicActivity[]) { return entries.filter(entry => entry.sequence > this.through).length; }
  acknowledge(sequence: number) { this.through = Math.max(this.through, sequence); }
}

/** Keep a bookkeeping phase transition from hiding the card effect it follows. */
export function latestMoveIndex(game: SetupState): number {
  let index=game.activity.length-1;
  while(index>0 && ['phase/advanced','choice/browsed'].includes(game.publicActivity.find(entry=>entry.sequence===game.activity[index].sequence)?.command ?? '')) index--;
  return Math.max(0,index);
}
