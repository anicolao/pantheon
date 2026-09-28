import { definition, actionEffects, worshipEffects } from '../../src/lib/game/actions';
import { cardFeatures, effectFeatures, engineCapacity } from './engine';
import type { View } from './strategy';
/** Explicitly model reaching two matching played Actions, rather than two copies of each card. */
function favoredChance(view: View, god: string, extra?: string): number {
  const owned = { ...view.owned }; if (extra) owned[extra] = (owned[extra] ?? 0) + 1;
  let n = 0, matching = 0, terminalMatching = 0;
  for (const [id, count] of Object.entries(owned)) {
    n += count;
    if (definition(id).type === 'Action' && definition(id).god === god) { matching += count; if (cardFeatures(id).actions === 0) terminalMatching += count; }
  }
  if (matching < 2 || n < 2) return 0;
  const capacity = engineCapacity({ ...view, owned });
  const drawn = Math.min(n, Math.ceil(5 * n / Math.max(1, n - capacity.playableDraw)));
  const choose = (a: number, b: number) => { if (a < b) return 0; let v = 1; for (let i=1;i<=b;i++) v *= (a-i+1)/i; return v; };
  const chance = 1 - (choose(n-matching, drawn) + matching * choose(n-matching, drawn-1)) / choose(n, drawn);
  return chance * Math.min(1, capacity.actionBudget / Math.max(1, terminalMatching));
}
function eventPower(id: string, favored: boolean): number {
  return worshipEffects(id, favored).reduce((sum, e) => sum + (e.kind === 'gain' ? e.cardId ? 2 : e.limit : e.kind === 'trash' ? e.amount + (e.offering === 'sum' ? 2 : typeof e.offering === 'number' ? e.offering : 0) : e.kind === 'resource' ? e.amount : e.kind === 'draw' ? e.amount : 0), 0);
}
export function devotionValue(view: View, id: string): number {
  if (definition(id).type !== 'Action') return 0;
  return view.events.filter(event => !view.bannedEvents.includes(event)).reduce((sum, event) => {
    const god = definition(event).god;
    return sum + 6 * Math.max(0, favoredChance(view, god, id) - favoredChance(view, god)) * Math.max(0, eventPower(event, true) - eventPower(event, false));
  }, 0);
}
/** Search known in-hand Actions (up to four plays) to establish Favored; never invent unseen draws. */
export function favoredPaths(view: View): { first: string; future: View }[] {
  if (view.phase !== 'actions' || view.resources.actions < 1) return [];
  const results: { first: string; future: View }[] = [];
  for (const event of view.events.filter(event => !view.bannedEvents.includes(event))) {
    const god = definition(event).god;
    const count = (v: View) => v.play.filter(c => definition(c.cardId).type === 'Action' && definition(c.cardId).god === god).length;
    if (count(view) >= 2) continue;
    const seen = new Set<string>();
    function visit(v: View, first: string, depth: number): void {
      if (count(v) >= 2) { results.push({ first, future: v }); return; }
      if (depth >= 4 || v.resources.actions < 1) return;
      const key = `${v.resources.actions}/${v.leaderUsed}/${v.hand.map(c=>c.id).join(',')}`;
      if (seen.has(key)) return; seen.add(key);
      for (const card of v.hand.filter(c => definition(c.cardId).type === 'Action')) {
        const f = cardFeatures(card.cardId), matching = definition(card.cardId).god === god;
        const trigger = !v.leaderUsed && definition(card.cardId).god === definition(v.leader).god;
        if (!matching && f.actions + (trigger ? v.leaderBonus.actions : 0) <= 1) continue;
        // Trashing/gaining choices could change required hand cards; do not forecast through them.
        if (actionEffects(card.cardId).some(e => e.kind === 'trash' || e.kind === 'discard' || e.kind === 'gain')) continue;
        const bonus = trigger ? v.leaderBonus : effectFeatures([]);
        const worship = actionEffects(card.cardId).reduce((s,e)=>s+(e.kind === 'resource' && e.resource === 'worship' ? e.amount : 0),0);
        visit({ ...v, hand: v.hand.filter(c=>c.id!==card.id), play: [...v.play, card], leaderUsed: v.leaderUsed || trigger,
          resources: { ...v.resources, actions: v.resources.actions - 1 + f.actions + bonus.actions, coins: v.resources.coins + f.coins + bonus.coins,
            buys: v.resources.buys + f.buys + bonus.buys, worship: v.resources.worship + worship } }, first || card.id, depth+1);
      }
    }
    visit(view, '', 0);
  }
  return results;
}
