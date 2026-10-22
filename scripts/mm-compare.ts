import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createPrng} from '../src/lib/game/random';
const before=process.argv[2]??'balance-results/mm-v2',after=process.argv[3]??'balance-results/mm-v3';
const fallback=process.argv[4];
const summary=JSON.parse(readFileSync(`${after}/summary.json`,'utf8'));
type Row={seed:string;mmFirst:boolean;result:string;mmVP:number;turns:number;thirtyVP:number|null};
const groups:number[][]=[];
function interval(groups:number[][],label:string){
 const rng=createPrng('mm-paired-comparison:'+label),samples:number[]=[];
 const n=groups.reduce((n,g)=>n+g.length,0);
 for(let i=0;i<10000;i++){let sum=0;for(const g of groups)for(let j=0;j<g.length;j++)sum+=g[Math.floor(rng()*g.length)];samples.push(sum/n);}
 samples.sort((a,b)=>a-b);return [samples[249],samples[9749]];
}
const cells=summary.map((cell:any)=>{
 const key=`${cell.kind}-${cell.leader}`;
 const baseline=existsSync(`${before}/${key}.json`)?before:fallback;
 if(!baseline)throw Error('Missing baseline: '+key);
 const a:Row[]=JSON.parse(readFileSync(`${baseline}/${key}.json`,'utf8')),b:Row[]=JSON.parse(readFileSync(`${after}/${key}.json`,'utf8'));
 if(a.length!==b.length||a.some((r,i)=>r.seed!==b[i].seed||r.mmFirst!==b[i].mmFirst))throw Error('Unpaired samples: '+key);
 const delta=b.map((r,i)=>Number(r.result==='win')-Number(a[i].result==='win'));groups.push(delta);
 const wins=(rows:Row[])=>rows.filter(r=>r.result==='win').length;
 return {baseline,kind:cell.kind,leader:cell.leader,games:b.length,beforeWins:wins(a),afterWins:wins(b),afterTies:cell.ties,afterLosses:cell.losses,
 winRateChange:(wins(b)-wins(a))/b.length,pairedChangeCI95:interval([delta],key),newWins:delta.filter(d=>d===1).length,lostWins:delta.filter(d=>d===-1).length,
 beforeThirtyBy13:a.filter(r=>r.thirtyVP!==null&&r.thirtyVP<=13).length,afterThirtyBy13:cell.thirtyBy13,
 meanVPChange:b.reduce((n,r,i)=>n+r.mmVP-a[i].mmVP,0)/b.length,meanTurnsChange:b.reduce((n,r,i)=>n+r.turns-a[i].turns,0)/b.length};
});
const total={games:groups.flat().length,beforeWins:cells.reduce((n:number,r:any)=>n+r.beforeWins,0),afterWins:cells.reduce((n:number,r:any)=>n+r.afterWins,0),winRateChange:groups.flat().reduce((a,b)=>a+b,0)/groups.flat().length,pairedChangeCI95:interval(groups,'pooled')};
const result={before,after,method:'Same seeds and seats; outright wins, ties not wins. 10,000 deterministic paired bootstrap samples; pooled interval stratified by matchup. Marginal 95% percentile intervals, not adjusted for multiple comparisons. Reused evaluation seeds: exploratory comparison, not a fresh holdout.',cells,total};
writeFileSync(`${after}/comparison.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
