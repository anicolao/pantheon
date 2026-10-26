/** Verify presentation-log omission only in hypothetical games, with exact state/decision parity. */
import {readFileSync,writeFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {FourEnvironment} from './four_environment';
import {sampleBelief,applyHypothetical} from './belief_rollout';
import {activePlayer} from '../../src/lib/game/actions';
import {commands} from '../../src/lib/bots/rl-schema';
import {actorObservation} from './research_actor';
const [manifest,out,count='64']=process.argv.slice(2),env=new FourEnvironment('doreios',manifest);
let decisions=0;const elapsed=[0,0];
for(let i=0;i<Number(count);i++){
 env.reset(`rollout-history-parity:${i}`,true);
 const a=sampleBelief(env.game,env.tracker,i),b=sampleBelief(env.game,env.tracker,i);
 let n=0;
 while(a.game.turn.phase!=='finished'){
  const choices=[a,b].map(s=>{const v=s.tracker.view(s.game),actor=env.actors[v.leader],legal=commands(v);return legal[actor.action(actorObservation(actor,s.game,s.tracker,v),legal.map(Boolean))]!;});
  if(!isDeepStrictEqual(choices[0],choices[1]))throw Error(`Decision mismatch ${i}/${n}`);
  if(++n>5000)throw Error('Unfinished sampled game');
  for(const [j,s] of [a,b].entries()){const start=performance.now();applyHypothetical(s.game,s.tracker,choices[j],100000+n,j===0);elapsed[j]+=performance.now()-start;}
  const {activity:aa,publicActivity:ap,...ag}=a.game,{activity:ba,publicActivity:bp,...bg}=b.game;
  if(!isDeepStrictEqual(ag,bg)||!isDeepStrictEqual(a.tracker,b.tracker))throw Error(`State mismatch ${i}/${n}`);
  if(ba.length||bp.length)throw Error('Hypothetical history unexpectedly retained');
  decisions++;
 }
}
const result={games:Number(count),decisions,exactCommands:true,exactStateExceptPresentationLogs:true,exactTracker:true,milliseconds:{withLogs:elapsed[0],withoutLogs:elapsed[1]},applySpeedup:elapsed[0]/elapsed[1]};
writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
