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

test('P1 closing the supply grants exactly one P2 reply; P2 closing ends immediately',()=>{
 for(const closer of [0,1]){
  const s=new PracticeSession({seed:'last-reply',humanLeader:'thaleia',botLeader:'nereon',humanFirst:true,bot:'classic-engine'});
  const g=s.game;g.turn.index=closer;g.turn.phase='buys';g.supply.acropolis=0;
  if(closer===1)g.turn.turns.human=1;
  s.apply({type:'turn/ended'});
  if(closer===0){
   expect(String(g.turn.phase)).toBe('actions');expect(activePlayer(g)).toBe('bot');expect(g.turn.finalRound).toBe(true);
   g.turn.phase='buys';s.apply({type:'turn/ended'});
  }
  expect(String(g.turn.phase)).toBe('finished');expect(g.turn.turns).toEqual({human:1,bot:1});
 }
});
test('ordinary multiplayer keeps its immediate-ending rule',()=>{
 const s=new PracticeSession({seed:'ordinary-ending',humanLeader:'thaleia',botLeader:'nereon',humanFirst:true,bot:'classic-engine'});
 s.game.turn.equalTurns=false;s.game.turn.phase='buys';s.game.supply.acropolis=0;
 s.apply({type:'turn/ended'});expect(String(s.game.turn.phase)).toBe('finished');expect(s.game.turn.turns.bot??0).toBe(0);
});

test('leader opening entries act only on legal opening buys and use observed budgets',()=>{
 const s=new PracticeSession({seed:'book-budget',humanLeader:'thaleia',botLeader:'nereon',humanFirst:true,bot:'classic-engine'});
 const view={...s.tracker.view(s.game),phase:'buys' as const,hand:[],choice:null,resources:{actions:0,coins:4,buys:1,worship:0}};
 const m={turn:1,openingOverride:{'1:4':'harbor-pilot'}};
 expect(decide(view,m,'classic-engine')).toEqual({type:'card/bought',cardId:'harbor-pilot'});
 expect((m as any).openingLog).toEqual([{turn:1,key:'1:4',card:'harbor-pilot'}]);
 const noBook=decide(view,{turn:1,openingOverride:null},'classic-engine');
 expect(decide(view,{turn:1,openingOverride:{'1:4':'talent'}},'classic-engine')).toEqual(noBook);
 expect(decide({...view,supply:{...view.supply,'harbor-pilot':0}},{turn:1,openingOverride:{'1:4':'harbor-pilot'}},'classic-engine')).toEqual(decide({...view,supply:{...view.supply,'harbor-pilot':0}},{turn:1,openingOverride:null},'classic-engine'));
 expect(decide(view,{turn:3,openingOverride:{'1:4':'harbor-pilot','3:4':'harbor-pilot'}},'classic-engine')).toEqual(decide(view,{turn:3,openingOverride:null},'classic-engine'));
 expect(decide(view,{turn:1,openingOverride:{'1:4':null}},'classic-engine')).toEqual({type:'turn/ended'});
});

test('saving while a worker is thinking does not advance its turn twice on restore',()=>{
 const s=new PracticeSession({seed:'pending-worker',humanLeader:'thaleia',botLeader:'nereon',humanFirst:false,bot:'classic-engine'});
 s.tracker.view(s.game);
 const restored=PracticeSession.restore(structuredClone(s.save()));
 const view=restored.tracker.view(restored.game);
 expect(restored.tracker.memories.bot.turn).toBe(1);
 expect(decide(view,structuredClone(restored.tracker.memories.bot),'classic-engine')).toEqual(decide(s.tracker.view(s.game),structuredClone(s.tracker.memories.bot),'classic-engine'));
});
