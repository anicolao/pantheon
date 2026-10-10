import { test, expect } from './helpers/fixtures';
import { captureReady } from './helpers/capture-ready';

test('paused checkpoints admit only the matching flight pile',async({page})=>{
  await page.setContent(`<main data-status="synced">
    <div data-public-zone="deck" data-public-uid="alice">
      <span class="resource-icon" data-count-pending="true" aria-busy="true"></span>
    </div>
    <div class="public-flight" data-motion-from-zone="deck" data-motion-from-uid="alice" data-motion-to-zone="hand" data-motion-to-uid="alice"></div>
    <div class="supply-coverflow" aria-busy="false"></div>
  </main>`);
  const options={status:'synced',checkpoint:true};
  expect(await page.evaluate(captureReady,options)).toBe(false);
  await page.locator('.public-flight').evaluate(node=>{
    const animation=node.animate([{opacity:0},{opacity:1}],{duration:1000});
    animation.pause();animation.currentTime=500;
  });
  expect(await page.evaluate(captureReady,options)).toBe(true);
  expect(await page.evaluate(captureReady,{status:'synced',checkpoint:false})).toBe(false);
  expect(await page.evaluate(captureReady,{status:'loading',checkpoint:true})).toBe(false);
  await page.locator('.supply-coverflow').evaluate(node=>node.setAttribute('aria-busy','true'));
  expect(await page.evaluate(captureReady,options)).toBe(false);
  await page.locator('.supply-coverflow').evaluate(node=>node.setAttribute('aria-busy','false'));
  await page.locator('[data-public-zone]').evaluate(node=>node.setAttribute('data-public-uid','bob'));
  expect(await page.evaluate(captureReady,options)).toBe(false);
  await page.locator('[data-public-zone]').evaluate(node=>{
    node.setAttribute('data-public-uid','alice');node.setAttribute('data-public-zone','discard');
  });
  expect(await page.evaluate(captureReady,options)).toBe(false);
  await page.locator('.public-flight').evaluate(node=>{
    node.setAttribute('data-motion-to-zone','discard');node.setAttribute('data-motion-to-uid','alice');
  });
  expect(await page.evaluate(captureReady,options)).toBe(true);
  await page.locator('.public-flight').evaluate(node=>node.getAnimations().forEach(animation=>animation.finish()));
  expect(await page.evaluate(captureReady,options)).toBe(false);
  await page.locator('.resource-icon').evaluate(node=>node.setAttribute('aria-busy','false'));
  expect(await page.evaluate(captureReady,{status:'synced',checkpoint:false})).toBe(true);
});
