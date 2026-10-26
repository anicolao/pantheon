/** Four-player production RL tournament, counterbalanced within fresh seed blocks. */
import {mkdirSync,readFileSync,writeFileSync,existsSync,renameSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {availableParallelism} from 'node:os';
import {replaySetup,type SetupEvent} from '../../src/lib/game/setup';
import {activePlayer,standings,type ActionCommand} from '../../src/lib/game/actions';
import {UndoHistory} from '../../src/lib/game/undo';
import {publicCommandContext,describePublicCommand} from '../../src/lib/game/public-table';
import {BotTracker} from '../../src/lib/bots/session';
import {decide} from '../../src/lib/bots/policy';
import {rlCheckpointHash} from '../../src/lib/bots/rl';
import {TableBotDriver} from '../../src/lib/bots/table';
import {createResearchActor,actorObservation,type ResearchActorData} from './research_actor';
import {commands,observation} from '../../src/lib/bots/rl-schema';

type GameSpec={index:number;block:number;rotation:number;seed:string;seats:string[]};
type Config={output:string;workers:number;games:GameSpec[];checkpointSHA256:Record<string,string>;checkDriver:boolean;actorPaths?:Record<string,string>};
const c:Config=JSON.parse(readFileSync(process.argv[2],'utf8'));
const actors=Object.fromEntries(Object.entries(c.actorPaths??{}).map(([leader,path])=>{
 const actor=JSON.parse(readFileSync(path,'utf8')) as ResearchActorData;if(actor.leader!==leader)throw Error('Wrong actor leader');
 return [leader,createResearchActor(actor)];
}));
for(const [leader,hash] of Object.entries(c.checkpointSHA256))if((actors[leader]?.checkpointSHA256??rlCheckpointHash(leader))!==hash)throw Error('Actor drift');
function run(spec:GameSpec){
 const events:SetupEvent[]=[];
 const append=(uid:string,command:Record<string,unknown>)=>{
  const sequence=events.length+1;
  const event={schemaVersion:1,reducerVersion:1,sequence,commandId:`four-${sequence}`,actorUid:uid,
   name:spec.seats[Number(uid.slice(1))],playerCount:4,...command} as SetupEvent;
  events.push(event);return event;
 };
 for(let seat=0;seat<4;seat++)append(`p${seat}`,{type:seat?'player/joined':'game/created',...(seat?{botKind:'bot'}:{equalTurns:true})});
 append('p0',{type:'player/automated',botKind:'bot'});
 append('p0',{type:'draft/started',seed:spec.seed});
 for(const uid of replaySetup(events).draftOrder)append(uid,{type:'leader/chosen',leaderId:spec.seats[Number(uid.slice(1))]});
 const game=replaySetup(events),tracker=new BotTracker(game),undo=new UndoHistory(),driver=c.checkDriver?new TableBotDriver():null;
 let decisions=0;
 while(game.turn.phase!=='finished'){
  if(++decisions>10000)throw Error(`Unfinished game ${spec.index}`);
  const uid=activePlayer(game),view=tracker.view(game),actor=actors[view.leader],choices=actor?commands(view):null;
  const command=(actor?choices![actor.action(actorObservation(actor,game,tracker,view),choices!.map(Boolean))]:decide(view,tracker.memories[uid],'bot')) as ActionCommand;
  if(driver){const proposal=driver.next(events,'p0');if(proposal?.actorUid!==uid||JSON.stringify(proposal.command)!==JSON.stringify(command))throw Error('Production table driver mismatch');}
  const before=publicCommandContext(game,uid),start=game.movements.length,event=append(uid,command);
  const message=undo.apply(game,uid,command,event.sequence);
  game.activity.push({sequence:event.sequence,message});game.publicActivity.push(describePublicCommand(before,game,event));
  tracker.observe(game,uid,start,command);
 }
 const replay=replaySetup(events);if(JSON.stringify(replay)!==JSON.stringify(game))throw Error('Full-state replay mismatch');
 const scores=standings(game),winners=scores.filter(s=>s.winner);
 if(new Set(scores.map(s=>s.turns)).size!==1)throw Error('Equal-turn rule violated');
 const players=scores.map(s=>({leader:game.leaders[s.uid],seat:Number(s.uid.slice(1)),turnPosition:game.turnOrder.indexOf(s.uid),
  score:s.score,turns:s.turns,winner:s.winner,share:s.winner?1/winners.length:0,
  rank:1+scores.filter(x=>x.score>s.score).length+(scores.filter(x=>x.score===s.score).length-1)/2,
  territories:s.territories,deckSize:Object.values(game.decks[s.uid]).flat().length}));
 return {result:{...spec,players,winnerCount:winners.length,decisions,replayVerified:true,driverParity:c.checkDriver,
  endTriggeredBy:game.turn.endTriggeredBy?game.leaders[game.turn.endTriggeredBy]:null,emptyPiles:Object.keys(game.supply).filter(id=>game.supply[id]===0)},events};
}
const path=(i:number)=>`${c.output}/replays/${i}.json.gz`;
if(process.argv[3]==='worker'){
 const index=Number(process.argv[4]),spec=c.games.find(g=>g.index===index);if(!spec)throw Error('Missing game');
 const target=path(index);if(existsSync(target))throw Error('Refusing overwrite');
 writeFileSync(target+'.tmp',gzipSync(JSON.stringify(run(spec))));renameSync(target+'.tmp',target);
}else{
 mkdirSync(`${c.output}/replays`,{recursive:true});
 const protocol={...c,runnerSHA256:createHash('sha256').update(readFileSync(import.meta.path)).digest('hex'),
  actorSHA256:Object.fromEntries(Object.entries(c.actorPaths??{}).map(([leader,path])=>[leader,createHash('sha256').update(readFileSync(path)).digest('hex')])),
  rules:'Unmodified production four-player rules; equal turns enabled; one RL model per leader.',
  design:'Fresh seed blocks, four seating rotations per block. Shared deals require block-clustered uncertainty. No failed games excluded.'};
 const file=`${c.output}/protocol.json`;
 if(existsSync(file)&&JSON.stringify(JSON.parse(readFileSync(file,'utf8')))!==JSON.stringify(protocol))throw Error('Experiment drift');
 writeFileSync(file,JSON.stringify(protocol,null,2)+'\n');
 const tasks=c.games.filter(g=>!existsSync(path(g.index)));let next=0,done=0;const children=new Set<ReturnType<typeof Bun.spawn>>();
 try{await Promise.all(Array.from({length:Math.min(c.workers,availableParallelism(),tasks.length)},async()=>{
  while(next<tasks.length){const game=tasks[next++],child=Bun.spawn([process.execPath,import.meta.path,process.argv[2],'worker',String(game.index)],{stdout:'inherit',stderr:'inherit'});children.add(child);
   if(await child.exited!==0)throw Error(`Game failed: ${game.index}`);children.delete(child);
   if(++done%40===0)console.log(`${done}/${tasks.length} completed`);
  }
 }));}catch(e){next=tasks.length;for(const child of children)child.kill();throw e;}
 const rows=c.games.map(spec=>JSON.parse(gunzipSync(readFileSync(path(spec.index))).toString()).result);
 writeFileSync(`${c.output}/games.json`,JSON.stringify(rows));console.log(`Complete: ${rows.length} replay-verified games`);
}
