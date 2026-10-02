import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {applyPlayCommand,definition} from '../../src/lib/game/actions';
import {ok} from 'node:assert';
const dir=import.meta.dir+'/games',proofs=[];
for(const file of readdirSync(dir).filter(x=>x.endsWith('.json')&&!x.endsWith('.replay.json'))){
 const result=JSON.parse(readFileSync(dir+'/'+file,'utf8'));
 if(result.status!=='censored')continue;
 const trace=JSON.parse(readFileSync(dir+'/'+file.replace('.json','.replay.json'),'utf8')),g=trace.initial;
 for(const [i,{uid,command}] of trace.commands.entries())applyPlayCommand(g,uid,command,i+1,'standard');
 const players=g.turnOrder.map((uid:string)=>{
  const owned:any[]=Object.values(g.decks[uid]).flat();
  ok(owned.length===1&&['seed-keeper','temple-of-ares','bronze-recruit'].includes(owned[0].cardId));
  const ceiling=owned[0].cardId==='bronze-recruit'?2:0;
  const cost=Math.min(...result.allowed.filter((id:string)=>g.supply[id]>0).map((id:string)=>definition(id).cost!),...g.sharedEvents.map((id:string)=>definition(id).cost!));
  ok(ceiling<cost,'Neither acquisition nor worship can be afforded even after playing the remaining card');
  return {leader:g.leaders[uid],remainingCard:owned[0].cardId,maximumCoins:ceiling,cheapestAvailablePurchaseOrWorship:cost};
 });
 ok(Object.values(g.turn.turns).every(n=>n===500));
 proofs.push({seed:result.seed,reverse:result.reverse,players});
}
ok(proofs.length===33);
writeFileSync(import.meta.dir+'/stalemate-proofs.json',JSON.stringify(proofs,null,2));
console.log('All 33 censored games are proven income deadlocks, with 500 completed turns each.');
