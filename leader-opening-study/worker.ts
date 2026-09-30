import {run} from './runner';
import {readFileSync,appendFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const job=JSON.parse(readFileSync(process.argv[2],'utf8')),start=performance.now();
for(const seed of job.seeds){
 const books=job.lineup.map((_:string,i:number)=>i===job.seat?job.book:undefined);
 const {result,trace}=run(seed,job.lineup,job.kinds,books);
 appendFileSync(job.output,JSON.stringify({...result,job:job.id,traceHash:createHash('sha256').update(JSON.stringify(trace)).digest('hex')})+'\n');
 if(job.saveReplay&&seed===job.seeds[0])writeFileSync(job.output+'.replay.json',JSON.stringify(trace));
}
console.log(JSON.stringify({id:job.id,n:job.seeds.length,seconds:(performance.now()-start)/1000}));
