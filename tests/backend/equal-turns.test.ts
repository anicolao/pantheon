import { expect, test } from 'bun:test';
import { activePlayer, applyPlayCommand } from '../../src/lib/game/actions';
import { leaderIds, replaySetup, type SetupEvent } from '../../src/lib/game/setup';

for (const count of [2, 3, 4] as const) for (let closer = 0; closer < count; closer++) {
  for (const ending of ['acropolis', 'three piles'] as const) {
    test(`${count} players finish the round when seat ${closer + 1} empties ${ending}`, () => {
      const events: SetupEvent[] = Array.from({ length: count }, (_, index) => ({
        schemaVersion: 1, sequence: index + 1, actorUid: `p${index}`, name: `Player ${index + 1}`,
        playerCount: count, type: index ? 'player/joined' : 'game/created'
      }));
      events.push({ schemaVersion: 1, reducerVersion: 1, commandId: 'start', sequence: events.length + 1,
        actorUid: 'p0', name: 'Player 1', playerCount: count, type: 'draft/started', seed: 'equal-turns' });
      const draft = replaySetup(events);
      for (const [index, uid] of draft.draftOrder.entries()) events.push({
        schemaVersion: 1, reducerVersion: 1, commandId: `leader-${uid}`, sequence: events.length + 1,
        actorUid: uid, name: draft.players.find(player => player.uid === uid)!.name,
        playerCount: count, type: 'leader/chosen', leaderId: leaderIds[index]
      });
      const game = replaySetup(events);
      expect(game.turn.equalTurns).toBe(true);
      let sequence = events.length;
      const endTurn = () => {
        const uid = activePlayer(game);
        applyPlayCommand(game, uid, { type: 'phase/advanced' }, ++sequence);
        applyPlayCommand(game, uid, { type: 'turn/ended' }, ++sequence);
      };
      // A full ordinary round, then the seats before the trigger in round two.
      for (let turn = 0; turn < count + closer; turn++) endTurn();
      const trigger = activePlayer(game);
      if (ending === 'acropolis') game.supply.acropolis = 0;
      else for (const pile of ['oracles-acolyte', 'harbor-pilot', 'bronze-recruit']) game.supply[pile] = 0;
      expect(game.turn.phase).toBe('actions');
      expect(game.turn.finalRound).not.toBe(true);
      endTurn();
      expect(game.turn.finalRound).toBe(true);
      expect(game.turn.endTriggeredBy).toBe(trigger);
      for (let seat = closer + 1; seat < count; seat++) {
        expect(game.turn.phase).toBe('actions');
        expect(activePlayer(game)).toBe(game.turnOrder[seat]);
        expect(game.resources).toEqual({ actions: 1, coins: 0, buys: 1, worship: 1 });
        // The next player gets a real turn, including a legal purchase.
        applyPlayCommand(game, activePlayer(game), { type: 'card/bought', cardId: 'obol' }, ++sequence);
        applyPlayCommand(game, activePlayer(game), { type: 'turn/ended' }, ++sequence);
      }
      expect(game.turn.phase).toBe('finished');
      expect(game.turn.endTriggeredBy).toBe(trigger);
      expect(game.turn.turns).toEqual(Object.fromEntries(game.turnOrder.map(uid => [uid, 2])));
      expect(game.resources).toEqual({ actions: 0, coins: 0, buys: 0, worship: 0 });
      expect(() => applyPlayCommand(game, game.turnOrder[0], { type: 'turn/ended' }, ++sequence)).toThrow();
    });
  }
}
