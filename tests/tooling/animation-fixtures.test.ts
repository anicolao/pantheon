import { expect, test } from 'bun:test';
import { fixture, scenarios } from '../../src/routes/dev/animations/scenarios';
import { replaySetup, type SetupEvent } from '../../src/lib/game/setup';
import { standings } from '../../src/lib/game/actions';

for (const count of [2, 3, 4] as const) test(`${count}-player animation scenarios replay legal commands and distinct victory scores`, () => {
  for (const scenario of scenarios) {
    const prepared = fixture(scenario.id, count);
    const before = replaySetup(prepared.events);
    expect(before.players).toHaveLength(count);
    if (!prepared.trigger) continue;
    const event: SetupEvent = {
      schemaVersion: 1, reducerVersion: 1, sequence: prepared.events.length + 1,
      commandId: `fixture-${scenario.id}`, actorUid: prepared.actor,
      name: before.players.find(player => player.uid === prepared.actor)!.name,
      playerCount: count, ...prepared.trigger
    };
    const after = replaySetup([...prepared.events, event]);
    expect(after.activity).toHaveLength(prepared.events.length + 1);
    if (scenario.id === 'victory') {
      expect(after.turn.phase).toBe('finished');
      expect(new Set(standings(after).map(row => row.score)).size).toBe(count);
    }
  }
});
