import { Glob } from 'bun';
import { readFileSync, writeFileSync } from 'node:fs';
import { renderStoryImages } from '../tests/e2e/helpers/story-images';
// Presentation-only migration: preserve existing passed-story captions, assertions, and PNGs.
let steps = 0;
for (const path of new Glob('tests/e2e/**/stories/*/README.md').scanSync('.')) {
  const old = readFileSync(path, 'utf8');
  const next = old.replace(/\[phone\]\([^\n]+\n\n!\[([^\n]+)\]\(\.\.\/\.\.\/screenshots\/([^/]+)\/([^/]+)-desktop-darwin\.png\)/g, (_match, description: string, slug: string, stem: string) => {
    steps++;
    return renderStoryImages(slug, stem, description);
  });
  if (next !== old) writeFileSync(path, next);
}
console.log(`Updated ${steps} photographed steps without changing their baselines.`);
