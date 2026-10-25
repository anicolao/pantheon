import {cards} from '../../src/lib/game/cards';
import {activePlayer,definition,standings,type ActionCommand} from '../../src/lib/game/actions';
import {PracticeSession} from '../../src/lib/bots/session';
import {decide} from '../../src/lib/bots/policy';
import type {StandardView} from '../../standard-matrix/policy';
export const deckIds=cards.filter(c=>!['Leader','Event'].includes(c.type)).map(c=>c.id);
export const eventIds=cards.filter(c=>c.type==='Event').map(c=>c.id);
type Slot={kind:'play'|'buy'|'gain'|'select'|'worship'|'advance'|'end'|'all';ids:string[]};
export const slots:Slot[]=[
 ...deckIds.map(id=>({kind:'play' as const,ids:[id]})),
 ...deckIds.map(id=>({kind:'buy' as const,ids:[id]})),
 ...deckIds.map(id=>({kind:'gain' as const,ids:[id]})),
 {kind:'select',ids:[]},
 ...deckIds.map(id=>({kind:'select' as const,ids:[id]})),
 ...deckIds.flatMap((id,i)=>deckIds.slice(i).map(other=>({kind:'select' as const,ids:[id,other]}))),
 ...eventIds.map(id=>({kind:'worship' as const,ids:[id]})),
 {kind:'advance',ids:[]},{kind:'end',ids:[]},{kind:'all',ids:[]},
];
export function commandFor(v:StandardView,slot:Slot):ActionCommand|undefined{
 const id=slot.ids[0],c=v.choice;
 if(c){
  if(c.kind==='gain'){
   if(slot.kind==='select'&&!slot.ids.length&&c.min===0)return {type:'choice/resolved',choiceId:c.id,targets:[]};
   if(slot.kind==='gain'&&v.supply[id]>0&&definition(id).cost!==null&&definition(id).cost!<=c.limit!&&(!c.actionOnly||definition(id).type==='Action'))
    return {type:'choice/resolved',choiceId:c.id,targets:[id]};
  }else if(slot.kind==='select'&&slot.ids.length>=c.min&&slot.ids.length<=c.max){
   const remaining=[...v.hand],targets:string[]=[];
   for(const id of slot.ids){const i=remaining.findIndex(x=>x.cardId===id);if(i<0)return;targets.push(remaining.splice(i,1)[0].id);}
   return {type:'choice/resolved',choiceId:c.id,targets};
  }
  return;
 }
 if(slot.kind==='play'){
  const card=v.hand.find(x=>x.cardId===id);if(!card)return;
  if(definition(id).type==='Action'&&v.phase==='actions'&&v.resources.actions>0)return {type:'action/played',instanceId:card.id};
  if(definition(id).type==='Treasure'&&['actions','treasures'].includes(v.phase))return {type:'treasure/played',instanceId:card.id};
 }
 if(slot.kind==='buy'&&v.resources.buys>0&&v.supply[id]>0&&definition(id).cost!==null&&definition(id).cost!<=v.resources.coins)return {type:'card/bought',cardId:id};
 if(slot.kind==='worship'&&v.resources.worship>0&&v.events.includes(id)&&definition(id).cost!<=v.resources.coins)return {type:'god/worshipped',cardId:id};
 if(slot.kind==='advance'&&v.phase!=='buys')return {type:'phase/advanced'};
 if(slot.kind==='end'&&v.phase!=='actions')return {type:'turn/ended'};
 if(slot.kind==='all'&&['actions','treasures'].includes(v.phase)&&v.hand.some(x=>definition(x.cardId).type==='Treasure'))return {type:'treasures/played'};
}
export function commands(v:StandardView){return slots.map(s=>commandFor(v,s));}
export function observation(v:StandardView):number[]{
 const counts=(zone:{cardId:string}[])=>deckIds.map(id=>zone.filter(c=>c.cardId===id).length/10);
 const choice=v.choice;
 return [
  ...counts(v.hand),...counts(v.play),...counts(v.discard??[]),
  ...deckIds.map(id=>(v.owned[id]??0)/10),...deckIds.map(id=>(v.supply[id]??0)/40),
  ...eventIds.map(id=>Number(v.events.includes(id))),
  ...['actions','treasures','buys'].map(p=>Number(v.phase===p)),
  ...['trash','discard','gain'].map(k=>Number(choice?.kind===k)),
  ...cards.map(c=>Number(choice?.source===c.id)),
  v.resources.actions/10,v.resources.coins/20,v.resources.buys/5,v.resources.worship/5,
  v.myScore/50,Math.max(...v.scores)/50,v.myTurns/50,(v.opposingTurns[0]??0)/50,
  Number(v.leaderUsed),Number(!!v.finalRound),Number(!!v.equalTurns),(v.playersAfter??0),
  (choice?.min??0)/2,(choice?.max??0)/2,(choice?.limit??0)/10,
  choice?.offering==='sum'?1:typeof choice?.offering==='number'?choice.offering/3:0,
  Number(!!choice?.forge),Number(!!choice?.actionOnly),Number(!!choice?.topdeck),
  (v.drawPileCount??0)/30,(v.drawsPerTurn??0)/20,
 ];
}
export function actionIndex(v:StandardView,command:ActionCommand){
 const canonical=(c:ActionCommand)=>{
  if(c.type==='choice/resolved')return JSON.stringify({type:c.type,targets:c.targets.map(id=>v.choice?.kind==='gain'?id:v.hand.find(x=>x.id===id)!.cardId).sort()});
  if(c.type==='action/played'||c.type==='treasure/played')return JSON.stringify({type:c.type,card:v.hand.find(x=>x.id===c.instanceId)!.cardId});
  return JSON.stringify(c);
 };
 const key=canonical(command),i=commands(v).findIndex(c=>c&&canonical(c)===key);
 if(i<0)throw Error('Unmapped teacher command '+key);return i;
}
export class RLEnvironment{
 session!:PracticeSession;
 steps=0;
 reset(seed:string,first:boolean){
  this.session=new PracticeSession({seed,humanLeader:'melia',botLeader:'doreios',humanFirst:!first,bot:'classic-engine'});
  this.steps=0;this.opponent();return this.state();
 }
 private opponent(){
  while(this.session.game.turn.phase!=='finished'&&activePlayer(this.session.game)==='human'){
   if(++this.steps>5000)throw Error('Episode guard: no result may be excluded');
   const v=this.session.tracker.view(this.session.game);
   this.session.apply(decide(v,this.session.tracker.memories.human,'mm'));
  }
 }
 state(){
  if(this.session.game.turn.phase==='finished'){
   const rows=standings(this.session.game),me=rows.find(x=>x.uid==='bot')!,other=rows.find(x=>x.uid==='human')!;
   return {done:true,reward:me.winner?(other.winner?0:1):-1,info:{score:me.score,opponentScore:other.score,turns:me.turns,seed:this.session.config.seed,first:!this.session.config.humanFirst}};
  }
  const v=this.session.tracker.view(this.session.game),choices=commands(v);
  return {done:false,observation:observation(v),mask:choices.map(Boolean),potential:(v.myScore-Math.max(...v.scores))/30};
 }
 teacher(preview=false){
  const v=this.session.tracker.view(this.session.game);
  return actionIndex(v,decide(v,preview?structuredClone(this.session.tracker.memories.bot):this.session.tracker.memories.bot,'classic-engine'));
 }
 step(action:number){
  const v=this.session.tracker.view(this.session.game),command=commands(v)[action];
  if(!command)throw Error('Illegal model action '+action);
  if(++this.steps>5000)throw Error('Episode guard: no result may be excluded');
  this.session.apply(command);this.opponent();return this.state();
 }
}
