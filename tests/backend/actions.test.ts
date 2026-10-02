import { expect, test } from 'bun:test';
import { applyPlayCommand, definition, actionEffects, standings, departureReminder, purchaseReason, canPlayTreasure, type ActionCommand } from '../../src/lib/game/actions';
import { replaySetup, type CardInstance, type SetupEvent, type SetupState } from '../../src/lib/game/setup';

function game(leader = 'thaleia', hand = ['oracles-acolyte', 'hamlet', 'obol'], deck = ['obol', 'hamlet', 'drachma', 'talent']): SetupState {
  const events: SetupEvent[] = [
    { schemaVersion: 1, sequence: 1, actorUid: 'a', name: 'Ariadne', playerCount: 2, type: 'game/created' },
    { schemaVersion: 1, sequence: 2, actorUid: 'b', name: 'Theseus', playerCount: 2, type: 'player/joined' },
    { schemaVersion: 1, reducerVersion: 1, commandId: 'start', sequence: 3, actorUid: 'a', name: 'Ariadne', playerCount: 2, type: 'draft/started', seed: 'actions' }
  ];
  let result = replaySetup(events);
  for (const uid of result.draftOrder) { events.push({ schemaVersion: 1, reducerVersion: 1, commandId: uid, sequence: events.length + 1, actorUid: uid, name: uid === 'a' ? 'Ariadne' : 'Theseus', playerCount: 2, type: 'leader/chosen', leaderId: uid === 'a' ? leader : leader === 'thaleia' ? 'nereon' : 'thaleia' }); }
  result = replaySetup(events); result.turn.index = result.turnOrder.indexOf('a');
  result.decks.a = { hand: instances(hand, 'h'), deck: instances(deck, 'd'), discard: [], play: [] };
  return result;
}
const instances = (ids: string[], prefix: string): CardInstance[] => ids.map((cardId, i) => ({ id: `${prefix}-${i}`, cardId, copy: i + 1 }));
let seq = 10;
function run(state: SetupState, command: ActionCommand) { return applyPlayCommand(state, 'a', command, ++seq); }
const play = (state: SetupState, index = 0) => run(state, { type: 'action/played', instanceId: state.decks.a.hand[index].id });
const choose = (state: SetupState, targets: string[]) => run(state, { type: 'choice/resolved', choiceId: state.turn.choice!.id, targets });

test('gain browsing validates the current public choice, actor, cost and stock without gaining', () => {
  const state = game('nereon', ['sacred-grove']); play(state);
  const choiceId = state.turn.choice!.id;
  const before = structuredClone(state);
  run(state, {type:'choice/browsed',choiceId,cardId:'drachma'});
  expect(state.turn.choice?.browsedCardId).toBe('drachma');
  const unchanged = structuredClone(state); delete unchanged.turn.choice!.browsedCardId;
  expect(unchanged).toEqual(before);
  for(const command of [
    {type:'choice/browsed',choiceId:'stale',cardId:'drachma'},
    {type:'choice/browsed',choiceId,cardId:'acropolis'},
    {type:'choice/browsed',choiceId,cardId:'missing'}
  ] as const) expect(()=>run(state,command)).toThrow();
  expect(()=>applyPlayCommand(state,'b',{type:'choice/browsed',choiceId,cardId:'drachma'},99)).toThrow('turn');
  state.supply.drachma=0;
  expect(()=>run(state,{type:'choice/browsed',choiceId,cardId:'drachma'})).toThrow('available');
  state.turn.choice!.kind='trash';
  expect(()=>run(state,{type:'choice/browsed',choiceId,cardId:'hamlet'})).toThrow('available');
});

test('every printed Action and Temple resolves its ordered resource and draw effects', () => {
  const cases: [string, number, number, number, number][] = [
    ['oracles-acolyte', 1, 1, 0, 1], ['council-of-sages', 3, 0, 0, 1], ['sacred-academy', 2, 1, 0, 1],
    ['harbor-pilot', 1, 2, 0, 1], ['sea-trade', 0, 0, 2, 2], ['merchant-fleet', 1, 1, 1, 2], ['bronze-recruit', 0, 0, 2, 1]
  ];
  for (const [id, drawn, actions, coins, buys] of cases) {
    const state = game(definition(id).god === 'Athena' ? 'nereon' : 'thaleia', [id]); play(state);
    expect(state.decks.a.hand.length).toBe(drawn); expect(state.resources).toEqual({ actions, coins, buys, worship: 1 }); expect(state.decks.a.play[0].cardId).toBe(id);
  }
  for (const [leader, god] of [['thaleia','athena'],['nereon','poseidon'],['melia','demeter'],['doreios','ares']]) {
    const state = game(leader, [`temple-of-${god}`, `temple-of-${god}`, 'obol']); play(state);
    expect(state.resources.worship).toBe(2); expect(state.resources.actions).toBe(leader === 'thaleia' ? 2 : 1);
    if (state.turn.choice) choose(state, []);
    const drawn = state.decks.a.hand.length; play(state);
    expect(state.resources.worship).toBe(3); expect(state.turn.choice).toBeNull(); expect(state.decks.a.hand.length).toBe(drawn - 1);
    expect(state.resources.coins).toBe(leader === 'nereon' ? 1 : 0);
  }
  expect(() => actionEffects('obol')).toThrow();
});

test('trash is optional, rejects duplicates/self/non-hand targets, then triggers Melia even after zero', () => {
  for (const n of [0, 1, 2]) {
    const state = game('melia', ['seed-keeper', 'obol', 'hamlet']); play(state);
    expect(state.decks.a.hand).toHaveLength(2); expect(state.turn.choice?.max).toBe(2);
    expect(() => choose(state, ['h-0'])).toThrow(); expect(() => choose(state, ['h-1', 'h-1'])).toThrow();
    choose(state, state.decks.a.hand.slice(0, n).map(card => card.id));
    expect(state.trash.length).toBe(n); expect(state.decks.a.hand.length).toBe(3 - n); expect(state.turn.choice).toBeNull();
  }
  const empty = game('melia', ['seed-keeper'], []); play(empty); expect(empty.turn.leaderUsed).toBe(true); expect(empty.turn.choice).toBeNull();
});

test('Harvest draws before mandatory discard and Melia draws only after that choice', () => {
  const state = game('melia', ['harvest-feast']); play(state);
  expect(state.decks.a.hand.map(card => card.id)).toEqual(['d-0', 'd-1']); expect(state.resources.actions).toBe(1);
  expect(() => choose(state, [])).toThrow();
  const id = state.turn.choice!.id; choose(state, ['d-1']);
  expect(state.decks.a.hand.map(card => card.id)).toEqual(['d-0','d-2']); expect(state.decks.a.discard[0].cardId).toBe('hamlet');
  expect(() => run(state, { type: 'choice/resolved', choiceId: id, targets: ['d-1'] })).toThrow();
  const empty = game('melia', ['harvest-feast'], []); play(empty); expect(empty.turn.choice).toBeNull(); expect(empty.resources.actions).toBe(1);
});

test('Forge conditional gain includes cheaper cards, exact ceiling and zero-cost Temples; Doreios follows gain', () => {
  for (const target of ['hamlet','temple-of-ares']) {
    const state = game('doreios', ['forge-of-heroes', target, 'obol']); play(state);
    choose(state, ['h-1']); expect(state.turn.choice?.limit).toBe(definition(target).cost! + 2);
    expect(() => choose(state, ['acropolis'])).toThrow(); expect(() => choose(state, ['temple-of-athena'])).toThrow();
    choose(state, ['obol']); expect(state.decks.a.discard.at(-1)?.cardId).toBe('obol'); expect(state.supply.obol).toBe(39);
    expect(state.turn.choice?.source).toBe('doreios'); choose(state, []); expect(state.turn.choice).toBeNull();
    expect(state.movements.find(move => move.kind === 'gain')!.card?.copy).toBe(1);
  }
  const skip = game('doreios', ['forge-of-heroes', 'obol']); play(skip); choose(skip, []); expect(skip.turn.choice?.source).toBe('doreios'); choose(skip, []); expect(skip.decks.a.discard).toHaveLength(0);
});

test('Sacred Grove empty or eligible gains finish before leader draw; empty piles cannot be selected', () => {
  const state = game('melia', ['sacred-grove']); play(state); expect(state.decks.a.hand).toHaveLength(0); expect(state.turn.choice?.kind).toBe('gain');
  expect(() => choose(state, ['polis'])).toThrow(); state.supply.hamlet = 0; expect(() => choose(state, ['hamlet'])).toThrow(); choose(state, ['sea-trade']);
  expect(state.resources.actions).toBe(1); expect(state.decks.a.hand).toHaveLength(1); expect(state.decks.a.discard[0].cardId).toBe('sea-trade');
  const empty = game('melia', ['sacred-grove']); for (const id of Object.keys(empty.supply)) empty.supply[id] = 0; play(empty); expect(empty.turn.choice).toBeNull(); expect(empty.decks.a.hand).toHaveLength(1);
});

test('Procession reveals publicly, discards Territory for coins, returns non-Territory, and excludes the revealed card from shuffles', () => {
  for (const id of ['hamlet','obol']) {
    const state = game('doreios', ['victorious-procession', 'obol'], [id]); play(state);
    expect(state.resources.coins).toBe(id === 'hamlet' ? 4 : 2); expect(state.resources.buys).toBe(2);
    expect(state.decks.a.deck.length).toBe(id === 'hamlet' ? 0 : 1); expect(state.decks.a.discard.length).toBe(id === 'hamlet' ? 1 : 0);
    expect(state.movements.find(move => move.kind === 'reveal')?.card?.cardId).toBe(id); expect(state.turn.choice?.source).toBe('doreios');
  }
  const empty = game('thaleia', ['victorious-procession'], []); play(empty); expect(empty.resources.coins).toBe(2); expect(empty.movements.some(move => move.kind === 'reveal')).toBe(false);
  const shuffled = game('thaleia', ['victorious-procession'], []); shuffled.decks.a.discard = instances(['hamlet'], 'discard'); play(shuffled); expect(shuffled.resources.coins).toBe(4); expect(shuffled.turn.shuffles.a).toBe(1);
});

test('draw crosses a seeded shuffle once and never includes hand, play, or trash', () => {
  const state = game('thaleia', ['council-of-sages','obol'], ['hamlet']); state.decks.a.discard = instances(['talent','drachma'], 'discard'); state.trash = instances(['polis'], 'trash');
  const second = structuredClone(state); play(state); play(second);
  expect(state.decks).toEqual(second.decks); expect(state.decks.a.hand.map(card => card.cardId).sort()).toEqual(['obol','hamlet','talent','drachma'].sort()); expect(state.turn.shuffles.a).toBe(1); expect(state.trash).toHaveLength(1);
});

test('wrong player, phase, empty Actions and unresolved decisions cannot play another card', () => {
  const state = game('thaleia', ['seed-keeper','oracles-acolyte','obol']);
  expect(() => applyPlayCommand(state, 'b', { type:'action/played', instanceId:'h-0' }, ++seq)).toThrow();
  expect(() => play(state, 2)).toThrow(); play(state); expect(() => play(state)).toThrow(); choose(state, []); expect(() => play(state)).toThrow();
  state.resources.actions = 1; run(state, {type:'phase/advanced'}); expect(() => play(state)).toThrow();
});

test('individual and atomic Treasure play have the same totals, leave non-Treasures and reject replay or wrong phase', () => {
  const state=game('thaleia',['obol','drachma','talent','hamlet']);

  const individual=structuredClone(state);
  for(const card of individual.decks.a.hand.slice(0,3))run(individual,{type:'treasure/played',instanceId:card.id});
  run(state,{type:'treasures/played'});
  expect(state.turn.phase).toBe('treasures');expect(individual.turn.phase).toBe('treasures');
  expect(state.decks).toEqual(individual.decks);expect(state.resources).toEqual(individual.resources);expect(state.resources.coins).toBe(6);expect(state.resources.actions).toBe(1);
  expect(state.decks.a.hand.map(card=>card.cardId)).toEqual(['hamlet']);expect(()=>run(state,{type:'treasures/played'})).toThrow();
  run(state,{type:'phase/advanced'});expect(()=>run(state,{type:'treasure/played',instanceId:'h-0'})).toThrow();expect(()=>run(state,{type:'phase/advanced'})).toThrow();
});

test('purchases pay exact cost and one Buy, including zero-cost; unavailable purchases do not mutate state',()=>{
  const state=game();run(state,{type:'phase/advanced'});run(state,{type:'phase/advanced'});state.resources.coins=4;state.resources.buys=3;
  run(state,{type:'card/bought',cardId:'council-of-sages'});expect(state.resources.coins).toBe(0);expect(state.resources.buys).toBe(2);expect(state.supply['council-of-sages']).toBe(7);
  run(state,{type:'card/bought',cardId:'obol'});expect(state.resources.buys).toBe(1);expect(state.decks.a.discard.at(-1)?.cardId).toBe('obol');
  state.supply.obol=0;const before=structuredClone(state);for(const id of ['obol','hamlet','temple-of-athena'])expect(()=>run(state,{type:'card/bought',cardId:id})).toThrow();expect(state).toEqual(before);
  state.resources.buys=0;state.resources.coins=8;expect(()=>run(state,{type:'card/bought',cardId:'acropolis'})).toThrow();
});

test('cleanup includes retained Treasures and played cards, draws through seeded reshuffle, passes and resets exactly once',()=>{
  const state=game('thaleia',['obol','hamlet'],['drachma']);run(state,{type:'phase/advanced'});run(state,{type:'treasure/played',instanceId:'h-0'});run(state,{type:'phase/advanced'});run(state,{type:'card/bought',cardId:'obol'});
  const repeat=structuredClone(state);run(state,{type:'turn/ended'});run(repeat,{type:'turn/ended'});
  expect(state.decks).toEqual(repeat.decks);expect(state.decks.a.hand).toHaveLength(4);expect(state.decks.a.play).toHaveLength(0);expect(state.decks.a.discard).toHaveLength(0);expect(state.turn.turns.a).toBe(1);expect(state.turn.shuffles.a).toBe(1);expect(state.turnOrder[state.turn.index]).toBe('b');expect(state.resources).toEqual({actions:1,coins:0,buys:1,worship:1});expect(state.turn.leaderUsed).toBe(false);expect(()=>run(state,{type:'turn/ended'})).toThrow();
});


test('both endings occur only after cleanup; scoring excludes trash and uses fewer-turn and shared ties',()=>{
  for(const end of ['acropolis','three']) {
    const state=game('thaleia',['hamlet','polis','acropolis'],[]);state.decks.b={hand:instances(['hamlet','polis','acropolis'],'b'),deck:[],discard:[],play:[]};state.trash=instances(['acropolis'],'trash');
    if(end==='acropolis')state.supply.acropolis=0;else for(const id of ['obol','drachma','talent'])state.supply[id]=0;
    expect(state.turn.phase).toBe('actions');run(state,{type:'phase/advanced'});run(state,{type:'phase/advanced'});run(state,{type:'turn/ended'});
    expect(state.turn.phase).toBe('finished');expect(state.decks.a.play).toHaveLength(0);expect(standings(state).find(row=>row.uid==='b')?.winner).toBe(true);
    state.decks.a={hand:instances(['hamlet','polis','acropolis'],'a'),deck:[],discard:[],play:[]};state.turn.turns.b=1;
    expect(standings(state).map(row=>[row.score,row.winner])).toEqual([[10,true],[10,true]]);expect(()=>run(state,{type:'phase/advanced'})).toThrow();
  }
});


test('first purchase atomically closes Treasure play; rejected purchases leave the phase intact', () => {
  const state = game('thaleia', ['obol', 'talent', 'hamlet']);
  expect(purchaseReason(state, 'a', 'acropolis')).not.toBe('');
  expect(() => run(state, {type:'card/bought',cardId:'acropolis'})).toThrow();
  run(state, {type:'phase/advanced'});
  run(state, {type:'treasure/played',instanceId:'h-1'});
  const before = structuredClone(state);
  expect(() => run(state, {type:'card/bought',cardId:'acropolis'})).toThrow();
  expect(state).toEqual(before);
  expect(purchaseReason(state, 'a', 'drachma')).toBe('');
  run(state, {type:'card/bought',cardId:'drachma'});
  expect(state.turn.phase).toBe('buys');
  expect(state.resources.coins).toBe(0);
  expect(state.resources.buys).toBe(0);
  expect(state.decks.a.discard.at(-1)?.cardId).toBe('drachma');
  expect(canPlayTreasure(state, 'a', 'h-0')).toBe(false);
  expect(() => run(state, {type:'treasure/played',instanceId:'h-0'})).toThrow();
  expect(() => run(state, {type:'treasures/played'})).toThrow();
});

test('ending directly from Treasures performs cleanup without a separate phase event', () => {
  const state = game();
  run(state, {type:'phase/advanced'});
  run(state, {type:'turn/ended'});
  expect(state.turn.number).toBe(2);
  expect(state.turn.phase).toBe('actions');
  expect(state.turnOrder[state.turn.index]).toBe('b');
});

test('departure reminders choose the highest-cost legal card with stable ties, without mutating hand or supply', () => {
  const state = game('thaleia', ['oracles-acolyte', 'council-of-sages', 'obol', 'talent', 'drachma']);
  const hand = structuredClone(state.decks.a.hand);
  expect(departureReminder(state, 'a')?.card.id).toBe('council-of-sages');
  expect(departureReminder(state, 'b')).toBeNull();
  state.resources.actions = 0;
  expect(departureReminder(state, 'a')).toBeNull();
  run(state, {type:'phase/advanced'});
  expect(departureReminder(state, 'a')?.card.id).toBe('talent');
  expect(state.decks.a.hand).toEqual(hand);
  run(state, {type:'treasures/played'});
  state.resources.coins = 4;
  expect(departureReminder(state, 'a')?.verb).toBe('buy');
  expect(departureReminder(state, 'a')?.card.id).toBe('council-of-sages');
  state.supply['council-of-sages'] = 0;
  expect(departureReminder(state, 'a')?.card.id).toBe('forge-of-heroes');
  state.resources.buys = 0;
  expect(departureReminder(state, 'a')?.verb).toBe('worship');
  expect(departureReminder(state, 'a')?.card.god).toBe('Athena');
  state.resources.worship=0;
  expect(departureReminder(state,'a')).toBeNull();
  state.resources.buys = 1;
  state.resources.coins = 2;
  state.supply = { obol: 10, hamlet: 8 };
  expect(departureReminder(state, 'a')).toBeNull();
  expect(purchaseReason(state, 'a', 'obol')).toBe('');
  expect(purchaseReason(state, 'a', 'hamlet')).toBe('');
  state.supply['oracles-acolyte'] = 8;
  expect(departureReminder(state, 'a')?.card.id).toBe('oracles-acolyte');
});

test('Worship checks shared gods, turn, resources and pending choices before payment, with no Buy or phase cost', () => {
  const state = game(); state.resources.coins = 6;
  for (const phase of ['actions','treasures','buys'] as const) {
    const copy = structuredClone(state); copy.turn.phase = phase; copy.resources.buys = 0;
    run(copy, {type:'god/worshipped',cardId:'tribute-of-the-tides'});
    expect(copy.turn.phase).toBe(phase); expect(copy.resources).toEqual({...state.resources,coins:3,worship:0,buys:0});
    expect(copy.decks.a.discard.at(-1)?.cardId).toBe('drachma'); expect(copy.turn.leaderUsed).toBe(false);
  }
  const invalid = [
    (s:SetupState)=>{s.resources.coins=2;}, (s:SetupState)=>{s.resources.worship=0;},
    (s:SetupState)=>{s.turn.index=s.turnOrder.indexOf('b');}, (s:SetupState)=>{s.turn.phase='finished';},
    (s:SetupState)=>{s.turn.choice={id:'pending',kind:'trash',source:'seed-keeper',min:0,max:1};},
    (s:SetupState)=>{s.sharedEvents=[];}
  ];
  for(const change of invalid){const copy=structuredClone(state);change(copy);const before=structuredClone(copy);expect(()=>run(copy,{type:'god/worshipped',cardId:'tribute-of-the-tides'})).toThrow();expect(copy).toEqual(before);}
});

test('Athena counts only matching Actions in play, replaces Standard at two Devotion, and gains Actions onto the deck', () => {
  for(const devotion of [0,1,2,3]){
    const state=game('thaleia',['temple-of-athena','sacred-academy']);state.resources.coins=6;state.resources.worship=2;
    state.decks.a.play=instances(Array.from({length:devotion},(_,i)=>i===0?'temple-of-athena':'oracles-acolyte'),'p');
    state.decks.a.play.push(...instances(['obol','temple-of-poseidon'],'other'));
    run(state,{type:'god/worshipped',cardId:'counsel-of-olympus'});
    expect(state.turn.choice?.limit).toBe(devotion>=2?5:3);expect(state.turn.choice?.actionOnly).toBe(true);
    expect(()=>choose(state,['drachma'])).toThrow();expect(()=>choose(state,['temple-of-athena'])).toThrow();
    if(devotion<2)expect(()=>choose(state,['sacred-academy'])).toThrow();
    choose(state,[devotion>=2?'sacred-academy':'harbor-pilot']);
    expect(state.decks.a.deck[0].cardId).toBe(devotion>=2?'sacred-academy':'harbor-pilot');expect(state.decks.a.discard).toHaveLength(0);
    expect(state.turn.leaderUsed).toBe(false);expect(state.resources.buys).toBe(1);
    run(state,{type:'god/worshipped',cardId:'counsel-of-olympus'});choose(state,['oracles-acolyte']);expect(state.resources.worship).toBe(0);expect(state.resources.coins).toBe(0);
  }
});

test('empty gains do not refund Worship and Poseidon still gives the Favored Buy', () => {
  for(const favored of [false,true]){
    const state=game('nereon');state.resources.coins=3;
    if(favored)state.decks.a.play=instances(['temple-of-poseidon','sea-trade'],'p');
    run(state,{type:'god/worshipped',cardId:'tribute-of-the-tides'});
    expect((favored?state.decks.a.deck:state.decks.a.discard)[favored?0:state.decks.a.discard.length-1].cardId).toBe('drachma');
    expect(state.resources.buys).toBe(favored?2:1);
    const empty=game('nereon');empty.resources.coins=3;empty.decks.a.play=state.decks.a.play;empty.supply.drachma=0;
    run(empty,{type:'god/worshipped',cardId:'tribute-of-the-tides'});expect(empty.resources).toEqual({actions:1,coins:0,worship:0,buys:favored?2:1});
  }
  const state=game();state.resources.coins=3;for(const id of Object.keys(state.supply))if(definition(id).type==='Action')state.supply[id]=0;
  run(state,{type:'god/worshipped',cardId:'counsel-of-olympus'});expect(state.turn.choice).toBeNull();expect(state.resources.coins).toBe(0);expect(state.resources.worship).toBe(0);
});

test('Demeter sums actual trash, permits a zero-cost or skipped gain, and always grants its Favored Buy', () => {
  for(const targets of [[],['h-0'],['h-0','h-1']])for(const gainCard of [true,false]){
    const state=game('melia',['hamlet','drachma']);state.resources.coins=3;state.decks.a.play=instances(['temple-of-demeter','seed-keeper'],'p');
    run(state,{type:'god/worshipped',cardId:'blessing-of-the-fields'});choose(state,targets);
    expect(state.turn.choice?.limit).toBe(targets.length===2?5:targets.length===1?2:0);expect(state.resources.buys).toBe(1);
    choose(state,gainCard?[targets.length===2?'polis':'obol']:[]);expect(state.resources.buys).toBe(2);expect(state.trash).toHaveLength(targets.length);expect(state.turn.leaderUsed).toBe(false);
  }
  for(const favored of [false,true]){const state=game('melia',[],[]);state.resources.coins=3;if(favored)state.decks.a.play=instances(['temple-of-demeter','seed-keeper'],'p');run(state,{type:'god/worshipped',cardId:'blessing-of-the-fields'});if(favored)choose(state,['obol']);expect(state.turn.choice).toBeNull();expect(state.resources.buys).toBe(favored?2:1);}
  const empty=game('melia',[],[]);empty.resources.coins=3;empty.supply.obol=0;empty.decks.a.play=instances(['temple-of-demeter','seed-keeper'],'p');run(empty,{type:'god/worshipped',cardId:'blessing-of-the-fields'});expect(empty.turn.choice).toBeNull();expect(empty.resources.buys).toBe(2);
});

test('Ares requires an actual trash and upgrades by one or three without triggering Doreios', () => {
  for(const favored of [false,true])for(const trash of [false,true]){
    const state=game('doreios',['hamlet']);state.resources.coins=4;if(favored)state.decks.a.play=instances(['temple-of-ares','bronze-recruit'],'p');
    run(state,{type:'god/worshipped',cardId:'trial-of-the-spear'});choose(state,trash?['h-0']:[]);
    if(trash){expect(state.turn.choice?.limit).toBe(favored?5:3);expect(()=>choose(state,['talent'])).toThrow();choose(state,['obol']);}
    expect(state.turn.choice).toBeNull();expect(state.turn.leaderUsed).toBe(false);expect(state.resources.worship).toBe(0);
  }
});


test('finished tables clear every resource and reject every play command without mutation',()=>{
  const state=game('thaleia',['temple-of-athena','hamlet','obol']);state.supply.acropolis=0;
  run(state,{type:'phase/advanced'});run(state,{type:'turn/ended'});
  expect(state.resources).toEqual({actions:0,coins:0,buys:0,worship:0});
  const before=structuredClone(state);
  for(const command of [{type:'turn/ended'},{type:'phase/advanced'},{type:'treasures/played'},{type:'card/bought',cardId:'obol'},{type:'god/worshipped',cardId:'counsel-of-olympus'},{type:'action/played',instanceId:'h-0'},{type:'treasure/played',instanceId:'h-2'},{type:'choice/resolved',choiceId:'old',targets:[]}] as ActionCommand[]){expect(()=>run(state,command)).toThrow();expect(state).toEqual(before);}
});

test('all owned zones score, starting Hamlets count, and trash and resources never score',()=>{
  const state=game('thaleia',['hamlet','hamlet','hamlet'],['polis']);state.decks.a.discard=instances(['acropolis'],'discard');state.decks.a.play=instances(['polis','obol','temple-of-athena'],'play');state.trash=instances(['acropolis','hamlet'],'trash');state.resources={actions:99,coins:99,buys:99,worship:99};
  expect(standings(state).find(row=>row.uid==='a')?.score).toBe(15);
  expect(standings(state).find(row=>row.uid==='a')?.territories.map(t=>t.count)).toEqual([3,2,1]);
});

test('Treasure shortcuts validate before leaving Actions and cannot reopen play after buying', () => {
  for (const command of [{type:'treasure/played',instanceId:'missing'}, {type:'treasure/played',instanceId:'h-0'}, {type:'treasures/played'}] as ActionCommand[]) {
    const state=game('thaleia',['hamlet']),before=structuredClone(state);
    expect(()=>run(state,command)).toThrow();expect(state).toEqual(before);
  }
  for (const command of [{type:'treasure/played',instanceId:'h-1'}, {type:'treasures/played'}] as ActionCommand[]) {
    const state=game('thaleia',['seed-keeper','obol']);
    const before=structuredClone(state);
    expect(()=>applyPlayCommand(state,'b',command,++seq)).toThrow();expect(state).toEqual(before);
    play(state);const pending=structuredClone(state);
    expect(()=>run(state,command)).toThrow();expect(state).toEqual(pending);
    choose(state,[]);run(state,command);
    expect(state.turn.phase).toBe('treasures');
  }
  const state=game('thaleia',['oracles-acolyte','obol','drachma']);
  expect(canPlayTreasure(state,'a','h-1')).toBe(true);
  run(state,{type:'treasure/played',instanceId:'h-1'});
  expect(()=>play(state)).toThrow();
  run(state,{type:'card/bought',cardId:'obol'});
  const before=structuredClone(state);
  expect(canPlayTreasure(state,'a','h-2')).toBe(false);
  expect(()=>run(state,{type:'treasure/played',instanceId:'h-2'})).toThrow();
  expect(()=>run(state,{type:'treasures/played'})).toThrow();expect(state).toEqual(before);
});


test('buying directly from Actions closes both play phases atomically', () => {
  const state=game();
  expect(purchaseReason(state,'a','obol')).toBe('');
  const before=structuredClone(state);
  expect(()=>applyPlayCommand(state,'b',{type:'card/bought',cardId:'obol'},state.activity.length+1)).toThrow();
  expect(state).toEqual(before);
  run(state,{type:'card/bought',cardId:'obol'});
  expect(state.turn.phase).toBe('buys');
  expect(state.resources.buys).toBe(0);
  expect(state.decks.a.discard.at(-1)?.cardId).toBe('obol');
  expect(()=>run(state,{type:'action/played',instanceId:'h-0'})).toThrow();
  expect(()=>run(state,{type:'treasures/played'})).toThrow();
});
