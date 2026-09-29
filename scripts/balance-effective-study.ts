import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {availableParallelism} from 'node:os';
import {resolve} from 'node:path';
import {baseProfiles,v14BaseProfiles,v15BaseProfiles} from './balance/base-profiles';
import {strategyVersion,type Profile} from './balance/strategy';
import {rolloutTurns} from './balance/sampled';
const out=resolve(process.argv[2]),blocks=Number(process.argv[3]??256),stage=process.argv[4]??'evaluation';
if(!Number.isInteger(blocks)||blocks<1)throw Error('Usage: output blocks unique-stage');
const selected=(process.argv[5]??'income,balanced,reliable').split(',') as ('income'|'balanced'|'reliable'|'late'|'coverage'|'raw')[];
if(selected.some(p=>!['income','balanced','reliable','late','coverage','raw'].includes(p)))throw Error('Unknown metric policy');
const includeV15=process.argv.includes('--v15');
const profiles:Record<string,Profile>={},keys=Object.keys(baseProfiles);
for(const k of keys){
 profiles[k+'@old']=v14BaseProfiles[k];
 if(includeV15)profiles[k+'@v15']=v15BaseProfiles[k];
 for(const policy of selected)profiles[k+'@'+policy]={...baseProfiles[k],samplingPolicy:policy};
}
const set=new Set<string>(),add=(a:string,b:string)=>set.add(a+'|'+b);
for(const policy of selected){
 if(includeV15)for(const k of keys){add(k+'@'+policy,k+'@v15');add(k+'@v15',k+'@'+policy);}
 for(const a of keys)for(const b of keys)add(a+'@'+policy,b+'@'+policy);
 for(const k of keys){add(k+'@'+policy,k+'@old');add(k+'@old',k+'@'+policy);}
 for(const k of ['engine','engine-thin']){add(k+'@'+policy,'treasure@old');add('treasure@old',k+'@'+policy);}
}
for(const k of keys)add(k+'@old',k+'@old');
for(const k of ['engine','engine-thin']){add(k+'@old','treasure@old');add('treasure@old',k+'@old');}
const cells=[...set].map(s=>s.split('|')),workers=availableParallelism(),batchSize=Math.min(2,Math.max(1,Math.floor(blocks/workers))),shards=Math.ceil(blocks/batchSize),seed='effective-sampling-v1:'+stage;
const git=(...args:string[])=>execFileSync('git',args,{encoding:'utf8'}).trim();
if(git('status','--porcelain'))throw Error('Commit source first');
const sourceCommit=git('rev-parse','HEAD');
mkdirSync(out);mkdirSync(out+'/replays');
const write=(n:string,v:unknown)=>writeFileSync(out+'/'+n,JSON.stringify(v,null,2)+'\n');
const manifest={sourceCommit,selected,includeV15,policyVersion:strategyVersion,status:'running',blocks,workers,shards,batchSize,seed,stage,profiles,cells,variant:'base-game',plannedGames:blocks*cells.length,replayBlocks:1,rolloutSamples:'8 times deck size (stratified)',rolloutTurns,startedAt:new Date().toISOString(),rules:'No powers or Worship. Identical six Obol, three Hamlet, inert Temple starts. Shared turn-2 ending policy. No pooling of parent, Thin, opponent or seat.',metrics:'Shared stratified three-turn rollout with usable spending, scoring thresholds and funded unique-card coverage. Common cash-aware legal play and effect-based resource dominance.',primary:'Four new-v-old head-to-head comparisons in each seat, plus eight paired effects versus the fixed same-family old opponent, and the new four-by-four response matrix.'};
write('manifest.json',manifest);const start=performance.now();
const active=new Set<ReturnType<typeof Bun.spawn>>();let next=0,failed=false;
try{
 await Promise.all(Array.from({length:Math.min(workers,shards)},async()=>{
  while(!failed){
   const worker=next++;if(worker>=shards)return;
   const task=out+'/task-'+worker+'.json';
   writeFileSync(task,JSON.stringify({out,worker,profiles,cells,seed,replayBlocks:1,blocks:Array.from({length:Math.min(batchSize,blocks-worker*batchSize)},(_,i)=>worker*batchSize+i)}));
   const child=Bun.spawn([process.execPath,resolve('scripts/balance-base-worker.ts'),task],{stdout:'inherit',stderr:'inherit'});active.add(child);
   const code=await child.exited;active.delete(child);
   if(code!==0){failed=true;active.forEach(c=>c.kill());throw Error('Worker failed '+worker);}
  }
 }));
 const rows=Array.from({length:shards},(_,i)=>gunzipSync(readFileSync(out+'/games-'+i+'.jsonl.gz')).toString().trim().split('\n').filter(Boolean).map(s=>JSON.parse(s))).flat();
 if(rows.length!==blocks*cells.length||new Set(rows.map(r=>r.first+'|'+r.second+'|'+r.result.block)).size!==rows.length)throw Error('Incomplete/duplicate games');
 if(git('status','--porcelain')||git('rev-parse','HEAD')!==sourceCommit)throw Error('Source drift');
 write('manifest.json',{...manifest,status:'completed',games:rows.length,failures:0,elapsedSeconds:(performance.now()-start)/1000,replays:cells.length});
 console.log('Completed '+rows.length+' games');
}catch(error){write('manifest.json',{...manifest,status:'failed',error:String(error)});throw error;}
