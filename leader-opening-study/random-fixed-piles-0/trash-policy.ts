import {actionEffects,definition,eligibleGains,type Choice} from '../../src/lib/game/actions';
import type {CardInstance,SetupState} from '../../src/lib/game/setup';
import {safeTrash} from './income-floor';
const cache=new Map<string,number>();
const cash=(id:string)=>({obol:1,drachma:2,talent:3} as Record<string,number>)[id]??0;
/** Analytic one-turn income proxy: legal whole-deck Action capacity, discounted
 * by estimated five-card-hand reach after net draw. Not a hidden-order forecast.
 * Conditional reveal money, Worship and future gains are excluded here.
 */
export function incomeProxy(owned:CardInstance[],leader:string):number{
 const counts:Record<string,number>={};for(const c of owned)counts[c.cardId]=(counts[c.cardId]??0)+1;
 const key=JSON.stringify([leader,Object.entries(counts).sort()]);const cached=cache.get(key);if(cached!==undefined)return cached;
 let coins=0,draw=0,actions=1,triggered=false;
 const terminals:{coins:number,draw:number,match:boolean}[]=[];
 for(const c of owned){
  coins+=cash(c.cardId);if(definition(c.cardId).type!=='Action')continue;
  const effects=actionEffects(c.cardId);
  const a=effects.reduce((n,e)=>n+(e.kind==='resource'&&e.resource==='actions'?e.amount:0),0);
  const money=effects.reduce((n,e)=>n+(e.kind==='resource'&&e.resource==='coins'?e.amount:0),0);
  const netDraw=Math.max(0,effects.reduce((n,e)=>n+(e.kind==='draw'?e.amount:e.kind==='discard'?-e.amount:0),0));
  const match=definition(c.cardId).god===definition(leader).god;
  if(a>=1){actions+=a-1;coins+=money;draw+=netDraw;triggered||=match;}
  else if(money||netDraw||match)terminals.push({coins:money,draw:netDraw,match});
 }
 if(triggered){if(leader==='thaleia')actions++;if(leader==='nereon')coins++;if(leader==='melia')draw++;}
 // DP retains maximum coin payload for each (terminals played, draw, trigger).
 type S={used:number,draw:number,coins:number,trigger:boolean};
 let states=new Map<string,S>([['0/0/'+Number(triggered),{used:0,draw:0,coins:0,trigger:triggered}]]);
 const ceiling=actions+Number(leader==='thaleia'&&!triggered);
 for(const t of terminals){
  const next=new Map(states);
  for(const s of states.values()){
   if(s.used>=ceiling)continue;
   const fire=t.match&&!s.trigger;
   const n={used:s.used+1,draw:s.draw+t.draw+Number(fire&&leader==='melia'),coins:s.coins+t.coins+Number(fire&&leader==='nereon'),trigger:s.trigger||t.match};
   const k=n.used+'/'+n.draw+'/'+Number(n.trigger),old=next.get(k);if(!old||n.coins>old.coins)next.set(k,n);
  }
  states=next;
 }
 let best=0;
 for(const s of states.values()){
  if(s.used>actions+Number(leader==='thaleia'&&!triggered&&s.trigger))continue;
  const reach=Math.min(1,5/Math.max(1,owned.length-draw-s.draw));
  best=Math.max(best,(coins+s.coins)*reach);
 }
 if(cache.size>=50000)cache.clear();cache.set(key,best);return best;
}
export function beneficialTrash(g:SetupState,uid:string,targets:string[]):boolean{
 if(!targets.length)return true;
 const owned=Object.values(g.decks[uid]).flat(),leader=g.leaders[uid],choice=g.turn.choice!;
 if(!safeTrash(owned,leader,targets))return false;
 const before=incomeProxy(owned,leader),vp=(xs:CardInstance[])=>xs.reduce((n,c)=>n+(definition(c.cardId).vp??0),0);
 const horizon=g.turn.finalRound?0:Math.min(4,g.supply.acropolis);
 function value(ids:string[]){
  const removed=owned.filter(c=>ids.includes(c.id)),remaining=owned.filter(c=>!ids.includes(c.id));
  let gains:(string|undefined)[]=[undefined];
  if(choice.offering==='sum'||ids.length&&(choice.forge||choice.offering)){
   const limit=removed.reduce((n,c)=>n+definition(c.cardId).cost!,0)+(choice.forge?2:typeof choice.offering==='number'?choice.offering:0);
   gains=eligibleGains(g,limit).map(c=>c.id);
   if(choice.offering==='sum'||gains.length===0)gains.push(undefined);
  }
  let income=0,score=0;
  for(const gain of gains){
   const after=gain?[...remaining,{id:'evaluation-gain',cardId:gain,copy:0}]:remaining;
   const delta=incomeProxy(after,leader)-before;
   income+=delta;score+=horizon*delta+vp(after)-vp(owned)-removed.reduce((n,c)=>n+cash(c.cardId),0);
  }
  return {income:income/gains.length,score:score/gains.length};
 }
 const after=value(targets),pass=value([]);
 return after.income>pass.income+0.02&&after.score>pass.score+0.1;
}
