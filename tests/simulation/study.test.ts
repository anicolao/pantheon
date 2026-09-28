import { expect, test } from 'bun:test';
import { standings } from '../../src/lib/game/actions';
import { setupMatch, lineups } from '../../scripts/balance/runner';
import { candidates, families, inventoryAtSetup, strategyCommand, strategyView, type Profile, type Restriction } from '../../scripts/balance/strategy';
import { replayExperiment, runExperiment } from '../../scripts/balance/experiment';
import { pairedEstimate, type Pair } from '../../scripts/balance/evidence';
import { checkIndependentSeeds, validateConfirmation, digest, eligibleRestriction, schedule, validateConfig, type Profiles } from '../../scripts/balance/study';

const profile = (family: Profile['family']): Profile => ({ family, parameters: candidates[0] });
const restrictions: Restriction[] = [
  { kind: 'leader-trigger', id: 'doreios', scope: 'focal' },
  { kind: 'event', id: 'counsel-of-olympus', scope: 'focal' },
  { kind: 'card', id: 'sacred-academy', scope: 'focal' }
];
for (const count of [2, 3, 4] as const) test(`new strategies complete ${count}-player family matchups using legal commands`, () => {
  for (const family of families) for (const opponent of families) {
    const lineup = ['thaleia', 'doreios', 'melia', 'nereon'].slice(0, count);
    const options = { seed: `coverage-${family}-${opponent}`, block: 0, lineup, focal: 0, profiles: lineup.map((_, i) => profile(i ? opponent : family)) };
    const { result, events } = runExperiment(options);
    expect(result.status).toBe('completed');
    expect(result.players.reduce((sum, row) => sum + row.share!, 0)).toBeCloseTo(1);
    expect(standings(replayExperiment(events, options)).map(row => [row.uid, row.score, row.turns])).toEqual(result.players.map(row => [row.uid, row.score, row.turns]));
  }
});
test('leader, event and card restrictions apply only at the declared scope and replay exactly', () => {
  for (const restriction of restrictions) for (const scope of ['focal', 'table'] as const) {
    const options = { seed: 'restriction', block: 0, lineup: ['doreios', 'thaleia', 'melia', 'nereon'], focal: 0,
      profiles: Array.from({ length: 4 }, () => profile('worship')), restriction: { ...restriction, scope } };
    const { result, events } = runExperiment(options);
    expect(result.status).toBe('completed');
    for (const player of result.players.filter(player => scope === 'table' || player.position === 0)) {
      if (restriction.kind === 'card') expect(player.telemetry.acquisitions[restriction.id] ?? 0).toBe(0);
      if (restriction.kind === 'event') expect(player.telemetry.worship[restriction.id]).toBeUndefined();
      if (restriction.kind === 'leader-trigger' && player.leader === restriction.id) expect(player.telemetry.leaderTriggers).toBe(0);
    }
    expect(standings(replayExperiment(events, options)).map(row => [row.uid, row.score])).toEqual(result.players.map(row => [row.uid, row.score]));
  }
});
test('expanded observations are invariant to hidden state and contain public score memory', () => {
  const { game } = setupMatch('private-advanced', ['thaleia', 'melia']);
  const uid = game.turnOrder[0], opponent = game.turnOrder[1], inventory = inventoryAtSetup(game);
  const before = strategyView(game, uid, inventory);
  game.seed = 'hidden'; game.decks[uid].deck.reverse();
  [game.decks[opponent].hand, game.decks[opponent].deck] = [game.decks[opponent].deck, game.decks[opponent].hand];
  game.movements.push({ sequence: 999, index: 0, uid: opponent, kind: 'draw', source: 'melia' });
  expect(strategyView(game, uid, inventory)).toEqual(before);
  expect(before.scores).toEqual([3]);
});
test('Worship preserves offerings, handles Favored gains, and can run after buying', () => {
  const { game } = setupMatch('worship-choice', ['doreios', 'thaleia']);
  const view = strategyView(game, game.turnOrder[0], inventoryAtSetup(game));
  view.events = ['trial-of-the-spear']; view.phase = 'treasures'; view.resources = { coins: 4, actions: 0, buys: 0, worship: 1 };
  view.play = [{ id: 'temple', cardId: 'temple-of-ares', copy: 1 }, { id: 'recruit', cardId: 'bronze-recruit', copy: 1 }];
  view.hand = [{ id: 'polis', cardId: 'polis', copy: 1 }, { id: 'talent', cardId: 'talent', copy: 1 }];
  expect(strategyCommand(view, profile('worship'))).toEqual({ type: 'god/worshipped', cardId: 'trial-of-the-spear' });
  view.choice = { id: 'offer', kind: 'trash', min: 0, max: 1, source: 'trial-of-the-spear', offering: 3 };
  expect(strategyCommand(view, profile('worship'))).toEqual({ type: 'choice/resolved', choiceId: 'offer', targets: ['polis'] });
  view.phase = 'buys'; view.choice = null;
  expect(strategyCommand(view, profile('worship')).type).toBe('god/worshipped');
});
test('public inventory tracker agrees with full final inventory after gains, topdecks and trashes', () => {
  const options = { seed: 'inventory', block: 0, lineup: ['thaleia', 'nereon', 'melia', 'doreios'], focal: 0, profiles: families.slice(1).map(profile) };
  const { result, events } = runExperiment(options), game = replayExperiment(events, options);
  for (const player of result.players) expect(player.telemetry.finalDeckSize).toBe(Object.values(game.decks[player.uid]).flat().length);
  expect(result.players.flatMap(player => Object.values(player.telemetry.worship)).length).toBeGreaterThan(0);
});
test('paired evidence excludes whole failed blocks, respects exposure and corrects the primary family', () => {
  const rows: Pair[] = Array.from({ length: 220 }, (_, block) => ({ block, count: 2, target: 'card:seed-keeper:focal', focalFamily: 'thin', opponentFamily: 'engine', leader: 'melia', baselineId: `${block}-a`, treatmentId: `${block}-b`, baselineShare: block % 3 ? 1 : 0, treatmentShare: 0, exposure: 1 }));
  const estimate = pairedEstimate(rows, 6, true);
  expect(estimate.label).toBe('supported policy-dependent benefit');
  expect(estimate.correctedInterval![0]).toBeLessThanOrEqual(estimate.interval![0]);
  expect(estimate.correctedInterval![1]).toBeGreaterThanOrEqual(estimate.interval![1]);
  const failed = pairedEstimate([...rows, { ...rows[0], treatmentId: 'failed', treatmentShare: null }], 6, true);
  expect(failed.blocks).toBe(219); expect(failed.excludedBlocks).toBe(1); expect(failed.label).toBe('inconclusive');
  expect(pairedEstimate(rows.map(row => ({ ...row, exposure: 0 })), 6, true).label).toBe('inconclusive');
  expect(pairedEstimate(rows.slice(0, 10), 6, true).label).toBe('inconclusive');
});
test('study validates targets, disjoint seeds, frozen profiles and independent policy rotations', () => {
  const config = validateConfig({ stage: 'discovery', blocks: 2, seed: 'test', counts: [2], families: ['treasure', 'engine'], restrictions });
  expect(() => validateConfig({ ...config, stage: 'confirmation' })).toThrow();
  expect(() => validateConfig({ ...config, restrictions: [{ kind: 'card', id: 'obol', scope: 'focal' }] })).toThrow();
  expect(() => checkIndependentSeeds(['same'], ['same'])).toThrow();
  expect(() => checkIndependentSeeds(['new'], ['old'])).not.toThrow();
  const profiles: Profiles = { version: 1, trainingSeeds: [], training: [], selected: {} };
  for (const leader of ['thaleia', 'nereon', 'melia', 'doreios']) for (const family of config.families) profiles.selected[`2/${leader}/${family}`] = profile(family);
  const scenarios = [...schedule(config, profiles)];
  expect(scenarios).toHaveLength(lineups(2).length * 2 * 2 * 2);
  for (const family of config.families) for (const position of [0, 1]) expect(scenarios.filter(row => row.focalFamily === family && row.focal === position)).toHaveLength(24);
  expect(eligibleRestriction(restrictions[0], ['thaleia', 'melia'], 0)).toBe(false);
  expect(digest(profiles)).toBe(digest(structuredClone(profiles)));
});

test('confirmation refuses source drift, profile drift, failed discovery, and reused seeds', () => {
  const discovery = { profilesHash: 'profiles', seeds: ['discovery:0'], config: { stage: 'discovery' }, sourceCommit: 'commit', dirty: false, status: 'completed', failures: 0 };
  const source = { sourceCommit: 'commit', dirty: false };
  expect(() => validateConfirmation(discovery, source, 'profiles', ['confirmation:0'])).not.toThrow();
  expect(() => validateConfirmation(discovery, source, 'profiles', ['discovery:0'])).toThrow();
  expect(() => validateConfirmation(discovery, source, 'new-profiles', ['confirmation:0'])).toThrow();
  expect(() => validateConfirmation(discovery, { ...source, sourceCommit: 'changed' }, 'profiles', ['confirmation:0'])).toThrow();
  expect(() => validateConfirmation(discovery, { ...source, dirty: true }, 'profiles', ['confirmation:0'])).toThrow();
  expect(() => validateConfirmation({ ...discovery, failures: 1 }, source, 'profiles', ['confirmation:0'])).toThrow();
});
