// A navigation pointer only. Ownership is checked against the authoritative room
// before the sanctuary offers Continue; no game state is stored here.
export const returnTableKey = 'pantheon:return-table';
export interface ReturnTable { roomId: string; uid: string }
export function readReturnTable(): ReturnTable | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(returnTableKey) ?? 'null');
    if (!value || typeof value !== 'object') return null;
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.roomId !== 'string' || !/^[\w-]{1,128}$/.test(candidate.roomId) || typeof candidate.uid !== 'string' || !candidate.uid) return null;
    return { roomId: candidate.roomId, uid: candidate.uid };
  } catch { return null; }
}
export function rememberTable(roomId: string, uid: string) {
  localStorage.setItem(returnTableKey, JSON.stringify({ roomId, uid }));
}
export function forgetTable() { localStorage.removeItem(returnTableKey); }
