import {openWorship,openWorshipDrawer,browseChoice} from '../helpers/table-controls';
import {enterTreasures,browseSupply} from '../helpers/supply-controls';
import {createHash} from 'node:crypto';
import {test,expect} from '../helpers/fixtures';
import type {Page} from '@playwright/test';
import {TestStepHelper} from '../helpers/test-step-helper';
import {actionTable,playCard as playAction,readEvents} from '../helpers/action-history';
import {replaySetup} from '../../../src/lib/game/setup';
import {newPlayerContext} from '../helpers/players';

// Use the same reviewed recorded history on every viewport; room codes stay isolated.
const worshipTable:typeof actionTable=(page,info,subject,leader='thaleia',options={})=>{
  const title=`${info.title}/${subject}/${leader}/${options.reveal??''}${options.empty?`/empty-${options.empty}`:''}${(options.count??2)===2?'':`/${options.count}`}`;
  let entropy=BigInt(`0x${createHash('sha256').update(`desktop/${title}`).digest('hex').slice(0,32)}`),code='';
  for(let i=0;i<5;i++){code+=String.fromCharCode(65+Number(entropy%26n));entropy/=26n;}
  return actionTable(page,info,subject,leader,{...options,seed:`actions-${code}`});
};
// Favor is a visible event: its glint must appear and finish, even when
// the player cannot yet pay. Check that effect before photographing its resting glow.
async function playCard(page:Page,id:string){
  const favored=page.locator('.worship-drawer [data-favored="true"]');
  const before=await favored.evaluateAll(nodes=>nodes.map(node=>(node.closest('[data-god-event]') as HTMLElement).dataset.godEvent));
  await playAction(page,id);
  const after=await favored.evaluateAll(nodes=>nodes.map(node=>(node.closest('[data-god-event]') as HTMLElement).dataset.godEvent));
  for(const event of after.filter(event=>!before.includes(event))){
    const glint=page.locator(`[data-god-event="${event}"] .glint`);
    await expect(glint).toHaveCount(1);
    await expect(glint).toHaveCSS('animation-duration','1.375s');
    await expect.poll(()=>glint.evaluate(node=>node.getAnimations().every(animation=>animation.playState==='finished'))).toBe(true);
  }
}
const step=(steps:TestStepHelper,id:string,text:string,check:()=>Promise<unknown>)=>steps.step(id,text,[{spec:text,check}]);
async function wealth(page:Page){await page.bringToFront();await enterTreasures(page);await page.getByRole('button',{name:'Play all Treasures',exact:true}).click();await expect(page.getByRole('button',{name:'Play all Treasures',exact:true})).toHaveCount(0);await expect(page.locator('.supply-coverflow')).toHaveAttribute('aria-busy','false');}

test('Athena rewards two matching Actions with a five-cost topdeck gain',async({page},info)=>{
  const fixture=await worshipTable(page,info,'oracles-acolyte','thaleia',{extra:['temple-of-athena'],wealth:3});
  const steps=new TestStepHelper(page,info,'Earn Athena’s favor');
  await step(steps,'opening','Ariadne prepares to play her Temple and Acolyte',async()=>expect(page.getByRole('button',{name:'To Treasures',exact:true})).toBeEnabled());
  await playCard(page,'temple-of-athena');await step(steps,'temple','The Temple grants another Worship',async()=>expect(page.locator('.resources [data-resource=worship]')).toHaveAttribute('data-value','2'));
  await playCard(page,'oracles-acolyte');await step(steps,'acolyte','The Acolyte joins the Temple in play',async()=>expect(page.locator('.played-cards [data-card-id]')).toHaveCount(2));
  await wealth(page);await step(steps,'wealth','Ariadne plays wealth to pay Athena',async()=>expect(page.locator('.turn-marker')).toContainText('Treasures'));
  await openWorship(page,'Counsel of Olympus');
  await step(steps,'favored','Two matching Actions connect to Athena’s Favored effect',async()=>{await expect(page.locator('.card-controls').getByText('Favored · 2 Devotion',{exact:true})).toBeVisible();await expect(page.locator('.worship-overlay [data-favored-playable]')).toHaveAttribute('data-favored-playable','true');});
  await page.getByRole('button',{name:'Worship Athena',exact:true}).click();
  await step(steps,'gain','Athena offers only Actions costing up to five',async()=>{await expect(page.locator('.card-controls [role=status]')).toContainText('Choose an Action costing up to 5');});
  await (await browseChoice(page,'Sacred Academy')).click();await step(steps,'selected','Ariadne selects the five-cost Sacred Academy',async()=>expect(page.getByRole('button',{name:'Gain selected card',exact:true})).toBeEnabled());
  await page.getByRole('button',{name:'Gain selected card',exact:true}).click();await step(steps,'paid','Ariadne returns to the altar with one Worship remaining',async()=>{await expect(page.locator('.worship-overlay')).toHaveCount(0);await expect(page.locator('.resources [data-resource=worship]')).toHaveAttribute('data-value','1');await expect(page.locator('.resources [data-resource=buys]')).toHaveAttribute('data-value','1');});
  const state=replaySetup(await readEvents(fixture.code));expect(state.decks[fixture.host].deck[0].cardId).toBe('sacred-academy');expect(state.turn.phase).toBe('treasures');
});

test('Poseidon can be worshipped in Actions and again after a purchase without spending a Buy',async({page,browser},info)=>{
  const context=await newPlayerContext(browser,{viewport:info.project.use.viewport,baseURL:info.project.use.baseURL}),other=await context.newPage();
  try{
    const fixture=await worshipTable(page,info,'sea-trade','nereon',{extra:['temple-of-poseidon'],wealth:3,other});
    const steps=new TestStepHelper(page,info,'Return to Poseidon twice');
    await step(steps,'opening','Ariadne holds her Temple, Sea Trade, and enough wealth for later',async()=>expect(page.getByRole('button',{name:'To Treasures',exact:true})).toBeEnabled());
    await playCard(page,'temple-of-poseidon');await step(steps,'temple','Nereon’s Temple adds Worship and a Coin',async()=>expect(page.locator('.resources [data-resource=coins]')).toHaveAttribute('data-value','1'));
    await playCard(page,'sea-trade');await step(steps,'sea-trade','Sea Trade provides the third Coin before leaving Actions',async()=>expect(page.locator('.resources [data-resource=coins]')).toHaveAttribute('data-value','3'));
    await openWorship(page,'Tribute of the Tides');await step(steps,'favored','Poseidon’s two contributing Actions unlock his Favored effect',async()=>{await expect(page.locator('.card-controls').getByText('Favored · 2 Devotion',{exact:true})).toBeVisible();await expect(page.locator('.worship-overlay [data-favored-playable]')).toHaveAttribute('data-favored-playable','true');});
    await page.emulateMedia({reducedMotion:'no-preference'});
    await openWorshipDrawer(other);await other.emulateMedia({reducedMotion:'no-preference'});
    await other.evaluate(()=>{const animate=Element.prototype.animate;(window as unknown as {altarFlashes:number}).altarFlashes=0;Element.prototype.animate=function(frames,options){if(this.matches('[data-god-event="tribute-of-the-tides"]'))(window as unknown as {altarFlashes:number}).altarFlashes++;return animate.call(this,frames,options);};});
    await page.evaluate(()=>{const animate=Element.prototype.animate;(window as unknown as {worshipFlashes:number}).worshipFlashes=0;Element.prototype.animate=function(frames,options){if(this.matches('.worship-overlay'))(window as unknown as {worshipFlashes:number}).worshipFlashes++;return animate.call(this,frames,options);};});
    await page.getByRole('button',{name:'Worship Poseidon',exact:true}).click();await expect(page.locator('.worship-overlay')).toHaveCount(0);await expect.poll(()=>page.evaluate(()=>(window as unknown as {worshipFlashes:number}).worshipFlashes)).toBe(1);await step(steps,'first-worship','A Drachma goes onto the deck and an extra Buy is granted',async()=>{await expect(page.locator('.resources [data-resource=buys]')).toHaveAttribute('data-value','3');await expect(page.locator('.resources [data-resource=coins]')).toHaveAttribute('data-value','0');await expect(page.locator('[data-god-event="tribute-of-the-tides"] [data-favored-playable]')).toHaveAttribute('data-favored-playable','false');});
    await other.bringToFront();
    await expect.poll(()=>other.evaluate(()=>(window as unknown as {altarFlashes:number}).altarFlashes)).toBe(1);
    await expect.poll(()=>other.locator('[data-god-event="tribute-of-the-tides"]').evaluate(altar=>altar.getAnimations().every(animation=>animation.playState==='finished'))).toBe(true);
    await steps.step('observer','Theseus sees the public Drachma and topdeck destination',[{spec:'The gained face is public while the remaining hand stays hidden.',check:async()=>{await expect(other.locator('.outcome [data-card-id]')).toHaveAttribute('data-card-id','drachma');await expect(other.locator('.outcome [data-resource=topdeck]')).toBeVisible();await expect(other.locator('.opponents [data-card-id]')).toHaveCount(0);}}],{page:other,player:'Theseus'});
    await page.bringToFront();
    await expect(page.locator('.worship-overlay')).toHaveCount(0);await step(steps,'same-phase','The completed Actions have automatically entered Treasures',async()=>expect(page.locator('.turn-marker')).toContainText('Treasures'));
    await wealth(page);await step(steps,'treasures','Ariadne plays the Treasures she kept',async()=>expect(page.locator('.turn-marker')).toContainText('Treasures'));
    await expect(page.locator('.supply-coverflow')).toBeVisible();await browseSupply(page,'Obol');await step(steps,'supply','Obol is available for a zero-Coin purchase',async()=>expect(page.getByRole('button',{name:'Buy Obol',exact:true})).toBeEnabled());
    await page.getByRole('button',{name:'Buy Obol',exact:true}).click();await step(steps,'buy','Buying the Obol spends one Buy and starts Buys',async()=>{await expect(page.locator('.resources [data-resource=buys]')).toHaveAttribute('data-value','2');await expect(page.getByRole('button',{name:'Inspect purchased Obol',exact:true})).toBeVisible();await expect(page.locator('.played-card').last()).toHaveCSS('opacity','1');await expect(page.locator('.public-flight[data-motion-kind="gain"]')).toHaveCount(0);});
    await expect(page.locator('.supply-coverflow')).toBeVisible();await openWorship(page,'Tribute of the Tides');await step(steps,'again','The same shared god can be worshipped again during Buys',async()=>expect(page.getByRole('button',{name:'Worship Poseidon',exact:true})).toBeEnabled());
    let dropped=false;await page.context().route(url=>url.pathname.endsWith('/documents:commit'),async route=>{if(dropped){await route.continue();return;}const response=await route.fetch({timeout:2000});expect(response.ok()).toBe(true);dropped=true;await route.abort('connectionreset');});
    await page.getByRole('button',{name:'Worship Poseidon',exact:true}).click();await expect(page.locator('.worship-overlay')).toHaveCount(0);await expect.poll(()=>page.evaluate(()=>(window as unknown as {worshipFlashes:number}).worshipFlashes)).toBe(3);await step(steps,'second-worship','The second Worship is paid once despite an interrupted acknowledgement',async()=>{await expect(page.locator('.resources [data-resource=worship]')).toHaveAttribute('data-value','0');await expect(page.locator('.resources [data-resource=buys]')).toHaveAttribute('data-value','3');await expect(page.locator('.worship-overlay')).toHaveCount(0);await expect(page.locator('[data-god-event="tribute-of-the-tides"] [data-favored-playable]')).toHaveAttribute('data-favored-playable','false');});
    expect(dropped).toBe(true);await expect.poll(()=>other.evaluate(()=>(window as unknown as {altarFlashes:number}).altarFlashes)).toBe(2);expect(await page.evaluate(()=>(window as unknown as {worshipFlashes:number}).worshipFlashes)).toBe(3);await expect(page.locator('.worship-overlay')).toHaveCount(0);await page.reload();await step(steps,'restored','Returning preserves both topdeck gains and the Buy phase',async()=>expect(page.locator('.turn-marker')).toContainText('Buys'));
    const events=await readEvents(fixture.code),state=replaySetup(events);expect(events.filter(event=>event.type==='god/worshipped')).toHaveLength(2);expect(state.decks[fixture.host].deck.slice(0,2).map(card=>card.cardId)).toEqual(['drachma','drachma']);expect(state.resources.worship).toBe(0);
  }finally{await context.close();}
});

for(const gain of [true,false])test(`Demeter allows no trash and ${gain?'a zero-cost gain':'no gain'} while still granting a Buy`,async({page},info)=>{
  const fixture=await worshipTable(page,info,'sacred-grove','melia',{extra:['temple-of-demeter'],wealth:3});const steps=new TestStepHelper(page,info,'Choose Demeter’s gifts');
  await step(steps,'opening','Ariadne prepares the Temple and Sacred Grove',async()=>expect(page.getByRole('button',{name:'To Treasures',exact:true})).toBeEnabled());
  await playCard(page,'temple-of-demeter');await step(steps,'temple','Melia draws after the Temple finishes',async()=>expect(page.locator('.resources [data-resource=worship]')).toHaveAttribute('data-value','2'));
  await playCard(page,'sacred-grove');await step(steps,'grove-choice','Sacred Grove first requires its own gain',async()=>expect(page.locator('.inline-choice')).toContainText('Sacred Grove'));
  const groveObol=await browseChoice(page,'Obol');await step(steps,'grove-selected','Ariadne selects Obol for the Grove',async()=>expect(groveObol).toBeEnabled());await groveObol.click();
  await step(steps,'grove-finished','The Grove resolves fully before Worship is available',async()=>expect(page.locator('.inline-choice')).toHaveCount(0));
  await wealth(page);await step(steps,'wealth','Ariadne pays for Worship using her Treasures',async()=>expect(page.locator('.turn-marker')).toContainText('Treasures'));
  await openWorship(page,'Blessing of the Fields');await step(steps,'favored','Demeter offers optional trash and gain plus an unconditional Buy',async()=>expect(page.locator('.card-controls').getByText('Favored · 2 Devotion',{exact:true})).toBeVisible());
  await page.getByRole('button',{name:'Worship Demeter',exact:true}).click();
  await expect(page.locator('.worship-overlay')).toBeVisible();
  await expect(page.locator('.worship-overlay')).toHaveAttribute('aria-busy','false');
  await expect.poll(async()=>await page.getByRole('button',{name:'Trash none',exact:true}).isVisible()||await page.getByRole('button',{name:'Gain none',exact:true}).isVisible()).toBe(true);
  // The hand may be empty after playing all wealth; an empty trash choice resolves itself.
  if(await page.getByRole('button',{name:'Trash none',exact:true}).isVisible()){
    await step(steps,'trash','Ariadne can choose up to two cards or trash none',async()=>expect(page.getByRole('button',{name:'Trash none',exact:true})).toBeEnabled());await page.getByRole('button',{name:'Trash none',exact:true}).click();
  }
  await step(steps,'zero-limit','Trashing nothing still offers an optional cost-zero gain',async()=>{await expect(page.locator('.card-controls [role=status]')).toContainText('Choose a card costing up to 0');await expect(page.getByRole('button',{name:'Gain none',exact:true})).toBeEnabled();});
  if(gain){await (await browseChoice(page,'Obol')).click();await step(steps,'selected','Ariadne chooses the free Obol',async()=>expect(page.getByRole('button',{name:'Gain selected card',exact:true})).toBeEnabled());await page.getByRole('button',{name:'Gain selected card',exact:true}).click();}else await page.getByRole('button',{name:'Gain none',exact:true}).click();
  await step(steps,'buy-granted','Demeter grants the extra Buy after the optional choices',async()=>{await expect(page.locator('.worship-overlay')).toHaveCount(0);await expect(page.locator('.resources [data-resource=buys]')).toHaveAttribute('data-value','2');});
  const state=replaySetup(await readEvents(fixture.code));expect(state.turn.choice).toBeNull();expect(state.trash).toHaveLength(0);expect(state.resources.buys).toBe(2);
});

for(const favored of [false,true])test(`Ares ${favored?'Favored':'Standard'} upgrades a trashed Hamlet by ${favored?3:1}`,async({page},info)=>{
  const fixture=await worshipTable(page,info,favored?'bronze-recruit':'temple-of-ares','doreios',{extra:favored?['temple-of-ares','hamlet']:['hamlet'],wealth:favored?2:4});const steps=new TestStepHelper(page,info,'Accept the Trial of the Spear');
  await step(steps,'opening','Ariadne holds a Hamlet to offer Ares',async()=>expect(page.getByRole('button',{name:'To Treasures',exact:true})).toBeEnabled());
  await playCard(page,'temple-of-ares');await step(steps,'leader-choice','Doreios’s optional trash must finish before Worship',async()=>expect(page.locator('.inline-choice')).toContainText('Doreios'));
  await page.getByRole('button',{name:'Done trashing',exact:true}).click();await step(steps,'leader-finished','Ariadne keeps her Hamlet for Ares',async()=>expect(page.locator('.inline-choice')).toHaveCount(0));
  if(favored){await playCard(page,'bronze-recruit');await step(steps,'recruit','Bronze Recruit adds two Coins and a second Devotion',async()=>{await expect(page.locator('.resources [data-resource=coins]')).toHaveAttribute('data-value','2');await expect(page.locator('.turn-marker')).toContainText('Treasures');});}
  await wealth(page);await step(steps,'wealth','Ariadne has enough Coins for the Trial',async()=>expect(page.locator('.turn-marker')).toContainText('Treasures'));
  await openWorship(page,'Trial of the Spear');await step(steps,'trial','The altar identifies which version of the Trial will resolve',async()=>expect(page.locator('.card-controls p').first()).toContainText(favored?'Favored':'Standard'));
  await page.getByRole('button',{name:'Worship Ares',exact:true}).click();await step(steps,'offering','Ares permits one card from the hand to be trashed',async()=>expect(page.getByRole('button',{name:'Trash none',exact:true})).toBeEnabled());
  await (await browseChoice(page,'Hamlet')).click();await step(steps,'selected','Ariadne selects her Hamlet as the offering',async()=>expect(page.getByRole('button',{name:'Trash 1',exact:true})).toBeEnabled());await page.getByRole('button',{name:'Trash 1',exact:true}).click();
  await step(steps,'upgrade','The trashed Hamlet sets the gain limit',async()=>expect(page.locator('.card-controls [role=status]')).toContainText(`Choose a card costing up to ${favored?5:3}`));
  await (await browseChoice(page,'Obol')).click();await step(steps,'cheaper','Ariadne can choose a cheaper card than the limit',async()=>expect(page.getByRole('button',{name:'Gain selected card',exact:true})).toBeEnabled());await page.getByRole('button',{name:'Gain selected card',exact:true}).click();
  await step(steps,'resolved','The event finishes without triggering Doreios again',async()=>{await expect(page.locator('.worship-overlay')).toHaveCount(0);await expect(page.locator('.resources [data-resource=worship]')).toHaveAttribute('data-value','1');});
  const state=replaySetup(await readEvents(fixture.code));expect(state.trash.at(-1)?.cardId).toBe('hamlet');expect(state.turn.choice).toBeNull();
});

test('Demeter combines the costs of two offerings to gain a Territory',async({page},info)=>{
  const fixture=await worshipTable(page,info,'sacred-grove','melia',{extra:['temple-of-demeter','hamlet','drachma'],wealth:4,reveal:'other'});const steps=new TestStepHelper(page,info,'Trade two offerings for a Polis');
  await step(steps,'opening','Ariadne holds her Temple, Grove, Hamlet, and wealth',async()=>expect(page.getByRole('button',{name:'To Treasures',exact:true})).toBeEnabled());
  await playCard(page,'temple-of-demeter');await step(steps,'temple','Melia draws another Treasure after the Temple',async()=>expect(page.locator('.resources [data-resource=worship]')).toHaveAttribute('data-value','2'));
  await playCard(page,'sacred-grove');await step(steps,'grove','Resolve the Grove’s separate gain first',async()=>expect(page.locator('.inline-choice')).toContainText('Sacred Grove'));
  const groveObol=await browseChoice(page,'Obol');await step(steps,'grove-selected','Choose Obol for the Grove',async()=>expect(groveObol).toBeEnabled());await groveObol.click();
  await enterTreasures(page);
  await step(steps,'treasures','Ariadne keeps a Drachma and Hamlet in hand for the offering',async()=>expect(page.locator('.turn-marker')).toContainText('Treasures'));
  await playCard(page,'drachma');await step(steps,'drachma','One Drachma provides two Coins',async()=>expect(page.locator('.resources [data-resource=coins]')).toHaveAttribute('data-value','2'));
  const next=await page.locator('.hand [data-card-id="obol"]').count()?'obol':'drachma';await playCard(page,next);await step(steps,'funded','A second Treasure funds Worship while two offerings remain',async()=>expect(page.getByRole('button',{name:'End turn',exact:true})).toBeEnabled());
  await openWorship(page,'Blessing of the Fields');await step(steps,'favored','Two Demeter Actions unlock the combined-cost gift',async()=>expect(page.locator('.card-controls').getByText('Favored · 2 Devotion',{exact:true})).toBeVisible());await page.getByRole('button',{name:'Worship Demeter',exact:true}).click();
  await step(steps,'offerings','Choose up to two cards from the retained hand',async()=>expect(page.getByRole('button',{name:'Trash none',exact:true})).toBeEnabled());
  await (await browseChoice(page,'Hamlet')).click();await (await browseChoice(page,'Drachma')).click();await step(steps,'selected','The Hamlet and Drachma are selected together',async()=>expect(page.getByRole('button',{name:'Trash 2',exact:true})).toBeEnabled());await page.getByRole('button',{name:'Trash 2',exact:true}).click();
  await step(steps,'combined','Two plus three permits any available card costing up to five',async()=>expect(page.locator('.card-controls [role=status]')).toContainText('Choose a card costing up to 5'));
  await browseChoice(page,'Polis');await step(steps,'territory','The market includes a Territory, not just Actions',async()=>expect(page.getByRole('button',{name:'Select Polis',exact:true})).toBeVisible());
  await (await browseChoice(page,'Polis')).click();await step(steps,'polis','Ariadne selects a Polis',async()=>expect(page.getByRole('button',{name:'Gain selected card',exact:true})).toBeEnabled());await page.getByRole('button',{name:'Gain selected card',exact:true}).click();
  await step(steps,'gift','The Polis enters discard and the bonus Buy is granted',async()=>{await expect(page.locator('.worship-overlay')).toHaveCount(0);await expect(page.locator('.resources [data-resource=buys]')).toHaveAttribute('data-value','2');});
  const state=replaySetup(await readEvents(fixture.code));expect(state.trash.map(card=>card.cardId).sort()).toEqual(['drachma','hamlet']);expect(state.decks[fixture.host].discard.at(-1)?.cardId).toBe('polis');
});

test('four shared gods and three Devotion remain readable in the vertical coverflow',async({page},info)=>{
  await worshipTable(page,info,'harbor-pilot','nereon',{extra:['temple-of-poseidon','sea-trade'],count:4});const steps=new TestStepHelper(page,info,'Read a crowded altar');
  await step(steps,'opening','Four bloodlines share their gods',async()=>expect(page.locator('.worship-coverflow button')).toHaveCount(4));
  for(const [id,name] of [['temple-of-poseidon','Temple'],['harbor-pilot','Harbor Pilot'],['sea-trade','Sea Trade']]){await playCard(page,id);await step(steps,id,`${name} contributes to Poseidon`,async()=>expect(page.locator(`.played-cards [data-card-id="${id}"]`)).toBeVisible());}
  await openWorship(page,'Tribute of the Tides');
  await step(steps,'three-devotion','Three played Actions give Poseidon three Devotion',async()=>{await expect(page.locator('.card-controls p').first()).toHaveText('Favored · 3 Devotion');await expect(page.locator('.played-cards [data-card-id]')).toHaveCount(3);});
  await page.getByRole('button',{name:'Return worship card',exact:true}).click();
  await step(steps,'return','The worship card returns to the shared stack',async()=>expect(page.locator('.worship-overlay')).toHaveCount(0));
  await openWorship(page,'Counsel of Olympus');
  await step(steps,'another-god','Another shared god offers its Standard effect with zero Devotion',async()=>{await expect(page.locator('.card-controls p').first()).toHaveText('Standard · 0 Devotion');await expect(page.getByRole('button',{name:'Worship Athena',exact:true})).toBeEnabled();await expect(page.locator('.resources [data-resource=worship]')).toHaveAttribute('data-value','2');});
});

test('Poseidon keeps the payment and grants his Favored Buy when Drachmas are exhausted',async({page},info)=>{
  const fixture=await worshipTable(page,info,'sea-trade','nereon',{extra:['temple-of-poseidon'],empty:'drachma'}),steps=new TestStepHelper(page,info,'Worship at an empty pile');
  await step(steps,'opening','The shared Drachma supply is exhausted',async()=>expect(page.getByRole('button',{name:'To Treasures',exact:true})).toBeEnabled());
  await playCard(page,'temple-of-poseidon');await step(steps,'temple','Nereon’s Temple provides the first Coin',async()=>expect(page.locator('.resources [data-resource=coins]')).toHaveAttribute('data-value','1'));
  await playCard(page,'sea-trade');await step(steps,'trade','Sea Trade funds Worship and provides the second Devotion',async()=>expect(page.locator('.resources [data-resource=coins]')).toHaveAttribute('data-value','3'));
  await openWorship(page,'Tribute of the Tides');await step(steps,'altar','The event remains available even though it cannot gain a Drachma',async()=>expect(page.getByRole('button',{name:'Worship Poseidon',exact:true})).toBeEnabled());
  await page.getByRole('button',{name:'Worship Poseidon',exact:true}).click();await step(steps,'gift','The bonus Buy still arrives and the payment is not refunded',async()=>{await expect(page.locator('.resources [data-resource=buys]')).toHaveAttribute('data-value','3');await expect(page.locator('.resources [data-resource=coins]')).toHaveAttribute('data-value','0');await expect(page.locator('[data-god-event="tribute-of-the-tides"] [data-favored-playable]')).toHaveAttribute('data-favored-playable','false');});
  const state=replaySetup(await readEvents(fixture.code));expect(state.supply.drachma).toBe(0);expect(state.resources.worship).toBe(1);expect(state.turn.choice).toBeNull();
});
