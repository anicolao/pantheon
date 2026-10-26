import {test,expect} from 'bun:test';
import {openingOverride} from '../../scripts/rl/opening_policy';
import type {StandardView} from '../../standard-matrix/policy';
const r={card:'bronze-recruit',through:4,harbor:true,playAres:true,thin:null};
const v={leader:'doreios',choice:null,phase:'buys',myTurns:2,finalRound:null,resources:{coins:4,actions:1},owned:{'temple-of-ares':1,'council-of-sages':1},supply:{'bronze-recruit':10,'harbor-pilot':10},hand:[],bannedCards:[]} as unknown as StandardView;
const buy={type:'card/bought' as const,cardId:'council-of-sages'};
test('Ares opening is capped and preserves expensive buys; Harbor supports terminals',()=>{
 expect(openingOverride(v,buy,r)).toEqual({type:'card/bought',cardId:'bronze-recruit'});
 expect(openingOverride({...v,myTurns:5},buy,r)).toBe(buy);
 expect(openingOverride({...v,resources:{...v.resources,coins:8}},buy,r)).toBe(buy);
 expect(openingOverride({...v,owned:{...v.owned,'bronze-recruit':1}},buy,r)).toEqual({type:'card/bought',cardId:'harbor-pilot'});
});
test('Ares play preference does not skip action-generating cards',()=>{
 const base={type:'action/played' as const,instanceId:'council'};
 const hand=[{id:'bronze',cardId:'bronze-recruit',copy:1},{id:'council',cardId:'council-of-sages',copy:1}];
 expect(openingOverride({...v,phase:'actions',hand},base,r)).toEqual({type:'action/played',instanceId:'bronze'});
 expect(openingOverride({...v,phase:'actions',hand:[...hand,{id:'temple',cardId:'temple-of-ares',copy:1}]},base,r)).toBe(base);
});

test('low-coin purchase guard plays retained treasures before locking the buy phase',()=>{
 const hand=[{id:'obol',cardId:'obol',copy:1}],rule={...r,spendBeforeBuy:5};
 const state={...v,phase:'actions' as const,resources:{...v.resources,coins:2},hand};
 expect(openingOverride(state,{type:'card/bought',cardId:'hamlet'},rule)).toEqual({type:'treasures/played'});
 expect(openingOverride({...state,phase:'buys'},buy,rule)).not.toEqual({type:'treasures/played'});
 expect(openingOverride({...state,resources:{...state.resources,coins:8}},buy,rule)).toBe(buy);
 const worship={type:'god/worshipped' as const,cardId:'trial-of-the-spear'};
 expect(openingOverride(state,worship,rule)).toBe(worship);
});
