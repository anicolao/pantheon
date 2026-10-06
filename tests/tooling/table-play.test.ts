import { expect, test } from 'bun:test';
import { tablePlayed } from '../../src/lib/components/play/table-play';
import { fixture } from '../../src/routes/dev/animations/scenarios';
import { replaySetup, type SetupEvent } from '../../src/lib/game/setup';
import type { GameCommand } from '../../src/lib/backend/setup-repository';

test('Play all lands rightmost-first without changing engine order or earlier plays', () => {
  const prepared = fixture('treasures', 2);
  let events = prepared.events;
  function send(command: GameCommand) {
    events = [...events, { schemaVersion: 1, reducerVersion: 1, sequence: events.length + 1,
      commandId: `check-${events.length}`, actorUid: prepared.actor, name: 'Ariadne', playerCount: 2, ...command }] as SetupEvent[];
    return replaySetup(events);
  }
  const batch = send({ type: 'treasures/played' });
  const before = structuredClone(batch);
  expect(tablePlayed(batch, prepared.actor).map(card => card.cardId)).toEqual(['talent', 'drachma', 'obol']);
  expect(batch).toEqual(before);
  expect(tablePlayed(replaySetup(events), prepared.actor)).toEqual(tablePlayed(batch, prepared.actor));

  events = prepared.events;
  const obol = replaySetup(events).decks[prepared.actor].hand.find(card => card.cardId === 'obol')!;
  send({ type: 'treasure/played', instanceId: obol.id });
  const following = send({ type: 'treasures/played' });
  expect(tablePlayed(following, prepared.actor).map(card => card.cardId)).toEqual(['obol', 'talent', 'drachma']);
});
