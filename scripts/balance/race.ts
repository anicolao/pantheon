import {definition} from '../../src/lib/game/actions';
import {pointPurchase,pointGain} from './scoring';
import {publicHorizon} from './planning';
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
export const racePurchase=(view:View,eligible=(id:string)=>racePointEligible(view,id))=>pointPurchase(view,eligible);
export const raceGain=(view:View,legal:string[],eligible=(id:string)=>racePointEligible(view,id))=>pointGain(view,legal,eligible);
