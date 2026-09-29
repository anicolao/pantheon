import { test, expect } from '../helpers/fixtures';
import { actionTable, playCard, readEvents } from '../helpers/action-history';
import { TestStepHelper } from '../helpers/test-step-helper';
import { replaySetup } from '../../../src/lib/game/setup';
import { definition } from '../../../src/lib/game/actions';

// Real touch input also exercises Chromium's compatibility click after release.
test('tap to play and hold or right-click to inspect without committing', async ({page}, info) => {
  const fixture = await actionTable(page, info, 'temple-of-athena', 'thaleia');
  const steps = new TestStepHelper(page, info, 'Play directly or inspect deliberately');
  const action = fixture.game.decks[fixture.host].hand.find(card => card.cardId === 'temple-of-athena')!;
  const card = page.locator(`button[data-instance-id="${action.id}"]`);
  // Pointer targeting wins over retained keyboard focus; exactly one face is lit.
  await page.keyboard.press('Tab');
  await card.focus();
  const targets = page.getByTestId('hand-card');
  const lit = () => page.locator('.hand-slot').evaluateAll(nodes=>nodes.filter(node=>getComputedStyle(node).filter!=='none').map(node=>(node as HTMLElement).dataset.instanceId));
  for (let index=0; index<await targets.count(); index++) {
    const target=targets.nth(index);
    await target.hover();
    expect(await lit()).toEqual([await target.getAttribute('data-instance-id')]);
  }
  await page.mouse.move(0,0);
  expect(await lit()).toEqual([action.id]);
  await card.click({button:'right'});
  await steps.step('right-click', 'Right-click to inspect before deciding', [{spec:'Inspection offers Play and leaves the recorded game untouched.', check:async()=>{
    await expect(page.getByRole('button',{name:'Play Temple of Athena',exact:true})).toBeEnabled();
    expect(await readEvents(fixture.code)).toEqual(fixture.events);
  }}]);
  await page.keyboard.press('Escape'); await expect(card).toBeFocused();
  await page.keyboard.press('Shift+F10');
  await expect(page.getByRole('dialog',{name:'Temple of Athena',exact:true})).toBeVisible();
  await page.keyboard.press('Escape'); await expect(card).toBeFocused();
  const touch = await page.context().newCDPSession(page);
  const box = (await card.boundingBox())!, point = {x:box.x+box.width/2,y:box.y+box.height/2};
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await expect(page.getByRole('dialog',{name:'Temple of Athena',exact:true})).toBeVisible();
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await steps.step('long-press', 'Hold a card to inspect it', [{spec:'Releasing a long press keeps the card in hand and does not play it.',check:async()=>{
    await expect(page.getByRole('button',{name:'Play Temple of Athena',exact:true})).toBeEnabled();
    expect(await readEvents(fixture.code)).toEqual(fixture.events);
  }}]);
  await page.keyboard.press('Escape');
  // A moved/cancelled touch must neither inspect nor play.
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x,y:point.y+20}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  expect(await readEvents(fixture.code)).toEqual(fixture.events);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await steps.step('tap-action', 'A quick tap plays the Action immediately', [{spec:'The card enters play once with no confirmation dialog.',check:async()=>{
    await expect(page.locator('.played-cards [data-card-id="temple-of-athena"]')).toBeVisible();
    await expect(page.locator('dialog:modal')).toHaveCount(0);
    await expect(page.locator('.turn-marker')).toContainText('Treasures');
    const events = await readEvents(fixture.code);
    expect(events.slice(fixture.events.length).map(event=>event.type)).toEqual(['action/played','phase/advanced']);
  }}]);
  const before = await readEvents(fixture.code), game = replaySetup(before);
  const treasure = game.decks[fixture.host].hand.find(card=>definition(card.cardId).type==='Treasure')!;
  await page.locator(`button[data-instance-id="${treasure.id}"]`).focus();
  await page.keyboard.press('Enter');
  await steps.step('direct-treasure', 'Play a Treasure straight from Actions', [{spec:'Keyboard activation plays once and advances to Treasures in the same command.',check:async()=>{
    await expect(page.locator('.turn-marker')).toContainText('Treasures');
    await expect(page.locator('dialog:modal')).toHaveCount(0);
    const events = await readEvents(fixture.code);
    expect(events.slice(before.length).map(event=>event.type)).toEqual(['treasure/played']);
    expect(replaySetup(events).decks[fixture.host].play.at(-1)?.id).toBe(treasure.id);
  }}]);
  await touch.detach();
});

test('an expanded fan fits without paging and narrow-screen paging stays clear of Treasures', async ({page}, info) => {
  test.setTimeout(120_000);
  const fixture = await actionTable(page, info, 'sacred-academy', 'thaleia', {extra:['harbor-pilot','council-of-sages'],seed:'expanded-fan'});
  const steps = new TestStepHelper(page, info, 'Keep the whole hand in reach');
  await playCard(page,'sacred-academy');
  await playCard(page,'harbor-pilot');
  await playCard(page,'council-of-sages');
  const state = replaySetup(await readEvents(fixture.code));
  expect(state.decks[fixture.host].hand.length).toBe(8);
  await steps.step('expanded-fan','Draw into an overlapping hand', [{spec:'Eight cards remain in one fan at the standard viewport.',check:async()=>{
    await expect(page.getByTestId('hand-card')).toHaveCount(8);
    await expect(page.getByRole('navigation',{name:'Hand pages'})).toHaveCount(0);
    const bounds = await page.locator('.hand-slot').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().toJSON()));
    expect(bounds[1].x).toBeLessThan(bounds[0].x+bounds[0].width);
  }}]);
  await page.setViewportSize({width:320,height:568});
  await steps.step('fallback-pages','Keep paging separate on the smallest phone', [{spec:'Paging and Play all Treasures have distinct, unobstructed controls.',check:async()=>{
    await expect(page.getByRole('button',{name:'Next hand cards',exact:true})).toBeEnabled();
    await expect(page.getByRole('button',{name:'Play all Treasures',exact:true})).toBeEnabled();
  }}]);
  await page.setViewportSize({width:375,height:568});
  await expect(page.getByRole('navigation',{name:'Hand pages'})).toHaveCount(0);
  await expect(page.getByTestId('hand-card')).toHaveCount(8);
  await page.setViewportSize({width:320,height:568});
  await page.getByRole('button',{name:'Next hand cards',exact:true}).click();
  const last = state.decks[fixture.host].hand.at(-1)!;
  await page.locator(`button[data-instance-id="${last.id}"]`).click({button:'right'});
  await steps.step('last-copy','Inspect the last physical card on the next page',[{spec:'Paging preserves the card identity and optional confirmation.',check:async()=>{
    await expect(page.locator('dialog:modal .inspected [data-card-id]')).toHaveAttribute('data-card-id',last.cardId);
  }}]);
  await page.keyboard.press('Escape');
  const before = await readEvents(fixture.code);
  await page.getByRole('button',{name:'Play all Treasures',exact:true}).click();
  await steps.step('play-all','Play every Treasure across all pages directly from Actions',[{spec:'One atomic command plays all held Treasures, including the hidden page.',check:async()=>{
    await expect(page.locator('.turn-marker')).toContainText('Treasures');
    await expect(page.locator('dialog:modal')).toHaveCount(0);
    const events = await readEvents(fixture.code), after = replaySetup(events);
    expect(events.slice(before.length).map(event=>event.type)).toEqual(['treasures/played']);
    expect(after.decks[fixture.host].hand.every(card=>definition(card.cardId).type!=='Treasure')).toBe(true);
  }}]);
});
