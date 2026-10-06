import { test, expect } from './helpers/fixtures';
import { TestStepHelper } from './helpers/test-step-helper';
import { freshTable, occupy, begin, advanceEmptyActions, seatUid, type Edge } from '../../src/lib/tabletop/table';
import { replaySetup } from '../../src/lib/game/setup';

for (const count of [2, 4] as const) test(`tabletop ${count} players join their edges and keep reverse join order`, async ({page},info)=>{
  test.skip(info.project.name==='phone','A shared four-edge table is designed for a large display.');
  await page.goto('./pantheontt/');
  const order:Edge[]=count===2?['south','west']:['north','east','south','west'];
  for(const edge of order)await page.getByRole('button',{name:new RegExp(`^Join ${edge[0].toUpperCase()+edge.slice(1)} as`)}).click();
  info.annotations.push({type:'display',description:'Shared tabletop: desktop and 4K displays only.'});
  const story=new TestStepHelper(page,info,'Gather at the shared table');
  await story.step('gather','Players join leaders from their own edge',[
    {spec:'Every joined edge can leave before the game starts',check:()=>expect(page.getByRole('button',{name:/^Leave .* seat$/})).toHaveCount(count)},
    {spec:'A Play button faces every edge',check:()=>expect(page.getByRole('button',{name:/^Play facing/})).toHaveCount(4)}
  ]);
  await page.getByRole('button',{name:'Play facing South',exact:true}).click();
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
  for(const name of ['South','North','East'])await page.getByRole('button',{name:new RegExp(`^Join ${name} as`)}).click();
  await page.getByRole('checkbox',{name:'Randomize play order',exact:true}).first().check();
  await page.getByRole('button',{name:'Play facing South',exact:true}).click();
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
  await page.getByRole('button',{name:/^Join South as/}).click();
  await page.getByRole('button',{name:'Add bot at North',exact:true}).click();
  await page.getByRole('button',{name:'Play facing South',exact:true}).click();
  await expect(page.locator('main')).toHaveAttribute('data-tabletop-phase','playing');
  await expect(page.getByRole('region',{name:'Shared table'})).toHaveAttribute('data-facing','south');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pantheon-tabletop-v1')!));
  const game=replaySetup(saved.events);
  expect(game.turn.turns[seatUid('north')]).toBe(1);
  expect(game.players.find(player=>player.uid===seatUid('north'))?.botKind).toBe('engine');
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
  await expect(board).toHaveCSS('transform','matrix(0, 1, -1, 0, 0, 0)');
  const centered=page.locator('.buy-card[data-centered="true"]');
  const before=await centered.getAttribute('data-supply-id');
  const box=await centered.boundingBox();expect(box).not.toBeNull();
  await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);
  await page.mouse.down();
  await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2-box!.height*1.25,{steps:8});
  await page.mouse.up();
  await expect(centered).not.toHaveAttribute('data-supply-id',before!);
  await page.locator('[data-edge="west"]').getByRole('button',{name:'End turn',exact:true}).click();
  await expect(board).toHaveAttribute('data-facing','east');
  await expect(board).toHaveAttribute('aria-busy','false');
  await expect(board).toHaveCSS('transform','matrix(0, -1, 1, 0, 0, 0)');
  await expect(page.locator('[data-edge="east"] .flip').first()).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');
  await expect(page.locator('[data-edge="east"]').getByRole('button',{name:'End turn',exact:true})).toBeEnabled();
});
