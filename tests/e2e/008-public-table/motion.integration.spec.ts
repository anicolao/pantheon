import {browseSupply,enterTreasures} from '../helpers/supply-controls';
import {test,expect} from '../helpers/fixtures';
import {newPlayerContext} from '../helpers/players';
import {actionTable,playCard,readEvents} from '../helpers/action-history';
import {TestStepHelper} from '../helpers/test-step-helper';
import {replaySetup} from '../../../src/lib/game/setup';
import {definition,canPlayAction} from '../../../src/lib/game/actions';
import type {Page} from '@playwright/test';

async function observe(page:Page){
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{
    const animate=Element.prototype.animate;
    const owner=window as unknown as {flights:{id:string;kind:string;faces:number;end:string;duration:number;delay:number}[]};owner.flights=[];
    Element.prototype.animate=function(frames,options){
      if(this.matches('.public-flight'))owner.flights.push({id:this.getAttribute('data-motion-step')!,kind:this.getAttribute('data-motion-kind')!,faces:this.querySelectorAll('[data-card-id]').length,duration:typeof options==='number'?options:Number(options?.duration),delay:typeof options==='number'?0:Number(options?.delay??0),end:Array.isArray(frames)?String(frames.at(-1)?.transform):''});
      return animate.call(this,frames,options);
    };
  });
}
async function flights(page:Page){return page.evaluate(()=>(window as unknown as {flights:{id:string;kind:string;faces:number;end:string;duration:number;delay:number}[]}).flights);}

// Each flight batch has its own bounded arrival; a whole slowed-down turn
// deliberately contains several successive batches.
async function expectFlights(page:Page, expected:string[]){
  for(const id of new Set(expected))await expect.poll(async()=>(await flights(page)).map(move=>move.id)).toContain(id);
  expect((await flights(page)).map(move=>move.id)).toEqual(expected);
  await expect(page.locator('.public-flight')).toHaveCount(0);
}

for(const scenario of [
  {card:'oracles-acolyte',leader:'thaleia',title:'an Action draw followed by a bloodline blessing'},
  {card:'harvest-feast',leader:'melia',title:'drawing before discarding and then receiving Melia’s blessing'},
  {card:'victorious-procession',leader:'thaleia',reveal:'Territory' as const,title:'a Territory reveal moving to discard'},
  {card:'victorious-procession',leader:'thaleia',reveal:'other' as const,title:'a revealed Treasure returning to the deck'},
  {card:'council-of-sages',leader:'thaleia',cleanup:true,title:'cleanup shuffling discards before hidden draws'}
])test(`follow ${scenario.title} exactly once`,async({page,browser},info)=>{
  test.setTimeout(120_000);
  const context=await newPlayerContext(browser,{viewport:info.project.use.viewport,baseURL:info.project.use.baseURL}),other=await context.newPage();
  const steps=new TestStepHelper(page,info,`Follow ${scenario.title}`);
  const capture=(id:string,text:string,check:()=>Promise<unknown>,observer=false)=>steps.step(id,text,[{spec:text,check}],{page:observer?other:page,player:observer?'Theseus':'Ariadne'});
  try{
    const fixture=await actionTable(page,info,scenario.card,scenario.leader,{other,reveal:scenario.reveal,seed:scenario.cleanup?'actions-MYEJG':undefined});
    await capture('table','Ariadne holds the Action at a legal recorded table',async()=>expect(page.locator(`.hand [data-card-id="${scenario.card}"]`)).toBeVisible());
    await capture('waiting','Theseus can follow the active player while keeping his own hand',async()=>expect(other.locator('.turn-marker')).toContainText('Ariadne'),true);
    await observe(other);await other.bringToFront();
    await playCard(page,scenario.card);
    const played=replaySetup(await readEvents(fixture.code)).publicActivity.findLast(entry=>entry.command==='action/played')!;
    await expectFlights(other,played.steps.filter(step=>!['leader','worship'].includes(step.kind)).map(step=>step.id));
    await expect(other.locator('.public-flight')).toHaveCount(0);
    if(scenario.card==='harvest-feast'){
      await capture('discard','Ariadne must discard after drawing two cards',async()=>expect(page.getByRole('button',{name:'Discard 0',exact:true})).toBeDisabled());
      const state=replaySetup(await readEvents(fixture.code)),target=state.decks[fixture.host].hand[0];
      await page.getByRole('button',{name:`Select ${definition(target.cardId).name}, copy ${target.copy}`,exact:true}).click();
      await capture('selected','Ariadne reviews the card going to discard',async()=>expect(page.getByRole('button',{name:'Discard 1',exact:true})).toBeEnabled());
      await page.getByRole('button',{name:'Discard 1',exact:true}).click();await expect(page.locator('.choice-scene')).toHaveCount(0);
    }
    if(scenario.cleanup){
      await capture('drawn','Council of Sages has drawn three cards and finished its blessing',async()=>expect(page.locator('.resources [data-resource=actions]')).toHaveAttribute('data-value','1'));
      await enterTreasures(page);
      if(await page.getByRole('dialog',{name:'Leave Actions?',exact:true}).count()){
        await capture('leave-actions','Ariadne confirms leaving a playable Action in hand',async()=>expect(page.getByRole('dialog',{name:'Leave Actions?',exact:true})).toBeVisible());
        await page.getByRole('dialog').getByRole('button',{name:'To Treasures',exact:true}).click();
      }
      await capture('treasures','Ariadne can end the turn with retained Treasures',async()=>expect(page.locator('.turn-marker')).toContainText('Treasures'));
      await page.getByRole('button',{name:'End turn',exact:true}).click();
      await capture('confirm','Ariadne confirms the remaining option before cleanup',async()=>expect(page.getByRole('dialog',{name:'End your turn?',exact:true})).toBeVisible());
      await page.getByRole('dialog').getByRole('button',{name:'End turn',exact:true}).click();await expect(other.locator('.turn-marker')).toContainText('Your turn');
    }
    const state=replaySetup(await readEvents(fixture.code));
    const moves=state.publicActivity.filter(entry=>entry.sequence>fixture.events.length).flatMap(entry=>entry.steps);
    await expectFlights(other,moves.filter(move=>!['leader','worship'].includes(move.kind)).flatMap(move=>Array.from({length:move.kind==='cleanup'&&move.from.zone==='play'?move.count:1},()=>move.id)));
    await expect(other.locator('.public-flight')).toHaveCount(0);
    const observed=await flights(other);expect(observed.every(move=>move.duration>=450)).toBe(true);expect(observed.every(move=>move.delay<=700)).toBe(true);
    expect(observed.filter(move=>['draw','shuffle'].includes(move.kind)).every(move=>move.faces===0)).toBe(true);
    if(scenario.cleanup)expect(observed.some(move=>move.kind==='shuffle')).toBe(true);
    if(scenario.reveal){
      const target=await other.locator('.outcome-card').boundingBox();
      expect(observed.find(move=>move.kind==='reveal')!.end).toContain(`translate(${target!.x+target!.width/2}px,${target!.y+target!.height/2}px)`);
    }
    await capture('result','Every public movement arrived in order while hidden cards stayed backs',async()=>expect(other.locator('.opponents [data-card-id]')).toHaveCount(0),true);
    await other.getByRole('button',{name:'Chronicle',exact:true}).click();
    await capture('history','The same source, destination, and resource result remain after motion',async()=>expect(other.locator('.chronicle .actor')).toContainText('Ariadne'),true);
    await other.getByRole('button',{name:'Close',exact:true}).click();
    await other.reload();await expect(other.locator('[data-status]')).toHaveAttribute('data-status','synced');
    await capture('returned','Returning to this table restores its result without replaying old motion',async()=>{await expect(other.locator('.public-flight')).toHaveCount(0);expect(await other.evaluate(()=>document.getAnimations().length)).toBe(0);},true);
  }finally{await context.close();}
});

test('follow Worship and a purchase once while reconnecting without an animation backlog',async({page,browser},info)=>{
  test.setTimeout(120_000);
  const context=await newPlayerContext(browser,{viewport:info.project.use.viewport,baseURL:info.project.use.baseURL}),other=await context.newPage();
  const steps=new TestStepHelper(page,info,'Follow Worship through an interruption');
  const capture=(id:string,text:string,check:()=>Promise<unknown>,observer=false,status='synced')=>steps.step(id,text,[{spec:text,check}],{page:observer?other:page,player:observer?'Theseus':'Ariadne',status});
  try{
    const fixture=await actionTable(page,info,'sea-trade','nereon',{other,wealth:1});
    await capture('table','Ariadne is ready to play Sea Trade at a legal recorded table',async()=>expect(page.locator('.hand [data-card-id="sea-trade"]')).toBeVisible());
    await observe(other);await other.bringToFront();await playCard(page,'sea-trade');
    await capture('wealth','Sea Trade and Nereon grant three Coins',async()=>expect(page.locator('.resources [data-resource=coins]')).toHaveAttribute('data-value','3'));
    await page.getByRole('button',{name:'Inspect Tribute of the Tides',exact:true}).click();
    await capture('altar','Ariadne can pay Poseidon before the Treasure phase',async()=>expect(page.getByRole('button',{name:'Worship Poseidon',exact:true})).toBeEnabled());
    await page.getByRole('button',{name:'Worship Poseidon',exact:true}).click();
    await capture('gift','Poseidon sends a Drachma to Ariadne’s discard',async()=>expect(page.locator('.worship-scene .worship-wallet [data-resource=coins]')).toHaveAttribute('data-value','0'));
    let state=replaySetup(await readEvents(fixture.code));
    const expected=state.publicActivity.filter(entry=>entry.sequence>fixture.events.length).flatMap(entry=>entry.steps.filter(step=>!['leader','worship'].includes(step.kind)).map(step=>step.id));
    await expectFlights(other,expected);await expect(other.locator('.public-flight')).toHaveCount(0);
    await capture('observer','Theseus sees the public gift without an extra leader blessing',async()=>{await expect(other.locator('.outcome [data-card-id]')).toHaveAttribute('data-card-id','drachma');expect((await flights(other)).filter(move=>move.kind==='leader')).toHaveLength(0);},true);
    await context.setOffline(true);
    await capture('interrupted','Theseus keeps his table when the connection is interrupted',async()=>expect(other.locator('.connection')).toContainText('Your place is kept'),true,'disconnected');
    await page.getByRole('button',{name:'Return',exact:true}).click();await enterTreasures(page);
    await capture('treasures','Ariadne can continue into Treasures during the interruption',async()=>expect(page.locator('.turn-marker')).toContainText('Treasures'));
    await page.getByRole('button',{name:'Play all Treasures',exact:true}).click();
    await capture('played','Ariadne’s played wealth remains part of the public history',async()=>expect(page.getByRole('button',{name:'Play all Treasures',exact:true})).toHaveCount(0));
    await context.setOffline(false);await expect(other.locator('[data-status]')).toHaveAttribute('data-status','synced');
    await capture('reconnected','Theseus catches up to the latest counters without a burst of old motion',async()=>{await expect(other.locator('.public-flight')).toHaveCount(0);expect((await flights(other)).map(move=>move.id)).toEqual(expected);},true);
    await expect(page.locator('.supply-coverflow')).toBeVisible();await browseSupply(page,'Obol');
    await capture('purchase','Ariadne chooses a cost-zero Obol after reconnect',async()=>expect(page.getByRole('button',{name:'Buy Obol',exact:true})).toBeEnabled());
    await page.getByRole('button',{name:'Buy Obol',exact:true}).click();
    await expect(page.locator('.resources [data-resource=buys]')).toHaveAttribute('data-value','1');
    state=replaySetup(await readEvents(fixture.code));const bought=state.publicActivity.at(-1)!;
    await expectFlights(other,[...expected,...bought.steps.map(step=>step.id)]);await expect(other.locator('.public-flight')).toHaveCount(0);
    await capture('live-again','The next live purchase lands beside played cards',async()=>expect(other.getByRole('button',{name:'Inspect purchased Obol',exact:true})).toBeVisible(),true);
    await other.emulateMedia({reducedMotion:'reduce'});const before=await flights(other);
    await page.getByRole('button',{name:'Buy Obol',exact:true}).click();await expect(other.locator('.action-message')).toContainText('gained Obol');
    await expect(page.locator('.resources [data-resource=buys]')).toHaveAttribute('data-value','0');await expect(other.locator('.resources [data-resource=buys]')).toHaveAttribute('data-value','0');
    await other.getByRole('button',{name:'Chronicle',exact:true}).click();
    await capture('reduced','Reduced motion preserves the same purchase path and cost without travel',async()=>{await expect(other.locator('.path')).toHaveText('Supply → Discard');await expect(other.locator('.result [data-resource=buys]')).toHaveAttribute('data-value','-1');expect(await flights(other)).toEqual(before);},true);
  }finally{await context.close();}
});

test('keep a private hand inspection open while another player moves',async({page,browser},info)=>{
  test.setTimeout(120_000);
  const context=await newPlayerContext(browser,{viewport:info.project.use.viewport,baseURL:info.project.use.baseURL}),other=await context.newPage();
  const steps=new TestStepHelper(page,info,'Keep your place while a friend plays');
  try{
    const fixture=await actionTable(page,info,'oracles-acolyte','thaleia',{other});
    await steps.step('waiting','Theseus can inspect his own hand while Ariadne takes her turn',[{spec:'The observer has five private hand cards and cannot play out of turn.',check:async()=>{await expect(other.getByTestId('hand-card')).toHaveCount(5);await expect(other.getByRole('button',{name:'To Treasures',exact:true})).toHaveCount(0);}}],{page:other,player:'Theseus'});
    await observe(other);await other.getByTestId('hand-card').first().click({button:'right'});
    const reading=await other.locator('.inspection [data-card-id]').getAttribute('data-card-id');
    await steps.step('private-card','Theseus reads his own card without exposing Ariadne’s hand',[{spec:'Inspection is read-only during the other player’s turn.',check:async()=>{await expect(other.locator('.inspection[open]')).toBeVisible();await expect(other.locator('.opponents [data-card-id]')).toHaveCount(0);}}],{page:other,player:'Theseus'});
    await playCard(page,'oracles-acolyte');
    const played=replaySetup(await readEvents(fixture.code));
    const phase=played.decks[fixture.host].hand.some(card=>canPlayAction(played,fixture.host,card.id))?'Actions':'Treasures';
    await expect(other.locator('.turn-marker')).toContainText(phase);
    await steps.step('kept','Ariadne’s Action updates the table without interrupting Theseus’s reading',[{spec:'The same private card remains open and no travel runs over it.',check:async()=>{await expect(other.locator('.action-message')).toContainText('Oracle’s Acolyte');await expect(other.locator('.inspection [data-card-id]')).toHaveAttribute('data-card-id',reading!);expect(await flights(other)).toEqual([]);}}],{page:other,player:'Theseus'});
    await other.keyboard.press('Escape');
    await steps.step('returned','Theseus returns to the same hand position',[{spec:'Focus returns to the inspected card and old travel is not replayed.',check:async()=>{await expect(other.getByTestId('hand-card').first()).toBeFocused();await expect(other.locator('.public-flight')).toHaveCount(0);expect(await flights(other)).toEqual([]);}}],{page:other,player:'Theseus'});
  }finally{await context.close();}
});
