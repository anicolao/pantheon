import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {replaySetup,setupSupply,leaderLinks,type SetupState,type SetupEvent} from '../../../src/lib/game/setup';
import {createPrng} from '../../../src/lib/game/random';
import {activePlayer,applyPlayCommand,standings,definition,type ActionCommand} from '../../../src/lib/game/actions';
import {createActor,type Actor} from '../../../src/lib/bots/rl-runtime';
import {commands,observation,leaders,schemaSignature} from './schema';
import {teacher} from './teacher';
export type Manifest={stageLeaders:string[];newest:string;focusNewest?:boolean;actors:Record<string,{path:string;sha256:string}>};
export class ExpansionEnvironment{
 game!:SetupState;events:SetupEvent[]=[];uid='';seed='';gameSeed='';steps=0;opponent='';first=false;training=false;
 actors:Record<string,ReturnType<typeof createActor>>={};manifest:Manifest;
 constructor(public leader:string,manifest:string,public fixedOpponent?:string){
  this.manifest=JSON.parse(readFileSync(manifest,'utf8'));
  if(!this.manifest.stageLeaders.includes(leader)||this.manifest.stageLeaders.some(id=>!leaders.includes(id)))throw Error('Leader outside introduced curriculum');
  for(const [id,entry] of Object.entries(this.manifest.actors)){
   const raw=readFileSync(entry.path);if(createHash('sha256').update(raw).digest('hex')!==entry.sha256)throw Error('Frozen opponent drift');
   const data=JSON.parse(raw.toString()) as Actor;if(data.leader!==id)throw Error('Wrong opponent leader');
   this.actors[id]=createActor(data,schemaSignature);
  }
 }
 reset(seed:string,training=false){
  this.seed=seed;this.steps=0;this.events=[];this.training=training;
  const index=Number(seed.split(':').at(-1));if(!Number.isInteger(index))throw Error('Numbered seed required');
  const block=Math.floor(index/2),{stageLeaders,newest}=this.manifest;
  const others=stageLeaders.filter(l=>l!==this.leader&&l!==newest);
  const allOthers=stageLeaders.filter(l=>l!==this.leader);
  this.opponent=this.fixedOpponent??(this.manifest.focusNewest===false?allOthers[block%allOthers.length]:this.leader===newest?others[block%others.length]:block%2===0?newest:others[Math.floor(block/2)%others.length]);
  if(this.opponent===this.leader||!stageLeaders.includes(this.opponent))throw Error('Invalid pairing');
  // Condition only on eligible market houses, never hands, results or strategy.
  // Every chosen seed still replays through the unmodified production setup.
  const allowed=new Set(stageLeaders.map(id=>leaderLinks(id).leader.god)),base=seed.replace(/[^:]+$/,String(block));
  let attempt=0;
  for(;;){
   this.gameSeed='rl:'+createHash('sha256').update(base+':houses:'+attempt).digest('hex').slice(0,48);
   if(setupSupply(2,[this.leader,this.opponent],this.gameSeed,true).every(p=>allowed.has(definition(p.id).god)||definition(p.id).type!=='Action'))break;
   if(++attempt>10000)throw Error('Unable to sample introduced houses');
  }
  const firstIndex=Math.floor(createPrng(this.gameSeed+':first-player')()*2),learnerSeat=index%2===0?firstIndex:1-firstIndex;
  this.first=index%2===0;this.uid='p'+learnerSeat;
  const seats=learnerSeat===0?[this.leader,this.opponent]:[this.opponent,this.leader];
  const add=(uid:string,data:Partial<SetupEvent>)=>this.events.push({schemaVersion:1,reducerVersion:1,sequence:this.events.length+1,commandId:'exp-'+(this.events.length+1),actorUid:uid,name:seats[Number(uid.slice(1))],playerCount:2,type:'player/joined',...data});
  add('p0',{type:'game/created',equalTurns:true,expansion:true});add('p1',{});add('p0',{type:'draft/started',seed:this.gameSeed});
  for(const uid of replaySetup(this.events).draftOrder)add(uid,{type:'leader/chosen',leaderId:seats[Number(uid.slice(1))]});
  this.game=replaySetup(this.events);this.opponents();return this.state();
 }
 apply(command:ActionCommand){
  if(++this.steps>(this.training?10000:5000)){
   const path=this.saveTrajectory('guard',command);
   throw Error('Episode guard exceeded: no game may be excluded; replay saved at '+path);
  }
  const uid=activePlayer(this.game),sequence=this.events.length+1;
  this.events.push({schemaVersion:1,reducerVersion:1,commandId:'exp-'+sequence,sequence,actorUid:uid,name:this.game.players.find(p=>p.uid===uid)!.name,playerCount:2,...command});
  applyPlayCommand(this.game,uid,command,sequence);
 }
 saveTrajectory(reason:string,command?:ActionCommand){
  const dir=process.env.PANTHEON_RL_FAILURE_DIR??'/tmp/pantheon-rl-failures';mkdirSync(dir,{recursive:true});
  const path=dir+'/'+reason+'-'+createHash('sha256').update(this.seed+this.leader).digest('hex')+'.json';
  writeFileSync(path,JSON.stringify({reason,seed:this.seed,gameSeed:this.gameSeed,leader:this.leader,opponent:this.opponent,command,events:this.events}));return path;
 }
 opponents(){while(this.game.turn.phase!=='finished'&&activePlayer(this.game)!==this.uid){
  const uid=activePlayer(this.game),model=this.actors[this.game.leaders[uid]],options=commands(this.game);
  const index=model?model.action(observation(this.game),options.map(Boolean)):teacher(this.game);
  if(!options[index])throw Error('Illegal opponent choice');this.apply(options[index]!);
 }}
 state(){
  if(this.game.turn.phase==='finished'){
   const rows=standings(this.game),me=rows.find(r=>r.uid===this.uid)!,share=me.winner?1/rows.filter(r=>r.winner).length:0;
   return {done:true,reward:2*share-1,info:{seed:this.seed,gameSeed:this.gameSeed,leader:this.leader,opponentLeader:this.opponent,first:this.first,block:Math.floor(Number(this.seed.split(':').at(-1))/2),share,score:me.score,turns:me.turns,field:rows.map(r=>({leader:this.game.leaders[r.uid],score:r.score,winner:r.winner})),replayVerified:this.verify()}};
  }
  const mask=commands(this.game).map(Boolean);if(!mask.some(Boolean))throw Error('No legal decisions');
  if(this.training&&this.steps>=5000){
   if(activePlayer(this.game)!==this.uid)throw Error('Truncation must bootstrap the learner perspective');
   return {done:false,truncated:true,observation:observation(this.game),mask,info:{seed:this.seed,replayVerified:this.verify(),trajectory:this.saveTrajectory('training-truncation')}};
  }
  return {done:false,observation:observation(this.game),mask};
 }
 teacher(){return teacher(this.game);}
 step(index:number){const command=commands(this.game)[index];if(!command)throw Error('Illegal learner choice');this.apply(command);this.opponents();return this.state();}
 verify(){const strip=(g:SetupState)=>{const {activity,publicActivity,movements,undo,...state}=g;return state;};if(JSON.stringify(strip(replaySetup(this.events)))!==JSON.stringify(strip(this.game)))throw Error('Replay differs');return true;}
}
