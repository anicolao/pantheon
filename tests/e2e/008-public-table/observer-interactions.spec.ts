import {setMotionPreference} from '../helpers/motion-preference';
import {test,expect} from '../helpers/fixtures';
import {newPlayerContext} from '../helpers/players';
import {actionTable,playCard,readEvents} from '../helpers/action-history';
import {openWorship,browseChoice} from '../helpers/table-controls';
import {browseSupply} from '../helpers/supply-controls';
import {TestStepHelper} from '../helpers/test-step-helper';
import {replaySetup} from '../../../src/lib/game/setup';

test('share market browsing and the complete worship scene with an observer',async({page,browser},info)=>{
  const context=await newPlayerContext(browser,{viewport:info.project.use.viewport,baseURL:info.project.use.baseURL}),other=await context.newPage();
  const steps=new TestStepHelper(page,info,'Shared worship and market focus');
  try{
    const fixture=await actionTable(page,info,'temple-of-athena','thaleia',{other,wealth:3});
    await setMotionPreference(other,'no-preference');
    await other.bringToFront();
    await browseSupply(page,'Obol');
    await page.locator('.buy-card[data-centered=true]').press('Home');
    await steps.step('market','The observer follows ordinary market browsing',[{spec:'Both offers center the same public pile.',check:async()=>{
      await expect(other.locator('.buy-card[data-centered=true]')).toHaveAttribute('data-supply-id','obol');
      await expect(page.locator('.buy-card[data-centered=true]')).toHaveAttribute('data-supply-id','obol');
    }}],{page:other});
    await openWorship(page,'Counsel of Olympus');
    await steps.step('focus','The observer sees Athena centered without actionable controls',[{spec:'Worship focus is shared before spending resources.',check:async()=>{
      await expect(other.locator('[data-observed-temple="counsel-of-olympus"]')).toBeVisible();
      await expect(other.locator('.observed-interaction button')).toHaveCount(0);
    }}],{page:other});
    await page.getByRole('button',{name:'Return worship card',exact:true}).click();
    await expect(other.locator('.observed-interaction')).toHaveCount(0);
    await page.getByRole('button',{name:'Play all Treasures',exact:true}).click();
    await openWorship(page,'Counsel of Olympus');
    await page.getByRole('button',{name:'Worship Athena',exact:true}).click();
    await browseChoice(page,'Oracle’s Acolyte');
    await page.locator('.buy-card[data-centered=true]').press('Home');
    await steps.step('choice','The observer follows the public gain choice alongside Athena',[{spec:'Gain browsing is synchronized and private hands remain concealed.',check:async()=>{
      await expect(other.locator('.observed-interaction')).toContainText('Choosing a card');
      await expect(other.locator('.buy-card[data-centered=true]')).toHaveAttribute('data-supply-id','oracles-acolyte');
      await expect(other.locator('.opponents [data-card-id]')).toHaveCount(0);
    }}],{page:other});
    await (await browseChoice(page,'Oracle’s Acolyte')).click();
    await page.getByRole('button',{name:'Gain selected card',exact:true}).click();
    await expect(other.locator('.public-flight[data-motion-kind=topdeck]')).toBeVisible();
    await expect(other.locator('.public-flight')).toHaveCount(0);
    await expect(other.locator('.observed-interaction')).toHaveCount(0);
    await expect(other.locator('.supply-coverflow')).toHaveAttribute('aria-busy','false');
    await steps.step('returned','After gaining, the worship card returns for both players',[{spec:'The shared scene closes and the public gain is recorded once.',check:async()=>{
      await expect(other.locator('.observed-interaction')).toHaveCount(0);
      await expect(page.locator('.worship-overlay')).toHaveCount(0);
      const state=replaySetup(await readEvents(fixture.code));
      expect(state.publicActivity.filter(entry=>entry.command==='choice/resolved').at(-1)?.steps.filter(step=>step.kind==='topdeck')).toHaveLength(1);
    }}],{page:other});
  }finally{await context.close();}
});

test('share trash staging and cancellation without exposing a private selection',async({page,browser},info)=>{
  const context=await newPlayerContext(browser,{viewport:info.project.use.viewport,baseURL:info.project.use.baseURL}),other=await context.newPage();
  const steps=new TestStepHelper(page,info,'Public trash progress with private card identities');
  try{
    await actionTable(page,info,'seed-keeper','thaleia',{other});
    await setMotionPreference(other,'no-preference');
    await other.bringToFront();
    await playCard(page,'seed-keeper');
    await steps.step('target','The observer sees the trash target and instruction',[{spec:'The central target identifies the active choice.',check:async()=>{
      await expect(other.locator('[data-observer-target=trash]')).toBeVisible();
      await expect(other.locator('.observed-interaction')).toContainText('0 selected');
    }}],{page:other});
    await page.getByRole('button',{name:/^Trash hand card /}).first().click();
    await steps.step('selected','The observer sees one staged back, never the uncommitted identity',[{spec:'Only a count is shared until confirmation.',check:async()=>{
      await expect(other.locator('.selected-back')).toHaveCount(1);
      await expect(other.locator('.selected-back [data-card-id]')).toHaveCount(0);
      await expect(other.locator('.observed-interaction')).toContainText('1 selected');
    }}],{page:other});
    await page.getByRole('button',{name:/^Return .* to hand$/}).click();
    await expect(other.locator('.selected-back')).toHaveCount(0);
    await page.getByRole('button',{name:/^Trash hand card /}).first().click();
    await page.getByRole('button',{name:'Done trashing (1)',exact:true}).click();
    await steps.step('committed','The committed trash clears the shared target',[{spec:'Both players finish the interaction.',check:async()=>{
      await expect(other.locator('.observed-interaction')).toHaveCount(0);
      await expect(page.locator('.inline-choice')).toHaveCount(0);
    }}],{page:other});
  }finally{await context.close();}
});
