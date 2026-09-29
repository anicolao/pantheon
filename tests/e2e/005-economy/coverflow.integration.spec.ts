import {test,expect} from '../helpers/fixtures';
import {actionTable,playCard,readEvents} from '../helpers/action-history';
import {TestStepHelper} from '../helpers/test-step-helper';
import {replaySetup,setupSupply} from '../../../src/lib/game/setup';
import {definition,purchaseReason} from '../../../src/lib/game/actions';

test('buy from one cost-sorted coverflow and warn before skipping playable Actions',async({page},info)=>{
  const fixture=await actionTable(page,info,'temple-of-athena','thaleia');
  const steps=new TestStepHelper(page,info,'Browse and buy directly');
  await page.getByRole('button',{name:'Supply',exact:true}).click();
  await steps.step('supply','A single supply opens at the affordable edge',[{spec:'Obol is directly purchasable and separate supply pages are gone.',check:async()=>{await expect(page.getByRole('button',{name:'Buy Obol',exact:true})).toBeEnabled();await expect(page.getByRole('navigation',{name:'Supply pages'})).toHaveCount(0);}}]);
  const touch=await page.context().newCDPSession(page);
  const box=(await page.getByRole('button',{name:'Buy Obol',exact:true}).boundingBox())!;
  const point={x:box.x+box.width/2,y:box.y+box.height/2};
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x-60,y:point.y}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(page.locator('.slot:not(.wing)')).toHaveCount(2);
  expect(await readEvents(fixture.code)).toEqual(fixture.events);
  await page.getByRole('button',{name:'Cheaper cards',exact:true}).click();
  await touch.detach();
  await page.getByRole('button',{name:'Buy Obol',exact:true}).click();
  await steps.step('warning','Buying warns about a playable Action',[{spec:'The warning names the remaining Action and commits no purchase.',check:async()=>{await expect(page.getByRole('dialog',{name:'Skip playable Actions?'})).toContainText('Temple of Athena');expect(await readEvents(fixture.code)).toEqual(fixture.events);}}]);
  await page.getByRole('button',{name:'Keep playing',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Skip playable Actions?'})).not.toBeVisible();
  await page.getByRole('button',{name:'Buy Obol',exact:true}).click();
  await page.getByRole('button',{name:'Buy Obol now',exact:true}).click();
  await steps.step('bought','Confirming buys once and closes Action play',[{spec:'One purchase enters Buys and leaves the unplayed Action in hand.',check:async()=>{await expect(page.locator('.wallet [data-resource=buys]')).toHaveAttribute('data-value','0');const events=await readEvents(fixture.code);expect(events.slice(fixture.events.length).map(event=>event.type)).toEqual(['card/bought']);expect(replaySetup(events).turn.phase).toBe('buys');}}]);
  if(info.project.name==='phone'){
    await page.setViewportSize({width:852,height:393});
    await page.getByRole('button',{name:'More expensive cards',exact:true}).click();
    await page.getByRole('button',{name:'More expensive cards',exact:true}).click();
    await steps.step('landscape','Browse the supply on a short landscape phone',[{spec:'Three face-up cards and their stock fit above navigation, status, and discard.',check:async()=>{await expect(page.locator('.slot:not(.wing)')).toHaveCount(3);await expect(page.getByRole('button',{name:'‹ Table',exact:true})).toBeVisible();}}]);
    await page.setViewportSize({width:568,height:320});
    await steps.step('small-landscape','Browse the supply on the shortest phone',[{spec:'Cards, navigation and help remain readable at 568 by 320.',check:async()=>{await expect(page.locator('.slot:not(.wing)')).toHaveCount(3);const help=(await page.locator('.help').boundingBox())!,discard=(await page.locator('.destination').boundingBox())!,wallet=(await page.locator('.wallet').boundingBox())!,back=(await page.locator('.supply-scene .back').boundingBox())!;expect(discard.y).toBeGreaterThanOrEqual(help.y+help.height);expect(wallet.y).toBeGreaterThanOrEqual(back.y+back.height);}}]);
  }
});

test('finish choices before automatically entering Treasures and browse every supply cost',async({page},info)=>{
  const fixture=await actionTable(page,info,'seed-keeper','melia',{extra:['sea-trade']});
  const steps=new TestStepHelper(page,info,'Finish Actions automatically');
  await playCard(page,'seed-keeper');
  await steps.step('choice','The last Action still completes its choice',[{spec:'The optional trash remains open before automatic advancement.',check:async()=>{await expect(page.getByRole('button',{name:'Trash none',exact:true})).toBeEnabled();expect(replaySetup(await readEvents(fixture.code)).turn.phase).toBe('actions');}}]);
  await page.getByRole('button',{name:'Trash none',exact:true}).click();
  await steps.step('treasures','The resolved Action automatically enters Treasures',[{spec:'No phase button or prompt is needed, and the transition is recorded once.',check:async()=>{await expect(page.locator('.turn-marker')).toContainText('Treasures');await expect(page.locator('.hand [data-card-id="sea-trade"]')).toHaveCount(1);await expect(page.locator('.resources [data-resource=actions]')).toHaveAttribute('data-value','0');expect((await readEvents(fixture.code)).slice(fixture.events.length).filter(event=>event.type==='phase/advanced')).toHaveLength(1);}}]);
  await page.getByRole('button',{name:'Play all Treasures',exact:true}).click();
  await expect(page.locator('.hand [data-card-id="obol"]')).toHaveCount(0);
  await page.getByRole('button',{name:'Supply',exact:true}).click();
  const state=replaySetup(await readEvents(fixture.code));
  const piles=setupSupply(state.playerCount).sort((a,b)=>(definition(a.id).cost??0)-(definition(b.id).cost??0)||a.id.localeCompare(b.id));
  const best=piles.findLast(pile=>!purchaseReason(state,fixture.host,pile.id))!;
  await steps.step('affordable','The affordable boundary starts at the right face-up card',[{spec:'The most expensive available purchase is the last face-up card.',check:async()=>{await expect(page.locator('.slot:not(.wing) .buy-card').last()).toHaveAttribute('aria-label',`Buy ${definition(best.id).name}`);}}]);
  const seen=new Set<string>();
  while(await page.getByRole('button',{name:'Cheaper cards',exact:true}).isEnabled())await page.getByRole('button',{name:'Cheaper cards',exact:true}).click();
  for(let index=0;index<piles.length;index++){
    for(const name of await page.locator('.buy-card').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')!)))seen.add(name);
    if(await page.getByRole('button',{name:'More expensive cards',exact:true}).isEnabled())await page.getByRole('button',{name:'More expensive cards',exact:true}).click();
  }
  expect([...seen].sort()).toEqual(piles.map(pile=>`Buy ${definition(pile.id).name}`).sort());
  await steps.step('expensive','All piles remain reachable in the same display',[{spec:'The costliest Territory is visible without changing supply screens.',check:async()=>expect(page.getByRole('button',{name:'Buy Acropolis',exact:true})).toBeVisible()}]);
});
