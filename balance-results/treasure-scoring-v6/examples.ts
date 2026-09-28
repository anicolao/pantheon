import { readdirSync,readFileSync,writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { setupMatch } from '../../scripts/balance/runner';
import { inventoryAtSetup, strategyView, updateInventory } from '../../scripts/balance/strategy';
import { moneyEstimate,moneyAfter,moneyPurchase } from '../../scripts/balance/money';
import { applyPlayCommand } from '../../src/lib/game/actions';
const dir='balance-results/all-leaders-v5/replays';const examples:any[]=[];
let traces=0,affordable=0,rejected=0;
for(const name of readdirSync(dir).sort().filter(n=>n.includes('treasure-engine')||n.includes('engine-treasure'))){
 const {options,events,result}=JSON.parse(gunzipSync(readFileSync(`${dir}/${name}`)).toString());
 const {game,events:setup}=setupMatch(options.seed,options.lineup),inventory=inventoryAtSetup(game),acquired=new Set<string>();traces++;
 for(const event of events.slice(setup.length)){
  const uid=event.actorUid,position=game.turnOrder.indexOf(uid);
  if(options.profiles[position].family==='treasure'&&['card/bought','turn/ended'].includes(event.type)&&game.resources.coins>=8&&game.resources.buys>0&&game.supply.acropolis>0){
   affordable++;
   const view=strategyView(game,uid,inventory),current=moneyPurchase(view);
   if(event.cardId!=='acropolis'&&current.type==='card/bought'&&current.cardId==='acropolis'){
    rejected++;
    if(!examples.some(e=>e.leader===game.leaders[uid]))examples.push({trace:name,leader:game.leaders[uid],turn:(game.turn.turns[uid]??0)+1,coins:game.resources.coins,owned:view.owned,oldPurchase:event.cardId??null,newPurchase:current.cardId,baseEV:moneyEstimate(view).mean,afterPointsEV:moneyAfter(view,'acropolis').mean,afterOldPurchaseEV:event.cardId?moneyAfter(view,event.cardId).mean:null,acropolisesLeft:game.supply.acropolis,oldFinalResult:result.players});
   }
  }
  const start=game.movements.length;
  const message=applyPlayCommand(game,uid,event,event.sequence,options.variant);game.activity.push({sequence:event.sequence,message});updateInventory(inventory,game,start,acquired);
 }
}
writeFileSync('balance-runs/scoring-examples.json',JSON.stringify({traces,affordable,rejected,examples},null,2)+'\n');console.log(JSON.stringify({traces,affordable,rejected,examples:examples.map(({owned,oldFinalResult,...e})=>e)},null,2));
