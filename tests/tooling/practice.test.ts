import {test,expect} from 'bun:test';
import {PracticeSession,BotTracker} from '../../src/lib/bots/session';
import {decide,type BotKind} from '../../src/lib/bots/policy';
import {activePlayer,standings} from '../../src/lib/game/actions';
import {run as historicalRun} from '../../historical-thaleia/runner';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
test('public bot observation does not expose either hidden deck or the opposing hand',()=>{
 const s=new PracticeSession({seed:'privacy',humanLeader:'thaleia',botLeader:'nereon',humanFirst:false,bot:'money'});
 const first=s.tracker.view(s.game);
 s.game.decks.human.hand.reverse();s.game.decks.human.deck.reverse();s.game.decks.bot.deck.reverse();
 expect(s.tracker.view(s.game)).toEqual(first);
 expect(first).not.toHaveProperty('seed');expect(first).not.toHaveProperty('decks');
});
for(const kind of ['money','engine','classic-engine'] as BotKind[])for(const first of [true,false]){
 test(kind+' finishes in both seats, saves/replays exactly, and preserves equal turns '+first,()=>{
  const s=new PracticeSession({seed:'practice-validation-'+kind+'-'+first,humanLeader:'thaleia',botLeader:'nereon',humanFirst:first,bot:kind});
  expect(activePlayer(s.game)).toBe(first?'human':'bot');
  let i=0;
  while(s.game.turn.phase!=='finished'){
   const uid=activePlayer(s.game),view=s.tracker.view(s.game);
   s.apply(decide(view,s.tracker.memories[uid],uid==='bot'?kind:'classic-engine'));
   if(++i>5000)throw Error('Game did not end');
   if(i===30){
    const restored=PracticeSession.restore(structuredClone(s.save()));
    expect(restored.game).toEqual(s.game);
    expect(restored.tracker.view(restored.game)).toEqual(s.tracker.view(s.game));
    const a=activePlayer(s.game);
    expect(decide(restored.tracker.view(restored.game),structuredClone(restored.tracker.memories[a]),kind)).toEqual(decide(s.tracker.view(s.game),structuredClone(s.tracker.memories[a]),kind));
   }
  }
  expect(new Set(Object.values(s.game.turn.turns)).size).toBe(1);
  expect(standings(PracticeSession.restore(structuredClone(s.save())).game)).toEqual(standings(s.game));
 },120000);
}
test('practice entry point retains the exact historical Engine and current Money decisions',()=>{
 const archived=JSON.parse(readFileSync('historical-thaleia/frozen-control.json','utf8'));
 const run=historicalRun(240000,[{name:'engine',historical:true},{name:'money'}],['thaleia','nereon']);
 expect(createHash('sha256').update(JSON.stringify(run.trace)).digest('hex')).toBe(archived.replaySHA256);
 const game=structuredClone(run.trace.initial) as any;
 game.publicActivity=[];
 const tracker=new BotTracker(game);for(const memory of Object.values(tracker.memories))memory.openingOverride=null;
 for(const {uid,command} of run.trace.commands){
  const view=tracker.view(game);
  expect(decide(view,tracker.memories[uid],game.leaders[uid]==='thaleia'?'classic-engine':'money')).toEqual(command);
  const start=game.movements.length;
  // Replay the exact diagnostic sequencing, including acquired-card IDs.
  const sequence=game.activity.length-run.trace.initial.activity.length+1;
  const {applyPlayCommand}=require('../../src/lib/game/actions');
  const message=applyPlayCommand(game,uid,command,sequence);
  game.activity.push({sequence,message});tracker.observe(game,uid,start,command);
 }
},120000);

test('production card effects remain compatible with the versioned bot controllers',async()=>{
 const live=await import('../../src/lib/game/actions');
 const old=await import('../../historical-thaleia/source/src/lib/game/actions');
 const current=await import('../../balance-checkpoint/equal-turns/source/src/lib/game/actions');
 const {cards}=await import('../../src/lib/game/cards');
 for(const card of cards){
  for(const other of [old,current]){
   const definition=other.definition(card.id);
   expect([definition.type,definition.cost,definition.god,definition.vp]).toEqual([card.type,card.cost,card.god,card.vp]);
   if(card.type==='Action')expect(other.actionEffects(card.id)).toEqual(live.actionEffects(card.id));
   if(card.type==='Leader')expect(other.leaderEffects(card.id)).toEqual(live.leaderEffects(card.id));
   if(card.type==='Event')for(const favored of [false,true])expect(other.worshipEffects(card.id,favored)).toEqual(live.worshipEffects(card.id,favored));
  }
 }
});
