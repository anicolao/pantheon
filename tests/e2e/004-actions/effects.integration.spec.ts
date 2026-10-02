import { newPlayerContext } from '../helpers/players';
import { test, expect } from '../helpers/fixtures';
import { actionTable, playCard, readEvents } from '../helpers/action-history';
import { TestStepHelper } from '../helpers/test-step-helper';
import { replaySetup } from '../../../src/lib/game/setup';
import { definition } from '../../../src/lib/game/actions';
import {openPlayers,closePlayers,browseChoice} from '../helpers/table-controls';

test('play, choose optional trash, reconnect, and show the public result',async({page,browser},info)=>{
  test.setTimeout(180_000);
  const context=await newPlayerContext(browser,{viewport:info.project.use.viewport,baseURL:info.project.use.baseURL}),other=await context.newPage();
  const steps=new TestStepHelper(page,info,'Play Actions and shape your deck');
  const capture=(id:string,text:string,check:()=>Promise<unknown>)=>steps.step(id,text,[{spec:text,check}]);
  try{
    const fixture=await actionTable(page,info,'seed-keeper','melia',{other,extra:['hamlet'],seed:'inline-seed-keeper'});
    await capture('action-table','Find Seed Keeper in the playable hand',async()=>expect(page.getByRole('button',{name:/^Play hand card .*Seed Keeper$/})).toBeVisible());
    await page.getByRole('button',{name:/^Play hand card .*Seed Keeper$/}).click({button:'right'});
    await capture('inspect','Read Seed Keeper before playing it',async()=>expect(page.getByRole('button',{name:'Play Seed Keeper',exact:true})).toBeEnabled());
    await page.getByRole('button',{name:'Play Seed Keeper',exact:true}).click();
    await capture('trash-choice','A trash target arrives while the hand stays on the table',async()=>{
      await expect(page.locator('.inline-choice')).toContainText('Choose up to 2 cards to trash');
      await expect(page.locator('dialog:modal')).toHaveCount(0);
      await expect(page.getByRole('button',{name:'Done trashing',exact:true})).toBeEnabled();
    });
    await page.reload();
    await capture('restored','Return to the same unfinished trash choice',async()=>expect(page.locator('.inline-choice')).toContainText('Seed Keeper'));
    const target=page.getByRole('button',{name:/^Trash hand card .*Hamlet$/}).first();
    const id=await target.getAttribute('data-instance-id');await target.click();
    await capture('trash-selected','One Hamlet rests at the trash target; Ariadne may stop early',async()=>{
      await expect(page.locator('.staged-card [data-card-id]')).toHaveAttribute('data-card-id','hamlet');
      await expect(page.getByRole('button',{name:'Done trashing (1)',exact:true})).toBeEnabled();
    });
    await page.context().setOffline(true);
    await steps.step('interrupted','An interrupted connection keeps the staged choice',[{spec:'The reconnect message is visible and no trash is committed.',check:async()=>expect(page.locator('.connection')).toContainText('Your place is kept.')}],{status:'disconnected'});
    await page.context().setOffline(false);
    await capture('reconnected','Reconnect with the same staged Hamlet',async()=>expect(page.getByRole('button',{name:'Done trashing (1)',exact:true})).toBeEnabled());
    await page.getByRole('button',{name:'Done trashing (1)',exact:true}).click();
    await capture('trash-result','The Hamlet enters the trash and Melia draws after the choice',async()=>{
      await expect(page.locator('.inline-choice')).toHaveCount(0);
      await expect(page.locator('.hand [data-card-id]')).toHaveCount(4);
      const state=replaySetup(await readEvents(fixture.code));expect(state.trash.map(card=>card.id)).toEqual([id]);
    });
    await openPlayers(other);
    await steps.step('observer','Theseus sees the public trash result without seeing Ariadne’s hand',[{spec:'The shared trash has one card and opponent hands contain no faces.',check:async()=>{
      await expect(other.getByRole('button',{name:'Inspect shared trash, 1 cards',exact:true})).toBeVisible();
      await expect(other.locator('.opponents [data-card-id]')).toHaveCount(0);
    }}],{page:other,player:'Theseus'});
    await openPlayers(page);await page.getByRole('button',{name:'Inspect shared trash, 1 cards',exact:true}).click();
    await capture('public-trash','Inspect the trashed Hamlet in the Chronicle',async()=>expect(page.locator('.pile [data-card-id]')).toHaveAttribute('data-card-id','hamlet'));
  }finally{await context.close();}
});

test('Forge gains a cheaper card before Doreios offers his separate choice',async({page},info)=>{
  const fixture=await actionTable(page,info,'forge-of-heroes','doreios',{extra:['hamlet'],seed:'inline-forge'});
  const steps=new TestStepHelper(page,info,'Forge a new card');
  const capture=(id:string,text:string,check:()=>Promise<unknown>)=>steps.step(id,text,[{spec:text,check}]);
  await capture('opening','Ariadne holds Forge and a Hamlet to replace',async()=>expect(page.getByRole('button',{name:/^Play hand card .*Forge of Heroes$/})).toBeVisible());
  await playCard(page,'forge-of-heroes');
  await capture('forge-trash','Choose a card from the hand or stop without trashing',async()=>expect(page.getByRole('button',{name:'Done trashing',exact:true})).toBeEnabled());
  await page.getByRole('button',{name:/^Trash hand card .*Hamlet$/}).first().click();
  await capture('gain-choice','Trashing the Hamlet opens the market at its most valuable legal gain',async()=>{
    await expect(page.locator('.inline-choice')).toContainText('up to 4');
    await expect(page.locator('.buy-card[data-centered=true]')).toHaveAttribute('data-supply-id','sea-trade');
  });
  const obol=await browseChoice(page,'Obol');
  await capture('cheaper','A cheaper Obol is also available without spending a Buy',async()=>expect(obol).toBeEnabled());
  await obol.click();
  await capture('leader-choice','Doreios offers his separate optional trash after the gain',async()=>{await expect(page.locator('.inline-choice')).toContainText('Doreios');await expect(page.getByRole('button',{name:'Done trashing',exact:true})).toBeEnabled();});
  await page.getByRole('button',{name:'Done trashing',exact:true}).click();
  await capture('finished','The Forge and blessing finish on the same table',async()=>{await expect(page.locator('.inline-choice')).toHaveCount(0);await expect(page.locator('.resources [data-resource=buys]')).toHaveAttribute('data-value','1');});
  const state=replaySetup(await readEvents(fixture.code));expect(state.trash.at(-1)?.cardId).toBe('hamlet');expect(state.decks[fixture.host].discard.at(-1)?.cardId).toBe('obol');
});

test('Harvest Feast requires a discard after drawing and fits the expanded hand in a fan',async({page},info)=>{
  const fixture=await actionTable(page,info,'harvest-feast','melia',{seed:'inline-harvest'});
  const steps=new TestStepHelper(page,info,'Resolve a mandatory discard');
  await steps.step('opening','Play Harvest Feast from the existing hand',[{spec:'Harvest Feast is playable.',check:async()=>expect(page.getByRole('button',{name:/^Play hand card .*Harvest Feast$/})).toBeVisible()}]);
  const original=await page.getByTestId('hand-card').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-instance-id')));
  await playCard(page,'harvest-feast');
  await steps.step('mandatory-discard','Draw two cards and choose a discard directly from the fan',[{spec:'Six hand cards remain visible beside the discard target, with no skip or modal.',check:async()=>{await expect(page.locator('.hand-slot')).toHaveCount(6);await expect(page.locator('.inline-choice')).toContainText('Discard a card from your hand');await expect(page.getByRole('button',{name:'Done trashing',exact:true})).toHaveCount(0);await expect(page.locator('dialog:modal')).toHaveCount(0);}}]);
  await page.keyboard.press('Escape');await expect(page.locator('.inline-choice')).toBeVisible();
  const drawn=await page.getByTestId('hand-card').evaluateAll((nodes,original)=>nodes.filter(node=>!original.includes(node.getAttribute('data-instance-id'))).map(node=>node.getAttribute('data-instance-id')!),original);
  expect(drawn).toHaveLength(2);
  await page.locator(`[data-testid="hand-card"][data-instance-id="${drawn[0]}"]`).press('Space');
  await steps.step('expanded-hand','The selected card is discarded and Melia draws afterward',[{spec:'The six-card fan remains usable without a separate choice screen.',check:async()=>{await expect(page.locator('.inline-choice')).toHaveCount(0);await expect(page.locator('.hand-slot')).toHaveCount(6);expect(replaySetup(await readEvents(fixture.code)).decks[fixture.host].discard.at(-1)?.id).toBe(drawn[0]);}}]);
  await page.getByTestId('hand-card').last().click({button:'right'});
  await steps.step('last-card','Read the last card in the expanded fan',[{spec:'The card inspector displays the actual card.',check:async()=>expect(page.locator('dialog:modal .inspected [data-card-id]')).toHaveCount(1)}]);
});

for(const reveal of ['Territory','other'] as const)test(`Procession reveals ${reveal} and preserves its proper destination`,async({page},info)=>{
  test.setTimeout(120_000);const fixture=await actionTable(page,info,'victorious-procession','thaleia',{reveal});const steps=new TestStepHelper(page,info,`Reveal ${reveal}`);
  await playCard(page,'victorious-procession');await expect(page.locator('.turn-marker')).toContainText('Treasures');const state=replaySetup(await readEvents(fixture.code));const card=fixture.game.decks[fixture.host].deck[0];
  await steps.step(`reveal-${reveal.toLowerCase()}`,'Read the revealed card and its destination',[{spec:'A Territory goes to discard for +2 Coins; another card returns to the top.',check:async()=>{await expect(page.getByRole('button',{name:`Inspect revealed ${definition(card.cardId).name}`,exact:true})).toBeVisible();expect(state.resources.coins).toBe(reveal==='Territory'?4:2);if(reveal==='other')expect(state.decks[fixture.host].deck[0]).toEqual(card);else expect(state.decks[fixture.host].discard.at(-1)).toEqual(card);}}]);
  await page.reload();await expect(page.locator('[data-status]')).toHaveAttribute('data-status','synced');expect(replaySetup(await readEvents(fixture.code))).toEqual(state);
});

test('every simple Action and Temple uses real authenticated commands',async({browser},info)=>{
  test.skip(info.project.name!=='desktop','The choice stories cover all sizes; the effect matrix shares one desktop runner.');test.setTimeout(240_000);
  for(const [id,leader] of [
    ['oracles-acolyte','thaleia'],['council-of-sages','thaleia'],['sacred-academy','thaleia'],['harbor-pilot','nereon'],['sea-trade','nereon'],['merchant-fleet','nereon'],['bronze-recruit','doreios'],['sacred-grove','melia'],
    ['temple-of-athena','thaleia'],['temple-of-poseidon','nereon'],['temple-of-demeter','melia'],['temple-of-ares','doreios']]){
    const context=await newPlayerContext(browser, {viewport:info.project.use.viewport,baseURL:info.project.use.baseURL,reducedMotion:'reduce'});const page=await context.newPage();
    try { const fixture=await actionTable(page,info,id,leader);
    let lostAcknowledgement=false;
    if(id==='oracles-acolyte'){
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.evaluate(()=>{const animate=Element.prototype.animate;(window as unknown as {draws:string[]}).draws=[];Element.prototype.animate=function(frames,options){if(this.matches('.public-flight[data-motion-kind="draw"]'))(window as unknown as {draws:string[]}).draws.push(this.getAttribute('data-motion-step')!);return animate.call(this,frames,options);};});
      await context.route(url=>url.pathname.endsWith('/documents:commit'),async route=>{if(lostAcknowledgement){await route.continue();return;}const response=await route.fetch({timeout:2_000});expect(response.ok()).toBe(true);lostAcknowledgement=true;await route.abort('connectionreset');});
    }
    await playCard(page,id);
    if(id==='sacred-grove'){await (await browseChoice(page,'Obol')).click();}
    if(leader==='doreios')await page.getByRole('button',{name:'Done trashing',exact:true}).click();
    await expect(page.locator('.inline-choice')).toHaveCount(0);const events=await readEvents(fixture.code),state=replaySetup(events);expect(state.decks[fixture.host].play.at(-1)?.cardId).toBe(id);expect(state.turn.leaderUsed).toBe(true);expect(events.at(-1)?.actorUid).toBe(fixture.host);
    if(id==='oracles-acolyte'){expect(lostAcknowledgement).toBe(true);expect(events.filter(event=>event.type==='action/played'&&event.instanceId===fixture.game.decks[fixture.host].hand.find(card=>card.cardId===id)!.id)).toHaveLength(1);await expect.poll(()=>page.evaluate(()=>(window as unknown as {draws:string[]}).draws.length)).toBe(1);}

    } finally { await context.close(); }
  }
});

for (const count of [3,4] as const) test(`${count} players can follow a public reveal`,async({page},info)=>{
  test.setTimeout(120_000);const fixture=await actionTable(page,info,'victorious-procession','thaleia',{reveal:'Territory',count});
  await playCard(page,'victorious-procession');
  await new TestStepHelper(page,info,`${count}-player Action table`).step(`reveal-${count}`,'Read the effect without covering the other seats',[{spec:'Every opponent and chosen altar remains visible beside the public result.',check:async()=>{await expect(page.getByTestId('opponent')).toHaveCount(count-1);await expect(page.locator('.worship-drawer button')).toHaveCount(count);await expect(page.locator('.outcome')).toBeVisible();await expect(page.locator('.turn-marker')).toContainText('Treasures');expect(replaySetup(await readEvents(fixture.code)).resources.coins).toBe(4);}}]);
});
