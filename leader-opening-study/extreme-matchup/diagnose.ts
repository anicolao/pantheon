import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {definition} from '../../src/lib/game/actions';
import {setupExperiment} from '../../balance-checkpoint/equal-turns/source/scripts/balance/experiment';
import {activePlayer,applyPlayCommand,standings,type ActionCommand} from '../../src/lib/game/actions';
import {BotTracker} from '../../src/lib/bots/session';
import {decide,type BotKind} from '../../src/lib/bots/policy';
import type {OpeningBook} from '../../src/lib/bots/opening-books';
import {deepStrictEqual,ok} from 'node:assert';
export function run(seed:number,lineup:string[],kinds:BotKind[],books:(OpeningBook|null|undefined)[]=[],stop?:{seat:number;turn:number}){
 const {game}=setupExperiment('leader-matrix-v1:'+seed,lineup,'standard');
 game.turn.equalTurns=true;
 const g=game as any;g.publicActivity=[];
 const turns:any[]=[];const endings:any[]=[];
 const initial=structuredClone(g),tracker=new BotTracker(g),commands:{uid:string;command:ActionCommand}[]=[];
 for(const [i,uid] of g.turnOrder.entries())if(books[i]!==undefined)tracker.memories[uid].openingOverride=books[i];
 while(g.turn.phase!=='finished'){
  const uid=activePlayer(g),seat=g.turnOrder.indexOf(uid),view=tracker.view(g),memory=tracker.memories[uid];
  if(memory.turn>100||commands.length>20000)throw Error('Simulation guard');
  let row=turns.find(x=>x.seat===seat&&x.turn===memory.turn);
  if(!row){row={seat,turn:memory.turn,startOwned:{...view.owned},size:Object.values(view.owned).reduce((a,b)=>a+b,0),actions:[],buys:[],worship:[],trashes:[],gains:[],leaderTriggers:0,leaderChoices:[],coins:0};turns.push(row);}
  const beforeCoins=g.resources.coins,priorFinal=g.turn.finalRound,choice=g.turn.choice?structuredClone(g.turn.choice):null;
  const beforeHand=structuredClone(view.hand);
  const command=decide(view,memory,kinds[seat]),start=g.movements.length,sequence=commands.length+1;
  const message=applyPlayCommand(g,uid,command,sequence,'standard');g.activity.push({sequence,message});commands.push({uid,command});
  if(command.type==='action/played')row.actions.push(beforeHand.find((c:any)=>c.id===command.instanceId)?.cardId);
  if(command.type==='card/bought')row.buys.push(command.cardId);
  if(command.type==='god/worshipped')row.worship.push(command.cardId);
  if(command.type==='choice/resolved'&&choice?.source===lineup[seat])row.leaderChoices.push({hand:beforeHand.map((c:any)=>c.cardId),targets:command.targets.map(id=>beforeHand.find((c:any)=>c.id===id)?.cardId)});
  if(command.type!=='turn/ended')row.coins+=Math.max(0,g.resources.coins-beforeCoins);
  for(const m of g.movements.slice(start)){
   if(m.kind==='leader')row.leaderTriggers++;
   if(m.kind==='trash')row.trashes.push({card:m.card?.cardId,source:m.source});
   if((m.kind==='gain'||m.kind==='topdeck')&&m.card?.id.startsWith('supply-')&&!tracker.acquired.has(m.card.id))row.gains.push({card:m.card.cardId,source:m.source});
  }
  if(!priorFinal&&g.turn.finalRound)endings.push({seat,turn:memory.turn,command,scores:standings(g).map(x=>({uid:x.uid,score:x.score})),supply:{...g.supply}});
  if(command.type==='turn/ended'){row.draws=tracker.draws;row.coverage=tracker.seen.size/tracker.target;row.leftover={...view.resources};row.scores=standings(g).map(x=>({uid:x.uid,score:x.score}));}
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
 return {turns,endings,result:{seed,lineup,players,status:g.turn.phase,commands:commands.length},trace:{initial,commands,players}};
}

const seed=Number(process.argv[2]),reverse=process.argv[3]==='reverse';
const lineup=reverse?['melia','doreios']:['doreios','melia'];
const kinds:BotKind[]=reverse?['money','classic-engine']:['classic-engine','money'];
const data=run(seed,lineup,kinds);
const prefix=lineup.join('-')+'-'+kinds.join('-')+'-'+(2*Math.floor((seed-400000)/2));
const expected=readFileSync(import.meta.dir+'/../matrix/'+prefix+'.jsonl','utf8').trim().split('\n').map(JSON.parse).find((x:any)=>x.seed===seed);
deepStrictEqual(data.result,((({traceHash,...r}:any)=>r)(expected)));
ok(createHash('sha256').update(JSON.stringify(data.trace)).digest('hex')===expected.traceHash,'Exact original trace');
console.log(JSON.stringify({seed,reverse,turns:data.turns,endings:data.endings,result:data.result}));
