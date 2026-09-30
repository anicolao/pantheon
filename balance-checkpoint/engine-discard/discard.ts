import {applyPlayCommand,initialTurn,definition,type ActionCommand} from '../equal-turns/source/src/lib/game/actions';
import type {SetupState,CardInstance} from '../equal-turns/source/src/lib/game/setup';
import {shuffle} from '../equal-turns/source/src/lib/game/random';
import {updateInventory,type View} from '../equal-turns/source/scripts/balance/strategy';
import {endingShare} from '../equal-turns/source/scripts/balance/planning';
import {utility} from '../equal-turns-engine-v3/policy';
import type {Config,Memory} from './policy';
type Controller=(v:View,m:Memory)=>ActionCommand;
export const SAMPLES=8;
export function evaluateDiscards(v:View,m:Memory,p:Config,base:Controller){
 if(v.choice?.kind!=='discard'||v.choice.source!=='harvest-feast'||v.choice.min!==1||v.choice.max!==1)throw Error('Expected Feast single discard');
 const old=base(v,structuredClone(m));
 if(old.type!=='choice/resolved')throw Error('Expected discard');
 const visible=[...v.hand,...v.play,...(v.discard??[])],counts={...v.owned};
 for(const c of visible)counts[c.cardId]--;
 const unknown:CardInstance[]=[];
 for(const [id,n]of Object.entries(counts).sort(([a],[b])=>a.localeCompare(b))){
  if(n<0)throw Error('Inconsistent public inventory');
  for(let i=0;i<n;i++)unknown.push({id:`evaluation-${id}-${i}`,cardId:id,copy:i});
 }
 if(v.drawPileCount!==undefined&&unknown.length!==v.drawPileCount)throw Error('Draw pool mismatch');
 // Identical copies have the same expected value. Preserve the old tie-break.
 const candidates=[...v.hand].sort((a,b)=>Number(old.targets.includes(b.id))-Number(old.targets.includes(a.id))||a.id.localeCompare(b.id));
 const unique=candidates.filter((c,i)=>candidates.findIndex(x=>x.cardId===c.cardId)===i);
 return unique.map(c=>{
  let total=0;const details:any[]=[];
  for(let sample=0;sample<SAMPLES;sample++){
   const game:SetupState={phase:'playing',seed:`discard-v1:${sample}`,turn:{...initialTurn(),phase:v.phase,choice:structuredClone(v.choice),leaderUsed:v.leaderUsed,number:v.turn,turns:{ev:v.myTurns}},supply:{...v.supply},trash:[],movements:[],turnOrder:['ev'],draftOrder:[],leaders:{ev:v.leader},decks:{ev:{hand:structuredClone(v.hand),play:structuredClone(v.play),discard:structuredClone(v.discard??[]),deck:shuffle(unknown,`discard-v1:pool:${sample}`)}},sharedEvents:[],dealtAtSequence:null,resources:{...v.resources},playerCount:v.playerCount as 2|3|4,players:[{uid:'ev',name:'Evaluation'}],activity:[]};
   const inventory={ev:{...v.owned}},acquired=new Set<string>(),memory=structuredClone(m),drawn=new Set<string>();
   let gainedVP=0,unseen=v.unseenCount;
   const view=():View=>({...v,hand:game.decks.ev.hand,play:game.decks.ev.play,discard:game.decks.ev.discard,phase:game.turn.phase,choice:game.turn.choice,leaderUsed:game.turn.leaderUsed,resources:{...game.resources},supply:{...game.supply},owned:{...inventory.ev},drawPileCount:game.decks.ev.deck.length,unseenCount:unseen,myScore:Object.entries(inventory.ev).reduce((s,[id,n])=>s+n*(definition(id).vp??0),0)});
   const commands:ActionCommand[]=[];
   let command:ActionCommand={type:'choice/resolved',choiceId:v.choice!.id,targets:[c.id]};
   for(let step=0;;step++){
    if(step>=200)throw Error('Discard continuation guard');
    if(command.type==='turn/ended')break;
    commands.push(command);const start=game.movements.length;
    applyPlayCommand(game,'ev',command,step+1,'base-game');
    for(const move of game.movements.slice(start))if(move.card){
     if(move.kind==='gain')gainedVP+=definition(move.card.cardId).vp??0;
     if(move.kind==='draw'&&!drawn.has(move.card.id)){
      drawn.add(move.card.id);
      // View lacks per-card seen-this-turn history. Count each newly encountered
      // draw at most once and clamp to its public remaining-unseen estimate.
      unseen=Math.max(0,unseen-1);
     }
    }
    updateInventory(inventory,game,start,acquired);
    command=base(view(),memory);
   }
   const final=view(),share=endingShare(final);
   // Retain the engine's deck objective. VP acquired this turn is converted at
   // Acropolis's $8/6VP rate using the existing cash weight; final rounds use
   // actual score. Completed endings receive a large win/draw reward.
   const score=share!==null?10000*share+final.myScore:
    v.finalRound?100*final.myScore:
    utility(final,p)+p.cash*8/6*gainedVP;
   if(!Number.isFinite(score))throw Error('Nonfinite discard score');
   total+=score;
   details.push({draws:game.movements.filter(x=>x.kind==='draw').length,shuffles:game.movements.filter(x=>x.kind==='shuffle').length,score,owned:final.owned,coins:final.resources.coins,gainedVP,commands});
  }
  return {targets:[c.id],card:c.cardId,score:total/SAMPLES,baseline:old.targets.includes(c.id),details};
 }).sort((a,b)=>b.score-a.score||Number(b.baseline)-Number(a.baseline)||a.targets[0].localeCompare(b.targets[0]));
}
