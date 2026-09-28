import { pairedEstimate, type Pair } from './evidence';
import { candidates, families, type Family, type Profile } from './strategy';
import type { StudyResult } from './experiment';
import type { PlayVariant } from '../../src/lib/game/actions';

export const counterCandidates: { id: string; profile: Profile }[] = families.flatMap(family =>
  (family === 'treasure' ? candidates.slice(0, 1) : candidates).map((parameters, i) => ({ id: `${family}-${i}`, profile: { family, parameters } })));
export const counterVariants: PlayVariant[] = ['standard', 'thaleia-draw'];
export type TrainingCell = { leader: string; variant: PlayVariant; family: Family; counter: string; sum: number; games: number };
export type CounterSelection = { leader: string; variant: PlayVariant; family: Family; counter: string; trainingShare: number; primary: boolean };
/** Minimum Thaleia share chooses a counter; maximum of those minima chooses her pure strategy. Ties retain declared order. */
export function selectCounters(cells: TrainingCell[], variants: PlayVariant[] = counterVariants): CounterSelection[] {
  const selections: CounterSelection[] = [];
  for (const leader of [...new Set(cells.map(row => row.leader))]) for (const variant of variants) {
    const selected = families.map(family => {
      const rows = counterCandidates.map(candidate => {
        const matches = cells.filter(row => row.leader === leader && row.variant === variant && row.family === family && row.counter === candidate.id);
        if (matches.length !== 1 || matches[0].games < 1 || !Number.isFinite(matches[0].sum) || matches[0].sum < 0 || matches[0].sum > matches[0].games) throw new Error('Incomplete or invalid counter matrix.');
        return matches[0];
      });
      if (new Set(rows.map(row => row.games)).size !== 1) throw new Error('Unequal counter search budgets.');
      const best = rows.reduce((best, row) => row.sum / row.games < best.sum / best.games ? row : best);
      return { leader, variant, family, counter: best.counter, trainingShare: best.sum / best.games, primary: false };
    });
    if (new Set(cells.filter(row => row.leader === leader && row.variant === variant).map(row => row.games)).size !== 1) throw new Error('Unequal Thaleia search budgets.');
    selected.reduce((best, row) => row.trainingShare > best.trainingShare ? row : best).primary = true;
    selections.push(...selected);
  }
  return selections;
}
export type CounterGame = { leader: string; variant: PlayVariant; family: Family; counter: string; result: StudyResult };
const share = (row: CounterGame) => row.result.players.find(player => player.leader === 'thaleia')!.share;
const percent = (n: number) => `${(100 * n).toFixed(1)}%`;
export function counterReport(games: CounterGame[], selections: CounterSelection[], variants: PlayVariant[] = counterVariants, reusedSeeds = false) {
  if (variants.length !== 2 || variants[0] === variants[1]) throw new Error('Declare two distinct comparison arms.');
  const estimates: Record<string, unknown> = {};
  const lines = ['# Thaleia against selected leader-specific counters', '',
    'Training selects the lowest Thaleia victory share among 13 counter configurations for each of her five frozen profiles, then selects her highest such minimum. Selection is separate for each rival and rule. Fresh evaluation seeds never select strategies. Ties retain candidate order. This is a pure-strategy search within these bots, not optimal play or a mixed-strategy equilibrium.', '',
    'Primary intervals bootstrap paired turn orders by seed block (20,000 resamples), with Bonferroni adjustment across six selected victory shares and three adapted-policy differences. Victory shares split tied wins. Failed games exclude the entire affected seed block. Diagnostic rows are descriptive.', '',
    '| Rival | Rule | Thaleia strategy | Selected counter | Thaleia victory share | Adjusted interval | Complete blocks |',
    '| --- | --- | --- | --- | ---: | --- | ---: |'];
  const toPair = (row: CounterGame, second: number | null): Pair => ({ baselineId: `${row.result.block}/${row.result.focal}/${row.variant}`, treatmentId: 'reference', block: row.result.block, count: 2, target: row.leader, focalFamily: row.family, opponentFamily: row.result.profiles[1 - row.result.focal].family, leader: 'thaleia', baselineShare: share(row), treatmentShare: second, exposure: 1 });
  for (const selected of selections.filter(row => row.primary)) {
    const rows = games.filter(row => row.leader === selected.leader && row.variant === selected.variant && row.family === selected.family);
    const estimate = pairedEstimate(rows.map(row => toPair(row, 0.5)), 9, !reusedSeeds);
    const value = estimate.difference === null ? null : estimate.difference + 0.5;
    const interval = estimate.correctedInterval?.map(value => value + 0.5);
    estimates[`${selected.leader}/${selected.variant}`] = { ...estimate, share: value, shareInterval: interval, selection: selected };
    lines.push(`| ${selected.leader} | ${selected.variant} | ${selected.family} | ${selected.counter} | ${value === null ? 'n/a' : percent(value)} | ${interval?.map(percent).join(' to ') ?? 'n/a'} | ${estimate.blocks} |`);
  }
  lines.push('', '## Change with both sides reselected', '', 'These differences include adaptation by both players; they do not isolate the card effect with fixed policies.', '', '| Rival | Proposed − current | Adjusted interval | Complete blocks |', '| --- | ---: | --- | ---: |');
  for (const leader of [...new Set(selections.map(row => row.leader))]) {
    const primary = selections.filter(row => row.leader === leader && row.primary);
    const rows = games.filter(row => row.leader === leader && primary.some(selected => selected.variant === row.variant && selected.family === row.family));
    const baseline = new Map(rows.filter(row => row.variant === variants[0]).map(row => [`${row.result.block}/${row.result.focal}`, row]));
    const inputs = rows.filter(row => row.variant === variants[1]).map(row => {
      const other = baseline.get(`${row.result.block}/${row.result.focal}`);
      if (!other || other.result.seed !== row.result.seed || JSON.stringify(other.result.lineup) !== JSON.stringify(row.result.lineup)) throw new Error('Unpaired evaluation.');
      return toPair(row, share(other));
    });
    const estimate = pairedEstimate(inputs, 9, !reusedSeeds); estimates[`${leader}/adapted-difference`] = estimate;
    const pp = (n: number) => `${n >= 0 ? '+' : ''}${(100 * n).toFixed(1)} pp`;
    lines.push(`| ${leader} | ${estimate.difference === null ? 'n/a' : pp(estimate.difference)} | ${estimate.correctedInterval?.map(pp).join(' to ') ?? 'n/a'} | ${estimate.blocks} |`);
  }
  lines.push('', '## Every Thaleia family against its trained counter (descriptive)', '', '| Rival | Rule | Thaleia strategy | Counter | Training share | Held-out share | Complete games |', '| --- | --- | --- | --- | ---: | ---: | ---: |');
  for (const selected of selections) {
    const rows = games.filter(row => row.leader === selected.leader && row.variant === selected.variant && row.family === selected.family);
    const failed = new Set(rows.filter(row => share(row) === null).map(row => row.result.block));
    const valid = rows.filter(row => !failed.has(row.result.block));
    const value = valid.length ? valid.reduce((sum, row) => sum + share(row)!, 0) / valid.length : null;
    lines.push(`| ${selected.leader} | ${selected.variant} | ${selected.family}${selected.primary ? ' (selected)' : ''} | ${selected.counter} | ${percent(selected.trainingShare)} | ${value === null ? 'n/a' : percent(value)} | ${valid.length} |`);
  }
  if (reusedSeeds) lines.splice(2, 0, 'Rules: ' + variants.join(' → ') + '. Evaluation seeds are deliberately reused from the prior study. This is an exploratory same-seed comparison, not independent confirmation. Training and evaluation remain disjoint. Strategy selection uses training only.', '');
  const markdown = lines.join('\n') + '\n';
  return { markdown: reusedSeeds ? markdown.replace('Fresh evaluation seeds never select strategies.', 'Evaluation seeds never select strategies.') : markdown, estimates };
}
