import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir,availableParallelism} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {pairedEstimate,type Pair,type Estimate} from './evidence';
export type BootstrapJob={pairs:Pair[];tests:number;replicates?:number};
export async function parallelBootstrap(jobs:BootstrapJob[]):Promise<Estimate[]> {
 const directory=mkdtempSync(join(tmpdir(),'pantheon-bootstrap-'));
 const workers=Math.min(availableParallelism(),jobs.length),children:ReturnType<typeof Bun.spawn>[]=[];
 try{
  const paths=Array.from({length:workers},(_,worker)=>{
   const input=join(directory,worker+'.json'),output=join(directory,worker+'.out.json');
   writeFileSync(input,JSON.stringify(jobs.flatMap((job,index)=>index%workers===worker?[{index,job}]:[])));
   children.push(Bun.spawn([process.execPath,fileURLToPath(import.meta.url),input,output],{stdout:'ignore',stderr:'inherit'}));
   return output;
  });
  await Promise.all(children.map(async child=>{if(await child.exited!==0){children.forEach(c=>c.kill());throw Error('Bootstrap worker failed');}}));
  return paths.flatMap(path=>JSON.parse(readFileSync(path,'utf8'))).sort((a,b)=>a.index-b.index).map(r=>r.estimate);
 }finally{rmSync(directory,{recursive:true,force:true});}
}
if(import.meta.main){
 const jobs:{index:number;job:BootstrapJob}[]=JSON.parse(readFileSync(process.argv[2],'utf8'));
 writeFileSync(process.argv[3],JSON.stringify(jobs.map(({index,job})=>({index,estimate:pairedEstimate(job.pairs,job.tests,false,0.05,job.replicates)}))));
}
