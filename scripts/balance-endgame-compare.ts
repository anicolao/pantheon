import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {pairedEstimate,type Pair} from './balance/evidence';
import {baseLabel} from './balance/base-profiles';
const dir=process.argv[2],m=JSON.parse(readFileSync(dir+'/manifest.json','utf8'));
const rows=Array.from({length:m.workers},(_,i)=>gunzipSync(readFileSync(dir+'/games-'+i+'.jsonl.gz')).toString().trim().split('\n').map(s=>JSON.parse(s))).flat();
const keys=Object.keys(m.profiles),share=(r:any)=>r.result.players.find((p:any)=>p.position===0).share;
const deltas=[];
for(const off of keys.filter(k=>!k.endsWith('-endgame')))for(const opponent of keys){
 const on=off+'-endgame',a=rows.filter(r=>r.first===on&&r.second===opponent).sort((a,b)=>a.result.block-b.result.block),b=rows.filter(r=>r.first===off&&r.second===opponent).sort((a,b)=>a.result.block-b.result.block);
 if(a.length!==m.blocks||b.length!==m.blocks)throw Error('Missing cell');
 const pairs:Pair[]=a.map((r,i)=>{if(r.result.block!==b[i].result.block)throw Error('Unpaired seed');return {baselineId:on,treatmentId:off,block:r.result.block,count:2,target:opponent,focalFamily:m.profiles[on].family,opponentFamily:m.profiles[opponent].family,leader:'none',baselineShare:share(r),treatmentShare:share(b[i]),exposure:1};});
 deltas.push({off,on,opponent,...pairedEstimate(pairs,8,false)});
}
writeFileSync(dir+'/paired.json',JSON.stringify(deltas,null,2)+'\n');
const pct=(n:number)=>(n*100).toFixed(2);
const lines=['# End Game on minus off, fixed P2 opponent','','Eight separate paired comparisons; same seed and seats, only P1 End Game changes. No pooling. Exploratory screening; 20,000 seed bootstrap resamples, Bonferroni adjustment over eight comparisons. Positive values favor End Game.','','| P1 without End Game | P2 | Change (pp) | Adjusted interval (pp) |','| --- | --- | ---: | --- |',...deltas.map(d=>'| '+baseLabel(d.off)+' | '+baseLabel(d.opponent)+' | '+pct(d.difference!)+' | '+d.correctedInterval!.map(pct).join(' to ')+' |'),''];
writeFileSync(dir+'/paired.md',lines.join('\n'));console.log(lines.join('\n'));
