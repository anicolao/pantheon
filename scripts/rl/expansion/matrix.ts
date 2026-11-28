/** Complete paired heads-up matrix; resumable immutable, replay-verified game records. */
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {mkdirSync,writeFileSync,readFileSync,existsSync,renameSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {ExpansionEnvironment,type Manifest} from './environment';
import {commands,observation,leaders} from './schema';
const hash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
if(!isMainThread){
 let pair='',env:ExpansionEnvironment;
 parentPort!.on('message',({a,b,index}:{a:string;b:string;index:number})=>{
  if(pair!==a+'--'+b){pair=a+'--'+b;env=new ExpansionEnvironment(a,workerData.manifest,b);}
  let state=env.reset(`${workerData.prefix}:${pair}:${index}`);
  while(!state.done){const options=commands(env.game);state=env.step(env.actors[a].action(observation(env.game),options.map(Boolean)));}
  parentPort!.postMessage({pair,index,info:state.info,replay:gzipSync(JSON.stringify({info:state.info,events:env.events}))});
 });
}else{
 const [manifestArg,outArg,gamesArg='1000',workersArg='16',prefix='eight-house-final-v1']=process.argv.slice(2);
 if(!manifestArg||!outArg)throw Error('Usage: matrix.ts FIELD OUTPUT [games per pair] [workers] [seed prefix]');
 const manifest=resolve(manifestArg),out=resolve(outArg),games=Number(gamesArg),workers=Number(workersArg),field=JSON.parse(readFileSync(manifest,'utf8')) as Manifest;
 if(!Number.isSafeInteger(games)||games<4||games%2||!Number.isSafeInteger(workers)||workers<1)throw Error('Even game count and positive workers required');
 if(field.stageLeaders.length!==8||leaders.some(l=>!field.actors[l]))throw Error('Eight trained actors required');
 const pairs=leaders.flatMap((a,i)=>leaders.slice(i+1).map(b=>({a,b,pair:a+'--'+b}))),rows:Record<string,any[]>={};
 const protocol={manifest,manifestSHA256:hash(manifest),gamesPerPair:games,workers,prefix,pairs,sourceHashes:Object.fromEntries(['scripts/rl/expansion/matrix.ts','scripts/rl/expansion/environment.ts','scripts/rl/expansion/schema.ts','src/lib/game/actions.ts','src/lib/game/setup.ts'].map(p=>[p,hash(p)]))};
 mkdirSync(out,{recursive:true});const protocolPath=resolve(out,'protocol.json');
 if(existsSync(protocolPath)){if(JSON.stringify(JSON.parse(readFileSync(protocolPath,'utf8')))!==JSON.stringify(protocol))throw Error('Cannot resume different matrix protocol');}
 else writeFileSync(protocolPath,JSON.stringify(protocol,null,2));
 const jobs:{a:string;b:string;index:number}[]=[];
 for(const {a,b,pair} of pairs){mkdirSync(resolve(out,pair),{recursive:true});rows[pair]=Array(games);
  for(let index=0;index<games;index++){const path=resolve(out,pair,index+'.json.gz');
   if(existsSync(path)){const saved=JSON.parse(gunzipSync(readFileSync(path)).toString());if(!saved.info.replayVerified||saved.info.seed!==`${prefix}:${pair}:${index}`)throw Error('Invalid saved game');rows[pair][index]=saved.info;}
   else jobs.push({a,b,index});
  }
 }
 let next=0,completed=games*pairs.length-jobs.length;
 await Promise.all(Array.from({length:Math.min(workers,jobs.length)},()=>new Promise<void>((done,reject)=>{
  const worker=new Worker(import.meta.filename,{workerData:{manifest,prefix}});
  const dispatch=()=>{if(next<jobs.length)worker.postMessage(jobs[next++]);else{void worker.terminate();done();}};
  worker.on('error',reject);worker.on('message',({pair,index,info,replay})=>{
   const path=resolve(out,pair,index+'.json.gz'),temporary=path+'.tmp';writeFileSync(temporary,replay);renameSync(temporary,path);rows[pair][index]=info;
   if(++completed%100===0){const progress={completed,total:games*pairs.length};writeFileSync(resolve(out,'progress.json'),JSON.stringify(progress));console.log(JSON.stringify(progress));}dispatch();
  });dispatch();
 })));
 for(const {pair} of pairs){if(rows[pair].length!==games||rows[pair].some(r=>!r?.replayVerified))throw Error('Incomplete matrix');writeFileSync(resolve(out,pair,'results.json'),JSON.stringify(rows[pair]));}
 writeFileSync(resolve(out,'complete.json'),JSON.stringify({games:games*pairs.length,pairs:pairs.length}));
}
