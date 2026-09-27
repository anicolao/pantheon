import { expect, test } from 'bun:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

// Exercise index/revision reads in an isolated tiny repo; never change the developer's index.
test('staged and push checks read the selected tree, not unstaged files', () => {
  const root = mkdtempSync(join(tmpdir(), 'pantheon-policy-'));
  const runner = resolve('scripts/check-e2e-policy.ts');
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const check = (...args: string[]) => spawnSync(process.execPath, [runner, ...args], { cwd: root, encoding: 'utf8' });
  try {
    git('init', '-q');
    const paths = ['playwright.config.ts', '.github/workflows/ci-and-deploy.yml', '.githooks/pre-commit', '.githooks/pre-push', ...['test-step-helper', 'players', 'exact-pixels', 'fixtures'].map(name => `tests/e2e/helpers/${name}.ts`)];
    for (const path of paths) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), readFileSync(path)); }
    git('add', '.');
    git('-c', 'core.hooksPath=/dev/null', '-c', 'user.name=Policy test', '-c', 'user.email=policy@example.invalid', 'commit', '-qm', 'Valid policy');
    const sha = git('rev-parse', 'HEAD').trim();
    const path = join(root, 'playwright.config.ts');
    const valid = readFileSync(path, 'utf8');
    writeFileSync(path, valid.replace('actionTimeout: 2_000', 'actionTimeout: 5_000'));
    expect(check().status).toBe(1);
    expect(check('--staged').status).toBe(0);
    git('add', 'playwright.config.ts');
    writeFileSync(path, valid);
    expect(check().status).toBe(0);
    const staged = check('--staged');
    expect(staged.status).toBe(1);
    expect(staged.stderr).toContain('operation timeout');
    expect(check('--revision', sha).status).toBe(0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
