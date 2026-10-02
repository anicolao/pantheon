import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {applyPlayCommand,definition,standings} from '../../src/lib/game/actions';
import {incomeCapacity} from './income-floor';
import {ok} from 'node:assert';
const dir=import.meta.dir+'/games',results=[];
const money=(id:string)=>({obol:1,drachma:2,talent:3} as Record<string,number>)[id]??0;
for(const file of readdirSync(dir).filter(x=>x.endsWith('.json')&&!x.endsWith('.replay.json'))){
 const row=JSON.parse(readFileSync(dir+'/'+file,'utf8'));
 if(row.status!=='finished'||row.players[0].share===.5)continue;
 const trace=JSON.parse(readFileSync(dir+'/'+file.replace('.json','.replay.json'),'utf8')),g=trace.initial;
 const metrics=g.turnOrder.map(()=>({first10:{coins:0,worship:0,buys:{} as Record<string,number>},floorTurns:0,observedTurns:0,trashSources:{} as Record<string,{cards:number,treasureCoins:number,vp:number}>,favored:{} as Record<string,number>,after10:null as any}));
 let current='';
 for(const [i,{uid,command:c}] of trace.commands.entries()){
  const seat=g.turnOrder.indexOf(uid),m=metrics[seat],turn=(g.turn.turns[uid]??0)+1,key=uid+'/'+turn;
  if(current!==key){current=key;m.observedTurns++;if(incomeCapacity(Object.values(g.decks[uid]).flat() as any,g.leaders[uid])<=4)m.floorTurns++;}
  const before=g.resources.coins,start=g.movements.length;
  applyPlayCommand(g,uid,c,i+1);
  if(turn<=10){
   if(c.type!=='turn/ended')m.first10.coins+=Math.max(0,g.resources.coins-before);
   if(c.type==='god/worshipped')m.first10.worship++;
   if(c.type==='card/bought')m.first10.buys[c.cardId]=(m.first10.buys[c.cardId]??0)+1;
  }
  for(const x of g.movements.slice(start)){
   if(x.kind==='trash'&&x.card){
    const s=m.trashSources[x.source]??={cards:0,treasureCoins:0,vp:0};s.cards++;s.treasureCoins+=money(x.card.cardId);s.vp+=definition(x.card.cardId).vp??0;
   }
   if(x.kind==='worship'&&x.amount>=2)m.favored[x.source]=(m.favored[x.source]??0)+1;
  }
  if(c.type==='turn/ended'&&turn===10)m.after10=Object.values(g.decks[uid]).flat().reduce((a:any,c:any)=>(a[c.cardId]=(a[c.cardId]??0)+1,a),{});
 }
 const scores=standings(g);
 for(const [seat,uid] of g.turnOrder.entries()){ok(scores.find(x=>x.uid===uid)?.score===row.players[seat].score);}
 results.push({file,index:row.index,lineup:row.lineup,selected:row.selected,players:row.players.map((p:any,i:number)=>({...p,diagnostic:metrics[i]}))});
}
writeFileSync(import.meta.dir+'/winning-patterns.json',JSON.stringify(results));
console.log(results.length+' decisive games replayed for diagnostic metrics');
