import { expect, test } from 'bun:test';
import { applyPlayCommand, definition, actionEffects, type ActionCommand } from '../../src/lib/game/actions';
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
