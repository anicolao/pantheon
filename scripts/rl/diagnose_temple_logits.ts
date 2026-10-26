import {writeFileSync} from 'node:fs';
import {FourEnvironment} from './four_environment';
import {commands,slots} from '../../src/lib/bots/rl-schema';
import {actorObservation} from './research_actor';
import {templeOrderOverride} from './temple_order_policy';
const [manifest,out]=process.argv.slice(2),env=new FourEnvironment('doreios',manifest),templeIndex=slots.findIndex(s=>s.kind==='play'&&s.ids[0]==='temple-of-ares');const margins:number[]=[];let disagreement=0;
for(let i=0;i<64;i++){
 let state=env.reset(`temple-logit-diagnostic:${i}`,true);
 while(!state.done){const v=env.tracker.view(env.game),actor=env.actors.doreios,choices=commands(v),logits=actor.logits(actorObservation(actor,env.game,env.tracker,v)),index=env.runtime(),base=choices[index]!,teacher=templeOrderOverride(v,base,{mode:'always'});
  if(choices[templeIndex]){margins.push(logits[index]-logits[templeIndex]);if(teacher!==base)disagreement++;}
  state=env.step(index);
 }
}
margins.sort((a,b)=>a-b);const result={games:64,templeIndex,legalStates:margins.length,teacherOverrides:disagreement,min:margins[0],median:margins[Math.floor(margins.length/2)],p90:margins[Math.floor(margins.length*.9)],max:margins.at(-1),coveredByOffsets:Object.fromEntries([.5,1,2,4,8,16,32,64].map(x=>[x,margins.filter(m=>m>0&&m<x).length]))};writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
