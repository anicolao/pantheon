import {safeTrash,incomeCapacity} from './income-floor';
import {mkdirSync,writeFileSync} from 'node:fs';
import {deepStrictEqual,ok} from 'node:assert';
import {createHash} from 'node:crypto';
import {setupExperiment} from '../../balance-checkpoint/equal-turns/source/scripts/balance/experiment';
import {activePlayer,applyPlayCommand,definition,eligibleGains,purchaseReason,worshipReason,standings,type ActionCommand} from '../../src/lib/game/actions';
import {cards} from '../../src/lib/game/cards';
import {createPrng,shuffle} from '../../src/lib/game/random';
import type {SetupState} from '../../src/lib/game/setup';
const output=import.meta.dir,actionPiles=cards.filter(c=>c.type==='Action'&&!c.uniqueStartingCard&&c.cost!==null).map(c=>c.id).sort();
ok(actionPiles.length===12);
const pick=<T>(xs:T[],random:()=>number):T=>xs[Math.floor(random()*xs.length)];
function spending(g:SetupState,allowed:string[]):ActionCommand[]{
 const uid=activePlayer(g);
 return [...allowed.filter(id=>!purchaseReason(g,uid,id)).map(cardId=>({type:'card/bought' as const,cardId})),
 ...g.sharedEvents.filter(id=>!worshipReason(g,uid,id)).map(cardId=>({type:'god/worshipped' as const,cardId}))];
}
function command(g:SetupState,allowed:string[],random:()=>number):ActionCommand{
 const uid=activePlayer(g),hand=g.decks[uid].hand,c=g.turn.choice;
 if(c){
  if(c.kind==='gain'){
   const options=eligibleGains(g,c.limit!,c.actionOnly).map(x=>[x.id]);
   if(c.min===0)options.push([]);
   return {type:'choice/resolved',choiceId:c.id,targets:pick(options,random)};
  }
  const options:string[][]=[];
  function visit(start:number,chosen:string[]){
   if(chosen.length>=c!.min)options.push(chosen);
   if(chosen.length===c!.max)return;
   for(let i=start;i<hand.length;i++)visit(i+1,[...chosen,hand[i].id]);
  }
  visit(0,[]);
  const legal=c.kind==='trash'?options.filter(targets=>safeTrash(Object.values(g.decks[uid]).flat(),g.leaders[uid],targets)):options;
  ok(legal.length>0,'An optional trash may always be declined');
  return {type:'choice/resolved',choiceId:c.id,targets:pick(legal,random)};
 }
 if(g.turn.phase==='actions'){
  const playable=g.resources.actions>0?hand.filter(x=>definition(x.cardId).type==='Action'):[];
  return playable.length?{type:'action/played',instanceId:pick(playable,random).id}:{type:'phase/advanced'};
 }
 if(g.turn.phase==='treasures'){
  const treasures=hand.filter(x=>definition(x.cardId).type==='Treasure');
  if(treasures.length)return {type:'treasure/played',instanceId:pick(treasures,random).id};
 }
 if(g.resources.buys===0)return {type:'turn/ended'};
 const options=spending(g,allowed);
 return options.length?pick(options,random):{type:'turn/ended'};
}
export function run(index:number,reverse:boolean){
 const seed=510000+index,random=createPrng('random-shared-piles-v1:'+seed),count=Math.floor(random()*5);
 const selected=shuffle(actionPiles,'random-shared-piles-order-v1:'+seed).slice(0,count);
 const allowed=['drachma','talent','acropolis',...selected];
 const lineup=reverse?['doreios','thaleia']:['thaleia','doreios'];
 const {game}=setupExperiment('random-shared-piles-game-v1:'+seed,lineup,'standard');
 game.turn.equalTurns=true;(game as any).publicActivity=[];
 const initial=structuredClone(game),streams=[0,1].map(seat=>createPrng('random-shared-piles-decisions-v1:'+seed+':'+seat));
 const commands:{uid:string;command:ActionCommand}[]=[],telemetry=game.turnOrder.map(()=>({buys:{} as Record<string,number>,worship:{} as Record<string,number>,trashes:{} as Record<string,number>,leaderTriggers:0}));
 let status='finished';
 while(game.turn.phase!=='finished'){
  if(game.turnOrder.every(uid=>(game.turn.turns[uid]??0)>=500)||commands.length>=100000){status='censored';break;}
  const uid=activePlayer(game),seat=game.turnOrder.indexOf(uid),c=command(game,allowed,streams[seat]);
  if(c.type==='card/bought'){ok(allowed.includes(c.cardId));telemetry[seat].buys[c.cardId]=(telemetry[seat].buys[c.cardId]??0)+1;}
  if(c.type==='god/worshipped')telemetry[seat].worship[c.cardId]=(telemetry[seat].worship[c.cardId]??0)+1;
  if(c.type==='turn/ended')ok(game.resources.buys===0||spending(game,allowed).length===0,'Never voluntarily end with a legal purchase/Worship');
  if(c.type==='choice/resolved'&&game.turn.choice?.kind==='trash')ok(safeTrash(Object.values(game.decks[uid]).flat(),game.leaders[uid],c.targets),'Trash floor');
  const start=game.movements.length,sequence=commands.length+1,message=applyPlayCommand(game,uid,c,sequence,'standard');
  game.activity.push({sequence,message});commands.push({uid,command:c});
  for(const move of game.movements.slice(start)){
   if(move.kind==='leader')telemetry[seat].leaderTriggers++;
   if(move.kind==='trash')ok(incomeCapacity(Object.values(game.decks[uid]).flat(),game.leaders[uid])>=3,'Post-trash income capacity');
   if(move.kind==='trash'&&move.card)telemetry[seat].trashes[move.card.cardId]=(telemetry[seat].trashes[move.card.cardId]??0)+1;
  }
 }
 const scores=standings(game),winners=scores.filter(x=>x.winner).length;
 const players=game.turnOrder.map((uid,seat)=>{
  const p=scores.find(x=>x.uid===uid)!;
  const final=Object.values(game.decks[uid]).flat().reduce((a,c)=>(a[c.cardId]=(a[c.cardId]??0)+1,a),{} as Record<string,number>);
  return {leader:lineup[seat],seat:seat+1,score:p.score,turns:p.turns,share:status==='finished'?(p.winner?1/winners:0):null,final,telemetry:telemetry[seat]};
 });
 if(status==='finished')ok(players[0].turns===players[1].turns,'Equal completed turns');
 const replay=structuredClone(initial);
 for(const [i,{uid,command}]of commands.entries()){const message=applyPlayCommand(replay,uid,command,i+1,'standard');replay.activity.push({sequence:i+1,message});}
 deepStrictEqual(replay,game);
 const trace={initial,commands},serialized=JSON.stringify(trace);
 return {result:{seed,index,reverse,count,selected,allowed,lineup,status,players,commands:commands.length,end:status==='finished'?(game.supply.acropolis===0?'acropolis':'three-piles'):null,traceHash:createHash('sha256').update(serialized).digest('hex')},trace:serialized};
}
if(import.meta.main){
 mkdirSync(output+'/games',{recursive:true});
 const index=Number(process.argv[2]);
 for(const reverse of [false,true]){
  const r=run(index,reverse),name=output+'/games/'+index+'-'+(reverse?'reverse':'forward');
  writeFileSync(name+'.json',JSON.stringify(r.result));writeFileSync(name+'.replay.json',r.trace);
 }
 console.log(index);
}
