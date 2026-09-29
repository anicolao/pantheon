import { readFileSync,writeFileSync,existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { pairedEstimate,type Pair } from '../../scripts/balance/evidence';
import type { MatrixGame } from '../../scripts/balance/matrix';
import { endingDecks } from '../../scripts/balance/deck-audit';
import { cards } from '../../src/lib/game/cards';
import { leaderIds } from '../../src/lib/game/setup';
const out=process.argv[2],baseline=process.argv[3]??'balance-results/treasure-scoring-v6';
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
 const estimate=pairedEstimate(pairs,8,false);
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
const lines=[`Baseline: policy v${oldManifest.policyVersion} (${baseline}); treatment: v8, $0.035.`, '', '# Treasure $0.035 tolerance: frozen-profile paired test','',`${now.length.toLocaleString()} rerun games, ${manifest.blocks} original evaluation seed blocks, both seats. Only economic near-ties prefer Treasures; the v6 scoring rule is unchanged. All profiles remain exactly the frozen v6 profiles (originally trained at v5); no retraining. Primary: Treasure against frozen Engine opponents, pooled equally across the other three leaders.`, '', '| Treasure leader | Before | After | Change | Eight-comparison adjusted interval | Games per arm |','| --- | ---: | ---: | ---: | --- | ---: |'];
for(const r of primary)lines.push(`| ${r.leader} | ${pct(r.before)} | ${pct(r.after)} | ${num(r.difference!*100)} pp | ${r.correctedInterval!.map(n=>num(n*100)).join(' to ')} pp | ${r.games} |`);
lines.push('','Intervals use 20,000 paired seed-block bootstrap resamples and Bonferroni adjustment over eight leader-by-baseline comparisons (four versus no epsilon and four versus $0.10). Reused seeds make this exploratory. The intervention is isolated for non-Treasure opponents; Treasure mirrors change both players. These are strategy diagnostics, not an average-strategy headline leader balance table.','','## Every Treasure versus Engine matchup','','| Treasure leader | Engine leader | Before | After |','| --- | --- | ---: | ---: |');
for(const r of engineCells)lines.push(`| ${r.leader} | ${r.opponent} | ${pct(r.before)} | ${pct(r.after)} |`);
lines.push('','## Treasure across all five opposing families (supplementary)','','| Leader | Share before → after | First points turn | Final VP | Acropolises gained | Final deck size |','| --- | ---: | ---: | ---: | ---: | ---: |');
for(const r of diagnosticsRows)lines.push(`| ${r.leader} | ${pct(r.before.share)} → ${pct(r.after.share)} | ${num(r.before.meanFirstPoints)} → ${num(r.after.meanFirstPoints)} | ${num(r.before.meanVP)} → ${num(r.after.meanVP)} | ${num(r.before.meanAcropolises)} → ${num(r.after.meanAcropolises)} | ${num(r.before.meanDeckSize)} → ${num(r.after.meanDeckSize)} |`);
lines.push('','Every leader has '+(manifest.blocks*30)+' Treasure player results per arm. First-points means exclude never-scoring games; counts are in the accompanying JSON report. Only economic candidate selection changes. Scoring, EV estimation and Action play remain unchanged. No non-Treasure control games are rerun. All 108 saved new traces replay to finished production states. Full outcome rows, all 54 affected cell results and source provenance are archived.');
const actionIds=cards.filter(c=>c.type==='Action'&&!c.uniqueStartingCard).map(c=>c.id);
const compositions=leaderIds.map(leader=>{
 const aggregate=(rs:MatrixGame[],version:number)=>{
  const ds=rs.flatMap(r=>endingDecks(r,version).filter(d=>d.leader===leader&&d.family==='treasure'));
  if(ds.length!==manifest.blocks*30)throw new Error('Ending deck budget');
  const perCard=Object.fromEntries(cards.filter(c=>c.type==='Action'||c.type==='Treasure').map(c=>[c.id,{meanCopies:ds.reduce((s,d)=>s+(d.owned[c.id]??0),0)/ds.length,fractionPresent:ds.filter(d=>(d.owned[c.id]??0)>0).length/ds.length}]));
  return {decks:ds.length,meanSupplyActions:actionIds.reduce((s,id)=>s+perCard[id].meanCopies,0),perCard};
 };
 return {leader,before:aggregate(pairedOld,oldManifest.policyVersion),after:aggregate(now,8)};
});
lines.push('','## Ending-deck composition','','Reconstructed from starting inventories plus gains minus trashes; every final size and VP total is checked. Mean copies include decks without the card. Starting Temples are excluded from supply Action totals.','','| Leader | Bronze mean before → after | Decks with Bronze before → after | Drachma mean before → after | Supply Actions before → after |','| --- | ---: | ---: | ---: | ---: |');
for(const r of compositions)lines.push(`| ${r.leader} | ${num(r.before.perCard['bronze-recruit'].meanCopies)} → ${num(r.after.perCard['bronze-recruit'].meanCopies)} | ${pct(r.before.perCard['bronze-recruit'].fractionPresent)} → ${pct(r.after.perCard['bronze-recruit'].fractionPresent)} | ${num(r.before.perCard.drachma.meanCopies)} → ${num(r.after.perCard.drachma.meanCopies)} | ${num(r.before.meanSupplyActions)} → ${num(r.after.meanSupplyActions)} |`);
lines.push('','## All ending supply Action cards','','Average copies per deck. Every leader has '+(manifest.blocks*30)+' decks per version.','','| Card | Thaleia before → after | Nereon before → after | Melia before → after | Doreios before → after |','| --- | ---: | ---: | ---: | ---: |');
for(const id of actionIds){
 if(!compositions.some(r=>r.before.perCard[id].meanCopies||r.after.perCard[id].meanCopies))continue;
 lines.push(`| ${cards.find(c=>c.id===id)!.name} | ${compositions.map(r=>`${num(r.before.perCard[id].meanCopies)} → ${num(r.after.perCard[id].meanCopies)}`).join(' | ')} |`);
}
writeFileSync(`${out}/summary-v${oldManifest.policyVersion}.json`,JSON.stringify({primary,engineCells,diagnostics:diagnosticsRows,cells,compositions},null,2)+'\n');writeFileSync(`${out}/report-v${oldManifest.policyVersion}.md`,lines.join('\n')+'\n');console.log(lines.join('\n'));
