import { publicHorizon, gainOutcome, endingShare, immediateGainValue } from './planning';
import { actionEffects, definition, type Choice } from '../../src/lib/game/actions';
import type { CardInstance } from '../../src/lib/game/setup';
import { cardFeatures, engineCapacity, revealCoins } from './engine';
import type { View } from './strategy';

type Inventory = Record<string, number>;
const treasureCoins = (id: string) => id === 'obol' ? 1 : id === 'drachma' ? 2 : id === 'talent' ? 3 : 0;
const effectCache = new Map<string, ReturnType<typeof actionEffects>>();
const effects = (id: string) => { if (!effectCache.has(id)) effectCache.set(id, definition(id).type === 'Action' ? actionEffects(id) : []); return effectCache.get(id)!; };
const plainTrash = (id: string) => effects(id).reduce((n, e) => n + (e.kind === 'trash' && !e.forge && !e.offering ? e.amount : 0), 0);
const forge = (id: string) => effects(id).some(e => e.kind === 'trash' && e.forge);
const size = (owned: Inventory) => Object.values(owned).reduce((a, b) => a + b, 0);
function changed(owned: Inventory, remove: string[], gain?: string): Inventory {
  const next = { ...owned };
  for (const id of remove) next[id]--;
  if (gain) next[gain] = (next[gain] ?? 0) + 1;
  return next;
}
/** A public pile-pressure horizon, not an estimate learned from evaluation results. */
export const thinHorizon = publicHorizon;
/** Smooth income plus premiums for reaching useful purchase thresholds. */
function spending(coins: number): number {
  const at = (n: number) => Math.max(0, Math.min(1, coins - n + 1));
  return coins * 0.25 + at(3) * 0.5 + at(4) * 0.5 + at(5) * 0.75 + at(6) * 0.75 + at(8) * 1.5;
}
export type ThinEconomy = { value: number; incomeChance: number; seen: number; vp: number };
const economyCache = new Map<string, ThinEconomy>();
const baseEconomy = new WeakMap<View, ThinEconomy>();
/** Exact Treasure distribution for a uniformly sampled hand size; Action reach and payload are approximations. */
export function thinEconomy(view: View, owned: Inventory = view.owned): ThinEconomy {
  if (owned === view.owned && baseEconomy.has(view)) return baseEconomy.get(view)!;
  const entries = Object.entries(owned).filter(([, n]) => n > 0).sort(([a], [b]) => a.localeCompare(b));
  const key = JSON.stringify([view.variant, view.leader, view.leaderBonus, entries]);
  const cached = economyCache.get(key); if (cached) { if (owned === view.owned) baseEconomy.set(view, cached); return cached; }
  const count = size(owned);
  if (!count) return { value: 0, incomeChance: 0, seen: 0, vp: 0 };
  const capacity = engineCapacity({ ...view, owned, resources: { ...view.resources, actions: 0 }, unseenCount: 0, phase: 'actions' });
  const seen = Math.min(count, 5 * count / Math.max(1, count - capacity.playableDraw));
  const reach = seen / count;
  let actionCoins = 0, matching = 0, worship = 0, vp = 0;
  const terminalShare = Math.min(1, capacity.actionBudget / Math.max(1, capacity.terminalDemand));
  const coinCards: number[] = [];
  for (const [id, n] of entries) {
    const f = cardFeatures(id, view.variant), def = definition(id);
    vp += (def.vp ?? 0) * n;
    actionCoins += (f.coins + revealCoins({ owned }, f.reveal)) * n * reach * (f.actions ? 1 : terminalShare);
    if (def.type === 'Action' && def.god === definition(view.leader).god) matching += n;
    worship += (view.variant === 'base-game' ? [] : effects(id)).reduce((sum, e) => sum + (e.kind === 'resource' && e.resource === 'worship' ? e.amount : 0), 0) * n;
    for (let i = 0; i < n; i++) coinCards.push(treasureCoins(id));
  }
  actionCoins += view.leaderBonus.coins * Math.min(1, matching * reach);
  const hand = Math.ceil(seen), maxCoins = coinCards.reduce((a, b) => a + b, 0);
  // Counts of equally likely subsets by (cards drawn, Treasure coins).
  const dp = Array.from({ length: hand + 1 }, () => new Float64Array(maxCoins + 1)); dp[0][0] = 1;
  let processed = 0;
  for (const coins of coinCards) {
    for (let k = Math.min(hand, ++processed); k > 0; k--) for (let c = maxCoins; c >= coins; c--) dp[k][c] += dp[k - 1][c - coins];
  }
  let value = 0, incomeChance = 0;
  for (const k of new Set([Math.floor(seen), Math.ceil(seen)])) {
    const weight = Number.isInteger(seen) ? 1 : k === Math.floor(seen) ? Math.ceil(seen) - seen : seen - Math.floor(seen);
    const total = dp[k].reduce((a, b) => a + b, 0);
    for (let c = 0; c <= maxCoins; c++) {
      const probability = weight * dp[k][c] / total;
      value += probability * spending(c + actionCoins);
      incomeChance += probability * Math.max(0, Math.min(1, c + actionCoins - 2));
    }
  }
  // Preserve access to Worship without valuing unlimited redundant capacity.
  value += 0.25 * Math.min(1, worship * reach);
  const result = { value, incomeChance, seen, vp };
  if (economyCache.size > 20_000) economyCache.clear();
  economyCache.set(key, result); if (owned === view.owned) baseEconomy.set(view, result); return result;
}
function rawChange(view: View, remove: string[], gain?: string): number {
  const before = thinEconomy(view), after = thinEconomy(view, changed(view.owned, remove, gain));
  // Protect access to $3 while improving density; a VP-winning conversion is an exception.
  const outcome = gain ? gainOutcome(view, gain, before.vp - thinEconomy(view, changed(view.owned, remove)).vp) : endingShare(view, after.vp - before.vp);
  if (outcome === 0) return -1000;
  const wins = outcome !== null && outcome > 0;
  if (remove.length && !wins && thinHorizon(view) > 1 && after.incomeChance + 0.05 < Math.min(0.8, before.incomeChance)) return -100;
  return thinHorizon(view) * (after.value - before.value) + after.vp - before.vp;
}
const workCache = new WeakMap<View, number[]>();
function removalWork(view: View): number[] {
  const cached = workCache.get(view); if (cached) return cached;
  const work: number[] = [];
  let current = view;
  while (size(current.owned) > 1) {
    const options = Object.entries(current.owned).filter(([id, n]) => n > 0 && !plainTrash(id) && !forge(id))
      .map(([id]) => ({ id, value: rawChange(current, [id]) })).sort((a,b) => b.value-a.value || a.id.localeCompare(b.id));
    if (!options[0] || options[0].value <= 0.1) break;
    work.push(options[0].value);
    current = { ...current, owned: changed(current.owned, [options[0].id]), myScore: current.myScore - (definition(options[0].id).vp ?? 0) };
  }
  workCache.set(view, work); return work;
}
function trashCapacity(view: View, owned = view.owned): number {
  const matching = Object.entries(owned).some(([id, n]) => n > 0 && definition(id).type === 'Action' && definition(id).god === definition(view.leader).god);
  return Object.entries(owned).reduce((sum, [id, n]) => sum + plainTrash(id) * n, 0) + (matching ? view.leaderBonus.trash : 0);
}
/** Actual remaining removal opportunities, discounted by existing tools and time to draw them. */
const toolCache = new Map<string, number | undefined>();
export function thinToolValue(view: View, id: string): number | undefined {
  if (!plainTrash(id) && !forge(id)) return undefined;
  const endingRisk = view.supply.acropolis <= 1 || Object.values(view.supply).filter(n => n === 0).length >= 2;
  const inventory = Object.entries(view.owned).filter(([,n])=>n>0).sort(([a],[b])=>a.localeCompare(b));
  const key = JSON.stringify([id, inventory, view.supply, view.bannedCards, view.leader, view.leaderBonus, view.playerCount, view.opponentIncome,
    endingRisk ? [view.myScore, view.scores, view.myTurns, view.opposingTurns, view.resources, view.hand.map(c => c.cardId), view.phase] : null]);
  if (toolCache.has(key)) return toolCache.get(key);
  const value = computeToolValue(view, id);
  if (toolCache.size > 20_000) toolCache.clear();
  toolCache.set(key, value); return value;
}
function computeToolValue(view: View, id: string): number | undefined {
  if (!plainTrash(id) && !forge(id)) return undefined;
  const horizon = thinHorizon(view), economy = thinEconomy(view);
  const cycles = Math.max(0, horizon - 1) * economy.seen / Math.max(1, size(view.owned) + 1);
  if (plainTrash(id)) {
    const work = removalWork(view), already = Math.floor(trashCapacity(view) * cycles);
    const remaining = work.slice(already, already + Math.ceil(plainTrash(id) * cycles));
    return 4 * remaining.reduce((a, b) => a + b, 0) * Math.min(1, cycles) + 3 * rawChange(view, [], id);
  }
  let best = 0;
  for (const [target, n] of Object.entries(view.owned)) if (n > 0) {
    for (const gain of legalGains(view, definition(target).cost! + 2)) best = Math.max(best, rawChange(view, [target], gain));
  }
  const existing = Object.entries(view.owned).reduce((sum, [card, n]) => sum + (forge(card) ? n : 0), 0);
  return 4 * best * Math.min(1, cycles) / (1 + existing * 2) + 3 * rawChange(view, [], id);
}
export function thinChangeValue(view: View, remove: CardInstance[], gain?: string): number {
  let value = rawChange(view, remove.map(c => c.cardId), gain);
  // Losing the last useful tool has an opportunity cost; redundant/finished tools can be removed.
  const after = changed(view.owned, remove.map(c => c.cardId), gain);
  if (trashCapacity(view) > 0 && trashCapacity(view, after) === 0) {
    const remainingWork = removalWork({ ...view, owned: after });
    if (thinHorizon(view) >= 2 && remainingWork.length) return -100;
  }
  if (remove.some(c => forge(c.cardId)) && !Object.entries(after).some(([id, n]) => n > 0 && forge(id))) {
    value -= Math.max(0, (thinToolValue(view, remove.find(c => forge(c.cardId))!.cardId) ?? 0) / 4);
  }
  // Unplayed Treasures are a real cost this turn, even when future density improves.
  const handMoney = view.resources.coins + view.hand.reduce((sum, c) => sum + treasureCoins(c.cardId), 0);
  const removedMoney = remove.reduce((sum, c) => sum + treasureCoins(c.cardId), 0);
  value -= spending(handMoney) - spending(handMoney - removedMoney);
  return value;
}
function legalGains(view: View, limit: number, actionOnly = false): string[] {
  return Object.keys(view.supply).filter(id => view.supply[id] > 0 && !view.bannedCards.includes(id) && definition(id).cost !== null && definition(id).cost! <= limit && (!actionOnly || definition(id).type === 'Action')).sort();
}
export function thinGain(view: View, choice: Choice): string | undefined {
  const value = (id: string) => rawChange(view, [], id) + (choice.topdeck ? immediateGainValue(view, id) : 0);
  return legalGains(view, choice.limit!, choice.actionOnly).sort((a, b) => value(b) - value(a) || a.localeCompare(b))[0];
}
/** Enumerate legal subsets: current rules offer at most two cards. Evaluate each subset jointly. */
export function thinTrashChoice(view: View, choice: Choice): { targets: string[]; value: number } {
  const hand = [...view.hand].sort((a, b) => a.id.localeCompare(b.id));
  const subsets: CardInstance[][] = [[]];
  function visit(start: number, selected: CardInstance[]) {
    if (selected.length >= choice.max) return;
    for (let i = start; i < hand.length; i++) { const next = [...selected, hand[i]]; subsets.push(next); visit(i + 1, next); }
  }
  visit(0, []);
  let best = { targets: [] as string[], value: choice.min ? -Infinity : 0 };
  for (const remove of subsets) {
    if (remove.length < choice.min) continue;
    let value = thinChangeValue(view, remove);
    if (choice.forge || choice.offering) {
      if (!remove.length && choice.offering !== 'sum') continue;
      const limit = remove.reduce((sum, c) => sum + definition(c.cardId).cost!, 0) + (choice.forge ? 2 : typeof choice.offering === 'number' ? choice.offering : 0);
      const gains = legalGains(view, limit);
      const values = gains.map(gain => thinChangeValue(view, remove, gain));
      // Sum offerings may decline their gain; Forge and numeric offerings must gain if eligible.
      value = choice.offering === 'sum' ? Math.max(value, ...values) : gains.length ? Math.max(...values) : value;
    }
    if (value > best.value + 0.1) best = { targets: remove.map(c => c.id), value };
  }
  return best;
}
export function thinKeepValue(view: View, card: CardInstance): number {
  return -thinChangeValue(view, [card]);
}

export function thinPlayPriority(view: View, card: CardInstance): number {
  const f = cardFeatures(card.cardId, view.variant), triggers = !view.leaderUsed && definition(card.cardId).god === definition(view.leader).god;
  const bonus = triggers ? view.leaderBonus : { actions: 0, draw: 0, coins: 0, buys: 0, trash: 0 };
  const actions = f.actions + bonus.actions;
  const afterPlay = { ...view, leaderUsed: view.leaderUsed || triggers, hand: view.hand.filter(c => c.id !== card.id),
    resources: { ...view.resources, actions: view.resources.actions - 1 + actions, coins: view.resources.coins + f.coins + bonus.coins, buys: view.resources.buys + f.buys + bonus.buys } };
  const capacity = plainTrash(card.cardId) + bonus.trash;
  const ordinaryWork = capacity ? thinTrashChoice(afterPlay, { id: '', source: card.cardId, kind: 'trash', min: 0, max: capacity }).value : 0;
  const upgradeWork = forge(card.cardId) ? thinTrashChoice(afterPlay, { id: '', source: card.cardId, kind: 'trash', min: 0, max: 1, forge: true }).value : 0;
  // Consecutive optional effects cannot both claim the same offering; use the larger opportunity.
  const work = Math.max(0, ordinaryWork, upgradeWork);
  return 20 * actions + f.draw + bonus.draw + 2 * (f.coins + bonus.coins + (view.unseenCount > 0 ? revealCoins(view, f.reveal) : 0)) + 4 * work;
}
