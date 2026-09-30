import {definition,type ActionCommand} from '../../src/lib/game/actions';
import {publicHorizon,purchasePlan,gainOutcome} from './planning';
import {moneyEstimate,moneyAfter} from './money';
import {pointPurchase,pointGain} from './scoring';
import type {View,Profile} from './strategy';

export const endGamePolicies=['engine','turn-1','turn-2','turn-3','redraw-25','redraw-50','redraw-75','redraw-value','redraw-tempo','payback'] as const;
export type EndGamePolicy=typeof endGamePolicies[number];
export const defaultEndGamePolicy:EndGamePolicy='turn-2';
/** Attach the validated default (or an explicit experimental policy) to any
 * parent. Historical Race/boolean overlays are replaced, never stacked. */
export function withEndGame(profile:Profile,policy:EndGamePolicy=defaultEndGamePolicy):Profile {
 const result={...profile,endGamePolicy:policy};
 delete result.endGame;delete result.race;
 return result;
}

/** Historical boolean overlay is retained solely for recorded experiments. */
export const endGameActive=(view:View)=>view.endGamePolicy?scoringActive(view,view.endGamePolicy):publicHorizon(view)<=2;
const points=(id:string)=>(definition(id).vp??0)>0;
export const endGamePurchase=(view:View)=>endGameActive(view)?pointPurchase(view,points):undefined;
export const endGameGain=(view:View,legal:string[])=>endGameActive(view)?pointGain(view,legal,points):undefined;

/** Probability that a discard acquisition is drawn at least once before the
 * forecast ending. Counts and observed throughput only; never inspect order.
 * At the first shuffle, all old draw-pile cards have left it. Current hand/play
 * and intervening draws are conservatively included in the shuffle pool.
 * Future gains grow that pool by one per turn. This is a forecast, not certainty. */
export function acquisitionRedraw(view:View,horizon=publicHorizon(view)):number {
 const size=Object.values(view.owned).reduce((a,b)=>a+b,0);
 const rate=Math.max(5,view.drawsPerTurn??5),remaining=Math.max(0,view.drawPileCount??view.unseenCount);
 const futureDraws=Math.max(0,horizon)*rate;
 if(view.choice?.kind==='gain'&&view.choice.topdeck)return Math.min(1,futureDraws);
 const afterShuffle=Math.max(0,futureDraws-remaining);
 const pool=Math.max(1,size+1+Math.max(0,Math.ceil(remaining/rate)-1));
 return Math.min(1,afterShuffle/pool);
}
export function scoringActive(view:View,policy:EndGamePolicy):boolean {
 const h=publicHorizon(view);
 if(policy==='engine')return h<=3;
 if(policy==='redraw-tempo'||policy==='payback')return acquisitionRedraw(view)<=0.25;
 if(policy==='redraw-value')return acquisitionRedraw(view)<=0.25;
 if(policy.startsWith('turn-'))return h<=Number(policy.slice(5));
 return acquisitionRedraw(view)<=Number(policy.slice(7))/100;
}
/** Extracted v11 Engine point/coin values, available to every parent. */
export function legacyPointValue(view:View,id:string,late:boolean):number|undefined {
 if(id==='acropolis')return 14;
 if(id==='polis')return late?9:0.4;
 if(id==='hamlet')return late?2.5:-1;
 if(id==='talent')return late?6:9;
}
// A weak positive prior avoids declaring infinite time after a quiet round.
export function tempoHorizon(view:View):number {
 const rate=(id:string)=>Math.max(id==='acropolis'?0.25:0.1,view.supplyRates?.[id]??0);
 const depletion=Object.entries(view.supply).map(([id,n])=>n/rate(id)).sort((a,b)=>a-b);
 return Math.max(0,Math.min(12,view.supply.acropolis/rate('acropolis'),depletion[2]??12));
}
/** Point-equivalent marginal future hand income after the next shuffle. */
export function paybackValue(view:View,id:string):number {
 const rate=Math.max(5,view.drawsPerTurn??5),delay=view.choice?.topdeck?0:(view.drawPileCount??view.unseenCount)/rate;
 const opportunities=Math.max(0,publicHorizon(view)-delay);
 const top=Object.keys(view.supply).filter(c=>(definition(c).vp??0)>0).sort((a,b)=>(definition(b).vp??0)-(definition(a).vp??0))[0];
 const conversion=top?(definition(top).vp??0)/Math.max(1,definition(top).cost??1):0.75;
 return (definition(id).vp??0)+opportunities*conversion*(moneyAfter(view,id).mean-moneyEstimate(view).mean);
}
/** Smooth analogue of Engine's scoring utilities, driven by expected reuse. */
export function redrawValue(view:View,id:string):number|undefined {
 const use=acquisitionRedraw(view);
 if(id==='acropolis')return 14;
 if(id==='polis')return 0.4+8.6*(1-use);
 if(id==='hamlet')return -1+3.5*(1-use);
 if(id==='talent')return 6+3*use;
}
/** New policies own all discretionary point acquisition. Top-tier scoring stays
 * available throughout; weaker points are zero until the selected trigger. */
export function policyCardValue(view:View,policy:EndGamePolicy,id:string):number|undefined {
 if(policy==='redraw-value')return redrawValue(view,id);
 if(policy==='engine')return legacyPointValue(view,id,scoringActive(view,policy));
 const vp=definition(id).vp??0;
 if(vp<=0)return;
 const top=Math.max(0,...Object.keys(view.supply).map(x=>definition(x).vp??0));
 return vp===top?14:policy!=='payback'&&scoringActive(view,policy)?vp*3:-1;
}
export function investmentFactor(view:View,profile:Profile):number {
 if(profile.endGamePolicy==='redraw-value')return Math.max(0.1,acquisitionRedraw(view));
 if(profile.endGamePolicy)return profile.endGamePolicy==='engine'&&scoringActive(view,'engine')?0.35:1;
 return publicHorizon(view)<=profile.parameters.scoringAt?0.35:1;
}
export function sharedPointPurchase(view:View,policy:EndGamePolicy,economic:(id:string)=>number):ActionCommand|undefined {
 if(view.resources.buys<=0)return;
 if(policy==='payback'){
  const plan=purchasePlan(view,id=>paybackValue(view,id));
  if(plan.cards[0]&&points(plan.cards[0]))return {type:'card/bought',cardId:plan.cards[0]};
  return;
 }
 if(policy!=='engine'&&policy!=='redraw-value')return scoringActive(view,policy)?pointPurchase(view,points):undefined;
 const plan=purchasePlan(view,id=>policyCardValue(view,policy,id)??economic(id));
 if(plan.cards[0]&&points(plan.cards[0]))return {type:'card/bought',cardId:plan.cards[0]};
}
export function sharedPointGain(view:View,policy:EndGamePolicy,legal:string[],economic:(id:string)=>number):string|undefined {
 if(policy==='payback'){
  const safe=legal.filter(id=>view.supply[id]>0&&!view.bannedCards.includes(id)&&gainOutcome(view,id)!==0);
  const best=safe.sort((a,b)=>(gainOutcome(view,b)??0)-(gainOutcome(view,a)??0)||paybackValue(view,b)-paybackValue(view,a)||a.localeCompare(b))[0];
  return best&&points(best)&&paybackValue(view,best)>0?best:undefined;
 }
 if(policy!=='engine'&&policy!=='redraw-value')return scoringActive(view,policy)?pointGain(view,legal,points):undefined;
 const safe=legal.filter(id=>view.supply[id]>0&&!view.bannedCards.includes(id)&&gainOutcome(view,id)!==0);
 const wins=safe.filter(id=>(gainOutcome(view,id)??0)>0);
 const score=(id:string)=>policyCardValue(view,policy,id)??economic(id);
 const best=(wins.length?wins:safe).sort((a,b)=>(gainOutcome(view,b)??0)-(gainOutcome(view,a)??0)||score(b)-score(a)||a.localeCompare(b))[0];
 return best&&points(best)&&score(best)>0?best:undefined;
}

/** Historical Money scoring remains an explicit control, not a base objective. */
export function moneyPointEligible(vp:number,topVP:number,income:number,sharedPolicy:boolean):boolean {
 return vp>0&&(vp===topVP||!sharedPolicy&&income>=8);
}
