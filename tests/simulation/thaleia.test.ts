import { expect, test } from 'bun:test';
import { activePlayer, applyPlayCommand, standings } from '../../src/lib/game/actions';
import { setupMatch } from '../../scripts/balance/runner';
import { candidates } from '../../scripts/balance/strategy';
import { replayExperiment, runExperiment } from '../../scripts/balance/experiment';
import { thaleiaLineups, thaleiaReport, type VariantPair } from '../../scripts/balance/thaleia';

function fixture() {
  const { game } = setupMatch('thaleia-unit', ['thaleia', 'melia']);
  const uid = activePlayer(game);
  game.decks[uid].hand = ['temple-of-athena', 'council-of-sages', 'oracles-acolyte'].map((cardId, i) => ({ id: `hand-${i}`, cardId, copy: 1 }));
  game.decks[uid].deck = Array.from({ length: 12 }, (_, i) => ({ id: `deck-${i}`, cardId: 'obol', copy: i + 1 }));
  game.decks[uid].discard = [];
  return { game, uid };
}
test('Thaleia gets exactly one extra draw after her first matching Action, with standard rules unchanged', () => {
  const { game, uid } = fixture(), baseline = structuredClone(game);
  applyPlayCommand(baseline, uid, { type: 'action/played', instanceId: 'hand-0' }, 100);
  applyPlayCommand(game, uid, { type: 'action/played', instanceId: 'hand-0' }, 100, 'thaleia-draw');
  expect(game.resources).toEqual(baseline.resources);
  expect(game.decks[uid].hand.length).toBe(baseline.decks[uid].hand.length + 1);
  expect(game.decks[uid].hand.at(-1)?.id).toBe('deck-0');
  applyPlayCommand(game, uid, { type: 'action/played', instanceId: 'hand-2' }, 101, 'thaleia-draw');
  expect(game.movements.filter(move => move.kind === 'draw' && move.source === 'thaleia')).toHaveLength(1);
  expect(game.movements.filter(move => move.kind === 'draw' && move.source === 'oracles-acolyte')).toHaveLength(1);
  applyPlayCommand(game, uid, { type: 'phase/advanced' }, 102, 'thaleia-draw');
  applyPlayCommand(game, uid, { type: 'turn/ended' }, 103, 'thaleia-draw');
  const opponent = activePlayer(game);
  applyPlayCommand(game, opponent, { type: 'phase/advanced' }, 104, 'thaleia-draw');
  applyPlayCommand(game, opponent, { type: 'turn/ended' }, 105, 'thaleia-draw');
  expect(game.turn.leaderUsed).toBe(false);
  game.decks[uid].hand = [{ id: 'new-temple', cardId: 'temple-of-athena', copy: 1 }];
  applyPlayCommand(game, uid, { type: 'action/played', instanceId: 'new-temple' }, 106, 'thaleia-draw');
  expect(game.movements.filter(move => move.kind === 'draw' && move.source === 'thaleia' && move.sequence === 106)).toHaveLength(1);
});
test('Council resolves its own draw before the bonus, which uses the production reshuffle', () => {
  const { game, uid } = fixture();
  game.decks[uid].deck = game.decks[uid].deck.slice(0, 3);
  game.decks[uid].discard = [{ id: 'reshuffled-card', cardId: 'drachma', copy: 1 }];
  applyPlayCommand(game, uid, { type: 'action/played', instanceId: 'hand-1' }, 100, 'thaleia-draw');
  expect(game.resources.actions).toBe(1);
  expect(game.decks[uid].hand.slice(-4).map(card => card.id)).toEqual(['deck-0', 'deck-1', 'deck-2', 'reshuffled-card']);
  expect(game.movements.filter(move => move.kind === 'draw').map(move => move.source)).toEqual(['council-of-sages', 'council-of-sages', 'council-of-sages', 'thaleia']);
  expect(game.turn.shuffles[uid]).toBe(1);
});
test('the variant leaves other leaders byte-for-byte unchanged', () => {
  const options = { seed: 'no-thaleia', block: 0, lineup: ['nereon', 'melia', 'doreios'], focal: 0,
    profiles: Array.from({ length: 3 }, () => ({ family: 'engine' as const, parameters: candidates[0] })) };
  const baseline = runExperiment(options), variant = runExperiment({ ...options, variant: 'thaleia-draw' });
  expect(variant.events).toEqual(baseline.events);
  expect(variant.result.players).toEqual(baseline.result.players);
});
test('variant games complete and replay; multi-effect triggers are counted once', () => {
  for (const count of [2, 3, 4] as const) {
    const options = { seed: 'thaleia-replay', block: 0, lineup: ['thaleia', 'nereon', 'melia', 'doreios'].slice(0, count), focal: 0,
      profiles: Array.from({ length: count }, () => ({ family: 'engine' as const, parameters: candidates[0] })), variant: 'thaleia-draw' as const };
    const { result, events } = runExperiment(options), replayed = replayExperiment(events, options);
    expect(result.status).toBe('completed');
    expect(standings(replayed).map(row => [row.uid, row.score, row.turns])).toEqual(result.players.map(row => [row.uid, row.score, row.turns]));
    const player = result.players.find(row => row.leader === 'thaleia')!;
    expect(player.telemetry.leaderTriggers).toBe(new Set(replayed.movements.filter(move => move.kind === 'leader' && move.source === 'thaleia').map(move => move.sequence)).size);
    expect(player.telemetry.leaderTriggers).toBeLessThanOrEqual(player.turns);
  }
});
test('the schedule balances every subset and seat and covers opponent orders over blocks', () => {
  for (const count of [2, 3, 4] as const) {
    const seen = new Set<string>();
    for (let block = 0; block < 200; block++) {
      const rows = thaleiaLineups(count, `schedule:${block}`);
      expect(rows).toHaveLength(count === 2 ? 6 : count === 3 ? 9 : 4);
      for (let position = 0; position < count; position++) expect(rows.filter(row => row[position] === 'thaleia')).toHaveLength(rows.length / count);
      for (const row of rows) { expect(new Set(row).size).toBe(count); seen.add(row.join(',')); }
    }
    expect(seen.size).toBe(count === 2 ? 6 : count === 3 ? 18 : 24);
  }
});
test('reports orient the effect toward the proposed rule and exclude failed pairs', () => {
  const options = { seed: 'report-variant', block: 0, lineup: ['thaleia', 'nereon'], focal: 0, profiles: Array.from({ length: 2 }, () => ({ family: 'treasure' as const, parameters: candidates[0] })) };
  const baseline = runExperiment(options).result, variant = structuredClone(baseline);
  baseline.players.find(row => row.leader === 'thaleia')!.share = 0;
  variant.players.find(row => row.leader === 'thaleia')!.share = 1;
  const pair: VariantPair = { id: 'sign', block: 0, count: 2, family: 'treasure', opponent: 'treasure', baseline, variant };
  expect(thaleiaReport([pair], false).markdown).toContain('+100.0 pp');
  variant.status = 'error'; variant.players.forEach(row => row.share = null);
  expect(thaleiaReport([pair], false).markdown).toContain('1 incomplete pairs');
});


test('leader buffs add one coin/card beyond existing triggers, once per turn with reset', () => {
  for (const [leader, temple] of [['nereon', 'temple-of-poseidon'], ['melia', 'temple-of-demeter']]) {
    const { game } = setupMatch('leader-buffs-unit', [leader, 'doreios']);
    const uid = activePlayer(game);
    game.resources.actions = 3;
    game.decks[uid].hand = [0, 1].map(i => ({ id: `temple-${i}`, cardId: temple, copy: i + 1 }));
    game.decks[uid].deck = [{ id: 'top', cardId: 'obol', copy: 1 }];
    game.decks[uid].discard = [{ id: 'reshuffle', cardId: 'obol', copy: 2 }];
    const before = structuredClone(game);
    for (const [target, variant] of [[before, 'thaleia-draw'], [game, 'leader-buffs']] as const) {
      applyPlayCommand(target, uid, { type: 'action/played', instanceId: 'temple-0' }, 100, variant);
      applyPlayCommand(target, uid, { type: 'action/played', instanceId: 'temple-1' }, 101, variant);
    }
    expect(game.resources.coins - before.resources.coins).toBe(leader === 'nereon' ? 1 : 0);
    expect(game.decks[uid].hand.length - before.decks[uid].hand.length).toBe(leader === 'melia' ? 1 : 0);
    if (leader === 'melia') {
      expect(game.decks[uid].hand.map(card => card.id)).toEqual(['top', 'reshuffle']);
      expect(game.turn.shuffles[uid]).toBe(1);
    }
    expect(game.turn.leaderUsed).toBe(true);
    applyPlayCommand(game, uid, { type: 'phase/advanced' }, 102, 'leader-buffs');
    applyPlayCommand(game, uid, { type: 'turn/ended' }, 103, 'leader-buffs');
    const other = activePlayer(game);
    applyPlayCommand(game, other, { type: 'phase/advanced' }, 104, 'leader-buffs');
    applyPlayCommand(game, other, { type: 'turn/ended' }, 105, 'leader-buffs');
    expect(game.turn.leaderUsed).toBe(false);
    game.decks[uid].hand = [{ id: 'again', cardId: temple, copy: 1 }];
    game.decks[uid].deck = [0, 1].map(i => ({ id: `again-${i}`, cardId: 'obol', copy: i + 1 }));
    game.decks[uid].discard = [];
    const coins = game.resources.coins;
    applyPlayCommand(game, uid, { type: 'action/played', instanceId: 'again' }, 106, 'leader-buffs');
    expect(game.turn.leaderUsed).toBe(true);
    if (leader === 'melia') expect(game.decks[uid].hand).toHaveLength(2);
    else expect(game.resources.coins - coins).toBe(2);
  }
});

test('leader buffs preserve Thaleia versus Doreios exactly and replay each buffed rival', () => {
  for (const leader of ['nereon', 'melia', 'doreios']) {
    const options = { seed: 'leader-buffs-replay', block: 0, lineup: ['thaleia', leader], focal: 0,
      profiles: Array.from({ length: 2 }, () => ({ family: 'engine' as const, parameters: candidates[1] })) };
    const run = runExperiment({ ...options, variant: 'leader-buffs' });
    expect(run.result.status).toBe('completed');
    const replayed = replayExperiment(run.events, { ...options, variant: 'leader-buffs' });
    expect(standings(replayed).map(row => [row.uid, row.score, row.turns])).toEqual(run.result.players.map(row => [row.uid, row.score, row.turns]));
    if (leader === 'doreios') {
      const old = runExperiment({ ...options, variant: 'thaleia-draw' });
      expect(run.events).toEqual(old.events); expect(run.result.players).toEqual(old.result.players);
    }
  }
});


test('Thaleia buy variant adds one Buy without an extra card, once per turn with reset', () => {
  const { game, uid } = fixture(), baseline = structuredClone(game);
  for (const [state, variant] of [[baseline, 'standard'], [game, 'thaleia-buy']] as const) {
    applyPlayCommand(state, uid, { type: 'action/played', instanceId: 'hand-0' }, 100, variant);
    applyPlayCommand(state, uid, { type: 'action/played', instanceId: 'hand-2' }, 101, variant);
  }
  expect(game.resources).toEqual({ ...baseline.resources, buys: baseline.resources.buys + 1 });
  expect(game.decks).toEqual(baseline.decks);
  expect(game.movements.filter(move => move.source === 'thaleia' && move.kind === 'draw')).toHaveLength(0);
  applyPlayCommand(game, uid, { type: 'phase/advanced' }, 102, 'thaleia-buy');
  applyPlayCommand(game, uid, { type: 'turn/ended' }, 103, 'thaleia-buy');
  const other = activePlayer(game);
  applyPlayCommand(game, other, { type: 'phase/advanced' }, 104, 'thaleia-buy');
  applyPlayCommand(game, other, { type: 'turn/ended' }, 105, 'thaleia-buy');
  expect(game.resources.buys).toBe(1); expect(game.turn.leaderUsed).toBe(false);
  game.decks[uid].hand = [{ id: 'new-temple', cardId: 'temple-of-athena', copy: 1 }];
  applyPlayCommand(game, uid, { type: 'action/played', instanceId: 'new-temple' }, 106, 'thaleia-buy');
  expect(game.resources.buys).toBe(2);
});

test('buy variant keeps every other leader standard and completes replayable heads-up games', () => {
  const otherOptions = { seed: 'buy-other-leaders', block: 0, lineup: ['nereon', 'melia', 'doreios'], focal: 0,
    profiles: Array.from({ length: 3 }, () => ({ family: 'engine' as const, parameters: candidates[1] })) };
  const before = runExperiment(otherOptions), after = runExperiment({ ...otherOptions, variant: 'thaleia-buy' });
  expect(after.events).toEqual(before.events); expect(after.result.players).toEqual(before.result.players);
  for (const leader of ['nereon', 'melia', 'doreios']) {
    const options = { seed: 'buy-replay', block: 0, lineup: ['thaleia', leader], focal: 0,
      profiles: Array.from({ length: 2 }, () => ({ family: 'engine' as const, parameters: candidates[1] })), variant: 'thaleia-buy' as const };
    const run = runExperiment(options), replayed = replayExperiment(run.events, options);
    expect(run.result.status).toBe('completed');
    expect(standings(replayed).map(row => [row.uid, row.score, row.turns])).toEqual(run.result.players.map(row => [row.uid, row.score, row.turns]));
  }
});
