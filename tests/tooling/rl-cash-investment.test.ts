import {test,expect} from 'bun:test';
import {cashInvestmentOverride} from '../../scripts/rl/cash_investment_policy';
import type {StandardView} from '../../standard-matrix/policy';
const base={type:'card/bought' as const,cardId:'acropolis'},rule={treasureCashBelow:12,throughCompletedTurns:6};
const v={leader:'doreios',phase:'buys',resources:{actions:0,coins:8,buys:1,worship:0},owned:{obol:3,drachma:2,talent:1},myTurns:6,supply:{acropolis:8,talent:8,polis:10},bannedCards:[]} as unknown as StandardView;
test('cash investment keeps the endgame, supply, and affordability boundaries intact',()=>{
 expect(cashInvestmentOverride(v,base,rule)).toEqual({type:'card/bought',cardId:'talent'});
 expect(cashInvestmentOverride({...v,owned:{talent:4}},base,rule)).toBe(base);
 expect(cashInvestmentOverride({...v,myTurns:7},base,rule)).toBe(base);
 expect(cashInvestmentOverride({...v,finalRound:true},base,rule)).toBe(base);
 expect(cashInvestmentOverride({...v,supply:{...v.supply,acropolis:4}},base,rule)).toBe(base);
 expect(cashInvestmentOverride({...v,supply:{...v.supply,obol:0,polis:0}},base,rule)).toBe(base);
 expect(cashInvestmentOverride({...v,supply:{...v.supply,talent:0}},base,rule)).toBe(base);
 expect(cashInvestmentOverride({...v,bannedCards:['talent']},base,rule)).toBe(base);
 expect(cashInvestmentOverride({...v,resources:{...v.resources,coins:7}},base,rule)).toBe(base);
 expect(cashInvestmentOverride({...v,leader:'melia'},base,rule)).toBe(base);
 const other={type:'card/bought' as const,cardId:'polis'};expect(cashInvestmentOverride(v,other,rule)).toBe(other);
});
