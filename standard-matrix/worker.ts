import {run} from './runner';
import {appendFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const [a,b,s1,s2,start,count,path]=process.argv.slice(2);
const started=performance.now();
for(let i=0;i<Number(count);i++){
 const {result,trace}=run(Number(start)+i,[{name:s1 as 'engine'|'money'},{name:s2 as 'engine'|'money'}],[a,b]);
 if(result.status!=='finished')throw Error('Unfinished game');
 const compact={...result,players:result.players.map(({telemetry,...p})=>p),replaySHA256:createHash('sha256').update(JSON.stringify(trace)).digest('hex')};
 appendFileSync(path,JSON.stringify(compact)+'\n');
 if(i===0)writeFileSync(path+'.replay.json',JSON.stringify(trace));
}
console.log(JSON.stringify({a,b,s1,s2,count:Number(count),seconds:(performance.now()-started)/1000}));
