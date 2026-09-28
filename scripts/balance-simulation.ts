import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { policies, policyVersion } from './balance/bot';
import { lineups, runMatch, type MatchResult, type PlayerCount } from './balance/runner';
import { report } from './balance/report';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('bun run simulate:balance [--blocks 200] [--seed balance-v1] [--out directory] [--players 2,3,4]');
  process.exit(0);
}
const options: Record<string, string> = {};
for (let index = 0; index < args.length; index += 2) {
  if (!['--blocks', '--seed', '--out', '--players'].includes(args[index]) || !args[index + 1] || args[index + 1].startsWith('--') || options[args[index]] !== undefined) throw new Error('Invalid arguments. Use --help.');
  options[args[index]] = args[index + 1];
}
const blocks = Number(options['--blocks'] ?? 200), seed = options['--seed'] ?? 'balance-v1';
const counts = (options['--players'] ?? '2,3,4').split(',').map(Number) as PlayerCount[];
if (!Number.isSafeInteger(blocks) || blocks < 1 || seed.length < 1 || seed.length > 40 || counts.some(count => ![2, 3, 4].includes(count)) || new Set(counts).size !== counts.length) throw new Error('Use positive integer blocks, a 1–40 character seed, and distinct player counts 2,3,4.');
const output = resolve(options['--out'] ?? `balance-runs/${new Date().toISOString().replaceAll(':', '-')}`);
// Refuse to overwrite an earlier experiment.
mkdirSync(resolve(output, '..'), { recursive: true });
mkdirSync(output);
mkdirSync(resolve(output, 'replays'));
const git = (...gitArgs: string[]) => execFileSync('git', gitArgs, { encoding: 'utf8' }).trim();
const manifest = {
  sourceCommit: git('rev-parse', 'HEAD'), dirty: Boolean(git('status', '--porcelain')),
  rules: 'production reducer v1 / v0.1 cardset', policyVersion, policies,
  seed, seeds: Array.from({ length: blocks }, (_, block) => `${seed}:${block}`), blocks, playerCounts: counts,
  schedule: Object.fromEntries(counts.map(count => [count, lineups(count)])),
  weighting: 'All ordered lineups equally weighted, homogeneous policies, same setup seed across policies and lineups in each block.',
  guards: { turnsPerPlayer: 200, commandsPerTurn: 10_000 }, tuningBudget: 0,
  exclusions: 'Exclude entire count/policy/seed block from leader summary if any game fails; preserve every result and failure trace.',
  replays: 'First lineup of block 0 per count/policy and every failure. All other games reproducible from manifest and result rows.',
  startedAt: new Date().toISOString(), runtime: Bun.version
};
writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(resolve(output, 'games.jsonl'), '');
const started = performance.now(), results: MatchResult[] = [];
for (let block = 0; block < blocks; block++) {
  for (const count of counts) for (const policy of policies) {
    for (const [index, lineup] of lineups(count).entries()) {
      const { result, events } = runMatch({ seed: `${seed}:${block}`, block, lineup, policy });
      results.push(result);
      appendFileSync(resolve(output, 'games.jsonl'), JSON.stringify(result) + '\n');
      if (result.status !== 'completed' || block === 0 && index === 0) writeFileSync(resolve(output, 'replays', `${count}-${policy}-${block}-${index}.json`), JSON.stringify(events) + '\n');
    }
  }
  if ((block + 1) % 10 === 0 || block + 1 === blocks) console.log(`${block + 1}/${blocks} blocks; ${results.length} games; ${((performance.now() - started) / 1000).toFixed(1)}s`);
}
const elapsedSeconds = (performance.now() - started) / 1000;
writeFileSync(resolve(output, 'manifest.json'), JSON.stringify({ ...manifest, elapsedSeconds, gameCount: results.length }, null, 2) + '\n');
writeFileSync(resolve(output, 'report.md'), report(results));
console.log(`Results: ${output}`);
if (results.some(result => result.status !== 'completed')) process.exitCode = 1;
