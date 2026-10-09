import { expect, test } from 'bun:test';
import { initialTurn, activePlayer, applyPlayCommand } from '../../src/lib/game/actions';
import { matchCommand } from '../helpers/match-policy';
import { leaderIds, replaySetup, type SetupEvent } from '../../src/lib/game/setup';

function readyEvents(count:2|3|4, equalTurns:boolean|undefined) {
  const events: SetupEvent[] = Array.from({ length: count }, (_, index) => ({
    schemaVersion: 1, sequence: index + 1, actorUid: `p${index}`, name: `Player ${index + 1}`,
    ...(index || equalTurns===undefined ? {} : {equalTurns}), playerCount: count, type: index ? 'player/joined' : 'game/created'
  }));
  events.push({ schemaVersion: 1, reducerVersion: 1, commandId: 'start', sequence: events.length + 1,
    actorUid: 'p0', name: 'Player 1', playerCount: count, type: 'draft/started', seed: 'equal-turns' });
  const draft = replaySetup(events);
  for (const [index, uid] of draft.draftOrder.entries()) events.push({
    schemaVersion: 1, reducerVersion: 1, commandId: `leader-${uid}`, sequence: events.length + 1,
    actorUid: uid, name: draft.players.find(player => player.uid === uid)!.name,
    playerCount: count, type: 'leader/chosen', leaderId: leaderIds[index]
  });
  return events;
}

for (const count of [2, 3, 4] as const) for (let closer = 0; closer < count; closer++) {
  for (const ending of ['acropolis', 'three piles'] as const) {
    test(`${count} players finish the round when seat ${closer + 1} empties ${ending}`, () => {
      const events = readyEvents(count, initialTurn().equalTurns);
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

test('old completed histories retain their immediate ending when replayed', () => {
  const events=readyEvents(2,undefined), game=replaySetup(events), spender=game.turnOrder[0];
  expect(game.turn.equalTurns).toBe(false);
  for(let move=0;move<4000 && game.turn.phase!=='finished';move++){
    const command=matchCommand(game,'acropolis',spender),uid=activePlayer(game),sequence=events.length+1;
    const message=applyPlayCommand(game,uid,command,sequence);
    game.activity.push({sequence,message});
    events.push({schemaVersion:1,reducerVersion:1,commandId:`move-${sequence}`,sequence,actorUid:uid,
      name:game.players.find(player=>player.uid===uid)!.name,playerCount:2,...command});
  }
  const restored=replaySetup(events);
  expect(restored.turn.phase).toBe('finished');
  expect(restored.turn.turns[spender]).toBe(restored.turn.turns[restored.turnOrder[1]]+1);
  expect(restored.turn).toEqual(game.turn);
  expect(restored.decks).toEqual(game.decks);
});

test('the ending rule is fixed at creation and rejects malformed values',()=>{
  const events=readyEvents(2,true);
  expect(()=>replaySetup([{...events[0],equalTurns:'yes'} as unknown as SetupEvent])).toThrow('end-of-game rule');
  expect(()=>replaySetup(events.map((event,index)=>index===1?{...event,equalTurns:false}:event))).toThrow('end-of-game rule');
  expect(replaySetup(readyEvents(2,false)).turn.equalTurns).toBe(false);
});
