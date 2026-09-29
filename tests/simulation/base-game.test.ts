import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {expect,test} from 'bun:test';
import {setupExperiment,runExperiment,replayExperiment} from '../../scripts/balance/experiment';
import {inventoryAtSetup,strategyView,strategyCommand,candidates,type Family} from '../../scripts/balance/strategy';
import {actionEffects,leaderEffects,activePlayer,applyPlayCommand,standings} from '../../src/lib/game/actions';
import {cardFeatures,engineCapacity} from '../../scripts/balance/engine';
import {moneyEstimate,moneyAction} from '../../scripts/balance/money';
const variant='base-game' as const;
test('base setup retains ten cards with identical inert Temples and no Worship access',()=>{
 const {game}=setupExperiment('base-setup',['thaleia','nereon'],variant),inventory=inventoryAtSetup(game,variant);
 expect(Object.values(inventory)[0]).toEqual(Object.values(inventory)[1]);
 expect(Object.values(inventory)[0]).toEqual({obol:6,hamlet:3,'temple-of-athena':1});
 expect(game.sharedEvents).toEqual([]);expect(game.resources.worship).toBe(0);
 for(const uid of game.turnOrder){
  const v=strategyView(game,uid,inventory,undefined,variant);
  expect(Object.values(v.leaderBonus).every(n=>n===0)).toBe(true);
  expect(v.events).toEqual([]);expect(moneyEstimate(v).mean).toBe(3);
  expect(engineCapacity(v).terminalDemand).toBe(0);
 }
 expect(actionEffects('temple-of-athena',variant)).toEqual([]);
 expect(cardFeatures('temple-of-athena',variant).actions).toBe(0);
 expect(cardFeatures('temple-of-athena').actions).toBe(1);
 expect(leaderEffects('melia',variant)).toEqual([]);
 expect(leaderEffects('melia')).not.toEqual([]);
});
test('base reducer disables leader effects, Temple payload and Worship; bots do not play blank Temples',()=>{
 const {game}=setupExperiment('base-reducer',['thaleia','nereon'],variant),uid=activePlayer(game);
 game.decks[uid].hand=[{id:'blank',cardId:'temple-of-athena',copy:1}];
 const v=strategyView(game,uid,inventoryAtSetup(game,variant),undefined,variant);
 expect(moneyAction(v)).toBeUndefined();
 expect(strategyCommand(v,{family:'engine',parameters:candidates[0]})).toEqual({type:'phase/advanced'});
 applyPlayCommand(game,uid,{type:'action/played',instanceId:'blank'},100,variant);
 expect(game.resources.actions).toBe(0);expect(game.resources.worship).toBe(0);expect(game.turn.leaderUsed).toBe(false);
 expect(game.movements.filter(m=>m.kind==='leader')).toEqual([]);
 expect(()=>applyPlayCommand(game,uid,{type:'god/worshipped',cardId:'athenas-counsel'},101,variant)).toThrow('Worship is disabled');
});
test('all four seat-specific strategy cells complete and replay without leader or Worship events',()=>{
 for(const first of ['treasure','engine'] as Family[])for(const second of ['treasure','engine'] as Family[]){
  const options={seed:'base-replay',block:0,lineup:['thaleia','nereon'],profiles:[first,second].map(family=>({family,parameters:candidates[0]})),focal:0,variant};
  const {result,events}=runExperiment(options);expect(result.status).toBe('completed');
  for(const p of result.players){expect(p.telemetry.leaderTriggers).toBe(0);expect(p.telemetry.worship).toEqual({});}
  const replay=replayExperiment(events,options);expect(replay.turn.phase).toBe('finished');
  for(const p of result.players)expect(standings(replay).find(r=>r.uid===p.uid)?.score).toBe(p.score);
 }
},30000);
test('inert leader labels do not alter base-game decisions or results',()=>{
 const options={seed:'base-labels',block:0,lineup:['thaleia','nereon'],profiles:[{family:'treasure' as const,parameters:candidates[0]},{family:'engine' as const,parameters:candidates[0]}],focal:0,variant};
 const a=runExperiment(options),b=runExperiment({...options,lineup:['melia','doreios']});
 const strip=(r:typeof a)=>r.result.players.map(({leader,...p})=>p).sort((a,b)=>a.position-b.position);
 expect(strip(a)).toEqual(strip(b));
 expect(a.events.filter(e=>e.type!=='leader/chosen')).toEqual(b.events.filter(e=>e.type!=='leader/chosen'));
},30000);


test('standard-rule archived Treasure games retain identical results',()=>{
 for(const cell of ['treasure-treasure','treasure-engine','engine-treasure']){
  const saved=JSON.parse(gunzipSync(readFileSync(`balance-results/treasure-epsilon-v8/replays/thaleia-nereon-${cell}-0.json.gz`)).toString());
  expect(runExperiment(saved.options).result).toEqual(saved.result);
 }
 const saved=JSON.parse(gunzipSync(readFileSync('balance-results/all-leaders-v5/replays/thaleia-nereon-engine-engine-0.json.gz')).toString());
 expect(runExperiment(saved.options).result).toEqual(saved.result);
},30000);
