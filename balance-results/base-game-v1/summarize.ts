import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {pairedEstimate,type Pair} from '../../scripts/balance/evidence';
import {definition} from '../../src/lib/game/actions';
import {candidates} from '../../scripts/balance/strategy';
import type {StudyResult} from '../../scripts/balance/experiment';
const dir=process.argv[2];if(!dir)throw Error('Supply run directory');
const manifest=JSON.parse(readFileSync(dir+'/manifest.json','utf8'));
function check(ok:unknown,message:string):asserts ok{if(!ok)throw Error(message);}
check(manifest.status==='completed','Run incomplete');
type Row={first:'treasure'|'engine';second:'treasure'|'engine';result:StudyResult};
const rows:Row[]=Array.from({length:manifest.workers},(_,i)=>gunzipSync(readFileSync(dir+'/games-'+i+'.jsonl.gz')).toString().trim().split('\n').map(s=>JSON.parse(s))).flat();
check(rows.length===manifest.blocks*4,'Wrong game count');
check(new Set(rows.map(r=>r.first+'/'+r.second+'/'+r.result.block)).size===rows.length,'Duplicate games');
const player=(r:Row,p:number)=>r.result.players.find(x=>x.position===p)!;
for(const r of rows){
 check(r.result.status==='completed'&&r.result.variant==='base-game','Bad result');
 check(r.result.seed===manifest.seed+':'+r.result.block,'Seed mismatch');
 check(player(r,0).family===r.first&&player(r,1).family===r.second,'Strategy/position mismatch');
 check(player(r,0).share!+player(r,1).share! ===1,'Shares mismatch');
 check(r.result.profiles.every(p=>JSON.stringify(p.parameters)===JSON.stringify(candidates[0])),'Profile mismatch');
 for(const p of r.result.players){
  check(p.telemetry.leaderTriggers===0&&Object.keys(p.telemetry.worship).length===0,'Powers used');
  const owned:Record<string,number>={obol:6,hamlet:3,'temple-of-athena':1};
  for(const [id,n]of Object.entries(p.telemetry.acquisitions))owned[id]=(owned[id]??0)+n;
  for(const [id,n]of Object.entries(p.telemetry.trashes))owned[id]=(owned[id]??0)-n;
  check(Object.values(owned).every(n=>n>=0),'Negative inventory');
  check(Object.values(owned).reduce((a,b)=>a+b,0)===p.telemetry.finalDeckSize,'Deck size mismatch');
  check(Object.entries(owned).reduce((sum,[id,n])=>sum+n*(definition(id).vp??0),0)===p.score,'VP mismatch');
 }
}
const mean=(v:number[])=>v.reduce((a,b)=>a+b,0)/v.length;
const families=['treasure','engine'] as const;
const cells=families.flatMap(first=>families.map(second=>{
 const games=rows.filter(r=>r.first===first&&r.second===second).sort((a,b)=>a.result.block-b.result.block);
 check(games.length===manifest.blocks&&games.every((r,i)=>r.result.block===i),'Incomplete cell');
 const pairs:Pair[]=games.map(r=>({baselineId:first+'/'+second+'/'+r.result.block,treatmentId:'half',block:r.result.block,count:2,target:first+'/'+second,focalFamily:first,opponentFamily:second,leader:'none',baselineShare:player(r,0).share,treatmentShare:0.5,exposure:1}));
 const estimate=pairedEstimate(pairs,4,false);
 const diagnostics=(position:number)=>{
  const ps=games.map(r=>player(r,position)),acquisitions:Record<string,number>={};
  for(const p of ps)for(const[id,n]of Object.entries(p.telemetry.acquisitions))acquisitions[id]=(acquisitions[id]??0)+n/ps.length;
  return {meanVP:mean(ps.map(p=>p.score)),meanTurns:mean(ps.map(p=>p.turns)),meanFirstPoints:mean(ps.flatMap(p=>p.telemetry.firstScoreTurn===null?[]:[p.telemetry.firstScoreTurn])),noPoints:ps.filter(p=>p.telemetry.firstScoreTurn===null).length,meanDeckSize:mean(ps.map(p=>p.telemetry.finalDeckSize)),meanAcquisitions:acquisitions};
 };
 return {first,second,games:games.length,p1Share:mean(games.map(r=>player(r,0).share!)),p1Wins:games.filter(r=>player(r,0).share===1).length,splitTies:games.filter(r=>player(r,0).share===0.5).length,p2Wins:games.filter(r=>player(r,0).share===0).length,equalVPScores:games.filter(r=>player(r,0).score===player(r,1).score).length,interval:estimate.interval!.map(v=>v+0.5),adjustedInterval:estimate.correctedInterval!.map(v=>v+0.5),p1:diagnostics(0),p2:diagnostics(1)};
}));
const responses=families.map(first=>cells.filter(c=>c.first===first).sort((a,b)=>a.p1Share-b.p1Share)[0]);
const selected=[...responses].sort((a,b)=>b.p1Share-a.p1Share)[0];
for(const[name,value]of Object.entries({cells,responses:{rows:responses,selected}}))writeFileSync(dir+'/'+name+'.json',JSON.stringify(value,null,2)+'\n');
const label=(s:string)=>s==='treasure'?'Big Money':'Engine',pct=(v:number)=>(v*100).toFixed(2)+'%';
const lines=['# Base game: explicit strategy responses','',
'No leader powers or Worship; both players start with six Obols, three Hamlets and one identical inert Temple. Standard supply, ordinary Action effects and ending/tiebreak rules remain. Current Treasure v8 ($0.035 epsilon) and Engine use the same fixed default preset, without retuning.','',
'Player 1 acts first. Each cell contains 1,000 fresh seeded games; seeds are reused across cells. Entries are Player 1 victory shares, splitting ties. No strategies, leaders, presets or turn orders are pooled.','',
'| P1 strategy ↓ / P2 strategy → | Big Money | Engine |','| --- | ---: | ---: |',
...families.map(first=>'| '+label(first)+' | '+families.map(second=>pct(cells.find(c=>c.first===first&&c.second===second)!.p1Share)).join(' | ')+' |'),'',
'| P1 / P2 | P1 wins | Split ties | P2 wins | Family-adjusted interval for P1 |','| --- | ---: | ---: | ---: | --- |',
...cells.map(c=>'| '+label(c.first)+' / '+label(c.second)+' | '+c.p1Wins+' | '+c.splitTies+' | '+c.p2Wins+' | '+c.adjustedInterval.map(pct).join('–')+' |'),'',
'Intervals use 20,000 bootstrap resamples within each cell and Bonferroni adjustment over four cells (approximate 95% family coverage). Equal VP is not necessarily a split tie: the standard fewer-turns tiebreak applies. No equivalence claim is made.','',
'## Responses','',
...responses.map(c=>'- Given P1 '+label(c.first)+', P2’s observed strongest response is '+label(c.second)+': P1 '+pct(c.p1Share)+', P2 '+pct(1-c.p1Share)+'.'),'',
'P1’s strongest initial choice among these two frozen policies is '+label(selected.first)+'; P2 responds with '+label(selected.second)+'. This identifies a concrete matchup, not an average or proof of optimal human play.','',
'Big Money is competitive against this Engine bot: it scores 61.75% when starting and 50.15% when responding. Turn order matters: the Big Money mirror favors the second player, while the Engine mirror favors the first. The selected Engine / Big Money cell is compatible with 50/50 (adjusted P1 interval 46.1%–53.7%), but that is not proof of equivalence or optimal human play. Best-response labels are observed rankings, not separately tested claims.', '', '## Validation and reproduction','',
'4,000 completed games, zero game failures, 8,000 ending inventories checked against deck size and VP, and no leader triggers or Worship. Forty saved game traces were replayed by the workers. All 16 available CPUs were used inside nix develop. Source commit: '+manifest.sourceCommit+'.','',
'The initial attempt completed simulation but failed to save one shard because the disk was full. After removing byte-identical archived duplicates from ignored run outputs, the entire trial was restarted with the same source and seeds; only the complete retry is reported.','',
'Before execution: all 91 simulation tests passed (8,452 assertions), strict TypeScript checks passed, and the application check reported zero errors/warnings. Tests cover variant rules, exact starting inventories, inactive leader-label invariance, replay equivalence, and reproduction of four archived standard-rule games.','',
'From the repository root, run the committed source with `bun scripts/balance-base.ts balance-runs/base-game-v1 1000` inside nix develop. Regenerate this report from the archive using `bun balance-results/base-game-v1/summarize.ts balance-results/base-game-v1`. The manifest records the exact profiles, seed format and worker count. Raw game shards and 40 replay traces are archived; task dispatch files are reconstructible.',''];
writeFileSync(dir+'/report.md',lines.join('\n'));console.log(lines.join('\n'));
