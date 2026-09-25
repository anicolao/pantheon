import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import sharp from 'sharp';

test('printed territory numbers preserve their backgrounds in macOS PDF rendering', async ({ page }, testInfo) => {
  test.skip(process.platform !== 'darwin' || testInfo.project.name !== 'desktop', 'Exercises the macOS CoreGraphics PDF renderer; requires Swift.');
  await page.goto('./gallery/');
  await page.getByRole('button', { name: 'Territories 3', exact: true }).click();
  await page.emulateMedia({ media: 'print' });
  // Use a known page size and origin so DOM bounds map directly to PDF pixels.
  await page.setViewportSize({ width: 1000, height: 500 });
  await page.addStyleTag({ content: '@page { size: 1000px 500px; margin: 0; }' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode()));
  });
  const numbers = await page.locator('.card .resource-number').evaluateAll(elements => elements.map(element => {
    const { x, y, width, height } = element.getBoundingClientRect();
    return { value: element.textContent, x, y, width, height };
  }));
  expect(numbers.map(number => number.value)).toEqual(['2', '1', '5', '3', '8', '6']);
  const pdf = testInfo.outputPath('territories.pdf');
  const png = testInfo.outputPath('territories-quartz.png');
  await page.pdf({ path: pdf, printBackground: true, preferCSSPageSize: true });
  execFileSync('swift', [fileURLToPath(new URL('./helpers/render-pdf.swift', import.meta.url)), pdf, png]);
  await testInfo.attach('PDF rendered by macOS', { path: png, contentType: 'image/png' });
  // The helper renders at 3 pixels per PDF point; CSS uses 96 pixels per inch.
  const scale = 3 * 72 / 96;
  for (const number of numbers) {
    const { data, info } = await sharp(png).extract({
      left: Math.round(number.x * scale), top: Math.round(number.y * scale),
      width: Math.floor(number.width * scale), height: Math.floor(number.height * scale)
    }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let black = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i] < 15 && data[i + 1] < 15 && data[i + 2] < 15) black++;
    }
    // Thin outlines are fine; opaque rectangles around the glyphs are not.
    expect(black / (info.width * info.height), `black area behind ${number.value}`).toBeLessThan(0.25);
  }
});
