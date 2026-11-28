/** Fixed-policy, paired-seed rule comparison. Run once before and once after the rule edit. */
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ExpansionEnvironment} from './environment';
import {commands,observation} from './schema';
if(!isMainThread){
 const env=new ExpansionEnvironment('achilles',workerData.field);
 parentPort!.on('message',(index:number)=>{
  let s=env.reset('independent-deploy-20261128-v1:'+index);
  while(!s.done){const choices=commands(env.game);s=env.step(env.actors.achilles.action(observation(env.game),choices.map(Boolean)));}
  parentPort!.postMessage({index,info:s.info,replay:gzipSync(JSON.stringify({info:s.info,events:env.events}))});
 });
}else{
 const [field,out]=process.argv.slice(2);if(!field||!out)throw Error('Usage: deploy_comparison.ts FIELD OUTPUT');mkdirSync(out);
 const hashes=Object.fromEntries(['src/lib/game/actions.ts','src/lib/bots/expansion-schema.ts',field].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
 writeFileSync(out+'/protocol.json',JSON.stringify({games:7000,workers:16,prefix:'independent-deploy-20261128-v1',hashes,field:JSON.parse(readFileSync(field,'utf8'))},null,2));
 let next=0,done=0;const rows:any[]=[];
 await Promise.all(Array.from({length:16},()=>new Promise<void>((resolve,reject)=>{
  const w=new Worker(import.meta.filename,{workerData:{field}});
  const send=()=>{if(next===7000){void w.terminate();resolve();return;}w.postMessage(next++);};
  w.on('error',reject);w.on('message',({index,info,replay})=>{rows[index]=info;writeFileSync(out+'/'+index+'.json.gz',replay);if(++done%1000===0)console.log(JSON.stringify({done,total:7000}));send();});send();
 })));
 writeFileSync(out+'/results.json',JSON.stringify(rows));console.log(JSON.stringify({games:rows.length,share:rows.reduce((s,r)=>s+r.share,0)/rows.length}));
}
