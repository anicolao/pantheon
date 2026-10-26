import {readFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {FourEnvironment} from './four_environment';
import {commands,actionIndex} from '../../src/lib/bots/rl-schema';
import {drawOverride} from './draw_policy';
const config=JSON.parse(readFileSync(process.argv[2],'utf8')),env=new FourEnvironment('doreios',config.opponentManifest);
for await(const line of createInterface({input:process.stdin})){
 const job=JSON.parse(line),rows=[];let overrides=0;
 for(let i=0;i<job.games;i++){
  let state=env.reset(`${job.prefix}:${i}`,true);
  while(!state.done){
   const view=env.tracker.view(env.game),base=commands(view)[env.runtime()]!,chosen=job.rule?drawOverride(view,base,job.rule):base;
   if(chosen!==base)overrides++;
   state=env.step(actionIndex(view,chosen));
  }
  rows.push(state.info);
 }
 process.stdout.write(JSON.stringify({rows,overrides})+'\n');
}
