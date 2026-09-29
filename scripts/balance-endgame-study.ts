import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {availableParallelism} from 'node:os';
import {resolve} from 'node:path';
import {baseProfiles} from './balance/base-profiles';
import {endGamePolicies,type EndGamePolicy} from './balance/end-game';
import {strategyVersion,type Profile} from './balance/strategy';
const out=resolve(process.argv[2]),blocks=Number(process.argv[3]),stage=process.argv[4];
const selected=(process.argv[5]??endGamePolicies.join(',')).split(',') as EndGamePolicy[];
if(!out||!Number.isInteger(blocks)||blocks<10||!stage||selected.some(p=>!endGamePolicies.includes(p)))throw Error('Usage: out blocks unique-stage [policies]');
const profiles:Record<string,Profile>={};
for(const [key,p]of Object.entries(baseProfiles)){
 profiles[key+'@historical']={...p,endGame:false};
 profiles[key+'@overlay']={...p,endGame:true};
 for(const policy of selected)profiles[key+'@'+policy]={...p,endGamePolicy:policy};
}
const controls=Object.keys(profiles).filter(k=>/@(historical|overlay)$/.test(k));
const candidates=Object.keys(profiles).filter(k=>!controls.includes(k));
const cellSet=new Set<string>();
const add=(a:string,b:string)=>cellSet.add(a+'|'+b);
for(const a of controls)for(const b of controls)add(a,b);
for(const a of candidates)for(const b of controls){add(a,b);add(b,a);}
// Candidate mirrors and cross-parent/thinning opposition are essential validation.
for(const policy of selected){const ks=candidates.filter(k=>k.endsWith('@'+policy));for(const a of ks)for(const b of ks)add(a,b);}
const focus=process.argv[6]?JSON.parse(readFileSync(process.argv[6],'utf8')):undefined;
if(focus){
 cellSet.clear();
 for(const c of focus.comparisons){
  if(!profiles[c.candidate]||!profiles[c.baseline]||!profiles[c.opponent]||![0,1].includes(c.seat))throw Error('Invalid focused comparison');
  for(const arm of [c.candidate,c.baseline])c.seat?add(c.opponent,arm):add(arm,c.opponent);
 }
}
const cells=[...cellSet].map(s=>s.split('|')),workers=availableParallelism(),batchSize=Math.max(1,Math.min(4,Math.floor(blocks/workers))),shards=Math.ceil(blocks/batchSize),seed='shared-endgame-v1:'+stage;
const git=(...args:string[])=>execFileSync('git',args,{encoding:'utf8'}).trim();
if(git('status','--porcelain'))throw Error('Commit source first');
const sourceCommit=git('rev-parse','HEAD');
mkdirSync(out);mkdirSync(out+'/replays');
const write=(n:string,v:unknown)=>writeFileSync(out+'/'+n,JSON.stringify(v,null,2)+'\n');
const manifest={...(focus?{focusedComparisons:focus.comparisons,selectionSource:focus.selectionSource}:{}),sourceCommit,policyVersion:strategyVersion,status:'running',blocks,workers,shards,batchSize,seed,stage,selected,profiles,cells,variant:'base-game',plannedGames:blocks*cells.length,replayBlocks:1,startedAt:new Date().toISOString(),rules:'No powers or Worship; identical 6 Obol, 3 Hamlet, inert Temple starts. Fixed default parameters. No pooling of parents, Thin settings, opponents or seats.',selection:'Screen candidate changes separately against both historical and old two-turn controls; confirm chosen policy on fresh seeds. Require no material regression across every parent/Thin/seat/fixed-opponent cell, not merely a positive average.'};write('manifest.json',manifest);
const start=performance.now();
const active=new Set<ReturnType<typeof Bun.spawn>>();let nextJob=0,failed=false;
try{
 await Promise.all(Array.from({length:Math.min(workers,shards)},async()=>{
  while(!failed){
   const worker=nextJob++;if(worker>=shards)return;
   const path=out+'/task-'+worker+'.json';
   writeFileSync(path,JSON.stringify({out,worker,profiles,cells,seed,replayBlocks:1,blocks:Array.from({length:Math.min(batchSize,blocks-worker*batchSize)},(_,i)=>worker*batchSize+i)}));
   const child=Bun.spawn([process.execPath,resolve('scripts/balance-base-worker.ts'),path],{stdout:'inherit',stderr:'inherit'});active.add(child);
   const code=await child.exited;active.delete(child);
   if(code!==0){failed=true;for(const c of active)c.kill();throw Error('Worker failed');}
  }
 }));
 const rows=Array.from({length:shards},(_,i)=>gunzipSync(readFileSync(out+'/games-'+i+'.jsonl.gz')).toString().trim().split('\n').filter(Boolean).map(s=>JSON.parse(s))).flat();
 if(rows.length!==manifest.plannedGames||new Set(rows.map(r=>r.first+'|'+r.second+'|'+r.result.block)).size!==rows.length)throw Error('Incomplete cells');
 if(git('rev-parse','HEAD')!==sourceCommit||git('status','--porcelain'))throw Error('Source drift');
 write('manifest.json',{...manifest,status:'completed',games:rows.length,failures:0,replays:cells.length,elapsedSeconds:(performance.now()-start)/1000});
 console.log('Completed '+rows.length+' games');
}catch(e){write('manifest.json',{...manifest,status:'failed',error:String(e)});throw e;}
