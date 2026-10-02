import {applyPlayCommand,definition,initialTurn,actionEffects,type ActionCommand,type Choice} from '../../src/lib/game/actions';
import {createPrng} from '../../src/lib/game/random';
import type {CardInstance,SetupState} from '../../src/lib/game/setup';
import {twoPurchasePlan} from './purchase-planner';
import {moneyAction,moneyDiscard} from './money';
import {cardFeatures,enginePlayPriority} from './engine';
import {treasureValue,publicHorizon,purchasePlan,gainOutcome,endingShare,availableCoins} from './planning';
import {endGameActive,sharedPointPurchase,sharedPointGain} from './end-game';
import type {View,Profile} from './strategy';

export const rolloutSamples=64,rolloutTurns=3;
export type SamplingMethod='random'|'stratified';
export type SamplingPolicy='income'|'balanced'|'reliable'|'late'|'coverage'|'raw';
export type RolloutEstimate={coins:number;draws:number;income:number;balanced:number;reliable:number;fundedCoverage:number;lateBalanced:number;lateCoverage:number;fullDeckRate:number;samples:number;turns:number;perTurn:{coins:number;draws:number}[]};
const cache=new Map<string,RolloutEstimate>();
const ranks=new Map<string,number[]>();
function rank(id:string,sample:number):number{
 let values=ranks.get(id);if(!values){const random=createPrng('shuffle-effective-v1:'+id);values=Array.from({length:rolloutSamples},()=>random());ranks.set(id,values);}
 return values[sample];
}
const inventory=(cards:CardInstance[])=>{const owned:Record<string,number>={};for(const c of cards)owned[c.cardId]=(owned[c.cardId]??0)+1;return owned;};
const cardsOf=(owned:Record<string,number>)=>Object.entries(owned).filter(([,n])=>n>0).sort(([a],[b])=>a.localeCompare(b)).flatMap(([cardId,n])=>Array.from({length:n},(_,copy)=>({cardId,copy,id:'sample-'+cardId+'-'+copy})));
function legal(view:View,limit:number,actionOnly=false):string[]{return Object.keys(view.supply).filter(id=>view.supply[id]>0&&!view.bannedCards.includes(id)&&definition(id).cost!==null&&definition(id).cost!<=limit&&(!actionOnly||definition(id).type==='Action'));}
/** One common, bounded rollout controller. No parent-family branch, purchase
 * recursion, named opening, or look at the shuffled draw order. */
export function rolloutPlay(view:View,thinning:boolean):ActionCommand{
 const choice=view.choice;
 const keep=(c:CardInstance)=>{
  const f=cardFeatures(c.cardId,view.variant);
  return treasureValue(c.cardId)+(definition(c.cardId).type==='Action'&&view.resources.actions>0?Math.max(0,enginePlayPriority(view,c)):0);
 };
 if(choice){
  let targets:string[]=[];
  if(choice.kind==='discard')targets=moneyDiscard(view);
  if(choice.kind==='gain'){
   // Bounded continuation for effects inside a sample. Identical for both metrics.
   const value=(id:string)=>{const f=cardFeatures(id,view.variant);return treasureValue(id)+f.coins+Math.max(0,f.draw-f.discard)+0.25*f.actions;};
   const ids=legal(view,choice.limit!,choice.actionOnly).sort((a,b)=>value(b)-value(a)||definition(a).cost!-definition(b).cost!||a.localeCompare(b));
   if(ids[0]&&(choice.min>0||value(ids[0])>0))targets=[ids[0]];
  }
  if(choice.kind==='trash'){
   let cash=Object.entries(view.owned).reduce((s,[id,n])=>s+n*(treasureValue(id)+cardFeatures(id,view.variant).coins),0);
   const sorted=[...view.hand].sort((a,b)=>keep(a)-keep(b)||a.id.localeCompare(b.id));
   for(const c of sorted){
    const f=cardFeatures(c.cardId,view.variant),coin=treasureValue(c.cardId);
    const inert=definition(c.cardId).type==='Territory'&&(definition(c.cardId).vp??0)<=1||definition(c.cardId).type==='Action'&&Object.values(f).every(n=>n===0);
    if(targets.length<choice.max&&(targets.length<choice.min||thinning&&(inert||coin===1&&cash-coin>=8))){targets.push(c.id);cash-=coin;}
   }
  }
  return {type:'choice/resolved',choiceId:choice.id,targets};
 }
 if(view.phase==='actions'){
  const available=Math.max(0,Object.values(view.owned).reduce((s,n)=>s+n,0)-view.hand.length-view.play.length);
  // Do not pay a mandatory discard for an empty draw. Restrict this shortcut
  // to the neutral game, where no leader trigger can make the play useful.
  const harmful=(c:CardInstance)=>{
   const f=cardFeatures(c.cardId,view.variant);
   return view.variant==='base-game'&&available===0&&f.discard>0&&f.actions<=1&&!f.coins&&!f.gain&&!f.trash&&!f.reveal;
  };
  const bonus=(c:CardInstance)=>{
   if(harmful(c))return -1e9;
   const junk=view.hand.filter(x=>x.id!==c.id&&(definition(x.cardId).type==='Territory'&&(definition(x.cardId).vp??0)<=1||definition(x.cardId).type==='Action'&&Object.values(cardFeatures(x.cardId,view.variant)).every(n=>n===0))).length;
   return thinning?6*Math.min(cardFeatures(c.cardId,view.variant).trash,junk):0;
  };
  const selected=view.resources.actions>0?moneyAction(view,bonus):undefined;
  const action=selected&&!harmful(selected)?selected:undefined;
  return action?{type:'action/played',instanceId:action.id}:{type:'phase/advanced'};
 }
 if(view.phase==='treasures'&&view.hand.some(c=>definition(c.cardId).type==='Treasure'))return {type:'treasures/played'};
 return {type:'turn/ended'};
}
/** Sample every composition, including pure Treasure decks. Each sample starts
 * with a fresh shuffle and plays three consecutive production-rule turns.
 * No future buys or Worship; effects, cleanup and reshuffles remain real.
 * The same public-state sample bank and controller produce all objective metrics. */
export function rolloutEstimate(view:View,owned=view.owned,thinning=false,method:SamplingMethod='random'):RolloutEstimate{
 const entries=Object.entries(owned).filter(([,n])=>n>0).sort(([a],[b])=>a.localeCompare(b));
 const disabled=Object.values(view.leaderBonus).every(n=>n===0);
 const canGain=entries.some(([id])=>definition(id).type==='Action'&&actionEffects(id,view.variant).some(e=>e.kind==='gain'||e.kind==='trash'&&(e.forge||e.offering)));
 const cards=cardsOf(Object.fromEntries(entries));
 let added=0;for(const c of cards)if(c.copy>=(view.owned[c.cardId]??0))c.id='sample-candidate-'+added++;
 const key=JSON.stringify([entries,cards.map(c=>c.id),view.variant??'standard',disabled?null:view.leader,view.leaderBonus,canGain?view.supply:null,canGain?view.bannedCards:null,thinning,method,view.supply.acropolis===0||Object.values(view.supply).filter(n=>n===0).length>=3]);
 const saved=cache.get(key);if(saved)return saved;
 const topCost=Math.max(1,...Object.keys(view.supply).filter(id=>(definition(id).vp??0)>0).map(id=>definition(id).cost??0));
 let income=0,balanced=0,reliable=0,fundedCoverage=0,lateBalanced=0,lateCoverage=0,fullDeckRate=0;
 const perTurn=Array.from({length:rolloutTurns},()=>({coins:0,draws:0}));
 const samples=method==='random'?rolloutSamples:8*Math.max(1,cards.length);
 for(let sample=0;sample<samples;sample++){
  const permutation=method==='random'?sample:Math.floor(sample/Math.max(1,cards.length));
  const offset=method==='random'?0:sample%Math.max(1,cards.length);
  const order=[...cards].sort((a,b)=>rank(a.id,permutation)-rank(b.id,permutation)||a.id.localeCompare(b.id));
  const deck=[...order.slice(offset),...order.slice(0,offset)];
  const game:SetupState={phase:'playing',undo:null,seed:'shuffle-effective-v1:sample:'+sample,turn:{...initialTurn(),leaderUsed:disabled},supply:{...view.supply},trash:[],publicActivity:[],movements:[],turnOrder:['sample'],draftOrder:[],leaders:{sample:view.leader},decks:{sample:{hand:deck.splice(0,5),deck,discard:[],play:[]}},sharedEvents:[],dealtAtSequence:null,resources:{actions:1,buys:1,coins:0,worship:0},playerCount:2,players:[{uid:'sample',name:'Sample'}],activity:[]};
  let commands=0;
  for(let turn=0;turn<rolloutTurns&&game.turn.phase!=='finished';turn++){
   game.turn.leaderUsed=disabled;
   let draws=game.decks.sample.hand.length;
   const targets=new Set(Object.values(game.decks.sample).flat().map(c=>c.id)),seen=new Set(game.decks.sample.hand.map(c=>c.id));
   while(true){
    if(++commands>3000)throw Error('Three-turn rollout command guard');
    const zones=game.decks.sample,ownedNow=inventory(Object.values(zones).flat());
    const seenSize=Object.values(ownedNow).reduce((s,n)=>s+n,0);
    const observed:View={...view,owned:ownedNow,hand:zones.hand,play:zones.play,supply:game.supply,resources:game.resources,phase:game.turn.phase,choice:game.turn.choice,leaderUsed:game.turn.leaderUsed,unseenCount:Math.max(0,seenSize-draws),bannedEvents:[],events:[]};
    const command=rolloutPlay(observed,thinning);
    if(command.type==='turn/ended'){
     const coins=game.resources.coins,buys=game.resources.buys,coverage=seen.size/Math.max(1,targets.size);
     const useful=Math.min(coins,topCost*buys),opportunities=Math.min(buys,Math.floor(coins/topCost));
     income+=useful;balanced+=useful+topCost*0.5*opportunities;reliable+=useful+topCost*opportunities;
     if(turn===rolloutTurns-1){lateBalanced+=rolloutTurns*(useful+topCost*0.5*opportunities);lateCoverage+=rolloutTurns*coverage*Math.min(1,coins/topCost);}
     fundedCoverage+=coverage*Math.min(1,coins/topCost);fullDeckRate+=Number(seen.size===targets.size);
     perTurn[turn].coins+=coins;perTurn[turn].draws+=draws;
    }
    const start=game.movements.length;
    applyPlayCommand(game,'sample',command,commands,view.variant);
    if(command.type==='turn/ended')break;
    for(const m of game.movements.slice(start))if(m.kind==='draw'){draws++;if(m.card&&targets.has(m.card.id))seen.add(m.card.id);}
   }
  }
 }
 for(const t of perTurn){t.coins/=samples;t.draws/=samples;}
 const result={coins:perTurn.reduce((s,t)=>s+t.coins,0),draws:perTurn.reduce((s,t)=>s+t.draws,0),income:income/samples,balanced:balanced/samples,reliable:reliable/samples,fundedCoverage:fundedCoverage/samples,lateBalanced:lateBalanced/samples,lateCoverage:lateCoverage/samples,fullDeckRate:fullDeckRate/(samples*rolloutTurns),samples,turns:rolloutTurns,perTurn};
 if(cache.size>=12000)cache.delete(cache.keys().next().value!);cache.set(key,result);return result;
}
export function sampledValue(view:View,profile:Profile,owned=view.owned):number{
 const result=rolloutEstimate(view,owned,!!profile.thinning,profile.samplingMethod??'random'),policy=profile.samplingPolicy??'balanced';
 // Both metrics value usable spending; Engine also values actual unique-card
 // reach in proportion to the income that the resulting turn can support.
 if(policy==='raw')return result.coins+(profile.family==='engine'?8*result.fundedCoverage:0);
 if(policy==='late'||policy==='coverage')return result.lateBalanced+(profile.family==='engine'?(policy==='coverage'?32:8)*result.lateCoverage:0);
 return result[policy]+(profile.family==='engine'?{income:4,balanced:8,reliable:12}[policy]*result.fundedCoverage:0);
}
export function resourceDominates(view:View,a:string,b:string):boolean{
 if(view.variant!=='base-game'||a===b||definition(a).cost!==definition(b).cost||(definition(a).vp??0)!==(definition(b).vp??0))return false;
 const features=(id:string)=>{
  if(definition(id).type==='Treasure')return [treasureValue(id),0,0];
  if(definition(id).type!=='Action')return;
  const effects=actionEffects(id,view.variant);
  if(effects.some(e=>e.kind!=='resource'))return;
  const f=cardFeatures(id,view.variant);return [f.coins,f.actions-1,f.buys];
 };
 const x=features(a),y=features(b);
 return !!x&&!!y&&x.every((n,i)=>n>=y[i])&&x.some((n,i)=>n>y[i]);
}
export function sampledAfter(view:View,profile:Profile,id:string):number{
 return sampledValue({...view,supply:{...view.supply,[id]:Math.max(0,view.supply[id]-1)}},profile,{...view.owned,[id]:(view.owned[id]??0)+1});
}
/** All economic acquisitions use precisely the same sampled metric and tie rule. */
export function sampledGain(view:View,profile:Profile,ids:string[],mandatory=false):string|undefined{
 const safe=ids.filter(id=>gainOutcome(view,id)!==0);
 const options=(safe.length||!mandatory?safe:ids).map(id=>({id,value:sampledAfter(view,profile,id)})).sort((a,b)=>b.value-a.value||definition(a.id).cost!-definition(b.id).cost!||a.id.localeCompare(b.id));
 const best=options.find(c=>!options.some(other=>resourceDominates(view,other.id,c.id)));
 return best&&(mandatory||best.value>sampledValue(view,profile)+1e-9)?best.id:undefined;
}
function scoringTarget(view:View){
 const points=Object.keys(view.supply).filter(id=>(definition(id).vp??0)>0);
 const cost=Math.max(1,...points.map(id=>definition(id).cost??0));
 return {cost,vp:Math.max(0,...points.map(id=>definition(id).vp??0))};
}
export function objectivePointScale(view:View,profile:Profile):number{
 const {cost,vp}=scoringTarget(view),policy=profile.samplingPolicy??'balanced';
 const spending=cost*(policy==='income'||policy==='raw'?1:policy==='reliable'?2:1.5);
 const draw=profile.family==='engine'?({income:4,balanced:8,reliable:12,late:8,coverage:32,raw:8}[policy]):0;
 // A funded full-deck turn is worth one top scoring card. This is a
 // conservative utility calibration, not a learned conversion to win chance.
 return vp/(spending+draw);
}
function sampledTrash(view:View,profile:Profile,choice:Choice):ActionCommand{
 let best={targets:[] as string[],value:choice.min?-Infinity:0};
 const base=sampledValue(view,profile),horizon=publicHorizon(view),target=scoringTarget(view);
 const visit=(start:number,removed:CardInstance[])=>{
  if(removed.length>=choice.min){
   const owned={...view.owned};for(const c of removed)owned[c.cardId]--;
   const vp=removed.reduce((s,c)=>s+(definition(c.cardId).vp??0),0);
   const cash=removed.reduce((s,c)=>s+treasureValue(c.cardId),0);
   const future={...view,owned,myScore:view.myScore-vp};
   let next=sampledValue(future,profile),gainedVP=0;
   let ending=endingShare(view,-vp);
   if(removed.length&&(choice.forge||choice.offering)){
    const limit=removed.reduce((s,c)=>s+definition(c.cardId).cost!,0)+(choice.forge?2:typeof choice.offering==='number'?choice.offering:0);
    const ids=legal(future,limit).filter(id=>gainOutcome(future,id)!==0),gain=sampledGain(future,profile,ids,choice.offering!=='sum');
    if(gain){next=sampledAfter(future,profile,gain);gainedVP=definition(gain).vp??0;ending=gainOutcome(future,gain);}
    else if(choice.offering!=='sum')next=-Infinity;
   }
   let value=(next-base)*objectivePointScale(view,profile)*Math.max(0,horizon)/rolloutTurns+gainedVP-vp-cash*target.vp/target.cost;
   if(ending===0)value=-Infinity;
   else if(ending!==null)value=1000*ending+gainedVP-vp;
   const top=Math.max(0,...Object.keys(view.supply).map(id=>definition(id).vp??0));
   const scoring=Object.keys(view.supply).filter(id=>view.supply[id]>0&&(endGameActive(view)?(definition(id).vp??0)>0:definition(id).vp===top));
   value-=Math.max(0,...scoring.filter(id=>definition(id).cost!<=availableCoins(view)&&definition(id).cost!>availableCoins(view)-cash).map(id=>definition(id).vp??0));
   if(value>best.value+1e-9)best={targets:removed.map(c=>c.id),value};
  }
  if(removed.length<choice.max){
   // Copies of one definition yield the same inventory, cost and VP. Keep
   // the earliest representative, preserving tie order without duplicate work.
   const seen=new Set<string>();
   for(let i=start;i<view.hand.length;i++){
    if(seen.has(view.hand[i].cardId))continue;
    seen.add(view.hand[i].cardId);visit(i+1,[...removed,view.hand[i]]);
   }
  }
 };
 visit(0,[]);
 if(best.targets.length<choice.min)return rolloutPlay(view,!!profile.thinning);
 return {type:'choice/resolved',choiceId:choice.id,targets:best.targets};
}
export function sampledCommand(view:View,profile:Profile):ActionCommand{
 if(!['treasure','engine'].includes(profile.family))throw Error('Sampled objectives require Money or Engine');
 const choice=view.choice;
 if(choice?.kind==='trash')return profile.thinning?sampledTrash(view,profile,choice):rolloutPlay(view,false);
 if(choice?.kind==='gain'){
  const ids=legal(view,choice.limit!,choice.actionOnly);
  const winning=ids.filter(id=>(gainOutcome(view,id)??0)>0).sort((a,b)=>(gainOutcome(view,b)??0)-(gainOutcome(view,a)??0)||(definition(b).vp??0)-(definition(a).vp??0));
  const points=profile.endGamePolicy?sharedPointGain(view,profile.endGamePolicy,ids,id=>sampledAfter(view,profile,id)):undefined;
  const top=Math.max(0,...Object.keys(view.supply).map(id=>definition(id).vp??0));
  const topPoints=ids.filter(id=>definition(id).vp===top&&top>0&&gainOutcome(view,id)!==0);
  const id=winning[0]??points??topPoints[0]??sampledGain(view,profile,ids,choice.min>0);
  return {type:'choice/resolved',choiceId:choice.id,targets:id?[id]:[]};
 }
 if(choice||view.phase==='actions'||view.phase==='treasures'&&view.hand.some(c=>definition(c.cardId).type==='Treasure'))return rolloutPlay(view,!!profile.thinning);
 if(view.resources.buys<=0)return {type:'turn/ended'};
 const finish=purchasePlan(view,id=>definition(id).vp??0);
 if(finish.share!==null&&finish.share>0&&finish.cards[0])return {type:'card/bought',cardId:finish.cards[0]};
 const points=profile.endGamePolicy?sharedPointPurchase(view,profile.endGamePolicy,id=>sampledAfter(view,profile,id)):undefined;
 if(points)return points;
 const safe=legal(view,view.resources.coins).filter(id=>gainOutcome({...view,resources:{...view.resources,coins:view.resources.coins-definition(id).cost!,buys:view.resources.buys-1}},id)!==0);
 const top=Math.max(0,...Object.keys(view.supply).map(id=>definition(id).vp??0));
 const id=safe.find(id=>definition(id).vp===top&&top>0)??(profile.purchasePlanner==='pair'?twoPurchasePlan(view,profile,safe).first:sampledGain(view,profile,safe));
 return id?{type:'card/bought',cardId:id}:{type:'turn/ended'};
}
