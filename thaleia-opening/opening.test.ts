import {test,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import {base,type StandardMemory} from '../standard-matrix/policy';
import {setupExperiment} from '../balance-checkpoint/equal-turns/source/scripts/balance/experiment';
import {strategyView,inventoryAtSetup} from '../balance-checkpoint/equal-turns/source/scripts/balance/strategy';
import {activePlayer,applyPlayCommand} from '../balance-checkpoint/equal-turns/source/src/lib/game/actions';
const plan=JSON.parse(readFileSync(import.meta.dir+'/plan.json','utf8'));
test('all 158 pairs are legal in both budget orders; each opening buys at most once per turn',()=>{
 for(const c of plan.candidates){
  const [hi,lo]=c.split.split('/').map(Number);
  for(const order of hi===lo?[[hi,lo]]:[[hi,lo],[lo,hi]]){
   const {game}=setupExperiment('book-legality',['thaleia','nereon'],'standard');
   const uid=activePlayer(game),inventory=inventoryAtSetup(game,'standard');
   const m:StandardMemory={turn:1,openingBook:{[c.split]:c.cards}};
   for(let t=0;t<2;t++){
    game.decks[uid].hand=[];game.turn.phase='buys';game.resources={actions:0,coins:order[t],buys:1,worship:0};m.turn=t+1;
    const v=strategyView(game,uid,inventory,undefined,'standard'),command=base(v,m,'engine');
    const expected=c.cards[hi===lo?t:order[t]===hi?0:1];
    expect(command).toEqual(expected===null?{type:'turn/ended'}:{type:'card/bought',cardId:expected});
    if(command.type==='card/bought')applyPlayCommand(game,uid,command,t+1,'standard');
    expect(base(v,m,'engine')).toEqual({type:'turn/ended'});
   }
  }
 }
});
test('custom book only controls turns one and two, and never changes Money',()=>{
 const {game}=setupExperiment('book-boundary',['thaleia','nereon'],'standard'),uid=activePlayer(game);
 const v=strategyView(game,uid,inventoryAtSetup(game,'standard'),undefined,'standard');
 for(const name of ['engine','money'] as const){
  const turn=name==='engine'?3:1;
  expect(base(v,{turn,openingBook:{'3/3':['obol','obol']}},name)).toEqual(base(v,{turn,openingBook:null},name));
 }
});

test('registered default changes Thaleia only; other leaders retain the existing opening',()=>{
 for(const leader of ['thaleia','nereon','melia','doreios']){
  const {game}=setupExperiment('leader-book-scope',[leader,leader==='nereon'?'thaleia':'nereon'],'standard');
  const uid=activePlayer(game);game.decks[uid].hand=[];game.turn.phase='buys';game.resources={actions:0,coins:4,buys:1,worship:0};
  const v=strategyView(game,uid,inventoryAtSetup(game,'standard'),undefined,'standard');
  expect(base(v,{turn:1},'engine')).toEqual({type:'card/bought',cardId:leader==='thaleia'?'council-of-sages':'harvest-feast'});
  expect(base(v,{turn:1,openingBook:null},'engine')).toEqual({type:'card/bought',cardId:'harvest-feast'});
 }
});
