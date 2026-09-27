import { describe, expect, test } from 'bun:test';
import { Glob } from 'bun';
import { readFileSync } from 'node:fs';
import { checkPolicy } from '../../scripts/e2e-policy';

const files = new Map<string,string>();
for (const pattern of ['playwright.config.ts', '.github/workflows/ci-and-deploy.yml', '.githooks/*', 'tests/e2e/**/*.ts']) {
  for (const path of new Glob(pattern).scanSync({ cwd: '.', dot: true })) files.set(path, readFileSync(path, 'utf8'));
}
const helper = 'tests/e2e/helpers/test-step-helper.ts';
function changed(file: string, from: string, to: string) {
  const next = new Map(files), source = next.get(file)!;
  expect(source).toContain(from);
  next.set(file, source.replace(from, to));
  return checkPolicy(next);
}
test('repository satisfies the policy', () => expect(checkPolicy(files)).toEqual([]));
describe('weakening the policy fails before launching a browser', () => {
  for (const [label, code] of [
    ['larger timeout', 'await page.click("button", { timeout: 2001 });'],
    ['disabled timeout', 'await page.click("button", { timeout: 0 });'],
    ['unknown timeout', 'const delay=5000; await page.click("button", { timeout: delay });'],
    ['shorthand timeout', 'const timeout=5000; await page.click("button", { timeout });'],
    ['default timeout', 'page.setDefaultTimeout(5000);'],
    ['network timeout', 'AbortSignal.timeout(5000);'],
    ['sleep', 'await page.waitForTimeout(10);'],
    ['timer sleep', 'await new Promise(resolve => setTimeout(resolve, 10));'],
    ['idle wait', 'await page.waitForLoadState("networkidle");'],
    ['retry', 'test.describe.configure({ retries: 1 });'],
    ['pixel tolerance', 'expect(image).toMatchSnapshot({ maxDiffPixels: 1 });'],
    ['screenshot bypass', 'await page.screenshot();'],
    ['CDP bypass', 'await camera.send("Page.captureScreenshot");'],
    ['unbounded player', 'await browser.newContext();'],
    ['mask', 'const options = { mask: [page.locator(".clock")] };'],
    ['slow mode', 'test.slow();']
  ]) test(label, () => {
    const next = new Map(files); next.set('tests/e2e/violation.spec.ts', code);
    expect(checkPolicy(next).length).toBeGreaterThan(0);
  });
  for (const [label, file, from, to] of [
    ['shared budget', helper, 'OPERATION_BUDGET = 2_000', 'OPERATION_BUDGET = 3_000'],
    ['clipping removal', helper, 'await page.evaluate(assertScreenFit,{document:view.document});', ''],
    ['commented clipping guard', helper, 'await page.evaluate(assertScreenFit,{document:view.document});', '// await page.evaluate(assertScreenFit,{document:view.document});'],
    ['commented CI guard', '.github/workflows/ci-and-deploy.yml', '- run: bun run test:policy', '# - run: bun run test:policy'],
    ['capture budget removal', helper, '},{timeout:OPERATION_BUDGET});\n      const views', '});\n      const views'],
    ['exact comparison removal', helper, 'await identicalPixels(capture,readFileSync(baseline))', 'true'],
    ['elapsed deadline removal', helper, 'toBeLessThanOrEqual(OPERATION_BUDGET)', 'toBeLessThanOrEqual(5000)'],
    ['phone removal', 'playwright.config.ts', "name: 'phone'", "name: 'tablet'"],
    ['CI guard removal', '.github/workflows/ci-and-deploy.yml', '- run: bun run test:policy', ''],
    ['player default removal', 'tests/e2e/helpers/players.ts', 'context.setDefaultTimeout(OPERATION_BUDGET);', '']
  ]) test(label, () => expect(changed(file, from, to).length).toBeGreaterThan(0));
});
test('a short explicit operation and aggregate journey budget are allowed', () => {
  const next = new Map(files);
  next.set('tests/e2e/valid.spec.ts', 'test.setTimeout(180_000); await page.click("button", { timeout: 1500 });');
  expect(checkPolicy(next)).toEqual([]);
});
