// Frozen Owl v2 from 2337bbe1; import paths adjusted only.
import {actionEffects,definition,type ActionCommand} from '../../../src/lib/game/actions';
import type {StandardView} from '../../../standard-matrix/policy';
export const owlVersion=2;
const count=(v:StandardView,id:string)=>v.owned[id]??0;
const income=(v:StandardView)=>count(v,'obol')+2*count(v,'drachma')+3*count(v,'talent');
const draw=(id:string)=>actionEffects(id).reduce((n,e)=>n+(e.kind==='draw'?e.amount:0),0);
const plusActions=(id:string)=>actionEffects(id).reduce((n,e)=>n+(e.kind==='resource'&&e.resource==='actions'?e.amount:0),0);
// Compare total draw capacity with total deck size, including newly gained VP.
// The two-card margin reduces failures when draw cards collect at the bottom.
export function owlNeedsDraw(v:StandardView){
 const size=Object.values(v.owned).reduce((a,b)=>a+b,0);
 const capacity=5+Object.entries(v.owned).reduce((n,[id,copies])=>n+copies*(definition(id).type==='Action'?draw(id):0),0);
 return capacity<size+2;
}
function preference(v:StandardView):string[]{
 const late=!!v.finalRound||v.supply.acropolis<=2;
 return ['acropolis',...(late?['polis','hamlet']:[]),
  ...(income(v)<11?['talent']:[]),...(owlNeedsDraw(v)?['sacred-academy']:[]),
  ...(count(v,'council-of-sages')<1?['council-of-sages']:[]),
  ...(count(v,'oracles-acolyte')<1?['oracles-acolyte']:[]),
  ...(income(v)<11?['drachma']:[]),...(!owlNeedsDraw(v)?['polis']:[])];
}
export function owlCommand(v:StandardView):ActionCommand{
 if(v.choice){
  const c=v.choice;
  if(c.kind==='gain'){
   const eligible=Object.keys(v.supply).filter(id=>v.supply[id]>0&&!v.bannedCards.includes(id)&&definition(id).cost!==null&&definition(id).cost!<=c.limit!&&(!c.actionOnly||definition(id).type==='Action'));
   const order=c.source==='counsel-of-olympus'?['sacred-academy',...(count(v,'council-of-sages')<1?['council-of-sages']:[]),'oracles-acolyte']:preference(v);
   const id=order.find(id=>eligible.includes(id))??(c.min?[...eligible].sort((a,b)=>definition(b).cost!-definition(a).cost!||a.localeCompare(b))[0]:undefined);
   return {type:'choice/resolved',choiceId:c.id,targets:id?[id]:[]};
  }
  const cards=[...v.hand].sort((a,b)=>{
   const rank=(id:string)=>definition(id).type==='Territory'?-10:definition(id).cost??0;
   return rank(a.cardId)-rank(b.cardId)||a.id.localeCompare(b.id);
  });
  const targets=c.kind==='discard'?cards.slice(0,c.min):cards.filter(c=>!v.finalRound&&(c.cardId==='hamlet'||c.cardId==='obol'&&income(v)>11)).slice(0,c.max);
  return {type:'choice/resolved',choiceId:c.id,targets:targets.map(c=>c.id)};
 }
 if(v.phase==='actions'){
  const cards=v.hand.filter(c=>definition(c.cardId).type==='Action');
  const priority=(id:string)=>20*plusActions(id)+draw(id)+(!v.leaderUsed&&definition(id).god==='Athena'?10:0);
  const next=cards.sort((a,b)=>priority(b.cardId)-priority(a.cardId)||a.id.localeCompare(b.id))[0];
  return v.resources.actions>0&&next?{type:'action/played',instanceId:next.id}:{type:'phase/advanced'};
 }
 if(v.phase==='treasures'&&v.hand.some(c=>definition(c.cardId).type==='Treasure'))return {type:'treasures/played'};
 const favored=v.play.filter(c=>definition(c.cardId).type==='Action'&&definition(c.cardId).god==='Athena').length>=2;
 const coins=v.resources.coins;
 // Keep eight coins for an Acropolis; at eleven, grow draw and score together.
 const reserve=coins>=8?8:0;
 const developing=!v.finalRound&&v.supply.acropolis>1;
 // Thin two dead starter cards without adding a trashing Action to the deck.
 // Preserve an affordable Acropolis and avoid sacrificing points late.
 if(developing&&v.supply.acropolis>2&&v.resources.worship>0&&coins-reserve>=3
  &&v.events.includes('blessing-of-the-fields')&&!v.bannedEvents.includes('blessing-of-the-fields')
  &&v.hand.filter(c=>c.cardId==='hamlet').length>=2)return {type:'god/worshipped',cardId:'blessing-of-the-fields'};
 const canWorship=v.resources.worship>0&&v.events.includes('counsel-of-olympus')&&!v.bannedEvents.includes('counsel-of-olympus')&&coins-reserve>=3;
 if(developing&&canWorship&&((favored&&owlNeedsDraw(v)&&v.supply['sacred-academy']>0&&!(income(v)<11&&coins>=6&&coins<8))||(!favored&&count(v,'oracles-acolyte')<1&&coins<4&&v.supply['oracles-acolyte']>0)))return {type:'god/worshipped',cardId:'counsel-of-olympus'};
 const id=preference(v).find(id=>v.resources.buys>0&&v.supply[id]>0&&!v.bannedCards.includes(id)&&definition(id).cost!<=coins);
 return id?{type:'card/bought',cardId:id}:{type:'turn/ended'};
}
