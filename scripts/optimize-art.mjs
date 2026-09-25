import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const input = process.argv[2];
if (!input) throw new Error('Usage: bun scripts/optimize-art.mjs <directory-of-named-PNGs>');
const prompts = JSON.parse(await readFile(new URL('../docs/art-prompts.json', import.meta.url), 'utf8'));
for (const { id } of prompts) {
  await sharp(resolve(input, `${id}.png`))
    .resize(960, 640, { fit: 'inside' })
    .webp({ quality: 85 })
    .toFile(new URL(`../static/assets/cards/${id}.webp`, import.meta.url).pathname);
}
console.log(`Optimized ${prompts.length} card illustrations.`);
