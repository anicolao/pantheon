import {afterAll,expect,test} from 'bun:test';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {botDifficulties,easyHeuristics,seatBotKind,type BotKind} from '../../src/lib/game/bot-kind';
import {tableDecision} from '../../src/lib/bots/difficulty';
import {PlanningEnvironment} from '../../scripts/rl/planning_environment';
import {commands} from '../../src/lib/bots/rl-schema';
import {sampleBelief} from '../../src/lib/bots/planning/rollout';
import {freshTable,occupy,begin,restoreTable,append} from '../../src/lib/tabletop/table';
import {TableBotDriver} from '../../src/lib/bots/table';
import {replaySetup} from '../../src/lib/game/setup';

// Research evidence retains the original machine paths. Relocate only the test
// manifests; the research loaders still verify every actor and critic hash.
const fixtureDir=mkdtempSync(join(tmpdir(),'difficulty-manifests-'));
afterAll(()=>rmSync(fixtureDir,{recursive:true,force:true}));
let fixtureNumber=0;
const checkoutPath=(path:string)=>{
 const relative=path.includes('/balance-results/')?'balance-results/'+path.split('/balance-results/')[1]:path;
 if(!relative.startsWith('balance-results/'))throw Error('Unexpected research fixture path: '+path);
 return resolve(relative);
};
function fixtureManifest(source:any):string{
 const manifest=structuredClone(source);
 for(const entry of Object.values(manifest.actors) as {path:string}[])entry.path=checkoutPath(entry.path);
 if(manifest.planning){
  manifest.planning.worldManifest=fixtureManifest(JSON.parse(readFileSync(checkoutPath(manifest.planning.worldManifest),'utf8')));
  for(const spec of Object.values(manifest.planning.policies) as {critic:{path:string}}[])spec.critic.path=checkoutPath(spec.critic.path);
 }
 const path=join(fixtureDir,`${fixtureNumber++}.json`);writeFileSync(path,JSON.stringify(manifest));return path;
}
const loadFixture=(path:string)=>fixtureManifest(JSON.parse(readFileSync(path,'utf8')));

const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
test('shipping actors and critics exactly match the evaluated tier manifests',()=>{
 const tiers=JSON.parse(readFileSync('balance-results/difficulty-tiers-v1/tiers.json','utf8'));
 for(const leader of ['melia','nereon','thaleia','doreios']){
  expect(sha(`src/lib/bots/models/${leader}.json`)).toBe(tiers.standard.actors[leader].sha256);
  expect(sha(`src/lib/bots/models/hard/${leader}.json`)).toBe(tiers.hard.actors[leader].sha256);
 }
 for(const [leader,spec] of Object.entries(tiers.expert.planning.policies) as [string,any][])
  expect(sha(`src/lib/bots/models/critics/${leader}.json`)).toBe(spec.critic.sha256);
});
test('Easy picks every heuristic, deterministically per seat/game; only four difficulties are offered',()=>{
 expect(botDifficulties).toEqual(['easy','standard','hard','expert']);
 const kinds=new Set<string>();
 for(let i=0;i<100;i++){
  const kind=seatBotKind('easy','difficulty-'+i,'host');kinds.add(kind);
  expect(seatBotKind('easy','difficulty-'+i,'host')).toBe(kind);
 }
 expect([...kinds].sort()).toEqual([...easyHeuristics].sort());
});
for(const tier of ['hard','expert'] as const)for(const leader of ['melia','nereon','thaleia','doreios'])test(`${tier}/${leader} matches evaluated policy on legal public table decisions`,()=>{
 // For Hard use the all-Hard saved tier, via a temporary manifest.
 const tiers=JSON.parse(readFileSync('balance-results/difficulty-tiers-v1/tiers.json','utf8'));
 const path=fixtureManifest(tiers[tier]);
  const env=new PlanningEnvironment(leader,path);let state=env.reset(`tier-parity-${tier}-${leader}:0`,true);
  for(let i=0;i<8&&!state.done;i++){
   const view=env.tracker.view(env.game),expected=commands(view)[env.runtime()]!;
   const actual=tableDecision(env.game,env.tracker,structuredClone(env.tracker.memories[env.uid]),tier);
   expect(actual).toEqual(expected);state=env.step(env.runtime());
  }
},120000);
for(const leader of ['melia','thaleia','doreios'])test(`Expert ${leader} cannot read hidden identities, deck order, shuffle seed or private history`,()=>{
 const env=new PlanningEnvironment(leader,loadFixture('balance-results/production-options-v1/selected-field.json'));let state=env.reset('shipping-privacy:0',true);
 while(!state.done){const command=commands(env.tracker.view(env.game))[env.runtime()]!;if(command.type==='card/bought'||command.type==='god/worshipped')break;state=env.step(env.runtime());}
 expect(state.done).toBe(false);
 const before=tableDecision(env.game,env.tracker,structuredClone(env.tracker.memories[env.uid]),'expert');
 const belief=sampleBelief(env.game,env.tracker,0);
 for(const uid of env.game.turnOrder)for(const zone of uid===env.uid?['deck'] as const:['deck','hand','discard'] as const){
  const cards=env.game.decks[uid][zone];env.game.decks[uid][zone]=new Proxy(cards,{get(target,key){if(key==='length')return target.length;throw Error('Hidden card access: '+String(key));}});
 }
 for(const key of ['seed','movements','undo'])Object.defineProperty(env.game,key,{get(){throw Error('Private field access: '+key);}});
 expect(sampleBelief(env.game,env.tracker,0).game).toEqual(belief.game);
 expect(tableDecision(env.game,env.tracker,structuredClone(env.tracker.memories[env.uid]),'expert')).toEqual(before);
},120000);
for(const count of [2,3,4])test(`${count}-player difficulty seats persist and complete legal play across driver reload`,()=>{
 let table=freshTable();const kinds:BotKind[]=['easy','expert','hard','standard'];
 for(let i=0;i<count;i++){table=occupy(table,table.seats[i].edge,'bot');table.seats[i].botKind=kinds[i];}
 table=begin(table,'shipping-difficulties-'+count);table=restoreTable(JSON.stringify(table));
 let driver=new TableBotDriver();let steps=0;
 while(replaySetup(table.events).turn.phase!=='finished'){
  expect(++steps).toBeLessThan(2500);
  const host=table.events[0].actorUid,proposal=driver.next(table.events,host)!;expect(proposal).not.toBeNull();
  if(steps===30){const restored=new TableBotDriver();expect(restored.next(table.events,host)).toEqual(proposal);driver=restored;}
  table=append(table,proposal.actorUid,proposal.command);
 }
},120000);

test('public inventory view preserves the previous policy observation through gains and cleanup',()=>{
 const {FourEnvironment}=require('../../scripts/rl/four_environment');
 const {publicStrategyView}=require('../../src/lib/bots/public-view');
 const {strategyView}=require('../../balance-checkpoint/equal-turns/source/scripts/balance/strategy');
 const env=new FourEnvironment('doreios',loadFixture('balance-results/production-options-v1/inputs/world.json'));
 let state=env.reset('observation-compatibility:0',true),steps=0;
 while(!state.done){
  expect(++steps).toBeLessThan(1000);
  expect(publicStrategyView(env.game,env.uid,env.tracker.inventory,17)).toEqual(strategyView(env.game,env.uid,env.tracker.inventory,undefined,'standard',17));
  state=env.step(env.runtime());
 }
});
