import {openingBooks,currentOpeningBooks} from './opening-books';
import {activePlayer,applyPlayCommand,type ActionCommand} from '../game/actions';
import {replaySetup,type SetupState,type SetupEvent} from '../game/setup';
import {publicCommandContext,describePublicCommand} from '../game/public-table';
import {inventoryAtSetup,updateInventory,strategyView} from '../../../balance-checkpoint/equal-turns/source/scripts/balance/strategy';
import type {StandardView} from '../../../standard-matrix/policy';
import {botLabels,type BotKind,type BotMemory} from './policy';
export type PracticeConfig={seed:string;humanLeader:string;botLeader:string;humanFirst:boolean;bot:BotKind};
export type RecordGame={version:1;config:PracticeConfig;commands:ActionCommand[];observedTurn:string;memories:Record<string,BotMemory>};
export function initialGame(config:PracticeConfig):SetupState{
 const events:SetupEvent[]=[];
 const add=(uid:string,data:Partial<SetupEvent>)=>events.push({schemaVersion:1,sequence:events.length+1,actorUid:uid,name:uid==='human'?'You':botLabels[config.bot],playerCount:2,reducerVersion:1,commandId:'practice-'+(events.length+1),type:'player/joined',...data});
 add('human',{type:'game/created'});add('bot',{});add('human',{type:'draft/started',seed:config.seed});
 const draft=replaySetup(events);
 // Seat order is selected before dealing; this seed suffix changes only the
 // first-player lottery, preserving the selected seed's shuffle reproducibility.
 const wanted=config.humanFirst?'human':'bot';
 if(draft.turnOrder[0]!==wanted){
  events[2].seed=config.seed+':seat';
  let i=0;
  while(replaySetup(events).turnOrder[0]!==wanted)events[2].seed=config.seed+':seat'+(++i);
 }
 const ready=replaySetup(events);
 for(const uid of ready.draftOrder)add(uid,{type:'leader/chosen',leaderId:uid==='human'?config.humanLeader:config.botLeader});
 const g=replaySetup(events);g.turn.equalTurns=true;return g;
}
export class BotTracker{
 inventory:ReturnType<typeof inventoryAtSetup>;
 acquired=new Set<string>();
 memories:Record<string,BotMemory>={};
 histories:Record<string,number[]>={};supplies:Record<string,{turn:number;supply:Record<string,number>}[]>={};
 key='';draws=0;seen=new Set<string>();gained=new Set<string>();target=0;
 constructor(game:SetupState){this.inventory=inventoryAtSetup(game,'standard');for(const uid of game.turnOrder)this.memories[uid]={turn:0};}
 view(game:SetupState):StandardView{
  const uid=activePlayer(game),mem=this.memories[uid];
  if(this.key!==uid+'/'+game.turn.number){
   this.key=uid+'/'+game.turn.number;mem.turn++;
   this.draws=game.decks[uid].hand.length;this.target=Object.values(this.inventory[uid]).reduce((a,b)=>a+b,0);
   this.seen=new Set(game.decks[uid].hand.map(c=>c.id));this.gained=new Set();
   (this.supplies[uid]??=[]).push({turn:mem.turn,supply:{...game.supply}});
  }
  const v=strategyView(game,uid,this.inventory,undefined,'standard',Math.max(0,this.target-this.seen.size));
  const recent=[...(this.histories[uid]??[]).slice(-3),this.draws];v.drawsPerTurn=recent.reduce((a,b)=>a+b,0)/recent.length;
  const old=this.supplies[uid].slice(-4)[0],elapsed=Math.max(1,mem.turn-old.turn);
  v.supplyRates=Object.fromEntries(Object.entries(game.supply).map(([id,n])=>[id,Math.max(0,(old.supply[id]-n)/elapsed)]));
  return {...v,effectQueue:structuredClone(game.turn.queue)};
 }
 observe(game:SetupState,uid:string,start:number,command:ActionCommand){
  for(const move of game.movements.slice(start))if(move.uid===uid&&move.card){
   if((move.kind==='gain'||move.kind==='topdeck')&&move.card.id.startsWith('supply-')&&!this.acquired.has(move.card.id))this.gained.add(move.card.id);
   if(move.kind==='draw'&&command.type!=='turn/ended'){this.draws++;if(!this.gained.has(move.card.id))this.seen.add(move.card.id);}
  }
  updateInventory(this.inventory,game,start,this.acquired);
  if(command.type==='turn/ended')(this.histories[uid]??=[]).push(this.draws);
 }
}
export class PracticeSession{
 game:SetupState;tracker:BotTracker;commands:ActionCommand[]=[];
 constructor(public config:PracticeConfig){this.game=initialGame(config);this.tracker=new BotTracker(this.game);if(config.bot!=='money')this.tracker.memories.bot.openingOverride=structuredClone((config.bot==='classic-engine'?openingBooks:currentOpeningBooks)[config.botLeader]??null);}
 apply(command:ActionCommand){
  this.tracker.view(this.game);
  const uid=activePlayer(this.game),start=this.game.movements.length,sequence=this.game.activity.length+1;
  const before=publicCommandContext(this.game,uid);
  const message=applyPlayCommand(this.game,uid,command,sequence);
  this.game.activity.push({sequence,message});
  this.game.publicActivity.push(describePublicCommand(before,this.game,{...command,sequence,actorUid:uid} as SetupEvent));
  this.tracker.observe(this.game,uid,start,command);this.commands.push(command);
 }
 save():RecordGame{return {version:1,config:this.config,commands:this.commands,observedTurn:this.tracker.key,memories:this.tracker.memories};}
 static restore(record:RecordGame){
  if(record.version!==1||!Array.isArray(record.commands)||record.commands.length>20000)throw Error('Invalid saved practice game');
  const s=new PracticeSession(record.config);for(const c of record.commands)s.apply(c);
  // A save can occur while a worker is deciding the first command of a turn.
  // Preserve whether that turn was already observed, so its counter is not
  // incremented a second time after reload.
  if(record.observedTurn!==undefined&&record.observedTurn!==s.tracker.key){
   if(s.game.turn.phase==='finished'||record.observedTurn!==activePlayer(s.game)+'/'+s.game.turn.number)throw Error('Invalid observed turn');
   s.tracker.view(s.game);
  }
  // Restore policy memory only after replay has rebuilt all public tracking.
  s.tracker.memories=record.memories;return s;
 }
}
