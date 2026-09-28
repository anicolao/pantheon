import { expect, test } from 'bun:test';
import { counterCandidates, counterReport, counterVariants, selectCounters, type CounterGame, type TrainingCell } from '../../scripts/balance/counter';
import { families } from '../../scripts/balance/strategy';
import { runExperiment } from '../../scripts/balance/experiment';
function matrix(): TrainingCell[] {
  return counterVariants.flatMap(variant => families.flatMap(family => counterCandidates.map(counter => ({ leader: 'nereon', variant, family, counter: counter.id, sum: 60, games: 100 }))));
}
test('counter search minimizes Thaleia share, then chooses her maximum minimum independently by rule', () => {
  const rows = matrix();
  for (const row of rows) if (row.counter === 'engine-2') row.sum = row.family === (row.variant === 'standard' ? 'thin' : 'worship') ? 55 : 20;
  const selected = selectCounters(rows);
  expect(selected).toHaveLength(10);
  expect(selected.every(row => row.counter === 'engine-2')).toBe(true);
  expect(selected.filter(row => row.primary).map(row => row.family)).toEqual(['thin', 'worship']);
  expect(selectCounters(matrix()).filter(row => row.primary).map(row => [row.family, row.counter])).toEqual([['treasure', 'treasure-0'], ['treasure', 'treasure-0']]);
});
test('counter selection rejects missing candidates and unequal budgets', () => {
  const rows = matrix(); rows.pop(); expect(() => selectCounters(rows)).toThrow();
  const unequal = matrix(); unequal[0].games++; expect(() => selectCounters(unequal)).toThrow();
});
test('held-out report uses frozen selections, pairs seats, and excludes failed blocks', () => {
  const selected = selectCounters(matrix());
  const base = runExperiment({ seed: 'counter-report-test', block: 0, lineup: ['thaleia', 'nereon'], profiles: [counterCandidates[0].profile, counterCandidates[0].profile], focal: 0 }).result;
  const games: CounterGame[] = [];
  for (const selection of selected) for (const block of [0, 1, 2]) for (const focal of [0, 1]) {
    const result = structuredClone(base); result.block = block; result.focal = focal;
    result.seed = `counter-report-test:${block}`; result.lineup = focal === 0 ? ['thaleia', 'nereon'] : ['nereon', 'thaleia'];
    result.players.find(row => row.leader === 'thaleia')!.share = selection.variant === 'standard' ? 0 : 1;
    games.push({ ...selection, result });
  }
  const report = counterReport(games, selected);
  expect((report.estimates['nereon/adapted-difference'] as { difference: number }).difference).toBe(1);
  const broken = games.find(row => row.family === 'treasure' && row.variant === 'standard')!;
  broken.result.status = 'error'; broken.result.players.find(row => row.leader === 'thaleia')!.share = null;
  const estimate = counterReport(games, selected).estimates['nereon/adapted-difference'] as { blocks: number; excludedBlocks: number };
  expect(estimate.blocks).toBe(2); expect(estimate.excludedBlocks).toBe(1);
  broken.result.seed = 'unpaired'; expect(() => counterReport(games, selected)).toThrow('Unpaired evaluation');
});


test('same-seed rival-buff comparison selects its declared arms without changing original defaults', () => {
  const rows = matrix().map(row => ({ ...row, variant: row.variant === 'standard' ? 'thaleia-draw' as const : 'leader-buffs' as const }));
  const selected = selectCounters(rows, ['thaleia-draw', 'leader-buffs']);
  expect(selected.filter(row => row.primary).map(row => row.variant)).toEqual(['thaleia-draw', 'leader-buffs']);
  expect(() => selectCounters(rows)).toThrow();
  expect(counterReport([], selected, ['thaleia-draw', 'leader-buffs'], true).markdown).toContain('exploratory same-seed comparison, not independent confirmation');
});
