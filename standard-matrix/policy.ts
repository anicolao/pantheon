import {leaderBooks,type LeaderOpeningBook,type OpeningSplit} from './leader-books';
import {evaluateDiscards} from './discard';
import {selectedConfig} from '../balance-checkpoint/accepted-engine/selected-policy';
import {policy as enginePolicy,type Memory} from '../balance-checkpoint/engine-p2-search/policy';
import {utility} from '../balance-checkpoint/equal-turns-engine-v3/policy';
import {baseProfiles} from '../balance-checkpoint/equal-turns/source/scripts/balance/base-profiles';
import {strategyCommand,updateInventory,type View} from '../balance-checkpoint/equal-turns/source/scripts/balance/strategy';
import {sampledValue,objectivePointScale} from '../balance-checkpoint/equal-turns/source/scripts/balance/sampled';
import {endingShare,publicHorizon} from '../balance-checkpoint/equal-turns/source/scripts/balance/planning';
import {definition,initialTurn,applyPlayCommand,type Effect,type ActionCommand} from '../balance-checkpoint/equal-turns/source/src/lib/game/actions';
import type {SetupState,CardInstance} from '../balance-checkpoint/equal-turns/source/src/lib/game/setup';
export type StandardView=View & {effectQueue?:Effect[]};
export type Name='engine'|'money';
export type StandardMemory=Memory & {bookTurns?:number[];openingBook?:LeaderOpeningBook|null};
const accepted=enginePolicy(selectedConfig),outsideBook=enginePolicy({...selectedConfig,openingBook:undefined});
const events=new Set(['counsel-of-olympus','tribute-of-the-tides','blessing-of-the-fields','trial-of-the-spear']);
export function score(v:View,name:Name,origin:View):number{
 const share=endingShare(v);
 if(share!==null)return 10000*share+v.myScore;
 if(v.finalRound)return 100*v.myScore;
 const economic=name==='engine'?utility(v,selectedConfig):sampledValue(v,baseProfiles.treasure);
 const scale=name==='engine'?selectedConfig.cash*8/6:1/objectivePointScale(v,baseProfiles.treasure);
 return economic+scale*(v.myScore-origin.myScore);
}
function changed(v:View,removed:CardInstance[],gain?:string):View{
 const owned={...v.owned},supply={...v.supply};let myScore=v.myScore;
 for(const c of removed){owned[c.cardId]--;myScore-=definition(c.cardId).vp??0;}
 if(gain){owned[gain]=(owned[gain]??0)+1;supply[gain]--;myScore+=definition(gain).vp??0;}
 return {...v,owned,supply,myScore,hand:v.hand.filter(c=>!removed.includes(c))};
}
export function specialChoice(v:View,name:Name):ActionCommand{
 const c=v.choice!;
 if(c.kind!=='trash')throw Error('Expected trash');
 const unique=v.hand.filter((x,i)=>v.hand.findIndex(y=>y.cardId===x.cardId)===i);
 const subsets:CardInstance[][]=[[],...unique.map(x=>[x])];
 if(c.max>=2)for(let i=0;i<v.hand.length;i++)for(let j=i+1;j<v.hand.length;j++)subsets.push([v.hand[i],v.hand[j]]);
 let best={targets:[] as string[],value:c.min?-Infinity:score(v,name,v)};
 for(const removed of subsets){
  if(removed.length<c.min||removed.length>c.max)continue;
  // Keep points near the end unless the replacement improves the actual score.
  const next=changed(v,removed);
  let value=score(next,name,v);
  if(c.offering&&(removed.length||c.offering==='sum')){
   const limit=removed.reduce((s,x)=>s+definition(x.cardId).cost!,0)+(typeof c.offering==='number'?c.offering:0);
   const ids=Object.keys(v.supply).filter(id=>v.supply[id]>0&&!v.bannedCards.includes(id)&&definition(id).cost!==null&&definition(id).cost!<=limit);
   const gainChoice={id:'evaluation-gain',kind:'gain' as const,source:c.source,min:c.offering==='sum'?0:1,max:1,limit};
   const selection=base({...next,choice:gainChoice},{turn:3},name);
   const gain=selection.type==='choice/resolved'?selection.targets[0]:undefined;
   value=gain&&ids.includes(gain)?score(changed(v,removed,gain),name,v):c.offering==='sum'?value:-Infinity;
  }
  if(publicHorizon(v)<=2&&!c.offering&&removed.some(x=>(definition(x.cardId).vp??0)>0))continue;
  if(value>best.value+1e-8)best={targets:removed.map(x=>x.id),value};
 }
 return {type:'choice/resolved',choiceId:c.id,targets:best.targets};
}
export function base(v:StandardView,m:StandardMemory,name:Name):ActionCommand{
 if(v.variant==='base-game')return name==='engine'?accepted(v,m):strategyCommand(v,baseProfiles.treasure);
 if(v.choice?.kind==='trash'&&(v.choice.offering||events.has(v.choice.source)||name==='money'&&v.choice.source===v.leader))return specialChoice(v,name);
 // Event gains retain the base strategy's point eligibility; its normal gain
 // evaluator then chooses the card. No separate god-specific purchase priorities.
 if(name==='money')return strategyCommand(v,baseProfiles.treasure);
 if(m.turn<=2&&!v.choice&&v.phase!=='actions'&&!v.hand.some(c=>definition(c.cardId).type==='Treasure')){
  if((m.bookTurns??[]).includes(m.turn))return {type:'turn/ended'};
  const coins=v.resources.coins;
  const custom=m.openingBook===undefined?leaderBooks[v.leader]:m.openingBook;
  if(custom){
   if(v.leader!=='thaleia')throw Error('Only Thaleia has a calibrated split-based book');
   if(m.turn===1)m.openingFirstCoins??=coins;
   const first=m.openingFirstCoins;
   if(first===undefined)throw Error('Missing observed opening budget');
   const high=Math.max(first,6-first),split=(high===5?'5/1':high===4?'4/2':'3/3') as OpeningSplit;
   const pair=custom[split];
   if(pair){
    const index=split==='3/3'?m.turn-1:coins===high?0:1;
    const card=pair[index];
    if(card!==null&&(v.resources.buys<1||!v.supply[card]||v.bannedCards.includes(card)||definition(card).cost===null||definition(card).cost!>coins))throw Error('Illegal leader-book purchase: '+card);
    (m.bookTurns??=[]).push(m.turn);
    (m.openingActions??=[]).push({turn:m.turn,coins,card});
    return card===null?{type:'turn/ended'}:{type:'card/bought',cardId:card};
   }
  }
  // Use the accepted book by OBSERVED budget. Standard leaders invalidate the
  // old assumption that the two hands sum to six; never inspect the next hand.
  const card=coins===5?'merchant-fleet':coins===4?'harvest-feast':coins===3?(m.openingActions?.some(x=>x.card==='drachma')?'seed-keeper':'drachma'):coins===2?'seed-keeper':null;
  if(coins<=5){
   (m.bookTurns??=[]).push(m.turn);
   (m.openingActions??=[]).push({turn:m.turn,coins,card});
   if(card&&v.resources.buys>0&&v.supply[card]>0&&!v.bannedCards.includes(card))return {type:'card/bought',cardId:card};
   return {type:'turn/ended'};
  }
 }
 return outsideBook(v,m);
}
export function stateFromView(v:StandardView):SetupState{
 const counts={...v.owned};for(const c of [...v.hand,...v.play,...v.discard??[]])counts[c.cardId]--;
 const deck:CardInstance[]=[];for(const [id,n]of Object.entries(counts).sort())for(let i=0;i<n;i++)deck.push({id:`unknown-${id}-${i}`,cardId:id,copy:i});
 return {phase:'playing',seed:'worship-public-only',turn:{...initialTurn(),queue:structuredClone(v.effectQueue??[]),phase:v.phase,choice:structuredClone(v.choice),leaderUsed:v.leaderUsed,number:v.turn,turns:{ev:v.myTurns}},supply:{...v.supply},trash:[],movements:[],turnOrder:['ev'],draftOrder:[],leaders:{ev:v.leader},decks:{ev:{hand:structuredClone(v.hand),play:structuredClone(v.play),discard:structuredClone(v.discard??[]),deck}},sharedEvents:[...v.events],dealtAtSequence:null,resources:{...v.resources},playerCount:v.playerCount as 2|3|4,players:[{uid:'ev',name:'Evaluation'}],activity:[]};
}
export function continuation(v:StandardView,m:StandardMemory,name:Name,first?:ActionCommand){
 const g=stateFromView(v),inventory={ev:{...v.owned}},acquired=new Set<string>(),memory=structuredClone(m);
 const view=():StandardView=>({...v,hand:g.decks.ev.hand,play:g.decks.ev.play,discard:g.decks.ev.discard,phase:g.turn.phase,choice:g.turn.choice,leaderUsed:g.turn.leaderUsed,effectQueue:g.turn.queue,resources:{...g.resources},supply:{...g.supply},owned:{...inventory.ev},myScore:Object.entries(inventory.ev).reduce((s,[id,n])=>s+n*(definition(id).vp??0),0)});
 let command=first??base(view(),memory,name);
 for(let step=0;command.type!=='turn/ended';step++){
  if(step>=100)throw Error('Worship continuation guard');
  const start=g.movements.length;applyPlayCommand(g,'ev',command,step+1,v.variant);updateInventory(inventory,g,start,acquired);
  command=base(view(),memory,name);
 }
 // Worship is considered only after actions/treasures, so this evaluation
 // must never depend on the arbitrary unknown deck order.
 if(g.movements.some(x=>x.kind==='draw'||x.kind==='shuffle'))throw Error('Unexpected hidden draw in worship evaluation');
 return score(view(),name,v);
}
export function command(v:StandardView,m:StandardMemory,name:Name):ActionCommand{
 if(v.variant==='base-game')return base(v,m,name);
 if(name==='engine'&&selectedConfig.lookaheadDiscard&&v.choice?.kind==='discard'&&v.choice.source==='harvest-feast'){
  const best=evaluateDiscards(v,m,selectedConfig,(next,memory)=>base(next,memory,name))[0];
  return {type:'choice/resolved',choiceId:v.choice.id,targets:best.targets};
 }
 // Preserve action and treasure play, and the two opening purchases. Worship
 // evaluates actual legal remainder-of-turn buys, including resource/supply cost.
 if(m.turn>2&&!v.choice&&v.phase!=='actions'&&!v.hand.some(c=>definition(c.cardId).type==='Treasure')&&v.resources.worship>0){
  const legal=v.events.filter(id=>!v.bannedEvents.includes(id)&&definition(id).cost!<=v.resources.coins);
  if(legal.length){
   let best=continuation(v,m,name),chosen:ActionCommand|undefined;
   for(const id of legal){const action:ActionCommand={type:'god/worshipped',cardId:id},value=continuation(v,m,name,action);if(value>best+1e-8){best=value;chosen=action;}}
   if(chosen)return chosen;
  }
 }
 return base(v,m,name);
}
