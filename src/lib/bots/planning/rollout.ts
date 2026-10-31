/** Public-information determinization and sampled policy-improvement teacher. */
import {shuffle} from '../../game/random';
import {activePlayer,applyPlayCommand,standings,type ActionCommand} from '../../game/actions';
import type {SetupState,CardInstance,SetupEvent} from '../../game/setup';
import {BotTracker} from '../session';
import {publicCommandContext,describePublicCommand} from '../../game/public-table';
import {commands,slots,actionIndex} from '../rl-schema';
import {actorObservation,createResearchActor} from './actor';
import {openingOverride} from './opening-policy';
export type Actors=Record<string,ReturnType<typeof createResearchActor>>;
export type RolloutOptions={samples:number;candidates:number;risk:number;trash:boolean;utility?:'share'|'margin'|'win';recordHypotheticalHistory?:boolean;maskedInference?:boolean;leafHorizon?:number;guardTreasures?:boolean};
function copyTracker(source:BotTracker,game:SetupState){const t=new BotTracker(game);Object.assign(t,structuredClone(source));return t;}
/** Never reads hidden identities/order, private movement history, undo snapshots, or real seed. */
export function sampleBelief(game:SetupState,tracker:BotTracker,sample:number){
 const uid=activePlayer(game),key=JSON.stringify({turn:game.turn,supply:game.supply,leaders:game.leaders,inventory:tracker.inventory,hand:game.decks[uid].hand,discard:game.decks[uid].discard,counts:game.turnOrder.map(p=>[p,game.decks[p].deck.length,game.decks[p].hand.length,game.decks[p].discard.length,game.decks[p].play])})+':belief:'+sample;
 const belief:SetupState=structuredClone({undo:null,turn:game.turn,supply:game.supply,trash:game.trash,movements:[],publicActivity:[],phase:game.phase,seed:key,turnOrder:game.turnOrder,draftOrder:game.draftOrder,leaders:game.leaders,decks:{},sharedEvents:game.sharedEvents,dealtAtSequence:game.dealtAtSequence,resources:game.resources,playerCount:game.playerCount,players:game.players,activity:[]});
 for(const player of game.turnOrder){
  const real=game.decks[player],own=player===uid,known=own?[...real.hand,...real.play,...real.discard]:[...real.play];
  const counts={...tracker.inventory[player]};
  for(const card of known){counts[card.cardId]=(counts[card.cardId]??0)-1;if(counts[card.cardId]<0)throw Error('Public inventory inconsistent');}
  let hidden:CardInstance[]=[];
  for(const id of Object.keys(counts).sort())for(let i=0;i<counts[id];i++)hidden.push({id:`belief-${sample}-${player}-${id}-${i}`,cardId:id,copy:i+1});
  const expected=own?real.deck.length:real.deck.length+real.hand.length+real.discard.length;
  if(hidden.length!==expected)throw Error('Public zone counts inconsistent');
  hidden=shuffle(hidden,key+':'+player);
  belief.decks[player]=own?{hand:structuredClone(real.hand),play:structuredClone(real.play),discard:structuredClone(real.discard),deck:hidden}:{hand:hidden.slice(0,real.hand.length),deck:hidden.slice(real.hand.length,real.hand.length+real.deck.length),discard:hidden.slice(real.hand.length+real.deck.length),play:structuredClone(real.play)};
 }
 return {game:belief,tracker:copyTracker(tracker,belief)};
}
function policy(game:SetupState,tracker:BotTracker,actors:Actors,learner:string,maskedInference=false,guardTreasures=true){
 const v=tracker.view(game),actor=actors[v.leader],choices=commands(v),base=choices[(maskedInference?actor.maskedAction:actor.action)(actorObservation(actor,game,tracker,v),choices.map(Boolean))]!;
 return guardTreasures&&activePlayer(game)===learner?openingOverride(v,base,{card:'',through:0,harbor:false,playAres:false,thin:null,spendBeforeBuy:5}):base;
}
export function applyHypothetical(game:SetupState,tracker:BotTracker,command:ActionCommand,sequence:number,recordHistory=false){
 const uid=activePlayer(game);tracker.view(game);const before=recordHistory?publicCommandContext(game,uid):null,start=game.movements.length;
 const message=applyPlayCommand(game,uid,command,sequence);if(before){game.activity.push({sequence,message});game.publicActivity.push(describePublicCommand(before,game,{...command,sequence,actorUid:uid} as SetupEvent));}tracker.observe(game,uid,start,command);
}
function finish(sample:ReturnType<typeof sampleBelief>,actors:Actors,learner:string,index:number,utility:RolloutOptions['utility'],recordHistory:boolean,maskedInference:boolean,leafHorizon?:number,leafValue?:(game:SetupState,tracker:BotTracker)=>number,guardTreasures=true){
 const game=structuredClone(sample.game),tracker=copyTracker(sample.tracker,game),v=tracker.view(game),first=commands(v)[index];
 if(!first)throw Error('Hypothesis changed root legality');const startingTurns=game.turn.turns[learner]??0;let n=0;applyHypothetical(game,tracker,first,100000+(++n),recordHistory);
 while(game.turn.phase!=='finished'){
  if(leafHorizon!==undefined&&activePlayer(game)===learner&&(game.turn.turns[learner]??0)>=startingTurns+leafHorizon){const value=leafValue!(game,tracker);if(!Number.isFinite(value))throw Error('Nonfinite leaf value');return Math.max(0,Math.min(1,value));}
  if(++n>5000)throw Error('Unfinished hypothetical game');
  applyHypothetical(game,tracker,policy(game,tracker,actors,learner,maskedInference,guardTreasures),100000+n,recordHistory);
 }
 const scores=standings(game),me=scores.find(s=>s.uid===learner)!,winners=scores.filter(s=>s.winner),share=me.winner?1/winners.length:0;
 const margin=me.score-Math.max(...scores.filter(s=>s.uid!==learner).map(s=>s.score));
 return utility==='win'?share:utility==='margin'?.5+.5*Math.tanh(margin/8):share+.01*Math.tanh(margin/8);
}
export function rolloutDecision(game:SetupState,tracker:BotTracker,actors:Actors,options:RolloutOptions,leafValue?:(game:SetupState,tracker:BotTracker)=>number){
 if(options.leafHorizon!==undefined&&(!Number.isInteger(options.leafHorizon)||options.leafHorizon<1||!leafValue||!['margin','win'].includes(options.utility??'')))throw Error('Invalid value-leaf configuration');
 if(options.utility!==undefined&&!['share','margin','win'].includes(options.utility))throw Error('Invalid rollout utility');
 if(!Number.isFinite(options.risk)||options.risk<0||!Number.isInteger(options.samples)||options.samples<2||!Number.isInteger(options.candidates)||options.candidates<2)throw Error('Invalid rollout budget');
 const learner=activePlayer(game),v=tracker.view(game),actor=actors[v.leader],choices=commands(v),base=policy(game,tracker,actors,learner,false,options.guardTreasures??true),baseIndex=actionIndex(v,base);
 const investigate=v.choice?(v.choice.kind==='gain'||options.trash&&v.choice.kind==='trash'):['card/bought','god/worshipped','turn/ended'].includes(base.type);
 if(!investigate)return {command:base,searched:false,scores:[]};
 const logits=actor.logits(actorObservation(actor,game,tracker,v)),legal=choices.map((x,i)=>x?i:-1).filter(i=>i>=0);
 if(legal.length<2)return {command:base,searched:false,scores:[]};
 const ranked=[...legal].sort((a,b)=>logits[b]-logits[a]||a-b),selected=[baseIndex];
 // Include the highest-scoring point purchase as well as policy-ranked alternatives.
 const point=legal.find(i=>['buy','gain'].includes(slots[i].kind)&&slots[i].ids[0]==='acropolis');
 if(point!==undefined&&point!==baseIndex)selected.push(point);
 for(const i of ranked)if(!selected.includes(i)&&selected.length<options.candidates)selected.push(i);
 const values=selected.map(()=>[] as number[]);
 for(let sample=0;sample<options.samples;sample++){
  const hypothesis=sampleBelief(game,tracker,sample);
  for(let i=0;i<selected.length;i++)values[i].push(finish(hypothesis,actors,learner,selected[i],options.utility,options.recordHypotheticalHistory??false,options.maskedInference??false,options.leafHorizon,leafValue,options.guardTreasures??true));
 }
 let best=0,bestBound=0;
 const scores=selected.map((index,i)=>{
  const delta=values[i].map((x,k)=>x-values[0][k]),mean=delta.reduce((a,b)=>a+b,0)/delta.length;
  const se=Math.sqrt(delta.reduce((n,x)=>n+(x-mean)**2,0)/(delta.length-1)/delta.length),bound=mean-options.risk*se;
  if(bound>bestBound+1e-9){best=i;bestBound=bound;}
  return {index,mean:values[i].reduce((a,b)=>a+b,0)/options.samples,delta:mean,se,bound};
 });
 return {command:choices[selected[best]]!,searched:true,scores};
}
