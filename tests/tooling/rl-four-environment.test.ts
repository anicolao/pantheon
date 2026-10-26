import {expect,test} from 'bun:test';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {FourEnvironment} from '../../scripts/rl/four_environment';
import {TableBotDriver} from '../../src/lib/bots/table';
import {commands,observation} from '../../src/lib/bots/rl-schema';
import {activePlayer} from '../../src/lib/game/actions';

test('four-player training matches production decisions, replays exactly, and balances seats',()=>{
 const dir=mkdtempSync(join(tmpdir(),'four-rl-'));
 try{
  const actors=Object.fromEntries(['melia','nereon','thaleia','doreios'].map(leader=>{
   const path=resolve(`src/lib/bots/models/${leader}.json`);
   return [leader,{path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}];
  }));
  const manifest=join(dir,'actors.json');writeFileSync(manifest,JSON.stringify({actors}));
  const seats:number[]=[],positions:number[]=[];
  for(let rotation=0;rotation<4;rotation++){
   const env=new FourEnvironment('doreios',manifest),driver=new TableBotDriver();
   let state=env.reset(`d4-smoke:${rotation}`,true);
   while(!state.done){
    const view=env.tracker.view(env.game),before=observation(view),mask=commands(view).map(Boolean);
    // Reversing every hidden deck cannot alter public policy inputs.
    for(const deck of Object.values(env.game.decks))deck.deck.reverse();
    expect(observation(env.tracker.view(env.game))).toEqual(before);
    expect(commands(env.tracker.view(env.game)).map(Boolean)).toEqual(mask);
    for(const deck of Object.values(env.game.decks))deck.deck.reverse();
    const action=env.runtime(),proposal=driver.next(env.events,'p0');
    expect(proposal?.actorUid).toBe(activePlayer(env.game));
    expect(proposal?.command).toEqual(commands(view)[action]);
    state=env.step(action);
   }
   seats.push(state.info!.seat);positions.push(state.info!.turnPosition);
   expect(state.reward).toBe(2*state.info!.share-1);
   expect(state.info!.replayVerified).toBe(true);
  }
  expect(new Set(seats).size).toBe(4);expect(new Set(positions).size).toBe(4);
  actors.melia.sha256='wrong';writeFileSync(manifest,JSON.stringify({actors}));
  expect(()=>new FourEnvironment('doreios',manifest)).toThrow('Frozen actor drift');
 }finally{rmSync(dir,{recursive:true,force:true});}
},30000);

test('round rewards change only terminal feedback, not decisions or game state',()=>{
 const dir=mkdtempSync(join(tmpdir(),'four-reward-'));
 try{
  const actors=Object.fromEntries(['melia','nereon','thaleia','doreios'].map(leader=>{
   const path=resolve(`src/lib/bots/models/${leader}.json`);return [leader,{path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}];
  }));
  const envs=[1,.99,.98].map(discount=>{
   const path=join(dir,String(discount)+'.json');writeFileSync(path,JSON.stringify({actors,reward:{kind:'round-discounted-win',discount}}));return new FourEnvironment('doreios',path);
  });
  let states=envs.map(e=>e.reset('round-reward-test:0',true));
  while(!states[0].done){
   for(const s of states){expect(s.done).toBe(false);expect(s.potential).toBe(0);expect(s.observation).toEqual(states[0].observation);expect(s.mask).toEqual(states[0].mask);}
   const action=envs[0].runtime();states=envs.map(e=>e.step(action));
  }
  for(let i=0;i<3;i++){
   const s=states[i];expect(s.info).toEqual(states[0].info);expect(s.reward).toBeCloseTo(s.info!.share*[1,.99,.98][i]**(s.info!.turns-1),12);
   expect(envs[i].events).toEqual(envs[0].events);expect(envs[i].game).toEqual(envs[0].game);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
},30000);

test('opening curriculum advances only through legal replayable turns and is seed deterministic',()=>{
 const dir=mkdtempSync(join(tmpdir(),'four-curriculum-'));
 try{
  const actors=Object.fromEntries(['melia','nereon','thaleia','doreios'].map(leader=>{
   const path=resolve(`src/lib/bots/models/${leader}.json`);return [leader,{path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}];
  }));
  const path=(name:string,probability?:number)=>{const p=join(dir,name+'.json');writeFileSync(p,JSON.stringify({actors,...(probability===undefined?{}:{openingCurriculum:{probability}})}));return p;};
  const normal=new FourEnvironment('doreios',path('normal')),disabled=new FourEnvironment('doreios',path('off',0));
  normal.reset('curriculum-unit:0',true);disabled.reset('curriculum-unit:0',true);expect(disabled.events).toEqual(normal.events);expect(disabled.game).toEqual(normal.game);
  const manifest=path('on',1),a=new FourEnvironment('doreios',manifest),b=new FourEnvironment('doreios',manifest);
  let state=a.reset('curriculum-unit:0',true);b.reset('curriculum-unit:0',true);
  expect(a.game.turn.turns[a.uid]).toBe(2);expect(activePlayer(a.game)).toBe(a.uid);expect(a.events).toEqual(b.events);expect(a.verify()).toBe(true);
  while(!state.done)state=a.step(a.runtime());
  expect(state.info!.curriculumApplied).toBe(true);expect(state.info!.replayVerified).toBe(true);
  expect(()=>new FourEnvironment('doreios',path('invalid',2))).toThrow();
 }finally{rmSync(dir,{recursive:true,force:true});}
},30000);

test('Temple teacher previews are repeatable and execute legal replayable decisions',()=>{
 const dir=mkdtempSync(join(tmpdir(),'temple-teacher-'));
 try{
  const actors=Object.fromEntries(['melia','nereon','thaleia','doreios'].map(leader=>{const path=resolve(`src/lib/bots/models/${leader}.json`);return [leader,{path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}];}));
  const manifest=join(dir,'actors.json');writeFileSync(manifest,JSON.stringify({actors,teacher:'temple-order'}));
  for(let i=0;i<4;i++){
   const env=new FourEnvironment('doreios',manifest);let state=env.reset(`temple-teacher-test:${i}`,true);
   while(!state.done){const before=JSON.stringify(env.game),memory=JSON.stringify(env.tracker),index=env.teacher(true);expect(env.teacher()).toBe(index);expect(state.mask![index]).toBe(true);expect(JSON.stringify(env.game)).toBe(before);expect(JSON.stringify(env.tracker)).toBe(memory);state=env.step(index);}
   expect(state.info!.replayVerified).toBe(true);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
