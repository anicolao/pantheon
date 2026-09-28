import { readFileSync,writeFileSync,existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { pairedEstimate,type Pair } from '../../scripts/balance/evidence';
import type { MatrixGame } from '../../scripts/balance/matrix';
import { leaderIds } from '../../src/lib/game/setup';
const out=process.argv[2],baseline='balance-results/all-leaders-v5';
const read=(dir:string,n:string)=>JSON.parse(readFileSync(`${dir}/${n}`,'utf8'));
const manifest=read(out,'manifest.json'),oldManifest=read(baseline,'manifest.json');
if(manifest.status!=='completed'||manifest.failures)throw new Error('Incomplete experiment');
const rows=(dir:string,workers:number):MatrixGame[]=>Array.from({length:workers},(_,i)=>gunzipSync(readFileSync(`${dir}/games-${i}.jsonl.gz`)).toString().trim().split('\n').filter(Boolean).map(s=>JSON.parse(s))).flat();
const key=(r:MatrixGame)=>`${r.a}/${r.b}/${r.familyA}/${r.familyB}/${r.result.block}/${r.seat}`;
const old=rows(baseline,oldManifest.workers),now=rows(out,manifest.workers),byKey=new Map(old.map(r=>[key(r),r]));
if(now.length!==manifest.blocks*108||new Set(now.map(key)).size!==now.length)throw new Error('Duplicate/missing games');
if(JSON.stringify(read(out,'profiles.json'))!==JSON.stringify(read(baseline,'profiles.json')))throw new Error('Profile drift');
for(const r of now){const b=byKey.get(key(r));if(!b||r.result.status!=='completed'||r.result.seed!==b.result.seed||JSON.stringify(r.result.profiles)!==JSON.stringify(b.result.profiles)||JSON.stringify(r.result.lineup)!==JSON.stringify(b.result.lineup))throw new Error('Pair drift');}
const player=(r:MatrixGame,l:string)=>r.result.players.find(p=>p.leader===l)!;
const primary=leaderIds.map(leader=>{
 const selected=now.filter(r=>player(r,leader)?.family==='treasure'&&r.result.players.some(p=>p.leader!==leader&&p.family==='engine'));
 if(selected.length!==manifest.blocks*6)throw new Error('Primary budget');
 const pairs:Pair[]=selected.map(r=>({baselineId:key(r),treatmentId:key(r),block:r.result.block,count:2,target:leader,focalFamily:'treasure',opponentFamily:'engine',leader,baselineShare:player(r,leader).share!,treatmentShare:player(byKey.get(key(r))!,leader).share!,exposure:1}));
 const estimate=pairedEstimate(pairs,4,false);
 const before=selected.reduce((s,r)=>s+player(byKey.get(key(r))!,leader).share!,0)/selected.length;
 return {leader,games:selected.length,before,after:before+estimate.difference!,...estimate};
});
const diagnostics=(rs:MatrixGame[],leader:string)=>{
 const ps=rs.flatMap(r=>r.result.players.filter(p=>p.leader===leader&&p.family==='treasure'));
 const scored=ps.filter(p=>p.telemetry.firstScoreTurn!==null);
 return {games:ps.length,share:ps.reduce((s,p)=>s+p.share!,0)/ps.length,meanVP:ps.reduce((s,p)=>s+p.score,0)/ps.length,meanTurns:ps.reduce((s,p)=>s+p.turns,0)/ps.length,meanFirstPoints:scored.reduce((s,p)=>s+p.telemetry.firstScoreTurn!,0)/scored.length,noPoints:ps.length-scored.length,meanAcropolises:ps.reduce((s,p)=>s+(p.telemetry.acquisitions.acropolis??0),0)/ps.length,meanDeckSize:ps.reduce((s,p)=>s+p.telemetry.finalDeckSize,0)/ps.length};
};
const pairedOld=now.map(r=>byKey.get(key(r))!);
const diagnosticsRows=leaderIds.map(leader=>({leader,before:diagnostics(pairedOld,leader),after:diagnostics(now,leader)}));
const engineCells=leaderIds.flatMap(leader=>leaderIds.filter(l=>l!==leader).map(opponent=>{
 const rs=now.filter(r=>player(r,leader)?.family==='treasure'&&player(r,opponent)?.family==='engine');
 if(rs.length!==manifest.blocks*2)throw new Error('Cell budget');
 return {leader,opponent,games:rs.length,before:rs.reduce((s,r)=>s+player(byKey.get(key(r))!,leader).share!,0)/rs.length,after:rs.reduce((s,r)=>s+player(r,leader).share!,0)/rs.length};
}));
const cells=Array.from(new Set(now.map(r=>`${r.a}/${r.b}/${r.familyA}/${r.familyB}`))).map(k=>{
 const rs=now.filter(r=>`${r.a}/${r.b}/${r.familyA}/${r.familyB}`===k);
 if(rs.length!==manifest.blocks*2)throw new Error('Cell incomplete');
 return {key:k,games:rs.length,before:rs.reduce((s,r)=>s+player(byKey.get(key(r))!,r.a).share!,0)/rs.length,after:rs.reduce((s,r)=>s+player(r,r.a).share!,0)/rs.length};
});
const pct=(n:number)=>(Math.round(n*1000+1e-9)/10).toFixed(1)+'%',num=(n:number)=>n.toFixed(2);
const lines=['# Treasure scoring fix: frozen-profile paired test','',`${now.length.toLocaleString()} rerun games, ${manifest.blocks} original evaluation seed blocks, both seats. Only the top-point scoring gate changes. All profiles remain exactly v5; no retraining. Primary: Treasure against frozen Engine opponents, pooled equally across the other three leaders.`, '', '| Treasure leader | Before | After | Change | Four-comparison adjusted interval | Games per arm |','| --- | ---: | ---: | ---: | --- | ---: |'];
for(const r of primary)lines.push(`| ${r.leader} | ${pct(r.before)} | ${pct(r.after)} | ${num(r.difference!*100)} pp | ${r.correctedInterval!.map(n=>num(n*100)).join(' to ')} pp | ${r.games} |`);
lines.push('','Intervals use 20,000 paired seed-block bootstrap resamples and Bonferroni adjustment over four leaders. Reused seeds make this exploratory. The intervention is isolated for non-Treasure opponents; Treasure mirrors change both players. These are strategy diagnostics, not an average-strategy headline leader balance table.','','## Every Treasure versus Engine matchup','','| Treasure leader | Engine leader | Before | After |','| --- | --- | ---: | ---: |');
for(const r of engineCells)lines.push(`| ${r.leader} | ${r.opponent} | ${pct(r.before)} | ${pct(r.after)} |`);
lines.push('','## Treasure across all five opposing families (supplementary)','','| Leader | Share before → after | First points turn | Final VP | Acropolises gained | Final deck size |','| --- | ---: | ---: | ---: | ---: | ---: |');
for(const r of diagnosticsRows)lines.push(`| ${r.leader} | ${pct(r.before.share)} → ${pct(r.after.share)} | ${num(r.before.meanFirstPoints)} → ${num(r.after.meanFirstPoints)} | ${num(r.before.meanVP)} → ${num(r.after.meanVP)} | ${num(r.before.meanAcropolises)} → ${num(r.after.meanAcropolises)} | ${num(r.before.meanDeckSize)} → ${num(r.after.meanDeckSize)} |`);
lines.push('','Every leader has '+(manifest.blocks*30)+' Treasure player results per arm. First-points means exclude never-scoring games; counts are in summary.json. Economic acquisition and Action-play rules remain unchanged. Different scoring changes later inventories, opportunities and game endings, as expected. All 192 sampled non-Treasure games exactly match v5, and all 108 saved new traces replay to finished production states. Full outcome rows, all 54 affected cell results and source provenance are archived.');
const endingIncome=existsSync(`${out}/income/summary.json`)?read(`${out}/income`,'summary.json'):null;
if(endingIncome){
 lines.push('','## Independent ending income: 100 hands per Treasure deck','','24,000 new ending decks, 2,400,000 fresh deals; same sample seeds and cash execution as the v5 ending-deck audit. Actions are included. These final inventories contain different amounts of points and arise at different ending turns.','','| Leader | Mean Coins before → after | Chance of at least $8 before → after |','| --- | ---: | ---: |');
 for(const r of endingIncome)lines.push(`| ${r.leader} | ${num(r.beforeMean)} → ${num(r.afterMean)} | ${pct(r.beforeHitEight)} → ${pct(r.afterHitEight)} |`);
}
writeFileSync(`${out}/summary.json`,JSON.stringify({primary,engineCells,diagnostics:diagnosticsRows,cells,endingIncome},null,2)+'\n');writeFileSync(`${out}/report.md`,lines.join('\n')+'\n');console.log(lines.join('\n'));
