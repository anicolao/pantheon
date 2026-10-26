import {writeFileSync} from 'node:fs';
import {FourEnvironment} from './four_environment';
import {commands} from '../../src/lib/bots/rl-schema';
import {actorObservation} from './research_actor';
const [manifest,out,count='128']=process.argv.slice(2);let decisions=0;const elapsed=[0,0];
for(let i=0;i<Number(count);i++){
 const env=new FourEnvironment(['melia','nereon','thaleia','doreios'][i%4],manifest);let state=env.reset(`masked-actor-parity:${i}`,true);
 while(!state.done){
  const view=env.tracker.view(env.game),actor=env.actors[view.leader],obs=actorObservation(actor,env.game,env.tracker,view),mask=commands(view).map(Boolean),indices=[];
  for(const [j,f] of [actor.action,actor.maskedAction].entries()){const start=performance.now();indices.push(f(obs,mask));elapsed[j]+=performance.now()-start;}
  if(indices[0]!==indices[1])throw Error(`Action mismatch ${i}/${decisions}`);decisions++;state=env.step(indices[1]);
 }
 if(!state.info.replayVerified)throw Error('Replay missing');
}
const result={games:Number(count),decisions,exactActions:true,allActualGamesReplayVerified:true,milliseconds:{full:elapsed[0],masked:elapsed[1]},inferenceSpeedup:elapsed[0]/elapsed[1]};writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
