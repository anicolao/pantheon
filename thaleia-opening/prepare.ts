import {setupExperiment} from '../balance-checkpoint/equal-turns/source/scripts/balance/experiment';
import {definition} from '../balance-checkpoint/equal-turns/source/src/lib/game/actions';
import {writeFileSync} from 'node:fs';
const {game}=setupExperiment('candidate-enumeration',['thaleia','nereon'],'standard');
const legal=(budget:number)=>([null,...Object.keys(game.supply).filter(id=>game.supply[id]>0&&definition(id).cost!==null&&definition(id).cost!<=budget)]);
const candidates:any[]=[];
for(const [split,a,b]of [['5/1',5,1],['4/2',4,2],['3/3',3,3]] as const)for(const first of legal(a))for(const second of legal(b))candidates.push({id:'candidate-'+candidates.length,split,cards:[first,second]});
function seeds(start:number,n:number){
 const result:Record<string,number[]>={'5/1':[],'4/2':[],'3/3':[]};
 for(let seed=start;Object.values(result).some(x=>x.length<n);seed++){
  const {game}=setupExperiment('leader-matrix-v1:'+seed,['thaleia','nereon'],'standard');
  const coins=game.decks[game.turnOrder[0]].hand.filter(c=>c.cardId==='obol').length;
  const high=Math.max(coins,6-coins),split=high===5?'5/1':high===4?'4/2':'3/3';
  // Balance high-first/low-first within the asymmetric opening splits.
  const bucket=result[split];
  if(bucket.length>=n)continue;
  if(split!=='3/3'){
   let matching=0;
   for(const old of bucket){const {game:g}=setupExperiment('leader-matrix-v1:'+old,['thaleia','nereon'],'standard');matching+=Number((g.decks[g.turnOrder[0]].hand.filter(c=>c.cardId==='obol').length===high)===(coins===high));}
   if(matching>=n/2)continue;
  }
  bucket.push(seed);
 }
 return result;
}
writeFileSync(import.meta.dir+'/plan.json',JSON.stringify({candidates,screen:seeds(250000,4),refine:seeds(260000,20),validation:{start:240000,count:100},opponents:['nereon','melia','doreios'],selection:'maximize worst opponent win share; break ties by total share, then candidate index'},null,2));
console.log('Prepared',candidates.length,'candidates');
