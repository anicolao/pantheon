import { expect, test } from '@playwright/test';
import { actionTable, playCard, readEvents } from '../helpers/action-history';
import { TestStepHelper } from '../helpers/test-step-helper';
import { replaySetup } from '../../../src/lib/game/setup';
import { definition } from '../../../src/lib/game/actions';

test('play, choose optional trash, reconnect, and show the public result', async ({page,browser},info)=>{
  test.setTimeout(180_000);
  const context=await browser.newContext({viewport:info.project.use.viewport,reducedMotion:'reduce'}),other=await context.newPage();
  const errors:string[]=[]; page.on('pageerror',error=>errors.push(error.message)); other.on('pageerror',error=>errors.push(error.message));
  try {
    const fixture=await actionTable(page,info,'seed-keeper','melia',{other});
    const steps=new TestStepHelper(page,info,'Play Actions and shape your deck');
    await steps.step('action-table','Find a playable Action in your hand',[{spec:'Your hand marks playable Actions and keeps the counters in view.',check:async()=>{await expect(page.locator('.hand-slot.playable')).not.toHaveCount(0);await expect(page.locator('.turn-marker')).toContainText('Your turn');}}]);
    const actionIndex=await page.locator('.hand [data-card-id]').evaluateAll(cards=>cards.findIndex(card=>card.getAttribute('data-card-id')==='seed-keeper'));
    await page.getByTestId('hand-card').nth(actionIndex).click();
    await new TestStepHelper(page,info,'Inspect an Action').step('play-action','Inspect before playing',[{spec:'The actual card has a working Play control, with its physical copy preserved.',check:async()=>expect(page.getByRole('button',{name:'Play Seed Keeper',exact:true})).toBeEnabled()}]);
    await page.keyboard.press('Escape');
    await other.emulateMedia({reducedMotion:'no-preference'});
    await other.evaluate(() => {
      const animate=Element.prototype.animate;
      (window as unknown as {flights:number[]}).flights=[];
      Element.prototype.animate=function(frames,options){if(this.matches('.played-cards button,.outcome'))(window as unknown as {flights:number[]}).flights.push(typeof options==='number'?options:Number(options?.duration??0));return animate.call(this,frames,options);};
    });
    await playCard(page,'seed-keeper');
    await steps.step('trash-choice','Choose cards for Seed Keeper',[{spec:'Only cards remaining in hand can be selected; trashing is optional.',check:async()=>{await expect(page.getByRole('dialog',{name:'Seed Keeper',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Trash none',exact:true})).toBeEnabled();await expect(page.locator('.options [data-card-id="seed-keeper"]')).toHaveCount(0);}}]);
    const before=replaySetup(await readEvents(fixture.code));
    await expect(other.locator('.action-message')).toContainText('Ariadne chooses');await expect(other.locator('.opponents [data-card-id]')).toHaveCount(0);
    await page.reload(); await expect(page.getByRole('dialog',{name:'Seed Keeper',exact:true})).toBeVisible();
    expect(replaySetup(await readEvents(fixture.code)).turn.choice).toEqual(before.turn.choice);
    const targets=before.decks[fixture.host].hand.filter(card=>card.cardId==='hamlet').slice(0,2);
    if(!targets.length)targets.push(before.decks[fixture.host].hand[0]);
    for(const card of targets){while(!await page.getByRole('button',{name:`Select ${definition(card.cardId).name}, copy ${card.copy}`,exact:true}).count())await page.getByRole('button',{name:'Next choices',exact:true}).click();await page.getByRole('button',{name:`Select ${definition(card.cardId).name}, copy ${card.copy}`,exact:true}).click();}
    await steps.step('trash-selected','Review the selected cards',[{spec:'The selection glows and the confirmation gives the exact count.',check:async()=>expect(page.getByRole('button',{name:`Trash ${targets.length}`,exact:true})).toBeEnabled()}]);
    await page.context().setOffline(true);await expect(page.locator('.choice-scene .reconnect')).toContainText('Your choice is kept.');
    await page.context().setOffline(false);await expect(page.locator('.choice-scene .reconnect')).toHaveCount(0);
    await expect(page.getByRole('button',{name:`Trash ${targets.length}`,exact:true})).toBeEnabled();
    await expect(page.locator('.choice-scene .pages')).toContainText(`${targets.length} selected`);
    await page.getByRole('button',{name:`Trash ${targets.length}`,exact:true}).click();await expect(page.locator('.choice-scene')).toHaveCount(0);
    const result=replaySetup(await readEvents(fixture.code));expect(result.trash.map(card=>card.id)).toEqual(targets.map(card=>card.id));expect(result.decks[fixture.host].hand.length).toBe(before.decks[fixture.host].hand.length-targets.length+1);
    await steps.step('trash-result','The chosen cards leave your deck',[{spec:'Trash is public and Melia draws only after Seed Keeper finishes.',check:async()=>{await expect(page.getByRole('button',{name:`Inspect shared trash, ${targets.length} cards`,exact:true})).toBeVisible();await expect(other.locator('.action-message')).toContainText('trashed');await expect(other.locator('.opponents [data-card-id]')).toHaveCount(0);}}]);
    await page.getByRole('button',{name:`Inspect shared trash, ${targets.length} cards`,exact:true}).click();await steps.step('public-trash','Inspect the shared trash',[{spec:'Trashed copies are visible and remain outside every player’s deck.',check:async()=>expect(page.getByRole('dialog').locator('[data-card-id]')).toHaveCount(targets.length)}]);
    await page.keyboard.press('Escape'); await expect(page.getByRole('button',{name:`Inspect shared trash, ${targets.length} cards`,exact:true})).toBeFocused();
    await expect.poll(()=>other.evaluate(()=>(window as unknown as {flights:number[]}).flights.filter(value=>value===550).length)).toBe(2);
    await other.reload();await expect(other.locator('[data-status]')).toHaveAttribute('data-status','synced');
    expect(await other.evaluate(()=>document.getAnimations().length)).toBe(0);
    expect(errors).toEqual([]);steps.generateDocs();
  }finally{await context.close();}
});

test('Forge gains a cheaper card before Doreios offers his separate choice',async({page},info)=>{
  test.setTimeout(120_000);const fixture=await actionTable(page,info,'forge-of-heroes','doreios');const steps=new TestStepHelper(page,info,'Forge a new card');
  await playCard(page,'forge-of-heroes');const state=replaySetup(await readEvents(fixture.code));const target=state.decks[fixture.host].hand[0];
  await page.getByRole('button',{name:`Select ${definition(target.cardId).name}, copy ${target.copy}`,exact:true}).click();await page.getByRole('button',{name:'Trash 1',exact:true}).click();
  await steps.step('gain-choice','Choose a replacement within the cost limit',[{spec:'The gain uses actual nonempty supply piles and sends the card to discard.',check:async()=>{await expect(page.locator('.heading')).toContainText(`up to ${definition(target.cardId).cost!+2}`);await expect(page.locator('.destination')).toHaveText('To your discard pile');}}]);
  await page.getByRole('button',{name:'Select Obol, copy 1',exact:true}).click();await steps.step('gain-selected','A cheaper card is a legal gain',[{spec:'A cost-zero Obol can replace the trashed card without spending a Buy.',check:async()=>expect(page.getByRole('button',{name:'Gain Obol',exact:true})).toBeEnabled()}]);
  await page.getByRole('button',{name:'Gain Obol',exact:true}).click();
  await steps.step('leader-choice','Finish Doreios’s blessing',[{spec:'The leader offers a separate optional trash only after the gain.',check:async()=>{await expect(page.locator('.heading h1')).toHaveText('Doreios');await expect(page.getByRole('button',{name:'Trash none',exact:true})).toBeEnabled();}}]);
  await page.getByRole('button',{name:'Trash none',exact:true}).click();await expect(page.locator('.choice-scene')).toHaveCount(0);
  const result=replaySetup(await readEvents(fixture.code));expect(result.supply.obol).toBe(state.supply.obol-1);expect(result.resources.buys).toBe(state.resources.buys);expect(result.turn.leaderUsed).toBe(true);
});

test('Harvest Feast requires a discard after drawing and supports hand paging',async({page},info)=>{
  test.setTimeout(120_000);const fixture=await actionTable(page,info,'harvest-feast','melia');const steps=new TestStepHelper(page,info,'Resolve a mandatory discard');
  const initial=fixture.game.decks[fixture.host];const newlyDrawn=initial.deck.slice(0,2);
  await playCard(page,'harvest-feast');const state=replaySetup(await readEvents(fixture.code));expect(state.decks[fixture.host].hand.length).toBe(initial.hand.length+1);
  await steps.step('mandatory-discard','Draw first, then choose a discard',[{spec:'Discarding one card is required; there is no skip or cancel command.',check:async()=>{await expect(page.locator('.heading')).toContainText('Discard 1 card');await expect(page.getByRole('button',{name:'Trash none'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Discard 0',exact:true})).toBeDisabled();}}]);
  await page.keyboard.press('Escape');await expect(page.locator('.choice-scene')).toBeVisible();
  const card=newlyDrawn.at(-1) ?? state.decks[fixture.host].hand.at(-1)!;
  while(!await page.getByRole('button',{name:`Select ${definition(card.cardId).name}, copy ${card.copy}`,exact:true}).count())await page.getByRole('button',{name:'Next choices',exact:true}).click();
  await page.getByRole('button',{name:`Select ${definition(card.cardId).name}, copy ${card.copy}`,exact:true}).focus();await page.keyboard.press('Space');
  await steps.step('discard-selected','A just-drawn card can be discarded',[{spec:'Keyboard selection marks the card and enables the mandatory discard.',check:async()=>expect(page.getByRole('button',{name:'Discard 1',exact:true})).toBeEnabled()}]);
  await page.getByRole('button',{name:'Discard 1',exact:true}).click();await expect(page.locator('.choice-scene')).toHaveCount(0);
  await steps.step('expanded-hand','Melia’s draw follows the discard',[{spec:'A hand larger than five has reachable pages with no overlapping controls.',check:async()=>{await expect(page.getByRole('button',{name:'Next hand cards',exact:true})).toBeEnabled();await expect(page.locator('.hand [data-card-id]')).toHaveCount(5);}}]);
  await page.getByRole('button',{name:'Next hand cards',exact:true}).click();await steps.step('hand-last-page','Inspect the end of the expanded hand',[{spec:'The last page is bounded, and the first page remains reachable.',check:async()=>{await expect(page.getByRole('button',{name:'Next hand cards',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Previous hand cards',exact:true})).toBeEnabled();}}]);
});

for(const reveal of ['Territory','other'] as const)test(`Procession reveals ${reveal} and preserves its proper destination`,async({page},info)=>{
  test.setTimeout(120_000);const fixture=await actionTable(page,info,'victorious-procession','thaleia',{reveal});const steps=new TestStepHelper(page,info,`Reveal ${reveal}`);
  await playCard(page,'victorious-procession');const state=replaySetup(await readEvents(fixture.code));const card=fixture.game.decks[fixture.host].deck[0];
  await steps.step(`reveal-${reveal.toLowerCase()}`,'Read the revealed card and its destination',[{spec:'A Territory goes to discard for +2 Coins; another card returns to the top.',check:async()=>{await expect(page.getByRole('button',{name:`Inspect revealed ${definition(card.cardId).name}`,exact:true})).toBeVisible();expect(state.resources.coins).toBe(reveal==='Territory'?4:2);if(reveal==='other')expect(state.decks[fixture.host].deck[0]).toEqual(card);else expect(state.decks[fixture.host].discard.at(-1)).toEqual(card);}}]);
  await page.reload();await expect(page.locator('[data-status]')).toHaveAttribute('data-status','synced');expect(replaySetup(await readEvents(fixture.code))).toEqual(state);
});

test('every simple Action and Temple uses real authenticated commands',async({browser},info)=>{
  test.skip(info.project.name!=='desktop','The choice stories cover all sizes; the effect matrix shares one desktop runner.');test.setTimeout(240_000);
  for(const [id,leader] of [
    ['oracles-acolyte','thaleia'],['council-of-sages','thaleia'],['sacred-academy','thaleia'],['harbor-pilot','nereon'],['sea-trade','nereon'],['merchant-fleet','nereon'],['bronze-recruit','doreios'],['sacred-grove','melia'],
    ['temple-of-athena','thaleia'],['temple-of-poseidon','nereon'],['temple-of-demeter','melia'],['temple-of-ares','doreios']]){
    const context=await browser.newContext({viewport:info.project.use.viewport,baseURL:info.project.use.baseURL,reducedMotion:'reduce'});const page=await context.newPage();
    try { const fixture=await actionTable(page,info,id,leader);
    let lostAcknowledgement=false;
    if(id==='oracles-acolyte'){
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.evaluate(()=>{const animate=Element.prototype.animate;(window as unknown as {draws:number[]}).draws=[];Element.prototype.animate=function(frames,options){if(this.matches('.hand-slot'))(window as unknown as {draws:number[]}).draws.push(typeof options==='number'?options:Number(options?.duration??0));return animate.call(this,frames,options);};});
      await context.route(url=>url.pathname.endsWith('/documents:commit'),async route=>{if(lostAcknowledgement){await route.continue();return;}const response=await route.fetch();expect(response.ok()).toBe(true);lostAcknowledgement=true;await route.abort('connectionreset');});
    }
    await playCard(page,id);
    if(id==='sacred-grove'){await page.getByRole('button',{name:'Select Obol, copy 1',exact:true}).click();await page.getByRole('button',{name:'Gain Obol',exact:true}).click();}
    if(leader==='doreios')await page.getByRole('button',{name:'Trash none',exact:true}).click();
    await expect(page.locator('.choice-scene')).toHaveCount(0);const events=await readEvents(fixture.code),state=replaySetup(events);expect(state.decks[fixture.host].play.at(-1)?.cardId).toBe(id);expect(state.turn.leaderUsed).toBe(true);expect(events.at(-1)?.actorUid).toBe(fixture.host);
    if(id==='oracles-acolyte'){expect(lostAcknowledgement).toBe(true);expect(events.filter(event=>event.type==='action/played'&&event.instanceId===fixture.game.decks[fixture.host].hand.find(card=>card.cardId===id)!.id)).toHaveLength(1);await expect.poll(()=>page.evaluate(()=>(window as unknown as {draws:number[]}).draws.filter(value=>value===550).length)).toBe(1);}

    } finally { await context.close(); }
  }
});

for (const count of [3,4] as const) test(`${count} players can follow a public reveal`,async({page},info)=>{
  test.setTimeout(120_000);const fixture=await actionTable(page,info,'victorious-procession','thaleia',{reveal:'Territory',count});
  await playCard(page,'victorious-procession');
  await new TestStepHelper(page,info,`${count}-player Action table`).step(`reveal-${count}`,'Read the effect without covering the other seats',[{spec:'Every opponent and chosen altar remains visible beside the public result.',check:async()=>{await expect(page.getByTestId('opponent')).toHaveCount(count-1);await expect(page.locator('.altars button')).toHaveCount(count);await expect(page.locator('.outcome')).toBeVisible();expect(replaySetup(await readEvents(fixture.code)).resources.coins).toBe(4);}}]);
});
