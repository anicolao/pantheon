import { cards } from './cards';
import { createPrng, shuffle } from './random';
import { applyPlayCommand, initialTurn, type ActionCommand, type Movement, type TurnState } from './actions';
export type SetupEvent = {
  schemaVersion: 1;
  creationToken?: string;
  sequence: number;
  actorUid: string;
  type: 'game/created' | 'player/joined' | 'table/resized' | 'draft/started' | 'leader/chosen' | ActionCommand['type'];
  instanceId?: string;
  choiceId?: string;
  targets?: string[];
  cardId?: string;
  reducerVersion?: 1;
  commandId?: string;
  seed?: string;
  leaderId?: string;
  name: string;
  playerCount: 2 | 3 | 4;
};
export const leaderIds = ['thaleia', 'nereon', 'melia', 'doreios'] as const;
export type CardInstance = { id: string; cardId: string; copy: number };
export type PlayerDeck = { hand: CardInstance[]; deck: CardInstance[]; discard: CardInstance[]; play: CardInstance[] };
export function leaderLinks(id: string) {
  const leader = cards.find(card => card.id === id && card.type === 'Leader');
  if (!leader) throw new Error('Unknown leader.');
  return { leader, temple: cards.find(card => card.uniqueStartingCard && card.god === leader.god)!, event: cards.find(card => card.type === 'Event' && card.god === leader.god)! };
}
export type SetupState = {
  turn: TurnState;
  supply: Record<string, number>;
  trash: CardInstance[];
  movements: Movement[];
  phase: 'gathering' | 'draft' | 'playing';
  seed: string | null;
  turnOrder: string[];
  draftOrder: string[];
  leaders: Record<string, string>;
  decks: Record<string, PlayerDeck>;
  sharedEvents: string[];
  dealtAtSequence: number | null;
  resources: { actions: number; buys: number; worship: number; coins: number };

  playerCount: 2 | 3 | 4;
  players: { uid: string; name: string }[];
  activity: { sequence: number; message: string }[];
};
/** Replay only committed events. No clock, random source, or mutable projection. */
export function replaySetup(events: SetupEvent[]): SetupState {
  const state: SetupState = { turn: initialTurn(), supply: {}, trash: [], movements: [], playerCount: 2, players: [], activity: [], phase: 'gathering', seed: null, turnOrder: [], draftOrder: [], leaders: {}, decks: {}, sharedEvents: [], dealtAtSequence: null, resources: { actions: 1, buys: 1, worship: 1, coins: 0 } };
  const commandIds = new Set<string>();
  for (const event of [...events].sort((a, b) => a.sequence - b.sequence)) {
    if (event.schemaVersion !== 1 || event.sequence !== state.activity.length + 1 ||
      ![2, 3, 4].includes(event.playerCount) || !event.actorUid ||
      typeof event.name !== 'string' || !event.name.trim() || event.name.length > 24) throw new Error('Invalid setup event stream.');
    if (event.type === 'draft/started' || event.type === 'leader/chosen' || ['action/played', 'choice/resolved', 'phase/advanced', 'treasure/played', 'card/bought', 'turn/ended'].includes(event.type)) {
      if (event.reducerVersion !== 1 || !event.commandId || event.commandId.length > 64 ||
        commandIds.has(event.commandId) ||
        event.playerCount !== state.playerCount || !state.players.some(player => player.uid === event.actorUid && player.name === event.name)) throw new Error('Invalid play event.');
      commandIds.add(event.commandId);
      if (event.type !== 'draft/started' && event.type !== 'leader/chosen') {
        state.activity.push({ sequence: event.sequence, message: applyPlayCommand(state, event.actorUid, event as ActionCommand, event.sequence) });
        continue;
      }
      if (event.type === 'draft/started') {
        if (state.phase !== 'gathering' || event.actorUid !== state.players[0]?.uid || state.players.length !== state.playerCount ||
          typeof event.seed !== 'string' || !event.seed.length || event.seed.length > 64) throw new Error('The host may begin once every seat is filled.');
        state.seed = event.seed;
        const first = Math.floor(createPrng(`${event.seed}:first-player`)() * state.players.length);
        state.turnOrder = [...state.players.slice(first), ...state.players.slice(0, first)].map(player => player.uid);
        state.draftOrder = [...state.turnOrder].reverse();
        state.phase = 'draft';
        state.activity.push({ sequence: event.sequence, message: `${state.players.find(player => player.uid === state.turnOrder[0])!.name} goes first. Choose your bloodlines in reverse order.` });
      } else {
        const chosen = Object.values(state.leaders);
        if (state.phase !== 'draft' || state.draftOrder[chosen.length] !== event.actorUid ||
          !leaderIds.includes(event.leaderId as typeof leaderIds[number]) || chosen.includes(event.leaderId!)) throw new Error('Choose an available leader on your draft turn.');
        state.leaders[event.actorUid] = event.leaderId!;
        state.sharedEvents.push(leaderLinks(event.leaderId!).event.id);
        state.activity.push({ sequence: event.sequence, message: `${event.name} chose ${leaderLinks(event.leaderId!).leader.name.split(',')[0]}.` });
        if (Object.keys(state.leaders).length === state.players.length) {
          for (const [seat, player] of state.players.entries()) {
            const inventory: CardInstance[] = [
              ...Array.from({ length: 6 }, (_, i) => ({ id: `seat-${seat}-obol-${i}`, cardId: 'obol', copy: 41 + seat * 6 + i })),
              ...Array.from({ length: 3 }, (_, i) => ({ id: `seat-${seat}-hamlet-${i}`, cardId: 'hamlet', copy: state.playerCount * 3 + 1 + seat * 3 + i })),
              { id: `seat-${seat}-temple`, cardId: leaderLinks(state.leaders[player.uid]).temple.id, copy: 1 }
            ];
            const shuffled = shuffle(inventory, `${state.seed}:starting-deck:${seat}`);
            state.decks[player.uid] = { hand: shuffled.slice(0, 5), deck: shuffled.slice(5), discard: [], play: [] };
          }
          state.supply = Object.fromEntries(setupSupply(state.playerCount).map(pile => [pile.id, pile.count]));
          state.phase = 'playing'; state.dealtAtSequence = event.sequence;
          state.activity.at(-1)!.message += ' Five cards dealt to each player.';
        }
      }
      continue;
    }
    if (state.phase !== 'gathering') throw new Error('The gathering has already begun.');
    if (event.type === 'table/resized') {
      if (event.actorUid !== state.players[0]?.uid || event.name !== state.players[0]?.name ||
        event.playerCount < state.players.length || event.playerCount === state.playerCount) throw new Error('Invalid table resize event.');
      state.playerCount = event.playerCount;
      state.activity.push({ sequence: event.sequence, message: `${event.name} set the table for ${event.playerCount} players.` });
      continue;
    }
    if (state.players.some(player => player.uid === event.actorUid)) throw new Error('Duplicate player.');
    if (event.sequence === 1) {
      if (event.type !== 'game/created') throw new Error('Missing game creation event.');
      state.playerCount = event.playerCount;
    } else if (event.type !== 'player/joined' || event.playerCount !== state.playerCount || state.players.length >= state.playerCount) {
      throw new Error('Invalid player join event.');
    }
    state.players.push({ uid: event.actorUid, name: event.name });
    state.activity.push({ sequence: event.sequence, message: `${event.name} ${event.type === 'game/created' ? 'created the table' : 'joined the table'}.` });
  }
  return state;
}
export function setupSupply(players: 2 | 3 | 4) {
  return cards.filter(card => card.type !== 'Leader' && card.type !== 'Event' && card.supply[players] > 0).map(card => ({ id: card.id, count: card.supply[players] }));
}
