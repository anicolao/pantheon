import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {pairedEstimate,type Pair} from './balance/evidence';
import {baseLabel} from './balance/base-profiles';
import {definition} from '../src/lib/game/actions';
import type {StudyResult} from './balance/experiment';
import type {Profile} from './balance/strategy';
const dir=process.argv[2];if(!dir)throw Error('Supply run directory');
const manifest=JSON.parse(readFileSync(dir+'/manifest.json','utf8'));
function check(ok:unknown,message:string):asserts ok{if(!ok)throw Error(message);}
check(manifest.status==='completed'&&['thinning','race','endgame'].includes(manifest.mode),'Wrong/incomplete trial');
const racing=manifest.mode==='race',study=manifest.mode==='endgame'?'base-endgame-v1':racing?'base-race-v1':'base-thinning-v1';
const profiles:Record<string,Profile>=manifest.profiles,keys=Object.keys(profiles),tests=keys.length**2;
type Row={first:string;second:string;result:StudyResult};
const rows:Row[]=Array.from({length:manifest.workers},(_,i)=>gunzipSync(readFileSync(dir+'/games-'+i+'.jsonl.gz')).toString().trim().split('\n').map(s=>JSON.parse(s))).flat();
check(rows.length===manifest.blocks*tests,'Wrong game count');
check(new Set(rows.map(r=>r.first+'/'+r.second+'/'+r.result.block)).size===rows.length,'Duplicate games');
const player=(r:Row,p:number)=>r.result.players.find(x=>x.position===p)!;
for(const r of rows){
 check(r.result.status==='completed'&&r.result.variant==='base-game','Bad result');
 check(r.result.seed===manifest.seed+':'+r.result.block,'Seed mismatch');
 check(player(r,0).family===profiles[r.first].family&&player(r,1).family===profiles[r.second].family,'Position mismatch');
 check(player(r,0).share!+player(r,1).share! ===1,'Shares mismatch');
 check(JSON.stringify(r.result.profiles)===JSON.stringify([profiles[r.first],profiles[r.second]]),'Profile mismatch');
 for(const p of r.result.players){
  check(p.telemetry.leaderTriggers===0&&Object.keys(p.telemetry.worship).length===0,'Powers used');
  if(!r.result.profiles[p.position].thinning)check(Object.keys(p.telemetry.trashes).length===0,'Disabled thinning used');
  const owned:Record<string,number>={obol:6,hamlet:3,'temple-of-athena':1};
  for(const [id,n]of Object.entries(p.telemetry.acquisitions))owned[id]=(owned[id]??0)+n;
  for(const [id,n]of Object.entries(p.telemetry.trashes))owned[id]=(owned[id]??0)-n;
  check(Object.values(owned).every(n=>n>=0),'Negative inventory');
  check(Object.values(owned).reduce((a,b)=>a+b,0)===p.telemetry.finalDeckSize,'Deck size mismatch');
  check(Object.entries(owned).reduce((sum,[id,n])=>sum+n*(definition(id).vp??0),0)===p.score,'VP mismatch');
 }
}
const mean=(v:number[])=>v.reduce((a,b)=>a+b,0)/v.length;
const cells=keys.flatMap(first=>keys.map(second=>{
 const games=rows.filter(r=>r.first===first&&r.second===second).sort((a,b)=>a.result.block-b.result.block);
 check(games.length===manifest.blocks&&games.every((r,i)=>r.result.block===i),'Incomplete cell');
 const pairs:Pair[]=games.map(r=>({baselineId:first+'/'+second+'/'+r.result.block,treatmentId:'half',block:r.result.block,count:2,target:first+'/'+second,focalFamily:profiles[first].family,opponentFamily:profiles[second].family,leader:'none',baselineShare:player(r,0).share,treatmentShare:0.5,exposure:1}));
 const estimate=pairedEstimate(pairs,tests,false);
 const diagnostics=(position:number)=>{
  const ps=games.map(r=>player(r,position)),acquisitions:Record<string,number>={},trashes:Record<string,number>={},ending:Record<string,number>={obol:6,hamlet:3,'temple-of-athena':1};
  for(const p of ps){
   for(const[id,n]of Object.entries(p.telemetry.acquisitions)){acquisitions[id]=(acquisitions[id]??0)+n/ps.length;ending[id]=(ending[id]??0)+n/ps.length;}
   for(const[id,n]of Object.entries(p.telemetry.trashes)){trashes[id]=(trashes[id]??0)+n/ps.length;ending[id]=(ending[id]??0)-n/ps.length;}
  }
  return {meanVP:mean(ps.map(p=>p.score)),meanTurns:mean(ps.map(p=>p.turns)),meanFirstPoints:mean(ps.flatMap(p=>p.telemetry.firstScoreTurn===null?[]:[p.telemetry.firstScoreTurn])),noPoints:ps.filter(p=>p.telemetry.firstScoreTurn===null).length,meanDeckSize:mean(ps.map(p=>p.telemetry.finalDeckSize)),meanTrashed:mean(ps.map(p=>Object.values(p.telemetry.trashes).reduce((a,b)=>a+b,0))),meanFullDeckDraws:mean(ps.map(p=>p.telemetry.fullDeckDraws)),meanActionPhases:mean(ps.map(p=>p.telemetry.actionPhases)),meanAcquisitions:acquisitions,meanTrashes:trashes,meanEndingDeck:ending};
 };
 return {first,second,games:games.length,p1Share:mean(games.map(r=>player(r,0).share!)),p1Wins:games.filter(r=>player(r,0).share===1).length,splitTies:games.filter(r=>player(r,0).share===0.5).length,p2Wins:games.filter(r=>player(r,0).share===0).length,interval:estimate.interval!.map(v=>v+0.5),adjustedInterval:estimate.correctedInterval!.map(v=>v+0.5),p1:diagnostics(0),p2:diagnostics(1)};
}));
const responses=keys.map(first=>cells.filter(c=>c.first===first).sort((a,b)=>a.p1Share-b.p1Share)[0]);
const selected=[...responses].sort((a,b)=>b.p1Share-a.p1Share)[0];
const coBestResponses=Object.fromEntries(responses.map(c=>[c.first,cells.filter(x=>x.first===c.first&&x.p1Share===c.p1Share).map(x=>x.second)]));
const coBestInitialChoices=responses.filter(c=>c.p1Share===selected.p1Share).map(c=>c.first);
for(const[name,value]of Object.entries({cells,responses:{rows:responses,selected,coBestResponses,coBestInitialChoices}}))writeFileSync(dir+'/'+name+'.json',JSON.stringify(value,null,2)+'\n');
const pct=(v:number)=>(v*100).toFixed(2)+'%',num=(v:number)=>v.toFixed(2);
const lines=[manifest.mode==='endgame'?'# Base game: Big Money × Thin × End Game screening':racing?'# Base game: orthogonal thinning and Race matrix':'# Base game: orthogonal thinning matrix','',
'No leader powers or Worship; identical starting decks of six Obols, three Hamlets and one inert Temple. Standard supply, ordinary Action effects and ending/tiebreak rules remain. All profiles use the same frozen default parameters, without retuning. Big Money retains the $0.035 near-tie preference and corrected scoring.','',
'Thinning is an independent boolean on the parent strategy. Big Money + Thin evaluates expected income per initial draw (with legal Action play); Engine + Thin evaluates executable whole-deck coverage, stranded draw and opening reliability. Both account for remaining time, lost VP/current-turn income, tool capacity and known endings. Engine preserves existing cycle payload up to $8. Tool purchases include their deck/Action cost and a delayed, diminishing estimate of useful removals. These are public-information heuristics, not optimal multi-turn search.','',
...(manifest.mode==='endgame'?['End Game replaces aggressive Race: when the uncapped public horizon is at most two turns, prioritize affordable positive VP, including Polis and Hamlet. Before that, retain normal parent behavior (including immediate affordable Acropolis). No artificial horizon cap. Safe endings and ordinary gains share the rule; thinning upgrades keep joint parent-objective evaluation and charge lost current scoring opportunities. This is a screening trial, not confirmation.','']:[]),
...(racing?['Race is a second independent boolean: buy affordable points worth at least half the top printed VP tier, admit cheaper points only at an imminent ending (H≤1), and cap investment time at three turns (or the preset scoring threshold, if smaller). Safe scoring baskets and ordinary gains share this policy; upgrades retain their parent-specific joint thinning objective with the shorter horizon. No-Race profiles retain v9 behavior. Race is a fixed heuristic, not a searched optimal stopping policy.','']:[]),
'The explicit off profiles decline optional trashing and receive no thinning investment bonus. This is a new controlled comparison: the earlier 2×2 Engine profile already included legacy thinning heuristics. Omitted thinning settings still reproduce historical profiles.','',
'Player 1 acts first. Each cell contains '+manifest.blocks+' fresh seeded games, with the same seeds reused across all cells. Entries are P1 victory shares, splitting ties. No strategies, presets or turn orders are pooled.','',
'| P1 strategy ↓ / P2 strategy → | '+keys.map(baseLabel).join(' | ')+' |',
'| --- | '+keys.map(()=> '---:').join(' | ')+' |',
...keys.map(first=>'| '+baseLabel(first)+' | '+keys.map(second=>pct(cells.find(c=>c.first===first&&c.second===second)!.p1Share)).join(' | ')+' |'),'',
'## Observed responses','',
...responses.map(c=>'- Given P1 '+baseLabel(c.first)+', P2’s strongest observed response is '+coBestResponses[c.first].map(baseLabel).join(' or ')+': P1 '+pct(c.p1Share)+', P2 '+pct(1-c.p1Share)+'.'),'',
'P1’s strongest observed initial choice is '+coBestInitialChoices.map(baseLabel).join(' or ')+'; P2 responds with '+baseLabel(selected.second)+'. The selected P1 share is '+pct(selected.p1Share)+' (family-adjusted interval '+selected.adjustedInterval.map(pct).join('–')+'). This is a concrete selected cell, not a strategy average. Best-response rankings are descriptive; no optimal-human-play or equivalence claim follows.','',
'## Counts and uncertainty','',
'| P1 / P2 | P1 wins | Split ties | P2 wins | Family-adjusted interval for P1 |','| --- | ---: | ---: | ---: | --- |',
...cells.map(c=>'| '+baseLabel(c.first)+' / '+baseLabel(c.second)+' | '+c.p1Wins+' | '+c.splitTies+' | '+c.p2Wins+' | '+c.adjustedInterval.map(pct).join('–')+' |'),'',
'Intervals bootstrap seed blocks within each cell with 20,000 resamples and Bonferroni adjustment over all '+tests+' cells (approximate 95% family coverage). Equal VP need not be a split tie because the standard fewer-turns tiebreak applies. No failures are scored as losses.','',
'## Per-cell mechanism diagnostics','',
'Each pair below is P1 / P2; these are within-cell means only. First points turn excludes games with no point acquisition; those counts are in cells.json. Full-deck draws count Action phases ending with no unseen cards. Exact card acquisitions, trashes and ending compositions are in cells.json.','',
'| P1 / P2 | Final VP | Turns | First points turn | Final deck size | Cards trashed | Full-deck draws |','| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
...cells.map(c=>'| '+baseLabel(c.first)+' / '+baseLabel(c.second)+' | '+(['meanVP','meanTurns','meanFirstPoints','meanDeckSize','meanTrashed','meanFullDeckDraws'] as const).map(k=>num(c.p1[k])+' / '+num(c.p2[k])).join(' | ')+' |'),'',
'## Reproduction and validation','',
manifest.games+' completed games, zero failures; every ending inventory checked against final size and VP. No leader/Worship effects and no optional trashing by off profiles. Workers replayed '+manifest.replays+' saved traces. '+manifest.workers+' CPUs used inside nix develop. Source commit: '+manifest.sourceCommit+'.','',
'Run from a clean committed tree inside nix develop: `bun scripts/balance-base.ts balance-runs/'+study+' '+manifest.blocks+' '+manifest.mode+'`. Regenerate this report with `bun scripts/balance-base-report.ts balance-results/'+study+'`. The manifest records full profiles, seed namespace and worker count. The archived shards and replays preserve every result; task dispatch files are reconstructible.',''];
writeFileSync(dir+'/report.md',lines.join('\n'));console.log(lines.join('\n'));
