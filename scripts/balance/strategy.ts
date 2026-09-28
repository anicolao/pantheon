import { devotionValue, favoredPaths } from './worship';
import { purchasePlan, endingShare, gainOutcome, availableCoins, publicHorizon, treasureValue, immediateGainValue } from './planning';
import { thinToolValue, thinTrashChoice, thinKeepValue, thinGain, thinChangeValue, thinPlayPriority } from './thin';
import { effectFeatures, cardFeatures, engineActionValue, engineKeepValue, enginePlayPriority, type Features } from './engine';
import { actionEffects, definition, leaderEffects, type PlayVariant, type ActionCommand, type Choice } from '../../src/lib/game/actions';
import type { CardInstance, SetupState } from '../../src/lib/game/setup';
import { chooseCommand, observe, type Observation } from './bot';

export const strategyVersion = 4;
export const families = ['treasure', 'engine', 'thin', 'worship', 'race'] as const;
export type Family = typeof families[number];
export type Parameters = { scoringAt: number; engineCopies: number; moneyFloor: number; worshipMargin: number };
export const candidates: Parameters[] = [
  { scoringAt: 3, engineCopies: 3, moneyFloor: 7, worshipMargin: 0.5 },
  { scoringAt: 5, engineCopies: 2, moneyFloor: 9, worshipMargin: 1 },
  { scoringAt: 2, engineCopies: 5, moneyFloor: 6, worshipMargin: 0 }
];
export type Profile = { family: Family; parameters: Parameters };
export type Restriction = { kind: 'event' | 'card' | 'leader-trigger'; id: string; scope: 'focal' | 'table' };
export type PublicInventory = Record<string, Record<string, number>>;
export type View = Observation & {
  leaderBonus: Features; unseenCount: number;
  play: CardInstance[]; events: string[]; playerCount: number; turn: number;
  opponentIncome: number[];
  scores: number[]; myScore: number; myTurns: number; opposingTurns: number[];
  bannedCards: string[]; bannedEvents: string[];
};
export function inventoryAtSetup(game: SetupState): PublicInventory {
  return Object.fromEntries(game.players.map(({ uid }) => [uid, { obol: 6, hamlet: 3,
    [`temple-of-${definition(game.leaders[uid]).god.toLowerCase()}`]: 1 }]));
}
/** Track public acquisitions/trashes, never scan opposing private zones. */
export function updateInventory(inventory: PublicInventory, game: SetupState, start: number, acquired: Set<string>) {
  for (const move of game.movements.slice(start)) {
    if (!move.card) continue;
    const { id, cardId } = move.card, owned = inventory[move.uid];
    if ((move.kind === 'gain' || move.kind === 'topdeck') && id.startsWith('supply-') && !acquired.has(id)) {
      acquired.add(id); owned[cardId] = (owned[cardId] ?? 0) + 1;
    } else if (move.kind === 'trash') owned[cardId] = (owned[cardId] ?? 0) - 1;
  }
}
export function strategyView(game: SetupState, uid: string, inventory: PublicInventory, restriction?: Restriction, variant: PlayVariant = 'standard', unseenCount?: number): View {
  const score = (player: string) => Object.entries(inventory[player]).reduce((sum, [id, count]) => sum + (definition(id).vp ?? 0) * count, 0);
  return { ...observe(game, uid), leaderBonus: effectFeatures(restriction?.kind === 'leader-trigger' && restriction.id === game.leaders[uid] ? [] : leaderEffects(game.leaders[uid], variant)), unseenCount: unseenCount ?? game.decks[uid].deck.length + game.decks[uid].discard.length, play: structuredClone(game.decks[uid].play), events: [...game.sharedEvents],
    playerCount: game.playerCount, turn: game.turn.number, myTurns: game.turn.turns[uid] ?? 0,
    opposingTurns: game.players.filter(player => player.uid !== uid).map(player => game.turn.turns[player.uid] ?? 0),
    opponentIncome: game.players.filter(player => player.uid !== uid).map(player => { const cards = inventory[player.uid]; return 5 * Object.entries(cards).reduce((sum, [id, n]) => sum + n * (treasureValue(id) + cardFeatures(id).coins), 0) / Math.max(5, Object.values(cards).reduce((a,b) => a+b, 0)); }),
    scores: game.players.filter(player => player.uid !== uid).map(player => score(player.uid)), myScore: score(uid),
    bannedCards: restriction?.kind === 'card' ? [restriction.id] : [], bannedEvents: restriction?.kind === 'event' ? [restriction.id] : [] };
}
const money = (view: View) => (view.owned.obol ?? 0) + 2 * (view.owned.drachma ?? 0) + 3 * (view.owned.talent ?? 0);
const late = (view: View, profile: Profile) => publicHorizon(view) <= profile.parameters.scoringAt;
function disposable(view: View, profile: Profile, card: CardInstance): boolean {
  return !late(view, profile) && (card.cardId === 'hamlet' || card.cardId === 'obol' && money(view) > profile.parameters.moneyFloor);
}
const valueCache = new WeakMap<View, Map<Profile, Map<string, number>>>();
/** Heuristic utility, not an estimate of VP or victory probability. */
export function cardValue(view: View, profile: Profile, id: string): number {
  let profiles = valueCache.get(view);
  if (!profiles) { profiles = new Map(); valueCache.set(view, profiles); }
  let values = profiles.get(profile);
  if (!values) { values = new Map(); profiles.set(profile, values); }
  const existing = values.get(id);
  if (existing !== undefined) return existing;
  const value = scoreCard(view, profile, id); values.set(id, value); return value;
}
function scoreCard(view: View, profile: Profile, id: string): number {
  const card = definition(id), owned = view.owned[id] ?? 0, end = late(view, profile), size = Object.values(view.owned).reduce((a, b) => a + b, 0);
  if (view.bannedCards.includes(id)) return -1000;
  if (id === 'acropolis') return 14;
  if (id === 'polis') return end || profile.family === 'race' ? 9 : 0.4;
  if (id === 'hamlet') return end ? 2.5 : -1;
  if (id === 'obol') return money(view) < 5 ? 1 : -2;
  if (id === 'talent') return end ? 6 : 9;
  if (id === 'drachma') return Math.max(1, 6.5 - Math.max(0, money(view) - 10) * 0.35);
  if (card.uniqueStartingCard) return 1;
  const tool = thinToolValue(view, id);
  if (tool !== undefined) return tool * (profile.family === 'thin' ? 1 : 0.35) + (profile.family === 'worship' ? devotionValue(view, id) : 0);
  if (profile.family === 'engine') return engineActionValue(view, profile, id);
  const base = engineActionValue(view, profile, id), f = cardFeatures(id);
  if (profile.family === 'worship') return base * 0.8 + devotionValue(view, id) * (end ? 0.35 : 1);
  if (profile.family === 'race') return base * 0.45 + (f.coins + f.gain) * Math.min(1, publicHorizon(view) / 3);
  return base * 0.8;

}
function gains(view: View, limit: number, actionOnly = false): string[] {
  return Object.keys(view.supply).filter(id => view.supply[id] > 0 && !view.bannedCards.includes(id) && definition(id).cost !== null && definition(id).cost! <= limit && (!actionOnly || definition(id).type === 'Action'));
}
function bestGain(view: View, profile: Profile, limit: number, actionOnly = false, topdeck = false): string | undefined {
  const eligible = gains(view, limit, actionOnly), safe = eligible.filter(id => gainOutcome(view, id) !== 0);
  const value = (id: string) => { const outcome = gainOutcome(view, id); return outcome !== null && outcome > 0 ? 1000 * outcome + (definition(id).vp ?? 0) : cardValue(view, profile, id) + (topdeck ? immediateGainValue(view, id) : 0); };
  return (safe.length ? safe : eligible).sort((a, b) => value(b) - value(a) || a.localeCompare(b))[0];
}
function loss(view: View, profile: Profile, card: CardInstance): number {
  if (profile.family === 'thin') return thinKeepValue(view, card);
  if (disposable(view, profile, card)) return -2;
  const def = definition(card.cardId);
  if (def.type === 'Territory') return (def.vp ?? 0) * 2;
  if (profile.family === 'engine' && def.type === 'Action') return engineKeepValue(view, profile, card.cardId);
  const without = { ...view, owned: { ...view.owned, [card.cardId]: Math.max(0, (view.owned[card.cardId] ?? 0) - 1) } };
  return Math.max(1, cardValue(without, profile, card.cardId));
}
function offering(view: View, profile: Profile, choice: Choice): { targets: string[]; value: number } {
  if (profile.family === 'thin') return thinTrashChoice(view, choice);
  const subsets: CardInstance[][] = [[], ...view.hand.map(card => [card])];
  if (choice.max > 1) for (let i = 0; i < view.hand.length; i++) for (let j = i + 1; j < view.hand.length; j++) subsets.push([view.hand[i], view.hand[j]]);
  let best = { targets: [] as string[], value: 0 };
  for (const cards of subsets) {
    if (cards.length > choice.max || cards.length < choice.min) continue;
    if (!cards.length && choice.offering !== 'sum') continue;
    const limit = cards.reduce((sum, card) => sum + definition(card.cardId).cost!, 0) + (choice.forge ? 2 : typeof choice.offering === 'number' ? choice.offering : 0);
    const owned = { ...view.owned };
    for (const card of cards) owned[card.cardId]--;
    const after = { ...view, owned, hand: view.hand.filter(c => !cards.includes(c)), myScore: view.myScore - cards.reduce((n,c)=>n+(definition(c.cardId).vp ?? 0),0) };
    const gain = bestGain(after, profile, limit);
    if (!gain) continue;
    if (thinChangeValue(view, cards, gain) <= -100 || gainOutcome(after, gain) === 0) continue;
    let reduced = view, cost = 0;
    for (const card of cards) { cost += loss(reduced, profile, card); reduced = { ...reduced, owned: { ...reduced.owned, [card.cardId]: reduced.owned[card.cardId] - 1 } }; }
    const value = cardValue(after, profile, gain) - cost;
    if (value > best.value) best = { targets: cards.map(card => card.id), value };
  }
  return best;
}
function discardValue(view: View, profile: Profile, card: CardInstance): number {
  if (definition(card.cardId).type === 'Territory') return -100;
  if (definition(card.cardId).type === 'Treasure') {
    const coins = treasureValue(card.cardId);
    if (view.phase === 'buys' || view.resources.buys === 0 && view.resources.worship === 0) return 0;
    const best = (money: number) => Math.max(0, ...gains(view, money).filter(id => profile.family !== 'treasure' || definition(id).type !== 'Action').map(id => cardValue(view, profile, id)));
    const money = availableCoins(view);
    return coins + best(money) - best(money-coins);
  }
  if (view.phase !== 'actions' || view.resources.actions === 0) return 0;
  return Math.max(0, enginePlayPriority(view, card));
}
function resolveChoice(view: View, profile: Profile): ActionCommand {
  const choice = view.choice!;
  let targets: string[] = [];
  if (choice.kind === 'gain') {
    const id = profile.family === 'thin' ? thinGain(view, choice) : bestGain(view, profile, choice.limit!, choice.actionOnly, choice.topdeck);
    if (id && (choice.min > 0 || gainOutcome(view, id) !== 0 && (profile.family === 'thin' ? thinChangeValue(view, [], id) : cardValue(view, profile, id)) > 0)) targets = [id];
  } else if (profile.family === 'thin' && choice.kind === 'trash') targets = thinTrashChoice(view, choice).targets;
  else if (choice.offering || choice.forge) targets = offering(view, profile, choice).targets;
  else if (choice.kind === 'trash') {
    targets = thinTrashChoice(view, choice).targets;
  } else targets = [...view.hand].sort((a, b) => {
    const value = (card: CardInstance) => discardValue(view, profile, card);
    return value(a) - value(b) || a.id.localeCompare(b.id);
  }).slice(0, choice.max).map(card => card.id);
  return { type: 'choice/resolved', choiceId: choice.id, targets };
}
function worshipValue(view: View, profile: Profile, event: string): number {
  const favored = view.play.filter(card => definition(card.cardId).type === 'Action' && definition(card.cardId).god === definition(event).god).length >= 2;
  switch (event) {
    case 'counsel-of-olympus': {
      const gain = bestGain(view, profile, favored ? 5 : 3, true, true);
      return gain && gainOutcome(view, gain) !== 0 ? cardValue(view, profile, gain) + immediateGainValue(view, gain) : -1000;
    }
    case 'tribute-of-the-tides': if (view.supply.drachma > 0 && gainOutcome(view, 'drachma') === 0) return -1000; return (view.supply.drachma > 0 ? cardValue(view, profile, 'drachma') + (favored ? immediateGainValue(view, 'drachma') : 0) : 0) + (favored && view.resources.buys === 0 ? 1 : 0);
    case 'blessing-of-the-fields': return favored ? offering(view, profile, { id: '', kind: 'trash', source: event, min: 0, max: 2, offering: 'sum' }).value : thinTrashChoice(view, { id: '', kind: 'trash', source: event, min: 0, max: 2 }).value * (profile.family === 'thin' ? 1 : 2);
    case 'trial-of-the-spear': return offering(view, profile, { id: '', kind: 'trash', source: event, min: 0, max: 1, offering: favored ? 3 : 1 }).value;
    default: return -1000;
  }
}
export function strategyCommand(view: View, profile: Profile): ActionCommand {
  if (profile.family === 'treasure') {
    if (view.choice?.kind === 'discard') return resolveChoice(view, profile);
    const filtered = structuredClone(view);
    for (const id of view.bannedCards) filtered.supply[id] = 0;
    if (view.choice?.kind === 'gain') {
      const eligible = gains(view, view.choice.limit!, view.choice.actionOnly), safe = eligible.filter(id => gainOutcome(view, id) !== 0);
      if (safe.length || view.choice.min === 0) for (const id of eligible.filter(id => gainOutcome(view, id) === 0)) filtered.supply[id] = 0;
    }
    if (!view.choice && view.phase === 'actions' && view.resources.actions > 0) {
      const actions = view.hand.filter(c => definition(c.cardId).type === 'Action').sort((a,b)=>enginePlayPriority(view,b)-enginePlayPriority(view,a) || a.id.localeCompare(b.id));
      if (actions[0]) return { type: 'action/played', instanceId: actions[0].id };
    }
    if (!view.choice && (view.phase === 'buys' || view.phase === 'treasures' && !view.hand.some(c=>definition(c.cardId).type==='Treasure'))) {
      const end = late(view, profile);
      const utility = (id: string) => id === 'acropolis' ? 14 : id === 'polis' && end ? 9 : id === 'talent' ? 8 : id === 'drachma' ? 5 : id === 'hamlet' && end ? 1 : -1000;
      const plan = purchasePlan(filtered, utility);
      return plan.cards[0] ? { type: 'card/bought', cardId: plan.cards[0] } : { type: 'turn/ended' };
    }
    return chooseCommand(filtered, 'treasure');
  }
  if (view.choice) return resolveChoice(view, profile);
  const utility = (v: View) => (id: string, copies: number) => cardValue(copies ? { ...v, owned: { ...v.owned, [id]: (v.owned[id] ?? 0) + copies } } : v, profile, id);
  const plans = new Map<number, ReturnType<typeof purchasePlan>>();
  const planAt = (coins: number) => { if (!plans.has(coins)) plans.set(coins, purchasePlan(view, utility(view), coins)); return plans.get(coins)!; };
  const worshipOptions = (v: View) => v.events.filter(id => !v.bannedEvents.includes(id) && definition(id).cost! <= v.resources.coins && v.resources.worship > 0).map(id => {
    const cost = definition(id).cost!, money = availableCoins(v);
    const before = v === view ? planAt(money) : purchasePlan(v, utility(v), money);
    const after = v === view ? planAt(money-cost) : purchasePlan(v, utility(v), money-cost);
    if (before.share === 1 && after.share !== 1) return { id, value: -1000 };
    return { id, value: worshipValue(v, profile, id) - (before.utility-after.utility) - cost*0.5 };
  }).sort((a,b)=>b.value-a.value || a.id.localeCompare(b.id));
  const current = worshipOptions(view)[0];
  // Delay for a known legal path to Favored instead of spending Worship prematurely.
  const future = favoredPaths(view).map(path => ({ ...path, option: worshipOptions(path.future)[0] })).filter(path => path.option && path.option.value > Math.max(profile.parameters.worshipMargin, current?.value ?? -Infinity) + 0.1).sort((a,b)=>b.option!.value-a.option!.value);
  if (future[0]) return { type: 'action/played', instanceId: future[0].first };
  if (current && current.value > profile.parameters.worshipMargin) return { type: 'god/worshipped', cardId: current.id };
  if (view.phase === 'actions') {
    const actions = view.hand.filter(card => definition(card.cardId).type === 'Action');
    const priority = (card: CardInstance) => {
      if (profile.family === 'engine') return enginePlayPriority(view, card);
      if (profile.family === 'thin') return thinPlayPriority(view, card);
      return enginePlayPriority(view, card);
    };
    actions.sort((a, b) => priority(b) - priority(a) || a.id.localeCompare(b.id));
    if (view.resources.actions > 0 && actions[0]) return { type: 'action/played', instanceId: actions[0].id };
    return { type: 'phase/advanced' };
  }
  if (view.phase === 'treasures') {
    const treasure = view.hand.filter(card => definition(card.cardId).type === 'Treasure').sort((a, b) => definition(a.cardId).cost! - definition(b.cardId).cost! || a.id.localeCompare(b.id))[0];
    if (treasure) return { type: 'treasure/played', instanceId: treasure.id };
  }
  if (view.resources.buys > 0) {
    const plan = planAt(view.resources.coins);
    if (plan.cards[0]) return { type: 'card/bought', cardId: plan.cards[0] };
  }
  return { type: 'turn/ended' };
}
