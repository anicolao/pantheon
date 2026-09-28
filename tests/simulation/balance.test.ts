import { expect, test } from 'bun:test';
import { replaySetup } from '../../src/lib/game/setup';
import { standings } from '../../src/lib/game/actions';
import { chooseCommand, observe, policies } from '../../scripts/balance/bot';
import { lineups, runMatch, setupMatch } from '../../scripts/balance/runner';
import { interval, report } from '../../scripts/balance/report';

test('schedules cover every ordered distinct leader assignment and legal reverse draft', () => {
  for (const count of [2, 3, 4] as const) {
    const schedule = lineups(count);
    expect(schedule).toHaveLength(count === 2 ? 12 : 24);
    expect(new Set(schedule.map(row => row.join(','))).size).toBe(schedule.length);
    for (const lineup of schedule) {
      const { game } = setupMatch('schedule', lineup);
      expect(game.turnOrder.map(uid => game.leaders[uid])).toEqual(lineup);
      expect(game.phase).toBe('playing');
    }
  }
});

test('bots cannot observe seed, draw order, opposing hands, or private history', () => {
  const { game } = setupMatch('private', ['thaleia', 'melia']);
  const uid = game.turnOrder[0], opponent = game.turnOrder[1];
  const before = observe(game, uid);
  game.seed = 'a different seed';
  game.decks[uid].deck.reverse();
  game.decks[opponent].hand = [];
  game.movements.push({ sequence: 999, index: 0, uid: opponent, kind: 'draw', source: 'melia' });
  expect(observe(game, uid)).toEqual(before);
  before.hand.length = 0;
  expect(game.decks[uid].hand.length).toBe(5);
});

test('both policies finish every lineup; saved events replay to the same scores and tiebreaks', () => {
  for (const count of [2, 3, 4] as const) for (const policy of policies) for (const lineup of lineups(count)) {
    const options = { seed: 'test-league', block: 0, lineup, policy };
    const { result, events } = runMatch(options);
    expect(result.status).toBe('completed');
    expect(result.players.reduce((sum, row) => sum + row.victoryShare!, 0)).toBeCloseTo(1);
    const replayed = replaySetup(events), rows = standings(replayed), winners = rows.filter(row => row.winner).length;
    expect(replayed.turn.phase).toBe('finished');
    expect(result.players.map(row => [row.uid, row.score, row.turns, row.victoryShare])).toEqual(rows.map(row => [row.uid, row.score, row.turns, row.winner ? 1 / winners : 0]));
  }
}, 180000); // 120 complete games, including sampled EV money policies.

test('seeded runs are deterministic, and guards/errors never become scored losses', () => {
  const options = { seed: 'repeat', block: 0, lineup: ['nereon', 'doreios'], policy: 'draw' as const };
  expect(runMatch(options)).toEqual(runMatch(options));
  for (const [overrides, status] of [
    [{ maxTurns: 1 }, 'turn-limit'], [{ maxCommands: 1 }, 'command-limit'],
    [{ decide: () => ({ type: 'card/bought' as const, cardId: 'acropolis' }) }, 'error']] as const) {
    const { result, events } = runMatch({ ...options, ...overrides });
    expect(result.status).toBe(status);
    expect(result.endCondition).toBeNull();
    expect(result.players.every(row => row.victoryShare === null)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
  }
});

test('required gains are resolved and Doreios preserves starting income', () => {
  const { game } = setupMatch('choice', ['doreios', 'melia']);
  const view = observe(game, game.turnOrder[0]);
  view.choice = { id: 'gain', source: 'sacred-grove', kind: 'gain', min: 1, max: 1, limit: 4, actionOnly: true };
  expect(chooseCommand(view, 'draw')).toEqual({ type: 'choice/resolved', choiceId: 'gain', targets: ['harbor-pilot'] });
  view.choice = { id: 'trash', source: 'doreios', kind: 'trash', min: 0, max: 1 };
  view.hand = [{ id: 'coin', cardId: 'obol', copy: 1 }];
  expect(chooseCommand(view, 'treasure')).toEqual({ type: 'choice/resolved', choiceId: 'trash', targets: [] });
});

test('uncertainty uses blocks and failed blocks are excluded explicitly', () => {
  expect(interval([0.5, 0.5], 'fixed')).toEqual([0.5, 0.5]);
  expect(interval([0.5], 'fixed')).toBeNull();
  const complete = runMatch({ seed: 'report', block: 0, lineup: ['thaleia', 'nereon'], policy: 'treasure' }).result;
  const failed = { ...complete, status: 'error' as const };
  expect(report([complete, failed])).not.toContain('| 2 | treasure | thaleia |');
  expect(report([complete])).toContain('insufficient blocks');
});
