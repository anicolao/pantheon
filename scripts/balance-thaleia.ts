import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runExperiment } from './balance/experiment';
import { checkIndependentSeeds, digest, getProfile, type Profiles } from './balance/study';
import { thaleiaFamilies, thaleiaLineups, thaleiaReport, type VariantPair } from './balance/thaleia';

const flags: Record<string, string> = {}, args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('bun run balance:thaleia --out directory [--blocks 200] [--seed thaleia-cantrip-v1] [--profiles profiles.json]'); process.exit(0);
}
for (let i = 0; i < args.length; i += 2) {
  if (!['--out', '--blocks', '--seed', '--profiles'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || flags[args[i]]) throw new Error('Invalid flags; use --help.');
  flags[args[i]] = args[i + 1];
}
const blocks = Number(flags['--blocks'] ?? 200), seed = flags['--seed'] ?? 'thaleia-cantrip-v1';
if (!flags['--out'] || !Number.isSafeInteger(blocks) || blocks < 1 || !/^[a-zA-Z0-9_-]{1,32}$/.test(seed)) throw new Error('Use a fresh --out, positive integer blocks, and a 1–32 character seed.');
const profiles: Profiles = JSON.parse(readFileSync(flags['--profiles'] ?? 'balance-results/decision-study-v1/training-v2/profiles.json', 'utf8'));
if (profiles.version !== 1 || profiles.restriction) throw new Error('Use unrestricted frozen study-v1 profiles.');
const seeds = Array.from({ length: blocks }, (_, block) => `${seed}:${block}`);
checkIndependentSeeds(seeds, [...profiles.trainingSeeds, ...Array.from({ length: 200 }, (_, block) => `balance-v2:confirmation:${block}`), ...Array.from({ length: 20 }, (_, block) => `balance-v2:discovery:${block}`)]);
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const source = { sourceCommit: git('rev-parse', 'HEAD'), dirty: Boolean(git('status', '--porcelain')) };
if (blocks >= 200 && source.dirty) throw new Error('Commit the source before a confirmation run.');
const out = resolve(flags['--out']); mkdirSync(resolve(out, '..'), { recursive: true }); mkdirSync(out); mkdirSync(resolve(out, 'replays'));
const write = (path: string, value: unknown) => writeFileSync(resolve(out, path), JSON.stringify(value, null, 2) + '\n');
const schedules = seeds.map(seed => Object.fromEntries(([2, 3, 4] as const).map(count => [count, thaleiaLineups(count, seed)])));
const manifest = { ...source, runtime: Bun.version, variant: 'thaleia-draw', stage: blocks >= 200 ? 'confirmation' : 'pilot', blocks, seeds, profiles, profilesHash: digest(profiles), schedules,
  primaryFamilySize: 9, bootstrapReplicates: 20_000, practicalThreshold: 0.05, plannedGames: blocks * 186,
  design: 'Homogeneous Treasure/Engine/Worship for 2–4 players, plus every mixed pair of these families for 2 players. Every opponent subset, random opponent order per block, all cyclic seat rotations. Only Thaleia gets an additional card after her usual Action bonus on the first matching Action each turn.',
  replays: 'First pair per count/focal-family/opponent-family and every failed pair. Replay with replayExperiment and the recorded variant.',
  guards: { turnsPerPlayer: 200, commandsPerTurn: 10000 }, startedAt: new Date().toISOString() };
write('manifest.json', { ...manifest, status: 'running' }); writeFileSync(resolve(out, 'pairs.jsonl'), '');
const pairs: VariantPair[] = [], saved = new Set<string>(); let failures = 0;
const started = performance.now();
for (const [block, gameSeed] of seeds.entries()) {
  for (const count of [2, 3, 4] as const) for (const lineup of schedules[block][count]) for (const family of thaleiaFamilies) for (const opponent of count === 2 ? thaleiaFamilies : [family]) {
    const focal = lineup.indexOf('thaleia'), players = lineup.map((leader, position) => getProfile(profiles, count, leader, position === focal ? family : opponent));
    const options = { seed: gameSeed, block, lineup, profiles: players, focal };
    const baseline = runExperiment(options), variant = runExperiment({ ...options, variant: 'thaleia-draw' });
    const id = `pair-${pairs.length}`, pair: VariantPair = { id, block, count, family, opponent, baseline: baseline.result, variant: variant.result };
    pairs.push(pair); appendFileSync(resolve(out, 'pairs.jsonl'), JSON.stringify(pair) + '\n');
    const failed = baseline.result.status !== 'completed' || variant.result.status !== 'completed';
    if (failed) failures++;
    const cell = `${count}/${family}/${opponent}`;
    if (failed || !saved.has(cell)) {
      saved.add(cell);
      for (const [arm, run] of [['baseline', baseline], ['variant', variant]] as const) write(`replays/${id}-${arm}.json`, {
        options: { seed: gameSeed, lineup, focal, ...(arm === 'variant' ? { variant: 'thaleia-draw' } : {}) }, events: run.events });
    }
  }
  if ((block + 1) % 10 === 0 || block + 1 === blocks) console.log(`${block + 1}/${blocks} blocks; ${pairs.length * 2} games; ${failures} incomplete pairs; ${((performance.now() - started) / 1000).toFixed(1)}s`);
}
const report = thaleiaReport(pairs, blocks >= 200);
write('estimates.json', report.estimates); writeFileSync(resolve(out, 'report.md'), report.markdown);
write('manifest.json', { ...manifest, status: 'completed', games: pairs.length * 2, incompletePairs: failures, elapsedSeconds: (performance.now() - started) / 1000 });
console.log(`Results: ${out}`); if (failures) process.exitCode = 1;
