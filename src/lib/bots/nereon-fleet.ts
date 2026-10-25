import {actionEffects,definition,type ActionCommand} from '../game/actions';
import type {CardInstance} from '../game/setup';
import type {StandardView} from '../../../standard-matrix/policy';

/** Experimental JRFSA-inspired Nereon policy. Not wired into the UI's Bot choice. */
export const nereonFleetVersion=3;
const treasure:Record<string,number>={obol:1,drachma:2,talent:3};
const owned=(v:StandardView,id:string)=>v.owned[id]??0;
const income=(v:StandardView)=>Object.entries(treasure).reduce((n,[id,value])=>n+owned(v,id)*value,0);
const handMoney=(v:StandardView)=>v.resources.coins+v.hand.reduce((n,c)=>n+(treasure[c.cardId]??0),0);
const favored=(v:StandardView,god:string)=>v.play.filter(c=>definition(c.cardId).type==='Action'&&definition(c.cardId).god===god).length>=2;
function thin(v:StandardView,max:number):CardInstance[]{
 if(v.finalRound||owned(v,'acropolis')>0)return [];
 const targets=v.hand.filter(c=>c.cardId==='hamlet').sort((a,b)=>a.id.localeCompare(b.id)).slice(0,max);
 // A pending Demeter choice has already paid its cost; retain the pre-payment budget.
 const paid=v.choice?.kind==='trash'&&v.choice.source==='blessing-of-the-fields'?definition('blessing-of-the-fields').cost!:0;
 if(handMoney(v)+paid>4)return targets;
 let obols=owned(v,'obol'),cash=income(v);
 // Recheck after each removal: preserve eight treasure coins once at five Obols or fewer.
 for(const obol of v.hand.filter(c=>c.cardId==='obol')){
  if(targets.length>=max||!(obols>5||cash>8))break;
  targets.push(obol);obols--;cash--;
 }
 return targets;
}
function priorities(v:StandardView):string[]{
 if(v.finalRound)return ['acropolis','polis','hamlet'];
 return ['acropolis',...(!owned(v,'merchant-fleet')?['merchant-fleet']:[]),'talent','sacred-academy',
  ...(owned(v,'harbor-pilot')<2?['harbor-pilot']:[]),
  ...(!owned(v,'oracles-acolyte')?['oracles-acolyte']:[]),
  ...(income(v)<11?['drachma']:[]),...(v.supply.acropolis<=2?['polis','hamlet']:[])];
}
function winningFinish(v:StandardView):string|undefined{
 if(v.finalRound||v.resources.buys<1)return;
 const empty=Object.values(v.supply).filter(n=>n===0).length;
 return ['acropolis','polis','hamlet'].find(id=>{
  if(v.supply[id]!==1||(id!=='acropolis'&&empty<2)||v.bannedCards.includes(id)||definition(id).cost!>v.resources.coins)return false;
  const reply=v.equalTurns&&v.playersAfter!==0?Object.entries(v.supply).reduce((n,[card,count])=>n+(count-Number(card===id))*(definition(card).vp??0),0):0;
  return v.myScore+definition(id).vp!>Math.max(...v.scores)+reply;
 });
}
export function nereonFleetCommand(v:StandardView):ActionCommand{
 if(v.leader!=='nereon')throw Error('The Fleet experiment requires Nereon');
 if(v.choice){
  const c=v.choice;
  if(c.kind==='gain'){
   const legal=Object.keys(v.supply).filter(id=>v.supply[id]>0&&!v.bannedCards.includes(id)&&definition(id).cost!==null&&definition(id).cost!<=c.limit!&&(!c.actionOnly||definition(id).type==='Action'));
   const id=priorities(v).find(id=>legal.includes(id))??(c.min?[...legal].sort((a,b)=>definition(b).cost!-definition(a).cost!||a.localeCompare(b))[0]:undefined);
   return {type:'choice/resolved',choiceId:c.id,targets:id?[id]:[]};
  }
  if(c.kind==='trash')return {type:'choice/resolved',choiceId:c.id,targets:thin(v,c.max).map(c=>c.id)};
  const keep=(card:CardInstance)=>definition(card.cardId).type==='Territory'?-10:definition(card.cardId).type==='Action'&&v.resources.actions===0?-5:(definition(card.cardId).cost??0);
  return {type:'choice/resolved',choiceId:c.id,targets:[...v.hand].sort((a,b)=>keep(a)-keep(b)||a.id.localeCompare(b.id)).slice(0,c.min).map(c=>c.id)};
 }
 if(v.phase==='actions'){
  const priority=(c:CardInstance)=>actionEffects(c.cardId).reduce((n,e)=>n+(e.kind==='resource'&&e.resource==='actions'?20*e.amount:e.kind==='draw'?e.amount:0),0)+(!v.leaderUsed&&definition(c.cardId).god==='Poseidon'?5:0);
  const next=v.hand.filter(c=>definition(c.cardId).type==='Action').sort((a,b)=>priority(b)-priority(a)||a.id.localeCompare(b.id))[0];
  return v.resources.actions>0&&next?{type:'action/played',instanceId:next.id}:{type:'phase/advanced'};
 }
 const cash=handMoney(v),firstFleet=!owned(v,'merchant-fleet')&&v.supply['merchant-fleet']>0&&!v.bannedCards.includes('merchant-fleet')&&v.resources.buys>0&&cash>=5;
 const canWorship=(id:string)=>!v.finalRound&&v.resources.worship>0&&v.events.includes(id)&&!v.bannedEvents.includes(id)&&v.resources.coins>=definition(id).cost!;
 if(cash<8&&!firstFleet){
  if(thin(v,2).length&&canWorship('blessing-of-the-fields'))return {type:'god/worshipped',cardId:'blessing-of-the-fields'};
  if(favored(v,'Poseidon')&&v.supply.drachma>0&&!v.bannedCards.includes('drachma')&&canWorship('tribute-of-the-tides'))return {type:'god/worshipped',cardId:'tribute-of-the-tides'};
 }
 if(v.phase==='treasures'){
  const next=v.hand.filter(c=>treasure[c.cardId]).sort((a,b)=>treasure[b.cardId]-treasure[a.cardId]||a.id.localeCompare(b.id))[0];
  if(next)return {type:'treasure/played',instanceId:next.id};
 }
 const finish=winningFinish(v);if(finish)return {type:'card/bought',cardId:finish};
 const card=priorities(v).find(id=>v.resources.buys>0&&v.supply[id]>0&&!v.bannedCards.includes(id)&&definition(id).cost!<=v.resources.coins);
 return card?{type:'card/bought',cardId:card}:{type:'turn/ended'};
}
