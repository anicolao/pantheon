import { test, expect } from './helpers/fixtures';
import { actionTable, playCard } from './helpers/action-history';
import { newPlayerContext } from './helpers/players';
import { openPlayers } from './helpers/table-controls';
import { TestStepHelper } from './helpers/test-step-helper';
import { standings } from '../../src/lib/game/actions';

test('table avatar wreath updates when an opponent trashes victory points', async ({ page, browser }, info) => {
  const context = await newPlayerContext(browser, { viewport: info.project.use.viewport, baseURL: info.project.use.baseURL });
  const other = await context.newPage();
  try {
    const { game, host } = await actionTable(page, info, 'seed-keeper', 'melia', { other, extra: ['hamlet'], seed: 'inline-seed-keeper' });
    const initial = standings(game).find(row => row.uid === host)!.score;
    await openPlayers(other);
    const score = other.locator('.opponents [data-vp-score]');
    await expect(score).toHaveAttribute('data-vp-score', String(initial));
    await playCard(page, 'seed-keeper');
    await page.getByRole('button', { name: /^Trash hand card .*Hamlet$/ }).first().click();
    await page.getByRole('button', { name: 'Done trashing (1)', exact: true }).click();
    // The score updates on the trash event; the automatic phase advance is a
    // separate replicated event. Capture the completed action, including that transition.
    await expect(other.locator('.turn-marker')).toContainText('Treasures');
    const steps = new TestStepHelper(other, info, 'Live victory wreath');
    await steps.step('score-updated', 'The avatar shows the current victory points after trashing a Hamlet', [{
      spec: 'The opponent’s wreath loses one VP and stays at the upper right of their avatar',
      check: async () => {
        await expect(score).toHaveAttribute('data-vp-score', String(initial - 1));
        await expect(score).toHaveAccessibleName(`${initial - 1} victory points`);
        const badge = await score.boundingBox();
        const portrait = await other.locator('.opponents .portrait').boundingBox();
        expect(badge).not.toBeNull(); expect(portrait).not.toBeNull();
        expect(badge!.x + badge!.width).toBeGreaterThan(portrait!.x + portrait!.width);
        expect(badge!.y).toBeLessThan(portrait!.y);
        await expect(other.locator(".opponents .avatar-vp")).toHaveCSS("z-index", "-1");
        expect(badge!.width).toBeGreaterThanOrEqual(28);
        expect(badge!.width).toBeLessThan(portrait!.width);
      }
    }], { player: 'Theseus' });
  } finally {
    await context.close();
  }
});
