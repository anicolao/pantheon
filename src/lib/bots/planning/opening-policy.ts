import type {StandardView} from '../../../../standard-matrix/policy';
import {actionEffects,definition,type ActionCommand} from '../../game/actions';
import {thinOverride,type ThinRule} from './thin-policy';
export type OpeningRule={card:string;through:number;harbor:boolean;playAres:boolean;thin:ThinRule|null;spendBeforeBuy?:number};
const positiveActions=(id:string)=>actionEffects(id).some(e=>e.kind==='resource'&&e.resource==='actions'&&e.amount>0);
export function openingOverride(v:StandardView,base:ActionCommand,r:OpeningRule):ActionCommand{
 if(v.leader!=='doreios')return base;
 if(r.thin){const result=thinOverride(v,base,r.thin);if(result!==base)return result;}
 if(v.choice)return base;
 if(r.playAres&&!v.leaderUsed&&v.phase==='actions'&&v.resources.actions>0&&!v.hand.some(c=>definition(c.cardId).type==='Action'&&positiveActions(c.cardId))){
  const order=['victorious-procession','bronze-recruit','forge-of-heroes'];
  const card=order.map(id=>v.hand.find(c=>c.cardId===id)).find(Boolean);
  if(card)return {type:'action/played',instanceId:card.id};
 }
 if(r.spendBeforeBuy!==undefined&&v.phase!=='buys'&&v.resources.coins<=r.spendBeforeBuy&&(base.type==='card/bought'||base.type==='turn/ended')&&v.hand.some(c=>definition(c.cardId).type==='Treasure'))return {type:'treasures/played'};
 if(base.type!=='card/bought'||v.myTurns>r.through||v.finalRound||v.resources.coins>=6)return base;
 const buy=(id:string)=>v.supply[id]>0&&!v.bannedCards.includes(id)&&definition(id).cost!<=v.resources.coins;
 if(r.card&&!(v.owned[r.card]??0)&&buy(r.card))return {type:'card/bought',cardId:r.card};
 const terminals=Object.entries(v.owned).reduce((n,[id,count])=>n+(definition(id).type==='Action'&&!positiveActions(id)?count:0),0);
 if(r.harbor&&terminals>=2&&!(v.owned['harbor-pilot']??0)&&buy('harbor-pilot'))return {type:'card/bought',cardId:'harbor-pilot'};
 return base;
}
