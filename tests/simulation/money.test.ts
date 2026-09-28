import { expect, test } from 'bun:test';
import { moneyEstimate, moneyAfter, moneyBuy, moneyPurchase, moneyAction } from '../../scripts/balance/money';
import { setupMatch } from '../../scripts/balance/runner';
import { activePlayer } from '../../src/lib/game/actions';
import { effectFeatures } from '../../scripts/balance/engine';
import { inventoryAtSetup, strategyView, strategyCommand, candidates, type View } from '../../scripts/balance/strategy';
import { chooseCommand } from '../../scripts/balance/bot';
import { runExperiment, replayExperiment } from '../../scripts/balance/experiment';
function state(): View {
 const {game}=setupMatch('money-unit',['thaleia','nereon']);
 const v=strategyView(game,activePlayer(game),inventoryAtSetup(game));
 v.phase='buys';v.hand=[];v.resources={coins:4,buys:1,actions:0,worship:0};
 v.owned={obol:7,hamlet:3};v.leaderBonus=effectFeatures([]);v.scores=[20];v.myScore=3;
 return v;
}
test('plain money EV is exact and points dilute the deck',()=>{
 const v=state();expect(moneyEstimate(v).mean).toBe(3.5);
 expect(moneyAfter(v,'drachma').mean).toBeCloseTo(45/11,10);
 expect(moneyAfter(v,'acropolis').mean).toBeCloseTo(35/11,10);
});
test('Treasures win near ties, while sufficiently better draw still wins',()=>{
 const v=state();
 expect(moneyAfter(v,'council-of-sages').mean).toBeCloseTo(35/11+(5/11)*3*7/10,10);
 expect(moneyBuy(v,['council-of-sages','drachma'])).toBe('council-of-sages');
 expect(strategyCommand(v,{family:'treasure',parameters:candidates[0]})).toMatchObject({type:'card/bought',cardId:'council-of-sages'});
 expect(chooseCommand(v,'treasure')).toMatchObject({type:'card/bought',cardId:'council-of-sages'});
 v.owned={obol:8,hamlet:2};
 expect(moneyAfter(v,'council-of-sages').mean-moneyAfter(v,'drachma').mean).toBeGreaterThan(0.1);
 expect(moneyBuy(v,['council-of-sages','drachma'])).toBe('council-of-sages');
 v.owned={obol:6,hamlet:4};
 expect(moneyBuy(v,['council-of-sages','drachma'])).toBe('drachma');
});
test('top-value points cash in an affordable scoring opportunity despite income dilution',()=>{
 const v=state();v.resources.coins=8;v.owned={talent:6,hamlet:5};
 expect(moneyEstimate(v).mean).toBeGreaterThan(8);
 expect(moneyAfter(v,'acropolis').mean).toBe(7.5);
 expect(moneyBuy(v,['acropolis','talent'])).toBe('acropolis');
 v.owned={talent:6,hamlet:4};
 expect(moneyAfter(v,'acropolis').mean).toBeGreaterThan(8);
 expect(moneyBuy(v,['acropolis','talent'])).toBe('acropolis');
});
test('terminal collisions reduce draw value; support can improve it',()=>{
 const v=state();v.owned={talent:6,hamlet:3,'council-of-sages':5};
 const base=moneyEstimate(v).mean;
 expect(moneyAfter(v,'harbor-pilot').mean).toBeGreaterThan(base);
 expect(moneyAfter(v,'harbor-pilot').mean).toBeGreaterThan(moneyAfter(v,'council-of-sages').mean);
});
test('estimates use public composition, respect leader variants, and ignore current hidden-order proxies',()=>{
 const v=state();v.owned={obol:6,hamlet:3,'council-of-sages':2};
 const base=moneyEstimate(v);
 const other: View={...v,hand:[{id:'arbitrary',cardId:'talent',copy:1}],turn:99,unseenCount:0};
 expect(moneyEstimate(other)).toEqual(base);
 expect(moneyEstimate({...v,owned:Object.fromEntries(Object.entries(v.owned).reverse())})).toEqual(base);
 expect(moneyEstimate({...v,leaderBonus:{...v.leaderBonus,actions:2}}).mean).toBeGreaterThan(base.mean);
});
test('each buy recomputes dilution, banned cards are excluded, and known wins override EV',()=>{
 const v=state();v.resources.coins=8;v.owned={talent:6,hamlet:4};
 expect(moneyBuy(v,['acropolis','talent'])).toBe('acropolis');
 v.owned.acropolis=1;expect(moneyBuy(v,['acropolis','talent'])).toBe('acropolis');
 v.resources.coins=4;v.owned={obol:7,hamlet:3};v.bannedCards=['council-of-sages'];
 expect(moneyPurchase(v)).not.toMatchObject({cardId:'council-of-sages'});
 v.resources.coins=8;v.supply.acropolis=1;v.myScore=30;v.scores=[20];
 expect(moneyPurchase(v)).toMatchObject({cardId:'acropolis'});
 v.myScore=0;expect(moneyPurchase(v)).not.toMatchObject({cardId:'acropolis'});
});
test('EV Treasure completes a game and replays through production rules',()=>{
 const options={seed:'money-v5-smoke',block:0,lineup:['thaleia','nereon'],focal:0,profiles:[{family:'treasure' as const,parameters:candidates[0]},{family:'engine' as const,parameters:candidates[0]}]};
 const run=runExperiment(options);expect(run.result.status).toBe('completed');
 expect(replayExperiment(run.events,options).turn.phase).toBe('finished');
 expect(Object.keys(run.result.players[0].telemetry.acquisitions).some(id=>!['obol','drachma','talent','hamlet','polis','acropolis'].includes(id))).toBe(true);
},30000);

test('cash play does not prefer low-value terminal draw to a larger coin payload',()=>{
 const v=state();v.phase='actions';v.resources.actions=1;
 v.owned={obol:1,hamlet:8,'council-of-sages':1,'bronze-recruit':1};
 v.hand=['council-of-sages','bronze-recruit','hamlet','hamlet','hamlet'].map((cardId,copy)=>({id:String(copy),cardId,copy}));
 expect(moneyAction(v)?.cardId).toBe('bronze-recruit');
});
test('mandatory gains choose the least harmful EV when every gain dilutes income',()=>{
 const v=state();v.owned={talent:10};
 expect(moneyBuy(v,['obol','drachma'])).toBeUndefined();
 expect(moneyBuy(v,['obol','drachma'],true)).toBe('drachma');
});


test('unaffordable or unsafe top points do not promote smaller points to top tier',()=>{
 const v=state();v.resources.coins=5;v.owned={obol:7,hamlet:3};
 expect(moneyBuy(v,['polis','drachma'])).toBe('drachma');
 v.resources.coins=8;v.supply.acropolis=1;v.myScore=0;v.scores=[40];
 expect(moneyPurchase(v)).not.toMatchObject({cardId:'acropolis'});
 expect(moneyPurchase(v)).not.toMatchObject({cardId:'polis'});
});


test('starting Bronze Recruit tie or sampled edge prefers Drachma for every leader',()=>{
 for(const leader of ['thaleia','nereon','melia','doreios']){
  const {game}=setupMatch('epsilon-start',[leader,leader==='thaleia'?'nereon':'thaleia']);
  const uid=game.turnOrder.find(uid=>game.leaders[uid]===leader)!;
  const v=strategyView(game,uid,inventoryAtSetup(game));v.resources.coins=3;
  expect(Math.abs(moneyAfter(v,'bronze-recruit').mean-moneyAfter(v,'drachma').mean)).toBeLessThan(0.035);
  expect(moneyBuy(v,['bronze-recruit','drachma'])).toBe('drachma');
  expect(moneyBuy(v,['drachma','bronze-recruit'])).toBe('drachma');
 }
});


test('the 3.5-cent band is inclusive and anchored to the maximum',()=>{
 const v=state();v.owned={talent:193,hamlet:182};
 expect(moneyAfter(v,'council-of-sages').mean-moneyAfter(v,'drachma').mean).toBeCloseTo(0.035,12);
 expect(moneyBuy(v,['council-of-sages','drachma','obol'])).toBe('drachma');
 expect(moneyBuy(v,['obol','drachma','council-of-sages'])).toBe('drachma');
 v.owned={talent:193,obol:1,hamlet:181};
 expect(moneyAfter(v,'council-of-sages').mean-moneyAfter(v,'drachma').mean).toBeGreaterThan(0.035);
 expect(moneyBuy(v,['drachma','council-of-sages'])).toBe('council-of-sages');
});
