import { cards } from './cards';
export type SetupEvent = {
  schemaVersion: 1;
  creationToken?: string;
  sequence: number;
  actorUid: string;
  type: 'game/created' | 'player/joined' | 'table/resized';
  name: string;
  playerCount: 2 | 3 | 4;
};
export type SetupState = {
  playerCount: 2 | 3 | 4;
  players: { uid: string; name: string }[];
  activity: { sequence: number; message: string }[];
};
/** Replay only committed events. No clock, random source, or mutable projection. */
export function replaySetup(events: SetupEvent[]): SetupState {
  const state: SetupState = { playerCount: 2, players: [], activity: [] };
  for (const event of [...events].sort((a, b) => a.sequence - b.sequence)) {
    if (event.schemaVersion !== 1 || event.sequence !== state.activity.length + 1 ||
      ![2, 3, 4].includes(event.playerCount) || !event.actorUid ||
      typeof event.name !== 'string' || !event.name.trim() || event.name.length > 24) throw new Error('Invalid setup event stream.');
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
