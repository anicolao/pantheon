/** Whole-game cross-play, paired by seed and seating; replay artifacts retained. */
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {EchoEnvironment} from './environment';
import {commands,observation} from './schema';
if(!isMainThread){
 const {manifest,prefix}=workerData;
 const env=new EchoEnvironment('echo',manifest);
 parentPort!.on('message',(index:number)=>{
  try{
   let state=env.reset(`${prefix}:${index}`);
   while(!state.done){const options=commands(env.game);state=env.step(env.actors.echo.action(observation(env.game),options.map(Boolean)));}
   parentPort!.postMessage({index,info:state.info,events:env.events});
  }catch(error){throw error;}
 });
}else{
 const [run,gamesText='400',workersText='16']=process.argv.slice(2),games=Number(gamesText),workers=Number(workersText);
 if(!run||games%16||!Number.isSafeInteger(games)||games<16)throw Error('Usage: tournament.ts RUN [games divisible by 16] [workers]');
 if(!Number.isSafeInteger(workers)||workers<1)throw Error('Invalid worker count');
 const out=resolve(run,'crossplay');mkdirSync(out);
 const protocol={games,workers,prefix:'echo-crossplay-v1',fields:['frozen-round-1.json','selected-field.json'].map(name=>({name,sha256:createHash('sha256').update(readFileSync(resolve(run,name))).digest('hex')}))};
 writeFileSync(resolve(out,'protocol.json'),JSON.stringify(protocol,null,2));
 for(const field of protocol.fields){
  const folder=resolve(out,field.name.replace('.json',''));mkdirSync(folder);let next=0,finished=0;const rows:unknown[]=[];
  await Promise.all(Array.from({length:Math.min(workers,games)},()=>new Promise<void>((done,reject)=>{
   const worker=new Worker(import.meta.filename,{workerData:{manifest:resolve(run,field.name),prefix:protocol.prefix}});
   const dispatch=()=>{if(next<games)worker.postMessage(next++);else{void worker.terminate();done();}};
   worker.on('error',reject);worker.on('message',({index,info,events})=>{
    rows[index]=info;writeFileSync(resolve(folder,`${index}.json.gz`),gzipSync(JSON.stringify({info,events})));
    if(++finished%40===0)console.log(JSON.stringify({field:field.name,completed:finished,games}));dispatch();
   });dispatch();
  })));
  writeFileSync(resolve(folder,'results.json'),JSON.stringify(rows));
 }
}
