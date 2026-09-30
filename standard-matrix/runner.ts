
import {setupExperiment} from '../balance-checkpoint/equal-turns/source/scripts/balance/experiment';
import {inventoryAtSetup,updateInventory,strategyView,strategyCommand} from '../balance-checkpoint/equal-turns/source/scripts/balance/strategy';
import {baseProfiles} from '../balance-checkpoint/equal-turns/source/scripts/balance/base-profiles';
import {activePlayer,applyPlayCommand,standings,type ActionCommand} from '../balance-checkpoint/equal-turns/source/src/lib/game/actions';
import {deepStrictEqual,ok} from 'node:assert';
import {command as standardCommand,type Name,type StandardMemory} from './policy';
import {definition} from '../balance-checkpoint/equal-turns/source/src/lib/game/actions';
export type Spec={name:Name};
export function run(seed:number,specs:Spec[],lineup:string[]){
 const {game}=setupExperiment('leader-matrix-v1:'+seed,lineup,'standard');
 game.turn.equalTurns=true;
 const initial=structuredClone(game);
 const inventory=inventoryAtSetup(game,'standard'),acquired=new Set<string>(),commands:any[]=[],histories:Record<string,number[]>={},supplies:Record<string,any[]>={};
 const memories:StandardMemory[]=specs.map(()=>({turn:0}));
 const worship:any[]=[],leaderTriggers=[0,0];
 let endTrigger:any=null;
 let key='',draws=0,seen=new Set<string>(),gained=new Set<string>(),target=0;
 const telemetry=specs.map(()=>({fullDraw:0,phases:0,firstPoint:null as number|null,spending:[] as {turn:number;coins:number;buys:number}[],turns:[] as any[]}));
 while(game.turn.phase!=='finished'){
  const uid=activePlayer(game),pos=game.turnOrder.indexOf(uid),spec=specs[pos],mem=memories[pos];
  if(key!==uid+'/'+game.turn.number){
   if(mem.turn>=100)break;
   key=uid+'/'+game.turn.number;mem.turn++;
   draws=game.decks[uid].hand.length;target=Object.values(inventory[uid]).reduce((s,n)=>s+n,0);
   seen=new Set(game.decks[uid].hand.map(c=>c.id));gained=new Set();
   (supplies[uid]??=[]).push({turn:mem.turn,supply:{...game.supply}});
  }
  if(commands.length>20000)throw Error('command guard');
  const view=strategyView(game,uid,inventory,undefined,'standard',Math.max(0,target-seen.size));
  const recent=[...(histories[uid]??[]).slice(-3),draws];view.drawsPerTurn=recent.reduce((s,n)=>s+n,0)/recent.length;
  const old=supplies[uid].slice(-4)[0],elapsed=Math.max(1,mem.turn-old.turn);
  view.supplyRates=Object.fromEntries(Object.entries(game.supply).map(([id,n])=>[id,Math.max(0,(old.supply[id]-n)/elapsed)]));
  let command:ActionCommand;
  command=standardCommand({...view,effectQueue:structuredClone(game.turn.queue)},mem,spec.name);
  if(command.type==='god/worshipped')worship.push({seat:pos,event:command.cardId,favored:view.play.filter(c=>definition(c.cardId).type==='Action'&&definition(c.cardId).god===definition((command as any).cardId).god).length>=2,ownGod:definition(command.cardId).god===definition(view.leader).god});
  if((command.type==='card/bought'||command.type==='turn/ended')&&!view.choice&&telemetry[pos].spending.at(-1)?.turn!==mem.turn)telemetry[pos].spending.push({turn:mem.turn,coins:view.resources.coins,buys:view.resources.buys});
  if(command.type==='phase/advanced'&&view.phase==='actions'){telemetry[pos].phases++;telemetry[pos].fullDraw+=Number(seen.size>=target);}
  const start=game.movements.length,sequence=commands.length+1;
  const message=applyPlayCommand(game,uid,command,sequence,'standard');game.activity.push({sequence,message});commands.push({uid,command});
  for(const move of game.movements.slice(start))if(move.kind==='leader')leaderTriggers[pos]++;
  for(const move of game.movements.slice(start))if(move.uid===uid&&move.card){
   if(move.kind==='gain'){
    gained.add(move.card.id);
    if(['acropolis','polis','hamlet'].includes(move.card.cardId)){
     
     telemetry[pos].firstPoint??=mem.turn;
    }
   }
   if(move.kind==='draw'&&command.type!=='turn/ended'){draws++;if(!gained.has(move.card.id))seen.add(move.card.id);}
  }
  updateInventory(inventory,game,start,acquired);
  if(game.turn.finalRound&&!endTrigger)endTrigger={seat:pos,seed,turn:mem.turn,acropolis:game.supply.acropolis,scores:standings(game).map(p=>({uid:p.uid,score:p.score,turns:p.turns})),extraTurn:String(game.turn.phase)!=='finished'};

  if(command.type==='turn/ended'){
   (histories[uid]??=[]).push(draws);
   telemetry[pos].turns.push({turn:mem.turn,draws,coverage:seen.size/Math.max(1,target),deck:{...inventory[uid]},supply:game.supply.acropolis});
  }

 }
 const replay=structuredClone(initial);
 for(const [i,{uid,command}]of commands.entries()){const sequence=i+1,message=applyPlayCommand(replay,uid,command,sequence,'standard');replay.activity.push({sequence,message});}
 deepStrictEqual(replay,game);
 if(game.turn.equalTurns&&game.turn.phase==='finished')ok(new Set(Object.values(game.turn.turns)).size===1,'equal completed turns');
 const scores=standings(game),nw=scores.filter(x=>x.winner).length;
 const players=specs.map((s,pos)=>{const uid=game.turnOrder[pos],row=scores.find(x=>x.uid===uid)!;return {name:s.name,position:pos,score:row.score,turns:row.turns,share:game.turn.phase==='finished'?(row.winner?1/nw:0):null,final:inventory[uid],talentSwap:memories[pos].talentSwap??null,openingActions:memories[pos].openingActions??[],telemetry:telemetry[pos]};});
 return {result:{seed,lineup,worship,leaderTriggers,endTrigger,status:game.turn.phase==='finished'?'finished':'turn-limit',end:game.turn.phase==='finished'?(game.supply.acropolis===0?'acropolis':'three-piles'):null,players},trace:{initial,commands,players}};
}
