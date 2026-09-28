import { leaderIds } from '../../src/lib/game/setup';
import { families, type Family } from './strategy';
import { getProfile, type Profiles } from './study';
import type { ExperimentOptions, StudyResult } from './experiment';
import type { PlayVariant } from '../../src/lib/game/actions';
import { pairedEstimate, type Pair } from './evidence';
export const leaderPairs = leaderIds.flatMap((a, i) => leaderIds.slice(i+1).map(b => [a,b] as const));
export type MatrixGame = { a: string; b: string; familyA: Family; familyB: Family; seat: number; result: StudyResult };
export function* matrixSchedule(block: number, seed: string, profiles: Profiles, variant: PlayVariant = 'standard'): Generator<{ a: string; b: string; familyA: Family; familyB: Family; seat: number; options: ExperimentOptions }> {
  for (const [a,b] of leaderPairs) for (const familyA of families) for (const familyB of families) for (const seat of [0,1]) {
    const lineup = seat === 0 ? [a,b] : [b,a];
    yield { a,b,familyA,familyB,seat, options: { seed, block, lineup, focal: seat, variant,
      profiles: lineup.map(leader => getProfile(profiles, 2, leader, leader === a ? familyA : familyB)) } };
  }
}
export function matrixReport(rows: MatrixGame[], blocks: number) {
  if (rows.length !== blocks*300 || rows.some(r=>r.result.status!=='completed')) throw new Error('Incomplete/failed matrix');
  const keys = new Set<string>();
  for (const row of rows) {
    const key = `${row.result.block}/${row.a}/${row.b}/${row.familyA}/${row.familyB}/${row.seat}`;
    if (keys.has(key)) throw new Error('Duplicate cell/seat/block'); keys.add(key);
  }
  const estimates: Record<string, unknown> = {}, cells: Record<string, unknown>[] = [];
  const lines = ['# All-leader, all-strategy heads-up matrix', '',
    `${rows.length.toLocaleString()} evaluation games; ${blocks} fresh seed blocks; 150 strategy matchup cells with both seat orders. Profiles were frozen using separate training seeds. Standard rules unless the enclosing manifest declares another variant.`, '',
    'Primary quantities are the six leader-pair victory shares, averaging the 25 strategy pairings equally. This measures an explicitly uniform strategy population, not optimal play or a metagame equilibrium. Intervals bootstrap whole seed blocks (20,000 resamples) with Bonferroni adjustment across six pairs. Individual strategy cells and rankings are descriptive; no strategy is selected on evaluation and then presented as a validated best response.', '',
    '| Leader A | Leader B | A victory share | Adjusted interval | Games |', '| --- | --- | ---: | --- | ---: |'];
  const share = (row: MatrixGame) => row.result.players.find(p=>p.leader===row.a)!.share!;
  for (const [a,b] of leaderPairs) {
    const games = rows.filter(r=>r.a===a&&r.b===b);
    for (let block=0;block<blocks;block++) if (games.filter(r=>r.result.block===block).length!==50) throw new Error('Missing pair block');
    const pairs: Pair[] = games.map(row => ({ baselineId: `${a}/${b}/${row.familyA}/${row.familyB}/${row.result.block}/${row.seat}`, treatmentId: 'half', block: row.result.block,
      count: 2, target: `${a}/${b}`, focalFamily: row.familyA, opponentFamily: row.familyB, leader: a, baselineShare: share(row), treatmentShare: 0.5, exposure: 1 }));
    const estimate = pairedEstimate(pairs,6,true);
    const value = estimate.difference! + 0.5, interval = estimate.correctedInterval?.map(n=>n+0.5) ?? [];
    estimates[`${a}/${b}`] = { ...estimate, share: value, shareInterval: interval };
    lines.push(`| ${a} | ${b} | ${(value*100).toFixed(1)}% | ${interval.map(n=>(100*n).toFixed(1)+'%').join(' to ')} | ${games.length} |`);
    for (const familyA of families) for (const familyB of families) {
      const cell = games.filter(r=>r.familyA===familyA&&r.familyB===familyB);
      if (cell.length !== blocks*2) throw new Error('Missing strategy cell');
      cells.push({ a,b,familyA,familyB,games:cell.length,share:cell.reduce((n,r)=>n+share(r),0)/cell.length });
    }
  }
  lines.push('', '## Every strategy pairing', '', 'Each entry is the row leader’s victory share; all cells have the same game count. Tied wins split their share.', '');
  for (const [a,b] of leaderPairs) {
    lines.push(`### ${a} (rows) versus ${b} (columns)`, '', `| Strategy | ${families.join(' | ')} |`, `| --- | ${families.map(()=>'---:').join(' | ')} |`);
    for (const family of families) lines.push(`| ${family} | ${families.map(other => (100*(cells.find(c=>c.a===a&&c.b===b&&c.familyA===family&&c.familyB===other)!.share as number)).toFixed(1)+'%').join(' | ')} |`);
    lines.push('');
  }
  const league = leaderIds.flatMap(leader => families.map(family => {
    const players = rows.flatMap(row=>row.result.players.filter(p=>p.leader===leader&&p.family===family));
    return { leader,family,games:players.length,share:players.reduce((s,p)=>s+p.share!,0)/players.length,
      meanTurns:players.reduce((s,p)=>s+p.turns,0)/players.length, fullDeckPhases:players.reduce((s,p)=>s+p.telemetry.fullDeckDraws,0),
      actionPhases:players.reduce((s,p)=>s+p.telemetry.actionPhases,0), trashes:players.reduce((s,p)=>s+Object.values(p.telemetry.trashes).reduce((a,b)=>a+b,0),0),
      favored:players.reduce((s,p)=>s+Object.values(p.telemetry.worship).reduce((a,b)=>a+b.favored,0),0), worship:players.reduce((s,p)=>s+Object.values(p.telemetry.worship).reduce((a,b)=>a+b.standard+b.favored,0),0) };
  }));
  lines.push('## Leader and strategy summaries (descriptive)', '', '| Leader | Strategy | Share | Games | Mean turns | Full-deck phases | Favored / all Worship |', '| --- | --- | ---: | ---: | ---: | --- | --- |');
  for (const r of league) lines.push(`| ${r.leader} | ${r.family} | ${(100*r.share).toFixed(1)}% | ${r.games} | ${r.meanTurns.toFixed(1)} | ${r.fullDeckPhases}/${r.actionPhases} | ${r.favored}/${r.worship} |`);
  return { markdown: lines.join('\n')+'\n', estimates, cells, league };
}
