import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { trainProfiles, digest } from './balance/study';
import { strategyVersion } from './balance/strategy';
const args = process.argv.slice(2), flags: Record<string, string> = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--out', '--blocks', '--seed'].includes(args[i]) || !args[i + 1] || flags[args[i]]) throw new Error('Use --out directory [--blocks 8] [--seed engine-cycle-v1]');
  flags[args[i]] = args[i + 1];
}
const blocks = Number(flags['--blocks'] ?? 8), seed = flags['--seed'] ?? 'engine-cycle-v1';
if (!flags['--out'] || !Number.isSafeInteger(blocks) || blocks < 1 || !/^[a-zA-Z0-9_-]{1,32}$/.test(seed)) throw new Error('Invalid output, budget or seed');
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const sourceCommit = git('rev-parse', 'HEAD'); if (git('status', '--porcelain')) throw new Error('Commit before training.');
const out = resolve(flags['--out']); mkdirSync(resolve(out, '..'), { recursive: true }); mkdirSync(out);
const write = (name: string, value: unknown) => writeFileSync(resolve(out, name), JSON.stringify(value, null, 2) + '\n');
const manifest = { sourceCommit, policyVersion: strategyVersion, runtime: Bun.version, blocks, seed, variants: ['standard', 'thaleia-actions'], plannedGamesPerArm: blocks * 576, startedAt: new Date().toISOString() };
write('manifest.json', { ...manifest, status: 'running' });
const profilesHashes: Record<string, string> = {};
for (const variant of ['standard', 'thaleia-actions'] as const) {
  const profiles = trainProfiles(blocks, seed, [2], message => console.log(`${variant}: ${message}`), undefined, variant);
  write(`${variant}.json`, profiles); profilesHashes[variant] = digest(profiles);
}
if (git('rev-parse', 'HEAD') !== sourceCommit || git('status', '--porcelain')) throw new Error('Source changed during training.');
write('manifest.json', { ...manifest, status: 'completed', profilesHashes });
