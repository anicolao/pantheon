import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync,gunzipSync } from 'node:zlib';
import { availableParallelism } from 'node:os';
import { resolve } from 'node:path';
import type { MatrixGame } from './balance/matrix';
const out=resolve(process.argv[2]??'balance-runs/treasure-scoring-v6');
const blocks=Number(process.argv[3]??200),workers=availableParallelism();
if(!Number.isInteger(blocks)||blocks<1||blocks>200)throw new Error('Invalid blocks');
const git=(...args:string[])=>execFileSync('git',args,{encoding:'utf8'}).trim();
if(git('status','--porcelain'))throw new Error('Commit before run');
const sourceCommit=git('rev-parse','HEAD'),beforeDir='balance-results/all-leaders-v5';
const previous=JSON.parse(readFileSync(`${beforeDir}/manifest.json`,'utf8'));
const rows:MatrixGame[]=Array.from({length:previous.workers},(_,i)=>gunzipSync(readFileSync(`${beforeDir}/games-${i}.jsonl.gz`)).toString().trim().split('\n').map(s=>JSON.parse(s))).flat();
if(previous.status!=='completed'||rows.length!==60000)throw new Error('Incomplete baseline');
mkdirSync(out);mkdirSync(`${out}/replays`);
const write=(name:string,data:unknown)=>writeFileSync(`${out}/${name}`,JSON.stringify(data,null,2)+'\n');
const manifest={sourceCommit,dirty:false,baselineCommit:previous.sourceCommit,baselineDirectory:beforeDir,policyVersion:6,variant:'standard',profiles:'Frozen v5 profiles; no retraining',blocks,workers,evaluationSeeds:previous.evaluationSeeds.slice(0,blocks),plannedGames:108*blocks,primary:'Four leader-specific Treasure vs Engine changes; paired seed-block bootstrap with four-way correction',change:'Only top-value points exempted from the post-gain $8 EV gate',status:'running',startedAt:new Date().toISOString()};
write('manifest.json',manifest);write('profiles.json',JSON.parse(readFileSync(`${beforeDir}/profiles.json`,'utf8')));
const tasks=Array.from({length:workers},()=>[] as MatrixGame[]);
let index=0;
for(const row of rows)if(row.result.block<blocks&&((row.familyA==='treasure'||row.familyB==='treasure')||row.result.block===0))tasks[index++%workers].push(row);
const start=performance.now();
const children=tasks.map((rows,worker)=>{
 const input=`${out}/input-${worker}.json.gz`,path=`${out}/task-${worker}.json`;
 writeFileSync(input,gzipSync(JSON.stringify(rows)));writeFileSync(path,JSON.stringify({input,out,worker}));
 return Bun.spawn([process.execPath,resolve('scripts/balance-scoring-worker.ts'),path],{stdout:'inherit',stderr:'inherit'});
});
try{
 await Promise.all(children.map(async child=>{if(await child.exited!==0){for(const other of children)other.kill();throw new Error('Worker failed');}}));
 const checks=tasks.map((_,i)=>JSON.parse(readFileSync(`${out}/checks-${i}.json`,'utf8')));
 if(checks.reduce((s,r)=>s+r.games,0)!==108*blocks||checks.reduce((s,r)=>s+r.checks,0)!==192||checks.reduce((s,r)=>s+r.replays,0)!==108)throw new Error('Budget/check failure');
 if(git('rev-parse','HEAD')!==sourceCommit||git('status','--porcelain'))throw new Error('Source changed');
 write('manifest.json',{...manifest,status:'completed',games:108*blocks,failures:0,unchangedChecks:192,replays:108,elapsedSeconds:(performance.now()-start)/1000});
 console.log(`Completed ${108*blocks} paired games on ${workers} CPUs`);
}catch(error){write('manifest.json',{...manifest,status:'failed',error:String(error)});throw error;}
