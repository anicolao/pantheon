import { thinPlayPriority } from '../../scripts/balance/thin';
import { enginePlayPriority } from '../../scripts/balance/engine';
import { expect, test } from 'bun:test';
import { setupMatch } from '../../scripts/balance/runner';
import { activePlayer, definition } from '../../src/lib/game/actions';
import { inventoryAtSetup, strategyView, strategyCommand, cardValue, candidates, families, type View } from '../../scripts/balance/strategy';
import { purchasePlan, endingShare, gainOutcome, publicHorizon, immediateGainValue } from '../../scripts/balance/planning';
import { favoredPaths, devotionValue } from '../../scripts/balance/worship';
import { chooseCommand } from '../../scripts/balance/bot';
const card = (cardId: string, copy = 1) => ({ id: `${cardId}-${copy}`, cardId, copy });
function state(): View {
  const { game } = setupMatch('planning-unit', ['thaleia', 'nereon']);
  const view = strategyView(game, activePlayer(game), inventoryAtSetup(game));
  view.phase = 'buys'; view.hand = []; view.myScore = 3; view.scores = [10]; view.myTurns = 5; view.opposingTurns = [6];
  view.resources = { coins: 8, buys: 1, actions: 0, worship: 0 }; return view;
}
const score = (id: string) => (definition(id).vp ?? 0) * 3;
test('ending evaluation implements fewer-turn wins and split ties', () => {
  const v = state(); v.supply.acropolis = 0; v.myScore = 10;
  expect(endingShare(v)).toBe(0.5);
  v.opposingTurns = [5]; expect(endingShare(v)).toBe(0);
  v.opposingTurns = [7]; expect(endingShare(v)).toBe(1);
});
test('all study strategies avoid a losing last Acropolis when they can continue', () => {
  for (const family of families) {
    const v = state(); v.supply.acropolis = 1;
    expect(strategyCommand(v, { family, parameters: candidates[0] })).not.toMatchObject({ type: 'card/bought', cardId: 'acropolis' });
    v.myScore = 5;
    expect(strategyCommand(v, { family, parameters: candidates[0] })).toMatchObject({ type: 'card/bought', cardId: 'acropolis' });
  }
});
test('purchase planning finds a winning multi-buy ending and recognizes losing third piles', () => {
  const v = state(); v.supply.acropolis = 1; v.resources.coins = 10; v.resources.buys = 2; v.scores = [9];
  v.opposingTurns = [5]; // Acropolis alone ties VP and loses on turns; Hamlet supplies the extra point.
  const plan = purchasePlan(v, score);
  expect(plan.share).toBe(1); expect(plan.cards).toEqual(['acropolis', 'hamlet']);
  const losing = state(); losing.supply.obol = 0; losing.supply.drachma = 0; losing.supply.hamlet = 1;
  expect(gainOutcome(losing, 'hamlet')).toBe(0.5); // A remaining Acropolis buy rescues a tie.
  losing.resources.buys = 0; expect(gainOutcome(losing, 'hamlet')).toBe(0);
});
test('multiple buys compare complete affordable baskets and declining marginal copy values', () => {
  const v = state(); v.resources = { ...v.resources, coins: 6, buys: 2 };
  const plan = purchasePlan(v, id => id === 'drachma' ? 5 : id === 'talent' ? 9 : -100);
  expect(plan.cards).toEqual(['drachma','drachma']);
  const second = purchasePlan(v, (id, copies) => id === 'drachma' ? copies ? -2 : 5 : id === 'talent' ? 9 : -100);
  expect(second.cards).toEqual(['talent']);
});
test('optional gains decline a known losing ending and mandatory gains choose a safe alternative', () => {
  for (const family of families) {
    const v = state(); v.resources.buys = 0; v.supply.acropolis = 1;
    v.choice = { id: 'gain', kind: 'gain', source: 'forge-of-heroes', limit: 8, min: 1, max: 1 };
    expect(strategyCommand(v, { family, parameters: candidates[0] })).not.toMatchObject({ targets: ['acropolis'] });
  }
});
test('Worship can establish Favored through two known matching Actions before spending', () => {
  const v = state(); v.phase = 'actions'; v.resources = { coins: 2, buys: 0, actions: 1, worship: 1 };
  v.events = ['counsel-of-olympus']; v.hand = [card('temple-of-athena'), card('oracles-acolyte')];
  v.owned = { ...v.owned, 'oracles-acolyte': 1 };
  const paths = favoredPaths(v);
  expect(paths.some(p => p.future.play.filter(c => definition(c.cardId).god === 'Athena').length === 2)).toBe(true);
  expect(strategyCommand(v, { family: 'worship', parameters: candidates[0] }).type).toBe('action/played');
  const blocked = { ...v, hand: [card('council-of-sages'), card('council-of-sages',2)], leaderUsed: true };
  expect(favoredPaths(blocked)).toEqual([]);
});
test('Devotion purchases value total matching-card access, not a per-card two-copy bonus', () => {
  const v = state(); v.events = ['counsel-of-olympus'];
  const scarce = devotionValue(v, 'oracles-acolyte');
  const plentiful = devotionValue({ ...v, owned: { 'temple-of-athena': 1, 'oracles-acolyte': 6, obol: 3 } }, 'oracles-acolyte');
  expect(scarce).toBeGreaterThan(0); expect(plentiful).toBeLessThan(scarce);
});
test('all non-Treasure families use actual leader Action capacity for draw purchases', () => {
  for (const family of ['engine','thin','worship','race'] as const) {
    const v = state(); v.owned = { ...v.owned, 'council-of-sages': 2 }; v.resources.actions = 1;
    const extra = { ...v, leaderBonus: { ...v.leaderBonus, actions: 2 } };
    expect(cardValue(extra, { family, parameters: candidates[0] }, 'council-of-sages')).toBeGreaterThan(cardValue(v, { family, parameters: candidates[0] }, 'council-of-sages'));
  }
});
test('benchmark multi-trash preserves its income floor across the entire choice', () => {
  const v = state(); v.owned = { obol: 4, drachma: 2, hamlet: 3 }; v.hand = [card('obol'),card('obol',2)];
  v.choice = { id: 'trash', kind: 'trash', source: 'seed-keeper', min: 0, max: 2 };
  expect(chooseCommand(v, 'treasure')).toMatchObject({ targets: ['obol-1'] });
});
test('late-game horizon reacts to third-pile pressure and public opponent income', () => {
  const v = state(); const rich = { ...v, opponentIncome: [24] };
  expect(publicHorizon(rich)).toBeLessThan(publicHorizon(v));
  v.supply.obol = 0; v.supply.drachma = 0; v.supply.hamlet = 1;
  expect(publicHorizon(v)).toBeLessThan(1);
});

test('forced discards preserve current spending instead of unplayable Actions',()=>{
 for(const family of families){
  const v=state();v.phase='actions';v.resources={coins:5,actions:0,buys:1,worship:0};v.hand=[card('talent'),card('sacred-academy')];
  v.owned={...v.owned,talent:1,'sacred-academy':1};
  v.choice={id:'discard',kind:'discard',source:'harvest-feast',min:1,max:1};
  expect(strategyCommand(v,{family,parameters:candidates[0]})).toMatchObject({targets:['sacred-academy-1']});
 }
});

test('topdeck gains receive immediate value only when known draw and Action capacity can use them',()=>{
 const v=state();v.phase='actions';v.resources.actions=1;v.hand=[card('sacred-academy')];
 expect(immediateGainValue(v,'talent')).toBe(3);expect(immediateGainValue(v,'council-of-sages')).toBeGreaterThan(0);
 const blocked={...v,leaderUsed:true,hand:[card('council-of-sages')]};
 expect(immediateGainValue(blocked,'council-of-sages')).toBe(0);
 expect(immediateGainValue({...v,phase:'buys'},'talent')).toBe(0);
});

test('Thin play ordering includes Nereon bonus Coins and Doreios actual trash opportunities',()=>{
 const {game:n}=setupMatch('nereon-payload',['nereon','thaleia']);const nv=strategyView(n,activePlayer(n),inventoryAtSetup(n));
 nv.hand=[card('sea-trade'),card('bronze-recruit')];nv.owned={...nv.owned,'sea-trade':1,'bronze-recruit':1};
 expect(thinPlayPriority(nv,nv.hand[0])).toBeGreaterThan(thinPlayPriority(nv,nv.hand[1]));
 const {game:d}=setupMatch('doreios-payload',['doreios','thaleia']);const dv=strategyView(d,activePlayer(d),inventoryAtSetup(d));
 dv.owned={talent:4,hamlet:6,'bronze-recruit':1,'sea-trade':1};dv.hand=[card('bronze-recruit'),card('sea-trade'),card('hamlet')];
 expect(thinPlayPriority(dv,dv.hand[0])).toBeGreaterThan(thinPlayPriority(dv,dv.hand[1]));
 expect(thinPlayPriority(dv,dv.hand[0])).toBeGreaterThan(thinPlayPriority({...dv,leaderUsed:true},dv.hand[0]));
 expect(enginePlayPriority(dv,dv.hand[0])).toBeGreaterThan(enginePlayPriority({...dv,leaderUsed:true},dv.hand[0]));
});

test('conditional reveal payload is valued from public Territory density',()=>{
 const money=state();money.owned={obol:10};const territories={...money,owned:{hamlet:10}};
 const profile={family:'engine' as const,parameters:candidates[0]};
 expect(cardValue(territories,profile,'victorious-procession')).toBeGreaterThan(cardValue(money,profile,'victorious-procession'));
});
