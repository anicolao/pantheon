/** Research-only combination of two frozen public-information actors. */
export type EnsembleRule={weight:number;normalize:boolean};
export function ensembleAction(a:ArrayLike<number>,b:ArrayLike<number>,mask:readonly boolean[],rule:EnsembleRule){
 if(a.length!==b.length||a.length!==mask.length||!Number.isFinite(rule.weight)||rule.weight<0||rule.weight>1)throw Error('Invalid ensemble dimensions/weight');
 const legal=mask.flatMap((yes,i)=>yes?[i]:[]);if(!legal.length)throw Error('No legal ensemble action');
 for(let i=0;i<a.length;i++)if(!Number.isFinite(a[i])||!Number.isFinite(b[i]))throw Error('Nonfinite ensemble logits');
 function scale(x:ArrayLike<number>){
  if(!rule.normalize)return {mean:0,sd:1};
  const mean=legal.reduce((s,i)=>s+x[i],0)/legal.length;
  const sd=Math.sqrt(legal.reduce((s,i)=>s+(x[i]-mean)**2,0)/legal.length);
  return {mean,sd:sd||1};
 }
 const sa=scale(a),sb=scale(b);let best=-1,value=-Infinity;
 for(const i of legal){const v=(1-rule.weight)*(a[i]-sa.mean)/sa.sd+rule.weight*(b[i]-sb.mean)/sb.sd;if(v>value){best=i;value=v;}}
 return best;
}
