import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const input = process.argv[2];
if (!input) throw new Error('Usage: bun scripts/optimize-layers.mjs <asset-root-with-frames-icons-backs>');
const prompts = JSON.parse(await readFile(new URL('../docs/layer-prompts.json', import.meta.url), 'utf8'));
for (const { id, kind } of prompts) {
  const file = sharp(resolve(input, kind, `${id}.png`));
  const metadata = await file.metadata();
  if (kind !== 'backs' && !metadata.hasAlpha) throw new Error(`${id} requires genuine alpha transparency`);
  await file.resize({ width: kind === 'icons' ? 256 : kind === 'frames' ? 1200 : 1000 })
    .webp(kind === 'backs' ? { quality: 90 } : { lossless: true })
    .toFile(new URL(`../static/assets/${kind}/${id}.webp`, import.meta.url).pathname);
}
console.log(`Optimized ${prompts.length} layer assets, preserving alpha.`);
