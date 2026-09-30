import {definition} from '../equal-turns/source/src/lib/game/actions';
import {purchasePlan,isEnding} from '../equal-turns/source/scripts/balance/planning';
import type {View} from '../equal-turns/source/scripts/balance/strategy';

// Public-score safety check for a P1 ending. Include the best affordable
// remainder of this turn before rejecting a purchase; never inspect a reply hand.
export function unsafeReplyPurchase(v:View,id:string,margin:number):boolean{
 const supply={...v.supply,[id]:v.supply[id]-1};
 if(!isEnding(supply))return false;
 const vp=definition(id).vp??0;
 const next={...v,supply,myScore:v.myScore+vp,owned:{...v.owned,[id]:(v.owned[id]??0)+1},
  resources:{...v.resources,coins:v.resources.coins-definition(id).cost!,buys:v.resources.buys-1},phase:'buys' as const};
 const rest=purchasePlan(next,c=>definition(c).vp??0);
 return next.myScore+rest.vp<Math.max(...v.scores)+margin;
}
