import { expect, test } from 'bun:test';
import { hasCompletedBotTurn, type PracticeEvent } from '../../scripts/practice-progress';

test('a host-controlled bot completes a turn without a bot-prefixed UID', () => {
  const events: PracticeEvent[] = [
    { sequence: 1, type: 'game/created', actorUid: 'anonymous-host' },
    { sequence: 2, type: 'player/joined', actorUid: 'bot-guest', botKind: 'bot' },
    { sequence: 3, type: 'player/automated', actorUid: 'anonymous-host', botKind: 'bot' },
    { sequence: 4, type: 'leader/chosen', actorUid: 'anonymous-host' }
  ];
  expect(hasCompletedBotTurn(events)).toBe(false);
  expect(hasCompletedBotTurn([...events, { sequence: 5, type: 'turn/ended', actorUid: 'anonymous-host' }].reverse())).toBe(true);
});

test('human turns and nonterminal bot commands do not satisfy bot completion', () => {
  const events: PracticeEvent[] = [
    { sequence: 1, type: 'game/created', actorUid: 'bot-looking-human' },
    { sequence: 2, type: 'player/joined', actorUid: 'automated-seat', botKind: 'money' },
    { sequence: 3, type: 'turn/ended', actorUid: 'bot-looking-human' },
    { sequence: 4, type: 'treasures/played', actorUid: 'automated-seat' }
  ];
  expect(hasCompletedBotTurn(events)).toBe(false);
  expect(hasCompletedBotTurn([...events, { sequence: 5, type: 'turn/ended', actorUid: 'automated-seat' }])).toBe(true);
});

test('handing an automated host seat back to a human removes bot status', () => {
  expect(hasCompletedBotTurn([
    { sequence: 1, type: 'game/created', actorUid: 'host' },
    { sequence: 2, type: 'player/automated', actorUid: 'host', botKind: 'bot' },
    { sequence: 3, type: 'player/automated', actorUid: 'host', botKind: null },
    { sequence: 4, type: 'turn/ended', actorUid: 'host' }
  ])).toBe(false);
});
