import { activePlayer, applyPlayCommand, definition, standings, type ActionCommand, type PlayVariant } from '../../src/lib/game/actions';
import type { SetupEvent, SetupState } from '../../src/lib/game/setup';
import { setupMatch, type PlayerCount } from './runner';
import { inventoryAtSetup, strategyCommand, strategyView, updateInventory, type Family, type Profile, type Restriction } from './strategy';

export type Telemetry = {
  worship: Record<string, { standard: number; favored: number; offGod: number; coins: number }>;
  acquisitions: Record<string, number>; trashes: Record<string, number>;
  leaderTriggers: number; unusedCoins: number; unusedActions: number; unusedBuys: number;
  firstScoreTurn: number | null; finalDeckSize: number; scoreMargin: number;
};
export type StudyResult = {
  seed: string; block: number; count: PlayerCount; lineup: string[]; profiles: Profile[]; focal: number;
  restriction?: Restriction; variant?: PlayVariant; status: 'completed' | 'turn-limit' | 'command-limit' | 'error'; error?: string;
  commands: number; end: 'acropolis' | 'three-piles' | null;
  players: { uid: string; leader: string; family: Family; seat: number; position: number; score: number; turns: number; share: number | null; telemetry: Telemetry }[];
};
export type ExperimentOptions = {
  seed: string; block: number; lineup: string[]; profiles: Profile[]; focal: number; restriction?: Restriction; variant?: PlayVariant;
  maxTurns?: number; maxCommands?: number;
};
export function applicable(restriction: Restriction | undefined, position: number, focal: number): Restriction | undefined {
  return restriction && (restriction.scope === 'table' || position === focal) ? restriction : undefined;
}
function applyVariant(game: SetupState, uid: string, command: ActionCommand, sequence: number, restriction?: Restriction, variant: PlayVariant = 'standard'): string {
  if (restriction?.kind === 'leader-trigger' && game.leaders[uid] === restriction.id) game.turn.leaderUsed = true;
  if (restriction?.kind === 'event' && command.type === 'god/worshipped' && command.cardId === restriction.id) throw new Error('Restricted Worship attempted.');
  if (restriction?.kind === 'card' && (command.type === 'card/bought' && command.cardId === restriction.id || command.type === 'choice/resolved' && game.turn.choice?.kind === 'gain' && command.targets.includes(restriction.id))) throw new Error('Restricted acquisition attempted.');
  return applyPlayCommand(game, uid, command, sequence, variant);
}
/** Attribution variants must replay through this wrapper, not vanilla replaySetup. */
export function replayExperiment(events: SetupEvent[], options: Pick<ExperimentOptions, 'lineup' | 'seed' | 'restriction' | 'focal' | 'variant'>): SetupState {
  const { game, events: setup } = setupMatch(options.seed, options.lineup);
  if (JSON.stringify(events.slice(0, setup.length)) !== JSON.stringify(setup)) throw new Error('Replay setup does not match manifest.');
  for (const event of events.slice(setup.length)) {
    if (event.sequence !== game.activity.length + 1) throw new Error('Invalid replay sequence.');
    const position = game.turnOrder.indexOf(event.actorUid);
    const message = applyVariant(game, event.actorUid, event as ActionCommand, event.sequence, applicable(options.restriction, position, options.focal), options.variant);
    game.activity.push({ sequence: event.sequence, message });
  }
  return game;
}
export function runExperiment(options: ExperimentOptions): { result: StudyResult; events: SetupEvent[] } {
  const { seed, block, lineup, profiles, focal, restriction, variant = 'standard', maxTurns = 200, maxCommands = 10_000 } = options;
  if (profiles.length !== lineup.length || !Number.isInteger(focal) || focal < 0 || focal >= lineup.length) throw new Error('Profiles and focal position must match the lineup.');
  if (![maxTurns, maxCommands].every(value => Number.isSafeInteger(value) && value > 0)) throw new Error('Invalid guards.');
  const { game, events } = setupMatch(seed, lineup), inventory = inventoryAtSetup(game), acquired = new Set<string>();
  const metrics = Object.fromEntries(game.turnOrder.map(uid => [uid, { worship: {}, acquisitions: {}, trashes: {}, leaderTriggers: 0,
    unusedCoins: 0, unusedActions: 0, unusedBuys: 0, firstScoreTurn: null, finalDeckSize: 0, scoreMargin: 0 } as Telemetry]));
  let status: StudyResult['status'] = 'completed', error: string | undefined, commands = 0, inTurn = 0;
  while (game.turn.phase !== 'finished') {
    const uid = activePlayer(game), position = game.turnOrder.indexOf(uid), activeRestriction = applicable(restriction, position, focal), telemetry = metrics[uid];
    if ((game.turn.turns[uid] ?? 0) >= maxTurns) { status = 'turn-limit'; break; }
    if (inTurn >= maxCommands) { status = 'command-limit'; break; }
    try {
      if (activeRestriction?.kind === 'leader-trigger' && game.leaders[uid] === activeRestriction.id) game.turn.leaderUsed = true;
      const view = strategyView(game, uid, inventory, activeRestriction), command = strategyCommand(view, profiles[position]);
      const sequence = events.length + 1, start = game.movements.length;
      const event: SetupEvent = { schemaVersion: 1, sequence, actorUid: uid, name: uid, playerCount: game.playerCount, reducerVersion: 1, commandId: `play-${sequence}`, ...command };
      events.push(event);
      if (command.type === 'turn/ended') { telemetry.unusedCoins += game.resources.coins; telemetry.unusedActions += game.resources.actions; telemetry.unusedBuys += game.resources.buys; }
      const message = applyVariant(game, uid, command, sequence, activeRestriction, variant);
      game.activity.push({ sequence, message });
      const before = { ...inventory[uid] };
      updateInventory(inventory, game, start, acquired);
      for (const [id, count] of Object.entries(inventory[uid])) if (count > (before[id] ?? 0)) {
        telemetry.acquisitions[id] = (telemetry.acquisitions[id] ?? 0) + count - (before[id] ?? 0);
        if (definition(id).type === 'Territory' && telemetry.firstScoreTurn === null) telemetry.firstScoreTurn = (game.turn.turns[uid] ?? 0) + 1;
      }
      // A multi-effect trigger emits multiple leader movements, but fires once.
      const triggeredLeaders = new Set<string>();
      for (const move of game.movements.slice(start)) {
        if (move.kind === 'leader') triggeredLeaders.add(move.source);
        if (move.kind === 'trash' && move.card) telemetry.trashes[move.card.cardId] = (telemetry.trashes[move.card.cardId] ?? 0) + 1;
        if (move.kind === 'worship') {
          const item = telemetry.worship[move.source] ??= { standard: 0, favored: 0, offGod: 0, coins: 0 };
          if ((move.amount ?? 0) >= 2) item.favored++; else item.standard++;
          if (definition(move.source).god !== definition(game.leaders[uid]).god) item.offGod++;
          item.coins += definition(move.source).cost!;
        }
      }
      telemetry.leaderTriggers += triggeredLeaders.size;
      commands++; inTurn++;
      if (command.type === 'turn/ended') inTurn = 0;
    } catch (cause) { status = 'error'; error = String(cause); break; }
  }
  const rows = standings(game), winners = rows.filter(row => row.winner).length;
  return { events, result: { seed, block, count: game.playerCount, lineup, profiles, focal, ...(restriction ? { restriction } : {}), ...(variant !== 'standard' ? { variant } : {}), status, ...(error ? { error } : {}), commands,
    end: status === 'completed' ? game.supply.acropolis === 0 ? 'acropolis' : 'three-piles' : null,
    players: rows.map(row => {
      const position = game.turnOrder.indexOf(row.uid), telemetry = metrics[row.uid];
      telemetry.finalDeckSize = Object.values(inventory[row.uid]).reduce((sum, count) => sum + count, 0);
      telemetry.scoreMargin = row.score - Math.max(...rows.filter(other => other.uid !== row.uid).map(other => other.score));
      return { uid: row.uid, leader: game.leaders[row.uid], family: profiles[position].family, seat: game.players.findIndex(player => player.uid === row.uid), position,
        score: row.score, turns: row.turns, share: status === 'completed' ? row.winner ? 1 / winners : 0 : null, telemetry };
    }) } };
}
