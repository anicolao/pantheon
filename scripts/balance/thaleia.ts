import { shuffle } from '../../src/lib/game/random';
import { leaderIds } from '../../src/lib/game/setup';
import type { StudyResult } from './experiment';
import { pairedEstimate, type Pair } from './evidence';
import type { PlayerCount } from './runner';
import type { Family } from './strategy';

export const thaleiaFamilies: Family[] = ['treasure', 'engine', 'worship'];
/** Every opponent subset, balanced seats per block, independently sampled opponent order. */
export function thaleiaLineups(count: PlayerCount, seed: string): string[][] {
  const others = leaderIds.filter(id => id !== 'thaleia');
  const subsets = count === 2 ? others.map(id => [id]) : count === 3 ? others.flatMap((id, i) => others.slice(i + 1).map(other => [id, other])) : [others];
  return subsets.flatMap(subset => {
    const order = ['thaleia', ...shuffle(subset, `${seed}:schedule:${count}:${subset.join(',')}`)];
    return order.map((_, i) => [...order.slice(i), ...order.slice(0, i)]);
  });
}
export type VariantPair = { id: string; block: number; count: PlayerCount; family: Family; opponent: Family; baseline: StudyResult; variant: StudyResult };
export function thaleiaReport(pairs: VariantPair[], confirm: boolean) {
  const focal = (game: StudyResult) => game.players.find(player => player.leader === 'thaleia')!;
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const pct = (value: number) => `${(100 * value).toFixed(1)}%`;
  const points = (value: number) => `${value >= 0 ? '+' : ''}${(100 * value).toFixed(1)} pp`;
  const estimates: Record<string, unknown> = {};
  const failures = pairs.filter(pair => pair.baseline.status !== 'completed' || pair.variant.status !== 'completed').length;
  const lines = ['# Thaleia: +1 Action and +1 Card', '',
    `${pairs.length * 2} games (${pairs.length} matched pairs); ${failures} incomplete pairs. Frozen profiles in both arms; no retraining. Positive differences favor the proposed trigger.`, '',
    'Primary family: nine player-count × homogeneous-policy cells. Paired seed-block bootstrap with 20,000 resamples and Bonferroni correction across all nine cells. Every opponent subset and seat is balanced per block; opponent order is independently sampled per block before cyclic seat rotations. Blocks, not individual games, are the independent units. Any failed arm excludes its whole cell/block and prevents a supported classification.', '',
    '| Players | Policy | Blocks | Current share | Proposed share | Change | Family-adjusted interval | Mean turns current → proposed | Assessment |',
    '| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |'];
  for (const count of [2, 3, 4]) for (const family of thaleiaFamilies) {
    const rows = pairs.filter(pair => pair.count === count && pair.family === family && pair.opponent === family);
    const failed = new Set(rows.filter(row => row.baseline.status !== 'completed' || row.variant.status !== 'completed').map(row => row.block));
    const valid = rows.filter(row => !failed.has(row.block));
    // pairedEstimate computes first share minus second. Orient toward the proposed rule.
    const inputs: Pair[] = rows.map(row => ({ baselineId: `${row.id}-variant`, treatmentId: `${row.id}-baseline`, block: row.block, count: row.count,
      target: 'thaleia-draw', focalFamily: row.family, opponentFamily: row.opponent, leader: 'thaleia', baselineShare: focal(row.variant).share,
      treatmentShare: focal(row.baseline).share, exposure: focal(row.baseline).telemetry.leaderTriggers }));
    const estimate = pairedEstimate(inputs, 9, confirm);
    const before = valid.length ? mean(valid.map(row => focal(row.baseline).share!)) : null;
    const after = valid.length ? mean(valid.map(row => focal(row.variant).share!)) : null;
    estimates[`${count}/${family}`] = { ...estimate, baselineShare: before, variantShare: after };
    lines.push(`| ${count} | ${family} | ${estimate.blocks} | ${before === null ? 'n/a' : pct(before)} | ${after === null ? 'n/a' : pct(after)} | ${estimate.difference === null ? 'n/a' : points(estimate.difference)} | ${estimate.correctedInterval?.map(points).join(' to ') ?? 'insufficient blocks'} | ${valid.length ? `${mean(valid.map(row => focal(row.baseline).turns)).toFixed(1)} → ${mean(valid.map(row => focal(row.variant).turns)).toFixed(1)}` : 'n/a'} | ${estimate.label} |`);
  }
  lines.push('', '## Two-player mixed opponents (descriptive)', '', 'These diagnostic cells are not additional confirmatory hypotheses. They test whether homogeneous-table gains also appear against other frozen policy families.', '',
    '| Thaleia policy | Opponent policy | Complete pairs | Current share | Proposed share | Change |', '| --- | --- | ---: | ---: | ---: | ---: |');
  for (const family of thaleiaFamilies) for (const opponent of thaleiaFamilies.filter(other => other !== family)) {
    const rows = pairs.filter(pair => pair.count === 2 && pair.family === family && pair.opponent === opponent);
    const failed = new Set(rows.filter(row => row.baseline.status !== 'completed' || row.variant.status !== 'completed').map(row => row.block));
    const valid = rows.filter(row => !failed.has(row.block));
    if (!valid.length) continue;
    const before = mean(valid.map(row => focal(row.baseline).share!)), after = mean(valid.map(row => focal(row.variant).share!));
    lines.push(`| ${family} | ${opponent} | ${valid.length} | ${pct(before)} | ${pct(after)} | ${points(after - before)} |`);
  }
  lines.push('', 'These outcomes isolate one rule change under existing bots. Symmetric reference shares are 50%, 33.3%, and 25%; exceeding those values in a limited policy population does not establish optimal-play dominance. Other leaders, events, cards, bot parameters and scoring rules are unchanged. No strategic drafting or retuning is included.', '');
  return { markdown: lines.join('\n'), estimates };
}
