import {unsafeReplyPurchase} from './ending-margin';
export {unsafeReplyPurchase} from './ending-margin';

import {definition,type ActionCommand} from '../equal-turns/source/src/lib/game/actions';
import {cardFeatures,engineCapacity,startReliability} from '../equal-turns/source/scripts/balance/engine';
import {publicHorizon,purchasePlan,gainOutcome,treasureValue} from '../equal-turns/source/scripts/balance/planning';
import {pointPurchase,pointGain} from '../equal-turns/source/scripts/balance/scoring';
import {moneyDiscard} from '../equal-turns/source/scripts/balance/money';
import type {View} from '../equal-turns/source/scripts/balance/strategy';
export type Config={replyMargin?:number;maintenanceCutoff?:number;buyFunding?:number;equalTurns?:boolean;extraTalent?:boolean;draw:number;action:number;cash:number;buy:number;payload:number;thin:number;floor:number;obols:number;ready:number;moneyTarget:number;buffer:number;playableIncome?:boolean;fundedBuys?:boolean;chainPayload?:boolean;toolIncome?:number;payloadIncome?:number;polisHorizon?:number;hamletHorizon?:number;toolOverpay?:number;toolDeadline?:number;ignoreTools?:boolean;thinPlay?:number;stopLateTrash?:boolean;earlyThin?:boolean;spare?:number;trashRule?:boolean;joint?:number;reliability?:number;earlyAcropolis?:boolean;late?:number};
export type Memory={turn:number;firstAcropolisConsidered?:boolean;talentSwap?:{turn:number;coins:number}};
export function metrics(v:View,p:Config){
 const cap=engineCapacity(v);
 if(p.ignoreTools){for(const [id,n]of Object.entries(v.owned)){const f=cardFeatures(id,v.variant);if(f.trash>0&&!f.gain&&!f.draw&&!f.coins&&!f.actions&&!f.buys)cap.terminalDemand-=n;}}
 let money=0,buys=1,payload=0,trash=0,junk=0;
 for(const [id,n]of Object.entries(v.owned)){
  const f=cardFeatures(id,v.variant);
  money+=n*(treasureValue(id)+f.coins);buys+=n*f.buys;
  if(f.coins>0&&f.buys>0&&(!p.chainPayload||f.actions>=1))payload+=n;
  trash+=n*f.trash;
  if(id==='hamlet'||definition(id).uniqueStartingCard&&v.variant==='base-game')junk+=n;
 }
 junk+=Math.max(0,(v.owned.obol??0)-p.obols);
 // Pure thinning actions need not consume a productive terminal slot once
 // maintenance is no longer useful. They still occupy space in the deck.
 if(p.maintenanceCutoff!==undefined&&(junk<=p.maintenanceCutoff||p.stopLateTrash&&publicHorizon(v)<=2)){
  for(const [id,n]of Object.entries(v.owned)){
   const f=cardFeatures(id,v.variant);
   if(f.trash>0&&!f.gain&&!f.draw&&!f.coins&&!f.actions&&!f.buys)cap.terminalDemand-=n;
  }
 }
 const coverage=Math.min(1,(5+cap.playableDraw)/Math.max(1,cap.size));
 return {cap,money,buys,payload,trash,junk,coverage};
}

// Whole-deck capacity, not an expectation over shuffles. Reserve terminal slots
// for draw first, then assign leftover slots to the largest printed coin payload.
export function playablePayload(v:View){
 let money=0,buys=1;const terminals:{draw:number;coins:number;buys:number;count:number}[]=[];
 for(const [id,n]of Object.entries(v.owned)){
  if(n<=0)continue;
  const f=cardFeatures(id,v.variant);money+=n*treasureValue(id);
  if(definition(id).type!=='Action')continue;
  if(f.actions>=1){money+=n*f.coins;buys+=n*f.buys;}
  else terminals.push({draw:Math.max(0,f.draw-f.discard),coins:f.coins,buys:f.buys,count:n});
 }
 let slots=engineCapacity(v).actionBudget;
 for(const t of terminals.sort((a,b)=>b.draw-a.draw||b.coins-a.coins||b.buys-a.buys)){
  const n=Math.min(slots,t.count);money+=n*t.coins;buys+=n*t.buys;slots-=n;
 }
 return {money,buys};
}

export function utility(v:View,p:Config){
 const m=metrics(v,p),c=m.cap;
 const income=p.playableIncome?playablePayload(v):m;
 return -p.draw*Math.max(0,c.size+p.buffer-5-c.playableDraw)
 -p.action*Math.max(0,c.terminalDemand+(c.size>5+c.playableDraw?(p.spare??0):0)-c.actionBudget)
 +(p.reliability??8)*startReliability(v,v.owned)
 +(p.joint??0)*Math.min(income.money*m.coverage,8*income.buys)
 +p.cash*Math.min(p.moneyTarget,income.money)
 +p.buy*Math.min(income.buys,Math.max(p.fundedBuys?1:2,income.money*(p.fundedBuys?m.coverage:1)/(p.buyFunding??8)))
 +p.payload*Math.min(1,m.payload)*Number(m.money>=(p.payloadIncome??0))
 +p.thin*Math.min(1,m.trash/2)*Math.min(1,m.junk/3)
 -.4*c.size;
}
function basePolicy(p:Config){
 const pointEligible=(v:View,id:string)=>{
  const vp=definition(id).vp??0,h=publicHorizon(v);
  if(vp===6)return p.earlyAcropolis||h<=(p.late??2)||ready(v);
  return vp>=3?h<=(p.polisHorizon??p.late??2):vp>0&&h<=(p.hamletHorizon??p.late??2);
 };

 const after=(v:View,id:string,n=1)=>({...v,owned:{...v.owned,[id]:(v.owned[id]??0)+n}});
 const gain=(v:View,limit:number,actionOnly=false)=>{
  const ids=Object.keys(v.supply).filter(id=>v.supply[id]>0&&!v.bannedCards.includes(id)&&definition(id).cost!==null&&definition(id).cost!<=limit&&(!actionOnly||definition(id).type==='Action'));
  const points=pointGain(v,ids,id=>pointEligible(v,id));
  if(points)return points;
  const safe=ids.filter(id=>gainOutcome(v,id)!==0);
  return (safe.length?safe:ids).sort((a,b)=>utility(after(v,b),p)-utility(after(v,a),p)||definition(a).cost!-definition(b).cost!||a.localeCompare(b))[0];
 };
 const ready=(v:View)=>{const m=metrics(v,p);return m.coverage>=p.ready&&m.payload>0&&m.money>=8&&m.cap.actionBudget>=m.cap.terminalDemand;};
 function trash(v:View){
  if(p.stopLateTrash&&publicHorizon(v)<=2)return [];
  const out:string[]=[];let next=v;
  for(let i=0;i<(v.choice?.max??2);i++){
   const candidates=next.hand.filter(c=>!out.includes(c.id)&&(c.cardId==='obol'&&(next.owned.obol??0)>p.obols||c.cardId==='hamlet'&&publicHorizon(v)>2||definition(c.cardId).uniqueStartingCard&&v.variant==='base-game'));
   const c=candidates.filter(c=>metrics(next,p).money-treasureValue(c.cardId)>=p.floor)
    .sort((a,b)=>utility(after(next,b.cardId,-1),p)-utility(after(next,a.cardId,-1),p)||a.id.localeCompare(b.id))[0];
   if(!c||!p.trashRule&&utility(after(next,c.cardId,-1),p)<=utility(next,p))break;
   out.push(c.id);next=after(next,c.cardId,-1);
  }
  return out;
 }
 function forge(v:View){
  const base=utility(v,p);let best:{id:string;gain:string;value:number}|undefined;
  for(const c of v.hand){
   if(c.cardId==='acropolis'||c.cardId==='polis')continue;
   if(metrics(v,p).money-treasureValue(c.cardId)<p.floor)continue;
   const next=after(v,c.cardId,-1),g=gain(next,(definition(c.cardId).cost??0)+2);
   if(!g)continue;
   const value=utility(after(next,g),p)-base+(definition(g).vp??0)-(definition(c.cardId).vp??0);
   if(value>0&&(!best||value>best.value))best={id:c.id,gain:g,value};
  }return best;
 }
 return (v:View,_m:Memory):ActionCommand=>{
  if(v.choice){
   if(v.choice.kind==='discard')return {type:'choice/resolved',choiceId:v.choice.id,targets:moneyDiscard(v)};
   if(v.choice.kind==='trash')return {type:'choice/resolved',choiceId:v.choice.id,targets:v.choice.forge?(forge(v)?[forge(v)!.id]:[]):trash(v)};
   const id=gain(v,v.choice.limit!,v.choice.actionOnly);return {type:'choice/resolved',choiceId:v.choice.id,targets:id?[id]:[]};
  }
  if(v.phase==='actions'){
   const options=v.hand.filter(c=>definition(c.cardId).type==='Action'&&Object.values(cardFeatures(c.cardId,v.variant)).some(x=>x>0));
   const rank=(c:View['hand'][number])=>{
    const f=cardFeatures(c.cardId,v.variant),others=v.hand.filter(x=>x.id!==c.id),future={...v,hand:others};
    const thin=f.trash?(c.cardId==='forge-of-heroes'?forge(future)?.value??0:trash(future).length*(p.thinPlay??8)):0;
    if(f.trash&&!thin&&!f.draw&&!f.coins&&!f.actions)return -10000;
    const remains=Math.max(0,v.unseenCount),density=metrics(v,p).money/Math.max(1,Object.values(v.owned).reduce((s,n)=>s+n,0));
    const preserve=f.actions>0&&others.some(c=>definition(c.cardId).type==='Action')?100:0;
    return preserve+Math.min(remains,f.draw)* (v.resources.actions>1?4:density)+f.coins+f.buys*.5+thin+(f.actions-1)*2;
   };
   const c=v.resources.actions>0?options.sort((a,b)=>rank(b)-rank(a)||a.id.localeCompare(b.id))[0]:undefined;
   return c&&rank(c)>-1000?{type:'action/played',instanceId:c.id}:{type:'phase/advanced'};
  }
  if(v.phase==='treasures'&&v.hand.some(c=>definition(c.cardId).type==='Treasure'))return {type:'treasures/played'};
  if(v.resources.buys<=0)return {type:'turn/ended'};
  const finish=purchasePlan(v,id=>definition(id).vp??0);
  if(finish.share!==null&&finish.share>0&&finish.cards[0])return {type:'card/bought',cardId:finish.cards[0]};
  if(p.earlyThin&&v.resources.coins<8&&metrics(v,p).money>=(p.toolIncome??0)&&publicHorizon(v)>Math.max(p.late??2,p.stopLateTrash?2:0)&&metrics(v,p).trash===0&&metrics(v,p).junk>=3){
   const tools=Object.keys(v.supply).filter(id=>v.supply[id]>0&&!v.bannedCards.includes(id)&&definition(id).cost!==null&&definition(id).cost!<=v.resources.coins&&cardFeatures(id,v.variant).trash>=2&&gainOutcome(v,id)!==0);
   const tool=tools.sort((a,b)=>definition(a).cost!-definition(b).cost!)[0];
   if(tool&&(v.resources.coins<=definition(tool).cost!+(p.toolOverpay??Infinity)||_m.turn>=(p.toolDeadline??Infinity)))return {type:'card/bought',cardId:tool};
  }
  if(p.earlyAcropolis||publicHorizon(v)<=Math.max(p.late??2,p.polisHorizon??0,p.hamletHorizon??0)||ready(v)){
   const points=pointPurchase(v,id=>pointEligible(v,id));if(points)return points;
  }
  const ids=Object.keys(v.supply).filter(id=>v.supply[id]>0&&!v.bannedCards.includes(id)&&definition(id).cost!==null&&definition(id).cost!<=v.resources.coins&&!(definition(id).vp??0)&&gainOutcome(v,id)!==0);
  const id=ids.sort((a,b)=>utility(after(v,b),p)-utility(after(v,a),p)||definition(a).cost!-definition(b).cost!||a.localeCompare(b))[0];
  return id&&utility(after(v,id),p)>utility(v,p)+1e-8?{type:'card/bought',cardId:id}:{type:'turn/ended'};
 };
}

// One-shot treatment: substitute Talent for the first actual Acropolis purchase
// selected by the unchanged policy, then resume that policy immediately.
export function policy(p:Config){
 const base=basePolicy(p);
 return (v:View,m:Memory):ActionCommand=>{
  let current=v,command=base(current,m);
  if(p.replyMargin!==undefined&&v.equalTurns&&(v.playersAfter??0)>0){
   for(let i=0;i<Object.keys(v.supply).length;i++){
    if(command.type!=='card/bought'||!unsafeReplyPurchase(current,command.cardId,p.replyMargin))break;
    current={...current,bannedCards:[...current.bannedCards,command.cardId]};
    command=base(current,m);
   }
  }
  if(p.extraTalent&&!m.firstAcropolisConsidered&&command.type==='card/bought'&&command.cardId==='acropolis'){
   m.firstAcropolisConsidered=true;
   if(v.supply.talent>0&&!v.bannedCards.includes('talent')&&v.resources.coins>=definition('talent').cost!){
    m.talentSwap={turn:m.turn,coins:v.resources.coins};
    return {type:'card/bought',cardId:'talent'};
   }
  }
  return command;
 };
}

