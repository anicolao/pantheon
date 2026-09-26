import { afterAll, beforeAll, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch, type Firestore } from 'firebase/firestore';
import { enterRoom, createRoom, resizeRoom } from '../../src/lib/backend/setup-repository';
import { replaySetup, setupSupply, type SetupEvent } from '../../src/lib/game/setup';
let env: RulesTestEnvironment;
// Rules testing exposes a compat type; modular SDK functions unwrap it at runtime.
const database = (uid: string) => env.authenticatedContext(uid).firestore() as unknown as Firestore;
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'demo-pantheon', firestore: { host: '127.0.0.1', port: 8193, rules: readFileSync('firestore.rules', 'utf8') } }); await env.clearFirestore(); });
afterAll(async () => { await env?.cleanup(); });

test('transactions append ordered events; replay and repeat joins retain identity', async () => {
  const host = database('host');
  const guest = database('guest');
  await enterRoom(host, 'replay', 'host', 'Ariadne', 2);
  await enterRoom(guest, 'replay', 'guest', 'Theseus');
  await enterRoom(guest, 'replay', 'guest', 'Theseus');
  const events = (await getDocs(collection(host, 'games/replay/events'))).docs.map(doc => doc.data() as SetupEvent);
  const replay = replaySetup(events.reverse());
  expect(replay.players.map(player => player.name)).toEqual(['Ariadne', 'Theseus']);
  expect(replay.activity).toHaveLength(2);
  expect(setupSupply(2)).toHaveLength(18);
  expect(setupSupply(4).find(card => card.id === 'polis')?.count).toBe(12);
  expect(() => replaySetup([...events, events[0]])).toThrow();
  expect(() => replaySetup([{ ...events[0], schemaVersion: 99 } as unknown as SetupEvent])).toThrow();
});

test('one remaining seat cannot be claimed by two concurrent players', async () => {
  const host = database('race-host');
  await enterRoom(host, 'race', 'race-host', 'Host', 2);
  const result = await Promise.allSettled(['one', 'two'].map(uid => enterRoom(database(uid), 'race', uid, uid)));
  expect(result.filter(item => item.status === 'fulfilled')).toHaveLength(1);
  expect((await getDocs(collection(host, 'games/race/events'))).size).toBe(2);
});

test('rules reject unauthenticated reads, outsider event reads, mutation and forged setup', async () => {
  const host = database('secure-host');
  const outsider = database('outsider');
  await enterRoom(host, 'secure', 'secure-host', 'Host', 3);
  const path = 'games/secure/events/1';
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'games/secure')));
  await assertFails(getDocs(collection(outsider, 'games/secure/events')));
  await assertFails(getDocs(collection(host, 'games')));
  await assertFails(updateDoc(doc(host, path), { name: 'Changed' }));
  await assertFails(deleteDoc(doc(host, path)));
  await assertFails(setDoc(doc(outsider, 'games/secure/events/2'), { schemaVersion: 1, sequence: 2, actorUid: 'secure-host', type: 'player/joined', name: 'Spoof', playerCount: 3, createdAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(outsider, 'games/secure'), { members: ['secure-host', 'outsider'], revision: 2 }));
  await assertFails(setDoc(doc(host, 'games/no-event'), { owner: 'secure-host', members: ['secure-host'], revision: 1, playerCount: 2 }));
  for (const [id, field] of [['bad-count', { playerCount: 5 }], ['bad-name', { name: ' ' }], ['bad-version', { schemaVersion: 2 }], ['private-data', { hand: ['obol'] }]] as const) {
    const batch = writeBatch(host);
    batch.set(doc(host, 'games', id), { owner: 'secure-host', members: ['secure-host'], revision: 1, playerCount: 2 });
    batch.set(doc(host, 'games', id, 'events', '1'), { schemaVersion: 1, sequence: 1, actorUid: 'secure-host', type: 'game/created', name: 'Host', playerCount: 2, createdAt: serverTimestamp(), ...field as Record<string, unknown> });
    await assertFails(batch.commit());
  }
});

test('a retried creation keeps one event and invalid names or invitations cannot write', async () => {
  const host = database('retry-host');
  await enterRoom(host, 'creation-retry', 'retry-host', ' Ariadne ', 3);
  await enterRoom(host, 'creation-retry', 'retry-host', 'Ariadne', 3);
  expect((await getDocs(collection(host, 'games/creation-retry/events'))).size).toBe(1);
  await expect(enterRoom(host, '../invalid', 'retry-host', 'Ariadne')).rejects.toThrow('invitation');
  await expect(enterRoom(host, 'invalid-name', 'retry-host', ' ', 2)).rejects.toThrow('name');
  await expect(enterRoom(host, 'invalid-name', 'retry-host', 'a'.repeat(25), 2)).rejects.toThrow('name');
  await expect(enterRoom(database('late-guest'), 'nonexistent-gathering', 'late-guest', 'Guest')).rejects.toThrow('invitation');
});


test('short code collisions never reuse or overwrite a table, including the same owner', async () => {
  const host = database('code-host');
  await enterRoom(host, 'TAKEN', 'code-host', 'Ariadne', 2);
  const codes = ['TAKEN', 'FRESH'];
  expect(await createRoom(host, 'code-host', 'Ariadne', 3, { token: 'fresh-creation' }, () => codes.shift()!)).toBe('FRESH');
  expect((await getDoc(doc(host, 'games/TAKEN'))).data()?.playerCount).toBe(2);
});

test('owner capacity changes append events, retain seats, and allow subsequent joins', async () => {
  const host = database('resize-host'); const guest = database('resize-guest');
  await enterRoom(host, 'resize', 'resize-host', 'Ariadne', 2);
  await enterRoom(guest, 'resize', 'resize-guest', 'Theseus');
  await resizeRoom(host, 'resize', 'resize-host', 4);
  await resizeRoom(host, 'resize', 'resize-host', 4);
  await enterRoom(database('third'), 'resize', 'third', 'Iris');
  await expect(resizeRoom(host, 'resize', 'resize-host', 2)).rejects.toThrow('taken');
  await expect(resizeRoom(guest, 'resize', 'resize-guest', 3)).rejects.toThrow('host');
  await resizeRoom(host, 'resize', 'resize-host', 3);
  const events = (await getDocs(collection(host, 'games/resize/events'))).docs.map(doc => doc.data() as SetupEvent);
  const state = replaySetup(events);
  expect(state.players).toHaveLength(3); expect(state.activity).toHaveLength(5); expect(state.playerCount).toBe(3);
  for (const [uid, count, revision, eventName] of [['resize-guest', 4, 6, 'Theseus'], ['resize-host', 2, 6, 'Ariadne'], ['resize-host', 4, 9, 'Ariadne'], ['resize-host', 4, 6, 'Imposter']] as const) {
    const db = database(uid); const batch = writeBatch(db);
    batch.update(doc(db, 'games/resize'), { playerCount: count, revision });
    batch.set(doc(db, `games/resize/events/${revision}`), { schemaVersion: 1, sequence: revision, actorUid: uid, type: 'table/resized', name: eventName, playerCount: count, createdAt: serverTimestamp() });
    await assertFails(batch.commit());
  }
  await assertFails(updateDoc(doc(host, 'games/resize'), { playerCount: 4, revision: 6 }));
});

test('a concurrent arrival and capacity reduction cannot discard or overfill seats', async () => {
  const host = database('resize-race-host');
  await enterRoom(host, 'resize-race', 'resize-race-host', 'Ariadne', 3);
  await enterRoom(database('resize-race-guest'), 'resize-race', 'resize-race-guest', 'Theseus');
  const results = await Promise.allSettled([
    resizeRoom(host, 'resize-race', 'resize-race-host', 2),
    enterRoom(database('resize-race-third'), 'resize-race', 'resize-race-third', 'Iris')
  ]);
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  const state = replaySetup((await getDocs(collection(host, 'games/resize-race/events'))).docs.map(doc => doc.data() as SetupEvent));
  expect(state.activity).toHaveLength(3);
  expect(state.players.length).toBe(state.playerCount);
});


test('retrying the same creation attempt returns its short code and one event', async () => {
  const host = database('short-retry-host'); const attempt = { token: 'stable-command' };
  expect(await createRoom(host, 'short-retry-host', 'Ariadne', 2, attempt, () => 'RETRY')).toBe('RETRY');
  expect(await createRoom(host, 'short-retry-host', 'Ariadne', 2, attempt, () => { throw new Error('Must reuse the pending code'); })).toBe('RETRY');
  expect((await getDocs(collection(host, 'games/RETRY/events'))).size).toBe(1);
});

async function history(db: Firestore, id: string) {
  return (await getDocs(collection(db, `games/${id}/events`))).docs.map(doc => doc.data() as SetupEvent);
}

test('trusted clients replay seeded drafts and deals identically for every player count', async () => {
  const { appendDraftCommand } = await import('../../src/lib/backend/setup-repository');
  const { leaderIds, leaderLinks } = await import('../../src/lib/game/setup');
  for (const count of [2, 3, 4] as const) {
    const id = `draft-${count}`, hostUid = `${id}-0`, host = database(hostUid);
    await enterRoom(host, id, hostUid, 'Ariadne', count);
    await expect(appendDraftCommand(host, id, hostUid, 'early', { type: 'draft/started', seed: 'fixed' })).rejects.toThrow('every seat');
    for (let i = 1; i < count; i++) await enterRoom(database(`${id}-${i}`), id, `${id}-${i}`, `Player ${i}`);
    await expect(appendDraftCommand(database(`${id}-1`), id, `${id}-1`, 'guest-start', { type: 'draft/started', seed: 'fixed' })).rejects.toThrow('host');
    await appendDraftCommand(host, id, hostUid, 'start', { type: 'draft/started', seed: 'pantheon-v1' });
    await appendDraftCommand(host, id, hostUid, 'start', { type: 'draft/started', seed: 'pantheon-v1' });
    let state = replaySetup(await history(host, id));
    expect(state.phase).toBe('draft'); expect(state.draftOrder).toEqual([...state.turnOrder].reverse());
    await expect(resizeRoom(host, id, hostUid, count)).rejects.toThrow('begun');
    await expect(enterRoom(database('late'), id, 'late', 'Late')).rejects.toThrow('begun');
    const wrong = state.draftOrder[1];
    await expect(appendDraftCommand(database(wrong), id, wrong, 'out-of-turn', { type: 'leader/chosen', leaderId: 'thaleia' })).rejects.toThrow('draft turn');
    for (const [index, uid] of state.draftOrder.entries()) {
      if (index > 0) await expect(appendDraftCommand(database(uid), id, uid, `taken-${index}`, { type: 'leader/chosen', leaderId: 'thaleia' })).rejects.toThrow('available');
      await appendDraftCommand(database(uid), id, uid, `choose-${index}`, { type: 'leader/chosen', leaderId: leaderIds[index] });
      await appendDraftCommand(database(uid), id, uid, `choose-${index}`, { type: 'leader/chosen', leaderId: leaderIds[index] });
    }
    const events = await history(host, id); state = replaySetup(events);
    expect(events).toHaveLength(count * 2 + 1); expect(state.phase).toBe('playing');
    expect(state.resources).toEqual({ actions: 1, buys: 1, worship: 1, coins: 0 });
    expect(state.sharedEvents).toHaveLength(count);
    for (const player of state.players) {
      const deck = state.decks[player.uid], all = [...deck.hand, ...deck.deck];
      expect(deck.hand).toHaveLength(5); expect(deck.deck).toHaveLength(5); expect(deck.discard).toHaveLength(0); expect(deck.play).toHaveLength(0);
      expect(all.filter(card => card.cardId === 'obol')).toHaveLength(6);
      expect(all.filter(card => card.cardId === 'hamlet')).toHaveLength(3);
      expect(all.filter(card => card.cardId === leaderLinks(state.leaders[player.uid]).temple.id)).toHaveLength(1);
      expect(replaySetup(await history(database(player.uid), id))).toEqual(state);
    }
    expect(replaySetup([...events].reverse())).toEqual(state);
    expect(JSON.stringify(events)).not.toMatch(/"hand"|"deck"|"shuffleOrder"/);
    expect(new Set(Object.values(state.decks).flatMap(deck => [...deck.hand, ...deck.deck].map(card => card.id))).size).toBe(count * 10);
    await expect(appendDraftCommand(host, id, hostUid, 'restart', { type: 'draft/started', seed: 'different' })).rejects.toThrow('host');
  }
});

test('two competing choices for one draft turn commit once; invalid versions cannot replay', async () => {
  const { appendDraftCommand } = await import('../../src/lib/backend/setup-repository');
  const host = database('draft-race-host');
  await enterRoom(host, 'draft-race', 'draft-race-host', 'Ariadne', 2);
  await enterRoom(database('draft-race-guest'), 'draft-race', 'draft-race-guest', 'Theseus');
  await appendDraftCommand(host, 'draft-race', 'draft-race-host', 'start', { type: 'draft/started', seed: 'race' });
  const uid = replaySetup(await history(host, 'draft-race')).draftOrder[0];
  const results = await Promise.allSettled(['thaleia', 'nereon'].map(leaderId => appendDraftCommand(database(uid), 'draft-race', uid, `claim-${leaderId}`, { type: 'leader/chosen', leaderId })));
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  const events = await history(host, 'draft-race');
  expect(Object.values(replaySetup(events).leaders)).toHaveLength(1);
  expect(() => replaySetup(events.map(event => event.type === 'draft/started' ? { ...event, reducerVersion: 2 } as unknown as SetupEvent : event))).toThrow('Invalid play event');
  const outsider = database('draft-outsider');
  await assertFails(getDocs(collection(outsider, 'games/draft-race/events')));
  const guest = database('draft-race-guest');
  const batch = writeBatch(guest);
  batch.update(doc(guest, 'games/draft-race'), { revision: 5, phase: 'draft' });
  batch.set(doc(guest, 'games/draft-race/events/5'), { schemaVersion: 1, reducerVersion: 1, sequence: 5, actorUid: 'draft-race-host', name: 'Ariadne', playerCount: 2, commandId: 'spoof', type: 'draft/started', seed: 'bad', createdAt: serverTimestamp() });
  await assertFails(batch.commit());
});

test('reducer v1 random vectors stay fixed and shuffle preserves its input', async () => {
  const { createPrng, shuffle } = await import('../../src/lib/game/random');
  const random = createPrng('pantheon-v1');
  expect([random(), random(), random()]).toEqual([0.6919899224303663, 0.3612844094168395, 0.9913471946492791]);
  const input = ['a', 'b', 'c', 'd', 'e', 'f'];
  expect(shuffle(input, 'pantheon-v1:starting-deck:0')).toEqual(['a', 'f', 'c', 'b', 'e', 'd']);
  expect(input).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
});
