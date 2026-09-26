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
