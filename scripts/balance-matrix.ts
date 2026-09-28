import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { leaderIds } from '../src/lib/game/setup';
import { families, candidates, strategyVersion } from './balance/strategy';
import { digest, type Profiles } from './balance/study';
import { matrixReport, type MatrixGame } from './balance/matrix';
const args=process.argv.slice(2), flags: Record<string,string>={};
for(let i=0;i<args.length;i+=2) { if(!['--out','--blocks','--training-blocks','--seed','--workers','--variant'].includes(args[i])||!args[i+1]||flags[args[i]]) throw new Error('Invalid flags'); flags[args[i]]=args[i+1]; }
const blocks=Number(flags['--blocks']??200), trainingBlocks=Number(flags['--training-blocks']??8), workers=Number(flags['--workers']??4), seed=flags['--seed']??'all-leaders-v4', variant=flags['--variant']??'standard';
if(!flags['--out']||![blocks,trainingBlocks,workers].every(n=>Number.isSafeInteger(n)&&n>0)||workers>16||!['standard','thaleia-actions'].includes(variant)||! /^[a-zA-Z0-9_-]{1,32}$/.test(seed)) throw new Error('Invalid configuration');
const git=(...args:string[])=>execFileSync('git',args,{encoding:'utf8'}).trim();
const sourceCommit=git('rev-parse','HEAD'); if(git('status','--porcelain')) throw new Error('Commit before running');
const out=resolve(flags['--out']); mkdirSync(resolve(out,'..'),{recursive:true}); mkdirSync(out); mkdirSync(resolve(out,'replays'));
const write=(name:string,value:unknown)=>writeFileSync(resolve(out,name),JSON.stringify(value,null,2)+'\n');
const manifest:any={sourceCommit,dirty:false,policyVersion:strategyVersion,runtime:Bun.version,variant,seed,blocks,trainingBlocks,workers,
 trainingSeeds:Array.from({length:trainingBlocks},(_,i)=>`${seed}:training:${i}`),evaluationSeeds:Array.from({length:blocks},(_,i)=>`${seed}:evaluation:${i}`),
 plannedTrainingGames:trainingBlocks*1440,plannedEvaluationGames:blocks*300,primary:'Six equal-strategy-weight leader-pair shares; 20,000 block bootstrap resamples, Bonferroni six', status:'running',startedAt:new Date().toISOString()};
write('manifest.json',manifest);
const started=performance.now();
async function phase(name:string,tasks:any[]) {
 const children=tasks.map((task,worker)=>{const path=resolve(out,`${name}-task-${worker}.json`);writeFileSync(path,JSON.stringify({...task,out,worker,phase:name,variant}));return Bun.spawn([process.execPath,resolve('scripts/balance-matrix-worker.ts'),path],{stdout:'inherit',stderr:'inherit'});});
 await Promise.all(children.map(async child=>{const code=await child.exited;if(code!==0){for(const other of children)other.kill();throw new Error(`${name} worker failed: ${code}`);}}));
}
try {
 const keys=leaderIds.flatMap(leader=>families.filter(f=>f!=='treasure').map(f=>`${leader}/${f}`));
 await phase('training',Array.from({length:workers},(_,w)=>({keys:keys.filter((_,i)=>i%workers===w),seeds:manifest.trainingSeeds})));
 const training=Array.from({length:workers},(_,w)=>JSON.parse(readFileSync(resolve(out,`training-${w}.json`),'utf8'))).flat();
 const profiles:Profiles={version:1,policyVersion:strategyVersion,variant:variant as Profiles['variant'],trainingSeeds:manifest.trainingSeeds,training,selected:{}};
 for(const leader of leaderIds)for(const family of families){const key=`2/${leader}/${family}`;const rows=training.filter(r=>r.key===key).sort((a,b)=>b.share-a.share||a.candidate-b.candidate);profiles.selected[key]={family,parameters:candidates[family==='treasure'?0:rows[0].candidate]};}
 if(training.reduce((sum,r)=>sum+r.games,0)!==manifest.plannedTrainingGames)throw new Error('Training budget mismatch');
 write('profiles.json',profiles);manifest.profilesHash=digest(profiles);manifest.trainingGames=manifest.plannedTrainingGames;manifest.selectionFrozenAt=new Date().toISOString();write('manifest.json',manifest);
 await phase('evaluation',Array.from({length:workers},(_,w)=>({blocks:Array.from({length:blocks},(_,i)=>i).filter(i=>i%workers===w),seeds:manifest.evaluationSeeds})));
 const rows:MatrixGame[]=Array.from({length:workers},(_,w)=>gunzipSync(readFileSync(resolve(out,`games-${w}.jsonl.gz`))).toString().trim().split('\n').filter(Boolean).map(s=>JSON.parse(s))).flat();
 const report=matrixReport(rows,blocks);writeFileSync(resolve(out,'report.md'),report.markdown);write('estimates.json',report.estimates);write('cells.json',report.cells);write('league.json',report.league);
 if(git('rev-parse','HEAD')!==sourceCommit||git('status','--porcelain'))throw new Error('Source changed during execution');
 write('manifest.json',{...manifest,status:'completed',evaluationGames:rows.length,failures:0,elapsedSeconds:(performance.now()-started)/1000});console.log(`Completed ${rows.length} evaluation games: ${out}`);
} catch(error){write('manifest.json',{...manifest,status:'failed',error:String(error)});throw error;}
