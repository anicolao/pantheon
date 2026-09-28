import { createPrng } from '../../src/lib/game/random';
import type { Family, Restriction } from './strategy';
import type { PlayerCount } from './runner';
export type Pair = {
  baselineId: string; treatmentId: string; block: number; count: PlayerCount; target: string;
  focalFamily: Family; opponentFamily: Family; leader: string;
  baselineShare: number | null; treatmentShare: number | null; exposure: number;
};
export type Estimate = { blocks: number; pairs: number; excludedBlocks: number; exposureRate: number; difference: number | null;
  interval: [number, number] | null; correctedInterval: [number, number] | null; label: string };
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
export function pairedEstimate(pairs: Pair[], tests: number, confirmation: boolean, threshold = 0.05): Estimate {
  if (!Number.isSafeInteger(tests) || tests < 1) throw new Error('The comparison family must be declared.');
  const grouped = new Map<number, Pair[]>();
  for (const pair of pairs) { const rows = grouped.get(pair.block) ?? []; rows.push(pair); grouped.set(pair.block, rows); }
  const valid = [...grouped.values()].filter(rows => rows.every(row => row.baselineShare !== null && row.treatmentShare !== null));
  const blocks = valid.map(rows => mean(rows.map(row => row.baselineShare! - row.treatmentShare!)));
  const eligible = valid.flat(), difference = blocks.length ? mean(blocks) : null;
  const result: Estimate = { blocks: blocks.length, pairs: eligible.length, excludedBlocks: grouped.size - valid.length,
    exposureRate: eligible.length ? mean(eligible.map(row => Number(row.exposure > 0))) : 0, difference,
    interval: null, correctedInterval: null, label: 'inconclusive' };
  if (blocks.length < 2) return result;
  const random = createPrng('paired-bootstrap-v1'), samples: number[] = [], replicates = 20_000;
  for (let i = 0; i < replicates; i++) {
    let sum = 0;
    for (let j = 0; j < blocks.length; j++) sum += blocks[Math.floor(random() * blocks.length)];
    samples.push(sum / blocks.length);
  }
  samples.sort((a, b) => a - b);
  const bounds = (alpha: number): [number, number] => [samples[Math.max(0, Math.floor(replicates * alpha / 2) - 1)], samples[Math.min(replicates - 1, Math.ceil(replicates * (1 - alpha / 2)) - 1)]];
  result.interval = bounds(0.05);
  result.correctedInterval = bounds(0.05 / tests);
  // A degenerate bootstrap from few/no exposed games is not evidence of equivalence.
  if (result.excludedBlocks || result.exposureRate < 0.1 || blocks.length < (confirmation ? 200 : 20)) return result;
  if (result.correctedInterval[0] > threshold) result.label = confirmation ? 'supported policy-dependent benefit' : 'discovery signal';
  else if (result.correctedInterval[1] < -threshold) result.label = confirmation ? 'supported policy-dependent harm' : 'discovery signal (negative)';
  else if (difference !== null && Math.abs(difference) >= threshold && (result.correctedInterval[0] > 0 || result.correctedInterval[1] < 0)) result.label = 'signal; practical magnitude unresolved';
  return result;
}
export const targetId = (restriction: Restriction) => `${restriction.kind}:${restriction.id}:${restriction.scope}`;
export function evidenceReport(pairs: Pair[], counts: PlayerCount[], restrictions: Restriction[], confirmation: boolean, retuned = false): { markdown: string; estimates: Record<string, Estimate> } {
  const tests = counts.length * restrictions.length, estimates: Record<string, Estimate> = {};
  const pct = (value: number) => `${(100 * value).toFixed(1)} pp`;
  const ci = (value: [number, number] | null) => value ? value.map(pct).join(' to ') : 'insufficient blocks';
  const lines = ['# Paired balance evidence', '',
    `Stage: ${confirmation ? 'confirmation' : 'discovery'}. Positive differences favor baseline access. Each pair uses the same setup seed, lineup and seats. ${retuned ? 'Both arms use separately trained profiles with equal search budgets.' : 'Profiles are frozen across arms.'} One declared restriction changes. Effects measure ${retuned ? 'access value under the declared policy search' : 'reliance of these frozen policies'}, not intrinsic card/event strength or an optimized rule change.`, '',
    `Primary comparison family: ${tests} player-count × restriction cells, declared before play. Intervals bootstrap whole seed blocks (20,000 resamples); adjusted intervals use Bonferroni alpha = 0.05 / ${tests}. These are approximate bootstrap intervals. Seed blocks with either arm failing are excluded as a whole from that cell; any such exclusion blocks a positive evidence classification. Low exposure (<10%) and fewer than ${confirmation ? 200 : 20} blocks remain inconclusive. No equivalence claim is made.`, '',
    '| Players | Restriction | Blocks | Pairs | Excluded blocks | Baseline exposure | Baseline − restricted | 95% interval | Family-adjusted interval | Assessment |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |'];
  for (const count of counts) for (const restriction of restrictions) {
    const target = targetId(restriction), rows = pairs.filter(pair => pair.count === count && pair.target === target), key = `${count}/${target}`;
    const estimate = pairedEstimate(rows, tests, confirmation); estimates[key] = estimate;
    lines.push(`| ${count} | ${target} | ${estimate.blocks} | ${estimate.pairs} | ${estimate.excludedBlocks} | ${(100 * estimate.exposureRate).toFixed(1)}% | ${estimate.difference === null ? 'n/a' : pct(estimate.difference)} | ${ci(estimate.interval)} | ${ci(estimate.correctedInterval)} | ${estimate.label} |`);
  }
  lines.push('', '## Policy robustness (descriptive)', '', 'These subgroup means are diagnostics, not additional confirmatory claims. They help identify effects that depend on one bot family or opponent; no rule recommendation is automatic.', '',
    '| Players | Restriction | Focal policy | Opponent policy | Complete pairs | Baseline − restricted |', '| --- | --- | --- | --- | ---: | ---: |');
  const cells = new Map<string, Pair[]>();
  for (const pair of pairs) { const key = `${pair.count} | ${pair.target} | ${pair.focalFamily} | ${pair.opponentFamily}`; const rows = cells.get(key) ?? []; rows.push(pair); cells.set(key, rows); }
  for (const [key, rows] of cells) {
    const failed = new Set(rows.filter(row => row.baselineShare === null || row.treatmentShare === null).map(row => row.block));
    const complete = rows.filter(row => !failed.has(row.block));
    lines.push(`| ${key} | ${complete.length} | ${complete.length ? pct(mean(complete.map(row => row.baselineShare! - row.treatmentShare!))) : 'n/a'} |`);
  }
  lines.push('', 'Before changing rules: examine the mixed-policy league and replay mechanisms, retune restricted strategies with equal budgets, test targeted counterplay, and conduct human playtests. A supported effect here is conditional evidence, not a confirmed balance defect.', '');
  return { markdown: lines.join('\n'), estimates };
}
