import {test,expect} from 'bun:test';
import {incomeProxy,beneficialTrash} from './trash-policy';
import {setupExperiment} from '../../balance-checkpoint/equal-turns/source/scripts/balance/experiment';
const deck=(...ids:string[])=>ids.map((cardId,i)=>({id:String(i),cardId,copy:i}));
function state(ids:string[],leader='doreios',forge=false){
 const {game:g}=setupExperiment('trash-fixture',[leader,'thaleia']);const uid=g.turnOrder[0];
 g.decks[uid]={hand:deck(...ids),deck:[],discard:[],play:[]};
 g.turn.choice={id:'test',kind:'trash',source:forge?'forge-of-heroes':'seed-keeper',min:0,max:2,...(forge?{forge:true}:{})};
 return {g,uid};
}
test('Starting Hamlet removal improves income, while starting Obol removal does not',()=>{
 const {g,uid}=state([...Array(6).fill('obol'),...Array(3).fill('hamlet'),'temple-of-ares']);
 expect(beneficialTrash(g,uid,['6'])).toBe(true);
 expect(beneficialTrash(g,uid,['0'])).toBe(false);
});
test('Draw is valuable, and terminal collisions are respected',()=>{
 expect(incomeProxy(deck('talent','talent','council-of-sages',...Array(7).fill('hamlet')),'doreios')).toBeGreaterThan(incomeProxy(deck('talent','talent',...Array(7).fill('hamlet')),'doreios'));
 expect(incomeProxy(deck('bronze-recruit','bronze-recruit'),'doreios')).toBe(2);
 expect(incomeProxy(deck('bronze-recruit','bronze-recruit','harbor-pilot'),'doreios')).toBe(4);
});
test('Protect remaining cash and late points',()=>{
 const {g,uid}=state(['talent','hamlet']);expect(beneficialTrash(g,uid,['0'])).toBe(false);
 const late=state(['talent','talent','talent',...Array(6).fill('hamlet'),'acropolis']);
 late.g.turn.finalRound=true;expect(beneficialTrash(late.g,late.uid,['9'])).toBe(false);
});
test('Upgrade expectations use random legal gains; calling evaluator cannot mutate game',()=>{
 const {g,uid}=state(['talent','talent','obol','hamlet'], 'doreios',true);
 const before=JSON.stringify(g);beneficialTrash(g,uid,['3']);expect(JSON.stringify(g)).toBe(before);
});
