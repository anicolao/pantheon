import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { pairedEstimate, type Pair } from '../../scripts/balance/evidence';
import { leaderPairs, type MatrixGame } from '../../scripts/balance/matrix';
import { definition } from '../../src/lib/game/actions';
import { leaderIds } from '../../src/lib/game/setup';
const [beforeDir,afterDir,out]=process.argv.slice(2);
const read=(dir:string,name:string)=>JSON.parse(readFileSync(`${dir}/${name}`,'utf8'));
const check=(value:boolean,message:string)=>{if(!value)throw new Error(message);};
const before=read(beforeDir,'manifest.json'),after=read(afterDir,'manifest.json');
check(before.status==='completed'&&after.status==='completed'&&before.failures===0&&after.failures===0,'Completed runs required');
check(before.policyVersion===4&&after.policyVersion===5&&before.variant==='standard'&&after.variant==='standard','Policies and rules');
for(const key of ['trainingSeeds','evaluationSeeds','trainingBlocks','blocks','plannedTrainingGames','plannedEvaluationGames'])check(JSON.stringify(before[key])===JSON.stringify(after[key]),`Paired ${key}`);
const games=(dir:string,m:any):MatrixGame[]=>Array.from({length:m.workers},(_,i)=>gunzipSync(readFileSync(`${dir}/games-${i}.jsonl.gz`)).toString().trim().split('\n').map(s=>JSON.parse(s))).flat();
const oldGames=games(beforeDir,before),newGames=games(afterDir,after);
const key=(r:MatrixGame)=>`${r.a}/${r.b}/${r.familyA}/${r.familyB}/${r.result.block}/${r.seat}`;
const oldByKey=new Map(oldGames.map(r=>[key(r),r]));
check(oldByKey.size===60000&&new Set(newGames.map(key)).size===60000&&newGames.length===60000,'Complete unique matrices');
let identicalUnchanged=0,unchangedNonTreasure=0;
for(const row of newGames){
 const old=oldByKey.get(key(row));check(!!old,'Paired cell missing');
 check(old!.result.seed===row.result.seed&&JSON.stringify(old!.result.lineup)===JSON.stringify(row.result.lineup)&&row.result.status==='completed','Seed/seat pairing');
 if(row.familyA!=='treasure'&&row.familyB!=='treasure'&&JSON.stringify(old!.result.profiles)===JSON.stringify(row.result.profiles)){
  unchangedNonTreasure++;check(JSON.stringify(old!.result)===JSON.stringify(row.result),'Unchanged non-Treasure outcome drift');identicalUnchanged++;
 }
}
const oldLeague=read(beforeDir,'league.json'),newLeague=read(afterDir,'league.json');
const select=(league:any[])=>Object.fromEntries(leaderIds.map(leader=>[leader,league.filter(r=>r.leader===leader).sort((a,b)=>b.share-a.share||a.family.localeCompare(b.family))[0].family]));
const oldBest=select(oldLeague),newBest=select(newLeague);
const oldCells=read(beforeDir,'cells.json'),newCells=read(afterDir,'cells.json');
const cell=(rows:any[],a:string,b:string,fa:string,fb:string)=>rows.find(r=>r.a===a&&r.b===b&&r.familyA===fa&&r.familyB===fb);
const share=(r:MatrixGame,leader:string)=>r.result.players.find(p=>p.leader===leader)!.share!;
const rounded=(n:number)=>(Math.sign(n)*Math.round(Math.abs(n)*1000+1e-9)/10).toFixed(1);
const pct=(n:number)=>rounded(n)+'%';
const pp=(n:number)=>(n>0?'+':'')+rounded(n)+' pp';
const headlines:any[]=[];
for(const [a,b] of leaderPairs){
 const old=cell(oldCells,a,b,oldBest[a],oldBest[b]),next=cell(newCells,a,b,newBest[a],newBest[b]);
 check(old.games===400&&next.games===400,'Headline budgets');
 const chosen=newGames.filter(r=>r.a===a&&r.b===b&&r.familyA===newBest[a]&&r.familyB===newBest[b]);
 const pairs:Pair[]=chosen.map(r=>{
  const original=oldByKey.get(`${a}/${b}/${oldBest[a]}/${oldBest[b]}/${r.result.block}/${r.seat}`)!;
  return {baselineId:key(r),treatmentId:key(original),block:r.result.block,count:2,target:`${a}/${b}`,focalFamily:r.familyA,opponentFamily:r.familyB,leader:a,baselineShare:share(r,a),treatmentShare:share(original,a),exposure:1};
 });
 const estimate=pairedEstimate(pairs,6,false);
 check(Math.abs(estimate.difference!-(next.share-old.share))<1e-10,'Paired delta');
 headlines.push({a,b,beforeFamilies:[oldBest[a],oldBest[b]],afterFamilies:[newBest[a],newBest[b]],before:old.share,after:next.share,change:estimate.difference,conditionalAdjustedInterval:estimate.correctedInterval,gamesPerVersion:400});
}
const changes=newCells.map((row:any)=>{const old=cell(oldCells,row.a,row.b,row.familyA,row.familyB);return {...row,before:old.share,after:row.share,change:row.share-old.share};});
const oldProfiles=read(beforeDir,'profiles.json'),newProfiles=read(afterDir,'profiles.json');
const changedProfiles=Object.keys(oldProfiles.selected).filter(key=>JSON.stringify(oldProfiles.selected[key])!==JSON.stringify(newProfiles.selected[key])).map(key=>({key,before:oldProfiles.selected[key],after:newProfiles.selected[key]}));
const treasure=leaderIds.map(leader=>{const old=oldLeague.find((r:any)=>r.leader===leader&&r.family==='treasure'),next=newLeague.find((r:any)=>r.leader===leader&&r.family==='treasure');return {leader,before:old.share,after:next.share,change:next.share-old.share,gamesPerVersion:6000};});
const diagnostics=(rows:MatrixGame[],leader:string)=>{
 const players=rows.flatMap(r=>r.result.players.filter(p=>p.leader===leader&&p.family==='treasure'));
 const scored=players.filter(p=>p.telemetry.firstScoreTurn!==null);
 return {games:players.length,meanTurns:players.reduce((n,p)=>n+p.turns,0)/players.length,
 meanFirstPoints:scored.reduce((n,p)=>n+p.telemetry.firstScoreTurn!,0)/Math.max(1,scored.length),
 noPointsGames:players.length-scored.length,noPointsFraction:1-scored.length/players.length,meanVP:players.reduce((n,p)=>n+p.score,0)/players.length,
 meanActionAcquisitions:players.reduce((n,p)=>n+Object.entries(p.telemetry.acquisitions).reduce((sum,[id,count])=>sum+(definition(id).type==='Action'?count:0),0),0)/players.length};
};
const treasureDiagnostics=leaderIds.map(leader=>({leader,before:diagnostics(oldGames,leader),after:diagnostics(newGames,leader)}));
const directed:any[]=[];
for(const a of leaderIds)for(const b of leaderIds){if(a===b)continue;
 const direct=cell(oldCells,a,b,'treasure','engine');
 const old=direct??cell(oldCells,b,a,'engine','treasure'),next=direct?cell(newCells,a,b,'treasure','engine'):cell(newCells,b,a,'engine','treasure');
 const x=direct?old.share:1-old.share,y=direct?next.share:1-next.share;
 directed.push({treasureLeader:a,engineLeader:b,before:x,after:y,change:y-x,gamesPerVersion:400});
}
const lines=['# Treasure v5: paired heads-up comparison','',
 'Standard rules; Thaleia +1 Action. Each version has 11,520 training games and 60,000 evaluation games. Training and evaluation seeds are identical across versions, with training/evaluation separated within each version. Profiles are retrained independently at equal budgets.','',
 '## Best observed strategy versus best observed strategy','',
 'Each leader selects its highest observed league-share family separately in each version. Rows show the actual head-to-head cells, not averages over weaker strategies. Selection uses evaluation outcomes: these are exploratory comparisons, not independently validated optimal strategies. Delta intervals bootstrap paired seed blocks 20,000 times and adjust across six rows, conditional on the selected families; they do not adjust for strategy selection.','',
 '| Leader A | Leader B | Before strategies (A / B) | Before A share | After strategies (A / B) | After A share | Change | Conditional adjusted delta interval |',
 '| --- | --- | --- | ---: | --- | ---: | ---: | --- |'];
for(const r of headlines)lines.push(`| ${r.a} | ${r.b} | ${r.beforeFamilies.join(' / ')} | ${pct(r.before)} | ${r.afterFamilies.join(' / ')} | ${pct(r.after)} | ${pp(r.change)} | ${r.conditionalAdjustedInterval.map(pp).join(' to ')} |`);
lines.push('','Each displayed cell contains 400 games per version, across the same 200 seeds and both seats. Changes are computed from unrounded shares; displayed values are rounded to tenths.','',
 '## Treasure versus Engine','', 'These fixed-family comparisons show Treasure’s change against each opposing leader’s Engine. Engine presets may change through retraining; these are descriptive same-seed differences.','',
 '| Treasure leader | Engine leader | Before Treasure share | After Treasure share | Change |','| --- | --- | ---: | ---: | ---: |');
for(const r of directed)lines.push(`| ${r.treasureLeader} | ${r.engineLeader} | ${pct(r.before)} | ${pct(r.after)} | ${pp(r.change)} |`);
lines.push('','## Treasure against the full population (supplementary)','', 'These four summaries average all three rivals and all five opposing families equally (6,000 games per leader/version). They describe Treasure’s overall performance, not best-strategy leader balance.','',
 '| Leader | Before Treasure share | After Treasure share | Change |','| --- | ---: | ---: | ---: |');
for(const r of treasure)lines.push(`| ${r.leader} | ${pct(r.before)} | ${pct(r.after)} | ${pp(r.change)} |`);
lines.push('','## Treasure behavior (descriptive)','', 'First-points timing is conditional on gaining any points; the number of no-points games (out of 6,000) is shown separately. Acquisitions include both purchases and gains. These are behavioral summaries, not an isolated causal mechanism test.','',
 '| Leader | First points, before → after | No-points games, before → after | Action acquisitions/game, before → after | Final VP, before → after |',
 '| --- | ---: | ---: | ---: | ---: |');
for(const r of treasureDiagnostics)lines.push(`| ${r.leader} | ${r.before.meanFirstPoints.toFixed(1)} → ${r.after.meanFirstPoints.toFixed(1)} | ${r.before.noPointsGames} → ${r.after.noPointsGames} | ${r.before.meanActionAcquisitions.toFixed(1)} → ${r.after.meanActionAcquisitions.toFixed(1)} | ${r.before.meanVP.toFixed(1)} → ${r.after.meanVP.toFixed(1)} |`);
lines.push('','## Attribution and verification','',`${changedProfiles.length} training-selected profiles changed. ${identicalUnchanged.toLocaleString()} non-Treasure games with unchanged profiles reproduce their v4 results exactly. The before/after study includes both the Treasure implementation change and any other families’ preset adaptation to that opponent. Reused evaluation seeds make this paired exploratory evidence, not fresh confirmation.`, '',
 '[All 150 cell differences](cell-changes.csv) · [Changed presets and machine-readable results](comparison.json) · [Original v4 study](../all-leaders-v4/README.md)', '');
writeFileSync(`${out}/comparison.md`,lines.join('\n'));
writeFileSync(`${out}/comparison.json`,JSON.stringify({beforeSource:before.sourceCommit,afterSource:after.sourceCommit,oldBest,newBest,headlines,treasure,treasureDiagnostics,directed,changedProfiles,unchangedNonTreasure,identicalUnchanged},null,2)+'\n');
writeFileSync(`${out}/cell-changes.csv`,'a,b,familyA,familyB,games,before,after,change\n'+changes.map((r:any)=>[r.a,r.b,r.familyA,r.familyB,r.games,r.before,r.after,r.change].join(',')).join('\n')+'\n');
console.log(JSON.stringify({oldBest,newBest,headlines,treasure,changedProfiles,identicalUnchanged},null,2));
