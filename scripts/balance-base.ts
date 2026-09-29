import {baseProfiles,raceProfiles,endGameProfiles,engineEndGameProfiles} from './balance/base-profiles';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {availableParallelism} from 'node:os';
import {resolve} from 'node:path';
import {candidates,strategyVersion} from './balance/strategy';
const out=resolve(process.argv[2]??'balance-runs/base-game-v1'),blocks=Number(process.argv[3]??1000),workers=availableParallelism();
const mode=process.argv[4]??'legacy';
if(!['legacy','thinning','race','endgame','endgame-engine'].includes(mode))throw new Error('Mode must be legacy, thinning, race, endgame or endgame-engine');
const profiles=mode==='endgame-engine'?engineEndGameProfiles:mode==='endgame'?endGameProfiles:mode==='race'?raceProfiles:mode==='thinning'?baseProfiles:{treasure:{family:'treasure',parameters:candidates[0]},engine:{family:'engine',parameters:candidates[0]}};
const cells=Object.keys(profiles).length**2,seed=mode.startsWith('endgame')?'base-endgame-v1:screening':mode==='race'?'base-race-v1:evaluation':mode==='thinning'?'base-thinning-v1:evaluation':'base-game-v1:evaluation';
if(!Number.isInteger(blocks)||blocks<10)throw new Error('At least ten seed blocks required');
const git=(...args:string[])=>execFileSync('git',args,{encoding:'utf8'}).trim();
if(git('status','--porcelain'))throw new Error('Commit source first');const sourceCommit=git('rev-parse','HEAD');
mkdirSync(out);mkdirSync(`${out}/replays`);
const write=(n:string,v:unknown)=>writeFileSync(`${out}/${n}`,JSON.stringify(v,null,2)+'\n');
const manifest={sourceCommit,dirty:false,status:'running',variant:'base-game',policyVersion:strategyVersion,blocks,workers,plannedGames:blocks*cells,seed,profiles,mode,training:'None: fixed default preset, identical across seats',startingDeck:{obol:6,hamlet:3,'temple-of-athena':1},rules:'No leader effects; Worship forbidden; Temples have no effects; standard supply and ending rules',orientation:'Player 1 = first in turn order. Rows P1 strategy, columns P2 strategy. Never pool cells or reverse turn order.',primary:`${cells} separate P1 victory shares, ties split; seed bootstrap intervals adjusted over ${cells} cells; row-wise P2 best responses`,startedAt:new Date().toISOString()};write('manifest.json',manifest);
const start=performance.now();
const children=Array.from({length:workers},(_,worker)=>{
 const path=`${out}/task-${worker}.json`;writeFileSync(path,JSON.stringify({out,worker,profiles,seed,blocks:Array.from({length:blocks},(_,i)=>i).filter(i=>i%workers===worker)}));
 return Bun.spawn([process.execPath,resolve('scripts/balance-base-worker.ts'),path],{stdout:'inherit',stderr:'inherit'});
});
try{
 await Promise.all(children.map(async c=>{if(await c.exited!==0){for(const x of children)x.kill();throw new Error('Worker failed');}}));
 const rows=Array.from({length:workers},(_,i)=>gunzipSync(readFileSync(`${out}/games-${i}.jsonl.gz`)).toString().trim().split('\n').filter(Boolean).map(s=>JSON.parse(s))).flat();
 if(rows.length!==blocks*cells||new Set(rows.map(r=>`${r.result.block}/${r.first}/${r.second}`)).size!==blocks*cells)throw new Error('Incomplete/duplicate cells');
 if(git('rev-parse','HEAD')!==sourceCommit||git('status','--porcelain'))throw new Error('Source drift');
 write('manifest.json',{...manifest,status:'completed',games:rows.length,failures:0,replays:10*cells,elapsedSeconds:(performance.now()-start)/1000});console.log(`Completed ${rows.length} base-game games`);
}catch(error){write('manifest.json',{...manifest,status:'failed',error:String(error)});throw error;}
