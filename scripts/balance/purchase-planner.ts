import {applyPlayCommand,definition,initialTurn,purchaseReason,type ActionCommand} from '../../src/lib/game/actions';
import {shuffle} from '../../src/lib/game/random';
import type {CardInstance,SetupState} from '../../src/lib/game/setup';
import type {Profile,View} from './strategy';
import {rolloutPlay,sampledValue,resourceDominates} from './sampled';

export const plannerSamples=8,investmentTurns=2;
export type PairEstimate={first?:string;second?:string;value:number;investment:number;terminal:number;followupRate:number;meanFollowupTurn:number|null};
const count=(cards:CardInstance[])=>{const result:Record<string,number>={};for(const c of cards)result[c.cardId]=(result[c.cardId]??0)+1;return result;};
const expand=(owned:Record<string,number>)=>Object.entries(owned).sort(([a],[b])=>a.localeCompare(b)).flatMap(([cardId,n])=>Array.from({length:Math.max(0,n)},(_,copy)=>({cardId,copy,id:'plan-'+cardId+'-'+copy})));
/** Preserve known zones; only the unobserved draw order is sampled. Without a
 * discard observation, conservatively treat all unseen cards as draw pile. */
function initial(view:View,sample:number,bank:string):SetupState{
 const hand=structuredClone(view.hand),play=structuredClone(view.play),discard=structuredClone(view.discard??[]),remaining={...view.owned};
 for(const c of [...hand,...play,...discard])remaining[c.cardId]=(remaining[c.cardId]??0)-1;
 if(Object.values(remaining).some(n=>n<0))throw Error('Planner zones exceed owned inventory');
 const deck=shuffle(expand(remaining),'purchase-pair-v1:'+bank+':'+sample);
 return {phase:'playing',undo:null,seed:'purchase-pair-v1:'+bank+':'+sample,turn:{...initialTurn(),phase:view.phase,leaderUsed:view.leaderUsed},supply:{...view.supply},trash:[],publicActivity:[],movements:[],turnOrder:['sample'],draftOrder:[],leaders:{sample:view.leader},decks:{sample:{hand,play,discard,deck}},sharedEvents:[],dealtAtSequence:null,resources:{...view.resources},playerCount:2,players:[{uid:'sample',name:'Sample'}],activity:[]};
}
/** Fixed-target continuation, selected across samples, not separately for each
 * hidden shuffle. It buys at the first publicly affordable opportunity within
 * two future turns (or now with remaining coins/Buy). No free acquisitions.
 * No target is replaced using the sampled hidden order. */
export function evaluatePurchasePair(view:View,profile:Profile,first?:string,second?:string,bank='search',samples=plannerSamples):PairEstimate{
 if(profile.samplingPolicy!=='raw')throw Error('Two-purchase planner requires the unchanged raw objective');
 let investment=0,terminal=0,acquired=0,delay=0;
 const disabled=Object.values(view.leaderBonus).every(n=>n===0);
 const topCost=Math.max(1,...Object.keys(view.supply).filter(id=>(definition(id).vp??0)>0).map(id=>definition(id).cost??0));
 for(let sample=0;sample<samples;sample++){
  const game=initial(view,sample,bank);let sequence=0,bought=false;
  const apply=(command:ActionCommand)=>{if(++sequence>3000)throw Error('Purchase planner command guard');applyPlayCommand(game,'sample',command,sequence,view.variant);};
  const buy=(id:string)=>{if(view.bannedCards.includes(id)||purchaseReason(game,'sample',id))return false;apply({type:'card/bought',cardId:id});return true;};
  if(first&&!buy(first))throw Error('Illegal first purchase: '+first);
  // Passing means end this turn; it cannot secretly make the second buy now.
  if(first&&second&&buy(second)){bought=true;acquired++;}
  apply({type:'turn/ended'});
  for(let turn=1;turn<=investmentTurns&&game.turn.phase!=='finished';turn++){
   game.turn.leaderUsed=disabled;
   const zones=game.decks.sample,targets=new Set(Object.values(zones).flat().map(c=>c.id)),seen=new Set(zones.hand.map(c=>c.id));
   while(true){
    const owned=count(Object.values(zones).flat());
    const observed:View={...view,owned,hand:zones.hand,play:zones.play,discard:zones.discard,supply:game.supply,resources:game.resources,phase:game.turn.phase,choice:game.turn.choice,leaderUsed:game.turn.leaderUsed,unseenCount:Math.max(0,targets.size-seen.size),events:[],bannedEvents:[]};
    const command=rolloutPlay(observed,!!profile.thinning);
    if(command.type==='turn/ended'){
     const coins=game.resources.coins,coverage=seen.size/Math.max(1,targets.size);
     // The exact existing per-turn Money/Engine objective, before payment.
     investment+=coins+(profile.family==='engine'?8*coverage*Math.min(1,coins/topCost):0);
     if(!bought&&second&&buy(second)){bought=true;acquired++;delay+=turn;}
     apply(command);break;
    }
    const start=game.movements.length;apply(command);
    for(const m of game.movements.slice(start))if(m.kind==='draw'&&m.card&&targets.has(m.card.id))seen.add(m.card.id);
   }
  }
  // Independent fresh-shuffle composition evaluation; never inspect the order
  // remaining in the investment sample. Finished games have no future income.
  if(game.turn.phase!=='finished'){
   const owned=count(Object.values(game.decks.sample).flat());
   terminal+=sampledValue({...view,owned,supply:game.supply},profile);
  }
 }
 return {first,second,value:(investment+terminal)/samples,investment:investment/samples,terminal:terminal/samples,followupRate:acquired/samples,meanFollowupTurn:acquired?delay/acquired:null};
}
const tie=(a:PairEstimate,b:PairEstimate)=>b.value-a.value||(a.first?definition(a.first).cost!:0)-(b.first?definition(b.first).cost!:0)||(a.first??'').localeCompare(b.first??'')||(a.second??'').localeCompare(b.second??'');
/** Exhaustive complementary pairs: every legal first buy survives to evaluation.
 * Select one fixed continuation per first on the search bank, then compare those
 * continuations on a disjoint validation bank. Only return the first decision.
 * Economic purchase planning only; the common scoring/endgame layer stays above it. */
export function twoPurchasePlan(view:View,profile:Profile,ids:string[]):{first?:string;options:PairEstimate[];evaluatedPairs:number}{
 const firsts=[undefined,...[...new Set(ids)].filter(id=>!view.bannedCards.includes(id)&&view.supply[id]>0&&definition(id).cost!==null&&definition(id).cost!<=view.resources.coins&&view.resources.buys>0).sort()];
 const seconds=[undefined,...Object.keys(view.supply).filter(id=>view.supply[id]>0&&!view.bannedCards.includes(id)&&definition(id).cost!==null).sort()];
 const options:PairEstimate[]=[];let evaluatedPairs=0;
 for(const first of firsts){
  const pairs=seconds.map(second=>{evaluatedPairs++;return evaluatePurchasePair(view,profile,first,second);}).sort(tie);
  const best=pairs[0];options.push(evaluatePurchasePair(view,profile,first,best.second,'validation'));
 }
 options.sort(tie);
 // Preserve v18's effect-based tie protection, but only AFTER every first has
 // received full pair evaluation. Keep all rows for diagnostics.
 const best=options.find(a=>!a.first||!options.some(b=>b.first&&resourceDominates(view,b.first,a.first!)));
 return {first:best?.first,options,evaluatedPairs};
}
