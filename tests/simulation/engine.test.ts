import { expect, test } from 'bun:test';
import { leaderEffects, applyPlayCommand, activePlayer } from '../../src/lib/game/actions';
import { setupMatch } from '../../scripts/balance/runner';
import { cardFeatures, engineCapacity, engineKeepValue } from '../../scripts/balance/engine';
import { inventoryAtSetup, strategyView, strategyCommand, cardValue, candidates, type View } from '../../scripts/balance/strategy';
import { runExperiment } from '../../scripts/balance/experiment';
const profile = { family: 'engine' as const, parameters: candidates[0] };
function view(variant: 'standard' | 'thaleia-actions' = 'standard'): View {
  const { game } = setupMatch('engine-unit', ['thaleia', 'nereon']);
  const result = strategyView(game, activePlayer(game), inventoryAtSetup(game), undefined, variant);
  result.phase = 'buys'; result.resources = { coins: 4, actions: 2, buys: 1, worship: 0 };
  return result;
}
test('engine buys draw over redundant support and increases support only when draw is action-blocked', () => {
  const spare = view('thaleia-actions'); spare.owned['council-of-sages'] = 1; spare.owned['seed-keeper'] = 1;
  expect(strategyCommand(spare, profile)).toEqual({ type: 'card/bought', cardId: 'council-of-sages' });
  const blocked = view(); blocked.owned['council-of-sages'] = 3;
  expect(cardValue(blocked, profile, 'harbor-pilot')).toBeGreaterThan(cardValue(blocked, profile, 'council-of-sages'));
  expect(engineCapacity(blocked).strandedDraw).toBeGreaterThan(0);
  const extra = view('thaleia-actions'); extra.owned['council-of-sages'] = 3;
  expect(engineCapacity(extra).strandedDraw).toBe(0);
});
test('draw demand grows with deck size and has no hard-coded copy cap', () => {
  const small = view('thaleia-actions'); small.owned = { 'temple-of-athena': 1, 'council-of-sages': 2, obol: 3 }; small.unseenCount = 0;
  const large = structuredClone(small); large.owned.obol = 15; large.unseenCount = 15;
  expect(engineCapacity(small).drawDeficit).toBe(0);
  expect(cardValue(large, profile, 'sacred-academy')).toBeGreaterThan(cardValue(small, profile, 'sacred-academy'));
  large.owned['sacred-academy'] = 6; large.owned.obol = 40;
  expect(cardValue(large, profile, 'sacred-academy')).toBeGreaterThan(5);
});
test('all leaders use actual public trigger effects without exposing hidden deck order', () => {
  for (const leader of ['thaleia', 'nereon', 'melia', 'doreios']) {
    const { game } = setupMatch('public-engine', [leader, leader === 'thaleia' ? 'nereon' : 'thaleia']);
    const uid = activePlayer(game), inventory = inventoryAtSetup(game);
    const observed = strategyView(game, uid, inventory, undefined, 'thaleia-actions');
    game.seed = 'secret'; game.decks[uid].deck.reverse();
    expect(strategyView(game, uid, inventory, undefined, 'thaleia-actions')).toEqual(observed);
    expect(observed.leaderBonus.actions).toBe(leader === 'thaleia' ? 2 : 0);
  }
  expect(cardFeatures('council-of-sages').draw).toBe(3);
  expect(leaderEffects('thaleia', 'standard')[0]).toMatchObject({ resource: 'actions', amount: 1 });
});
test('Engine play ordering avoids stranding Actions and prefers productive draw with spare capacity', () => {
  const state = view('thaleia-actions'); state.phase = 'actions'; state.resources.actions = 1;
  state.hand = [{ id: 'draw', cardId: 'council-of-sages', copy: 1 }, { id: 'support', cardId: 'harbor-pilot', copy: 1 }];
  state.leaderUsed = false;
  expect(strategyCommand(state, profile)).toMatchObject({ instanceId: 'draw' });
  state.leaderUsed = true;
  expect(strategyCommand(state, profile)).toMatchObject({ instanceId: 'support' });
});
test('full-deck telemetry distinguishes unused Actions after completion from unused Actions with unseen cards', () => {
  const run = runExperiment({ seed: 'engine-metrics', block: 0, lineup: ['thaleia', 'nereon'], focal: 0, profiles: [profile, profile], variant: 'thaleia-actions' });
  expect(run.result.status).toBe('completed');
  for (const p of run.result.players) {
    expect(p.telemetry.actionPhases).toBe(p.turns);
    expect(p.telemetry.fullDeckDraws + p.telemetry.spareActionsWithUnseen).toBeLessThanOrEqual(p.turns);
    expect(p.telemetry.unseenAtActionEnd).toBeGreaterThanOrEqual(0);
  }
});

test('spare Actions with unseen cards increase draw demand even when nominal capacity covers the deck', () => {
  const complete = view('thaleia-actions'); complete.owned = { 'temple-of-athena': 1, 'council-of-sages': 3, obol: 8 }; complete.unseenCount = 0;
  const missed = structuredClone(complete); missed.unseenCount = 6;
  expect(engineCapacity(complete).drawDeficit).toBe(0);
  expect(engineCapacity(missed).drawDeficit).toBeGreaterThan(0);
  expect(cardValue(missed, profile, 'sacred-academy')).toBeGreaterThan(cardValue(complete, profile, 'sacred-academy'));
});

test('retention protects draw that completes the deck even when another copy has no value', () => {
  const state = view('thaleia-actions'); state.owned = { 'temple-of-athena': 1, 'council-of-sages': 3, obol: 8 }; state.unseenCount = 0;
  expect(engineKeepValue(state, profile, 'council-of-sages')).toBeGreaterThan(cardValue(state, profile, 'council-of-sages'));
  expect(engineKeepValue(state, profile, 'council-of-sages')).toBeGreaterThan(8);
});

test('mandatory discards are not valued as free net draw', () => {
  const state = view(); state.resources.coins = 5;
  expect(cardValue(state, profile, 'sacred-academy')).toBeGreaterThan(cardValue(state, profile, 'harvest-feast'));
});


test('public draw-progress accounting agrees with turn-start card identities through full games', () => {
  for (let block = 0; block < 12; block++) {
    const options = { seed: `engine-progress-${block}`, block, lineup: ['thaleia', 'melia'], focal: 0,
      profiles: [profile, { family: 'thin' as const, parameters: candidates[0] }], variant: 'thaleia-actions' as const };
    const run = runExperiment(options), { game, events: setup } = setupMatch(options.seed, options.lineup);
    const expected = Object.fromEntries(game.turnOrder.map(uid => [uid, { actionPhases: 0, fullDeckDraws: 0, unseenAtActionEnd: 0, spareActionsWithUnseen: 0 }]));
    let key = '', targets = new Set<string>(), seen = new Set<string>();
    for (const event of run.events.slice(setup.length)) {
      const uid = activePlayer(game);
      if (key !== `${uid}/${game.turn.number}`) {
        key = `${uid}/${game.turn.number}`;
        targets = new Set(Object.values(game.decks[uid]).flat().map(card => card.id));
        seen = new Set(game.decks[uid].hand.map(card => card.id));
      }
      if (event.type === 'phase/advanced' && game.turn.phase === 'actions') {
        const unseen = [...targets].filter(id => !seen.has(id)).length, m = expected[uid];
        m.actionPhases++; m.fullDeckDraws += Number(unseen === 0); m.unseenAtActionEnd += unseen;
        m.spareActionsWithUnseen += Number(unseen > 0 && game.resources.actions > 0);
      }
      const start = game.movements.length;
      const message = applyPlayCommand(game, event.actorUid, event as Parameters<typeof applyPlayCommand>[2], event.sequence, options.variant);
      game.activity.push({ sequence: event.sequence, message });
      if (event.type !== 'turn/ended') for (const move of game.movements.slice(start)) {
        if (move.uid === uid && move.kind === 'draw' && move.card && targets.has(move.card.id)) seen.add(move.card.id);
      }
    }
    for (const player of run.result.players) for (const [metric, value] of Object.entries(expected[player.uid])) {
      expect(player.telemetry[metric as keyof typeof expected[string]]).toBe(value);
    }
  }
});
