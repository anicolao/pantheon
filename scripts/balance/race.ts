import {definition,type ActionCommand} from '../../src/lib/game/actions';
import {publicHorizon,purchasePlan,gainOutcome} from './planning';
import type {Profile,View} from './strategy';

/** Race changes investment time and scoring, not the parent's economic objective. */
export function raceView(view:View,profile:Profile):View {
 if(!profile.race)return view;
 const cap=Math.min(3,profile.parameters.scoringAt);
 if(view.raceHorizon===cap)return view;
 return {...view,raceHorizon:cap};
}
export function racePointEligible(view:View,id:string):boolean {
 const points=definition(id).vp??0;
 const top=Math.max(0,...Object.keys(view.supply).map(card=>definition(card).vp??0));
 return points>0&&(points>=top/2||publicHorizon(view)<=1);
}
/** Shared safe scoring basket, recomputed after every buy. Positive-share endings
 * take precedence; known losing endings cannot be justified merely by racing. */
export function racePurchase(view:View,eligible=(id:string)=>racePointEligible(view,id)):ActionCommand|undefined {
 if(view.resources.buys<=0)return;
 const plan=purchasePlan(view,id=>eligible(id)?definition(id).vp??0:0);
 if(plan.cards[0]&&(plan.share!==null&&plan.share>0||plan.utility>0))return {type:'card/bought',cardId:plan.cards[0]};
}
/** Ordinary gains share early scoring. Upgrades retain objective-specific joint
 * removal/replacement evaluation, using the same shortened horizon. */
export function raceGain(view:View,legal:string[],pointEligible=(id:string)=>racePointEligible(view,id)):string|undefined {
 const safe=legal.filter(id=>!view.bannedCards.includes(id)&&view.supply[id]>0&&gainOutcome(view,id)!==0);
 const wins=safe.filter(id=>(gainOutcome(view,id)??0)>0);
 const eligible=wins.length?wins:safe.filter(pointEligible);
 return eligible.sort((a,b)=>(gainOutcome(view,b)??0)-(gainOutcome(view,a)??0)||(definition(b).vp??0)-(definition(a).vp??0)||definition(a).cost!-definition(b).cost!||a.localeCompare(b))[0];
}
