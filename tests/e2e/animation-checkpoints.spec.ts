import { test, expect } from './helpers/fixtures';
import { TestStepHelper } from './helpers/test-step-helper';

test('Oracle draw reveals and lands in its sorted hand layer', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./dev/animations/?scenario=oracles-acolyte');
  const trigger = page.getByRole('button', { name: 'Trigger', exact: true });
  await expect(trigger).toBeEnabled();
  await trigger.click();
  const draw = page.locator('[data-draw-phase="reveal"]');
  await expect(draw).toBeVisible();
  await draw.evaluate(node => {
    for (const animation of node.getAnimations({ subtree: true })) {
      animation.pause();
      animation.currentTime = Number(animation.effect!.getTiming().duration) * .65;
    }
  });
  const story = new TestStepHelper(page, info, 'Draw animation checkpoints');
  await story.step('reveal', 'The deck card flips before a hand slot opens', [
    { spec: 'The presented hand still has its original four cards', check: () => expect(page.locator('.hand')).toHaveAttribute('data-hand-total', '4') }
  ], { animationCheckpoint: true });
  await draw.evaluate(node => node.getAnimations({ subtree: true }).forEach(animation => animation.play()));
  const travel = page.locator('[data-draw-phase="travel"]');
  await expect(travel).toBeVisible();
  await travel.evaluate(node => {
    for (const animation of node.getAnimations()) {
      if (animation.playState === 'finished') continue;
      animation.pause();
      animation.currentTime = Number(animation.effect!.getTiming().duration) * .8;
    }
  });
  await story.step('landing', 'The revealed card enters the hand in its final stacking layer', [
    { spec: 'Exactly one hand slot opened', check: () => expect(page.locator('.hand')).toHaveAttribute('data-hand-total', '5') },
    { spec: 'The flight shares the hand stacking context', check: () => expect(page.locator('.hand > .public-flight')).toHaveCount(1) }
  ], { animationCheckpoint: true });
  await travel.evaluate(node => node.getAnimations().filter(animation => animation.playState === 'paused').forEach(animation => animation.play()));
  await expect(page.locator('.public-flight')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Replay', exact: true })).toBeEnabled();
});

test('victory keeps its explicit timing and distinct placement metals', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./dev/animations/?scenario=victory&players=4');
  const trigger = page.getByRole('button', { name: 'Trigger', exact: true });
  await expect(trigger).toBeEnabled();
  await trigger.click();
  const scene = page.locator('.victory-scene');
  await expect(scene).toBeVisible();
  const timeline = await scene.evaluate(node => {
    const standings = [...node.querySelectorAll<HTMLElement>('.standing')];
    const entries = standings.map(standing => {
      const animation = standing.getAnimations()[0];
      animation.pause();
      const timing = animation.effect!.getTiming();
      animation.currentTime = 0;
      return { metal: standing.dataset.metal, delay: timing.delay, duration: timing.duration, opacity: getComputedStyle(standing).opacity };
    });
    const sparkles = [...node.querySelectorAll('.victory-sparkle')].map(sparkle => {
      const animation = sparkle.getAnimations()[0];
      animation.pause();
      animation.currentTime = 0;
      const timing = animation.effect!.getTiming();
      return { delay: timing.delay, duration: timing.duration, iterations: timing.iterations };
    });
    return { entries, sparkles };
  });
  expect(timeline.entries).toEqual(['gold', 'silver', 'copper', 'lead'].map((metal, index) => ({ metal, delay: index ? 3000 + index * 400 : 0, duration: 400, opacity: '0' })));
  expect(timeline.sparkles).toHaveLength(12);
  for (const sparkle of timeline.sparkles) expect(sparkle).toEqual({ delay: 400, duration: 3000, iterations: 1 });
  await scene.evaluate(node => node.getAnimations({ subtree: true }).forEach(animation => animation.finish()));
  const story = new TestStepHelper(page, info, 'Victory placements');
  await story.step('placements', 'Gold, silver, copper and lead identify four distinct scores', [
    { spec: 'All four placements have landed', check: async () => {
      for (const standing of await scene.locator('.standing').all()) {
        await expect(standing).toHaveCSS('opacity', '1');
        await expect(standing).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
      }
    } }
  ]);
});
