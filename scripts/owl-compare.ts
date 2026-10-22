import {readFileSync,writeFileSync} from 'node:fs';
import {createPrng} from '../src/lib/game/random';
const directory=process.argv[2]??'balance-results/owl-v1';
const summary=JSON.parse(readFileSync(`${directory}/summary.json`,'utf8'));
type Row={seed:string;mmFirst:boolean;result:string};
function bootstrap(groups:number[][],key:string){
 const rng=createPrng('owl-comparison:'+key),n=groups.flat().length,samples:number[]=[];
 for(let i=0;i<10000;i++){let sum=0;for(const g of groups)for(let j=0;j<g.length;j++)sum+=g[Math.floor(rng()*g.length)];samples.push(sum/n);}
 samples.sort((a,b)=>a-b);return [samples[249],samples[9749]];
}
const comparisons=['money','classic-engine'].map(candidate=>{
 const groups:number[][]=[];
 const cells=summary.filter((s:any)=>s.candidate==='owl').map((s:any)=>{
  const key=`${s.kind}-${s.leader}`;
  const a:Row[]=JSON.parse(readFileSync(`${directory}/${candidate}-${key}.json`,'utf8')),b:Row[]=JSON.parse(readFileSync(`${directory}/owl-${key}.json`,'utf8'));
  if(a.length!==b.length||a.some((r,i)=>r.seed!==b[i].seed||r.mmFirst!==b[i].mmFirst))throw Error('Unpaired samples');
  const delta=b.map((r,i)=>Number(r.result==='win')-Number(a[i].result==='win'));groups.push(delta);
  return {kind:s.kind,leader:s.leader,games:b.length,baselineWins:a.filter(r=>r.result==='win').length,owlWins:b.filter(r=>r.result==='win').length,winRateChange:delta.reduce((a,b)=>a+b,0)/delta.length,pairedChangeCI95:bootstrap([delta],candidate+key)};
 });
 return {baseline:candidate,cells,overall:{games:groups.flat().length,winRateChange:groups.flat().reduce((a,b)=>a+b,0)/groups.flat().length,pairedChangeCI95:bootstrap(groups,candidate)}};
});
const totals=['owl','money','classic-engine'].map(candidate=>{
 const rows=summary.filter((s:any)=>s.candidate===candidate);
 return {candidate,...Object.fromEntries(['games','wins','ties','losses','thirtyBy13','gamesWithCombo','comboTurns','fullDeckTurns'].map(key=>[key,rows.reduce((n:number,r:any)=>n+r[key],0)]))};
});
const result={method:'100 games per opponent setup, half in each seat. Same seeds and seats across candidates. Outright wins; ties not wins. 10,000 deterministic paired bootstrap samples, stratified by matchup for pooled intervals. Marginal 95% percentile intervals, not family adjusted.',comboMetric:'Favored Athena worship followed by an Acropolis purchase in the same turn. Other order not counted.',fullDeckMetric:'Turns with empty draw and discard piles at a decision boundary.',totals,comparisons};
writeFileSync(`${directory}/comparison.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
