import {actionEffects,definition,type ActionCommand} from '../game/actions';
import type {StandardView} from '../../../standard-matrix/policy';
import type {CardInstance} from '../game/setup';

/** Minh's Melia strategy, v1. Decisions use the same public observation as other bots. */
export const mmVersion=1;
const money:Record<string,number>={obol:1,drachma:2,talent:3};
const count=(v:StandardView,id:string)=>v.owned[id]??0;
const cash=(v:StandardView)=>Object.entries(money).reduce((n,[id,value])=>n+count(v,id)*value,0);
const late=(v:StandardView)=>!!v.finalRound||v.supply.acropolis<=2;
const handCash=(v:StandardView)=>v.resources.coins+v.hand.reduce((n,c)=>n+(money[c.cardId]??0),0);
function trashTargets(v:StandardView,max:number):CardInstance[]{
 if(late(v))return [];
 let coins=cash(v),obols=count(v,'obol');
 const demeter=count(v,'harvest-feast')+count(v,'sacred-grove');
 const candidates=[...v.hand].sort((a,b)=>trashRank(a)-trashRank(b)||a.id.localeCompare(b.id));
 const result:CardInstance[]=[];
 for(const c of candidates){
  if(result.length>=max)break;
  if(c.cardId==='hamlet'||c.cardId==='temple-of-demeter'&&demeter>=2||c.cardId==='obol'&&obols>4&&coins>=8){
   result.push(c);if(c.cardId==='obol'){coins--;obols--;}
  }
 }
 return result;
}
const trashRank=(c:CardInstance)=>c.cardId==='hamlet'?0:c.cardId==='temple-of-demeter'?1:c.cardId==='obol'?2:3;
function preference(v:StandardView):string[]{
 const engine:string[]=[];
 if(!late(v)){
  if(cash(v)<9)engine.push('talent');
  if(!count(v,'sacred-grove'))engine.push('sacred-grove');
  if(!count(v,'harvest-feast'))engine.push('harvest-feast');
  if(count(v,'sacred-academy')<1)engine.push('sacred-academy');
  if(cash(v)<9)engine.push('drachma');
 }
 return ['acropolis',...(late(v)?['polis','hamlet']:[]),...engine,...(count(v,'sacred-academy')&&cash(v)>=9?['polis']:[])];
}
function gain(v:StandardView):ActionCommand{
 const c=v.choice!;
 const eligible=Object.keys(v.supply).filter(id=>v.supply[id]>0&&!v.bannedCards.includes(id)&&definition(id).cost!==null&&definition(id).cost!<=c.limit!&&(!c.actionOnly||definition(id).type==='Action'));
 // An opening Hamlet upgrade is specifically a Drachma, not another engine card.
 const order=c.source==='trial-of-the-spear'&&cash(v)<9?['drachma',...preference(v)]:preference(v);
 const preferred=order.find(id=>eligible.includes(id));
 const fallback=['polis','drachma'].find(id=>eligible.includes(id))??[...eligible].sort((a,b)=>definition(b).cost!-definition(a).cost!||a.localeCompare(b))[0];
 const id=preferred??(c.min?fallback:undefined);
 return {type:'choice/resolved',choiceId:c.id,targets:id?[id]:[]};
}
function worship(v:StandardView):string|undefined{
 if(v.resources.worship<1||late(v)||handCash(v)>=8)return;
 const available=(id:string)=>v.events.includes(id)&&!v.bannedEvents.includes(id)&&v.resources.coins>=definition(id).cost!;
 const hamlets=v.hand.filter(c=>c.cardId==='hamlet');
 if(hamlets.length===1&&cash(v)<9&&v.events.includes('trial-of-the-spear')&&!v.bannedEvents.includes('trial-of-the-spear')&&handCash(v)>=4&&v.supply.drachma>0)return available('trial-of-the-spear')?'trial-of-the-spear':undefined;
 const trash=trashTargets(v,2);
 if(available('blessing-of-the-fields')&&(trash.length===2||trash.some(c=>c.cardId==='hamlet')))return 'blessing-of-the-fields';
}
export function mmCommand(v:StandardView):ActionCommand{
 if(v.choice){
  const c=v.choice;
  if(c.kind==='gain')return gain(v);
  let targets:CardInstance[];
  if(c.kind==='discard'){
   const value=(card:CardInstance)=>definition(card.cardId).type==='Territory'?-10:definition(card.cardId).type==='Action'&&v.resources.actions===0?-5:(definition(card.cardId).cost??0);
   targets=[...v.hand].sort((a,b)=>value(a)-value(b)||a.id.localeCompare(b.id)).slice(0,c.min);
  }else targets=trashTargets(v,c.max);
  return {type:'choice/resolved',choiceId:c.id,targets:targets.map(c=>c.id)};
 }
 if(v.phase==='actions'){
  const actions=v.hand.filter(c=>definition(c.cardId).type==='Action');
  const priority=(c:CardInstance)=>actionEffects(c.cardId).reduce((n,e)=>n+(e.kind==='resource'&&e.resource==='actions'?20*e.amount:e.kind==='draw'?e.amount:0),0)+(!v.leaderUsed&&definition(c.cardId).god===definition(v.leader).god?5:0);
  // Once both Demeter engine cards exist, the starter can be thinned alongside
  // an Obol; don't play away the intended trash target before paying worship.
  const thinning=trashTargets(v,2);
  const holdTemple=thinning.length===2&&thinning.some(c=>c.cardId==='temple-of-demeter')&&handCash(v)-thinning.reduce((n,c)=>n+(money[c.cardId]??0),0)>=3&&handCash(v)<8&&v.events.includes('blessing-of-the-fields')&&!v.bannedEvents.includes('blessing-of-the-fields')&&v.resources.worship>0;
  const next=actions.filter(c=>!(holdTemple&&c.cardId==='temple-of-demeter')).sort((a,b)=>priority(b)-priority(a)||a.id.localeCompare(b.id))[0];
  if(v.resources.actions>0&&next)return {type:'action/played',instanceId:next.id};
  return {type:'phase/advanced'};
 }
 const event=worship(v);
 if(event)return {type:'god/worshipped',cardId:event};
 if(v.phase==='treasures'){
  // Pay incrementally: playing all Obols would make them unavailable for trash.
  const next=v.hand.filter(c=>money[c.cardId]).sort((a,b)=>money[b.cardId]-money[a.cardId]||a.id.localeCompare(b.id))[0];
  if(next)return {type:'treasure/played',instanceId:next.id};
 }
 const purchase=preference(v).find(id=>v.resources.buys>0&&v.supply[id]>0&&!v.bannedCards.includes(id)&&definition(id).cost!<=v.resources.coins);
 return purchase?{type:'card/bought',cardId:purchase}:{type:'turn/ended'};
}
