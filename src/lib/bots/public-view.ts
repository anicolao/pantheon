import {definition,leaderEffects} from '../game/actions';
import type {SetupState} from '../game/setup';
import {effectFeatures,cardFeatures} from '../../../balance-checkpoint/equal-turns/source/scripts/balance/engine';
import {treasureValue} from '../../../balance-checkpoint/equal-turns/source/scripts/balance/planning';
import type {PublicInventory,View} from '../../../balance-checkpoint/equal-turns/source/scripts/balance/strategy';
/** Build the standard observation from own visible zones and remembered public inventory. */
export function publicStrategyView(game:SetupState,uid:string,inventory:PublicInventory,unseenCount:number):View {
 const opponents=game.players.filter(p=>p.uid!==uid),zones=game.decks[uid];
 const score=(player:string)=>Object.entries(inventory[player]).reduce((sum,[id,n])=>sum+(definition(id).vp??0)*n,0);
 return {
  ...structuredClone({hand:zones.hand,owned:inventory[uid],supply:game.supply,resources:game.resources,phase:game.turn.phase,choice:game.turn.choice,leader:game.leaders[uid],leaderUsed:game.turn.leaderUsed}),
  ...(game.turn.equalTurns?{equalTurns:true,finalRound:!!game.turn.finalRound,playersAfter:game.turnOrder.length-1-game.turnOrder.indexOf(uid)}:{}),
  drawPileCount:zones.deck.length,variant:'standard',leaderBonus:effectFeatures(leaderEffects(game.leaders[uid],'standard')),unseenCount,
  discard:structuredClone(zones.discard),play:structuredClone(zones.play),events:[...game.sharedEvents],
  playerCount:game.playerCount,turn:game.turn.number,myTurns:game.turn.turns[uid]??0,
  opposingTurns:opponents.map(p=>game.turn.turns[p.uid]??0),
  opponentIncome:opponents.map(p=>{const cards=inventory[p.uid];return 5*Object.entries(cards).reduce((sum,[id,n])=>sum+n*(treasureValue(id)+cardFeatures(id,'standard').coins),0)/Math.max(5,Object.values(cards).reduce((a,b)=>a+b,0));}),
  scores:opponents.map(p=>score(p.uid)),myScore:score(uid),bannedCards:[],bannedEvents:[]
 };
}
