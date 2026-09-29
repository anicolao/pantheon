import {expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {setupExperiment,runExperiment,replayExperiment} from '../../scripts/balance/experiment';
import {activePlayer} from '../../src/lib/game/actions';
import {inventoryAtSetup,strategyView,strategyCommand,candidates,type Profile,type View} from '../../scripts/balance/strategy';
import {publicHorizon} from '../../scripts/balance/planning';
import {endGameActive,endGamePurchase,endGameGain} from '../../scripts/balance/end-game';
import {baseProfiles,endGameProfiles} from '../../scripts/balance/base-profiles';
function view():View{
 const {game}=setupExperiment('endgame-design',['thaleia','nereon'],'base-game');
 const v=strategyView(game,activePlayer(game),inventoryAtSetup(game,'base-game'),undefined,'base-game');
 v.phase='buys';v.hand=[];v.resources={actions:0,buys:1,coins:5,worship:0};v.opponentIncome=[0];return v;
}
const profile=(family:'treasure'|'engine',endGame:boolean,thinning=false):Profile=>({family,endGame,thinning,parameters:candidates[0]});
test('End Game waits for the uncapped two-turn horizon for either parent and Thin setting',()=>{
 for(const family of ['treasure','engine'] as const)for(const thin of [false,true]){
  const v=view(),before=structuredClone(v);
  expect(publicHorizon(v)).toBeGreaterThan(2);
  expect(strategyCommand(v,profile(family,true,thin))).toEqual(strategyCommand(v,profile(family,false,thin)));
  expect(v).toEqual(before);
  v.supply.acropolis=3;expect(publicHorizon(v)).toBe(2.25);
  expect(endGamePurchase(v)).toBeUndefined();
  v.supply.acropolis=2;expect(endGameActive(v)).toBe(true);
  expect(strategyCommand(v,profile(family,true,thin))).toMatchObject({cardId:'polis'});
  v.resources.coins=2;expect(strategyCommand(v,profile(family,true,thin))).toMatchObject({cardId:'hamlet'});
 }
});
test('pressure and three-pile depletion can activate End Game; actual threshold is inclusive',()=>{
 const v=view();v.supply.acropolis=4;v.opponentIncome=[8];
 expect(publicHorizon(v)).toBe(2);expect(endGameActive(v)).toBe(true);
 v.opponentIncome=[0];expect(endGameActive(v)).toBe(false);
 v.supply.obol=0;v.supply.drachma=0;v.supply.hamlet=2;
 expect(endGameActive(v)).toBe(true);
});
test('safe endings, restricted gains and multi-buy rescue apply to End Game',()=>{
 const v=view();v.resources.coins=8;v.supply.acropolis=1;v.myScore=3;v.scores=[100];
 expect(endGamePurchase(v)).not.toMatchObject({cardId:'acropolis'});
 v.bannedCards=['polis'];expect(endGameGain(v,['polis','hamlet'])).toBe('hamlet');
 v.bannedCards=[];expect(endGameGain(v,['polis','hamlet'])).toBe('polis');
 v.supply={polis:2,acropolis:0,hamlet:6,obol:20};v.resources={actions:0,coins:10,buys:2,worship:0};v.scores=[8];
 expect(endGamePurchase(v)).toMatchObject({cardId:'polis'});
});
test('End Game off reproduces all previous parent/thinning matchups',()=>{
 for(const first of Object.keys(baseProfiles))for(const second of Object.keys(baseProfiles)){
  const saved=JSON.parse(gunzipSync(readFileSync('balance-results/base-thinning-v1/replays/0-'+first+'-'+second+'.json.gz')).toString());
  const options={...saved.options,profiles:saved.options.profiles.map((p:Profile)=>({...p,endGame:false}))};
  const next=runExperiment(options);expect(next.events).toEqual(saved.events);
  expect({...next.result,profiles:saved.result.profiles}).toEqual(saved.result);
 }
},180000);
test('all parent × Thin × End Game combinations finish and replay; screening selects Money only',()=>{
 const profiles=(['treasure','engine'] as const).flatMap(family=>[false,true].flatMap(thin=>[false,true].map(end=>profile(family,end,thin))));
 expect(new Set(profiles.map(p=>[p.family,p.thinning,p.endGame].join('/'))).size).toBe(8);
 expect(Object.values(endGameProfiles)).toHaveLength(4);
 expect(Object.values(endGameProfiles).every(p=>p.family==='treasure')).toBe(true);
 for(const first of profiles)for(const second of profiles){
  const options={seed:'endgame-smoke',block:0,lineup:['thaleia','nereon'],profiles:[first,second],focal:0,variant:'base-game' as const};
  const {result,events}=runExperiment(options);expect(result.status).toBe('completed');
  expect(replayExperiment(events,options).turn.phase).toBe('finished');
  for(const p of result.players){expect(p.telemetry.worship).toEqual({});expect(p.telemetry.leaderTriggers).toBe(0);
   if(!options.profiles[p.position].thinning)expect(p.telemetry.trashes).toEqual({});
  }
 }
},180000);
