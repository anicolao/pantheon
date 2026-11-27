import {test,expect} from 'bun:test';
import {replaySetup,setupSupply,type CardInstance,type SetupState} from '../../src/lib/game/setup';
import {applyPlayCommand,activePlayer,canPlayAction,canPlayTreasure,definition,effectOptions,worshipEffects,type ActionCommand} from '../../src/lib/game/actions';
import {publicCommandContext,describePublicCommand} from '../../src/lib/game/public-table';
import {UndoHistory} from '../../src/lib/game/undo';
import {expansionFixture,expansionScenarios} from '../../src/routes/dev/animations/expansion-scenarios';

const instances=(ids:string[],prefix:string):CardInstance[]=>ids.map((cardId,i)=>({id:prefix+i,cardId,copy:1}));
function position(leader='achilles',hand=['phalanx-advance'],deck=['obol','hamlet','drachma']){
 const g=replaySetup(expansionFixture('expansion-rallying-cry',2,['a','b']).events);
 g.turn.index=g.turnOrder.indexOf('a');g.leaders.a=leader;g.turn.phase='actions';g.turn.leaderUsed=false;g.turn.choice=null;g.turn.queue=[];delete g.turn.deploy;delete g.turn.revealed;
 g.decks.a={hand:instances(hand,'h'),deck:instances(deck,'d'),discard:[],play:[]};
 g.decks.b={hand:[],deck:[],discard:[],play:[]};g.resources={actions:1,coins:0,buys:1,worship:1};
 return g;
}
function run(g:SetupState,command:ActionCommand){
 const sequence=g.activity.length+1,before=publicCommandContext(g,'a');
 const message=applyPlayCommand(g,'a',command,sequence);g.activity.push({sequence,message});
 const entry=describePublicCommand(before,g,{...command,schemaVersion:1,reducerVersion:1,sequence,actorUid:'a',name:'Achilles',playerCount:2});
 g.publicActivity.push(entry);return entry;
}
const play=(g:SetupState,id:string)=>run(g,{type:'action/played',instanceId:g.decks.a.hand.find(card=>card.cardId===id)!.id});
const choose=(g:SetupState,targets:string[])=>run(g,{type:'choice/resolved',choiceId:g.turn.choice!.id,targets});

test('all expansion lab histories replay and trigger through the real reducer in 2–4 seats',()=>{
 for(const count of [2,3,4] as const)for(const scenario of expansionScenarios){
  const fixture=expansionFixture(scenario.id,count,Array.from({length:count},(_,i)=>'p'+i));
  const game=replaySetup(fixture.events),sequence=fixture.events.length+1;
  expect(activePlayer(game)).toBe(fixture.actor);
  expect(Object.keys(game.supply).filter(id=>definition(id).type==='Action')).toHaveLength(12);
  const event={...fixture.trigger!,schemaVersion:1 as const,reducerVersion:1 as const,sequence,commandId:'trigger',actorUid:fixture.actor,name:game.players.find(p=>p.uid===fixture.actor)!.name,playerCount:count};
  const after=replaySetup([...fixture.events,event]);
  expect(after.activity).toHaveLength(sequence);
  expect(after.publicActivity.at(-1)?.command).toBe(fixture.trigger!.type);
 }
},30000);

test('market preserves old twelve piles and expansion fills four whole houses reproducibly',()=>{
 expect(setupSupply(2).filter(p=>definition(p.id).type==='Action')).toHaveLength(12);
 const supply=setupSupply(3,['echo','theseus','achilles'],'fixed');
 expect(supply).toEqual(setupSupply(3,['echo','theseus','achilles'],'fixed'));
 const actions=supply.filter(p=>definition(p.id).type==='Action');
 expect(actions).toHaveLength(12);
 for(const god of new Set(actions.map(p=>definition(p.id).god)))expect(actions.filter(p=>definition(p.id).god===god)).toHaveLength(3);
});

test('Deploy 3 resolves one physical card three times and leader triggers once afterwards',()=>{
 const g=position('theseus',['sacred-academy'],Array(8).fill('obol'));g.turn.deploy=3;g.resources.actions=0;g.turn.phase='buys';
 expect(canPlayAction(g,'a','h0')).toBe(true);play(g,'sacred-academy');
 expect(g.decks.a.hand).toHaveLength(6);expect(g.decks.a.play).toHaveLength(1);expect(g.resources.actions).toBe(3);expect(g.turn.deploy).toBeUndefined();expect(g.turn.phase).toBe('buys');
 const h=position('achilles',['myrmidon-vanguard']);h.turn.deploy=3;play(h,'myrmidon-vanguard');
 expect(h.resources.coins).toBe(6);expect(h.turn.deploy).toBe(1);expect(h.turn.leaderUsed).toBe(true);
 expect(h.movements.filter(m=>m.sequence===h.activity.length&&m.kind==='play')).toHaveLength(1);
});

test('Deploy stacking adds repetitions; favored worship grants three',()=>{
 expect(worshipEffects('march-of-victory',true)).toEqual([{kind:'deploy',amount:3,source:'march-of-victory'}]);
 const g=position('achilles',[]);g.turn.deploy=2;g.decks.a.play=instances(['temple-of-nike','rallying-cry'],'p');g.sharedEvents=['march-of-victory'];g.resources.coins=3;
 run(g,{type:'god/worshipped',cardId:'march-of-victory'});expect(g.turn.deploy).toBe(4);
});

test('repeated Forge pays separate costs, pauses for each gain, and permits declining',()=>{
 const g=position('achilles',['forge-of-heroes','hamlet','hamlet']);g.turn.deploy=3;play(g,'forge-of-heroes');
 for(const id of ['h1','h2']){
  expect(g.turn.choice?.kind).toBe('trash');choose(g,[id]);expect(g.turn.choice?.kind).toBe('gain');choose(g,['drachma']);
 }
 expect(g.turn.choice).toBeNull();expect(g.decks.a.discard.map(c=>c.cardId)).toEqual(['drachma','drachma']);expect(g.trash).toHaveLength(2);
});

test('Echo borrows without copying, preserves owner, returns to owner at cleanup',()=>{
 const g=position('echo',['borrowed-voice']);g.decks.b.discard=instances(['oracles-acolyte'],'o');
 play(g,'borrowed-voice');const entry=choose(g,['o0']);
 expect(g.decks.b.discard).toHaveLength(0);expect(g.decks.a.play.find(c=>c.id==='o0')?.ownerUid).toBe('b');
 expect(entry.steps.find(s=>s.kind==='play')?.from).toEqual({zone:'discard',uid:'b'});
 // Echo leader resolves after the borrowed card; there are no eligible targets.
 expect(g.turn.choice).toBeNull();
 run(g,{type:'phase/advanced'});const cleanup=run(g,{type:'turn/ended'});
 expect(g.decks.b.discard.map(c=>c.id)).toEqual(['o0']);expect(g.decks.b.discard[0].ownerUid).toBeUndefined();
 expect(cleanup.steps.some(s=>s.card?.id==='o0'&&s.to.uid==='b'&&s.from.uid==='a')).toBe(true);
});

test('Echo fallback reveals Treasure and Territory, and a nonempty ineligible discard never falls back',()=>{
 for(const cardId of ['drachma','hamlet']){
  const g=position('theseus',['borrowed-voice']);g.decks.b.deck=instances([cardId],'o');play(g,'borrowed-voice');
  const entry=choose(g,['deck:b']);
  expect(entry.steps.some(s=>s.kind==='reveal'&&s.from.uid==='b')).toBe(true);
  expect(g.resources.coins).toBe(cardId==='drachma'?2:0);
  expect(g.activity.at(-1)!.message).toContain(cardId==='drachma'?'played Drachma, +2 Coins':'Hamlet is a Territory: no effect');
  expect(g.decks.b.discard).toHaveLength(cardId==='hamlet'?1:0);
 }
 const g=position('theseus',['borrowed-voice']);g.decks.b.discard=instances(['hamlet'],'o');g.decks.b.deck=instances(['oracles-acolyte'],'d');
 play(g,'borrowed-voice');expect(g.turn.choice).toBeNull();expect(g.decks.b.deck).toHaveLength(1);
});

test('Seek holds revealed cards outside reshuffles; keeps only matching card, discards all others',()=>{
 const g=position('achilles',['ariadnes-thread'],['hamlet']);g.decks.a.discard=instances(['talent','obol'],'r');
 play(g,'ariadnes-thread');
 expect(g.turn.revealed).toHaveLength(3);expect(g.decks.a.deck).toHaveLength(0);expect(g.decks.a.discard).toHaveLength(0);
 expect(()=>choose(g,['d0'])).toThrow('eligible');
 choose(g,['r0']);expect(g.decks.a.hand.map(c=>c.cardId)).toEqual(['talent']);expect(g.decks.a.discard).toHaveLength(2);expect(g.turn.revealed).toBeUndefined();
});

test('Bind chooses across opponents, later placement is above earlier and removes selection',()=>{
 const g=position('theseus',['gorgons-gaze']);g.turn.deploy=2;g.decks.b.discard=instances(['polis','hamlet'],'o');
 play(g,'gorgons-gaze');const first=choose(g,['o0']);
 expect(effectOptions(g,'a').map(o=>o.id)).toEqual(['o1']);
 expect(first.steps[0].from).toEqual({zone:'discard',uid:'b'});expect(first.steps[0].to).toEqual({zone:'deck',uid:'b'});
 choose(g,['o1']);expect(g.decks.b.deck.map(c=>c.cardId)).toEqual(['hamlet','polis']);expect(g.resources.coins).toBe(4);
});

test('Shield only discards Territory, optionally, and draws only when paid',()=>{
 const g=position('achilles',['polished-shield','hamlet','obol']);play(g,'polished-shield');
 expect(()=>choose(g,['h2'])).toThrow('hand');choose(g,[]);expect(g.decks.a.hand).toHaveLength(3);
 const h=position('achilles',['polished-shield','hamlet']);play(h,'polished-shield');choose(h,['h1']);
 expect(h.decks.a.discard.map(c=>c.cardId)).toEqual(['hamlet']);expect(h.decks.a.hand).toHaveLength(2);
});

test('reveals stop undo while a public Bind can be undone',()=>{
 const g=position('theseus',['borrowed-voice']);g.decks.b.deck=instances(['hamlet'],'o');const history=new UndoHistory();
 history.apply(g,'a',{type:'action/played',instanceId:'h0'},100);expect(g.undo).not.toBeNull();
 history.apply(g,'a',{type:'choice/resolved',choiceId:g.turn.choice!.id,targets:['deck:b']},101);expect(g.undo).toBeNull();
 const h=position('theseus',['gorgons-gaze']);h.decks.b.discard=instances(['hamlet'],'o');
 history.apply(h,'a',{type:'action/played',instanceId:'h0'},110);
 history.apply(h,'a',{type:'choice/resolved',choiceId:h.turn.choice!.id,targets:['o0']},111);expect(h.undo?.sequence).toBe(111);
 history.apply(h,'a',{type:'action/undone',targetSequence:111},112);expect(h.decks.b.discard).toHaveLength(1);expect(h.decks.b.deck).toHaveLength(0);
});

test('retained Treasures play during Buy without reopening Action phase',()=>{
 const g=position('theseus',['talent']);g.turn.phase='buys';
 expect(canPlayTreasure(g,'a','h0')).toBe(true);run(g,{type:'treasure/played',instanceId:'h0'});expect(g.resources.coins).toBe(3);expect(g.turn.phase).toBe('buys');
});

test('nested Echo follows real discard membership and can consume pending Deploy',()=>{
 const g=position('theseus',['borrowed-voice']);
 g.decks.b.discard=instances(['borrowed-voice','temple-of-zeus'],'o');
 play(g,'borrowed-voice');
 // Grant already pending when Echo finds the next actual Action play.
 g.turn.deploy=2;
 choose(g,['o0']);
 expect(g.decks.a.play.filter(card=>card.id==='o0')).toHaveLength(1);
 expect(effectOptions(g,'a').map(option=>option.id)).toEqual(['o1']);
 choose(g,['o1']);
 expect(g.turn.choice).toBeNull();
 expect(g.decks.b.discard).toHaveLength(0);
 expect(g.decks.a.play.map(card=>card.id)).toEqual(['h0','o0','o1']);
 expect(g.resources.worship).toBe(2);
 expect(g.turn.deploy).toBeUndefined();
 expect(g.movements.filter(move=>move.kind==='resolution'&&move.card?.id==='o0')).toHaveLength(2);
});

test('Seek retains no cards when declining, and cannot reveal a held card twice',()=>{
 const g=position('theseus',['labyrinth-scout'],['hamlet']);
 play(g,'labyrinth-scout');expect(g.turn.revealed?.map(card=>card.id)).toEqual(['d0']);
 choose(g,[]);
 // Theseus now resolves his own Seek: the earlier reveal was discarded and
 // may legitimately be shuffled for this distinct effect.
 expect(g.turn.choice?.kind).toBe('seek');
 expect(g.turn.revealed?.map(card=>card.id)).toEqual(['d0']);
 choose(g,[]);expect(g.turn.choice).toBeNull();expect(g.decks.a.discard.map(card=>card.id)).toEqual(['d0']);
});

test('Ariadne’s Thread and Theseus produce distinct, ordered Treasure and Action Seeks',()=>{
 const g=position('theseus',['ariadnes-thread'],['talent','hamlet','obol','oracles-acolyte','drachma']);
 play(g,'ariadnes-thread');
 expect(g.turn.choice?.source).toBe('ariadnes-thread');
 expect(g.turn.choice?.filter).toBe('Treasure');
 expect(g.turn.revealed?.map(card=>card.cardId)).toEqual(['talent','hamlet','obol']);
 const reveals=g.publicActivity.at(-1)!.steps.filter(step=>step.kind==='reveal');
 expect(reveals).toHaveLength(3);
 expect(new Set(reveals.map(step=>step.batch)).size).toBe(1);
 expect(reveals.every(step=>!!step.batch)).toBe(true);
 const next=choose(g,['d0']);
 expect(g.turn.choice?.source).toBe('theseus');
 expect(g.turn.choice?.filter).toBe('Action');
 expect(g.turn.revealed?.map(card=>card.cardId)).toEqual(['oracles-acolyte','drachma']);
 const leaderIndex=next.steps.findIndex(step=>step.kind==='leader');
 expect(next.steps.slice(0,leaderIndex).filter(step=>step.kind==='discard')).toHaveLength(2);
 expect(next.steps.slice(leaderIndex+1).filter(step=>step.kind==='reveal')).toHaveLength(2);
 choose(g,['d3']);
 expect(g.turn.choice).toBeNull();
 expect(g.decks.a.hand.map(card=>card.cardId)).toEqual(['talent','oracles-acolyte']);
});

test('Borrowed Voice introduction offers a real Action from Nereon’s discard',()=>{
 const fixture=expansionFixture('expansion-borrowed-voice',2,['a','b']);
 const g=replaySetup(fixture.events);
 run(g,fixture.trigger as ActionCommand);
 expect(g.leaders.b).toBe('nereon');
 expect(effectOptions(g,'a').some(option=>option.card?.cardId==='harbor-pilot')).toBe(true);
 expect(g.turn.choice?.source).toBe('borrowed-voice');
});

test('leader Echo with no remaining target publishes an explicit on-table outcome',()=>{
 const fixture=expansionFixture('expansion-borrowed-voice',2,['a','b']);
 const g=replaySetup(fixture.events);
 run(g,fixture.trigger as ActionCommand);
 const pilot=effectOptions(g,'a').find(option=>option.card?.cardId==='harbor-pilot')!;
 const entry=choose(g,[pilot.id]);
 expect(g.turn.choice).toBeNull();
 const outcome=entry.steps.find(step=>step.kind==='notice');
 expect(outcome?.effect).toBe('Echo · Leader ability');
 expect(outcome?.notice).toContain('Nereon');
 expect(outcome?.notice).toContain('not empty');
 expect(entry.steps.findIndex(step=>step.kind==='notice')).toBeGreaterThan(entry.steps.findIndex(step=>step.kind==='leader'));
});

test('every Nike scenario leaves a legal Deploy target in hand after its trigger',()=>{
 const subjects=['rallying-cry','myrmidon-vanguard','phalanx-advance','march-of-victory','deploy-draw','deploy-forge'];
 for(const count of [2,3,4] as const)for(const subject of subjects){
  const ids=Array.from({length:count},(_,index)=>'p'+index);
  const fixture=expansionFixture('expansion-'+subject,count,ids);
  const g=replaySetup(fixture.events),uid=fixture.actor;
  applyPlayCommand(g,uid,fixture.trigger as ActionCommand,fixture.events.length+1);
  const targetId=subject==='deploy-forge'?'forge-of-heroes':'sacred-academy';
  const target=g.decks[uid].hand.find(card=>card.cardId===targetId);
  expect(target).toBeDefined();
  expect(g.turn.choice).toBeNull();
  const repeats=['march-of-victory','deploy-draw','deploy-forge'].includes(subject)?3:subject==='phalanx-advance'?2:1;
  expect(g.turn.deploy).toBe(repeats);
  expect(canPlayAction(g,uid,target!.id)).toBe(true);
  applyPlayCommand(g,uid,{type:'action/played',instanceId:target!.id},fixture.events.length+2);
  expect(g.decks[uid].play.filter(card=>card.id===target!.id)).toHaveLength(1);
  expect(g.turn.deploy).toBeUndefined();
 }
});

test('Seek duplicate stacks preserve physical identities and keep exactly one copy',async()=>{
 const {seekPiles}=await import('../../src/lib/components/play/seek-piles');
 const g=position('achilles',[],['talent','obol','obol','hamlet','obol','talent']);
 g.sharedEvents=['open-the-hidden-way'];g.resources.coins=3;
 g.decks.a.play=instances(['temple-of-hermes','ariadnes-thread'],'played');
 run(g,{type:'god/worshipped',cardId:'open-the-hidden-way'});
 const before=structuredClone(g.turn.revealed!);
 const piles=seekPiles(g.turn.revealed!);
 expect(piles.map(pile=>[pile.cardId,pile.copies.length])).toEqual([['obol',3],['hamlet',1],['talent',2]]);
 expect(g.turn.revealed).toEqual(before);
 expect(piles.flatMap(pile=>pile.copies.map(card=>card.id)).sort()).toEqual(before.map(card=>card.id).sort());
 const choiceId=g.turn.choice!.id;
 run(g,{type:'choice/browsed',choiceId,cardId:'obol'});
 expect(g.turn.choice?.browsedCardId).toBe('obol');
 expect(g.turn.revealed).toEqual(before);
 expect(()=>run(g,{type:'choice/browsed',choiceId,cardId:'acropolis'})).toThrow('available');
 const selected=piles.find(pile=>pile.cardId==='obol')!.copies[0];
 choose(g,[selected.id]);
 expect(g.decks.a.hand.map(card=>card.id)).toEqual([selected.id]);
 expect(g.decks.a.discard).toHaveLength(5);
 expect(g.decks.a.discard.filter(card=>card.cardId==='obol')).toHaveLength(2);
});
