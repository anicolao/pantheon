import {run} from '../standard-matrix/runner';
import {appendFileSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const job=JSON.parse(readFileSync(process.argv[2],'utf8'));
const start=performance.now();
for(const seed of job.seeds){
 const {result,trace}=run(seed,[{name:'engine',openingBook:job.book},{name:'money'}],['thaleia',job.opponent]);
 if(result.status!=='finished')throw Error('Unfinished game');
 const row={...result,players:result.players.map(({telemetry,...p})=>p),replaySHA256:createHash('sha256').update(JSON.stringify(trace)).digest('hex'),candidate:job.candidate,split:job.split};
 appendFileSync(job.output,JSON.stringify(row)+'\n');
 if(job.candidate==='selected-book'&&seed===240000)writeFileSync(job.output+'.replay.json',JSON.stringify(trace));
}
console.log(JSON.stringify({candidate:job.candidate,opponent:job.opponent,n:job.seeds.length,seconds:(performance.now()-start)/1000}));
