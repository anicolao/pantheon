import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {ExpansionEnvironment} from '../../scripts/rl/expansion/environment';
import {commands,observation,slots,cards} from '../../scripts/rl/expansion/schema';
import {createPrng} from '../../src/lib/game/random';
const indices=slots.flatMap((s,i)=>s.kind==='buy'||s.kind==='worship'||(s.kind==='play'&&cards.find(c=>c.id===s.ids[0])?.type==='Action')?[i]:[]);
if(!isMainThread){
 const env=new ExpansionEnvironment('achilles',workerData.field);
 parentPort!.on('message',({bias,generation,candidate,index})=>{
  let s=env.reset(`weakest-bias-search:g${generation}:${index}`);
  while(!s.done){
   const options=commands(env.game),values=env.actors.achilles.logits(observation(env.game));
   indices.forEach((slot,i)=>values[slot]+=bias[i]);let best=-1;
   for(let i=0;i<values.length;i++)if(options[i]&&(best<0||values[i]>values[best]))best=i;
   s=env.step(best);
  }
  parentPort!.postMessage({generation,candidate,index,info:s.info,replay:gzipSync(JSON.stringify({info:s.info,events:env.events}))});
 });
}else{
 const root='balance-diagnostics/weakest-eight-house-20261128',out=root+'/bias-search';mkdirSync(out);
 const state=JSON.parse(readFileSync(root+'/status.json','utf8')),field=out+'/field.json';writeFileSync(field,JSON.stringify(state.field,null,2));
 writeFileSync(out+'/protocol.json',JSON.stringify({indices,slots:indices.map(i=>slots[i]),generations:12,population:24,games:112,seed:'achilles-bias-cem-v1',fitness:'win share + .05 clipped score margin; evaluation unchanged'},null,2));
 const rng=createPrng('achilles-bias-cem-v1'),normal=()=>Math.sqrt(-2*Math.log(Math.max(1e-9,rng())))*Math.cos(2*Math.PI*rng());
 let mean=indices.map(()=>0),sd=indices.map(()=>1.5),best=mean.slice();
 const workers=Array.from({length:8},()=>new Worker(import.meta.filename,{workerData:{field}}));
 try{
 for(let generation=0;generation<12;generation++){
  const candidates=[indices.map(()=>0),best.slice(),mean.slice(),...Array.from({length:21},()=>mean.map((m,i)=>Math.max(-8,Math.min(8,m+sd[i]*normal()))))];
  const rows=candidates.map(()=>[] as any[]);let next=0;const games=112,total=games*candidates.length;
  const dir=out+'/g'+generation;mkdirSync(dir);writeFileSync(dir+'/candidates.json',JSON.stringify(candidates));
  await Promise.all(workers.map(w=>new Promise<void>((resolve,reject)=>{
   const send=()=>{if(next===total){w.off('message',receive);w.off('error',reject);resolve();return;}const job=next++,candidate=Math.floor(job/games);w.postMessage({bias:candidates[candidate],generation,candidate,index:job%games});};
   const receive=({candidate,index,info,replay}:any)=>{rows[candidate].push(info);const sub=dir+'/'+candidate;mkdirSync(sub,{recursive:true});writeFileSync(sub+'/'+index+'.json.gz',replay);send();};
   w.on('error',reject);w.on('message',receive);send();
  })));
  const scores=rows.map((rs,candidate)=>({candidate,share:rs.reduce((s,r)=>s+r.share,0)/games,fitness:rs.reduce((s,r)=>s+r.share+.05*Math.max(-1,Math.min(1,(r.score-Math.max(...r.field.filter((p:any)=>p.leader!=='achilles').map((p:any)=>p.score)))/30)),0)/games})).sort((a,b)=>b.fitness-a.fitness);
  const elite=scores.slice(0,5).map(s=>candidates[s.candidate]);best=candidates[scores[0].candidate];
  mean=mean.map((m,i)=>.5*m+.5*elite.reduce((s,e)=>s+e[i],0)/elite.length);
  sd=sd.map((s,i)=>Math.max(.3,.5*s+.5*Math.sqrt(elite.reduce((n,e)=>n+(e[i]-mean[i])**2,0)/elite.length)));
  writeFileSync(dir+'/results.json',JSON.stringify({scores,mean,sd,best},null,2));writeFileSync(out+'/latest.json',JSON.stringify({generation,indices,best,mean,sd},null,2));
  console.log(JSON.stringify({generation,best:scores[0],baseline:scores.find(s=>s.candidate===0)}));
 }
 }finally{await Promise.all(workers.map(w=>w.terminate()));}
}
