import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {definition} from '../src/lib/game/actions';
import {type Pair} from './balance/evidence';
import {parallelBootstrap} from './balance/bootstrap';
const familyMultiplier=Number(process.argv[3]??1);
const dir=process.argv[2],m=JSON.parse(readFileSync(dir+'/manifest.json','utf8'));
const replicates=m.stage.startsWith('validation')?100_000:20_000;
if(m.status!=='completed')throw Error('Incomplete run');
const rows:any[]=Array.from({length:m.shards??m.workers},(_,i)=>gunzipSync(readFileSync(dir+'/games-'+i+'.jsonl.gz')).toString().trim().split('\n').filter(Boolean).map(s=>JSON.parse(s))).flat();
const grouped=new Map<string,any[]>();
for(const r of rows){
 if(r.result.status!=='completed'||r.result.seed!==m.seed+':'+r.result.block)throw Error('Bad result/seed');
 if(JSON.stringify(r.result.profiles)!==JSON.stringify([m.profiles[r.first],m.profiles[r.second]]))throw Error('Profile mismatch');
 for(const p of r.result.players){
  if(p.telemetry.leaderTriggers||Object.keys(p.telemetry.worship).length||!r.result.profiles[p.position].thinning&&Object.keys(p.telemetry.trashes).length)throw Error('Forbidden effect');
  const owned:Record<string,number>={obol:6,hamlet:3,'temple-of-athena':1};
  for(const[id,n]of Object.entries(p.telemetry.acquisitions))owned[id]=(owned[id]??0)+(n as number);
  for(const[id,n]of Object.entries(p.telemetry.trashes))owned[id]=(owned[id]??0)-(n as number);
  if(Object.values(owned).some(n=>n<0)||Object.values(owned).reduce((a,b)=>a+b,0)!==p.telemetry.finalDeckSize||Object.entries(owned).reduce((s,[id,n])=>s+n*(definition(id).vp??0),0)!==p.score)throw Error('Inventory mismatch');
 }
 const key=r.first+'|'+r.second,b=grouped.get(key)??[];b.push(r);grouped.set(key,b);
}
const player=(r:any,p:number)=>r.result.players.find((x:any)=>x.position===p);
const avg=(xs:number[])=>xs.reduce((a,b)=>a+b,0)/xs.length;
const cells=[...grouped].map(([key,rs])=>{
 rs.sort((a,b)=>a.result.block-b.result.block);
 if(rs.length!==m.blocks||rs.some((r,i)=>r.result.block!==i))throw Error('Incomplete/duplicate cell');
 const diagnostics=(pos:number)=>{const ps=rs.map(r=>player(r,pos)),acquisitions:Record<string,number>={};
  for(const p of ps)for(const[id,n]of Object.entries(p.telemetry.acquisitions))acquisitions[id]=(acquisitions[id]??0)+(n as number)/ps.length;
  return {vp:avg(ps.map(p=>p.score)),turns:avg(ps.map(p=>p.turns)),firstPoints:avg(ps.filter(p=>p.telemetry.firstScoreTurn!==null).map(p=>p.telemetry.firstScoreTurn)),acquisitions};};
 return {first:rs[0].first,second:rs[0].second,n:rs.length,share:avg(rs.map(r=>player(r,0).share)),wins:rs.filter(r=>player(r,0).share===1).length,ties:rs.filter(r=>player(r,0).share===0.5).length,p1:diagnostics(0),p2:diagnostics(1)};
});
if(rows.length!==m.plannedGames||cells.length!==m.cells.length)throw Error('Wrong count');
const comparisons:any[]=[];
for(const candidate of Object.keys(m.profiles).filter(k=>!/@(historical|overlay)$/.test(k))){
 const base=candidate.split('@')[0],policy=candidate.split('@')[1];
 for(const baseline of [base+'@historical',base+'@overlay'])for(const opponent of Object.keys(m.profiles))for(const seat of [0,1]){
  const a=grouped.get(seat?opponent+'|'+candidate:candidate+'|'+opponent),b=grouped.get(seat?opponent+'|'+baseline:baseline+'|'+opponent);
  if(!a||!b)continue;
  if(m.focusedComparisons&&!m.focusedComparisons.some((c:any)=>c.candidate===candidate&&c.baseline===baseline&&c.opponent===opponent&&c.seat===seat))continue;
  const primary=baseline.endsWith(base.startsWith('treasure')?'@overlay':'@historical');
  const pairs:Pair[]=a.map((r,i)=>({baselineId:candidate,treatmentId:baseline,block:r.result.block,count:2,target:opponent,focalFamily:m.profiles[candidate].family,opponentFamily:m.profiles[opponent].family,leader:'none',baselineShare:player(r,seat).share,treatmentShare:player(b[i],seat).share,exposure:1}));
  comparisons.push({candidate,baseline,opponent,seat,primary,pairs});
 }
}
const counts=Object.fromEntries(m.selected.map((p:string)=>[p,comparisons.filter(c=>c.primary&&c.candidate.endsWith('@'+p)).length]));
const results=await parallelBootstrap(comparisons.map(c=>({pairs:c.pairs,tests:counts[c.candidate.split('@')[1]]*(m.stage.startsWith('validation')?m.selected.length:1)*familyMultiplier,replicates})));
const estimates=comparisons.map(({pairs,...c},index)=>({...c,...results[index]}));
const matrixJobs:any[]=m.selected.flatMap((policy:string)=>{
 const keys=Object.keys(m.profiles).filter(k=>k.endsWith('@'+policy));
 if(keys.some(a=>keys.some(b=>!grouped.has(a+'|'+b))))return [];
 return keys.flatMap(first=>keys.map(second=>({policy,first,second,pairs:grouped.get(first+'|'+second)!.map(r=>({baselineId:first,treatmentId:second,block:r.result.block,count:2,target:first+'|'+second,focalFamily:m.profiles[first].family,opponentFamily:m.profiles[second].family,leader:'none',baselineShare:player(r,0).share,treatmentShare:0.5,exposure:1}))})));
});
const matrixEstimates=await parallelBootstrap(matrixJobs.map(j=>({pairs:j.pairs,tests:matrixJobs.length,replicates})));
const matrices=Object.fromEntries(m.selected.map((policy:string)=>{
 const ks=Object.keys(m.profiles).filter(k=>k.endsWith('@'+policy));
 const cs=matrixJobs.flatMap((j,index)=>j.policy===policy?[{...cells.find(c=>c.first===j.first&&c.second===j.second)!,interval:matrixEstimates[index].interval!.map(v=>v+0.5),adjustedInterval:matrixEstimates[index].correctedInterval!.map(v=>v+0.5)}]:[]);
 if(cs.length!==ks.length**2)return [];
 const responses=ks.map(first=>cs.filter(c=>c.first===first).sort((a,b)=>a.share-b.share)[0]);
 return [policy,{keys:ks,cells:cs,responses,selected:[...responses].sort((a,b)=>b.share-a.share)[0]}];
}).filter((row:any[])=>row.length));
for(const[n,v]of Object.entries({cells,comparisons:estimates,matrices,analysis:{familyMultiplier,replicates,primaryComparisonCounts:counts}}))writeFileSync(dir+'/'+n+'.json',JSON.stringify(v,null,2)+'\n');
const pct=(n:number)=>(100*n).toFixed(2);
const lines=['# Shared endgame policy trial: '+m.stage,'','Analysis uses '+replicates+' resamples and a further family multiplier of '+familyMultiplier+'. A multiplier of two reserves half the error budget for this stage.','',m.games+' games, '+m.blocks+' common seeds per ordered cell, '+m.workers+' workers. No pooling. Primary comparator: Money with the old two-turn overlay; Engine with historical scoring. Other controls are supplementary. Each policy has '+Object.values(counts).join('/')+' separate primary comparisons. Paired bootstrap intervals adjust within each policy for exploratory screens, and across all selected policies for validation stages. Positive changes favor the candidate.','','| Candidate | Baseline | Fixed opponent | Seat | Change pp | Adjusted interval pp |','| --- | --- | --- | ---: | ---: | --- |',...estimates.filter(c=>c.primary).map(c=>'| '+c.candidate+' | '+c.baseline+' | '+c.opponent+' | '+(c.seat+1)+' | '+pct(c.difference)+' | '+c.correctedInterval.map(pct).join(' to ')+' |'),''];
writeFileSync(dir+'/report.md',lines.join('\n'));
for(const policy of m.selected){
 const cs=estimates.filter(c=>c.primary&&c.candidate.endsWith('@'+policy)),worst=[...cs].sort((a,b)=>a.difference-b.difference)[0];
 console.log(JSON.stringify({policy,comparisons:cs.length,negative:cs.filter(c=>c.difference<0).length,worst:{candidate:worst.candidate,opponent:worst.opponent,seat:worst.seat,difference:worst.difference,interval:worst.correctedInterval},regressions:cs.filter(c=>c.difference<=-0.05).map(c=>({candidate:c.candidate,opponent:c.opponent,seat:c.seat,difference:c.difference}))}));
}
