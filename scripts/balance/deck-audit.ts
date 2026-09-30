import { applyPlayCommand, definition, initialTurn, type ActionCommand } from '../../src/lib/game/actions';
import { leaderLinks, setupSupply, type CardInstance, type SetupState } from '../../src/lib/game/setup';
import { shuffle } from '../../src/lib/game/random';
import { cardFeatures } from './engine';
import { moneyAction, moneyDiscard, moneyEstimate } from './money';
import { treasureValue } from './planning';
import type { MatrixGame } from './matrix';
import type { Observation } from './bot';

export type DeckInput={version:number;key:string;block:number;leader:string;family:string;owned:Record<string,number>;supply:Record<string,number>;score:number;size:number};
export function endingDecks(row:MatrixGame,version:number):DeckInput[] {
 const supply=Object.fromEntries(setupSupply(2).map(p=>[p.id,p.count]));
 for(const player of row.result.players)for(const [id,n] of Object.entries(player.telemetry.acquisitions)){
  if(!(id in supply))throw new Error(`Non-supply acquisition ${id}`);supply[id]-=n;
 }
 if(Object.values(supply).some(n=>n<0))throw new Error('Negative ending supply');
 return row.result.players.map(player=>{
  const owned:Record<string,number>={obol:6,hamlet:3,[leaderLinks(player.leader).temple.id]:1};
  for(const [id,n] of Object.entries(player.telemetry.acquisitions))owned[id]=(owned[id]??0)+n;
  for(const [id,n] of Object.entries(player.telemetry.trashes))owned[id]=(owned[id]??0)-n;
  if(Object.values(owned).some(n=>n<0))throw new Error('Negative ending inventory');
  for(const id of Object.keys(owned))if(!owned[id])delete owned[id];
  const size=Object.values(owned).reduce((a,b)=>a+b,0),score=Object.entries(owned).reduce((s,[id,n])=>s+n*(definition(id).vp??0),0);
  if(size!==player.telemetry.finalDeckSize||score!==player.score)throw new Error('Ending size/score mismatch');
  return {version,key:`${row.a}/${row.b}/${row.familyA}/${row.familyB}/${row.result.block}/${row.seat}/${player.leader}`,block:row.result.block,leader:player.leader,family:player.family,owned,supply,score,size};
 });
}
export function deckCards(owned:Record<string,number>):CardInstance[]{
 return Object.entries(owned).sort(([a],[b])=>a.localeCompare(b)).flatMap(([cardId,n])=>Array.from({length:n},(_,copy)=>({cardId,copy,id:`audit-${cardId}-${copy}`})));
}
/** Independent Fisher-Yates deal; same v5 cash execution assumptions for both versions.
 * Production reducer handles Action limits, draws, leader triggers, reveals and reshuffles.
 * No purchasing/Worship; optional trash/upgrades declined, as in moneyEstimate's one-hand model.
 */
export function dealIncome(input:DeckInput,seed:string):{coins:number;openingCoins:number}{
 const cards=deckCards(input.owned),deck=shuffle(cards,seed);
 const game:SetupState={phase:'playing',seed,turn:initialTurn(),supply:{...input.supply},trash:[],publicActivity:[],movements:[],turnOrder:['audit'],draftOrder:[],leaders:{audit:input.leader},decks:{audit:{hand:deck.splice(0,5),deck,discard:[],play:[]}},sharedEvents:[],dealtAtSequence:null,resources:{actions:1,buys:1,coins:0,worship:1},playerCount:2,players:[{uid:'audit',name:'Audit'}],activity:[]};
 const openingCoins=game.decks.audit.hand.reduce((n,c)=>n+treasureValue(c.cardId),0);
 let commands=0;
 while(game.turn.phase==='actions'){
  if(++commands>1000)throw new Error(`Audit Action guard: ${input.key}`);
  const zones=game.decks.audit;
  const view:Observation&{play:CardInstance[]}={owned:input.owned,hand:zones.hand,play:zones.play,resources:game.resources,phase:'actions',choice:game.turn.choice,leader:input.leader,leaderUsed:game.turn.leaderUsed,supply:game.supply};
  let command:ActionCommand;
  if(game.turn.choice){
   const c=game.turn.choice;let targets:string[]=[];
   if(c.kind==='discard')targets=moneyDiscard(view);
   else if(c.kind==='gain'&&c.min>0){
    const legal=Object.keys(game.supply).filter(id=>game.supply[id]>0&&definition(id).cost!==null&&definition(id).cost!<=c.limit!&&(!c.actionOnly||definition(id).type==='Action'));
    const density=cards.reduce((s,c)=>s+treasureValue(c.cardId),0)/Math.max(1,cards.length);
    const payload=(id:string)=>treasureValue(id)+cardFeatures(id).coins+cardFeatures(id).draw*density;
    legal.sort((a,b)=>payload(b)-payload(a)||a.localeCompare(b));targets=legal.slice(0,1);
   }
   command={type:'choice/resolved',choiceId:c.id,targets};
  }else{
   const action=game.resources.actions>0?moneyAction(view):undefined;
   command=action?{type:'action/played',instanceId:action.id}:{type:'phase/advanced'};
  }
  applyPlayCommand(game,'audit',command,commands);
 }
 return {coins:game.resources.coins+game.decks.audit.hand.reduce((n,c)=>n+treasureValue(c.cardId),0),openingCoins};
}
export type DeckAudit={version:number;key:string;block:number;leader:string;family:string;owned:Record<string,number>;score:number;size:number;hands:number;histogram:Record<string,number>;openingHistogram:Record<string,number>;mean:number;hitEight:number;predictedMean:number|null};
export function auditDeck(input:DeckInput,hands=100):DeckAudit{
 const histogram:Record<string,number>={},openingHistogram:Record<string,number>={};
 let total=0,hitEight=0;
 for(let sample=0;sample<hands;sample++){
  // Deliberately omit policy version: matched deck identities share independent audit seeds.
  const {coins,openingCoins}=dealIncome(input,`ending-hands-v1:${input.key}:${sample}`);
  histogram[coins]=(histogram[coins]??0)+1;openingHistogram[openingCoins]=(openingHistogram[openingCoins]??0)+1;
  total+=coins;hitEight+=Number(coins>=8);
 }
 const view:Observation={owned:input.owned,hand:[],resources:{actions:1,buys:1,coins:0,worship:1},phase:'actions',choice:null,leader:input.leader,leaderUsed:false,supply:input.supply};
 const predictedMean=input.family==='treasure'?moneyEstimate(view).mean:null;
 const {supply,...metadata}=input;
 return {...metadata,hands,histogram,openingHistogram,mean:total/hands,hitEight,predictedMean};
}
