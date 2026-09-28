import { actionEffects, definition, type ActionCommand, type Choice } from '../../src/lib/game/actions';
import type { CardInstance, SetupState } from '../../src/lib/game/setup';
import { chooseCommand, observe, type Observation } from './bot';

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
  play: CardInstance[]; events: string[]; playerCount: number; turn: number;
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
export function strategyView(game: SetupState, uid: string, inventory: PublicInventory, restriction?: Restriction): View {
  const score = (player: string) => Object.entries(inventory[player]).reduce((sum, [id, count]) => sum + (definition(id).vp ?? 0) * count, 0);
  return { ...observe(game, uid), play: structuredClone(game.decks[uid].play), events: [...game.sharedEvents],
    playerCount: game.playerCount, turn: game.turn.number, myTurns: game.turn.turns[uid] ?? 0,
    opposingTurns: game.players.filter(player => player.uid !== uid).map(player => game.turn.turns[player.uid] ?? 0),
    scores: game.players.filter(player => player.uid !== uid).map(player => score(player.uid)), myScore: score(uid),
    bannedCards: restriction?.kind === 'card' ? [restriction.id] : [], bannedEvents: restriction?.kind === 'event' ? [restriction.id] : [] };
}
const money = (view: View) => (view.owned.obol ?? 0) + 2 * (view.owned.drachma ?? 0) + 3 * (view.owned.talent ?? 0);
const late = (view: View, profile: Profile) => view.supply.acropolis <= profile.parameters.scoringAt;
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
  const multiplier = end ? 0.35 : 1;
  const cap = profile.parameters.engineCopies;
  const terminal = Object.entries(view.owned).reduce((sum, [key, count]) => sum + (definition(key).type === 'Action' && !actionEffects(key).some(effect => effect.kind === 'resource' && effect.resource === 'actions') ? count : 0), 0);
  let value = 0;
  switch (id) {
    case 'sacred-academy': value = 10 - owned * 1.3 - Math.max(0, owned - cap) * 4; break;
    case 'council-of-sages': value = (view.leader === 'thaleia' ? 9.5 : 6) - owned * 2; break;
    case 'harbor-pilot': value = terminal > owned + (view.leader === 'thaleia' ? 1 : 0) ? 9 : 4 - owned; break;
    case 'merchant-fleet': value = 8.5 - owned; break;
    case 'sea-trade': value = 7 - owned * 2; break;
    case 'seed-keeper': value = (profile.family === 'thin' || view.leader === 'melia' ? 11 : 8) - owned * 12 - (size < 9 ? 8 : 0); break;
    case 'harvest-feast': value = (view.leader === 'melia' ? 9 : 6) - owned * 2; break;
    case 'sacred-grove': value = (profile.family === 'race' ? 10 : 6) - owned * 3; break;
    case 'bronze-recruit': value = (view.leader === 'doreios' || profile.family === 'worship' ? 7 : 4) - owned * 2; break;
    case 'forge-of-heroes': value = (profile.family === 'thin' ? 10 : 5) - owned * 10; break;
    case 'victorious-procession': value = (profile.family === 'race' ? 9 : 5) - owned * 2; break;
    case 'oracles-acolyte': value = (profile.family === 'worship' && view.events.includes('counsel-of-olympus') ? 8 : 3) - owned * 3; break;
  }
  if (profile.family === 'worship' && card.god === definition(view.leader).god && owned < 2) value += 1;
  if (profile.family === 'thin' && id === 'sacred-academy') value -= 1;
  return value * multiplier;
}
function gains(view: View, limit: number, actionOnly = false): string[] {
  return Object.keys(view.supply).filter(id => view.supply[id] > 0 && !view.bannedCards.includes(id) && definition(id).cost !== null && definition(id).cost! <= limit && (!actionOnly || definition(id).type === 'Action'));
}
function bestGain(view: View, profile: Profile, limit: number, actionOnly = false): string | undefined {
  return gains(view, limit, actionOnly).sort((a, b) => cardValue(view, profile, b) - cardValue(view, profile, a) || a.localeCompare(b))[0];
}
function loss(view: View, profile: Profile, card: CardInstance): number {
  if (disposable(view, profile, card)) return -2;
  const def = definition(card.cardId);
  if (def.type === 'Territory') return (def.vp ?? 0) * 2;
  return Math.max(1, cardValue(view, profile, card.cardId));
}
function offering(view: View, profile: Profile, choice: Choice): { targets: string[]; value: number } {
  const subsets: CardInstance[][] = [[], ...view.hand.map(card => [card])];
  if (choice.max > 1) for (let i = 0; i < view.hand.length; i++) for (let j = i + 1; j < view.hand.length; j++) subsets.push([view.hand[i], view.hand[j]]);
  let best = { targets: [] as string[], value: 0 };
  for (const cards of subsets) {
    if (cards.length > choice.max || cards.length < choice.min) continue;
    if (!cards.length && choice.offering !== 'sum') continue;
    const limit = cards.reduce((sum, card) => sum + definition(card.cardId).cost!, 0) + (choice.forge ? 2 : typeof choice.offering === 'number' ? choice.offering : 0);
    const gain = bestGain(view, profile, limit);
    if (!gain) continue;
    const value = cardValue(view, profile, gain) - cards.reduce((sum, card) => sum + loss(view, profile, card), 0);
    if (value > best.value) best = { targets: cards.map(card => card.id), value };
  }
  return best;
}
function resolveChoice(view: View, profile: Profile): ActionCommand {
  const choice = view.choice!;
  let targets: string[] = [];
  if (choice.kind === 'gain') {
    const id = bestGain(view, profile, choice.limit!, choice.actionOnly);
    if (id && (choice.min > 0 || cardValue(view, profile, id) > 0)) targets = [id];
  } else if (choice.offering || choice.forge) targets = offering(view, profile, choice).targets;
  else if (choice.kind === 'trash') {
    let remainingMoney = money(view);
    targets = [...view.hand].sort((a, b) => loss(view, profile, a) - loss(view, profile, b)).filter(card => {
      if (!disposable(view, profile, card)) return false;
      if (card.cardId === 'obol') { if (remainingMoney <= profile.parameters.moneyFloor) return false; remainingMoney--; }
      return true;
    }).slice(0, choice.max).map(card => card.id);
  } else targets = [...view.hand].sort((a, b) => {
    const value = (card: CardInstance) => definition(card.cardId).type === 'Territory' ? -10 : loss(view, profile, card);
    return value(a) - value(b) || a.id.localeCompare(b.id);
  }).slice(0, choice.max).map(card => card.id);
  return { type: 'choice/resolved', choiceId: choice.id, targets };
}
function worshipValue(view: View, profile: Profile, event: string): number {
  const favored = view.play.filter(card => definition(card.cardId).type === 'Action' && definition(card.cardId).god === definition(event).god).length >= 2;
  switch (event) {
    case 'counsel-of-olympus': {
      const gain = bestGain(view, profile, favored ? 5 : 3, true);
      return gain ? cardValue(view, profile, gain) + (view.phase === 'actions' ? 1 : 0) : -1000;
    }
    case 'tribute-of-the-tides': return (view.supply.drachma > 0 ? cardValue(view, profile, 'drachma') : 0) + (favored && view.resources.buys === 0 ? 1 : 0);
    case 'blessing-of-the-fields': return favored ? offering(view, profile, { id: '', kind: 'trash', source: event, min: 0, max: 2, offering: 'sum' }).value : Math.min(2, view.hand.filter(card => disposable(view, profile, card)).length) * 2;
    case 'trial-of-the-spear': return offering(view, profile, { id: '', kind: 'trash', source: event, min: 0, max: 1, offering: favored ? 3 : 1 }).value;
    default: return -1000;
  }
}
export function strategyCommand(view: View, profile: Profile): ActionCommand {
  if (profile.family === 'treasure') {
    const filtered = structuredClone(view);
    for (const id of view.bannedCards) filtered.supply[id] = 0;
    return chooseCommand(filtered, 'treasure');
  }
  if (view.choice) return resolveChoice(view, profile);
  const purchase = (coins: number) => {
    const id = bestGain(view, profile, coins);
    return id ? Math.max(0, cardValue(view, profile, id)) : 0;
  };
  // Compare Worship with the purchase opportunity it displaces. Can run before
  // drawing, between individual Treasures (preserving offerings), or after buying.
  if (view.resources.worship > 0) {
    const options = view.events.filter(id => !view.bannedEvents.includes(id) && definition(id).cost! <= view.resources.coins).map(id => {
      const cost = definition(id).cost!;
      const displaced = view.resources.buys > 0 ? purchase(view.resources.coins) - purchase(view.resources.coins - cost) : 0;
      return { id, value: worshipValue(view, profile, id) - displaced - cost * 0.5 };
    }).sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
    if (options[0]?.value > profile.parameters.worshipMargin) return { type: 'god/worshipped', cardId: options[0].id };
  }
  if (view.phase === 'actions') {
    const actions = view.hand.filter(card => definition(card.cardId).type === 'Action');
    const priority = (card: CardInstance) => {
      if (card.cardId === 'council-of-sages' && view.leader === 'thaleia' && !view.leaderUsed) return 100;
      return actionEffects(card.cardId).reduce((value, effect) => value + (effect.kind === 'resource' && effect.resource === 'actions' ? 20 * effect.amount : effect.kind === 'draw' ? effect.amount : 0), 0);
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
    const available = gains(view, view.resources.coins);
    // Public inventory supports intentional pile endings without opposing-hand access.
    const winner = available.find(id => (id === 'acropolis' && view.supply[id] === 1 || view.supply[id] === 1 && Object.values(view.supply).filter(count => count === 0).length >= 2) &&
      view.myScore + (definition(id).vp ?? 0) > Math.max(...view.scores));
    const best = winner ?? bestGain(view, profile, view.resources.coins);
    if (best && cardValue(view, profile, best) > 0) return { type: 'card/bought', cardId: best };
  }
  return { type: 'turn/ended' };
}
