import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import type { PlayVariant } from '../src/lib/game/actions';
import { leaderIds } from '../src/lib/game/setup';
import { runExperiment } from './balance/experiment';
import { families } from './balance/strategy';
import { checkIndependentSeeds, digest, getProfile, type Profiles } from './balance/study';
import { counterCandidates, counterReport, counterVariants, selectCounters, type CounterGame, type TrainingCell } from './balance/counter';

const flags: Record<string, string> = {}, args = process.argv.slice(2);
if (args.includes('--help')) { console.log('bun run balance:counter --out directory [--training-blocks 40] [--blocks 200] [--seed thaleia-counter-v1] [--comparison thaleia|leader-buffs]'); process.exit(0); }
for (let i = 0; i < args.length; i += 2) {
  if (!['--out', '--training-blocks', '--blocks', '--seed', '--comparison'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || flags[args[i]]) throw new Error('Invalid flags; use --help.');
  flags[args[i]] = args[i + 1];
}
const trainingBlocks = Number(flags['--training-blocks'] ?? 40), blocks = Number(flags['--blocks'] ?? 200), seed = flags['--seed'] ?? 'thaleia-counter-v1';
if (!flags['--out'] || ![trainingBlocks, blocks].every(n => Number.isSafeInteger(n) && n > 0) || !/^[a-zA-Z0-9_-]{1,32}$/.test(seed)) throw new Error('Use fresh --out, positive integer budgets and a 1–32 character seed.');
const comparison = flags['--comparison'] ?? 'thaleia';
if (!['thaleia', 'leader-buffs'].includes(comparison)) throw new Error('Unknown comparison.');
const variants: PlayVariant[] = comparison === 'leader-buffs' ? ['thaleia-draw', 'leader-buffs'] : counterVariants;
const reusedSeeds = comparison === 'leader-buffs';
const profiles: Profiles = JSON.parse(readFileSync('balance-results/decision-study-v1/training-v2/profiles.json', 'utf8'));
if (profiles.version !== 1 || profiles.restriction) throw new Error('Expected unrestricted profiles.');
const trainingSeeds = Array.from({ length: trainingBlocks }, (_, i) => `${seed}:training:${i}`);
const evaluationSeeds = Array.from({ length: blocks }, (_, i) => `${seed}:evaluation:${i}`);
checkIndependentSeeds(evaluationSeeds, [...trainingSeeds, ...profiles.trainingSeeds]);
checkIndependentSeeds(trainingSeeds, profiles.trainingSeeds);
if (reusedSeeds && blocks >= 200) {
  const previous = JSON.parse(readFileSync('balance-results/thaleia-counter-v1/manifest.json', 'utf8'));
  if (JSON.stringify(trainingSeeds) !== JSON.stringify(previous.trainingSeeds) || JSON.stringify(evaluationSeeds) !== JSON.stringify(previous.evaluationSeeds) || digest(profiles) !== previous.profilesHash) throw new Error('Same-seed comparison must match the archived training/evaluation seeds and profiles exactly.');
}
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const sourceCommit = git('rev-parse', 'HEAD'), dirty = Boolean(git('status', '--porcelain'));
if (blocks >= 200 && dirty) throw new Error('Commit source before confirmation.');
const rivals = leaderIds.filter(leader => leader !== 'thaleia');
const out = resolve(flags['--out']); mkdirSync(resolve(out, '..'), { recursive: true }); mkdirSync(out); mkdirSync(resolve(out, 'replays'));
const write = (path: string, data: unknown) => writeFileSync(resolve(out, path), JSON.stringify(data, null, 2) + '\n');
const compressed = (path: string, rows: unknown[]) => appendFileSync(resolve(out, path), gzipSync(rows.map(row => JSON.stringify(row)).join('\n') + '\n'));
const started = performance.now();
const manifest = { comparison, variants, reusedSeeds, stage: reusedSeeds ? 'exploratory-same-seeds' : blocks >= 200 ? 'confirmation' : 'pilot', sourceCommit, dirty, runtime: Bun.version, trainingBlocks, blocks, trainingSeeds, evaluationSeeds, profiles, profilesHash: digest(profiles), counterCandidates,
  primaryFamilySize: 9, bootstrapReplicates: 20_000, plannedTrainingGames: trainingBlocks * 780, plannedEvaluationGames: blocks * 60,
  design: 'Per rival and rule: each of five frozen Thaleia profiles faces 13 counter configurations with both turn orders on shared training seeds. Pick minimum Thaleia share counter per profile, then maximum of minima Thaleia profile; ties retain declared order. Freeze all selections before evaluation. Evaluate every selected counter on seeds disjoint from training (reused from the previous study when explicitly requested); only training-selected Thaleia rows are primary. Primary family: six victory shares and three adapted differences.',
  startedAt: new Date().toISOString() };
write('manifest.json', { ...manifest, status: 'training' });
const cells: TrainingCell[] = rivals.flatMap(leader => variants.flatMap(variant => families.flatMap(family => counterCandidates.map(counter => ({ leader, variant, family, counter: counter.id, sum: 0, games: 0 })))));
for (const [block, gameSeed] of trainingSeeds.entries()) {
  const records = [];
  for (const cell of cells) {
    const shares = [];
    for (const focal of [0, 1]) {
      const lineup = focal === 0 ? ['thaleia', cell.leader] : [cell.leader, 'thaleia'];
      const players = lineup.map((leader, position) => position === focal ? getProfile(profiles, 2, leader, cell.family) : counterCandidates.find(candidate => candidate.id === cell.counter)!.profile);
      const run = runExperiment({ seed: gameSeed, block, lineup, profiles: players, focal, variant: cell.variant });
      if (run.result.status !== 'completed') { write('training-failure.json', run); write('manifest.json', { ...manifest, status: 'failed-training' }); throw new Error('Training game failed; no selections made.'); }
      const value = run.result.players.find(player => player.leader === 'thaleia')!.share!;
      cell.sum += value; cell.games++; shares.push(value);
    }
    records.push({ block, seed: gameSeed, leader: cell.leader, variant: cell.variant, family: cell.family, counter: cell.counter, shares });
  }
  compressed('training.jsonl.gz', records);
  if ((block + 1) % 5 === 0 || block + 1 === trainingBlocks) console.log(`Training ${block + 1}/${trainingBlocks}; ${(performance.now() - started) / 1000 | 0}s`);
}
const selections = selectCounters(cells, variants), selectionHash = digest(selections), selectionsFrozenAt = new Date().toISOString();
write('training-scores.json', cells); write('selections.json', selections);
write('manifest.json', { ...manifest, status: 'evaluating', selectionHash, selectionsFrozenAt });
const games: CounterGame[] = []; let failures = 0;
for (const [block, gameSeed] of evaluationSeeds.entries()) {
  const records: CounterGame[] = [];
  for (const selected of selections) for (const focal of [0, 1]) {
    const lineup = focal === 0 ? ['thaleia', selected.leader] : [selected.leader, 'thaleia'];
    const players = lineup.map((leader, position) => position === focal ? getProfile(profiles, 2, leader, selected.family) : counterCandidates.find(candidate => candidate.id === selected.counter)!.profile);
    const options = { seed: gameSeed, block, lineup, profiles: players, focal, variant: selected.variant };
    const run = runExperiment(options), row = { leader: selected.leader, variant: selected.variant, family: selected.family, counter: selected.counter, result: run.result };
    records.push(row); games.push(row);
    if (run.result.status !== 'completed') failures++;
    if (block === 0 || run.result.status !== 'completed') writeFileSync(resolve(out, 'replays', `${block}-${selected.leader}-${selected.variant}-${selected.family}-${focal}.json.gz`), gzipSync(JSON.stringify({ options, events: run.events })));
  }
  compressed('games.jsonl.gz', records);
  if ((block + 1) % 20 === 0 || block + 1 === blocks) console.log(`Evaluation ${block + 1}/${blocks}; ${failures} failures; ${(performance.now() - started) / 1000 | 0}s`);
}
if (git('rev-parse', 'HEAD') !== sourceCommit || Boolean(git('status', '--porcelain')) !== dirty || digest(JSON.parse(readFileSync(resolve(out, 'selections.json'), 'utf8'))) !== selectionHash) throw new Error('Source or selections changed during execution.');
const report = counterReport(games, selections, variants, reusedSeeds);
writeFileSync(resolve(out, 'report.md'), report.markdown); write('estimates.json', report.estimates);
write('manifest.json', { ...manifest, status: failures ? 'completed-with-failures' : 'completed', selectionHash, selectionsFrozenAt, trainingGames: cells.reduce((sum, cell) => sum + cell.games, 0), evaluationGames: games.length, failures, elapsedSeconds: (performance.now() - started) / 1000 });
console.log(`Results: ${out}`); if (failures) process.exitCode = 1;
