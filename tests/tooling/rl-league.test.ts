import {expect,test} from 'bun:test';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadLeague} from '../../scripts/rl/league';
import {RLEnvironment} from '../../scripts/rl/environment';
import {rlAction} from '../../src/lib/bots/rl';
import {PracticeSession} from '../../src/lib/bots/session';
const path='balance-results/league-rl-v1/manifests/round-1.json';
for(const leader of ['melia','nereon','thaleia','doreios'])test(`league ${leader}: frozen schedule, legal complete games, balanced seats and replay`,()=>{
 const league=loadLeague(path),groups:Record<string,number>={};
 for(let i=0;i<24;i++){
  const selected=league.select(leader,i);expect(selected.leader).not.toBe(leader);expect(league.select(leader,i-i%2).id).toBe(selected.id);groups[selected.group]=(groups[selected.group]??0)+1;
  const env=new RLEnvironment(leader,leader==='melia'?'mm':'classic-engine',`league:${path}`);let state=env.reset(`league-smoke:${leader}:${i}`,i%2===0);
  while(!state.done)state=env.step(rlAction(leader,state.observation!,state.mask!));
  if(!state.info||!('opponentId' in state.info))throw Error('Missing league result metadata');
  expect(state.info.opponentId).toBe(selected.id);expect(state.info.leagueSHA256).toBe(league.hash);expect(state.info.first).toBe(i%2===0);
  expect(PracticeSession.restore(env.session.save()).game).toEqual(env.session.game);
 }
 expect(groups).toEqual({current:12,historical:6,heuristic:6});
},120000);
test('league rejects actor drift and same-leader opponents',()=>{
 const dir=mkdtempSync(join(tmpdir(),'pantheon-league-'));try{
  const manifest=JSON.parse(readFileSync(path,'utf8')),entry=manifest.learners.melia[0];entry.actorSHA256='invalid';const bad=join(dir,'bad.json');writeFileSync(bad,JSON.stringify(manifest));expect(()=>loadLeague(bad)).toThrow('Actor drift');
  entry.leader='melia';writeFileSync(bad,JSON.stringify(manifest));expect(()=>loadLeague(bad)).toThrow('Invalid league opponent');
 }finally{rmSync(dir,{recursive:true});}
});
