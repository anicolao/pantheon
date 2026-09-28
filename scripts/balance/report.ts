import { createPrng } from '../../src/lib/game/random';
import { leaderIds } from '../../src/lib/game/setup';
import { policies } from './bot';
import type { MatchResult } from './runner';

export function interval(blocks: number[], seed: string): [number, number] | null {
  if (blocks.length < 2) return null;
  const random = createPrng(seed), samples: number[] = [];
  for (let replicate = 0; replicate < 2000; replicate++) {
    let sum = 0;
    for (let index = 0; index < blocks.length; index++) sum += blocks[Math.floor(random() * blocks.length)];
    samples.push(sum / blocks.length);
  }
  samples.sort((a, b) => a - b);
  return [samples[49], samples[1949]];
}
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
export function report(results: MatchResult[]): string {
  const completed = results.filter(result => result.status === 'completed');
  const lines = ['# Basic balance simulation results', '',
    `${completed.length} / ${results.length} games completed. Outcomes: ${JSON.stringify(Object.fromEntries(['completed', 'turn-limit', 'command-limit', 'error'].map(status => [status, results.filter(result => result.status === status).length])))}.`, '',
    'Exploratory, homogeneous-policy tables: every player uses the same policy. All ordered leader lineups have equal weight within each player count and policy. These are policy-dependent associations, not confirmed balance defects. Neither bot Worships; no event-value or individual-card conclusions are supported.', '',
    'Intervals are marginal 95% percentile bootstrap intervals (2,000 resamples) over whole seed-block means, including every lineup in a block. They are not adjusted for multiple comparisons. If any game in a count/policy/block fails, that entire block is excluded from that summary; unfinished games are never scored as losses or draws. Different player counts remain separate.', '',
    '| Players | Policy | Leader | Complete blocks | Games with leader | Victory share | 95% interval | Mean VP | Mean turns |',
    '| --- | --- | --- | ---: | ---: | ---: | --- | ---: | ---: |'];
  for (const count of [2, 3, 4]) for (const policy of policies) {
    const cell = results.filter(result => result.playerCount === count && result.policy === policy);
    const validBlocks = [...new Set(cell.map(result => result.block))].filter(block => cell.filter(result => result.block === block).every(result => result.status === 'completed'));
    for (const leader of leaderIds) {
      const rows = cell.filter(result => validBlocks.includes(result.block)).flatMap(result => result.players.filter(player => player.leader === leader).map(player => ({ ...player, block: result.block })));
      if (!rows.length) continue;
      const means = validBlocks.map(block => mean(rows.filter(row => row.block === block).map(row => row.victoryShare!)));
      const ci = interval(means, `bootstrap:${count}:${policy}:${leader}`);
      lines.push(`| ${count} | ${policy} | ${leader} | ${validBlocks.length} | ${rows.length} | ${percent(mean(means))} | ${ci ? ci.map(percent).join('–') : 'insufficient blocks'} | ${mean(rows.map(row => row.score)).toFixed(1)} | ${mean(rows.map(row => row.turns)).toFixed(1)} |`);
    }
  }
  lines.push('', '| Players | Policy | Completed games | Acropolis endings | Three-pile endings | First-turn victory share |', '| --- | --- | ---: | ---: | ---: | ---: |');
  for (const count of [2, 3, 4]) for (const policy of policies) {
    const rows = completed.filter(result => result.playerCount === count && result.policy === policy);
    if (rows.length) lines.push(`| ${count} | ${policy} | ${rows.length} | ${rows.filter(row => row.endCondition === 'acropolis').length} | ${rows.filter(row => row.endCondition === 'three-piles').length} | ${percent(mean(rows.map(row => row.players.find(player => player.turnPosition === 0)!.victoryShare!)))} |`);
  }
  lines.push('', 'The ending and first-turn table describes completed games only. Inspect failures before interpreting affected comparisons.', '');
  return lines.join('\n');
}
