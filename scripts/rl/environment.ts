import {loadLeague,type LeagueEntry} from './league';
import {activePlayer,standings} from '../../src/lib/game/actions';
import {PracticeSession} from '../../src/lib/bots/session';
import {nereonFleetCommand} from './teachers/nereon-fleet-v1';
import {decide} from '../../src/lib/bots/policy';
import {rlCommand,rlCheckpointHash} from '../../src/lib/bots/rl';
import {commands,observation,actionIndex} from '../../src/lib/bots/rl-schema';
export {commands,observation,actionIndex,slots,deckIds,eventIds} from '../../src/lib/bots/rl-schema';
export class RLEnvironment{
 session!:PracticeSession;
 steps=0;
 league?:ReturnType<typeof loadLeague>;
 leagueOpponent?:LeagueEntry;
 opponentLeader="melia";
 constructor(public leader="doreios",public expert="classic-engine",public opponentKind="mm"){
  if(!["doreios","nereon","thaleia","melia"].includes(leader))throw Error("Unsupported RL leader");
  if(!["classic-engine","money","fleet-v1","mm"].includes(expert)||expert==="fleet-v1"&&leader!=="nereon")throw Error("Unsupported RL teacher");
  if(!opponentKind.startsWith("league:")&&!["mm","rl-pool","rl-nereon-focus","rl:nereon","rl:thaleia","rl:doreios"].includes(opponentKind))throw Error("Unsupported RL opponent");
  if(opponentKind.startsWith("league:"))this.league=loadLeague(opponentKind.slice(7));
 }
 reset(seed:string,first:boolean){
  const index=Number(seed.split(':').at(-1))||0;
  this.leagueOpponent=this.league?.select(this.leader,index);
  this.opponentLeader=this.leagueOpponent?.leader??(this.opponentKind==='mm'?'melia':this.opponentKind==='rl-pool'?['nereon','thaleia','doreios'][Math.floor(index/2)%3]:this.opponentKind==='rl-nereon-focus'?['nereon','thaleia','nereon','doreios','nereon'][Math.floor(index/2)%5]:this.opponentKind.slice(3));
  if(this.leader===this.opponentLeader)throw Error('Leaders must be distinct');
  this.session=new PracticeSession({seed,humanLeader:this.opponentLeader,botLeader:this.leader,humanFirst:!first,bot:this.expert==='mm'?'mm':this.expert==='classic-engine'?'classic-engine':'money'});
  this.steps=0;this.opponent();return this.state();
 }
 private opponent(){
  while(this.session.game.turn.phase!=='finished'&&activePlayer(this.session.game)==='human'){
   if(++this.steps>5000)throw Error('Episode guard: no result may be excluded');
   const v=this.session.tracker.view(this.session.game);
   this.session.apply(this.league?this.league.command(this.leagueOpponent!,v,this.session.tracker.memories.human):this.opponentKind==='mm'?decide(v,this.session.tracker.memories.human,'mm'):rlCommand(v));
  }
 }
 state(){
  if(this.session.game.turn.phase==='finished'){
   const rows=standings(this.session.game),me=rows.find(x=>x.uid==='bot')!,other=rows.find(x=>x.uid==='human')!;
   return {done:true,reward:me.winner?(other.winner?0:1):-1,info:{score:me.score,opponentScore:other.score,turns:me.turns,seed:this.session.config.seed,first:!this.session.config.humanFirst,...(this.league?{opponentLeader:this.opponentLeader,opponentId:this.leagueOpponent!.id,opponentGroup:this.leagueOpponent!.group,opponentCheckpointSHA256:this.leagueOpponent!.checkpointSHA256??null,leagueSHA256:this.league.hash}:this.opponentKind!=='mm'?{opponentLeader:this.opponentLeader,opponentCheckpointSHA256:rlCheckpointHash(this.opponentLeader)}:{})}};
  }
  const v=this.session.tracker.view(this.session.game),choices=commands(v);
  return {done:false,observation:observation(v),mask:choices.map(Boolean),potential:(v.myScore-Math.max(...v.scores))/30};
 }
 teacher(preview=false){
  const v=this.session.tracker.view(this.session.game);
  return actionIndex(v,this.expert==='fleet-v1'?nereonFleetCommand(v):decide(v,preview?structuredClone(this.session.tracker.memories.bot):this.session.tracker.memories.bot,this.expert==='mm'?'mm':this.expert==='money'?'money':'classic-engine'));
 }
 step(action:number){
  const v=this.session.tracker.view(this.session.game),command=commands(v)[action];
  if(!command)throw Error('Illegal model action '+action);
  if(++this.steps>5000)throw Error('Episode guard: no result may be excluded');
  this.session.apply(command);this.opponent();return this.state();
 }
}
