import {readFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {FourEnvironment} from './four_environment';
import {commands,actionIndex} from '../../src/lib/bots/rl-schema';
import {rolloutDecision} from './belief_rollout';
import {createResearchActor,actorObservation} from './research_actor';
const readCritic=(path:string)=>{const data=JSON.parse(readFileSync(path,'utf8'));if(data.purpose!=='research-value'||data.reward.kind!=='score-margin'||data.reward.scale!==8||data.reward.winWeight!==0||data.layers.at(-1).output!==1)throw Error('Unsupported leaf critic');return createResearchActor(data);};
const config=JSON.parse(readFileSync(process.argv[2],'utf8')),env=new FourEnvironment('doreios',config.opponentManifest);
const critic=config.critic?readCritic(config.critic):null;
const leafValue=critic?(game:typeof env.game,tracker:typeof env.tracker)=>critic.logits(actorObservation(critic,game,tracker,tracker.view(game)))[0]:undefined;
for await(const line of createInterface({input:process.stdin})){
 const job=JSON.parse(line),rows=[];let overrides=0,searched=0;const start=performance.now();
 for(let i=0;i<job.games;i++){
  let state=env.reset(`${job.prefix}:${(job.start??0)+i}`,true);
  while(!state.done){
   const view=env.tracker.view(env.game),base=commands(view)[env.runtime()]!;
   const decision=job.rule?rolloutDecision(env.game,env.tracker,env.actors,job.rule,leafValue):{command:base,searched:false};
   const index=actionIndex(view,decision.command);if(index!==actionIndex(view,base))overrides++;if(decision.searched)searched++;
   state=env.step(index);
  }
  rows.push(state.info);process.stderr.write(JSON.stringify({game:i,seconds:(performance.now()-start)/1000,searched,overrides})+'\n');
 }
 process.stdout.write(JSON.stringify({rows,overrides,searched,seconds:(performance.now()-start)/1000})+'\n');
}
