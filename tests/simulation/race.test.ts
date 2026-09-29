import {expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {setupExperiment,runExperiment,replayExperiment} from '../../scripts/balance/experiment';
import {activePlayer,standings} from '../../src/lib/game/actions';
import {inventoryAtSetup,strategyView,strategyCommand,candidates,type Profile,type View} from '../../scripts/balance/strategy';
import {publicHorizon} from '../../scripts/balance/planning';
import {raceView,racePointEligible,racePurchase} from '../../scripts/balance/race';
import {objectiveChange,thinningObjective} from '../../scripts/balance/objective-thin';
import {baseProfiles,raceProfiles} from '../../scripts/balance/base-profiles';
function view():View {
 const {game}=setupExperiment('race-design',['thaleia','nereon'],'base-game');
 const v=strategyView(game,activePlayer(game),inventoryAtSetup(game,'base-game'),undefined,'base-game');
 v.phase='buys';v.hand=[];v.resources={actions:0,buys:1,coins:5,worship:0};return v;
}
const profile=(family:'treasure'|'engine',race:boolean,thinning=false):Profile=>({family,race,thinning,parameters:candidates[0]});
test('eight profiles form the full parent × thinning × Race product',()=>{
 expect(Object.keys(raceProfiles)).toHaveLength(8);
 expect(new Set(Object.values(raceProfiles).map(p=>[p.family,p.thinning,p.race].join('/'))).size).toBe(8);
 for(const family of ['treasure','engine'])for(const thinning of [false,true])for(const race of [false,true])
  expect(Object.values(raceProfiles).filter(p=>p.family===family&&p.thinning===thinning&&p.race===race)).toHaveLength(1);
});
test('both parents race for middle-tier points earlier with thinning independently on or off',()=>{
 for(const family of ['treasure','engine'] as const)for(const thin of [false,true]){
  const v=view();
  expect(strategyCommand(v,profile(family,true,thin))).toEqual({type:'card/bought',cardId:'polis'});
  expect(strategyCommand(v,profile(family,false,thin))).not.toMatchObject({cardId:'polis'});
  v.resources.coins=8;
  expect(strategyCommand(v,profile(family,true,thin))).toEqual({type:'card/bought',cardId:'acropolis'});
 }
});
test('Race preserves economic openings and avoids low-tier points until an imminent ending',()=>{
 for(const family of ['treasure','engine'] as const){
  const v=view();v.resources.coins=3;
  expect(strategyCommand(v,profile(family,true))).not.toMatchObject({cardId:'hamlet'});
  expect(racePointEligible(v,'hamlet')).toBe(false);
  v.supply.acropolis=1;expect(racePointEligible(v,'hamlet')).toBe(true);
  expect(strategyCommand(v,profile(family,true))).toMatchObject({cardId:'hamlet'});
 }
});
test('Race shortens investment time without changing the thinning objective or caller observation',()=>{
 for(const family of ['treasure','engine'] as const){
  const v=view(),p=profile(family,true,true),r=raceView(v,p);
  expect(publicHorizon(v)).toBeGreaterThan(3);expect(publicHorizon(r)).toBe(3);
  expect(v.raceHorizon).toBeUndefined();expect(raceView(r,p)).toBe(r);
  expect(thinningObjective(r,family)).toBe(thinningObjective(v,family));
  const card={id:'hamlet',cardId:'hamlet',copy:0};
  expect(objectiveChange(r,family,[card])).toBeLessThan(objectiveChange(v,family,[card]));
  expect(raceView(v,profile(family,false))).toBe(v);
 }
});
test('Race keeps safe-ending, gain restriction and complete multi-buy safeguards',()=>{
 for(const family of ['treasure','engine'] as const){
  const v=view();v.resources.coins=8;v.supply.acropolis=1;v.myScore=3;v.scores=[100];
  expect(strategyCommand(v,profile(family,true))).not.toMatchObject({cardId:'acropolis'});
  v.resources.coins=5;v.bannedCards=['polis'];
  expect(strategyCommand(v,profile(family,true))).not.toMatchObject({cardId:'polis'});
  v.choice={id:'gain',kind:'gain',source:'sacred-grove',min:1,max:1,limit:5};
  expect(strategyCommand(v,profile(family,true))).not.toMatchObject({targets:['polis']});
  v.bannedCards=[];expect(strategyCommand(v,profile(family,true))).toMatchObject({targets:['polis']});
 }
 const v=view();v.supply={polis:2,acropolis:0,hamlet:6,obol:20};v.resources={actions:0,coins:10,buys:2,worship:0};v.myScore=3;v.scores=[8];
 expect(racePurchase(v)).toEqual({type:'card/bought',cardId:'polis'});
});
test('Race does not enable optional thinning when Thin is off',()=>{
 for(const family of ['treasure','engine'] as const){
  const v=view();v.hand=[{id:'hamlet',cardId:'hamlet',copy:0}];v.choice={id:'trash',kind:'trash',source:'seed-keeper',min:0,max:2};
  expect(strategyCommand(v,profile(family,true,false))).toMatchObject({targets:[]});
 }
});
test('Race off reproduces every prior ordered thinning matchup exactly',()=>{
 for(const first of Object.keys(baseProfiles))for(const second of Object.keys(baseProfiles)){
  const saved=JSON.parse(gunzipSync(readFileSync('balance-results/base-thinning-v1/replays/0-'+first+'-'+second+'.json.gz')).toString());
  const options={...saved.options,profiles:saved.options.profiles.map((p:Profile)=>({...p,race:false}))};
  const next=runExperiment(options);expect(next.events).toEqual(saved.events);
  expect({...next.result,profiles:saved.result.profiles}).toEqual(saved.result);
 }
},180000);
test('all 64 combinations finish legally, replay, and retain the chosen modifiers',()=>{
 for(const first of Object.values(raceProfiles))for(const second of Object.values(raceProfiles)){
  const options={seed:'race-smoke',block:0,lineup:['thaleia','nereon'],profiles:[first,second],focal:0,variant:'base-game' as const};
  const {result,events}=runExperiment(options);expect(result.status).toBe('completed');
  expect(result.profiles).toEqual(options.profiles);
  const replay=replayExperiment(events,options);expect(replay.turn.phase).toBe('finished');
  for(const p of result.players){
   expect(p.telemetry.worship).toEqual({});expect(p.telemetry.leaderTriggers).toBe(0);
   if(!options.profiles[p.position].thinning)expect(p.telemetry.trashes).toEqual({});
   expect(standings(replay).find(r=>r.uid===p.uid)?.score).toBe(p.score);
  }
 }
},180000);

test('Race thinning charges the lost middle-tier scoring opportunity this turn',()=>{
 for(const family of ['treasure','engine'] as const){
  const v=raceView(view(),profile(family,true,true));v.phase='actions';v.resources.coins=0;
  v.owned={talent:3,drachma:1,obol:3,hamlet:3};
  v.hand=[{id:'drachma',cardId:'drachma',copy:0},...Array.from({length:3},(_,i)=>({id:'obol-'+i,cardId:'obol',copy:i}))];
  const remove=[v.hand[1]];
  expect(objectiveChange(v,family,remove,undefined,false)-objectiveChange(v,family,remove)).toBeCloseTo(4,10);
 }
});

test('declining early cheap points does not fabricate an empty supply pile',()=>{
 const v=view();v.resources.coins=4;v.myScore=3;v.scores=[100];
 v.supply={acropolis:8,hamlet:8,drachma:30,obol:40,'council-of-sages':0,'harbor-pilot':0};
 expect(strategyCommand(v,profile('treasure',true))).toEqual({type:'card/bought',cardId:'drachma'});
 expect(v.supply.hamlet).toBe(8);
});
