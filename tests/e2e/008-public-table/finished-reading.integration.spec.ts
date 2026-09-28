import {test,expect} from '../helpers/fixtures';
import {newPlayerContext} from '../helpers/players';
import {finalTurn} from '../helpers/match-history';
import {TestStepHelper} from '../helpers/test-step-helper';

test('keep reading the Chronicle when a friend completes the match',async({page,browser},info)=>{
  test.setTimeout(120_000);
  const context=await newPlayerContext(browser,{viewport:info.project.use.viewport,baseURL:info.project.use.baseURL}),other=await context.newPage();
  const steps=new TestStepHelper(page,info,'Finish reading before opening final scores');
  try{
    await finalTurn(page,info,{other});
    await steps.step('last-turn','Ariadne is about to complete a legal recorded match',[{spec:'The last cleanup has not happened yet.',check:async()=>expect(page.getByRole('button',{name:'End turn',exact:true})).toBeEnabled()}]);
    await other.getByRole('button',{name:'Chronicle',exact:true}).click();await other.getByRole('button',{name:'First moves',exact:true}).click();
    await steps.step('reading','Theseus reads the beginning of the match',[{spec:'Creation remains on the first page of the Chronicle.',check:async()=>expect(other.locator('.chronicle')).toContainText('created the table')}],{page:other,player:'Theseus'});
    await page.getByRole('button',{name:'End turn',exact:true}).click();
    await expect.poll(async()=>await page.locator('.victory-scene').count()>0||await page.getByRole('button',{name:'Keep playing',exact:true}).isVisible()).toBe(true);
    if(await page.getByRole('button',{name:'Keep playing',exact:true}).isVisible()){
      await steps.step('confirm','Ariadne can confirm leaving her remaining option',[{spec:'The final turn can still be kept open.',check:async()=>expect(page.getByRole('button',{name:'Keep playing',exact:true})).toBeEnabled()}]);
      await page.getByRole('dialog').getByRole('button',{name:'End turn',exact:true}).click();
    }
    await steps.step('finished','Ariadne receives the final standings',[{spec:'Both empires have final scores.',check:async()=>expect(page.locator('.standing')).toHaveCount(2)}]);
    await steps.step('undisturbed','The finished game does not tear Theseus away from the Chronicle',[{spec:'His first page stays open, with the final move available explicitly.',check:async()=>{await expect(other.locator('.chronicle')).toContainText('created the table');await expect(other.getByRole('button',{name:'New moves · 1 · Refresh',exact:true})).toBeVisible();await expect(other.locator('.victory-scene')).toHaveCount(0);}}],{page:other,player:'Theseus'});
    await other.getByRole('button',{name:'New moves · 1 · Refresh',exact:true}).click();
    await steps.step('last-move','Theseus chooses to read the final cleanup',[{spec:'The final entry names the actor and shows cleared resources.',check:async()=>{await expect(other.locator('.chronicle')).toContainText('ended the turn');await expect(other.locator('.totals [data-resource=coins]')).toHaveAttribute('data-value','0');}}],{page:other,player:'Theseus'});
    await other.keyboard.press('Escape');await other.getByRole('button',{name:'Final scores',exact:true}).click();
    await steps.step('scores','Theseus opens the same final standings when ready',[{spec:'The winner agrees with Ariadne’s view.',check:async()=>expect(other.locator('#victory-title')).toHaveText(await page.locator('#victory-title').innerText())}],{page:other,player:'Theseus'});
  }finally{await context.close();}
});
