import {createHash} from 'node:crypto';
import {test,expect} from '../helpers/fixtures';
import {TestStepHelper} from '../helpers/test-step-helper';
import {finalTurn} from '../helpers/match-history';
import {readEvents} from '../helpers/action-history';
import {replaySetup} from '../../../src/lib/game/setup';
import {standings} from '../../../src/lib/game/actions';
import {roomCodeFixture} from '../helpers/room-code-fixture';
import {newPlayerContext} from '../helpers/players';

for(const scenario of [{count:2 as const,goal:'acropolis' as const,last:false},{count:2 as const,goal:'actions' as const,last:false},{count:3 as const,goal:'actions' as const,last:true},{count:4 as const,goal:'actions' as const,last:true}])test(`${scenario.count} empires finish ${scenario.goal==='acropolis'?'at the last Acropolis':scenario.last?'with shared victory':'with fewer turns deciding victory'}`,async({page,browser},info)=>{
  const context=await newPlayerContext(browser,{viewport:info.project.use.viewport,baseURL:info.project.use.baseURL}),other=await context.newPage();
  try{
    const fixture=await finalTurn(page,info,{...scenario,other}),steps=new TestStepHelper(page,info,'Finish the empire');
    if(scenario.goal==='acropolis'){await page.emulateMedia({reducedMotion:'no-preference'});await other.emulateMedia({reducedMotion:'no-preference'});}
    await steps.step('last-turn','The empty pile waits for the current turn to finish',[{spec:'Buys are spent, the table is still playable, and results are not shown early.',check:async()=>{await expect(page.locator('.resources [data-resource=buys]')).toHaveAttribute('data-value','0');await expect(page.locator('.victory-scene')).toHaveCount(0);await expect(page.getByRole('button',{name:'End turn',exact:true})).toBeEnabled();}}]);
    await page.getByRole('button',{name:'End turn',exact:true}).click();
    await expect.poll(async()=>await page.locator('.victory-scene').count()>0||await page.getByRole('button',{name:'Keep playing',exact:true}).isVisible()).toBe(true);
    if(await page.getByRole('button',{name:'Keep playing',exact:true}).isVisible()){
      await steps.step('remaining','The last affordable Worship is still available before cleanup',[{spec:'The confirmation names a remaining god.',check:async()=>expect(page.getByRole('dialog')).toContainText('You can still worship')}]);
      await page.getByRole('button',{name:'Keep playing',exact:true}).click();
      await steps.step('declined','Keep playing preserves the final turn and every remaining resource',[{spec:'Declining appends no event and restores End turn focus.',check:async()=>{expect(await readEvents(fixture.code)).toHaveLength(fixture.events.length);await expect(page.getByRole('button',{name:'End turn',exact:true})).toBeFocused();}}]);
      await page.getByRole('button',{name:'End turn',exact:true}).click();
      await steps.step('confirm-ending','Choose to finish without spending the remaining Worship',[{spec:'The same meaningful choice is offered.',check:async()=>expect(page.getByRole('button',{name:'Keep playing',exact:true})).toBeEnabled()}]);
      await page.getByRole('dialog').getByRole('button',{name:'End turn',exact:true}).click();
    }
    await expect(page.locator('.victory-scene')).toHaveCSS('opacity','1');
    await steps.step('results','Cleanup completes and every empire receives its final score',[{spec:'Every player has a visible score and turn count; no turn controls remain.',check:async()=>{await expect(page.locator('.victory-scene')).toBeVisible();await expect(page.locator('.standing')).toHaveCount(scenario.count);await expect(page.locator('.end-reason')).toHaveText(scenario.goal==='acropolis'?'Acropolis pile depleted':'3 supply piles depleted');await expect(page.getByRole('button',{name:'End turn',exact:true})).toHaveCount(0);}}]);
    const game=replaySetup(await readEvents(fixture.code)),scores=standings(game);expect(game.turn.phase).toBe('finished');expect(game.resources).toEqual({actions:0,coins:0,buys:0,worship:0});expect(game.decks[fixture.host].play).toHaveLength(0);expect(game.decks[fixture.host].hand).toHaveLength(5);
    if(scenario.goal==='actions'){expect(scores.every(s=>s.score===3)).toBe(true);await expect(page.locator('#victory-title')).toHaveText(scenario.last?'Shared victory':'Theseus wins');}
    await steps.step('observer','Theseus sees the same persistent result',[{spec:'Both players see the same ending and all ranked empires.',check:async()=>{await expect(other.locator('.standing')).toHaveCount(scenario.count);await expect(other.locator('#victory-title')).toHaveText(await page.locator('#victory-title').innerText());}}],{page:other,player:'Theseus'});
    await page.locator('.standing').last().click();
    await steps.step('other-score','Inspect another empire’s Territory arithmetic',[{spec:'The selected player’s owned Territories and total are shown.',check:async()=>expect(page.locator('.breakdown')).toHaveAttribute('aria-label',`${scores.at(-1)!.name}'s Territory score`)}]);
    await page.getByRole('button',{name:'Inspect Hamlet',exact:true}).click();
    await steps.step('territory','Read the actual Hamlet card behind the score',[{spec:'The full card remains inspectable after the match.',check:async()=>expect(page.locator('.detail[open] [data-card-id]')).toHaveAttribute('data-card-id','hamlet')}]);
    await page.getByRole('button',{name:'Return to scores',exact:true}).click();
    await steps.step('returned','Return to the same score breakdown',[{spec:'Focus returns to Hamlet without changing the selected empire.',check:async()=>expect(page.getByRole('button',{name:'Inspect Hamlet',exact:true})).toBeFocused()}]);
    await page.reload();
    await steps.step('restored','The finished table keeps its result on return',[{spec:'The same winners and totals return without another cleanup.',check:async()=>expect(page.locator('#victory-title')).toHaveText(scenario.goal==='actions'?(scenario.last?'Shared victory':'Theseus wins'):'Ariadne wins')}]);
    expect(await readEvents(fixture.code)).toHaveLength(game.activity.length);
    if(scenario.goal==='acropolis'){
      await page.getByRole('button',{name:'View chronicle',exact:true}).click();
      await steps.step('chronicle','The finished game’s final moves remain available',[{spec:'The Chronicle includes the final cleanup.',check:async()=>expect(page.getByRole('dialog',{name:'Chronicle'})).toContainText('ended the turn')}]);
      await page.getByRole('button',{name:'First moves',exact:true}).click();
      await steps.step('first-moves','The beginning of the game is still part of its Chronicle',[{spec:'The first page includes creation and joining, with no earlier page.',check:async()=>{await expect(page.locator('.chronicle')).toContainText('created the table');await expect(page.getByRole('button',{name:'Earlier moves',exact:true})).toBeDisabled();}}]);
      await page.getByRole('button',{name:'Latest moves',exact:true}).click();
      await steps.step('last-moves','Return to the final cleanup at the end of the Chronicle',[{spec:'The latest page is complete and cannot advance beyond the last move.',check:async()=>{await expect(page.locator('.chronicle')).toContainText('ended the turn');await expect(page.getByRole('button',{name:'Later moves',exact:true})).toBeDisabled();}}]);
      await page.getByRole('button',{name:'Close',exact:true}).click();
      await steps.step('finished-table','The table remains inspectable after scoring',[{spec:'Final scores can be reopened, and no play commands are offered.',check:async()=>{await expect(page.getByRole('button',{name:'Final scores',exact:true})).toBeFocused();await expect(page.getByRole('button',{name:'To Treasures',exact:true})).toHaveCount(0);}}]);
      await page.getByRole('button',{name:'Final scores',exact:true}).click();
      await steps.step('scores-again','Return to the same final standings',[{spec:'The winner and Territory total have not changed.',check:async()=>expect(page.locator('.total')).toHaveText('Total 39 VP')}]);
      const newCode=await roomCodeFixture(page,{...info,title:`${info.title}/rematch`});
      await page.reload();
      await steps.step('ready-again','Ariadne can gather a fresh table from the finished game',[{spec:'Play again is enabled after the result returns.',check:async()=>expect(page.getByRole('button',{name:'Play again',exact:true})).toBeEnabled()}]);
      const rematchUuid=createHash('sha256').update(`${info.project.name}/${info.title}/rematch`).digest('hex').slice(0,32);
      await page.evaluate(uuid=>Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>uuid}),rematchUuid);
      await page.getByRole('button',{name:'Play again',exact:true}).click();
      await steps.step('new-table','Play again creates a separate two-player gathering',[{spec:'Ariadne keeps her name, receives a new code, and occupies exactly one seat.',check:async()=>{await expect(page.getByTestId('room-code')).toHaveText(newCode);await expect(page.getByTestId('player-seat')).toHaveCount(1);expect(newCode).not.toBe(fixture.code);expect((await readEvents(newCode))[0].playerCount).toBe(2);}}]);
      await steps.step('old-result','Theseus can still review the original finished match',[{spec:'Starting a new gathering does not reset the other player’s table.',check:async()=>expect(other.locator('#victory-title')).toHaveText('Ariadne wins')}],{page:other,player:'Theseus'});
      expect(await readEvents(fixture.code)).toHaveLength(game.activity.length);
    }
  }finally{await context.close();}
});
