
import {test,expect} from 'bun:test';
import {setupExperiment} from './source/scripts/balance/experiment';
import {activePlayer,applyPlayCommand,standings} from './source/src/lib/game/actions';
import {inventoryAtSetup,strategyView} from './source/scripts/balance/strategy';
import {endingShare,publicHorizon} from './source/scripts/balance/planning';
function setup(equal=true){
 const {game}=setupExperiment('equal-rule',['thaleia','nereon'],'base-game');
 game.turn.equalTurns=equal;game.turn.phase='buys';game.resources.coins=8;game.supply.acropolis=1;
 return game;
}
test('P1 depletion grants exactly one reply; empty piles remain empty and tie scores split',()=>{
 const g=setup(),[a,b]=g.turnOrder;
 applyPlayCommand(g,a,{type:'card/bought',cardId:'acropolis'},1,'base-game');
 applyPlayCommand(g,a,{type:'turn/ended'},2,'base-game');
 expect(String(g.turn.phase)).toBe('actions');expect(activePlayer(g)).toBe(b);
 expect(g.turn.finalRound).toBe(true);expect(g.supply.acropolis).toBe(0);
 g.turn.phase='buys';g.resources.coins=10;g.resources.buys=2;
 applyPlayCommand(g,b,{type:'card/bought',cardId:'polis'},3,'base-game');
 applyPlayCommand(g,b,{type:'card/bought',cardId:'polis'},4,'base-game');
 applyPlayCommand(g,b,{type:'turn/ended'},5,'base-game');
 expect(String(g.turn.phase)).toBe('finished');
 expect(g.turn.turns).toEqual({[a]:1,[b]:1});
 expect(standings(g).filter(p=>p.winner).length).toBe(2);
});
test('P2 can overtake P1 during the reply',()=>{
 const g=setup(),[a,b]=g.turnOrder;
 applyPlayCommand(g,a,{type:'card/bought',cardId:'acropolis'},1,'base-game');
 applyPlayCommand(g,a,{type:'turn/ended'},2,'base-game');
 g.turn.phase='buys';g.resources.coins=15;g.resources.buys=3;
 for(let i=0;i<3;i++)applyPlayCommand(g,b,{type:'card/bought',cardId:'polis'},3+i,'base-game');
 applyPlayCommand(g,b,{type:'turn/ended'},6,'base-game');
 expect(standings(g).filter(p=>p.winner).map(p=>p.uid)).toEqual([b]);
});
test('P2 depletion scores immediately without giving P1 another turn',()=>{
 const g=setup(),[a,b]=g.turnOrder;
 g.turn.index=1;g.turn.turns[a]=1;
 applyPlayCommand(g,b,{type:'card/bought',cardId:'acropolis'},1,'base-game');
 applyPlayCommand(g,b,{type:'turn/ended'},2,'base-game');
 expect(String(g.turn.phase)).toBe('finished');expect(g.turn.turns).toEqual({[a]:1,[b]:1});
});
test('three-pile endings also finish the round',()=>{
 const g=setup(),[a,b]=g.turnOrder;
 g.supply.acropolis=6;g.supply.obol=0;g.supply.drachma=0;g.supply.talent=0;
 applyPlayCommand(g,a,{type:'turn/ended'},1,'base-game');
 expect(activePlayer(g)).toBe(b);expect(String(g.turn.phase)).toBe('actions');
 g.turn.phase='treasures';applyPlayCommand(g,b,{type:'turn/ended'},2,'base-game');
 expect(String(g.turn.phase)).toBe('finished');
});
test('immediate-ending control remains unchanged',()=>{
 const g=setup(false),a=activePlayer(g);
 applyPlayCommand(g,a,{type:'card/bought',cardId:'acropolis'},1,'base-game');
 applyPlayCommand(g,a,{type:'turn/ended'},2,'base-game');
 expect(String(g.turn.phase)).toBe('finished');expect(g.turn.finalRound).toBeUndefined();
});
test('public planning knows about the reply and final turn',()=>{
 const g=setup(),[a,b]=g.turnOrder,inv=inventoryAtSetup(g,'base-game');
 let v=strategyView(g,a,inv,undefined,'base-game');
 v.myScore=100;
 expect(endingShare(v,0,{...v.supply,acropolis:0})).toBeNull();
 applyPlayCommand(g,a,{type:'card/bought',cardId:'acropolis'},1,'base-game');
 applyPlayCommand(g,a,{type:'turn/ended'},2,'base-game');
 v=strategyView(g,b,inv,undefined,'base-game');v.horizonOverride=5;
 expect(publicHorizon(v)).toBe(0);
 expect(endingShare(v)).not.toBeNull();
});
