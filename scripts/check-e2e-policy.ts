import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { checkPolicy, type Sources } from './e2e-policy';

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const args = process.argv.slice(2);
const staged = args[0] === '--staged';
const revision = args[0] === '--revision' ? args[1] : undefined;
if (args.length && !staged && !revision) throw new Error('Usage: check-e2e-policy.ts [--staged | --revision SHA]');
const started = performance.now();
const paths = (revision ? git('ls-tree', '-r', '--name-only', revision) : staged ? git('ls-files', '--cached') : git('ls-files', '--cached', '--others', '--exclude-standard')).trim().split('\n');
const relevant = paths.filter(path => path === 'playwright.config.ts' || path === '.github/workflows/ci-and-deploy.yml' || path.startsWith('.githooks/') || /^tests\/e2e\/.*\.[cm]?[jt]s$/.test(path));
const files: Sources = new Map();
for (const path of new Set(relevant)) {
  try { files.set(path, staged || revision ? git('show', `${revision ?? ''}:${path}`) : readFileSync(path, 'utf8')); }
  catch { /* Deleted or untracked files are absent from the selected tree. Required files fail closed. */ }
}
const errors = checkPolicy(files);
if (errors.length) { console.error(`E2E policy failed:\n${errors.map(error => `  ${error}`).join('\n')}`); process.exitCode = 1; }
else console.log(`E2E policy passed (${files.size} files, ${Math.round(performance.now() - started)} ms; ${staged ? 'staged index' : revision ?? 'working tree'}).`);
