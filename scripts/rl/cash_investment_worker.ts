import {readFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {FourEnvironment} from './four_environment';
import {commands,actionIndex} from '../../src/lib/bots/rl-schema';
import {cashInvestmentOverride} from './cash_investment_policy';
const c=JSON.parse(readFileSync(process.argv[2],'utf8')),env=new FourEnvironment('doreios',c.opponentManifest);
for await(const line of createInterface({input:process.stdin})){
 const job=JSON.parse(line),rows=[];let overrides=0;
 for(let i=0;i<job.games;i++){
  let state=env.reset(`${job.prefix}:${(job.start??0)+i}`,true);
  while(!state.done){
   const v=env.tracker.view(env.game),base=commands(v)[env.runtime()]!,chosen=job.rule?cashInvestmentOverride(v,base,job.rule):base;
   if(chosen!==base)overrides++;state=env.step(actionIndex(v,chosen));
  }
  rows.push(state.info);
 }
 process.stdout.write(JSON.stringify({rows,overrides,searched:0})+'\n');
}
