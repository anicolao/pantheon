import {test,expect} from 'bun:test';
import {incomeCapacity,safeTrash} from './income-floor';
const deck=(...ids:string[])=>ids.map((cardId,i)=>({id:String(i),cardId,copy:i}));
test('Treasures count at face value; a trash cannot cross the floor',()=>{
 const d=deck('drachma','obol','obol');
 expect(safeTrash(d,'doreios',['2'])).toBe(true);
 expect(safeTrash(d,'doreios',['0'])).toBe(false);
});
test('Terminal income needs enough Actions',()=>{
 expect(incomeCapacity(deck('bronze-recruit','bronze-recruit'),'doreios')).toBe(2);
 expect(incomeCapacity(deck('bronze-recruit','bronze-recruit','harbor-pilot'),'doreios')).toBe(4);
 expect(incomeCapacity(deck('bronze-recruit','bronze-recruit','temple-of-ares'),'doreios')).toBe(2);
});
test('Thaleia trigger support is counted and protected; Council is not a free extra terminal slot',()=>{
 const d=deck('bronze-recruit','bronze-recruit','temple-of-athena');
 expect(incomeCapacity(d,'thaleia')).toBe(4);
 expect(safeTrash(d,'thaleia',['2'])).toBe(false);
 expect(incomeCapacity(deck('bronze-recruit','bronze-recruit','council-of-sages'),'thaleia')).toBe(2);
});
test('Nonterminal income counts; conditional reveals and future upgrades do not',()=>{
 expect(incomeCapacity(deck('merchant-fleet','bronze-recruit'),'doreios')).toBe(3);
 expect(incomeCapacity(deck('victorious-procession','hamlet'),'doreios')).toBe(2);
 expect(safeTrash(deck('talent','forge-of-heroes'),'doreios',['0'])).toBe(false);
});

test('Nereon income counts once only when a matching Action is playable',()=>{
 expect(incomeCapacity(deck('obol','obol','temple-of-poseidon'),'nereon')).toBe(3);
 expect(safeTrash(deck('obol','obol','temple-of-poseidon'),'nereon',['2'])).toBe(false);
 expect(incomeCapacity(deck('sea-trade'),'nereon')).toBe(3);
 expect(incomeCapacity(deck('sea-trade','bronze-recruit'),'nereon')).toBe(3);
 expect(incomeCapacity(deck('sea-trade','sea-trade','harbor-pilot'),'nereon')).toBe(5);
 expect(incomeCapacity(deck('obol','obol'),'nereon')).toBe(2);
});
