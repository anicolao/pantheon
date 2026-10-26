/** Research-only four-player environment using production reducers and public observations. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {replaySetup,type SetupEvent,type SetupState} from '../../src/lib/game/setup';
import {activePlayer,standings,definition,type ActionCommand} from '../../src/lib/game/actions';
import {UndoHistory} from '../../src/lib/game/undo';
import {publicCommandContext,describePublicCommand} from '../../src/lib/game/public-table';
import {BotTracker} from '../../src/lib/bots/session';
import {commands,observation,actionIndex} from '../../src/lib/bots/rl-schema';
import {createResearchActor,actorObservation,type ResearchActorData} from './research_actor';
import {publicObservation,type PublicObservationKind} from './public_features';
import {doreiosGroveCommand} from '../../src/lib/bots/doreios-grove';
import {fourReward,validateFourReward,type FourReward} from './four_reward';
import {createPrng} from '../../src/lib/game/random';
import {openingOverride} from './opening_policy';
import {mmCommand} from '../../src/lib/bots/mm';
import {templeOrderOverride} from './temple_order_policy';
import {thinOverride,type ThinRule} from './thin_policy';

export class FourEnvironment {
 game!:SetupState; tracker!:BotTracker; undo!:UndoHistory;
 events:SetupEvent[]=[]; steps=0; uid=''; seed=''; block=0; rotation=0;
 actors:Record<string,ReturnType<typeof createResearchActor>>={};
 observationKind?:PublicObservationKind;
 reward?:FourReward;
 openingCurriculum?:{probability:number};curriculumApplied=false;
 teacherPolicy?:'grove'|'mm'|'temple-order';teacherThinRule?:ThinRule;
 constructor(public leader:string,manifestPath:string){
  const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  this.reward=validateFourReward(manifest.reward);
  if(manifest.openingCurriculum!==undefined){
   const p=manifest.openingCurriculum?.probability;
   if(!Number.isFinite(p)||p<0||p>1)throw Error('Invalid opening curriculum');
   this.openingCurriculum={probability:p};
  }
  if(manifest.observationKind!==undefined){
   if(!['public-v1','zero-public-v1'].includes(manifest.observationKind))throw Error('Unknown observation kind');
   this.observationKind=manifest.observationKind;
  }
  if(manifest.teacher!==undefined){
   if(!['grove','mm','temple-order'].includes(manifest.teacher)||leader!=='doreios')throw Error('Unsupported four-player teacher');
   this.teacherPolicy=manifest.teacher;
  }
  if(manifest.teacherThinRule!==undefined){
   const r=manifest.teacherThinRule;if(this.teacherPolicy!=='temple-order'||!Number.isFinite(r.floor)||r.floor<0||!Number.isFinite(r.stopSupply)||r.stopSupply<0||!Array.isArray(r.protect)||r.protect.some((x:unknown)=>typeof x!=='number'||!Number.isFinite(x)))throw Error('Invalid teacher thinning rule');this.teacherThinRule=r;
  }
  for(const [leader,entry] of Object.entries(manifest.actors) as [string,{path:string;sha256:string}][]){
   const raw=readFileSync(entry.path);if(createHash('sha256').update(raw).digest('hex')!==entry.sha256)throw Error('Frozen actor drift');
   const actor=JSON.parse(raw.toString()) as ResearchActorData;if(actor.leader!==leader)throw Error('Wrong leader');
   this.actors[leader]=createResearchActor(actor);
  }
  if(Object.keys(this.actors).sort().join()!=='doreios,melia,nereon,thaleia')throw Error('Four actors required');
 }
 reset(seed:string,_first:boolean){
  this.seed=seed;const index=Number(seed.split(':').at(-1))||0;
  this.block=Math.floor(index/4);this.rotation=index%4;
  const orders=[['nereon','thaleia','doreios'],['nereon','doreios','thaleia'],['thaleia','nereon','doreios'],['thaleia','doreios','nereon'],['doreios','nereon','thaleia'],['doreios','thaleia','nereon']];
  const order=['melia',...orders[this.block%6]],seats=order.slice(this.rotation).concat(order.slice(0,this.rotation));
  this.uid=`p${seats.indexOf(this.leader)}`;this.events=[];this.steps=0;
  const add=(uid:string,data:Partial<SetupEvent>)=>this.events.push({schemaVersion:1,reducerVersion:1,sequence:this.events.length+1,commandId:`four-${this.events.length+1}`,actorUid:uid,name:seats[Number(uid.slice(1))],playerCount:4,type:'player/joined',...data});
  for(let i=0;i<4;i++)add(`p${i}`,i?{botKind:'bot'}:{type:'game/created',equalTurns:true});
  add('p0',{type:'player/automated',botKind:'bot'});
  add('p0',{type:'draft/started',seed:seed.replace(/[^:]+$/,String(this.block))});
  for(const uid of replaySetup(this.events).draftOrder)add(uid,{type:'leader/chosen',leaderId:seats[Number(uid.slice(1))]});
  this.game=replaySetup(this.events);this.tracker=new BotTracker(this.game);this.undo=new UndoHistory();
  this.opponents();this.curriculumApplied=false;
  if(this.openingCurriculum){
   const random=createPrng(seed+':opening-curriculum');this.curriculumApplied=random()<this.openingCurriculum.probability;
   if(this.curriculumApplied){
    while((this.game.turn.turns[this.uid]??0)<2&&this.game.turn.phase!=='finished'){
     const view=this.tracker.view(this.game),base=commands(view)[this.runtime()]!;
     let command=openingOverride(view,base,{card:'',through:0,harbor:false,playAres:false,thin:null,spendBeforeBuy:100});
     if(command.type==='card/bought'){
      const buys=commands(view).filter((x):x is Extract<ActionCommand,{type:'card/bought'}>=>!!x&&x.type==='card/bought'&&definition(x.cardId).type!=='Territory'&&definition(x.cardId).cost!>=2);
      if(buys.length)command=buys[Math.floor(random()*buys.length)];
     }
     this.apply(command);this.opponents();
    }
    if(this.game.turn.phase==='finished')throw Error('Curriculum ended before learner starts');
   }
  }
  return this.state();
 }
 apply(command:ActionCommand){
  if(++this.steps>10000)throw Error('Episode limit: abort without excluding game');
  const uid=activePlayer(this.game),sequence=this.events.length+1;
  this.tracker.view(this.game);
  const before=publicCommandContext(this.game,uid),start=this.game.movements.length;
  const event={schemaVersion:1,reducerVersion:1,sequence,commandId:`four-${sequence}`,actorUid:uid,name:this.game.leaders[uid],playerCount:4,...command} as SetupEvent;
  const message=this.undo.apply(this.game,uid,command,sequence);
  this.game.activity.push({sequence,message});this.game.publicActivity.push(describePublicCommand(before,this.game,event));
  this.tracker.observe(this.game,uid,start,command);this.events.push(event);
 }
 runtime(){
  const view=this.tracker.view(this.game),choices=commands(view);
  const actor=this.actors[view.leader];return actor.action(actorObservation(actor,this.game,this.tracker,view),choices.map(Boolean));
 }
 private opponents(){
  while(this.game.turn.phase!=='finished'&&activePlayer(this.game)!==this.uid){
   const view=this.tracker.view(this.game);this.apply(commands(view)[this.runtime()]!);
  }
 }
 state(){
  if(this.game.turn.phase==='finished'){
   const rows=standings(this.game),me=rows.find(r=>r.uid===this.uid)!,winners=rows.filter(r=>r.winner);
   if(new Set(rows.map(r=>r.turns)).size!==1)throw Error('Unequal turns');
   const share=me.winner?1/winners.length:0;
   return {done:true,reward:fourReward(share,me.turns,this.reward,me.score-Math.max(...rows.filter(r=>r.uid!==this.uid).map(r=>r.score))),info:{seed:this.seed,block:this.block,rotation:this.rotation,share,score:me.score,turns:me.turns,seat:Number(this.uid.slice(1)),turnPosition:this.game.turnOrder.indexOf(this.uid),winnerCount:winners.length,
    scores:Object.fromEntries(rows.map(r=>[this.game.leaders[r.uid],r.score])),replayVerified:this.verify(),...(this.openingCurriculum?{curriculumApplied:this.curriculumApplied}:{})}};
  }
  const view=this.tracker.view(this.game);
  return {done:false,observation:this.observationKind?publicObservation(this.game,this.tracker,view,this.observationKind):observation(view),mask:commands(view).map(Boolean),potential:0};
 }
 step(action:number){
  if(activePlayer(this.game)!==this.uid)throw Error('Wrong learner');
  const command=commands(this.tracker.view(this.game))[action];if(!command)throw Error('Illegal action');
  this.apply(command);this.opponents();return this.state();
 }
 teacher(_preview=false){
  if(this.teacherPolicy==='temple-order'){
   const view=this.tracker.view(this.game),base=commands(view)[this.runtime()]!,ordered=templeOrderOverride(view,base,{mode:'last-action'});return actionIndex(view,this.teacherThinRule?thinOverride(view,ordered,this.teacherThinRule):ordered);
  }
  if(this.teacherPolicy==='grove'){
   const view=this.tracker.view(this.game);return actionIndex(view,doreiosGroveCommand(view));
  }
  if(this.teacherPolicy==='mm'){
   const view=this.tracker.view(this.game);return actionIndex(view,mmCommand(view));
  }
  return this.runtime();
 }
 verify(){if(JSON.stringify(replaySetup(this.events))!==JSON.stringify(this.game))throw Error('Four-player replay mismatch');return true;}
}
