import {expect,test} from 'bun:test';
import {setupExperiment,runExperiment} from '../../scripts/balance/experiment';
import {activePlayer} from '../../src/lib/game/actions';
import {strategyView,inventoryAtSetup,strategyCommand} from '../../scripts/balance/strategy';
import {baseProfiles,v14BaseProfiles} from '../../scripts/balance/base-profiles';
import {rolloutEstimate,sampledAfter,sampledValue,rolloutSamples,rolloutTurns} from '../../scripts/balance/sampled';
function view(){
 const {game}=setupExperiment('sample-test',['thaleia','nereon'],'base-game');
 const v=strategyView(game,activePlayer(game),inventoryAtSetup(game,'base-game'),undefined,'base-game');
 v.phase='buys';v.resources={actions:0,buys:1,coins:4,worship:0};v.endGamePolicy='turn-2';return v;
}
test('pure Treasure and inert decks are sampled across three sequential turns',()=>{
 const v=view();v.owned={talent:5};
 const e=rolloutEstimate(v);expect(e.samples).toBe(rolloutSamples);expect(e.turns).toBe(rolloutTurns);
 expect(e.coins).toBe(45);expect(e.draws).toBe(15);expect(e.perTurn).toEqual(Array.from({length:3},()=>({coins:15,draws:5})));
 v.owned={hamlet:10};expect(rolloutEstimate(v).coins).toBe(0);expect(rolloutEstimate(v).draws).toBe(15);
});
test('draw metric counts actual draws rather than printed draw capacity',()=>{
 const v=view();v.owned={'council-of-sages':1};
 expect(rolloutEstimate(v).draws).toBe(3);
 v.owned={'council-of-sages':1,obol:9};
 expect(rolloutEstimate(v).draws).toBeGreaterThan(15);
});
test('parents differ only in which metric they read from the same samples',()=>{
 const v=view();v.owned={'council-of-sages':1,'harbor-pilot':1,obol:6,hamlet:3};
 const e=rolloutEstimate(v);
 expect(sampledValue(v,baseProfiles.treasure)).toBe(e.coins);
 expect(sampledValue(v,baseProfiles.engine)).toBe(e.draws);
 const changed={...v,owned:{...v.owned,talent:1},supply:{...v.supply,talent:v.supply.talent-1}};
 expect(sampledAfter(v,baseProfiles.treasure,'talent')).toBe(rolloutEstimate({...v,supply:changed.supply},changed.owned).coins);
 expect(sampledAfter(v,baseProfiles.engine,'talent')).toBe(rolloutEstimate({...v,supply:changed.supply},changed.owned).draws);
});
test('samples use public composition and preserve the caller state',()=>{
 const v=view(),before=structuredClone(v),a=rolloutEstimate(v);
 const other={...v,hand:[...v.hand].reverse(),drawPileCount:999,drawsPerTurn:99};
 expect(rolloutEstimate(other)).toEqual(a);expect(v).toEqual(before);
 expect(baseProfiles.engine.evaluation).toBe('shuffle-3');expect(v14BaseProfiles.engine.evaluation).toBeUndefined();
});
test('Thin is optional in samples and its changes persist into later turns',()=>{
 const v=view();v.owned={'seed-keeper':1,talent:3,hamlet:6};
 const off=rolloutEstimate(v,v.owned,false),on=rolloutEstimate(v,v.owned,true);
 expect(on.perTurn[0]).toEqual(off.perTurn[0]);
 expect(on.coins).toBeGreaterThan(off.coins);
});
test('new policies preserve known losing-ending and safe top-point choices',()=>{
 const v=view();v.resources.coins=8;v.supply.acropolis=1;v.myScore=0;v.scores=[50];
 for(const p of [baseProfiles.treasure,baseProfiles.engine]){
  expect(strategyCommand(v,p)).not.toMatchObject({type:'card/bought',cardId:'acropolis'});
 }
 v.myScore=60;
 for(const p of [baseProfiles.treasure,baseProfiles.engine])expect(strategyCommand(v,p)).toEqual({type:'card/bought',cardId:'acropolis'});
});
test('sampled policies complete and preserve optional-thinning semantics',()=>{
 for(const family of ['treasure','engine'] as const){
  const r=runExperiment({seed:'shuffle-pilot-'+family,block:0,lineup:['thaleia','nereon'],profiles:[baseProfiles[family],v14BaseProfiles[family]],focal:0,variant:'base-game'});
  expect(r.result.status).toBe('completed');expect(r.result.players[0].telemetry.trashes).toEqual({});
 }
},180000);

test('candidate insertion ranks pair equivalent opening effects across card types',()=>{
 const v=view();
 const estimate=(id:string)=>rolloutEstimate({...v,supply:{...v.supply,[id]:v.supply[id]-1}},{...v.owned,[id]:1});
 const action=estimate('bronze-recruit'),treasure=estimate('drachma');
 expect(action.perTurn[0]).toEqual(treasure.perTurn[0]);
 // Later production reshuffles start from different cleanup orders because the
 // Action is played before Treasures; paired seeds do not remove that variance.
 expect(Math.abs(action.coins-treasure.coins)).toBeLessThan(0.25);
});
