import { readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { counterReport, selectCounters, type CounterGame, type TrainingCell } from '../../scripts/balance/counter';
import { digest, getProfile } from '../../scripts/balance/study';
import { replayExperiment } from '../../scripts/balance/experiment';
import { standings } from '../../src/lib/game/actions';
const dir = process.argv[2] ?? 'balance-results/engine-cycle-v1/comparison';
const read = (path: string) => JSON.parse(readFileSync(`${dir}/${path}`, 'utf8'));
const unzip = (path: string) => gunzipSync(readFileSync(`${dir}/${path}`)).toString();
const check = (ok: boolean, message: string) => { if (!ok) throw new Error(message); };
const manifest = read('manifest.json');
check(manifest.status === 'completed' && manifest.failures === 0 && !manifest.dirty, 'Completion/provenance');
check(!manifest.trainingSeeds.some((seed: string) => manifest.evaluationSeeds.includes(seed)), 'Seed leakage');
check(digest(manifest.profiles) === manifest.profilesHash, 'Profile hash');
if (manifest.variantProfiles) check(digest(manifest.variantProfiles) === manifest.variantProfilesHash, 'Variant profile hash');
if (manifest.retunedProfiles) {
  const trainingDir = process.argv[3] ?? 'balance-results/engine-cycle-v1/training';
  const trainingManifest = JSON.parse(readFileSync(`${trainingDir}/manifest.json`, 'utf8'));
  check(trainingManifest.status === 'completed' && trainingManifest.sourceCommit === manifest.sourceCommit, 'Profile provenance');
  const old = JSON.parse(readFileSync('balance-results/thaleia-actions-v1/manifest.json', 'utf8'));
  check(JSON.stringify(old.trainingSeeds) === JSON.stringify(manifest.trainingSeeds) && JSON.stringify(old.evaluationSeeds) === JSON.stringify(manifest.evaluationSeeds), 'Original counter seeds');
  for (const [index, profiles] of [manifest.profiles, manifest.variantProfiles].entries()) {
    check(profiles.policyVersion === 2 && profiles.variant === manifest.variants[index], 'Policy and rule');
    check(digest(profiles) === trainingManifest.profilesHashes[profiles.variant], 'Training artifact hash');
    check(profiles.training.reduce((sum: number, row: any) => sum + row.games, 0) === 4608, 'Profile training budget');
    check(!profiles.trainingSeeds.some((seed: string) => [...manifest.trainingSeeds, ...manifest.evaluationSeeds].includes(seed)), 'Profile seed leakage');
  }
  check(JSON.stringify(manifest.profiles.trainingSeeds) === JSON.stringify(manifest.variantProfiles.trainingSeeds), 'Paired profile seeds');
}
const records = unzip('training.jsonl.gz').trim().split('\n').map(line => JSON.parse(line));
const scores: TrainingCell[] = read('training-scores.json');
const seenTraining = new Set<string>();
for (const row of records) {
  check(row.seed === manifest.trainingSeeds[row.block] && row.shares.length === 2, 'Training seed or seats');
  const key = `${row.block}/${row.leader}/${row.variant}/${row.family}/${row.counter}`;
  check(!seenTraining.has(key), 'Duplicate training game'); seenTraining.add(key);
}
for (const cell of scores) {
  const rows = records.filter(row => row.leader === cell.leader && row.variant === cell.variant && row.family === cell.family && row.counter === cell.counter);
  check(rows.length === manifest.trainingBlocks && cell.games === rows.length * 2 && cell.sum === rows.reduce((sum, row) => sum + row.shares[0] + row.shares[1], 0), 'Training score mismatch');
}
check(records.length * 2 === manifest.plannedTrainingGames && records.length * 2 === manifest.trainingGames, 'Training count');
const selections = read('selections.json');
check(JSON.stringify(selectCounters(scores, manifest.variants)) === JSON.stringify(selections) && digest(selections) === manifest.selectionHash, 'Selection mismatch');
const games: CounterGame[] = unzip('games.jsonl.gz').trim().split('\n').map(line => JSON.parse(line));
const byKey = new Map<string, CounterGame>();
for (const row of games) {
  const game = row.result, selected = selections.find((s: any) => s.leader === row.leader && s.variant === row.variant && s.family === row.family);
  check(game.status === 'completed' && game.seed === manifest.evaluationSeeds[game.block], 'Evaluation status/seed');
  check(row.counter === selected.counter && (game.variant ?? 'standard') === row.variant && !game.restriction, 'Evaluation selection/variant');
  check(game.lineup[game.focal] === 'thaleia' && game.lineup[1 - game.focal] === row.leader, 'Evaluation lineup');
  check(JSON.stringify(game.profiles[game.focal]) === JSON.stringify(getProfile(row.variant === manifest.variants[1] ? (manifest.variantProfiles ?? manifest.profiles) : manifest.profiles, 2, 'thaleia', row.family)), 'Thaleia profile');
  check(JSON.stringify(game.profiles[1 - game.focal]) === JSON.stringify(manifest.counterCandidates.find((c: any) => c.id === row.counter).profile), 'Counter profile');
  const key = `${game.block}-${row.leader}-${row.variant}-${row.family}-${game.focal}`;
  check(!byKey.has(key), 'Duplicate evaluation'); byKey.set(key, row);
}
check(games.length === manifest.plannedEvaluationGames && games.length === manifest.evaluationGames, 'Evaluation count');
for (const selected of selections) for (let block = 0; block < manifest.blocks; block++) for (const focal of [0, 1]) check(byKey.has(`${block}-${selected.leader}-${selected.variant}-${selected.family}-${focal}`), 'Missing evaluation seat');
const report = counterReport(games, selections, manifest.variants, manifest.reusedSeeds ?? false, manifest.retunedProfiles ?? false);
check(report.markdown === readFileSync(`${dir}/report.md`, 'utf8') && JSON.stringify(report.estimates) === JSON.stringify(read('estimates.json')), 'Report mismatch');
let replayCount = 0;
for (const file of readdirSync(`${dir}/replays`)) {
  const trace = JSON.parse(unzip(`replays/${file}`));
  const expected = byKey.get(file.replace('.json.gz', ''))!.result;
  const game = replayExperiment(trace.events, trace.options);
  check(JSON.stringify(standings(game).map(row => [row.uid, row.score, row.turns])) === JSON.stringify(expected.players.map(row => [row.uid, row.score, row.turns])), 'Replay mismatch');
  replayCount++;
}
check(replayCount === 60, 'Replay coverage');
console.log(`${records.length * 2} training games, ${games.length} evaluation games, frozen selections, report, and ${replayCount} replays verified`);
