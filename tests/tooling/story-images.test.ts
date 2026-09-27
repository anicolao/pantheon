import { expect, test } from 'bun:test';
import { Glob } from 'bun';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { renderStoryImages } from '../../tests/e2e/helpers/story-images';

test('step renders both views inline with full-size links and an expandable 4K view', () => {
  const html = renderStoryImages('buy-a-card', '002-purchase', 'Ariadne buys "Oracle" & <returns>');
  expect(html.match(/<img /g)).toHaveLength(3);
  expect(html.slice(0, html.indexOf('</table>'))).toContain('002-purchase-phone-darwin.png');
  expect(html.slice(0, html.indexOf('</table>'))).toContain('002-purchase-desktop-darwin.png');
  expect(html).toContain('<details>');
  expect(html).toContain('002-purchase-tabletop-4k-darwin.png');
  expect(html).toContain('&quot;Oracle&quot; &amp; &lt;returns&gt;');
  expect(html.match(/<a href=/g)).toHaveLength(3);
});
test('every committed illustrated step has both inline views and valid screenshot links', () => {
  let steps = 0;
  for (const path of new Glob('tests/e2e/**/stories/*/README.md').scanSync('.')) {
    const doc = readFileSync(path, 'utf8');
    for (const step of doc.split(/^## /m).slice(1)) {
      expect(step, path).toContain('<table>');
      expect(step, path).toContain('-phone-darwin.png');
      expect(step, path).toContain('-desktop-darwin.png');
      expect(step, path).toContain('<details>');
      for (const match of step.matchAll(/(?:src|href)="([^"]+\.png)"/g)) expect(existsSync(resolve(dirname(path), match[1])), `${path}: ${match[1]}`).toBe(true);
      steps++;
    }
  }
  expect(steps).toBeGreaterThanOrEqual(163);
});
