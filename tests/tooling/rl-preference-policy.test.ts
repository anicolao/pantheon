import {test,expect} from 'bun:test';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {FourEnvironment} from '../../scripts/rl/four_environment';
import {actorObservation} from '../../scripts/rl/research_actor';
import {preferenceAction,preferenceGenes} from '../../scripts/rl/preference_policy';
import {slots,deckIds} from '../../src/lib/bots/rl-schema';
import type {StandardView} from '../../standard-matrix/policy';
test('zero state preferences preserve every action and full replay across four seating rotations',()=>{
 const dir=mkdtempSync(join(tmpdir(),'preference-'));
 try{
  const actors=Object.fromEntries(['melia','nereon','thaleia','doreios'].map(l=>{const path=resolve(`src/lib/bots/models/${l}.json`);return [l,{path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}];}));
  const path=join(dir,'actors.json');writeFileSync(path,JSON.stringify({actors}));const env=new FourEnvironment('doreios',path),parameters=preferenceGenes.map(()=>0);
  for(let i=0;i<4;i++){
   let state=env.reset('preference-zero:'+i,true);
   while(!state.done){const v=env.tracker.view(env.game),a=env.actors.doreios,index=preferenceAction(v,a.logits(actorObservation(a,env.game,env.tracker,v)),parameters);expect(index).toBe(env.runtime());state=env.step(index);}
   expect(state.info!.replayVerified).toBe(true);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('state preferences respect affordability and distinguish trash from discard',()=>{
 const v={leader:'doreios',phase:'buys',hand:[],owned:{obol:6,drachma:3},resources:{coins:4,buys:1,actions:0,worship:0},events:[],supply:Object.fromEntries(deckIds.map(id=>[id,10])),myTurns:4,myScore:5,scores:[12,15,18]} as unknown as StandardView;
 const logits=slots.map(()=>0),p=preferenceGenes.map(g=>Number(g.kind==='buyGain'&&g.id==='council-of-sages'&&g.feature==='coins'));
 expect(slots[preferenceAction(v,logits,p)]).toEqual({kind:'buy',ids:['council-of-sages']});
 expect(slots[preferenceAction({...v,resources:{...v.resources,coins:3}},logits,p)].ids).not.toEqual(['council-of-sages']);
 const hand=[{id:'o1',cardId:'obol',copy:1},{id:'o2',cardId:'obol',copy:2}],choice={id:'c',kind:'trash' as const,source:'blessing-of-the-fields',min:0,max:2};
 const trash=preferenceGenes.map(g=>Number(g.kind==='trash'&&g.id==='obol'&&g.feature==='constant'));
 expect(slots[preferenceAction({...v,hand,choice},logits,trash)].ids).toEqual(['obol','obol']);
 expect(slots[preferenceAction({...v,hand,choice:{...choice,kind:'discard'}},logits,trash)].ids).toEqual([]);
});
