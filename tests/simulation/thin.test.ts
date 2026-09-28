import { expect, test } from 'bun:test';
import { activePlayer, type Choice } from '../../src/lib/game/actions';
import { setupMatch } from '../../scripts/balance/runner';
import { inventoryAtSetup, strategyView, strategyCommand, candidates, cardValue, type View } from '../../scripts/balance/strategy';
import { thinEconomy, thinChangeValue, thinTrashChoice, thinToolValue, thinHorizon } from '../../scripts/balance/thin';
const profile = { family: 'thin' as const, parameters: candidates[0] };
const card = (cardId: string, copy = 1) => ({ id: `${cardId}-${copy}`, cardId, copy });
const trash: Choice = { id: 'trash', kind: 'trash', source: 'seed-keeper', min: 0, max: 2 };
function state(owned?: Record<string, number>): View {
  const { game } = setupMatch('thin-design', ['thaleia', 'nereon']);
  const view = strategyView(game, activePlayer(game), inventoryAtSetup(game));
  if (owned) view.owned = owned;
  view.resources = { actions: 1, coins: 0, buys: 1, worship: 0 }; view.hand = [];
  return view;
}
test('Thin removes early dead weight but protects irreplaceable starting income', () => {
  const view = state(); view.hand = [card('hamlet'), card('obol'), card('obol', 2)]; view.choice = trash;
  expect(strategyCommand(view, profile)).toMatchObject({ targets: ['hamlet-1'] });
  expect(thinChangeValue(view, [card('obol')])).toBeLessThan(0);
});
test('Thin can remove a weak Treasure after replacement income is established', () => {
  const view = state({ obol: 2, talent: 5, hamlet: 3 }); view.hand = [card('obol')];
  expect(thinTrashChoice(view, trash).targets).toEqual(['obol-1']);
});
test('Thin evaluates multi-card removals jointly rather than trusting individual eligibility', () => {
  const view = state({ obol: 2, drachma: 2, talent: 1, hamlet: 5 });
  view.hand = [card('obol'), card('obol', 2), card('hamlet')];
  const selected = thinTrashChoice(view, trash);
  expect(selected.targets).toContain('hamlet-1');
  expect(selected.targets).not.toEqual(['obol-1', 'obol-2']);
  expect(thinChangeValue(view, view.hand.filter(c => selected.targets.includes(c.id)))).toBeGreaterThan(0);
});
test('Thin preserves points near an ending and considers third-pile pressure', () => {
  const view = state(); view.hand = [card('hamlet')]; view.supply.acropolis = 1;
  expect(thinTrashChoice(view, trash).targets).toEqual([]);
  const other = state(); other.hand = [card('hamlet')];
  other.supply.obol = 0; other.supply.drachma = 0; other.supply['seed-keeper'] = 1;
  expect(thinHorizon(other)).toBeLessThan(1);
  expect(thinTrashChoice(other, trash).targets).toEqual([]);
});
test('Thin does not stop useful thinning solely at the old scoring threshold', () => {
  const view = state({ obol: 1, talent: 6, 'seed-keeper': 2 }); view.supply.acropolis = 3;
  view.hand = [card('seed-keeper')];
  expect(thinTrashChoice(view, trash).targets).toEqual(['seed-keeper-1']);
});
test('Thin values useful trashing capacity and declines tools with no remaining work', () => {
  const dirty = state();
  const clean = state({ talent: 5, 'sacred-academy': 2 });
  expect(thinToolValue(dirty, 'seed-keeper')!).toBeGreaterThan(0);
  expect(thinToolValue(clean, 'seed-keeper')!).toBeLessThanOrEqual(0);
  const covered = state({ ...dirty.owned, 'seed-keeper': 2 });
  expect(thinToolValue(covered, 'seed-keeper')!).toBeLessThan(thinToolValue(dirty, 'seed-keeper')!);
  expect(cardValue(clean, profile, 'seed-keeper')).toBeLessThan(cardValue(clean, profile, 'drachma'));
});
test('Thin retires exhausted tools but retains essential draw and the last useful trasher', () => {
  const done = state({ talent: 5, 'seed-keeper': 1 }); done.hand = [card('seed-keeper')];
  expect(thinTrashChoice(done, trash).targets).toEqual(['seed-keeper-1']);
  const dirty = state({ obol: 4, drachma: 2, hamlet: 3, 'seed-keeper': 1 }); dirty.hand = [card('seed-keeper'), card('hamlet')];
  expect(thinTrashChoice(dirty, trash).targets).toEqual(['hamlet-1']);
  const draw = state({ obol: 6, hamlet: 3, 'sacred-academy': 1 }); draw.hand = [card('sacred-academy')];
  expect(thinTrashChoice(draw, trash).targets).toEqual([]);
});
test('Thin evaluates a Forge replacement together with its loss of income', () => {
  const view = state({ obol: 3, talent: 2, hamlet: 3 }); view.hand = [card('hamlet'), card('talent')];
  const choice = { ...trash, max: 1, forge: true };
  const selected = thinTrashChoice(view, choice);
  expect(selected.value).toBeGreaterThan(0);
  expect(selected.targets).toEqual(['hamlet-1']);
  const noTargets = state({ talent: 5 }); noTargets.supply = { obol: 40, acropolis: 8, talent: 20 }; noTargets.bannedCards = ['acropolis', 'talent'];
  expect(thinToolValue(noTargets, 'forge-of-heroes')!).toBeLessThanOrEqual(0);
});
test('Thin economy sees income reliability, is inventory-order invariant and uses public trigger effects', () => {
  const view = state({ obol: 5, hamlet: 5 });
  expect(thinEconomy(view).incomeChance).toBeCloseTo(0.5, 10);
  expect(thinEconomy(view)).toEqual(thinEconomy(view, { hamlet: 5, obol: 5 }));
  const after = thinEconomy(view, { obol: 5, hamlet: 4 });
  expect(after.incomeChance).toBeGreaterThan(thinEconomy(view).incomeChance);
});

test('Thin spends its terminal Action on useful thinning before an ordinary coin payload', () => {
  const view = state({ talent: 4, hamlet: 6, 'seed-keeper': 1, 'bronze-recruit': 1 });
  view.leaderUsed = true; view.phase = 'actions';
  view.hand = [card('seed-keeper'), card('bronze-recruit'), card('hamlet'), card('hamlet', 2)];
  expect(strategyCommand(view, profile)).toMatchObject({ type: 'action/played', instanceId: 'seed-keeper-1' });
});
test('Thin can make a winning late Forge conversion and honors gain bans', () => {
  const view = state({ talent: 2, hamlet: 3 }); view.hand = [card('talent')];
  view.supply.acropolis = 1; view.myScore = 3; view.scores = [8];
  const choice = { ...trash, max: 1, forge: true };
  expect(thinTrashChoice(view, choice).targets).toEqual(['talent-1']);
  const gained = state({ talent: 1, hamlet: 3 }); gained.hand = []; gained.choice = { id: 'gain', kind: 'gain', source: 'forge-of-heroes', min: 1, max: 1, limit: 8 };
  gained.supply.acropolis = 1; gained.bannedCards = ['acropolis'];
  expect(strategyCommand(gained, profile)).not.toMatchObject({ targets: ['acropolis'] });
});
