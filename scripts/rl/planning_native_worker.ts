import {readFileSync} from 'node:fs';
import {PlanningEnvironment} from './planning_environment';
const c=JSON.parse(readFileSync(process.argv[2],'utf8')),job=JSON.parse(process.argv[3]);
const env=new PlanningEnvironment(c.leader,c.manifest),rows=[];
for(let j=0;j<job.games;j++){
 const index=job.rank+j*job.workers;let state=env.reset(`${job.prefix}:${job.namespace}:${index}`,true);
 while(!state.done)state=env.step(env.runtime());
 rows.push({...state.info,outcome:state.reward,reward:state.reward});
}
process.stdout.write(JSON.stringify(rows)+'\n');
