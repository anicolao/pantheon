import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runExperiment, type StudyResult } from './balance/experiment';
import { evidenceReport, targetId, type Pair } from './balance/evidence';
import { checkIndependentSeeds, digest, eligibleRestriction, leagueReport, schedule, studySeeds, studyVersion, trainProfiles, validateConfig, getProfile, type Profiles, validateConfirmation, type DiscoveryManifest } from './balance/study';
import type { PlayerCount } from './balance/runner';

const [mode, ...args] = process.argv.slice(2);
if (!mode || mode === '--help') {
  console.log('Train: bun run balance:study train --blocks 2 --seed balance-v2 --players 2,3,4 --out balance-runs/training [--restriction restriction.json]\nRun: bun run balance:study run --config study.json --profiles balance-runs/training/profiles.json --out balance-runs/discovery [--discovery balance-runs/discovery/manifest.json] [--treatments treatment-profiles.json]');
  process.exit(0);
}
if (!['train', 'run'].includes(mode)) throw new Error('Use train or run.');
const flags: Record<string, string> = {};
const allowed = mode === 'train' ? ['--blocks', '--seed', '--players', '--out', '--restriction'] : ['--config', '--profiles', '--out', '--discovery', '--treatments'];
for (let i = 0; i < args.length; i += 2) {
  if (!allowed.includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || flags[args[i]]) throw new Error('Invalid flags; use --help.');
  flags[args[i]] = args[i + 1];
}
if (!flags['--out']) throw new Error('--out is required and must not exist.');
const output = resolve(flags['--out']);
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const write = (path: string, value: unknown) => writeFileSync(resolve(output, path), JSON.stringify(value, null, 2) + '\n');
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const source = { sourceCommit: git('rev-parse', 'HEAD'), dirty: Boolean(git('status', '--porcelain')), studyVersion, runtime: Bun.version };
const createOutput = () => { mkdirSync(resolve(output, '..'), { recursive: true }); mkdirSync(output); };
if (mode === 'train') {
  const counts = (flags['--players'] ?? '2,3,4').split(',').map(Number) as PlayerCount[], blocks = Number(flags['--blocks'] ?? 2), seed = flags['--seed'] ?? 'balance-v2';
  if (counts.some(count => ![2, 3, 4].includes(count)) || new Set(counts).size !== counts.length) throw new Error('Invalid player counts.');
  createOutput();
  write('manifest.json', { ...source, blocks, seed, counts, stage: 'training', status: 'running', opponents: ['treasure', 'engine'], candidatesPerFamily: 3 });
  const restriction = flags['--restriction'] ? json(flags['--restriction']) : undefined;
  if (restriction) validateConfig({ stage: 'discovery', seed, blocks, counts, families: ['treasure', 'engine'], restrictions: [restriction] });
  const started = performance.now(), profiles = trainProfiles(blocks, seed, counts, console.log, restriction);
  write('profiles.json', profiles);
  write('manifest.json', { ...source, blocks, seed, counts, stage: 'training', status: 'completed', opponents: ['treasure', 'engine'], candidatesPerFamily: 3,
    profilesHash: digest(profiles), seeds: profiles.trainingSeeds, elapsedSeconds: (performance.now() - started) / 1000, games: profiles.training.reduce((sum, row) => sum + row.games, 0) });
  console.log(`Frozen profiles: ${output}/profiles.json`);
  process.exit(0);
}
if (!flags['--config'] || !flags['--profiles']) throw new Error('--config and --profiles are required.');
const config = validateConfig(json(flags['--config'])), profiles = json(flags['--profiles']) as Profiles;
if (profiles.version !== studyVersion || !Array.isArray(profiles.trainingSeeds)) throw new Error('Unsupported profiles.');
if (profiles.restriction) throw new Error('Baseline profiles must be trained without restrictions.');
const treatments: Record<string, Profiles> = {};
if (flags['--treatments']) {
  const paths = json(flags['--treatments']) as Record<string, string>;
  for (const restriction of config.restrictions) {
    const key = targetId(restriction);
    if (!paths[key]) throw new Error(`Missing retuned profiles: ${key}`);
    const tuned = json(paths[key]) as Profiles;
    const budget = (item: Profiles) => item.training.map(row => [row.key, row.candidate, row.games]);
    if (tuned.version !== studyVersion || !tuned.restriction || targetId(tuned.restriction) !== key || tuned.trainingSeeds.length !== profiles.trainingSeeds.length || digest(budget(tuned)) !== digest(budget(profiles))) throw new Error('Retuned profiles must match the restriction and baseline search budget.');
    treatments[key] = tuned;
  }
}
const profilesHash = digest({ profiles, treatments }), seeds = studySeeds(config);
checkIndependentSeeds(seeds, [...profiles.trainingSeeds, ...Object.values(treatments).flatMap(item => item.trainingSeeds)]);
let discovery: DiscoveryManifest | undefined;
if (config.stage === 'confirmation') {
  if (!flags['--discovery']) throw new Error('Confirmation requires a discovery manifest.');
  discovery = json(flags['--discovery']);
  if (!discovery) throw new Error('Missing discovery manifest.');
  validateConfirmation(discovery, source, profilesHash, seeds);
}
const scenarios = [...schedule(config, profiles)]; // Validate all frozen profiles before running.
const gameCount = seeds.length * scenarios.reduce((sum, scenario) => sum + 1 + config.restrictions.filter(item => eligibleRestriction(item, scenario.lineup, scenario.focal)).length, 0);
createOutput(); mkdirSync(resolve(output, 'replays'));
const manifest = { ...source, config, profilesHash, profiles, treatments, seeds, plannedGames: gameCount, scenariosPerBlock: scenarios.length,
  discovery: flags['--discovery'] ? { path: flags['--discovery'], sourceCommit: discovery!.sourceCommit, seeds: discovery!.seeds } : null,
  primaryFamilySize: config.counts.length * config.restrictions.length, practicalThreshold: 0.05, bootstrapReplicates: 20_000,
  guards: { turnsPerPlayer: 200, commandsPerTurn: 10_000 },
  weighting: 'All ordered leader lineups × focal families × homogeneous opponent families × focal positions. Restriction pairs only where target exists. Uniform within each count/target.',
  exclusions: 'An incomplete arm excludes the entire count/target/seed block from primary inference and prevents a supported classification.',
  replays: 'First game per count/focal-family/opponent-family/arm and all failures. Use replayExperiment for leader-trigger variants.',
  startedAt: new Date().toISOString() };
write('manifest.json', { ...manifest, status: 'running' });
writeFileSync(resolve(output, 'games.jsonl'), ''); writeFileSync(resolve(output, 'pairs.jsonl'), '');
const baselineResults: StudyResult[] = [], pairs: Pair[] = [], saved = new Set<string>();
const started = performance.now(); let games = 0, failures = 0;
function save(id: string, run: ReturnType<typeof runExperiment>, cell: string) {
  games++;
  if (run.result.status !== 'completed') failures++;
  appendFileSync(resolve(output, 'games.jsonl'), JSON.stringify({ id, ...run.result }) + '\n');
  if (run.result.status !== 'completed' || !saved.has(cell)) {
    saved.add(cell); write(`replays/${id}.json`, { options: { seed: run.result.seed, lineup: run.result.lineup, focal: run.result.focal, restriction: run.result.restriction }, events: run.events });
  }
}
for (const [block, seed] of seeds.entries()) {
  for (const [index, scenario] of scenarios.entries()) {
    const baseId = `${block}-${index}-base`, options = { seed, block, lineup: scenario.lineup, profiles: scenario.profiles, focal: scenario.focal };
    const baseline = runExperiment(options), cell = `${scenario.count}/${scenario.focalFamily}/${scenario.opponentFamily}`;
    baselineResults.push(baseline.result); save(baseId, baseline, `${cell}/base`);
    for (const [variant, restriction] of config.restrictions.entries()) {
      if (!eligibleRestriction(restriction, scenario.lineup, scenario.focal)) continue;
      const tuned = treatments[targetId(restriction)];
      const treatmentProfiles = options.profiles.map((profile, position) => tuned && (restriction.scope === 'table' || position === options.focal) ? getProfile(tuned, scenario.count, scenario.lineup[position], profile.family) : profile);
      const treatmentId = `${block}-${index}-${variant}`, treatment = runExperiment({ ...options, profiles: treatmentProfiles, restriction });
      save(treatmentId, treatment, `${cell}/${variant}`);
      const focal = baseline.result.players.find(player => player.position === scenario.focal)!, restricted = treatment.result.players.find(player => player.position === scenario.focal)!;
      const exposed = baseline.result.players.filter(player => restriction.scope === 'table' || player.position === scenario.focal);
      const exposure = exposed.reduce((sum, player) => sum + (restriction.kind === 'card' ? player.telemetry.acquisitions[restriction.id] ?? 0 : restriction.kind === 'leader-trigger' ? player.leader === restriction.id ? player.telemetry.leaderTriggers : 0 : (player.telemetry.worship[restriction.id]?.standard ?? 0) + (player.telemetry.worship[restriction.id]?.favored ?? 0)), 0);
      const pair: Pair = { baselineId: baseId, treatmentId, block, count: scenario.count, target: targetId(restriction), focalFamily: scenario.focalFamily, opponentFamily: scenario.opponentFamily,
        leader: scenario.lineup[scenario.focal], baselineShare: focal.share, treatmentShare: restricted.share, exposure };
      pairs.push(pair); appendFileSync(resolve(output, 'pairs.jsonl'), JSON.stringify(pair) + '\n');
    }
  }
  console.log(`${block + 1}/${seeds.length} blocks; ${games}/${gameCount} games; ${failures} failures; ${((performance.now() - started) / 1000).toFixed(1)}s`);
}
const evidence = evidenceReport(pairs, config.counts, config.restrictions, config.stage === 'confirmation', Object.keys(treatments).length > 0);
write('estimates.json', evidence.estimates); writeFileSync(resolve(output, 'report.md'), evidence.markdown); writeFileSync(resolve(output, 'league.md'), leagueReport(baselineResults));
write('manifest.json', { ...manifest, status: 'completed', games, failures, elapsedSeconds: (performance.now() - started) / 1000 });
console.log(`Results: ${output}`);
if (failures) process.exitCode = 1;
