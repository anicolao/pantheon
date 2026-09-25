import { collection, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import { replaySetup, type SetupEvent, type SetupState } from '$lib/game/setup';

export async function enterRoom(db: Firestore, id: string, uid: string, name: string, playerCount?: 2 | 3 | 4) {
  name = name.trim();
  if (!name || name.length > 24) throw new Error('Use a name between 1 and 24 characters.');
  const room = doc(db, 'games', id);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(room);
    if (snapshot.exists() && playerCount) throw new Error('This table already exists.');
    if (!snapshot.exists() && !playerCount) throw new Error('This invitation was not found.');
    const previous = snapshot.data();
    if (previous?.members.includes(uid)) return;
    const count = playerCount ?? previous!.playerCount;
    const members: string[] = previous?.members ?? [];
    if (members.length >= count) throw new Error('This table is full.');
    const sequence = members.length + 1;
    const event: SetupEvent = { schemaVersion: 1, sequence, actorUid: uid, name, playerCount: count,
      type: previous ? 'player/joined' : 'game/created' };
    transaction.set(room, { owner: previous?.owner ?? uid, members: [...members, uid], playerCount: count, revision: sequence });
    transaction.set(doc(room, 'events', String(sequence)), { ...event, createdAt: serverTimestamp() });
  });
}
export function watchSetup(db: Firestore, id: string, update: (state: SetupState, synced: boolean) => void, fail: (error: Error) => void) {
  return onSnapshot(query(collection(db, 'games', id, 'events'), orderBy('sequence')), { includeMetadataChanges: true }, snapshot => {
    if (snapshot.metadata.hasPendingWrites) return;
    try { update(replaySetup(snapshot.docs.map(doc => doc.data() as SetupEvent)), !snapshot.metadata.fromCache); }
    catch (error) { fail(error as Error); }
  }, fail);
}
