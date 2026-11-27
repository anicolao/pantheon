/** Independently reconstruct every stored matrix game; do not trust completion flags alone. */
import {Worker,isMainThread,parentPort} from 'node:worker_threads';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {replaySetup} from '../../../src/lib/game/setup';
import {standings} from '../../../src/lib/game/actions';
const sha=(data:Buffer|string)=>createHash('sha256').update(data).digest('hex');
if(!isMainThread){
 parentPort!.on('message',({path,a,b,index,prefix,reported}:{path:string;a:string;b:string;index:number;prefix:string;reported:unknown})=>{
  const bytes=readFileSync(path),{events,info}=JSON.parse(gunzipSync(bytes).toString());
  const fail=(reason:string)=>{throw Error(path+': '+reason);};
  if(JSON.stringify(info)!==JSON.stringify(reported))fail('Results table differs from replay record');
  if(info.seed!==`${prefix}:${a}--${b}:${index}`||info.leader!==a||info.opponentLeader!==b||info.first!==(index%2===0)||info.block!==Math.floor(index/2))fail('Wrong game identity');
  const g=replaySetup(events);
  if(g.turn.phase!=='finished'||g.seed!==info.gameSeed||!g.turn.equalTurns)fail('Not the declared completed equal-turn game');
  const uid=Object.keys(g.leaders).find(uid=>g.leaders[uid]===a);
  if(!uid||Object.values(g.leaders).length!==2||!Object.values(g.leaders).includes(b))fail('Wrong leaders');
  if((g.turnOrder.indexOf(uid!)===0)!==info.first)fail('Wrong starting seat');
  const rows=standings(g),me=rows.find(r=>r.uid===uid)!;
  const share=me.winner?1/rows.filter(r=>r.winner).length:0;
  if(share!==info.share||me.score!==info.score||me.turns!==info.turns)fail('Reported outcome differs from replay');
  const field=rows.map(r=>({leader:g.leaders[r.uid],score:r.score,winner:r.winner}));
  if(JSON.stringify(field)!==JSON.stringify(info.field))fail('Reported standings differ from replay');
  parentPort!.postMessage({path,sha256:sha(bytes)});
 });
}else{
 const root=resolve(process.argv[2]??''),workers=Number(process.argv[3]??16);
 if(!process.argv[2]||!Number.isSafeInteger(workers)||workers<1)throw Error('Usage: audit_matrix.ts MATRIX [workers]');
 const protocol=JSON.parse(readFileSync(resolve(root,'protocol.json'),'utf8')),complete=JSON.parse(readFileSync(resolve(root,'complete.json'),'utf8'));
 if(protocol.pairs.length!==28||complete.pairs!==28||complete.games!==28*protocol.gamesPerPair)throw Error('Incomplete matrix');
 const jobs=protocol.pairs.flatMap(({a,b,pair}:any)=>{
  const rows=JSON.parse(readFileSync(resolve(root,pair,'results.json'),'utf8'));
  if(rows.length!==protocol.gamesPerPair)throw Error('Incomplete results table');
  return Array.from({length:protocol.gamesPerPair},(_,index)=>({a,b,index,prefix:protocol.prefix,path:resolve(root,pair,index+'.json.gz'),reported:rows[index]}));
 });
 let next=0;const records:{path:string;sha256:string}[]=[];
 await Promise.all(Array.from({length:Math.min(workers,jobs.length)},()=>new Promise<void>((done,reject)=>{
  const worker=new Worker(import.meta.filename),dispatch=()=>{if(next<jobs.length)worker.postMessage(jobs[next++]);else{void worker.terminate();done();}};
  worker.on('error',reject);worker.on('message',record=>{records.push(record);dispatch();});dispatch();
 })));
 records.sort((a,b)=>a.path.localeCompare(b.path));
 const audit={games:records.length,allReconstructed:true,checks:['results table equals replay record','seed identity','leaders','starting seat','finished phase','equal turns','score','turns','win share','complete standings'],replayHashesSHA256:sha(JSON.stringify(records)),auditSourceSHA256:sha(readFileSync(import.meta.filename)),protocolSHA256:sha(readFileSync(resolve(root,'protocol.json')))};
 writeFileSync(resolve(root,'replay-audit.json'),JSON.stringify(audit,null,2));console.log(JSON.stringify(audit,null,2));
}
