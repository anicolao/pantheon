import {actionEffects,definition,type ActionCommand} from '../game/actions';
import type {CardInstance} from '../game/setup';
import type {StandardView} from '../../../standard-matrix/policy';

/** NDZUF-inspired experiment; not registered as a UI bot. */
export const doreiosGroveVersion=1;
const money:Record<string,number>={obol:1,drachma:2,talent:3};
const owned=(v:StandardView,id:string)=>v.owned[id]??0;
const available=(v:StandardView,id:string)=>v.supply[id]>0&&!v.bannedCards.includes(id);
const cash=(v:StandardView)=>v.resources.coins+v.hand.reduce((n,c)=>n+(money[c.cardId]??0),0);
const late=(v:StandardView)=>!!v.finalRound||v.supply.acropolis<=1;
const favored=(v:StandardView,god:string)=>v.play.filter(c=>definition(c.cardId).type==='Action'&&definition(c.cardId).god===god).length>=2;
const actions=(id:string)=>actionEffects(id).reduce((n,e)=>n+(e.kind==='resource'&&e.resource==='actions'?e.amount:0),0);
const buffer=(v:StandardView)=>1+Object.entries(v.owned).reduce((n,[id,count])=>n+(definition(id).type==='Action'?count*(actions(id)-1):0),0);
function safeGain(v:StandardView,id:string,removedVP=0){
 const ends=v.supply[id]===1&&(id==='acropolis'||Object.values(v.supply).filter(n=>n===0).length>=2);
 // Do not deliberately end behind. Opponents' hidden final hands are not inspected.
 return !ends||v.myScore-removedVP+(definition(id).vp??0)>=Math.max(...v.scores);
}
function pointCard(v:StandardView,budget:number,removedVP=0){
 return ['acropolis','polis','hamlet'].find(id=>available(v,id)&&definition(id).cost!<=budget&&safeGain(v,id,removedVP));
}
function buy(v:StandardView,budget:number):string|undefined{
 if(v.resources.buys<1)return;
 if(late(v))return pointCard(v,budget);
 const list=['acropolis',...(!owned(v,'sacred-grove')?['sacred-grove']:[]),
  ...(owned(v,'talent')<2?['talent']:[]),'sacred-academy',
  ...(!owned(v,'bronze-recruit')?['bronze-recruit']:[]),
  ...(owned(v,'harbor-pilot')<1||buffer(v)<0?['harbor-pilot']:[]),
  'harvest-feast',...(!owned(v,'oracles-acolyte')?['oracles-acolyte']:[])];
 return list.find(id=>available(v,id)&&definition(id).cost!<=budget&&safeGain(v,id));
}
function thin(v:StandardView,max:number):CardInstance[]{
 if(late(v))return [];
 const result=v.hand.filter(c=>c.cardId==='hamlet').slice(0,max);
 let total=Object.entries(money).reduce((n,[id,value])=>n+owned(v,id)*value,0)+2*owned(v,'bronze-recruit');
 let potential=cash(v);
 const target=buy(v,potential),floor=target?definition(target).cost!:0;
 for(const c of v.hand.filter(c=>c.cardId==='obol')){
  if(result.length>=max)break;
  if(total<=5||potential-1<floor)continue;
  result.push(c);total--;potential--;
 }
 return result;
}
function conversion(v:StandardView,offering:number){
 const pairs=v.hand.flatMap(card=>{
  const removedVP=definition(card.cardId).vp??0,limit=definition(card.cardId).cost!+offering;
  if(late(v)){
   const gain=pointCard(v,limit,removedVP);
   return gain&&(definition(gain).vp??0)>removedVP?[{card,gain,value:definition(gain).vp!-removedVP}]:[];
  }
  return (card.cardId==='hamlet'||card.cardId==='obol')&&limit>=3&&available(v,'drachma')?[{card,gain:'drachma',value:1}]:[];
 });
 return pairs.sort((a,b)=>b.value-a.value||definition(a.card.cardId).cost!-definition(b.card.cardId).cost!||a.card.id.localeCompare(b.card.id))[0];
}
export function doreiosGroveCommand(v:StandardView):ActionCommand{
 if(v.leader!=='doreios')throw Error('Grove experiment requires Doreios');
 const c=v.choice;
 if(c){
  if(c.kind==='gain'){
   const legal=(id:string)=>available(v,id)&&definition(id).cost!<=c.limit!&&(!c.actionOnly||definition(id).type==='Action');
   let list:string[];
   if(late(v))list=['acropolis','polis','hamlet'];
   else if(c.source==='trial-of-the-spear')list=['drachma'];
   else list=[...(buffer(v)<0?['harbor-pilot']:[]),
    ...(!owned(v,'council-of-sages')&&buffer(v)>=1&&owned(v,'harvest-feast')>=3?['council-of-sages']:[]),
    'harvest-feast',...(!owned(v,'harbor-pilot')?['harbor-pilot']:[]),'drachma','oracles-acolyte'];
   const id=list.find(id=>legal(id)&&safeGain(v,id))??(c.min?Object.keys(v.supply).filter(legal).sort((a,b)=>definition(b).cost!-definition(a).cost!||a.localeCompare(b))[0]:undefined);
   return {type:'choice/resolved',choiceId:c.id,targets:id?[id]:[]};
  }
  if(c.kind==='trash'){
   const target=c.source==='trial-of-the-spear'?conversion(v,typeof c.offering==='number'?c.offering:1)?.card:undefined;
   return {type:'choice/resolved',choiceId:c.id,targets:c.source==='trial-of-the-spear'?(target?[target.id]:[]):thin(v,c.max).map(x=>x.id)};
  }
  const keep=(x:CardInstance)=>definition(x.cardId).type==='Territory'?-20:definition(x.cardId).type==='Action'&&v.resources.actions===0?-10:(definition(x.cardId).cost??0);
  return {type:'choice/resolved',choiceId:c.id,targets:[...v.hand].sort((a,b)=>keep(a)-keep(b)||a.id.localeCompare(b.id)).slice(0,c.min).map(x=>x.id)};
 }
 if(v.phase==='actions'){
  const priority=(x:CardInstance)=>20*actions(x.cardId)+actionEffects(x.cardId).reduce((n,e)=>n+(e.kind==='draw'?e.amount:0),0);
  const next=v.hand.filter(x=>definition(x.cardId).type==='Action').sort((a,b)=>priority(b)-priority(a)||a.id.localeCompare(b.id))[0];
  return next&&v.resources.actions>0?{type:'action/played',instanceId:next.id}:{type:'phase/advanced'};
 }
 const can=(id:string)=>!v.finalRound&&v.resources.worship>0&&v.events.includes(id)&&!v.bannedEvents.includes(id)&&v.resources.coins>=definition(id).cost!;
 if(!late(v)&&cash(v)<5&&v.hand.filter(x=>x.cardId==='hamlet').length>=2&&can('blessing-of-the-fields'))
  return {type:'god/worshipped',cardId:'blessing-of-the-fields'};
 if(can('trial-of-the-spear')){
  const option=conversion(v,favored(v,'Ares')?3:1);
  const before=pointCard(v,cash(v)),after=pointCard(v,cash(v)-4);
  const points=(id:string|undefined)=>id?definition(id).vp??0:0;
  if(option&&(late(v)?option.value+(v.resources.buys?points(after):0)>(v.resources.buys?points(before):0):cash(v)-(money[option.card.cardId]??0)<5))
   return {type:'god/worshipped',cardId:'trial-of-the-spear'};
 }
 if(v.phase==='treasures'){
  const next=v.hand.filter(x=>money[x.cardId]).sort((a,b)=>money[b.cardId]-money[a.cardId]||a.id.localeCompare(b.id))[0];
  if(next)return {type:'treasure/played',instanceId:next.id};
 }
 const id=buy(v,v.resources.coins);
 return id?{type:'card/bought',cardId:id}:{type:'turn/ended'};
}
