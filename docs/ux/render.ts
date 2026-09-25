/** Design artifacts only. Run with Bun; requires the catalog dev server on port 5193. */
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cards } from '../../src/lib/game/cards';
import { screens, render } from './screens';

const root = resolve(import.meta.dir, '../..');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await mkdir(`${root}/docs/ux/cards`, { recursive: true });
  await mkdir(`${root}/docs/ux/mockups`, { recursive: true });
  if (!process.argv.includes('--screens-only')) {
    await page.goto(`${process.env.CATALOG_URL ?? 'http://127.0.0.1:5193'}/gallery/`);
    await page.addStyleTag({ content: '.card-grid { display: flex !important; flex-direction: column !important; align-items: flex-start !important; } .card-grid .card-item { width: 600px !important; }' });
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode())); });
    for (const card of cards) {
      const face = page.locator(`.card-grid [data-card-id="${card.id}"]`);
      await face.evaluate((el, width) => { (el as HTMLElement).style.width = `${width}px`; }, card.type === 'Leader' || card.type === 'Event' ? 560 : 420);
      const png = await face.screenshot();
      await sharp(png).webp({ quality: 92 }).toFile(`${root}/docs/ux/cards/${card.id}.webp`);
    }
  }
  const server = Bun.serve({ hostname: '127.0.0.1', port: 5197, async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/') return new Response(render(url.searchParams.get('screen') ?? screens[0].id), { headers: { 'Content-Type': 'text/html' } });
    const filePath = resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (!filePath.startsWith(`${root}/`)) return new Response('Forbidden', { status: 403 });
    const file = Bun.file(filePath);
    return await file.exists() ? new Response(file) : new Response('Missing', { status: 404 });
  }});
  try {
    for (const screen of screens) {
      for (const [device, width, height] of [['desktop', 1440, 1000], ['mobile', 393, 852]] as const) {
        await page.setViewportSize({ width, height });
        const failed: string[] = [];
        const onResponse = (r: any) => { if (r.status() >= 400) failed.push(r.url()); };
        page.on('response', onResponse);
        await page.goto(`http://127.0.0.1:5197/?screen=${screen.id}`);
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode())); });
        const issues = await page.evaluate(() => {
          const problems: string[] = [];
          if (document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight) problems.push('Document overflow');
          for (const el of document.querySelectorAll<HTMLElement>('button,input')) {
            const r = el.getBoundingClientRect();
            const scrollParent = el.closest('[data-scroll]');
            if (!scrollParent && (r.right > innerWidth || r.bottom > innerHeight || r.left < 0 || r.top < 0)) problems.push(`Offscreen control: ${el.textContent}`);
            if (el.scrollWidth > el.clientWidth) problems.push(`Control text overflow: ${el.textContent}`);
          }
          return problems;
        });
        if (failed.length || issues.length) throw Error(`${screen.id}/${device}: ${[...failed, ...issues].join(', ')}`);
        await page.screenshot({ path: `${root}/docs/ux/mockups/${screen.id}-${device}.png` });
        page.off('response', onResponse);
        console.log(`${screen.id}/${device}: assets decoded, viewport contained`);
      }
    }
  } finally { server.stop(); }
  await writeFile(`${root}/docs/ux/manifest.json`, JSON.stringify(screens, null, 2) + '\n');
} finally { await browser.close(); }
