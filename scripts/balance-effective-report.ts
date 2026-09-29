import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {definition} from '../src/lib/game/actions';
import {parallelBootstrap} from './balance/bootstrap';
import type {Pair} from './balance/evidence';
const dir=process.argv[2],m=JSON.parse(readFileSync(dir+'/manifest.json','utf8'));
if(m.status!=='completed')throw Error('Incomplete study');
const rows:any[]=Array.from({length:m.shards},(_,i)=>gunzipSync(readFileSync(dir+'/games-'+i+'.jsonl.gz')).toString().trim().split('\n').filter(Boolean).map(s=>JSON.parse(s))).flat();
const groups=new Map<string,any[]>(),player=(r:any,p:number)=>r.result.players.find((x:any)=>x.position===p);
for(const r of rows){
 if(r.result.status!=='completed'||r.result.seed!==m.seed+':'+r.result.block||JSON.stringify(r.result.profiles)!==JSON.stringify([m.profiles[r.first],m.profiles[r.second]]))throw Error('Result mismatch');
 for(const p of r.result.players){
  if(p.telemetry.leaderTriggers||Object.keys(p.telemetry.worship).length||!r.result.profiles[p.position].thinning&&Object.keys(p.telemetry.trashes).length)throw Error('Forbidden effect');
  const owned:Record<string,number>={obol:6,hamlet:3,'temple-of-athena':1};
  for(const[id,n]of Object.entries(p.telemetry.acquisitions))owned[id]=(owned[id]??0)+Number(n);
  for(const[id,n]of Object.entries(p.telemetry.trashes))owned[id]=(owned[id]??0)-Number(n);
  if(Object.values(owned).some(n=>n<0)||Object.values(owned).reduce((s,n)=>s+n,0)!==p.telemetry.finalDeckSize||Object.entries(owned).reduce((s,[id,n])=>s+n*(definition(id).vp??0),0)!==p.score)throw Error('Inventory mismatch');
 }
 const key=r.first+'|'+r.second,b=groups.get(key)??[];b.push(r);groups.set(key,b);
}
if(rows.length!==m.plannedGames||groups.size!==m.cells.length)throw Error('Incomplete cells');
const mean=(a:number[])=>a.reduce((s,n)=>s+n,0)/a.length;
const cells=[...groups].map(([key,rs])=>{
 rs.sort((a,b)=>a.result.block-b.result.block);
 if(rs.length!==m.blocks||rs.some((r,i)=>r.result.block!==i))throw Error('Duplicate/missing seed');
 const diagnostic=(seat:number)=>{
  const ps=rs.map(r=>player(r,seat)),turns=ps.reduce((s,p)=>s+p.turns,0),acquisitions:Record<string,number>={};
  for(const p of ps)for(const[id,n]of Object.entries(p.telemetry.acquisitions))acquisitions[id]=(acquisitions[id]??0)+Number(n)/ps.length;
  return {vp:mean(ps.map(p=>p.score)),turns:turns/ps.length,deckSize:mean(ps.map(p=>p.telemetry.finalDeckSize)),fullDeckDraws:ps.reduce((s,p)=>s+p.telemetry.fullDeckDraws,0),totalTurns:turns,fullDeckRate:ps.reduce((s,p)=>s+p.telemetry.fullDeckDraws,0)/turns,spareActionsWithUnseen:ps.reduce((s,p)=>s+p.telemetry.spareActionsWithUnseen,0)/turns,acquisitions};
 };
 return {first:rs[0].first,second:rs[0].second,n:rs.length,share:mean(rs.map(r=>player(r,0).share)),p1:diagnostic(0),p2:diagnostic(1)};
});
const keys=['treasure','treasure-thin','engine','engine-thin'],jobs:any[]=[];
function pairs(rs:any[],seat:number,other?:any[]):Pair[]{return rs.map((r,i)=>({baselineId:r.first,treatmentId:r.second,block:r.result.block,count:2,target:r.first+'|'+r.second,focalFamily:r.result.profiles[seat].family,opponentFamily:r.result.profiles[1-seat].family,leader:'none',baselineShare:player(r,seat).share,treatmentShare:other?player(other[i],seat).share:0.5,exposure:1}));}
for(const policy of m.selected)for(const key of keys)for(const seat of [0,1]){
 const first=key+(seat?'@old':'@'+policy),second=key+(seat?'@'+policy:'@old'),rs=groups.get(first+'|'+second)!;
 jobs.push({kind:'headToHead',policy,key,seat,share:mean(rs.map(r=>player(r,seat).share)),pairs:pairs(rs,seat),tests:8*m.selected.length});
 const old=groups.get(key+'@old|'+key+'@old')!;
 jobs.push({kind:'pairedChange',policy,key,seat,pairs:pairs(rs,seat,old),tests:8*m.selected.length});
}
for(const policy of m.selected)for(const first of keys)for(const second of keys)jobs.push({kind:'matrix',policy,first:first+'@'+policy,second:second+'@'+policy,pairs:pairs(groups.get(first+'@'+policy+'|'+second+'@'+policy)!,0),tests:16*m.selected.length});
const estimates=await parallelBootstrap(jobs.map(j=>({pairs:j.pairs,tests:j.tests,replicates:20_000})));
// A nonparametric bootstrap is degenerate after unanimous outcomes. Use the
// exact binomial boundary interval there instead of asserting zero uncertainty.
for(let i=0;i<jobs.length;i++){
 const j=jobs[i],xs=j.pairs.map((p:Pair)=>p.baselineShare);
 if(j.kind==='pairedChange'||!xs.every((x:number)=>x===xs[0])||![0,1].includes(xs[0]))continue;
 const bound=(tests:number)=>{const edge=Math.pow(0.05/(2*tests),1/xs.length);return (xs[0]===0?[0,1-edge]:[edge,1]).map(n=>n-0.5);};
 estimates[i].interval=bound(1) as [number,number];
 estimates[i].correctedInterval=bound(j.tests) as [number,number];
}
const results=jobs.map(({pairs,tests,...j},i)=>({...j,...estimates[i]}));
const matrix=results.filter(r=>r.kind==='matrix').map(r=>({policy:r.policy,...cells.find(c=>c.first===r.first&&c.second===r.second)!,interval:r.interval.map((n:number)=>n+0.5),adjustedInterval:r.correctedInterval.map((n:number)=>n+0.5)}));
for(const[name,value]of Object.entries({cells,comparisons:results.filter(r=>r.kind!=='matrix'),matrix}))writeFileSync(dir+'/'+name+'.json',JSON.stringify(value,null,2)+'\n');
const pct=(n:number)=>(100*n).toFixed(2),label=(s:string)=>s.split('@')[0].replace('treasure','Money').replace('engine','Engine').replace('-thin',' + Thin');
const lines=['# Effective sampling: '+m.stage,'',m.games+' games; '+m.blocks+' seeds per ordered cell; '+m.workers+' CPUs. No powers or Worship; frozen v14 controls. No pooling of policy, parent, Thin or seat.','',
'## Direct new versus old','',
'| Policy | Strategy | New seat | New share | Adjusted interval |','| --- | --- | ---: | ---: | --- |',
...results.filter(r=>r.kind==='headToHead').map(r=>'| '+r.policy+' | '+label(r.key)+' | '+(r.seat+1)+' | '+pct(r.share)+'% | '+r.correctedInterval.map((n:number)=>pct(n+0.5)+'%').join(' to ')+' |'),'',
'## Paired change against the same old opponent','',
'| Policy | Strategy | Seat | Change pp | Adjusted interval pp |','| --- | --- | ---: | ---: | --- |',
...results.filter(r=>r.kind==='pairedChange').map(r=>'| '+r.policy+' | '+label(r.key)+' | '+(r.seat+1)+' | '+pct(r.difference)+' | '+r.correctedInterval.map(pct).join(' to ')+' |'),''];
for(const policy of m.selected){
 lines.push('## '+policy+' new 4×4 (P1 shares)','',
 '| P1 / P2 | '+keys.map(label).join(' | ')+' |','| --- | '+keys.map(()=>'---:').join(' | ')+' |',
 ...keys.map(a=>'| '+label(a)+' | '+keys.map(b=>pct(matrix.find(c=>c.first===a+'@'+policy&&c.second===b+'@'+policy)!.share)+'%').join(' | ')+' |'),'',
 'Engine versus frozen old Money, with Engine win share by seat:','');
 for(const key of ['engine','engine-thin'])for(const seat of [0,1]){
  const c=cells.find(c=>c.first===(seat?'treasure@old':key+'@'+policy)&&c.second===(seat?key+'@'+policy:'treasure@old'))!;
  lines.push('- '+label(key)+' as P'+(seat+1)+': '+pct(seat?1-c.share:c.share)+'%.');
 }
 lines.push('');
}
lines.push('All ending inventories and seed schedules audited. Intervals use 20,000 paired seed bootstrap resamples, adjusted across selected policies within each comparison family. Unanimous rate outcomes use exact binomial boundary bounds. Screening rankings are provisional; fresh evaluation is required.');
writeFileSync(dir+'/report.md',lines.join('\n')+'\n');console.log(lines.join('\n'));
