/** Research teacher: establish Athena devotion to turn $3 worship into topdecked draw. */
import type {StandardView} from '../../standard-matrix/policy';
import {actionEffects,definition,type ActionCommand} from '../../src/lib/game/actions';
export type AthenaRule={cashFloor:number;academyCap:number;through:number;oracleAtThree:boolean;replaceWorship?:boolean};
const money:Record<string,number>={obol:1,drachma:2,talent:3};
const ownedCash=(v:StandardView)=>Object.entries(v.owned).reduce((n,[id,count])=>n+count*(money[id]??0),0);
const available=(v:StandardView,id:string)=>v.supply[id]>0&&!v.bannedCards.includes(id);
const actions=(id:string)=>definition(id).type==='Action'?actionEffects(id).reduce((n,e)=>n+(e.kind==='resource'&&e.resource==='actions'?e.amount:0),0):0;
export function athenaOverride(v:StandardView,base:ActionCommand,r:AthenaRule):ActionCommand{
 if(v.leader!=='doreios')return base;
 const building=!v.finalRound&&v.myTurns<=r.through&&v.supply.acropolis>3;
 const academy=(v.owned['sacred-academy']??0)<r.academyCap&&available(v,'sacred-academy');
 if(v.choice){
  if(building&&academy&&v.choice.kind==='gain'&&v.choice.source==='counsel-of-olympus'&&v.choice.limit!>=5)return {type:'choice/resolved',choiceId:v.choice.id,targets:['sacred-academy']};
  return base;
 }
 if(v.phase==='actions'&&v.resources.actions>0){
  const card=v.hand.filter(c=>['oracles-acolyte','sacred-academy','harbor-pilot'].includes(c.cardId)).sort((a,b)=>actions(b.cardId)-actions(a.cardId))[0];
  if(card&&(base.type!=='action/played'||actions(v.hand.find(c=>c.id===base.instanceId)!.cardId)<actions(card.cardId)))return {type:'action/played',instanceId:card.id};
 }
 if(!building)return base;
 const cash=v.resources.coins+v.hand.reduce((n,c)=>n+(money[c.cardId]??0),0);
 const favored=v.play.filter(c=>definition(c.cardId).type==='Action'&&definition(c.cardId).god==='Athena').length>=2;
 if(base.type!=='action/played'&&favored&&academy&&ownedCash(v)>=r.cashFloor&&v.events.includes('counsel-of-olympus')&&!v.bannedEvents.includes('counsel-of-olympus')&&v.resources.worship>0&&v.resources.coins>=3&&(cash<8||cash>=11))return {type:'god/worshipped',cardId:'counsel-of-olympus'};
 const spendable=v.phase==='buys'?v.resources.coins:cash;
 const bridge=!(v.owned['oracles-acolyte']??0)&&!(v.owned['sacred-academy']??0)&&available(v,'oracles-acolyte');
 const preserveDoubleTrash=base.type==='god/worshipped'&&base.cardId==='blessing-of-the-fields'&&v.hand.filter(c=>c.cardId==='hamlet').length>=2;
 if(r.replaceWorship&&bridge&&v.resources.buys>0&&!preserveDoubleTrash&&['card/bought','god/worshipped','turn/ended'].includes(base.type)&&(spendable===2||r.oracleAtThree&&spendable===3&&(v.owned['council-of-sages']??0)>0)){
  if(v.phase!=='buys'&&v.hand.some(c=>money[c.cardId]))return {type:'treasures/played'};
  if(v.resources.coins>=2)return {type:'card/bought',cardId:'oracles-acolyte'};
 }
 if(base.type!=='card/bought'||v.resources.coins>=8)return base;
 if(v.phase!=='buys'&&v.hand.some(c=>money[c.cardId]))return {type:'treasures/played'};
 if(!(v.owned['oracles-acolyte']??0)&&!(v.owned['sacred-academy']??0)&&available(v,'oracles-acolyte')&&v.resources.coins>=2&&(v.resources.coins===2||r.oracleAtThree&&v.resources.coins===3&&(v.owned['council-of-sages']??0)>0))return {type:'card/bought',cardId:'oracles-acolyte'};
 if(!(v.owned['council-of-sages']??0)&&v.resources.coins===4&&available(v,'council-of-sages'))return {type:'card/bought',cardId:'council-of-sages'};
 return base;
}
