import {test,expect} from 'bun:test';
import {setupExperiment,runExperiment} from '../../scripts/balance/experiment';
import {activePlayer} from '../../src/lib/game/actions';
import {inventoryAtSetup,strategyView,type View} from '../../scripts/balance/strategy';
import {baseProfiles,v18BaseProfiles} from '../../scripts/balance/base-profiles';
import {sampledAfter,sampledValue} from '../../scripts/balance/sampled';
import {evaluatePurchasePair,twoPurchasePlan} from '../../scripts/balance/purchase-planner';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
function view(owned:Record<string,number>):View{
 const {game}=setupExperiment('pair-fixture',['thaleia','nereon'],'base-game');
 const v=strategyView(game,activePlayer(game),inventoryAtSetup(game,'base-game'),undefined,'base-game');
 return {...v,owned,hand:[],play:[],discard:[],phase:'buys' as const,resources:{actions:0,coins:4,buys:1,worship:0}};
}
test('weak-alone support and draw survive evaluation and can be selected together',()=>{
 const v=view({drachma:3,hamlet:6,'council-of-sages':1}),p=baseProfiles.engine;
 v.bannedCards=Object.keys(v.supply).filter(id=>!['harbor-pilot','council-of-sages'].includes(id));
 expect(sampledAfter(v,p,'harbor-pilot')).toBeLessThan(sampledValue(v,p));
 expect(sampledAfter(v,p,'council-of-sages')).toBeLessThan(sampledValue(v,p));
 const none=evaluatePurchasePair(v,p),pair=evaluatePurchasePair(v,p,'harbor-pilot','council-of-sages');
 expect(pair.value).toBeGreaterThan(none.value);
 const plan=twoPurchasePlan(v,p,['harbor-pilot','council-of-sages']);
 expect(plan.evaluatedPairs).toBe(9);expect(plan.options).toHaveLength(3);
 expect(plan.first).toBeDefined();
 expect(plan.options[0].second).toBeDefined();
 expect(plan.options[0].first).not.toBe(plan.options[0].second);
});
test('unaffordable or exhausted follow-ups add no imaginary value',()=>{
 const v=view({hamlet:10}),p=baseProfiles.engine;
 for(const second of ['council-of-sages','talent']){
  const none=evaluatePurchasePair(v,p,'harbor-pilot'),pair=evaluatePurchasePair(v,p,'harbor-pilot',second);
  expect(pair.followupRate).toBe(0);expect(pair.value).toBe(none.value);
 }
 v.supply['harbor-pilot']=1;
 const a=evaluatePurchasePair(v,p,'harbor-pilot','harbor-pilot'),b=evaluatePurchasePair(v,p,'harbor-pilot');
 expect(a.followupRate).toBe(0);expect(a.value).toBe(b.value);
});
test('redundant Actions lose to productive income without a named-card rule',()=>{
 const v=view({drachma:4,'council-of-sages':2,'harbor-pilot':3});
 for(const p of [baseProfiles.treasure,baseProfiles.engine]){
  const plan=twoPurchasePlan(v,p,['harbor-pilot','drachma']);
  expect(plan.first).toBe('drachma');
 }
},30000);
test('a second purchase pays real remaining cash and consumes a Buy',()=>{
 const v=view({hamlet:10}),p=baseProfiles.treasure;
 v.resources={actions:0,coins:7,buys:2,worship:0};
 expect(evaluatePurchasePair(v,p,'harbor-pilot','council-of-sages').meanFollowupTurn).toBe(0);
 v.resources.coins=6;
 expect(evaluatePurchasePair(v,p,'harbor-pilot','council-of-sages').followupRate).toBe(0);
 v.resources.coins=7;v.resources.buys=1;
 expect(evaluatePurchasePair(v,p,'harbor-pilot','council-of-sages').followupRate).toBe(0);
});
test('no retained plan crosses decisions',()=>{
 const v=view({obol:6,hamlet:4}),p=baseProfiles.treasure;
 const a=twoPurchasePlan(v,p,['drachma']);
 expect(twoPurchasePlan(structuredClone(v),p,['drachma'])).toEqual(a);
 v.supply.drachma=0;
 expect(twoPurchasePlan(v,p,['drachma']).options.map(o=>o.first)).toEqual([undefined]);
});
test('v18 controls exactly replay pre-planner Money and Engine',()=>{
 for(const first of ['treasure','engine']){
  const saved=JSON.parse(gunzipSync(readFileSync('balance-results/effective-validation-v3/replays/0-'+first+'@raw-'+first+'@raw.json.gz')).toString());
  expect(runExperiment({...saved.options,profiles:[v18BaseProfiles[first],v18BaseProfiles[first]]})).toEqual({result:{...saved.result,profiles:[v18BaseProfiles[first],v18BaseProfiles[first]]},events:saved.events});
 }
},180000);

test('hidden draw order cannot influence a plan; visible discard is retained',()=>{
 const {game}=setupExperiment('hidden-pair',['thaleia','nereon'],'base-game'),uid=activePlayer(game),inventory=inventoryAtSetup(game,'base-game');
 const a=strategyView(game,uid,inventory,undefined,'base-game');
 game.decks[uid].deck.reverse();
 const b=strategyView(game,uid,inventory,undefined,'base-game');
 expect(a).toEqual(b);
 const v=view({drachma:2,hamlet:8});
 v.discard=Array.from({length:2},(_,copy)=>({cardId:'drachma',copy,id:'known-'+copy}));
 const r=evaluatePurchasePair(v,baseProfiles.treasure,undefined,'council-of-sages');
 // First future hand is the five known non-discard Hamlets. On turn two,
 // cleanup and a genuine reshuffle can expose the Drachmas.
 expect(r.meanFollowupTurn===null||r.meanFollowupTurn===2).toBe(true);
});

test('dominance is applied only after both first purchases receive pair evaluation',()=>{
 const v=view({obol:6,hamlet:4});
 v.bannedCards=Object.keys(v.supply).filter(id=>!['drachma','bronze-recruit'].includes(id));
 const plan=twoPurchasePlan(v,baseProfiles.treasure,['bronze-recruit','drachma']);
 expect(plan.evaluatedPairs).toBe(9);
 expect(plan.options.map(o=>o.first)).toContain('bronze-recruit');
 expect(plan.first).toBe('drachma');
});
