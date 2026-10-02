import {activePlayer,type ActionCommand} from '../game/actions';
import {replaySetup,leaderIds,type SetupEvent,type SetupState} from '../game/setup';
import {UndoHistory} from '../game/undo';
import {createPrng} from '../game/random';
import {publicCommandContext,describePublicCommand} from '../game/public-table';
import {BotTracker} from './session';
import {decide,type BotMemory} from './policy';
import {openingBooks,currentOpeningBooks} from './opening-books';
import type {GameCommand} from '../backend/setup-repository';

export type BotProposal={actorUid:string;revision:number;command:GameCommand;commandId:string};
/** Rebuildable from committed events. Policy receives only BotTracker's public view. */
export class TableBotDriver {
 private game?:SetupState;
 private tracker?:BotTracker;
 private undo=new UndoHistory();
 private checkpoints=new Map<number,BotTracker>();
 private prefix:SetupEvent[]=[];
 private proposed?:BotProposal & {memory?:BotMemory};

 next(events:readonly SetupEvent[],hostUid:string):BotProposal|null {
  const current=replaySetup([...events]);
  if(current.players[0]?.uid!==hostUid || current.phase==='gathering' || current.turn.phase==='finished')return null;
  const uid=current.phase==='draft'?current.draftOrder[Object.keys(current.leaders).length]:activePlayer(current);
  const kind=current.players.find(p=>p.uid===uid)?.botKind;
  if(!kind)return null;
  const revision=events.length,commandId=`bot:${uid}:${revision}`;
  if(current.phase==='draft'){
   const available=leaderIds.filter(id=>!Object.values(current.leaders).includes(id));
   const random=createPrng(`bot-draft-v1:${current.seed}:${uid}`);
   return {actorUid:uid,revision,commandId,command:{type:'leader/chosen',leaderId:available[Math.floor(random()*available.length)]}};
  }
  this.sync(events,current.dealtAtSequence!);
  if(this.proposed?.revision===revision)return this.proposed;
  const view=this.tracker!.view(this.game!),memory=structuredClone(this.tracker!.memories[uid]);
  const command=decide(view,memory,kind);
  this.proposed={actorUid:uid,revision,commandId,command,memory};
  return this.proposed;
 }

 private sync(events:readonly SetupEvent[],dealt:number) {
  if(!this.game || this.prefix.length>events.length || this.prefix.some((e,i)=>JSON.stringify(e)!==JSON.stringify(events[i]))){
   this.game=replaySetup(events.slice(0,dealt));
   this.tracker=new BotTracker(this.game);this.undo=new UndoHistory();this.checkpoints.clear();this.proposed=undefined;
   for(const p of this.game.players)if(p.botKind&&p.botKind!=='money')this.tracker.memories[p.uid].openingOverride=structuredClone((p.botKind==='engine'?currentOpeningBooks:openingBooks)[this.game.leaders[p.uid]]??null);
   this.prefix=events.slice(0,dealt);
  }
  const g=this.game,tracker=this.tracker!;
  for(const e of events.slice(this.prefix.length)){
   const command=e as ActionCommand,uid=e.actorUid,kind=g.players.find(p=>p.uid===uid)?.botKind;
   tracker.view(g);
   const checkpoint=structuredClone(tracker);
   if(kind&&command.type!=='action/undone'){
    if(this.proposed?.revision===e.sequence-1&&this.proposed.actorUid===uid&&this.proposed.memory)tracker.memories[uid]=structuredClone(this.proposed.memory);
    else decide(tracker.view(g),tracker.memories[uid],kind);
   }
   const before=publicCommandContext(g,uid),start=g.movements.length;
   const message=this.undo.apply(g,uid,command,e.sequence);
   g.activity.push({sequence:e.sequence,message});g.publicActivity.push(describePublicCommand(before,g,e));
   if(command.type==='action/undone'){
    const saved=this.checkpoints.get(command.targetSequence);
    if(!saved)throw Error('Missing bot observation checkpoint.');
    Object.assign(tracker,structuredClone(saved));
    for(const sequence of this.checkpoints.keys())if(sequence>=command.targetSequence)this.checkpoints.delete(sequence);
   }else{
    tracker.observe(g,uid,start,command);
    if(g.undo?.sequence===e.sequence)this.checkpoints.set(e.sequence,checkpoint);
   }
   if(!g.undo)this.checkpoints.clear();
   this.prefix.push(e);this.proposed=undefined;
  }
 }
}
