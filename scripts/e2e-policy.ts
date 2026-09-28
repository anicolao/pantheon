import { createRequire } from 'node:module';
import type * as TypeScript from 'typescript';

// Resolve this checkout's installed compiler, never Bun's automatic package cache.
const require = createRequire(import.meta.url);
const expectedVersion = require('../package.json').devDependencies.typescript;
const ts: typeof TypeScript = (() => {
  try {
    const installed = require('../node_modules/typescript/package.json');
    const compiler = require('../node_modules/typescript');
    if (installed.version !== expectedVersion || typeof compiler.createPrinter !== 'function') throw new Error('Incompatible compiler');
    return compiler;
  } catch {
    throw new Error(`E2E policy requires this checkout's TypeScript ${expectedVersion}. Run bun install --frozen-lockfile in this checkout, then retry. No policy checks were skipped.`);
  }
})();

export type Sources = Map<string, string>;
const helper = 'tests/e2e/helpers/test-step-helper.ts';
const config = 'playwright.config.ts';
const compact = (value: string) => value.replace(/\s/g, '').replace(/(?<=\d)_(?=\d)/g, '');

/** Static policy: unknown timeout expressions fail closed instead of assuming they are safe. */
export function checkPolicy(files: Sources): string[] {
  const errors: string[] = [];
  // Comments cannot satisfy a guard after its implementation has been removed.
  const code = new Map([...files].map(([file, source]) => [file, /\.[cm]?[jt]s$/.test(file)
    ? ts.createPrinter({ removeComments: true }).printFile(ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true))
    : source.split('\n').filter(line => !line.trimStart().startsWith('#')).join('\n')]));
  const requireText = (file: string, text: string) => {
    if (!compact(code.get(file) ?? '').includes(compact(text))) errors.push(`${file}: required policy missing: ${text}`);
  };
  for (const [file, source] of files) {
    if (file !== config && !/^tests\/e2e\/.*\.[cm]?[jt]s$/.test(file)) continue;
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const report = (node: TypeScript.Node, reason: string) => errors.push(`${file}:${tree.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${reason}`);
    const name = (node: TypeScript.Node) => ts.isIdentifier(node) || ts.isStringLiteral(node) ? node.text : node.getText(tree);
    const value = (node: TypeScript.Node) => ts.isNumericLiteral(node) ? Number(node.text) : undefined;
    const bounded = (node: TypeScript.Node) => {
      const n = value(node);
      return n !== undefined ? n > 0 && n <= 2000 : name(node) === 'OPERATION_BUDGET' || (file === helper && compact(node.getText(tree)) === 'remaining()');
    };
    const walk = (node: TypeScript.Node) => {
      if (ts.isVariableDeclaration(node) && name(node.name) === 'OPERATION_BUDGET' && (file !== helper || !node.initializer || value(node.initializer) !== 2000)) report(node, 'OPERATION_BUDGET must be exactly 2000 in the shared helper');
      if (ts.isShorthandPropertyAssignment(node) && ['timeout', 'actionTimeout', 'navigationTimeout', 'retries', 'maxDiffPixels', 'maxDiffPixelRatio', 'threshold'].includes(name(node.name))) report(node, 'policy options must have explicit, statically checked values');
      if (ts.isPropertyAssignment(node)) {
        const key = name(node.name), v = node.initializer;
        if (['timeout', 'actionTimeout', 'navigationTimeout'].includes(key)) {
          // Whole-story and server-startup budgets are distinct from operations; only these exact config locations are exempt.
          const object = node.parent;
          const infrastructure = file === config && ts.isPropertyAssignment(object.parent) && name(object.parent.name) === 'webServer' && value(v) === 120000;
          const wholeStory = file === config && ts.isCallExpression(object.parent) && object.parent.expression.getText(tree) === 'defineConfig' && value(v) === 60000;
          if (!infrastructure && !wholeStory && !bounded(v)) report(node, 'operation timeout must be a known positive value <= 2000 ms');
        }
        if (['retries', 'maxDiffPixels', 'maxDiffPixelRatio', 'threshold'].includes(key) && value(v) !== 0) report(node, `${key} must be zero`);
        if (['mask', 'maskColor', 'stylePath'].includes(key)) report(node, 'screenshot masking/styling bypasses are forbidden');
        if (key === 'animations' && ts.isStringLiteral(v) && v.text === 'disabled') report(node, 'captures must wait for animations, not disable them');
      }
      if (ts.isCallExpression(node)) {
        const expression = node.expression;
        const method = ts.isPropertyAccessExpression(expression) ? expression.name.text : ts.isElementAccessExpression(expression) && expression.argumentExpression ? name(expression.argumentExpression) : name(expression);
        if (['waitForTimeout', 'sleep', 'slow', 'setInterval'].includes(method)) report(node, `${method} is forbidden in E2E`);
        if (method === 'setTimeout') {
          if (expression.getText(tree) !== 'test.setTimeout' || !node.arguments[0] || ![60000, 120000, 180000, 240000].includes(value(node.arguments[0]) ?? 0)) report(node, 'only explicit whole-story test.setTimeout budgets are permitted; no sleeps');
        }
        if (['setDefaultTimeout', 'setDefaultNavigationTimeout'].includes(method) || (method === 'timeout' && ts.isPropertyAccessExpression(expression) && expression.expression.getText(tree) === 'AbortSignal')) {
          if (!node.arguments[0] || !bounded(node.arguments[0])) report(node, 'default/network timeout must be positive and <= 2000 ms');
        }
        if (['screenshot', 'toHaveScreenshot', 'toMatchSnapshot'].includes(method) && !(file === helper && method === 'toMatchSnapshot')) report(node, 'screenshots must use the bounded, clipping-audited story helper');
        if (method === 'newContext' && file !== 'tests/e2e/helpers/players.ts') report(node, 'additional players must use newPlayerContext with bounded defaults');
        if (method === 'configure' && expression.getText(tree) === 'expect.configure') report(node, 'use the centrally bounded expect configuration');
      }
      if (ts.isStringLiteral(node) && node.text === 'networkidle') report(node, 'networkidle is not semantic readiness');
      if (ts.isStringLiteral(node) && node.text === 'Page.captureScreenshot' && file !== helper) report(node, 'CDP capture belongs only in the shared helper');
      ts.forEachChild(node, walk);
    };
    walk(tree);
  }
  for (const text of [
    'actionTimeout: 2_000', 'navigationTimeout: 2_000', 'retries: 0', "updateSnapshots: 'none'", 'forbidOnly: true', 'workers: 1',
    "screenshot: 'off'", "expect: { timeout: 2_000, toHaveScreenshot: { timeout: 2_000, maxDiffPixels: 0, threshold: 0",
    "name: 'phone'", "name: 'desktop'", "name: 'tabletop-4k'"
  ]) requireText(config, text);
  for (const text of [
    'export const OPERATION_BUDGET = 2_000;',
    'for(const verification of verifications)await test.step(verification.spec,verification.check,{timeout:OPERATION_BUDGET});',
    'remaining=()=>Math.max(1,OPERATION_BUDGET-Math.ceil(performance.now()-start))',
    "scenes.length===1&&scenes[0].getAttribute('data-status')===status",
    "(status!=='synced'||!document.querySelector('[aria-busy=\"true\"]'))",
    '},view.status??this.settledStatus,{polling:20,timeout:remaining()});',
    'await page.evaluate(assertScreenFit,{document:view.document});',
    'await identicalPixels(capture,readFileSync(baseline))',
    'expect(same,\'Every decoded RGBA byte must equal the reviewed baseline\').toBe(true);',
    'toBeLessThanOrEqual(OPERATION_BUDGET);\n      },{timeout:OPERATION_BUDGET});'
  ]) requireText(helper, text);
  // All readiness, clipping, capture, and comparison must remain inside this single deadline.
  const source = compact(code.get(helper) ?? '');
  const start = source.indexOf(compact("await test.step('Ready, unclipped, and photographed within 2,000 ms'"));
  const end = source.indexOf('},{timeout:OPERATION_BUDGET});', start);
  const capture = compact(source.slice(start, end));
  for (const text of ['await page.waitForFunction', 'await document.fonts.ready', 'image.decode()', 'animation.finished', 'await page.evaluate(assertScreenFit', "camera.send('Page.captureScreenshot'", 'await identicalPixels(', 'toBeLessThanOrEqual(OPERATION_BUDGET)']) {
    if (start < 0 || end < 0 || !capture.includes(compact(text))) errors.push(`${helper}: ${text} must be inside the one bounded capture step`);
  }
  for (const text of ['context.setDefaultTimeout(OPERATION_BUDGET)', 'context.setDefaultNavigationTimeout(OPERATION_BUDGET)']) requireText('tests/e2e/helpers/players.ts', text);
  for (const text of ['ensureAlpha().raw()', 'a.data.equals(b.data)', 'a.info.width===b.info.width', 'a.info.height===b.info.height']) requireText('tests/e2e/helpers/exact-pixels.ts', text);
  requireText('tests/e2e/helpers/fixtures.ts', 'finishStory(info)');
  requireText('.github/workflows/ci-and-deploy.yml', '- run: bun run test:policy');
  for (const hook of ['pre-commit', 'pre-push']) requireText(`.githooks/${hook}`, 'check-e2e-policy.ts');
  return errors;
}
