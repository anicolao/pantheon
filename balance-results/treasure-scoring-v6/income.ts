import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { gunzipSync,gzipSync } from 'node:zlib';
import { availableParallelism } from 'node:os';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { endingDecks,type DeckInput } from '../../scripts/balance/deck-audit';
const root=process.argv[2],out=`${root}/income`,workers=availableParallelism();
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw new Error('Dirty source');
const parent=JSON.parse(readFileSync(`${root}/manifest.json`,'utf8'));
if(parent.status!=='completed')throw new Error('Finish games first');
mkdirSync(out);const inputs:DeckInput[][]=Array.from({length:workers},()=>[]);let count=0;
for(let i=0;i<parent.workers;i++)for(const line of gunzipSync(readFileSync(`${root}/games-${i}.jsonl.gz`)).toString().trim().split('\n'))for(const input of endingDecks(JSON.parse(line),6).filter(d=>d.family==='treasure'))inputs[count++%workers].push(input);
if(count!==24000)throw new Error('Incomplete Treasure population');
const start=performance.now(),children=inputs.map((items,i)=>{
 writeFileSync(`${out}/input-${i}.json.gz`,gzipSync(JSON.stringify(items)));
 return Bun.spawn([process.execPath,resolve('scripts/balance-deck-audit-worker.ts'),out,String(i)],{stdout:'inherit',stderr:'inherit'});
});
await Promise.all(children.map(async child=>{if(await child.exited!==0){for(const other of children)other.kill();throw new Error('Income worker failure');}}));
const stats:Record<string,{decks:number;coins:number;hits:number}>={};const seen=new Set<string>();
for(let i=0;i<workers;i++)for(const line of gunzipSync(readFileSync(`${out}/decks-${i}.jsonl.gz`)).toString().trim().split('\n')){
 const r=JSON.parse(line);if(seen.has(r.key)||r.hands!==100)throw new Error('Invalid income row');seen.add(r.key);
 if(Object.values(r.histogram).reduce((s:any,n:any)=>s+n,0)!==100)throw new Error('Invalid histogram');
 const s=stats[r.leader]??={decks:0,coins:0,hits:0};s.decks++;s.coins+=r.mean;s.hits+=r.hitEight;
}
const old:any[]=JSON.parse(readFileSync('balance-results/ending-hands-v1/summary.json','utf8'));
const summary=Object.entries(stats).map(([leader,s])=>{
 if(s.decks!==6000)throw new Error('Leader budget');
 const before=old.find(r=>r.version===5&&r.family==='treasure'&&r.leader===leader);
 return {leader,decks:s.decks,hands:s.decks*100,beforeMean:before.mean,afterMean:s.coins/s.decks,beforeHitEight:before.hitEight,afterHitEight:s.hits/(s.decks*100)};
});
if(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==sourceCommit||execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw new Error('Source drift');
writeFileSync(`${out}/summary.json`,JSON.stringify(summary,null,2)+'\n');
writeFileSync(`${out}/manifest.json`,JSON.stringify({status:'completed',sourceCommit,workers,decks:count,hands:count*100,failures:0,elapsedSeconds:(performance.now()-start)/1000,baseline:'balance-results/ending-hands-v1: v5 Treasure',sampling:'100 independent Fisher-Yates deals per deck, same paired ending-hands-v1 namespace and common cash execution as baseline'},null,2)+'\n');console.log(JSON.stringify(summary,null,2));
