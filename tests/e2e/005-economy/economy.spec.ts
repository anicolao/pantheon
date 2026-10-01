import {browseSupply,inspectSupply,enterTreasures} from '../helpers/supply-controls';
import { newPlayerContext } from '../helpers/players';
import { test, expect } from '../helpers/fixtures';
import type { Page } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';
import { roomCodeFixture } from '../helpers/room-code-fixture';
import { readEvents } from '../helpers/action-history';
import { replaySetup } from '../../../src/lib/game/setup';

test('buy an Action from an empty Action hand and play it on turn five',async({page,browser},info)=>{
  test.setTimeout(180_000); // Many operations; each operation/capture is bounded to 2,000 ms.
  const context=await newPlayerContext(browser, {viewport:info.project.use.viewport,baseURL:info.project.use.baseURL,locale:'en-CA',timezoneId:'America/Toronto',reducedMotion:'reduce'});
  const other=await context.newPage(),steps=new TestStepHelper(page,info,'Buy an Action and play it on turn five');
  const errors:string[]=[];for(const client of [page,other])client.on('pageerror',error=>errors.push(error.message));
  const capture=async(id:string,description:string,client:Page,player:string,check:()=>Promise<unknown>,status='synced')=>steps.step(id,description,[{spec:description,check}],{page:client,player,status});

  try{
    const code=await roomCodeFixture(page,info,'economy-story-12');
    await page.goto('./');
    await capture('sanctuary','Ariadne arrives at the sanctuary',page,'Ariadne',async()=>expect(page.getByRole('link',{name:'Play',exact:true})).toBeVisible(),'ready');
    await page.getByRole('link',{name:'Play',exact:true}).click();
    await capture('gathering','Choose to create a table or join friends',page,'Ariadne',async()=>expect(page.getByRole('button',{name:'Join a game',exact:true})).toBeEnabled());
    await page.getByLabel('Your name',{exact:true}).fill('Ariadne');await page.getByRole('button',{name:'Create table',exact:true}).click();
    await capture('created','Ariadne shares her five-letter game code',page,'Ariadne',async()=>{await expect(page.getByTestId('room-code')).toHaveText(code);await expect(page.getByTestId('player-seat')).toHaveCount(1);});
    await other.goto('./');await other.getByRole('link',{name:'Play',exact:true}).click();await other.getByRole('button',{name:'Join a game',exact:true}).click();
    await capture('join-code','Theseus can find the table using its code',other,'Theseus',async()=>expect(other.getByRole('dialog',{name:'Join a game'})).toBeVisible());
    await other.getByLabel('Game code',{exact:true}).fill(code);await other.getByRole('button',{name:'Find table',exact:true}).click();
    await capture('found','Theseus finds Ariadne’s table before taking a seat',other,'Theseus',async()=>expect(other.getByTestId('room-code')).toHaveText(code));
    await other.getByLabel('Your name',{exact:true}).fill('Theseus');await other.getByRole('button',{name:'Join table',exact:true}).click();
    await capture('joined-guest','Theseus joins and waits for the host',other,'Theseus',async()=>{await expect(other.getByTestId('player-seat')).toHaveCount(2);await expect(other.getByRole('button',{name:'Begin',exact:true})).toHaveCount(0);});
    await capture('joined-host','Ariadne sees both seats filled and can begin',page,'Ariadne',async()=>expect(page.getByRole('button',{name:'Begin',exact:true})).toBeEnabled());
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    await capture('draft-guest','Theseus chooses first in the reverse-order draft',other,'Theseus',async()=>expect(other.getByText('Your choice',{exact:true})).toBeVisible());
    await other.getByRole('button',{name:'View Nereon',exact:true}).click();
    await capture('nereon','Theseus reads Nereon and his linked Temple and god',other,'Theseus',async()=>expect(other.locator('.temple-card [data-card-id]')).toHaveAttribute('data-card-id','temple-of-poseidon'));
    await other.getByRole('button',{name:'Choose Nereon',exact:true}).click();
    await capture('draft-host','Ariadne receives the next bloodline choice',page,'Ariadne',async()=>{await expect(page.getByText('Your choice',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/^View Nereon, chosen by/})).toBeDisabled();});
    await page.getByRole('button',{name:'View Thaleia',exact:true}).click();
    await capture('thaleia','Ariadne reads Thaleia before claiming her bloodline',page,'Ariadne',async()=>expect(page.getByRole('button',{name:'Choose Thaleia',exact:true})).toBeEnabled());
    await page.getByRole('button',{name:'Choose Thaleia',exact:true}).click();
    await capture('opening-hand','Ariadne starts with two Obols, three Hamlets, and no Actions',page,'Ariadne',async()=>expect.poll(()=>page.locator('.hand [data-card-id]').evaluateAll(cards=>cards.map(card=>card.getAttribute('data-card-id')))).toEqual(['hamlet','hamlet','hamlet','obol','obol']));
    await capture('opening-observer','Theseus sees Ariadne’s turn and five hidden cards',other,'Theseus',async()=>{await expect(other.locator('.opponents [data-card-id]')).toHaveCount(0);await expect(other.locator('.opponents img[alt="Card back"]')).toHaveCount(5);await expect(other.getByRole('button',{name:'To Treasures',exact:true})).toHaveCount(0);});
    await enterTreasures(page);
    await capture('treasures','Ariadne advances without playing an Action',page,'Ariadne',async()=>{await expect(page.locator('.turn-marker')).toContainText('Treasures');await expect(page.getByRole('button',{name:'Play all Treasures',exact:true})).toBeEnabled();});
    await page.getByRole('button',{name:/^(Play|Inspect) hand card \d+: Obol$/}).first().click({button:'right'});
    await capture('obol-inspection','Read the Obol and its Play control',page,'Ariadne',async()=>expect(page.getByRole('button',{name:'Play Obol',exact:true})).toBeEnabled());
    await page.getByRole('button',{name:'Play Obol',exact:true}).click();
    await capture('obol-played','One Obol leaves the hand and earns one Coin',page,'Ariadne',async()=>{await expect(page.locator('.resources [data-resource=coins]')).toHaveAttribute('data-value','1');await expect(page.locator('.played-cards [data-card-id]')).toHaveCount(1);await expect(page.getByTestId('hand-card')).toHaveCount(4);});
    await capture('obol-observer','Theseus sees Ariadne play an Obol without revealing her hand',other,'Theseus',async()=>{await expect(other.locator('.played-cards [data-card-id]')).toHaveAttribute('data-card-id','obol');await expect(other.locator('.opponents [data-card-id]')).toHaveCount(0);});
    await page.getByRole('button',{name:'Play all Treasures',exact:true}).click();
    await capture('wealth-played','The remaining Obol brings Ariadne to two Coins',page,'Ariadne',async()=>{await expect(page.locator('.resources [data-resource=coins]')).toHaveAttribute('data-value','2');await expect(page.locator('.played-cards [data-card-id]')).toHaveCount(2);});
    await expect(page.getByRole('button',{name:'To Buys',exact:true})).toHaveCount(0);
    await expect(page.locator('.supply-coverflow')).toBeVisible();
    await capture('basics','Supply shows the available basic piles and their stock',page,'Ariadne',async()=>expect(page.locator('.supply-coverflow .coverflow')).toBeVisible());
    await browseSupply(page,'Oracle’s Acolyte');
    await capture('action-piles','Ariadne browses the Action piles',page,'Ariadne',async()=>expect(page.getByLabel('Oracle’s Acolyte: 8 remaining',{exact:true})).toBeVisible());
    await browseSupply(page,'Oracle’s Acolyte');
    await capture('selected','The selected Action costs two Coins and goes to discard',page,'Ariadne',async()=>{await expect(page.getByRole('button',{name:'Buy Oracle’s Acolyte',exact:true})).toBeEnabled();await expect(page.locator('.reason')).toContainText('Affordable through');});
    await inspectSupply(page,'Oracle’s Acolyte');
    await capture('action-inspector','Read the complete Action before spending anything',page,'Ariadne',async()=>expect(page.getByRole('dialog',{name:'Oracle’s Acolyte',exact:true})).toBeVisible());
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await capture('return-to-purchase','Returning from inspection preserves the purchase choice',page,'Ariadne',async()=>expect(page.locator('.resources [data-resource=coins]')).toHaveAttribute('data-value','2'));
    await page.getByRole('button',{name:'Buy Oracle’s Acolyte',exact:true}).click();
    await capture('purchased','One purchased copy enters discard and spends both Coins and the Buy',page,'Ariadne',async()=>{await expect(page.getByRole('button',{name:'Inspect purchased Oracle’s Acolyte',exact:true})).toBeVisible();await expect(page.locator('.resources [data-resource=coins]')).toHaveAttribute('data-value','0');await expect(page.locator('.resources [data-resource=buys]')).toHaveAttribute('data-value','0');await expect(page.locator('#pile-count-oracles-acolyte')).toBeVisible();});
    await capture('purchase-observer','Theseus sees the purchased Action and its public destination',other,'Theseus',async()=>expect(other.locator('.played-cards [data-card-id]')).toHaveAttribute('data-card-id','oracles-acolyte'));
    await expect(page.locator('.supply-coverflow')).toBeVisible();
    await capture('return-to-table','Ariadne returns to finish her first turn',page,'Ariadne',async()=>{await expect(page.getByRole('button',{name:'End turn',exact:true})).toBeEnabled();await expect(page.locator('.turn-marker')).toContainText('Buys');});
    await page.getByRole('button',{name:'End turn',exact:true}).click();
    await capture('cleanup','Ariadne draws her next five cards and waits',page,'Ariadne',async()=>{await expect(page.getByTestId('hand-card')).toHaveCount(5);await expect(page.getByRole('button',{name:'To Treasures',exact:true})).toHaveCount(0);});
    // Fixed, planned turns. No hidden-state reads, hand search, or silent fast-forward.
    for(const {turn,client,name,coins} of [
      {turn:2,client:other,name:'Theseus',temple:true,coins:'2'},
      {turn:3,client:page,name:'Ariadne',temple:true,coins:'4'},
      {turn:4,client:other,name:'Theseus',temple:false,coins:'4'}]){
      await capture(`turn-${turn}`,`${name} receives turn ${turn}`,client,name,async()=>expect(client.getByRole('button',{name:/^(To Treasures|End turn)$/})).toBeEnabled());
      await enterTreasures(client);
      await capture(`turn-${turn}-treasures`,`${name} chooses to play wealth on turn ${turn}`,client,name,async()=>expect(client.locator('.turn-marker')).toContainText('Treasures'));
      await client.getByRole('button',{name:'Play all Treasures',exact:true}).click();
      await capture(`turn-${turn}-wealth`,`${name} earns ${coins} Coins`,client,name,async()=>expect(client.locator('.resources [data-resource=coins]')).toHaveAttribute('data-value',coins));
      await client.getByRole('button',{name:'End turn',exact:true}).click();
      await capture(`turn-${turn}-confirm`,`${name} confirms leaving the available purchases`,client,name,async()=>expect(client.getByRole('dialog')).toContainText(`You can still buy ${coins === '2' ? 'Oracle’s Acolyte' : 'Council of Sages'}.`));
      await client.getByRole('dialog').getByRole('button',{name:'End turn',exact:true}).click();
      await capture(`turn-${turn}-finished`,`${name} draws five and hands off the turn`,client,name,async()=>{
        await expect(client.getByTestId('hand-card')).toHaveCount(5);
        await expect(client.getByRole('button',{name:'To Treasures',exact:true})).toHaveCount(0);
        // Theseus has no Actions on turn four; observe his automatic phase command too.
        await expect(client.locator('.turn-marker')).toContainText(`${turn === 3 ? 'Treasures' : 'Actions'} · Turn ${turn + 1}`);
      });
    }
    await capture('purchased-in-hand','On turn five Ariadne holds the Action she bought',page,'Ariadne',async()=>{await expect(page.locator('.hand [data-card-id="oracles-acolyte"]')).toHaveCount(1);await expect(page.getByRole('button',{name:'To Treasures',exact:true})).toBeEnabled();});
    await page.getByTestId('hand-card').nth(1).click({button:'right'});
    await capture('purchased-inspector','Ariadne inspects the purchased physical copy',page,'Ariadne',async()=>{await expect(page.getByRole('dialog').locator('[data-card-id]')).toHaveAttribute('data-card-id','oracles-acolyte');await expect(page.getByRole('button',{name:'Play Oracle’s Acolyte',exact:true})).toBeEnabled();});
    await page.getByRole('button',{name:'Play Oracle’s Acolyte',exact:true}).click();
    await capture('purchased-played','The Action draws a card and Thaleia adds her Action reward',page,'Ariadne',async()=>{await expect(page.locator('.played-cards [data-card-id]')).toHaveAttribute('data-card-id','oracles-acolyte');await expect(page.locator('.resources [data-resource=actions]')).toHaveAttribute('data-value','2');await expect(page.getByTestId('hand-card')).toHaveCount(5);});
    await capture('played-observer','Theseus sees the Action and reward without seeing the private draw',other,'Theseus',async()=>{await expect(other.locator('.played-cards [data-card-id]')).toHaveAttribute('data-card-id','oracles-acolyte');await expect(other.locator('.opponents [data-card-id]')).toHaveCount(0);});
    // Read-only corroboration follows the entire visible journey and never chooses a move.
    const events=await readEvents(code),state=replaySetup(events),buyer=state.players[0].uid;
    expect(events.filter(event=>event.type==='card/bought')).toHaveLength(1);
    expect(events.slice(0,events.findIndex(event=>event.type==='card/bought')).filter(event=>event.type==='phase/advanced')).toHaveLength(1);
    expect(state.decks[buyer].play[0].id).toBe('supply-oracles-acolyte-1');expect(state.turn.shuffles[buyer]).toBe(1);expect(errors).toEqual([]);
  }finally{await context.close();}
});
