import {test,expect} from 'bun:test';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {FourEnvironment} from '../../scripts/rl/four_environment';
import {sampleBelief,rolloutDecision} from '../../scripts/rl/belief_rollout';
import {publicObservation} from '../../scripts/rl/public_features';
import {commands} from '../../src/lib/bots/rl-schema';

test('Thaleia win-value leaves use her perspective after four own turns',()=>{
 const dir=mkdtempSync(join(tmpdir(),'thaleia-leaf-'));
 try{
  const actors=Object.fromEntries(['melia','nereon','thaleia','doreios'].map(l=>{const path=resolve(`src/lib/bots/models/${l}.json`);return [l,{path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}];}));
  const file=join(dir,'actors.json');writeFileSync(file,JSON.stringify({actors}));const env=new FourEnvironment('thaleia',file);let state=env.reset('thaleia-win-leaf:0',true);
  while(!state.done&&commands(env.tracker.view(env.game))[env.runtime()]?.type!=='card/bought')state=env.step(env.runtime());
  expect(state.done).toBe(false);env.tracker.view(env.game);const original=JSON.stringify(env.game),starting=env.game.turn.turns[env.uid]??0;let leaves=0;
  const result=rolloutDecision(env.game,env.tracker,env.actors,{samples:2,candidates:2,risk:1,trash:false,utility:'win',leafHorizon:4,guardTreasures:false},(game,tracker)=>{
   leaves++;expect(tracker.view(game).leader).toBe('thaleia');expect(game.turn.turns[env.uid]).toBe(starting+4);return .75;
  });
  expect(leaves).toBe(4);expect(result.scores.every(x=>x.mean===.75&&x.delta===0)).toBe(true);expect(JSON.stringify(env.game)).toBe(original);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

for(const leader of ['doreios','thaleia'])test(`${leader} belief sampling never reads hidden cards or seed and preserves all public counts`,()=>{
 const dir=mkdtempSync(join(tmpdir(),'belief-'));
 try{
  const actors=Object.fromEntries(['melia','nereon','thaleia','doreios'].map(l=>{const path=resolve(`src/lib/bots/models/${l}.json`);return [l,{path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}];}));
  const file=join(dir,'actors.json');writeFileSync(file,JSON.stringify({actors}));const env=new FourEnvironment(leader,file);env.reset('belief-unit:0',true);
  const view=env.tracker.view(env.game),obs=publicObservation(env.game,env.tracker,view,'public-v1'),original=sampleBelief(env.game,env.tracker,0);
  for(const uid of env.game.turnOrder){
   for(const zone of uid===env.uid?['deck'] as const:['deck','hand','discard'] as const){
    const values=env.game.decks[uid][zone];env.game.decks[uid][zone]=new Proxy(values,{get(target,key){if(key==='length')return target.length;throw Error('Hidden identity access '+String(key));}});
   }
  }
  Object.defineProperty(env.game,'seed',{get(){throw Error('Real shuffle seed accessed');}});
  Object.defineProperty(env.game,'movements',{get(){throw Error('Private movement history accessed');}});
  Object.defineProperty(env.game,'undo',{get(){throw Error('Undo snapshot accessed');}});
  const sampled=sampleBelief(env.game,env.tracker,0);expect(sampled.game).toEqual(original.game);
  expect(publicObservation(sampled.game,sampled.tracker,sampled.tracker.view(sampled.game),'public-v1')).toEqual(obs);
  expect(commands(sampled.tracker.view(sampled.game)).map(Boolean)).toEqual(commands(view).map(Boolean));
  for(const uid of env.game.turnOrder){
   const counts:Record<string,number>={};for(const card of Object.values(sampled.game.decks[uid]).flat())counts[card.cardId]=(counts[card.cardId]??0)+1;
   for(const [id,n] of Object.entries(env.tracker.inventory[uid]))expect(counts[id]??0).toBe(n);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('sampled planning produces a legal action without mutating the real table',()=>{
 const dir=mkdtempSync(join(tmpdir(),'belief-planning-'));
 try{
  const actors=Object.fromEntries(['melia','nereon','thaleia','doreios'].map(l=>{const path=resolve(`src/lib/bots/models/${l}.json`);return [l,{path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}];}));
  const file=join(dir,'actors.json');writeFileSync(file,JSON.stringify({actors}));const env=new FourEnvironment('doreios',file);let state=env.reset('belief-planning:0',true);
  while(!state.done){const view=env.tracker.view(env.game),base=commands(view)[env.runtime()]!;if(base.type==='card/bought')break;state=env.step(env.runtime());}
  expect(state.done).toBe(false);env.tracker.view(env.game);const before=JSON.stringify(env.game),memory=JSON.stringify(env.tracker);
  const choice=rolloutDecision(env.game,env.tracker,env.actors,{samples:2,candidates:2,risk:1,trash:false});
  expect(rolloutDecision(env.game,env.tracker,env.actors,{samples:2,candidates:2,risk:1,trash:false,recordHypotheticalHistory:true})).toEqual(choice);
  expect(rolloutDecision(env.game,env.tracker,env.actors,{samples:2,candidates:2,risk:1,trash:false,maskedInference:true})).toEqual(choice);
  expect(choice.searched).toBe(true);expect(commands(env.tracker.view(env.game))).toContainEqual(choice.command);
  expect(JSON.stringify(env.game)).toBe(before);expect(JSON.stringify(env.tracker)).toBe(memory);
  let leafCalls=0;const startingTurns=env.game.turn.turns[env.uid]??0;
  const leafChoice=rolloutDecision(env.game,env.tracker,env.actors,{samples:2,candidates:2,risk:1,trash:false,utility:'margin',leafHorizon:1,maskedInference:true},(game,tracker)=>{
   leafCalls++;expect(game.turn.turns[env.uid]).toBe(startingTurns+1);expect(tracker.view(game).leader).toBe('doreios');return .5;
  });
  const unguarded=rolloutDecision(env.game,env.tracker,env.actors,{samples:2,candidates:2,risk:1,trash:false,utility:'margin',leafHorizon:1,guardTreasures:false},()=>.5);
  const expected=commands(env.tracker.view(env.game))[env.runtime()];if(!expected)throw Error('Runtime selected an illegal action');expect(unguarded.command).toEqual(expected);
  expect(leafCalls).toBe(4);expect(leafChoice.scores.every(x=>x.mean===.5&&x.delta===0)).toBe(true);
  expect(JSON.stringify(env.game)).toBe(before);expect(JSON.stringify(env.tracker)).toBe(memory);
  const marginChoice=rolloutDecision(env.game,env.tracker,env.actors,{samples:2,candidates:2,risk:1,trash:false,utility:'margin'});
  // Change information the real decision maker cannot know. Planning must not change.
  env.game.decks[env.uid].deck.reverse();
  for(const uid of env.game.turnOrder)if(uid!==env.uid){
   for(const zone of ['hand','deck','discard'] as const){
    const cards=env.game.decks[uid][zone];env.game.decks[uid][zone]=new Proxy(cards,{get(target,key){if(key==='length')return target.length;throw Error('Planner read opponent hidden identity '+String(key));}});
   }
  }
  Object.defineProperty(env.game,'seed',{get(){throw Error('Planner read real shuffle seed');}});
  const again=rolloutDecision(env.game,env.tracker,env.actors,{samples:2,candidates:2,risk:1,trash:false});expect(again).toEqual(choice);
  expect(rolloutDecision(env.game,env.tracker,env.actors,{samples:2,candidates:2,risk:1,trash:false,utility:'margin'})).toEqual(marginChoice);
  expect(rolloutDecision(env.game,env.tracker,env.actors,{samples:2,candidates:2,risk:1,trash:false,utility:'margin',leafHorizon:1,maskedInference:true},()=>.5)).toEqual(leafChoice);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
