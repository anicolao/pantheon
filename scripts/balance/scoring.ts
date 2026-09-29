import {definition,type ActionCommand} from '../../src/lib/game/actions';
import {purchasePlan,gainOutcome} from './planning';
import type {View} from './strategy';

/** Shared safe scoring basket, recomputed after every buy. Positive-share endings
 * take precedence; known losing endings remain protected. */
export function pointPurchase(view:View,eligible:(id:string)=>boolean):ActionCommand|undefined {
 if(view.resources.buys<=0)return;
 const plan=purchasePlan(view,id=>eligible(id)?definition(id).vp??0:0);
 if(plan.cards[0]&&(plan.share!==null&&plan.share>0||plan.utility>0))return {type:'card/bought',cardId:plan.cards[0]};
}
/** Safe ordinary gains; the caller supplies scoring eligibility. */
export function pointGain(view:View,legal:string[],pointEligible:(id:string)=>boolean):string|undefined {
 const safe=legal.filter(id=>!view.bannedCards.includes(id)&&view.supply[id]>0&&gainOutcome(view,id)!==0);
 const wins=safe.filter(id=>(gainOutcome(view,id)??0)>0);
 const eligible=wins.length?wins:safe.filter(pointEligible);
 return eligible.sort((a,b)=>(gainOutcome(view,b)??0)-(gainOutcome(view,a)??0)||(definition(b).vp??0)-(definition(a).vp??0)||definition(a).cost!-definition(b).cost!||a.localeCompare(b))[0];
}
