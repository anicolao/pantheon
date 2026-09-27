import { execFileSync } from 'node:child_process';
if (!process.env.CI) {
  try {
    execFileSync('git', ['rev-parse', '--git-dir'], { stdio: 'ignore' });
    execFileSync('git', ['config', '--local', 'core.hooksPath', '.githooks']);
    console.log('Installed fast E2E policy hooks.');
  } catch { console.log('Git hooks not installed (no writable Git checkout).'); }
}
