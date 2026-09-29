import {expect,test} from 'bun:test';
import {setupExperiment,runExperiment,replayExperiment} from '../../scripts/balance/experiment';
import {inventoryAtSetup,strategyView,strategyCommand,cardValue,candidates,type View,type Profile} from '../../scripts/balance/strategy';
import {activePlayer,standings,type Choice} from '../../src/lib/game/actions';
import {objectiveChange,objectiveToolPremium,objectiveTrashChoice,thinningObjective} from '../../scripts/balance/objective-thin';
import {moneyEstimate} from '../../scripts/balance/money';
const card=(cardId:string,copy=0)=>({cardId,copy,id:cardId+'-'+copy});
const trash:Choice={id:'trash',kind:'trash',source:'seed-keeper',min:0,max:2};
function view(owned?:Record<string,number>):View{
 const {game}=setupExperiment('orthogonal-design',['thaleia','nereon'],'base-game');
 const v=strategyView(game,activePlayer(game),inventoryAtSetup(game,'base-game'),undefined,'base-game');
 if(owned)v.owned=owned;
 v.hand=[];v.resources={actions:1,coins:0,buys:1,worship:0};return v;
}
const profile=(family:'treasure'|'engine',thinning:boolean):Profile=>({family,thinning,parameters:candidates[0]});
test('thinning is an explicit independent switch for both families',()=>{
 for(const family of ['treasure','engine'] as const){
  const v=view();v.hand=[card('hamlet'),card('obol')];v.choice=trash;
  expect(strategyCommand(v,profile(family,false))).toMatchObject({targets:[]});
  expect(strategyCommand(v,profile(family,true))).toMatchObject({targets:['hamlet-0']});
  expect(objectiveChange(v,family,[card('obol')])).toBeLessThan(0);
 }
});
test('Money removal optimizes income per initial draw including playable draw Actions',()=>{
 const v=view({talent:3,obol:3,hamlet:3,'council-of-sages':1});
 expect(thinningObjective(v,'treasure')).toBeCloseTo(moneyEstimate(v).mean/5,12);
 expect(objectiveChange(v,'treasure',[card('council-of-sages')])).toBeLessThan(0);
 expect(objectiveChange(v,'treasure',[card('hamlet')])).toBeGreaterThan(0);
});
test('Engine preserves whole-deck draw and enough payload to buy points',()=>{
 const v=view({talent:3,hamlet:5,'sacred-academy':2,obol:1});
 expect(objectiveChange(v,'engine',[card('sacred-academy')])).toBeLessThan(0);
 expect(objectiveChange(v,'engine',[card('talent')])).toBeLessThan(0);
 expect(objectiveChange(v,'engine',[card('obol')],undefined,false)).toBeGreaterThan(0);
});
test('objectives can disagree: Engine can remove a coin to complete coverage while Money preserves income',()=>{
 // Four cantrip drawers can already reach this twelve-card deck; Engine still has
 // its documented two-card reliability margin. Removing a coin helps coverage,
 // but reduces the income of a full-deck Money hand.
 const v=view({talent:3,obol:1,'sacred-academy':4,hamlet:4});
 expect(objectiveChange(v,'engine',[card('obol')],undefined,false)).toBeGreaterThan(0);
 expect(objectiveChange(v,'treasure',[card('obol')],undefined,false)).toBeLessThan(0);
});
test('tools compete for purchases, decline redundant capacity, and retain parent scoring',()=>{
 for(const family of ['treasure','engine'] as const){
  const dirty=view();
  expect(objectiveToolPremium(dirty,family,'seed-keeper')).toBeGreaterThan(0);
  const covered=view({...dirty.owned,'seed-keeper':3});
  expect(objectiveToolPremium(covered,family,'seed-keeper')).toBeLessThan(objectiveToolPremium(dirty,family,'seed-keeper'));
  const clean=view({talent:3,'sacred-academy':3});
  expect(objectiveToolPremium(clean,family,'seed-keeper')).toBe(0);
  const buy=view();buy.phase='buys';buy.resources.coins=8;
  expect(strategyCommand(buy,profile(family,true))).toEqual(strategyCommand(buy,profile(family,false)));
  if(family==='treasure')expect(strategyCommand(buy,profile(family,true))).toMatchObject({cardId:'acropolis'});
 }
 const v=view();
 expect(cardValue(v,profile('engine',true),'seed-keeper')).toBeGreaterThan(cardValue(v,profile('engine',false),'seed-keeper'));
});
test('joint removals retain income and points near an ending',()=>{
 for(const family of ['treasure','engine'] as const){
  const v=view({talent:2,drachma:1,obol:2,hamlet:4});v.hand=[card('talent'),card('talent',1),card('hamlet')];
  const chosen=objectiveTrashChoice(v,family,trash);
  expect(chosen.targets).toContain('hamlet-0');
  expect(chosen.targets).not.toContain('talent-0');
  const end=view();end.hand=[card('hamlet')];end.supply.acropolis=1;
  expect(objectiveTrashChoice(end,family,trash).targets).toEqual([]);
 }
});
test('Forge considers replacement jointly and permits a known winning point conversion',()=>{
 for(const family of ['treasure','engine'] as const){
  const v=view({talent:2,hamlet:3});v.hand=[card('talent')];v.supply.acropolis=1;v.myScore=3;v.scores=[8];v.choice={...trash,max:1,forge:true};
  expect(strategyCommand(v,profile(family,true))).toMatchObject({targets:['talent-0']});
  const gained={...v,owned:{talent:1,hamlet:3},hand:[],choice:{id:'gain',kind:'gain' as const,source:'forge-of-heroes',min:1,max:1,limit:8}};
  expect(strategyCommand(gained,profile(family,true))).toMatchObject({targets:['acropolis']});
 }
});
test('all sixteen explicit profiles complete, replay, and disabled thinning never trashes',()=>{
 const ps=[profile('treasure',false),profile('treasure',true),profile('engine',false),profile('engine',true)];
 const removals={treasure:0,engine:0};
 for(const first of ps)for(const second of ps){
  const options={seed:'orthogonal-smoke',block:0,lineup:['thaleia','nereon'],profiles:[first,second],focal:0,variant:'base-game' as const};
  const {result,events}=runExperiment(options);expect(result.status).toBe('completed');
  for(const p of result.players){
   expect(p.telemetry.worship).toEqual({});expect(p.telemetry.leaderTriggers).toBe(0);
   if(!options.profiles[p.position].thinning)expect(p.telemetry.trashes).toEqual({});
   else removals[p.family as 'treasure'|'engine']+=Object.values(p.telemetry.trashes).reduce((a,b)=>a+b,0);
  }
  const replay=replayExperiment(events,options);
  expect(replay.turn.phase).toBe('finished');
  for(const p of result.players)expect(standings(replay).find(r=>r.uid===p.uid)?.score).toBe(p.score);
 }
 expect(removals.treasure).toBeGreaterThan(0);expect(removals.engine).toBeGreaterThan(0);
},120000);

test('thinning gains respect bans and inactive leader labels cannot change enabled play',()=>{
 for(const family of ['treasure','engine'] as const){
  const v=view({talent:2,hamlet:3});v.supply.acropolis=1;v.myScore=3;v.scores=[8];v.bannedCards=['acropolis'];
  v.choice={id:'gain',kind:'gain',source:'forge-of-heroes',min:1,max:1,limit:8};
  expect(strategyCommand(v,profile(family,true))).not.toMatchObject({targets:['acropolis']});
 }
 const options={seed:'orthogonal-labels',block:0,lineup:['thaleia','nereon'],profiles:[profile('treasure',true),profile('engine',true)],focal:0,variant:'base-game' as const};
 const a=runExperiment(options),b=runExperiment({...options,lineup:['melia','doreios']});
 expect(a.events.filter(e=>e.type!=='leader/chosen')).toEqual(b.events.filter(e=>e.type!=='leader/chosen'));
},30000);
