import {expect,test} from 'bun:test';
import {setupExperiment,runExperiment,replayExperiment} from '../../scripts/balance/experiment';
import {activePlayer,standings} from '../../src/lib/game/actions';
import {inventoryAtSetup,strategyView,strategyCommand,candidates,type Profile,type View} from '../../scripts/balance/strategy';
import {endGamePolicies,acquisitionRedraw,scoringActive,investmentFactor,legacyPointValue} from '../../scripts/balance/end-game';
function view():View{
 const {game}=setupExperiment('shared-ending',['thaleia','nereon'],'base-game');
 const v=strategyView(game,activePlayer(game),inventoryAtSetup(game,'base-game'),undefined,'base-game');
 v.phase='buys';v.hand=[];v.resources={actions:0,buys:1,coins:5,worship:0};v.opponentIncome=[0];return v;
}
test('redraw timing distinguishes remaining deck, shuffle pool and throughput',()=>{
 const v=view();v.owned={obol:40};v.drawPileCount=40;v.drawsPerTurn=8;
 expect(acquisitionRedraw(v,5)).toBe(0);
 v.drawPileCount=0;expect(acquisitionRedraw(v,5)).toBeCloseTo(40/41);
 expect(acquisitionRedraw(v,1)).toBeCloseTo(8/41);
 v.drawsPerTurn=16;expect(acquisitionRedraw(v,1)).toBeCloseTo(16/41);
 expect(acquisitionRedraw(v,0)).toBe(0);
 expect(acquisitionRedraw(v,100)).toBe(1);
});
test('every policy uses identical activation for any base objective; no mutation',()=>{
 for(const policy of endGamePolicies)for(const family of ['treasure','engine'] as const)for(const thinning of [false,true]){
  const v=view(),before=structuredClone(v),p:Profile={family,thinning,endGamePolicy:policy,parameters:candidates[0]};
  v.supply.acropolis=1;
  const original=structuredClone(v);
  expect(strategyCommand(v,p)).toMatchObject({cardId:'polis'});
  expect(v).toEqual(original);
  expect(investmentFactor(before,p)).toBe(1);
 }
});
test('Engine heuristic is an explicit reusable policy, not baked into base economics',()=>{
 const v=view();v.supply.acropolis=2;
 expect(legacyPointValue(v,'polis',true)).toBe(9);
 for(const family of ['treasure','engine'] as const){
  expect(investmentFactor(v,{family,parameters:candidates[0],endGamePolicy:'engine'})).toBe(0.35);
  expect(investmentFactor(v,{family,parameters:candidates[0],endGamePolicy:'redraw-50'})).toBe(1);
 }
 expect(scoringActive(v,'turn-1')).toBe(false);
 expect(scoringActive(v,'turn-2')).toBe(true);
});
test('new policies preserve known losing-ending protection and independent Thin',()=>{
 for(const policy of endGamePolicies)for(const family of ['treasure','engine'] as const){
  const v=view();v.supply.acropolis=1;v.resources.coins=8;v.myScore=3;v.scores=[100];
  const p:Profile={family,parameters:candidates[0],thinning:false,endGamePolicy:policy};
  expect(strategyCommand(v,p)).not.toMatchObject({cardId:'acropolis'});
  v.choice={id:'trash',kind:'trash',source:'seed-keeper',min:0,max:2};
  v.hand=[{id:'h',cardId:'hamlet',copy:0}];
  expect(strategyCommand(v,p)).toMatchObject({targets:[]});
 }
});
test('every candidate works for both parents and Thin settings, with exact legal replays',()=>{
 for(const policy of endGamePolicies)for(const family of ['treasure','engine'] as const)for(const thinning of [false,true]){
  const profile:Profile={family,thinning,endGamePolicy:policy,parameters:candidates[0]};
  const options={seed:'shared-endgame-smoke',block:0,lineup:['thaleia','nereon'],profiles:[profile,{family:'engine' as const,thinning:true,endGame:false,parameters:candidates[0]}],focal:0,variant:'base-game' as const};
  const {result,events}=runExperiment(options);expect(result.status).toBe('completed');
  const replay=replayExperiment(events,options);expect(replay.turn.phase).toBe('finished');
  for(const p of result.players)expect(standings(replay).find(r=>r.uid===p.uid)!.score).toBe(p.score);
 }
},180000);
