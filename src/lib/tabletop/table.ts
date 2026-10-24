import {botLeaderPreference} from '../game/bot-kind';
import { createPrng } from '../game/random';
import { leaderIds, replaySetup, type SetupEvent, type SetupState } from '../game/setup';
import { initialTurn, activePlayer, canPlayAction } from '../game/actions';
import type { GameCommand } from '../backend/setup-repository';

/** Clockwise as seen from above, starting at the bottom of the display. */
export const edges = ['south', 'west', 'north', 'east'] as const;
export type Edge = typeof edges[number];
export type Seat = { edge: Edge; leader: typeof leaderIds[number]; mode: 'empty' | 'human' | 'bot'; joined: number };
export type Tabletop = { version: 1; seats: Seat[]; randomize: boolean; seed: string; events: SetupEvent[] };
export function freshTable(): Tabletop {
  return { version: 1, seats: edges.map((edge, i) => ({ edge, leader: leaderIds[i], mode: 'empty', joined: 0 })), randomize: false, seed: '', events: [] };
}
export const seatUid = (edge: Edge) => `tabletop-${edge}`;
export const seatName = (edge: Edge) => edge[0].toUpperCase() + edge.slice(1);
export function occupy(table: Tabletop, edge: Edge, mode: Seat['mode']): Tabletop {
  if (table.events.length) throw Error('Seats are fixed after the game begins.');
  const joined = Math.max(0, ...table.seats.map(seat => seat.joined)) + 1;
  return { ...table, seats: table.seats.map(seat => seat.edge !== edge ? seat : { ...seat, mode, joined: mode === 'empty' ? 0 : seat.mode === 'empty' ? joined : seat.joined }) };
}
export function actor(game: SetupState): string {
  return game.phase === 'draft' ? game.draftOrder[Object.keys(game.leaders).length] : activePlayer(game);
}
export function append(table: Tabletop, uid: string, command: GameCommand): Tabletop {
  const game = replaySetup(table.events), player = game.players.find(player => player.uid === uid);
  if (!player) throw Error('That seat is not playing.');
  const sequence = table.events.length + 1;
  const event: SetupEvent = { schemaVersion: 1, reducerVersion: 1, commandId: `tabletop-${sequence}`, sequence,
    actorUid: uid, name: player.name, playerCount: game.playerCount, ...command };
  const next = { ...table, events: [...table.events, event] };
  replaySetup(next.events); // Commit only commands accepted by the ordinary game rules.
  return next;
}
export function begin(table: Tabletop, seed: string, startingUid?: string): Tabletop {
  if (table.events.length) throw Error('This game has already begun.');
  const occupied = table.seats.filter(seat => seat.mode !== 'empty');
  if (occupied.length < 2 || occupied.length > 4) throw Error('Join at least two edges to play.');
  const count = occupied.length as 2 | 3 | 4;
  const first = Math.floor(createPrng(`${seed}:first-player`)() * count);
  let desired = table.randomize ? occupied : [...occupied].sort((a, b) => b.joined - a.joined);
  if (startingUid) {
    const index = desired.findIndex(seat => seatUid(seat.edge) === startingUid);
    if (index < 0) throw Error('The starting seat is not playing.');
    desired = [...desired.slice(index), ...desired.slice(0, index)];
  }
  // The ordinary reducer rotates its seating list by the seeded first-player
  // index. For preset play, arrange that list so the rotation produces reverse
  // join order. No reducer state overrides, special rules, or seed searching.
  const players = table.randomize && !startingUid ? desired : [...desired.slice(count - first), ...desired.slice(0, count - first)];
  let events: SetupEvent[] = players.map((seat, i) => ({ schemaVersion: 1, sequence: i + 1, actorUid: seatUid(seat.edge),
    name: seatName(seat.edge), playerCount: count, type: i === 0 ? 'game/created' : 'player/joined',
    ...(i === 0 ? {equalTurns: initialTurn().equalTurns} : {}),
    ...(seat.mode === 'bot' && i > 0 ? { botKind: 'bot' as const } : {}) }));
  if (players[0].mode === 'bot') events.push({ schemaVersion: 1, sequence: events.length + 1, actorUid: events[0].actorUid,
    name: events[0].name, playerCount: count, type: 'player/automated', botKind: 'bot' });
  let next: Tabletop = { ...table, seed, events };
  next = append(next, events[0].actorUid, { type: 'draft/started', seed });
  if (!table.randomize) {
    const reserved = occupied.filter(seat => seat.mode === 'human').map(seat => seat.leader);
    for (const uid of replaySetup(next.events).draftOrder) {
      const seat = occupied.find(seat => seatUid(seat.edge) === uid)!;
      const chosen = Object.values(replaySetup(next.events).leaders);
      const available = leaderIds.filter(id => !chosen.includes(id) && !reserved.includes(id));
      const leaderId = seat.mode === 'human' ? seat.leader : botLeaderPreference.find(id => available.includes(id))!;
      next = append(next, uid, { type: 'leader/chosen', leaderId });
    }
  }
  return next;
}
export function advanceEmptyActions(table: Tabletop): Tabletop {
  if (!table.events.length) return table;
  const game = replaySetup(table.events), uid = activePlayer(game);
  if (game.phase === 'playing' && game.turn.phase === 'actions' && !game.turn.choice && !game.decks[uid].hand.some(card => canPlayAction(game, uid, card.id))) {
    return append(table, uid, { type: 'phase/advanced', automatic: true });
  }
  return table;
}
export function restoreTable(raw: string): Tabletop {
  const table = JSON.parse(raw) as Tabletop;
  if (table.version !== 1 || typeof table.randomize !== 'boolean' || typeof table.seed !== 'string' || !Array.isArray(table.events) ||
      !Array.isArray(table.seats) || table.seats.length !== 4 || table.seats.some((seat, i) => seat.edge !== edges[i] ||
        !leaderIds.includes(seat.leader) || !['human', 'bot', 'empty'].includes(seat.mode) || !Number.isSafeInteger(seat.joined) || seat.joined < 0) ||
      new Set(table.seats.map(seat => seat.leader)).size !== 4) throw Error('The saved tabletop is invalid.');
  const occupied = table.seats.filter(seat => seat.mode !== 'empty');
  if (new Set(occupied.map(seat => seat.joined)).size !== occupied.length) throw Error('The saved seating order is invalid.');
  if (table.events.length) {
    const game = replaySetup(table.events);
    if (game.players.length !== occupied.length || game.players.some(player => !occupied.some(seat => seatUid(seat.edge) === player.uid && (seat.mode === 'bot') === !!player.botKind))) throw Error('The saved players do not match their seats.');
  }
  return table;
}

/** Pass first-player responsibility to the next player without moving any seats. */
export function rematch(table: Tabletop, seed: string): Tabletop {
  const game = replaySetup(table.events);
  if (game.turn.phase !== 'finished') throw Error('Finish this game before starting a rematch.');
  return begin({ ...table, events: [], seed: '' }, seed, game.turnOrder[1]);
}
