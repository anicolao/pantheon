import {run} from './runner';
import {appendFileSync,writeFileSync,mkdirSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline';
const statusDirectory=import.meta.dir+'/.run';mkdirSync(statusDirectory,{recursive:true});
const identity=statusDirectory+'/'+process.pid+'.json';
writeFileSync(identity,JSON.stringify({worker:process.pid,parent:process.ppid,started:new Date().toISOString()}));
process.on('exit',()=>{try{unlinkSync(identity);}catch{}});
for await(const line of createInterface({input:process.stdin})){
 let j:any;
 try{
  j=JSON.parse(line);const start=performance.now();
  for(const seed of j.seeds){
   const books=j.books??j.lineup.map((_:string,i:number)=>i===j.seat?j.book:undefined);
   const {result,trace}=run(seed,j.lineup,j.kinds,books);
   appendFileSync(j.output,JSON.stringify({...result,...(j.seat===undefined?{}:{job:j.id}),traceHash:createHash('sha256').update(JSON.stringify(trace)).digest('hex')})+'\n');
   if(j.firstSeed===seed||j.saveReplay&&seed===j.seeds[0])writeFileSync(j.output+'.replay.json',JSON.stringify(trace));
  }
  console.log(JSON.stringify({id:j.id,n:j.seeds.length,seconds:(performance.now()-start)/1000}));
 }catch(e){console.log(JSON.stringify({id:j?.id,error:e instanceof Error?e.stack:String(e)}));}
}
