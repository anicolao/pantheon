import {setupExperiment} from '../balance-checkpoint/equal-turns/source/scripts/balance/experiment';
import {activePlayer,applyPlayCommand,standings,type ActionCommand} from '../src/lib/game/actions';
import {BotTracker} from '../src/lib/bots/session';
import {decide,type BotKind} from '../src/lib/bots/policy';
import type {OpeningBook} from '../src/lib/bots/opening-books';
import {deepStrictEqual,ok} from 'node:assert';
export function run(seed:number,lineup:string[],kinds:BotKind[],books:(OpeningBook|null|undefined)[]=[],stop?:{seat:number;turn:number}){
 const {game}=setupExperiment('leader-matrix-v1:'+seed,lineup,'standard');
 game.turn.equalTurns=true;
 const g=game as any;g.publicActivity=[];
 const initial=structuredClone(g),tracker=new BotTracker(g),commands:{uid:string;command:ActionCommand}[]=[];
 for(const [i,uid] of g.turnOrder.entries())if(books[i]!==undefined)tracker.memories[uid].openingOverride=books[i];
 while(g.turn.phase!=='finished'){
  const uid=activePlayer(g),seat=g.turnOrder.indexOf(uid),view=tracker.view(g),memory=tracker.memories[uid];
  if(memory.turn>100||commands.length>20000)throw Error('Simulation guard');
  const command=decide(view,memory,kinds[seat]),start=g.movements.length,sequence=commands.length+1;
  const message=applyPlayCommand(g,uid,command,sequence,'standard');g.activity.push({sequence,message});commands.push({uid,command});
  tracker.observe(g,uid,start,command);
  if(stop&&seat===stop.seat&&memory.turn===stop.turn&&memory.openingLog?.some(x=>x.turn===stop.turn))break;
 }
 const players=g.turnOrder.map((uid:string,seat:number)=>{
  const s=standings(g),row=s.find(x=>x.uid===uid)!,winners=s.filter(x=>x.winner).length;
  return {leader:lineup[seat],kind:kinds[seat],position:seat,score:row.score,turns:row.turns,share:g.turn.phase==='finished'?(row.winner?1/winners:0):null,final:tracker.inventory[uid],opening:tracker.memories[uid].openingLog??[]};
 });
 if(!stop){
  ok(g.turn.phase==='finished');ok(players[0].turns===players[1].turns,'Equal turns');
  const replay=structuredClone(initial);
  for(const [i,{uid,command}] of commands.entries()){const sequence=i+1,message=applyPlayCommand(replay,uid,command,sequence,'standard');replay.activity.push({sequence,message});}
  deepStrictEqual(replay,g);
 }
 return {result:{seed,lineup,players,status:g.turn.phase,commands:commands.length},trace:{initial,commands,players}};
}
