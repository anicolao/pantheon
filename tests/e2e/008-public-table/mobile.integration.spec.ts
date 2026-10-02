import {openPlayers,closePlayers} from '../helpers/table-controls';
import {setupSupply} from '../../../src/lib/game/setup';
import {test,expect} from '../helpers/fixtures';
import {actionTable,playCard} from '../helpers/action-history';
import {TestStepHelper} from '../helpers/test-step-helper';

for(const viewport of [{width:320,height:568},{width:375,height:667},{width:430,height:932}]){
  test(`fit the public trays on a ${viewport.width} by ${viewport.height} phone`,async({page},info)=>{
    test.skip(info.project.name!=='phone','Additional phone sizes; desktop and 4K have their own journeys.');
    await page.setViewportSize(viewport);
    await actionTable(page,info,'temple-of-athena','thaleia',{seed:'worship-story-2'});
    await playCard(page,'temple-of-athena');
    // Chronicle freezes its opening revision. Let the automatic phase command
    // finish first so this story always opens the same completed move history.
    await expect(page.locator('.turn-marker')).toContainText('Treasures');
    const steps=new TestStepHelper(page,info,`Read public cards on a ${viewport.width} by ${viewport.height} phone`);
    await openPlayers(page);await page.getByRole('button',{name:'Chronicle',exact:true}).click();
    await steps.step('chronicle','Read the played Temple and the bloodline blessing',[{spec:'Both public effects and their paths fit beside the history controls.',check:async()=>{await expect(page.locator('.move')).toHaveCount(2);await expect(page.getByRole('button',{name:'First moves',exact:true})).toBeEnabled();}}]);
    await page.locator('.move[data-movement=play] button').click();
    await steps.step('portrait-card','Read the complete Temple card',[{spec:'The portrait card and return control are visible.',check:async()=>{await expect(page.locator('.inspected [data-card-id]')).toHaveAttribute('data-card-id','temple-of-athena');await expect(page.getByRole('button',{name:'Return to Chronicle',exact:true})).toBeVisible();}}]);
    await page.getByRole('button',{name:'Return to Chronicle',exact:true}).click();
    await page.locator('.move[data-movement=leader] button').click();
    await steps.step('landscape-card','Read the complete bloodline card',[{spec:'The landscape card retains its format and the return control is visible.',check:async()=>{await expect(page.locator('.inspected.landscape [data-card-id]')).toHaveAttribute('data-card-id','thaleia');await expect(page.getByRole('button',{name:'Return to Chronicle',exact:true})).toBeVisible();}}]);
    await page.getByRole('button',{name:'Return to Chronicle',exact:true}).click();
    await page.getByRole('button',{name:'In play',exact:true}).click();
    await steps.step('play-pile','Inspect the public play area',[{spec:'The played Temple, owner selector, and deck count are visible.',check:async()=>{await expect(page.locator('.pile [data-card-id]')).toHaveAttribute('data-card-id','temple-of-athena');await expect(page.getByLabel('Player',{exact:true})).toBeVisible();}}]);
    await page.getByRole('button',{name:'Discard',exact:true}).click();
    await steps.step('discard','Read an empty discard',[{spec:'The empty state and pile navigation fit inside the tray.',check:async()=>expect(page.locator('.pile')).toHaveText('No cards here.')}]);
    await page.getByRole('button',{name:'Trash',exact:true}).click();
    await steps.step('trash','Read the shared trash',[{spec:'The shared tray is clearly named and can be closed.',check:async()=>{await expect(page.getByRole('dialog',{name:'Shared trash',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Close',exact:true})).toBeVisible();}}]);
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await closePlayers(page);
    await steps.step('table','Return to the table without scrolling',[{spec:'The private hand, turn controls, and public play area fit on the phone.',check:async()=>{await expect(page.getByRole('button',{name:'Players and Chronicle',exact:true})).toBeVisible();await expect(page.getByTestId('hand-card')).toHaveCount(4);}}]);
    await page.getByRole('button',{name:'Play all Treasures',exact:true}).click();
    await expect(page.locator('.supply-coverflow')).toBeVisible();
    await steps.step('supply','Browse the complete supply on a small phone',[{spec:'One face-up card, persistent side stacks, stock and navigation fit without overlap.',check:async()=>{await expect(page.locator('.buy-card[data-centered=true]')).toHaveCount(1);await expect(page.locator('.supply-face')).toHaveCount(setupSupply(2).length);}}]);

  });
}
