import { collection, doc, getDocFromServer, onSnapshot, orderBy, query, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import { replaySetup, type SetupEvent, type SetupState } from '$lib/game/setup';

export class SetupError extends Error {
  constructor(public code: 'name' | 'missing' | 'full' | 'exists' | 'count' | 'owner', message: string) { super(message); }
}
const validId = (id: string) => /^[\w-]{1,128}$/.test(id);
export async function inspectRoom(db: Firestore, id: string) {
  if (!validId(id)) throw new SetupError('missing', 'This invitation was not found.');
  const snapshot = await getDocFromServer(doc(db, 'games', id));
  if (!snapshot.exists()) throw new SetupError('missing', 'This invitation was not found.');
  return snapshot.data() as { owner: string; members: string[]; playerCount: 2 | 3 | 4; revision: number };
}

export async function enterRoom(db: Firestore, id: string, uid: string, name: string, playerCount?: 2 | 3 | 4, fresh = false) {
  if (!validId(id)) throw new SetupError('missing', 'This invitation was not found.');
  name = name.trim();
  if (!name || name.length > 24) throw new SetupError('name', 'Choose a name between 1 and 24 characters.');
  if (playerCount !== undefined && ![2, 3, 4].includes(playerCount)) throw new SetupError('count', 'Choose two, three or four seats.');
  const room = doc(db, 'games', id);
  try { await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(room);
    const previous = snapshot.data();
    if (fresh && snapshot.exists()) throw new SetupError('exists', 'This table already exists.');
    if (previous?.members.includes(uid)) return;
    if (snapshot.exists() && playerCount) throw new SetupError('exists', 'This table already exists.');
    if (!snapshot.exists() && !playerCount) throw new SetupError('missing', 'This invitation was not found.');
    const count = playerCount ?? previous!.playerCount;
    const members: string[] = previous?.members ?? [];
    if (members.length >= count) throw new SetupError('full', 'This table is full.');
    const sequence = (previous?.revision ?? 0) + 1;
    const event: SetupEvent = { schemaVersion: 1, sequence, actorUid: uid, name, playerCount: count,
      type: previous ? 'player/joined' : 'game/created' };
    transaction.set(room, { owner: previous?.owner ?? uid, members: [...members, uid], playerCount: count, revision: sequence });
    transaction.set(doc(room, 'events', String(sequence)), { ...event, createdAt: serverTimestamp() });
  }); } catch (error) {
    if (error instanceof SetupError) throw error;
    // A competing commit can make a rules check reject a stale transaction.
    // Reconcile only against acknowledged server state, including a lost ack.
    const current = await getDocFromServer(room).catch(() => null);
    if (current?.exists()) {
      const data = current.data();
      if (data.members.includes(uid)) return;
      if (!playerCount && data.members.length >= data.playerCount) throw new SetupError('full', 'This table is full.');
    }
    throw error;
  }
}
export function watchSetup(db: Firestore, id: string, update: (state: SetupState, synced: boolean) => void, fail: (error: Error) => void) {
  return onSnapshot(query(collection(db, 'games', id, 'events'), orderBy('sequence')), { includeMetadataChanges: true }, snapshot => {
    if (snapshot.metadata.hasPendingWrites) return;
    try { update(replaySetup(snapshot.docs.map(doc => doc.data() as SetupEvent)), !snapshot.metadata.fromCache); }
    catch (error) { fail(error as Error); }
  }, fail);
}

/** Five letters, with no timestamp, UID or private information in the invitation. */
export function generateRoomCode() {
  let entropy = BigInt(`0x${crypto.randomUUID().replaceAll('-', '')}`);
  let code = '';
  for (let i = 0; i < 5; i++) { code += String.fromCharCode(65 + Number(entropy % 26n)); entropy /= 26n; }
  return code;
}
export async function createRoom(db: Firestore, uid: string, name: string, playerCount: 2 | 3 | 4, nextCode = generateRoomCode) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const id = nextCode();
    try { await enterRoom(db, id, uid, name, playerCount, true); return id; }
    catch (error) { if (!(error instanceof SetupError) || error.code !== 'exists') throw error; }
  }
  throw new SetupError('exists', 'We couldn’t open a table. Please try again.');
}
export async function resizeRoom(db: Firestore, id: string, uid: string, playerCount: 2 | 3 | 4) {
  if (![2, 3, 4].includes(playerCount)) throw new SetupError('count', 'Choose two, three or four seats.');
  await runTransaction(db, async transaction => {
    const room = doc(db, 'games', id);
    const previous = (await transaction.get(room)).data();
    if (!previous) throw new SetupError('missing', 'This invitation was not found.');
    if (previous.owner !== uid) throw new SetupError('owner', 'Only the host can change the number of players.');
    if (playerCount < previous.members.length) throw new SetupError('count', 'Those seats are already taken.');
    if (playerCount === previous.playerCount) return;
    const creation = (await transaction.get(doc(room, 'events', '1'))).data()!;
    const sequence = previous.revision + 1;
    transaction.update(room, { playerCount, revision: sequence });
    transaction.set(doc(room, 'events', String(sequence)), { schemaVersion: 1, sequence, actorUid: uid,
      name: creation.name, playerCount, type: 'table/resized', createdAt: serverTimestamp() });
  });
}
