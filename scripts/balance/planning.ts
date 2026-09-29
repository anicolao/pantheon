import { definition, actionEffects } from '../../src/lib/game/actions';
import type { View } from './strategy';
export const treasureValue = (id: string) => id === 'obol' ? 1 : id === 'drachma' ? 2 : id === 'talent' ? 3 : 0;
export const availableCoins = (view: View) => view.resources.coins + (view.phase === 'buys' ? 0 : view.hand.reduce((n, c) => n + treasureValue(c.cardId), 0));
export function isEnding(supply: Record<string, number>): boolean {
  return supply.acropolis === 0 || Object.values(supply).filter(n => n === 0).length >= 3;
}
/** Outcome at this turn's cleanup, including the production fewer-turn tiebreak. */
export function endingShare(view: View, vp = 0, supply = view.supply): number | null {
  if (!isEnding(supply)) return null;
  const score = view.myScore + vp, turns = view.myTurns + 1;
  if (view.scores.some((s, i) => s > score || s === score && view.opposingTurns[i] < turns)) return 0;
  return 1 / (1 + view.scores.filter((s, i) => s === score && view.opposingTurns[i] === turns).length);
}
export type PurchasePlan = { cards: string[]; utility: number; vp: number; share: number | null };
/** Bounded knapsack over all buys; retain utility- and VP-optimal alternatives for each ending mask. */
export function purchasePlan(view: View, utility: (id: string, copies: number) => number, coins = view.resources.coins, buys = view.resources.buys): PurchasePlan {
  const ids = Object.keys(view.supply).filter(id => view.supply[id] > 0 && !view.bannedCards.includes(id) && definition(id).cost !== null && definition(id).cost! <= coins).sort();
  const candidates = ids.map(id => ({ id, cost: definition(id).cost!, values: Array.from({ length: Math.min(buys, view.supply[id]) }, (_, n) => utility(id, n)), vp: definition(id).vp ?? 0 }));
  type Node = { cards: string[]; utility: number; vp: number; coins: number; buys: number; mask: number };
  let states = new Map<string, Node[]>([['0/0/0', [{ cards: [], utility: 0, vp: 0, coins: 0, buys: 0, mask: 0 }]]]);
  const keep = (map: Map<string, Node[]>, node: Node) => {
    const key = `${node.coins}/${node.buys}/${node.mask}`, old = map.get(key) ?? [];
    if (old.some(n => n.utility >= node.utility && n.vp >= node.vp)) return;
    map.set(key, [...old.filter(n => !(node.utility >= n.utility && node.vp >= n.vp)), node]);
  };
  for (const [index, item] of candidates.entries()) {
    const next = new Map<string, Node[]>();
    for (const bucket of states.values()) for (const state of bucket) {
      const max = Math.min(buys - state.buys, view.supply[item.id], item.cost ? Math.floor((coins - state.coins) / item.cost) : buys - state.buys);
      for (let n = 0; n <= max; n++) {
        if (n && item.values[n-1] <= 0 && n !== view.supply[item.id]) continue;
        keep(next, { cards: [...state.cards, ...Array<string>(n).fill(item.id)], utility: state.utility + item.values.slice(0,n).reduce((a,b)=>a+b,0), vp: state.vp + n * item.vp,
          coins: state.coins + n * item.cost, buys: state.buys + n, mask: state.mask | (n === view.supply[item.id] ? 1 << index : 0) });
      }
    }
    states = next;
  }
  let best: PurchasePlan = { cards: [], utility: 0, vp: 0, share: endingShare(view) };
  for (const bucket of states.values()) for (const node of bucket) {
    const supply = { ...view.supply };
    for (const id of node.cards) supply[id]--;
    const share = endingShare(view, node.vp, supply);
    if (share === 0 && best.share !== 0) continue;
    const rank = share !== null && share > 0 ? 1000 * share + node.vp : node.utility;
    const bestRank = best.share !== null && best.share > 0 ? 1000 * best.share + best.vp : best.share === 0 ? -Infinity : best.utility;
    if (rank > bestRank + 1e-9) best = { cards: node.cards, utility: node.utility, vp: node.vp, share };
  }
  // Points first: subsequent replanning still sees a winning continuation.
  best.cards.sort((a, b) => (definition(b).vp ?? 0) - (definition(a).vp ?? 0) || definition(b).cost! - definition(a).cost! || a.localeCompare(b));
  return best;
}
export function gainOutcome(view: View, id: string, vpLoss = 0): number | null {
  const supply = { ...view.supply, [id]: view.supply[id] - 1 };
  const vp = (definition(id).vp ?? 0) - vpLoss;
  const result = endingShare(view, vp, supply);
  if (result !== 0 || view.resources.buys === 0) return result;
  const future = { ...view, supply, myScore: view.myScore + vp };
  return purchasePlan(future, card => (definition(card).vp ?? 0) * 2, availableCoins(view)).share;
}
export function publicHorizon(view: View): number {
  const smallest = Object.values(view.supply).sort((a,b) => a-b).slice(0,3).reduce((a,b) => a+b, 0);
  const pressure = 1 + (view.opponentIncome ?? []).reduce((n, x) => n + x / 8, 0);
  return Math.max(0, Math.min(6, view.raceHorizon ?? 6, view.supply.acropolis * 1.5 / view.playerCount, smallest * 1.5 / view.playerCount, view.supply.acropolis / pressure));
}

/** A topdeck gain can contribute this turn only if a known legal draw remains. */
export function immediateGainValue(view: View, id: string): number {
  if (view.phase !== 'actions' || view.resources.actions < 1) return 0;
  const drawers = view.hand.filter(c => definition(c.cardId).type === 'Action' && actionEffects(c.cardId).some(e=>e.kind==='draw'&&e.amount>0));
  if (!drawers.length) return 0;
  if (definition(id).type === 'Treasure') return treasureValue(id);
  if (definition(id).type !== 'Action') return 0;
  const canContinue = drawers.some(c => view.resources.actions - 1 + actionEffects(c.cardId).reduce((n,e)=>n+(e.kind==='resource'&&e.resource==='actions'?e.amount:0),0) + (!view.leaderUsed&&definition(c.cardId).god===definition(view.leader).god?view.leaderBonus.actions:0)>0);
  if (!canContinue) return 0;
  return actionEffects(id).reduce((n,e)=>n+(e.kind==='draw'?e.amount*0.5:e.kind==='resource'&&e.resource==='coins'?e.amount:0),0);
}
