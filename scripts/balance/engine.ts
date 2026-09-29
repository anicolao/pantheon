import {investmentFactor} from './end-game';
import { publicHorizon } from './planning';
import { actionEffects, definition, type Effect, type PlayVariant } from '../../src/lib/game/actions';
import type { CardInstance } from '../../src/lib/game/setup';
import type { Profile, View } from './strategy';
export type Features = { draw: number; discard: number; reveal: number; actions: number; coins: number; buys: number; trash: number; gain: number };
export function effectFeatures(effects: Effect[]): Features {
  const result: Features = { draw: 0, discard: 0, reveal: 0, actions: 0, coins: 0, buys: 0, trash: 0, gain: 0 };
  for (const effect of effects) {
    if (effect.kind === 'draw') result.draw += effect.amount;
    if (effect.kind === 'reveal') result.reveal++;
    if (effect.kind === 'discard') result.discard += effect.amount;
    if (effect.kind === 'resource' && ['actions', 'coins', 'buys'].includes(effect.resource)) result[effect.resource as 'actions' | 'coins' | 'buys'] += effect.amount;
    if (effect.kind === 'trash') result.trash += effect.amount;
    if (effect.kind === 'gain') result.gain += Math.min(2, effect.limit / 3);
  }
  return result;
}
const featureCache = new Map<string, Features>();
export function cardFeatures(id: string, variant: PlayVariant = 'standard'): Features {
  const key = `${variant}/${id}`;
  let features = featureCache.get(key);
  if (!features) { features = effectFeatures(definition(id).type === 'Action' ? actionEffects(id, variant) : []); featureCache.set(key, features); }
  return features;
}
export type EngineCapacity = { size: number; actionBudget: number; terminalDemand: number; playableDraw: number; strandedDraw: number; drawDeficit: number };
/** Optimistic whole-deck capacity, not a look at actual shuffle order. A small reliability margin grows after observed spare-Action draw shortfalls. */
export function engineCapacity(view: Pick<View, 'owned' | 'leader' | 'leaderBonus' | 'unseenCount' | 'resources' | 'phase' | 'variant'>, extra?: string): EngineCapacity {
  const owned = { ...view.owned }; if (extra) owned[extra] = (owned[extra] ?? 0) + 1;
  let size = 0, nonterminalDraw = 0, actionBudget = 1, terminalDemand = 0;
  const terminals: { draw: number; count: number }[] = [];
  let matching = false;
  for (const [id, count] of Object.entries(owned)) {
    if (count <= 0) continue;
    size += count;
    if (definition(id).type !== 'Action') continue;
    const f = cardFeatures(id, view.variant);
    if (Object.values(f).every(n=>n===0)) continue;
    const netDraw = Math.max(0, f.draw - f.discard);
    if (definition(id).god === definition(view.leader).god) matching = true;
    if (f.actions >= 1) { actionBudget += (f.actions - 1) * count; nonterminalDraw += netDraw * count; }
    else { terminalDemand += count; terminals.push({ draw: netDraw, count }); }
  }
  if (matching) actionBudget += view.leaderBonus.actions;
  let remaining = actionBudget, terminalDraw = 0, strandedDraw = 0;
  for (const terminal of terminals.sort((a, b) => b.draw - a.draw)) {
    const playable = Math.min(remaining, terminal.count);
    terminalDraw += playable * terminal.draw; strandedDraw += (terminal.count - playable) * terminal.draw; remaining -= playable;
  }
  const playableDraw = nonterminalDraw + terminalDraw + (matching ? view.leaderBonus.draw : 0);
  const missedWithActions = view.phase !== 'actions' && view.resources.actions > 0 ? Math.min(3, view.unseenCount / 2) : 0;
  return { size, actionBudget, terminalDemand, playableDraw, strandedDraw, drawDeficit: Math.max(0, size + 2 + missedWithActions - 5 - playableDraw) };
}
const capacityCache = new WeakMap<View, EngineCapacity>();
/** Value marginal draw coverage and the payload of the card, never a named opening or a copy cap. */
export function engineActionValue(view: View, profile: Profile, id: string): number {
  let before = capacityCache.get(view);
  if (!before) { before = engineCapacity(view); capacityCache.set(view, before); }
  const after = engineCapacity(view, id), f = cardFeatures(id, view.variant);
  const spareWithUnseen = view.resources.actions > 0 && view.unseenCount > 0;
  const pressure = spareWithUnseen ? 1.25 : 1;
  const coverage = (before.drawDeficit - after.drawDeficit) * 6 * pressure;
  const unblocking = (before.strandedDraw - after.strandedDraw) * 2;
  const junk = (view.owned.hamlet ?? 0) + Math.max(0, (view.owned.obol ?? 0) - 3);
  const existingTrash = Object.entries(view.owned).reduce((sum, [card, count]) => sum + cardFeatures(card, view.variant).trash * count, 0);
  const thinning = profile.thinning !== undefined ? 0 : Math.min(f.trash, Math.max(0, junk - existingTrash * 3)) * 6;
  const terminalUse = f.actions >= 1 ? 1 : Math.min(1, after.actionBudget / Math.max(1, after.terminalDemand));
  const payload = terminalUse * ((f.coins + revealCoins(view, f.reveal)) * 2 + f.gain + thinning) + Math.min(f.discard, junk) * 0.5 + (before.playableDraw + 5 >= before.size ? f.buys : 0);
  const reliability = 8 * (startReliability(view, { ...view.owned, [id]: (view.owned[id] ?? 0) + 1 }) - startReliability(view, view.owned));
  return (2 + coverage + unblocking + payload + reliability) * investmentFactor(view,profile);
}
/** Play draw while Actions suffice; avoid ending the chain when another Action can keep it alive. */
export function enginePlayPriority(view: View, card: CardInstance): number {
  const printed = cardFeatures(card.cardId, view.variant);
  const trigger = !view.leaderUsed && definition(card.cardId).god === definition(view.leader).god ? view.leaderBonus : { actions: 0, draw: 0, coins: 0, trash: 0 };
  const actions = printed.actions + trigger.actions, draw = printed.draw + trigger.draw;
  const stranded = view.resources.actions - 1 + actions <= 0 && view.hand.some(other => other.id !== card.id && (cardFeatures(other.cardId, view.variant).actions + (!view.leaderUsed && definition(other.cardId).god === definition(view.leader).god ? view.leaderBonus.actions : 0)) > 0);
  return 4 * Math.min(draw, view.unseenCount) + 2 * actions + printed.coins + trigger.coins + (view.unseenCount > 0 ? revealCoins(view, printed.reveal) : 0) + (printed.trash + trigger.trash) * 0.5 - (stranded ? 20 : 0);
}

const keepCache = new WeakMap<View, Map<string, number>>();
/** Retaining an owned card is its marginal contribution, not the value of buying another copy. */
export function engineKeepValue(view: View, profile: Profile, id: string): number {
  let cached = keepCache.get(view); if (!cached) { cached = new Map(); keepCache.set(view, cached); }
  const key = `${profile.endGamePolicy??'historical'}/${profile.parameters.scoringAt}/${profile.thinning ?? 'legacy'}/${id}`;
  if (!cached.has(key)) {
    const without = { ...view, owned: { ...view.owned, [id]: Math.max(0, (view.owned[id] ?? 0) - 1) } };
    cached.set(key, Math.max(1, engineActionValue(without, profile, id)));
  }
  return cached.get(key)!;
}

/** Probability of opening a draw card that can preserve Actions; no hidden order is sampled. */
export function startReliability(view: View, owned: Record<string, number>): number {
  let total = 0, starters = 0;
  for (const [id, n] of Object.entries(owned)) {
    total += n;
    const f = cardFeatures(id, view.variant), bonus = definition(id).god === definition(view.leader).god ? view.leaderBonus : { actions: 0, draw: 0 };
    if (f.draw + bonus.draw > 0 && f.actions + bonus.actions > 0) starters += n;
  }
  let miss = 1;
  for (let i = 0; i < Math.min(5, total); i++) miss *= Math.max(0, total - starters - i) / (total - i);
  return 1 - miss;
}

/** Expected conditional reveal income from public inventory; never read the next card. */
export function revealCoins(view: Pick<View, 'owned'>, reveals: number): number {
  const entries = Object.entries(view.owned), count = entries.reduce((sum,[,n])=>sum+n,0);
  return count ? 2 * reveals * entries.reduce((sum,[id,n])=>sum+(definition(id).type==='Territory'?n:0),0) / count : 0;
}
