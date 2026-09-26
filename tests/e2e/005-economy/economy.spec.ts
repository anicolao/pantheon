import { test, expect, type Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
import { roomCodeFixture } from '../helpers/room-code-fixture';
import { actionTable, readEvents, playCard } from '../helpers/action-history';
import { replaySetup } from '../../../src/lib/game/setup';
import { activePlayer } from '../../../src/lib/game/actions';

async function advance(page:Page, name:string) {
  const before=await page.locator('.turn-marker').textContent();
  await page.getByRole('button',{name,exact:true}).click();
  await expect.poll(async()=>await page.getByRole('button',{name:'Keep playing',exact:true}).isVisible() || await page.locator('.turn-marker').textContent()!==before).toBe(true);
  if(await page.getByRole('button',{name:'Keep playing',exact:true}).isVisible())await page.getByRole('dialog').getByRole('button',{name,exact:true}).click();
  await expect(page.locator('.turn-marker')).not.toHaveText(before!);
}

test('buy an Action from an opening hand, pass turns, draw and play the purchased copy',async({page,browser},info)=>{
  test.setTimeout(240_000);
  const context=await browser.newContext({viewport:info.project.use.viewport,reducedMotion:'reduce'}),other=await context.newPage();
  const errors:string[]=[];for(const client of [page,other])client.on('pageerror',error=>errors.push(error.message));
  try {
    const code=await roomCodeFixture(page,info);
    await page.goto('./play/');await page.getByLabel('Your name',{exact:true}).fill('Ariadne');await page.getByRole('button',{name:'Create table',exact:true}).click();await expect(page.getByTestId('player-seat')).toHaveCount(1);
    await other.goto(page.url());await other.getByLabel('Your name',{exact:true}).fill('Theseus');await other.getByRole('button',{name:'Join table',exact:true}).click();await expect(page.getByTestId('player-seat')).toHaveCount(2);await page.getByRole('button',{name:'Begin',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Choose your Bloodline'})).toBeVisible();
    const clients:Record<string,Page>={};let state=replaySetup(await readEvents(code));clients[state.players[0].uid]=page;clients[state.players[1].uid]=other;
    for(const uid of state.draftOrder){const client=clients[uid],name=uid===state.turnOrder[0]?'Thaleia':'Nereon';await expect(client.getByText('Your choice',{exact:true})).toBeVisible();await client.getByRole('button',{name:`View ${name}`,exact:true}).click();await client.getByRole('button',{name:`Choose ${name}`,exact:true}).click();}
    await expect(page.locator('.hand [data-card-id]')).toHaveCount(5);
    state=replaySetup(await readEvents(code));const buyer=activePlayer(state),first=clients[buyer],observer=clients[state.turnOrder[1]];
    const steps=new TestStepHelper(first,info,'Earn Coins, buy a card, and play it on a later turn');
    await expect(first.locator('.hand [data-card-id]')).toHaveCount(5);
    await advance(first,'To Treasures');
    await steps.step('treasures','Play wealth from your opening hand',[{spec:'The Treasure phase is reachable without playing an Action.',check:async()=>{await expect(first.locator('.turn-marker')).toContainText('Treasures');await expect(first.getByRole('button',{name:'Play all Treasures',exact:true})).toBeEnabled();}}]);
    const index=await first.locator('.hand [data-card-id]').evaluateAll(cards=>cards.findIndex(card=>card.getAttribute('data-card-id')==='obol'));
    await first.getByTestId('hand-card').nth(index).click();await first.getByRole('button',{name:'Play Obol',exact:true}).click();await expect(first.locator('.resources [data-resource=coins]')).toHaveAttribute('data-value','1');
    if(await first.getByRole('button',{name:'Play all Treasures',exact:true}).count())await first.getByRole('button',{name:'Play all Treasures',exact:true}).click();
    await advance(first,'To Buys');await first.getByRole('button',{name:'Supply',exact:true}).click();
    await steps.step('basics','Choose among actual supply piles',[{spec:'Stock, available Coins and Buys remain visible; buying is a separate action.',check:async()=>{await expect(first.locator('.supply-scene .stock')).toHaveText(['40','30','20','6','6','6']);await expect(first.getByRole('button',{name:'Buy Obol',exact:true})).toBeEnabled();}}]);
    await first.getByRole('button',{name:'Select Acropolis, 6 remaining',exact:true}).click();await expect(first.getByRole('button',{name:'Buy Acropolis',exact:true})).toBeDisabled();await expect(first.locator('.reason')).toContainText('more Coins');
    await first.getByRole('button',{name:'Actions 1',exact:true}).click();
    await first.getByRole('button',{name:'Select Oracle’s Acolyte, 8 remaining',exact:true}).click();
    state=replaySetup(await readEvents(code));expect(state.resources.coins).toBeGreaterThanOrEqual(2);
    await steps.step('action-purchase','Inspect the Action before buying',[{spec:'The selected Action shows its Coin cost, one Buy, and discard destination.',check:async()=>{await expect(first.getByRole('button',{name:'Buy Oracle’s Acolyte',exact:true})).toBeEnabled();await expect(first.locator('.reason')).toHaveText('To your discard pile');}}]);
    await first.getByRole('button',{name:'Inspect Oracle’s Acolyte',exact:true}).click();await expect(first.getByRole('dialog',{name:'Oracle’s Acolyte',exact:true})).toBeVisible();await first.getByRole('button',{name:'Back to supply',exact:true}).click();
    await first.emulateMedia({reducedMotion:'no-preference'});await first.evaluate(()=>{const animate=Element.prototype.animate;(window as unknown as {gains:number[]}).gains=[];Element.prototype.animate=function(frames,options){if(this.matches('.gained'))(window as unknown as {gains:number[]}).gains.push(typeof options==='number'?options:Number(options?.duration??0));return animate.call(this,frames,options);};});
    let dropped=false;await first.context().route(url=>url.pathname.endsWith('/documents:commit'),async route=>{if(dropped){await route.continue();return;}const response=await route.fetch();expect(response.ok()).toBe(true);dropped=true;await route.abort('connectionreset');});
    await first.getByRole('button',{name:'Buy Oracle’s Acolyte',exact:true}).click();await expect(first.locator('.destination')).toContainText('Discard · 1');
    await steps.step('purchased','The new copy goes to your discard',[{spec:'The pile loses one copy, one Buy is spent, and inspection retains its physical number.',check:async()=>{await expect(first.getByRole('button',{name:'Select Oracle’s Acolyte, 7 remaining',exact:true})).toBeVisible();await expect(first.locator('.wallet [data-resource=buys]')).toHaveAttribute('data-value','0');await expect(first.locator('.reason')).toHaveText('No Buys remaining.');}}]);
    if(info.project.name!=='phone')await expect.poll(()=>first.evaluate(()=>(window as unknown as {gains:number[]}).gains.filter(value=>value===550).length)).toBe(1);await first.emulateMedia({reducedMotion:'reduce'});
    const boughtEvents=await readEvents(code);expect(boughtEvents.filter(event=>event.type==='card/bought')).toHaveLength(1);expect(dropped).toBe(true);
    await expect(observer.locator('.outcome [data-card-id]')).toHaveAttribute('data-card-id','oracles-acolyte');await expect(observer.locator('.opponents [data-card-id]')).toHaveCount(0);
    await first.getByRole('button',{name:'‹ Table',exact:true}).click();await advance(first,'End turn');
    await steps.step('handoff','The next player receives the turn',[{spec:'Cleanup draws five and resets resources; only the active player can advance.',check:async()=>{await expect(first.locator('.hand [data-card-id]')).toHaveCount(5);await expect(first.getByRole('button',{name:'To Treasures',exact:true})).toHaveCount(0);await expect(observer.getByRole('button',{name:'To Treasures',exact:true})).toBeEnabled();}}]);
    let played=false;
    for(let turn=0;turn<12;turn++){
      state=replaySetup(await readEvents(code));const uid=activePlayer(state),client=clients[uid];await expect(client.getByRole('button',{name:'To Treasures',exact:true})).toBeVisible();
      if(uid===buyer && state.decks[uid].hand.some(card=>card.cardId==='oracles-acolyte')){await playCard(client,'oracles-acolyte');played=true;break;}
      await advance(client,'To Treasures');if(await client.getByRole('button',{name:'Play all Treasures',exact:true}).count())await client.getByRole('button',{name:'Play all Treasures',exact:true}).click();await advance(client,'To Buys');await advance(client,'End turn');
    }
    expect(played).toBe(true);await steps.step('purchased-action-played','Play the Action you bought',[{spec:'A real cleanup and seeded reshuffle brought the purchased copy into hand.',check:async()=>{await expect(first.locator('.played-cards [data-card-id]')).toHaveAttribute('data-card-id','oracles-acolyte');const final=replaySetup(await readEvents(code));expect(final.decks[buyer].play[0].id).toBe('supply-oracles-acolyte-1');expect(final.turn.shuffles[buyer]).toBeGreaterThan(0);}}]);
    const before=replaySetup(await readEvents(code));await first.reload();await expect(first.locator('[data-status]')).toHaveAttribute('data-status','synced');expect(replaySetup(await readEvents(code))).toEqual(before);expect(errors).toEqual([]);steps.generateDocs();
  }finally{await context.close();}
});

test('retain Treasures deliberately and spend multiple Buys including a zero-cost card',async({page},info)=>{
  test.setTimeout(120_000);const fixture=await actionTable(page,info,'sea-trade','thaleia');await playCard(page,'sea-trade');await advance(page,'To Treasures');
  const beforeEvents=await readEvents(fixture.code),state=replaySetup(beforeEvents),remaining=state.decks[fixture.host].hand.length;
  await page.getByRole('button',{name:'To Buys',exact:true}).click();await expect(page.getByRole('button',{name:'Keep playing',exact:true})).toBeVisible();
  const steps=new TestStepHelper(page,info,'Retain wealth and choose your purchases');await steps.step('leave-treasures','Confirm leaving playable Treasures',[{spec:'Keep playing returns to the same hand without an event.',check:async()=>expect(page.getByRole('dialog')).toContainText('You can still play')}]);
  await page.getByRole('button',{name:'Keep playing',exact:true}).click();expect((await readEvents(fixture.code)).length).toBe(beforeEvents.length);
  await advance(page,'To Buys');expect(replaySetup(await readEvents(fixture.code)).decks[fixture.host].hand.length).toBe(remaining);
  await page.getByRole('button',{name:'Supply',exact:true}).click();await page.getByRole('button',{name:'Select Hamlet, 6 remaining',exact:true}).click();await page.getByRole('button',{name:'Buy Hamlet',exact:true}).click();await expect(page.locator('.wallet [data-resource=coins]')).toHaveAttribute('data-value','0');
  await page.getByRole('button',{name:/^Select Obol,/}).click();await expect(page.getByRole('button',{name:'Buy Obol',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Buy Obol',exact:true}).click();await expect(page.locator('.wallet [data-resource=buys]')).toHaveAttribute('data-value','0');await expect(page.locator('.reason')).toHaveText('No Buys remaining.');
  await page.getByRole('button',{name:'‹ Table',exact:true}).click();await expect(page.getByRole('button',{name:'End turn',exact:true})).toBeEnabled();const before=replaySetup(await readEvents(fixture.code));expect(before.turn.phase).toBe('buys');expect(before.decks[fixture.host].hand.length).toBe(remaining);await advance(page,'End turn');
  const after=replaySetup(await readEvents(fixture.code));expect(after.turn.turns[fixture.host]).toBe((before.turn.turns[fixture.host]??0)+1);expect(after.decks[fixture.host].play).toHaveLength(0);
});


test('empty piles stay inspectable and optional Action departure can be cancelled',async({page},info)=>{
  test.setTimeout(120_000);const fixture=await actionTable(page,info,'temple-of-athena','thaleia',{empty:'obol'});
  const before=await readEvents(fixture.code);await page.getByRole('button',{name:'To Treasures',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('You can still play');await page.getByRole('button',{name:'Keep playing',exact:true}).click();expect(await readEvents(fixture.code)).toEqual(before);
  await advance(page,'To Treasures');await page.getByRole('button',{name:'Play all Treasures',exact:true}).click();await advance(page,'To Buys');await page.getByRole('button',{name:'Supply',exact:true}).click();
  await new TestStepHelper(page,info,'Inspect exhausted supply').step('empty-pile','An empty pile remains visible',[{spec:'The card is inspectable but its Buy control explains that the pile is empty.',check:async()=>{await expect(page.getByRole('button',{name:'Select Obol, 0 remaining',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Buy Obol',exact:true})).toBeDisabled();await expect(page.locator('.reason')).toHaveText('This pile is empty.');}}]);
  await page.getByRole('button',{name:'Inspect Obol',exact:true}).click();await expect(page.getByRole('dialog',{name:'Obol',exact:true})).toBeVisible();await page.keyboard.press('Escape');await page.getByRole('button',{name:'‹ Table',exact:true}).click();
  await page.getByRole('button',{name:'End turn',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('You can still buy');await page.getByRole('button',{name:'Keep playing',exact:true}).click();await expect(page.locator('.turn-marker')).toContainText('Buys');
});
