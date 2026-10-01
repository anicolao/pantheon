import {test,expect} from '../helpers/fixtures';
import {actionTable,playCard,readEvents} from '../helpers/action-history';
import {TestStepHelper} from '../helpers/test-step-helper';
import {replaySetup,setupSupply} from '../../../src/lib/game/setup';
import {definition,purchaseReason} from '../../../src/lib/game/actions';
import {browseSupply} from '../helpers/supply-controls';

test('buy from one cost-sorted coverflow and warn before skipping playable Actions',async({page},info)=>{
  const fixture=await actionTable(page,info,'temple-of-athena','thaleia');
  const steps=new TestStepHelper(page,info,'Browse and buy on the table');
  await steps.step('supply','The complete supply is already on the table',[{spec:'Every pile stays mounted beside the hand, with no Supply button, page selector, or purchase screen.',check:async()=>{
    await expect(page.getByRole('button',{name:'Supply',exact:true})).toHaveCount(0);
    await expect(page.getByRole('navigation',{name:'Supply pages'})).toHaveCount(0);
    await expect(page.locator('.supply-coverflow .supply-face')).toHaveCount(setupSupply(2).length);
    await expect(page.locator('.buy-card[data-centered=true]')).toHaveCount(1);
    await expect(page.getByRole('button',{name:'Buy Obol',exact:true})).toBeEnabled();
    await expect(page.locator('.hand')).toBeVisible();await expect(page.locator('dialog:modal')).toHaveCount(0);
  }}]);
  const stage=(await page.locator('.supply-coverflow .coverflow').boundingBox())!;
  await page.mouse.move(stage.x+2,stage.y+stage.height/2);await page.mouse.down();
  await page.mouse.move(stage.x+stage.width+4,stage.y+stage.height/2);
  await expect(page.locator('.supply-coverflow')).toHaveAttribute('aria-busy','true');
  await page.mouse.up();
  await expect(page.locator('.supply-coverflow')).toHaveAttribute('aria-busy','false');
  expect(await readEvents(fixture.code)).toEqual(fixture.events);
  await browseSupply(page,'Obol');
  await browseSupply(page,'Hamlet');
  expect(await readEvents(fixture.code)).toEqual(fixture.events);
  await browseSupply(page,'Obol');
  const originalFaces=await page.locator('.supply-face').elementHandles();
  const touch=await page.context().newCDPSession(page),box=(await page.getByRole('button',{name:'Buy Obol',exact:true}).boundingBox())!;
  const point={x:box.x+box.width/2,y:box.y+box.height/2};
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x-60,y:point.y}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(page.locator('.supply-coverflow')).toHaveAttribute('aria-busy','false');
  expect(await readEvents(fixture.code)).toEqual(fixture.events);
  for(const face of originalFaces)expect(await face.evaluate(node=>node.isConnected)).toBe(true);
  await touch.detach();await browseSupply(page,'Obol');
  await page.getByRole('button',{name:'Buy Obol',exact:true}).click();
  await steps.step('warning','Buying warns about a playable Action',[{spec:'The framed warning names the remaining Action and commits no purchase.',check:async()=>{await expect(page.getByRole('dialog',{name:'Skip playable Actions?'})).toContainText('Temple of Athena');expect(await readEvents(fixture.code)).toEqual(fixture.events);}}]);
  await page.getByRole('button',{name:'Keep playing',exact:true}).click();
  await expect(page.locator('dialog:modal')).toHaveCount(0);
  await page.getByRole('button',{name:'Buy Obol',exact:true}).click();
  await page.getByRole('button',{name:'Buy Obol now',exact:true}).click();
  await steps.step('bought','A purchase stays on the same table',[{spec:'One purchase enters Buys while the hand, supply, and turn controls stay visible.',check:async()=>{await expect(page.locator('.resources [data-resource=buys]')).toHaveAttribute('data-value','0');await expect(page.locator('dialog:modal')).toHaveCount(0);await expect(page.locator('.hand')).toBeVisible();await expect(page.getByRole('button',{name:'End turn',exact:true})).toBeVisible();const events=await readEvents(fixture.code);expect(events.slice(fixture.events.length).map(event=>event.type)).toEqual(['card/bought']);expect(replaySetup(events).turn.phase).toBe('buys');}}]);
  if(info.project.name==='phone'){
    await page.setViewportSize({width:852,height:393});
    await steps.step('landscape','Buy on a short landscape table',[{spec:'Supply, hand, and resources remain together without a screen transition.',check:async()=>{await expect(page.locator('.buy-card[data-centered=true]')).toHaveCount(1);await expect(page.locator('.hand')).toBeVisible();}}]);
    await page.setViewportSize({width:568,height:320});
    await steps.step('small-landscape','Keep the shortest landscape table usable',[{spec:'The full table fits, with every supply card still mounted.',check:async()=>{await expect(page.locator('.supply-face')).toHaveCount(setupSupply(2).length);await expect(page.locator('.turn-rail')).toBeVisible();}}]);
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
  const state=replaySetup(await readEvents(fixture.code));
  const piles=setupSupply(state.playerCount).sort((a,b)=>(definition(a.id).cost??0)-(definition(b.id).cost??0)||a.id.localeCompare(b.id));
  const best=piles.findLast(pile=>!purchaseReason(state,fixture.host,pile.id))!;
  await steps.step('affordable','The most expensive affordable card moves to the center',[{spec:'The supply responds to played Treasures on the table.',check:async()=>{await expect(page.locator('.buy-card[data-centered=true]')).toHaveAttribute('aria-label',`Buy ${definition(best.id).name}`);await expect(page.locator('.supply-face [data-card-id]')).toHaveCount(piles.length);}}]);
  await page.emulateMedia({reducedMotion:'no-preference'});
  const faces=await page.locator('.supply-face').elementHandles();
  await page.locator('.buy-card[data-centered=true]').press('ArrowRight');
  await expect(page.locator('.supply-coverflow')).toHaveAttribute('aria-busy','true');
  await expect(page.locator('.supply-coverflow')).toHaveAttribute('aria-busy','false');
  for(const face of faces)expect(await face.evaluate(node=>node.isConnected)).toBe(true);
  await page.emulateMedia({reducedMotion:'reduce'});
  const seen=new Set<string>();
  await page.locator('.buy-card[data-centered=true]').press('Home');
  for(let index=0;index<piles.length;index++){
    for(const id of await page.locator('.buy-card[data-face-up=true]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-supply-id')!)))seen.add(id);
    await page.locator('.buy-card[data-centered=true]').press('ArrowRight');
  }
  expect([...seen].sort()).toEqual(piles.map(pile=>pile.id).sort());
  await steps.step('expensive','Every pile is reachable in the same table',[{spec:'The costliest Territory is centered while the hand stays visible.',check:async()=>{await expect(page.getByRole('button',{name:'Buy Acropolis',exact:true})).toBeVisible();await expect(page.locator('.hand')).toBeVisible();await expect(page.locator('dialog:modal')).toHaveCount(0);}}]);
});
