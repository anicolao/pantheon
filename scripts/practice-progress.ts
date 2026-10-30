export type PracticeEvent = {
  sequence: number;
  type: string;
  actorUid: string;
  botKind?: string | null;
};

/** Automation belongs to a seat, including a host who keeps their original UID. */
export function hasCompletedBotTurn(events: PracticeEvent[]): boolean {
  const bots = new Set<string>();
  for (const event of [...events].sort((a, b) => a.sequence - b.sequence)) {
    if (['game/created', 'player/joined', 'player/automated'].includes(event.type)) {
      if (event.botKind) bots.add(event.actorUid);
      else bots.delete(event.actorUid);
    }
    if (event.type === 'turn/ended' && bots.has(event.actorUid)) return true;
  }
  return false;
}
