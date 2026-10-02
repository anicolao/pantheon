import {readFileSync,readdirSync,writeFileSync} from 'node:fs';import {applyPlayCommand,definition} from '../../src/lib/game/actions';import {incomeCapacity} from './income-floor';import {ok} from 'node:assert';
const dir=import.meta.dir+'/games',out=[];
for(const f of readdirSync(dir).filter(x=>x.endsWith('.json')&&!x.endsWith('.replay.json'))){
 const r=JSON.parse(readFileSync(dir+'/'+f,'utf8'));if(r.status!=='censored')continue;
 const t=JSON.parse(readFileSync(dir+'/'+f.replace('.json','.replay.json'),'utf8')),g=t.initial;
 for(const [i,c] of t.commands.entries())applyPlayCommand(g,c.uid,c.command,i+1);
 const cheapest=Math.min(...r.allowed.filter((id:string)=>g.supply[id]>0).map((id:string)=>definition(id).cost!));
 const income=g.turnOrder.map((uid:string)=>incomeCapacity(Object.values(g.decks[uid]).flat() as any,g.leaders[uid]));
 ok(g.supply.drachma===0&&income.every((x:number)=>x<cheapest));
 out.push({file:f,drachmaRemaining:g.supply.drachma,cheapestPermittedPurchase:cheapest,income});
}
writeFileSync(import.meta.dir+'/unfinished-diagnostics.json',JSON.stringify(out,null,2));console.log(out.length+' unfinished games verified: Drachma empty and maximum income below cheapest permitted purchase.');
