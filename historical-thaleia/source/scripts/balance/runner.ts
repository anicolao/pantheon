import { activePlayer, applyPlayCommand, standings, type ActionCommand } from '../../src/lib/game/actions';
import { leaderIds, replaySetup, type SetupEvent } from '../../src/lib/game/setup';
import { chooseCommand, observe, type Observation, type Policy } from './bot';

export type PlayerCount = 2 | 3 | 4;
export function lineups(count: PlayerCount, remaining: readonly string[] = leaderIds): string[][] {
  const permute = (pool: readonly string[], n: number): string[][] => n === 0 ? [[]] : pool.flatMap(id =>
    permute(pool.filter(other => other !== id), n - 1).map(rest => [id, ...rest]));
  return permute(remaining, count);
}
export function setupMatch(seed: string, lineup: string[]) {
  if (![2, 3, 4].includes(lineup.length) || new Set(lineup).size !== lineup.length || lineup.some(id => !leaderIds.includes(id as typeof leaderIds[number]))) throw new Error('Choose 2–4 distinct leaders.');
  const count = lineup.length as PlayerCount;
  const events: SetupEvent[] = [];
  const add = (uid: string, data: Partial<SetupEvent>) => events.push({ schemaVersion: 1, sequence: events.length + 1,
    actorUid: uid, name: uid, playerCount: count, reducerVersion: 1, commandId: `setup-${events.length + 1}`, type: 'player/joined', ...data });
  for (let seat = 0; seat < count; seat++) add(`seat-${seat}`, { type: seat ? 'player/joined' : 'game/created' });
  add('seat-0', { type: 'draft/started', seed });
  const draft = replaySetup(events);
  for (const uid of draft.draftOrder) add(uid, { type: 'leader/chosen', leaderId: lineup[draft.turnOrder.indexOf(uid)] });
  return { game: replaySetup(events), events };
}
export type MatchResult = {
  seed: string; block: number; playerCount: PlayerCount; policy: Policy; lineup: string[]; turnOrder: string[];
  status: 'completed' | 'turn-limit' | 'command-limit' | 'error'; error?: string;
  commands: number; endCondition: 'acropolis' | 'three-piles' | null;
  players: { uid: string; leader: string; seat: number; turnPosition: number; score: number; turns: number; victoryShare: number | null }[];
};
export type MatchOptions = {
  seed: string; block: number; lineup: string[]; policy: Policy; maxTurns?: number; maxCommands?: number;
  decide?: (view: Observation, policy: Policy) => ActionCommand;
};
export function runMatch(options: MatchOptions): { result: MatchResult; events: SetupEvent[] } {
  const { seed, block, lineup, policy, maxTurns = 200, maxCommands = 10_000, decide = chooseCommand } = options;
  if (!Number.isSafeInteger(maxTurns) || maxTurns < 1 || !Number.isSafeInteger(maxCommands) || maxCommands < 1) throw new Error('Guards must be positive integers.');
  const { game, events } = setupMatch(seed, lineup);
  let status: MatchResult['status'] = 'completed', error: string | undefined, commands = 0, inTurn = 0;
  while (game.turn.phase !== 'finished') {
    const uid = activePlayer(game);
    if ((game.turn.turns[uid] ?? 0) >= maxTurns) { status = 'turn-limit'; break; }
    if (inTurn >= maxCommands) { status = 'command-limit'; break; }
    try {
      const command = decide(observe(game, uid), policy);
      const sequence = events.length + 1;
      const event: SetupEvent = { schemaVersion: 1, sequence, actorUid: uid, name: uid, playerCount: game.playerCount,
        reducerVersion: 1, commandId: `play-${sequence}`, ...command };
      // Keep even an illegal attempted command so failures can be reproduced.
      events.push(event);
      const message = applyPlayCommand(game, uid, command, sequence);
      game.activity.push({ sequence, message });
      commands++; inTurn++;
      if (command.type === 'turn/ended') inTurn = 0;
    } catch (cause) { status = 'error'; error = String(cause); break; }
  }
  const rows = standings(game), winners = rows.filter(row => row.winner).length;
  const result: MatchResult = { seed, block, playerCount: game.playerCount, policy, lineup: [...lineup], turnOrder: [...game.turnOrder], status,
    ...(error ? { error } : {}), commands, endCondition: status === 'completed' ? game.supply.acropolis === 0 ? 'acropolis' : 'three-piles' : null,
    players: rows.map(row => ({ uid: row.uid, leader: game.leaders[row.uid], seat: game.players.findIndex(player => player.uid === row.uid),
      turnPosition: game.turnOrder.indexOf(row.uid), score: row.score, turns: row.turns,
      victoryShare: status === 'completed' ? row.winner ? 1 / winners : 0 : null })) };
  return { result, events };
}
