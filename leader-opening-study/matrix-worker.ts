import {run} from './runner';
import {readFileSync,appendFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const j=JSON.parse(readFileSync(process.argv[2],'utf8')),t=performance.now();
for(const seed of j.seeds){
 const {result,trace}=run(seed,j.lineup,j.kinds,j.books);
 appendFileSync(j.output,JSON.stringify({...result,traceHash:createHash('sha256').update(JSON.stringify(trace)).digest('hex')})+'\n');
 if(seed===j.firstSeed)writeFileSync(j.output+'.replay.json',JSON.stringify(trace));
}
console.log(JSON.stringify({id:j.id,n:j.seeds.length,seconds:(performance.now()-t)/1000}));
