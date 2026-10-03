import {test,expect} from '../helpers/fixtures';
import {roomCodeFixture} from '../helpers/room-code-fixture';
import {TestStepHelper} from '../helpers/test-step-helper';
import {setMotionPreference} from '../helpers/motion-preference';
import {openPlayers,closePlayers} from '../helpers/table-controls';

test('invite an Engine bot to the real table and take turns together',async({page},info)=>{
 await roomCodeFixture(page,info,'shared-bot-story');
 const steps=new TestStepHelper(page,info,'A bot at the real table');
 await page.goto('./play/');
 await expect(page.locator('[data-status]')).toHaveAttribute('data-status','synced');
 await page.getByLabel('Your name',{exact:true}).fill('Ariadne');
 await page.getByRole('button',{name:'Create table',exact:true}).click();
 await steps.step('created','Ariadne opens a normal two-player table',[{spec:'Her host seat is occupied and another player can join.',check:async()=>{await expect(page.getByTestId('player-seat')).toHaveCount(1);await expect(page.getByText('Waiting for a player')).toBeVisible();}}]);
 await page.getByRole('button',{name:'Invite friends',exact:true}).click();
 await page.getByLabel('Bot strategy',{exact:true}).selectOption('classic-engine');
 await steps.step('invite','Choose the historical Engine as a table guest',[{spec:'The same invitation dialog offers a human invitation and a bot seat.',check:async()=>{await expect(page.getByRole('button',{name:'Copy invitation',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Invite bot',exact:true})).toBeEnabled();}}]);
 await page.getByRole('button',{name:'Invite bot',exact:true}).click();
 await expect(page.getByTestId('player-seat')).toHaveCount(2);
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await steps.step('joined','The bot occupies its own seat',[{spec:'Both seats are filled and the host can begin.',check:async()=>{await expect(page.getByTestId('player-seat').last()).toContainText('Classic Engine bot 2');await expect(page.getByRole('button',{name:'Begin',exact:true})).toBeEnabled();}}]);
 await page.getByRole('button',{name:'Begin',exact:true}).click();
 await steps.step('draft','The bot chooses a free bloodline when its draft turn arrives',[{spec:'Ariadne receives her normal draft choice.',check:async()=>expect(page.locator('.choose button')).toBeEnabled()}]);
 await page.locator('.choose button').click();
 await expect(page.getByRole('button',{name:'Play all Treasures',exact:true})).toBeEnabled();
 await steps.step('playing','Ariadne plays on the same table as her bot opponent',[{spec:'The normal table shows her private hand and one opponent, without a separate practice toolbar.',check:async()=>{await expect(page.getByTestId('opponent')).toHaveCount(1);await expect(page.getByTestId('hand-card')).toHaveCount(5);await expect(page.getByRole('button',{name:'Pause opponent',exact:true})).toHaveCount(0);}}]);
 await page.getByRole('button',{name:'Play all Treasures',exact:true}).click();
 await expect(page.getByRole('button',{name:'Play all Treasures',exact:true})).toHaveCount(0);
 await setMotionPreference(page,'no-preference');
 await page.evaluate(()=>{
  const state={progress:0,landings:[] as {kind:string;painted:boolean}[]};
  (window as Window&{botMotion?:typeof state}).botMotion=state;
  new MutationObserver(records=>{
   for(const record of records)for(const node of [...record.addedNodes,...record.removedNodes]){
    if(!(node instanceof HTMLElement)||!node.matches('.public-flight'))continue;
    state.progress++;
    const kind=node.dataset.motionKind!;
    if(node.isConnected||!['play','gain'].includes(kind))continue;
    requestAnimationFrame(()=>{
     const slots=[...document.querySelectorAll<HTMLElement>('.played-card')];
     state.landings.push({kind,painted:slots.length>0&&slots.every(slot=>getComputedStyle(slot).opacity==='1')&&!!document.querySelector('.turn-marker')?.textContent?.includes('Classic Engine bot 2')});
     state.progress++;
    });
   }
  }).observe(document.body,{childList:true,subtree:true});
 });
 await page.getByRole('button',{name:'End turn',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'End turn',exact:true}).click();
 await openPlayers(page);
 // Observe each bounded flight, rather than imposing a two-second deadline on
 // an entire deliberately slowed-down turn. Destinations must paint mid-turn.
 let progress=0;
 for(let step=0;step<60;step++){
  // The turn label can update after the final flight mutation. Include that
  // terminal state in the same bounded wait: there may be no next flight.
  await expect.poll(()=>page.evaluate(previous=>{
   const audit=(window as Window&{botMotion?:{progress:number;landings:unknown[]}}).botMotion!;
   const returned=audit.landings.length>0&&!!document.querySelector('.turn-marker')?.textContent?.includes('Your turn')&&!document.querySelector('.public-flight');
   return audit.progress>previous||returned;
  },progress)).toBe(true);
  const audit=await page.evaluate(()=>(window as Window&{botMotion?:{progress:number;landings:{kind:string;painted:boolean}[]}}).botMotion!);
  progress=audit.progress;
  expect(audit.landings.every(landing=>landing.painted)).toBe(true);
  if(audit.landings.length && (await page.locator('.turn-marker').textContent())?.includes('Your turn') && await page.locator('.public-flight').count()===0)break;
 }
 const landed=await page.evaluate(()=>(window as Window&{botMotion?:{landings:{kind:string;painted:boolean}[]}}).botMotion!.landings);
 expect(landed.some(landing=>landing.kind==='play')).toBe(true);
 expect(landed.some(landing=>landing.kind==='gain')).toBe(true);
 await expect(page.locator('.turn-marker')).toContainText('Your turn');
 await expect(page.locator('.public-flight')).toHaveCount(0);
 await setMotionPreference(page,'reduce');
 await closePlayers(page);
 await expect(page.getByRole('button',{name:'Play all Treasures',exact:true})).toBeEnabled();
 await steps.step('bot-turn','The Engine completes its turn and returns play to Ariadne',[{spec:'Ariadne has a fresh hand and can take her next turn.',check:async()=>{await expect(page.locator('.turn-marker')).toContainText('Your turn');await expect(page.getByRole('button',{name:'Play all Treasures',exact:true})).toBeEnabled();}}]);
 await page.reload();
 await steps.step('restored','Refresh restores the shared game rather than starting a new practice match',[{spec:'Both seats and the active human turn are preserved.',check:async()=>{await expect(page.locator('.turn-marker')).toContainText('Your turn');await expect(page.getByTestId('opponent')).toHaveCount(1);}}]);
});
