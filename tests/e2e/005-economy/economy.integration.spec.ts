import {test,expect} from '../helpers/fixtures';
import type {Page} from '@playwright/test';
import {TestStepHelper} from '../helpers/test-step-helper';
import {actionTable,readEvents,playCard} from '../helpers/action-history';
import {replaySetup} from '../../../src/lib/game/setup';
// Used only by the recorded-history integration scenarios below.
async function advance(page:Page,name:string){
  const before=await page.locator('.turn-marker').textContent();await page.getByRole('button',{name,exact:true}).click();
  await expect.poll(async()=>await page.getByRole('button',{name:'Keep playing',exact:true}).isVisible()||await page.locator('.turn-marker').textContent()!==before).toBe(true);
  if(await page.getByRole('button',{name:'Keep playing',exact:true}).isVisible())await page.getByRole('dialog').getByRole('button',{name,exact:true}).click();
  await expect(page.locator('.turn-marker')).not.toHaveText(before!);
}

test('retain Treasures deliberately and spend multiple Buys including a zero-cost card',async({page},info)=>{
  test.setTimeout(120_000);const fixture=await actionTable(page,info,'sea-trade','thaleia');await playCard(page,'sea-trade');await advance(page,'To Treasures');
  const beforeEvents=await readEvents(fixture.code),state=replaySetup(beforeEvents),remaining=state.decks[fixture.host].hand.length;
  await page.getByRole('button',{name:'End turn',exact:true}).click();await expect(page.getByRole('button',{name:'Keep playing',exact:true})).toBeVisible();
  const steps=new TestStepHelper(page,info,'Retain wealth and choose your purchases');await steps.step('leave-treasures','Confirm leaving playable Treasures',[{spec:'Keep playing returns to the same hand without an event.',check:async()=>expect(page.getByRole('dialog')).toContainText('You can still play')}]);
  await page.getByRole('button',{name:'Keep playing',exact:true}).click();expect((await readEvents(fixture.code)).length).toBe(beforeEvents.length);
  expect(replaySetup(await readEvents(fixture.code)).decks[fixture.host].hand.length).toBe(remaining);
  await page.getByRole('button',{name:'Supply',exact:true}).click();await page.getByRole('button',{name:'Select Hamlet, 6 remaining',exact:true}).click();await page.getByRole('button',{name:'Buy Hamlet',exact:true}).click();await expect(page.locator('.wallet [data-resource=coins]')).toHaveAttribute('data-value','0');
  await page.getByRole('button',{name:/^Select Obol,/}).click();await expect(page.getByRole('button',{name:'Buy Obol',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Buy Obol',exact:true}).click();await expect(page.locator('.wallet [data-resource=buys]')).toHaveAttribute('data-value','0');await expect(page.locator('.reason')).toHaveText('No Buys remaining.');
  await page.getByRole('button',{name:'‹ Table',exact:true}).click();await expect(page.getByRole('button',{name:'End turn',exact:true})).toBeEnabled();const before=replaySetup(await readEvents(fixture.code));expect(before.turn.phase).toBe('buys');expect(before.decks[fixture.host].hand.length).toBe(remaining);await advance(page,'End turn');
  const after=replaySetup(await readEvents(fixture.code));expect(after.turn.turns[fixture.host]).toBe((before.turn.turns[fixture.host]??0)+1);expect(after.decks[fixture.host].play).toHaveLength(0);
});


test('empty piles stay inspectable and optional Action departure can be cancelled',async({page},info)=>{
  test.setTimeout(120_000);const fixture=await actionTable(page,info,'temple-of-athena','thaleia',{empty:'obol'});
  const before=await readEvents(fixture.code);await page.getByRole('button',{name:'To Treasures',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('You can still play');await page.getByRole('button',{name:'Keep playing',exact:true}).click();expect(await readEvents(fixture.code)).toEqual(before);
  await advance(page,'To Treasures');await page.getByRole('button',{name:'Play all Treasures',exact:true}).click();await page.getByRole('button',{name:'Supply',exact:true}).click();
  await new TestStepHelper(page,info,'Inspect exhausted supply').step('empty-pile','An empty pile remains visible',[{spec:'The card is inspectable but its Buy control explains that the pile is empty.',check:async()=>{await expect(page.getByRole('button',{name:'Select Obol, 0 remaining',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Buy Obol',exact:true})).toBeDisabled();await expect(page.locator('.reason')).toHaveText('This pile is empty.');}}]);
  await page.getByRole('button',{name:'Inspect Obol',exact:true}).click();await expect(page.getByRole('dialog',{name:'Obol',exact:true})).toBeVisible();await page.keyboard.press('Escape');await page.getByRole('button',{name:'‹ Table',exact:true}).click();
  await page.getByRole('button',{name:'End turn',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('You can still buy');await page.getByRole('button',{name:'Keep playing',exact:true}).click();await expect(page.locator('.turn-marker')).toContainText('Treasures');
});

test('a lost purchase acknowledgement does not duplicate the card or its animation',async({page},info)=>{
  const fixture=await actionTable(page,info,'temple-of-athena','thaleia');
  await advance(page,'To Treasures');await page.getByRole('button',{name:'Play all Treasures',exact:true}).click();
  await page.getByRole('button',{name:'Supply',exact:true}).click();
  const before=replaySetup(await readEvents(fixture.code)),steps=new TestStepHelper(page,info,'Recover a purchase');
  await steps.step('before-purchase','Choose a supply card',[{spec:'Obol can be bought with one remaining Buy.',check:async()=>expect(page.getByRole('button',{name:'Buy Obol',exact:true})).toBeEnabled()}]);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{const animate=Element.prototype.animate;(window as unknown as {gains:number[]}).gains=[];Element.prototype.animate=function(frames,options){if(this.matches('.gained'))(window as unknown as {gains:number[]}).gains.push(typeof options==='number'?options:Number(options?.duration??0));return animate.call(this,frames,options);};});
  let dropped=false;
  await page.context().route(url=>url.pathname.endsWith('/documents:commit'),async route=>{if(dropped){await route.continue();return;}const response=await route.fetch({timeout:2000});expect(response.ok()).toBe(true);dropped=true;await route.abort('connectionreset');});
  await page.getByRole('button',{name:'Buy Obol',exact:true}).click();
  await steps.step('purchase-recovered','Receive exactly one card after an interrupted acknowledgement',[{spec:'Stock and Buy each decrease once and the destination remains discard.',check:async()=>{await expect(page.locator('.wallet [data-resource=buys]')).toHaveAttribute('data-value','0');await expect(page.getByRole('button',{name:`Select Obol, ${before.supply.obol-1} remaining`,exact:true})).toBeVisible();}}]);
  expect(dropped).toBe(true);
  const events=await readEvents(fixture.code),after=replaySetup(events);
  expect(events.filter(event=>event.type==='card/bought')).toHaveLength(1);expect(after.decks[fixture.host].discard.length).toBe(before.decks[fixture.host].discard.length+1);
  if(info.project.name!=='phone')expect(await page.evaluate(()=>(window as unknown as {gains:number[]}).gains.filter(duration=>duration===550).length)).toBe(1);
  await page.reload();
  await steps.step('purchase-restored','Return to the same turn with the purchased card kept',[{spec:'Returning does not spend another Buy.',check:async()=>expect(page.locator('.resources [data-resource=buys]')).toHaveAttribute('data-value','0')}]);
  expect(await readEvents(fixture.code)).toEqual(events);expect(await page.evaluate(()=>document.getAnimations().length)).toBe(0);
});


test('departure reminders name the most valuable playable Action and Treasure',async({page},info)=>{
  await actionTable(page,info,'council-of-sages','thaleia',{extra:['oracles-acolyte','drachma']});
  const steps=new TestStepHelper(page,info,'Keep the strongest remaining play in view');
  await page.getByRole('button',{name:'To Treasures',exact:true}).click();
  await steps.step('valuable-action','The reminder names Council of Sages instead of the cheaper Acolyte',[{spec:'The highest-cost playable Action is named.',check:async()=>expect(page.getByRole('dialog')).toContainText('You can still play Council of Sages.')}]);
  await page.getByRole('button',{name:'Keep playing',exact:true}).click();
  await page.getByRole('button',{name:'To Treasures',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'To Treasures',exact:true}).click();
  await expect(page.getByRole('button',{name:'To Buys',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'End turn',exact:true}).click();
  await steps.step('valuable-treasure','The reminder names the most valuable unplayed Treasure',[{spec:'Drachma is offered before ending the turn.',check:async()=>expect(page.getByRole('dialog')).toContainText('You can still play Drachma.')}]);
  await page.getByRole('button',{name:'Keep playing',exact:true}).click();
  await page.getByRole('button',{name:'Play all Treasures',exact:true}).click();
  await page.getByRole('button',{name:'Supply',exact:true}).click();
  await steps.step('direct-purchase','Treasure play leads directly to an available purchase',[{spec:'Buy is enabled without a separate phase transition.',check:async()=>expect(page.getByRole('button',{name:'Buy Obol',exact:true})).toBeEnabled()}]);
  await page.getByRole('button',{name:'Buy Obol',exact:true}).click();
  await page.getByRole('button',{name:'‹ Table',exact:true}).click();
  await steps.step('purchase-closes-treasures','The first purchase closes Treasure play automatically',[{spec:'The table shows Buys and no Treasure-play control.',check:async()=>{await expect(page.locator('.turn-marker')).toContainText('Buys');await expect(page.getByRole('button',{name:'Play all Treasures',exact:true})).toHaveCount(0);}}]);
});
