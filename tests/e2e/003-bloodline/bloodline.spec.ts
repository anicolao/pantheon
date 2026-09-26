import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
import { roomCodeFixture } from '../helpers/room-code-fixture';
import { replaySetup, leaderIds, leaderLinks, type SetupEvent } from '../../../src/lib/game/setup';

async function eventsAt(code: string): Promise<SetupEvent[]> {
  const response = await fetch(`http://127.0.0.1:8193/v1/projects/demo-pantheon/databases/(default)/documents/games/${code}/events`, { headers: { Authorization: 'Bearer owner' } });
  expect(response.ok).toBe(true);
  const { documents } = await response.json();
  return documents.map((document: { fields: Record<string, Record<string, unknown>> }) => Object.fromEntries(Object.entries(document.fields).filter(([key]) => key !== 'createdAt').map(([key, value]) => [key, 'integerValue' in value ? Number(value.integerValue) : value.stringValue])));
}
const ready = async (page: Page) => expect(page.locator('[data-status]')).toHaveAttribute('data-status', 'synced');
test.beforeEach(async ({ page }, info) => { await roomCodeFixture(page, info); });

for (const count of [2, 3, 4] as const) test(`${count} players draft unique bloodlines and replay the same starting hands`, async ({ page, browser }, info) => {
  const contexts: BrowserContext[] = [];
  const pages: Record<string, Page> = { Ariadne: page };
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./play/');
  await page.getByLabel('Your name', { exact: true }).fill('Ariadne');
  await page.getByRole('radio', { name: `${count} players`, exact: true }).check();
  await page.getByRole('button', { name: 'Create table', exact: true }).click();
  await expect(page.getByTestId('player-seat')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Begin', exact: true })).toHaveCount(0);
  const code = new URL(page.url()).searchParams.get('room')!;
  try {
    for (const name of ['Theseus', count === 3 ? 'Alexandros of Samothrace' : 'Iris', 'Leon'].slice(0, count - 1)) {
      const context = await browser.newContext({ viewport: info.project.use.viewport, reducedMotion: 'reduce' }); contexts.push(context);
      const guest = await context.newPage(); pages[name] = guest; guest.on('pageerror', error => errors.push(error.message));
      await guest.goto(page.url()); await guest.getByLabel('Your name', { exact: true }).fill(name);
      await guest.getByRole('button', { name: 'Join table', exact: true }).click();
      await expect(guest.getByTestId('player-seat')).toHaveCount(Object.keys(pages).length);
      await expect(guest.getByRole('button', { name: 'Begin', exact: true })).toHaveCount(0);
    }
    let lostStartResponse = false;
    if (count === 2) await page.context().route(url => url.pathname.endsWith('/documents:commit'), async route => {
      if (lostStartResponse) { await route.continue(); return; }
      const response = await route.fetch(); expect(response.ok()).toBe(true);
      lostStartResponse = true; await route.abort('connectionreset');
    });
    await page.getByRole('button', { name: 'Begin', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Choose your Bloodline' })).toBeVisible();
    if (count === 2) expect(lostStartResponse).toBe(true);
    let game = replaySetup(await eventsAt(code));
    expect(game.phase).toBe('draft'); expect(game.draftOrder).toEqual([...game.turnOrder].reverse());
    const chooserName = game.players.find(player => player.uid === game.draftOrder[0])!.name;
    const choosing = pages[chooserName];
    await expect(choosing.getByText('Your choice', { exact: true })).toBeVisible();
    const steps = new TestStepHelper(choosing, info, 'Choose a bloodline and receive your hand');
    await steps.step(`draft-${count}`, 'Choose from the unused bloodlines', [
      { spec: 'The first player is drawn once, and the draft runs in reverse order.', check: async () => { await expect(choosing.getByTestId('draft-seat')).toHaveCount(count); await expect(choosing.getByTestId('draft-seat').first()).toHaveAttribute('data-choosing', 'true'); } },
      { spec: 'Actual leader, Temple and event cards accompany the selected hero.', check: async () => { for (const id of ['thaleia', 'temple-of-athena', 'counsel-of-olympus']) await expect(choosing.locator(`.draft-card [data-card-id="${id}"]`)).toHaveCount(1); } }
    ]);
    for (const leader of leaderIds) {
      const links = leaderLinks(leader);
      await choosing.getByRole('button', { name: `View ${links.leader.name.split(',')[0]}`, exact: true }).click();
      await expect(choosing.locator('.hero')).toHaveAttribute('src', new RegExp(`hero-${leader}.webp$`));
      await expect(choosing.locator('.temple-card [data-card-id]')).toHaveAttribute('data-card-id', links.temple.id);
      await expect(choosing.locator('.event-card [data-card-id]')).toHaveAttribute('data-card-id', links.event.id);
    }
    await choosing.getByRole('button', { name: 'View Thaleia', exact: true }).click();
    const waiting = Object.values(pages).find(other => other !== choosing)!;
    await expect(waiting.getByRole('button', { name: /^Choose (Thaleia|Nereon|Melia|Doreios)$/ })).toHaveCount(0);
    if (count === 2) {
      await choosing.getByRole('button', { name: 'Inspect Temple of Athena', exact: true }).click();
      await steps.step('temple', 'Read the Temple linked to your bloodline', [
        { spec: 'Inspection uses the complete live card and can be dismissed with Escape.', check: async () => expect(choosing.getByRole('dialog')).toContainText('Temple of Athena') }
      ]);
      await choosing.keyboard.press('Escape');
      await expect(choosing.getByRole('button', { name: 'Inspect Temple of Athena', exact: true })).toBeFocused();
      await choosing.reload(); await ready(choosing);
      expect(replaySetup(await eventsAt(code)).draftOrder).toEqual(game.draftOrder);
    }
    if (count === 2) {
      const recordMotion = () => {
        const animate = Element.prototype.animate;
        (window as unknown as { dealDurations: number[]; claimDurations: number[] }).dealDurations = [];
        (window as unknown as { claimDurations: number[] }).claimDurations = [];
        Element.prototype.animate = function (frames, options) {
          if (this.matches('.hand-slot')) (window as unknown as { dealDurations: number[] }).dealDurations.push(typeof options === 'number' ? options : Number(options?.duration ?? 0));
          if (this.matches('[data-testid="draft-seat"]')) (window as unknown as { claimDurations: number[] }).claimDurations.push(typeof options === 'number' ? options : Number(options?.duration ?? 0));
          return animate.call(this, frames, options);
        };
      };
      await choosing.addInitScript(recordMotion); await choosing.evaluate(recordMotion);
      await choosing.emulateMedia({ reducedMotion: 'no-preference' });
    }
    for (const [index, uid] of game.draftOrder.entries()) {
      const name = game.players.find(player => player.uid === uid)!.name;
      const actor = pages[name], leader = leaderIds[index];
      await expect(actor.getByText('Your choice', { exact: true })).toBeVisible();
      if (index) await expect(actor.getByRole('button', { name: /^View Thaleia, chosen by/ })).toBeDisabled();
      await actor.getByRole('button', { name: `View ${leaderLinks(leader).leader.name.split(',')[0]}`, exact: true }).click();
      await actor.getByRole('button', { name: `Choose ${leaderLinks(leader).leader.name.split(',')[0]}`, exact: true }).click();
      if (count === 2 && index === 0) {
        await expect.poll(() => choosing.evaluate(() => (window as unknown as { claimDurations: number[] }).claimDurations.filter(duration => duration === 450).length)).toBe(1);
        const claimed = new TestStepHelper(choosing, info, 'A bloodline takes its seat');
        await claimed.step('claimed', 'Wait while the next player chooses', [{ spec: 'The chosen portrait belongs to its named seat and cannot be chosen again.', check: async () => { await expect(choosing.getByRole('button', { name: /^View Thaleia, chosen by/ })).toBeDisabled(); await expect(choosing.getByRole('status')).toContainText('Waiting for'); } }]);
      }
    }
    await expect(choosing.getByRole('region', { name: 'Your hand', exact: true })).toBeVisible();
    if (count === 2) {
      await expect.poll(() => choosing.evaluate(() => (window as unknown as { dealDurations: number[] }).dealDurations.filter(duration => duration === 550).length)).toBe(5);
      await choosing.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished)));
    }
    game = replaySetup(await eventsAt(code));
    expect(game.phase).toBe('playing');
    expect((await eventsAt(code)).filter(event => event.type === 'draft/started')).toHaveLength(1);
    for (const player of game.players) {
      const client = pages[player.name];
      await expect(client.getByTestId('hand-card')).toHaveCount(5);
      expect(await client.locator('.hand [data-card-id]').evaluateAll(cards => cards.map(card => card.getAttribute('data-card-id')))).toEqual(game.decks[player.uid].hand.map(card => card.cardId));
      await expect(client.getByTestId('opponent')).toHaveCount(count - 1);
      await expect(client.locator('.opponents [data-card-id]')).toHaveCount(0);
      await expect(client.locator('.opponents img[alt="Card back"]')).toHaveCount((count - 1) * 5);
      await expect(client.locator('.altars [data-card-id]')).toHaveCount(count);
      for (const id of game.sharedEvents) await expect(client.locator(`.altars [data-card-id="${id}"]`)).toHaveCount(1);
      expect(await client.locator('.opponents').ariaSnapshot()).not.toMatch(/Obol|Hamlet|Temple of/);
    }
    await steps.step(`dealt-${count}`, 'Receive five cards at the shared table', [
      { spec: 'Your own hand shows faces; other players have common backs and public counts.', check: async () => { await expect(choosing.getByTestId('hand-card')).toHaveCount(5); await expect(choosing.getByLabel('Your deck: 5 cards', { exact: true })).toBeVisible(); } },
      { spec: 'Turn one begins with 1 Action, 0 Coins, 1 Buy and 1 Worship.', check: async () => expect(await choosing.locator('.resources [data-value]').evaluateAll(icons => icons.map(icon => icon.getAttribute('data-value')))).toEqual(['1', '0', '1', '1']) }
    ]);
    const before = await eventsAt(code), hand = await choosing.locator('.hand [data-serial]').evaluateAll(cards => cards.map(card => card.getAttribute('data-serial')));
    await choosing.reload(); await ready(choosing);
    if (count === 2) expect(await choosing.evaluate(() => (window as unknown as { dealDurations: number[] }).dealDurations)).toEqual([]);
    expect(await choosing.locator('.hand [data-serial]').evaluateAll(cards => cards.map(card => card.getAttribute('data-serial')))).toEqual(hand);
    expect(await eventsAt(code)).toEqual(before);
    if (count === 2) {
      await choosing.getByTestId('hand-card').first().click();
      await steps.step('hand-inspection', 'Read a card in your hand', [{ spec: 'Inspection preserves the physical copy identifier.', check: async () => expect(choosing.getByRole('dialog').locator('[data-serial]')).toHaveAttribute('data-serial', hand[0]!) }]);
      await choosing.keyboard.press('Escape');
      await choosing.getByRole('button', { name: 'Supply', exact: true }).click();
      await steps.step('supply', 'Inspect supply without disturbing the deal', [{ spec: 'The six basics show the unchanged stock, separate from starting cards.', check: async () => expect(choosing.locator('.supply-piles .stock')).toHaveText(['40', '30', '20', '6', '6', '6']) }]);
      await choosing.getByRole('button', { name: 'Actions 2', exact: true }).click(); await expect(choosing.locator('.supply-piles [data-card-id]')).toHaveCount(6);
      await choosing.keyboard.press('Escape');
      await choosing.getByRole('button', { name: 'Chronicle', exact: true }).click(); await expect(choosing.getByRole('dialog')).toContainText('Five cards dealt to each player.'); await choosing.keyboard.press('Escape');
      await choosing.context().setOffline(true); await expect(choosing.getByRole('status')).toContainText('Your place is kept.');
      await choosing.context().setOffline(false); await ready(choosing);
      expect(await eventsAt(code)).toEqual(before);
      const outsider = await browser.newContext({ viewport: info.project.use.viewport, reducedMotion: 'reduce' }); contexts.push(outsider);
      const rejected = await outsider.newPage(); await rejected.goto(page.url());
      const recovery = new TestStepHelper(rejected, info, 'A begun game keeps its seats');
      await recovery.step('started', 'Explain why a late visitor cannot join', [{ spec: 'The invitation names the begun game and offers another table.', check: async () => { await expect(rejected.getByRole('heading', { name: 'This game has already begun.' })).toBeVisible(); await expect(rejected.getByRole('link', { name: 'Find another table' })).toBeVisible(); } }]);
      steps.generateDocs();
    }
    expect(errors).toEqual([]);
  } finally { await Promise.all(contexts.map(context => context.close())); }
});
