import {readFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {FourEnvironment} from './four_environment';
import {actorObservation} from './research_actor';
import {commands} from '../../src/lib/bots/rl-schema';
import {preferenceAction} from './preference_policy';
const config=JSON.parse(readFileSync(process.argv[2],'utf8')),env=new FourEnvironment('doreios',config.opponentManifest);
for await(const line of createInterface({input:process.stdin})){
 const job=JSON.parse(line),rows=[];let overrides=0;
 for(let i=0;i<job.games;i++){
  let state=env.reset(`${job.prefix}:${(job.start??0)+i}`,true);
  while(!state.done){
   const view=env.tracker.view(env.game),actor=env.actors.doreios,logits=actor.logits(actorObservation(actor,env.game,env.tracker,view)),choices=commands(view);
   let base=-1;for(let j=0;j<choices.length;j++)if(choices[j]&&(base<0||logits[j]>logits[base]))base=j;
   if(base<0)throw Error('No legal base action');
   const index=job.rule?preferenceAction(view,logits,job.rule.parameters):base;
   if(index!==base)overrides++;state=env.step(index);
  }
  rows.push(state.info);
 }
 process.stdout.write(JSON.stringify({rows,overrides})+'\n');
}
