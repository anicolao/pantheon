import {moneyPointEligible} from './end-game';
import { applyPlayCommand, definition, initialTurn, leaderEffects, actionEffects, type ActionCommand, type PlayVariant } from '../../src/lib/game/actions';
import { createPrng } from '../../src/lib/game/random';
import type { CardInstance, SetupState } from '../../src/lib/game/setup';
import type { Observation } from './bot';
import { cardFeatures, effectFeatures, type Features } from './engine';
import { treasureValue, purchasePlan, gainOutcome } from './planning';
import type { View } from './strategy';

type MoneyView = Observation & { leaderBonus?: Features; play?: CardInstance[]; endGamePolicy?: string };
export type MoneyEstimate = { mean: number; samples: number };
const permutations = 16;
const cache = new Map<string, MoneyEstimate>();
const remember=(key:string,value:MoneyEstimate)=>{
 if(cache.size>=50000)cache.delete(cache.keys().next().value!);
 cache.set(key,value);return value;
};
const ranks = new Map<string, number[]>();
const bonus = (view: MoneyView) => view.leaderBonus ?? effectFeatures(leaderEffects(view.leader, view.variant));
const expanded = (owned: Record<string, number>): CardInstance[] => Object.entries(owned).sort(([a],[b])=>a.localeCompare(b)).flatMap(([cardId,n])=>Array.from({length:n},(_,copy)=>({cardId,copy,id:`ev-${cardId}-${copy}`})));
function rank(id: string, sample: number): number {
  if (!ranks.has(id)) { const random=createPrng(`money-ev-v1:${id}`); ranks.set(id,Array.from({length:permutations},()=>random())); }
  return ranks.get(id)![sample];
}
/** Greedy cash play: preserve the Action chain, then prefer expected coin payload. */
function actionValue(view: MoneyView, card: CardInstance): number {
  const remaining={...view.owned};
  for(const c of [...view.hand,...(view.play??[])])remaining[c.cardId]=Math.max(0,(remaining[c.cardId]??0)-1);
  const n=Object.values(remaining).reduce((a,b)=>a+b,0);
  const density=Object.entries(remaining).reduce((sum,[id,count])=>sum+count*treasureValue(id),0)/Math.max(1,n);
  const territories=Object.entries(remaining).reduce((sum,[id,count])=>sum+count*Number(definition(id).type==='Territory'),0)/Math.max(1,n);
  const f=cardFeatures(card.cardId, view.variant),trigger=!view.leaderUsed&&definition(card.cardId).god===definition(view.leader).god?bonus(view):effectFeatures([]);
  const preserves=view.resources.actions-1+f.actions+trigger.actions>0;
  const otherActions=view.hand.some(c=>c.id!==card.id&&definition(c.cardId).type==='Action');
  return f.coins+trigger.coins+Math.min(n,f.draw+trigger.draw)*density+2*f.reveal*territories
    +(preserves&&otherActions&&(f.actions+trigger.actions)>0?100:0);
}
export function moneyAction(view: MoneyView, extra: (card: CardInstance) => number = () => 0): CardInstance | undefined {
  return view.hand.filter(c=>definition(c.cardId).type==='Action'&&actionEffects(c.cardId,view.variant).length>0).sort((a,b)=>actionValue(view,b)+extra(b)-actionValue(view,a)-extra(a)||a.id.localeCompare(b.id))[0];
}
export function moneyDiscard(view: MoneyView): string[] {
  const value=(c:CardInstance)=>treasureValue(c.cardId) || (definition(c.cardId).type==='Action'&&view.resources.actions>0 ? Math.max(0,actionValue(view,c)) : 0);
  return [...view.hand].sort((a,b)=>value(a)-value(b)||a.id.localeCompare(b.id)).slice(0,view.choice!.max).map(c=>c.id);
}
/** Expected spendable coins from a fresh five-card hand, including legal Action play.
 * Stratified samples (16 shuffled orders, every cyclic rotation) depend only on public composition, never the game's seed/order. Common per-copy
 * ranks pair alternative decks. Pure-Treasure/territory means are analytic (no sampling error).
 */
export function moneyEstimate(view: MoneyView, owned=view.owned): MoneyEstimate {
  const entries=Object.entries(owned).filter(([,n])=>n>0).sort(([a],[b])=>a.localeCompare(b));
  const canGain=entries.some(([id])=>cardFeatures(id, view.variant).gain>0);
  const features=bonus(view),disabled=Object.values(features).every(n=>n===0);
  const key=JSON.stringify([view.variant??'standard',entries,disabled?null:view.leader,features,canGain?view.supply:null]);
  const cached=cache.get(key);if(cached)return cached;
  const cards=expanded(Object.fromEntries(entries));
  const noActions=cards.every(c=>definition(c.cardId).type!=='Action');
  let mean=noActions?Math.min(5,cards.length)*cards.reduce((s,c)=>s+treasureValue(c.cardId),0)/Math.max(1,cards.length):undefined;
  // Exact mean for a single simple income/draw Action: no terminal collisions or choices.
  const actions=cards.filter(c=>definition(c.cardId).type==='Action');
  if(actions.length===1) {
    const f=cardFeatures(actions[0].cardId, view.variant), trigger=definition(actions[0].cardId).god===definition(view.leader).god?bonus(view):effectFeatures([]);
    if(!f.discard&&!f.reveal&&!f.gain) {
      const total=cards.reduce((s,c)=>s+treasureValue(c.cardId),0), n=cards.length, opened=Math.min(5,n)/Math.max(1,n);
      mean=opened*total+opened*(f.coins+trigger.coins+Math.min(f.draw+trigger.draw,Math.max(0,n-5))*total/Math.max(1,n-1));
    }
  }
  if(mean!==undefined) { const exact={mean,samples:0}; return remember(key,exact); }
  const variants:PlayVariant[]=['standard','thaleia-draw','leader-buffs','thaleia-buy','thaleia-actions'];
  const variant=view.variant==='base-game'?'base-game':variants.find(v=>JSON.stringify(effectFeatures(leaderEffects(view.leader,v)))===JSON.stringify(bonus(view))) ?? 'standard';
  let sum=0;
  const samples=permutations*Math.max(1,cards.length);
  for(let permutation=0;permutation<permutations;permutation++) {
   const order=[...cards].sort((a,b)=>rank(a.id,permutation)-rank(b.id,permutation)||a.id.localeCompare(b.id));
   for(let offset=0;offset<Math.max(1,cards.length);offset++) {
    const sample=permutation*Math.max(1,cards.length)+offset;
    const deck=[...order.slice(offset),...order.slice(0,offset)];
    const game:SetupState={phase:'playing',seed:`money-ev-v1:${sample}`,turn:{...initialTurn(),leaderUsed:disabled},supply:{...view.supply},trash:[],publicActivity:[],movements:[],turnOrder:['ev'],draftOrder:[],leaders:{ev:view.leader},decks:{ev:{hand:deck.splice(0,5),deck,discard:[],play:[]}},sharedEvents:[],dealtAtSequence:null,resources:{actions:1,buys:1,coins:0,worship:1},playerCount:2,players:[{uid:'ev',name:'EV'}],activity:[]};
    let commands=0;
    while(game.turn.phase==='actions') {
      if(++commands>1000)throw new Error('Money expectation action guard');
      const zones=game.decks.ev;
      const observed:MoneyView={...view,owned,hand:zones.hand,play:zones.play,resources:game.resources,phase:'actions',choice:game.turn.choice,leaderUsed:game.turn.leaderUsed};
      let command:ActionCommand;
      if(game.turn.choice) {
        const c=game.turn.choice;
        let targets:string[]=[];
        if(c.kind==='discard') targets=moneyDiscard(observed);
        else if(c.kind==='gain'&&c.min>0) {
          // Discard gains do not add coins to this hand unless a later draw reshuffles them.
          const legal=Object.keys(game.supply).filter(id=>game.supply[id]>0&&definition(id).cost!==null&&definition(id).cost!<=c.limit!&&(!c.actionOnly||definition(id).type==='Action'));
          const density=cards.reduce((s,c)=>s+treasureValue(c.cardId),0)/Math.max(1,cards.length);
          const payload=(id:string)=>treasureValue(id)+cardFeatures(id, view.variant).coins+cardFeatures(id, view.variant).draw*density;
          legal.sort((a,b)=>payload(b)-payload(a)||a.localeCompare(b));targets=legal.slice(0,1);
        }
        // Optional trash/upgrade has no future-turn premium in a one-hand coin objective.
        command={type:'choice/resolved',choiceId:c.id,targets};
      } else {
        const action=game.resources.actions>0?moneyAction(observed):undefined;
        command=action?{type:'action/played',instanceId:action.id}:{type:'phase/advanced'};
      }
      applyPlayCommand(game,'ev',command,commands,variant);
    }
    const coins=game.resources.coins+game.decks.ev.hand.reduce((s,c)=>s+treasureValue(c.cardId),0);
    sum+=coins;
   }
  }
  const result={mean:sum/samples,samples};
  return remember(key,result);
}
export function moneyAfter(view: MoneyView, id: string): MoneyEstimate {
  return moneyEstimate(view,{...view.owned,[id]:(view.owned[id]??0)+1});
}
/** Cash in top-value points now; other acquisitions retain the whole-deck EV rule. */
export function moneyBuy(view: MoneyView, legal?: string[], mandatory=false, premium: (id: string) => number = () => 0): string | undefined {
  const ids=legal??Object.keys(view.supply).filter(id=>view.supply[id]>0&&definition(id).cost!==null&&definition(id).cost!<=view.resources.coins);
  const options=ids.map(id=>({id,ev:moneyAfter(view,id).mean,bonus:premium(id),vp:definition(id).vp??0}));
  // A future-income floor must not veto the best scoring opportunity already in hand.
  // Use the whole supply, not just affordable/safe cards, so cheap points do not become
  // "top tier" merely because the actual top tier is unaffordable or a losing ending.
  const topVP=Math.max(0,...Object.keys(view.supply).map(id=>definition(id).vp??0));
  const points=options.filter(c=>moneyPointEligible(c.vp,topVP,c.ev,!!view.endGamePolicy));
  if(points.length)return points.sort((a,b)=>b.vp-a.vp||b.ev-a.ev||definition(a.id).cost!-definition(b.id).cost!||a.id.localeCompare(b.id))[0].id;
  const ranked=options.sort((a,b)=>(b.ev+b.bonus)-(a.ev+a.bonus)||definition(a.id).cost!-definition(b.id).cost!||a.id.localeCompare(b.id));
  const best=ranked[0];
  // Compare to the global maximum: pairwise epsilon comparators are not transitive.
  const chosen=best&&(ranked.find(c=>definition(c.id).type==='Treasure'&&c.ev+c.bonus>=best.ev+best.bonus-0.035-1e-9)??best);
  return chosen&&(mandatory||chosen.ev+chosen.bonus>moneyEstimate(view).mean+1e-9)?chosen.id:undefined;
}
/** Retain exact ending protection, including winning multi-buy sequences. Recompute EV after each buy. */
export function moneyPurchase(view: View, premium: (id: string) => number = () => 0): ActionCommand {
  if(view.resources.buys<=0)return {type:'turn/ended'};
  const finish=purchasePlan(view,id=>(definition(id).vp??0));
  if(finish.share!==null&&finish.share>0&&finish.cards[0])return {type:'card/bought',cardId:finish.cards[0]};
  const legal=Object.keys(view.supply).filter(id=>view.supply[id]>0&&!view.bannedCards.includes(id)&&definition(id).cost!==null&&definition(id).cost!<=view.resources.coins);
  const safe=legal.filter(id=>{
    const after={...view,resources:{...view.resources,coins:view.resources.coins-definition(id).cost!,buys:view.resources.buys-1}};
    return gainOutcome(after,id)!==0;
  });
  const id=moneyBuy(view,safe,false,premium);
  return id?{type:'card/bought',cardId:id}:{type:'turn/ended'};
}
