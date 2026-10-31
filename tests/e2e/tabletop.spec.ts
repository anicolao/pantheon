import { observeDraws, waitForDraws, drawFrames } from './helpers/draw-observer';
import { test, expect } from './helpers/fixtures';
import { TestStepHelper } from './helpers/test-step-helper';
import { freshTable, occupy, begin, append, actor, advanceEmptyActions, seatUid, type Edge } from '../../src/lib/tabletop/table';
const names={south:'Thaleia',west:'Nereon',north:'Melia',east:'Doreios'};
import { replaySetup } from '../../src/lib/game/setup';

for (const count of [2, 4] as const) test(`tabletop ${count} players join their edges and keep reverse join order`, async ({page},info)=>{
  test.skip(info.project.name==='phone','A shared four-edge table is designed for a large display.');
  await page.goto('./pantheontt/');
  const order:Edge[]=count===2?['south','west']:['north','east','south','west'];
  for(const edge of order)await page.getByRole('button',{name:new RegExp(`^Join ${names[edge]}$`)}).click();
  info.annotations.push({type:'display',description:'Shared tabletop: desktop and 4K displays only.'});
  const story=new TestStepHelper(page,info,'Gather at the shared table');
  await story.step('gather','Players join leaders from their own edge',[
    {spec:'Every joined edge can leave before the game starts',check:()=>expect(page.getByRole('button',{name:/^Leave .* seat$/})).toHaveCount(count)},
    {spec:'A Play button faces every edge',check:()=>expect(page.getByRole('button',{name:/^Play facing/})).toHaveCount(4)}
  ]);
  await page.getByRole('button',{name:'Play facing Thaleia',exact:true}).click();
  await expect(page.locator('main')).toHaveAttribute('data-tabletop-phase','playing');
  await expect(page.getByRole('region',{name:'Shared table'})).toHaveAttribute('data-facing','west');
  await expect(page.locator('.table-hand[data-face-up="true"]')).toHaveCount(1);
  await expect(page.locator('[data-edge="west"] .table-hand')).toHaveAttribute('data-face-up','true');
  await expect(page.locator('[data-edge="south"] .table-hand')).toHaveAttribute('data-face-up','false');
  const saved=await page.evaluate(()=>localStorage.getItem('pantheon-tabletop-v1')!);
  expect(replaySetup(JSON.parse(saved).events).turnOrder).toEqual([...order].reverse().map(seatUid));
  await page.locator('[data-edge="west"]').getByRole('button',{name:'Play all Treasures',exact:true}).click();
  await page.locator('[data-edge="west"]').getByRole('button',{name:'End turn',exact:true}).click();
  await expect(page.getByRole('region',{name:'Shared table'})).toHaveAttribute('data-facing',order.at(-2)!);
  await page.reload();
  await expect(page.getByRole('region',{name:'Shared table'})).toHaveAttribute('data-facing',order.at(-2)!);
});

test('tabletop randomized draft follows clockwise seats and reverses the draft',async({page},info)=>{
  test.skip(info.project.name==='phone','A shared four-edge table is designed for a large display.');
  await page.goto('./pantheontt/');
  for(const name of ['Thaleia','Melia','Doreios'])await page.getByRole('button',{name:new RegExp(`^Join ${name}$`)}).click();
  await page.getByRole('checkbox',{name:'Randomize play order',exact:true}).first().check();
  await page.getByRole('button',{name:'Play facing Thaleia',exact:true}).click();
  await expect(page.locator('main')).toHaveAttribute('data-tabletop-phase','draft');
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('pantheon-tabletop-v1')!));
  const game=replaySetup(state.events);
  expect(game.leaders).toEqual({});expect(game.draftOrder).toEqual([...game.turnOrder].reverse());
  for(const name of ['Thaleia','Nereon','Melia'])await page.getByRole('button',{name:`Choose ${name}`,exact:true}).click();
  await expect(page.locator('main')).toHaveAttribute('data-tabletop-phase','playing');
  await expect(page.locator('.table-hand[data-face-up="true"]')).toHaveAttribute('data-hand-owner',game.turnOrder[0]);
});

test('tabletop restored four-edge game shows one face-up hand and a rotated market',async({page},info)=>{
  test.skip(info.project.name==='phone','A shared four-edge table is designed for a large display.');
  info.annotations.push({type:'setup',description:'Recorded-history integration scenario: restore a legal, seeded local tabletop save. Separate stories cover tapping seats and starting a new game.'});
  let table=freshTable();for(const edge of ['south','north','east','west'] as Edge[])table=occupy(table,edge,'human');
  table=advanceEmptyActions(begin(table,'tabletop-visual-1'));
  await page.goto('./pantheontt/');
  await page.evaluate(saved=>localStorage.setItem('pantheon-tabletop-v1',saved),JSON.stringify(table));
  await page.reload();
  info.annotations.push({type:'display',description:'Shared tabletop: desktop and 4K displays only.'});
  const story=new TestStepHelper(page,info,'A game on all four edges');
  await story.step('west-turn','The table faces West while the other hands stay face down',[
    {spec:'West is the only face-up hand',check:async()=>{await expect(page.locator('.table-hand[data-face-up="true"]')).toHaveCount(1);await expect(page.locator('.table-hand[data-face-up="true"]')).toHaveAttribute('data-hand-owner',seatUid('west'));}},
    {spec:'Shared cards rotate toward West',check:()=>expect(page.getByRole('region',{name:'Shared table'})).toHaveAttribute('data-facing','west')}
  ]);
});

test('tabletop bot occupies an edge and plays through the real worker',async({page},info)=>{
  test.skip(info.project.name==='phone','A shared four-edge table is designed for a large display.');
  await page.goto('./pantheontt/');
  await page.getByRole('button',{name:/^Join Thaleia$/}).click();
  await page.getByRole('button',{name:'Add bot as Melia',exact:true}).click();
  await expect(page.getByLabel('Bot difficulty for Melia').locator('option')).toHaveText(['Easy','Standard','Hard','Expert']);
  await page.getByLabel('Bot difficulty for Melia').selectOption('expert');
  info.annotations.push({type:'display',description:'Shared tabletop: desktop and 4K displays only.'});
  const story=new TestStepHelper(page,info,'Choose a tabletop bot difficulty');
  await story.step('expert-seat','Choose Expert at the bot’s edge',[{spec:'Expert is selected before starting the game.',check:()=>expect(page.getByLabel('Bot difficulty for Melia')).toHaveValue('expert')}]);
  await page.getByRole('button',{name:'Play facing Thaleia',exact:true}).click();
  await expect(page.locator('main')).toHaveAttribute('data-tabletop-phase','playing');
  await expect(page.getByRole('region',{name:'Shared table'})).toHaveAttribute('data-facing','south');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pantheon-tabletop-v1')!));
  const game=replaySetup(saved.events);
  expect(game.turn.turns[seatUid('north')]).toBe(1);
  expect(game.players.find(player=>player.uid===seatUid('north'))?.botKind).toBe('expert');
  expect(['melia','nereon','doreios']).toContain(game.leaders[seatUid('north')]);
  expect(game.leaders[seatUid('south')]).toBe('thaleia');
});

test('tabletop motion hands off controls after rotating and accepts a rotated market swipe',async({page},info)=>{
  test.skip(info.project.name==='phone','A shared four-edge table is designed for a large display.');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('./pantheontt/');
  info.annotations.push({type:'setup',description:'Restore a legal seeded game with a opening hand without Actions to isolate rotation and swiping from optional action confirmation.'});
  let table=freshTable();for(const edge of ['south','north','east','west'] as Edge[])table=occupy(table,edge,'human');
  table=advanceEmptyActions(begin(table,'tabletop-visual-1'));
  await page.evaluate(saved=>localStorage.setItem('pantheon-tabletop-v1',saved),JSON.stringify(table));
  await page.reload();
  const board=page.getByRole('region',{name:'Shared table'});
  await expect(board).toHaveAttribute('aria-busy','false');
  await expect.poll(()=>board.evaluate(node=>{const m=new DOMMatrixReadOnly(getComputedStyle(node).transform);return [m.a,m.b,m.c,m.d];})).toEqual([0,1,-1,0]);
  const centered=page.locator('.buy-card[data-centered="true"]');
  const before=await centered.getAttribute('data-supply-id');
  const box=await centered.boundingBox();expect(box).not.toBeNull();
  await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);
  await page.mouse.down();
  await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2-box!.height*1.25,{steps:8});
  await page.mouse.up();
  await expect(centered).not.toHaveAttribute('data-supply-id',before!);
  await page.locator('[data-edge="west"]').getByRole('button',{name:'End turn',exact:true}).click();
  await expect(page.locator('.public-flight[data-motion-kind="cleanup"]').first()).toBeAttached();
  const dealt=await page.evaluate(()=>JSON.parse(localStorage.getItem('pantheon-tabletop-v1')!));
  expect(replaySetup(dealt.events).decks[seatUid('west')].hand).toHaveLength(5);
  await expect(page.locator('[data-edge="west"] .table-hand')).toHaveAttribute('data-face-up','false');
  await expect(page.locator('.public-flight[data-motion-kind="draw"]')).toHaveCount(0);
  await expect(board).toHaveAttribute('data-facing','east');
  await expect(board).toHaveAttribute('aria-busy','false');
  await expect.poll(()=>board.evaluate(node=>{const m=new DOMMatrixReadOnly(getComputedStyle(node).transform);return [m.a,m.b,m.c,m.d];})).toEqual([0,-1,1,0]);
  await expect(page.locator('[data-edge="east"] .table-hand')).toHaveAttribute('data-face-up','true');
  await expect(page.locator('[data-edge="east"]').getByRole('button',{name:'End turn',exact:true})).toBeEnabled();

});

test('tabletop exits face the tapped edge and leader names identify the log',async({page},info)=>{
  test.skip(info.project.name==='phone','A shared four-edge table is designed for a large display.');
  await page.addInitScript(()=>{window.close=()=>{document.documentElement.dataset.closeRequested='true';};});
  await page.goto('./pantheontt/');
  await page.getByRole('button',{name:'Exit from Thaleia edge',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-close-requested','true');
  await page.reload();
  for(const name of ['Thaleia','Nereon'])await page.getByRole('button',{name:`Join ${name}`,exact:true}).click();
  await page.getByRole('button',{name:'Play facing Thaleia',exact:true}).click();
  await expect(page.locator('[aria-label="Nereon turn status"]')).toContainText('Your turn –');
  await page.getByRole('button',{name:'Chronicle for Nereon',exact:true}).click();
  await expect(page.locator('.chronicle')).toContainText('Nereon');
  await expect(page.locator('.chronicle')).not.toContainText(/South|West|North|East/);
  await page.getByRole('button',{name:'Close Chronicle for Nereon',exact:true}).click();
  for(const edge of ['south','west','north','east'] as Edge[]) {
    await page.getByRole('button',{name:`Exit from ${names[edge]} edge`,exact:true}).click();
    await expect(page.getByRole('dialog',{name:'Leave the table?',exact:true})).toHaveAttribute('data-exit-edge',edge);
    const expected={south:[1,0,0,1],west:[0,1,-1,0],north:[-1,0,0,-1],east:[0,-1,1,0]}[edge];
    expect(await page.getByRole('dialog',{name:'Leave the table?',exact:true}).evaluate(node=>{const m=new DOMMatrixReadOnly(getComputedStyle(node).transform);return [m.a,m.b,m.c,m.d];})).toEqual(expected);
    await expect(page.locator('html')).not.toHaveAttribute('data-close-requested','true');
    await page.getByRole('button',{name:'Keep playing',exact:true}).click();
    const saved=await page.evaluate(()=>localStorage.getItem('pantheon-tabletop-v1'));
    await page.getByRole('button',{name:`Chronicle for ${names[edge]}`,exact:true}).click();
    await page.getByRole('button',{name:'New game',exact:true}).click();
    const reset=page.getByRole('dialog',{name:'Start a new game?',exact:true});
    await expect(reset).toHaveAttribute('data-reset-edge',edge);
    expect(await reset.evaluate(node=>{const m=new DOMMatrixReadOnly(getComputedStyle(node).transform);return [m.a,m.b,m.c,m.d];})).toEqual(expected);
    await reset.getByRole('button',{name:'Keep playing',exact:true}).click();
    expect(await page.evaluate(()=>localStorage.getItem('pantheon-tabletop-v1'))).toBe(saved);
    await page.getByRole('button',{name:`Close Chronicle for ${names[edge]}`,exact:true}).click();
  }
  await page.getByRole('button',{name:'Exit from Nereon edge',exact:true}).click();
  await page.getByRole('button',{name:'Exit',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-close-requested','true');
  await page.getByRole('button',{name:'Chronicle for Nereon',exact:true}).click();
  await page.getByRole('button',{name:'New game',exact:true}).click();
  await page.getByRole('dialog',{name:'Start a new game?',exact:true}).getByRole('button',{name:'New game',exact:true}).click();
  await expect(page.getByRole('button',{name:/^Join /})).toHaveCount(4);
  expect(JSON.parse((await page.evaluate(()=>localStorage.getItem('pantheon-tabletop-v1')))!)).toEqual(freshTable());
  await page.reload();
  await expect(page.getByRole('button',{name:/^Join /})).toHaveCount(4);
});

test('tabletop bot cards visibly fly before the next command',async({page},info)=>{
  test.skip(info.project.name==='phone','A shared four-edge table is designed for a large display.');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('./pantheontt/');
  await page.getByRole('button',{name:'Join Thaleia',exact:true}).click();
  await page.getByRole('button',{name:'Add bot as Melia',exact:true}).click();
  await page.getByRole('button',{name:'Play facing Thaleia',exact:true}).click();
  const flight=page.locator('.public-flight[data-motion-kind="play"]').first();
  await expect(flight).toBeAttached();
  const sequence=Number(await flight.getAttribute('data-motion-sequence'));
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pantheon-tabletop-v1')!));
  const game=replaySetup(saved.events);
  expect(game.publicActivity.find(entry=>entry.sequence===sequence)?.actor.uid).toBe(seatUid('north'));
  expect(game.publicActivity.filter(entry=>entry.sequence>sequence&&entry.steps.length)).toHaveLength(0);
  await page.locator('[data-corner="north"]').getByRole('button',{name:/Chronicle/}).click();
  await expect(page.locator(`.public-flight[data-motion-sequence="${sequence}"][data-motion-kind="play"]`)).toHaveCount(0);
  await expect(page.locator('.chronicle')).toBeVisible();
});

test('tabletop corner readers face their player and stay outside the playable table',async({page},info)=>{
  test.skip(info.project.name==='phone','A shared four-edge table is designed for a large display.');
  info.annotations.push({type:'setup',description:'Restore the legal seeded four-seat game to make the reading panels and turn handoff reproducible.'},{type:'display',description:'Shared tabletop: desktop and 4K displays only.'});
  let table=freshTable();for(const edge of ['south','north','east','west'] as Edge[])table=occupy(table,edge,'human');
  table=advanceEmptyActions(begin(table,'tabletop-visual-1'));
  await page.goto('./pantheontt/');
  await page.evaluate(saved=>localStorage.setItem('pantheon-tabletop-v1',saved),JSON.stringify(table));
  await page.reload();
  await expect(page.getByRole('link',{name:'Sanctuary',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'New table',exact:true})).toHaveCount(0);
  for(const edge of ['south','west','north','east'] as Edge[]) {
    for(const kind of ['Chronicle','Trash']) {
      await page.getByRole('button',{name:`${kind} for ${names[edge]}`,exact:true}).click();
      const panel=page.locator(`[data-reader-edge="${edge}"] .reader-panel`);
      const expected={south:[1,0,0,1],west:[0,1,-1,0],north:[-1,0,0,-1],east:[0,-1,1,0]}[edge];
      expect(await panel.evaluate(node=>{const m=new DOMMatrixReadOnly(getComputedStyle(node).transform);return [m.a,m.b,m.c,m.d];})).toEqual(expected);
      const bounds=await panel.boundingBox(), surface=await page.locator('.play-surface').boundingBox();
      expect(bounds && surface && (bounds.x+bounds.width<=surface.x || surface.x+surface.width<=bounds.x || bounds.y+bounds.height<=surface.y || surface.y+surface.height<=bounds.y)).toBe(true);
      await expect(page.locator('[data-edge="west"]').getByRole('button',{name:'End turn',exact:true})).toBeEnabled();
      await page.getByRole('button',{name:`Close ${kind} for ${names[edge]}`,exact:true}).click();
    }
  }
  await page.getByRole('button',{name:'Chronicle for Thaleia',exact:true}).click();
  await page.getByRole('button',{name:'Trash for Doreios',exact:true}).click();
  const story=new TestStepHelper(page,info,'Read beside the shared table');
  await story.step('readers','Two players can read without covering the table',[
    {spec:'Chronicle is docked at Thaleia’s edge',check:()=>expect(page.locator('[data-reader-edge="south"]')).toHaveAttribute('data-reader-kind','chronicle')},
    {spec:'The trash pile opens and explains an empty pile',check:()=>expect(page.locator('[data-reader-edge="east"]')).toContainText('No cards have been trashed.')}
  ]);
  await page.locator('[data-edge="west"]').getByRole('button',{name:'End turn',exact:true}).click();
  await expect(page.getByRole('region',{name:'Shared table'})).toHaveAttribute('data-facing','east');
  await expect(page.locator('.reader-dock')).toHaveCount(2);
  await expect(page.locator('[data-reader-edge="south"]')).toContainText('Doreios');
});

for(const edge of ['south','west','north','east'] as Edge[])test(`tabletop ${edge} card flights retain their facing and cleanup conceals the next hand`,async({page},info)=>{
  test.skip(info.project.name==='phone','A shared four-edge table is designed for a large display.');
  info.annotations.push({type:'setup',description:'Restore a legal fixed-seed game with the inspected edge first; inspect actual browser animation keyframes.'});
  await page.emulateMedia({reducedMotion:'no-preference'});
  let table=freshTable();for(const seat of [edge==='south'?'west':'south',edge] as Edge[])table=occupy(table,seat,'human');
  table=advanceEmptyActions(begin(table,'tabletop-facing-1'));
  await page.goto('./pantheontt/');
  await page.evaluate(saved=>localStorage.setItem('pantheon-tabletop-v1',saved),JSON.stringify(table));
  await page.reload();
  const board=page.getByRole('region',{name:'Shared table'});
  await expect(board).toHaveAttribute('aria-busy','false');
  await page.locator(`[data-edge="${edge}"]`).getByRole('button',{name:'Play all Treasures',exact:true}).click();
  const expected=['south','west','north','east'].indexOf(edge)*90;
  const play=page.locator('.public-flight[data-motion-kind="play"]').first();
  await expect(play).toBeAttached();
  const angles=await play.evaluate(node=>node.getAnimations().flatMap(animation=>(animation.effect as KeyframeEffect).getKeyframes().flatMap(frame=>typeof frame.transform==='string'?[...frame.transform.matchAll(/rotate\(([-\d.]+)deg\)/g)].map(match=>Number(match[1])):[])));
  expect(angles.length).toBeGreaterThanOrEqual(2);
  expect(angles.every(angle=>angle===angles[0] && Math.abs(((angle-expected+540)%360)-180)<=8)).toBe(true);
  await expect(page.locator(`[data-edge="${edge}"]`).getByRole('button',{name:'End turn',exact:true})).toBeEnabled();
  await page.locator(`[data-edge="${edge}"]`).getByRole('button',{name:'End turn',exact:true}).click();
  const cleanup=page.locator('.public-flight[data-motion-kind="cleanup"]').first();
  await expect(cleanup).toBeAttached();
  await expect(page.locator(`[data-edge="${edge}"] .table-hand`)).toHaveAttribute('data-face-up','false');
  await expect(page.locator(`[data-edge="${edge}"] .hand-face .card`)).toHaveCount(0);
  await expect(page.locator('.public-flight[data-motion-kind="draw"]')).toHaveCount(0);
  await expect(board).not.toHaveAttribute('data-facing',edge);
  await expect(board).toHaveAttribute('aria-busy','false');
  await expect(page.locator(`[data-edge="${edge}"] .table-hand`)).toHaveAttribute('data-face-up','false');
  await expect(page.locator('.public-flight')).toHaveCount(0);
});


test('tabletop trash reader shows and inspects cards from legal trash events',async({page},info)=>{
  test.skip(info.project.name==='phone','A shared four-edge table is designed for a large display.');
  info.annotations.push({type:'setup',description:'Legal recorded prelude: purchase Seed Keeper, cycle the deck through ordinary turns, and trash a Hamlet.'});
  let table=advanceEmptyActions(begin(occupy(occupy(freshTable(),'west','human'),'south','human'),'tabletop-trash-reader'));
  let bought=false;
  for(let turn=0;turn<30;turn++) {
    const game=replaySetup(table.events),uid=actor(game),hand=game.decks[uid].hand;
    const seed=hand.find(card=>card.cardId==='seed-keeper'),hamlet=hand.find(card=>card.cardId==='hamlet');
    if(seed&&hamlet) {
      table=append(table,uid,{type:'action/played',instanceId:seed.id});
      const choice=replaySetup(table.events).turn.choice!;
      table=advanceEmptyActions(append(table,uid,{type:'choice/resolved',choiceId:choice.id,targets:[hamlet.id]}));
      break;
    }
    table=append(table,uid,{type:'treasures/played'});
    if(!bought && uid===seatUid('south') && replaySetup(table.events).resources.coins>=2) {
      table=append(table,uid,{type:'card/bought',cardId:'seed-keeper'});bought=true;
    }
    table=advanceEmptyActions(append(table,uid,{type:'turn/ended'}));
  }
  expect(replaySetup(table.events).trash.map(card=>card.cardId)).toContain('hamlet');
  await page.goto('./pantheontt/');
  await page.evaluate(saved=>localStorage.setItem('pantheon-tabletop-v1',saved),JSON.stringify(table));
  await page.reload();
  await page.getByRole('button',{name:'Trash for Thaleia',exact:true}).click();
  const reader=page.locator('[data-reader-edge="south"]');
  await reader.getByRole('button',{name:'Inspect trashed Hamlet',exact:true}).click();
  await expect(reader.locator('[data-card-id="hamlet"]')).toBeVisible();
  await expect(page.locator('[data-edge="south"]').getByRole('button',{name:'End turn',exact:true})).toBeEnabled();
  await reader.getByRole('button',{name:'All trashed cards',exact:true}).click();
  await expect(reader.getByRole('button',{name:'Inspect trashed Hamlet',exact:true})).toBeVisible();
});

for(const layout of ['wide','square'] as const)test(`tabletop ${layout} temples enlarge for worship and share card sizing with the hand`,async({page},info)=>{
  test.skip(info.project.name==='phone','A shared four-edge table is designed for a large display.');
  info.annotations.push({type:'setup',description:'Legal four-seat history cycles ordinary turns until Thaleia has the three coins needed to worship Athena.'});
  if(layout==='square'){const size=page.viewportSize()!.height;await page.setViewportSize({width:size,height:size});}
  let table=freshTable();for(const edge of ['west','north','east','south'] as Edge[])table=occupy(table,edge,'human');
  table=advanceEmptyActions(begin(table,'tabletop-worship-layout'));
  for(let turn=0;turn<20;turn++) {
    const game=replaySetup(table.events),uid=actor(game);
    const temple=game.decks[uid].hand.find(card=>card.cardId==='temple-of-athena');
    if(uid===seatUid('south')&&temple)table=append(table,uid,{type:'action/played',instanceId:temple.id});
    table=append(table,uid,{type:'treasures/played'});
    if(uid===seatUid('south')&&replaySetup(table.events).resources.coins>=3)break;
    table=advanceEmptyActions(append(table,uid,{type:'turn/ended'}));
  }
  const game=replaySetup(table.events);expect(actor(game)).toBe(seatUid('south'));expect(game.resources.coins).toBeGreaterThanOrEqual(3);
  await page.goto('./pantheontt/');
  await page.evaluate(saved=>localStorage.setItem('pantheon-tabletop-v1',saved),JSON.stringify(table));await page.reload();
  await expect(page.getByRole('region',{name:'Shared table'})).toHaveAttribute('data-temple-dock',layout==='wide'?'right':'inline');
  const handWidth=await page.locator('[data-edge="south"] .hand-slot').first().evaluate(node=>(node as HTMLElement).offsetWidth);
  const offerWidth=await page.locator('.supply-face').first().evaluate(node=>(node as HTMLElement).offsetWidth);
  expect(handWidth).toBe(offerWidth);
  for(const card of await page.locator('.play-area .table-card').all())expect(await card.evaluate(node=>(node as HTMLElement).offsetWidth)).toBe(handWidth);
  if(layout==='wide')expect(Number(await page.getByRole('region',{name:'Supply',exact:true}).getAttribute('data-face-up-count'))).toBeGreaterThan(1);
  info.annotations.push({type:'display',description:'Shared tabletop: desktop and 4K displays only.'});
  const story=new TestStepHelper(page,info,'Room for temples and readable worship');
  if(layout==='wide')await story.step('wide-table','Larger hand and offer with temples beside the table',[]);
  const source=page.locator('[data-temple-id="counsel-of-olympus"]');
  const sourceWidth=await source.evaluate(node=>(node as HTMLElement).offsetWidth);
  await page.getByRole('button',{name:'Worship Athena',exact:true}).click();
  const zoom=page.getByRole('region',{name:'Athena worship',exact:true});
  await expect(zoom).toBeVisible();
  expect(await zoom.evaluate(node=>(node as HTMLElement).offsetWidth)).toBeGreaterThan(sourceWidth*1.5);
  const devotion=game.decks[seatUid('south')].play.filter(card=>card.cardId==='temple-of-athena').length;
  await expect(zoom).toContainText(`${devotion} Devotion`);
  if(layout==='wide')await story.step('temple-zoom','Chosen temple exposes its rules and devotion',[]);
  await zoom.getByRole('button',{name:'Worship Athena',exact:true}).click();
  await expect(zoom).toContainText('Choose from the offer.');
  const center=page.getByRole('button',{name:'Center Oracle’s Acolyte',exact:true});
  if(await center.count())await center.click();
  await page.getByRole('button',{name:'Select Oracle’s Acolyte',exact:true}).click();
  await expect(zoom).toHaveCount(0);
  await expect(source).toBeVisible();
  expect(replaySetup(await page.evaluate(()=>JSON.parse(localStorage.getItem('pantheon-tabletop-v1')!).events)).resources.worship).toBe(game.resources.worship-1);
  // Replay the same legal starting position to exercise hand selection and completion on the temple.
  await page.evaluate(saved=>localStorage.setItem('pantheon-tabletop-v1',saved),JSON.stringify(table));await page.reload();
  await page.getByRole('button',{name:'Worship Demeter',exact:true}).click();
  const demeter=page.getByRole('region',{name:'Demeter worship',exact:true});
  await demeter.getByRole('button',{name:'Worship Demeter',exact:true}).click();
  const target=page.locator('.inline-choice');
  await expect(target).toContainText('Choose up to 1 card to trash');
  await page.locator('[data-edge="south"]').getByRole('button',{name:'Select Hamlet',exact:true}).click();
  await target.getByRole('button',{name:'Done trashing (1)',exact:true}).click();
  await expect(demeter).toHaveCount(0);
  expect(replaySetup(await page.evaluate(()=>JSON.parse(localStorage.getItem('pantheon-tabletop-v1')!).events)).trash.map(card=>card.cardId)).toContain('hamlet');
  const purchase=append(table,actor(game),{type:'card/bought',cardId:'obol'});
  await page.evaluate(saved=>localStorage.setItem('pantheon-tabletop-v1',saved),JSON.stringify(purchase));await page.reload();
  expect(await page.locator('.purchased .table-card').evaluate(node=>(node as HTMLElement).offsetWidth)).toBe(handWidth);
  const played=await page.locator('.played').boundingBox(),purchased=await page.locator('.purchased').boundingBox();
  expect(purchased!.x).toBeGreaterThan(played!.x+played!.width);


});

for(const edge of ['south','west','north','east'])for(const scenario of ['seed-keeper','harvest-feast'])test(`tabletop ${edge} ${scenario} stages cards centrally before confirmation`,async({page},info)=>{
  test.skip(info.project.name==='phone','The shared tabletop needs a large display.');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(`./dev/animations/?surface=tabletop&edge=${edge}&scenario=${scenario}&players=4`);
  const trigger=page.getByRole('button',{name:'Trigger',exact:true});
  // Settle the initial table rotation before timing the card-play interaction.
  await expect(trigger).toBeEnabled();
  if(scenario==='harvest-feast')await observeDraws(page,'.table-hand[data-face-up="true"]');
  await trigger.click();
  if(scenario==='harvest-feast'){
    // The discard prompt follows both draws, not the initial card play.
    await expect(page.locator('[data-motion-kind="draw"]').first()).toBeVisible();
    await waitForDraws(page,1);
    await waitForDraws(page,2);
    await drawFrames(page);
  }
  const target=page.locator('.inline-choice');
  await expect(target).toBeVisible();await expect(target).toHaveAttribute('aria-busy','false');
  const hand=page.locator(`[data-edge="${edge}"] .table-hand`);
  const count=scenario==='seed-keeper'?2:1;
  for(let i=0;i<count;i++){
    await hand.getByRole('button',{name:/^Select /}).and(hand.locator('button:not(:disabled)')).first().click();
    await expect(target).toHaveAttribute('aria-busy','false');
    await expect(target.locator('.staged-card')).toHaveCount(i+1);
    await expect(hand.locator('.hand-slot.staged')).toHaveCount(i+1);
    if(i===0&&scenario==='seed-keeper'){
      await target.getByRole('button',{name:/^Return .* to hand$/}).click();
      await expect(target).toHaveAttribute('aria-busy','false');
      await expect(hand.locator('.hand-slot.staged')).toHaveCount(0);
      await hand.getByRole('button',{name:/^Select /}).and(hand.locator('button:not(:disabled)')).first().click();
      await expect(target).toHaveAttribute('aria-busy','false');
    }

  }
  await expect(target).toBeVisible();
  if(edge==='south'){
    info.annotations.push({type:'display',description:'Shared tabletop: desktop and 4K displays only.'},{type:'setup',description:'The animation lab prepares a seeded legal card history using the real tabletop surface.'});
    const story=new TestStepHelper(page,info,'Choose cards at the table');
    await story.step('staged','Selected cards gather on the central target before confirmation',[]);
  }
  await target.getByRole('button',{name:scenario==='seed-keeper'?'Done trashing (2)':'Discard selected (1)',exact:true}).click();
  await expect(target).toHaveCount(0);
  await expect(hand.locator('.hand-slot.staged')).toHaveCount(0);
});

for(const difficulty of ['standard','hard','expert'] as const)for(const {leader,humans,next} of [{leader:'Melia',humans:['Nereon','Doreios','Thaleia'],next:'south'},{leader:'Thaleia',humans:['Nereon','Doreios','Melia'],next:'north'},{leader:'Nereon',humans:['Doreios','Melia','Thaleia'],next:'south'},{leader:'Doreios',humans:['Melia','Thaleia','Nereon'],next:'west'}])test(`tabletop ${difficulty} ${leader} takes its turn through the real worker`,async({page},info)=>{
 test.skip(info.project.name==='phone','A shared four-edge table is designed for a large display.');
 // A fixed shuffle makes every tier/leader opening reproducible on each renderer.
 await page.addInitScript(()=>{crypto.randomUUID=()=> 'a664ccf0-4aa8-4a36-8f97-c8894023be42';});
 await page.goto('./pantheontt/');
 // Reserve every other leader so random drafting exercises this model legally.
 for(const human of humans)await page.getByRole('button',{name:`Join ${human}`,exact:true}).click();
 await page.getByRole('button',{name:`Add bot as ${leader}`,exact:true}).click();
 await page.getByLabel(`Bot difficulty for ${leader}`).selectOption(difficulty);
 await page.getByRole('button',{name:'Play facing Melia',exact:true}).click();
 await expect(page.locator('main')).toHaveAttribute('data-tabletop-phase','playing');
 // A turn contains multiple decisions. Require each persisted command to make
 // progress within the operation limit, then check the visual handoff separately.
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pantheon-tabletop-v1')!));
 const first=replaySetup(saved.events),botUid=Object.keys(first.leaders).find(uid=>first.leaders[uid]===leader.toLowerCase())!;
 const startSequence=saved.events.length;
 while(!saved.events.some((event:{type:string;actorUid:string})=>event.type==='turn/ended'&&event.actorUid===botUid)){
  expect(saved.events.length-startSequence,'An opening bot turn must finish within 64 commands').toBeLessThan(64);
  const sequence=saved.events.length;
  await expect.poll(async()=>{saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pantheon-tabletop-v1')!));return saved.events.length;},
   {timeout:2000,message:`${difficulty} ${leader} must advance after command ${sequence}`}).toBeGreaterThan(sequence);
 }
 await expect(page.getByRole('region',{name:'Shared table'})).toHaveAttribute('data-facing',next);
 const game=replaySetup(saved.events),uid=Object.keys(game.leaders).find(uid=>game.leaders[uid]===leader.toLowerCase())!;
 expect(game.players.find(p=>p.uid===uid)?.botKind).toBe(difficulty);
 expect(game.turn.turns[uid]).toBe(1);
 await page.reload();
 await expect(page.getByRole('region',{name:'Shared table'})).toHaveAttribute('data-facing',next);
});
