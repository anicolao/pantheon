import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {availableParallelism} from 'node:os';
import {resolve} from 'node:path';
import {endingDecks,type DeckInput} from './balance/deck-audit';
import {replayExperiment} from './balance/experiment';
import {readdirSync} from 'node:fs';
const args=process.argv.slice(2),out=resolve(args[0]),blocks=Number(args[1]??200),workers=availableParallelism();
if(!Number.isInteger(blocks)||blocks<1||blocks>200)throw new Error('Invalid blocks');
const git=(...args:string[])=>execFileSync('git',args,{encoding:'utf8'}).trim();
const sourceCommit=git('rev-parse','HEAD');if(git('status','--porcelain'))throw new Error('Commit before auditing');
mkdirSync(out);
const started=performance.now(),inputs:DeckInput[][]=Array.from({length:workers},()=>[]);
const manifests:any[]=[];let traceChecks=0;
for(const version of [4,5]){
 const dir=`balance-results/all-leaders-v${version}`,manifest=JSON.parse(readFileSync(`${dir}/manifest.json`,'utf8'));manifests.push(manifest);
 if(manifest.status!=='completed'||manifest.failures!==0||manifest.variant!=='standard')throw new Error('Invalid source matrix');
 for(let shard=0;shard<manifest.workers;shard++){
  const rows=gunzipSync(readFileSync(`${dir}/games-${shard}.jsonl.gz`)).toString().trim().split('\n');
  for(const line of rows){const row=JSON.parse(line);if(row.result.block>=blocks)continue;
   for(const deck of endingDecks(row,version))inputs[row.result.block%workers].push(deck);
  }
 }
 // Validate reconstructed composition and ending supply against all saved production replays.
 for(const file of readdirSync(`${dir}/replays`)){
  const trace=JSON.parse(gunzipSync(readFileSync(`${dir}/replays/${file}`)).toString());
  const game=replayExperiment(trace.events,trace.options);
  const [a,b,familyA,familyB,seat]=file.replace('.json.gz','').split('-');
  for(const deck of endingDecks({a,b,familyA,familyB,seat:Number(seat),result:trace.result} as any,version)){
   const uid=trace.result.players.find((p:any)=>p.leader===deck.leader).uid;
   const actual:Record<string,number>={};for(const c of Object.values(game.decks[uid]).flat())actual[c.cardId]=(actual[c.cardId]??0)+1;
   const normalized=(v:Record<string,number>)=>JSON.stringify(Object.entries(v).sort());
   if(normalized(actual)!==normalized(deck.owned)||normalized(game.supply)!==normalized(deck.supply))throw new Error('Replay reconstruction mismatch');
   traceChecks++;
  }
 }
}
const deckCount=inputs.reduce((n,x)=>n+x.length,0);if(deckCount!==blocks*1200)throw new Error('Incomplete ending decks');
const manifest:any={sourceCommit,dirty:false,status:'running',startedAt:new Date().toISOString(),workers,blocks,handsPerDeck:100,plannedDecks:deckCount,plannedHands:deckCount*100,sourceMatrices:manifests.map(m=>({policyVersion:m.policyVersion,sourceCommit:m.sourceCommit,seed:m.seed})),traceDeckChecks:traceChecks,sampling:'Independent Fisher-Yates shuffles; namespace ending-hands-v1; paired by game/leader/hand across versions',execution:'Common v5 cash Action/discard policy; production reducer; no Worship or purchases; optional trash/upgrade declined; mandatory gain payload heuristic; same assumptions as EV estimator',limits:'Ending-deck diagnostic, not a replay of game timing or actual next turn; means and P(Coins>=8) are distinct; 100 hands per deck, not optimized play'};
const write=()=>writeFileSync(`${out}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');write();
for(const [worker,rows] of inputs.entries())writeFileSync(`${out}/input-${worker}.json.gz`,gzipSync(JSON.stringify(rows)));
console.log(`Reconstructed ${deckCount} decks; ${traceChecks} replay deck/supply checks; starting ${workers} workers for ${deckCount*100} hands`);
const children=Array.from({length:workers},(_,i)=>Bun.spawn([process.execPath,resolve('scripts/balance-deck-audit-worker.ts'),out,String(i)],{stdout:'inherit',stderr:'inherit'}));
try{
 await Promise.all(children.map(async child=>{if(await child.exited!==0){for(const other of children)other.kill();throw new Error('Audit worker failed');}}));
 let completed=0;
 for(let i=0;i<workers;i++)for(const line of gunzipSync(readFileSync(`${out}/decks-${i}.jsonl.gz`)).toString().trim().split('\n').filter(Boolean)){
  const r=JSON.parse(line),n=Object.values(r.histogram).reduce((n:any,x:any)=>n+x,0);if(n!==100||r.hands!==100)throw new Error('Hand count mismatch');completed++;
 }
 if(completed!==deckCount||git('rev-parse','HEAD')!==sourceCommit||git('status','--porcelain'))throw new Error('Incomplete audit or source drift');
 Object.assign(manifest,{status:'completed',decks:completed,hands:completed*100,failures:0,elapsedSeconds:(performance.now()-started)/1000});write();console.log(`Completed ${completed*100} hands from ${completed} ending decks`);
}catch(error){Object.assign(manifest,{status:'failed',error:String(error)});write();throw error;}
