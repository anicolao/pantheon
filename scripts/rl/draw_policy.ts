/** Public-only teacher: invest surplus deck money in draw and supporting actions. */
import type {StandardView} from '../../standard-matrix/policy';
import {actionEffects,definition,type ActionCommand} from '../../src/lib/game/actions';
export type DrawRule={cashFloor:number;through:number;drawCap:number;mode:'council'|'academy'};
const actions=(id:string)=>definition(id).type!=='Action'?0:actionEffects(id).reduce((n,e)=>n+(e.kind==='resource'&&e.resource==='actions'?e.amount:0),0);
export function drawOverride(v:StandardView,base:ActionCommand,r:DrawRule):ActionCommand{
 if(v.leader!=='doreios'||v.choice)return base;
 // Newly introduced cantrips must resolve before terminal actions or treasures.
 if(v.phase==='actions'&&v.resources.actions>0){
  const card=v.hand.filter(c=>['harbor-pilot','sacred-academy'].includes(c.cardId)).sort((a,b)=>actions(b.cardId)-actions(a.cardId))[0];
  if(card&&(base.type!=='action/played'||actions(v.hand.find(c=>c.id===base.instanceId)!.cardId)<actions(card.cardId)))return {type:'action/played',instanceId:card.id};
 }
 if(base.type!=='card/bought'||v.finalRound||v.myTurns>r.through||v.supply.acropolis<=4||v.resources.coins>=8)return base;
 // Never lock out held money to make an artificially cheap purchase.
 if(v.phase!=='buys'&&v.hand.some(c=>definition(c.cardId).type==='Treasure'))return {type:'treasures/played'};
 const cash=(v.owned.obol??0)+2*(v.owned.drachma??0)+3*(v.owned.talent??0);
 if(cash<r.cashFloor)return base;
 const draw=(v.owned['council-of-sages']??0)+(v.owned['sacred-academy']??0);
 if(draw>=r.drawCap)return base;
 const can=(id:string)=>v.supply[id]>0&&!v.bannedCards.includes(id)&&definition(id).cost!<=v.resources.coins;
 if(r.mode==='academy'&&can('sacred-academy'))return {type:'card/bought',cardId:'sacred-academy'};
 const terminals=Object.entries(v.owned).reduce((n,[id,count])=>n+(definition(id).type==='Action'&&actions(id)===0?count:0),0);
 const extra=Object.entries(v.owned).reduce((n,[id,count])=>n+Math.max(0,actions(id)-1)*count,0);
 if(terminals<1+extra&&can('council-of-sages'))return {type:'card/bought',cardId:'council-of-sages'};
 if(terminals>=1+extra&&can('harbor-pilot'))return {type:'card/bought',cardId:'harbor-pilot'};
 return base;
}
