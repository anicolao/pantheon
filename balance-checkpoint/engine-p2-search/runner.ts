
import {setupExperiment} from '../equal-turns/source/scripts/balance/experiment';
import {inventoryAtSetup,updateInventory,strategyView,strategyCommand} from '../equal-turns/source/scripts/balance/strategy';
import {baseProfiles} from '../equal-turns/source/scripts/balance/base-profiles';
import {activePlayer,applyPlayCommand,standings,type ActionCommand} from '../equal-turns/source/src/lib/game/actions';
import {deepStrictEqual,ok} from 'node:assert';
import {policy,type Config,type Memory} from './policy';
type Name='engine';
export type Spec={name:Name;config:Config}|{name:'money'|'passive'};
export function run(seed:number,specs:Spec[],buildOnly=false){
 const {game}=setupExperiment('functional-engine-v1:'+seed,['thaleia','nereon'],'base-game');
 game.turn.equalTurns=specs.some(s=>'config'in s&&s.config.equalTurns);
 const initial=structuredClone(game);
 const inventory=inventoryAtSetup(game,'base-game'),acquired=new Set<string>(),commands:any[]=[],histories:Record<string,number[]>={},supplies:Record<string,any[]>={};
 const memories:Memory[]=specs.map(()=>({turn:0})),policies=specs.map(s=>'config'in s?policy(s.config):null);
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
  const view=strategyView(game,uid,inventory,undefined,'base-game',Math.max(0,target-seen.size));
  const recent=[...(histories[uid]??[]).slice(-3),draws];view.drawsPerTurn=recent.reduce((s,n)=>s+n,0)/recent.length;
  const old=supplies[uid].slice(-4)[0],elapsed=Math.max(1,mem.turn-old.turn);
  view.supplyRates=Object.fromEntries(Object.entries(game.supply).map(([id,n])=>[id,Math.max(0,(old.supply[id]-n)/elapsed)]));
  let command:ActionCommand;
  if(spec.name==='passive')command=view.phase==='actions'?{type:'phase/advanced'}:{type:'turn/ended'};
  else if(spec.name==='money')command=strategyCommand(view,baseProfiles.treasure);
  else command=policies[pos]!(view,mem);
  if((command.type==='card/bought'||command.type==='turn/ended')&&!view.choice&&telemetry[pos].spending.at(-1)?.turn!==mem.turn)telemetry[pos].spending.push({turn:mem.turn,coins:view.resources.coins,buys:view.resources.buys});
  if(command.type==='phase/advanced'&&view.phase==='actions'){telemetry[pos].phases++;telemetry[pos].fullDraw+=Number(seen.size>=target);}
  const start=game.movements.length,sequence=commands.length+1;
  const message=applyPlayCommand(game,uid,command,sequence,'base-game');game.activity.push({sequence,message});commands.push({uid,command});
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
  if(buildOnly&&memories[0].turn>=16&&command.type==='turn/ended'&&pos===0)break;
 }
 const replay=structuredClone(initial);
 for(const [i,{uid,command}]of commands.entries()){const sequence=i+1,message=applyPlayCommand(replay,uid,command,sequence,'base-game');replay.activity.push({sequence,message});}
 deepStrictEqual(replay,game);
 if(game.turn.equalTurns&&game.turn.phase==='finished')ok(new Set(Object.values(game.turn.turns)).size===1,'equal completed turns');
 const scores=standings(game),nw=scores.filter(x=>x.winner).length;
 const players=specs.map((s,pos)=>{const uid=game.turnOrder[pos],row=scores.find(x=>x.uid===uid)!;return {name:s.name,position:pos,score:row.score,turns:row.turns,share:game.turn.phase==='finished'?(row.winner?1/nw:0):null,final:inventory[uid],talentSwap:memories[pos].talentSwap??null,openingActions:memories[pos].openingActions??[],telemetry:telemetry[pos]};});
 return {result:{seed,buildOnly,endTrigger,status:buildOnly?'sampled':game.turn.phase==='finished'?'finished':'turn-limit',end:game.turn.phase==='finished'?(game.supply.acropolis===0?'acropolis':'three-piles'):null,players},trace:{initial,commands,players}};
}
