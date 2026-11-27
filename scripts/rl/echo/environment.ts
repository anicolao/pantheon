import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {replaySetup,type SetupState,type SetupEvent} from '../../../src/lib/game/setup';
import {activePlayer,applyPlayCommand,standings,type ActionCommand} from '../../../src/lib/game/actions';
import {createActor,type Actor} from '../../../src/lib/bots/rl-runtime';
import {commands,observation,leaders,schemaSignature} from './schema';
import {teacher} from './teacher';
export class EchoEnvironment{
 game!:SetupState;events:SetupEvent[]=[];uid='';seed='';steps=0;actors:Record<string,ReturnType<typeof createActor>>={};
 constructor(public leader:string,manifest?:string){
  if(!leaders.includes(leader))throw Error('Only Echo and the four original leaders are supported');
  if(manifest&&manifest!=='teacher'){
   for(const [id,entry] of Object.entries(JSON.parse(readFileSync(manifest,'utf8')).actors) as [string,{path:string;sha256:string}][]){
    const raw=readFileSync(entry.path);if(createHash('sha256').update(raw).digest('hex')!==entry.sha256)throw Error('Opponent checkpoint changed');
    const data=JSON.parse(raw.toString()) as Actor;if(data.leader!==id)throw Error('Wrong opponent leader');
    this.actors[id]=createActor(data,schemaSignature);
   }
  }
 }
 reset(seed:string,_first=true){
  this.seed=seed;this.steps=0;this.events=[];
  const index=Number(seed.split(':').at(-1));if(!Number.isInteger(index))throw Error('Numbered seed required');
  const block=Math.floor(index/4),rotation=index%4;
  const optional=leaders.filter(l=>l!=='echo'&&l!==this.leader);
  const omitted=optional[block%optional.length];
  const field=leaders.filter(l=>l!==omitted),seats=field.slice(rotation).concat(field.slice(0,rotation));
  this.uid='p'+seats.indexOf(this.leader);
  const add=(uid:string,data:Partial<SetupEvent>)=>this.events.push({schemaVersion:1,reducerVersion:1,sequence:this.events.length+1,commandId:'echo-'+(this.events.length+1),actorUid:uid,name:seats[Number(uid.slice(1))],playerCount:4,type:'player/joined',...data});
  seats.forEach((_,i)=>add('p'+i,i?{}:{type:'game/created',equalTurns:true,expansion:true}));
  add('p0',{type:'draft/started',seed:seed.replace(/[^:]+$/,String(block))});
  for(const uid of replaySetup(this.events).draftOrder)add(uid,{type:'leader/chosen',leaderId:seats[Number(uid.slice(1))]});
  this.game=replaySetup(this.events);this.opponents();return this.state();
 }
 apply(command:ActionCommand){
  if(++this.steps>5000)throw Error('Episode guard exceeded; no games may be dropped');
  const uid=activePlayer(this.game),sequence=this.events.length+1;
  this.events.push({schemaVersion:1,reducerVersion:1,commandId:'echo-'+sequence,sequence,actorUid:uid,name:this.game.players.find(p=>p.uid===uid)!.name,playerCount:4,...command});
  // The same production reducer; presentation history is unnecessary for training.
  applyPlayCommand(this.game,uid,command,sequence);
 }
 opponents(){while(this.game.turn.phase!=='finished'&&activePlayer(this.game)!==this.uid){
  const uid=activePlayer(this.game),model=this.actors[this.game.leaders[uid]],options=commands(this.game);
  const index=model?model.action(observation(this.game),options.map(Boolean)):teacher(this.game);
  if(!options[index])throw Error('Illegal opponent choice');this.apply(options[index]!);
 }}
 state(){
  if(this.game.turn.phase==='finished'){
   const rows=standings(this.game),me=rows.find(r=>r.uid===this.uid)!,share=me.winner?1/rows.filter(r=>r.winner).length:0;
   return {done:true,reward:2*share-1,info:{seed:this.seed,leader:this.leader,seat:Number(this.uid.slice(1)),turnPosition:this.game.turnOrder.indexOf(this.uid),block:Math.floor(Number(this.seed.split(':').at(-1))/4),share,score:me.score,turns:me.turns,field:rows.map(r=>({leader:this.game.leaders[r.uid],score:r.score,winner:r.winner})),replayVerified:this.verify()}};
  }
  const mask=commands(this.game).map(Boolean);if(!mask.some(Boolean))throw Error('No legal decisions');
  return {done:false,observation:observation(this.game),mask};
 }
 teacher(){return teacher(this.game);}
 step(index:number){const command=commands(this.game)[index];if(!command)throw Error('Illegal learner choice');this.apply(command);this.opponents();return this.state();}
 verify(){
  const strip=(g:SetupState)=>{const {activity,publicActivity,movements,undo,...state}=g;return state;};
  if(JSON.stringify(strip(replaySetup(this.events)))!==JSON.stringify(strip(this.game)))throw Error('Training replay differs from production replay');
  return true;
 }
}
