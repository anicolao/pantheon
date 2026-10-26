/** Research hypothesis from planner demonstrations: fund future turns before early VP. */
import type {StandardView} from '../../standard-matrix/policy';
import {definition,type ActionCommand} from '../../src/lib/game/actions';
export type CashInvestmentRule={treasureCashBelow:number;throughCompletedTurns:number};
export function cashInvestmentOverride(v:StandardView,base:ActionCommand,r:CashInvestmentRule):ActionCommand{
 if(v.leader!=='doreios'||v.choice||v.finalRound||base.type!=='card/bought'||base.cardId!=='acropolis')return base;
 if(v.myTurns>r.throughCompletedTurns||v.supply.acropolis<=4||Object.values(v.supply).filter(n=>n===0).length>=2)return base;
 if(v.resources.buys<1||v.resources.coins<definition('acropolis').cost!||!(v.supply.talent>0)||v.bannedCards.includes('talent'))return base;
 const cash=(v.owned.obol??0)+2*(v.owned.drachma??0)+3*(v.owned.talent??0);
 return cash<r.treasureCashBelow?{type:'card/bought',cardId:'talent'}:base;
}
